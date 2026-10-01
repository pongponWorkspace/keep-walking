// Golden-vector conformance test (P2-F05-T02 acceptance, TL N-03): discovers every file in
// design/systems/test-vectors/*.json at test time (import.meta.glob, eager) so a vector file the
// systems-designer adds later is picked up with no code change here. Every vector whose fn this
// task ports must pass; every vector whose fn belongs to a formula not in this task's scope is
// skipped through the explicit, documented SKIP_FNS list below (never silently ignored).
import { describe, expect, it } from 'vitest';
import type { MultiPolygon, Polygon } from 'geojson';
import type { GateFilterParams } from '@keep-walking/geo';
import {
  MS_PER_S,
  boundaryDistance_m as polygonBoundaryDistance_m,
  pointInPolygon,
} from '@keep-walking/geo';
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
  BuffParams,
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
// P2-F05-T08 (backend, reward engine): movement-gate.json, reward-window.json and
// partial-tick.json share the batch `gateWindows` reference; tick-reward.json exercises the drop
// table resolver, the loot roll and the solo exp formula (`session`'s incremental composition of
// the same functions is untestable through these batch vectors, TL B-07 / this task's report).
import type {
  ClockInterval as RewardClockInterval,
  DropTableDef,
  GateParams as RewardGateParams,
  LootParams,
  LootRarity,
  PlayerClass,
  SoloTickExpParams,
} from '../reward';
import {
  addExp,
  gateWindows,
  lootTable,
  parseDropTable,
  partialTick,
  passesGate,
  rollTickLoot,
  soloTickExp,
  tauAt,
  windowIndexOf,
} from '../reward';
import { deriveSeed, streamRng, type StreamTag } from './rng';
// P2-F10-T12 (backend, character-name filter + random-name generator): character-name.json's
// `vectors` carry only `name`/`rngDraws`/`paramsOverride` (not every parameter inline like the
// formulas above) because `params` is the whole of config/balance/character.json — too large to
// repeat per vector (the file's own `_note`). `baseCharacterParams` + `applyParamsOverride` below
// are this task's minimal registration glue; the full suite (contentVectors, the random-name pool
// check, the 10,000-seed property test) lives in `../character/character.test.ts`, not here.
import { randomCharacterName, validateCharacterName } from '../character';
import type { CharacterNameParams, Lexicon, NameRng } from '../character';
import rawCharacterParams from '../../../../config/balance/character.json';

const baseCharacterParams = rawCharacterParams as unknown as CharacterNameParams;

function applyParamsOverride(base: CharacterNameParams, overrides: unknown): CharacterNameParams {
  if (overrides === undefined) return base;
  if (typeof overrides !== 'object' || overrides === null) {
    throw new Error('vector input "paramsOverride" must be an object');
  }
  const clone = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides as Record<string, unknown>)) {
    const parts = path.split('.');
    const last = parts.pop();
    if (last === undefined) throw new Error('empty paramsOverride path');
    let node: Record<string, unknown> = clone;
    for (const part of parts) {
      const next = node[part];
      if (typeof next !== 'object' || next === null) {
        throw new Error(`paramsOverride path "${path}" does not resolve (at "${part}")`);
      }
      node = next as Record<string, unknown>;
    }
    node[last] = value;
  }
  return clone as unknown as CharacterNameParams;
}

function characterRngFromDraws(draws: readonly number[]): NameRng {
  let i = 0;
  return () => {
    const v = draws[i];
    if (v === undefined)
      throw new Error('character rngDraws: exhausted (vector drew too many times)');
    i += 1;
    return v;
  };
}
// P2-F06-T06 (backend, HP engine): damage.json's `resolveHit` and run-loop.json's `hitAttempt` /
// `soloDamage` are evaluated at `hp` level (tech note F06 13.1); `runLoop` / `runLoopStats` are
// evaluated through a local harness (13.2 item (a)) that composes `hp`'s own fns the same way
// `tools/sim/src/loop.ts` (reference, never imported) composes its local ones — this harness is
// deliberately not exported from `hp` (13.2: "harness ... only in the test file, not an API").
import type { AttemptContext, HpParams, PotionSource } from '../hp';
import {
  applyAttempt,
  hitAttempt,
  hpAt,
  onGrantedTick,
  recoveredAt_ms,
  resolveHit,
  runHpInit,
  soloHitDamage,
  supportHealThrough,
} from '../hp';

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
  // character-name.json only (P2-F10-T12): the fixture lexicon `validateCharacterName`/
  // `randomCharacterName` resolve their lexicon paths against. Every other vector file omits it.
  readonly lexicon?: unknown;
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

