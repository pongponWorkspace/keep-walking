// P2-H41: re-shoots map-style scene S5 (`art/direction/map-style.md` 10.1, F-AD-5) at the new
// position (100.514, 13.718, z14 — "sathon-bangrak", moved off the original Rattanakosin-island
// river bend, art/reviews/F04-F06-visual-gate.md 5.3) using the location-engineer's rebuilt
// fixture (`tools/tiles/fixtures/screens/s5-chaophraya/`, already at the new bbox/center per its
// own `manifest.json`). Same harness convention as
// `qa/reports/F02/map-style/capture-screenshots.spec.ts` (fake-origin route interception, real
// style, real fixture bytes, Range/206 support) — a plain script, not a `*.spec.ts` under
// playwright.config.ts's testMatch, and kept independent of that other script (different `writes`
// scope for this task: `art/reviews/screens/F04-F06/`, not `qa/reports/F02/map-style/`).
//
// Checks with `queryRenderedFeatures` that at least one "แม่น้ำเจ้าพระยา" label is rendered at z14
// in each of the 4 (engine x viewport) combinations, for each tile format; if any combination has
// none, falls back to z13 at the same center for that one combination and records which zoom was
// actually used, per the task's own instruction.
//
// Prerequisite: `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client
// preview` (port 4173) already running.
//
// Run: pnpm exec tsx qa/tests/e2e/visual/capture-s5-reshoot.ts
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { chromium, webkit, devices } from '@playwright/test';
import type { Page, Route, Browser } from '@playwright/test';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const LUMPINI_DIR = join(REPO_ROOT, 'tools/tiles/fixtures/lumpini');
const S5_DIR = join(REPO_ROOT, 'tools/tiles/fixtures/screens/s5-chaophraya');
const OUT_DIR = join(REPO_ROOT, 'art/reviews/screens/F04-F06');
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

const manifest = JSON.parse(readFileSync(join(S5_DIR, 'manifest.json'), 'utf-8')) as {
  tileset_id: string;
  center: [number, number];
  zoom: number;
};
const TILESET_ID = manifest.tileset_id;
const CENTER: [number, number] = manifest.center;
const PRIMARY_ZOOM = manifest.zoom;
const FALLBACK_ZOOM = 13;

const FIXTURE_ORIGIN = 'https://qa-h41-s5-fixture.invalid';
const GLYPHS_URL = `${FIXTURE_ORIGIN}/glyphs/{fontstack}/{range}.pbf`;
const SPRITE_URL = `${FIXTURE_ORIGIN}/sprites/v4/light`;

function pmtilesUrl(): string {
  return `pmtiles://${FIXTURE_ORIGIN}/pmtiles/${TILESET_ID}.pmtiles`;
}
function tilejsonUrl(): string {
  return `${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/tiles.json`;
}

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

const VIEWPORTS = [
  { w: 390, h: 844, dpr: 3, tag: '390x844' },
  { w: 360, h: 800, dpr: 2, tag: '360x800' },
] as const;
const ENGINES = [
  { tag: 'android-chrome', launcher: chromium, device: devices['Pixel 7'] },
  { tag: 'ios-safari', launcher: webkit, device: devices['iPhone 14'] },
] as const;
const FORMATS = [
  { tag: 'pmtiles', tilesUrl: pmtilesUrl() },
  { tag: 'tilejson', tilesUrl: tilejsonUrl() },
] as const;

/** Glyphs/sprites always resolve against the shared Lumpini fixture (S5's own `manifest.json`
 * declares `"glyphs_and_sprites_from": "fixtures/lumpini"`, same as every other screen fixture,
 * P2-F04-T23); only `/pmtiles/**`/`/tiles/**` resolve against S5's own dedicated fixture dir. */
