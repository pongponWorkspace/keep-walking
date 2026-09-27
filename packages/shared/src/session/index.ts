// @keep-walking/shared/session — sessionStep, the one entry point apps/client calls (tech note
// F04 section 2). Composes `run` (P2-F04-T20) and `reward` (P2-F05-T08) into run -> gate -> tick
// -> drop; the HP engine (P2-F06-T06) extends `RunState.hp` and the hit sequence on top of this.
export type {
  ActiveClock,
  AllocatedStats,
  CheckInRejectReason,
  ClassChooseRejectReason,
  FromPersistedRejectReason,
  PersistedSession,
  PlayerState,
  RawSample,
  RunBag,
  RunState,
  RunStatus,
  RunSummary,
  SessionConfig,
  SessionDungeonRecord,
  SessionEvent,
  SessionInput,
  SessionParams,
  SessionState,
  UsePotionRejectReason,
} from './types';
export {
  EMPTY_BAG,
  InvalidSessionInputError,
  UnsupportedConfigError,
  ZERO_ALLOCATED,
  bagAdd,
  bagRemoveOne,
  clockStart,
  clockStop,
  createPlayer,
  hpConfigInputOf,
  tauOf,
} from './types';
// Re-exported so `apps/client` (which may only import `@keep-walking/shared/session`, ADR 0003
// 3.3) can name the HP shapes embedded in `PlayerState`/`RunState` without reaching into `hp`
// directly.
export type { PlayerClass, PlayerHpState, RunHpState } from '../hp';
export { createSession, purgeLocationData, sessionStep } from './reducer';
export type { FromPersistedResult } from './persistence';
export { fromPersisted, toPersisted } from './persistence';
export type { CheckInPreview, OpeningView, PlayerView, RunView } from './selectors';
export {
  selectCanClearLocalData,
  selectCheckInPreview,
  selectOpening,
  selectPlayerView,
  selectRunView,
  selectSummary,
} from './selectors';
