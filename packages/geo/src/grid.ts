// Steps 2 and 3 of ADR 0003 5.3: resample kept fixes onto a fixed grid of active time and sum the
// distance between neighbouring grid points. Grid points sit at tau = i * sampleCadence_s, tied to
// the window clock, so every window edge is a grid point and no grid pair straddles an edge.
import { haversine_m, pairSpeed_kmh } from './haversine';
import { requirePositive, secondsToWholeMs } from './params';
import type { GeoSample } from './types';
import { MS_PER_S } from './units';

export interface GridParams {
  /** Grid spacing in seconds of active time. Config `movementGate.sampleCadence_s`. */
  readonly sampleCadence_s: number;
  /** A bracketing pair further apart than this (fix time) values no grid point. */
  readonly maxSamplePairGap_s: number;
  /**
   * Config `anticheat.speedLock.speedLock_kmh`: a pair of fixes faster than this is invalid (adds
   * no distance, breaks the chain), tech note F05 3.1 item 5. Required on the reward path
   * (`RewardWindowParams`). Absent only for the HUD diagnostic, which has no anticheat config and
   * never decides a reward (ADR 0003 5.1).
   */
  readonly speedLock_kmh?: number;
}

/**
 * A fix that passed step 1, placed on the window clock by the caller.
 * - `tau_ms`: active time (window clock) at the fix, integer ms, non-decreasing.
 * - `countable`: the fix is inside the run polygon and the window clock runs (F05-R05 items 1-2,
 *   D-094). The HUD, which has no polygon, passes `true`.
 * - `breakBefore`: from the filter; the pair (previous, this) adds no distance.
 */
export interface TimedSample<S extends GeoSample = GeoSample> {
  readonly sample: S;
  readonly tau_ms: number;
  readonly countable: boolean;
  readonly breakBefore: boolean;
}

/** A grid point that has a value. `seg` identifies the chain of valid sample pairs it lies on. */
export interface GridPoint {
  readonly i: number;
  readonly tau_ms: number;
  readonly lat: number;
  readonly lng: number;
  readonly seg: number;
}

interface LastFix {
  readonly t_ms: number;
  readonly tau_ms: number;
  readonly lat: number;
  readonly lng: number;
  readonly countable: boolean;
  readonly seg: number;
}

/** Serializable grid state: the last fix, the next undetermined grid index, the last valued point. */
export interface GridState {
  readonly last: LastFix | null;
  readonly nextSeg: number;
  readonly nextIndex: number;
  readonly lastPoint: GridPoint | null;
}

export interface GridStepResult {
  readonly state: GridState;
  /** Newly valued grid points, in index order. */
  readonly points: readonly GridPoint[];
  /** (earlier point, point) pairs that add distance, with that distance. */
  readonly pairs: readonly { readonly to: GridPoint; readonly distance_m: number }[];
}

export function validateGridParams(p: GridParams): void {
  secondsToWholeMs('sampleCadence_s', p.sampleCadence_s, MS_PER_S);
  requirePositive('maxSamplePairGap_s', p.maxSamplePairGap_s);
  if (p.speedLock_kmh !== undefined) requirePositive('speedLock_kmh', p.speedLock_kmh);
}

export function gridInit(): GridState {
  return { last: null, nextSeg: 0, nextIndex: 0, lastPoint: null };
}

/** True when a pair of neighbouring valued grid points adds distance. */
export function gridPairCounts(a: GridPoint, b: GridPoint): boolean {
  return b.i === a.i + 1 && b.seg === a.seg;
}

function pairValid(last: LastFix, b: TimedSample, maxGap_ms: number, p: GridParams): boolean {
  const dt_ms = b.sample.t_ms - last.t_ms;
  return (
    last.countable &&
    b.countable &&
    !b.breakBefore &&
    dt_ms <= maxGap_ms &&
    // The window clock ran for the whole pair: a pause in between (Grace, lock) breaks it.
    b.tau_ms - last.tau_ms === dt_ms &&
    // F05 3.1 item 5: a pair faster than the speed lock adds no distance (fix time, not tau).
    (p.speedLock_kmh === undefined || pairSpeed_kmh(last, b.sample) <= p.speedLock_kmh)
  );
}

/**
 * The grid point exactly on fix `b` (index `i`) may still take a value: either time has not
 * reached it yet, or the previous fix sits at the same tau (the window clock was paused between
 * them, so the resume fix lands on the pause point) and nothing valued that point. Matches the
 * reference, where a pair values every grid point in [a.tau, b.tau] not yet valued
 * (tools/sim/src/gate.ts `runGate`); without it a resume on a grid point loses one step.
 */
function onFixPointOpen(state: GridState, b: TimedSample, i: number): boolean {
  if (i >= state.nextIndex) return true;
  const pausedHere = state.last !== null && state.last.tau_ms === b.tau_ms;
  const valued = state.lastPoint !== null && state.lastPoint.i >= i;
  return pausedHere && i === state.nextIndex - 1 && !valued;
}

