/**
 * Pure view models for the run screen (F04 flow section 6, components.md 13.2): run-state pill,
 * tick timer label, and the exit_reason -> summary-header mapping (section 7). No DOM.
 */
import type { RunStatus, RunSummary } from '@keep-walking/shared/session';

export interface RunStatePillView {
  readonly labelKey: string;
  /** `banner.info` (Grace) or `banner.warn` (Suspended) copy key, or `undefined` (Active: no banner). */
  readonly bannerKey: string | undefined;
  /** Never `state.danger` for any run status (F04 flow section 6: leaving a zone is not a fault). */
  readonly tone: 'success' | 'info';
}

const RUN_STATE_PILL: Readonly<Record<RunStatus, RunStatePillView>> = {
  active: { labelKey: 'run.stateActiveLabel', bannerKey: undefined, tone: 'success' },
  grace: { labelKey: 'run.stateGraceLabel', bannerKey: 'run.stateGrace', tone: 'info' },
  suspended: { labelKey: 'run.stateSuspendedLabel', bannerKey: 'run.stateSuspended', tone: 'info' },
};

export function runStatePillView(status: RunStatus): RunStatePillView {
  return RUN_STATE_PILL[status];
}

/** Active shows the live countdown (`run.tickTimer`); Grace/Suspended show the paused label
 * (F04 flow N-11: never a client-computed reward decision, only display). */
export function tickTimerCopyKey(status: RunStatus): string {
  return status === 'active' ? 'run.tickTimer' : 'run.tickPausedLabel';
}

/** F04 flow section 7: one summary header copy key per `exit_reason`. */
const EXIT_REASON_SUMMARY_KEY: Readonly<Record<RunSummary['exitReason'], string>> = {
  manual_exit: 'run.summary.exited',
  dungeon_closed: 'run.summary.dungeonClosed',
  timeout: 'run.summary.timeout',
  death: 'run.summary.died',
  auto_retreat: 'run.summary.autoRetreated',
  clock_invalid: 'run.summary.clockInvalid',
  emergency_close: 'run.summary.closedByModerator',
};

export function runSummaryHeaderKey(exitReason: RunSummary['exitReason']): string {
  return EXIT_REASON_SUMMARY_KEY[exitReason];
}

/** Speed-lock overlay button set (F04 flow D1, GD B-03, components.md 13.4): settings-only before
 * any run exists, settings + exit once a run is active/grace/suspended. Never a "dismiss"/"close"
 * button (R21/R23: the overlay only ever leaves through a real unlock). */
export type SpeedLockButton = 'settings' | 'exit';

export function speedLockButtons(hasRun: boolean): readonly SpeedLockButton[] {
  return hasRun ? ['settings', 'exit'] : ['settings'];
}
