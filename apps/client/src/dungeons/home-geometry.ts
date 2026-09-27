/**
 * Loads the two geometries `home-tracker.ts` needs for `homeState()`'s `HomeStateParams`
 * (tech note F06 section 9.1, P2-X27's own doc comment): the play-area mask
 * (`config: unlocks.home.outOfAreaMaskPath`, always present, D-064) and the launch-area mask
 * (`config: unlocks.home.launchAreaMaskPath`, `null` = "not shipped" -> R55's fallback).
 *
 * Both files are `FeatureCollection`s (same convention as `map/geo-sources.ts`, which loads the
 * identical play-area file into a MapLibre source): this module is the one place that reads their
 * `features[].geometry` back out as a plain `@keep-walking/geo` `PolygonGeometry`, the shape
 * `home/home-state.ts` (P2-X27, never edited by this task) actually asks for.
 *
 * - `playarea-mask.geojson` ships exactly one `Polygon` feature already in the "inverse mask" shape
 *   `inPlayArea` expects (an outer ring around the whole fixture space with the real play area cut
 *   out as a hole) — used as-is, never rebuilt.
 * - `launch-area.geojson` ships one `Polygon` feature per launch district (3 in Phase 2, P2-H01) —
 *   merged into a single `MultiPolygon` so `pointInPolygon` can test all of them in one call, the
 *   same "one call, whichever member contains the point" contract `packages/geo` already documents
 *   for a `MultiPolygon`.
 *
 * Fail-honest fallbacks (never throw, tech note F06 9.1 "R55 ทางสำรองเท่านั้น... เมื่อโหลดไฟล์...
 * ไม่สำเร็จ"):
 * - play-area mask fails to load/parse -> a mask with no holes at all, so `inPlayArea` is `false`
 *   everywhere (fail-closed: nobody is ever wrongly shown `near`/`far` while the real mask is
 *   unknown, they see `out_of_area` instead, same as a genuinely-outside position).
 * - launch-area mask fails to load/parse, or the config path is `null` -> `null`, which is exactly
 *   R55's own trigger for "not shipped yet" (`home-state.ts`'s own contract for that field).
 */
import type { PolygonGeometry } from '@keep-walking/geo';
import playareaMaskUrl from '../../../../data/map/playarea-mask.geojson?url';
import launchAreaUrl from '../../../../data/map/launch-area.geojson?url';

/** A mask with no holes: `inPlayArea` (packages/geo) is `pointInPolygon(pt, mask) === false` AND
 * "inside a hole" — with zero holes the second half is always `false`, so the whole function is
 * always `false`. A single degenerate ring is enough; nothing ever queries its coordinates. */
const NO_HOLES_FALLBACK_MASK: PolygonGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ],
};

interface GeoJsonGeometryLike {
  readonly type: string;
  readonly coordinates: unknown;
}

interface GeoJsonFeatureLike {
  readonly geometry?: GeoJsonGeometryLike;
  readonly properties?: { readonly id?: unknown };
}

interface GeoJsonFeatureCollectionLike {
  readonly type?: string;
  readonly features?: readonly GeoJsonFeatureLike[];
}

async function fetchFeatureCollection(url: string): Promise<GeoJsonFeatureCollectionLike> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as GeoJsonFeatureCollectionLike;
}

/** The play-area mask: the single feature's own geometry, already the inverse-mask
 * `Polygon` `home-state.ts` expects. Dev/ops-facing log only (never a coordinate, CLAUDE.md). */
export async function loadPlayAreaMask(url: string = playareaMaskUrl): Promise<PolygonGeometry> {
  try {
    const fc = await fetchFeatureCollection(url);
    const geometry = fc.features?.[0]?.geometry;
    if (
      geometry === undefined ||
      (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    ) {
      throw new Error('unexpected geometry shape');
    }
    return geometry as unknown as PolygonGeometry;
  } catch (error: unknown) {
    console.warn(`home-geometry: failed to load the play-area mask from ${url}`, error);
    return NO_HOLES_FALLBACK_MASK;
  }
}

/** The launch-area mask: every feature's `Polygon` (or `MultiPolygon`) merged into one
 * `MultiPolygon`, or `null` on a failed/empty load (R55's own trigger). `configuredPath === null`
 * (config: `unlocks.home.launchAreaMaskPath`) short-circuits to `null` without a network call —
 * "not shipped yet" is a config state, not a fetch failure. */
export async function loadLaunchAreaMask(
  configuredPath: string | null,
  url: string = launchAreaUrl,
): Promise<PolygonGeometry | null> {
  if (configuredPath === null) return null;
  try {
    const fc = await fetchFeatureCollection(url);
    const polygons: number[][][][] = [];
    for (const feature of fc.features ?? []) {
      const geometry = feature.geometry;
      if (geometry === undefined) continue;
      if (geometry.type === 'Polygon') {
        polygons.push(geometry.coordinates as number[][][]);
      } else if (geometry.type === 'MultiPolygon') {
        polygons.push(...(geometry.coordinates as number[][][][]));
      }
    }
    if (polygons.length === 0) {
      throw new Error('no Polygon/MultiPolygon features found');
    }
    return { type: 'MultiPolygon', coordinates: polygons } as unknown as PolygonGeometry;
  } catch (error: unknown) {
    console.warn(`home-geometry: failed to load the launch-area mask from ${url}`, error);
    return null;
  }
}

/**
 * `copy/districts.ts#selectableDistricts`'s excluded-id set (D-126: "derive from a single
 * dataset"): every `properties.id` of `data/map/launch-area.geojson`'s own features — the exact
 * same file `loadLaunchAreaMask` above merges into geometry, read here for its ids instead. A
 * second small fetch of the same ~2 KB file (rather than threading ids through
 * `loadLaunchAreaMask`'s own return shape): keeps that function's contract (`PolygonGeometry |
 * null`) unchanged for its one existing caller, `home-tracker.ts`. Empty (never throws) on a
 * failed/malformed load — the honest degrade is "nothing excluded yet", not a crash of the whole
 * interest-registration screen.
 */
export async function loadLaunchAreaDistrictIds(
  url: string = launchAreaUrl,
): Promise<ReadonlySet<string>> {
  try {
    const fc = await fetchFeatureCollection(url);
    const ids = new Set<string>();
    for (const feature of fc.features ?? []) {
      const id = feature.properties?.id;
      if (typeof id === 'string') ids.add(id);
    }
    return ids;
  } catch (error: unknown) {
    console.warn(`home-geometry: failed to load launch-area district ids from ${url}`, error);
    return new Set();
  }
}
