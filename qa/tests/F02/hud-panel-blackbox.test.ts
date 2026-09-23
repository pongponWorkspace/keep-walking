/**
 * TC-HUD-03, TC-HUD-05, TC-HUD-06, TC-HUD-07, TC-HUD-10, TC-HUD-11 (qa/plans/F02-test-plan.md
 * section 4.3) — now that the debug HUD exists (P1-F02-T11), this file exercises its exported
 * pure functions directly (the "public interface" of a module with no DOM: TL-S04 black-box rule
 * applied at the module boundary, same convention as debug/*.test.ts already use for themselves).
 *
 * Deliberately QA-authored inputs and hand-computed expected values, independent of the numbers
 * used in the dev unit tests under apps/client/src/debug/*.test.ts (which this file must never
 * modify — protocol.md rule 2 "do not modify developers' unit tests; hand off instead"). Where a
 * measurement lives only inside the DOM-bound apps/client/src/debug/hud-panel.ts (no pure export),
 * this file records that as PENDING with a reason rather than re-implementing it (test plan section
 * 4.3 header: "ไม่ใช้ HUD ตรวจ HUD เอง").
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { validateTrace } from '@keep-walking/shared';
import { computeSampleIntervalMedianS } from '../../../apps/client/src/debug/stats';
import { FpsAccumulator } from '../../../apps/client/src/debug/fps-sampler';
import {
  countBytes,
  getByteTotals,
  resetByteTotals,
  computeJsBytes,
} from '../../../apps/client/src/debug/byte-counter';
import { buildSummaryCsv } from '../../../apps/client/src/debug/csv-export';
import type { SummaryRow } from '../../../apps/client/src/debug/csv-export';
import { sanitizeRawTrace } from '../../../apps/client/src/debug/raw-trace-export';
import { readBatteryLevel, parseManualBatteryPct } from '../../../apps/client/src/debug/battery';

function sample(
  timestamp: number,
  lat = 13.7,
  lng = 100.5,
  accuracy = 5,
): {
  timestamp: number;
  lat: number;
  lng: number;
  accuracy: number;
} {
  return { timestamp, lat, lng, accuracy };
}

describe('TC-HUD-03 — sample-interval median (S14)', () => {
  it('odd number of gaps, all equal to 1 s: median is exactly 1', () => {
    // 6 samples 1 s apart -> 5 gaps, all 1 s.
    const samples = [0, 1000, 2000, 3000, 4000, 5000].map((t) => sample(t));
    expect(computeSampleIntervalMedianS(samples)).toBe(1);
  });

  it('even number of gaps, mixed values: this codebase\'s "median" is nearest-rank p50 (stats.ts percentile doc: "no interpolation"), not the textbook average of the two middle values', () => {
    // timestamps 0,1000,3000,7000,8000 -> gaps [1, 2, 4, 1] s, sorted [1, 1, 2, 4].
    // Nearest-rank p50 of 4 values: rank = ceil(0.5*4)-1 = 1 (0-indexed) -> sorted[1] = 1.
    // A textbook median would report (1+2)/2 = 1.5 here -- the two definitions disagree on this
    // input on purpose, so this case actually exercises which formula computeSampleIntervalMedianS
    // uses, instead of picking values where both formulas happen to agree.
    const samples = [0, 1000, 3000, 7000, 8000].map((t) => sample(t));
    expect(computeSampleIntervalMedianS(samples)).toBe(1);
  });

  it('fewer than 2 samples: undefined, never throws', () => {
    expect(computeSampleIntervalMedianS([])).toBeUndefined();
    expect(computeSampleIntervalMedianS([sample(0)])).toBeUndefined();
  });
});

describe('TC-HUD-04 — render latency median/p90 (S15): PENDING, no pure export to call', () => {
  it.skip('PENDING: latency = Date.now() - sample.timestamp lives inline in debug/hud-panel.ts (lines ~289-291), which needs a live map `render` event and the DOM this module deliberately avoids (its own file comment: "no DOM render-callback hook here ... covered by e2e"). There is no pure exported function to feed a fake per-sample render timestamp array into from Vitest, and qa/tests/e2e is outside this task\'s `writes`. Real numbers: FIELD-S15 only (test plan section 3).', () => {
    // Intentionally empty: recorded as PENDING evidence, not a placeholder assertion.
  });
});

describe('TC-HUD-05 — FPS average and low-percentile (S1/S2)', () => {
  it('drops a hidden-tab gap (> maxFrameGapMs) and an inactive frame; avg is frames/movingTime, not a simple mean', () => {
    const acc = new FpsAccumulator(1000, 5); // maxFrameGapMs=1000, lowPercentile=5th
    for (let i = 0; i < 8; i += 1) acc.recordFrame(20, true); // 8 frames @ 50 fps
    for (let i = 0; i < 2; i += 1) acc.recordFrame(50, true); // 2 frames @ 20 fps (a short drop)
    acc.recordFrame(1500, true); // page hidden for 1.5 s: gapMs > maxFrameGapMs -> excluded
    acc.recordFrame(20, false); // camera not moving: excluded regardless of gapMs

    const stats = acc.stats();
    // movingMs = 8*20 + 2*50 = 260 ms; avg = instantFps.length / movingTimeS = 10 / 0.26.
    expect(stats.movingTimeS).toBeCloseTo(0.26, 6);
    expect(stats.avg).toBeCloseTo(10 / 0.26, 6);
    // sorted instant fps: [20,20,50,50,50,50,50,50,50,50]; 5th percentile (nearest-rank) -> index 0.
    expect(stats.lowPercentile).toBe(20);
  });

  it('no frames recorded (map never moved): avg/lowPercentile are undefined, never NaN', () => {
    const acc = new FpsAccumulator(1000, 5);
    const stats = acc.stats();
    expect(stats.avg).toBeUndefined();
    expect(stats.lowPercentile).toBeUndefined();
    expect(stats.movingTimeS).toBe(0);
  });
});

describe('TC-HUD-06 — battery source and reading (S3), partial', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('battery_source=api: reads and rounds navigator.getBattery().level to a percent', async () => {
    vi.stubGlobal('navigator', { getBattery: async () => ({ level: 0.6135 }) });
    const reading = await readBatteryLevel();
    expect(reading).toEqual({ pct: 61, source: 'api' }); // Math.round(61.35)
  });

  it('battery_source=none on iOS Safari (no Battery Status API, D-003): never fabricates an "api" value', async () => {
    vi.stubGlobal('navigator', {});
    const reading = await readBatteryLevel();
    expect(reading).toEqual({ pct: undefined, source: 'none' });
  });

  it('manual entry: valid percent parses, out-of-range and non-numeric are rejected without throwing', () => {
    expect(parseManualBatteryPct('77')).toBe(77);
    expect(parseManualBatteryPct('101')).toBeUndefined();
    expect(parseManualBatteryPct('-5')).toBeUndefined();
    expect(parseManualBatteryPct('not-a-number')).toBeUndefined();
  });

  it.skip('PENDING: battery_drain_per30min_pct formula (start/end pct * batteryNormalizeWindow_s / duration_s) and the manual-entry-forces-battery_source=manual wiring into the summary CSV are inline in debug/hud-panel.ts (closure state, DOM input element), not a pure export — e2e-only (FIELD-S3 for real numbers; apps/client/e2e/location-mock.spec.ts already proves batterySource is one of api/manual/none end to end).', () => {
    // Intentionally empty: recorded as PENDING evidence, not a placeholder assertion.
  });
});

describe('TC-HUD-07 — JS/style/tile byte totals (S5-S8)', () => {
  afterEach(() => {
    resetByteTotals();
    vi.unstubAllGlobals();
  });

  it('countBytes accumulates per category and ignores negative/non-finite input (never corrupts the running total)', () => {
    resetByteTotals();
    countBytes('style', 12_000);
    countBytes('style', 3_000);
    countBytes('tiles', 500_000);
    countBytes('tiles', -999); // must be ignored (defensive against a bad Resource Timing entry)
    countBytes('style', Number.NaN); // must be ignored
    expect(getByteTotals()).toEqual({ style: 15_000, tiles: 500_000 });
  });

  it('bytes_method=transfer when encodedBodySize is reported (Timing-Allow-Origin present)', () => {
    vi.stubGlobal('performance', {
      getEntriesByType: (type: string) =>
        type === 'resource'
          ? [
              { initiatorType: 'script', encodedBodySize: 300_000, decodedBodySize: 900_000 },
              { initiatorType: 'link', encodedBodySize: 20_000, decodedBodySize: 20_000 },
              { initiatorType: 'img', encodedBodySize: 999_999, decodedBodySize: 999_999 }, // not js/style: excluded
            ]
          : [],
    });
    expect(computeJsBytes()).toEqual({ bytes: 320_000, method: 'transfer' });
  });

  it('bytes_method=decoded when every encodedBodySize is 0 (F11, no Timing-Allow-Origin cross-origin script)', () => {
    vi.stubGlobal('performance', {
      getEntriesByType: (type: string) =>
        type === 'resource'
          ? [{ initiatorType: 'script', encodedBodySize: 0, decodedBodySize: 450_000 }]
          : [],
    });
    expect(computeJsBytes()).toEqual({ bytes: 450_000, method: 'decoded' });
  });

  it('no Resource Timing API at all (older/locked-down browser): 0 bytes, method=decoded, never throws', () => {
    vi.stubGlobal('performance', {});
    expect(computeJsBytes()).toEqual({ bytes: 0, method: 'decoded' });
  });
});

// A fully-populated row: if any forbidden column ever gets added to SummaryRow, this still
// compiles (TypeScript would catch a genuinely new field only if this literal is exhaustive),
// and the string-content checks below catch anything that slips a coordinate into a text field.
const FULL_ROW: SummaryRow = {
  sessionId: 'qa-session-0001',
  appVersion: '0.1.0-qa',
  tilesetId: 'pm4-20260923-z15',
  platform: 'android-chrome',
  environment: 'park',
  segment: 'all',
  localHour: 14,
  durationS: 1800,
  fpsPanAvg: 58.2,
  fpsPanP5: 41,
  fpsFollowAvg: 55.1,
  fpsFollowP5: 38,
  movingTimePanS: 120,
  movingTimeFollowS: 90,
  batteryStartPct: 95,
  batteryEndPct: 88,
  batteryDrainPer30MinPct: 7,
  batterySource: 'api',
  mbJs: 1.7,
  mbStyle: 0.02,
  mbTiles: 3.4,
  mbTotal: 5.12,
  bytesMethod: 'transfer',
  timeToFirstMapMs: 820,
  sampleCount: 900,
  sampleIntervalMedianS: 1,
  ttff30mS: 12,
  accuracyMedianM: 6.5,
  accuracyP90M: 11,
  accuracyMaxM: 30,
  gapCount10s: 1,
  gapTotalS: 120,
  gapPct: 6.67,
  pathLengthM: 1500,
  gateWindowsTotal: 6,
  gateWindowsPass: 5,
  gateWindowsPassPct: 83.33,
  stationary5MinAccumM: undefined,
  latencyMedianMs: 250,
  latencyP90Ms: 600,
};

describe('TC-HUD-10 — summary CSV never carries a coordinate, place name, epoch time, or device string', () => {
  it('header has no lat/lng/geohash/device/UA column, and every row cell is free of coordinate-shaped numbers', () => {
    const csv = buildSummaryCsv([FULL_ROW]);
    const [header, dataLine] = csv.split('\n');
    expect(header).toBeDefined();
    expect(header).not.toMatch(/\blat\b|\blng\b|geohash|place|device|user_?agent/i);
    expect(dataLine).toBeDefined();
    // Bangkok-area coordinate shape: "13.x..." or "100.x..." with a decimal point, as a whole cell.
    expect((dataLine as string).split(',')).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^1[03]\.\d/)]),
    );
    // format_version + session_id lead every line (csv-export.ts header comment); still no PII in
    // the session id itself (it is a QA-chosen opaque string here, never a device id in the schema).
    expect(header).toMatch(/^format_version,session_id,/);
  });

  it('an empty rows array still produces just the header (no crash on a session with 0 rows)', () => {
    const csv = buildSummaryCsv([]);
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('a missing (undefined) measurement is an empty cell, never a fabricated 0 or "null" string', () => {
    const csv = buildSummaryCsv([FULL_ROW]);
    const cells = (csv.split('\n')[1] as string).split(',');
    const header = (csv.split('\n')[0] as string).split(',');
    const stationaryIndex = header.indexOf('stationary_5min_accum_m');
    expect(stationaryIndex).toBeGreaterThan(-1);
    expect(cells[stationaryIndex]).toBe('');
  });
});

const RAW_TRACE_TRIM_M = 200; // config/app/privacy.json#rawTraceExport.rawTraceTrim_m
const COORDINATE_DECIMALS = 5; // config/app/privacy.json#rawTraceExport.coordinateDecimals
const LAT_STEP_DEG_11M = 0.0001; // ~11.13 m per step at Bangkok's latitude (1 deg lat ~ 111.32 km)

/** A straight-line walk of `count` samples, `LAT_STEP_DEG_11M` apart, `stepMs` apart in time. */
function walkSamples(
  count: number,
  stepMs: number,
): { timestamp: number; lat: number; lng: number; accuracy: number }[] {
  return Array.from({ length: count }, (_, i) =>
    sample(i * stepMs, 13.73 + i * LAT_STEP_DEG_11M, 100.54, 5),
  );
}

