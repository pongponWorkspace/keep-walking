import { describe, expect, it, vi } from 'vitest';
import { WakeLockProbe, isWakeLockSupported } from './wake-lock';
import type { NavigatorWithWakeLock, WakeLockSentinelLike } from './wake-lock';

function fakeSentinel(): WakeLockSentinelLike & { fireRelease: () => void } {
  let listener: (() => void) | undefined;
  return {
    release: vi.fn(async () => {
      listener?.();
    }),
    addEventListener: (_type: 'release', l: () => void) => {
      listener = l;
    },
    fireRelease: () => listener?.(),
  };
}

describe('isWakeLockSupported', () => {
  it('is false when navigator.wakeLock is absent', () => {
    expect(isWakeLockSupported({})).toBe(false);
  });

  it('is true when navigator.wakeLock.request is a function', () => {
    const nav: NavigatorWithWakeLock = { wakeLock: { request: async () => fakeSentinel() } };
    expect(isWakeLockSupported(nav)).toBe(true);
  });
});

describe('WakeLockProbe', () => {
  it('starts unsupported when the API is absent, and request() is a no-op', async () => {
    const probe = new WakeLockProbe({});
    expect(probe.getState()).toBe('unsupported');
    await probe.request();
    expect(probe.getState()).toBe('unsupported');
  });

  it('goes idle -> requesting -> active on a successful request, notifying each transition', async () => {
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = { wakeLock: { request: async () => sentinel } };
    const states: string[] = [];
    const probe = new WakeLockProbe(nav, { onStateChange: (s) => states.push(s) });
    expect(probe.getState()).toBe('idle');

    await probe.request();

    expect(probe.getState()).toBe('active');
    expect(states).toEqual(['requesting', 'active']);
  });

  it('release() calls the sentinel and the release event moves state to released (caller-initiated)', async () => {
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = { wakeLock: { request: async () => sentinel } };
    const probe = new WakeLockProbe(nav);
    await probe.request();

    await probe.release();

    expect(probe.getState()).toBe('released');
    expect(probe.wasReleasedByCaller()).toBe(true);
  });

  it('an OS-initiated release (no release() call) is reported as not caller-initiated', async () => {
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = { wakeLock: { request: async () => sentinel } };
    const probe = new WakeLockProbe(nav);
    await probe.request();

    sentinel.fireRelease();

    expect(probe.getState()).toBe('released');
    expect(probe.wasReleasedByCaller()).toBe(false);
  });

  it('a rejected request() moves to error with the message, never throws', async () => {
    const nav: NavigatorWithWakeLock = {
      wakeLock: {
        request: async () => {
          throw new Error('NotAllowedError');
        },
      },
    };
    const states: Array<{ state: string; detail: string | undefined }> = [];
    const probe = new WakeLockProbe(nav, {
      onStateChange: (state, detail) => states.push({ state, detail }),
    });

    await expect(probe.request()).resolves.toBeUndefined();

    expect(probe.getState()).toBe('error');
    expect(states.at(-1)).toEqual({ state: 'error', detail: 'NotAllowedError' });
  });

  it('release() is a no-op when there is no active sentinel', async () => {
    const probe = new WakeLockProbe({});
    await expect(probe.release()).resolves.toBeUndefined();
    expect(probe.getState()).toBe('unsupported');
  });
});
