/**
 * P1-X05: WebLocationOptions uses `timeout_ms` / `maximumAge_ms` (ADR 0001 3.10.3).
 * The first-draft names `timeoutMs` / `maximumAgeMs` stay as deprecated aliases until
 * apps/client migrates (P1-F02-T11). Both spellings must produce the same PositionOptions.
 */
import { describe, expect, it } from 'vitest';
import type { WebLocationOptions } from '../src/types';
import { resolveWebLocationTiming } from '../src/web/timing';
import { WebLocationProvider } from '../src/web/web-provider';
import { FakeClock, FakeGeolocation, FakeVisibility } from './helpers';

// Values the client reads from config/app/client.json#locationWeb (packages never import config).
const LOCATION_WEB = { enableHighAccuracy: true, timeout_ms: 15000, maximumAge_ms: 0 };

function watchOptionsFor(timing: WebLocationOptions) {
  const geolocation = new FakeGeolocation();
  const provider = new WebLocationProvider({
    ...timing,
    clock: new FakeClock(),
    visibility: new FakeVisibility(),
    geolocation,
    permissions: null,
  });
  void provider.start();
  provider.stop();
  return geolocation.watchCalls;
}

describe('WebLocationOptions timing names', () => {
  it('new names map to PositionOptions { timeout, maximumAge }', () => {
    expect(watchOptionsFor(LOCATION_WEB)).toEqual([
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ]);
  });

  it('deprecated aliases still work and give the same PositionOptions', () => {
    const legacy: WebLocationOptions = {
      enableHighAccuracy: LOCATION_WEB.enableHighAccuracy,
      timeoutMs: LOCATION_WEB.timeout_ms,
      maximumAgeMs: LOCATION_WEB.maximumAge_ms,
    };
    expect(watchOptionsFor(legacy)).toEqual(watchOptionsFor(LOCATION_WEB));
  });

  it('resolveWebLocationTiming prefers the new names and falls back to the aliases', () => {
    expect(resolveWebLocationTiming({ timeout_ms: 5, maximumAge_ms: 7 })).toEqual({
      timeout_ms: 5,
      maximumAge_ms: 7,
    });
    expect(resolveWebLocationTiming({ timeoutMs: 9, maximumAgeMs: 11 })).toEqual({
      timeout_ms: 9,
      maximumAge_ms: 11,
    });
  });

  it('mixing old and new names is a type error', () => {
    const mixed = {
      enableHighAccuracy: true,
      timeout_ms: 1,
      maximumAgeMs: 0,
    };
    // @ts-expect-error -- one spelling per object: WebLocationTiming | LegacyWebLocationTiming
    const options: WebLocationOptions = mixed;
    expect(options).toBe(mixed);
  });
});
