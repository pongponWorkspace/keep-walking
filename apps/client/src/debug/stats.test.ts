import { describe, expect, it } from 'vitest';
import {
  computeAccuracyStats,
  computeGapStats,
  computeGateWindows,
  computePathLengthM,
  computeSampleIntervalMedianS,
  computeStationaryAccumM,
  computeTtffS,
  haversineMeters,
  percentile,
} from './stats';
import type { HudSample } from './stats';

const SECOND = 1000;
const START = 1_700_000_000_000;

function sample(offsetSeconds: number, lat: number, lng: number, accuracy = 10): HudSample {
  return { timestamp: START + offsetSeconds * SECOND, lat, lng, accuracy };
}

function stationarySample(
  offsetSeconds: number,
  lat: number,
  lng: number,
  accuracy = 10,
): HudSample {
  return { ...sample(offsetSeconds, lat, lng, accuracy), segment: 'stationary' };
}

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters({ lat: 13.7563, lng: 100.4933 }, { lat: 13.7563, lng: 100.4933 })).toBe(
      0,
    );
  });

  it('matches a known reference distance within 1%', () => {
    // Bangkok (13.7563, 100.4933) to Lumpini Park gate (13.7305, 100.5415): ~6.0 km.
    const d = haversineMeters({ lat: 13.7563, lng: 100.4933 }, { lat: 13.7305, lng: 100.5415 });
    expect(d).toBeGreaterThan(5900);
    expect(d).toBeLessThan(6100);
  });
});

describe('percentile', () => {
  it('returns undefined for an empty array', () => {
    expect(percentile([], 90)).toBeUndefined();
  });

  it('picks the nearest-rank value for p90 of 10 sorted values', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 90)).toBe(9);
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 5)).toBe(1);
  });
});

describe('computeAccuracyStats', () => {
  it('excludes samples inside the warm-up window', () => {
    const samples = [sample(0, 13.73, 100.54, 100), sample(65, 13.73, 100.54, 10)];
    const stats = computeAccuracyStats(samples, START, 60, 90);
    expect(stats.sampleCount).toBe(1);
    expect(stats.median_m).toBe(10);
  });

  it('returns undefined fields when nothing survives warm-up', () => {
    const stats = computeAccuracyStats([sample(0, 13.73, 100.54, 10)], START, 60, 90);
    expect(stats).toEqual({
      median_m: undefined,
      highPercentile_m: undefined,
      max_m: undefined,
      sampleCount: 0,
    });
  });
});

describe('computeGapStats', () => {
  it('counts only gaps strictly greater than the threshold', () => {
    const samples = [sample(0, 0, 0), sample(5, 0, 0), sample(20, 0, 0), sample(21, 0, 0)];
    const stats = computeGapStats(samples, 10, 21);
    expect(stats.count).toBe(1);
    expect(stats.total_s).toBe(15);
    expect(stats.pct).toBeCloseTo((15 / 21) * 100);
  });
});

describe('computeSampleIntervalMedianS', () => {
  it('returns the median gap between fixes', () => {
    const samples = [sample(0, 0, 0), sample(1, 0, 0), sample(3, 0, 0), sample(6, 0, 0)];
    expect(computeSampleIntervalMedianS(samples)).toBe(2);
  });
});

describe('computePathLengthM', () => {
  it('sums consecutive haversine distances, unfiltered', () => {
    const a = { lat: 13.73, lng: 100.54 };
    const b = { lat: 13.7305, lng: 100.5405 };
    const samples = [sample(0, a.lat, a.lng), sample(1, b.lat, b.lng), sample(2, a.lat, a.lng)];
    const expected = haversineMeters(a, b) * 2;
    expect(computePathLengthM(samples)).toBeCloseTo(expected, 3);
  });
});

