import { describe, expect, it } from 'vitest';
import { checkConventions } from '../src/convention';
import { checkPointers } from '../src/pointer';
import type { Finding, Json } from '../src/types';
import { file, meta } from './helpers';

function lint(data: Json, name = 'sample'): Finding[] {
  return checkConventions(file('balance', name, data));
}
const rules = (findings: Finding[]): string[] => findings.map((f) => `${f.rule}@${f.at}`);

const good = {
  _meta: meta('sample'),
  gate: {
    _source: 'GDD',
    window_s: 300,
    minDistancePerWindow_m: 50,
    maxMembers: 4,
    maxAspectRatio: 8,
  },
  table: {
    _source: { brackets: 'GDD economy' },
    brackets: [{ from_gold: 0, to_gold: null }],
    _nullMeans: { 'brackets[].to_gold': 'unbounded' },
  },
  potions: { _source: 'GDD', small: { heal_pctMaxHp: 20, buyPrice_gold: 50 } },
  chance_pct: { _source: 'GDD', epic: 1.2 },
  roleMult: { _source: 'GDD', ranged: 1.1 },
  levels_pct: { _source: 'GDD', '1': 95, '15': 5 },
  schedule: { _source: 'GDD', startLocalTime: '16:00', timezone: 'Asia/Bangkok' },
  curve: { _source: 'GDD', expExponent: 1.5, overlapShare: 0.05, duplicateIoU: 0.9 },
};

