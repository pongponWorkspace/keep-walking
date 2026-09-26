// Validator V1–V13 (art/direction/asset-pipeline.md section 8). Runs inside `pnpm test`
// (tools/art/test/repo.test.ts) and from the CLI. Checks art/assets/manifest.json (artist) and
// art/assets/manifest.build.json (tools/art output) plus the vendored fonts in art/fonts.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildEntry, currentPlatform, sha256 } from './build';
import { loadPalette, readJson, type Palette, type PipelineConfig } from './config';
import { SchemaValidator } from './json-schema';
import type { BuildManifest, Manifest, ManifestEntry, ManifestFile } from './manifest';
import { defaultPath, isShipped, masterOf, parseId, repoPath, sheetPath } from './manifest';
import { decodePng, type DecodedPng } from './png';
import { allHex, attributes, elements, readRoot, styleBlocks, hexIn } from './svg';
import { checkFonts, type FontsManifest } from './fonts';
import { RUNTIME_MANIFEST, runtimeManifest } from './stage';

export type Rule = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10' | 'V11' | 'V12' | 'V13';

export interface Finding {
  rule: Rule;
  level: 'error' | 'warn';
  file: string;
  id: string | null;
  message: string;
}

export interface ValidateInput {
  root: string;
  cfg: PipelineConfig;
  manifest: Manifest;
  build: BuildManifest;
  fonts: FontsManifest;
  schema: Record<string, unknown>;
  /** Skip the rebuild of V12 (fast unit tests). */
  skipRebuild?: boolean;
}

export interface ValidateResult {
  errors: Finding[];
  warnings: Finding[];
  stats: { assets: number; files: number; buildFiles: number; fonts: number; firstScreenBytes: number };
}

