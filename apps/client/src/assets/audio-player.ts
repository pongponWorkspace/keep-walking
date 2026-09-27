/**
 * DOM-facing driver for the pure priority queue (`assets/audio.ts`, `audio/cue-list.md` section
 * 4): looks up a cue's metadata (`priority`, `durationMs`, `vibration_ms`, `url`) from the already
 * -fetched asset manifest (`docs/tech/asset-delivery.md` section 8), feeds it through `submitCue`,
 * and plays whatever the queue promotes to `playing` — one real playback call + one
 * `navigator.vibrate` call per cue, advanced by a real timer so a queued cue starts the instant
 * the previous one ends (`advanceQueue`).
 *
 * `assets/audio.ts`'s own header documents this module as the intended caller
 * ("assets/audio-player.ts (a thin DOM wrapper, not built by this task) would own the real
 * playback ... this lands the contract ahead of that build (P2-F05-T10)") — this is that build.
 *
 * A cue id the manifest does not know yet (fetch still in flight, or a genuine miss) is silently
 * dropped, same "never blocks gameplay" rule every other asset lookup in this app already follows
 * (icon.ts section 6.4, fonts.ts) — visual feedback (the toast/vfx effect) never depends on this
 * module succeeding (audio/cue-list.md 4.4: "visual เป็น baseline ที่การันตีเสมอ").
 */
import { submitCue, advanceQueue, EMPTY_QUEUE_STATE } from './audio';
import type { AudioQueueState } from './audio';
import type { AssetRuntime } from './icon-dom';

export interface AudioPlayerDeps {
  readonly assets: AssetRuntime;
  /** `navigator.vibrate` already bound by the caller — widened (vs. `F04AppDeps.vibrate`'s
   * original single-number signature) because every cue in `audio/manifest.json` carries
   * `vibration_ms` as an array, even a single-beat one. */
  readonly vibrate: (pattern_ms: number | readonly number[]) => void;
  /** `new Audio(url).play()` (or equivalent), injected so tests never touch a real element. */
  readonly playUrl: (url: string) => void;
  readonly now: () => number;
  readonly setTimer: (run: () => void, delay_ms: number) => number;
  readonly clearTimer: (handle: number) => void;
}

export interface AudioPlayer {
  /** Submits a cue by id (an `audio/manifest.json` entry) at `eventAt_ms` — staleness
   * (`audio/cue-list.md` 4.1 item 4) is measured from this instant, not from when `submit` itself
   * runs, so a cue built from a `SessionEvent`'s own `at_ms` stays honest even if the caller only
   * reacts to it a little later in the same frame. */
  submit(cueId: string, eventAt_ms: number): void;
}

interface CueMeta {
  readonly priority: number;
  readonly durationMs: number;
  readonly url: string;
  readonly vibration: readonly number[];
}

const UNKNOWN_CUE_PRIORITY = Number.MAX_SAFE_INTEGER;
const NO_DURATION_MS = 0;

function vibrationArrayOf(value: unknown): readonly number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number') ? value : [];
}

function cueMetaOf(assets: AssetRuntime, cueId: string): CueMeta | undefined {
  const cue = assets.getManifest()?.audio[cueId];
  if (cue === undefined) return undefined;
  const url = cue['url'];
  if (typeof url !== 'string') return undefined;
  const priority = cue['priority'];
  const durationMs = cue['durationMs'];
  return {
    priority: typeof priority === 'number' ? priority : UNKNOWN_CUE_PRIORITY,
    durationMs: typeof durationMs === 'number' ? durationMs : NO_DURATION_MS,
    url,
    vibration: vibrationArrayOf(cue['vibration_ms']),
  };
}

export function createAudioPlayer(deps: AudioPlayerDeps): AudioPlayer {
  let state: AudioQueueState = EMPTY_QUEUE_STATE;
  let timer: number | undefined;

  function fire(cueId: string, meta: CueMeta): void {
    deps.playUrl(deps.assets.basePath + meta.url);
    const first = meta.vibration[0];
    if (meta.vibration.length === 1 && first !== undefined) {
      deps.vibrate(first);
    } else if (meta.vibration.length > 0) {
      deps.vibrate(meta.vibration);
    }
    if (timer !== undefined) deps.clearTimer(timer);
    timer = deps.setTimer(advance, Math.max(NO_DURATION_MS, meta.durationMs));
  }

  function advance(): void {
    const result = advanceQueue(state, deps.now());
    state = result.state;
    if (result.toPlay === undefined) return;
    const meta = cueMetaOf(deps.assets, result.toPlay.cueId);
    // A cue that made it into the queue always had metadata at submit time; a manifest that
    // somehow disappears between submit and its turn (never happens in practice, `AssetRuntime`
    // never un-loads) just drops it silently, same rule as every other miss in this module.
    if (meta !== undefined) fire(result.toPlay.cueId, meta);
  }

  return {
    submit(cueId, eventAt_ms) {
      const meta = cueMetaOf(deps.assets, cueId);
      if (meta === undefined) return;
      const result = submitCue(
        state,
        { cueId, priority: meta.priority, eventAt_ms, durationMs: meta.durationMs },
        deps.now(),
      );
      state = result.state;
      if (result.action === 'play_now') fire(cueId, meta);
    },
  };
}
