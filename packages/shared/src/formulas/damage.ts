// Damage formulas (design/systems/balance-model.md section 3), ported from
// tools/sim/src/formulas.ts without forking: packages/shared must reproduce
// design/systems/test-vectors/damage.json (every fn except resolveHit, which is the HP engine's
// hit-resolution order and is ported into packages/shared/src/hp in P2-F06-T06).
import type { MonsterParams } from './params';

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
