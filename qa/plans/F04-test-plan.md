# F04 — Dungeon Presence และ Run State: Test Plan

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F04-T19 · เจ้าของ: qa-tester · วันที่ 2026-09-27 |
| อ้างอิง spec | `design/features/F04-dungeon-presence.md` (R01–R39, transition T1–T12, edge case E1–E18, acceptance 1–12) |
| อ้างอิง tech note | `docs/tech/F04-dungeon-presence.md` §4 (เวลา, H), §5 (presence/run state, D-103/D-104), §6 (speed lock), §7 (check-in), §8 (เวลาทำการ), §10 (persist/resume), §11 (เพดาน sample), §12 (telemetry), §14 (นำทาง), §16 (failure modes), §17 (test hooks) |
| อ้างอิง decision | D-094, D-100, D-102 (ค่า), D-103/D-104 (hysteresis), D-112 (zone level clamp — ไม่เกี่ยวกับ F04 โดยตรง แต่ระบุใน BUG-P2-001 ของ regression), D-113 |
| Exit checklist ที่ผูก | E1 (trace ครบ transition + เลียบขอบ + drift), E2 (dungeon ปิดเข้าไม่ได้), E16 (speed lock ล็อกจริง, check-in ปฏิเสธ teleport/accuracy) |
| คู่กับ | `qa/plans/F05-test-plan.md` (movement gate / reward / drop ของ run เดียวกัน) |

## 0. สถานะของโค้ดที่ทดสอบได้จริงตอนเขียนแผนนี้ (สำคัญต่อการอ่านตาราง traceability)

ณ วันที่เขียนแผนนี้ (W5 ของ phase):

- `packages/shared/src/run/*` (state machine, hysteresis, speed lock, approach, check-in `PresenceStrategy`, opening hours) — **DONE** (P2-F04-T20) มี batch entry point ที่ทดสอบได้ตรงโดยไม่ต้องมี `session`: `runTimeline`, `checkInBatch`, `isOpenAt`/`openingChangeAfter`/`closingSoonAt`
- `packages/shared/src/reward/*` และ `packages/shared/src/session/*` (ตัวประกอบ loop เต็ม `sessionStep`) — **IN_PROGRESS** (P2-F05-T08) ยังไม่มี entry point รวมให้ QA เรียกผ่าน Mock ได้จริง
- client (`apps/client`, Mock UI, `setDungeonsSourceData`) — ยังไม่เริ่ม (P2-F04-T21 รอ T25/T26/T27 อยู่ใน W5 เดียวกัน)

ผลคือแผนนี้แบ่งวิธีพิสูจน์แต่ละ case เป็น 3 ระดับ ระบุต่อ case ในหัวข้อ 3:

| ระดับ | วิธี | ใช้ได้ตอนนี้ | ใช้เมื่อ session พร้อม (P2-F05-T11, P2-F04-T22) |
| --- | --- | --- | --- |
| Vector | `design/systems/test-vectors/*.json` ผ่าน `packages/shared/src/formulas/vectors.test.ts` (ค้นแบบ dynamic) | ใช่ (ของ systems-designer อยู่แล้ว) | ใช่ |
| Engine batch | เรียก `runTimeline` / `checkInBatch` / opening-hours ตรงจาก trace ที่ classify แล้ว (ไม่ผ่าน Mock/UI) | ใช่ — ทำในงานนี้ (`qa/tests/traces/engine-*.test.ts`) | ใช่ (regression เดิมยังต้องผ่าน) |
| Mock replay | เล่น trace ผ่าน `loc=mock&trace=<id>&speed=` จริงในเบราว์เซอร์ / Playwright | ไม่ได้ (ไม่มี UI) | ใช่ — เป็นงานของ P2-F04-T22 |

งานนี้ (T19) **ไม่ซ้ำ** vector ของ systems-designer (`design/systems/test-vectors/run-state.json`, `check-in.json`, `speed-lock.json`, `opening-hours.json`) และไม่ซ้ำ trace สังเคราะห์ของ location-engineer (`data/gps-traces/synthetic/*`) — อ้างถึงทั้งสองแบบในตาราง traceability แทนการสร้างใหม่ ตามที่ tech-lead ขอ (N-08) และตามกฎ "ไม่ซ้ำ" ของ context บรีฟ

## 1. ค่า config ที่ทุก case ในแผนนี้อ้างอิง (D-102, อ่านสดจาก config ไม่ hardcode)

