// QA black-box e2e (P2-F06-T21, copy gate F06 round 2 N2-05: "e2e ของ qa ควรวัดบน S-03-run จริง
// ตามข้อ qa-tester ในหัวข้อ 8" — the copy gate itself only measured `.toast` width against a
// fixture jig, screenshot 07, not against a live `run.hpLow` toast really shown on `S-03-run`
// during a real fight). This spec waits for the real `run.hpLow` toast (`.toast.danger
// .toast-line`) to actually appear on `S-03-run` at a real 360 px viewport, then measures its own
// rendered box height against its own computed line-height — copy rule 2 ("ไม่เกิน 2 บรรทัด")
// checked on pixels a player would really see, not on the copy string's character count.
//
// P2-X55 (root cause + fix, replaces the original `e2e-f06-koa-run-01` fixture): CI run
// 36733352198 (commit 4d29ada) failed on `ios-safari` and was flaky on `android-chrome` even
// though the local suite (2.0 min, CI=1 TZ=UTC) passed 106/106 — the CI runner takes 6.3 min for
// the same suite, i.e. it is meaningfully slower. `art/reviews/screens/F04-F06/README.md` §7.5
// already diagnosed the exact same class of failure for a *screenshot* against this same koa
// fixture (level-1 `ranged` vs `khlong-ong-ang` level 10-20, D-112 gap penalty): every
// class x seed replay lands `run_hp_low` and `run_auto_retreat` on the *same hit*, so the real
// window between "HP first renders in the warning band" and "the run ends and the summary
// replaces the toast" measured only **~348 ms** in a live browser. That is not a fixed sleep this
// spec ever used, but it is exactly the margin `expect(hpLowLine).toBeVisible()` +
// `hpLowLine.evaluate(...)` had to complete inside before something (a GC pause, a slower paint,
// retry/attach overhead) raced past it and left the toast already unmounted — a 6.3-vs-2.0-minute
// runner has plenty of headroom to lose 348 ms. §9 of the same README confirms the fix that was
// already applied to the *screenshot* capture script (`qa/tests/e2e/visual/
// capture-f04-f06-screens.ts`'s `reach12HpLow`): location-engineer's `synthetic-hp-low-
// leelawadee-01` (`data/gps-traces/README.md` §7, P2-H57), replayed with `tanker&seed=15`, keeps
// HP genuinely inside the (0%, 30%] warning band with the run still Active for 370 trace-seconds
// = 6.17 s real at `speed=60` — about 17x the old margin — before auto-retreat ever fires. On top
// of that, the toast's own visible hold (`config/app/client.json#toast.hpLowHoldDurationMs` = 4000
// ms, read by `apps/client/src/ui/tick-toast.ts`) is a real wall-clock `setTimeout`, unaffected by
// the mock trace's `speed` multiplier, so once the toast mounts it stays in the DOM for a further
// ~4 s real regardless of how slow or fast the CI runner is. Switching to this trace removes the
// race entirely instead of papering over it with a longer sleep.
//
// Second, independent finding from the same investigation (not the CI failure itself, but a
// latent bug in this spec's own measurement that the wider window above newly exposed): `run.hpLow`
// plays a 3-pulse `scale()` Web Animation directly on the `.toast.danger` element itself
// (`art/vfx/hp-critical/hp-critical.ts#runHpLow`, peak `scale(1.06)`, total 550 ms, held via
// `fill: 'forwards'` at each step) before settling back to `scale(1)`. `getBoundingClientRect()`
// reflects that transform, so reading it mid-pulse reports a box up to ~6% wider/taller than its
// true CSS layout box -- exactly the `toastWidth <= 329` failures this spec's own first real run
// produced (335-345 px measured, not a real max-width violation: `getComputedStyle(el).width` was
// `328px` throughout, confirmed by direct reproduction). This is a real product bug, but it is in
// this test's measurement technique, not in `.toast.danger`'s CSS -- so this spec waits for both
// Web Animations on the element to reach `playState: 'finished'` (real animation-completion state,
// not a fixed sleep) before reading either metric.
import { expect, test } from '@playwright/test';

const START = '2026-10-02T12:00'; // Friday, inside leelawadee-lawn's daily 05:00-21:00 window,
// >=1:35h before close (README §7's own condition for this trace)
const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;
// `synthetic-hp-low-leelawadee-01` + `tanker&seed=15` (README §7's recommended pairing, confirm at
// trace-time 120): the real polygon of `leelawadee-lawn` (level 1-5, no D-112 gap penalty at
// level 1), replayed so HP first crosses into the (0%, 30%] warning band ~63 s real after "enter"
// at `speed=60`, then stays in that band with the run still Active for a further 6.17 s real
// before auto-retreat -- the wide, real window this spec needs instead of the old ~348 ms one.
const RUN_URL =
  `/?loc=mock&trace=synthetic-hp-low-leelawadee-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=15` +
  `&start=${encodeURIComponent(START)}&e2eSkipOnboarding=1&${TILE_OVERRIDE}`;

