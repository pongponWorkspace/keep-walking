// P2-F10-T19 (test plan §3.1 TC-F10-FLOW-13/-14/-15, A-E16/A-E17/A-E18, R06): `nav/routes.ts#
// resolveRoute` has its own pure unit test (`apps/client/src/nav/routes.test.ts`, gameplay-owned,
// not duplicated here), but no e2e before this task ever drove a real `#/...` hash into the real
// running app mid-onboarding — this proves the guard holds end to end through the real router glue
// in `f04-app.ts`, not just the pure function in isolation.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const START = '2026-10-02T12:00';
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

const HOME_FIXTURE_URL =
  '/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

async function setHash(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
}

test.describe('TC-F10-FLOW-13/A-E16 — a deep link before shell-ready never reaches its target', () => {
  test('fresh install, #/inventory before any tap: the intro screen shows, not inventory', async ({
    page,
  }) => {
    await page.goto(`${FIXTURE_URL}#/inventory`);
    await expect(page.locator('.intro-screen:not([hidden])')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.inventory-screen')).toBeHidden();
  });

  test('at the login step, #/shop forces back to .login-screen', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    await setHash(page, '#/shop');
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.coming-soon-screen')).toBeHidden();
  });

  test('at the character step, #/upgrade forces back to .create-character-screen', async ({
    page,
  }) => {
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await setHash(page, '#/upgrade');
    await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('.coming-soon-screen')).toBeHidden();
  });
});

test.describe('TC-F10-FLOW-15/A-E18 — #/story/<n> never skips ahead of the slide actually reached', () => {
  test('on slide 1, a direct #/story/4 deep link stays on slide 1', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await page.locator('.class-select-card[data-class-id="tanker"]').click();
    await page.locator('.name-field-input').fill('testplayer');
    await page.locator('.create-character-button').click();
    await expect(page.locator('.story-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    await setHash(page, '#/story/4');
    await expect(page.locator('.story-screen:not([hidden])')).toBeVisible();
    // Slide 1's own `.story-dot-active` must still be the first dot — never the 4th.
    const dots = page.locator('.story-dot');
    await expect(dots.nth(0)).toHaveClass(/story-dot-active/);
    await expect(dots.nth(3)).not.toHaveClass(/story-dot-active/);
  });
});

test.describe('TC-F10-FLOW-14/A-E17 — shell-ready: every onboarding route bounces back to the map', () => {
  test('#/create-character and #/story/1 both resolve to the map once the shell is ready', async ({
    page,
  }) => {
    await page.goto(HOME_FIXTURE_URL);
    await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 20_000 });

    await setHash(page, '#/create-character');
    await expect(page.locator('.bottombar-f10')).toBeVisible();
    await expect(page.locator('.create-character-screen')).toBeHidden();

    await setHash(page, '#/story/1');
    await expect(page.locator('.bottombar-f10')).toBeVisible();
    await expect(page.locator('.story-screen')).toBeHidden();
  });

  test('after logout (signed out), #/create-character bounces to .login-screen, not create-character (R43)', async ({
    page,
  }) => {
    await page.goto(HOME_FIXTURE_URL);
    await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 20_000 });
    await page.locator('.setting-button-float').click();
    await page.locator('.settings-menu-logout').click();
    await page.locator('.settings-menu-logout-confirm-button').click();
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 10_000 });

    await setHash(page, '#/create-character');
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible();
    await expect(page.locator('.create-character-screen')).toBeHidden();

    // `#/login` itself is the one onboarding route a signed-out shell is allowed to show (R43) —
    // confirming the guard is not simply "always main", but specifically the login family.
    await setHash(page, '#/login');
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible();
  });
});
