// Evaluates drops.json / economy.json / party.json golden vectors from their self-contained
// input (P1-F03-T08). Called by vector-eval.ts for every input.fn it does not know.
import type { DropContext, DropParams, Rarity } from './drops';
import { RARITIES, dropRates, incomePerHourCtx_gold, meanDaysBetween } from './drops';
import type { PartySpec } from './economy';
import {
  buffOrNull,
  netHpLossPerHour_pct,
  partyEffects,
  partyRewardRatio,
  ratioStatus,
} from './economy';
import type { Role, RoleParams, SimParams } from './params';
import { ROLES } from './params';
import { hpLossPerHour_pct, potionCostPerHour_gold } from './survival';
import type { VectorInput, VectorOutput } from './vector-eval';

const SECONDS_PER_HOUR = 3600;

function n(i: VectorInput, key: string): number {
  const v = i[key];
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number`);
  return v;
}
function nOrNull(i: VectorInput, key: string): number | null {
  const v = i[key];
  if (v === null) return null;
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number or null`);
  return v;
}
function bool(i: VectorInput, key: string): boolean {
  const v = i[key];
  if (typeof v !== 'boolean') throw new Error(`vector input "${key}" must be a boolean`);
  return v;
}
function obj(i: VectorInput, key: string): VectorInput {
  const v = i[key];
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new Error(`vector input "${key}" must be an object`);
  return v as VectorInput;
}
function levels(i: VectorInput, key: string): number[] {
  const v = i[key];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'number'))
    throw new Error(`vector input "${key}" must be a number array`);
  return v as number[];
}

/** DropParams from a vector input (prices optional: missing or null = not sellable). */
export function dropParamsOf(i: VectorInput): DropParams {
  const chance = obj(i, 'baseChance_pct');
  const prices = typeof i['npcPrice_gold'] === 'object' ? obj(i, 'npcPrice_gold') : {};
  const npcPrice_gold = {} as Record<Rarity, number | null>;
  for (const r of RARITIES) {
    const v = prices[r];
    npcPrice_gold[r] = typeof v === 'number' ? v : null;
  }
  return {
    baseChance_pct: {
      uncommon: n(chance, 'uncommon'),
      rare: n(chance, 'rare'),
      epic: n(chance, 'epic'),
      legendary: n(chance, 'legendary'),
    },
    commonMin: n(i, 'commonMin'),
    commonMax: n(i, 'commonMax'),
    rangedBuffMaxMult: n(i, 'rangedBuffMaxMult'),
    noRangedMult: n(i, 'noRangedMult'),
    smallRareAndAboveMult: n(i, 'smallRareAndAboveMult'),
    smallCommonQtyMult: n(i, 'smallCommonQtyMult'),
    failedRaidWeekMinMult: n(i, 'failedRaidWeekMinMult'),
    failedRaidWeekMaxMult: n(i, 'failedRaidWeekMaxMult'),
    lowTrustMult: n(i, 'lowTrustMult'),
    lowTrustBlocksEpicAndAbove: bool(i, 'lowTrustBlocksEpicAndAbove'),
    npcPrice_gold,
    rewardTickInterval_s: n(i, 'rewardTickInterval_s'),
  };
}

export function dropContextOf(i: VectorInput): DropContext {
  return {
    rangedBuff_pct: nOrNull(i, 'rangedBuff_pct'),
    smallDungeon: bool(i, 'smallDungeon'),
    lowTrust: bool(i, 'lowTrust'),
    failedRaidBossHpLeft: nOrNull(i, 'failedRaidBossHpLeft'),
  };
}

function membersOf(i: VectorInput, key: string): Record<Role, number[]> {
  const m = obj(i, key);
  const out = {} as Record<Role, number[]>;
  for (const r of ROLES) out[r] = levels(m, r);
  return out;
}

/**
 * The slice of SimParams that the party formulas read (roles, buff stacking, exp multipliers,
 * heal and shield), built from the vector input. Other SimParams fields are not used.
 */
