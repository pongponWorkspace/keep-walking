// Vendored fonts in art/fonts (D-057, asset-pipeline 4.5 and 9.3): official files, unmodified,
// pinned by sha256, OFL text next to them, under the per-weight budget.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { PipelineConfig } from './config';

export interface FontFile {
  id: string;
  role: 'ui' | 'map';
  family: string;
  weight: number;
  path: string;
  format: 'woff2' | 'ttf';
  bytes: number;
  sha256: string;
  sourceRef: string;
  licenseRef: string;
}

export interface FontLicense {
  spdx: string;
  holder: string;
  file: string;
  fileSha256: string;
  attribution: string;
  reservedFontName: string | null;
  modified: boolean;
}

export interface FontsManifest {
  fontsVersion: 1;
  fonts: FontFile[];
  sources: Record<string, { name: string; version: string; origin: string; archiveSha256: string }>;
  licenses: Record<string, FontLicense>;
}

export interface FontFinding {
  rule: 'V3' | 'V4' | 'V10' | 'V11';
  file: string;
  id: string | null;
  message: string;
}

const ID = /^font\.(ui|map)\.[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const OWN_FILES = new Set(['fonts.json', 'SHA256SUMS', 'OFL.txt', '.DS_Store']);

function sha(abs: string): string {
  return createHash('sha256').update(readFileSync(abs)).digest('hex');
}

/** `shasum -a 256` lines: "<hex>  <path relative to art/fonts>". */
export function parseSums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line.trim());
    if (m !== null) out.set(m[2] ?? '', m[1] ?? '');
  }
  return out;
}

export function checkFonts(root: string, cfg: PipelineConfig, fonts: FontsManifest): FontFinding[] {
  const out: FontFinding[] = [];
  const add = (rule: FontFinding['rule'], file: string, id: string | null, message: string): void => {
    out.push({ rule, file, id, message });
  };
  const sumsPath = join(root, cfg.paths.fontsSha256Sums);
  const sums = existsSync(sumsPath) ? parseSums(readFileSync(sumsPath, 'utf8')) : new Map<string, string>();
  const dir = `${cfg.paths.fontsDir}/`;
  const listed = new Set<string>();
  for (const f of fonts.fonts) {
    listed.add(f.path);
    if (!ID.test(f.id) || !f.id.startsWith(`font.${f.role}.`)) add('V3', f.path, f.id, 'font id must be font.<role>.<name>');
    const abs = join(root, f.path);
    if (!existsSync(abs)) {
      add('V3', f.path, f.id, 'font file does not exist');
      continue;
    }
    const bytes = statSync(abs).size;
    const hash = sha(abs);
    if (bytes !== f.bytes) add('V3', f.path, f.id, `bytes ${f.bytes} in fonts.json, file has ${bytes}`);
    if (hash !== f.sha256) add('V3', f.path, f.id, 'sha256 differs from the pinned release file (file was modified?)');
    if (sums.get(f.path.slice(dir.length)) !== f.sha256) add('V3', cfg.paths.fontsSha256Sums, f.id, 'SHA256SUMS disagrees');
    const budget = cfg.budgets.kindBytes[`font-${f.role}`] ?? null;
    if (budget !== null && bytes > budget) add('V4', f.path, f.id, `${bytes} B over ${budget} B per weight (D-057)`);
    if (fonts.sources[f.sourceRef] === undefined) add('V10', f.path, f.id, `unknown sourceRef ${f.sourceRef}`);
    const lic = fonts.licenses[f.licenseRef];
    if (lic === undefined) {
      add('V10', f.path, f.id, `unknown licenseRef ${f.licenseRef}`);
      continue;
    }
    if (!cfg.spdxAllowed.includes(lic.spdx)) add('V10', f.path, f.id, `license ${lic.spdx} not allowed`);
    if (lic.reservedFontName !== null && lic.modified) add('V10', f.path, f.id, 'Reserved Font Name requires modified=false');
    const licAbs = join(root, lic.file);
    if (!existsSync(licAbs)) add('V10', lic.file, f.id, 'OFL.txt missing');
    else if (sha(licAbs) !== lic.fileSha256) add('V10', lic.file, f.id, 'OFL.txt differs from the release copy');
    if (lic.file.split('/').slice(0, -1).join('/') !== f.path.split('/').slice(0, -1).join('/')) {
      add('V10', lic.file, f.id, 'OFL.txt must sit in the same folder as the font');
    }
  }
  const walk = (rel: string): string[] =>
    readdirSync(join(root, rel)).flatMap((name) => {
      const child = `${rel}/${name}`;
      return statSync(join(root, child)).isDirectory() ? walk(child) : [child];
    });
  if (existsSync(join(root, cfg.paths.fontsDir))) {
    for (const rel of walk(cfg.paths.fontsDir)) {
      if (!OWN_FILES.has(rel.split('/').pop() ?? '') && !listed.has(rel)) add('V11', rel, null, 'file not listed in fonts.json');
    }
  }
  return out;
}
