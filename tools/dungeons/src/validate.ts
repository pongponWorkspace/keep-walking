// Validator per design/levels/dungeon-rules.md (point B: real dungeon records) and the per-record
// preparation the artifact build uses. Severity policy:
// - published records: `error` fails the build; `review` fails unless review_acknowledged lists
//   the code with a reference (decision id or field note); `warning` never fails.
// - draft / review records: every finding is reported, none fails (they are not in the artifact).
// - retired records: schema only.
import { rewindPolygon } from '@keep-walking/geo';
import polylabel from 'polylabel';
import type { RuleContext } from './context';
import {
  bboxOf,
  bboxesIntersect,
  distanceToBoundary,
  intersectionArea,
  lengthInside,
  minRotatedRectangleAspect,
  planarArea,
  pointInPolygons,
  polygonProblems,
  polygonsOf,
  projectGeometry,
  roundGeometry,
  type PlanarPolygon,
} from './geometry';
import { normalizeTable, parseOpeningHours } from './opening-hours';
import { equirectangular, utm47n } from './projection';
import type {
  ArtifactHours,
  DungeonGeometry,
  Issue,
  LngLat,
  Severity,
  SourceRecord,
} from './types';

export interface Prepared {
  record: SourceRecord;
  geometry: DungeonGeometry;
  planar: PlanarPolygon[];
  bbox: [number, number, number, number];
  area_m2: number;
  label_point: LngLat;
  nav_destination: { point: LngLat; source: 'entrance' | 'label_point' };
  hours: ArtifactHours | null;
}

export interface RecordResult {
  record: SourceRecord;
  issues: Issue[];
  prepared: Prepared | null;
}

type Push = (code: string, severity: Severity, message: string) => void;

function roundTo(v: number, decimals: number): number {
  return Number(v.toFixed(decimals));
}

function toRegExp(pattern: string): RegExp {
  const insensitive = pattern.startsWith('(?i)');
  return new RegExp(insensitive ? pattern.slice('(?i)'.length) : pattern, insensitive ? 'iu' : 'u');
}

/** "k=v" or "k=*" against a tag object. */
export function tagMatches(spec: string, tags: Record<string, string>): boolean {
  const eq = spec.indexOf('=');
  const key = spec.slice(0, eq);
  const value = spec.slice(eq + 1);
  const actual = tags[key];
  return actual !== undefined && (value === '*' || actual === value);
}

/** Pole of inaccessibility of the largest polygon, in metres (D-075, ADR 0003 11.3). */
export function labelPointOf(
  geometry: DungeonGeometry,
  planar: readonly PlanarPolygon[],
  precision_m: number,
  decimals: number,
): LngLat {
  const polys = polygonsOf(geometry);
  let best = 0;
  planar.forEach((p, i) => {
    if (planarArea([p]) > planarArea([planar[best] as PlanarPolygon])) best = i;
  });
  const rings = polys[best] ?? [];
  const [minX, minY, maxX, maxY] = bboxOf({ type: 'Polygon', coordinates: rings });
  const frame = equirectangular([(minX + maxX) / 2, (minY + maxY) / 2]);
  const local = rings.map((ring) => ring.map((p) => frame.forward(p)));
  const pole = polylabel(local, precision_m);
  const [lng, lat] = frame.inverse(pole);
  return [roundTo(lng, decimals), roundTo(lat, decimals)];
}

function hoursOf(record: SourceRecord, push: Push): ArtifactHours | null {
  const h = record.opening_hours;
  if (h.source === 'manual_required') {
    push(
      'opening_hours_manual_required',
      'error',
      `opening hours not filled (${h.osm ? `OSM "${h.osm}"` : 'no OSM value'}); fill a manual table (F04-R26)`,
    );
    return null;
  }
  if (h.source === 'osm') {
    const parsed = parseOpeningHours(h.osm);
    if (!parsed.ok) {
      push(
        'opening_hours_outside_grammar',
        'error',
        `OSM "${h.osm}": ${parsed.reason}; set source manual with a table and a reason`,
      );
      return null;
    }
    const n = normalizeTable(parsed.weekly, h.exceptions);
    n.problems.forEach((p) => push('opening_hours_invalid', 'error', p));
    return n.problems.length > 0
      ? null
      : { source: 'osm', weekly: n.weekly, exceptions: n.exceptions };
  }
  const n = normalizeTable(h.weekly, h.exceptions);
  n.problems.forEach((p) => push('opening_hours_invalid', 'error', p));
  return n.problems.length > 0
    ? null
    : { source: 'manual', weekly: n.weekly, exceptions: n.exceptions };
}

