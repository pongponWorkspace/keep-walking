/**
 * `S-00-intro` (GDD "10 นาทีแรกของคนใหม่" minute 0, flow F03-core-loop.md): the very first screen.
 * Human decision 2026-10-01 (D-144): it shows only one "เริ่มเกม" button (`onboarding.introStart`)
 * instead of the opening line + tap-anywhere hint, which read as odd on a real phone. Sits on top
 * of the map (already visible behind `#hud`, D-129's own `#hud` layout rule) as a full-screen
 * `.screen` takeover, so the map needs no separate "reveal" step once this closes.
 *
 * V-F10-03 (art/reviews/F10-visual-gate.md): a bare button alone read as a broken/empty screen on a
 * real phone (SH1 "จุดเด่นทุกจอ" failed) — this now also shows `illus.story.slide-3` (the same art
 * asset the story screen's own slide 3 uses, re-used rather than a new asset) above the button, in
 * the shared `.story-image` ink-frame (V-F10-04's own CSS rule: border + reserved 4:3 box, so a slow
 * manifest load never shows an empty gap, only an empty framed box). The button is built and wired
 * *before* the image's own `setIconImg` call below, and never reads anything about whether the image
 * has loaded — it stays tappable immediately, same as every other screen in this file's onboarding
 * sequence that never blocks input on an asset fetch.
 */
import { getCopyText } from '../copy/load';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntimeController } from '../assets/runtime';

/** Re-uses the story screen's own slide-3 illustration (V-F10-03's own suggested fix) rather than
 * asking art for a new, dedicated intro asset this task has no budget to commission. */
const INTRO_IMAGE_ICON_ID = 'illus.story.slide-3';

export interface IntroScreenDeps {
  readonly assets: AssetRuntimeController;
  readonly onContinue: () => void;
}

export interface IntroScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountIntroScreen(container: HTMLElement, deps: IntroScreenDeps): IntroScreen {
  const root = document.createElement('div');
  root.className = 'screen intro-screen';
  root.hidden = true;

  // `.story-image`'s own CSS (app.css, V-F10-04) already reserves the 4:3 ink-framed box before any
  // image loads — `.intro-image` only adds this screen's own max-height cap (V-F10-03: "เห็นครบที่
  // 360 × 640 โดยไม่เลื่อน").
  const image = document.createElement('img');
  image.className = 'story-image intro-image';
  image.alt = '';
  setIconImg(image, deps.assets, INTRO_IMAGE_ICON_ID, '');
  // V-F10-01's own pattern: this mounts before `assets.load()` necessarily settles.
  deps.assets.onManifestReady(() => {
    setIconImg(image, deps.assets, INTRO_IMAGE_ICON_ID, '');
  });

  const startButton = document.createElement('button');
  startButton.className = 'btn btn-primary intro-start';
  startButton.textContent = getCopyText('onboarding.introStart');
  startButton.addEventListener('click', () => deps.onContinue());

  root.append(image, startButton);
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