// ---- movement-gate.json / reward-window.json / partial-tick.json / tick-reward.json helpers ----
function clockOf(input: Record<string, unknown>): RewardClockInterval[] {
  return objArr(input, 'clock').map((c) => ({
    start_ms: n(c, 'start_ms'),
    end_ms: nOrNull(c, 'end_ms'),
  }));
}
function rewardGateParamsOf(i: Record<string, unknown>): RewardGateParams {
  return {
    window_s: n(i, 'window_s'),
    minDistancePerWindow_m: n(i, 'minDistancePerWindow_m'),
    comparison: String(i['comparison']),
    sampleCadence_s: n(i, 'sampleCadence_s'),
    maxSamplePairGap_s: n(i, 'maxSamplePairGap_s'),
    maxSampleAccuracy_m: n(i, 'maxSampleAccuracy_m'),
    outlierSpeed_kmh: n(i, 'outlierSpeed_kmh'),
    outlierReanchorSamples: n(i, 'outlierReanchorSamples'),
    speedLock_kmh: n(i, 'speedLock_kmh'),
  };
}
function streamTagOf(v: unknown): StreamTag {
  if (v === 'drop' || v === 'hit') return v;
  throw new Error(`vector streamTag must be "drop" or "hit", got ${String(v)}`);
}
function lootRarityOf(x: Record<string, unknown>): LootRarity {
  return {
    rarity: String(x['rarity']),
    chance_pct: nOrNull(x, 'chance_pct'),
    qtyMult: n(x, 'qtyMult'),
    chanceMult: n(x, 'chanceMult'),
    items: objArr(x, 'items').map((it) => ({
      id: String(it['id']),
      weight: n(it, 'weight'),
      qtyMin: n(it, 'qtyMin'),
      qtyMax: n(it, 'qtyMax'),
    })),
  };
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

// ---- run-loop.json harness (P2-F06-T06, tech note F06 13.2 item (a)): a local reimplementation
// of tools/sim/src/loop.ts's `runLoop`/`loopStats` (reference, never imported) that composes
// `../hp`'s own ported fns instead of tools/sim's local ones, so the `runLoop`/`runLoopStats`
// vectors exercise the real engine's hit-clock building blocks, not a duplicate of them. Not
// exported: this is the test's own evaluator, matching the vector's exact shape.
function numRecordOf(o: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'number') throw new Error(`expected a number at "${k}"`);
    out[k] = v;
  }
  return out;
}
function strArr(input: Record<string, unknown>, key: string): string[] {
  const v = input[key];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new Error(`vector input "${key}" must be a string array`);
  }
  return v as string[];
}
function loopRoleOf(x: Record<string, unknown>): { base_pct: number; cap_pct: number } {
  return { base_pct: n(x, 'base_pct'), cap_pct: n(x, 'cap_pct') };
}

interface HarnessLoopParams {
  readonly window_s: number;
  readonly intervalMin_s: number;
  readonly intervalMax_s: number;
  readonly hitChance_pct: number;
  readonly monster: MonsterParams;
  readonly buff: BuffParams;
  readonly roles: {
    tanker: { base_pct: number; cap_pct: number };
    support: { base_pct: number; cap_pct: number };
    magic: { base_pct: number; cap_pct: number };
  };
  readonly supportHealBase_pctMaxHpPerMin: number;
  readonly magicShieldPerTick_pctMaxHpPerBuffPct: number;
  readonly exp: ExpParams;
  readonly expMult: ExpMultParams;
  readonly autoRetreatThreshold_pct: number;
  readonly lowHpWarningThreshold_pct: number;
  readonly autoPotionEnabled: boolean;
  readonly autoPotionThreshold_pct: number;
  readonly vitPotionEfficiency_pct: number;
  readonly potionHeal_pct: Record<string, number>;
  readonly potionOrder: readonly string[];
  readonly sourceOrder: readonly string[];
}

function loopParamsOf(p: Record<string, unknown>): HarnessLoopParams {
  const roles = obj(p, 'roles');
  const buff = obj(p, 'buff');
  const expMult = obj(p, 'expMult');
  return {
    window_s: n(p, 'window_s'),
    intervalMin_s: n(p, 'intervalMin_s'),
    intervalMax_s: n(p, 'intervalMax_s'),
    hitChance_pct: n(p, 'hitChance_pct'),
    monster: monsterParamsOf(obj(p, 'monster')),
    buff: { pPerMemberBase: n(buff, 'pPerMemberBase'), pLevelDivisor: n(buff, 'pLevelDivisor') },
    roles: {
      tanker: loopRoleOf(obj(roles, 'tanker')),
      support: loopRoleOf(obj(roles, 'support')),
      magic: loopRoleOf(obj(roles, 'magic')),
    },
    supportHealBase_pctMaxHpPerMin: n(p, 'supportHealBase_pctMaxHpPerMin'),
    magicShieldPerTick_pctMaxHpPerBuffPct: n(p, 'magicShieldPerTick_pctMaxHpPerBuffPct'),
    exp: expParamsOf(obj(p, 'exp')),
    expMult: {
      magicBuffMaxMult: n(expMult, 'magicBuffMaxMult'),
      noMagicMult: n(expMult, 'noMagicMult'),
      levelGapMultPerLevel: n(expMult, 'levelGapMultPerLevel'),
      levelGapMultFloor: n(expMult, 'levelGapMultFloor'),
    },
    autoRetreatThreshold_pct: n(p, 'autoRetreatThreshold_pct'),
    lowHpWarningThreshold_pct: n(p, 'lowHpWarningThreshold_pct'),
    autoPotionEnabled: boolIn(p, 'autoPotionEnabled'),
    autoPotionThreshold_pct: n(p, 'autoPotionThreshold_pct'),
    vitPotionEfficiency_pct: n(p, 'vitPotionEfficiency_pct'),
    potionHeal_pct: numRecordOf(obj(p, 'potionHeal_pct')),
    potionOrder: strArr(p, 'potionOrder'),
    sourceOrder: strArr(p, 'sourceOrder'),
  };
}

