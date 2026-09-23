// Economy and party model (balance-model sections 2.4, 3.4, 8; P1-F03-T08).
// Income from the drop model, potion cost from the T07 damage model (never from the GDD 600),
// party per-head reward. Scenario choices (which party, which potion) are simulator assumptions
// documented in tools/sim/README.md, not balance values.
import type { DropContext, DropParams } from './drops';
import { NEUTRAL_CONTEXT, incomePerHourCtx_gold, rangedTerm } from './drops';
import { expMultiplier, memberP, roleBuffPct } from './formulas';
import type { Role, SimParams } from './params';
import { ROLES } from './params';
import type { Rng } from './rng';
import type { TankerCase } from './scenarios';
import { meanInterval_s, potionEfficiency_pct, runSetup, survivalRow } from './scenarios';
import { hpLossPerHour_pct, potionCostMonteCarlo, potionCostPerHour_gold } from './survival';

const SECONDS_PER_HOUR = 3600;
const MINUTES_PER_HOUR = 60;

/** Levels of the members of each role inside the dungeon (the player is one of them). */
export interface PartySpec {
  label: string;
  members: Record<Role, number[]>;
}

export function emptyMembers(): Record<Role, number[]> {
  return { tanker: [], ranged: [], support: [], magic: [] };
}

export function soloSpec(role: Role, level: number): PartySpec {
  const members = emptyMembers();
  members[role] = [level];
  return { label: `solo ${role}`, members };
}

/** Party with `perRole` members of every role, all at `level`. */
export function fullPartySpec(level: number, perRole = 1): PartySpec {
  const members = emptyMembers();
  for (const r of ROLES) members[r] = Array.from({ length: perRole }, () => level);
  return { label: `full party ${perRole * ROLES.length} (L${level})`, members };
}

/** Full party minus some roles. */
export function partyWithout(level: number, missing: Role[]): PartySpec {
  const s = fullPartySpec(level);
  for (const r of missing) s.members[r] = [];
  return { label: `party without ${missing.join('+')} (L${level})`, members: s.members };
}

/** Role buff (%) from the members inside, null when the role is missing. */
export function buffOrNull(levels: number[], role: Role, p: SimParams): number | null {
  if (levels.length === 0) return null;
  return roleBuffPct(
    p.roles[role],
    levels.reduce((s, l) => s + memberP(l, p.buff), 0),
  );
}

export interface PartyEffects {
  tankerCase: TankerCase;
  supportLevels: number[] | undefined;
  magicLevels: number[] | undefined;
  rangedBuff_pct: number | null;
  magicBuff_pct: number | null;
  dropMult: number;
  expMult: number;
}

export function partyEffects(spec: PartySpec, p: SimParams, dp: DropParams): PartyEffects {
  const m = spec.members;
  const rangedBuff_pct = buffOrNull(m.ranged, 'ranged', p);
  const magicBuff_pct = buffOrNull(m.magic, 'magic', p);
  return {
    tankerCase: m.tanker.length > 0 ? { kind: 'tanker', levels: m.tanker } : { kind: 'noTanker' },
    supportLevels: m.support.length > 0 ? m.support : undefined,
    magicLevels: m.magic.length > 0 ? m.magic : undefined,
    rangedBuff_pct,
    magicBuff_pct,
    dropMult: rangedTerm(rangedBuff_pct, dp),
    expMult: expMultiplier(magicBuff_pct, 0, p.expMult),
  };
}

export function dropContextFor(spec: PartySpec, p: SimParams, _dp?: DropParams): DropContext {
  return { ...NEUTRAL_CONTEXT, rangedBuff_pct: buffOrNull(spec.members.ranged, 'ranged', p) };
}

/**
 * Expected HP loss per hour after in-dungeon heal and the Magic shield, % max HP.
 * Heal is assumed never wasted and the shield fully used each tick when damage per tick
 * exceeds it (analytic approximation; the Monte Carlo engine checks it).
 */
export function netHpLossPerHour_pct(
  grossLoss_pctPerHour: number,
  heal_pctMaxHpPerMin: number,
  shield_pctMaxHpPerTick: number,
  ticksPerHour: number,
): number {
  const lossPerTick = grossLoss_pctPerHour / ticksPerHour;
  const shieldUsed = Math.min(shield_pctMaxHpPerTick, lossPerTick) * ticksPerHour;
  return Math.max(0, grossLoss_pctPerHour - heal_pctMaxHpPerMin * MINUTES_PER_HOUR - shieldUsed);
}

export type RatioStatus = 'IN TARGET' | 'ACCEPTED (D-005)' | 'BELOW RANGE' | 'ABOVE RANGE';

/** Income-to-potion ratio against economy.incomeToPotionRatio (D-005). */
export function ratioStatus(
  ratio: number,
  t: { ratioTargetMin: number; ratioTargetMax: number; ratioMinAccepted: number },
): RatioStatus {
  if (ratio >= t.ratioTargetMin && ratio <= t.ratioTargetMax) return 'IN TARGET';
  if (ratio >= t.ratioMinAccepted && ratio < t.ratioTargetMin) return 'ACCEPTED (D-005)';
  return ratio < t.ratioMinAccepted ? 'BELOW RANGE' : 'ABOVE RANGE';
}

