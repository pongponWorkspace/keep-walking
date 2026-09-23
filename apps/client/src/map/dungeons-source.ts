/**
 * The one adapter that turns a "dungeon set" (a per-dungeon payload with arbitrary server fields,
 * see docs/tech/F02-map-location-spike.md 15.2) into the two GeoJSON `FeatureCollection`s
 * `kw-light.style.json` 0.2.0 reads: `kw-dungeons` (polygon, fill/line layers only) and
 * `kw-dungeon-labels` (one Point per dungeon, symbol layers only).
 *
 * Fixes the P1-H06 duplicate-label bug (art/direction/map-style.md 6.1 "ทำไมป้ายไม่ซ้ำ"): the old
 * QA method fed the polygon straight into the symbol layers' source, and MapLibre's GeoJSON source
 * subdivides a wide polygon across several internal geojson-vt tiles, each computing (and drawing)
 * its own symbol anchor. A single `Point` per dungeon has a single anchor, so it can only ever be
 * drawn once. This module is the only place that constructs either FeatureCollection: no other file
 * may call `addSource`/`setData` for a per-player or per-dungeon geometry (non-negotiable 4).
 *
 * Pure geometry only — no MapLibre/DOM import — so every function down to `setDungeonsSourceData`
 * (which only needs a `{ getSource }` duck-type, not the real class) runs under plain Node, in this
 * file's own `*.test.ts` and inside the Playwright test runner's own Node context for
 * `apps/client/e2e/*.spec.ts` (ADR 0001 3.6, same reasoning as `geo-circle.ts`).
 *
 * The label point is the polygon's pole of inaccessibility (map-style.md 6.1 point 1): the point
 * inside the polygon farthest from every edge. Never the bbox centre or the geometric centroid —
 * both can land outside a concave dungeon (an L-shaped park, a market that bends around a canal).
 * Written in-house (map-style.md 6.1 point 7: no `polylabel` dependency without a tech-lead
 * handoff) as the well-known Mapbox/Vladimir Agafonkin "polylabel" grid-refinement algorithm: seed
 * a queue of square cells covering the bbox plus the polygon's own centroid, repeatedly split the
 * most promising cell into quadrants, and stop once no cell could beat the current best by more
 * than `precisionDeg`.
 */

/** `[lng, lat]`, matching GeoJSON's coordinate order. */
export type Position2D = readonly [number, number];
/** A closed linear ring: `ring[0]` equals `ring.at(-1)` (RFC 7946). */
export type Ring = readonly Position2D[];

export interface PolygonGeometry {
  readonly type: 'Polygon';
  readonly coordinates: readonly Ring[];
}
export interface MultiPolygonGeometry {
  readonly type: 'MultiPolygon';
  readonly coordinates: readonly (readonly Ring[])[];
}
export type DungeonGeometry = PolygonGeometry | MultiPolygonGeometry;

export type DungeonStatus = 'open' | 'closed';

/** The 6-property whitelist, map-style.md 6.1 / tech note 15.2. Identical shape on both sources. */
export interface DungeonProperties {
  readonly id: string;
  readonly name: string;
  readonly status: DungeonStatus;
  readonly sponsored: boolean;
  readonly label_sponsored?: string;
  readonly label_count?: string;
}

/**
 * One dungeon's payload as this adapter receives it: an arbitrary server/fixture object that must
 * carry at least `id`, `name` and `geometry`, plus whatever else the server happens to send (a
 * geohash, a per-player last-seen time, ...). None of the extra keys ever reach a Feature's
 * `properties` — see `buildDungeonProperties`.
 */
export interface DungeonInput {
  readonly id: string;
  readonly name: string;
  readonly geometry: DungeonGeometry;
  readonly status?: unknown;
  readonly sponsored?: unknown;
  readonly label_sponsored?: unknown;
  readonly label_count?: unknown;
  readonly [extraServerField: string]: unknown;
}

export interface DungeonPolygonFeature {
  readonly type: 'Feature';
  readonly properties: DungeonProperties;
  readonly geometry: DungeonGeometry;
}
export interface DungeonPolygonFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly DungeonPolygonFeature[];
}

export interface DungeonLabelPointGeometry {
  readonly type: 'Point';
  readonly coordinates: Position2D;
}
export interface DungeonLabelFeature {
  readonly type: 'Feature';
  readonly properties: DungeonProperties;
  readonly geometry: DungeonLabelPointGeometry;
}
export interface DungeonLabelFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly DungeonLabelFeature[];
}

