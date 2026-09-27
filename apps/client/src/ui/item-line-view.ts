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
}

const RARITY_FRAME_SIZE = 52;

export function itemLineView(itemId: string, qty: number): ItemLineView {
  const entry = itemCatalogEntry(itemId);
  if (entry === undefined) {
    return { name: itemId, qty, frameIconId: undefined, itemIconId: undefined };
  }
  return {
    name: getItemName(entry.nameKey),
    qty,
    frameIconId: `frame.rarity.${entry.rarity}-${RARITY_FRAME_SIZE}`,
    itemIconId: entry.iconId,
  };
}
