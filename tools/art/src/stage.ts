// Client staging (docs/tech/asset-delivery.md): copies every shipped art file, the vendored
// fonts and the generated audio into tools/art/out/client/ and writes asset-manifest.json, the
// file the client reads first to turn an id into a URL. Kinds listed in config `runtimeParts`
// (the avatar layers) go to a lazily loaded part that asset-manifest.json points to via `parts`
// (P2-X24, asset-delivery 5.1). The client build copies this folder as is.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sha256 } from './build';
import type { PipelineConfig } from './config';
import { readAudioManifest } from './audio';
import type { FontsManifest } from './fonts';
import type { BuildManifest, Manifest, ManifestEntry } from './manifest';
import { isShipped, repoPath } from './manifest';
import { usesCurrentColor } from './svg';

/** Characters of sha256 used as the `?v=` cache key (asset-pipeline 5). */
const VERSION_CHARS = 8;
export const RUNTIME_MANIFEST = 'asset-manifest.json';

export interface RuntimeFile {
  url: string;
  format: string;
  scale: 1 | 2 | null;
  variant: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
}

export interface RuntimeAsset {
  kind: string;
  status: string;
  placeholder: boolean;
  size: { width: number; height: number } | null;
  layer?: string;
  sheet?: ManifestEntry['sheet'];
  variants?: ManifestEntry['variants'];
  replacedBy?: string;
  /**
   * Present (always `true`) only when the entry is of a `svg.currentColorKinds` kind and one of
   * its shipped SVG files uses `currentColor` (P2-H13, D-121). Absent = not tintable: the client
   * renders `<img>`. Omitted when false to keep asset-manifest.json inside its byte budget.
   */
  tintable?: true;
  files: RuntimeFile[];
}

/** Pointer from asset-manifest.json to a lazily loaded part (asset-delivery 5.1). */
export interface RuntimePartRef {
  url: string;
  bytes: number;
}

/** A lazily loaded part: same `assets` shape as the main manifest, for the kinds in config. */
export interface RuntimeManifestPart {
  runtimeVersion: 1;
  avatarRig: 1;
  assets: Record<string, RuntimeAsset>;
}

export interface RuntimeManifest {
  runtimeVersion: 1;
  avatarRig: 1;
  assets: Record<string, RuntimeAsset>;
  /** Part name → versioned URL of that part (added in P2-X24, backward compatible). */
  parts: Record<string, RuntimePartRef>;
  fonts: { id: string; role: string; family: string; weight: number; url: string; format: string; bytes: number }[];
  audio: Record<string, Record<string, unknown> & { url: string }>;
  credits: { attribution: string; spdx: string; holder: string }[];
}

interface Copy {
  from: string;
  to: string;
}

/** A part written by `stage` as content (not copied from the repo). */
export interface StagedPart {
  name: string;
  path: string;
  json: string;
  doc: RuntimeManifestPart;
}

/** Serialisation used for every runtime manifest file (and for its byte budget). */
export function runtimeJson(doc: unknown): string {
  return `${JSON.stringify(doc)}\n`;
}

function versioned(stagePath: string, root: string, from: string): string {
  return `${stagePath}?v=${sha256(readFileSync(join(root, from))).slice(0, VERSION_CHARS)}`;
}

