// Survival-time formulas (design/systems/balance-model.md sections 3.3, 3.4), ported from the
// pure part of tools/sim/src/survival.ts without forking: packages/shared must reproduce the
// survival-related vectors in design/systems/test-vectors/damage.json (hitsToThreshold,
// expectedSurvival_min, hpLossPerHour_pct, potionCostPerHour_gold, survivalMinutes).
//
// TODO(P2-F06-T06): tools/sim's simulateRun / survivalMonteCarlo / potionCostMonteCarlo are not
// ported here. They thread a single continuously-drawn Rng through a hit-by-hit loop and read
// AUTO_RETREAT_HP_FLOOR from tools/sim/src/hit.ts (resolveHit) — the HP engine's hit-resolution
// order (ADR 0003 6.4: hit resolution and its RNG stream `hit` belong to src/hp, built in
// P2-F06-T06). Porting them now would either fork that order or reach ahead of its owner task.
// This file only carries the closed-form ("pure") formulas that do not need a hit-by-hit loop.
const CEIL_EPSILON = 1e-9;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Hits until HP <= threshold% of max (threshold 0 = HP 0, death). Damage is constant per hit. */
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

/** Uncapped analytic potion cost: HP lost / (heal x VIT efficiency) x price. */
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
