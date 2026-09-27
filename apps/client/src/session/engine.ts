/**
 * The client-side session engine (tech note F04 sections 2, 9, 10, 12): owns the one
 * `SessionState`, is the only caller of `sessionStep`/`createSession`
 * (`@keep-walking/shared/session`), persists it (`session/persist.ts`) and maps every event it
 * gets back to telemetry (`telemetry/f04-events.ts`) through an injected `record()` — this module
 * never imports `telemetry/sink.ts` itself, so it stays testable with a plain recorder.
 *
 * Boot sequence follows tech note F04 section 10.2 exactly (P2-X10's real `fromPersisted` does the
 * `unknown_dungeon` check and the on-device sample cap): load -> discard-and-recreate on any read
 * failure -> immediate `tick` so time lost while the app was closed is judged before the first
 * frame renders.
 */
import { createSession, selectCheckInPreview, sessionStep } from '@keep-walking/shared/session';
import type {
  CheckInPreview,
  PlayerClass,
  SessionEvent,
  SessionInput,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';
import { loadSession, saveSession } from './persist';
import { sessionStateDiscardedEvent } from '../telemetry/f04-events';
import { mapSessionEvent } from '../telemetry/f04-events';
import type { RunClientStats } from '../telemetry/f04-events';

const SESSION_STORAGE_KEY = 'kw.p2.session';

export interface SessionEngineDeps {
  readonly storage: KeyValueStorage;
  readonly quotaDeps: QuotaFallbackDeps;
  readonly record: (eventName: string, properties?: Record<string, unknown>) => void;
  readonly storageKey?: string;
  /** e2e-only test hook (`clock/query-params.ts`'s `parseE2eClassIdParam`, P2-F05-T10): dispatched
   * as a real `chooseClass` input once at boot, only when the loaded player has no class yet —
   * F06-T10's real class-picker screen will send the exact same input from a tap, never a
   * different code path. `undefined` in every real build (main.ts only reads the query param under
   * `?loc=mock`-style test URLs). */
  readonly testForceClassId?: PlayerClass;
  /** P2-F06-T14 (tech note F06 10.2 Q-T17-3): read once, synchronously, only when the events a
   * `dispatch()` call returns include `dungeon_exited` — a live peek at the current run's Wake
   * Lock/page-hidden totals (`WakeLockController.snapshot()` in `f04-app.ts`), never a value the
   * engine stores or the `SessionEvent` itself carries (the reducer has no idea Wake Lock exists,
   * ADR 0003 C1-1). `undefined` in every test/fixture that does not care about these two telemetry
   * properties — `mapSessionEvent`'s own default (`f04-events.ts`) covers that case honestly. */
  readonly getRunClientStats?: () => RunClientStats;
}

export interface SessionEngine {
  getState(): SessionState;
  readonly params: SessionParams;
  /** Steps the engine, persists the result, and maps every returned event to telemetry. Returns
   * the raw `SessionEvent[]` too, for UI code that needs to react (e.g. a toast on `run_state_changed`). */
  dispatch(input: SessionInput, now_ms: number): readonly SessionEvent[];
  /** Speculative, side-effect-free check-in preview (`selectCheckInPreview`, tech note F04 7.4) —
   * never call `dispatch` for a preview: that would actually attempt the check-in. */
  previewCheckIn(dungeonId: string, now_ms: number): CheckInPreview;
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
  const loaded = loadSession(deps.storage, key, params);
  if (loaded === undefined) {
    state = createSession(now_ms, params);
  } else if (loaded.ok) {
    state = loaded.state;
  } else {
    const mapped = sessionStateDiscardedEvent(loaded.reason);
    deps.record(mapped.name, mapped.properties as Record<string, unknown>);
    state = createSession(now_ms, params);
  }

  function persistAndMap(
    next: SessionState,
    events: readonly SessionEvent[],
    atRunDungeonId?: string,
  ): void {
    for (const event of events) {
      const runClientStats =
        event.type === 'dungeon_exited' ? deps.getRunClientStats?.() : undefined;
      const mapped = mapSessionEvent(event, next.player.classId, atRunDungeonId, runClientStats);
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

  // e2e-only class hook (`testForceClassId`, see the field's own doc comment): applied last, once,
  // only for a player who has never chosen one — a real class already on the loaded/created player
  // is never overwritten.
  if (deps.testForceClassId !== undefined && state.player.classId === null) {
    const stepped = sessionStep(
      state,
      { type: 'chooseClass', classId: deps.testForceClassId },
      now_ms,
      params,
    );
    state = stepped.state;
    persistAndMap(state, stepped.events);
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
    previewCheckIn(dungeonId, at_ms) {
      return selectCheckInPreview(state, dungeonId, at_ms, params);
    },
  };
}
