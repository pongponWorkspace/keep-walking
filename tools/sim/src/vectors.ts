// Builds design/systems/test-vectors/*.json (ADR 0001 section 3.9).
// Two kinds of vector:
//  - GDD vectors: expected = the GDD number, tolerance from tools/sim/gdd-reference.json.
//  - sim vectors: normal and boundary cases, expected = reference implementation, tolerance 1e-6.
// Every input is self-contained (all parameters inline), so vectors test the formula itself.
// Literals (ADR 0001 section 3.5): a boundary that depends on config (cap, party size, max
// level, auto-retreat, tier edges, level-gap floor) is derived from SimParams so it
// moves with config. The only numbers written here are example inputs in CASE, which are not
// balance values.
import type { GoldenVector, GoldenVectorFile } from '@keep-walking/shared';
import { isWithinTolerance } from '@keep-walking/shared';
import { balancedAllocation, tierGear } from './build';
import type { GddReference } from './gdd';
import type { Role, SimParams } from './params';
import { ROLES } from './params';
import { fitHitChance_pct } from './scenarios';
import type { VectorInput, VectorOutput } from './vector-eval';
import { evaluateVector } from './vector-eval';
import type { EconomyInputs } from './vectors-economy';
import { dropsVectors, economyVectors, partyVectors } from './vectors-economy';

export type Vector = GoldenVector<VectorInput, VectorOutput>;
export type VectorFile = GoldenVectorFile<VectorInput, VectorOutput>;

export const SIM_TOLERANCE = 1e-6;
const SIM_DECIMALS = 6;
const DECIMAL_BASE = 10;
const SIM = 'sim run P1-F03-T07 (reference implementation tools/sim/src/formulas.ts)';

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

/** Vector whose expected value is computed by the reference implementation. */
function sim(input: VectorInput, note: string): Vector {
  const expected = roundSim(evaluateVector(input));
  const tolerance =
    typeof expected === 'number' || (expected !== null && typeof expected === 'object')
      ? SIM_TOLERANCE
      : 0;
  return { input, expected, tolerance, source: `${SIM} · ${note}` };
}

/** Vector whose expected value is the GDD number. */
function gdd(
  input: VectorInput,
  expected: VectorOutput,
  tolerance: number,
  source: string,
): Vector {
  return { input, expected, tolerance, source };
}

const buffIn = (p: SimParams) => ({
  pPerMemberBase: p.buff.pPerMemberBase,
  pLevelDivisor: p.buff.pLevelDivisor,
});
const roleIn = (p: SimParams, role: Role) => ({
  role,
  base_pct: p.roles[role].base_pct,
  cap_pct: p.roles[role].cap_pct,
});
const expIn = (p: SimParams) => ({ ...p.exp });
const repeat = (level: number, count: number) => Array.from({ length: count }, () => level);
const roundTo = (value: number, decimals: number) =>
  Math.round(value * DECIMAL_BASE ** decimals) / DECIMAL_BASE ** decimals;

/** Smallest gap where mult^gap reaches the floor (the first gap that the floor clamps). */
export function firstGapAtFloor(multPerLevel: number, floor: number): number {
  let gap = 0;
  while (multPerLevel ** gap > floor) gap += 1;
  return gap;
}

/**
 * Example inputs for golden vectors: levels, gaps, HP and damage chosen to exercise a formula.
 * None is a balance value; every config-dependent boundary is derived from params instead.
 */
const CASE = {
  mixedLevels: { low: 10, mid: 25 },
  memberLevels: { mid: 25, high: 50 },
  gapOutsideRange: 5,
  gapPastFloorExtra: 13,
  expLevels: { low: 10, high: 30 },
  zoneLevels: { low: 10, mid: 25, high: 40 },
  ticksPerLevel: { level: 20, zoneLevel: 30 },
  magicBuffAboveCap_pct: 10,
  expGapSmall: 1,
  expGapNoMagic: 3,
  tierProbeLevel: 25,
  zoneRanges: { a: { min: 15, max: 25 }, b: { min: 20, max: 25 }, topWidth: 5 },
  levelsBelowRange: { some: 2, above: -3, combined: 3 },
  hits: { maxHp: 1000, damage: 250, exactHits: 3, overkillDamage: 2000, count: 24 },
  exampleHitChance_pct: 50,
  printed: { damageDecimals: 1, hpLossDecimals: 2 },
  baseCapTest: { cap_pct: 50, atTwoFifths_pct: 20, atOneFifth_pct: 10 },
  bossEnhanceZero: 0,
} as const;

