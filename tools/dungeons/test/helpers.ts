// Test helpers for tools/dungeons. The fixture (test/fixtures/dungeons.json) is fictional: four
// records around 100.56E 13.73N (three published, one draft). Rule values come from the real
// config/balance/dungeons.json and presets.json via loadContext; only content keys, drop table
// ids and coverage context are replaced so the tests do not depend on other roles' files.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import {
  loadBuildConfig,
  loadContext,
  REPO_ROOT,
  type BuildConfig,
  type RuleContext,
} from '../src/context';
import { waysFrom, zonesFrom } from '../src/context';
import { checkSource, compileSchemas } from '../src/source';
import type { SourceFile, SourceRecord } from '../src/types';
import { validateRecords, type ValidationResult } from '../src/validate';

export const FIXTURE_REL = 'tools/dungeons/test/fixtures/dungeons.json';
export const GOLDEN_REL = 'tools/dungeons/test/fixtures/expected.client.v1.json';
export const GOLDEN_PATH = resolve(REPO_ROOT, GOLDEN_REL);

const R = 6_371_008.8;
const DEG = Math.PI / 180;

export function loadFixture(): SourceFile {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, FIXTURE_REL), 'utf8')) as SourceFile;
}

export function fixtureBuild(): BuildConfig {
  const build = loadBuildConfig();
  return { ...build, paths: { ...build.paths, source: FIXTURE_REL } };
}

export const validators = compileSchemas(resolve(REPO_ROOT, loadBuildConfig().paths.schema));

export function fixtureContext(overrides: Partial<RuleContext> = {}): RuleContext {
  const build = fixtureBuild();
  const base = loadContext(REPO_ROOT, build, { coverage: false });
  const keys = loadFixture().dungeons.flatMap((r) => [r.name_key, r.search_name_key]);
  return {
    ...base,
    nameKeys: new Set(keys.filter((k): k is string => k !== null)),
    dropTableIds: new Set(['largeParkDefault', 'marketDefault', 'pocketParkDefault']),
    candidateFlags: new Map(),
    excludedZones: [],
    majorWays: null,
    ...overrides,
  };
}

/** Offset in metres from a [lng, lat] point (equirectangular, good to a few cm at this size). */
export function offset(p: readonly number[], dx: number, dy: number): [number, number] {
  const lat0 = p[1] as number;
  const lng = (p[0] as number) + dx / (R * DEG * Math.cos(lat0 * DEG));
  return [Number(lng.toFixed(6)), Number((lat0 + dy / (R * DEG)).toFixed(6))];
}

/** Axis-aligned rectangle of w x h metres centred on p, counter-clockwise, closed. */
export function rect(p: readonly number[], w: number, h: number): Polygon {
  const c = [
    offset(p, -w / 2, -h / 2),
    offset(p, w / 2, -h / 2),
    offset(p, w / 2, h / 2),
    offset(p, -w / 2, h / 2),
  ];
  return { type: 'Polygon', coordinates: [[...c, c[0] as [number, number]]] };
}

export function zonesOf(
  polygons: Polygon[],
  reason = 'blocked_religious',
): RuleContext['excludedZones'] {
  const fc: FeatureCollection = {
    type: 'FeatureCollection',
    features: polygons.map((geometry, i) => ({
      type: 'Feature',
      properties: { id: `zone-${i}`, reason_excluded: reason },
      geometry,
    })),
  };
  return zonesFrom(fc, [reason]);
}

export function waysOf(lines: LineString[]): RuleContext['majorWays'] {
  const fc: FeatureCollection = {
    type: 'FeatureCollection',
    features: lines.map((geometry, i) => ({
      type: 'Feature',
      properties: { id: `way-${i}` },
      geometry,
    })),
  };
  return waysFrom(fc);
}

export interface Run extends ValidationResult {
  schemaErrors: string[];
}

/** Schema + rules on a (mutated) copy of the fixture. */
export function runFixture(
  mutate: (records: SourceRecord[]) => void = () => undefined,
  ctx: RuleContext = fixtureContext(),
): Run {
  const file = loadFixture();
  mutate(file.dungeons);
  const loaded = checkSource(file, validators);
  if (!loaded.file) {
    return {
      ok: false,
      issues: loaded.issues,
      publishable: [],
      schemaErrors: loaded.issues.map((i) => i.message),
    };
  }
  return { ...validateRecords(loaded.file.dungeons, ctx), schemaErrors: [] };
}

export function record(records: SourceRecord[], id: string): SourceRecord {
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error(`fixture has no ${id}`);
  return r;
}

/** Codes of issues with the given severity for one record id. */
export function codes(run: Run, id: string, severity: 'error' | 'warning' | 'review'): string[] {
  return run.issues.filter((i) => i.id === id && i.severity === severity).map((i) => i.code);
}
