// Tests for the P2-F05-T20 reference (gate, run state, check-in, speed lock, opening hours, RNG
// contract). Literal numbers are example inputs or the values the brief asks to prove.
import { describe, expect, it } from 'vitest';
import { loadBalanceConfig } from './config';
import { partialTick, passesGate, runGate } from './gate';
import { isOpenAt, openingChangeAfter } from './opening-hours';
import { gateConfigFromConfig, gateConfigProblems } from './params-gate';
import { Hysteresis, runTimeline, speedLockTransitions } from './presence';
import type { PresenceSample } from './presence';
import { deriveSeed, fnv1a32, streamRng as stream } from '@keep-walking/shared/formulas';
import { rollTickLoot } from './rng-contract';
import type { LootRarity } from './rng-contract';
import { TEST_POLYGON, loadTraceSamples, tracePath } from './traces';

const c = gateConfigFromConfig(loadBalanceConfig());
const always = [{ start_ms: 0, end_ms: null }];
const trace = (id: string, every = 1, phase = 0, polygon: string | null = null) =>
  loadTraceSamples({ trace: tracePath(id), polygon, every, phase });
const passed = (id: string, every = 1) =>
  runGate(trace(id, every), always, c.gate).windows.filter((w) => w.passed).length;

describe('config (P2-F05-T20 keys)', () => {
  it('passes every consistency rule (lint of P2-F04-T24, F04 R15.4, ADR 0003 5.5)', () => {
    expect(gateConfigProblems(c)).toEqual([]);
    expect(c.rewardTickInterval_s).toBe(c.gate.window_s);
    expect(c.connectionLostEndsRunAfter_s).toBe(c.run.suspendedMax_s);
    expect(c.utcOffset_min).toBe(420);
  });
});

describe('movement gate on the synthetic traces', () => {
  it('table-still = 0 windows, bench-jitter >= 1 window, park-loop every window', () => {
    expect(passed('synthetic-table-still-01')).toBe(0);
    expect(passed('synthetic-bench-jitter-01')).toBeGreaterThanOrEqual(1);
    expect(passed('synthetic-park-loop-01')).toBe(6);
  });
  it('1 Hz and 0.2 Hz give the same windows when samples sit on the grid', () => {
    for (const id of ['synthetic-park-loop-01', 'synthetic-bench-jitter-01']) {
      const a = runGate(trace(id, 1), always, c.gate).windows;
      const b = runGate(trace(id, 5), always, c.gate).windows;
      expect(b).toEqual(a);
    }
  });
  it('off-grid 0.2 Hz stays within 3% of 1 Hz', () => {
    const a = runGate(trace('synthetic-park-loop-01', 1), always, c.gate).windows;
    const b = runGate(trace('synthetic-park-loop-01', 5, 2), always, c.gate).windows;
    b.forEach((w, i) =>
      expect(Math.abs(w.distance_m / (a[i]?.distance_m ?? 1) - 1)).toBeLessThan(0.03),
    );
  });
  it('greaterThan: exactly the threshold fails, unknown comparison fails closed', () => {
    expect(passesGate(50, 50, 'greaterThan')).toBe(false);
    expect(passesGate(50.000001, 50, 'greaterThan')).toBe(true);
    expect(passesGate(60, 50, 'greaterThanOrEqual')).toBeNull();
    expect(() => runGate([], always, { ...c.gate, comparison: 'x' })).toThrow(RangeError);
  });
});

