// Runs the real avatar build on the committed masters (in memory or into a temp dir).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAll, buildable, toBuildManifest } from '../src/build';
import { loadPalette, REPO_ROOT } from '../src/config';
import { loadManifestSet } from '../src/manifest-set';
import { decodePng } from '../src/png';
import { validate } from '../src/validate';
import { cfg, fixture } from './helpers';

const manifest = loadManifestSet(REPO_ROOT, cfg).merged;
const built = buildAll(REPO_ROOT, manifest, cfg);
const palette = loadPalette(REPO_ROOT, cfg);

function rgbSet(png: ReturnType<typeof decodePng>): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < png.rgba.length; i += 4) {
    if ((png.rgba[i + 3] ?? 0) === 0) continue;
    out.add(`#${[0, 1, 2].map((c) => (png.rgba[i + c] ?? 0).toString(16).padStart(2, '0')).join('').toUpperCase()}`);
  }
  return out;
}

describe('tools/art build on the committed avatar masters', () => {
  it('builds every shipped avatar layer with every variant at 1x and 2x', () => {
    expect(built.map((e) => e.id)).toEqual(buildable(manifest).map((e) => e.id));
    for (const e of built) {
      const entry = manifest.assets.find((a) => a.id === e.id);
      const values = entry?.variants?.values ?? [null];
      expect(e.files).toHaveLength(values.length * cfg.avatar.scales.length);
    }
  });

  it('matches avatar-spec 6 sheet sizes, keeps alpha, ≤ maxColors, no key colour left', () => {
    for (const e of built) {
      const layer = manifest.assets.find((a) => a.id === e.id)?.layer ?? '';
      const spec = cfg.avatar.layers[layer];
      for (const f of e.files) {
        const png = decodePng(f.png);
        expect([png.width, png.height]).toEqual([(spec?.sheet[0] ?? 0) * f.scale, (spec?.sheet[1] ?? 0) * f.scale]);
        expect(png.hasAlpha).toBe(true);
        expect(png.paletteSize ?? 999).toBeLessThanOrEqual(cfg.quantize.maxColors);
        const colours = rgbSet(png);
        for (const key of palette.keys) expect(colours.has(key), `${f.path} ${key}`).toBe(false);
      }
    }
  });

  it('swaps key colours for the variant ramp (skin-1 top in body skin-1, skin-6 top in skin-6)', () => {
    const body = built.find((e) => e.id === 'avatar.body.base');
    for (const v of ['skin-1', 'skin-6']) {
      const f = body?.files.find((x) => x.variant === v && x.scale === 1);
      expect(f).toBeDefined();
      expect(rgbSet(decodePng(f?.png ?? Buffer.alloc(0))).has(palette.ramps.get(v)?.top ?? '')).toBe(true);
    }
  });

  it('is deterministic (V12): a second build gives the same sha256 for every file', () => {
    const again = buildAll(REPO_ROOT, manifest, cfg);
    expect(again.flatMap((e) => e.files.map((f) => f.sha256))).toEqual(built.flatMap((e) => e.files.map((f) => f.sha256)));
  });

  it('writes outputs that pass V2–V6, V8, V11, V12 and detects a tampered PNG', () => {
    const fx = fixture();
    const entry = manifest.assets.find((a) => a.id === 'avatar.hair.buzz');
    if (entry === undefined) throw new Error('fixture needs avatar.hair.buzz');
    const master = entry.files[0]?.path ?? '';
    fx.write(master, readFileSync(join(REPO_ROOT, master)));
    const one = built.filter((e) => e.id === entry.id);
    for (const f of one[0]?.files ?? []) fx.write(`art/assets/${f.path}`, f.png);
    const clean = validate(fx.input([entry], toBuildManifest(one)));
    expect(clean.errors).toEqual([]);
    expect(clean.stats.buildFiles).toBe(12);
    const first = one[0]?.files[0];
    if (first === undefined) throw new Error('no build file');
    fx.write(`art/assets/${first.path}`, one[0]?.files[1]?.png ?? Buffer.alloc(0));
    const tampered = validate(fx.input([entry], toBuildManifest(one)));
    expect(tampered.errors.map((e) => e.rule)).toEqual(expect.arrayContaining(['V3', 'V5']));
  });

  it('flags a stale build when the master changes (V12)', () => {
    const fx = fixture();
    const entry = manifest.assets.find((a) => a.id === 'avatar.hair.buzz');
    if (entry === undefined) throw new Error('fixture needs avatar.hair.buzz');
    const master = entry.files[0]?.path ?? '';
    fx.write(master, readFileSync(join(REPO_ROOT, master), 'utf8').replace('</svg>', '<!-- edit --></svg>'));
    const one = built.filter((e) => e.id === entry.id);
    for (const f of one[0]?.files ?? []) fx.write(`art/assets/${f.path}`, f.png);
    const result = validate(fx.input([entry], toBuildManifest(one)));
    expect(result.errors.map((e) => e.rule)).toContain('V12');
  });
});