| key | ค่า ณ วันที่เขียน | ใช้ใน |
| --- | --- | --- |
| `anticheat.checkIn.minContinuousApproach_s` | 60 | R07(1), check-in |
| `anticheat.checkIn.maxAccuracy_m` | 30 (strict `<`) | R07(3), E6 |
| `anticheat.checkIn.teleportIntoPolygonAllowed` | false | R07(2), E5 |
| `anticheat.speedLock.speedLock_kmh` | 25 | R20 |
| `anticheat.speedLock.lockSustained_s` / `unlockSustained_s` | 15 / 60 | R20, R22 |
| `dungeons.movementGate.sampleCadence_s` | 5 | ADR 0003 5.3 |
| `dungeons.movementGate.maxSamplePairGap_s` | 30 | R07(1), R13, gap case |
| `dungeons.movementGate.maxSampleAccuracy_m` | 30 | 3.3 |
| `dungeons.movementGate.outlierSpeed_kmh` | 60 | ตัวกรอง outlier |
| `dungeons.runState.graceMax_s` / `suspendedMax_s` | 180 / 900 | R12, acceptance 4 |
| `dungeons.runState.edgeHysteresisSamples` / `edgeHysteresis_m` | 6 / 5 | R15, D-103 |
| `dungeons.runState.clockSkewTolerance_s` | 5 | E10 |
| `dungeons.openingHours.utcOffset_min` | 420 (UTC+7 ไม่มี DST) | 3.5 |
| `dungeons.openingHours.closingSoonNotice_s` | 600 | R28, R29 |

ทุก case ที่อ้างตัวเลขเหล่านี้ต้องอ่านจาก config ผ่าน `qa/tests/traces/lib/engine-config.ts` (`loadQaEngineParams()`) หรือของ systems-designer เอง ไม่มีตัวเลขฝังในโค้ดทดสอบ (ตรวจได้ด้วย `grep` ว่าไฟล์ทดสอบไม่มีค่าคงที่พวกนี้ตรง ๆ ยกเว้นในชื่อ/คอมเมนต์)

## 2. คลัง trace ที่ใช้ (ไม่สร้างซ้ำ)

### 2.1 ของ location-engineer (`data/gps-traces/synthetic/`, อ่านอย่างเดียว)

| ไฟล์ | ใช้พิสูจน์อะไรใน F04 |
| --- | --- |
| `synthetic-edge-walk-01` | เดินเลียบขอบ 3 รอบ + ออกจริง 2 ครั้ง (สั้นกว่า/นานกว่า Grace) — acceptance 5, E1 |
| `synthetic-walk-in-01` | เดินเข้าจากนอกครบ `minContinuousApproach_s` accuracy ดี — acceptance 3 (ผ่าน), E4 บางส่วน |
| `synthetic-teleport-spoof-01` | teleport เข้ากลาง polygon แล้วเดินวน — acceptance 3 (ปฏิเสธ), E5, GD B-03 |
| `synthetic-driving-40kmh-01` | ขับ ~40 กม./ชม. ผ่าน lock threshold แล้วติดไฟแดง 45 วิ | acceptance 7, E13/E14, GD B-02 |
| `synthetic-drift-spike-01` | spike 150/300 ม. + drift 60 ม. แล้วดีดกลับ | E2, ตัวกรอง outlier |
| `synthetic-table-still-01`, `synthetic-bench-jitter-01`, `synthetic-boundary-50m-01` | ของ F05 เป็นหลัก (ดู F05 test plan) แต่ใช้ยืนยันว่า run state ไม่สลับผิดตอนนิ่ง/jitter ด้วย |
| `synthetic-soi-occluded-01` | accuracy แย่ต่อเนื่อง + gap สั้น (20–25 วิ) | E3, E8 |
| `synthetic-screen-lock-01`, `synthetic-permission-denied-01` | จอล็อก/ถอน permission กลาง run | E7, E8, FM-01/FM-07 |
| `synthetic-warmup-accuracy-01` | accuracy ตั้งไข่หลังเปิด GPS | E16 (`not_enough_trace` นับถอยหลัง) |

### 2.2 ของ qa-tester (`data/gps-traces/qa/`, สร้างด้วย `qa/tests/traces/build.ts`)

