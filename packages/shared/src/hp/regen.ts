// HP outside a run: the regen closed form, Recovering, and using a potion by hand (tech note F06
// sections 6.1, 6.2, 6.4). No timer anywhere here (R04): `hpAt` computes the anchor-point formula
// at any `at_ms`, and `recoveredAt_ms` inverts it in closed form so `session` never has to poll.
import { MS_PER_S } from '@keep-walking/geo';
import type { HpParams } from './params';
import type { PlayerHpState, PotionRejectReason } from './types';

const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = MS_PER_S * SECONDS_PER_MINUTE;

export interface RegenContext {
  readonly maxHp: number;
  readonly vit: number;
}

/** HP regen rate outside a run, per ms (F06 R03-R04, 6.1). */
export function regenRatePerMs(ctx: RegenContext, p: HpParams): number {
  const bonus_pct = p.player.statPerPoint.vitHpRegenSpeed_pct * ctx.vit;
  return (
    (ctx.maxHp * p.player.hpRecovery.outsideDungeonRegen_pctMaxHpPerMin * (1 + bonus_pct / 100)) /
    100 /
    MS_PER_MINUTE
  );
}

/** The `Recovering` exit line, in HP (F06 R25, 6.2). */
export function recoveryLine(maxHp: number, p: HpParams): number {
  return (maxHp * p.player.hpRecovery.deathRecoveryTo_pct) / 100;
}

/** HP at `at_ms` (tech note F06 6.1 `hpAt`): a backwards clock (`at_ms <= anchorAt_ms`) never
 * lowers HP — it returns the anchored value unchanged, same as the caller re-anchoring at `t_ms`
 * without ever materializing a drop (D-094/R04). Never clears `recovering` on its own: the exact
 * crossing instant is `recoveredAt_ms` below, materialized by the caller at that instant, not at
 * whatever `now_ms` this was read at (tech note F06 6.2). */
export function hpAt(
  hp: PlayerHpState,
  at_ms: number,
  ctx: RegenContext,
  p: HpParams,
): PlayerHpState {
  if (at_ms <= hp.anchorAt_ms) return hp;
  const value = Math.min(ctx.maxHp, hp.value + regenRatePerMs(ctx, p) * (at_ms - hp.anchorAt_ms));
  return { value, anchorAt_ms: at_ms, recovering: hp.recovering };
}

/** Closed-form instant `hp` crosses `recoveryLine` (F06 6.2 `recoveredAt_ms`/`player_recovered`):
 * `null` when not `recovering` (nothing to cross). Already past the line (a stale anchor) returns
 * `anchorAt_ms` itself — the caller treats any `now_ms >= this` as "already recovered". */
export function recoveredAt_ms(hp: PlayerHpState, ctx: RegenContext, p: HpParams): number | null {
  if (!hp.recovering) return null;
  const line = recoveryLine(ctx.maxHp, p);
  if (hp.value >= line) return hp.anchorAt_ms;
  return hp.anchorAt_ms + (line - hp.value) / regenRatePerMs(ctx, p);
}

export interface PotionUseContext {
  readonly hp: PlayerHpState;
  readonly maxHp: number;
  readonly vit: number;
  readonly inventory: Readonly<Record<string, number>>;
}

export type UsePotionResult =
  | {
      readonly ok: true;
      readonly hp: PlayerHpState;
      readonly inventory: Record<string, number>;
      readonly healed: number;
      readonly revived: boolean;
    }
  | { readonly ok: false; readonly reason: PotionRejectReason };

function withoutOne(
  inventory: Readonly<Record<string, number>>,
  itemId: string,
): Record<string, number> {
  const left = (inventory[itemId] ?? 0) - 1;
  if (left > 0) return { ...inventory, [itemId]: left };
  return Object.fromEntries(Object.entries(inventory).filter(([id]) => id !== itemId));
}

/** `usePotion` outside any run (tech note F06 6.4 items 2-6; item 1, `run_active`, is `session`'s
 * own check before this is even called — `hp` never sees `SessionState.run`). Materializes at
 * `at_ms` before deciding (so "full HP" and "past the Recovering line" both use the current, not
 * stale, value), then decrements the one potion used only on the success path. */
export function usePotionOutsideRun(
  ctx: PotionUseContext,
  itemId: string,
  at_ms: number,
  p: HpParams,
): UsePotionResult {
  const def = p.potions[itemId];
  if (def === undefined) return { ok: false, reason: 'not_a_potion' };
  if ((ctx.inventory[itemId] ?? 0) <= 0) return { ok: false, reason: 'none_in_inventory' };
  const materialized = hpAt(ctx.hp, at_ms, { maxHp: ctx.maxHp, vit: ctx.vit }, p);
  if (def.reviveToHp_pct !== undefined) {
    if (!materialized.recovering) return { ok: false, reason: 'not_recovering' };
    const value = Math.max(materialized.value, (ctx.maxHp * def.reviveToHp_pct) / 100);
    return {
      ok: true,
      hp: { value, anchorAt_ms: at_ms, recovering: false },
      inventory: withoutOne(ctx.inventory, itemId),
      healed: value - materialized.value,
      revived: true,
    };
  }
  if (def.heal_pctMaxHp === undefined) return { ok: false, reason: 'not_a_potion' };
  if (materialized.value >= ctx.maxHp) return { ok: false, reason: 'full_hp' };
  const bonus_pct = p.player.statPerPoint.vitPotionEfficiency_pct * ctx.vit;
  const value = Math.min(
    ctx.maxHp,
    materialized.value + (ctx.maxHp * def.heal_pctMaxHp * (1 + bonus_pct / 100)) / 100,
  );
  const recovering = materialized.recovering && value < recoveryLine(ctx.maxHp, p);
  return {
    ok: true,
    hp: { value, anchorAt_ms: at_ms, recovering },
    inventory: withoutOne(ctx.inventory, itemId),
    healed: value - materialized.value,
    revived: false,
  };
}
