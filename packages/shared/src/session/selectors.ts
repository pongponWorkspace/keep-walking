// Read-only selectors (tech note F04 2.6): display only. The reward/run/tick decision always
// comes from `sessionStep`, never from these; Phase 3 replaces the client-side call sites with
// data from the server (tech gate F08).
import { MS_PER_S, pointInPolygon } from '@keep-walking/geo';
import {
  NotImplementedError,
  UnknownVerificationModeError,
  isOpenAt,
  openingChangeAfter,
  selectPresenceStrategy,
} from '../run';
import type { CheckInContext } from '../run';
import { InvalidSessionInputError, tauOf } from './types';
import type {
  CheckInRejectReason,
  RunStatus,
  RunSummary,
  SessionParams,
  SessionState,
} from './types';

export interface RunView {
  readonly status: RunStatus;
  readonly locked: boolean;
  /** A presence return/lock-unlock (or a left/lock-enter) hysteresis set is awaiting confirmation. */
  readonly pendingTransition: boolean;
  readonly windowElapsed_s: number;
  /** `null` while the window clock is stopped (F05 R04b: no ticking countdown to show). */
  readonly nextTickIn_s: number | null;
  readonly windowWalkedEnough: boolean;
  readonly outsideElapsed_s: number | null;
  readonly graceRemaining_s: number | null;
  readonly suspendedRemaining_s: number | null;
  readonly closesIn_s: number | null;
}

export function selectRunView(
  state: SessionState,
  now_ms: number,
  params: SessionParams,
): RunView | null {
  const run = state.run;
  if (run === null) return null;
  const window_ms = params.config.rewardTick.rewardTickInterval_s * MS_PER_S;
  const running = run.clock.runningSince_ms !== null;
  const tau_ms = tauOf(run.clock, now_ms);
  const windowElapsed_ms = Math.max(0, tau_ms - run.reward.k * window_ms);
  const outsideElapsed_ms = run.exitStartedAt_ms === null ? null : now_ms - run.exitStartedAt_ms;
  const graceMax_ms = params.config.runState.graceMax_s * MS_PER_S;
  const suspendedMax_ms = params.config.runState.suspendedMax_s * MS_PER_S;
  return {
    status: run.status,
    locked: state.lock.locked,
    pendingTransition: run.presence.geo.pendingSince_t_ms !== null || state.lock.runStart_ms !== null,
    windowElapsed_s: Math.round(windowElapsed_ms / MS_PER_S),
    nextTickIn_s: running ? Math.max(0, Math.round((window_ms - windowElapsed_ms) / MS_PER_S)) : null,
    windowWalkedEnough: run.reward.distance_m > params.config.movementGate.minDistancePerWindow_m,
    outsideElapsed_s: outsideElapsed_ms === null ? null : Math.round(outsideElapsed_ms / MS_PER_S),
    graceRemaining_s:
      run.status !== 'grace' || outsideElapsed_ms === null
        ? null
        : Math.max(0, Math.round((graceMax_ms - outsideElapsed_ms) / MS_PER_S)),
    suspendedRemaining_s:
      run.status !== 'suspended' || outsideElapsed_ms === null
        ? null
        : Math.max(0, Math.round((suspendedMax_ms - outsideElapsed_ms) / MS_PER_S)),
    closesIn_s: run.closesAt_ms === null ? null : Math.max(0, Math.round((run.closesAt_ms - now_ms) / MS_PER_S)),
  };
}

export type CheckInPreview =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: CheckInRejectReason; readonly readyIn_s: number | null };

/** Same decision `confirm` (tech note F04 7.4) will make, without side effects (R09). */
export function selectCheckInPreview(
  state: SessionState,
  dungeonId: string,
  now_ms: number,
  params: SessionParams,
): CheckInPreview {
  const record = params.dungeons[dungeonId];
  if (record === undefined) throw new InvalidSessionInputError(`unknown dungeonId "${dungeonId}"`);
  if (state.run !== null) return { ok: false, reason: 'run_active', readyIn_s: null };
  if (!isOpenAt(record.opening_hours, params.config.openingHours.utcOffset_min, now_ms)) {
    return { ok: false, reason: 'dungeon_closed', readyIn_s: null };
  }
  let strategy;
  try {
    if (record.floor_level !== null) throw new UnknownVerificationModeError('floor_level');
    strategy = selectPresenceStrategy(record.verification_mode);
  } catch (e) {
    if (e instanceof NotImplementedError || e instanceof UnknownVerificationModeError) {
      return { ok: false, reason: 'unsupported_mode', readyIn_s: null };
    }
    throw e;
  }
  const latest = state.latestSample;
  const ctx: CheckInContext = {
    approach: state.pre,
    latest:
      latest === null
        ? null
        : { t_ms: latest.t_ms, accuracy_m: latest.accuracy_m, inside: pointInPolygon(latest, record.geometry) },
    locked: state.lock.locked,
    dungeonId,
  };
  return strategy.checkIn(ctx, params.config.checkIn);
}

export interface OpeningView {
  readonly open: boolean;
  readonly changesAt_ms: number | null;
  readonly closingSoon: boolean;
}

/** Map/popup/close-panel display (R27, R28, R31, R38): `closingSoon` uses the same
 * `closingSoonNotice_s` window as the in-run notice (tech note F04 8.3), just without a run's own
 * `startedAt_ms` floor (there is no run yet). */
export function selectOpening(dungeonId: string, now_ms: number, params: SessionParams): OpeningView {
  const record = params.dungeons[dungeonId];
  if (record === undefined) throw new InvalidSessionInputError(`unknown dungeonId "${dungeonId}"`);
  const utcOffset_min = params.config.openingHours.utcOffset_min;
  const open = isOpenAt(record.opening_hours, utcOffset_min, now_ms);
  const changesAt_ms = openingChangeAfter(record.opening_hours, utcOffset_min, now_ms);
  const closingSoon =
    open &&
    changesAt_ms !== null &&
    changesAt_ms - now_ms <= params.config.openingHours.closingSoonNotice_s * MS_PER_S;
  return { open, changesAt_ms, closingSoon };
}

export function selectSummary(state: SessionState): RunSummary | null {
  return state.lastSummary;
}

/** "ลบข้อมูลในเครื่อง" (tech note F06 8.3, R49, C2-6): the button is disabled while a run is open
 * so a clear never races an in-progress run's own coordinate-bearing state. An unclosed
 * `lastSummary` does not block it. */
export function selectCanClearLocalData(state: SessionState): boolean {
  return state.run === null;
}
