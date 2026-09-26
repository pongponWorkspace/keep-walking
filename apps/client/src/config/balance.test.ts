import { describe, expect, it } from 'vitest';
import {
  balanceCheckInConfig,
  balanceLocationConfig,
  balanceMovementGateConfig,
  balanceOpeningHoursConfig,
  parseBalanceLocationConfig,
  parseCheckInConfig,
  parseMovementGateConfig,
  parseOpeningHoursConfig,
} from './balance';

describe('parseBalanceLocationConfig', () => {
  it('parses a well-formed config', () => {
    const parsed = parseBalanceLocationConfig({
      homeState: { maxAccuracy_m: 100, sustainedPoorAccuracy_s: 30 },
    });
    expect(parsed.homeState).toEqual({ maxAccuracy_m: 100, sustainedPoorAccuracy_s: 30 });
  });

  it('fails loudly when a key is missing', () => {
    expect(() => parseBalanceLocationConfig({ homeState: { maxAccuracy_m: 100 } })).toThrow(
      /sustainedPoorAccuracy_s/,
    );
  });

  it('fails loudly on a zero or negative threshold', () => {
    expect(() =>
      parseBalanceLocationConfig({ homeState: { maxAccuracy_m: 0, sustainedPoorAccuracy_s: 30 } }),
    ).toThrow(/maxAccuracy_m/);
  });

  it('fails loudly on a non-object root', () => {
    expect(() => parseBalanceLocationConfig(undefined)).toThrow(/must be an object/);
  });
});

describe('parseMovementGateConfig', () => {
  it('parses a well-formed config with no filter params yet', () => {
    const parsed = parseMovementGateConfig({
      movementGate: { minDistancePerWindow_m: 50, window_s: 300, comparison: 'greaterThan' },
    });
    expect(parsed).toEqual({
      minDistancePerWindow_m: 50,
      window_s: 300,
      comparison: 'greaterThan',
      filter: undefined,
    });
  });

  it('accepts greaterThanOrEqual (the other geo GateComparison)', () => {
    const parsed = parseMovementGateConfig({
      movementGate: { minDistancePerWindow_m: 50, window_s: 300, comparison: 'greaterThanOrEqual' },
    });
    expect(parsed.comparison).toBe('greaterThanOrEqual');
  });

  it('rejects an unknown comparison', () => {
    expect(() =>
      parseMovementGateConfig({
        movementGate: { minDistancePerWindow_m: 50, window_s: 300, comparison: 'lessThan' },
      }),
    ).toThrow(/must be one of/);
  });

  it('parses the five filter keys when all are present', () => {
    const parsed = parseMovementGateConfig({
      movementGate: {
        minDistancePerWindow_m: 50,
        window_s: 300,
        comparison: 'greaterThan',
        sampleCadence_s: 5,
        maxSamplePairGap_s: 30,
        maxSampleAccuracy_m: 30,
        outlierSpeed_kmh: 30,
        outlierReanchorSamples: 5,
      },
    });
    expect(parsed.filter).toEqual({
      maxSampleAccuracy_m: 30,
      outlierSpeed_kmh: 30,
      outlierReanchorSamples: 5,
      sampleCadence_s: 5,
      maxSamplePairGap_s: 30,
    });
  });

  it('fails loudly when only some filter keys are present', () => {
    expect(() =>
      parseMovementGateConfig({
        movementGate: {
          minDistancePerWindow_m: 50,
          window_s: 300,
          comparison: 'greaterThan',
          sampleCadence_s: 5,
        },
      }),
    ).toThrow(/all five gate-filter keys must arrive together/);
  });
});

describe('parseCheckInConfig', () => {
  it('parses a well-formed config', () => {
    expect(parseCheckInConfig({ checkIn: { maxAccuracy_m: 30 } })).toEqual({ maxAccuracy_m: 30 });
  });

  it('fails loudly when maxAccuracy_m is missing', () => {
    expect(() => parseCheckInConfig({ checkIn: {} })).toThrow(/maxAccuracy_m/);
  });
});

describe('parseOpeningHoursConfig', () => {
  it('parses utcOffset_min (Bangkok UTC+7 -> 420, no DST)', () => {
    expect(parseOpeningHoursConfig({ openingHours: { utcOffset_min: 420 } })).toEqual({
      utcOffsetMin: 420,
    });
  });

  it('fails loudly when utcOffset_min is missing', () => {
    expect(() => parseOpeningHoursConfig({ openingHours: {} })).toThrow(/utcOffset_min/);
  });
});

describe('the real committed config files (via the generated whitelist subset)', () => {
  it('load and validate without throwing', () => {
    expect(balanceLocationConfig.homeState.maxAccuracy_m).toBeGreaterThan(0);
    expect(balanceLocationConfig.homeState.sustainedPoorAccuracy_s).toBeGreaterThan(0);
    expect(balanceMovementGateConfig.minDistancePerWindow_m).toBe(50);
    expect(balanceMovementGateConfig.window_s).toBe(300);
    expect(balanceCheckInConfig.maxAccuracy_m).toBe(30);
    // Present as of P2-F05-T20; if a future config edit removes one of the five, this whole file
    // fails loudly at import time instead of the HUD silently losing the filtered columns.
    expect(balanceMovementGateConfig.filter).toBeDefined();
    expect(balanceOpeningHoursConfig.utcOffsetMin).toBe(420);
  });
});
