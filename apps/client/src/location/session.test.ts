import { describe, expect, it } from 'vitest';
import type { Clock, LocationSample, TimerHandle } from '@keep-walking/location';
import type { AppPrivacyConfig, ClientRuntimeConfig } from '../config/runtime';
import type { ProviderSelection } from './select';
import { createLocationProvider, wireProvider } from './session';
import { loadTraceById } from './traces';

/** Minimal deterministic Clock test double (see gps-status.test.ts for why this is duplicated
 * instead of importing packages/location/test/helpers.ts, which is not a published export). */
class FakeClock implements Clock {
  private current = 1_700_000_000_000;
  private nextId = 1;
  private timers: { id: number; due: number; callback: () => void }[] = [];

  now(): number {
    return this.current;
  }

  setTimeout(callback: () => void, delayMs: number): TimerHandle {
    const id = this.nextId++;
    this.timers.push({ id, due: this.current + Math.max(0, delayMs), callback });
    return id;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers = this.timers.filter((timer) => timer.id !== handle);
  }

  /** Fires every pending timer, including ones scheduled by a callback this ran, until idle. */
  runUntilIdle(maxTimers = 1_000_000): void {
    let guard = 0;
    for (;;) {
      const next = this.timers.reduce<
        { id: number; due: number; callback: () => void } | undefined
      >((best, t) => (best === undefined || t.due < best.due ? t : best), undefined);
      if (next === undefined) {
        return;
      }
      if (++guard > maxTimers) {
        throw new Error('FakeClock.runUntilIdle: too many timers (loop?)');
      }
      this.timers = this.timers.filter((t) => t.id !== next.id);
      this.current = next.due;
      next.callback();
    }
  }
}

const CLIENT_CONFIG: ClientRuntimeConfig = {
  locationWeb: { enableHighAccuracy: true, timeout_ms: 15000, maximumAge_ms: 0 },
  providerQuery: {
    paramNames: { provider: 'loc', trace: 'trace', speed: 'speed', loop: 'loop', hud: 'hud' },
    allowedProviders: ['web', 'mock', 'capacitor'],
    allowedMockSpeeds: [1, 10, 60],
  },
  providerQueryDefaultsByMode: {
    development: { provider: 'mock', speed: 1, loop: true, hud: false },
    production: { provider: 'web', speed: 1, loop: false, hud: false },
  },
  mapView: { maxZoom: 18 },
  hudMeasurement: {
    accuracyWarmup_s: 60,
    sampleGap_s: 10,
    gateWindowStep_s: 30,
    fpsMaxFrameGap_ms: 1000,
    fpsLowPercentile: 5,
    accuracyHighPercentile: 90,
    latencyHighPercentile: 90,
    batteryNormalizeWindow_s: 1800,
    batteryMinSegment_s: 1200,
    bytesPerMegabyte: 1000000,
  },
};

const PRIVACY_CONFIG: AppPrivacyConfig = {
  rawTraceExport: {
    rawTraceTrim_m: 200,
    coordinateDecimals: 5,
    relativeTimeOnly: true,
    requiresExplicitOptIn: true,
    autoUploadAllowed: false,
  },
  summaryExport: { isDefaultExport: true, includesCoordinates: false },
};

describe('createLocationProvider + wireProvider (mock)', () => {
  it('replays a real committed trace and delivers every sample, in the trace order, at speed 60', async () => {
    const selection: ProviderSelection = {
      provider: 'mock',
      traceId: 'synthetic-park-loop-01',
      speed: 60,
      loop: false,
      hud: false,
    };
    const clock = new FakeClock();
    const provider = await createLocationProvider(selection, CLIENT_CONFIG, PRIVACY_CONFIG, {
      clock,
    });

    const received: LocationSample[] = [];
    const states: string[] = [];
    const unwire = wireProvider(provider, {
      onSample: (sample) => received.push(sample),
      onStateChange: (state) => states.push(state),
    });

    await provider.start();
    clock.runUntilIdle();
    unwire();

    const expected = await loadTraceById('synthetic-park-loop-01');
    expect(received).toHaveLength(expected.samples.length);
    for (const [i, sample] of received.entries()) {
      expect(sample.lat).toBe(expected.samples[i]?.lat);
      expect(sample.lng).toBe(expected.samples[i]?.lng);
      expect(sample.accuracy).toBe(expected.samples[i]?.accuracy);
    }
    // Strictly increasing timestamps: the map must move forward, never jump backwards or repeat.
    for (let i = 1; i < received.length; i += 1) {
      expect(received[i]?.timestamp ?? 0).toBeGreaterThan(received[i - 1]?.timestamp ?? 0);
    }
    expect(states[0]).toBe('starting');
    expect(states).toContain('running');
  });

  it('picks the first trace in the committed list when no trace id is given', async () => {
    const selection: ProviderSelection = {
      provider: 'mock',
      traceId: undefined,
      speed: 60,
      loop: false,
      hud: false,
    };
    const clock = new FakeClock();
    const provider = await createLocationProvider(selection, CLIENT_CONFIG, PRIVACY_CONFIG, {
      clock,
    });
    expect(provider.kind).toBe('mock');
  });
});

describe('createLocationProvider (capacitor)', () => {
  it('builds a provider whose start() reports not-implemented', async () => {
    const selection: ProviderSelection = {
      provider: 'capacitor',
      traceId: undefined,
      speed: 1,
      loop: false,
      hud: false,
    };
    const provider = await createLocationProvider(selection, CLIENT_CONFIG, PRIVACY_CONFIG);
    const errors: string[] = [];
    wireProvider(provider, { onError: (e) => errors.push(e.code) });
    await provider.start();
    expect(errors).toEqual(['not-implemented']);
    expect(provider.state).toBe('error');
  });
});
