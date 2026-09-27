// Shared "walk in, confirm the instant selectCheckInPreview turns ok:true, keep feeding the rest
// of the trace" loop every F05 gate/reward case in this folder needs — the same loop
// `qa/tests/F04/session-run-state.test.ts` (F04-C01) and `session-persist-privacy.test.ts` run by
// hand each time, pulled out once here so the F05 files only state what differs (which trace,
// which dungeon, which class). Drives only the public interface (`sessionStep`,
// `selectCheckInPreview`), never `run`/`reward` internals.
import { selectCheckInPreview } from '@keep-walking/shared/session';
import type {
  PlayerClass,
  SessionEvent,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';
import type { GpsTrace } from '@keep-walking/shared';
import { chooseAnyClass, driveTrace, step } from '../../F04/lib/drive-session';

export interface ReplayResult {
  readonly state: SessionState;
  readonly events: readonly SessionEvent[];
  /** `t` (trace-relative ms) of the sample whose processing triggered `confirm`, or `null` if the
   * preview never turned `ok:true` anywhere in the trace (a caller bug, not a valid scenario). */
  readonly confirmedAtT: number | null;
}

/** Feeds `trace` sample-by-sample through `sessionStep` starting from a fresh session (class
 * chosen first, F06-tech 6.3 item 1), dispatching `confirm` on `dungeonId` the instant the preview
 * turns `ok:true`, then keeps feeding every remaining sample into the now-Active run. */
export function confirmAndReplay(
  trace: GpsTrace,
  params: SessionParams,
  dungeonId: string,
  startEpochMs: number,
  runSeed: number,
  classId: PlayerClass = 'tanker',
): ReplayResult {
  const fresh = driveTrace({ ...trace, samples: [] }, params, startEpochMs);
  let state =
    classId === 'tanker'
      ? chooseAnyClass(fresh.state, startEpochMs, params).state
      : step(fresh.state, { type: 'chooseClass', classId }, startEpochMs, params).state;
  const events: SessionEvent[] = [];
  let confirmed = false;
  let confirmedAtT: number | null = null;
  for (const s of trace.samples) {
    const now_ms = startEpochMs + s.t;
    const sampled = step(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy } },
      now_ms,
      params,
    );
    state = sampled.state;
    events.push(...sampled.events);
    if (!confirmed) {
      const preview = selectCheckInPreview(state, dungeonId, now_ms, params);
      if (preview.ok) {
        const confirmedStep = step(state, { type: 'confirm', dungeonId, runSeed }, now_ms, params);
        state = confirmedStep.state;
        events.push(...confirmedStep.events);
        confirmed = true;
        confirmedAtT = s.t;
      }
    }
  }
  return { state, events, confirmedAtT };
}
