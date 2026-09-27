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

// P2-H38: `e2eSkipOnboarding=1` (D-130, P2-F06-T10) -- without it a fresh page load (no prior
// session) now boots straight into the S-00 intro screen (`onboarding-flow.ts`) and the B4 closed
// popup this file is actually about never renders at all (every case below was silently passing
// vacuously against the intro screen, not the real closed-dungeon UI, until this fix). Same hook
// `apps/client/e2e/full-run.spec.ts` already carries (this file predates onboarding shipping).
function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}&e2eSkipOnboarding=1`;
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

  // Previously (BUG-P2-003 open) this line was the only closed-dungeon signal the player ever
  // saw: `.nav-panel-closed` visible with a next-opening-time value, since the B4 popup below had
  // no walk-in call site yet. Now that `renderClosedIfNeeded` shows the full-screen popup instead,
  // `renderConfirmIfNeeded`'s `showingConfirm` return hides the whole nav panel
  // (`navPanel.root.hidden = true`, `apps/client/src/f04-app.ts`) — this test is retitled to prove
  // the old line stays superseded (hidden), not merely unchecked, now that the popup below is the
  // real B4 screen.
  test('the nav panel closed line stays hidden while standing inside (superseded by the B4 popup, BUG-P2-003 fix)', async ({
    page,
  }) => {
    await page.goto(
      spikeUrl(
        `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&start=${encodeURIComponent(START_MONDAY)}`,
      ),
    );
    // Wait for the real B4 popup to appear first (same wait the case below uses) so this assertion
    // is not just "too early to have rendered yet".
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.nav-panel-closed')).toBeHidden();
    await expect(page.locator('.nav-panel')).toBeHidden();
  });

  // BUG-P2-003 (severity medium, FIXED by P2-F06-T08, gameplay-programmer): spec F04 flow B4
  // (design/ux/flows/F04-dungeon-presence.md line 80) says walking into a closed dungeon for the
  // first time should show the *same* closed popup (`dungeon.closedTitle` + next-open time, no
  // enabled Enter button, only `dungeon.closedDismiss`) that a mid-confirm rejection shows —
  // "เกิดได้ทั้งตอนเดินเข้าเขตครั้งแรก (แทน B1) และตอนกด 'เข้า' แล้ว engine ปฏิเสธ".
  // `apps/client/src/f04-app.ts` now has a real walk-in call site (`renderClosedIfNeeded`,
  // BUG-P2-003 fix) that calls `showClosed()` (`ui/dungeon-confirm.ts`) the instant the player is
  // inside a closed dungeon's polygon with no open dungeon overlapping it — same popup element as
  // a normal confirm (`.confirm-cancel` is still the button, only its text/visibility changes), so
  // this reuses the same locator the "current behaviour" test above no longer can.
  test('BUG-P2-003 — walking into a closed dungeon shows the B4 closed popup', async ({ page }) => {
    await page.goto(
      spikeUrl(
        `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&start=${encodeURIComponent(START_MONDAY)}`,
      ),
    );
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    await expect(popup).toBeVisible({ timeout: 15_000 });
    // `showClosed()` hides the Enter button (`enterButton.hidden = true`) rather than removing it
    // from the DOM — the same `[hidden]`-attribute convention the safety-property test above
    // checks on `.popup` itself, not computed CSS visibility (this app does not style `[hidden]`
    // to `display: none`, so a plain `:visible` pseudo-class assertion would wrongly pass here).
    await expect(popup.locator('button.btn-primary:not([hidden])')).toHaveCount(0);
  });
});
