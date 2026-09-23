// Real Lumpini fixture + real kw-light style e2e (P1-X23 regression test).
//
// Proves what e2e/map-shell.spec.ts and qa/tests/e2e/f02-map-fixture-tile.spec.ts never checked:
// that MapLibre's `load` actually fires and vector tiles actually render (with Thai labels) from
// the committed fixture (tools/tiles/fixtures/lumpini) under the real
// art/direction/map-style/kw-light.style.json, through both tile paths D-031 supports:
// `pmtiles://` (Range requests) and TileJSON/XYZ (via the `kw+https` protocol).
//
// Root cause this guards (see src/map/worker.ts): the maplibre-gl 6 worker file was never emitted
// by the Vite build, `/assets/maplibre-gl-worker.mjs` returned index.html, and the dead worker
// meant no tile or GeoJSON source ever finished loading, so `load` never fired (black map).
//
// TL-S11: no external network and no port to bind. Every fixture byte is answered by
// `page.route()` from disk under a fake origin (`http://`, so the `kw+https` scheme round trip
// for a plain-http host is exercised too, like tools/tiles/bin/serve.py). Only the app itself comes
// from the preview server (same prerequisite as the other specs):
//   pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
//   pnpm test:e2e
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

const FIXTURE_DIR = join(import.meta.dirname, '..', '..', '..', 'tools/tiles/fixtures/lumpini');
const FIXTURE_ORIGIN = 'http://kw-fixture.test';
const TILESET_ID = 'pm4-20260923-z15-lumpini';

const PMTILES_URL = `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
const TILEJSON_URL = `${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/tiles.json`;
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

/** Lumpini Park, inside the fixture bbox (manifest.json `bbox`). kw-light.style.json's own
 * center is Sanam Luang, outside the fixture, so the test moves the camera here. */
const LUMPINI_CENTER: [number, number] = [100.5415, 13.7305];
const LUMPINI_ZOOM = 16;

const LOAD_TIMEOUT_MS = 15_000;
const THAI_SCRIPT = /[\u0E00-\u0E7F]/;
const BASEMAP_LAYERS = ['earth', 'landuse_park', 'water', 'roads_minor', 'roads_major'];
const LABEL_LAYERS = [
  'water_label_point',
  'water_label_line',
  'pois_label',
  'roads_label_minor',
  'roads_label_major',
  'places_neighbourhood',
  'places_locality',
];

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.mvt': 'application/x-protobuf',
  '.pbf': 'application/x-protobuf',
  '.pmtiles': 'application/octet-stream',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range, if-match, if-none-match',
  'access-control-expose-headers': 'content-range, content-length, etag',
  'accept-ranges': 'bytes',
};

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

/** The committed tiles.json points at serve.py (127.0.0.1:8765); re-point it at the fake origin
 * the same way tools/tiles/bin/set-public-url.sh does for a real deploy. */
function rewriteTileJson(bytes: Buffer): Buffer {
  const doc = JSON.parse(bytes.toString('utf-8')) as Record<string, unknown>;
  doc['tiles'] = [`${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/{z}/{x}/{y}.mvt`];
  return Buffer.from(JSON.stringify(doc), 'utf-8');
}

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
  const raw = readFileSync(path);
  const body: Buffer = path.endsWith('tiles.json') ? rewriteTileJson(raw) : raw;
  const headers = {
    ...CORS_HEADERS,
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

function spikeUrl(tilesUrl: string): string {
  const params = new URLSearchParams({
    hud: '1', // window.__kwSpike (and its `map`) only exists with hud=1
    e2eTilesUrl: tilesUrl,
    e2eGlyphsUrl: GLYPHS_URL,
    e2eSpriteUrl: SPRITE_URL,
  });
  return `/?${params.toString()}`;
}

/** `Map#_loaded` is the flag MapLibre flips right before it fires `load` (once, never reset).
 * Read directly because `load` can fire before a test-side listener could be attached. */
async function mapLoadFired(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const map = window.__kwSpike?.map as unknown as { _loaded?: boolean } | undefined;
    return map?._loaded === true;
  });
}

