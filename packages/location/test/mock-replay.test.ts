/**
 * Trace-replay test (P1-F02-T05, TC-LOC-01/04/05/06): every committed synthetic trace replayed
 * through the Mock with a fake Clock. Checks count, order, timestamps, emission time, payload,
 * state transitions and errors against a trace -> expected table.
 */
import { describe, expect, it } from 'vitest';
import type { GpsTrace, LocationSample } from '@keep-walking/shared';
import type { LocationError, LocationProviderState } from '../src/types';
import { createMockLocationProvider } from '../src/mock/mock-provider';
import { FakeClock, FakeVisibility, readTrace, syntheticTraceIds } from './helpers';

interface Expected {
  delivered: number;
  finalState: LocationProviderState;
  /** State changes after start as `state@traceTimeMs`. */
  states: string[];
  /** Errors as `code@traceTimeMs:fatal|nonfatal`. */
  errors: string[];
}

const SPEED = 60;

/** `name@traceMs` → `name@clockMs`: something due at trace t fires at clock ceil(t / speed). */
function toClock(entries: string[]): string[] {
  return entries.map((entry) => {
    const [head = '', tail = ''] = entry.split('@');
    const [t = '0', ...rest] = tail.split(':');
    return [`${head}@${Math.ceil(Number(t) / SPEED)}`, ...rest].join(':');
  });
}

/** Traces without events: every sample delivered, no error, stays running. */
function plain(trace: GpsTrace): Expected {
  return {
    delivered: trace.samples.length,
    finalState: 'running',
    states: ['starting@0', 'running@0'],
    errors: [],
  };
}

const EXPECTED: Record<string, (trace: GpsTrace) => Expected> = {
  'synthetic-screen-lock-01': () => ({
    delivered: 601,
    finalState: 'running',
    states: ['starting@0', 'running@0', 'suspended@240000', 'running@360000'],
    errors: ['position-unavailable@500000:nonfatal', 'timeout@520000:nonfatal'],
  }),
  'synthetic-permission-denied-01': () => ({
    delivered: 60,
    finalState: 'error',
    states: ['starting@0', 'running@0', 'error@60000'],
    errors: ['permission-denied@60000:fatal'],
  }),
  'synthetic-soi-occluded-01': (trace) => ({
    delivered: trace.samples.length,
    finalState: 'running',
    states: ['starting@0', 'running@0'],
    errors: ['timeout@120000:nonfatal', 'position-unavailable@300000:nonfatal'],
  }),
};

interface Replay {
  t0: number;
  samples: LocationSample[];
  emittedAt: number[];
  states: string[];
  errors: string[];
  finalState: LocationProviderState;
  virtualMs: number;
}

async function replay(trace: GpsTrace, speed: 1 | 10 | 60): Promise<Replay> {
  const clock = new FakeClock();
  const t0 = clock.now();
  const provider = createMockLocationProvider({
    trace,
    speed,
    clock,
    visibility: new FakeVisibility(),
  });
  const samples: LocationSample[] = [];
  const emittedAt: number[] = [];
  const states: string[] = [];
  const errors: string[] = [];
  // Recorded in clock ms since start; the table is in trace ms and converted by toClock().
  const traceTime = (): number => clock.now() - t0;
  provider.onSample((s) => {
    samples.push(s);
    emittedAt.push(clock.now());
  });
  provider.onStateChange((s) => states.push(`${s}@${traceTime()}`));
  provider.onError((e: LocationError) =>
    errors.push(`${e.code}@${traceTime()}:${e.fatal ? 'fatal' : 'nonfatal'}`),
  );
  await provider.start();
  const virtualMs = clock.runUntilIdle();
  return { t0, samples, emittedAt, states, errors, finalState: provider.state, virtualMs };
}

describe('Mock trace replay: every synthetic trace (speed x60, fake clock)', () => {
  const ids = syntheticTraceIds();

  it('finds all 13 synthetic traces and each passes validateTrace', () => {
    expect(ids).toHaveLength(13);
    for (const id of ids) expect(() => readTrace(id)).not.toThrow();
  });

  it.each(ids)('%s → expected count, order, timestamps, states, errors', async (id) => {
    const trace = readTrace(id);
    const expected = (EXPECTED[id] ?? plain)(trace);
    const r = await replay(trace, SPEED);

    expect(r.samples).toHaveLength(expected.delivered);
    expect(r.finalState).toBe(expected.finalState);
    expect(r.states).toEqual(toClock(expected.states));
    expect(r.errors).toEqual(toClock(expected.errors));

    const byT = new Map(trace.samples.map((s) => [s.t, s]));
    let previous = Number.NEGATIVE_INFINITY;
    for (const [i, sample] of r.samples.entries()) {
      const t = sample.timestamp - r.t0;
      const source = byT.get(t);
      expect(source, `sample ${i} maps to trace t`).toBeDefined();
      // Payload unchanged (low accuracy passes through untouched, e.g. warm-up 150 m).
      expect(sample).toEqual({
        timestamp: r.t0 + t,
        lat: source?.lat,
        lng: source?.lng,
        accuracy: source?.accuracy,
        ...(source?.speed === undefined ? {} : { speed: source.speed }),
        ...(source?.heading === undefined ? {} : { heading: source.heading }),
      });
      expect(sample.timestamp).toBeGreaterThan(previous);
      previous = sample.timestamp;
      // Emitted exactly when trace time reaches t at x60.
      expect(r.emittedAt[i]).toBe(r.t0 + Math.ceil(t / SPEED));
    }
  });

  it('screen-lock: nothing from the hidden window is delivered, not even later', async () => {
    const r = await replay(readTrace('synthetic-screen-lock-01'), SPEED);
    const hidden = r.samples.filter(
      (s) => s.timestamp - r.t0 >= 240_000 && s.timestamp - r.t0 < 360_000,
    );
    expect(hidden).toHaveLength(0);
    expect(r.samples.some((s) => s.timestamp - r.t0 === 360_000)).toBe(true);
  });

  it('permission-denied: no sample after the event and no retry (no timers left)', async () => {
    const r = await replay(readTrace('synthetic-permission-denied-01'), SPEED);
    expect(Math.max(...r.samples.map((s) => s.timestamp - r.t0))).toBe(59_000);
    expect(r.errors).toHaveLength(1);
  });

  it('warmup-accuracy: first sample keeps accuracy 150 m (provider does not filter)', async () => {
    const r = await replay(readTrace('synthetic-warmup-accuracy-01'), SPEED);
    expect(r.samples[0]?.accuracy).toBe(150);
    expect(r.samples).toHaveLength(301);
  });

  it('30-minute park loop replays in well under a second of wall time', async () => {
    const started = performance.now();
    const r = await replay(readTrace('synthetic-park-loop-01'), 1);
    expect(r.virtualMs).toBe(1_800_000);
    expect(r.samples).toHaveLength(1801);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
