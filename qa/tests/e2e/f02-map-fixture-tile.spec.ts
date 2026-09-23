// QA-owned e2e (P1-F02-T13, TC-MAP-02/06, board acceptance 'พิสูจน์ "จุดขยับบนแผนที่" ... กับ
// fixture tile (TL-S04)'). Runs under the root Playwright config's two mobile projects
// (playwright.config.ts testMatch: qa/tests/e2e/**/*.spec.ts).
//
// Uses the real Lumpini PMTiles fixture (tools/tiles/fixtures/lumpini) instead of the
// guaranteed-missing path apps/client's own e2e/map-shell.spec.ts uses, so this test also proves
// byte-range serving works end to end (F1 "HTTP Byte Serving" class of bug) without downloading
// anything or standing up a real HTTP server: `page.route()` intercepts the pmtiles:// protocol's
// fetches to a fake origin and answers them from the local fixture file on disk (TL-S11 — no
// network, no port to bind).
//
// Prerequisite (same as apps/client/e2e/*): from repo root,
//   pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then, in another shell: pnpm test:e2e
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

// This spec's typecheck runs under the root tsconfig.json (qa/tests/**/*.ts), a separate program
// from apps/client/tsconfig.json where apps/client/src/debug/spike-hook.ts declares the same
// global — no merge conflict across programs. Kept minimal (only the fields this test reads).
declare global {
  interface Window {
    __kwSpike?: {
      readonly state: string;
      readonly position: {
        readonly lat: number;
        readonly lng: number;
        readonly timestamp: number;
      } | null;
    };
  }
}

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const FIXTURE_PATH = join(
  REPO_ROOT,
  'tools/tiles/fixtures/lumpini/pmtiles/pm4-20260923-z15-lumpini.pmtiles',
);
const FIXTURE_BYTES = readFileSync(FIXTURE_PATH);

const FIXTURE_ORIGIN = 'https://qa-fixture.invalid';
const FIXTURE_TILES_URL = `${FIXTURE_ORIGIN}/pm4-20260923-z15-lumpini.pmtiles`;

function spikeUrl(query: string): string {
  const tilesParam = `e2eTilesUrl=${encodeURIComponent(FIXTURE_TILES_URL)}`;
  return `/?${query}&${tilesParam}&e2eGlyphsUrl=&e2eSpriteUrl=`;
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range',
  'access-control-expose-headers': 'content-range, content-length, accept-ranges',
};

/** Answers a pmtiles:// fetch to FIXTURE_TILES_URL from the on-disk fixture, with Range support. */
async function fulfillFromFixture(route: Route): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const range = request.headers()['range'];
  if (range === undefined) {
    await route.fulfill({
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'accept-ranges': 'bytes',
        'content-type': 'application/octet-stream',
      },
      body: FIXTURE_BYTES,
    });
    return;
  }
  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  const start = match?.[1] !== undefined ? Number(match[1]) : 0;
  const end = match?.[2] !== undefined ? Number(match[2]) : FIXTURE_BYTES.length - 1;
  const slice = FIXTURE_BYTES.subarray(start, end + 1);
  await route.fulfill({
    status: 206,
    headers: {
      ...CORS_HEADERS,
      'accept-ranges': 'bytes',
      'content-type': 'application/octet-stream',
      'content-range': `bytes ${start}-${end}/${FIXTURE_BYTES.length}`,
    },
    body: slice,
  });
}

test.describe('map + real fixture tile (Lumpini PMTiles) + mock location', () => {
  test('canvas renders from the real fixture, no byte-serving error, and the position dot moves with the trace', async ({
    page,
  }) => {
    const fixtureRequests: string[] = [];
    const consoleErrors: string[] = [];
    await page.route(`${FIXTURE_ORIGIN}/**`, (route) => {
      fixtureRequests.push(route.request().url());
      void fulfillFromFixture(route);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(spikeUrl('loc=mock&trace=synthetic-park-loop-01&speed=60&loop=1&hud=1'));

    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
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

    // Proves the fixture was really exercised (not skipped because of the earlier no-network path).
    expect(fixtureRequests.length).toBeGreaterThan(0);

    // F1 class of bug: a server that ignores Range and always returns 200+full body breaks
    // MapLibre/PMTiles with a console error mentioning byte serving.
    const byteServingErrors = consoleErrors.filter((line) => /byte serving/i.test(line));
    expect(byteServingErrors).toEqual([]);
  });
});
