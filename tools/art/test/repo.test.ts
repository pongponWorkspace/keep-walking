// The validator on the real repo: part of `pnpm test` (P2-F06-T07 acceptance).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPalette, readJson, REPO_ROOT } from '../src/config';
import { parseSums, type FontsManifest } from '../src/fonts';
import { formatFinding, loadInput, validate } from '../src/validate';
import { cfg } from './helpers';

describe('art validator on the repo', () => {
  const result = validate(loadInput(REPO_ROOT, cfg));

  it('art/assets/manifest.json, manifest.build.json and art/fonts pass V1–V12', () => {
    expect(result.errors.map(formatFinding)).toEqual([]);
  });

  it('reports V13 (first screen) as a warning only', () => {
    expect(result.warnings.every((w) => w.level === 'warn')).toBe(true);
    expect(result.stats.firstScreenBytes).toBeGreaterThan(0);
  });

  it('V7 palette includes ramp.tonic (P2-F05-T03 handoff)', () => {
    const { allowed } = loadPalette(REPO_ROOT, cfg);
    for (const hex of ['#FF8877', '#DD4433', '#AA2222']) expect(allowed.has(hex)).toBe(true);
  });

  it('manifest.schema.json root is the asset-pipeline 6.6 schema verbatim', () => {
    const doc = readFileSync(join(REPO_ROOT, 'art/direction/asset-pipeline.md'), 'utf8');
    const block = /### 6\.6 JSON Schema[\s\S]*?```json\n([\s\S]*?)\n```/.exec(doc)?.[1] ?? '{}';
    const fromDoc = JSON.parse(block) as { $defs: Record<string, unknown> } & Record<string, unknown>;
    const file = readJson<Record<string, unknown> & { $defs: Record<string, unknown> }>(REPO_ROOT, cfg.paths.schema);
    const { $defs, ...rootFile } = file;
    delete rootFile['$comment'];
    const { $defs: docDefs, ...rootDoc } = fromDoc;
    expect(rootFile).toEqual(rootDoc);
    for (const [name, def] of Object.entries(docDefs)) expect($defs[name]).toEqual(def);
  });

  it('fonts follow D-057: official files, sha256 pinned, ≤ budget, OFL next to them', () => {
    const fonts = readJson<FontsManifest>(REPO_ROOT, cfg.paths.fontsManifest);
    const sums = parseSums(readFileSync(join(REPO_ROOT, cfg.paths.fontsSha256Sums), 'utf8'));
    expect(fonts.fonts.map((f) => [f.role, f.weight])).toEqual([
      ['ui', 500],
      ['ui', 700],
      ['map', 400],
      ['map', 500],
    ]);
    for (const f of fonts.fonts) {
      expect(sums.get(f.path.replace('art/fonts/', ''))).toBe(f.sha256);
      expect(f.bytes).toBeLessThanOrEqual(cfg.budgets.kindBytes[`font-${f.role}`] ?? 0);
      expect(fonts.licenses[f.licenseRef]?.modified).toBe(false);
    }
    expect(fonts.licenses['plex']?.reservedFontName).toBe('Plex');
    expect(readFileSync(join(REPO_ROOT, 'art/fonts/ui/OFL.txt'), 'utf8')).toContain('Reserved Font Name "Plex"');
  });
});
