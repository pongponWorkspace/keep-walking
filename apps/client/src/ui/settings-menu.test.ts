// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountSettingsMenu } from './settings-menu';
import { getCopyText } from '../copy/load';

function mount(canClear = true, hasActiveRun = false) {
  const container = document.createElement('div');
  const deps = {
    selectCanClearLocalData: () => canClear,
    onOpenWalkingSafety: vi.fn(),
    onOpenCredits: vi.fn(),
    onOpenPrivacy: vi.fn(),
    onExport: vi.fn(),
    onClearLocalDataConfirmed: vi.fn(),
    hasActiveRun: () => hasActiveRun,
    onLogoutConfirmed: vi.fn(),
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
    expect(screen.root.textContent).toContain(getCopyText('settings.exportLink'));
  });

  it('export row: same secondary button style as the other rows, no run/consent gate', () => {
    const { screen } = mount();
    screen.show();
    const row = screen.root.querySelector<HTMLButtonElement>('.settings-menu-export');
    expect(row).not.toBeNull();
    expect(row?.disabled).toBe(false);
    expect(row?.className.split(' ')).toEqual(
      expect.arrayContaining(['btn', 'btn-secondary', 'settings-menu-row']),
    );
  });

  it('export row calls onExport exactly once per click, straight through with no confirm popup', () => {
    const { screen, deps } = mount();
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-export')?.click();
    expect(deps.onExport).toHaveBeenCalledTimes(1);
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
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
      onExport: vi.fn(),
      onClearLocalDataConfirmed: vi.fn(),
      hasActiveRun: () => false,
      onLogoutConfirmed: vi.fn(),
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

  it('shows the logout row last, as plain text (never state.danger/.btn-danger-confirm, F10-R40)', () => {
    const { screen } = mount();
    screen.show();
    expect(screen.root.textContent).toContain(getCopyText('settings.logoutLink'));
    const row = screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout');
    expect(row).not.toBeNull();
    expect(row?.className.split(' ')).not.toContain('btn-danger-confirm');
    expect(row?.disabled).toBe(false);
  });

  it('logout row opens its own confirm popup, no run note when no run is active', () => {
    const { screen } = mount(true, false);
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout')?.click();
    const overlay = screen.root.querySelector<HTMLElement>(
      '.settings-menu-logout-confirm-run-note',
    )?.parentElement;
    expect(overlay?.hidden).toBe(false);
    expect(
      screen.root.querySelector<HTMLElement>('.settings-menu-logout-confirm-run-note')?.hidden,
    ).toBe(true);
  });

  it('the logout confirm button is disabled while its own popup is not open (qa/tests/e2e/f04-closed-dungeon.spec.ts own broad "no enabled .popup .btn-primary" safety scan)', () => {
    const { screen } = mount();
    screen.show();
    const confirmButton = screen.root.querySelector<HTMLButtonElement>(
      '.settings-menu-logout-confirm-button',
    );
    expect(confirmButton?.disabled).toBe(true);
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout')?.click();
    expect(confirmButton?.disabled).toBe(false);
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout-cancel')?.click();
    expect(confirmButton?.disabled).toBe(true);
  });

  it('logout confirm shows the run note when a run is active (read fresh at click time)', () => {
    const { screen } = mount(true, true);
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout')?.click();
    expect(
      screen.root.querySelector<HTMLElement>('.settings-menu-logout-confirm-run-note')?.hidden,
    ).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('settings.logoutConfirmRunNote'));
  });

  it('confirming logout calls onLogoutConfirmed exactly once and closes the popup; its button is .btn-primary, never .btn-danger-confirm', () => {
    const { screen, deps } = mount();
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout')?.click();
    const confirmButton = screen.root.querySelector<HTMLButtonElement>(
      '.settings-menu-logout-confirm-button',
    );
    expect(confirmButton?.className.split(' ')).toEqual(expect.arrayContaining(['btn-primary']));
    expect(confirmButton?.className.split(' ')).not.toContain('btn-danger-confirm');
    confirmButton?.click();
    expect(deps.onLogoutConfirmed).toHaveBeenCalledTimes(1);
  });

  it('cancelling the logout popup does not call onLogoutConfirmed', () => {
    const { screen, deps } = mount();
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout')?.click();
    screen.root.querySelector<HTMLButtonElement>('.settings-menu-logout-cancel')?.click();
    expect(deps.onLogoutConfirmed).not.toHaveBeenCalled();
  });
});
