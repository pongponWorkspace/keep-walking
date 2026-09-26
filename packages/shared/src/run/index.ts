// @keep-walking/shared/run — dungeon presence (ADR 0003 3.1): the run state machine
// (Active/Grace/Suspended/Ended), PresenceStrategy (check-in), the player-side speed lock
// overlay, and opening hours. Consumed only by `session` (P2-F05-T08); apps/client must not
// import this subpath directly (ADR 0003 3.3, lint ADR 0003 8.2).
export type { SampleTimeGateResult, ClockCheckResult } from './time';
export { sampleTimeGate, clockCheck } from './time';

export type { DungeonSample, PresenceSample } from './sample';

export type {
  EdgeHysteresisGapParams,
  EdgeHysteresisParams,
  EdgeSide,
  PresenceObservation,
  PresenceTrackerState,
  PresenceConfirmed,
} from './hysteresis';
export {
  presenceTrackerInit,
  presencePendingSince,
  presenceStep,
  edgeHysteresisBatch,
} from './hysteresis';

export type {
  SpeedLockParams,
  SpeedLockPhase,
  SpeedLockConfirmed,
  SpeedLockState,
} from './speed-lock';
export { speedLockInit, speedLockStep, speedLockBatch, lockedAt } from './speed-lock';

export type { ApproachState, ApproachSample } from './approach';
export { APPROACH_INIT, approachStep } from './approach';

export type {
  VerificationMode,
  CheckInRejectReason,
  CheckInResult,
  CheckInParams,
  CheckInContext,
  PresenceStrategy,
} from './check-in';
export {
  NotImplementedError,
  UnknownVerificationModeError,
  checkInDecision,
  selectPresenceStrategy,
  checkInBatch,
} from './check-in';

export type {
  RunStateParams,
  RunStatus,
  OutsideStatus,
  RunStateCause,
  RunStateChangedEvent,
  RunTimeoutEvent,
  RunTimelineEvent,
  RunTimelineResult,
} from './run-timeline';
export { runTimers, runTimeline } from './run-timeline';

export type { OpeningHours, OpeningInterval } from './opening-hours';
export { OPENING_HORIZON_DAYS, isOpenAt, openingChangeAfter, closingSoonAt } from './opening-hours';
