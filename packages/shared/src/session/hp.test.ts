// HP engine wired into sessionStep (tech note F06 section 4, 13.3): Grace/speed-lock pauses the
// hit clock, death/recovery, usePotion outside a run, chooseClass, no coordinates after a run
// ends, and readyIn_s on checkin_rejected. Exercises the reducer end to end (run -> gate -> tick
// -> drop -> hit), not the vector-tested pure functions in packages/shared/src/hp.
import { describe, expect, it } from 'vitest';
import type { Polygon } from 'geojson';
import type {
  SessionConfig,
  SessionDungeonRecord,
  SessionEvent,
  SessionParams,
  SessionState,
} from './types';
import { createSession, sessionStep } from './reducer';
import { selectCheckInPreview, selectPlayerView } from './selectors';

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

/** Fixed 300 s hit interval and 100% hit chance (deterministic attempts, not the real balance
 * values): every test below cares about *when* a hit is judged, not the RNG's own draw. */
function testConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
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
        intervalMin_s: 300,
        intervalMax_s: 300,
        intervalDistribution: 'uniform',
        hitChancePerCheck_pct: 100,
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
    ...overrides,
  };
}

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

function testParams(
  configOverrides: Partial<SessionConfig> = {},
  levelRange = { min: 1, max: 60 },
): SessionParams {
  const record: SessionDungeonRecord = {
    id: 'testDungeon',
    verification_mode: 'continuous_gps',
    floor_level: null,
    level_range: levelRange,
    drop_table_id: 'test',
    geometry: SQUARE,
    area_m2: 100,
    opening_hours: ALWAYS_OPEN,
  };
  return { config: testConfig(configOverrides), dungeons: { testDungeon: record } };
}

