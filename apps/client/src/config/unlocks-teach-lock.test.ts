import { describe, expect, it } from 'vitest';
import { isOnboardingSystemLocked } from './unlocks-teach-lock';
import { balanceLockedSystemIds } from './balance';

describe('isOnboardingSystemLocked', () => {
  it('locks a real config unlockId while firstRewardDone is false', () => {
    const someId = balanceLockedSystemIds[0];
    expect(someId).toBeDefined();
    expect(isOnboardingSystemLocked(someId as string, { firstRewardDone: false })).toBe(true);
  });

  it('never locks once firstRewardDone is true', () => {
    for (const id of balanceLockedSystemIds) {
      expect(isOnboardingSystemLocked(id, { firstRewardDone: true })).toBe(false);
    }
  });

  it('never locks an id outside the config list (e.g. the NPC shop, or a typo)', () => {
    expect(isOnboardingSystemLocked('NPC', { firstRewardDone: false })).toBe(false);
    expect(isOnboardingSystemLocked('not-a-real-id', { firstRewardDone: false })).toBe(false);
  });
});
