/**
 * Derives the UI-facing `GpsDisplayState` (src/copy/gps-state.ts) from the raw
 * `LocationProvider` callbacks (`packages/location`). Pure state machine: no DOM, no copy text,
 * driven entirely by an injected `Clock` so it replays deterministically under a fake clock in
 * tests, the same way `packages/location` itself does.
 *
 * Rules encoded here (docs/tech/F02-map-location-spike.md section 4;
 * config/content/copy.th.json `_meta.gpsStateMap`; design/ux/flows/F03-core-loop.md 9.5):
 * - `starting` (no fix yet) -> `searching`.
 * - a fatal `permission-denied` -> `denied`; a fatal `unsupported`/`not-implemented` -> `unsupported`.
 * - a non-fatal `position-unavailable` that keeps recurring with no new sample for
 *   `sustainedPoorAccuracy_s` -> `off` ("OS ปิด location service"). This exact threshold is an
 *   explicit open assumption in the design doc
 *   (`[ASSUMPTION A-P1-F03-T05-3: เกณฑ์ตัดสินว่า 'ต่อเนื่อง' เป็นของ gameplay-programmer]`); reusing
 *   `sustainedPoorAccuracy_s` here (rather than inventing a new balance config key, which is out of
 *   this task's `writes` scope) is `A-P1-F02-T10-1` — see the handoff in the task report.
 * - a run of samples worse than `maxAccuracy_m` for `sustainedPoorAccuracy_s` -> `lowAccuracy`.
 * - returning to a good sample after any of the above -> a one-shot `restored` toast, UNLESS the
 *   immediately preceding problem was `suspended` (screen lock/tab switch), which gets its own
 *   `suspended` toast instead (gpsStateMap: "แสดงเมื่อหน้ากลับมา visible").
 * - a cold start's `searching` (before the very first fix of the session) never triggers a
 *   `restored` toast: there is nothing to "restore" yet.
 */
import type {
  Clock,
  LocationError,
  LocationProviderState,
  LocationSample,
  TimerHandle,
  Unsubscribe,
} from '@keep-walking/location';
import { systemClock } from '@keep-walking/location';
import type { GpsDisplayState, GpsToast } from '../copy/gps-state';

const MS_PER_SECOND = 1000;

export interface GpsStatusThresholds {
  /** config/balance/location.json#homeState.maxAccuracy_m */
  readonly maxAccuracy_m: number;
  /** config/balance/location.json#homeState.sustainedPoorAccuracy_s (reused for `off`, A-P1-F02-T10-1). */
  readonly sustainedPoorAccuracy_s: number;
}

export interface GpsStatusOptions extends GpsStatusThresholds {
  readonly clock?: Clock;
}

type Listener<T> = (value: T) => void;

