// Gear formulas (design/systems/balance-model.md section 5), ported from
// tools/sim/src/formulas.ts without forking: packages/shared must reproduce
// design/systems/test-vectors/gear.json (every fn except characterStats, which composes a full
// build from tools/sim/src/build.ts and is out of this task's port list).
import type { GearParams } from './params';

/** Unrounded 30 x T^1.4 x (1 + 0.08 x e) x baseMult. */
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

/** Expected gear tier at a level: first tier whose max level >= L (A-P1-F03-T06-5). */
export function tierForLevel(level: number, levelMaxForTier: readonly number[]): number {
  const index = levelMaxForTier.findIndex((max) => level <= max);
  if (index < 0) throw new RangeError(`no tier covers level ${level}`);
  return index + 1;
}
