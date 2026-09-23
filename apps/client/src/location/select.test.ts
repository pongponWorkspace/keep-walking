import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientRuntimeConfig } from '../config/runtime';
import { defaultsForMode, selectProvider } from './select';

const CONFIG: ClientRuntimeConfig = {
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

describe('defaultsForMode', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('returns the development defaults in development mode', () => {
    expect(defaultsForMode(CONFIG, 'development')).toEqual(
      CONFIG.providerQueryDefaultsByMode.development,
    );
  });

  it('returns the production defaults in production mode', () => {
    expect(defaultsForMode(CONFIG, 'production')).toEqual(
      CONFIG.providerQueryDefaultsByMode.production,
    );
  });

  it('falls back to production and warns for an unknown mode', () => {
    expect(defaultsForMode(CONFIG, 'test')).toEqual(CONFIG.providerQueryDefaultsByMode.production);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('selectProvider', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('uses the mode defaults when nothing is in the query', () => {
    expect(selectProvider('', CONFIG, 'development')).toEqual({
      provider: 'mock',
      traceId: undefined,
      speed: 1,
      loop: true,
      hud: false,
    });
    expect(selectProvider('', CONFIG, 'production')).toEqual({
      provider: 'web',
      traceId: undefined,
      speed: 1,
      loop: false,
      hud: false,
    });
  });

  it('reads every query param by its configured name', () => {
    const selection = selectProvider(
      '?loc=mock&trace=synthetic-park-loop-01&speed=60&loop=0&hud=1',
      CONFIG,
      'production',
    );
    expect(selection).toEqual({
      provider: 'mock',
      traceId: 'synthetic-park-loop-01',
      speed: 60,
      loop: false,
      hud: true,
    });
  });

  it('selects capacitor to exercise the not-implemented error path', () => {
    expect(selectProvider('?loc=capacitor', CONFIG, 'production').provider).toBe('capacitor');
  });

  it('falls back to the default and warns on an unknown provider', () => {
    expect(selectProvider('?loc=bogus', CONFIG, 'production').provider).toBe('web');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('falls back to the default and warns on a disallowed speed', () => {
    expect(selectProvider('?speed=7', CONFIG, 'development').speed).toBe(1);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('falls back to the default and warns on a malformed boolean', () => {
    expect(selectProvider('?hud=yes', CONFIG, 'production').hud).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('leaves traceId undefined when not given, for "first trace in the list"', () => {
    expect(selectProvider('?loc=mock', CONFIG, 'development').traceId).toBeUndefined();
  });
});