function makeSet<T>(): { listeners: Set<Listener<T>>; add: (l: Listener<T>) => Unsubscribe } {
  const listeners = new Set<Listener<T>>();
  return {
    listeners,
    add: (listener: Listener<T>): Unsubscribe => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export class GpsStatusTracker {
  private readonly clock: Clock;
  private readonly thresholds: GpsStatusThresholds;
  private readonly displayListeners = makeSet<GpsDisplayState>();
  private readonly toastListeners = makeSet<GpsToast>();

  private display: GpsDisplayState = 'none';
  private providerState: LocationProviderState = 'idle';

  /** Set once a non-fatal `position-unavailable` starts recurring with no sample since. */
  private offSince: number | null = null;
  private offGeneration = 0;
  /** Set on the first sample worse than `maxAccuracy_m` since the last good one. */
  private badAccuracySince: number | null = null;
  /** True once the display has shown a problem the player should be told is now resolved. */
  private problemActive = false;
  /** True when the problem being resolved was specifically a suspended (screen-lock) period. */
  private wasSuspended = false;

  constructor(options: GpsStatusOptions) {
    this.clock = options.clock ?? systemClock;
    this.thresholds = {
      maxAccuracy_m: options.maxAccuracy_m,
      sustainedPoorAccuracy_s: options.sustainedPoorAccuracy_s,
    };
  }

  get current(): GpsDisplayState {
    return this.display;
  }

  onDisplayChange(listener: (display: GpsDisplayState) => void): Unsubscribe {
    return this.displayListeners.add(listener);
  }

  onToast(listener: (toast: GpsToast) => void): Unsubscribe {
    return this.toastListeners.add(listener);
  }

  handleProviderState(state: LocationProviderState): void {
    this.providerState = state;
    switch (state) {
      case 'idle':
      case 'stopped':
        this.resetTimers();
        this.problemActive = false;
        this.wasSuspended = false;
        this.setDisplay('none');
        return;
      case 'starting':
        this.resetTimers();
        // A fresh start() after `suspended` re-enters `starting` without a new `idle`/`stopped`
        // in between (Web provider `resumeState`); `wasSuspended` (set below) survives that.
        this.setDisplay('searching');
        return;
      case 'running':
        // Left to the next handleSample(): only a real fix proves the problem is over.
        return;
      case 'suspended':
        this.resetTimers();
        this.wasSuspended = true;
        this.problemActive = true;
        return;
      case 'error':
        // handleError() already set denied/unsupported; this just stops the timers.
        this.resetTimers();
        return;
    }
  }

  handleSample(sample: LocationSample): void {
    this.clearOff();
    const now = this.clock.now();
    const bad = sample.accuracy > this.thresholds.maxAccuracy_m;
    if (bad) {
      this.badAccuracySince ??= now;
    } else {
      this.badAccuracySince = null;
    }
    const sustainedMs = this.thresholds.sustainedPoorAccuracy_s * MS_PER_SECOND;
    const sustainedBad =
      bad && this.badAccuracySince !== null && now - this.badAccuracySince >= sustainedMs;
    if (sustainedBad) {
      this.setDisplay('lowAccuracy');
    } else {
      this.resolveGood();
    }
  }

  handleError(error: LocationError): void {
    if (error.fatal) {
      this.resetTimers();
      this.setDisplay(error.code === 'permission-denied' ? 'denied' : 'unsupported');
      return;
    }
    if (error.code !== 'position-unavailable') {
      // `timeout`: non-fatal, the provider keeps trying; no display change (tech note F7).
      return;
    }
    if (this.offSince === null) {
      const since = this.clock.now();
      this.offSince = since;
      this.scheduleOffCheck(since);
    }
  }

  /** Releases the pending `off` timer. Call when the tracker is no longer in use. */
  dispose(): void {
    this.resetTimers();
  }

  private scheduleOffCheck(since: number): void {
    const generation = ++this.offGeneration;
    const delayMs = this.thresholds.sustainedPoorAccuracy_s * MS_PER_SECOND;
    const handle: TimerHandle = this.clock.setTimeout(() => {
      if (generation !== this.offGeneration || this.offSince !== since) {
        return; // superseded by a sample, a state change, or a later error
      }
      if (this.providerState !== 'starting' && this.providerState !== 'running') {
        return;
      }
      this.setDisplay('off');
    }, delayMs);
    this.pendingOffTimer = handle;
  }

  private pendingOffTimer: TimerHandle | null = null;

  private clearOff(): void {
    this.offSince = null;
    this.offGeneration += 1;
    if (this.pendingOffTimer !== null) {
      this.clock.clearTimeout(this.pendingOffTimer);
      this.pendingOffTimer = null;
    }
  }

  private resetTimers(): void {
    this.clearOff();
    this.badAccuracySince = null;
  }

  /**
   * A real, current-enough fix: clears any displayed problem and fires the matching toast.
   * The toast fires whenever `problemActive` is true, even if `display` was already `none`
   * (a `suspended` period with nothing else wrong never showed a persistent label, but the
   * player still needs the one-shot "that time wasn't counted" toast on return).
   */
  private resolveGood(): void {
    const shouldToast = this.problemActive;
    const toast: GpsToast = this.wasSuspended ? 'suspended' : 'restored';
    if (this.display !== 'none') {
      this.display = 'none';
      this.displayListeners.listeners.forEach((listener) => listener('none'));
    }
    if (shouldToast) {
      this.toastListeners.listeners.forEach((listener) => listener(toast));
    }
    this.problemActive = false;
    this.wasSuspended = false;
  }

  private setDisplay(next: GpsDisplayState): void {
    // A cold `searching` (nothing has ever worked yet this session) is not a "problem" to later
    // announce as `restored`; every other non-`none` display is.
    if (next === 'searching' && !this.problemActive && this.display === 'none') {
      this.problemActive = false;
    } else if (next !== 'none') {
      this.problemActive = true;
    }
    if (next === this.display) {
      return;
    }
    this.display = next;
    this.displayListeners.listeners.forEach((listener) => listener(next));
  }
}
