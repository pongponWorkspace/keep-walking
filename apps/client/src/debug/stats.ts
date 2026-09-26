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
 *
 * F-05b (ADR 0003 section 4, TL N-12): geometry comes from `@keep-walking/geo`, never a
 * hand-rolled copy — this file used to carry its own haversine with the wrong Earth radius
 * (6,371,000 m instead of the IUGG mean radius geo uses, `EARTH_MEAN_RADIUS_M` = 6,371,008.8 m).
 * `computeGateWindows` calls geo's `gateDiagnosticWindows` for both the raw measurement
 * (`gate_windows_*`, unchanged meaning, gps-trace-format.md `format_version` 1) and the filtered
 * one (`gate_windows_*_filtered`, `format_version` 2, ADR 0003 section 5.3) whenever
 * `config/balance/dungeons.json#movementGate` carries all five filter keys
 * (`config/balance.ts`'s `MovementGateConfig.filter`); until then it falls back to a raw-only
 * sliding window (still built on geo's `haversine_m`) rather than guessing filter parameters.
 */
import {
  gateDiagnosticWindows,
  haversine_m,
  type DiagnosticWindow,
  type GeoSample,
} from '@keep-walking/geo';
import type { MovementGateConfig } from '../config/balance';

export interface HudSample {
  readonly timestamp: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
}

const MS_PER_SECOND = 1000;
const MEDIAN_PERCENTILE = 50;

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

/** Great-circle distance in metres, `@keep-walking/geo`'s `haversine_m` under its old name (every
 * existing call site here and in tests passes a plain `{ lat, lng }`, geo's own `LatLng`). */
export const haversineMeters = haversine_m;

function toGeoSample(sample: HudSample): GeoSample {
  return { t_ms: sample.timestamp, lat: sample.lat, lng: sample.lng, accuracy_m: sample.accuracy };
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
    total += haversine_m(at(samples, i - 1), at(samples, i));
  }
  return total;
}

export interface GateWindowStats {
  readonly windowsTotal: number;
  readonly windowsPass: number;
  readonly windowsPassPct: number;
  /** `undefined` until `gate.filter` is set (config/balance.ts, P2-F05-T20's five keys). */
  readonly windowsPassFiltered: number | undefined;
  readonly windowsPassFilteredPct: number | undefined;
}

const EMPTY_STATS: GateWindowStats = {
  windowsTotal: 0,
  windowsPass: 0,
  windowsPassPct: 0,
  windowsPassFiltered: undefined,
  windowsPassFilteredPct: undefined,
};

/** Raw-only fallback (still geo's `haversine_m`) for when `gate.filter` is not configured yet: the
 * same sliding-window definition `gateDiagnosticWindows`'s raw side uses (ADR 0003 5.1), kept here
 * because that function requires the filter/grid parameters even to compute its raw output. */
function rawOnlyGateWindows(
  samples: readonly HudSample[],
  gate: MovementGateConfig,
  stepSeconds: number,
): GateWindowStats {
  if (samples.length < 2) {
    return EMPTY_STATS;
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
    const distance_m = computePathLengthM(inWindow);
    const passes =
      gate.comparison === 'greaterThan'
        ? distance_m > gate.minDistancePerWindow_m
        : distance_m >= gate.minDistancePerWindow_m;
    if (passes) {
      windowsPass += 1;
    }
  }
  return {
    windowsTotal,
    windowsPass,
    windowsPassPct: windowsTotal > 0 ? (windowsPass / windowsTotal) * 100 : 0,
    windowsPassFiltered: undefined,
    windowsPassFilteredPct: undefined,
  };
}

function countPasses(
  windows: readonly DiagnosticWindow[],
  pick: (w: DiagnosticWindow) => boolean,
): number {
  return windows.filter(pick).length;
}

/**
 * Slides a `gate.window_s`-long window forward `stepSeconds` at a time across the whole segment
 * (tech note 10.5 row "gate": "หน้าต่างยาว window_s เลื่อนทีละ 30 วินาที"), using
 * `@keep-walking/geo`'s `gateDiagnosticWindows` (ADR 0003 section 5.1) when `gate.filter` is
 * configured, so this HUD measurement uses the exact same outlier-filter + resample pipeline the
 * real (server, Phase 3) movement gate uses — never a second, hand-rolled copy of that logic.
 */
export function computeGateWindows(
  samples: readonly HudSample[],
  gate: MovementGateConfig,
  stepSeconds: number,
): GateWindowStats {
  if (gate.filter === undefined) {
    return rawOnlyGateWindows(samples, gate, stepSeconds);
  }
  if (samples.length < 2) {
    return EMPTY_STATS;
  }
  const geoSamples = samples.map(toGeoSample);
  const windows = gateDiagnosticWindows(geoSamples, {
    ...gate.filter,
    window_s: gate.window_s,
    windowStep_s: stepSeconds,
    minDistancePerWindow_m: gate.minDistancePerWindow_m,
    comparison: gate.comparison,
  });
  const windowsTotal = windows.length;
  const windowsPass = countPasses(windows, (w) => w.rawPass);
  const windowsPassFiltered = countPasses(windows, (w) => w.filteredPass);
  return {
    windowsTotal,
    windowsPass,
    windowsPassPct: windowsTotal > 0 ? (windowsPass / windowsTotal) * 100 : 0,
    windowsPassFiltered,
    windowsPassFilteredPct: windowsTotal > 0 ? (windowsPassFiltered / windowsTotal) * 100 : 0,
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
