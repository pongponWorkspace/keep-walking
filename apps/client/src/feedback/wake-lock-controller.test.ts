// WakeLockController (design/ux/components.md section 12, gate A 4.4). Every browser API is a
// fake object here; `request()` is `async` in every fixture below, so tests `await
// Promise.resolve()` twice (once for the request's own resolution, once for the `.then` handler
// that follows it) to let the controller's internal promise chain settle before asserting.
import { describe, expect, it, vi } from 'vitest';
import type {
  DocumentVisibilityLike,
  NavigatorWithWakeLock,
  WakeLockSentinelLike,
} from './wake-lock-controller';
import { WakeLockController, isWakeLockSupported } from './wake-lock-controller';

function fakeSentinel(): WakeLockSentinelLike & { fireRelease: () => void } {
  let listener: (() => void) | undefined;
  return {
    release: vi.fn(async () => {
      listener?.();
    }),
    addEventListener: (_type, l) => {
      listener = l;
    },
    fireRelease: () => listener?.(),
  };
}

function fakeDoc(initialHidden = false): DocumentVisibilityLike & {
  setHidden: (hidden: boolean) => void;
} {
  let hidden = initialHidden;
  const listeners = new Set<() => void>();
  return {
    get hidden() {
      return hidden;
    },
    addEventListener: (_type, l) => listeners.add(l),
    removeEventListener: (_type, l) => listeners.delete(l),
    setHidden: (next) => {
      hidden = next;
      for (const l of listeners) l();
    },
  };
}

function fakeClock(start = 0): { now: () => number; set: (t: number) => void } {
  let t = start;
  return { now: () => t, set: (next) => (t = next) };
}

describe('isWakeLockSupported', () => {
  it('is false when navigator has no wakeLock property at all', () => {
    expect(isWakeLockSupported({})).toBe(false);
  });

  it('is true when navigator carries the wakeLock property', () => {
    expect(isWakeLockSupported({ wakeLock: {} })).toBe(true);
  });
});

describe('WakeLockController, unsupported device', () => {
  it('never calls request and returns supported: false with zero totals', () => {
    const requestSpy = vi.fn();
    const nav: NavigatorWithWakeLock = {};
    const clock = fakeClock();
    const controller = new WakeLockController({ nav, doc: fakeDoc(), now: clock.now });
    controller.start();
    expect(requestSpy).not.toHaveBeenCalled();
    const totals = controller.stop();
    expect(totals).toEqual({ supported: false, heldMs: 0, hiddenMs: 0 });
  });
});

describe('WakeLockController, supported device', () => {
  it('accumulates held time and re-requests after a release once the page is visible again', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const sentinels: ReturnType<typeof fakeSentinel>[] = [];
    const nav: NavigatorWithWakeLock = {
      wakeLock: {
        request: vi.fn(async () => {
          const s = fakeSentinel();
          sentinels.push(s);
          return s;
        }),
      },
    };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);

    // Held for 1000 ms, then the OS releases it (page hidden in the background, typical cause).
    clock.set(1000);
    doc.setHidden(true);
    sentinels[0]?.fireRelease();
    // Released while hidden: must not re-request yet (a real request would reject while hidden).
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);

    // The page comes back 500 ms later -> re-request.
    clock.set(1500);
    doc.setHidden(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(2);

    // Held again for another 300 ms, then the run ends.
    clock.set(1800);
    const totals = controller.stop();

    expect(totals.supported).toBe(true);
    expect(totals.heldMs).toBe(1000 + 300);
    expect(totals.hiddenMs).toBe(500);
  });

  it('releases the sentinel and stops listening on stop()', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = {
      wakeLock: { request: vi.fn(async () => sentinel) },
    };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    clock.set(200);
    controller.stop();
    expect(sentinel.release).toHaveBeenCalledTimes(1);

    // A stale release firing after stop() must not blow up or reopen an interval.
    expect(() => sentinel.fireRelease()).not.toThrow();
  });

  it('tracks hidden time even when the request is denied (e.g. low battery mode)', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const nav: NavigatorWithWakeLock = {
      wakeLock: { request: vi.fn(async () => Promise.reject(new Error('denied'))) },
    };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    clock.set(100);
    doc.setHidden(true);
    clock.set(400);
    const totals = controller.stop();

    expect(totals).toEqual({ supported: true, heldMs: 0, hiddenMs: 300 });
  });
});
