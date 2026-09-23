// Walking in an open park: the normal case, and the same walk with multipath drift spikes.
import type { LatLng } from '../geo';
import { Polyline, offset } from '../geo';
import { MS_PER_S } from '../metrics';
import { LUMPHINI_CENTER } from '../places';
import type { Disturbance } from './common';
import { Recorder, walk } from './common';
import type { ScenarioDef } from './types';

const PARK = {
  loopVertices: 36,
  loopRadiusNorth_m: 230,
  loopRadiusEast_m: 200,
  /** Gentle bends so the loop is not a perfect ellipse (deterministic, no rng). */
  wobble_m: 12,
  wobbleHarmonic: 5,
  duration_s: 1800,
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 2, tau_s: 20 },
  accuracyBase_m: 4,
  accuracySpread_m: 1.5,
} as const;

export function parkLoop(): Polyline {
  const pts: LatLng[] = [];
  for (let i = 0; i < PARK.loopVertices; i += 1) {
    const a = (2 * Math.PI * i) / PARK.loopVertices;
    const w = PARK.wobble_m * Math.sin(PARK.wobbleHarmonic * a);
    pts.push(
      offset(
        LUMPHINI_CENTER,
        (PARK.loopRadiusNorth_m + w) * Math.cos(a),
        (PARK.loopRadiusEast_m + w) * Math.sin(a),
      ),
    );
  }
  return new Polyline(pts, true);
}

export const parkLoopScenario: ScenarioDef = {
  id: 'synthetic-park-loop-01',
  scenario: 'park-loop',
  seed: 101,
  environment: 'park',
  description:
    'เดินวนในสวนโล่ง 30 นาที ราว 1.3 m/s sample ทุก 1 วินาที accuracy 4-10 ม. ผ่าน movement gate ทุกหน้าต่าง',
  build: ({ rng }, b) => {
    const acc = (r: typeof rng) =>
      PARK.accuracyBase_m + Math.abs(r.gaussian(0, PARK.accuracySpread_m));
    const rec = new Recorder(b, rng, PARK.noise, acc);
    const loop = parkLoop();
    const endMs = PARK.duration_s * MS_PER_S;
    const opts = {
      speed_ms: PARK.speed_ms,
      speedSd_ms: PARK.speedSd_ms,
      interval_s: PARK.interval_s,
      reportMotion: true,
    };
    let d = 0;
    while (rec.t_ms <= endMs) {
      // Walk in short legs so the loop can wrap; the trace ends at duration_s.
      const legEnd = d + PARK.speed_ms * PARK.interval_s * PARK.loopVertices;
      d = walk(rec, loop, d, legEnd, { ...opts, drop: (t) => t > endMs });
      if (rec.t_ms > endMs) break;
    }
  },
};

const SPIKE = {
  duration_s: 720,
  outLeg_m: 450,
  /** The out-and-back line starts this far south and west of the park reference point. */
  startSouth_m: 150,
  startWest_m: 150,
  /** S1: one fix jumps east, the platform admits poor accuracy. */
  s1_at_s: 150,
  s1_east_m: 150,
  s1_accuracy_m: 35,
  /** S2: three fixes jump north while claiming good accuracy (the hard case). */
  s2_from_s: 330,
  s2_count: 3,
  s2_north_m: 300,
  s2_accuracy_m: 12,
  /** S3: slow drift west that ramps up, holds, then snaps back. */
  s3_from_s: 510,
  s3_ramp_s: 20,
  s3_hold_s: 5,
  s3_west_m: 60,
  s3_accuracy_m: 25,
} as const;

export function spikeAt(t_ms: number): Disturbance | undefined {
  const t = t_ms / MS_PER_S;
  if (t === SPIKE.s1_at_s) {
    return { north: 0, east: SPIKE.s1_east_m, accuracy: SPIKE.s1_accuracy_m };
  }
  if (t >= SPIKE.s2_from_s && t < SPIKE.s2_from_s + SPIKE.s2_count) {
    return { north: SPIKE.s2_north_m, east: 0, accuracy: SPIKE.s2_accuracy_m };
  }
  const s3 = t - SPIKE.s3_from_s;
  if (s3 >= 0 && s3 < SPIKE.s3_ramp_s + SPIKE.s3_hold_s) {
    const f = Math.min(1, s3 / SPIKE.s3_ramp_s);
    return {
      north: 0,
      east: -SPIKE.s3_west_m * f,
      accuracy: PARK.accuracyBase_m + (SPIKE.s3_accuracy_m - PARK.accuracyBase_m) * f,
    };
  }
  return undefined;
}

export const driftSpikeScenario: ScenarioDef = {
  id: 'synthetic-drift-spike-01',
  scenario: 'drift-spike',
  seed: 102,
  environment: 'park',
  description:
    'เดินไปกลับในสวน 12 นาที มี spike 3 แบบ: กระโดด 150 ม. 1 fix (accuracy 35), กระโดด 300 ม. 3 fix (accuracy 12), drift ช้า 60 ม. แล้วดีดกลับ',
  build: ({ rng }, b) => {
    const acc = (r: typeof rng) =>
      PARK.accuracyBase_m + Math.abs(r.gaussian(0, PARK.accuracySpread_m));
    const rec = new Recorder(b, rng, PARK.noise, acc);
    const start = offset(LUMPHINI_CENTER, -SPIKE.startSouth_m, -SPIKE.startWest_m);
    const line = new Polyline([
      start,
      offset(start, SPIKE.outLeg_m / Math.SQRT2, SPIKE.outLeg_m / Math.SQRT2),
    ]);
    const endMs = SPIKE.duration_s * MS_PER_S;
    const opts = {
      speed_ms: PARK.speed_ms,
      speedSd_ms: PARK.speedSd_ms,
      interval_s: PARK.interval_s,
      reportMotion: true,
      bias: spikeAt,
      drop: (t: number) => t > endMs,
    };
    let d = 0;
    while (rec.t_ms <= endMs) {
      d = walk(rec, line, d, d < line.length_m / 2 ? line.length_m : 0, opts);
    }
  },
};
