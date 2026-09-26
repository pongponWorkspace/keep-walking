// Drop tables per preset (config/balance/drops.json#dropTables, P2-F05-T01) resolved into the
// LootRarity[] that rollTickLoot (ADR 0003 6.3) takes. Pure except for reading the loaded config;
// every multiplier is the shared drop formula (rangedTerm, failedRaidTerm) so a resolved table
// has exactly the chances and Common quantity of dropRates (balance-model section 7).
import type { DropContext, DropParams, Rarity } from '@keep-walking/shared/formulas';
import {
  RARITIES,
  dropParamsFromConfig,
  failedRaidTerm,
  rangedTerm,
} from '@keep-walking/shared/formulas';
import type { BalanceConfig, Json, JsonObject } from './config';
import { getPath, num, valueKeys } from './config';
import type { LootItem, LootRarity } from './rng-contract';

export type ItemKind = 'material' | 'potion' | 'equipment';

export interface ItemDef {
  id: string;
  kind: ItemKind;
  /** Frame rarity, or 'byRoll' (equipment shows the rarity of the roll that gave it). */
  rarity: Rarity | 'byRoll';
  nameKey: string;
  icon: string;
  slot: string | null;
}

interface PoolEntry {
  item: string;
  weight: number;
  qty: number | null;
}
export interface RollDef {
  roll: 'rarity' | 'bonus';
  /** Rarity of a 'rarity' roll; for a 'bonus' roll the shared rarity of its pool items. */
  rarity: Rarity;
  id: string;
  chance_pct: number | null;
  applyDropMultipliers: boolean;
  pool: PoolEntry[];
}
export interface DropTableDef {
  id: string;
  preset: string;
  rolls: RollDef[];
}

function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function field(o: JsonObject, key: string): Json {
  const v = o[key];
  if (v === undefined) throw new Error(`missing field "${key}"`);
  return v;
}
function fieldStr(o: JsonObject, key: string): string {
  const v = field(o, key);
  if (typeof v !== 'string') throw new Error(`field "${key}" must be a string`);
  return v;
}
function fieldNum(o: JsonObject, key: string): number {
  const v = field(o, key);
  if (typeof v !== 'number') throw new Error(`field "${key}" must be a number`);
  return v;
}
function isRarity(v: string): v is Rarity {
  return (RARITIES as readonly string[]).includes(v);
}

export function itemCatalog(cfg: BalanceConfig): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  for (const id of valueKeys(cfg.drops, 'items')) {
    const o = getPath(cfg.drops, `items.${id}`);
    if (!isObject(o)) throw new Error(`items.${id} must be an object`);
    const kind = fieldStr(o, 'kind');
    if (kind !== 'material' && kind !== 'potion' && kind !== 'equipment')
      throw new Error(`items.${id}.kind "${kind}"`);
    const rarity = fieldStr(o, 'rarity');
    if (rarity !== 'byRoll' && !isRarity(rarity)) throw new Error(`items.${id}.rarity "${rarity}"`);
    const assets = field(o, 'assets');
    if (!isObject(assets)) throw new Error(`items.${id}.assets must be an object`);
    out[id] = {
      id,
      kind,
      rarity,
      nameKey: fieldStr(o, 'nameKey'),
      icon: fieldStr(assets, 'icon'),
      slot: kind === 'equipment' ? fieldStr(o, 'slot') : null,
    };
  }
  return out;
}

export function dropTableIds(cfg: BalanceConfig): string[] {
  return valueKeys(cfg.drops, 'dropTables');
}

/**
 * Parses one raw drops.json#dropTables entry. itemRarity = items.<id>.rarity (a bonus roll takes
 * the fixed rarity of its pool items). Vectors pass the raw JSON so ports parse the same shape.
 */
