/**
 * `.coming-soon-screen` — the shared "เร็วๆ นี้" screen for the three not-yet-built nav tabs
 * (design/ux/flows/F10-account-shell.md Flow E4, components.md 16.3): one mounted DOM, three
 * content sets (Upgrade/Shop/Party) swapped by `show(tab)` — tech note docs/tech/
 * F10-account-shell.md section 6 rule 1 (mount once) and rule 5 (idempotent: a repeat `show` call
 * with the same tab already showing changes no DOM at all, checked below with `currentTab`).
 *
 * Deliberately bare (F10-R35): plate glyph + "coming soon" corner badge + one-line title + one-line
 * body, **no button anywhere on this screen** — the only way back is the Map tab on the bottom nav
 * the caller keeps showing underneath (components.md 16.3 item 5). No count, date, unlock condition
 * or system-explaining image ever appears here (icon-grammar 7.4's own "ไม่มีภาพเพิ่มที่อธิบายระบบ").
 */
import { getCopyText } from '../copy/load';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

export type ComingSoonTab = 'upgrade' | 'shop' | 'party';

const TAB_ICON: Readonly<Record<ComingSoonTab, string>> = {
  upgrade: 'icon.ui.enhance',
  shop: 'icon.ui.market',
  party: 'icon.ui.party',
};
const TAB_TITLE_KEY: Readonly<Record<ComingSoonTab, string>> = {
  upgrade: 'comingSoon.upgradeTitle',
  shop: 'comingSoon.shopTitle',
  party: 'comingSoon.partyTitle',
};
const TAB_BODY_KEY: Readonly<Record<ComingSoonTab, string>> = {
  upgrade: 'comingSoon.upgradeBody',
  shop: 'comingSoon.shopBody',
  party: 'comingSoon.partyBody',
};

// icon-tone.ts's own literal token convention (design/ux/tokens.json, comment-named).
const TOKEN_INK_900 = '#1A1A22';

export interface ComingSoonScreenDeps {
  readonly iconGlyph: IconGlyphRenderer;
}

export interface ComingSoonScreen {
  readonly root: HTMLElement;
  show(tab: ComingSoonTab): void;
  hide(): void;
}

export function mountComingSoonScreen(
  container: HTMLElement,
  deps: ComingSoonScreenDeps,
): ComingSoonScreen {
  const root = document.createElement('div');
  root.className = 'screen coming-soon-screen';
  root.hidden = true;

  const plateMain = document.createElement('div');
  plateMain.className = 'cs-plate-main';
  const mainIcon = document.createElement('span');
  mainIcon.className = 'cs-plate-main-icon';
  const plateBadge = document.createElement('div');
  plateBadge.className = 'cs-plate-badge';
  const badgeIcon = document.createElement('span');
  badgeIcon.className = 'cs-plate-badge-icon';
  plateBadge.append(badgeIcon);
  plateMain.append(mainIcon, plateBadge);
  void deps.iconGlyph.setIconGlyph(badgeIcon, 'icon.ui.coming-soon', {
    altText: '',
    colorCss: TOKEN_INK_900,
    onNightBackground: false,
    nightPlateColorCss: '',
  });

  const title = document.createElement('h1');
  title.className = 'cs-title';
  const body = document.createElement('p');
  body.className = 'cs-body';

  root.append(plateMain, title, body);
  container.append(root);

  let currentTab: ComingSoonTab | undefined;

  return {
    root,
    show(tab) {
      root.hidden = false;
      if (currentTab === tab) return;
      currentTab = tab;
      void deps.iconGlyph.setIconGlyph(mainIcon, TAB_ICON[tab], {
        altText: '',
        colorCss: TOKEN_INK_900,
        onNightBackground: false,
        nightPlateColorCss: '',
      });
      title.textContent = getCopyText(TAB_TITLE_KEY[tab]);
      body.textContent = getCopyText(TAB_BODY_KEY[tab]);
    },
    hide() {
      root.hidden = true;
    },
  };
}
