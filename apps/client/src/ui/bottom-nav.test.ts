// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountBottomNav } from './bottom-nav';
import type { IconGlyphRenderer, ManifestReadySignal } from '../assets/icon-glyph';

function fakeIconGlyph(): IconGlyphRenderer {
  return { setIconGlyph: vi.fn(async () => undefined) };
}

/** Manifest already ready in most tests here — `onManifestReady` fires its callback immediately,
 * same as the real `AssetRuntimeController` does once `load()` has settled. */
function fakeAssets(): ManifestReadySignal {
  return { onManifestReady: (cb) => cb() };
}

describe('mountBottomNav', () => {
  it('starts hidden, with all five tabs in order (D-148) and Map pre-active', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
      onSelect: vi.fn(),
    });
    expect(nav.root.hidden).toBe(true);
    const tabs = [...container.querySelectorAll('.nav-tab')].map((el) =>
      el.getAttribute('data-tab'),
    );
    expect(tabs).toEqual(['inventory', 'upgrade', 'map', 'shop', 'party']);
  });

  it('show/hide toggle the root only', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
      onSelect: vi.fn(),
    });
    nav.show();
    expect(nav.root.hidden).toBe(false);
    nav.hide();
    expect(nav.root.hidden).toBe(true);
  });

  it('tapping a tab calls onSelect with that tab, never navigates the real page', () => {
    const container = document.createElement('div');
    const onSelect = vi.fn();
    const nav = mountBottomNav(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
      onSelect,
    });
    nav.show();
    (container.querySelector('[data-tab="party"]') as HTMLAnchorElement).click();
    expect(onSelect).toHaveBeenCalledWith('party');
    expect(window.location.hash).toBe('');
  });

  it('setActive marks exactly one pill active at a time', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
      onSelect: vi.fn(),
    });
    nav.setActive('shop');
    const active = [...container.querySelectorAll('.nav-tab')].filter((tabEl) =>
      tabEl.querySelector('.nav-tab-pill-active'),
    );
    expect(active).toHaveLength(1);
    expect(active[0]?.getAttribute('data-tab')).toBe('shop');
  });

  it('setActive is idempotent: a repeat call with the same tab mutates no DOM (tech note section 6 rule 5)', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, {
      iconGlyph: fakeIconGlyph(),
      assets: fakeAssets(),
      onSelect: vi.fn(),
    });
    nav.setActive('map');
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(container, { attributes: true, subtree: true, childList: true });
    nav.setActive('map');
    observer.disconnect();
    expect(mutations).toBe(0);
  });

  it('re-renders every tab glyph once the manifest becomes ready (V-F10-01)', () => {
    const iconGlyph = fakeIconGlyph();
    const readyCallbacks: (() => void)[] = [];
    const assets: ManifestReadySignal = {
      onManifestReady: (cb) => {
        readyCallbacks.push(cb);
      },
    };
    const container = document.createElement('div');
    mountBottomNav(container, { iconGlyph, assets, onSelect: vi.fn() });
    expect(iconGlyph.setIconGlyph).toHaveBeenCalledTimes(5); // the immediate mount-time call, x5 tabs
    expect(readyCallbacks).toHaveLength(5); // one onManifestReady registration per tab

    for (const cb of readyCallbacks) cb();

    expect(iconGlyph.setIconGlyph).toHaveBeenCalledTimes(10); // + one retry per tab once ready
  });

  it('sends currentColor, never a literal ink.900, so CSS alone controls the active tab (V-F10-02)', () => {
    const iconGlyph = fakeIconGlyph();
    const container = document.createElement('div');
    mountBottomNav(container, { iconGlyph, assets: fakeAssets(), onSelect: vi.fn() });
    const calls = (iconGlyph.setIconGlyph as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call[2]).toMatchObject({ colorCss: 'currentColor' });
    }
  });
});
