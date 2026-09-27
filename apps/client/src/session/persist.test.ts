import { describe, expect, it } from 'vitest';
import { createSession } from '@keep-walking/shared/session';
import { createMemoryStorage } from '../storage/local-store';
import { loadSession, saveSession } from './persist';
import { buildSessionParams } from './config';
import { loadDungeonArtifact } from '../dungeons/artifact';

const KEY = 'kw.p2.session';
const NOOP_QUOTA_DEPS = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };
const params = buildSessionParams(loadDungeonArtifact().dungeons);

describe('session persistence', () => {
  it('round-trips a fresh session', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000, params);
    saveSession(storage, KEY, state, 1000, NOOP_QUOTA_DEPS);
    const loaded = loadSession(storage, KEY, params);
    expect(loaded?.ok).toBe(true);
    if (loaded?.ok === true) {
      expect(loaded.state.player.level).toBe(state.player.level);
      expect(loaded.state.run).toBeNull();
    }
  });

  it('returns undefined (missing) on a fresh install', () => {
    const storage = createMemoryStorage();
    expect(loadSession(storage, KEY, params)).toBeUndefined();
  });

  it('discards corrupt JSON rather than throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, '{not json');
    const loaded = loadSession(storage, KEY, params);
    expect(loaded).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('discards a different schemaVersion', () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, JSON.stringify({ schemaVersion: 999, savedAt_ms: 1, state: {} }));
    const loaded = loadSession(storage, KEY, params);
    expect(loaded).toEqual({ ok: false, reason: 'schema_mismatch' });
  });

  it('discards a run whose dungeonId is not in the current artifact (unknown_dungeon)', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000, params);
    const withUnknownRun = {
      ...state,
      run: {
        runId: 'r1',
        dungeonId: 'does-not-exist',
        runSeed: 1,
        startedAt_ms: 1000,
        status: 'active' as const,
        exitStartedAt_ms: null,
        exitCause: null,
        clock: { closedSum_ms: 0, runningSince_ms: 1000 },
        reward: { k: 0, distance_m: 0, lastSample: null },
        rewardScratch: null,
        scratchClosed: [],
        grantedCount: 0,
        bag: { items: {} },
        hp: {},
        presence: { confirmed: 'inside', pendingSince_t_ms: null, pendingCount: 0 },
        closesAt_ms: null,
        notices: { closingSoonSent: false },
      },
    };
    saveSession(storage, KEY, withUnknownRun as unknown as typeof state, 1000, NOOP_QUOTA_DEPS);
    const loaded = loadSession(storage, KEY, params);
    expect(loaded).toEqual({ ok: false, reason: 'unknown_dungeon' });
  });

  it('never persists pre (F04 section 10.1)', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000, params);
    const withApproach = {
      ...state,
      pre: { chainStartAt_ms: 1000, lastAt_ms: 1000, outsideSeenAt_ms: { x: 1000 } },
    };
    saveSession(storage, KEY, withApproach, 1000, NOOP_QUOTA_DEPS);
    const loaded = loadSession(storage, KEY, params);
    expect(loaded?.ok && loaded.state.pre.chainStartAt_ms).toBeNull();
  });

  // P2-H02 (`packages/shared/src/session/persistence.ts`): `toPersisted` now strips every
  // coordinate-bearing field before the envelope is serialized — `latestSample` (this test), plus
  // `lock.lastAccurate` and the gate `filter`/`grid` inside `run.reward`/`run.rewardScratch`
  // (`stripCoordinates`/`stripGateAccumulator`). This test previously recorded the opposite (a
  // KNOWN GAP handoff to backend-programmer); it now asserts the fixed, intended behavior.
  it('never persists latestSample or any raw lat/lng value', () => {
    const storage = createMemoryStorage();
    const state = createSession(1000, params);
    const withSample = {
      ...state,
      latestSample: { t_ms: 1000, lat: 13.7, lng: 100.5, accuracy_m: 5 },
    };
    saveSession(storage, KEY, withSample, 1000, NOOP_QUOTA_DEPS);
    const raw = storage.getItem(KEY) ?? '';
    expect(raw).not.toContain('13.7');
    expect(raw).not.toContain('100.5');
    const loaded = loadSession(storage, KEY, params);
    expect(loaded?.ok && loaded.state.latestSample).toBeNull();
  });
});
