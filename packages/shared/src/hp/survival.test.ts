// D-020 survival time (tech note F06 13.1 "survival D-020 (engine)"): the closed-form formulas
// (`hitsToThreshold`, `expectedSurvival_min`) already have their own vectors in damage.json
// (`survivalMinutes`); this file instead drives the actual RNG-based engine (`applyAttempt`,
// `streamRng` via `hitAttempt`) over many seeds and checks the *engine's* statistical mean matches
// the closed form — the point of this test is that `resolveHit` + the hit clock, not just the
// damage formula, reproduce "~45 minutes to auto-retreat at damage x1.0" (D-020) and "~27.8
// minutes solo non-Tanker" (D-020, missing-Tanker debuff, D-038 B's vitPotionEfficiency change
// does not affect this: no potions are carried in this build).
import { describe, expect, it } from 'vitest';
import { applyAttempt, runHpInit } from './attempt';
import type { AttemptContext } from './attempt';
import type { HpParams } from './params';

const MS_PER_MINUTE = 60000;
const SEED_COUNT = 2000;
const TOLERANCE_RATIO = 0.02;

/** Level-25 balanced build (tech note F06 13.1): maxHp 3,112.5, DEF 286.25, Z 25 (matched level,
 * no gap), auto-retreat on, no potions. `roles.tanker.base_pct = 0` forces `tankerBuff_pct = 0`
 * exactly ("damage x1.0", the GDD's own reference case) instead of the formula's own ~9% at P for
 * level 25 — a deliberate override for this vector, not a real class definition. */
function buildParams(): HpParams {
  return {
    attack: { intervalMin_s: 45, intervalMax_s: 75, hitChancePerCheck_pct: 54 },
    monster: {
      monsterAtkCoef: 3,
      monsterAtkExponent: 1.3,
      defSoftcap: 300,
      damageMultPerLevelBelowRange: 1.25,
      monsterAtkMultAfterFailedRaid: 2,
      tankerMissingDebuffMult: 1.6,
    },
    buff: { pPerMemberBase: 1, pLevelDivisor: 50 },
    roles: {
      tanker: { base_pct: 0, cap_pct: 45 },
      support: { base_pct: 25, cap_pct: 50, inDungeonHealBase_pctMaxHpPerMin: 0.5 },
      magic: { base_pct: 17, cap_pct: 50, shieldPerRewardTick_pctMaxHpPerBuffPct: 0.1 },
    },
    safety: {
      autoRetreatEnabledByDefault: true,
      autoRetreatThreshold_pct: 25,
      lowHpWarningThreshold_pct: 30,
      autoPotionEnabled: true,
      autoPotionThreshold_pct: 40,
      potionOrder: [],
      sourceOrder: ['runBag', 'inventory'],
    },
    potions: {},
    player: {
      baseStats: { hp: 3112.5, def: 286.25, vit: 0 },
      statPerPoint: { hp: 0, def: 0, vitHpRegenSpeed_pct: 0, vitPotionEfficiency_pct: 0 },
      hpRecovery: { deathRecoveryTo_pct: 50, outsideDungeonRegen_pctMaxHpPerMin: 1.6667 },
    },
  };
}

const MAX_HP = 3112.5;
const DEF = 286.25;

function runToAutoRetreat(
  seed: number,
  classId: 'tanker' | 'ranged' | 'support' | 'magic',
  params: HpParams,
): { minutes: number; hitsLanded: number } {
  let hp = runHpInit(MAX_HP, seed, params);
  const ctx: AttemptContext = {
    runSeed: seed,
    level: 25,
    classId,
    def: DEF,
    vit: 0,
    maxHp: MAX_HP,
    levelRange: { min: 25, max: 25 },
    autoRetreatEnabled: true,
    bag: {},
    inventory: {},
  };
  for (;;) {
    const tau_ms = hp.nextAttemptTau_ms;
    const applied = applyAttempt(hp, ctx, params);
    hp = applied.hp;
    if (applied.result.hit?.outcome === 'autoRetreat') {
      return { minutes: tau_ms / MS_PER_MINUTE, hitsLanded: hp.hitsLanded };
    }
    if (applied.result.hit?.outcome === 'died') {
      throw new Error('unreachable: auto-retreat is enabled, death cannot happen (R17)');
    }
  }
}

describe('D-020 survival time (Monte Carlo over the real engine, 2000 seeds)', () => {
  it('level-matched Tanker at damage x1.0: every run retreats at the same landed-hit count, mean ~44.444 min', () => {
    const params = buildParams();
    const minutes: number[] = [];
    const hitCounts = new Set<number>();
    for (let seed = 1; seed <= SEED_COUNT; seed += 1) {
      const r = runToAutoRetreat(seed, 'tanker', params);
      minutes.push(r.minutes);
      hitCounts.add(r.hitsLanded);
    }
    expect(hitCounts.size).toBe(1);
    const mean = minutes.reduce((a, b) => a + b, 0) / minutes.length;
    const target = 44.444444;
    expect(Math.abs(mean - target) / target).toBeLessThan(TOLERANCE_RATIO);
  });

  it('solo non-Tanker (missing-Tanker debuff): mean ~27.778 min', () => {
    const params = buildParams();
    const minutes: number[] = [];
    const hitCounts = new Set<number>();
    for (let seed = 1; seed <= SEED_COUNT; seed += 1) {
      const r = runToAutoRetreat(seed, 'ranged', params);
      minutes.push(r.minutes);
      hitCounts.add(r.hitsLanded);
    }
    expect(hitCounts.size).toBe(1);
    const mean = minutes.reduce((a, b) => a + b, 0) / minutes.length;
    const target = 27.777778;
    expect(Math.abs(mean - target) / target).toBeLessThan(TOLERANCE_RATIO);
  });
});

describe('R17: with auto-retreat on, death is impossible (fuzz, every class)', () => {
  it('500 seeds x 4 classes never resolve `died`, HP floors at 1 (D-078)', () => {
    const params = buildParams();
    const classes = ['tanker', 'ranged', 'support', 'magic'] as const;
    for (const classId of classes) {
      for (let seed = 1; seed <= 500; seed += 1) {
        const r = runToAutoRetreat(seed, classId, params);
        expect(r.hitsLanded).toBeGreaterThan(0);
      }
    }
  });
});
