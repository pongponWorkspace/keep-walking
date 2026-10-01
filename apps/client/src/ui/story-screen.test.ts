// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountStoryScreen } from './story-screen';
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

function makeScreen() {
  const container = document.createElement('div');
  const onNext = vi.fn();
  const onSkip = vi.fn();
  const onStart = vi.fn();
  const screen = mountStoryScreen(container, { assets: fakeAssets(), onNext, onSkip, onStart });
  return { container, screen, onNext, onSkip, onStart };
}

describe('mountStoryScreen', () => {
  it('starts hidden', () => {
    const { screen } = makeScreen();
    expect(screen.root.hidden).toBe(true);
  });

  it('shows slide 1 with its own title/body and the "next" label, skip link visible', () => {
    const { container, screen } = makeScreen();
    screen.show(1);
    expect(screen.root.hidden).toBe(false);
    expect(container.querySelector('.story-title')?.textContent).toBe(
      getCopyText('story.slide1.title'),
    );
    expect(container.querySelector('.story-body')?.textContent).toBe(
      getCopyText('story.slide1.body'),
    );
    expect(container.querySelector('.story-next-button')?.textContent).toBe(
      getCopyText('story.next'),
    );
    expect(container.querySelector<HTMLElement>('.story-skip-link')?.hidden).toBe(false);
  });

  it('slide 4 uses the system-narration body key, never the speaker-line one', () => {
    const { container, screen } = makeScreen();
    screen.show(4);
    expect(container.querySelector('.story-body')?.textContent).toBe(
      getCopyText('story.slide4.bodySystem'),
    );
  });

  it('slide 5 shows the story.start label and hides the skip link', () => {
    const { container, screen } = makeScreen();
    screen.show(5);
    expect(container.querySelector('.story-next-button')?.textContent).toBe(
      getCopyText('story.start'),
    );
    expect(container.querySelector<HTMLElement>('.story-skip-link')?.hidden).toBe(true);
  });

  it('marks exactly one dot active, matching the current slide', () => {
    const { container, screen } = makeScreen();
    screen.show(3);
    const dots = container.querySelectorAll('.story-dot');
    expect(dots.length).toBe(5);
    dots.forEach((dot, i) => {
      expect(dot.classList.contains('story-dot-active')).toBe(i === 2);
    });
  });

  it('"next" on slides 1-4 calls onNext with the current slide, never onStart', () => {
    const { container, screen, onNext, onStart } = makeScreen();
    screen.show(2);
    container.querySelector<HTMLButtonElement>('.story-next-button')?.click();
    expect(onNext).toHaveBeenCalledWith(2);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('the same button on slide 5 calls onStart, never onNext', () => {
    const { container, screen, onNext, onStart } = makeScreen();
    screen.show(5);
    container.querySelector<HTMLButtonElement>('.story-next-button')?.click();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('"skip" calls onSkip with the current slide', () => {
    const { container, screen, onSkip } = makeScreen();
    screen.show(3);
    container.querySelector<HTMLButtonElement>('.story-skip-link')?.click();
    expect(onSkip).toHaveBeenCalledWith(3);
  });

  it('idempotent: show() again with the same slide makes no further DOM mutation', () => {
    const { container, screen } = makeScreen();
    screen.show(2);
    const observer = new MutationObserver(() => {});
    const observed: MutationRecord[] = [];
    const realObserver = new MutationObserver((records) => observed.push(...records));
    realObserver.observe(container, { subtree: true, attributes: true, childList: true });
    screen.show(2);
    realObserver.disconnect();
    observer.disconnect();
    expect(observed.length).toBe(0);
  });

  it('hide() then show() with the same slide updates the DOM again (a real re-entry, not a no-op)', () => {
    const { container, screen } = makeScreen();
    screen.show(2);
    screen.hide();
    expect(screen.root.hidden).toBe(true);
    screen.show(2);
    expect(screen.root.hidden).toBe(false);
    expect(container.querySelector('.story-title')?.textContent).toBe(
      getCopyText('story.slide2.title'),
    );
  });
});
