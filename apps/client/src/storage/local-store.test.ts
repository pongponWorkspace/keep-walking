import { describe, expect, it, vi } from 'vitest';
import {
  clearKeysWithPrefix,
  createMemoryStorage,
  keysWithPrefix,
  readEnvelope,
  serializeEnvelope,
  writeWithQuotaFallback,
} from './local-store';

interface Fixture {
  readonly n: number;
}
function isFixture(value: unknown): value is Fixture {
  return typeof value === 'object' && value !== null && typeof (value as Fixture).n === 'number';
}

describe('createMemoryStorage', () => {
  it('behaves like the DOM Storage subset it mirrors', () => {
    const storage = createMemoryStorage();
    expect(storage.length).toBe(0);
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    expect(storage.length).toBe(2);
    expect(storage.getItem('a')).toBe('1');
    expect(storage.getItem('missing')).toBeNull();
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
    expect(storage.length).toBe(1);
  });
});

describe('serializeEnvelope / readEnvelope round-trip', () => {
  it('reads back exactly what was written', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', serializeEnvelope(1, { n: 42 }, 1000));
    const result = readEnvelope(storage, 'kw.p2.session', 1, isFixture);
    expect(result).toEqual({
      ok: true,
      envelope: { schemaVersion: 1, savedAt_ms: 1000, state: { n: 42 } },
    });
  });

  it('reports "missing" when the key does not exist', () => {
    const storage = createMemoryStorage();
    expect(readEnvelope(storage, 'kw.p2.session', 1, isFixture)).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it('reports "corrupt" on invalid JSON, never throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', '{not json');
    expect(readEnvelope(storage, 'kw.p2.session', 1, isFixture)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('reports "corrupt" when state fails the type guard', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', serializeEnvelope(1, { wrong: true }, 1000));
    expect(readEnvelope(storage, 'kw.p2.session', 1, isFixture)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });

  it('reports "schema_mismatch" when the version differs, without touching state', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', serializeEnvelope(2, { n: 1 }, 1000));
    expect(readEnvelope(storage, 'kw.p2.session', 1, isFixture)).toEqual({
      ok: false,
      reason: 'schema_mismatch',
    });
  });

  it('reports "corrupt" when the envelope is a JSON array, not an object', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', JSON.stringify([1, 2, 3]));
    expect(readEnvelope(storage, 'kw.p2.session', 1, isFixture)).toEqual({
      ok: false,
      reason: 'corrupt',
    });
  });
});

describe('writeWithQuotaFallback', () => {
  it('succeeds on the first try when there is no quota problem', () => {
    const storage = createMemoryStorage();
    const trimTelemetryHalf = vi.fn();
    const clearTelemetryAll = vi.fn();
    const result = writeWithQuotaFallback(storage, 'kw.p2.session', 'value', {
      trimTelemetryHalf,
      clearTelemetryAll,
    });
    expect(result).toEqual({ ok: true });
    expect(storage.getItem('kw.p2.session')).toBe('value');
    expect(trimTelemetryHalf).not.toHaveBeenCalled();
    expect(clearTelemetryAll).not.toHaveBeenCalled();
  });

  it('trims telemetry once and retries before giving up (F04 10.4 chain)', () => {
    let failures = 1;
    const storage = createMemoryStorage();
    const realSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (failures > 0) {
        failures -= 1;
        throw new DOMException('quota', 'QuotaExceededError');
      }
      realSetItem(key, value);
    };
    const trimTelemetryHalf = vi.fn();
    const clearTelemetryAll = vi.fn();
    const result = writeWithQuotaFallback(storage, 'kw.p2.session', 'value', {
      trimTelemetryHalf,
      clearTelemetryAll,
    });
    expect(result).toEqual({ ok: true });
    expect(trimTelemetryHalf).toHaveBeenCalledTimes(1);
    expect(clearTelemetryAll).not.toHaveBeenCalled();
  });

  it('clears telemetry entirely as the last resort before reporting storageDegraded', () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    const trimTelemetryHalf = vi.fn();
    const clearTelemetryAll = vi.fn();
    const result = writeWithQuotaFallback(storage, 'kw.p2.session', 'value', {
      trimTelemetryHalf,
      clearTelemetryAll,
    });
    expect(result).toEqual({ ok: false, reason: 'storageDegraded' });
    expect(trimTelemetryHalf).toHaveBeenCalledTimes(1);
    expect(clearTelemetryAll).toHaveBeenCalledTimes(1);
  });
});

describe('keysWithPrefix / clearKeysWithPrefix', () => {
  it('finds and removes only keys with the prefix, leaving others untouched', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', '1');
    storage.setItem('kw.p2.telemetry', '2');
    storage.setItem('someOtherApp.setting', '3');
    expect(keysWithPrefix(storage, 'kw.p2.').sort()).toEqual(['kw.p2.session', 'kw.p2.telemetry']);
    clearKeysWithPrefix(storage, 'kw.p2.');
    expect(storage.getItem('kw.p2.session')).toBeNull();
    expect(storage.getItem('kw.p2.telemetry')).toBeNull();
    expect(storage.getItem('someOtherApp.setting')).toBe('3');
  });
});
