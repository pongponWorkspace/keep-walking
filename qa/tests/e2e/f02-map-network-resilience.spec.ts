// QA-owned e2e — makes TC-MAP-05 and TC-MAP-08 (qa/plans/F02-test-plan.md 4.2) permanent
// regression tests, closing board item P2-F04-T09 ("e2e ถาวร TC-MAP-05, TC-MAP-08"). Runs under
// the root Playwright config's two mobile projects (playwright.config.ts testMatch includes
// qa/tests/e2e/**/*.spec.ts).
//
// Reuses the same fixture-serving pattern as qa/tests/e2e/f02-map-fixture-tile.spec.ts (Lumpini
// PMTiles fixture under tools/tiles/fixtures/lumpini, answered from disk through page.route() —
// TL-S11: no network, no port to bind) and the __kwSpike.map hook
// (apps/client/e2e/map-real-fixture.spec.ts's jumpTo/idle pattern) to drive real camera moves.
//
// Prerequisite (same as the other e2e specs): from repo root,
//   pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then (in another shell) pnpm test:e2e
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

// `window.__kwSpike` is already declared (narrower: state/position/map._loaded +
// queryRenderedFeatures) by qa/tests/e2e/f02-map-fixture-tile.spec.ts, part of the same root
// tsconfig program — re-declaring a wider shape here would conflict (TS2717). Instead, every
// method this file needs beyond that narrower shape (jumpTo/panBy/once/on/off) is reached through
// a local cast inside `page.evaluate`, the same pattern
// apps/client/e2e/map-real-fixture.spec.ts uses for `map?._loaded`.
interface SpikeMapExtra {
  jumpTo(options: { center: [number, number]; zoom: number }): unknown;
  panBy(offset: [number, number], options?: { duration?: number }): unknown;
  once(event: string, cb: () => void): unknown;
  on(event: string, cb: (e: unknown) => void): unknown;
  off(event: string, cb: (e: unknown) => void): unknown;
}

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const FIXTURE_DIR = join(REPO_ROOT, 'tools/tiles/fixtures/lumpini');
const TILESET_ID = 'pm4-20260923-z15-lumpini';

