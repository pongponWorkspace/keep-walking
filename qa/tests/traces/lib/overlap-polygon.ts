// A second polygon that overlaps the location-engineer's test-rect-benchasiri.geojson (the fixed
// polygon synthetic-edge-walk-01 / synthetic-walk-in-01 / synthetic-teleport-spoof-01 use), for
// F04-R03 / E9 ("polygon ซ้อน", board acceptance "polygon ซ้อน"): a run confirmed on one polygon
// must ignore presence in the other. Owned by qa-tester (data/gps-traces/qa/, protocol section 7),
// not by location-engineer's tools/traces — this file only *reads* TEST_RECT's shape, it never
// edits tools/traces or data/gps-traces/synthetic/.
import { TEST_RECT } from '../../../../tools/traces/src/places';

/**
 * Overlaps the eastern half of TEST_RECT and extends further east: samples west of the shared
 * midpoint are inside TEST_RECT only, samples between the midpoint and TEST_RECT.east are inside
 * both, and samples east of TEST_RECT.east are inside this rectangle only.
 */
export const QA_OVERLAP_RECT = {
  id: 'qa-rect-overlap-b',
  south: TEST_RECT.south,
  north: TEST_RECT.north,
  west: (TEST_RECT.west + TEST_RECT.east) / 2,
  east: TEST_RECT.east + (TEST_RECT.east - TEST_RECT.west) / 2,
} as const;

export function insideQaOverlapRect(p: { readonly lat: number; readonly lng: number }): boolean {
  return (
    p.lat >= QA_OVERLAP_RECT.south &&
    p.lat <= QA_OVERLAP_RECT.north &&
    p.lng >= QA_OVERLAP_RECT.west &&
    p.lng <= QA_OVERLAP_RECT.east
  );
}

export function qaOverlapRectGeoJson(): string {
  const { south, north, west, east, id } = QA_OVERLAP_RECT;
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
          note:
            'QA-owned second test rectangle overlapping the eastern half of ' +
            'data/gps-traces/synthetic/polygons/test-rect-benchasiri.geojson (location-engineer). ' +
            'Not a real dungeon polygon. Used only for F04-R03/E9 overlap cases (P2-F04-T19).',
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };
  return `${JSON.stringify(fc, null, 2)}\n`;
}
