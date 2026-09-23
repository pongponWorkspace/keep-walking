// Scenario helpers: config → survival, potion cost, income. Used by the report, the vector
// generator and the tests. Scenario definitions (which build, which party) are simulator
// assumptions documented in tools/sim/README.md, not balance values.
import { balancedBuild } from './build';
import type { CharacterStats } from './build';
import { damagePerHit, memberP, roleBuffPct } from './formulas';
import type { SimParams } from './params';
import {
  expectedSurvival_min,
  hitChanceForTarget_pct,
  hitsToThreshold,
  hpLossPerHour_pct,
  potionCostPerHour_gold,
} from './survival';
import type { RunSetup } from './survival';

export type TankerCase =
  | { kind: 'reference' } // damage ×1.0 (D-020 definition of the GDD 45-minute row)
  | { kind: 'tanker'; levels: number[] } // Tanker(s) inside the dungeon
  | { kind: 'noTanker' }; // missing debuff ×1.6 (solo Ranged / Support / Magic)

export function meanInterval_s(p: SimParams): number {
  return (p.attack.intervalMin_s + p.attack.intervalMax_s) / 2;
}

export function tankerBuffFor(c: TankerCase, p: SimParams): number | null {
  if (c.kind === 'reference') return 0;
  if (c.kind === 'noTanker') return null;
  const pSum = c.levels.reduce((s, l) => s + memberP(l, p.buff), 0);
  return roleBuffPct(p.roles.tanker, pSum);
}

export interface SurvivalRow {
  level: number;
  build: CharacterStats;
  damage: number;
  hitsToRetreat: number;
  hitsToDeath: number;
  minToRetreat: number;
  minToDeath: number;
}

/** Balanced build at level L in a zone of level Z = L, analytic expectation, no potions. */
export function survivalRow(
  level: number,
  c: TankerCase,
  p: SimParams,
  hitChance_pct = p.attack.hitChancePerCheck_pct,
): SurvivalRow {
  const build = balancedBuild(level, p);
  const damage = damagePerHit(
    {
      zoneLevel: level,
      def: build.def,
      tankerBuff_pct: tankerBuffFor(c, p),
      levelsBelowRange: 0,
      failedRaidWeek: false,
    },
    p.monster,
  );
  const hitsToRetreat = hitsToThreshold(build.hp, damage, p.safety.autoRetreatThreshold_pct);
  const hitsToDeath = hitsToThreshold(build.hp, damage, 0);
  const interval = meanInterval_s(p);
  return {
    level,
    build,
    damage,
    hitsToRetreat,
    hitsToDeath,
    minToRetreat: expectedSurvival_min(hitsToRetreat, hitChance_pct, interval),
    minToDeath: expectedSurvival_min(hitsToDeath, hitChance_pct, interval),
  };
}

/**
 * Least-squares fit of the hit chance to the two GDD survival rows at the given level
 * (reference → target45, Tanker at tankerLevel → target55), minimising squared relative error.
 * Survival is proportional to 1/p, so the optimum has a closed form.
 */
export function fitHitChance_pct(
  level: number,
  tankerLevel: number,
  targetRef_min: number,
  targetTanker_min: number,
  p: SimParams,
): { exact_pct: number; refOnly_pct: number; tankerOnly_pct: number } {
  const interval = meanInterval_s(p);
  const ref = survivalRow(level, { kind: 'reference' }, p);
  const tank = survivalRow(level, { kind: 'tanker', levels: [tankerLevel] }, p);
  // survival_i = a_i / p, relative error e_i = a_i/(p·T_i) − 1. Let x = 1/p:
  // minimise Σ (r_i x − 1)^2 with r_i = a_i / T_i → x = Σ r_i / Σ r_i².
  const r1 = expectedSurvival_min(ref.hitsToRetreat, 100, interval) / targetRef_min;
  const r2 = expectedSurvival_min(tank.hitsToRetreat, 100, interval) / targetTanker_min;
  const x = (r1 + r2) / (r1 * r1 + r2 * r2);
  return {
    exact_pct: 100 / x,
    refOnly_pct: hitChanceForTarget_pct(ref.hitsToRetreat, targetRef_min, interval),
    tankerOnly_pct: hitChanceForTarget_pct(tank.hitsToRetreat, targetTanker_min, interval),
  };
}

