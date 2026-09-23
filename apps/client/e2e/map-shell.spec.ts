// Black-box smoke test for the map spike shell (P1-F02-T09).
//
// Runs under both mobile projects declared in the root playwright.config.ts
// ("android-chrome" and "ios-safari"), which is the "tested with device
// emulation" acceptance item.
//
// TL-S11: e2e must never download a tile or other large data. This test
// forces every VITE_* value to a local, guaranteed-missing path via the
// `e2e*Url` query params (see src/env.ts, withTestEnvOverrides) instead of
// relying on whatever `.env.local` happens to be on the machine running the
// build. The request for that missing path 404s instantly and stays local
// (Vite preview's own static server) — nothing is fetched over the network,
// and MapLibre still initializes because a source's `attribution` string
// comes from the style JSON itself, not from a successfully fetched tile.
//
// Run: pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then (in another shell) pnpm test:e2e
import { expect, test } from '@playwright/test';

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const SPIKE_URL =
  `/?e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}` + '&e2eGlyphsUrl=&e2eSpriteUrl=';

test.describe('map spike shell', () => {
  test('renders a MapLibre canvas from a pmtiles:// source on a mobile viewport', async ({
    page,
  }) => {
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));

    await page.goto(SPIKE_URL);

    // MapLibre attaches its own canvas once the Map is constructed; this
    // does not wait on any tile actually loading.
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

    // TL-S13: exact attribution text must be present and not collapsed
    // behind a compact "i" control on a narrow phone viewport.
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toContainText('OpenStreetMap contributors');
    await expect(attribution).toContainText('Protomaps');

    // TL-S11: only local requests (the page's own JS/CSS bundle and the
    // deliberately-missing local fixture) are made; nothing external.
    for (const url of requestedUrls) {
      const parsed = new URL(url);
      expect(parsed.host).toBe(new URL(page.url()).host);
    }
    expect(requestedUrls.some((url) => url.includes(MISSING_LOCAL_TILES_PATH))).toBe(true);
  });

  test('fills the mobile viewport edge-to-edge with a locked-in viewport meta tag', async ({
    page,
  }) => {
    await page.goto(SPIKE_URL);

    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);

    const appBox = await page.locator('#app').boundingBox();
    const viewportSize = page.viewportSize();
    expect(appBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();
    if (appBox !== null && viewportSize !== null) {
      expect(appBox.width).toBe(viewportSize.width);
      expect(appBox.height).toBe(viewportSize.height);
    }
  });

  test('shows an honest, key-shaped fallback (not a blank screen) when no tiles URL is configured', async ({
    page,
  }) => {
    // Explicit query override to "unset" (blank), independent of whatever
    // this machine's .env.local happens to contain (TL-S11).
    await page.goto('/?e2eTilesUrl=&e2eGlyphsUrl=&e2eSpriteUrl=');

    await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(0);
    await expect(page.locator('#map')).toHaveText('client.mapSpike.tilesUrlMissing');
  });
});
