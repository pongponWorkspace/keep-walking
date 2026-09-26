import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import {
  CHANCE_RARITIES,
  NEUTRAL_CONTEXT,
  RARITIES,
  dropParamsFromConfig,
  dropRates,
  failedRaidTerm,
  rangedTerm,
  stochasticRound,
} from './drops';
import { mulberry32 } from './rng';

describe('dropParamsFromConfig', () => {
  it('reads config/balance/drops.json + dungeons.json + economy.json (GDD starting numbers)', () => {
    const cfg = loadConfig();
    const p = dropParamsFromConfig(cfg.balance);
    expect(p.commonMin).toBe(1);
    expect(p.commonMax).toBe(3);
    expect(p.rewardTickInterval_s).toBe(300);
    expect(p.baseChance_pct.uncommon).toBe(25);
    expect(p.baseChance_pct.legendary).toBe(0.2);
    expect(p.lowTrustBlocksEpicAndAbove).toBe(true);
    // elementDust (common) sells for 20 gold; equipment (epic/legendary) has no NPC price (null).
    expect(p.npcPrice_gold.common).toBe(20);
    expect(p.npcPrice_gold.epic).toBeNull();
    expect(p.npcPrice_gold.legendary).toBeNull();
    for (const r of RARITIES)
      expect(typeof p.npcPrice_gold[r] === 'number' || p.npcPrice_gold[r] === null).toBe(true);
    for (const r of CHANCE_RARITIES) expect(Number.isFinite(p.baseChance_pct[r])).toBe(true);
  });
});

describe('rangedTerm / failedRaidTerm', () => {
  const p = dropParamsFromConfig(loadConfig().balance);

  it('no Ranged inside applies noRangedMult; a buff is capped at rangedBuffMaxMult', () => {
    expect(rangedTerm(null, p)).toBe(p.noRangedMult);
    expect(rangedTerm(0, p)).toBe(1);
    expect(rangedTerm(1000, p)).toBe(p.rangedBuffMaxMult);
  });

  it('a normal week (bossHpLeft null) applies no failed-raid multiplier', () => {
    expect(failedRaidTerm(null, p)).toBe(1);
  });

  it('a failed-raid week interpolates between the min and max multiplier', () => {
    expect(failedRaidTerm(0, p)).toBe(p.failedRaidWeekMinMult);
    expect(failedRaidTerm(1, p)).toBe(p.failedRaidWeekMaxMult);
  });
});

describe('dropRates', () => {
  const p = dropParamsFromConfig(loadConfig().balance);

  it('matches config exactly with the neutral context (Ranged present at 0% buff, no penalties)', () => {
    const r = dropRates(NEUTRAL_CONTEXT, p);
    expect(r.commonQty).toBeCloseTo((p.commonMin + p.commonMax) / 2, 10);
    expect(r.uncommon).toBeCloseTo(p.baseChance_pct.uncommon, 10);
  });

  it('no Ranged inside the dungeon (null) applies noRangedMult instead', () => {
    const r = dropRates({ ...NEUTRAL_CONTEXT, rangedBuff_pct: null }, p);
    expect(r.commonQty).toBeCloseTo(((p.commonMin + p.commonMax) / 2) * p.noRangedMult, 10);
  });

  it('clamps chance at 100', () => {
    const r = dropRates({ ...NEUTRAL_CONTEXT, rangedBuff_pct: 100000 }, p);
    expect(r.uncommon).toBeLessThanOrEqual(100);
    expect(r.rare).toBeLessThanOrEqual(100);
  });

  it('a blocked low-trust roll gives 0 for epic and legendary only', () => {
    const r = dropRates({ ...NEUTRAL_CONTEXT, lowTrust: true }, p);
    expect(r.epic).toBe(0);
    expect(r.legendary).toBe(0);
    expect(r.uncommon).toBeGreaterThan(0);
  });
});

describe('stochasticRound', () => {
  it('is exact for a whole number regardless of rng', () => {
    expect(stochasticRound(2, () => 0)).toBe(2);
    expect(stochasticRound(2, () => 0.999)).toBe(2);
  });

  it('rounds down when rng() >= the fractional part, up otherwise', () => {
    expect(stochasticRound(2.3, () => 0.5)).toBe(2);
    expect(stochasticRound(2.3, () => 0.1)).toBe(3);
  });

  it('averages to the input over many draws (Monte Carlo sanity check)', () => {
    const rng = mulberry32(7);
    const draws = 20000;
    let total = 0;
    for (let i = 0; i < draws; i += 1) total += stochasticRound(2.3, rng);
    expect(total / draws).toBeCloseTo(2.3, 1);
  });
});
