import { describe, expect, it } from 'vitest';
import { filterGateSamples, gridDistance_m, resampleOnGrid, timeFromOrigin } from '../src/index';
import type { GeoSample, GridParams, TimedSample } from '../src/index';
import { FILTER, offset, ORIGIN, straightWalk } from './fixtures';

const G: GridParams = { sampleCadence_s: 5, maxSamplePairGap_s: 30 };
const timed = (s: GeoSample[], extra: Partial<TimedSample> = {}): TimedSample[] =>
  s.map((sample, i) => ({
    sample,
    tau_ms: sample.t_ms,
    countable: true,
    breakBefore: i === 0,
    ...extra,
  }));

describe('resampleOnGrid + gridDistance_m', () => {
  it('rejects a cadence that is not a whole number of ms, and a missing gap', () => {
    expect(() => resampleOnGrid([], { ...G, sampleCadence_s: 0.0005 })).toThrow(RangeError);
    expect(() => resampleOnGrid([], { sampleCadence_s: 5 } as GridParams)).toThrow(RangeError);
  });

  it('places grid points at tau = i * cadence by linear interpolation', () => {
    const s = straightWalk(12, 3, 1); // fixes at 0, 3, 6, 9, 12 s
    const pts = resampleOnGrid(timed(s), G);
    expect(pts.map((p) => p.tau_ms)).toEqual([0, 5000, 10000]);
    expect(pts[1]?.lng).toBeCloseTo(offset(ORIGIN, 0, 5).lng, 12);
  });

  it('1 Hz and 0.2 Hz of the same straight walk give the same distance', () => {
    const fast = gridDistance_m(resampleOnGrid(timed(straightWalk(300, 1, 1.3)), G));
    const slow = gridDistance_m(resampleOnGrid(timed(straightWalk(300, 5, 1.3)), G));
    expect(fast).toBeCloseTo(390, 3);
    expect(slow).toBeCloseTo(fast, 6);
  });

  it('a bracketing pair further apart than maxSamplePairGap_s values no grid point (GD B-04)', () => {
    const a = straightWalk(60, 1, 1);
    const b = straightWalk(60, 1, 1, { start_s: 360, from: offset(ORIGIN, 400, 0) });
    const pts = resampleOnGrid(timed([...a, ...b]), G);
    // The 300 s hole and the 400 m jump add nothing: 60 m + 60 m only.
    expect(gridDistance_m(pts)).toBeCloseTo(120, 3);
    expect(pts.some((p) => p.tau_ms > 60_000 && p.tau_ms < 360_000)).toBe(false);
  });

  it('a gap exactly equal to maxSamplePairGap_s still interpolates', () => {
    const s = [
      ...straightWalk(0, 1, 1),
      ...straightWalk(0, 1, 1, { start_s: 30, from: offset(ORIGIN, 0, 30) }),
    ];
    expect(gridDistance_m(resampleOnGrid(timed(s), G))).toBeCloseTo(30, 6);
  });

  it('a filter break (re-anchor) adds no distance across the jump', () => {
    const s = [
      ...straightWalk(20, 1, 1),
      ...straightWalk(20, 1, 1, { start_s: 21, from: offset(ORIGIN, 500, 0) }),
    ];
    const ts = timed(s).map((t, i) => (i === 21 ? { ...t, breakBefore: true } : t));
    // 0-20 m on the first chain, grid 25-40 s on the second; the grid pair 20-25 s straddles the
    // break and adds nothing (the 500 m jump and the 4 m walked in it are both lost).
    expect(gridDistance_m(resampleOnGrid(ts, G))).toBeCloseTo(35, 3);
  });

  it('a non-countable fix (outside the polygon) breaks both of its pairs (F05-R05 item 1)', () => {
    const ts = timed(straightWalk(40, 1, 1)).map((t, i) =>
      i === 20 ? { ...t, countable: false } : t,
    );
    // Pairs 19-20 and 20-21 are out; grid points at 20 s is not valued: 0-15 and 25-40 remain.
    expect(gridDistance_m(resampleOnGrid(ts, G))).toBeCloseTo(30, 3);
  });

  it('never bridges an invalid pair even when both neighbouring grid points are valued', () => {
    // Fixes at tau 0 (on grid), 3, 4 (break before), 8: grid 0 is on fix 0, grid 5 lies on 4-8.
    const s: GeoSample[] = [0, 3, 4, 8].map((t) => ({
      t_ms: t * 1000,
      ...offset(ORIGIN, 0, t),
      accuracy_m: 5,
    }));
    const ts = timed(s).map((t, i) => (i === 2 ? { ...t, breakBefore: true } : t));
    const pts = resampleOnGrid(ts, G);
    expect(pts.map((p) => p.tau_ms)).toEqual([0, 5000]);
    expect(gridDistance_m(pts)).toBe(0);
  });

  it('a pause of the window clock inside a pair breaks it (tau jump != time jump)', () => {
    // Fixes every second 0-25 s except 11-15 s; the clock paused 5 s in that hole, so from
    // t = 16 s on tau = t - 5 s. The pair (10 s, 16 s) spans the pause and adds nothing.
    const s = straightWalk(25, 1, 1).filter((x) => x.t_ms <= 10_000 || x.t_ms >= 16_000);
    const ts = timed(s).map((t) =>
      t.sample.t_ms >= 16_000 ? { ...t, tau_ms: t.tau_ms - 5000 } : t,
    );
    // 0-10 m before the pause, then tau 15 (t 20) to tau 20 (t 25): 5 m.
    expect(gridDistance_m(resampleOnGrid(ts, G))).toBeCloseTo(15, 3);
  });

  it('throws when tau goes backwards (engine bug)', () => {
    const ts = timed(straightWalk(3, 1, 1)).map((t, i) => (i === 2 ? { ...t, tau_ms: 0 } : t));
    expect(() => resampleOnGrid(ts, G)).toThrow(RangeError);
  });

  it('works on the filter output via timeFromOrigin', () => {
    const { kept } = filterGateSamples(straightWalk(100, 1, 1), FILTER);
    expect(gridDistance_m(resampleOnGrid(timeFromOrigin(kept, 0), G))).toBeCloseTo(100, 3);
  });
});
