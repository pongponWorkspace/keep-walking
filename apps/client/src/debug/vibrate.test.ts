import { describe, expect, it, vi } from 'vitest';
import { triggerVibrate } from './vibrate';

describe('triggerVibrate', () => {
  it('reports unsupported when navigator.vibrate does not exist (iOS Safari, D-003)', () => {
    expect(triggerVibrate({}, 200)).toEqual({ supported: false, triggered: false });
  });

  it('calls navigator.vibrate with the configured pattern and reports its return value', () => {
    const vibrate = vi.fn(() => true);
    expect(triggerVibrate({ vibrate }, 200)).toEqual({ supported: true, triggered: true });
    expect(vibrate).toHaveBeenCalledWith(200);
  });

  it('reports triggered: false when the browser rejects the pattern', () => {
    const vibrate = vi.fn(() => false);
    expect(triggerVibrate({ vibrate }, 200)).toEqual({ supported: true, triggered: false });
  });
});
