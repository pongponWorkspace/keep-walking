/**
 * P2-F06-T17 acceptance: "zone-level player without potions survives per simulator (approximately
 * 44.4 min to auto-retreat, tolerance per vector) via accelerated Mock/sessionStep".
 *
 * Scoping note (recorded here, not a shortcut taken quietly): the GDD's "~44.4 min" headline
 * number (`design/systems/test-vectors/damage.json`'s `survivalMinutes` vector, expected
 * 44.444444, tolerance 0.000001) is defined at a level-25 "balanced build" (maxHp 3,112.5, def
 * 286.25) that Phase 2 cannot reach through real play: `PlayerState.allocated` is always the
 * literal-zero type in Phase 2 (R34, `packages/shared/src/hp/stats.ts`'s own comment: "these
 * always evaluate to baseStats.* today"), so a real Phase-2 player's maxHp/def never move off
 * baseStats regardless of level. That exact vector is already proven at the formula layer
 * (`packages/shared/src/formulas/vectors.test.ts`, dev-owned, confirmed green in this task's own
 * run — see the QA gate report) and again inside the HP engine's own Monte-Carlo dev test
 * (`packages/shared/src/hp/survival.test.ts`, 13.3), so this file does not re-run 2,000 seeds of a
 * build nobody can actually play.
 *
 * What this file proves instead, through the real public `sessionStep` (not the isolated
 * formula): the *actually reachable* "zone-level player without potions" case — level 1 in
 * `QA_RECT_DUNGEON_ID` (`level_range` 1-60, so Z = clamp(1, 1, 60) = 1, `levelsBelowRange` = 0,
 * i.e. genuinely zone-matched) — converges, across several `runSeed`s, to the *same* closed-form
 * `survivalMinutes` prediction computed from that build's real numbers (maxHp 300, def 20, real
 * `combat.json`), the same public formula the vector above already exercises. "Without potions" is
 * not a hand-picked drop table: the player never moves after confirming, so the 50 m/5 min reward
 * gate never grants a tick, so the run bag can never receive a potion (or anything else) all run —
 * proving F06-C05/F06-C38 (no other way to get a potion) and the survival case in the same run.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hitsToThreshold, expectedSurvival_min, damagePerHit } from '@keep-walking/shared/formulas';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { walkUntilRetreatOrDeath } from './lib/walk-until';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 6, 0, 0); // pinned start= (P2-F06-T10 lesson)
const SEEDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function realCombatConfig() {
  return JSON.parse(readFileSync('config/balance/combat.json', 'utf8')) as {
    readonly monsterAttack: {
      readonly monsterAtkCoef: number;
      readonly monsterAtkExponent: number;
    };
    readonly defense: { readonly defSoftcap: number };
    readonly attackCheck: {
      readonly intervalMin_s: number;
      readonly intervalMax_s: number;
      readonly hitChancePerCheck_pct: number;
    };
    readonly levelGapDamage: {
      readonly damageMultPerLevelBelowRange: number;
      readonly maxMult: number | null;
    };
    readonly raidFailPenalty: { readonly monsterAtkMultAfterFailedRaid: number };
  };
}
function realClassesConfig() {
  return JSON.parse(readFileSync('config/balance/classes.json', 'utf8')) as {
    readonly roles: { readonly tanker: { readonly missingDebuffMult: number } };
  };
}
function realProgressionConfig() {
  return JSON.parse(readFileSync('config/balance/progression.json', 'utf8')) as {
    readonly baseStats: { readonly hp: number; readonly def: number };
    readonly dungeons?: never;
  };
}
function realSafetyConfig() {
  return JSON.parse(readFileSync('config/balance/dungeons.json', 'utf8')) as {
    readonly hpSafety: { readonly autoRetreatThreshold_pct: number };
  };
}

describe('F06 survival — zone-level (level 1, matched-zone dungeon), no potions ever available', () => {
  it('the real engine (sessionStep), averaged over several seeds, agrees with the same public survivalMinutes formula for this exact build (non-Tanker: missingDebuffMult penalty applies)', () => {
    const params = qaSessionParams();
    const combat = realCombatConfig();
    const classes = realClassesConfig();
    const progression = realProgressionConfig();
    const safety = realSafetyConfig();

    const maxHp = progression.baseStats.hp;
    const def = progression.baseStats.def;
    const monsterParams = {
      monsterAtkCoef: combat.monsterAttack.monsterAtkCoef,
      monsterAtkExponent: combat.monsterAttack.monsterAtkExponent,
      defSoftcap: combat.defense.defSoftcap,
      damageMultPerLevelBelowRange: combat.levelGapDamage.damageMultPerLevelBelowRange,
      monsterAtkMultAfterFailedRaid: combat.raidFailPenalty.monsterAtkMultAfterFailedRaid,
      tankerMissingDebuffMult: classes.roles.tanker.missingDebuffMult,
    };
    // Non-Tanker (`ranged`): `tankerBuff_pct: null` (soloHitDamage's own rule) -> missingDebuffMult
    // applies, matching how a real, reachable Phase-2 player actually takes damage.
    const damage = damagePerHit(
      { zoneLevel: 1, def, tankerBuff_pct: null, levelsBelowRange: 0, failedRaidWeek: false },
      monsterParams,
    );
    const hits = hitsToThreshold(maxHp, damage, safety.hpSafety.autoRetreatThreshold_pct);
    const meanInterval_s =
      (combat.attackCheck.intervalMin_s + combat.attackCheck.intervalMax_s) / 2;
    const predictedMin = expectedSurvival_min(
      hits,
      combat.attackCheck.hitChancePerCheck_pct,
      meanInterval_s,
    );
    expect(predictedMin).toBeGreaterThan(0);

    const observedMin: number[] = [];
    for (const runSeed of SEEDS) {
      const result = walkUntilRetreatOrDeath(
        params,
        QA_RECT_DUNGEON_ID,
        START_EPOCH_MS,
        runSeed,
        'ranged',
        true,
        { moveAfterConfirm: false, maxSamples: 20000 },
      );
      expect(result.outcome).toBe('autoRetreat'); // acceptance 3: auto-retreat enabled never ends in death
      const retreatEvent = result.events.find((e) => e.type === 'run_auto_retreat');
      expect(retreatEvent?.type).toBe('run_auto_retreat');
      const startedAt = result.state.lastSummary?.startedAt_ms ?? 0;
      const endedAt = result.state.lastSummary?.endedAt_ms ?? 0;
      observedMin.push((endedAt - startedAt) / 60000);

      // "Without potions": the run bag never received anything (stationary -> gate never passes).
      expect(result.state.lastSummary?.potionsUsed).toEqual({ runBag: 0, inventory: 0 });
      expect(result.state.lastSummary?.loot).toEqual([]);
      expect(result.state.player.inventory).toEqual({});
    }
    const mean = observedMin.reduce((a, b) => a + b, 0) / observedMin.length;
    // A handful of seeds, not 2,000 (that Monte-Carlo proof already exists at the engine-dev-test
    // and formula layers cited above) — a generous +-30% band around the closed-form expectation
    // is enough to catch a real engine/formula disagreement without this file flaking on RNG.
    expect(mean).toBeGreaterThan(predictedMin * 0.7);
    expect(mean).toBeLessThan(predictedMin * 1.3);
  });
});