export function buffStackingVectors(p: SimParams, g: GddReference): VectorFile {
  const v: Vector[] = [];
  const partyMax = p.partyMaxMembers;
  const L = g.buff.memberLevel;
  g.buff.tankerByCount_pct.forEach((expected, i) => {
    v.push(
      gdd(
        { fn: 'roleBuff', ...roleIn(p, 'tanker'), memberLevels: repeat(L, i + 1), ...buffIn(p) },
        expected,
        g.buff.tolerance_pct,
        `${g.buff.source} · Tanker L${L} x${i + 1}`,
      ),
    );
  });
  for (const role of ROLES) {
    const expected = g.buff.singleMember_pct[role];
    if (expected === undefined) continue;
    v.push(
      gdd(
        { fn: 'roleBuff', ...roleIn(p, role), memberLevels: [L], ...buffIn(p) },
        expected,
        g.buff.tolerance_pct,
        `${g.buff.source} · ${role} L${L} x1`,
      ),
    );
  }
  const eq = g.buff.equivalence;
  const eqRole = eq.role as Role;
  const oneMember = roundSim(
    evaluateVector({
      fn: 'roleBuff',
      ...roleIn(p, eqRole),
      memberLevels: [eq.oneMemberLevel],
      ...buffIn(p),
    }),
  );
  v.push(
    gdd(
      {
        fn: 'roleBuff',
        ...roleIn(p, eqRole),
        memberLevels: [eq.twoMembersLevel, eq.twoMembersLevel],
        ...buffIn(p),
      },
      oneMember,
      eq.tolerance_pct,
      `${g.buff.source} · ${eq.role} L${eq.twoMembersLevel} x2 must equal L${eq.oneMemberLevel} x1 (expected = L${eq.oneMemberLevel} x1 value, F-5)`,
    ),
  );
  for (const role of ROLES) {
    v.push(
      sim(
        { fn: 'roleBuff', ...roleIn(p, role), memberLevels: [], ...buffIn(p) },
        `boundary: 0 members inside the dungeon → 0 (missing debuff applies instead)`,
      ),
    );
    v.push(
      sim(
        { fn: 'roleBuff', ...roleIn(p, role), memberLevels: [p.exp.startLevel], ...buffIn(p) },
        `boundary: one member at level ${p.exp.startLevel}`,
      ),
    );
    v.push(
      sim(
        { fn: 'roleBuff', ...roleIn(p, role), memberLevels: [p.exp.maxLevel], ...buffIn(p) },
        `boundary: one member at level ${p.exp.maxLevel}`,
      ),
    );
    v.push(
      sim(
        {
          fn: 'roleBuff',
          ...roleIn(p, role),
          memberLevels: repeat(p.exp.maxLevel, partyMax),
          ...buffIn(p),
        },
        `boundary: ${partyMax} members (party max) at level ${p.exp.maxLevel}, below cap`,
      ),
    );
    const asymptote = 200;
    v.push(
      gdd(
        {
          fn: 'roleBuff',
          ...roleIn(p, role),
          memberLevels: repeat(p.exp.maxLevel, asymptote),
          ...buffIn(p),
        },
        p.roles[role].cap_pct,
        SIM_TOLERANCE,
        `formula property: buff approaches cap and never exceeds it (${asymptote} members, config classes.json#roles.${role}.cap_pct)`,
      ),
    );
  }
  v.push(
    sim(
      {
        fn: 'roleBuff',
        ...roleIn(p, 'tanker'),
        memberLevels: [CASE.mixedLevels.low, CASE.mixedLevels.mid, p.exp.maxLevel],
        ...buffIn(p),
      },
      'normal: mixed levels',
    ),
  );
  const gapIn = {
    pMultPerLevelOutsideRange: p.gapContribution.pMultPerLevelOutsideRange,
    pMultFloor: p.gapContribution.pMultFloor,
  };
  const pFloorGap = firstGapAtFloor(gapIn.pMultPerLevelOutsideRange, gapIn.pMultFloor);
  const mid = CASE.memberLevels.mid;
  const memberCases: { level: number; gap: number; note: string }[] = [
    { level: p.exp.startLevel, gap: 0, note: 'level 1 → 1.02' },
    { level: mid, gap: 0, note: 'level 25 → 1.5' },
    { level: CASE.memberLevels.high, gap: 0, note: 'level 50 → 2.0' },
    { level: p.exp.maxLevel, gap: 0, note: 'level 60 → 2.2' },
    {
      level: mid,
      gap: CASE.gapOutsideRange,
      note: `A-P1-F03-T06-14: ${CASE.gapOutsideRange} levels outside range → x${gapIn.pMultPerLevelOutsideRange}^${CASE.gapOutsideRange}`,
    },
    {
      level: mid,
      gap: pFloorGap,
      note: `A-14: gap ${pFloorGap} hits floor ${gapIn.pMultFloor}`,
    },
    {
      level: mid,
      gap: pFloorGap + CASE.gapPastFloorExtra,
      note: `A-14: gap ${pFloorGap + CASE.gapPastFloorExtra} stays at floor`,
    },
  ];
  for (const { level, gap, note } of memberCases) {
    v.push(sim({ fn: 'memberP', level, levelsOutsideRange: gap, ...buffIn(p), ...gapIn }, note));
  }
  const rule = {
    minBaseToCapRatio: p.baseCapRule.minBaseToCapRatio,
    maxBaseToCapRatio: p.baseCapRule.maxBaseToCapRatio,
    intentionalExceptions: p.baseCapRule.intentionalExceptions,
  };
  for (const role of ROLES)
    v.push(
      sim(
        { fn: 'baseCapRule', ...roleIn(p, role), ...rule },
        `config role ${role} (Support = EXCEPTION per D-004)`,
      ),
    );
  v.push(
    sim(
      { fn: 'baseCapRule', ...roleIn(p, 'support'), ...rule, intentionalExceptions: [] },
      'boundary: Support (config base/cap) without the D-004 exception → FAIL',
    ),
  );
  v.push(
    sim(
      {
        fn: 'baseCapRule',
        role: 'test',
        base_pct: CASE.baseCapTest.atTwoFifths_pct,
        cap_pct: CASE.baseCapTest.cap_pct,
        ...rule,
      },
      'boundary: exactly 2/5 → PASS',
    ),
  );
  v.push(
    sim(
      {
        fn: 'baseCapRule',
        role: 'test',
        base_pct: CASE.baseCapTest.atOneFifth_pct,
        cap_pct: CASE.baseCapTest.cap_pct,
        ...rule,
      },
      'boundary: 1/5 → FAIL',
    ),
  );
  return { formula: 'buffStacking', vectors: v };
}

