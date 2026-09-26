// Trace-based acceptance of P2-F04-T12: synthetic traces -> expected -> actual, with fixture
// parameters from ./fixtures (not config).
import { describe, expect, it } from 'vitest';
import {
  edgeHysteresisInit,
  edgeHysteresisStep,
  edgeObservation,
  filterGateSamples,
  gateDiagnosticWindows,
  gridPairCounts,
  haversine_m,
  pairSpeed_kmh,
  passesGate,
  pointInPolygon,
  resampleOnGrid,
  rewardWindowInit,
  rewardWindowStep,
  timeFromOrigin,
} from '../src/index';
import type { EdgeTransition, GeoSample, GridPoint, RewardWindowParams } from '../src/index';
import {
  DIAG,
  FILTER,
  GATE,
  GRACE_MAX_S,
  HYST,
  SPEED_LOCK_KMH,
  loadTrace,
  REWARD,
  TEST_RECT,
} from './fixtures';

const T = (id: string) => loadTrace(`synthetic-${id}-01`);

/** Reward windows over a whole trace as one Active run (tau = t), optionally with a polygon. */
function rewardWindows(s: GeoSample[], p: RewardWindowParams, inside?: (x: GeoSample) => boolean) {
  let state = rewardWindowInit(p);
  const out: number[] = [];
  for (const sample of s) {
    const r = rewardWindowStep(
      state,
      { sample, tau_ms: sample.t_ms, countable: inside?.(sample) ?? true },
      p,
    );
    state = r.state;
    out.push(...r.closed.map((w) => w.distance_m));
  }
  return out;
}
const passes = (d: number[]) =>
  d.filter((x) => passesGate(x, GATE.minDistancePerWindow_m, GATE.comparison)).length;

describe('movement gate on synthetic traces (fixture cadence 5 s)', () => {
  it('table-still: 0 windows pass (diagnostic filtered and rewardWindow)', () => {
    const s = T('table-still');
    const diag = gateDiagnosticWindows(s, DIAG);
    expect(diag).toHaveLength(21);
    expect(diag.filter((w) => w.filteredPass)).toHaveLength(0);
    expect(passes(rewardWindows(s, REWARD))).toBe(0);
  });

  it('bench-jitter: at least 1 window passes (diagnostic filtered and rewardWindow)', () => {
    const s = T('bench-jitter');
    expect(
      gateDiagnosticWindows(s, DIAG).filter((w) => w.filteredPass).length,
    ).toBeGreaterThanOrEqual(1);
    expect(passes(rewardWindows(s, REWARD))).toBeGreaterThanOrEqual(1);
  });

  it.each([1, 2, 3, 5])('cadence %i s keeps table = 0 and bench >= 1 (ADR 0003 5.5 band)', (c) => {
    const p = { ...DIAG, sampleCadence_s: c };
    expect(gateDiagnosticWindows(T('table-still'), p).filter((w) => w.filteredPass)).toHaveLength(
      0,
    );
    expect(
      gateDiagnosticWindows(T('bench-jitter'), p).filter((w) => w.filteredPass).length,
    ).toBeGreaterThan(0);
  });

  it('cadence 10 s would fail the bench (documents the upper edge of the band)', () => {
    const p = { ...DIAG, sampleCadence_s: 10 };
    expect(gateDiagnosticWindows(T('bench-jitter'), p).filter((w) => w.filteredPass)).toHaveLength(
      0,
    );
  });

  it('raw diagnostic windows keep the tools/traces meaning (bench 21/21, table 0/21)', () => {
    expect(gateDiagnosticWindows(T('bench-jitter'), DIAG).filter((w) => w.rawPass)).toHaveLength(
      21,
    );
    expect(gateDiagnosticWindows(T('table-still'), DIAG).filter((w) => w.rawPass)).toHaveLength(0);
  });

  it('park-loop: every reward window passes', () => {
    const d = rewardWindows(T('park-loop'), REWARD);
    expect(d).toHaveLength(6);
    expect(passes(d)).toBe(6);
  });
});

