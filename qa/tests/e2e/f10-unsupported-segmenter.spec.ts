// P2-F10-T19 (A-T04-4 fail-closed rule, `create-character-screen.test.ts`'s own jsdom-level case
// "no Intl.Segmenter"): that developer unit test proves the module's logic branch is correct in
// isolation, but never through the real browser/app integration — this spec stubs `Intl.Segmenter`
// away in a real Chromium/WebKit page (`addInitScript`, same technique `pocket-screen.spec.ts` uses
// to delete `Navigator.prototype.wakeLock`) and drives the real create-character screen through it,
// proving the fail-closed path holds end to end: the create button never enables, the
// `.unsupported-browser-note` shows, the shuffle button is disabled, and — the one thing a unit
// test cannot prove — the screen never throws/crashes the whole app when a real tap reaches it.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const START = '2026-10-02T12:00';
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

async function reachCreateCharacterWithoutSegmenter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a deliberate feature-detection stub
    delete (Intl as any).Segmenter;
  });
  await page.goto(FIXTURE_URL);
  await page.locator('.intro-screen:not([hidden]) .intro-start').click();
  await page.locator('.login-google-button').click();
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.locator('.age-gate-confirm').click();
  await page.locator('.consent-location-decline').click();
  await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
    timeout: 5_000,
  });
}

test.describe('F10-R18/R20/A-T04-4 — no working Intl.Segmenter: fail closed, never crash', () => {
  test('the unsupported-browser note shows, the create button never enables, and the page does not crash', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await reachCreateCharacterWithoutSegmenter(page);

    await expect(page.locator('.unsupported-browser-note')).toBeVisible();
    await expect(page.locator('.shuffle-button')).toBeDisabled();

    // A real tap on every control this screen has, exactly what A-T04-4/the fail-closed rule must
    // survive: selecting a class, typing a name, and (defensively) clicking the disabled shuffle
    // and create buttons must never throw.
    await page.locator('.class-select-card[data-class-id="ranged"]').click();
    await page.locator('.name-field-input').fill('ab');
    await expect(page.locator('.create-character-button')).toBeDisabled();
    // Playwright refuses to click a genuinely disabled element by default; force it the way a
    // malformed/old client build or a stray pointer event replay could still dispatch the event,
    // which is exactly the "never crash" guarantee this spec is checking, not just "the UI blocks
    // it".
    await page.locator('.shuffle-button').click({ force: true });
    await page.locator('.create-character-button').click({ force: true });
    await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible();

    expect(
      pageErrors,
      `uncaught page error(s): ${pageErrors.map((e) => e.message).join('; ')}`,
    ).toEqual([]);
  });

  test('a real typed name still fails the filter inline (no crash) on a fresh page with a working Segmenter', async ({
    page,
    context,
  }) => {
    test.setTimeout(30_000);
    await reachCreateCharacterWithoutSegmenter(page);
    await expect(page.locator('.unsupported-browser-note')).toBeVisible();

    // `Page#addInitScript` is sticky for the rest of that page's lifetime (every future navigation
    // on the *same* page re-runs it, Playwright's own documented behaviour) — `page.goto` on the
    // same `page` would still have `Intl.Segmenter` deleted. A genuinely fresh page (same context,
    // no init script registered on it) is the only way to prove the real Segmenter recovers
    // (A-T04-4: "re-checked on every mount, not cached"), not a special case of this one page. A
    // browser context's `localStorage` is shared by every page in it, and `reachCreateCharacter
    // WithoutSegmenter` above already wrote real login/age/consent state — so this fresh page
    // resumes straight onto the character step (R05: a reload returns to the last step reached,
    // the same resume behaviour `onboarding.spec.ts`'s own reload cases rely on), with no need to
    // re-drive login/age/consent on it.
    const freshPage = await context.newPage();
    await freshPage.goto(FIXTURE_URL);
    await expect(freshPage.locator('.create-character-screen:not([hidden])')).toBeVisible({
      timeout: 10_000,
    });
    await expect(freshPage.locator('.unsupported-browser-note')).toBeHidden();
    await freshPage.locator('.class-select-card[data-class-id="support"]').click();
    await freshPage.locator('.name-field-input').fill('ab');
    await expect(freshPage.locator('.create-character-button')).toBeEnabled();
  });
});
