// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountSettingsMenu } from './settings-menu';
import { getCopyText } from '../copy/load';

function mount(canClear = true) {
  const container = document.createElement('div');
  const deps = {
    selectCanClearLocalData: () => canClear,
    onOpenWalkingSafety: vi.fn(),
    onOpenCredits: vi.fn(),
    onOpenPrivacy: vi.fn(),
    onClearLocalDataConfirmed: vi.fn(),
    onClose: vi.fn(),
  };
  const screen = mountSettingsMenu(container, deps);
  return { container, screen, deps };
}

describe('mountSettingsMenu', () => {
  it('starts hidden, shows the four in-scope rows', () => {
    const { screen } = mount();
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('settings.walkingSafetyLink'));
    expect(screen.root.textContent).toContain(getCopyText('settings.creditsLink'));
    expect(screen.root.textContent).toContain(getCopyText('settings.clearLocalDataLink'));
    expect(screen.root.textContent).toContain(getCopyText('settings.privacyLink'));
  });

  it('never links to a screen this task does not build (report/block, help, account delete)', () => {
    const { screen } = mount();
    screen.show();
    expect(screen.root.textContent).not.toContain(getCopyText('settings.reportBlockLink'));
    expect(screen.root.textContent).not.toContain(getCopyText('settings.helpLink'));
    expect(screen.root.textContent).not.toContain(getCopyText('settings.accountDeleteLink'));
  });

  it('rows call their own open callback', () => {
    const { screen, deps } = mount();
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-walking-safety')?.click();
    expect(deps.onOpenWalkingSafety).toHaveBeenCalledTimes(1);
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-credits')?.click();
    expect(deps.onOpenCredits).toHaveBeenCalledTimes(1);
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-privacy')?.click();
    expect(deps.onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  it('clear local data: available — row enabled, no blocked note, confirm popup then callback', () => {
    const { screen, deps } = mount(true);
    screen.show();
    const row = screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data');
    expect(row?.disabled).toBe(false);
    expect(
      screen.root.querySelector<HTMLElement>('.settings-menu-clear-local-data-blocked-note')
        ?.hidden,
    ).toBe(true);
    row?.click();
    const overlay = screen.root.querySelector<HTMLElement>('.popup-overlay');
    expect(overlay?.hidden).toBe(false);
    screen.root.querySelector<HTMLButtonElement>('.btn-danger-confirm')?.click();
    expect(deps.onClearLocalDataConfirmed).toHaveBeenCalledTimes(1);
    expect(overlay?.hidden).toBe(true);
  });

  it('clear local data: blocked (a run is active) — row disabled, blocked note shown, click is a no-op', () => {
    const { screen, deps } = mount(false);
    screen.show();
    const row = screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data');
    expect(row?.disabled).toBe(true);
    expect(
      screen.root.querySelector<HTMLElement>('.settings-menu-clear-local-data-blocked-note')
        ?.hidden,
    ).toBe(false);
    row?.click();
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
    expect(deps.onClearLocalDataConfirmed).not.toHaveBeenCalled();
  });

  it('cancel closes the confirm popup without confirming', () => {
    const { screen, deps } = mount(true);
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data')?.click();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data-cancel')?.click();
    expect(deps.onClearLocalDataConfirmed).not.toHaveBeenCalled();
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
  });

  it('re-checks availability on every show() (a run may have started since the last open)', () => {
    let canClear = true;
    const container = document.createElement('div');
    const screen = mountSettingsMenu(container, {
      selectCanClearLocalData: () => canClear,
      onOpenWalkingSafety: vi.fn(),
      onOpenCredits: vi.fn(),
      onOpenPrivacy: vi.fn(),
      onClearLocalDataConfirmed: vi.fn(),
      onClose: vi.fn(),
    });
    screen.show();
    expect(
      screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data')?.disabled,
    ).toBe(false);
    canClear = false;
    screen.show();
    expect(
      screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data')?.disabled,
    ).toBe(true);
  });

  it('close button calls onClose; hide() also closes any open confirm popup', () => {
    const { screen, deps } = mount();
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-close')?.click();
    expect(deps.onClose).toHaveBeenCalledTimes(1);
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-clear-local-data')?.click();
    screen.hide();
    expect(screen.root.hidden).toBe(true);
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
  });
});
