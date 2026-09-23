/**
 * Mock LocationProvider: replays a GPS trace (docs/tech/gps-trace-format.md) through the injected
 * Clock, at speed x1/x10/x60, with pause/resume/seek/loop and the trace `events` (screen lock,
 * permission loss, GPS errors). Tests drive it with a fake clock, so 30 minutes replay in ms.
 *
 * Timing model
 * - Trace position `pos` (ms, relative to the first sample) advances at `speed` x clock time
 *   while playing. A sample or event with trace time `t` fires once `pos >= t`.
 * - At the same `t`, events fire before the sample: a `visibility-hidden` at t hides the sample
 *   at t, a `visibility-visible` at t delivers it, a `permission-denied` at t stops before it.
 * - `timestamp` = replay start time from the Clock + `t` (tech note section 4). When start()
 *   begins mid-trace (seek before start, or start after stop), the base is shifted so the first
 *   delivered fix carries the start time instead of a future time: base = start - position.
 *   Timestamps keep trace spacing at every speed and pauses do not add gaps. A loop lap, a
 *   backward seek, or a restart shifts the base so timestamps stay strictly increasing; the
 *   shift puts one `loopGapMs` (the last sample interval) after the last produced timestamp.
 * - While suspended (trace `visibility-hidden` or the injected VisibilitySource hidden) the
 *   trace keeps advancing and samples are dropped, never buffered (GDD "ล็อกหน้าจอ").
 * - Without loop, playback ends after the last sample; the state stays `running` (a real GPS
 *   would still be on) and `ended` becomes true. seek() or start() after the end plays again.
 *
 * Nothing here logs.
 */
import { toLocationSample, traceDurationMs, validateTrace } from '@keep-walking/shared';
import type {
  GpsTrace,
  LocationSample,
  TraceEvent,
  TraceSample,
  ValidateTraceOptions,
} from '@keep-walking/shared';
import type {
  Clock,
  LocationError,
  LocationErrorCode,
  LocationPermission,
  LocationProviderState,
  MockLocationOptions,
  MockLocationProvider,
  MockSpeed,
  TimerHandle,
  Unsubscribe,
  VisibilitySource,
} from '../types';
import { ListenerSet } from '../web/listeners';
import { documentVisibility, systemClock } from '../web/platform';
import { InvalidTraceError } from './load-trace';

export interface MockLocationProviderOptions extends MockLocationOptions {
  /** Passed to validateTrace (for `recorded` traces: `minTrim_m` from config/app/privacy.json). */
  readonly validation?: ValidateTraceOptions;
}

const ERROR_MESSAGES: Record<LocationErrorCode, string> = {
  'permission-denied': 'Location permission was denied (trace event)',
  'position-unavailable': 'No position fix now (trace event)',
  timeout: 'No position fix within the timeout (trace event)',
  unsupported: 'Geolocation is not supported',
  'not-implemented': 'Not implemented',
};

function assertSpeed(speed: number): void {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError(`Mock speed must be a positive number, got ${speed}`);
  }
}

/** Index of the first sample with t >= pos, or -1 when none. */
function nextIndex(samples: readonly TraceSample[], pos: number): number {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((samples[mid]?.t ?? Number.POSITIVE_INFINITY) < pos) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low < samples.length ? low : -1;
}

/** Index of the sample whose t is nearest to pos (the earlier one on a tie). */
function nearestIndex(samples: readonly TraceSample[], pos: number): number {
  const after = nextIndex(samples, pos);
  if (after === -1) {
    return samples.length - 1;
  }
  if (after === 0) {
    return 0;
  }
  const afterT = samples[after]?.t ?? pos;
  const beforeT = samples[after - 1]?.t ?? pos;
  return pos - beforeT <= afterT - pos ? after - 1 : after;
}

export class MockTraceLocationProvider implements MockLocationProvider {
  readonly kind = 'mock' as const;
  /** The validated trace being replayed. */
  readonly trace: GpsTrace;
  /** Trace time between the last sample of a lap and the first sample of the next lap. */
  readonly loopGapMs: number;

  private readonly samples: readonly TraceSample[];
  private readonly events: readonly TraceEvent[];
  private readonly duration: number;
  private readonly loop: boolean;
  private readonly clock: Clock;
  private readonly visibility: VisibilitySource;
  private readonly sampleListeners = new ListenerSet<LocationSample>();
  private readonly errorListeners = new ListenerSet<LocationError>();
  private readonly stateListeners = new ListenerSet<LocationProviderState>();

