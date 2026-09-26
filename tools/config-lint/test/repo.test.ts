// Runs config-lint on the real config/ tree: this is how the lint is wired into `pnpm test`.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALLOWLIST } from '../src/allowlist';
import { formatFinding, lintRepo } from '../src/lint';
import { listConfigSchemas } from '../src/schema';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const result = lintRepo(repoRoot);

describe('config-lint on config/', () => {
  it('finds every config file in balance, content and app', () => {
    const namespaces = new Set(result.files.map((f) => f.namespace));
    expect([...namespaces].sort()).toEqual(['app', 'balance', 'content']);
    expect(result.files.length).toBeGreaterThanOrEqual(19);
  });

  it('has one schema per config file and no orphan schema', () => {
    const schemas = listConfigSchemas(repoRoot);
    expect(schemas).toHaveLength(result.files.length);
  });

  it('has no error outside the allowlist', () => {
    expect(result.errors.map(formatFinding)).toEqual([]);
  });

  it('reports the two intentionally unset nulls of ADR 0001 3.10.5 as WARN only', () => {
    const nulls = result.warnings.filter((w) => w.rule === 'null-undeclared').map((w) => w.at);
    expect(nulls).toEqual(
      expect.arrayContaining(['bossGearMaterial.bossCorePerAttempt', 'bossDamage.bossAtkPerTick']),
    );
  });

  it('documents every allowlist entry with an owner, a task and a fix', () => {
    for (const entry of ALLOWLIST) {
      expect(entry.owner.length, entry.at).toBeGreaterThan(0);
      expect(entry.task.length, entry.at).toBeGreaterThan(0);
      expect(entry.fix.length, entry.at).toBeGreaterThan(0);
    }
  });
});
