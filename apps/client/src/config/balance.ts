/**
 * Typed, validated access to the client's slice of `config/balance/*.json` (F-04, F-08:
 * docs/tech/F04-dungeon-presence.md section 15, ADR 0003 section 9.3).
 *
 * The client never imports a `config/balance/*.json` file directly: it imports
 * `./generated/balance-subset.generated.json`, a committed, whitelist-filtered file produced by
 * `apps/client/scripts/generate-config.ts` from `./whitelist.ts`'s allow-list. That file carries
 * only the subtrees the client is allowed to see (`homeState`, `movementGate`, `checkIn.maxAccuracy_m`
 * today; more subtrees are already present for P2-F04-T20/T21/T08 to parse later) and structurally
 * cannot carry a group-C key (`coverageFilter`, `trustScore`, `raid.*`, ...): `config/generated.test.ts`
 * proves the committed file matches a fresh extraction and never contains one.
 *
 * Namespacing (task context): this is `balance.location`/`balance.dungeons`/`balance.anticheat`,
 * not `balance.privacy` — see `config/runtime.ts` for the one `app.privacy` file this workspace
 * reads. They are different files and must never be confused.
 */
import type { GateComparison } from '@keep-walking/geo';
import { validateGateFilterParams, validateGridParams } from '@keep-walking/geo';
import balanceSubsetJson from './generated/balance-subset.generated.json';

export interface HomeStateConfig {
  readonly maxAccuracy_m: number;
  readonly sustainedPoorAccuracy_s: number;
}

export interface BalanceLocationConfig {
  readonly homeState: HomeStateConfig;
}

export type { GateComparison };

/** ADR 0003 section 5.3/5.5: the outlier filter + fixed-cadence resample `gateDiagnosticWindows`
 * needs, on top of the raw gate. `undefined` until `config/balance/dungeons.json#movementGate`
 * carries all five keys (P2-F05-T20): the HUD then falls back to a raw-only measurement instead of
 * guessing a value (`debug/stats.ts`'s `computeGateWindows`). */
export interface MovementGateFilterConfig {
  readonly maxSampleAccuracy_m: number;
  readonly outlierSpeed_kmh: number;
  readonly outlierReanchorSamples: number;
  readonly sampleCadence_s: number;
  readonly maxSamplePairGap_s: number;
}

export interface MovementGateConfig {
  readonly minDistancePerWindow_m: number;
  readonly window_s: number;
  readonly comparison: GateComparison;
  readonly filter: MovementGateFilterConfig | undefined;
}

export interface CheckInConfig {
  readonly maxAccuracy_m: number;
}

/** `config/balance/dungeons.json#openingHours.utcOffset_min` (ADR 0003 section 9.2: Bangkok has no
 * DST, runtime never reads the device time zone). The client's only use today is
 * `clock/query-params.ts`'s `start` query test hook; `src/run`'s opening-hours evaluation
 * (P2-F04-T20) reads the same key through this same accessor once it exists. */
export interface OpeningHoursConfig {
  readonly utcOffsetMin: number;
}

/** `config/balance/unlocks.json#home.distanceDisplaySteps_m` (F04-R34, TG-07 tech gate P2-F05-T15):
 * the display-rounding bands for every on-screen distance (nearby panel, popup, map label) — read
 * from the balance subset the client already loads, never a second hardcoded copy (CLAUDE.md
 * "never fork the logic"). `upTo_m: null` = the last, unbounded band. */
export interface DistanceDisplayStepConfig {
  readonly upTo_m: number | null;
  readonly step_m: number;
}

/**
 * P2-F06-T09 additions (tech note F06 section 9.1/9.2): the home-state wiring's own config, on top
 * of `distanceDisplaySteps_m` above. `outOfAreaMaskPath`/`launchAreaMaskPath` are repo-relative
 * paths to a `data/map/*.geojson` file (ADR 0001 3.10.6), never a config pointer to another config
 * value — `home-geometry.ts` is the one place that turns either into real geometry.
 * `launchAreaMaskPath` doubles as R55's own switch: `null` here means "not shipped yet", the only
 * condition under which the far-district-interest fallback applies (D-126).
 */
export interface UnlocksHomeConfig {
  readonly distanceDisplaySteps_m: readonly DistanceDisplayStepConfig[];
  readonly farDungeonThreshold_m: number;
  readonly reevaluateDistance_m: number;
  readonly outOfAreaMaskPath: string;
  readonly launchAreaMaskPath: string | null;
}

/** `config/balance/dungeons.json#runState.clockSkewTolerance_s` (R2-01, tech gate P2-F05-T15/
 * P2-F06-T10): the same tolerance `packages/shared/src/run/time.ts` uses to judge a sample/tick
 * clock as `future`/`invalid` — read here only so `clock/mock-offset-clock.test.ts` can assert the
 * Mock game clock and the first sample's own timestamp never disagree by more than this, without
 * hardcoding the number a second time. */
