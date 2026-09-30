// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountIntroScreen } from './intro-screen';
import { getCopyText } from '../copy/load';

describe('mountIntroScreen', () => {
  it('starts hidden, shows only the start button, and calls onContinue when it is pressed', () => {
    const container = document.createElement('div');
    const onContinue = vi.fn();
    const screen = mountIntroScreen(container, onContinue);
    expect(screen.root.hidden).toBe(true);
    const buttons = screen.root.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe(getCopyText('onboarding.introStart'));
    expect(screen.root.textContent).toBe(getCopyText('onboarding.introStart'));

    screen.show();
    expect(screen.root.hidden).toBe(false);
    buttons[0]?.click();
    expect(onContinue).toHaveBeenCalledTimes(1);

    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('a tap outside the button does not continue (D-144: the button is the only way on)', () => {
    const container = document.createElement('div');
    const onContinue = vi.fn();
    const screen = mountIntroScreen(container, onContinue);
    screen.show();
    screen.root.click();
    expect(onContinue).not.toHaveBeenCalled();
  });
});
