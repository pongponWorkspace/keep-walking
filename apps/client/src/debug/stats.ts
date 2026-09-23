/**
 * Pure measurement math for the HUD's summary CSV columns (docs/tech/gps-trace-format.md 4.1;
 * F02-map-location-spike.md section 10.5). Every function here recomputes from the full sample
 * list on demand rather than maintaining incremental state: a field-walk session is at most a few
 * thousand samples, so O(n log n) on export/redraw is cheap, and a pure recompute is far easier to
 * unit-test and to trust than a hand-rolled streaming accumulator.
 *
 * Explicitly NOT the real movement gate (CLAUDE.md non-negotiable 1, non-negotiable 2): the gate
 * that pays out a reward lives in `packages/shared` (Phase 2) and the server (Phase 3). This
 * module's `computeGateWindows` only measures how a real walk would have scored against that same
 * config, for the tech gate's Go/No-go table (tech note 10.5 row "gate": "เป็นค่าวัดเท่านั้น").
 * `packages/shared` has no haversine/gate helper yet to import (Phase 2 adds one); duplicating a
 * few lines of read-only geometry here, for a throwaway spike measurement, is not the reward-logic
 * fork CLAUDE.md forbids.
 */
import type { GateComparison } from '../config/balance';

export interface HudSample {
  readonly timestamp: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
}

const EARTH_RADIUS_M = 6371000;
const MS_PER_SECOND = 1000;
const DEGREES_IN_HALF_CIRCLE = 180;
const MEDIAN_PERCENTILE = 50;

function toRadians(deg: number): number {
  return (deg * Math.PI) / DEGREES_IN_HALF_CIRCLE;
}

/** `array[index]`, asserted present. Every call site (here and in `raw-trace-export.ts`) only ever
 * indexes within a loop bound already checked against `array.length`, so this never actually
 * throws; it exists so the code can stay `@typescript-eslint/no-non-null-assertion`-clean without
 * an unchecked `!`. */
export function at<T>(array: readonly T[], index: number): T {
  const value = array[index];
  if (value === undefined) {
    throw new Error(`debug/stats: index ${index} out of range (length ${array.length})`);
  }
  return value;
}

/** Great-circle distance in metres (WGS84 sphere approximation, fine at city scale). */
export function haversineMeters(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest-rank percentile (matches the tech note's plain-language "p90"/"p5", no interpolation). */
export function percentile(sortedAscending: readonly number[], p: number): number | undefined {
  if (sortedAscending.length === 0) {
    return undefined;
  }
  const rank = Math.ceil((p / 100) * sortedAscending.length) - 1;
  const clamped = Math.min(Math.max(rank, 0), sortedAscending.length - 1);
  return sortedAscending[clamped];
}

function median(values: readonly number[]): number | undefined {
  return percentile(
    [...values].sort((a, b) => a - b),
    MEDIAN_PERCENTILE,
  );
}

export interface AccuracyStats {
  readonly median_m: number | undefined;
  readonly highPercentile_m: number | undefined;
  readonly max_m: number | undefined;
  readonly sampleCount: number;
}

/** Only samples after `warmupSeconds` from `startTimestamp` count (tech note 10.5: "ตัด 60
 * วินาทีแรกหลัง start() (warm-up)"). */
export function computeAccuracyStats(
  samples: readonly HudSample[],
  startTimestamp: number,
  warmupSeconds: number,
  highPercentile: number,
): AccuracyStats {
  const warmupMs = warmupSeconds * MS_PER_SECOND;
  const accuracies = samples
    .filter((s) => s.timestamp - startTimestamp >= warmupMs)
    .map((s) => s.accuracy)
    .sort((a, b) => a - b);
  return {
    median_m: median(accuracies),
    highPercentile_m: percentile(accuracies, highPercentile),
    max_m: accuracies.length > 0 ? accuracies[accuracies.length - 1] : undefined,
    sampleCount: accuracies.length,
  };
}

export interface GapStats {
  readonly count: number;
  readonly total_s: number;
  readonly pct: number;
}

/** Gaps strictly greater than `gapThreshold_s` between consecutive samples (tech note 10.5 row
 * "sample ขาด"). `duration_s` is the segment length used for the percentage denominator. */
export function computeGapStats(
  samples: readonly HudSample[],
  gapThreshold_s: number,
  duration_s: number,
): GapStats {
  let count = 0;
  let totalGapMs = 0;
  for (let i = 1; i < samples.length; i++) {
    const gapMs = at(samples, i).timestamp - at(samples, i - 1).timestamp;
    if (gapMs > gapThreshold_s * MS_PER_SECOND) {
      count += 1;
      totalGapMs += gapMs;
    }
  }
  const total_s = totalGapMs / MS_PER_SECOND;
  return { count, total_s, pct: duration_s > 0 ? (total_s / duration_s) * 100 : 0 };
}

/** Median of the gap between consecutive fixes, in seconds (tech note 10.5 row "ช่วงห่าง fix"). */
export function computeSampleIntervalMedianS(samples: readonly HudSample[]): number | undefined {
  const gaps: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    gaps.push((at(samples, i).timestamp - at(samples, i - 1).timestamp) / MS_PER_SECOND);
  }
  return median(gaps);
}

/** Sum of haversine distance between every consecutive pair, unfiltered (tech note 10.5 row "gate":
 * "ไม่กรอง jitter"). */
export function computePathLengthM(samples: readonly HudSample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += haversineMeters(at(samples, i - 1), at(samples, i));
  }
  return total;
}

