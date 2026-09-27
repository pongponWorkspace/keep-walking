// Loads tools/art/pipeline.config.json and the colour palette from design/ux/tokens.json.
// Every threshold used by the validator and the build comes from these two files.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const CONFIG_PATH = 'tools/art/pipeline.config.json';

export type RampSlot = 'top' | 'left' | 'right';
export type VariantAxis = 'skin' | 'hair';
export type Pair = [number, number];

export interface PipelineConfig {
  paths: {
    manifest: string;
    /** Per-root part of the artist manifest; `{root}` is replaced by a `manifestRoots` value. */
    manifestPart: string;
    buildManifest: string;
    schema: string;
    assetsDir: string;
    srcDir: string;
    fontsDir: string;
    fontsManifest: string;
    fontsSha256Sums: string;
    tokens: string;
    audioGenerator: string;
    audioManifest: string;
    audioOut: string;
    stageOut: string;
  };
  /** Roots that get their own manifest part (asset-pipeline 3.1 `root`). */
  manifestRoots: string[];
  /** Lazily loaded parts of the runtime manifest: part name → kinds it takes + staged path. */
  runtimeParts: { parts: Record<string, { kinds: string[]; path: string }> };
  unlistedFilesAllowed: string[];
  pathExceptionRoots: string[];
  spdxAllowed: string[];
  svg: {
    forbiddenElements: string[];
    colorAttributes: string[];
    opacityAttributes: string[];
    opacityException: { color: string; value: number };
    currentColorKinds: string[];
    keywordsAllowed: string[];
    miterRequiredIds: string[];
    miterLimit: number;
  };
  keyColors: Record<VariantAxis, Record<RampSlot, string>>;
  keyColorDirs: string[];
  avatar: {
    frame: { width: number; height: number };
    layers: Record<string, { sheet: Pair; axis: VariantAxis | null }>;
    variantValues: Record<VariantAxis, string[]>;
    scales: number[];
  };
  quantize: { maxColors: number; dither: boolean };
  raster: { crossPlatformMaxChannelDelta: number; crossPlatformMaxDiffPixelRatio: number };
  budgets: {
    kindBytes: Record<string, number | null>;
    avatarLayerBytes: Record<string, Pair>;
    avatarTotalBytes: Pair;
    avatarLayersInTotal: string[];
    firstScreenBytes: number;
    firstScreenUiGlyphBytes: number;
    manifestBytes: number;
    runtimeManifestBytes: number;
  };
}

export function readJson<T>(root: string, rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), 'utf8')) as T;
}

export function loadConfig(root: string = REPO_ROOT): PipelineConfig {
  return readJson<PipelineConfig>(root, CONFIG_PATH);
}

const HEX6 = /^#[0-9A-F]{6}$/;

/** Every hex leaf under tokens.json `color` (tokens + material, skin and hair ramps). */
export function collectTokenHex(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof node === 'string') {
    if (HEX6.test(node)) out.add(node);
  } else if (node !== null && typeof node === 'object') {
    for (const value of Object.values(node)) collectTokenHex(value, out);
  }
  return out;
}

export interface Palette {
  /** Hex allowed in shipped SVG (V7). */
  allowed: Set<string>;
  /** Key colours, allowed only in masters under keyColorDirs (V8). */
  keys: Set<string>;
  /** ramp name ("skin-3") → slot → hex, used by the key-colour swap. */
  ramps: Map<string, Record<RampSlot, string>>;
}

export function loadPalette(root: string, cfg: PipelineConfig): Palette {
  const tokens = readJson<{ color: Record<string, unknown> }>(root, cfg.paths.tokens);
  const allowed = collectTokenHex(tokens.color);
  const keys = new Set<string>();
  for (const slots of Object.values(cfg.keyColors)) for (const hex of Object.values(slots)) keys.add(hex);
  const ramps = new Map<string, Record<RampSlot, string>>();
  const rampNode = tokens.color['ramp'];
  if (rampNode !== null && typeof rampNode === 'object') {
    for (const [name, slots] of Object.entries(rampNode as Record<string, Record<RampSlot, string>>)) {
      ramps.set(name, slots);
    }
  }
  return { allowed, keys, ramps };
}
