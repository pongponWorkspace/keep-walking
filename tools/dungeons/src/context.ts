// Everything the validator reads besides the records: build.config.json, the balance and content
// config, presets, and the coverage outputs used as context (candidate flags, excluded zones).
// loadContext() reads files; tests build a RuleContext directly.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewindPolygon } from '@keep-walking/geo';
import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString } from 'geojson';
import { bboxOf, projectGeometry, type PlanarPolygon, type XY } from './geometry';
import { utm47n } from './projection';
import type { DungeonGeometry } from './types';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const BUILD_CONFIG_PATH = resolve(REPO_ROOT, 'tools/dungeons/build.config.json');

export interface BuildConfig {
  coordinateDecimals: number;
  labelPoint: { precision_m: number; projection: 'equirectangular' };
  area: { projection: 'utm47n'; decimals: number; outOfRange: 'error' | 'warning' };
  paths: {
    source: string;
    artifact: string;
    schema: string;
    presets: string;
    balanceDungeons: string;
    names: string;
    dropTables: { file: string; key: string };
    candidates: string | null;
    excludedZones: string | null;
    majorWays: string | null;
    /** Pointer to the player's start level (P2-H22): `key` is a dotted path inside `file`. */
    startLevel: { file: string; key: string };
  };
  validator: {
    maxOverlap_m2: number;
    excludedZoneReasons: string[];
    entranceMaxBoundaryDistance_m: number;
    extraReviewFlagTags: Record<string, string[]>;
    inheritedCandidateFlags: string[];
    bounds: [number, number, number, number];
    nameKeyMissing: 'error' | 'warn';
  };
  attribution: string[];
}

export interface CoverageRules {
  blocklistTags: Record<string, string[]>;
  blocklistDisabledCategories: string[];
  blocklistDisabledTags: string[];
  reviewTags: string[];
  reviewFlagTags: Record<string, string[]>;
  reviewNamePatterns: string[];
  religiousNamePatterns: string[];
  excludeOsmIds: string[];
  reviewOsmIds: string[];
  releaseOsmIds: string[];
  maxAspectRatio: number;
  majorWayMinInsideLength_m: number;
}

export interface Zone {
  id: string;
  reason: string;
  bbox: [number, number, number, number];
  planar: PlanarPolygon[];
}

export interface Way {
  id: string;
  bbox: [number, number, number, number];
  lines: XY[][];
}

export interface RuleContext {
  build: BuildConfig;
  area: { min_m2: number; max_m2: number };
  verification: { mode: string; floorLevel: number | null };
  coverage: CoverageRules;
  presetIds: string[];
  /** null = the names file is not available (every key counts as missing). */
  nameKeys: Set<string> | null;
  /** null = the drop table container does not exist in config yet (FR-11). */
  dropTableIds: Set<string> | null;
  candidateFlags: Map<string, string[]>;
  excludedZones: Zone[] | null;
  majorWays: Way[] | null;
  /** config/balance/progression.json#level.startLevel: the level onboarding recommends for. */
  startLevel: number;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function obj(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where} is not an object`);
  }
  return value as Record<string, unknown>;
}

export function loadBuildConfig(path = BUILD_CONFIG_PATH): BuildConfig {
  return readJson(path) as BuildConfig;
}

function isArea(g: Geometry | null): g is DungeonGeometry {
  return g !== null && (g.type === 'Polygon' || g.type === 'MultiPolygon');
}

export function zonesFrom(fc: FeatureCollection, reasons: readonly string[]): Zone[] {
  const wanted = new Set(reasons);
  const zones: Zone[] = [];
  for (const f of fc.features) {
    const props = f.properties ?? {};
    const reason = String(props['reason_excluded'] ?? '');
    if (!wanted.has(reason) || !isArea(f.geometry)) continue;
    const g = rewindPolygon(f.geometry);
    zones.push({
      id: String(props['id'] ?? f.id ?? ''),
      reason,
      bbox: bboxOf(g),
      planar: projectGeometry(g, utm47n),
    });
  }
  return zones;
}

export function waysFrom(fc: FeatureCollection): Way[] {
  const ways: Way[] = [];
  fc.features.forEach((f: Feature, i) => {
    const g = f.geometry as LineString | MultiLineString | null;
    if (!g || (g.type !== 'LineString' && g.type !== 'MultiLineString')) return;
    const parts = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
    const flat = parts.flat();
    const lngs = flat.map((p) => p[0] as number);
    const lats = flat.map((p) => p[1] as number);
    ways.push({
      id: String(f.properties?.['id'] ?? f.id ?? `way-${i}`),
      bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      lines: parts.map((line) => line.map((p) => utm47n(p))),
    });
  });
  return ways;
}

function optionalPath(root: string, rel: string | null): string | null {
  if (rel === null) return null;
  const abs = resolve(root, rel);
  return existsSync(abs) ? abs : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function stringLists(value: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (typeof value !== 'object' || value === null) return out;
  for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) out[k] = strings(v);
  return out;
}

/** Reads the start level through paths.startLevel. Fail-closed: anything but an integer >= 1 throws. */
export function loadStartLevel(root: string, ref: { file: string; key: string }): number {
  let node: unknown = readJson(resolve(root, ref.file));
  for (const part of ref.key.split('.')) {
    node = obj(node, `${ref.file}#${ref.key}`)[part];
  }
  if (typeof node !== 'number' || !Number.isInteger(node) || node < 1) {
    throw new Error(`${ref.file}#${ref.key} must be an integer >= 1, got ${JSON.stringify(node)}`);
  }
  return node;
}

