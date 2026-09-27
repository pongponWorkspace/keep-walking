// @vitest-environment happy-dom
/**
 * `downloadTelemetryExport` (P2-X50): the DOM glue that turns a telemetry snapshot into an actual
 * downloaded file. Same interception approach as `debug/hud-panel.test.ts`'s own
 * `clickExportAndReadCsv` — happy-dom implements `Blob`/its `.text()`, so spying on
 * `URL.createObjectURL` is enough to read what would have been downloaded without a real browser.
 */
import { describe, expect, it, vi } from 'vitest';
import { downloadTelemetryExport } from './download';
import type { TelemetryRecord } from './sink';

const GUARD = { minDecimals: 4, latRange_deg: [5, 21] as const, lngRange_deg: [97, 106] as const };
const FORBIDDEN = ['lat', 'lng', 'lon', 'accuracy', 'coords', 'timestamp'];

function rec(
  event_name: string,
  client_ts_ms: number,
  properties: Record<string, string | number | boolean | null> = {},
): TelemetryRecord {
  return {
    event_name,
    client_ts_ms,
    session_id: 'abcd1234',
    platform: 'android-chrome',
    app_version: 'deadbee',
    properties,
  };
}

/** Captures the Blob text and the anchor's `download` attribute the function under test builds,
 * without ever letting a real file hit disk. */
async function capture(records: readonly TelemetryRecord[]): Promise<{
  text: string;
  fileName: string;
  mimeType: string;
}> {
  let capturedText = '';
  let capturedType = '';
  const createSpy = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation((obj: Blob | MediaSource) => {
      const blob = obj as Blob;
      capturedType = blob.type;
      void blob.text().then((text) => {
        capturedText = text;
      });
      return 'blob:mock';
    });
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

  const fileName = downloadTelemetryExport({
    records,
    forbiddenPropertyNames: FORBIDDEN,
    coordinateGuard: GUARD,
    fileNamePrefix: 'kw-p2-telemetry',
    mimeType: 'application/x-ndjson',
  });

  // Blob.text() resolves on a microtask; flush it before reading capturedText.
  await Promise.resolve();
  await Promise.resolve();
  createSpy.mockRestore();
  revokeSpy.mockRestore();
  return { text: capturedText, fileName, mimeType: capturedType };
}

describe('downloadTelemetryExport', () => {
  it('downloads a JSONL blob with the right mime type and no trailing newline', async () => {
    const { text, mimeType } = await capture([rec('dungeon_entered', 1000)]);
    expect(mimeType).toBe('application/x-ndjson');
    expect(text.endsWith('\n')).toBe(false);
    const line = JSON.parse(text) as { event_name: string; t_rel_ms: number };
    expect(line.event_name).toBe('dungeon_entered');
    expect(line.t_rel_ms).toBe(0);
  });

  it('names the file with the configured prefix, a random hex suffix, .jsonl, and no date/session id', async () => {
    const { fileName } = await capture([rec('dungeon_entered', 1000)]);
    expect(fileName).toMatch(/^kw-p2-telemetry-[0-9a-f]{8}\.jsonl$/);
    expect(fileName).not.toContain('abcd1234');
  });

  it('two calls in a row never reuse the same file name (random suffix, no shared counter)', async () => {
    const first = await capture([rec('dungeon_entered', 1000)]);
    const second = await capture([rec('dungeon_entered', 1000)]);
    expect(first.fileName).not.toBe(second.fileName);
  });

  it('keeps every non-coordinate event and property, and never leaks a forbidden key or a coordinate-shaped number', async () => {
    const { text } = await capture([
      rec('dungeon_entered', 1000, { dungeon_id: 'lumphini-park' }),
      rec('run_tick_granted', 1500, { lat: 13.7563, ok: 'fine' }),
      rec('onboarding_first_reward_granted', 2000, {}),
    ]);
    const lines = text.split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines.map((l) => l['event_name'])).toEqual([
      'dungeon_entered',
      'run_tick_granted',
      'onboarding_first_reward_granted',
    ]);
    expect(text).not.toMatch(/"lat"|"lng"|"lon"|"accuracy"|"coords"|"client_ts_ms"|"timestamp"/);
    expect(text).not.toMatch(/13\.7563/);
  });

  it('produces an empty blob (no lines) when the ring buffer is empty', async () => {
    const { text } = await capture([]);
    expect(text).toBe('');
  });
});
