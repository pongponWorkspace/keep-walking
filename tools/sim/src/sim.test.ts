// Tests for the balance simulator (P1-F03-T07 acceptance). Literal numbers are GDD targets.
import { readFileSync, readdirSync } from 'node:fs';
import { isWithinTolerance } from '@keep-walking/shared';
import type { GoldenVectorFile } from '@keep-walking/shared';
import { describe, expect, it } from 'vitest';
import { balancedBuild, extremeBuild } from './build';
import { getPath, loadBalanceConfig, num } from './config';
import type { JsonObject } from './config';
import {
  baseCapStatus,
  gearStat,
  memberP,
  roleBuffPct,
  ticksBetween,
  ticksPerLevel,
  ticksPerLevelCurve,
} from './formulas';
import { ROLES, paramsFromConfig } from './params';
import { mean, mulberry32 } from './rng';
import {
  fitHitChance_pct,
  incomePerHour_gold,
  potionCostRow,
  runSetup,
  survivalRow,
} from './scenarios';
import { hitsToThreshold, potionCostMonteCarlo, survivalMonteCarlo } from './survival';
import { VECTOR_DIR, generate } from './vector-files';
import { evaluateVector } from './vector-eval';
import type { VectorInput, VectorOutput } from './vector-eval';

const cfg = loadBalanceConfig();
const p = paramsFromConfig(cfg);
const buffAt = (role: (typeof ROLES)[number], levels: number[]) =>
  roleBuffPct(
    p.roles[role],
    levels.reduce((s, l) => s + memberP(l, p.buff), 0),
  );

describe('config loader', () => {
  it('reads every balance file from config/balance', () => {
    expect(Object.keys(cfg).sort()).toEqual([
      'anticheat',
      'classes',
      'combat',
      'drops',
      'dungeons',
      'economy',
      'enhance',
      'equipment',
      'progression',
      'raid',
      'unlocks',
    ]);
  });
  it('refuses metadata keys and null values', () => {
    const fake: JsonObject = { a: { _source: 'x', b: null, c: 3 } };
    expect(() => getPath(fake, 'a._source')).toThrow(/metadata/);
    expect(() => num(fake, 'a.b')).toThrow(/null/);
    expect(num(fake, 'a.c')).toBe(3);
  });
});

describe('buff stacking', () => {
  it('Tanker level 25 with 1-4 members = 21.7 / 33.0 / 38.8 / 41.8 %', () => {
    [21.7, 33.0, 38.8, 41.8].forEach((target, i) => {
      expect(Math.abs(buffAt('tanker', Array(i + 1).fill(25)) - target)).toBeLessThanOrEqual(0.05);
    });
  });
  it('one member at level 25: Ranged and Magic 23.2 %, Support 32.3 %', () => {
    expect(buffAt('ranged', [25])).toBeCloseTo(23.2, 1);
    expect(buffAt('magic', [25])).toBeCloseTo(23.2, 1);
    expect(buffAt('support', [25])).toBeCloseTo(32.3, 1);
  });
  it('one Tanker level 50 = two Tankers level 1 (within 0.5 point, F-5)', () => {
    expect(Math.abs(buffAt('tanker', [50]) - buffAt('tanker', [1, 1]))).toBeLessThanOrEqual(0.5);
  });
  it('0 members → 0, and buff never exceeds cap', () => {
    for (const role of ROLES) {
      expect(buffAt(role, [])).toBe(0);
      expect(buffAt(role, Array(500).fill(60))).toBeLessThanOrEqual(p.roles[role].cap_pct);
    }
  });
  it('base/cap rule passes for every role, Support is the D-004 exception', () => {
    expect(ROLES.map((r) => baseCapStatus(r, p.roles[r], p.baseCapRule))).toEqual([
      'PASS',
      'PASS',
      'EXCEPTION',
      'PASS',
    ]);
  });
});

