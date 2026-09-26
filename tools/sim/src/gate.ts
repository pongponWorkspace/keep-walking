// Reference implementation of the movement gate and rewardWindow (ADR 0003 section 5, tech note
// F05 sections 2-4 and 6, P2-F05-T20). Written independently of packages/geo so the golden
// vectors check geo + packages/shared/src/reward instead of repeating them. Batch form: it takes
// the whole list of samples after confirm and the running intervals of the window clock (after
// back-dating) and returns every judged window. Every threshold is a parameter; nothing here is a
// balance value.

/** IUGG mean earth radius R1 in metres (physical constant, same value as packages/geo). */
export const EARTH_MEAN_RADIUS_M = 6_371_008.8;
export const MS_PER_S = 1000;
const KMH_PER_MPS = 3.6;
const HALF_TURN_DEG = 180;
const DEG_TO_RAD = Math.PI / HALF_TURN_DEG;

export interface Sample {
  t_ms: number;
  lat: number;
  lng: number;
  accuracy_m: number;
  /** Raw point-in-polygon of the run polygon (F04 5.1). */
  inside: boolean;
}

export interface GateParams {
  window_s: number;
  minDistancePerWindow_m: number;
  comparison: string;
  sampleCadence_s: number;
  maxSamplePairGap_s: number;
  maxSampleAccuracy_m: number;
  outlierSpeed_kmh: number;
  outlierReanchorSamples: number;
  /** anticheat.speedLock.speedLock_kmh: a pair faster than this adds no distance (F05 3.1 item 5). */
  speedLock_kmh: number;
}

/** Running interval of the window clock in real time, both ends inclusive; end null = still running. */
export interface ClockInterval {
  start_ms: number;
  end_ms: number | null;
}

