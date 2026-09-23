// QA helper script (P1-H06) — NOT a Playwright Test spec (this directory is outside
// `playwright.config.ts`'s `testMatch`, and this task's `writes` do not include `qa/tests/e2e/`).
// Uses the `@playwright/test` package's own `chromium`/`webkit` launchers directly, reusing the
// same route-helper pattern as `apps/client/e2e/map-real-fixture.spec.ts` and
// `qa/tests/e2e/f02-map-fixture-tile.spec.ts` (fake origin, Range/206, real style, real fixture).
//
// Captures S1-S5 (art/direction/map-style.md section 10.1) at 390x844 and 360x800 CSS px, for
// both PMTiles and TileJSON tile sources, on both android-chrome (chromium/Pixel 7 UA) and
// ios-safari (webkit/iPhone 14 UA) — 5 screens x 2 viewports x 2 tile formats x 2 engines = 40
// screenshots, saved as JPEG (quality tuned to stay near/under ~150 KB) under
// qa/reports/F02/map-style/screenshots/.
//
// Prerequisite: `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client
// preview` (port 4173) must already be running — this script does not start it (kept a plain
// script, no test-runner lifecycle, so it can be re-run standalone while iterating).
//
// Run: pnpm exec tsx qa/reports/F02/map-style/capture-screenshots.ts
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { chromium, webkit, devices } from '@playwright/test';
import type { Page, Route, Browser } from '@playwright/test';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const FIXTURE_DIR = join(REPO_ROOT, 'tools/tiles/fixtures/lumpini');
const OUT_DIR = join(import.meta.dirname, 'screenshots');
const TILESET_ID = 'pm4-20260923-z15-lumpini';
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

