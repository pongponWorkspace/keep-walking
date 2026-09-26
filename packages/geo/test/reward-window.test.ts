import { describe, expect, it } from 'vitest';
import {
  gateDiagnosticWindows,
  passesGate,
  rewardWindowCloseThrough,
  rewardWindowInit,
  rewardWindowStep,
} from '../src/index';
import type { ClosedWindow, GeoSample, RewardWindowInput, RewardWindowState } from '../src/index';
import { DIAG, GATE, loadTrace, offset, ORIGIN, REWARD, straightWalk } from './fixtures';

/** Feeds inputs one by one, round-tripping the state through JSON every step (serializable). */
function run(inputs: RewardWindowInput[], state0?: RewardWindowState) {
  let state = state0 ?? rewardWindowInit(REWARD);
  const closed: ClosedWindow[] = [];
  for (const input of inputs) {
    const r = rewardWindowStep(
      JSON.parse(JSON.stringify(state)) as RewardWindowState,
      input,
      REWARD,
    );
    state = r.state;
    closed.push(...r.closed);
  }
  return { state, closed };
}

const active = (s: GeoSample[], tauShift_s = 0): RewardWindowInput[] =>
  s.map((sample) => ({ sample, tau_ms: sample.t_ms - tauShift_s * 1000, countable: true }));

describe('rewardWindow accumulator: parameters', () => {
  it('requires window_s to be a whole multiple of sampleCadence_s', () => {
    expect(() => rewardWindowInit({ ...REWARD, sampleCadence_s: 7 })).toThrow(RangeError);
    expect(() => rewardWindowInit({ ...REWARD, window_s: 0 })).toThrow(RangeError);
    // The reward path always carries the speed-lock pair limit (F05 3.1 item 5, P2-X03).
    const noLock = { ...REWARD, speedLock_kmh: undefined } as unknown as typeof REWARD;
    expect(() => rewardWindowInit(noLock)).toThrow(RangeError);
  });
});

describe('rewardWindow accumulator: windows', () => {
  it('non-overlapping windows (k W, (k+1) W], each closed once when a kept fix reaches its end', () => {
    const { closed, state } = run(active(straightWalk(900, 1, 1.3)));
    expect(closed.map((w) => w.k)).toEqual([0, 1, 2]);
    for (const w of closed) expect(w.distance_m).toBeCloseTo(390, 3);
    expect(state.k).toBe(3);
    expect(state.distance_m).toBe(0);
  });

  it('a grid pair counts toward the window of its end point (ADR 0003 5.3)', () => {
    const s: GeoSample[] = [];
    for (let t = 0; t <= 400; t += 1) {
      const east = t <= 295 ? 0 : t <= 300 ? t - 295 : t <= 305 ? 5 + (t - 300) : 10;
      s.push({ t_ms: t * 1000, ...offset(ORIGIN, 0, east), accuracy_m: 5 });
    }
    const { closed, state } = run(active(s));
    expect(closed).toHaveLength(1);
    expect(closed[0]?.distance_m).toBeCloseTo(5, 6); // pair (295, 300] -> window 0
    expect(state.distance_m).toBeCloseTo(5, 6); // pair (300, 305] -> window 1, still open
  });

  it('exposes the partial distance of the open window (D-059 / F05-R22)', () => {
    const { state, closed } = run(active(straightWalk(180, 1, 1)));
    expect(closed).toEqual([]);
    expect(state.distance_m).toBeCloseTo(180, 3);
  });

  it('G2 / GD B-04: a 5 min hole with a 400 m jump adds nothing; the window resumes', () => {
    const before = straightWalk(1350, 1, 1.3);
    const lastBefore = before.at(-1) as GeoSample;
    const after = straightWalk(300, 1, 1.3, { start_s: 1650, from: offset(lastBefore, 400, 0) });
    // Suspended: the window clock stopped for the 300 s hole, so tau = t - 300 afterwards.
    const { closed } = run([...active(before), ...active(after, 300)]);
    expect(closed.map((w) => w.k)).toEqual([0, 1, 2, 3, 4]);
    const w4 = closed[4] as ClosedWindow;
    // 150 s + 150 s of walking at 1.3 m/s, minus the one grid step that straddles the hole.
    expect(w4.distance_m).toBeCloseTo(390 - 6.5, 3);
    expect(w4.distance_m).toBeLessThan(400);
  });

  it('G2 slow walker: the window passes only if the counted pairs pass on their own', () => {
    const before = straightWalk(1350, 1, 0.1);
    const after = straightWalk(300, 1, 0.1, {
      start_s: 1650,
      from: offset(before.at(-1) as GeoSample, 400, 0),
    });
    const w4 = run([...active(before), ...active(after, 300)]).closed[4] as ClosedWindow;
    expect(w4.distance_m).toBeLessThan(GATE.minDistancePerWindow_m);
    expect(passesGate(w4.distance_m, GATE.minDistancePerWindow_m, GATE.comparison)).toBe(false);
  });

  it('G3: distance walked outside the polygon (clock stopped) is not counted', () => {
    const inside1 = active(straightWalk(150, 1, 1));
    const outside = straightWalk(120, 1, 1, { start_s: 151, from: offset(ORIGIN, -50, 150) }).map(
      (sample) => ({ sample, tau_ms: 150_000, countable: false }),
    );
    const inside2 = active(
      straightWalk(160, 1, 1, { start_s: 272, from: offset(ORIGIN, 0, 150) }),
      121,
    );
    const { closed } = run([...inside1, ...outside, ...inside2]);
    expect(closed).toHaveLength(1);
    // 150 m before + 150 m after, minus the grid step straddling the return: no outside metres.
    expect(closed[0]?.distance_m).toBeCloseTo(295, 3);
  });

  it('5.2 item 6b: closing on the clock equals what a late fix would have produced', () => {
    const walk = active(straightWalk(290, 1, 1));
    const a = run(walk);
    const byClock = rewardWindowCloseThrough(a.state, 300_000, REWARD);
    const late = run(
      [{ sample: { t_ms: 340_000, ...ORIGIN, accuracy_m: 5 }, tau_ms: 340_000, countable: true }],
      a.state,
    );
    expect(byClock.closed).toEqual(late.closed);
    expect(byClock.closed[0]?.distance_m).toBeCloseTo(290, 3);
  });

  it('G6: accuracy bad for the whole window gives 0 m (closed by the clock)', () => {
    const bad = active(straightWalk(300, 1, 1.3, { accuracy_m: 45 }));
    const r = run(bad);
    expect(r.closed).toEqual([]);
    expect(rewardWindowCloseThrough(r.state, 300_000, REWARD).closed).toEqual([
      { k: 0, distance_m: 0 },
    ]);
  });

  it('matches the batch pipeline (gateDiagnosticWindows filtered) on park-loop', () => {
    const s = loadTrace('synthetic-park-loop-01');
    const { closed } = run(active(s));
    const diag = gateDiagnosticWindows(s, DIAG).filter((w) => w.start_ms % 300_000 === 0);
    expect(closed.map((w) => w.distance_m)).toEqual(diag.map((w) => w.filteredDistance_m));
    expect(closed).toHaveLength(6);
  });
});
