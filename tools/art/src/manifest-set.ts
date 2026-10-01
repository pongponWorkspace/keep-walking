// The artist manifest split per root (P2-X22, asset-pipeline 7.2, docs/tech/asset-delivery.md 10.1).
//
//   art/assets/manifest.json          the index: header fields + entries not moved yet (legacy)
//   art/assets/manifest.<key>.json    one part per key in `manifestRoots`, same schema as the index
//
// A key is a root (`badge`) or a root.group (`icon.ui`, P2-H67). An entry belongs to the most
// specific key that matches its id: `icon.ui.map` → `icon.ui` if listed, else `icon`. So a root
// that outgrows the per-file budget is split by group in config alone, and a new group of that
// root still has a home (the root key) until it gets its own.
//
// Every part is a complete asset-pipeline 6.6 document (schema unchanged), so each file validates
// on its own. Consumers (validate, build, stage) only ever see the merged `Manifest`, sorted by id,
// so none of them needs to know how many files there are. The split exists for the V13 per-file
// budget and to let two roles edit different roots in the same wave without touching one file.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, type PipelineConfig } from './config';
import { parseId, type Manifest, type ManifestEntry } from './manifest';

export const ROOT_PLACEHOLDER = '{root}';

export interface ManifestPart {
  /** Repo-relative path of the file. */
  file: string;
  /** The part key (`root` or `root.group`) every entry must resolve to, or null for the index. */
  root: string | null;
  manifest: Manifest;
}

export interface ManifestSet {
  /** Index first, then parts in `manifestRoots` order. Only files that exist are listed. */
  parts: ManifestPart[];
  /** All entries of every file, sorted by id. `updated` = the latest `updated` of any file. */
  merged: Manifest;
  /** id → file that declares it (first file wins on a duplicate; V1 reports the duplicate). */
  fileOf: Map<string, string>;
}

export function partPath(cfg: PipelineConfig, key: string): string {
  return cfg.paths.manifestPart.replace(ROOT_PLACEHOLDER, key);
}

/** The part key an id belongs to (`root.group` beats `root`), or null if neither is listed. */
export function partKeyOf(cfg: PipelineConfig, id: string): string | null {
  const { root, group } = parseId(id);
  const byGroup = `${root}.${group}`;
  if (cfg.manifestRoots.includes(byGroup)) return byGroup;
  return cfg.manifestRoots.includes(root) ? root : null;
}

/** Every path a part may live at (existing or not): V11 must not flag them as unlisted files. */
export function allPartPaths(cfg: PipelineConfig): Set<string> {
  return new Set(cfg.manifestRoots.map((root) => partPath(cfg, root)));
}

function byId(a: ManifestEntry, b: ManifestEntry): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function mergeParts(parts: readonly ManifestPart[]): ManifestSet {
  const index = parts[0];
  if (index === undefined) throw new Error('manifest set needs the index file');
  const fileOf = new Map<string, string>();
  const assets: ManifestEntry[] = [];
  let updated = index.manifest.updated;
  for (const part of parts) {
    if (part.manifest.updated > updated) updated = part.manifest.updated;
    for (const entry of part.manifest.assets) {
      if (!fileOf.has(entry.id)) fileOf.set(entry.id, part.file);
      assets.push(entry);
    }
  }
  const merged: Manifest = { ...index.manifest, updated, assets: [...assets].sort(byId) };
  return { parts: [...parts], merged, fileOf };
}

export function loadManifestSet(root: string, cfg: PipelineConfig): ManifestSet {
  const parts: ManifestPart[] = [{ file: cfg.paths.manifest, root: null, manifest: readJson<Manifest>(root, cfg.paths.manifest) }];
  for (const r of cfg.manifestRoots) {
    const file = partPath(cfg, r);
    if (existsSync(join(root, file))) parts.push({ file, root: r, manifest: readJson<Manifest>(root, file) });
  }
  return mergeParts(parts);
}

/**
 * The target layout of `tools/art split-manifest`: every entry moved to the part of its key, the
 * index left with the header and `assets: []`. Pure: returns file → document, writes nothing.
 * An entry with no key in `manifestRoots` stays in the index (V1 then reports it).
 * A part left with no entries (its root was split by group) is dropped when its file does not
 * exist, and written as `assets: []` when it does; delete that file by hand after the split.
 */
export function splitLayout(set: ManifestSet, cfg: PipelineConfig): Map<string, Manifest> {
  const header = set.parts[0]?.manifest ?? set.merged;
  const out = new Map<string, Manifest>();
  const indexAssets: ManifestEntry[] = [];
  const byRoot = new Map<string, ManifestEntry[]>();
  for (const entry of set.merged.assets) {
    const key = partKeyOf(cfg, entry.id);
    if (key === null) {
      indexAssets.push(entry);
      continue;
    }
    byRoot.set(key, [...(byRoot.get(key) ?? []), entry]);
  }
  out.set(cfg.paths.manifest, { ...header, assets: indexAssets });
  for (const r of cfg.manifestRoots) {
    const entries = byRoot.get(r);
    const existing = set.parts.find((p) => p.root === r);
    if (entries === undefined && existing === undefined) continue;
    const updated = existing?.manifest.updated ?? header.updated;
    out.set(partPath(cfg, r), { ...header, updated, assets: entries ?? [] });
  }
  return out;
}
