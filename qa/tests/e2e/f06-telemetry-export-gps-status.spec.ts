// QA black-box e2e (P2-F06-T21, board handoff from R2-N1 / tech gate F06 round 2 + X48): the board
// row for this gate names two specific events that must show up in a REAL export file downloaded
// from the new `.settings-menu-export` row -- `onboarding_first_reward_granted` (tech gate round 2
// R2-N1, added in `apps/client/e2e/telemetry-export.spec.ts` already) and
// `run_gps_status_changed` (P2-X48/P2-H50). That spec's own comment says the second one "has no
// call site wired anywhere yet" and only ever checks it for a coordinate leak IF it happens to
// appear -- but `apps/client/src/telemetry/gps-status-events.ts`'s `wireGpsStatusTelemetry` only
// ever emits when the display state is a real *problem* (`none -> null`, no event), so a clean,
// uninterrupted Mock trace such as that spec's fixture never actually exercises it. This spec
// forces a real GPS-status transition (network loss, the one path this workspace can reliably
// simulate at the browser level with `BrowserContext.setOffline`) during an active run, then
// proves the resulting `offline`/`restored` pair is really in the exported file, with the right
// `context` ("run") and no coordinate leak -- not skipped because it "might not appear".
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

interface ExportedLine {
  readonly event_name: string;
  readonly t_rel_ms: number;
  readonly session_id: string;
  readonly platform: string;
  readonly app_version: string;
  readonly properties: Record<string, unknown>;
}

// Same fixture/hooks `apps/client/e2e/telemetry-export.spec.ts` and `full-run.spec.ts` already rely
// on (pinned opening-hours window, deterministic seed, skip onboarding straight to a real run).
const START = '2026-10-02T12:00';
const FIXTURE_URL =
  '/?loc=mock&trace=e2e-full-run-01&speed=60&loop=0&hud=0&e2eClassId=tanker&seed=1' +
  `&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

const FORBIDDEN_KEY_PATTERN =
  /"(lat|lng|lon|latitude|longitude|accuracy|accuracy_m|coords|coordinates|position|geometry|geohash)"\s*:/;
const COORDINATE_LIKE_NUMBER_PATTERN = /\b(?:1[0-9]|[5-9])\.\d{4,}\b/;

test.describe('S-22-settings export — run_gps_status_changed and onboarding_first_reward_granted are really in the file', () => {
  test('a real offline/restored transition mid-run, plus the first reward, both survive into the exported JSONL', async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    // Same fix as the specs this one borrows its fixture from: stay on the normal run screen, not
    // the pocket screen's dark overlay (irrelevant to this spec).
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
      delete (Navigator.prototype as any).wakeLock;
    });

    await page.goto(FIXTURE_URL);

    const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
    await expect(enterButton).toBeEnabled({ timeout: 20_000 });
    await enterButton.click();
    // F06-TG-07 (tech gate F06 round 1): WebKit under parallel load can take longer than 5 s here.
    await expect(page.locator('.run-bar')).not.toBeHidden({ timeout: 20_000 });

    // Force a real `run_gps_status_changed` transition right away, while the run is freshly
    // confirmed and definitely still active (`resolveGpsStatusContext` -> context 'run', the one
    // path P2-H50 cares about most) -- at speed=60 with loop=0 this fixture's run can end on its
    // own well before a slower toggle-after-the-first-tick would get to it.
    await context.setOffline(true);
    // The offline banner (`gps.offline`, `ui/gps-ui.ts#mountGpsUi`'s `#network-banner`,
    // design/ux/components.md 6 `.banner.info`) is the same player-visible signal the network
    // listener drives -- waiting for it proves the event's own trigger condition (a real `offline`
    // window event reaching the app) actually fired, not just that Playwright's API call returned.
    const networkBanner = page.locator('#network-banner');
    await expect(networkBanner).toBeVisible({ timeout: 10_000 });
    await context.setOffline(false);
    await expect(networkBanner).toBeHidden({ timeout: 10_000 });

    // Wait for the real first-ever reward tick (this is a fresh browser context -> first-ever) so
    // `onboarding_first_reward_granted` has actually fired before export, the same wait
    // `telemetry-export.spec.ts` uses.
    const grantedToast = page.locator('.toast:has(.toast-line):not(.faded)');
    await expect(grantedToast).toBeVisible({ timeout: 30_000 });

    // Open S-22-settings without leaving the active run (ia.md: reachable from every state) and
    // export, same convention `telemetry-export.spec.ts`/`withdraw-consent.spec.ts` use.
    await page.evaluate(() => {
      window.location.hash = '#/settings';
    });
    const settingsMenu = page.locator('.settings-menu');
    await expect(settingsMenu).not.toBeHidden();

    const downloadPromise = page.waitForEvent('download');
    await settingsMenu.locator('.settings-menu-export').click();
    const download = await downloadPromise;

    const path = await download.path();
    const text = path === null ? '' : await readFile(path, 'utf-8');
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(FORBIDDEN_KEY_PATTERN);
    expect(text).not.toMatch(COORDINATE_LIKE_NUMBER_PATTERN);

    const lines: ExportedLine[] = text
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as ExportedLine);

    const eventNames = lines.map((line) => line.event_name);
    expect(eventNames).toContain('onboarding_first_reward_granted');

    const gpsEvents = lines.filter((l) => l.event_name === 'run_gps_status_changed');
    // The real point of this spec: not "if it appears", but that it does, with the right shape.
    // There is also a real, expected `searching`/`context: map` (or `onboarding`) catch-up event
    // from cold boot, before the very first GPS fix (`wireGpsStatusTelemetry`'s own doc comment) --
    // this spec does not assert every event in the file is the one it deliberately caused, only
    // that its own real offline -> restored pair, with the run's own context, made it through.
    expect(gpsEvents.length).toBeGreaterThan(0);
    for (const event of gpsEvents) {
      expect(Object.keys(event.properties)).not.toEqual(
        expect.arrayContaining(['lat', 'lng', 'accuracy', 'accuracy_m']),
      );
    }
    const runContextEvents = gpsEvents.filter((e) => e.properties['context'] === 'run');
    expect(runContextEvents.map((e) => e.properties['status'])).toEqual(
      expect.arrayContaining(['offline', 'restored']),
    );
  });
});
