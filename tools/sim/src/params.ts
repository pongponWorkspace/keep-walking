// Typed parameter objects built from config/balance. Formula functions take these as plain
// arguments (ADR 0001 section 3.8) so the same functions can be ported to packages/shared.
import type { BalanceConfig } from './config';
import { num, str, strArray, numArray, valueKeys } from './config';

export const ROLES = ['tanker', 'ranged', 'support', 'magic'] as const;
export type Role = (typeof ROLES)[number];

export interface BuffParams {
  pPerMemberBase: number;
  pLevelDivisor: number;
}
export interface RoleParams {
  base_pct: number;
  cap_pct: number;
  missingDebuffMult: number;
}
export interface BaseCapRuleParams {
  minBaseToCapRatio: number;
  maxBaseToCapRatio: number;
  intentionalExceptions: string[];
}
export interface GapContributionParams {
  pMultPerLevelOutsideRange: number;
  pMultFloor: number;
}
export interface ClassChangeParams {
  costCoef_gold: number;
  costLevelDivisor: number;
  costExponent: number;
}
export interface MonsterParams {
  monsterAtkCoef: number;
  monsterAtkExponent: number;
  defSoftcap: number;
  damageMultPerLevelBelowRange: number;
  monsterAtkMultAfterFailedRaid: number;
  tankerMissingDebuffMult: number;
}
export interface AttackCheckParams {
  intervalMin_s: number;
  intervalMax_s: number;
  hitChancePerCheck_pct: number;
}
export interface ExpParams {
  expToNextCoef: number;
  expToNextExponent: number;
  expPerTickCoef: number;
  expPerTickExponent: number;
  maxLevel: number;
  startLevel: number;
}
export interface ExpMultParams {
  magicBuffMaxMult: number;
  noMagicMult: number;
  levelGapMultPerLevel: number;
  levelGapMultFloor: number;
}
export interface StatParams {
  pointsPerLevel: number;
  base: { atk: number; def: number; hp: number; vit: number };
  perPoint: { atk: number; def: number; hp: number };
  vitHpRegenSpeed_pct: number;
  vitPotionEfficiency_pct: number;
}
export interface GearParams {
  gearStatCoef: number;
  gearStatTierExponent: number;
  enhanceBonusPerLevel: number;
  minTier: number;
  maxTier: number;
  bossBaseStatMult: number;
  bossTier: number;
}
export interface SlotShare {
  atkShare: number;
  defShare: number;
  vitPointsPerGearStat: number;
}
export type SlotName = 'weapon' | 'armor' | 'charm' | 'boots';
export const SLOTS: readonly SlotName[] = ['weapon', 'armor', 'charm', 'boots'];

export interface PotionParams {
  heal_pctMaxHp: number;
  buyPrice_gold: number;
}
export interface SafetyParams {
  autoRetreatThreshold_pct: number;
  autoPotionThreshold_pct: number;
  potionOrder: string[];
}
export interface HealShieldParams {
  supportHealBase_pctMaxHpPerMin: number;
  magicShieldPerTick_pctMaxHpPerBuffPct: number;
  rewardTickInterval_s: number;
}
export interface IncomeParams {
  ticksPerHour: number;
  commonMin: number;
  commonMax: number;
  chance_pct: { uncommon: number; rare: number };
  price_gold: { common: number; uncommon: number; rare: number };
  ratioTargetMin: number;
  ratioTargetMax: number;
  ratioMinAccepted: number;
}

export interface SimParams {
  buff: BuffParams;
  roles: Record<Role, RoleParams>;
  baseCapRule: BaseCapRuleParams;
  gapContribution: GapContributionParams;
  classChange: ClassChangeParams;
  monster: MonsterParams;
  attack: AttackCheckParams;
  exp: ExpParams;
  expMult: ExpMultParams;
  stats: StatParams;
  gear: GearParams;
  slots: Record<SlotName, SlotShare>;
  tierLevelMax: number[];
  potions: Record<string, PotionParams>;
  safety: SafetyParams;
  healShield: HealShieldParams;
  income: IncomeParams;
}