export function classChangeVectors(p: SimParams, g: GddReference): VectorFile {
  const cc = { ...p.classChange };
  const v: Vector[] = Object.entries(g.classChange.costByLevel_gold).map(([level, cost]) =>
    gdd(
      { fn: 'classChangeCost', level: Number(level), ...cc },
      cost,
      0,
      `${g.classChange.source} · level ${level}`,
    ),
  );
  v.push(sim({ fn: 'classChangeCost', level: p.exp.startLevel, ...cc }, 'boundary: level 1'));
  v.push(
    sim(
      { fn: 'classChangeCost', level: p.exp.maxLevel, ...cc },
      `boundary: level ${p.exp.maxLevel}`,
    ),
  );
  return { formula: 'classChange', vectors: v };
}

export function expCurveVectors(p: SimParams, g: GddReference): VectorFile {
  const e = g.exp;
  const tick = p.healShield.rewardTickInterval_s;
  const v: Vector[] = [];
  for (const [level, ticks] of Object.entries(e.ticksPerLevel)) {
    const L = Number(level);
    if (L < p.exp.maxLevel) {
      v.push(
        gdd(
          { fn: 'ticksPerLevel', level: L, zoneLevel: L, expMultiplier: 1, ...expIn(p) },
          ticks,
          e.ticksPerLevelTolerance,
          `${e.source} · tick table L${L}`,
        ),
      );
    } else {
      v.push(
        gdd(
          { fn: 'ticksPerLevelCurve', level: L, ...expIn(p) },
          ticks,
          e.ticksPerLevelTolerance,
          `${e.source} · tick table L${L}: max level has no expToNext, row checked on the curve 2 x L^0.7 (finding F-11)`,
        ),
      );
      v.push(
        gdd(
          { fn: 'ticksPerLevel', level: L - 1, zoneLevel: L - 1, expMultiplier: 1, ...expIn(p) },
          ticks,
          e.ticksPerLevelTolerance,
          `${e.source} · tick table row L${L} read as the last real level-up L${L - 1} (F-11)`,
        ),
      );
    }
  }
  for (const [level, minutes] of Object.entries(e.walkMinutesPerLevel)) {
    const L = Number(level);
    const fn =
      L < p.exp.maxLevel
        ? { fn: 'walkMinutesPerLevel', zoneLevel: L, expMultiplier: 1 }
        : { fn: 'walkMinutesPerLevelCurve' };
    v.push(
      gdd(
        { ...fn, level: L, rewardTickInterval_s: tick, ...expIn(p) },
        minutes,
        e.walkMinutesTolerance,
        `${e.source} · walk minutes L${L}${L < p.exp.maxLevel ? '' : ' (curve, F-11)'}`,
      ),
    );
  }
  const max = p.exp.maxLevel;
  const start = p.exp.startLevel;
  v.push(
    gdd(
      { fn: 'ticksBetween', fromLevel: start, toLevel: max, expMultiplier: 1, ...expIn(p) },
      e.totalTicksToMax,
      e.totalTicksToMax * e.totalsTolerance_ratio,
      `${e.source} · total ticks 1→60 (F-4, tolerance 3%)`,
    ),
  );
  v.push(
    gdd(
      {
        fn: 'walkHoursBetween',
        fromLevel: start,
        toLevel: max,
        expMultiplier: 1,
        rewardTickInterval_s: tick,
        ...expIn(p),
      },
      e.totalHoursToMax,
      e.totalHoursToMax * e.totalsTolerance_ratio,
      `${e.source} · total hours 1→60 (F-4, tolerance 3%)`,
    ),
  );
  v.push(
    gdd(
      {
        fn: 'walkHoursBetween',
        fromLevel: start,
        toLevel: e.hoursToLevel,
        expMultiplier: 1,
        rewardTickInterval_s: tick,
        ...expIn(p),
      },
      e.hoursToLevelValue,
      e.hoursToLevelValue * e.hoursToLevelTolerance_ratio,
      `${e.source} · hours to reach level ${e.hoursToLevel} (F-4 measured -3.4%, tolerance 4%)`,
    ),
  );
  v.push(
    sim(
      { fn: 'ticksBetween', fromLevel: start, toLevel: max, expMultiplier: 1, ...expIn(p) },
      'exact total ticks 1→60 at multiplier 1.0',
    ),
  );
  v.push(
    sim(
      {
        fn: 'ticksBetween',
        fromLevel: start,
        toLevel: max,
        expMultiplier: p.expMult.noMagicMult,
        ...expIn(p),
      },
      'F-2: solo without Magic (x0.6)',
    ),
  );
  for (const L of [start, CASE.expLevels.low, CASE.expLevels.high, max - 1])
    v.push(
      sim(
        { fn: 'expToNext', level: L, ...expIn(p) },
        L === start
          ? 'boundary: level 1'
          : L === max - 1
            ? `boundary: level ${max - 1} (last level with expToNext)`
            : 'normal',
      ),
    );
  v.push(
    gdd(
      { fn: 'expToNext', level: max, ...expIn(p) },
      null,
      0,
      'GDD > Progression > เลเวลสูงสุด 60: no expToNext at max level (implementations return null or reject)',
    ),
  );
  for (const Z of [start, CASE.zoneLevels.low, CASE.zoneLevels.mid, max])
    v.push(
      sim(
        { fn: 'expPerTick', zoneLevel: Z, ...expIn(p) },
        Z === start || Z === max ? 'boundary' : 'normal',
      ),
    );
  v.push(
    sim(
      { fn: 'ticksPerLevel', level: start, zoneLevel: start, expMultiplier: 1, ...expIn(p) },
      'boundary: level 1 = 2 ticks',
    ),
  );
  v.push(
    sim(
      {
        fn: 'ticksPerLevel',
        level: CASE.ticksPerLevel.level,
        zoneLevel: CASE.ticksPerLevel.zoneLevel,
        expMultiplier: 1,
        ...expIn(p),
      },
      'normal: zone above player level',
    ),
  );
  const em = { ...p.expMult };
  const magicCap = p.roles.magic.cap_pct;
  const magicL = g.buff.memberLevel;
  const magicOne = g.buff.singleMember_pct['magic'] as number;
  const expFloorGap = firstGapAtFloor(em.levelGapMultPerLevel, em.levelGapMultFloor);
  const expMultCases: { magicBuff_pct: number | null; gap: number; note: string }[] = [
    { magicBuff_pct: null, gap: 0, note: `no Magic → x${em.noMagicMult}` },
    { magicBuff_pct: magicOne, gap: 0, note: `Magic L${magicL} x1 → x1.232` },
    { magicBuff_pct: magicCap, gap: 0, note: `Magic at cap → x${em.magicBuffMaxMult}` },
    {
      magicBuff_pct: magicCap + CASE.magicBuffAboveCap_pct,
      gap: 0,
      note: `boundary: buff above cap clamps to x${em.magicBuffMaxMult}`,
    },
    {
      magicBuff_pct: 0,
      gap: CASE.expGapSmall,
      note: `gap ${CASE.expGapSmall} → x${em.levelGapMultPerLevel} (magicBuff 0 = Magic present with 0%)`,
    },
    {
      magicBuff_pct: 0,
      gap: expFloorGap,
      note: `boundary: gap ${expFloorGap} → floor ${em.levelGapMultFloor}`,
    },
    {
      magicBuff_pct: null,
      gap: CASE.expGapNoMagic,
      note: `no Magic and gap ${CASE.expGapNoMagic}`,
    },
  ];
  for (const { magicBuff_pct, gap, note } of expMultCases) {
    v.push(sim({ fn: 'expMultiplier', magicBuff_pct, levelsOutsideRange: gap, ...em }, note));
  }
  return { formula: 'expCurve', vectors: v };
}

