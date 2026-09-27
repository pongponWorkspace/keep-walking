// P2-F04-T22 (C2-1), updated for D-133 (P2-F05-T16 QA gate): every request the app itself issues
// during a full run (confirm -> Active -> exit) must stay within
// `config/app/client.json#requestOrigins.allowedOrigins` — except the external navigation link,
// which is a top-level navigation the player chooses themselves, not a `fetch`/`XHR` of the app
// (tech note F04 14.1, `config/app/privacy.json`'s own comment on `navigation.externalOpenTimeout_ms`:
// "the link is a top-level navigation chosen by the player ... outside the allowed-origin list of
// config/app/client.json").
//
// `allowedOrigins` now exists (`["self"]` at the time of writing, P2-F06-T08 closed the config gap
// A-P2-F04-T22-2 used to describe): this spec resolves it for real instead of only ever comparing
// against the page's own origin. `"self"` means the page's own origin; an `"env:VITE_..._URL"`
// entry (the shape `docs/reviews/F04-F05-tech-gate.md` section 9.3 R2-02 says P2-F06-T10 will add,
// once the map's tile/glyph/sprite CDN needs its own first-party-only entry) resolves to that env
// var's own origin, read from `process.env` the same way Vite itself would have baked it in — and
// is simply absent from the resolved set (not an error) when that env var is unset, matching this
// spec's own `TILE_OVERRIDE` below, which always forces the map's env fully unconfigured so no
// tile request is ever expected in the first place. An entry that is neither shape fails the spec
// outright (fail-closed on a config typo) rather than silently allowing every request through.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const MISSING_LOCAL_TILES_PATH = '/e2e-fixtures/does-not-exist.pmtiles';
const TILE_OVERRIDE = `e2eTilesUrl=${encodeURIComponent(MISSING_LOCAL_TILES_PATH)}&e2eGlyphsUrl=&e2eSpriteUrl=`;

function spikeUrl(query: string): string {
  return `/?${query}&${TILE_OVERRIDE}`;
}

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const clientConfig = JSON.parse(
  readFileSync(join(REPO_ROOT, 'config/app/client.json'), 'utf8'),
) as { readonly requestOrigins: { readonly allowedOrigins: readonly string[] } };

/** Resolves `requestOrigins.allowedOrigins` into a concrete set of origins for this test run.
 * Handles both the current shape (`["self"]`) and the shape P2-F06-T10 is expected to add
 * (`["self", "env:VITE_TILES_URL", ...]`, R2-02 above) without needing to know which one is live. */
function resolveAllowedOrigins(pageOrigin: string, allowedOrigins: readonly string[]): string[] {
  const origins: string[] = [];
  for (const entry of allowedOrigins) {
    if (entry === 'self') {
      origins.push(pageOrigin);
      continue;
    }
    const envMatch = /^env:(.+)$/.exec(entry);
    if (envMatch !== null) {
      const envVarName = envMatch[1] as string;
      const value = process.env[envVarName]?.trim();
      if (value !== undefined && value.length > 0) {
        origins.push(new URL(value).origin);
      }
      // Unset env var: this deploy never configured that origin, so nothing to allow for it —
      // never silently treated as "allow anything".
      continue;
    }
    throw new Error(
      `f04-origin-allowlist.spec.ts: unrecognized requestOrigins.allowedOrigins entry "${entry}" ` +
        '(expected "self" or "env:<VAR_NAME>")',
    );
  }
  return origins;
}

test.describe('C2-1 — every app request during a full run stays same-origin', () => {
  test("confirm -> Active -> exit issues no request to any origin other than the page's own", async ({
    page,
    baseURL,
  }) => {
    const baseOrigin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const allowedOrigins = resolveAllowedOrigins(
      baseOrigin,
      clientConfig.requestOrigins.allowedOrigins,
    );
    const foreignRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!allowedOrigins.includes(url.origin)) foreignRequests.push(request.url());
    });

    // `e2eClassId=tanker` (read via `config/app/client.json#providerQuery.paramNames.e2eClassId`,
    // `f04-app.ts`'s `resolveE2eClassId` — no standalone `E2E_CLASS_ID_PARAM` constant exists,
    // unlike an earlier version of this comment claimed; the same test hook
    // `apps/client/e2e/full-run.spec.ts` uses): F06-T10's real class-picker screen does not exist
    // yet, so without this every `confirm` is rejected `no_class` and no run ever starts — this
    // spec needs a real Active -> exit run, not just a rejected confirm. D-130 (P2-X37,
    // gameplay-programmer) requires every test hook to be read only under `loc=mock` — the query
    // string below sets `loc=mock` itself, so this hook is read under the Mock provider.
    await page.goto(
      spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10&e2eClassId=tanker'),
    );
    const popup = page.locator('.popup', { has: page.locator('.confirm-cancel') });
    const enterButton = popup.locator('button.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 30_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).toBeVisible();

    // Let the run continue a while (some ticks/state churn) before exiting.
    await page.waitForTimeout(5_000);
    await page.locator('.run-exit-button').click();
    // Scoped to `.run-bar` (`ui/run-bar.ts`): `.btn-danger-confirm` is not unique on the page —
    // `ui/settings-walking-safety.ts`'s always-mounted (hidden) auto-retreat-off confirm button
    // reuses the same class, which makes the bare selector a Playwright strict-mode violation
    // once this test actually reaches Active (previously it never got this far — this whole test
    // was stuck at `no_class` before the `e2eClassId` hook above was added).
    await page.locator('.run-bar button.btn-danger-confirm').click();
    // `.run-summary` alone (not `.run-summary, .run-bar`): `f04-app.ts#render`'s
    // `state.lastSummary !== null` branch shows the summary but returns before touching `runBar`,
    // so `.run-bar` can still match not-hidden for a moment after exit (exit-animation freeze) —
    // asserting on both as one OR locator is a Playwright strict-mode violation once two elements
    // are simultaneously visible, and the summary screen is what a real exit is actually checking.
    await expect(page.locator('.run-summary')).toBeVisible();

    expect(foreignRequests).toEqual([]);
  });

  test('the navigation link itself is a top-level, player-chosen navigation to a real maps host — not a fetch of the app, and correctly excluded above', async ({
    page,
  }) => {
    // `qa-e2e-leelawadee-checkin-01` starts well outside the polygon (the approach walk) — at
    // speed=1 (real time) that is about a minute of real outside-the-dungeon time before it ever
    // crosses in, plenty of window to catch the nav panel (not the confirm popup) showing its
    // navigate button, matching the flow this exclusion is actually about (F04 flow section 2,
    // the A2 nearby panel).
    await page.goto(spikeUrl('loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=1&loop=0'));
    const navLink = page.locator('.nav-navigate-button');
    await expect(navLink).toBeVisible({ timeout: 15_000 });
    const href = await navLink.getAttribute('href');
    expect(href).not.toBeNull();
    if (href === null) return;
    const target = new URL(href);
    // A real external maps host (google.com or apple.com) — never the app's own origin, and never
    // opened as a same-tab `fetch`/`XHR` (the element is `target="_blank" rel="noopener noreferrer"`,
    // tech note 14.1: "การเปิดลิงก์เป็น navigation ระดับบนที่ผู้เล่นเลือก ไม่ใช่ request ของแอป").
    expect(['www.google.com', 'maps.apple.com']).toContain(target.hostname);
    expect(await navLink.getAttribute('target')).toBe('_blank');
    expect(await navLink.getAttribute('rel')).toBe('noopener noreferrer');
    // Never the player's own position anywhere in the URL query.
    expect(target.search).not.toMatch(/origin=/);
  });
});
