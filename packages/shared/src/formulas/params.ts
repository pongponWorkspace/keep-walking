// Parameter shapes for the formulas (design/systems/balance-model.md, ported from
// tools/sim/src/params.ts's field shapes without depending on tools/sim: packages/shared must
// not import tools/* (ADR 0001 3.3, ESLint TOOLS_IMPORT_BAN), and tools/sim will later import
// from here instead (board B-05). Every field is a plain value read from config by the caller
// (run/reward/hp via src/config); formulas never read config themselves (ADR 0003 3.2 point 6).
export interface BuffParams {
  readonly pPerMemberBase: number;
  readonly pLevelDivisor: number;
}

export interface GapContributionParams {
  readonly pMultPerLevelOutsideRange: number;
  readonly pMultFloor: number;
}

export interface BaseCapRuleParams {
  readonly minBaseToCapRatio: number;
  readonly maxBaseToCapRatio: number;
  readonly intentionalExceptions: readonly string[];
}

export interface ClassChangeParams {
  readonly costCoef_gold: number;
  readonly costLevelDivisor: number;
  readonly costExponent: number;
}

export interface MonsterParams {
  readonly monsterAtkCoef: number;
  readonly monsterAtkExponent: number;
  readonly defSoftcap: number;
  readonly damageMultPerLevelBelowRange: number;
  readonly monsterAtkMultAfterFailedRaid: number;
  readonly tankerMissingDebuffMult: number;
}

export interface ExpParams {
  readonly expToNextCoef: number;
  readonly expToNextExponent: number;
  readonly expPerTickCoef: number;
  readonly expPerTickExponent: number;
  readonly maxLevel: number;
  readonly startLevel: number;
}

export interface ExpMultParams {
  readonly magicBuffMaxMult: number;
  readonly noMagicMult: number;
  readonly levelGapMultPerLevel: number;
  readonly levelGapMultFloor: number;
}

export interface GearParams {
  readonly gearStatCoef: number;
  readonly gearStatTierExponent: number;
  readonly enhanceBonusPerLevel: number;
  readonly minTier: number;
  readonly maxTier: number;
  readonly bossBaseStatMult: number;
  readonly bossTier: number;
}
