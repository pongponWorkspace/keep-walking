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
import { getDungeonFullName, getDungeonShortName } from '../copy/names';
import type { CheckInPreview } from '@keep-walking/shared/session';
import { checkInStatusView } from './checkin-status';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

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
  /** `setIconGlyph` (components.md 13.3, V-30): renders the check-in row's 48px icon
   * (`icon.ui.signal-wait`/`walk-in`/`speed-lock`) next to its status text. Optional so every
   * existing test/call site that predates this field keeps building with no other change (same
   * convention as `onReasonElement`) — the row simply stays icon-less without it. */
  readonly iconGlyph?: IconGlyphRenderer;
}

export interface ConfirmPopup {
  readonly root: HTMLElement;
  /** B1 (one open dungeon) or B2 (2+ open dungeons overlap, none preselected, N-05). */
  show(candidates: readonly ConfirmCandidate[]): void;
  /** Re-renders the status row/button for the currently-selected candidate (B-01: called on every
   * `selectCheckInPreview`-equivalent change, never a full re-open). `awaitingConfirmResult` shows
   * the button's spinner state while a real `confirm` dispatch is in flight (Flow C: this is
   * synchronous in Phase 2, so it is visible for at most one frame). */
  /** `closingSoonTimeLeftText` (C-11, copy gate P2-X37): a pre-formatted `{timeLeft}` string
   * (`unit.minutes`), or `undefined` to keep the closing-soon line hidden — this popup never
   * derives the closing decision itself (R28, `selectOpening` is the caller's job). */
  update(
    preview: CheckInPreview,
    isOutOfRangeNow: boolean,
    awaitingConfirmResult: boolean,
    closingSoonTimeLeftText?: string,
  ): void;
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
  const statusIcon = el('span', 'checkin-status-icon');
  statusIcon.hidden = true;
  const statusText = el('span', 'checkin-status-text');
  statusRow.append(statusIcon, statusText);
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
    // C-01 (copy gate P2-X37): the dungeon name comes from `names.th.json` (`getDungeonFullName`),
    // never `copy.th.json` — `getCopyText(candidate.nameKey)` used to fall back to the raw
    // `dungeon.<id>` key because that key does not exist in `copy.th.json` at all.
    title.textContent = formatCopyText('dungeon.confirmTitle', {
      zoneName: getDungeonFullName(candidate.nameKey),
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
      // C-01: the short form (`nameReal` alone) — a card has no room for the full `{zoneName}`.
      card.textContent = getDungeonShortName(c.nameKey);
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

  /** Sets the row's text and its optional 48px icon (components.md 13.3) in one call, so every
   * call site below clears/sets both together rather than leaving a stale icon next to new text
   * (or vice versa). `iconId === undefined` hides the icon element entirely (text-only row). */
  function setStatusText(text: string, iconId: string | undefined): void {
    statusText.textContent = text;
    if (iconId === undefined) {
      statusIcon.hidden = true;
      return;
    }
    statusIcon.hidden = false;
    void deps.iconGlyph?.setIconGlyph(statusIcon, iconId, {
      altText: text,
      // Every id in `REASON_ICON_ID` (checkin-status.ts) is a plain outline glyph (tintable) whose
      // colour matches the row's own `ink.900` text (components.md 13.3 has no per-reason colour of
      // its own) — never a status colour (this row is a blocking condition, not a success/danger
      // state).
      colorCss: '#1A1A22',
      onNightBackground: false,
      nightPlateColorCss: '#FFFFFF',
    });
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
      setStatusText('', undefined);
      enterButton.disabled = true;
      enterButton.textContent = getCopyText('dungeon.confirmEnter');
      if (next.length === 1 && next[0] !== undefined) {
        renderHeader(next[0]);
      } else {
        renderOverlapCards();
      }
    },
    update(preview, isOutOfRangeNow, awaitingConfirmResult, closingSoonTimeLeftText) {
      // C-11: independent of check-in status — the closing-soon line is about opening hours, not
      // about whether the player can enter yet.
      closingSoon.hidden = closingSoonTimeLeftText === undefined;
      if (closingSoonTimeLeftText !== undefined) {
        closingSoon.textContent = formatCopyText('dungeon.closingSoonTag', {
          timeLeft: closingSoonTimeLeftText,
        });
      }
      if (awaitingConfirmResult) {
        enterButton.disabled = true;
        enterButton.classList.add('btn-spinner');
        return;
      }
      enterButton.classList.remove('btn-spinner');
      if (preview.ok) {
        setStatusText('', undefined);
        enterButton.disabled = selectedId === undefined;
        enterButton.textContent = getCopyText('dungeon.confirmEnter');
        enterButton.onclick = () => {
          if (selectedId !== undefined) deps.onEnter(selectedId);
        };
        return;
      }
      const view = checkInStatusView(preview, isOutOfRangeNow);
      setStatusText(
        view.countdownText === undefined
          ? getCopyText(view.copyKey)
          : formatCopyText(view.copyKey, { countdown: view.countdownText }),
        view.iconId,
      );
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
      setStatusText('', undefined);
      closingSoon.hidden = true;
      enterButton.hidden = true;
      enterButton.disabled = true;
      cancelButton.textContent = getCopyText('dungeon.closedDismiss');
    },
    showAlreadyActive() {
      setStatusText(getCopyText('dungeon.alreadyActive'), undefined);
      enterButton.disabled = true;
    },
    hide() {
      overlay.hidden = true;
      enterButton.hidden = false;
      cancelButton.textContent = getCopyText('dungeon.confirmCancel');
    },
  };
}
