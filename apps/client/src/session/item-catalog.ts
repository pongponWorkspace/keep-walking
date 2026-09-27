/**
 * Typed read of `drops.json#items.<id>` from the client's own whitelisted balance subset
 * (`config/whitelist.ts` already carries `drops.items`, tech note F04 15.1): `nameKey` (resolved
 * through `copy/names.ts`), `rarity` (`frame.rarity.<rarity>-52/72`, components.md 13.7) and
 * `assets.icon` (an id in `art/assets/manifest.json`, resolved through `assets/icon.ts`) — never a
 * raw item id shown to the player (CLAUDE.md non-negotiable 3, config not hardcode).
 */
import balanceSubsetJson from '../config/generated/balance-subset.generated.json';

type BalanceSubset = typeof balanceSubsetJson;
const subset = balanceSubsetJson as BalanceSubset;

export interface ItemCatalogEntry {
  readonly nameKey: string;
  readonly rarity: string;
  readonly iconId: string | undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `undefined` for an id the catalog does not have (a bug elsewhere, e.g. a stale drop table) —
 * the caller falls back to showing the raw id rather than crashing the summary screen. */
export function itemCatalogEntry(itemId: string): ItemCatalogEntry | undefined {
  const items = subset.drops.items as Readonly<Record<string, unknown>>;
  const raw = items[itemId];
  if (!isPlainObject(raw)) return undefined;
  const nameKey = raw['nameKey'];
  const rarity = raw['rarity'];
  if (typeof nameKey !== 'string' || typeof rarity !== 'string') return undefined;
  const assets = raw['assets'];
  const iconId =
    isPlainObject(assets) && typeof assets['icon'] === 'string' ? assets['icon'] : undefined;
  return { nameKey, rarity, iconId };
}
