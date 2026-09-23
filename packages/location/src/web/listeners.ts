/**
 * Small listener registry shared by every provider (web, mock, capacitor).
 *
 * A throwing listener must not break the provider (for the Mock it would kill the replay
 * schedule), so each call is isolated and the error is rethrown on a microtask. That keeps the
 * failure visible in the console without the provider itself logging anything.
 */
import type { Unsubscribe } from '../types';

export class ListenerSet<T> {
  private readonly listeners = new Set<(value: T) => void>();

  add(listener: (value: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(value);
      } catch (error: unknown) {
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
