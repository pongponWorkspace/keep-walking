/**
 * TC-LOC-07 (Capacitor stub) and package hygiene: no coordinate logging at any level,
 * navigator.geolocation only in src/web/, no import of repo config/ from the package.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LocationError, LocationProviderState } from '../src/types';
import * as location from '../src/index';
import { FakeClock, FakeGeolocation, FakeVisibility, REPO_ROOT, readTrace } from './helpers';

const SRC_DIR = join(REPO_ROOT, 'packages', 'location', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Source text without comments, so doc comments that mention an API do not count. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Capacitor stub (TC-LOC-07)', () => {
  it('start() → not-implemented (fatal), state error, message names Phase 8, no samples', async () => {
    const clock = new FakeClock();
    const provider = location.createCapacitorLocationProvider({ clock });
    const errors: LocationError[] = [];
    const states: LocationProviderState[] = [];
    let samples = 0;
    provider.onError((e) => errors.push(e));
    provider.onStateChange((s) => states.push(s));
    provider.onSample(() => (samples += 1));
    expect(provider.kind).toBe('capacitor');
    await expect(provider.start()).resolves.toBeUndefined();
    expect(provider.state).toBe('error');
    expect(states).toEqual(['error']);
    expect(errors).toEqual([
      {
        code: 'not-implemented',
        message: expect.stringContaining('not implemented until Phase 8'),
        at: clock.now(),
        fatal: true,
      },
    ]);
    expect(await provider.getPermission()).toBe('unsupported');
    provider.stop();
    provider.stop();
    expect(provider.state).toBe('stopped');
    expect(samples).toBe(0);
  });
});

describe('no raw coordinates in logs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('source files never call console', () => {
    for (const file of sourceFiles(SRC_DIR)) {
      expect(code(file), relative(REPO_ROOT, file)).not.toMatch(/\bconsole\s*\./);
    }
  });

  it('full Web and Mock sessions (incl. errors and suspend) write nothing to console', async () => {
    const methods = ['log', 'info', 'debug', 'warn', 'error', 'trace'] as const;
    const spies = methods.map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));

    const clock = new FakeClock();
    for (const id of ['synthetic-screen-lock-01', 'synthetic-permission-denied-01']) {
      const mock = location.createMockLocationProvider({
        trace: readTrace(id),
        speed: 60,
        clock,
        visibility: new FakeVisibility(),
      });
      await mock.start();
      clock.runUntilIdle();
    }

    const geolocation = new FakeGeolocation();
    const visibility = new FakeVisibility();
    const web = location.createWebLocationProvider({
      enableHighAccuracy: true,
      timeoutMs: 15000,
      maximumAgeMs: 0,
      clock,
      visibility,
      geolocation,
      permissions: null,
    });
    void web.start();
    geolocation.fix(1000);
    geolocation.fail(3);
    visibility.set(false);
    visibility.set(true);
    geolocation.fail(1);

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('error messages carry no coordinates', async () => {
    const clock = new FakeClock();
    const messages: string[] = [];
    const mock = location.createMockLocationProvider({
      trace: readTrace('synthetic-screen-lock-01'),
      speed: 60,
      clock,
      visibility: new FakeVisibility(),
    });
    mock.onError((e) => messages.push(e.message));
    await mock.start();
    clock.runUntilIdle();
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) expect(message).not.toMatch(/\d+\.\d{3,}/);
  });
});

describe('package boundaries', () => {
  it('navigator.geolocation appears only under src/web/ (and does appear there)', () => {
    const users = sourceFiles(SRC_DIR)
      .filter((file) => /navigator\s*\??\.\s*geolocation/.test(code(file)))
      .map((file) => relative(SRC_DIR, file));
    expect(users).toEqual(['web/web-provider.ts']);
  });

  it('no source file imports repo config/ (values arrive from the caller)', () => {
    for (const file of sourceFiles(SRC_DIR)) {
      expect(code(file), relative(REPO_ROOT, file)).not.toMatch(/from\s+['"][^'"]*config\//);
    }
  });

  it('index exports every implementation', () => {
    expect(typeof location.createWebLocationProvider).toBe('function');
    expect(typeof location.createMockLocationProvider).toBe('function');
    expect(typeof location.createCapacitorLocationProvider).toBe('function');
    expect(typeof location.loadTrace).toBe('function');
    expect(location.systemClock.now()).toBeGreaterThan(0);
    expect(location.alwaysVisible.isVisible()).toBe(true);
    expect(location.documentVisibility().isVisible()).toBe(true);
  });
});