function partyParamsOf(i: VectorInput): SimParams {
  const rolesIn = obj(i, 'roles');
  const roles = {} as Record<Role, RoleParams>;
  for (const r of ROLES) {
    const ri = obj(rolesIn, r);
    roles[r] = {
      base_pct: n(ri, 'base_pct'),
      cap_pct: n(ri, 'cap_pct'),
      missingDebuffMult: n(ri, 'missingDebuffMult'),
    };
  }
  const partial: Pick<SimParams, 'roles' | 'buff' | 'expMult'> = {
    roles,
    buff: { pPerMemberBase: n(i, 'pPerMemberBase'), pLevelDivisor: n(i, 'pLevelDivisor') },
    expMult: {
      magicBuffMaxMult: n(i, 'magicBuffMaxMult'),
      noMagicMult: n(i, 'noMagicMult'),
      levelGapMultPerLevel: n(i, 'levelGapMultPerLevel'),
      levelGapMultFloor: n(i, 'levelGapMultFloor'),
    },
  };
  return partial as SimParams;
}

function spec(i: VectorInput, key: string): PartySpec {
  return { label: key, members: membersOf(i, key) };
}

/** Returns undefined for an fn this evaluator does not know. */
export function evaluateEconomyVector(input: VectorInput): VectorOutput | undefined {
  switch (input['fn']) {
    // ---- drops.json ----
    case 'dropRates': {
      const r = dropRates(dropContextOf(input), dropParamsOf(input));
      return { ...r };
    }
    case 'meanDaysBetween':
      if (n(input, 'chance_pct') <= 0) return null;
      return meanDaysBetween(n(input, 'chance_pct'), n(input, 'minutesPerDay'), {
        rewardTickInterval_s: n(input, 'rewardTickInterval_s'),
      } as DropParams);
    // ---- economy.json ----
    case 'incomePerHour_gold':
      return incomePerHourCtx_gold(dropContextOf(input), dropParamsOf(input));
    case 'netHpLossPerHour_pct':
      return netHpLossPerHour_pct(
        n(input, 'grossLoss_pctPerHour'),
        n(input, 'heal_pctMaxHpPerMin'),
        n(input, 'shield_pctMaxHpPerTick'),
        n(input, 'ticksPerHour'),
      );
    case 'potionCostNet_gold': {
      const interval = (n(input, 'intervalMin_s') + n(input, 'intervalMax_s')) / 2;
      const gross = hpLossPerHour_pct(
        n(input, 'damage'),
        n(input, 'maxHp'),
        n(input, 'hitChance_pct'),
        interval,
      );
      const net = netHpLossPerHour_pct(
        gross,
        n(input, 'heal_pctMaxHpPerMin'),
        n(input, 'shield_pctMaxHpPerTick'),
        SECONDS_PER_HOUR / n(input, 'rewardTickInterval_s'),
      );
      return potionCostPerHour_gold(
        net,
        n(input, 'potionHeal_pctMaxHp'),
        n(input, 'potionEfficiencyBonus_pct'),
        n(input, 'buyPrice_gold'),
      );
    }
    case 'incomeToPotionRatio':
      return n(input, 'income_gold') / n(input, 'potionCost_gold');
    case 'ratioStatus':
      return ratioStatus(n(input, 'ratio'), {
        ratioTargetMin: n(input, 'targetMin'),
        ratioTargetMax: n(input, 'targetMax'),
        ratioMinAccepted: n(input, 'minAccepted'),
      });
    // ---- party.json ----
    case 'partyEffects': {
      const p = partyParamsOf(input);
      const party = spec(input, 'members');
      const fx = partyEffects(party, p, dropParamsOf(input));
      const tankerBuff = buffOrNull(party.members.tanker, 'tanker', p);
      const supportBuff = buffOrNull(party.members.support, 'support', p);
      return {
        damageTakenMult:
          tankerBuff === null ? p.roles.tanker.missingDebuffMult : 1 - tankerBuff / 100,
        dropMult: fx.dropMult,
        expMult: fx.expMult,
        supportHeal_pctMaxHpPerMin:
          supportBuff === null
            ? 0
            : n(input, 'supportHealBase_pctMaxHpPerMin') * (1 + supportBuff / 100),
        magicShield_pctMaxHpPerTick:
          fx.magicBuff_pct === null
            ? 0
            : n(input, 'magicShieldPerTick_pctMaxHpPerBuffPct') * fx.magicBuff_pct,
      };
    }
    case 'partyPerHeadRatio': {
      const r = partyRewardRatio(
        spec(input, 'members'),
        spec(input, 'soloMembers'),
        partyParamsOf(input),
        dropParamsOf(input),
      );
      return { drop: r.drop, exp: r.exp, reward: r.reward };
    }
    default:
      return undefined;
  }
}
