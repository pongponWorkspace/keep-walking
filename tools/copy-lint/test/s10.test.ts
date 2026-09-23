import { describe, expect, it } from 'vitest';
import { checkS10 } from '../src/checks/s10';
import { contextFor } from './helpers';

describe('S10 — nothing from U1-U8 in onboarding.*', () => {
  it('FAILs onboarding.firstReward mentioning "ตีบวก" (U2)', () => {
    const ctx = contextFor({
      'onboarding.firstReward': {
        text: 'เก็บของไว้ตีบวกทีหลัง',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS10(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('does not check onboarding words outside the onboarding area', () => {
    const ctx = contextFor({
      'enhance.x': { text: 'ตีบวกได้แล้ว', voice: 'system', kind: 'message', context: 'x' },
    });
    expect(checkS10(ctx)).toEqual([]);
  });

  it('passes a clean onboarding message', () => {
    const ctx = contextFor({
      'onboarding.intro': {
        text: 'กรุงเทพฯ กำลังมีปัญหา',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS10(ctx)).toEqual([]);
  });
});
