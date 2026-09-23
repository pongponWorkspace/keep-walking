// Tests for the drop, economy and party model (P1-F03-T08 acceptance). Literal numbers are GDD
// targets or findings F-12..F-16 reported in design/systems/sim-report.md.
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadBalanceConfig } from './config';
import {
  NEUTRAL_CONTEXT,
  dropParamsFromConfig,
  dropRates,
  incomePerHourCtx_gold,
  meanDaysBetween,
  simulateDropGaps,
  simulateIncome,
  stochasticRound,
  ticksPerDay,
  ticksPerHour,
} from './drops';
import {
  REFERENCE_SITUATION,
  economyRow,
  fullPartySpec,
  partyRewardRatio,
  ratioStatus,
  soloSpec,
} from './economy';
import { ROLES, paramsFromConfig } from './params';
import { mean, mulberry32 } from './rng';
import { fitHitChance_pct } from './scenarios';
import { VECTOR_DIR } from './vector-files';

const cfg = loadBalanceConfig();
const p = paramsFromConfig(cfg);
const dp = dropParamsFromConfig(cfg);
const within = (got: number, target: number, ratio: number) => Math.abs(got / target - 1) <= ratio;

describe('config after P1-F03-T08', () => {
  it('hit chance is the T07 least-squares fit 54 % (D-029)', () => {
    expect(p.attack.hitChancePerCheck_pct).toBe(54);
    expect(Math.round(fitHitChance_pct(25, 25, 45, 55, p).exact_pct)).toBe(54);
  });
  it('Support stays 25/50 (D-004)', () => {
    expect([p.roles.support.base_pct, p.roles.support.cap_pct]).toEqual([25, 50]);
  });
});

describe('drops', () => {
  it('x1.0: Epic about every 10 days at 40 min/day, Legendary about 2 months (10 %)', () => {
    expect(within(meanDaysBetween(dp.baseChance_pct.epic, 40, dp), 10, 0.1)).toBe(true);
    expect(within(meanDaysBetween(dp.baseChance_pct.legendary, 40, dp), 60, 0.1)).toBe(true);
  });
  it('x1.0: Epic every 2-3 days at 3 h/day, Legendary about 2 weeks', () => {
    const epic = meanDaysBetween(dp.baseChance_pct.epic, 180, dp);
    expect(epic).toBeGreaterThanOrEqual(2);
    expect(epic).toBeLessThanOrEqual(3);
    expect(within(meanDaysBetween(dp.baseChance_pct.legendary, 180, dp), 14, 0.1)).toBe(true);
  });
  it('F-2: without Ranged every drop is x0.6 (Epic 17.4 days at 40 min/day)', () => {
    const r = dropRates({ ...NEUTRAL_CONTEXT, rangedBuff_pct: null }, dp);
    expect(r.epic).toBeCloseTo(dp.baseChance_pct.epic * 0.6, 9);
    expect(meanDaysBetween(r.epic, 40, dp)).toBeCloseTo(17.36, 2);
  });
  it('Ranged buff clamps at x1.5, chances clamp at 100 %, low trust blocks Epic and Legendary', () => {
    expect(dropRates({ ...NEUTRAL_CONTEXT, rangedBuff_pct: 90 }, dp).commonQty).toBeCloseTo(3, 9);
    const synthetic = { ...dp, baseChance_pct: { ...dp.baseChance_pct, uncommon: 80 } };
    expect(dropRates({ ...NEUTRAL_CONTEXT, failedRaidBossHpLeft: 1 }, synthetic).uncommon).toBe(
      100,
    );
    const low = dropRates({ ...NEUTRAL_CONTEXT, lowTrust: true }, dp);
    expect([low.epic, low.legendary]).toEqual([0, 0]);
    expect(low.rare).toBeCloseTo(dp.baseChance_pct.rare * 0.5, 9);
  });
  it('small dungeon: Common x0.6, Rare and above x1.5, Uncommon unchanged (F-15: +8.9 % gold)', () => {
    const r = dropRates({ ...NEUTRAL_CONTEXT, smallDungeon: true }, dp);
    expect(r.commonQty).toBeCloseTo(1.2, 9);
    expect(r.uncommon).toBe(dp.baseChance_pct.uncommon);
    expect(r.rare).toBeCloseTo(9, 9);
    const gain = incomePerHourCtx_gold({ ...NEUTRAL_CONTEXT, smallDungeon: true }, dp) / 1488 - 1;
    expect(gain).toBeCloseTo(0.0887, 3);
  });
  it('Monte Carlo gaps and income match the analytic values (3 % and 1 %)', () => {
    const rng = mulberry32(5);
    const gaps = simulateDropGaps(dp.baseChance_pct.epic, ticksPerDay(40, dp), 8000, rng);
    expect(within(mean(gaps), meanDaysBetween(dp.baseChance_pct.epic, 40, dp), 0.03)).toBe(true);
    const ticks = 200000;
    const gold = simulateIncome(NEUTRAL_CONTEXT, ticks, dp, rng) / (ticks / ticksPerHour(dp));
    expect(within(gold, incomePerHourCtx_gold(NEUTRAL_CONTEXT, dp), 0.01)).toBe(true);
  });
  it('stochastic rounding keeps the mean (1.2 → 1 or 2, mean 1.2)', () => {
    const rng = mulberry32(9);
    const xs = Array.from({ length: 20000 }, () => stochasticRound(1.2, rng));
    expect(new Set(xs)).toEqual(new Set([1, 2]));
    expect(mean(xs)).toBeCloseTo(1.2, 1);
  });
});

