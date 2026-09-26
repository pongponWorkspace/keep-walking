// @keep-walking/shared/config — typed config accessor (ADR 0003 section 3.1, P2-F05-T02).
// No Ajv, no `new Function` (C1-4): plain code checks type and range. Engines (run/reward/hp)
// take a `Config` built by loadConfig() and read it through the namespaced accessors below, so a
// path always says which file it means ("balance.privacy" vs "app.privacy").
import {
  APP_CONFIG_DATA,
  APP_FILES,
  BALANCE_CONFIG_DATA,
  BALANCE_FILES,
  type AppFileName,
  type BalanceFileName,
} from './data';
import {
  ConfigPathError,
  bool,
  getPath,
  num,
  numArray,
  numOrNull,
  str,
  strArray,
  valueKeys,
  type Json,
  type JsonObject,
} from './json';
import { assertRaidScheduleConsistent } from './raid-schedule';

export type { AppFileName, BalanceFileName } from './data';
export { APP_FILES, BALANCE_FILES } from './data';
export {
  ConfigPathError,
  ConfigTypeError,
  ConfigUnsetError,
  bool,
  getPath,
  num,
  numArray,
  numOrNull,
  required,
  str,
  strArray,
  valueKeys,
} from './json';
export type { Json, JsonObject } from './json';
export {
  RaidScheduleMismatchError,
  assertRaidScheduleConsistent,
  type RaidScheduleInvariantInput,
} from './raid-schedule';

/** The whole typed config, namespaced by file kind so no path is ambiguous. */
export interface Config {
  readonly balance: Readonly<Record<BalanceFileName, JsonObject>>;
  readonly app: Readonly<Record<AppFileName, JsonObject>>;
}

function namespaceRoot(config: Config, path: string): { root: JsonObject; rest: string } {
  const parts = path.split('.');
  const ns = parts[0];
  const file = parts[1];
  const rest = parts.slice(2);
  if (ns === undefined || file === undefined || rest.length === 0) {
    throw new ConfigPathError(`config path must be "<balance|app>.<file>.<key...>": "${path}"`);
  }
  if (ns === 'balance') {
    if (!(BALANCE_FILES as readonly string[]).includes(file)) {
      throw new ConfigPathError(`unknown balance config file "${file}" in path "${path}"`);
    }
    return { root: config.balance[file as BalanceFileName], rest: rest.join('.') };
  }
  if (ns === 'app') {
    if (!(APP_FILES as readonly string[]).includes(file)) {
      throw new ConfigPathError(`unknown app config file "${file}" in path "${path}"`);
    }
    return { root: config.app[file as AppFileName], rest: rest.join('.') };
  }
  throw new ConfigPathError(`config namespace must be "balance" or "app", got "${ns}": "${path}"`);
}

export function configPath(config: Config, path: string): Json {
  const { root, rest } = namespaceRoot(config, path);
  return getPath(root, rest);
}
export function configNum(config: Config, path: string): number {
  const { root, rest } = namespaceRoot(config, path);
  return num(root, rest);
}
export function configNumOrNull(config: Config, path: string): number | null {
  const { root, rest } = namespaceRoot(config, path);
  return numOrNull(root, rest);
}
export function configStr(config: Config, path: string): string {
  const { root, rest } = namespaceRoot(config, path);
  return str(root, rest);
}
export function configBool(config: Config, path: string): boolean {
  const { root, rest } = namespaceRoot(config, path);
  return bool(root, rest);
}
export function configNumArray(config: Config, path: string): number[] {
  const { root, rest } = namespaceRoot(config, path);
  return numArray(root, rest);
}
export function configStrArray(config: Config, path: string): string[] {
  const { root, rest } = namespaceRoot(config, path);
  return strArray(root, rest);
}
export function configValueKeys(config: Config, path: string): string[] {
  const { root, rest } = namespaceRoot(config, path);
  return valueKeys(root, rest);
}

/**
 * Assembles the typed config from the bundled JSON and checks the invariants a loader must
 * enforce before any engine reads from it (H03: raid.schedule.endLocalTime). Throws loudly on
 * a mismatch instead of letting copy read a stale value (config/balance/raid.json _note).
 */
export function loadConfig(): Config {
  assertRaidScheduleConsistent({
    startLocalTime: str(BALANCE_CONFIG_DATA.raid, 'schedule.startLocalTime'),
    endLocalTime: str(BALANCE_CONFIG_DATA.raid, 'schedule.endLocalTime'),
    durationTicks: num(BALANCE_CONFIG_DATA.raid, 'schedule.durationTicks'),
    raidTick_s: num(BALANCE_CONFIG_DATA.raid, 'schedule.raidTick_s'),
  });
  return { balance: BALANCE_CONFIG_DATA, app: APP_CONFIG_DATA };
}
