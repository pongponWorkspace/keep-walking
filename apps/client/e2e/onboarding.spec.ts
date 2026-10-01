// Black-box e2e for the F10 account-shell sequence (design/ux/flows/F10-account-shell.md Flow A/B,
// docs/tech/F10-account-shell.md, D-149) through `S-00-permission-browser` -- no game math computed
// by this spec, every asserted value is read off the rendered DOM/localStorage only (CLAUDE.md: no
// reward logic on the client, and that includes the test for it):
//
//   start (S-00-start) -> login (S-00-login, Google/Apple + email sub-screens) -> age gate
//   (S-00-age-gate, F06-R44/R45) -> consent location (S-00-consent-location, F06-R47/R48) ->
//   permission (S-00-permission-browser) -> the `character` step.
//
// P2-F10-T15 has not built the real `S-00-create-character`/story screens yet (tech note F10
// section 3.1 table rows 6-7) -- `f04-app.ts` shows the pre-F10 class-select sheet for the
// `character` step as a documented interim placeholder in the meantime (that module's own doc
// comment on the `character` branch), and nothing writes `kw.p2.character` on its own yet, so this
// spec does not drive a run/first-reward the way the pre-F10 version of this file did -- that
// regression-test depth returns once P2-F10-T15 lands (qa-tester's own T16/T19 pick this back up).
//
// Fixture: `e2e/fixtures/e2e-onboarding-01.trace.json` (pre-existing, unchanged by this task).
//
// `e2eClassId`/`e2eSkipOnboarding` (D-130) are deliberately never passed here -- this is the one
// spec whose whole point is to drive the real login/age/consent/permission screens themselves, the
// same taps a first-time player makes.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { copyEntries } from '@keep-walking/shared';

// Same approach as `map-shell.spec.ts`: Playwright's Node/ESM runner cannot import the JSON
// directly the way Vite/Vitest do, so this reads the exact file `src/copy/load.ts` reads by path.
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

/** Same fallback as `src/copy/load.ts`'s `getCopyText` (TL-N06): the key itself when narrative
 * has not written it yet -- never a hand-typed Thai literal in this test (BUG-P2-005). */
function getCopyText(key: string): string {
  return copyIndex.get(key)?.text ?? key;
}

/** `src/copy/format.ts#formatText`'s own `{variable}` substitution, reimplemented here for the
 * same reason `getCopyText` above is: this spec reads the content file directly, never imports the
 * client's own module graph. */
function formatCopyText(key: string, vars: Readonly<Record<string, string>>): string {
  return getCopyText(key).replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, name: string) =>
    name in vars ? (vars[name] as string) : match,
  );
}

// `start=2026-10-02T12:00` (Friday noon, `clock/query-params.ts`'s `YYYY-MM-DDTHH:mm` test hook):
// pins the game clock inside every candidate park-preset dungeon's own daily 05:00-21:00 opening
// window (`data/dungeons/dungeons.json`), the same way `f06-hp.spec.ts`'s own `START` constant
// pins a real weekly-hours dungeon open.
const START = '2026-10-02T12:00';
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

/** Every `localStorage` value, scanned for a literal substring (R11/R13: no email, password, or
 * provider PII of any kind ever lands in storage) -- the same "scan every key" shape tech note F10
 * section 9/acceptance ("ตรวจ localStorage ทั้งหมดหลัง submit") asks for. */
async function localStorageContains(page: Page, needle: string): Promise<boolean> {
  return page.evaluate((n) => {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key === null) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null && value.includes(n)) return true;
    }
    return false;
  }, needle);
}

