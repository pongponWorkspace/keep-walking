// Golden-vector conformance test (P2-F05-T02 acceptance, TL N-03): discovers every file in
// design/systems/test-vectors/*.json at test time (import.meta.glob, eager) so a vector file the
// systems-designer adds later is picked up with no code change here. Every vector whose fn this
// task ports must pass; every vector whose fn belongs to a formula not in this task's scope is
// skipped through the explicit, documented SKIP_FNS list below (never silently ignored).
import { describe, expect, it } from 'vitest';
import type { MultiPolygon, Polygon } from 'geojson';
import type { GateFilterParams } from '@keep-walking/geo';
import { boundaryDistance_m as polygonBoundaryDistance_m, pointInPolygon } from '@keep-walking/geo';
import { isWithinTolerance } from '../golden-vector';
import { baseCapStatus, classChangeCost, memberP, roleBuffPct, roleP } from './party';
import { damagePerHit, defReductionRatio, monsterAtk, zoneLevel, type DamageInput } from './damage';
import {
  expMultiplier,
  expPerTick,
  expToNext,
  ticksBetween,
  ticksPerLevel,
  ticksPerLevelCurve,
} from './exp';
import { bossGearStat, gearStat, tierForLevel } from './gear';
import {
  expectedSurvival_min,
  hitsToThreshold,
  hpLossPerHour_pct,
  potionCostPerHour_gold,
} from './survival';
import { RARITIES, dropRates, type DropContext, type DropParams, type Rarity } from './drops';
import type {
  BaseCapRuleParams,
  ExpMultParams,
  ExpParams,
  GearParams,
  MonsterParams,
} from './params';
// P2-F04-T20 (backend, run-state/check-in/speed-lock/opening-hours vectors): the run module
// (packages/shared/src/run) is the production port of tools/sim/src/presence.ts +
// opening-hours.ts (read-only reference, never imported). These vectors are batch (all samples
// in, settled result out, A-P2-F05-T20-3): the case bodies below drive the run module's
// incremental step functions in a loop, the same composition `session` (P2-F05-T08) must do.
import type {
  CheckInParams,
  CheckInResult,
  DungeonSample,
  EdgeHysteresisParams,
  EdgeSide,
  OpeningHours,
  PresenceSample,
  RunStateParams,
  SpeedLockParams,
} from '../run';
import {
  checkInBatch,
  clockCheck,
  closingSoonAt,
  edgeHysteresisBatch,
  isOpenAt,
  openingChangeAfter,
  runTimeline,
  sampleTimeGate,
  speedLockBatch,
} from '../run';

declare global {
  interface ImportMeta {
    glob<T>(
      pattern: string,
      options?: { eager?: boolean; query?: string; import?: string },
    ): Record<string, T>;
  }
}

interface VectorEntry {
  readonly input: Record<string, unknown>;
  readonly expected: unknown;
  readonly tolerance: number;
  readonly source: string;
}
interface VectorFileJson {
  readonly formula: string;
  readonly vectors: readonly VectorEntry[];
}
interface VectorModule {
  readonly default: VectorFileJson;
}

const vectorModules = import.meta.glob<VectorModule>(
  '../../../../design/systems/test-vectors/*.json',
  { eager: true },
);

/**
 * fn values this task does not own, with the reason and (future) owner. A vector fn that is
 * neither handled below nor in this list fails the test loudly instead of being ignored, so a
 * genuinely new formula gets noticed.
 */