| ไฟล์ | ใช้พิสูจน์อะไร | ทำไมต้องสร้างใหม่ (ไม่ซ้ำของเดิม) |
| --- | --- | --- |
| `qa-checkin-accuracy-35-01` | เดินเข้าจากนอกครบเวลา แต่ accuracy คงที่ 35 ม. (> เกณฑ์ 30 ม.) ตลอด → ต้องถูกปฏิเสธ `poor_accuracy` ทุกจังหวะ | ของเดิมพิสูจน์ทางผ่าน (`walk-in`) กับทาง teleport (`teleport-spoof`) แต่ไม่มีไฟล์ที่ "ทุกอย่างถูกยกเว้น accuracy" ตามที่ GD B-03 ระบุชื่อค่าตรง ๆ (35 ม.) |
| `qa-movement-gap-400m-01` | เดิน 20 นาที + สัญญาณหาย 5 นาที (เดินจริงต่อ ~400 ม.) + เดินต่อ 5 นาที | GD B-04 ขอ trace รูปแบบนี้ตรง ๆ (คนละแบบกับ gap สั้นของ `soi-occluded` และ `qa-gps-gap-2min` เดิม ซึ่งเป็น 2 นาที ไม่ใช่ 5 นาทีคร่อม 400 ม.) |
| `qa-polygon-overlap-01` | เดินผ่าน 4 โซน: นอกทั้งคู่ / ใน TEST_RECT อย่างเดียว / ซ้อนทั้งคู่ / ใน `qa-rect-overlap-b` อย่างเดียว แล้วเดินกลับ | ของเดิมมี polygon เดียว (`test-rect-benchasiri`) ไม่มี case polygon ซ้อนเลย (F04-R03/E9) ต้องมี polygon ที่สองซึ่งเป็นของ qa-tester (`data/gps-traces/qa/polygons/qa-rect-overlap-b.geojson`) |

ทั้งสามไฟล์สร้างด้วยสคริปต์ (`qa/tests/traces/build.ts --check`) เรียก builder ของ `tools/traces` (Recorder/walk/stand/Polyline จาก `tools/traces/src/scenarios/common.ts`, `tools/traces/src/geo.ts`) โดยไม่แก้โค้ดของ location-engineer แล้ว stamp `meta.kind: "qa"` ทับ (`qa/tests/traces/lib/qa-builder.ts`) ผ่าน `validateTrace` ทุกไฟล์ (ดูผลรันในหัวข้อ 6)

## 3. Traceability: spec F04 acceptance 1–12 → case

