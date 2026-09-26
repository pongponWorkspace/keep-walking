// Planar geometry for the validator and the build. Inputs are projected metres (projection.ts);
// GeoJSON helpers at the top convert. No library: the operations are small and exact enough for
// pilot polygons (hundreds of vertices), and the build must stay offline and deterministic.
import type { DungeonGeometry, Position } from './types';

export type XY = [number, number];
/** One polygon: outer ring first, holes after. Rings are closed (first equals last). */
export type PlanarPolygon = XY[][];

export function polygonsOf(geometry: DungeonGeometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

export function projectGeometry(
  geometry: DungeonGeometry,
  project: (p: readonly number[]) => XY,
): PlanarPolygon[] {
  return polygonsOf(geometry).map((rings) => rings.map((ring) => ring.map((p) => project(p))));
}

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/** Round every position, drop consecutive duplicates, keep rings closed. Never mutates input. */
export function roundGeometry<G extends DungeonGeometry>(geometry: G, decimals: number): G {
  const roundRing = (ring: Position[]): Position[] => {
    const out: Position[] = [];
    for (const p of ring) {
      const q = [roundTo(p[0] as number, decimals), roundTo(p[1] as number, decimals)];
      const last = out[out.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
    }
    const first = out[0];
    const last = out[out.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) out.push([...first]);
    return out;
  };
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(roundRing) } as G;
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((rings) => rings.map(roundRing)),
  } as G;
}

export function bboxOf(geometry: DungeonGeometry): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rings of polygonsOf(geometry)) {
    for (const p of rings[0] ?? []) {
      const x = p[0] as number;
      const y = p[1] as number;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

export function bboxesIntersect(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

function cross(o: XY, a: XY, b: XY): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Shoelace area, positive for counter-clockwise rings. */
export function ringSignedArea(ring: readonly XY[]): number {
  let twice = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j] as XY;
    const b = ring[i] as XY;
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return twice / 2;
}

/** Area of polygons with holes subtracted (holes assumed inside their outer ring). */
export function planarArea(polygons: readonly PlanarPolygon[]): number {
  let area = 0;
  for (const rings of polygons) {
    rings.forEach((ring, i) => {
      const a = Math.abs(ringSignedArea(ring));
      area += i === 0 ? a : -a;
    });
  }
  return area;
}

function onSegment(p: XY, a: XY, b: XY): boolean {
  return (
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}

/** True when closed segments ab and cd share at least one point (touching counts). */
export function segmentsTouch(a: XY, b: XY, c: XY, d: XY): boolean {
  const d1 = Math.sign(cross(c, d, a));
  const d2 = Math.sign(cross(c, d, b));
  const d3 = Math.sign(cross(a, b, c));
  const d4 = Math.sign(cross(a, b, d));
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return (
    (d1 === 0 && onSegment(a, c, d)) ||
    (d2 === 0 && onSegment(b, c, d)) ||
    (d3 === 0 && onSegment(c, a, b)) ||
    (d4 === 0 && onSegment(d, a, b))
  );
}

const MIN_RING_POSITIONS = 4;

/**
 * Structural problems of one polygon (outer + holes): ring too short or open, self-intersection,
 * rings crossing each other, a hole outside its outer ring. Empty list = valid.
 */
export function polygonProblems(rings: readonly XY[][]): string[] {
  const problems: string[] = [];
  rings.forEach((ring, r) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (ring.length < MIN_RING_POSITIONS) problems.push(`ring ${r} has fewer than 4 positions`);
    else if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
      problems.push(`ring ${r} is not closed`);
    } else if (ringSignedArea(ring) === 0) problems.push(`ring ${r} has zero area`);
  });
  if (problems.length > 0) return problems;
  rings.forEach((ring, r) => {
    const n = ring.length - 1;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const adjacent = j === i + 1 || (i === 0 && j === n - 1);
        const a = ring[i] as XY;
        const b = ring[i + 1] as XY;
        const c = ring[j] as XY;
        const d = ring[j + 1] as XY;
        if (adjacent) {
          // Adjacent edges share one vertex; a collinear fold back is a spike.
          const shared = j === i + 1 ? b : a;
          const p = j === i + 1 ? a : b;
          const q = j === i + 1 ? d : c;
          const folds =
            cross(shared, p, q) === 0 &&
            (p[0] - shared[0]) * (q[0] - shared[0]) + (p[1] - shared[1]) * (q[1] - shared[1]) > 0;
          if (folds)
            problems.push(`ring ${r} folds back on itself at vertex ${j === i + 1 ? j : i}`);
        } else if (segmentsTouch(a, b, c, d)) {
          problems.push(`ring ${r} self-intersects (edges ${i} and ${j})`);
        }
      }
    }
  });
  for (let r = 0; r < rings.length; r += 1) {
    for (let s = r + 1; s < rings.length; s += 1) {
      if (ringsTouch(rings[r] as XY[], rings[s] as XY[]))
        problems.push(`rings ${r} and ${s} touch`);
    }
  }
  const outer = rings[0] ?? [];
  rings.slice(1).forEach((hole, h) => {
    if (!pointInRing(hole[0] as XY, outer))
      problems.push(`hole ${h + 1} is outside the outer ring`);
  });
  return problems;
}

