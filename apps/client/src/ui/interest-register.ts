/**
 * `S-09-interest-register` (spec F06 R52 item 2/3, R53, D-126): a plain list, tap to select, one
 * confirm button. No free-text field anywhere in this module (R53) — the caller is the only source
 * of the option list (province scope: `home-panel.ts`'s own small stand-in list, see its own doc
 * comment; district scope: `copy/districts.ts#groupedSelectableDistricts`), so this module itself
 * never reads a data file and never invents a Thai label.
 *
 * Persists through `storage/interest.ts` (`kw.p2.interest`) — on-device only, no coordinates
 * (R53/D-088). `onConfirmed` is the caller's hook for `interest_registered_outside_area`
 * (`product/telemetry-events.md`); this module never calls the telemetry sink itself.
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';
import { saveInterest } from '../storage/interest';
import type { InterestRecord } from '../storage/interest';

export interface InterestOption {
  readonly id: string;
  readonly label: string;
}

export interface InterestOptionGroup {
  readonly groupKey: string;
  /** P2-H32: a real, already-resolved display heading for this group (e.g. a province name for a
   * district-scope group) — shown as an `.interest-group-heading` right above the group's own
   * options. `undefined`/empty (the province-scope caller's own single `'all'` group) renders no
   * heading at all, same as before this field existed — never a raw `groupKey` fallback (a bare
   * ISO/internal id is not Thai copy, CLAUDE.md). */
  readonly groupLabel?: string;
  readonly options: readonly InterestOption[];
}

export interface InterestRegisterDeps {
  readonly storage: KeyValueStorage;
  readonly now: () => number;
  readonly quotaDeps: QuotaFallbackDeps;
  readonly onConfirmed: (record: InterestRecord) => void;
  readonly onClose: () => void;
}

export interface InterestRegisterScreen {
  readonly root: HTMLElement;
  /** `groups` already grouped/sorted by the caller (never re-sorted here). */
  show(scope: 'district' | 'province', groups: readonly InterestOptionGroup[]): void;
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

export function mountInterestRegister(
  container: HTMLElement,
  deps: InterestRegisterDeps,
): InterestRegisterScreen {
  const root = el('div', 'screen interest-register');
  root.hidden = true;

  const title = document.createElement('h1');
  const list = el('div', 'interest-list');
  const confirmedLine = el('div', 'interest-confirmed-line');
  confirmedLine.hidden = true;
  const confirmButton = document.createElement('button');
  confirmButton.className = 'btn btn-primary interest-confirm';
  confirmButton.textContent = getCopyText('interest.confirm');
  confirmButton.disabled = true;
  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => deps.onClose());

  root.append(title, list, confirmedLine, confirmButton, closeButton);
  container.append(root);

  let currentScope: 'district' | 'province' = 'district';
  let selected: InterestOption | undefined;

  confirmButton.addEventListener('click', () => {
    if (selected === undefined) return;
    const record: InterestRecord = { schemaVersion: 1, scope: currentScope, areaId: selected.id };
    saveInterest(deps.storage, record, deps.now(), deps.quotaDeps);
    confirmedLine.hidden = false;
    confirmedLine.textContent = formatCopyText(
      currentScope === 'district' ? 'interest.confirmedArea' : 'interest.confirmed',
      currentScope === 'district' ? { areaName: selected.label } : { provinceName: selected.label },
    );
    deps.onConfirmed(record);
  });

  return {
    root,
    show(scope, groups) {
      currentScope = scope;
      selected = undefined;
      confirmButton.disabled = true;
      confirmedLine.hidden = true;
      title.textContent = getCopyText(
        scope === 'district' ? 'interest.areaTitle' : 'interest.title',
      );
      list.innerHTML = '';
      const empty = groups.every((g) => g.options.length === 0);
      if (empty) {
        const emptyLine = document.createElement('div');
        emptyLine.textContent = getCopyText(
          scope === 'district' ? 'interest.emptyArea' : 'interest.empty',
        );
        list.append(emptyLine);
      }
      for (const group of groups) {
        const groupEl = el('div', 'interest-group');
        groupEl.dataset['group'] = group.groupKey;
        if (group.groupLabel !== undefined && group.groupLabel.length > 0) {
          const heading = document.createElement('div');
          heading.className = 'interest-group-heading';
          heading.textContent = group.groupLabel;
          groupEl.append(heading);
        }
        for (const option of group.options) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn interest-option';
          button.textContent = option.label;
          button.addEventListener('click', () => {
            selected = option;
            confirmButton.disabled = false;
            for (const sibling of list.querySelectorAll('.interest-option')) {
              sibling.setAttribute('aria-pressed', 'false');
            }
            button.setAttribute('aria-pressed', 'true');
          });
          groupEl.append(button);
        }
        list.append(groupEl);
      }
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