| # | ข้อความ acceptance (ย่อ) | case id | ระดับ | หลักฐาน |
| --- | --- | --- | --- | --- |
| 1 | run ได้ครั้งละหนึ่ง · polygon ซ้อน run state ของแห่งที่เลือกไม่เปลี่ยนเมื่ออยู่ในอีกแห่ง | F04-C01 | Engine batch (ตอนนี้), Mock replay (P2-F04-T22) | `qa/tests/traces/engine-run-state.test.ts` ผ่าน `qa-polygon-overlap-01` ต่อ polygon ทั้งสอง |
| 2 | ไม่มีทางเข้า run โดยไม่กด "เข้า" · popup ไม่มีจำนวนคน/role | F04-C02 | UI/flow (รอ P2-F04-T21) | ตรวจ flow F04 ที่อนุมัติแล้ว (`design/reviews/F04-flow-approval.md`) + case ของ P2-F04-T22 (ปุ่ม "เข้า" เท่านั้นที่เรียก `confirm`, popup ไม่มี property จำนวนคน — ตรงกับ D-100 J-2) |
| 3 | teleport + accuracy 35 ม. ถูกปฏิเสธพร้อม reason ถูก · เดินเข้าจากนอกครบเวลา accuracy ดีผ่าน · ปุ่มเข้าแสดงสถานะรอ | F04-C03a/b/c | Engine batch | `qa/tests/traces/engine-checkin.test.ts` 6 case (teleport → `no_approach_from_outside`, ก่อนครบเวลา → `not_enough_trace`, accuracy 35 ม. → `poor_accuracy` ทุกจังหวะ, walk-in ปกติ → `ok:true`) |
| 4 | Grace 2:59→Active, 3:01→Suspended, 14:59→กลับ Active, 15:01→Ended `timeout` | F04-C04 | Vector (ของเดิม, ตรงเป็ะทุกวินาที) | `design/systems/test-vectors/run-state.json` `runTimeline` (now_ms 379000/380000/381000, 1099000/1100000/1101000) ผ่าน `packages/shared/src/formulas/vectors.test.ts` — ดูผลรันหัวข้อ 6; แนวทางเดียวกันนี้คือ hook "แอปถูกปิด (engine)" ของ tech note §17 (`toPersisted`→ข้ามเวลา→`fromPersisted`→`tick`) ที่ P2-F04-T25/T22 จะต่อยอด |
| 5 | เลียบขอบ/drift ไม่สลับสถานะถี่กว่า hysteresis · เวลานอกนับย้อนจาก sample แรกที่อยู่นอก | F04-C05 | Vector (ของเดิม) + trace อ้างอิง | `design/systems/test-vectors/run-state.json` `edgeHysteresis` (8 vector) และ `runTimeline` ที่อ้าง `synthetic-edge-walk-01.trace.json` ตรง ๆ (สอง sample rate 1 Hz/5 Hz ให้ผลเดียวกัน — พิสูจน์ GD B-03 "ไม่ขึ้นกับความถี่ sample") |
| 6 | ปิดแอป 5 นาทีในเขต = run เดิมอยู่ ไม่มีระยะ · ปิด 16 นาที = สรุป run `timeout` ของไม่หาย | F04-C06 | Engine hook (`toPersisted`/`fromPersisted`) | รอ P2-F04-T25 (storage adapter) + P2-F04-T22 ทำ case จริง; แผนการทดสอบ: เรียก `runTimeline`/state เดิมด้วย sample ต่อเนื่องจนถึงจุดปิด แล้วป้อน sample ถัดไปที่ `t` ห่างออกไป 5 และ 16 นาที เทียบผลตาม `design/systems/test-vectors/run-state.json` ("half-built return run followed by a 20-minute gap" ใช้กฎเดียวกัน) |
| 7 | `driving-40kmh`: lock ภายใน `lockSustained_s` ไม่มี tick/damage ขณะ lock · ปลดหลัง `unlockSustained_s` · จอ lock ไม่มีคำว่าโกง | F04-C07 | Engine batch + Vector + Copy | `qa/tests/traces/engine-checkin.test.ts` (`speed_lock` ระหว่างขับ) · `design/systems/test-vectors/speed-lock.json` (เข้า/ออก lock backdate) · ข้อความจอ lock เป็นของ copy gate (P2-F05-T17), F04-C07-copy อ้างอิงไว้ให้ narrative ตรวจ |
| 8 | dungeon ปิดไม่มีปุ่มเข้า + แสดงเวลาเปิดถัดไป · run คร่อมเวลาปิดจบ `dungeon_closed` ที่วินาทีปิด ของครบ | F04-C08 | Engine batch + Vector | `qa/tests/traces/engine-opening-hours.test.ts` (isOpenAt ปิด/เปิดที่ขอบ, `openingChangeAfter` หาเวลาเปิดถัดไป, `closingSoonAt`) · `design/systems/test-vectors/opening-hours.json` (ของเดิม รวมข้ามเที่ยงคืนและ exceptions) |
| 9 | เลเวลนอกช่วงเข้าได้ · onboarding แนะนำเฉพาะที่เปิดอยู่ | F04-C09 | Flow/UI (รอ P2-F04-T21) | ตรวจผ่าน flow F04 ที่อนุมัติแล้ว + P2-F04-T22 (level ไม่ block `confirm`, artifact เลือกเฉพาะ `status: open`) |
| 10 | ระยะไม่เคยน้อยกว่าจริง มีคำกำกับ · ไม่มีเส้นทาง · ลิงก์นำทางมีแค่ปลายทาง+โหมดเดิน | F04-C10 | UI/URL test (รอ P2-F04-T21, tech note §14) | case ของ P2-F04-T22: parse URL ต้องมีเฉพาะ key `api,destination,travelmode` หรือ `daddr,dirflg` และพิกัดตรง `nav_destination` — ไม่มี query อื่น ไม่มีตำแหน่งผู้เล่น |
| 11 | หลัง run จบ storage ไม่มีพิกัด · telemetry ไม่มีพิกัด | F04-C11 | Engine + build guard | ดูหัวข้อ 5 (storage/telemetry) ของแผนนี้ |
| 12 | ทุกตัวเลขอ่านจาก config key หัวข้อ 8 ของ spec | F04-C12 | config lint | `pnpm run lint:config` (P2-F04-T24) + grep ของ `qa/tests/traces` เอง (หัวข้อ 1) |

## 4. Traceability: edge case E1–E18 (spec หัวข้อ 5)