/** Monte Carlo setup for a balanced build at level L (optional Support heal / Magic shield). */
export function runSetup(
  level: number,
  c: TankerCase,
  p: SimParams,
  opts: {
    stopAt_pct: number;
    supportLevels?: number[];
    magicLevels?: number[];
    hitChance_pct?: number;
    maxDuration_s: number;
  },
): RunSetup {
  const row = survivalRow(level, c, p);
  const supportBuff = opts.supportLevels
    ? roleBuffPct(
        p.roles.support,
        opts.supportLevels.reduce((s, l) => s + memberP(l, p.buff), 0),
      )
    : null;
  const magicBuff = opts.magicLevels
    ? roleBuffPct(
        p.roles.magic,
        opts.magicLevels.reduce((s, l) => s + memberP(l, p.buff), 0),
      )
    : null;
  return {
    maxHp: row.build.hp,
    damage: row.damage,
    hitChance_pct: opts.hitChance_pct ?? p.attack.hitChancePerCheck_pct,
    intervalMin_s: p.attack.intervalMin_s,
    intervalMax_s: p.attack.intervalMax_s,
    stopAt_pct: opts.stopAt_pct,
    heal_pctMaxHpPerMin:
      supportBuff === null
        ? 0
        : p.healShield.supportHealBase_pctMaxHpPerMin * (1 + supportBuff / 100),
    shield_pctMaxHp:
      magicBuff === null ? 0 : p.healShield.magicShieldPerTick_pctMaxHpPerBuffPct * magicBuff,
    rewardTickInterval_s: p.healShield.rewardTickInterval_s,
    potion: null,
    maxDuration_s: opts.maxDuration_s,
  };
}

/** Potion efficiency bonus (%) from VIT: VIT × 2%. */
export function potionEfficiency_pct(vit: number, p: SimParams): number {
  return vit * p.stats.vitPotionEfficiency_pct;
}

export interface PotionCostRow {
  potion: string;
  withVit: boolean;
  hpLoss_pctPerHour: number;
  gold: number;
}

/** Analytic (uncapped) potion cost per hour for one potion type at level L. */
export function potionCostRow(
  level: number,
  c: TankerCase,
  potion: string,
  withVit: boolean,
  p: SimParams,
  hitChance_pct = p.attack.hitChancePerCheck_pct,
): PotionCostRow {
  const row = survivalRow(level, c, p, hitChance_pct);
  const pot = p.potions[potion];
  if (pot === undefined) throw new Error(`unknown potion ${potion}`);
  const loss = hpLossPerHour_pct(row.damage, row.build.hp, hitChance_pct, meanInterval_s(p));
  const eff = withVit ? potionEfficiency_pct(row.build.vit, p) : 0;
  return {
    potion,
    withVit,
    hpLoss_pctPerHour: loss,
    gold: potionCostPerHour_gold(loss, pot.heal_pctMaxHp, eff, pot.buyPrice_gold),
  };
}

/** Expected NPC gold per walking hour from Common/Uncommon/Rare at a total drop multiplier. */
export function incomePerHour_gold(p: SimParams, dropMult = 1): number {
  const i = p.income;
  const commonQty = (i.commonMin + i.commonMax) / 2;
  const perTick =
    commonQty * i.price_gold.common +
    (i.chance_pct.uncommon / 100) * i.price_gold.uncommon +
    (i.chance_pct.rare / 100) * i.price_gold.rare;
  return i.ticksPerHour * perTick * dropMult;
}
