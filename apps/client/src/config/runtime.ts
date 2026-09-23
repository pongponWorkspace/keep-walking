/**
 * Loads and validates `config/app/client.json` and `config/app/privacy.json` once
 * (docs/tech/F02-map-location-spike.md sections 3, 4, 8, 10.5, 11; gps-trace-format.md 4).
 * `mapView`/`hudMeasurement` (P1-F02-T11) add the map's overzoom ceiling and the spike HUD's
 * measurement constants (FPS/battery/byte/accuracy/gap/latency windows) — still on-device
 * spike-measurement config, never balance or reward numbers. These are the client's own
 * runtime/provider-selection and on-device-privacy values, never balance or reward numbers
 * (ADR 0001 3.10.1: config/app/ must never affect a reward). Every value the code reads comes
 * from here, never a literal (CLAUDE.md "All numbers come from config").
 *
 * Namespacing (task context): this file only ever reads `config/app/privacy.json`
 * (`appPrivacyConfig`, on-device export rules). It never reads `config/balance/privacy.json`
 * (server-side PDPA values, a different file with an overlapping name) — see
 * `config/balance.ts` for the one balance file this workspace does read.
 *
 * Fails loudly: a missing or wrong-typed key throws at import time instead of silently using
 * `undefined`/`0`/`false` (config/app/client.json `_meta._note`: "null = not set yet: code must
 * fail loudly").
 */
import type { LocationProviderKind, MockSpeed } from '@keep-walking/location';
import clientConfigJson from '../../../../config/app/client.json';
import privacyConfigJson from '../../../../config/app/privacy.json';

export interface LocationWebConfig {
  readonly enableHighAccuracy: boolean;
  readonly timeout_ms: number;
  readonly maximumAge_ms: number;
}

export interface ProviderQueryConfig {
  readonly paramNames: {
    readonly provider: string;
    readonly trace: string;
    readonly speed: string;
    readonly loop: string;
    readonly hud: string;
  };
  readonly allowedProviders: readonly LocationProviderKind[];
  readonly allowedMockSpeeds: readonly MockSpeed[];
}

export interface ProviderQueryDefaults {
  readonly provider: LocationProviderKind;
  readonly speed: MockSpeed;
  readonly loop: boolean;
  readonly hud: boolean;
}

export interface ProviderQueryDefaultsByMode {
  readonly development: ProviderQueryDefaults;
  readonly production: ProviderQueryDefaults;
}

export interface MapViewConfig {
  readonly maxZoom: number;
}

export interface HudMeasurementConfig {
  readonly accuracyWarmup_s: number;
  readonly sampleGap_s: number;
  readonly gateWindowStep_s: number;
  readonly fpsMaxFrameGap_ms: number;
  readonly fpsLowPercentile: number;
  readonly accuracyHighPercentile: number;
  readonly latencyHighPercentile: number;
  readonly batteryNormalizeWindow_s: number;
  readonly batteryMinSegment_s: number;
  readonly bytesPerMegabyte: number;
}

export interface ClientRuntimeConfig {
  readonly locationWeb: LocationWebConfig;
  readonly providerQuery: ProviderQueryConfig;
  readonly providerQueryDefaultsByMode: ProviderQueryDefaultsByMode;
  readonly mapView: MapViewConfig;
  readonly hudMeasurement: HudMeasurementConfig;
}

export interface RawTraceExportConfig {
  readonly rawTraceTrim_m: number;
  readonly coordinateDecimals: number;
  readonly relativeTimeOnly: boolean;
  readonly requiresExplicitOptIn: boolean;
  readonly autoUploadAllowed: boolean;
}

export interface SummaryExportConfig {
  readonly isDefaultExport: boolean;
  readonly includesCoordinates: boolean;
}

export interface AppPrivacyConfig {
  readonly rawTraceExport: RawTraceExportConfig;
  readonly summaryExport: SummaryExportConfig;
}

type Json = Record<string, unknown>;

function fail(path: string, reason: string): never {
  throw new Error(`config/app: ${path} ${reason}`);
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

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    return fail(path, 'must be a boolean');
  }
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return fail(path, 'must be a non-empty string');
  }
  return value;
}

function arr(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(path, 'must be a non-empty array');
  }
  return value;
}

const PROVIDER_KINDS: readonly LocationProviderKind[] = ['web', 'mock', 'capacitor'];
/** The only speeds the spike UI offers (packages/location `MockSpeed`), spelled out as named
 * constants because a bare array literal is not exempt from `no-magic-numbers`. */
const MOCK_SPEED_10X = 10;
const MOCK_SPEED_60X = 60;
const MOCK_SPEEDS: readonly MockSpeed[] = [1, MOCK_SPEED_10X, MOCK_SPEED_60X];

function providerKind(value: unknown, path: string): LocationProviderKind {
  const kind = str(value, path);
  if (!(PROVIDER_KINDS as readonly string[]).includes(kind)) {
    return fail(path, `must be one of: ${PROVIDER_KINDS.join(', ')}`);
  }
  return kind as LocationProviderKind;
}

function mockSpeed(value: unknown, path: string): MockSpeed {
  const speed = num(value, path);
  if (!(MOCK_SPEEDS as readonly number[]).includes(speed)) {
    return fail(path, `must be one of: ${MOCK_SPEEDS.join(', ')}`);
  }
  return speed as MockSpeed;
}

function parseLocationWeb(root: Json, path: string): LocationWebConfig {
  const node = obj(root['locationWeb'], path);
  return {
    enableHighAccuracy: bool(node['enableHighAccuracy'], `${path}/enableHighAccuracy`),
    timeout_ms: num(node['timeout_ms'], `${path}/timeout_ms`),
    maximumAge_ms: num(node['maximumAge_ms'], `${path}/maximumAge_ms`),
  };
}

