// CLI: evidence of P2-F05-T01 (exp per tick, drop tables per preset incl. potions, Phase 2
// survival per class with and without potion drops, R43, D-020, death vs auto-retreat).
// Run from the repo root: pnpm exec tsx tools/sim/src/report-loop.ts [--runs N]
// Every run is seeded (runSeed = 1..N), so the output repeats exactly.
import {
  NEUTRAL_CONTEXT,
  damagePerHit,
  expMultiplier,
  expPerTick,
  expToNext,
} from '@keep-walking/shared/formulas';
import { loadBalanceConfig, num } from './config';
import {
  dropTableDef,
  dropTableIds,
  expectedPerTick,
  lootParamsFromConfig,
  lootTable,
} from './loot';
import { runLoop, soloBuffPct, soloDamage, soloTickExp } from './loop';
import type { OwnClass } from './loop';
import type { Scenario } from './loop-scenarios';
import { CLASSES, loopInput, loopParamsFromConfig, loopStats, phase2Stats } from './loop-scenarios';
import { paramsFromConfig } from './params';
import { balancedBuild } from './build';
import { expectedSurvival_min, hitsToThreshold } from '@keep-walking/shared/formulas';
import { meanInterval_s, survivalRow } from './scenarios';
import { levelsBelowRange, levelsOutsideRange, zoneLevelFor, zoneLevelMidpointA1 } from './zone';

/** Report inputs (not balance values): runs, levels, pilot level ranges, candidate ranges. */
const R = {
  defaultRuns: 2000,
  firstSeed: 1,
  limit_s: 21600,
  maxStarterLevel: 5,
  zones: { a: 1, b: 3, c: 5, d: 10, e: 15, f: 18, g: 20, h: 25, i: 30, j: 40, k: 50, l: 55, m: 60 },
  /** Every level range of design/levels/pilot-dungeons.md 3.1-3.3 (20 dungeons, 10 ranges). */
  ranges: [
    { min: 1, max: 5, label: '1-5 (PN-7, PN-8, PN-10, PW-4, PW-5, BR-2, BR-3)' },
    { min: 1, max: 35, label: '1-35 (PN-2)' },
    { min: 5, max: 15, label: '5-15 (PN-9, PW-6, BR-4)' },
    { min: 10, max: 20, label: '10-20 (PN-6)' },
    { min: 10, max: 25, label: '10-25 (PN-4, BR-1)' },
    { min: 15, max: 30, label: '15-30 (PN-5, PW-3)' },
    { min: 20, max: 30, label: '20-30 (PN-3)' },
    { min: 20, max: 35, label: '20-35 (PN-1)' },
    { min: 25, max: 45, label: '25-45 (PW-2)' },
    { min: 30, max: 50, label: '30-50 (PW-1)' },
  ],
  /** Exp per hour in wide ranges (section 8.2): range PN-2 plus the widest mid ranges. */
  wideRanges: [
    { min: 1, max: 35 },
    { min: 25, max: 45 },
    { min: 30, max: 50 },
  ],
  /** Player levels of section 8.2 (each shown only inside its range or one above it). */
  wideLevels: { a: 1, b: 10, c: 18, d: 25, e: 30, f: 35, g: 36, h: 40, i: 45, j: 50, k: 51 },
  minutesPerDay: 40,
  deathSeed: 3,
  l25: 25,
  minute: 60,
  hour: 3600,
  pct: 100,
} as const;

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : Number.NaN;
  return Number.isFinite(v) ? v : fallback;
}
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const THREE_DECIMALS = 3;
const f3 = (x: number) => x.toFixed(THREE_DECIMALS);
/** One markdown table row (the output pastes into design/systems/sim-report.md). */
const row = (...cells: (string | number)[]) => `| ${cells.join(' | ')} |`;

const cfg = loadBalanceConfig();
const lp = lootParamsFromConfig(cfg);
const p = loopParamsFromConfig(cfg);
const sp = paramsFromConfig(cfg);
const runs = arg('--runs', R.defaultRuns);
const window_s = num(cfg.dungeons, 'movementGate.window_s');
const ticksPerHour = R.hour / window_s;

console.log(
  `# tools/sim report-loop · config/balance/*.json · runSeed ${R.firstSeed}..${runs} per row`,
);

