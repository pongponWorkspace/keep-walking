/**
 * `window.__kwSpike`: the one thing e2e is allowed to read, and only when `hud=1`
 * (docs/tech/F02-map-location-spike.md section 13, TC-MAP-02/03/04). Never present otherwise —
 * QA and the tech gate can grep a `hud=0`/no-flag build for `__kwSpike` and expect nothing.
 *
 * P1-F02-T11 extends this object with byte counters and FPS numbers; this task only adds what
 * TC-MAP-02/03/04 need (position, provider kind/state, computed gps display state).
 */
import type {
  LocationProviderKind,
  LocationProviderState,
  LocationSample,
} from '@keep-walking/location';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GpsDisplayState } from '../copy/gps-state';
import type { SummaryRow } from './csv-export';

export interface SpikePosition {
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
  readonly timestamp: number;
}

/**
 * HUD measurements (P1-F02-T11): the exact same shape as one `summary-<session_id>.csv` row
 * (`debug/csv-export.ts`'s `SummaryRow`) — no coordinates, only aggregate numbers — refreshed once
 * a second by `debug/hud-panel.ts` while `hud=1`. `undefined` when the HUD panel is not mounted
 * (i.e. `hud=0`/unset; `__kwSpike` itself does not exist in that case at all, see below).
 */
export type SpikeHudMetrics = SummaryRow;

export interface SpikeHook {
  provider: LocationProviderKind;
  state: LocationProviderState;
  position: SpikePosition | null;
  gpsDisplay: GpsDisplayState;
  hud?: SpikeHudMetrics;
  /** The live MapLibre `Map` instance, when one exists (P1-F02-T11: undefined until `createMap`
   * resolves, e.g. while VITE_TILES_URL etc. are unset). Only ever this device's own map/camera —
   * never a channel for another player's data. Lets QA/T14's field-walk kit (and this task's own
   * manual zoom/screenshot check, see the report) drive the camera without a UI control. */
  map?: MapLibreMap;
}

declare global {
  interface Window {
    __kwSpike?: SpikeHook;
  }
}

/** Installs `window.__kwSpike` and returns it so callers can mutate its fields in place. */
export function installSpikeHook(provider: LocationProviderKind): SpikeHook {
  const hook: SpikeHook = { provider, state: 'idle', position: null, gpsDisplay: 'none' };
  window.__kwSpike = hook;
  return hook;
}

export function sampleToSpikePosition(sample: LocationSample): SpikePosition {
  return {
    lat: sample.lat,
    lng: sample.lng,
    accuracy: sample.accuracy,
    timestamp: sample.timestamp,
  };
}

/** Removes the hook (so a re-init, e.g. hot reload, never leaves a stale one behind). */
export function removeSpikeHook(): void {
  delete window.__kwSpike;
}
