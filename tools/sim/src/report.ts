// CLI: prints every GDD table next to the simulator value, plus survival and economy checks.
// Run from the repo root: pnpm exec tsx tools/sim/src/report.ts [--seed N] [--runs N]
// Reads config/balance/*.json (values) and tools/sim/gdd-reference.json (GDD targets) only.
import { loadBalanceConfig } from './config';
import { extremeBuild } from './build';
import {
  baseCapStatus,
  bossGearStat,
  classChangeCost,
  defReductionRatio,
  gearStat,
  memberP,
  roleBuffPct,
  ticksBetween,
  ticksPerLevel,
  ticksPerLevelCurve,
} from './formulas';
import { dropParamsFromConfig } from './drops';
import { loadGddReference } from './gdd';
import { runEconomyReport } from './report-economy';
import { ROLES, paramsFromConfig } from './params';
import type { SimParams } from './params';
import { mulberry32 } from './rng';
import { fitHitChance_pct, runSetup, survivalRow } from './scenarios';
import type { TankerCase } from './scenarios';
import { survivalMonteCarlo } from './survival';

const DEFAULT_SEED = 20260923;
const DEFAULT_RUNS = 20000;
const MAX_RUN_S = 86400;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = 3600;
const DAYS_PER_MONTH = 30;
const PCT = 100;

/** Terminal column widths (layout only). */
const COL = {
  w3: 3,
  w4: 4,
  w5: 5,
  w6: 6,
  w7: 7,
  w8: 8,
  w10: 10,
  w11: 11,
  w14: 14,
  w30: 30,
  w32: 32,
  w33: 33,
  w52: 52,
};

const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pad = (s: string | number, w: number) => String(s).padStart(w);
const flag = (ok: boolean) => (ok ? 'match' : 'DIFF ');

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : Number.NaN;
  return Number.isFinite(v) ? v : fallback;
}