console.log('\n## 1. Exp per passing tick by zone level Z (F05 R11; unrounded, x f for D-059)');
console.log(
  row(
    'Z',
    'expPerTick',
    'solo non-Magic (x0.6)',
    'solo Magic at L = Z (own buff)',
    'ticks L->L+1 non-Magic',
  ),
);
for (const z of Object.values(R.zones)) {
  const base = expPerTick(z, p.exp);
  const magic = soloTickExp(z, 'magic', z, z, 1, p);
  const other = soloTickExp(z, 'ranged', z, z, 1, p);
  const next =
    z < p.exp.maxLevel ? f1((p.exp.expToNextCoef * z ** p.exp.expToNextExponent) / other) : '-';
  console.log(row(z, f1(base), f1(other), f1(magic), next));
}

console.log('\n## 2. Drop tables per preset: expected units per passing tick (f = 1)');
const L1Ranged = soloBuffPct(sp.roles.ranged, 1, p.buff);
const contexts = [
  {
    label: 'solo non-Ranged, not small',
    ctx: { ...NEUTRAL_CONTEXT, rangedBuff_pct: null, smallDungeon: false },
  },
  {
    label: 'solo non-Ranged, small',
    ctx: { ...NEUTRAL_CONTEXT, rangedBuff_pct: null, smallDungeon: true },
  },
  {
    label: `solo Ranged L1 (${f1(L1Ranged)}%), small`,
    ctx: { ...NEUTRAL_CONTEXT, rangedBuff_pct: L1Ranged, smallDungeon: true },
  },
];
for (const id of dropTableIds(cfg)) {
  const def = dropTableDef(cfg, id);
  console.log(`\n${id} (preset ${def.preset})`);
  console.log(
    row(
      'context',
      'dust',
      'core',
      'rift',
      'equip (E+L)',
      'hpSmall',
      'revive',
      `Epic every N days @${R.minutesPerDay} min/day`,
    ),
  );
  for (const c of contexts) {
    const t = lootTable(def, c.ctx, lp);
    const e = expectedPerTick(t);
    const epicRoll = t.find(
      (r) => r.rarity === 'epic' && r.items.some((it) => it.id.startsWith('equip')),
    );
    const epicChance = epicRoll
      ? Math.min(R.pct, (epicRoll.chance_pct ?? 0) * epicRoll.chanceMult) / R.pct
      : 0;
    const ticksDay = (R.minutesPerDay * R.minute) / window_s;
    const equip = ['equipWeapon', 'equipArmor', 'equipCharm', 'equipBoots'].reduce(
      (s, k) => s + (e[k] ?? 0),
      0,
    );
    console.log(
      row(
        c.label,
        f2(e['elementDust'] ?? 0),
        f3(e['elementCore'] ?? 0),
        f3(e['riftStone'] ?? 0),
        f3(equip),
        f3(e['hpSmall'] ?? 0),
        f3(e['revive'] ?? 0),
        f1(1 / (epicChance * ticksDay)),
      ),
    );
  }
}
const small = expectedPerTick(
  lootTable(dropTableDef(cfg, 'pocketParkDefault'), NEUTRAL_CONTEXT, lp),
);
console.log(
  `\npotions: hpSmall ${f1((small['hpSmall'] ?? 0) * ticksPerHour)}/h = one per ${f1(window_s / (small['hpSmall'] ?? 1) / R.minute)} walking min · revive one per ${f1(window_s / (small['revive'] ?? 1) / R.hour)} walking h`,
);

const base = (
  ownClass: OwnClass,
  level: number,
  r: { min: number; max: number },
  pot: boolean,
): Scenario => ({
  tableId: r.max <= R.ranges[0].max ? 'pocketParkDefault' : 'largeParkDefault',
  smallDungeon: true,
  ownClass,
  level,
  rangeMin: r.min,
  rangeMax: r.max,
  withPotionDrops: pot,
  autoRetreatEnabled: true,
  limit_s: R.limit_s,
});
const st = phase2Stats(cfg);

