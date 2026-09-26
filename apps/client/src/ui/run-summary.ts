/**
 * `S-04-run-summary` (F04 flow section 7): one header per `exit_reason`, the loot list (always
 * shown, never hidden by the exit reason itself — F05-R21 "ของในrun เก็บครบ" except `death`, which
 * empties the bag before this screen ever sees it, F06 scope), and the single full-width
 * `run.summaryContinue` button back to the map.
 */
import { getCopyText } from '../copy/load';
import type { RunSummary } from '@keep-walking/shared/session';
import { runSummaryHeaderKey } from './run-state-view';

export interface RunSummaryScreen {
  readonly root: HTMLElement;
  show(summary: RunSummary): void;
  hide(): void;
}

export function mountRunSummary(container: HTMLElement, onContinue: () => void): RunSummaryScreen {
  const root = document.createElement('div');
  root.className = 'screen run-summary';
  root.hidden = true;
  const header = document.createElement('div');
  header.className = 'run-summary-header';
  const rewardList = document.createElement('ul');
  rewardList.className = 'run-summary-rewards';
  const continueButton = document.createElement('button');
  continueButton.className = 'btn btn-primary btn-fullwidth-bottom';
  continueButton.textContent = getCopyText('run.summaryContinue');
  continueButton.addEventListener('click', () => onContinue());
  root.append(header, rewardList, continueButton);
  container.append(root);

  return {
    root,
    show(summary) {
      root.hidden = false;
      header.textContent = getCopyText(runSummaryHeaderKey(summary.exitReason));
      rewardList.innerHTML = '';
      if (summary.loot.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = getCopyText(
          summary.exitReason === 'death' ? 'run.summaryRewardLost' : 'run.summaryRewardEmpty',
        );
        rewardList.append(empty);
        return;
      }
      for (const item of summary.loot) {
        const li = document.createElement('li');
        // TODO(follow-up, art/narrative): resolve `item.id` to its `names.th.json` item name +
        // rarity frame/icon (components.md 13.7) once that lookup table is wired here; the raw id
        // is an honest placeholder, never invented Thai text (CLAUDE.md).
        li.textContent = `${item.id} x${item.qty}`;
        rewardList.append(li);
      }
    },
    hide() {
      root.hidden = true;
    },
  };
}
