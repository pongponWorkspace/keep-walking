/**
 * Resolves the Web provider's geolocation timing from WebLocationOptions (P1-X05).
 * `timeout_ms` / `maximumAge_ms` are the current names (ADR 0001 3.10.3); `timeoutMs` /
 * `maximumAgeMs` are deprecated aliases kept while apps/client migrates (P1-F02-T11).
 */
import type { LegacyWebLocationTiming, WebLocationTiming } from '../types';

/** Timing in milliseconds after resolving the deprecated aliases. */
export interface ResolvedWebLocationTiming {
  readonly timeout_ms: number;
  readonly maximumAge_ms: number;
}

/** Reads the new names first and falls back to the deprecated aliases. Pure. */
export function resolveWebLocationTiming(
  options: WebLocationTiming | LegacyWebLocationTiming,
): ResolvedWebLocationTiming {
  if (options.timeout_ms !== undefined) {
    return { timeout_ms: options.timeout_ms, maximumAge_ms: options.maximumAge_ms };
  }
  return { timeout_ms: options.timeoutMs, maximumAge_ms: options.maximumAgeMs };
}
