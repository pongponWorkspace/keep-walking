// Root Playwright config: browser e2e for the mobile web client (ADR 0001).
// Specs live in qa/tests/e2e/ (qa-tester) and apps/*/e2e/ (app owners).
// Tests must use local fixtures only; never download large data in CI (TL-S11).
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

export default defineConfig({
  testMatch: ['qa/tests/e2e/**/*.spec.ts', 'apps/*/e2e/**/*.spec.ts'],
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
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
