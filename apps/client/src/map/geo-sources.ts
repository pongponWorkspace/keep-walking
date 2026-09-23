/**
 * Loads `data/map/playarea-mask.geojson` and `data/map/provinces.geojson` and pushes them into the
 * `kw-playarea-mask`/`kw-provinces` sources `kw-light.style.json` already declares empty
 * (docs/tech/F02-map-location-spike.md section 15.1, D-037, D-043, art/direction/map-style.md 6.2,
 * 6.3). Uses the same `?url` + `fetch` + `setData` pattern the tech note points at
 * (gps-trace-format.md section 5's `import.meta.glob` pattern, applied to a single known file each):
 * bundled by Vite as a same-origin asset, so this never depends on an external host.
 *
 * A missing/invalid file never breaks the map: it stays the empty `FeatureCollection` the style
 * shipped with (no black zone / no province lines, but everything else still works) and this only
 * `console.warn`s — matching the plan-sync note ("ถ้า P1-H07 ยังไม่เสร็จใช้ FeatureCollection ว่างที่
 * path เดิมและไม่ throw") and section 15.1's own "โหลดไม่สำเร็จ → แผนที่ยังใช้งานได้ ... ไม่ crash".
 */
import { GeoJSONSource } from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import playareaMaskUrl from '../../../../data/map/playarea-mask.geojson?url';
import provincesUrl from '../../../../data/map/provinces.geojson?url';

export const PLAYAREA_MASK_SOURCE_ID = 'kw-playarea-mask';
export const PROVINCES_SOURCE_ID = 'kw-provinces';

async function fetchGeoJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function loadInto(map: MapLibreMap, sourceId: string, url: string): Promise<void> {
  try {
    const geojson = await fetchGeoJson(url);
    const source = map.getSource(sourceId);
    if (source instanceof GeoJSONSource) {
      source.setData(geojson as never);
    }
  } catch (error: unknown) {
    // Dev/ops-facing only: a file path, never a player's position (CLAUDE.md; section 15.1).
    console.warn(`map: failed to load ${sourceId} from ${url}`, error);
  }
}

/** Fetches both files in parallel (section 15.1: "ขนานกับ style") and feeds each into its source. */
export async function loadGameGeoSources(map: MapLibreMap): Promise<void> {
  await Promise.all([
    loadInto(map, PLAYAREA_MASK_SOURCE_ID, playareaMaskUrl),
    loadInto(map, PROVINCES_SOURCE_ID, provincesUrl),
  ]);
}
