import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  DUNGEONS_SOURCE_ID,
  DUNGEON_LABELS_SOURCE_ID,
  buildDungeonFeatureCollections,
  computeDungeonLabelPoint,
  createDungeonLabelCache,
  poleOfInaccessibility,
  setDungeonsSourceData,
} from './dungeons-source';
import type { DungeonGeometry, DungeonInput, Ring } from './dungeons-source';

// Same fixture files art-director published for the style/preview/e2e trio
// (art/direction/map-style.md 6.1: "ใช้เป็นค่าคาดหวังของ unit test ของ adapter").
const SAMPLES_DIR = fileURLToPath(
  new URL('../../../../art/direction/map-style/samples', import.meta.url),
);

interface SampleFeature {
  readonly properties: Record<string, unknown> & { id: string };
  readonly geometry: DungeonGeometry;
}
interface SampleFeatureCollection {
  readonly features: readonly SampleFeature[];
}
interface SampleLabelFeature {
  readonly properties: Record<string, unknown> & { id: string };
  readonly geometry: { readonly type: 'Point'; readonly coordinates: readonly [number, number] };
}
interface SampleLabelFeatureCollection {
  readonly features: readonly SampleLabelFeature[];
}

function loadSample<T>(fileName: string): T {
  return JSON.parse(readFileSync(`${SAMPLES_DIR}/${fileName}`, 'utf-8')) as T;
}

const DUNGEONS_SAMPLE = loadSample<SampleFeatureCollection>('dungeons.sample.geojson');
const LABELS_SAMPLE = loadSample<SampleLabelFeatureCollection>('dungeon-labels.sample.geojson');

/** The samples are already whitelist-shaped, so a feature converts to a `DungeonInput` by lifting
 * `properties` back up next to `geometry` — exactly how a server payload would arrive. */
function toDungeonInput(feature: SampleFeature): DungeonInput {
  return { ...feature.properties, geometry: feature.geometry } as DungeonInput;
}

// The brief's own tolerance for comparing a computed label point against the published sample.
const TOLERANCE_DEG = 0.0001;

function expectWithinTolerance(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE_DEG);
}

function ring(points: readonly (readonly [number, number])[]): Ring {
  return points;
}

describe('poleOfInaccessibility', () => {
  it('stays inside a concave L-shaped polygon, unlike the centroid or the bbox centre', () => {
    // Brief's own fixture: centroid (1.357, 1.357) and bbox centre (2, 2) both sit outside this L.
    const lShape = ring([
      [0, 0],
      [4, 0],
      [4, 1],
      [1, 1],
      [1, 4],
      [0, 4],
      [0, 0],
    ]);
    const point = poleOfInaccessibility([lShape]);
    expect(point).toBeDefined();
    const [x, y] = point ?? [0, 0];

    // Inside the L (even-odd containment, done by hand for this simple shape).
    const insideOuterBox = x >= 0 && x <= 4 && y >= 0 && y <= 4;
    const insideNotch = x > 1 && y > 1;
    expect(insideOuterBox && !insideNotch).toBe(true);

    // At least ~0.5 from every one of the L's 6 edges (the widest inscribed circle here has
    // radius 0.5, since both arms are exactly 1 unit wide).
    const MIN_EXPECTED_CLEARANCE = 0.45;
    const edges: readonly [[number, number], [number, number]][] = [
      [
        [0, 0],
        [4, 0],
      ],
      [
        [4, 0],
        [4, 1],
      ],
      [
        [4, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 4],
      ],
      [
        [1, 4],
        [0, 4],
      ],
      [
        [0, 4],
        [0, 0],
      ],
    ];
    for (const [a, b] of edges) {
      const clearance = distancePointToSegment(x, y, a, b);
      expect(clearance).toBeGreaterThanOrEqual(MIN_EXPECTED_CLEARANCE);
    }
  });
});

/** Local re-implementation (not exported by the module) just to assert the L-shape clearance. */
function distancePointToSegment(
  px: number,
  py: number,
  [ax, ay]: readonly [number, number],
  [bx, by]: readonly [number, number],
): number {
  const dx = bx - ax;
  const dy = by - ay;
  let x = ax;
  let y = ay;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    x = ax + dx * clampedT;
    y = ay + dy * clampedT;
  }
  return Math.hypot(px - x, py - y);
}

