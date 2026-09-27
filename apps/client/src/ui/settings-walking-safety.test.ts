// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountSettingsWalkingSafety, pocketScreenPrefEnabled } from './settings-walking-safety';
import { createMemoryStorage } from '../storage/local-store';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';

function makeScreen(onSetAutoRetreat = vi.fn(), onClose = vi.fn()) {
  const container = document.createElement('div');
  const storage = createMemoryStorage();
  const screen = mountSettingsWalkingSafety(container, {
    storage,
    autoRetreatThresholdPct: 25,
    onSetAutoRetreat,
    onClose,
  });
  return { container, storage, screen, onSetAutoRetreat, onClose };
}

describe('mountSettingsWalkingSafety', () => {
  it('renders the hint with the config percent, never a hardcoded number', () => {
    const { container } = makeScreen();
    expect(container.querySelector('.settings-row-hint')?.textContent).toBe(
      formatCopyText('settings.autoRetreatToggleHint', { autoRetreatPct: 25 }),
    );
  });

  it('turning auto-retreat OFF requires the confirm popup; only "confirm" dispatches setAutoRetreat(false)', () => {
    const { container, screen, onSetAutoRetreat } = makeScreen();
    screen.setAutoRetreatEnabled(true);
    const toggle = container.querySelector('.settings-autoretreat-toggle') as HTMLButtonElement;
    toggle.click();
    expect(onSetAutoRetreat).not.toHaveBeenCalled();
    const overlay = container.querySelector('.popup-overlay') as HTMLElement;
    expect(overlay.hidden).toBe(false);
    (container.querySelector('.btn-danger-confirm') as HTMLButtonElement).click();
    expect(onSetAutoRetreat).toHaveBeenCalledWith(false);
    expect(overlay.hidden).toBe(true);
  });

  it('cancelling the off-confirm popup never dispatches anything', () => {
    const { container, screen, onSetAutoRetreat } = makeScreen();
    screen.setAutoRetreatEnabled(true);
    (container.querySelector('.settings-autoretreat-toggle') as HTMLButtonElement).click();
    (container.querySelector('.popup .btn-secondary') as HTMLButtonElement).click();
    expect(onSetAutoRetreat).not.toHaveBeenCalled();
    expect((container.querySelector('.popup-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('turning auto-retreat back ON needs no confirmation', () => {
    const { container, screen, onSetAutoRetreat } = makeScreen();
    screen.setAutoRetreatEnabled(false);
    (container.querySelector('.settings-autoretreat-toggle') as HTMLButtonElement).click();
    expect(onSetAutoRetreat).toHaveBeenCalledWith(true);
    expect((container.querySelector('.popup-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('the pocket-screen toggle is a client-only preference, on by default, persisted in storage', () => {
    const { container, storage } = makeScreen();
    expect(pocketScreenPrefEnabled(storage)).toBe(true);
    (container.querySelector('.settings-pocket-screen-toggle') as HTMLButtonElement).click();
    expect(pocketScreenPrefEnabled(storage)).toBe(false);
    (container.querySelector('.settings-pocket-screen-toggle') as HTMLButtonElement).click();
    expect(pocketScreenPrefEnabled(storage)).toBe(true);
  });

  it('has exactly two settings rows in Phase 2 (no auto-potion threshold/toggle row, F06-R22)', () => {
    const { container } = makeScreen();
    expect(container.querySelectorAll('.settings-row').length).toBe(2);
    // Reserved-for-Phase-4 copy keys (`settings.autoPotionLabel`/`autoPotionThreshold`, F06-R22)
    // must not appear anywhere on this screen — checked against the real copy text, never a
    // hardcoded Thai literal in this test file.
    expect(container.textContent).not.toContain(getCopyText('settings.autoPotionLabel'));
    const thresholdPrefix = getCopyText('settings.autoPotionThreshold').split('{')[0]?.trim();
    expect(thresholdPrefix).not.toBe('');
    if (thresholdPrefix !== undefined) {
      expect(container.textContent).not.toContain(thresholdPrefix);
    }
  });
});
