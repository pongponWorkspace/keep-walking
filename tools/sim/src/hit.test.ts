// R-B1 hit-resolution order (D-078) and raid partyMult caps (D-079), P2-F06-T01.
import { describe, expect, it } from 'vitest';
import { loadBalanceConfig } from './config';
import { resolveHit } from './hit';
import type { HitInput } from './hit';
import { paramsFromConfig } from './params';
import { raidPartyMult, raidPartyMultUncapped } from './raid';

const cfg = loadBalanceConfig();
const p = paramsFromConfig(cfg);
const maxHp = 1000;
const potions = p.safety.potionOrder.map((id) => ({
  id,
  heal_pctMaxHp: (p.potions[id] as { heal_pctMaxHp: number }).heal_pctMaxHp,
  count: 1,
}));
const base: HitInput = {
  hp: maxHp,
  maxHp,
  shield: 0,
  damage: 0,
  autoRetreatEnabled: true,
  autoRetreatThreshold_pct: p.safety.autoRetreatThreshold_pct,
  lowHpWarningThreshold_pct: p.safety.lowHpWarningThreshold_pct,
  autoPotionEnabled: true,
  autoPotionThreshold_pct: p.safety.autoPotionThreshold_pct,
  potionEfficiencyBonus_pct: 0,
  potions,
};

describe('R-B1 hit resolution (D-078)', () => {
  it('auto-retreat ON: no single hit takes HP below 1, whatever the damage', () => {
    for (const damage of [maxHp, maxHp * 10, 1e9]) {
      const r = resolveHit({ ...base, damage, potions: [] });
      expect(r.hpAfterHit).toBe(1);
      expect(r.outcome).toBe('autoRetreat');
    }
  });
  it('auto-retreat OFF: a lethal hit kills, and no potion is drunk after death', () => {
    const r = resolveHit({ ...base, damage: maxHp * 2, autoRetreatEnabled: false });
    expect(r.outcome).toBe('died');
    expect(r.potionUsed).toBeNull();
    expect(r.lowHpWarning).toBe(false);
  });
  it('shield absorbs before the floor; potion runs before the retreat check', () => {
    const r = resolveHit({ ...base, damage: maxHp * 5, shield: 200 });
    expect(r.shieldAbsorbed).toBe(200);
    expect(r.potionUsed).toBe(p.safety.potionOrder[0]);
    expect(r.outcome).toBe('continue');
  });
  it('low-HP warning is read from the final HP (after the potion)', () => {
    const lifted = resolveHit({ ...base, hp: 500, damage: 250 });
    expect(lifted.lowHpWarning).toBe(false);
    const dry = resolveHit({ ...base, hp: 500, damage: 250, potions: [] });
    expect(dry.lowHpWarning).toBe(true);
  });
});

describe('raid partyMult caps (D-079)', () => {
  const rp = p.raidParty;
  const role = (buff_pct: number, cap_pct: number) => ({ buff_pct, cap_pct });
  it('config holds the caps 1.6 (full party) and 1.2 (other parties)', () => {
    expect([rp.fullPartyCap, rp.incompletePartyCap]).toEqual([1.6, 1.2]);
  });
  it('every buff at cap: raw 1 + weight is cut to the caps', () => {
    const full = [role(45, 45), role(50, 50), role(50, 50), role(50, 50)];
    expect(raidPartyMultUncapped(true, full, rp)).toBeCloseTo(1 + rp.weight, 9);
    expect(raidPartyMult(true, full, rp)).toBe(rp.fullPartyCap);
    const three = [role(45, 45), role(50, 50), role(0, 50), role(50, 50)];
    expect(raidPartyMult(true, three, rp)).toBe(rp.incompletePartyCap);
  });
  it('no party is always noPartyMult', () => {
    expect(raidPartyMult(false, [role(45, 45)], rp)).toBe(rp.noPartyMult);
  });
});
