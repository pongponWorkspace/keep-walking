// P2-F04-T22 (C2-1): every request the app itself issues during a full run (confirm -> Active ->
// exit) must stay within the app's own allowed origins — except the external navigation link,
// which is a top-level navigation the player chooses themselves, not a `fetch`/`XHR` of the app
// (tech note F04 14.1, `config/app/privacy.json`'s own comment on `navigation.externalOpenTimeout_ms`:
// "the link is a top-level navigation chosen by the player ... outside the allowed-origin list of
// config/app/client.json").
//
// [ASSUMPTION A-P2-F04-T22-2: `config/app/client.json` has no `allowedOrigins`/allowlist key at all
// (grepped: only `allowedProviders`/`allowedMockSpeeds`, neither is an origin list), even though
// `config/app/privacy.json`'s own comment and `docs/tech/F04-dungeon-presence.md` section 14.1 both
// refer to "the allowed-origin list of config/app/client.json" as if it already existed. This is a
// gap against P2-F04-T25's own acceptance ("รายการ origin ที่อนุญาตใน config/app/client.json
// (C2-1)"), reported as a handoff to tech-lead/gameplay-programmer in this task's report (not filed
// as a qa/bugs.md defect — it is a missing config entry, not a behavioural regression). Without a
// declared allowlist to diff against, this spec instead asserts the strongest thing it can check
// directly: every request the app issues during a full run stays same-origin as the page itself
// (`baseURL`) — no third-party host is ever contacted, matching the doc's "ไม่มี request ออกนอก
// เครื่อง" for telemetry and this env's own guaranteed-missing tile path (no map network at all).
// Owner: qa-tester (this assumption), confirm: tech-lead.]
import { expect, test } from '@playwright/test';

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

test.describe('C2-1 — every app request during a full run stays same-origin', () => {
  test("confirm -> Active -> exit issues no request to any origin other than the page's own", async ({
    page,
    baseURL,
  }) => {
    const baseOrigin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const foreignRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== baseOrigin) foreignRequests.push(request.url());
    });

    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10'));
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).toBeVisible();

    // Let the run continue a while (some ticks/state churn) before exiting.
    await page.waitForTimeout(5_000);
    await page.locator('.run-exit-button').click();
    await page.locator('button.btn-danger-confirm').click();
    await expect(page.locator('.run-summary, .run-bar')).toBeVisible();

    expect(foreignRequests).toEqual([]);
  });

  test('the navigation link itself is a top-level, player-chosen navigation to a real maps host — not a fetch of the app, and correctly excluded above', async ({
    page,
  }) => {
    // `qa-e2e-leelawadee-checkin-01` starts well outside the polygon (the approach walk) — at
    // speed=1 (real time) that is about a minute of real outside-the-dungeon time before it ever
    // crosses in, plenty of window to catch the nav panel (not the confirm popup) showing its
    // navigate button, matching the flow this exclusion is actually about (F04 flow section 2,
    // the A2 nearby panel).
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=1&loop=0'));
    const navLink = page.locator('.nav-navigate-button');
    await expect(navLink).toBeVisible({ timeout: 15_000 });
    const href = await navLink.getAttribute('href');
    expect(href).not.toBeNull();
    if (href === null) return;
    const target = new URL(href);
    // A real external maps host (google.com or apple.com) — never the app's own origin, and never
    // opened as a same-tab `fetch`/`XHR` (the element is `target="_blank" rel="noopener noreferrer"`,
    // tech note 14.1: "การเปิดลิงก์เป็น navigation ระดับบนที่ผู้เล่นเลือก ไม่ใช่ request ของแอป").
    expect(['www.google.com', 'maps.apple.com']).toContain(target.hostname);
    expect(await navLink.getAttribute('target')).toBe('_blank');
    expect(await navLink.getAttribute('rel')).toBe('noopener noreferrer');
    // Never the player's own position anywhere in the URL query.
    expect(target.search).not.toMatch(/origin=/);
  });
});