const SKIP_FNS: ReadonlySet<string> = new Set([
  // gear.json: needs tools/sim/src/build.ts (full character build), not in this task's port list.
  'characterStats',
  // damage.json: hit-resolution order belongs to the HP engine (P2-F06-T06), not formulas.
  'resolveHit',
  // raid.json: raid party formula, not assigned to a Phase 2 task yet (tools/sim/src/raid.ts).
  'raidPartyMult',
  // drops.json: reporting helper built on top of dropRates, not one of the four named ports.
  'meanDaysBetween',
  // economy.json / party.json: all need tools/sim/src/economy.ts, out of this task's scope.
  'incomePerHour_gold',
  'incomeToPotionRatio',
  'netHpLossPerHour_pct',
  'potionCostNet_gold',
  'ratioStatus',
  'partyEffects',
  'partyPerHeadRatio',
  // movement-gate.json / reward-window.json / partial-tick.json: rewardWindow + drop RNG belong
  // to the reward engine + session (P2-F05-T08, `src/reward`), not this task's `src/run`.
  'gateWindows',
  'passesGate',
  'tauAt',
  'windowIndexOf',
  'partialTick',
  'deriveSeed',
  'streamDraws',
  'rollTickLoot',
  // run-loop.json / tick-reward.json: appeared after this task's brief was written (systems-
  // designer's P2-F05-T01, reference tools/sim/src/loop.ts). The whole solo run loop composing
  // hit + damage + tick + drop belongs to session/reward/hp (P2-F05-T08, P2-F06-T06), not the
  // presence/run-state engine of this task. Flagged in the report as a discovery, not silently
  // dropped.
  'hitAttempt',
  'soloDamage',
  'runLoop',
  'runLoopStats',
  'soloTickExp',
  'lootTable',
  'addExp',
  // opening-hours.json: the home-screen distance display belongs to the client plumbing task
  // (P2-F04-T25, apps/client), not the run engine (tech note F04 R34 is a display concern).
  'displayDistance',
]);

function n(input: Record<string, unknown>, key: string): number {
  const v = input[key];
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number`);
  return v;
}
function nOrNull(input: Record<string, unknown>, key: string): number | null {
  const v = input[key];
  if (v === null) return null;
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number or null`);
  return v;
}
function arr(input: Record<string, unknown>, key: string): number[] {
  const v = input[key];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'number'))
    throw new Error(`vector input "${key}" must be a number array`);
  return v as number[];
}
function boolIn(input: Record<string, unknown>, key: string): boolean {
  const v = input[key];
  if (typeof v !== 'boolean') throw new Error(`vector input "${key}" must be a boolean`);
  return v;
}
function obj(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = input[key];
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new Error(`vector input "${key}" must be an object`);
  return v as Record<string, unknown>;
}
function objArr(input: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = input[key];
  if (!Array.isArray(v)) throw new Error(`vector input "${key}" must be an array`);
  return v as Record<string, unknown>[];
}

// ---- run-state.json, check-in.json, speed-lock.json, opening-hours.json (P2-F04-T20) ----

interface TraceFileSample {
  readonly t: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
}
interface TraceFileJson {
  readonly samples: readonly TraceFileSample[];
}
interface PolygonFileJson {
  readonly features: readonly { readonly geometry: Polygon | MultiPolygon }[];
}

// Raw-text glob (not the default JSON transform, which Vite only wires up for `.json`): the
// fixtures below are `*.trace.json` and `*.geojson`, read the same way tools/sim/src/traces.ts
// reads them (`readFileSync` + `JSON.parse`), except through Vite so this file needs no Node
// types (packages/shared/tsconfig.json intentionally has none, ADR 0003 section 8.3).
const traceRaw = import.meta.glob<string>('../../../../data/gps-traces/synthetic/*.trace.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const polygonRaw = import.meta.glob<string>(
  '../../../../data/gps-traces/synthetic/polygons/*.geojson',
  { eager: true, query: '?raw', import: 'default' },
);

function loadTraceFile(path: string): TraceFileJson {
  const raw = traceRaw[`../../../../${path}`];
  if (raw === undefined) throw new Error(`no trace fixture for ${path}`);
  return JSON.parse(raw) as TraceFileJson;
}

function loadPolygonGeometry(path: string): Polygon | MultiPolygon {
  const raw = polygonRaw[`../../../../${path}`];
  if (raw === undefined) throw new Error(`no polygon fixture for ${path}`);
  const geometry = (JSON.parse(raw) as PolygonFileJson).features[0]?.geometry;
  if (geometry === undefined) throw new Error(`no feature in ${path}`);
  return geometry;
}

/** Inline `samples` (run-state.json, check-in.json, speed-lock.json), or a trace + polygon
 * decimated by `every`/`phase` (run-state.json edge-walk, check-in.json checkInTimeline). */
