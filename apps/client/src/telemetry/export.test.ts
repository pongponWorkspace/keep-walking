import { describe, expect, it } from 'vitest';
import { buildTelemetryExport, exportFileName } from './export';
import type { TelemetryRecord } from './sink';

const GUARD = { minDecimals: 4, latRange_deg: [5, 21] as const, lngRange_deg: [97, 106] as const };
const FORBIDDEN = ['lat', 'lng', 'accuracy', 'timestamp'];

function rec(
  client_ts_ms: number,
  properties: Record<string, string | number | boolean | null> = {},
): TelemetryRecord {
  return {
    event_name: 'dungeon_entered',
    client_ts_ms,
    session_id: 'abcd1234',
    platform: 'android-chrome',
    app_version: 'deadbee',
    properties,
  };
}

describe('buildTelemetryExport', () => {
  it('returns an empty result for no records', () => {
    expect(buildTelemetryExport([], FORBIDDEN, GUARD)).toEqual({
      jsonl: '',
      lineCount: 0,
      redactedCount: 0,
    });
  });

  it('rewrites client_ts_ms as t_rel_ms relative to the first record, dropping the absolute time', () => {
    const result = buildTelemetryExport([rec(5000), rec(5200), rec(5900)], FORBIDDEN, GUARD);
    const lines = result.jsonl.split('\n').map((l) => JSON.parse(l) as { t_rel_ms: number });
    expect(lines.map((l) => l.t_rel_ms)).toEqual([0, 200, 900]);
    expect(result.jsonl).not.toContain('client_ts_ms');
  });

  it('never emits an absolute wall-clock-shaped number: t_rel_ms of the first line is always 0', () => {
    const result = buildTelemetryExport([rec(1_700_000_000_000)], FORBIDDEN, GUARD);
    const [line] = result.jsonl.split('\n').map((l) => JSON.parse(l) as { t_rel_ms: number });
    expect(line?.t_rel_ms).toBe(0);
  });

  it('re-runs the C2-3 guard on export and counts anything it still had to redact', () => {
    const result = buildTelemetryExport(
      [rec(1000, { lat: 13.7563, ok: 'fine' })],
      FORBIDDEN,
      GUARD,
    );
    const [line] = result.jsonl.split('\n').map((l) => JSON.parse(l) as { properties: unknown });
    expect(line?.properties).toEqual({ ok: 'fine' });
    expect(result.redactedCount).toBe(1);
  });

  it('produces one line per record, LF-joined with no trailing newline', () => {
    const result = buildTelemetryExport([rec(1000), rec(2000)], FORBIDDEN, GUARD);
    expect(result.lineCount).toBe(2);
    expect(result.jsonl.endsWith('\n')).toBe(false);
    expect(result.jsonl.split('\n')).toHaveLength(2);
  });
});

describe('exportFileName', () => {
  it('has the prefix, a hex id, and the .jsonl extension, and no date-shaped substring', () => {
    const name = exportFileName('kw-p2-telemetry', () => 'deadbeef');
    expect(name).toBe('kw-p2-telemetry-deadbeef.jsonl');
    expect(name).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
