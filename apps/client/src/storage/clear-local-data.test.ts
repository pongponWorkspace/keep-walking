import { describe, expect, it, vi } from 'vitest';
import { clearLocalData } from './clear-local-data';
import { createMemoryStorage, readEnvelope } from './local-store';
import { isTelemetryRecordArray } from '../telemetry/sink';

const GUARD = { minDecimals: 4, latRange_deg: [5, 21] as const, lngRange_deg: [97, 106] as const };

function baseDeps(storage: ReturnType<typeof createMemoryStorage>) {
  return {
    storage,
    storageKeyPrefix: 'kw.p2.',
    telemetryStorageKey: 'kw.p2.telemetry',
    telemetrySchemaVersion: 1,
    sink: {
      config: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000 },
      forbiddenPropertyNames: ['lat', 'lng'],
      coordinateGuard: GUARD,
      knownEventNames: new Set(['local_data_cleared']),
      sessionId: 'abcd1234',
      platform: 'android-chrome' as const,
      appVersion: 'deadbee',
      now: () => 5000,
    },
    now: () => 5000,
  };
}

describe('clearLocalData', () => {
  it('removes every kw.p2.* key and leaves other keys alone', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', 'x');
    storage.setItem('kw.p2.consent', 'y');
    storage.setItem('unrelated.key', 'z');
    clearLocalData(baseDeps(storage));
    expect(storage.getItem('kw.p2.session')).toBeNull();
    expect(storage.getItem('kw.p2.consent')).toBeNull();
    expect(storage.getItem('unrelated.key')).toBe('z');
  });

  it('re-seeds telemetry with exactly one local_data_cleared event, no properties', () => {
    const storage = createMemoryStorage();
    clearLocalData(baseDeps(storage));
    const result = readEnvelope(storage, 'kw.p2.telemetry', 1, isTelemetryRecordArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.state).toHaveLength(1);
      expect(result.envelope.state[0]).toMatchObject({
        event_name: 'local_data_cleared',
        properties: {},
      });
    }
  });

  it('calls reload after clearing, not before', () => {
    const storage = createMemoryStorage();
    const calls: string[] = [];
    storage.setItem('kw.p2.session', 'x');
    const reload = vi.fn(() => calls.push('reload'));
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      calls.push(`setItem:${key}`);
      originalSetItem(key, value);
    };
    clearLocalData({ ...baseDeps(storage), reload });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(calls.at(-1)).toBe('reload');
  });

  it('does nothing extra when reload is omitted', () => {
    const storage = createMemoryStorage();
    expect(() => clearLocalData(baseDeps(storage))).not.toThrow();
  });
});
