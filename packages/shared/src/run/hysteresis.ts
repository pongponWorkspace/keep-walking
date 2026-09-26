// Edge hysteresis of the run state machine (F04-R14, R15, tech note F04 5.2, D-103, D-104).
// Wraps @keep-walking/geo's edgeHysteresisStep (ADR 0003 section 4.2: geo owns point-in-polygon
// and hysteresis) and adds one correction confirmed by the systems-designer's vectors: the
// back-dated time of a confirmed change is the first sample observed on the OTHER side, band
// samples included, not the first sample that counted towards edgeHysteresisSamples. geo's own
// `pendingSince_t_ms` only starts on the first counted (non-band) sample (a known gap, fixed for
// geo itself in P2-X03); this file layers the correct anchor on top without waiting for that fix.
import type { EdgeHysteresisParams, EdgeHysteresisState, EdgeSide } from '@keep-walking/geo';
import { edgeHysteresisInit, edgeHysteresisStep } from '@keep-walking/geo';

export type { EdgeHysteresisParams, EdgeSide } from '@keep-walking/geo';

/** One usable fix (the caller feeds usable fixes only, F04-R16). */
export interface PresenceObservation {
  readonly t_ms: number;
  readonly inside: boolean;
  readonly boundaryDistance_m: number;
}

/** Serializable tracker state (ADR 0003 section 5.4: only a handful of numbers, no fix list). */
export interface PresenceTrackerState {
  readonly geo: EdgeHysteresisState;
  /** First sample seen on the side opposite `geo.side` since the last reset, band included. */
  readonly firstOppositeAt_ms: number | null;
}

export interface PresenceConfirmed {
  readonly to: EdgeSide;
  /** Time of the first sample of the confirming run: the change is back-dated here (F04-R14). */
  readonly at_ms: number;
}

export function presenceTrackerInit(side: EdgeSide): PresenceTrackerState {
  return { geo: edgeHysteresisInit(side), firstOppositeAt_ms: null };
}

/**
 * Feeds one usable observation. D-103: a change confirms only when edgeHysteresisSamples samples
 * on the other side have both counted (further than edgeHysteresis_m from the boundary) AND kept
 * the run alive (geo does that part); a sample within the band is neutral, counted by neither
 * rule. D-104 (pair-gap drop) is the caller's responsibility: call `presenceTrackerInit` again to
 * drop a pending run instead of feeding a sample across a gap.
 */
export function presenceStep(
  tracker: PresenceTrackerState,
  obs: PresenceObservation,
  p: EdgeHysteresisParams,
): { readonly tracker: PresenceTrackerState; readonly confirmed: PresenceConfirmed | null } {
  const obsSide: EdgeSide = obs.inside ? 'inside' : 'outside';
  const matchesConfirmedSide = obsSide === tracker.geo.side;
  const { state, transition } = edgeHysteresisStep(tracker.geo, obs, p);
  if (matchesConfirmedSide) {
    return { tracker: { geo: state, firstOppositeAt_ms: null }, confirmed: null };
  }
  const firstOppositeAt_ms = tracker.firstOppositeAt_ms ?? obs.t_ms;
  if (transition !== null) {
    return {
      tracker: { geo: state, firstOppositeAt_ms: null },
      confirmed: { to: transition.to, at_ms: firstOppositeAt_ms },
    };
  }
  return { tracker: { geo: state, firstOppositeAt_ms }, confirmed: null };
}

/** Batch form (design/systems/test-vectors/run-state.json `edgeHysteresis`): every confirmed
 * change in order, in the caller's side vocabulary via `EdgeSide` ('inside' | 'outside'). */
export function edgeHysteresisBatch(
  observations: readonly PresenceObservation[],
  initialSide: EdgeSide,
  p: EdgeHysteresisParams,
): readonly PresenceConfirmed[] {
  let tracker = presenceTrackerInit(initialSide);
  const out: PresenceConfirmed[] = [];
  for (const obs of observations) {
    const step = presenceStep(tracker, obs, p);
    tracker = step.tracker;
    if (step.confirmed !== null) out.push(step.confirmed);
  }
  return out;
}
