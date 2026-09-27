// Black-box e2e for the whole F04/F05 loop (P2-F05-T10): confirm -> run -> reward tick toast ->
// manual exit -> run summary, driven end-to-end through the real Mock provider at speed=60 with
// no game math computed by this spec — every asserted number is read off the rendered DOM only,
// the same screens a player sees.
//
// Fixture: `e2e/fixtures/e2e-full-run-01.trace.json` (this task's own writes, not
// `data/gps-traces/` — see `src/location/traces.ts`'s doc comment for why). It walks in from
// outside `leelawadee-lawn` (twice `anticheat.checkIn.minContinuousApproach_s`), then loops inside
// for longer than one `dungeons.rewardTick.rewardTickInterval_s` window before holding still —
// the "golden vector" this spec checks against is derived from that timing plus
// `dungeons.movementGate`, not from a second, hand-maintained implementation of the reward
// formulas (CLAUDE.md: no game math on the client, and that includes the test for it).
//
// `?e2eClassId=tanker` (`clock/query-params.ts`): F06-T10's real class-picker screen does not
// exist yet, so this is the only way today to get `player.classId` off `null` (otherwise every
// `confirm` is rejected `no_class` and no run ever starts) — the same `chooseClass` input a real
// tap would send (`session/engine.ts`'s own doc comment on `testForceClassId`).
import { expect, test } from '@playwright/test';

// `seed=1` (ADR 0003 section 6, `loc=mock`-only test hook): pins the RNG so the granted tick's
// loot roll is reproducible. Every seed this task tried against this fixture granted exactly one
// tick (the timing-only prediction below never depends on the seed); `seed=1` additionally always
// rolls at least one common item on that tick, so the loot-list assertion is deterministic too.
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1';

// The fixture's own reward math (config, not re-derived here):
// dungeons.rewardTick.rewardTickInterval_s = 300, dungeons.movementGate.minDistancePerWindow_m =
// 50 — the trace loops a ~50 m-circumference path at 1.3 m/s for 340 s once inside, comfortably
// clearing one full window (>= 300 s active, >= 50 m walked) and stopping partway into a second
// (never enough for a second grant). The predicted, timing-only outcome is therefore exactly one
// evaluated window and exactly one granted tick — never re-derived from the drop-table RNG, which
// is qa-tester's own black-box replay (P2-F05-T11), not this spec's job.
const EXPECTED_TICKS_EVALUATED = 1;
const EXPECTED_TICKS_GRANTED = 1;

test.describe('F04/F05 whole run (Mock provider, speed=60)', () => {
  test('confirm -> run -> granted tick toast -> manual exit -> run summary matches the golden tick count', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto(FIXTURE_URL);

    // Flow F04 section 3: the confirm popup's "เข้า" button only enables once the real
    // `selectCheckInPreview` (not this spec) says the approach chain is satisfied.
    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 20_000 });
    await enterButton.click();

    // dungeon_entered: the run screen appears (F04 flow section 6).
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 5_000 });

    // F05 flow Flow A1: a granted-tick toast (never `.faded`, that is A3's denied style) — the one
    // this task built (`ui/tick-toast.ts`), distinguished from the unrelated `#gps-toast` status
    // toast (`ui/gps-ui.ts`) by its own `.toast-line` child.
    const grantedToast = page.locator('.toast:has(.toast-line):not(.faded)');
    await expect(grantedToast).toBeVisible({ timeout: 30_000 });

    // Flow B7: the player leaves on their own terms — `manual_exit`, never a game-decided ending.
    await page.locator('.run-exit-button').click();
    await page.locator('.run-bar .btn-danger-confirm').click();

    const summary = page.locator('.run-summary');
    await expect(summary).not.toBeHidden({ timeout: 5_000 });

    // Flow B4/B6: `manual_exit` gets no extra canon line (that is death/auto_retreat only).
    await expect(summary.locator('.run-summary-canon')).toHaveText('');

    // Flow B3: engine numbers only, the golden vector this trace was authored against.
    await expect(summary.locator('.run-summary-tick-row')).toContainText(
      `${EXPECTED_TICKS_GRANTED}`,
    );
    await expect(summary.locator('.run-summary-tick-row')).toContainText(
      `${EXPECTED_TICKS_EVALUATED}`,
    );

    // Flow B1: the one granted window's loot (`drops.json#baseChancePerRewardTick_pct.common`
    // 100 %) — a rendered name-plus-quantity row, never a raw item id or a broken image.
    const rewardRows = summary.locator('.run-summary-reward-row');
    await expect(rewardRows).not.toHaveCount(0);
  });
});