describe('exp curve', () => {
  it('ticks per level at L = 10/20/30/45 = 10/16/22/29 and the L60 table row = 35 on the curve', () => {
    for (const [L, t] of [
      [10, 10],
      [20, 16],
      [30, 22],
      [45, 29],
    ] as const) {
      expect(Math.abs(ticksPerLevel(L, p.exp) - t)).toBeLessThanOrEqual(0.5);
    }
    expect(Math.abs(ticksPerLevelCurve(60, p.exp) - 35)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(ticksPerLevel(59, p.exp) - 35)).toBeLessThanOrEqual(0.5);
    expect(() => ticksPerLevel(60, p.exp)).toThrow(RangeError);
  });
  it('total level 1-60 about 1,240 ticks / 103 h (3 %), level 30 about 32 h (4 %, F-4)', () => {
    const ticks = ticksBetween(1, 60, p.exp);
    const tickH = p.healShield.rewardTickInterval_s / 3600;
    expect(Math.abs(ticks / 1240 - 1)).toBeLessThanOrEqual(0.03);
    expect(Math.abs((ticks * tickH) / 103 - 1)).toBeLessThanOrEqual(0.03);
    expect(Math.abs((ticksBetween(1, 30, p.exp) * tickH) / 32 - 1)).toBeLessThanOrEqual(0.04);
  });
});

describe('gear and stats', () => {
  it('gear table tier 1-5 at +0/+10/+15 within 1 point of the GDD (D-022), e.g. tier 5 = 285/513/627', () => {
    const table = [
      [30, 54, 66],
      [79, 142, 174],
      [140, 252, 308],
      [209, 376, 460],
      [285, 513, 627],
    ];
    table.forEach((row, t) =>
      row.forEach((target, k) => {
        expect(
          Math.abs(gearStat(t + 1, [0, 10, 15][k] as number, p.gear) - target),
        ).toBeLessThanOrEqual(1);
      }),
    );
  });
  it('level 60 extremes: ATK 740, DEF 560 (65 % reduction), HP 27,300', () => {
    expect(extremeBuild(60, 'atk', p).atk).toBe(740);
    const d = extremeBuild(60, 'def', p);
    expect(d.def).toBe(560);
    expect(Math.abs(d.defReduction_pct - 65)).toBeLessThanOrEqual(0.5);
    expect(extremeBuild(60, 'hp', p).hp).toBe(27300);
  });
});

describe('damage and survival', () => {
  const fit = fitHitChance_pct(25, 25, 45, 55, p);
  const fitted = Math.round(fit.exact_pct);

  it('fits the hit chance to both GDD rows (proposed 54 %)', () => {
    expect(fitted).toBe(54);
    expect(fit.refOnly_pct).toBeGreaterThan(50);
    expect(fit.tankerOnly_pct).toBeLessThan(58);
  });
  it('config hit chance is within the systems-designer ±20 % authority of the fit', () => {
    expect(Math.abs(p.attack.hitChancePerCheck_pct / fitted - 1)).toBeLessThanOrEqual(0.2);
  });
  it('matching level, no potions, damage x1.0 → about 45 min to auto-retreat; with Tanker L25 about 55 min', () => {
    const ref = survivalRow(25, { kind: 'reference' }, p, fitted);
    const tank = survivalRow(25, { kind: 'tanker', levels: [25] }, p, fitted);
    expect(Math.abs(ref.minToRetreat / 45 - 1)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(tank.minToRetreat / 55 - 1)).toBeLessThanOrEqual(0.1);
    expect(ref.minToDeath).toBeGreaterThan(ref.minToRetreat);
  });
  it('survival is flat across matching levels 10-60 (within 10 % of 45 min at the fit)', () => {
    for (const L of [10, 25, 40, 60]) {
      expect(
        Math.abs(survivalRow(L, { kind: 'reference' }, p, fitted).minToRetreat / 45 - 1),
      ).toBeLessThanOrEqual(0.1);
    }
  });
  it('SF-4: solo non-Tanker (x1.6) is more than 20 % short of 45 min → decision for HUMAN is required', () => {
    const solo = survivalRow(25, { kind: 'noTanker' }, p, fitted);
    expect(1 - solo.minToRetreat / 45).toBeGreaterThan(0.2);
  });
  it('Monte Carlo mean matches the analytic expectation within 2 %', () => {
    const rng = mulberry32(7);
    const setup = runSetup(25, { kind: 'reference' }, p, {
      stopAt_pct: 25,
      hitChance_pct: fitted,
      maxDuration_s: 86400,
    });
    const mc = survivalMonteCarlo(setup, 4000, rng);
    const analytic = survivalRow(25, { kind: 'reference' }, p, fitted).minToRetreat;
    expect(Math.abs(mc.mean_min / analytic - 1)).toBeLessThanOrEqual(0.02);
  });
  it('hit counting boundaries: exact multiples and one-shot', () => {
    expect(hitsToThreshold(1000, 250, 25)).toBe(3);
    expect(hitsToThreshold(1000, 250, 0)).toBe(4);
    expect(hitsToThreshold(1000, 2000, 25)).toBe(1);
  });
});

