import { describe, expect, it } from 'vitest';
import {
  edgeHysteresisDropStale,
  edgeHysteresisFeed,
  edgeHysteresisInit,
  edgeHysteresisStep,
  edgeHysteresisTransitions,
  validateEdgeHysteresisGapParams,
  validateEdgeHysteresisParams,
} from '../src/index';
import type {
  EdgeHysteresisGapParams,
  EdgeHysteresisInput,
  EdgeHysteresisParams,
  EdgeTransition,
} from '../src/index';

const P: EdgeHysteresisParams = { edgeHysteresisSamples: 3, edgeHysteresis_m: 5 };
const G: EdgeHysteresisParams & EdgeHysteresisGapParams = { ...P, maxSamplePairGap_s: 30 };
const obs = (t_s: number, inside: boolean, d: number): EdgeHysteresisInput => ({
  t_ms: t_s * 1000,
  inside,
  boundaryDistance_m: d,
});

function feed(
  inputs: EdgeHysteresisInput[],
  p: EdgeHysteresisParams,
  start: 'inside' | 'outside' = 'inside',
) {
  let state = edgeHysteresisInit(start);
  const transitions: EdgeTransition[] = [];
  for (const o of inputs) {
    const r = edgeHysteresisStep(state, o, p);
    state = r.state;
    if (r.transition) transitions.push(r.transition);
  }
  return { state, transitions };
}

describe('edge hysteresis (F04-R15)', () => {
  it('rejects invalid parameters (no defaults)', () => {
    expect(() =>
      validateEdgeHysteresisParams({ edgeHysteresisSamples: 0, edgeHysteresis_m: 5 }),
    ).toThrow();
    expect(() =>
      validateEdgeHysteresisParams({ edgeHysteresisSamples: 3, edgeHysteresis_m: -1 }),
    ).toThrow();
  });

  it('confirms an exit after N fixes beyond the band, back-dated to the first (F04-R14)', () => {
    const { transitions, state } = feed(
      [obs(0, true, 20), obs(1, false, 6), obs(2, false, 8), obs(3, false, 9)],
      P,
    );
    expect(transitions).toEqual([{ to: 'outside', since_t_ms: 1000 }]);
    expect(state.side).toBe('outside');
  });

  it('a fix back on the current side resets the run', () => {
    const { transitions } = feed(
      [obs(1, false, 9), obs(2, false, 9), obs(3, true, 1), obs(4, false, 9), obs(5, false, 9)],
      P,
    );
    expect(transitions).toEqual([]);
  });

  it('fixes on the other side inside the band are neutral: they neither count nor reset', () => {
    const { transitions } = feed(
      [obs(1, false, 9), obs(2, false, 2), obs(3, false, 9), obs(4, false, 9)],
      P,
    );
    expect(transitions).toEqual([{ to: 'outside', since_t_ms: 1000 }]);
  });

  it('band 0 = every fix on the other side counts (count-only hysteresis)', () => {
    const { transitions } = feed([obs(1, false, 0.5), obs(2, false, 0.5), obs(3, false, 0.5)], {
      ...P,
      edgeHysteresis_m: 0,
    });
    expect(transitions).toHaveLength(1);
  });

  it('N = 1 = distance-only; entering uses the same rule; band fix opens the run (D-103)', () => {
    const p = { edgeHysteresisSamples: 1, edgeHysteresis_m: 5 };
    const { transitions } = feed([obs(1, true, 3), obs(2, true, 6)], p, 'outside');
    expect(transitions).toEqual([{ to: 'inside', since_t_ms: 1000 }]);
  });

  it('back-dates to the FIRST opposite fix, band fixes included (D-103, F04 5.2)', () => {
    const { transitions } = feed(
      [obs(0, true, 9), obs(1, false, 2), obs(2, false, 4), obs(3, false, 9), obs(4, false, 9)],
      { ...P, edgeHysteresisSamples: 2 },
    );
    expect(transitions).toEqual([{ to: 'outside', since_t_ms: 1000 }]);
  });

  it('band fixes alone never confirm, however many (count AND distance, D-103)', () => {
    const inputs = Array.from({ length: 50 }, (_, i) => obs(i, false, 4.9));
    expect(feed(inputs, P).transitions).toEqual([]);
  });

  it('a fix on the confirmed side inside the band still resets the run', () => {
    const { transitions } = feed(
      [obs(1, false, 9), obs(2, false, 9), obs(3, true, 0.5), obs(4, false, 9)],
      P,
    );
    expect(transitions).toEqual([]);
  });

  it('state is plain JSON', () => {
    const { state } = feed([obs(1, false, 9)], P);
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      side: 'inside',
      pendingCount: 1,
      pendingSince_t_ms: 1000,
      last_t_ms: 1000,
    });
  });
});

describe('pair gap drops the pending run (D-104, F04 5.2)', () => {
  it('rejects an invalid gap parameter', () => {
    expect(() => validateEdgeHysteresisGapParams({ maxSamplePairGap_s: 0 })).toThrow();
    expect(() =>
      edgeHysteresisTransitions([], 'inside', { ...G, maxSamplePairGap_s: -1 }),
    ).toThrow();
  });

  it('a gap > maxSamplePairGap_s between usable fixes restarts the run at the later fix', () => {
    const inputs = [obs(0, false, 9), obs(1, false, 9), obs(40, false, 9), obs(41, false, 9)];
    expect(edgeHysteresisTransitions(inputs, 'inside', G)).toEqual([]);
    const more = [...inputs, obs(42, false, 9)];
    expect(edgeHysteresisTransitions(more, 'inside', G)).toEqual([
      { to: 'outside', since_t_ms: 40_000 },
    ]);
  });

  it('a gap of exactly maxSamplePairGap_s keeps the run (strictly greater drops)', () => {
    const inputs = [obs(0, false, 9), obs(1, false, 9), obs(31, false, 9)];
    expect(edgeHysteresisTransitions(inputs, 'inside', G)).toEqual([
      { to: 'outside', since_t_ms: 0 },
    ]);
  });

  it('a half-built return run does not survive an app closure (tick with now_ms)', () => {
    let s = edgeHysteresisInit('outside', 0);
    s = edgeHysteresisFeed(s, obs(1, true, 9), G).state;
    s = edgeHysteresisFeed(s, obs(2, true, 9), G).state;
    expect(s.pendingSince_t_ms).toBe(1000);
    const later = edgeHysteresisDropStale(s, 20 * 60 * 1000, G);
    expect(later).toEqual({
      side: 'outside',
      pendingCount: 0,
      pendingSince_t_ms: null,
      last_t_ms: 2000,
    });
    expect(edgeHysteresisDropStale(s, 32_000, G)).toBe(s);
  });

  it('edgeHysteresisStep alone has no gap rule (callers that apply it themselves)', () => {
    let s = edgeHysteresisInit('inside');
    for (const t of [0, 1, 100]) s = edgeHysteresisStep(s, obs(t, false, 9), P).state;
    expect(s.side).toBe('outside');
  });
});
