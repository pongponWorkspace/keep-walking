// Black-box e2e for the pocket screen + Wake Lock (P2-F06-T14, design gate A 4.4, components.md
// section 12): both device emulations this workspace's own Playwright projects already stand in
// for (`playwright.config.ts`) run *both* paths this feature has to get right, direction A (the
// dark overlay, exited with the swipe-up-hold gesture, re-entered with `[run.pocketEnterButton]`)
// and the documented fallback path B (the normal run screen, `[run.screenLockNotice]` shown once) --
// each forced deterministically via `page.addInitScript` (run before any page script) rather than
// relying on whichever engine's bundled build happens to implement `navigator.wakeLock` this month:
// this workspace's own D-003 note ("no navigator.vibrate on iOS Safari") is about a real device;
// this Playwright installation's WebKit build was found, while building this spec, to actually
// expose (and honour) `navigator.wakeLock` over a secure `http://localhost` origin -- the opposite
// of real iOS Safari today -- so path B is forced by deleting the property from
// `Navigator.prototype` rather than assumed from the emulation alone. The feature-detection this
// app actually branches on (`'wakeLock' in navigator`,
// `feedback/wake-lock-controller.ts#isWakeLockSupported`) still runs for real against whatever the
// init script left in place.
//
// Real-device confirmation (does a real phone's Wake Lock actually keep the screen on, real battery
// cost) is P2-F06-T26's job, not this spec's -- this only proves the client's own branching logic
// end to end through a real browser.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Same fixture/timing reasoning as `full-run.spec.ts`'s own header comment: `leelawadee-lawn`'s
// daily 05:00-21:00 opening window, pinned so this spec passes regardless of the wall-clock time it
// actually runs at.
const START = '2026-10-02T12:00';
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

// components.md 12.1's own "นานพอกันปัดผ่านโดยบังเอิญ" hold duration
// (`config: client.pocketScreen.swipeUpHoldMinDuration_ms` = 600 ms) -- comfortably cleared by a
// 2.5 s wait, well under this spec's own `test.setTimeout`.
const GESTURE_HOLD_WAIT_MS = 2500;

/** Forces direction A: a fake `navigator.wakeLock` whose `request()` always resolves, matching
 * `feedback/wake-lock-controller.ts#WakeLockSentinelLike`'s shape (a plain object, not a real
 * `EventTarget` subclass -- this runs inside `page.addInitScript`'s isolated browser-context
 * function, kept dependency-free on purpose). */
function forceWakeLockSupported(): void {
  function makeSentinel(): {
    release: () => Promise<void>;
    addEventListener: (type: string, cb: () => void) => void;
  } {
    let releaseListener: (() => void) | undefined;
    return {
      addEventListener: (type, cb) => {
        if (type === 'release') releaseListener = cb;
      },
      release: async () => {
        releaseListener?.();
      },
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for this
  (window.navigator as any).wakeLock = { request: async () => makeSentinel() };
}

/** Forces direction B: removes the property from `Navigator.prototype` so
 * `'wakeLock' in navigator` reads `false`, the one condition
 * `feedback/wake-lock-controller.ts#isWakeLockSupported` checks -- matches real iOS Safari today
 * (D-003) even on a Playwright WebKit build that itself implements the API (this spec's own header
 * comment). */
function forceWakeLockUnsupported(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
  delete (Navigator.prototype as any).wakeLock;
}

async function enterRun(page: Page): Promise<void> {
  await page.goto(FIXTURE_URL);
  const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
  await expect(enterButton).toBeEnabled({ timeout: 20_000 });
  await enterButton.click();
  // F06-TG-07: the same 20s timeout `enterButton` above uses, not a separate, much shorter 5s one —
  // under 8 parallel Playwright workers, WebKit's own render/render can occasionally lag past 5s
  // for a purely mechanical reason (worker contention), not a product regression (`.pocket-screen`
  // never hides `.run-bar`, `f04-app.ts`'s own doc comment on that CSS rule). Confirmed as a pure
  // timing flake, not a real behavior bug, by 20/20 solo runs and 50/50 serial runs at the old 5s
  // value (tech gate P2-F06-T20 round 1 evidence) — this only widens the window, no logic change.
  await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });
}

test.describe('Pocket screen + Wake Lock (Mock provider, speed=60)', () => {
  test('direction A (Wake Lock supported): dark overlay enters, exits on swipe-up-hold, re-enters', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(forceWakeLockSupported);

    await enterRun(page);

    const overlay = page.locator('.pocket-screen');
    // The tutorial line shows first on a brand-new session (F06 flow E1/N-3), then the overlay --
    // `client.onboarding.tutorialLineHoldDurationMs` (3000 ms) plus headroom.
    await expect(overlay).not.toBeHidden({ timeout: 6_000 });
    // A live HP percentage (F06-R11: engine-decided, this spec never re-derives the exact number --
    // the fixture's `leelawadee-lawn` run can land a hit before the tutorial-line delay elapses, so
    // this only checks the shape, not a specific value or the copy text itself).
    await expect(overlay.locator('.pocket-screen-hp')).toHaveText(/\d+%/);
    // Rule 2 of design gate A 4.4's 8 rules: no button anywhere on the overlay.
    await expect(overlay.locator('button')).toHaveCount(0);

    const box = await overlay.boundingBox();
    if (box === null) throw new Error('pocket-screen overlay has no bounding box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    // The *swipe* half of "ปัดขึ้นค้าง": net upward movement past
    // `client.pocketScreen.swipeUpMinDistance_ratio`'s share of the viewport height.
    await page.mouse.move(x, y - 40, { steps: 5 });
    await expect(overlay).toBeHidden({ timeout: GESTURE_HOLD_WAIT_MS });
    await page.mouse.up();

    const enterAgainButton = page.locator('.pocket-enter-button');
    await expect(enterAgainButton).not.toBeHidden();
    await enterAgainButton.click();
    await expect(overlay).not.toBeHidden({ timeout: 2_000 });
  });

  test('path B (Wake Lock unsupported): normal run screen, one-time fallback notice', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(forceWakeLockUnsupported);

    await enterRun(page);

    await expect(page.locator('.pocket-screen-lock-notice')).not.toBeHidden({ timeout: 5_000 });
    // No dark overlay ever appears, no matter how long the tutorial line's own delay would have
    // been on direction A.
    await page.waitForTimeout(4_000);
    await expect(page.locator('.pocket-screen')).toBeHidden();
    await expect(page.locator('.pocket-enter-button')).toBeHidden();
    // The run itself is entirely unaffected by which path the pocket screen took (flow F06 E2):
    // the HP bar on the normal run screen is still live.
    await expect(page.locator('.hp-bar')).not.toBeHidden();
  });
});