describe('economy (ratio vs economy.incomeToPotionRatio, D-005)', () => {
  const L = 25;
  const t = p.income;
  it('income at x1.0 is about 1,470 gold/h (3 %)', () => {
    expect(within(incomePerHourCtx_gold(NEUTRAL_CONTEXT, dp), 1470, 0.03)).toBe(true);
  });
  it('potion cost comes from the damage model and Monte Carlo agrees within 3 % (no heal cap case)', () => {
    const r = economyRow(REFERENCE_SITUATION, L, 'hpSmall', false, p, dp, {
      hours: 3000,
      rng: mulberry32(3),
    });
    expect(r.potionGold).toBeCloseTo((r.netLoss_pctPerHour / 30) * 150, 6);
    expect(within(r.potionGoldMc ?? 0, r.potionGold, 0.03)).toBe(true);
  });
  it('GDD 600 lies between small-only (−12.5 %) and medium-only (+16.6 %) at x1.0 without VIT', () => {
    const small = economyRow(REFERENCE_SITUATION, L, 'hpSmall', false, p, dp).potionGold;
    const medium = economyRow(REFERENCE_SITUATION, L, 'hpMedium', false, p, dp).potionGold;
    expect(small).toBeLessThan(600);
    expect(medium).toBeGreaterThan(600);
  });
  it('the GDD reading (x1.0, small potion, no VIT) is inside the target; medium potions fall below', () => {
    const small = economyRow(REFERENCE_SITUATION, L, 'hpSmall', false, p, dp);
    expect(ratioStatus(small.ratio, t)).toBe('IN TARGET');
    const medium = economyRow(REFERENCE_SITUATION, L, 'hpMedium', false, p, dp);
    expect(ratioStatus(medium.ratio, t)).toBe('BELOW RANGE');
  });
  it('F-12: the balanced-build VIT bonus (+107.5 %) doubles the ratio to about 5.9 (reported, not fixed)', () => {
    const r = economyRow(REFERENCE_SITUATION, L, 'hpSmall', true, p, dp);
    expect(r.potionEfficiency_pct).toBeCloseTo(107.5, 6);
    expect(r.ratio).toBeGreaterThan(5.5);
  });
  it('F-12b: with medium potions the VIT bonus is mostly wasted (heal capped at max HP)', () => {
    const rng = mulberry32(4);
    const on = economyRow(REFERENCE_SITUATION, L, 'hpMedium', true, p, dp, { hours: 3000, rng });
    const off = economyRow(REFERENCE_SITUATION, L, 'hpMedium', false, p, dp, { hours: 3000, rng });
    expect(within(on.potionGoldMc ?? 0, off.potionGoldMc ?? 1, 0.05)).toBe(true);
  });
  it('F-2: solo ratios by class stay outside the target (no VIT: Tanker/Ranged ~2.2, Support/Magic ~1.3)', () => {
    const ratios = ROLES.map((r) => economyRow(soloSpec(r, L), L, 'hpSmall', false, p, dp).ratio);
    for (const x of ratios) expect(x).toBeLessThan(t.ratioMinAccepted);
    expect(ratios[2]).toBeLessThan(1.5);
    expect(ratios[3]).toBeLessThan(1.5);
  });
  it('F-13: a full party (Tanker + Support heal + Magic shield) spends almost nothing on potions', () => {
    const r = economyRow(fullPartySpec(L), L, 'hpSmall', false, p, dp);
    expect(r.netLoss_pctPerHour).toBeLessThan(r.grossLoss_pctPerHour * 0.2);
    expect(r.ratio).toBeGreaterThan(5 * t.ratioTargetMax);
  });
});

describe('party per head (economy.partyReward, Support 25/50)', () => {
  const L = 25;
  it('full party vs a solo Tanker or Support: drop and exp both 2.05x (inside 1.8-2.2)', () => {
    for (const role of ['tanker', 'support'] as const) {
      const r = partyRewardRatio(fullPartySpec(L), soloSpec(role, L), p, dp);
      expect(r.drop).toBeCloseTo(2.053, 3);
      expect(r.exp).toBeCloseTo(2.053, 3);
    }
  });
  it('F-14: vs a solo Ranged the drop ratio is 1.0, vs a solo Magic the exp ratio is 1.0; class average 1.79', () => {
    expect(partyRewardRatio(fullPartySpec(L), soloSpec('ranged', L), p, dp).drop).toBeCloseTo(1, 9);
    expect(partyRewardRatio(fullPartySpec(L), soloSpec('magic', L), p, dp).exp).toBeCloseTo(1, 9);
    const avg = mean(
      ROLES.map((r) => partyRewardRatio(fullPartySpec(L), soloSpec(r, L), p, dp).drop),
    );
    expect(avg).toBeCloseTo(1.79, 2);
  });
  it('8 members (2 per role) vs solo Tanker: 2.26x, just above the range', () => {
    expect(partyRewardRatio(fullPartySpec(L, 2), soloSpec('tanker', L), p, dp).drop).toBeCloseTo(
      2.26,
      2,
    );
  });
});

describe('new golden vector files', () => {
  it('drops.json, economy.json and party.json exist', () => {
    const files = readdirSync(VECTOR_DIR);
    for (const name of ['drops', 'economy', 'party']) expect(files).toContain(`${name}.json`);
  });
});
