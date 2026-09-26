import { describe, expect, it } from 'vitest';
import { VisibilityTracker } from './visibility-tracker';

describe('VisibilityTracker', () => {
  it('starts with zero hidden time and zero samples when created visible', () => {
    const tracker = new VisibilityTracker(false, 0);
    expect(tracker.snapshot(1000)).toEqual({
      hiddenTotalMs: 0,
      hiddenSince: undefined,
      samplesWhileHidden: 0,
      samplesWhileVisible: 0,
    });
  });

  it('accumulates hidden time between setHidden(true) and setHidden(false)', () => {
    const tracker = new VisibilityTracker(false, 0);
    tracker.setHidden(true, 1000);
    tracker.setHidden(false, 3500);
    expect(tracker.snapshot(3500).hiddenTotalMs).toBe(2500);
  });

  it('counts an open hidden span (still hidden) in snapshot() as of the given instant', () => {
    const tracker = new VisibilityTracker(false, 0);
    tracker.setHidden(true, 1000);
    expect(tracker.snapshot(4000).hiddenTotalMs).toBe(3000);
    // the open span isn't committed until setHidden(false); calling snapshot again does not double count
    tracker.setHidden(false, 4000);
    expect(tracker.snapshot(4000).hiddenTotalMs).toBe(3000);
  });

  it('tags each recordSample() call by hidden/visible at that instant', () => {
    const tracker = new VisibilityTracker(false, 0);
    tracker.recordSample(500);
    tracker.setHidden(true, 1000);
    tracker.recordSample(1500);
    tracker.recordSample(2000);
    tracker.setHidden(false, 2500);
    tracker.recordSample(3000);

    const snapshot = tracker.snapshot(3000);
    expect(snapshot.samplesWhileVisible).toBe(2);
    expect(snapshot.samplesWhileHidden).toBe(2);
  });

  it('starts already hidden when constructed that way (e.g. app opened from a locked screen)', () => {
    const tracker = new VisibilityTracker(true, 100);
    tracker.recordSample(200);
    expect(tracker.snapshot(200)).toEqual({
      hiddenTotalMs: 100,
      hiddenSince: 100,
      samplesWhileHidden: 1,
      samplesWhileVisible: 0,
    });
  });
});
