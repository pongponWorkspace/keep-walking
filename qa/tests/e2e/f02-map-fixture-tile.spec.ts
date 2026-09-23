// QA-owned e2e (P1-F02-T13, TC-MAP-02/06, board acceptance 'พิสูจน์ "จุดขยับบนแผนที่" ... กับ
// fixture tile (TL-S04)'). Runs under the root Playwright config's two mobile projects
// (playwright.config.ts testMatch: qa/tests/e2e/**/*.spec.ts).
//
// Uses the real Lumpini PMTiles fixture (tools/tiles/fixtures/lumpini) instead of the
// guaranteed-missing path apps/client's own e2e/map-shell.spec.ts uses, so this test also proves
// byte-range serving works end to end (F1 "HTTP Byte Serving" class of bug) without downloading
// anything or standing up a real HTTP server: `page.route()` intercepts every fixture fetch (the
// pmtiles:// archive, glyph pbf, sprite json/png, font-face ttf) to a fake origin and answers it
// from the local fixture files on disk (TL-S11 — no network, no port to bind).
//
// P1-X24 fix: the original version of this spec passed empty `e2eGlyphsUrl`/`e2eSpriteUrl`
// (relying on a real style's own default sources). Since P1-X11/X23, `apps/client/src/map.ts`'s
// `createMap` requires all three `VITE_*`-equivalent values (tiles, glyphs, sprite) to be set or it
// returns `undefined` and never creates a map at all (docs/tech/F02-map-location-spike.md section
// 12, F15) — so the canvas never existed. This version supplies all three from the committed
// fixture (tech-lead's route-helper pattern in apps/client/e2e/map-real-fixture.spec.ts), and
// additionally asserts MapLibre's `load` actually fires and that basemap features are really
// rendered (queryRenderedFeatures), not just that a canvas element exists (D-068, F15).
//
// Prerequisite (same as apps/client/e2e/*): from repo root,
//   pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then, in another shell: pnpm test:e2e
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

// This spec's typecheck runs under the root tsconfig.json (qa/tests/**/*.ts), a separate program
// from apps/client/tsconfig.json where apps/client/src/debug/spike-hook.ts declares the same
// global — no merge conflict across programs. Kept minimal (only the fields this test reads); `map`
// is typed just enough to call `queryRenderedFeatures` and read `_loaded` (mirrors the cast
// apps/client/e2e/map-real-fixture.spec.ts uses for the same two reads).
declare global {
  interface Window {
    __kwSpike?: {
      readonly state: string;
      readonly position: {
        readonly lat: number;
        readonly lng: number;
        readonly timestamp: number;
      } | null;
      readonly map?: {
        readonly _loaded?: boolean;
        queryRenderedFeatures(options: { layers: readonly string[] }): readonly unknown[];
      };
    };
  }
}

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const FIXTURE_DIR = join(REPO_ROOT, 'tools/tiles/fixtures/lumpini');
const TILESET_ID = 'pm4-20260923-z15-lumpini';

