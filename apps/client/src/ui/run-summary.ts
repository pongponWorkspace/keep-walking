/**
 * `S-04-run-summary` (F04 flow section 7): one header per `exit_reason`, the loot list (always
 * shown, never hidden by the exit reason itself — F05-R21 "ของในrun เก็บครบ" except `death`, which
 * empties the bag before this screen ever sees it, F06 scope), and the single full-width
 * `run.summaryContinue` button back to the map.
 *
 * Each loot row shows the resolved item name + rarity frame (P2-X21, `ui/item-line-view.ts`,
 * components.md 13.7) instead of the raw item id — the frame and the item glyph are two stacked
 * `<img>`s (`.item-icon-frame`/`.item-icon-glyph`, `app.css`), both optional: a manifest miss hides
 * the image and leaves the name-only text, never a broken image (asset-pipeline 10).
 */
import { getCopyText } from '../copy/load';
import type { RunSummary } from '@keep-walking/shared/session';
import { runSummaryHeaderKey } from './run-state-view';
import { itemLineView } from './item-line-view';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';

export interface RunSummaryScreen {
  readonly root: HTMLElement;
  show(summary: RunSummary): void;
  hide(): void;
}

export function mountRunSummary(
  container: HTMLElement,
  onContinue: () => void,
  assets: AssetRuntime,
): RunSummaryScreen {
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
        li.className = 'run-summary-reward-row';
        const view = itemLineView(item.id, item.qty);
        const iconWrap = document.createElement('span');
        iconWrap.className = 'item-icon-frame';
        const frameImg = document.createElement('img');
        frameImg.className = 'item-icon-frame-bg';
        const glyphImg = document.createElement('img');
        glyphImg.className = 'item-icon-glyph';
        setIconImg(frameImg, assets, view.frameIconId, '');
        setIconImg(glyphImg, assets, view.itemIconId, view.name);
        iconWrap.append(frameImg, glyphImg);
        const label = document.createElement('span');
        label.textContent = `${view.name} x${view.qty}`;
        li.append(iconWrap, label);
        rewardList.append(li);
      }
    },
    hide() {
      root.hidden = true;
    },
  };
}