function fixturePathFor(reqUrl: string): string | undefined {
  const pathname = decodeURIComponent(new URL(reqUrl).pathname);
  const base =
    pathname.startsWith('/pmtiles/') || pathname.startsWith('/tiles/') ? S5_DIR : LUMPINI_DIR;
  const resolved = normalize(join(base, pathname));
  if (!resolved.startsWith(base + sep)) return undefined;
  try {
    return statSync(resolved).isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

/** The committed tiles.json points at `serve.py` (127.0.0.1:8765, the task brief's own URL); this
 * script never starts that server — same convention as `map-real-fixture.spec.ts`/the map-style
 * capture script — it rewrites `tiles` to the fake, same-origin-by-CORS `FIXTURE_ORIGIN` instead,
 * so no real network call ever leaves this machine (TL-S11). */
function rewriteTileJson(bytes: Buffer): Buffer {
  const doc = JSON.parse(bytes.toString('utf-8')) as Record<string, unknown>;
  doc['tiles'] = [`${FIXTURE_ORIGIN}/tiles/${TILESET_ID}/{z}/{x}/{y}.mvt`];
  return Buffer.from(JSON.stringify(doc), 'utf-8');
}

async function fulfillFromFixture(route: Route): Promise<void> {
  const request = route.request();
  const reqUrl = request.url();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const path = fixturePathFor(reqUrl);
  if (path === undefined) {
    await route.fulfill({ status: 404, headers: CORS_HEADERS, body: '' });
    return;
  }
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
    // This build (unlike the original P1-H06/P2-H08 version of this harness) always shows the
    // real onboarding sequence first — this script is about the basemap only (S5), so it skips
    // onboarding the same way every other Mock-provider e2e/QA script in this repo does (D-130).
    e2eSkipOnboarding: '1',
    e2eClassId: 'tanker',
    e2eTilesUrl: tilesUrl,
    e2eGlyphsUrl: GLYPHS_URL,
    e2eSpriteUrl: SPRITE_URL,
  });
  return `${BASE_URL}/?${params.toString()}`;
}

// Not `interface ... extends Window`: `window.__kwSpike` (`apps/client/src/debug/spike-hook.ts`)
// already augments the DOM lib's own global `Window` type there, and re-declaring/extending it
// here (this file is typechecked under the root `tsconfig.json`'s `qa/tests/**/*.ts`, unlike the
// map-style capture script this is otherwise modeled on, which is not in that include list) would
// conflict — an inline cast at each call site (same convention as `apps/client/e2e/full-run.spec.
// ts`'s own `WindowWithSpike`) avoids that entirely.
interface SpikeMap {
  _loaded?: boolean;
  jumpTo(opts: { center: [number, number]; zoom: number }): void;
  once(event: string, cb: () => void): void;
  queryRenderedFeatures(opts: { layers: readonly string[] }): readonly {
    properties?: Record<string, unknown>;
  }[];
}
type WindowWithSpike = { __kwSpike?: { map?: SpikeMap } };

async function jumpToAndIdle(page: Page, center: [number, number], zoom: number): Promise<void> {
  await page.evaluate(
    ({ center: c, zoom: z }) =>
      new Promise<void>((resolve) => {
        const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
        if (map === undefined) throw new Error('window.__kwSpike.map missing');
        map.once('idle', () => resolve());
        map.jumpTo({ center: c, zoom: z });
      }),
    { center, zoom },
  );
}

const RIVER_NAME = 'แม่น้ำเจ้าพระยา';
const WATER_LABEL_LAYERS = ['water_label_point', 'water_label_line'];

async function hasRiverLabel(page: Page): Promise<boolean> {
  return page.evaluate(
    ({ layers, name }) => {
      const map = (window as unknown as WindowWithSpike).__kwSpike?.map;
      if (map === undefined) return false;
      return map
        .queryRenderedFeatures({ layers })
        .flatMap((f) => Object.values(f.properties ?? {}))
        .some((v) => typeof v === 'string' && v.includes(name));
    },
    { layers: WATER_LABEL_LAYERS, name: RIVER_NAME },
  );
}

interface Result {
  readonly engine: string;
  readonly format: string;
  readonly viewport: string;
  readonly zoomUsed: number;
  readonly riverLabelFound: boolean;
  readonly file: string;
  readonly bytes: number;
}

