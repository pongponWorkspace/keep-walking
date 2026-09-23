import { beforeEach, describe, expect, it } from 'vitest';
import type { Clock, LocationError, LocationSample, TimerHandle } from '@keep-walking/location';
import { GpsStatusTracker } from './gps-status';

/** Minimal deterministic Clock test double (packages/location/test/helpers.ts convention;
 * duplicated here because that file is not part of @keep-walking/location's public exports). */
class FakeClock implements Clock {
  private current = 1_700_000_000_000;
  private nextId = 1;
  private timers: { id: number; due: number; callback: () => void }[] = [];

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

  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const due = this.timers.filter((t) => t.due <= target).sort((a, b) => a.due - b.due)[0];
      if (due === undefined) {
        break;
      }
      this.timers = this.timers.filter((t) => t.id !== due.id);
      this.current = due.due;
      due.callback();
    }
    this.current = target;
  }
}

const THRESHOLDS = { maxAccuracy_m: 100, sustainedPoorAccuracy_s: 30 };
const SUSTAINED_MS = THRESHOLDS.sustainedPoorAccuracy_s * 1000;

function sample(accuracy: number, t = 0): LocationSample {
  return { timestamp: t, lat: 13.73, lng: 100.54, accuracy };
}

function error(code: LocationError['code'], fatal: boolean, at = 0): LocationError {
  return { code, message: 'x', at, fatal };
}

describe('GpsStatusTracker', () => {
  let clock: FakeClock;
  let tracker: GpsStatusTracker;
  let displays: string[];
  let toasts: string[];

  beforeEach(() => {
    clock = new FakeClock();
    tracker = new GpsStatusTracker({ ...THRESHOLDS, clock });
    displays = [];
    toasts = [];
    tracker.onDisplayChange((d) => displays.push(d));
    tracker.onToast((t) => toasts.push(t));
  });

  it('shows searching while starting, and no toast on the very first fix', () => {
    tracker.handleProviderState('starting');
    expect(tracker.current).toBe('searching');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(5));
    expect(tracker.current).toBe('none');
    expect(toasts).toEqual([]);
  });

  it('shows denied on a fatal permission-denied error and never auto-retries', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('permission-denied', true));
    expect(tracker.current).toBe('denied');
    tracker.handleProviderState('error');
    expect(tracker.current).toBe('denied');
  });

  it('shows unsupported on a fatal unsupported or not-implemented error', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('unsupported', true));
    expect(tracker.current).toBe('unsupported');
  });

  it('shows restored after recovering from denied via a fresh start()', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('permission-denied', true));
    tracker.handleProviderState('error');
    tracker.handleProviderState('starting'); // user pressed start again
    expect(tracker.current).toBe('searching');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(5));
    expect(tracker.current).toBe('none');
    expect(toasts).toEqual(['restored']);
  });

  it('does not flip to off on a single position-unavailable error', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('position-unavailable', false));
    expect(tracker.current).toBe('searching');
  });

  it('flips to off after position-unavailable persists for sustainedPoorAccuracy_s with no fix', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('position-unavailable', false));
    clock.advance(SUSTAINED_MS - 1);
    expect(tracker.current).toBe('searching');
    clock.advance(1);
    expect(tracker.current).toBe('off');
  });

  it('a sample arriving before the threshold cancels the pending off', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('position-unavailable', false));
    clock.advance(SUSTAINED_MS / 2);
    tracker.handleProviderState('running');
    tracker.handleSample(sample(5));
    clock.advance(SUSTAINED_MS);
    expect(tracker.current).toBe('none');
  });

  it('a timeout error never triggers off', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('timeout', false));
    clock.advance(SUSTAINED_MS * 2);
    expect(tracker.current).toBe('searching');
  });

  it('flips to lowAccuracy after accuracy stays worse than maxAccuracy_m for sustainedPoorAccuracy_s', () => {
    tracker.handleProviderState('starting');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(150));
    expect(tracker.current).toBe('none'); // not sustained yet
    clock.advance(SUSTAINED_MS);
    tracker.handleSample(sample(150));
    expect(tracker.current).toBe('lowAccuracy');
  });

  it('a single good sample clears a sustained lowAccuracy and toasts restored', () => {
    tracker.handleProviderState('starting');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(150));
    clock.advance(SUSTAINED_MS);
    tracker.handleSample(sample(150));
    expect(tracker.current).toBe('lowAccuracy');
    tracker.handleSample(sample(5));
    expect(tracker.current).toBe('none');
    expect(toasts).toEqual(['restored']);
  });

  it('shows a suspended toast (not restored) when returning from a screen-lock suspension', () => {
    tracker.handleProviderState('starting');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(5));
    tracker.handleProviderState('suspended');
    tracker.handleProviderState('running'); // Web resumeState = 'running'
    tracker.handleSample(sample(5));
    expect(toasts).toEqual(['suspended']);
  });

  it('a fresh stop()/start() session forgets a previous problem (no stale toast)', () => {
    tracker.handleProviderState('starting');
    tracker.handleError(error('permission-denied', true));
    tracker.handleProviderState('error');
    tracker.handleProviderState('stopped');
    tracker.handleProviderState('idle');
    tracker.handleProviderState('starting');
    tracker.handleProviderState('running');
    tracker.handleSample(sample(5));
    expect(toasts).toEqual([]);
  });
});
