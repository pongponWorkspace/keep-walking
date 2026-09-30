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
 *
 * DG6-05 (design gate F06 round 1, P2-X47): with `loop=1`, `provider.position()` is documented
 * (`packages/location/src/mock/mock-provider.ts`'s own doc comment) to restart each lap at the
 * trace's own `t=0`, clamped to a floor of 0 while its internal anchor is briefly negative during
 * the inter-lap gap — a real, intentional reset of *trace position*, not a bug in that package (a
 * trace's samples legitimately repeat every lap). But this function was adding that reset straight
 * onto `replayStart_ms` every call, so `now()` itself jumped backward by about one lap's length at
 * every loop boundary — and the session reducer's own `clockCheck` (`@keep-walking/shared/session`,
 * `run/time.ts`) treats *any* backward jump of the `now_ms` it is fed as a real host-clock rollback,
 * ending the run with `clock_invalid` purely as a replay artifact of looping, never because the
 * *player's position* actually jumped (confirmed: `LocationSample.timestamp` from the provider's
 * own `Clock`, produced independently in `packages/location`, keeps strictly increasing across a
 * loop already — see that module's own doc comment "a loop lap ... shifts the base so timestamps
 * stay strictly increasing" — so this was never a GPS position-jump bug, only this function
 * mis-reading a per-lap position as if it were a monotonic elapsed-time counter).
 *
 * Fix (Mock only — `createWebGameClock` above is untouched): track every backward step
 * `position()` takes and fold it into a running offset, so `now()` keeps counting forward through
 * every loop boundary instead of resetting with it. `position()` itself, and the samples/timestamps
 * `packages/location` emits, are unchanged — only this function's own derived `now()` no longer
 * goes backward.
 */
export function createMockGameClock(
  provider: MockLocationProvider,
  replayStart_ms: number,
): GameClock {
  // Carries forward the elapsed position of every completed lap once `position()` wraps back
  // toward 0, so the sum below never decreases. `lastPosition_ms` starts at 0 (`position()`'s own
  // documented floor), matching the provider's own state before its first `now()` call.
  let lapOffset_ms = 0;
  let lastPosition_ms = 0;
  return {
    now: () => {
      const position_ms = provider.position();
      if (position_ms < lastPosition_ms) {
        lapOffset_ms += lastPosition_ms;
      }
      lastPosition_ms = position_ms;
      return replayStart_ms + lapOffset_ms + position_ms;
    },
  };
}

/** Picks the right clock for whichever provider kind `createLocationProvider` returned
 * (`location/session.ts`). `replayStart_ms` is only read for a Mock provider. */
export function createGameClock(provider: LocationProvider, replayStart_ms: number): GameClock {
  return isMockProvider(provider)
    ? createMockGameClock(provider, replayStart_ms)
    : createWebGameClock();
}
