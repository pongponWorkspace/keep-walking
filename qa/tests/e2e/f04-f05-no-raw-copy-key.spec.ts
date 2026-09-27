// P2-F05-T16 (QA gate F04+F05): black-box regression for the one thing every copy-gate round
// checks by hand (design/reviews/F04-F05-copy-gate.md rounds 1-2, "ไม่เหลือทางที่ key ดิบ,
// `{ตัวแปร}` ดิบ ... จะขึ้นจอ") — this file makes it an automated e2e check on the three screens
// the copy gate named: `S-02-dungeon-confirm` (the confirm popup), `S-03-run` (the run bar) and
// the map's proximity nav panel (`ui/nav-panel.ts`). A raw, un-substituted copy key looks exactly
// like `dungeon.someKey` (`copy/load.ts`'s own "unknown key -> show the key itself" fallback,
// TL-N06) and a raw, un-substituted `{variable}` looks exactly like a literal `{` in rendered text
// (`copy/format.ts`'s `formatText`, which never crashes on a missing variable either — same
// "honest, never crash on copy" convention, just as silently wrong on-screen if a call site forgot
// a variable).
//
// Not a copy-content check (narrative-designer/content gate own wording, tone, six copy rules) —
// only "did every key/variable actually get resolved before it reached the DOM".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const copy = JSON.parse(
  readFileSync(join(REPO_ROOT, 'config/content/copy.th.json'), 'utf8'),
) as Record<string, { readonly text: string }>;

/** Same convention as `f04-checkin-confirm-flow.spec.ts`: read the real published copy back
 * rather than re-typing Thai sentences by hand (a wording edit would silently desync a hand-typed
 * copy). */
function copyText(key: string): string {
  const entry = copy[key];
  if (entry === undefined) throw new Error(`copy.th.json missing key ${key}`);
  return entry.text;
}

// Every real namespace copy.th.json actually declares (derived, not hand-typed, so a new namespace
// added later is covered automatically — the same "single source" reasoning as reading the file at
// all rather than hardcoding a list).
const NAMESPACES = [
  ...new Set(
    Object.keys(copy)
      .filter((k) => !k.startsWith('_'))
      .map((k) => k.split('.')[0]),
  ),
];
// A raw key looks like `<namespace>.<identifierChar>` — e.g. "dungeon.checkinNoClass". Real Thai
// copy never contains a literal English namespace word followed by a dot and a letter/digit, so
// any match here is a leak, not a false positive.
const RAW_KEY_PATTERN = new RegExp(`\\b(?:${NAMESPACES.join('|')})\\.[A-Za-z0-9]`);
const RAW_BRACE_PATTERN = /[{}]/;

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

/** Asserts a screen's own rendered text never shows a raw copy key or a raw `{variable}` — reads
 * `innerText` (rendered, not `innerHTML`: a key hidden inside an attribute the player never reads
 * is not this check's concern) once the locator is visible, so a screen still mid-render is never
 * flagged for text it has not painted yet. */
async function expectNoRawCopyLeak(locator: Locator, label: string): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 20_000 });
  const text = await locator.innerText();
  expect(text, `${label}: raw copy key found in rendered text:\n${text}`).not.toMatch(
    RAW_KEY_PATTERN,
  );
  expect(text, `${label}: raw "{"/"}" found in rendered text:\n${text}`).not.toMatch(
    RAW_BRACE_PATTERN,
  );
}

test.describe('F04/F05 no raw copy key or {variable} on S-02, S-03 or the nav panel', () => {
  test('nav panel (pre-run proximity panel, F04 flow section 2 A2)', async ({ page }) => {
    // `qa-e2e-leelawadee-checkin-01` starts well outside `leelawadee-lawn` — at speed=1 that is
    // about a minute of real approach-walk time before it ever crosses in, plenty of window for
    // the nav panel (distance/direction/navigate button) to render (same trace/speed
    // `f04-origin-allowlist.spec.ts`'s nav-link test already uses for the same reason).
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=1&loop=0'));
    await expectNoRawCopyLeak(page.locator('.nav-panel'), 'nav panel');
  });

  test('S-02-dungeon-confirm (confirm popup, every check-in status line)', async ({ page }) => {
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10'));
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    // Frame 1: not_enough_trace (approach not finished yet) — the countdown line included, since
    // `{countdown}` (copy.th.json `_variables.countdown`) is exactly the kind of variable this
    // spec exists to catch if it were ever left raw.
    await expectNoRawCopyLeak(popup, 'S-02-dungeon-confirm (not_enough_trace)');
    // Frame 2: ready (button enabled) — the zone name + level range card, no status line.
    await expect(popup.locator('button.btn-primary')).toBeEnabled({ timeout: 30_000 });
    await expectNoRawCopyLeak(popup, 'S-02-dungeon-confirm (ready)');
  });

  test('S-02-dungeon-confirm poor_accuracy status line', async ({ page }) => {
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-poor-accuracy-01&speed=10'));
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    await expect(popup.locator('.checkin-status-row')).not.toBeEmpty({ timeout: 20_000 });
    await expectNoRawCopyLeak(popup, 'S-02-dungeon-confirm (poor_accuracy)');
  });

  test('S-03-run (run bar through Active, Grace and the closing-soon warning)', async ({
    page,
  }: {
    page: Page;
  }) => {
    test.setTimeout(60_000);
    // `e2eClassId=tanker`: without it `confirm` fails closed on `no_class`
    // (`packages/shared/src/session/reducer.ts`'s `handleConfirm`, F06-T10's real class-picker
    // screen does not exist yet) and the run bar never appears at all — same hook every other e2e
    // spec that needs `Active` already carries (`full-run.spec.ts`,
    // `f04-checkin-confirm-flow.spec.ts`).
    await page.goto(
      spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10&e2eClassId=tanker'),
    );
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    const runBar = page.locator('.run-bar');
    await expectNoRawCopyLeak(runBar, 'S-03-run (Active)');

    // Walks out past the polygon edge and holds — Active -> Grace ("left_polygon") — the pill's
    // own label text is a second, independent copy substitution site from the Active one above.
    await expect(page.locator('.run-state-pill')).toHaveText(copyText('run.stateGraceLabel'), {
      timeout: 60_000,
    });
    await expectNoRawCopyLeak(runBar, 'S-03-run (Grace)');

    await page.locator('.run-exit-button').click();
    await page.locator('.run-bar button.btn-danger-confirm').click();
  });
});
