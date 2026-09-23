// Survival time and potion use (balance-model sections 3.3 and 3.4).
// Analytic expectations are exact for the no-heal, no-shield case; the Monte Carlo engine
// adds Support heal, Magic shield and auto-potion. All randomness comes from a seeded Rng.
import type { Rng } from './rng';
import { mean, percentile, uniform } from './rng';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
/** Guards ceil() against floating-point noise on exact multiples. */
const CEIL_EPSILON = 1e-9;

/** Hits until HP ≤ threshold% of max (threshold 0 = HP 0, death). Damage is constant per hit. */
export function hitsToThreshold(maxHp: number, damage: number, threshold_pct: number): number {
  if (damage <= 0) return Number.POSITIVE_INFINITY;
  const hpToLose = maxHp * (1 - threshold_pct / 100);
  return Math.max(1, Math.ceil(hpToLose / damage - CEIL_EPSILON));
}

/** Mean checks until the n-th hit is n / p (negative binomial), each check one mean interval. */
export function expectedSurvival_min(
  hits: number,
  hitChance_pct: number,
  meanInterval_s: number,
): number {
  return ((hits / (hitChance_pct / 100)) * meanInterval_s) / SECONDS_PER_MINUTE;
}

/** Hit chance (%) that makes the expected survival equal a target, given the hits needed. */
export function hitChanceForTarget_pct(
  hits: number,
  target_min: number,
  meanInterval_s: number,
): number {
  return ((hits * meanInterval_s) / (target_min * SECONDS_PER_MINUTE)) * 100;
}

/** Expected HP lost per hour, as % of max HP. */
export function hpLossPerHour_pct(
  damage: number,
  maxHp: number,
  hitChance_pct: number,
  meanInterval_s: number,
): number {
  return (SECONDS_PER_HOUR / meanInterval_s) * (hitChance_pct / 100) * (damage / maxHp) * 100;
}

/** Uncapped analytic potion cost: HP lost / (heal × VIT efficiency) × price. */
export function potionCostPerHour_gold(
  hpLoss_pctPerHour: number,
  heal_pctMaxHp: number,
  potionEfficiencyBonus_pct: number,
  buyPrice_gold: number,
): number {
  return (
    (hpLoss_pctPerHour / (heal_pctMaxHp * (1 + potionEfficiencyBonus_pct / 100))) * buyPrice_gold
  );
}

export interface RunSetup {
  maxHp: number;
  damage: number;
  hitChance_pct: number;
  intervalMin_s: number;
  intervalMax_s: number;
  /** Run ends when HP ≤ this % (25 = auto-retreat, 0 = death). */
  stopAt_pct: number;
  /** Support heal, % max HP per minute (0 = no Support). */
  heal_pctMaxHpPerMin: number;
  /** Magic shield granted at each reward tick, % max HP, does not stack (0 = no Magic). */
  shield_pctMaxHp: number;
  rewardTickInterval_s: number;
  /** Auto-potion (null = no potions). Heal already includes the VIT efficiency bonus. */
  potion: { threshold_pct: number; heal_pctMaxHp: number; buyPrice_gold: number } | null;
  /** Hard stop for runs that never end (heal ≥ damage) or fixed-length potion runs. */
  maxDuration_s: number;
}

export interface RunResult {
  duration_s: number;
  ended: 'threshold' | 'timeLimit';
  potionsUsed: number;
  potionGold: number;
}

/** One run from full HP. Checks every U(min, max) seconds; a hit lands with hitChance. */
export function simulateRun(s: RunSetup, rng: Rng): RunResult {
  let hp = s.maxHp;
  let shield = 0;
  let t = 0;
  let nextTick = s.rewardTickInterval_s;
  let potionsUsed = 0;
  const stopHp = (s.maxHp * s.stopAt_pct) / 100;
  const healPerSecond = (s.maxHp * s.heal_pctMaxHpPerMin) / 100 / SECONDS_PER_MINUTE;
  const shieldAmount = (s.maxHp * s.shield_pctMaxHp) / 100;
  for (;;) {
    const nextCheck = t + uniform(rng, s.intervalMin_s, s.intervalMax_s);
    while (nextTick <= nextCheck && nextTick <= s.maxDuration_s) {
      hp = Math.min(s.maxHp, hp + healPerSecond * (nextTick - t));
      t = nextTick;
      shield = Math.max(shield, shieldAmount);
      nextTick += s.rewardTickInterval_s;
    }
    if (nextCheck > s.maxDuration_s) {
      return {
        duration_s: s.maxDuration_s,
        ended: 'timeLimit',
        potionsUsed,
        potionGold: potionsUsed * (s.potion?.buyPrice_gold ?? 0),
      };
    }
    hp = Math.min(s.maxHp, hp + healPerSecond * (nextCheck - t));
    t = nextCheck;
    if (rng() < s.hitChance_pct / 100) {
      const absorbed = Math.min(shield, s.damage);
      shield -= absorbed;
      hp -= s.damage - absorbed;
      if (s.potion !== null && hp < (s.maxHp * s.potion.threshold_pct) / 100 && hp > 0) {
        hp = Math.min(s.maxHp, hp + (s.maxHp * s.potion.heal_pctMaxHp) / 100);
        potionsUsed += 1;
      }
      if (hp <= stopHp) {
        return {
          duration_s: t,
          ended: 'threshold',
          potionsUsed,
          potionGold: potionsUsed * (s.potion?.buyPrice_gold ?? 0),
        };
      }
    }
  }
}

export interface SurvivalStats {
  runs: number;
  mean_min: number;
  p10_min: number;
  p50_min: number;
  p90_min: number;
  censored: number;
}

/** Monte Carlo survival time over many runs. */
export function survivalMonteCarlo(s: RunSetup, runs: number, rng: Rng): SurvivalStats {
  const minutes: number[] = [];
  let censored = 0;
  for (let i = 0; i < runs; i += 1) {
    const r = simulateRun(s, rng);
    if (r.ended === 'timeLimit') censored += 1;
    minutes.push(r.duration_s / SECONDS_PER_MINUTE);
  }
  minutes.sort((a, b) => a - b);
  const tenth = 10;
  const half = 50;
  const ninetieth = 90;
  return {
    runs,
    mean_min: mean(minutes),
    p10_min: percentile(minutes, tenth),
    p50_min: percentile(minutes, half),
    p90_min: percentile(minutes, ninetieth),
    censored,
  };
}

/** Potion gold per walking hour with auto-potion, over one long run with no stop threshold. */
export function potionCostMonteCarlo(
  s: RunSetup,
  hours: number,
  rng: Rng,
): { potionsPerHour: number; goldPerHour: number } {
  const r = simulateRun({ ...s, maxDuration_s: hours * SECONDS_PER_HOUR }, rng);
  const elapsed_h = r.duration_s / SECONDS_PER_HOUR;
  return { potionsPerHour: r.potionsUsed / elapsed_h, goldPerHour: r.potionGold / elapsed_h };
}