function emit(
  state: GridState,
  point: GridPoint,
  points: GridPoint[],
  pairs: { to: GridPoint; distance_m: number }[],
): GridState {
  points.push(point);
  const prev = state.lastPoint;
  if (prev !== null && gridPairCounts(prev, point)) {
    pairs.push({ to: point, distance_m: haversine_m(prev, point) });
  }
  return { ...state, lastPoint: point };
}

/**
 * Feeds one kept fix. Determines every grid point with tau <= fix tau that is not yet determined.
 * A grid point between two fixes is linearly interpolated in lat/lng (by tau) only when that pair
 * is valid; a grid point exactly on a fix takes the fix when it is countable. Resampling never
 * crosses an invalid pair (F05-R06, D-094): points on either side get different `seg`.
 */
export function gridStep(state: GridState, b: TimedSample, p: GridParams): GridStepResult {
  const cadence_ms = p.sampleCadence_s * MS_PER_S;
  const maxGap_ms = p.maxSamplePairGap_s * MS_PER_S;
  const last = state.last;
  if (last !== null && b.tau_ms < last.tau_ms) {
    throw new RangeError(`tau_ms went backwards: ${String(b.tau_ms)} < ${String(last.tau_ms)}`);
  }
  const valid = last !== null && pairValid(last, b, maxGap_ms, p);
  const seg = valid ? last.seg : state.nextSeg;
  let next: GridState = {
    ...state,
    nextSeg: valid ? state.nextSeg : state.nextSeg + 1,
    last: {
      t_ms: b.sample.t_ms,
      tau_ms: b.tau_ms,
      lat: b.sample.lat,
      lng: b.sample.lng,
      countable: b.countable,
      seg,
    },
  };
  const points: GridPoint[] = [];
  const pairs: { to: GridPoint; distance_m: number }[] = [];
  const lastIndex = Math.floor(b.tau_ms / cadence_ms);
  if (valid) {
    const span_ms = b.tau_ms - last.tau_ms;
    for (let i = state.nextIndex; i <= lastIndex; i += 1) {
      const tau_ms = i * cadence_ms;
      const f = span_ms === 0 ? 1 : (tau_ms - last.tau_ms) / span_ms;
      const lat = last.lat + (b.sample.lat - last.lat) * f;
      const lng = last.lng + (b.sample.lng - last.lng) * f;
      next = emit(next, { i, tau_ms, lat, lng, seg }, points, pairs);
    }
  } else if (
    b.countable &&
    lastIndex * cadence_ms === b.tau_ms &&
    onFixPointOpen(state, b, lastIndex)
  ) {
    const point = { i: lastIndex, tau_ms: b.tau_ms, lat: b.sample.lat, lng: b.sample.lng, seg };
    next = emit(next, point, points, pairs);
  }
  next = { ...next, nextIndex: Math.max(state.nextIndex, lastIndex + 1) };
  return { state: next, points, pairs };
}

/**
 * Declares every grid point with tau <= `tau_ms` determined without a value. Used when the clock
 * has passed a window end by maxSamplePairGap_s with no fix (ADR 0003 5.2 item 6b): no later fix
 * can value those points, because its pair with the last fix would exceed the gap.
 */
export function gridCloseThrough(state: GridState, tau_ms: number, p: GridParams): GridState {
  const cadence_ms = p.sampleCadence_s * MS_PER_S;
  const lastIndex = Math.floor(tau_ms / cadence_ms);
  return { ...state, nextIndex: Math.max(state.nextIndex, lastIndex + 1) };
}

/** Batch step 2: valued grid points for a whole list of timed kept fixes. */
export function resampleOnGrid(kept: readonly TimedSample[], p: GridParams): GridPoint[] {
  validateGridParams(p);
  let state = gridInit();
  const out: GridPoint[] = [];
  for (const k of kept) {
    const r = gridStep(state, k, p);
    state = r.state;
    out.push(...r.points);
  }
  return out;
}

/** Step 3: sum of great-circle distance over neighbouring grid points of the same chain. */
export function gridDistance_m(points: readonly GridPoint[]): number {
  let total = 0;
  for (let k = 1; k < points.length; k += 1) {
    const a = points[k - 1] as GridPoint;
    const b = points[k] as GridPoint;
    if (gridPairCounts(a, b)) total += haversine_m(a, b);
  }
  return total;
}

/**
 * HUD / trace helper: tau = t - origin_t_ms (the first fix of the measured segment, dropped or
 * not), every fix countable (the HUD has no polygon and its clock always runs).
 */
export function timeFromOrigin<S extends GeoSample>(
  kept: readonly { readonly sample: S; readonly breakBefore: boolean }[],
  origin_t_ms: number,
): TimedSample<S>[] {
  return kept.map((k) => ({
    sample: k.sample,
    tau_ms: k.sample.t_ms - origin_t_ms,
    countable: true,
    breakBefore: k.breakBefore,
  }));
}
