/**
 * `.setting-button-float` — the floating 48x48 Setting button at the top-right corner (design/ux/
 * flows/F10-account-shell.md Flow E5, components.md 16.2, A-P2-F10-T06-4): replaces the old 40px
 * circular settings icon the pre-F10 headerbar used to carry in that corner — not a second button
 * alongside it (that icon's own spot in `.headerbar` is gone; this is the only settings entry point
 * on the shell screens now). Mounted once; `show`/`hide` is the only thing the caller
 * (`f04-app.ts`) ever calls per flow section 8's table — there is no other state to update.
 */
import { getCopyText } from '../copy/load';
import { setIconGlyphWhenReady } from '../assets/icon-glyph';
import type { IconGlyphRenderer, ManifestReadySignal } from '../assets/icon-glyph';

const TOKEN_INK_900 = '#1A1A22';

export interface SettingButtonFloatDeps {
  readonly iconGlyph: IconGlyphRenderer;
  readonly assets: ManifestReadySignal;
  readonly onClick: () => void;
}

export interface SettingButtonFloat {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountSettingButtonFloat(
  container: HTMLElement,
  deps: SettingButtonFloatDeps,
): SettingButtonFloat {
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'setting-button-float';
  root.hidden = true;
  root.setAttribute('aria-label', getCopyText('settings.title'));
  root.addEventListener('click', () => deps.onClick());

  const icon = document.createElement('span');
  icon.className = 'setting-button-float-icon';
  root.append(icon);
  // V-F10-01: this mounts before `assets.load()` necessarily settles.
  setIconGlyphWhenReady(deps.assets, deps.iconGlyph, icon, 'icon.ui.settings', {
    altText: '',
    colorCss: TOKEN_INK_900,
    onNightBackground: false,
    nightPlateColorCss: '',
  });

  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
