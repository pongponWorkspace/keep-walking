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

  it('snapshot() reads live totals without releasing the sentinel or resetting anything', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = { wakeLock: { request: vi.fn(async () => sentinel) } };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    clock.set(700);
    // A mid-run peek: the sentinel is still held (open interval), so snapshot must include the
    // still-open 700 ms, not just the closed portion (there is none yet).
    expect(controller.snapshot()).toEqual({ supported: true, heldMs: 700, hiddenMs: 0 });
    // stop() a moment later still sees the full run, proving snapshot() closed nothing early.
    clock.set(900);
    expect(controller.stop()).toEqual({ supported: true, heldMs: 900, hiddenMs: 0 });
  });

  it('reports the four wake_lock_state_changed states in order: granted, released', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = { wakeLock: { request: vi.fn(async () => sentinel) } };
    const states: string[] = [];
    const controller = new WakeLockController({
      nav,
      doc,
      now: clock.now,
      onStateChange: (s) => states.push(s),
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(states).toEqual(['granted']);

    controller.stop();
    expect(states).toEqual(['granted', 'released']);
  });

  it('reports request_denied on a rejected request', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    const nav: NavigatorWithWakeLock = {
      wakeLock: { request: vi.fn(async () => Promise.reject(new Error('denied'))) },
    };
    const states: string[] = [];
    const controller = new WakeLockController({
      nav,
      doc,
      now: clock.now,
      onStateChange: (s) => states.push(s),
    });
    // Flushes several microtask hops of the async-function-rejects -> .then() skip -> .catch()
    // chain (not a real sequential wait for anything external) — each `await` is its own
    // statement rather than a loop so no lint rule mistakes this for a real sequential wait.
    controller.start();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(states).toEqual(['request_denied']);
  });

  it('does not fire a second concurrent request() while the first is still pending (F06-TG-09)', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    let resolveFirst: ((s: WakeLockSentinelLike) => void) | undefined;
    const firstSentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = {
      wakeLock: {
        request: vi.fn(
          () =>
            new Promise<WakeLockSentinelLike>((resolve) => {
              resolveFirst = resolve;
            }),
        ),
      },
    };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);

    // A visibility flicker (hidden then visible again) while the first request is still pending
    // must not fire a second, concurrent request() — this is the exact race that used to leak the
    // first sentinel (overwritten, never released) and reset heldSince_ms.
    doc.setHidden(true);
    doc.setHidden(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);

    clock.set(200);
    resolveFirst?.(firstSentinel);
    await Promise.resolve();
    await Promise.resolve();

    // Only the one request ever happened, and its sentinel is the one actually held.
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);
    clock.set(250);
    expect(controller.stop()).toEqual({ supported: true, heldMs: 50, hiddenMs: 0 });
    expect(firstSentinel.release).toHaveBeenCalledTimes(1);
  });

  it('releases the late sentinel when stop() runs before the in-flight request settles (F06-TG-09)', async () => {
    const clock = fakeClock(0);
    const doc = fakeDoc(false);
    let resolveRequest: ((s: WakeLockSentinelLike) => void) | undefined;
    const sentinel = fakeSentinel();
    const nav: NavigatorWithWakeLock = {
      wakeLock: {
        request: vi.fn(
          () =>
            new Promise<WakeLockSentinelLike>((resolve) => {
              resolveRequest = resolve;
            }),
        ),
      },
    };
    const controller = new WakeLockController({ nav, doc, now: clock.now });

    controller.start();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(1);

    clock.set(50);
    const totals = controller.stop();
    expect(totals).toEqual({ supported: true, heldMs: 0, hiddenMs: 0 });

    // The request settles only after stop() already ran (run over before the promise resolved).
    resolveRequest?.(sentinel);
    await Promise.resolve();
    await Promise.resolve();

    expect(sentinel.release).toHaveBeenCalledTimes(1);
    // Nothing about the already-returned totals changes because of the late resolution.
    expect(controller.snapshot()).toEqual({ supported: true, heldMs: 0, hiddenMs: 0 });

    // A fresh start() on the same instance is free to request again (no stale in-flight guard).
    clock.set(100);
    controller.start();
    await Promise.resolve();
    expect(nav.wakeLock?.request).toHaveBeenCalledTimes(2);
  });

  it('reports unsupported once, immediately, on an unsupported device', () => {
    const clock = fakeClock(0);
    const states: string[] = [];
    const controller = new WakeLockController({
      nav: {},
      doc: fakeDoc(),
      now: clock.now,
      onStateChange: (s) => states.push(s),
    });
    controller.start();
    expect(states).toEqual(['unsupported']);
    controller.stop();
    expect(states).toEqual(['unsupported']);
  });
});
