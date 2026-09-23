// Wires MapLibre GL JS to a PMTiles archive through the pmtiles:// protocol.
// No Mapbox or Google SDK (GDD "สถาปัตยกรรมเทคนิค" > "แผนที่"; T09 acceptance).
//
// Does not touch LocationProvider: connecting a live position dot is
// P1-F02-T10. This module only proves the basemap renders.
import { MapLibreMap, addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { MapEnv } from './env';
import { MAP_ATTRIBUTION, buildPlaceholderStyle } from './style';

const PMTILES_PROTOCOL = 'pmtiles';

// Bangkok (Sanam Luang / old city area). A placeholder camera start until a
// config-driven default view exists (data/dungeons); not a balance value.
const BANGKOK_CENTER_LNG = 100.4933;
const BANGKOK_CENTER_LAT = 13.7563;
const PLACEHOLDER_INITIAL_ZOOM = 12;

let pmtilesProtocolRegistered = false;

/** `addProtocol` is process-global in MapLibre; register the handler once. */
function ensurePmtilesProtocolRegistered(): void {
  if (pmtilesProtocolRegistered) {
    return;
  }
  const protocol = new Protocol();
  addProtocol(PMTILES_PROTOCOL, protocol.tile);
  pmtilesProtocolRegistered = true;
}

export interface CreateMapResult {
  readonly map: MapLibreMap;
}

/**
 * Creates the MapLibre map in `container` from `env.tilesUrl`.
 *
 * Returns `undefined` (and creates nothing) when no tiles URL is configured,
 * so the caller can show an honest "not configured" state instead of a blank
 * canvas silently failing to load tiles.
 */
export function createMap(container: HTMLElement, env: MapEnv): CreateMapResult | undefined {
  if (env.tilesUrl === undefined) {
    return undefined;
  }

  ensurePmtilesProtocolRegistered();

  const style = buildPlaceholderStyle({
    tilesUrl: env.tilesUrl,
    glyphsUrl: env.glyphsUrl,
    spriteUrl: env.spriteUrl,
  });

  const map = new MapLibreMap({
    container,
    style,
    center: [BANGKOK_CENTER_LNG, BANGKOK_CENTER_LAT],
    zoom: PLACEHOLDER_INITIAL_ZOOM,
    attributionControl: {
      // Expanded (not compact) so the required text (TL-S13) is always
      // visible, not hidden behind an "i" button on narrow phones.
      compact: false,
      // Set directly on the control, not only on the source: MapLibre's
      // vector source resolves `attribution` from a TileJSON fetch of the
      // source `url`, which stays empty while a tile host is unreachable
      // (offline dev, or the temporary fixture 404ing). `customAttribution`
      // renders immediately regardless of tile/network state.
      customAttribution: MAP_ATTRIBUTION,
    },
  });

  return { map };
}
