// Temp-repo fixtures for the validator rule tests. Each fixture copies the real tokens,
// schema and pipeline config so the rules run against production thresholds.
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { CONFIG_PATH, loadConfig, REPO_ROOT } from '../src/config';
import type { BuildManifest, Manifest, ManifestEntry } from '../src/manifest';
import type { FontsManifest } from '../src/fonts';
import { loadInput, type ValidateInput } from '../src/validate';

export const cfg = loadConfig(REPO_ROOT);

export function sha(buf: string | Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function emptyBuild(): BuildManifest {
  return {
    buildManifestVersion: 1,
    source: 'art/assets/manifest.json',
    tool: { rasterizer: { name: '@resvg/resvg-js', version: '2.6.2' }, quantizer: { name: 'tools/art median-cut', version: '1' } },
    platform: null,
    assets: [],
  };
}

export function emptyFonts(): FontsManifest {
  return { fontsVersion: 1, fonts: [], sources: {}, licenses: {} };
}

export interface Fixture {
  root: string;
  write(rel: string, content: string | Uint8Array): { bytes: number; sha256: string };
  input(manifest: ManifestEntry[], build?: BuildManifest, fonts?: FontsManifest): ValidateInput;
}

export function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'kw-art-'));
  for (const rel of [CONFIG_PATH, cfg.paths.tokens, cfg.paths.schema]) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(REPO_ROOT, rel), join(root, rel));
  }
  const write = (rel: string, content: string | Uint8Array): { bytes: number; sha256: string } => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
    return { bytes: Buffer.byteLength(content), sha256: sha(content) };
  };
  return {
    root,
    write,
    input(assets, build = emptyBuild(), fonts = emptyFonts()) {
      const manifest: Manifest = { manifestVersion: 1, avatarRig: 1, updated: '2026-09-27', baseDir: 'art/assets', assets };
      write(cfg.paths.manifest, JSON.stringify(manifest, null, 2));
      write(cfg.paths.buildManifest, JSON.stringify(build, null, 2));
      write(cfg.paths.fontsManifest, JSON.stringify(fonts, null, 2));
      return { ...loadInput(root, cfg), skipRebuild: false };
    },
  };
}

export const LICENSE: ManifestEntry['license'] = {
  spdx: 'LicenseRef-KeepWalking-Original',
  holder: 'keep-walking studio',
  file: null,
  attribution: null,
  reservedFontName: null,
  modified: false,
};

export function source(method = 'agent-svg'): ManifestEntry['source'] {
  return { method, author: 'artist-2d', task: 'TEST', master: null, prompt: null, tool: null, origin: null, date: '2026-09-27' };
}

/** A valid 24x24 UI glyph and its manifest entry. */
export const GLYPH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
  '<path id="map-a" d="M4 4 L20 20" fill="none" stroke="#1A1A22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function glyphEntry(fx: Fixture, svg = GLYPH, id = 'icon.ui.map', status: ManifestEntry['status'] = 'draft'): ManifestEntry {
  const name = id.split('.')[2] ?? 'x';
  const group = id.split('.')[1] ?? 'ui';
  const path = `icon/${group}/${name}.svg`;
  const facts = fx.write(`art/assets/${path}`, svg);
  const placeholder = status === 'placeholder' || status === 'prompt-only';
  return {
    id,
    kind: 'icon-ui',
    status,
    placeholder,
    size: { width: 24, height: 24 },
    files: [{ path, format: 'svg', scale: null, variant: null, bytes: facts.bytes, width: 24, height: 24, sha256: facts.sha256 }],
    source: source(),
    license: { ...LICENSE },
  };
}