describe('convention lint (ADR 0001 3.10)', () => {
  it('passes a file that follows every rule', () => {
    expect(rules(lint(good))).toEqual([]);
  });

  it('requires _meta with file, version, owner, task, doc and matching file name', () => {
    expect(rules(lint({ gate: { _source: 'x', a_s: 1 } }))).toContain('meta-missing@_meta');
    const bad = lint({ _meta: { file: 'other.json', version: 0, owner: 'x', task: '', doc: 'd' } });
    expect(rules(bad)).toEqual([
      'meta-field@_meta.version',
      'meta-field@_meta.task',
      'meta-field@_meta.file',
    ]);
  });

  it('rejects _meta below the top level and a non-object top level', () => {
    expect(
      rules(lint({ _meta: meta('sample'), a: { _source: 's', _meta: {}, x_s: 1 } })),
    ).toContain('meta-nested@a._meta');
    expect(rules(lint([1, 2] as Json))).toEqual(['top-level-object@']);
  });

  it('requires _source on objects with values, one level of inheritance only', () => {
    expect(rules(lint({ _meta: meta('sample'), a: { x_s: 1 } }))).toEqual(['source-missing@a']);
    const deep = { _meta: meta('sample'), a: { _source: 's', b: { c: { x_s: 1 } } } };
    expect(rules(lint(deep))).toEqual(['source-missing@a.b.c']);
    const mapSource = { _meta: meta('sample'), a: { _source: { other: 's' }, b: { x_s: 1 } } };
    expect(rules(lint(mapSource))).toEqual(['source-missing@a.b']);
    expect(rules(lint({ _meta: meta('sample'), a: { _x_source: 's', x_s: 1 } }))).toEqual([]);
  });

  it('enforces unit suffixes and the 3.10.3 exemptions', () => {
    const bad = lint({
      _meta: meta('sample'),
      a: {
        _source: 's',
        window: 300.5,
        cooldownTime: 60,
        speedLimit_mph: 3,
        radius: 10,
        maxMembers: 4,
      },
    });
    expect(rules(bad)).toEqual([
      'unit-suffix@a.window',
      'unit-suffix@a.cooldownTime',
      'unit-suffix@a.speedLimit_mph',
      'unit-suffix@a.radius',
    ]);
    const counts = lint({
      _meta: meta('sample'),
      a: { _source: 's', durationTicks: 720, spawnPointsMin: 5, reportThreshold: 5 },
    });
    expect(rules(counts)).toEqual([]);
  });

  it('keeps _ratio and named shares within 0-1', () => {
    const bad = lint({
      _meta: meta('sample'),
      a: { _source: 's', drop_ratio: 1.5, blockedShare: 2 },
    });
    expect(rules(bad)).toEqual(['ratio-range@a.drop_ratio', 'ratio-range@a.blockedShare']);
  });

  it('rejects non-camelCase keys but allows level-index map keys', () => {
    const bad = lint({
      _meta: meta('sample'),
      a: { _source: 's', Bad_Key: true, snake_case_key: 'x', '0': 1, '12': 1 },
    });
    // Integer-like keys come first in JS property order.
    expect(rules(bad)).toEqual(['key-case@a.0', 'key-case@a.Bad_Key', 'key-case@a.snake_case_key']);
  });

  it('checks LocalTime format and the paired timezone', () => {
    const noZone = lint({ _meta: meta('sample'), a: { _source: 's', resetLocalTime: '24:00' } });
    expect(rules(noZone)).toEqual(['local-time@a.resetLocalTime', 'local-time@a.resetLocalTime']);
    const paired = lint({
      _meta: meta('sample'),
      a: { _source: 's', resetLocalTime: '00:00', resetTimezone: 'Asia/Bangkok' },
    });
    expect(rules(paired)).toEqual([]);
  });

  it('warns on undeclared null and fails on a wrong or stale _nullMeans', () => {
    const undeclared = lint({ _meta: meta('sample'), a: { _source: 's', bossAtk: null } });
    expect(undeclared.map((f) => `${f.level}:${f.rule}`)).toEqual(['warn:null-undeclared']);
    const wrong = lint({
      _meta: meta('sample'),
      a: { _source: 's', cap: null, _nullMeans: { cap: 'no cap' } },
    });
    expect(rules(wrong)).toEqual(['null-means@a._nullMeans.cap']);
    const stale = lint({
      _meta: meta('sample'),
      a: { _source: 's', cap: 3, _nullMeans: { cap: 'unbounded' } },
    });
    expect(rules(stale)).toEqual(['null-means@a._nullMeans.cap']);
  });

  it('rejects a see<Name> key that holds a value instead of a pointer', () => {
    expect(rules(lint({ _meta: meta('sample'), a: { _source: 's', seeWindow: 300 } }))).toEqual([
      'pointer-name@a.seeWindow',
    ]);
  });

  it('exempts flat key map entries (copy, names) from _source and dotted-key case', () => {
    const names = {
      _meta: meta('names.th'),
      'zone.park': { name: 'x', cells: 1 },
      Bad: { name: 'y', cells: 1 },
    };
    const findings = checkConventions(file('content', 'names.th', names));
    expect(rules(findings)).toEqual(['key-case@Bad']);
  });
});

describe('pointer lint (ADR 0001 3.10.6)', () => {
  const target = file('balance', 'dungeons', {
    _meta: meta('dungeons'),
    gate: { _source: 's', window_s: 300, list: [{ a: 1 }] },
  });
  const withPointer = (value: string): Finding[] =>
    checkPointers([
      target,
      file('balance', 'drops', { _meta: meta('drops'), x: { _source: 's', seeGate: value } }),
    ]);

  it('resolves same-folder and repo-relative pointers', () => {
    expect(withPointer('dungeons.json#gate.window_s')).toEqual([]);
    expect(withPointer('config/balance/dungeons.json#gate')).toEqual([]);
  });

  it('fails on a missing file, a missing path, an array, a bad prefix or a non-config target', () => {
    for (const bad of [
      'nope.json#gate',
      'dungeons.json#gate.nope',
      'dungeons.json#gate.list.a',
      'data/x.json#a',
      'data/map/mask.geojson',
    ]) {
      expect(withPointer(bad), bad).toHaveLength(1);
    }
  });
});