interface HarnessLoopInput {
  readonly runSeed: number;
  readonly limit_s: number;
  readonly failedTicks: readonly number[];
  readonly ownClass: PlayerClass;
  readonly level: number;
  readonly exp: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly def: number;
  readonly vit: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly autoRetreatEnabled: boolean;
  readonly inventory: Record<string, number>;
  readonly table: LootRarity[];
  readonly params: HarnessLoopParams;
  readonly recordEvents: boolean;
}

function loopInputOf(input: Record<string, unknown>): Omit<HarnessLoopInput, 'runSeed'> {
  return {
    limit_s: n(input, 'limit_s'),
    failedTicks: arr(input, 'failedTicks'),
    ownClass: String(input['ownClass']) as PlayerClass,
    level: n(input, 'level'),
    exp: n(input, 'exp'),
    maxHp: n(input, 'maxHp'),
    hp: n(input, 'hp'),
    def: n(input, 'def'),
    vit: n(input, 'vit'),
    rangeMin: n(input, 'rangeMin'),
    rangeMax: n(input, 'rangeMax'),
    autoRetreatEnabled: boolIn(input, 'autoRetreatEnabled'),
    inventory: numRecordOf(obj(input, 'inventory')),
    table: objArr(input, 'table').map(lootRarityOf),
    params: loopParamsOf(obj(input, 'params')),
    recordEvents: boolIn(input, 'recordEvents'),
  };
}

type HarnessLoopEvent =
  | {
      readonly t_s: number;
      readonly type: 'tick';
      readonly k: number;
      readonly granted: boolean;
      readonly exp: number;
      readonly level: number;
      readonly shield: number;
      readonly loot: string;
    }
  | {
      readonly t_s: number;
      readonly type: 'attempt';
      readonly i: number;
      readonly landed: boolean;
      readonly damage: number;
      readonly hpAfter: number;
      readonly shieldAfter: number;
      readonly potion: string | null;
      readonly warning: boolean;
      readonly outcome: string;
    };

interface HarnessLoopResult {
  readonly exitReason: 'auto_retreat' | 'death' | 'manual_exit';
  readonly end_s: number;
  readonly ticksEvaluated: number;
  readonly ticksGranted: number;
  readonly attempts: number;
  readonly hitsLanded: number;
  readonly potionsFromRunBag: number;
  readonly potionsFromInventory: number;
  readonly firstPotionDrop_s: number | null;
  readonly lowHpWarnings: number;
  readonly hpEnd: number;
  readonly levelEnd: number;
  readonly expEnd: number;
  readonly expGained: number;
  readonly runBag: Record<string, number>;
  readonly kept: Record<string, number>;
  readonly lost: Record<string, number>;
  readonly inventoryEnd: Record<string, number>;
  readonly events: readonly HarnessLoopEvent[] | null;
}

/** Placeholder `HpParams` for the `soloDamage` vector (only `monster`/`roles.tanker`/`buff`
 * matter there): every other field is harmless filler, never read by `soloHitDamage`. */
const DUMMY_HP_PARAMS: HpParams = {
  attack: { intervalMin_s: 1, intervalMax_s: 1, hitChancePerCheck_pct: 0 },
  monster: {
    monsterAtkCoef: 0,
    monsterAtkExponent: 0,
    defSoftcap: 1,
    damageMultPerLevelBelowRange: 1,
    monsterAtkMultAfterFailedRaid: 1,
    tankerMissingDebuffMult: 1,
  },
  buff: { pPerMemberBase: 1, pLevelDivisor: 50 },
  roles: {
    tanker: { base_pct: 0, cap_pct: 1 },
    support: { base_pct: 0, cap_pct: 1, inDungeonHealBase_pctMaxHpPerMin: 0 },
    magic: { base_pct: 0, cap_pct: 1, shieldPerRewardTick_pctMaxHpPerBuffPct: 0 },
  },
  safety: {
    autoRetreatEnabledByDefault: true,
    autoRetreatThreshold_pct: 25,
    lowHpWarningThreshold_pct: 30,
    autoPotionEnabled: true,
    autoPotionThreshold_pct: 40,
    potionOrder: [],
    sourceOrder: ['runBag', 'inventory'],
  },
  potions: {},
  player: {
    baseStats: { hp: 1, def: 0, vit: 0 },
    statPerPoint: { hp: 0, def: 0, vitHpRegenSpeed_pct: 0, vitPotionEfficiency_pct: 0 },
    hpRecovery: { deathRecoveryTo_pct: 50, outsideDungeonRegen_pctMaxHpPerMin: 1 },
  },
};