describe('TC-HUD-11 — raw trace export: opt-in, trim, and validateTrace (S-shaped, GDD/PDPA)', () => {
  it('refuses cleanly (does not throw, does not return a trace) when the walk is too short to trim 200 m off both ends', () => {
    // 4 samples ~5 m apart: total path ~15 m, far short of rawTraceTrim_m.
    const short = [0, 1000, 2000, 3000].map((t) => sample(t, 13.73 + t * 0.0000001, 100.54));
    const result = sanitizeRawTrace(short, {
      rawTraceTrim_m: RAW_TRACE_TRIM_M,
      coordinateDecimals: COORDINATE_DECIMALS,
      sessionId: 'qa-short-0001',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/too short to trim safely/);
    }
  });

  it('accepts a long enough walk: trims >= 200 m off both ends, rounds to 5 decimals, relative time from 0, and the result independently re-passes validateTrace', () => {
    // 60 samples ~11.13 m apart -> ~657 m total: plenty of margin over 200 m + 200 m trim.
    const long = walkSamples(60, 2000);
    const result = sanitizeRawTrace(long, {
      rawTraceTrim_m: RAW_TRACE_TRIM_M,
      coordinateDecimals: COORDINATE_DECIMALS,
      sessionId: 'qa-long-0001',
      environment: 'park',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { trace } = result;
    expect(trace.meta.kind).toBe('field');
    expect(trace.meta.id).toBe('field-qa-long-0001');
    expect(trace.meta.sanitized?.trimStart_m).toBeGreaterThanOrEqual(RAW_TRACE_TRIM_M);
    expect(trace.meta.sanitized?.trimEnd_m).toBeGreaterThanOrEqual(RAW_TRACE_TRIM_M);
    expect(trace.samples[0]?.t).toBe(0);
    for (const s of trace.samples) {
      const latDecimals = (String(s.lat).split('.')[1] ?? '').length;
      const lngDecimals = (String(s.lng).split('.')[1] ?? '').length;
      expect(latDecimals).toBeLessThanOrEqual(COORDINATE_DECIMALS);
      expect(lngDecimals).toBeLessThanOrEqual(COORDINATE_DECIMALS);
    }
    // Defense-in-depth check: the trace this function hands back must itself clear the same gate
    // the Mock provider and (Phase 3) the server apply — proves sanitizeRawTrace is not the only
    // thing standing between an under-trimmed trace and a "successful" export.
    const revalidated = validateTrace(trace, { minTrim_m: RAW_TRACE_TRIM_M });
    expect(revalidated.ok).toBe(true);
  });

  it('validateTrace itself rejects a field trace under-trimmed below the configured minimum, with code "trim" (bypassing sanitizeRawTrace to prove the lower layer holds on its own)', () => {
    const underTrimmed = {
      format: 'keep-walking.gps-trace',
      formatVersion: 1,
      meta: {
        id: 'field-qa-under-trim',
        kind: 'field',
        timeBase: 'relative-ms',
        sanitized: { trimStart_m: 50, trimEnd_m: 250, coordinateDecimals: 5 },
      },
      samples: [
        { t: 0, lat: 13.73, lng: 100.54, accuracy: 5 },
        { t: 1000, lat: 13.7301, lng: 100.54, accuracy: 5 },
      ],
    };
    const result = validateTrace(underTrimmed, { minTrim_m: RAW_TRACE_TRIM_M });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some((e) => e.code === 'trim' && e.path === '/meta/sanitized/trimStart_m'),
    ).toBe(true);
    // trimEnd_m (250) is above the minimum, so only trimStart_m should be flagged.
    expect(result.errors.some((e) => e.path === '/meta/sanitized/trimEnd_m')).toBe(false);
  });

  it('never a network call: the module source has no fetch/XHR/sendBeacon (autoUploadAllowed=false, config/app/privacy.json)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const here = fileURLToPath(new URL('.', import.meta.url));
    const src = readFileSync(`${here}/../../../apps/client/src/debug/raw-trace-export.ts`, 'utf-8');
    expect(src).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  });
});