describe('D-059 partial tick', () => {
  it('59 s pays nothing, 60 s is evaluated with f = 0.2 and the gate scaled', () => {
    expect(partialTick(59_000, 100, c.partial)).toEqual({ evaluated: false, f: 0, granted: false });
    expect(partialTick(60_000, 10, c.partial)).toEqual({ evaluated: true, f: 0.2, granted: false });
    expect(partialTick(60_000, 10.01, c.partial).granted).toBe(true);
  });
  it('chances scale with f: Monte Carlo over 100,000 streams', () => {
    const table: LootRarity[] = [
      {
        rarity: 'common',
        chance_pct: null,
        qtyMult: 1,
        chanceMult: 1,
        items: [{ id: 'c', weight: 1, qtyMin: 1, qtyMax: 3 }],
      },
      {
        rarity: 'uncommon',
        chance_pct: 30,
        qtyMult: 1,
        chanceMult: 1,
        items: [{ id: 'u', weight: 1, qtyMin: 1, qtyMax: 1 }],
      },
    ];
    let unc = 0;
    let common = 0;
    const n = 100_000;
    for (let i = 0; i < n; i += 1) {
      const loot = rollTickLoot(7, i, table, 0.2);
      unc += loot.items.filter((x) => x.rarity === 'uncommon').length;
      common += loot.items.filter((x) => x.rarity === 'common').reduce((s, x) => s + x.qty, 0);
    }
    expect(unc / n).toBeCloseTo(0.06, 2);
    expect(common / n).toBeCloseTo(0.4, 1);
  });
});

describe('RNG contract (ADR 0003 6)', () => {
  it('FNV-1a 32 matches the published test values', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });
  it('streams are counter based: same seed/tag/index repeat, tags do not collide', () => {
    expect(stream(1, 'drop', 0)()).toBe(stream(1, 'drop', 0)());
    expect(deriveSeed(1, 'drop', 0)).not.toBe(deriveSeed(1, 'hit', 0));
  });
});

describe('edge hysteresis and run state', () => {
  const s = (t: number, inside: boolean, d: number): PresenceSample => ({
    t_ms: t * 1000,
    lat: 0,
    lng: 0,
    accuracy_m: 5,
    inside,
    boundaryDistance_m: d,
  });
  it('band samples are neutral, confirmation back-dates to the first opposite sample', () => {
    const h = new Hysteresis('in', c.run);
    const seq = [
      s(0, false, 2),
      s(1, false, 2),
      ...Array.from({ length: 6 }, (_, i) => s(2 + i, false, 9)),
    ];
    const got = seq.map((x) => h.feed(x)).filter((x) => x !== null);
    expect(got).toEqual([0]);
  });
  it('edge-walk: real exits give Grace then Suspended, no drift exit reaches 180 s', () => {
    for (const every of [1, 5]) {
      const tl = runTimeline(
        trace('synthetic-edge-walk-01', every, 0, TEST_POLYGON),
        0,
        1_170_000,
        c.run,
      );
      const susp = tl.events.filter((e) => e.type === 'run_state_changed' && e.to === 'suspended');
      expect(susp).toHaveLength(1);
      expect(tl.status).toBe('active');
    }
  });
  it('speed lock: driving locks, drift spikes and edge jitter never lock', () => {
    expect(speedLockTransitions(trace('synthetic-driving-40kmh-01'), c.lock)[0]?.at_ms).toBe(
      84_000,
    );
    expect(speedLockTransitions(trace('synthetic-drift-spike-01'), c.lock)).toEqual([]);
    expect(speedLockTransitions(trace('synthetic-drift-spike-01', 5), c.lock)).toEqual([]);
    expect(speedLockTransitions(trace('synthetic-edge-walk-01'), c.lock)).toEqual([]);
  });
});

describe('opening hours', () => {
  const h = {
    weekly: {
      '1': [[300, 1260]] as [number, number][],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      '6': [],
      '7': [],
    },
  };
  const mon = (hh: number, mm = 0) => Date.UTC(2026, 9, 12, hh, mm) - c.utcOffset_min * 60_000;
  it('[open, close) in Bangkok time, independent of the device time zone', () => {
    expect(isOpenAt(h, c.utcOffset_min, mon(5))).toBe(true);
    expect(isOpenAt(h, c.utcOffset_min, mon(21))).toBe(false);
    expect(openingChangeAfter(h, c.utcOffset_min, mon(12))).toBe(mon(21));
  });
});
