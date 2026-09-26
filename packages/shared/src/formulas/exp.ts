// Exp curve formulas (design/systems/balance-model.md section 4.1), ported from
// tools/sim/src/formulas.ts without forking: packages/shared must reproduce
// design/systems/test-vectors/exp-curve.json.
import type { ExpMultParams, ExpParams } from './params';

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
 * The curve shape expToNext(L) / expPerTick(L) = 2 x L^0.7 without the level domain check.
 * Only for comparing the GDD tick table, whose last row is level 60 (max level, no real level-up).
 */
export function ticksPerLevelCurve(level: number, p: ExpParams): number {
  return (
    (p.expToNextCoef * level ** p.expToNextExponent) /
    (p.expPerTickCoef * level ** p.expPerTickExponent)
  );
}

/** Ticks to go from level `from` to level `to` (sum of levels from..to-1) at Z = L. */
export function ticksBetween(from: number, to: number, p: ExpParams, expMultiplier = 1): number {
  let total = 0;
  for (let level = from; level < to; level += 1)
    total += ticksPerLevel(level, p, level, expMultiplier);
  return total;
}

/** magicTerm x gapTerm. magicBuff_pct null = no Magic inside the dungeon. */
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
