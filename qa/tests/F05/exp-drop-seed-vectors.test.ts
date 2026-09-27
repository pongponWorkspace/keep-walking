/**
 * P2-F05-T11 — "Engine results match the golden vectors in design/systems/test-vectors/: drop,
 * exp, gate, seed" (gate is covered by movement-gate-trace-replay.test.ts /
 * movement-gate-gap-and-speedlock.test.ts and the `passesGate` vector referenced there). This
 * file closes exp, drop and seed through the real public interface (`sessionStep`), not the pure
 * formula call the systems-designer's vectors exercise directly
 * (`packages/shared/src/formulas/vectors.test.ts`, which this file does not duplicate — it is the
 * authority for the formula itself; this file proves the production reducer reaches the same
 * number when a real player actually earns a tick).
 */
import { describe, expect, it } from 'vitest';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams } from '../F04/lib/qa-session-params';
import { confirmAndReplay } from './lib/confirm-and-replay';
import { customLevelRangeDungeonRecord } from './lib/custom-dungeon';
import type { SessionEvent, SessionParams } from '@keep-walking/shared/session';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);
const QA = 'data/gps-traces/qa/';
const TEST_RECT = { south: 13.7293, north: 13.7317, west: 100.5662, east: 100.5683 };

type Granted = Extract<SessionEvent, { type: 'run_tick_granted' }>;
function granted(events: readonly SessionEvent[]): Granted[] {
  return events.filter((e): e is Granted => e.type === 'run_tick_granted');
}

describe('exp — design/systems/test-vectors/tick-reward.json soloTickExp vector, reached through a real run', () => {
  it('level 1 tanker soloing a level 1-5 dungeon earns exactly 18 exp on the first full tick', () => {
    // The exact vector: level 1, ownClass tanker, rangeMin 1, rangeMax 5, f 1 -> exp 18 (Z = 3,
    // Magic own buff / others x noMagicMult D-039). `qaSessionParams()`'s dungeon is level_range
    // 1-60 (F04 lib), so this needs its own dungeon record with the vector's own 1-5 range —
    // same rectangle, same config, only the level range differs (`customLevelRangeDungeonRecord`).
    const base = qaSessionParams();
    const dungeonId = 'qa-exp-vector-rect';
    const params: SessionParams = {
      config: base.config,
      dungeons: {
        ...base.dungeons,
        [dungeonId]: customLevelRangeDungeonRecord(dungeonId, TEST_RECT, { min: 1, max: 5 }),
      },
    };
    // Confirm 'tanker' matches config/balance/progression.json exp.startLevel === 1 (createPlayer)
    // — the vector's own "level 1" precondition, not asserted separately here to avoid coupling to
    // an internal shape; a wrong startLevel would simply make the exp number below not match.
    const trace = loadCommittedTrace(`${QA}qa-gate-bench-jitter-01.trace.json`);
    const replay = confirmAndReplay(trace, params, dungeonId, START_EPOCH_MS, 201, 'tanker');
    expect(replay.confirmedAtT).not.toBeNull();
    const ticks = granted(replay.events);
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    const first = ticks[0] as Granted;
    expect(first.partial).toBe(false);
    expect(first.levelBefore).toBe(1);
    expect(first.expGained).toBe(18);
  });
});

describe("drop — every granted tick's loot is config-driven (largeParkDefault, drops.json), never a hardcoded item", () => {
  it('across a full 30-minute run (5 granted ticks), every loot id/qty is a member of the configured drop table', () => {
    const params = qaSessionParams();
    const dungeonId = Object.keys(params.dungeons)[0] as string;
    const trace = loadCommittedTrace(`${QA}qa-gate-normalwalk-gap-01.trace.json`);
    const replay = confirmAndReplay(trace, params, dungeonId, START_EPOCH_MS, 202);
    const ticks = granted(replay.events);
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    // config/balance/drops.json#dropTables.largeParkDefault (this dungeon's drop_table_id, F04
    // lib qa-session-params.ts): every rarity roll's pool, plus the two bonus rolls
    // (potionHpSmall/potionRevive) every preset carries (F05 R-B1 safety net), flattened.
    const validItemIds = new Set([
      'elementDust',
      'elementCore',
      'riftStone',
      'equipWeapon',
      'equipArmor',
      'equipCharm',
      'equipBoots',
      'hpSmall',
      'revive',
    ]);
    for (const tick of ticks) {
      for (const drop of tick.loot) {
        expect(validItemIds.has(drop.id)).toBe(true);
        expect(Number.isInteger(drop.qty)).toBe(true);
        expect(drop.qty).toBeGreaterThanOrEqual(1);
      }
    }
    // The pure rollTickLoot/lootTable formulas themselves (exact qty/chance multipliers per
    // vector) are the golden-vector authority in
    // design/systems/test-vectors/{drops,tick-reward,partial-tick}.json, proven against the real
    // code in packages/shared/src/formulas/vectors.test.ts — not duplicated here.
  });
});

describe('seed — same runSeed reproduces the identical loot sequence through sessionStep (ADR 0003 6.3)', () => {
  it('two independent replays of the same trace with the same runSeed grant byte-identical loot, in order', () => {
    const params = qaSessionParams();
    const dungeonId = Object.keys(params.dungeons)[0] as string;
    const trace = loadCommittedTrace(`${QA}qa-gate-normalwalk-gap-01.trace.json`);
    const first = confirmAndReplay(trace, params, dungeonId, START_EPOCH_MS, 20260926);
    const second = confirmAndReplay(trace, params, dungeonId, START_EPOCH_MS, 20260926);
    const lootOf = (events: readonly SessionEvent[]) => granted(events).map((e) => e.loot);
    expect(lootOf(first.events)).toHaveLength(granted(first.events).length);
    expect(granted(first.events).length).toBeGreaterThanOrEqual(2);
    expect(lootOf(second.events)).toEqual(lootOf(first.events));
    expect(granted(second.events).map((e) => e.expGained)).toEqual(
      granted(first.events).map((e) => e.expGained),
    );

    // A different seed is not required to differ (a fair RNG can coincide), but the engine must
    // still run to completion and never throw for an ordinary seed value — same trace, same
    // dungeon, only runSeed changes.
    const thirdDifferentSeed = confirmAndReplay(trace, params, dungeonId, START_EPOCH_MS, 7);
    expect(granted(thirdDifferentSeed.events).length).toBeGreaterThanOrEqual(1);
  });
});
