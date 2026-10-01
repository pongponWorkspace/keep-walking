/**
 * Loads and validates `config/app/telemetry.json`'s `localSink` and `export` subtrees (D-088,
 * C2-2..C2-4; docs/tech/F04-dungeon-presence.md section 12). Whole-file import is fine here (group
 * B, tech note F04 15.2: "`app/client.json`, `app/privacy.json`, `app/telemetry.json` ทั้งไฟล์"),
 * unlike `config/balance.ts`'s whitelist-filtered subset. This file only types the two subtrees
 * `apps/client/src/telemetry/*` actually reads (`timestamps`, `goldAmountBuckets` have no client
 * reader yet). P2-F06-T09 adds `sampling.emptyScreenAbandonTimeout_s`
 * (`onboarding_empty_screen_abandoned`, `product/telemetry-events.md`).
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

export interface TelemetrySamplingConfig {
  readonly emptyScreenAbandonTimeout_s: number;
}

/** `f10Events.filterRejectCountBuckets` (tech note docs/tech/F10-account-shell.md section 8):
 * `character_created.filter_reject_count`'s bucket edges — `upperBoundsInclusive[i]` is the last
 * count still labelled `labels[i]`; a count past every bound gets the final label (`"6+"` today).
 * Read here instead of hardcoded in the create-character screen (CLAUDE.md "every number comes
 * from config"). */
export interface FilterRejectCountBucketsConfig {
  readonly upperBoundsInclusive: readonly number[];
  readonly labels: readonly string[];
}

export interface F10EventsConfig {
  readonly filterRejectCountBuckets: FilterRejectCountBucketsConfig;
}

export interface AppTelemetryConfig {
  readonly localSink: TelemetryLocalSinkConfig;
  readonly export: TelemetryExportConfig;
  readonly sampling: TelemetrySamplingConfig;
  readonly f10Events: F10EventsConfig;
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

function parseSampling(root: Json, path: string): TelemetrySamplingConfig {
  const node = obj(root['sampling'], path);
  return {
    emptyScreenAbandonTimeout_s: num(
      node['emptyScreenAbandonTimeout_s'],
      `${path}/emptyScreenAbandonTimeout_s`,
    ),
  };
}

function numArray(value: unknown, path: string): readonly number[] {
  if (!Array.isArray(value)) {
    return fail(path, 'must be an array');
  }
  return value.map((v, i) => num(v, `${path}/${String(i)}`));
}

function parseF10Events(root: Json, path: string): F10EventsConfig {
  const node = obj(root['f10Events'], path);
  const buckets = obj(node['filterRejectCountBuckets'], `${path}/filterRejectCountBuckets`);
  return {
    filterRejectCountBuckets: {
      upperBoundsInclusive: numArray(
        buckets['upperBoundsInclusive'],
        `${path}/filterRejectCountBuckets/upperBoundsInclusive`,
      ),
      labels: strArray(buckets['labels'], `${path}/filterRejectCountBuckets/labels`),
    },
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import. */
export function parseAppTelemetryConfig(input: unknown): AppTelemetryConfig {
  const root = obj(input, '/');
  return {
    localSink: parseLocalSink(root, '/localSink'),
    export: parseExport(root, '/export'),
    sampling: parseSampling(root, '/sampling'),
    f10Events: parseF10Events(root, '/f10Events'),
  };
}

// Fails loudly at import time, not on first use (same convention as config/runtime.ts).
export const appTelemetryConfig: AppTelemetryConfig = parseAppTelemetryConfig(telemetryConfigJson);
