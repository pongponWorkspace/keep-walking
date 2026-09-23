// Wires MapLibre GL JS to the real Bangkok basemap (art/direction/map-style/kw-light.style.json,
// D-031's dual TileJSON/pmtiles support). No Mapbox or Google SDK (GDD "สถาปัตยกรรมเทคนิค" >
// "แผนที่"; T09 acceptance).
//
// Does not touch LocationProvider: connecting a live position dot is P1-F02-T10, and the
// `kw-self` layers the style ships are fed by `map/location-layer.ts` (P1-F02-T11).
import { MapLibreMap } from 'maplibre-gl';
import type { MapEnv } from './env';
import type { ClientRuntimeConfig } from './config/runtime';
import { ensureMapProtocolsRegistered } from './map/protocol';
import { loadRuntimeStyle } from './map/style';
import { ensureMapWorkerUrl } from './map/worker';
import type { RuntimeMapEnv } from './map/style';

// Bangkok (Sanam Luang / old city area). A placeholder camera start until a config-driven default
// view exists (data/dungeons); not a balance value. kw-light.style.json's own `center`/`zoom` are
// used instead whenever the style provides them (see `resolveInitialCamera`).
const BANGKOK_CENTER_LNG = 100.4933;
const BANGKOK_CENTER_LAT = 13.7563;
const PLACEHOLDER_INITIAL_ZOOM = 12;

/**
 * `Map`'s `fadeDuration` cross-fades symbols across a tile-load boundary; forced to 0
 * (design/ux/tokens.json `motion.rule`: "ห้าม animation ต่อเนื่องบนแผนที่" — no continuous
 * animation on the map; P1-F02-T11 acceptance).
 */
const FADE_DURATION_MS = 0;

export interface CreateMapResult {
  readonly map: MapLibreMap;
  /** Best-effort id for the summary CSV's `tileset_id` column (gps-trace-format.md 4.1): the last
   * path segment before the file name of `VITE_TILES_URL`, e.g. `pm4-20260923-z15` from
   * `.../tiles/pm4-20260923-z15/tiles.json`, or the `.pmtiles` file's own base name. `undefined`
   * when the URL shape does not fit either pattern — never a fatal error, since this is measurement
   * metadata, not something the map needs to render. */
  readonly tilesetId: string | undefined;
}

export function deriveTilesetId(tilesUrl: string): string | undefined {
  const withoutQuery = tilesUrl.split(/[?#]/)[0] ?? tilesUrl;
  const segments = withoutQuery.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) {
    return undefined;
  }
  const last = segments[segments.length - 1];
  if (last === undefined) {
    return undefined;
  }
  if (last.endsWith('.pmtiles')) {
    return last.slice(0, -'.pmtiles'.length);
  }
  if (last === 'tiles.json' && segments.length >= 2) {
    return segments[segments.length - 2];
  }
  return undefined;
}

function isRuntimeMapEnv(env: MapEnv): env is RuntimeMapEnv & MapEnv {
  return env.tilesUrl !== undefined && env.glyphsUrl !== undefined && env.spriteUrl !== undefined;
}

function resolveInitialCamera(style: {
  readonly center?: readonly [number, number];
  readonly zoom?: number;
}): { center: [number, number]; zoom: number } {
  return {
    center:
      style.center !== undefined
        ? [style.center[0], style.center[1]]
        : [BANGKOK_CENTER_LNG, BANGKOK_CENTER_LAT],
    zoom: style.zoom ?? PLACEHOLDER_INITIAL_ZOOM,
  };
}

/**
 * Creates the MapLibre map in `container` from `env`'s three `VITE_*` values.
 *
 * Returns `undefined` (and creates nothing) when any of the three is not configured, so the
 * caller can show an honest "not configured" state instead of a blank canvas silently failing to
 * load tiles, glyphs, or the sprite (all three are required to fully substitute
 * kw-light.style.json's placeholders — art/direction/map-style.md section 3).
 */
export async function createMap(
  container: HTMLElement,
  env: MapEnv,
  clientConfig: ClientRuntimeConfig,
): Promise<CreateMapResult | undefined> {
  if (!isRuntimeMapEnv(env)) {
    return undefined;
  }

  // Must precede `new MapLibreMap(...)`: without it the worker never starts in a Vite build and
  // `load` never fires (P1-X23, see map/worker.ts).
  ensureMapWorkerUrl();
  ensureMapProtocolsRegistered();
  const style = await loadRuntimeStyle(env);
  const camera = resolveInitialCamera(style as { center?: [number, number]; zoom?: number });

  const map = new MapLibreMap({
    container,
    // See map/style.ts's header comment on why this workspace never imports
    // `@maplibre/maplibre-gl-style-spec`'s `StyleSpecification` type directly (map-style.md 15.3):
    // `ConstructorParameters` reads the exact type `MapLibreMap` itself expects instead.
    style: style as Exclude<ConstructorParameters<typeof MapLibreMap>[0]['style'], undefined>,
    center: camera.center,
    zoom: camera.zoom,
    maxZoom: clientConfig.mapView.maxZoom,
    fadeDuration: FADE_DURATION_MS,
    attributionControl: {
      // Expanded (not compact) so the required text (TL-S13) is always visible, not hidden behind
      // an "i" button on narrow phones.
      compact: false,
    },
  });

  return { map, tilesetId: deriveTilesetId(env.tilesUrl) };
}