export function runtimeManifest(
  root: string,
  cfg: PipelineConfig,
  manifest: Manifest,
  build: BuildManifest,
  fonts: FontsManifest,
): { manifest: RuntimeManifest; parts: StagedPart[]; copies: Copy[] } {
  const copies: Copy[] = [];
  const assets: Record<string, RuntimeAsset> = {};
  const credits = new Map<string, RuntimeManifest['credits'][number]>();
  const partAssets: Record<string, Record<string, RuntimeAsset>> = {};
  for (const e of manifest.assets) {
    if (!isShipped(e) || e.status === 'prompt-only') continue;
    const files: RuntimeFile[] = [];
    const scanTint = cfg.svg.currentColorKinds.includes(e.kind);
    let tintable = false;
    const built = build.assets.find((b) => b.id === e.id)?.files ?? [];
    for (const f of [...e.files, ...built]) {
      const from = repoPath(manifest.baseDir, f.path);
      // Masters with key colours (art/src) never reach the player (asset-pipeline 1.6).
      if (from.startsWith(`${cfg.paths.srcDir}/`) || !existsSync(join(root, from))) continue;
      const to = `art/${from.slice(cfg.paths.assetsDir.length + 1)}`;
      copies.push({ from, to });
      if (scanTint && !tintable && f.format === 'svg') {
        tintable = usesCurrentColor(readFileSync(join(root, from), 'utf8'), cfg.svg.colorAttributes);
      }
      files.push({
        url: versioned(to, root, from),
        format: f.format,
        scale: f.scale,
        variant: f.variant,
        width: f.width,
        height: f.height,
        bytes: f.bytes,
      });
    }
    const asset: RuntimeAsset = { kind: e.kind, status: e.status, placeholder: e.placeholder, size: e.size, files };
    if (e.layer !== undefined) asset.layer = e.layer;
    if (e.sheet !== undefined) asset.sheet = e.sheet;
    if (e.variants !== undefined) asset.variants = e.variants;
    if (e.replacedBy !== undefined) asset.replacedBy = e.replacedBy;
    if (tintable) asset.tintable = true;
    const partName = Object.entries(cfg.runtimeParts.parts).find(([, p]) => p.kinds.includes(e.kind))?.[0];
    if (partName === undefined) assets[e.id] = asset;
    else (partAssets[partName] ??= {})[e.id] = asset;
    if (e.license.attribution !== null) {
      credits.set(e.license.attribution, { attribution: e.license.attribution, spdx: e.license.spdx, holder: e.license.holder });
    }
  }
  const fontList: RuntimeManifest['fonts'] = [];
  for (const f of fonts.fonts) {
    const to = `fonts/${f.path.slice(cfg.paths.fontsDir.length + 1)}`;
    copies.push({ from: f.path, to });
    const lic = fonts.licenses[f.licenseRef];
    if (lic !== undefined) {
      copies.push({ from: lic.file, to: `fonts/${lic.file.slice(cfg.paths.fontsDir.length + 1)}` });
      credits.set(lic.attribution, { attribution: lic.attribution, spdx: lic.spdx, holder: lic.holder });
    }
    fontList.push({ id: f.id, role: f.role, family: f.family, weight: f.weight, url: versioned(to, root, f.path), format: f.format, bytes: f.bytes });
  }
  const audio: RuntimeManifest['audio'] = {};
  for (const cue of readAudioManifest(root, cfg)?.cues ?? []) {
    const from = `${cfg.paths.audioOut}/${cue.file}`;
    if (!existsSync(join(root, from))) continue;
    const to = `audio/${cue.file}`;
    copies.push({ from, to });
    const rest: Record<string, unknown> = { ...cue };
    delete rest['id'];
    delete rest['file'];
    audio[cue.id] = { ...rest, url: versioned(to, root, from) };
  }
  const parts: StagedPart[] = [];
  const partRefs: Record<string, RuntimePartRef> = {};
  for (const [name, p] of Object.entries(cfg.runtimeParts.parts)) {
    const doc: RuntimeManifestPart = { runtimeVersion: 1, avatarRig: manifest.avatarRig, assets: partAssets[name] ?? {} };
    const json = runtimeJson(doc);
    parts.push({ name, path: p.path, json, doc });
    partRefs[name] = { url: `${p.path}?v=${sha256(Buffer.from(json)).slice(0, VERSION_CHARS)}`, bytes: Buffer.byteLength(json) };
  }
  const runtime: RuntimeManifest = {
    runtimeVersion: 1,
    avatarRig: manifest.avatarRig,
    assets,
    parts: partRefs,
    fonts: fontList,
    audio,
    credits: [...credits.values()].sort((a, b) => (a.attribution < b.attribution ? -1 : 1)),
  };
  return { manifest: runtime, parts, copies };
}

export interface StageResult {
  manifest: RuntimeManifest;
  parts: StagedPart[];
}

export function stage(root: string, cfg: PipelineConfig, manifest: Manifest, build: BuildManifest, fonts: FontsManifest, outDir?: string): StageResult {
  const out = outDir ?? join(root, cfg.paths.stageOut);
  const { manifest: runtime, parts, copies } = runtimeManifest(root, cfg, manifest, build, fonts);
  rmSync(out, { recursive: true, force: true });
  for (const c of copies) {
    const target = join(out, c.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, c.from), target);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, RUNTIME_MANIFEST), runtimeJson(runtime));
  for (const p of parts) {
    const target = join(out, p.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, p.json);
  }
  return { manifest: runtime, parts };
}
