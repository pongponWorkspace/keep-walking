/**
 * P2-F04-T22 — F04-C08 (acceptance 8, E11/E12, "dungeon ปิดระหว่าง run") and F04-C09
 * (acceptance 9, E17, "เลเวลไม่กัน check-in / เฉพาะ dungeon เปิดอยู่ถูกแนะนำ") through the real
 * public interface (`sessionStep`, `selectOpening`) — upgrades the opening-hours *decision* proof
 * (already Vector/engine-batch green, `qa/plans/F04-test-plan.md` section 9) to a real run that
 * closes mid-flight, and separately proves the real committed dungeon artifact filters correctly.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectCheckInPreview } from '@keep-walking/shared/session';
import type { SessionEvent, SessionState } from '@keep-walking/shared/session';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import {
  qaSessionParams,
  qaSessionParamsWithClosableRect,
  QA_RECT_DUNGEON_ID,
} from './lib/qa-session-params';
import { step, chooseAnyClass, driveTrace } from './lib/drive-session';
import { loadDungeonArtifact, dungeonStatus } from '../../../apps/client/src/dungeons/artifact';
import { buildSessionParams } from '../../../apps/client/src/session/config';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0); // 2026-01-05 13:00 Bangkok
const MS_PER_S = 1000;
const MS_PER_MIN = 60 * MS_PER_S;
const MS_PER_DAY = 24 * 60 * MS_PER_MIN;
/** Same public calendar constants `packages/shared/src/run/opening-hours.ts` documents in its own
 * header comment (1970-01-01 was a Thursday) — QA replicates only the *time-of-day/weekday*
 * arithmetic needed to build a test fixture, never the open/closed *decision* itself (that stays
 * the real `selectOpening`/`sessionStep`). */
const EPOCH_WEEKDAY_SHIFT = 3;

function isoWeekdayAndMinuteOfDay(
  t_ms: number,
  utcOffsetMin: number,
): { readonly weekday: number; readonly minuteOfDay: number } {
  const local_ms = t_ms + utcOffsetMin * MS_PER_MIN;
  const day = Math.floor(local_ms / MS_PER_DAY);
  const minuteOfDay = Math.floor(
    (((local_ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY) / MS_PER_MIN,
  );
  const weekday = ((((day + EPOCH_WEEKDAY_SHIFT) % 7) + 7) % 7) + 1;
  return { weekday, minuteOfDay };
}

/** Walks the whole `synthetic-walk-in-01` trace and confirms on `dungeonId` at the first instant
 * check-in is ready — reused against two different `SessionParams` (always-open vs. closable) to
 * prove the closing behaviour without changing anything about how the player actually walked in. */
function enterAsSoonAsReady(
  dungeonId: string,
  params: ReturnType<typeof qaSessionParams>,
): { readonly state: SessionState; readonly enteredAt_ms: number } {
  const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
  let state = chooseAnyClass(
    driveTrace({ ...trace, samples: [] }, params, START_EPOCH_MS).state,
    START_EPOCH_MS,
    params,
  ).state;
  for (const s of trace.samples) {
    const now_ms = START_EPOCH_MS + s.t;
    const sampled = step(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy } },
      now_ms,
      params,
    );
    state = sampled.state;
    const preview = selectCheckInPreview(state, dungeonId, now_ms, params);
    if (preview.ok) {
      const confirmed = step(state, { type: 'confirm', dungeonId, runSeed: 5 }, now_ms, params);
      return { state: confirmed.state, enteredAt_ms: now_ms };
    }
  }
  throw new Error('trace never reached a ready check-in — fixture bug, not an engine bug');
}

