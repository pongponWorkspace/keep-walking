import { describe, expect, it } from 'vitest';
import {
  appPrivacyConfig,
  clientConfig,
  parseClientConfig,
  parsePrivacyConfig,
} from './runtime';

function validClient(): Record<string, unknown> {
  return {
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
}

function validPrivacy(): Record<string, unknown> {
  return {
    rawTraceExport: {
      rawTraceTrim_m: 200,
      coordinateDecimals: 5,
      relativeTimeOnly: true,
      requiresExplicitOptIn: true,
      autoUploadAllowed: false,
    },
    summaryExport: { isDefaultExport: true, includesCoordinates: false },
  };
}

describe('parseClientConfig', () => {
  it('parses a well-formed config', () => {
    const parsed = parseClientConfig(validClient());
    expect(parsed.locationWeb).toEqual({ enableHighAccuracy: true, timeout_ms: 15000, maximumAge_ms: 0 });
    expect(parsed.providerQuery.paramNames.provider).toBe('loc');
    expect(parsed.providerQueryDefaultsByMode.development.provider).toBe('mock');
    expect(parsed.providerQueryDefaultsByMode.production.provider).toBe('web');
  });

  it('fails loudly when a key is missing', () => {
    const broken = validClient();
    delete (broken['locationWeb'] as Record<string, unknown>)['timeout_ms'];
    expect(() => parseClientConfig(broken)).toThrow(/timeout_ms/);
  });

  it('fails loudly when a key is null', () => {
    const broken = validClient();
    (broken['locationWeb'] as Record<string, unknown>)['enableHighAccuracy'] = null;
    expect(() => parseClientConfig(broken)).toThrow(/enableHighAccuracy/);
  });

  it('rejects an unknown provider kind', () => {
    const broken = validClient();
    (broken['providerQueryDefaultsByMode'] as Record<string, unknown>)['development'] = {
      provider: 'bogus',
      speed: 1,
      loop: true,
      hud: false,
    };
    expect(() => parseClientConfig(broken)).toThrow(/must be one of/);
  });

  it('rejects a disallowed mock speed', () => {
    const broken = validClient();
    (broken['providerQuery'] as Record<string, unknown>)['allowedMockSpeeds'] = [1, 7];
    expect(() => parseClientConfig(broken)).toThrow(/must be one of/);
  });

  it('rejects a non-object root', () => {
    expect(() => parseClientConfig(null)).toThrow(/must be an object/);
  });
});

describe('parsePrivacyConfig', () => {
  it('parses a well-formed config', () => {
    const parsed = parsePrivacyConfig(validPrivacy());
    expect(parsed.rawTraceExport.rawTraceTrim_m).toBe(200);
    expect(parsed.rawTraceExport.coordinateDecimals).toBe(5);
    expect(parsed.summaryExport.includesCoordinates).toBe(false);
  });

  it('fails loudly when rawTraceTrim_m is missing', () => {
    const broken = validPrivacy();
    delete (broken['rawTraceExport'] as Record<string, unknown>)['rawTraceTrim_m'];
    expect(() => parsePrivacyConfig(broken)).toThrow(/rawTraceTrim_m/);
  });

  it('fails loudly when summaryExport is missing', () => {
    const broken = validPrivacy();
    delete broken['summaryExport'];
    expect(() => parsePrivacyConfig(broken)).toThrow(/summaryExport/);
  });
});

describe('the real committed config files', () => {
  it('load and validate without throwing', () => {
    // clientConfig/appPrivacyConfig are parsed at import time; reaching here means it succeeded.
    expect(clientConfig.providerQuery.allowedProviders).toContain('mock');
    expect(clientConfig.mapView.maxZoom).toBeGreaterThan(0);
    expect(clientConfig.hudMeasurement.bytesPerMegabyte).toBe(1000000);
    expect(appPrivacyConfig.rawTraceExport.rawTraceTrim_m).toBeGreaterThan(0);
    expect(appPrivacyConfig.summaryExport.includesCoordinates).toBe(false);
  });
});
