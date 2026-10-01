// The per-root manifest split (P2-X22, docs/tech/asset-delivery.md 10.1) and its group keys (P2-H67).
import { describe, expect, it } from 'vitest';
import type { Manifest, ManifestEntry } from '../src/manifest';
import { allPartPaths, loadManifestSet, partKeyOf, partPath, splitLayout } from '../src/manifest-set';
import { loadInput, validate } from '../src/validate';
import { cfg, fixture, GLYPH, glyphEntry, type Fixture } from './helpers';

function doc(assets: ManifestEntry[], updated = '2026-09-27'): string {
  const m: Manifest = { manifestVersion: 1, avatarRig: 1, updated, baseDir: 'art/assets', assets };
  return JSON.stringify(m, null, 2);
}

/** Index with `indexAssets`, plus one part (default `icon.ui`) with `iconAssets`. */
function split(fx: Fixture, indexAssets: ManifestEntry[], iconAssets: ManifestEntry[], key = 'icon.ui'): ReturnType<typeof validate> {
  fx.input(indexAssets);
  fx.write(partPath(cfg, key), doc(iconAssets, '2026-09-28'));
  return validate({ ...loadInput(fx.root, cfg), skipRebuild: true });
}

describe('manifest split per root', () => {
  it('merges the index and the parts, sorted by id, and validates clean', () => {
    const fx = fixture();
    const zoo = glyphEntry(fx, GLYPH.replace('map-a', 'zoo-a'), 'icon.ui.zoo');
    const map = glyphEntry(fx, GLYPH, 'icon.ui.map');
    const result = split(fx, [zoo], [map]);
    expect(result.errors).toEqual([]);
    expect(result.stats.manifestFiles).toBe(2);
    const set = loadManifestSet(fx.root, cfg);
    expect(set.merged.assets.map((a) => a.id)).toEqual(['icon.ui.map', 'icon.ui.zoo']);
    expect(set.merged.updated).toBe('2026-09-28');
    expect(set.fileOf.get('icon.ui.map')).toBe('art/assets/manifest.icon.ui.json');
  });

  it('V1: an entry in the wrong part, and an id in two files', () => {
    const fx = fixture();
    const wrongRoot = { ...glyphEntry(fx), id: 'badge.class.tank' };
    const wrong = split(fx, [], [wrongRoot]);
    expect(wrong.errors.some((e) => e.rule === 'V1' && e.message.includes('root is not icon'))).toBe(true);

    const fx2 = fixture();
    const map = glyphEntry(fx2);
    const dup = split(fx2, [map], [map]);
    const finding = dup.errors.find((e) => e.rule === 'V1' && e.message === 'duplicate id');
    expect(finding?.file).toBe('art/assets/manifest.json + art/assets/manifest.icon.ui.json');
  });

  it('V9/V10 findings name the part that declares the entry', () => {
    const fx = fixture();
    const bad = { ...glyphEntry(fx), license: { ...glyphEntry(fx).license, spdx: 'CC-BY-4.0' } };
    const result = split(fx, [], [bad]);
    expect(result.errors.find((e) => e.rule === 'V10')?.file).toBe('art/assets/manifest.icon.ui.json');
  });

  it('V11 does not treat part files as unlisted assets', () => {
    const fx = fixture();
    const result = split(fx, [], [glyphEntry(fx)]);
    expect(result.errors.filter((e) => e.rule === 'V11')).toEqual([]);
    expect(allPartPaths(cfg).has('art/assets/manifest.vfx.json')).toBe(true);
  });

  it('V13 checks the budget per file', () => {
    const fx = fixture();
    const entries = Array.from({ length: 200 }, (_, i) => glyphEntry(fx, GLYPH, `icon.ui.g${String(i).padStart(3, '0')}`));
    const result = split(fx, [], entries);
    const v13 = result.warnings.filter((w) => w.rule === 'V13').map((w) => w.file);
    expect(v13).toContain('art/assets/manifest.icon.ui.json');
    expect(v13).not.toContain('art/assets/manifest.json');
  });

  it('splitLayout moves every entry to its root part and empties the index', () => {
    const fx = fixture();
    fx.input([glyphEntry(fx, GLYPH, 'icon.ui.map'), { ...glyphEntry(fx, GLYPH, 'icon.ui.zoo'), id: 'badge.class.tank' }]);
    const layout = splitLayout(loadManifestSet(fx.root, cfg), cfg);
    expect(layout.get(cfg.paths.manifest)?.assets).toEqual([]);
    expect(layout.get(partPath(cfg, 'icon.ui'))?.assets.map((a) => a.id)).toEqual(['icon.ui.map']);
    expect(layout.get(partPath(cfg, 'badge'))?.assets.map((a) => a.id)).toEqual(['badge.class.tank']);
    expect(layout.has(partPath(cfg, 'vfx'))).toBe(false);
  });
});

describe('manifest part keys by group (P2-H67)', () => {
  it('partKeyOf picks root.group over root, and root for an unlisted group', () => {
    expect(cfg.manifestRoots).toEqual(expect.arrayContaining(['icon', 'icon.ui', 'icon.ui16', 'icon.item']));
    expect(partKeyOf(cfg, 'icon.ui.map')).toBe('icon.ui');
    expect(partKeyOf(cfg, 'icon.ui16.map')).toBe('icon.ui16');
    expect(partKeyOf(cfg, 'icon.qc.go')).toBe('icon');
    expect(partKeyOf(cfg, 'badge.class.tank')).toBe('badge');
    expect(partKeyOf(cfg, 'nope.x.y')).toBeNull();
  });

  it('V1: an icon.ui entry left in the root part names the part it belongs to', () => {
    const fx = fixture();
    const result = split(fx, [], [glyphEntry(fx, GLYPH, 'icon.ui.map')], 'icon');
    const finding = result.errors.find((e) => e.rule === 'V1' && e.id === 'icon.ui.map');
    expect(finding?.file).toBe('art/assets/manifest.icon.json');
    expect(finding?.message).toBe('id belongs to part icon.ui');
  });

  it('splitLayout sends each icon group to its own part', () => {
    const fx = fixture();
    const ui = glyphEntry(fx, GLYPH, 'icon.ui.map');
    const qc = { ...glyphEntry(fx, GLYPH, 'icon.ui.zoo'), id: 'icon.qc.go' };
    fx.input([ui, qc]);
    const layout = splitLayout(loadManifestSet(fx.root, cfg), cfg);
    expect(layout.get(partPath(cfg, 'icon.ui'))?.assets.map((a) => a.id)).toEqual(['icon.ui.map']);
    expect(layout.get(partPath(cfg, 'icon'))?.assets.map((a) => a.id)).toEqual(['icon.qc.go']);
    expect(layout.has(partPath(cfg, 'icon.item'))).toBe(false);
  });
});
