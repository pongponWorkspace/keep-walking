/**
 * `S-00-intro` (GDD "10 นาทีแรกของคนใหม่" minute 0, flow F03-core-loop.md, copy.th.json
 * `onboarding.intro`/`onboarding.introTap`): the single opening line, tap-anywhere to continue, no
 * skip button (R36). Sits on top of the map (already visible behind `#hud`, D-129's own `#hud`
 * layout rule) as a full-screen `.screen` takeover — the map itself needs no separate "reveal"
 * step, it is already rendering underneath by the time this closes.
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

  const message = document.createElement('div');
  message.className = 'intro-message';
  message.textContent = getCopyText('onboarding.intro');

  const tapHint = document.createElement('div');
  tapHint.className = 'intro-tap-hint';
  tapHint.textContent = getCopyText('onboarding.introTap');

  root.append(message, tapHint);
  root.addEventListener('click', () => onContinue());
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
