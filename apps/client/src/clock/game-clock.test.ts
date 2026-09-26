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
