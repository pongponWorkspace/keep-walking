// QA scenarios for P2-F04-T22's e2e specs (`qa/tests/e2e/f04-*.spec.ts`): unlike every other QA
// trace in this folder, these two walk around **real committed dungeon polygons**
// (`data/dungeons/artifact/dungeons.client.v1.json`), because e2e drives the real client, which
// only ever loads that one committed artifact — there is no test hook to inject a fake dungeon
// into a real page load (checked: no `e2eDungeons*` query param exists, unlike `e2eTilesUrl`/
// `e2eGlyphsUrl`/`e2eSpriteUrl` for the map). The interior/exterior points below were found with
// `packages/geo`'s own `pointInPolygon`/`boundaryDistance_m` against the real artifact geometry (a
// grid search for the point farthest from the polygon's own edge), not eyeballed.
//
// `leelawadee-lawn` (open every day 05:00-21:00, tiny — about 20 m from this interior point to its
// own edge): a normal walk-in + walk-out-and-back-in run, for the confirm/Cancel/state-change e2e
// specs. `khlong-ong-ang` (closed all day Monday–Thursday): standing inside it on a Monday for the
// closed-dungeon e2e spec — no walk-in is needed since the dungeon is closed regardless of
// approach.
import { Polyline, offset } from '../../../../tools/traces/src/geo';
import { Recorder, walk, stand } from '../../../../tools/traces/src/scenarios/common';
import type { QaScenarioDef } from '../lib/qa-builder';

const GOOD_ACCURACY_M = 5;
const APPROACH_SPEED_MS = 1.3;
const APPROACH_SPEED_SD_MS = 0.1;
const INTERVAL_S = 5; // matches dungeons.movementGate.sampleCadence_s
const NOISE = { sigma_m: 1.5, tau_s: 20 } as const;

/** `leelawadee-lawn`'s real interior point (packages/geo `pointInPolygon` grid search over the
 * artifact's own bbox): about 20.6 m from the polygon's own edge — small, but enough margin for
 * 1.5 m of OU wander noise to never cross the boundary while standing. */
const LEELAWADEE_INTERIOR = { lat: 13.7309591, lng: 100.5396929 };
/** 70 m due north of the interior point — confirmed outside the polygon (about 31.6 m past its
 * edge) the same way. */
const LEELAWADEE_OUTSIDE = offset(LEELAWADEE_INTERIOR, 70, 0);

const READY_WINDOW_S = 90; // stand inside long enough for the e2e spec to detect+click "enter"
const HOLD_OUTSIDE_S = 90; // well past edgeHysteresisSamples * sampleCadence_s (6 * 5 = 30 s)
const HOLD_INSIDE_AGAIN_S = 90;

export const e2eLeelawadeeCheckinScenario: QaScenarioDef = {
  id: 'qa-e2e-leelawadee-checkin-01',
  scenario: 'e2e-leelawadee-checkin',
  seed: 9101,
  environment: 'park',
  description:
    'เดินจากนอก leelawadee-lawn (dungeon จริงที่ commit แล้ว, เปิดทุกวัน) เข้ามาถึงกลาง แล้วยืนนานพอให้ check-in พร้อม จากนั้นเดินออกไปนอกขอบค้างไว้ (พิสูจน์ Active -> Grace) แล้วเดินกลับเข้ามายืนอีกครั้ง (พิสูจน์ Grace -> Active, "returned") ใช้กับ e2e ของ P2-F04-T22 (confirm/Cancel, state change เดินออก/กลับเข้า)',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, NOISE, () => GOOD_ACCURACY_M);
    const line = new Polyline([LEELAWADEE_OUTSIDE, LEELAWADEE_INTERIOR]);
    const opts = {
      speed_ms: APPROACH_SPEED_MS,
      speedSd_ms: APPROACH_SPEED_SD_MS,
      interval_s: INTERVAL_S,
      reportMotion: true,
    };
    rec.mark('เริ่มนอก leelawadee-lawn เดินเข้า');
    walk(rec, line, 0, line.length_m, opts);
    rec.mark('ถึงกลาง ยืนนิ่งรอ check-in พร้อม');
    stand(rec, LEELAWADEE_INTERIOR, READY_WINDOW_S, INTERVAL_S);
    rec.mark('เดินออกนอกขอบ');
    walk(rec, line, line.length_m, 0, opts);
    rec.mark('ยืนนอกขอบ (คาดว่า Active -> Grace)');
    stand(rec, LEELAWADEE_OUTSIDE, HOLD_OUTSIDE_S, INTERVAL_S);
    rec.mark('เดินกลับเข้ามา');
    walk(rec, line, 0, line.length_m, opts);
    rec.mark('ยืนในอีกครั้ง (คาดว่า Grace -> Active, returned)');
    stand(rec, LEELAWADEE_INTERIOR, HOLD_INSIDE_AGAIN_S, INTERVAL_S);
  },
};

