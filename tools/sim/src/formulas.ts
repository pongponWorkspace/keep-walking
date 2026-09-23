// Reference implementations of the core formulas (design/systems/balance-model.md).
// Pure: every value comes in as a parameter, no I/O, no clock, no unseeded randomness.
// packages/shared ports these and must reproduce design/systems/test-vectors/*.json.
import type {
  BaseCapRuleParams,
  BuffParams,
  ClassChangeParams,
  ExpMultParams,
  ExpParams,
  GapContributionParams,
  GearParams,
  MonsterParams,
  RoleParams,
} from './params';

// ---- Class, party, buff stacking (balance-model section 2) ----

/** P term of one member: pPerMemberBase + level / pLevelDivisor, scaled down outside the range. */
export function memberP(
  level: number,
  buff: BuffParams,
  levelsOutsideRange = 0,
  gap?: GapContributionParams,
): number {
  const raw = buff.pPerMemberBase + level / buff.pLevelDivisor;
  if (levelsOutsideRange <= 0 || gap === undefined) return raw;
  const mult = Math.max(gap.pMultFloor, gap.pMultPerLevelOutsideRange ** levelsOutsideRange);
  return raw * mult;
}

/** Sum of P over members of one role inside the dungeon. */
export function roleP(levels: readonly number[], buff: BuffParams): number {
  return levels.reduce((sum, level) => sum + memberP(level, buff), 0);
}

/** buff = cap × (1 − (1 − base/cap)^P), in percent. P = 0 → 0 (role missing). */
export function roleBuffPct(role: Pick<RoleParams, 'base_pct' | 'cap_pct'>, p: number): number {
  if (p <= 0) return 0;
  return role.cap_pct * (1 - (1 - role.base_pct / role.cap_pct) ** p);
}

export type BaseCapStatus = 'PASS' | 'FAIL' | 'EXCEPTION';

/** Base-to-cap rule: min ≤ base/cap ≤ max, or an intentional exception (D-004). */
export function baseCapStatus(
  roleName: string,
  role: Pick<RoleParams, 'base_pct' | 'cap_pct'>,
  rule: BaseCapRuleParams,
): BaseCapStatus {
  const ratio = role.base_pct / role.cap_pct;
  if (ratio >= rule.minBaseToCapRatio && ratio <= rule.maxBaseToCapRatio) return 'PASS';
  return rule.intentionalExceptions.includes(roleName) ? 'EXCEPTION' : 'FAIL';
}

/** classChangeCost = coef × (level / divisor)^exponent. */
export function classChangeCost(level: number, p: ClassChangeParams): number {
  return p.costCoef_gold * (level / p.costLevelDivisor) ** p.costExponent;
}

// ---- Damage (balance-model section 3) ----

/** Z = round((min + max) / 2) (A-P1-F03-T06-1). */
export function zoneLevel(rangeMin: number, rangeMax: number): number {
  return Math.round((rangeMin + rangeMax) / 2);
}

export function monsterAtk(
  zone: number,
  p: Pick<MonsterParams, 'monsterAtkCoef' | 'monsterAtkExponent'>,
): number {
  return p.monsterAtkCoef * zone ** p.monsterAtkExponent;
}

/** DEF / (DEF + softcap), as a ratio 0..1. */
export function defReductionRatio(def: number, defSoftcap: number): number {
  if (def < 0) throw new RangeError('DEF must be >= 0');
  return def / (def + defSoftcap);
}

/** 1.25^max(0, rangeMin − playerLevel) (A-P1-F03-T06-2, no cap). */
export function levelGapDamageMult(levelsBelowRange: number, perLevel: number): number {
  return perLevel ** Math.max(0, levelsBelowRange);
}

export interface DamageInput {
  zoneLevel: number;
  def: number;
  /** null = no Tanker inside the dungeon → missing debuff (×1.6). */
  tankerBuff_pct: number | null;
  levelsBelowRange: number;
  failedRaidWeek: boolean;
}