describe('drift-spike: no distance from spikes', () => {
  const s = T('drift-spike');
  const { kept, dropped } = filterGateSamples(s, FILTER);
  const points = resampleOnGrid(timeFromOrigin(kept, 0), FILTER);
  const between = (from_s: number, to_s: number) => {
    let d = 0;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1] as GridPoint;
      const b = points[i] as GridPoint;
      if (a.tau_ms >= from_s * 1000 && b.tau_ms <= to_s * 1000 && gridPairCounts(a, b))
        d += haversine_m(a, b);
    }
    return d;
  };
  const isSpike = (t_ms: number) => {
    const t = t_ms / 1000;
    return t === 150 || (t >= 330 && t < 333) || (t >= 510 && t < 535);
  };

  it('S1 (150 m, accuracy 35) is dropped for accuracy; S2 (300 m x 3, accuracy 12) for speed', () => {
    const at = (t_s: number) => dropped.find((d) => d.sample.t_ms === t_s * 1000)?.reason;
    expect(at(150)).toBe('accuracy');
    expect([at(330), at(331), at(332)]).toEqual(['speed', 'speed', 'speed']);
  });

  it('S3 snap-back is dropped for speed and re-anchored, not counted', () => {
    expect(dropped.find((d) => d.sample.t_ms === 535_000)?.reason).toBe('speed');
    expect(kept.filter((k) => k.breakBefore).map((k) => k.sample.t_ms)).toEqual([0, 539_000]);
  });

  it('no counted grid pair is faster than outlierSpeed_kmh', () => {
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1] as GridPoint;
      const b = points[i] as GridPoint;
      if (!gridPairCounts(a, b)) continue;
      const v = pairSpeed_kmh(
        { t_ms: a.tau_ms, lat: a.lat, lng: a.lng },
        { t_ms: b.tau_ms, lat: b.lat, lng: b.lng },
      );
      expect(v).toBeLessThanOrEqual(FILTER.outlierSpeed_kmh);
    }
  });

  it('windows around S1 and S2 hold walking distance only (1.3 m/s walker)', () => {
    expect(between(140, 160)).toBeLessThan(20 * 1.3 * 1.5);
    expect(between(320, 345)).toBeLessThan(25 * 1.3 * 1.5);
  });

  it('total <= raw distance without spike fixes + the S3 drift ramp (60 m, walking-plausible)', () => {
    let clean = 0;
    for (let i = 1; i < s.length; i += 1) {
      const a = s[i - 1] as GeoSample;
      const b = s[i] as GeoSample;
      if (!isSpike(a.t_ms) && !isSpike(b.t_ms)) clean += haversine_m(a, b);
    }
    const total = between(0, 720);
    expect(total).toBeLessThan(clean + 60);
    expect(total).toBeLessThan(
      s.reduce((acc, b, i) => (i === 0 ? 0 : acc + haversine_m(s[i - 1] as GeoSample, b)), 0) / 2,
    );
  });
});

describe('edge-walk: hysteresis does not flip often; outside distance never counts', () => {
  const s = T('edge-walk');
  const rect = TEST_RECT();
  const transitions: EdgeTransition[] = [];
  let state = edgeHysteresisInit('inside');
  let rawFlips = 0;
  let prevInside = true;
  for (const x of s) {
    const o = edgeObservation(x, rect);
    if (o.inside !== prevInside) rawFlips += 1;
    prevInside = o.inside;
    const r = edgeHysteresisStep(state, { t_ms: x.t_ms, ...o }, HYST);
    state = r.state;
    if (r.transition) transitions.push(r.transition);
  }
  const outsideSpans = transitions
    .map((tr, i) =>
      tr.to === 'outside' ? [tr.since_t_ms, transitions[i + 1]?.since_t_ms ?? Infinity] : null,
    )
    .filter((x): x is number[] => x !== null)
    .map(([a, b]) => [(a as number) / 1000, ((b as number) - (a as number)) / 1000]);

  it('raw inside/outside flips 58 times; hysteresis confirms at most 8 changes', () => {
    expect(rawFlips).toBe(58);
    expect(transitions.length).toBeLessThanOrEqual(8);
    expect(transitions.length % 2).toBe(0);
  });

  it('drift while walking the edge (before 519 s) never exceeds graceMax_s outside (no Suspended)', () => {
    for (const [start, span] of outsideSpans)
      if ((start as number) < 519) expect(span).toBeLessThanOrEqual(GRACE_MAX_S);
  });

  it('real exit 1 (about 150 s) stays within Grace; real exit 2 (about 240 s) exceeds it', () => {
    const exit1 = outsideSpans.find(
      ([start]) => (start as number) >= 519 && (start as number) < 675,
    );
    const exit2 = outsideSpans.find(([start]) => (start as number) >= 848);
    expect(exit1?.[1]).toBeLessThanOrEqual(GRACE_MAX_S);
    expect(exit2?.[1]).toBeGreaterThan(GRACE_MAX_S);
  });

  it('gate distance counts only pairs with both fixes inside the polygon (F05-R05, D-094)', () => {
    const all = rewardWindows(s, REWARD);
    const insideOnly = rewardWindows(s, REWARD, (x) => pointInPolygon(x, rect));
    expect(insideOnly.length).toBe(all.length);
    insideOnly.forEach((d, i) => expect(d).toBeLessThan(all[i] as number));
  });
});

describe('other synthetic traces', () => {
  it('warmup-accuracy: fixes worse than maxSampleAccuracy_m are dropped', () => {
    const s = T('warmup-accuracy');
    const { dropped } = filterGateSamples(s, FILTER);
    const bad = s.filter((x) => x.accuracy_m > FILTER.maxSampleAccuracy_m).length;
    expect(dropped.filter((d) => d.reason === 'accuracy')).toHaveLength(bad);
    expect(bad).toBeGreaterThan(0);
  });

  it('teleport-spoof: the jump into the polygon is a speed outlier and adds no distance', () => {
    const s = T('teleport-spoof');
    const { dropped, kept } = filterGateSamples(s, FILTER);
    expect(dropped.some((d) => d.reason === 'speed')).toBe(true);
    expect(kept.filter((k) => k.breakBefore).length).toBeGreaterThanOrEqual(2);
  });

  it('driving-40kmh: the speed lock function sees > 25 km/h sustained while driving', () => {
    const s = T('driving-40kmh');
    let fast = 0;
    for (let i = 1; i < s.length; i += 1)
      if (pairSpeed_kmh(s[i - 1] as GeoSample, s[i] as GeoSample) > SPEED_LOCK_KMH) fast += 1;
    expect(fast).toBeGreaterThan(60);
  });
});
