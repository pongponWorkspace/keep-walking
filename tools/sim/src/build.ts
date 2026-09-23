// Character stats and the "balanced build" used by the survival and economy simulation
// (balance-model sections 3.2 and 4.2).
import { defReductionRatio, gearStat, tierForLevel } from './formulas';
import type { SimParams, SlotName, StatParams, SlotShare } from './params';
import { SLOTS } from './params';

export interface Allocation {
  atk: number;
  def: number;
  hp: number;
  vit: number;
}
export const ALLOCATION_KEYS: readonly (keyof Allocation)[] = ['atk', 'def', 'hp', 'vit'];

export type GearLoadout = Record<SlotName, number>;

export interface CharacterStats {
  atk: number;
  def: number;
  hp: number;
  vit: number;
  defReduction_pct: number;
}

export function statPoints(level: number, p: StatParams): number {
  return p.pointsPerLevel * level;
}

/**
 * ATK = 20 + 4 × pts + gear ATK · DEF = 20 + 3 × pts + gear DEF · HP = 300 + 150 × pts ·
 * VIT = pts + boots VIT. Throws if the allocation spends more points than the level gives.
 */
export function characterStats(
  level: number,
  alloc: Allocation,
  gear: GearLoadout,
  stats: StatParams,
  slots: Record<SlotName, SlotShare>,
  defSoftcap: number,
): CharacterStats {
  const spent = alloc.atk + alloc.def + alloc.hp + alloc.vit;
  const available = statPoints(level, stats);
  const epsilon = 1e-9;
  if (spent > available + epsilon) {
    throw new RangeError(`allocation spends ${spent} points, level ${level} has ${available}`);
  }
  let gearAtk = 0;
  let gearDef = 0;
  let gearVit = 0;
  for (const slot of SLOTS) {
    gearAtk += gear[slot] * slots[slot].atkShare;
    gearDef += gear[slot] * slots[slot].defShare;
    gearVit += gear[slot] * slots[slot].vitPointsPerGearStat;
  }
  const def = stats.base.def + stats.perPoint.def * alloc.def + gearDef;
  return {
    atk: stats.base.atk + stats.perPoint.atk * alloc.atk + gearAtk,
    def,
    hp: stats.base.hp + stats.perPoint.hp * alloc.hp,
    vit: stats.base.vit + alloc.vit + gearVit,
    defReduction_pct: defReductionRatio(def, defSoftcap) * 100,
  };
}

/** Points split equally over the four stats (fractional points allowed as an average build). */
export function balancedAllocation(level: number, p: StatParams): Allocation {
  const each = statPoints(level, p) / ALLOCATION_KEYS.length;
  return { atk: each, def: each, hp: each, vit: each };
}

/** Every slot at the expected tier for the level, at the given enhance level. */
export function tierGear(level: number, params: SimParams, enhance = 0): GearLoadout {
  const tier = tierForLevel(level, params.tierLevelMax);
  const value = gearStat(tier, enhance, params.gear);
  return { weapon: value, armor: value, charm: value, boots: value };
}

export function balancedBuild(level: number, params: SimParams, enhance = 0): CharacterStats {
  return characterStats(
    level,
    balancedAllocation(level, params.stats),
    tierGear(level, params, enhance),
    params.stats,
    params.slots,
    params.monster.defSoftcap,
  );
}

/** All points into one stat, no gear (GDD extreme builds at level 60). */
export function extremeBuild(
  level: number,
  stat: keyof Allocation,
  params: SimParams,
): CharacterStats {
  const alloc: Allocation = { atk: 0, def: 0, hp: 0, vit: 0 };
  alloc[stat] = statPoints(level, params.stats);
  const noGear: GearLoadout = { weapon: 0, armor: 0, charm: 0, boots: 0 };
  return characterStats(
    level,
    alloc,
    noGear,
    params.stats,
    params.slots,
    params.monster.defSoftcap,
  );
}