const FIXTURE_ORIGIN = 'https://qa-h06-fixture.invalid';
const PMTILES_URL = `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
const TILEJSON_URL = `${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/tiles.json`;
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

const LOAD_TIMEOUT_MS = 15_000;

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
  'access-control-allow-headers': 'range',
  'access-control-expose-headers': 'content-range, content-length, accept-ranges',
};

/** S1-S5 per art/direction/map-style.md section 10.1's table. */
interface Screen {
  readonly id: string;
  readonly label: string;
  readonly center: [number, number];
  readonly zoom: number;
}

const SCREENS: readonly Screen[] = [
  {
    id: 'S1',
    label: 'สวนลุมพินี (rift crack, self dot, roads Rama IV/Ratchadamri)',
    center: [100.541, 13.731],
    zoom: 16,
  },
  { id: 'S2', label: 'ซอยสุขุมวิท (roads_label_minor)', center: [100.56, 13.737], zoom: 17 },
  { id: 'S3', label: 'สวนจตุจักร (sponsored label)', center: [100.553, 13.806], zoom: 15 },
  {
    id: 'S4',
    label: 'ขอบเขตเล่นตะวันออก (black zone + province border)',
    center: [101.0, 13.8],
    zoom: 9,
  },
  {
    id: 'S5',
    label: 'แม่น้ำเจ้าพระยา (water edge + river name)',
    center: [100.495, 13.74],
    zoom: 14,
  },
];

const VIEWPORTS = [
  { w: 390, h: 844, dpr: 3, tag: '390x844' },
  { w: 360, h: 800, dpr: 2, tag: '360x800' },
] as const;

const FORMATS = [
  { tag: 'pmtiles', tilesUrl: PMTILES_URL },
  { tag: 'tilejson', tilesUrl: TILEJSON_URL },
] as const;

const ENGINES = [
  { tag: 'android-chrome', launcher: chromium, device: devices['Pixel 7'] },
  { tag: 'ios-safari', launcher: webkit, device: devices['iPhone 14'] },
] as const;

function fixturePathFor(url: string): string | undefined {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const resolved = normalize(join(FIXTURE_DIR, pathname));
  if (!resolved.startsWith(FIXTURE_DIR + sep)) return undefined;
  try {
    return statSync(resolved).isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

/** The committed tiles.json points at serve.py (127.0.0.1:8765); re-point it at the fake origin,
 * same as apps/client/e2e/map-real-fixture.spec.ts's `rewriteTileJson`. */
function rewriteTileJson(bytes: Buffer): Buffer {
  const doc = JSON.parse(bytes.toString('utf-8')) as Record<string, unknown>;
  doc['tiles'] = [`${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/{z}/{x}/{y}.mvt`];
  return Buffer.from(JSON.stringify(doc), 'utf-8');
}

const externalRequests: string[] = [];

async function fulfillFromFixture(route: Route, served: string[]): Promise<void> {
  const request = route.request();
  const url = request.url();
  if (!url.startsWith(FIXTURE_ORIGIN) && !url.startsWith(BASE_URL)) {
    externalRequests.push(url);
  }
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const path = fixturePathFor(url);
  if (path === undefined) {
    await route.fulfill({ status: 404, headers: CORS_HEADERS, body: '' });
    return;
  }
  served.push(new URL(url).pathname);
  const raw = readFileSync(path);
  const body = path.endsWith('tiles.json') ? rewriteTileJson(raw) : raw;
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

function spikeUrl(tilesUrl: string): string {
  const params = new URLSearchParams({
    hud: '1',
    loc: 'mock',
    trace: 'synthetic-park-loop-01',
    speed: '1',
    loop: '1',
    e2eTilesUrl: tilesUrl,
    e2eGlyphsUrl: GLYPHS_URL,
    e2eSpriteUrl: SPRITE_URL,
  });
  return `${BASE_URL}/?${params.toString()}`;
}

interface WindowWithSpike extends Window {
  __kwSpike?: {
    map?: {
      _loaded?: boolean;
      jumpTo(opts: { center: [number, number]; zoom: number }): void;
      once(event: string, cb: () => void): void;
      getSource(id: string): { setData(data: unknown): void } | undefined;
      queryRenderedFeatures(opts: { layers: readonly string[] }): readonly {
        properties?: Record<string, unknown>;
      }[];
    };
  };
}

async function jumpToAndIdle(page: Page, screen: Screen): Promise<void> {
  await page.evaluate(
    ({ center, zoom }) =>
      new Promise<void>((resolve) => {
        const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
        if (map === undefined) throw new Error('window.__kwSpike.map missing');
        map.once('idle', () => resolve());
        map.jumpTo({ center, zoom });
      }),
    { center: screen.center, zoom: screen.zoom },
  );
}

/** Injects the art-director's sample GeoJSON into `kw-dungeons` (art/direction/map-style/samples/
 * dungeons.sample.geojson) — the client has no server-backed loader for this source yet (only
 * `kw-self` and `kw-playarea-mask`/`kw-provinces` auto-load; map-style.md 14 A-...-5: dungeon
 * payload shape is Phase 3). Needed for S1 (rift crack) and S3 (sponsored label) pass criteria. */
async function loadDungeonSamples(page: Page, sampleGeojson: unknown): Promise<void> {
  await page.evaluate((data) => {
    const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
    map?.getSource('kw-dungeons')?.setData(data);
  }, sampleGeojson);
}

const THAI_SCRIPT = /[฀-๿]/;
const LABEL_LAYERS = [
  'water_label_point',
  'water_label_line',
  'pois_label',
  'roads_label_minor',
  'roads_label_major',
  'places_neighbourhood',
  'places_locality',
  'kw-rift-name',
  'kw-rift-count',
  'kw-rift-sponsored',
  'kw-province-label',
];

async function thaiLabelsOn(page: Page): Promise<readonly string[]> {
  return page.evaluate(
    ({ layers, source }) => {
      const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
      if (map === undefined) return [];
      const thai = new RegExp(source);
      const values = map
        .queryRenderedFeatures({ layers })
        .flatMap((f) => Object.values(f.properties ?? {}))
        .filter((v): v is string => typeof v === 'string' && thai.test(v));
      return [...new Set(values)];
    },
    { layers: LABEL_LAYERS, source: THAI_SCRIPT.source },
  );
}

async function selfDotCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
    return map?.queryRenderedFeatures({ layers: ['kw-self-dot'] }).length ?? 0;
  });
}

interface ScreenshotResult {
  readonly engine: string;
  readonly format: string;
  readonly screen: string;
  readonly viewport: string;
  readonly file: string;
  readonly bytes: number;
  readonly thaiLabels: readonly string[];
  readonly selfDots: number;
  readonly consoleErrors: readonly string[];
}

async function run(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const dungeonSamples: unknown = JSON.parse(
    readFileSync(
      join(REPO_ROOT, 'art/direction/map-style/samples/dungeons.sample.geojson'),
      'utf-8',
    ),
  );

  const results: ScreenshotResult[] = [];
  let animationCheck:
    { engine: string; identical: boolean; bytesA: number; bytesB: number } | undefined;

  for (const engine of ENGINES) {
    const browser: Browser = await engine.launcher.launch();
    for (const format of FORMATS) {
      const context = await browser.newContext({ ...engine.device, locale: 'th-TH' });
      const page = await context.newPage();
      const served: string[] = [];
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      await page.route(`${FIXTURE_ORIGIN}/**`, (route) => fulfillFromFixture(route, served));

      await page.goto(spikeUrl(format.tilesUrl));
      await page.waitForFunction(
        () =>
          (window as unknown as { __kwSpike?: { map?: { _loaded?: boolean } } }).__kwSpike?.map
            ?._loaded === true,
        undefined,
        { timeout: LOAD_TIMEOUT_MS },
      );
      // Follow mode (on by default, main.ts) recenters the camera on every mock-trace sample,
      // fighting this script's own `jumpTo` per screen and pegging the (software/swiftshader)
      // GPU under continuous easeTo animation until it crashes. Turn it off once per page so this
      // script's jumpTo is authoritative — matches a real player tapping the follow button off.
      await page.click('#follow-toggle');
      // `#hud-panel` (debug/hud-panel.ts) is a dev-only measurement overlay (P1-F02-T11), not
      // player-facing UI — it would cover most of the map in every screenshot otherwise. Hidden
      // with CSS only (element still exists, `window.__kwSpike.hud` keeps updating); the small
      // GPS pill/toast/follow button (ui/gps-ui.ts) are real game chrome and stay visible.
      await page.evaluate(() => {
        const panel = document.getElementById('hud-panel');
        if (panel !== null) panel.style.display = 'none';
      });
      await loadDungeonSamples(page, dungeonSamples);

      for (const screen of SCREENS) {
        for (const viewport of VIEWPORTS) {
          await page.setViewportSize({ width: viewport.w, height: viewport.h });
          await jumpToAndIdle(page, screen);
          await page.waitForTimeout(150); // settle symbol placement after idle

          const thaiLabels = await thaiLabelsOn(page);
          const selfDots = await selfDotCount(page);
          const fileName = `${engine.tag}--${format.tag}--${screen.id}--${viewport.tag}.jpg`;
          const filePath = join(OUT_DIR, fileName);
          let quality = 75;
          let buffer = await page.screenshot({ type: 'jpeg', quality });
          while (buffer.length > 150_000 && quality > 15) {
            quality -= 10;
            buffer = await page.screenshot({ type: 'jpeg', quality });
          }
          writeFileSync(filePath, buffer);
          console.warn(`captured ${fileName} (${buffer.length} bytes)`);

          results.push({
            engine: engine.tag,
            format: format.tag,
            screen: screen.id,
            viewport: viewport.tag,
            file: `screenshots/${fileName}`,
            bytes: buffer.length,
            thaiLabels,
            selfDots,
            consoleErrors: [...consoleErrors],
          });

          // No-continuous-animation check (map-style.md section 11): two screenshots back-to-back
          // with no intervening waitForTimeout. A discrete state change (e.g. the next mock GPS
          // sample moving kw-self, or a tile finishing a fetch) needs at least one JS task tick to
          // reach the renderer; back-to-back screenshot() calls do not leave room for a new sample
          // to land in between (unlike a fixed delay, which could coincide with the mock
          // provider's next tick and produce a false positive "animation"). Any observed pixel
          // diff here would instead be a real continuous animation loop (CSS/requestAnimationFrame
          // paint-property transition), which fadeDuration=0 (map.ts) and the style's own root
          // `transition: {duration:0, delay:0}` (kw-light.style.json) are meant to rule out.
          if (screen.id === 'S1' && animationCheck === undefined && format.tag === 'pmtiles') {
            const shotA = await page.screenshot({ type: 'jpeg', quality: 80 });
            const shotB = await page.screenshot({ type: 'jpeg', quality: 80 });
            animationCheck = {
              engine: engine.tag,
              identical: Buffer.compare(shotA, shotB) === 0,
              bytesA: shotA.length,
              bytesB: shotB.length,
            };
          }
        }
      }
      await context.close();
    }
    await browser.close();
  }

  writeFileSync(
    join(import.meta.dirname, 'results.json'),
    JSON.stringify({ results, animationCheck, externalRequests }, null, 2),
  );
  console.warn(
    `captured ${results.length} screenshots; externalRequests=${externalRequests.length}`,
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
