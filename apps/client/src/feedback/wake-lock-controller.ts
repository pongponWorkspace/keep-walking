/**
 * Production Screen Wake Lock controller for a run (design/ux/components.md section 12, gate A
 * 4.4 direction A: keep the screen from locking while a run is active). Feature-detected with
 * `'wakeLock' in navigator` (a device without the API simply never has the property at all) —
 * this never throws on a browser that lacks it, it just reports `supported: false` and the run
 * plays on with the screen free to lock, same as always.
 *
 * A different module from `debug/wake-lock.ts` on purpose: that one is a HUD probe for manually
 * exercising the API during F-17's support-matrix testing (a UI concern, two buttons). This one is
 * driven by a run's own lifecycle (`start`/`stop`) and returns **per-run totals** for telemetry —
 * no coordinates, nothing about *where* the run happened, only how long the lock was actually held
 * and how long the page was hidden while it should have been held. Production code does not import
 * from `debug/` (that folder is dev-only tooling); the two modules duplicate the tiny
 * feature-detect line, not any behaviour.
 *
 * Every browser API arrives as a constructor parameter (`nav`, `doc`, `now`) so this class is a
 * plain unit test in `happy-dom` (or even plain `node`) against fakes, never a real `navigator`/
 * `document` (ADR 0001 3.6).
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

/** The one condition the coordinator's task asks for: `'wakeLock' in navigator`, not a deeper
 * `typeof nav.wakeLock?.request === 'function'` check (that would also work, but the brief is
 * explicit about the `in` form — both agree in every real browser today). */
export function isWakeLockSupported(nav: object): boolean {
  return 'wakeLock' in nav;
}

/** The subset of `Document` this controller needs — `visibilitychange` + the current `hidden`
 * flag, nothing else. */
export interface DocumentVisibilityLike {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface WakeLockRunTotals {
  readonly supported: boolean;
  /** Total time (ms) the sentinel was actually held during the run, across every acquire/release
   * cycle (a hidden page force-releases the real API, so a long run can have several). */
  readonly heldMs: number;
  /** Total time (ms) `doc.hidden` was `true` during the run. No coordinates, no player identity —
   * a duration only (CLAUDE.md privacy rules). */
  readonly hiddenMs: number;
}

export interface WakeLockControllerDeps {
  readonly nav: NavigatorWithWakeLock;
  readonly doc: DocumentVisibilityLike;
  /** Injected clock (ADR 0003 C1-3 style discipline, kept even outside the game core): every
   * duration below is computed from values this returns, never `Date.now()`. */
  readonly now: () => number;
}

/** One run's worth of Wake Lock lifecycle + totals. Construct once per run (`start`), read the
 * totals from `stop`'s return value; a fresh instance is expected for the next run rather than
 * reusing one across runs (mirrors `RunHpState`/`ActiveClock`'s own "per run" scoping, tech note
 * F04/F06 — this class is not itself part of that engine, just shaped the same way). */
export class WakeLockController {
  private readonly supported: boolean;
  private running = false;
  private sentinel: WakeLockSentinelLike | null = null;
  private heldSince_ms: number | null = null;
  private hiddenSince_ms: number | null = null;
  private heldMs = 0;
  private hiddenMs = 0;
  private readonly onVisibilityChange = (): void => {
    this.handleVisibilityChange();
  };

  constructor(private readonly deps: WakeLockControllerDeps) {
    this.supported = isWakeLockSupported(deps.nav);
  }

  /** Begins a run: resets every total to 0 and requests the lock if supported. Safe to call again
   * after `stop()` to start the next run on the same instance. */
  start(): void {
    this.running = true;
    this.heldMs = 0;
    this.hiddenMs = 0;
    this.heldSince_ms = null;
    this.hiddenSince_ms = this.deps.doc.hidden ? this.deps.now() : null;
    this.deps.doc.addEventListener('visibilitychange', this.onVisibilityChange);
    this.requestLock();
  }

  /** Ends the run: closes any in-progress held/hidden interval, releases the sentinel, stops
   * listening, and returns the totals for telemetry. */
  stop(): WakeLockRunTotals {
    const now_ms = this.deps.now();
    this.closeHeldInterval(now_ms);
    this.closeHiddenInterval(now_ms);
    this.running = false;
    this.deps.doc.removeEventListener('visibilitychange', this.onVisibilityChange);
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel !== null) void sentinel.release();
    return { supported: this.supported, heldMs: this.heldMs, hiddenMs: this.hiddenMs };
  }

  private requestLock(): void {
    if (!this.supported || this.deps.nav.wakeLock === undefined || !this.running) return;
    this.deps.nav.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (!this.running) {
          // The run ended while the request was in flight; release immediately, count nothing.
          void sentinel.release();
          return;
        }
        this.sentinel = sentinel;
        this.heldSince_ms = this.deps.now();
        sentinel.addEventListener('release', () => {
          this.sentinel = null;
          this.closeHeldInterval(this.deps.now());
          this.maybeReacquire();
        });
      })
      .catch(() => {
        // Denied/failed request (e.g. low battery mode): stays unheld, no throw (same "handle the
        // real world" rule as debug/wake-lock.ts). A later visibilitychange may retry.
      });
  }

  private handleVisibilityChange(): void {
    const now_ms = this.deps.now();
    if (this.deps.doc.hidden) {
      this.hiddenSince_ms = now_ms;
      return;
    }
    this.closeHiddenInterval(now_ms);
    this.maybeReacquire();
  }

  /** Only when released, visible, and the run is still going — never while hidden (a real request
   * would just reject) and never a second concurrent request while one is already held. */
  private maybeReacquire(): void {
    if (this.running && this.sentinel === null && !this.deps.doc.hidden) this.requestLock();
  }

  private closeHeldInterval(now_ms: number): void {
    if (this.heldSince_ms === null) return;
    this.heldMs += now_ms - this.heldSince_ms;
    this.heldSince_ms = null;
  }

  private closeHiddenInterval(now_ms: number): void {
    if (this.hiddenSince_ms === null) return;
    this.hiddenMs += now_ms - this.hiddenSince_ms;
    this.hiddenSince_ms = null;
  }
}