// CI run 36733352198 measured the runner at ~3.15x the local suite's own wall time (6.3 min vs
// 2.0 min for the same 106 tests). These budgets size every real wait in this spec at least that
// factor above its own nominal, real-world target (never a fixed sleep) so the same margin that
// broke on that runner cannot recur even on a further-loaded box.
const SLOW_RUNNER_FACTOR = 3;
const ENTER_ENABLED_NOMINAL_MS = 30_000; // trace reaches inside the polygon ~2s real at speed=60
const RUN_BAR_VISIBLE_NOMINAL_MS = 20_000;
const HP_LOW_VISIBLE_NOMINAL_MS = 63_000; // README §7: "ถึงช่วงเตือนราว 63 วินาทีจริงหลังกด เข้า"
// `art/vfx/hp-critical/hp-critical.ts`'s own `run.hpLow` pulse totals 550ms real (never scaled by
// the mock trace's `speed`) -- this budget only needs to comfortably clear that, well inside the
// toast's own 4000ms hold (`config/app/client.json#toast.hpLowHoldDurationMs`).
const ANIMATIONS_SETTLED_NOMINAL_MS = 2_000;

test.describe('run.hpLow toast — at most 2 rendered lines at a real 360 px viewport, on a real S-03-run', () => {
  test('the toast that actually appears mid-fight never exceeds 2 lines', async ({ page }) => {
    test.setTimeout(
      (ENTER_ENABLED_NOMINAL_MS +
        RUN_BAR_VISIBLE_NOMINAL_MS +
        HP_LOW_VISIBLE_NOMINAL_MS +
        ANIMATIONS_SETTLED_NOMINAL_MS) *
        SLOW_RUNNER_FACTOR,
    );
    // Same fix every other spec against a run screen uses: stay on the normal run screen.
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });
    // The copy gate's own C6-02/N2-05 concern is specifically the narrowest committed viewport
    // (360 px) -- this is not one of the two Playwright device profiles this repo already runs
    // (Pixel 7 is 412 px wide, iPhone 14 is 390 px), so this spec pins its own.
    await page.setViewportSize({ width: 360, height: 740 });

    await page.goto(RUN_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({
      timeout: ENTER_ENABLED_NOMINAL_MS * SLOW_RUNNER_FACTOR,
    });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({
      timeout: RUN_BAR_VISIBLE_NOMINAL_MS * SLOW_RUNNER_FACTOR,
    });

    // Real DOM-state wait (Playwright's own polling assertion), not a fixed sleep: this resolves
    // the moment `run.hpLow` actually mounts, however long that real-world wait turns out to be on
    // this particular machine, up to the slow-runner budget above.
    const hpLowLine = page.locator('.toast.danger .toast-line');
    await expect(hpLowLine).toBeVisible({
      timeout: HP_LOW_VISIBLE_NOMINAL_MS * SLOW_RUNNER_FACTOR,
    });
    await expect(hpLowLine).toHaveText(/./); // the real canon sentence, not an empty/raw key

    // Guard the fixture's own claim (README §7): the run must still be Active, not already ended,
    // while we measure -- otherwise this would silently degrade back into measuring a stale toast
    // mid-teardown, the exact race this trace switch exists to remove.
    await expect(page.locator('.run-summary')).toBeHidden();

    // Real animation-state wait, not a fixed sleep: resolves the moment both of `run.hpLow`'s own
    // Web Animations (`enter`, `pulse`) reach `playState: 'finished'` and the element's transform
    // has settled back to `scale(1)` -- see the header comment's second finding. `getAnimations()`
    // returns `[]` once nothing is running, so the `.length > 0` guard only accepts a real,
    // observed transition through at least one in-flight animation on this element, not an empty
    // list that happened to be read before either animation started.
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.toast.danger');
        if (el === null) return false;
        const anims = el.getAnimations();
        return anims.length > 0 && anims.every((a) => a.playState === 'finished');
      },
      undefined,
      { timeout: ANIMATIONS_SETTLED_NOMINAL_MS * SLOW_RUNNER_FACTOR },
    );

    const metrics = await hpLowLine.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(style.lineHeight),
      };
    });
    expect(metrics.lineHeight).toBeGreaterThan(0);
    // Real number of rendered lines, rounded (sub-pixel layout rounding, same tolerance a human
    // eyeballing a screenshot would apply) -- copy rule 2's "ไม่เกิน 2 บรรทัด" checked on the box a
    // player actually sees, not by re-counting characters in `copy.th.json`.
    const renderedLines = Math.round(metrics.height / metrics.lineHeight);
    expect(renderedLines).toBeLessThanOrEqual(2);

    // The toast's own container must be able to grow up to the viewport's real budget (F06 copy
    // gate C6-02: `max-width: calc(100vw - 32px)`, i.e. <= 328px at 360px wide) -- checked as an
    // upper bound only, so a narrower, well-wrapped toast is never penalized here.
    const toastWidth = await page
      .locator('.toast.danger')
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(toastWidth).toBeLessThanOrEqual(360 - 32 + 1); // +1px rounding tolerance
  });
});
