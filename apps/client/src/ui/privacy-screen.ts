/**
 * `S-23-privacy` (design/features/F06-hp-damage-onboarding.md R48; docs/tech/
 * F06-hp-damage-onboarding.md section 8.4; copy.th.json `privacy.*`): current location-consent
 * status, the position_log retention explainer, the withdraw-consent action (never disabled during
 * a run, B-06/NN-7 — the opposite of `S-22`'s own clear-local-data row), and a shortcut back to that
 * clear-local-data row.
 *
 * Never runs the withdraw sequence itself: `onWithdrawConfirmed` is the caller's own
 * `privacy/withdraw-consent.ts#withdrawConsent(...)` call site — this module only collects the
 * confirm-popup tap and knows whether to show `privacy.withdrawDuringRunNote` (`hasActiveRun()`).
 */
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import { positionLogTtlText } from '../copy/position-log-ttl';
import type { LocationConsent } from '../storage/onboarding';

export interface PrivacyScreenDeps {
  readonly hasActiveRun: () => boolean;
  /** `S-00-consent-location`, reopened (R48 "ปุ่มเดียวกลับไปให้ใหม่") — only reachable when
   * `locationConsent !== 'granted'` (nothing to re-grant otherwise). */
  readonly onRequestReconsent: () => void;
  readonly onWithdrawConfirmed: () => void;
  /** `settings.clearLocalDataLink`'s own row on `S-22-settings` — a shortcut, not a second entry
   * point (this module's own doc comment / copy context: "ไม่ใช่ทางเข้าที่สอง ไม่เปิด popup เอง"). */
  readonly onClearLocalDataShortcut: () => void;
  readonly onClose: () => void;
}

export interface PrivacyScreen {
  readonly root: HTMLElement;
  render(locationConsent: LocationConsent): void;
  show(): void;
  hide(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountPrivacyScreen(container: HTMLElement, deps: PrivacyScreenDeps): PrivacyScreen {
  const root = el('div', 'screen privacy-screen');
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('privacy.title');

  const statusRow = el('div', 'privacy-location-status-row');
  const statusLabel = el('span', 'privacy-location-status-label');
  statusLabel.textContent = getCopyText('privacy.locationStatusLabel');
  const statusValue = el('span', 'privacy-location-status-value');
  statusRow.append(statusLabel, statusValue);

  const reconsentButton = document.createElement('button');
  reconsentButton.className = 'btn btn-secondary privacy-reconsent-button';
  reconsentButton.textContent = getCopyText('home.unknownCta');
  reconsentButton.addEventListener('click', () => deps.onRequestReconsent());

  const explain = document.createElement('p');
  explain.className = 'privacy-position-log-explain';
  explain.textContent = formatCopyText('privacy.positionLogExplain', {
    ttlText: positionLogTtlText(),
  });

  const withdrawButton = document.createElement('button');
  withdrawButton.className = 'btn btn-secondary privacy-withdraw-button';
  withdrawButton.textContent = getCopyText('privacy.withdrawButton');

  // --- withdraw confirm popup (never disabled during a run, opposite of clear-local-data) ---
  const confirmOverlay = el('div', 'popup-overlay');
  confirmOverlay.hidden = true;
  const confirmPopup = el('div', 'popup');
  const confirmTitle = document.createElement('div');
  confirmTitle.textContent = getCopyText('privacy.withdrawConfirmTitle');
  const confirmBody = document.createElement('div');
  confirmBody.className = 'privacy-withdraw-confirm-body';
  confirmBody.textContent = formatCopyText('privacy.withdrawConfirmBody', {
    ttlText: positionLogTtlText(),
  });
  const duringRunNote = document.createElement('div');
  duringRunNote.className = 'privacy-withdraw-during-run-note';
  duringRunNote.textContent = getCopyText('privacy.withdrawDuringRunNote');
  duringRunNote.hidden = true;
  const confirmYes = document.createElement('button');
  confirmYes.className = 'btn btn-danger-confirm';
  confirmYes.textContent = getCopyText('privacy.withdrawConfirmButton');
  const confirmNo = document.createElement('button');
  confirmNo.className = 'btn btn-secondary privacy-withdraw-cancel';
  confirmNo.textContent = getCopyText('common.cancel');
  confirmPopup.append(confirmTitle, confirmBody, duringRunNote, confirmYes, confirmNo);
  confirmOverlay.append(confirmPopup);

  withdrawButton.addEventListener('click', () => {
    duringRunNote.hidden = !deps.hasActiveRun();
    confirmOverlay.hidden = false;
  });
  confirmNo.addEventListener('click', () => {
    confirmOverlay.hidden = true;
  });
  confirmYes.addEventListener('click', () => {
    confirmOverlay.hidden = true;
    deps.onWithdrawConfirmed();
  });

  // [ASSUMPTION A-P2-X38-4: styled as a plain `.btn.btn-secondary` for now, same as every other
  // secondary action on this screen — no `.btn-link`/text-link class exists anywhere in this
  // codebase yet to borrow. owner: uiux-designer, a dedicated shortcut-link style swaps this class
  // with no other change.]
  const clearLocalDataShortcut = document.createElement('button');
  clearLocalDataShortcut.type = 'button';
  clearLocalDataShortcut.className = 'btn btn-secondary privacy-clear-local-data-shortcut';
  clearLocalDataShortcut.textContent = getCopyText('privacy.clearLocalDataShortcut');
  clearLocalDataShortcut.addEventListener('click', () => deps.onClearLocalDataShortcut());

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary privacy-close-button';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => deps.onClose());

  root.append(
    title,
    statusRow,
    reconsentButton,
    explain,
    withdrawButton,
    confirmOverlay,
    clearLocalDataShortcut,
    closeButton,
  );
  container.append(root);

  return {
    root,
    render(locationConsent) {
      const granted = locationConsent === 'granted';
      statusValue.textContent = getCopyText(
        granted ? 'privacy.locationStatusGranted' : 'privacy.locationStatusNotGranted',
      );
      reconsentButton.hidden = granted;
      withdrawButton.hidden = !granted;
    },
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      confirmOverlay.hidden = true;
    },
  };
}