/** Read every input of the validator from the repo (offline). */
export function loadContext(
  root = REPO_ROOT,
  build = loadBuildConfig(),
  options: { coverage: boolean } = { coverage: true },
): RuleContext {
  const dungeons = obj(readJson(resolve(root, build.paths.balanceDungeons)), 'dungeons.json');
  const area = obj(dungeons['area'], 'dungeons.json#area');
  const verification = obj(dungeons['verification'], 'dungeons.json#verification');
  const cf = obj(dungeons['coverageFilter'], 'dungeons.json#coverageFilter');
  const presets = obj(readJson(resolve(root, build.paths.presets)), 'presets.json');
  const presetIds = strings(obj(presets['presetIds'], 'presets.json#presetIds')['confirmed']);

  const namesPath = optionalPath(root, build.paths.names);
  const nameKeys = namesPath
    ? new Set(Object.keys(obj(readJson(namesPath), 'names')).filter((k) => !k.startsWith('_')))
    : null;

  const dropsPath = optionalPath(root, build.paths.dropTables.file);
  const container = dropsPath
    ? obj(readJson(dropsPath), 'drop tables file')[build.paths.dropTables.key]
    : undefined;
  const dropTableIds =
    typeof container === 'object' && container !== null
      ? new Set(Object.keys(container).filter((k) => !k.startsWith('_')))
      : null;

  const candidateFlags = new Map<string, string[]>();
  const candidatesPath = options.coverage ? optionalPath(root, build.paths.candidates) : null;
  if (candidatesPath) {
    const fc = readJson(candidatesPath) as FeatureCollection;
    for (const f of fc.features) {
      const p = f.properties ?? {};
      const flags = strings(p['flags']);
      if (p['id'] !== undefined) candidateFlags.set(String(p['id']), flags);
    }
  }
  const excludedPath = options.coverage ? optionalPath(root, build.paths.excludedZones) : null;
  const excludedZones = excludedPath
    ? zonesFrom(readJson(excludedPath) as FeatureCollection, build.validator.excludedZoneReasons)
    : null;
  const waysPath = optionalPath(root, build.paths.majorWays);
  const majorWays = waysPath ? waysFrom(readJson(waysPath) as FeatureCollection) : null;

  return {
    build,
    area: { min_m2: Number(area['minArea_m2']), max_m2: Number(area['maxArea_m2']) },
    verification: {
      mode: String(verification['v1VerificationMode']),
      floorLevel: (verification['v1FloorLevel'] ?? null) as number | null,
    },
    coverage: {
      blocklistTags: stringLists(cf['blocklistTags']),
      blocklistDisabledCategories: strings(cf['blocklistDisabledCategories']),
      blocklistDisabledTags: strings(cf['blocklistDisabledTags']),
      reviewTags: strings(cf['reviewTags']),
      reviewFlagTags: stringLists(cf['reviewFlagTags']),
      reviewNamePatterns: strings(cf['reviewNamePatterns']),
      religiousNamePatterns: strings(cf['religiousNamePatterns']),
      excludeOsmIds: strings(cf['excludeOsmIds']),
      reviewOsmIds: strings(cf['reviewOsmIds']),
      releaseOsmIds: strings(cf['releaseOsmIds']),
      maxAspectRatio: Number(cf['maxAspectRatio']),
      majorWayMinInsideLength_m: Number(cf['majorWayMinInsideLength_m']),
    },
    presetIds,
    nameKeys,
    dropTableIds,
    candidateFlags,
    excludedZones,
    majorWays,
    startLevel: loadStartLevel(root, build.paths.startLevel),
  };
}