  private currentState: LocationProviderState = 'idle';
  private speed: number;
  private paused = false;
  private finished = false;
  private anchorPos = 0;
  private anchorClock = 0;
  private sampleIdx = 0;
  private eventIdx = 0;
  private traceHidden = false;
  private pageHidden = false;
  private permission: LocationPermission = 'granted';
  private timeBase: number | null = null;
  private lastProducedTs: number | null = null;
  private timer: TimerHandle | null = null;
  private generation = 0;
  private visibilityUnsubscribe: Unsubscribe | null = null;

  constructor(options: MockLocationProviderOptions) {
    const result = validateTrace(options.trace, options.validation ?? {});
    if (!result.ok) {
      throw new InvalidTraceError(result.errors);
    }
    this.trace = result.trace;
    this.samples = result.trace.samples;
    this.events = result.trace.events ?? [];
    this.duration = traceDurationMs(result.trace);
    const n = this.samples.length;
    this.loopGapMs = (this.samples[n - 1]?.t ?? 1) - (this.samples[n - 2]?.t ?? 0);
    this.loop = options.loop ?? false;
    this.speed = options.speed ?? 1;
    assertSpeed(this.speed);
    this.clock = options.clock ?? systemClock;
    this.visibility = options.visibility ?? documentVisibility();
  }

  get state(): LocationProviderState {
    return this.currentState;
  }

  /** True after the last sample when loop is off. */
  get ended(): boolean {
    return this.finished;
  }

  /** Current playback speed multiplier. */
  get playbackSpeed(): number {
    return this.speed;
  }

  getPermission(): Promise<LocationPermission> {
    return Promise.resolve(this.permission);
  }

  start(): Promise<void> {
    if (this.isActive()) {
      return Promise.resolve();
    }
    const restart = this.finished || this.currentState === 'error';
    this.permission = 'granted';
    this.pageHidden = !this.visibility.isVisible();
    this.visibilityUnsubscribe = this.visibility.subscribe((visible) => {
      this.pageHidden = !visible;
      this.updateSuspension();
    });
    this.setState('starting');
    const startIdx = restart ? 0 : nextIndex(this.samples, this.anchorPos);
    this.moveCursor(startIdx === -1 ? 0 : startIdx);
    const now = this.clock.now();
    this.timeBase = now - this.anchorPos;
    this.keepTimestampsIncreasing();
    this.anchorClock = now;
    this.updateSuspension();
    this.reschedule();
    return Promise.resolve();
  }

  stop(): void {
    if (this.currentState === 'stopped') {
      return;
    }
    this.freeze();
    this.releaseVisibility();
    this.setState('stopped');
  }

  pause(): void {
    if (this.paused) {
      return;
    }
    this.freeze();
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.anchorClock = this.clock.now();
    this.reschedule();
  }

  seek(traceTimeMs: number): void {
    if (!Number.isFinite(traceTimeMs)) {
      throw new RangeError(`seek() needs a finite trace time, got ${traceTimeMs}`);
    }
    this.freeze();
    const clamped = Math.min(Math.max(traceTimeMs, 0), this.duration);
    this.moveCursor(nearestIndex(this.samples, clamped));
    this.keepTimestampsIncreasing();
    this.updateSuspension();
    this.reschedule();
  }

  setSpeed(speed: MockSpeed): void {
    assertSpeed(speed);
    this.freeze();
    this.speed = speed;
    this.reschedule();
  }

  position(): number {
    return Math.min(Math.max(this.rawPosition(), 0), this.duration);
  }

  onSample(listener: (sample: LocationSample) => void): Unsubscribe {
    return this.sampleListeners.add(listener);
  }

  onError(listener: (error: LocationError) => void): Unsubscribe {
    return this.errorListeners.add(listener);
  }

  onStateChange(listener: (state: LocationProviderState) => void): Unsubscribe {
    return this.stateListeners.add(listener);
  }

  private isActive(): boolean {
    const s = this.currentState;
    return s === 'starting' || s === 'running' || s === 'suspended';
  }

  private isAdvancing(): boolean {
    return this.isActive() && !this.paused && !this.finished;
  }

  private rawPosition(): number {
    if (!this.isAdvancing()) {
      return this.anchorPos;
    }
    return this.anchorPos + (this.clock.now() - this.anchorClock) * this.speed;
  }

  /** Pins the current position as the anchor and cancels the pending timer. */
  private freeze(): void {
    this.anchorPos = this.rawPosition();
    this.anchorClock = this.clock.now();
    this.cancelTimer();
  }

