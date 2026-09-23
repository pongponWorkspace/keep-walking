// Builds drops.json, economy.json and party.json golden vectors (P1-F03-T08).
// GDD targets come from config/balance (gddReferenceFrequency, gddReferenceEconomy, partyReward)
// and tolerances from tools/sim/gdd-reference.json.
// Literals (ADR 0001 section 3.5): config-dependent boundaries (role caps, party size, max level)
// come from SimParams (GDD targets from EconomyRefs); the only numbers written here are example inputs in CASE
// and unit constants.
import type { BalanceConfig } from './config';
import { num } from './config';
import type { DropContext, DropParams } from './drops';
import { NEUTRAL_CONTEXT } from './drops';
import type { PartySpec } from './economy';
import { buffOrNull, fullPartySpec, partyEffects, partyWithout, soloSpec } from './economy';
import type { GddReference } from './gdd';
import type { Role, SimParams } from './params';
import { ROLES } from './params';
import { runSetup, survivalRow } from './scenarios';
import { evaluateVector } from './vector-eval';
import type { VectorInput, VectorOutput } from './vector-eval';
import type { Vector, VectorFile } from './vectors';

export interface EconomyRefs {
  casualMinutesPerDay: number;
  casualEpicEvery_days: number;
  casualLegendaryEvery_days: number;
  heavyMinutesPerDay: number;
  heavyEpicEveryMin_days: number;
  heavyEpicEveryMax_days: number;
  heavyLegendaryEvery_days: number;
  income_gold: number;
  potion_gold: number;
  partyMin: number;
  partyMax: number;
}

export function economyRefsFromConfig(cfg: BalanceConfig): EconomyRefs {
  const f = (k: string) => num(cfg.drops, `gddReferenceFrequency.${k}`);
  return {
    casualMinutesPerDay: f('casualMinutesPerDay'),
    casualEpicEvery_days: f('casualEpicEvery_days'),
    casualLegendaryEvery_days: f('casualLegendaryEvery_days'),
    heavyMinutesPerDay: f('heavyMinutesPerDay'),
    heavyEpicEveryMin_days: f('heavyEpicEveryMin_days'),
    heavyEpicEveryMax_days: f('heavyEpicEveryMax_days'),
    heavyLegendaryEvery_days: f('heavyLegendaryEvery_days'),
    income_gold: num(cfg.economy, 'gddReferenceEconomy.incomePerWalkingHour_gold'),
    potion_gold: num(cfg.economy, 'gddReferenceEconomy.potionCostPerHour_gold'),
    partyMin: num(cfg.economy, 'partyReward.fullPartyPerHeadToSoloMin'),
    partyMax: num(cfg.economy, 'partyReward.fullPartyPerHeadToSoloMax'),
  };
}

export interface EconomyInputs {
  dp: DropParams;
  refs: EconomyRefs;
}

const SIM_TOLERANCE = 1e-6;
const SIM_DECIMALS = 6;
const DECIMAL_BASE = 10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const roundTo = (value: number, decimals: number) =>
  Math.round(value * DECIMAL_BASE ** decimals) / DECIMAL_BASE ** decimals;

/** Example inputs for golden vectors (not balance values). */
const CASE = {
  rangedBuffAboveCap_pct: 30,
  syntheticUncommon_pct: 80,
  ratioStepAbove: 0.01,
  ratioStepBelow: 0.001,
  printed: { grossLossDecimals: 1, healShieldDecimals: 2 },
  shieldAboveLoss: { gross: 10, heal: 0, shield: 5 },
  healAboveLoss: { gross: 20, heal: 1, shield: 0 },
  asymptoteMembersPerRole: 200,
} as const;
const SIM = 'sim run P1-F03-T08 (reference implementation tools/sim/src/drops.ts, economy.ts)';

function roundSim(value: VectorOutput): VectorOutput {
  const f = DECIMAL_BASE ** SIM_DECIMALS;
  if (typeof value === 'number') return Math.round(value * f) / f;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(value)) out[k] = Math.round(v * f) / f;
    return out;
  }
  return value;
}

function sim(input: VectorInput, note: string): Vector {
  const expected = roundSim(evaluateVector(input));
  const tolerance = typeof expected === 'string' || expected === null ? 0 : SIM_TOLERANCE;
  return { input, expected, tolerance, source: `${SIM} · ${note}` };
}

const TOLERANCE_DECIMALS = 9;

