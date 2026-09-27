// Feeds a validated `GpsTrace` through the real public `sessionStep` reducer, one `sample` input
// per trace sample, collecting every `SessionEvent` in order (P2-F04-T22: "trace-replay ผ่าน
// interface สาธารณะ" — never `run`/`reward` internals directly). Mirrors what
// `apps/client/src/f04-app.ts#onSample` does (t_ms/lat/lng/accuracy_m), without any DOM/UI.
import type { GpsTrace } from '@keep-walking/shared';
import { createSession, sessionStep, createPlayer } from '@keep-walking/shared/session';
import type {
  PlayerState,
  SessionEvent,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';

export interface DriveResult {
  readonly state: SessionState;
  readonly events: readonly SessionEvent[];
}

/** `startEpochMs + sample.t` for every sample (traces store relative ms from 0, tech note F04
 * section 17 test hook convention) — the same offset `apps/client`'s Mock game clock applies. */
export function driveTrace(
  trace: GpsTrace,
  params: SessionParams,
  startEpochMs: number,
  initialPlayer?: PlayerState,
): DriveResult {
  let state = createSession(
    startEpochMs,
    params,
    initialPlayer ?? createPlayer(startEpochMs, params.config),
  );
  const events: SessionEvent[] = [];
  for (const s of trace.samples) {
    const now_ms = startEpochMs + s.t;
    const step = sessionStep(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy } },
      now_ms,
      params,
    );
    state = step.state;
    events.push(...step.events);
  }
  return { state, events };
}

/** One `sessionStep` call for a single non-sample input (`confirm`, `exit`, `tick`, ...) — kept
 * here so every test file in this folder threads `state`/`events` the same way. */
export function step(
  state: SessionState,
  input: Parameters<typeof sessionStep>[1],
  now_ms: number,
  params: SessionParams,
): DriveResult {
  const result = sessionStep(state, input, now_ms, params);
  return { state: result.state, events: result.events };
}

/** `confirm` alone always rejects `no_class` on a fresh player (F06-tech 6.3 item 1: the class
 * sheet runs before the map in the real flow, so every other case in this folder needs a class
 * chosen first, exactly like a real player would have one by the time they ever see a dungeon).
 * Any `PlayerClass` works for F04 purposes (class only changes HP/damage numbers, F06). */
export function chooseAnyClass(
  state: SessionState,
  now_ms: number,
  params: SessionParams,
): DriveResult {
  return step(state, { type: 'chooseClass', classId: 'tanker' }, now_ms, params);
}
