// One Phase 2 run, deterministic from runSeed (P2-F05-T01): reward ticks, drops, exp, monster
// attempts, auto-potion, Magic shield, Support heal, auto-retreat and death, in the order of spec
// F05 R10-R21 / R-B1 and F06 R06-R31, with the RNG contract of ADR 0003 6 (stream "drop" per
// granted tick, stream "hit" per attempt). The run is Active the whole time (no Grace/Suspended,
// no speed lock): active time tau = run time. Reference for packages/shared hp/reward/session
// (P2-F05-T08, P2-F06-T06); vectors in design/systems/test-vectors/run-loop.json.
import type {
  BuffParams,
  ExpMultParams,
  ExpParams,
  MonsterParams,
} from '@keep-walking/shared/formulas';
import {
  damagePerHit,
  expMultiplier,
  expPerTick,
  expToNext,
  memberP,
  roleBuffPct,
  streamRng,
  uniform,
  zoneLevel,
} from '@keep-walking/shared/formulas';
import { resolveHit } from './hit';
import type { HitPotion } from './hit';
import type { LootRarity } from './rng-contract';
import { rollTickLoot } from './rng-contract';

export type OwnClass = 'tanker' | 'ranged' | 'support' | 'magic';
type RoleBaseCap = { base_pct: number; cap_pct: number };

export interface LoopParams {
  window_s: number;
  intervalMin_s: number;
  intervalMax_s: number;
  hitChance_pct: number;
  monster: MonsterParams;
  buff: BuffParams;
  roles: { tanker: RoleBaseCap; support: RoleBaseCap; magic: RoleBaseCap };
  supportHealBase_pctMaxHpPerMin: number;
  magicShieldPerTick_pctMaxHpPerBuffPct: number;
  exp: ExpParams;
  expMult: ExpMultParams;
  autoRetreatThreshold_pct: number;
  lowHpWarningThreshold_pct: number;
  autoPotionEnabled: boolean;
  autoPotionThreshold_pct: number;
  vitPotionEfficiency_pct: number;
  /** economy.potions.<id>.heal_pctMaxHp for the auto-potion ids. */
  potionHeal_pct: Record<string, number>;
  potionOrder: string[];
  /** economy.autoPotion.sourceOrder: "runBag" then "inventory". */
  sourceOrder: string[];
}

export interface LoopInput {
  runSeed: number;
  /** Active seconds after which the player leaves by hand (manual_exit) if nothing ended the run. */
  limit_s: number;
  /** Reward windows k (0-based) that fail the movement gate; every other window passes. */
  failedTicks: number[];
  ownClass: OwnClass;
  level: number;
  /** Exp already into the current level. */
  exp: number;
  maxHp: number;
  hp: number;
  def: number;
  vit: number;
  rangeMin: number;
  rangeMax: number;
  autoRetreatEnabled: boolean;
  /** Potions carried in from the inventory (not run loot, F05 R20). */
  inventory: Record<string, number>;
  table: LootRarity[];
  params: LoopParams;
  recordEvents: boolean;
}

export type LoopEvent =
  | {
      t_s: number;
      type: 'tick';
      k: number;
      granted: boolean;
      exp: number;
      level: number;
      shield: number;
      loot: string;
    }
  | {
      t_s: number;
      type: 'attempt';
      i: number;
      landed: boolean;
      damage: number;
      hpAfter: number;
      shieldAfter: number;
      potion: string | null;
      warning: boolean;
      outcome: string;
    };

export interface LoopResult {
  exitReason: 'auto_retreat' | 'death' | 'manual_exit';
  end_s: number;
  ticksEvaluated: number;
  ticksGranted: number;
  attempts: number;
  hitsLanded: number;
  potionsFromRunBag: number;
  potionsFromInventory: number;
  /** Active time of the first hpSmall-type drop (first potion of the auto order), null = none. */
  firstPotionDrop_s: number | null;
  lowHpWarnings: number;
  hpEnd: number;
  levelEnd: number;
  expEnd: number;
  expGained: number;
  /** Unused run-bag items at the end (run loot). */
  runBag: Record<string, number>;
  /** Moved to the inventory (all run loot unless death). */
  kept: Record<string, number>;
  /** Lost on death (F05 R21). */
  lost: Record<string, number>;
  inventoryEnd: Record<string, number>;
  events: LoopEvent[] | null;
}

const SECONDS_PER_MINUTE = 60;
const SOURCE_SEPARATOR = ':';

/** Own buff of a solo player (D-039): P = pPerMemberBase + level / pLevelDivisor. */
export function soloBuffPct(role: RoleBaseCap, level: number, buff: BuffParams): number {
  return roleBuffPct(role, memberP(level, buff));
}

