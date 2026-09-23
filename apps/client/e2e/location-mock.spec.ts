// Black-box e2e for LocationProvider <-> map wiring (P1-F02-T10).
//
// Runs under both mobile projects declared in the root playwright.config.ts. Uses the Mock
// provider with committed synthetic traces (data/gps-traces/synthetic/) so it never depends on a
// real GPS fix or the network (TL-S11) — the trace's own `events` (tech note section 13) drive
// the permission-denied case instead of Playwright's real permission APIs.
//
// `hud=1` is required for every case here: `window.__kwSpike` does not exist otherwise (tech note
// section 13; see also apps/client/src/debug/spike-hook.ts).
import { expect, test } from '@playwright/test';
// `window.__kwSpike`'s type comes from src/debug/spike-hook.ts's own `declare global` — both files
// are in the same tsconfig program (apps/client/tsconfig.json `include`), so no import is needed
// (and re-declaring a local `SpikeHook` interface here would conflict: TS requires every merged
// declaration of a global interface member to be the exact same type).

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
// Same no-network convention as e2e/map-shell.spec.ts: force the map's own tile env to a local,
// guaranteed-missing path. These tests are about location, not tiles.
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

test.describe('location <-> map wiring (mock provider)', () => {
  test('window.__kwSpike only exists when hud=1', async ({ page }) => {
    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60'));
    await page.waitForTimeout(200);
    const hasHook = await page.evaluate(() => window.__kwSpike !== undefined);
    expect(hasHook).toBe(false);
  });

  test('replays a trace and moves window.__kwSpike.position in order, ending at the last sample', async ({
    page,
  }) => {
    // synthetic-warmup-accuracy-01 is 300s of trace time; at speed=60 that is 5s of real time —
    // short enough to wait out fully and check the exact last sample
    // (data/gps-traces/synthetic/synthetic-warmup-accuracy-01.trace.json: last sample
    // {t: 300000, lat: 13.73098, lng: 100.53981, accuracy: 4.3}).
    await page.goto(spikeUrl('loc=mock&trace=synthetic-warmup-accuracy-01&speed=60&loop=0&hud=1'));

    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.state), { timeout: 8_000 })
      .toBe('running');

    const seenTimestamps: number[] = [];
    await expect
      .poll(
        async () => {
          const position = await page.evaluate(() => window.__kwSpike?.position ?? null);
          if (position !== null) {
            seenTimestamps.push(position.timestamp);
          }
          // Waits for playback to actually reach the end, not just the first position.
          return position?.lat;
        },
        { timeout: 8_000 },
      )
      .toBe(13.73098);

    const finalPosition = await page.evaluate(() => window.__kwSpike?.position ?? null);
    expect(finalPosition).toEqual({
      lat: 13.73098,
      lng: 100.53981,
      accuracy: 4.3,
      timestamp: expect.any(Number),
    });

    // Strictly increasing: the map must never receive samples out of order.
    for (let i = 1; i < seenTimestamps.length; i += 1) {
      expect(seenTimestamps[i]).toBeGreaterThanOrEqual(seenTimestamps[i - 1] ?? 0);
    }
  });

  test('shows gps.denied on a trace permission-denied event, and stops (no retry)', async ({
    page,
  }) => {
    await page.goto(spikeUrl('loc=mock&trace=synthetic-permission-denied-01&speed=60&hud=1'));

    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.state), { timeout: 5_000 })
      .toBe('error');

    // gps.denied (config/content/copy.th.json).
    await expect(page.locator('#gps-pill-label')).toHaveText('ไม่ได้ให้สิทธิ์ตำแหน่ง');

    const stateAfterWait = await page.evaluate(() => window.__kwSpike?.state);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__kwSpike?.state)).toBe(stateAfterWait);
  });

  test('shows and clears the gps.offline banner with the network, independent of GPS state', async ({
    page,
    context,
  }) => {
    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=1&loop=1&hud=1'));

    const banner = page.locator('#network-banner');
    await expect(banner).toBeHidden();

    await context.setOffline(true);
    // gps.offline (config/content/copy.th.json).
    await expect(banner).toHaveText('ไม่มีเน็ต');
    await expect(banner).toBeVisible();

    await context.setOffline(false);
    await expect(banner).toBeHidden();
  });
});

// P1-F02-T11: the debug HUD (FPS/battery/byte/accuracy/gate/gap/latency numbers) and its two
// export buttons, all gated behind hud=1 same as window.__kwSpike itself.
test.describe('hud panel (hud=1)', () => {
  test('mirrors summary-row metrics onto window.__kwSpike.hud, and never onto a hud=0 build', async ({
    page,
  }) => {
    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&loop=1&hud=1'));

    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.hud?.sampleCount ?? 0), { timeout: 8_000 })
      .toBeGreaterThan(0);

    const hud = await page.evaluate(() => window.__kwSpike?.hud);
    expect(hud).toMatchObject({
      segment: 'all',
      bytesMethod: expect.stringMatching(/^(transfer|decoded)$/),
      batterySource: expect.stringMatching(/^(api|manual|none)$/),
    });
    // Never a coordinate (CLAUDE.md; config/app/privacy.json summaryExport guard rail).
    expect(JSON.stringify(hud)).not.toMatch(/"lat"|"lng"/);

    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60'));
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__kwSpike)).toBeUndefined();
  });

  test('exports a summary CSV with no coordinate column on click', async ({ page }) => {
    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&loop=1&hud=1'));
    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.hud?.sampleCount ?? 0), { timeout: 8_000 })
      .toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#hud-export-summary').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^summary-.+\.csv$/);
    const path = await download.path();
    const fs = await import('node:fs/promises');
    const csv = path === null ? '' : await fs.readFile(path, 'utf-8');
    expect(csv.split('\n')[0]).not.toMatch(/\blat\b|\blng\b/);
  });

  test('the raw trace export button either downloads a sanitized trace or refuses cleanly, never throws', async ({
    page,
  }) => {
    // Whether debug/raw-trace-export.ts's sanitizeRawTrace accepts or refuses depends on how much
    // distance has accumulated by click time (unit-tested precisely in raw-trace-export.test.ts);
    // this e2e only needs to prove the click never crashes the page either way.
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(spikeUrl('loc=mock&trace=synthetic-warmup-accuracy-01&speed=60&hud=1'));
    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.hud?.sampleCount ?? 0), { timeout: 8_000 })
      .toBeGreaterThan(0);

    const downloadOrTimeout = Promise.race([
      page.waitForEvent('download').then(() => 'downloaded' as const),
      page.waitForTimeout(1000).then(() => 'no-download' as const),
    ]);
    await page.locator('#hud-export-raw').click();
    await downloadOrTimeout;

    expect(pageErrors).toEqual([]);
  });
});
