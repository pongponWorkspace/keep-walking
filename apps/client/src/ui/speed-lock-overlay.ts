/**
 * `.overlay-speedlock` (F04 flow section 5, GD B-02, components.md 13.4): a full-screen overlay
 * over everything (map, popup, run screen, pocket screen) while speed-locked. Never a `.btn-primary`
 * on this screen (R21/R23: no "keep playing" affordance) — enforced by only ever creating
 * `.btn-secondary` buttons here, never a primary one.
 */
import { getCopyText } from '../copy/load';
import { speedLockButtons } from './run-state-view';
import { speedLockIconTone, NIGHT_BACKING_PLATE_COLOR_CSS } from './icon-tone';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

export interface SpeedLockOverlayDeps {
  readonly onSettings: () => void;
  readonly onExit: () => void;
  readonly vibrate: (pattern_ms: number) => void;
  readonly vibrateOnEnterPattern_ms: number;
  /** `setIconGlyph` (V-41, art gate F04-F06-visual-gate.md §8, components.md 13.4): renders
   * `icon.ui.speed-lock` 48px above the title — decorative (`aria-hidden`), since the title/body
   * text already carries the meaning (style-guide S4). */
  readonly iconGlyph: IconGlyphRenderer;
}

export interface SpeedLockOverlay {
  readonly root: HTMLElement;
  show(hasRun: boolean): void;
  hide(): void;
}

export function mountSpeedLockOverlay(
  container: HTMLElement,
  deps: SpeedLockOverlayDeps,
): SpeedLockOverlay {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-speedlock';
  overlay.hidden = true;
  const icon = document.createElement('span');
  icon.className = 'speedlock-icon';
  const title = document.createElement('div');
  title.className = 'speedlock-title';
  title.textContent = getCopyText('anticheat.speedLockTitle');
  const body = document.createElement('div');
  body.className = 'speedlock-body';
  body.textContent = getCopyText('anticheat.speedLockBody');
  const buttonRow = document.createElement('div');
  buttonRow.className = 'speedlock-buttons';
  overlay.append(icon, title, body, buttonRow);
  container.append(overlay);

  let wasHidden = true;

  return {
    root: overlay,
    show(hasRun) {
      if (wasHidden) {
        deps.vibrate(deps.vibrateOnEnterPattern_ms);
      }
      wasHidden = false;
      overlay.hidden = false;
      const tone = speedLockIconTone();
      void deps.iconGlyph.setIconGlyph(icon, tone.id, {
        altText: getCopyText('anticheat.speedLockTitle'),
        colorCss: tone.colorCss,
        onNightBackground: false,
        nightPlateColorCss: NIGHT_BACKING_PLATE_COLOR_CSS,
      });
      buttonRow.innerHTML = '';
      for (const kind of speedLockButtons(hasRun)) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        if (kind === 'settings') {
          button.textContent = getCopyText('anticheat.speedLockSettings');
          button.addEventListener('click', () => deps.onSettings());
        } else {
          button.textContent = getCopyText('run.exitButton');
          button.addEventListener('click', () => deps.onExit());
        }
        buttonRow.append(button);
      }
    },
    hide() {
      overlay.hidden = true;
      wasHidden = true;
    },
  };
}
