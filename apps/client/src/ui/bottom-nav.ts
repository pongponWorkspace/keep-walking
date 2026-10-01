/**
 * `.bottombar-f10` — the 5-tab bottom nav (design/ux/flows/F10-account-shell.md Flow E,
 * components.md 16.1, icon-grammar 7.4, art/direction/F10-shell-direction.md section 2): Inventory,
 * Upgrade, Map, Shop, Party, left to right, always all five and always tappable (D-148, F10-R32) —
 * none ever pale, grey out, or carry a "coming soon" badge on the nav itself (F10-R38). Mounted
 * once (tech note docs/tech/F10-account-shell.md section 6 rule 1): `setActive` only toggles a
 * class on the five already-built tabs, never rebuilds the DOM, and is idempotent (rule 5) — a
 * repeat call with the tab already active makes `classList.toggle`'s own no-op path the only thing
 * that runs, zero mutations (section 6 rule 5's own MutationObserver test).
 *
 * The caller (`f04-app.ts`) owns visibility (`show`/`hide`, per flow section 8's table) and what a
 * tap actually does — including the `nav_tab_opened`/`coming_soon_viewed` telemetry and the "no
 * effect when already on this tab" rule (flow E3) — this module only reports which tab was tapped.
 */
import { getCopyText } from '../copy/load';
import { setIconGlyphWhenReady } from '../assets/icon-glyph';
import type { IconGlyphRenderer, ManifestReadySignal } from '../assets/icon-glyph';

export type NavTab = 'inventory' | 'upgrade' | 'map' | 'shop' | 'party';

/** Left-to-right order (D-148, F10-R32) — never reordered. */
const TABS: readonly {
  readonly tab: NavTab;
  readonly iconId: string;
  readonly labelKey: string;
}[] = [
  { tab: 'inventory', iconId: 'icon.ui.bag', labelKey: 'nav.inventory' },
  { tab: 'upgrade', iconId: 'icon.ui.enhance', labelKey: 'nav.upgrade' },
  { tab: 'map', iconId: 'icon.ui.map', labelKey: 'nav.map' },
  { tab: 'shop', iconId: 'icon.ui.market', labelKey: 'nav.shop' },
  { tab: 'party', iconId: 'icon.ui.party', labelKey: 'nav.party' },
];

export interface BottomNavDeps {
  readonly iconGlyph: IconGlyphRenderer;
  readonly assets: ManifestReadySignal;
  readonly onSelect: (tab: NavTab) => void;
}

export interface BottomNav {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
  setActive(tab: NavTab): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountBottomNav(container: HTMLElement, deps: BottomNavDeps): BottomNav {
  const root = el('nav', 'bottombar-f10');
  root.hidden = true;

  const pills = new Map<NavTab, HTMLElement>();

  for (const { tab, iconId, labelKey } of TABS) {
    const link = el('a', 'nav-tab');
    link.href = '#';
    link.setAttribute('data-tab', tab);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      deps.onSelect(tab);
    });
    const pill = el('span', 'nav-tab-pill');
    const icon = el('span', 'nav-tab-icon');
    pill.append(icon);
    const label = el('span', 'nav-tab-label');
    label.textContent = getCopyText(labelKey);
    link.append(pill, label);
    root.append(link);
    pills.set(tab, pill);
    // V-F10-01: nav icons mount before `assets.load()` necessarily settles; V-F10-02: `currentColor`
    // (not a literal ink.900) so CSS alone can flip the active tab's glyph to `bg.paper` (below).
    setIconGlyphWhenReady(deps.assets, deps.iconGlyph, icon, iconId, {
      altText: '',
      colorCss: 'currentColor',
      onNightBackground: false,
      nightPlateColorCss: '',
    });
  }

  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    setActive(tab) {
      for (const [t, pill] of pills) {
        pill.classList.toggle('nav-tab-pill-active', t === tab);
      }
    },
  };
}
