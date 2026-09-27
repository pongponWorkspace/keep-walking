// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountInventoryScreen } from './inventory-screen';
import { getCopyText } from '../copy/load';
import type { AssetRuntime } from '../assets/icon-dom';

const NO_MANIFEST_ASSETS: AssetRuntime = {
  getManifest: () => undefined,
  basePath: '/kw/',
  scale: 1,
  isProduction: false,
};

const POTIONS = { hpPotionIds: ['hpSmall', 'hpMedium', 'hpLarge'], reviveItemId: 'revive' };

function makeScreen(onUsePotion = vi.fn(), onUseRevivePotion = vi.fn(), onClose = vi.fn()) {
  const container = document.createElement('div');
  const screen = mountInventoryScreen(container, {
    assets: NO_MANIFEST_ASSETS,
    potions: POTIONS,
    onUsePotion,
    onUseRevivePotion,
    onClose,
  });
  return { container, screen, onUsePotion, onUseRevivePotion, onClose };
}

describe('mountInventoryScreen', () => {
  it('shows the empty label when the inventory has no item with qty > 0', () => {
    const { container, screen } = makeScreen();
    screen.render({
      inventory: { hpSmall: 0 },
      hp: 50,
      maxHp: 100,
      recovering: false,
      hasRun: false,
    });
    expect(container.querySelector('.inventory-list')?.textContent).toBe(
      getCopyText('inventory.empty'),
    );
  });

  it('shows a usePotionButton for an HP potion only when HP < maxHP and no run is open', () => {
    const { container, screen, onUsePotion } = makeScreen();
    screen.render({
      inventory: { hpSmall: 2 },
      hp: 100,
      maxHp: 100,
      recovering: false,
      hasRun: false,
    });
    expect(container.querySelector('.inventory-use-potion-button')).toBeNull();

    screen.render({
      inventory: { hpSmall: 2 },
      hp: 50,
      maxHp: 100,
      recovering: false,
      hasRun: false,
    });
    const button = container.querySelector('.inventory-use-potion-button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.textContent).toBe(getCopyText('inventory.usePotionButton'));
    button.click();
    expect(onUsePotion).toHaveBeenCalledWith('hpSmall');
  });

  it('withholds the potion button entirely while a run is open (no disabled button either)', () => {
    const { container, screen } = makeScreen();
    screen.render({
      inventory: { hpSmall: 2 },
      hp: 50,
      maxHp: 100,
      recovering: false,
      hasRun: true,
    });
    expect(container.querySelector('.inventory-use-potion-button')).toBeNull();
  });

  it('shows useRevivePotionButton only while Recovering, has the item, and no run is open', () => {
    const { container, screen, onUseRevivePotion } = makeScreen();
    screen.render({
      inventory: { revive: 1 },
      hp: 30,
      maxHp: 100,
      recovering: false,
      hasRun: false,
    });
    expect(container.querySelector('.inventory-use-revive-potion-button')).toBeNull();

    screen.render({
      inventory: { revive: 1 },
      hp: 30,
      maxHp: 100,
      recovering: true,
      hasRun: false,
    });
    const button = container.querySelector(
      '.inventory-use-revive-potion-button',
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    expect(onUseRevivePotion).toHaveBeenCalledWith('revive');
  });

  it('never shows the revive button when the player has none in inventory, even while Recovering', () => {
    const { container, screen } = makeScreen();
    screen.render({
      inventory: { revive: 0 },
      hp: 30,
      maxHp: 100,
      recovering: true,
      hasRun: false,
    });
    expect(container.querySelector('.inventory-use-revive-potion-button')).toBeNull();
  });

  it('never renders a sell/market/enhance element of any kind (flow F06 override item 8)', () => {
    const { container, screen } = makeScreen();
    screen.render({
      inventory: { hpSmall: 3, revive: 1 },
      hp: 40,
      maxHp: 100,
      recovering: true,
      hasRun: false,
    });
    // Real shop/market copy keys (F06 override item 8: no sell-to-NPC, no market listing, no
    // enhance element anywhere in S-11 -- checked against the real Thai text, never a hardcoded
    // literal in this test file) plus the two English words, for good measure.
    for (const key of ['shop.sellToShopButton', 'shop.title', 'nav.shop', 'market.listButton']) {
      expect(container.textContent).not.toContain(getCopyText(key));
    }
    expect(container.textContent).not.toMatch(/sell|market|enhance/i);
  });

  it('show()/hide() toggle root.hidden; the close button calls onClose', () => {
    const { container, screen, onClose } = makeScreen();
    expect((container.querySelector('.inventory-screen') as HTMLElement).hidden).toBe(true);
    screen.show();
    expect((container.querySelector('.inventory-screen') as HTMLElement).hidden).toBe(false);
    screen.hide();
    expect((container.querySelector('.inventory-screen') as HTMLElement).hidden).toBe(true);
    // No `render()` call yet in this test, so the only button in the DOM is the close button.
    (container.querySelector('button') as HTMLButtonElement).click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
