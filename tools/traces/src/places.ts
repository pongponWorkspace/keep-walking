// Anchor points for synthetic traces. All are public places (parks, public roads) taken from
// data/coverage/*.geojson representative points or placed on public roads. No point is tied to a
// home, a workplace, or a real person's route (D-002, board acceptance P1-F02-T04).
import type { LatLng } from './geo';
import { offset } from './geo';

/** Lumphini Park representative point (data/coverage/excluded.geojson, park of about 0.52 km2). */
export const LUMPHINI_CENTER: LatLng = { lat: 13.7306, lng: 100.54154 };

/** Benjakitti Forest Park representative point (data/coverage/excluded.geojson). */
export const BENJAKITTI_FOREST_CENTER: LatLng = { lat: 13.72908, lng: 100.55476 };

/**
 * Synthetic test rectangle inset inside the bounding box of Benchasiri Park (candidate in
 * data/coverage/candidates.geojson, bbox 13.7291..13.7319 N, 100.56604..100.56852 E).
 * It is NOT the real park polygon: it is a simple shape so edge and check-in expectations can be
 * computed by hand. Written to data/gps-traces/synthetic/polygons/test-rect-benchasiri.geojson.
 */
export const TEST_RECT = {
  id: 'test-rect-benchasiri',
  south: 13.7293,
  north: 13.7317,
  west: 100.5662,
  east: 100.5683,
} as const;

export function insideTestRect(p: LatLng): boolean {
  return (
    p.lat >= TEST_RECT.south &&
    p.lat <= TEST_RECT.north &&
    p.lng >= TEST_RECT.west &&
    p.lng <= TEST_RECT.east
  );
}

export const TEST_RECT_CENTER: LatLng = {
  lat: (TEST_RECT.south + TEST_RECT.north) / 2,
  lng: (TEST_RECT.west + TEST_RECT.east) / 2,
};

/** Where the bench and the pavilion table sit, in metres north/east of the rectangle centre. */
const SPOTS = {
  bench: { north_m: 20, east_m: -30 },
  table: { north_m: -60, east_m: 15 },
} as const;

/** A bench spot inside the test rectangle (open sky, park interior). */
export const BENCH_SPOT: LatLng = offset(TEST_RECT_CENTER, SPOTS.bench.north_m, SPOTS.bench.east_m);

/** A pavilion table inside the test rectangle. */
export const TABLE_SPOT: LatLng = offset(TEST_RECT_CENTER, SPOTS.table.north_m, SPOTS.table.east_m);

/** Start of the synthetic "soi" line in the Silom business district (not a real soi alignment). */
export const SILOM_SOI_START: LatLng = { lat: 13.727, lng: 100.5295 };

/** Start of the synthetic driving line near Rama IV Road, east of Lumphini (public road). */
export const RAMA4_DRIVE_START: LatLng = { lat: 13.7265, lng: 100.538 };

export function testRectGeoJson(): string {
  const { south, north, west, east, id } = TEST_RECT;
  const ring = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  const fc = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id,
          note: 'Synthetic test rectangle for edge-walk, walk-in and teleport traces. Not a real dungeon polygon.',
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };
  return `${JSON.stringify(fc, null, 2)}\n`;
}
