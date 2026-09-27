/**
 * P2-F06-T17 acceptance: "auto-retreat at 25% keeps all items · auto off then death = items lost ·
 * revive by time · 30% warning · potions only from drops (no starter potions)". Drives the real
 * public `sessionStep`/`selectPlayerView` (`@keep-walking/shared/session`) through a real,
 * gate-passing walk (`lib/walk-until.ts`), never the internal `hp`/`reward` reducers.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createPlayer, selectPlayerView, sessionStep } from '@keep-walking/shared/session';
import type { SessionEvent } from '@keep-walking/shared/session';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { walkUntilRetreatOrDeath } from './lib/walk-until';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 6, 0, 0); // pinned start= (P2-F06-T10 lesson)

function ticks(events: readonly SessionEvent[]) {
  return events.filter(
    (e): e is Extract<SessionEvent, { type: 'run_tick_granted' }> => e.type === 'run_tick_granted',
  );
}
function autoUsedPotions(events: readonly SessionEvent[]) {
  return events.filter(
    (e): e is Extract<SessionEvent, { type: 'run_potion_auto_used' }> =>
      e.type === 'run_potion_auto_used',
  );
}
function lowHpEvents(events: readonly SessionEvent[]) {
  return events.filter((e): e is Extract<SessionEvent, { type: 'run_hp_low' }> => e.type === 'run_hp_low');
}

/** Sums per-item quantities across every `run_tick_granted.loot` in `events` (the run bag's total
 * intake, before any auto-potion consumption) into a plain `{itemId: qty}` map. */
function sumLoot(events: readonly SessionEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of ticks(events)) {
    for (const item of t.loot) out[item.id] = (out[item.id] ?? 0) + item.qty;
  }
  return out;
}

describe('F06 HP safety — a fresh player starts with no potions at all (D-089)', () => {
  it('createPlayer never seeds a starter potion (or anything else) into inventory', () => {
    const params = qaSessionParams();
    const player = createPlayer(START_EPOCH_MS, params.config);
    expect(player.inventory).toEqual({});
    expect(player.lifetimeTicksGranted).toBe(0);
  });
});

describe('F06 HP safety — auto-retreat at 25% keeps every item; auto-retreat off then death loses them (R-B1, R17, R23)', () => {
  it('auto-retreat enabled (default): run ends auto_retreat, never death, and every drop survives into inventory', () => {
    const params = qaSessionParams();
    const result = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      true,
    );
    expect(result.outcome).toBe('autoRetreat');
    expect(result.state.lastSummary?.exitReason).toBe('auto_retreat');
    expect(result.state.lastSummary?.lost).toEqual([]);

    const looted = sumLoot(result.events);
    const usedFromBag = autoUsedPotions(result.events).filter((e) => e.source === 'runBag');
    for (const used of usedFromBag) {
      const qty = looted[used.itemId];
      if (qty !== undefined) looted[used.itemId] = qty - 1;
    }
    for (const [id, qty] of Object.entries(looted)) {
      if (qty > 0) expect(result.state.player.inventory[id]).toBe(qty);
    }
    // HP never actually reaches 0 on an auto-retreat outcome (the floor-at-1 rule, D-078/H-E6).
    expect(result.state.player.hp.value).toBeGreaterThan(0);
  });

  it('auto-retreat disabled from the start: run ends death, and every drop this run earned is lost, not merged into inventory', () => {
    const params = qaSessionParams();
    const result = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      false,
    );
    expect(result.outcome).toBe('death');
    expect(result.state.lastSummary?.exitReason).toBe('death');
    // Nothing was ever in inventory to begin with (fresh player) and nothing merges in on death.
    expect(result.state.player.inventory).toEqual({});
    expect(result.state.player.hp.value).toBe(0);
    expect(result.state.player.hp.recovering).toBe(true);

    const looted = sumLoot(result.events);
    const usedFromBag = autoUsedPotions(result.events).filter((e) => e.source === 'runBag');
    for (const used of usedFromBag) {
      const qty = looted[used.itemId];
      if (qty !== undefined) looted[used.itemId] = qty - 1;
    }
    const stillOwed = Object.entries(looted).filter(([, qty]) => qty > 0);
    if (stillOwed.length > 0) {
      const lostIds = new Set(result.state.lastSummary?.lost.map((l) => l.id));
      for (const [id] of stillOwed) expect(lostIds.has(id)).toBe(true);
    }
    // exp/levels earned this run are kept even on death (F05-R20/R21, F06-R23) — never zeroed.
    expect((result.state.lastSummary?.expGained ?? -1) >= 0).toBe(true);
  });

  it('a 30% low-HP warning never fires on the exact hit that ends the run in death (R14)', () => {
    const params = qaSessionParams();
    const result = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      false,
    );
    expect(result.outcome).toBe('death');
    const deathAt = result.events.find((e) => e.type === 'run_death')?.at_ms;
    const lowAtSameInstant = lowHpEvents(result.events).some((e) => e.at_ms === deathAt);
    expect(lowAtSameInstant).toBe(false);
  });

  it('at least one 30% low-HP warning fires somewhere on the way to auto-retreat (H1/H2, R14)', () => {
    const params = qaSessionParams();
    const result = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      true,
    );
    expect(result.outcome).toBe('autoRetreat');
    expect(lowHpEvents(result.events).length).toBeGreaterThanOrEqual(1);
  });
});

describe('F06 HP safety — revive by time after death (R25, tech note F06 section 6)', () => {
  it('HP climbs from 0 to exactly deathRecoveryTo_pct of maxHp over deathRecoveryDuration_s, then player_recovered fires (no timer, anchor + config only)', () => {
    const params = qaSessionParams();
    const result = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      false,
    );
    expect(result.outcome).toBe('death');
    const deathAt = result.events.find((e) => e.type === 'run_death')?.at_ms;
    expect(deathAt).toBeTypeOf('number');

    const hpRecovery = (
      JSON.parse(readFileSync('config/balance/progression.json', 'utf8')) as {
        readonly hpRecovery: { readonly deathRecoveryTo_pct: number; readonly deathRecoveryDuration_s: number };
      }
    ).hpRecovery;
    const halfway_ms = (deathAt as number) + (hpRecovery.deathRecoveryDuration_s * 1000) / 2;
    const full_ms = (deathAt as number) + hpRecovery.deathRecoveryDuration_s * 1000;

    const atDeath = selectPlayerView(result.state, deathAt as number, params);
    expect(atDeath.hp).toBe(0);
    expect(atDeath.recovering).toBe(true);

    const atHalf = selectPlayerView(result.state, halfway_ms, params);
    expect(atHalf.hpRatio * 100).toBeCloseTo(hpRecovery.deathRecoveryTo_pct / 2, 1);
    expect(atHalf.recovering).toBe(true);

    const atFull = selectPlayerView(result.state, full_ms, params);
    expect(atFull.hpRatio * 100).toBeCloseTo(hpRecovery.deathRecoveryTo_pct, 1);
    expect(atFull.recovering).toBe(false);

    // No timer: reading the *same* state object at two different `now_ms` values (never mutated
    // in between) is enough — the value comes from `{value, anchorAt_ms}` + config alone.
    const secondReadAtHalf = selectPlayerView(result.state, halfway_ms, params);
    expect(secondReadAtHalf).toEqual(atHalf);

    // A `tick` at/after the crossing instant is where the engine actually emits `player_recovered`.
    const ticked = sessionStep(result.state, { type: 'tick' }, full_ms, params);
    expect(ticked.events.some((e) => e.type === 'player_recovered')).toBe(true);
  });
});
