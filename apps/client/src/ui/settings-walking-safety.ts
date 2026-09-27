/**
 * `S-22-settings` subpage "การเดินและความปลอดภัย" (`design/ux/ia.md` section 3.6 item 6,
 * `design/ux/flows/F06-hp-damage-onboarding.md` Flow D — `06-settings-autoretreat.html`'s
 * frame E2 minus the two Phase-4-only auto-potion rows, D1/override item 5): exactly two rows in
 * Phase 2 — auto-retreat (on by default, off only behind a confirm popup, NN-6) and the pocket
 * screen toggle (a client-only preference; Wake Lock request/fire-together itself is P2-F06-T14's
 * build — this row only persists the player's choice for that task to read).
 *
 * The auto-retreat toggle dispatches `{type: 'setAutoRetreat', enabled}` straight to the session
 * engine (`@keep-walking/shared/session`) — this module never decides the effect of the setting
 * itself (hp/auto-retreat math stays entirely server-authoritative/engine-owned, CLAUDE.md
 * non-negotiable 1); it only gates *turning it off* behind the one-layer confirm popup the flow
 * requires (turning it back on needs no confirmation, same asymmetry `ia.md` section 5 item 6
 * describes).
 *
 * Mounting note: the `S-22-settings` home menu itself (`ui/settings-menu.ts`, P2-X38 —
 * `settings.walkingSafetyLink` entry point, `settings.creditsLink` -> `ui/credits.ts`,
 * `settings.clearLocalDataLink` -> `storage/clear-local-data.ts`, `settings.privacyLink` ->
 * `ui/privacy-screen.ts`) links here as one of its subpages — `settings.reportBlockLink`/
 * `settings.helpLink` have no screen anywhere in this repo yet and are out of P2-X38's own scope
 * (that task's own REPORT), same division of labor as `ui/credits.ts`/`ui/inventory-screen.ts`.
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { KeyValueStorage } from '../storage/local-store';

export const POCKET_SCREEN_PREF_KEY = 'kw.p2.settings.pocketScreenEnabled';
const ENABLED_VALUE = '1';
const DISABLED_VALUE = '0';

/** Reads the pocket-screen preference (default: on, matching flow F06 section 6's "ทิศทาง A" as
 * the default experience) — a plain boolean flag, never a reward/balance value. */
export function pocketScreenPrefEnabled(storage: KeyValueStorage): boolean {
  return storage.getItem(POCKET_SCREEN_PREF_KEY) !== DISABLED_VALUE;
}

export interface SettingsWalkingSafetyDeps {
  readonly storage: KeyValueStorage;
  /** `config: dungeons.hpSafety.autoRetreatThreshold_pct` — `settings.autoRetreatToggleHint`'s
   * `{autoRetreatPct}` variable. Never hardcoded (CLAUDE.md non-negotiable 3). */
  readonly autoRetreatThresholdPct: number;
  readonly onSetAutoRetreat: (enabled: boolean) => void;
  readonly onClose: () => void;
}

export interface SettingsWalkingSafetyScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
  /** Reflects the current engine value on the toggle (`PlayerView.autoRetreatEnabled`) — this
   * module never assumes its own last dispatched value stuck (engine is the source of truth). */
  setAutoRetreatEnabled(enabled: boolean): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountSettingsWalkingSafety(
  container: HTMLElement,
  deps: SettingsWalkingSafetyDeps,
): SettingsWalkingSafetyScreen {
  const root = el('div', 'screen settings-walking-safety');
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('settings.walkingSafetyLink');

  // --- Row 1: auto-retreat (toggle behind a confirm-on-off popup, NN-6) ---
  const autoRetreatRow = el('div', 'settings-row');
  const autoRetreatLabel = el('div', 'settings-row-label');
  autoRetreatLabel.textContent = getCopyText('settings.autoRetreatToggleLabel');
  const autoRetreatHint = el('div', 'settings-row-hint');
  autoRetreatHint.textContent = formatCopyText('settings.autoRetreatToggleHint', {
    autoRetreatPct: deps.autoRetreatThresholdPct,
  });
  const autoRetreatToggle = document.createElement('button');
  autoRetreatToggle.className = 'toggle settings-autoretreat-toggle';
  autoRetreatRow.append(autoRetreatLabel, autoRetreatHint, autoRetreatToggle);

  // --- Off-confirm popup (single layer, K-9: NEEDS_CHANGES round accepted one popup for Phase 2) ---
  const confirmOverlay = el('div', 'popup-overlay');
  confirmOverlay.hidden = true;
  const confirmPopup = el('div', 'popup');
  const confirmTitle = document.createElement('div');
  confirmTitle.textContent = getCopyText('settings.autoRetreatOffWarningTitle');
  const confirmBody = document.createElement('div');
  confirmBody.textContent = getCopyText('settings.autoRetreatOffWarningBody');
  const confirmYes = document.createElement('button');
  confirmYes.className = 'btn btn-danger-confirm';
  confirmYes.textContent = getCopyText('settings.autoRetreatOffConfirm');
  const confirmNo = document.createElement('button');
  confirmNo.className = 'btn btn-secondary';
  confirmNo.textContent = getCopyText('settings.autoRetreatOffCancel');
  confirmPopup.append(confirmTitle, confirmBody, confirmYes, confirmNo);
  confirmOverlay.append(confirmPopup);

  let autoRetreatEnabled = true;
  function renderAutoRetreatToggle(): void {
    autoRetreatToggle.dataset['on'] = String(autoRetreatEnabled);
    autoRetreatToggle.setAttribute('aria-pressed', String(autoRetreatEnabled));
  }
  renderAutoRetreatToggle();

  autoRetreatToggle.addEventListener('click', () => {
    if (autoRetreatEnabled) {
      // Turning off: gated behind the confirm popup (never applied on this click alone).
      confirmOverlay.hidden = false;
    } else {
      // Turning back on: no confirmation needed (ia.md section 5 item 6).
      deps.onSetAutoRetreat(true);
    }
  });
  confirmNo.addEventListener('click', () => {
    confirmOverlay.hidden = true;
  });
  confirmYes.addEventListener('click', () => {
    confirmOverlay.hidden = true;
    deps.onSetAutoRetreat(false);
  });

  // --- Row 2: pocket screen (client-only preference, no engine dispatch, no confirm) ---
  const pocketRow = el('div', 'settings-row');
  const pocketLabel = el('div', 'settings-row-label');
  pocketLabel.textContent = getCopyText('settings.pocketScreenLabel');
  const pocketHint = el('div', 'settings-row-hint');
  pocketHint.textContent = getCopyText('settings.pocketScreenHint');
  const pocketToggle = document.createElement('button');
  pocketToggle.className = 'toggle settings-pocket-screen-toggle';
  pocketRow.append(pocketLabel, pocketHint, pocketToggle);

  function renderPocketToggle(): void {
    const enabled = pocketScreenPrefEnabled(deps.storage);
    pocketToggle.dataset['on'] = String(enabled);
    pocketToggle.setAttribute('aria-pressed', String(enabled));
  }
  renderPocketToggle();
  pocketToggle.addEventListener('click', () => {
    const next = !pocketScreenPrefEnabled(deps.storage);
    deps.storage.setItem(POCKET_SCREEN_PREF_KEY, next ? ENABLED_VALUE : DISABLED_VALUE);
    renderPocketToggle();
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary settings-close-button';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => deps.onClose());

  root.append(title, autoRetreatRow, pocketRow, closeButton, confirmOverlay);
  container.append(root);

  return {
    root,
    show() {
      renderPocketToggle();
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      confirmOverlay.hidden = true;
    },
    setAutoRetreatEnabled(enabled) {
      autoRetreatEnabled = enabled;
      renderAutoRetreatToggle();
    },
  };
}
