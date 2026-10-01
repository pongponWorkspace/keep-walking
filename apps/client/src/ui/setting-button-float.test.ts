// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountSettingButtonFloat } from './setting-button-float';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

function fakeIconGlyph(): IconGlyphRenderer {
  return { setIconGlyph: vi.fn(async () => undefined) };
}

describe('mountSettingButtonFloat', () => {
  it('starts hidden; show/hide toggle it', () => {
    const container = document.createElement('div');
    const button = mountSettingButtonFloat(container, {
      iconGlyph: fakeIconGlyph(),
      onClick: vi.fn(),
    });
    expect(button.root.hidden).toBe(true);
    button.show();
    expect(button.root.hidden).toBe(false);
    button.hide();
    expect(button.root.hidden).toBe(true);
  });

  it('click calls onClick exactly once', () => {
    const container = document.createElement('div');
    const onClick = vi.fn();
    const button = mountSettingButtonFloat(container, { iconGlyph: fakeIconGlyph(), onClick });
    button.show();
    button.root.dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is not a second settings entry point: exactly one button mounts per container', () => {
    const container = document.createElement('div');
    mountSettingButtonFloat(container, { iconGlyph: fakeIconGlyph(), onClick: vi.fn() });
    expect(container.querySelectorAll('.setting-button-float')).toHaveLength(1);
  });
});
