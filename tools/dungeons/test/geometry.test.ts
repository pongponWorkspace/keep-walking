import { describe, expect, it } from 'vitest';
import {
  convexHull,
  intersectionArea,
  lengthInside,
  minRotatedRectangleAspect,
  planarArea,
  polygonProblems,
  projectGeometry,
  roundGeometry,
  type PlanarPolygon,
  type XY,
} from '../src/geometry';
import { equirectangular, utm47n } from '../src/projection';
import { rewindPolygon } from '@keep-walking/geo';
import type { DungeonGeometry } from '../src/types';
import { loadFixture } from './helpers';

const sq = (x: number, y: number, s: number): XY[] => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y],
];
const cw = (ring: XY[]): XY[] => [...ring].reverse();

describe('utm47n matches EPSG:32647 (reference: pyproj 3.8.0, tools/coverage/.venv)', () => {
  it.each([
    [
      [100.5, 13.75],
      [662176.2905, 1520582.4944],
    ],
    [
      [100.56, 13.73],
      [668679.0585, 1518411.1007],
    ],
    [
      [99.0, 13.0],
      [500000.0, 1437135.7222],
    ],
    [
      [101.4, 14.5],
      [758674.3074, 1604382.028],
    ],
  ])('%j', (lngLat, [e, n]) => {
    const [x, y] = utm47n(lngLat);
    expect(Math.abs(x - (e as number))).toBeLessThan(0.001);
    expect(Math.abs(y - (n as number))).toBeLessThan(0.001);
  });

  it('fixture areas match shapely in EPSG:32647 within 0.05 m2', () => {
    const shapely: Record<string, number> = {
      'fx-yard': 4884.577,
      'fx-park': 17535.739,
      'fx-market': 7184.908,
      'fx-draft': 6374.991,
    };
    for (const r of loadFixture().dungeons) {
      const g = rewindPolygon(r.geometry as DungeonGeometry);
      const area = planarArea(projectGeometry(g, utm47n));
      expect(Math.abs(area - (shapely[r.id] as number))).toBeLessThan(0.05);
    }
  });

  it('equirectangular round-trips and is metric', () => {
    const f = equirectangular([100.5, 13.75]);
    const [lng, lat] = f.inverse(f.forward([100.501, 13.751]));
    expect(lng).toBeCloseTo(100.501, 10);
    expect(lat).toBeCloseTo(13.751, 10);
    expect(f.forward([100.5, 13.751])[1]).toBeCloseTo(111.195, 2);
  });
});

describe('intersectionArea (signed fan triangles)', () => {
  const a: PlanarPolygon[] = [[sq(0, 0, 100)]];
  it.each([
    ['half overlap', [[sq(50, 0, 100)]], 5000],
    ['disjoint', [[sq(200, 0, 10)]], 0],
    ['touching edge', [[sq(100, 0, 100)]], 0],
    ['identical', [[sq(0, 0, 100)]], 10000],
    ['contained', [[sq(10, 10, 20)]], 400],
    ['inside a hole', [[sq(-50, -50, 200), cw(sq(0, 0, 100))]], 0],
    ['frame around a hole', [[sq(-10, -10, 120), cw(sq(10, 10, 80))]], 10000 - 6400],
    ['multipolygon', [[sq(-50, 0, 60)], [sq(90, 90, 20)]], 600 + 100],
  ] as [string, PlanarPolygon[], number][])('%s', (_name, b, expected) => {
    expect(intersectionArea(a, b)).toBeCloseTo(expected, 6);
    expect(intersectionArea(b, a)).toBeCloseTo(expected, 6);
  });

  it('works on a concave polygon (L shape vs square in its notch)', () => {
    const l: XY[] = [
      [0, 0],
      [100, 0],
      [100, 50],
      [50, 50],
      [50, 100],
      [0, 100],
      [0, 0],
    ];
    expect(intersectionArea([[l]], [[sq(50, 50, 50)]])).toBeCloseTo(0, 6);
    expect(intersectionArea([[l]], [[sq(25, 25, 50)]])).toBeCloseTo(2500 - 625, 6);
  });
});

describe('polygonProblems', () => {
  it.each([
    ['valid square', [sq(0, 0, 10)], []],
    ['valid with hole', [sq(0, 0, 10), cw(sq(2, 2, 2))], []],
    [
      'bowtie',
      [
        [
          [0, 0],
          [20, 20],
          [20, 0],
          [0, 10],
          [0, 0],
        ],
      ],
      [/self-intersects/],
    ],
    [
      'open ring',
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ],
      [/not closed/],
    ],
    [
      'too short',
      [
        [
          [0, 0],
          [10, 0],
          [0, 0],
        ],
      ],
      [/fewer than 4/],
    ],
    [
      'spike',
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [10, 5],
          [0, 10],
          [0, 0],
        ],
      ],
      [/folds back/],
    ],
    ['hole outside', [sq(0, 0, 10), cw(sq(20, 20, 2))], [/outside the outer ring/]],
    ['hole crossing outer', [sq(0, 0, 10), cw(sq(8, 8, 4))], [/touch/]],
  ] as [string, XY[][], RegExp[]][])('%s', (_name, rings, expected) => {
    const problems = polygonProblems(rings);
    expect(problems.length).toBe(expected.length === 0 ? 0 : problems.length);
    for (const re of expected) expect(problems.join('\n')).toMatch(re);
    if (expected.length > 0) expect(problems.length).toBeGreaterThan(0);
  });
});

describe('lengthInside, hull, aspect', () => {
  const poly: PlanarPolygon[] = [[sq(0, 0, 100), cw(sq(40, 40, 20))]];
  it.each([
    [
      'through the middle, skipping the hole',
      [
        [-50, 50],
        [150, 50],
      ],
      80,
    ],
    [
      'outside',
      [
        [-50, 150],
        [150, 150],
      ],
      0,
    ],
    [
      'ending inside',
      [
        [-50, 10],
        [30, 10],
      ],
      30,
    ],
    [
      'multi-vertex',
      [
        [-10, 10],
        [50, 10],
        [50, -10],
      ],
      60,
    ],
  ] as [string, XY[], number][])('%s', (_name, line, expected) => {
    expect(lengthInside(line, poly)).toBeCloseTo(expected, 6);
  });

  it('convex hull drops interior points', () => {
    const hull = convexHull([
      [0, 0],
      [10, 0],
      [5, 5],
      [10, 10],
      [0, 10],
      [5, 1],
    ]);
    expect(hull).toHaveLength(4);
  });

  it('aspect of a rotated 400 x 10 strip is 40, of a square 1', () => {
    const c = Math.cos(0.5);
    const s = Math.sin(0.5);
    const rot = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
    const strip: XY[] = [
      [0, 0],
      [400, 0],
      [400, 10],
      [0, 10],
      [0, 0],
    ].map((p) => rot(p as XY));
    expect(minRotatedRectangleAspect([[strip]])).toBeCloseTo(40, 6);
    expect(minRotatedRectangleAspect([[sq(0, 0, 10)]])).toBeCloseTo(1, 6);
  });

  it('roundGeometry rounds, drops repeated positions and keeps rings closed', () => {
    const g = roundGeometry(
      {
        type: 'Polygon',
        coordinates: [
          [
            [1.0000001, 2],
            [1.0000004, 2],
            [3, 2],
            [3, 4],
            [1, 4],
          ],
        ],
      },
      6,
    );
    expect(g.coordinates[0]).toEqual([
      [1, 2],
      [3, 2],
      [3, 4],
      [1, 4],
      [1, 2],
    ]);
  });
});
