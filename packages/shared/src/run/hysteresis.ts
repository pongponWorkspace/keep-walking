// Edge hysteresis of the run state machine (F04-R14, R15, tech note F04 5.2, D-103, D-104).
// Thin wrapper over @keep-walking/geo's edgeHysteresisFeed (ADR 0003 section 4.2: geo owns
// point-in-polygon and hysteresis): geo now natively backdates a confirmed change to the first
// sample of its confirming run (band samples included, `pendingSince_t_ms`) and natively drops a
// stale pending run when a pair gap wider than maxSamplePairGap_s is fed (D-104,
// `edgeHysteresisDropStale`, folded into `edgeHysteresisFeed`) since P2-X03. This file used to
// carry its own correction for the backdating anchor (see git history before P2-X10); geo's own
// fix made that correction redundant, so this is now a pure rename/re-export layer plus the
// batch helper the vectors use.
import type {
  EdgeHysteresisGapParams,
  EdgeHysteresisInput,
  EdgeHysteresisParams,
  EdgeHysteresisState,
  EdgeSide,
} from '@keep-walking/geo';
import { edgeHysteresisFeed, edgeHysteresisInit } from '@keep-walking/geo';

export type { EdgeHysteresisGapParams, EdgeHysteresisParams, EdgeSide } from '@keep-walking/geo';

/** One usable fix (the caller feeds usable fixes only, F04-R16). */
export type PresenceObservation = EdgeHysteresisInput;

/** Serializable tracker state (ADR 0003 section 5.4: only a handful of numbers, no fix list). */
export interface PresenceTrackerState {
  readonly geo: EdgeHysteresisState;
}

export interface PresenceConfirmed {
  readonly to: EdgeSide;
  /** Time of the first sample of the confirming run: the change is back-dated here (F04-R14). */
  readonly at_ms: number;
}

export function presenceTrackerInit(
  side: EdgeSide,
  last_t_ms: number | null = null,
): PresenceTrackerState {
  return { geo: edgeHysteresisInit(side, last_t_ms) };
}

/** First sample of a run-in-progress on the opposite side, band samples included (null = no
 * pending run right now). Exposed so `session` (P2-X10) can key its F05 3.5 scratch accumulator
 * off the same anchor geo already tracks, without a second copy of this state. */
export function presencePendingSince(tracker: PresenceTrackerState): number | null {
  return tracker.geo.pendingSince_t_ms;
}

/**
 * Feeds one usable observation. D-103: a change confirms only when edgeHysteresisSamples samples
 * on the other side have both counted (further than edgeHysteresis_m from the boundary) AND kept
 * the run alive; a sample within the band is neutral, counted by neither rule. D-104: a pair gap
 * wider than `maxSamplePairGap_s` drops the pending run before this fix is counted (native in geo,
 * `edgeHysteresisFeed`); the caller no longer needs to detect the gap itself to get that part
 * right, though the "no evidence" *exit* while confirmed inside is still the engine's own decision
 * (tech note F04 5.3, `run/run-timeline.ts`).
 */
export function presenceStep(
  tracker: PresenceTrackerState,
  obs: PresenceObservation,
  p: EdgeHysteresisParams & EdgeHysteresisGapParams,
): { readonly tracker: PresenceTrackerState; readonly confirmed: PresenceConfirmed | null } {
  const { state, transition } = edgeHysteresisFeed(tracker.geo, obs, p);
  if (transition === null) return { tracker: { geo: state }, confirmed: null };
  return { tracker: { geo: state }, confirmed: { to: transition.to, at_ms: transition.since_t_ms } };
}

/** Batch form (design/systems/test-vectors/run-state.json `edgeHysteresis`): every confirmed
 * change in order, in the caller's side vocabulary via `EdgeSide` ('inside' | 'outside'). */
export function edgeHysteresisBatch(
  observations: readonly PresenceObservation[],
  initialSide: EdgeSide,
  p: EdgeHysteresisParams & EdgeHysteresisGapParams,
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
