import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadStartLevel, REPO_ROOT } from '../src/context';
import type { SourceRecord } from '../src/types';
import {
  codes,
  fixtureBuild,
  fixtureContext,
  offset,
  rect,
  record,
  runFixture,
  waysOf,
  zonesOf,
} from './helpers';

const YARD_CENTRE = [100.56, 13.735];
const PARK_CENTRE = [100.56, 13.73];

describe('passing fixture', () => {
  const run = runFixture();
  it('validates with no error and publishes the three published records', () => {
    expect(run.schemaErrors).toEqual([]);
    expect(run.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(run.ok).toBe(true);
    expect(run.publishable.map((p) => p.record.id)).toEqual(['fx-market', 'fx-park', 'fx-yard']);
  });
  it('flags the navigation fallback of the record without an entrance', () => {
    expect(codes(run, 'fx-market', 'warning')).toEqual(['nav_fallback_label_point']);
  });
  it('reports draft problems as warnings only and never publishes the draft', () => {
    expect(codes(run, 'fx-draft', 'warning')).toContain('opening_hours_manual_required');
    expect(codes(run, 'fx-draft', 'error')).toEqual([]);
  });
});

type Mutation = (rs: SourceRecord[]) => void;
const yard =
  (f: (r: SourceRecord) => void): Mutation =>
  (rs) =>
    f(record(rs, 'fx-yard'));

/** Keeps the start level covered by another published record (fx-market 1-20) when a test takes
 * fx-yard, the fixture's only level-1 dungeon, out of the artifact (P2-H22). */
const alsoCoverStart =
  (m: Mutation): Mutation =>
  (rs) => {
    m(rs);
    record(rs, 'fx-market').level_range = { min: 1, max: 20 };
  };

// failing fixtures: mutation of the passing fixture → error code on fx-yard (dungeon-rules.md)
const FAILS: [string, Mutation, string][] = [
  [
    'area below area.minArea_m2',
    yard((r) => (r.geometry = rect(YARD_CENTRE, 40, 40))),
    'area_out_of_range',
  ],
  [
    'area above area.maxArea_m2',
    yard((r) => (r.geometry = rect(YARD_CENTRE, 400, 400))),
    'area_out_of_range',
  ],
  [
    'overlaps another published dungeon',
    yard((r) => (r.geometry = rect(offset(PARK_CENTRE, 60, 0), 70, 70))),
    'overlap_dungeon',
  ],
  [
    'self-intersecting ring',
    yard((r) => {
      const [a, b, c, d] = rect(YARD_CENTRE, 70, 70).coordinates[0] as number[][];
      r.geometry = { type: 'Polygon', coordinates: [[a, c, b, d, a] as [number, number][]] };
    }),
    'geometry_invalid',
  ],
  [
    'outside Bangkok and vicinity',
    yard((r) => (r.geometry = rect([102.6, 13.735], 70, 70))),
    'geometry_out_of_bounds',
  ],
  [
    'verification_mode not v1',
    yard((r) => (r.verification_mode = 'entry_exit')),
    'verification_mode',
  ],
  ['floor_level not null (even 0)', yard((r) => (r.floor_level = 0)), 'floor_level'],
  ['preset not confirmed', yard((r) => (r.preset = 'waterside')), 'preset_unknown'],
  [
    'level range is a single value',
    yard((r) => (r.level_range = { min: 5, max: 5 })),
    'level_range',
  ],
  [
    'drop table not in config',
    yard((r) => (r.drop_table_id = 'nopeDefault')),
    'drop_table_unknown',
  ],
  ['name_key null on a published record', yard((r) => (r.name_key = null)), 'name_key_missing'],
  ['name_key not in names.th.json', yard((r) => (r.name_key = 'fx.unknown')), 'name_key_unknown'],
  [
    'search_name_key not in names.th.json',
    yard((r) => (r.search_name_key = 'fx.nope')),
    'search_name_key_unknown',
  ],
  [
    'opening hours manual_required (PH)',
    yard(
      (r) => (r.opening_hours = { source: 'manual_required', osm: 'Mo-Su 06:00-18:00; PH off' }),
    ),
    'opening_hours_manual_required',
  ],
  [
    'OSM text outside the grammar',
    yard((r) => (r.opening_hours = { source: 'osm', osm: 'sunrise-sunset' })),
    'opening_hours_outside_grammar',
  ],
  [
    'manual interval end <= start',
    yard((r) => {
      if (r.opening_hours.source === 'manual') r.opening_hours.weekly['2'] = [[900, 800]];
    }),
    'opening_hours_invalid',
  ],
  [
    'blocklist tag (place of worship, D-006)',
    yard((r) => (r.osm_tags = { amenity: 'place_of_worship' })),
    'blocklist_tag',
  ],
  ['religious name (D-006)', yard((r) => (r.name_real = 'วัดตัวอย่าง')), 'religious_name'],
  [
    'osm id in excludeOsmIds (D-083)',
    yard((r) => (r.osm_id = 'osm-w347586838')),
    'osm_id_excluded',
  ],
  [
    'entrance far from the edge',
    yard(
      (r) =>
        (r.entrance = {
          point: offset(YARD_CENTRE, 0, 100) as [number, number],
          evidence: 'field_photo',
        }),
    ),
    'entrance_far_from_edge',
  ],
  // review flags fail a published record until review_acknowledged lists them
  [
    'building=civic (level-designer request)',
    yard((r) => (r.osm_tags = { building: 'civic' })),
    'review_flag_civic_building',
  ],
  [
    'location=roof (level-designer request)',
    yard((r) => (r.osm_tags = { leisure: 'garden', location: 'roof' })),
    'review_flag_rooftop',
  ],
  [
    'railway station tag',
    yard((r) => (r.osm_tags = { railway: 'station' })),
    'review_flag_railway_station',
  ],
  ['historic=palace', yard((r) => (r.osm_tags = { historic: 'palace' })), 'review_tag'],
  ['royal name pattern (SF-9)', yard((r) => (r.name_real = 'สวนพระราชวังตัวอย่าง')), 'review_name'],
  ['osm id in reviewOsmIds (D-083)', yard((r) => (r.osm_id = 'osm-w23486019')), 'review_osm_id'],
  [
    'narrow strip above maxAspectRatio',
    yard((r) => (r.geometry = rect(YARD_CENTRE, 400, 12))),
    'aspect_ratio',
  ],
];

describe('failing fixtures', () => {
  it.each(FAILS.map(([name, mutate, code]) => [`${name} → ${code}`, mutate, code] as const))(
    '%s',
    (_name, mutate, code) => {
      const run = runFixture(mutate);
      expect(run.ok).toBe(false);
      expect(codes(run, 'fx-yard', 'error')).toContain(code);
      expect(run.publishable.map((p) => p.record.id)).not.toContain('fx-yard');
    },
  );

  it('a failing record fails the whole run (the build writes nothing)', () => {
    const [, mutate] = FAILS[0] ?? ['', () => undefined];
    const run = runFixture(mutate);
    expect(run.ok).toBe(false);
  });
});

describe('schema (packages/shared/schemas/dungeon.schema.json)', () => {
  it.each([
    ['missing floor_level', yard((r) => delete (r as Partial<SourceRecord>).floor_level)],
    [
      'missing verification_mode',
      yard((r) => delete (r as Partial<SourceRecord>).verification_mode),
    ],
    ['unknown verification_mode', yard((r) => (r.verification_mode = 'wifi'))],
    ['bad id', yard((r) => (r.id = 'FX Yard'))],
    [
      'unknown property',
      yard((r) => ((r as unknown as Record<string, unknown>)['colour'] = 'red')),
    ],
    [
      'manual hours without reason',
      yard((r) => delete (r.opening_hours as { reason?: string }).reason),
    ],
    [
      'weekly missing a day',
      yard((r) => {
        if (r.opening_hours.source === 'manual')
          delete (r.opening_hours.weekly as Partial<Record<string, unknown>>)['7'];
      }),
    ],
    ['status unknown', yard((r) => ((r as { status: string }).status = 'live'))],
  ] as [string, Mutation][])('%s', (_name, mutate) => {
    const run = runFixture(mutate);
    expect(run.ok).toBe(false);
    expect(run.schemaErrors.length).toBeGreaterThan(0);
  });
});

describe('review acknowledgements, drafts, retired, duplicates', () => {
  it('an acknowledged review flag becomes a warning and the record publishes', () => {
    const run = runFixture(
      yard((r) => {
        r.osm_tags = { location: 'roof' };
        r.review_acknowledged = [{ flag: 'review_flag_rooftop', ref: 'field check 2026-10-01' }];
      }),
    );
    expect(run.ok).toBe(true);
    expect(codes(run, 'fx-yard', 'warning')).toContain('review_flag_rooftop');
    expect(run.publishable.map((p) => p.record.id)).toContain('fx-yard');
  });

  it('an acknowledgement never clears an error', () => {
    const run = runFixture(
      yard((r) => {
        r.osm_tags = { amenity: 'place_of_worship' };
        r.review_acknowledged = [{ flag: 'blocklist_tag', ref: 'nope' }];
      }),
    );
    expect(codes(run, 'fx-yard', 'error')).toContain('blocklist_tag');
  });

  it('a draft with errors reports warnings and does not fail the run', () => {
    const run = runFixture(
      alsoCoverStart(
        yard((r) => {
          r.status = 'draft';
          r.geometry = rect(YARD_CENTRE, 40, 40);
          r.osm_tags = { building: 'civic' };
        }),
      ),
    );
    expect(run.ok).toBe(true);
    expect(codes(run, 'fx-yard', 'warning')).toContain('area_out_of_range');
    expect(codes(run, 'fx-yard', 'review')).toContain('review_flag_civic_building');
    expect(run.publishable.map((p) => p.record.id)).not.toContain('fx-yard');
  });

  it('a draft overlapping a published dungeon is a warning on both', () => {
    const run = runFixture(
      alsoCoverStart(
        yard((r) => {
          r.status = 'draft';
          r.geometry = rect(offset(PARK_CENTRE, 60, 0), 70, 70);
        }),
      ),
    );
    expect(run.ok).toBe(true);
    expect(codes(run, 'fx-park', 'warning')).toContain('overlap_dungeon');
  });

  it('a retired record is checked by the schema only', () => {
    const run = runFixture(
      alsoCoverStart(
        yard((r) => {
          r.status = 'retired';
          r.geometry = rect(YARD_CENTRE, 10, 10);
          r.opening_hours = { source: 'manual_required' };
        }),
      ),
    );
    expect(run.ok).toBe(true);
    expect(run.issues.filter((i) => i.id === 'fx-yard')).toEqual([]);
  });

  it('duplicate ids fail', () => {
    const run = runFixture((rs) => rs.push(structuredClone(record(rs, 'fx-yard'))));
    expect(codes(run, 'fx-yard', 'error')).toContain('duplicate_id');
    expect(run.publishable.map((p) => p.record.id)).not.toContain('fx-yard');
  });

  it('pending entrance evidence is a warning', () => {
    const run = runFixture(yard((r) => r.entrance && (r.entrance.evidence = 'pending')));
    expect(run.ok).toBe(true);
    expect(codes(run, 'fx-yard', 'warning')).toContain('entrance_unverified');
  });

  it('nameKeyMissing = warn downgrades unknown content keys to warnings', () => {
    const base = fixtureContext();
    const ctx = {
      ...base,
      build: {
        ...base.build,
        validator: { ...base.build.validator, nameKeyMissing: 'warn' as const },
      },
    };
    const run = runFixture(
      yard((r) => (r.name_key = 'fx.unknown')),
      ctx,
    );
    expect(run.ok).toBe(true);
    expect(codes(run, 'fx-yard', 'warning')).toContain('name_key_unknown');
  });

  it('a missing drop table container fails every published record (FR-11)', () => {
    const run = runFixture(undefined, fixtureContext({ dropTableIds: null }));
    expect(codes(run, 'fx-yard', 'error')).toContain('drop_tables_missing');
  });
});

describe('coverage context: excluded zones, candidate flags, major ways', () => {
  it('overlapping an excluded zone fails (dungeon-rules.md 8, 10, D-083)', () => {
    const ctx = fixtureContext({
      excludedZones: zonesOf([rect(offset(YARD_CENTRE, 30, 0), 20, 20)]),
    });
    const run = runFixture(undefined, ctx);
    expect(codes(run, 'fx-yard', 'error')).toContain('overlap_excluded_zone');
  });

  it('an excluded zone next to the polygon (sharing an edge) passes', () => {
    const ctx = fixtureContext({
      excludedZones: zonesOf([rect(offset(YARD_CENTRE, 45, 0), 20, 20)]),
    });
    expect(runFixture(undefined, ctx).ok).toBe(true);
  });

  it('inherited candidate flags need an acknowledgement', () => {
    const ctx = fixtureContext({
      candidateFlags: new Map([['osm-w1', ['contains_religious_feature', 'multi_district']]]),
    });
    const run = runFixture(undefined, ctx);
    expect(codes(run, 'fx-park', 'error')).toEqual(['candidate_contains_religious_feature']);
    const acked = runFixture(
      (rs) =>
        (record(rs, 'fx-park').review_acknowledged = [
          { flag: 'candidate_contains_religious_feature', ref: 'redrawn around the shrine' },
        ]),
      ctx,
    );
    expect(acked.ok).toBe(true);
  });

  it('with a major-way layer, a road through the polygon fails and the candidate flag is not needed', () => {
    const through = {
      type: 'LineString' as const,
      coordinates: [offset(PARK_CENTRE, -100, 30), offset(PARK_CENTRE, 100, 30)],
    };
    const ctx = fixtureContext({
      majorWays: waysOf([through]),
      candidateFlags: new Map([['osm-w1', ['crosses_major_way']]]),
    });
    const run = runFixture(undefined, ctx);
    expect(codes(run, 'fx-park', 'error')).toEqual(['crosses_major_way']);
  });

  it('a road that only touches the edge for less than majorWayMinInsideLength_m passes', () => {
    const clip = {
      type: 'LineString' as const,
      coordinates: [offset(PARK_CENTRE, 70, 70), offset(PARK_CENTRE, 80, 55)],
    };
    const run = runFixture(undefined, fixtureContext({ majorWays: waysOf([clip]) }));
    expect(run.ok).toBe(true);
  });
});

describe('start level is covered (P2-H22, tech note F06 9.2 data bug case)', () => {
  const START = fixtureContext().startLevel;
  const noStart: Mutation = (rs) => {
    for (const r of rs) {
      if (r.level_range.min <= START) r.level_range = { min: START + 1, max: START + 10 };
    }
  };

  it('reads the start level from config/balance/progression.json, not a literal', () => {
    const progression = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'config/balance/progression.json'), 'utf8'),
    ) as { level: { startLevel: number } };
    expect(START).toBe(progression.level.startLevel);
    expect(fixtureBuild().paths.startLevel).toEqual({
      file: 'config/balance/progression.json',
      key: 'level.startLevel',
    });
  });

  it('passes when a published record covers the start level (fx-yard 1-5)', () => {
    const run = runFixture();
    expect(run.ok).toBe(true);
    expect(codes(run, '(file)', 'error')).not.toContain('start_level_not_covered');
  });

  it('fails when no record covers the start level', () => {
    const run = runFixture(noStart);
    expect(run.ok).toBe(false);
    expect(codes(run, '(file)', 'error')).toEqual(['start_level_not_covered']);
  });

  it('a covering record that is only a draft, or blocked by an error, does not count', () => {
    const draftOnly = runFixture((rs) => {
      noStart(rs);
      record(rs, 'fx-draft').level_range = { min: START, max: START + 4 };
    });
    expect(codes(draftOnly, '(file)', 'error')).toContain('start_level_not_covered');
    const blocked = runFixture((rs) => {
      noStart(rs);
      const y = record(rs, 'fx-yard');
      y.level_range = { min: START, max: START + 4 };
      y.osm_tags = { amenity: 'place_of_worship' };
    });
    expect(codes(blocked, '(file)', 'error')).toContain('start_level_not_covered');
  });

  it('both ends are inclusive (fx-yard 1-5 covers start levels 1 and 5, not 6)', () => {
    const at = (level: number) =>
      runFixture(
        (rs) => {
          for (const r of rs) if (r.id !== 'fx-yard') r.level_range = { min: 20, max: 35 };
        },
        fixtureContext({ startLevel: level }),
      );
    expect(codes(at(1), '(file)', 'error')).not.toContain('start_level_not_covered');
    expect(codes(at(5), '(file)', 'error')).not.toContain('start_level_not_covered');
    expect(codes(at(6), '(file)', 'error')).toContain('start_level_not_covered');
  });

  it('a missing or non-integer start level stops the build (fail-closed)', () => {
    expect(() =>
      loadStartLevel(REPO_ROOT, { file: 'config/balance/progression.json', key: 'level.nope' }),
    ).toThrow();
    expect(() =>
      loadStartLevel(REPO_ROOT, { file: 'config/balance/progression.json', key: 'level' }),
    ).toThrow();
  });
});
