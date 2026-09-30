// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountSpeedLockOverlay } from './speed-lock-overlay';

function deps(overrides: Partial<Parameters<typeof mountSpeedLockOverlay>[1]> = {}) {
  return {
    onSettings: () => undefined,
    onExit: () => undefined,
    vibrate: () => undefined,
    vibrateOnEnterPattern_ms: 100,
    iconGlyph: { setIconGlyph: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

describe('mountSpeedLockOverlay — 13.4 / R21/R23 (never a primary/close button)', () => {
  it('never renders a .btn-primary button', () => {
    const container = document.createElement('div');
    const overlay = mountSpeedLockOverlay(container, deps());
    overlay.show(true);
    expect(overlay.root.querySelector('.btn-primary')).toBeNull();
  });

  it('shows only a settings button before any run exists', () => {
    const container = document.createElement('div');
    const overlay = mountSpeedLockOverlay(container, deps());
    overlay.show(false);
    expect(overlay.root.querySelectorAll('button').length).toBe(1);
  });

  it('shows settings + exit during a run', () => {
    const container = document.createElement('div');
    const overlay = mountSpeedLockOverlay(container, deps());
    overlay.show(true);
    expect(overlay.root.querySelectorAll('button').length).toBe(2);
  });

  it('vibrates once on entering lock, not again while already shown', () => {
    let count = 0;
    const container = document.createElement('div');
    const overlay = mountSpeedLockOverlay(container, deps({ vibrate: () => (count += 1) }));
    overlay.show(true);
    overlay.show(true);
    expect(count).toBe(1);
  });

  // V-41 (art gate F04-F06-visual-gate.md §8, components.md 13.4): a 48px icon.ui.speed-lock above
  // the title, decorative (paired with the title/body text already on screen, S4).
  it('renders icon.ui.speed-lock as ink.900, decorative alt text', () => {
    const container = document.createElement('div');
    const setIconGlyph = vi.fn().mockResolvedValue(undefined);
    const overlay = mountSpeedLockOverlay(container, deps({ iconGlyph: { setIconGlyph } }));
    overlay.show(true);
    expect(overlay.root.querySelector('.speedlock-icon')).not.toBeNull();
    expect(setIconGlyph).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'icon.ui.speed-lock',
      expect.objectContaining({ colorCss: '#1A1A22' }),
    );
  });
});
