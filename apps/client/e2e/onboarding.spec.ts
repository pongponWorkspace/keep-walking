// P2-F06-T10 black-box e2e for the whole "10 นาทีแรก" onboarding sequence (GDD "10 นาทีแรกของคน
// ใหม่", spec F06 3.8, `apps/client/src/onboarding-flow.ts`), driven end-to-end through the real
// Mock provider at speed=60 -- no game math computed by this spec, every asserted value is read
// off the rendered DOM only (CLAUDE.md: no reward logic on the client, and that includes the test
// for it):
//
//   map + opening line (S-00-intro) -> class-select sheet (S-00-class-select, R29) -> nearest
//   OPEN, level-covering rift with straight-line distance + navigate link (F06-R37, the nav panel
//   P2-F04-T06 already built) -> confirm popup with the real level range + the single N-3
//   tutorial line -> first reward (a normal `sessionStep` tick, GD B-07 -- `run.tickGrantedFirst`/
//   `run.continueCta` are display-only emphasis, never a second reward code path).
//
// Fixture: `e2e/fixtures/e2e-onboarding-01.trace.json` (this task's own writes, not
// `data/gps-traces/` -- same convention as `full-run.spec.ts`'s own fixture). It extends that
// spec's own `e2e-full-run-01` leelawadee-lawn approach/loop path with a longer outside-approach
// leg (24 extra samples, +2 real-world minutes of trace time = +2 s at speed=60) so this spec has
// a real-time window to observe the nav panel's recommended-rift state before the confirm popup
// opens, then keeps the exact same validated loop/hold-still tail.
//
// `e2eClassId`/`e2eSkipOnboarding` (D-130) are deliberately never passed here -- this is the one
// spec whose whole point is to drive the real intro/class-select screens themselves, the same taps
// a first-time player makes.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { copyEntries } from '@keep-walking/shared';

// Same approach as `map-shell.spec.ts`: Playwright's Node/ESM runner cannot import the JSON
// directly the way Vite/Vitest do, so this reads the exact file `src/copy/load.ts` reads by path.
const COPY_TH_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'config',
  'content',
  'copy.th.json',
);
const copyIndex = copyEntries(JSON.parse(readFileSync(COPY_TH_PATH, 'utf8')) as unknown);

/** Same fallback as `src/copy/load.ts`'s `getCopyText` (TL-N06): the key itself when narrative
 * has not written it yet -- never a hand-typed Thai literal in this test (BUG-P2-005). */
function getCopyText(key: string): string {
  return copyIndex.get(key)?.text ?? key;
}

// `start=2026-10-02T12:00` (Friday noon, `clock/query-params.ts`'s `YYYY-MM-DDTHH:mm` test hook):
// pins the game clock inside every candidate park-preset dungeon's own daily 05:00-21:00 opening
// window (`data/dungeons/dungeons.json`), the same way `f06-hp.spec.ts`'s own `START` constant
// pins a real weekly-hours dungeon open -- without it, this spec would only pass while the
// machine running it happens to be inside that window in its own real local time (D-089's
// `temporarilyClosed` home state is the honest, correct behaviour outside it, not a bug this test
// should ever hit).
const START = '2026-10-02T12:00';
const FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

test.describe('Onboarding 0-10 minutes (Mock provider, speed=60)', () => {
  test('intro -> class select -> nearby open rift -> confirm + N-3 line -> first reward -> continue prompt', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto(FIXTURE_URL);

    // Minute 0: the single opening line (R36, no skip button) on top of the already-visible map.
    const intro = page.locator('.intro-screen:not([hidden])');
    await expect(intro).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.intro-message')).toHaveText(getCopyText('onboarding.intro'));
    await intro.click();

    // Minute 0-1: the class-select sheet (R29) -- forced before the map is usable, no separate
    // confirm layered on top, exactly the four `PlayerClass` cards.
    const classSheet = page.locator('.class-select-overlay:not([hidden])');
    await expect(classSheet).toBeVisible({ timeout: 5_000 });
    const classCards = page.locator('.class-select-card');
    await expect(classCards).toHaveCount(4);
    await classCards.first().click();
    await expect(classSheet).toBeHidden();

    // F06-R37: the recommended rift is the nearest OPEN dungeon whose level range covers the
    // player (level 1) -- straight-line distance chip + a real navigate link, no route drawn.
    const navChip = page.locator('.nav-panel .chip-distance:not([hidden])');
    await expect(navChip).toBeVisible({ timeout: 10_000 });
    await expect(navChip).not.toHaveText('');
    await expect(page.locator('.nav-navigate-button')).toBeVisible();

    // The confirm popup opens once inside the polygon, with the real level range from its first
    // frame (F04 flow B-01) -- no market/enhance/raid/stat/lore content anywhere on this path.
    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 20_000 });
    await expect(page.locator('.confirm-level')).not.toHaveText('');
    await enterButton.click();

    // dungeon_entered while !firstRewardDone: N-3, the single tutorial line of the whole game.
    await expect(page.locator('.run-tutorial-line:not([hidden])')).toHaveText(
      getCopyText('dungeon.confirmTutorialLine'),
    );

    // First reward: the exact same granted-tick toast every later tick uses (GD B-07 -- no
    // separate reward path), only with the first-ever emphasis lines instead of the repeat copy.
    const grantedToast = page.locator('.toast:has(.toast-line):not(.faded)');
    await expect(grantedToast).toBeVisible({ timeout: 30_000 });
    await expect(grantedToast).toContainText(getCopyText('run.tickGrantedFirst'));
    await expect(grantedToast.locator('.toast-continue-cta')).toHaveText(
      getCopyText('run.continueCta'),
    );

    // Forbidden-to-teach systems (market, enhance, raid, stat points, class change, detailed
    // party, anti-cheat, long lore) never appear anywhere on this screen -- no Phase 2 client
    // screen renders any of them yet (`config/unlocks-teach-lock.ts`'s own doc comment), so the
    // absence of any such element is the honest assertion here.
    for (const forbidden of ['.market', '.enhance-screen', '.raid-screen', '.stat-allocation']) {
      await expect(page.locator(forbidden)).toHaveCount(0);
    }
  });
});
