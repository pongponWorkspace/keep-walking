// P2-F10-T19 (test plan §3.7 TC-F10-PDPA-01/-02/-04, acceptance 2/3/4): black-box PDPA coverage
// `apps/client/e2e/onboarding.spec.ts` does not fully close — that spec checks `kw.p2.account`/
// `kw.p2.consent`/a `password`/`@` substring scan inline, on the happy path and the email
// round-trip, but never (a) a *complete* localStorage key enumeration against the known F06
// baseline after the under-`minAge_yr` block (TC-F10-FLOW-08/acceptance 4: "ไม่มี... key ใหม่ใด",
// not just the three keys that one test happens to name), (b) whether a typed email/password
// survives into the one place data actually leaves the device — the telemetry export file
// (`.settings-menu-export`, R50/acceptance 3/6) — or (c) whether the real login screens themselves
// (not the `e2eSkipOnboarding` bypass every other spec uses) ever call out to a non-allowlisted
// origin (R12/C2-1/acceptance 2), which `qa/tests/e2e/f04-origin-allowlist.spec.ts` only checks
// from a post-onboarding state.
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const START = '2026-10-02T12:00';
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const clientConfig = JSON.parse(
  readFileSync(join(REPO_ROOT, 'config/app/client.json'), 'utf8'),
) as { readonly requestOrigins: { readonly allowedOrigins: readonly string[] } };

/** Every `kw.p2.*` key this app could possibly have written before F10 ever shipped (F06 baseline:
 * `apps/client/src/env.ts`/`onboarding/onboarding-step.ts` own schema) — anything else appearing
 * after an under-age block is a new, unexpected key (acceptance 4's own wording), not just the two
 * literal keys `onboarding.spec.ts` names (`kw.p2.account`/character name). */
const PRE_F10_KEY_ALLOWLIST = new Set([
  'kw.p2.onboarding',
  'kw.p2.consent',
  'kw.p2.session',
  'kw.p2.settings',
  'kw.p2.interest',
  'kw.p2.telemetry',
]);

async function allStorageKeys(
  page: Page,
  store: 'localStorage' | 'sessionStorage',
): Promise<string[]> {
  return page.evaluate((s) => {
    const win = window[s as 'localStorage'];
    const keys: string[] = [];
    for (let i = 0; i < win.length; i++) {
      const k = win.key(i);
      if (k !== null) keys.push(k);
    }
    return keys;
  }, store);
}

async function storageContains(
  page: Page,
  store: 'localStorage' | 'sessionStorage',
  needle: string,
): Promise<boolean> {
  return page.evaluate(
    ({ s, n }) => {
      const win = window[s as 'localStorage'];
      for (let i = 0; i < win.length; i++) {
        const key = win.key(i);
        if (key === null) continue;
        const value = win.getItem(key);
        if (value !== null && value.includes(n)) return true;
      }
      return false;
    },
    { s: store, n: needle },
  );
}

