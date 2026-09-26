// CLI: evidence of P2-F05-T01 (exp per tick, drop tables per preset incl. potions, Phase 2
// survival per class with and without potion drops, R43, D-020, death vs auto-retreat).
// Run from the repo root: pnpm exec tsx tools/sim/src/report-loop.ts [--runs N]
// Every run is seeded (runSeed = 1..N), so the output repeats exactly.
import { NEUTRAL_CONTEXT, expPerTick, zoneLevel } from '@keep-walking/shared/formulas';
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
import { survivalRow } from './scenarios';

/** Report inputs (not balance values): runs, levels, pilot level ranges, candidate ranges. */
const R = {
  defaultRuns: 2000,
  firstSeed: 1,
  limit_s: 21600,
  maxStarterLevel: 5,
  zones: { a: 1, b: 3, c: 5, d: 10, e: 15, f: 18, g: 20, h: 25, i: 30, j: 40, k: 50, l: 55, m: 60 },
  ranges: [
    { min: 1, max: 5, label: '1-5 (PN-7, PN-8, PN-10, PW-4, PW-5, BR-2, BR-3)' },
    { min: 1, max: 9, label: '1-9 (candidate)' },
    { min: 1, max: 10, label: '1-10 (candidate)' },
    { min: 1, max: 35, label: '1-35 (PN-2)' },
  ],
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
  `\n## 3. Phase 2 time to auto-retreat per class, levels 1-5, 1-5 dungeon (Z = 3), base stats HP ${st.maxHp} DEF ${st.def} VIT ${st.vit}, no gear, no points (F06 R43 / N-03 item 6)`,
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
console.log(row('range', 'Z', ...CLASSES, 'verdict'));
for (const r of R.ranges) {
  const med = CLASSES.map(
    (c) => loopStats(loopInput(cfg, base(c, 1, r, false), 0, false), R.firstSeed, runs).median_min,
  );
  const pass = med.every((m) => m >= (2 * window_s) / R.minute);
  console.log(
    row(
      r.label,
      zoneLevel(r.min, r.max),
      ...med.map((m) => f1(m)),
      pass ? 'PASS' : 'FAIL (finding F-18)',
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
