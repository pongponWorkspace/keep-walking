/**
 * Mock playback controls (TC-LOC-02/03): speed, pause/resume, seek, loop, page visibility,
 * restart, re-entrancy, and trace loading through validateTrace (tech note F12).
 */
import { describe, expect, it } from 'vitest';
import type { GpsTrace, LocationSample } from '@keep-walking/shared';
import type { LocationProviderState } from '../src/types';
import { InvalidTraceError, loadTrace } from '../src/mock/load-trace';
import { createMockLocationProvider } from '../src/mock/mock-provider';
import { FakeClock, FakeVisibility, makeTrace, readTrace } from './helpers';

function setup(trace: GpsTrace, opts: { speed?: 1 | 10 | 60; loop?: boolean } = {}) {
  const clock = new FakeClock();
  const visibility = new FakeVisibility();
  const provider = createMockLocationProvider({ trace, clock, visibility, ...opts });
  const samples: LocationSample[] = [];
  const states: LocationProviderState[] = [];
  provider.onSample((s) => samples.push(s));
  provider.onStateChange((s) => states.push(s));
  const traceTimes = (): number[] => samples.map((s) => s.timestamp - clock.t0);
  return { clock, visibility, provider, samples, states, traceTimes };
}

describe('speed (TC-LOC-02)', () => {
  it.each([1, 10, 60] as const)('x%i: clock time to finish ∝ 1/speed', async (speed) => {
    const trace = readTrace('synthetic-screen-lock-01');
    const { clock, provider, samples } = setup(trace, { speed });
    await provider.start();
    const used = clock.runUntilIdle();
    expect(used).toBe(Math.ceil(720_000 / speed));
    expect(samples).toHaveLength(601);
    expect(provider.ended).toBe(true);
    expect(provider.position()).toBe(720_000);
  });

  it('setSpeed mid-play keeps position and changes the rate', async () => {
    const { clock, provider, traceTimes } = setup(makeTrace(101));
    await provider.start();
    clock.advance(10_000);
    expect(provider.position()).toBe(10_000);
    provider.setSpeed(10);
    clock.advance(1_000);
    expect(provider.position()).toBe(20_000);
    expect(traceTimes().at(-1)).toBe(20_000);
  });

  it('rejects a non-positive speed', () => {
    expect(() => createMockLocationProvider({ trace: makeTrace(3), speed: 0 as 1 })).toThrow(
      RangeError,
    );
  });
});

describe('pause / resume / seek / loop (TC-LOC-03)', () => {
  it('pause stops delivery; resume continues from the same point', async () => {
    const { clock, provider, samples, traceTimes } = setup(makeTrace(20));
    await provider.start();
    clock.advance(5_000);
    expect(samples).toHaveLength(6);
    provider.pause();
    clock.advance(60_000);
    expect(samples).toHaveLength(6);
    expect(provider.position()).toBe(5_000);
    provider.resume();
    clock.advance(1_000);
    expect(traceTimes().slice(-2)).toEqual([5_000, 6_000]);
  });

  it('seek jumps to the nearest sample and plays on from there', async () => {
    const trace = makeTrace(11, 10_000);
    const { clock, provider, traceTimes } = setup(trace);
    await provider.start();
    clock.advance(0);
    provider.seek(64_000);
    expect(provider.position()).toBe(60_000);
    clock.advance(10_000);
    expect(traceTimes()).toEqual([0, 60_000, 70_000]);
    provider.seek(66_000);
    expect(provider.position()).toBe(70_000);
    provider.seek(Number.MAX_SAFE_INTEGER);
    expect(provider.position()).toBe(100_000);
  });

  it('backward seek keeps timestamps strictly increasing', async () => {
    const { clock, provider, samples } = setup(makeTrace(10));
    await provider.start();
    clock.advance(5_000);
    provider.seek(0);
    clock.advance(3_000);
    const ts = samples.map((s) => s.timestamp);
    for (let i = 1; i < ts.length; i += 1) expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 0);
    // Shift = one loop gap (1 s) after the last produced timestamp.
    expect(ts[6]).toBe((ts[5] ?? 0) + 1_000);
  });

  it('seek before start sets the start point (first fix is stamped with the start time)', async () => {
    const trace = makeTrace(10);
    const { clock, provider, samples, traceTimes } = setup(trace);
    provider.seek(7_000);
    await provider.start();
    clock.runUntilIdle();
    expect(samples.map((s) => s.lat)).toEqual(trace.samples.slice(7).map((s) => s.lat));
    expect(traceTimes()).toEqual([0, 1_000, 2_000]);
  });

  it('loop restarts at the first sample after the last, timestamps keep rising', async () => {
    const trace = makeTrace(3, 1_000);
    const { clock, provider, samples } = setup(trace, { loop: true });
    await provider.start();
    clock.advance(6_000);
    expect(samples.map((s) => s.lat)).toEqual([
      13.73, 13.73001, 13.73002, 13.73, 13.73001, 13.73002, 13.73,
    ]);
    expect(samples.map((s) => s.timestamp - clock.t0)).toEqual([
      0, 1_000, 2_000, 3_000, 4_000, 5_000, 6_000,
    ]);
    expect(provider.ended).toBe(false);
  });

  it('loop replays trace events every lap', async () => {
    const trace = makeTrace(4, 1_000, [{ t: 2_000, type: 'timeout' }]);
    const { clock, provider } = setup(trace, { loop: true });
    const errors: string[] = [];
    provider.onError((e) => errors.push(e.code));
    await provider.start();
    clock.advance(4_000 * 3 - 1);
    expect(errors).toEqual(['timeout', 'timeout', 'timeout']);
  });
});

