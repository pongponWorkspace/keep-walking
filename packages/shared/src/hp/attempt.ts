// The hit clock and one monster attempt (tech note F06 sections 3.2-3.5, ADR 0003 6.4). No PRNG
// state ever lives in `RunHpState` (ADR 0003 6.2): `hitAttempt` re-derives both draws of attempt
// `index` from `streamRng(runSeed, 'hit', index)` every time it is needed, so a tick that fails
// the movement gate, or one extra hit, never shifts the sequence any other hit sees.
import { MS_PER_S } from '@keep-walking/geo';
import { damagePerHit, streamRng, uniform, zoneLevel } from '../formulas';
import type { HpParams } from './params';
import { resolveHit } from './hit';
import type { HitPotion, HitResult } from './hit';
import { ownBuffPct } from './stats';
import type { PlayerClass, PotionSource, RunClock, RunHpState } from './types';

/** One attempt's draws (ADR 0003 6.4): draw 1 = interval, draw 2 = hit/miss. Same fn every caller
 * (the harness in `../formulas/vectors.test.ts`, `runHpInit`, `applyAttempt`) uses, so the
 * sequence is identical everywhere it is read. */
export function hitAttempt(
  runSeed: number,
  index: number,
  p: Pick<HpParams, 'attack'>,
): { readonly interval_s: number; readonly hit: boolean } {
  const rng = streamRng(runSeed, 'hit', index);
  const interval_s = uniform(rng, p.attack.intervalMin_s, p.attack.intervalMax_s);
  return { interval_s, hit: rng() < p.attack.hitChancePerCheck_pct / 100 };
}

export interface HitDamageContext {
  readonly level: number;
  readonly classId: PlayerClass;
  readonly def: number;
  readonly levelRange: { readonly min: number; readonly max: number };
}

/** Damage of one landed hit for a solo player (F06 R08-R09, R31): Tanker's own buff reduces it,
 * every other class takes the missing-Tanker multiplier; Z = clamp(level, range) and the gap
 * below the range counts once from `levelRange.min` (D-112). */
export function soloHitDamage(ctx: HitDamageContext, p: HpParams): number {
  const tankerBuff_pct = ownBuffPct('tanker', ctx.classId, ctx.level, p);
  return damagePerHit(
    {
      zoneLevel: zoneLevel(ctx.level, ctx.levelRange.min, ctx.levelRange.max),
      def: ctx.def,
      tankerBuff_pct,
      levelsBelowRange: Math.max(0, ctx.levelRange.min - ctx.level),
      failedRaidWeek: false,
    },
    p.monster,
  );
}

/** `confirm` (tech note F06 3.2): `hpAtEntry` is the player's HP at `startedAt_ms` (no top-up,
 * R02); `nextAttemptTau_ms` = tau_0 = interval_0 x 1000. */
export function runHpInit(hpAtEntry: number, runSeed: number, p: HpParams): RunHpState {
  const first = hitAttempt(runSeed, 0, p);
  return {
    hp: hpAtEntry,
    shield: 0,
    healedThroughTau_ms: 0,
    nextAttemptIndex: 0,
    nextAttemptTau_ms: first.interval_s * MS_PER_S,
    attempts: 0,
    hitsLanded: 0,
    potionsUsed: { runBag: 0, inventory: 0 },
    lowHpWarnings: 0,
  };
}

/** Real time of the next attempt while the hit clock is running (tech note F06 3.2-3.3): `null`
 * when the clock is stopped (Grace, Suspended, speed lock, before confirm) or the attempt would
 * fall at/after `H_ms` (judged only once its real time is `< H`, never revisited). */
export function nextAttemptDue(
  hp: RunHpState,
  clock: RunClock,
  H_ms: number,
): { readonly at_ms: number; readonly tau_ms: number } | null {
  if (clock.runningSince_ms === null) return null;
  const at_ms = clock.runningSince_ms + (hp.nextAttemptTau_ms - clock.closedSum_ms);
  if (!(at_ms < H_ms)) return null;
  return { at_ms, tau_ms: hp.nextAttemptTau_ms };
}

