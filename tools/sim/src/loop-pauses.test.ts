// P2-H47: the pause cases of run-loop.json keep every active-time field of the same run without
// pauses (resume, never reset), and hp-recovery.json keeps the regen/duration consistency rule.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VECTOR_DIR } from './vector-files';
import { loadBalanceConfig } from './config';
import { pauseProblems } from './loop-pauses';
import { regenConfigProblems, regenParamsFromConfig } from './regen';

interface V {
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}
const runLoop = (
  JSON.parse(readFileSync(`${VECTOR_DIR}run-loop.json`, 'utf8')) as { vectors: V[] }
).vectors.filter((v) => v.input['fn'] === 'runLoop');

function withoutPauseFields(e: Record<string, unknown>): unknown {
  const rest: Record<string, unknown> = { ...e };
  delete rest['pauses'];
  delete rest['paused_s'];
  delete rest['realEnd_s'];
  const ev =
    (e['events'] as Record<string, unknown>[] | null)?.map((x) => {
      const y = { ...x };
      delete y['at_s'];
      return y;
    }) ?? null;
  return { ...rest, events: ev };
}

describe('runLoop with pauses (tech note F06 13.5)', () => {
  const paused = runLoop.filter((v) => v.input['pauses'] !== undefined);
  it('has pause cases', () => expect(paused.length).toBeGreaterThan(0));
  for (const pv of paused) {
    it(`seed ${String(pv.input['runSeed'])}: tau fields equal the no-pause case`, () => {
      const plainInput: Record<string, unknown> = { ...pv.input };
      delete plainInput['pauses'];
      delete plainInput['pauseParams'];
      const plain = runLoop.find(
        (v) =>
          v.input['pauses'] === undefined && JSON.stringify(v.input) === JSON.stringify(plainInput),
      );
      expect(plain).toBeDefined();
      expect(withoutPauseFields(pv.expected)).toEqual(plain?.expected);
      expect(pv.expected['realEnd_s']).toBeCloseTo(
        (pv.expected['end_s'] as number) + (pv.expected['paused_s'] as number),
      );
    });
  }
  it('rejects an outside period longer than suspendedMax_s (timeout, not a pause)', () => {
    const pp = { graceMax_s: 180, suspendedMax_s: 900 };
    expect(pauseProblems([{ atTau_s: 10, duration_s: 901 }], pp)).toHaveLength(1);
    expect(pauseProblems([{ atTau_s: 10, duration_s: 900 }], pp)).toHaveLength(0);
  });
});

describe('hp recovery config', () => {
  it('regen rate reproduces deathRecoveryDuration_s within 1 s', () => {
    expect(regenConfigProblems(regenParamsFromConfig(loadBalanceConfig()))).toEqual([]);
  });
});
