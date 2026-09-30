// R2-1 (art/reviews/F04-F06-visual-gate.md §7.3): the visual gate's round-2 defect was `.toast`
// being centred with `left: 50%; transform: translateX(-50%)` while every enter/exit/pulse effect
// on it plays `element.animate({ transform: … }, { fill: 'forwards' })` — the Web Animations API
// replaces the *whole* CSS `transform` value (and `fill: 'forwards'` holds that replacement after
// the effect ends), permanently discarding the centring translate the moment the very first effect
// ran, not just while it played. The fix (`app.css`) drops `transform` from `.toast` entirely and
// centres it with `left: 0; right: 0; margin-inline: auto; width: max-content` instead.
//
// This spec proves the fix holds *while an effect is actively animating the toast*, not just once
// it has settled — reading `el.getAnimations()` to catch the box mid-flight, then again once no
// animation is left running, at both committed narrow viewports (360/390 px, style-guide 3).
import { expect, test, type Page } from '@playwright/test';

// Same fixture/seed/class as `full-run.spec.ts` (this task's own trace, not `data/gps-traces/`):
// walks in from outside `leelawadee-lawn`, loops long enough for exactly one granted reward tick —
// the very first tick of the session, which plays the more emphatic `run.tickGrantedFirst` effect
// (`art/vfx/tick-feedback/tick-feedback.ts`: enter + a 3-beat pulse, ~470ms total), giving this
// spec a comfortably wide animation window to land a mid-flight read in.
const START = '2026-10-02T12:00';
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

interface Box {
  readonly x: number;
  readonly width: number;
}

/** Polls `requestAnimationFrame` from inside the page until at least one `Animation` on `el` is
 * actually `running`, then resolves with that frame's own `getBoundingClientRect()` — a read taken
 * while the effect is provably still animating the element, not a guess based on wall-clock delay
 * between Playwright commands. */
async function boundingBoxWhileAnimating(page: Page, selector: string): Promise<Box> {
  return page.locator(selector).evaluate(
    (el) =>
      new Promise<Box>((resolve) => {
        function check(): void {
          const running = el.getAnimations().some((anim) => anim.playState === 'running');
          if (running) {
            const rect = el.getBoundingClientRect();
            resolve({ x: rect.x, width: rect.width });
            return;
          }
          requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
      }),
  );
}

// Same real, deterministic level-gap fixture `qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts`
// already uses to reach a real `run.hpLow` toast quickly (a level-1 `ranged` player against a
// level 10-20 dungeon, D-112) — `run.hpLow` targets `.toast.danger` (a different VFX module,
// `art/vfx/hp-critical/hp-critical.ts`) than the granted/denied tick toasts above
// (`art/vfx/tick-feedback/tick-feedback.ts`), and R2-1's fix is a shared CSS rule on `.toast`
// itself, so both toast kinds must hold centred through their own animation independently.
const HP_LOW_START = '2026-10-02T17:00';
const HP_LOW_FIXTURE_URL =
  '/?loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&hud=0&e2eClassId=ranged&seed=7' +
  `&start=${encodeURIComponent(HP_LOW_START)}&e2eSkipOnboarding=1`;

test.describe('run.hpLow toast (.toast.danger) centring holds through its own enter+pulse animation', () => {
  test('boundingBox stays within the viewport and centred, mid-animation and after', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    const viewportWidth = 360;
    await page.setViewportSize({ width: viewportWidth, height: 740 });

    await page.goto(HP_LOW_FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });

    const hpLowToastSelector = '.toast.danger';
    await expect(page.locator(hpLowToastSelector)).toBeVisible({ timeout: 45_000 });

    const expectedCenter = viewportWidth / 2;

    // Mid-animation: `run.hpLow`'s own enter/pulse sequence (~150ms enter + 3 pulses) is still
    // `running` at the instant this resolves.
    const midAnimation = await boundingBoxWhileAnimating(page, hpLowToastSelector);
    expect(midAnimation.x).toBeGreaterThanOrEqual(0);
    expect(midAnimation.x + midAnimation.width).toBeLessThanOrEqual(viewportWidth);
    expect(Math.abs(midAnimation.x + midAnimation.width / 2 - expectedCenter)).toBeLessThanOrEqual(
      1,
    );

    // Post-animation: same read once every animation on the toast has settled.
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el !== null && el.getAnimations().every((anim) => anim.playState !== 'running');
      },
      hpLowToastSelector,
      { timeout: 5_000 },
    );
    const settled = await page.locator(hpLowToastSelector).boundingBox();
    expect(settled).not.toBeNull();
    if (settled !== null) {
      expect(settled.x).toBeGreaterThanOrEqual(0);
      expect(settled.x + settled.width).toBeLessThanOrEqual(viewportWidth);
      expect(Math.abs(settled.x + settled.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);
    }
  });
});