export interface AttemptContext {
  readonly runSeed: number;
  readonly level: number;
  readonly classId: PlayerClass;
  readonly def: number;
  readonly vit: number;
  readonly maxHp: number;
  readonly levelRange: { readonly min: number; readonly max: number };
  readonly autoRetreatEnabled: boolean;
  /** Run bag contents (F06 R12: drunk before `inventory`); `hp` never writes either of these — it
   * only reports which one `resolveHit` chose (`AttemptResult.potion`) for `session` to debit. */
  readonly bag: Readonly<Record<string, number>>;
  readonly inventory: Readonly<Record<string, number>>;
}

export interface AttemptResult {
  readonly landed: boolean;
  readonly damage: number;
  readonly hit: HitResult | null;
  readonly potion: { readonly source: PotionSource; readonly itemId: string } | null;
}

const POTION_ID_SEPARATOR = ':';

function potionList(ctx: AttemptContext, p: HpParams): HitPotion[] {
  const out: HitPotion[] = [];
  for (const source of p.safety.sourceOrder) {
    const store = source === 'runBag' ? ctx.bag : ctx.inventory;
    for (const itemId of p.safety.potionOrder) {
      const heal_pctMaxHp = p.potions[itemId]?.heal_pctMaxHp;
      if (heal_pctMaxHp === undefined) {
        throw new RangeError(
          `hp: no heal_pctMaxHp for potion "${itemId}" (autoPotion.defaultPotionOrder)`,
        );
      }
      out.push({
        id: `${source}${POTION_ID_SEPARATOR}${itemId}`,
        heal_pctMaxHp,
        count: store[itemId] ?? 0,
      });
    }
  }
  return out;
}

/** Judges attempt `hp.nextAttemptIndex` and advances the clock to the next one (tech note F06 3.5,
 * R-B1). The caller must have already healed the Support through `tau_i` (`supportHealThrough`,
 * section 3.6) so `hp.hp` here is the HP the hit actually lands on. */
export function applyAttempt(
  hp: RunHpState,
  ctx: AttemptContext,
  p: HpParams,
): { readonly hp: RunHpState; readonly result: AttemptResult } {
  const i = hp.nextAttemptIndex;
  const { hit } = hitAttempt(ctx.runSeed, i, p);
  const nextDraw = hitAttempt(ctx.runSeed, i + 1, p);
  const advanced: RunHpState = {
    ...hp,
    attempts: hp.attempts + 1,
    nextAttemptIndex: i + 1,
    nextAttemptTau_ms: hp.nextAttemptTau_ms + nextDraw.interval_s * MS_PER_S,
  };
  if (!hit) {
    return { hp: advanced, result: { landed: false, damage: 0, hit: null, potion: null } };
  }
  const damage = soloHitDamage(
    { level: ctx.level, classId: ctx.classId, def: ctx.def, levelRange: ctx.levelRange },
    p,
  );
  const r = resolveHit({
    hp: hp.hp,
    maxHp: ctx.maxHp,
    shield: hp.shield,
    damage,
    autoRetreatEnabled: ctx.autoRetreatEnabled,
    autoRetreatThreshold_pct: p.safety.autoRetreatThreshold_pct,
    lowHpWarningThreshold_pct: p.safety.lowHpWarningThreshold_pct,
    autoPotionEnabled: p.safety.autoPotionEnabled,
    autoPotionThreshold_pct: p.safety.autoPotionThreshold_pct,
    potionEfficiencyBonus_pct: p.player.statPerPoint.vitPotionEfficiency_pct * ctx.vit,
    potions: potionList(ctx, p),
  });
  let potion: AttemptResult['potion'] = null;
  let potionsUsed = hp.potionsUsed;
  if (r.potionUsed !== null) {
    const sep = r.potionUsed.indexOf(POTION_ID_SEPARATOR);
    const source = r.potionUsed.slice(0, sep) as PotionSource;
    const itemId = r.potionUsed.slice(sep + 1);
    potion = { source, itemId };
    potionsUsed = { ...hp.potionsUsed, [source]: hp.potionsUsed[source] + 1 };
  }
  return {
    hp: {
      ...advanced,
      hp: r.hpAfter,
      shield: r.shieldAfter,
      hitsLanded: hp.hitsLanded + 1,
      lowHpWarnings: hp.lowHpWarnings + (r.lowHpWarning ? 1 : 0),
      potionsUsed,
    },
    result: { landed: true, damage, hit: r, potion },
  };
}