const RGB = 3;
const RGBA = 4;
const HEX_RADIX = 16;
const R_SHIFT = 16;
const G_SHIFT = 8;
const HEX6_DIGITS = 6;
const HEX6 = /^#[0-9A-F]{6}$/;
const LOCAL_REF = /^url\(#[^)]+\)$/;
const SHEET_KINDS = new Set(['avatar-layer', 'vfx']);
const NOT_READY = new Set(['prompt-only', 'placeholder']);

export function loadInput(root: string, cfg: PipelineConfig): ValidateInput {
  return {
    root,
    cfg,
    manifest: readJson<Manifest>(root, cfg.paths.manifest),
    build: readJson<BuildManifest>(root, cfg.paths.buildManifest),
    fonts: readJson<FontsManifest>(root, cfg.paths.fontsManifest),
    schema: readJson<Record<string, unknown>>(root, cfg.paths.schema),
  };
}

class Report {
  readonly errors: Finding[] = [];
  readonly warnings: Finding[] = [];
  add(rule: Rule, file: string, id: string | null, message: string, level: 'error' | 'warn' = 'error'): void {
    (level === 'error' ? this.errors : this.warnings).push({ rule, level, file, id, message });
  }
}

export function formatFinding(f: Finding): string {
  return `${f.level.toUpperCase()} [${f.rule}] ${f.file}${f.id === null ? '' : ` (${f.id})`}: ${f.message}`;
}

function sortedById(ids: string[]): boolean {
  return ids.every((id, i) => i === 0 || (ids[i - 1] ?? '') < id);
}

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

function checkV1(input: ValidateInput, r: Report): void {
  const { cfg, manifest, build } = input;
  const validator = new SchemaValidator(input.schema as ConstructorParameters<typeof SchemaValidator>[0]);
  for (const e of validator.validate(manifest)) r.add('V1', cfg.paths.manifest, null, `schema ${e.path}: ${e.message}`);
  for (const e of validator.validateRef(build, '#/$defs/buildManifest')) {
    r.add('V1', cfg.paths.buildManifest, null, `schema ${e.path}: ${e.message}`);
  }
  for (const [file, ids] of [
    [cfg.paths.manifest, manifest.assets.map((a) => a.id)],
    [cfg.paths.buildManifest, build.assets.map((a) => a.id)],
  ] as const) {
    for (const dup of new Set(duplicates(ids))) r.add('V1', file, dup, 'duplicate id');
    if (!sortedById(ids)) r.add('V1', file, null, 'assets must be sorted by id');
  }
  const known = new Set(manifest.assets.map((a) => a.id));
  for (const b of build.assets) {
    if (!known.has(b.id)) r.add('V1', cfg.paths.buildManifest, b.id, 'id is not in manifest.json (orphan build output)');
  }
}

function expectedPath(entry: ManifestEntry, f: ManifestFile): string | null {
  if (f.format === 'png' || (f.format === 'webp' && f.scale !== null)) {
    return f.scale === null ? null : sheetPath(entry.id, f.variant, f.scale);
  }
  return defaultPath(entry.id, f.format);
}

function checkV2(input: ValidateInput, r: Report): void {
  const { cfg, manifest, build } = input;
  const exceptionDirs: Record<string, string> = { map: 'art/direction/map-style/', ref: 'art/ref/' };
  for (const entry of manifest.assets) {
    const { root } = parseId(entry.id);
    for (const f of entry.files) {
      const where = `${cfg.paths.manifest} ${f.path}`;
      if (cfg.pathExceptionRoots.includes(root)) {
        const dir = exceptionDirs[root] ?? 'art/';
        if (!f.path.startsWith(dir)) r.add('V2', where, entry.id, `${root}.* files must live under ${dir}`);
        continue;
      }
      if (f.path.startsWith(`${cfg.paths.srcDir}/`)) {
        if (entry.status !== 'placeholder') r.add('V2', where, entry.id, 'art/src master allowed only while placeholder');
        continue;
      }
      if (f.path.startsWith('art/')) {
        r.add('V2', where, entry.id, 'path must be relative to baseDir art/assets');
        continue;
      }
      const expected = expectedPath(entry, f);
      const sheetSvg = f.format === 'svg' && SHEET_KINDS.has(entry.kind) && entry.status === 'placeholder';
      if (expected !== null && f.path !== expected && !sheetSvg) {
        r.add('V2', where, entry.id, `path must be ${expected} (asset-pipeline 3.2)`);
      }
      const { group } = parseId(entry.id);
      if (!f.path.startsWith(`${root}/${group}/`)) r.add('V2', where, entry.id, `path must start with ${root}/${group}/`);
    }
  }
  for (const b of build.assets) {
    for (const f of b.files) {
      const expected = sheetPath(b.id, f.variant, f.scale);
      if (f.path !== expected) r.add('V2', `${cfg.paths.buildManifest} ${f.path}`, b.id, `path must be ${expected}`);
    }
  }
}

interface FileFacts {
  exists: boolean;
  bytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  png: DecodedPng | null;
  svg: string | null;
}

class Files {
  private readonly cache = new Map<string, FileFacts>();
  constructor(private readonly root: string) {}

  get(rel: string): FileFacts {
    const hit = this.cache.get(rel);
    if (hit !== undefined) return hit;
    const abs = join(this.root, rel);
    let facts: FileFacts = { exists: false, bytes: 0, sha256: '', width: null, height: null, png: null, svg: null };
    if (existsSync(abs)) {
      const buf = readFileSync(abs);
      facts = { ...facts, exists: true, bytes: buf.length, sha256: sha256(buf) };
      if (rel.endsWith('.png')) {
        const png = decodePng(buf);
        facts = { ...facts, png, width: png.width, height: png.height };
      } else if (rel.endsWith('.svg')) {
        const svg = buf.toString('utf8');
        const root = readRoot(svg);
        facts = { ...facts, svg, width: root.width, height: root.height };
      }
    }
    this.cache.set(rel, facts);
    return facts;
  }
}

interface Located {
  entry: ManifestEntry;
  file: ManifestFile;
  rel: string;
  from: 'manifest' | 'build';
}

/** Artist files plus build outputs, each with its repo-relative path. */
function allFiles(input: ValidateInput): Located[] {
  const { manifest, build } = input;
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));
  const out: Located[] = [];
  for (const entry of manifest.assets) {
    for (const file of entry.files) out.push({ entry, file, rel: repoPath(manifest.baseDir, file.path), from: 'manifest' });
  }
  for (const b of build.assets) {
    const entry = byId.get(b.id);
    if (entry === undefined) continue;
    for (const file of b.files) out.push({ entry, file, rel: repoPath(manifest.baseDir, file.path), from: 'build' });
  }
  return out;
}

