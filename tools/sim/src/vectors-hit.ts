// R-B1 hit-resolution vectors (D-078, P2-F06-T01, design gate B-03). Appended to damage.json
// with input.fn = "resolveHit". Rule values (auto-retreat, warning, auto-potion lines, potion
// order and heal) come from SimParams so they move with config; the numbers in CASE are
// example inputs only (a 1,000 HP character makes every line easy to read: 250 / 300 / 400).
import type { HitPotion } from './hit';
import type { SimParams } from './params';
import type { VectorInput, VectorLeaf, VectorOutput } from './vector-eval';
import { evaluateVector } from './vector-eval';
import type { Vector } from './vectors';

const SIM_TOLERANCE = 1e-6;
const SIM_DECIMALS = 6;
const DECIMAL_BASE = 10;
const SIM = 'sim run P2-F06-T01 (reference implementation tools/sim/src/hit.ts, R-B1 D-078)';

/** Example inputs (not balance values). */
const CASE = {
  maxHp: 1000,
  normalDamage: 100,
  overkillDamage: 5000,
  shield: { full: 150, partial: 40, exact: 100, beforeOverkill: 200 },
  justUnder: 0.5,
  oneHp: 1,
  syntheticWeakPotion_pctMaxHp: 10,
  hpAlreadyLow: 100,
  hpMid: 500,
} as const;

function roundSim(value: VectorOutput): VectorOutput {
  const f = DECIMAL_BASE ** SIM_DECIMALS;
  if (typeof value === 'number') return Math.round(value * f) / f;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, VectorLeaf> = {};
    for (const [k, v] of Object.entries(value))
      out[k] = typeof v === 'number' ? Math.round(v * f) / f : v;
    return out;
  }
  return value;
}

function sim(input: VectorInput, note: string): Vector {
  return {
    input,
    expected: roundSim(evaluateVector(input)),
    tolerance: SIM_TOLERANCE,
    source: `${SIM} · ${note}`,
  };
}

export interface HitBuild {
  maxHp: number;
  damage: number;
  vitBonus_pct: number;
}