async function run(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const results: Result[] = [];
  for (const engine of ENGINES) {
    const browser: Browser = await engine.launcher.launch();
    for (const format of FORMATS) {
      const context = await browser.newContext({ ...engine.device, locale: 'th-TH' });
      const page = await context.newPage();
      await page.route(`${FIXTURE_ORIGIN}/**`, (route) => fulfillFromFixture(route));
      await page.goto(spikeUrl(format.tilesUrl));
      await page.waitForFunction(
        () =>
          (window as unknown as { __kwSpike?: { map?: { _loaded?: boolean } } }).__kwSpike?.map
            ?._loaded === true,
        undefined,
        { timeout: 15_000 },
      );
      // `synthetic-park-loop-01` walks inside `leelawadee-lawn`'s real polygon (D-130's
      // `e2eSkipOnboarding` above makes it a real dungeon-entry candidate now, unlike when this
      // trace was first picked for the S1-S6 harness before F04's confirm popup existed) — dismiss
      // it if it opens so it never blocks the follow-toggle tap or covers the map underneath.
      const cancelButton = page.locator('.popup-overlay:has(.confirm-title) .confirm-cancel');
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
      await page.click('#follow-toggle'); // same reasoning as the map-style capture script
      await page.evaluate(() => {
        const panel = document.getElementById('hud-panel');
        if (panel !== null) panel.style.display = 'none';
        // This is a basemap-only check (S5's own pass criteria, section 10.1): the home-state
        // panel that `e2eSkipOnboarding` otherwise leaves showing (no dungeon nearby from here) is
        // real player-facing UI, but not part of what this screen is testing, and would otherwise
        // cover the bottom third of the map — hidden the same way `hud-panel` is, not deleted.
        const homePanel = document.querySelector('.home-panel');
        if (homePanel !== null) (homePanel as HTMLElement).style.display = 'none';
      });

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.w, height: viewport.h });
        await jumpToAndIdle(page, CENTER, PRIMARY_ZOOM);
        await page.waitForTimeout(150);
        let zoomUsed = PRIMARY_ZOOM;
        let found = await hasRiverLabel(page);
        if (!found) {
          await jumpToAndIdle(page, CENTER, FALLBACK_ZOOM);
          await page.waitForTimeout(150);
          zoomUsed = FALLBACK_ZOOM;
          found = await hasRiverLabel(page);
        }
        // JPEG with quality tuned down to stay near/under ~150 KB (same convention as
        // `qa/reports/F02/map-style/capture-screenshots.spec.ts`) — a full 390x844 @ dpr3 map
        // screenshot as PNG runs 0.9-1.3 MB per file, which is not "reasonable for a public repo"
        // across 8 files (this task's own acceptance criterion 3).
        const fileName = `S5-${engine.tag}--${format.tag}--${viewport.tag}--z${zoomUsed}.jpg`;
        const filePath = join(OUT_DIR, fileName);
        let quality = 80;
        let buffer = await page.screenshot({ type: 'jpeg', quality });
        while (buffer.length > 150_000 && quality > 15) {
          quality -= 10;
          buffer = await page.screenshot({ type: 'jpeg', quality });
        }
        writeFileSync(filePath, buffer);
        console.warn(
          `${fileName}: river label ${found ? 'FOUND' : 'NOT FOUND'} at z${zoomUsed} (${buffer.length} B)`,
        );
        results.push({
          engine: engine.tag,
          format: format.tag,
          viewport: viewport.tag,
          zoomUsed,
          riverLabelFound: found,
          file: fileName,
          bytes: buffer.length,
        });
      }
      await context.close();
    }
    await browser.close();
  }
  writeFileSync(join(OUT_DIR, 'capture-s5-results.json'), JSON.stringify(results, null, 2));
  const missing = results.filter((r) => !r.riverLabelFound);
  console.warn(
    `\n${results.length} S5 screenshots captured; ${missing.length} missing the river label even at z${FALLBACK_ZOOM}.`,
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