function checkV3(input: ValidateInput, files: Files, r: Report): void {
  for (const { entry, file, rel } of allFiles(input)) {
    const facts = files.get(rel);
    if (!facts.exists) {
      r.add('V3', rel, entry.id, 'file does not exist');
      continue;
    }
    if (facts.bytes !== file.bytes) r.add('V3', rel, entry.id, `bytes ${file.bytes} in manifest, file has ${facts.bytes}`);
    if (file.width !== facts.width || file.height !== facts.height) {
      r.add('V3', rel, entry.id, `size ${file.width}x${file.height} in manifest, file is ${facts.width}x${facts.height}`);
    }
    const expected = file.sha256 ?? null;
    if (expected !== null && expected !== facts.sha256) r.add('V3', rel, entry.id, 'sha256 does not match the file');
    if (expected === null && !NOT_READY.has(entry.status)) r.add('V3', rel, entry.id, `sha256 required at status ${entry.status}`);
  }
}

function kindBudget(cfg: PipelineConfig, entry: ManifestEntry, file: ManifestFile): number | null {
  const k = cfg.budgets.kindBytes;
  const { group } = parseId(entry.id);
  if (entry.kind === 'icon-ui' && group === 'ui16') return k['icon-ui16'] ?? null;
  if (entry.kind === 'illus') return (file.format === 'svg' ? k['illus-svg'] : k['illus-raster']) ?? null;
  if (entry.kind === 'vfx') return k[`vfx@${file.scale ?? 1}`] ?? null;
  if (entry.kind === 'font') return (group === 'map' ? k['font-map'] : k['font-ui']) ?? null;
  if (entry.kind === 'avatar-layer') {
    const pair = cfg.budgets.avatarLayerBytes[entry.layer ?? ''];
    return file.format === 'png' && pair !== undefined ? (file.scale === 2 ? pair[1] : pair[0]) : null;
  }
  return k[entry.kind] ?? null;
}

function checkV4(input: ValidateInput, r: Report): void {
  const { cfg } = input;
  const largest = new Map<string, [number, number]>();
  for (const { entry, file, rel } of allFiles(input)) {
    const budget = kindBudget(cfg, entry, file);
    if (budget !== null && file.bytes > budget) r.add('V4', rel, entry.id, `${file.bytes} B over budget ${budget} B (7.1)`);
    if (entry.kind === 'avatar-layer' && file.format === 'png' && entry.layer !== undefined) {
      const cur = largest.get(entry.layer) ?? [0, 0];
      const slot = file.scale === 2 ? 1 : 0;
      cur[slot] = Math.max(cur[slot], file.bytes);
      largest.set(entry.layer, cur);
    }
  }
  const total: [number, number] = [0, 0];
  for (const layer of cfg.budgets.avatarLayersInTotal) {
    const cur = largest.get(layer) ?? [0, 0];
    total[0] += cur[0];
    total[1] += cur[1];
  }
  cfg.budgets.avatarTotalBytes.forEach((budget, i) => {
    if ((total[i] ?? 0) > budget) {
      r.add('V4', input.cfg.paths.buildManifest, null, `one full avatar @${i + 1}x is ${total[i]} B, over ${budget} B (7.2)`);
    }
  });
}

