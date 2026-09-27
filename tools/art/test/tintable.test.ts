// P2-H13 (D-121): `assets[id].tintable` in the runtime manifest, computed by `stage` from the
// source SVG. Present (true) only for kinds in `svg.currentColorKinds` whose SVG uses currentColor.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../src/config';
import { repoPath, type ManifestEntry } from '../src/manifest';
import { runtimeJson, runtimeManifest } from '../src/stage';
import { usesCurrentColor } from '../src/svg';
import { loadInput } from '../src/validate';
import { cfg, emptyBuild, emptyFonts, fixture, GLYPH, glyphEntry } from './helpers';

const COLOR_ATTRS = cfg.svg.colorAttributes;
const svg = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${body}</svg>`;
const TINT = svg('<path d="M4 4 L20 20" fill="none" stroke="currentColor" stroke-width="2"/>');

describe('usesCurrentColor', () => {
  it('detects currentColor in a colour attribute', () => {
    expect(usesCurrentColor(TINT, COLOR_ATTRS)).toBe(true);
    expect(usesCurrentColor(svg('<circle cx="4" cy="4" r="2" fill="currentColor"/>'), COLOR_ATTRS)).toBe(true);
  });

  it('detects it in a style attribute and in a <style> block', () => {
    expect(usesCurrentColor(svg('<path d="M0 0" style="stroke: currentColor; fill: none"/>'), COLOR_ATTRS)).toBe(true);
    expect(usesCurrentColor(svg('<style>.a{fill:currentColor}</style><path class="a" d="M0 0"/>'), COLOR_ATTRS)).toBe(true);
  });

  it('detects a two-tone glyph (currentColor ring + fixed hand)', () => {
    const mixed = svg('<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor"/><path d="M12 12 L12 6" fill="#1A1A22"/>');
    expect(usesCurrentColor(mixed, COLOR_ATTRS)).toBe(true);
  });

  it('is false for fixed colours, comments, ids and non-colour attributes', () => {
    expect(usesCurrentColor(GLYPH, COLOR_ATTRS)).toBe(false);
    expect(usesCurrentColor(svg('<!-- stroke="currentColor" --><path d="M0 0" stroke="#1A1A22"/>'), COLOR_ATTRS)).toBe(false);
    expect(usesCurrentColor(svg('<path id="currentColor" data-x="currentColor" d="M0 0" fill="#1A1A22"/>'), COLOR_ATTRS)).toBe(false);
  });
});

describe('stage: tintable', () => {
  type Fx = ReturnType<typeof fixture>;
  function staged(make: (fx: Fx) => ManifestEntry[]): Record<string, { tintable?: true }> {
    const fx = fixture();
    const input = fx.input(make(fx), emptyBuild(), emptyFonts());
    return runtimeManifest(fx.root, cfg, input.manifest, input.build, input.fonts).manifest.assets;
  }

  it('sets tintable: true on an icon-ui entry whose SVG uses currentColor, omits it otherwise', () => {
    const assets = staged((fx) => [glyphEntry(fx, TINT, 'icon.ui.grace'), glyphEntry(fx, GLYPH, 'icon.ui.in-run')]);
    expect(assets['icon.ui.grace']?.tintable).toBe(true);
    expect(assets['icon.ui.in-run']).toBeDefined();
    expect('tintable' in (assets['icon.ui.in-run'] ?? {})).toBe(false);
  });

  it('covers icon.ui16.* (same kind icon-ui)', () => {
    const assets = staged((fx) => [glyphEntry(fx, TINT, 'icon.ui16.grace')]);
    expect(assets['icon.ui16.grace']?.tintable).toBe(true);
  });

  it('never scans kinds outside svg.currentColorKinds', () => {
    const assets = staged((fx) => [{ ...glyphEntry(fx, TINT, 'icon.item.potion'), kind: 'icon-item' }]);
    expect(assets['icon.item.potion']).toBeDefined();
    expect(JSON.stringify(assets)).not.toContain('tintable');
  });
});

describe('stage: tintable on the real repo', () => {
  const input = loadInput(REPO_ROOT, cfg);
  const { manifest: runtime, parts } = runtimeManifest(REPO_ROOT, cfg, input.manifest, input.build, input.fonts);

  it('matches a currentColor scan of every shipped icon-ui SVG', () => {
    for (const e of input.manifest.assets) {
      const asset = runtime.assets[e.id];
      if (asset === undefined) continue;
      const svgs = e.files
        .filter((f) => f.format === 'svg')
        .map((f) => readFileSync(join(REPO_ROOT, repoPath(input.manifest.baseDir, f.path)), 'utf8'));
      const want = cfg.svg.currentColorKinds.includes(e.kind) && svgs.some((t) => usesCurrentColor(t, COLOR_ATTRS));
      expect({ id: e.id, tintable: asset.tintable === true }).toEqual({ id: e.id, tintable: want });
      if (!want) expect('tintable' in asset).toBe(false);
    }
  });

  it('marks the ready glyphs of components.md 13.9.1 and keeps parts free of the field', () => {
    for (const id of ['icon.ui.grace', 'icon.ui.closed', 'icon.ui.closing-soon', 'icon.ui16.closing-soon']) {
      expect(runtime.assets[id]?.tintable).toBe(true);
    }
    for (const p of parts) expect(p.json).not.toContain('tintable');
    expect(Buffer.byteLength(runtimeJson(runtime))).toBeLessThanOrEqual(cfg.budgets.runtimeManifestBytes);
  });
});