  private cancelTimer(): void {
    this.generation += 1;
    if (this.timer !== null) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Always async so a control call from inside a listener never re-enters tick(). */
  private reschedule(): void {
    this.cancelTimer();
    if (this.isAdvancing()) {
      this.schedule(0);
    }
  }

  private schedule(delayMs: number): void {
    const generation = this.generation;
    this.timer = this.clock.setTimeout(() => {
      this.tick(generation);
    }, delayMs);
  }

  /** Puts the cursor on sample `index` and recomputes the event cursor and trace visibility. */
  private moveCursor(index: number): void {
    const t = this.samples[index]?.t ?? 0;
    this.sampleIdx = index;
    this.eventIdx = 0;
    this.traceHidden = false;
    for (const event of this.events) {
      if (event.t >= t) {
        break;
      }
      this.eventIdx += 1;
      if (event.type === 'visibility-hidden' || event.type === 'visibility-visible') {
        this.traceHidden = event.type === 'visibility-hidden';
      }
    }
    this.anchorPos = t;
    this.anchorClock = this.clock.now();
    this.finished = false;
  }

  private keepTimestampsIncreasing(): void {
    const nextT = this.samples[this.sampleIdx]?.t ?? 0;
    if (
      this.timeBase !== null &&
      this.lastProducedTs !== null &&
      this.timeBase + nextT <= this.lastProducedTs
    ) {
      this.timeBase = this.lastProducedTs + this.loopGapMs - nextT;
    }
  }

  private tick(generation: number): void {
    this.timer = null;
    const stillCurrent = (): boolean => generation === this.generation && this.isAdvancing();
    if (!stillCurrent()) {
      return;
    }
    for (;;) {
      const event = this.events[this.eventIdx];
      const sample = this.samples[this.sampleIdx];
      if (event === undefined && sample === undefined) {
        if (!this.endOfLap()) {
          return;
        }
      } else {
        const eventT = event?.t ?? Number.POSITIVE_INFINITY;
        const sampleT = sample?.t ?? Number.POSITIVE_INFINITY;
        const dueT = Math.min(eventT, sampleT);
        const pos = this.rawPosition();
        if (dueT > pos) {
          this.schedule(Math.max(0, Math.ceil((dueT - pos) / this.speed)));
          return;
        }
        if (event !== undefined && eventT <= sampleT) {
          this.eventIdx += 1;
          this.applyEvent(event);
        } else if (sample !== undefined) {
          this.sampleIdx += 1;
          this.produce(sample);
        }
      }
      if (!stillCurrent()) {
        return;
      }
    }
  }

  /** Handles the end of the trace. Returns true when playback continues (loop). */
  private endOfLap(): boolean {
    if (!this.loop) {
      this.anchorPos = this.duration;
      this.anchorClock = this.clock.now();
      this.finished = true;
      return false;
    }
    const pos = this.rawPosition();
    const lapLength = this.duration + this.loopGapMs;
    this.moveCursor(0);
    this.anchorPos = pos - lapLength;
    this.keepTimestampsIncreasing();
    this.updateSuspension();
    return true;
  }

  private produce(sample: TraceSample): void {
    const base = this.timeBase ?? 0;
    this.lastProducedTs = base + sample.t;
    // Suspended: the sample is dropped, not buffered.
    if (this.currentState === 'running') {
      this.sampleListeners.emit(toLocationSample(sample, base));
    }
  }

  private applyEvent(event: TraceEvent): void {
    switch (event.type) {
      case 'visibility-hidden':
      case 'visibility-visible':
        this.traceHidden = event.type === 'visibility-hidden';
        this.updateSuspension();
        return;
      case 'permission-denied':
        this.fail('permission-denied');
        return;
      case 'position-unavailable':
      case 'timeout':
        if (this.currentState === 'running') {
          this.errorListeners.emit({
            code: event.type,
            message: ERROR_MESSAGES[event.type],
            at: this.clock.now(),
            fatal: false,
          });
        }
        return;
    }
  }

  private updateSuspension(): void {
    if (this.isActive()) {
      this.setState(this.traceHidden || this.pageHidden ? 'suspended' : 'running');
    }
  }

  /** Fatal error: stop playback, no retry until start() is called again. */
  private fail(code: LocationErrorCode): void {
    this.freeze();
    this.releaseVisibility();
    if (code === 'permission-denied') {
      this.permission = 'denied';
    }
    this.errorListeners.emit({
      code,
      message: ERROR_MESSAGES[code],
      at: this.clock.now(),
      fatal: true,
    });
    this.setState('error');
  }

  private releaseVisibility(): void {
    this.visibilityUnsubscribe?.();
    this.visibilityUnsubscribe = null;
  }

  private setState(next: LocationProviderState): void {
    if (next === this.currentState) {
      return;
    }
    this.currentState = next;
    this.stateListeners.emit(next);
  }
}

/**
 * Creates a Mock provider. Throws InvalidTraceError when the trace fails validateTrace;
 * call loadTrace() first to show the error without a throw (tech note F12).
 */
export function createMockLocationProvider(
  options: MockLocationProviderOptions,
): MockTraceLocationProvider {
  return new MockTraceLocationProvider(options);
}
