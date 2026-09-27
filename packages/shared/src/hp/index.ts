// @keep-walking/shared/hp — the hit clock, damage, R-B1 (shield -> HP floor -> auto-potion ->
// auto-retreat -> low-HP warning), Support heal, the Magic shield, HP outside a run and the
// Recovering regen (tech note F06, ADR 0003 3.1). Consumed only by `session` (P2-F06-T06);
// apps/client must not import this subpath directly (ADR 0003 3.3, lint ADR 0003 8.2).
export type {
  PlayerClass,
  PlayerHpState,
  PotionRejectReason,
  PotionSource,
  RunClock,
  RunHpState,
} from './types';

export type { HpConfigInput, HpParams, HpRoleParams } from './params';
export { hpParamsFromConfig } from './params';

export type { HitInput, HitOutcome, HitPotion, HitResult } from './hit';
export { AUTO_RETREAT_HP_FLOOR, resolveHit } from './hit';

export { defOf, maxHpOf, ownBuffPct, vitOf } from './stats';

export type { AttemptContext, AttemptResult, HitDamageContext } from './attempt';
export { applyAttempt, hitAttempt, nextAttemptDue, runHpInit, soloHitDamage } from './attempt';

export type { HealContext, ShieldContext } from './heal';
export { onGrantedTick, supportHealThrough } from './heal';

export type { PotionUseContext, RegenContext, UsePotionResult } from './regen';
export { hpAt, recoveredAt_ms, recoveryLine, regenRatePerMs, usePotionOutsideRun } from './regen';
