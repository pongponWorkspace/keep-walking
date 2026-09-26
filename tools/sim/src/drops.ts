// Drop model (balance-model section 7, P1-F03-T08). The pure formulas (dropRates, rangedTerm,
// failedRaidTerm, stochasticRound, dropParamsFromConfig) live in @keep-walking/shared/formulas
// (TL B-05, P2-F05-T01) and are re-exported here; this file keeps only the reporting helpers and
// Monte Carlo loops of the simulator. Nothing here holds a balance value.
import type { DropContext, DropParams, Rarity, Rng } from '@keep-walking/shared/formulas';
import { CHANCE_RARITIES, dropRates, stochasticRound } from '@keep-walking/shared/formulas';

export type {
  ChanceRarity,
  DropContext,
  DropParams,
  DropRates,
  Rarity,
} from '@keep-walking/shared/formulas';
export {
  CHANCE_RARITIES,
  NEUTRAL_CONTEXT,
  RARITIES,
  dropParamsFromConfig,
  dropRates,
  failedRaidTerm,
  rangedTerm,
  stochasticRound,
} from '@keep-walking/shared/formulas';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

export function ticksPerHour(p: DropParams): number {
  return SECONDS_PER_HOUR / p.rewardTickInterval_s;
}

/** Reward ticks in a day of walking (every tick passes the movement gate). */
export function ticksPerDay(minutesPerDay: number, p: DropParams): number {
  return (minutesPerDay * SECONDS_PER_MINUTE) / p.rewardTickInterval_s;
}

/** Expected NPC gold per reward tick (sellable materials only; equipment has no NPC price). */
export function incomePerTick_gold(ctx: DropContext, p: DropParams): number {
  const r = dropRates(ctx, p);
  const price = (k: Rarity) => p.npcPrice_gold[k] ?? 0;
  return (
    r.commonQty * price('common') +
    (r.uncommon / 100) * price('uncommon') +
    (r.rare / 100) * price('rare') +
    (r.epic / 100) * price('epic') +
    (r.legendary / 100) * price('legendary')
  );
}

/** Expected NPC gold per walking hour, every material sold to NPC (upper bound of gold). */
export function incomePerHourCtx_gold(ctx: DropContext, p: DropParams): number {
  return ticksPerHour(p) * incomePerTick_gold(ctx, p);
}

/** Mean days between drops of one rarity: 1 / (chance × ticks per day). */
export function meanDaysBetween(chance_pct: number, minutesPerDay: number, p: DropParams): number {
  const perDay = (chance_pct / 100) * ticksPerDay(minutesPerDay, p);
  return perDay <= 0 ? Number.POSITIVE_INFINITY : 1 / perDay;
}

/** Monte Carlo: gaps (in walking days) between successive drops, rolling every tick. */
export function simulateDropGaps(
  chance_pct: number,
  ticksDay: number,
  gaps: number,
  rng: Rng,
): number[] {
  const out: number[] = [];
  const pr = chance_pct / 100;
  if (pr <= 0) return out;
  let since = 0;
  while (out.length < gaps) {
    since += 1;
    if (rng() < pr) {
      out.push(since / ticksDay);
      since = 0;
    }
  }
  return out;
}

/** Monte Carlo: NPC gold over a number of ticks, with integer Common rolls and stochastic rounding. */
export function simulateIncome(ctx: DropContext, ticks: number, p: DropParams, rng: Rng): number {
  const r = dropRates(ctx, p);
  const qtyMult = r.commonQty / ((p.commonMin + p.commonMax) / 2);
  const price = (k: Rarity) => p.npcPrice_gold[k] ?? 0;
  let gold = 0;
  for (let t = 0; t < ticks; t += 1) {
    const base = p.commonMin + Math.floor(rng() * (p.commonMax - p.commonMin + 1));
    gold += stochasticRound(base * qtyMult, rng) * price('common');
    for (const k of CHANCE_RARITIES) if (rng() < r[k] / 100) gold += price(k);
  }
  return gold;
}
