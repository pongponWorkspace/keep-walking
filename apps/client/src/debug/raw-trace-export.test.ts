import { describe, expect, it } from 'vitest';
import { sanitizeRawTrace } from './raw-trace-export';
import type { HudSample } from './stats';

const SECOND = 1000;
const START = 1_700_000_000_000;
const TRIM_M = 200;
const DECIMALS = 5;

/** A straight walk north, ~11.1 m per 0.0001 deg latitude, 1 sample/s. */
function walk(totalSeconds: number, stepDeg = 0.0001): HudSample[] {
  const samples: HudSample[] = [];
  for (let t = 0; t <= totalSeconds; t += 1) {
    samples.push({
      timestamp: START + t * SECOND,
      lat: 13.73 + t * stepDeg,
      lng: 100.54,
      accuracy: 8,
    });
  }
  return samples;
}

describe('sanitizeRawTrace', () => {
  it('trims at least rawTraceTrim_m from both ends, shifts to relative time, and rounds coordinates', () => {
    const samples = walk(400); // ~444 m total at ~1.11 m/step
    const result = sanitizeRawTrace(samples, {
      rawTraceTrim_m: TRIM_M,
      coordinateDecimals: DECIMALS,
      sessionId: 'a1b2c3d4-0000-4000-8000-000000000000',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.meta.kind).toBe('field');
    expect(result.trace.meta.sanitized?.trimStart_m).toBeGreaterThanOrEqual(TRIM_M);
    expect(result.trace.meta.sanitized?.trimEnd_m).toBeGreaterThanOrEqual(TRIM_M);
    expect(result.trace.samples[0]?.t).toBe(0);
    const lat = result.trace.samples[0]?.lat ?? 0;
    expect(Number.isInteger(lat * 10 ** DECIMALS)).toBe(true);
  });

  it('refuses (does not throw) when the walk is too short to trim 200 m off both ends', () => {
    const samples = walk(20); // ~22 m total, far short of 400 m needed for both trims
    const result = sanitizeRawTrace(samples, {
      rawTraceTrim_m: TRIM_M,
      coordinateDecimals: DECIMALS,
      sessionId: 'a1b2c3d4-0000-4000-8000-000000000000',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses with fewer than two samples', () => {
    const result = sanitizeRawTrace([{ timestamp: START, lat: 0, lng: 0, accuracy: 5 }], {
      rawTraceTrim_m: TRIM_M,
      coordinateDecimals: DECIMALS,
      sessionId: 'a1b2c3d4-0000-4000-8000-000000000000',
    });
    expect(result.ok).toBe(false);
  });
});
