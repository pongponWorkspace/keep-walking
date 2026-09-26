/**
 * CLI wrapper for `../src/bundle/measure.ts` (P2-F04-T10, ADR 0003 section 10): reads
 * `apps/client/dist/.vite/manifest.json` (`vite.config.ts`'s `build.manifest: true`), measures the
 * "initial" and "map lazy" JS groups, checks them against `config/app/client.json#bundle`, prints
 * the report, and exits 1 when either budget is exceeded.
 *
 * Run after `pnpm --filter @keep-walking/client build`:
 *   `pnpm exec tsx apps/client/scripts/measure-bundle.ts`
 * This is what P2-F06-T16's CI step calls — same "plain Node/tsx CLI, no npm script" pattern as
 * `generate-config.ts` (this app's `package.json` is out of this task's Writes). The pure
 * closure/brotli/budget math lives in `../src/bundle/measure.ts` instead of here so it is covered
 * by `pnpm test` (root `vitest.config.ts` globs `apps/*\/src/**\/*.test.ts`, never
 * `apps/*\/scripts/**`).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientConfig } from '../src/config/runtime';
import { checkBudgets, measureBundle } from '../src/bundle/measure';
import type { ViteManifest } from '../src/bundle/measure';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = resolve(HERE, '..');
const DEFAULT_DIST_DIR = resolve(CLIENT_ROOT, 'dist');

function readManifest(distDir: string): ViteManifest {
  const path = resolve(distDir, '.vite', 'manifest.json');
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `measure-bundle: ${path} not found — run "pnpm --filter @keep-walking/client build" first`,
    );
  }
  return JSON.parse(text) as ViteManifest;
}

// Only run as a CLI (`tsx measure-bundle.ts`), never on plain import (same convention as
// generate-config.ts).
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const manifest = readManifest(DEFAULT_DIST_DIR);
  const measurement = measureBundle(DEFAULT_DIST_DIR, manifest);
  const { ok, report } = checkBudgets(measurement, clientConfig.bundle);
  process.stdout.write(`${report}\n`);
  if (!ok) {
    process.stderr.write('measure-bundle: one or more JS budgets exceeded\n');
    process.exitCode = 1;
  }
}