export interface RunStateConfig {
  readonly clockSkewTolerance_s: number;
}

type Json = Record<string, unknown>;

function makeFail(file: string): (path: string, reason: string) => never {
  return (path: string, reason: string): never => {
    throw new Error(`${file}: ${path} ${reason}`);
  };
}

function makeParsers(file: string) {
  const fail = makeFail(file);
  return {
    obj(value: unknown, path: string): Json {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return fail(path, 'must be an object');
      }
      return value as Json;
    },
    positiveNum(value: unknown, path: string): number {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return fail(path, 'must be a positive finite number');
      }
      return value;
    },
    str(value: unknown, path: string): string {
      if (typeof value !== 'string' || value.length === 0) {
        return fail(path, 'must be a non-empty string');
      }
      return value;
    },
  };
}

const { obj, positiveNum } = makeParsers('config/balance/location.json');

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseBalanceLocationConfig(input: unknown): BalanceLocationConfig {
  const root = obj(input, '/');
  const homeState = obj(root['homeState'], '/homeState');
  return {
    homeState: {
      maxAccuracy_m: positiveNum(homeState['maxAccuracy_m'], '/homeState/maxAccuracy_m'),
      sustainedPoorAccuracy_s: positiveNum(
        homeState['sustainedPoorAccuracy_s'],
        '/homeState/sustainedPoorAccuracy_s',
      ),
    },
  };
}

const GATE_COMPARISONS: readonly GateComparison[] = ['greaterThan', 'greaterThanOrEqual'];
/** The five keys of `MovementGateFilterConfig`, in the order `validateGateFilterParams`/
 * `validateGridParams` (from `@keep-walking/geo`) expect to find them missing or present as a set. */
const FILTER_KEYS = [
  'maxSampleAccuracy_m',
  'outlierSpeed_kmh',
  'outlierReanchorSamples',
  'sampleCadence_s',
  'maxSamplePairGap_s',
] as const;

