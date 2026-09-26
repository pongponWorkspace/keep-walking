// Planar projections used at build time only.
// - utm47n: WGS 84 / UTM zone 47N (EPSG:32647), the projection of tools/coverage (METHOD 5), so
//   area_m2 here matches candidates.geojson. Forward transverse Mercator with the Krueger n-series
//   to third order (Karney 2011, "Transverse Mercator with an accuracy of a few nanometers");
//   error well under 1 mm inside the zone, which is far below the 0.1 m2 rounding of area_m2.
// - equirectangular: x = lng * cos(lat0), around a local centre, in metres (ADR 0003 11.3), used
//   for polylabel so its precision is in metres.
/* eslint-disable @typescript-eslint/no-magic-numbers -- ellipsoid and series constants of the
   projection formulas (EPSG:32647 definition, Karney 2011), not balance values */
import { DEG_TO_RAD, EARTH_MEAN_RADIUS_M } from '@keep-walking/geo';
import type { LngLat } from './types';

export type Projector = (p: readonly number[]) => [number, number];

const WGS84_A = 6_378_137;
const WGS84_F = 1 / 298.257223563;
const UTM_K0 = 0.9996;
const UTM_FALSE_EASTING = 500_000;
const UTM47_CENTRAL_MERIDIAN_DEG = 99;

const N = WGS84_F / (2 - WGS84_F);
const RECTIFYING_A = (WGS84_A / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64);
const ALPHA = [
  N / 2 - (2 / 3) * N ** 2 + (5 / 16) * N ** 3,
  (13 / 48) * N ** 2 - (3 / 5) * N ** 3,
  (61 / 240) * N ** 3,
] as const;
const E_TERM = (2 * Math.sqrt(N)) / (1 + N);

/** [lng, lat] degrees → [easting, northing] metres in UTM zone 47N. */
export function utm47n(p: readonly number[]): [number, number] {
  const lng = p[0] as number;
  const lat = p[1] as number;
  const phi = lat * DEG_TO_RAD;
  const dLambda = (lng - UTM47_CENTRAL_MERIDIAN_DEG) * DEG_TO_RAD;
  const sinPhi = Math.sin(phi);
  const t = Math.sinh(Math.atanh(sinPhi) - E_TERM * Math.atanh(E_TERM * sinPhi));
  const xiP = Math.atan2(t, Math.cos(dLambda));
  const etaP = Math.atanh(Math.sin(dLambda) / Math.sqrt(1 + t * t));
  let xi = xiP;
  let eta = etaP;
  ALPHA.forEach((alpha, i) => {
    const j2 = 2 * (i + 1);
    xi += alpha * Math.sin(j2 * xiP) * Math.cosh(j2 * etaP);
    eta += alpha * Math.cos(j2 * xiP) * Math.sinh(j2 * etaP);
  });
  return [UTM_FALSE_EASTING + UTM_K0 * RECTIFYING_A * eta, UTM_K0 * RECTIFYING_A * xi];
}

export interface LocalFrame {
  forward: Projector;
  inverse: (xy: readonly number[]) => LngLat;
}

/** Equirectangular frame centred on `origin` (ADR 0003 11.3). Metres on both axes. */
export function equirectangular(origin: LngLat): LocalFrame {
  const [lng0, lat0] = origin;
  const mPerDegLat = EARTH_MEAN_RADIUS_M * DEG_TO_RAD;
  const mPerDegLng = mPerDegLat * Math.cos(lat0 * DEG_TO_RAD);
  return {
    forward: (p) => [
      ((p[0] as number) - lng0) * mPerDegLng,
      ((p[1] as number) - lat0) * mPerDegLat,
    ],
    inverse: (xy) => [lng0 + (xy[0] as number) / mPerDegLng, lat0 + (xy[1] as number) / mPerDegLat],
  };
}
