/**
 * Pure view model for the check-in status row (F04 flow section 4, GD B-03, components.md 13.3):
 * turns a `CheckInPreview` (`session/checkin-preview.ts`) into the one copy key + icon this frame
 * shows. No DOM here — `ui/dungeon-confirm.ts` renders it; this file is unit-testable on its own.
 *
 * Countdown gap (see this task's REPORT): `product/telemetry-events.md`/`session`'s
 * `checkin_rejected` event carries no `readyIn_s` yet, so the live mm:ss countdown of
 * `dungeon.checkinNotEnoughTrace`'s `{countdown}` cannot be filled in from the public `session`
 * contract today — shown without a countdown until that field is added (handoff: backend-programmer).
 */
import type { CheckInRejectReason } from '@keep-walking/shared/session';
import type { CheckInPreview } from '../session/checkin-preview';

export interface CheckInStatusView {
  readonly copyKey: string;
  /** `true` only for `not_enough_trace` — the caller fills `{countdown}` when it has a value. */
  readonly hasCountdown: boolean;
}

const REASON_COPY_KEY: Readonly<Record<CheckInRejectReason, string>> = {
  speed_lock: 'dungeon.checkinSpeedLocked',
  poor_accuracy: 'dungeon.checkinPoorAccuracy',
  not_enough_trace: 'dungeon.checkinNotEnoughTrace',
  no_approach_from_outside: 'dungeon.checkinNoApproach',
  dungeon_closed: 'dungeon.closedTitle',
  run_active: 'dungeon.alreadyActive',
  unsupported_mode: 'dungeon.closedEmergencyBody',
};

/** F04 flow B5 / B-07: `no_approach_from_outside` shown as "out of range" instead, only when the
 * client's own geo check confirms the latest sample is outside the selected polygon right now
 * (not merely "the approach sequence is not complete yet" while standing inside). */
export function checkInStatusView(
  preview: CheckInPreview,
  isOutOfRangeNow: boolean,
): CheckInStatusView {
  if (preview.ready) {
    throw new Error('checkInStatusView: no status row when check-in preview is ready');
  }
  if (preview.reason === 'no_approach_from_outside' && isOutOfRangeNow) {
    return { copyKey: 'dungeon.outOfRangeTitle', hasCountdown: false };
  }
  return {
    copyKey: REASON_COPY_KEY[preview.reason],
    hasCountdown: preview.reason === 'not_enough_trace',
  };
}