/** Damage of one landed hit for a solo player (F06 R08-R09, R31): Tanker own buff, else x1.6. */
export function soloDamage(
  level: number,
  ownClass: OwnClass,
  rangeMin: number,
  rangeMax: number,
  def: number,
  p: Pick<LoopParams, 'monster' | 'roles' | 'buff'>,
): number {
  const tanker = ownClass === 'tanker' ? soloBuffPct(p.roles.tanker, level, p.buff) : null;
  return damagePerHit(
    {
      zoneLevel: zoneLevel(rangeMin, rangeMax),
      def,
      tankerBuff_pct: tanker,
      levelsBelowRange: Math.max(0, rangeMin - level),
      failedRaidWeek: false,
    },
    p.monster,
  );
}

/** Exp of one granted tick (F05 R11, balance-model 17): unrounded, scaled by f (D-059). */
export function soloTickExp(
  level: number,
  ownClass: OwnClass,
  rangeMin: number,
  rangeMax: number,
  f: number,
  p: Pick<LoopParams, 'exp' | 'expMult' | 'roles' | 'buff'>,
): number {
  const magic = ownClass === 'magic' ? soloBuffPct(p.roles.magic, level, p.buff) : null;
  const gap = Math.max(0, rangeMin - level, level - rangeMax);
  return (
    expPerTick(zoneLevel(rangeMin, rangeMax), p.exp) * expMultiplier(magic, gap, p.expMult) * f
  );
}

/** Adds exp and applies level-ups at once (may chain). At max level nothing is added. */
export function addExp(
  level: number,
  exp: number,
  gained: number,
  p: ExpParams,
): { level: number; exp: number } {
  if (level >= p.maxLevel) return { level, exp: 0 };
  let l = level;
  let e = exp + gained;
  while (l < p.maxLevel && e >= expToNext(l, p)) {
    e -= expToNext(l, p);
    l += 1;
  }
  return { level: l, exp: l >= p.maxLevel ? 0 : e };
}

/** One monster attempt (ADR 0003 6.4): draw 1 interval, draw 2 hit, from stream "hit" index i. */
export function hitAttempt(
  runSeed: number,
  index: number,
  p: Pick<LoopParams, 'intervalMin_s' | 'intervalMax_s' | 'hitChance_pct'>,
): { interval_s: number; hit: boolean } {
  const rng = streamRng(runSeed, 'hit', index);
  const interval_s = uniform(rng, p.intervalMin_s, p.intervalMax_s);
  return { interval_s, hit: rng() < p.hitChance_pct / 100 };
}

function add(bag: Record<string, number>, id: string, qty: number): void {
  bag[id] = (bag[id] ?? 0) + qty;
}

function potionList(
  bag: Record<string, number>,
  inv: Record<string, number>,
  p: LoopParams,
): HitPotion[] {
  const out: HitPotion[] = [];
  for (const source of p.sourceOrder) {
    const store = source === 'runBag' ? bag : inv;
    for (const id of p.potionOrder) {
      const heal = p.potionHeal_pct[id];
      if (heal === undefined) throw new Error(`no heal_pctMaxHp for potion ${id}`);
      out.push({
        id: `${source}${SOURCE_SEPARATOR}${id}`,
        heal_pctMaxHp: heal,
        count: store[id] ?? 0,
      });
    }
  }
  return out;
}

