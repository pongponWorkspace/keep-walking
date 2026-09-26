// Class, party and buff-stacking formulas (design/systems/balance-model.md section 2), ported
// from tools/sim/src/formulas.ts without forking: packages/shared must reproduce
// design/systems/test-vectors/buff-stacking.json and class-change.json.
import type {
  BaseCapRuleParams,
  BuffParams,
  ClassChangeParams,
  GapContributionParams,
} from './params';

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

/** buff = cap x (1 - (1 - base/cap)^P), in percent. P = 0 -> 0 (role missing). */
export function roleBuffPct(role: { base_pct: number; cap_pct: number }, p: number): number {
  if (p <= 0) return 0;
  return role.cap_pct * (1 - (1 - role.base_pct / role.cap_pct) ** p);
}

export type BaseCapStatus = 'PASS' | 'FAIL' | 'EXCEPTION';

/** Base-to-cap rule: min <= base/cap <= max, or an intentional exception (D-004). */
export function baseCapStatus(
  roleName: string,
  role: { base_pct: number; cap_pct: number },
  rule: BaseCapRuleParams,
): BaseCapStatus {
  const ratio = role.base_pct / role.cap_pct;
  if (ratio >= rule.minBaseToCapRatio && ratio <= rule.maxBaseToCapRatio) return 'PASS';
  return rule.intentionalExceptions.includes(roleName) ? 'EXCEPTION' : 'FAIL';
}

/** classChangeCost = coef x (level / divisor)^exponent. */
export function classChangeCost(level: number, p: ClassChangeParams): number {
  return p.costCoef_gold * (level / p.costLevelDivisor) ** p.costExponent;
}
