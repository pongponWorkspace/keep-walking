// Black-box smoke test for the map spike shell (P1-F02-T09).
//
// Runs under both mobile projects declared in the root playwright.config.ts
// ("android-chrome" and "ios-safari"), which is the "tested with device
// emulation" acceptance item.
//
// TL-S11: e2e must never download a tile or other large data. This test forces every VITE_* value
// to a local, guaranteed-missing path via the `e2e*Url` query params (see src/env.ts,
// withTestEnvOverrides) instead of relying on whatever `.env.local` happens to be on the machine
// running the build. `kw-light.style.json` (P1-F02-T11) still builds successfully from these —
// `style.ts`'s substitution only needs a syntactically valid string for each of the three, never a
// URL that actually has to resolve — and MapLibre attaches its canvas before any of them is
// actually fetched (PMTiles is lazy; glyphs/sprite are only requested once a tile needs them).
// D-031: `VITE_TILES_URL` must itself carry the `pmtiles://` prefix now (`map.ts` no longer adds
// it), and `VITE_GLYPHS_URL` must contain the literal `{fontstack}/{range}.pbf` template segment
// (`map/style.ts`'s `deriveFontFaceUrl`).
//
// Run: pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then (in another shell) pnpm test:e2e
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { copyEntries } from '@keep-walking/shared';

// Playwright's own Node/ESM runner (unlike Vite and Vitest, both of which transform a bare JSON
// import) cannot `import ... from '.../copy.th.json'` without an import attribute — so this reads
// the same file `src/copy/load.ts` reads, by path, through plain `fs` + `JSON.parse` instead of
// reusing that module directly (`copyEntries` itself, from `@keep-walking/shared`, is a pure
// function over already-parsed JSON and has no such import).
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
 * hasn't added it yet. */
function getCopyText(key: string): string {
  return copyIndex.get(key)?.text ?? key;
}

// The bare path a real request for the archive resolves to: `map/protocol.ts`'s counting
// `pmtiles.Source` fetches `tilesUrl` with the `pmtiles://` prefix already stripped off, so a
// network request never carries that scheme.
const MISSING_LOCAL_TILES_SUFFIX = '/e2e-fixtures/does-not-exist.pmtiles';
const MISSING_LOCAL_GLYPHS_SUFFIX = '/e2e-fixtures/does-not-exist/glyphs/{fontstack}/{range}.pbf';
const MISSING_LOCAL_SPRITE_SUFFIX = '/e2e-fixtures/does-not-exist/sprites/v4/light';

/** Builds the spike URL with every `VITE_*` override as a fully-qualified, same-origin URL: real
 * deployments never configure `VITE_GLYPHS_URL`/`VITE_SPRITE_URL` as scheme-less paths (tech note
 * section 8's own examples are always absolute), and `map/protocol.ts`'s `toKwHttpsUrl` assumes an
 * `http(s)://` input — a bare `/path` would build a malformed `kw+https:///path` URL. `baseURL`
 * comes from the `baseURL` fixture so this works under both `E2E_BASE_URL` and the config default. */
function spikeUrl(baseURL: string): string {
  const tiles = `pmtiles://${baseURL}${MISSING_LOCAL_TILES_SUFFIX}`;
  const glyphs = `${baseURL}${MISSING_LOCAL_GLYPHS_SUFFIX}`;
  const sprite = `${baseURL}${MISSING_LOCAL_SPRITE_SUFFIX}`;
  return (
    `/?e2eTilesUrl=${encodeURIComponent(tiles)}` +
    `&e2eGlyphsUrl=${encodeURIComponent(glyphs)}` +
    `&e2eSpriteUrl=${encodeURIComponent(sprite)}`
  );
}

