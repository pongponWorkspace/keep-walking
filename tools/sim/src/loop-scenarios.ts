// Config -> runLoop inputs, and the seeded Monte Carlo of Phase 2 runs (P2-F05-T01). The
// scenario choices (which class, level, zone range, table, limit) are simulator inputs documented
// in design/systems/sim-report.md section 12, not balance values.
import type { DropContext } from '@keep-walking/shared/formulas';
import { NEUTRAL_CONTEXT } from '@keep-walking/shared/formulas';
import type { BalanceConfig } from './config';
import { getPath, num, strArray } from './config';
import { dropTableDef, lootParamsFromConfig, lootTable, withoutBonusRolls } from './loot';
import type { LoopInput, LoopParams, LoopResult, OwnClass } from './loop';
import { runLoop, soloBuffPct } from './loop';
import { paramsFromConfig } from './params';
import { mean, percentile } from './stats';

export const CLASSES: readonly OwnClass[] = ['tanker', 'ranged', 'support', 'magic'];

export function loopParamsFromConfig(cfg: BalanceConfig): LoopParams {
  const sp = paramsFromConfig(cfg);
  const potionOrder = strArray(cfg.economy, 'autoPotion.defaultPotionOrder');
  const potionHeal_pct: Record<string, number> = {};
  for (const id of potionOrder)
    potionHeal_pct[id] = num(cfg.economy, `potions.${id}.heal_pctMaxHp`);
  const enabled = getPath(cfg.economy, 'autoPotion.enabledByDefault');
  if (typeof enabled !== 'boolean')
    throw new Error('autoPotion.enabledByDefault must be a boolean');
  return {
    window_s: num(cfg.dungeons, 'movementGate.window_s'),
    intervalMin_s: sp.attack.intervalMin_s,
    intervalMax_s: sp.attack.intervalMax_s,
    hitChance_pct: sp.attack.hitChancePerCheck_pct,
    monster: sp.monster,
    buff: sp.buff,
    roles: {
      tanker: { base_pct: sp.roles.tanker.base_pct, cap_pct: sp.roles.tanker.cap_pct },
      support: { base_pct: sp.roles.support.base_pct, cap_pct: sp.roles.support.cap_pct },
      magic: { base_pct: sp.roles.magic.base_pct, cap_pct: sp.roles.magic.cap_pct },
    },
    supportHealBase_pctMaxHpPerMin: sp.healShield.supportHealBase_pctMaxHpPerMin,
    magicShieldPerTick_pctMaxHpPerBuffPct: sp.healShield.magicShieldPerTick_pctMaxHpPerBuffPct,
    exp: sp.exp,
    expMult: sp.expMult,
    autoRetreatThreshold_pct: sp.safety.autoRetreatThreshold_pct,
    lowHpWarningThreshold_pct: sp.safety.lowHpWarningThreshold_pct,
    autoPotionEnabled: enabled,
    autoPotionThreshold_pct: sp.safety.autoPotionThreshold_pct,
    vitPotionEfficiency_pct: sp.stats.vitPotionEfficiency_pct,
    potionHeal_pct,
    potionOrder,
    sourceOrder: strArray(cfg.economy, 'autoPotion.sourceOrder'),
  };
}

/** Phase 2 character: base stats at every level (no gear, no allocated points, F06 R35). */
export function phase2Stats(cfg: BalanceConfig): { maxHp: number; def: number; vit: number } {
  return {
    maxHp: num(cfg.progression, 'baseStats.hp'),
    def: num(cfg.progression, 'baseStats.def'),
    vit: num(cfg.progression, 'baseStats.vit'),
  };
}

/** Phase 2 drop context of a solo player (tech note F05 5): own Ranged buff, small by area. */
export function soloDropContext(
  ownClass: OwnClass,
  level: number,
  smallDungeon: boolean,
  p: LoopParams,
  rangedRole: { base_pct: number; cap_pct: number },
): DropContext {
  return {
    ...NEUTRAL_CONTEXT,
    rangedBuff_pct: ownClass === 'ranged' ? soloBuffPct(rangedRole, level, p.buff) : null,
    smallDungeon,
  };
}

export interface Scenario {
  tableId: string;
  smallDungeon: boolean;
  ownClass: OwnClass;
  level: number;
  rangeMin: number;
  rangeMax: number;
  withPotionDrops: boolean;
  autoRetreatEnabled: boolean;
  limit_s: number;
  inventory?: Record<string, number>;
  failedTicks?: number[];
  /** Override of the Phase 2 base stats (e.g. the balanced build of the D-020 reference). */
  stats?: { maxHp: number; def: number; vit: number };
}

export function loopInput(
  cfg: BalanceConfig,
  s: Scenario,
  runSeed: number,
  events: boolean,
): LoopInput {
  const p = loopParamsFromConfig(cfg);
  const def = dropTableDef(cfg, s.tableId);
  const sp = paramsFromConfig(cfg);
  const ctx = soloDropContext(s.ownClass, s.level, s.smallDungeon, p, sp.roles.ranged);
  const table = lootTable(
    s.withPotionDrops ? def : withoutBonusRolls(def),
    ctx,
    lootParamsFromConfig(cfg),
  );
  const st = s.stats ?? phase2Stats(cfg);
  return {
    runSeed,
    limit_s: s.limit_s,
    failedTicks: s.failedTicks ?? [],
    ownClass: s.ownClass,
    level: s.level,
    exp: 0,
    maxHp: st.maxHp,
    hp: st.maxHp,
    def: st.def,
    vit: st.vit,
    rangeMin: s.rangeMin,
    rangeMax: s.rangeMax,
    autoRetreatEnabled: s.autoRetreatEnabled,
    inventory: s.inventory ?? {},
    table,
    params: p,
    recordEvents: events,
  };
}

export interface LoopStats {
  runs: number;
  p10_min: number;
  median_min: number;
  p90_min: number;
  mean_min: number;
  /** Share of runs that ended by the exit reason of the scenario (auto_retreat or death). */
  endedShare: number;
  /** Share of runs where an auto-order potion dropped before the run ended. */
  potionBeforeEndShare: number;
  potionsUsedPerRun: number;
}

/** Seeded Monte Carlo: runSeed = firstSeed, firstSeed + 1, ... (every run reproducible). */
export function loopStats(
  input: Omit<LoopInput, 'runSeed'>,
  firstSeed: number,
  runs: number,
): LoopStats {
  const minutes: number[] = [];
  let ended = 0;
  let potion = 0;
  let used = 0;
  const minute = 60;
  for (let i = 0; i < runs; i += 1) {
    const r: LoopResult = runLoop({ ...input, runSeed: firstSeed + i, recordEvents: false });
    minutes.push(r.end_s / minute);
    if (r.exitReason !== 'manual_exit') ended += 1;
    if (r.firstPotionDrop_s !== null) potion += 1;
    used += r.potionsFromRunBag + r.potionsFromInventory;
  }
  minutes.sort((a, b) => a - b);
  const tenth = 10;
  const half = 50;
  const ninetieth = 90;
  return {
    runs,
    p10_min: percentile(minutes, tenth),
    median_min: percentile(minutes, half),
    p90_min: percentile(minutes, ninetieth),
    mean_min: mean(minutes),
    endedShare: ended / runs,
    potionBeforeEndShare: potion / runs,
    potionsUsedPerRun: used / runs,
  };
}