function checkV5(input: ValidateInput, files: Files, r: Report): void {
  const { cfg } = input;
  for (const { entry, file, rel } of allFiles(input)) {
    if (file.format !== 'png' || !SHEET_KINDS.has(entry.kind) || entry.sheet === undefined) continue;
    const scale = file.scale ?? 1;
    const w = entry.sheet.frameW * entry.sheet.cols.length * scale;
    const h = entry.sheet.frameH * entry.sheet.rows.length * scale;
    const facts = files.get(rel);
    if (facts.png === null) continue;
    if (facts.width !== w || facts.height !== h) r.add('V5', rel, entry.id, `sheet must be ${w}x${h}, is ${facts.width}x${facts.height}`);
    const spec = entry.kind === 'avatar-layer' ? cfg.avatar.layers[entry.layer ?? ''] : undefined;
    if (spec !== undefined && (spec.sheet[0] * scale !== w || spec.sheet[1] * scale !== h)) {
      r.add('V5', rel, entry.id, `avatar-spec 6 sheet for ${entry.layer} is ${spec.sheet[0]}x${spec.sheet[1]} at 1x`);
    }
    if (!facts.png.hasAlpha) r.add('V5', rel, entry.id, 'PNG sheet must have alpha');
  }
}

function checkV6(input: ValidateInput, r: Report): void {
  const { cfg } = input;
  const located = allFiles(input);
  for (const entry of input.manifest.assets) {
    if (NOT_READY.has(entry.status) || entry.status === 'deprecated' || !SHEET_KINDS.has(entry.kind)) continue;
    const axis = entry.variants?.axis ?? cfg.avatar.layers[entry.layer ?? '']?.axis ?? null;
    const values: (string | null)[] = entry.variants?.values ?? (axis === null ? [null] : cfg.avatar.variantValues[axis]);
    const have = located.filter((l) => l.entry.id === entry.id && l.file.format === 'png');
    for (const variant of values) {
      for (const scale of cfg.avatar.scales) {
        if (!have.some((l) => l.file.variant === variant && l.file.scale === scale)) {
          r.add('V6', cfg.paths.buildManifest, entry.id, `missing ${variant ?? 'base'} @${scale}x (run tools/art build)`);
        }
      }
    }
  }
}

function colourOk(value: string, entry: ManifestEntry, palette: Palette, cfg: PipelineConfig, allowKeys: boolean): string | null {
  const v = value.trim();
  if (v === '' || cfg.svg.keywordsAllowed.includes(v)) {
    if (v === 'currentColor' && !cfg.svg.currentColorKinds.includes(entry.kind)) return 'currentColor only in outline UI glyphs';
    return null;
  }
  if (LOCAL_REF.test(v)) return null;
  if (!HEX6.test(v)) return `colour "${v}" must be 6-digit uppercase hex from the tokens`;
  if (palette.allowed.has(v) || (allowKeys && palette.keys.has(v))) return null;
  return `colour ${v} is not a token or ramp colour (style guide 3)`;
}

