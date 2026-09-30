// P2-H52: an active run in a real, open pilot dungeon (`leelawadee-lawn`,
// data/dungeons/artifact/dungeons.client.v1.json) where the first reward window is under the
// movement gate (a short stroll, then the phone set down on a bench) and later windows pass
// (steady walking on a small loop inside). Drives the client's "tick denied" toast in e2e and the
// visual-gate screenshot 11-toast-tick-denied (art/reviews/screens/F04-F06/README.md section 2).
//
// Every duration is derived from config at generation time (rewardTick.rewardTickInterval_s,
// checkIn.minContinuousApproach_s); the geometry numbers below were checked against the real
// artifact polygon with packages/geo pointInPolygon / boundaryDistance_m (README section 7).
import type { LatLng } from '../geo';
import { Polyline, haversine_m, offset } from '../geo';
import { MS_PER_S } from '../metrics';
import { OuNoise } from '../rng';
import { Recorder, walk } from './common';
import type { ScenarioDef } from './types';

/** `leelawadee-lawn` interior point (grid search farthest from the edge, same point as
 * qa/tests/traces/scenarios/e2e-real-dungeons.ts): about 20.6 m from the polygon edge. */
export const LEELAWADEE_INTERIOR: LatLng = { lat: 13.7309591, lng: 100.5396929 };

const TICK_DENIED = {
  /** One fix per movementGate.sampleCadence_s-sized step, like the other real-dungeon e2e traces. */
  interval_s: 5,
  walkSpeed_ms: 1.3,
  walkSpeedSd_ms: 0.1,
  walkNoise: { sigma_m: 1.5, tau_s: 20 },
  walkAccuracyMin_m: 5,
  walkAccuracyMax_m: 9,
  /** Approach length = this many times checkIn.minContinuousApproach_s of walking, from outside. */
  approachFactor: 2,
  /** Metres from the interior point to the south edge along the approach line (about 23 m). */
  interiorToSouthEdge_m: 23,
  /** Short stroll to the bench after arriving, slow. */
  stroll_m: 8,
  strollSpeed_ms: 0.5,
  /** Phone set down on the bench: sub-metre wander, platform holds the fix (as table-still). */
  benchNoise: { sigma_m: 0.35, tau_s: 90 },
  benchHoldThreshold_m: 0.9,
  benchAccuracyMin_m: 3,
  benchAccuracyMax_m: 5,
  /** Low-motion time after arrival = one reward window + this slack, so a late tap on "enter"
   * (Mock speed=60 turns 1 s of real time into 60 s of trace time) still gets one full window of
   * low motion. */
  confirmSlack_s: 180,
  /** Walking time after the bench = this many reward windows (the later ticks pass). */
  walkWindows: 2,
  loopRadius_m: 6,
} as const;

function loopAround(center: LatLng, r: number): Polyline {
  const corners = 8;
  const pts: LatLng[] = [];
  for (let i = 0; i < corners; i += 1) {
    const a = (2 * Math.PI * i) / corners;
    pts.push(offset(center, r * Math.cos(a), r * Math.sin(a)));
  }
  return new Polyline(pts, true);
}

export const tickDeniedScenario: ScenarioDef = {
  id: 'synthetic-tick-denied-leelawadee-01',
  scenario: 'tick-denied-leelawadee',
  seed: 601,
  environment: 'park',
  description:
    'เดินจากนอก leelawadee-lawn (dungeon จริงที่เปิดอยู่) เข้ามา เดินเล่นสั้น ๆ แล้ววางมือถือบนม้านั่งนานกว่า 1 หน้าต่าง reward (tick แรกไม่ผ่าน movement gate) จากนั้นเดินวนข้างใน 2 หน้าต่าง (tick ถัดไปผ่าน) ใช้กับ e2e และภาพ 11-toast-tick-denied',
  build: ({ rng, cfg }, b) => {
    const T = TICK_DENIED;
    const rec = new Recorder(b, rng, T.walkNoise, (r) =>
      r.uniform(T.walkAccuracyMin_m, T.walkAccuracyMax_m),
    );
    const walkOpts = {
      speed_ms: T.walkSpeed_ms,
      speedSd_ms: T.walkSpeedSd_ms,
      interval_s: T.interval_s,
      reportMotion: true,
    };
    const approach_m = T.walkSpeed_ms * T.approachFactor * cfg.checkInMinApproach_s;
    const start = offset(LEELAWADEE_INTERIOR, -(approach_m + T.interiorToSouthEdge_m), 0);
    const inLine = new Polyline([start, LEELAWADEE_INTERIOR]);
    rec.mark(`เริ่มนอก leelawadee-lawn ทางใต้ ${Math.round(approach_m)} ม. จากขอบ เดินเข้า`);
    walk(rec, inLine, 0, inLine.length_m, walkOpts);

    rec.mark('ถึงกลาง dungeon เดินเล่นช้า ๆ ไปม้านั่ง');
    const lowMotionEnd_ms = rec.t_ms + (cfg.rewardTickInterval_s + T.confirmSlack_s) * MS_PER_S;
    const bench = offset(LEELAWADEE_INTERIOR, 0, T.stroll_m);
    const strollLine = new Polyline([LEELAWADEE_INTERIOR, bench]);
    walk(rec, strollLine, 0, strollLine.length_m, {
      ...walkOpts,
      speed_ms: T.strollSpeed_ms,
      speedSd_ms: 0,
    });

    rec.mark('วางมือถือบนม้านั่ง (นิ่ง platform ค้าง fix)');
    const n = new OuNoise(rng, T.benchNoise.sigma_m, T.benchNoise.tau_s);
    const e = new OuNoise(rng, T.benchNoise.sigma_m, T.benchNoise.tau_s);
    let held: LatLng | undefined;
    while (rec.t_ms < lowMotionEnd_ms) {
      const estimate = offset(bench, n.step(T.interval_s), e.step(T.interval_s));
      if (held === undefined || haversine_m(held, estimate) > T.benchHoldThreshold_m) {
        held = estimate;
      }
      b.add({
        t_ms: rec.t_ms,
        point: held,
        accuracy: rng.uniform(T.benchAccuracyMin_m, T.benchAccuracyMax_m),
      });
      rec.advance(T.interval_s);
    }

    rec.mark('ลุกขึ้นเดินวนรอบจุดกลาง dungeon (รัศมี 6 ม.)');
    const loop = loopAround(LEELAWADEE_INTERIOR, T.loopRadius_m);
    const toLoop = new Polyline([bench, loop.at(0).point]);
    walk(rec, toLoop, 0, toLoop.length_m, walkOpts);
    const walkEnd_ms = rec.t_ms + T.walkWindows * cfg.rewardTickInterval_s * MS_PER_S;
    let d = 0;
    while (rec.t_ms < walkEnd_ms) {
      const lapEnd = d + loop.length_m;
      d = walk(rec, loop, d, lapEnd, walkOpts);
    }
    rec.mark('จบ trace');
    return rec.marks;
  },
};