/** GDD vector; the tolerance is rounded so float noise (0.2000...07) does not reach the file. */
function gdd(
  input: VectorInput,
  expected: VectorOutput,
  tolerance: number,
  source: string,
): Vector {
  const f = DECIMAL_BASE ** TOLERANCE_DECIMALS;
  return { input, expected, tolerance: Math.round(tolerance * f) / f, source };
}

/** DropParams flattened into a vector input (null price = not sellable). */
export function dropIn(dp: DropParams): VectorInput {
  return {
    baseChance_pct: { ...dp.baseChance_pct },
    commonMin: dp.commonMin,
    commonMax: dp.commonMax,
    rangedBuffMaxMult: dp.rangedBuffMaxMult,
    noRangedMult: dp.noRangedMult,
    smallRareAndAboveMult: dp.smallRareAndAboveMult,
    smallCommonQtyMult: dp.smallCommonQtyMult,
    failedRaidWeekMinMult: dp.failedRaidWeekMinMult,
    failedRaidWeekMaxMult: dp.failedRaidWeekMaxMult,
    lowTrustMult: dp.lowTrustMult,
    lowTrustBlocksEpicAndAbove: dp.lowTrustBlocksEpicAndAbove,
    npcPrice_gold: { ...dp.npcPrice_gold },
    rewardTickInterval_s: dp.rewardTickInterval_s,
  };
}

const ctxIn = (c: DropContext): VectorInput => ({ ...c });
const ctx = (over: Partial<DropContext>): DropContext => ({ ...NEUTRAL_CONTEXT, ...over });

export function dropsVectors(p: SimParams, g: GddReference, e: EconomyInputs): VectorFile {
  const { dp, refs } = e;
  const v: Vector[] = [];
  const tol = g.drops.aboutTolerance_ratio;
  const days = (rarity: 'epic' | 'legendary', minutesPerDay: number, mult = 1): VectorInput => ({
    fn: 'meanDaysBetween',
    chance_pct: dp.baseChance_pct[rarity] * mult,
    minutesPerDay,
    rewardTickInterval_s: dp.rewardTickInterval_s,
  });
  const src = `${g.drops.source} · drop multiplier 1.0 (F-2), every reward tick passes the movement gate`;
  v.push(
    gdd(
      days('epic', refs.casualMinutesPerDay),
      refs.casualEpicEvery_days,
      refs.casualEpicEvery_days * tol,
      `${src} · ${refs.casualMinutesPerDay} min/day Epic`,
    ),
    gdd(
      days('legendary', refs.casualMinutesPerDay),
      refs.casualLegendaryEvery_days,
      refs.casualLegendaryEvery_days * tol,
      `${src} · ${refs.casualMinutesPerDay} min/day Legendary`,
    ),
    gdd(
      days('epic', refs.heavyMinutesPerDay),
      (refs.heavyEpicEveryMin_days + refs.heavyEpicEveryMax_days) / 2,
      (refs.heavyEpicEveryMax_days - refs.heavyEpicEveryMin_days) / 2,
      `${src} · ${refs.heavyMinutesPerDay} min/day Epic (range ${refs.heavyEpicEveryMin_days}-${refs.heavyEpicEveryMax_days} days)`,
    ),
    gdd(
      days('legendary', refs.heavyMinutesPerDay),
      refs.heavyLegendaryEvery_days,
      refs.heavyLegendaryEvery_days * tol,
      `${src} · ${refs.heavyMinutesPerDay} min/day Legendary`,
    ),
  );
  const soloMult = dp.noRangedMult;
  v.push(
    sim(days('epic', refs.casualMinutesPerDay, soloMult), 'F-2: solo without Ranged (x0.6) Epic'),
    sim(
      days('legendary', refs.casualMinutesPerDay, soloMult),
      'F-2: solo without Ranged (x0.6) Legendary',
    ),
    sim(days('epic', refs.heavyMinutesPerDay, soloMult), 'F-2: heavy player solo without Ranged'),
    sim(
      { ...days('epic', 0), minutesPerDay: dp.rewardTickInterval_s / SECONDS_PER_MINUTE },
      'boundary: one reward tick per day',
    ),
    sim({ ...days('epic', refs.casualMinutesPerDay), chance_pct: 0 }, 'boundary: chance 0 → null'),
  );
  const L = g.party.level;
  const rangedL = buffOrNull([L], 'ranged', p) as number;
  const rangedCap = p.roles.ranged.cap_pct;
  const cases: [Partial<DropContext>, string][] = [
    [{}, 'multiplier 1.0 (GDD table as written)'],
    [{ rangedBuff_pct: null }, 'no Ranged inside → x0.6'],
    [{ rangedBuff_pct: rangedL }, `one Ranged L${L} inside (buff ${rangedL.toFixed(2)}%)`],
    [
      { rangedBuff_pct: rangedCap + CASE.rangedBuffAboveCap_pct },
      `boundary: Ranged buff above ${rangedCap}% clamps at x${dp.rangedBuffMaxMult}`,
    ],
    [{ smallDungeon: true }, 'small dungeon: rare and above x1.5, Common quantity x0.6'],
    [{ lowTrust: true }, 'low trust: x0.5 and no Epic or Legendary'],
    [{ failedRaidBossHpLeft: 0 }, 'failed raid week, boss almost dead → x1.6 (A-16b)'],
    [{ failedRaidBossHpLeft: 1 }, 'failed raid week, boss untouched → x2.0'],
    [{ failedRaidBossHpLeft: 0.5 }, 'failed raid week, half HP left → x1.8'],
    [{ failedRaidBossHpLeft: 3 }, 'boundary: HP fraction above 1 clamps to x2.0'],
    [{ smallDungeon: true, rangedBuff_pct: null }, 'combined: small dungeon, no Ranged'],
    [{ smallDungeon: true, lowTrust: true }, 'combined: small dungeon, low trust'],
    [
      { rangedBuff_pct: rangedCap, smallDungeon: true, failedRaidBossHpLeft: 1 },
      'combined maximum: Ranged cap, small dungeon, failed raid x2.0',
    ],
  ];
  for (const [over, note] of cases)
    v.push(sim({ fn: 'dropRates', ...dropIn(dp), ...ctxIn(ctx(over)) }, note));
  const synthetic = {
    ...dropIn(dp),
    baseChance_pct: { ...dp.baseChance_pct, uncommon: CASE.syntheticUncommon_pct },
  };
  v.push(
    sim(
      {
        fn: 'dropRates',
        ...synthetic,
        ...ctxIn(ctx({ rangedBuff_pct: rangedCap, failedRaidBossHpLeft: 1 })),
      },
      `boundary (synthetic base Uncommon ${CASE.syntheticUncommon_pct}%): chance clamps at 100%`,
    ),
  );
  return { formula: 'drops', vectors: v };
}