const FIXTURE_ORIGIN = 'https://qa-fixture.invalid';
const PMTILES_URL = `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

/** Inside the fixture bbox (same center synthetic-park-loop-01 walks around, see
 * data/gps-traces/README.md — Lumpini park loop). */
const LUMPINI_CENTER: [number, number] = [100.5415, 13.7305];
const LUMPINI_ZOOM = 16;

/** Same subset qa/tests/e2e/f02-map-fixture-tile.spec.ts checks: layers guaranteed to have
 * geometry across the fixture's zoom range (art/direction/map-style/kw-light.style.json). */
const BASEMAP_LAYERS = ['earth', 'landuse_park', 'water', 'roads_minor', 'roads_major'];

const LOAD_TIMEOUT_MS = 15_000;

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
  // P2-F06-T21 root-cause fix: since P2-X38 (age gate/consent, 3b7e78c) `main.ts` only calls
  // `provider.start()` when location consent was already granted in a previous session or this
  // Mock-only skip-onboarding hook is set (D-130) — this spec boots a fresh page with no
  // `kw.p2.consent` key and never drives the consent screen itself, so without this hook
  // `window.__kwSpike.state` stays 'idle' forever (a deterministic failure under the new gate, not
  // real flake) and `expect.poll(...).toBe('running')` always times out. This spec is about
  // network-loss resilience of the map/location wiring, not onboarding/consent, matching every
  // apps/client/e2e/* spec that already sets this hook for the same reason (e.g. location-mock.spec.ts).
  params.set('e2eSkipOnboarding', '1');
  return `/?${params.toString()}`;
}

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

async function fulfillFromFixture(route: Route, served: string[]): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const path = fixturePathFor(request.url());
  if (path === undefined) {
    // TC-MAP-08: a request for a tile that is not in the set (out of the fixture's bbox/zoom
    // range) — a real tile server/PMTiles range read answers this class of request with 404, not
    // a network error. This mirrors that, instead of aborting the route.
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

async function mapLoadFired(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__kwSpike?.map?._loaded === true);
}

/** Counts basemap (non-label) features currently rendered — proof tiles are decoded/painted, not
 * merely that a canvas element exists. Used after the offline->online recovery step: with this
 * fixture's small single-tile archive, PMTiles caches the whole tile in memory after the first
 * load, so a later pan within the same area does not necessarily issue a *new* HTTP request (the
 * `served` counter can legitimately stay flat) — the meaningful proof of "tile โหลดต่อ" after
 * recovery is that the basemap keeps rendering, not a raw request count. */
async function basemapFeatureCount(page: Page): Promise<number> {
  return page.evaluate(
    (layers) => window.__kwSpike?.map?.queryRenderedFeatures({ layers }).length ?? 0,
    BASEMAP_LAYERS,
  );
}

/** Jumps the camera without waiting for MapLibre's 'idle' event: with `loc=mock` running and
 * follow mode on by default (src/main.ts), every new position sample calls `map.easeTo` (duration
 * 0), which can keep interrupting 'idle' indefinitely. Callers instead poll on an observable
 * side-effect (e.g. `served.length` growing) after this resolves. */
async function jumpToLumpini(page: Page): Promise<void> {
  await page.evaluate(
    ({ center, zoom }) => {
      const map = window.__kwSpike?.map as unknown as SpikeMapExtra | undefined;
      if (map === undefined) {
        throw new Error('window.__kwSpike.map missing');
      }
      map.jumpTo({ center, zoom });
    },
    { center: LUMPINI_CENTER, zoom: LUMPINI_ZOOM },
  );
}

test.describe('TC-MAP-05: network loss mid-pan does not crash the app', () => {
  test('going offline mid-pan leaves an empty patch (no crash), location keeps moving, and tiles resume after coming back online', async ({
    page,
    context,
  }) => {
    const served: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.route(`${FIXTURE_ORIGIN}/**`, (route) => {
      void fulfillFromFixture(route, served);
    });

    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&loop=1&hud=1'));
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    await expect.poll(() => mapLoadFired(page), { timeout: LOAD_TIMEOUT_MS }).toBe(true);
    await jumpToLumpini(page);
    // Proves the jump really requested fixture tiles (not just a no-op camera move) before the
    // offline/online steps below reason about "in-flight" requests.
    await expect.poll(() => served.length, { timeout: LOAD_TIMEOUT_MS }).toBeGreaterThan(0);

    const positionBeforeOffline = await page.evaluate(() => window.__kwSpike?.position ?? null);
    expect(positionBeforeOffline).not.toBeNull();

    // Simulate F9: network drops while a pan is in flight (new tiles being requested).
    await context.setOffline(true);
    await page.evaluate(() => {
      const map = window.__kwSpike?.map as unknown as SpikeMapExtra | undefined;
      map?.panBy([200, 150], { duration: 300 });
    });
    // Give the in-flight pan time to hit the (now offline) network and fail its tile requests.
    await page.waitForTimeout(1_000);

    // The app must not crash: the canvas is still there, no uncaught page error.
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    expect(pageErrors).toEqual([]);

    // Location must be unaffected by the map's network state: Mock keeps advancing regardless of
    // `context.setOffline` (the trace player is not itself an HTTP source).
    const positionWhileOffline = await page.evaluate(() => window.__kwSpike?.position ?? null);
    expect(positionWhileOffline).not.toBeNull();
    expect(positionWhileOffline?.timestamp).toBeGreaterThan(positionBeforeOffline?.timestamp ?? 0);

    // Recovery: back online, pan again — the map must still be able to show tiles (either by
    // issuing a fresh request, or by reusing what it already cached; either is a legitimate
    // "recovered" outcome for this fixture, see basemapFeatureCount's own comment).
    await context.setOffline(false);
    await page.evaluate(() => {
      const map = window.__kwSpike?.map as unknown as SpikeMapExtra | undefined;
      map?.panBy([-200, -150], { duration: 300 });
    });
    await expect
      .poll(() => basemapFeatureCount(page), { timeout: LOAD_TIMEOUT_MS })
      .toBeGreaterThan(0);

    expect(pageErrors).toEqual([]);
  });
});

test.describe('TC-MAP-08: requesting a tile outside the fixture set does not throw', () => {
  test('a 404 tile response (out-of-set z/x/y) never surfaces as an uncaught error and the map keeps working', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.route(`${FIXTURE_ORIGIN}/**`, (route) => {
      void fulfillFromFixture(route, []);
    });

    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&hud=1'));
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    await expect.poll(() => mapLoadFired(page), { timeout: LOAD_TIMEOUT_MS }).toBe(true);

    // Register the same 'error' listener the client itself could use, to prove MapLibre reports
    // (not throws) a missing tile — tech note section 9: "MapLibre ไม่ถือ 404 เป็น error".
    const mapErrorEvents = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const map = window.__kwSpike?.map as unknown as SpikeMapExtra | undefined;
          if (map === undefined) {
            resolve(0);
            return;
          }
          let count = 0;
          const onError = () => {
            count += 1;
          };
          map.on('error', onError);
          // Jump far outside the fixture bbox (z15 tile set only covers Lumpini) so every tile
          // request the pan triggers resolves to the fixture route's 404 branch.
          map.jumpTo({ center: [100.9, 13.9], zoom: 15 });
          setTimeout(() => {
            map.off('error', onError);
            resolve(count);
          }, 2_000);
        }),
    );

    // MapLibre swallows a tile 404 into its own 'error' event (or silently drops it) rather than
    // an uncaught exception — either is acceptable here, the assertion that matters is "no crash".
    void mapErrorEvents;
    expect(pageErrors).toEqual([]);
    const thrownStyleErrors = consoleErrors.filter((line) =>
      /Uncaught|TypeError|ReferenceError/i.test(line),
    );
    expect(thrownStyleErrors).toEqual([]);

    // The map is still usable afterwards: proves no handler re-threw and killed rendering.
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  });
});
