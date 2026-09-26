// @keep-walking/shared/session — sessionStep, the one entry point apps/client calls (tech note
// F04 section 2). Composes `run` (P2-F04-T20) and `reward` (P2-F05-T08) into run -> gate -> tick
// -> drop; the HP engine (P2-F06-T06) extends `RunState.hp` and the hit sequence on top of this.
export type {
  ActiveClock,
  CheckInRejectReason,
  PlayerState,
  RawSample,
  RunBag,
  RunHpState,
  RunState,
  RunStatus,
  RunSummary,
  SessionConfig,
  SessionDungeonRecord,
  SessionEvent,
  SessionInput,
  SessionParams,
  SessionState,
} from './types';
export {
  EMPTY_BAG,
  InvalidSessionInputError,
  UnsupportedConfigError,
  bagAdd,
  clockStart,
  clockStop,
  createPlayer,
  tauOf,
} from './types';
export { createSession, sessionStep } from './reducer';
