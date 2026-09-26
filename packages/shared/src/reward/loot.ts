// Drop table resolution and the reward-tick loot roll (ADR 0003 section 6.3, tech note F05
// sections 1 and 5, P2-F05-T01 / T08). Reference: tools/sim/src/loot.ts + rng-contract.ts
// (read-only, never imported) — ported here without a BalanceConfig dependency: the caller
// (`session`, via `src/config`) resolves the raw `config/balance/drops.json#dropTables.<id>` JSON
// and the item-rarity map once per dungeon and passes them in already parsed.
import type { DropContext, DropParams, Rarity } from '../formulas';
import { RARITIES, failedRaidTerm, rangedTerm, streamRng } from '../formulas';

export type ItemKind = 'material' | 'potion' | 'equipment';

interface PoolEntry {
  readonly item: string;
  readonly weight: number;
  readonly qty: number | null;
}
export interface RollDef {
  readonly roll: 'rarity' | 'bonus';
  /** Rarity of a 'rarity' roll; the shared rarity of a 'bonus' roll's pool items. */
  readonly rarity: Rarity;
  readonly id: string;
  readonly chance_pct: number | null;
  readonly applyDropMultipliers: boolean;
  readonly pool: readonly PoolEntry[];
}
export interface DropTableDef {
  readonly id: string;
  readonly preset: string;
  readonly rolls: readonly RollDef[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function field(o: Record<string, unknown>, key: string): unknown {
  const v = o[key];
  if (v === undefined) throw new Error(`missing field "${key}"`);
  return v;
}
function fieldStr(o: Record<string, unknown>, key: string): string {
  const v = field(o, key);
  if (typeof v !== 'string') throw new Error(`field "${key}" must be a string`);
  return v;
}
function fieldNum(o: Record<string, unknown>, key: string): number {
  const v = field(o, key);
  if (typeof v !== 'number') throw new Error(`field "${key}" must be a number`);
  return v;
}
function isRarity(v: string): v is Rarity {
  return (RARITIES as readonly string[]).includes(v);
}

/**
 * Parses one raw `drops.json#dropTables.<id>` entry (`itemRarity` = `items.<id>.rarity`, a bonus
 * roll takes the fixed rarity of its pool items instead of an explicit field).
 */
export function parseDropTable(
  id: string,
  raw: unknown,
  itemRarity: Readonly<Record<string, string>>,
): DropTableDef {
  if (!isObject(raw)) throw new Error(`dropTables.${id} must be an object`);
  const rollsJson = field(raw, 'rolls');
  if (!Array.isArray(rollsJson)) throw new Error(`dropTables.${id}.rolls must be an array`);
  const rolls = rollsJson.map((r, index): RollDef => {
    if (!isObject(r)) throw new Error(`dropTables.${id}.rolls[${index}] must be an object`);
    const poolJson = field(r, 'pool');
    if (!Array.isArray(poolJson) || poolJson.length === 0) {
      throw new Error(`dropTables.${id}.rolls[${index}].pool must be a non-empty array`);
    }
    const pool = poolJson.map((p) => {
      if (!isObject(p)) throw new Error('pool entry must be an object');
      const qty = p['qty'];
      return {
        item: fieldStr(p, 'item'),
        weight: fieldNum(p, 'weight'),
        qty: typeof qty === 'number' ? qty : null,
      };
    });
    const kind = fieldStr(r, 'roll');
    if (kind === 'rarity') {
      const rarity = fieldStr(r, 'rarity');
      if (!isRarity(rarity)) throw new Error(`rolls[${index}].rarity "${rarity}"`);
      return {
        roll: 'rarity',
        rarity,
        id: rarity,
        chance_pct: null,
        applyDropMultipliers: true,
        pool,
      };
    }
    if (kind !== 'bonus') throw new Error(`rolls[${index}].roll "${kind}"`);
    const rarities = new Set(pool.map((e) => itemRarity[e.item]));
    const first = [...rarities][0];
    if (rarities.size !== 1 || first === undefined || !isRarity(first)) {
      throw new Error(`bonus roll ${index}: pool items need one fixed rarity`);
    }
    const apply = field(r, 'applyDropMultipliers');
    if (typeof apply !== 'boolean') throw new Error('applyDropMultipliers must be a boolean');
    return {
      roll: 'bonus',
      rarity: first,
      id: fieldStr(r, 'id'),
      chance_pct: fieldNum(r, 'chance_pct'),
      applyDropMultipliers: apply,
      pool,
    };
  });
  return { id, preset: fieldStr(raw, 'preset'), rolls };
}

/** Numbers a resolved table needs beyond the table itself. */
export interface LootParams {
  readonly dp: DropParams;
  /** quantityPerDrop.<rarity> for the chance rarities (Common uses dp.commonMin..commonMax). */
  readonly qty: Readonly<Record<Exclude<Rarity, 'common'>, number>>;
}

export interface LootItem {
  readonly id: string;
  readonly weight: number;
  readonly qtyMin: number;
  readonly qtyMax: number;
}
export interface LootRarity {
  readonly rarity: string;
  /** null = always drops (Common); otherwise chance per tick in %. */
  readonly chance_pct: number | null;
  readonly qtyMult: number;
  readonly chanceMult: number;
  readonly items: readonly LootItem[];
}

const RARE_AND_ABOVE: readonly Rarity[] = ['rare', 'epic', 'legendary'];
const EPIC_AND_ABOVE: readonly Rarity[] = ['epic', 'legendary'];

/**
 * Resolves a drop table for one tick context into `rollTickLoot`'s `LootRarity[]` (config roll
 * order preserved, ADR 0003 6.3). Multipliers follow `dropRates` exactly (`../formulas/drops.ts`):
 * shared term = Ranged x failed-raid week x low trust on every 'rarity' roll; small dungeon on
 * rare+ chances and the Common quantity; low trust blocks epic+ (chance 0). 'bonus' rolls keep
 * their own chance unless `applyDropMultipliers`.
 */
export function lootTable(def: DropTableDef, ctx: DropContext, lp: LootParams): LootRarity[] {
  const p = lp.dp;
  const shared =
    rangedTerm(ctx.rangedBuff_pct, p) *
    failedRaidTerm(ctx.failedRaidBossHpLeft, p) *
    (ctx.lowTrust ? p.lowTrustMult : 1);
  const blocked = ctx.lowTrust && p.lowTrustBlocksEpicAndAbove;
  return def.rolls.map((r): LootRarity => {
    if (r.roll === 'bonus') {
      return {
        rarity: r.rarity,
        chance_pct: r.chance_pct,
        qtyMult: 1,
        chanceMult: r.applyDropMultipliers ? shared : 1,
        items: r.pool.map((e): LootItem => ({
          id: e.item,
          weight: e.weight,
          qtyMin: e.qty ?? 1,
          qtyMax: e.qty ?? 1,
        })),
      };
    }
    if (r.rarity === 'common') {
      return {
        rarity: 'common',
        chance_pct: null,
        qtyMult: shared * (ctx.smallDungeon ? p.smallCommonQtyMult : 1),
        chanceMult: 1,
        items: r.pool.map((e): LootItem => ({
          id: e.item,
          weight: e.weight,
          qtyMin: p.commonMin,
          qtyMax: p.commonMax,
        })),
      };
    }
    const small =
      ctx.smallDungeon && RARE_AND_ABOVE.includes(r.rarity) ? p.smallRareAndAboveMult : 1;
    const isBlocked = blocked && EPIC_AND_ABOVE.includes(r.rarity);
    const q = lp.qty[r.rarity];
    return {
      rarity: r.rarity,
      chance_pct: isBlocked ? 0 : p.baseChance_pct[r.rarity],
      qtyMult: 1,
      chanceMult: shared * small,
      items: r.pool.map((e): LootItem => ({ id: e.item, weight: e.weight, qtyMin: q, qtyMax: q })),
    };
  });
}

export interface Loot {
  /** Number of draws taken from the stream (diagnostic for ports). */
  readonly draws: number;
  readonly items: readonly { rarity: string; id: string; qty: number }[];
}

/**
 * One reward tick (ADR 0003 6.3) with partial scale f (1 = full tick, D-059 partial = e / window):
 * 1. one draw per chance rarity in table order: u < min(100, chance x chanceMult x f) / 100;
 * 2. per obtained rarity (always-drop first, table order): one draw picks the item by weight;
 * 3. per picked item: one integer draw when qtyMin < qtyMax, then one stochastic-round draw of
 *    base x qtyMult (x f for the always-drop rarity). Items rounding to 0 are left out.
 */
export function rollTickLoot(
  runSeed: number,
  dropIndex: number,
  table: readonly LootRarity[],
  f: number,
): Loot {
  const rng = streamRng(runSeed, 'drop', dropIndex);
  let draws = 0;
  const draw = () => {
    draws += 1;
    return rng();
  };
  const obtained = table.filter((r) => r.chance_pct === null);
  for (const r of table) {
    if (r.chance_pct === null) continue;
    const pct = Math.min(100, r.chance_pct * r.chanceMult * f);
    if (draw() < pct / 100) obtained.push(r);
  }
  const picks = obtained.map((r) => {
    const total = r.items.reduce((s, it) => s + it.weight, 0);
    const u = draw() * total;
    let acc = 0;
    const item = r.items.find((it) => (acc += it.weight) > u) ?? (r.items.at(-1) as LootItem);
    return { r, item };
  });
  const items = picks.map(({ r, item }) => {
    const base =
      item.qtyMin < item.qtyMax
        ? item.qtyMin + Math.floor(draw() * (item.qtyMax - item.qtyMin + 1))
        : item.qtyMin;
    const x = base * r.qtyMult * (r.chance_pct === null ? f : 1);
    const floor = Math.floor(x);
    const qty = draw() < x - floor ? floor + 1 : floor;
    return { rarity: r.rarity, id: item.id, qty };
  });
  return { draws, items: items.filter((it) => it.qty > 0) };
}