/** Tag, name and OSM id rules (dungeon-rules.md 8, 9, 10; pilot-dungeons.md 2). */
function placeRules(record: SourceRecord, ctx: RuleContext, push: Push): void {
  const cov = ctx.coverage;
  const tags = record.osm_tags ?? {};
  for (const [category, specs] of Object.entries(cov.blocklistTags)) {
    if (category !== 'religious' && cov.blocklistDisabledCategories.includes(category)) continue;
    for (const spec of specs) {
      if (cov.blocklistDisabledTags.includes(spec)) continue;
      if (tagMatches(spec, tags)) push('blocklist_tag', 'error', `${category}: ${spec}`);
    }
  }
  for (const spec of cov.reviewTags) {
    if (tagMatches(spec, tags)) push('review_tag', 'review', spec);
  }
  const flagTags = { ...cov.reviewFlagTags, ...ctx.build.validator.extraReviewFlagTags };
  for (const [flag, specs] of Object.entries(flagTags)) {
    const hit = specs.find((spec) => tagMatches(spec, tags));
    if (hit) push(`review_flag_${flag}`, 'review', hit);
  }
  const name = record.name_real ?? '';
  if (name !== '') {
    const religious = cov.religiousNamePatterns.find((p) => toRegExp(p).test(name));
    if (religious) push('religious_name', 'error', `name_real matches ${religious} (D-006)`);
    const review = cov.reviewNamePatterns.find((p) => toRegExp(p).test(name));
    if (review) push('review_name', 'review', `name_real matches ${review} (SF-9)`);
  }
  const osmId = record.osm_id ?? null;
  if (osmId !== null) {
    if (cov.excludeOsmIds.includes(osmId)) {
      push('osm_id_excluded', 'error', `${osmId} is in coverageFilter.excludeOsmIds (D-083)`);
    }
    const released = cov.releaseOsmIds.includes(osmId);
    if (cov.reviewOsmIds.includes(osmId) && !released) {
      push('review_osm_id', 'review', `${osmId} is in coverageFilter.reviewOsmIds`);
    }
    for (const flag of ctx.candidateFlags.get(osmId) ?? []) {
      if (!ctx.build.validator.inheritedCandidateFlags.includes(flag)) continue;
      if (flag === 'review_required' && released) continue;
      if (flag === 'crosses_major_way' && ctx.majorWays !== null) continue; // checked on geometry
      push(`candidate_${flag}`, 'review', `candidate ${osmId} carries ${flag}; redraw or confirm`);
    }
  }
}

/** Config-backed fields (dungeon-rules.md 6, 13, 14; tech note 13.2). */
function fieldRules(record: SourceRecord, ctx: RuleContext, push: Push): void {
  if (record.verification_mode !== ctx.verification.mode) {
    push('verification_mode', 'error', `v1 allows ${ctx.verification.mode} only (NN-5)`);
  }
  if (record.floor_level !== ctx.verification.floorLevel) {
    push('floor_level', 'error', `v1 floor_level must be ${String(ctx.verification.floorLevel)}`);
  }
  if (!ctx.presetIds.includes(record.preset)) {
    push('preset_unknown', 'error', `${record.preset} is not in presets.json#presetIds.confirmed`);
  }
  if (record.level_range.min >= record.level_range.max) {
    push('level_range', 'error', 'level_range must be a range with min < max (dungeon-rules.md 6)');
  }
  if (ctx.dropTableIds === null) {
    const p = ctx.build.paths.dropTables;
    push('drop_tables_missing', 'error', `${p.file}#${p.key} does not exist yet (FR-11)`);
  } else if (!ctx.dropTableIds.has(record.drop_table_id)) {
    push('drop_table_unknown', 'error', `${record.drop_table_id} is not a drop table (FR-11)`);
  }
  const keySeverity: Severity = ctx.build.validator.nameKeyMissing === 'warn' ? 'warning' : 'error';
  for (const field of ['name_key', 'search_name_key'] as const) {
    const key = record[field];
    if (key === null) push(`${field}_missing`, 'error', `${field} is null (dungeon-rules.md 14)`);
    else if (!ctx.nameKeys?.has(key)) {
      push(`${field}_unknown`, keySeverity, `${key} is not in ${ctx.build.paths.names}`);
    }
  }
}

function inBounds(p: readonly number[], b: readonly number[]): boolean {
  const [x, y] = p as [number, number];
  return (
    x >= (b[0] as number) && x <= (b[2] as number) && y >= (b[1] as number) && y <= (b[3] as number)
  );
}