export interface EconomyRow {
  label: string;
  level: number;
  potion: string;
  withVit: boolean;
  income_gold: number;
  dropMult: number;
  expMult: number;
  damage: number;
  grossLoss_pctPerHour: number;
  netLoss_pctPerHour: number;
  potionEfficiency_pct: number;
  /** Analytic potion cost from the net HP loss. */
  potionGold: number;
  /** Monte Carlo potion cost (auto-potion at the config threshold), null when not run. */
  potionGoldMc: number | null;
  ratio: number;
  ratioMc: number | null;
}

/** What the damage and drop models need to know about the player's situation. */
export interface EconomySituation {
  label: string;
  tankerCase: TankerCase;
  supportLevels: number[] | undefined;
  magicLevels: number[] | undefined;
  drop: DropContext;
  dropMult: number;
  expMult: number;
}

export function situationOf(spec: PartySpec, p: SimParams, dp: DropParams): EconomySituation {
  const fx = partyEffects(spec, p, dp);
  return {
    label: spec.label,
    tankerCase: fx.tankerCase,
    supportLevels: fx.supportLevels,
    magicLevels: fx.magicLevels,
    drop: dropContextFor(spec, p, dp),
    dropMult: fx.dropMult,
    expMult: fx.expMult,
  };
}

/** The GDD reference: damage x1.0 (D-020), drop x1.0, no heal, no shield. */
export const REFERENCE_SITUATION: EconomySituation = {
  label: 'x1.0 reference (GDD numbers)',
  tankerCase: { kind: 'reference' },
  supportLevels: undefined,
  magicLevels: undefined,
  drop: NEUTRAL_CONTEXT,
  dropMult: 1,
  expMult: 1,
};

/**
 * One player at level L (Z = L, balanced build) walking a full hour with every reward tick
 * passing the movement gate, auto-potion using one potion type only.
 */
export function economyRow(
  spec: PartySpec | EconomySituation,
  level: number,
  potion: string,
  withVit: boolean,
  p: SimParams,
  dp: DropParams,
  mc: { hours: number; rng: Rng } | null = null,
): EconomyRow {
  const fx = 'members' in spec ? situationOf(spec, p, dp) : spec;
  const pot = p.potions[potion];
  if (pot === undefined) throw new Error(`unknown potion ${potion}`);
  const row = survivalRow(level, fx.tankerCase, p);
  const setup = runSetup(level, fx.tankerCase, p, {
    stopAt_pct: 0,
    ...(fx.supportLevels ? { supportLevels: fx.supportLevels } : {}),
    ...(fx.magicLevels ? { magicLevels: fx.magicLevels } : {}),
    maxDuration_s: SECONDS_PER_HOUR,
  });
  const gross = hpLossPerHour_pct(
    row.damage,
    row.build.hp,
    p.attack.hitChancePerCheck_pct,
    meanInterval_s(p),
  );
  const ticksHour = SECONDS_PER_HOUR / p.healShield.rewardTickInterval_s;
  const net = netHpLossPerHour_pct(
    gross,
    setup.heal_pctMaxHpPerMin,
    setup.shield_pctMaxHp,
    ticksHour,
  );
  const eff = withVit ? potionEfficiency_pct(row.build.vit, p) : 0;
  const potionGold = potionCostPerHour_gold(net, pot.heal_pctMaxHp, eff, pot.buyPrice_gold);
  const income = incomePerHourCtx_gold(fx.drop, dp);
  const potionGoldMc =
    mc === null
      ? null
      : potionCostMonteCarlo(
          {
            ...setup,
            potion: {
              threshold_pct: p.safety.autoPotionThreshold_pct,
              heal_pctMaxHp: pot.heal_pctMaxHp * (1 + eff / 100),
              buyPrice_gold: pot.buyPrice_gold,
            },
          },
          mc.hours,
          mc.rng,
        ).goldPerHour;
  const ratioOf = (gold: number) => (gold > 0 ? income / gold : Number.POSITIVE_INFINITY);
  return {
    label: fx.label,
    level,
    potion,
    withVit,
    income_gold: income,
    dropMult: fx.dropMult,
    expMult: fx.expMult,
    damage: row.damage,
    grossLoss_pctPerHour: gross,
    netLoss_pctPerHour: net,
    potionEfficiency_pct: eff,
    potionGold,
    potionGoldMc,
    ratio: ratioOf(potionGold),
    ratioMc: potionGoldMc === null ? null : ratioOf(potionGoldMc),
  };
}

export interface PartyRewardRatio {
  party: string;
  solo: string;
  drop: number;
  exp: number;
  /** Mean of the drop and exp ratios (both are "reward" in the GDD sense). */
  reward: number;
}

/** Per-head reward of a party member relative to a solo player (drop value and exp rate). */
export function partyRewardRatio(
  party: PartySpec,
  solo: PartySpec,
  p: SimParams,
  dp: DropParams,
): PartyRewardRatio {
  const a = partyEffects(party, p, dp);
  const b = partyEffects(solo, p, dp);
  const drop =
    incomePerHourCtx_gold(dropContextFor(party, p, dp), dp) /
    incomePerHourCtx_gold(dropContextFor(solo, p, dp), dp);
  const exp = a.expMult / b.expMult;
  return { party: party.label, solo: solo.label, drop, exp, reward: (drop + exp) / 2 };
}
