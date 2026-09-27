// P2-F04-T22 — board acceptance "เข้า dungeon ที่ปิดไม่ได้ (closed screen with next opening
// time)", against a real committed dungeon that is closed all day on the day this spec pins down
// (khlong-ong-ang: `weekly["1"] = []`, i.e. closed the whole ISO Monday — see
// docs/tech/F04-dungeon-presence.md section 8 for `openingHours.utcOffset_min` = UTC+7, no DST).
// `start=2026-09-28T10:00` (a Monday) pins the Mock game clock so this is deterministic
// (docs/tech/F04-dungeon-presence.md section 17 test hook), never depending on the real wall
// clock at CI run time.
import { expect, test } from '@playwright/test';

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;
const START_MONDAY = '2026-09-28T10:00';

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

test.describe('F04 — a closed dungeon cannot be entered', () => {
  test('the safety property holds: no enabled "enter" button ever appears while standing inside a closed dungeon', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(
      spikeUrl(
        `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&start=${encodeURIComponent(START_MONDAY)}`,
      ),
    );
    // Poll for most of the trace's real duration (400 s trace time / speed 10 = 40 s): at no
    // point may an enabled Enter button exist anywhere on the page.
    const deadline = Date.now() + 35_000;
    while (Date.now() < deadline) {
      const enabledEnterButtons = await page
        .locator('.popup:not([hidden]) button.btn-primary:enabled')
        .count();
      expect(enabledEnterButtons).toBe(0);
      await page.waitForTimeout(1_000);
    }
  });

  test('the nav panel shows closed + a next-opening-time value while standing inside (current behaviour)', async ({
    page,
  }) => {
    await page.goto(
      spikeUrl(
        `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&start=${encodeURIComponent(START_MONDAY)}`,
      ),
    );
    const closedLine = page.locator('.nav-panel-closed');
    await expect(closedLine).toBeVisible({ timeout: 15_000 });
    await expect(closedLine).not.toHaveText('');
  });

  // BUG-P2-003 (severity medium, OPEN, owner gameplay-programmer): spec F04 flow B4
  // (design/ux/flows/F04-dungeon-presence.md line 80) says walking into a closed dungeon for the
  // first time should show the *same* closed popup (`dungeon.closedTitle` + next-open time, no
  // Enter button, only `dungeon.closedDismiss`) that a mid-confirm rejection shows — "เกิดได้ทั้ง
  // ตอนเดินเข้าเขตครั้งแรก (แทน B1) และตอนกด 'เข้า' แล้ว engine ปฏิเสธ". `apps/client/src/f04-app.ts`
  // only ever shows this popup never; `renderConfirmIfNeeded`'s `openDungeonsContaining` filters to
  // `status === 'open'` before ever building the candidate list, so a closed dungeon produces *no*
  // popup on walk-in at all (only the nav panel's closed line, proven above) — `showClosed()`
  // (`ui/dungeon-confirm.ts`) has no real call site anywhere in `apps/client/src` (grepped) besides
  // the developer's own isolated unit test. The safety property (no way to actually enter) still
  // holds — this is a missing UX affordance, not a reward/anti-cheat gap.
  test('BUG-P2-003 — walking into a closed dungeon shows the B4 closed popup (spec-correct, currently fails)', async ({
    page,
  }) => {
    test.fail(true, 'BUG-P2-003: showClosed() has no walk-in call site yet, see qa/bugs.md');
    await page.goto(
      spikeUrl(
        `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&start=${encodeURIComponent(START_MONDAY)}`,
      ),
    );
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(popup.locator('button.btn-primary')).toHaveCount(0);
  });
});
