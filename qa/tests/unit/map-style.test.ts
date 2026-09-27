// P1-H06 acceptance: `validateStyleMin` (the real @maplibre/maplibre-gl-style-spec 26.4.4 validator,
// root devDependency since P1-X05) against art/direction/map-style/kw-light.style.json must report
// 0 errors. Runs under root `pnpm test` (vitest.config.ts includes `qa/tests/**/*.test.ts`).
//
// map-style.md section 13: this replaces the earlier manual/CLI check (`gl-style-validate.mjs`,
// P1-H01) with a permanent regression test that does not reach into `node_modules/.pnpm/`.
//
// Style JSON is read from disk with `readFileSync` + `JSON.parse` rather than imported directly:
// this file lives outside any workspace with a `?url`/asset-loader Vite pipeline (that pattern is
// `apps/client`-only, see map/style.ts), and a plain `import` of a `.json` path would tie this
// test's module resolution to `resolveJsonModule`/`tsconfig` settings this package does not own.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

const STYLE_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'art/direction/map-style/kw-light.style.json',
);

function readStyle(): StyleSpecification {
  const raw = readFileSync(STYLE_PATH, 'utf-8');
  return JSON.parse(raw) as StyleSpecification;
}

describe('kw-light.style.json validates against the MapLibre style spec', () => {
  it('parses as JSON', () => {
    expect(() => readStyle()).not.toThrow();
  });

  it('validateStyleMin reports 0 errors', () => {
    const style = readStyle();
    const errors = validateStyleMin(style);
    if (errors.length > 0) {
      // Surface every message (not just the count) so a failure here is actionable without
      // re-running the validator by hand — matches map-style.md 13's "ส่งกลับ art-director แก้ใน
      // style JSON" handoff instruction.
      const details = errors
        .map((e) => `${e.message}${typeof e.line === 'number' ? ` (line ${e.line})` : ''}`)
        .join('\n');
      expect(errors, `validateStyleMin errors:\n${details}`).toEqual([]);
    }
    expect(errors).toHaveLength(0);
  });
});

// Regression test for the P1-H06 severity-high bug (duplicate dungeon name/count/sponsored/crack
// labels), fixed in P1-X32 by moving every symbol layer over to the `kw-dungeon-labels` point
// source (map-style.md 6.1's contract: "No symbol layer may read kw-dungeons: symbols on polygons
// are placed once per internal geojson-vt tile and duplicate", kw-light.style.json's own
// `kw:dungeonSources` metadata). Carried over to this task by board note
// "static check ใน map-style.test.ts (ไม่มี symbol layer บน kw-dungeons)" (P1-X32 -> P2-F04-T09).
// A static check (not just eyeballing screenshots) so a future edit that reintroduces a symbol
// layer reading `kw-dungeons` fails CI immediately instead of waiting for the next screenshot pass.
describe('no symbol layer reads the kw-dungeons polygon source (P1-H06 regression)', () => {
  it('every layer with source "kw-dungeons" is a fill or line layer, never a symbol layer', () => {
    const style = readStyle();
    const dungeonPolygonLayers = style.layers.filter(
      (layer) => 'source' in layer && layer.source === 'kw-dungeons',
    );
    expect(dungeonPolygonLayers.length).toBeGreaterThan(0); // sanity: the source is actually used
    for (const layer of dungeonPolygonLayers) {
      expect(
        layer.type,
        `layer "${layer.id}" reads kw-dungeons but is type "${layer.type}" (must be fill/line, never symbol)`,
      ).not.toBe('symbol');
    }
  });

  it('every dungeon symbol layer (name/count/sponsored/crack) reads kw-dungeon-labels instead', () => {
    const style = readStyle();
    const DUNGEON_SYMBOL_LAYER_IDS = [
      'kw-rift-crack',
      'kw-rift-name',
      'kw-rift-count',
      'kw-rift-sponsored',
    ];
    const symbolLayers = style.layers.filter((layer) =>
      DUNGEON_SYMBOL_LAYER_IDS.includes(layer.id),
    );
    expect(symbolLayers).toHaveLength(DUNGEON_SYMBOL_LAYER_IDS.length); // all 4 present
    for (const layer of symbolLayers) {
      expect(layer.type).toBe('symbol');
      expect(
        'source' in layer ? layer.source : undefined,
        `layer "${layer.id}" must read kw-dungeon-labels, not kw-dungeons`,
      ).toBe('kw-dungeon-labels');
    }
  });
});
