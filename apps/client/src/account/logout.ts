/**
 * The settings menu's "ออกจากระบบ" confirm sequence (tech note docs/tech/F10-account-shell.md
 * section 4.3, R41/R42, D-152/D-158) — composed the same way `privacy/withdraw-consent.ts` composes
 * its own sequence out of small, already-existing pieces, so `f04-app.ts`'s own wiring stays thin
 * and this module's ordering is directly testable with plain spies.
 *
 * Unlike `withdrawConsent`, every step here is conditional on a run actually being active (tech
 * note section 4.3 item 2: "ถ้า state.run !== null: ใช้ลำดับ F06 8.4 ข้อ 1-3 ทุกประการ ... ไม่ทำข้อ
 * 4") — logging out with no run in progress touches nothing but the account flag itself (`signOut`
 * below), never stops the `LocationProvider` (flow F10 Flow F3's "ไม่มี run" bullet never mentions
 * it, only the "มี run" bullet says "หยุดขอตำแหน่งทันที"); item 5's "LocationProvider เริ่มใหม่" on
 * the next login only makes sense for the run-was-active case where it was actually stopped here.
 *
 * Steps when a run is active (tech note 4.3 item 2, no `await` between them):
 * 1. Drop any already-queued `LocationProvider` sample (`deps.dropQueuedSamples`) — the same
 *    `locationWithdrawn`-style flag `f04-app.ts#onSample` already checks, reused rather than a
 *    second one (tech note's own "ธง locationWithdrawn-แบบเดียวกัน").
 * 2. End the run via the caller's own `exit` dispatch path (`manual_exit`, never a forked
 *    implementation — the exact same `deps.exitRun` shape `withdrawConsent` already asks for).
 * 3. `deps.stopLocationProvider()` — releasing the run's own wake lock is already covered by step
 *    2's `dungeon_exited` handling (`f04-app.ts`'s own `wakeLockController.stop()` call site), not
 *    repeated here, matching `withdrawConsent`'s own note for the same reason.
 *
 * Then, always: `deps.signOut()` (`OnboardingFlow#logout`, flips `signedIn` to `false` only — never
 * `purgeLocation`/`writeConsentWithdrawn`, item 2's own "ไม่ทำข้อ 4": this is not a consent
 * withdrawal, R41) and the `account_logout` telemetry event with `{ during_run }`. The caller's own
 * `render()` pass right after this returns shows whatever comes next (the run summary if a run just
 * ended, or straight to the login step otherwise) — no special-casing here, the same division of
 * labour `withdrawConsent`'s own doc comment describes for steps 5/6.
 */

export interface LogoutDeps {
  readonly hasActiveRun: () => boolean;
  /** The exact same `dispatch({type:'exit'}, now_ms)` + `handleSessionEvents(...)` call site a
   * normal exit-button tap uses (CLAUDE.md "never fork the logic") — called only when
   * `hasActiveRun()` is `true`. */
  readonly exitRun: (now_ms: number) => void;
  readonly stopLocationProvider: () => void;
  readonly dropQueuedSamples: () => void;
  /** `OnboardingFlow#logout()` — writes `kw.p2.account.state.signedIn = false` and refreshes the
   * flow's own in-memory copy (this module never touches `kw.p2.account` directly). */
  readonly signOut: () => void;
  readonly record: (name: string, properties: Readonly<Record<string, unknown>>) => void;
  readonly now: () => number;
}

/** Runs the full sequence once. Returns whether a run was active (the same value the telemetry
 * event's own `during_run` property carries), for a caller that wants to branch its own post-call
 * UI without re-deriving it (`withdrawConsent`'s own return-value convention). */
export function logout(deps: LogoutDeps): boolean {
  const duringRun = deps.hasActiveRun();
  if (duringRun) {
    deps.dropQueuedSamples();
    deps.exitRun(deps.now());
    deps.stopLocationProvider();
  }
  deps.signOut();
  deps.record('account_logout', { during_run: duringRun });
  return duringRun;
}
