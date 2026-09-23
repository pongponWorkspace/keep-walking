// Public surface of @keep-walking/location. Interface owner: tech-lead (P1-F02-T03).
// Implementations (web/, mock/, capacitor/) by the location-engineer (P1-F02-T05).
export type {
  Clock,
  LocationError,
  LocationErrorCode,
  LocationPermission,
  LocationProvider,
  LocationProviderDeps,
  LocationProviderKind,
  LocationProviderState,
  LocationSample,
  MockLocationOptions,
  MockLocationProvider,
  MockPlaybackControls,
  MockSpeed,
  TimerHandle,
  Unsubscribe,
  VisibilitySource,
  WebLocationOptions,
} from './types';

// Real-platform defaults for the injectable dependencies.
export { alwaysVisible, documentVisibility, systemClock } from './web/platform';

// Web: the only place that touches navigator.geolocation.
export type {
  GeolocationErrorLike,
  GeolocationLike,
  GeolocationPositionLike,
  GeolocationPositionOptionsLike,
  PermissionsLike,
  WebLocationProviderOptions,
} from './web/web-provider';
export { WebLocationProvider, createWebLocationProvider } from './web/web-provider';

// Mock: trace replay through the injected Clock.
export type { TraceLoadResult } from './mock/load-trace';
export { InvalidTraceError, loadTrace } from './mock/load-trace';
export type { MockLocationProviderOptions } from './mock/mock-provider';
export { MockTraceLocationProvider, createMockLocationProvider } from './mock/mock-provider';

// Capacitor: stub until Phase 8.
export {
  CAPACITOR_NOT_IMPLEMENTED_MESSAGE,
  CapacitorLocationProvider,
  createCapacitorLocationProvider,
} from './capacitor/capacitor-provider';