/** Geometry, area, shape, entrance, hours; returns what the build needs when nothing blocks it. */
function prepare(record: SourceRecord, ctx: RuleContext, push: Push): Prepared | null {
  const decimals = ctx.build.coordinateDecimals;
  if (!record.geometry) {
    push('geometry_missing', 'error', 'no inline geometry and no geometry_files feature');
    return null;
  }
  const geometry = rewindPolygon(roundGeometry(record.geometry, decimals));
  const bounds = ctx.build.validator.bounds;
  const outside = polygonsOf(geometry)
    .flat(2)
    .some((p) => !inBounds(p, bounds));
  if (outside) {
    push('geometry_out_of_bounds', 'error', `a position is outside ${JSON.stringify(bounds)}`);
    return null;
  }
  const planar = projectGeometry(geometry, utm47n);
  const problems = planar.flatMap((rings, i) =>
    polygonProblems(rings).map((p) => (planar.length > 1 ? `part ${i}: ${p}` : p)),
  );
  problems.forEach((p) => push('geometry_invalid', 'error', p));
  if (problems.length > 0) return null;
  for (let i = 0; i < planar.length; i += 1) {
    for (let j = i + 1; j < planar.length; j += 1) {
      const a = intersectionArea([planar[i] as PlanarPolygon], [planar[j] as PlanarPolygon]);
      if (a > ctx.build.validator.maxOverlap_m2) {
        push('geometry_invalid', 'error', `parts ${i} and ${j} overlap by ${a.toFixed(1)} m2`);
        return null;
      }
    }
  }
  const areaExact = planarArea(planar);
  const area_m2 = roundTo(areaExact, ctx.build.area.decimals);
  if (areaExact < ctx.area.min_m2 || areaExact > ctx.area.max_m2) {
    push(
      'area_out_of_range',
      ctx.build.area.outOfRange,
      `${area_m2} m2 outside ${ctx.area.min_m2}..${ctx.area.max_m2} (dungeon-rules.md 1)`,
    );
  }
  const aspect = minRotatedRectangleAspect(planar);
  if (aspect > ctx.coverage.maxAspectRatio) {
    push('aspect_ratio', 'review', `${aspect.toFixed(1)} > coverageFilter.maxAspectRatio`);
  }
  const label_point = labelPointOf(geometry, planar, ctx.build.labelPoint.precision_m, decimals);
  if (!pointInPolygons(utm47n(label_point), planar)) {
    push('label_point_outside', 'error', 'label point fell outside after rounding');
  }
  let nav_destination: Prepared['nav_destination'] = { point: label_point, source: 'label_point' };
  if (record.entrance === null) {
    push('nav_fallback_label_point', 'warning', 'no entrance pinned; navigation uses label_point');
  } else {
    const point: LngLat = [
      roundTo(record.entrance.point[0], decimals),
      roundTo(record.entrance.point[1], decimals),
    ];
    const gap = distanceToBoundary(utm47n(point), planar);
    if (gap > ctx.build.validator.entranceMaxBoundaryDistance_m) {
      push('entrance_far_from_edge', 'error', `entrance is ${gap.toFixed(1)} m from the edge`);
    }
    if (record.entrance.evidence === 'pending') {
      push('entrance_unverified', 'warning', 'entrance evidence pending (dungeon-rules.md 4)');
    }
    nav_destination = { point, source: 'entrance' };
  }
  const hours = hoursOf(record, push);
  return {
    record,
    geometry,
    planar,
    bbox: bboxOf(geometry),
    area_m2,
    label_point,
    nav_destination,
    hours,
  };
}

/** All single-record rules. `prepared` is null when the geometry could not be used. */
export function analyzeRecord(record: SourceRecord, ctx: RuleContext): RecordResult {
  const issues: Issue[] = [];
  const push: Push = (code, severity, message) =>
    issues.push({ id: record.id, code, severity, message });
  if (record.status === 'retired') return { record, issues, prepared: null };
  fieldRules(record, ctx, push);
  placeRules(record, ctx, push);
  const prepared = prepare(record, ctx, push);
  return { record, issues, prepared };
}

const FILE_ID = '(file)';

export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
  /** Published records with no error after finalization, sorted by id: the artifact input. */
  publishable: Prepared[];
}

