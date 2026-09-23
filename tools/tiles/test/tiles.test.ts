// Bridge: runs the tools/tiles shell tests (test/run.sh) from the root `pnpm test` (Vitest).
// Offline: uses only the committed fixture in tools/tiles/fixtures/ (TL-S11). The pinned
// pmtiles binary (~16 MB, sha256-checked) is fetched on first run if missing; set
// TILES_TEST_REQUIRED=1 in CI to fail instead of skipping when bash or jq is unavailable.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const TIMEOUT_MS = 180_000;
const toolDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const required = process.env['TILES_TEST_REQUIRED'] === '1';
const hasTools = ['bash', 'jq', 'curl', 'python3'].every(
  (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0,
);

if (!hasTools && !required) {
  console.warn(
    '[tiles] skipped: bash, jq, curl and python3 are required (see tools/tiles/README.md)',
  );
}

describe('tools/tiles build scripts (test/run.sh)', () => {
  it.skipIf(!hasTools && !required)(
    'passes every shell check on the committed Lumphini fixture',
    () => {
      const result = spawnSync('bash', [join(toolDir, 'test', 'run.sh')], { encoding: 'utf8' });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    },
    TIMEOUT_MS,
  );
});
