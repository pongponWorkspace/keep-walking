/**
 * Web provider against a stub Geolocation (TC-LOC-08, TC-LOC-09 and the F02 contract):
 * PositionOptions mapping, permission denied, timeout, low accuracy, stale fixes, visibility.
 */
import { describe, expect, it } from 'vitest';
import type { LocationSample } from '@keep-walking/shared';
import type { LocationError, LocationProviderState } from '../src/types';
import { WebLocationProvider, toSampleFromPosition } from '../src/web/web-provider';
import type { PermissionsLike } from '../src/web/web-provider';
import { FakeClock, FakeGeolocation, FakeVisibility } from './helpers';

// Values the client reads from config/app/client.json#locationWeb (packages never import config).
const LOCATION_WEB = { enableHighAccuracy: true, timeout_ms: 15000, maximumAge_ms: 0 };

function setup(opts: { permissions?: PermissionsLike | null; visible?: boolean } = {}) {
  const geolocation = new FakeGeolocation();
  const visibility = new FakeVisibility(opts.visible ?? true);
  const clock = new FakeClock();
  const provider = new WebLocationProvider({
    enableHighAccuracy: LOCATION_WEB.enableHighAccuracy,
    timeout_ms: LOCATION_WEB.timeout_ms,
    maximumAge_ms: LOCATION_WEB.maximumAge_ms,
    clock,
    visibility,
    geolocation,
    permissions: opts.permissions ?? null,
  });
  const samples: LocationSample[] = [];
  const errors: LocationError[] = [];
  const states: LocationProviderState[] = [];
  provider.onSample((s) => samples.push(s));
  provider.onError((e) => errors.push(e));
  provider.onStateChange((s) => states.push(s));
  return { geolocation, visibility, clock, provider, samples, errors, states };
}

const permissionsReturning = (state: string): PermissionsLike => ({
  query: () => Promise.resolve({ state }),
});

describe('WebLocationProvider', () => {
  it('passes config values to watchPosition as PositionOptions { timeout, maximumAge }', () => {
    const { geolocation, provider } = setup();
    void provider.start();
    expect(geolocation.watchCalls).toEqual([
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ]);
  });

  it('start() resolves on the first fix; timestamp is the fix time, not receive time', async () => {
    const { geolocation, provider, samples, states, clock } = setup();
    let resolved = false;
    const started = provider.start().then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(provider.state).toBe('starting');
    geolocation.fix(clock.now() - 800, { speed: 1.2, heading: 90 });
    await started;
    expect(states).toEqual(['starting', 'running']);
    expect(samples[0]).toEqual({
      timestamp: clock.now() - 800,
      lat: 13.7306,
      lng: 100.54154,
      accuracy: 5,
      speed: 1.2,
      heading: 90,
    });
  });

  it('TC-LOC-08: drops fixes whose timestamp does not increase (cached repeats)', () => {
    const { geolocation, provider, samples } = setup();
    void provider.start();
    geolocation.fix(1000);
    geolocation.fix(1000);
    geolocation.fix(900);
    geolocation.fix(2000);
    expect(samples.map((s) => s.timestamp)).toEqual([1000, 2000]);
  });

  it('low accuracy passes through unchanged; malformed fixes are dropped', () => {
    const { geolocation, provider, samples } = setup();
    void provider.start();
    geolocation.fix(1000, { accuracy: 150 });
    geolocation.fix(2000, { accuracy: Number.NaN });
    geolocation.fix(3000, { accuracy: 0 });
    geolocation.fix(4000, { latitude: Number.POSITIVE_INFINITY });
    geolocation.fix(5000, { accuracy: 1500, speed: null, heading: Number.NaN });
    expect(samples.map((s) => [s.timestamp, s.accuracy])).toEqual([
      [1000, 150],
      [5000, 1500],
    ]);
    expect(samples[1]).not.toHaveProperty('speed');
    expect(samples[1]).not.toHaveProperty('heading');
  });

  it('permission denied: fatal error, watch cleared, no retry', async () => {
    const { geolocation, provider, errors, clock } = setup();
    const started = provider.start();
    geolocation.fail(1);
    await started;
    expect(provider.state).toBe('error');
    expect(errors).toEqual([
      { code: 'permission-denied', message: expect.any(String), at: clock.now(), fatal: true },
    ]);
    expect(geolocation.activeWatches).toBe(0);
    clock.advance(600_000);
    expect(geolocation.watchCalls).toHaveLength(1);
    expect(await provider.getPermission()).toBe('denied');
  });

  it('timeout and position-unavailable are non-fatal; the watch keeps delivering', () => {
    const { geolocation, provider, errors, samples } = setup();
    void provider.start();
    geolocation.fail(3);
    geolocation.fail(2);
    expect(provider.state).toBe('starting');
    geolocation.fix(1000);
    geolocation.fail(3);
    geolocation.fix(2000);
    expect(errors.map((e) => [e.code, e.fatal])).toEqual([
      ['timeout', false],
      ['position-unavailable', false],
      ['timeout', false],
    ]);
    expect(samples).toHaveLength(2);
    expect(provider.state).toBe('running');
    expect(geolocation.watchCalls).toHaveLength(1);
  });
});

