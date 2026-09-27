// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountConsentLocationScreen } from './consent-location-screen';
import { getCopyText } from '../copy/load';
import { positionLogTtlText } from '../copy/position-log-ttl';

describe('mountConsentLocationScreen', () => {
  it('starts hidden, shows the consent copy and two equally-weighted buttons', () => {
    const container = document.createElement('div');
    const screen = mountConsentLocationScreen(container, {
      onAccept: vi.fn(),
      onDecline: vi.fn(),
    });
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('consent.locationTitle'));
    // {ttlText} is filled in, never shown as a raw placeholder.
    expect(screen.root.textContent).toContain(positionLogTtlText());
    expect(screen.root.textContent).not.toContain('{ttlText}');
    const accept = screen.root.querySelector('.consent-location-accept');
    const decline = screen.root.querySelector('.consent-location-decline');
    expect(accept?.className).not.toContain('btn-primary');
    expect(decline?.className).not.toContain('btn-primary');
  });

  it('accept/decline call their own callback exactly once', () => {
    const container = document.createElement('div');
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const screen = mountConsentLocationScreen(container, { onAccept, onDecline });
    screen.show();
    screen.root.querySelector<HTMLButtonElement>('.consent-location-accept')?.click();
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    screen.root.querySelector<HTMLButtonElement>('.consent-location-decline')?.click();
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hide() hides the screen', () => {
    const container = document.createElement('div');
    const screen = mountConsentLocationScreen(container, { onAccept: vi.fn(), onDecline: vi.fn() });
    screen.show();
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });
});