test.describe('map spike shell', () => {
  test('renders a MapLibre canvas from a pmtiles:// source on a mobile viewport', async ({
    page,
    baseURL,
  }) => {
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));

    await page.goto(spikeUrl(baseURL ?? 'http://localhost:4173'));

    // MapLibre attaches its own canvas once the Map is constructed; this
    // does not wait on any tile actually loading.
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

    // TL-S13: the attribution control must be present and not collapsed behind a compact "i"
    // control on a narrow phone viewport. Only `kw-provinces` (a `geojson` source, "loaded" with
    // an empty FeatureCollection synchronously, no network needed) is guaranteed to have
    // contributed its attribution by now — MapLibre only folds a vector source's `attribution` in
    // once that source has completed at least one style-data pass, which the deliberately-missing
    // `pmtiles://` archive this test uses never does. The full "OpenStreetMap + Protomaps" pairing
    // (kw-light.style.json's `sources.protomaps.attribution`, art-director-owned, TL-S13) is
    // verified against the real committed Lumpini fixture in this task's manual field-walk-readiness
    // check (see the P1-F02-T11 report), not in this network-free CI test.
    const attribution = page.locator('.maplibregl-ctrl-attrib');
    await expect(attribution).toContainText('OpenStreetMap');

    // TL-S11: only local requests (the page's own JS/CSS bundle and the
    // deliberately-missing local fixture) are made; nothing external.
    // QA note (P2-F04-T10, ios-safari flaky ~40%): MapLibre's worker is instantiated from a
    // `blob:` URL (`new Worker(URL.createObjectURL(...))`, needed now that the worker is loaded
    // lazily alongside maplibre-gl itself, see this task's code-split below). A `blob:` URL's
    // `new URL(...).host` is always `''` — it is same-origin by construction (the blob was created
    // by this same page, it can never point at another origin) — so this loop skips `blob:`
    // entries instead of failing the "every request has the page host" assertion on them.
    for (const url of requestedUrls) {
      if (url.startsWith('blob:')) {
        continue;
      }
      const parsed = new URL(url);
      expect(parsed.host).toBe(new URL(page.url()).host);
    }
    expect(requestedUrls.some((url) => url.includes(MISSING_LOCAL_TILES_SUFFIX))).toBe(true);
  });

  test('fills the mobile viewport edge-to-edge with a locked-in viewport meta tag', async ({
    page,
    baseURL,
  }) => {
    await page.goto(spikeUrl(baseURL ?? 'http://localhost:4173'));

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

  test('shows an honest fallback (not a blank screen, not the bare key) when no tiles URL is configured', async ({
    page,
  }) => {
    // Explicit query override to "unset" (blank), independent of whatever
    // this machine's .env.local happens to contain (TL-S11).
    await page.goto('/?e2eTilesUrl=&e2eGlyphsUrl=&e2eSpriteUrl=');

    await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(0);
    // P1-X42: `main.ts` now renders this through `getCopyText`, so the assertion reads the real
    // Thai copy the same way (never the bare `client.mapSpike.tilesUrlMissing` key string) — this
    // still fails honestly if narrative ever removes the key, since `getCopyText` would then fall
    // back to the key itself and this expectation would no longer match.
    await expect(page.locator('#map')).toHaveText(getCopyText('client.mapSpike.tilesUrlMissing'));
  });

  test('shows the start-location and follow-toggle buttons exactly once, never overlapping', async ({
    page,
    baseURL,
  }) => {
    // P1-X25 regression test. The P1-X23 ios-safari screenshot
    // (e2e/__screenshots__/P1-X23-lumpini-xyz-ios-safari.jpg) showed what looked like a doubled
    // follow-mode button. It was not a double DOM mount (`mountGpsUi` has one call site,
    // src/main.ts) — `#start-location` (shown because a built/preview app defaults to the `web`
    // provider, config/app/client.json `#providerQueryDefaultsByMode`, same as this spec's own
    // default — see `spikeUrl` above) and `#follow-toggle` (always shown) are two distinct real
    // buttons that shared one row and collided, because their content is the literal, long
    // `client.mapSpike.*` copy key (TL-N06: no narrative-designer text exists for these two
    // dev-only affordances yet) rather than final short Thai copy. This guards both halves: no
    // duplicate element, and the two boxes never overlap regardless of copy length (src/app.css).
    //
    // P2-X38 (R47/CLAUDE.md "GPS never requested without consent"): `#start-location` is now shown
    // only once `kw.p2.consent.location === 'granted'` (`main.ts`'s own boot-time gate) — this is a
    // rendering-regression test about the button's own layout, not about the consent flow itself, so
    // it seeds an already-granted consent the same way a returning, previously-onboarded tester's
    // browser would already have, rather than driving the real onboarding screens first.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'kw.p2.consent',
        JSON.stringify({ schemaVersion: 1, savedAt_ms: 0, state: { location: 'granted' } }),
      );
    });
    await page.goto(spikeUrl(baseURL ?? 'http://localhost:4173'));

    const startButton = page.locator('#start-location');
    const followButton = page.locator('#follow-toggle');
    await expect(startButton).toHaveCount(1);
    await expect(followButton).toHaveCount(1);
    await expect(startButton).toBeVisible();
    await expect(followButton).toBeVisible();

    const startBox = await startButton.boundingBox();
    const followBox = await followButton.boundingBox();
    expect(startBox).not.toBeNull();
    expect(followBox).not.toBeNull();
    if (startBox !== null && followBox !== null) {
      const overlaps =
        startBox.x < followBox.x + followBox.width &&
        startBox.x + startBox.width > followBox.x &&
        startBox.y < followBox.y + followBox.height &&
        startBox.y + startBox.height > followBox.y;
      expect(overlaps).toBe(false);
    }
  });
});
