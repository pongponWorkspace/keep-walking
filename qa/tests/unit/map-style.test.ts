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
