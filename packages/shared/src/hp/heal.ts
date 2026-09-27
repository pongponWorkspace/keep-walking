// Support heal and the Magic shield (tech note F06 section 3.6, spec R31 items 4-5). Both read
// only Active-unlocked time (`tau_ms`), so neither ever changes HP during Grace, Suspended or
// speed lock: the caller only ever advances `tau_ms` while the hit clock (the same `ActiveClock`,
// D-114) is running.
import { MS_PER_S } from '@keep-walking/geo';
import type { HpParams } from './params';
import { ownBuffPct } from './stats';
import type { PlayerClass, RunHpState } from './types';

const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = MS_PER_S * SECONDS_PER_MINUTE;

export interface HealContext {
  readonly classId: PlayerClass | null;
  readonly level: number;
  readonly maxHp: number;
}

/** Heals a solo Support continuously from `hp.healedThroughTau_ms` to `tau_ms`, capped at max HP
 * (F06 R31 item 5); every other class only advances the bookkeeping so the next call's delta is
 * still correct. Called before every attempt, every tick and the run's own end (tech note F06
 * section 4), so `tau_ms` only ever moves forward. */
export function supportHealThrough(
  hp: RunHpState,
  tau_ms: number,
  ctx: HealContext,
  p: HpParams,
): RunHpState {
  if (tau_ms <= hp.healedThroughTau_ms) return hp;
  if (ctx.classId !== 'support') return { ...hp, healedThroughTau_ms: tau_ms };
  const buff_pct = ownBuffPct('support', ctx.classId, ctx.level, p) ?? 0;
  const perMs =
    (ctx.maxHp * p.roles.support.inDungeonHealBase_pctMaxHpPerMin * (1 + buff_pct / 100)) /
    100 /
    MS_PER_MINUTE;
  const healed = Math.min(ctx.maxHp, hp.hp + perMs * (tau_ms - hp.healedThroughTau_ms));
  return { ...hp, hp: healed, healedThroughTau_ms: tau_ms };
}

export interface ShieldContext {
  readonly classId: PlayerClass | null;
  readonly maxHp: number;
}

/** Magic's shield (F06 R31 item 4, D-110): granted only on a reward tick that passed the
 * movement gate, using the level BEFORE that tick's own exp (`levelBeforeTick`); replaces the
 * current shield outright, never stacks. A tick that failed the gate must not call this at all
 * (`session` only calls it from the granted branch, tech note F06 section 4). */
export function onGrantedTick(
  hp: RunHpState,
  levelBeforeTick: number,
  ctx: ShieldContext,
  p: HpParams,
): RunHpState {
  if (ctx.classId !== 'magic') return hp;
  const buff_pct = ownBuffPct('magic', ctx.classId, levelBeforeTick, p) ?? 0;
  const shield =
    (ctx.maxHp * p.roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct * buff_pct) / 100;
  return { ...hp, shield };
}
