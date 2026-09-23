// Report sections 5-8 (P1-F03-T08): drops, economy (income vs potion cost), party per head,
// what-if levers. Called by report.ts. Reads config through SimParams / DropParams only.
import type { BalanceConfig } from './config';
import { balancedBuild } from './build';
import type { DropContext, DropParams } from './drops';
import {
  NEUTRAL_CONTEXT,
  dropRates,
  incomePerHourCtx_gold,
  meanDaysBetween,
  simulateDropGaps,
  simulateIncome,
  ticksPerDay,
  ticksPerHour,
} from './drops';
import type { EconomyRow, EconomySituation, PartySpec } from './economy';
import {
  REFERENCE_SITUATION,
  buffOrNull,
  economyRow,
  fullPartySpec,
  partyRewardRatio,
  partyWithout,
  ratioStatus,
  soloSpec,
} from './economy';
import type { GddReference } from './gdd';
import type { SimParams } from './params';
import { ROLES } from './params';
import { mean, mulberry32, percentile } from './rng';
import type { Rng } from './rng';
import { economyRefsFromConfig } from './vectors-economy';

const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pad = (s: string | number, w: number) => String(s).padStart(w);
const flag = (ok: boolean) => (ok ? 'match' : 'DIFF ');

/** Report layout and Monte Carlo sizes (not balance values). */
const LAYOUT = { label: 36, num: 7, wide: 9, cell: 17 };
const MC = { gaps: 20000, incomeTicks: 1200000, potionHours: 5000, monthDays: 30 };
/** What-if inputs for the lever table (hypotheses for a decision, never written to config). */
const WHAT_IF_VIT_HALF_PCT = 0.5;
const WHAT_IF_PRICE_UP = 1.25;
const WHAT_IF_PRICE_UP_MORE = 1.5;
const WHAT_IF = {
  vitPotionEfficiency_pct: [1, WHAT_IF_VIT_HALF_PCT],
  potionPriceMult: [WHAT_IF_PRICE_UP, WHAT_IF_PRICE_UP_MORE],
};
/** Rows of the drop table that also get a Monte Carlo gap check (x1.0, no Ranged, Ranged L25). */
const MC_DROP_ROWS = 3;
const STATUS_CHARS = 5;
const PCT = 100;
const P50 = 50;
const P90 = 90;

export function runEconomyReport(
  p: SimParams,
  dp: DropParams,
  cfg: BalanceConfig,
  g: GddReference,
  seed: number,
): void {
  const rng = mulberry32(seed + 1);
  dropSection(p, dp, cfg, g, rng);
  economySection(p, dp, cfg, g, rng);
  partySection(p, dp, cfg, g);
  leverSection(p, dp, g, seed);
}

