/**
 * The withdraw-location-consent sequence (`docs/tech/F06-hp-damage-onboarding.md` section 8.4, R48
 * items 1-3, H-E25, B-06, J-P2-T30-1, D-116) — this is exactly the file that tech note proposes
 * (`apps/client/src/privacy/withdraw-consent.ts`). There is no `withdrawConsent` `SessionInput`;
 * this module composes the real sequence in one call site out of small, already-existing pieces
 * (`f04-app.ts` wires every `deps` field below to the real engine/provider/storage it already owns),
 * so `f04-app.test.ts`/this module's own test can prove the ordering with plain spies.
 *
 * Steps (tech note 8.4, numbered exactly the same way, no `await` between them):
 * 1. Flag first (`deps.setLocationWithdrawn`) — any `LocationProvider` sample callback already
 *    queued before this call must still land on `f04-app.ts#onSample`'s own early-return guard.
 * 2. If a run is active: end it via the caller's own `exit` dispatch path (`manual_exit`, F05-R21 —
 *    the caller's `deps.exitRun` is expected to be the exact same `dispatch`+`handleSessionEvents`
 *    call site a normal exit-button tap uses, never a second/forked implementation).
 * 3. `deps.stopLocationProvider()` (`LocationProvider#stop()`) — releasing the run's own wake lock
 *    is already covered by step 2's `dungeon_exited` handling (`f04-app.ts`'s own
 *    `wakeLockController.stop()` call site), not repeated here.
 * 4. `deps.purgeLocation()` (`SessionEngine#purgeLocation`, persists `kw.p2.session`), then
 *    `deps.writeConsentWithdrawn()` (`kw.p2.consent = withdrawn`), then the `location_consent_
 *    withdrawn` telemetry event, `{ during_run }` — in that order, matching the tech note's own
 *    reasoning for why `session` is written before `consent`.
 * 5/6. Left entirely to the caller's normal `render()` pass right after this returns: `state.
 *    lastSummary` (if a run just ended) or the home panel's `unknown` state (via
 *    `readLocationConsent`/`locationConsentGranted` now reading `withdrawn`) already produce the
 *    right screen with no special-casing here.
 */

export interface WithdrawConsentDeps {
  readonly hasActiveRun: () => boolean;
  /** The exact same `dispatch({type:'exit'}, now_ms)` + `handleSessionEvents(...)` call site a
   * normal exit-button tap uses (CLAUDE.md "never fork the logic") — called only when
   * `hasActiveRun()` is `true`. */
  readonly exitRun: (now_ms: number) => void;
  readonly stopLocationProvider: () => void;
  readonly purgeLocation: () => void;
  readonly writeConsentWithdrawn: () => void;
  readonly setLocationWithdrawn: () => void;
  readonly record: (
    name: string,
    properties: Readonly<Record<string, unknown>>,
    atMs?: number,
  ) => void;
  readonly now: () => number;
}

/** Runs the full sequence once. Returns whether a run was active (the same value the telemetry
 * event's own `during_run` property carries), for a caller that wants to branch its own post-call
 * UI (e.g. `f04-app.ts` re-rendering) without re-deriving it.
 *
 * BUG-P2-006: `atMs` is read exactly once and reused for both `exitRun` (so the paired
 * `dungeon_exited{exit_reason: manual_exit}` carries it as its `at_ms`) and
 * `record('location_consent_withdrawn', ...)` below — `product/telemetry-events.md`'s "เวลาเดียวกัน
 * เสมอ" promise between the two needs a single captured instant, not two independent clock reads a
 * moment apart. */
export function withdrawConsent(deps: WithdrawConsentDeps): boolean {
  deps.setLocationWithdrawn();
  const atMs = deps.now();
  const duringRun = deps.hasActiveRun();
  if (duringRun) {
    deps.exitRun(atMs);
  }
  deps.stopLocationProvider();
  deps.purgeLocation();
  deps.writeConsentWithdrawn();
  deps.record('location_consent_withdrawn', { during_run: duringRun }, atMs);
  return duringRun;
}
