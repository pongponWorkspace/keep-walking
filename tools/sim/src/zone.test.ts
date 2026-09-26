// Tests for D-112 (game-director J-8): Z = clamp(player level, range), the gap counted once from
// the edge, R43 on every pilot range that covers level 1, and no exp runaway inside or above a range.
import { describe, expect, it } from 'vitest';
import { expMultiplier, expPerTick } from '@keep-walking/shared/formulas';
import { loadBalanceConfig, str } from './config';
import { soloBuffPct, soloDamage, soloTickExp } from './loop';
import type { Scenario } from './loop-scenarios';
import { CLASSES, loopInput, loopParamsFromConfig, loopStats, phase2Stats } from './loop-scenarios';
import { ZONE_LEVEL_FROM, levelsOutsideRange, zoneLevelFor, zoneLevelMidpointA1 } from './zone';

const cfg = loadBalanceConfig();
const p = loopParamsFromConfig(cfg);
const def = phase2Stats(cfg).def;
/** Level ranges of design/levels/pilot-dungeons.md 3.1-3.3. */
const PILOT_RANGES: [number, number][] = [
  [1, 5],
  [1, 35],
  [5, 15],
  [10, 20],
  [10, 25],
  [15, 30],
  [20, 30],
  [20, 35],
  [25, 45],
  [30, 50],
];
const R43_RUNS = 200;
const SECONDS_PER_MINUTE = 60;

describe('zone level (D-112)', () => {
  it('config names the implemented rule', () => {
    expect(str(cfg.combat, 'monsterAttack.zoneLevelFrom')).toBe(ZONE_LEVEL_FROM);
  });
  it('clamps the player level into the range', () => {
    expect(zoneLevelFor(10, 15, 25)).toBe(15);
    expect(zoneLevelFor(18, 15, 25)).toBe(18);
    expect(zoneLevelFor(30, 15, 25)).toBe(25);
    expect(zoneLevelFor(1, 1, 35)).toBe(1);
    expect(zoneLevelFor(1, 1, 1)).toBe(1);
    expect(() => zoneLevelFor(1, 5, 1)).toThrow(RangeError);
    expect(zoneLevelMidpointA1(1, 35)).toBe(18);
  });
  it('the gap multiplier counts once, from the nearest edge', () => {
    // Level 1 in 20-30: Z = 20 and x1.25^19, not Z = 25 and x1.25^19.
    const edge = soloDamage(20, 'ranged', 20, 30, def, p);
    expect(soloDamage(1, 'ranged', 20, 30, def, p)).toBeCloseTo(
      edge * p.monster.damageMultPerLevelBelowRange ** 19,
      6,
    );
    // Above the range: damage stays at the top edge (F06 R09), exp gap from the top edge.
    expect(soloDamage(40, 'ranged', 20, 30, def, p)).toBeCloseTo(
      soloDamage(30, 'ranged', 20, 30, def, p),
      9,
    );
    expect(levelsOutsideRange(40, 20, 30)).toBe(10);
  });
  it('a level inside any range plays exactly like a matched range (principle 4)', () => {
    for (const [min, max] of PILOT_RANGES)
      for (let level = min; level <= max; level += 1) {
        expect(soloDamage(level, 'support', min, max, def, p)).toBeCloseTo(
          soloDamage(level, 'support', level, level, def, p),
          9,
        );
        expect(soloTickExp(level, 'magic', min, max, 1, p)).toBeCloseTo(
          soloTickExp(level, 'magic', level, level, 1, p),
          9,
        );
      }
  });
  it('no exp runaway inside or above a range: exp per tick <= the matched-level rate', () => {
    for (const [min, max] of PILOT_RANGES)
      for (let level = min; level <= p.exp.maxLevel; level += 1)
        for (const c of ['ranged', 'magic'] as const) {
          const magic = c === 'magic' ? soloBuffPct(p.roles.magic, level, p.buff) : null;
          const matched = expPerTick(level, p.exp) * expMultiplier(magic, 0, p.expMult);
          expect(soloTickExp(level, c, min, max, 1, p)).toBeLessThanOrEqual(matched * (1 + 1e-12));
        }
  });
});

describe('F06 R43 on every pilot range that covers level 1 (runSeed 1..200)', () => {
  const window_min = (2 * p.window_s) / SECONDS_PER_MINUTE;
  for (const [min, max] of PILOT_RANGES.filter(([lo]) => lo <= 1))
    for (const ownClass of CLASSES)
      it(`${min}-${max} level 1 ${ownClass}, no potions: median >= ${window_min} min`, () => {
        const s: Scenario = {
          tableId: max <= 5 ? 'pocketParkDefault' : 'largeParkDefault',
          smallDungeon: true,
          ownClass,
          level: 1,
          rangeMin: min,
          rangeMax: max,
          withPotionDrops: false,
          autoRetreatEnabled: true,
          limit_s: 21600,
        };
        expect(
          loopStats(loopInput(cfg, s, 0, false), 1, R43_RUNS).median_min,
        ).toBeGreaterThanOrEqual(window_min);
      });
});
