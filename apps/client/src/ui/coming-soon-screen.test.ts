// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountComingSoonScreen } from './coming-soon-screen';
import type { IconGlyphRenderer, ManifestReadySignal } from '../assets/icon-glyph';
import { getCopyText } from '../copy/load';

function fakeIconGlyph(): IconGlyphRenderer {
  return { setIconGlyph: vi.fn(async () => undefined) };
}

function fakeAssets(): ManifestReadySignal {
  return { onManifestReady: (cb) => cb() };
}

describe('mountComingSoonScreen', () => {
  it("starts hidden; show(tab) reveals it with that tab's title/body", () => {
    const container = document.createElement('div');
    const screen = mountComingSoonScreen(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
    });
    expect(screen.root.hidden).toBe(true);
    screen.show('shop');
    expect(screen.root.hidden).toBe(false);
    expect(container.querySelector('.cs-title')?.textContent).toBe(
      getCopyText('comingSoon.shopTitle'),
    );
    expect(container.querySelector('.cs-body')?.textContent).toBe(
      getCopyText('comingSoon.shopBody'),
    );
  });

  it('switching tabs updates the title/body text', () => {
    const container = document.createElement('div');
    const screen = mountComingSoonScreen(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
    });
    screen.show('upgrade');
    expect(container.querySelector('.cs-title')?.textContent).toBe(
      getCopyText('comingSoon.upgradeTitle'),
    );
    screen.show('party');
    expect(container.querySelector('.cs-title')?.textContent).toBe(
      getCopyText('comingSoon.partyTitle'),
    );
  });

  it('has no button anywhere on the screen (F10-R35)', () => {
    const container = document.createElement('div');
    const screen = mountComingSoonScreen(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
    });
    screen.show('party');
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('is idempotent: re-showing the same already-shown tab mutates no DOM (tech note section 6 rule 5)', () => {
    const container = document.createElement('div');
    const screen = mountComingSoonScreen(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
    });
    screen.show('upgrade');
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(container, { attributes: true, subtree: true, childList: true });
    screen.show('upgrade');
    observer.disconnect();
    expect(mutations).toBe(0);
  });

  it('hide sets root.hidden back to true', () => {
    const container = document.createElement('div');
    const screen = mountComingSoonScreen(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
    });
    screen.show('shop');
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('re-renders the badge glyph once the manifest becomes ready (V-F10-01)', () => {
    const iconGlyph = fakeIconGlyph();
    let readyCallback: (() => void) | undefined;
    const assets: ManifestReadySignal = {
      onManifestReady: (cb) => {
        readyCallback = cb;
      },
    };
    const container = document.createElement('div');
    mountComingSoonScreen(container, { iconGlyph, assets });
    expect(iconGlyph.setIconGlyph).toHaveBeenCalledTimes(1); // the badge icon's immediate call

    readyCallback?.();

    expect(iconGlyph.setIconGlyph).toHaveBeenCalledTimes(2);
  });
});
