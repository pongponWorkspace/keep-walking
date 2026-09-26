// Avatar sheet build (asset-pipeline 4.2): key-colour swap → rasterize at 1x/2x → quantize to
// an 8-bit palette → PNG → sha256. Results go to manifest.build.json; manifest.json is never
// written (board TL N-07).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { loadPalette, type Palette, type PipelineConfig } from './config';
import type { BuildEntry, BuildFile, BuildManifest, Manifest, ManifestEntry } from './manifest';
import { masterOf, sheetPath } from './manifest';
import { encodeIndexedPng } from './png';
import { quantize } from './quantize';
import { swapKeys } from './svg';

const RESVG_NAME = '@resvg/resvg-js';
const QUANTIZER = { name: 'tools/art median-cut', version: '1' } as const;
/** resvg ShapeRendering.GeometricPrecision: antialiasing on (4.2 step 2). */
const SHAPE_RENDERING_GEOMETRIC = 2;
const RGBA = 4;

export function sha256(buf: Uint8Array | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function resvgVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require(`${RESVG_NAME}/package.json`) as { version: string };
  return pkg.version;
}

export function currentPlatform(): string {
  return `${process.platform}-${process.arch}`;
}

export function rasterize(svg: string, scale: number): { rgba: Uint8Array; width: number; height: number } {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    font: { loadSystemFonts: false },
    shapeRendering: SHAPE_RENDERING_GEOMETRIC,
  });
  const img = resvg.render();
  return { rgba: new Uint8Array(img.pixels), width: img.width, height: img.height };
}

export interface BuiltFile extends BuildFile {
  png: Buffer;
}

export interface BuiltEntry extends Omit<BuildEntry, 'files'> {
  files: BuiltFile[];
}

/** Variants to build: the entry's own list, else the layer's axis from config, else none. */
export function variantsFor(entry: ManifestEntry, cfg: PipelineConfig): (string | null)[] {
  if (entry.variants !== undefined) return entry.variants.values;
  const axis = cfg.avatar.layers[entry.layer ?? '']?.axis ?? null;
  return axis === null ? [null] : cfg.avatar.variantValues[axis];
}

/** Entries the tool builds: shipped avatar layers with an SVG master, not deprecated. */
export function buildable(manifest: Manifest): ManifestEntry[] {
  return manifest.assets.filter(
    (e) =>
      e.kind === 'avatar-layer' &&
      e.status !== 'deprecated' &&
      e.shipped !== false &&
      masterOf(e, manifest.baseDir) !== null,
  );
}

export function buildEntry(root: string, entry: ManifestEntry, baseDir: string, cfg: PipelineConfig, palette: Palette): BuiltEntry {
  const master = masterOf(entry, baseDir);
  if (master === null) throw new Error(`${entry.id}: no SVG master`);
  const source = readFileSync(join(root, master), 'utf8');
  const axis = entry.variants?.axis ?? cfg.avatar.layers[entry.layer ?? '']?.axis ?? null;
  const files: BuiltFile[] = [];
  for (const variant of variantsFor(entry, cfg)) {
    let svg = source;
    if (variant !== null && axis !== null) {
      const ramp = palette.ramps.get(variant);
      if (ramp === undefined) throw new Error(`${entry.id}: no ramp "${variant}" in tokens`);
      svg = swapKeys(source, cfg.keyColors[axis], ramp);
    }
    for (const scale of cfg.avatar.scales) {
      const px = rasterize(svg, scale);
      const q = quantize(px.rgba, px.width, px.height, cfg.quantize.maxColors);
      const png = encodeIndexedPng(q);
      files.push({
        path: sheetPath(entry.id, variant, scale),
        format: 'png',
        scale: scale as 1 | 2,
        variant,
        bytes: png.length,
        width: px.width,
        height: px.height,
        sha256: sha256(png),
        colors: q.palette.length / RGBA,
        png,
      });
    }
  }
  return { id: entry.id, master, masterSha256: sha256(source), files };
}

function stripPng(f: BuiltFile): BuildFile {
  const out: BuildFile & { png?: Buffer } = { ...f };
  delete out.png;
  return out;
}

export function toBuildManifest(built: BuiltEntry[]): BuildManifest {
  return {
    buildManifestVersion: 1,
    source: 'art/assets/manifest.json',
    tool: { rasterizer: { name: RESVG_NAME, version: resvgVersion() }, quantizer: { ...QUANTIZER } },
    platform: built.length === 0 ? null : currentPlatform(),
    assets: [...built]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((e) => ({
        id: e.id,
        master: e.master,
        masterSha256: e.masterSha256,
        files: e.files.map(stripPng),
      })),
  };
}

export interface BuildOptions {
  /** Directory the PNG files are written to (default: <root>/art/assets). */
  outDir?: string;
  /** Write the PNGs and manifest.build.json. Without it the build only runs in memory. */
  write?: boolean;
  ids?: string[];
}

export function buildAll(root: string, manifest: Manifest, cfg: PipelineConfig, opts: BuildOptions = {}): BuiltEntry[] {
  const palette = loadPalette(root, cfg);
  const entries = buildable(manifest).filter((e) => opts.ids === undefined || opts.ids.includes(e.id));
  const built = entries.map((e) => buildEntry(root, e, manifest.baseDir, cfg, palette));
  if (opts.write === true) {
    const outDir = opts.outDir ?? join(root, cfg.paths.assetsDir);
    for (const e of built) {
      for (const f of e.files) {
        const target = join(outDir, f.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, f.png);
      }
    }
    // manifest.build.json always describes the canonical art/assets tree, so a build into
    // another directory (tests, content-gate previews) never touches it.
    if (opts.outDir === undefined) {
      const next = toBuildManifest(built);
      if (opts.ids !== undefined) {
        const prev = JSON.parse(readFileSync(join(root, cfg.paths.buildManifest), 'utf8')) as BuildManifest;
        const kept = prev.assets.filter((e) => !built.some((b) => b.id === e.id));
        next.assets = [...kept, ...next.assets].sort((a, b) => (a.id < b.id ? -1 : 1));
      }
      writeFileSync(join(root, cfg.paths.buildManifest), `${JSON.stringify(next, null, 2)}\n`);
    }
  }
  return built;
}
