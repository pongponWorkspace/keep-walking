/**
 * Parses `loc`/`trace`/`speed`/`loop`/`hud` from the page URL (docs/tech/F02-map-location-spike.md
 * section 3). Param names, allowed values, and the per-`import.meta.env.MODE` defaults all come
 * from `config/app/client.json#providerQuery` / `#providerQueryDefaultsByMode` — never a literal.
 * An unrecognised value falls back to the default and warns in the console instead of throwing
 * (client.json `providerQuery.onUnknownValue: "useDefaultAndWarn"`).
 */
import type { LocationProviderKind, MockSpeed } from '@keep-walking/location';
import type { ClientRuntimeConfig, ProviderQueryDefaults } from '../config/runtime';

export interface ProviderSelection {
  readonly provider: LocationProviderKind;
  /** Mock only. `undefined` = use the first trace in the committed list (client.json `traceWhenUnset`). */
  readonly traceId: string | undefined;
  readonly speed: MockSpeed;
  readonly loop: boolean;
  readonly hud: boolean;
}

/** `import.meta.env.MODE` values this workspace ships with `providerQueryDefaultsByMode`. */
type KnownMode = 'development' | 'production';

function isKnownMode(mode: string): mode is KnownMode {
  return mode === 'development' || mode === 'production';
}

/**
 * `providerQueryDefaultsByMode[mode]`, or `production` (real GPS, HUD off — the safer choice)
 * with a console warning when `mode` is neither `development` nor `production`
 * (client.json `providerQueryDefaultsByMode._note`).
 */
export function defaultsForMode(config: ClientRuntimeConfig, mode: string): ProviderQueryDefaults {
  if (isKnownMode(mode)) {
    return config.providerQueryDefaultsByMode[mode];
  }
  console.warn(`unknown import.meta.env.MODE "${mode}"; falling back to the production defaults`);
  return config.providerQueryDefaultsByMode.production;
}

function warnUnknown(paramName: string, value: string, fallback: string): void {
  console.warn(
    `unknown value "${value}" for query param "${paramName}"; using the default "${fallback}"`,
  );
}

const TRUE_VALUE = '1';
const FALSE_VALUE = '0';

function readBoolean(params: URLSearchParams, paramName: string, fallback: boolean): boolean {
  const raw = params.get(paramName);
  if (raw === null) {
    return fallback;
  }
  if (raw === TRUE_VALUE) {
    return true;
  }
  if (raw === FALSE_VALUE) {
    return false;
  }
  warnUnknown(paramName, raw, fallback ? TRUE_VALUE : FALSE_VALUE);
  return fallback;
}

function readProvider(
  params: URLSearchParams,
  config: ClientRuntimeConfig,
  fallback: LocationProviderKind,
): LocationProviderKind {
  const paramName = config.providerQuery.paramNames.provider;
  const raw = params.get(paramName);
  if (raw === null) {
    return fallback;
  }
  if ((config.providerQuery.allowedProviders as readonly string[]).includes(raw)) {
    return raw as LocationProviderKind;
  }
  warnUnknown(paramName, raw, fallback);
  return fallback;
}

function readSpeed(
  params: URLSearchParams,
  config: ClientRuntimeConfig,
  fallback: MockSpeed,
): MockSpeed {
  const paramName = config.providerQuery.paramNames.speed;
  const raw = params.get(paramName);
  if (raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  if ((config.providerQuery.allowedMockSpeeds as readonly number[]).includes(parsed)) {
    return parsed as MockSpeed;
  }
  warnUnknown(paramName, raw, String(fallback));
  return fallback;
}

function readTraceId(params: URLSearchParams, config: ClientRuntimeConfig): string | undefined {
  return params.get(config.providerQuery.paramNames.trace) ?? undefined;
}

/** Pure: takes the URL's search string and the mode directly, no `window` access (testable). */
export function selectProvider(
  search: string,
  config: ClientRuntimeConfig,
  mode: string,
): ProviderSelection {
  const params = new URLSearchParams(search);
  const defaults = defaultsForMode(config, mode);
  return {
    provider: readProvider(params, config, defaults.provider),
    traceId: readTraceId(params, config),
    speed: readSpeed(params, config, defaults.speed),
    loop: readBoolean(params, config.providerQuery.paramNames.loop, defaults.loop),
    hud: readBoolean(params, config.providerQuery.paramNames.hud, defaults.hud),
  };
}
