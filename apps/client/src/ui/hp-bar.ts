/**
 * The permanent HP bar (`design/ux/components.md` section 7, `.hp-track`/`.hp-fill`): visible on
 * `S-03-run` in every run status (including the pocket screen, which reads the same `.hp-fill`
 * through its own reduced markup) plus the `run.autoRetreatOffBadge` sticky badge (F06 flow C10)
 * that stays up the whole time auto-retreat is off, independent of HP.
 *
 * `client ห้ามคำนวณเอง` (F06-R11): every value this module renders is `RunView.hp`/`PlayerView`
 * straight from `@keep-walking/shared/session`'s `selectRunView`/`selectPlayerView` — this module
 * only tweens the *display* between two already-known ratios (`art/vfx/hp-bar/hp-bar.ts`), never
 * interpolates or guesses an intermediate value of its own.
 *
 * The percentage number next to the bar (components.md 7: "ตัวเลข % วางถัดจากแถบเสมอ") is a bare
 * numeral + "%", not a `copy.th.json` string — a unit symbol, not Thai prose (same category as the
 * bare "m"/"km" the design doc already renders through `unit.m`/`unit.km` templates elsewhere;
 * there is no dedicated `unit.percent` key, so this module composes the digits itself the same way
 * `type.numeric` tabular figures are meant to be read: as a number, not a sentence).
 */
import { tweenHpFill, setHpFillReduced } from '../../../../art/vfx/hp-bar/hp-bar';
import { prefersReducedMotion } from '../../../../art/vfx/core/vfx';
import { getCopyText } from '../copy/load';

export interface HpBarView {
  readonly hp: number;
  readonly maxHp: number;
  readonly hpRatio: number;
  readonly belowWarningLine: boolean;
  readonly autoRetreatEnabled: boolean;
}

const PERCENT_MULTIPLIER = 100;

function percentText(ratio: number): string {
  const pct = Math.max(0, Math.min(PERCENT_MULTIPLIER, Math.round(ratio * PERCENT_MULTIPLIER)));
  return `${pct}%`;
}

export interface HpBar {
  readonly root: HTMLElement;
  /** The `.hp-fill` element itself — the exact target `art/vfx/hp-critical.ts`'s `run.death`
   * effect expects (hard-cut + grayscale on the same node, hp-critical.ts's own DOM contract). */
  readonly fillElement: Element;
  /** Tweens (or reduced-motion snaps) from the last known ratio to `view`'s. `instant` skips the
   * tween (a fresh run start, or recovering from a freshly-loaded/rehydrated session — F06-R02
   * "ต่อเนื่องข้าม run" still shows the true value immediately rather than animating from 0). */
  update(view: HpBarView, opts?: { readonly instant?: boolean }): void;
}

export function mountHpBar(container: HTMLElement): HpBar {
  const root = document.createElement('div');
  root.className = 'hp-bar';

  const track = document.createElement('div');
  track.className = 'hp-track';
  const fill = document.createElement('div');
  fill.className = 'hp-fill';
  track.append(fill);

  const percent = document.createElement('div');
  percent.className = 'hp-percent';

  const offBadge = document.createElement('div');
  offBadge.className = 'chip-status auto-retreat-off-badge';
  offBadge.textContent = getCopyText('run.autoRetreatOffBadge');
  offBadge.hidden = true;

  root.append(track, percent, offBadge);
  container.append(root);

  let lastRatio: number | undefined;

  return {
    root,
    fillElement: fill,
    update(view, opts) {
      const toRatio = Math.max(0, Math.min(1, view.hpRatio));
      if (opts?.instant === true || lastRatio === undefined || prefersReducedMotion()) {
        setHpFillReduced(fill, toRatio);
      } else {
        tweenHpFill(fill, { fromRatio: lastRatio, toRatio });
      }
      lastRatio = toRatio;
      fill.classList.toggle('low', view.belowWarningLine);
      percent.textContent = percentText(view.hpRatio);
      offBadge.hidden = view.autoRetreatEnabled;
    },
  };
}
