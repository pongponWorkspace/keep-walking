// R2-1 (art/reviews/F04-F06-visual-gate.md §7.3): the visual gate's round-2 defect was `.toast`
// being centred with `left: 50%; transform: translateX(-50%)` while every enter/exit/pulse effect
// on it plays `element.animate({ transform: … }, { fill: 'forwards' })` — the Web Animations API
// replaces the *whole* CSS `transform` value (and `fill: 'forwards'` holds that replacement after
// the effect ends), permanently discarding the centring translate the moment the very first effect
// ran, not just while it played. The fix (`app.css`) drops `transform` from `.toast` entirely and
// centres it with `left: 0; right: 0; margin-inline: auto; width: max-content` instead.
//
// This spec proves the fix holds *while an effect is actively animating the toast*, not just once
// it has settled, at both committed narrow viewports (360/390 px, style-guide 3).
//
// P2-X56 (CI flake, both `ios-safari` runs, both viewports): this used to catch "mid-flight" by
// polling `el.getAnimations()` from inside a `requestAnimationFrame` loop until it found one with
// `playState === 'running'`. Root cause: that condition is itself a shrinking window — the enter
// effect is only 150ms (480ms for `run.tickGrantedFirst`) — and nothing bounds how long it takes
// a slow/overloaded CI runner to get from "toast became visible" (Playwright's own polling) to the
// first `requestAnimationFrame` tick of that loop actually executing in the browser. When that gap
// alone approaches the effect's own duration, the loop never observes a `running` animation (every
// effect this file's `.toast` targets has already reached `finished` for real) and polls forever,
// timing out the test — intermittent by construction, worse on a loaded runner, exactly the
// reported symptom (2.0 min locally vs 6.3 min on the CI runner, only under `ios-safari`).
//
// Fix: stop depending on wall-clock timing at all. Every effect that targets `.toast` in this repo
// uses `fill: 'forwards'` (or, for the short pulse layer, is never explicitly cancelled — see
// `art/vfx/tick-feedback/tick-feedback.ts`), so the `Animation` object it creates stays reachable
// via `el.getAnimations()` indefinitely, regardless of playState, once the element has rendered.
// `readAnimationFrames` below reads that array exactly once, `pause()`s every animation found in
// the very same synchronous browser-side callback (no round trip in between for a slow runner to
// widen), then scrubs each one's `currentTime` to a computed mid-point and finally to its own end
// via `finish()` — a "mid-animation" and a "settled" frame that are the same on every run, fast
// machine or slow, per the tech note's own suggested approach (D-141 follow-up, this task's
// report).
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

interface AnimationFrames {
  readonly mid: Box;
  readonly settled: Box;
}

/** Deterministic replacement for polling `getAnimations()` for a `playState === 'running'` frame
 * (see the P2-X56 note at the top of this file for why that polling approach flaked on a loaded CI
 * runner). Reads every `Animation` currently on `el`, `pause()`s all of them in the same
 * synchronous callback that found them (no gap a slow runner could widen), then measures two
 * frames purely by scrubbing `currentTime` — never by waiting for real time to pass:
 *  - `mid`: every animation parked halfway through its own active interval (`delay +
 *    duration / 2`), i.e. provably still "in flight" regardless of how much wall-clock time has
 *    actually elapsed since it was created.
 *  - `settled`: every animation moved to its own end via `finish()` — the same end state the
 *    player eventually sees, reached instantly instead of by waiting it out. */
async function readAnimationFrames(page: Page, selector: string): Promise<AnimationFrames> {
  return page.locator(selector).evaluate((el) => {
    const anims = el.getAnimations();
    if (anims.length === 0) {
      throw new Error(
        `expected at least one Animation on ${el.className} once it is visible, found none`,
      );
    }
    anims.forEach((anim) => {
      anim.pause();
    });
    for (const anim of anims) {
      const timing = anim.effect?.getComputedTiming();
      const delay = typeof timing?.delay === 'number' ? timing.delay : 0;
      const duration = typeof timing?.duration === 'number' ? timing.duration : 0;
      anim.currentTime = delay + duration / 2;
    }
    const midRect = el.getBoundingClientRect();
    const mid: Box = { x: midRect.x, width: midRect.width };

    anims.forEach((anim) => {
      anim.finish();
    });
    const settledRect = el.getBoundingClientRect();
    const settled: Box = { x: settledRect.x, width: settledRect.width };

    return { mid, settled };
  });
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
    // 90s (vs. the previous 60s): P2-X56 sizes every gating timeout in this file for a runner
    // roughly 3x slower than local (observed CI: 6.3 min vs. 2.0 min locally for the full suite).
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    const viewportWidth = 360;
    await page.setViewportSize({ width: viewportWidth, height: 740 });

    await page.goto(HP_LOW_FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 45_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 30_000 });

    const hpLowToastSelector = '.toast.danger';
    await expect(page.locator(hpLowToastSelector)).toBeVisible({ timeout: 60_000 });

    const expectedCenter = viewportWidth / 2;

    // Both frames read from `run.hpLow`'s own enter/pulse sequence (~150ms enter + 3 pulses) by
    // scrubbing its `Animation`s directly — see `readAnimationFrames` above for why this no longer
    // depends on catching it mid-flight in real time.
    const frames = await readAnimationFrames(page, hpLowToastSelector);

    expect(frames.mid.x).toBeGreaterThanOrEqual(0);
    expect(frames.mid.x + frames.mid.width).toBeLessThanOrEqual(viewportWidth);
    expect(Math.abs(frames.mid.x + frames.mid.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);

    expect(frames.settled.x).toBeGreaterThanOrEqual(0);
    expect(frames.settled.x + frames.settled.width).toBeLessThanOrEqual(viewportWidth);
    expect(
      Math.abs(frames.settled.x + frames.settled.width / 2 - expectedCenter),
    ).toBeLessThanOrEqual(1);
  });
});