| edge | case id | หลักฐาน |
| --- | --- | --- |
| E1 เลียบขอบสลับใน/นอก | F04-C05 | เหมือนข้อ 5 ข้างบน |
| E2 GPS drift กระโดดออกนอกหนึ่ง sample | F04-C13 | `synthetic-drift-spike-01` ผ่าน `runTimeline`/`checkInBatch` (ตัวกรอง outlier ทิ้ง spike ไม่เปลี่ยนสถานะ) — ครอบใน `qa/tests/traces/engine-checkin.test.ts` ทางอ้อมผ่านการที่ `walk-in`/`teleport` ใช้ตัวกรองเดียวกัน; เพิ่ม case ตรงในรอบ P2-F04-T22 |
| E3 accuracy แย่ต่อเนื่อง | F04-C14 | `synthetic-soi-occluded-01` (accuracy 12–80 ม., gap 3 ช่วง) — vector `movement-gate.json`/`run-state.json` ที่อ้างไฟล์นี้ (ถ้ามี) หรือ engine batch ใน P2-F04-T22 |
| E4 เปิดแอปครั้งแรกกลางสวน | F04-C03a (ส่วน `not_enough_trace`/`no_approach_from_outside`) | `qa/tests/traces/engine-checkin.test.ts` |
| E5 teleport เข้ากลาง polygon | F04-C03a | เหมือนข้อ 3 |
| E6 accuracy 35 ม. / เท่าเกณฑ์พอดี | F04-C03a, F04-C15 (เท่าเกณฑ์ 30 ม. พอดี) | `qa-checkin-accuracy-35-01` (35 ม.) + vector `check-in.json` (30 ม. พอดี, ของเดิม) |
| E7 จอล็อก/hidden/แอปถูกปิด | F04-C06 | เหมือนข้อ 6 + `synthetic-screen-lock-01` |
| E8 เน็ตหลุด | F04-C16 | ไม่มีผลต่อ engine ตาม design (banner offline เป็นของ client, P2-F04-T21) — case คือ "ไม่มี event ของ engine เกิดขึ้นจากการหลุดเน็ตอย่างเดียว" ตรวจใน P2-F04-T22 |
| E9 เปลี่ยน dungeon กลางทาง / polygon ซ้อน | F04-C01 | เหมือนข้อ 1 |
| E10 นาฬิกาเครื่องเพี้ยน/ย้อน | F04-C17 | vector `run-state.json` `clockCheck` (3 vector, ของเดิม) — ยืนยันว่า `clock_invalid` เกิดตาม `clockSkewTolerance_s` |
| E11 ปิดทำการระหว่าง Suspended | F04-C08 | เหมือนข้อ 8 |
| E12 เข้า 1 นาทีก่อนปิด | F04-C08 | เหมือนข้อ 8 (ผูกกับ F05 D-059 partial tick, ดู F05 test plan G9/G10) |
| E13 นั่งรถผ่าน polygon | F04-C07 | เหมือนข้อ 7 |
| E14 ปั่นจักรยานเร็วเกินเกณฑ์ในสวน | F04-C07 | เหมือนข้อ 7 (`synthetic-driving-40kmh-01` ใช้แทนได้เพราะกฎ lock ไม่แยกพาหนะ) |
| E15 ออกเองแล้ว confirm แห่งเดิมทันที | F04-C18 | รอ session (P2-F05-T08) + P2-F04-T22: เรียก `checkIn` ใหม่ทันทีหลัง `exit`, คาดว่าต้องผ่าน check-in ใหม่ (approach ไม่ persist ข้าม run ตาม `persistPreRunApproach=false`) |
| E16 ไม่มี sample ก่อน confirm | F04-C19 | `synthetic-warmup-accuracy-01` ผ่าน `checkInBatch` → `not_enough_trace` จนกว่าจะครบเวลา |
| E17 เลเวลต่ำกว่าช่วงมาก | F04-C09 | เหมือนข้อ 9 |
| E18 ออกนอกพื้นที่เล่น (โซนดำ) | F04-C20 | ไม่มีกฎพิเศษตาม design — ตรวจว่า `runTimeline` ปฏิบัติเหมือนออกนอก polygon ปกติ (ครอบด้วย vector เดิมอยู่แล้ว เพราะ polygon คือ polygon ไม่สนใจว่าอยู่ในโซนดำหรือไม่) |

## 5. Privacy: storage และ telemetry ไม่มีพิกัดหลัง run จบ (GD B-08, C2-3, acceptance 11)