describe('computeDungeonLabelPoint against the published samples', () => {
  it.each(DUNGEONS_SAMPLE.features.map((feature) => [feature.properties.id, feature] as const))(
    '%s matches dungeon-labels.sample.geojson within %s degrees',
    (id, feature) => {
      const expected = LABELS_SAMPLE.features.find((label) => label.properties.id === id);
      expect(expected, `no expected label for ${id}`).toBeDefined();
      const [expectedLng, expectedLat] = expected?.geometry.coordinates as [number, number];

      const point = computeDungeonLabelPoint(feature.geometry);
      expect(point, `${id} produced no label point`).toBeDefined();
      const [lng, lat] = point ?? [0, 0];
      expectWithinTolerance(lng, expectedLng);
      expectWithinTolerance(lat, expectedLat);
    },
  );
});

describe('buildDungeonFeatureCollections', () => {
  const inputs = DUNGEONS_SAMPLE.features.map(toDungeonInput);

  it('produces one polygon feature per dungeon and one point feature per open/valid dungeon', () => {
    const cache = createDungeonLabelCache();
    const { dungeons, labels } = buildDungeonFeatureCollections(inputs, cache);

    expect(dungeons.features).toHaveLength(inputs.length);
    for (const feature of dungeons.features) {
      expect(feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon').toBe(
        true,
      );
    }

    // Every sample's polygon is well-formed, so every dungeon gets exactly one label point —
    // never zero, never (the P1-H06 bug) more than one.
    expect(labels.features).toHaveLength(inputs.length);
    const labelIds = labels.features.map((feature) => feature.properties.id);
    expect(new Set(labelIds).size).toBe(labelIds.length);
    for (const feature of labels.features) {
      expect(feature.geometry.type).toBe('Point');
      expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
    }
  });

  it('builds equal properties on both sources from the same 6-property whitelist, never spread', () => {
    const cache = createDungeonLabelCache();
    const rawWithExtras: DungeonInput = {
      ...toDungeonInput(
        DUNGEONS_SAMPLE.features.find((f) => f.properties.id === 'sample-open-01') as SampleFeature,
      ),
      // Server-only fields that must never leak onto a source's properties (non-negotiable 4).
      ownerPlayerId: 'player-secret-123',
      lastSeenAt: '2026-09-24T00:00:00Z',
      geohash: 'w4rn9',
    };
    const { dungeons, labels } = buildDungeonFeatureCollections([rawWithExtras], cache);

    const polygonProps = dungeons.features[0]?.properties;
    const labelProps = labels.features[0]?.properties;
    expect(polygonProps).toEqual(labelProps);
    expect(polygonProps).not.toBe(labelProps);

    const allowedKeys = new Set([
      'id',
      'name',
      'status',
      'sponsored',
      'label_sponsored',
      'label_count',
    ]);
    for (const key of Object.keys(polygonProps ?? {})) {
      expect(allowedKeys.has(key)).toBe(true);
    }
    expect(polygonProps).not.toHaveProperty('ownerPlayerId');
    expect(polygonProps).not.toHaveProperty('lastSeenAt');
    expect(polygonProps).not.toHaveProperty('geohash');
  });

  it('rewinds a clockwise outer ring to counter-clockwise', () => {
    const clockwiseSquare: DungeonInput = {
      id: 'cw-square',
      name: 'test fixture: clockwise square',
      status: 'open',
      sponsored: false,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };
    const cache = createDungeonLabelCache();
    const { dungeons } = buildDungeonFeatureCollections([clockwiseSquare], cache);
    const outer = dungeons.features[0]?.geometry.coordinates[0] as Ring;
    // Shoelace sum over consecutive vertices; positive means counter-clockwise.
    let sum = 0;
    for (let i = 0; i < outer.length - 1; i += 1) {
      const [x1, y1] = outer[i] as [number, number];
      const [x2, y2] = outer[i + 1] as [number, number];
      sum += x1 * y2 - x2 * y1;
    }
    expect(sum).toBeGreaterThan(0);
  });

  it('defaults an unrecognized status to "closed" and warns without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const weird: DungeonInput = {
      id: 'weird-status',
      name: 'test fixture: unrecognized status',
      status: 'under_construction',
      sponsored: false,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };
    const cache = createDungeonLabelCache();
    const { dungeons } = buildDungeonFeatureCollections([weird], cache);
    expect(dungeons.features[0]?.properties.status).toBe('closed');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('omits label_count/label_sponsored when the payload does not provide a string', () => {
    const cache = createDungeonLabelCache();
    const closed = DUNGEONS_SAMPLE.features.find((f) => f.properties.id === 'sample-closed-01');
    const { dungeons } = buildDungeonFeatureCollections(
      [toDungeonInput(closed as SampleFeature)],
      cache,
    );
    expect(dungeons.features[0]?.properties).not.toHaveProperty('label_count');
    expect(dungeons.features[0]?.properties).not.toHaveProperty('label_sponsored');
  });

  it('picks a point inside the larger member of a MultiPolygon, not one per sub-polygon', () => {
    const small: Ring = [
      [10, 10],
      [10.001, 10],
      [10.001, 10.001],
      [10, 10.001],
      [10, 10],
    ];
    const large: Ring = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    const multi: DungeonInput = {
      id: 'multi-01',
      name: 'test fixture: multi-polygon',
      status: 'open',
      sponsored: false,
      geometry: { type: 'MultiPolygon', coordinates: [[small], [large]] },
    };
    const cache = createDungeonLabelCache();
    const { labels } = buildDungeonFeatureCollections([multi], cache);
    expect(labels.features).toHaveLength(1);
    const [lng, lat] = labels.features[0]?.geometry.coordinates as [number, number];
    // Inside the large square, nowhere near the tiny one.
    expect(lng).toBeGreaterThan(0);
    expect(lng).toBeLessThan(1);
    expect(lat).toBeGreaterThan(0);
    expect(lat).toBeLessThan(1);
  });
});