function presenceSamplesOf(input: Record<string, unknown>): PresenceSample[] {
  const tracePath = input['trace'];
  if (typeof tracePath === 'string') {
    const file = loadTraceFile(tracePath);
    const polygonPath = input['polygon'];
    const polygon = typeof polygonPath === 'string' ? loadPolygonGeometry(polygonPath) : null;
    const every = n(input, 'every');
    const phase = n(input, 'phase');
    return file.samples
      .filter((_, i) => i >= phase && (i - phase) % every === 0)
      .map((s) => ({
        t_ms: s.t,
        lat: s.lat,
        lng: s.lng,
        accuracy_m: s.accuracy,
        inside: polygon === null ? true : pointInPolygon({ lat: s.lat, lng: s.lng }, polygon),
        boundaryDistance_m:
          polygon === null
            ? Number.POSITIVE_INFINITY
            : polygonBoundaryDistance_m({ lat: s.lat, lng: s.lng }, polygon),
      }));
  }
  return objArr(input, 'samples').map((x) => {
    const boundaryDistance_m = x['boundaryDistance_m'];
    return {
      t_ms: n(x, 't_ms'),
      lat: n(x, 'lat'),
      lng: n(x, 'lng'),
      accuracy_m: n(x, 'accuracy_m'),
      inside: x['inside'] !== false,
      // check-in.json / speed-lock.json samples omit this field entirely (not even `null`):
      // only run-state.json's inline samples carry a real boundary distance.
      boundaryDistance_m:
        typeof boundaryDistance_m === 'number' ? boundaryDistance_m : Number.POSITIVE_INFINITY,
    };
  });
}

function runStateParamsOf(i: Record<string, unknown>): RunStateParams {
  return {
    maxSampleAccuracy_m: n(i, 'maxSampleAccuracy_m'),
    outlierSpeed_kmh: n(i, 'outlierSpeed_kmh'),
    outlierReanchorSamples: n(i, 'outlierReanchorSamples'),
    edgeHysteresisSamples: n(i, 'edgeHysteresisSamples'),
    edgeHysteresis_m: n(i, 'edgeHysteresis_m'),
    maxSamplePairGap_s: n(i, 'maxSamplePairGap_s'),
    graceMax_s: n(i, 'graceMax_s'),
    suspendedMax_s: n(i, 'suspendedMax_s'),
  };
}
function speedLockParamsOf(i: Record<string, unknown>): SpeedLockParams {
  return {
    speedLock_kmh: n(i, 'speedLock_kmh'),
    lockSustained_s: n(i, 'lockSustained_s'),
    unlockSustained_s: n(i, 'unlockSustained_s'),
    maxSampleAccuracy_m: n(i, 'maxSampleAccuracy_m'),
    maxSamplePairGap_s: n(i, 'maxSamplePairGap_s'),
  };
}
function checkInParamsOf(
  i: Record<string, unknown>,
): CheckInParams & GateFilterParams & SpeedLockParams {
  return {
    minContinuousApproach_s: n(i, 'minContinuousApproach_s'),
    maxAccuracy_m: n(i, 'maxAccuracy_m'),
    teleportIntoPolygonAllowed: boolIn(i, 'teleportIntoPolygonAllowed'),
    ...speedLockParamsOf(i),
    outlierSpeed_kmh: n(i, 'outlierSpeed_kmh'),
    outlierReanchorSamples: n(i, 'outlierReanchorSamples'),
  };
}

/** Flattens the discriminated `CheckInResult` into the vector's always-three-key shape. */
function flattenCheckIn(r: CheckInResult): {
  ok: boolean;
  reason: string | null;
  readyIn_s: number | null;
} {
  return r.ok ? { ok: true, reason: null, readyIn_s: null } : { ...r };
}

