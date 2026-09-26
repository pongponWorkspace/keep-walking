/**
 * Drift guard for `./generated/balance-subset.generated.json` (F-04, ADR 0003 section 9.3): the
 * equivalent of `tools/dungeons`' `--check`, wired through the ordinary `pnpm test` run instead of
 * a dedicated npm script (`apps/client/package.json` is out of this task's Writes). If someone
 * edits `config/balance/*.json` and forgets to re-run
 * `pnpm exec tsx apps/client/scripts/generate-config.ts`, this test goes red instead of the client
 * silently serving a stale subset.
 *
 * Reads the real `config/balance/*.json` files itself (via `node:fs`, this file runs under the
 * `node` Vitest environment, ADR 0003 8.4) rather than importing `../scripts/generate-config` from
 * a `.test.ts`, so a change to the generator script's own CLI-guard logic can never accidentally
 * skip regenerating what this test checks.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import balanceSubsetJson from './generated/balance-subset.generated.json';
import {
  BALANCE_WHITELIST,
  FORBIDDEN_ANYWHERE,
  buildBalanceSubset,
  stableStringify,
} from './whitelist';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');
const BALANCE_DIR = resolve(REPO_ROOT, 'config', 'balance');

function loadRealBalanceSubset(): unknown {
  const sourcesByFile: Record<string, unknown> = {};
  for (const entry of BALANCE_WHITELIST) {
    const text = readFileSync(resolve(BALANCE_DIR, entry.file), 'utf8');
    sourcesByFile[entry.file] = JSON.parse(text) as unknown;
  }
  return buildBalanceSubset(sourcesByFile);
}

describe('generated/balance-subset.generated.json', () => {
  it('matches a fresh extraction from the committed config/balance/*.json files', () => {
    const fresh = stableStringify(loadRealBalanceSubset());
    const committed = stableStringify(balanceSubsetJson);
    expect(committed).toBe(fresh);
  });

  it('never contains a group-C key, checked structurally (every namespace equals its whitelist) and by string search (belt and suspenders)', () => {
    const subset = balanceSubsetJson as Record<string, Record<string, unknown>>;
    for (const entry of BALANCE_WHITELIST) {
      const namespace = subset[entry.namespace];
      expect(namespace).toBeDefined();
      for (const key of Object.keys(namespace ?? {})) {
        expect(entry.topLevelKeys).toContain(key);
      }
    }
    const text = JSON.stringify(balanceSubsetJson);
    for (const forbidden of FORBIDDEN_ANYWHERE) {
      expect(text.includes(`"${forbidden}"`)).toBe(false);
    }
  });

  it('never imports a whole config/balance/*.json file from client source (structural check via source grep, since the bundle itself is checked in bundle-whitelist.test.ts)', () => {
    // The generator script and this test are the only two places allowed to read config/balance/
    // directly; every other apps/client/src file must go through ./balance.ts /
    // ./generated/balance-subset.generated.json.
    const clientSrc = resolve(import.meta.dirname, '..');
    const offenders = grepSourceForWholeFileImports(clientSrc);
    expect(offenders).toEqual([]);
  });
});

function grepSourceForWholeFileImports(clientSrcDir: string): string[] {
  const offenders: string[] = [];
  const allowedFiles = new Set(['generated.test.ts']);
  function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (name === 'generated') continue; // the generated output itself, not source
        walk(full);
        continue;
      }
      if (!name.endsWith('.ts') || allowedFiles.has(name)) continue;
      const text = readFileSync(full, 'utf8');
      if (/from ['"](\.\.\/)+config\/balance\//.test(text)) {
        offenders.push(full);
      }
    }
  }
  walk(clientSrcDir);
  return offenders;
}
