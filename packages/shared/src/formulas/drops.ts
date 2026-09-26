// Drop model (design/systems/balance-model.md section 7), ported from the pure part of
// tools/sim/src/drops.ts without forking: dropRates, rangedTerm, stochasticRound and
// dropParamsFromConfig (P2-F05-T02 acceptance). packages/shared must reproduce
// design/systems/test-vectors/drops.json (fn = "dropRates"; "meanDaysBetween" is a reporting
// helper from tools/sim, not ported here — see the vector test's SKIP_FNS list).
import { bool, getPath, num, str, type JsonObject } from '../config';
import type { Rng } from './rng';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
/** Rarities rolled as a chance (Common always drops, its quantity is scaled instead). */
export const CHANCE_RARITIES = ['uncommon', 'rare', 'epic', 'legendary'] as const;
export type ChanceRarity = (typeof CHANCE_RARITIES)[number];

export interface DropParams {
  readonly baseChance_pct: Record<ChanceRarity, number>;
  readonly commonMin: number;
  readonly commonMax: number;
  readonly rangedBuffMaxMult: number;
  readonly noRangedMult: number;
  readonly smallRareAndAboveMult: number;
  readonly smallCommonQtyMult: number;
  readonly failedRaidWeekMinMult: number;
  readonly failedRaidWeekMaxMult: number;
  readonly lowTrustMult: number;
  readonly lowTrustBlocksEpicAndAbove: boolean;
  /** NPC sell price per unit (gold) of the material each rarity gives; null = not sellable. */
  readonly npcPrice_gold: Record<Rarity, number | null>;
  readonly rewardTickInterval_s: number;
}

/** Context of one reward tick. Every tick counted here has already passed the movement gate. */
export interface DropContext {
  /** Ranged buff (%) inside the dungeon, null = no Ranged inside (x noRangedMult). */
  readonly rangedBuff_pct: number | null;
  readonly smallDungeon: boolean;
  readonly lowTrust: boolean;
  /** Boss HP fraction left after last week's failed raid (0..1), null = normal week. */
  readonly failedRaidBossHpLeft: number | null;
}

export const NEUTRAL_CONTEXT: DropContext = {
  rangedBuff_pct: 0,
  smallDungeon: false,
  lowTrust: false,
  failedRaidBossHpLeft: null,
};

export interface DropRates {
  /** Expected Common quantity per tick. */
  readonly commonQty: number;
  /** Chance per tick, %, clamped to 100. */
  readonly uncommon: number;
  readonly rare: number;
  readonly epic: number;
  readonly legendary: number;
}

/** The slice of a loaded Config that dropParamsFromConfig needs (balance.drops/dungeons/economy). */
export interface DropConfigInput {
  readonly drops: JsonObject;
  readonly dungeons: JsonObject;
  readonly economy: JsonObject;
}

function priceOrNull(drops: JsonObject, economy: JsonObject, rarity: Rarity): number | null {
  const item = str(drops, `rewardTypeByRarity.${rarity}`);
  const path = `npcSellPrice_gold.${item}`;
  return getPath(economy, path) === null ? null : num(economy, path);
}

/**
 * Builds DropParams from a loaded Config's balance.drops / balance.dungeons / balance.economy
 * (ADR 0003 3.2 point 6: engines read already-typed config, they never read files themselves).
 */
export function dropParamsFromConfig(cfg: DropConfigInput): DropParams {
  const d = cfg.drops;
  const m = 'multipliers';
  const baseChance_pct = {} as Record<ChanceRarity, number>;
  for (const r of CHANCE_RARITIES) baseChance_pct[r] = num(d, `baseChancePerRewardTick_pct.${r}`);
  const npcPrice_gold = {} as Record<Rarity, number | null>;
  for (const r of RARITIES) npcPrice_gold[r] = priceOrNull(d, cfg.economy, r);
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
    lowTrustBlocksEpicAndAbove: bool(d, `${m}.lowTrustBlocksEpicAndAbove`),
    npcPrice_gold,
    rewardTickInterval_s: num(cfg.dungeons, 'rewardTick.rewardTickInterval_s'),
  };
}

/** Ranged term: 1 + buff (max rangedBuffMaxMult) with a Ranged inside, noRangedMult without. */
export function rangedTerm(rangedBuff_pct: number | null, p: DropParams): number {
  if (rangedBuff_pct === null) return p.noRangedMult;
  return Math.min(p.rangedBuffMaxMult, 1 + rangedBuff_pct / 100);
}

/** Failed-raid week: min + (max - min) x boss HP fraction left (A-P1-F03-T06-16b). */
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

/** Stochastic rounding (A-P1-F03-T06-22): floor + 1 with probability equal to the fraction. */
export function stochasticRound(x: number, rng: Rng): number {
  const f = Math.floor(x);
  return rng() < x - f ? f + 1 : f;
}
