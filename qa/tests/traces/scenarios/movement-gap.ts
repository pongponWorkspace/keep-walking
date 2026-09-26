// QA scenario (board acceptance "(GD B-04) เดิน 20 นาที + ช่องว่าง 5 นาทีห่าง 400 ม. + เดินต่อ 5
// นาที -> 400 ม. ไม่ถูกนับ", spec F05 edge case G2): walks inside the test polygon for 20 minutes
// (four full reward windows at ~1.3 m/s, each comfortably over minDistancePerWindow_m), then the
// signal is lost for exactly 5 minutes while the walker keeps moving in the story (about 400 m at
// the same pace) but the provider records nothing at all, then walks for 5 more minutes. The gap
// (300 s) is ten times movementGate.maxSamplePairGap_s (30 s), so no pair can ever bridge it: the
// window that covers the gap sees zero fixes and zero distance no matter how far the player
// actually walked. This is the GPS-trace counterpart of the systems-designer's G2 vector
// (design/systems/test-vectors/reward-window.json, movement-gate.json); see
// qa/tests/traces/engine-run-state.test.ts (tools/traces/src/metrics.ts `gateWindows`, the QA
// reference calculator per data/gps-traces/README.md section 5) for the assertion.
import { Polyline, offset } from '../../../../tools/traces/src/geo';
import { TEST_RECT_CENTER } from '../../../../tools/traces/src/places';
import { Recorder, walk } from '../../../../tools/traces/src/scenarios/common';
import type { QaScenarioDef } from '../lib/qa-builder';

const GAP = {
  walkBefore_s: 1200,
  gap_s: 300,
  walkAfter_s: 300,
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 2, tau_s: 20 },
  accuracyMin_m: 4,
  accuracyMax_m: 9,
  /** Small closed loop around the centre, well inside test-rect-benchasiri.geojson (about 267 m
   * N/S x 227 m E/W): a walker can cover 20+5 minutes at 1.3 m/s (about 1,950 m) without ever
   * approaching the edge, and a closed Polyline lets one `walk()` call target any total distance
   * (it wraps), so the exact ~400 m covered "in the dark" is just a further distance target,
   * not a second polygon or a bounce. */
  loopRadius_m: 60,
} as const;

function loopAround(center: { readonly lat: number; readonly lng: number }): Polyline {
  const r = GAP.loopRadius_m;
  return new Polyline(
    [offset(center, r, 0), offset(center, 0, r), offset(center, -r, 0), offset(center, 0, -r)],
    true,
  );
}

export const movementGap400mScenario: QaScenarioDef = {
  id: 'qa-movement-gap-400m-01',
  scenario: 'movement-gap-400m',
  seed: 9002,
  environment: 'park',
  description:
    'เดินในพื้นที่ทดสอบต่อเนื่อง 20 นาที (ผ่าน movement gate ทุกหน้าต่างที่ครบ) แล้วสัญญาณหายต่อเนื่อง 5 นาที (ไม่มี sample เลย ห่างกันเกิน maxSamplePairGap_s สิบเท่า) ระหว่างนั้นเดินจริงต่อราว 400 ม. แล้วสัญญาณกลับมาเดินต่ออีก 5 นาที ระยะ 400 ม. ที่คร่อมช่องว่างต้องไม่ถูกนับเข้า gate (F05 G2, GD B-04)',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, GAP.noise, (r) =>
      r.uniform(GAP.accuracyMin_m, GAP.accuracyMax_m),
    );
    const loop = loopAround(TEST_RECT_CENTER);
    const opts = {
      speed_ms: GAP.speed_ms,
      speedSd_ms: GAP.speedSd_ms,
      interval_s: GAP.interval_s,
      reportMotion: true,
    };
    rec.mark('เริ่มเดินต่อเนื่อง 20 นาที');
    const before_m = GAP.speed_ms * GAP.walkBefore_s;
    let d = walk(rec, loop, 0, before_m, opts);

    b.event(rec.t_ms, 'position-unavailable');
    rec.mark('สัญญาณหาย 5 นาที (เดินจริงต่อราว 400 ม. แต่ไม่มี sample ถูกบันทึก)');
    const gapDistance_m = GAP.speed_ms * GAP.gap_s;
    rec.advance(GAP.gap_s);
    d += gapDistance_m;

    rec.mark('สัญญาณกลับมา เดินต่ออีก 5 นาที');
    const after_m = d + GAP.speed_ms * GAP.walkAfter_s;
    walk(rec, loop, d, after_m, opts);
  },
};