// `prefers-reduced-motion: reduce` (art/vfx/core/vfx.js's own reduced-duration path, e.g.
// `hp-critical.ts`'s REDUCED_DURATION_MS): R2-1's fix is a CSS rule (no `transform` on `.toast`),
// never conditioned on this media feature, so centring must hold identically whether or not the
// player has this preference on — the granted-toast fixture is enough here (no need to repeat
// every fixture above at both settings).
test.describe('toast centring holds under prefers-reduced-motion: reduce (360px)', () => {
  test('the granted tick toast still settles centred with reduced motion on', async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    const viewportWidth = 360;
    await page.setViewportSize({ width: viewportWidth, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto(FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });

    const grantedToastSelector = '.toast:has(.toast-line):not(.faded)';
    await expect(page.locator(grantedToastSelector)).toBeVisible({ timeout: 30_000 });

    const expectedCenter = viewportWidth / 2;
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el !== null && el.getAnimations().every((anim) => anim.playState !== 'running');
      },
      grantedToastSelector,
      { timeout: 5_000 },
    );
    const settled = await page.locator(grantedToastSelector).boundingBox();
    expect(settled).not.toBeNull();
    if (settled !== null) {
      expect(settled.x).toBeGreaterThanOrEqual(0);
      expect(settled.x + settled.width).toBeLessThanOrEqual(viewportWidth);
      expect(Math.abs(settled.x + settled.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);
    }
  });
});

for (const viewportWidth of [360, 390] as const) {
  test.describe(`toast centring holds through its own enter animation (${viewportWidth}px)`, () => {
    test('boundingBox stays within the viewport and centred, mid-animation and after', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
        delete (Navigator.prototype as any).wakeLock;
      });
      await page.setViewportSize({ width: viewportWidth, height: 740 });

      await page.goto(FIXTURE_URL);

      const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
      await expect(enterButton).toBeEnabled({ timeout: 30_000 });
      await enterButton.click();
      await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });

      const grantedToastSelector = '.toast:has(.toast-line):not(.faded)';
      await expect(page.locator(grantedToastSelector)).toBeVisible({ timeout: 30_000 });

      const expectedCenter = viewportWidth / 2;

      // Mid-animation: the enter effect (`run.tickGranted`/`run.tickGrantedFirst`) is still
      // `running` at the instant this resolves.
      const midAnimation = await boundingBoxWhileAnimating(page, grantedToastSelector);
      expect(midAnimation.x).toBeGreaterThanOrEqual(0);
      expect(midAnimation.x + midAnimation.width).toBeLessThanOrEqual(viewportWidth);
      expect(
        Math.abs(midAnimation.x + midAnimation.width / 2 - expectedCenter),
      ).toBeLessThanOrEqual(1);

      // Post-animation (`fill: 'forwards'` has now committed its final `translateY`, never a
      // horizontal offset per the fix above): must read exactly the same as mid-animation.
      await page.waitForFunction(
        (selector) => {
          const el = document.querySelector(selector);
          return el !== null && el.getAnimations().every((anim) => anim.playState !== 'running');
        },
        grantedToastSelector,
        { timeout: 5_000 },
      );
      const settled = await page.locator(grantedToastSelector).boundingBox();
      expect(settled).not.toBeNull();
      if (settled !== null) {
        expect(settled.x).toBeGreaterThanOrEqual(0);
        expect(settled.x + settled.width).toBeLessThanOrEqual(viewportWidth);
        expect(Math.abs(settled.x + settled.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);
      }
    });
  });
}
