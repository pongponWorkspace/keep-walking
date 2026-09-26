/**
 * Pure bundle-budget math for P2-F04-T10 (ADR 0003 section 10): splits a Vite manifest into the
 * "initial" JS group (the entry chunk + everything it statically imports) and the "map lazy" JS
 * group (maplibre-gl + its worker, reached only through `main.ts`'s `loadMapModules()
 * await import(...)`), then brotli-measures each and checks it against
 * `config/app/client.json#bundle`'s two budgets.
 *
 * Lives under `src/` (unlike `generate-config.ts`'s own logic) specifically so it is covered by
 * `pnpm test` (root `vitest.config.ts` only globs `apps/*\/src/**\/*.test.ts`, never
 * `apps/*\/scripts/**`) — `apps/client/scripts/measure-bundle.ts` is the thin CLI wrapper that does
 * the actual file I/O and process exit code.
 *
 * Method (ADR 0003 section 10, verbatim):
 *   1. Read the Vite manifest.
 *   2. "JS ตอนเปิด" = the entry chunk + every chunk it reaches through *static* `imports`,
 *      recursively (never `dynamicImports`).
 *   3. The lazy map group = the closure (again, `imports` only) starting from the four map modules
 *      `main.ts` dynamically imports (`src/map.ts`, `src/map/location-layer.ts`,
 *      `src/map/geo-sources.ts`, `src/map/runtime-images.ts`), plus each visited chunk's own
 *      `assets` entries that are themselves `.js` (the `?worker&url` maplibre-gl worker file lands
 *      there, not in `imports` — Vite treats a `?worker&url` import as a referenced asset, not a
 *      module edge) — minus anything already counted in the initial group (a defensive
 *      self-reference back to the entry has been observed in this project's manifests).
 *   4. Size per file = brotli (`zlib.brotliCompressSync`, quality 11) of the file's bytes on disk,
 *      standing in for Cloudflare Pages' transfer size.
 *   5. Only `.js`/`.mjs` files count: CSS, fonts, tiles, and trace fixtures are excluded (ADR 0003
 *      10.4), even when Vite lists them as an `assets` entry of a chunk in scope.
 */
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BundleConfig } from '../config/runtime';

/** The four modules `main.ts`'s `loadMapModules` reaches only via `await import(...)` (this task's
 * code-split) — the seed of the lazy map group. A key missing from the manifest is a build-shape
 * regression, not something to silently under-count: `computeGroups` throws instead. */
export const MAP_LAZY_ENTRY_KEYS: readonly string[] = [
  'src/map.ts',
  'src/map/location-layer.ts',
  'src/map/geo-sources.ts',
  'src/map/runtime-images.ts',
];

export interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
  readonly imports?: readonly string[];
  readonly assets?: readonly string[];
}

export type ViteManifest = Readonly<Record<string, ManifestChunk>>;

function isJsFile(file: string): boolean {
  return file.endsWith('.js') || file.endsWith('.mjs');
}

/** BFS over *static* `imports` edges only (never `dynamicImports`), starting from `startKeys`,
 * stopping at anything already in `exclude`. */
function closureOf(
  manifest: ViteManifest,
  startKeys: readonly string[],
  exclude: ReadonlySet<string>,
): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [...startKeys];
  while (queue.length > 0) {
    const key = queue.shift();
    if (key === undefined || visited.has(key) || exclude.has(key)) {
      continue;
    }
    visited.add(key);
    const chunk = manifest[key];
    if (chunk === undefined) {
      continue;
    }
    for (const imported of chunk.imports ?? []) {
      if (!visited.has(imported) && !exclude.has(imported)) {
        queue.push(imported);
      }
    }
  }
  return visited;
}

/** Every distinct `.js`/`.mjs` file reachable from `keys`: each chunk's own `file`, plus any of its
 * `assets` that are themselves JS (the maplibre-gl worker file, referenced via `?worker&url`). */
export function jsFilesOf(manifest: ViteManifest, keys: ReadonlySet<string>): readonly string[] {
  const files = new Set<string>();
  for (const key of keys) {
    const chunk = manifest[key];
    if (chunk === undefined) {
      continue;
    }
    if (isJsFile(chunk.file)) {
      files.add(chunk.file);
    }
    for (const asset of chunk.assets ?? []) {
      if (isJsFile(asset)) {
        files.add(asset);
      }
    }
  }
  return [...files];
}

