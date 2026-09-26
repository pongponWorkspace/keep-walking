/**
 * 8-way compass snap for the direction arrow (F04 flow A2, D-097, J-3, J-5, components.md 13.5).
 * The arrow points at `nav_destination.point` (J-5), snapped to 45-degree steps of true north
 * (the map is always north-up in Phase 2, A-P2-F05-T03-2 — never the device compass). The label
 * uses the same 8-way word, read from `nav.direction*` (never a raw degree, `_variables.directionText`).
 */

export const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

/** copy.th.json key for each compass word (never a Thai literal in code, CLAUDE.md). */
export const DIRECTION_COPY_KEY: Readonly<Record<CompassPoint, string>> = {
  N: 'nav.directionN',
  NE: 'nav.directionNe',
  E: 'nav.directionE',
  SE: 'nav.directionSe',
  S: 'nav.directionS',
  SW: 'nav.directionSw',
  W: 'nav.directionW',
  NW: 'nav.directionNw',
};

const DEGREES_PER_HALF_TURN = 180;
const DEG_TO_RAD = Math.PI / DEGREES_PER_HALF_TURN;
const RAD_TO_DEG = DEGREES_PER_HALF_TURN / Math.PI;
const FULL_CIRCLE_DEG = 360;
const COMPASS_STEP_DEG = 45;

/** Initial great-circle bearing from `from` to `to`, in `[0, 360)` degrees clockwise from north. */
export function bearing_deg(
  from: { readonly lat: number; readonly lng: number },
  to: { readonly lat: number; readonly lng: number },
): number {
  const lat1 = from.lat * DEG_TO_RAD;
  const lat2 = to.lat * DEG_TO_RAD;
  const dLng = (to.lng - from.lng) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const theta = Math.atan2(y, x) * RAD_TO_DEG;
  return (theta + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
}

/** Snaps a bearing to the nearest of the 8 compass points (45-degree steps), north-referenced. */
export function snapBearingToCompass(bearing_deg_value: number): CompassPoint {
  const normalized = ((bearing_deg_value % FULL_CIRCLE_DEG) + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
  const index = Math.round(normalized / COMPASS_STEP_DEG) % COMPASS_POINTS.length;
  const point = COMPASS_POINTS[index];
  if (point === undefined) {
    throw new Error('snapBearingToCompass: unreachable index');
  }
  return point;
}

/** `from` -> `to` snapped directly to its 8-way compass point (components.md 13.5: "updates only
 * when the snapped direction actually changes" is the caller's job, not this pure function's). */
export function compassPointTo(
  from: { readonly lat: number; readonly lng: number },
  to: { readonly lat: number; readonly lng: number },
): CompassPoint {
  return snapBearingToCompass(bearing_deg(from, to));
}
