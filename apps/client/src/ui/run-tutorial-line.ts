/**
 * N-3, the single tutorial line of the whole game (`dungeon.confirmTutorialLine`, "เดินต่อไปเพื่อ
 * รับรางวัล"): a short overlay on `S-03-run`, shown every `dungeon_entered` while `!firstRewardDone`
 * (F06-R36/R38 — not "first run ever", tech note F06 8.2/flow F06 A9) and auto-hidden after
 * `onboarding.tutorialLineHoldDurationMs`. No other tooltip exists anywhere in this game (F06-R38,
 * R41) — this is the one place any line like it is allowed to render.
 */
import { getCopyText } from '../copy/load';

export interface RunTutorialLine {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountRunTutorialLine(
  container: HTMLElement,
  holdDurationMs: number,
): RunTutorialLine {
  const root = document.createElement('div');
  root.className = 'run-tutorial-line';
  root.hidden = true;
  root.textContent = getCopyText('dungeon.confirmTutorialLine');
  container.append(root);

  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    root,
    show() {
      if (timer !== undefined) clearTimeout(timer);
      root.hidden = false;
      timer = setTimeout(() => {
        root.hidden = true;
        timer = undefined;
      }, holdDurationMs);
    },
    hide() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      root.hidden = true;
    },
  };
}