// ---- hp-recovery.json (P2-H47): `hpAfterRegen`/`recoveryTime` are ported through `../hp`'s own
// `hpAt`/`recoveredAt_ms` (tech note F06 6.1-6.2), read against an arbitrary anchor A = 0 — the
// closed form is anchor-relative (D-094: no wall-clock timer), so any anchor reproduces the
// vector's `elapsed_ms`-from-now shape. Only the three regen-relevant `player` fields vary per
// vector; every other `HpParams` field is `DUMMY_HP_PARAMS` filler, never read by `hpAt`/
// `recoveredAt_ms`. */
const HP_RECOVERY_ANCHOR_MS = 0;
function hpRecoveryParamsOf(i: Record<string, unknown>): HpParams {
  return {
    ...DUMMY_HP_PARAMS,
    player: {
      ...DUMMY_HP_PARAMS.player,
      statPerPoint: {
        ...DUMMY_HP_PARAMS.player.statPerPoint,
        vitHpRegenSpeed_pct: n(i, 'vitHpRegenSpeed_pct'),
      },
      hpRecovery: {
        deathRecoveryTo_pct: n(i, 'deathRecoveryTo_pct'),
        outsideDungeonRegen_pctMaxHpPerMin: n(i, 'outsideDungeonRegen_pctMaxHpPerMin'),
      },
    },
  };
}

function loopHpParamsOf(p: HarnessLoopParams): HpParams {
  return {
    attack: {
      intervalMin_s: p.intervalMin_s,
      intervalMax_s: p.intervalMax_s,
      hitChancePerCheck_pct: p.hitChance_pct,
    },
    monster: p.monster,
    buff: p.buff,
    roles: {
      tanker: p.roles.tanker,
      support: {
        ...p.roles.support,
        inDungeonHealBase_pctMaxHpPerMin: p.supportHealBase_pctMaxHpPerMin,
      },
      magic: {
        ...p.roles.magic,
        shieldPerRewardTick_pctMaxHpPerBuffPct: p.magicShieldPerTick_pctMaxHpPerBuffPct,
      },
    },
    safety: {
      autoRetreatEnabledByDefault: true,
      autoRetreatThreshold_pct: p.autoRetreatThreshold_pct,
      lowHpWarningThreshold_pct: p.lowHpWarningThreshold_pct,
      autoPotionEnabled: p.autoPotionEnabled,
      autoPotionThreshold_pct: p.autoPotionThreshold_pct,
      potionOrder: p.potionOrder,
      sourceOrder: p.sourceOrder as readonly PotionSource[],
    },
    potions: Object.fromEntries(
      Object.entries(p.potionHeal_pct).map(([id, heal]) => [id, { heal_pctMaxHp: heal }]),
    ),
    player: {
      baseStats: { hp: 0, def: 0, vit: 0 },
      statPerPoint: {
        hp: 0,
        def: 0,
        vitHpRegenSpeed_pct: 0,
        vitPotionEfficiency_pct: p.vitPotionEfficiency_pct,
      },
      hpRecovery: { deathRecoveryTo_pct: 50, outsideDungeonRegen_pctMaxHpPerMin: 1 },
    },
  };
}

const LOOT_ID_SEPARATOR = ':';

/** tools/sim/src/loop.ts's `runLoop`, reimplemented on top of `../hp`'s ported fns (13.2 item a):
 * same interleaving of reward ticks and hit-clock attempts (earliest real time first), same RNG
 * streams, same event shape — the only difference is *which* code resolves one hit or one heal. */
