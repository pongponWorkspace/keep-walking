import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractVariables } from '@keep-walking/shared';
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

interface CopyEntryShape {
  readonly text?: unknown;
  readonly alts?: unknown;
}

/**
 * Registered `_variables` that no entry uses, computed straight from
 * config/content/copy.th.json (independent of the lint's own S7 code path).
 */
function unreferencedRegisteredVariables(): readonly string[] {
  const copy = JSON.parse(
    readFileSync(join(repoRoot, 'config/content/copy.th.json'), 'utf8'),
  ) as Record<string, unknown>;
  const registered = Object.keys((copy['_variables'] ?? {}) as Record<string, unknown>);
  const referenced = new Set<string>();
  for (const [key, value] of Object.entries(copy)) {
    if (key.startsWith('_') || typeof value !== 'object' || value === null) continue;
    const entry = value as CopyEntryShape;
    const texts = [entry.text, ...(Array.isArray(entry.alts) ? entry.alts : [])];
    for (const text of texts) {
      if (typeof text === 'string') extractVariables(text).forEach((name) => referenced.add(name));
    }
  }
  return registered.filter((name) => !referenced.has(name)).sort();
}

describe('copy lint CLI', () => {
  it('exits 0 with only expected WARNs against the real config files', () => {
    const result = runCli(repoRoot, ['--json']);
    expect(result.status).toBe(0);
    const issues = JSON.parse(result.stdout) as readonly {
      level: string;
      key: string;
      check: string;
      message: string;
    }[];
    expect(issues.every((issue) => issue.level === 'WARN')).toBe(true);

    // Expected WARNs are derived from the real copy file, not a hard-coded list (P1-X05):
    // every registered `_variables` name that no entry text/alt references. Copy edits
    // (e.g. P1-X12) change this set, and the test follows the data.
    const unusedVariableKeys = new Set(
      issues
        .filter((issue) => issue.check === 'S7' && issue.message.includes('ไม่ถูกใช้'))
        .map((issue) => issue.key),
    );
    expect([...unusedVariableKeys].sort()).toEqual(unreferencedRegisteredVariables());
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