function checkSvg(entry: ManifestEntry, rel: string, svg: string, input: ValidateInput, palette: Palette, r: Report): void {
  const { cfg } = input;
  const s = cfg.svg;
  const allowKeys = cfg.keyColorDirs.some((d) => rel.startsWith(d));
  const root = readRoot(svg);
  const sheet = entry.sheet;
  const want =
    sheet !== undefined
      ? { width: sheet.frameW * sheet.cols.length, height: sheet.frameH * sheet.rows.length }
      : entry.size;
  if (root.viewBox === null) r.add('V7', rel, entry.id, 'root <svg> needs a viewBox');
  else if (want !== null && (root.viewBox[2] !== want.width || root.viewBox[3] !== want.height)) {
    r.add('V7', rel, entry.id, `viewBox ${root.viewBox.join(' ')} must be 0 0 ${want.width} ${want.height}`);
  }
  if (root.viewBox !== null && (root.width !== root.viewBox[2] || root.height !== root.viewBox[3])) {
    r.add('V7', rel, entry.id, 'root width/height must equal the viewBox size');
  }
  const els = elements(svg);
  for (const el of els) {
    if (s.forbiddenElements.includes(el.name)) r.add('V7', rel, entry.id, `forbidden element <${el.name}>`);
  }
  for (const css of styleBlocks(svg)) {
    if (css.includes('@import')) r.add('V7', rel, entry.id, '<style> must not use @import');
    for (const hex of hexIn(css)) {
      const why = colourOk(hex, entry, palette, cfg, allowKeys);
      if (why !== null) r.add('V7', rel, entry.id, why);
    }
  }
  const prefix = rel.split('/').pop()?.replace(/\.svg$/, '') ?? '';
  for (const a of attributes(svg)) {
    if ((a.name === 'href' || a.name === 'xlink:href') && !a.value.startsWith('#')) {
      r.add('V7', rel, entry.id, `external ${a.name} "${a.value}"`);
    }
    if (s.colorAttributes.includes(a.name)) {
      const why = colourOk(a.value, entry, palette, cfg, allowKeys);
      if (why !== null) r.add('V7', rel, entry.id, why);
    }
    if (s.opacityAttributes.includes(a.name) && Number(a.value) !== 1) {
      const shadow = Number(a.value) === s.opacityException.value && a.siblings.get('fill') === s.opacityException.color;
      if (!shadow) r.add('V7', rel, entry.id, `${a.name}="${a.value}" only allowed for the ink.900 ground shadow`);
    }
    if (a.name === 'id' && a.element !== 'svg' && !a.value.startsWith(prefix)) {
      r.add('V7', rel, entry.id, `internal id "${a.value}" must start with "${prefix}"`);
    }
  }
  if (s.miterRequiredIds.includes(entry.id)) {
    const joins = els.filter((e) => e.attrs.get('stroke-linejoin') === 'miter');
    const limit = joins.some((e) => Number(e.attrs.get('stroke-miterlimit')) === s.miterLimit);
    if (!limit) r.add('V7', rel, entry.id, `rift art keeps stroke-linejoin="miter" stroke-miterlimit="${s.miterLimit}"`);
  }
}

function checkV7(input: ValidateInput, files: Files, palette: Palette, r: Report): void {
  for (const { entry, file, rel } of allFiles(input)) {
    if (file.format !== 'svg' || !isShipped(entry)) continue;
    const facts = files.get(rel);
    if (facts.svg !== null) checkSvg(entry, rel, facts.svg, input, palette, r);
  }
}

function walk(root: string, dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const name of readdirSync(abs).sort()) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(root, rel));
    else out.push(rel);
  }
  return out;
}

function pngHasKey(png: DecodedPng, keys: Set<string>): string | null {
  const keyInts = new Set([...keys].map((k) => parseInt(k.slice(1), HEX_RADIX)));
  for (let i = 0; i < png.width * png.height; i++) {
    const o = i * RGBA;
    if ((png.rgba[o + RGB] ?? 0) === 0) continue;
    const rgb = ((png.rgba[o] ?? 0) << R_SHIFT) | ((png.rgba[o + 1] ?? 0) << G_SHIFT) | (png.rgba[o + 2] ?? 0);
    if (keyInts.has(rgb)) return `#${rgb.toString(HEX_RADIX).toUpperCase().padStart(HEX6_DIGITS, '0')}`;
  }
  return null;
}

function checkV8(input: ValidateInput, files: Files, palette: Palette, r: Report): void {
  const { cfg, root } = input;
  const scanned = [...walk(root, cfg.paths.assetsDir), ...walk(root, cfg.paths.srcDir)];
  for (const rel of scanned) {
    if (cfg.keyColorDirs.some((d) => rel.startsWith(d))) continue;
    const facts = files.get(rel);
    if (facts.svg !== null) {
      const hit = allHex(facts.svg).find((h) => palette.keys.has(h.toUpperCase()));
      if (hit !== undefined) r.add('V8', rel, null, `key colour ${hit} outside the three avatar master folders`);
    } else if (facts.png !== null) {
      const hit = pngHasKey(facts.png, palette.keys);
      if (hit !== null) r.add('V8', rel, null, `key colour ${hit} left in PNG output`);
    }
  }
}

