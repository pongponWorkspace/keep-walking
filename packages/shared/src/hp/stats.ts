// Player stat formulas the HP engine needs (tech note F06 section 2.3). Phase 2 never allocates a
// point (`PlayerState.allocated` is the literal-zero type, R34), so these always evaluate to
// `baseStats.*` today; the formulas are still config-driven (not hardcoded) for when F10 lands.
import { memberP, roleBuffPct } from '../formulas';
import type { HpParams } from './params';
import type { PlayerClass } from './types';

export function maxHpOf(allocatedHp: number, p: HpParams): number {
  return p.player.baseStats.hp + p.player.statPerPoint.hp * allocatedHp;
}

export function defOf(allocatedDef: number, p: HpParams): number {
  return p.player.baseStats.def + p.player.statPerPoint.def * allocatedDef;
}

export function vitOf(allocatedVit: number, p: HpParams): number {
  return p.player.baseStats.vit + allocatedVit;
}

/** Own buff of a solo player (D-039, tech note F06 2.3 `ownBuff`): `null` when `classId` is not
 * this `role` (no one plays that role inside the dungeon, so the "missing" debuff applies instead
 * — that part is the caller's job, e.g. `damagePerHit`'s `tankerBuff_pct: null`). */
export function ownBuffPct(
  role: 'tanker' | 'support' | 'magic',
  classId: PlayerClass | null,
  level: number,
  p: HpParams,
): number | null {
  if (classId !== role) return null;
  return roleBuffPct(p.roles[role], memberP(level, p.buff));
}
