// Golden vectors of P2-F05-T01: tick-reward.json (exp per tick, drop tables per preset resolved
// for a tick context, loot rolls on the real tables) and run-loop.json (hit attempts, whole
// seeded runs incl. death vs auto-retreat, R43 statistics). Expected values = reference output
// (loot.ts, loop.ts), rounded to 6 decimals, tolerance 1e-6. Parameters are copied inline from
// config; the numbers in CASE are example inputs (levels, seeds, ranges), not balance values.
import type { DropContext } from '@keep-walking/shared/formulas';
import { NEUTRAL_CONTEXT } from '@keep-walking/shared/formulas';
import type { BalanceConfig, Json } from './config';
import { getPath } from './config';
import { dropTableDef, itemRarities, lootParamsFromConfig, lootTable } from './loot';
import type { LoopInput, OwnClass } from './loop';
import { soloBuffPct } from './loop';
import type { Scenario } from './loop-scenarios';
import { CLASSES, loopInput, loopParamsFromConfig, phase2Stats } from './loop-scenarios';
import { paramsFromConfig } from './params';
import { evaluateLoopVector } from './vector-eval-loop';
import { evaluateGateVector } from './vector-eval-gate';
import type { GateVector, GateVectorFile } from './vectors-gate';
import { GATE_TOLERANCE, roundDeep } from './vectors-gate';

type In = Record<string, unknown>;
const SIM = 'sim run P2-F05-T01 (reference tools/sim/src/loot.ts, loop.ts, rng-contract.ts)';

function vec(input: In, note: string): GateVector {
  const out = evaluateLoopVector(input) ?? evaluateGateVector(input);
  if (out === undefined) throw new Error(`no evaluator for ${String(input['fn'])}`);
  return { input, expected: roundDeep(out), tolerance: GATE_TOLERANCE, source: `${SIM} · ${note}` };
}

/** Example inputs (not balance values). */
export const CASE = {
  starterRange: { min: 1, max: 5 },
  pn2Range: { min: 1, max: 35 },
  midRange: { min: 20, max: 30 },
  topRange: { min: 50, max: 60 },
  levels: { one: 1, five: 5, ten: 10, l25: 25, l40: 40, l59: 59, max: 60 },
  partialF: 0.4,
  fullF: 1,
  expCarry: { level: 1, exp: 50, gained: 400 },
  seeds: {
    loot: 20260926,
    hit: 20260926,
    deathVsRetreat: 3,
    magic: 11,
    support: 5,
    tanker: 2,
    pn2: 9,
  },
  lootCount: 6,
  lootPartialIndex: 3,
  lootLargeCount: 3,
  hitCount: 4,
  hitFarIndex: 12,
  limits: { long_s: 21600, half_h_s: 1800 },
  failedTicks: [1, 2],
  statsRuns: 200,
  statsFirstSeed: 1,
  sure_pct: 100,
  sameInstant: { lowHp: 100, veryLowHp: 70 },
} as const;

function tickExpParams(cfg: BalanceConfig) {
  const p = loopParamsFromConfig(cfg);
  return { exp: p.exp, expMult: p.expMult, roles: p.roles, buff: p.buff };
}