async function jumpToLumpiniAndIdle(page: Page): Promise<void> {
  await page.evaluate(
    ({ center, zoom }) =>
      new Promise<void>((resolve) => {
        const map = window.__kwSpike?.map;
        if (map === undefined) {
          throw new Error('window.__kwSpike.map missing');
        }
        map.once('idle', () => resolve());
        map.jumpTo({ center, zoom });
      }),
    { center: LUMPINI_CENTER, zoom: LUMPINI_ZOOM },
  );
}

interface RenderedSummary {
  readonly basemapFeatures: number;
  readonly thaiLabels: readonly string[];
}

async function renderedSummary(page: Page): Promise<RenderedSummary> {
  return page.evaluate(
    ({ basemapLayers, labelLayers, thaiSource }) => {
      const map = window.__kwSpike?.map;
      if (map === undefined) {
        return { basemapFeatures: 0, thaiLabels: [] };
      }
      const thai = new RegExp(thaiSource);
      const labels = map
        .queryRenderedFeatures({ layers: labelLayers })
        .flatMap((f) => Object.values(f.properties ?? {}))
        .filter((v): v is string => typeof v === 'string' && thai.test(v));
      return {
        basemapFeatures: map.queryRenderedFeatures({ layers: basemapLayers }).length,
        thaiLabels: [...new Set(labels)].slice(0, 10),
      };
    },
    { basemapLayers: BASEMAP_LAYERS, labelLayers: LABEL_LAYERS, thaiSource: THAI_SCRIPT.source },
  );
}

const CASES = [
  { name: 'pmtiles:// (Range requests)', tilesUrl: PMTILES_URL, tileRequest: /\.pmtiles$/ },
  { name: 'TileJSON / XYZ (kw+https)', tilesUrl: TILEJSON_URL, tileRequest: /\.mvt$/ },
] as const;

test.describe('real Lumpini fixture + real kw-light style', () => {
  for (const c of CASES) {
    test(`load fires and Lumpini renders with Thai labels via ${c.name}`, async ({
      page,
    }, testInfo) => {
      const served: string[] = [];
      const workerUrls: string[] = [];
      await page.route(`${FIXTURE_ORIGIN}/**`, (route) => fulfillFromFixture(route, served));
      page.on('worker', (worker) => workerUrls.push(worker.url()));

      await page.goto(spikeUrl(c.tilesUrl));
      await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

      // 1. `load` fires (it never did before the P1-X23 fix).
      await expect.poll(() => mapLoadFired(page), { timeout: LOAD_TIMEOUT_MS }).toBe(true);

      // 2. The MapLibre worker is a real script, not the SPA's index.html fallback.
      const appWorker = workerUrls.find((u) => u.includes('maplibre-gl-worker'));
      expect(appWorker, `workers seen: ${workerUrls.join(', ')}`).toBeDefined();
      const workerResponse = await page.request.get(appWorker ?? '');
      expect(workerResponse.headers()['content-type'] ?? '').toContain('javascript');

      // 3. Tiles render inside the fixture bbox, with Thai labels placed.
      await jumpToLumpiniAndIdle(page);
      await expect
        .poll(async () => (await renderedSummary(page)).basemapFeatures, {
          timeout: LOAD_TIMEOUT_MS,
        })
        .toBeGreaterThan(0);
      await expect
        .poll(async () => (await renderedSummary(page)).thaiLabels.length, {
          timeout: LOAD_TIMEOUT_MS,
        })
        .toBeGreaterThan(0);

      expect(served.some((p) => c.tileRequest.test(p))).toBe(true);
      expect(served.some((p) => p.startsWith('/glyphs/'))).toBe(true);
      expect(served.some((p) => p.startsWith('/sprites/'))).toBe(true);

      const summary = await renderedSummary(page);
      testInfo.annotations.push({
        type: 'thai-labels',
        description: summary.thaiLabels.join(' | '),
      });
      await page.screenshot({ path: testInfo.outputPath('lumpini-real-style.png') });
    });
  }
});
