// P2-F04-T22 — full-stack e2e of the F04 confirm flow, against a real committed dungeon
// (leelawadee-lawn, a small park inside Lumpini, open every day 05:00-21:00 — see
// qa/tests/traces/scenarios/e2e-real-dungeons.ts for exactly how its interior/exterior points were
// found). Complements (does not duplicate) the developer's own DOM-level unit test
// `apps/client/src/ui/dungeon-confirm.test.ts` (never modified, never imported here), which already
// proves Cancel is present-by-construction in every check-in state at the component level; this
// file instead proves the *real wiring* end to end: engine -> UI -> a real click, and a real Mock
// walk-out/walk-back-in changing the run-state pill.
//
// Run: pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// then (in another shell) pnpm test:e2e
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Guaranteed-missing local tiles path (same convention as apps/client/e2e/location-mock.spec.ts):
// this file is about F04's confirm/run UI, not the map, so every case forces the map env fully
// unconfigured (never fetches a tile, never depends on the network, TL-S11).
const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const copy = JSON.parse(
  readFileSync(join(REPO_ROOT, 'config/content/copy.th.json'), 'utf8'),
) as Record<string, { readonly text: string }>;
function copyText(key: string): string {
  const entry = copy[key];
  if (entry === undefined) throw new Error(`copy.th.json missing key ${key}`);
  return entry.text;
}

/** The confirm popup, scoped by its own unique Cancel button (`.confirm-cancel`) so it is never
 * confused with the run-bar's own `.popup-overlay` (the exit confirmation), which shares the same
 * generic overlay/popup classes. */
function confirmPopup(page: Page) {
  return page.locator('.popup', { has: page.locator('.confirm-cancel') });
}

test.describe('F04 confirm popup — Cancel available in every check-in state (C-1), real wiring', () => {
  test('Cancel while not_enough_trace hides the popup and it does not reappear on its own', async ({
    page,
  }) => {
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10'));
    const popup = confirmPopup(page);
    const cancelButton = popup.locator('.confirm-cancel');
    await expect(cancelButton).toBeVisible({ timeout: 15_000 });
    // Early in the approach: not ready yet, Enter must stay disabled.
    await expect(popup.locator('button.btn-primary')).toBeDisabled();
    await cancelButton.click();
    await expect(popup).toBeHidden();
    // Give the Mock replay a few more seconds (still walking/standing inside) — Cancel must not
    // be treated as "confirm", so nothing reopens the popup on its own.
    await page.waitForTimeout(3_000);
    await expect(popup).toBeHidden();
  });

  test('Cancel while poor_accuracy: status text is the real poor_accuracy copy, Cancel still works', async ({
    page,
  }) => {
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-poor-accuracy-01&speed=10'));
    const popup = confirmPopup(page);
    await expect(popup).toBeVisible({ timeout: 15_000 });
    const statusRow = page.locator('.checkin-status-row');
    await expect(statusRow).toHaveText(copyText('dungeon.checkinPoorAccuracy'), {
      timeout: 20_000,
    });
    await expect(popup.locator('button.btn-primary')).toBeDisabled();
    await popup.locator('.confirm-cancel').click();
    await expect(popup).toBeHidden();
  });

  test('confirm -> Enter -> run bar Active -> walk out -> Grace -> walk back in -> Active again (returned)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10'));
    const popup = confirmPopup(page);
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(popup).toBeHidden();

    const pill = page.locator('.run-state-pill');
    await expect(page.locator('.run-bar')).toBeVisible();
    await expect(pill).toHaveText(copyText('run.stateActiveLabel'));

    // The trace now walks out past the polygon edge and holds there — Active -> Grace
    // ("left_polygon"), then walks back in and holds again — Grace -> Active ("returned").
    await expect(pill).toHaveText(copyText('run.stateGraceLabel'), { timeout: 60_000 });
    await expect(pill).toHaveText(copyText('run.stateActiveLabel'), { timeout: 60_000 });

    // Clean up: exit the run through the real exit button + confirm, same as a player would.
    await page.locator('.run-exit-button').click();
    await page.locator('button.btn-danger-confirm').click();
  });
});
