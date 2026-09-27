// @vitest-environment happy-dom
/**
 * R2-01 (tech gate P2-F05-T15, closed P2-F06-T10): proves the Mock game clock
 * (`clock/game-clock.ts#createMockGameClock`) and the provider's own first `LocationSample.
 * timestamp` (`@keep-walking/location`'s real `MockTraceLocationProvider`, not a stub) agree to
 * within `config: dungeons.runState.clockSkewTolerance_s` — and, more precisely, that the fix
 * (lazy offset capture) keeps the skew near zero even when real wall-clock time elapses between
 * constructing this clock and `provider.start()` actually running, the exact gap the previous,
 * eager-offset shape of this function used to leak into every sample's timestamp.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMockLocationProvider } from '@keep-walking/location';
import type { GpsTrace } from '@keep-walking/shared';
import { createMockOffsetClock } from './mock-offset-clock';
import { createGameClock } from './game-clock';
import { balanceRunStateConfig } from '../config/balance';

const TRACE: GpsTrace = {
  format: 'keep-walking.gps-trace',
  formatVersion: 1,
  meta: { id: 'e2e-mock-offset-clock-test', kind: 'synthetic', timeBase: 'relative-ms' },
  samples: [
    { t: 0, lat: 13.7563, lng: 100.5018, accuracy: 10 },
    { t: 1000, lat: 13.7564, lng: 100.5019, accuracy: 10 },
  ],
};

const SETUP_DELAY_MS = 750;

describe('createMockOffsetClock', () => {
  it('agrees with the game clock at the first sample, within clockSkewTolerance_s, despite setup delay before start()', async () => {
    vi.useFakeTimers();
    try {
      const targetMs = Date.UTC(2026, 0, 1, 0, 0, 0);
      vi.setSystemTime(1_000_000);
      const clock = createMockOffsetClock(targetMs);

      // The real gap R2-01 flagged: wall-clock time spent on setup (trace fetch, HUD mount, ...)
      // between constructing this clock and the provider's own `start()` actually running.
      vi.setSystemTime(1_000_000 + SETUP_DELAY_MS);

      const provider = createMockLocationProvider({ trace: TRACE, clock, speed: 1 });
      let firstSampleTimestamp: number | undefined;
      provider.onSample((sample) => {
        firstSampleTimestamp ??= sample.timestamp;
      });
      void provider.start();
      await vi.advanceTimersByTimeAsync(0);

      const gameClock = createGameClock(provider, targetMs);
      expect(firstSampleTimestamp).toBeDefined();
      const skew_ms = Math.abs((firstSampleTimestamp as number) - gameClock.now());
      expect(skew_ms).toBeLessThanOrEqual(balanceRunStateConfig.clockSkewTolerance_s * 1000);
      // The fix's own point: the two clocks share one reference point, so the skew is near zero —
      // not merely under the (much larger) tolerance the pre-fix shape also happened to clear.
      expect(skew_ms).toBeLessThan(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it('caches the offset from the first call, so a later real-clock advance still tracks it exactly', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(5_000_000);
      const clock = createMockOffsetClock(10_000_000);
      expect(clock.now()).toBe(10_000_000);
      vi.setSystemTime(5_000_500);
      expect(clock.now()).toBe(10_000_500);
    } finally {
      vi.useRealTimers();
    }
  });
});