export function parseDropTable(
  id: string,
  raw: Json,
  itemRarity: Record<string, string>,
): DropTableDef {
  if (!isObject(raw)) throw new Error(`dropTables.${id} must be an object`);
  const rollsJson = field(raw, 'rolls');
  if (!Array.isArray(rollsJson)) throw new Error(`dropTables.${id}.rolls must be an array`);
  const rolls = rollsJson.map((r, index): RollDef => {
    if (!isObject(r)) throw new Error(`dropTables.${id}.rolls[${index}] must be an object`);
    const poolJson = field(r, 'pool');
    if (!Array.isArray(poolJson) || poolJson.length === 0)
      throw new Error(`dropTables.${id}.rolls[${index}].pool must be a non-empty array`);
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
    if (rarities.size !== 1 || first === undefined || !isRarity(first))
      throw new Error(`bonus roll ${index}: pool items need one fixed rarity`);
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

export function itemRarities(cfg: BalanceConfig): Record<string, string> {
  return Object.fromEntries(Object.values(itemCatalog(cfg)).map((it) => [it.id, it.rarity]));
}

export function dropTableDef(cfg: BalanceConfig, id: string): DropTableDef {
  return parseDropTable(id, getPath(cfg.drops, `dropTables.${id}`), itemRarities(cfg));
}

/** Numbers a resolved table needs beyond the table itself (drops.json multipliers, quantities). */
export interface LootParams {
  dp: DropParams;
  /** quantityPerDrop.<rarity> for the chance rarities (Common uses dp.commonMin..commonMax). */
  qty: Record<Exclude<Rarity, 'common'>, number>;
}

export function lootParamsFromConfig(cfg: BalanceConfig): LootParams {
  const q = (r: string) => num(cfg.drops, `quantityPerDrop.${r}`);
  return {
    dp: dropParamsFromConfig(cfg),
    qty: { uncommon: q('uncommon'), rare: q('rare'), epic: q('epic'), legendary: q('legendary') },
  };
}

const RARE_AND_ABOVE: readonly Rarity[] = ['rare', 'epic', 'legendary'];
const EPIC_AND_ABOVE: readonly Rarity[] = ['epic', 'legendary'];

/**
 * Resolves a drop table for one tick context into rollTickLoot's LootRarity[] (same order as the
 * config rolls). Multipliers follow dropRates exactly: shared term = Ranged x failed-raid week x
 * low trust on every 'rarity' roll; small dungeon on rare+ chances and the Common quantity; low
 * trust blocks epic+ (chance 0). 'bonus' rolls keep their own chance unless applyDropMultipliers.
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

/** The same table with every potion roll removed (the "no potions" survival case). */
export function withoutBonusRolls(def: DropTableDef): DropTableDef {
  return { ...def, rolls: def.rolls.filter((r) => r.roll !== 'bonus') };
}

/** Expected units of each item per passing tick at f = 1 (checks the table against dropRates). */
export function expectedPerTick(table: readonly LootRarity[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of table) {
    const chance = r.chance_pct === null ? 1 : Math.min(100, r.chance_pct * r.chanceMult) / 100;
    const total = r.items.reduce((s, it) => s + it.weight, 0);
    for (const it of r.items) {
      const meanQty = ((it.qtyMin + it.qtyMax) / 2) * r.qtyMult;
      out[it.id] = (out[it.id] ?? 0) + chance * (it.weight / total) * meanQty;
    }
  }
  return out;
}

const ICON_PREFIX = 'icon.item.';

/**
 * Consistency rules of drops.json#items / #dropTables (P2-F05-T01). An empty list = consistent.
 * presetIds = data/dungeons/presets.json#presetIds.confirmed (level-designer).
 */
export function dropTableProblems(cfg: BalanceConfig, presetIds: readonly string[]): string[] {
  const out: string[] = [];
  const items = itemCatalog(cfg);
  const autoOrder = new Set(
    (getPath(cfg.economy, 'autoPotion.defaultPotionOrder') as Json[]).map(String),
  );
  for (const it of Object.values(items)) {
    if (!it.icon.startsWith(ICON_PREFIX))
      out.push(`items.${it.id}: icon must start with ${ICON_PREFIX}`);
    if (it.kind === 'material') num(cfg.economy, `npcSellPrice_gold.${it.id}`);
    if (it.kind === 'potion') getPath(cfg.economy, `potions.${it.id}`);
    if (it.kind === 'equipment') getPath(cfg.equipment, `slots.${it.slot ?? ''}`);
    if ((it.kind === 'equipment') !== (it.rarity === 'byRoll'))
      out.push(`items.${it.id}: only equipment uses rarity byRoll`);
  }
  const seenPresets = new Set<string>();
  for (const id of dropTableIds(cfg)) {
    const def = dropTableDef(cfg, id);
    if (!presetIds.includes(def.preset)) out.push(`dropTables.${id}: unknown preset ${def.preset}`);
    seenPresets.add(def.preset);
    const rarityRolls = def.rolls.filter((r) => r.roll === 'rarity').map((r) => r.rarity);
    if (rarityRolls.join() !== RARITIES.join())
      out.push(`dropTables.${id}: rarity rolls must be ${RARITIES.join(', ')} once each, in order`);
    const firstBonus = def.rolls.findIndex((r) => r.roll === 'bonus');
    if (firstBonus >= 0 && def.rolls.slice(firstBonus).some((r) => r.roll === 'rarity'))
      out.push(
        `dropTables.${id}: bonus rolls come after every rarity roll (ADR 0003 6.3 low to high)`,
      );
    let hasAutoPotion = false;
    for (const r of def.rolls) {
      for (const e of r.pool) {
        const it = items[e.item];
        if (it === undefined) {
          out.push(`dropTables.${id}.${r.id}: unknown item ${e.item}`);
          continue;
        }
        if (!Number.isInteger(e.weight) || e.weight <= 0)
          out.push(`dropTables.${id}.${r.id}: weight of ${e.item} must be a positive integer`);
        if (r.roll === 'rarity' && it.rarity !== 'byRoll' && it.rarity !== r.rarity)
          out.push(`dropTables.${id}.${r.id}: ${e.item} has rarity ${it.rarity}`);
        if (r.roll === 'bonus') {
          if (it.kind !== 'potion')
            out.push(`dropTables.${id}.${r.id}: bonus rolls hold potions only`);
          if (e.qty === null || !Number.isInteger(e.qty) || e.qty < 1)
            out.push(`dropTables.${id}.${r.id}: qty must be a positive integer`);
          if (autoOrder.has(e.item)) hasAutoPotion = true;
        }
      }
      if (r.roll === 'bonus' && (r.chance_pct === null || r.chance_pct <= 0 || r.chance_pct > 100))
        out.push(`dropTables.${id}.${r.id}: chance_pct must be in (0, 100]`);
    }
    if (!hasAutoPotion) out.push(`dropTables.${id}: needs an auto-potion drop (D-089, GD B-06)`);
  }
  for (const preset of presetIds)
    if (!seenPresets.has(preset)) out.push(`no drop table for preset ${preset}`);
  return out;
}
