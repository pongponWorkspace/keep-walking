// Root Playwright config: browser e2e for the mobile web client (ADR 0001).
// Specs live in qa/tests/e2e/ (qa-tester) and apps/*/e2e/ (app owners).
// Tests must use local fixtures only; never download large data in CI (TL-S11).
//
// P1-X38: every spec's own header comment says to run
//   pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview
// by hand before `pnpm test:e2e`. That was true only because a preview server happened to
// already be running on someone's machine; a clean checkout (and CI) had nothing listening on
// :4173 and every spec failed at `page.goto`. `webServer` below runs that exact same build+preview
// command for a developer or CI automatically, so `pnpm test:e2e` alone is enough from a clean
// checkout. `reuseExistingServer` still lets a developer keep `pnpm --filter @keep-walking/client
// preview` running in another shell (e.g. while iterating on a spec) without Playwright starting
// a second one.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';
const isCI = Boolean(process.env['CI']);
// Only start (and build) the app when the default local base URL is in play. A custom
// E2E_BASE_URL means someone already has a server pointed elsewhere (e.g. a preview deploy) --
// Playwright must not try to build/launch a local one on top of it.
//
// Spread (rather than `webServer: cond ? {...} : undefined`) because tsconfig.json's
// `exactOptionalPropertyTypes: true` rejects assigning `undefined` to an optional property whose
// type doesn't itself include `undefined` -- PlaywrightTestConfig#webServer is one such property.
// Omitting the key entirely (via spread of an empty object) satisfies that rule the same way
// simply never writing the key would.
const webServer =
  process.env['E2E_BASE_URL'] === undefined
    ? {
        webServer: {
          command:
            'pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview',
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
        },
      }
    : {};

export default defineConfig({
  testMatch: ['qa/tests/e2e/**/*.spec.ts', 'apps/*/e2e/**/*.spec.ts'],
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  ...webServer,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    geolocation: { latitude: 13.7309, longitude: 100.5415 },
    permissions: ['geolocation'],
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  },
  projects: [
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      // WebKit engine for the iOS Safari case (D-003). Install with: playwright install webkit
      name: 'ios-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