function crossRecordRules(results: Map<string, RecordResult>, ctx: RuleContext): void {
  const prepared = [...results.values()].flatMap((r) => (r.prepared ? [r.prepared] : []));
  const tol = ctx.build.validator.maxOverlap_m2;
  const add = (id: string, code: string, severity: Severity, message: string): void => {
    results.get(id)?.issues.push({ id, code, severity, message });
  };
  for (let i = 0; i < prepared.length; i += 1) {
    const a = prepared[i] as Prepared;
    for (let j = i + 1; j < prepared.length; j += 1) {
      const b = prepared[j] as Prepared;
      if (!bboxesIntersect(a.bbox, b.bbox)) continue;
      const area = intersectionArea(a.planar, b.planar);
      if (area <= tol) continue;
      const both = a.record.status === 'published' && b.record.status === 'published';
      const sev: Severity = both ? 'error' : 'warning';
      const msg = (other: string): string => `overlaps ${other} by ${area.toFixed(1)} m2`;
      add(a.record.id, 'overlap_dungeon', sev, msg(b.record.id));
      add(b.record.id, 'overlap_dungeon', sev, msg(a.record.id));
    }
    for (const zone of ctx.excludedZones ?? []) {
      if (!bboxesIntersect(a.bbox, zone.bbox)) continue;
      const area = intersectionArea(a.planar, zone.planar);
      if (area > tol) {
        const msg = `overlaps ${zone.id} (${zone.reason}) by ${area.toFixed(1)} m2`;
        add(a.record.id, 'overlap_excluded_zone', 'error', msg);
      }
    }
    for (const way of ctx.majorWays ?? []) {
      if (!bboxesIntersect(a.bbox, way.bbox)) continue;
      const inside = way.lines.reduce((sum, line) => sum + lengthInside(line, a.planar), 0);
      if (inside > ctx.coverage.majorWayMinInsideLength_m) {
        const msg = `${way.id} runs ${inside.toFixed(1)} m inside (dungeon-rules.md 3 point B)`;
        add(a.record.id, 'crosses_major_way', 'error', msg);
      }
    }
  }
}

/** Apply the severity policy of this file's header to one record's findings. */
function finalize(record: SourceRecord, issues: readonly Issue[]): Issue[] {
  const acked = new Map((record.review_acknowledged ?? []).map((a) => [a.flag, a.ref]));
  return issues.map((i) => {
    if (record.status !== 'published') {
      return i.severity === 'error'
        ? { ...i, severity: 'warning', message: `[${record.status}] ${i.message}` }
        : i;
    }
    if (i.severity !== 'review') return i;
    const ref = acked.get(i.code);
    return ref === undefined
      ? { ...i, severity: 'error', message: `${i.message} (not in review_acknowledged)` }
      : { ...i, severity: 'warning', message: `${i.message} (acknowledged: ${ref})` };
  });
}

function compareIssues(a: Issue, b: Issue): number {
  const key = (i: Issue): string => `${i.id}\u0000${i.code}\u0000${i.message}`;
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** Validate all records of a schema-valid source file. Deterministic for the same inputs. */
export function validateRecords(
  records: readonly SourceRecord[],
  ctx: RuleContext,
): ValidationResult {
  const issues: Issue[] = [];
  const counts = new Map<string, number>();
  records.forEach((r) => counts.set(r.id, (counts.get(r.id) ?? 0) + 1));
  for (const [id, n] of counts) {
    if (n > 1)
      issues.push({ id, code: 'duplicate_id', severity: 'error', message: `${n} records` });
  }
  const results = new Map<string, RecordResult>();
  for (const r of records) if (!results.has(r.id)) results.set(r.id, analyzeRecord(r, ctx));
  crossRecordRules(results, ctx);
  if (records.length > 0 && ctx.excludedZones === null) {
    issues.push({
      id: FILE_ID,
      code: 'excluded_zones_not_checked',
      severity: 'warning',
      message: `${String(ctx.build.paths.excludedZones)} not available`,
    });
  }
  if (records.length > 0 && ctx.majorWays === null) {
    issues.push({
      id: FILE_ID,
      code: 'major_ways_not_checked',
      severity: 'warning',
      message: 'paths.majorWays not set; candidate crosses_major_way flags stand in',
    });
  }
  const publishable: Prepared[] = [];
  for (const [id, result] of results) {
    const r = result.record;
    const final = finalize(r, result.issues);
    issues.push(...final);
    const blocked = final.some((i) => i.severity === 'error') || (counts.get(id) ?? 0) > 1;
    if (r.status === 'published' && !blocked && result.prepared?.hours) {
      publishable.push(result.prepared);
    }
  }
  // P2-H22 (tech note F06 9.2 data bug case): onboarding needs a dungeon for the start level.
  // Checked on the artifact input itself, so a record that covers the level but is blocked by an
  // error does not count. Fail-closed: no covering record is an error, even with zero records.
  const start = ctx.startLevel;
  if (
    !publishable.some((p) => p.record.level_range.min <= start && start <= p.record.level_range.max)
  ) {
    issues.push({
      id: FILE_ID,
      code: 'start_level_not_covered',
      severity: 'error',
      message: `no publishable dungeon has level_range covering startLevel ${start} (${ctx.build.paths.startLevel.file}#${ctx.build.paths.startLevel.key}); onboarding would recommend nothing`,
    });
  }
  issues.sort(compareIssues);
  publishable.sort((a, b) => (a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0));
  return { ok: !issues.some((i) => i.severity === 'error'), issues, publishable };
}
