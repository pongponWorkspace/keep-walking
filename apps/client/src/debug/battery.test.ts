import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseManualBatteryPct, readBatteryLevel } from './battery';

describe('readBatteryLevel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports source "none" when the Battery Status API does not exist (iOS Safari, D-003)', async () => {
    const reading = await readBatteryLevel();
    expect(reading).toEqual({ pct: undefined, source: 'none' });
  });

  it('reads and rounds the level to a percent when the API exists', async () => {
    vi.stubGlobal('navigator', { getBattery: async () => ({ level: 0.837 }) });
    const reading = await readBatteryLevel();
    expect(reading).toEqual({ pct: 84, source: 'api' });
  });

  it('falls back to "none" if getBattery() rejects', async () => {
    vi.stubGlobal('navigator', {
      getBattery: async () => {
        throw new Error('denied');
      },
    });
    const reading = await readBatteryLevel();
    expect(reading).toEqual({ pct: undefined, source: 'none' });
  });
});

describe('parseManualBatteryPct', () => {
  it('accepts a valid 0-100 integer', () => {
    expect(parseManualBatteryPct('42')).toBe(42);
  });

  it('rounds a fractional entry', () => {
    expect(parseManualBatteryPct('42.6')).toBe(43);
  });

  it('rejects out-of-range or non-numeric input instead of throwing', () => {
    expect(parseManualBatteryPct('101')).toBeUndefined();
    expect(parseManualBatteryPct('-1')).toBeUndefined();
    expect(parseManualBatteryPct('abc')).toBeUndefined();
    expect(parseManualBatteryPct('')).toBeUndefined();
  });
});