/** Style 0.2.0's two `kw-*` source ids (`kw-light.style.json` `sources`, map-style.md 6.1). */
export const DUNGEONS_SOURCE_ID = 'kw-dungeons';
export const DUNGEON_LABELS_SOURCE_ID = 'kw-dungeon-labels';

/** ~1 m at Bangkok's latitude (map-style.md 6.1 point 3). */
const LABEL_POINT_PRECISION_DEG = 0.00001;
/** map-style.md 6.1 point 3: "ปัดพิกัดผลลัพธ์ ≤ 5 ทศนิยม". */
const LABEL_COORDINATE_DECIMALS = 5;

// --- Winding order (map-style.md 6.1: "วงนอกทวนเข็มนาฬิกา", RFC 7946 orientation) ---

/** Twice the signed planar area (shoelace formula). Positive = counter-clockwise ring, for a ring
 * whose last point repeats its first (RFC 7946); the degenerate closing "edge" contributes 0. */
function ringSignedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const point = ring[i];
    const next = ring[i + 1];
    if (point === undefined || next === undefined) {
      continue;
    }
    sum += point[0] * next[1] - next[0] * point[1];
  }
  return sum;
}

function isRingCounterClockwise(ring: Ring): boolean {
  return ringSignedArea(ring) > 0;
}

function withRingOrientation(ring: Ring, counterClockwise: boolean): Ring {
  return isRingCounterClockwise(ring) === counterClockwise ? ring : [...ring].reverse();
}

/** RFC 7946 orientation: the outer ring (index 0) counter-clockwise, every hole clockwise. Never
 * mutates its input — `input.geometry` may be shared/reused by the caller. */
function rewindPolygonRings(rings: readonly Ring[]): readonly Ring[] {
  return rings.map((ring, index) => withRingOrientation(ring, index === 0));
}

function rewindGeometry(geometry: DungeonGeometry): DungeonGeometry {
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: rewindPolygonRings(geometry.coordinates) };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((rings) => rewindPolygonRings(rings)),
  };
}

// --- Point-in-polygon and boundary distance (shared by area selection and pole-of-inaccessibility) ---