- F04-C11a (storage): tech note §11.2 กำหนดชัดว่า field ที่มีพิกัดทั้งหมด (`main.anchor/reanchor/lastGrid`, `scratch.*`, `lock.anchor`) ต้องถูกลบก่อน persist ครั้งถัดไปหลัง `dungeon_exited` — case (รอ P2-F04-T25 storage adapter): `JSON.stringify(toPersisted(...))` หลังจบ run ต้องไม่มี key `lat`/`lng` และไม่มีตัวเลขทศนิยม ≥ 4 หลักที่อยู่ในช่วงพิกัดไทย (`app.telemetry.export.coordinateLikeNumberGuard` เกณฑ์เดียวกับ telemetry)
- F04-C11b (telemetry): event ทุกตัวใน §12.3 (`dungeon_entered`, `run_state_changed`, `checkin_rejected`, ฯลฯ) ไม่มี property ที่เป็นพิกัดหรือชื่อสถานที่ดิบ — case: export Blob แล้ว grep ว่าไม่มี key ใน `forbiddenPropertyNames` (รอ P2-F04-T25 telemetry sink)
- ทั้งสอง case อยู่ใน scope ของ `qa/tests/F04/` (P2-F04-T22, งานถัดไป) เพราะต้องมี storage/telemetry adapter จริงก่อน — แผนนี้ล็อกเกณฑ์ตรวจไว้ล่วงหน้าเพื่อไม่ให้ตกหล่น

## 6. Origin allowlist (C2-1) — ข้อยกเว้นตามที่ tech-lead ขอ

Case F04-C21 (P2-F04-T22): ตรวจว่า request ที่แอปยิงเองระหว่างเล่น run ครบรอบไปเฉพาะ origin ใน `config/app/client.json` **ยกเว้น** การเปิดแอปแผนที่ภายนอกจากปุ่มนำทาง (tech note §14.1: "การเปิดลิงก์เป็น navigation ระดับบนที่ผู้เล่นเลือก ไม่ใช่ request ของแอป") ซึ่งเป็นการ navigate ทั้งหน้า (`<a target="_blank">` ใน gesture ของผู้เล่น) ไม่ใช่ `fetch`/`XHR` ของแอป — e2e ต้อง whitelist การ navigate นี้แยกจากรายการ origin ปกติ ไม่ใช่เพิ่ม origin ของ Google/Apple Maps เข้า allowlist ของแอป (จะทำให้เกณฑ์ตรวจหลวมเกินจริง)

## 7. รายละเอียด case ที่ทำเสร็จในงานนี้ (id, precondition, steps/trace, expected)

| case id | precondition | steps / trace | expected |
| --- | --- | --- | --- |
| F04-C03a-1 | โหลด `qa-checkin-accuracy-35-01` ผ่าน `classifySamples` กับ `TEST_RECT_POLYGON` | เรียก `checkInBatch(samples, now_ms, params)` ที่ 4 จุดเวลา (30s, 90s, 150s, จบ trace) | `{ ok: false, reason: 'poor_accuracy', readyIn_s: null }` ทุกจุด (accuracy 35 ม. ไม่เคยผ่าน 30 ม.) |
| F04-C03a-2 | โหลด `synthetic-teleport-spoof-01` (location-engineer) | เรียก `checkInBatch` ที่ sample แรกที่ `inside=true` และที่ปลาย trace | จุดแรก: `not_enough_trace` (ยังไม่ครบเวลาต่อเนื่อง) · ปลาย trace: `no_approach_from_outside` (ไม่เคยมี sample นอก polygon ในลำดับหลัง teleport) |
| F04-C03a-3 | โหลด `synthetic-driving-40kmh-01` | เรียก `checkInBatch` ที่ 120s (อยู่กลาง leg cruise) | `{ ok: false, reason: 'speed_lock', readyIn_s: null }` (R08 ลำดับ 1: lock มาก่อนเหตุผลอื่นเสมอ) |
| F04-C03a-4 (control) | โหลด `synthetic-walk-in-01` | เรียก `checkInBatch` ที่ครึ่งเวลาของ `minContinuousApproach_s` และที่ปลาย trace | ครึ่งเวลา: `not_enough_trace` · ปลาย trace: `{ ok: true }` |
| F04-C01 | โหลด `qa-polygon-overlap-01`, classify กับ `TEST_RECT_POLYGON` และกับ `qa-rect-overlap-b` แยกกัน | เรียก `runTimeline(samples, confirmAt=sample แรกที่ inside, now_ms=จบ trace, params)` ต่อ polygon | ทั้งสองฝั่ง: มี event `run_state_changed active→grace` (ออกไปอยู่อีกฝั่งเดียว) ตามด้วย `..→active, cause: returned` (เดินกลับผ่านช่วงซ้อน) · ไม่มี `dungeon_exited` (ไม่ timeout ภายใน ~11 นาทีของ trace) |
| F04-C08 (opening hours) | fixture `QA_HOURS` (09:00–18:00 ทุกวันยกเว้นพุธปิด, อาทิตย์เปิด 24 ชม., exception date หนึ่งวัน) | เรียก `isOpenAt`/`openingChangeAfter`/`closingSoonAt` ที่ขอบเปิด/ปิด, วันปิดทั้งวัน, วันเปิด 24 ชม., exception date | ปิดที่ 08:59, เปิดที่ 09:00, เปิดที่ 17:59, ปิดที่ 18:00 (ขอบ `[start,end)`) · ปิดทั้งวันพุธ · เปิดตลอดวันอาทิตย์ · exception ทับตารางปกติของวันนั้น · `openingChangeAfter` หาเวลาเปลี่ยนถัดไปถูกทั้งสองทิศ · `closingSoonAt` คืน `null` ถ้าเวลาต่ำกว่าจุดเริ่ม run |

