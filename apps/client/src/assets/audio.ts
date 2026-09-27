/**
 * The one audio + vibration priority queue every cue shares (`audio/cue-list.md` section 4,
 * `docs/tech/asset-delivery.md` section 8): a single channel, never a mixer — a lower `priority`
 * number hard-cuts whatever is playing and plays immediately; an equal priority enqueues FIFO; a
 * higher (less urgent) priority enqueues behind it; anything not a safety cue that has waited past
 * `staleAfter_ms` since its own event time is dropped instead of playing late. The 4 safety cues
 * (`run.death`, `run.autoRetreat`, `run.hpLow`, `anticheat.speedLock`) never get dropped as stale
 * (cue-list.md 4.1/4.2).
 *
 * This module is the pure decision core only — no `Audio`/`navigator.vibrate` here, so it is
 * unit-testable with a fake clock. `assets/audio-player.ts` (a thin DOM wrapper, not built by this
 * task) would own the real playback; today's client has no reward-tick UI yet to drive it from
 * (P2-F05-T10), so nothing calls `submit` in production code yet — this lands the contract ahead
 * of that build (handoff, this task's REPORT).
 */

export const SAFETY_CUE_IDS: ReadonlySet<string> = new Set([
  'run.death',
  'run.autoRetreat',
  'run.hpLow',
  'anticheat.speedLock',
]);

export const DEFAULT_STALE_AFTER_MS = 2000;

export interface CueRequest {
  readonly cueId: string;
  readonly priority: number;
  /** When the game event actually happened — staleness is measured from here, not from when it
   * reached the queue (cue-list.md 4.1 item 4). */
  readonly eventAt_ms: number;
  readonly durationMs: number;
}

interface QueuedItem extends CueRequest {
  readonly enqueuedAt_ms: number;
}

export interface AudioQueueState {
  readonly playing: (QueuedItem & { readonly endsAt_ms: number }) | undefined;
  readonly pending: readonly QueuedItem[];
}

export const EMPTY_QUEUE_STATE: AudioQueueState = { playing: undefined, pending: [] };

export type SubmitResult =
  | { readonly action: 'play_now'; readonly state: AudioQueueState }
  | { readonly action: 'enqueued'; readonly state: AudioQueueState }
  | { readonly action: 'dropped_stale'; readonly state: AudioQueueState };

function isStale(request: CueRequest, now_ms: number, staleAfter_ms: number): boolean {
  if (SAFETY_CUE_IDS.has(request.cueId)) return false;
  return now_ms - request.eventAt_ms > staleAfter_ms;
}

function sortedInsert(pending: readonly QueuedItem[], item: QueuedItem): readonly QueuedItem[] {
  const next = [...pending, item];
  // Stable sort by priority (FIFO within a tier: Array#sort is stable per ES2019+, ADR's target
  // ES2023 already guarantees this — ties keep insertion order).
  next.sort((a, b) => a.priority - b.priority);
  return next;
}

/**
 * Decides what a freshly-arrived cue request does to `state` at `now_ms` (cue-list.md 4.1):
 * hard-cut and play now (nothing was playing, or the new cue is strictly more urgent), enqueue
 * (equal or less urgent than what is playing), or drop for staleness (never for a safety cue).
 */
export function submitCue(
  state: AudioQueueState,
  request: CueRequest,
  now_ms: number,
  staleAfter_ms: number = DEFAULT_STALE_AFTER_MS,
): SubmitResult {
  if (state.playing === undefined) {
    if (isStale(request, now_ms, staleAfter_ms)) {
      return { action: 'dropped_stale', state };
    }
    const playing = { ...request, enqueuedAt_ms: now_ms, endsAt_ms: now_ms + request.durationMs };
    return { action: 'play_now', state: { playing, pending: state.pending } };
  }
  if (request.priority < state.playing.priority) {
    // Hard-cut: the interrupted item never resumes (one-shot stingers, cue-list.md 4.1 item 1).
    const playing = { ...request, enqueuedAt_ms: now_ms, endsAt_ms: now_ms + request.durationMs };
    return { action: 'play_now', state: { playing, pending: state.pending } };
  }
  if (isStale(request, now_ms, staleAfter_ms)) {
    return { action: 'dropped_stale', state };
  }
  const item: QueuedItem = { ...request, enqueuedAt_ms: now_ms };
  return {
    action: 'enqueued',
    state: { playing: state.playing, pending: sortedInsert(state.pending, item) },
  };
}

/**
 * Advances the queue at `now_ms`: if the currently-playing item has finished, promotes the next
 * pending item (dropping any that went stale while waiting) to `playing`. Returns the item that
 * should now start real playback, or `undefined` when nothing changed (still playing, or empty).
 */
export function advanceQueue(
  state: AudioQueueState,
  now_ms: number,
  staleAfter_ms: number = DEFAULT_STALE_AFTER_MS,
): { readonly toPlay: CueRequest | undefined; readonly state: AudioQueueState } {
  if (state.playing !== undefined && now_ms < state.playing.endsAt_ms) {
    return { toPlay: undefined, state };
  }
  let pending = state.pending;
  while (pending.length > 0) {
    const [next, ...rest] = pending;
    if (next === undefined) break;
    if (isStale(next, now_ms, staleAfter_ms)) {
      pending = rest;
      continue;
    }
    const playing = { ...next, endsAt_ms: now_ms + next.durationMs };
    return { toPlay: next, state: { playing, pending: rest } };
  }
  return { toPlay: undefined, state: { playing: undefined, pending: [] } };
}
