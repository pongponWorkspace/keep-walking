// Streets: a narrow soi between tall buildings (poor accuracy, canyon bias, gaps) and driving.
import { Polyline, offset } from '../geo';
import { MS_PER_S, toKmh } from '../metrics';
import { RAMA4_DRIVE_START, SILOM_SOI_START } from '../places';
import type { Rng } from '../rng';
import { Recorder, stand, walk } from './common';
import type { ScenarioDef } from './types';

const HALF_TURN_DEG = 180;
const DEG_TO_RAD = Math.PI / HALF_TURN_DEG;
const QUARTER_TURN_DEG = 90;

/** Point `distance_m` from `start` along compass bearing `bearing_deg` (local plane). */
function along(start: { lat: number; lng: number }, bearing_deg: number, distance_m: number) {
  const a = bearing_deg * DEG_TO_RAD;
  return offset(start, distance_m * Math.cos(a), distance_m * Math.sin(a));
}

const SOI = {
  bearing_deg: 135,
  length_m: 800,
  duration_s: 600,
  speed_ms: 1.2,
  speedSd_ms: 0.15,
  intervalMin_s: 1,
  intervalMax_s: 3,
  noise: { sigma_m: 6, tau_s: 15 },
  /** Urban canyon: reflections push fixes to one side of the street, slowly varying. */
  canyonMean_m: 8,
  canyonSwing_m: 12,
  canyonPeriod_s: 180,
  accuracyMedian_m: 25,
  accuracyLogSd: 0.4,
  accuracyMin_m: 12,
  accuracyMax_m: 80,
  /** Signal loss windows [from, to) in seconds, with the provider event raised at the start. */
  gaps: [
    { from_s: 120, to_s: 140, event: 'timeout' },
    { from_s: 300, to_s: 322, event: 'position-unavailable' },
    { from_s: 450, to_s: 465 },
  ],
} as const;

export const soiOccludedScenario: ScenarioDef = {
  id: 'synthetic-soi-occluded-01',
  scenario: 'soi-occluded',
  seed: 401,
  environment: 'soi',
  description:
    'เดินในซอยแคบตึกสูงสองข้าง 10 นาที accuracy 12-80 ม. (ค่ากลางราว 25) fix ถูกดันออกด้านข้าง sample ทุก 1-3 วินาที และสัญญาณหาย 3 ช่วง (20, 22, 15 วินาที)',
  build: ({ rng }, b) => {
    const acc = (r: Rng) =>
      Math.min(
        SOI.accuracyMax_m,
        Math.max(
          SOI.accuracyMin_m,
          Math.exp(r.gaussian(Math.log(SOI.accuracyMedian_m), SOI.accuracyLogSd)),
        ),
      );
    const rec = new Recorder(b, rng, SOI.noise, acc);
    const line = new Polyline([
      SILOM_SOI_START,
      along(SILOM_SOI_START, SOI.bearing_deg, SOI.length_m),
    ]);
    const perp = (SOI.bearing_deg + QUARTER_TURN_DEG) * DEG_TO_RAD;
    const endMs = SOI.duration_s * MS_PER_S;
    const inGap = (t: number) =>
      SOI.gaps.some((g) => t >= g.from_s * MS_PER_S && t < g.to_s * MS_PER_S);
    for (const g of SOI.gaps) {
      if ('event' in g) b.event(g.from_s * MS_PER_S, g.event);
    }
    walk(rec, line, 0, line.length_m, {
      speed_ms: SOI.speed_ms,
      speedSd_ms: SOI.speedSd_ms,
      interval_s: SOI.intervalMin_s,
      intervalFn: () => rng.int(SOI.intervalMin_s, SOI.intervalMax_s),
      reportMotion: false,
      bias: (t) => {
        const side =
          SOI.canyonMean_m +
          SOI.canyonSwing_m * Math.sin((2 * Math.PI * t) / (SOI.canyonPeriod_s * MS_PER_S));
        return { north: side * Math.cos(perp), east: side * Math.sin(perp) };
      },
      drop: (t) => t > endMs || inGap(t),
    });
    return rec.marks;
  },
};

const DRIVE = {
  bearing_deg: 100,
  targetSpeed_kmh: 40,
  speedSd_ms: 0.4,
  walkSpeed_ms: 1.3,
  walk_m: 60,
  sitInCar_s: 30,
  accelSpeed_ms: 5,
  accel_m: 40,
  firstLeg_m: 1500,
  redLight_s: 45,
  secondLeg_m: 1500,
  parkAndWalk_m: 60,
  interval_s: 1,
  noise: { sigma_m: 3, tau_s: 20 },
  accuracyMin_m: 4,
  accuracyMax_m: 10,
} as const;

export const drivingScenario: ScenarioDef = {
  id: 'synthetic-driving-40kmh-01',
  scenario: 'driving',
  seed: 402,
  environment: 'street',
  description:
    'เดินไปขึ้นรถ นั่งรอ 30 วินาที ขับบนถนนใหญ่ราว 40 กม./ชม. (เกิน speed lock ใน config) ติดไฟแดง 45 วินาที แล้วจอดและเดินต่อ',
  build: ({ rng, cfg }, b) => {
    const cruise_ms = DRIVE.targetSpeed_kmh / toKmh(1);
    if (DRIVE.targetSpeed_kmh <= cfg.speedLock_kmh) {
      throw new Error(
        `driving trace must exceed speedLock_kmh (${cfg.speedLock_kmh}); raise targetSpeed_kmh`,
      );
    }
    const rec = new Recorder(b, rng, DRIVE.noise, (r) =>
      r.uniform(DRIVE.accuracyMin_m, DRIVE.accuracyMax_m),
    );
    const car = RAMA4_DRIVE_START;
    const walkIn = new Polyline([offset(car, DRIVE.walk_m, 0), car]);
    const base = { speedSd_ms: DRIVE.speedSd_ms, interval_s: DRIVE.interval_s, reportMotion: true };
    rec.mark('เดินไปที่รถ');
    walk(rec, walkIn, 0, walkIn.length_m, {
      ...base,
      speed_ms: DRIVE.walkSpeed_ms,
      speedSd_ms: 0.1,
    });
    rec.mark('นั่งในรถ');
    stand(rec, car, DRIVE.sitInCar_s, DRIVE.interval_s);
    const total = DRIVE.accel_m + DRIVE.firstLeg_m + DRIVE.secondLeg_m;
    const road = new Polyline([car, along(car, DRIVE.bearing_deg, total)]);
    rec.mark('ออกรถ');
    let d = walk(rec, road, 0, DRIVE.accel_m, { ...base, speed_ms: DRIVE.accelSpeed_ms });
    rec.mark('ความเร็วเดินทางราว 40 กม./ชม.');
    d = walk(rec, road, d, d + DRIVE.firstLeg_m, { ...base, speed_ms: cruise_ms });
    rec.mark('ติดไฟแดง');
    stand(rec, road.at(d).point, DRIVE.redLight_s, DRIVE.interval_s);
    rec.mark('ขับต่อ');
    d = walk(rec, road, d, total, { ...base, speed_ms: cruise_ms });
    rec.mark('จอดรถแล้วเดินต่อ');
    const walkOut = new Polyline([
      road.at(d).point,
      offset(road.at(d).point, -DRIVE.parkAndWalk_m, 0),
    ]);
    walk(rec, walkOut, 0, walkOut.length_m, {
      ...base,
      speed_ms: DRIVE.walkSpeed_ms,
      speedSd_ms: 0.1,
    });
    return rec.marks;
  },
};
