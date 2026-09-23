/**
 * Turns a `ProviderSelection` (src/location/select.ts) into a real `LocationProvider`
 * (`@keep-walking/location`) and wires its callbacks. This is the only place in the client that
 * constructs a provider: everywhere else talks to the `LocationProvider` interface only
 * (CLAUDE.md "Use the LocationProvider interface only").
 */
import {
  createCapacitorLocationProvider,
  createMockLocationProvider,
  createWebLocationProvider,
} from '@keep-walking/location';
import type {
  LocationError,
  LocationProvider,
  LocationProviderDeps,
  LocationProviderState,
  LocationSample,
  Unsubscribe,
} from '@keep-walking/location';
import type { AppPrivacyConfig, ClientRuntimeConfig } from '../config/runtime';
import type { ProviderSelection } from './select';
import { listTraceIds, loadTraceById } from './traces';

/**
 * Builds the provider named by `selection.provider`. `deps` (Clock/VisibilitySource) is for
 * tests; production omits it and every provider falls back to the real platform.
 */
export async function createLocationProvider(
  selection: ProviderSelection,
  clientConfig: ClientRuntimeConfig,
  privacyConfig: AppPrivacyConfig,
  deps: LocationProviderDeps = {},
): Promise<LocationProvider> {
  switch (selection.provider) {
    case 'web':
      return createWebLocationProvider({
        enableHighAccuracy: clientConfig.locationWeb.enableHighAccuracy,
        timeout_ms: clientConfig.locationWeb.timeout_ms,
        maximumAge_ms: clientConfig.locationWeb.maximumAge_ms,
        ...deps,
      });
    case 'capacitor':
      return createCapacitorLocationProvider(deps);
    case 'mock': {
      const id = selection.traceId ?? listTraceIds()[0];
      if (id === undefined) {
        throw new Error('no gps trace is available for the mock provider');
      }
      const trace = await loadTraceById(id);
      return createMockLocationProvider({
        trace,
        speed: selection.speed,
        loop: selection.loop,
        validation: { minTrim_m: privacyConfig.rawTraceExport.rawTraceTrim_m },
        ...deps,
      });
    }
  }
}

export interface GpsSessionCallbacks {
  readonly onSample?: (sample: LocationSample) => void;
  readonly onError?: (error: LocationError) => void;
  readonly onStateChange?: (state: LocationProviderState) => void;
}

/** Subscribes every callback and returns one function that undoes all three subscriptions. */
export function wireProvider(
  provider: LocationProvider,
  callbacks: GpsSessionCallbacks,
): Unsubscribe {
  const unsubscribes: Unsubscribe[] = [
    provider.onSample((sample) => callbacks.onSample?.(sample)),
    provider.onError((error) => callbacks.onError?.(error)),
    provider.onStateChange((state) => callbacks.onStateChange?.(state)),
  ];
  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
