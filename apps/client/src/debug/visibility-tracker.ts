/**
 * Tracks total time the page spent `hidden` (tab backgrounded / screen locked) and how many GPS
 * samples arrived while hidden vs. visible (P2-F04-T10, F-17: "นับ sample GPS และเวลาขณะ
 * visibilitychange hidden/จอล็อก"). v1 web is honest about this rather than pretending to keep
 * counting movement in the background (CLAUDE.md "app backgrounded (v1 web stops counting
 * movement, so show the player this honestly)") — this probe is what lets a human tester see, on a
 * real phone, whether samples actually stop arriving once the screen locks.
 *
 * Pure state machine driven by explicit calls (`setHidden`/`recordSample`, both take the instant
 * they happened at) rather than reading `document.visibilityState`/`Date.now()` itself, so it is
 * unit-testable without a DOM (ADR 0001 3.6). `debug/hud-panel.ts` wires the two `document`
 * listeners (`visibilitychange`, `pagehide`) to this.
 */

export interface VisibilityTrackerState {
  readonly hiddenTotalMs: number;
  readonly hiddenSince: number | undefined;
  readonly samplesWhileHidden: number;
  readonly samplesWhileVisible: number;
}

export class VisibilityTracker {
  private hiddenTotalMs = 0;
  private hiddenSinceMs: number | undefined;
  private samplesWhileHidden = 0;
  private samplesWhileVisible = 0;

  constructor(initiallyHidden: boolean, atMs: number) {
    if (initiallyHidden) {
      this.hiddenSinceMs = atMs;
    }
  }

  /** Call on every `visibilitychange` (and `pagehide`, treated the same as going hidden). */
  setHidden(hidden: boolean, atMs: number): void {
    if (hidden) {
      this.hiddenSinceMs ??= atMs;
      return;
    }
    if (this.hiddenSinceMs !== undefined) {
      this.hiddenTotalMs += Math.max(0, atMs - this.hiddenSinceMs);
      this.hiddenSinceMs = undefined;
    }
  }

  /** Call once per GPS sample received; tags it hidden/visible by the tracker's current state. */
  recordSample(atMs: number): void {
    if (this.isHidden(atMs)) {
      this.samplesWhileHidden += 1;
    } else {
      this.samplesWhileVisible += 1;
    }
  }

  private isHidden(atMs: number): boolean {
    return this.hiddenSinceMs !== undefined && atMs >= this.hiddenSinceMs;
  }

  /** `hiddenTotalMs` includes the still-open hidden span (as of `atMs`) if currently hidden. */
  snapshot(atMs: number): VisibilityTrackerState {
    const openSpanMs =
      this.hiddenSinceMs !== undefined ? Math.max(0, atMs - this.hiddenSinceMs) : 0;
    return {
      hiddenTotalMs: this.hiddenTotalMs + openSpanMs,
      hiddenSince: this.hiddenSinceMs,
      samplesWhileHidden: this.samplesWhileHidden,
      samplesWhileVisible: this.samplesWhileVisible,
    };
  }
}
