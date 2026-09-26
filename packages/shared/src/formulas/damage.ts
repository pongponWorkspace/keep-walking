// Damage formulas (design/systems/balance-model.md section 3, section 18), ported from
// tools/sim/src/formulas.ts / tools/sim/src/zone.ts without forking: packages/shared must
// reproduce design/systems/test-vectors/damage.json (every fn except resolveHit, which is the HP
// engine's hit-resolution order and is ported into packages/shared/src/hp in P2-F06-T06).
import type { MonsterParams } from './params';

/** The only `combat.monsterAttack.zoneLevelFrom` value this reference implements (D-112,
 * game-director J-8, balance-model 18.5/18.6). Superseded: `levelRangeMidpointRounded`
 * (A-P1-F03-T06-1, Z = round((min + max) / 2) for everyone). */
export const ZONE_LEVEL_FROM = 'playerLevelClampedToRange';

/** Fails fast (fail closed, tech note F04 5.4 style) when config names a Z rule other than the
 * one implemented here (P2-X10, balance-model 18.6). */
export function assertZoneLevelRule(zoneLevelFrom: string): void {
  if (zoneLevelFrom !== ZONE_LEVEL_FROM) {
    throw new RangeError(
      `combat.monsterAttack.zoneLevelFrom = "${zoneLevelFrom}" is not implemented (expected "${ZONE_LEVEL_FROM}", D-112)`,
    );
  }
}

/**
 * Z = clamp(playerLevel, rangeMin, rangeMax) (D-112, balance-model 18.1, replaces the superseded
 * midpoint rule). `playerLevel` is the player's level at the instant this Z is used: the level
 * before that tick's own exp for a reward tick (F05 R16), the level at the moment of the roll for
 * a hit (F06 R08/R09, ported in P2-F06-T06).
 */
export function zoneLevel(playerLevel: number, rangeMin: number, rangeMax: number): number {
  if (!Number.isInteger(rangeMin) || !Number.isInteger(rangeMax) || rangeMin > rangeMax) {
    throw new RangeError(`bad level range ${rangeMin}-${rangeMax}`);
  }
  return Math.min(rangeMax, Math.max(rangeMin, playerLevel));
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

/** 1.25^max(0, rangeMin - playerLevel) (A-P1-F03-T06-2, no cap). */
export function levelGapDamageMult(levelsBelowRange: number, perLevel: number): number {
  return perLevel ** Math.max(0, levelsBelowRange);
}

export interface DamageInput {
  readonly zoneLevel: number;
  readonly def: number;
  /** null = no Tanker inside the dungeon -> missing debuff (x1.6). */
  readonly tankerBuff_pct: number | null;
  readonly levelsBelowRange: number;
  readonly failedRaidWeek: boolean;
}

/** damage = monsterATK x (1 - DEF/(DEF+300)) x tankerTerm x gapMult x failMult. */
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
