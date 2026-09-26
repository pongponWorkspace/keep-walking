// Distance accumulator of rewardWindow (ADR 0003 5.2-5.4). Incremental and serializable: it keeps
// only the filter anchor + pending re-anchor fixes, the grid state, the current window index and
// its distance, never the list of fixes of a window (C2-5). Pass/fail, ticks and drops belong to
// packages/shared/src/reward, which calls passesGate with config values.
import type { FilterVerdict, GateFilterParams, GateFilterState } from './filter';
import { gateFilterInit, gateFilterStep, validateGateFilterParams } from './filter';
import type { GridParams, GridState } from './grid';
import { gridCloseThrough, gridInit, gridStep, validateGridParams } from './grid';
import { requirePositive, secondsToWholeMs } from './params';
import type { GeoSample } from './types';
import { MS_PER_S } from './units';

export interface RewardWindowParams extends GateFilterParams, GridParams {
  /** Config `movementGate.window_s`; must be a whole multiple of `sampleCadence_s`. */
  readonly window_s: number;
  /** Config `anticheat.speedLock.speedLock_kmh`: required on the reward path (F05 3.1 item 5). */
  readonly speedLock_kmh: number;
}

export interface RewardWindowState {
  readonly filter: GateFilterState;
  readonly grid: GridState;
  /** Index of the open window: it covers tau in (k * window, (k + 1) * window]. */
  readonly k: number;
  /** Distance accumulated so far in window k (also the partial distance for D-059 / F05-R22). */
  readonly distance_m: number;
}

/** A fix placed on the window clock by the engine. See TimedSample in grid.ts for the fields. */
export interface RewardWindowInput {
  readonly sample: GeoSample;
  readonly tau_ms: number;
  readonly countable: boolean;
}

export interface ClosedWindow {
  readonly k: number;
  readonly distance_m: number;
}

export interface RewardWindowStepResult {
  readonly state: RewardWindowState;
  readonly verdict: FilterVerdict;
  /** Windows completed by this step, in order. Each is judged once by the reward engine. */
  readonly closed: readonly ClosedWindow[];
}

export function validateRewardWindowParams(p: RewardWindowParams): void {
  validateGateFilterParams(p);
  validateGridParams(p);
  requirePositive('speedLock_kmh', p.speedLock_kmh);
  const window_ms = secondsToWholeMs('window_s', p.window_s, MS_PER_S);
  const cadence_ms = p.sampleCadence_s * MS_PER_S;
  if (window_ms % cadence_ms !== 0) {
    throw new RangeError('window_s must be a whole multiple of sampleCadence_s (ADR 0003 5.3)');
  }
}

/** State at the confirm transition into Active (F05-R02): tau = 0, window 0, no distance. */
export function rewardWindowInit(p: RewardWindowParams): RewardWindowState {
  validateRewardWindowParams(p);
  return { filter: gateFilterInit(), grid: gridInit(), k: 0, distance_m: 0 };
}

/** Window index that owns the grid point at `tau_ms` (the end point of a pair, ADR 0003 5.3). */
export function windowIndexOf(tau_ms: number, window_ms: number): number {
  return Math.ceil(tau_ms / window_ms) - 1;
}

function closeUpTo(
  state: RewardWindowState,
  tau_ms: number,
  window_ms: number,
  closed: ClosedWindow[],
): RewardWindowState {
  let { k, distance_m } = state;
  while ((k + 1) * window_ms <= tau_ms) {
    closed.push({ k, distance_m });
    k += 1;
    distance_m = 0;
  }
  return { ...state, k, distance_m };
}

/** Feeds one fix in time order. Windows whose end tau <= this kept fix's tau close (5.2 item 6a). */
export function rewardWindowStep(
  state: RewardWindowState,
  input: RewardWindowInput,
  p: RewardWindowParams,
): RewardWindowStepResult {
  const window_ms = p.window_s * MS_PER_S;
  // Store only the structural fields so the state stays small and plain JSON.
  const { t_ms, lat, lng, accuracy_m } = input.sample;
  const sample: GeoSample = { t_ms, lat, lng, accuracy_m };
  const f = gateFilterStep(state.filter, sample, p);
  if (!f.verdict.kept) {
    return { state: { ...state, filter: f.state }, verdict: f.verdict, closed: [] };
  }
  const g = gridStep(
    state.grid,
    {
      sample,
      tau_ms: input.tau_ms,
      countable: input.countable,
      breakBefore: f.verdict.breakBefore,
    },
    p,
  );
  const closed: ClosedWindow[] = [];
  let next: RewardWindowState = { ...state, filter: f.state, grid: g.state };
  for (const pair of g.pairs) {
    next = closeUpTo(next, pair.to.tau_ms - 1, window_ms, closed);
    const w = windowIndexOf(pair.to.tau_ms, window_ms);
    if (w !== next.k) {
      throw new Error(`grid pair for window ${String(w)} while window ${String(next.k)} is open`);
    }
    next = { ...next, distance_m: next.distance_m + pair.distance_m };
  }
  next = closeUpTo(next, input.tau_ms, window_ms, closed);
  return { state: next, verdict: f.verdict, closed };
}

/**
 * Closes every window whose end tau <= `tau_ms` without waiting for a fix. The engine calls it
 * only when now_ms is past that window end by maxSamplePairGap_s (ADR 0003 5.2 item 6b), so the
 * result equals what a late fix would have produced.
 */
export function rewardWindowCloseThrough(
  state: RewardWindowState,
  tau_ms: number,
  p: RewardWindowParams,
): { readonly state: RewardWindowState; readonly closed: readonly ClosedWindow[] } {
  const window_ms = p.window_s * MS_PER_S;
  const closed: ClosedWindow[] = [];
  const grid = gridCloseThrough(state.grid, tau_ms, p);
  const next = closeUpTo({ ...state, grid }, tau_ms, window_ms, closed);
  return { state: next, closed };
}
