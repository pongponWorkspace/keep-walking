/**
 * Check-in preview (F04 flow B-01, tech note F04 section 7.4 `selectCheckInPreview`): the popup
 * must show the real check-in status from its *first frame*, before the player ever taps "เข้า".
 *
 * `@keep-walking/shared/session` does not export a `selectCheckInPreview` selector yet (tech note
 * F04 section 2.6; still landing in P2-X10 alongside backdating/opening-hours/persistence — see
 * this task's REPORT). Rather than re-implement `checkInDecision` here (banned: apps/client may
 * only call `sessionStep`, never `@keep-walking/shared/run` directly, ADR 0003 section 3, enforced
 * by eslint), this module gets the identical answer through the *real* entry point: it calls
 * `sessionStep` with a speculative `confirm` input and reads back the `checkin_rejected` /
 * `dungeon_entered` event it produces, then **discards the returned state** — the caller's real
 * state never advances from a preview call. Because it is the same `sessionStep` a real "เข้า" tap
 * uses, the two can never drift apart (CLAUDE.md "never fork the logic").
 *
 * Replace this file with the real selector once P2-X10 lands (clearly-named adapter, per this
 * task's brief).
 */
import { sessionStep } from '@keep-walking/shared/session';
import type {
  CheckInRejectReason,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';

export type CheckInPreview =
  | { readonly ready: true }
  | { readonly ready: false; readonly reason: CheckInRejectReason };

/** Speculatively tries `confirm` for `dungeonId` against `state` at `now_ms`, without mutating the
 * caller's real session state. Safe to call every render (pure; no telemetry side effect belongs
 * to this function — callers must not forward its events to the telemetry sink). */
export function previewCheckIn(
  state: SessionState,
  dungeonId: string,
  runSeed: number,
  now_ms: number,
  params: SessionParams,
): CheckInPreview {
  const { events } = sessionStep(state, { type: 'confirm', dungeonId, runSeed }, now_ms, params);
  for (const event of events) {
    if (event.type === 'dungeon_entered' && event.dungeonId === dungeonId) {
      return { ready: true };
    }
    if (event.type === 'checkin_rejected' && event.dungeonId === dungeonId) {
      return { ready: false, reason: event.reason };
    }
  }
  // No decision event at all (e.g. already in another run, R01): treat as not ready with the
  // closest-matching reason so the UI always has something honest to show.
  return { ready: false, reason: 'no_approach_from_outside' };
}