describe('WebLocationProvider visibility', () => {
  it('hidden → clearWatch + suspended, nothing delivered; visible → new watch + running', () => {
    const { geolocation, visibility, provider, samples, states } = setup();
    void provider.start();
    geolocation.fix(1000);
    visibility.set(false);
    expect(provider.state).toBe('suspended');
    expect(geolocation.activeWatches).toBe(0);
    geolocation.fix(2000);
    visibility.set(true);
    expect(provider.state).toBe('running');
    expect(geolocation.watchCalls).toHaveLength(2);
    geolocation.fix(3000);
    expect(samples.map((s) => s.timestamp)).toEqual([1000, 3000]);
    expect(states).toEqual(['starting', 'running', 'suspended', 'running']);
  });

  it('hidden before the first fix returns to starting, not running', () => {
    const { visibility, provider } = setup();
    void provider.start();
    visibility.set(false);
    visibility.set(true);
    expect(provider.state).toBe('starting');
  });

  it('start() while hidden resolves as suspended without watching', async () => {
    const { geolocation, visibility, provider } = setup({ visible: false });
    await provider.start();
    expect(provider.state).toBe('suspended');
    expect(geolocation.watchCalls).toHaveLength(0);
    visibility.set(true);
    expect(geolocation.watchCalls).toHaveLength(1);
  });

  it('stop() is idempotent, clears the watch and the visibility subscription', async () => {
    const { geolocation, visibility, provider, states } = setup();
    const started = provider.start();
    provider.stop();
    provider.stop();
    await started;
    expect(states).toEqual(['starting', 'stopped']);
    expect(geolocation.activeWatches).toBe(0);
    expect(visibility.listenerCount).toBe(0);
    geolocation.fix(1000);
    expect(provider.state).toBe('stopped');
  });

  it('start() after an error watches again', async () => {
    const { geolocation, provider } = setup();
    void provider.start();
    geolocation.fail(1);
    void provider.start();
    expect(geolocation.watchCalls).toHaveLength(2);
    geolocation.fix(1000);
    expect(provider.state).toBe('running');
  });
});

describe('WebLocationProvider permission and platform', () => {
  it('TC-LOC-09: no Permissions API → unknown, and never calls getCurrentPosition', async () => {
    const { geolocation, provider } = setup({ permissions: null });
    expect(await provider.getPermission()).toBe('unknown');
    expect(geolocation.getCurrentPositionCalls).toBe(0);
    expect(geolocation.watchCalls).toHaveLength(0);
    void provider.start();
    geolocation.fix(1000);
    expect(await provider.getPermission()).toBe('granted');
  });

  it.each(['granted', 'denied', 'prompt', 'weird'])('Permissions API state %s', async (state) => {
    const { provider } = setup({ permissions: permissionsReturning(state) });
    expect(await provider.getPermission()).toBe(state === 'weird' ? 'unknown' : state);
  });

  it('Permissions API that throws falls back to unknown', async () => {
    const { provider } = setup({
      permissions: { query: () => Promise.reject(new TypeError('unsupported descriptor')) },
    });
    expect(await provider.getPermission()).toBe('unknown');
  });

  it('no geolocation → unsupported (fatal) and getPermission unsupported', async () => {
    const provider = new WebLocationProvider({
      enableHighAccuracy: true,
      timeout_ms: 1,
      maximumAge_ms: 0,
      clock: new FakeClock(),
      visibility: new FakeVisibility(),
      geolocation: null,
      permissions: null,
    });
    const errors: LocationError[] = [];
    provider.onError((e) => errors.push(e));
    await provider.start();
    expect(provider.state).toBe('error');
    expect(errors.map((e) => [e.code, e.fatal])).toEqual([['unsupported', true]]);
    expect(await provider.getPermission()).toBe('unsupported');
  });

  it('heading is normalised to [0, 360)', () => {
    const base = { timestamp: 1, coords: { latitude: 1, longitude: 1, accuracy: 1 } };
    expect(
      toSampleFromPosition({ ...base, coords: { ...base.coords, heading: 360 } }),
    ).toHaveProperty('heading', 0);
    expect(
      toSampleFromPosition({ ...base, coords: { ...base.coords, heading: -90 } }),
    ).toHaveProperty('heading', 270);
  });
});