function runLoopViaHp(input: HarnessLoopInput): HarnessLoopResult {
  const p = input.params;
  const hpParams = loopHpParamsOf(p);
  const events: HarnessLoopEvent[] = [];
  const bag: Record<string, number> = {};
  const inv: Record<string, number> = { ...input.inventory };
  const failed = new Set(input.failedTicks);
  let level = input.level;
  let exp = input.exp;
  let expGained = 0;
  let k = 0;
  let granted = 0;
  let fromBag = 0;
  let fromInv = 0;
  let firstPotion: number | null = null;
  let hp = runHpInit(input.hp, input.runSeed, hpParams);
  let t = 0;
  const healTo = (atSec: number) => {
    hp = supportHealThrough(
      hp,
      atSec * MS_PER_S,
      { classId: input.ownClass, level, maxHp: input.maxHp },
      hpParams,
    );
    t = atSec;
  };
  let exitReason: HarnessLoopResult['exitReason'] = 'manual_exit';
  for (;;) {
    const tickAt = p.window_s * (k + 1);
    const attemptAt = hp.nextAttemptTau_ms / MS_PER_S;
    if (Math.min(tickAt, attemptAt) > input.limit_s) {
      healTo(input.limit_s);
      break;
    }
    if (tickAt <= attemptAt) {
      healTo(tickAt);
      const passed = !failed.has(k);
      let lootText = '';
      let gain = 0;
      if (passed) {
        const loot = rollTickLoot(input.runSeed, granted, input.table, 1);
        for (const it of loot.items) {
          bag[it.id] = (bag[it.id] ?? 0) + it.qty;
          if (firstPotion === null && p.potionOrder.includes(it.id)) firstPotion = tickAt;
        }
        lootText = loot.items.map((it) => `${it.id}${LOOT_ID_SEPARATOR}${it.qty}`).join(',');
        hp = onGrantedTick(hp, level, { classId: input.ownClass, maxHp: input.maxHp }, hpParams);
        const expResult = soloTickExp(level, input.ownClass, input.rangeMin, input.rangeMax, 1, {
          exp: p.exp,
          expMult: p.expMult,
          roles: { magic: p.roles.magic },
          buff: p.buff,
        });
        gain = expResult.exp;
        const before = level;
        const after = addExp(level, exp, gain, p.exp);
        if (before < p.exp.maxLevel) expGained += gain;
        level = after.level;
        exp = after.exp;
        granted += 1;
      }
      events.push({
        t_s: tickAt,
        type: 'tick',
        k,
        granted: passed,
        exp: gain,
        level,
        shield: hp.shield,
        loot: lootText,
      });
      k += 1;
      continue;
    }
    healTo(attemptAt);
    const ctx: AttemptContext = {
      runSeed: input.runSeed,
      level,
      classId: input.ownClass,
      def: input.def,
      vit: input.vit,
      maxHp: input.maxHp,
      levelRange: { min: input.rangeMin, max: input.rangeMax },
      autoRetreatEnabled: input.autoRetreatEnabled,
      bag,
      inventory: inv,
    };
    const applied = applyAttempt(hp, ctx, hpParams);
    hp = applied.hp;
    const r = applied.result;
    let potionText: string | null = null;
    if (r.potion !== null) {
      potionText = `${r.potion.source}${LOOT_ID_SEPARATOR}${r.potion.itemId}`;
      if (r.potion.source === 'runBag') {
        bag[r.potion.itemId] = (bag[r.potion.itemId] ?? 0) - 1;
        fromBag += 1;
      } else {
        inv[r.potion.itemId] = (inv[r.potion.itemId] ?? 0) - 1;
        fromInv += 1;
      }
    }
    events.push({
      t_s: attemptAt,
      type: 'attempt',
      i: hp.attempts - 1,
      landed: r.landed,
      damage: r.damage,
      hpAfter: hp.hp,
      shieldAfter: hp.shield,
      potion: potionText,
      warning: r.hit?.lowHpWarning ?? false,
      outcome: r.hit?.outcome ?? 'miss',
    });
    if (r.hit !== null && (r.hit.outcome === 'autoRetreat' || r.hit.outcome === 'died')) {
      exitReason = r.hit.outcome === 'died' ? 'death' : 'auto_retreat';
      break;
    }
  }
  const clean = (o: Record<string, number>) =>
    Object.fromEntries(Object.entries(o).filter(([, q]) => q > 0));
  const runBag = clean(bag);
  const kept = exitReason === 'death' ? {} : runBag;
  const inventoryEnd = { ...inv };
  for (const [id, q] of Object.entries(kept)) inventoryEnd[id] = (inventoryEnd[id] ?? 0) + q;
  return {
    exitReason,
    end_s: t,
    ticksEvaluated: k,
    ticksGranted: granted,
    attempts: hp.attempts,
    hitsLanded: hp.hitsLanded,
    potionsFromRunBag: fromBag,
    potionsFromInventory: fromInv,
    firstPotionDrop_s: firstPotion,
    lowHpWarnings: hp.lowHpWarnings,
    hpEnd: hp.hp,
    levelEnd: level,
    expEnd: exp,
    expGained,
    runBag,
    kept,
    lost: exitReason === 'death' ? runBag : {},
    inventoryEnd: clean(inventoryEnd),
    events: input.recordEvents ? events : null,
  };
}