/** damage = monsterATK × (1 − DEF/(DEF+300)) × tankerTerm × gapMult × failMult. */
export function damagePerHit(input: DamageInput, p: MonsterParams): number {
  const tankerTerm =
    input.tankerBuff_pct === null ? p.tankerMissingDebuffMult : 1 - input.tankerBuff_pct / 100;
  const failMult = input.failedRaidWeek ? p.monsterAtkMultAfterFailedRaid : 1;
  return (
    monsterAtk(input.zoneLevel, p) *
    (1 - defReductionRatio(input.def, p.defSoftcap)) *
    tankerTerm *
    levelGapDamageMult(input.levelsBelowRange, p.damageMultPerLevelBelowRange) *
    failMult
  );
}

// ---- Exp (balance-model section 4.1) ----

export function expToNext(level: number, p: ExpParams): number {
  if (level < p.startLevel || level >= p.maxLevel) {
    throw new RangeError(`expToNext defined for levels ${p.startLevel}..${p.maxLevel - 1}`);
  }
  return p.expToNextCoef * level ** p.expToNextExponent;
}

export function expPerTick(zone: number, p: ExpParams): number {
  return p.expPerTickCoef * zone ** p.expPerTickExponent;
}

/** Reward ticks to clear level L while playing a zone of level Z with a total exp multiplier. */
export function ticksPerLevel(
  level: number,
  p: ExpParams,
  zone = level,
  expMultiplier = 1,
): number {
  return expToNext(level, p) / (expPerTick(zone, p) * expMultiplier);
}

/**
 * The curve shape expToNext(L) / expPerTick(L) = 2 × L^0.7 without the level domain check.
 * Only for comparing the GDD tick table, whose last row is level 60 (max level, no real level-up).
 */
export function ticksPerLevelCurve(level: number, p: ExpParams): number {
  return (
    (p.expToNextCoef * level ** p.expToNextExponent) /
    (p.expPerTickCoef * level ** p.expPerTickExponent)
  );
}

/** Ticks to go from level `from` to level `to` (sum of levels from..to−1) at Z = L. */
export function ticksBetween(from: number, to: number, p: ExpParams, expMultiplier = 1): number {
  let total = 0;
  for (let level = from; level < to; level += 1)
    total += ticksPerLevel(level, p, level, expMultiplier);
  return total;
}

/** magicTerm × gapTerm. magicBuff_pct null = no Magic inside the dungeon. */
export function expMultiplier(
  magicBuff_pct: number | null,
  levelsOutsideRange: number,
  p: ExpMultParams,
): number {
  const magicTerm =
    magicBuff_pct === null ? p.noMagicMult : Math.min(p.magicBuffMaxMult, 1 + magicBuff_pct / 100);
  const gapTerm = Math.max(
    p.levelGapMultFloor,
    p.levelGapMultPerLevel ** Math.max(0, levelsOutsideRange),
  );
  return magicTerm * gapTerm;
}

// ---- Gear (balance-model section 5) ----

/** Unrounded 30 × T^1.4 × (1 + 0.08 × e) × baseMult. */
export function gearStatRaw(tier: number, enhance: number, p: GearParams, baseMult = 1): number {
  if (tier < p.minTier || tier > p.maxTier)
    throw new RangeError(`tier must be ${p.minTier}..${p.maxTier}`);
  if (enhance < 0) throw new RangeError('enhance must be >= 0');
  return (
    p.gearStatCoef *
    tier ** p.gearStatTierExponent *
    baseMult *
    (1 + p.enhanceBonusPerLevel * enhance)
  );
}

/** Rounded once at the end (roundHalfUpFinal, D-022). */
export function gearStat(tier: number, enhance: number, p: GearParams): number {
  return Math.round(gearStatRaw(tier, enhance, p));
}

export function bossGearStat(enhance: number, p: GearParams): number {
  return Math.round(gearStatRaw(p.bossTier, enhance, p, p.bossBaseStatMult));
}

/** Expected gear tier at a level: first tier whose max level ≥ L (A-P1-F03-T06-5). */
export function tierForLevel(level: number, levelMaxForTier: readonly number[]): number {
  const index = levelMaxForTier.findIndex((max) => level <= max);
  if (index < 0) throw new RangeError(`no tier covers level ${level}`);
  return index + 1;
}
