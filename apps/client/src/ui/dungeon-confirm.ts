/**
 * `S-02-dungeon-confirm` (F04 flow section 3, components.md 13.1/13.3): the popup that opens the
 * instant the player is inside an open dungeon's polygon, with the real check-in status from its
 * first frame (B-01) and a Cancel button available in every state including B5 (C-1, uiux gate
 * `design/reviews/F04-flow-approval.md` R2-3).
 *
 * DOM-only glue (not unit-tested at the Vitest level beyond the C-1/D-089 checks below — same
 * convention as `ui/gps-ui.ts`; the rest is covered by e2e, handoff to qa-tester P2-F04-T22).
 * Every visible string comes from `copy/format.ts`'s `formatCopyText` — never a literal.
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { CheckInPreview } from '@keep-walking/shared/session';
import { checkInStatusView } from './checkin-status';

export interface ConfirmCandidate {
  readonly dungeonId: string;
  readonly nameKey: string;
  readonly levelMin: number;
  readonly levelMax: number;
}

export interface ConfirmPopupDeps {
  readonly onEnter: (dungeonId: string) => void;
  readonly onCancel: () => void;
  readonly onReasonElement?: (element: HTMLElement) => void;
}

export interface ConfirmPopup {
  readonly root: HTMLElement;
  /** B1 (one open dungeon) or B2 (2+ open dungeons overlap, none preselected, N-05). */
  show(candidates: readonly ConfirmCandidate[]): void;
  /** Re-renders the status row/button for the currently-selected candidate (B-01: called on every
   * `selectCheckInPreview`-equivalent change, never a full re-open). `awaitingConfirmResult` shows
   * the button's spinner state while a real `confirm` dispatch is in flight (Flow C: this is
   * synchronous in Phase 2, so it is visible for at most one frame). */
  update(preview: CheckInPreview, isOutOfRangeNow: boolean, awaitingConfirmResult: boolean): void;
  /** B4: dungeon closed (or `unsupported_mode`) — replaces the normal popup entirely, no "เข้า"
   * button at all (R27). `openTime` is `undefined` when there is no known next-open time. */
  showClosed(openTime: string | undefined, emergency: boolean): void;
  /** B6 race guard message (R01/R04). */
  showAlreadyActive(): void;
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

/**
 * Builds the popup DOM inside `container`. The Cancel button (`dungeon.confirmCancel`) is created
 * once, appended once, and never removed or hidden by any other method here (C-1: available in
 * every check-in state, including B5's out-of-range line) — this is enforced by construction, not
 * by a per-state flag every call site has to remember to set.
 */
export function mountDungeonConfirm(container: HTMLElement, deps: ConfirmPopupDeps): ConfirmPopup {
  const overlay = el('div', 'popup-overlay');
  overlay.hidden = true;
  const popup = el('div', 'popup');
  overlay.append(popup);

  const cardsRow = el('div', 'confirm-cards');
  const title = el('div', 'confirm-title');
  const level = el('div', 'confirm-level');
  const closingSoon = el('div', 'chip-status closing-soon');
  closingSoon.hidden = true;
  const statusRow = el('div', 'checkin-status-row');
  const enterButton = el('button', 'btn btn-primary') as HTMLButtonElement;
  enterButton.disabled = true;
  const cancelButton = el('button', 'btn btn-secondary confirm-cancel') as HTMLButtonElement;
  cancelButton.textContent = getCopyText('dungeon.confirmCancel');
  cancelButton.addEventListener('click', () => deps.onCancel());

  popup.append(cardsRow, title, level, closingSoon, statusRow, enterButton, cancelButton);
  container.append(overlay);
  deps.onReasonElement?.(statusRow);

  let candidates: readonly ConfirmCandidate[] = [];
  let selectedId: string | undefined;

  function renderHeader(candidate: ConfirmCandidate): void {
    title.textContent = formatCopyText('dungeon.confirmTitle', {
      zoneName: getCopyText(candidate.nameKey),
    });
    level.textContent = formatCopyText('dungeon.confirmLevel', {
      levelMin: candidate.levelMin,
      levelMax: candidate.levelMax,
    });
  }

  function renderOverlapCards(): void {
    cardsRow.innerHTML = '';
    cardsRow.hidden = candidates.length < 2;
    if (candidates.length < 2) return;
    title.textContent = getCopyText('dungeon.overlapTitle');
    level.textContent = getCopyText('dungeon.overlapHint');
    for (const c of candidates) {
      const card = el('button', 'card confirm-overlap-card');
      card.textContent = getCopyText(c.nameKey);
      card.classList.toggle('selected', c.dungeonId === selectedId);
      card.addEventListener('click', () => {
        selectedId = c.dungeonId;
        renderOverlapCards();
        const selected = candidates.find((x) => x.dungeonId === selectedId);
        if (selected !== undefined) renderHeader(selected);
      });
      cardsRow.append(card);
    }
  }

  return {
    root: overlay,
    show(next) {
      candidates = next;
      selectedId = next.length === 1 ? next[0]?.dungeonId : undefined;
      overlay.hidden = false;
      closingSoon.hidden = true;
      cardsRow.hidden = true;
      title.textContent = '';
      level.textContent = '';
      statusRow.textContent = '';
      enterButton.disabled = true;
      enterButton.textContent = getCopyText('dungeon.confirmEnter');
      if (next.length === 1 && next[0] !== undefined) {
        renderHeader(next[0]);
      } else {
        renderOverlapCards();
      }
    },
    update(preview, isOutOfRangeNow, awaitingConfirmResult) {
      if (awaitingConfirmResult) {
        enterButton.disabled = true;
        enterButton.classList.add('btn-spinner');
        return;
      }
      enterButton.classList.remove('btn-spinner');
      if (preview.ok) {
        statusRow.textContent = '';
        enterButton.disabled = selectedId === undefined;
        enterButton.textContent = getCopyText('dungeon.confirmEnter');
        enterButton.onclick = () => {
          if (selectedId !== undefined) deps.onEnter(selectedId);
        };
        return;
      }
      const view = checkInStatusView(preview, isOutOfRangeNow);
      statusRow.textContent =
        view.countdownText === undefined
          ? getCopyText(view.copyKey)
          : formatCopyText(view.copyKey, { countdown: view.countdownText });
      enterButton.disabled = true;
      enterButton.onclick = null;
    },
    showClosed(openTime, emergency) {
      candidates = [];
      overlay.hidden = false;
      cardsRow.hidden = true;
      title.textContent = getCopyText('dungeon.closedTitle');
      level.textContent =
        openTime !== undefined
          ? formatCopyText('dungeon.closedBody', { openTime })
          : getCopyText(emergency ? 'dungeon.closedEmergencyBody' : 'dungeon.closedBody');
      statusRow.textContent = '';
      closingSoon.hidden = true;
      enterButton.hidden = true;
      enterButton.disabled = true;
      cancelButton.textContent = getCopyText('dungeon.closedDismiss');
    },
    showAlreadyActive() {
      statusRow.textContent = getCopyText('dungeon.alreadyActive');
      enterButton.disabled = true;
    },
    hide() {
      overlay.hidden = true;
      enterButton.hidden = false;
      cancelButton.textContent = getCopyText('dungeon.confirmCancel');
    },
  };
}
