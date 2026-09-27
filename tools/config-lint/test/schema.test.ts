// Schemas reject values that break CLAUDE.md non-negotiables and the engine contract.
// Each case mutates a copy of the real config file and expects the schema to fail.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfigFiles } from '../src/files';
import { checkSchemas } from '../src/schema';
import { isObject, type ConfigFile, type Json } from '../src/types';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const real = loadConfigFiles(repoRoot).files;

function mutate(path: string, dotted: string, value: Json): ConfigFile[] {
  return real.map((f) => {
    if (f.path !== path) return f;
    const data = structuredClone(f.data);
    const keys = dotted.split('.');
    let node: Json = data;
    for (const key of keys.slice(0, -1)) {
      if (!isObject(node)) throw new Error(`${dotted}: not an object at ${key}`);
      node = node[key] as Json;
    }
    if (!isObject(node)) throw new Error(`${dotted}: parent is not an object`);
    const last = keys[keys.length - 1] as string;
    if (!(last in node)) throw new Error(`${dotted}: key does not exist in ${path}`);
    node[last] = value;
    return { ...f, data };
  });
}

const schemaErrorsFor = (files: ConfigFile[], path: string): string[] =>
  checkSchemas(repoRoot, files)
    .filter((f) => f.file === path && f.rule === 'schema')
    .map((f) => f.at);

const D = 'config/balance/dungeons.json';

describe('config schemas (packages/shared/schemas/config)', () => {
  it.each([
    [D, 'movementGate.exceptions', ['raid']],
    [D, 'movementGate.appliesTo', ['dungeon']],
    [D, 'movementGate.comparison', 'greaterThanOrEqual'],
    [D, 'movementGate.window_s', 0],
    [D, 'movementGate.minDistancePerWindow_m', -1],
    [D, 'hpSafety.autoRetreatEnabledByDefault', false],
    [D, 'hpSafety.autoRetreatThreshold_pct', 120],
    [D, 'emergencyClose.proRatedRewardPassesMovementGate', false],
    [D, 'verification.v1VerificationMode', 'entry_exit'],
    [D, 'verification.v1FloorLevel', 2],
    [D, 'entry.confirmPopupRequired', false],
    ['config/balance/privacy.json', 'positionLogTtl_s', 90000],
    ['config/balance/privacy.json', 'minAge_yr', 13],
    ['config/balance/enhance.json', 'rules.itemCanBreak', true],
    ['config/balance/enhance.json', 'failureOutcomeByTargetLevel.15', 'destroyed'],
    ['config/balance/drops.json', 'baseChancePerRewardTick_pct.rare', 101],
    ['config/balance/anticheat.json', 'checkIn.teleportIntoPolygonAllowed', true],
    ['config/balance/anticheat.json', 'speedLock.action', 'warn'],
    ['config/balance/anticheat.json', 'speedLock.action', 'warnOnly'],
    ['config/balance/anticheat.json', 'speedLock.action', ''],
    ['config/app/privacy.json', 'onDeviceSamples.deleteOnRunEnd', false],
    ['config/app/privacy.json', 'onDeviceSamples.persistPreRunApproach', true],
    ['config/app/telemetry.json', 'export.includesCoordinates', true],
    ['config/app/telemetry.json', 'export.forbiddenPropertyNames', ['lng']],
  ] as const)('%s rejects %s = %j', (path, dotted, value) => {
    const errors = schemaErrorsFor(mutate(path, dotted, value as Json), path);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts the current anticheat.json (speedLock.action is the single allowed value lockPlay)', () => {
    const A = 'config/balance/anticheat.json';
    expect(schemaErrorsFor(real, A)).toEqual([]);
    expect(schemaErrorsFor(mutate(A, 'speedLock.action', 'lockPlay'), A)).toEqual([]);
  });

  it('requires _meta in every file', () => {
    const errors = schemaErrorsFor(mutate(D, '_meta', 'x'), D);
    expect(errors).toContain('_meta');
  });

  it('rejects a removed engine key (the schema is the contract of what code reads)', () => {
    const files = real.map((f) => {
      if (f.path !== D || !isObject(f.data)) return f;
      const data = structuredClone(f.data);
      const gate = data['movementGate'];
      if (isObject(gate)) delete gate['sampleCadence_s'];
      return { ...f, data };
    });
    expect(schemaErrorsFor(files, D)).toContain('movementGate');
  });

  it('checks names.th.json entries: name XOR nameReal+nameSuffix, cells, search entries', () => {
    const N = 'config/content/names.th.json';
    const bad = real.map((f) => {
      if (f.path !== N || !isObject(f.data)) return f;
      const data = structuredClone(f.data);
      data['monster.fixture'] = { name: 'x', nameReal: 'y', cells: 1 };
      data['monster.noCells'] = { name: 'x' };
      data['dungeon.fixture.search'] = { name: 'x', cells: 3 };
      return { ...f, data };
    });
    expect(schemaErrorsFor(bad, N).sort()).toEqual(
      expect.arrayContaining(['dungeon.fixture.search', 'monster.fixture', 'monster.noCells']),
    );
  });
});