function dropSection(
  p: SimParams,
  dp: DropParams,
  cfg: BalanceConfig,
  g: GddReference,
  rng: Rng,
): void {
  const refs = economyRefsFromConfig(cfg);
  const L = g.party.level;
  const rangedL = buffOrNull([L], 'ranged', p) as number;
  const cases: [string, Partial<DropContext>][] = [
    ['x1.0 (GDD table as written)', {}],
    ['no Ranged inside (solo T/S/M) x0.6', { rangedBuff_pct: null }],
    [`Ranged L${L} inside (${f1(rangedL)}%)`, { rangedBuff_pct: rangedL }],
    ['Ranged at cap x1.5', { rangedBuff_pct: dp.rangedBuffMaxMult * PCT - PCT }],
    ['small dungeon', { smallDungeon: true }],
    ['small dungeon, no Ranged', { smallDungeon: true, rangedBuff_pct: null }],
    ['low trust', { lowTrust: true }],
    ['failed raid week x1.6 (boss nearly dead)', { failedRaidBossHpLeft: 0 }],
    ['failed raid week x2.0 (boss untouched)', { failedRaidBossHpLeft: 1 }],
  ];
  const cm = refs.casualMinutesPerDay;
  const hm = refs.heavyMinutesPerDay;
  console.log(
    `## 5. Drops per reward tick (${f1(ticksPerHour(dp))} ticks/h, every tick passes the movement gate)`,
  );
  console.log(
    `${'context'.padEnd(LAYOUT.label)} Common  Unc%   Rare%  Epic%  Leg%  gold/h | Epic days ${cm}m/${hm}m | Leg days ${cm}m/${hm}m`,
  );
  for (const [label, over] of cases) {
    const c = { ...NEUTRAL_CONTEXT, ...over };
    const r = dropRates(c, dp);
    const d = (ch: number, m: number) =>
      pad(ch > 0 ? f1(meanDaysBetween(ch, m, dp)) : 'never', LAYOUT.num - 1);
    console.log(
      `${label.padEnd(LAYOUT.label)} ${pad(f2(r.commonQty), LAYOUT.num - 1)} ${pad(f1(r.uncommon), LAYOUT.num - 1)} ${pad(f2(r.rare), LAYOUT.num - 1)} ${pad(f2(r.epic), LAYOUT.num - 2)} ${pad(f2(r.legendary), LAYOUT.num - 2)} ${pad(f1(incomePerHourCtx_gold(c, dp)), LAYOUT.num)} | ${d(r.epic, cm)} / ${d(r.epic, hm)}     | ${d(r.legendary, cm)} / ${d(r.legendary, hm)}`,
    );
  }
  const tol = g.drops.aboutTolerance_ratio;
  const chk = (label: string, got: number, target: number, t: number) =>
    `${label} ${f1(got)} vs GDD ${target} ${flag(Math.abs(got - target) <= t)}`;
  const e = dp.baseChance_pct.epic;
  const lg = dp.baseChance_pct.legendary;
  const heavyMid = (refs.heavyEpicEveryMin_days + refs.heavyEpicEveryMax_days) / 2;
  const heavyHalf = (refs.heavyEpicEveryMax_days - refs.heavyEpicEveryMin_days) / 2;
  console.log(
    `GDD at x1.0: ${[
      chk(
        `${cm}m Epic`,
        meanDaysBetween(e, cm, dp),
        refs.casualEpicEvery_days,
        refs.casualEpicEvery_days * tol,
      ),
      chk(
        `${cm}m Legendary`,
        meanDaysBetween(lg, cm, dp),
        refs.casualLegendaryEvery_days,
        refs.casualLegendaryEvery_days * tol,
      ),
      chk(`${hm}m Epic`, meanDaysBetween(e, hm, dp), heavyMid, heavyHalf),
      chk(
        `${hm}m Legendary`,
        meanDaysBetween(lg, hm, dp),
        refs.heavyLegendaryEvery_days,
        refs.heavyLegendaryEvery_days * tol,
      ),
    ].join(' · ')}`,
  );
  console.log(
    `Monte Carlo gaps between drops (${MC.gaps} gaps, days: mean / p50 / p90 / share of gaps > ${MC.monthDays} d):`,
  );
  for (const [label, over] of cases.slice(0, MC_DROP_ROWS)) {
    const r = dropRates({ ...NEUTRAL_CONTEXT, ...over }, dp);
    for (const [name, ch] of [
      ['Epic', r.epic],
      ['Legendary', r.legendary],
    ] as [string, number][]) {
      const cells = [cm, hm].map((m) => {
        const gaps = simulateDropGaps(ch, ticksPerDay(m, dp), MC.gaps, rng).sort((a, b) => a - b);
        const over30 = gaps.filter((x) => x > MC.monthDays).length / gaps.length;
        return `${m}m ${f1(mean(gaps))} / ${f1(percentile(gaps, P50))} / ${f1(percentile(gaps, P90))} / ${f1(over30 * PCT)}%`;
      });
      console.log(
        `  ${label.padEnd(LAYOUT.label)} ${name.padEnd(LAYOUT.wide)} ${cells.join('   ')}`,
      );
    }
  }
  const mcGold =
    simulateIncome(NEUTRAL_CONTEXT, MC.incomeTicks, dp, rng) / (MC.incomeTicks / ticksPerHour(dp));
  const mcSmall =
    simulateIncome(
      { ...NEUTRAL_CONTEXT, rangedBuff_pct: null, smallDungeon: true },
      MC.incomeTicks,
      dp,
      rng,
    ) /
    (MC.incomeTicks / ticksPerHour(dp));
  console.log(
    `Monte Carlo income (integer Common 1-3, stochastic rounding, ${MC.incomeTicks} ticks): x1.0 ${f1(mcGold)} gold/h (analytic ${f1(incomePerHourCtx_gold(NEUTRAL_CONTEXT, dp))}) · small dungeon no Ranged ${f1(mcSmall)} (analytic ${f1(incomePerHourCtx_gold({ ...NEUTRAL_CONTEXT, rangedBuff_pct: null, smallDungeon: true }, dp))})\n`,
  );
}

function situations(L: number): (PartySpec | EconomySituation)[] {
  return [
    REFERENCE_SITUATION,
    ...ROLES.map((r) => soloSpec(r, L)),
    fullPartySpec(L),
    fullPartySpec(L, 2),
    partyWithout(L, ['tanker']),
    partyWithout(L, ['support']),
    partyWithout(L, ['support', 'magic']),
  ];
}

const soloAverage = (rows: EconomyRow[]) => mean(rows.map((r) => r.ratioMc ?? r.ratio));

