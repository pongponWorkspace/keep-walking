/**
 * P2-F04-T22 — upgrades the `runTimeline` (engine-batch) proof in
 * `qa/tests/traces/engine-run-state.test.ts` (P2-F04-T19) to the real public interface
 * (`sessionStep`) now that `src/session` is DONE. Covers spec F04 acceptance 1 / E9 (polygon
 * overlap) at the level the client actually runs at, not just the batch helper.
 */
import { describe, expect, it } from 'vitest';
import { selectCheckInPreview } from '@keep-walking/shared/session';
import type { SessionEvent } from '@keep-walking/shared/session';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import {
  qaSessionParams,
  QA_RECT_DUNGEON_ID,
  QA_OVERLAP_DUNGEON_ID,
} from './lib/qa-session-params';
import { step, chooseAnyClass, driveTrace } from './lib/drive-session';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);

describe('F04-C01 (acceptance 1, E9) — overlapping polygons through sessionStep', () => {
  it('qa-polygon-overlap-01: a run confirmed on the QA rect ignores presence in the overlap rect', () => {
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-polygon-overlap-01.trace.json');
    const params = qaSessionParams();

    // Empty-trace drive just to get a fresh SessionState the same way every other file in this
    // folder does, then choose a class once (F06-tech 6.3 item 1) before any `confirm`.
    const fresh = driveTrace({ ...trace, samples: [] }, params, START_EPOCH_MS);
    let state = chooseAnyClass(fresh.state, START_EPOCH_MS, params).state;

    const events: SessionEvent[] = [];
    let confirmed = false;
    // Replay the whole trace sample-by-sample through `sessionStep`, dispatching `confirm` the
    // instant `selectCheckInPreview` turns `ok:true` (the scenario walks in from outside both
    // rectangles, through TEST_RECT first) — this is exactly the loop `apps/client/src/f04-app.ts`
    // runs per sample, just without the DOM.
    for (const s of trace.samples) {
      const now_ms = START_EPOCH_MS + s.t;
      const sampled = step(
        state,
        {
          type: 'sample',
          sample: { t_ms: now_ms, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy },
        },
        now_ms,
        params,
      );
      state = sampled.state;
      events.push(...sampled.events);
      if (!confirmed) {
        const preview = selectCheckInPreview(state, QA_RECT_DUNGEON_ID, now_ms, params);
        if (preview.ok) {
          const confirmedStep = step(
            state,
            { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 42 },
            now_ms,
            params,
          );
          state = confirmedStep.state;
          events.push(...confirmedStep.events);
          confirmed = true;
        }
      }
    }

    expect(confirmed).toBe(true);
    // R03/E9: overlap must never produce a *second* `dungeon_entered`, and the confirmed run must
    // survive the walk through "overlap-only" and "QA-rect-only" ground — at most Grace/returned
    // transitions, never a `dungeon_exited` within this ~11-minute trace.
    expect(events.filter((e) => e.type === 'dungeon_entered')).toHaveLength(1);
    expect(events.some((e) => e.type === 'dungeon_exited')).toBe(false);
    expect(events.some((e) => e.type === 'run_state_changed')).toBe(true);
    // The overlap dungeon never appears in any event: the whole trace only ever interacts with
    // the one dungeon the player actually confirmed on (a `run_state_changed` event carries no
    // `dungeonId` of its own — tech note F04 2.5 — so this check only needs the ones that do).
    const withDungeonId = events.filter(
      (e): e is Extract<SessionEvent, { dungeonId: string }> =>
        'dungeonId' in e && typeof e.dungeonId === 'string',
    );
    expect(withDungeonId.every((e) => e.dungeonId === QA_RECT_DUNGEON_ID)).toBe(true);
    expect(withDungeonId.some((e) => e.dungeonId === QA_OVERLAP_DUNGEON_ID)).toBe(false);
  });
});
