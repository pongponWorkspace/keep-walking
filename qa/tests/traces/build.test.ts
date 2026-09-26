// Wires qa/tests/traces/build.ts's --check contract into `pnpm test` (board acceptance:
// "QA trace สร้างด้วย script ... พร้อมโหมด --check ใน pnpm test · ผ่าน validateTrace"). Mirrors
// tools/traces/src/generator.test.ts's structure for the same reason that file exists: a trace
// file committed by hand can silently drift from what the generator would produce.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateTrace } from '@keep-walking/shared';
import { QA_SCENARIOS } from './catalog';
import { buildOutputs } from './build';
import { QA_OVERLAP_RECT, insideQaOverlapRect } from './lib/overlap-polygon';
import { CHECKIN_ACCURACY_M } from './scenarios/checkin-accuracy';

const committed = buildOutputs();

describe('qa/tests/traces/build.ts — every QA trace regenerates byte-identical (the --check contract)', () => {
  it(`builds exactly ${QA_SCENARIOS.length} traces + 1 polygon, matching QA_SCENARIOS`, () => {
    expect(committed).toHaveLength(QA_SCENARIOS.length + 1);
  });

  it.each(committed)(
    '$path is committed and byte-identical to the generator',
    ({ path, content }) => {
      const onDisk = readFileSync(path, 'utf8');
      expect(onDisk).toBe(content);
    },
  );

  it.each(committed.filter((f) => f.path.endsWith('.trace.json')))(
    '$path passes validateTrace',
    ({ content }) => {
      const result = validateTrace(JSON.parse(content));
      expect(result.ok, result.ok ? '' : JSON.stringify(result.errors)).toBe(true);
    },
  );

  it('every QA trace declares meta.kind "qa" (not tools/traces\' default "synthetic")', () => {
    for (const f of committed.filter((x) => x.path.endsWith('.trace.json'))) {
      const trace = JSON.parse(f.content);
      expect(trace.meta.kind).toBe('qa');
    }
  });

  it('regenerating twice with the same seed is byte-identical (mulberry32 determinism)', () => {
    const again = buildOutputs();
    expect(again).toStrictEqual(committed);
  });
});

function traceByIdSuffix(suffix: string) {
  const f = committed.find((x) => x.path.endsWith(`${suffix}.trace.json`));
  if (f === undefined) throw new Error(`no committed output ends with ${suffix}.trace.json`);
  return JSON.parse(f.content) as {
    samples: { t: number; lat: number; lng: number; accuracy: number }[];
  };
}

describe('qa-checkin-accuracy-35-01 — every fix reports the same rejected accuracy', () => {
  it(`every sample has accuracy === ${CHECKIN_ACCURACY_M} m (never below checkIn.maxAccuracy_m)`, () => {
    const trace = traceByIdSuffix('qa-checkin-accuracy-35-01');
    for (const s of trace.samples) expect(s.accuracy).toBe(CHECKIN_ACCURACY_M);
  });
});

describe('qa-movement-gap-400m-01 — the recorded gap is far wider than maxSamplePairGap_s', () => {
  it('has exactly one pair gap, about 5 minutes wide, with no samples inside it', () => {
    const trace = traceByIdSuffix('qa-movement-gap-400m-01');
    const gaps: number[] = [];
    for (let i = 1; i < trace.samples.length; i += 1) {
      const dt = (trace.samples[i] as { t: number }).t - (trace.samples[i - 1] as { t: number }).t;
      if (dt > 30_000) gaps.push(dt);
    }
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toBeGreaterThan(295_000);
    expect(gaps[0]).toBeLessThan(310_000);
  });
});

describe('qa-polygon-overlap-01 — the walk visits all four zones of the two overlapping rectangles', () => {
  it('has fixes outside both, inside TEST_RECT only, inside both, and inside qa-rect-overlap-b only', () => {
    const trace = traceByIdSuffix('qa-polygon-overlap-01');
    const testRectSouth = 13.7293;
    const testRectNorth = 13.7317;
    const testRectWest = 100.5662;
    const testRectEast = 100.5683;
    const insideTestRect = (p: { lat: number; lng: number }) =>
      p.lat >= testRectSouth &&
      p.lat <= testRectNorth &&
      p.lng >= testRectWest &&
      p.lng <= testRectEast;
    const zones = new Set(
      trace.samples.map((s) => `${insideTestRect(s)}-${insideQaOverlapRect(s)}`),
    );
    expect(zones).toStrictEqual(new Set(['true-false', 'true-true', 'false-true', 'false-false']));
    // qa-rect-overlap-b really overlaps (not disjoint, not identical): its west edge is strictly
    // inside TEST_RECT and its east edge is strictly outside it.
    expect(QA_OVERLAP_RECT.west).toBeGreaterThan(testRectWest);
    expect(QA_OVERLAP_RECT.west).toBeLessThan(testRectEast);
    expect(QA_OVERLAP_RECT.east).toBeGreaterThan(testRectEast);
  });
});