function percentileOf(sorted: readonly number[], pct: number): number {
  if (sorted.length === 0) throw new Error('empty sample');
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[rank] as number;
}
function meanOf(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** tools/sim/src/loop-scenarios.ts's `loopStats`: seeded Monte Carlo, runSeed = firstSeed,
 * firstSeed + 1, ... over `runLoopViaHp` instead of tools/sim's own `runLoop`. */
function loopStatsViaHp(
  loop: Omit<HarnessLoopInput, 'runSeed'>,
  firstSeed: number,
  runs: number,
): {
  runs: number;
  p10_min: number;
  median_min: number;
  p90_min: number;
  mean_min: number;
  endedShare: number;
  potionBeforeEndShare: number;
  potionsUsedPerRun: number;
} {
  const minutes: number[] = [];
  let ended = 0;
  let potion = 0;
  let used = 0;
  for (let i = 0; i < runs; i += 1) {
    const r = runLoopViaHp({ ...loop, runSeed: firstSeed + i, recordEvents: false });
    minutes.push(r.end_s / SECONDS_PER_MINUTE);
    if (r.exitReason !== 'manual_exit') ended += 1;
    if (r.firstPotionDrop_s !== null) potion += 1;
    used += r.potionsFromRunBag + r.potionsFromInventory;
  }
  minutes.sort((a, b) => a - b);
  return {
    runs,
    p10_min: percentileOf(minutes, 10),
    median_min: percentileOf(minutes, 50),
    p90_min: percentileOf(minutes, 90),
    mean_min: meanOf(minutes),
    endedShare: ended / runs,
    potionBeforeEndShare: potion / runs,
    potionsUsedPerRun: used / runs,
  };
}

// ---- run-loop.json `pauses`/`pauseParams` (P2-H47, tech note F06 13.5): an outside period never
// touches the tau-domain computation (R06-R07/R10, D-094, D-096 — Grace/Suspended stop active
// time, the hit clock and reward windows resume where they stopped, never reset), so
// `runLoopViaHp`'s own result *is* the tau-domain run; this only overlays each tau with the real
// wall-clock time the player experienced (tools/sim/src/loop-pauses.ts, reference, never imported).
interface PauseVector {
  readonly atTau_s: number;
  readonly duration_s: number;
}
interface PauseParamsVector {
  readonly graceMax_s: number;
  readonly suspendedMax_s: number;
}
function pausesOf(input: Record<string, unknown>): PauseVector[] | null {
  const v = input['pauses'];
  if (v === undefined) return null;
  return objArr(input, 'pauses').map((x) => ({
    atTau_s: n(x, 'atTau_s'),
    duration_s: n(x, 'duration_s'),
  }));
}
function pauseParamsOf(i: Record<string, unknown>): PauseParamsVector {
  return { graceMax_s: n(i, 'graceMax_s'), suspendedMax_s: n(i, 'suspendedMax_s') };
}
/** Real time at tau `t`: `t` plus every pause's `duration_s` whose `atTau_s` is strictly before it
 * (A-P2-H47-1: an event due exactly at `atTau_s` happens before the player leaves, so it is not
 * yet shifted by that pause). suspendedMax_s is a pause-validity bound only (tools/sim's
 * `pauseProblems`), never read by this real-time overlay itself. */
function realAt(tau: number, pauses: readonly PauseVector[]): number {
  return pauses.reduce((t, q) => (q.atTau_s < tau ? t + q.duration_s : t), tau);
}
function withPauses(
  r: HarnessLoopResult,
  pauses: readonly PauseVector[],
  pp: PauseParamsVector,
): unknown {
  const reachedPauses = pauses.filter((q) => q.atTau_s < r.end_s);
  const pauseSummaries = pauses.map((q) => {
    const reached = q.atTau_s < r.end_s;
    return {
      atTau_s: q.atTau_s,
      duration_s: q.duration_s,
      reached,
      leftAtReal_s: reached ? realAt(q.atTau_s, pauses) : null,
      // A-P2-H47-2: one Grace up to graceMax_s, the rest of the duration Suspended.
      grace_s: reached ? Math.min(q.duration_s, pp.graceMax_s) : 0,
      suspended_s: reached ? Math.max(0, q.duration_s - pp.graceMax_s) : 0,
    };
  });
  const events =
    r.events === null ? null : r.events.map((e) => ({ ...e, at_s: realAt(e.t_s, pauses) }));
  return {
    ...r,
    events,
    pauses: pauseSummaries,
    paused_s: reachedPauses.reduce((s, q) => s + q.duration_s, 0),
    realEnd_s: realAt(r.end_s, pauses),
  };
}

/** Evaluates one vector's input.fn with the formulas this task ports. Throws on an unknown fn. */
function evaluateOwnedVector(input: Record<string, unknown>, fileLexicon?: unknown): unknown {
  const fn = input['fn'];
  switch (fn) {
    // ---- character-name.json (P2-F10-T12) ----
    case 'validateCharacterName': {
      const name = input['name'];
      if (typeof name !== 'string') throw new Error('vector input "name" must be a string');
      const params = applyParamsOverride(baseCharacterParams, input['paramsOverride']);
      return validateCharacterName(name, params, fileLexicon as Lexicon);
    }
    case 'randomCharacterName': {
      const draws = input['rngDraws'];
      if (!Array.isArray(draws) || !draws.every((d) => typeof d === 'number')) {
        throw new Error('vector input "rngDraws" must be a number array');
      }
      const params = applyParamsOverride(baseCharacterParams, input['paramsOverride']);
      return randomCharacterName(characterRngFromDraws(draws), fileLexicon as Lexicon, params);
    }
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
    // ---- damage.json (D-112: input {playerLevel, rangeMin, rangeMax}) ----
    case 'zoneLevel':
      return zoneLevel(n(input, 'playerLevel'), n(input, 'rangeMin'), n(input, 'rangeMax'));
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
      // This vector file never exercises the D-104 gap rule (that is `runTimeline`'s own vectors
      // below); a pair gap this wide never fires so the batch behaves as it did before geo folded
      // gap-dropping into `edgeHysteresisFeed` (P2-X10).
      const p: EdgeHysteresisParams & { maxSamplePairGap_s: number } = {
        edgeHysteresisSamples: n(obj(input, 'params'), 'edgeHysteresisSamples'),
        edgeHysteresis_m: n(obj(input, 'params'), 'edgeHysteresis_m'),
        maxSamplePairGap_s: Number.POSITIVE_INFINITY,
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
    // ---- movement-gate.json / reward-window.json (P2-F05-T08) ----
    case 'gateWindows':
      return gateWindows(
        presenceSamplesOf(input),
        clockOf(input),
        nOrNull(input, 'endAt_ms'),
        rewardGateParamsOf(obj(input, 'params')),
      );
    case 'passesGate':
      return passesGate(
        n(input, 'distance_m'),
        n(input, 'minDistance_m'),
        String(input['comparison']),
      );
    case 'tauAt':
      return tauAt(n(input, 't_ms'), clockOf(input));
    case 'windowIndexOf':
      return windowIndexOf(n(input, 'tau_ms'), n(input, 'window_s'));
    // ---- partial-tick.json (P2-F05-T08) ----
    case 'partialTick': {
      const p = obj(input, 'params');
      return partialTick(n(input, 'elapsed_ms'), n(input, 'distance_m'), {
        window_s: n(p, 'window_s'),
        minDistancePerWindow_m: n(p, 'minDistancePerWindow_m'),
        comparison: String(p['comparison']),
        partialTickMinElapsed_s: n(p, 'partialTickMinElapsed_s'),
      });
    }
    case 'deriveSeed':
      return deriveSeed(n(input, 'runSeed'), streamTagOf(input['streamTag']), n(input, 'index'));
    case 'streamDraws': {
      const rng = streamRng(
        n(input, 'runSeed'),
        streamTagOf(input['streamTag']),
        n(input, 'index'),
      );
      return Array.from({ length: n(input, 'count') }, () => rng());
    }
    case 'rollTickLoot':
      return rollTickLoot(
        n(input, 'runSeed'),
        n(input, 'dropIndex'),
        objArr(input, 'table').map(lootRarityOf),
        n(input, 'f'),
      );
    // ---- tick-reward.json (P2-F05-T01 / T08) ----
    case 'lootTable': {
      const rawItemRarity = obj(input, 'itemRarity');
      const itemRarity: Record<string, string> = {};
      for (const key of Object.keys(rawItemRarity)) itemRarity[key] = String(rawItemRarity[key]);
      const def: DropTableDef = parseDropTable(
        String(input['dropTableId']),
        input['dropTable'],
        itemRarity,
      );
      const ctx = dropContextOf(obj(input, 'ctx'));
      const lp = obj(input, 'lootParams');
      const dp = dropParamsOf(obj(lp, 'dp'));
      const qty = obj(lp, 'qty');
      const lootParams: LootParams = {
        dp,
        qty: {
          uncommon: n(qty, 'uncommon'),
          rare: n(qty, 'rare'),
          epic: n(qty, 'epic'),
          legendary: n(qty, 'legendary'),
        },
      };
      return lootTable(def, ctx, lootParams);
    }
    case 'soloTickExp': {
      const p = obj(input, 'params');
      const expMult = obj(p, 'expMult');
      const magicRole = obj(obj(p, 'roles'), 'magic');
      const buff = obj(p, 'buff');
      const params: SoloTickExpParams = {
        exp: expParamsOf(obj(p, 'exp')),
        expMult: {
          magicBuffMaxMult: n(expMult, 'magicBuffMaxMult'),
          noMagicMult: n(expMult, 'noMagicMult'),
          levelGapMultPerLevel: n(expMult, 'levelGapMultPerLevel'),
          levelGapMultFloor: n(expMult, 'levelGapMultFloor'),
        },
        roles: { magic: { base_pct: n(magicRole, 'base_pct'), cap_pct: n(magicRole, 'cap_pct') } },
        buff: {
          pPerMemberBase: n(buff, 'pPerMemberBase'),
          pLevelDivisor: n(buff, 'pLevelDivisor'),
        },
      };
      return soloTickExp(
        n(input, 'level'),
        String(input['ownClass']) as PlayerClass,
        n(input, 'rangeMin'),
        n(input, 'rangeMax'),
        n(input, 'f'),
        params,
      );
    }
    case 'addExp':
      return addExp(
        n(input, 'level'),
        n(input, 'exp'),
        n(input, 'gained'),
        expParamsOf(obj(input, 'params')),
      );
    // ---- damage.json / run-loop.json (P2-F06-T06, HP engine, tech note F06 13.1) ----
    case 'resolveHit': {
      const potions = objArr(input, 'potions').map((x) => ({
        id: String(x['id']),
        heal_pctMaxHp: n(x, 'heal_pctMaxHp'),
        count: n(x, 'count'),
      }));
      return resolveHit({
        hp: n(input, 'hp'),
        maxHp: n(input, 'maxHp'),
        shield: n(input, 'shield'),
        damage: n(input, 'damage'),
        autoRetreatEnabled: boolIn(input, 'autoRetreatEnabled'),
        autoRetreatThreshold_pct: n(input, 'autoRetreatThreshold_pct'),
        lowHpWarningThreshold_pct: n(input, 'lowHpWarningThreshold_pct'),
        autoPotionEnabled: boolIn(input, 'autoPotionEnabled'),
        autoPotionThreshold_pct: n(input, 'autoPotionThreshold_pct'),
        potionEfficiencyBonus_pct: n(input, 'potionEfficiencyBonus_pct'),
        potions,
      });
    }
    case 'hitAttempt': {
      const p = obj(input, 'params');
      return hitAttempt(n(input, 'runSeed'), n(input, 'index'), {
        attack: {
          intervalMin_s: n(p, 'intervalMin_s'),
          intervalMax_s: n(p, 'intervalMax_s'),
          hitChancePerCheck_pct: n(p, 'hitChance_pct'),
        },
      });
    }
    case 'soloDamage': {
      const p = obj(input, 'params');
      const roles = obj(p, 'roles');
      const buff = obj(p, 'buff');
      const hpParams: HpParams = {
        ...DUMMY_HP_PARAMS,
        monster: monsterParamsOf(obj(p, 'monster')),
        buff: {
          pPerMemberBase: n(buff, 'pPerMemberBase'),
          pLevelDivisor: n(buff, 'pLevelDivisor'),
        },
        roles: { ...DUMMY_HP_PARAMS.roles, tanker: loopRoleOf(obj(roles, 'tanker')) },
      };
      return soloHitDamage(
        {
          level: n(input, 'level'),
          classId: String(input['ownClass']) as PlayerClass,
          def: n(input, 'def'),
          levelRange: { min: n(input, 'rangeMin'), max: n(input, 'rangeMax') },
        },
        hpParams,
      );
    }
    case 'runLoop': {
      const result = runLoopViaHp({ ...loopInputOf(input), runSeed: n(input, 'runSeed') });
      const pauses = pausesOf(input);
      if (pauses === null) return result;
      return withPauses(result, pauses, pauseParamsOf(obj(input, 'pauseParams')));
    }
    // ---- hp-recovery.json (P2-H47) ----
    case 'hpAfterRegen': {
      const p = obj(input, 'params');
      const hp = hpAt(
        { value: n(input, 'value'), anchorAt_ms: HP_RECOVERY_ANCHOR_MS, recovering: false },
        HP_RECOVERY_ANCHOR_MS + n(input, 'elapsed_ms'),
        { maxHp: n(input, 'maxHp'), vit: n(input, 'vit') },
        hpRecoveryParamsOf(p),
      );
      return hp.value;
    }
    case 'recoveryTime': {
      const p = obj(input, 'params');
      const maxHp = n(input, 'maxHp');
      const hpParams = hpRecoveryParamsOf(p);
      const recoveredAt = recoveredAt_ms(
        {
          value: n(input, 'value'),
          anchorAt_ms: HP_RECOVERY_ANCHOR_MS,
          recovering: boolIn(input, 'recovering'),
        },
        { maxHp, vit: n(input, 'vit') },
        hpParams,
      );
      return {
        recoveryLine: (maxHp * n(p, 'deathRecoveryTo_pct')) / 100,
        recoveredAfter_ms: recoveredAt === null ? null : recoveredAt - HP_RECOVERY_ANCHOR_MS,
      };
    }
    case 'runLoopStats': {
      const loop = obj(input, 'loop');
      return loopStatsViaHp(loopInputOf(loop), n(input, 'firstSeed'), n(input, 'runs'));
    }
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

  for (const { name, formula, vectors, lexicon } of vectorFiles) {
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
                evaluateOwnedVector(vector.input, lexicon);
                return true;
              })(),
          ).toBe(true);
        }
      });

      vectors.forEach((vector, index) => {
        const fn = String(vector.input['fn']);
        if (SKIP_FNS.has(fn)) return;
        it(`[${index}] ${fn}`, () => {
          const actual = evaluateOwnedVector(vector.input, lexicon);
          expect(
            isWithinTolerance(actual, vector.expected, vector.tolerance),
            `${formula}[${index}] fn=${fn}: expected ${JSON.stringify(vector.expected)}, got ${JSON.stringify(actual)} (tolerance ${vector.tolerance}) · ${vector.source}`,
          ).toBe(true);
        });
      });
    });
  }
});
