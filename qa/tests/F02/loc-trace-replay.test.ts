/**
 * TC-LOC-01 .. TC-LOC-10 (qa/plans/F02-test-plan.md section 4.1) — black-box trace-replay of
 * @keep-walking/location against the public interface only (TL-S04). No dev unit test is
 * imported or modified; see qa/tests/F02/support.ts for QA's own test doubles.
 */
import { describe, expect, it } from 'vitest';
import { validateTrace } from '@keep-walking/shared';
import type { GpsTrace } from '@keep-walking/shared';
import {
  MockTraceLocationProvider,
  WebLocationProvider,
  CapacitorLocationProvider,
} from '@keep-walking/location';
import {
  QaFakeClock,
  QaFakeGeolocation,
  QaFakeVisibility,
  gateWindows,
  readAllRepoTraces,
  readQaTrace,
  readSyntheticTrace,
} from './support';

function tinyTrace(overrides: Partial<GpsTrace> = {}): GpsTrace {
  const base = {
    format: 'keep-walking.gps-trace',
    formatVersion: 1,
    meta: { id: 'qa-loc-unit-trace', kind: 'qa', timeBase: 'relative-ms' },
    samples: Array.from({ length: 6 }, (_, i) => ({
      t: i * 1000,
      lat: 13.73 + i * 0.00001,
      lng: 100.54,
      accuracy: 5,
    })),
  };
  return { ...base, ...overrides } as GpsTrace;
}

function validated(json: unknown): GpsTrace {
  const result = validateTrace(json);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.trace;
}

describe('TC-LOC-10 — validateTrace passes on every committed trace file', () => {
  it('every *.trace.json under data/gps-traces/{synthetic,qa,recorded} is ok:true', () => {
    const traces = readAllRepoTraces();
    expect(traces.length).toBeGreaterThan(0);
    const failures = traces
      .map((t) => ({ id: t.id, kind: t.kind, result: validateTrace(t.json) }))
      .filter((t) => !t.result.ok);
    expect(failures).toEqual([]);
  });
});

describe('TC-LOC-01 — replay drops exactly the visibility-hidden window, keeps order', () => {
  it('synthetic-screen-lock-01: delivers 601 of 721 samples, timestamps strictly increasing', () => {
    const trace = validated(readSyntheticTrace('synthetic-screen-lock-01'));
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 60, clock });
    const timestamps: number[] = [];
    provider.onSample((s) => timestamps.push(s.timestamp));
    void provider.start();
    clock.runUntilIdle();
    expect(timestamps.length).toBe(601);
    for (let i = 1; i < timestamps.length; i += 1) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1] as number);
    }
  });
});

describe('TC-LOC-02 — replay wall-clock time is proportional to 1/speed', () => {
  it.each([1, 10, 60] as const)(
    'speed=%i finishes only once virtual time reaches duration/speed',
    (speed) => {
      const trace = validated(readSyntheticTrace('synthetic-warmup-accuracy-01')); // duration 300000 ms
      const duration = trace.samples.at(-1)?.t ?? 0;
      const clock = new QaFakeClock();
      const provider = new MockTraceLocationProvider({ trace, speed, clock });
      let delivered = 0;
      provider.onSample(() => {
        delivered += 1;
      });
      void provider.start();
      const expectedMs = Math.ceil(duration / speed);
      clock.advance(Math.max(0, expectedMs - 200));
      expect(delivered).toBeLessThan(trace.samples.length);
      clock.advance(400);
      expect(delivered).toBe(trace.samples.length);
    },
  );
});