function main(): void {
  const cfg = loadBalanceConfig();
  const p = paramsFromConfig(cfg);
  const g = loadGddReference();
  const seed = arg('--seed', DEFAULT_SEED);
  const runs = arg('--runs', DEFAULT_RUNS);
  console.log(`# tools/sim report · config/balance/*.json · seed ${seed} · MC runs ${runs}\n`);

  // ---- 1. Buff stacking ----
  const L = g.buff.memberLevel;
  console.log(
    `## 1. Buff stacking (members at level ${L}, P per member = ${f2(memberP(L, p.buff))})`,
  );
  console.log('role     base/cap  rule        1       2       3       4     +2nd  +3rd  +4th');
  for (const role of ROLES) {
    const r = p.roles[role];
    const vals = g.buff.tankerByCount_pct.map((_, k) =>
      roleBuffPct(r, (k + 1) * memberP(L, p.buff)),
    );
    const inc = vals.slice(1).map((v, k) => v - (vals[k] as number));
    console.log(
      `${role.padEnd(COL.w8)} ${pad(f2(r.base_pct / r.cap_pct), COL.w8)}  ${baseCapStatus(role, r, p.baseCapRule).padEnd(COL.w10)} ${vals.map((v) => pad(f1(v), COL.w6)).join('  ')}  ${inc.map((v) => pad(f1(v), COL.w5)).join(' ')}`,
    );
  }
  const tk = g.buff.tankerByCount_pct.map((t, k) => ({
    t,
    v: roleBuffPct(p.roles.tanker, (k + 1) * memberP(L, p.buff)),
  }));
  console.log(
    `GDD Tanker x1..4: ${tk.map(({ t, v }) => `${t} vs ${f2(v)} ${flag(Math.abs(t - v) <= g.buff.tolerance_pct)}`).join(' · ')}`,
  );
  console.log(
    `GDD single member: ${ROLES.map((role) => {
      const t = g.buff.singleMember_pct[role] as number;
      const v = roleBuffPct(p.roles[role], memberP(L, p.buff));
      return `${role} ${t} vs ${f2(v)} ${flag(Math.abs(t - v) <= g.buff.tolerance_pct)}`;
    }).join(' · ')}`,
  );
  const eq = g.buff.equivalence;
  const one = roleBuffPct(p.roles.tanker, memberP(eq.oneMemberLevel, p.buff));
  const two = roleBuffPct(p.roles.tanker, 2 * memberP(eq.twoMembersLevel, p.buff));
  console.log(
    `GDD Tanker L${eq.oneMemberLevel} x1 = L${eq.twoMembersLevel} x2: ${f2(one)} vs ${f2(two)} (diff ${f2(two - one)}) ${flag(Math.abs(two - one) <= eq.tolerance_pct)}\n`,
  );

  // ---- 2. Exp ----
  const e = g.exp;
  const tickS = p.healShield.rewardTickInterval_s;
  console.log('## 2. Exp curve (Z = L, multiplier 1.0)');
  console.log('level  ticks(formula)  GDD  walk min  GDD   note');
  for (const [lv, t] of Object.entries(e.ticksPerLevel)) {
    const Lv = Number(lv);
    const curve = ticksPerLevelCurve(Lv, p.exp);
    const note =
      Lv >= p.exp.maxLevel
        ? `max level: no expToNext, last real level-up L${Lv - 1} = ${f1(ticksPerLevel(Lv - 1, p.exp))} (F-11)`
        : '';
    console.log(
      `${pad(Lv, COL.w5)}  ${pad(f1(curve), COL.w14)}  ${pad(t, COL.w3)}  ${pad(f1((curve * tickS) / MINUTES_PER_HOUR), COL.w8)}  ${pad(e.walkMinutesPerLevel[lv] ?? '', COL.w4)}  ${flag(Math.abs(curve - t) <= e.ticksPerLevelTolerance)} ${note}`,
    );
  }
  const total = ticksBetween(p.exp.startLevel, p.exp.maxLevel, p.exp);
  const hours = (total * tickS) / SECONDS_PER_HOUR;
  const h30 = (ticksBetween(p.exp.startLevel, e.hoursToLevel, p.exp) * tickS) / SECONDS_PER_HOUR;
  console.log(
    `total L1→60: ${f1(total)} ticks (GDD ${e.totalTicksToMax}, ${f1((total / e.totalTicksToMax - 1) * PCT)}%) · ${f1(hours)} h (GDD ${e.totalHoursToMax}, ${f1((hours / e.totalHoursToMax - 1) * PCT)}%)`,
  );
  console.log(
    `reach L${e.hoursToLevel}: ${f1(h30)} h (GDD ${e.hoursToLevelValue}, ${f1((h30 / e.hoursToLevelValue - 1) * PCT)}%)`,
  );
  const days = (min: number, mult: number) => ((hours / mult) * MINUTES_PER_HOUR) / min;
  console.log(
    `days to max at x1.0: ${e.casualMinutesPerDay} min/day → ${f1(days(e.casualMinutesPerDay, 1))} d (${f1(days(e.casualMinutesPerDay, 1) / DAYS_PER_MONTH)} months, GDD "${e.casualDaysToMaxText}") · ${e.heavyMinutesPerDay} min/day → ${f1(days(e.heavyMinutesPerDay, 1))} d (GDD "${e.heavyDaysToMaxText}")`,
  );
  console.log(
    `F-2 solo without Magic (x${p.expMult.noMagicMult}): ${f1(hours / p.expMult.noMagicMult)} h · ${e.casualMinutesPerDay} min/day → ${f1(days(e.casualMinutesPerDay, p.expMult.noMagicMult) / DAYS_PER_MONTH)} months\n`,
  );

  // ---- 3. Gear, stats, class change ----
  const topEnhance = g.gear.enhanceLevels[g.gear.enhanceLevels.length - 1] as number;
  console.log('## 3. Gear (formula / GDD), rounded once at the end (D-022)');
  for (const [tier, row] of Object.entries(g.gear.byTier)) {
    const cells = row.map((t, k) => {
      const v = gearStat(Number(tier), g.gear.enhanceLevels[k] as number, p.gear);
      return `+${g.gear.enhanceLevels[k]} ${pad(v, COL.w3)}/${pad(t, COL.w3)}${v === t ? '' : '*'}`;
    });
    console.log(`tier ${tier}: ${cells.join('   ')}`);
  }
  console.log(
    `(* = differs from GDD by ${g.gear.tolerance}, F-3) · boss gear +0 / +${topEnhance} = ${bossGearStat(0, p.gear)} / ${bossGearStat(topEnhance, p.gear)}`,
  );
  const x = g.extremes;
  const atk = extremeBuild(x.level, 'atk', p).atk;
  const defB = extremeBuild(x.level, 'def', p);
  const hp = extremeBuild(x.level, 'hp', p).hp;
  console.log(
    `L${x.level} extremes: ATK ${atk} (GDD ${x.atk}) · DEF ${defB.def} → ${f1(defB.defReduction_pct)}% (GDD ${x.def} / ${x.defReduction_pct}%) · HP ${hp} (GDD ${x.hp}) · DEF 300 → ${f1(defReductionRatio(g.defense.def, p.monster.defSoftcap) * PCT)}%`,
  );
  console.log(
    `class change: ${Object.entries(g.classChange.costByLevel_gold)
      .map(([lv, c]) => `L${lv} ${classChangeCost(Number(lv), p.classChange)} (GDD ${c})`)
      .join(' · ')}\n`,
  );

  survivalSection(p, g, seed, runs);
  runEconomyReport(p, dropParamsFromConfig(cfg), cfg, g, seed);
}

