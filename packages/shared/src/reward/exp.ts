// Solo reward-tick exp (tech note F05 section 5, P2-F05-T01, D-039). Reference:
// tools/sim/src/loop.ts (read-only, never imported). Party exp (roleP over every member) is out
// of Phase 2 scope (solo only, F05 R13); the Magic buff here is always the player's own.
import type { ExpMultParams, ExpParams } from '../formulas';
import { expMultiplier, expPerTick, expToNext, memberP, roleBuffPct, zoneLevel } from '../formulas';

export type PlayerClass = 'tanker' | 'ranged' | 'support' | 'magic';

export interface RoleBuffParams {
  readonly base_pct: number;
  readonly cap_pct: number;
}
export interface BuffPParams {
  readonly pPerMemberBase: number;
  readonly pLevelDivisor: number;
}
export interface SoloTickExpParams {
  readonly exp: ExpParams;
  readonly expMult: ExpMultParams;
  readonly roles: { readonly magic: RoleBuffParams };
  readonly buff: BuffPParams;
}

export interface SoloTickExpResult {
  readonly zoneLevel: number;
  readonly levelsOutsideRange: number;
  readonly magicBuff_pct: number | null;
  readonly expMult: number;
  readonly exp: number;
}

/** Exp of one reward tick for a solo player (f = 1 full tick, D-059 partial = e / window). */
export function soloTickExp(
  level: number,
  ownClass: PlayerClass,
  rangeMin: number,
  rangeMax: number,
  f: number,
  p: SoloTickExpParams,
): SoloTickExpResult {
  const zone = zoneLevel(rangeMin, rangeMax);
  const levelsOutsideRange = Math.max(0, rangeMin - level, level - rangeMax);
  const magicBuff_pct =
    ownClass === 'magic' ? roleBuffPct(p.roles.magic, memberP(level, p.buff)) : null;
  const mult = expMultiplier(magicBuff_pct, levelsOutsideRange, p.expMult);
  return {
    zoneLevel: zone,
    levelsOutsideRange,
    magicBuff_pct,
    expMult: mult,
    exp: expPerTick(zone, p.exp) * mult * f,
  };
}

export interface AddExpResult {
  readonly level: number;
  readonly exp: number;
}

/** Adds exp with level-ups chained in one grant (unrounded, A-P2-F05-T01-3); nothing changes, and
 * exp is 0, once maxLevel is reached (no exp is stored past the cap). */
export function addExp(level: number, exp: number, gained: number, p: ExpParams): AddExpResult {
  let lvl = level;
  let e = exp;
  let remaining = gained;
  while (remaining > 0 && lvl < p.maxLevel) {
    const need = expToNext(lvl, p) - e;
    if (remaining < need) {
      e += remaining;
      remaining = 0;
    } else {
      remaining -= need;
      lvl += 1;
      e = 0;
    }
  }
  if (lvl >= p.maxLevel) return { level: p.maxLevel, exp: 0 };
  return { level: lvl, exp: e };
}
