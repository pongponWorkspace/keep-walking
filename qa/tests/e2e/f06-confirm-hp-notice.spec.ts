// P2-H58 — black-box e2e for design gate F06 DG6-01 (round 2, `design/reviews/F06-design-gate.md`
// §10 re-run criteria): the confirm popup (`apps/client/src/ui/dungeon-confirm.ts`) must always
// render the player's current HP (`dungeon.confirmHp`, F06-R05), plus exactly one of the low-HP
// note (`dungeon.confirmLowHpNote`, auto-retreat on and HP at/under the threshold) or the
// auto-retreat-off badge (`run.autoRetreatOffBadge`) — never both, never a reason to disable
// "เข้า" (entering at any HP > 0 is intended, F06-R14).
//
// Real wiring end to end, same convention as `f04-checkin-confirm-flow.spec.ts`: a real Mock walk
// into a real, open, committed dungeon (`leelawadee-lawn`, `qa-e2e-leelawadee-checkin-01`), with a
// pre-seeded `kw.p2.session` (this task's own fixtures under `qa/tests/e2e/fixtures/`, hand-built
// to the same `PersistedSession` shape `apps/client/e2e/fixtures/e2e-f06-revive-precondition.
// session.json` already uses, `player.hp.anchorAt_ms`/`savedAt_ms` pinned to this file's own
// `START` so outside-dungeon HP regen has ~0 real elapsed time to drift the percentage before the
// popup is read) so the player's HP/auto-retreat state is deterministic before the popup ever
// opens — never re-derived here, only read back from the real DOM.
//
// Runs on both Playwright projects (android-chrome, ios-safari) automatically — no
// project-specific branching in this file.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const copy = JSON.parse(
  readFileSync(join(REPO_ROOT, 'config/content/copy.th.json'), 'utf8'),
) as Record<string, { readonly text: string }>;

function copyText(key: string): string {
  const entry = copy[key];
  if (entry === undefined) throw new Error(`copy.th.json missing key ${key}`);
  return entry.text;
}

// Same guaranteed-missing, local, same-origin tile override every other qa/tests/e2e F04/F06 spec
// uses (TL-S11: this file is about popup UI, never the map).
const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;
// Friday noon, well inside `leelawadee-lawn`'s daily 05:00-21:00 window regardless of `speed`
// (same value `f04-checkin-confirm-flow.spec.ts`/`full-run.spec.ts` already pin) — and the exact
// wall-clock the three fixtures' own `savedAt_ms`/`player.hp.anchorAt_ms` (1790917200000) were
// computed from, so there is ~0 elapsed sim time (and therefore ~0 outside-dungeon HP regen,
// `progression.hpRecovery.outsideDungeonRegen_pctMaxHpPerMin`) between "session saved" and "first
// GPS fix" for the low-HP fixture.
const START = '2026-10-02T12:00';

/** The confirm popup, scoped by its own unique Cancel button — same convention
 * `f04-checkin-confirm-flow.spec.ts` already uses to never confuse it with the run-bar's own exit
 * `.popup-overlay`. */
function confirmPopup(page: Page) {
  return page.locator('.popup', { has: page.locator('.confirm-cancel') });
}

async function seedSession(page: Page, fixtureFile: string): Promise<void> {
  const fixture = readFileSync(join(FIXTURES_DIR, fixtureFile), 'utf8');
  await page.addInitScript((value) => {
    window.localStorage.setItem('kw.p2.session', value);
  }, fixture);
}

function checkinUrl(): string {
  // `e2eSkipOnboarding=1` (D-130): a persisted session with a class already chosen still boots
  // straight past onboarding into the real map/confirm popup, same hook every other F04/F06 e2e
  // spec in this repo already carries.
  return (
    `/?loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10&e2eSkipOnboarding=1` +
    `&start=${encodeURIComponent(START)}&${TILE_OVERRIDE}`
  );
}

/** No raw, un-substituted copy key (`dungeon.someKey`) and no raw, un-substituted `{variable}` —
 * same two failure shapes `f04-f05-no-raw-copy-key.spec.ts` already checks elsewhere, asserted
 * directly here since this file already pins the exact expected string per case. */