function survivalSection(
  p: SimParams,
  g: ReturnType<typeof loadGddReference>,
  seed: number,
  runs: number,
): void {
  const s = g.survival;
  const fit = fitHitChance_pct(
    s.fitLevel,
    s.tankerLevel,
    s.referenceMatchingLevel_min,
    s.withTanker_min,
    p,
  );
  const fitted = Math.round(fit.exact_pct);
  const cases: [string, TankerCase | 'own'][] = [
    ['x1.0 reference (D-020)', { kind: 'reference' }],
    [`Tanker L${s.tankerLevel} in party`, { kind: 'tanker', levels: [s.tankerLevel] }],
    ['solo Ranged/Support/Magic x1.6', { kind: 'noTanker' }],
    ['solo Tanker (own buff)', 'own'],
  ];
  console.log(
    '## 4. Survival: balanced build, Z = L, no potions (minutes to auto-retreat 25% / to HP 0)',
  );
  console.log(
    `assumptions: points split 4 ways, every slot tier-by-level +0, check every U(${p.attack.intervalMin_s}, ${p.attack.intervalMax_s}) s, constant damage per hit`,
  );
  console.log(
    `hit-chance fit to GDD (L${s.fitLevel}: ${s.referenceMatchingLevel_min} min x1.0, ${s.withTanker_min} min with Tanker L${s.tankerLevel}): 45-only ${f1(fit.refOnly_pct)}% · 55-only ${f1(fit.tankerOnly_pct)}% · least squares ${f2(fit.exact_pct)}% → proposed ${fitted}% (config now ${p.attack.hitChancePerCheck_pct}%)`,
  );
  const hits = [...new Set([p.attack.hitChancePerCheck_pct, fitted])];
  for (const hit of hits) {
    console.log(
      `\nhit chance ${hit}%${hit === p.attack.hitChancePerCheck_pct ? ' (config)' : ''}${hit === fitted ? ' (fitted)' : ''}`,
    );
    console.log(`level   DEF     HP     dmg | ${cases.map(([n]) => n.padEnd(COL.w32)).join('')}`);
    for (const level of s.reportLevels) {
      const cols = cases.map(([, c]) => {
        const r = survivalRow(level, c === 'own' ? { kind: 'tanker', levels: [level] } : c, p, hit);
        return `${pad(f1(r.minToRetreat), COL.w6)} / ${pad(f1(r.minToDeath), COL.w6)} (dmg ${pad(f1(r.damage), COL.w5)})`.padEnd(
          COL.w32,
        );
      });
      const b = survivalRow(level, { kind: 'reference' }, p, hit);
      console.log(
        `${pad(level, COL.w5)} ${pad(f1(b.build.def), COL.w6)} ${pad(f1(b.build.hp), COL.w7)} ${pad(f1(b.damage), COL.w6)} | ${cols.join('')}`,
      );
    }
  }
  const rng = mulberry32(seed);
  console.log(
    `\nMonte Carlo check at ${fitted}%, L${s.fitLevel}, ${runs} runs (mean / p10 / p50 / p90 minutes):`,
  );
  const mc = (
    label: string,
    c: TankerCase,
    stop: number,
    extra: { supportLevels?: number[]; magicLevels?: number[] } = {},
  ) => {
    const r = survivalMonteCarlo(
      runSetup(s.fitLevel, c, p, {
        stopAt_pct: stop,
        hitChance_pct: fitted,
        maxDuration_s: MAX_RUN_S,
        ...extra,
      }),
      runs,
      rng,
    );
    console.log(
      `  ${label.padEnd(COL.w52)} ${f1(r.mean_min)} / ${f1(r.p10_min)} / ${f1(r.p50_min)} / ${f1(r.p90_min)}${r.censored > 0 ? ` (censored ${r.censored})` : ''}`,
    );
    return r;
  };
  const retreat = p.safety.autoRetreatThreshold_pct;
  const ref = mc('x1.0 reference → auto-retreat', { kind: 'reference' }, retreat);
  mc('x1.0 reference → HP 0', { kind: 'reference' }, 0);
  mc(
    `Tanker L${s.tankerLevel} → auto-retreat`,
    { kind: 'tanker', levels: [s.tankerLevel] },
    retreat,
  );
  const solo = mc('solo Ranged/Support/Magic x1.6 → auto-retreat', { kind: 'noTanker' }, retreat);
  mc('solo Ranged/Support/Magic x1.6 → HP 0', { kind: 'noTanker' }, 0);
  const lv = s.fitLevel;
  mc(
    `full party L${lv} (Tanker + Support heal + Magic shield) → retreat`,
    { kind: 'tanker', levels: [lv] },
    retreat,
    { supportLevels: [lv], magicLevels: [lv] },
  );
  const shortfall = 1 - solo.mean_min / s.referenceMatchingLevel_min;
  console.log(
    `SF-4 check: reference ${f1(ref.mean_min)} min vs GDD ${s.referenceMatchingLevel_min}; solo non-Tanker ${f1(solo.mean_min)} min = ${f1(shortfall * PCT)}% short of ${s.referenceMatchingLevel_min} → ${shortfall > s.decisionShortfall_ratio ? 'OVER 20%: decision authority HUMAN (confirm D-020)' : 'within 20%'}\n`,
  );
}

main();