function walkSamples(startMs: number, count: number) {
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

function feed(state: SessionState, params: SessionParams, samples: ReturnType<typeof walkSamples>) {
  let s = state;
  const events: SessionEvent[] = [];
  for (const sample of samples) {
    const r = sessionStep(s, { type: 'sample', sample }, sample.t_ms, params);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

const WARMUP_MS = 10000;

function enterRun(
  params: SessionParams,
  runSeed: number,
  classId: 'tanker' | 'ranged' | 'support' | 'magic' = 'ranged',
) {
  let state = createSession(0, params);
  state = sessionStep(state, { type: 'chooseClass', classId }, 0, params).state;
  const warmup = feed(state, params, walkSamples(0, 3));
  state = warmup.state;
  const confirmed = sessionStep(
    state,
    { type: 'confirm', dungeonId: 'testDungeon', runSeed },
    WARMUP_MS,
    params,
  );
  return { state: confirmed.state, events: confirmed.events };
}

describe('sessionStep: HP engine (tech note F06 section 4)', () => {
  it('chooseClass: rejects already_chosen, run_active and unknown_class; accepts once', () => {
    const params = testParams();
    let state = createSession(0, params);
    const first = sessionStep(state, { type: 'chooseClass', classId: 'magic' }, 0, params);
    expect(first.events).toEqual([{ type: 'class_chosen', classId: 'magic', at_ms: 0 }]);
    state = first.state;

    const again = sessionStep(state, { type: 'chooseClass', classId: 'tanker' }, 1, params);
    expect(again.events).toEqual([
      { type: 'class_choice_rejected', reason: 'already_chosen', at_ms: 1 },
    ]);

    const unknown = sessionStep(
      createSession(0, params),
      { type: 'chooseClass', classId: 'wizard' as never },
      0,
      params,
    );
    expect(unknown.events).toEqual([
      { type: 'class_choice_rejected', reason: 'unknown_class', at_ms: 0 },
    ]);
  });

  it('confirm rejects no_class before dungeon_closed, and no_hp is unreachable at full HP', () => {
    const params = testParams();
    const state = createSession(0, params);
    const warmed = feed(state, params, walkSamples(0, 3)).state;
    const r = sessionStep(
      warmed,
      { type: 'confirm', dungeonId: 'testDungeon', runSeed: 1 },
      WARMUP_MS,
      params,
    );
    expect(r.events).toEqual([
      {
        type: 'checkin_rejected',
        dungeonId: 'testDungeon',
        reason: 'no_class',
        readyIn_s: null,
        at_ms: WARMUP_MS,
      },
    ]);
  });

  it('readyIn_s on checkin_rejected matches selectCheckInPreview at the same instant', () => {
    const params = testParams();
    let state = createSession(0, params);
    state = sessionStep(state, { type: 'chooseClass', classId: 'ranged' }, 0, params).state;
    // Only 2 of the 3 warm-up samples: the approach chain is short of minContinuousApproach_s (10 s).
    state = feed(state, params, walkSamples(0, 2)).state;
    const now_ms = 5000;
    const preview = selectCheckInPreview(state, 'testDungeon', now_ms, params);
    expect(preview.ok).toBe(false);
    if (preview.ok) throw new Error('unreachable');
    expect(preview.reason).toBe('not_enough_trace');
    expect(preview.readyIn_s).not.toBeNull();

    const r = sessionStep(
      state,
      { type: 'confirm', dungeonId: 'testDungeon', runSeed: 1 },
      now_ms,
      params,
    );
    expect(r.events).toEqual([
      {
        type: 'checkin_rejected',
        dungeonId: 'testDungeon',
        reason: 'not_enough_trace',
        readyIn_s: preview.readyIn_s,
        at_ms: now_ms,
      },
    ]);
  });

  it('Grace pause: no run_hit during the gap, the hit clock resumes where it stopped (spec acceptance 1)', () => {
    const params = testParams();
    let state = enterRun(params, 1).state;
    // 100 s of Active walking (well short of the 300 s hit interval).
    const r1 = feed(state, params, walkSamples(WARMUP_MS + 5000, 20));
    state = r1.state;
    expect(state.run?.status).toBe('active');
    const lastSampleAt_ms = WARMUP_MS + 5000 + 19 * 5000; // WARMUP_MS + 100000

    // 100 s of silence (> maxSamplePairGap_s 30 s, < graceMax_s 180 s): Grace via no_evidence,
    // no Suspended yet.
    const gapEnd_ms = lastSampleAt_ms + 100000;
    for (let t = lastSampleAt_ms + 1000; t <= gapEnd_ms; t += 30000) {
      state = sessionStep(state, { type: 'tick' }, t, params).state;
    }
    expect(state.run?.status).toBe('grace');
    expect(state.run?.exitCause).toBe('no_evidence');

    // Resume: one deep-inside sample is enough after a no_evidence exit (F04-R15 item 7 rule 1).
    // Resuming exactly at `gapEnd_ms` makes the paused duration exactly 100 s (tau does not move
    // at the instant `clockStart` runs, only afterward).
    const resumed = sessionStep(
      state,
      { type: 'sample', sample: { t_ms: gapEnd_ms, ...INSIDE, accuracy_m: 6 } },
      gapEnd_ms,
      params,
    );
    expect(resumed.events.some((e) => e.type === 'run_hit')).toBe(false);
    state = resumed.state;
    expect(state.run?.status).toBe('active');

    // 200 more Active seconds close the 300 s interval (100 before + 200 after the gap); one more
    // `tick` past the exact boundary catches an attempt whose real time lands exactly on the last
    // sample's own `now_ms` (`nextAttemptDue`'s bound is strict `<`, tech note F06 3.3).
    const r2 = feed(state, params, walkSamples(gapEnd_ms + 5000, 40));
    const lastSampleT_ms = gapEnd_ms + 5000 + 39 * 5000;
    const caughtUp = sessionStep(r2.state, { type: 'tick' }, lastSampleT_ms + 1000, params);
    const hitEvents = [...r2.events, ...caughtUp.events].filter((e) => e.type === 'run_hit');
    expect(hitEvents.length).toBeGreaterThanOrEqual(1);
    const hit = hitEvents[0];
    if (hit === undefined || hit.type !== 'run_hit') throw new Error('unreachable');
    // Real elapsed since confirm: 100 (before) + 100 (gap) + 200 (after) = 400 s, exactly the
    // configured 300 s of ACTIVE time plus the 100 s gap (R07: paused, not reset).
    expect(hit.at_ms - WARMUP_MS).toBe(400000);
    // No run_hit fell inside the gap window.
    expect(r1.events.some((e) => e.type === 'run_hit')).toBe(false);
  });

  it('death: auto-retreat off loses the run bag, exp stays, unused inventory potions stay, Recovering starts', () => {
    // A dungeon far above the player's level (1) makes one landed hit enormous (1.25^gap, no cap,
    // F06 R09) so a single fixed-interval attempt is guaranteed to reach HP 0.
    const params = testParams({}, { min: 50, max: 60 });
    let state = enterRun(params, 2).state;
    state = sessionStep(
      state,
      { type: 'setAutoRetreat', enabled: false },
      WARMUP_MS + 1000,
      params,
    ).state;
    expect(state.player.autoRetreatEnabled).toBe(false);

    // Give the player a spare potion that is never touched by the run's own bag (F06 R23, H-E14).
    state = { ...state, player: { ...state.player, inventory: { hpSmall: 1 } } };

    // 300 s of walking closes the fixed hit interval; 100% hit chance guarantees a landed hit.
    const r = feed(state, params, walkSamples(WARMUP_MS + 5000, 61));
    state = r.state;
    const death = r.events.find((e) => e.type === 'run_death');
    expect(death).toBeDefined();
    expect(state.run).toBeNull();
    expect(state.lastSummary?.exitReason).toBe('death');
    expect(state.lastSummary?.lost.length).toBeGreaterThan(0);
    expect(state.lastSummary?.loot.length).toBe(0);
    expect(state.player.inventory).toEqual({ hpSmall: 1 });
    expect(state.player.hp.recovering).toBe(true);
    expect(state.player.hp.value).toBe(0);
  });

  it('recovering player: usePotion revive works only while Recovering, and heals HP potions outside a run', () => {
    const params = testParams();
    let state = createSession(0, params);
    state = sessionStep(state, { type: 'chooseClass', classId: 'ranged' }, 0, params).state;
    state = {
      ...state,
      player: {
        ...state.player,
        hp: { value: 0, anchorAt_ms: 0, recovering: true },
        inventory: { revive: 1, hpSmall: 1 },
      },
    };

    const rejected = sessionStep(state, { type: 'usePotion', itemId: 'hpSmall' }, 0, params);
    // Still recovering: an HP potion works too (R26), it just doesn't clear Recovering by itself
    // unless it crosses the line.
    expect(rejected.events[0]?.type).toBe('potion_used');

    const revived = sessionStep(state, { type: 'usePotion', itemId: 'revive' }, 100, params);
    expect(revived.events.length).toBe(1);
    const ev = revived.events[0];
    expect(ev?.type).toBe('potion_used');
    expect(ev && ev.type === 'potion_used' ? ev.revived : null).toBe(true);
    expect(revived.state.player.hp.recovering).toBe(false);
    expect(revived.state.player.hp.value).toBe(150);
    expect(revived.state.player.inventory).toEqual({ hpSmall: 1 });
  });

  it('usePotion is rejected with run_active while a run is open', () => {
    const params = testParams();
    const state = enterRun(params, 3).state;
    const r = sessionStep(state, { type: 'usePotion', itemId: 'hpSmall' }, WARMUP_MS, params);
    expect(r.events).toEqual([
      { type: 'potion_use_rejected', itemId: 'hpSmall', reason: 'run_active', at_ms: WARMUP_MS },
    ]);
  });

  it('dungeon_exited carries no coordinates and selectPlayerView reflects the ended run', () => {
    const params = testParams();
    let state = enterRun(params, 4).state;
    const r = feed(state, params, walkSamples(WARMUP_MS + 5000, 10));
    state = r.state;
    const exited = sessionStep(state, { type: 'exit' }, WARMUP_MS + 60000, params);
    expect(JSON.stringify(exited.events)).not.toMatch(/"lat"|"lng"/);
    expect(JSON.stringify(exited.state.lastSummary)).not.toMatch(/"lat"|"lng"/);
    expect(JSON.stringify(exited.state.player)).not.toMatch(/"lat"|"lng"/);
    expect(exited.state.run).toBeNull();
    const view = selectPlayerView(exited.state, WARMUP_MS + 60000, params);
    expect(view.classId).toBe('ranged');
    expect(view.hp).toBeGreaterThan(0);
    expect(view.recovering).toBe(false);
  });

  it('config-driven: changing combat.attackCheck.hitChancePerCheck_pct to 0 means no hit ever lands', () => {
    const params = testParams({
      combat: {
        ...testConfig().combat,
        attackCheck: {
          intervalMin_s: 300,
          intervalMax_s: 300,
          intervalDistribution: 'uniform',
          hitChancePerCheck_pct: 0,
        },
      },
    });
    const state = enterRun(params, 5).state;
    const r = feed(state, params, walkSamples(WARMUP_MS + 5000, 200));
    expect(r.events.some((e) => e.type === 'run_hit')).toBe(false);
  });
});
