// QA scenario: a legitimate walk-in approach where every fix reports accuracy = 35 m, always
// above anticheat.checkIn.maxAccuracy_m (30, strict less-than, spec F04 E6 / R07 item 3). Distinct
// from tools/traces synthetic-walk-in-01 (good accuracy, proves the accept path) and from
// synthetic-teleport-spoof-01 (good accuracy, proves the "not from outside" reject path): this
// file proves the `poor_accuracy` reject path stays rejected for the whole approach, board
// acceptance "(GD B-03) ... accuracy 35 ม. ถูกปฏิเสธ".
import { Polyline, offset } from '../../../../tools/traces/src/geo';
import { TEST_RECT, TEST_RECT_CENTER } from '../../../../tools/traces/src/places';
import { Recorder, walk } from '../../../../tools/traces/src/scenarios/common';
import type { QaScenarioDef } from '../lib/qa-builder';

/** Fixed accuracy used for every fix in this trace (must stay > checkIn.maxAccuracy_m = 30). */
export const CHECKIN_ACCURACY_M = 35;

const APPROACH = {
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 2, tau_s: 20 },
  /** Approach length = this many times checkIn.minContinuousApproach_s, same margin walk-in uses. */
  approachFactor: 2,
  insideWalk_s: 180,
  insideLoop_m: 40,
} as const;

function insideLoop() {
  const r = APPROACH.insideLoop_m;
  const c = TEST_RECT_CENTER;
  return new Polyline([offset(c, r, 0), offset(c, 0, r), offset(c, -r, 0), offset(c, 0, -r)], true);
}

export const checkinAccuracy35Scenario: QaScenarioDef = {
  id: 'qa-checkin-accuracy-35-01',
  scenario: 'checkin-accuracy-35',
  seed: 9001,
  environment: 'park',
  description:
    'เดินจากทางเท้านอก polygon ทดสอบเข้ามาถึงกลาง polygon ต่อเนื่องนานพอสำหรับ check-in (2 เท่าของ minContinuousApproach_s) แต่ accuracy คงที่ 35 ม. ตลอดทั้ง trace (เกณฑ์ check-in คือน้อยกว่า 30 ม.) แล้วเดินวนข้างใน 3 นาที ต้องถูกปฏิเสธ poor_accuracy ตลอด ไม่มีจังหวะที่ผ่าน',
  build: ({ rng, cfg }, b) => {
    // Fixed accuracy: the Recorder's AccuracyFn ignores rng and always returns CHECKIN_ACCURACY_M.
    const rec = new Recorder(b, rng, APPROACH.noise, () => CHECKIN_ACCURACY_M);
    const approach_m = APPROACH.speed_ms * APPROACH.approachFactor * cfg.checkInMinApproach_s;
    const edgePoint = { lat: TEST_RECT.north, lng: TEST_RECT_CENTER.lng };
    const start = offset(edgePoint, approach_m, 0);
    const loop = insideLoop();
    const path = new Polyline([start, edgePoint, loop.at(0).point]);
    const opts = {
      speed_ms: APPROACH.speed_ms,
      speedSd_ms: APPROACH.speedSd_ms,
      interval_s: APPROACH.interval_s,
      reportMotion: true,
    };
    rec.mark(`เริ่มเดินเข้า จากนอกขอบเหนือ ${Math.round(approach_m)} ม. accuracy คงที่ 35 ม.`);
    walk(rec, path, 0, path.length_m, opts);
    rec.mark('อยู่ในพื้นที่แล้ว เริ่มเดินวนข้างใน (ยัง accuracy 35 ม.)');
    walk(rec, loop, 0, APPROACH.speed_ms * APPROACH.insideWalk_s, opts);
  },
};