describe('computeGateWindows', () => {
  const gate = {
    minDistancePerWindow_m: 50,
    window_s: 300,
    comparison: 'greaterThan' as const,
    filter: undefined,
  };
  const gateWithFilter = {
    ...gate,
    filter: {
      maxSampleAccuracy_m: 30,
      outlierSpeed_kmh: 30,
      outlierReanchorSamples: 5,
      sampleCadence_s: 5,
      maxSamplePairGap_s: 30,
    },
  };

  it('passes a window where the walked distance exceeds the threshold (no filter configured)', () => {
    // Walks ~0.001 deg lat every 30s for 6 minutes (well over 50 m per 5-minute window).
    const samples: HudSample[] = [];
    for (let t = 0; t <= 360; t += 30) {
      samples.push(sample(t, 13.73 + t * 0.00002, 100.54));
    }
    const stats = computeGateWindows(samples, gate, 30);
    expect(stats.windowsTotal).toBeGreaterThan(0);
    expect(stats.windowsPass).toBe(stats.windowsTotal);
    expect(stats.windowsPassPct).toBe(100);
    expect(stats.windowsPassFiltered).toBeUndefined();
    expect(stats.windowsPassFilteredPct).toBeUndefined();
  });

  it('fails every window when standing still (no filter configured)', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 360; t += 30) {
      samples.push(sample(t, 13.73, 100.54));
    }
    const stats = computeGateWindows(samples, gate, 30);
    expect(stats.windowsPass).toBe(0);
    expect(stats.windowsTotal).toBeGreaterThan(0);
  });

  it('reports zero windows for a segment shorter than window_s', () => {
    const samples = [sample(0, 13.73, 100.54), sample(60, 13.7305, 100.54)];
    expect(computeGateWindows(samples, gate, 30)).toEqual({
      windowsTotal: 0,
      windowsPass: 0,
      windowsPassPct: 0,
      windowsPassFiltered: undefined,
      windowsPassFilteredPct: undefined,
    });
  });

  it('also fills in the filtered columns via geo gateDiagnosticWindows once gate.filter is set', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 360; t += 5) {
      samples.push(sample(t, 13.73 + t * 0.00002, 100.54));
    }
    const stats = computeGateWindows(samples, gateWithFilter, 30);
    expect(stats.windowsTotal).toBeGreaterThan(0);
    expect(stats.windowsPassFiltered).toBe(stats.windowsTotal);
    expect(stats.windowsPassFilteredPct).toBe(100);
  });

  it('lets a raw window pass on an unfiltered drift spike while the filtered window does not', () => {
    // A near-stationary walk (well under 50 m per window) plus one 300 m round-trip spike: the
    // raw sum includes the spike (passes), the filtered pipeline drops it as an outlier (fails) —
    // this is exactly why gate_windows_pass and gate_windows_pass_filtered can disagree (ADR 0003
    // 5.3, synthetic-drift-spike-01).
    const samples: HudSample[] = [];
    for (let t = 0; t <= 300; t += 5) {
      samples.push(sample(t, 13.73, 100.54));
    }
    samples.push(sample(152, 13.7327, 100.54)); // ~300 m north, mid-window, then back at t=155
    samples.sort((a, b) => a.timestamp - b.timestamp);
    const stats = computeGateWindows(samples, gateWithFilter, 30);
    expect(stats.windowsPass).toBeGreaterThan(0);
    expect(stats.windowsPassFiltered).toBe(0);
  });
});

describe('computeTtffS', () => {
  it('finds the first sample at or under the accuracy threshold', () => {
    const samples = [sample(0, 0, 0, 100), sample(5, 0, 0, 40), sample(12, 0, 0, 20)];
    expect(computeTtffS(samples, START, 30)).toBe(12);
  });

  it('returns undefined when accuracy never meets the threshold', () => {
    expect(computeTtffS([sample(0, 0, 0, 100)], START, 30)).toBeUndefined();
  });
});

describe('computeStationaryAccumM', () => {
  const gate = {
    minDistancePerWindow_m: 50,
    window_s: 300,
    comparison: 'greaterThan' as const,
    filter: undefined,
  };
  const gateWithFilter = {
    ...gate,
    filter: {
      maxSampleAccuracy_m: 30,
      outlierSpeed_kmh: 30,
      outlierReanchorSamples: 5,
      sampleCadence_s: 5,
      maxSamplePairGap_s: 30,
    },
  };

  it('reports undefined (not measured yet) with fewer than two stationary-tagged samples', () => {
    expect(computeStationaryAccumM([sample(0, 13.73, 100.54)], gate)).toEqual({
      accumM: undefined,
      accumFilteredM: undefined,
    });
  });

  it('ignores samples not tagged stationary, even if there are plenty of them', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 300; t += 5) {
      samples.push(sample(t, 13.73 + t * 0.00002, 100.54)); // no segment tag
    }
    expect(computeStationaryAccumM(samples, gate).accumM).toBeUndefined();
  });

  it('reports undefined until 300s of stationary-tagged samples have been collected', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 200; t += 5) {
      samples.push(stationarySample(t, 13.73, 100.54));
    }
    expect(computeStationaryAccumM(samples, gate).accumM).toBeUndefined();
  });

  it('sums raw jitter over the fixed 300s window once enough stationary samples exist (no filter configured)', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 300; t += 5) {
      // Tiny jitter around one point, not a real walk.
      samples.push(stationarySample(t, 13.73 + (t % 10 === 0 ? 0.000005 : 0), 100.54));
    }
    const stats = computeStationaryAccumM(samples, gate);
    expect(stats.accumM).toBeGreaterThan(0);
    expect(stats.accumFilteredM).toBeUndefined();
  });

  it('fills in the filtered column too once gate.filter is configured', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 300; t += 5) {
      samples.push(stationarySample(t, 13.73, 100.54));
    }
    const stats = computeStationaryAccumM(samples, gateWithFilter);
    expect(stats.accumM).toBeDefined();
    expect(stats.accumFilteredM).toBeDefined();
  });

  it('drops a jitter spike from the filtered value but not from the raw one (ADR 0003 5.3)', () => {
    const samples: HudSample[] = [];
    for (let t = 0; t <= 300; t += 5) {
      samples.push(stationarySample(t, 13.73, 100.54));
    }
    samples.push(stationarySample(152, 13.7327, 100.54)); // ~300 m spike mid-window
    samples.sort((a, b) => a.timestamp - b.timestamp);
    const stats = computeStationaryAccumM(samples, gateWithFilter);
    expect(stats.accumM).toBeGreaterThan(100);
    expect(stats.accumFilteredM).toBeLessThan(10);
  });
});