describe('TC-LOC-03 — pause/resume/seek/loop playback controls', () => {
  it('pause() stops delivery, resume() continues from the same position', () => {
    const trace = tinyTrace();
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 1, clock });
    const seen: number[] = [];
    provider.onSample((s) => seen.push(s.timestamp));
    void provider.start();
    clock.advance(2500); // samples at t=0,1000,2000 delivered
    expect(seen.length).toBe(3);
    provider.pause();
    clock.advance(5000); // nothing should fire while paused
    expect(seen.length).toBe(3);
    provider.resume();
    clock.runUntilIdle();
    expect(seen.length).toBe(trace.samples.length);
  });

  it('seek() jumps to the nearest sample and keeps timestamps increasing after', () => {
    const trace = tinyTrace();
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 1, clock });
    const timestamps: number[] = [];
    provider.onSample((s) => timestamps.push(s.timestamp));
    void provider.start();
    clock.advance(100); // deliver only t=0
    provider.seek(3200); // nearest sample is t=3000
    expect(provider.position()).toBe(3000);
    clock.runUntilIdle();
    for (let i = 1; i < timestamps.length; i += 1) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1] as number);
    }
  });

  it('loop=1 restarts at the first sample after the last, with strictly increasing timestamps', () => {
    const trace = tinyTrace();
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 1, clock, loop: true });
    const lats: number[] = [];
    const timestamps: number[] = [];
    provider.onSample((s) => {
      lats.push(s.lat);
      timestamps.push(s.timestamp);
    });
    void provider.start();
    // Two full laps plus one extra sample into lap 3.
    clock.advance(trace.samples.length * 1000 * 2 + 1500);
    expect(lats.slice(0, trace.samples.length)).toEqual(
      lats.slice(trace.samples.length, trace.samples.length * 2),
    );
    for (let i = 1; i < timestamps.length; i += 1) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1] as number);
    }
    provider.stop();
  });
});

describe('TC-LOC-04 — visibility-hidden/visible drives suspended state, drops (not buffers) samples', () => {
  it('synthetic-screen-lock-01: suspended exactly at 240s, running again exactly at 360s', () => {
    const trace = validated(readSyntheticTrace('synthetic-screen-lock-01'));
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 1, clock });
    const states: string[] = [];
    provider.onStateChange((s) => states.push(s));
    void provider.start();
    clock.advance(240_000);
    expect(provider.state).toBe('suspended');
    clock.advance(119_999);
    expect(provider.state).toBe('suspended');
    clock.advance(1);
    expect(provider.state).toBe('running');
    expect(states).toContain('suspended');
    expect(states.filter((s) => s === 'suspended').length).toBe(1); // no flapping
    provider.stop();
  });
});

describe('TC-LOC-05 — permission-denied is fatal, no retry', () => {
  it('synthetic-permission-denied-01: error at t=60s with exactly the 60 prior samples, no retry on its own', () => {
    const trace = validated(readSyntheticTrace('synthetic-permission-denied-01'));
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 1, clock });
    let delivered = 0;
    let lastError: { code: string; fatal: boolean } | undefined;
    provider.onSample(() => {
      delivered += 1;
    });
    provider.onError((e) => {
      lastError = { code: e.code, fatal: e.fatal };
    });
    void provider.start();
    clock.runUntilIdle();
    expect(provider.state).toBe('error');
    expect(lastError).toEqual({ code: 'permission-denied', fatal: true });
    expect(delivered).toBe(60); // samples strictly before t=60000; event fires before the t=60000 sample
    clock.advance(60_000); // no retry loop on its own
    expect(delivered).toBe(60);
    expect(provider.state).toBe('error');
  });
});

describe('TC-LOC-06 — position-unavailable/timeout are non-fatal', () => {
  it('synthetic-soi-occluded-01: provider never enters error and keeps delivering after both events', () => {
    const trace = validated(readSyntheticTrace('synthetic-soi-occluded-01'));
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 60, clock });
    const states = new Set<string>();
    let delivered = 0;
    provider.onStateChange((s) => states.add(s));
    provider.onSample(() => {
      delivered += 1;
    });
    void provider.start();
    clock.runUntilIdle();
    expect(states.has('error')).toBe(false);
    expect(delivered).toBe(trace.samples.length);
  });
});