test.describe('TC-F10-PDPA-01/acceptance 4 — under-age block leaves no new kw.p2.* key', () => {
  test('a full localStorage key scan shows only the pre-F10 keys the age gate itself was always allowed to write', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await expect(page.locator('.age-gate-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    // Honestly under `character.json`'s minAge_yr (15) at `start=2026`.
    await page.locator('.age-gate-birth-year-select').selectOption('2020');
    await page.locator('.age-gate-confirm').click();
    await expect(page.locator('.age-gate-underage-view:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('.age-gate-underage-back').click();
    await expect(page.locator('.intro-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    const keys = await allStorageKeys(page, 'localStorage');
    expect(keys).not.toContain('kw.p2.account');
    expect(keys).not.toContain('kw.p2.character');
    const unexpected = keys.filter((k) => k.startsWith('kw.p2.') && !PRE_F10_KEY_ALLOWLIST.has(k));
    expect(
      unexpected,
      `unexpected kw.p2.* key(s) after an under-age block: ${unexpected.join(', ')}`,
    ).toEqual([]);
    expect(await allStorageKeys(page, 'sessionStorage')).toEqual([]);
  });
});

test.describe('TC-F10-PDPA-02/-03, acceptance 3/6 — a typed email/password/name never leaves the device', () => {
  test('full flow with a real email+password and a real typed name: neither survives into storage or the telemetry export file', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-email-link').click();
    const emailScreen = page.locator('.login-email-screen:not([hidden])');
    await expect(emailScreen).toBeVisible({ timeout: 5_000 });
    await emailScreen.locator('.login-email-input').fill('qa-reviewer@example.com');
    await emailScreen.locator('.login-password-input').fill('S3cretPassw0rd!');
    await emailScreen.locator('.login-email-confirm').click();

    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('.class-select-card[data-class-id="support"]').click();
    // A known-good vector (`design/systems/test-vectors/character-name.json`'s own `ok:true`
    // "สมชาย" case) — never a hand-picked string that might accidentally trip the filter.
    const realName = 'สมชาย';
    await page.locator('.name-field-input').fill(realName);
    await expect(page.locator('.create-character-button')).toBeEnabled();
    await page.locator('.create-character-button').click();
    for (let slide = 1; slide < 5; slide += 1) {
      await expect(page.locator('.story-title')).toBeVisible({ timeout: 5_000 });
      await page.locator('.story-next-button').click();
    }
    await page.locator('.story-next-button').click(); // "ออกไปลุย!"
    await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 10_000 });

    // Email/password must never land anywhere (R11/R12) — the character name is different: R49
    // *expects* `kw.p2.character` to hold it locally (that is the whole point of a local-only
    // profile), so the name is checked below only against the places it must *not* reach (the
    // telemetry export, the URL), never against local storage itself.
    for (const needle of ['qa-reviewer@example.com', 'S3cretPassw0rd!']) {
      expect(
        await storageContains(page, 'localStorage', needle),
        `localStorage contained "${needle}"`,
      ).toBe(false);
      expect(
        await storageContains(page, 'sessionStorage', needle),
        `sessionStorage contained "${needle}"`,
      ).toBe(false);
    }
    expect(await storageContains(page, 'localStorage', realName)).toBe(true); // R49 sanity check
    expect(page.url()).not.toContain('qa-reviewer@example.com');
    expect(page.url()).not.toContain('S3cretPassw0rd!');

    await page.locator('.setting-button-float').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.settings-menu-export').click();
    const download = await downloadPromise;
    const path = await download.path();
    const text = path === null ? '' : await readFile(path, 'utf-8');
    expect(text.length).toBeGreaterThan(0);
    for (const needle of ['qa-reviewer@example.com', 'S3cretPassw0rd!', realName]) {
      expect(text, `telemetry export contained "${needle}"`).not.toContain(needle);
    }
    expect(text).toContain('character_created');
  });
});

test.describe('TC-F10-PDPA-04, acceptance 2 — the real login screens never call out to Google/Apple/email origins', () => {
  test('intro -> every login button + the email/register/forgot round trip: no request leaves the allowlist', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(30_000);
    const baseOrigin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const allowedOrigins = new Set(
      clientConfig.requestOrigins.allowedOrigins.map((entry) =>
        entry === 'self' ? baseOrigin : entry,
      ),
    );
    const foreign: string[] = [];
    page.on('request', (request) => {
      const origin = new URL(request.url()).origin;
      if (!allowedOrigins.has(origin)) foreign.push(request.url());
    });

    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    await page.locator('.login-email-link').click();
    await page.locator('.login-register-link').click();
    await page.locator('.register-back-to-login-email').click();
    await page.locator('.login-forgot-link').click();
    await page.locator('.forgot-back-to-login-email').click();
    await page.locator('.login-back-to-login').click();
    await page.locator('.login-google-button').click();
    await expect(page.locator('.age-gate-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    expect(foreign, `request(s) to a non-allowlisted origin: ${foreign.join(', ')}`).toEqual([]);
  });
});

test.describe('TC-F10-LOGOUT-09, acceptance 11 — "clear local data" also removes kw.p2.account/character', () => {
  test('after a real F10 onboarding, clearing local data leaves no kw.p2.* key and returns to the start screen', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Real flow, not `e2eSkipOnboarding=1`: `afterClear: reloadToOnboarding` is a plain
    // `location.reload()` on the *same* URL (`clear-local-data.ts`'s own doc comment) — a skip-hook
    // query param would still be in that URL after the reload and skip straight back past the
    // intro screen, defeating this very assertion.
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await page.locator('.class-select-card[data-class-id="tanker"]').click();
    await page.locator('.name-field-input').fill('testplayer');
    await page.locator('.create-character-button').click();
    for (let slide = 1; slide < 5; slide += 1) {
      await expect(page.locator('.story-title')).toBeVisible({ timeout: 5_000 });
      await page.locator('.story-next-button').click();
    }
    await page.locator('.story-next-button').click(); // "ออกไปลุย!"
    await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 10_000 });
    expect((await allStorageKeys(page, 'localStorage')).some((k) => k === 'kw.p2.account')).toBe(
      true,
    );
    expect((await allStorageKeys(page, 'localStorage')).some((k) => k === 'kw.p2.character')).toBe(
      true,
    );

    await page.locator('.setting-button-float').click();
    await page.locator('.settings-menu-clear-local-data').click();
    await page.locator('.popup-overlay:not([hidden]) .btn-danger-confirm').click();
    await expect(page.locator('.intro-screen:not([hidden])')).toBeVisible({ timeout: 10_000 });

    // `clearLocalData` (`apps/client/src/storage/clear-local-data.ts`) removes every `kw.p2.*` key
    // and then, by design, writes exactly two things back: a fresh `kw.p2.telemetry` buffer seeded
    // with only `local_data_cleared` (its own doc comment), and whatever a normal fresh boot itself
    // creates (`kw.p2.session`'s own empty-state envelope, no player ever chose a class in this new
    // session) — neither is old data surviving, so this checks what actually matters: the account
    // and character keys specifically, and that nothing old (the real name typed earlier) rode along
    // in the fresh telemetry buffer.
    const keysAfter = await allStorageKeys(page, 'localStorage');
    expect(keysAfter).not.toContain('kw.p2.account');
    expect(keysAfter).not.toContain('kw.p2.character');
    const telemetryAfter = await page.evaluate(() =>
      window.localStorage.getItem('kw.p2.telemetry'),
    );
    expect(telemetryAfter).toContain('local_data_cleared');
    expect(telemetryAfter).not.toContain('testplayer');
    if (keysAfter.includes('kw.p2.session')) {
      const sessionAfter = await page.evaluate(() => window.localStorage.getItem('kw.p2.session'));
      expect(sessionAfter).not.toBeNull();
      expect(JSON.parse(sessionAfter ?? '{}')?.state?.player?.classId ?? null).toBeNull();
    }
  });
});
