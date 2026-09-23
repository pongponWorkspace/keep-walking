// Bridge: runs the Python coverage-pipeline tests from the root `pnpm test` (Vitest).
// The Python tests use only the small synthetic fixture (no download, TL-S11).
// Without tools/coverage/.venv the test is skipped with a warning, unless
// COVERAGE_PYTEST_REQUIRED=1 (CI sets it after creating the venv).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const toolDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const python = join(toolDir, '.venv', 'bin', 'python');
const required = process.env['COVERAGE_PYTEST_REQUIRED'] === '1';
const hasVenv = existsSync(python);

if (!hasVenv && !required) {
  console.warn(`[coverage] skipped: ${python} not found (see tools/coverage/README.md)`);
}

describe('tools/coverage pipeline (pytest)', () => {
  it.skipIf(!hasVenv && !required)(
    'passes every pytest case on the synthetic fixture',
    () => {
      expect(hasVenv, `missing ${python}; see tools/coverage/README.md`).toBe(true);
      const result = spawnSync(
        python,
        ['-m', 'pytest', 'pipeline/tests', '-q', '-p', 'no:cacheprovider'],
        { cwd: toolDir, encoding: 'utf8' },
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    },
    120_000,
  );
});
