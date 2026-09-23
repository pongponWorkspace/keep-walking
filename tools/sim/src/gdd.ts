// Typed access to tools/sim/gdd-reference.json (GDD targets for comparison only).
import type { JsonObject } from './config';
import { REPO_ROOT, num, numArray, readJsonFile, str, valueKeys } from './config';

export const GDD_REFERENCE_PATH = `${REPO_ROOT}tools/sim/gdd-reference.json`;

export interface GddReference {
  buff: {
    source: string;
    memberLevel: number;
    tankerByCount_pct: number[];
    singleMember_pct: Record<string, number>;
    tolerance_pct: number;
    equivalence: {
      role: string;
      oneMemberLevel: number;
      twoMembersLevel: number;
      tolerance_pct: number;
    };
  };
  exp: {
    source: string;
    ticksPerLevel: Record<string, number>;
    ticksPerLevelTolerance: number;
    walkMinutesPerLevel: Record<string, number>;
    walkMinutesTolerance: number;
    totalTicksToMax: number;
    totalHoursToMax: number;
    totalsTolerance_ratio: number;
    hoursToLevel: number;
    hoursToLevelValue: number;
    hoursToLevelTolerance_ratio: number;
    casualMinutesPerDay: number;
    casualDaysToMaxText: string;
    heavyMinutesPerDay: number;
    heavyDaysToMaxText: string;
  };
  gear: {
    source: string;
    enhanceLevels: number[];
    byTier: Record<string, number[]>;
    tolerance: number;
  };
  extremes: {
    source: string;
    level: number;
    atk: number;
    def: number;
    defReduction_pct: number;
    defReductionTolerance_pct: number;
    hp: number;
  };
  defense: { source: string; def: number; defReduction_pct: number };
  classChange: { source: string; costByLevel_gold: Record<string, number> };
  survival: {
    source: string;
    fitLevel: number;
    tankerLevel: number;
    referenceMatchingLevel_min: number;
    withTanker_min: number;
    tolerance_ratio: number;
    decisionShortfall_ratio: number;
    reportLevels: number[];
  };
  drops: { source: string; aboutTolerance_ratio: number };
  economy: {
    source: string;
    incomeTolerance_ratio: number;
    potionCostTolerance_ratio: number;
    gddRatio: number;
    gddRatioTolerance: number;
  };
  party: { source: string; level: number };
}

function numMap(root: JsonObject, path: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of valueKeys(root, path)) out[key] = num(root, `${path}.${key}`);
  return out;
}

function arrMap(root: JsonObject, path: string): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const key of valueKeys(root, path)) out[key] = numArray(root, `${path}.${key}`);
  return out;
}

/** The "_source" string of a section (metadata read on purpose, for vector provenance only). */
function sourceOf(root: JsonObject, section: string): string {
  const node = root[section];
  if (typeof node !== 'object' || node === null || Array.isArray(node))
    throw new Error(`missing ${section}`);
  const source = node['_source'];
  if (typeof source !== 'string') throw new Error(`missing _source in ${section}`);
  return source;
}

export function loadGddReference(path: string = GDD_REFERENCE_PATH): GddReference {
  const raw = readJsonFile(path);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('bad gdd-reference.json');
  const r = raw;
  return {
    buff: {
      source: sourceOf(r, 'buffStacking'),
      memberLevel: num(r, 'buffStacking.memberLevel'),
      tankerByCount_pct: numArray(r, 'buffStacking.tankerByCount_pct'),
      singleMember_pct: numMap(r, 'buffStacking.singleMember_pct'),
      tolerance_pct: num(r, 'buffStacking.tolerance_pct'),
      equivalence: {
        role: str(r, 'buffStacking.equivalence.role'),
        oneMemberLevel: num(r, 'buffStacking.equivalence.oneMemberLevel'),
        twoMembersLevel: num(r, 'buffStacking.equivalence.twoMembersLevel'),
        tolerance_pct: num(r, 'buffStacking.equivalence.tolerance_pct'),
      },
    },
    exp: {
      source: sourceOf(r, 'expCurve'),
      ticksPerLevel: numMap(r, 'expCurve.ticksPerLevel'),
      ticksPerLevelTolerance: num(r, 'expCurve.ticksPerLevelTolerance'),
      walkMinutesPerLevel: numMap(r, 'expCurve.walkMinutesPerLevel'),
      walkMinutesTolerance: num(r, 'expCurve.walkMinutesTolerance'),
      totalTicksToMax: num(r, 'expCurve.totalTicksToMax'),
      totalHoursToMax: num(r, 'expCurve.totalHoursToMax'),
      totalsTolerance_ratio: num(r, 'expCurve.totalsTolerance_ratio'),
      hoursToLevel: num(r, 'expCurve.hoursToLevel'),
      hoursToLevelValue: num(r, 'expCurve.hoursToLevelValue'),
      hoursToLevelTolerance_ratio: num(r, 'expCurve.hoursToLevelTolerance_ratio'),
      casualMinutesPerDay: num(r, 'expCurve.casualMinutesPerDay'),
      casualDaysToMaxText: str(r, 'expCurve.casualDaysToMaxText'),
      heavyMinutesPerDay: num(r, 'expCurve.heavyMinutesPerDay'),
      heavyDaysToMaxText: str(r, 'expCurve.heavyDaysToMaxText'),
    },
    gear: {
      source: sourceOf(r, 'gear'),
      enhanceLevels: numArray(r, 'gear.enhanceLevels'),
      byTier: arrMap(r, 'gear.byTier'),
      tolerance: num(r, 'gear.tolerance'),
    },
    extremes: {
      source: sourceOf(r, 'statExtremes'),
      level: num(r, 'statExtremes.level'),
      atk: num(r, 'statExtremes.atk'),
      def: num(r, 'statExtremes.def'),
      defReduction_pct: num(r, 'statExtremes.defReduction_pct'),
      defReductionTolerance_pct: num(r, 'statExtremes.defReductionTolerance_pct'),
      hp: num(r, 'statExtremes.hp'),
    },
    defense: {
      source: sourceOf(r, 'defense'),
      def: num(r, 'defense.def'),
      defReduction_pct: num(r, 'defense.defReduction_pct'),
    },
    classChange: {
      source: sourceOf(r, 'classChange'),
      costByLevel_gold: numMap(r, 'classChange.costByLevel_gold'),
    },
    survival: {
      source: sourceOf(r, 'survival'),
      fitLevel: num(r, 'survival.fitLevel'),
      tankerLevel: num(r, 'survival.tankerLevel'),
      referenceMatchingLevel_min: num(r, 'survival.referenceMatchingLevel_min'),
      withTanker_min: num(r, 'survival.withTanker_min'),
      tolerance_ratio: num(r, 'survival.tolerance_ratio'),
      decisionShortfall_ratio: num(r, 'survival.decisionShortfall_ratio'),
      reportLevels: numArray(r, 'survival.reportLevels'),
    },
    drops: {
      source: sourceOf(r, 'drops'),
      aboutTolerance_ratio: num(r, 'drops.aboutTolerance_ratio'),
    },
    economy: {
      source: sourceOf(r, 'economy'),
      incomeTolerance_ratio: num(r, 'economy.incomeTolerance_ratio'),
      potionCostTolerance_ratio: num(r, 'economy.potionCostTolerance_ratio'),
      gddRatio: num(r, 'economy.gddRatio'),
      gddRatioTolerance: num(r, 'economy.gddRatioTolerance'),
    },
    party: { source: sourceOf(r, 'party'), level: num(r, 'party.level') },
  };
}
