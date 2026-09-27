/**
 * Pure view model for the check-in status row (F04 flow section 4, GD B-03, components.md 13.3):
 * turns a `CheckInPreview` (`selectCheckInPreview`, `@keep-walking/shared/session`) into the one
 * copy key + optional mm:ss countdown this frame shows. No DOM here — `ui/dungeon-confirm.ts`
 * renders it; this file is unit-testable on its own.
 */
import type { CheckInPreview, CheckInRejectReason } from '@keep-walking/shared/session';

export interface CheckInStatusView {
  readonly copyKey: string;
  /** mm:ss, `{countdown}` for `dungeon.checkinNotEnoughTrace` (copy.th.json `_variables.countdown`)
   * — only set for `not_enough_trace` with a known `readyIn_s` (P2-F06-T06 in progress may still
   * send `null`, same "no countdown" fallback as before this task, honestly labelled by omission
   * rather than a guessed number). */
  readonly countdownText: string | undefined;
}

const REASON_COPY_KEY: Readonly<Record<CheckInRejectReason, string>> = {
  speed_lock: 'dungeon.checkinSpeedLocked',
  poor_accuracy: 'dungeon.checkinPoorAccuracy',
  not_enough_trace: 'dungeon.checkinNotEnoughTrace',
  no_approach_from_outside: 'dungeon.checkinNoApproach',
  dungeon_closed: 'dungeon.closedTitle',
  run_active: 'dungeon.alreadyActive',
  unsupported_mode: 'dungeon.closedEmergencyBody',
  // F06 6.3 (P2-F06-T06, D-114): fail-closed reasons that should not occur on the normal path (the
  // class sheet runs before the map, HP recovery starts the instant it hits 0). No copy key exists
  // for either yet (handoff: narrative-designer) — `getCopyText`'s own "unknown key -> show the key
  // itself" fallback (TL-N06) keeps this honest rather than inventing Thai text (CLAUDE.md).
  no_class: 'dungeon.checkinNoClass',
  no_hp: 'dungeon.checkinNoHp',
};

const SECONDS_PER_MINUTE = 60;

/** mm:ss, clamped at `00:00` rather than negative (T27 N-03: the engine may still not have granted
 * check-in even once the countdown reaches zero — never implies the button opens on its own). */
export function formatCountdown(readyIn_s: number): string {
  const clamped_s = Math.max(0, Math.round(readyIn_s));
  const minutes = Math.floor(clamped_s / SECONDS_PER_MINUTE);
  const seconds = clamped_s % SECONDS_PER_MINUTE;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** F04 flow B5 / B-07: `no_approach_from_outside` shown as "out of range" instead, only when the
 * client's own geo check confirms the latest sample is outside the selected polygon right now
 * (not merely "the approach sequence is not complete yet" while standing inside). */
export function checkInStatusView(
  preview: CheckInPreview,
  isOutOfRangeNow: boolean,
): CheckInStatusView {
  if (preview.ok) {
    throw new Error('checkInStatusView: no status row when check-in preview is ready');
  }
  if (preview.reason === 'no_approach_from_outside' && isOutOfRangeNow) {
    return { copyKey: 'dungeon.outOfRangeTitle', countdownText: undefined };
  }
  if (preview.reason === 'not_enough_trace') {
    // C-06 (copy gate P2-X37): `readyIn_s === null` means the approach chain has not started yet
    // (`packages/shared/src/run/check-in.ts`) — `dungeon.checkinNotEnoughTraceWaiting` has no
    // `{countdown}` placeholder at all, rather than showing the normal key with a raw `{countdown}`
    // left unfilled.
    if (preview.readyIn_s === null) {
      return { copyKey: 'dungeon.checkinNotEnoughTraceWaiting', countdownText: undefined };
    }
    return {
      copyKey: 'dungeon.checkinNotEnoughTrace',
      countdownText: formatCountdown(preview.readyIn_s),
    };
  }
  return { copyKey: REASON_COPY_KEY[preview.reason], countdownText: undefined };
}
