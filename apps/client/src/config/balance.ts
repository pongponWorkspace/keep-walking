/**
 * Loads and validates the `config/balance/*.json` files this spike client reads:
 * `config/balance/location.json#homeState` (accuracy thresholds for the `gps.lowAccuracy`
 * display state — docs/tech/F02-map-location-spike.md section 4, design/ux/flows/F03-core-loop.md
 * 9.5), `config/balance/dungeons.json#movementGate` and
 * `config/balance/anticheat.json#checkIn.maxAccuracy_m` (P1-F02-T11: read-only numbers the HUD
 * uses to *measure* gate-window pass rate and TTFF — tech note section 10.5 — never to compute a
 * reward or gate decision; that stays in `packages/shared`/server, CLAUDE.md non-negotiable 1).
 * Everything else in `config/balance/` is server/reward logic the client never touches; this file
 * must never grow beyond display/measurement thresholds.
 *
 * Namespacing (task context): this is `balance.location`/`balance.dungeons`/`balance.anticheat`,
 * not `balance.privacy` — see `config/runtime.ts` for the one `app.privacy` file this workspace
 * reads. They are different files and must never be confused.
 */
import locationConfigJson from '../../../../config/balance/location.json';
import dungeonsConfigJson from '../../../../config/balance/dungeons.json';
import anticheatConfigJson from '../../../../config/balance/anticheat.json';

export interface HomeStateConfig {
  readonly maxAccuracy_m: number;
  readonly sustainedPoorAccuracy_s: number;
}

export interface BalanceLocationConfig {
  readonly homeState: HomeStateConfig;
}

/** `comparison` values `packages/shared`'s gate logic recognizes (only one exists today). */
export type GateComparison = 'greaterThan';

export interface MovementGateConfig {
  readonly minDistancePerWindow_m: number;
  readonly window_s: number;
  readonly comparison: GateComparison;
}

export interface CheckInConfig {
  readonly maxAccuracy_m: number;
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

const GATE_COMPARISONS: readonly GateComparison[] = ['greaterThan'];

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
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseCheckInConfig(input: unknown): CheckInConfig {
  const { obj, positiveNum } = makeParsers('config/balance/anticheat.json');
  const root = obj(input, '/');
  const checkIn = obj(root['checkIn'], '/checkIn');
  return { maxAccuracy_m: positiveNum(checkIn['maxAccuracy_m'], '/checkIn/maxAccuracy_m') };
}

// Fails loudly at import time, not on first use (config/balance/*.json _meta._note applies the
// same "fail loudly, never guess" rule as config/app/*.json).
export const balanceLocationConfig: BalanceLocationConfig =
  parseBalanceLocationConfig(locationConfigJson);
export const balanceMovementGateConfig: MovementGateConfig =
  parseMovementGateConfig(dungeonsConfigJson);
export const balanceCheckInConfig: CheckInConfig = parseCheckInConfig(anticheatConfigJson);
