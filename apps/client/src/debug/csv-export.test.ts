import { describe, expect, it } from 'vitest';
import { buildSummaryCsv } from './csv-export';
import type { SummaryRow } from './csv-export';

function row(overrides: Partial<SummaryRow> = {}): SummaryRow {
  return {
    sessionId: 'a1b2',
    appVersion: 'deadbee',
    tilesetId: 'pm4-20260923-z15',
    platform: 'android-chrome',
    environment: 'park',
    segment: 'all',
    localHour: 10,
    durationS: 1200,
    fpsPanAvg: 58.2,
    fpsPanP5: 31,
    fpsFollowAvg: 60,
    fpsFollowP5: 40,
    movingTimePanS: 65,
    movingTimeFollowS: 900,
    batteryStartPct: 90,
    batteryEndPct: 85,
    batteryDrainPer30MinPct: 7.5,
    batterySource: 'api',
    mbJs: 1.2,
    mbStyle: 0.8,
    mbTiles: 6.1,
    mbTotal: 8.1,
    bytesMethod: 'transfer',
    timeToFirstMapMs: 1800,
    sampleCount: 1180,
    sampleIntervalMedianS: 1,
    ttff30mS: 12,
    accuracyMedianM: 8,
    accuracyP90M: 18,
    accuracyMaxM: 45,
    gapCount10s: 2,
    gapTotalS: 25,
    gapPct: 2.1,
    pathLengthM: 1450,
    gateWindowsTotal: 22,
    gateWindowsPass: 21,
    gateWindowsPassPct: 95.4,
    stationary5MinAccumM: undefined,
    latencyMedianMs: 400,
    latencyP90Ms: 900,
    ...overrides,
  };
}

describe('buildSummaryCsv', () => {
  it('never emits a coordinate-shaped column (lat/lng/geohash) — privacy.json summaryExport guard rail', () => {
    const csv = buildSummaryCsv([row()]);
    const [header] = csv.split('\n');
    const columns = (header ?? '').split(',');
    for (const forbidden of ['lat', 'lng', 'geohash', 'device_model', 'user_agent']) {
      expect(columns).not.toContain(forbidden);
    }
  });

  it('writes one header row and one line per data row', () => {
    const csv = buildSummaryCsv([row(), row({ segment: 'screen_on' })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^format_version,session_id,app_version/);
    expect(lines[1]).toContain(',all,');
    expect(lines[2]).toContain(',screen_on,');
  });

  it('renders a missing (undefined) measurement as an empty cell, not "undefined"', () => {
    const csv = buildSummaryCsv([row({ ttff30mS: undefined, batterySource: 'none' })]);
    expect(csv).not.toContain('undefined');
    const [headerLine, dataLine] = csv.split('\n');
    const cells = (dataLine ?? '').split(',');
    const header = (headerLine ?? '').split(',');
    expect(cells[header.indexOf('ttff_30m_s')]).toBe('');
    expect(cells[header.indexOf('battery_source')]).toBe('none');
  });

  it('quotes a value containing a comma', () => {
    const csv = buildSummaryCsv([row({ tilesetId: 'a,b' })]);
    expect(csv.split('\n')[1]).toContain('"a,b"');
  });
});