/** Inputs of potionCostNet_gold for one player at level L in a party (Z = L, balanced build). */
function potionIn(
  spec: PartySpec,
  level: number,
  potion: string,
  withVit: boolean,
  p: SimParams,
  dp: DropParams,
): VectorInput {
  const fx = partyEffects(spec, p, dp);
  const row = survivalRow(level, fx.tankerCase, p);
  const setup = runSetup(level, fx.tankerCase, p, {
    stopAt_pct: 0,
    ...(fx.supportLevels ? { supportLevels: fx.supportLevels } : {}),
    ...(fx.magicLevels ? { magicLevels: fx.magicLevels } : {}),
    maxDuration_s: 1,
  });
  const pot = p.potions[potion];
  if (pot === undefined) throw new Error(`unknown potion ${potion}`);
  return {
    fn: 'potionCostNet_gold',
    damage: row.damage,
    maxHp: row.build.hp,
    hitChance_pct: p.attack.hitChancePerCheck_pct,
    intervalMin_s: p.attack.intervalMin_s,
    intervalMax_s: p.attack.intervalMax_s,
    heal_pctMaxHpPerMin: setup.heal_pctMaxHpPerMin,
    shield_pctMaxHpPerTick: setup.shield_pctMaxHp,
    rewardTickInterval_s: p.healShield.rewardTickInterval_s,
    potionHeal_pctMaxHp: pot.heal_pctMaxHp,
    potionEfficiencyBonus_pct: withVit ? row.build.vit * p.stats.vitPotionEfficiency_pct : 0,
    buyPrice_gold: pot.buyPrice_gold,
  };
}

/** Expected HP loss per hour (% max HP) of the level-L balanced build with no Tanker inside. */
function grossLossNoTanker(level: number, p: SimParams): number {
  const row = survivalRow(level, { kind: 'noTanker' }, p);
  return evaluateVector({
    fn: 'hpLossPerHour_pct',
    damage: row.damage,
    maxHp: row.build.hp,
    hitChance_pct: p.attack.hitChancePerCheck_pct,
    meanInterval_s: (p.attack.intervalMin_s + p.attack.intervalMax_s) / 2,
  }) as number;
}

