import { describe, expect, it } from 'vitest';
import { normalizeTable, parseOpeningHours } from '../src/opening-hours';
import type { HoursException, Interval, Weekly } from '../src/types';

const ALL = (i: Interval[]): Weekly => ({ '1': i, '2': i, '3': i, '4': i, '5': i, '6': i, '7': i });
const week = (d: Partial<Weekly>): Weekly => ({ ...ALL([]), ...d });

// raw OSM text → expected weekly table (ISO weekday 1 = Monday), minutes [open, close)
const PARSES: [string, Weekly][] = [
  ['24/7', ALL([[0, 1440]])],
  ['05:00-21:00', ALL([[300, 1260]])],
  ['Mo-Su 06:00-22:00', ALL([[360, 1320]])],
  ['00:00-24:00', ALL([[0, 1440]])],
  [
    'Mo-Fr 08:00-17:00; Sa 09:00-12:00',
    week({
      '1': [[480, 1020]],
      '2': [[480, 1020]],
      '3': [[480, 1020]],
      '4': [[480, 1020]],
      '5': [[480, 1020]],
      '6': [[540, 720]],
    }),
  ],
  [
    'Mo-Fr 07:00-12:00, 13:00-17:00',
    week({
      '1': [
        [420, 720],
        [780, 1020],
      ],
      '2': [
        [420, 720],
        [780, 1020],
      ],
      '3': [
        [420, 720],
        [780, 1020],
      ],
      '4': [
        [420, 720],
        [780, 1020],
      ],
      '5': [
        [420, 720],
        [780, 1020],
      ],
    }),
  ],
  ['Mo-Su 08:00-18:00; We off', { ...ALL([[480, 1080]]), '3': [] }],
  ['Mo-Su 08:00-18:00; We closed', { ...ALL([[480, 1080]]), '3': [] }],
  ['Sa-Mo 10:00-12:00', week({ '6': [[600, 720]], '7': [[600, 720]], '1': [[600, 720]] })],
  // overnight: split at midnight, the rest goes to the next day (tech note 8.1)
  [
    'Fr,Sa 16:00-02:00; Su 16:00-22:00',
    week({
      '5': [[960, 1440]],
      '6': [
        [0, 120],
        [960, 1440],
      ],
      '7': [
        [0, 120],
        [960, 1320],
      ],
    }),
  ],
  ['Su 22:00-02:00', week({ '7': [[1320, 1440]], '1': [[0, 120]] })],
  [
    '22:00-26:00',
    ALL([
      [0, 120],
      [1320, 1440],
    ]),
  ],
  // a later rule replaces the day it names, the spill-over of the day before stays
  ['Fr 20:00-03:00; Sa off', week({ '5': [[1200, 1440]], '6': [[0, 180]] })],
  // touching spans merge
  ['Mo 08:00-12:00,12:00-14:00', week({ '1': [[480, 840]] })],
  [
    'Mo - Fr 08:00 - 09:00',
    week({
      '1': [[480, 540]],
      '2': [[480, 540]],
      '3': [[480, 540]],
      '4': [[480, 540]],
      '5': [[480, 540]],
    }),
  ],
];

// raw OSM text outside the restricted grammar → manual_required (ADR 0003 9.2)
const REJECTS: [string, RegExp][] = [
  ['Mo-Fr 08:00-17:00; PH off', /PH/],
  ['sunrise-sunset', /sunrise/],
  ['Mo-Su 05:00-21:00; SH off', /SH/],
  ['Mo-Fr 08:00-17:00 "call first"', /"/],
  ['Jan-Mar 08:00-17:00', /Jan/],
  ['week 1-26 Mo 08:00-17:00', /week/],
  ['Mo 08:00+', /\+/],
  ['Mo 08:00-12:00 || Tu 09:00-10:00', /\|/],
  ['Mo 10:00-10:00', /zero-length/],
  ['25:00-26:00', /bad time span/],
  ['Mo-Xx 08:00-09:00', /bad day selector/],
  ['off', /without days/],
  ['Mo 08:00-17:00;', /empty rule/],
  ['Mo 08:00-17:00 extra', /unsupported rule/],
  ['Mo 08:00-09:00-10:00', /bad time span/],
];

describe('parseOpeningHours (restricted grammar, no library)', () => {
  it.each(PARSES)('%s', (raw, expected) => {
    const r = parseOpeningHours(raw);
    expect(r).toEqual({ ok: true, weekly: expected });
  });

  it.each(REJECTS)('%s → manual_required', (raw, reason) => {
    const r = parseOpeningHours(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  });

  it('every accepted table keeps 0 <= start < end <= 1440, sorted and disjoint per day', () => {
    for (const [raw] of PARSES) {
      const r = parseOpeningHours(raw);
      if (!r.ok) throw new Error(raw);
      for (const day of Object.values(r.weekly)) {
        day.forEach(([s, e], i) => {
          expect(s).toBeGreaterThanOrEqual(0);
          expect(e).toBeLessThanOrEqual(1440);
          expect(s).toBeLessThan(e);
          if (i > 0) expect(s).toBeGreaterThan((day[i - 1] as Interval)[1]);
        });
      }
    }
  });
});

describe('normalizeTable (manual tables and exceptions)', () => {
  it('merges and sorts intervals, sorts exceptions by date, drops notes', () => {
    const n = normalizeTable(
      week({
        '1': [
          [720, 1080],
          [360, 720],
        ],
      }),
      [
        { date: '2026-12-31', intervals: [], note: 'x' },
        {
          date: '2026-10-13',
          intervals: [
            [600, 700],
            [480, 600],
          ],
        },
      ],
    );
    expect(n.problems).toEqual([]);
    expect(n.weekly['1']).toEqual([[360, 1080]]);
    expect(n.exceptions).toEqual([
      { date: '2026-10-13', intervals: [[480, 700]] },
      { date: '2026-12-31', intervals: [] },
    ]);
  });

  it.each([
    [week({ '2': [[600, 600]] }), [], /weekday 2/],
    [week({ '3': [[-1, 60]] }), [], /weekday 3/],
    [week({ '4': [[0, 1441]] }), [], /weekday 4/],
    [week({ '5': [[0.5, 60]] }), [], /weekday 5/],
    [week({}), [{ date: '2026-02-29', intervals: [] }], /not a calendar date/],
    [week({}), [{ date: '2026-13-01', intervals: [] }], /not a calendar date/],
    [
      week({}),
      [
        { date: '2026-10-13', intervals: [] },
        { date: '2026-10-13', intervals: [] },
      ],
      /twice/,
    ],
    [week({}), [{ date: '2026-10-13', intervals: [[900, 800]] }], /exception 2026-10-13/],
  ] as [Weekly, HoursException[], RegExp][])('rejects %j %j', (weekly, exceptions, reason) => {
    const n = normalizeTable(weekly, exceptions);
    expect(n.problems.join('\n')).toMatch(reason);
  });

  it('accepts 29 February in a leap year', () => {
    expect(normalizeTable(week({}), [{ date: '2028-02-29', intervals: [] }]).problems).toEqual([]);
  });
});