export function tickRewardVectors(cfg: BalanceConfig): GateVectorFile {
  const v: GateVector[] = [];
  const params = tickExpParams(cfg);
  const te = (
    level: number,
    ownClass: OwnClass,
    r: { min: number; max: number },
    f: number,
    note: string,
  ) =>
    v.push(
      vec(
        { fn: 'soloTickExp', level, ownClass, rangeMin: r.min, rangeMax: r.max, f, params },
        note,
      ),
    );
  const L = CASE.levels;
  for (const c of CLASSES)
    te(
      L.one,
      c,
      CASE.starterRange,
      CASE.fullF,
      `level 1 in a 1-5 dungeon (Z = 3), solo ${c}: Magic own buff, others x noMagicMult (D-039)`,
    );
  te(L.five, 'ranged', CASE.starterRange, CASE.fullF, 'level 5 at the top of 1-5, no gap');
  te(
    L.ten,
    'ranged',
    CASE.starterRange,
    CASE.fullF,
    'level 10 above 1-5: gap 5 -> 0.92^5 (A-3, both sides)',
  );
  te(
    L.one,
    'ranged',
    CASE.pn2Range,
    CASE.fullF,
    'level 1 in PN-2 1-35 (Z = 18): same Z for every level in range (A-1)',
  );
  te(L.l25, 'magic', CASE.midRange, CASE.fullF, 'level 25 Magic in 20-30 (Z = 25)');
  te(L.l25, 'tanker', CASE.midRange, CASE.partialF, 'D-059 partial tick f = 0.4 scales exp');
  te(L.one, 'support', CASE.topRange, CASE.fullF, 'level 1 in 50-60: gap 49 -> floor 0.25');
  te(
    L.max,
    'magic',
    CASE.topRange,
    CASE.fullF,
    'level 60 in 50-60 (exp is not added at max level, see addExp)',
  );
  const ae = (level: number, exp: number, gained: number, note: string) =>
    v.push(vec({ fn: 'addExp', level, exp, gained, params: params.exp }, note));
  ae(
    CASE.expCarry.level,
    CASE.expCarry.exp,
    CASE.expCarry.gained,
    'level-ups chain in one grant, remainder carried unrounded',
  );
  ae(L.one, 0, 0, 'no gain, no change');
  ae(L.l59, 0, Number.MAX_SAFE_INTEGER, 'reaching max level sets exp to 0');
  ae(L.max, 0, CASE.expCarry.gained, 'at max level nothing is added');
  lootTableVectors(cfg, v);
  lootRollVectors(cfg, v);
  return { formula: 'tick-reward', vectors: v };
}

interface TableCase {
  id: string;
  ownClass: OwnClass;
  level: number;
  smallDungeon: boolean;
  extra?: Partial<DropContext>;
  note: string;
}

function tableCases(): TableCase[] {
  const L = CASE.levels;
  return [
    {
      id: 'pocketParkDefault',
      ownClass: 'ranged',
      level: L.one,
      smallDungeon: true,
      note: 'pocketPark (always small by area), solo Ranged level 1: own buff on every rarity, small x1.5 rare+ and x0.6 Common quantity, potion rolls unscaled',
    },
    {
      id: 'largeParkDefault',
      ownClass: 'tanker',
      level: L.l25,
      smallDungeon: false,
      note: 'largePark not small, solo Tanker: no Ranged inside -> x0.6 on every rarity roll (F-2), potion rolls unscaled',
    },
    {
      id: 'marketDefault',
      ownClass: 'magic',
      level: L.ten,
      smallDungeon: true,
      note: 'market under 20,000 m2 (small by area), solo Magic',
    },
    {
      id: 'largeParkDefault',
      ownClass: 'ranged',
      level: L.l40,
      smallDungeon: true,
      note: 'largePark under 20,000 m2 gets the small rule too (presets.md 6), Ranged level 40',
    },
    {
      id: 'largeParkDefault',
      ownClass: 'support',
      level: L.l25,
      smallDungeon: false,
      extra: { lowTrust: true, failedRaidBossHpLeft: 0.5 },
      note: 'boundary (not reachable in Phase 2): low trust blocks epic+ and halves the rest, failed-raid week x1.8; potion rolls still unscaled',
    },
  ];
}

function contextOf(cfg: BalanceConfig, c: TableCase): DropContext {
  const p = loopParamsFromConfig(cfg);
  const ranged = paramsFromConfig(cfg).roles.ranged;
  return {
    ...NEUTRAL_CONTEXT,
    rangedBuff_pct: c.ownClass === 'ranged' ? soloBuffPct(ranged, c.level, p.buff) : null,
    smallDungeon: c.smallDungeon,
    ...c.extra,
  };
}

function lootTableVectors(cfg: BalanceConfig, v: GateVector[]): void {
  const lootParams = lootParamsFromConfig(cfg);
  const itemRarity = itemRarities(cfg);
  for (const c of tableCases()) {
    const dropTable = getPath(cfg.drops, `dropTables.${c.id}`) as Json;
    v.push(
      vec(
        {
          fn: 'lootTable',
          dropTableId: c.id,
          dropTable,
          itemRarity,
          ctx: contextOf(cfg, c),
          lootParams,
        },
        c.note,
      ),
    );
  }
}

