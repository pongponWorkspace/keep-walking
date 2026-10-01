// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountIntroScreen } from './intro-screen';
import type { AssetRuntimeController } from '../assets/runtime';
import type { RuntimeManifest } from '../assets/manifest';
import { getCopyText } from '../copy/load';

function fakeAssets(): AssetRuntimeController {
  return {
    getManifest: (): RuntimeManifest | undefined => undefined,
    basePath: '/assets/',
    scale: 1,
    isProduction: false,
    load: () => Promise.resolve(),
    getAvatarPart: () => undefined,
    loadAvatarPart: () => Promise.resolve(),
    onManifestReady: () => {},
  };
}

describe('mountIntroScreen', () => {
  it('starts hidden, shows the story-slide-3 image above the one start button, and calls onContinue when it is pressed', () => {
    const container = document.createElement('div');
    const onContinue = vi.fn();
    const screen = mountIntroScreen(container, { assets: fakeAssets(), onContinue });
    expect(screen.root.hidden).toBe(true);
    // V-F10-03: exactly one button on this screen (D-144) — the image above it is an `<img>`, never
    // a second pressable element.
    const buttons = screen.root.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe(getCopyText('onboarding.introStart'));
    expect(screen.root.textContent).toBe(getCopyText('onboarding.introStart'));
    // V-F10-04: reserves its box via the shared `.story-image` ink-frame, not a one-off class.
    const image = screen.root.querySelector('img.story-image');
    expect(image).not.toBeNull();

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
    const screen = mountIntroScreen(container, { assets: fakeAssets(), onContinue });
    screen.show();
    screen.root.click();
    expect(onContinue).not.toHaveBeenCalled();
  });
});