รันแล้วผ่านทั้งหมด: `pnpm exec vitest run qa/tests/traces --reporter=verbose` → **4 test files passed, 30 tests passed** (ดูหัวข้อ 9 สำหรับ log เต็ม)

## 8. Case ที่ยังทำไม่ได้ตอนนี้ (รอ component อื่น) — ไม่ใช่ blocked ของงานนี้ แต่ต้องไม่ตกหล่นใน T22/T11

| case id | รอ | แผนตอนพร้อม |
| --- | --- | --- |
| F04-C02, C09, C10 (popup/flow/นำทาง) | P2-F04-T21 (client UI) | e2e ใน `qa/tests/F04/` ตาม flow ที่อนุมัติแล้ว |
| F04-C06 (แอปถูกปิด 5/16 นาที) | P2-F04-T25 (storage adapter `toPersisted`/`fromPersisted`) | เรียก hook ตาม tech note §17 ตรง ๆ ด้วย state เดิม + `now_ms` ที่ข้ามไป 5 และ 16 นาที |
| F04-C11a/b (storage/telemetry ไม่มีพิกัด) | P2-F04-T25 | grep ผลลัพธ์ `toPersisted`/export Blob ตามเกณฑ์หัวข้อ 5 |
| F04-C15 (accuracy เท่าเกณฑ์ 30 ม. พอดี) | ไม่มี — พิสูจน์แล้วโดย vector `check-in.json` ของเดิม (ค้นด้วย `packages/shared/src/formulas/vectors.test.ts`) ไม่ต้องรอ |
| F04-C18 (ออกแล้ว confirm แห่งเดิมทันที) | P2-F05-T08 (`session`) | เรียก `sessionStep({type:'exit'})` แล้ว `sessionStep({type:'confirm'})` ทันที ต้องกลับไป `not_enough_trace` (approach เพิ่งเริ่มใหม่) |
| F04-C21 (origin allowlist ยกเว้น nav) | P2-F04-T21 | Playwright: ดัก `page.on('request')` ระหว่างเล่น run เต็ม + คลิกปุ่มนำทาง แยกสอง assertion |

## 9. หลักฐานการรัน (`pnpm test`, 2026-09-27)

```
pnpm exec vitest run qa/tests/traces --reporter=verbose
  ✓ qa/tests/traces/build.test.ts           (13 tests)
  ✓ qa/tests/traces/engine-checkin.test.ts  (6 tests)
  ✓ qa/tests/traces/engine-run-state.test.ts (3 tests)
  ✓ qa/tests/traces/engine-opening-hours.test.ts (8 tests)
  Test Files  4 passed (4)
  Tests  30 passed (30)

pnpm exec tsx qa/tests/traces/build.ts --check
  ok  qa-checkin-accuracy-35-01.trace.json
  ok  qa-movement-gap-400m-01.trace.json
  ok  qa-polygon-overlap-01.trace.json
  ok  polygons/qa-rect-overlap-b.geojson

pnpm exec vitest run packages/shared/src/formulas/vectors.test.ts --reporter=verbose
  run-state.json / check-in.json / speed-lock.json / opening-hours.json groups: 87 passed
  (damage.json, tick-reward.json: 20 failed — pre-existing, D-112 zoneLevelFrom clamp not
  yet ported to packages/shared/src/formulas; unrelated to F04/F05, see finding F04-F1 below)

pnpm run typecheck   (root)  → clean, no errors under qa/tests/**
pnpm exec eslint qa/tests/traces --max-warnings=0  → 0 problems
pnpm exec prettier --check qa/tests/traces          → all matched files use Prettier code style
```