function checkV9(input: ValidateInput, r: Report): void {
  for (const e of input.manifest.assets) {
    if (e.placeholder !== NOT_READY.has(e.status)) {
      r.add('V9', input.cfg.paths.manifest, e.id, `placeholder=${e.placeholder} does not fit status ${e.status}`);
    }
    if (e.status === 'approved' && e.review?.verdict !== 'PASS') {
      r.add('V9', input.cfg.paths.manifest, e.id, 'approved needs review.verdict PASS');
    }
    if (e.status === 'deprecated' && e.replacedBy === undefined) {
      r.add('V9', input.cfg.paths.manifest, e.id, 'deprecated needs replacedBy');
    }
  }
}

function checkV10(input: ValidateInput, r: Report): void {
  const { cfg, root } = input;
  for (const e of input.manifest.assets) {
    const where = cfg.paths.manifest;
    if (!cfg.spdxAllowed.includes(e.license.spdx)) r.add('V10', where, e.id, `license ${e.license.spdx} is not allowed (9.1)`);
    if (e.kind === 'font' && (e.license.file === null || !existsSync(join(root, e.license.file)))) {
      r.add('V10', where, e.id, 'font needs license.file that exists');
    }
    if (e.license.reservedFontName !== null && e.license.modified) {
      r.add('V10', where, e.id, 'a font with a Reserved Font Name must be unmodified');
    }
  }
}

function checkV11(input: ValidateInput, r: Report): void {
  const { cfg, root, manifest } = input;
  const referenced = new Set(allFiles(input).map((l) => l.rel));
  for (const e of manifest.assets) if (e.source.master !== null) referenced.add(e.source.master);
  for (const rel of walk(root, cfg.paths.assetsDir)) {
    const name = rel.split('/').pop() ?? '';
    if (!cfg.unlistedFilesAllowed.includes(name) && !referenced.has(rel)) {
      r.add('V11', rel, null, 'file is not referenced by manifest.json or manifest.build.json');
    }
  }
}

function pixelDelta(a: DecodedPng, b: DecodedPng): { maxDelta: number; diffRatio: number } {
  let maxDelta = 0;
  let diff = 0;
  for (let i = 0; i < a.rgba.length; i += RGBA) {
    let px = 0;
    for (let c = 0; c < RGBA; c++) px = Math.max(px, Math.abs((a.rgba[i + c] ?? 0) - (b.rgba[i + c] ?? 0)));
    if (px > 0) diff++;
    maxDelta = Math.max(maxDelta, px);
  }
  return { maxDelta, diffRatio: diff / (a.rgba.length / RGBA) };
}

function checkV12(input: ValidateInput, files: Files, palette: Palette, r: Report): void {
  const { cfg, root, manifest, build } = input;
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));
  const samePlatform = build.platform === null || build.platform === currentPlatform();
  for (const b of build.assets) {
    const entry = byId.get(b.id);
    if (entry === undefined) continue;
    const master = masterOf(entry, manifest.baseDir);
    const where = cfg.paths.buildManifest;
    if (master !== b.master) r.add('V12', where, b.id, `master is ${master ?? 'none'} in manifest.json, ${b.master} in build`);
    const masterFacts = files.get(b.master);
    if (!masterFacts.exists || masterFacts.sha256 !== b.masterSha256) {
      r.add('V12', where, b.id, 'master changed since the last build: run tools/art build --write');
      continue;
    }
    if (input.skipRebuild === true) continue;
    const fresh = buildEntry(root, entry, manifest.baseDir, cfg, palette);
    for (const f of b.files) {
      const again = fresh.files.find((x) => x.variant === f.variant && x.scale === f.scale);
      if (again === undefined) {
        r.add('V12', f.path, b.id, 'rebuild did not produce this file');
      } else if (again.sha256 !== f.sha256) {
        const committed = files.get(repoPath(manifest.baseDir, f.path)).png;
        const d = committed === null ? null : pixelDelta(decodePng(again.png), committed);
        const within =
          d !== null &&
          d.maxDelta <= cfg.raster.crossPlatformMaxChannelDelta &&
          d.diffRatio <= cfg.raster.crossPlatformMaxDiffPixelRatio;
        if (!samePlatform && within) {
          r.add('V12', f.path, b.id, `rebuild on ${currentPlatform()} differs within tolerance from ${build.platform}`, 'warn');
        } else {
          r.add('V12', f.path, b.id, 'rebuild from master gives a different sha256 (non-deterministic or stale)');
        }
      }
    }
  }
}

