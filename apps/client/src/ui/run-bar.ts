/**
 * `S-03-run`'s status bar (F04 flow section 6, components.md 13.2): the run-state pill (present in
 * every state, not just when something is wrong), the Grace/Suspended banner, the tick timer
 * (paused label outside Active, N-11), the closing-soon warning (R29), and the exit button + its
 * confirm popup (F03 section 4.7, unchanged by this task).
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { RunStatus } from '@keep-walking/shared/session';
import { runStatePillView, tickTimerCopyKey } from './run-state-view';

export interface RunBarDeps {
  readonly onExitConfirmed: () => void;
}

export interface RunBar {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
  setStatus(status: RunStatus, bannerVars: Readonly<Record<string, string>>): void;
  /** `tickText` is `undefined` while paused (Grace/Suspended: the paused label needs no value). */
  setTick(status: RunStatus, tickText: string | undefined): void;
  showClosingSoonWarning(
    timeLeft: string,
    vibrate: (pattern_ms: number) => void,
    vibrateOnFirstShow_ms: number,
  ): void;
  hideClosingSoonWarning(): void;
}

export function mountRunBar(container: HTMLElement, deps: RunBarDeps): RunBar {
  const root = document.createElement('div');
  root.className = 'run-bar';
  root.hidden = true;

  const pill = document.createElement('div');
  pill.className = 'run-state-pill';
  const banner = document.createElement('div');
  banner.className = 'banner info';
  banner.hidden = true;
  const closingSoon = document.createElement('div');
  closingSoon.className = 'banner warn closing-soon-warning';
  closingSoon.hidden = true;
  const tick = document.createElement('div');
  tick.className = 'run-tick-timer';
  const exitButton = document.createElement('button');
  exitButton.className = 'btn btn-secondary run-exit-button';
  exitButton.textContent = getCopyText('run.exitButton');

  const confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'popup-overlay';
  confirmOverlay.hidden = true;
  const confirmPopup = document.createElement('div');
  confirmPopup.className = 'popup';
  const confirmTitle = document.createElement('div');
  confirmTitle.textContent = getCopyText('run.exitConfirmTitle');
  const confirmBody = document.createElement('div');
  confirmBody.textContent = getCopyText('run.exitConfirmBody');
  const confirmYes = document.createElement('button');
  confirmYes.className = 'btn btn-danger-confirm';
  confirmYes.textContent = getCopyText('run.exitConfirmButton');
  const confirmNo = document.createElement('button');
  confirmNo.className = 'btn btn-secondary';
  confirmNo.textContent = getCopyText('run.exitConfirmCancel');
  confirmPopup.append(confirmTitle, confirmBody, confirmYes, confirmNo);
  confirmOverlay.append(confirmPopup);

  exitButton.addEventListener('click', () => {
    confirmOverlay.hidden = false;
  });
  confirmNo.addEventListener('click', () => {
    confirmOverlay.hidden = true;
  });
  confirmYes.addEventListener('click', () => {
    confirmOverlay.hidden = true;
    deps.onExitConfirmed();
  });

  root.append(pill, banner, closingSoon, tick, exitButton, confirmOverlay);
  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    setStatus(status, bannerVars) {
      const view = runStatePillView(status);
      pill.textContent = getCopyText(view.labelKey);
      pill.dataset['tone'] = view.tone;
      if (view.bannerKey === undefined) {
        banner.hidden = true;
      } else {
        banner.hidden = false;
        banner.className = `banner ${view.tone} run-state-banner`;
        banner.textContent = formatCopyText(view.bannerKey, bannerVars);
      }
    },
    setTick(status, tickText) {
      const key = tickTimerCopyKey(status);
      tick.textContent =
        tickText === undefined ? getCopyText(key) : formatCopyText(key, { timeLeft: tickText });
    },
    showClosingSoonWarning(timeLeft, vibrate, vibrateOnFirstShow_ms) {
      const wasHidden = closingSoon.hidden;
      closingSoon.hidden = false;
      closingSoon.textContent = formatCopyText('run.closingSoonWarning', { timeLeft });
      if (wasHidden) {
        vibrate(vibrateOnFirstShow_ms);
      }
    },
    hideClosingSoonWarning() {
      closingSoon.hidden = true;
    },
  };
}