describe('createDungeonLabelCache', () => {
  const square: DungeonGeometry = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ],
  };

  it('recomputes only when the geometry actually changes', () => {
    const cache = createDungeonLabelCache();
    const first = cache.get('cache-01', square);
    const second = cache.get('cache-01', square);
    expect(second).toBe(first); // same cached array reference, not merely equal values

    const moved: DungeonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [10, 10],
          [12, 10],
          [12, 12],
          [10, 12],
          [10, 10],
        ],
      ],
    };
    const third = cache.get('cache-01', moved);
    expect(third).not.toBe(first);
    expect(third?.[0]).toBeGreaterThan(5);
  });
});

describe('computeDungeonLabelPoint safety net', () => {
  it('omits the point and warns without any coordinate in the message when rounding lands outside', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // A sliver triangle far thinner than the ~1 m (5-decimal) rounding grid: the true pole sits at
    // y = 0.000005, which rounds (to 5 decimals) to 0.00001 — landing exactly on the apex vertex
    // itself, outside the polygon by the strict point-in-polygon test (found empirically; see the
    // task's probe script). This is exactly the "polygon เสีย" case map-style.md 6.1 point 4
    // describes: the guard rejects a legitimate-looking point rather than mis-place the label.
    const sliverTriangle: DungeonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [0.5, 0.00001],
          [0, 0],
        ],
      ],
    };

    const point = computeDungeonLabelPoint(sliverTriangle);

    expect(point).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message] = warnSpy.mock.calls[0] ?? [];
    expect(typeof message).toBe('string');
    expect(message as string).not.toMatch(/\d/);
    warnSpy.mockRestore();
  });

  it('still shows the polygon when its label point is omitted', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sliverInput: DungeonInput = {
      id: 'sliver-01',
      name: 'test fixture: sliver polygon',
      status: 'open',
      sponsored: false,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [0.5, 0.00001],
            [0, 0],
          ],
        ],
      },
    };
    const cache = createDungeonLabelCache();
    const { dungeons, labels } = buildDungeonFeatureCollections([sliverInput], cache);

    expect(dungeons.features).toHaveLength(1);
    expect(labels.features).toHaveLength(0);
    warnSpy.mockRestore();
  });
});

describe('setDungeonsSourceData', () => {
  it('calls setData on both kw-dungeons and kw-dungeon-labels in the same synchronous round', () => {
    const calls: string[] = [];
    const sources = new Map<string, { setData: (data: unknown) => void }>([
      [DUNGEONS_SOURCE_ID, { setData: () => calls.push(DUNGEONS_SOURCE_ID) }],
      [DUNGEON_LABELS_SOURCE_ID, { setData: () => calls.push(DUNGEON_LABELS_SOURCE_ID) }],
    ]);
    const map = { getSource: (id: string) => sources.get(id) };
    const cache = createDungeonLabelCache();

    setDungeonsSourceData(map, DUNGEONS_SAMPLE.features.map(toDungeonInput), cache);

    // Both fired, synchronously, before this line runs — no microtask/await could have slipped in.
    expect(calls).toEqual([DUNGEONS_SOURCE_ID, DUNGEON_LABELS_SOURCE_ID]);
  });

  it('never throws when a source is missing (style not yet loaded)', () => {
    const map = { getSource: () => undefined };
    const cache = createDungeonLabelCache();
    expect(() =>
      setDungeonsSourceData(map, DUNGEONS_SAMPLE.features.map(toDungeonInput), cache),
    ).not.toThrow();
  });
});
