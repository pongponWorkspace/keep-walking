// Movement gate + rewardWindow (ADR 0003 section 5, tech note F05 sections 2-4 and 6,
// P2-F05-T08). Reference: tools/sim/src/gate.ts (read-only, never imported).
//
// Composed entirely on @keep-walking/geo's incremental primitives: `gateFilterStep` (step 1,
// accuracy + outlier) and `gridStep` (steps 2-3, grid resample + distance). geo's F05 3.1 item 5
// speed-lock pair rule landed in P2-X03 (`speedLock_kmh` on `GridParams`); this file carried its
// own fork of steps 2-3 until then (see git history) and now composes geo's `gridStep` unchanged.
//
// `countable` (`GateStepInput`, geo `TimedSample`) must be "inside the polygon AND the window
// clock is running", not "inside" alone: a fix whose *tau* happens to be frozen mid-gap (Grace,
// Suspended, lock) is not, by itself, evidence the clock is running at that instant, and geo's
// grid has no other source of that fact. The production path (`session`) only ever calls
// `gateAccumulatorStep` while `run.status === 'active'` and unlocked, so `countable = inside`
// there; the batch `gateWindows` below (driven by a literal list of running intervals, for the
// vectors and QA trace-replay) computes `running` itself (`isRunning`) and ANDs it in.
import type {
  GateFilterParams,
  GateFilterState,
  GridState,
  FilterVerdict,
  GeoSample,
} from '@keep-walking/geo';
import {
  gateFilterInit,
  gateFilterStep,
  gridInit,
  gridStep,
  gridCloseThrough,
  windowIndexOf as geoWindowIndexOf,
  MS_PER_S,
} from '@keep-walking/geo';
import type { DungeonSample } from '../run';

/** Running interval of the window clock in real time (F05 section 2), both ends inclusive. */
export interface ClockInterval {
  readonly start_ms: number;
  readonly end_ms: number | null;
}

/** Active time tau (ms) at real time t: sum of running duration up to t (tech note F05 section 2). */
export function tauAt(t_ms: number, clock: readonly ClockInterval[]): number {
  let tau = 0;
  for (const c of clock) {
    if (t_ms <= c.start_ms) break;
    const end = c.end_ms === null ? t_ms : Math.min(t_ms, c.end_ms);
    tau += end - c.start_ms;
  }
  return tau;
}

/** Real time at which active time reaches `targetTau_ms` (inverse of tauAt). Test/report use only. */
function realTimeAtTau(clock: readonly ClockInterval[], targetTau_ms: number): number {
  let acc = 0;
  for (const c of clock) {
    const dur = c.end_ms === null ? Number.POSITIVE_INFINITY : c.end_ms - c.start_ms;
    if (acc + dur >= targetTau_ms) return c.start_ms + (targetTau_ms - acc);
    acc += dur;
  }
  throw new RangeError('targetTau_ms is past the end of the clock');
}

/** Window index owning tau (windows are `(k*window, (k+1)*window]`, ADR 0003 5.2). */
export function windowIndexOf(tau_ms: number, window_s: number): number {
  return geoWindowIndexOf(tau_ms, window_s * MS_PER_S);
}

/**
 * ADR 0003 5.2 item 4: only `greaterThan` is a defined comparison; anything else fails closed.
 * Returns `null` instead of throwing (the low-level vector-facing form); callers that build
 * `GateAccumulatorParams` must reject an unknown comparison up front (`validateGateParams`).
 */
export function passesGate(distance_m: number, min_m: number, comparison: string): boolean | null {
  if (comparison === 'greaterThan') return distance_m > min_m;
  return null;
}

export interface GateParams extends GateFilterParams {
  readonly window_s: number;
  readonly minDistancePerWindow_m: number;
  readonly comparison: string;
  /** Grid spacing in seconds of active time (config `movementGate.sampleCadence_s`). */
  readonly sampleCadence_s: number;
  /** A pair further apart than this (fix time) adds no distance. */
  readonly maxSamplePairGap_s: number;
  /** anticheat.speedLock.speedLock_kmh: F05 3.1 item 5. */
  readonly speedLock_kmh: number;
}

export function validateGateParams(p: GateParams): void {
  if (passesGate(0, p.minDistancePerWindow_m, p.comparison) === null) {
    throw new RangeError(`unknown gate comparison: ${p.comparison}`);
  }
  const window_ms = p.window_s * MS_PER_S;
  const cadence_ms = p.sampleCadence_s * MS_PER_S;
  if (
    !Number.isInteger(window_ms) ||
    !Number.isInteger(cadence_ms) ||
    window_ms % cadence_ms !== 0
  ) {
    throw new RangeError('window_s must be a whole multiple of sampleCadence_s (ADR 0003 5.3)');
  }
}

