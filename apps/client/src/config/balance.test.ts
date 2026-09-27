import { describe, expect, it } from 'vitest';
import {
  balanceCheckInConfig,
  balanceLocationConfig,
  balanceLockedSystemIds,
  balanceMovementGateConfig,
  balanceOpeningHoursConfig,
  balancePrivacyConfig,
  balanceRunStateConfig,
  balanceUnlocksHomeConfig,
  parseBalanceLocationConfig,
  parseBalancePrivacyConfig,
  parseCheckInConfig,
  parseLockedSystemIds,
  parseMovementGateConfig,
  parseOpeningHoursConfig,
  parseRunStateConfig,
  parseUnlocksHomeConfig,
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

/** P2-F06-T09: every field `parseUnlocksHomeConfig` requires beyond `distanceDisplaySteps_m`,
 * spread into a fixture so each `it` below only overrides the one field it means to break. */
function validHomeFields(): Record<string, unknown> {
  return {
    distanceDisplaySteps_m: [
      { step_m: 50, upTo_m: 1000 },
      { step_m: 1000, upTo_m: null },
    ],
    farDungeonThreshold_m: 1900,
    reevaluateDistance_m: 200,
    outOfAreaMaskPath: 'data/map/playarea-mask.geojson',
    launchAreaMaskPath: 'data/map/launch-area.geojson',
  };
}

describe('parseUnlocksHomeConfig (TG-07, P2-F06-T09)', () => {
  it('parses a well-formed distanceDisplaySteps_m array', () => {
    const parsed = parseUnlocksHomeConfig({ home: validHomeFields() });
    expect(parsed.distanceDisplaySteps_m).toEqual([
      { step_m: 50, upTo_m: 1000 },
      { step_m: 1000, upTo_m: null },
    ]);
  });

  it('fails loudly when distanceDisplaySteps_m is missing', () => {
    expect(() => parseUnlocksHomeConfig({ home: {} })).toThrow(/distanceDisplaySteps_m/);
  });

  it('fails loudly when a step_m is not a positive number', () => {
    const home = { ...validHomeFields(), distanceDisplaySteps_m: [{ step_m: 0, upTo_m: null }] };
    expect(() => parseUnlocksHomeConfig({ home })).toThrow(/step_m/);
  });

  it('parses farDungeonThreshold_m/reevaluateDistance_m/outOfAreaMaskPath', () => {
    const parsed = parseUnlocksHomeConfig({ home: validHomeFields() });
    expect(parsed.farDungeonThreshold_m).toBe(1900);
    expect(parsed.reevaluateDistance_m).toBe(200);
    expect(parsed.outOfAreaMaskPath).toBe('data/map/playarea-mask.geojson');
  });

  it('fails loudly when farDungeonThreshold_m is not a positive number', () => {
    const home = { ...validHomeFields(), farDungeonThreshold_m: 0 };
    expect(() => parseUnlocksHomeConfig({ home })).toThrow(/farDungeonThreshold_m/);
  });

  it('accepts launchAreaMaskPath: null (R55: geometry not shipped yet)', () => {
    const home = { ...validHomeFields(), launchAreaMaskPath: null };
    expect(parseUnlocksHomeConfig({ home }).launchAreaMaskPath).toBeNull();
  });

  it('fails loudly when launchAreaMaskPath is neither a string nor null', () => {
    const home = { ...validHomeFields(), launchAreaMaskPath: 42 };
    expect(() => parseUnlocksHomeConfig({ home })).toThrow(/launchAreaMaskPath/);
  });
});

describe('parseRunStateConfig', () => {
  it('parses a well-formed config', () => {
    expect(parseRunStateConfig({ runState: { clockSkewTolerance_s: 5 } })).toEqual({
      clockSkewTolerance_s: 5,
    });
  });

  it('fails loudly when the value is missing', () => {
    expect(() => parseRunStateConfig({ runState: {} })).toThrow(/clockSkewTolerance_s/);
  });
});

describe('parseLockedSystemIds', () => {
  it('collects every unlockId of every object entry, ignoring non-object values', () => {
    const ids = parseLockedSystemIds({
      market: { unlockId: 'U1' },
      enhance: { unlockId: 'U2' },
      parentalConsent: { enabled: false },
      _meta: { file: 'unlocks.json' },
    });
    expect(ids).toEqual(['U1', 'U2']);
  });

  it('fails loudly on a non-object root', () => {
    expect(() => parseLockedSystemIds(undefined)).toThrow(/must be an object/);
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
    // TG-07: the client's displayed distance steps come from this same balance subset, never a
    // second hardcoded copy in f04-app.ts.
    expect(balanceUnlocksHomeConfig.distanceDisplaySteps_m.length).toBeGreaterThan(0);
    // P2-F06-T09: home-state wiring reads these straight from the same generated subset.
    expect(balanceUnlocksHomeConfig.farDungeonThreshold_m).toBe(1900);
    expect(balanceUnlocksHomeConfig.reevaluateDistance_m).toBe(200);
    expect(balanceUnlocksHomeConfig.outOfAreaMaskPath).toBe('data/map/playarea-mask.geojson');
    expect(balanceUnlocksHomeConfig.launchAreaMaskPath).toBe('data/map/launch-area.geojson');
    // R2-01 (tech gate P2-F05-T15, P2-F06-T10): the same tolerance the clock-skew test uses.
    expect(balanceRunStateConfig.clockSkewTolerance_s).toBe(5);
    // U1 (market), U2 (enhance), U3 (raid), U4 (statAllocation), U6 (partyDetail), U7
    // (antiCheatHelp), U8 (lore) — U5 (classChange) is a documented gap, see whitelist.ts.
    expect([...balanceLockedSystemIds].sort()).toEqual(['U1', 'U2', 'U3', 'U4', 'U6', 'U7', 'U8']);
    // P2-X38: S-00-age-gate's own config, from the same generated subset.
    expect(balancePrivacyConfig.minAge_yr).toBe(15);
    expect(balancePrivacyConfig.minAgeComparison).toBe('greaterThanOrEqual');
    // D-135/F06-TG-03: positionLogTtl_s now reaches the client through the same generated subset.
    expect(balancePrivacyConfig.positionLogTtl_s).toBe(86400);
  });
});

const WELL_FORMED_PRIVACY = {
  minAge_yr: 15,
  minAgeComparison: 'greaterThanOrEqual',
  positionLogTtl_s: 86400,
};

describe('parseBalancePrivacyConfig', () => {
  it('parses a well-formed config', () => {
    expect(parseBalancePrivacyConfig(WELL_FORMED_PRIVACY)).toEqual(WELL_FORMED_PRIVACY);
  });

  it('fails loudly on a missing minAge_yr', () => {
    expect(() =>
      parseBalancePrivacyConfig({ ...WELL_FORMED_PRIVACY, minAge_yr: undefined }),
    ).toThrow(/minAge_yr/);
  });

  it('fails loudly on an unknown minAgeComparison rather than guessing', () => {
    expect(() =>
      parseBalancePrivacyConfig({ ...WELL_FORMED_PRIVACY, minAgeComparison: 'nope' }),
    ).toThrow(/minAgeComparison/);
  });

  it('fails loudly on a missing positionLogTtl_s (F06-TG-03: no silent 24h fallback)', () => {
    expect(() =>
      parseBalancePrivacyConfig({ ...WELL_FORMED_PRIVACY, positionLogTtl_s: undefined }),
    ).toThrow(/positionLogTtl_s/);
  });

  it('fails loudly on a non-integer positionLogTtl_s', () => {
    expect(() =>
      parseBalancePrivacyConfig({ ...WELL_FORMED_PRIVACY, positionLogTtl_s: 86400.5 }),
    ).toThrow(/positionLogTtl_s/);
  });
});