function ringsTouch(a: readonly XY[], b: readonly XY[]): boolean {
  for (let i = 0; i + 1 < a.length; i += 1) {
    for (let j = 0; j + 1 < b.length; j += 1) {
      if (segmentsTouch(a[i] as XY, a[i + 1] as XY, b[j] as XY, b[j + 1] as XY)) return true;
    }
  }
  return false;
}

/** Even-odd test against one ring (boundary behaviour unspecified). */
export function pointInRing(pt: XY, ring: readonly XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j] as XY;
    const b = ring[i] as XY;
    if (b[1] > pt[1] !== a[1] > pt[1]) {
      const x = b[0] + ((pt[1] - b[1]) * (a[0] - b[0])) / (a[1] - b[1]);
      if (pt[0] < x) inside = !inside;
    }
  }
  return inside;
}

/** Inside an outer ring and not inside one of its holes. */
export function pointInPolygons(pt: XY, polygons: readonly PlanarPolygon[]): boolean {
  return polygons.some(
    (rings) =>
      pointInRing(pt, rings[0] ?? []) && !rings.slice(1).some((hole) => pointInRing(pt, hole)),
  );
}

function pointSegmentDistance(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Shortest distance from `pt` to any ring edge. */
export function distanceToBoundary(pt: XY, polygons: readonly PlanarPolygon[]): number {
  let best = Infinity;
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let i = 0; i + 1 < ring.length; i += 1) {
        best = Math.min(best, pointSegmentDistance(pt, ring[i] as XY, ring[i + 1] as XY));
      }
    }
  }
  return best;
}

/** Sutherland-Hodgman: clip a convex polygon by a counter-clockwise convex polygon. */
function clipConvex(subject: readonly XY[], clip: readonly XY[]): XY[] {
  let output: XY[] = [...subject];
  for (let i = 0; i < clip.length && output.length > 0; i += 1) {
    const a = clip[i] as XY;
    const b = clip[(i + 1) % clip.length] as XY;
    const input = output;
    output = [];
    for (let k = 0; k < input.length; k += 1) {
      const p = input[k] as XY;
      const q = input[(k + 1) % input.length] as XY;
      const cp = cross(a, b, p);
      const cq = cross(a, b, q);
      if (cp >= 0) output.push(p);
      if (cp >= 0 !== cq >= 0) {
        const t = cp / (cp - cq);
        output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return output;
}

interface FanTriangle {
  tri: XY[];
  sign: number;
}

/** Signed fan triangles (origin, p_i, p_i+1) of every ring, all stored counter-clockwise. */
function fanTriangles(polygons: readonly PlanarPolygon[], origin: XY): FanTriangle[] {
  const out: FanTriangle[] = [];
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let i = 0; i + 1 < ring.length; i += 1) {
        const p = ring[i] as XY;
        const q = ring[i + 1] as XY;
        const c = cross(origin, p, q);
        if (c > 0) out.push({ tri: [origin, p, q], sign: 1 });
        else if (c < 0) out.push({ tri: [origin, q, p], sign: -1 });
      }
    }
  }
  return out;
}

