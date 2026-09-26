import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkBudgets, computeGroups, jsFilesOf, measureBundle, measureGroup } from './measure';
import type { ViteManifest } from './measure';

/** A manifest shaped like a real one after this task's code-split (P2-F04-T10): one entry with no
 * static imports of its own, dynamically importing the four map modules (which share a vendor
 * chunk `_maplibre-gl.js` and one carries a worker `.js` as an `assets` entry) and one unrelated
 * lazy module (`src/debug/hud-panel.ts`) that never touches maplibre-gl at all. */
function fixtureManifest(): ViteManifest {
  return {
    'index.html': { file: 'assets/index-abc.js', isEntry: true },
    'src/debug/hud-panel.ts': {
      file: 'assets/hud-panel-abc.js',
      imports: ['index.html', '_byte-counter-abc.js'],
    },
    '_byte-counter-abc.js': { file: 'assets/byte-counter-abc.js' },
    'src/map.ts': {
      file: 'assets/map-abc.js',
      // Real manifests have been observed listing the entry back in a map chunk's own `imports`.
      imports: ['index.html', '_byte-counter-abc.js', '_maplibre-gl-abc.js'],
      assets: ['assets/maplibre-gl-worker-abc.js', 'assets/kw-light.style-abc.json'],
    },
    'src/map/location-layer.ts': {
      file: 'assets/location-layer-abc.js',
      imports: ['_maplibre-gl-abc.js'],
    },
    'src/map/geo-sources.ts': {
      file: 'assets/geo-sources-abc.js',
      imports: ['_maplibre-gl-abc.js'],
    },
    'src/map/runtime-images.ts': { file: 'assets/runtime-images-abc.js' },
    '_maplibre-gl-abc.js': { file: 'assets/maplibre-gl-abc.js' },
  };
}

describe('computeGroups', () => {
  it('puts only the entry itself in the initial group when the entry has no static imports', () => {
    const groups = computeGroups(fixtureManifest());
    expect(groups.initialKeys).toEqual(new Set(['index.html']));
  });

  it('collects the four map modules plus their shared chunks into the map lazy group, excluding the entry', () => {
    const groups = computeGroups(fixtureManifest());
    expect(groups.mapLazyKeys).toEqual(
      new Set([
        'src/map.ts',
        'src/map/location-layer.ts',
        'src/map/geo-sources.ts',
        'src/map/runtime-images.ts',
        '_byte-counter-abc.js',
        '_maplibre-gl-abc.js',
      ]),
    );
  });

  it('never puts the unrelated hud-panel lazy module in the map lazy group', () => {
    const groups = computeGroups(fixtureManifest());
    expect(groups.mapLazyKeys.has('src/debug/hud-panel.ts')).toBe(false);
  });

  it('throws when a MAP_LAZY_ENTRY_KEYS module is missing from the manifest (build-shape regression)', () => {
    const manifest = fixtureManifest();
    const broken = { ...manifest };
    delete (broken as Record<string, unknown>)['src/map/runtime-images.ts'];
    expect(() => computeGroups(broken)).toThrow(/runtime-images/);
  });
});

describe('jsFilesOf', () => {
  it('includes a JS asset (the maplibre-gl worker) alongside each chunk file, but never a non-JS asset', () => {
    const manifest = fixtureManifest();
    const groups = computeGroups(manifest);
    const files = jsFilesOf(manifest, groups.mapLazyKeys);
    expect(files).toContain('assets/maplibre-gl-worker-abc.js');
    expect(files).not.toContain('assets/kw-light.style-abc.json');
  });

  it('deduplicates a file reachable through more than one manifest key', () => {
    const manifest = fixtureManifest();
    const groups = computeGroups(manifest);
    const files = jsFilesOf(manifest, groups.mapLazyKeys);
    expect(files.filter((f) => f === 'assets/maplibre-gl-abc.js')).toHaveLength(1);
  });
});

describe('measureGroup', () => {
  it('sums the brotli size of every file, using the injected readFile', () => {
    const readFile = (path: string): Buffer => Buffer.from(`content of ${path}`);
    const result = measureGroup('/dist', ['a.js', 'b.js'], readFile);
    expect(result.files).toEqual(['a.js', 'b.js']);
    expect(result.totalBrotliBytes).toBeGreaterThan(0);
  });

  it('is smaller for repetitive content than for random-looking content of the same length', () => {
    // `readFile` gets the *resolved absolute* path (`measureGroup` joins `distDir` + `file`), so
    // matching must use `endsWith`/`includes`, never an exact filename comparison.
    const readFile = (path: string): Buffer =>
      path.endsWith('repetitive.js') ? Buffer.from('a'.repeat(10000)) : randomBytes(10000);
    const repetitive = measureGroup('/dist', ['repetitive.js'], readFile);
    const random = measureGroup('/dist', ['random.js'], readFile);
    expect(repetitive.totalBrotliBytes).toBeLessThan(random.totalBrotliBytes);
  });
});

describe('measureBundle + checkBudgets', () => {
  const budget = { initialJsBudget_bytes: 1_000_000, mapLazyJsBudget_bytes: 700_000 };

  it('passes when both groups are comfortably under budget', () => {
    const readFile = (): Buffer => Buffer.from('x'.repeat(100));
    const measurement = measureBundle('/dist', fixtureManifest(), readFile);
    const { ok, report } = checkBudgets(measurement, budget);
    expect(ok).toBe(true);
    expect(report).not.toContain('OVER BUDGET');
  });

  it('fails and reports which group is over budget when a group exceeds it', () => {
    // High-entropy bytes so brotli cannot shrink the "maplibre" files back under budget the way
    // repetitive content would (real minified JS does not compress to almost nothing either).
    const readFile = (path: string): Buffer =>
      path.includes('maplibre') ? randomBytes(800_000) : Buffer.from('x'.repeat(10));
    const measurement = measureBundle('/dist', fixtureManifest(), readFile);
    const { ok, report } = checkBudgets(measurement, budget);
    expect(ok).toBe(false);
    expect(report).toContain('map lazy JS');
    expect(report).toContain('OVER BUDGET');
  });
});
