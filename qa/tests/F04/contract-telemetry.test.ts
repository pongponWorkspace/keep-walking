/**
 * TL N-03 (task context): every event name the client emits appears in
 * `product/telemetry-events.md`, and — for the F04-owned subset (the row-for-row list
 * `docs/tech/F04-dungeon-presence.md` section 12.3 gives) — every declared name is actually
 * reachable from the real mapper (`apps/client/src/telemetry/f04-events.ts`), so a name is never
 * documented-but-dead or emitted-but-undocumented.
 *
 * Both the doc parser and the "what does the mapper emit" side are built independently of the
 * developer's own `apps/client/src/telemetry/known-events.test.ts` (never modified, never
 * imported) — this is QA's own black-box re-derivation of the same contract, using the real
 * shipped mapper module and a real trace-driven `sessionStep` run, not a hand-typed fixture list.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  mapSessionEvent,
  dungeonConfirmShownEvent,
  navigationLinkOpenedEvent,
  speedLockTriggeredEvent,
  sessionStateDiscardedEvent,
  storageQuotaExceededEvent,
} from '../../../apps/client/src/telemetry/f04-events';
import { KNOWN_EVENT_NAMES } from '../../../apps/client/src/telemetry/known-events';
import type { SessionEvent } from '@keep-walking/shared/session';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from './lib/qa-session-params';
import { step, chooseAnyClass, driveTrace } from './lib/drive-session';

const REPO_ROOT = new URL('../../../', import.meta.url).pathname;
const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);

/** `### \`event_name\`` headings in section 3 of the doc (repo root, read-only). */
function docEventNames(): ReadonlySet<string> {
  const text = readFileSync(`${REPO_ROOT}product/telemetry-events.md`, 'utf8');
  const names = new Set<string>();
  for (const m of text.matchAll(/^### `([a-z_]+)`/gm)) {
    const name = m[1];
    if (name !== undefined) names.add(name);
  }
  return names;
}

/** The F04-owned rows of `docs/tech/F04-dungeon-presence.md` section 12.3's table (transcribed
 * once, by hand, from the doc — not re-parsed, since that table's left column is a mixed
 * "engine event / เหตุใน client" description, not a machine-parseable event-name list). Excludes
 * `run_gps_status_changed` (F02), `local_data_cleared` (F06 settings screen) and
 * `run_hp_low`/`run_auto_retreat`/`run_death`/`run_potion_auto_used`/`auto_retreat_setting_changed`
 * (F06 HP engine's own mapper, `f04-events.ts`'s own comment: "their telemetry mapping belongs to
 * the client task that actually builds the HP UI"). */
const F04_OWNED_DOC_EVENT_NAMES: readonly string[] = [
  'dungeon_confirm_shown',
  'checkin_rejected',
  'dungeon_entered',
  'dungeon_exited',
  'run_state_changed',
  'dungeon_closing_soon_notified',
  'navigation_link_opened',
  'run_tick_granted',
  'run_tick_denied',
  'anticheat_speed_lock_triggered',
  'session_state_discarded',
  'storage_quota_exceeded',
];

/** One representative `SessionEvent` per variant `mapSessionEvent` actually maps (the ones that
 * return `undefined` — F06/HP — are intentionally excluded, matching the file's own switch). */
function representativeMappedEvents(): readonly SessionEvent[] {
  const at_ms = START_EPOCH_MS;
  return [
    { type: 'checkin_rejected', dungeonId: 'x', reason: 'not_enough_trace', readyIn_s: 10, at_ms },
    { type: 'dungeon_entered', dungeonId: 'x', runId: 'r1', at_ms },
    { type: 'run_state_changed', from: 'active', to: 'grace', cause: 'left_polygon', at_ms },
    {
      type: 'run_tick_granted',
      dungeonId: 'x',
      tickIndex: 0,
      loot: [],
      expGained: 1,
      partial: false,
      levelBefore: 1,
      levelAfter: 1,
      firstEver: false,
      at_ms,
    },
    { type: 'run_tick_denied', dungeonId: 'x', tickIndex: 0, partial: false, at_ms },
    {
      type: 'dungeon_exited',
      dungeonId: 'x',
      runId: 'r1',
      exitReason: 'manual_exit',
      at_ms,
      summary: {
        dungeonId: 'x',
        exitReason: 'manual_exit',
        startedAt_ms: at_ms - 1000,
        endedAt_ms: at_ms,
        ticksEvaluated: 0,
        ticksGranted: 0,
        partialTick: null,
        loot: [],
        expGained: 0,
        levelsGained: 0,
        hpAtEnd: 10,
        maxHp: 10,
        hitsLanded: 0,
        potionsUsed: { runBag: 0, inventory: 0 },
        lowHpWarnings: 0,
        lost: [],
        classId: 'tanker',
      },
    },
    { type: 'dungeon_closing_soon', dungeonId: 'x', closesIn_s: 600, at_ms },
  ];
}

function emittedF04EventNames(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const event of representativeMappedEvents()) {
    const mapped = mapSessionEvent(event, 'tanker', 'x');
    if (mapped !== undefined) names.add(mapped.name);
  }
  names.add(dungeonConfirmShownEvent('x', false).name);
  names.add(navigationLinkOpenedEvent('x', 'google_maps', false).name);
  names.add(speedLockTriggeredEvent('enter', true, 'x').name);
  names.add(sessionStateDiscardedEvent('corrupt').name);
  names.add(storageQuotaExceededEvent('none').name);
  return names;
}

describe('TL N-03 — telemetry contract (client mapper <-> product/telemetry-events.md)', () => {
  it('every name the F04 mapper can emit is a real doc heading', () => {
    const doc = docEventNames();
    const emitted = emittedF04EventNames();
    const missingFromDoc = [...emitted].filter((n) => !doc.has(n));
    expect(missingFromDoc).toEqual([]);
  });

  it('every name the F04 mapper can emit is in the client sink allowlist (known-events.ts)', () => {
    const emitted = emittedF04EventNames();
    const missingFromKnown = [...emitted].filter((n) => !KNOWN_EVENT_NAMES.has(n));
    expect(missingFromKnown).toEqual([]);
  });

  it('every F04-owned doc event name is actually reachable from the mapper (vice versa)', () => {
    const emitted = emittedF04EventNames();
    const neverEmitted = F04_OWNED_DOC_EVENT_NAMES.filter((n) => !emitted.has(n));
    expect(neverEmitted).toEqual([]);
  });

  it('a real trace-driven run only ever emits names from the same F04-owned set (production shapes, not hand-built fixtures)', () => {
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const params = qaSessionParams();
    const driven = driveTrace(trace, params, START_EPOCH_MS);
    const enteredAt_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
    const withClass = chooseAnyClass(driven.state, enteredAt_ms, params);
    const confirmed = step(
      withClass.state,
      { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 1 },
      enteredAt_ms,
      params,
    );
    const exited = step(confirmed.state, { type: 'exit' }, enteredAt_ms + 1000, params);
    const allEvents = [...driven.events, ...confirmed.events, ...exited.events];
    const mappedNames = allEvents
      .map((e) => mapSessionEvent(e, confirmed.state.player.classId, QA_RECT_DUNGEON_ID)?.name)
      .filter((n): n is string => n !== undefined);
    const doc = docEventNames();
    for (const name of mappedNames) {
      expect(doc.has(name)).toBe(true);
      expect(KNOWN_EVENT_NAMES.has(name)).toBe(true);
    }
    expect(mappedNames).toContain('dungeon_entered');
    expect(mappedNames).toContain('dungeon_exited');
  });
});
