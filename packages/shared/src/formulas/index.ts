// @keep-walking/shared/formulas — pure formulas + PRNG ported from tools/sim (P2-F05-T02).
// Every function here is deterministic and reads no config, no clock and no I/O itself: params
// come in as arguments (ADR 0003 3.2 point 6). run/reward/hp compose these into one tick.
export type {
  BaseCapRuleParams,
  BuffParams,
  ClassChangeParams,
  ExpMultParams,
  ExpParams,
  GapContributionParams,
  GearParams,
  MonsterParams,
} from './params';

// ---- class, party, buff stacking (balance-model section 2) ----
export type { BaseCapStatus } from './party';
export { baseCapStatus, classChangeCost, memberP, roleBuffPct, roleP } from './party';

// ---- damage (balance-model section 3, zone level section 18, D-112) ----
export type { DamageInput } from './damage';
export {
  ZONE_LEVEL_FROM,
  assertZoneLevelRule,
  damagePerHit,
  defReductionRatio,
  levelGapDamageMult,
  monsterAtk,
  zoneLevel,
} from './damage';

// ---- exp curve (balance-model section 4.1) ----
export {
  expMultiplier,
  expPerTick,
  expToNext,
  ticksBetween,
  ticksPerLevel,
  ticksPerLevelCurve,
} from './exp';

// ---- gear (balance-model section 5) ----
export { bossGearStat, gearStat, gearStatRaw, tierForLevel } from './gear';

// ---- survival time, pure part only (balance-model sections 3.3, 3.4) ----
export {
  expectedSurvival_min,
  hitChanceForTarget_pct,
  hitsToThreshold,
  hpLossPerHour_pct,
  potionCostPerHour_gold,
} from './survival';

// ---- drops (balance-model section 7) ----
export type {
  ChanceRarity,
  DropConfigInput,
  DropContext,
  DropParams,
  DropRates,
  Rarity,
} from './drops';
export {
  CHANCE_RARITIES,
  NEUTRAL_CONTEXT,
  RARITIES,
  dropParamsFromConfig,
  dropRates,
  failedRaidTerm,
  rangedTerm,
  stochasticRound,
} from './drops';

// ---- seeded PRNG + per-stream seed derivation (ADR 0003 section 6) ----
export type { Rng, StreamTag } from './rng';
export { deriveSeed, fnv1a32, mulberry32, streamRng, uniform } from './rng';
