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
 *
 * `exportRow` (P2-X50, plan requirement C2-2, `product/playtest/phase-2-plan.md` §2/§11): the one
 * way a playtest participant gets their telemetry off the device — there is no server, no
 * auto-upload (D-088). A direct action on click, like `clearLocalDataRow`, not a link to a subpage
 * (design/ux/components.md line 239: `S-22-settings` itself carries menu links only, but this row
 * is the same shape as the other in-place action already on this screen) — the actual `Blob`/anchor
 * download lives in `telemetry/download.ts`, called from `deps.onExport()` so this module stays
 * pure DOM glue with no telemetry-sink import of its own (same separation `onClearLocalDataConfirmed`
 * already uses). Copy key `settings.exportLink` (P2-X51: "ส่งออกบันทึกการเล่น") is in `copy.th.json`.
 *
 * `logoutRow`/its confirm popup (P2-F10-T17, flow F10 Flow F1/F2, components.md 16.7, F10-R39/R40):
 * the fifth and last row, glyph `icon.ui.logout` (D-157, never `icon.ui.exit` — that id means "leave
 * the run itself", icon-grammar 7.4). Plain `ink.900` text like every other row above it — **never**
 * `state.danger`/`.btn-danger-confirm` anywhere on this row or its popup, because logging out
 * destroys nothing (F10-R40, the opposite of the clear-local-data row right above it, which keeps
 * both). `hasActiveRun()` is read fresh the instant the row is tapped (same "never cached" rule
 * `selectCanClearLocalData` already follows) to decide whether the popup's extra
 * `settings.logoutConfirmRunNote` line shows (flow F2's own "ถ้ามี run อยู่ เติมบรรทัดเพิ่ม").
 */
import { getCopyText } from '../copy/load';
import { setIconGlyphWhenReady } from '../assets/icon-glyph';
import type { IconGlyphRenderer, ManifestReadySignal } from '../assets/icon-glyph';

export interface SettingsMenuDeps {
  /** `selectCanClearLocalData(state)` (`@keep-walking/shared/session`) — read fresh on every
   * `show()`/re-render, never cached (tech note F06 8.3). */
  readonly selectCanClearLocalData: () => boolean;
  readonly onOpenWalkingSafety: () => void;
  readonly onOpenCredits: () => void;
  readonly onOpenPrivacy: () => void;
  /** The export row's own tap (P2-X50, C2-2) — the caller does the actual `Blob`/anchor download
   * (`telemetry/download.ts#downloadTelemetryExport`), this module only fires the callback. */
  readonly onExport: () => void;
  /** The confirm popup's own "ลบเลย" tap — the caller's `storage/clear-local-data.ts#clearLocalData`
   * call site (which itself reloads to onboarding, `afterClear: reloadToOnboarding`). */
  readonly onClearLocalDataConfirmed: () => void;
  /** `state.run !== null` (tech note section 4.3) — read fresh the moment the logout row is tapped,
   * the same "never cached" convention `selectCanClearLocalData` above already follows. */
  readonly hasActiveRun: () => boolean;
  /** The logout popup's own "ออกจากระบบ" confirm tap — the caller's `account/logout.ts#logout`
   * call site (tech note section 4.3 items 2-3). */
  readonly onLogoutConfirmed: () => void;
  readonly onClose: () => void;
  /** Optional the same way every other screen's `iconGlyph` dep already is (`ui/login-screen.ts`,
   * `ui/nav-panel.ts`) — `undefined` only in a test double that does not care about the glyph. */
  readonly iconGlyph?: IconGlyphRenderer;
  /** Only read when `iconGlyph` is also present (V-F10-01): re-renders the logout row's glyph once
   * the manifest is ready, since it mounts before `assets.load()` necessarily settles. */
  readonly assets?: ManifestReadySignal;
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

  // P2-X50 (C2-2): a direct action, not a subpage link — same shape as `clearLocalDataRow` below.
  const exportRow = document.createElement('button');
  exportRow.type = 'button';
  exportRow.className = 'btn btn-secondary settings-menu-row settings-menu-export';
  exportRow.textContent = getCopyText('settings.exportLink');
  exportRow.addEventListener('click', () => deps.onExport());

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
  clearConfirmBody.className = 'settings-menu-clear-local-data-confirm-body';
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

  // --- logout (F10-R39/R40, components.md 16.7): last row in the list, plain `ink.900` text, no
  // `state.danger` anywhere on it or its popup (logging out destroys nothing) ---
  const logoutRow = document.createElement('button');
  logoutRow.type = 'button';
  logoutRow.className = 'btn btn-secondary settings-menu-row settings-menu-logout';
  const logoutIcon = document.createElement('span');
  logoutIcon.className = 'settings-menu-logout-icon';
  const logoutLabel = document.createElement('span');
  logoutLabel.textContent = getCopyText('settings.logoutLink');
  logoutRow.append(logoutIcon, logoutLabel);
  if (deps.iconGlyph !== undefined && deps.assets !== undefined) {
    setIconGlyphWhenReady(deps.assets, deps.iconGlyph, logoutIcon, 'icon.ui.logout', {
      altText: '',
      colorCss: '#1A1A22' /* ink.900 — never state.danger, F10-R40 */,
      onNightBackground: false,
      nightPlateColorCss: '',
    });
  }

  const logoutConfirmOverlay = el('div', 'popup-overlay');
  logoutConfirmOverlay.hidden = true;
  const logoutConfirmPopup = el('div', 'popup');
  const logoutConfirmTitle = document.createElement('div');
  logoutConfirmTitle.textContent = getCopyText('settings.logoutConfirmTitle');
  const logoutConfirmBody = document.createElement('div');
  logoutConfirmBody.className = 'settings-menu-logout-confirm-body';
  logoutConfirmBody.textContent = getCopyText('settings.logoutConfirmBody');
  const logoutConfirmRunNote = document.createElement('div');
  logoutConfirmRunNote.className = 'settings-menu-logout-confirm-run-note';
  logoutConfirmRunNote.textContent = getCopyText('settings.logoutConfirmRunNote');
  logoutConfirmRunNote.hidden = true;
  const logoutConfirmYes = document.createElement('button');
  // F10-R40: `.btn-primary` (not `.btn-danger-confirm`) — logging out is an intentional, non-
  // destructive action, the single most prominent button on this popup (components.md 16.7).
  logoutConfirmYes.className = 'btn btn-primary settings-menu-logout-confirm-button';
  logoutConfirmYes.textContent = getCopyText('settings.logoutConfirmButton');
  // `disabled` (not just the overlay's own `hidden`) while the popup is closed: this is the only
  // `.btn-primary` inside a `.popup` anywhere in this app that is not gated behind a disabled state
  // of its own (every confirm screen with a real precondition — create-character, dungeon-confirm —
  // already starts disabled the same way) — a broad qa e2e safety check (`qa/tests/e2e/
  // f04-closed-dungeon.spec.ts`) scans every `.popup button.btn-primary:enabled` on the page
  // regardless of which ancestor's `hidden` attribute is covering it, so this button must never read
  // as enabled while its own popup is not the one currently open.
  logoutConfirmYes.disabled = true;
  const logoutConfirmNo = document.createElement('button');
  logoutConfirmNo.className = 'btn btn-secondary settings-menu-logout-cancel';
  logoutConfirmNo.textContent = getCopyText('settings.logoutCancelButton');
  logoutConfirmPopup.append(
    logoutConfirmTitle,
    logoutConfirmBody,
    logoutConfirmRunNote,
    logoutConfirmYes,
    logoutConfirmNo,
  );
  logoutConfirmOverlay.append(logoutConfirmPopup);

  logoutRow.addEventListener('click', () => {
    // Flow F2: the run-note line only appears when a run is active right now — computed fresh the
    // instant this popup opens, never cached from `show()` time.
    logoutConfirmRunNote.hidden = !deps.hasActiveRun();
    logoutConfirmOverlay.hidden = false;
    logoutConfirmYes.disabled = false;
  });
  logoutConfirmNo.addEventListener('click', () => {
    logoutConfirmOverlay.hidden = true;
    logoutConfirmYes.disabled = true;
  });
  logoutConfirmYes.addEventListener('click', () => {
    logoutConfirmOverlay.hidden = true;
    logoutConfirmYes.disabled = true;
    deps.onLogoutConfirmed();
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
    exportRow,
    creditsRow,
    logoutRow,
    closeButton,
    clearConfirmOverlay,
    logoutConfirmOverlay,
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
      logoutConfirmOverlay.hidden = true;
      logoutConfirmYes.disabled = true;
    },
  };
}
