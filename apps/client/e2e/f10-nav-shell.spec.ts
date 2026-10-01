// Black-box e2e for P2-F10-T17: map as the main shell screen, the 5-tab bottom nav
// (`.bottombar-f10`), the floating Setting button (`.setting-button-float`), the three "coming
// soon" screens, and logout/relogin (design/ux/flows/F10-account-shell.md Flow E/F, docs/tech/
// F10-account-shell.md section 4.3, components.md 16.1/16.2/16.3/16.7).
//
// `e2eSkipOnboarding=1` + `e2eClassId=tanker` (D-130): this spec is about the shell itself, not the
// login/age/consent/permission/create-character/story screens — `onboarding.spec.ts` already
// drives those for real. Reusing `e2e-onboarding-01` (not a new fixture): its own ~200-sample
// "outside approach" leg (see that trace's own `meta.description`) keeps the player away from
// `leelawadee-lawn`'s polygon for a long real-time window at `speed=60`, exactly the quiet "at
// home" state this spec needs to assert the shell chrome without a dungeon-confirm popup getting
// in the way of the earlier assertions.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const START = '2026-10-02T12:00';
const HOME_FIXTURE_URL =
  '/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;
const RUN_FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

async function readLocalStorageJson(page: Page, key: string): Promise<unknown> {
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), key);
  return raw === null ? null : JSON.parse(raw);
}

async function gotoHome(page: Page): Promise<void> {
  await page.goto(HOME_FIXTURE_URL);
  await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 20_000 });
}

test.describe('S-01-map — bottom nav + Setting button (flow F10 Flow E)', () => {
  test('5 tabs in order, Map active by default, Setting button shown', async ({ page }) => {
    await gotoHome(page);
    const tabs = page.locator('.bottombar-f10 .nav-tab');
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0)).toHaveAttribute('data-tab', 'inventory');
    await expect(tabs.nth(1)).toHaveAttribute('data-tab', 'upgrade');
    await expect(tabs.nth(2)).toHaveAttribute('data-tab', 'map');
    await expect(tabs.nth(3)).toHaveAttribute('data-tab', 'shop');
    await expect(tabs.nth(4)).toHaveAttribute('data-tab', 'party');
    await expect(page.locator('.nav-tab[data-tab="map"] .nav-tab-pill-active')).toBeVisible();
    await expect(page.locator('.setting-button-float')).toBeVisible();
  });

  test('Inventory opens S-11-inventory; nav stays visible with Inventory active; Map returns home', async ({
    page,
  }) => {
    await gotoHome(page);
    await page.locator('.nav-tab[data-tab="inventory"]').click();
    await expect(page.locator('.inventory-screen')).toBeVisible();
    await expect(page.locator('.bottombar-f10')).toBeVisible();
    await expect(page.locator('.nav-tab[data-tab="inventory"] .nav-tab-pill-active')).toBeVisible();
    await expect(page.locator('.setting-button-float')).toBeVisible();

    await page.locator('.nav-tab[data-tab="map"]').click();
    await expect(page.locator('.inventory-screen')).toBeHidden();
    await expect(page.locator('.nav-tab[data-tab="map"] .nav-tab-pill-active')).toBeVisible();
  });

  for (const tab of ['upgrade', 'shop', 'party'] as const) {
    test(`${tab} tab opens the "coming soon" screen with no button on it; Map returns home`, async ({
      page,
    }) => {
      await gotoHome(page);
      await page.locator(`.nav-tab[data-tab="${tab}"]`).click();
      await expect(page.locator('.coming-soon-screen')).toBeVisible();
      await expect(page.locator('.coming-soon-screen button')).toHaveCount(0);
      await expect(page.locator('.bottombar-f10')).toBeVisible();
      await expect(page.locator(`.nav-tab[data-tab="${tab}"] .nav-tab-pill-active`)).toBeVisible();

      await page.locator('.nav-tab[data-tab="map"]').click();
      await expect(page.locator('.coming-soon-screen')).toBeHidden();
    });
  }

  test('tapping the already-active Map tab has no effect (flow E3)', async ({ page }) => {
    await gotoHome(page);
    const urlBefore = page.url();
    await page.locator('.nav-tab[data-tab="map"]').click();
    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('.bottombar-f10')).toBeVisible();
  });

  test('Setting button opens S-22-settings; nav + Setting button hide there; closing returns them', async ({
    page,
  }) => {
    await gotoHome(page);
    await page.locator('.setting-button-float').click();
    await expect(page.locator('.settings-menu')).toBeVisible();
    await expect(page.locator('.bottombar-f10')).toBeHidden();
    await expect(page.locator('.setting-button-float')).toBeHidden();

    await page.locator('.settings-menu-close').click();
    await expect(page.locator('.settings-menu')).toBeHidden();
    await expect(page.locator('.bottombar-f10')).toBeVisible();
    await expect(page.locator('.setting-button-float')).toBeVisible();
  });
});

