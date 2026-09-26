/**
 * Screen Wake Lock probe for the HUD (P2-F04-T10, F-17: "Wake Lock ... vibrate/web push matrix").
 * Feature-detected: the Wake Lock API does not exist on every browser this project targets (no
 * iOS Safari support before 16.4), so this never assumes `navigator.wakeLock` exists — the HUD
 * reports "unsupported" honestly instead of throwing (CLAUDE.md "handle the real world").
 *
 * A thin, dependency-injected wrapper (constructor takes the `navigator`-shaped object instead of
 * reading the global directly) so the state machine itself is unit-testable without a DOM
 * (ADR 0001 3.6) — `debug/hud-panel.ts` wires it to the real `navigator` and to its own two
 * buttons, the DOM-glue half that stays e2e-only like the rest of that file.
 */

export interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface NavigatorWithWakeLock {
  readonly wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

export type WakeLockState =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'active'
  /** The sentinel was released — either by `release()` below or by the OS/browser itself (screen
   * locked, tab backgrounded, battery saver): F-17 needs both recorded, so the caller is not told
   * which without asking (`releasedByCaller`, see `getState()`). */
  | 'released'
  | 'error';

export interface WakeLockProbeEvents {
  readonly onStateChange?: (state: WakeLockState, detail?: string) => void;
}

/** `nav.wakeLock?.request` exists as a function — the one condition that matters, checked the same
 * way every other feature-detect in this codebase is (`debug/battery.ts`'s `nav.getBattery`). */
export function isWakeLockSupported(nav: NavigatorWithWakeLock): boolean {
  return typeof nav.wakeLock?.request === 'function';
}

export class WakeLockProbe {
  private sentinel: WakeLockSentinelLike | null = null;
  private state: WakeLockState;
  private releasedByCaller = false;

  constructor(
    private readonly nav: NavigatorWithWakeLock,
    private readonly events: WakeLockProbeEvents = {},
  ) {
    this.state = isWakeLockSupported(nav) ? 'idle' : 'unsupported';
  }

  getState(): WakeLockState {
    return this.state;
  }

  /** True only once a `'released'` state followed a caller-initiated `release()`, not an
   * OS-initiated one — the distinction F-17's matrix cares about. */
  wasReleasedByCaller(): boolean {
    return this.releasedByCaller;
  }

  async request(): Promise<void> {
    if (!isWakeLockSupported(this.nav) || this.nav.wakeLock === undefined) {
      this.setState('unsupported');
      return;
    }
    this.releasedByCaller = false;
    this.setState('requesting');
    try {
      const sentinel = await this.nav.wakeLock.request('screen');
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.setState('released', this.releasedByCaller ? 'caller' : 'os-or-browser');
      });
      this.setState('active');
    } catch (error: unknown) {
      this.setState('error', error instanceof Error ? error.message : String(error));
    }
  }

  /** No-op when there is no active sentinel (already released, never requested, unsupported). */
  async release(): Promise<void> {
    if (this.sentinel === null) {
      return;
    }
    this.releasedByCaller = true;
    await this.sentinel.release();
    // The `'release'` event handler above sets `state`/notifies once the browser fires it.
  }

  private setState(state: WakeLockState, detail?: string): void {
    this.state = state;
    this.events.onStateChange?.(state, detail);
  }
}
