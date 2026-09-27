/**
 * Fire-together coordinator for one cue's visual + vibration + sound (`audio/cue-list.md` section
 * 4, `audio/direction.md` section 10's "ying every layer at once, never feature-detect then
 * switch"). There is no push channel in Phase 2 (that layer is Phase 8, cue-list.md's own
 * reference table), so a cue here is exactly three things: a toast/banner (visual), a
 * `navigator.vibrate` call, and an `Audio` playback.
 *
 * **This module stays thin on purpose — most of the work already exists:**
 * - The single-channel priority queue (hard-cut, FIFO-within-tier, staleness, the 4 safety cues
 *   that always win and are never dropped as stale) is `assets/audio.ts`'s `submitCue`/
 *   `advanceQueue` (P2-X21).
 * - `assets/audio-player.ts`'s `createAudioPlayer` (P2-F05-T10) already drives that queue end to
 *   end and already fires audio + vibration **together** for whichever cue the queue promotes to
 *   `playing` (its own `fire()`, called both from a fresh `submit()` and from a later `advance()`
 *   once a queued cue's turn comes) — so "safety cues always win" and "audio+vibration as one
 *   unit" are already solved; this file does not reimplement the queue or the audio/vibration
 *   pairing.
 *
 * What was still missing, and what this file adds:
 * 1. The **visual** leg of the same unit: `createAudioPlayer` has no notion of a toast/banner, so
 *    this wraps its `playUrl` dependency to also resolve the played URL back to a cue id (a tiny
 *    reverse lookup against the already-fetched manifest) and call the caller's `showVisual` for
 *    it — at exactly the instant the queue actually starts that cue, not at `submit()` time (a
 *    lower-priority cue may sit queued for a while first).
 * 2. `safeVibrate`: the cue-list 4.4 fallback for a missing `navigator.vibrate` (iOS Safari/
 *    WebKit) — "no special branch: fire visual + sound the same regardless, `vibrate()` itself
 *    silently no-ops". A device that never defines the function still needs a guard so calling it
 *    does not throw; this is that guard, nothing more (no threshold change, no auto-retreat
 *    change — F06-R15, NN-8).
 */
import { createAudioPlayer } from '../assets/audio-player';
import type { AudioPlayer, AudioPlayerDeps } from '../assets/audio-player';
import type { AssetRuntime } from '../assets/icon-dom';

/** Shaped like the real `Navigator`, injected so tests never touch a real device (ADR 0001 3.6) —
 * a small local type rather than importing `debug/vibrate.ts`'s: that folder is debug-only tooling
 * (HUD probes), production feedback code does not depend on it. */
export interface NavigatorWithVibrate {
  readonly vibrate?: (pattern: number | readonly number[]) => boolean;
}

/**
 * cue-list.md 4.4's fallback, made concrete: a device with no `navigator.vibrate` at all (its own
 * function, not merely one that returns `false`) gets a silent no-op instead of a `TypeError` —
 * every other layer (visual, sound) still fires exactly the same, because nothing here ever
 * branches on the result of this feature-detect before calling `showVisual`/`playUrl`.
 */
export function safeVibrate(
  nav: NavigatorWithVibrate,
): (pattern: number | readonly number[]) => void {
  if (typeof nav.vibrate !== 'function') return () => undefined;
  const vibrate = nav.vibrate;
  return (pattern) => {
    vibrate(pattern);
  };
}

export interface CueFeedbackDeps {
  readonly assets: AssetRuntime;
  readonly nav: NavigatorWithVibrate;
  /** Shows the cue's visual (toast/banner/overlay) as a unit with the audio/vibration this cue
   * fires — the caller's own dispatcher; this module only decides *when* (queue-driven), never
   * *what* it looks like (that stays copy/uiux's job, not this module's). */
  readonly showVisual: (cueId: string) => void;
  /** `new Audio(url).play()` (or equivalent), forwarded to `createAudioPlayer` unchanged. */
  readonly playUrl: (url: string) => void;
  readonly now: () => number;
  readonly setTimer: (run: () => void, delay_ms: number) => number;
  readonly clearTimer: (handle: number) => void;
}

export type CueFeedback = AudioPlayer;

/** `assets.getManifest()?.audio`'s reverse lookup by resolved URL (the URL is all `playUrl`
 * receives) — the manifest is small (audio/cue-list.md's own table lists under 20 cues) so a
 * linear scan every fire is cheap and needs no extra cache. */
function cueIdForUrl(assets: AssetRuntime, url: string): string | undefined {
  const audio = assets.getManifest()?.audio;
  if (audio === undefined) return undefined;
  for (const [cueId, cue] of Object.entries(audio)) {
    const cueUrl = cue['url'];
    if (typeof cueUrl === 'string' && assets.basePath + cueUrl === url) return cueId;
  }
  return undefined;
}

/**
 * The one thing this file builds: `createAudioPlayer` (queue + audio + vibration) wrapped so its
 * `playUrl` also fires the visual leg for the same cue, and its `vibrate` is `safeVibrate`-guarded.
 * The returned `submit` is `createAudioPlayer`'s own — this really is the whole coordinator.
 */
export function createCueFeedback(deps: CueFeedbackDeps): CueFeedback {
  const audioDeps: AudioPlayerDeps = {
    assets: deps.assets,
    vibrate: safeVibrate(deps.nav),
    now: deps.now,
    setTimer: deps.setTimer,
    clearTimer: deps.clearTimer,
    playUrl: (url) => {
      deps.playUrl(url);
      const cueId = cueIdForUrl(deps.assets, url);
      if (cueId !== undefined) deps.showVisual(cueId);
    },
  };
  return createAudioPlayer(audioDeps);
}
