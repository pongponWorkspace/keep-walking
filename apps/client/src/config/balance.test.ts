import { describe, expect, it } from 'vitest';
import {
  balanceCheckInConfig,
  balanceLocationConfig,
  balanceMovementGateConfig,
  parseBalanceLocationConfig,
  parseCheckInConfig,
  parseMovementGateConfig,
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
  it('parses a well-formed config', () => {
    const parsed = parseMovementGateConfig({
      movementGate: { minDistancePerWindow_m: 50, window_s: 300, comparison: 'greaterThan' },
    });
    expect(parsed).toEqual({ minDistancePerWindow_m: 50, window_s: 300, comparison: 'greaterThan' });
  });

  it('rejects an unknown comparison', () => {
    expect(() =>
      parseMovementGateConfig({
        movementGate: { minDistancePerWindow_m: 50, window_s: 300, comparison: 'lessThan' },
      }),
    ).toThrow(/must be one of/);
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

describe('the real committed config files', () => {
  it('load and validate without throwing', () => {
    expect(balanceLocationConfig.homeState.maxAccuracy_m).toBeGreaterThan(0);
    expect(balanceLocationConfig.homeState.sustainedPoorAccuracy_s).toBeGreaterThan(0);
    expect(balanceMovementGateConfig.minDistancePerWindow_m).toBe(50);
    expect(balanceMovementGateConfig.window_s).toBe(300);
    expect(balanceCheckInConfig.maxAccuracy_m).toBe(30);
  });
});
