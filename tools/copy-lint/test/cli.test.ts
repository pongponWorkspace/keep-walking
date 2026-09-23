import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './helpers';

const CLI_PATH = join(repoRoot, 'tools/copy-lint/src/cli.ts');
const TSX = join(repoRoot, 'node_modules/.bin/tsx');

function runCli(
  cwd: string,
  args: readonly string[] = [],
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(TSX, [CLI_PATH, ...args], { cwd, encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const execError = error as { status: number; stdout: string; stderr: string };
    return { status: execError.status, stdout: execError.stdout, stderr: execError.stderr };
  }
}

describe('copy lint CLI', () => {
  it('exits 0 with only expected WARNs against the real config files', () => {
    const result = runCli(repoRoot, ['--json']);
    expect(result.status).toBe(0);
    const issues = JSON.parse(result.stdout) as readonly { level: string; key: string }[];
    expect(issues.every((issue) => issue.level === 'WARN')).toBe(true);

    const expectedUnusedVariableWarnings = [
      'zoneRealName',
      'raidDay',
      'raidStartTime',
      'raidEndTime',
      'fromLevel',
      'toLevel',
      'newLevel',
      'successPct',
      'gold',
      'itemName',
      'bossName',
      'monsterName',
    ];
    for (const name of expectedUnusedVariableWarnings) {
      expect(issues.some((issue) => issue.key === name)).toBe(true);
    }
  });

  it('exits 2 when config/content/copy.th.json is missing', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'copy-lint-empty-'));
    try {
      const result = runCli(emptyDir);
      expect(result.status).toBe(2);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
