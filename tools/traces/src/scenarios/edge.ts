// Polygon edge behaviour and check-in: walking along an edge with drift, a legitimate walk-in,
// and a teleport into the middle of the polygon. Polygon = TEST_RECT (places.ts).
import type { LatLng } from '../geo';
import { Polyline, offset } from '../geo';
import { BENJAKITTI_FOREST_CENTER, TEST_RECT, TEST_RECT_CENTER } from '../places';
import { Recorder, stand, walk } from './common';
import type { ScenarioDef } from './types';

const EDGE = {
  /** The walker keeps this far inside the south edge while "walking along the edge". */
  inside_m: 2.5,
  endInset_m: 10,
  /** Reported fixes drift across the edge: sigma large enough to cross, short correlation time. */
  noise: { sigma_m: 5, tau_s: 20 },
  accuracyMin_m: 6,
  accuracyMax_m: 12,
  speed_ms: 1.2,
  speedSd_ms: 0.1,
  interval_s: 1,
  passesBeforeExit: 3,
  /** How far outside the edge the walker stands during the two real exits. */
  outside_m: 15,
  /** True time outside: exit 1 = grace minus this, exit 2 = grace plus this (grace from config). */
  graceMargin_s: 30,
  graceOverrun_s: 60,
  endStand_s: 60,
  endStandInside_m: 20,
} as const;

function southEdgeLine(): Polyline {
  const west = offset(
    { lat: TEST_RECT.south, lng: TEST_RECT.west },
    EDGE.inside_m,
    EDGE.endInset_m,
  );
  const east = offset(
    { lat: TEST_RECT.south, lng: TEST_RECT.east },
    EDGE.inside_m,
    -EDGE.endInset_m,
  );
  return new Polyline([west, east]);
}

export const edgeWalkScenario: ScenarioDef = {
  id: 'synthetic-edge-walk-01',
  scenario: 'edge-walk',
  seed: 301,
  environment: 'park',
  description:
    'เดินเลียบขอบใต้ของ polygon ทดสอบ (อยู่ข้างใน 2.5 ม.) fix ลอยข้ามขอบบ่อย แล้วออกนอกจริง 2 ครั้ง: สั้นกว่า Grace 30 วินาที และนานกว่า Grace 60 วินาที',
  build: ({ rng, cfg }, b) => {
    const rec = new Recorder(b, rng, EDGE.noise, (r) =>
      r.uniform(EDGE.accuracyMin_m, EDGE.accuracyMax_m),
    );
    const edge = southEdgeLine();
    const opts = {
      speed_ms: EDGE.speed_ms,
      speedSd_ms: EDGE.speedSd_ms,
      interval_s: EDGE.interval_s,
      reportMotion: true,
    };
    // Time spent truly outside = walk from the edge to the stand point and back + the stand.
    const edgeToStand_s = EDGE.outside_m / EDGE.speed_ms;
    const exit = (at_m: number, outside_s: number, label: string) => {
      const stay_s = Math.round(outside_s - 2 * edgeToStand_s);
      const inside = edge.at(at_m).point;
      const outside = offset(inside, -(EDGE.inside_m + EDGE.outside_m), 0);
      const path = new Polyline([inside, outside]);
      rec.mark(`${label}: เริ่มเดินออก`);
      walk(rec, path, 0, path.length_m, opts);
      rec.mark(`${label}: ยืนนอก polygon ${stay_s} วินาที (อยู่นอกจริงรวมราว ${outside_s} วินาที)`);
      stand(rec, outside, stay_s, EDGE.interval_s);
      rec.mark(`${label}: เดินกลับเข้า`);
      walk(rec, path, path.length_m, 0, opts);
    };
    rec.mark('เดินเลียบขอบ 3 รอบ (ข้างในจริงตลอด)');
    let d = 0;
    for (let pass = 0; pass < EDGE.passesBeforeExit; pass += 1) {
      d = walk(rec, edge, d, d === 0 ? edge.length_m : 0, opts);
    }
    exit(d, cfg.graceMax_s - EDGE.graceMargin_s, 'ออกครั้งที่ 1');
    rec.mark('เดินเลียบขอบอีก 1 รอบ');
    d = walk(rec, edge, d, d === 0 ? edge.length_m : 0, opts);
    exit(d, cfg.graceMax_s + EDGE.graceOverrun_s, 'ออกครั้งที่ 2');
    rec.mark('ยืนข้างในห่างขอบ 20 ม.');
    const endSpot = offset(edge.at(d).point, EDGE.endStandInside_m, 0);
    const toEndSpot = new Polyline([edge.at(d).point, endSpot]);
    walk(rec, toEndSpot, 0, toEndSpot.length_m, opts);
    stand(rec, endSpot, EDGE.endStand_s, EDGE.interval_s);
    return rec.marks;
  },
};