console.log(
  `\n## 3. Phase 2 time to auto-retreat per class, levels 1-5, 1-5 dungeon (Z = clamp(L, 1, 5) = L, D-112), base stats HP ${st.maxHp} DEF ${st.def} VIT ${st.vit}, no gear, no points (F06 R43 / N-03 item 6)`,
);
console.log(
  row(
    'class',
    'L',
    'dmg/hit',
    'no potions p10 / median / p90',
    'potion drops p10 / median / p90',
    'potion before end',
    'potions/run',
    'not ended at limit',
  ),
);
for (const c of CLASSES) {
  for (let level = 1; level <= R.maxStarterLevel; level += 1) {
    const a = loopStats(
      loopInput(cfg, base(c, level, R.ranges[0], false), 0, false),
      R.firstSeed,
      runs,
    );
    const b = loopStats(
      loopInput(cfg, base(c, level, R.ranges[0], true), 0, false),
      R.firstSeed,
      runs,
    );
    const d = soloDamage(level, c, R.ranges[0].min, R.ranges[0].max, st.def, p);
    console.log(
      row(
        c,
        level,
        f1(d),
        `${f1(a.p10_min)} / ${f1(a.median_min)} / ${f1(a.p90_min)}`,
        `${f1(b.p10_min)} / ${f1(b.median_min)} / ${f1(b.p90_min)}`,
        f3(b.potionBeforeEndShare),
        f2(b.potionsUsedPerRun),
        f3(1 - b.endedShare),
      ),
    );
  }
}

console.log(
  `\n## 4. R43: level 1, every class, no potions, median to auto-retreat >= 2 x window_s = ${f1((2 * window_s) / R.minute)} min`,
);
console.log(
  'R43 applies to ranges that cover level 1; the other ranges show level 1 below the range (gap from rangeMin, informational) and the balanced build at rangeMin (Z = rangeMin, analytic, solo non-Tanker x1.6 / damage x1.0).',
);
console.log(
  row(
    'range',
    'Z at L1 (A-1 old)',
    ...CLASSES.map((c) => `${c} L1 median`),
    'R43',
    'balanced @min x1.6 / x1.0',
  ),
);
const r43Min = (2 * window_s) / R.minute;
for (const r of R.ranges) {
  const med = CLASSES.map(
    (c) => loopStats(loopInput(cfg, base(c, 1, r, false), 0, false), R.firstSeed, runs).median_min,
  );
  const covers1 = r.min <= 1 && r.max >= 1;
  const verdict = !covers1
    ? 'n/a (does not cover 1)'
    : med.every((m) => m >= r43Min)
      ? 'PASS'
      : 'FAIL';
  const solo = survivalRow(r.min, { kind: 'noTanker' }, sp).minToRetreat;
  const ref1 = survivalRow(r.min, { kind: 'reference' }, sp).minToRetreat;
  console.log(
    row(
      r.label,
      `${zoneLevelFor(1, r.min, r.max)} (${zoneLevelMidpointA1(r.min, r.max)})`,
      ...med.map((m) => f1(m)),
      verdict,
      `${f1(solo)} / ${f1(ref1)}`,
    ),
  );
}

console.log(
  '\n## 5. D-020 reference (balanced build, level = Z, damage x1.0, no potions; analytic, balance-model 3.3)',
);
const ref = survivalRow(R.l25, { kind: 'reference' }, sp);
const tank = survivalRow(R.l25, { kind: 'tanker', levels: [R.l25] }, sp);
const solo = survivalRow(R.l25, { kind: 'noTanker' }, sp);
console.log(
  `L25 to auto-retreat: reference ${f1(ref.minToRetreat)} min (GDD about 45) · one Tanker L25 ${f1(tank.minToRetreat)} (GDD about 55) · solo non-Tanker x1.6 ${f1(solo.minToRetreat)} (D-020 reported separately)`,
);

console.log(
  `\n## 6. Death vs auto-retreat on the same seed (runSeed ${R.deathSeed}, Ranged L1, 1-5, potion drops, inventory hpSmall 1 + revive 1)`,
);
for (const on of [true, false]) {
  const s = {
    ...base('ranged', 1, R.ranges[0], true),
    autoRetreatEnabled: on,
    inventory: { hpSmall: 1, revive: 1 },
  };
  const r = runLoop(loopInput(cfg, s, R.deathSeed, false));
  console.log(
    `auto-retreat ${on ? 'ON' : 'OFF'} -> ${r.exitReason} at ${f1(r.end_s / R.minute)} min · ticks ${r.ticksGranted} · potions run bag ${r.potionsFromRunBag} / inventory ${r.potionsFromInventory} · exp +${f1(r.expGained)} (kept) · kept ${JSON.stringify(r.kept)} · lost ${JSON.stringify(r.lost)} · inventory after ${JSON.stringify(r.inventoryEnd)}`,
  );
}