for (const viewportWidth of [360, 390] as const) {
  test.describe(`shell chrome fits the viewport at ${viewportWidth}px (no overlap off-screen)`, () => {
    test('bottom nav + Setting button bounding boxes stay fully inside the viewport', async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewportWidth, height: 740 });
      await gotoHome(page);

      const navBox = await page.locator('.bottombar-f10').boundingBox();
      expect(navBox).not.toBeNull();
      if (navBox !== null) {
        expect(navBox.x).toBeGreaterThanOrEqual(0);
        expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportWidth);
        expect(navBox.y + navBox.height).toBeLessThanOrEqual(740 + 1);
      }

      const settingBox = await page.locator('.setting-button-float').boundingBox();
      expect(settingBox).not.toBeNull();
      if (settingBox !== null && navBox !== null) {
        expect(settingBox.x).toBeGreaterThanOrEqual(0);
        expect(settingBox.x + settingBox.width).toBeLessThanOrEqual(viewportWidth);
        // The Setting button lives at the top-right; the nav lives at the bottom — they must never
        // vertically overlap each other regardless of viewport width.
        expect(settingBox.y + settingBox.height).toBeLessThanOrEqual(navBox.y);
      }
    });
  });
}

test.describe('Logout (tech note docs/tech/F10-account-shell.md section 4.3, R41/R42, D-158)', () => {
  test('with no run: keeps class/name/inventory, goes to login; a fresh login returns straight to map (R43)', async ({
    page,
  }) => {
    await gotoHome(page);
    // R45: only `player` (classId/inventory/HP) must be unchanged — `state.clock` keeps advancing
    // with every real GPS sample regardless of logout (engine behaviour untouched by this task),
    // so the comparison below is scoped to `player`, not the whole envelope.
    const playerBefore = (
      (await readLocalStorageJson(page, 'kw.p2.session')) as { state: { player: unknown } }
    ).state.player;
    const characterBefore = await readLocalStorageJson(page, 'kw.p2.character');

    await page.locator('.setting-button-float').click();
    await page.locator('.settings-menu-logout').click();
    await expect(page.locator('.settings-menu-logout-confirm-run-note')).toBeHidden();
    await page.locator('.settings-menu-logout-confirm-button').click();

    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 10_000 });
    const playerAfter = (
      (await readLocalStorageJson(page, 'kw.p2.session')) as { state: { player: unknown } }
    ).state.player;
    expect(playerAfter).toEqual(playerBefore);
    expect(await readLocalStorageJson(page, 'kw.p2.character')).toEqual(characterBefore);
    const account = (await readLocalStorageJson(page, 'kw.p2.account')) as {
      state: { signedIn: boolean };
    };
    expect(account.state.signedIn).toBe(false);

    // A10/R43: every confirm button writes the account immediately and goes straight to the map —
    // no age/consent/character/story screens again for this already-onboarded player.
    await page.locator('.login-google-button').click();
    await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 10_000 });
    expect(await readLocalStorageJson(page, 'kw.p2.character')).toEqual(characterBefore);
  });

  test('during an active run: ends it as manual_exit, shows the run summary, then login', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    await page.goto(RUN_FIXTURE_URL);
    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 45_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 30_000 });
    // Flow F10 section 8's table: the shell chrome never shows over the run screen at all.
    await expect(page.locator('.bottombar-f10')).toBeHidden();
    await expect(page.locator('.setting-button-float')).toBeHidden();

    const characterBefore = await readLocalStorageJson(page, 'kw.p2.character');

    // `#/settings*` is reachable during a run (F06 ia.md, NN-7) even with no Setting button shown
    // (`withdraw-consent.spec.ts`'s own same technique) — the one existing in-run entry point.
    await page.evaluate(() => {
      window.location.hash = '#/settings';
    });
    await expect(page.locator('.settings-menu')).not.toBeHidden();
    await page.locator('.settings-menu-logout').click();
    await expect(page.locator('.settings-menu-logout-confirm-run-note')).not.toBeHidden();
    await page.locator('.settings-menu-logout-confirm-button').click();

    const summary = page.locator('.run-summary');
    await expect(summary).not.toBeHidden({ timeout: 10_000 });

    await summary.locator('.btn-primary').click();
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 10_000 });

    const account = (await readLocalStorageJson(page, 'kw.p2.account')) as {
      state: { signedIn: boolean };
    };
    expect(account.state.signedIn).toBe(false);
    expect(await readLocalStorageJson(page, 'kw.p2.character')).toEqual(characterBefore);
  });
});
