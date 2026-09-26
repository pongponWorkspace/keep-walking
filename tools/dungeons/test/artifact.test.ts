// Artifact build against the fixture: golden file, determinism, whitelist (tech note 13.2),
// label point (D-075), navigation destination (A-3 item 3), normalized hours (tech note 8.1).
// Regenerate the golden file after an intended format change, then run prettier on it:
//   UPDATE_DUNGEON_GOLDEN=1 pnpm vitest run tools/dungeons/test/artifact.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildArtifact, serializeArtifact, sourceSha256 } from '../src/artifact';
import { pointInPolygons, projectGeometry, ringSignedArea, type XY } from '../src/geometry';
import { runBuild } from '../src/pipeline';
import { utm47n } from '../src/projection';
import type { ArtifactFile } from '../src/types';
import {
  fixtureBuild,
  fixtureContext,
  GOLDEN_PATH,
  record,
  runFixture,
  validators,
} from './helpers';

function build(mutate?: Parameters<typeof runFixture>[0]): {
  artifact: ArtifactFile;
  text: string;
} {
  const run = runFixture(mutate);
  if (!run.ok) throw new Error(JSON.stringify(run.issues));
  const artifact = buildArtifact(run.publishable, fixtureBuild());
  return { artifact, text: serializeArtifact(artifact) };
}

const WHITELIST = [
  'id',
  'name_key',
  'preset',
  'level_range',
  'drop_table_id',
  'verification_mode',
  'floor_level',
  'area_m2',
  'bbox',
  'geometry',
  'label_point',
  'nav_destination',
  'search_name_key',
  'opening_hours',
];

describe('artifact from the fixture', () => {
  const { artifact, text } = build();
  const byId = new Map(artifact.dungeons.map((d) => [d.id, d]));

  it('equals the golden file (parsed; prettier formats files under tools/)', () => {
    if (process.env['UPDATE_DUNGEON_GOLDEN'] === '1') writeFileSync(GOLDEN_PATH, text);
    expect(existsSync(GOLDEN_PATH)).toBe(true);
    expect(JSON.parse(text)).toEqual(JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')));
  });

  it('passes the artifact schema and runBuild gives the same text', () => {
    expect(validators.artifact(artifact)).toBe(true);
    const outcome = runBuild({ build: fixtureBuild(), context: fixtureContext() });
    expect(outcome.ok).toBe(true);
    expect(outcome.text).toBe(text);
    expect(outcome.counts).toEqual({ records: 4, published: 3, written: 3 });
  });

  it('is deterministic: same output twice and for any record order', () => {
    expect(build().text).toBe(text);
    expect(build((rs) => rs.reverse()).text).toBe(text);
    expect(artifact.dungeons.map((d) => d.id)).toEqual(['fx-market', 'fx-park', 'fx-yard']);
    expect(text).not.toMatch(/20[0-9]{2}-[0-9]{2}-[0-9]{2}T/);
  });

  it('carries only the whitelist, in the tech note order, and never the draft', () => {
    for (const d of artifact.dungeons) expect(Object.keys(d)).toEqual(WHITELIST);
    expect(Object.keys(artifact)).toEqual([
      'format',
      'format_version',
      'source_sha256',
      'attribution',
      'dungeons',
    ]);
    for (const banned of [
      'name_real',
      'osm_id',
      'osm_tags',
      'status',
      'notes',
      'review_acknowledged',
      'Fixture',
      'sunrise',
      'fx-draft',
      'evidence',
    ]) {
      expect(text).not.toContain(banned);
    }
    expect(artifact.attribution).toEqual(['© OpenStreetMap contributors, ODbL 1.0']);
  });

  it('keeps v1 verification fields (NN-5)', () => {
    for (const d of artifact.dungeons) {
      expect(d.verification_mode).toBe('continuous_gps');
      expect(d.floor_level).toBeNull();
    }
  });

  it('rewinds geometry (outer counter-clockwise, holes clockwise) and rounds to coordinateDecimals', () => {
    const park = byId.get('fx-park');
    if (park?.geometry.type !== 'Polygon') throw new Error('fx-park is a Polygon');
    const [outer, hole] = park.geometry.coordinates as XY[][];
    expect(ringSignedArea(outer as XY[])).toBeGreaterThan(0);
    expect(ringSignedArea(hole as XY[])).toBeLessThan(0);
    const decimals = fixtureBuild().coordinateDecimals;
    for (const n of JSON.stringify(park.geometry).match(/-?[0-9]+\.[0-9]+/g) ?? []) {
      expect((n.split('.')[1] ?? '').length).toBeLessThanOrEqual(decimals);
    }
  });

  it('puts the label point inside the polygon, away from the hole in the middle (D-075)', () => {
    for (const d of artifact.dungeons) {
      expect(pointInPolygons(utm47n(d.label_point), projectGeometry(d.geometry, utm47n))).toBe(
        true,
      );
    }
    expect(byId.get('fx-park')?.label_point).not.toEqual([100.56, 13.73]);
  });

  it('uses the pinned entrance, else the label point, never the centroid (A-3, R37)', () => {
    expect(byId.get('fx-park')?.nav_destination.source).toBe('entrance');
    expect(byId.get('fx-yard')?.nav_destination.source).toBe('entrance');
    const market = byId.get('fx-market');
    expect(market?.nav_destination).toEqual({ point: market?.label_point, source: 'label_point' });
  });

  it('computes area_m2 in EPSG:32647 rounded to area.decimals', () => {
    expect(byId.get('fx-park')?.area_m2).toBe(17535.7);
    expect(byId.get('fx-yard')?.area_m2).toBe(4884.6);
    expect(byId.get('fx-market')?.area_m2).toBe(7184.9);
  });

  it('splits overnight hours and keeps exceptions sorted without notes (tech note 8.1)', () => {
    const market = byId.get('fx-market')?.opening_hours;
    expect(market?.source).toBe('osm');
    expect(market?.weekly).toEqual({
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [[960, 1440]],
      '6': [
        [0, 120],
        [960, 1440],
      ],
      '7': [
        [0, 120],
        [960, 1320],
      ],
    });
    const yard = byId.get('fx-yard')?.opening_hours;
    expect(yard?.source).toBe('manual');
    expect(yard?.weekly['1']).toEqual([[360, 1080]]);
    expect(yard?.exceptions).toEqual([
      { date: '2026-10-13', intervals: [[480, 600]] },
      { date: '2026-12-31', intervals: [] },
    ]);
  });

  it('source_sha256 follows published records only', () => {
    const changedDraft = build((rs) => (record(rs, 'fx-draft').notes = 'changed'));
    expect(changedDraft.artifact.source_sha256).toBe(artifact.source_sha256);
    const changedPublished = build((rs) => (record(rs, 'fx-yard').notes = 'changed'));
    expect(changedPublished.artifact.source_sha256).not.toBe(artifact.source_sha256);
    expect(sourceSha256([])).toBe(
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    );
  });

  it('a failing record stops runBuild with no text', () => {
    const base = fixtureContext({ dropTableIds: new Set() });
    const outcome = runBuild({ build: fixtureBuild(), context: base });
    expect(outcome.ok).toBe(false);
    expect(outcome.text).toBeNull();
  });
});
