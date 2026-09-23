// Shared building blocks for scenarios: a recorder that owns the clock and the GPS noise, and
// helpers to stand still or walk along a polyline.
import type { TraceBuilder } from '../builder';
import type { TraceConfig } from '../config';
import type { LatLng, Polyline } from '../geo';
import { offset } from '../geo';
import { MS_PER_S } from '../metrics';
import type { Rng } from '../rng';
import { OuNoise } from '../rng';

const HALF_TURN_DEG = 180;

export interface ScenarioContext {
  readonly rng: Rng;
  readonly cfg: TraceConfig;
}

export type AccuracyFn = (rng: Rng) => number;

export interface NoiseSpec {
  /** Stationary standard deviation of the wander, per axis, metres. */
  readonly sigma_m: number;
  /** Correlation time of the wander, seconds. */
  readonly tau_s: number;
}

export interface SampleExtras {
  readonly speed?: number;
  readonly heading?: number;
  /** Extra north/east error in metres on top of the wander (spikes, urban canyon bias). */
  readonly bias?: { readonly north: number; readonly east: number };
  readonly accuracy?: number;
}

/** Owns the relative clock, the noise state, and the builder for one trace. */
export class Recorder {
  t_ms = 0;
  readonly marks: { label: string; t_ms: number }[] = [];
  private north: OuNoise;
  private east: OuNoise;
  private lastNoiseT_ms = 0;

  constructor(
    readonly b: TraceBuilder,
    readonly rng: Rng,
    noise: NoiseSpec,
    public accuracy: AccuracyFn,
  ) {
    this.north = new OuNoise(rng, noise.sigma_m, noise.tau_s);
    this.east = new OuNoise(rng, noise.sigma_m, noise.tau_s);
  }

  setNoise(noise: NoiseSpec): void {
    this.north = new OuNoise(this.rng, noise.sigma_m, noise.tau_s);
    this.east = new OuNoise(this.rng, noise.sigma_m, noise.tau_s);
  }

  /** Records one fix at the current time: true position + wander + optional bias. */
  sample(truth: LatLng, extras: SampleExtras = {}): void {
    const dt_s = Math.max(0, (this.t_ms - this.lastNoiseT_ms) / MS_PER_S);
    this.lastNoiseT_ms = this.t_ms;
    const n = this.north.step(dt_s) + (extras.bias?.north ?? 0);
    const e = this.east.step(dt_s) + (extras.bias?.east ?? 0);
    this.b.add({
      t_ms: this.t_ms,
      point: offset(truth, n, e),
      accuracy: extras.accuracy ?? this.accuracy(this.rng),
      ...(extras.speed === undefined ? {} : { speed: extras.speed }),
      ...(extras.heading === undefined ? {} : { heading: extras.heading }),
    });
  }

  mark(label: string): void {
    this.marks.push({ label, t_ms: this.t_ms });
  }

  advance(seconds: number): void {
    this.t_ms += seconds * MS_PER_S;
  }
}

/** Stands at `point` for `duration_s`, one fix every `interval_s`. The first fix is at the current time. */
export function stand(rec: Recorder, point: LatLng, duration_s: number, interval_s: number): void {
  const end = rec.t_ms + duration_s * MS_PER_S;
  while (rec.t_ms < end) {
    rec.sample(point);
    rec.advance(interval_s);
  }
}

/** A per-fix position error on top of the wander, optionally with the accuracy the platform claims. */
export interface Disturbance {
  readonly north: number;
  readonly east: number;
  readonly accuracy?: number;
}

export interface WalkOptions {
  readonly speed_ms: number;
  /** Standard deviation of walking-speed variation, m/s. */
  readonly speedSd_ms: number;
  readonly interval_s: number;
  /** Optional irregular fix interval in seconds (overrides interval_s), for weak-signal areas. */
  readonly intervalFn?: () => number;
  /** Report `speed` and `heading` like Android Chrome and iOS Safari do while moving. */
  readonly reportMotion: boolean;
  /** Optional per-fix bias (spikes, urban canyon offset) as a function of time. */
  readonly bias?: (t_ms: number) => Disturbance | undefined;
  /** Return true to skip recording at this time (signal loss); the walker keeps moving. */
  readonly drop?: (t_ms: number) => boolean;
}

/**
 * Walks from distance `from_m` to `to_m` along the line (either direction), one fix per interval.
 * Returns the distance reached. Stops exactly at `to_m` without recording the arrival fix, so the
 * next phase starts there.
 */
export function walk(
  rec: Recorder,
  line: Polyline,
  from_m: number,
  to_m: number,
  opts: WalkOptions,
): number {
  const dir = Math.sign(to_m - from_m);
  let d = from_m;
  while (dir !== 0 && (to_m - d) * dir > 0) {
    const { point, heading } = line.at(d);
    const speed = Math.max(0, rec.rng.gaussian(opts.speed_ms, opts.speedSd_ms));
    const bias = opts.bias?.(rec.t_ms);
    if (!(opts.drop?.(rec.t_ms) ?? false)) {
      rec.sample(point, {
        ...(opts.reportMotion
          ? { speed, heading: dir > 0 ? heading : heading + HALF_TURN_DEG }
          : {}),
        ...(bias === undefined ? {} : { bias }),
        ...(bias?.accuracy === undefined ? {} : { accuracy: bias.accuracy }),
      });
    }
    const interval_s = opts.intervalFn?.() ?? opts.interval_s;
    rec.advance(interval_s);
    const step = speed * interval_s * dir;
    d = dir > 0 ? Math.min(d + step, to_m) : Math.max(d + step, to_m);
  }
  return d;
}
