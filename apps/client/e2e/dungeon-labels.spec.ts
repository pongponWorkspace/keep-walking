// P1-X33: proves the P1-H06 duplicate-label bug is actually fixed against a real MapLibre map
// (not just the pure-geometry unit tests in src/map/dungeons-source.test.ts).
//
// Feeds `art/direction/map-style/samples/dungeons.sample.geojson` through the real adapter
// (`buildDungeonFeatureCollections`, imported straight from source — this file only needs its pure
// functions, never a live MapLibre `Map`, so it runs fine under Playwright's own Node-side test
// process) and pushes the two resulting FeatureCollections into a live map with `kw-light.style.json`
// 0.2.0 over the committed Lumpini fixture (same route-fulfillment pattern as
// map-real-fixture.spec.ts). Then queries `kw-rift-name`/`kw-rift-count` and expects exactly one
// rendered feature per dungeon `id` — the old (pre-P1-X32/X33) approach of feeding the polygon
// straight into the symbol layers rendered 2–4 duplicates per dungeon (qa/reports/F02/map-style/
// P1-H06-screenshot-tests.md section 5).
//
// Run: pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then (in another shell) pnpm test:e2e
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import {
  buildDungeonFeatureCollections,
  createDungeonLabelCache,
} from '../src/map/dungeons-source';
import type { DungeonGeometry, DungeonInput } from '../src/map/dungeons-source';

const FIXTURE_DIR = join(import.meta.dirname, '..', '..', '..', 'tools/tiles/fixtures/lumpini');
const FIXTURE_ORIGIN = 'http://kw-fixture.test';
const TILESET_ID = 'pm4-20260923-z15-lumpini';
const PMTILES_URL = `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

const SAMPLES_DIR = join(import.meta.dirname, '..', '..', '..', 'art/direction/map-style/samples');

const LOAD_TIMEOUT_MS = 15_000;
const ZOOM = 16;

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

async function fulfillFromFixture(route: Route): Promise<void> {
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
  const body = readFileSync(path);
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

function spikeUrl(): string {
  const params = new URLSearchParams({
    hud: '1',
    e2eTilesUrl: PMTILES_URL,
    e2eGlyphsUrl: GLYPHS_URL,
    e2eSpriteUrl: SPRITE_URL,
  });
  return `/?${params.toString()}`;
}

interface SampleFeature {
  readonly properties: Record<string, unknown> & { readonly id: string };
  readonly geometry: DungeonGeometry;
}

/** The published sample is already whitelist-shaped (art/direction/map-style.md 6.1), so a
 * `DungeonInput` is just its `properties` lifted back up next to `geometry` — the same conversion
 * `dungeons-source.test.ts` uses, kept local here since Playwright's test runner and Vitest are
 * separate processes with no shared test-utility module in this repo. */
function loadDungeonInputs(): readonly DungeonInput[] {
  const raw = readFileSync(join(SAMPLES_DIR, 'dungeons.sample.geojson'), 'utf-8');
  const parsed = JSON.parse(raw) as { features: readonly SampleFeature[] };
  return parsed.features.map(
    (feature) =>
      ({
        ...feature.properties,
        geometry: feature.geometry,
      }) as unknown as DungeonInput,
  );
}

/** `Map#_loaded` is the flag MapLibre flips right before it fires `load` (map-real-fixture.spec.ts
 * uses the same check: reading it directly survives a `load` that fired before any listener could
 * attach). */
async function mapLoadFired(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const map = window.__kwSpike?.map as unknown as { _loaded?: boolean } | undefined;
    return map?._loaded === true;
  });
}

interface RenderedIdCounts {
  readonly [id: string]: number;
}

/** Counts rendered features per dungeon `id` on one symbol layer, at the given camera position —
 * exactly what a P1-H06-style duplicate would inflate above 1. */
async function renderedIdCounts(
  page: Page,
  layerId: string,
  center: readonly [number, number],
): Promise<RenderedIdCounts> {
  return page.evaluate(
    ({ layerId: layer, center: cameraCenter, zoom }) =>
      new Promise<RenderedIdCounts>((resolve, reject) => {
        const map = window.__kwSpike?.map;
        if (map === undefined) {
          reject(new Error('window.__kwSpike.map missing'));
          return;
        }
        map.once('idle', () => {
          const counts: Record<string, number> = {};
          for (const feature of map.queryRenderedFeatures({ layers: [layer] })) {
            const id = feature.properties?.['id'];
            if (typeof id === 'string') {
              counts[id] = (counts[id] ?? 0) + 1;
            }
          }
          resolve(counts);
        });
        map.jumpTo({ center: [cameraCenter[0], cameraCenter[1]], zoom });
      }),
    { layerId, center, zoom: ZOOM },
  );
}

test.describe('dungeon labels render exactly once per dungeon (P1-H06 fix)', () => {
  test('kw-rift-name and kw-rift-count each show exactly one feature per sample dungeon id', async ({
    page,
  }) => {
    await page.route(`${FIXTURE_ORIGIN}/**`, (route) => fulfillFromFixture(route));
    await page.goto(spikeUrl());
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    await expect.poll(() => mapLoadFired(page), { timeout: LOAD_TIMEOUT_MS }).toBe(true);

    // Computed in this file's own Node process, through the real adapter (never re-derived, never
    // hand-written) — see the header comment.
    const inputs = loadDungeonInputs();
    const cache = createDungeonLabelCache();
    const { dungeons, labels } = buildDungeonFeatureCollections(inputs, cache);
    expect(labels.features.length).toBe(inputs.length); // every sample polygon is well-formed

    await page.evaluate(
      ({ dungeonsData, labelsData }) => {
        const map = window.__kwSpike?.map;
        if (map === undefined) {
          throw new Error('window.__kwSpike.map missing');
        }
        // Duck-typed the same way `dungeons-source.ts`'s own `setDungeonsSourceData` does, rather
        // than importing the `GeoJSONSource` class into this browser-context callback.
        const dungeonsSource = map.getSource('kw-dungeons') as
          { setData: (data: unknown) => void } | undefined;
        const labelsSource = map.getSource('kw-dungeon-labels') as
          { setData: (data: unknown) => void } | undefined;
        if (dungeonsSource === undefined || labelsSource === undefined) {
          throw new Error('kw-dungeons/kw-dungeon-labels source missing');
        }
        // Same-round setData, exactly like `dungeons-source.ts`'s `setDungeonsSourceData`.
        dungeonsSource.setData(dungeonsData);
        labelsSource.setData(labelsData);
      },
      { dungeonsData: dungeons, labelsData: labels },
    );

    for (const feature of labels.features) {
      const id = feature.properties.id;
      const center = feature.geometry.coordinates;
      const nameCounts = await renderedIdCounts(page, 'kw-rift-name', center);
      expect(nameCounts[id], `kw-rift-name count for ${id}: ${JSON.stringify(nameCounts)}`).toBe(1);

      if (feature.properties.label_count !== undefined) {
        const countCounts = await renderedIdCounts(page, 'kw-rift-count', center);
        expect(
          countCounts[id],
          `kw-rift-count count for ${id}: ${JSON.stringify(countCounts)}`,
        ).toBe(1);
      }
    }
  });
});
