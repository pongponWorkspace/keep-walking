// P2-H02: `toPersisted` must never write a coordinate to `kw.p2.session` (CLAUDE.md
// non-negotiable 7 / PDPA — this key has no TTL, unlike `position_log`'s 24 h). Reported by
// gameplay-programmer (P2-X21): `latestSample` was reaching the persisted blob unstripped.
// This file also covers two more coordinate-bearing fields the same audit found live inside
// `SessionState` (`lock.lastAccurate`, `run.reward`/`run.rewardScratch`'s filter/grid anchors) —
// see the audit comment on `stripCoordinates` in `./persistence.ts` for the full list. Config and
// fixture helpers below are copied from `reducer.test.ts` (kept in sync manually, ADR 0003 5.4
// notwithstanding) rather than exported from there, so this file stays a self-contained read.
import { describe, expect, it } from 'vitest';
import type { Polygon } from 'geojson';
import type { SessionConfig, SessionDungeonRecord, SessionParams, SessionState } from './types';
import { createSession, sessionStep } from './reducer';
import { fromPersisted, toPersisted } from './persistence';

const SQUARE: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [100.5, 13.75],
      [100.503, 13.75],
      [100.503, 13.753],
      [100.5, 13.753],
      [100.5, 13.75],
    ],
  ],
};
const INSIDE = { lat: 13.7515, lng: 100.5015 };

function testConfig(): SessionConfig {
  return {
    movementGate: {
      window_s: 300,
      minDistancePerWindow_m: 50,
      comparison: 'greaterThan',
      sampleCadence_s: 5,
      maxSamplePairGap_s: 30,
      maxSampleAccuracy_m: 30,
      outlierSpeed_kmh: 60,
      outlierReanchorSamples: 5,
    },
    rewardTick: { rewardTickInterval_s: 300, partialTickMinElapsed_s: 60 },
    runState: {
      edgeHysteresisSamples: 2,
      edgeHysteresis_m: 5,
      clockSkewTolerance_s: 5,
      graceMax_s: 180,
      suspendedMax_s: 900,
      suspendedTimeCounts: false,
      rewardTickDuringGrace: false,
      rewardTickDuringSuspended: false,
    },
    checkIn: { minContinuousApproach_s: 10, maxAccuracy_m: 30, teleportIntoPolygonAllowed: true },
    speedLock: { speedLock_kmh: 25, lockSustained_s: 10, unlockSustained_s: 5 },
    drops: {
      smallDungeonMaxArea_m2: 1,
      dropTables: {
        test: {
          preset: 'test',
          rolls: [{ roll: 'rarity', rarity: 'common', pool: [{ item: 'commonItem', weight: 1 }] }],
        },
      },
      items: { commonItem: { rarity: 'common' } },
      lootParams: {
        dp: {
          baseChance_pct: { uncommon: 0, rare: 0, epic: 0, legendary: 0 },
          commonMin: 1,
          commonMax: 1,
          rangedBuffMaxMult: 1.5,
          noRangedMult: 0.6,
          smallRareAndAboveMult: 1,
          smallCommonQtyMult: 1,
          failedRaidWeekMinMult: 1,
          failedRaidWeekMaxMult: 1,
          lowTrustMult: 1,
          lowTrustBlocksEpicAndAbove: false,
          npcPrice_gold: { common: 1, uncommon: 1, rare: 1, epic: null, legendary: null },
          rewardTickInterval_s: 300,
        },
        qty: { uncommon: 1, rare: 1, epic: 1, legendary: 1 },
      },
    },
    exp: {
      exp: {
        expToNextCoef: 60,
        expToNextExponent: 2.2,
        expPerTickCoef: 30,
        expPerTickExponent: 1.5,
        maxLevel: 60,
        startLevel: 1,
      },
      expMult: {
        magicBuffMaxMult: 1.5,
        noMagicMult: 0.6,
        levelGapMultPerLevel: 0.92,
        levelGapMultFloor: 0.25,
      },
      roles: { magic: { base_pct: 17, cap_pct: 50 } },
      buff: { pPerMemberBase: 1, pLevelDivisor: 50 },
    },
    hpSafety: {
      autoRetreatKeepsRunLoot: true,
      autoRetreatEnabledByDefault: true,
      autoRetreatThreshold_pct: 25,
      lowHpWarningThreshold_pct: 30,
    },
    death: { loseAllRunLoot: true },
    exit: { regenStartsOnExit: true },
    openingHours: { utcOffset_min: 420, closingSoonNotice_s: 600 },
    combat: {
      monsterAttack: {
        zoneLevelFrom: 'playerLevelClampedToRange',
        monsterAtkCoef: 3,
        monsterAtkExponent: 1.3,
      },
      defense: { defSoftcap: 300 },
      attackCheck: {
        intervalMin_s: 45,
        intervalMax_s: 75,
        intervalDistribution: 'uniform',
        hitChancePerCheck_pct: 54,
      },
      levelGapDamage: { damageMultPerLevelBelowRange: 1.25, mode: 'compound', maxMult: null },
      raidFailPenalty: { monsterAtkMultAfterFailedRaid: 2 },
    },
    classes: {
      buffStacking: { pPerMemberBase: 1, pLevelDivisor: 50 },
      roles: {
        tanker: { base_pct: 16, cap_pct: 45, missingDebuffMult: 1.6 },
        support: { base_pct: 25, cap_pct: 50, inDungeonHealBase_pctMaxHpPerMin: 0.5 },
        magic: { base_pct: 17, cap_pct: 50, shieldPerRewardTick_pctMaxHpPerBuffPct: 0.1 },
      },
    },
    economy: {
      potions: {
        hpSmall: { heal_pctMaxHp: 30 },
        hpMedium: { heal_pctMaxHp: 60 },
        hpLarge: { heal_pctMaxHp: 100 },
        revive: { reviveToHp_pct: 50 },
      },
      autoPotion: {
        enabledByDefault: true,
        defaultThreshold_pct: 40,
        defaultPotionOrder: ['hpSmall', 'hpMedium', 'hpLarge'],
        sourceOrder: ['runBag', 'inventory'],
      },
    },
    progression: {
      baseStats: { hp: 300, def: 20, vit: 0 },
      statPerPoint: { hp: 150, def: 3, vitHpRegenSpeed_pct: 1.5, vitPotionEfficiency_pct: 1 },
      statPoints: { pointsPerLevel: 3, pointsFormula: 'pointsPerLevel x level' },
      hpRecovery: {
        deathRecoveryTo_pct: 50,
        deathRecoveryDuration_s: 1800,
        outsideDungeonRegen_pctMaxHpPerMin: 1.6667,
      },
    },
  };
}

