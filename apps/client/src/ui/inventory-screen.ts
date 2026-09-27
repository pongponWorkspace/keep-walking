/**
 * `S-11-inventory` (flow F06 override item 8, section 7.0/C8; `design/features/
 * F06-hp-damage-onboarding.md` R26, R51): the loot list plus the two potion actions that only make
 * sense outside a run — using an HP potion (`inventory.usePotionButton`) when HP < maxHP, and
 * using the revive potion (`inventory.useRevivePotionButton`) while Recovering. **No sell-to-NPC,
 * no market listing, no enhance button, and no `unlocks.npcShop` unlock anywhere in this module**
 * (flow F06 override item 8: "Phase 2 ยังไม่เปิดร้าน NPC จริง ... ต้องไม่มี element ใดของร้าน/
 * ตลาด/ตีบวกในหน้านี้เลย ไม่ว่าจะ disabled หรือไม่").
 *
 * Both potion buttons dispatch `{type: 'usePotion', itemId}` (`@keep-walking/shared/session`) —
 * this module never computes a heal amount or a reject reason itself (server-authoritative HP,
 * CLAUDE.md non-negotiable 1); it only decides *whether to show* a button from already-known
 * `PlayerView` fields (`hp < maxHp`, `recovering`, `inventory[id] > 0`), matching flow C8's "ถ้าไม่มี
 * ยาชนิดนี้ ไม่แสดงปุ่มนี้เลย (ไม่ใช่ปุ่ม disabled)" rule for both buttons alike.
 *
 * Mounting note (handoff, see this task's REPORT): the home-screen shortcut into this screen
 * (`inventory.homeShortcut`) is P2-F06-T09's own build (the home-state screens); this module is
 * the self-contained screen content T09 mounts/links to, the same division of labor
 * `ui/credits.ts` already documents for `settings.creditsLink`.
 */
import { getCopyText } from '../copy/load';
import { itemLineView, rarityRank } from './item-line-view';
import { buildItemIconElement } from './item-icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';

export interface InventoryPotionCatalog {
  /** `economy.autoPotion.defaultPotionOrder` (`hpSmall`/`hpMedium`/`hpLarge`, config order, never
   * hardcoded here) — every id in this list gets a `usePotionButton` row when eligible. */
  readonly hpPotionIds: readonly string[];
  /** The one `economy.potions.<id>` entry with a `reviveToHp_pct` (derived by the caller from
   * config, never a literal `'revive'` in this module). `undefined` if config somehow has none
   * (fail-honest empty state: the revive button never renders). */
  readonly reviveItemId: string | undefined;
}

export interface InventoryScreenView {
  readonly inventory: Readonly<Record<string, number>>;
  readonly hp: number;
  readonly maxHp: number;
  readonly recovering: boolean;
  /** `state.run !== null` (`selectCanClearLocalData`'s own sibling check, R13): every potion
   * button is withheld while a run is open, the same fail-honest way the revive button is withheld
   * with no potion in stock — not a disabled button, no element at all. */
  readonly hasRun: boolean;
}

export interface InventoryScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
  render(view: InventoryScreenView): void;
}

export interface InventoryScreenDeps {
  readonly assets: AssetRuntime;
  readonly potions: InventoryPotionCatalog;
  readonly onUsePotion: (itemId: string) => void;
  readonly onUseRevivePotion: (itemId: string) => void;
  readonly onClose: () => void;
}

function itemRow(
  assets: AssetRuntime,
  id: string,
  qty: number,
  actionButton: HTMLButtonElement | undefined,
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'inventory-row';
  const view = itemLineView(id, qty);
  const iconEl = buildItemIconElement(assets, view);
  const label = document.createElement('span');
  label.className = 'inventory-row-label';
  label.textContent = `${view.name} x${view.qty}`;
  li.append(iconEl, label);
  if (actionButton !== undefined) li.append(actionButton);
  return li;
}

export function mountInventoryScreen(
  container: HTMLElement,
  deps: InventoryScreenDeps,
): InventoryScreen {
  const root = document.createElement('div');
  root.className = 'screen inventory-screen';
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('inventory.title');

  const list = document.createElement('ul');
  list.className = 'inventory-list';

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary inventory-close-button';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => deps.onClose());

  root.append(title, list, closeButton);
  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    render(view) {
      list.innerHTML = '';
      const entries = Object.entries(view.inventory).filter(([, qty]) => qty > 0);
      if (entries.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = getCopyText('inventory.empty');
        list.append(empty);
        return;
      }
      const sorted = entries.sort(
        ([aId, aQty], [bId, bQty]) =>
          rarityRank(itemLineView(aId, aQty).rarity) - rarityRank(itemLineView(bId, bQty).rarity),
      );
      for (const [id, qty] of sorted) {
        let button: HTMLButtonElement | undefined;
        if (!view.hasRun && deps.potions.hpPotionIds.includes(id) && view.hp < view.maxHp) {
          button = document.createElement('button');
          button.className = 'btn btn-secondary inventory-use-potion-button';
          button.textContent = getCopyText('inventory.usePotionButton');
          button.addEventListener('click', () => deps.onUsePotion(id));
        } else if (!view.hasRun && id === deps.potions.reviveItemId && view.recovering && qty > 0) {
          button = document.createElement('button');
          // V-38 (uiux decision, components.md 6/3): S-11 inventory never has a `.btn-primary` — a
          // list screen may show more than one eligible potion row at once, so neither button may
          // claim the single-primary-per-screen slot (style guide 5).
          button.className = 'btn btn-secondary inventory-use-revive-potion-button';
          button.textContent = getCopyText('inventory.useRevivePotionButton');
          button.addEventListener('click', () => deps.onUseRevivePotion(id));
        }
        list.append(itemRow(deps.assets, id, qty, button));
      }
    },
  };
}
