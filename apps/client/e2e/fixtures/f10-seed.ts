// `seedLegacyPlayer` (tech note docs/tech/F10-account-shell.md section 9.2, A-P2-F10-T08-2): puts a
// page into the exact storage shape of "a player who finished F06's onboarding before F10 ever
// shipped" — intro/age/consent already passed, location consent already granted, optionally a real
// `player.classId` already set (through a real `chooseClass` dispatch, never a hand-typed
// `kw.p2.session` envelope), and crucially *no* `kw.p2.account`/`kw.p2.character` key at all. A
// fresh load of the returned page (no `e2eSkipOnboarding`) must land on `.login-screen` (or the run
// screen first, if `pendingRun`) — that assertion is each call site's own job, not this helper's.
import type { Page } from '@playwright/test';

export interface SeedLegacyPlayerOptions {
  /** `true`: the legacy player already chose a class (reached through a real
   * `?e2eClassId=tanker` dispatch, `kw.p2.session` ends up with a real engine-written class) —
   * migration must show that class locked once T15's create-character screen exists. `false`: a
   * legacy player who passed consent but never got as far as picking a class (no `kw.p2.session`
   * key at all). */
  readonly withClass: boolean;
  /** `true`: walks the same fixture trace `full-run.spec.ts` uses far enough to open a run before
   * the migration-shaping storage write below — proves a run in progress always wins over
   * migration (tech note section 5 row 3, F10-R31/A12). Only meaningful together with
   * `withClass: true` (no run can start with no class, D-120 `no_class`). */
  readonly pendingRun?: boolean;
}

const WITH_CLASS_URL = '/?loc=mock&e2eSkipOnboarding=1&e2eClassId=tanker';
// Same fixture/start pin `full-run.spec.ts` uses to get a run open quickly and deterministically —
// see that spec's own doc comment for why `start` matters (the dungeon's own daily open hours).
const PENDING_RUN_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent('2026-10-02T12:00')}`;

export async function seedLegacyPlayer(
  page: Page,
  options: SeedLegacyPlayerOptions,
): Promise<void> {
  if (options.withClass) {
    if (options.pendingRun === true) {
      await page.goto(PENDING_RUN_URL);
      const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
      await enterButton.waitFor({ state: 'visible', timeout: 20_000 });
      await enterButton.click();
      await page.locator('.run-bar:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
    } else {
      await page.goto(WITH_CLASS_URL);
      await page.waitForFunction(() => window.localStorage.getItem('kw.p2.session') !== null);
    }
  }
  // Step 2 (tech note 9.2): overwrite the onboarding/consent shape to "F06-only, pre-F10" and drop
  // whatever `e2eSkipOnboarding` itself may have written for `kw.p2.account`/`kw.p2.character` —
  // every other key (`kw.p2.session`, inventory, HP, `lastSummary`) is left exactly as the real
  // engine wrote it (R45 — the caller's own assertion, this helper never touches those keys).
  await page.evaluate(() => {
    window.localStorage.removeItem('kw.p2.account');
    window.localStorage.removeItem('kw.p2.character');
    window.localStorage.setItem(
      'kw.p2.onboarding',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 0,
        state: {
          schemaVersion: 1,
          introSeen: true,
          ageGatePassed: true,
          consentAnswered: true,
          firstOpenAt_ms: 0,
        },
      }),
    );
    window.localStorage.setItem(
      'kw.p2.consent',
      JSON.stringify({ schemaVersion: 1, savedAt_ms: 0, state: { location: 'granted' } }),
    );
  });
}
