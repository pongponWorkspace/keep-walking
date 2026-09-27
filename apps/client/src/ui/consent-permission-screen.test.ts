// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountConsentPermissionScreen } from './consent-permission-screen';
import { getCopyText } from '../copy/load';

describe('mountConsentPermissionScreen (S-00-permission-browser, flow F06 A4/18.1)', () => {
  it('starts hidden, shows the priming copy and one continue button', () => {
    const container = document.createElement('div');
    const screen = mountConsentPermissionScreen(container, { onContinue: vi.fn() });
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('consent.browserPrimingTitle'));
    expect(screen.root.textContent).toContain(getCopyText('consent.browserPrimingBody'));
    const continueButton = screen.root.querySelector('.consent-permission-continue');
    expect(continueButton?.textContent).toBe(getCopyText('consent.browserPrimingContinue'));
  });

  it('continue calls onContinue exactly once, never starts anything itself', () => {
    const container = document.createElement('div');
    const onContinue = vi.fn();
    const screen = mountConsentPermissionScreen(container, { onContinue });
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.consent-permission-continue')?.click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('hide() hides the screen', () => {
    const container = document.createElement('div');
    const screen = mountConsentPermissionScreen(container, { onContinue: vi.fn() });
    screen.show();
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });
});