console.log(
  '\n## 7. Phase 4 note: gold value of the Phase 2 potion rolls (if they stayed when the NPC shop opens)',
);
const price = (id: string) => num(cfg.economy, `potions.${id}.buyPrice_gold`);
const potGold =
  ((small['hpSmall'] ?? 0) * price('hpSmall') + (small['revive'] ?? 0) * price('revive')) *
  ticksPerHour;
console.log(
  `potion drops worth ${f1(potGold)} gold/h at NPC buy prices (GDD reference potion cost about ${num(cfg.economy, 'gddReferenceEconomy.potionCostPerHour_gold')} gold/h) -> the income/potion target (economy.incomeToPotionRatio, HUMAN) must be re-checked before Phase 4`,
);

console.log(
  '\n## 8. D-112 (J-8) evidence: Z = clamp(L, min, max) against the superseded A-1 (Z = round((min + max) / 2))',
);
console.log(
  '\n### 8.1 Damage per landed hit, balanced build (balance-model 3.2) x1.0, and Phase 2 base stats solo Ranged x1.6 (F06 R08-R09)',
);
console.log(
  row(
    'range',
    'L',
    'Z A-1 -> D-112',
    'balanced x1.0 A-1 -> D-112',
    'change',
    'Phase 2 Ranged A-1 -> D-112',
  ),
);
const hitAt = (z: number, level: number, min: number, def: number, tanker: number | null) =>
  damagePerHit(
    {
      zoneLevel: z,
      def,
      tankerBuff_pct: tanker,
      levelsBelowRange: levelsBelowRange(level, min),
      failedRaidWeek: false,
    },
    sp.monster,
  );
const NO_BUFF = 0;
const OVER_AUTHORITY = 0.2;
let overAuthority = 0;
for (const r of R.ranges) {
  const mid = zoneLevelMidpointA1(r.min, r.max);
  const levels = [...new Set([r.min - 1, r.min, mid, r.max, r.max + 1])].filter(
    (l) => l >= p.exp.startLevel && l <= p.exp.maxLevel,
  );
  for (const level of levels) {
    const zOld = mid;
    const zNew = zoneLevelFor(level, r.min, r.max);
    const def = balancedBuild(level, sp).def;
    const bOld = hitAt(zOld, level, r.min, def, NO_BUFF);
    const bNew = hitAt(zNew, level, r.min, def, NO_BUFF);
    const change = bNew / bOld - 1;
    if (Math.abs(change) > OVER_AUTHORITY) overAuthority += 1;
    const pOld = hitAt(zOld, level, r.min, st.def, null);
    const pNew = hitAt(zNew, level, r.min, st.def, null);
    console.log(
      row(
        r.label.split(' ')[0] ?? r.label,
        level,
        `${zOld} -> ${zNew}`,
        `${f1(bOld)} -> ${f1(bNew)}`,
        `${change >= 0 ? '+' : ''}${f1(change * R.pct)}%`,
        `${f1(pOld)} -> ${f1(pNew)}`,
      ),
    );
  }
}
console.log(
  `rows beyond +-20% of the A-1 value: ${overAuthority} (approved by game-director in J-8 for the low end of wide ranges; the high end gets harder, see 8.3)`,
);

console.log(
  `\n### 8.2 Exp per walking hour in wide ranges (${ticksPerHour} passing ticks/h, solo, f = 1)`,
);
console.log(
  row(
    'range',
    'L',
    'Z A-1 -> D-112',
    'non-Magic exp/h A-1 -> D-112',
    'change',
    'Magic exp/h D-112',
    'ticks L->L+1 non-Magic A-1 -> D-112',
    'D-112 / matched level',
  ),
);
const magicOf = (level: number, c: OwnClass) =>
  c === 'magic' ? soloBuffPct(sp.roles.magic, level, p.buff) : null;
const expA1 = (level: number, c: OwnClass, min: number, max: number) =>
  expPerTick(zoneLevelMidpointA1(min, max), p.exp) *
  expMultiplier(magicOf(level, c), levelsOutsideRange(level, min, max), p.expMult);
/** Exp of the same player in a range that matches its level exactly (Z = L, gap 0). */
const expMatched = (level: number, c: OwnClass) =>
  expPerTick(level, p.exp) * expMultiplier(magicOf(level, c), 0, p.expMult);
const nextTicks = (level: number, perTick: number) =>
  level < p.exp.maxLevel ? f1(expToNext(level, p.exp) / perTick) : '-';