describe('TC-LOC-07 — Capacitor stub is not-implemented until Phase 8', () => {
  it('start() fails immediately with a Phase 8 message', async () => {
    const clock = new QaFakeClock();
    const provider = new CapacitorLocationProvider({ clock });
    let error: { code: string; message: string } | undefined;
    provider.onError((e) => {
      error = { code: e.code, message: e.message };
    });
    await provider.start();
    expect(provider.state).toBe('error');
    expect(error?.code).toBe('not-implemented');
    expect(error?.message).toMatch(/Phase 8/);
  });
});

describe('TC-LOC-08 — Web provider drops a repeated/cached fix (non-increasing timestamp)', () => {
  it('does not re-emit a fix whose timestamp does not strictly increase', () => {
    const clock = new QaFakeClock();
    const geolocation = new QaFakeGeolocation();
    const visibility = new QaFakeVisibility(true);
    const provider = new WebLocationProvider({
      clock,
      visibility,
      geolocation,
      permissions: null,
      enableHighAccuracy: true,
      timeout_ms: 10_000,
      maximumAge_ms: 0,
    });
    const seen: number[] = [];
    provider.onSample((s) => seen.push(s.timestamp));
    void provider.start();
    geolocation.fix(1000);
    geolocation.fix(2000);
    geolocation.fix(2000); // cached repeat: same timestamp
    geolocation.fix(1500); // stale: older than last delivered
    expect(seen).toEqual([1000, 2000]);
  });
});

describe('TC-LOC-09 — getPermission() never prompts when the Permissions API is absent (iOS Safari)', () => {
  it('returns "unknown" without calling getCurrentPosition, before start()', async () => {
    const clock = new QaFakeClock();
    const geolocation = new QaFakeGeolocation();
    const provider = new WebLocationProvider({
      clock,
      visibility: new QaFakeVisibility(true),
      geolocation,
      permissions: null, // simulates iOS Safari (no Permissions API)
      enableHighAccuracy: true,
      timeout_ms: 10_000,
      maximumAge_ms: 0,
    });
    const permission = await provider.getPermission();
    expect(permission).toBe('unknown');
    expect(geolocation.getCurrentPositionCalls).toBe(0);
  });
});

describe('QA trace qa-gps-jump-01 — a mid-walk GPS jump does not crash the provider', () => {
  it('replays fully (no throw, no error state) and delivers every sample in order', () => {
    const trace = validated(readQaTrace('qa-gps-jump-01'));
    const clock = new QaFakeClock();
    const provider = new MockTraceLocationProvider({ trace, speed: 60, clock });
    const timestamps: number[] = [];
    let threw = false;
    provider.onSample((s) => timestamps.push(s.timestamp));
    void provider.start();
    try {
      clock.runUntilIdle();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(provider.state).not.toBe('error');
    expect(timestamps.length).toBe(trace.samples.length);
    for (let i = 1; i < timestamps.length; i += 1) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1] as number);
    }
  });

  it('documents the known gap this trace exists to expose: a naive per-window distance sum counts the ~400 m jump as real movement (deferred anti-spike filtering, test plan §7/Phase 2)', () => {
    const trace = validated(readQaTrace('qa-gps-jump-01'));
    const windows = gateWindows(trace, 300_000, 50);
    // The trace walks ~1.3 m/s for 6 minutes (~468 m actual) but the naive sum inflates the
    // window containing the jump (t=179000->180000, ~400 m in 1 s) well past a plausible walk.
    const jumpWindow = windows.find((w) => w.fromMs <= 179_000 && w.toMs > 179_000);
    expect(jumpWindow?.pass).toBe(true); // passes today — for the wrong reason (a spike, not a walk)
    expect(jumpWindow?.distanceM).toBeGreaterThan(300); // naive sum, not a real 5-min walk distance
    // A real anti-spike filter (accuracy/plausible-speed based, per synthetic-drift-spike-01 and
    // config/balance/anticheat.json) is Phase 2/3 work; this case only proves the Mock/HUD path
    // does not crash or throw on the input, per board acceptance for qa-gps-jump-01.
  });
});
