// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountPocketScreen, shouldTriggerPocketExit } from './pocket-screen';
import { createMemoryStorage } from '../storage/local-store';

const CONFIG = { swipeUpHoldMinDuration_ms: 600, swipeUpMinDistance_px: 24 };

describe('shouldTriggerPocketExit (components.md 12.1 rule 2)', () => {
  it('is false when held long enough but with no upward movement (plain long-press)', () => {
    expect(shouldTriggerPocketExit(100, 100, 1000, CONFIG)).toBe(false);
  });

  it('is false when swiped up far enough but released before the hold duration', () => {
    expect(shouldTriggerPocketExit(100, 50, 300, CONFIG)).toBe(false);
  });

  it('is false when swiped the wrong direction (down) even if held long enough', () => {
    expect(shouldTriggerPocketExit(100, 150, 1000, CONFIG)).toBe(false);
  });

  it('is true only once both the hold duration and the upward distance are met', () => {
    expect(shouldTriggerPocketExit(100, 76, 600, CONFIG)).toBe(true); // 24px exactly required
    expect(shouldTriggerPocketExit(100, 77, 600, CONFIG)).toBe(false); // 23px, one short
  });

  it('accepts more movement/hold than the minimum', () => {
    expect(shouldTriggerPocketExit(500, 0, 5000, CONFIG)).toBe(true);
  });
});

// F06 copy gate C6-03 (flow F06 Flow E ข้อ E2): `run.screenLockNotice` fades itself after
// `screenLockNoticeHoldDurationMs`, and `hideFallbackNotice()` (the caller's own `dungeon_exited`
// handler) hides it immediately regardless of that timer.
describe('mountPocketScreen — showFallbackNoticeOnce auto-fade (C6-03)', () => {
  function mount() {
    const container = document.createElement('div');
    const timers: { cb: () => void; cleared: boolean }[] = [];
    const screen = mountPocketScreen(container, {
      storage: createMemoryStorage(),
      now: () => 0,
      setTimer: (run) => {
        timers.push({ cb: run, cleared: false });
        return timers.length - 1;
      },
      clearTimer: (handle) => {
        const t = timers[handle];
        if (t !== undefined) t.cleared = true;
      },
      gesture: { swipeUpHoldMinDuration_ms: 600, swipeUpMinDistanceRatio: 0.03 },
      screenLockNoticeHoldDurationMs: 4000,
      onExit: vi.fn(),
      onEnterRequested: vi.fn(),
    });
    return { container, timers, screen };
  }

  function noticeEl(container: HTMLElement): HTMLElement {
    return container.querySelector('.pocket-screen-lock-notice') as HTMLElement;
  }

  it('shows once, then fades itself after the configured hold duration', () => {
    const { container, timers, screen } = mount();
    screen.showFallbackNoticeOnce();
    expect(noticeEl(container).hidden).toBe(false);
    expect(timers).toHaveLength(1);
    timers[0]?.cb();
    expect(noticeEl(container).hidden).toBe(true);
  });

  it('hideFallbackNotice hides it immediately and clears the pending fade timer', () => {
    const { container, timers, screen } = mount();
    screen.showFallbackNoticeOnce();
    screen.hideFallbackNotice();
    expect(noticeEl(container).hidden).toBe(true);
    expect(timers[0]?.cleared).toBe(true);
  });

  it('hideFallbackNotice is a no-op when the notice was never shown', () => {
    const { container, screen } = mount();
    expect(() => screen.hideFallbackNotice()).not.toThrow();
    expect(noticeEl(container).hidden).toBe(true);
  });
});

// D-134's own condition (P2-F06-T20 6.1, tech note F06 8.5): the swipe-distance threshold is
// resolved fresh from `window.innerHeight` at every `pointerdown`, not cached once at mount — a
// resize/orientation change between two gestures on the same pocket screen must change the second
// gesture's own threshold without needing to unmount/remount anything.
describe('mountPocketScreen — swipe threshold resolved per pointerdown (D-134)', () => {
  interface FakeTimer {
    readonly cb: () => void;
    cleared: boolean;
  }

  function mount(innerHeight: number) {
    Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
    const container = document.createElement('div');
    const timers: FakeTimer[] = [];
    const onExit = vi.fn();
    const clock = { now_ms: 0 };
    const screen = mountPocketScreen(container, {
      storage: createMemoryStorage(),
      now: () => clock.now_ms,
      setTimer: (run, _delay) => {
        timers.push({ cb: run, cleared: false });
        return timers.length - 1;
      },
      clearTimer: (handle) => {
        const t = timers[handle];
        if (t !== undefined) t.cleared = true;
      },
      gesture: { swipeUpHoldMinDuration_ms: 600, swipeUpMinDistanceRatio: 0.1 },
      screenLockNoticeHoldDurationMs: 4000,
      onExit,
      onEnterRequested: vi.fn(),
    });
    screen.showOverlay();
    return { container, timers, onExit, overlayRoot: screen.overlayRoot, clock };
  }

  function fireGesture(
    overlayRoot: HTMLElement,
    pointerId: number,
    startY: number,
    endY: number,
  ): void {
    overlayRoot.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId, clientY: startY, bubbles: true }),
    );
    overlayRoot.dispatchEvent(
      new PointerEvent('pointermove', { pointerId, clientY: endY, bubbles: true }),
    );
  }

  it('a taller viewport at pointerdown produces a larger px threshold for that gesture', () => {
    const { overlayRoot, timers, onExit, clock } = mount(800);
    // 10% of 800px = 80px required — a 100px swipe clears it.
    fireGesture(overlayRoot, 1, 500, 400);
    expect(timers).toHaveLength(1);
    clock.now_ms = 600; // heldForMs = 600, meets swipeUpHoldMinDuration_ms exactly
    timers[0]?.cb();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("changing innerHeight before the next pointerdown changes that gesture's own threshold", () => {
    const { overlayRoot, timers, onExit, clock } = mount(800);
    // First gesture at 800px height: 100px swipe clears the 80px threshold and exits (as above).
    fireGesture(overlayRoot, 1, 500, 400);
    clock.now_ms = 600;
    timers[0]?.cb();
    expect(onExit).toHaveBeenCalledTimes(1);
    overlayRoot.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));

    // Orientation change: viewport is now much taller. Same 100px swipe as before must now fall
    // short of the new, larger 10%-of-height threshold (160px).
    Object.defineProperty(window, 'innerHeight', { value: 1600, configurable: true });
    fireGesture(overlayRoot, 2, 500, 400);
    expect(timers).toHaveLength(2);
    clock.now_ms = 1200;
    timers[1]?.cb();
    expect(onExit).toHaveBeenCalledTimes(1); // still 1 -- the second gesture did not (falsely) exit

    // A swipe that actually clears the new, taller threshold does exit.
    overlayRoot.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, bubbles: true }));
    fireGesture(overlayRoot, 3, 900, 700);
    expect(timers).toHaveLength(3);
    clock.now_ms = 1800;
    timers[2]?.cb();
    expect(onExit).toHaveBeenCalledTimes(2);
  });
});