for (const r of R.wideRanges) {
  for (const level of Object.values(R.wideLevels).filter((l) => l >= r.min && l <= r.max + 1)) {
    const oldE = expA1(level, 'ranged', r.min, r.max);
    const newE = soloTickExp(level, 'ranged', r.min, r.max, 1, p);
    const newM = soloTickExp(level, 'magic', r.min, r.max, 1, p);
    console.log(
      row(
        `${r.min}-${r.max}`,
        level,
        `${zoneLevelMidpointA1(r.min, r.max)} -> ${zoneLevelFor(level, r.min, r.max)}`,
        `${f1(oldE * ticksPerHour)} -> ${f1(newE * ticksPerHour)}`,
        `${newE >= oldE ? '+' : ''}${f1((newE / oldE - 1) * R.pct)}%`,
        f1(newM * ticksPerHour),
        `${nextTicks(level, oldE)} -> ${nextTicks(level, newE)}`,
        f3(newE / expMatched(level, 'ranged')),
      ),
    );
  }
}

console.log('\n### 8.3 Runaway check and climb time inside one range');
/**
 * Balanced build (balance-model 3.2) expected minutes to auto-retreat at the D-112 Z of this range,
 * with the most optimistic damage cut: Tanker buff at cap, no potions (analytic, as survivalRow).
 */
const bestCaseMinutes = (level: number, min: number, max: number) => {
  const b = balancedBuild(level, sp);
  const dmg = hitAt(zoneLevelFor(level, min, max), level, min, b.def, sp.roles.tanker.cap_pct);
  const hits = hitsToThreshold(b.hp, dmg, sp.safety.autoRetreatThreshold_pct);
  return expectedSurvival_min(hits, sp.attack.hitChancePerCheck_pct, meanInterval_s(sp));
};
const windowMin = window_s / R.minute;
const worst = { inAbove: 0, below: 0, belowAlive: 0, belowA1: 0 };
const where = { inAbove: '', below: '', belowAlive: '' };
for (const r of R.ranges)
  for (let level = p.exp.startLevel; level <= p.exp.maxLevel; level += 1)
    for (const c of ['ranged', 'magic'] as const) {
      const ratio = soloTickExp(level, c, r.min, r.max, 1, p) / expMatched(level, c);
      const at = `${c} L${level} in ${r.min}-${r.max}`;
      if (level >= r.min) {
        if (ratio > worst.inAbove) [worst.inAbove, where.inAbove] = [ratio, at];
        continue;
      }
      worst.belowA1 = Math.max(worst.belowA1, expA1(level, c, r.min, r.max) / expMatched(level, c));
      if (ratio > worst.below) [worst.below, where.below] = [ratio, at];
      if (ratio > worst.belowAlive && bestCaseMinutes(level, r.min, r.max) >= windowMin)
        [worst.belowAlive, where.belowAlive] = [ratio, at];
    }
console.log(
  `inside or above the range (the J-8 question), every level 1-60 x every pilot range x {non-Magic, Magic}: max exp per tick / matched-level rate (Z = L, gap 0) = ${f3(worst.inAbove)} at ${where.inAbove} (> 1 would be a runaway)`,
);
console.log(
  `below the range (pre-existing A-3 floor x a higher Z, not introduced by D-112): max ratio ${f3(worst.below)} at ${where.below} (A-1 max ${f3(worst.belowA1)}) · among cases where a balanced build with Tanker buff at cap is expected to last >= one window (${f1(windowMin)} min): ${f3(worst.belowAlive)} at ${where.belowAlive}`,
);
const climb = (from: number, to: number, zOf: (l: number) => number) => {
  let ticks = 0;
  for (let l = from; l < to; l += 1)
    ticks += expToNext(l, p.exp) / (expPerTick(zOf(l), p.exp) * p.expMult.noMagicMult);
  return ticks / ticksPerHour;
};
for (const r of R.wideRanges) {
  const mid = zoneLevelMidpointA1(r.min, r.max);
  console.log(
    `solo non-Magic L${r.min} -> L${r.max} staying in ${r.min}-${r.max}: A-1 ${f1(climb(r.min, r.max, () => mid))} h · D-112 ${f1(climb(r.min, r.max, (l) => zoneLevelFor(l, r.min, r.max)))} h · GDD curve (Z = L) ${f1(climb(r.min, r.max, (l) => l))} h`,
  );
}