const POOR_ACCURACY_M = 35; // > anticheat.checkIn.maxAccuracy_m (30), same value as
// qa-checkin-accuracy-35-01 (qa/tests/traces/scenarios/checkin-accuracy.ts) — reused deliberately,
// not a new arbitrary number.
const POOR_ACCURACY_STAND_S = 300;

export const e2eLeelawadeePoorAccuracyScenario: QaScenarioDef = {
  id: 'qa-e2e-leelawadee-poor-accuracy-01',
  scenario: 'e2e-leelawadee-poor-accuracy',
  seed: 9102,
  environment: 'park',
  description:
    'เดินจากนอก leelawadee-lawn เข้ามาถึงกลาง เหมือน qa-e2e-leelawadee-checkin-01 ทุกอย่าง ยกเว้น accuracy คงที่ 35 ม. ตลอด (เกณฑ์ check-in คือน้อยกว่า 30 ม.) ต้องค้างที่ poor_accuracy ตลอด ใช้พิสูจน์ Cancel ใน check-in state นี้ด้วย (C-1) ที่ e2e ระดับเต็มระบบ',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, NOISE, () => POOR_ACCURACY_M);
    const line = new Polyline([LEELAWADEE_OUTSIDE, LEELAWADEE_INTERIOR]);
    const opts = {
      speed_ms: APPROACH_SPEED_MS,
      speedSd_ms: APPROACH_SPEED_SD_MS,
      interval_s: INTERVAL_S,
      reportMotion: true,
    };
    rec.mark('เริ่มนอก leelawadee-lawn เดินเข้า accuracy คงที่ 35 ม.');
    walk(rec, line, 0, line.length_m, opts);
    rec.mark('ถึงกลาง ยืนนิ่ง (ยัง accuracy 35 ม.) — ต้องค้าง poor_accuracy ตลอด');
    stand(rec, LEELAWADEE_INTERIOR, POOR_ACCURACY_STAND_S, INTERVAL_S);
  },
};

/** `khlong-ong-ang`'s real interior point, same grid-search method (about 13.6 m from its own
 * edge — the polygon is a narrow canal-side strip, hence the smaller margin than leelawadee-lawn). */
const KHLONG_ONG_ANG_INTERIOR = { lat: 13.7446855, lng: 100.5030765 };
const CLOSED_STAND_S = 400;

export const e2eKhlongOngAngClosedScenario: QaScenarioDef = {
  id: 'qa-e2e-khlong-ong-ang-closed-01',
  scenario: 'e2e-khlong-ong-ang-closed',
  seed: 9103,
  environment: 'other',
  description:
    'ยืนนิ่งกลาง khlong-ong-ang (dungeon จริงที่ commit แล้ว ปิดทั้งวันจันทร์-พฤหัส) accuracy ดีตลอด — ใช้กับ e2e ปิดวันจันทร์ (P2-F04-T22) พิสูจน์ว่าเข้า dungeon ที่ปิดไม่ได้ไม่ว่าจะยืนนานแค่ไหน',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, NOISE, () => GOOD_ACCURACY_M);
    rec.mark('ยืนนิ่งกลาง khlong-ong-ang (ปิดอยู่)');
    stand(rec, KHLONG_ONG_ANG_INTERIOR, CLOSED_STAND_S, INTERVAL_S);
  },
};