function parseProviderQuery(root: Json, path: string): ProviderQueryConfig {
  const node = obj(root['providerQuery'], path);
  const names = obj(node['paramNames'], `${path}/paramNames`);
  const allowedProviders = arr(node['allowedProviders'], `${path}/allowedProviders`).map(
    (value, i) => providerKind(value, `${path}/allowedProviders/${i}`),
  );
  const allowedMockSpeeds = arr(node['allowedMockSpeeds'], `${path}/allowedMockSpeeds`).map(
    (value, i) => mockSpeed(value, `${path}/allowedMockSpeeds/${i}`),
  );
  return {
    paramNames: {
      provider: str(names['provider'], `${path}/paramNames/provider`),
      trace: str(names['trace'], `${path}/paramNames/trace`),
      speed: str(names['speed'], `${path}/paramNames/speed`),
      loop: str(names['loop'], `${path}/paramNames/loop`),
      hud: str(names['hud'], `${path}/paramNames/hud`),
    },
    allowedProviders,
    allowedMockSpeeds,
  };
}

function parseDefaults(node: Json, path: string): ProviderQueryDefaults {
  return {
    provider: providerKind(node['provider'], `${path}/provider`),
    speed: mockSpeed(node['speed'], `${path}/speed`),
    loop: bool(node['loop'], `${path}/loop`),
    hud: bool(node['hud'], `${path}/hud`),
  };
}

function parseProviderQueryDefaultsByMode(root: Json, path: string): ProviderQueryDefaultsByMode {
  const node = obj(root['providerQueryDefaultsByMode'], path);
  return {
    development: parseDefaults(obj(node['development'], `${path}/development`), `${path}/development`),
    production: parseDefaults(obj(node['production'], `${path}/production`), `${path}/production`),
  };
}

function parseMapView(root: Json, path: string): MapViewConfig {
  const node = obj(root['mapView'], path);
  return { maxZoom: num(node['maxZoom'], `${path}/maxZoom`) };
}

function parseHudMeasurement(root: Json, path: string): HudMeasurementConfig {
  const node = obj(root['hudMeasurement'], path);
  return {
    accuracyWarmup_s: num(node['accuracyWarmup_s'], `${path}/accuracyWarmup_s`),
    sampleGap_s: num(node['sampleGap_s'], `${path}/sampleGap_s`),
    gateWindowStep_s: num(node['gateWindowStep_s'], `${path}/gateWindowStep_s`),
    fpsMaxFrameGap_ms: num(node['fpsMaxFrameGap_ms'], `${path}/fpsMaxFrameGap_ms`),
    fpsLowPercentile: num(node['fpsLowPercentile'], `${path}/fpsLowPercentile`),
    accuracyHighPercentile: num(node['accuracyHighPercentile'], `${path}/accuracyHighPercentile`),
    latencyHighPercentile: num(node['latencyHighPercentile'], `${path}/latencyHighPercentile`),
    batteryNormalizeWindow_s: num(
      node['batteryNormalizeWindow_s'],
      `${path}/batteryNormalizeWindow_s`,
    ),
    batteryMinSegment_s: num(node['batteryMinSegment_s'], `${path}/batteryMinSegment_s`),
    bytesPerMegabyte: num(node['bytesPerMegabyte'], `${path}/bytesPerMegabyte`),
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import (env.ts convention). */
export function parseClientConfig(input: unknown): ClientRuntimeConfig {
  const root = obj(input, '/');
  return {
    locationWeb: parseLocationWeb(root, '/locationWeb'),
    providerQuery: parseProviderQuery(root, '/providerQuery'),
    providerQueryDefaultsByMode: parseProviderQueryDefaultsByMode(root, '/providerQueryDefaultsByMode'),
    mapView: parseMapView(root, '/mapView'),
    hudMeasurement: parseHudMeasurement(root, '/hudMeasurement'),
  };
}

export function parsePrivacyConfig(input: unknown): AppPrivacyConfig {
  const root = obj(input, '/');
  const rawTraceExport = obj(root['rawTraceExport'], '/rawTraceExport');
  const summaryExport = obj(root['summaryExport'], '/summaryExport');
  return {
    rawTraceExport: {
      rawTraceTrim_m: num(rawTraceExport['rawTraceTrim_m'], '/rawTraceExport/rawTraceTrim_m'),
      coordinateDecimals: num(
        rawTraceExport['coordinateDecimals'],
        '/rawTraceExport/coordinateDecimals',
      ),
      relativeTimeOnly: bool(rawTraceExport['relativeTimeOnly'], '/rawTraceExport/relativeTimeOnly'),
      requiresExplicitOptIn: bool(
        rawTraceExport['requiresExplicitOptIn'],
        '/rawTraceExport/requiresExplicitOptIn',
      ),
      autoUploadAllowed: bool(rawTraceExport['autoUploadAllowed'], '/rawTraceExport/autoUploadAllowed'),
    },
    summaryExport: {
      isDefaultExport: bool(summaryExport['isDefaultExport'], '/summaryExport/isDefaultExport'),
      includesCoordinates: bool(
        summaryExport['includesCoordinates'],
        '/summaryExport/includesCoordinates',
      ),
    },
  };
}

// Fails loudly at import time (module load), not on first use, per config/app/*.json _meta._note.
export const clientConfig: ClientRuntimeConfig = parseClientConfig(clientConfigJson);
export const appPrivacyConfig: AppPrivacyConfig = parsePrivacyConfig(privacyConfigJson);
