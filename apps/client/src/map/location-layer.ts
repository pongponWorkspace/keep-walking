/**
 * Feeds the player's own position/accuracy into the `kw-self` GeoJSON source that
 * `kw-light.style.json` already declares (art/direction/map-style.md 6.4, layers `kw-self-dot`,
 * `kw-self-accuracy`, `kw-self-accuracy-edge`): this device's own device-local position only, never
 * another player's (non-negotiable 4). Snaps to each new sample instead of animating between them
 * (design/ux/tokens.json `motion.rule`: "ห้าม animation ต่อเนื่องบนแผนที่" — no continuous animation
 * on the map), and recenters the camera on each sample when follow mode is on.
 *
 * Does not call `addSource`/`addLayer`: the style already ships `kw-self` (empty at load, per
 * map-style.md section 6 "ทุก source kw-* ใน style เริ่มเป็น FeatureCollection ว่าง") and its three
 * layers with the correct colors/sizes (`#FFCC00` dot, `#006699` accuracy fill) — this module only
 * calls `setData`. Not unit-tested (needs a real MapLibre GL context/canvas): covered by e2e, same
 * as `map.ts`.
 */
import { GeoJSONSource } from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LocationSample } from '@keep-walking/location';
import { accuracyCircleRing } from './geo-circle';

export const SELF_SOURCE_ID = 'kw-self';

function selfFeatureCollection(sample: LocationSample): {
  type: 'FeatureCollection';
  features: unknown[];
} {
  const center: [number, number] = [sample.lng, sample.lat];
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'position' },
        geometry: { type: 'Point', coordinates: center },
      },
      {
        type: 'Feature',
        properties: { kind: 'accuracy' },
        geometry: {
          type: 'Polygon',
          coordinates: [accuracyCircleRing({ lng: sample.lng, lat: sample.lat }, sample.accuracy)],
        },
      },
    ],
  };
}

export interface LocationLayerController {
  /** Moves `kw-self`'s dot/circle to `sample`, and recenters the camera when follow mode is on. */
  update(sample: LocationSample): void;
  setFollowMode(enabled: boolean): void;
}

export function createLocationLayerController(
  map: MapLibreMap,
  initialFollow: boolean,
): LocationLayerController {
  let follow = initialFollow;
  return {
    update(sample: LocationSample): void {
      const source = map.getSource(SELF_SOURCE_ID);
      if (source instanceof GeoJSONSource) {
        source.setData(selfFeatureCollection(sample) as never);
      }
      if (follow) {
        map.easeTo({ center: [sample.lng, sample.lat], duration: 0 });
      }
    },
    setFollowMode(enabled: boolean): void {
      follow = enabled;
    },
  };
}
