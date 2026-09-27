import { describe, expect, it } from 'vitest';
import { shouldTriggerPocketExit } from './pocket-screen';

const CONFIG = { swipeUpHoldMinDuration_ms: 600, swipeUpMinDistance_px: 24 };

describe('shouldTriggerPocketExit (components.md 12.1 rule 2)', () => {
  it('is false when held long enough but with no upward movement (plain long-press)', () => {
    expect(shouldTriggerPocketExit(100, 100, 1000, CONFIG)).toBe(false);
  });

  it('is false when swiped up far enough but released before the hold duration', () => {
    expect(shouldTriggerPocketExit(100, 50, 300, CONFIG)).toBe(false);
  });

  it('is false when swiped the wrong direction (down) even if held long enough', () => {
    expect(shouldTriggerPocketExit(100, 150, 1000, CONFIG)).toBe(false);
  });

  it('is true only once both the hold duration and the upward distance are met', () => {
    expect(shouldTriggerPocketExit(100, 76, 600, CONFIG)).toBe(true); // 24px exactly required
    expect(shouldTriggerPocketExit(100, 77, 600, CONFIG)).toBe(false); // 23px, one short
  });

  it('accepts more movement/hold than the minimum', () => {
    expect(shouldTriggerPocketExit(500, 0, 5000, CONFIG)).toBe(true);
  });
});