function economySection(
  p: SimParams,
  dp: DropParams,
  cfg: BalanceConfig,
  g: GddReference,
  rng: Rng,
): void {
  const refs = economyRefsFromConfig(cfg);
  const L = g.party.level;
  const t = p.income;
  const b = balancedBuild(L, p);
  const mc = { hours: MC.potionHours, rng };
  console.log(
    `## 6. Economy: income vs potion cost per walking hour, L${L}, Z = L, balanced build, hit chance ${p.attack.hitChancePerCheck_pct}% (config), auto-potion at ${p.safety.autoPotionThreshold_pct}% with one potion type`,
  );
  console.log(
    `potion cost = damage model (T07) x hit frequency x potion size x config price; GDD ${refs.potion_gold} is compared only · VIT ${f2(b.vit)} → potion efficiency +${f1(b.vit * p.stats.vitPotionEfficiency_pct)}% · target ${t.ratioTargetMin}-${t.ratioTargetMax}, min accepted ${t.ratioMinAccepted}`,
  );
  console.log(
    `${'situation'.padEnd(LAYOUT.label)} potion   VIT  income  dmg   loss%/h net%/h  gold/h(an)  gold/h(MC)  ratio(MC)  status`,
  );
  const table: EconomyRow[] = [];
  for (const s of situations(L)) {
    for (const potion of p.safety.potionOrder.slice(0, 2)) {
      for (const withVit of [false, true]) {
        const r = economyRow(s, L, potion, withVit, p, dp, mc);
        table.push(r);
        const rm = r.ratioMc ?? r.ratio;
        console.log(
          `${r.label.padEnd(LAYOUT.label)} ${potion.padEnd(LAYOUT.num + 1)} ${withVit ? ' on' : 'off'} ${pad(f1(r.income_gold), LAYOUT.num)} ${pad(f1(r.damage), LAYOUT.num - 1)} ${pad(f1(r.grossLoss_pctPerHour), LAYOUT.num)} ${pad(f1(r.netLoss_pctPerHour), LAYOUT.num)} ${pad(f1(r.potionGold), LAYOUT.wide + 2)} ${pad(f1(r.potionGoldMc ?? Number.NaN), LAYOUT.wide + 2)} ${pad(f2(rm), LAYOUT.wide)}  ${ratioStatus(rm, t)}`,
        );
      }
    }
  }
  const pick = (label: string, potion: string, vit: boolean) =>
    table.find((r) => r.label === label && r.potion === potion && r.withVit === vit) as EconomyRow;
  const ref = REFERENCE_SITUATION.label;
  const [small, medium] = p.safety.potionOrder as [string, string];
  const refS = pick(ref, small, false);
  const refM = pick(ref, medium, false);
  const pd = (x: number) =>
    `${x >= refs.potion_gold ? '+' : ''}${f1((x / refs.potion_gold - 1) * PCT)}%`;
  console.log(
    `GDD check: income x1.0 ${f1(refS.income_gold)} vs ${refs.income_gold} (${f1((refS.income_gold / refs.income_gold - 1) * PCT)}%) ${flag(Math.abs(refS.income_gold / refs.income_gold - 1) <= g.economy.incomeTolerance_ratio)} · potion x1.0 no VIT: ${small} ${f1(refS.potionGoldMc ?? 0)} (${pd(refS.potionGoldMc ?? 0)}), ${medium} ${f1(refM.potionGoldMc ?? 0)} (${pd(refM.potionGoldMc ?? 0)}) vs GDD ${refs.potion_gold} · ratio ${f2(refS.ratioMc ?? 0)} / ${f2(refM.ratioMc ?? 0)}`,
  );
  console.log(
    `Solo ratio by level (MC, ${small}; class order ${ROLES.join('/')}; average = equal class mix):`,
  );
  for (const lv of g.survival.reportLevels.filter((x) => x > 1)) {
    const cells = [false, true].map((vit) => {
      const rows = ROLES.map((r) => economyRow(soloSpec(r, lv), lv, small, vit, p, dp, mc));
      return `VIT ${vit ? 'on ' : 'off'} ${rows.map((r) => f2(r.ratioMc ?? 0)).join(' ')} avg ${f2(soloAverage(rows))} ${ratioStatus(soloAverage(rows), t)}`;
    });
    const refRow = economyRow(REFERENCE_SITUATION, lv, small, false, p, dp, mc);
    console.log(`  L${pad(lv, 2)} ref x1.0 ${f2(refRow.ratioMc ?? 0)} | ${cells.join(' | ')}`);
  }
  console.log('');
}

