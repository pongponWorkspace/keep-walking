// P2-X34 / BUG-P2-002 (GD B-03, F04-R07(2)/E5 `teleportIntoPolygonAllowed: false`): a
// session-level regression, replaying the two committed traces sample-by-sample through the real
// public entry point (`createSession`/`sessionStep`, never an internal `run`/`reward` function),
// the same way qa/tests/F04/session-checkin-lifecycle.test.ts does — that file is qa-tester's
// (outside this task's `writes`), so this is backend-programmer's own proof the fix holds at the
// `sessionStep` level, independent of QA's harness.
//
// `synthetic-teleport-spoof-01.trace.json`: stand ~1.3 km from the test rectangle for 90 s, one
// 1-second-gap fix teleports into the middle of it (4,904 km/h, far past `outlierSpeed_kmh`), then
// a legitimate 3-minute loop inside. Must stay `no_approach_from_outside` forever — the teleported
// fix must never count as a genuine "seen from outside" sighting.
// `synthetic-walk-in-01.trace.json`: a real, continuous walk from outside the same rectangle to
// its middle. Must still reach `ok: true` — the fix below must not cost a legitimate approach
// anything.
import { describe, expect, it } from 'vitest';
import type { Polygon } from 'geojson';
import type { SessionConfig, SessionDungeonRecord, SessionParams } from './types';
import { createSession, sessionStep } from './reducer';
import { selectCheckInPreview } from './selectors';

// Raw-text glob (`packages/shared/tsconfig.json` intentionally has no Node types, ADR 0003 8.3),
// the same pattern `formulas/vectors.test.ts` already uses for these same fixture files.
const traceRaw = import.meta.glob<string>('../../../../data/gps-traces/synthetic/*.trace.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});

interface TraceFileSample {
  readonly t: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
}
interface TraceFile {
  readonly samples: readonly TraceFileSample[];
}

function loadTrace(name: string): TraceFile {
  const path = `../../../../data/gps-traces/synthetic/${name}`;
  const raw = traceRaw[path];
  if (raw === undefined) throw new Error(`no trace fixture at ${path}`);
  return JSON.parse(raw) as TraceFile;
}

const DUNGEON_ID = 'test-rect';

// Same rectangle `tools/traces/src/places.ts#TEST_RECT` uses (the geometry every committed trace
// in this file was generated against) — not imported from `tools/` (ADR 0001: apps/*, packages/*
// must not depend on tools/*), just the same four numbers.
const TEST_RECT_POLYGON: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [100.5662, 13.7293],
      [100.5683, 13.7293],
      [100.5683, 13.7317],
      [100.5662, 13.7317],
      [100.5662, 13.7293],
    ],
  ],
};

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

/** The real Phase 2 anti-cheat/movement-gate numbers (`config/balance/{dungeons,anticheat}.json`),
 * not the looser test-only values `reducer.test.ts`'s own `testConfig()` uses — this file exists
 * specifically to prove the fix against the thresholds that actually ship
 * (`teleportIntoPolygonAllowed: false`, `outlierSpeed_kmh: 60`, `outlierReanchorSamples: 5`).
 * Everything outside `movementGate`/`checkIn`/`speedLock`/`openingHours` is a structurally valid
 * placeholder: driving only `{type:'sample',...}` inputs (no `confirm`, no run) never reads combat/
 * classes/economy/progression/hp, so their exact values do not matter here. */
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
    checkIn: { minContinuousApproach_s: 60, maxAccuracy_m: 30, teleportIntoPolygonAllowed: false },
    speedLock: { speedLock_kmh: 25, lockSustained_s: 15, unlockSustained_s: 60 },
    drops: {
      smallDungeonMaxArea_m2: 1,
      dropTables: { test: { preset: 'test', rolls: [] } },
      items: {},
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
    id: DUNGEON_ID,
    verification_mode: 'continuous_gps',
    floor_level: null,
    level_range: { min: 1, max: 60 },
    drop_table_id: 'test',
    geometry: TEST_RECT_POLYGON,
    area_m2: 10_000,
    opening_hours: ALWAYS_OPEN,
  };
  return { config: testConfig(), dungeons: { [DUNGEON_ID]: record } };
}

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0); // an arbitrary Monday, open all day

/** Feeds every sample of a committed trace through the real `sessionStep` entry point, in order,
 * then reads `selectCheckInPreview` at the trace's last sample. */
function checkInPreviewAfterTrace(traceName: string) {
  const trace = loadTrace(traceName);
  const params = testParams();
  let state = createSession(START_EPOCH_MS, params);
  for (const s of trace.samples) {
    const sample = { t_ms: START_EPOCH_MS + s.t, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy };
    state = sessionStep(state, { type: 'sample', sample }, sample.t_ms, params).state;
  }
  const last = trace.samples.at(-1);
  if (last === undefined) throw new Error(`${traceName}: no samples`);
  const now_ms = START_EPOCH_MS + last.t;
  return selectCheckInPreview(state, DUNGEON_ID, now_ms, params);
}

describe('sessionStep: check-in approach evidence rejects a teleport (P2-X34, BUG-P2-002)', () => {
  it('synthetic-teleport-spoof-01: stays no_approach_from_outside through the real sessionStep path', () => {
    const preview = checkInPreviewAfterTrace('synthetic-teleport-spoof-01.trace.json');
    expect(preview).toEqual({ ok: false, reason: 'no_approach_from_outside', readyIn_s: null });
  });

  it('synthetic-walk-in-01 (control): a real walk-in still reaches ok:true', () => {
    const preview = checkInPreviewAfterTrace('synthetic-walk-in-01.trace.json');
    expect(preview).toEqual({ ok: true });
  });
});
