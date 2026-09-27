// Run state machine (F04-R12..R19, tech note F04 sections 4.3, 5, D-094, D-104). Active while
// confirmed inside; Grace then Suspended while confirmed outside or without evidence; Ended by
// timeout. Every transition is back-dated to the first sample of the evidence that confirmed it
// (F04-R14) and timers only fire up to the settled horizon H so a return that back-dates before a
// timer's edge erases it (tech note 4.3, acceptance 4).
import type { GateFilterParams } from '@keep-walking/geo';
import { filterGateSamples, MS_PER_S } from '@keep-walking/geo';
import type {
  EdgeHysteresisGapParams,
  EdgeHysteresisParams,
  EdgeSide,
  PresenceTrackerState,
} from './hysteresis';
import { presenceStep, presenceTrackerInit } from './hysteresis';
import type { PresenceSample } from './sample';

export interface RunStateParams
  extends GateFilterParams, EdgeHysteresisParams, EdgeHysteresisGapParams {
  readonly maxSamplePairGap_s: number;
  readonly graceMax_s: number;
  readonly suspendedMax_s: number;
}

/** A run is never "outside" without one of these two waiting states (Ended has none). */
export type OutsideStatus = 'grace' | 'suspended';
export type RunStatus = 'active' | OutsideStatus | 'ended';

export type RunStateCause = 'left_polygon' | 'no_evidence' | 'returned' | 'grace_expired';

export interface RunStateChangedEvent {
  readonly type: 'run_state_changed';
  readonly from: RunStatus;
  readonly to: RunStatus;
  readonly cause: RunStateCause;
  readonly at_ms: number;
}
export interface RunTimeoutEvent {
  readonly type: 'dungeon_exited';
  readonly exitReason: 'timeout';
  readonly at_ms: number;
}
export type RunTimelineEvent = RunStateChangedEvent | RunTimeoutEvent;

/** The `+1`ms epsilon of the reference: at exactly the edge (180 s, 900 s) the run is still in
 * the shorter state (F04 acceptance 4, "<=" edges), only 1 ms past it does the timer fire. */
const EDGE_EPSILON_MS = 1;

/** Pure step of the Grace -> Suspended -> Ended timers (tech note F04 5.4). `status` must be
 * 'grace' or 'suspended'; callers do not call this while active (there is no timer to run). */
export function runTimers(
  status: OutsideStatus,
  exitStartedAt_ms: number,
  settledHorizon_ms: number,
  p: { readonly graceMax_s: number; readonly suspendedMax_s: number },
): { readonly status: RunStatus; readonly events: readonly RunTimelineEvent[] } {
  const events: RunTimelineEvent[] = [];
  let current: RunStatus = status;
  if (current === 'grace') {
    const at_ms = exitStartedAt_ms + p.graceMax_s * MS_PER_S + EDGE_EPSILON_MS;
    if (at_ms <= settledHorizon_ms) {
      events.push({
        type: 'run_state_changed',
        from: 'grace',
        to: 'suspended',
        cause: 'grace_expired',
        at_ms,
      });
      current = 'suspended';
    }
  }
  if (current === 'suspended') {
    const at_ms = exitStartedAt_ms + p.suspendedMax_s * MS_PER_S;
    if (at_ms + EDGE_EPSILON_MS <= settledHorizon_ms) {
      events.push({ type: 'dungeon_exited', exitReason: 'timeout', at_ms });
      current = 'ended';
    }
  }
  return { status: current, events };
}

export interface RunTimelineResult {
  readonly events: readonly RunTimelineEvent[];
  readonly status: RunStatus;
  readonly exitStartedAt_ms: number | null;
  /** Start of an unconfirmed pending run (return or exit) still waiting, or null. */
  readonly pendingSince_ms: number | null;
}

/**
 * Batch form (design/systems/test-vectors/run-state.json `runTimeline`): the settled result of
 * confirm -> now_ms over one dungeon's samples. Built by driving `presenceStep` and `runTimers`
 * sample by sample, exactly the composition `session` (P2-F05-T08) must reproduce incrementally:
 * a pair gap wider than maxSamplePairGap_s both ends the run with `no_evidence` while active
 * (F04 5.3) and drops any pending run (D-104, a proposed correction to the plain reducer that
 * would otherwise let a half-built return hold the settled horizon across an app closure).
 */