describe('page visibility, errors and restart', () => {
  it('real page hidden → suspended, samples dropped not buffered; visible → running', async () => {
    const { clock, visibility, provider, states, traceTimes } = setup(makeTrace(20));
    await provider.start();
    clock.advance(3_000);
    visibility.set(false);
    expect(provider.state).toBe('suspended');
    clock.advance(5_000);
    visibility.set(true);
    clock.advance(2_000);
    expect(traceTimes()).toEqual([0, 1_000, 2_000, 3_000, 9_000, 10_000]);
    expect(states).toEqual(['starting', 'running', 'suspended', 'running']);
  });

  it('starts suspended when the page is already hidden', async () => {
    const { visibility, provider } = setup(makeTrace(5));
    visibility.set(false);
    await provider.start();
    expect(provider.state).toBe('suspended');
  });

  it('trace hidden + page hidden: stays suspended until both are visible', async () => {
    const trace = makeTrace(10, 1_000, [
      { t: 2_000, type: 'visibility-hidden' },
      { t: 5_000, type: 'visibility-visible' },
    ]);
    const { clock, visibility, provider, traceTimes } = setup(trace);
    await provider.start();
    clock.advance(3_000);
    visibility.set(false);
    clock.advance(3_000);
    expect(provider.state).toBe('suspended');
    visibility.set(true);
    clock.runUntilIdle();
    expect(traceTimes()).toEqual([0, 1_000, 7_000, 8_000, 9_000]);
  });

  it('permission-denied: getPermission reports denied; start() again replays from 0', async () => {
    const trace = makeTrace(5, 1_000, [{ t: 2_000, type: 'permission-denied' }]);
    const { clock, provider, samples } = setup(trace);
    await provider.start();
    clock.runUntilIdle();
    expect(provider.state).toBe('error');
    expect(await provider.getPermission()).toBe('denied');
    expect(clock.pending).toBe(0);
    await provider.start();
    expect(await provider.getPermission()).toBe('granted');
    clock.runUntilIdle();
    expect(samples).toHaveLength(4);
    const ts = samples.map((s) => s.timestamp);
    expect(ts[2]).toBeGreaterThan(ts[1] ?? 0);
  });

  it('stop() is idempotent, cancels timers, and start() resumes after the last sample', async () => {
    const { clock, provider, samples, states } = setup(makeTrace(10));
    await provider.start();
    clock.advance(2_500);
    provider.stop();
    provider.stop();
    expect(clock.pending).toBe(0);
    expect(states.filter((s) => s === 'stopped')).toHaveLength(1);
    clock.advance(60_000);
    expect(samples).toHaveLength(3);
    await provider.start();
    clock.runUntilIdle();
    expect(samples.map((s) => s.lat)).toEqual(makeTrace(10).samples.map((s) => s.lat));
  });

  it('a listener may call pause/seek/stop during delivery without breaking the schedule', async () => {
    const { clock, provider, samples } = setup(makeTrace(10));
    provider.onSample((s) => {
      if (samples.length === 3) provider.pause();
      if (s.lat === 13.73009) provider.stop();
    });
    await provider.start();
    clock.advance(10_000);
    expect(samples).toHaveLength(3);
    provider.resume();
    clock.runUntilIdle();
    expect(samples).toHaveLength(10);
    expect(provider.state).toBe('stopped');
  });

  it('a throwing listener does not stop other listeners or the replay', async () => {
    const { clock, provider, samples } = setup(makeTrace(3));
    provider.onSample(() => {
      throw new Error('listener bug');
    });
    const swallowed: unknown[] = [];
    const onUnhandled = (e: unknown): void => void swallowed.push(e);
    process.on('uncaughtException', onUnhandled);
    await provider.start();
    clock.runUntilIdle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('uncaughtException', onUnhandled);
    expect(samples).toHaveLength(3);
    // The error is not swallowed: it resurfaces asynchronously (visible in the console).
    expect(swallowed).toHaveLength(3);
  });
});

describe('trace loading through validateTrace (F12)', () => {
  it('loadTrace returns ok with the trace for a valid file', () => {
    const result = loadTrace(makeTrace(3));
    expect(result.ok).toBe(true);
  });

  it('loadTrace returns the first error path/code without throwing', () => {
    const bad = { ...makeTrace(3), samples: [{ t: 5, lat: 13.7, lng: 100.5, accuracy: 5 }] };
    const result = loadTrace(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.summary).toMatch(/^\/samples \w/);
  });

  it('createMockLocationProvider throws InvalidTraceError for an invalid trace', () => {
    const bad = { ...makeTrace(3), meta: { id: 'X', kind: 'synthetic', timeBase: 'relative-ms' } };
    expect(() => createMockLocationProvider({ trace: bad as GpsTrace })).toThrow(InvalidTraceError);
  });

  it('passes validation options through (recorded trace below the trim minimum)', () => {
    const recorded = {
      ...makeTrace(3),
      meta: {
        id: 'recorded-unit-01',
        kind: 'recorded',
        timeBase: 'relative-ms',
        sanitized: { trimStart_m: 10, trimEnd_m: 10, coordinateDecimals: 5 },
      },
    } as GpsTrace;
    expect(() => createMockLocationProvider({ trace: recorded })).not.toThrow();
    expect(() =>
      createMockLocationProvider({ trace: recorded, validation: { minTrim_m: 200 } }),
    ).toThrow(InvalidTraceError);
  });
});