/** Builds every parameter the simulator needs from config/balance. Throws on null or missing. */
export function paramsFromConfig(cfg: BalanceConfig): SimParams {
  const { classes, combat, progression, equipment, economy, dungeons, drops } = cfg;
  const roles = {} as Record<Role, RoleParams>;
  for (const role of ROLES) {
    roles[role] = {
      base_pct: num(classes, `roles.${role}.base_pct`),
      cap_pct: num(classes, `roles.${role}.cap_pct`),
      missingDebuffMult: num(classes, `roles.${role}.missingDebuffMult`),
    };
  }
  const slots = {} as Record<SlotName, SlotShare>;
  for (const slot of SLOTS) {
    slots[slot] = {
      atkShare: num(equipment, `slots.${slot}.atkShare`),
      defShare: num(equipment, `slots.${slot}.defShare`),
      vitPointsPerGearStat: num(equipment, `slots.${slot}.vitPointsPerGearStat`),
    };
  }
  const potions: Record<string, PotionParams> = {};
  for (const key of valueKeys(economy, 'potions')) {
    if (key === 'revive' || key === 'purchaseCurrency') continue;
    potions[key] = {
      heal_pctMaxHp: num(economy, `potions.${key}.heal_pctMaxHp`),
      buyPrice_gold: num(economy, `potions.${key}.buyPrice_gold`),
    };
  }
  const secondsPerHour = 3600;
  return {
    buff: {
      pPerMemberBase: num(classes, 'buffStacking.pPerMemberBase'),
      pLevelDivisor: num(classes, 'buffStacking.pLevelDivisor'),
    },
    roles,
    baseCapRule: {
      minBaseToCapRatio: num(classes, 'baseCapRule.minBaseToCapRatio'),
      maxBaseToCapRatio: num(classes, 'baseCapRule.maxBaseToCapRatio'),
      intentionalExceptions: strArray(classes, 'baseCapRule.intentionalExceptions'),
    },
    gapContribution: {
      pMultPerLevelOutsideRange: num(classes, 'levelGapContribution.pMultPerLevelOutsideRange'),
      pMultFloor: num(classes, 'levelGapContribution.pMultFloor'),
    },
    classChange: {
      costCoef_gold: num(classes, 'classChange.costCoef_gold'),
      costLevelDivisor: num(classes, 'classChange.costLevelDivisor'),
      costExponent: num(classes, 'classChange.costExponent'),
    },
    monster: {
      monsterAtkCoef: num(combat, 'monsterAttack.monsterAtkCoef'),
      monsterAtkExponent: num(combat, 'monsterAttack.monsterAtkExponent'),
      defSoftcap: num(combat, 'defense.defSoftcap'),
      damageMultPerLevelBelowRange: num(combat, 'levelGapDamage.damageMultPerLevelBelowRange'),
      monsterAtkMultAfterFailedRaid: num(combat, 'raidFailPenalty.monsterAtkMultAfterFailedRaid'),
      tankerMissingDebuffMult: roles.tanker.missingDebuffMult,
    },
    attack: {
      intervalMin_s: num(combat, 'attackCheck.intervalMin_s'),
      intervalMax_s: num(combat, 'attackCheck.intervalMax_s'),
      hitChancePerCheck_pct: num(combat, 'attackCheck.hitChancePerCheck_pct'),
    },
    exp: {
      expToNextCoef: num(progression, 'expCurve.expToNextCoef'),
      expToNextExponent: num(progression, 'expCurve.expToNextExponent'),
      expPerTickCoef: num(progression, 'expCurve.expPerTickCoef'),
      expPerTickExponent: num(progression, 'expCurve.expPerTickExponent'),
      maxLevel: num(progression, 'level.maxLevel'),
      startLevel: num(progression, 'level.startLevel'),
    },
    expMult: {
      magicBuffMaxMult: num(progression, 'expMultipliers.magicBuffMaxMult'),
      noMagicMult: num(progression, 'expMultipliers.noMagicMult'),
      levelGapMultPerLevel: num(progression, 'expMultipliers.levelGapMultPerLevel'),
      levelGapMultFloor: num(progression, 'expMultipliers.levelGapMultFloor'),
    },
    stats: {
      pointsPerLevel: num(progression, 'statPoints.pointsPerLevel'),
      base: {
        atk: num(progression, 'baseStats.atk'),
        def: num(progression, 'baseStats.def'),
        hp: num(progression, 'baseStats.hp'),
        vit: num(progression, 'baseStats.vit'),
      },
      perPoint: {
        atk: num(progression, 'statPerPoint.atk'),
        def: num(progression, 'statPerPoint.def'),
        hp: num(progression, 'statPerPoint.hp'),
      },
      vitHpRegenSpeed_pct: num(progression, 'statPerPoint.vitHpRegenSpeed_pct'),
      vitPotionEfficiency_pct: num(progression, 'statPerPoint.vitPotionEfficiency_pct'),
    },
    gear: {
      gearStatCoef: num(equipment, 'gearStat.gearStatCoef'),
      gearStatTierExponent: num(equipment, 'gearStat.gearStatTierExponent'),
      enhanceBonusPerLevel: num(equipment, 'gearStat.enhanceBonusPerLevel'),
      minTier: num(equipment, 'gearStat.minTier'),
      maxTier: num(equipment, 'gearStat.maxTier'),
      bossBaseStatMult: num(equipment, 'bossGear.baseStatMult'),
      bossTier: num(equipment, 'bossGear.tier'),
    },
    slots,
    tierLevelMax: numArray(equipment, 'tierByLevel.levelMaxForTier'),
    potions,
    safety: {
      autoRetreatThreshold_pct: num(dungeons, 'hpSafety.autoRetreatThreshold_pct'),
      autoPotionThreshold_pct: num(economy, 'autoPotion.defaultThreshold_pct'),
      potionOrder: strArray(economy, 'autoPotion.defaultPotionOrder'),
    },
    healShield: {
      supportHealBase_pctMaxHpPerMin: num(
        classes,
        'roles.support.inDungeonHealBase_pctMaxHpPerMin',
      ),
      magicShieldPerTick_pctMaxHpPerBuffPct: num(
        classes,
        'roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct',
      ),
      rewardTickInterval_s: num(dungeons, 'rewardTick.rewardTickInterval_s'),
    },
    income: {
      ticksPerHour: secondsPerHour / num(dungeons, 'rewardTick.rewardTickInterval_s'),
      commonMin: num(drops, 'quantityPerDrop.commonMin'),
      commonMax: num(drops, 'quantityPerDrop.commonMax'),
      chance_pct: {
        uncommon: num(drops, 'baseChancePerRewardTick_pct.uncommon'),
        rare: num(drops, 'baseChancePerRewardTick_pct.rare'),
      },
      price_gold: {
        common: num(economy, `npcSellPrice_gold.${str(drops, 'rewardTypeByRarity.common')}`),
        uncommon: num(economy, `npcSellPrice_gold.${str(drops, 'rewardTypeByRarity.uncommon')}`),
        rare: num(economy, `npcSellPrice_gold.${str(drops, 'rewardTypeByRarity.rare')}`),
      },
      ratioTargetMin: num(economy, 'incomeToPotionRatio.targetMin'),
      ratioTargetMax: num(economy, 'incomeToPotionRatio.targetMax'),
      ratioMinAccepted: num(economy, 'incomeToPotionRatio.minAccepted'),
    },
  };
}
