/**
 * Web LocationProvider over the Geolocation API (docs/tech/F02-map-location-spike.md section 4).
 *
 * This file is the ONLY place in the repo that touches `navigator.geolocation` (tech gate greps
 * for it). It delivers raw fixes; it never filters by an accuracy threshold, computes distance,
 * or decides anything reward-related. Low accuracy is passed through unchanged so the client can
 * derive `gps.lowAccuracy` from config (`location.json#homeState.maxAccuracy_m`) and the server can judge it.
 *
 * Nothing here logs. Coordinates never reach a console at any log level.
 */
import type { LocationSample } from '@keep-walking/shared';
import type {
  Clock,
  LocationError,
  LocationErrorCode,
  LocationPermission,
  LocationProvider,
  LocationProviderState,
  Unsubscribe,
  VisibilitySource,
  WebLocationOptions,
} from '../types';
import { ListenerSet } from './listeners';
import { documentVisibility, systemClock } from './platform';

/** W3C GeolocationPositionError codes. */
enum GeolocationErrorCode {
  PermissionDenied = 1,
  PositionUnavailable = 2,
  Timeout = 3,
}

const FULL_TURN_DEG = 360;

/** The subset of `GeolocationCoordinates` the provider reads. */
export interface GeolocationCoordinatesLike {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
  readonly speed?: number | null;
  readonly heading?: number | null;
}

export interface GeolocationPositionLike {
  readonly coords: GeolocationCoordinatesLike;
  readonly timestamp: number;
}

export interface GeolocationErrorLike {
  readonly code: number;
  readonly message?: string;
}

export interface GeolocationPositionOptionsLike {
  readonly enableHighAccuracy: boolean;
  readonly timeout: number;
  readonly maximumAge: number;
}

/** The subset of `Geolocation` the provider uses (only watchPosition and clearWatch). */
export interface GeolocationLike {
  watchPosition(
    success: (position: GeolocationPositionLike) => void,
    error: (error: GeolocationErrorLike) => void,
    options: GeolocationPositionOptionsLike,
  ): number;
  clearWatch(watchId: number): void;
}

/** The subset of the Permissions API the provider uses. */
export interface PermissionsLike {
  query(descriptor: { name: 'geolocation' }): Promise<{ readonly state: string }>;
}

export interface WebLocationProviderOptions extends WebLocationOptions {
  /** Defaults to `navigator.geolocation`. `null` simulates a platform without geolocation. */
  readonly geolocation?: GeolocationLike | null;
  /** Defaults to `navigator.permissions`. `null` simulates iOS Safari without the API. */
  readonly permissions?: PermissionsLike | null;
}

function defaultGeolocation(): GeolocationLike | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  // Node 21+ has a global navigator without geolocation, hence the undefined check.
  return (navigator.geolocation as GeolocationLike | undefined) ?? null;
}

function defaultPermissions(): PermissionsLike | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const permissions = navigator.permissions as PermissionsLike | undefined;
  return typeof permissions?.query === 'function' ? permissions : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Converts a platform fix to a LocationSample, or null when the fix is malformed
 * (non-finite coordinates or timestamp, non-positive accuracy). Optional fields are copied only
 * when the platform reports a usable value (null and NaN are common for speed and heading).
 */
