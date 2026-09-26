// RNG contract of ADR 0003 section 6 and the reward-tick loot roll (tech note F05 5-6, D-059),
// P2-F05-T20. Counter-based streams: every roll builds a fresh mulberry32 from
// deriveSeed(runSeed, streamTag, index); no PRNG state survives between ticks or hits.
// fnv1a32, deriveSeed and streamRng come from @keep-walking/shared/formulas (TL B-05); only the
// loot roll stays here as the reference for packages/shared/src/reward (P2-F05-T08).
import { streamRng } from '@keep-walking/shared/formulas';

export interface LootItem {
  id: string;
  weight: number;
  qtyMin: number;
  qtyMax: number;
}
export interface LootRarity {
  rarity: string;
  /** null = always drops (Common); otherwise chance per tick in %. */
  chance_pct: number | null;
  /** Quantity multiplier of this rarity (Common: small dungeon x Ranged; others 1). */
  qtyMult: number;
  /** Chance multiplier (Ranged, small dungeon rare-and-above); 1 = none. */
  chanceMult: number;
  items: LootItem[];
}

export interface Loot {
  /** Number of draws taken from the stream (diagnostic for ports). */
  draws: number;
  items: { rarity: string; id: string; qty: number }[];
}

/**
 * One reward tick (ADR 0003 6.3) with partial scale f (1 = full tick, D-059 partial = e / window):
 * 1. one draw per chance rarity in table order: u < min(100, chance x chanceMult x f) / 100;
 * 2. per obtained rarity (always-drop first, table order): one draw picks the item by weight
 *    (first index whose cumulative weight > u x total);
 * 3. per picked item: one integer draw when qtyMin < qtyMax, then one stochasticRound draw of
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
