// Evaluates a golden vector from its self-contained input (every parameter is in the input,
// nothing is read from config). input.fn names the function. Used by the vector generator and
// by tests; packages/shared ports must produce the same outputs.
import { characterStats } from './build';
import type { Allocation, GearLoadout } from './build';
import {
  baseCapStatus,
  bossGearStat,
  classChangeCost,
  damagePerHit,
  defReductionRatio,
  expMultiplier,
  expPerTick,
  expToNext,
  gearStat,
  memberP,
  monsterAtk,
  roleBuffPct,
  roleP,
  ticksBetween,
  ticksPerLevel,
  ticksPerLevelCurve,
  tierForLevel,
  zoneLevel,
} from './formulas';
import type {
  ExpParams,
  GearParams,
  MonsterParams,
  SlotName,
  SlotShare,
  StatParams,
} from './params';
import { evaluateEconomyVector } from './vector-eval-economy';
import {
  expectedSurvival_min,
  hitsToThreshold,
  hpLossPerHour_pct,
  potionCostPerHour_gold,
} from './survival';

export type VectorInput = Record<string, unknown>;
export type VectorOutput = number | string | null | Record<string, number>;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

function n(input: VectorInput, key: string): number {
  const v = input[key];
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number`);
  return v;
}
function nOrNull(input: VectorInput, key: string): number | null {
  const v = input[key];
  if (v === null) return null;
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number or null`);
  return v;
}
function obj(input: VectorInput, key: string): VectorInput {
  const v = input[key];
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new Error(`vector input "${key}" must be an object`);
  return v as VectorInput;
}
function arr(input: VectorInput, key: string): number[] {
  const v = input[key];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'number'))
    throw new Error(`vector input "${key}" must be a number array`);
  return v as number[];
}

function expParams(i: VectorInput): ExpParams {
  return {
    expToNextCoef: n(i, 'expToNextCoef'),
    expToNextExponent: n(i, 'expToNextExponent'),
    expPerTickCoef: n(i, 'expPerTickCoef'),
    expPerTickExponent: n(i, 'expPerTickExponent'),
    startLevel: n(i, 'startLevel'),
    maxLevel: n(i, 'maxLevel'),
  };
}
function gearParams(i: VectorInput): GearParams {
  return {
    gearStatCoef: n(i, 'gearStatCoef'),
    gearStatTierExponent: n(i, 'gearStatTierExponent'),
    enhanceBonusPerLevel: n(i, 'enhanceBonusPerLevel'),
    minTier: n(i, 'minTier'),
    maxTier: n(i, 'maxTier'),
    bossBaseStatMult: typeof i['bossBaseStatMult'] === 'number' ? i['bossBaseStatMult'] : 1,
    bossTier: typeof i['bossTier'] === 'number' ? i['bossTier'] : n(i, 'maxTier'),
  };
}
function monsterParams(i: VectorInput): MonsterParams {
  return {
    monsterAtkCoef: n(i, 'monsterAtkCoef'),
    monsterAtkExponent: n(i, 'monsterAtkExponent'),
    defSoftcap: n(i, 'defSoftcap'),
    damageMultPerLevelBelowRange: n(i, 'damageMultPerLevelBelowRange'),
    monsterAtkMultAfterFailedRaid: n(i, 'monsterAtkMultAfterFailedRaid'),
    tankerMissingDebuffMult: n(i, 'tankerMissingDebuffMult'),
  };
}
function damageOf(i: VectorInput): number {
  return damagePerHit(
    {
      zoneLevel: n(i, 'zoneLevel'),
      def: n(i, 'def'),
      tankerBuff_pct: nOrNull(i, 'tankerBuff_pct'),
      levelsBelowRange: n(i, 'levelsBelowRange'),
      failedRaidWeek: i['failedRaidWeek'] === true,
    },
    monsterParams(i),
  );
}

