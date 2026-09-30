/**
 * `S-00-intro` (GDD "10 นาทีแรกของคนใหม่" minute 0, flow F03-core-loop.md): the very first screen.
 * Human decision 2026-10-01 (D-144): it shows only one "เริ่มเกม" button (`onboarding.introStart`)
 * instead of the opening line + tap-anywhere hint, which read as odd on a real phone. Sits on top
 * of the map (already visible behind `#hud`, D-129's own `#hud` layout rule) as a full-screen
 * `.screen` takeover, so the map needs no separate "reveal" step once this closes.
 */
import { getCopyText } from '../copy/load';

export interface IntroScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountIntroScreen(container: HTMLElement, onContinue: () => void): IntroScreen {
  const root = document.createElement('div');
  root.className = 'screen intro-screen';
  root.hidden = true;

  const startButton = document.createElement('button');
  startButton.className = 'btn btn-primary intro-start';
  startButton.textContent = getCopyText('onboarding.introStart');
  startButton.addEventListener('click', () => onContinue());

  root.append(startButton);
  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
