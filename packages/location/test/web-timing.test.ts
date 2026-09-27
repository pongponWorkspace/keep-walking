/**
 * P1-X05 / P2-F04-T23 (F-05a): WebLocationOptions uses `timeout_ms` / `maximumAge_ms`
 * (ADR 0001 3.10.3). The first-draft aliases `timeoutMs` / `maximumAgeMs` are removed and must
 * no longer type-check. `WebLocationTiming` is exported from the package index.
 */
import { describe, expect, it } from 'vitest';
import type { WebLocationOptions, WebLocationTiming } from '../src/index';
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
  it('timeout_ms / maximumAge_ms map to PositionOptions { timeout, maximumAge }', () => {
    expect(watchOptionsFor(LOCATION_WEB)).toEqual([
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ]);
  });

  it('WebLocationTiming is part of the public surface', () => {
    const timing: WebLocationTiming = { timeout_ms: 1, maximumAge_ms: 2 };
    expect(watchOptionsFor({ enableHighAccuracy: false, ...timing })).toEqual([
      { enableHighAccuracy: false, timeout: 1, maximumAge: 2 },
    ]);
  });

  it('the removed aliases no longer type-check', () => {
    const legacy = { enableHighAccuracy: true, timeoutMs: 1, maximumAgeMs: 0 };
    // @ts-expect-error -- timeoutMs / maximumAgeMs were removed in P2-F04-T23 (F-05a)
    const options: WebLocationOptions = legacy;
    expect(options).toBe(legacy);
  });
});