export function hitResolutionVectors(p: SimParams, build: HitBuild): Vector[] {
  const s = p.safety;
  const max = CASE.maxHp;
  const retreatHp = (max * s.autoRetreatThreshold_pct) / 100;
  const warnHp = (max * s.lowHpWarningThreshold_pct) / 100;
  const potionHp = (max * s.autoPotionThreshold_pct) / 100;
  const inventory = (counts: number[]): HitPotion[] =>
    s.potionOrder.map((id, k) => ({
      id,
      heal_pctMaxHp: (p.potions[id] as { heal_pctMaxHp: number }).heal_pctMaxHp,
      count: counts[k] ?? 0,
    }));
  const full = inventory(s.potionOrder.map(() => 1));
  const empty = inventory([]);
  const onlyLast = inventory(s.potionOrder.map((_, k) => (k === s.potionOrder.length - 1 ? 1 : 0)));
  const skipFirst = inventory(s.potionOrder.map((_, k) => (k === 0 ? 0 : 1)));
  const first = s.potionOrder[0] as string;
  const firstHeal = (max * (p.potions[first] as { heal_pctMaxHp: number }).heal_pctMaxHp) / 100;
  const base = {
    fn: 'resolveHit',
    maxHp: max,
    shield: 0,
    autoRetreatEnabled: true,
    autoRetreatThreshold_pct: s.autoRetreatThreshold_pct,
    lowHpWarningThreshold_pct: s.lowHpWarningThreshold_pct,
    autoPotionEnabled: true,
    autoPotionThreshold_pct: s.autoPotionThreshold_pct,
    potionEfficiencyBonus_pct: 0,
    potions: full,
  };
  const v: Vector[] = [];
  const add = (over: Record<string, unknown>, note: string) =>
    v.push(sim({ ...base, ...over }, `R-B1 ${note}`));

  add({ hp: max, damage: CASE.normalDamage }, 'normal: no shield, no event');
  add({ hp: max, damage: 0 }, 'boundary: damage 0 → nothing changes');
  add(
    { hp: max, damage: CASE.normalDamage, shield: CASE.shield.full },
    'step 1: shield absorbs the whole hit',
  );
  add(
    { hp: max, damage: CASE.normalDamage, shield: CASE.shield.partial },
    'step 1: shield absorbs part, rest hits HP',
  );
  add(
    { hp: max, damage: CASE.normalDamage, shield: CASE.shield.exact },
    'boundary: shield equal to damage → HP unchanged, shield 0',
  );
  add(
    { hp: max, damage: CASE.overkillDamage, potions: empty },
    'step 2 edge: auto-retreat ON, one hit larger than max HP → HP 1, autoRetreat, warning',
  );
  add(
    { hp: max, damage: CASE.overkillDamage, shield: CASE.shield.beforeOverkill, potions: empty },
    'step 1+2: shield first, then HP floored at 1',
  );
  add(
    { hp: max, damage: CASE.overkillDamage },
    `step 3 edge: floored at 1 then ${first} (1 + ${firstHeal}) ends above the warning line ${warnHp} → continue, no warning (warning uses final HP)`,
  );
  add(
    { hp: max, damage: CASE.overkillDamage, potionEfficiencyBonus_pct: build.vitBonus_pct },
    `step 3: potion heal x (1 + VIT bonus ${build.vitBonus_pct}%)`,
  );
  add(
    { hp: max, damage: CASE.overkillDamage, autoPotionEnabled: false },
    'auto-potion OFF with potions in bag → HP 1, autoRetreat',
  );
  add(
    { hp: max, damage: CASE.overkillDamage, autoRetreatEnabled: false },
    'step 2 edge: auto-retreat OFF, overkill → died, no potion, no warning',
  );
  add(
    { hp: CASE.hpAlreadyLow, damage: CASE.hpAlreadyLow, autoRetreatEnabled: false },
    'boundary: auto-retreat OFF, damage equal to HP → died',
  );
  add(
    {
      hp: CASE.hpAlreadyLow,
      damage: CASE.hpAlreadyLow - CASE.justUnder,
      autoRetreatEnabled: false,
    },
    'boundary: auto-retreat OFF, HP left 0.5 > 0 → alive, potion; already under warning line → no warning',
  );
  add(
    { hp: potionHp, damage: potionHp - retreatHp, potions: empty },
    `step 4 boundary: final HP exactly ${s.autoRetreatThreshold_pct}% → autoRetreat (<=)`,
  );
  add(
    { hp: potionHp, damage: potionHp - retreatHp - CASE.oneHp, potions: empty },
    `step 4 boundary: final HP ${s.autoRetreatThreshold_pct}% + 1 → continue, warning`,
  );
  add(
    { hp: potionHp, damage: potionHp - retreatHp, potions: empty, autoRetreatEnabled: false },
    'auto-retreat OFF: final HP at the retreat line → continue (no retreat), warning',
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - warnHp, potions: empty },
    `step 5 boundary: final HP exactly ${s.lowHpWarningThreshold_pct}% from above → warning (<=)`,
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - warnHp - CASE.oneHp, potions: empty },
    `step 5 boundary: final HP ${s.lowHpWarningThreshold_pct}% + 1 → no warning`,
  );
  add(
    { hp: warnHp - CASE.oneHp, damage: CASE.oneHp, potions: empty, autoRetreatEnabled: false },
    'step 5: HP already under the warning line → no second warning (one per downward crossing)',
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - potionHp },
    `step 3 boundary: HP exactly ${s.autoPotionThreshold_pct}% → no potion (strict <)`,
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - potionHp + CASE.justUnder },
    `step 3 boundary: HP just under ${s.autoPotionThreshold_pct}% → ${first}`,
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - potionHp + CASE.justUnder, potions: skipFirst },
    `step 3: ${first} count 0 → next potion in order`,
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - potionHp + CASE.justUnder, potions: onlyLast },
    'step 3: heal capped at max HP (potionHealed < heal)',
  );
  add(
    { hp: CASE.hpMid, damage: CASE.hpMid - retreatHp },
    `step 3 before 4: potion lifts HP from the retreat line → continue, no warning`,
  );
  add(
    {
      hp: max,
      damage: CASE.overkillDamage,
      potions: [
        { id: 'syntheticWeak', heal_pctMaxHp: CASE.syntheticWeakPotion_pctMaxHp, count: 1 },
      ],
    },
    'step 3 then 4 (synthetic potion, not config): potion used but HP still under retreat line → autoRetreat, warning',
  );
  add(
    {
      hp: build.maxHp,
      maxHp: build.maxHp,
      damage: build.damage,
      potionEfficiencyBonus_pct: build.vitBonus_pct,
    },
    'normal: L25 balanced build, damage x1.0, full HP',
  );
  return v;
}
