// Black-box e2e for the settings menu's "export" row (P2-X50, plan requirement C2-2,
// `product/playtest/phase-2-plan.md` §2/§11): the only way a playtest participant gets their
// telemetry off the device (no server, no auto-upload, D-088). Drives a real run through the same
// fixture `full-run.spec.ts` already uses (deterministic: exactly one granted tick), then opens
// `S-22-settings` mid-run (`withdraw-consent.spec.ts`'s own `window.location.hash` approach — a
// settings row must stay reachable from an active run, ia.md section 5 / NN-7) and clicks export.
//
// A fresh Playwright browser context has empty `localStorage`, so this run's first
// `run_tick_granted` is also this player's first-ever one: `session/engine.ts#persistAndMap`
// (F06-TG-02) fires `onboarding_first_reward_granted` alongside it, giving this spec a real
// instance of that event to check, not just a hypothetical.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { ExportedLine } from '../src/telemetry/export';

const START = '2026-10-02T12:00';
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

// C2-3 (`config/app/telemetry.json#export.forbiddenPropertyNames`): the exact key list a real
// coordinate or accuracy value could hide behind, checked as raw text across the whole file (not
// just top-level properties) so a nested leak would also fail this.
const FORBIDDEN_KEY_PATTERN =
  /"(lat|lng|lon|latitude|longitude|accuracy|accuracy_m|coords|coordinates|position|geometry|geohash|client_ts|server_ts|timestamp)"\s*:/;
// A coordinate-shaped decimal pair inside Thailand's rounded-outward range (config/app/
// telemetry.json#export.coordinateLikeNumberGuard: lat 5.0-21.0, >= 4 decimals) — this fixture's
// own trace runs through Bangkok, so this is the realistic leak shape to check for, not an
// arbitrary one.
const COORDINATE_LIKE_NUMBER_PATTERN = /\b(?:1[0-9]|[5-9])\.\d{4,}\b/;

test.describe('S-22-settings — export', () => {
  test('export downloads a JSONL file with real run events and no coordinate', async ({ page }) => {
    test.setTimeout(60_000);
    // Same fix as `full-run.spec.ts`/`withdraw-consent.spec.ts`: keep this spec on the normal run
    // screen, never the pocket screen's dark overlay, which this spec does not test.
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });

    await page.goto(FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 20_000 });
    await enterButton.click();
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 5_000 });

    const grantedToast = page.locator('.toast:has(.toast-line):not(.faded)');
    await expect(grantedToast).toBeVisible({ timeout: 30_000 });

    // Open S-22-settings without leaving the active run (ia.md: reachable from every state).
    await page.evaluate(() => {
      window.location.hash = '#/settings';
    });
    const settingsMenu = page.locator('.settings-menu');
    await expect(settingsMenu).not.toBeHidden();

    const downloadPromise = page.waitForEvent('download');
    await settingsMenu.locator('.settings-menu-export').click();
    const download = await downloadPromise;

    // No date, no session id (D-088/C2-4): only the configured prefix plus a random 8-hex suffix.
    expect(download.suggestedFilename()).toMatch(/^kw-p2-telemetry-[0-9a-f]{8}\.jsonl$/);

    const path = await download.path();
    const text = path === null ? '' : await readFile(path, 'utf-8');
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(FORBIDDEN_KEY_PATTERN);
    expect(text).not.toMatch(COORDINATE_LIKE_NUMBER_PATTERN);

    const lines: ExportedLine[] = text
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as ExportedLine);
    for (const line of lines) {
      expect(line).toEqual(
        expect.objectContaining({
          event_name: expect.any(String),
          t_rel_ms: expect.any(Number),
          session_id: expect.any(String),
          platform: expect.any(String),
          app_version: expect.any(String),
          properties: expect.any(Object),
        }),
      );
      expect(line.t_rel_ms).toBeGreaterThanOrEqual(0);
    }

    const eventNames = lines.map((line) => line.event_name);
    expect(eventNames).toContain('dungeon_entered');
    expect(eventNames).toContain('run_tick_granted');
    expect(eventNames).toContain('onboarding_first_reward_granted');

    // "when those happened" (this task's own acceptance): `run_gps_status_changed` has no call
    // site wired anywhere yet (`telemetry/gps-status-events.ts`'s own doc comment), so it is never
    // required here — only checked for a coordinate leak on the rare chance it does appear.
    for (const line of lines.filter((l) => l.event_name === 'run_gps_status_changed')) {
      expect(Object.keys(line.properties)).not.toEqual(
        expect.arrayContaining(['lat', 'lng', 'accuracy']),
      );
    }
  });
});