function partySection(p: SimParams, dp: DropParams, cfg: BalanceConfig, g: GddReference): void {
  const refs = economyRefsFromConfig(cfg);
  const L = g.party.level;
  const parties = [
    fullPartySpec(L),
    fullPartySpec(L, 2),
    partyWithout(L, ['ranged']),
    partyWithout(L, ['magic']),
    partyWithout(L, ['tanker']),
  ];
  const [lo, hi] = [refs.partyMin, refs.partyMax];
  console.log(
    `## 7. Party per-head reward vs solo (L${L}, Support ${p.roles.support.base_pct}/${p.roles.support.cap_pct} per D-004, target ${lo}-${hi}x)`,
  );
  console.log(
    `reward = drop value (NPC gold, same multiplier as Epic/Legendary frequency) and exp rate; cells = drop / exp`,
  );
  console.log(
    `${'party'.padEnd(LAYOUT.label)} ${ROLES.map((r) => `vs solo ${r}`.padEnd(LAYOUT.cell)).join('')}class average`,
  );
  for (const party of parties) {
    const rs = ROLES.map((r) => partyRewardRatio(party, soloSpec(r, L), p, dp));
    const avgDrop = mean(rs.map((r) => r.drop));
    const avgExp = mean(rs.map((r) => r.exp));
    const inT = (x: number) => (x >= lo && x <= hi ? 'in' : 'OUT');
    console.log(
      `${party.label.padEnd(LAYOUT.label)} ${rs.map((r) => `${f2(r.drop)} / ${f2(r.exp)}`.padEnd(LAYOUT.cell)).join('')}${f2(avgDrop)} / ${f2(avgExp)} (${inT(avgDrop)}/${inT(avgExp)})`,
    );
  }
  const [small] = p.safety.potionOrder as [string];
  const net = (s: PartySpec) => {
    const r = economyRow(s, L, small, false, p, dp);
    return r.income_gold - r.potionGold;
  };
  const fullNet = net(fullPartySpec(L));
  console.log(
    `net gold per head per hour (income − ${small} cost, VIT off, analytic): full party ${f1(fullNet)} · ${ROLES.map((r) => `solo ${r} ${f1(net(soloSpec(r, L)))} (x${f2(fullNet / net(soloSpec(r, L)))})`).join(' · ')}\n`,
  );
}

interface Lever {
  label: string;
  apply: (p: SimParams) => SimParams;
}

function leverSection(p: SimParams, dp: DropParams, g: GddReference, seed: number): void {
  const L = g.party.level;
  const scalePrices =
    (m: number) =>
    (q: SimParams): SimParams => ({
      ...q,
      potions: Object.fromEntries(
        Object.entries(q.potions).map(([k, v]) => [
          k,
          { ...v, buyPrice_gold: v.buyPrice_gold * m },
        ]),
      ),
    });
  const vitEff =
    (e: number) =>
    (q: SimParams): SimParams => ({
      ...q,
      stats: { ...q.stats, vitPotionEfficiency_pct: e },
    });
  const levers: Lever[] = [
    { label: 'A status quo (config now)', apply: (q) => q },
    ...WHAT_IF.vitPotionEfficiency_pct.map((e) => ({
      label: `vitPotionEfficiency ${e}%/VIT`,
      apply: vitEff(e),
    })),
    ...WHAT_IF.potionPriceMult.map((m) => ({
      label: `potion prices x${m}`,
      apply: scalePrices(m),
    })),
  ];
  const [small] = p.safety.potionOrder as [string];
  const t = p.income;
  const levels = g.survival.reportLevels.filter((x) => x > 1);
  console.log('## 8. What-if levers (config unchanged; numbers for the HUMAN decision)');
  console.log(
    `${'lever'.padEnd(LAYOUT.label)} ref x1.0 noVIT | solo avg VIT off L${L} | solo avg VIT on ${levels.map((l) => `L${l}`).join(' / ')} | full party VIT on`,
  );
  for (const lever of levers) {
    const q = lever.apply(p);
    const rng = mulberry32(seed + 2);
    const mc = { hours: MC.potionHours, rng };
    const solo = (lv: number, vit: boolean) =>
      soloAverage(ROLES.map((r) => economyRow(soloSpec(r, lv), lv, small, vit, q, dp, mc)));
    const ref = economyRow(REFERENCE_SITUATION, L, small, false, q, dp, mc).ratioMc ?? 0;
    const party = economyRow(fullPartySpec(L), L, small, true, q, dp, mc).ratioMc ?? 0;
    const on = levels.map((lv) => f2(solo(lv, true)));
    const off = solo(L, false);
    console.log(
      `${lever.label.padEnd(LAYOUT.label)} ${pad(f2(ref), LAYOUT.num + 2)} ${ratioStatus(ref, t).slice(0, STATUS_CHARS)} | ${pad(f2(off), LAYOUT.num)} ${ratioStatus(off, t).slice(0, STATUS_CHARS)}         | ${on.join(' / ')} | ${f2(party)}`,
    );
  }
  console.log('');
}
