// Loads a committed trace (synthetic, owned by location-engineer, or QA's own) and classifies it
// against a polygon into the shape packages/shared/src/run's batch entry points take
// (DungeonSample = GeoSample + inside). Read-only: never writes to data/gps-traces/synthetic/.
import { readFileSync } from 'node:fs';
import type { GpsTrace, TraceSample } from '@keep-walking/shared';
import { validateTrace } from '@keep-walking/shared';
import type { LatLng, PolygonGeometry } from '@keep-walking/geo';
import { pointInPolygon, boundaryDistance_m } from '@keep-walking/geo';
import { REPO_ROOT } from './qa-builder';

export function loadCommittedTrace(relativePath: string): GpsTrace {
  const raw = JSON.parse(readFileSync(`${REPO_ROOT}${relativePath}`, 'utf8'));
  const result = validateTrace(raw);
  if (!result.ok) {
    throw new Error(`${relativePath} failed validateTrace: ${JSON.stringify(result.errors)}`);
  }
  return result.trace;
}

/** A rectangular polygon (same shape as test-rect-benchasiri.geojson) as a GeoJSON Polygon. */
export function rectPolygon(rect: {
  readonly south: number;
  readonly north: number;
  readonly west: number;
  readonly east: number;
}): PolygonGeometry {
  const { south, north, west, east } = rect;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

export interface DungeonSample extends LatLng {
  readonly t_ms: number;
  readonly accuracy_m: number;
  readonly inside: boolean;
}

/** Converts a validated trace's samples into DungeonSample[] against one polygon, in trace order,
 * for checkInBatch / runTimeline. `t_ms` starts at 0 (the trace's own relative time base); tests
 * that need real epoch ms add a `startEpochMs` offset themselves (same as `toLocationSample`). */
export function classifySamples(trace: GpsTrace, polygon: PolygonGeometry): DungeonSample[] {
  return trace.samples.map((s: TraceSample) => ({
    t_ms: s.t,
    lat: s.lat,
    lng: s.lng,
    accuracy_m: s.accuracy,
    inside: pointInPolygon(s, polygon),
  }));
}

export function boundaryDistancesOf(trace: GpsTrace, polygon: PolygonGeometry): number[] {
  return trace.samples.map((s: TraceSample) => boundaryDistance_m(s, polygon));
}

export const TEST_RECT_POLYGON: PolygonGeometry = rectPolygon({
  south: 13.7293,
  north: 13.7317,
  west: 100.5662,
  east: 100.5683,
});
