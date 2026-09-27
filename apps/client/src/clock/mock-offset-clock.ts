/**
 * The Mock provider's own `Clock` (`@keep-walking/location`, injected only under `loc=mock`,
 * `main.ts`): reports `target_ms` instead of the real wall clock, so a `?start=` scenario
 * (docs/tech/F04-dungeon-presence.md section 17) pins a specific weekday/time regardless of when
 * the page actually loaded.
 *
 * R2-01 (tech gate P2-F05-T15, closed P2-F06-T10): the provider's own `LocationSample.timestamp`
 * is `replayStart_ms + t` where `replayStart_ms` is *this clock's* `.now()` read at the exact
 * instant `MockTraceLocationProvider#start()` first calls it (`packages/location/src/mock/
 * mock-provider.ts`'s own doc comment, "timestamp = replay start time from the Clock + t"), while
 * `createGameClock`'s Mock branch (`clock/game-clock.ts`) reads `target_ms + provider.position()`
 * directly, never touching this clock at all. The two therefore need `.now()`'s *first real call*
 * to land on `target_ms` exactly — computing `offset_ms = target_ms - Date.now()` eagerly, at
 * clock-construction time (the previous shape of this function), instead captured a reference
 * point *before* `start()` actually ran, so any real wall-clock time spent on setup in between
 * (trace fetch, HUD mount, ...) leaked into every sample's timestamp as a constant, never-resolved
 * skew against the game clock. Computing `offset_ms` lazily, on the first `.now()` call instead of
 * at construction, fixes this: `MockTraceLocationProvider` never calls `.now()` before `start()`
 * (its constructor does not touch `options.clock` at all), so the first read genuinely happens at
 * "the instant playback begins" for both clocks alike — the one reference point R2-01 asked for,
 * with no separate fix needed on the `@keep-walking/location` side (out of this task's `writes`).
 */
import type { Clock } from '@keep-walking/location';

export function createMockOffsetClock(target_ms: number): Clock {
  let offset_ms: number | undefined;
  return {
    now: () => {
      offset_ms ??= target_ms - Date.now();
      return Date.now() + offset_ms;
    },
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (handle) => window.clearTimeout(handle as ReturnType<typeof window.setTimeout>),
  };
}
