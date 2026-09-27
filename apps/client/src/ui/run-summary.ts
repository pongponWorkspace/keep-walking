/**
 * `S-04-run-summary` (F04 flow section 7 owns the header per `exit_reason`; `design/ux/flows/
 * F05-movement-gate-reward.md` Flow B owns everything under it, for every `exit_reason`):
 *
 * header -> canon line (`death`/`auto_retreat` only, GD B-01) -> `diedBody` (death only, N-14) ->
 * exp row (B2, always) -> tick row (B3, always) -> loot list (B1, grouped/sorted Legendary ->
 * Common; always the empty-lost label on death, F05-R26) -> the one `run.summaryContinue` button.
 * This exact order (canon -> diedBody -> exp/tick -> loot) matches the approved wireframe frame
 * C6 confirmation in the flow doc's section 10 (R2-F1).
 *
 * Each loot row shows the resolved item name + rarity frame (P2-X21, `ui/item-line-view.ts`,
 * components.md 13.7) instead of the raw item id — the frame and the item glyph are two stacked
 * `<img>`s (`item-icon-dom.ts`), both optional: a manifest miss hides the image and leaves the
 * name-only text, never a broken image (asset-pipeline 10).
 */
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import type { RunSummary } from '@keep-walking/shared/session';
import { runSummaryHeaderKey } from './run-state-view';
import { itemLineView, rarityRank } from './item-line-view';
import { buildItemIconElement } from './item-icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';

export interface RunSummaryDeps {
  readonly assets: AssetRuntime;
  /** `config: dungeons.hpSafety.autoRetreatThreshold_pct` — the canon `run.autoRetreat` line's
   * `{autoRetreatPct}` variable (Flow B5). Never hardcoded (CLAUDE.md non-negotiable 3). */
  readonly autoRetreatThresholdPct: number;
}

export interface RunSummaryScreen {
  readonly root: HTMLElement;
  show(summary: RunSummary): void;
  hide(): void;
}

function emptyRow(text: string): HTMLLIElement {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}

function rewardRow(
  assets: AssetRuntime,
  item: { readonly id: string; readonly qty: number },
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'run-summary-reward-row';
  const view = itemLineView(item.id, item.qty);
  const iconEl = buildItemIconElement(assets, view);
  const label = document.createElement('span');
  label.textContent = `${view.name} x${view.qty}`;
  li.append(iconEl, label);
  return li;
}

export function mountRunSummary(
  container: HTMLElement,
  onContinue: () => void,
  deps: RunSummaryDeps,
): RunSummaryScreen {
  const root = document.createElement('div');
  root.className = 'screen run-summary';
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'run-summary-header';
  // Flow B4/B5: the canon GDD line (`run.death`/`run.autoRetreat`, verbatim — GD B-01) plus its
  // death-only explanatory body (`run.summary.diedBody`, N-14). Both hidden for every other
  // `exit_reason` (Flow B6: no extra line, F04's header already says enough).
  const canonLine = document.createElement('div');
  canonLine.className = 'run-summary-canon';
  const bodyLine = document.createElement('div');
  bodyLine.className = 'run-summary-body';
  const expRow = document.createElement('div');
  expRow.className = 'run-summary-exp-row';
  const tickRow = document.createElement('div');
  tickRow.className = 'run-summary-tick-row';
  const rewardList = document.createElement('ul');
  rewardList.className = 'run-summary-rewards';
  const continueButton = document.createElement('button');
  continueButton.className = 'btn btn-primary btn-fullwidth-bottom';
  continueButton.textContent = getCopyText('run.summaryContinue');
  continueButton.addEventListener('click', () => onContinue());

  root.append(header, canonLine, bodyLine, expRow, tickRow, rewardList, continueButton);
  container.append(root);

  return {
    root,
    show(summary) {
      root.hidden = false;
      header.textContent = getCopyText(runSummaryHeaderKey(summary.exitReason));

      if (summary.exitReason === 'death') {
        canonLine.hidden = false;
        canonLine.textContent = getCopyText('run.death');
        bodyLine.hidden = false;
        bodyLine.textContent = getCopyText('run.summary.diedBody');
      } else if (summary.exitReason === 'auto_retreat') {
        canonLine.hidden = false;
        canonLine.textContent = formatCopyText('run.autoRetreat', {
          autoRetreatPct: deps.autoRetreatThresholdPct,
        });
        bodyLine.hidden = true;
      } else {
        canonLine.hidden = true;
        bodyLine.hidden = true;
      }

      // Flow B2/B3: engine numbers only, shown for every `exit_reason` including `death` (N-06 —
      // never replaced by `diedBody`, both appear).
      expRow.textContent = formatCopyText('run.summaryExpGained', { expAmount: summary.expGained });
      if (summary.levelsGained > 0) {
        expRow.textContent = `${expRow.textContent} ${getCopyText('run.levelUp')}`;
      }
      tickRow.textContent = formatCopyText('run.summaryTickCount', {
        passedCount: summary.ticksGranted,
        evaluatedCount: summary.ticksEvaluated,
      });
      if (summary.partialTick?.granted === true) {
        tickRow.textContent = `${tickRow.textContent} ${getCopyText('run.summaryTickPartialNote')}`;
      }

      // Flow B1: grouped by rarity, Legendary -> Common. `death` always shows the empty-lost
      // label (F05-R26) rather than reading `summary.loot` — the engine's own contract already
      // empties it on death (`dungeons.death.loseAllRunLoot`), but the UI states the rule directly
      // rather than depending on that being true every time.
      rewardList.innerHTML = '';
      if (summary.exitReason === 'death') {
        rewardList.append(emptyRow(getCopyText('run.summaryRewardLost')));
      } else if (summary.loot.length === 0) {
        rewardList.append(emptyRow(getCopyText('run.summaryRewardEmpty')));
      } else {
        const sorted = [...summary.loot].sort(
          (a, b) =>
            rarityRank(itemLineView(a.id, a.qty).rarity) -
            rarityRank(itemLineView(b.id, b.qty).rarity),
        );
        for (const item of sorted) {
          rewardList.append(rewardRow(deps.assets, item));
        }
      }
    },
    hide() {
      root.hidden = true;
    },
  };
}
