import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../storage/local-store';
import { createSessionEngine } from './engine';
import { buildSessionParams } from './config';
import { loadDungeonArtifact } from '../dungeons/artifact';

const NOOP_QUOTA_DEPS = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

interface RecordedEvent {
  readonly name: string;
  readonly properties: Record<string, unknown> | undefined;
}

function fakeRecorder(): {
  records: RecordedEvent[];
  record: (n: string, p?: Record<string, unknown>) => void;
} {
  const records: RecordedEvent[] = [];
  return { records, record: (name, properties) => records.push({ name, properties }) };
}

describe('createSessionEngine', () => {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);
  const dungeon = artifact.dungeons[0];
  if (dungeon === undefined) throw new Error('fixture: artifact has no dungeons');
  const [lng, lat] = dungeon.geometry.coordinates[0]?.[0] as unknown as readonly [number, number];

  it('boots fresh with no stored session and no crash', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(engine.getState().run).toBeNull();
  });

  it('previewCheckIn never mutates dispatch-visible state', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    const before = JSON.stringify(engine.getState());
    engine.previewCheckIn(dungeon.id, now_ms);
    expect(JSON.stringify(engine.getState())).toBe(before);
  });

  it('records checkin_rejected via dispatch(confirm) before approach is satisfied', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    engine.dispatch({ type: 'confirm', dungeonId: dungeon.id, runSeed: 1 }, now_ms);
    expect(recorder.records.some((r) => r.name === 'checkin_rejected')).toBe(true);
  });

  it('persists after dispatch (survives a fresh engine over the same storage)', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    engine.dispatch({ type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } }, now_ms);
    const reopened = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(reopened.getState().player.level).toBe(engine.getState().player.level);
  });

  it('testForceClassId (e2e-only hook) sets classId once at boot for a fresh player', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      {
        storage,
        quotaDeps: NOOP_QUOTA_DEPS,
        record: recorder.record,
        testForceClassId: 'tanker',
      },
      now_ms,
    );
    expect(engine.getState().player.classId).toBe('tanker');
  });

  it('testForceClassId never overwrites a class the loaded player already chose', () => {
    const storage = createMemoryStorage();
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const first = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record, testForceClassId: 'magic' },
      now_ms,
    );
    expect(first.getState().player.classId).toBe('magic');
    const reopened = createSessionEngine(
      params,
      {
        storage,
        quotaDeps: NOOP_QUOTA_DEPS,
        record: recorder.record,
        testForceClassId: 'tanker',
      },
      now_ms,
    );
    expect(reopened.getState().player.classId).toBe('magic');
  });

  it('discards a corrupt stored session instead of throwing, and records session_state_discarded', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', '{not json');
    const recorder = fakeRecorder();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const engine = createSessionEngine(
      params,
      { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
      now_ms,
    );
    expect(engine.getState().run).toBeNull();
    expect(recorder.records.some((r) => r.name === 'session_state_discarded')).toBe(true);
  });

  // P2-X38 (docs/tech/F06-hp-damage-onboarding.md 8.4 step 4): withdraw-consent's own state purge.
  describe('purgeLocation', () => {
    it('clears the latest sample, emits no SessionEvent, and persists immediately', () => {
      const storage = createMemoryStorage();
      const recorder = fakeRecorder();
      const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
      const engine = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      engine.dispatch(
        { type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } },
        now_ms,
      );
      expect(engine.getState().latestSample).not.toBeNull();
      recorder.records.length = 0;

      engine.purgeLocation();

      expect(engine.getState().latestSample).toBeNull();
      expect(recorder.records).toEqual([]);
      // Re-opening from storage proves it actually persisted, not just the in-memory state.
      const reopened = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      expect(reopened.getState().latestSample).toBeNull();
    });

    it('never touches player/lastSummary (tech note 8.4 step 4)', () => {
      const storage = createMemoryStorage();
      const recorder = fakeRecorder();
      const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
      const engine = createSessionEngine(
        params,
        { storage, quotaDeps: NOOP_QUOTA_DEPS, record: recorder.record },
        now_ms,
      );
      const playerBefore = JSON.stringify(engine.getState().player);
      engine.purgeLocation();
      expect(JSON.stringify(engine.getState().player)).toBe(playerBefore);
    });
  });
});