describe('economy preview (ratio vs economy.incomeToPotionRatio, D-005)', () => {
  it('income at multiplier 1.0 is about 1,470 gold/h (within 3 %)', () => {
    expect(
      Math.abs(
        incomePerHour_gold(p) / num(cfg.economy, 'gddReferenceEconomy.incomePerWalkingHour_gold') -
          1,
      ),
    ).toBeLessThanOrEqual(0.03);
  });
  it('potion cost is computed from the damage model, not taken from the GDD 600', () => {
    const fitted = Math.round(fitHitChance_pct(25, 25, 45, 55, p).exact_pct);
    const small = p.potions['hpSmall'];
    if (small === undefined) throw new Error('hpSmall missing');
    const row = potionCostRow(25, { kind: 'reference' }, 'hpSmall', false, p, fitted);
    const b = balancedBuild(25, p);
    const damage = survivalRow(25, { kind: 'reference' }, p).damage;
    const checksPerHour = 3600 / ((p.attack.intervalMin_s + p.attack.intervalMax_s) / 2);
    const lossPerHour = checksPerHour * (fitted / 100) * (damage / b.hp) * 100;
    expect(row.hpLoss_pctPerHour).toBeCloseTo(lossPerHour, 6);
    expect(row.gold).toBeCloseTo((lossPerHour / small.heal_pctMaxHp) * small.buyPrice_gold, 6);
    const setup = runSetup(25, { kind: 'reference' }, p, {
      stopAt_pct: 0,
      hitChance_pct: fitted,
      maxDuration_s: 1,
    });
    const mc = potionCostMonteCarlo(
      { ...setup, potion: { threshold_pct: p.safety.autoPotionThreshold_pct, ...small } },
      2000,
      mulberry32(11),
    );
    expect(Math.abs(mc.goldPerHour / row.gold - 1)).toBeLessThanOrEqual(0.05);
  });
  it('small potions without the VIT bonus land inside economy.incomeToPotionRatio (the GDD reading)', () => {
    const fitted = Math.round(fitHitChance_pct(25, 25, 45, 55, p).exact_pct);
    const ratio =
      incomePerHour_gold(p) /
      potionCostRow(25, { kind: 'reference' }, 'hpSmall', false, p, fitted).gold;
    expect(ratio).toBeGreaterThanOrEqual(p.income.ratioMinAccepted);
    expect(ratio).toBeLessThanOrEqual(p.income.ratioTargetMax);
  });
  it('finding F-12: with the balanced-build VIT bonus the ratio is above the target (reported, not fixed)', () => {
    const fitted = Math.round(fitHitChance_pct(25, 25, 45, 55, p).exact_pct);
    const ratio =
      incomePerHour_gold(p) /
      potionCostRow(25, { kind: 'reference' }, 'hpSmall', true, p, fitted).gold;
    expect(ratio).toBeGreaterThan(p.income.ratioTargetMax);
  });
});

describe('golden vectors (design/systems/test-vectors)', () => {
  const files = readdirSync(VECTOR_DIR).filter((f) => f.endsWith('.json'));
  it('the four required files exist', () => {
    for (const name of ['buff-stacking', 'exp-curve', 'gear', 'damage'])
      expect(files).toContain(`${name}.json`);
  });
  it('are up to date with config/balance and gdd-reference.json', () => {
    const fresh = generate();
    for (const [name, text] of Object.entries(fresh))
      expect(readFileSync(`${VECTOR_DIR}${name}.json`, 'utf8')).toBe(text);
  });
  for (const file of files) {
    it(`${file}: every vector has input/expected/tolerance/source and the reference implementation meets it`, () => {
      const vf = JSON.parse(readFileSync(`${VECTOR_DIR}${file}`, 'utf8')) as GoldenVectorFile<
        VectorInput,
        VectorOutput
      >;
      expect(typeof vf.formula).toBe('string');
      expect(vf.vectors.length).toBeGreaterThan(0);
      for (const v of vf.vectors) {
        expect(typeof v.source).toBe('string');
        expect(v.tolerance).toBeGreaterThanOrEqual(0);
        const actual = evaluateVector(v.input);
        expect(isWithinTolerance(actual, v.expected, v.tolerance), `${file}: ${v.source}`).toBe(
          true,
        );
      }
    });
  }
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(mean(Array.from({ length: 20000 }, mulberry32(1)))).toBeCloseTo(0.5, 1);
  });
});