const CHECKIN = {
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 3, tau_s: 20 },
  /** Accuracy during the approach as a fraction of checkIn.maxAccuracy_m (always below it). */
  accuracyFracMin: 0.25,
  accuracyFracMax: 0.5,
  /** Approach time = this many times checkIn.minContinuousApproach_s. */
  approachFactor: 2,
  insideWalk_s: 180,
  insideLoop_m: 40,
  teleportWait_s: 90,
} as const;

function insideLoop(center: LatLng): Polyline {
  const r = CHECKIN.insideLoop_m;
  return new Polyline(
    [offset(center, r, 0), offset(center, 0, r), offset(center, -r, 0), offset(center, 0, -r)],
    true,
  );
}

export const walkInScenario: ScenarioDef = {
  id: 'synthetic-walk-in-01',
  scenario: 'walk-in',
  seed: 302,
  environment: 'park',
  description:
    'เดินจากทางเท้านอก polygon ทดสอบเข้ามาถึงกลาง polygon ต่อเนื่อง (นานกว่าเกณฑ์ check-in 2 เท่า accuracy ต่ำกว่าเกณฑ์) แล้วเดินวนข้างใน 3 นาที',
  build: ({ rng, cfg }, b) => {
    const maxAcc = cfg.checkInMaxAccuracy_m;
    const rec = new Recorder(b, rng, CHECKIN.noise, (r) =>
      r.uniform(CHECKIN.accuracyFracMin * maxAcc, CHECKIN.accuracyFracMax * maxAcc),
    );
    const approach_m = CHECKIN.speed_ms * CHECKIN.approachFactor * cfg.checkInMinApproach_s;
    const edgePoint = { lat: TEST_RECT.north, lng: TEST_RECT_CENTER.lng };
    const start = offset(edgePoint, approach_m, 0);
    const loop = insideLoop(TEST_RECT_CENTER);
    // Walk straight to where the inside loop starts, so there is no jump between the two phases.
    const path = new Polyline([start, edgePoint, loop.at(0).point]);
    const opts = {
      speed_ms: CHECKIN.speed_ms,
      speedSd_ms: CHECKIN.speedSd_ms,
      interval_s: CHECKIN.interval_s,
      reportMotion: true,
    };
    rec.mark(`เริ่มเดินเข้า จากนอกขอบเหนือ ${Math.round(approach_m)} ม.`);
    walk(rec, path, 0, path.length_m, opts);
    rec.mark('อยู่ในพื้นที่แล้ว เริ่มเดินวนข้างใน');
    walk(rec, loop, 0, CHECKIN.speed_ms * CHECKIN.insideWalk_s, opts);
    return rec.marks;
  },
};

export const teleportScenario: ScenarioDef = {
  id: 'synthetic-teleport-spoof-01',
  scenario: 'teleport-spoof',
  seed: 303,
  environment: 'mixed',
  description:
    'ยืนในสวนอื่นห่างราว 1.3 กม. 90 วินาที แล้ว fix ถัดไป (1 วินาที) โผล่กลาง polygon ทดสอบด้วย accuracy ดี แล้วเดินวนข้างใน 3 นาที ต้องถูกปฏิเสธ check-in',
  build: ({ rng, cfg }, b) => {
    const maxAcc = cfg.checkInMaxAccuracy_m;
    const rec = new Recorder(b, rng, CHECKIN.noise, (r) =>
      r.uniform(CHECKIN.accuracyFracMin * maxAcc, CHECKIN.accuracyFracMax * maxAcc),
    );
    rec.mark('ยืนนอกพื้นที่ (สวนเบญจกิติ)');
    stand(rec, BENJAKITTI_FOREST_CENTER, CHECKIN.teleportWait_s, CHECKIN.interval_s);
    rec.mark('teleport: fix แรกกลาง polygon');
    const loop = insideLoop(TEST_RECT_CENTER);
    const opts = {
      speed_ms: CHECKIN.speed_ms,
      speedSd_ms: CHECKIN.speedSd_ms,
      interval_s: CHECKIN.interval_s,
      reportMotion: true,
    };
    walk(rec, loop, 0, CHECKIN.speed_ms * CHECKIN.insideWalk_s, opts);
    return rec.marks;
  },
};
