import { describe, expect, it } from 'vitest';
import { FpsAccumulator } from './fps-sampler';

describe('FpsAccumulator', () => {
  it('reports undefined stats before any frame is recorded', () => {
    const acc = new FpsAccumulator(1000, 5);
    expect(acc.stats()).toEqual({ avg: undefined, lowPercentile: undefined, movingTimeS: 0 });
  });

  it('ignores frames while inactive (map not moving)', () => {
    const acc = new FpsAccumulator(1000, 5);
    acc.recordFrame(16, false);
    expect(acc.stats().movingTimeS).toBe(0);
  });

  it('drops a frame gap over fpsMaxFrameGap_ms (page was hidden)', () => {
    const acc = new FpsAccumulator(1000, 5);
    acc.recordFrame(16, true);
    acc.recordFrame(5000, true); // tab was backgrounded between frames
    acc.recordFrame(16, true);
    const stats = acc.stats();
    expect(stats.movingTimeS).toBeCloseTo(0.032, 5);
  });

  it('computes avg fps as frame count over moving time, and a low percentile', () => {
    const acc = new FpsAccumulator(1000, 5);
    // 60 fps steady for 10 frames (16.667 ms each).
    for (let i = 0; i < 10; i++) {
      acc.recordFrame(1000 / 60, true);
    }
    const stats = acc.stats();
    expect(stats.avg).toBeCloseTo(60, 0);
    expect(stats.lowPercentile).toBeCloseTo(60, 0);
  });
});