export function toSampleFromPosition(position: GeolocationPositionLike): LocationSample | null {
  const { coords, timestamp } = position;
  if (
    !isFiniteNumber(timestamp) ||
    !isFiniteNumber(coords.latitude) ||
    !isFiniteNumber(coords.longitude) ||
    !isFiniteNumber(coords.accuracy) ||
    coords.accuracy <= 0
  ) {
    return null;
  }
  const speed = isFiniteNumber(coords.speed) && coords.speed >= 0 ? coords.speed : undefined;
  const heading = isFiniteNumber(coords.heading)
    ? ((coords.heading % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG
    : undefined;
  return {
    timestamp,
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
    ...(speed === undefined ? {} : { speed }),
    ...(heading === undefined ? {} : { heading }),
  };
}

function mapErrorCode(code: number): LocationErrorCode {
  switch (code) {
    case GeolocationErrorCode.PermissionDenied:
      return 'permission-denied';
    case GeolocationErrorCode.Timeout:
      return 'timeout';
    default:
      return 'position-unavailable';
  }
}

function mapPermissionState(state: string): LocationPermission {
  return state === 'granted' || state === 'denied' || state === 'prompt' ? state : 'unknown';
}

/** States the page can return to after a `suspended` period. */
type ResumableState = 'starting' | 'running';

export class WebLocationProvider implements LocationProvider {
  readonly kind = 'web' as const;

  private currentState: LocationProviderState = 'idle';
  private readonly clock: Clock;
  private readonly visibility: VisibilitySource;
  private readonly geolocation: GeolocationLike | null;
  private readonly permissions: PermissionsLike | null;
  private readonly positionOptions: GeolocationPositionOptionsLike;
  private readonly samples = new ListenerSet<LocationSample>();
  private readonly errors = new ListenerSet<LocationError>();
  private readonly states = new ListenerSet<LocationProviderState>();
  private watchId: number | null = null;
  private visibilityUnsubscribe: Unsubscribe | null = null;
  private resumeState: ResumableState = 'starting';
  private lastTimestamp = Number.NEGATIVE_INFINITY;
  /** Permission learned from start() when the Permissions API is missing (iOS Safari). */
  private observedPermission: LocationPermission = 'unknown';
  private pendingStart: { promise: Promise<void>; resolve: () => void } | null = null;

  constructor(options: WebLocationProviderOptions) {
    this.clock = options.clock ?? systemClock;
    this.visibility = options.visibility ?? documentVisibility();
    this.geolocation =
      options.geolocation === undefined ? defaultGeolocation() : options.geolocation;
    this.permissions =
      options.permissions === undefined ? defaultPermissions() : options.permissions;
    this.positionOptions = {
      enableHighAccuracy: options.enableHighAccuracy,
      timeout: options.timeoutMs,
      maximumAge: options.maximumAgeMs,
    };
  }

  get state(): LocationProviderState {
    return this.currentState;
  }

  async getPermission(): Promise<LocationPermission> {
    if (this.geolocation === null) {
      return 'unsupported';
    }
    if (this.permissions !== null) {
      try {
        const status = await this.permissions.query({ name: 'geolocation' });
        return mapPermissionState(status.state);
      } catch {
        // Some browsers throw for the geolocation descriptor; fall through to what we observed.
      }
    }
    return this.observedPermission;
  }

  start(): Promise<void> {
    if (this.pendingStart !== null) {
      return this.pendingStart.promise;
    }
    if (this.currentState === 'running' || this.currentState === 'suspended') {
      return Promise.resolve();
    }
    if (this.geolocation === null) {
      this.fail('unsupported', 'Geolocation API is not available on this platform');
      return Promise.resolve();
    }
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    this.pendingStart = { promise, resolve };
    this.visibilityUnsubscribe = this.visibility.subscribe((visible) => {
      this.handleVisibility(visible);
    });
    this.resumeState = 'starting';
    if (this.visibility.isVisible()) {
      this.setState('starting');
      this.beginWatch();
    } else {
      this.setState('suspended');
    }
    return promise;
  }

  stop(): void {
    if (this.currentState === 'stopped') {
      return;
    }
    this.teardown();
    this.setState('stopped');
  }

  onSample(listener: (sample: LocationSample) => void): Unsubscribe {
    return this.samples.add(listener);
  }

  onError(listener: (error: LocationError) => void): Unsubscribe {
    return this.errors.add(listener);
  }

  onStateChange(listener: (state: LocationProviderState) => void): Unsubscribe {
    return this.states.add(listener);
  }

  private beginWatch(): void {
    if (this.geolocation === null || this.watchId !== null) {
      return;
    }
    this.watchId = this.geolocation.watchPosition(
      (position) => {
        this.handlePosition(position);
      },
      (error) => {
        this.handleError(error);
      },
      this.positionOptions,
    );
  }

  private endWatch(): void {
    if (this.geolocation !== null && this.watchId !== null) {
      this.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
  }

  private handlePosition(position: GeolocationPositionLike): void {
    if (this.currentState !== 'starting' && this.currentState !== 'running') {
      return;
    }
    const sample = toSampleFromPosition(position);
    // Browsers may repeat a cached fix: only strictly newer fix times are delivered.
    if (sample === null || sample.timestamp <= this.lastTimestamp) {
      return;
    }
    this.lastTimestamp = sample.timestamp;
    this.observedPermission = 'granted';
    this.resumeState = 'running';
    this.setState('running');
    this.samples.emit(sample);
  }

  private handleError(error: GeolocationErrorLike): void {
    if (this.currentState !== 'starting' && this.currentState !== 'running') {
      return;
    }
    const code = mapErrorCode(error.code);
    if (code === 'permission-denied') {
      // Fatal: no retry loop (tech note F6). Only a new start() tries again.
      this.observedPermission = 'denied';
      this.fail(code, 'Location permission was denied');
      return;
    }
    // position-unavailable and timeout keep the watch alive; the platform keeps trying.
    this.errors.emit({
      code,
      message: code === 'timeout' ? 'No position fix within the timeout' : 'No position fix now',
      at: this.clock.now(),
      fatal: false,
    });
  }

  private handleVisibility(visible: boolean): void {
    if (!visible && (this.currentState === 'starting' || this.currentState === 'running')) {
      this.resumeState = this.currentState;
      this.endWatch();
      this.setState('suspended');
    } else if (visible && this.currentState === 'suspended') {
      this.setState(this.resumeState);
      this.beginWatch();
    }
  }

  private fail(code: LocationErrorCode, message: string): void {
    this.teardown();
    this.errors.emit({ code, message, at: this.clock.now(), fatal: true });
    this.setState('error');
  }

  private teardown(): void {
    this.endWatch();
    this.visibilityUnsubscribe?.();
    this.visibilityUnsubscribe = null;
  }

  private setState(next: LocationProviderState): void {
    if (next !== 'idle' && next !== 'starting' && this.pendingStart !== null) {
      const { resolve } = this.pendingStart;
      this.pendingStart = null;
      resolve();
    }
    if (next === this.currentState) {
      return;
    }
    this.currentState = next;
    this.states.emit(next);
  }
}

/** Creates the Web provider. PositionOptions values come from the caller (client config). */
export function createWebLocationProvider(options: WebLocationProviderOptions): LocationProvider {
  return new WebLocationProvider(options);
}
