import { describe, expect, it } from 'vitest';
import type {
  SessionConfig,
  SessionDungeonRecord,
  SessionParams,
} from '@keep-walking/shared/session';
import { createMemoryStorage } from '../storage/local-store';
import { createSessionEngine } from './engine';
import { buildSessionParams } from './config';
import { loadDungeonArtifact } from '../dungeons/artifact';

const NOOP_QUOTA_DEPS = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

interface RecordedEvent {
  readonly name: string;
  readonly properties: Record<string, unknown> | undefined;
}

function fakeRecorder(): {
  records: RecordedEvent[];
  record: (n: string, p?: Record<string, unknown>) => void;
} {
  const records: RecordedEvent[] = [];
  return { records, record: (name, properties) => records.push({ name, properties }) };
}

describe('createSessionEngine', () => {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);
  const dungeon = artifact.dungeons[0];
  if (dungeon === undefined) throw new Error('fixture: artifact has no dungeons');
  const [lng, lat] = dungeon.geometry.coordinates[0]?.[0] as unknown as readonly [number, number];

  it('boots fresh with no stored session and no crash', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(engine.getState().run).toBeNull();
  });

  it('previewCheckIn never mutates dispatch-visible state', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    const before = JSON.stringify(engine.getState());
    engine.previewCheckIn(dungeon.id, now_ms);
    expect(JSON.stringify(engine.getState())).toBe(before);
  });

  it('records checkin_rejected via dispatch(confirm) before approach is satisfied', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    engine.dispatch({ type: 'confirm', dungeonId: dungeon.id, runSeed: 1 }, now_ms);
    expect(recorder.records.some((r) => r.name === 'checkin_rejected')).toBe(true);
  });

  it('persists after dispatch (survives a fresh engine over the same storage)', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    const reopened = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(reopened.getState().player.level).toBe(engine.getState().player.level);
  });

  it('testForceClassId (e2e-only hook) sets classId once at boot for a fresh player', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      {
        storage,
        quotaDeps: NOOP_QUOTA_DEPS,
        record: recorder.record,
        testForceClassId: 'tanker',
      },
      now_ms,
    );
    expect(engine.getState().player.classId).toBe('tanker');
  });

  it('testForceClassId never overwrites a class the loaded player already chose', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const first = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record, testForceClassId: 'magic' },
      now_ms,
    );
    expect(first.getState().player.classId).toBe('magic');
    const reopened = createSessionEngine(
      params,
      {
        storage,
        quotaDeps: NOOP_QUOTA_DEPS,
        record: recorder.record,
        testForceClassId: 'tanker',
      },
      now_ms,
    );
    expect(reopened.getState().player.classId).toBe('magic');
  });

  it('discards a corrupt stored session instead of throwing, and records session_state_discarded', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', '{not json');
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(engine.getState().run).toBeNull();
    expect(recorder.records.some((r) => r.name === 'session_state_discarded')).toBe(true);
  });

  // P2-X38 (docs/tech/F06-hp-damage-onboarding.md 8.4 step 4): withdraw-consent's own state purge.
  describe('purgeLocation', () => {
    it('clears the latest sample, emits no SessionEvent, and persists immediately', () => {
      const storage = createMemoryStorage();
      const recorder = fakeRecorder();
      const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
      const engine = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      engine.dispatch(
        { type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } },
        now_ms,
      );
      expect(engine.getState().latestSample).not.toBeNull();
      recorder.records.length = 0;

      engine.purgeLocation();

      expect(engine.getState().latestSample).toBeNull();
      expect(recorder.records).toEqual([]);
      // Re-opening from storage proves it actually persisted, not just the in-memory state.
      const reopened = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      expect(reopened.getState().latestSample).toBeNull();
    });

    it('never touches player/lastSummary (tech note 8.4 step 4)', () => {
      const storage = createMemoryStorage();
      const recorder = fakeRecorder();
      const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
      const engine = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      const playerBefore = JSON.stringify(engine.getState().player);
      engine.purgeLocation();
      expect(JSON.stringify(engine.getState().player)).toBe(playerBefore);
    });
  });
});

