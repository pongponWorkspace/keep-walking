// Zone level Z of a dungeon for one player (balance-model 3.1 and 17.1, D-112 / game-director J-8).
// Z = clamp(playerLevel, levelRange.min, levelRange.max): every level inside the range is a
// "suitable" level and plays at its own level. A player outside the range plays at the nearest
// range edge, and the level-gap multiplier counts once, from that edge:
//   damage x damageMultPerLevelBelowRange ^ (min - level)       below the range only (F06 R09)
//   exp    x max(floor, levelGapMultPerLevel ^ gap)              gap on both sides (A-3)
// Used for both damage (F06 R08) and exp (F05 R11). packages/shared ports this in P2-X10;
// until then tools/sim does not import zoneLevel from shared (the shared one is still A-1).
import type { JsonObject } from './config';
import { str } from './config';

/** The only combat.monsterAttack.zoneLevelFrom value this reference implements. */
export const ZONE_LEVEL_FROM = 'playerLevelClampedToRange';

/** Fails fast when config names a Z rule other than the one implemented here. */
export function assertZoneLevelRule(combat: JsonObject): void {
  const rule = str(combat, 'monsterAttack.zoneLevelFrom');
  if (rule !== ZONE_LEVEL_FROM)
    throw new Error(
      `combat.monsterAttack.zoneLevelFrom = "${rule}" is not implemented (expected "${ZONE_LEVEL_FROM}", D-112)`,
    );
}

function checkRange(rangeMin: number, rangeMax: number): void {
  if (!Number.isInteger(rangeMin) || !Number.isInteger(rangeMax) || rangeMin > rangeMax)
    throw new RangeError(`bad level range ${rangeMin}-${rangeMax}`);
}

/** Z = clamp(playerLevel, rangeMin, rangeMax) (D-112). */
export function zoneLevelFor(playerLevel: number, rangeMin: number, rangeMax: number): number {
  checkRange(rangeMin, rangeMax);
  return Math.min(rangeMax, Math.max(rangeMin, playerLevel));
}

/** Levels below the range minimum (damage gap, F06 R09: the upper side never reduces damage). */
export function levelsBelowRange(playerLevel: number, rangeMin: number): number {
  return Math.max(0, rangeMin - playerLevel);
}

/** Levels outside the range on either side (exp gap, A-3). */
export function levelsOutsideRange(
  playerLevel: number,
  rangeMin: number,
  rangeMax: number,
): number {
  checkRange(rangeMin, rangeMax);
  return Math.max(0, rangeMin - playerLevel, playerLevel - rangeMax);
}

/**
 * The superseded rule A-P1-F03-T06-1 (Z = round((min + max) / 2), same Z for every player).
 * Comparison columns of report-loop only; never used for vectors.
 */
export function zoneLevelMidpointA1(rangeMin: number, rangeMax: number): number {
  checkRange(rangeMin, rangeMax);
  return Math.round((rangeMin + rangeMax) / 2);
}