export function economyVectors(p: SimParams, g: GddReference, e: EconomyInputs): VectorFile {
  const { dp, refs } = e;
  const v: Vector[] = [];
  const income = (over: Partial<DropContext>): VectorInput => ({
    fn: 'incomePerHour_gold',
    ...dropIn(dp),
    ...ctxIn(ctx(over)),
  });
  const ec = g.economy;
  v.push(
    gdd(
      income({}),
      refs.income_gold,
      refs.income_gold * ec.incomeTolerance_ratio,
      `${ec.source} · income at drop multiplier 1.0, every material sold to NPC (F-6)`,
    ),
    gdd(
      {
        fn: 'incomeToPotionRatio',
        income_gold: refs.income_gold,
        potionCost_gold: refs.potion_gold,
      },
      ec.gddRatio,
      ec.gddRatioTolerance,
      `${ec.source} · the GDD ratio 1,470 / 600`,
    ),
  );
  const target = {
    targetMin: p.income.ratioTargetMin,
    targetMax: p.income.ratioTargetMax,
    minAccepted: p.income.ratioMinAccepted,
  };
  v.push(
    gdd(
      { fn: 'ratioStatus', ratio: ec.gddRatio, ...target },
      'ACCEPTED (D-005)',
      0,
      'studio/decisions/decision-log.md D-005 · GDD ratio 2.45 is accepted, below the 2.5-3 target',
    ),
  );
  const L = g.party.level;
  const rangedL = buffOrNull([L], 'ranged', p) as number;
  for (const [over, note] of [
    [{ rangedBuff_pct: null }, 'F-2: solo without Ranged (x0.6)'],
    [{ rangedBuff_pct: rangedL }, `party or solo Ranged L${L} (buff ${rangedL.toFixed(2)}%)`],
    [{ rangedBuff_pct: p.roles.ranged.cap_pct }, `Ranged at cap x${dp.rangedBuffMaxMult}`],
    [{ smallDungeon: true }, 'small dungeon: fewer Common, more Rare (F-15: +8.9% gold)'],
    [{ lowTrust: true }, 'low trust x0.5'],
    [{ failedRaidBossHpLeft: 1 }, 'failed raid week x2.0'],
  ] as [Partial<DropContext>, string][])
    v.push(sim(income(over), note));
  for (const [ratio, note] of [
    [target.targetMin, 'boundary: target min → IN TARGET'],
    [target.targetMax, 'boundary: target max → IN TARGET'],
    [target.targetMax + CASE.ratioStepAbove, 'boundary: just above target max'],
    [target.minAccepted - CASE.ratioStepBelow, 'boundary: just below min accepted'],
    [0, 'boundary: ratio 0'],
  ] as [number, string][])
    v.push(sim({ fn: 'ratioStatus', ratio, ...target }, note));
  // Level-L values as printed in the sim report: gross loss without a Tanker (1 decimal), solo
  // Support heal and solo Magic shield (2 decimals).
  const gross = roundTo(grossLossNoTanker(L, p), CASE.printed.grossLossDecimals);
  const healL = roundTo(
    potionIn(soloSpec('support', L), L, 'hpSmall', false, p, dp)['heal_pctMaxHpPerMin'] as number,
    CASE.printed.healShieldDecimals,
  );
  const shieldL = roundTo(
    potionIn(soloSpec('magic', L), L, 'hpSmall', false, p, dp)['shield_pctMaxHpPerTick'] as number,
    CASE.printed.healShieldDecimals,
  );
  const sa = CASE.shieldAboveLoss;
  const ha = CASE.healAboveLoss;
  for (const [grossLoss, heal, shield, note] of [
    [gross, 0, 0, 'no heal, no shield → gross loss'],
    [gross, healL, 0, `Support L${L} heal only`],
    [gross, 0, shieldL, `Magic L${L} shield only`],
    [
      sa.gross,
      sa.heal,
      sa.shield,
      'boundary: shield larger than loss per tick is capped at the loss',
    ],
    [ha.gross, ha.heal, ha.shield, 'boundary: heal above loss → 0'],
  ] as [number, number, number, string][])
    v.push(
      sim(
        {
          fn: 'netHpLossPerHour_pct',
          grossLoss_pctPerHour: grossLoss,
          heal_pctMaxHpPerMin: heal,
          shield_pctMaxHpPerTick: shield,
          ticksPerHour: SECONDS_PER_HOUR / dp.rewardTickInterval_s,
        },
        note,
      ),
    );
  const specs: [PartySpec, string][] = [
    [
      partyWithout(L, ['support', 'magic', 'ranged', 'tanker']),
      'no role buff at all (x1.6, like the old reference)',
    ],
    ...ROLES.map((r): [PartySpec, string] => [soloSpec(r, L), `solo ${r} L${L}`]),
    [fullPartySpec(L), `full party L${L} (F-13)`],
  ];
  for (const [spec, note] of specs)
    for (const [potion, vit] of [
      ['hpSmall', false],
      ['hpSmall', true],
      ['hpMedium', false],
    ] as [string, boolean][])
      v.push(
        sim(
          potionIn(spec, L, potion, vit, p, dp),
          `${note}, ${potion}, VIT bonus ${vit ? 'on (balanced build)' : 'off'} · uncapped analytic`,
        ),
      );
  v.push(
    sim(
      { ...potionIn(soloSpec('tanker', L), L, 'hpSmall', false, p, dp), damage: 0 },
      'boundary: no damage → 0 gold',
    ),
  );
  return { formula: 'economy', vectors: v };
}