describe('F04-C08 (acceptance 8, E11/E12) — dungeon closes mid-run through sessionStep', () => {
  it('closing-soon fires at the config notice, and the run ends dungeon_closed exactly at the close second', () => {
    const base = qaSessionParams();
    // Pass 1 (always open): find the real instant this trace's approach becomes ready, and this
    // config's local weekday/minute-of-day at that instant.
    const first = enterAsSoonAsReady(QA_RECT_DUNGEON_ID, base);
    const utcOffsetMin = base.config.openingHours.utcOffset_min;
    const { weekday, minuteOfDay } = isoWeekdayAndMinuteOfDay(first.enteredAt_ms, utcOffsetMin);
    const closeOffset_min = 30;
    const closesAtMinuteOfDay = minuteOfDay + closeOffset_min;
    const openingHours = {
      weekly: { [String(weekday)]: [[Math.max(0, minuteOfDay - 5), closesAtMinuteOfDay]] as const },
    };

    // Pass 2 (closable): re-walk the identical trace, confirm on the closable dungeon instead.
    const { params, dungeonId } = qaSessionParamsWithClosableRect(openingHours);
    const second = enterAsSoonAsReady(dungeonId, params);
    expect(second.enteredAt_ms).toBe(first.enteredAt_ms); // same trace, same approach timing

    // `closesAtMinuteOfDay` is a whole-minute boundary; `enteredAt_ms` itself usually falls partway
    // through its own minute. `utcOffsetMin` is a whole number of minutes (420), so shifting epoch
    // ms by it never changes an epoch-ms-mod-one-minute remainder — the leftover seconds within
    // `enteredAt_ms`'s own minute can be read directly off the UTC epoch value.
    const leftoverWithinMinute_ms = first.enteredAt_ms % MS_PER_MIN;
    const closesAt_ms = first.enteredAt_ms - leftoverWithinMinute_ms + closeOffset_min * MS_PER_MIN;
    const closingSoonNotice_ms = params.config.openingHours.closingSoonNotice_s * MS_PER_S;
    const closingSoonAt_ms = closesAt_ms - closingSoonNotice_ms;

    // A `tick` alone is not presence evidence (only a `sample` is) — to actually stay Active all
    // the way to the close boundary (not immediately fall into Grace/Suspended from missing
    // evidence, F04-C06's own `no_evidence` path), keep feeding real samples at the same spot the
    // trace ended at, well under `maxSamplePairGap_s` apart, the whole way there.
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const lastSample = trace.samples.at(-1);
    expect(lastSample).toBeDefined();
    const sampleInterval_ms = 20_000; // < maxSamplePairGap_s (30 s)

    let state = second.state;
    const events: SessionEvent[] = [];
    for (
      let t = first.enteredAt_ms + sampleInterval_ms;
      t <= closesAt_ms + 3_000;
      t += sampleInterval_ms
    ) {
      const r = step(
        state,
        {
          type: 'sample',
          sample: { t_ms: t, lat: lastSample?.lat ?? 0, lng: lastSample?.lng ?? 0, accuracy_m: 5 },
        },
        t,
        params,
      );
      state = r.state;
      events.push(...r.events);
      if (state.run === null) break; // ended: no more samples needed
    }

    const closingSoon = events.find((e) => e.type === 'dungeon_closing_soon');
    expect(closingSoon).toBeDefined();
    if (closingSoon?.type === 'dungeon_closing_soon') {
      expect(closingSoon.at_ms).toBe(closingSoonAt_ms);
    }
    const exited = events.find((e) => e.type === 'dungeon_exited');
    expect(exited).toBeDefined();
    if (exited?.type === 'dungeon_exited') {
      expect(exited.exitReason).toBe('dungeon_closed');
      expect(exited.at_ms).toBe(closesAt_ms);
    }
    expect(state.run).toBeNull();
  });
});

describe('F04-C09 (acceptance 9, E17) — closed dungeons excluded, level never gates check-in', () => {
  it('a real committed dungeon that is closed all day (khlong-ong-ang, Monday) reports status closed; one open every day reports open, same instant', () => {
    const artifact = loadDungeonArtifact();
    const params = buildSessionParams(artifact.dungeons);
    const monday10am = Date.UTC(2026, 8, 28, 3, 0, 0); // 2026-09-28 10:00 Bangkok, a Monday
    const closed = artifact.dungeons.find((d) => d.id === 'khlong-ong-ang');
    const open = artifact.dungeons.find((d) => d.id === 'leelawadee-lawn');
    expect(closed).toBeDefined();
    expect(open).toBeDefined();
    if (closed === undefined || open === undefined) return;
    expect(dungeonStatus(closed, params, monday10am)).toBe('closed');
    expect(dungeonStatus(open, params, monday10am)).toBe('open');
  });

  it('the check-in decision (packages/shared/src/run/check-in.ts) never reads a level field — level cannot reject check-in', () => {
    const source = readFileSync(
      new URL('../../../packages/shared/src/run/check-in.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/level_range|levelMin|levelMax/);
  });
});
