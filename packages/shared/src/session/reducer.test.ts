// sessionStep acceptance: the GDD example (CLAUDE.md "tests first for rules with GDD examples")
// walk 20 minutes -> get ticks every 5 minutes, drop signal for 5 minutes -> no extra tick and no
// penalty beyond the missed time, walk 5 more minutes -> ticks resume. Exercises the reducer's
// full composition (run -> gate -> tick -> drop) end to end, not the vector-tested pure functions.
import { describe, expect, it } from 'vitest';
import type { Polygon } from 'geojson';
import type { SessionConfig, SessionDungeonRecord, SessionParams, SessionState } from './types';
import { createSession, purgeLocationData, sessionStep } from './reducer';
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
    openingHours: { utcOffset_min: 420, closingSoonNotice_s: 600 },
    combat: { monsterAttack: { zoneLevelFrom: 'playerLevelClampedToRange' } },
  };
}

/** Open every day, all day (tech note F04 8.1 `[[0, 1440]]`): most tests are not about opening
 * hours at all. */
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

/** `testParams()` with `opening_hours` overridden (P2-X10 opening-hours tests). */
function testParamsWithHours(opening_hours: SessionDungeonRecord['opening_hours']): SessionParams {
  const params = testParams();
  const base = params.dungeons['testDungeon'];
  if (base === undefined) throw new Error('unreachable: testParams() always sets testDungeon');
  const record: SessionDungeonRecord = { ...base, opening_hours };
  return { ...params, dungeons: { testDungeon: record } };
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

describe('sessionStep: F05 3.5 scratch accumulator replays a backdated return (P2-X10)', () => {
  it('counts the distance walked back in while the return is still pending confirmation', () => {
    const params = testParams();
    let state = enterRun(params, 4).state;

    // Leave far enough, twice (edgeHysteresisSamples = 2), to confirm Grace at the first outside
    // sample (F04 R14 backdating): t = 15000.
    const OUTSIDE = { lat: 13.76, lng: 100.5015 };
    let r = feed(state, params, [
      { t_ms: WARMUP_MS + 5000, ...OUTSIDE, accuracy_m: 6 },
      { t_ms: WARMUP_MS + 10000, ...OUTSIDE, accuracy_m: 6 },
    ]);
    state = r.state;
    expect(state.run?.status).toBe('grace');
    expect(state.run?.exitStartedAt_ms).toBe(WARMUP_MS + 5000);
    expect(state.run?.reward.distance_m).toBe(0);

    // Return: two inside fixes ~55 m apart (under the 25 km/h speed-lock ceiling at this pace),
    // confirming Active backdated to the first (t = 30000). Without the F05 3.5 scratch
    // accumulator this pair would never reach `run.reward` at all (P2-F05-T08's known gap).
    const A = { lat: 13.7515, lng: 100.5015 };
    const B = { lat: 13.752, lng: 100.5015 };
    r = feed(state, params, [
      { t_ms: WARMUP_MS + 20000, ...A, accuracy_m: 6 },
      { t_ms: WARMUP_MS + 29000, ...B, accuracy_m: 6 },
    ]);
    state = r.state;

    expect(state.run?.status).toBe('active');
    expect(state.run?.clock.runningSince_ms).toBe(WARMUP_MS + 20000);
    expect(state.run?.rewardScratch).toBeNull();
    expect(state.run?.scratchClosed).toEqual([]);
    // The replayed pair's distance is in `main` now, not lost to the pending set (F05 3.5).
    expect(state.run?.reward.distance_m).toBeGreaterThan(0);
  });
});

const CLOSED_ALL_WEEK = {
  weekly: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] },
};

