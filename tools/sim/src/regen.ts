// HP recovery outside a run (P2-H47, tech note F06 6.1-6.2 and 13.5): the closed-form regen after
// any exit (normal exit or death) and the time to the Recovering line. Written independently of
// packages/shared/src/hp (reference, never imported by it). Spec F06 R03-R04, R25: no regen inside
// a run, regen outside at outsideDungeonRegen_pctMaxHpPerMin x (1 + VIT x vitHpRegenSpeed_pct / 100),
// capped at maxHp; after death `recovering` holds until HP reaches deathRecoveryTo_pct of maxHp.
import type { BalanceConfig } from './config';
import { num } from './config';

const MS_PER_MIN = 60_000;
const MS_PER_S = 1000;
const PCT = 100;
export const REPORT_DECIMALS = 3;

export interface RegenParams {
  outsideDungeonRegen_pctMaxHpPerMin: number;
  vitHpRegenSpeed_pct: number;
  deathRecoveryTo_pct: number;
  /** Consistency value only (A-P2-F06-T04-4): time from 0 to deathRecoveryTo_pct at VIT 0. */
  deathRecoveryDuration_s: number;
}

export function regenParamsFromConfig(cfg: BalanceConfig): RegenParams {
  return {
    outsideDungeonRegen_pctMaxHpPerMin: num(
      cfg.progression,
      'hpRecovery.outsideDungeonRegen_pctMaxHpPerMin',
    ),
    vitHpRegenSpeed_pct: num(cfg.progression, 'statPerPoint.vitHpRegenSpeed_pct'),
    deathRecoveryTo_pct: num(cfg.progression, 'hpRecovery.deathRecoveryTo_pct'),
    deathRecoveryDuration_s: num(cfg.progression, 'hpRecovery.deathRecoveryDuration_s'),
  };
}

/** HP gained per minute outside a run. */
export function regenPerMin(maxHp: number, vit: number, p: RegenParams): number {
  const speed = 1 + (vit * p.vitHpRegenSpeed_pct) / PCT;
  return (maxHp * p.outsideDungeonRegen_pctMaxHpPerMin * speed) / PCT;
}

/** HP after `elapsed_ms` outside a run from `value`. elapsed <= 0 (clock not moving or moving
 * backwards) returns `value` unchanged: HP never drops from regen (R04). Capped at maxHp. */
export function hpAfterRegen(
  value: number,
  maxHp: number,
  vit: number,
  elapsed_ms: number,
  p: RegenParams,
): number {
  if (elapsed_ms <= 0) return value;
  return Math.min(maxHp, value + (regenPerMin(maxHp, vit, p) * elapsed_ms) / MS_PER_MIN);
}

export interface RecoveryTime {
  /** HP at which Recovering ends (deathRecoveryTo_pct of maxHp). */
  recoveryLine: number;
  /** ms from now until HP reaches the line; null when not recovering, 0 when already past it. */
  recoveredAfter_ms: number | null;
}

export function recoveryTime(
  value: number,
  maxHp: number,
  vit: number,
  recovering: boolean,
  p: RegenParams,
): RecoveryTime {
  const recoveryLine = (maxHp * p.deathRecoveryTo_pct) / PCT;
  if (!recovering) return { recoveryLine, recoveredAfter_ms: null };
  if (value >= recoveryLine) return { recoveryLine, recoveredAfter_ms: 0 };
  const perMin = regenPerMin(maxHp, vit, p);
  return { recoveryLine, recoveredAfter_ms: ((recoveryLine - value) / perMin) * MS_PER_MIN };
}

/** Allowed gap between the rate-implied 0 -> line time and deathRecoveryDuration_s (tech note 6.2). */
export const RECOVERY_DURATION_TOLERANCE_S = 1;

/** Config lint (tech note F06 14.3): the regen rate must reproduce deathRecoveryDuration_s at
 * VIT 0 within RECOVERY_DURATION_TOLERANCE_S. Independent of maxHp. */
export function regenConfigProblems(p: RegenParams): string[] {
  const implied_s =
    (p.deathRecoveryTo_pct / p.outsideDungeonRegen_pctMaxHpPerMin) * (MS_PER_MIN / MS_PER_S);
  const gap = Math.abs(implied_s - p.deathRecoveryDuration_s);
  if (gap <= RECOVERY_DURATION_TOLERANCE_S) return [];
  return [
    `hpRecovery: 0 -> ${p.deathRecoveryTo_pct}% takes ${implied_s.toFixed(REPORT_DECIMALS)} s at the regen rate but deathRecoveryDuration_s = ${p.deathRecoveryDuration_s} (gap ${gap.toFixed(REPORT_DECIMALS)} s > ${RECOVERY_DURATION_TOLERANCE_S} s)`,
  ];
}