function lootRollVectors(cfg: BalanceConfig, v: GateVector[]): void {
  const lp = lootParamsFromConfig(cfg);
  const [pocket, large] = tableCases();
  if (pocket === undefined || large === undefined) throw new Error('table cases');
  const resolve = (c: TableCase) => lootTable(dropTableDef(cfg, c.id), contextOf(cfg, c), lp);
  const roll = (table: unknown, dropIndex: number, f: number, note: string) =>
    v.push(vec({ fn: 'rollTickLoot', runSeed: CASE.seeds.loot, dropIndex, table, f }, note));
  const pocketTable = resolve(pocket);
  for (let i = 0; i < CASE.lootCount; i += 1)
    roll(
      pocketTable,
      i,
      CASE.fullF,
      `real pocketParkDefault table (Ranged level 1), drop index ${i}: ADR 0003 6.3 order, potion rolls after the rarity rolls in config order${i === 0 ? ' · index 0 is also the first reward of onboarding: same roll as any tick (D-089, F06 R39)' : ''}`,
    );
  roll(
    pocketTable,
    CASE.lootPartialIndex,
    CASE.partialF,
    'D-059 partial tick at index 3, f = 0.4: every chance incl. potion rolls and the Common quantity x f',
  );
  const largeTable = resolve(large);
  for (let i = 0; i < CASE.lootLargeCount; i += 1)
    roll(
      largeTable,
      i,
      CASE.fullF,
      `real largeParkDefault table (Tanker, no Ranged x0.6), drop index ${i}`,
    );
}

function starter(
  ownClass: OwnClass,
  withPotionDrops: boolean,
  extra: Partial<Scenario> = {},
): Scenario {
  return {
    tableId: 'pocketParkDefault',
    smallDungeon: true,
    ownClass,
    level: CASE.levels.one,
    rangeMin: CASE.starterRange.min,
    rangeMax: CASE.starterRange.max,
    withPotionDrops,
    autoRetreatEnabled: true,
    limit_s: CASE.limits.long_s,
    ...extra,
  };
}

/** PN-2 (design/levels/pilot-dungeons.md 3.1): largePark 13,772 m2 (small by area), range 1-35. */
function pn2(ownClass: OwnClass, withPotionDrops: boolean): Scenario {
  return {
    ...starter(ownClass, withPotionDrops),
    tableId: 'largeParkDefault',
    rangeMin: CASE.pn2Range.min,
    rangeMax: CASE.pn2Range.max,
  };
}

