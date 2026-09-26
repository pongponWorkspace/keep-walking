// Root Vitest config: one runner for every workspace and for qa/tests (ADR 0001).
// The default environment is `node`. A test that needs a DOM (apps/client HUD, P2-F04-T25) opts in
// per file with the docblock `// @vitest-environment happy-dom` (happy-dom is a root
// devDependency, ADR 0003 section 8). packages/shared and packages/geo tests never use a DOM.
// The tools/* globs below cover tools/dungeons, tools/config-lint and tools/art (Phase 2).
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
      // Python pytest bridges (P1-X05): skipped with a warning when tools/coverage/.venv is
      // absent, required when COVERAGE_PYTEST_REQUIRED=1 (CI, P1-X07).
      'tools/coverage/pipeline/tests/**/*.test.ts',
      'tools/coverage/boundaries/tests/**/*.test.ts',
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