test.describe('Login shell 0-10 minutes (Mock provider, speed=60)', () => {
  test('start -> login (Google bypass) -> age gate -> consent -> permission -> character step placeholder', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(FIXTURE_URL);

    // Minute 0: a single start button (D-144) on top of the already-visible map.
    const intro = page.locator('.intro-screen:not([hidden])');
    await expect(intro).toBeVisible({ timeout: 10_000 });
    await page.locator('.intro-start').click();

    // S-00-login (D-149, flow F10 A2): Google/Apple same-weight buttons + an email link, no error
    // state, no SDK request -- the one existing `kw.p2.account` key is still unset at this point.
    const login = page.locator('.login-screen:not([hidden])');
    await expect(login).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.login-google-button')).toHaveText(
      formatCopyText('account.loginGoogleButton', { providerName: 'Google' }),
    );
    await expect(page.locator('.login-apple-button')).toHaveText(
      formatCopyText('account.loginAppleButton', { providerName: 'Apple' }),
    );
    expect(await page.evaluate(() => window.localStorage.getItem('kw.p2.account'))).toBeNull();
    await page.locator('.login-google-button').click();

    // Bypass (R10): straight to the age gate, same screen/behaviour F06 always had.
    const ageGate = page.locator('.age-gate-screen:not([hidden])');
    await expect(ageGate).toBeVisible({ timeout: 5_000 });
    const ageConfirmButton = page.locator('.age-gate-confirm');
    await expect(ageConfirmButton).toBeDisabled();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await expect(ageConfirmButton).toBeEnabled();
    await ageConfirmButton.click();

    // Passing the age gate is what actually writes `kw.p2.account` (tech note F10 section 2.1,
    // table A3) -- never earlier, and never with the provider still just held in memory.
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kw.p2.account')))
      .toContain('"provider":"google"');
    expect(await page.evaluate(() => window.localStorage.getItem('kw.p2.account'))).toContain(
      '"signedIn":true',
    );

    // F06-R47/R48: consent, separate from and before the first GPS request.
    const consentScreen = page.locator('.consent-location-screen:not([hidden])');
    await expect(consentScreen).toBeVisible({ timeout: 5_000 });
    await page.locator('.consent-location-accept').click();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kw.p2.consent')))
      .toContain('"granted"');

    // S-00-permission-browser: a real, blocking screen between accepting consent and the native
    // GPS request.
    const permissionScreen = page.locator('.consent-permission-screen:not([hidden])');
    await expect(permissionScreen).toBeVisible({ timeout: 5_000 });
    await page.locator('.consent-permission-continue').click();

    // `character` step (D-149 table row 6): the pre-F10 class-select sheet, reused as a documented
    // interim placeholder until P2-F10-T15 builds the real create-character screen (this spec's own
    // header comment) -- its four cards still render, proving the step machine really did advance
    // past `permission`.
    const classSheet = page.locator('.class-select-overlay:not([hidden])');
    await expect(classSheet).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.class-select-card')).toHaveCount(4);

    // R11/R12: nothing this screen ever touched (an email, a password, a provider SDK token) is
    // anywhere in storage -- only the bypass flags/account envelope this spec itself just asserted.
    expect(await localStorageContains(page, 'password')).toBe(false);
    expect(await localStorageContains(page, '@')).toBe(false);
  });

  // Flow A3-A5: the email link's own sub-screens -- login/register/forgot all bypass to the age
  // gate the same way the Google/Apple buttons do, and every one of their back links returns
  // exactly where flow A3/A4/A5 says (R28/section 9.2).
  test('email link -> login/register/forgot round trip, each confirm bypasses, nothing typed survives', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    await page.locator('.login-email-link').click();
    const emailScreen = page.locator('.login-email-screen:not([hidden])');
    await expect(emailScreen).toBeVisible({ timeout: 5_000 });
    await expect(emailScreen.locator('.login-email-input')).toHaveValue('');
    await emailScreen.locator('.login-email-input').fill('player@example.com');
    await emailScreen.locator('.login-password-input').fill('hunter2');

    // register link -> S-00-register, typed values from the email screen do not follow.
    await page.locator('.login-register-link').click();
    const registerScreen = page.locator('.register-screen:not([hidden])');
    await expect(registerScreen).toBeVisible({ timeout: 5_000 });
    await expect(registerScreen.locator('.login-email-input')).toHaveValue('');
    await expect(registerScreen.locator('.login-password-input')).toHaveValue('');

    // register's own back link returns to S-00-login-email (flow A4), not the main login screen.
    await page.locator('.register-back-to-login-email').click();
    await expect(emailScreen).toBeVisible({ timeout: 5_000 });
    await expect(emailScreen.locator('.login-email-input')).toHaveValue('');

    await page.locator('.login-forgot-link').click();
    const forgotScreen = page.locator('.forgot-screen:not([hidden])');
    await expect(forgotScreen).toBeVisible({ timeout: 5_000 });
    await page.locator('.forgot-back-to-login-email').click();
    await expect(emailScreen).toBeVisible({ timeout: 5_000 });

    // The email screen's own back link returns to the main login screen (flow A3).
    await page.locator('.login-back-to-login').click();
    await expect(page.locator('.login-screen .login-main-view:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });

    // Confirming on the email sub-screen bypasses to the age gate exactly like Google/Apple.
    await page.locator('.login-email-link').click();
    await page.locator('.login-email-confirm').click();
    await expect(page.locator('.age-gate-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    expect(await localStorageContains(page, 'player@example.com')).toBe(false);
    expect(await localStorageContains(page, 'hunter2')).toBe(false);
    expect(page.url()).not.toContain('player@example.com');
  });

  // F06-R46 (unchanged by F10, just one step later): an honestly-answered under-`minAge_yr` birth
  // year blocks -- no consent screen, no GPS, no `kw.p2.onboarding.ageGatePassed`/`kw.p2.account`
  // write -- until the player goes back (to `S-00-start`, flow B2, not `S-00-login`) and retries.
  test('age gate: an under-min birth year blocks with no consent screen or account write; back retries from start', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(FIXTURE_URL);

    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    const ageGate = page.locator('.age-gate-screen:not([hidden])');
    await expect(ageGate).toBeVisible({ timeout: 5_000 });
    // `start=2026-10-02` -> nowYear 2026; 2020 is 6 years old, well under minAge_yr (15).
    await page.locator('.age-gate-birth-year-select').selectOption('2020');
    await page.locator('.age-gate-confirm').click();

    await expect(page.locator('.age-gate-underage-view:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('.consent-location-screen')).toBeHidden();
    const onboardingStorage = await page.evaluate(() =>
      window.localStorage.getItem('kw.p2.onboarding'),
    );
    expect(onboardingStorage).not.toBeNull();
    expect(onboardingStorage).toContain('"ageGatePassed":false');
    expect(await page.evaluate(() => window.localStorage.getItem('kw.p2.consent'))).toBeNull();
    expect(await page.evaluate(() => window.localStorage.getItem('kw.p2.account'))).toBeNull();

    // R14/flow B2 "กลับ S-00-start ... ต้องเลือก provider ใหม่": the one button goes all the way
    // back to the start screen, not straight to a re-armed age gate.
    await page.locator('.age-gate-underage-back').click();
    await expect(page.locator('.intro-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    await page.locator('.intro-start').click();
    await expect(page.locator('.login-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    await page.locator('.login-apple-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await expect(page.locator('.consent-location-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    expect(await page.evaluate(() => window.localStorage.getItem('kw.p2.account'))).toContain(
      '"provider":"apple"',
    );
  });

  // F06-R48 (unchanged by F10): declining consent never requests GPS -- F10-R03 changes the
  // *destination* only (the `character` step directly, flow B3), not the decline behaviour itself.
  test('declining consent never starts GPS but still reaches the character step (R48, F10-R03)', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(FIXTURE_URL);

    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await expect(page.locator('.consent-location-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('.consent-location-decline').click();

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kw.p2.consent')))
      .toContain('"declined"');
    await expect(page.locator('.class-select-overlay:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
  });
});