const gearIn = (p: SimParams) => ({
  gearStatCoef: p.gear.gearStatCoef,
  gearStatTierExponent: p.gear.gearStatTierExponent,
  enhanceBonusPerLevel: p.gear.enhanceBonusPerLevel,
  minTier: p.gear.minTier,
  maxTier: p.gear.maxTier,
});
const statIn = (p: SimParams) => ({
  pointsPerLevel: p.stats.pointsPerLevel,
  baseStats: { ...p.stats.base },
  statPerPoint: { ...p.stats.perPoint },
  slots: {
    weapon: { ...p.slots.weapon },
    armor: { ...p.slots.armor },
    charm: { ...p.slots.charm },
    boots: { ...p.slots.boots },
  },
  defSoftcap: p.monster.defSoftcap,
});
const noGear = { weapon: 0, armor: 0, charm: 0, boots: 0 };

export function gearVectors(p: SimParams, g: GddReference): VectorFile {
  const v: Vector[] = [];
  for (const [tier, values] of Object.entries(g.gear.byTier)) {
    values.forEach((expected, i) => {
      const enhance = g.gear.enhanceLevels[i] as number;
      const input = { fn: 'gearStat', tier: Number(tier), enhance, ...gearIn(p) };
      v.push(
        gdd(
          input,
          expected,
          g.gear.tolerance,
          `${g.gear.source} · tier ${tier} +${enhance} (F-3 / D-022: formula rounds once, tolerance 1)`,
        ),
      );
      v.push(sim(input, `exact formula value for tier ${tier} +${enhance}`));
    });
  }
  v.push(
    sim(
      { fn: 'gearStat', tier: p.gear.minTier, enhance: 1, ...gearIn(p) },
      `normal: tier ${p.gear.minTier} +1`,
    ),
  );
  v.push(
    sim(
      {
        fn: 'bossGearStat',
        enhance: CASE.bossEnhanceZero,
        bossTier: p.gear.bossTier,
        bossBaseStatMult: p.gear.bossBaseStatMult,
        ...gearIn(p),
      },
      `boss gear tier ${p.gear.bossTier} x${p.gear.bossBaseStatMult} at +0`,
    ),
  );
  v.push(
    sim(
      {
        fn: 'bossGearStat',
        enhance: p.maxEnhanceLevel,
        bossTier: p.gear.bossTier,
        bossBaseStatMult: p.gear.bossBaseStatMult,
        ...gearIn(p),
      },
      `boundary: boss gear at +${p.maxEnhanceLevel} (v1 cap, A-7a)`,
    ),
  );
  // Tier edges from equipment.json#tierByLevel: first level, last level of tier 1, first of
  // tier 2, first of tier 3, last of the second-highest tier, first of the top tier, max level.
  const t = p.tierLevelMax;
  const edge = (i: number) => t[i] as number;
  const topStart = t.length - 2;
  const tierProbe = [
    p.exp.startLevel,
    edge(0),
    edge(0) + 1,
    edge(1) + 1,
    edge(topStart),
    edge(topStart) + 1,
    p.exp.maxLevel,
  ];
  for (const level of tierProbe) {
    v.push(
      sim(
        { fn: 'tierForLevel', level, levelMaxForTier: [...p.tierLevelMax] },
        'A-P1-F03-T06-5 tier boundaries',
      ),
    );
  }
  const x = g.extremes;
  const pts = p.stats.pointsPerLevel * x.level;
  for (const stat of ['atk', 'def', 'hp'] as const) {
    const allocation = { atk: 0, def: 0, hp: 0, vit: 0, [stat]: pts };
    const input = { fn: 'characterStats', level: x.level, allocation, gear: noGear, ...statIn(p) };
    const out = evaluateVector(input) as Record<string, number>;
    const expected = { ...(roundSim(out) as Record<string, number>), [stat]: x[stat] };
    v.push(
      gdd(
        input,
        expected,
        SIM_TOLERANCE,
        `${x.source} · all ${pts} points in ${stat.toUpperCase()}, no gear (${stat} = GDD value, other stats from formula)`,
      ),
    );
  }
  v.push(
    gdd(
      { fn: 'defReduction_pct', def: x.def, defSoftcap: p.monster.defSoftcap },
      x.defReduction_pct,
      x.defReductionTolerance_pct,
      `${x.source} · DEF ${x.def}`,
    ),
  );
  for (const level of [p.exp.startLevel, CASE.tierProbeLevel, p.exp.maxLevel]) {
    v.push(
      sim(
        {
          fn: 'characterStats',
          level,
          allocation: balancedAllocation(level, p.stats),
          gear: tierGear(level, p),
          ...statIn(p),
        },
        `balanced build L${level}: points split 4 ways, every slot tier-by-level +0 (sim assumption, balance-model 3.2)`,
      ),
    );
  }
  v.push(
    sim(
      {
        fn: 'characterStats',
        level: p.exp.startLevel,
        allocation: { atk: 0, def: 0, hp: 0, vit: 0 },
        gear: noGear,
        ...statIn(p),
      },
      `boundary: level ${p.exp.startLevel}, nothing allocated = base stats`,
    ),
  );
  return { formula: 'gear', vectors: v };
}

