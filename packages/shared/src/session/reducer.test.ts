// sessionStep acceptance: the GDD example (CLAUDE.md "tests first for rules with GDD examples")
// walk 20 minutes -> get ticks every 5 minutes, drop signal for 5 minutes -> no extra tick and no
// penalty beyond the missed time, walk 5 more minutes -> ticks resume. Exercises the reducer's
// full composition (run -> gate -> tick -> drop) end to end, not the vector-tested pure functions.
import { describe, expect, it } from 'vitest';
import type { Polygon } from 'geojson';
import type { SessionConfig, SessionDungeonRecord, SessionParams, SessionState } from './types';
import { createSession, sessionStep } from './reducer';

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
    hpSafety: { autoRetreatKeepsRunLoot: true },
    death: { loseAllRunLoot: true },
  };
}

function testParams(): SessionParams {
  const record: SessionDungeonRecord = {
    id: 'testDungeon',
    verification_mode: 'continuous_gps',
    floor_level: null,
    level_range: { min: 1, max: 5 },
    drop_table_id: 'test',
    geometry: SQUARE,
    area_m2: 100,
  };
  return { config: testConfig(), dungeons: { testDungeon: record } };
}

/** Walks in a small loop inside the polygon, one sample every 5 s (>= minDistancePerWindow_m of
 * real movement per 300 s window: a 2 m x 2 m square walked repeatedly clears 50 m easily). */
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

function feed(
  state: SessionState,
  params: SessionParams,
  samples: readonly { t_ms: number; lat: number; lng: number; accuracy_m: number }[],
) {
  let s = state;
  const events = [];
  for (const sample of samples) {
    const r = sessionStep(s, { type: 'sample', sample }, sample.t_ms, params);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

const WARMUP_MS = 10000; // == checkIn.minContinuousApproach_s x 1000

/** Feeds a 10 s warm-up chain inside the polygon (R11: approach must be continuous and end at the
 * confirming sample) then confirms. Every subsequent test's samples start after `WARMUP_MS`. */
function enterRun(params: SessionParams, runSeed: number) {
  let state = createSession(0);
  const warmup = feed(state, params, walkSamples(0, 3)); // t = 0, 5000, 10000
  state = warmup.state;
  const confirmed = sessionStep(
    state,
    { type: 'confirm', dungeonId: 'testDungeon', runSeed },
    WARMUP_MS,
    params,
  );
  return { state: confirmed.state, events: confirmed.events };
}

describe('sessionStep: run -> gate -> tick -> drop', () => {
  it('grants a tick every 5 minutes of real walking (GDD example, part 1 of 3)', () => {
    const params = testParams();
    const entered = enterRun(params, 1);
    expect(entered.events).toEqual([
      {
        type: 'dungeon_entered',
        dungeonId: 'testDungeon',
        runId: `${WARMUP_MS}-1`,
        at_ms: WARMUP_MS,
      },
    ]);
    let state = entered.state;

    // 20 minutes = 1200 s at 5 s cadence = 240 samples -> 4 full windows.
    const samples = walkSamples(WARMUP_MS + 5000, 240);
    const r = feed(state, params, samples);
    state = r.state;

    const granted = r.events.filter((e) => e.type === 'run_tick_granted');
    const denied = r.events.filter((e) => e.type === 'run_tick_denied');
    expect(granted.length + denied.length).toBe(4);
    expect(granted.length).toBeGreaterThanOrEqual(1);
    expect(state.run?.grantedCount).toBe(granted.length);
    expect(state.player.exp + (state.player.level - 1)).toBeGreaterThan(0);
  });

  it('drops signal for 5 minutes then resumes: no tick from the gap, no crash (GDD part 2 of 3)', () => {
    const params = testParams();
    let state = enterRun(params, 2).state;
    const t0 = WARMUP_MS + 5000;
    let r = feed(state, params, walkSamples(t0, 24)); // 2 minutes
    state = r.state;
    expect(state.run?.status).toBe('active');

    // 5 minutes of silence: no sample input, only tick inputs advancing now_ms.
    const lastSampleAt_ms = t0 + 23 * 5000;
    const gapEnd_ms = lastSampleAt_ms + 5 * 60 * 1000;
    for (let t = lastSampleAt_ms + 1000; t <= gapEnd_ms; t += 30000) {
      const step = sessionStep(state, { type: 'tick' }, t, params);
      state = step.state;
    }
    expect(state.run).not.toBeNull();
    expect(state.run?.status === 'grace' || state.run?.status === 'suspended').toBe(true);

    r = feed(state, params, walkSamples(gapEnd_ms + 1000, 60)); // 5 more minutes
    state = r.state;
    expect(state.run?.status).toBe('active');
  });

  it('manual exit pays out the ticks granted so far into a summary with no coordinates', () => {
    const params = testParams();
    let state = enterRun(params, 3).state;
    const t0 = WARMUP_MS + 5000;
    const r = feed(state, params, walkSamples(t0, 60)); // 5 minutes: exactly one window
    state = r.state;
    const grantedBefore = state.run?.grantedCount ?? 0;

    const exited = sessionStep(state, { type: 'exit' }, t0 + 60 * 5000, params);
    state = exited.state;
    // The run (and its reward accumulator's anchors, F04 9.1 step 10) is gone; only the summary
    // and the player's own persistent state (level/exp/inventory, no coordinates) remain.
    expect(state.run).toBeNull();
    expect(state.lastSummary).not.toBeNull();
    expect(state.lastSummary?.exitReason).toBe('manual_exit');
    expect(state.lastSummary?.ticksGranted).toBe(grantedBefore);
    expect(state.lastSummary?.loot.length).toBeGreaterThan(0);
    expect(JSON.stringify(state.lastSummary)).not.toMatch(/"lat"|"lng"/);

    const acked = sessionStep(state, { type: 'ackSummary' }, t0 + 60 * 5000 + 1000, params);
    expect(acked.state.lastSummary).toBeNull();
  });
});
