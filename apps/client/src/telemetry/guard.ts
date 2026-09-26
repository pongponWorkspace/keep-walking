/**
 * The C2-3 guard (docs/tech/F04-dungeon-presence.md section 12.3, config/app/telemetry.json#export):
 * no telemetry event or export line may carry a coordinate. Two independent checks, both applied to
 * every property of every event, both before it ever enters the ring buffer (`telemetry/sink.ts`)
 * and again right before the export Blob is built (belt and suspenders, matching the tech note's
 * "ด่านก่อนสร้าง Blob (และ test ของ P2-F04-T25)"):
 *
 * 1. **Forbidden name**: the property's key is in `export.forbiddenPropertyNames`
 *    (`lat`, `lng`, `accuracy`, `timestamp`, ...).
 * 2. **Coordinate-shaped number**: the property's value (or, for a string value, its numeric
 *    parse) has at least `coordinateLikeNumberGuard.minDecimals` decimal digits and falls inside
 *    Thailand's lat *or* lng range — a single coordinate-looking number is enough to redact the
 *    whole property, since a lone leaked `lat` (its `lng` sibling already redacted or absent) is
 *    still real position data.
 *
 * A property that fails either check is dropped from `properties` (not the whole event) and
 * counted, so the HUD/test can show "N properties redacted" without silently losing the rest of
 * the event's diagnostic value.
 */
import type { CoordinateLikeNumberGuardConfig } from '../config/telemetry';

export type TelemetryPropertyValue = string | number | boolean | null;
export type TelemetryProperties = Readonly<Record<string, TelemetryPropertyValue>>;

function decimalDigits(text: string): number {
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

function inRange(value: number, range: readonly [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

/** True when `text` parses as a number with enough decimals and falls in the lat *or* lng range of
 * Thailand. Checked against the value's own string form so `"13.7563"` (a value that arrived as a
 * string, e.g. from a copy-key interpolation) is caught the same as the number `13.7563`. */
export function looksLikeCoordinate(text: string, guard: CoordinateLikeNumberGuardConfig): boolean {
  if (!/^-?\d+\.\d+$/.test(text)) {
    return false;
  }
  if (decimalDigits(text) < guard.minDecimals) {
    return false;
  }
  const value = Number(text);
  return inRange(value, guard.latRange_deg) || inRange(value, guard.lngRange_deg);
}

function valueLooksLikeCoordinate(
  value: TelemetryPropertyValue,
  guard: CoordinateLikeNumberGuardConfig,
): boolean {
  if (typeof value === 'number') {
    return looksLikeCoordinate(String(value), guard);
  }
  if (typeof value === 'string') {
    return looksLikeCoordinate(value.trim(), guard);
  }
  return false;
}

export interface SanitizeResult {
  readonly properties: TelemetryProperties;
  /** Names of every property removed, in the order encountered (for the HUD's redaction count and
   * for tests; never itself exported). */
  readonly redactedKeys: readonly string[];
}

/** Applies both checks to one `properties` object. Pure; never throws. */
export function sanitizeProperties(
  properties: TelemetryProperties,
  forbiddenPropertyNames: readonly string[],
  coordinateGuard: CoordinateLikeNumberGuardConfig,
): SanitizeResult {
  const forbidden = new Set(forbiddenPropertyNames);
  const out: Record<string, TelemetryPropertyValue> = {};
  const redactedKeys: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (forbidden.has(key) || valueLooksLikeCoordinate(value, coordinateGuard)) {
      redactedKeys.push(key);
      continue;
    }
    out[key] = value;
  }
  return { properties: out, redactedKeys };
}