/**
 * Area of A ∩ B. The winding number of a polygon set equals the signed sum of its fan triangles,
 * and for valid polygons (outer counter-clockwise, holes clockwise, parts disjoint) the winding
 * number is the indicator function, so area(A ∩ B) = Σ_i Σ_j s_i s_j area(T_i ∩ T_j). Winding
 * direction is taken from the rings, so callers pass rewound geometry (rewindPolygon).
 */
export function intersectionArea(a: readonly PlanarPolygon[], b: readonly PlanarPolygon[]): number {
  const first = a[0]?.[0]?.[0];
  if (!first) return 0;
  const origin: XY = [first[0], first[1]];
  const ta = fanTriangles(a, origin);
  const tb = fanTriangles(b, origin);
  let sum = 0;
  for (const x of ta) {
    for (const y of tb) {
      const piece = clipConvex(x.tri, y.tri);
      if (piece.length >= MIN_RING_POSITIONS - 1) sum += x.sign * y.sign * ringSignedArea(piece);
    }
  }
  return Math.max(0, sum);
}

/**
 * Length of a polyline inside the polygons. Parts running exactly along an edge may count either
 * way; coverageFilter.majorWayMinInsideLength_m absorbs them.
 */
export function lengthInside(line: readonly XY[], polygons: readonly PlanarPolygon[]): number {
  let total = 0;
  for (let s = 0; s + 1 < line.length; s += 1) {
    const p = line[s] as XY;
    const q = line[s + 1] as XY;
    const ts = [0, 1];
    for (const rings of polygons) {
      for (const ring of rings) {
        for (let i = 0; i + 1 < ring.length; i += 1) {
          const t = segmentParam(p, q, ring[i] as XY, ring[i + 1] as XY);
          if (t !== null) ts.push(t);
        }
      }
    }
    ts.sort((x, y) => x - y);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (let k = 0; k + 1 < ts.length; k += 1) {
      const t0 = ts[k] as number;
      const t1 = ts[k + 1] as number;
      if (t1 <= t0) continue;
      const tm = (t0 + t1) / 2;
      const mid: XY = [p[0] + tm * (q[0] - p[0]), p[1] + tm * (q[1] - p[1])];
      if (pointInPolygons(mid, polygons)) total += (t1 - t0) * len;
    }
  }
  return total;
}

/** Parameter t on pq where it crosses cd, or null (parallel segments give no split point). */
function segmentParam(p: XY, q: XY, c: XY, d: XY): number | null {
  const rx = q[0] - p[0];
  const ry = q[1] - p[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const t = ((c[0] - p[0]) * sy - (c[1] - p[1]) * sx) / den;
  const u = ((c[0] - p[0]) * ry - (c[1] - p[1]) * rx) / den;
  return t > 0 && t < 1 && u >= 0 && u <= 1 ? t : null;
}

/** Andrew monotone chain; returns the hull counter-clockwise without the closing point. */
export function convexHull(points: readonly XY[]): XY[] {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (pts.length < MIN_RING_POSITIONS - 1) return pts;
  const lower: XY[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2] as XY, lower[lower.length - 1] as XY, p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper: XY[] = [];
  for (const p of [...pts].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2] as XY, upper[upper.length - 1] as XY, p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Long side / short side of the minimum-area rotated rectangle (coverageFilter.aspectRatioMethod). */
export function minRotatedRectangleAspect(polygons: readonly PlanarPolygon[]): number {
  const hull = convexHull(polygons.flatMap((rings) => rings[0] ?? []));
  let bestArea = Infinity;
  let bestAspect = 1;
  for (let i = 0; i < hull.length; i += 1) {
    const a = hull[i] as XY;
    const b = hull[(i + 1) % hull.length] as XY;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len === 0) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy;
      const v = -(p[0] - a[0]) * uy + (p[1] - a[1]) * ux;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const w = maxU - minU;
    const h = maxV - minV;
    if (w * h < bestArea && Math.min(w, h) > 0) {
      bestArea = w * h;
      bestAspect = Math.max(w, h) / Math.min(w, h);
    }
  }
  return bestAspect;
}