export interface GateConfig {
  readonly minDistancePerWindow_m: number;
  readonly window_s: number;
  readonly comparison: GateComparison;
}

export interface GateWindowStats {
  readonly windowsTotal: number;
  readonly windowsPass: number;
  readonly windowsPassPct: number;
}

function gatePasses(distance_m: number, gate: GateConfig): boolean {
  // `comparison` only has one recognized value today (config/balance.ts); an unrecognized value
  // would already have failed loudly at config-load time, so this is exhaustive in practice.
  switch (gate.comparison) {
    case 'greaterThan':
      return distance_m > gate.minDistancePerWindow_m;
  }
}

/**
 * Slides a `gate.window_s`-long window forward `stepSeconds` at a time across the whole segment
 * (tech note 10.5 row "gate": "หน้าต่างยาว window_s เลื่อนทีละ 30 วินาที") and checks the summed
 * haversine distance inside each window against `gate` (`config/balance/dungeons.json#movementGate`
 * — read-only here, see this file's header comment on why that is not a reward-logic fork).
 */
export function computeGateWindows(
  samples: readonly HudSample[],
  gate: GateConfig,
  stepSeconds: number,
): GateWindowStats {
  if (samples.length < 2) {
    return { windowsTotal: 0, windowsPass: 0, windowsPassPct: 0 };
  }
  const start = at(samples, 0).timestamp;
  const end = at(samples, samples.length - 1).timestamp;
  const windowMs = gate.window_s * MS_PER_SECOND;
  const stepMs = stepSeconds * MS_PER_SECOND;

  let windowsTotal = 0;
  let windowsPass = 0;
  for (let windowStart = start; windowStart + windowMs <= end; windowStart += stepMs) {
    const windowEnd = windowStart + windowMs;
    const inWindow = samples.filter((s) => s.timestamp >= windowStart && s.timestamp <= windowEnd);
    windowsTotal += 1;
    if (gatePasses(computePathLengthM(inWindow), gate)) {
      windowsPass += 1;
    }
  }
  return {
    windowsTotal,
    windowsPass,
    windowsPassPct: windowsTotal > 0 ? (windowsPass / windowsTotal) * 100 : 0,
  };
}

/** Seconds from `startTimestamp` (provider `start()`) to the first sample whose `accuracy` is at
 * or under `maxAccuracy_m` (tech note 10.5 row "TTFF": `config/balance/anticheat.json#checkIn`). */
export function computeTtffS(
  samples: readonly HudSample[],
  startTimestamp: number,
  maxAccuracy_m: number,
): number | undefined {
  const first = samples.find((s) => s.accuracy <= maxAccuracy_m);
  return first === undefined ? undefined : (first.timestamp - startTimestamp) / MS_PER_SECOND;
}