/** Open every day, all day (tech note F04 8.1 `[[0, 1440]]`): opening hours are not this file's
 * concern. */
const ALWAYS_OPEN = {
  weekly: {
    '1': [[0, 1440]],
    '2': [[0, 1440]],
    '3': [[0, 1440]],
    '4': [[0, 1440]],
    '5': [[0, 1440]],
    '6': [[0, 1440]],
    '7': [[0, 1440]],
  },
} as const;

function testParams(): SessionParams {
  const record: SessionDungeonRecord = {
    id: 'testDungeon',
    verification_mode: 'continuous_gps',
    floor_level: null,
    level_range: { min: 1, max: 5 },
    drop_table_id: 'test',
    geometry: SQUARE,
    area_m2: 100,
    opening_hours: ALWAYS_OPEN,
  };
  return { config: testConfig(), dungeons: { testDungeon: record } };
}

type RawFix = { t_ms: number; lat: number; lng: number; accuracy_m: number };

/** Walks in a small loop inside the polygon, one sample every 5 s — plenty of real movement and
 * plenty of distinct fixes for `reward.filter`/`grid` and `lock.lastAccurate` to hold onto. */
function walkSamples(startMs: number, count: number): RawFix[] {
  const out: RawFix[] = [];
  for (let i = 0; i < count; i += 1) {
    const phase = i % 4;
    const dLat = phase === 1 || phase === 2 ? 0.0001 : 0;
    const dLng = phase === 2 || phase === 3 ? 0.0001 : 0;
    out.push({
      t_ms: startMs + i * 5000,
      lat: INSIDE.lat + dLat,
      lng: INSIDE.lng + dLng,
      accuracy_m: 6,
    });
  }
  return out;
}

function feed(state: SessionState, params: SessionParams, samples: readonly RawFix[]) {
  let s = state;
  for (const sample of samples) {
    s = sessionStep(s, { type: 'sample', sample }, sample.t_ms, params).state;
  }
  return s;
}

const WARMUP_MS = 10000; // == checkIn.minContinuousApproach_s x 1000

/** Feeds a 10 s warm-up chain inside the polygon then confirms (mirrors `reducer.test.ts`'s own
 * `enterRun`): every field this file inspects (`run.reward`, `lock`) is only reachable once a run
 * is active. */
function enterRun(params: SessionParams, runSeed: number): SessionState {
  let state = createSession(0, params);
  state = sessionStep(state, { type: 'chooseClass', classId: 'ranged' }, 0, params).state;
  state = feed(state, params, walkSamples(0, 3)); // t = 0, 5000, 10000
  return sessionStep(
    state,
    { type: 'confirm', dungeonId: 'testDungeon', runSeed },
    WARMUP_MS,
    params,
  ).state;
}

