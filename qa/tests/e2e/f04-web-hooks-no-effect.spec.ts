// P2-F05-T16 (QA gate F04+F05): D-130 requires that all four Mock-only test hooks — `start`,
// `seed`, `e2eClassId` and `e2eSkipF04App` (param names from
// `config/app/client.json#providerQuery.paramNames`) — have no effect at all under `loc=web` (the
// default, real-GPS provider a real player's build always uses). Unit tests already prove each
// hook's own gating function returns the "ignored" branch when `isMockProvider` is false
// (`apps/client/src/f04-app.test.ts:42-63`, `apps/client/src/env.test.ts:104`,
// `apps/client/src/clock/query-params.test.ts`) — this file is the second layer the tech gate
// asked for (docs/reviews/F04-F05-tech-gate.md section 9.4): the same four params, driven through
// a real page load of the real bundle, asserted from the outside (DOM + `localStorage`) rather
// than by calling the gating functions directly.
//
// No dungeon walk-in is attempted here (unlike qa/tests/e2e/f04-checkin-confirm-flow.spec.ts):
// under `loc=web` a real player cannot reach `Active` in this build at all yet regardless of any
// hook, because `player.classId` can only ever become non-null through a real `chooseClass` tap
// (F06-T10's class-picker screen) and `e2eClassId` — the one hook that could set it another way —
// is exactly the thing test 3 below proves stays inert. That is itself a stronger, structural
// witness that `seed` (which only ever matters once a run starts) cannot leak into a real player's
// session through this URL: there is no code path under `loc=web` today that ever reaches
// `runSeed` at all.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
// Same no-network convention as every other spec in this folder (TL-S11): these cases are about
// the four query hooks, not the map, so the tile env is forced fully unconfigured.
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function webUrl(query: string): string {
  return `/?loc=web&${query}&${TILE_OVERRIDE}`;
}

const SESSION_STORAGE_KEY = 'kw.p2.session';

interface ParsedSession {
  readonly schemaVersion: number;
  readonly savedAt_ms: number;
  readonly state: { readonly player: { readonly classId: string | null } };
}

async function readSession(page: Page): Promise<ParsedSession | null> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as ParsedSession);
}

test.describe('D-130 — start/seed/e2eClassId/e2eSkipF04App are inert under loc=web', () => {
  test('e2eSkipF04App=1 does not skip building the F04 app (nav panel still mounts)', async ({
    page,
  }) => {
    // Under `loc=mock`, `e2eSkipF04App=1` leaves `f04App` `undefined` forever and none of its
    // screens (`ui/nav-panel.ts` included) ever mount (`main.ts` lines ~259-327). If this hook
    // were honored under `loc=web` too, `.nav-panel` would never appear either. `main.ts` mounts
    // it (hidden or not) the moment `createF04App` runs, well before any real GPS fix is needed.
    await page.goto(webUrl('e2eSkipF04App=1'));
    await expect(page.locator('.nav-panel')).toHaveCount(1, { timeout: 15_000 });
  });

  test('start=<a date 25+ years in the past> does not move the game clock used to persist the session', async ({
    page,
  }) => {
    const beforeNav_ms = Date.now();
    // `?start=2000-01-01T00:00`: if honored, `createGameClock` would still pick
    // `createWebGameClock()` for a non-mock provider regardless (`clock/game-clock.ts`), but the
    // hook is checked here from the outside: `kw.p2.session`'s own `savedAt_ms` (the `now_ms` the
    // session engine's boot `tick` was called with, `session/engine.ts` -> `session/persist.ts`)
    // must land near real wall-clock time, not near the year 2000.
    await page.goto(webUrl('start=2000-01-01T00%3A00'));
    await expect
      .poll(async () => (await readSession(page)) !== null, { timeout: 15_000 })
      .toBe(true);
    const afterRead_ms = Date.now();
    const session = await readSession(page);
    expect(session).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
    const savedAt_ms = session!.savedAt_ms;
    // Generous window (page boot + polling latency), but the year-2000 value is over 800 billion
    // ms away — no plausible amount of test latency confuses the two.
    expect(savedAt_ms).toBeGreaterThanOrEqual(beforeNav_ms - 5_000);
    expect(savedAt_ms).toBeLessThanOrEqual(afterRead_ms + 5_000);
  });

  test('seed and e2eClassId together never reach the persisted player: classId stays null', async ({
    page,
  }) => {
    // Under `loc=mock`, `e2eClassId=tanker` makes `session/engine.ts`'s `createSessionEngine`
    // dispatch a real `chooseClass` input once at boot (`testForceClassId`), which would persist
    // `state.player.classId = 'tanker'` immediately. `seed=123` would similarly reach
    // `resolveRunSeed` the moment any `confirm` succeeds. Under `loc=web`, `main.ts` passes
    // `isMockProvider: false` to `createF04App`, so `resolveE2eClassId` returns `undefined`
    // (`f04-app.ts`) and `testForceClassId` is never set — the boot-time `chooseClass` dispatch
    // above must never fire, and the freshly created player's `classId` must stay `null`.
    await page.goto(webUrl('seed=123&e2eClassId=tanker'));
    await expect
      .poll(async () => (await readSession(page)) !== null, { timeout: 15_000 })
      .toBe(true);
    const session = await readSession(page);
    expect(session).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
    expect(session!.state.player.classId).toBeNull();
  });
});
