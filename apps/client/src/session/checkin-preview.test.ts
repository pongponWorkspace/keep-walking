import { describe, expect, it } from 'vitest';
import { createSession, sessionStep } from '@keep-walking/shared/session';
import type { SessionState } from '@keep-walking/shared/session';
import { previewCheckIn } from './checkin-preview';
import { buildSessionParams } from './config';
import { loadDungeonArtifact } from '../dungeons/artifact';

describe('previewCheckIn', () => {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);
  const dungeon = artifact.dungeons[0];
  if (dungeon === undefined) {
    throw new Error('fixture: artifact has no dungeons');
  }
  const [lng, lat] = dungeon.geometry.coordinates[0]?.[0] as unknown as readonly [number, number];
  const now_ms = Date.parse('2026-10-05T09:00:00+07:00');

  it('is not ready with a reason before any approach (no_approach_from_outside)', () => {
    let state: SessionState = createSession(now_ms);
    const stepped = sessionStep(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } },
      now_ms,
      params,
    );
    state = stepped.state;
    const preview = previewCheckIn(state, dungeon.id, 1, now_ms, params);
    expect(preview.ready).toBe(false);
  });

  it('does not mutate the caller state (a preview call is side-effect free on the real session)', () => {
    let state: SessionState = createSession(now_ms);
    const stepped = sessionStep(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat, lng, accuracy_m: 5 } },
      now_ms,
      params,
    );
    state = stepped.state;
    const before = JSON.stringify(state);
    previewCheckIn(state, dungeon.id, 1, now_ms, params);
    expect(JSON.stringify(state)).toBe(before);
  });
});
