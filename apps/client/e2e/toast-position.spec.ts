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