function expParamsOf(i: Record<string, unknown>): ExpParams {
  return {
    expToNextCoef: n(i, 'expToNextCoef'),
    expToNextExponent: n(i, 'expToNextExponent'),
    expPerTickCoef: n(i, 'expPerTickCoef'),
    expPerTickExponent: n(i, 'expPerTickExponent'),
    startLevel: n(i, 'startLevel'),
    maxLevel: n(i, 'maxLevel'),
  };
}
function gearParamsOf(i: Record<string, unknown>): GearParams {
  return {
    gearStatCoef: n(i, 'gearStatCoef'),
    gearStatTierExponent: n(i, 'gearStatTierExponent'),
    enhanceBonusPerLevel: n(i, 'enhanceBonusPerLevel'),
    minTier: n(i, 'minTier'),
    maxTier: n(i, 'maxTier'),
    bossBaseStatMult: typeof i['bossBaseStatMult'] === 'number' ? i['bossBaseStatMult'] : 1,
    bossTier: typeof i['bossTier'] === 'number' ? i['bossTier'] : n(i, 'maxTier'),
  };
}
function monsterParamsOf(i: Record<string, unknown>): MonsterParams {
  return {
    monsterAtkCoef: n(i, 'monsterAtkCoef'),
    monsterAtkExponent: n(i, 'monsterAtkExponent'),
    defSoftcap: n(i, 'defSoftcap'),
    damageMultPerLevelBelowRange: n(i, 'damageMultPerLevelBelowRange'),
    monsterAtkMultAfterFailedRaid: n(i, 'monsterAtkMultAfterFailedRaid'),
    tankerMissingDebuffMult: n(i, 'tankerMissingDebuffMult'),
  };
}
function damageOf(i: Record<string, unknown>): number {
  const input: DamageInput = {
    zoneLevel: n(i, 'zoneLevel'),
    def: n(i, 'def'),
    tankerBuff_pct: nOrNull(i, 'tankerBuff_pct'),
    levelsBelowRange: n(i, 'levelsBelowRange'),
    failedRaidWeek: i['failedRaidWeek'] === true,
  };
  return damagePerHit(input, monsterParamsOf(i));
}
function dropParamsOf(i: Record<string, unknown>): DropParams {
  const chance = obj(i, 'baseChance_pct');
  const prices = typeof i['npcPrice_gold'] === 'object' ? obj(i, 'npcPrice_gold') : {};
  const npcPrice_gold = {} as Record<Rarity, number | null>;
  for (const r of RARITIES) {
    const v = prices[r];
    npcPrice_gold[r] = typeof v === 'number' ? v : null;
  }
  return {
    baseChance_pct: {
      uncommon: n(chance, 'uncommon'),
      rare: n(chance, 'rare'),
      epic: n(chance, 'epic'),
      legendary: n(chance, 'legendary'),
    },
    commonMin: n(i, 'commonMin'),
    commonMax: n(i, 'commonMax'),
    rangedBuffMaxMult: n(i, 'rangedBuffMaxMult'),
    noRangedMult: n(i, 'noRangedMult'),
    smallRareAndAboveMult: n(i, 'smallRareAndAboveMult'),
    smallCommonQtyMult: n(i, 'smallCommonQtyMult'),
    failedRaidWeekMinMult: n(i, 'failedRaidWeekMinMult'),
    failedRaidWeekMaxMult: n(i, 'failedRaidWeekMaxMult'),
    lowTrustMult: n(i, 'lowTrustMult'),
    lowTrustBlocksEpicAndAbove: boolIn(i, 'lowTrustBlocksEpicAndAbove'),
    npcPrice_gold,
    rewardTickInterval_s: n(i, 'rewardTickInterval_s'),
  };
}
function dropContextOf(i: Record<string, unknown>): DropContext {
  return {
    rangedBuff_pct: nOrNull(i, 'rangedBuff_pct'),
    smallDungeon: boolIn(i, 'smallDungeon'),
    lowTrust: boolIn(i, 'lowTrust'),
    failedRaidBossHpLeft: nOrNull(i, 'failedRaidBossHpLeft'),
  };
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Evaluates one vector's input.fn with the formulas this task ports. Throws on an unknown fn. */
function evaluateOwnedVector(input: Record<string, unknown>): unknown {
  const fn = input['fn'];
  switch (fn) {
    // ---- buff-stacking.json ----
    case 'memberP':
      return memberP(
        n(input, 'level'),
        { pPerMemberBase: n(input, 'pPerMemberBase'), pLevelDivisor: n(input, 'pLevelDivisor') },
        n(input, 'levelsOutsideRange'),
        {
          pMultPerLevelOutsideRange: n(input, 'pMultPerLevelOutsideRange'),
          pMultFloor: n(input, 'pMultFloor'),
        },
      );
    case 'roleBuff': {
      const p = roleP(arr(input, 'memberLevels'), {
        pPerMemberBase: n(input, 'pPerMemberBase'),
        pLevelDivisor: n(input, 'pLevelDivisor'),
      });
      return roleBuffPct({ base_pct: n(input, 'base_pct'), cap_pct: n(input, 'cap_pct') }, p);
    }
    case 'baseCapRule': {
      const exceptions = input['intentionalExceptions'];
      if (!Array.isArray(exceptions)) throw new Error('intentionalExceptions must be an array');
      const rule: BaseCapRuleParams = {
        minBaseToCapRatio: n(input, 'minBaseToCapRatio'),
        maxBaseToCapRatio: n(input, 'maxBaseToCapRatio'),
        intentionalExceptions: exceptions.map(String),
      };
      return baseCapStatus(
        String(input['role']),
        { base_pct: n(input, 'base_pct'), cap_pct: n(input, 'cap_pct') },
        rule,
      );
    }
    // ---- class-change.json ----
    case 'classChangeCost':
      return classChangeCost(n(input, 'level'), {
        costCoef_gold: n(input, 'costCoef_gold'),
        costLevelDivisor: n(input, 'costLevelDivisor'),
        costExponent: n(input, 'costExponent'),
      });
    // ---- exp-curve.json ----
    case 'expToNext': {
      const p = expParamsOf(input);
      const level = n(input, 'level');
      return level >= p.maxLevel ? null : expToNext(level, p);
    }
    case 'expPerTick':
      return expPerTick(n(input, 'zoneLevel'), expParamsOf(input));
    case 'ticksPerLevel':
      return ticksPerLevel(
        n(input, 'level'),
        expParamsOf(input),
        n(input, 'zoneLevel'),
        n(input, 'expMultiplier'),
      );
    case 'ticksPerLevelCurve':
      return ticksPerLevelCurve(n(input, 'level'), expParamsOf(input));
    case 'walkMinutesPerLevelCurve':
      return (
        (ticksPerLevelCurve(n(input, 'level'), expParamsOf(input)) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_MINUTE
      );
    case 'walkMinutesPerLevel':
      return (
        (ticksPerLevel(
          n(input, 'level'),
          expParamsOf(input),
          n(input, 'zoneLevel'),
          n(input, 'expMultiplier'),
        ) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_MINUTE
      );
    case 'ticksBetween':
      return ticksBetween(
        n(input, 'fromLevel'),
        n(input, 'toLevel'),
        expParamsOf(input),
        n(input, 'expMultiplier'),
      );
    case 'walkHoursBetween':
      return (
        (ticksBetween(
          n(input, 'fromLevel'),
          n(input, 'toLevel'),
          expParamsOf(input),
          n(input, 'expMultiplier'),
        ) *
          n(input, 'rewardTickInterval_s')) /
        SECONDS_PER_HOUR
      );
    case 'expMultiplier': {
      const p: ExpMultParams = {
        magicBuffMaxMult: n(input, 'magicBuffMaxMult'),
        noMagicMult: n(input, 'noMagicMult'),
        levelGapMultPerLevel: n(input, 'levelGapMultPerLevel'),
        levelGapMultFloor: n(input, 'levelGapMultFloor'),
      };
      return expMultiplier(nOrNull(input, 'magicBuff_pct'), n(input, 'levelsOutsideRange'), p);
    }
    // ---- gear.json ----
    case 'gearStat':
      return gearStat(n(input, 'tier'), n(input, 'enhance'), gearParamsOf(input));
    case 'bossGearStat':
      return bossGearStat(n(input, 'enhance'), gearParamsOf(input));
    case 'tierForLevel':
      return tierForLevel(n(input, 'level'), arr(input, 'levelMaxForTier'));
    // ---- damage.json ----
    case 'zoneLevel':
      return zoneLevel(n(input, 'rangeMin'), n(input, 'rangeMax'));
    case 'monsterAtk':
      return monsterAtk(n(input, 'zoneLevel'), {
        monsterAtkCoef: n(input, 'monsterAtkCoef'),
        monsterAtkExponent: n(input, 'monsterAtkExponent'),
      });
    case 'defReduction_pct':
      return defReductionRatio(n(input, 'def'), n(input, 'defSoftcap')) * 100;
    case 'damagePerHit':
      return damageOf(input);
    case 'hitsToThreshold':
      return hitsToThreshold(n(input, 'maxHp'), n(input, 'damage'), n(input, 'threshold_pct'));
    case 'expectedSurvival_min':
      return expectedSurvival_min(
        n(input, 'hits'),
        n(input, 'hitChance_pct'),
        n(input, 'meanInterval_s'),
      );
    case 'survivalMinutes': {
      const hits = hitsToThreshold(n(input, 'maxHp'), damageOf(input), n(input, 'stopAt_pct'));
      const interval = (n(input, 'intervalMin_s') + n(input, 'intervalMax_s')) / 2;
      return expectedSurvival_min(hits, n(input, 'hitChance_pct'), interval);
    }
    case 'hpLossPerHour_pct':
      return hpLossPerHour_pct(
        n(input, 'damage'),
        n(input, 'maxHp'),
        n(input, 'hitChance_pct'),
        n(input, 'meanInterval_s'),
      );
    case 'potionCostPerHour_gold':
      return potionCostPerHour_gold(
        n(input, 'hpLoss_pctPerHour'),
        n(input, 'heal_pctMaxHp'),
        n(input, 'potionEfficiencyBonus_pct'),
        n(input, 'buyPrice_gold'),
      );
    // ---- drops.json ----
    case 'dropRates': {
      const r = dropRates(dropContextOf(input), dropParamsOf(input));
      return { ...r };
    }
    // ---- run-state.json ----
    case 'edgeHysteresis': {
      const p: EdgeHysteresisParams = {
        edgeHysteresisSamples: n(obj(input, 'params'), 'edgeHysteresisSamples'),
        edgeHysteresis_m: n(obj(input, 'params'), 'edgeHysteresis_m'),
      };
      const initialSide: EdgeSide = input['initialSide'] === 'in' ? 'inside' : 'outside';
      const observations = objArr(input, 'observations').map((x) => ({
        t_ms: n(x, 't_ms'),
        inside: x['inside'] === true,
        boundaryDistance_m: n(x, 'boundaryDistance_m'),
      }));
      return edgeHysteresisBatch(observations, initialSide, p).map((c) => ({
        to: c.to === 'inside' ? 'in' : 'out',
        at_ms: c.at_ms,
      }));
    }
    case 'runTimeline':
      return runTimeline(
        presenceSamplesOf(input),
        n(input, 'confirmAt_ms'),
        n(input, 'now_ms'),
        runStateParamsOf(obj(input, 'params')),
      );
    case 'sampleTimeGate':
      return sampleTimeGate(
        n(input, 't_ms'),
        n(input, 'now_ms'),
        nOrNull(input, 'lastSample_ms'),
        nOrNull(input, 'settled_ms'),
        n(input, 'clockSkewTolerance_s'),
      );
    case 'clockCheck':
      return clockCheck(
        n(input, 'now_ms'),
        nOrNull(input, 'lastNow_ms'),
        n(input, 'clockSkewTolerance_s'),
      );
    // ---- check-in.json ----
    case 'checkIn': {
      const samples = presenceSamplesOf(input) as DungeonSample[];
      return flattenCheckIn(
        checkInBatch(samples, n(input, 'now_ms'), checkInParamsOf(obj(input, 'params'))),
      );
    }
    case 'checkInTimeline': {
      const samples = presenceSamplesOf(input) as DungeonSample[];
      const p = checkInParamsOf(obj(input, 'params'));
      const out: { t_ms: number; ok: boolean; reason: string | null; readyIn_s: number | null }[] =
        [];
      for (const s of samples) {
        const flat = flattenCheckIn(checkInBatch(samples, s.t_ms, p));
        const last = out.at(-1);
        if (last === undefined || last.ok !== flat.ok || last.reason !== flat.reason) {
          out.push({ t_ms: s.t_ms, ...flat });
        }
      }
      return out;
    }
    // ---- speed-lock.json ----
    case 'speedLock':
      return speedLockBatch(presenceSamplesOf(input), speedLockParamsOf(obj(input, 'params')));
    // ---- opening-hours.json ----
    case 'isOpenAt':
      return isOpenAt(
        obj(input, 'hours') as unknown as OpeningHours,
        n(input, 'utcOffset_min'),
        n(input, 't_ms'),
      );
    case 'openingChangeAfter':
      return openingChangeAfter(
        obj(input, 'hours') as unknown as OpeningHours,
        n(input, 'utcOffset_min'),
        n(input, 't_ms'),
      );
    case 'closingSoonAt':
      return closingSoonAt(
        nOrNull(input, 'closesAt_ms'),
        n(input, 'startedAt_ms'),
        n(input, 'closingSoonNotice_s'),
      );
    default:
      throw new Error(`vectors.test.ts does not know how to evaluate fn "${String(fn)}"`);
  }
}

const vectorFileNames = Object.keys(vectorModules).sort();
const vectorFiles = vectorFileNames.map((path) => {
  const file = vectorModules[path];
  if (file === undefined) throw new Error(`unreachable: glob key without a module: ${path}`);
  return { path, name: path.split('/').pop() ?? path, ...file.default };
});
const totalVectorCount = vectorFiles.reduce((sum, f) => sum + f.vectors.length, 0);
const skippedVectorCount = vectorFiles.reduce(
  (sum, f) => sum + f.vectors.filter((v) => SKIP_FNS.has(String(v.input['fn']))).length,
  0,
);

describe('design/systems/test-vectors (dynamic discovery, TL N-03)', () => {
  it('found at least the files this port must reproduce', () => {
    expect(vectorFileNames.length).toBeGreaterThanOrEqual(9);
  });

  it('discovery found both an owned vector and a skipped vector (the split is not empty)', () => {
    // A real regression here (an empty glob, or every fn falling into SKIP_FNS) would make one
    // side 0 without any of the `it`s below failing, since a skip does not run an assertion.
    expect(totalVectorCount).toBeGreaterThan(0);
    expect(skippedVectorCount).toBeGreaterThan(0);
    expect(skippedVectorCount).toBeLessThan(totalVectorCount);
  });

  for (const { name, formula, vectors } of vectorFiles) {
    describe(`${formula} (${name})`, () => {
      // Every vector's fn is either evaluated below or explicitly named in SKIP_FNS: this keeps
      // the assertion for a file whose vectors are 100% out of scope today (economy.json,
      // party.json, raid.json) instead of leaving an empty suite, and it still fails loudly if a
      // fn is neither ported nor in SKIP_FNS (a genuinely new formula this task must notice).
      it('every fn is either evaluated here or named in SKIP_FNS', () => {
        for (const vector of vectors) {
          const fn = String(vector.input['fn']);
          expect(
            SKIP_FNS.has(fn) ||
              (() => {
                evaluateOwnedVector(vector.input);
                return true;
              })(),
          ).toBe(true);
        }
      });

      vectors.forEach((vector, index) => {
        const fn = String(vector.input['fn']);
        if (SKIP_FNS.has(fn)) return;
        it(`[${index}] ${fn}`, () => {
          const actual = evaluateOwnedVector(vector.input);
          expect(
            isWithinTolerance(actual, vector.expected, vector.tolerance),
            `${formula}[${index}] fn=${fn}: expected ${JSON.stringify(vector.expected)}, got ${JSON.stringify(actual)} (tolerance ${vector.tolerance}) · ${vector.source}`,
          ).toBe(true);
        });
      });
    });
  }
});
