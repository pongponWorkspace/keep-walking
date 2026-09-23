/**
 * FPS measurement for the HUD (docs/tech/F02-map-location-spike.md section 10.5, row "FPS"):
 * `requestAnimationFrame` frame gaps, counted only while `isActive()` says the camera is actually
 * moving (pan/zoom or a follow-mode recenter) — "ไม่วัดตอนแผนที่นิ่งเพราะ MapLibre ไม่ render" — and
 * with any gap over `fpsMaxFrameGap_ms` (the page was hidden) thrown out rather than counted as one
 * very slow frame.
 *
 * `recordFrame` is a pure accumulator (unit-tested in `fps-sampler.test.ts`); `start`/`stop` are the
 * thin `requestAnimationFrame` wiring around it, not unit-tested (no DOM in this workspace's Vitest
 * environment, ADR 0001 3.6) — covered by e2e like the rest of `map/`+`debug/hud-panel.ts`.
 */
import { percentile } from './stats';

const MS_PER_SECOND = 1000;

export interface FpsStats {
  readonly avg: number | undefined;
  readonly lowPercentile: number | undefined;
  readonly movingTimeS: number;
}

export class FpsAccumulator {
  private readonly instantFps: number[] = [];
  private movingMs = 0;

  constructor(
    private readonly maxFrameGapMs: number,
    private readonly lowPercentile: number,
  ) {}

  /** `gapMs` is the time since the previous frame; `active` is whether the camera was moving
   * during that gap. Call once per animation frame after the first. */
  recordFrame(gapMs: number, active: boolean): void {
    if (!active || gapMs <= 0 || gapMs > this.maxFrameGapMs) {
      return;
    }
    this.instantFps.push(MS_PER_SECOND / gapMs);
    this.movingMs += gapMs;
  }

  stats(): FpsStats {
    if (this.instantFps.length === 0) {
      return { avg: undefined, lowPercentile: undefined, movingTimeS: 0 };
    }
    const sorted = [...this.instantFps].sort((a, b) => a - b);
    const movingTimeS = this.movingMs / MS_PER_SECOND;
    return {
      avg: this.instantFps.length / movingTimeS,
      lowPercentile: percentile(sorted, this.lowPercentile),
      movingTimeS,
    };
  }
}

export interface FpsSamplerHandle {
  stop(): void;
}

/** Runs a `requestAnimationFrame` loop feeding `recordFrame`. `isActive()` is read fresh each frame
 * (e.g. `() => map.isMoving()`, or a caller-managed "just recentred" flag for follow mode). */
export function startFpsSampler(
  accumulator: FpsAccumulator,
  isActive: () => boolean,
): FpsSamplerHandle {
  let lastFrameTime: number | undefined;
  let stopped = false;
  let handle = 0;

  const tick = (now: number): void => {
    if (stopped) {
      return;
    }
    if (lastFrameTime !== undefined) {
      accumulator.recordFrame(now - lastFrameTime, isActive());
    }
    lastFrameTime = now;
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);

  return {
    stop(): void {
      stopped = true;
      cancelAnimationFrame(handle);
    },
  };
}
