/**
 * `home.recoveringLabel`/`home.recoveringDetail` (F06 copy gate C6-05; flow F06 Flow C ข้อ C7;
 * docs/tech/F06-hp-damage-onboarding.md 622): shown on *every* at-home screen (`S-06`/`S-07`/`S-08`
 * and `S-01-map` at the `near` state) while `PlayerView.recovering` is true — a top-of-screen
 * banner rather than folded into `home-panel.ts` alone, since the `near` state renders the plain
 * nav panel instead of the home panel and this must show there too (C6-05's own "รวมสถานะใกล้").
 *
 * `client ห้ามคำนวณเอง` (F06-R11): every number here (`recoverPct`, the minutes in `timeLeft`) is
 * `PlayerView.recoveryTo_pct`/`recoveryTimeLeft_ms` straight from `selectPlayerView`
 * (`@keep-walking/shared/session`) — this module only formats them for display.
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';

const MS_PER_MIN = 60_000;

export interface RecoveringView {
  readonly recovering: boolean;
  readonly recoveryTo_pct: number;
  /** `PlayerView.recoveryTimeLeft_ms` verbatim: `null` (not recovering, or unknown) and `0` (the
   * crossing already happened but `player_recovered` has not fired yet) both hide the banner —
   * `selectors.ts`'s own doc comment: "the client hides the line then, never shows 0 minutes". */
  readonly recoveryTimeLeft_ms: number | null;
}

export interface RecoveringBanner {
  readonly root: HTMLElement;
  render(view: RecoveringView): void;
  /** Same end state as `render({ recovering: false, ... })` — a plain shorthand for a caller (e.g.
   * every screen/overlay this banner must never show under) that has no `RecoveringView` at hand. */
  hide(): void;
}

export function mountRecoveringBanner(container: HTMLElement): RecoveringBanner {
  const root = document.createElement('div');
  root.className = 'banner info recovering-banner';
  root.hidden = true;

  const label = document.createElement('span');
  label.className = 'recovering-banner-label';
  const detail = document.createElement('span');
  detail.className = 'recovering-banner-detail';
  root.append(label, detail);
  container.append(root);

  return {
    root,
    render(view) {
      if (!view.recovering || view.recoveryTimeLeft_ms === null || view.recoveryTimeLeft_ms <= 0) {
        root.hidden = true;
        return;
      }
      root.hidden = false;
      label.textContent = getCopyText('home.recoveringLabel');
      const minutes = Math.max(1, Math.ceil(view.recoveryTimeLeft_ms / MS_PER_MIN));
      detail.textContent = formatCopyText('home.recoveringDetail', {
        recoverPct: view.recoveryTo_pct,
        timeLeft: formatCopyText('unit.minutes', { value: minutes }),
      });
    },
    hide() {
      root.hidden = true;
    },
  };
}
