// P2-X38 black-box e2e for S-23-privacy's withdraw-consent sequence (docs/tech/
// F06-hp-damage-onboarding.md section 8.4, R48 items 1-3): withdrawing during an active run ends
// it immediately as `manual_exit` (F05-R21: every item collected so far is kept, same as tapping
// "ออก" myself), `kw.p2.consent` becomes `withdrawn`, and `kw.p2.session` carries no coordinate.
//
// `e2eClassId=tanker` + `e2eSkipOnboarding=1` (D-130): this spec is about the withdraw sequence
// itself, not the onboarding/consent screens (`onboarding.spec.ts` already drives those for real) —
// consent is pre-seeded `granted` via `addInitScript` (localStorage), the same way a returning,
// already-onboarded player's browser already has it, so `S-23-privacy` shows the withdraw button
// (not the re-consent one) from the very first frame.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { copyEntries } from '@keep-walking/shared';

// Same approach as `onboarding.spec.ts`/`map-shell.spec.ts`: read the real copy.th.json by path
// rather than hardcoding Thai text in this spec (CLAUDE.md, studio/protocol.md).
const COPY_TH_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'config',
  'content',
  'copy.th.json',
);
const copyIndex = copyEntries(JSON.parse(readFileSync(COPY_TH_PATH, 'utf8')) as unknown);
function getCopyText(key: string): string {
  return copyIndex.get(key)?.text ?? key;
}

const START = '2026-10-02T12:00';
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

async function seedGrantedConsent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'kw.p2.consent',
      JSON.stringify({ schemaVersion: 1, savedAt_ms: 0, state: { location: 'granted' } }),
    );
  });
}

test.describe('S-23-privacy — withdraw consent', () => {
  test('withdrawing during an active run ends it as manual_exit, keeps every item, writes withdrawn, purges the session sample', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await seedGrantedConsent(page);
    // P2-F06-T14: this spec inspects the run screen right after `dungeon_entered` — force Wake
    // Lock unsupported so the pocket screen's own dark overlay never covers it (same fix as
    // `full-run.spec.ts`/`onboarding.spec.ts`).
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });

    await page.goto(FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 5_000 });

    await page.evaluate(() => {
      window.location.hash = '#/settings/privacy';
    });
    const privacyScreen = page.locator('.privacy-screen');
    await expect(privacyScreen).not.toBeHidden();
    await expect(privacyScreen.locator('.privacy-withdraw-button')).toBeVisible();

    await privacyScreen.locator('.privacy-withdraw-button').click();
    const confirmOverlay = privacyScreen.locator('.popup-overlay');
    await expect(confirmOverlay).not.toBeHidden();
    // A run is active: the popup must show the during-run note (R48/B-06).
    await expect(confirmOverlay.locator('.privacy-withdraw-during-run-note')).not.toBeHidden();
    await confirmOverlay.locator('.btn-danger-confirm').click();

    // manual_exit, every item kept (F05-R21) — the exact same header/rewards a plain exit-button
    // tap produces (tech note 8.4: "ผลเท่ากับกดปุ่มออก ณ วินาทีนั้น").
    const summary = page.locator('.run-summary');
    await expect(summary).not.toBeHidden({ timeout: 10_000 });
    await expect(summary.locator('.run-summary-header')).toHaveText(
      getCopyText('run.summary.exited'),
    );
    await expect(summary.locator('.run-summary-rewards')).not.toContainText(
      getCopyText('run.summaryRewardLost'),
    );

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kw.p2.consent')))
      .toContain('"withdrawn"');
    const session = await page.evaluate(() => window.localStorage.getItem('kw.p2.session'));
    expect(session).not.toBeNull();
    expect(session ?? '').not.toContain('"lat"');
    expect(session ?? '').not.toContain('"lng"');
  });

  test('withdrawing with no active run goes straight to the unknown home state, no popup note', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await seedGrantedConsent(page);
    await page.goto(FIXTURE_URL);

    // Never enter a dungeon this time -- close the confirm popup path entirely by going straight
    // to settings before any `dungeon_entered`.
    await page.evaluate(() => {
      window.location.hash = '#/settings/privacy';
    });
    const privacyScreen = page.locator('.privacy-screen');
    await expect(privacyScreen).not.toBeHidden();
    await privacyScreen.locator('.privacy-withdraw-button').click();
    const confirmOverlay = privacyScreen.locator('.popup-overlay');
    await expect(confirmOverlay).not.toBeHidden();
    await expect(confirmOverlay.locator('.privacy-withdraw-during-run-note')).toBeHidden();
    await confirmOverlay.locator('.btn-danger-confirm').click();

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kw.p2.consent')))
      .toContain('"withdrawn"');
    // Leaves the settings route entirely (tech note 8.4 step 5) -- the home panel takes over,
    // now reading `unknown` since consent is withdrawn.
    await expect(page.locator('.privacy-screen')).toBeHidden({ timeout: 5_000 });
  });
});