function partyIn(p: SimParams, dp: DropParams): VectorInput {
  const roles: Record<string, VectorInput> = {};
  for (const r of ROLES) roles[r] = { ...p.roles[r] };
  return {
    roles,
    pPerMemberBase: p.buff.pPerMemberBase,
    pLevelDivisor: p.buff.pLevelDivisor,
    ...p.expMult,
    supportHealBase_pctMaxHpPerMin: p.healShield.supportHealBase_pctMaxHpPerMin,
    magicShieldPerTick_pctMaxHpPerBuffPct: p.healShield.magicShieldPerTick_pctMaxHpPerBuffPct,
    ...dropIn(dp),
  };
}

const membersIn = (s: PartySpec): Record<Role, number[]> => ({ ...s.members });

export function partyVectors(p: SimParams, g: GddReference, e: EconomyInputs): VectorFile {
  const { dp, refs } = e;
  const v: Vector[] = [];
  const L = g.party.level;
  const base = partyIn(p, dp);
  const full = fullPartySpec(L);
  const perRoleAtMax = Math.floor(p.partyMaxMembers / ROLES.length);
  const start = p.exp.startLevel;
  const max = p.exp.maxLevel;
  const ratio = (party: PartySpec, solo: PartySpec): VectorInput => ({
    fn: 'partyPerHeadRatio',
    members: membersIn(party),
    soloMembers: membersIn(solo),
    ...base,
  });
  const mid = (refs.partyMin + refs.partyMax) / 2;
  const half = (refs.partyMax - refs.partyMin) / 2;
  for (const role of ['tanker', 'support'] as Role[]) {
    v.push(
      gdd(
        ratio(full, soloSpec(role, L)),
        { drop: mid, exp: mid, reward: mid },
        half,
        `${g.party.source} · full party L${L} (1 per role) vs solo ${role} L${L} (neither Ranged nor Magic): per-head drop value and exp inside ${refs.partyMin}-${refs.partyMax}`,
      ),
    );
  }
  v.push(
    sim(
      ratio(full, soloSpec('ranged', L)),
      'F-14: vs solo Ranged (keeps own drop buff) → drop ratio 1.0',
    ),
    sim(
      ratio(full, soloSpec('magic', L)),
      'F-14: vs solo Magic (keeps own exp buff) → exp ratio 1.0',
    ),
    sim(
      ratio(fullPartySpec(L, perRoleAtMax), soloSpec('tanker', L)),
      `${perRoleAtMax * ROLES.length} members (${perRoleAtMax} per role) vs solo Tanker`,
    ),
    sim(
      ratio(partyWithout(L, ['ranged']), soloSpec('tanker', L)),
      'party without Ranged vs solo Tanker → drop 1.0',
    ),
    sim(
      ratio(fullPartySpec(start), soloSpec('tanker', start)),
      `boundary: everyone level ${start}`,
    ),
    sim(ratio(fullPartySpec(max), soloSpec('tanker', max)), `boundary: everyone level ${max}`),
    sim(ratio(full, full), 'boundary: same party → 1.0'),
  );
  const fx = (s: PartySpec, note: string) =>
    v.push(sim({ fn: 'partyEffects', members: membersIn(s), ...base }, note));
  fx(partyWithout(L, [...ROLES]), 'boundary: 0 members inside → every missing debuff');
  for (const r of ROLES) fx(soloSpec(r, L), `solo ${r} L${L}: own buff, other debuffs`);
  fx(full, `full party L${L}`);
  fx(fullPartySpec(L, perRoleAtMax), `${perRoleAtMax * ROLES.length} members L${L}`);
  const capped = partyWithout(L, []);
  const many = CASE.asymptoteMembersPerRole;
  for (const r of ROLES) capped.members[r] = Array.from({ length: many }, () => max);
  fx(capped, `boundary: ${many} members per role at level ${max} → every buff at cap`);
  return { formula: 'party', vectors: v };
}