function parseMovementGateFilter(gate: Json, path: string): MovementGateFilterConfig | undefined {
  const present = FILTER_KEYS.filter((key) => gate[key] !== undefined);
  if (present.length === 0) {
    return undefined;
  }
  if (present.length !== FILTER_KEYS.length) {
    const missing = FILTER_KEYS.filter((key) => !present.includes(key));
    throw new Error(
      `config/balance/dungeons.json: ${path} has ${present.join(', ')} but is missing ${missing.join(', ')} (all five gate-filter keys must arrive together, ADR 0003 5.5)`,
    );
  }
  const { positiveNum } = makeParsers('config/balance/dungeons.json');
  const filter: MovementGateFilterConfig = {
    maxSampleAccuracy_m: positiveNum(gate['maxSampleAccuracy_m'], `${path}/maxSampleAccuracy_m`),
    outlierSpeed_kmh: positiveNum(gate['outlierSpeed_kmh'], `${path}/outlierSpeed_kmh`),
    outlierReanchorSamples: positiveNum(
      gate['outlierReanchorSamples'],
      `${path}/outlierReanchorSamples`,
    ),
    sampleCadence_s: positiveNum(gate['sampleCadence_s'], `${path}/sampleCadence_s`),
    maxSamplePairGap_s: positiveNum(gate['maxSamplePairGap_s'], `${path}/maxSamplePairGap_s`),
  };
  // Re-validates with geo's own guards (ADR 0003 section 4: geo never reads config, but its
  // parameter validation is the single source of what a well-formed value looks like).
  validateGateFilterParams(filter);
  validateGridParams(filter);
  return filter;
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseMovementGateConfig(input: unknown): MovementGateConfig {
  const { obj, positiveNum, str } = makeParsers('config/balance/dungeons.json');
  const root = obj(input, '/');
  const gate = obj(root['movementGate'], '/movementGate');
  const comparison = str(gate['comparison'], '/movementGate/comparison');
  if (!(GATE_COMPARISONS as readonly string[]).includes(comparison)) {
    throw new Error(
      `config/balance/dungeons.json: /movementGate/comparison must be one of: ${GATE_COMPARISONS.join(', ')}`,
    );
  }
  return {
    minDistancePerWindow_m: positiveNum(
      gate['minDistancePerWindow_m'],
      '/movementGate/minDistancePerWindow_m',
    ),
    window_s: positiveNum(gate['window_s'], '/movementGate/window_s'),
    comparison: comparison as GateComparison,
    filter: parseMovementGateFilter(gate, '/movementGate'),
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseCheckInConfig(input: unknown): CheckInConfig {
  const { obj, positiveNum } = makeParsers('config/balance/anticheat.json');
  const root = obj(input, '/');
  const checkIn = obj(root['checkIn'], '/checkIn');
  return { maxAccuracy_m: positiveNum(checkIn['maxAccuracy_m'], '/checkIn/maxAccuracy_m') };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseOpeningHoursConfig(input: unknown): OpeningHoursConfig {
  const { obj } = makeParsers('config/balance/dungeons.json');
  const root = obj(input, '/');
  const openingHours = obj(root['openingHours'], '/openingHours');
  const raw = openingHours['utcOffset_min'];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(
      'config/balance/dungeons.json: /openingHours/utcOffset_min must be a finite number',
    );
  }
  return { utcOffsetMin: raw };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseUnlocksHomeConfig(input: unknown): UnlocksHomeConfig {
  const { obj, positiveNum, str } = makeParsers('config/balance/unlocks.json');
  const root = obj(input, '/');
  const home = obj(root['home'], '/home');
  const steps = home['distanceDisplaySteps_m'];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(
      'config/balance/unlocks.json: /home/distanceDisplaySteps_m must be a non-empty array',
    );
  }
  const launchAreaMaskPath = home['launchAreaMaskPath'];
  if (launchAreaMaskPath !== null && typeof launchAreaMaskPath !== 'string') {
    throw new Error(
      'config/balance/unlocks.json: /home/launchAreaMaskPath must be a string or null',
    );
  }
  return {
    distanceDisplaySteps_m: steps.map((raw, i) => {
      const path = `/home/distanceDisplaySteps_m/${i}`;
      const step = obj(raw, path);
      const upTo_m = step['upTo_m'];
      if (upTo_m !== null && (typeof upTo_m !== 'number' || !Number.isFinite(upTo_m))) {
        throw new Error(`config/balance/unlocks.json: ${path}/upTo_m must be a number or null`);
      }
      return { upTo_m, step_m: positiveNum(step['step_m'], `${path}/step_m`) };
    }),
    farDungeonThreshold_m: positiveNum(
      home['farDungeonThreshold_m'],
      '/home/farDungeonThreshold_m',
    ),
    reevaluateDistance_m: positiveNum(home['reevaluateDistance_m'], '/home/reevaluateDistance_m'),
    outOfAreaMaskPath: str(home['outOfAreaMaskPath'], '/home/outOfAreaMaskPath'),
    launchAreaMaskPath,
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseRunStateConfig(input: unknown): RunStateConfig {
  const { obj, positiveNum } = makeParsers('config/balance/dungeons.json');
  const root = obj(input, '/');
  const runState = obj(root['runState'], '/runState');
  return {
    clockSkewTolerance_s: positiveNum(
      runState['clockSkewTolerance_s'],
      '/runState/clockSkewTolerance_s',
    ),
  };
}

/**
 * `unlocks.<system>.unlockId` of every "must not be taught in the first 10 minutes" system the
 * client is whitelisted to see (`config/whitelist.ts`'s own doc comment on the `unlocks.json`
 * entry lists exactly which six and why `npcShop`/`classChange` are not among them) — the config
 * side of `onboarding-step.ts#isSystemTeachLocked`'s `params.lockedSystemIds`
 * (`config/unlocks-teach-lock.ts` wires the two together). Pure: takes the already-whitelisted
 * `unlocks` subtree, never re-reads `config/balance/unlocks.json` itself (that file carries
 * group-C keys this client must never import whole, ADR 0003 9.3).
 */
export function parseLockedSystemIds(input: unknown): readonly string[] {
  const { obj } = makeParsers('config/balance/unlocks.json');
  const root = obj(input, '/');
  const ids: string[] = [];
  for (const value of Object.values(root)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const unlockId = (value as Json)['unlockId'];
    if (typeof unlockId === 'string') ids.push(unlockId);
  }
  return ids;
}

const balanceSubset = balanceSubsetJson as {
  readonly location: unknown;
  readonly dungeons: unknown;
  readonly anticheat: unknown;
  readonly unlocks: unknown;
};

// Fails loudly at import time, not on first use (config/balance/*.json _meta._note applies the
// same "fail loudly, never guess" rule as config/app/*.json).
export const balanceLocationConfig: BalanceLocationConfig = parseBalanceLocationConfig(
  balanceSubset.location,
);
export const balanceMovementGateConfig: MovementGateConfig = parseMovementGateConfig(
  balanceSubset.dungeons,
);
export const balanceCheckInConfig: CheckInConfig = parseCheckInConfig(balanceSubset.anticheat);
export const balanceOpeningHoursConfig: OpeningHoursConfig = parseOpeningHoursConfig(
  balanceSubset.dungeons,
);
export const balanceUnlocksHomeConfig: UnlocksHomeConfig = parseUnlocksHomeConfig(
  balanceSubset.unlocks,
);
export const balanceRunStateConfig: RunStateConfig = parseRunStateConfig(balanceSubset.dungeons);
export const balanceLockedSystemIds: readonly string[] = parseLockedSystemIds(
  balanceSubset.unlocks,
);
