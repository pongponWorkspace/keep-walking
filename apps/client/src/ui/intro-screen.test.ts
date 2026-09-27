// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountIntroScreen } from './intro-screen';
import { getCopyText } from '../copy/load';

describe('mountIntroScreen', () => {
  it('starts hidden, shows the intro copy, and calls onContinue on any tap', () => {
    const container = document.createElement('div');
    const onContinue = vi.fn();
    const screen = mountIntroScreen(container, onContinue);
    expect(screen.root.hidden).toBe(true);
    expect(screen.root.textContent).toContain(getCopyText('onboarding.intro'));
    expect(screen.root.textContent).toContain(getCopyText('onboarding.introTap'));

    screen.show();
    expect(screen.root.hidden).toBe(false);
    screen.root.click();
    expect(onContinue).toHaveBeenCalledTimes(1);

    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('has no skip button of any kind (R36: no skip)', () => {
    const container = document.createElement('div');
    const screen = mountIntroScreen(container, () => undefined);
    expect(screen.root.querySelector('button')).toBeNull();
  });
});