Root `pnpm test` ทั้งชุด: **119 test files, 1 failed (packages/shared/src/formulas/vectors.test.ts) · 1988 passed, 20 failed, 2 skipped (2010 tests)** ทุกไฟล์ที่ล้มอยู่นอก `writes` ของงานนี้ (ดูหัวข้อ 10)

## 10. Findings (handoff — ไม่ใช่ของ `qa/bugs.md` งานนี้ เพราะ `qa/bugs.md` ไม่อยู่ใน `writes` ของ P2-F04-T19)

- **F04-F1 (ควรเป็น BUG-P2-xxx ในงานที่ถือ `qa/bugs.md`, severity medium):** root `pnpm test` แดงที่ `packages/shared/src/formulas/vectors.test.ts` 20 case (`damage.json` `fn=zoneLevel` 10 case, `tick-reward.json` `fn=soloTickExp` 10 case) — `combat.zoneLevelFrom` ยังคืนค่าเดิมที่ไม่ clamp เลเวลผู้เล่นเข้าช่วงโซนตาม D-112 (เช่น level 30 ใน PN-2 1–35 คาดว่า Z=30 แต่ได้ Z=18) ไม่เกี่ยวกับ F04/F05 โดยตรงแต่กระทบ F05-R11 (สูตร exp ใช้ `combat.zoneLevelFrom`) และทำให้ regression รวมไม่เขียว handoff: backend-programmer (พอร์ตสูตร, D-112 "backend X10") + systems-designer (เจ้าของ vector, "systems X09")
- **F04-F2 (known flake, ให้ tech-lead/gameplay-programmer ติดตามต่อ ไม่ใช่ของงานนี้):** ตามที่ context บรีฟระบุ `apps/client/e2e/map-shell.spec.ts` บน `ios-safari` flake ~40% (MapLibre worker `blob:` URL host เป็น `''`) — ไม่ใช่ของ F04/F05 โดยตรง (เป็น infra ของแผนที่) แต่จะกระทบ e2e ของ P2-F04-T22 ถ้าใช้ `webkit` project เดียวกัน ระบุไว้ให้ P2-F04-T22 เผื่อ retry/skip เฉพาะ project นี้ถ้ายังไม่ปิด
- **ข้อเสนอเล็กน้อยถึง location-engineer (ไม่ blocking):** `tools/traces/src/builder.ts` `TraceHeader`/`TraceBuilder.build()` hardcode `meta.kind: 'synthetic'` เสมอ ทำให้ `qa/tests/traces/lib/qa-builder.ts` ต้อง post-process เป็น `'qa'` เอง (`asQaTrace`) แทนที่จะส่ง `kind` เป็นพารามิเตอร์ได้ตรง ๆ — ถ้าสะดวก เพิ่ม `kind` เป็น field ของ `TraceHeader` (default `'synthetic'`) จะลดโค้ด wrapper นี้ลงได้ ไม่กระทบ contract เดิม (ทุก call site ปัจจุบันไม่ส่ง `kind` จึงยังได้ `'synthetic'` เหมือนเดิม)

## 11. Human / out-of-scope

ไม่มี case ในแผนนี้ที่ต้องเดินจริง (field) โดยตรง — ผลเครื่องจริงของ `bench-jitter`/`table-still` อยู่ใน P2-C03 (ของ F05 test plan) เพราะเป็นเรื่อง movement gate ไม่ใช่ run state · คำถาม playtest ของ spec F04 (สัดส่วนคนเจอ `no_approach_from_outside` ครั้งแรก, จักรยานโดน lock) ส่งต่อให้ product-manager ตาม spec หัวข้อ 10 (P2-F06-T27/T19) ไม่ใช่ของ QA โดยตรง

out-of-scope ตามสเปค F04 หัวข้อ 6 (party, server, offline evidence, raid, ตลาด, `entry_exit`) — ไม่ต้องมี case ในแผนนี้
