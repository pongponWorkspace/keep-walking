import { describe, expect, it } from 'vitest';
import { createSession, sessionStep } from '@keep-walking/shared/session';
import { buildSessionParams } from './config';
import { loadDungeonArtifact } from '../dungeons/artifact';

describe('buildSessionParams', () => {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);

  it('builds one SessionDungeonRecord per artifact dungeon', () => {
    expect(Object.keys(params.dungeons).length).toBe(artifact.dungeons.length);
  });

  it('is accepted by the real sessionStep (wired, not stubbed)', () => {
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const session = createSession(now_ms);
    const { state, events } = sessionStep(session, { type: 'tick' }, now_ms, params);
    expect(state.run).toBeNull();
    expect(events).toEqual([]);
  });

  it('feeds a sample without throwing (a point far outside every dungeon)', () => {
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    const session = createSession(now_ms);
    const { state } = sessionStep(
      session,
      { type: 'sample', sample: { t_ms: now_ms, lat: 0, lng: 0, accuracy_m: 5 } },
      now_ms,
      params,
    );
    expect(state.run).toBeNull();
  });
});
