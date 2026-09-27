// supportHealThrough / onGrantedTick (tech note F06 3.6, spec R31 items 4-5).
import { describe, expect, it } from 'vitest';
import { onGrantedTick, supportHealThrough } from './heal';
import { runHpInit } from './attempt';
import type { HpParams } from './params';

function params(): HpParams {
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
      tanker: { base_pct: 16, cap_pct: 45 },
      support: { base_pct: 25, cap_pct: 50, inDungeonHealBase_pctMaxHpPerMin: 0.5 },
      magic: { base_pct: 17, cap_pct: 50, shieldPerRewardTick_pctMaxHpPerBuffPct: 0.1 },
    },
    safety: {
      autoRetreatEnabledByDefault: true,
      autoRetreatThreshold_pct: 25,
      lowHpWarningThreshold_pct: 30,
      autoPotionEnabled: true,
      autoPotionThreshold_pct: 40,
      potionOrder: ['hpSmall', 'hpMedium', 'hpLarge'],
      sourceOrder: ['runBag', 'inventory'],
    },
    potions: {},
    player: {
      baseStats: { hp: 300, def: 20, vit: 0 },
      statPerPoint: { hp: 150, def: 3, vitHpRegenSpeed_pct: 1.5, vitPotionEfficiency_pct: 1 },
      hpRecovery: { deathRecoveryTo_pct: 50, outsideDungeonRegen_pctMaxHpPerMin: 1.6667 },
    },
  };
}

describe('supportHealThrough (R31 item 5)', () => {
  it('non-Support classes never heal, only advance the bookkeeping', () => {
    const p = params();
    const hp = runHpInit(100, 1, p);
    const healed = supportHealThrough(hp, 60_000, { classId: 'ranged', level: 10, maxHp: 300 }, p);
    expect(healed.hp).toBe(100);
    expect(healed.healedThroughTau_ms).toBe(60_000);
  });

  it('a solo Support heals continuously, capped at maxHp', () => {
    const p = params();
    const hp = runHpInit(100, 1, p);
    // rate = 300 x 0.5% x (1 + buff) / 100 / 60000 per ms; over 1 minute alone this is small,
    // so drive a long window to reach the cap deterministically.
    const healed = supportHealThrough(
      hp,
      10_000_000,
      { classId: 'support', level: 10, maxHp: 300 },
      p,
    );
    expect(healed.hp).toBe(300);
  });

  it('never moves tau backwards and is a no-op when tau does not advance', () => {
    const p = params();
    const hp = runHpInit(100, 1, p);
    const step1 = supportHealThrough(hp, 60_000, { classId: 'support', level: 10, maxHp: 300 }, p);
    const step2 = supportHealThrough(
      step1,
      60_000,
      { classId: 'support', level: 10, maxHp: 300 },
      p,
    );
    expect(step2).toEqual(step1);
  });
});

describe('onGrantedTick (R31 item 4, D-110)', () => {
  it('non-Magic classes never get a shield', () => {
    const p = params();
    const hp = runHpInit(100, 1, p);
    const withShield = onGrantedTick(hp, 10, { classId: 'ranged', maxHp: 300 }, p);
    expect(withShield.shield).toBe(0);
  });

  it('Magic gets a shield sized off maxHp and the buff, replacing (not stacking) on every grant', () => {
    const p = params();
    const hp = runHpInit(100, 1, p);
    const first = onGrantedTick(hp, 1, { classId: 'magic', maxHp: 300 }, p);
    expect(first.shield).toBeGreaterThan(0);
    const second = onGrantedTick(first, 30, { classId: 'magic', maxHp: 300 }, p);
    // Higher level -> higher buff -> a bigger shield that REPLACES the first one (not a sum).
    expect(second.shield).toBeGreaterThan(first.shield);
    expect(second.shield).toBeLessThan(first.shield * 2);
  });
});
