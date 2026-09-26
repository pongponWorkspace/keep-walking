// Edge hysteresis (F04-R15, D-094): decides only WHETHER the inside/outside state changes, never
// the gate distance. Distance still counts only for pairs with both fixes inside the polygon
// (F05-R05), so hysteresis never widens the polygon for rewards. Once confirmed, the change takes
// effect at the first fix of the confirming run (`since_t_ms`, F04-R14).
import { requireNonNegative, requirePositiveInteger } from './params';

export interface EdgeHysteresisParams {
  /** Consecutive fixes on the other side needed to confirm a change. Config `runState.edgeHysteresisSamples`. */
  readonly edgeHysteresisSamples: number;
  /**
   * A fix on the other side counts only when it is further than this from the boundary.
   * Config `runState.edgeHysteresis_m`. 0 = every fix on the other side counts. A fix on the other
   * side but within this band is neutral: it neither counts nor resets the run.
   */
  readonly edgeHysteresis_m: number;
}

export type EdgeSide = 'inside' | 'outside';

/** Serializable state: confirmed side and the run of fixes on the other side so far. */
export interface EdgeHysteresisState {
  readonly side: EdgeSide;
  readonly pendingCount: number;
  readonly pendingSince_t_ms: number | null;
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

export function validateEdgeHysteresisParams(p: EdgeHysteresisParams): void {
  requirePositiveInteger('edgeHysteresisSamples', p.edgeHysteresisSamples);
  requireNonNegative('edgeHysteresis_m', p.edgeHysteresis_m);
}

export function edgeHysteresisInit(side: EdgeSide): EdgeHysteresisState {
  return { side, pendingCount: 0, pendingSince_t_ms: null };
}

export function edgeHysteresisStep(
  state: EdgeHysteresisState,
  obs: EdgeHysteresisInput,
  p: EdgeHysteresisParams,
): { readonly state: EdgeHysteresisState; readonly transition: EdgeTransition | null } {
  const obsSide: EdgeSide = obs.inside ? 'inside' : 'outside';
  if (obsSide === state.side) {
    return { state: edgeHysteresisInit(state.side), transition: null };
  }
  if (!(obs.boundaryDistance_m > p.edgeHysteresis_m) && p.edgeHysteresis_m > 0) {
    return { state, transition: null };
  }
  const since = state.pendingSince_t_ms ?? obs.t_ms;
  const count = state.pendingCount + 1;
  if (count >= p.edgeHysteresisSamples) {
    return { state: edgeHysteresisInit(obsSide), transition: { to: obsSide, since_t_ms: since } };
  }
  return {
    state: { side: state.side, pendingCount: count, pendingSince_t_ms: since },
    transition: null,
  };
}
