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
import {
  tweenHpFill,
  setHpFillReduced,
  tweenHpEdgeMarker,
  setHpEdgeMarkerReduced,
  hardCutHpEdgeMarker,
} from '../../../../art/vfx/hp-bar/hp-bar';
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
  /** P2-H42 (visual gate V-39): the edge marker's own death hard-cut, mirroring `hardCutHpFill`'s
   * call on `fillElement` — the caller (`f04-app.ts`'s `run_death` handling) calls this alongside
   * `play('run.death', hpBar.fillElement)`, never on its own. */
  hardCutEdge(): void;
}

export function mountHpBar(container: HTMLElement): HpBar {
  const root = document.createElement('div');
  root.className = 'hp-bar';
  // V-46 (art/reviews/F04-F06-visual-gate.md §7.7, rolled into R2-2): a plain `<div>` defaults to
  // *not* hidden — every render path that owns this element while a run is active explicitly sets
  // `root.hidden = false` (`f04-app.ts#renderRun`), but the onboarding steps before a class is even
  // picked (`intro`/`age`/`consent`/`permission`/`class`) never touch it at all, since they return
  // before ever reaching `renderRun`. Defaulting to hidden here (mirroring every other screen this
  // module's siblings mount with, e.g. `ui/gps-ui.ts#el`) means "no run yet" is the honest starting
  // state instead of relying on one specific render branch to have run first.
  root.hidden = true;

  const track = document.createElement('div');
  track.className = 'hp-track';
  const fill = document.createElement('div');
  fill.className = 'hp-fill';
  // V-30 item 7 (art gate F04-F06 round 1, components.md 13.6): a *separate* element, never a
  // `.hp-fill::after` — the fill itself moves with `transform: scaleX()` (art/vfx/hp-bar/hp-bar.ts's
  // own DOM contract), which would squash a pseudo-element's width along with it. This marker
  // instead moves via `left` (a plain percentage of `.hp-track`'s own width, so it never needs to
  // know the track's real pixel size) driven from the exact same ratio the fill itself just
  // rendered — see `update()` below.
  const edgeMarker = document.createElement('div');
  edgeMarker.className = 'hp-fill-edge-marker';
  track.append(fill, edgeMarker);

  const percent = document.createElement('div');
  percent.className = 'hp-percent';

  const offBadge = document.createElement('div');
  // V-38 (uiux decision, components.md 6/9): reuses `.banner.warn` verbatim (surface + `state.danger`
  // border/text, 16px) rather than the chip-status shape — this sticky badge is the same "banner
  // that stays up while a safety setting is off" pattern components.md 9 already names, not a
  // dungeon-status chip.
  offBadge.className = 'banner warn auto-retreat-off-badge';
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
      const instantOrReduced = opts?.instant === true || prefersReducedMotion();
      // P2-H42 (visual gate V-39): a single synchronous `getBoundingClientRect().width` read per
      // update, not a per-frame layout query — `track` is already mounted (this module's own
      // `mountHpBar` appends it before `update()` can ever be called).
      const trackWidthPx = track.getBoundingClientRect().width;
      if (instantOrReduced || lastRatio === undefined) {
        setHpFillReduced(fill, toRatio);
        setHpEdgeMarkerReduced(edgeMarker, { toRatio, trackWidthPx });
      } else {
        tweenHpFill(fill, { fromRatio: lastRatio, toRatio });
        tweenHpEdgeMarker(edgeMarker, { fromRatio: lastRatio, toRatio, trackWidthPx });
      }
      lastRatio = toRatio;
      fill.classList.toggle('low', view.belowWarningLine);
      percent.textContent = percentText(view.hpRatio);
      offBadge.hidden = view.autoRetreatEnabled;
    },
    hardCutEdge() {
      hardCutHpEdgeMarker(edgeMarker, {
        toRatio: 0,
        trackWidthPx: track.getBoundingClientRect().width,
      });
    },
  };
}
