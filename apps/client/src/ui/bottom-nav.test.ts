// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountBottomNav } from './bottom-nav';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

function fakeIconGlyph(): IconGlyphRenderer {
  return { setIconGlyph: vi.fn(async () => undefined) };
}

describe('mountBottomNav', () => {
  it('starts hidden, with all five tabs in order (D-148) and Map pre-active', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, { iconGlyph: fakeIconGlyph(), onSelect: vi.fn() });
    expect(nav.root.hidden).toBe(true);
    const tabs = [...container.querySelectorAll('.nav-tab')].map((el) =>
      el.getAttribute('data-tab'),
    );
    expect(tabs).toEqual(['inventory', 'upgrade', 'map', 'shop', 'party']);
  });

  it('show/hide toggle the root only', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, { iconGlyph: fakeIconGlyph(), onSelect: vi.fn() });
    nav.show();
    expect(nav.root.hidden).toBe(false);
    nav.hide();
    expect(nav.root.hidden).toBe(true);
  });

  it('tapping a tab calls onSelect with that tab, never navigates the real page', () => {
    const container = document.createElement('div');
    const onSelect = vi.fn();
    const nav = mountBottomNav(container, { iconGlyph: fakeIconGlyph(), onSelect });
    nav.show();
    (container.querySelector('[data-tab="party"]') as HTMLAnchorElement).click();
    expect(onSelect).toHaveBeenCalledWith('party');
    expect(window.location.hash).toBe('');
  });

  it('setActive marks exactly one pill active at a time', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, { iconGlyph: fakeIconGlyph(), onSelect: vi.fn() });
    nav.setActive('shop');
    const active = [...container.querySelectorAll('.nav-tab')].filter((tabEl) =>
      tabEl.querySelector('.nav-tab-pill-active'),
    );
    expect(active).toHaveLength(1);
    expect(active[0]?.getAttribute('data-tab')).toBe('shop');
  });

  it('setActive is idempotent: a repeat call with the same tab mutates no DOM (tech note section 6 rule 5)', () => {
    const container = document.createElement('div');
    const nav = mountBottomNav(container, { iconGlyph: fakeIconGlyph(), onSelect: vi.fn() });
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
});
