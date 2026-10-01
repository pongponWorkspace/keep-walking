// P2-X67 (acceptance 2; product/reviews/F10-product-gate.md findings F10-PM-01/F10-PM-02; QA
// coverage NAV-10/STORY-09, both previously GAP/PARTIAL): black-box proof that two pairs of F10
// events really land in the client's own `kw.p2.telemetry` ring buffer, not just "the handler code
// reads right" (what the product gate could verify without a browser) --
//
//   F10-PM-01: tapping a nav tab records `nav_tab_opened{tab}`; tapping one of the three
//   not-yet-built tabs (upgrade/shop/party) also records `coming_soon_viewed{tab}` alongside it.
//   F10-PM-02: the "ข้าม" (skip) link on story slides 1-4 records `story_skipped
//   {slide_index_at_skip}` with the slide actually showing when it was tapped.
//
// Reads `kw.p2.telemetry` the same way `apps/client/e2e/onboarding.spec.ts` already does (plain
// `localStorage.getItem` + `JSON.parse`), just unwrapping `local-store.ts`'s envelope
// (`{schemaVersion, savedAt_ms, state}`) to get the actual record array instead of only doing a
// substring `.toContain` check -- this file asserts the *value* of `tab`/`slide_index_at_skip`,
// which a substring match cannot do safely (e.g. telling slide 1 apart from slide 14 would not be
// an issue here, but matching a property name without its value proves nothing about which tab).
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const START = '2026-10-02T12:00';
const HOME_FIXTURE_URL =
  '/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;
const ONBOARDING_FIXTURE_URL =
  `/?loc=mock&trace=e2e-onboarding-01&speed=60&loop=0&hud=0&seed=1` +
  `&start=${encodeURIComponent(START)}`;

interface TelemetryRecord {
  readonly event_name: string;
  readonly client_ts_ms: number;
  readonly properties: Readonly<Record<string, unknown>>;
}

/** `telemetry/sink.ts#serialize` writes the ring buffer as a plain `JSON.stringify(records)` array
 * -- unlike every other `kw.p2.*` key in this app, this one carries no `local-store.ts` envelope
 * (`{schemaVersion, savedAt_ms, state}`) around it, confirmed by reading `kw.p2.telemetry` back in
 * a live page. `[]` on a missing/corrupt key, same "never throw" convention every reader of this
 * key in this repo already follows. */
async function readTelemetryRecords(page: Page): Promise<readonly TelemetryRecord[]> {
  const raw = await page.evaluate(() => window.localStorage.getItem('kw.p2.telemetry'));
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as readonly TelemetryRecord[]) : [];
  } catch {
    return [];
  }
}

async function gotoHome(page: Page): Promise<void> {
  await page.goto(HOME_FIXTURE_URL);
  await expect(page.locator('.bottombar-f10')).toBeVisible({ timeout: 20_000 });
}

test.describe('F10-PM-01: nav_tab_opened / coming_soon_viewed land in telemetry storage', () => {
  test('Inventory then upgrade/shop/party tapped back-to-back each record their own event(s)', async ({
    page,
  }) => {
    await gotoHome(page);

    // Inventory is a real screen (flow E2), not "coming soon" -- must fire `nav_tab_opened` alone.
    await page.locator('.nav-tab[data-tab="inventory"]').click();
    await expect(page.locator('.inventory-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });

    // Straight from Inventory to each "coming soon" tab in turn -- no detour back through Map
    // between taps (the task brief's "กดแท็บ ... เร็วๆ นี้"): each tap's destination differs from
    // `currentRoute`, so `f04-app.ts`'s own `onSelect` guard (`tab === activeTab` -> no-op, no
    // telemetry) never swallows any of these.
    for (const tab of ['upgrade', 'shop', 'party'] as const) {
      await page.locator(`.nav-tab[data-tab="${tab}"]`).click();
      await expect(page.locator('.coming-soon-screen:not([hidden])')).toBeVisible({
        timeout: 5_000,
      });
    }

    const records = await readTelemetryRecords(page);
    const navTabs = records
      .filter((r) => r.event_name === 'nav_tab_opened')
      .map((r) => r.properties['tab']);
    const comingSoonTabs = records
      .filter((r) => r.event_name === 'coming_soon_viewed')
      .map((r) => r.properties['tab']);

    // Order proves these are the real taps above, not a coincidental earlier record: Inventory
    // first (no pairing), then upgrade/shop/party in the order tapped, each paired with its own
    // `coming_soon_viewed` (product/telemetry-events.md: "คู่กันเวลาเดียวกันเสมอ").
    expect(navTabs).toEqual(['inventory', 'upgrade', 'shop', 'party']);
    expect(comingSoonTabs).toEqual(['upgrade', 'shop', 'party']);

    // The pairing is at the same instant (f04-app.ts's `onSelect` handler fires both `record()`
    // calls synchronously, no `await` between) -- same `client_ts_ms` for a tab's two records.
    for (const tab of ['upgrade', 'shop', 'party'] as const) {
      const navRecord = records.find(
        (r) => r.event_name === 'nav_tab_opened' && r.properties['tab'] === tab,
      );
      const comingSoonRecord = records.find(
        (r) => r.event_name === 'coming_soon_viewed' && r.properties['tab'] === tab,
      );
      expect(navRecord?.client_ts_ms).toBe(comingSoonRecord?.client_ts_ms);
    }
  });
});

/** Fresh login -> age gate (bypass, 1990) -> consent decline (R03: skips the permission-priming
 * screen too, same shortcut `capture-f10-screens.ts`'s `reachCreateCharacterFresh` uses) -> create
 * a character -> click "ถัดไป" until `slide` is showing. Returns with the story screen's `slide`
 * visible and its skip link not yet tapped. */
async function reachStorySlide(page: Page, slide: 1 | 2 | 3 | 4): Promise<void> {
  await page.goto(ONBOARDING_FIXTURE_URL);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.intro-start').click();
  await page.locator('.login-screen:not([hidden])').waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.login-google-button').click();
  await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.locator('.age-gate-confirm').click();
  await page
    .locator('.consent-location-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.consent-location-decline').click();
  await expect(page.locator('.create-character-screen:not([hidden])')).toBeVisible({
    timeout: 5_000,
  });
  await page.locator('.class-select-card[data-class-id="ranged"]').click();
  await page.locator('.name-field-input').fill('testplayer');
  await page.locator('.create-character-button').click();
  await expect(page.locator('.story-screen:not([hidden])')).toBeVisible({ timeout: 5_000 });
  for (let i = 1; i < slide; i += 1) {
    await page.locator('.story-next-button').click();
  }
  await expect(page.locator('.story-title')).toBeVisible({ timeout: 5_000 });
}

test.describe('F10-PM-02: skipping on story slides 1-4 records story_skipped with the right slide', () => {
  for (const slide of [1, 2, 3, 4] as const) {
    test(`"ข้าม" on slide ${slide} records slide_index_at_skip: ${slide}`, async ({ page }) => {
      await reachStorySlide(page, slide);
      // R27: the skip link only exists (not `hidden`) on slides 1-4 -- `story-screen.ts`'s own
      // `skipLink.hidden = isLast`, exercised here rather than re-asserted (not this test's job).
      await page.locator('.story-skip-link').click();
      await expect(page.locator('.story-screen')).toBeHidden({ timeout: 5_000 });

      const skipped = (await readTelemetryRecords(page)).filter(
        (r) => r.event_name === 'story_skipped',
      );
      expect(skipped).toHaveLength(1);
      expect(skipped[0]?.properties['slide_index_at_skip']).toBe(slide);
    });
  }
});