const monsterIn = (p: SimParams) => ({ ...p.monster });

export function damageVectors(p: SimParams, g: GddReference): VectorFile {
  const v: Vector[] = [];
  const s = g.survival;
  const start = p.exp.startLevel;
  const max = p.exp.maxLevel;
  const zr = CASE.zoneRanges;
  for (const [rangeMin, rangeMax] of [
    [zr.a.min, zr.a.max],
    [zr.b.min, zr.b.max],
    [start, start],
    [max - zr.topWidth, max],
  ]) {
    v.push(
      sim(
        { fn: 'zoneLevel', rangeMin, rangeMax },
        'A-P1-F03-T06-1: Z = round(midpoint), .5 rounds up',
      ),
    );
  }
  for (const Z of [start, CASE.zoneLevels.low, CASE.zoneLevels.mid, CASE.zoneLevels.high, max])
    v.push(
      sim(
        {
          fn: 'monsterAtk',
          zoneLevel: Z,
          monsterAtkCoef: p.monster.monsterAtkCoef,
          monsterAtkExponent: p.monster.monsterAtkExponent,
        },
        'monsterATK = 3 x Z^1.3',
      ),
    );
  v.push(
    sim(
      { fn: 'defReduction_pct', def: 0, defSoftcap: p.monster.defSoftcap },
      'boundary: DEF 0 → 0%',
    ),
  );
  v.push(
    gdd(
      { fn: 'defReduction_pct', def: g.defense.def, defSoftcap: p.monster.defSoftcap },
      g.defense.defReduction_pct,
      0,
      g.defense.source,
    ),
  );
  // Level-25 balanced build (same build as the survival vectors below).
  const L = s.fitLevel;
  const build = evaluateVector({
    fn: 'characterStats',
    level: L,
    allocation: balancedAllocation(L, p.stats),
    gear: tierGear(L, p),
    ...statIn(p),
  }) as Record<string, number>;
  const buildHp = build['hp'] as number;
  const buildDef = build['def'] as number;
  const buildVit = build['vit'] as number;
  const tankerCap = p.roles.tanker.cap_pct;
  const tankerL25 = g.buff.tankerByCount_pct[0] as number;
  const retreat = p.safety.autoRetreatThreshold_pct;
  const small = p.potions['hpSmall'] as { heal_pctMaxHp: number; buyPrice_gold: number };
  const meanInterval_s = (p.attack.intervalMin_s + p.attack.intervalMax_s) / 2;
  const base = {
    zoneLevel: L,
    def: buildDef,
    levelsBelowRange: 0,
    failedRaidWeek: false,
    ...monsterIn(p),
  };
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, def: 0, tankerBuff_pct: 0 },
      'boundary: DEF 0, damage x1.0 → equals monsterATK',
    ),
  );
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, tankerBuff_pct: 0 },
      'L25 balanced build DEF, damage x1.0 (D-020 reference)',
    ),
  );
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, tankerBuff_pct: tankerL25 },
      `with Tanker buff ${tankerL25}%`,
    ),
  );
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, tankerBuff_pct: null },
      'no Tanker inside → missing debuff x1.6',
    ),
  );
  v.push(
    sim(
      {
        fn: 'damagePerHit',
        ...base,
        tankerBuff_pct: 0,
        levelsBelowRange: CASE.levelsBelowRange.some,
      },
      `A-2: ${CASE.levelsBelowRange.some} levels below range → x${p.monster.damageMultPerLevelBelowRange}^${CASE.levelsBelowRange.some}`,
    ),
  );
  v.push(
    sim(
      {
        fn: 'damagePerHit',
        ...base,
        tankerBuff_pct: 0,
        levelsBelowRange: CASE.levelsBelowRange.above,
      },
      'boundary: above range → no gap multiplier',
    ),
  );
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, tankerBuff_pct: 0, failedRaidWeek: true },
      'A-16: week after a failed raid → monsterATK x2',
    ),
  );
  v.push(
    sim(
      {
        fn: 'damagePerHit',
        ...base,
        tankerBuff_pct: null,
        levelsBelowRange: CASE.levelsBelowRange.combined,
        failedRaidWeek: true,
      },
      `combined: no Tanker, ${CASE.levelsBelowRange.combined} below range, failed raid week`,
    ),
  );
  v.push(
    sim(
      { fn: 'damagePerHit', ...base, tankerBuff_pct: tankerCap },
      `boundary: Tanker buff at cap ${tankerCap}%`,
    ),
  );
  // Damage per hit of the build at damage x1.0, as printed in the sim report (1 decimal).
  const buildDamage = roundTo(
    evaluateVector({ fn: 'damagePerHit', ...base, tankerBuff_pct: 0 }) as number,
    CASE.printed.damageDecimals,
  );
  const h = CASE.hits;
  // Damage chosen so exactly h.exactHits hits reach the auto-retreat line (250 at 25%).
  const hpToRetreat = h.maxHp * (1 - retreat / 100);
  const exactDamage = hpToRetreat / h.exactHits;
  const hitCases: { maxHp: number; damage: number; threshold_pct: number; note: string }[] = [
    {
      maxHp: h.maxHp,
      damage: exactDamage,
      threshold_pct: retreat,
      note: `boundary: exact multiple, ${hpToRetreat}/${exactDamage} = ${h.exactHits} hits reach ${retreat}%`,
    },
    {
      maxHp: h.maxHp,
      damage: h.damage,
      threshold_pct: 0,
      note: `boundary: HP 0 needs ${Math.ceil(h.maxHp / h.damage)} hits`,
    },
    {
      maxHp: h.maxHp,
      damage: h.overkillDamage,
      threshold_pct: retreat,
      note: 'boundary: one hit larger than max HP → 1',
    },
    {
      maxHp: buildHp,
      damage: buildDamage,
      threshold_pct: retreat,
      note: `normal: L${L} build to auto-retreat`,
    },
    { maxHp: buildHp, damage: buildDamage, threshold_pct: 0, note: `normal: L${L} build to HP 0` },
  ];
  for (const { maxHp, damage, threshold_pct, note } of hitCases) {
    v.push(sim({ fn: 'hitsToThreshold', maxHp, damage, threshold_pct }, note));
  }
  v.push(
    sim(
      {
        fn: 'expectedSurvival_min',
        hits: h.count,
        hitChance_pct: CASE.exampleHitChance_pct,
        meanInterval_s,
      },
      'E[time] = hits / p x mean interval',
    ),
  );
  // Survival of the balanced build (stats from gear.json characterStats vectors).
  const fit = fitHitChance_pct(
    s.fitLevel,
    s.tankerLevel,
    s.referenceMatchingLevel_min,
    s.withTanker_min,
    p,
  );
  const hitChance_pct = Math.round(fit.exact_pct);
  const tankerBuff = evaluateVector({
    fn: 'roleBuff',
    ...roleIn(p, 'tanker'),
    memberLevels: [s.tankerLevel],
    ...buffIn(p),
  }) as number;
  const surv = {
    fn: 'survivalMinutes',
    maxHp: buildHp,
    def: buildDef,
    zoneLevel: L,
    levelsBelowRange: 0,
    failedRaidWeek: false,
    hitChance_pct,
    intervalMin_s: p.attack.intervalMin_s,
    intervalMax_s: p.attack.intervalMax_s,
    ...monsterIn(p),
  };
  const fitNote = `hitChance_pct ${hitChance_pct} = least-squares fit P1-F03-T07 to both GDD rows (config combat.json#attackCheck currently ${p.attack.hitChancePerCheck_pct})`;
  v.push(
    gdd(
      { ...surv, tankerBuff_pct: 0, stopAt_pct: retreat },
      s.referenceMatchingLevel_min,
      s.referenceMatchingLevel_min * s.tolerance_ratio,
      `${s.source} · L${L} balanced build, damage x1.0, to auto-retreat · ${fitNote}`,
    ),
  );
  v.push(
    gdd(
      { ...surv, tankerBuff_pct: tankerBuff, stopAt_pct: retreat },
      s.withTanker_min,
      s.withTanker_min * s.tolerance_ratio,
      `${s.source} · with one Tanker L${s.tankerLevel}, to auto-retreat · ${fitNote}`,
    ),
  );
  v.push(
    sim(
      { ...surv, tankerBuff_pct: 0, stopAt_pct: retreat },
      `exact: reference to auto-retreat ${retreat}%`,
    ),
  );
  v.push(sim({ ...surv, tankerBuff_pct: 0, stopAt_pct: 0 }, 'D-020: reference to HP 0'));
  v.push(
    sim(
      { ...surv, tankerBuff_pct: tankerBuff, stopAt_pct: retreat },
      `exact: Tanker L${s.tankerLevel} to auto-retreat`,
    ),
  );
  v.push(
    sim({ ...surv, tankerBuff_pct: tankerBuff, stopAt_pct: 0 }, `Tanker L${s.tankerLevel} to HP 0`),
  );
  v.push(
    sim(
      { ...surv, tankerBuff_pct: null, stopAt_pct: retreat },
      'F-1: solo Ranged/Support/Magic (x1.6) to auto-retreat',
    ),
  );
  v.push(
    sim(
      { ...surv, tankerBuff_pct: null, stopAt_pct: 0 },
      'F-1: solo Ranged/Support/Magic (x1.6) to HP 0',
    ),
  );
  v.push(
    sim(
      {
        fn: 'hpLossPerHour_pct',
        damage: buildDamage,
        maxHp: buildHp,
        hitChance_pct: CASE.exampleHitChance_pct,
        meanInterval_s,
      },
      'expected HP loss per walking hour',
    ),
  );
  // HP loss per hour of that vector, as printed in the sim report (2 decimals).
  const hpLoss = roundTo(
    evaluateVector({
      fn: 'hpLossPerHour_pct',
      damage: buildDamage,
      maxHp: buildHp,
      hitChance_pct: CASE.exampleHitChance_pct,
      meanInterval_s,
    }) as number,
    CASE.printed.hpLossDecimals,
  );
  const vitBonus_pct = buildVit * p.stats.vitPotionEfficiency_pct;
  v.push(
    sim(
      {
        fn: 'potionCostPerHour_gold',
        hpLoss_pctPerHour: hpLoss,
        heal_pctMaxHp: small.heal_pctMaxHp,
        potionEfficiencyBonus_pct: 0,
        buyPrice_gold: small.buyPrice_gold,
      },
      'small potion, no VIT bonus',
    ),
  );
  v.push(
    sim(
      {
        fn: 'potionCostPerHour_gold',
        hpLoss_pctPerHour: hpLoss,
        heal_pctMaxHp: small.heal_pctMaxHp,
        potionEfficiencyBonus_pct: vitBonus_pct,
        buyPrice_gold: small.buyPrice_gold,
      },
      `small potion, VIT ${buildVit} → +${vitBonus_pct}% efficiency`,
    ),
  );
  v.push(
    sim(
      {
        fn: 'potionCostPerHour_gold',
        hpLoss_pctPerHour: 0,
        heal_pctMaxHp: small.heal_pctMaxHp,
        potionEfficiencyBonus_pct: 0,
        buyPrice_gold: small.buyPrice_gold,
      },
      'boundary: no damage → 0 gold',
    ),
  );
  return { formula: 'damage', vectors: v };
}