export function haversine_m(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pairSpeed_kmh(a: Omit<Sample, 'inside' | 'accuracy_m'>, b: typeof a): number {
  const d = haversine_m(a, b);
  const dt = b.t_ms - a.t_ms;
  if (dt <= 0) return d === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (d / (dt / MS_PER_S)) * KMH_PER_MPS;
}

/** ADR 0003 5.2 item 4: only greaterThan is defined; anything else fails closed (null = reject). */
export function passesGate(distance_m: number, min_m: number, comparison: string): boolean | null {
  if (comparison === 'greaterThan') return distance_m > min_m;
  return null;
}

export type FilterResult = { kept: true; breakBefore: boolean } | { kept: false; reason: string };

/**
 * Step 1 (ADR 0003 5.3): drop outliers only. Accuracy drops are invisible to the re-anchor count.
 * A speed drop joins the pending run when it is consistent with the previous pending fix; the
 * outlierReanchorSamples-th consistent drop becomes the new anchor and the jump adds 0.
 */
export function filterSamples(samples: readonly Sample[], p: GateParams): FilterResult[] {
  let anchor: Sample | null = null;
  let pending: Sample[] = [];
  return samples.map((s): FilterResult => {
    if (!(s.accuracy_m <= p.maxSampleAccuracy_m)) return { kept: false, reason: 'accuracy' };
    if (anchor === null) {
      anchor = s;
      return { kept: true, breakBefore: true };
    }
    if (pairSpeed_kmh(anchor, s) <= p.outlierSpeed_kmh) {
      anchor = s;
      pending = [];
      return { kept: true, breakBefore: false };
    }
    const prev = pending.at(-1);
    pending =
      prev === undefined || pairSpeed_kmh(prev, s) <= p.outlierSpeed_kmh ? [...pending, s] : [s];
    if (pending.length >= p.outlierReanchorSamples) {
      anchor = s;
      pending = [];
      return { kept: true, breakBefore: true };
    }
    return { kept: false, reason: 'speed' };
  });
}

/** Index of the running interval that holds t (inclusive ends), or -1 when the clock is stopped. */
export function intervalOf(t_ms: number, clock: readonly ClockInterval[]): number {
  return clock.findIndex((c) => t_ms >= c.start_ms && (c.end_ms === null || t_ms <= c.end_ms));
}

/** Active time tau (ms) at real time t: running time since confirm (tech note F05 section 2). */
export function tauAt(t_ms: number, clock: readonly ClockInterval[]): number {
  let tau = 0;
  for (const c of clock) {
    if (t_ms <= c.start_ms) break;
    const end = c.end_ms === null ? t_ms : Math.min(t_ms, c.end_ms);
    tau += end - c.start_ms;
  }
  return tau;
}

interface KeptSample {
  s: Sample;
  breakBefore: boolean;
  tau_ms: number;
  interval: number;
}

interface GridValue {
  lat: number;
  lng: number;
  chain: number;
}

export interface JudgedWindow {
  k: number;
  distance_m: number;
  passed: boolean;
}

export interface GateRun {
  /** Windows judged in order (non-overlapping, tau in (kW, (k+1)W]). */
  windows: JudgedWindow[];
  /** The window still open after the last judged one. */
  open: { k: number; elapsed_ms: number; distance_m: number };
  keptCount: number;
  droppedAccuracy: number;
  droppedSpeed: number;
  validPairs: number;
  invalidPairs: number;
}

function pairValid(a: KeptSample, b: KeptSample, p: GateParams): boolean {
  return (
    a.s.inside &&
    b.s.inside &&
    a.interval >= 0 &&
    a.interval === b.interval &&
    !b.breakBefore &&
    b.s.t_ms - a.s.t_ms <= p.maxSamplePairGap_s * MS_PER_S &&
    pairSpeed_kmh(a.s, b.s) <= p.speedLock_kmh
  );
}

/**
 * Steps 1-3 of ADR 0003 5.3 plus the window rule of 5.2 on a batch of samples (t >= confirm, in
 * time order). `endAt_ms` (D-059 close) acts as a final clock stop: samples after it are ignored,
 * every window whose end tau <= tau(endAt) is judged normally and the rest is the open window.
 * Without `endAt_ms` a window is judged only when a kept running sample reaches its end tau.
 */
export function runGate(
  samples: readonly Sample[],
  clock: readonly ClockInterval[],
  p: GateParams,
  endAt_ms: number | null = null,
): GateRun {
  if (passesGate(0, p.minDistancePerWindow_m, p.comparison) === null) {
    throw new RangeError(`unknown gate comparison: ${p.comparison}`);
  }
  const window_ms = p.window_s * MS_PER_S;
  const cadence_ms = p.sampleCadence_s * MS_PER_S;
  if (window_ms % cadence_ms !== 0) throw new RangeError('window_s % sampleCadence_s must be 0');
  const clk: ClockInterval[] =
    endAt_ms === null
      ? [...clock]
      : clock
          .filter((c) => c.start_ms <= endAt_ms)
          .map((c) => ({ start_ms: c.start_ms, end_ms: Math.min(c.end_ms ?? endAt_ms, endAt_ms) }));
  // Only samples at or after confirm enter the accumulator (tech note F04 7.4, F05 R02).
  const confirmAt_ms = clock[0]?.start_ms ?? Number.POSITIVE_INFINITY;
  const input = samples.filter(
    (s) => s.t_ms >= confirmAt_ms && (endAt_ms === null || s.t_ms <= endAt_ms),
  );
  const verdicts = filterSamples(input, p);
  const kept: KeptSample[] = [];
  let droppedAccuracy = 0;
  let droppedSpeed = 0;
  input.forEach((s, i) => {
    const v = verdicts[i] as FilterResult;
    if (v.kept) {
      const interval = intervalOf(s.t_ms, clk);
      kept.push({ s, breakBefore: v.breakBefore, tau_ms: tauAt(s.t_ms, clk), interval });
    } else if (v.reason === 'accuracy') droppedAccuracy += 1;
    else droppedSpeed += 1;
  });
  const grid = new Map<number, GridValue>();
  let chain = 0;
  let validPairs = 0;
  let invalidPairs = 0;
  for (let j = 1; j < kept.length; j += 1) {
    const a = kept[j - 1] as KeptSample;
    const b = kept[j] as KeptSample;
    if (!pairValid(a, b, p)) {
      chain += 1;
      invalidPairs += 1;
      continue;
    }
    validPairs += 1;
    const span = b.tau_ms - a.tau_ms;
    for (let i = Math.ceil(a.tau_ms / cadence_ms); i * cadence_ms <= b.tau_ms; i += 1) {
      if (grid.has(i)) continue;
      const f = span === 0 ? 1 : (i * cadence_ms - a.tau_ms) / span;
      grid.set(i, {
        lat: a.s.lat + (b.s.lat - a.s.lat) * f,
        lng: a.s.lng + (b.s.lng - a.s.lng) * f,
        chain,
      });
    }
  }
  const distanceByWindow = new Map<number, number>();
  for (const [i, g] of grid) {
    const next = grid.get(i + 1);
    if (next === undefined || next.chain !== g.chain) continue;
    const k = Math.ceil(((i + 1) * cadence_ms) / window_ms) - 1;
    distanceByWindow.set(k, (distanceByWindow.get(k) ?? 0) + haversine_m(g, next));
  }
  const running = kept.filter((k) => k.interval >= 0);
  const tauJudge =
    endAt_ms === null ? Math.max(0, ...running.map((k) => k.tau_ms)) : tauAt(endAt_ms, clk);
  const windows: JudgedWindow[] = [];
  for (let k = 0; (k + 1) * window_ms <= tauJudge; k += 1) {
    const d = distanceByWindow.get(k) ?? 0;
    windows.push({ k, distance_m: d, passed: d > p.minDistancePerWindow_m });
  }
  const openK = windows.length;
  return {
    windows,
    open: {
      k: openK,
      elapsed_ms: tauJudge - openK * window_ms,
      distance_m: distanceByWindow.get(openK) ?? 0,
    },
    keptCount: kept.length,
    droppedAccuracy,
    droppedSpeed,
    validPairs,
    invalidPairs,
  };
}

export interface PartialTickParams {
  window_s: number;
  minDistancePerWindow_m: number;
  comparison: string;
  partialTickMinElapsed_s: number;
}

/**
 * D-059 / F05 R22: the open window at a game-side close. e < partialTickMinElapsed_s pays nothing
 * (not evaluated, no random draw); otherwise f = e / window and it passes when
 * distance > minDistancePerWindow_m x f (greaterThan, proportional scaling).
 */
export function partialTick(
  elapsed_ms: number,
  distance_m: number,
  p: PartialTickParams,
): { evaluated: boolean; f: number; granted: boolean } {
  if (elapsed_ms < p.partialTickMinElapsed_s * MS_PER_S) {
    return { evaluated: false, f: 0, granted: false };
  }
  const f = elapsed_ms / (p.window_s * MS_PER_S);
  const pass = passesGate(distance_m, p.minDistancePerWindow_m * f, p.comparison);
  if (pass === null) throw new RangeError(`unknown gate comparison: ${p.comparison}`);
  return { evaluated: true, f, granted: pass };
}
