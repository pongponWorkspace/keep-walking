/**
 * `S-03-run`'s pocket screen (`design/ux/components.md` section 12, design gate A 4.4 direction A)
 * plus the two things that share its on/off state with the caller: the `[run.pocketEnterButton]`
 * re-entry button that appears on the *normal* run screen once the player has swiped out (12.1's
 * "กลับเข้าจอพกกระเป๋า" row), and the one-time Path-B fallback toast (`run.screenLockNotice`, 12.3).
 * All DOM glue (not unit-tested at the Vitest level beyond the pure gesture check below — same
 * convention as `ui/gps-ui.ts`/`ui/nav-panel.ts`; covered by e2e).
 *
 * The 8 rules of design gate A 4.4 this component is responsible for (the rest are the caller's,
 * `f04-app.ts`'s own doc comment on its Wake Lock wiring names which):
 * 1. `showOverlay()`/`hideOverlay()` are pure toggles the caller drives (right after the tutorial
 *    line hides, or immediately once `first_reward` is already granted) — this module never
 *    decides *when* to enter on its own.
 * 2. No button anywhere on `overlayRoot` — the only way out is `shouldTriggerPocketExit`'s gesture
 *    (a real swipe up, then a hold), long/far enough that an accidental brush in a pocket cannot
 *    trigger it.
 * 5. `showFallbackNoticeOnce()` is a true once-per-device gate (persisted flag), for Path B.
 * 6/4/3 are the caller's own `WakeLockController` wiring, not this module's concern.
 * 7. The toggle itself is `settings-walking-safety.ts`'s row; this module only reads
 *    `pocketScreenPrefEnabled` indirectly (the caller passes the resulting boolean in).
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { KeyValueStorage } from '../storage/local-store';

const PERCENT_MULTIPLIER = 100;

/** Same clamp+round `hp-bar.ts#percentText` uses, kept as a plain number here (not a "N%" string)
 * because `[run.pocketHp]`'s own Thai template already carries the literal `%` sign
 * ("HP {hpPct}%") — F06-R11: still just a display rounding of `RunView.hp.hpRatio`, never a
 * client-decided HP value. */
function hpPercent(hpRatio: number): number {
  return Math.max(0, Math.min(PERCENT_MULTIPLIER, Math.round(hpRatio * PERCENT_MULTIPLIER)));
}

const POCKET_WAKE_HINT_SHOWN_KEY = 'kw.p2.settings.pocketWakeHintShown';
const SCREEN_LOCK_NOTICE_SHOWN_KEY = 'kw.p2.settings.screenLockNoticeShown';
const SHOWN_VALUE = '1';

/** Already resolved to real px (`PocketScreenGestureConfig`, below, is the config-facing,
 * viewport-ratio-based shape `mountPocketScreen` actually receives and resolves once at mount). */
export interface PocketGestureConfig {
  /** `config: client.pocketScreen.swipeUpHoldMinDuration_ms` — components.md 12.1's own "นานพอกัน
   * ปัดผ่านโดยบังเอิญ" (long enough that an accidental brush cannot trigger it). */
  readonly swipeUpHoldMinDuration_ms: number;
  /** The *swipe* half of "ปัดขึ้นค้าง": a long press with no upward movement at all must not exit
   * either. */
  readonly swipeUpMinDistance_px: number;
}

/**
 * Pure gesture check (unit-tested below): `startY`/`endY` are pointer Y coordinates (CSS px, "up"
 * is a smaller Y in DOM coordinates), `heldForMs` is `now() - pointerdown time` at the moment the
 * hold-duration timer fires (the pointer must still be down then — the DOM glue only calls this
 * once, at that instant, never on every `pointermove`).
 */
export function shouldTriggerPocketExit(
  startY: number,
  endY: number,
  heldForMs: number,
  config: PocketGestureConfig,
): boolean {
  if (heldForMs < config.swipeUpHoldMinDuration_ms) return false;
  const upwardDistance_px = startY - endY;
  return upwardDistance_px >= config.swipeUpMinDistance_px;
}

/** `config: client.pocketScreen` as `config/runtime.ts#PocketScreenConfig` actually stores it: a
 * viewport-relative ratio, not a fixed px count (config-lint's 3.10.3 unit table has no `_px`
 * entry, and a ratio is the more correct choice for a real range of device screen sizes anyway) --
 * resolved to real px against `window.innerHeight` once, at mount time, below. */
