import { describe, expect, it } from 'vitest';
import { filterGateSamples, gateFilterInit, gateFilterStep } from '../src/index';
import type { GateFilterParams, GeoSample } from '../src/index';
import { FILTER, offset, ORIGIN, straightWalk } from './fixtures';

const P: GateFilterParams = FILTER;
const at = (t_s: number, north_m: number, east_m: number, accuracy_m = 5): GeoSample => ({
  t_ms: t_s * 1000,
  ...offset(ORIGIN, north_m, east_m),
  accuracy_m,
});

describe('filterGateSamples: parameters (no defaults in code)', () => {
  it('throws on missing or invalid parameters', () => {
    const s = straightWalk(10, 1, 1);
    expect(() => filterGateSamples(s, { ...P, maxSampleAccuracy_m: 0 })).toThrow(RangeError);
    expect(() => filterGateSamples(s, { ...P, outlierSpeed_kmh: Number.NaN })).toThrow(RangeError);
    expect(() => filterGateSamples(s, { ...P, outlierReanchorSamples: 1.5 })).toThrow(RangeError);
    expect(() => filterGateSamples(s, {} as GateFilterParams)).toThrow(RangeError);
  });
});

describe('filterGateSamples: drops outliers only', () => {
  it('keeps every fix of a normal walk untouched (no smoothing)', () => {
    const s = straightWalk(60, 1, 1.3);
    const { kept, dropped } = filterGateSamples(s, P);
    expect(dropped).toEqual([]);
    expect(kept.map((k) => k.sample)).toEqual(s);
    expect(kept.map((k) => k.breakBefore)).toEqual([true, ...Array(60).fill(false)]);
  });

  it('keeps small jitter as is: no minimum step', () => {
    const s = [at(0, 0, 0), at(1, 0.3, 0), at(2, 0, 0.3), at(3, -0.2, 0)];
    expect(filterGateSamples(s, P).kept).toHaveLength(4);
  });

  it('accuracy: equal to the threshold is kept, worse is dropped', () => {
    const s = [at(0, 0, 0), at(1, 1, 0, 30), at(2, 2, 0, 30.1), at(3, 3, 0)];
    const { kept, dropped } = filterGateSamples(s, P);
    expect(kept.map((k) => k.sample.t_ms)).toEqual([0, 1000, 3000]);
    expect(dropped).toEqual([{ sample: s[2], index: 2, reason: 'accuracy' }]);
  });

  it('speed: a single spike is dropped and the walk continues from the anchor', () => {
    const s = [at(0, 0, 0), at(1, 1, 0), at(2, 300, 0), at(3, 3, 0), at(4, 4, 0)];
    const { kept, dropped } = filterGateSamples(s, P);
    expect(dropped.map((d) => [d.index, d.reason])).toEqual([[2, 'speed']]);
    expect(kept.every((k, i) => k.breakBefore === (i === 0))).toBe(true);
  });

  it('re-anchors after N consistent speed drops; the jump itself is a break', () => {
    const s = [at(0, 0, 0), at(1, 1, 0)];
    for (let i = 0; i < 6; i += 1) s.push(at(2 + i, 500 + i, 0));
    const { kept, dropped } = filterGateSamples(s, P);
    expect(dropped.map((d) => d.index)).toEqual([2, 3, 4, 5]);
    // The 5th consistent drop (index 6) becomes the new anchor with breakBefore; the next one follows.
    expect(kept.map((k) => [k.sample.t_ms, k.breakBefore])).toEqual([
      [0, true],
      [1000, false],
      [6000, true],
      [7000, false],
    ]);
  });

  it('inconsistent drops restart the re-anchor count (spikes in different places)', () => {
    const s = [at(0, 0, 0)];
    for (let i = 0; i < 8; i += 1) s.push(at(1 + i, i % 2 === 0 ? 400 : -400, 0));
    const { kept } = filterGateSamples(s, P);
    expect(kept).toHaveLength(1);
  });

  it('accuracy drops neither extend nor reset the re-anchor run', () => {
    const s = [at(0, 0, 0), at(1, 500, 0), at(2, 501, 0), at(3, 0, 0, 99), at(4, 502, 0)];
    s.push(at(5, 503, 0), at(6, 504, 0));
    const { kept } = filterGateSamples(s, P);
    expect(kept.map((k) => k.sample.t_ms)).toEqual([0, 6000]);
  });

  it('drops fixes that do not move forward in time', () => {
    const s = [at(0, 0, 0), at(1, 1, 0), { ...at(1, 2, 0) }, at(0.5, 2, 0)];
    const { dropped } = filterGateSamples(s, P);
    expect(dropped.map((d) => d.reason)).toEqual(['time_order', 'time_order']);
  });

  it('step form keeps a plain, JSON-serializable state', () => {
    let state = gateFilterInit();
    for (const s of [at(0, 0, 0), at(1, 400, 0), at(2, 401, 0)]) {
      state = gateFilterStep(JSON.parse(JSON.stringify(state)) as typeof state, s, P).state;
    }
    expect(state.anchor?.t_ms).toBe(0);
    expect(state.pending.map((s) => s.t_ms)).toEqual([1000, 2000]);
  });
});
