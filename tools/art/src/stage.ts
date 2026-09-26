// Client staging (docs/tech/asset-delivery.md): copies every shipped art file, the vendored
// fonts and the generated audio into tools/art/out/client/ and writes asset-manifest.json, the
// only file the client reads to turn an id into a URL. The client build copies this folder as is.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sha256 } from './build';
import type { PipelineConfig } from './config';
import { readAudioManifest } from './audio';
import type { FontsManifest } from './fonts';
import type { BuildManifest, Manifest, ManifestEntry } from './manifest';
import { isShipped, repoPath } from './manifest';

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
  files: RuntimeFile[];
}

export interface RuntimeManifest {
  runtimeVersion: 1;
  avatarRig: 1;
  assets: Record<string, RuntimeAsset>;
  fonts: { id: string; role: string; family: string; weight: number; url: string; format: string; bytes: number }[];
  audio: Record<string, Record<string, unknown> & { url: string }>;
  credits: { attribution: string; spdx: string; holder: string }[];
}

interface Copy {
  from: string;
  to: string;
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
): { manifest: RuntimeManifest; copies: Copy[] } {
  const copies: Copy[] = [];
  const assets: Record<string, RuntimeAsset> = {};
  const credits = new Map<string, RuntimeManifest['credits'][number]>();
  for (const e of manifest.assets) {
    if (!isShipped(e) || e.status === 'prompt-only') continue;
    const files: RuntimeFile[] = [];
    const built = build.assets.find((b) => b.id === e.id)?.files ?? [];
    for (const f of [...e.files, ...built]) {
      const from = repoPath(manifest.baseDir, f.path);
      // Masters with key colours (art/src) never reach the player (asset-pipeline 1.6).
      if (from.startsWith(`${cfg.paths.srcDir}/`) || !existsSync(join(root, from))) continue;
      const to = `art/${from.slice(cfg.paths.assetsDir.length + 1)}`;
      copies.push({ from, to });
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
    assets[e.id] = asset;
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
  const runtime: RuntimeManifest = {
    runtimeVersion: 1,
    avatarRig: manifest.avatarRig,
    assets,
    fonts: fontList,
    audio,
    credits: [...credits.values()].sort((a, b) => (a.attribution < b.attribution ? -1 : 1)),
  };
  return { manifest: runtime, copies };
}

export function stage(root: string, cfg: PipelineConfig, manifest: Manifest, build: BuildManifest, fonts: FontsManifest, outDir?: string): RuntimeManifest {
  const out = outDir ?? join(root, cfg.paths.stageOut);
  const { manifest: runtime, copies } = runtimeManifest(root, cfg, manifest, build, fonts);
  rmSync(out, { recursive: true, force: true });
  for (const c of copies) {
    const target = join(out, c.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, c.from), target);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, RUNTIME_MANIFEST), `${JSON.stringify(runtime)}\n`);
  return runtime;
}