export interface PocketScreenGestureConfig {
  readonly swipeUpHoldMinDuration_ms: number;
  readonly swipeUpMinDistanceRatio: number;
}

export interface PocketScreenDeps {
  readonly storage: KeyValueStorage;
  readonly now: () => number;
  readonly setTimer: (run: () => void, delay_ms: number) => number;
  readonly clearTimer: (handle: number) => void;
  readonly gesture: PocketScreenGestureConfig;
  /** `config: client.toast.screenLockNoticeHoldDurationMs` (F06 copy gate C6-03, flow F06 Flow E
   * ข้อ E2): how long `run.screenLockNotice` stays up before fading itself, independent of the
   * gesture's own `setTimer`/`clearTimer` pair above (a different timer, a different purpose). */
  readonly screenLockNoticeHoldDurationMs: number;
  /** The swipe-up-hold gesture completed on `overlayRoot` — the caller hides the overlay and shows
   * the re-entry button (never automatic on this module's own timer). */
  readonly onExit: () => void;
  /** `[run.pocketEnterButton]` tapped — the caller shows the overlay again. */
  readonly onEnterRequested: () => void;
}

export interface PocketScreen {
  readonly overlayRoot: HTMLElement;
  readonly enterButtonRoot: HTMLElement;
  showOverlay(): void;
  hideOverlay(): void;
  showEnterButton(): void;
  hideEnterButton(): void;
  /** `RunView.hp.hpRatio` (F06-R11: engine-decided, this module only rounds it for display, same
   * clamp+round `ui/hp-bar.ts#percentText` uses). */
  setHp(hpRatio: number): void;
  /** `[run.pocketNextTick]`'s own `{timeLeft}` — `undefined` while paused (Grace/Suspended), same
   * shape as `RunBar.setTick`. */
  setTick(timeLeft: string | undefined): void;
  /** Path B (12.3): once per device, ever. Safe to call every time a run starts with Wake Lock
   * unsupported/denied — only the first call in this device's lifetime actually shows anything.
   * Fades itself after `screenLockNoticeHoldDurationMs` (F06 copy gate C6-03). */
  showFallbackNoticeOnce(): void;
  /** `dungeon_exited` (F06 copy gate C6-03, flow F06 Flow E ข้อ E2): hides `run.screenLockNotice`
   * immediately, whether or not its own auto-fade timer has fired yet — never carried across into
   * the next run. A no-op when the notice is not showing. */
  hideFallbackNotice(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountPocketScreen(container: HTMLElement, deps: PocketScreenDeps): PocketScreen {
  // --- The dark overlay itself (12.1) ---
  const overlayRoot = el('div', 'pocket-screen');
  overlayRoot.hidden = true;
  const hp = el('div', 'pocket-screen-hp');
  const tick = el('div', 'pocket-screen-tick');
  const counting = el('div', 'pocket-screen-counting');
  counting.textContent = getCopyText('run.pocketCounting');
  const wakeHint = el('div', 'pocket-screen-wake-hint');
  wakeHint.hidden = true;
  wakeHint.textContent = getCopyText('run.pocketWakeHint');
  overlayRoot.append(hp, tick, counting, wakeHint);
  container.append(overlayRoot);

  // --- The re-entry button, lives on the normal run screen (12.1's "กลับเข้าจอพกกระเป๋า") ---
  const enterButtonRoot = el('button', 'btn btn-secondary pocket-enter-button');
  enterButtonRoot.hidden = true;
  enterButtonRoot.textContent = getCopyText('run.pocketEnterButton');
  enterButtonRoot.addEventListener('click', () => deps.onEnterRequested());
  container.append(enterButtonRoot);

  // --- Path B fallback toast (12.3), a plain one-time banner — no queue/priority needed, it fires
  // at most once per device in the device's whole lifetime. ---
  const fallbackToast = el('div', 'toast neutral pocket-screen-lock-notice');
  fallbackToast.hidden = true;
  fallbackToast.textContent = getCopyText('run.screenLockNotice');
  container.append(fallbackToast);

  // --- Swipe-up-hold exit gesture (rule 2) ---
  // D-134's own condition (P2-F06-T20 6.1, tech note F06 8.5, F06-TG-13 item ก): resolved fresh at
  // *every* `pointerdown`, against the real viewport (`window.innerHeight` -- the same global other
  // DOM-glue modules in this file already read directly, e.g. `document.createElement` above), not
  // once at mount time — mounting while the phone happens to be landscape (or a mobile browser's own
  // chrome expanding/collapsing between gestures) would otherwise leave a stale, wrong-proportion
  // threshold cached for the rest of the run. The resolved px value is still fixed for the duration
  // of one gesture (never recomputed mid-swipe on `pointermove`).
  let pointerId: number | undefined;
  let startY = 0;
  let startedAt_ms = 0;
  let lastY = 0;
  let holdTimer: number | undefined;
  let gestureConfig: PocketGestureConfig | undefined;
  // F06 copy gate C6-03: the fallback toast's own auto-fade timer, independent of the gesture's
  // `holdTimer` above (a different clock, a different purpose).
  let fallbackToastTimer: number | undefined;

  function clearGesture(): void {
    if (holdTimer !== undefined) {
      deps.clearTimer(holdTimer);
      holdTimer = undefined;
    }
    pointerId = undefined;
    gestureConfig = undefined;
  }

  overlayRoot.addEventListener('pointerdown', (e) => {
    if (pointerId !== undefined) return; // one gesture at a time
    pointerId = e.pointerId;
    startY = e.clientY;
    lastY = e.clientY;
    startedAt_ms = deps.now();
    gestureConfig = {
      swipeUpHoldMinDuration_ms: deps.gesture.swipeUpHoldMinDuration_ms,
      swipeUpMinDistance_px: Math.round(window.innerHeight * deps.gesture.swipeUpMinDistanceRatio),
    };
    holdTimer = deps.setTimer(() => {
      if (pointerId === e.pointerId && gestureConfig !== undefined) {
        const heldForMs = deps.now() - startedAt_ms;
        if (shouldTriggerPocketExit(startY, lastY, heldForMs, gestureConfig)) {
          clearGesture();
          deps.onExit();
        }
      }
    }, gestureConfig.swipeUpHoldMinDuration_ms);
  });
  overlayRoot.addEventListener('pointermove', (e) => {
    if (e.pointerId === pointerId) lastY = e.clientY;
  });
  overlayRoot.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointerId) clearGesture();
  });
  overlayRoot.addEventListener('pointercancel', (e) => {
    if (e.pointerId === pointerId) clearGesture();
  });

  return {
    overlayRoot,
    enterButtonRoot,
    showOverlay() {
      overlayRoot.hidden = false;
      enterButtonRoot.hidden = true;
      if (deps.storage.getItem(POCKET_WAKE_HINT_SHOWN_KEY) !== SHOWN_VALUE) {
        wakeHint.hidden = false;
        deps.storage.setItem(POCKET_WAKE_HINT_SHOWN_KEY, SHOWN_VALUE);
      } else {
        wakeHint.hidden = true;
      }
    },
    hideOverlay() {
      overlayRoot.hidden = true;
      clearGesture();
    },
    showEnterButton() {
      enterButtonRoot.hidden = false;
    },
    hideEnterButton() {
      enterButtonRoot.hidden = true;
    },
    setHp(hpRatio) {
      hp.textContent = formatCopyText('run.pocketHp', { hpPct: hpPercent(hpRatio) });
    },
    setTick(timeLeft) {
      tick.textContent =
        timeLeft === undefined
          ? getCopyText('run.tickPausedLabel')
          : formatCopyText('run.pocketNextTick', { timeLeft });
    },
    showFallbackNoticeOnce() {
      if (deps.storage.getItem(SCREEN_LOCK_NOTICE_SHOWN_KEY) === SHOWN_VALUE) return;
      deps.storage.setItem(SCREEN_LOCK_NOTICE_SHOWN_KEY, SHOWN_VALUE);
      fallbackToast.hidden = false;
      if (fallbackToastTimer !== undefined) deps.clearTimer(fallbackToastTimer);
      fallbackToastTimer = deps.setTimer(() => {
        fallbackToastTimer = undefined;
        fallbackToast.hidden = true;
      }, deps.screenLockNoticeHoldDurationMs);
    },
    hideFallbackNotice() {
      if (fallbackToastTimer !== undefined) {
        deps.clearTimer(fallbackToastTimer);
        fallbackToastTimer = undefined;
      }
      fallbackToast.hidden = true;
    },
  };
}