describe('sessionStep: opening hours (tech note F04 section 8, P2-X10)', () => {
  it('rejects confirm with dungeon_closed when the dungeon is closed', () => {
    const params = testParamsWithHours(CLOSED_ALL_WEEK);
    let state = createSession(0);
    const warmup = feed(state, params, walkSamples(0, 3));
    state = warmup.state;
    const confirmed = sessionStep(
      state,
      { type: 'confirm', dungeonId: 'testDungeon', runSeed: 1 },
      WARMUP_MS,
      params,
    );
    expect(confirmed.events).toEqual([
      { type: 'checkin_rejected', dungeonId: 'testDungeon', reason: 'dungeon_closed', at_ms: WARMUP_MS },
    ]);
    expect(confirmed.state.run).toBeNull();
  });

  it('fires dungeon_closing_soon, then ends the run dungeon_closed at close (D-059 partial tick)', () => {
    // At t_ms = 0, utcOffset_min = 420 (testConfig): local time is exactly 07:00 on a Thursday
    // (weekday "4"). An interval [420, 480) minutes (07:00-08:00) closes at t_ms = 3,600,000.
    // graceMax_s/suspendedMax_s are widened here only: this test drives time with `tick` alone
    // (no samples for over an hour) and is about opening hours, not the no_evidence timeout.
    const base = testParamsWithHours({
      weekly: { '1': [], '2': [], '3': [], '4': [[420, 480]], '5': [], '6': [], '7': [] },
    });
    const params: SessionParams = {
      ...base,
      config: {
        ...base.config,
        runState: { ...base.config.runState, graceMax_s: 10_000_000, suspendedMax_s: 10_000_000 },
      },
    };
    const entered = enterRun(params, 2);
    let state = entered.state;
    expect(state.run?.closesAt_ms).toBe(3_600_000);

    const noticed = sessionStep(state, { type: 'tick' }, 3_000_000, params);
    state = noticed.state;
    expect(noticed.events).toContainEqual({
      type: 'dungeon_closing_soon',
      dungeonId: 'testDungeon',
      closesIn_s: 600,
      at_ms: 3_000_000,
    });
    expect(state.run).not.toBeNull();

    const closed = sessionStep(state, { type: 'tick' }, 3_600_000, params);
    expect(closed.state.run).toBeNull();
    expect(closed.state.lastSummary?.exitReason).toBe('dungeon_closed');
    const exitedEvent = closed.events.find((e) => e.type === 'dungeon_exited');
    expect(exitedEvent).toBeDefined();
    expect(exitedEvent && 'at_ms' in exitedEvent ? exitedEvent.at_ms : null).toBe(3_600_000);
  });
});

describe('sessionStep: toPersisted / fromPersisted (tech note F04 2.1, 10.1, 10.2, P2-X10)', () => {
  it('round-trips an active run through JSON with no coordinates lost, pre reset', () => {
    const params = testParams();
    const entered = enterRun(params, 5).state;
    const withSample = feed(entered, params, walkSamples(WARMUP_MS + 5000, 4)).state;

    const persisted = toPersisted(withSample, WARMUP_MS + 25000);
    const roundTripped: unknown = JSON.parse(JSON.stringify(persisted));
    const restored = fromPersisted(roundTripped, params);

    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('unreachable');
    expect(restored.state.run?.runId).toBe(withSample.run?.runId);
    expect(restored.state.run?.reward.distance_m).toBe(withSample.run?.reward.distance_m);
    expect(restored.state.pre).toEqual({ chainStartAt_ms: null, lastAt_ms: null, outsideSeenAt_ms: {} });
  });

  it('discards a run whose dungeon is not in the current artifact (unknown_dungeon)', () => {
    const params = testParams();
    const entered = enterRun(params, 6).state;
    const persisted = toPersisted(entered, WARMUP_MS);

    const emptyParams: SessionParams = { ...params, dungeons: {} };
    const restored = fromPersisted(JSON.parse(JSON.stringify(persisted)), emptyParams);
    expect(restored).toEqual({ ok: false, reason: 'unknown_dungeon' });
  });

  it('discards a schemaVersion this build does not know (schema_mismatch)', () => {
    const params = testParams();
    const persisted = toPersisted(createSession(0), 0);
    const wrongVersion = { ...persisted, schemaVersion: 2 };
    expect(fromPersisted(wrongVersion, params)).toEqual({ ok: false, reason: 'schema_mismatch' });
  });

  it('discards a structurally malformed value (corrupt)', () => {
    const params = testParams();
    expect(fromPersisted({ not: 'a session' }, params)).toEqual({ ok: false, reason: 'corrupt' });
    expect(fromPersisted(null, params)).toEqual({ ok: false, reason: 'corrupt' });
  });
});

describe('sessionStep: D-112 fail-closed guard (balance-model 18.6, P2-X10)', () => {
  it('throws on load when combat.monsterAttack.zoneLevelFrom is not the implemented rule', () => {
    const params = testParams();
    const badParams: SessionParams = {
      ...params,
      config: {
        ...params.config,
        combat: { monsterAttack: { zoneLevelFrom: 'levelRangeMidpointRounded' } },
      },
    };
    expect(() => sessionStep(createSession(0), { type: 'tick' }, 0, badParams)).toThrow(RangeError);
  });
});