function isPointInRing(point: Position2D, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    const crosses = a[1] > y !== b[1] > y;
    if (crosses && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/** Even-odd rule across every ring: inside the outer ring and outside every hole. */
function isPointInPolygonRings(point: Position2D, rings: readonly Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    if (isPointInRing(point, ring)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointToSegmentDistanceSquared(point: Position2D, a: Position2D, b: Position2D): number {
  const [px, py] = point;
  let x = a[0];
  let y = a[1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  const ex = px - x;
  const ey = py - y;
  return ex * ex + ey * ey;
}

/** Signed distance to the nearest edge of any ring: positive inside the polygon (outer ring, minus
 * any hole), negative outside. This is the objective `poleOfInaccessibility` maximizes. */
function distanceToPolygonBoundary(point: Position2D, rings: readonly Ring[]): number {
  let minDistanceSquared = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = ring[i];
      const b = ring[i + 1];
      if (a === undefined || b === undefined) {
        continue;
      }
      minDistanceSquared = Math.min(minDistanceSquared, pointToSegmentDistanceSquared(point, a, b));
    }
  }
  const distance = Math.sqrt(minDistanceSquared);
  return isPointInPolygonRings(point, rings) ? distance : -distance;
}

/** Planar area of a polygon (outer ring minus its holes), always ≥ 0. Used only to pick the
 * largest member of a MultiPolygon (map-style.md 6.1 point 2) — never for game economy math. */
function polygonRingsArea(rings: readonly Ring[]): number {
  const outer = rings[0];
  if (outer === undefined) {
    return 0;
  }
  const outerArea = Math.abs(ringSignedArea(outer)) / 2;
  let holesArea = 0;
  for (let i = 1; i < rings.length; i += 1) {
    const hole = rings[i];
    if (hole !== undefined) {
      holesArea += Math.abs(ringSignedArea(hole)) / 2;
    }
  }
  return Math.max(outerArea - holesArea, 0);
}

/** `Polygon` → its own rings. `MultiPolygon` → the rings of its largest member by area (never one
 * point per sub-polygon, map-style.md 6.1 point 2). */
function selectLargestPolygonRings(geometry: DungeonGeometry): readonly Ring[] | undefined {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  let best: readonly Ring[] | undefined;
  let bestArea = -1;
  for (const rings of geometry.coordinates) {
    const area = polygonRingsArea(rings);
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  return best;
}

// --- Pole of inaccessibility (in-house "polylabel", map-style.md 6.1 points 1, 3, 7) ---

interface Cell {
  readonly x: number;
  readonly y: number;
  /** Half the cell's side length; 0 for the two single-point seed cells. */
  readonly halfSize: number;
  readonly distance: number;
  /** Upper bound on the distance any point inside this cell could reach (its centre distance plus
   * the farthest corner, `halfSize * sqrt(2)`) — the priority the queue picks the next cell by. */
  readonly maxDistance: number;
}

function makeCell(x: number, y: number, halfSize: number, rings: readonly Ring[]): Cell {
  const distance = distanceToPolygonBoundary([x, y], rings);
  return { x, y, halfSize, distance, maxDistance: distance + halfSize * Math.SQRT2 };
}

/** Area-weighted centroid of the outer ring, as one seed candidate (not the result: a centroid can
 * sit outside a concave ring, e.g. the L-shaped test fixture — `makeCell` scores it honestly). */
function outerRingCentroidCell(rings: readonly Ring[]): Cell {
  const outer = rings[0];
  const first = outer?.[0];
  if (outer === undefined || first === undefined || outer.length < 2) {
    return makeCell(0, 0, 0, rings);
  }
  let doubleArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < outer.length - 1; i += 1) {
    const point = outer[i];
    const next = outer[i + 1];
    if (point === undefined || next === undefined) {
      continue;
    }
    const cross = point[0] * next[1] - next[0] * point[1];
    doubleArea += cross;
    cx += (point[0] + next[0]) * cross;
    cy += (point[1] + next[1]) * cross;
  }
  if (doubleArea === 0) {
    return makeCell(first[0], first[1], 0, rings);
  }
  const centroidAreaFactor = 3;
  const denominator = centroidAreaFactor * doubleArea;
  return makeCell(cx / denominator, cy / denominator, 0, rings);
}

/**
 * Binary max-heap ordered by `maxDistance`, so `poleOfInaccessibility` always splits the most
 * promising cell next in O(log n) rather than an O(n) linear scan. Without this, a pathological
 * ring (e.g. an extremely thin sliver, tested in `dungeons-source.test.ts`) can push the queue into
 * the tens of thousands of cells and turn the whole search into O(n²) — slow enough on a phone to
 * matter, and this runs on every geometry change (map-style.md 6.1 point 5).
 */
class CellMaxHeap {
  private readonly items: Cell[] = [];

  get size(): number {
    return this.items.length;
  }

  push(cell: Cell): void {
    this.items.push(cell);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): Cell | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (top === undefined) {
      return undefined;
    }
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(startIndex: number): void {
    let index = startIndex;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (!this.isMorePromising(index, parentIndex)) {
        break;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(startIndex: number): void {
    let index = startIndex;
    for (;;) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;
      if (left < this.items.length && this.isMorePromising(left, largest)) {
        largest = left;
      }
      if (right < this.items.length && this.isMorePromising(right, largest)) {
        largest = right;
      }
      if (largest === index) {
        break;
      }
      this.swap(index, largest);
      index = largest;
    }
  }

  private isMorePromising(a: number, b: number): boolean {
    const itemA = this.items[a];
    const itemB = this.items[b];
    return itemA !== undefined && itemB !== undefined && itemA.maxDistance > itemB.maxDistance;
  }

  private swap(a: number, b: number): void {
    const itemA = this.items[a];
    const itemB = this.items[b];
    if (itemA === undefined || itemB === undefined) {
      return;
    }
    this.items[a] = itemB;
    this.items[b] = itemA;
  }
}

/** Safety valve against a pathological ring (self-intersecting, near-zero area): a real dungeon
 * polygon at `LABEL_POINT_PRECISION_DEG` converges in well under this many splits. */
const MAX_POLE_ITERATIONS = 20_000;
const QUADRANTS_PER_SPLIT = 4;

/** The point inside `rings` farthest from every edge (map-style.md 6.1 point 1), in the polygon's
 * own coordinate units — un-rounded, and not yet checked for containment (see
 * `computeDungeonLabelPoint`). `undefined` for a degenerate ring (no area). Pure: same input,
 * same output, no I/O. */
export function poleOfInaccessibility(
  rings: readonly Ring[],
  precisionDeg: number = LABEL_POINT_PRECISION_DEG,
): Position2D | undefined {
  const outer = rings[0];
  /** A closed ring needs at least 3 distinct points plus the repeated closing point. */
  const MIN_CLOSED_RING_POINTS = 4;
  if (outer === undefined || outer.length < MIN_CLOSED_RING_POINTS) {
    return undefined;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of outer) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) {
    return undefined;
  }
  const initialCellSize = Math.min(width, height);
  const initialHalf = initialCellSize / 2;
  const queue = new CellMaxHeap();
  for (let x = minX; x < maxX; x += initialCellSize) {
    for (let y = minY; y < maxY; y += initialCellSize) {
      queue.push(makeCell(x + initialHalf, y + initialHalf, initialHalf, rings));
    }
  }

  let best = outerRingCentroidCell(rings);
  const bboxCentre = makeCell(minX + width / 2, minY + height / 2, 0, rings);
  if (bboxCentre.distance > best.distance) {
    best = bboxCentre;
  }

  let iterations = 0;
  while (queue.size > 0 && iterations < MAX_POLE_ITERATIONS) {
    iterations += 1;
    const cell = queue.pop();
    if (cell === undefined) {
      break;
    }
    if (cell.distance > best.distance) {
      best = cell;
    }
    if (cell.maxDistance - best.distance <= precisionDeg) {
      continue;
    }
    const half = cell.halfSize / 2;
    for (let q = 0; q < QUADRANTS_PER_SPLIT; q += 1) {
      const signX = q % 2 === 0 ? -1 : 1;
      const signY = q < 2 ? -1 : 1;
      queue.push(makeCell(cell.x + signX * half, cell.y + signY * half, half, rings));
    }
  }
  return [best.x, best.y];
}

const DECIMAL_BASE = 10;

function roundToDecimals(value: number, decimals: number): number {
  const factor = DECIMAL_BASE ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * The full label-point rule for one dungeon's geometry (map-style.md 6.1 points 1–4): pick the
 * largest polygon of a MultiPolygon, find its pole of inaccessibility, round to
 * `LABEL_COORDINATE_DECIMALS`, then re-check containment on the *rounded* point (rounding can only
 * move it by a fraction of `LABEL_POINT_PRECISION_DEG`, but a broken/self-intersecting polygon can
 * still fail). A failed check is logged and the dungeon gets no label point — never a wrong one; the
 * warning never carries a coordinate (CLAUDE.md: no player-facing raw data in logs; here there is no
 * player data at all, but the rule is kept blanket so this file never becomes the exception).
 */
export function computeDungeonLabelPoint(geometry: DungeonGeometry): Position2D | undefined {
  const rings = selectLargestPolygonRings(geometry);
  if (rings === undefined || rings.length === 0) {
    return undefined;
  }
  const raw = poleOfInaccessibility(rings);
  if (raw === undefined) {
    return undefined;
  }
  const rounded: Position2D = [
    roundToDecimals(raw[0], LABEL_COORDINATE_DECIMALS),
    roundToDecimals(raw[1], LABEL_COORDINATE_DECIMALS),
  ];
  if (!isPointInPolygonRings(rounded, rings)) {
    console.warn('map: dungeon label point failed the point-in-polygon check, omitting the label');
    return undefined;
  }
  return rounded;
}

/**
 * Caches the label point per dungeon `id`, keyed on a snapshot of the geometry that produced it
 * (map-style.md 6.1 point 5: "คำนวณครั้งเดียวเมื่อ geometry ของ dungeon เปลี่ยน"). A `label_count`-only
 * update (every tick) reuses the cached point without re-running `poleOfInaccessibility`. Stateful
 * by design — the geometry pipeline above stays pure and independently testable.
 */
export interface DungeonLabelCache {
  get(id: string, geometry: DungeonGeometry): Position2D | undefined;
}

interface DungeonLabelCacheEntry {
  readonly geometryKey: string;
  readonly point: Position2D | undefined;
}

export function createDungeonLabelCache(): DungeonLabelCache {
  const entries = new Map<string, DungeonLabelCacheEntry>();
  return {
    get(id, geometry) {
      const geometryKey = JSON.stringify(geometry);
      const cached = entries.get(id);
      if (cached !== undefined && cached.geometryKey === geometryKey) {
        return cached.point;
      }
      const point = computeDungeonLabelPoint(geometry);
      entries.set(id, { geometryKey, point });
      return point;
    },
  };
}

// --- Property whitelist (tech note 15.2: "สร้าง object ใหม่แบบ whitelist ... ห้าม spread payload") ---

function normalizeStatus(value: unknown, id: string): DungeonStatus {
  if (value === 'open' || value === 'closed') {
    return value;
  }
  // Dev/ops-facing only: the dungeon id, never a coordinate or a player's data.
  console.warn(`map: dungeon "${id}" has an unrecognized status, treating it as "closed"`);
  return 'closed';
}

/**
 * Builds a brand-new object with exactly the 6 whitelisted keys (tech note 15.2 point 2). Called
 * once per FeatureCollection so the two sources never literally share one object reference, even
 * though their values must be equal (acceptance: "values equal to the polygon's").
 */
function buildDungeonProperties(input: DungeonInput): DungeonProperties {
  const properties: {
    id: string;
    name: string;
    status: DungeonStatus;
    sponsored: boolean;
    label_sponsored?: string;
    label_count?: string;
  } = {
    id: input.id,
    name: input.name,
    status: normalizeStatus(input.status, input.id),
    sponsored: input.sponsored === true,
  };
  if (typeof input.label_sponsored === 'string') {
    properties.label_sponsored = input.label_sponsored;
  }
  if (typeof input.label_count === 'string') {
    properties.label_count = input.label_count;
  }
  return properties;
}

/**
 * The adapter (acceptance 1): one dungeon set in, two FeatureCollections out — `kw-dungeons`
 * (always one polygon feature per dungeon) and `kw-dungeon-labels` (one Point feature per dungeon,
 * omitted only when `cache`/`computeDungeonLabelPoint` could not place it safely). Both feature's
 * `properties` come from independent `buildDungeonProperties` calls on the same `input`, so they are
 * deep-equal without ever being the same object and without ever containing a spread payload.
 */
export function buildDungeonFeatureCollections(
  dungeons: readonly DungeonInput[],
  cache: DungeonLabelCache,
): { dungeons: DungeonPolygonFeatureCollection; labels: DungeonLabelFeatureCollection } {
  const dungeonFeatures: DungeonPolygonFeature[] = [];
  const labelFeatures: DungeonLabelFeature[] = [];
  for (const input of dungeons) {
    const geometry = rewindGeometry(input.geometry);
    dungeonFeatures.push({
      type: 'Feature',
      properties: buildDungeonProperties(input),
      geometry,
    });
    const point = cache.get(input.id, geometry);
    if (point !== undefined) {
      labelFeatures.push({
        type: 'Feature',
        properties: buildDungeonProperties(input),
        geometry: { type: 'Point', coordinates: point },
      });
    }
  }
  return {
    dungeons: { type: 'FeatureCollection', features: dungeonFeatures },
    labels: { type: 'FeatureCollection', features: labelFeatures },
  };
}

// --- Wiring (acceptance 1: both `setData` calls happen in the same synchronous round) ---

interface SettableSource {
  setData(data: unknown): void;
}

function isSettableSource(value: unknown): value is SettableSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { setData?: unknown }).setData === 'function'
  );
}

/** Duck-typed subset of MapLibre's `Map` (only `getSource`), so this file never imports the real
 * `maplibre-gl` class at runtime — keeping it importable from plain Node (this file's tests and
 * `apps/client/e2e/*.spec.ts`, which run under Playwright's own Node-side test process). A real
 * `Map` satisfies this structurally; no cast is needed at the call site. */
export interface DungeonSourceMap {
  getSource(id: string): unknown;
}

/**
 * Builds both FeatureCollections once, then calls `setData` on `kw-dungeons` and
 * `kw-dungeon-labels` back-to-back with no `await` between them (acceptance 1: "in the same
 * round"). A source that is missing or not yet a GeoJSON source (e.g. the style has not finished
 * loading) is skipped rather than throwing — matching `geo-sources.ts`'s "never crash the map" rule.
 */
export function setDungeonsSourceData(
  map: DungeonSourceMap,
  dungeons: readonly DungeonInput[],
  cache: DungeonLabelCache,
): void {
  const { dungeons: dungeonsFeatureCollection, labels: labelsFeatureCollection } =
    buildDungeonFeatureCollections(dungeons, cache);
  const dungeonsSource = map.getSource(DUNGEONS_SOURCE_ID);
  const labelsSource = map.getSource(DUNGEON_LABELS_SOURCE_ID);
  if (isSettableSource(dungeonsSource)) {
    dungeonsSource.setData(dungeonsFeatureCollection);
  }
  if (isSettableSource(labelsSource)) {
    labelsSource.setData(labelsFeatureCollection);
  }
}
