import { describe, expect, it } from 'vitest';
import { appTelemetryConfig, parseAppTelemetryConfig } from './telemetry';

function valid(): Record<string, unknown> {
  return {
    localSink: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000, persistInterval_s: 10 },
    export: {
      mimeType: 'application/x-ndjson',
      fileNamePrefix: 'kw-p2-telemetry',
      forbiddenPropertyNames: ['lat', 'lng'],
      coordinateLikeNumberGuard: { minDecimals: 4, latRange_deg: [5, 21], lngRange_deg: [97, 106] },
    },
  };
}

describe('parseAppTelemetryConfig', () => {
  it('parses a well-formed config', () => {
    const parsed = parseAppTelemetryConfig(valid());
    expect(parsed.localSink.ringBufferMaxEvents).toBe(3000);
    expect(parsed.export.forbiddenPropertyNames).toEqual(['lat', 'lng']);
    expect(parsed.export.coordinateLikeNumberGuard.latRange_deg).toEqual([5, 21]);
  });

  it('fails loudly when a key is missing', () => {
    const broken = valid();
    delete (broken['localSink'] as Record<string, unknown>)['ringBufferMaxEvents'];
    expect(() => parseAppTelemetryConfig(broken)).toThrow(/ringBufferMaxEvents/);
  });

  it('fails loudly on a non-object root', () => {
    expect(() => parseAppTelemetryConfig(null)).toThrow(/must be an object/);
  });
});

describe('the real committed config file', () => {
  it('loads and validates without throwing', () => {
    expect(appTelemetryConfig.localSink.ringBufferMaxEvents).toBe(3000);
    expect(appTelemetryConfig.export.forbiddenPropertyNames).toContain('lat');
    expect(appTelemetryConfig.export.coordinateLikeNumberGuard.minDecimals).toBe(4);
  });
});