export const VECTOR_FILES = [
  'buff-stacking',
  'class-change',
  'exp-curve',
  'gear',
  'damage',
  'drops',
  'economy',
  'party',
] as const;
export type VectorFileName = (typeof VECTOR_FILES)[number];

export function buildAllVectors(
  p: SimParams,
  g: GddReference,
  e: EconomyInputs,
): Record<VectorFileName, VectorFile> {
  return {
    'buff-stacking': buffStackingVectors(p, g),
    'class-change': classChangeVectors(p, g),
    'exp-curve': expCurveVectors(p, g),
    gear: gearVectors(p, g),
    damage: damageVectors(p, g),
    drops: dropsVectors(p, g, e),
    economy: economyVectors(p, g, e),
    party: partyVectors(p, g, e),
  };
}

export interface VectorCheck {
  file: string;
  index: number;
  source: string;
  expected: VectorOutput;
  actual: VectorOutput;
  pass: boolean;
}

/** Re-evaluates every vector with the reference implementation. */
export function checkVectors(file: string, vf: VectorFile): VectorCheck[] {
  return vf.vectors.map((vec, index) => {
    const actual = evaluateVector(vec.input);
    return {
      file,
      index,
      source: vec.source,
      expected: vec.expected,
      actual,
      pass: isWithinTolerance(actual, vec.expected, vec.tolerance),
    };
  });
}
