/**
 * Pure view model for one run-summary loot row (P2-X21, components.md 13.7's rarity frame):
 * resolves `RunSummary.loot[].id` to a display name (`copy/names.ts`) and a rarity frame id
 * (`frame.rarity.<rarity>-52`, `session/item-catalog.ts`) — never the raw item id.
 */
import { itemCatalogEntry } from '../session/item-catalog';
import { getItemName } from '../copy/names';

export interface ItemLineView {
  readonly name: string;
  readonly qty: number;
  /** `frame.rarity.<rarity>-52` (an id in `art/assets/manifest.json`), or `undefined` when the
   * item id is not in the catalog (falls back to name-only text, never a crash). */
  readonly frameIconId: string | undefined;
  readonly itemIconId: string | undefined;
  /** The catalog's raw `rarity` string (`common`|`uncommon`|`rare`|`epic`|`legendary`, or
   * `byRoll` for an equipment slot whose rolled tier is not in `RunSummary.loot`'s `{id, qty}`
   * shape yet — undefined for an unknown item). Callers that need to sort/animate by tier use
   * `rarityRank`/`isKnownRarity` below rather than re-deriving this from `frameIconId`. */
  readonly rarity: string | undefined;
}

const RARITY_FRAME_SIZE = 52;

/** Legendary first (rarest, most attention-worthy) down to Common (F05 flow B1: "ของหายากอยู่บน
 * สุด"). `rarityRank` returns this array's index; an unknown/undefined rarity (including the
 * equipment placeholder `byRoll`, art/vfx/rarity-reveal.ts has no effect for it) sorts after every
 * known tier, same as Common. */
export const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'] as const;
export type KnownRarity = (typeof RARITY_ORDER)[number];

export function isKnownRarity(rarity: string | undefined): rarity is KnownRarity {
  return rarity !== undefined && (RARITY_ORDER as readonly string[]).includes(rarity);
}

export function rarityRank(rarity: string | undefined): number {
  if (!isKnownRarity(rarity)) return RARITY_ORDER.length;
  return RARITY_ORDER.indexOf(rarity);
}

export function itemLineView(itemId: string, qty: number): ItemLineView {
  const entry = itemCatalogEntry(itemId);
  if (entry === undefined) {
    return { name: itemId, qty, frameIconId: undefined, itemIconId: undefined, rarity: undefined };
  }
  return {
    name: getItemName(entry.nameKey),
    qty,
    frameIconId: `frame.rarity.${entry.rarity}-${RARITY_FRAME_SIZE}`,
    itemIconId: entry.iconId,
    rarity: entry.rarity,
  };
}
