/**
 * Regenerates `apps/client/src/config/generated/balance-subset.generated.json` from
 * `config/balance/*.json`, keeping only the F-04 whitelist subtrees (`../src/config/whitelist.ts`,
 * docs/tech/F04-dungeon-presence.md section 15). This is the "ไฟล์ generate" ADR 0003 section 9.3
 * allows in place of a virtual module: a plain committed file so Vitest, `tsc`, and `vite
 * build`/`dev` all see the identical filtered data through one ordinary import, never the raw
 * `config/balance/*.json` file (which also carries group-C keys like `coverageFilter`,
 * `trustScore`, `raid.*`).
 *
 * Run manually with `pnpm exec tsx apps/client/scripts/generate-config.ts` after any
 * `config/balance/*.json` edit that touches a whitelisted subtree. `vite.config.ts`'s
 * `kwBalanceSubsetPlugin` also calls `generateBalanceSubset()` on every dev server start and every
 * build, so a stale commit never reaches a shipped build; `config/generated.test.ts` fails the
 * commit itself if the checked-in file has drifted (the equivalent of `tools/dungeons`'
 * `--check`, wired through `pnpm test` instead of a dedicated script since this app's
 * `package.json` is out of this task's Writes).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BALANCE_WHITELIST, buildBalanceSubset, stableStringify } from '../src/config/whitelist';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const BALANCE_DIR = resolve(REPO_ROOT, 'config', 'balance');
export const GENERATED_FILE = resolve(
  HERE,
  '..',
  'src',
  'config',
  'generated',
  'balance-subset.generated.json',
);

/** Reads every whitelisted `config/balance/<file>` from disk and returns the filtered subset. */
export function generateBalanceSubset(): unknown {
  const sourcesByFile: Record<string, unknown> = {};
  for (const entry of BALANCE_WHITELIST) {
    const text = readFileSync(resolve(BALANCE_DIR, entry.file), 'utf8');
    sourcesByFile[entry.file] = JSON.parse(text) as unknown;
  }
  return buildBalanceSubset(sourcesByFile);
}

/** Writes the generated file (LF, trailing newline), only touching disk when content changed, so
 * `vite.config.ts` calling this on every `dev`/`build` never creates a spurious git diff. */
export function writeBalanceSubset(): boolean {
  const next = `${stableStringify(generateBalanceSubset())}\n`;
  let current: string | undefined;
  try {
    current = readFileSync(GENERATED_FILE, 'utf8');
  } catch {
    current = undefined;
  }
  if (current === next) {
    return false;
  }
  writeFileSync(GENERATED_FILE, next, 'utf8');
  return true;
}

// Only run as a CLI (`tsx generate-config.ts`), never on plain import (Vite plugin, tests).
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const changed = writeBalanceSubset();
  // process.stdout.write, not console.log: this file is under apps/client/, where `no-console`
  // is an error outside `tools/**` (eslint.config.js) — this is CLI output, not app debug logging.
  process.stdout.write(`${changed ? 'wrote' : 'already up to date:'} ${GENERATED_FILE}\n`);
}
