/**
 * QA-owned test doubles and pure helpers for the F02 black-box suite (P1-F02-T13).
 *
 * Deliberately independent from packages/location/test/helpers.ts (a dev asset QA must not
 * modify or import): these are QA's own doubles so the trace-replay proof stays black-box,
 * exercising only the public @keep-walking/location / @keep-walking/shared surface.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GpsTrace } from '@keep-walking/shared';
import type {
  Clock,
  GeolocationErrorLike,
  GeolocationLike,
  GeolocationPositionLike,
  GeolocationPositionOptionsLike,
  TimerHandle,
  Unsubscribe,
  VisibilitySource,
} from '@keep-walking/location';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..');
export const TRACE_DIRS = ['synthetic', 'qa', 'recorded'] as const;

/** Every `*.trace.json` file under data/gps-traces/{synthetic,qa,recorded}, id + parsed JSON. */
export function readAllRepoTraces(): {
  id: string;
  kind: (typeof TRACE_DIRS)[number];
  json: unknown;
}[] {
  const out: { id: string; kind: (typeof TRACE_DIRS)[number]; json: unknown }[] = [];
  for (const kind of TRACE_DIRS) {
    const dir = join(REPO_ROOT, 'data', 'gps-traces', kind);
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue; // recorded/ may not exist yet (P1-F02-T24 not done)
    }
    for (const name of names) {
      if (!name.endsWith('.trace.json')) continue;
      const json: unknown = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      out.push({ id: name.replace(/\.trace\.json$/, ''), kind, json });
    }
  }
  return out;
}

export function readQaTrace(id: string): unknown {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, 'data', 'gps-traces', 'qa', `${id}.trace.json`), 'utf8'),
  );
}

export function readSyntheticTrace(id: string): unknown {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, 'data', 'gps-traces', 'synthetic', `${id}.trace.json`), 'utf8'),
  );
}

/** Minimal deterministic Clock: timers fire only inside advance()/runUntilIdle(). */
export class QaFakeClock implements Clock {
  private current: number;
  private nextId = 1;
  private timers: { id: number; due: number; cb: () => void }[] = [];

  constructor(startMs = 1_700_000_000_000) {
    this.current = startMs;
  }

  now(): number {
    return this.current;
  }

  setTimeout(callback: () => void, delayMs: number): TimerHandle {
    const id = this.nextId++;
    this.timers.push({ id, due: this.current + Math.max(0, delayMs), cb: callback });
    return id;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers = this.timers.filter((t) => t.id !== handle);
  }

  private popNext(limit: number) {
    let best: { id: number; due: number; cb: () => void } | undefined;
    for (const t of this.timers) {
      if (t.due <= limit && (best === undefined || t.due < best.due)) best = t;
    }
    if (best !== undefined) this.timers = this.timers.filter((t) => t !== best);
    return best;
  }

  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const next = this.popNext(target);
      if (next === undefined) break;
      this.current = next.due;
      next.cb();
    }
    this.current = target;
  }

  runUntilIdle(maxTimers = 2_000_000): void {
    let guard = 0;
    for (;;) {
      const next = this.popNext(Number.POSITIVE_INFINITY);
      if (next === undefined) return;
      if (++guard > maxTimers) throw new Error('QaFakeClock.runUntilIdle: too many timers (loop?)');
      this.current = next.due;
      next.cb();
    }
  }
}

/** A page visibility switch flipped by hand. */
export class QaFakeVisibility implements VisibilitySource {
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

  set(visible: boolean): void {
    this.visible = visible;
    for (const l of [...this.listeners]) l(visible);
  }
}

/** Stub of navigator.geolocation driven by the test. */
export class QaFakeGeolocation implements GeolocationLike {
  readonly watchCalls: GeolocationPositionOptionsLike[] = [];
  getCurrentPositionCalls = 0;
  private nextId = 1;
  private watches = new Map<
    number,
    { success: (p: GeolocationPositionLike) => void; error: (e: GeolocationErrorLike) => void }
  >();

  watchPosition(
    success: (position: GeolocationPositionLike) => void,
    error: (error: GeolocationErrorLike) => void,
    options: GeolocationPositionOptionsLike,
  ): number {
    const id = this.nextId++;
    this.watchCalls.push(options);
    this.watches.set(id, { success, error });
    return id;
  }

  clearWatch(watchId: number): void {
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
    for (const w of [...this.watches.values()]) w.success(position);
  }

  fail(code: 1 | 2 | 3): void {
    for (const w of [...this.watches.values()]) w.error({ code, message: 'qa-stub' });
  }
}

/** Pure haversine great-circle distance in metres. Independent of any app/HUD implementation. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Sum of consecutive-sample distances (metres) for every sample whose t falls in [fromMs, toMs). */
export function pathDistanceMeters(
  samples: readonly { t: number; lat: number; lng: number }[],
  fromMs: number,
  toMs: number,
): number {
  let total = 0;
  const inWindow = samples.filter((s) => s.t >= fromMs && s.t < toMs);
  for (let i = 1; i < inWindow.length; i += 1) {
    const a = inWindow[i - 1];
    const b = inWindow[i];
    if (a === undefined || b === undefined) continue;
    total += haversineMeters(a.lat, a.lng, b.lat, b.lng);
  }
  return total;
}

/**
 * Movement-gate pass/fail per non-overlapping window of `windowMs`, computed independently of
 * any HUD/app code (config/balance/dungeons.json#movementGate: > minDistance_m per window_s).
 */
export function gateWindows(
  trace: GpsTrace,
  windowMs: number,
  minDistanceM: number,
): { fromMs: number; toMs: number; distanceM: number; pass: boolean }[] {
  const duration = trace.samples.at(-1)?.t ?? 0;
  const out: { fromMs: number; toMs: number; distanceM: number; pass: boolean }[] = [];
  for (let from = 0; from + windowMs <= duration; from += windowMs) {
    const distanceM = pathDistanceMeters(trace.samples, from, from + windowMs);
    out.push({ fromMs: from, toMs: from + windowMs, distanceM, pass: distanceM > minDistanceM });
  }
  return out;
}

/** Gaps strictly longer than `thresholdMs` between consecutive sample timestamps (S13). */
export function detectGaps(
  trace: GpsTrace,
  thresholdMs: number,
): { atMs: number; gapMs: number }[] {
  const gaps: { atMs: number; gapMs: number }[] = [];
  for (let i = 1; i < trace.samples.length; i += 1) {
    const prev = trace.samples[i - 1];
    const cur = trace.samples[i];
    if (prev === undefined || cur === undefined) continue;
    const gapMs = cur.t - prev.t;
    if (gapMs > thresholdMs) gaps.push({ atMs: prev.t, gapMs });
  }
  return gaps;
}