export interface GateAccumulatorState {
  readonly filter: GateFilterState;
  readonly grid: GridState;
  /** Index of the still-open window. */
  readonly k: number;
  /** Distance accumulated so far in window k (F05 3.3; also the D-059 partial distance). */
  readonly distance_m: number;
}

export function gateAccumulatorInit(): GateAccumulatorState {
  return { filter: gateFilterInit(), grid: gridInit(), k: 0, distance_m: 0 };
}

/**
 * Starts a fresh accumulator (new filter/grid state — a new chain, anchored at whatever sample is
 * fed to it next) that continues an *already-open* window instead of window 0 (F05 3.5: "τ เริ่มที่
 * ค่าที่ค้าง" / section 2 R03 "ระยะในหน้าต่างยังอยู่"). Used to seed `rewardScratch` from `main`'s
 * paused state at the first sample of a pending return-from-Grace/Suspended or pending-unlock set:
 * `main` itself keeps `k`/`distance_m` frozen while paused, so the still-open window's index and
 * partial distance must carry over, not reset to `gateAccumulatorInit()`'s `k: 0, distance_m: 0` —
 * otherwise a resume after at least one window has already closed and granted spuriously re-closes
 * window 0 (or whichever window is already behind `main`) as a fresh, distance-less window and
 * emits a spurious `run_tick_denied` for a tick already granted (P2-H57).
 */
export function gateAccumulatorResume(main: GateAccumulatorState): GateAccumulatorState {
  return { filter: gateFilterInit(), grid: gridInit(), k: main.k, distance_m: main.distance_m };
}

export interface GateStepInput {
  readonly sample: GeoSample;
  readonly tau_ms: number;
  /** Inside the run polygon (F05 3.1 item 1); the window clock's own running state is `tau_ms`
   * itself (frozen during a pause, tech note F04 4.3), not a separate flag. */
  readonly countable: boolean;
}

export interface ClosedGateWindow {
  readonly k: number;
  readonly distance_m: number;
  readonly passed: boolean;
}

export interface GateStepResult {
  readonly state: GateAccumulatorState;
  readonly verdict: FilterVerdict;
  readonly closed: readonly ClosedGateWindow[];
}

function closeUpTo(
  k: number,
  distance_m: number,
  tau_ms: number,
  window_ms: number,
  minDistance_m: number,
  closed: ClosedGateWindow[],
): { k: number; distance_m: number } {
  let nk = k;
  let nd = distance_m;
  while ((nk + 1) * window_ms <= tau_ms) {
    closed.push({ k: nk, distance_m: nd, passed: nd > minDistance_m });
    nk += 1;
    nd = 0;
  }
  return { k: nk, distance_m: nd };
}

/**
 * Feeds one usable fix (in time order): step 1 (`gateFilterStep`, accuracy + outlier), then geo's
 * `gridStep` (steps 2-3: pair validity including F05 3.1 item 5 speedLock_kmh, grid resample and
 * distance), then closes every window whose end tau this fix reaches (ADR 0003 5.2).
 */
export function gateAccumulatorStep(
  state: GateAccumulatorState,
  input: GateStepInput,
  p: GateParams,
): GateStepResult {
  const { t_ms, lat, lng, accuracy_m } = input.sample;
  const sample: GeoSample = { t_ms, lat, lng, accuracy_m };
  const f = gateFilterStep(state.filter, sample, p);
  if (!f.verdict.kept) {
    return { state: { ...state, filter: f.state }, verdict: f.verdict, closed: [] };
  }
  const window_ms = p.window_s * MS_PER_S;
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
  const closed: ClosedGateWindow[] = [];
  let { k, distance_m } = state;
  for (const pair of g.pairs) {
    ({ k, distance_m } = closeUpTo(
      k,
      distance_m,
      pair.to.tau_ms - 1,
      window_ms,
      p.minDistancePerWindow_m,
      closed,
    ));
    distance_m += pair.distance_m;
  }
  ({ k, distance_m } = closeUpTo(
    k,
    distance_m,
    input.tau_ms,
    window_ms,
    p.minDistancePerWindow_m,
    closed,
  ));
  return {
    state: { filter: f.state, grid: g.state, k, distance_m },
    verdict: f.verdict,
    closed,
  };
}

/** Declares every window whose end tau <= `tau_ms` judged without waiting for a fix (no-evidence
 * timeout or a game-side close, tech note F04 9.1 step 8 / F05 section 6). */
export function gateAccumulatorCloseThrough(
  state: GateAccumulatorState,
  tau_ms: number,
  p: GateParams,
): { readonly state: GateAccumulatorState; readonly closed: readonly ClosedGateWindow[] } {
  const grid = gridCloseThrough(state.grid, tau_ms, p);
  const window_ms = p.window_s * MS_PER_S;
  const closed: ClosedGateWindow[] = [];
  const { k, distance_m } = closeUpTo(
    state.k,
    state.distance_m,
    tau_ms,
    window_ms,
    p.minDistancePerWindow_m,
    closed,
  );
  return { state: { ...state, grid, k, distance_m }, closed };
}

