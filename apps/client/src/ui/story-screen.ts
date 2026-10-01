/**
 * `S-00-story-<n>` (design/ux/flows/F10-account-shell.md Flow D, design/features/
 * F10-account-shell.md R25-R30, components.md 16.5, wireframes/F10-04-story.html). Five slides in
 * a row, one shared DOM (mounted once, tech note docs/tech/F10-account-shell.md section 6) — the
 * caller (`f04-app.ts`) owns which slide number is current (`show(slide)`), the browser-history
 * push/back wiring (R28, flow D5), and the "reload goes back to slide 1" rule (R30: automatic here
 * simply because nothing in this module, or the caller's own `storySlideReached`, survives a real
 * page reload — there is no persisted "current slide" anywhere).
 *
 * Slide 4 is system narration, one copy key (`story.slide4.bodySystem`), never a speaker label —
 * D-156: this module does not special-case slide 4 beyond picking that one key, same four-line
 * layout as every other slide (components.md 16.5: "พื้นที่ข้อความใต้ภาพคงที่ 4 บรรทัดทุก slide").
 */
import { getCopyText } from '../copy/load';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntimeController } from '../assets/runtime';

export const STORY_SLIDE_COUNT = 5;
/** D-156: slide 4 alone is system narration (`story.slide4.bodySystem`), no speaker label. */
const SYSTEM_NARRATION_SLIDE = 4;

export interface StoryScreenDeps {
  readonly assets: AssetRuntimeController;
  /** Slides 1-4's "ถัดไป" button (R25). `currentSlide` is whichever slide was showing when it was
   * tapped. */
  readonly onNext: (currentSlide: number) => void;
  /** Slides 1-4's "ข้าม" link (R27). */
  readonly onSkip: (currentSlide: number) => void;
  /** Slide 5's "ออกไปลุย!" button (R25). */
  readonly onStart: () => void;
}

export interface StoryScreen {
  readonly root: HTMLElement;
  /** `slide` is 1-5. Idempotent: a repeat call with the same slide number already showing makes
   * no further DOM change (tech note F10 section 6 rule 5) — `f04-app.ts` calls this on every
   * render, not just when the slide actually changes. */
  show(slide: number): void;
  hide(): void;
}

function bodyKeyForSlide(slide: number): string {
  return slide === SYSTEM_NARRATION_SLIDE ? 'story.slide4.bodySystem' : `story.slide${slide}.body`;
}

export function mountStoryScreen(container: HTMLElement, deps: StoryScreenDeps): StoryScreen {
  const root = document.createElement('div');
  root.className = 'screen story-screen';
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'consent-header-label';
  header.textContent = getCopyText('story.headerLabel');

  const image = document.createElement('img');
  image.className = 'story-image';

  const dotsRow = document.createElement('div');
  dotsRow.className = 'story-dots';
  const dots: HTMLSpanElement[] = [];
  for (let i = 1; i <= STORY_SLIDE_COUNT; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'story-dot';
    dotsRow.append(dot);
    dots.push(dot);
  }

  const title = document.createElement('h2');
  title.className = 'scr-sub story-title';

  const body = document.createElement('p');
  body.className = 'body-text story-body';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'btn btn-primary btn-fullwidth-bottom story-next-button';

  const skipLink = document.createElement('button');
  skipLink.type = 'button';
  skipLink.className = 'btn btn-secondary story-skip-link';
  skipLink.textContent = getCopyText('story.skip');

  root.append(header, image, dotsRow, title, body, nextButton, skipLink);
  container.append(root);

  let currentSlide: number | undefined;

  function iconIdForSlide(slide: number): string {
    return `illus.story.slide-${slide}`;
  }

  deps.assets.onManifestReady(() => {
    if (currentSlide !== undefined) {
      setIconImg(image, deps.assets, iconIdForSlide(currentSlide), '');
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentSlide === undefined) return;
    if (currentSlide >= STORY_SLIDE_COUNT) {
      deps.onStart();
    } else {
      deps.onNext(currentSlide);
    }
  });
  skipLink.addEventListener('click', () => {
    if (currentSlide !== undefined) deps.onSkip(currentSlide);
  });

  return {
    root,
    show(slide: number) {
      if (root.hidden === false && currentSlide === slide) return; // idempotent, section 6 rule 5
      currentSlide = slide;
      setIconImg(image, deps.assets, iconIdForSlide(slide), '');
      for (let i = 0; i < dots.length; i += 1) {
        (dots[i] as HTMLSpanElement).classList.toggle('story-dot-active', i + 1 === slide);
      }
      title.textContent = getCopyText(`story.slide${slide}.title`);
      body.textContent = getCopyText(bodyKeyForSlide(slide));
      const isLast = slide >= STORY_SLIDE_COUNT;
      nextButton.textContent = getCopyText(isLast ? 'story.start' : 'story.next');
      skipLink.hidden = isLast;
      root.hidden = false;
    },
    hide() {
      currentSlide = undefined;
      root.hidden = true;
    },
  };
}
