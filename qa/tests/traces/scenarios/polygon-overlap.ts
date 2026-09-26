// QA scenario (board acceptance "polygon ซ้อน", spec F04 R03 / E9): walks east in a straight
// line from outside both test rectangles, through TEST_RECT-only ground, through the strip where
// TEST_RECT and QA_OVERLAP_RECT overlap, into QA_OVERLAP_RECT-only ground east of TEST_RECT, then
// back the same way. A run confirmed on TEST_RECT must read "outside" once the walker is east of
// TEST_RECT.east even though they are still inside QA_OVERLAP_RECT the whole time (R03: "polygon
// อื่นที่ซ้อนกันไม่มีผลต่อ run state"); a run confirmed on QA_OVERLAP_RECT must symmetrically read
// "outside" once the walker is west of QA_OVERLAP_RECT.west. See
// qa/tests/traces/engine-run-state.test.ts for the pointInPolygon-based assertion against both
// polygons from the same trace.
import { Polyline, offset } from '../../../../tools/traces/src/geo';
import { TEST_RECT, TEST_RECT_CENTER } from '../../../../tools/traces/src/places';
import { Recorder, walk } from '../../../../tools/traces/src/scenarios/common';
import { QA_OVERLAP_RECT } from '../lib/overlap-polygon';
import type { QaScenarioDef } from '../lib/qa-builder';

const OVERLAP = {
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 2, tau_s: 20 },
  accuracyMin_m: 4,
  accuracyMax_m: 9,
  /** How far past each rectangle's outer edge the walker goes, so every zone (A-only, overlap,
   * B-only) has fixes clearly inside it, not just at the boundary. */
  margin_m: 40,
} as const;

export const polygonOverlapScenario: QaScenarioDef = {
  id: 'qa-polygon-overlap-01',
  scenario: 'polygon-overlap',
  seed: 9003,
  environment: 'park',
  description:
    'เดินตรงไปทางตะวันออกจากนอก polygon ทั้งสอง ผ่าน TEST_RECT อย่างเดียว เข้าเขตที่ TEST_RECT กับ qa-rect-overlap-b ซ้อนกัน แล้วออกไปอยู่ใน qa-rect-overlap-b อย่างเดียว (นอก TEST_RECT) แล้วเดินย้อนกลับเส้นเดิม ใช้พิสูจน์ F04-R03/E9 ว่า run ที่เลือก polygon หนึ่งไม่สนใจการซ้อนกับอีก polygon',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, OVERLAP.noise, (r) =>
      r.uniform(OVERLAP.accuracyMin_m, OVERLAP.accuracyMax_m),
    );
    const lat = TEST_RECT_CENTER.lat;
    const westEdge = { lat, lng: TEST_RECT.west };
    const eastEdge = { lat, lng: QA_OVERLAP_RECT.east };
    const start = offset(westEdge, 0, -OVERLAP.margin_m);
    const end = offset(eastEdge, 0, OVERLAP.margin_m);
    const line = new Polyline([start, end]);
    const opts = {
      speed_ms: OVERLAP.speed_ms,
      speedSd_ms: OVERLAP.speedSd_ms,
      interval_s: OVERLAP.interval_s,
      reportMotion: true,
    };
    rec.mark('เริ่มนอก polygon ทั้งสอง เดินไปทางตะวันออก');
    walk(rec, line, 0, line.length_m, opts);
    rec.mark('เดินย้อนกลับ');
    walk(rec, line, line.length_m, 0, opts);
  },
};
