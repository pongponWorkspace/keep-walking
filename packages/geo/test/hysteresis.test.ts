import { describe, expect, it } from 'vitest';
import { edgeHysteresisInit, edgeHysteresisStep, validateEdgeHysteresisParams } from '../src/index';
import type { EdgeHysteresisInput, EdgeHysteresisParams, EdgeTransition } from '../src/index';

const P: EdgeHysteresisParams = { edgeHysteresisSamples: 3, edgeHysteresis_m: 5 };
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

  it('N = 1 = distance-only hysteresis; entering uses the same rule from outside', () => {
    const p = { edgeHysteresisSamples: 1, edgeHysteresis_m: 5 };
    const { transitions } = feed([obs(1, true, 3), obs(2, true, 6)], p, 'outside');
    expect(transitions).toEqual([{ to: 'inside', since_t_ms: 2000 }]);
  });

  it('state is plain JSON', () => {
    const { state } = feed([obs(1, false, 9)], P);
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      side: 'inside',
      pendingCount: 1,
      pendingSince_t_ms: 1000,
    });
  });
});
