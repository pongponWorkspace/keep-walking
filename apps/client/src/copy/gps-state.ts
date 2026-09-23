/**
 * Typed `GpsDisplayState -> copy key` table (tech-lead D-046: `copy.th.json#_meta.gpsStateMap` is
 * documentation only, this file is the real wiring). Names match `gps.*` exactly as declared by
 * design/ux/flows/F03-core-loop.md 9.5 (N-7) so nobody has to guess a state's key.
 *
 * `GpsDisplayState` is derived UI state, not `LocationProviderState` itself: several provider
 * states/errors collapse to the same label (`idle`/`running`/`stopped` all show nothing), and one
 * of them (`lowAccuracy`) is not a provider state at all but a derived condition on `accuracy`
 * (config/balance/location.json#homeState). See src/location/gps-status.ts for the state machine
 * that computes this from the LocationProvider callbacks.
 */

export const GPS_DISPLAY_STATES = [
  'none',
  'searching',
  'off',
  'denied',
  'unsupported',
  'lowAccuracy',
] as const;
export type GpsDisplayState = (typeof GPS_DISPLAY_STATES)[number];

/** One-shot messages that show as a toast and then disappear (gpsStateMap: "toast สั้นแล้วหาย"). */
export const GPS_TOASTS = ['restored', 'suspended'] as const;
export type GpsToast = (typeof GPS_TOASTS)[number];

export interface GpsStateCopy {
  /** Persistent label shown in the GPS pill (design/ux/components.md 2.2 `.gps-pill`). */
  readonly label: string;
  /** Longer explanation shown under the label, when copy.th.json declares one. */
  readonly body?: string;
}

/** `null` = no persistent label for this display state (idle/running/stopped alike). */
export const GPS_DISPLAY_COPY: Readonly<Record<GpsDisplayState, GpsStateCopy | null>> = {
  none: null,
  searching: { label: 'gps.searching' },
  off: { label: 'gps.off', body: 'gps.offBody' },
  denied: { label: 'gps.denied', body: 'gps.deniedBody' },
  unsupported: { label: 'gps.unsupported' },
  lowAccuracy: { label: 'gps.lowAccuracy', body: 'gps.lowAccuracyBody' },
};

/** Toast copy keys (gpsStateMap: gps.suspended fires specifically on the suspended -> running
 * transition; gps.restored fires when recovering from any other display problem). */
export const GPS_TOAST_COPY: Readonly<Record<GpsToast, string>> = {
  restored: 'gps.restored',
  suspended: 'gps.suspended',
};

/** Network-offline banner (design/ux/components.md 6: `.banner.info`), independent of the
 * LocationProvider's own state (this is "no internet", not "no GPS fix"). */
export const GPS_OFFLINE_COPY_KEY = 'gps.offline';
