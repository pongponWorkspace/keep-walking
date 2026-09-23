/**
 * Real-platform defaults for the injectable dependencies (Clock, VisibilitySource).
 * Tests never use these; they inject a fake clock and a controllable visibility source.
 */
import type { Clock, TimerHandle, Unsubscribe, VisibilitySource } from '../types';

/** Wall-clock time and the host timer functions. */
export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback: () => void, delayMs: number): TimerHandle =>
    globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle: TimerHandle): void => {
    globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
  },
};

/** A source that is always visible. Used where no document exists (Node, workers). */
export const alwaysVisible: VisibilitySource = {
  isVisible: () => true,
  subscribe: (): Unsubscribe => () => undefined,
};

/**
 * Wraps `document.visibilityState` and `visibilitychange`. Hidden covers a locked screen,
 * a switched tab, and a minimised browser. Falls back to `alwaysVisible` without a document.
 */
export function documentVisibility(): VisibilitySource {
  if (typeof document === 'undefined') {
    return alwaysVisible;
  }
  const doc = document;
  return {
    isVisible: () => doc.visibilityState !== 'hidden',
    subscribe: (listener: (visible: boolean) => void): Unsubscribe => {
      const handler = (): void => {
        listener(doc.visibilityState !== 'hidden');
      };
      doc.addEventListener('visibilitychange', handler);
      return () => {
        doc.removeEventListener('visibilitychange', handler);
      };
    },
  };
}