function findEntryKey(manifest: ViteManifest): string {
  const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry === true);
  if (entry === undefined) {
    throw new Error('measure-bundle: no manifest entry has isEntry: true');
  }
  return entry[0];
}

export interface GroupKeys {
  readonly initialKeys: ReadonlySet<string>;
  readonly mapLazyKeys: ReadonlySet<string>;
}

/** Splits the manifest into the "initial" (static-import closure of the entry) and "map lazy"
 * (static-import closure of `MAP_LAZY_ENTRY_KEYS`, minus the initial group) key sets. Throws if any
 * `MAP_LAZY_ENTRY_KEYS` entry is missing from the manifest (a real build-shape regression). */
export function computeGroups(manifest: ViteManifest): GroupKeys {
  const entryKey = findEntryKey(manifest);
  const initialKeys = closureOf(manifest, [entryKey], new Set());
  const missing = MAP_LAZY_ENTRY_KEYS.filter((key) => manifest[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `measure-bundle: expected map module(s) missing from the manifest: ${missing.join(', ')} ` +
        "(main.ts's loadMapModules() no longer matches MAP_LAZY_ENTRY_KEYS — update this script)",
    );
  }
  const mapLazyKeys = closureOf(manifest, MAP_LAZY_ENTRY_KEYS, initialKeys);
  return { initialKeys, mapLazyKeys };
}

export interface GroupMeasurement {
  readonly files: readonly string[];
  readonly totalBrotliBytes: number;
}

const BROTLI_QUALITY = zlibConstants.BROTLI_MAX_QUALITY;

/** brotli (quality 11) of `distDir/file`'s bytes, standing in for Cloudflare Pages transfer size
 * (ADR 0003 section 10 item 3). `readFile` is injected so this is unit-testable without a real
 * `pnpm build` (default: `node:fs`'s `readFileSync`). */
export function measureGroup(
  distDir: string,
  files: readonly string[],
  readFile: (path: string) => Buffer = readFileSync,
): GroupMeasurement {
  let total = 0;
  for (const file of files) {
    const bytes = readFile(resolve(distDir, file));
    total += brotliCompressSync(bytes, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
    }).length;
  }
  return { files, totalBrotliBytes: total };
}

export interface BundleMeasurement {
  readonly initial: GroupMeasurement;
  readonly mapLazy: GroupMeasurement;
}

export function measureBundle(
  distDir: string,
  manifest: ViteManifest,
  readFile: (path: string) => Buffer = readFileSync,
): BundleMeasurement {
  const groups = computeGroups(manifest);
  return {
    initial: measureGroup(distDir, jsFilesOf(manifest, groups.initialKeys), readFile),
    mapLazy: measureGroup(distDir, jsFilesOf(manifest, groups.mapLazyKeys), readFile),
  };
}

export interface BudgetCheck {
  readonly ok: boolean;
  readonly report: string;
}

const BYTES_PER_MB = 1_000_000;
const MB_DECIMALS = 3;

function formatBytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(MB_DECIMALS)} MB (${bytes} B)`;
}

/** Pure formatting + pass/fail, so both the CLI and a future CI wrapper (P2-F06-T16) get one
 * definition of "over budget" and one report string. */
export function checkBudgets(measurement: BundleMeasurement, budget: BundleConfig): BudgetCheck {
  const initialOver = measurement.initial.totalBrotliBytes > budget.initialJsBudget_bytes;
  const mapLazyOver = measurement.mapLazy.totalBrotliBytes > budget.mapLazyJsBudget_bytes;
  const lines = [
    `initial JS (entry + static imports): ${formatBytes(measurement.initial.totalBrotliBytes)} / ` +
      `budget ${formatBytes(budget.initialJsBudget_bytes)}${initialOver ? ' -- OVER BUDGET' : ''}`,
    `  files: ${measurement.initial.files.join(', ')}`,
    `map lazy JS (maplibre-gl + worker): ${formatBytes(measurement.mapLazy.totalBrotliBytes)} / ` +
      `budget ${formatBytes(budget.mapLazyJsBudget_bytes)}${mapLazyOver ? ' -- OVER BUDGET' : ''}`,
    `  files: ${measurement.mapLazy.files.join(', ')}`,
  ];
  return { ok: !initialOver && !mapLazyOver, report: lines.join('\n') };
}
