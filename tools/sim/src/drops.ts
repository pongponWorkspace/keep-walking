// Drop model (balance-model section 7, P1-F03-T08). Pure functions take DropParams built from
// config/balance/drops.json + economy.json; nothing here holds a balance value.
import type { BalanceConfig } from './config';
import { getPath, num, str } from './config';
import type { Rng } from './rng';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
/** Rarities rolled as a chance (Common always drops, its quantity is scaled instead). */
export const CHANCE_RARITIES = ['uncommon', 'rare', 'epic', 'legendary'] as const;
export type ChanceRarity = (typeof CHANCE_RARITIES)[number];

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

export interface DropParams {
  baseChance_pct: Record<ChanceRarity, number>;
  commonMin: number;
  commonMax: number;
  rangedBuffMaxMult: number;
  noRangedMult: number;
  smallRareAndAboveMult: number;
  smallCommonQtyMult: number;
  failedRaidWeekMinMult: number;
  failedRaidWeekMaxMult: number;
  lowTrustMult: number;
  lowTrustBlocksEpicAndAbove: boolean;
  /** NPC sell price per unit (gold) of the material each rarity gives; null = not sellable. */
  npcPrice_gold: Record<Rarity, number | null>;
  rewardTickInterval_s: number;
}

/** Context of one reward tick. Every tick counted here has already passed the movement gate. */
export interface DropContext {
  /** Ranged buff (%) inside the dungeon, null = no Ranged inside (×noRangedMult). */
  rangedBuff_pct: number | null;
  smallDungeon: boolean;
  lowTrust: boolean;
  /** Boss HP fraction left after last week's failed raid (0..1), null = normal week. */
  failedRaidBossHpLeft: number | null;
}

export const NEUTRAL_CONTEXT: DropContext = {
  rangedBuff_pct: 0,
  smallDungeon: false,
  lowTrust: false,
  failedRaidBossHpLeft: null,
};

export interface DropRates {
  /** Expected Common quantity per tick. */
  commonQty: number;
  /** Chance per tick, %, clamped to 100. */
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

function priceOrNull(cfg: BalanceConfig, rarity: Rarity): number | null {
  const item = str(cfg.drops, `rewardTypeByRarity.${rarity}`);
  const path = `npcSellPrice_gold.${item}`;
  return getPath(cfg.economy, path) === null ? null : num(cfg.economy, path);
}

export function dropParamsFromConfig(cfg: BalanceConfig): DropParams {
  const d = cfg.drops;
  const m = 'multipliers';
  const lowTrustBlocks = getPath(d, `${m}.lowTrustBlocksEpicAndAbove`);
  if (typeof lowTrustBlocks !== 'boolean') throw new Error('lowTrustBlocksEpicAndAbove');
  const npcPrice_gold = {} as Record<Rarity, number | null>;
  for (const r of RARITIES) npcPrice_gold[r] = priceOrNull(cfg, r);
  const baseChance_pct = {} as Record<ChanceRarity, number>;
  for (const r of CHANCE_RARITIES) baseChance_pct[r] = num(d, `baseChancePerRewardTick_pct.${r}`);
  return {
    baseChance_pct,
    commonMin: num(d, 'quantityPerDrop.commonMin'),
    commonMax: num(d, 'quantityPerDrop.commonMax'),
    rangedBuffMaxMult: num(d, `${m}.rangedBuffMaxMult`),
    noRangedMult: num(d, `${m}.noRangedMult`),
    smallRareAndAboveMult: num(d, `${m}.smallDungeonRareAndAboveMult`),
    smallCommonQtyMult: num(d, `${m}.smallDungeonCommonQuantityMult`),
    failedRaidWeekMinMult: num(d, `${m}.failedRaidWeekMinMult`),
    failedRaidWeekMaxMult: num(d, `${m}.failedRaidWeekMaxMult`),
    lowTrustMult: num(d, `${m}.lowTrustMult`),
    lowTrustBlocksEpicAndAbove: lowTrustBlocks,
    npcPrice_gold,
    rewardTickInterval_s: num(cfg.dungeons, 'rewardTick.rewardTickInterval_s'),
  };
}

/** Ranged term: 1 + buff (max rangedBuffMaxMult) with a Ranged inside, noRangedMult without. */
export function rangedTerm(rangedBuff_pct: number | null, p: DropParams): number {
  if (rangedBuff_pct === null) return p.noRangedMult;
  return Math.min(p.rangedBuffMaxMult, 1 + rangedBuff_pct / 100);
}

/** Failed-raid week: min + (max − min) × boss HP fraction left (A-P1-F03-T06-16b). */
export function failedRaidTerm(bossHpLeft: number | null, p: DropParams): number {
  if (bossHpLeft === null) return 1;
  const f = Math.min(1, Math.max(0, bossHpLeft));
  return p.failedRaidWeekMinMult + (p.failedRaidWeekMaxMult - p.failedRaidWeekMinMult) * f;
}

/** Per-tick expected Common quantity and chances after every multiplier (multiplicative). */
export function dropRates(ctx: DropContext, p: DropParams): DropRates {
  const shared =
    rangedTerm(ctx.rangedBuff_pct, p) *
    failedRaidTerm(ctx.failedRaidBossHpLeft, p) *
    (ctx.lowTrust ? p.lowTrustMult : 1);
  const smallRare = ctx.smallDungeon ? p.smallRareAndAboveMult : 1;
  const blocked = ctx.lowTrust && p.lowTrustBlocksEpicAndAbove;
  const chance = (r: ChanceRarity, small: number, isBlocked: boolean) =>
    isBlocked ? 0 : Math.min(100, p.baseChance_pct[r] * shared * small);
  return {
    commonQty:
      ((p.commonMin + p.commonMax) / 2) * shared * (ctx.smallDungeon ? p.smallCommonQtyMult : 1),
    uncommon: chance('uncommon', 1, false),
    rare: chance('rare', smallRare, false),
    epic: chance('epic', smallRare, blocked),
    legendary: chance('legendary', smallRare, blocked),
  };
}

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

/** Stochastic rounding (A-P1-F03-T06-22): floor + 1 with probability equal to the fraction. */
export function stochasticRound(x: number, rng: Rng): number {
  const f = Math.floor(x);
  return rng() < x - f ? f + 1 : f;
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
