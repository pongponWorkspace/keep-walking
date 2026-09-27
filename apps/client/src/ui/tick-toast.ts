/**
 * `S-03-run`'s one bottom-toast slot (`design/ux/flows/F05-movement-gate-reward.md` Flow A;
 * `design/ux/flows/F06-hp-damage-onboarding.md` Flow C, art/vfx/specs/hp-critical.md §6.1):
 * granted/denied tick feedback plus the F06 HP-low warning, feeding the three channels every one
 * of these moments needs — icon (loot rows, `assets/icon-dom.ts`), effect (`art/vfx`
 * tick-feedback/rarity-reveal/hp-critical, played on the real toast DOM), sound
 * (`assets/audio-player.ts`'s priority queue). Vibration rides along with the audio submit (the
 * cue's own `vibration_ms`, `audio/manifest.json`); this module never calls `navigator.vibrate`
 * directly. One mutable slot (`mount()`/`clearCurrent()`): a new toast always replaces whatever
 * was showing, matching the flow's "ทับเดียว" rule (F06-R16: HP-low and auto-retreat firing
 * together shows only the auto-retreat signal, never two stacked toasts).
 *
 * Never computes a reward or an HP value: every field this module reads (`loot`, `firstEver`,
 * `levelBefore/After` for ticks; nothing at all for HP-low, which has no variables in its canon
 * copy) already comes straight off a `SessionEvent` (`@keep-walking/shared/session`) the caller
 * (`f04-app.ts`) forwards verbatim.
 */
import { play } from '../../../../art/vfx/core/vfx';
import { exitToast } from '../../../../art/vfx/tick-feedback/tick-feedback';
// Side-effect import only: registers the 5 `drop.rarity.*` reveal effects this module plays on
// each loot icon (rarity-reveal.ts's own module-load `registerEffect` calls).
import '../../../../art/vfx/rarity-reveal/rarity-reveal';
// Side-effect import: registers `run.hpLow`/`run.autoRetreat`/`run.death` (only `run.hpLow` is
// played on this toast's own root; the other two target different elements, `f04-app.ts` calls
// `play()` for those directly on the run-bar/HP-fill elements it owns).
import '../../../../art/vfx/hp-critical/hp-critical';
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
  /** `client.json#toast.hpLowHoldDurationMs` (F06-R14): `run.hpLow`'s canon sentence is much
   * longer than a tick toast's, so it gets its own, longer hold time rather than reusing
   * `holdDurationMs`. */
  readonly hpLowHoldDurationMs: number;
}

export interface TickToast {
  showGranted(event: TickGrantedFeedback): void;
  showDenied(event: TickDeniedFeedback): void;
  /** F06-R14 (Flow C2): HP crossed under `lowHpWarningThreshold_pct` this hit. Fires the 3-pulse
   * `run.hpLow` effect + its cue (vibration rides along, `audio/manifest.json`) on the same one
   * toast slot every other toast here shares — never stacked with a tick toast that happens to be
   * showing (F06-R16's "one signal only" rule covers `run.hpLow` vs `run.autoRetreat`; a tick
   * toast losing its own few remaining ms of hold time to a safety toast is an acceptable,
   * intentional trade the shared single slot already makes). */
  showHpLow(atMs: number): void;
  /** F06-R12: the engine auto-drank a potion this hit. `itemId` is already the exact enum id
   * `run.autoPotionUsed`'s telemetry uses (`hpSmall`/`hpMedium`/`hpLarge`) — display text needs no
   * item name here (flow F05 A1 gives this toast one fixed line, `run.autoPotionUsed`, no
   * `{itemId}` variable), so the id is unused for text and kept only for a future icon-per-size
   * pass (art brief 3.8) without a second call-site change. */
  showAutoPotionUsed(itemId: string, atMs: number): void;
  /** C-12 (copy gate P2-X37): a short confirmation toast when the run returns from Grace/Suspended
   * back to Active (`run_state_changed`, `cause: 'returned'`) — no audio cue is specified for this
   * one (a quieter, purely visual confirmation, unlike the tick/HP-low cues above). */
  showStateResumed(atMs: number): void;
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

  function scheduleExit(el: HTMLElement, holdMs: number): void {
    const timer = setTimeout(() => {
      void exitToast(el).finished.finally(() => {
        if (current?.el === el) current = undefined;
        el.remove();
      });
    }, holdMs);
    current = { el, timer };
  }

  return {
    showGranted(event) {
      const el = mount(false);
      const textKey = event.firstEver ? 'run.tickGrantedFirst' : 'run.tickGranted';
      // F05-N1 (copy gate P2-X37): `run.tickGrantedFirst` and `run.continueCta` are two separate
      // elements/lines, not one line joined by a space — lets a narrow viewport wrap each key on
      // its own terms instead of an arbitrary mid-sentence break.
      if (event.firstEver) {
        const firstLine = document.createElement('div');
        firstLine.className = 'toast-line';
        firstLine.textContent = getCopyText('run.tickGrantedFirst');
        el.append(firstLine);
        const continueLine = document.createElement('div');
        continueLine.className = 'toast-line toast-continue-cta';
        continueLine.textContent = getCopyText('run.continueCta');
        el.append(continueLine);
      } else {
        const line = document.createElement('div');
        line.className = 'toast-line';
        line.textContent = getCopyText('run.tickGranted');
        el.append(line);
      }

      if (event.loot.length > 0) {
        const row = document.createElement('div');
        row.className = 'toast-loot-row';
        const sorted = [...event.loot].sort(
          (a, b) =>
            rarityRank(itemLineView(a.id, a.qty).rarity) -
            rarityRank(itemLineView(b.id, b.qty).rarity),
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

      scheduleExit(el, deps.holdDurationMs);
    },
    showDenied(event) {
      const el = mount(true);
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = getCopyText('run.tickDenied');
      el.append(line);
      void play('run.tickDenied', el);
      deps.audio.submit('run.tickDenied', event.at_ms);
      scheduleExit(el, deps.holdDurationMs);
    },
    showHpLow(atMs) {
      const el = mount(false);
      el.classList.add('danger');
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = getCopyText('run.hpLow');
      el.append(line);
      void play('run.hpLow', el);
      deps.audio.submit('run.hpLow', atMs);
      scheduleExit(el, deps.hpLowHoldDurationMs);
    },
    showAutoPotionUsed(itemId, atMs) {
      const el = mount(true);
      el.dataset['itemId'] = itemId;
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = getCopyText('run.autoPotionUsed');
      el.append(line);
      deps.audio.submit('run.autoPotionUsed', atMs);
      scheduleExit(el, deps.holdDurationMs);
    },
    showStateResumed() {
      const el = mount(true);
      const line = document.createElement('div');
      line.className = 'toast-line';
      line.textContent = getCopyText('run.stateResumed');
      el.append(line);
      scheduleExit(el, deps.holdDurationMs);
    },
  };
}