const FIXTURE_ORIGIN = 'https://qa-fixture.invalid';
const PMTILES_URL = `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

const LOAD_TIMEOUT_MS = 15_000;
/** Same subset apps/client/e2e/map-real-fixture.spec.ts checks; layers guaranteed to have geometry
 * across the fixture's zoom range (art/direction/map-style/kw-light.style.json). */
const BASEMAP_LAYERS = ['earth', 'landuse_park', 'water', 'roads_minor', 'roads_major'];

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.pbf': 'application/x-protobuf',
  '.pmtiles': 'application/octet-stream',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range',
  'access-control-expose-headers': 'content-range, content-length, accept-ranges',
};

function spikeUrl(query: string): string {
  const params = new URLSearchParams(query);
  params.set('e2eTilesUrl', PMTILES_URL);
  params.set('e2eGlyphsUrl', GLYPHS_URL);
  params.set('e2eSpriteUrl', SPRITE_URL);
  return `/?${params.toString()}`;
}

/** Resolves a request URL under FIXTURE_ORIGIN to a file inside FIXTURE_DIR — same pattern as
 * apps/client/e2e/map-real-fixture.spec.ts's `fixturePathFor`, kept local since QA may only write
 * inside qa/tests/. Guards against escaping the fixture directory. */
function fixturePathFor(url: string): string | undefined {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const resolved = normalize(join(FIXTURE_DIR, pathname));
  if (!resolved.startsWith(FIXTURE_DIR + sep)) {
    return undefined;
  }
  try {
    return statSync(resolved).isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

/** Answers any fixture fetch (pmtiles archive, glyph pbf, sprite json/png, font-face ttf) from the
 * on-disk fixture, with Range support (TL-S11: no network, no port to bind). */
async function fulfillFromFixture(route: Route, served: string[]): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const path = fixturePathFor(request.url());
  if (path === undefined) {
    await route.fulfill({ status: 404, headers: CORS_HEADERS, body: '' });
    return;
  }
  served.push(new URL(request.url()).pathname);
  const body = readFileSync(path);
  const headers = {
    ...CORS_HEADERS,
    'accept-ranges': 'bytes',
    'content-type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
  };
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers()['range'] ?? '');
  if (range === null) {
    await route.fulfill({ status: 200, headers, body });
    return;
  }
  const start = Number(range[1]);
  const end = range[2] !== undefined && range[2] !== '' ? Number(range[2]) : body.length - 1;
  const last = Math.min(end, body.length - 1);
  await route.fulfill({
    status: 206,
    headers: { ...headers, 'content-range': `bytes ${start}-${last}/${body.length}` },
    body: body.subarray(start, last + 1),
  });
}

/** `Map#_loaded` flips true right before MapLibre fires `load` (once, never reset). Read directly
 * because `load` can fire before a test-side listener could be attached (mirrors
 * apps/client/e2e/map-real-fixture.spec.ts's `mapLoadFired`). Proves F15's failure mode (worker
 * never starts, so `load` never fires even though a canvas exists) cannot recur silently. */
async function mapLoadFired(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__kwSpike?.map?._loaded === true);
}

/** Counts basemap (non-label) features currently rendered — proof tiles actually decoded and
 * painted, not just that a canvas element exists over a black/empty map. */
async function basemapFeatureCount(page: Page): Promise<number> {
  return page.evaluate(
    (layers) => window.__kwSpike?.map?.queryRenderedFeatures({ layers }).length ?? 0,
    BASEMAP_LAYERS,
  );
}

test.describe('map + real fixture tile (Lumpini PMTiles) + mock location', () => {
  test('load fires, basemap tiles render from the real fixture, and the position dot moves with the trace', async ({
    page,
  }) => {
    const served: string[] = [];
    const consoleErrors: string[] = [];
    await page.route(`${FIXTURE_ORIGIN}/**`, (route) => {
      void fulfillFromFixture(route, served);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&loop=1&hud=1'));

    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

    // F15 (docs/tech/F02-map-location-spike.md section 12, D-068): `load` must actually fire, not
    // just a canvas element existing over a dead worker / unconfigured map.
    await expect.poll(() => mapLoadFired(page), { timeout: LOAD_TIMEOUT_MS }).toBe(true);

    await expect
      .poll(() => page.evaluate(() => window.__kwSpike?.state), { timeout: 8_000 })
      .toBe('running');

    const firstPosition = await page.evaluate(() => window.__kwSpike?.position ?? null);
    await page.waitForTimeout(1_000); // real time; speed=60 covers many trace-seconds
    const laterPosition = await page.evaluate(() => window.__kwSpike?.position ?? null);

    expect(firstPosition).not.toBeNull();
    expect(laterPosition).not.toBeNull();
    expect(laterPosition?.timestamp).toBeGreaterThan(firstPosition?.timestamp ?? 0);
    expect(laterPosition).not.toEqual(firstPosition); // the dot actually moved

    // The trace starts inside the fixture bbox and follow mode (map/location-layer.ts) recenters
    // the camera on every sample, so by now the basemap should have decoded and painted real
    // features at the style's own default zoom (15) — not merely a canvas over an unloaded tile.
    await expect
      .poll(() => basemapFeatureCount(page), { timeout: LOAD_TIMEOUT_MS })
      .toBeGreaterThan(0);

    // Proves the fixture was really exercised for all three sources (not skipped because of the
    // earlier no-network/short-circuit path this spec used to hit before P1-X24).
    expect(served.some((p) => p.endsWith('.pmtiles'))).toBe(true);
    expect(served.some((p) => p.startsWith('/glyphs/'))).toBe(true);
    expect(served.some((p) => p.startsWith('/sprites/'))).toBe(true);

    // F1 class of bug: a server that ignores Range and always returns 200+full body breaks
    // MapLibre/PMTiles with a console error mentioning byte serving.
    const byteServingErrors = consoleErrors.filter((line) => /byte serving/i.test(line));
    expect(byteServingErrors).toEqual([]);
  });
});
