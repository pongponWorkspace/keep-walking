// Root Vitest config: one runner for every workspace and for qa/tests (ADR 0001).
// Browser-dependent client tests may add a separate project later (tech-lead task).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'apps/*/src/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'packages/*/test/**/*.test.ts',
      'tools/*/src/**/*.test.ts',
      'tools/*/test/**/*.test.ts',
      'qa/tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    environment: 'node',
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'reports/coverage',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
    },
  },
});
