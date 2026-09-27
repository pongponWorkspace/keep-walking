/**
 * `S-22-settings` (design/ux/ia.md section 3.6; design/ux/flows/F06-hp-damage-onboarding.md Flow G;
 * copy.th.json `settings.*`): the real home menu the gear icon opens — replacing the "stand-in
 * front door onto `S-22-settings-autoretreat` directly" `f04-app.ts` used before this task
 * (`ui/settings-walking-safety.ts`'s own doc comment).
 *
 * Scope of this build (handoff in this task's REPORT, see `settings.reportBlockLink`/
 * `settings.helpLink`/`settings.accountDeleteLink`): only the four rows this task's acceptance asks
 * for — walking safety (`ui/settings-walking-safety.ts`), Credits (`ui/credits.ts`), delete local
 * data (this row's own confirm popup, `storage/clear-local-data.ts`), and privacy
 * (`ui/privacy-screen.ts`). `S-17-report-block`/`S-25-help` have no screen anywhere in this repo yet
 * and `S-24-account-delete` is out of scope for Phase 2 entirely (no accounts, D-087/D-088,
 * `design/ux/flows/F06-hp-damage-onboarding.md`'s own override note 6) — none of their three rows
 * are shown here rather than linking to a screen that does not exist.
 *
 * `clearLocalDataLink` disables (with `settings.clearLocalDataBlockedNote` shown, never hidden)
 * exactly when `selectCanClearLocalData()` is `false` (`@keep-walking/shared/session`, tech note F06
 * 8.3, H-E23) — the opposite of the privacy screen's own withdraw-consent button, which is never
 * disabled during a run (B-06/NN-7).
 */
import { getCopyText } from '../copy/load';

export interface SettingsMenuDeps {
  /** `selectCanClearLocalData(state)` (`@keep-walking/shared/session`) — read fresh on every
   * `show()`/re-render, never cached (tech note F06 8.3). */
  readonly selectCanClearLocalData: () => boolean;
  readonly onOpenWalkingSafety: () => void;
  readonly onOpenCredits: () => void;
  readonly onOpenPrivacy: () => void;
  /** The confirm popup's own "ลบเลย" tap — the caller's `storage/clear-local-data.ts#clearLocalData`
   * call site (which itself reloads to onboarding, `afterClear: reloadToOnboarding`). */
  readonly onClearLocalDataConfirmed: () => void;
  readonly onClose: () => void;
}

export interface SettingsMenuScreen {
  readonly root: HTMLElement;
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

export function mountSettingsMenu(
  container: HTMLElement,
  deps: SettingsMenuDeps,
): SettingsMenuScreen {
  const root = el('div', 'screen settings-menu');
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('settings.title');

  const walkingSafetyRow = document.createElement('button');
  walkingSafetyRow.type = 'button';
  walkingSafetyRow.className = 'btn btn-secondary settings-menu-row settings-menu-walking-safety';
  walkingSafetyRow.textContent = getCopyText('settings.walkingSafetyLink');
  walkingSafetyRow.addEventListener('click', () => deps.onOpenWalkingSafety());

  const privacyRow = document.createElement('button');
  privacyRow.type = 'button';
  privacyRow.className = 'btn btn-secondary settings-menu-row settings-menu-privacy';
  privacyRow.textContent = getCopyText('settings.privacyLink');
  privacyRow.addEventListener('click', () => deps.onOpenPrivacy());

  const creditsRow = document.createElement('button');
  creditsRow.type = 'button';
  creditsRow.className = 'btn btn-secondary settings-menu-row settings-menu-credits';
  creditsRow.textContent = getCopyText('settings.creditsLink');
  creditsRow.addEventListener('click', () => deps.onOpenCredits());

  // --- clear local data (fixed top-of-list position per GD K-8/N-02, flow F06 G3) ---
  const clearLocalDataRow = document.createElement('button');
  clearLocalDataRow.type = 'button';
  clearLocalDataRow.className =
    'btn btn-secondary settings-menu-row settings-menu-clear-local-data';
  clearLocalDataRow.textContent = getCopyText('settings.clearLocalDataLink');
  const clearLocalDataBlockedNote = document.createElement('div');
  clearLocalDataBlockedNote.className = 'settings-menu-clear-local-data-blocked-note';
  clearLocalDataBlockedNote.textContent = getCopyText('settings.clearLocalDataBlockedNote');
  clearLocalDataBlockedNote.hidden = true;

  const clearConfirmOverlay = el('div', 'popup-overlay');
  clearConfirmOverlay.hidden = true;
  const clearConfirmPopup = el('div', 'popup');
  const clearConfirmTitle = document.createElement('div');
  clearConfirmTitle.textContent = getCopyText('settings.clearLocalDataConfirmTitle');
  const clearConfirmBody = document.createElement('div');
  clearConfirmBody.textContent = getCopyText('settings.clearLocalDataConfirmBody');
  const clearConfirmYes = document.createElement('button');
  clearConfirmYes.className = 'btn btn-danger-confirm';
  clearConfirmYes.textContent = getCopyText('settings.clearLocalDataConfirmButton');
  const clearConfirmNo = document.createElement('button');
  clearConfirmNo.className = 'btn btn-secondary settings-menu-clear-local-data-cancel';
  clearConfirmNo.textContent = getCopyText('settings.clearLocalDataCancelButton');
  clearConfirmPopup.append(clearConfirmTitle, clearConfirmBody, clearConfirmYes, clearConfirmNo);
  clearConfirmOverlay.append(clearConfirmPopup);

  clearLocalDataRow.addEventListener('click', () => {
    if (clearLocalDataRow.disabled) return;
    clearConfirmOverlay.hidden = false;
  });
  clearConfirmNo.addEventListener('click', () => {
    clearConfirmOverlay.hidden = true;
  });
  clearConfirmYes.addEventListener('click', () => {
    clearConfirmOverlay.hidden = true;
    deps.onClearLocalDataConfirmed();
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary settings-menu-close';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => deps.onClose());

  root.append(
    title,
    clearLocalDataRow,
    clearLocalDataBlockedNote,
    walkingSafetyRow,
    privacyRow,
    creditsRow,
    closeButton,
    clearConfirmOverlay,
  );
  container.append(root);

  function renderClearLocalDataAvailability(): void {
    const canClear = deps.selectCanClearLocalData();
    clearLocalDataRow.disabled = !canClear;
    clearLocalDataRow.classList.toggle('btn-disabled', !canClear);
    // H-E23: the blocked note is never hidden while a run is active — always shown alongside the
    // disabled row, not merely on hover/tap.
    clearLocalDataBlockedNote.hidden = canClear;
  }

  return {
    root,
    show() {
      renderClearLocalDataAvailability();
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      clearConfirmOverlay.hidden = true;
    },
  };
}
