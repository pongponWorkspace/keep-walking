// Golden vectors of hp-recovery.json (P2-H47, tech note F06 13.5, closes tech gate F06-TG-14):
// HP regen outside a run (`hpAfterRegen`) and the time to leave Recovering after death
// (`recoveryTime`). Expected values = reference output (regen.ts), rounded to 6 decimals,
// tolerance 1e-6. Rate parameters are copied inline from config; the numbers in RCASE are
// example inputs (HP fractions, elapsed times, VIT), not balance values.
import type { BalanceConfig } from './config';
import { phase2Stats } from './loop-scenarios';
import type { RegenParams } from './regen';
import {
  REPORT_DECIMALS,
  hpAfterRegen,
  recoveryTime,
  regenConfigProblems,
  regenParamsFromConfig,
} from './regen';
import type { GateVector, GateVectorFile } from './vectors-gate';
import { GATE_TOLERANCE, roundDeep } from './vectors-gate';

type In = Record<string, unknown>;
const SIM = 'sim run P2-H47 (reference tools/sim/src/regen.ts)';
const MS_PER_S = 1000;
const MS_PER_MIN = 60_000;

/** Example inputs (not balance values). */
export const RCASE = {
  /** Level-25 balanced build max HP (design/systems/balance-model.md, tech note F06 13.1). */
  l25MaxHp: 3112.5,
  vit: 10,
  partialMin: 10,
  normalExitFrom: 0.6,
  normalExitMin: 15,
  nearFull: 0.9,
  halfHourMin: 30,
  partialFrom: 0.2,
  staleFrom: 0.55,
  backwards_ms: -60_000,
} as const;

function rvec(input: In, expected: unknown, note: string): GateVector {
  return {
    input,
    expected: roundDeep(expected),
    tolerance: GATE_TOLERANCE,
    source: `${SIM} · ${note}`,
  };
}

export function hpRecoveryVectors(cfg: BalanceConfig): GateVectorFile {
  const params: RegenParams = regenParamsFromConfig(cfg);
  const problems = regenConfigProblems(params);
  if (problems.length > 0) throw new Error(`FINDING ${problems.join('; ')}`);
  const base = phase2Stats(cfg);
  const v: GateVector[] = [];
  const regen = (value: number, maxHp: number, vit: number, elapsed_ms: number, note: string) => {
    const input = { fn: 'hpAfterRegen', value, maxHp, vit, elapsed_ms, params };
    v.push(rvec(input, hpAfterRegen(value, maxHp, vit, elapsed_ms, params), note));
  };
  const rt = (value: number, maxHp: number, vit: number, recovering: boolean, note: string) => {
    const input = { fn: 'recoveryTime', value, maxHp, vit, recovering, params };
    v.push(rvec(input, recoveryTime(value, maxHp, vit, recovering, params), note));
  };
  const dur_ms = params.deathRecoveryDuration_s * MS_PER_S;
  const cross = recoveryTime(0, base.maxHp, 0, true, params).recoveredAfter_ms;
  if (cross === null) throw new Error('unreachable: recovering from 0 has a crossing time');
  const to = params.deathRecoveryTo_pct;

  // ---- hpAfterRegen ----
  regen(
    0,
    base.maxHp,
    0,
    dur_ms,
    `death (HP 0) at Phase 2 base max HP, VIT 0, after deathRecoveryDuration_s: just over ${to}% (the rate reaches the line at ${(cross / MS_PER_S).toFixed(REPORT_DECIMALS)} s, inside the +-1 s check of tech note 6.2)`,
  );
  regen(
    0,
    base.maxHp,
    0,
    cross,
    `death, VIT 0, after the exact closed-form crossing time: exactly ${to}% (deathRecoveryTo_pct)`,
  );
  regen(
    0,
    RCASE.l25MaxHp,
    0,
    dur_ms,
    `death at the level-25 balanced max HP: the same ${to}% share after the same time (rate is a share of maxHp)`,
  );
  regen(
    0,
    base.maxHp,
    0,
    RCASE.partialMin * MS_PER_MIN,
    `partial recovery: death then ${RCASE.partialMin} min outside -> ${RCASE.partialMin} x rate % of maxHp, still Recovering`,
  );
  regen(
    base.maxHp * RCASE.normalExitFrom,
    base.maxHp,
    0,
    RCASE.normalExitMin * MS_PER_MIN,
    `recovery while not in a run after a normal exit (no death) at ${RCASE.normalExitFrom * 100}%: same rate as after death (A-P1-F03-T06-15a)`,
  );
  regen(
    base.maxHp * RCASE.nearFull,
    base.maxHp,
    0,
    RCASE.halfHourMin * MS_PER_MIN,
    'cap: never above maxHp',
  );
  regen(base.maxHp, base.maxHp, 0, RCASE.halfHourMin * MS_PER_MIN, 'already full stays full');
  regen(
    0,
    base.maxHp,
    RCASE.vit,
    dur_ms,
    `VIT ${RCASE.vit}: rate x (1 + ${RCASE.vit} x vitHpRegenSpeed_pct / 100)`,
  );
  regen(base.maxHp * RCASE.partialFrom, base.maxHp, 0, 0, 'elapsed_ms = 0: value unchanged');
  regen(
    base.maxHp * RCASE.partialFrom,
    base.maxHp,
    0,
    RCASE.backwards_ms,
    'elapsed_ms < 0 (clock moved backwards): value unchanged, HP never drops (R04)',
  );

  // ---- recoveryTime ----
  rt(
    0,
    base.maxHp,
    0,
    true,
    `death, VIT 0: time to ${to}% = ${to} / outsideDungeonRegen_pctMaxHpPerMin min (config says deathRecoveryDuration_s = ${params.deathRecoveryDuration_s}; engine test 13.3 item 9 allows +-1 s)`,
  );
  rt(0, RCASE.l25MaxHp, 0, true, 'the same time at another maxHp (share-based rate)');
  rt(
    base.maxHp * RCASE.partialFrom,
    base.maxHp,
    0,
    true,
    `partial: Recovering at ${RCASE.partialFrom * 100}% (e.g. a small potion drunk while Recovering), time left to the line`,
  );
  rt(0, base.maxHp, RCASE.vit, true, `VIT ${RCASE.vit}: shorter Recovering`);
  rt(
    base.maxHp * RCASE.staleFrom,
    base.maxHp,
    0,
    true,
    'Recovering flag still set but HP already past the line (stale anchor): 0 ms left',
  );
  rt(
    base.maxHp * RCASE.partialFrom,
    base.maxHp,
    0,
    false,
    'not Recovering (normal exit): nothing to cross, null',
  );
  return { formula: 'hp-recovery', vectors: v };
}
