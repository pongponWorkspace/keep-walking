// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountPrivacyScreen } from './privacy-screen';
import { getCopyText } from '../copy/load';

function mount(hasActiveRun = false) {
  const container = document.createElement('div');
  const deps = {
    hasActiveRun: () => hasActiveRun,
    onRequestReconsent: vi.fn(),
    onWithdrawConfirmed: vi.fn(),
    onClearLocalDataShortcut: vi.fn(),
    onClose: vi.fn(),
  };
  const screen = mountPrivacyScreen(container, deps);
  return { container, screen, deps };
}

describe('mountPrivacyScreen', () => {
  it('granted: shows the granted status, a withdraw button, no reconsent button', () => {
    const { screen } = mount();
    screen.render('granted');
    screen.show();
    expect(screen.root.textContent).toContain(getCopyText('privacy.locationStatusGranted'));
    expect(screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.hidden).toBe(
      false,
    );
    expect(screen.root.querySelector<HTMLButtonElement>('.privacy-reconsent-button')?.hidden).toBe(
      true,
    );
  });

  it('declined/withdrawn/unanswered: shows not-granted status and the reconsent button, no withdraw button', () => {
    for (const value of ['declined', 'withdrawn', 'unanswered'] as const) {
      const { screen } = mount();
      screen.render(value);
      expect(screen.root.textContent).toContain(getCopyText('privacy.locationStatusNotGranted'));
      expect(
        screen.root.querySelector<HTMLButtonElement>('.privacy-reconsent-button')?.hidden,
      ).toBe(false);
      expect(screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.hidden).toBe(
        true,
      );
    }
  });

  it('reconsent button calls onRequestReconsent', () => {
    const { screen, deps } = mount();
    screen.render('declined');
    screen.root.querySelector<HTMLButtonElement>('.privacy-reconsent-button')?.click();
    expect(deps.onRequestReconsent).toHaveBeenCalledTimes(1);
  });

  it('withdraw: no active run — confirm popup has no during-run note, confirming calls onWithdrawConfirmed', () => {
    const { screen, deps } = mount(false);
    screen.render('granted');
    screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.click();
    const overlay = screen.root.querySelector<HTMLElement>('.popup-overlay');
    expect(overlay?.hidden).toBe(false);
    expect(
      screen.root.querySelector<HTMLElement>('.privacy-withdraw-during-run-note')?.hidden,
    ).toBe(true);
    screen.root.querySelector<HTMLButtonElement>('.btn-danger-confirm')?.click();
    expect(deps.onWithdrawConfirmed).toHaveBeenCalledTimes(1);
    expect(overlay?.hidden).toBe(true);
  });

  it('withdraw: active run — the confirm popup shows privacy.withdrawDuringRunNote', () => {
    const { screen } = mount(true);
    screen.render('granted');
    screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.click();
    expect(
      screen.root.querySelector<HTMLElement>('.privacy-withdraw-during-run-note')?.hidden,
    ).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('privacy.withdrawDuringRunNote'));
  });

  it('cancel closes the popup without calling onWithdrawConfirmed', () => {
    const { screen, deps } = mount();
    screen.render('granted');
    screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.click();
    screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-cancel')?.click();
    expect(deps.onWithdrawConfirmed).not.toHaveBeenCalled();
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
  });

  it('clear-local-data shortcut and close both call their own callback', () => {
    const { screen, deps } = mount();
    screen.render('granted');
    screen.root.querySelector<HTMLButtonElement>('.privacy-clear-local-data-shortcut')?.click();
    expect(deps.onClearLocalDataShortcut).toHaveBeenCalledTimes(1);
    screen.root.querySelector<HTMLButtonElement>('.privacy-close-button')?.click();
    expect(deps.onClose).toHaveBeenCalledTimes(1);
  });

  it('hide() also closes any open confirm popup', () => {
    const { screen } = mount();
    screen.render('granted');
    screen.root.querySelector<HTMLButtonElement>('.privacy-withdraw-button')?.click();
    screen.hide();
    expect(screen.root.hidden).toBe(true);
    expect(screen.root.querySelector<HTMLElement>('.popup-overlay')?.hidden).toBe(true);
  });
});