export function runLoopVectors(cfg: BalanceConfig): GateVectorFile {
  const v: GateVector[] = [];
  const p = loopParamsFromConfig(cfg);
  const hitParams = {
    intervalMin_s: p.intervalMin_s,
    intervalMax_s: p.intervalMax_s,
    hitChance_pct: p.hitChance_pct,
  };
  for (const index of [...Array.from({ length: CASE.hitCount }, (_, i) => i), CASE.hitFarIndex])
    v.push(
      vec(
        { fn: 'hitAttempt', runSeed: CASE.seeds.hit, index, params: hitParams },
        `ADR 0003 6.4: stream "hit" index ${index}, draw 1 interval uniform(45, 75), draw 2 hit < 54%`,
      ),
    );
  const dmgParams = { monster: p.monster, roles: p.roles, buff: p.buff };
  const def = phase2Stats(cfg).def;
  const dmg = (level: number, ownClass: OwnClass, r: { min: number; max: number }, note: string) =>
    v.push(
      vec(
        {
          fn: 'soloDamage',
          level,
          ownClass,
          rangeMin: r.min,
          rangeMax: r.max,
          def,
          params: dmgParams,
        },
        note,
      ),
    );
  for (const c of CLASSES)
    dmg(
      CASE.levels.one,
      c,
      CASE.starterRange,
      `Phase 2 base DEF, level 1 in 1-5, solo ${c}: Tanker own buff (P = 1.02), others x1.6`,
    );
  dmg(
    CASE.levels.one,
    'ranged',
    CASE.pn2Range,
    'level 1 in PN-2 1-35: Z = 18 for everyone in range, about 64% of max HP per hit (finding F-18)',
  );
  dmg(
    CASE.levels.one,
    'ranged',
    CASE.midRange,
    'level 1 in 20-30: 1.25^19 below the range, unbounded (A-2)',
  );
  const loop = (s: Scenario, seed: number, note: string, events = true) => {
    const { runSeed, ...rest } = loopInput(cfg, s, seed, events);
    v.push(vec({ fn: 'runLoop', runSeed, ...rest }, note));
  };
  const carried = { hpSmall: 1, revive: 1 };
  loop(
    starter('ranged', true, { inventory: carried }),
    CASE.seeds.deathVsRetreat,
    'auto-retreat ON (default): run-bag potion first, then the inventory potion (sourceOrder, F06 R12); ends auto_retreat with every run-bag item kept (autoRetreatKeepsRunLoot); revive never auto-drunk',
  );
  loop(
    starter('ranged', true, { inventory: carried, autoRetreatEnabled: false }),
    CASE.seeds.deathVsRetreat,
    'same seed, auto-retreat OFF: same draws until the retreat point, then death at HP 0: run loot lost (loseAllRunLoot), exp kept, inventory revive kept (D-094, F05 R21, TL N-14)',
  );
  loop(
    starter('magic', true, { failedTicks: [...CASE.failedTicks], limit_s: CASE.limits.half_h_s }),
    CASE.seeds.magic,
    'Magic shield only on granted ticks (k = 1, 2 fail the gate: no loot, no exp, no shield, no drop draw; the next granted tick uses drop index 1), replaced not stacked (F06 R31.4)',
  );
  loop(
    starter('support', false),
    CASE.seeds.support,
    'Support heals itself over active time (F06 R31.5), no potion drops (no-potion case)',
  );
  loop(
    starter('tanker', true, { limit_s: CASE.limits.half_h_s }),
    CASE.seeds.tanker,
    'Tanker level 1 with potion drops, manual exit at 30 min (limit_s): run bag kept',
  );
  const sameInstant = (hp: number, withPotionDrops: boolean, note: string) => {
    const base = loopInput(
      cfg,
      starter('ranged', withPotionDrops, { limit_s: p.window_s }),
      CASE.seeds.loot,
      true,
    );
    const { runSeed, ...rest } = {
      ...base,
      hp,
      params: {
        ...base.params,
        intervalMin_s: p.window_s,
        intervalMax_s: p.window_s,
        hitChance_pct: CASE.sure_pct,
      },
    };
    v.push(vec({ fn: 'runLoop', runSeed, ...rest }, note));
  };
  sameInstant(
    CASE.sameInstant.lowHp,
    true,
    'synthetic timing (interval fixed at window_s, hit chance 100%): the first attempt lands at the same instant as tick 0, the tick runs first (F05 R19), its hpSmall drop enters the run bag and the hit drinks it at once (F06 R10, H-E8)',
  );
  sameInstant(
    CASE.sameInstant.veryLowHp,
    false,
    'synthetic timing: run entered at 23% HP (F06 R05, H-E11), tick 0 at the same instant is paid first, then the first hit ends the run by auto-retreat with that loot kept',
  );
  loop(
    pn2('ranged', true),
    CASE.seeds.pn2,
    'PN-2 1-35 at level 1: auto-retreat after a few hits (finding F-18, R43 not met)',
  );
  const stats = (s: Scenario, note: string) => {
    const rest: Partial<LoopInput> = loopInput(cfg, s, 0, false);
    delete rest.runSeed;
    v.push(
      vec(
        { fn: 'runLoopStats', firstSeed: CASE.statsFirstSeed, runs: CASE.statsRuns, loop: rest },
        note,
      ),
    );
  };
  for (const c of CLASSES) {
    stats(
      starter(c, false),
      `R43 (spec F06): level 1 ${c}, 1-5 dungeon, no potions, runSeed 1..200: median minutes to auto-retreat must be >= 2 x movementGate.window_s (10 min)`,
    );
    stats(
      starter(c, true),
      `level 1 ${c}, 1-5 dungeon, with potion drops (B-06): potionBeforeEndShare = share of runs that got a potion before auto-retreat`,
    );
  }
  stats(
    pn2('ranged', false),
    'PN-2 1-35, level 1 Ranged, no potions: R43 NOT met (finding F-18, sent to game-director)',
  );
  stats(pn2('tanker', false), 'PN-2 1-35, level 1 Tanker, no potions: R43 NOT met (finding F-18)');
  return { formula: 'run-loop', vectors: v };
}
