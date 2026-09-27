// R-B1 hit-resolution order (D-078, balance-model section 3.1.1). Literal port of
// tools/sim/src/hit.ts (read-only reference, never imported): every rule value is a parameter
// (HpParams, ./params), no config read here. Must reproduce every `resolveHit` vector in
// design/systems/test-vectors/damage.json byte for byte (tolerance 1e-6).
//
// Order for one landed hit:
//   1. Magic shield absorbs first.
//   2. Remaining damage hits HP. Auto-retreat ON: HP cannot fall below 1 from a single hit.
//      Auto-retreat OFF: HP can reach 0 -> died (no potion, no warning, run loot lost).
//   3. Auto-potion: HP < auto-potion line and a potion is in the inventory -> drink ONE potion,
//      first non-empty entry in potion order (A-P1-F03-T06-15b), heal scaled by VIT, capped at max HP.
//   4. Auto-retreat check (only when ON): final HP <= auto-retreat line -> autoRetreat.
//   5. Low-HP warning from the FINAL HP: fires on a downward crossing
//      (HP before the hit > warning line AND final HP <= warning line).

export interface HitPotion {
  readonly id: string;
  readonly heal_pctMaxHp: number;
  readonly count: number;
}

export interface HitInput {
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly damage: number;
  readonly autoRetreatEnabled: boolean;
  readonly autoRetreatThreshold_pct: number;
  readonly lowHpWarningThreshold_pct: number;
  readonly autoPotionEnabled: boolean;
  readonly autoPotionThreshold_pct: number;
  readonly potionEfficiencyBonus_pct: number;
  /** Inventory in auto-potion order (smallest first). Counts come from drops only in Phase 2. */
  readonly potions: readonly HitPotion[];
}

export type HitOutcome = 'continue' | 'autoRetreat' | 'died';

export interface HitResult {
  readonly shieldAbsorbed: number;
  readonly shieldAfter: number;
  readonly hpAfterHit: number;
  readonly potionUsed: string | null;
  readonly potionHealed: number;
  readonly hpAfter: number;
  readonly outcome: HitOutcome;
  readonly lowHpWarning: boolean;
}

/** HP that a single hit can never go below while auto-retreat is on (D-078). */
export const AUTO_RETREAT_HP_FLOOR = 1;

export function resolveHit(i: HitInput): HitResult {
  if (i.hp <= 0) throw new Error('resolveHit: a downed player cannot be hit');
  const shieldAbsorbed = Math.min(Math.max(0, i.shield), Math.max(0, i.damage));
  const shieldAfter = i.shield - shieldAbsorbed;
  const toHp = Math.max(0, i.damage) - shieldAbsorbed;
  const floor = i.autoRetreatEnabled ? AUTO_RETREAT_HP_FLOOR : 0;
  const hpAfterHit = Math.max(floor, i.hp - toHp);
  if (hpAfterHit <= 0) {
    return {
      shieldAbsorbed,
      shieldAfter,
      hpAfterHit: 0,
      potionUsed: null,
      potionHealed: 0,
      hpAfter: 0,
      outcome: 'died',
      lowHpWarning: false,
    };
  }
  let hpAfter = hpAfterHit;
  let potionUsed: string | null = null;
  let potionHealed = 0;
  const potionLine = (i.maxHp * i.autoPotionThreshold_pct) / 100;
  if (i.autoPotionEnabled && hpAfterHit < potionLine) {
    const potion = i.potions.find((x) => x.count > 0);
    if (potion !== undefined) {
      const heal = (i.maxHp * potion.heal_pctMaxHp * (1 + i.potionEfficiencyBonus_pct / 100)) / 100;
      hpAfter = Math.min(i.maxHp, hpAfterHit + heal);
      potionHealed = hpAfter - hpAfterHit;
      potionUsed = potion.id;
    }
  }
  const retreatLine = (i.maxHp * i.autoRetreatThreshold_pct) / 100;
  const outcome: HitOutcome =
    i.autoRetreatEnabled && hpAfter <= retreatLine ? 'autoRetreat' : 'continue';
  const warnLine = (i.maxHp * i.lowHpWarningThreshold_pct) / 100;
  const lowHpWarning = i.hp > warnLine && hpAfter <= warnLine;
  return {
    shieldAbsorbed,
    shieldAfter,
    hpAfterHit,
    potionUsed,
    potionHealed,
    hpAfter,
    outcome,
    lowHpWarning,
  };
}
