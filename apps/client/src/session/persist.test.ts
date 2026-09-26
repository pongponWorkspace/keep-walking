import { describe, expect, it } from 'vitest';
import { createSession } from '@keep-walking/shared/session';
import { createMemoryStorage } from '../storage/local-store';
import { loadSession, saveSession } from './persist';

const KEY = 'kw.p2.session';
const NOOP_QUOTA_DEPS = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('session persistence', () => {
  it('round-trips a fresh session', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000);
    saveSession(storage, KEY, state, 1000, NOOP_QUOTA_DEPS);
    const loaded = loadSession(storage, KEY);
    expect(loaded?.ok).toBe(true);
    if (loaded?.ok === true) {
      expect(loaded.state.player.level).toBe(state.player.level);
      expect(loaded.state.run).toBeNull();
    }
  });

  it('returns undefined (missing) on a fresh install', () => {
    const storage = createMemoryStorage();
    expect(loadSession(storage, KEY)).toBeUndefined();
  });

  it('discards corrupt JSON rather than throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, '{not json');
    const loaded = loadSession(storage, KEY);
    expect(loaded).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('discards a different schemaVersion', () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, JSON.stringify({ schemaVersion: 999, savedAt_ms: 1, state: {} }));
    const loaded = loadSession(storage, KEY);
    expect(loaded).toEqual({ ok: false, reason: 'schema_mismatch' });
  });

  it('never persists pre/latestSample (F04 section 10.1)', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000);
    const withApproach = {
      ...state,
      pre: { chainStartAt_ms: 1000, lastAt_ms: 1000, outsideSeenAt_ms: { x: 1000 } },
      latestSample: { t_ms: 1000, lat: 13.7, lng: 100.5, accuracy_m: 5 },
    };
    saveSession(storage, KEY, withApproach, 1000, NOOP_QUOTA_DEPS);
    const raw = storage.getItem(KEY) ?? '';
    expect(raw).not.toContain('13.7');
    expect(raw).not.toContain('100.5');
    const loaded = loadSession(storage, KEY);
    expect(loaded?.ok && loaded.state.latestSample).toBeNull();
  });
});
