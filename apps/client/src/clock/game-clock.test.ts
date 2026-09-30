import { describe, expect, it, vi } from 'vitest';
import type { LocationProvider, MockLocationProvider } from '@keep-walking/location';
import {
  createGameClock,
  createMockGameClock,
  createWebGameClock,
  isMockProvider,
} from './game-clock';

function fakeProvider(kind: LocationProvider['kind']): LocationProvider {
  return {
    kind,
    state: 'idle',
    getPermission: () => Promise.resolve('granted'),
    start: () => Promise.resolve(),
    stop: () => undefined,
    onSample: () => () => undefined,
    onError: () => () => undefined,
    onStateChange: () => () => undefined,
  };
}

function fakeMockProvider(position: number): MockLocationProvider {
  return {
    ...fakeProvider('mock'),
    pause: () => undefined,
    resume: () => undefined,
    seek: () => undefined,
    setSpeed: () => undefined,
    position: () => position,
  } as MockLocationProvider;
}

/** A mock provider whose `position()` returns the next value of `sequence` on each call (last
 * value repeats once exhausted) — lets a test drive `provider.position()` through a real loop
 * wrap (DG6-05: rising, then dropping back toward 0) across several `now()` calls. */
function fakeMockProviderSequence(sequence: readonly number[]): MockLocationProvider {
  let i = 0;
  return {
    ...fakeProvider('mock'),
    pause: () => undefined,
    resume: () => undefined,
    seek: () => undefined,
    setSpeed: () => undefined,
    position: () => {
      const value = sequence[Math.min(i, sequence.length - 1)] ?? 0;
      i += 1;
      return value;
    },
  } as MockLocationProvider;
}

describe('isMockProvider', () => {
  it('is true only for kind "mock"', () => {
    expect(isMockProvider(fakeProvider('mock'))).toBe(true);
    expect(isMockProvider(fakeProvider('web'))).toBe(false);
    expect(isMockProvider(fakeProvider('capacitor'))).toBe(false);
  });
});

describe('createWebGameClock', () => {
  it('delegates to Date.now()', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(123);
    expect(createWebGameClock().now()).toBe(123);
    spy.mockRestore();
  });
});

describe('createMockGameClock', () => {
  it('adds the provider trace position to the replay start', () => {
    const clock = createMockGameClock(fakeMockProvider(5000), 1_700_000_000_000);
    expect(clock.now()).toBe(1_700_000_005_000);
  });

  it('keeps producing the elapsed-trace-time answer regardless of playback speed (x60 case)', () => {
    // Same trace position (5000 ms elapsed) whether it took 5s of real time (x1) or 5000/60 ms
    // (x60): the clock only ever sees position(), never the wall-clock rate it was produced at.
    const clock = createMockGameClock(fakeMockProvider(5000), 0);
    expect(clock.now()).toBe(5000);
  });

  // DG6-05 (design gate F06, P2-X47): `loop=1` restarts `position()` near 0 every lap
  // (`packages/location`'s own documented floor) — `now()` must never go backward across that,
  // even though the underlying position genuinely does (a real, intentional per-lap reset).
  describe('loop wrap (DG6-05)', () => {
    it('keeps now() monotonically increasing across a single loop wrap', () => {
      const provider = fakeMockProviderSequence([100, 500, 900, 0, 50, 100]);
      const clock = createMockGameClock(provider, 0);
      const readings = Array.from({ length: 6 }, () => clock.now());
      expect(readings).toEqual([100, 500, 900, 900, 950, 1000]);
      for (let i = 1; i < readings.length; i += 1) {
        expect(readings[i]).toBeGreaterThanOrEqual(readings[i - 1] ?? 0);
      }
    });

    it('keeps now() monotonic across two consecutive loop wraps', () => {
      const provider = fakeMockProviderSequence([800, 0, 400, 800, 0, 300]);
      const clock = createMockGameClock(provider, 1_000);
      const readings = Array.from({ length: 6 }, () => clock.now());
      expect(readings).toEqual([1_800, 1_800, 2_200, 2_600, 2_600, 2_900]);
    });

    it('never regresses even mid-lap when position briefly holds flat at the floor (the inter-lap gap)', () => {
      // packages/location's own doc comment: position() clamps a briefly-negative anchor to 0
      // for the loopGapMs gap between laps -- several 0 readings in a row must not each be read
      // as a new wrap (only a real decrease should).
      const provider = fakeMockProviderSequence([900, 0, 0, 0, 50]);
      const clock = createMockGameClock(provider, 0);
      const readings = Array.from({ length: 5 }, () => clock.now());
      expect(readings).toEqual([900, 900, 900, 900, 950]);
    });
  });
});

describe('createGameClock', () => {
  it('picks the mock clock for a mock provider', () => {
    const clock = createGameClock(fakeMockProvider(1000), 500);
    expect(clock.now()).toBe(1500);
  });

  it('picks the web clock for a web provider, ignoring replayStart_ms', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(999);
    const clock = createGameClock(fakeProvider('web'), 500);
    expect(clock.now()).toBe(999);
    spy.mockRestore();
  });
});
