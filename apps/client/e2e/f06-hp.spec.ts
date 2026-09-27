// P2-F06-T08 black-box e2e for the HP engine's client wiring: the HP bar + 30% warning, the
// auto-retreat default (and turning it off through the real S-22 settings subpage), death losing
// every item, and using a revive potion right away from S-11 inventory while Recovering.
//
// Fixture geometry (`e2e/fixtures/e2e-f06-koa-run-01.trace.json`, this task's own writes): walks
// in from outside the real committed `khlong-ong-ang` dungeon (level range 10-20 — a level-1
// player takes the full damage-gap penalty there, D-112/balance-model 18.3's "ช่วง 10 ขึ้นไป 1.2
// นาทีทุก class"), then loops 80 times around a tight, perfectly even 8-point circle deep inside
// the polygon so the player stays continuously Active. `start=2026-10-02T17:00` pins a Friday
// (khlong-ong-ang's `weekly` opens Fri-Sun 16:00-22:00, closed Mon-Thu) so the dungeon is open;
// `seed=7` + `e2eClassId=ranged` (F06-T10's real class-picker screen does not exist yet, same test
// hook `full-run.spec.ts` already uses) make the RNG deterministic — this task's own simulation
// (through `sessionStep` directly, not re-derived here) found `run_auto_retreat`/`run_death` both
// land well within the first ~200 s of active time for this exact seed/class/trace combination, a
// small fraction of the 80-lap trace's own ~57 minutes of headroom.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const START = '2026-10-02T17:00';
const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function runUrl(extraHash = ''): string {
  return (
    `/?loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&hud=0&e2eClassId=ranged&seed=7` +
    `&start=${encodeURIComponent(START)}&${TILE_OVERRIDE}${extraHash}`
  );
}

test.describe('F06 — HP bar, auto-retreat default, death, revive', () => {
  test('auto-retreat stays on by default: the run ends itself at the threshold and keeps every item', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(runUrl());

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();

    // F06 flow C1: the HP bar is permanent on S-03-run, shown the moment the run starts.
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 5_000 });
    await expect(page.locator('.hp-bar')).not.toBeHidden();
    await expect(page.locator('.hp-percent')).not.toHaveText('');

    const summary = page.locator('.run-summary');
    await expect(summary).not.toBeHidden({ timeout: 45_000 });
    // Flow C4/GD B-01: the canon GDD line, verbatim, on a screen the player can read whenever.
    await expect(summary.locator('.run-summary-canon')).toContainText('HP เหลือต่ำกว่า');
    // F05-R21: auto-retreat keeps every item — never the empty-lost label.
    await expect(summary.locator('.run-summary-rewards')).not.toContainText('ไม่เหลืออะไร');
  });

  test('turning auto-retreat off through the real settings screen lets a run end in death, losing every item', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(runUrl('#/settings'));

    const settingsScreen = page.locator('.settings-walking-safety');
    await expect(settingsScreen).not.toBeHidden();
    const offConfirmOverlay = settingsScreen.locator('.popup-overlay');
    await page.locator('.settings-autoretreat-toggle').click();
    // Turning off requires the one-layer confirm popup (NN-6) — never applied on the first click.
    await expect(offConfirmOverlay).not.toBeHidden();
    await offConfirmOverlay.locator('.btn-danger-confirm').click();
    await page.locator('.settings-close-button').click();
    await expect(settingsScreen).toBeHidden();

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 5_000 });
    // F06-R21: the sticky badge stays up the whole time auto-retreat is off.
    await expect(page.locator('.auto-retreat-off-badge')).not.toBeHidden();

    const summary = page.locator('.run-summary');
    await expect(summary).not.toBeHidden({ timeout: 45_000 });
    await expect(summary.locator('.run-summary-canon')).toContainText('คุณตาย');
    await expect(summary.locator('.run-summary-rewards')).toContainText('ไม่เหลืออะไร');
  });

  test('a revive potion in inventory while Recovering can be used right away, from S-11', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Pre-seeds a Recovering player (support, HP below the recovery line) holding exactly one
    // revive potion — produced once, by this task, from the real engine (`createSession` +
    // `toPersisted`, never hand-typed), the same `kw.p2.session` contract a real returning player's
    // browser would already have. Location/trace do not matter for this screen at all; a short,
    // already-committed replay is enough to boot the app normally.
    const fixture = readFileSync(
      join(FIXTURES_DIR, 'e2e-f06-revive-precondition.session.json'),
      'utf8',
    );
    await page.addInitScript((value) => {
      window.localStorage.setItem('kw.p2.session', value);
    }, fixture);

    await page.goto(
      `/?loc=mock&trace=e2e-f06-koa-run-01&speed=1&loop=0&hud=0&start=${encodeURIComponent(START)}&${TILE_OVERRIDE}#/inventory`,
    );

    const inventoryScreen = page.locator('.inventory-screen');
    await expect(inventoryScreen).not.toBeHidden();
    const reviveRow = inventoryScreen.locator('.inventory-row', { hasText: 'ยาลุกจากพื้น' });
    await expect(reviveRow).toBeVisible();
    const reviveButton = reviveRow.locator('.inventory-use-revive-potion-button');
    await expect(reviveButton).toBeVisible();

    await reviveButton.click();

    // The potion is gone (qty was exactly 1) — F06 C8's own "no button, not a disabled one" rule
    // means the row itself disappears once used.
    await expect(inventoryScreen.locator('.inventory-use-revive-potion-button')).toHaveCount(0);
  });
});
