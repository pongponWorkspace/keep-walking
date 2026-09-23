/**
 * LocationProvider contract (docs/tech/F02-map-location-spike.md section 4, P1-F02-T03).
 *
 * Game code talks to location only through this interface. Implementations:
 * Web (navigator.geolocation), Mock (replays data/gps-traces), Capacitor (stub until Phase 8).
 * Everything time-related goes through an injected Clock so a 30-minute trace replays in ms.
 * Providers deliver samples; they never compute distance, ticks, or anything reward-related.
 */
import type { GpsTrace, LocationSample } from '@keep-walking/shared';

export type { LocationSample } from '@keep-walking/shared';

export type LocationProviderKind = 'web' | 'mock' | 'capacitor';

/** Mirrors the Permissions API plus `unsupported` for platforms without geolocation. */
export type LocationPermission = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

/**
 * Lifecycle of a provider.
 * - `idle`: created, never started. `starting`: waiting for permission or the first fix.
 * - `running`: delivering samples. `suspended`: page hidden (screen locked or tab switched),
 *   no samples are delivered and none are buffered (GDD "สัญญาณขาดและแอปถูกปิด").
 * - `stopped`: stop() was called. `error`: a fatal error (permission denied, unsupported).
 */
export type LocationProviderState =
  'idle' | 'starting' | 'running' | 'suspended' | 'stopped' | 'error';

/**
 * - `permission-denied`: fatal until the user changes the browser setting.
 * - `position-unavailable`: no fix right now (tunnel, indoors); the provider keeps trying.
 * - `timeout`: no fix within the timeout; the provider keeps trying.
 * - `unsupported`: no geolocation on this platform (fatal).
 * - `not-implemented`: the Capacitor stub before Phase 8 (fatal).
 */
export type LocationErrorCode =
  'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported' | 'not-implemented';

export interface LocationError {
  readonly code: LocationErrorCode;
  /** Developer message in English. UI text comes from copy keys `gps.*`, never from here. */
  readonly message: string;
  /** Clock time (ms since epoch) when the error was observed. */
  readonly at: number;
  /** True when the provider moved to `error` and will not recover without start(). */
  readonly fatal: boolean;
}

export type Unsubscribe = () => void;

/** Opaque timer handle returned by Clock.setTimeout. */
export type TimerHandle = unknown;

/**
 * Time source and scheduler. Production uses the system clock; tests inject a fake clock that
 * advances virtual time so replay does not wait in real time.
 */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
  setTimeout(callback: () => void, delayMs: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/**
 * Page visibility source. The Web implementation wraps `document.visibilityState` and
 * `visibilitychange`; tests inject a controllable one.
 */
export interface VisibilitySource {
  isVisible(): boolean;
  subscribe(listener: (visible: boolean) => void): Unsubscribe;
}

/** Dependencies every provider accepts. Omitted ones fall back to the real platform. */
export interface LocationProviderDeps {
  readonly clock?: Clock;
  readonly visibility?: VisibilitySource;
}

export interface LocationProvider {
  readonly kind: LocationProviderKind;
  readonly state: LocationProviderState;
  /** Reads the permission without prompting. */
  getPermission(): Promise<LocationPermission>;
  /**
   * Starts delivering samples (may trigger the browser prompt; call it from a user gesture).
   * Resolves when the provider is `running`, `suspended`, or `error`; never rejects.
   */
  start(): Promise<void>;
  /** Stops delivery and releases platform resources. Idempotent. */
  stop(): void;
  /** Samples arrive in fix-time order; `timestamp` is the fix time, not the receive time. */
  onSample(listener: (sample: LocationSample) => void): Unsubscribe;
  onError(listener: (error: LocationError) => void): Unsubscribe;
  onStateChange(listener: (state: LocationProviderState) => void): Unsubscribe;
}

/**
 * Geolocation timing, named with the ADR 0001 3.10.3 unit suffix so the values map 1:1 to
 * `config/app/client.json#locationWeb.{timeout_ms, maximumAge_ms}` (P1-X05).
 */
export interface WebLocationTiming {
  readonly timeout_ms: number;
  readonly maximumAge_ms: number;
  readonly timeoutMs?: never;
  readonly maximumAgeMs?: never;
}

/**
 * @deprecated Since P1-X05. Use `timeout_ms` / `maximumAge_ms` ({@link WebLocationTiming}).
 * Kept so callers written against the first draft keep compiling; removal is planned once no
 * caller uses it (P1-F02-T11 migrates apps/client). Mixing old and new names is a type error.
 */
export interface LegacyWebLocationTiming {
  /** @deprecated Use `timeout_ms`. */
  readonly timeoutMs: number;
  /** @deprecated Use `maximumAge_ms`. */
  readonly maximumAgeMs: number;
  readonly timeout_ms?: never;
  readonly maximumAge_ms?: never;
}

/** Options for the Web provider. Numeric values come from client config, not literals. */
export type WebLocationOptions = LocationProviderDeps & {
  readonly enableHighAccuracy: boolean;
} & (WebLocationTiming | LegacyWebLocationTiming);

/** Replay speeds offered in the spike UI. */
export type MockSpeed = 1 | 10 | 60;

export interface MockLocationOptions extends LocationProviderDeps {
  /** A trace that already passed validateTrace from @keep-walking/shared. */
  readonly trace: GpsTrace;
  readonly speed?: MockSpeed;
  readonly loop?: boolean;
}

/** Extra controls only the Mock has. The spike UI and tests use these. */
export interface MockPlaybackControls {
  pause(): void;
  resume(): void;
  /** Jumps to a relative trace time in ms (clamped to the trace duration). */
  seek(traceTimeMs: number): void;
  setSpeed(speed: MockSpeed): void;
  /** Current relative trace time in ms. */
  position(): number;
}

export type MockLocationProvider = LocationProvider & MockPlaybackControls;
