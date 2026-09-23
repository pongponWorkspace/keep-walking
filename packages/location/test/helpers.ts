/**
 * Test doubles for packages/location: a deterministic fake Clock (TL-S09), a controllable
 * VisibilitySource, a stub Geolocation, and a loader for the committed synthetic traces.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GpsTrace } from '@keep-walking/shared';
import type { Clock, TimerHandle, Unsubscribe, VisibilitySource } from '../src/types';
import type {
  GeolocationErrorLike,
  GeolocationLike,
  GeolocationPositionLike,
  GeolocationPositionOptionsLike,
} from '../src/web/web-provider';
import { loadTrace } from '../src/mock/load-trace';

interface Timer {
  id: number;
  due: number;
  callback: () => void;
}

/** Virtual time. Timers fire only inside advance()/runUntilIdle(), in (due, creation) order. */
export class FakeClock implements Clock {
  /** Start time of the fake clock (ms epoch). */
  readonly t0: number;
  private current: number;
  private nextId = 1;
  private timers: Timer[] = [];
  /** Number of timers fired so far (to prove no busy loop). */
  fired = 0;

  constructor(startMs = 1_700_000_000_000) {
    this.t0 = startMs;
    this.current = startMs;
  }

  now(): number {
    return this.current;
  }

  setTimeout(callback: () => void, delayMs: number): TimerHandle {
    const id = this.nextId++;
    this.timers.push({ id, due: this.current + Math.max(0, delayMs), callback });
    return id;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers = this.timers.filter((timer) => timer.id !== handle);
  }

  get pending(): number {
    return this.timers.length;
  }

  /** Advances virtual time by `ms`, firing every timer due on the way. */
  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const next = this.popNext(target);
      if (next === undefined) {
        break;
      }
      this.current = next.due;
      this.fired += 1;
      next.callback();
    }
    this.current = target;
  }

  /** Fires timers until none are left (or the guard trips). Returns the virtual time used. */
  runUntilIdle(maxTimers = 1_000_000): number {
    const start = this.current;
    let guard = 0;
    for (;;) {
      const next = this.popNext(Number.POSITIVE_INFINITY);
      if (next === undefined) {
        return this.current - start;
      }
      if (++guard > maxTimers) {
        throw new Error('FakeClock.runUntilIdle: too many timers (loop?)');
      }
      this.current = next.due;
      this.fired += 1;
      next.callback();
    }
  }

  private popNext(limit: number): Timer | undefined {
    let best: Timer | undefined;
    for (const timer of this.timers) {
      if (timer.due <= limit && (best === undefined || timer.due < best.due)) {
        best = timer;
      }
    }
    if (best !== undefined) {
      const chosen = best;
      this.timers = this.timers.filter((timer) => timer !== chosen);
    }
    return best;
  }
}

/** A page visibility you flip by hand. */
export class FakeVisibility implements VisibilitySource {
  private visible: boolean;
  private readonly listeners = new Set<(visible: boolean) => void>();

  constructor(visible = true) {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  subscribe(listener: (visible: boolean) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get listenerCount(): number {
    return this.listeners.size;
  }

  set(visible: boolean): void {
    this.visible = visible;
    for (const listener of [...this.listeners]) listener(visible);
  }
}

interface Watch {
  id: number;
  success: (position: GeolocationPositionLike) => void;
  error: (error: GeolocationErrorLike) => void;
  options: GeolocationPositionOptionsLike;
}

/** Stub of navigator.geolocation. Fixes and errors are pushed by the test. */
export class FakeGeolocation implements GeolocationLike {
  readonly watchCalls: GeolocationPositionOptionsLike[] = [];
  readonly clearCalls: number[] = [];
  /** Must stay 0: getPermission() must never prompt through getCurrentPosition. */
  getCurrentPositionCalls = 0;
  private nextId = 1;
  private watches = new Map<number, Watch>();

  watchPosition(
    success: (position: GeolocationPositionLike) => void,
    error: (error: GeolocationErrorLike) => void,
    options: GeolocationPositionOptionsLike,
  ): number {
    const id = this.nextId++;
    this.watchCalls.push(options);
    this.watches.set(id, { id, success, error, options });
    return id;
  }

  clearWatch(watchId: number): void {
    this.clearCalls.push(watchId);
    this.watches.delete(watchId);
  }

  getCurrentPosition(): void {
    this.getCurrentPositionCalls += 1;
  }

  get activeWatches(): number {
    return this.watches.size;
  }

  fix(timestamp: number, coords: Partial<GeolocationPositionLike['coords']> = {}): void {
    const position: GeolocationPositionLike = {
      timestamp,
      coords: { latitude: 13.7306, longitude: 100.54154, accuracy: 5, ...coords },
    };
    for (const watch of [...this.watches.values()]) watch.success(position);
  }

  fail(code: 1 | 2 | 3): void {
    for (const watch of [...this.watches.values()]) watch.error({ code, message: 'stub' });
  }
}

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(TEST_DIR, '..', '..', '..');
export const SYNTHETIC_DIR = join(REPO_ROOT, 'data', 'gps-traces', 'synthetic');

/** Reads and validates one committed trace (through loadTrace, i.e. validateTrace). */
export function readTrace(id: string): GpsTrace {
  const json: unknown = JSON.parse(readFileSync(join(SYNTHETIC_DIR, `${id}.trace.json`), 'utf8'));
  const result = loadTrace(json);
  if (!result.ok) {
    throw new Error(`${id}: ${result.summary}`);
  }
  return result.trace;
}

export function syntheticTraceIds(): string[] {
  return readdirSync(SYNTHETIC_DIR)
    .filter((name) => name.endsWith('.trace.json'))
    .map((name) => name.replace(/\.trace\.json$/, ''))
    .sort();
}

/** A tiny valid trace for focused tests: samples every `stepMs`, optional events. */
export function makeTrace(
  count: number,
  stepMs = 1000,
  events: GpsTrace['events'] = undefined,
): GpsTrace {
  return {
    format: 'keep-walking.gps-trace',
    formatVersion: 1,
    meta: { id: 'unit-trace', kind: 'synthetic', timeBase: 'relative-ms' },
    samples: Array.from({ length: count }, (_, i) => ({
      t: i * stepMs,
      lat: 13.73 + i * 0.00001,
      lng: 100.54,
      accuracy: 5,
    })),
    ...(events === undefined ? {} : { events }),
  };
}