describe('sessionStep: F04-R15 item 7, the return after no_evidence (tech note F06 15, S-1/S-2)', () => {
  const OUTSIDE = { lat: 13.76, lng: 100.5015 };
  const INSIDE_DEEP = { lat: 13.7515, lng: 100.5015 };

  it('S-1 regression: a genuinely-outside s1 needs a full hysteresis set to return, not one more sample', () => {
    for (const order of ['sample-first', 'tick-first'] as const) {
      const params = testParams();
      let state = enterRun(params, order === 'sample-first' ? 10 : 11).state;
      state = feed(state, params, [{ t_ms: WARMUP_MS + 5000, ...INSIDE_DEEP, accuracy_m: 6 }]).state;
      const tLast = WARMUP_MS + 5000;
      const s1_ms = tLast + 40000; // > maxSamplePairGap_s (30 s): a real gap.

      if (order === 'tick-first') {
        state = sessionStep(state, { type: 'tick' }, s1_ms, params).state;
        expect(state.run?.status).toBe('grace');
        expect(state.run?.exitStartedAt_ms).toBe(tLast);
      }
      // s1: outside. Rule 2 (F04-R15 item 7): stays Grace, exitStartedAt_ms unchanged.
      state = feed(state, params, [{ t_ms: s1_ms, ...OUTSIDE, accuracy_m: 6 }]).state;
      expect(state.run?.status).toBe('grace');
      expect(state.run?.exitStartedAt_ms).toBe(tLast);

      // One more deep-inside sample is NOT a full hysteresis set (edgeHysteresisSamples = 2):
      // must NOT return to Active (this is exactly bug S-1).
      state = feed(state, params, [{ t_ms: s1_ms + 5000, ...INSIDE_DEEP, accuracy_m: 6 }]).state;
      expect(state.run?.status).toBe('grace');

      // A second deep-inside sample completes the set and returns, backdated to its first sample.
      state = feed(state, params, [{ t_ms: s1_ms + 10000, ...INSIDE_DEEP, accuracy_m: 6 }]).state;
      expect(state.run?.status).toBe('active');
    }
  });

  it('S-1 rule 1: a deep-inside s1 alone returns to Active immediately, no hysteresis needed', () => {
    const params = testParams();
    let state = enterRun(params, 12).state;
    state = feed(state, params, [{ t_ms: WARMUP_MS + 5000, ...INSIDE_DEEP, accuracy_m: 6 }]).state;
    const s1_ms = WARMUP_MS + 5000 + 40000;
    const r = feed(state, params, [{ t_ms: s1_ms, ...INSIDE_DEEP, accuracy_m: 6 }]);
    expect(r.state.run?.status).toBe('active');
    expect(r.events).toContainEqual({
      type: 'run_state_changed',
      from: 'grace',
      to: 'active',
      cause: 'returned',
      at_ms: s1_ms,
    });
  });

  it('S-2 regression: a sample arriving before any tick still settles the gap (no stuck Active)', () => {
    const params = testParams();
    let state = enterRun(params, 13).state;
    state = feed(state, params, [{ t_ms: WARMUP_MS + 5000, ...INSIDE_DEEP, accuracy_m: 6 }]).state;
    // A 100 s gap (> maxSamplePairGap_s, < graceMax_s so it never times out either way), then a
    // sample arrives with no `tick` in between (P2-F06-T30-4 scenario: a resumed watchPosition
    // callback racing a sleeping timer).
    const s1_ms = WARMUP_MS + 5000 + 100000;
    const r = feed(state, params, [{ t_ms: s1_ms, ...INSIDE_DEEP, accuracy_m: 6 }]);
    // Rule 1 (F04-R15 item 7) returns it to Active right away either way; without the S-2 fix the
    // Grace detour (and its `no_evidence` event) would never happen at all, because
    // `processTimeline` only ran after `handleSample` had already fed this sample as if evidence
    // were continuous.
    expect(r.state.run?.status).toBe('active');
    expect(r.events.some((e) => e.type === 'run_state_changed' && e.cause === 'no_evidence')).toBe(
      true,
    );
  });
});

describe('purgeLocationData (tech note F06 8.4 step 4)', () => {
  it('clears pre, lock and latestSample but keeps player, lastSummary and clock.lastNow_ms', () => {
    const params = testParams();
    const entered = enterRun(params, 20).state;
    const withSample = feed(entered, params, walkSamples(WARMUP_MS + 5000, 3)).state;
    const exited = sessionStep(withSample, { type: 'exit' }, WARMUP_MS + 20000, params).state;
    expect(exited.run).toBeNull();

    const purged = purgeLocationData(exited);
    expect(purged.pre).toEqual({ chainStartAt_ms: null, lastAt_ms: null, outsideSeenAt_ms: {} });
    expect(purged.lock).toEqual({ locked: false, runStart_ms: null, lastAccurate: null });
    expect(purged.latestSample).toBeNull();
    expect(purged.player).toBe(exited.player);
    expect(purged.lastSummary).toBe(exited.lastSummary);
    expect(purged.clock.lastNow_ms).toBe(exited.clock.lastNow_ms);
    expect(JSON.stringify(purged)).not.toMatch(/"lat"|"lng"/);
  });
});
