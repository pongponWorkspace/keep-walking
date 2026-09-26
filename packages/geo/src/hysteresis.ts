// Edge hysteresis (F04-R14, R15, tech note F04 5.2, D-103, D-104): decides only WHETHER the
// inside/outside state changes, never the gate distance. Distance still counts only for pairs
// with both fixes inside the polygon (F05-R05), so hysteresis never widens the polygon for
// rewards.
//
// Rule (D-103, reference tools/sim/src/presence.ts `Hysteresis`):
// - The pending run = consecutive usable fixes observed on the side opposite the confirmed side.
//   A usable fix on the confirmed side (at any depth) resets it.
// - A fix on the other side COUNTS only when boundaryDistance_m > edgeHysteresis_m
//   (edgeHysteresis_m = 0: every fix on the other side counts). A fix on the other side inside the
//   band is neutral: it neither counts nor resets, but it does open the run when it is the first.
// - The change is confirmed when edgeHysteresisSamples fixes have counted, and takes effect at the
//   FIRST fix of the pending run, band fixes included (`since_t_ms`). Same rule both directions.
// - D-104: consecutive usable fixes further apart than maxSamplePairGap_s drop the pending run
//   before the later fix is processed (`edgeHysteresisDropStale`, applied by `edgeHysteresisFeed`;
//   the engine also calls it at tick time with now_ms).
import { requireNonNegative, requirePositive, requirePositiveInteger } from './params';
import { MS_PER_S } from './units';

export interface EdgeHysteresisParams {
  /** Fixes on the other side that must count to confirm a change. Config `runState.edgeHysteresisSamples`. */
  readonly edgeHysteresisSamples: number;
  /**
   * A fix on the other side counts only when it is further than this from the boundary.
   * Config `runState.edgeHysteresis_m`. 0 = every fix on the other side counts. A fix on the other
   * side but within this band is neutral: it neither counts nor resets the run.
   */
  readonly edgeHysteresis_m: number;
}

/** D-104: config `movementGate.maxSamplePairGap_s`. */
export interface EdgeHysteresisGapParams {
  readonly maxSamplePairGap_s: number;
}

export type EdgeSide = 'inside' | 'outside';

/** Serializable state: confirmed side, the pending run so far, and the last usable fix time. */
export interface EdgeHysteresisState {
  readonly side: EdgeSide;
  /** Fixes of the pending run that counted (beyond the band). */
  readonly pendingCount: number;
  /** First fix of the pending run on the other side, band fixes included (D-103). */
  readonly pendingSince_t_ms: number | null;
  /** Last usable fix fed (either side), for the D-104 gap rule. null = none yet. */
  readonly last_t_ms: number | null;
}

/** One usable fix (F04-R16: the caller feeds usable fixes only), from `edgeObservation`. */
export interface EdgeHysteresisInput {
  readonly t_ms: number;
  readonly inside: boolean;
  readonly boundaryDistance_m: number;
}

export interface EdgeTransition {
  readonly to: EdgeSide;
  /** Time of the first fix of the confirming run: the change is back-dated here (F04-R14). */
  readonly since_t_ms: number;
}

export interface EdgeHysteresisStepResult {
  readonly state: EdgeHysteresisState;
  readonly transition: EdgeTransition | null;
}

export function validateEdgeHysteresisParams(p: EdgeHysteresisParams): void {
  requirePositiveInteger('edgeHysteresisSamples', p.edgeHysteresisSamples);
  requireNonNegative('edgeHysteresis_m', p.edgeHysteresis_m);
}

export function validateEdgeHysteresisGapParams(p: EdgeHysteresisGapParams): void {
  requirePositive('maxSamplePairGap_s', p.maxSamplePairGap_s);
}

/**
 * State at a confirmed side with no pending run. `last_t_ms` = the time the gap clock starts
 * from (for example the confirm instant, reference `runTimeline` lastUsable = confirmAt_ms).
 */
export function edgeHysteresisInit(
  side: EdgeSide,
  last_t_ms: number | null = null,
): EdgeHysteresisState {
  return { side, pendingCount: 0, pendingSince_t_ms: null, last_t_ms };
}

/** True when a fix at `t_ms` would follow the last usable fix by more than maxSamplePairGap_s. */
export function edgeHysteresisGapExceeded(
  state: EdgeHysteresisState,
  t_ms: number,
  p: EdgeHysteresisGapParams,
): boolean {
  return state.last_t_ms !== null && t_ms - state.last_t_ms > p.maxSamplePairGap_s * MS_PER_S;
}

/**
 * D-104: drops the pending run when `t_ms` (the next fix, or now_ms at tick) is more than
 * maxSamplePairGap_s after the last usable fix. The confirmed side and `last_t_ms` stay: the
 * no-evidence exit of a confirmed `inside` (tech note F04 5.3) is the engine's decision.
 */
export function edgeHysteresisDropStale(
  state: EdgeHysteresisState,
  t_ms: number,
  p: EdgeHysteresisGapParams,
): EdgeHysteresisState {
  if (!edgeHysteresisGapExceeded(state, t_ms, p) || state.pendingSince_t_ms === null) return state;
  return { ...state, pendingCount: 0, pendingSince_t_ms: null };
}

/**
 * Feeds one usable fix WITHOUT the D-104 gap rule (the caller applies `edgeHysteresisDropStale`
 * itself, or uses `edgeHysteresisFeed`). Updates `last_t_ms`.
 */
export function edgeHysteresisStep(
  state: EdgeHysteresisState,
  obs: EdgeHysteresisInput,
  p: EdgeHysteresisParams,
): EdgeHysteresisStepResult {
  const obsSide: EdgeSide = obs.inside ? 'inside' : 'outside';
  if (obsSide === state.side) {
    return { state: edgeHysteresisInit(state.side, obs.t_ms), transition: null };
  }
  const since = state.pendingSince_t_ms ?? obs.t_ms;
  const counts = p.edgeHysteresis_m === 0 || obs.boundaryDistance_m > p.edgeHysteresis_m;
  const count = state.pendingCount + (counts ? 1 : 0);
  if (count >= p.edgeHysteresisSamples) {
    return {
      state: edgeHysteresisInit(obsSide, obs.t_ms),
      transition: { to: obsSide, since_t_ms: since },
    };
  }
  return {
    state: { side: state.side, pendingCount: count, pendingSince_t_ms: since, last_t_ms: obs.t_ms },
    transition: null,
  };
}

/** Feeds one usable fix with both rules: D-104 gap drop first, then D-103 counting. */
export function edgeHysteresisFeed(
  state: EdgeHysteresisState,
  obs: EdgeHysteresisInput,
  p: EdgeHysteresisParams & EdgeHysteresisGapParams,
): EdgeHysteresisStepResult {
  return edgeHysteresisStep(edgeHysteresisDropStale(state, obs.t_ms, p), obs, p);
}

/** Batch form: every confirmed change in order (design/systems/test-vectors/run-state.json). */
export function edgeHysteresisTransitions(
  observations: readonly EdgeHysteresisInput[],
  initialSide: EdgeSide,
  p: EdgeHysteresisParams & EdgeHysteresisGapParams,
): EdgeTransition[] {
  validateEdgeHysteresisParams(p);
  validateEdgeHysteresisGapParams(p);
  let state = edgeHysteresisInit(initialSide);
  const out: EdgeTransition[] = [];
  for (const obs of observations) {
    const r = edgeHysteresisFeed(state, obs, p);
    state = r.state;
    if (r.transition !== null) out.push(r.transition);
  }
  return out;
}