/** V13 (warn): first screen with an empty cache, asset-pipeline 7.2. Upper bound: every UI glyph. */
function checkV13(input: ValidateInput, r: Report): number {
  const { cfg, root, manifest, build, fonts } = input;
  const b = cfg.budgets;
  const uiFonts = fonts.fonts.filter((f) => f.role === 'ui').reduce((s, f) => s + f.bytes, 0);
  const glyphs = manifest.assets
    .filter((e) => e.kind === 'icon-ui' && parseId(e.id).group === 'ui' && isShipped(e))
    .flatMap((e) => e.files)
    .reduce((s, f) => s + f.bytes, 0);
  const largest = new Map<string, number>();
  for (const e of build.assets) {
    const layer = manifest.assets.find((a) => a.id === e.id)?.layer ?? '';
    for (const f of e.files) if (f.scale === 2) largest.set(layer, Math.max(largest.get(layer) ?? 0, f.bytes));
  }
  const avatar = b.avatarLayersInTotal.reduce((s, l) => s + (largest.get(l) ?? 0), 0);
  const runtimeBytes = Buffer.byteLength(JSON.stringify(runtimeManifest(root, cfg, manifest, build, fonts).manifest));
  const total = uiFonts + glyphs + avatar + runtimeBytes;
  const where = 'first screen';
  if (total > b.firstScreenBytes) r.add('V13', where, null, `${total} B over ${b.firstScreenBytes} B (7.2)`, 'warn');
  if (glyphs > b.firstScreenUiGlyphBytes) r.add('V13', where, null, `all UI glyphs ${glyphs} B over ${b.firstScreenUiGlyphBytes} B`, 'warn');
  if (runtimeBytes > b.runtimeManifestBytes) r.add('V13', RUNTIME_MANIFEST, null, `${runtimeBytes} B over ${b.runtimeManifestBytes} B`, 'warn');
  const manifestBytes = statSync(join(root, cfg.paths.manifest)).size;
  if (manifestBytes > b.manifestBytes) {
    r.add('V13', cfg.paths.manifest, null, `${manifestBytes} B over ${b.manifestBytes} B: split per root (7.2)`, 'warn');
  }
  return total;
}

export function validate(input: ValidateInput): ValidateResult {
  const r = new Report();
  const files = new Files(input.root);
  const palette = loadPalette(input.root, input.cfg);
  checkV1(input, r);
  checkV2(input, r);
  checkV3(input, files, r);
  checkV4(input, r);
  checkV5(input, files, r);
  checkV6(input, r);
  checkV7(input, files, palette, r);
  checkV8(input, files, palette, r);
  checkV9(input, r);
  checkV10(input, r);
  checkV11(input, r);
  checkV12(input, files, palette, r);
  for (const f of checkFonts(input.root, input.cfg, input.fonts)) r.add(f.rule, f.file, f.id, f.message);
  const firstScreenBytes = checkV13(input, r);
  const located = allFiles(input);
  return {
    errors: r.errors,
    warnings: r.warnings,
    stats: {
      assets: input.manifest.assets.length,
      files: located.filter((l) => l.from === 'manifest').length,
      buildFiles: located.filter((l) => l.from === 'build').length,
      fonts: input.fonts.fonts.length,
      firstScreenBytes,
    },
  };
}