// `prefers-reduced-motion: reduce` (art/vfx/core/vfx.js's own reduced-duration path, e.g.
// `hp-critical.ts`'s REDUCED_DURATION_MS): R2-1's fix is a CSS rule (no `transform` on `.toast`),
// never conditioned on this media feature, so centring must hold identically whether or not the
// player has this preference on — the granted-toast fixture is enough here (no need to repeat
// every fixture above at both settings).
test.describe('toast centring holds under prefers-reduced-motion: reduce (360px)', () => {
  test('the granted tick toast still settles centred with reduced motion on', async ({ page }) => {
    // 90s (vs. the previous 60s): P2-X56 sizes every gating timeout in this file for a runner
    // roughly 3x slower than local (observed CI: 6.3 min vs. 2.0 min locally for the full suite).
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    const viewportWidth = 360;
    await page.setViewportSize({ width: viewportWidth, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto(FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 45_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 30_000 });

    const grantedToastSelector = '.toast:has(.toast-line):not(.faded)';
    await expect(page.locator(grantedToastSelector)).toBeVisible({ timeout: 45_000 });

    const expectedCenter = viewportWidth / 2;

    // Settled frame via `readAnimationFrames` (see its own comment above): `finish()`d directly
    // rather than waiting for the reduced-motion fade (100ms) to complete in real time — on a
    // throttled/contended runner the document timeline that drives `Animation` completion can lag
    // wall-clock time by far more than 100ms, which made a real-time "wait until nothing is
    // running" here its own source of flakiness (P2-X56).
    const { settled } = await readAnimationFrames(page, grantedToastSelector);
    expect(settled.x).toBeGreaterThanOrEqual(0);
    expect(settled.x + settled.width).toBeLessThanOrEqual(viewportWidth);
    expect(Math.abs(settled.x + settled.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);
  });
});

for (const viewportWidth of [360, 390] as const) {
  test.describe(`toast centring holds through its own enter animation (${viewportWidth}px)`, () => {
    test('boundingBox stays within the viewport and centred, mid-animation and after', async ({
      page,
    }) => {
      // 90s (vs. the previous 60s): P2-X56 sizes every gating timeout in this file for a runner
      // roughly 3x slower than local (observed CI: 6.3 min vs. 2.0 min locally for the full suite).
      test.setTimeout(90_000);
      await page.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
        delete (Navigator.prototype as any).wakeLock;
      });
      await page.setViewportSize({ width: viewportWidth, height: 740 });

      await page.goto(FIXTURE_URL);

      const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
      await expect(enterButton).toBeEnabled({ timeout: 45_000 });
      await enterButton.click();
      await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 30_000 });

      const grantedToastSelector = '.toast:has(.toast-line):not(.faded)';
      await expect(page.locator(grantedToastSelector)).toBeVisible({ timeout: 45_000 });

      const expectedCenter = viewportWidth / 2;

      // Both frames read from the enter effect (`run.tickGranted`/`run.tickGrantedFirst`) by
      // scrubbing its `Animation`(s) directly — see `readAnimationFrames` above for why this no
      // longer depends on catching it mid-flight in real time. `fill: 'forwards'` means the
      // settled frame reflects the final committed `translateY` (never a horizontal offset, per
      // the R2-1 fix above), so it must read exactly the same as the mid frame.
      const frames = await readAnimationFrames(page, grantedToastSelector);

      expect(frames.mid.x).toBeGreaterThanOrEqual(0);
      expect(frames.mid.x + frames.mid.width).toBeLessThanOrEqual(viewportWidth);
      expect(Math.abs(frames.mid.x + frames.mid.width / 2 - expectedCenter)).toBeLessThanOrEqual(1);

      expect(frames.settled.x).toBeGreaterThanOrEqual(0);
      expect(frames.settled.x + frames.settled.width).toBeLessThanOrEqual(viewportWidth);
      expect(
        Math.abs(frames.settled.x + frames.settled.width / 2 - expectedCenter),
      ).toBeLessThanOrEqual(1);
    });
  });
}