describe('toPersisted: no coordinate ever reaches the persisted form (P2-H02)', () => {
  it('populates latestSample, lock.lastAccurate, and run.reward/grid with real coordinates', () => {
    // Proves the fixture actually exercises the bug this task fixes: before persistence, the live
    // engine state really does carry raw fixes in all three places.
    const params = testParams();
    const state = feed(enterRun(params, 1), params, walkSamples(WARMUP_MS + 5000, 6));
    expect(state.latestSample).not.toBeNull();
    expect(state.lock.lastAccurate).not.toBeNull();
    expect(state.run?.reward.filter.anchor).not.toBeNull();
    expect(state.run?.reward.grid.last).not.toBeNull();
    expect(state.run?.reward.grid.lastPoint).not.toBeNull();
  });

  it('strips every coordinate-bearing field before it reaches the envelope', () => {
    const params = testParams();
    const state = feed(enterRun(params, 2), params, walkSamples(WARMUP_MS + 5000, 6));

    const persisted = toPersisted(state, WARMUP_MS + 40000);

    expect(persisted.state.latestSample).toBeNull();
    expect(persisted.state.lock).toEqual({ locked: false, runStart_ms: null, lastAccurate: null });
    expect(persisted.state.run?.reward.filter).toEqual({ anchor: null, pending: [] });
    expect(persisted.state.run?.reward.grid.last).toBeNull();
    expect(persisted.state.run?.reward.grid.lastPoint).toBeNull();
    // distance already earned is not a privacy concern — it survives the strip.
    expect(persisted.state.run?.reward.distance_m).toBe(state.run?.reward.distance_m);
  });

  it('serializes to JSON with no lat/lng/latitude/longitude key and no coordinate value', () => {
    const params = testParams();
    const state = feed(enterRun(params, 3), params, walkSamples(WARMUP_MS + 5000, 6));

    const json = JSON.stringify(toPersisted(state, WARMUP_MS + 40000));

    expect(json).not.toMatch(/"lat":/);
    expect(json).not.toMatch(/"lng":/);
    expect(json).not.toMatch(/"latitude":/);
    expect(json).not.toMatch(/"longitude":/);
    expect(json).not.toContain(String(INSIDE.lat));
    expect(json).not.toContain(String(INSIDE.lng));
    expect(json).not.toContain(String(INSIDE.lat + 0.0001));
    expect(json).not.toContain(String(INSIDE.lng + 0.0001));
  });

  it('round-trips through JSON: the engine resumes and handles a null latestSample', () => {
    const params = testParams();
    const state = feed(enterRun(params, 4), params, walkSamples(WARMUP_MS + 5000, 6));

    const persisted = toPersisted(state, WARMUP_MS + 40000);
    const roundTripped: unknown = JSON.parse(JSON.stringify(persisted));
    const restored = fromPersisted(roundTripped, params);

    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('unreachable');
    expect(restored.state.latestSample).toBeNull();
    expect(restored.state.run?.runId).toBe(state.run?.runId);
    expect(restored.state.run?.reward.distance_m).toBe(state.run?.reward.distance_m);

    // The engine keeps working from here: one more real sample, no throw, no extra event noise.
    const next = sessionStep(
      restored.state,
      {
        type: 'sample',
        sample: { t_ms: WARMUP_MS + 65000, lat: INSIDE.lat, lng: INSIDE.lng, accuracy_m: 6 },
      },
      WARMUP_MS + 65000,
      params,
    );
    expect(next.state.run?.runId).toBe(state.run?.runId);
  });

  it('ignores a coordinate left over in an old blob instead of treating it as corrupt', () => {
    const params = testParams();
    const state = feed(enterRun(params, 5), params, walkSamples(WARMUP_MS + 5000, 6));
    const persisted = toPersisted(state, WARMUP_MS + 40000);

    // Simulate a blob written by a pre-fix client: latestSample and lock.lastAccurate still hold
    // a real fix.
    const stale = {
      ...persisted,
      state: {
        ...persisted.state,
        latestSample: { t_ms: WARMUP_MS + 40000, lat: INSIDE.lat, lng: INSIDE.lng, accuracy_m: 6 },
        lock: {
          locked: false,
          runStart_ms: null,
          lastAccurate: { t_ms: WARMUP_MS + 40000, lat: INSIDE.lat, lng: INSIDE.lng },
        },
      },
    };

    const restored = fromPersisted(JSON.parse(JSON.stringify(stale)), params);

    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('unreachable');
    expect(restored.state.latestSample).toBeNull();
    expect(restored.state.lock.lastAccurate).toBeNull();
  });
});
