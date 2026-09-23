import { describe, expect, it } from 'vitest';
import { checkS14 } from '../src/checks/s14';
import { contextFor } from './helpers';

describe('S14 — death/raidFail/enhanceFail need exactly 2 alts', () => {
  it('FAILs a death beat with no alts', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
      },
    });
    expect(checkS14(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs a death beat with only 1 alt', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['a'],
      },
    });
    expect(checkS14(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes a death beat with exactly 2 alts', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['a', 'b'],
      },
    });
    expect(checkS14(ctx)).toEqual([]);
  });

  it('does not require alts for hpLow/autoRetreat', () => {
    const ctx = contextFor({
      'run.hpLow': {
        text: 'HP ต่ำ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'hpLow',
      },
    });
    expect(checkS14(ctx)).toEqual([]);
  });
});
