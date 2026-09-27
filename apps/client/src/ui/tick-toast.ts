/**
 * `S-03-run` tick feedback toast (`design/ux/flows/F05-movement-gate-reward.md` Flow A):
 * granted/denied feedback for one reward-window decision, feeding the three channels the flow
 * requires — icon (loot rows, `assets/icon-dom.ts`), effect (`art/vfx` tick-feedback +
 * rarity-reveal, played on the real toast DOM), sound (`assets/audio-player.ts`'s priority queue).
 * Vibration rides along with the audio submit (the player's own job); this module never calls
 * `navigator.vibrate` directly.
 *
 * Never computes a reward: every field this module reads (`loot`, `firstEver`, `levelBefore/
 * After`) already comes straight off the `run_tick_granted`/`run_tick_denied` `SessionEvent`
 * (`@keep-walking/shared/session`) the caller (`f04-app.ts`) forwards verbatim.
 */
import { play } from '../../../../art/vfx/core/vfx';
import { exitToast } from '../../../../art/vfx/tick-feedback/tick-feedback';
// Side-effect import only: registers the 5 `drop.rarity.*` reveal effects this module plays on
// each loot icon (rarity-reveal.ts's own module-load `registerEffect` calls).
import '../../../../art/vfx/rarity-reveal/rarity-reveal';
import { getCopyText } from '../copy/load';
import { itemLineView, isKnownRarity, rarityRank } from './item-line-view';
import { buildItemIconElement } from './item-icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';
import type { AudioPlayer } from '../assets/audio-player';

export interface TickGrantedFeedback {
  readonly loot: readonly { readonly id: string; readonly qty: number }[];
  readonly firstEver: boolean;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly at_ms: number;
}

export interface TickDeniedFeedback {
  readonly at_ms: number;
}

export interface TickToastDeps {
  readonly assets: AssetRuntime;
  readonly audio: AudioPlayer;
  /** `client.json#toast.tickHoldDurationMs` — how long the toast stays fully visible before its
   * exit animation starts (not counting enter/exit themselves). */
  readonly holdDurationMs: number;
  /** `client.json#toast.tickMaxIconsShown` — flow F05 A1: "ไม่เกิน 3 ชิ้นที่เห็นพร้อมกัน ที่เหลือ
   * ดูในสรุป run". */
  readonly maxIconsShown: number;
}

export interface TickToast {
  showGranted(event: TickGrantedFeedback): void;
  showDenied(event: TickDeniedFeedback): void;
}

function highestKnownRarityCueId(
  loot: readonly { readonly id: string; readonly qty: number }[],
): string | undefined {
  let best: string | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const item of loot) {
    const rarity = itemLineView(item.id, item.qty).rarity;
    // Common has no `drop.rarity.common` audio cue (icon-grammar's animation is enough on its
    // own) — only Uncommon and above get the bonus chime (audio/manifest.json has no
    // `drop.rarity.common` entry either, so `audio.submit` would silently no-op for it anyway).
    if (rarity === undefined || rarity === 'common' || !isKnownRarity(rarity)) continue;
    const rank = rarityRank(rarity);
    if (rank < bestRank) {
      bestRank = rank;
      best = `drop.rarity.${rarity}`;
    }
  }
  return best;
}

export function mountTickToast(container: HTMLElement, deps: TickToastDeps): TickToast {
  let current: { readonly el: HTMLElement; timer: ReturnType<typeof setTimeout> } | undefined;

  function clearCurrent(): void {
    if (current === undefined) return;
    clearTimeout(current.timer);
    current.el.remove();
    current = undefined;
  }

  function mount(faded: boolean): HTMLElement {
    clearCurrent();
    const el = document.createElement('div');
    el.className = faded ? 'toast faded' : 'toast';
    container.append(el);
    return el;
  }

  function scheduleExit(el: HTMLElement): void {
    const timer = setTimeout(() => {
      void exitToast(el).finished.finally(() => {
        if (current?.el === el) current = undefined;
        el.remove();
      });
    }, deps.holdDurationMs);
    current = { el, timer };
  }

  return {
    showGranted(event) {
      const el = mount(false);
      const textKey = event.firstEver ? 'run.tickGrantedFirst' : 'run.tickGranted';
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = event.firstEver
        ? `${getCopyText('run.tickGrantedFirst')} ${getCopyText('run.continueCta')}`
        : getCopyText('run.tickGranted');
      el.append(line);

      if (event.loot.length > 0) {
        const row = document.createElement('div');
        row.className = 'toast-loot-row';
        const sorted = [...event.loot].sort(
          (a, b) => rarityRank(itemLineView(a.id, a.qty).rarity) - rarityRank(itemLineView(b.id, b.qty).rarity),
        );
        for (const item of sorted.slice(0, deps.maxIconsShown)) {
          const view = itemLineView(item.id, item.qty);
          const iconEl = buildItemIconElement(deps.assets, view);
          row.append(iconEl);
          if (isKnownRarity(view.rarity)) {
            void play(`drop.rarity.${view.rarity}`, iconEl);
          }
        }
        el.append(row);
      }

      if (event.levelAfter > event.levelBefore) {
        const levelUp = document.createElement('div');
        levelUp.className = 'toast-line toast-level-up';
        levelUp.textContent = getCopyText('run.levelUp');
        el.append(levelUp);
        void play('run.levelUp', levelUp);
      }

      void play(textKey, el);
      deps.audio.submit(textKey, event.at_ms);
      const bonusCue = highestKnownRarityCueId(event.loot);
      if (bonusCue !== undefined) deps.audio.submit(bonusCue, event.at_ms);

      scheduleExit(el);
    },
    showDenied(event) {
      const el = mount(true);
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = getCopyText('run.tickDenied');
      el.append(line);
      void play('run.tickDenied', el);
      deps.audio.submit('run.tickDenied', event.at_ms);
      scheduleExit(el);
    },
  };
}
