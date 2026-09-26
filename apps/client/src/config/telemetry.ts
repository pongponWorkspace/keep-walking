/**
 * Loads and validates `config/app/telemetry.json`'s `localSink` and `export` subtrees (D-088,
 * C2-2..C2-4; docs/tech/F04-dungeon-presence.md section 12). Whole-file import is fine here (group
 * B, tech note F04 15.2: "`app/client.json`, `app/privacy.json`, `app/telemetry.json` ทั้งไฟล์"),
 * unlike `config/balance.ts`'s whitelist-filtered subset. This file only types the two subtrees
 * `apps/client/src/telemetry/*` actually reads (`sampling`, `timestamps`, `goldAmountBuckets` have
 * no client reader yet).
 */
import telemetryConfigJson from '../../../../config/app/telemetry.json';

export interface TelemetryLocalSinkConfig {
  readonly ringBufferMaxEvents: number;
  readonly ringBufferMaxChars: number;
  readonly persistInterval_s: number;
}

export interface CoordinateLikeNumberGuardConfig {
  readonly minDecimals: number;
  readonly latRange_deg: readonly [number, number];
  readonly lngRange_deg: readonly [number, number];
}

export interface TelemetryExportConfig {
  readonly mimeType: string;
  readonly fileNamePrefix: string;
  readonly forbiddenPropertyNames: readonly string[];
  readonly coordinateLikeNumberGuard: CoordinateLikeNumberGuardConfig;
}

export interface AppTelemetryConfig {
  readonly localSink: TelemetryLocalSinkConfig;
  readonly export: TelemetryExportConfig;
}

type Json = Record<string, unknown>;

function fail(path: string, reason: string): never {
  throw new Error(`config/app/telemetry.json: ${path} ${reason}`);
}

function obj(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'must be an object');
  }
  return value as Json;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, 'must be a finite number');
  }
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return fail(path, 'must be a non-empty string');
  }
  return value;
}

function strArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) {
    return fail(path, 'must be an array');
  }
  return value.map((v, i) => str(v, `${path}/${String(i)}`));
}

function pair(value: unknown, path: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    return fail(path, 'must be a 2-element array');
  }
  return [num(value[0], `${path}/0`), num(value[1], `${path}/1`)];
}

function parseLocalSink(root: Json, path: string): TelemetryLocalSinkConfig {
  const node = obj(root['localSink'], path);
  return {
    ringBufferMaxEvents: num(node['ringBufferMaxEvents'], `${path}/ringBufferMaxEvents`),
    ringBufferMaxChars: num(node['ringBufferMaxChars'], `${path}/ringBufferMaxChars`),
    persistInterval_s: num(node['persistInterval_s'], `${path}/persistInterval_s`),
  };
}

function parseExport(root: Json, path: string): TelemetryExportConfig {
  const node = obj(root['export'], path);
  const guardNode = obj(node['coordinateLikeNumberGuard'], `${path}/coordinateLikeNumberGuard`);
  return {
    mimeType: str(node['mimeType'], `${path}/mimeType`),
    fileNamePrefix: str(node['fileNamePrefix'], `${path}/fileNamePrefix`),
    forbiddenPropertyNames: strArray(
      node['forbiddenPropertyNames'],
      `${path}/forbiddenPropertyNames`,
    ),
    coordinateLikeNumberGuard: {
      minDecimals: num(guardNode['minDecimals'], `${path}/coordinateLikeNumberGuard/minDecimals`),
      latRange_deg: pair(
        guardNode['latRange_deg'],
        `${path}/coordinateLikeNumberGuard/latRange_deg`,
      ),
      lngRange_deg: pair(
        guardNode['lngRange_deg'],
        `${path}/coordinateLikeNumberGuard/lngRange_deg`,
      ),
    },
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseAppTelemetryConfig(input: unknown): AppTelemetryConfig {
  const root = obj(input, '/');
  return {
    localSink: parseLocalSink(root, '/localSink'),
    export: parseExport(root, '/export'),
  };
}

// Fails loudly at import time, not on first use (same convention as config/runtime.ts).
export const appTelemetryConfig: AppTelemetryConfig = parseAppTelemetryConfig(telemetryConfigJson);
