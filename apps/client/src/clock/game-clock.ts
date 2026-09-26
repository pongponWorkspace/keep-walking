/**
 * The game clock adapter (ADR 0003 section 3.2 item 3, docs/tech/F04-dungeon-presence.md section
 * 17): the single place `apps/client` decides what `now_ms` to pass into `sessionStep`
 * (`@keep-walking/shared/session`, once P2-F05-T08 exists — the reducer itself has no clock,
 * ADR 0003 3.2 item 5). Web uses the real clock; Mock derives `now_ms` from the trace's own replay
 * position so playback at x10/x60 produces ticks/hits at the same *trace* time as x1 (a 5-minute
 * reward window is still 5 minutes of trace time, just replayed faster).
 *
 * `@keep-walking/shared/session` is not built yet (backend-programmer, later task); this module
 * has no call site of its own yet either — it is plumbing for P2-F04-T20/T21 to import once the
 * reducer exists, per this task's brief ("stub the call site if needed").
 */
import type { LocationProvider, MockLocationProvider } from '@keep-walking/location';

export interface GameClock {
  /** ms since the Unix epoch — the same unit `now_ms` uses everywhere in ADR 0003. */
  now(): number;
}

export function isMockProvider(provider: LocationProvider): provider is MockLocationProvider {
  return provider.kind === 'mock';
}

/** Web/Capacitor: the real wall clock. */
export function createWebGameClock(): GameClock {
  return { now: () => Date.now() };
}

/**
 * Mock: `now_ms = replayStart_ms + provider.position()` (`position()` is the trace's own elapsed
 * ms, already scaled by the replay speed — `packages/location`'s `MockTraceLocationProvider`).
 * `replayStart_ms` is normally "now" (a fresh mock run starts at the real current time) but can be
 * pinned by the `start` query test hook (`clock/query-params.ts`'s `resolveReplayStartMs`) to hit a
 * specific wall-clock scenario (closing time, midnight crossover) at any replay speed.
 */
export function createMockGameClock(
  provider: MockLocationProvider,
  replayStart_ms: number,
): GameClock {
  return { now: () => replayStart_ms + provider.position() };
}

/** Picks the right clock for whichever provider kind `createLocationProvider` returned
 * (`location/session.ts`). `replayStart_ms` is only read for a Mock provider. */
export function createGameClock(provider: LocationProvider, replayStart_ms: number): GameClock {
  return isMockProvider(provider)
    ? createMockGameClock(provider, replayStart_ms)
    : createWebGameClock();
}