/** Dispatches on input.fn. Returns null where the function is undefined (e.g. expToNext(60)). */
export function evaluateVector(input: VectorInput): VectorOutput {
  const fn = input['fn'];
  switch (fn) {
    // ---- buff-stacking.json ----
    case 'memberP':
      return memberP(
        n(input, 'level'),
        { pPerMemberBase: n(input, 'pPerMemberBase'), pLevelDivisor: n(input, 'pLevelDivisor') },
        n(input, 'levelsOutsideRange'),
        {
          pMultPerLevelOutsideRange: n(input, 'pMultPerLevelOutsideRange'),
          pMultFloor: n(input, 'pMultFloor'),
        },
      );
    case 'roleBuff': {
      const p = roleP(arr(input, 'memberLevels'), {
        pPerMemberBase: n(input, 'pPerMemberBase'),
        pLevelDivisor: n(input, 'pLevelDivisor'),
      });
      return roleBuffPct({ base_pct: n(input, 'base_pct'), cap_pct: n(input, 'cap_pct') }, p);
    }
    case 'baseCapRule': {
      const exceptions = input['intentionalExceptions'];
      if (!Array.isArray(exceptions)) throw new Error('intentionalExceptions must be an array');
      return baseCapStatus(
        String(input['role']),
        { base_pct: n(input, 'base_pct'), cap_pct: n(input, 'cap_pct') },
        {
          minBaseToCapRatio: n(input, 'minBaseToCapRatio'),
          maxBaseToCapRatio: n(input, 'maxBaseToCapRatio'),
          intentionalExceptions: exceptions.map(String),
        },
      );
    }
    // ---- class-change.json ----
    case 'classChangeCost':
      return classChangeCost(n(input, 'level'), {
        costCoef_gold: n(input, 'costCoef_gold'),
        costLevelDivisor: n(input, 'costLevelDivisor'),
        costExponent: n(input, 'costExponent'),
      });
    // ---- exp-curve.json ----
    case 'expToNext': {
      const p = expParams(input);
      const level = n(input, 'level');
      return level >= p.maxLevel ? null : expToNext(level, p);
    }
    case 'expPerTick':
      return expPerTick(n(input, 'zoneLevel'), expParams(input));
    case 'ticksPerLevel':
      return ticksPerLevel(
        n(input, 'level'),
        expParams(input),
        n(input, 'zoneLevel'),
        n(input, 'expMultiplier'),
      );
    case 'ticksPerLevelCurve':
      return ticksPerLevelCurve(n(input, 'level'), expParams(input));
    case 'walkMinutesPerLevelCurve':
      return (
        (ticksPerLevelCurve(n(input, 'level'), expParams(input)) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_MINUTE
      );
    case 'walkMinutesPerLevel':
      return (
        (ticksPerLevel(
          n(input, 'level'),
          expParams(input),
          n(input, 'zoneLevel'),
          n(input, 'expMultiplier'),
        ) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_MINUTE
      );
    case 'ticksBetween':
      return ticksBetween(
        n(input, 'fromLevel'),
        n(input, 'toLevel'),
        expParams(input),
        n(input, 'expMultiplier'),
      );
    case 'walkHoursBetween':
      return (
        (ticksBetween(
          n(input, 'fromLevel'),
          n(input, 'toLevel'),
          expParams(input),
          n(input, 'expMultiplier'),
        ) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_HOUR
      );
    case 'expMultiplier':
      return expMultiplier(nOrNull(input, 'magicBuff_pct'), n(input, 'levelsOutsideRange'), {
        magicBuffMaxMult: n(input, 'magicBuffMaxMult'),
        noMagicMult: n(input, 'noMagicMult'),
        levelGapMultPerLevel: n(input, 'levelGapMultPerLevel'),
        levelGapMultFloor: n(input, 'levelGapMultFloor'),
      });
    // ---- gear.json ----
    case 'gearStat':
      return gearStat(n(input, 'tier'), n(input, 'enhance'), gearParams(input));
    case 'bossGearStat':
      return bossGearStat(n(input, 'enhance'), gearParams(input));
    case 'tierForLevel':
      return tierForLevel(n(input, 'level'), arr(input, 'levelMaxForTier'));
    case 'characterStats': {
      const base = obj(input, 'baseStats');
      const per = obj(input, 'statPerPoint');
      const stats: StatParams = {
        pointsPerLevel: n(input, 'pointsPerLevel'),
        base: { atk: n(base, 'atk'), def: n(base, 'def'), hp: n(base, 'hp'), vit: n(base, 'vit') },
        perPoint: { atk: n(per, 'atk'), def: n(per, 'def'), hp: n(per, 'hp') },
        vitHpRegenSpeed_pct: 0,
        vitPotionEfficiency_pct: 0,
      };
      const slotsIn = obj(input, 'slots');
      const slots = {} as Record<SlotName, SlotShare>;
      for (const name of ['weapon', 'armor', 'charm', 'boots'] as const) {
        const s = obj(slotsIn, name);
        slots[name] = {
          atkShare: n(s, 'atkShare'),
          defShare: n(s, 'defShare'),
          vitPointsPerGearStat: n(s, 'vitPointsPerGearStat'),
        };
      }
      const r = characterStats(
        n(input, 'level'),
        obj(input, 'allocation') as unknown as Allocation,
        obj(input, 'gear') as unknown as GearLoadout,
        stats,
        slots,
        n(input, 'defSoftcap'),
      );
      return { atk: r.atk, def: r.def, hp: r.hp, vit: r.vit, defReduction_pct: r.defReduction_pct };
    }
    // ---- damage.json ----
    case 'zoneLevel':
      return zoneLevel(n(input, 'rangeMin'), n(input, 'rangeMax'));
    case 'monsterAtk':
      return monsterAtk(n(input, 'zoneLevel'), {
        monsterAtkCoef: n(input, 'monsterAtkCoef'),
        monsterAtkExponent: n(input, 'monsterAtkExponent'),
      });
    case 'defReduction_pct':
      return defReductionRatio(n(input, 'def'), n(input, 'defSoftcap')) * 100;
    case 'damagePerHit':
      return damageOf(input);
    case 'hitsToThreshold':
      return hitsToThreshold(n(input, 'maxHp'), n(input, 'damage'), n(input, 'threshold_pct'));
    case 'expectedSurvival_min':
      return expectedSurvival_min(
        n(input, 'hits'),
        n(input, 'hitChance_pct'),
        n(input, 'meanInterval_s'),
      );
    case 'survivalMinutes': {
      const hits = hitsToThreshold(n(input, 'maxHp'), damageOf(input), n(input, 'stopAt_pct'));
      const interval = (n(input, 'intervalMin_s') + n(input, 'intervalMax_s')) / 2;
      return expectedSurvival_min(hits, n(input, 'hitChance_pct'), interval);
    }
    case 'hpLossPerHour_pct':
      return hpLossPerHour_pct(
        n(input, 'damage'),
        n(input, 'maxHp'),
        n(input, 'hitChance_pct'),
        n(input, 'meanInterval_s'),
      );
    case 'potionCostPerHour_gold':
      return potionCostPerHour_gold(
        n(input, 'hpLoss_pctPerHour'),
        n(input, 'heal_pctMaxHp'),
        n(input, 'potionEfficiencyBonus_pct'),
        n(input, 'buyPrice_gold'),
      );
    default: {
      // drops.json, economy.json, party.json (P1-F03-T08)
      const out = evaluateEconomyVector(input);
      if (out === undefined) throw new Error(`unknown vector fn: ${String(fn)}`);
      return out;
    }
  }
}
