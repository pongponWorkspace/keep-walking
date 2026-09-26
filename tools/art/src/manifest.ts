// Types of art/assets/manifest.json (artist-owned, asset-pipeline 6) and of
// art/assets/manifest.build.json (written only by tools/art). id → path rules (3.2).
export type AssetStatus = 'prompt-only' | 'placeholder' | 'draft' | 'approved' | 'deprecated';
export type FileFormat = 'svg' | 'png' | 'webp' | 'woff2' | 'ttf';

export interface ManifestFile {
  path: string;
  format: FileFormat;
  scale: 1 | 2 | null;
  variant: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  sha256?: string | null;
}

export interface ManifestEntry {
  id: string;
  kind: string;
  status: AssetStatus;
  placeholder: boolean;
  size: { width: number; height: number } | null;
  files: ManifestFile[];
  layer?: string;
  sheet?: { frameW: number; frameH: number; cols: string[]; rows: string[]; frames?: number; fps?: number };
  variants?: { axis: 'skin' | 'hair'; values: string[] };
  source: {
    method: string;
    author: string;
    task: string;
    master: string | null;
    prompt: { file: string; anchor: string } | null;
    tool: { name: string; version: string } | null;
    origin: string | null;
    date: string;
  };
  license: {
    spdx: string;
    holder: string;
    file: string | null;
    attribution: string | null;
    reservedFontName: string | null;
    modified: boolean;
  };
  shipped?: boolean;
  review?: { gate: string; verdict: 'PASS' | 'NEEDS_CHANGES'; date: string };
  replacedBy?: string;
  tags?: string[];
  notes?: string;
}

export interface Manifest {
  manifestVersion: 1;
  avatarRig: 1;
  updated: string;
  baseDir: 'art/assets';
  assets: ManifestEntry[];
}

export interface BuildFile {
  path: string;
  format: 'png';
  scale: 1 | 2;
  variant: string | null;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  colors?: number;
}

export interface BuildEntry {
  id: string;
  master: string;
  masterSha256: string;
  files: BuildFile[];
}

export interface BuildManifest {
  buildManifestVersion: 1;
  source: 'art/assets/manifest.json';
  tool: { rasterizer: { name: string; version: string }; quantizer: { name: string; version: string } };
  platform: string | null;
  assets: BuildEntry[];
}

export interface ParsedId {
  root: string;
  group: string;
  name: string;
}

export function parseId(id: string): ParsedId {
  const [root = '', group = '', name = ''] = id.split('.');
  return { root, group, name };
}

/** `art/assets/...` relative path of a manifest file path (baseDir rule, 6.2). */
export function repoPath(baseDir: string, path: string): string {
  return path.startsWith('art/') ? path : `${baseDir}/${path}`;
}

/** Build output path relative to baseDir (3.2): `<root>/<group>/<name>[-<variant>]@<scale>x.png`. */
export function sheetPath(id: string, variant: string | null, scale: number): string {
  const { root, group, name } = parseId(id);
  const suffix = variant === null ? '' : `-${variant}`;
  return `${root}/${group}/${name}${suffix}@${scale}x.png`;
}

/** Default path of an SVG, font or illus file relative to baseDir (3.2). */
export function defaultPath(id: string, ext: string): string {
  const { root, group, name } = parseId(id);
  return `${root}/${group}/${name}.${ext}`;
}

export function isShipped(entry: ManifestEntry): boolean {
  return entry.shipped !== false;
}

/** The SVG master a PNG sheet is built from (source.master, else the placeholder SVG). */
export function masterOf(entry: ManifestEntry, baseDir: string): string | null {
  if (entry.source.master !== null) return entry.source.master;
  const svg = entry.files.find((f) => f.format === 'svg');
  return svg === undefined ? null : repoPath(baseDir, svg.path);
}