export function runTimeline(
  samples: readonly PresenceSample[],
  confirmAt_ms: number,
  now_ms: number,
  p: RunStateParams,
): RunTimelineResult {
  const input = samples.filter((s) => s.t_ms >= confirmAt_ms && s.t_ms <= now_ms);
  const { kept } = filterGateSamples(input, p);
  const gap_ms = p.maxSamplePairGap_s * MS_PER_S;

  // A mutable box, not plain `let`s: TypeScript does not narrow a property read back to a
  // literal type the way it narrows a bare variable, so `run.status === 'ended'` stays the
  // union `RunStatus` after the nested closures below reassign it (they alias the same box).
  const run: {
    tracker: PresenceTrackerState;
    exitAt: number | null;
    status: RunStatus;
    lastUsable: number;
    /** F04-R15 item 7 (tech note F06 15.1): a `no_evidence` exit awaiting its one-sample shortcut
     * judgment (`null` once judged or when the exit was a genuine, hysteresis-confirmed leave). */
    exitCause: RunStateCause | null;
  } = {
    tracker: presenceTrackerInit('inside'),
    exitAt: null,
    status: 'active',
    lastUsable: confirmAt_ms,
    exitCause: null,
  };
  const events: RunTimelineEvent[] = [];

  // A function call, not a bare `run.status === 'ended'` comparison: TypeScript's narrowing of a
  // property does not get invalidated by a later call to `settle` (a known control-flow-analysis
  // gap for nested closures that alias the same object), so an inline comparison after two
  // `settle` calls in the same block wrongly reports the 'ended' branch as unreachable.
  const isEnded = (): boolean => run.status === 'ended';
  const pendingSinceOr = (fallback: number): number =>
    run.tracker.geo.pendingSince_t_ms ?? fallback;

  const settle = (upTo: number): void => {
    if (run.exitAt === null || run.status === 'active' || run.status === 'ended') return;
    const r = runTimers(run.status, run.exitAt, upTo, p);
    events.push(...r.events);
    run.status = r.status;
  };

  const dropPending = (side: EdgeSide): void => {
    run.tracker = presenceTrackerInit(side);
  };

  const leave = (at_ms: number, cause: 'left_polygon' | 'no_evidence'): void => {
    events.push({ type: 'run_state_changed', from: 'active', to: 'grace', cause, at_ms });
    run.exitAt = at_ms;
    run.status = 'grace';
    run.exitCause = cause;
  };

  const toActive = (at_ms: number): void => {
    events.push({
      type: 'run_state_changed',
      from: run.status,
      to: 'active',
      cause: 'returned',
      at_ms,
    });
    run.exitAt = null;
    run.status = 'active';
    run.exitCause = null;
  };

  const handleGapSince = (t_ms: number): void => {
    if (t_ms - run.lastUsable <= gap_ms) return;
    dropPending(run.tracker.geo.side);
    // F04-R15 item 7: the presence tracker's confirmed side stays 'inside' (a no_evidence exit
    // never geometrically left) -- the shortcut below judges the very next usable sample once,
    // directly, instead of resetting to a confirmed 'outside' that would need a full hysteresis
    // set to leave from.
    if (run.tracker.geo.side === 'inside') leave(run.lastUsable, 'no_evidence');
  };

  for (const { sample } of kept) {
    handleGapSince(sample.t_ms);
    settle(Math.min(sample.t_ms, pendingSinceOr(sample.t_ms)));
    if (isEnded()) break;
    if (run.exitCause === 'no_evidence') {
      // F04-R15 item 7 (tech note F06 15.1): this is s1, judged exactly once, from raw
      // containment (band included) -- no hysteresis set either way.
      if (sample.inside) {
        run.tracker = presenceTrackerInit('inside', sample.t_ms);
        toActive(sample.t_ms);
      } else {
        run.exitCause = 'left_polygon';
        run.tracker = presenceTrackerInit('outside', sample.t_ms);
      }
    } else {
      const step = presenceStep(run.tracker, sample, p);
      run.tracker = step.tracker;
      if (step.confirmed !== null && step.confirmed.to === 'inside') {
        settle(step.confirmed.at_ms);
        if (isEnded()) break;
        toActive(step.confirmed.at_ms);
      } else if (step.confirmed !== null) {
        leave(step.confirmed.at_ms, 'left_polygon');
      }
    }
    run.lastUsable = sample.t_ms;
    settle(Math.min(sample.t_ms, pendingSinceOr(sample.t_ms)));
    if (isEnded()) break;
  }
  if (!isEnded()) handleGapSince(now_ms);
  const evidenceEnd_ms = now_ms - run.lastUsable <= gap_ms ? run.lastUsable : now_ms;
  settle(Math.min(evidenceEnd_ms, pendingSinceOr(evidenceEnd_ms)));

  return {
    events,
    status: run.status,
    exitStartedAt_ms: run.status === 'active' || run.status === 'ended' ? null : run.exitAt,
    pendingSince_ms: run.status === 'ended' ? null : run.tracker.geo.pendingSince_t_ms,
  };
}
