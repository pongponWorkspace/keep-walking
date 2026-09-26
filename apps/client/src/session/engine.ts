/**
 * The client-side session engine (tech note F04 sections 2, 9, 10, 12): owns the one
 * `SessionState`, is the only caller of `sessionStep`/`createSession`
 * (`@keep-walking/shared/session`), persists it (`session/persist.ts`) and maps every event it
 * gets back to telemetry (`telemetry/f04-events.ts`) through an injected `record()` — this module
 * never imports `telemetry/sink.ts` itself, so it stays testable with a plain recorder.
 *
 * Boot sequence follows tech note F04 section 10.2 exactly, minus the two pieces P2-X10 has not
 * landed yet (the real `fromPersisted`'s `unknown_dungeon` check and the on-device sample purge —
 * `session/persist.ts` documents the same gap): load -> discard-and-recreate on any read failure
 * -> immediate `tick` so time lost while the app was closed is judged before the first frame renders.
 */
import { createSession, sessionStep } from '@keep-walking/shared/session';
import type {
  SessionEvent,
  SessionInput,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';
import { loadSession, saveSession } from './persist';
import { sessionStateDiscardedEvent } from '../telemetry/f04-events';
import { mapSessionEvent } from '../telemetry/f04-events';
import { previewCheckIn } from './checkin-preview';
import type { CheckInPreview } from './checkin-preview';

const SESSION_STORAGE_KEY = 'kw.p2.session';

export interface SessionEngineDeps {
  readonly storage: KeyValueStorage;
  readonly quotaDeps: QuotaFallbackDeps;
  readonly record: (eventName: string, properties?: Record<string, unknown>) => void;
  readonly storageKey?: string;
}

export interface SessionEngine {
  getState(): SessionState;
  readonly params: SessionParams;
  /** Steps the engine, persists the result, and maps every returned event to telemetry. Returns
   * the raw `SessionEvent[]` too, for UI code that needs to react (e.g. a toast on `run_state_changed`). */
  dispatch(input: SessionInput, now_ms: number): readonly SessionEvent[];
  /** Speculative, side-effect-free check-in preview (`session/checkin-preview.ts`) — never call
   * `dispatch` for a preview: that would actually attempt the check-in. */
  previewCheckIn(dungeonId: string, runSeed: number, now_ms: number): CheckInPreview;
}

/** Boots (or recovers) the session, then does the same catch-up `tick` tech note 10.2 requires
 * before the first screen renders. `now_ms` is the game clock's current instant at boot. */
export function createSessionEngine(
  params: SessionParams,
  deps: SessionEngineDeps,
  now_ms: number,
): SessionEngine {
  const key = deps.storageKey ?? SESSION_STORAGE_KEY;
  let state: SessionState;
  const loaded = loadSession(deps.storage, key);
  if (loaded === undefined) {
    state = createSession(now_ms);
  } else if (loaded.ok) {
    state = loaded.state;
  } else {
    const mapped = sessionStateDiscardedEvent(loaded.reason);
    deps.record(mapped.name, mapped.properties as Record<string, unknown>);
    state = createSession(now_ms);
  }

  function persistAndMap(
    next: SessionState,
    events: readonly SessionEvent[],
    atRunDungeonId?: string,
  ): void {
    for (const event of events) {
      const mapped = mapSessionEvent(event, next.player.playerClass, atRunDungeonId);
      if (mapped !== undefined) {
        deps.record(mapped.name, mapped.properties as Record<string, unknown>);
      }
    }
    saveSession(deps.storage, key, next, now_ms, deps.quotaDeps);
  }

  // Catch-up tick (F04 10.2): judges any time lost while the app was closed before anyone reads
  // `getState()` for the first time.
  {
    const beforeDungeonId = state.run?.dungeonId;
    const stepped = sessionStep(state, { type: 'tick' }, now_ms, params);
    state = stepped.state;
    persistAndMap(state, stepped.events, beforeDungeonId);
  }

  return {
    getState: () => state,
    params,
    dispatch(input, at_ms) {
      const beforeDungeonId = state.run?.dungeonId;
      const stepped = sessionStep(state, input, at_ms, params);
      state = stepped.state;
      persistAndMap(state, stepped.events, beforeDungeonId ?? state.run?.dungeonId);
      return stepped.events;
    },
    previewCheckIn(dungeonId, runSeed, at_ms) {
      return previewCheckIn(state, dungeonId, runSeed, at_ms, params);
    },
  };
}
