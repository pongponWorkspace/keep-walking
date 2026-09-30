// QA black-box e2e (P2-F06-T21, copy gate F06 round 2 N2-05: "e2e ของ qa ควรวัดบน S-03-run จริง
// ตามข้อ qa-tester ในหัวข้อ 8" — the copy gate itself only measured `.toast` width against a
// fixture jig, screenshot 07, not against a live `run.hpLow` toast really shown on `S-03-run`
// during a real fight). This spec drives the same real, deterministic level-gap fixture
// `apps/client/e2e/f06-hp.spec.ts` already uses (a level-1 `ranged` player against a level 10-20
// dungeon takes the full damage-gap penalty, D-112) at a real 360 px viewport, waits for the real
// `run.hpLow` toast (`.toast.danger .toast-line`) to actually appear on `S-03-run`, and measures
// its own rendered box height against its own computed line-height — copy rule 2 ("ไม่เกิน 2
// บรรทัด") checked on pixels a player would really see, not on the copy string's character count.
import { expect, test } from '@playwright/test';

const START = '2026-10-02T17:00';
const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;
// Same fixture/seed/class `apps/client/e2e/f06-hp.spec.ts` already proved reaches a 30% low-HP
// warning (and then auto-retreat) well inside its own ~57 minute headroom.
const RUN_URL =
  `/?loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&hud=0&e2eClassId=ranged&seed=7` +
  `&start=${encodeURIComponent(START)}&e2eSkipOnboarding=1&${TILE_OVERRIDE}`;

test.describe('run.hpLow toast — at most 2 rendered lines at a real 360 px viewport, on a real S-03-run', () => {
  test('the toast that actually appears mid-fight never exceeds 2 lines', async ({ page }) => {
    test.setTimeout(60_000);
    // Same fix every other spec against this fixture uses: stay on the normal run screen.
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
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });

    const hpLowLine = page.locator('.toast.danger .toast-line');
    await expect(hpLowLine).toBeVisible({ timeout: 45_000 });
    await expect(hpLowLine).toHaveText(/./); // the real canon sentence, not an empty/raw key

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