function assertNoRawCopyArtifacts(text: string): void {
  expect(text).not.toContain('{');
  expect(text).not.toMatch(/\b[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*\b/);
}

test.describe('F06 design gate DG6-01 — confirm popup HP row + low-HP note / auto-retreat-off badge', () => {
  test('full HP: HP row only, no low-HP note, no off badge, Enter enabled', async ({ page }) => {
    test.setTimeout(60_000);
    await seedSession(page, 'f06-confirm-full-hp.session.json');
    await page.goto(checkinUrl());

    const popup = confirmPopup(page);
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });

    const hpRow = popup.locator('.confirm-hp');
    await expect(hpRow).toHaveText(formatConfirmHp(100));
    assertNoRawCopyArtifacts(await hpRow.innerText());

    await expect(popup.locator('.confirm-hp-note')).toBeHidden();
    await expect(popup.locator('.confirm-auto-retreat-off-badge')).toBeHidden();
  });

  test('HP <= 25% with auto-retreat on: HP row + low-HP note, no off badge, Enter enabled', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await seedSession(page, 'f06-confirm-low-hp-autoretreat-on.session.json');
    await page.goto(checkinUrl());

    const popup = confirmPopup(page);
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });

    const hpRow = popup.locator('.confirm-hp');
    // Fixture starts at 60/300 = 20% (`dungeons.hpSafety.autoRetreatThreshold_pct` = 25) but the
    // approach walk (`qa-e2e-leelawadee-checkin-01` at speed=10) takes tens of real seconds, and
    // `progression.hpRecovery.outsideDungeonRegen_pctMaxHpPerMin` keeps regenerating HP outside any
    // run the whole time — so the exact percent by the time Enter becomes enabled is not pinned to
    // the literal 20% the fixture started at, only guaranteed to still be at/under the threshold
    // (checked below via the note's own visibility, which the client computes from the same
    // engine value this reads).
    await expect(hpRow).toHaveText(confirmHpPattern());
    const hpPct = Number((await hpRow.innerText()).replace(/\D/g, ''));
    expect(hpPct).toBeGreaterThan(0);
    expect(hpPct).toBeLessThanOrEqual(25);
    assertNoRawCopyArtifacts(await hpRow.innerText());

    const lowHpNote = popup.locator('.confirm-hp-note');
    await expect(lowHpNote).toBeVisible();
    await expect(lowHpNote).toHaveText(copyText('dungeon.confirmLowHpNote'));
    assertNoRawCopyArtifacts(await lowHpNote.innerText());

    await expect(popup.locator('.confirm-auto-retreat-off-badge')).toBeHidden();
    await expect(enterButton).toBeEnabled(); // F06-R14/R05: never a reason to disable "เข้า"
  });

  test('auto-retreat off: HP row + off badge, no low-HP note, Enter enabled', async ({ page }) => {
    test.setTimeout(60_000);
    await seedSession(page, 'f06-confirm-autoretreat-off.session.json');
    await page.goto(checkinUrl());

    const popup = confirmPopup(page);
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });

    const hpRow = popup.locator('.confirm-hp');
    await expect(hpRow).toHaveText(formatConfirmHp(100));
    assertNoRawCopyArtifacts(await hpRow.innerText());

    await expect(popup.locator('.confirm-hp-note')).toBeHidden();
    const offBadge = popup.locator('.confirm-auto-retreat-off-badge');
    await expect(offBadge).toBeVisible();
    await expect(offBadge).toHaveText(copyText('run.autoRetreatOffBadge'));
    assertNoRawCopyArtifacts(await offBadge.innerText());

    await expect(enterButton).toBeEnabled(); // F06-R14/R05: never a reason to disable "เข้า"
  });
});

/** `dungeon.confirmHp`'s own `{hpPct}` template (`copy.th.json`), filled the same way
 * `formatCopyText` would — read back from the real published string rather than hand-typed so a
 * wording edit upstream cannot silently desync this file. */
function formatConfirmHp(hpPct: number): string {
  return copyText('dungeon.confirmHp').replace('{hpPct}', String(hpPct));
}

/** Same template, but as a `RegExp` matching any `{hpPct}` value — no Thai literal hand-typed in
 * this file: every character either comes from `copy.th.json` (escaped) or is a pattern the
 * template's own `{hpPct}` placeholder stands in for. Used where the exact percent is
 * non-deterministic (outside-dungeon HP regen during the approach walk, see the caller's comment). */
function confirmHpPattern(): RegExp {
  const escaped = copyText('dungeon.confirmHp').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace('\\{hpPct\\}', '\\d+')}$`);
}
