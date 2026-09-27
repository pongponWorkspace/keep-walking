// hpAt / recoveredAt_ms / usePotionOutsideRun (tech note F06 sections 6.1, 6.2, 6.4).
import { describe, expect, it } from 'vitest';
import { hpAt, recoveredAt_ms, recoveryLine, usePotionOutsideRun } from './regen';
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
    potions: {
      hpSmall: { heal_pctMaxHp: 30 },
      hpMedium: { heal_pctMaxHp: 60 },
      hpLarge: { heal_pctMaxHp: 100 },
      revive: { reviveToHp_pct: 50 },
    },
    player: {
      baseStats: { hp: 300, def: 20, vit: 0 },
      statPerPoint: { hp: 150, def: 3, vitHpRegenSpeed_pct: 1.5, vitPotionEfficiency_pct: 1 },
      hpRecovery: { deathRecoveryTo_pct: 50, outsideDungeonRegen_pctMaxHpPerMin: 1.6667 },
    },
  };
}

describe('hpAt (R03, R04, 6.1)', () => {
  it('regenerates linearly and caps at maxHp', () => {
    const p = params();
    const hp = { value: 0, anchorAt_ms: 0, recovering: true };
    const at30min = hpAt(hp, 30 * 60_000, { maxHp: 300, vit: 0 }, p);
    // 1.6667 %/min x 30 min = 50.001% of 300 = 150.003
    expect(at30min.value).toBeCloseTo(150.003, 1);
    const atFull = hpAt(hp, 60 * 60_000, { maxHp: 300, vit: 0 }, p);
    expect(atFull.value).toBe(300);
  });

  it('a backwards clock never lowers HP (D-094/R04): returns the anchored value unchanged', () => {
    const p = params();
    const hp = { value: 150, anchorAt_ms: 10_000, recovering: false };
    expect(hpAt(hp, 5_000, { maxHp: 300, vit: 0 }, p)).toEqual(hp);
    expect(hpAt(hp, 10_000, { maxHp: 300, vit: 0 }, p)).toEqual(hp);
  });
});

describe('recoveredAt_ms / recoveryLine (R25, 6.2)', () => {
  it('closed-form crossing matches deathRecoveryDuration_s at VIT 0', () => {
    const p = params();
    const hp = { value: 0, anchorAt_ms: 0, recovering: true };
    const line = recoveryLine(300, p);
    expect(line).toBe(150); // 50% of 300
    const crossAt = recoveredAt_ms(hp, { maxHp: 300, vit: 0 }, p);
    expect(crossAt).not.toBeNull();
    expect((crossAt as number) / 1000).toBeCloseTo(1800, 0); // deathRecoveryDuration_s
  });

  it('null when not recovering', () => {
    const p = params();
    const hp = { value: 300, anchorAt_ms: 0, recovering: false };
    expect(recoveredAt_ms(hp, { maxHp: 300, vit: 0 }, p)).toBeNull();
  });
});

describe('usePotionOutsideRun (R12, R26, 6.4)', () => {
  it('rejects an unknown item id', () => {
    const p = params();
    const hp = { value: 100, anchorAt_ms: 0, recovering: false };
    const r = usePotionOutsideRun(
      { hp, maxHp: 300, vit: 0, inventory: { hpSmall: 1 } },
      'notAPotion',
      0,
      p,
    );
    expect(r).toEqual({ ok: false, reason: 'not_a_potion' });
  });

  it('rejects when none in inventory', () => {
    const p = params();
    const hp = { value: 100, anchorAt_ms: 0, recovering: false };
    const r = usePotionOutsideRun({ hp, maxHp: 300, vit: 0, inventory: {} }, 'hpSmall', 0, p);
    expect(r).toEqual({ ok: false, reason: 'none_in_inventory' });
  });

  it('heals a partial-HP player and debits one potion', () => {
    const p = params();
    const hp = { value: 100, anchorAt_ms: 0, recovering: false };
    const r = usePotionOutsideRun(
      { hp, maxHp: 300, vit: 0, inventory: { hpSmall: 2 } },
      'hpSmall',
      0,
      p,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.hp.value).toBeCloseTo(190, 6); // 100 + 300*30%
    expect(r.healed).toBeCloseTo(90, 6);
    expect(r.inventory).toEqual({ hpSmall: 1 });
    expect(r.revived).toBe(false);
  });

  it('rejects at full HP', () => {
    const p = params();
    const hp = { value: 300, anchorAt_ms: 0, recovering: false };
    const r = usePotionOutsideRun(
      { hp, maxHp: 300, vit: 0, inventory: { hpSmall: 1 } },
      'hpSmall',
      0,
      p,
    );
    expect(r).toEqual({ ok: false, reason: 'full_hp' });
  });

  it('revive: rejects outside Recovering, succeeds inside it and clears the flag', () => {
    const p = params();
    const healthy = { value: 150, anchorAt_ms: 0, recovering: false };
    expect(
      usePotionOutsideRun(
        { hp: healthy, maxHp: 300, vit: 0, inventory: { revive: 1 } },
        'revive',
        0,
        p,
      ),
    ).toEqual({ ok: false, reason: 'not_recovering' });

    const recovering = { value: 0, anchorAt_ms: 0, recovering: true };
    const r = usePotionOutsideRun(
      { hp: recovering, maxHp: 300, vit: 0, inventory: { revive: 1 } },
      'revive',
      0,
      p,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.hp.value).toBe(150); // 300 x 50%
    expect(r.hp.recovering).toBe(false);
    expect(r.revived).toBe(true);
    expect(r.inventory).toEqual({});
  });
});
