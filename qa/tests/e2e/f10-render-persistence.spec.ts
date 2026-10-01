// P2-F10-T19 (test plan §3.8 TC-F10-RENDER-01..05, bug class P2-X59): `f04-app.ts`'s own render
// loop calls every F10 onboarding screen's `show(view)` on *every* `onTick` (`config/app/
// client.json#engine.tickInterval_ms` = 1000 ms, `main.ts`'s `window.setInterval`), unconditionally
// from the moment the app boots — not gated on GPS/consent/a run being active (verified by reading
// `main.ts`/`f04-app.ts#onTick` directly: the interval and `render()` call are set up in the same
// unconditional `setTimeout(0)` block that constructs `f04App` itself). P2-X59 was exactly this
// class of bug on the age-gate birth-year `<select>`: a render pass rebuilt/reset the field's value
// from the caller's own `view` instead of leaving DOM state alone. Every F10 input screen (login,
// register/forgot forwarding the same markup, create-character) now carries the same "`show()` must
// be idempotent on a repeat call" rule (`create-character-screen.ts`'s own doc comment, tech note
// F10 section 6) — this spec proves it black-box, waiting out several real tick intervals on a
// genuinely running Mock trace (not a frozen clock), the same risk shape `onboarding.spec.ts` never
// exercises (its own assertions all happen immediately after an action, never after an idle wait).
import { expect, test } from '@playwright/test';

const START = '2026-10-02T12:00';
// `speed=60` (not `speed=0`/a static trace): onTick/render fire on a real wall-clock interval
// regardless of trace speed, but a *moving* Mock trace is the more realistic "something is always
// happening in the background" case these regressions were first found under (P2-X59 found via a
// real device, not a frozen fixture).
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

// Comfortably more than `engine.tickInterval_ms` (1000 ms) x 10 — long enough that a render tied to
// the view instead of to a real state transition would have fired and wiped the field well before
// this wait ends.
const IDLE_WAIT_MS = 10_500;

// Each test's own `test.setTimeout(90_000)` below is generous on purpose, not because any single
// one of these tests is slow in isolation (~11s each, confirmed with `--workers=1`): running the
// full suite in parallel with many other Chromium/WebKit instances on a constrained CI box measurably
// slows down `page.waitForTimeout`'s real wall-clock wait (observed up to ~47s for an 11s-shaped
// test under full-suite load) — this margin absorbs that contention instead of flaking the run
// under `--retries=0`, without shortening the real idle wait the regression itself needs.

test.describe('P2-X59 regression: onboarding input fields survive an idle render tick (TC-F10-RENDER)', () => {
  test('TC-F10-RENDER-01: email + password on the login-email screen', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-email-link').click();
    const emailScreen = page.locator('.login-email-screen:not([hidden])');
    await emailScreen.locator('.login-email-input').fill('player@example.com');
    await emailScreen.locator('.login-password-input').fill('partial-pw');
    await page.waitForTimeout(IDLE_WAIT_MS);
    await expect(emailScreen.locator('.login-email-input')).toHaveValue('player@example.com');
    await expect(emailScreen.locator('.login-password-input')).toHaveValue('partial-pw');
  });

  test('TC-F10-RENDER-02: class selection + partial name on create-character', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('.class-select-card[data-class-id="magic"]').click();
    await page.locator('.name-field-input').fill('half-typed');
    await page.waitForTimeout(IDLE_WAIT_MS);
    await expect(page.locator('.class-select-card[data-class-id="magic"]')).toHaveClass(/selected/);
    await expect(page.locator('.name-field-input')).toHaveValue('half-typed');
  });

  test('TC-F10-RENDER-03: a filter error stays shown, not flickering, while idle', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-google-button').click();
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.locator('.age-gate-confirm').click();
    await page.locator('.consent-location-decline').click();
    await page.locator('.class-select-card[data-class-id="tanker"]').click();
    await page.locator('.name-field-input').fill('a'); // tooShort (minGraphemes 2)
    const nameError = page.locator('.name-field-error');
    await expect(nameError).not.toHaveText('');
    const errorTextBefore = await nameError.textContent();
    await page.waitForTimeout(IDLE_WAIT_MS);
    await expect(nameError).toHaveText(errorTextBefore ?? '');
    await expect(page.locator('.name-field-input')).toHaveValue('a');
    await expect(page.locator('.create-character-button')).toBeDisabled();
  });

  test('TC-F10-RENDER-04: the age-gate birth-year select keeps its chosen value while idle', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-apple-button').click();
    await expect(page.locator('.age-gate-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
    await page.locator('.age-gate-birth-year-select').selectOption('1990');
    await page.waitForTimeout(IDLE_WAIT_MS);
    await expect(page.locator('.age-gate-birth-year-select')).toHaveValue('1990');
    await expect(page.locator('.age-gate-confirm')).toBeEnabled();
  });

  test('TC-F10-RENDER-05: a register-screen field survives a visibilitychange (tab switch) event', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(FIXTURE_URL);
    await page.locator('.intro-screen:not([hidden]) .intro-start').click();
    await page.locator('.login-email-link').click();
    await page.locator('.login-register-link').click();
    const registerScreen = page.locator('.register-screen:not([hidden])');
    await registerScreen.locator('.login-email-input').fill('newplayer@example.com');
    // Same technique `pocket-screen.spec.ts`/the wake-lock controller tests use for a synthetic
    // visibility edge: dispatch the event itself rather than relying on a real OS-level tab switch,
    // which Playwright cannot reliably simulate — the app only ever listens for the event, so this
    // reaches the same code path a real tab switch would.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(IDLE_WAIT_MS);
    await expect(registerScreen.locator('.login-email-input')).toHaveValue('newplayer@example.com');
  });
});