/** Runs one Phase 2 run to its end (see file header). Pure: same input, same result. */
export function runLoop(input: LoopInput): LoopResult {
  const p = input.params;
  const events: LoopEvent[] = [];
  const bag: Record<string, number> = {};
  const inv: Record<string, number> = { ...input.inventory };
  const failed = new Set(input.failedTicks);
  let hp = input.hp;
  let shield = 0;
  let level = input.level;
  let exp = input.exp;
  let expGained = 0;
  let t = 0;
  let k = 0;
  let granted = 0;
  let attempt = 0;
  let landedCount = 0;
  let fromBag = 0;
  let fromInv = 0;
  let warnings = 0;
  let firstPotion: number | null = null;
  let next = hitAttempt(input.runSeed, attempt, p);
  let attemptAt = next.interval_s;
  const healTo = (at: number) => {
    if (input.ownClass === 'support') {
      const buff = soloBuffPct(p.roles.support, level, p.buff);
      const perS =
        (input.maxHp * p.supportHealBase_pctMaxHpPerMin * (1 + buff / 100)) /
        100 /
        SECONDS_PER_MINUTE;
      hp = Math.min(input.maxHp, hp + perS * (at - t));
    }
    t = at;
  };
  let exitReason: LoopResult['exitReason'] = 'manual_exit';
  for (;;) {
    const tickAt = p.window_s * (k + 1);
    if (Math.min(tickAt, attemptAt) > input.limit_s) {
      healTo(input.limit_s);
      break;
    }
    if (tickAt <= attemptAt) {
      healTo(tickAt);
      const passed = !failed.has(k);
      let lootText = '';
      let gain = 0;
      if (passed) {
        const loot = rollTickLoot(input.runSeed, granted, input.table, 1);
        for (const it of loot.items) {
          add(bag, it.id, it.qty);
          if (firstPotion === null && p.potionOrder.includes(it.id)) firstPotion = tickAt;
        }
        lootText = loot.items.map((it) => `${it.id}${SOURCE_SEPARATOR}${it.qty}`).join(',');
        if (input.ownClass === 'magic') {
          const buff = soloBuffPct(p.roles.magic, level, p.buff);
          shield = (input.maxHp * p.magicShieldPerTick_pctMaxHpPerBuffPct * buff) / 100;
        }
        gain = soloTickExp(level, input.ownClass, input.rangeMin, input.rangeMax, 1, p);
        const before = level;
        const after = addExp(level, exp, gain, p.exp);
        if (before < p.exp.maxLevel) expGained += gain;
        level = after.level;
        exp = after.exp;
        granted += 1;
      }
      if (input.recordEvents)
        events.push({
          t_s: tickAt,
          type: 'tick',
          k,
          granted: passed,
          exp: gain,
          level,
          shield,
          loot: lootText,
        });
      k += 1;
      continue;
    }
    healTo(attemptAt);
    let damage = 0;
    let potion: string | null = null;
    let warning = false;
    let outcome = 'miss';
    if (next.hit) {
      landedCount += 1;
      damage = soloDamage(level, input.ownClass, input.rangeMin, input.rangeMax, input.def, p);
      const r = resolveHit({
        hp,
        maxHp: input.maxHp,
        shield,
        damage,
        autoRetreatEnabled: input.autoRetreatEnabled,
        autoRetreatThreshold_pct: p.autoRetreatThreshold_pct,
        lowHpWarningThreshold_pct: p.lowHpWarningThreshold_pct,
        autoPotionEnabled: p.autoPotionEnabled,
        autoPotionThreshold_pct: p.autoPotionThreshold_pct,
        potionEfficiencyBonus_pct: p.vitPotionEfficiency_pct * input.vit,
        potions: potionList(bag, inv, p),
      });
      shield = r.shieldAfter;
      hp = r.hpAfter;
      potion = r.potionUsed;
      warning = r.lowHpWarning;
      outcome = r.outcome;
      if (warning) warnings += 1;
      if (potion !== null) {
        const [source, id] = potion.split(SOURCE_SEPARATOR) as [string, string];
        if (source === 'runBag') {
          add(bag, id, -1);
          fromBag += 1;
        } else {
          add(inv, id, -1);
          fromInv += 1;
        }
      }
    }
    if (input.recordEvents)
      events.push({
        t_s: attemptAt,
        type: 'attempt',
        i: attempt,
        landed: next.hit,
        damage,
        hpAfter: hp,
        shieldAfter: shield,
        potion,
        warning,
        outcome,
      });
    if (outcome === 'autoRetreat' || outcome === 'died') {
      exitReason = outcome === 'died' ? 'death' : 'auto_retreat';
      break;
    }
    attempt += 1;
    next = hitAttempt(input.runSeed, attempt, p);
    attemptAt += next.interval_s;
  }
  const clean = (o: Record<string, number>) =>
    Object.fromEntries(Object.entries(o).filter(([, q]) => q > 0));
  const runBag = clean(bag);
  const kept = exitReason === 'death' ? {} : runBag;
  const inventoryEnd = { ...inv };
  for (const [id, q] of Object.entries(kept)) add(inventoryEnd, id, q);
  return {
    exitReason,
    end_s: t,
    ticksEvaluated: k,
    ticksGranted: granted,
    attempts: attempt + (exitReason === 'manual_exit' ? 0 : 1),
    hitsLanded: landedCount,
    potionsFromRunBag: fromBag,
    potionsFromInventory: fromInv,
    firstPotionDrop_s: firstPotion,
    lowHpWarnings: warnings,
    hpEnd: hp,
    levelEnd: level,
    expEnd: exp,
    expGained,
    runBag,
    kept,
    lost: exitReason === 'death' ? runBag : {},
    inventoryEnd: clean(inventoryEnd),
    events: input.recordEvents ? events : null,
  };
}