export interface PartialTickParams {
  readonly window_s: number;
  readonly minDistancePerWindow_m: number;
  readonly comparison: string;
  readonly partialTickMinElapsed_s: number;
}

/** D-059 / F05 R22: the open window at a game-side close. */
export function partialTick(
  elapsed_ms: number,
  distance_m: number,
  p: PartialTickParams,
): { readonly evaluated: boolean; readonly f: number; readonly granted: boolean } {
  if (elapsed_ms < p.partialTickMinElapsed_s * MS_PER_S) {
    return { evaluated: false, f: 0, granted: false };
  }
  const f = elapsed_ms / (p.window_s * MS_PER_S);
  const pass = passesGate(distance_m, p.minDistancePerWindow_m * f, p.comparison);
  if (pass === null) throw new RangeError(`unknown gate comparison: ${p.comparison}`);
  return { evaluated: true, f, granted: pass };
}

export interface GateWindowsResult {
  readonly windows: readonly { k: number; distance_m: number; passed: boolean; endAt_ms: number }[];
  readonly open: { k: number; elapsed_ms: number; distance_m: number };
  readonly droppedAccuracy: number;
  readonly droppedSpeed: number;
}

/**
 * Batch port of tools/sim/src/gate.ts `runGate`, for the golden vectors (movement-gate.json,
 * reward-window.json, partial-tick.json) and QA trace-replay: drives `gateAccumulatorStep`
 * (the same composition `session` uses per sample) over a whole trace and the window clock's
 * running intervals. `endAt_ms` (D-059) stops the accumulator early and judges the rest as usual.
 */
/** Whether `t_ms` lies within one of the window clock's running intervals (both ends inclusive):
 * the fix in `intervalOf(t_ms, clock) >= 0` (reference gate.ts) that `countable` must fold in
 * alongside "inside the polygon" — a fix whose *tau* happens to be frozen mid-gap is not, by
 * itself, evidence that the clock is running at that instant. */
function isRunning(t_ms: number, clock: readonly ClockInterval[]): boolean {
  return clock.some((c) => t_ms >= c.start_ms && (c.end_ms === null || t_ms <= c.end_ms));
}

export function gateWindows(
  samples: readonly DungeonSample[],
  clock: readonly ClockInterval[],
  endAt_ms: number | null,
  p: GateParams,
): GateWindowsResult {
  validateGateParams(p);
  const confirmAt_ms = clock[0]?.start_ms ?? Number.POSITIVE_INFINITY;
  const input = samples.filter(
    (s) => s.t_ms >= confirmAt_ms && (endAt_ms === null || s.t_ms <= endAt_ms),
  );
  const window_ms = p.window_s * MS_PER_S;
  let state = gateAccumulatorInit();
  let droppedAccuracy = 0;
  let droppedSpeed = 0;
  // Tau of the last kept fix that is also running (matches the reference's "running kept
  // samples"): a dropped fix, or one that lands in a paused gap, must not push the open window's
  // judged tau forward.
  let lastKeptTau_ms = 0;
  const windows: { k: number; distance_m: number; passed: boolean; endAt_ms: number }[] = [];
  const pushClosed = (closed: readonly ClosedGateWindow[]) => {
    for (const c of closed) {
      windows.push({ ...c, endAt_ms: realTimeAtTau(clock, (c.k + 1) * window_ms) });
    }
  };
  for (const s of input) {
    const tau_ms = tauAt(s.t_ms, clock);
    const running = isRunning(s.t_ms, clock);
    const step = gateAccumulatorStep(
      state,
      { sample: s, tau_ms, countable: s.inside && running },
      p,
    );
    state = step.state;
    if (!step.verdict.kept) {
      if (step.verdict.reason === 'accuracy') droppedAccuracy += 1;
      else droppedSpeed += 1;
    } else if (running) {
      lastKeptTau_ms = Math.max(lastKeptTau_ms, tau_ms);
    }
    pushClosed(step.closed);
  }
  if (endAt_ms !== null) {
    const r = gateAccumulatorCloseThrough(state, tauAt(endAt_ms, clock), p);
    state = r.state;
    pushClosed(r.closed);
  }
  const tauJudge = endAt_ms === null ? lastKeptTau_ms : tauAt(endAt_ms, clock);
  return {
    windows,
    open: { k: state.k, elapsed_ms: tauJudge - state.k * window_ms, distance_m: state.distance_m },
    droppedAccuracy,
    droppedSpeed,
  };
}