// F06-TG-02 (product/telemetry-events.md, tech note F06 10.1): `onboarding_first_reward_granted`
// paired with the first-ever `run_tick_granted`. Same synthetic-dungeon/config technique
// `packages/shared/src/session/reducer.test.ts#testParams` uses (short, self-contained values —
// never the real 300 s/50 m production gate, which would make this test slow for no extra
// coverage) so this test drives a real `sessionStep` tick through the actual engine, not a fake.
describe('createSessionEngine — F06-TG-02 onboarding_first_reward_granted', () => {
  // Same cast convention `session/config.ts` uses for real dungeon geometry: apps/client has no
  // direct dependency on the `geojson` package (its types are only ever consumed structurally,
  // through `@keep-walking/shared/session`'s own `SessionDungeonRecord['geometry']`).
  const SQUARE = {
    type: 'Polygon' as const,
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

  function testConfig(): SessionConfig {
    const rarityRoll = (rarity: string) => ({
      roll: 'rarity',
      rarity,
      pool: [{ item: `${rarity}Item`, weight: 1 }],
    });
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
            rolls: [
              rarityRoll('common'),
              rarityRoll('uncommon'),
              rarityRoll('rare'),
              rarityRoll('epic'),
              rarityRoll('legendary'),
            ],
          },
        },
        items: {
          commonItem: { rarity: 'common' },
          uncommonItem: { rarity: 'uncommon' },
          rareItem: { rarity: 'rare' },
          epicItem: { rarity: 'epic' },
          legendaryItem: { rarity: 'legendary' },
        },
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

  function testParams(): SessionParams {
    const record: SessionDungeonRecord = {
      id: 'testDungeon',
      verification_mode: 'continuous_gps',
      floor_level: null,
      level_range: { min: 1, max: 5 },
      drop_table_id: 'test',
      geometry: SQUARE as unknown as SessionDungeonRecord['geometry'],
      area_m2: 100,
      opening_hours: ALWAYS_OPEN,
    };
    return { config: testConfig(), dungeons: { testDungeon: record } };
  }

  function walkSamples(
    startMs: number,
    count: number,
  ): { t_ms: number; lat: number; lng: number; accuracy_m: number }[] {
    const out: { t_ms: number; lat: number; lng: number; accuracy_m: number }[] = [];
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

  const WARMUP_MS = 10000; // == checkIn.minContinuousApproach_s x 1000

  it('fires alongside the first-ever run_tick_granted, at the same moment, with no coordinate', () => {
    const params = testParams();
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const engine = createSessionEngine(
      params,
      {
        storage,
        quotaDeps: NOOP_QUOTA_DEPS,
        record: recorder.record,
        // A fixed, known "first opened the app" instant — 0 ms before this test's own clock starts
        // — so `minutes_since_first_open_bucket` is deterministic (WARMUP_MS + one full 300 s
        // window = 310_000 ms = ~5.17 min elapsed, inside the `0-10` bucket).
        getFirstOpenAt_ms: () => 0,
      },
      0,
    );
    engine.dispatch({ type: 'chooseClass', classId: 'ranged' }, 0);
    for (const sample of walkSamples(0, 3)) {
      engine.dispatch({ type: 'sample', sample }, sample.t_ms);
    }
    engine.dispatch({ type: 'confirm', dungeonId: 'testDungeon', runSeed: 1 }, WARMUP_MS);
    recorder.records.length = 0; // only the tick window's own records matter below

    // 300 s at 5 s cadence = 60 samples = exactly one reward-tick window.
    let firstEverAt_ms: number | undefined;
    for (const sample of walkSamples(WARMUP_MS + 5000, 60)) {
      const events = engine.dispatch({ type: 'sample', sample }, sample.t_ms);
      const granted = events.find((e) => e.type === 'run_tick_granted');
      if (granted !== undefined && granted.type === 'run_tick_granted' && granted.firstEver) {
        firstEverAt_ms = granted.at_ms;
      }
    }
    expect(firstEverAt_ms).not.toBeUndefined();

    const tickGrantedRecords = recorder.records.filter((r) => r.name === 'run_tick_granted');
    const firstRewardRecords = recorder.records.filter(
      (r) => r.name === 'onboarding_first_reward_granted',
    );
    expect(tickGrantedRecords.length).toBeGreaterThanOrEqual(1);
    // Exactly one pairing, no matter how many ticks this window happens to produce (only the
    // firstEver one gets a pair).
    expect(firstRewardRecords).toHaveLength(1);
    expect(firstRewardRecords[0]).toEqual({
      name: 'onboarding_first_reward_granted',
      properties: {
        dungeon_id: 'testDungeon',
        minutes_since_first_open_bucket: '0-10',
        class: 'ranged',
      },
    });
    // No lat/lng/coordinate-like property anywhere on either record (C2-3).
    for (const record of [...tickGrantedRecords, ...firstRewardRecords]) {
      const keys = Object.keys(record.properties ?? {});
      expect(keys).not.toContain('lat');
      expect(keys).not.toContain('lng');
    }
  });

  it('never fires a second time once first_reward has already happened', () => {
    const params = testParams();
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record, getFirstOpenAt_ms: () => 0 },
      0,
    );
    engine.dispatch({ type: 'chooseClass', classId: 'ranged' }, 0);
    for (const sample of walkSamples(0, 3)) {
      engine.dispatch({ type: 'sample', sample }, sample.t_ms);
    }
    engine.dispatch({ type: 'confirm', dungeonId: 'testDungeon', runSeed: 1 }, WARMUP_MS);
    // Two full windows: the first tick is firstEver, the second (same run) is not.
    for (const sample of walkSamples(WARMUP_MS + 5000, 120)) {
      engine.dispatch({ type: 'sample', sample }, sample.t_ms);
    }
    const firstRewardRecords = recorder.records.filter(
      (r) => r.name === 'onboarding_first_reward_granted',
    );
    expect(firstRewardRecords).toHaveLength(1);
  });
});
