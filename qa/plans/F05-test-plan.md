# F05 — Movement Gate, Reward Tick และ Drop: Test Plan

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F04-T19 · เจ้าของ: qa-tester · วันที่ 2026-09-27 |
| อ้างอิง spec | `design/features/F05-movement-gate-reward.md` (R01–R28, edge case G1–G16, acceptance 1–12) |
| อ้างอิง tech note | `docs/tech/F05-movement-gate-reward.md` §2 (นาฬิกา rewardWindow), §3 (ระยะที่นับ, chain/grid), §4 (เวลาตัดสินหน้าต่าง), §5 (สิ่งที่ tick ให้), §6 (จบ run/partial tick, D-059), §9 (failure modes), §10 (vector/test hooks) |
| อ้างอิง decision | D-059, D-078, D-094, D-102 (ค่า) |
| Exit checklist ที่ผูก | E3 (วางนิ่ง 0 tick), E4 (ม้านั่ง jitter ยังได้ tick), E5 (ตรง golden vector) |
| คู่กับ | `qa/plans/F04-test-plan.md` (run state ที่กำหนดว่านาฬิกา rewardWindow เดินหรือหยุด) |

## 0. สถานะโค้ดที่ทดสอบได้จริง

`packages/shared/src/reward/*` (gate accumulator, `gateWindows`, `partialTick`) และ `packages/shared/src/session/*` — **IN_PROGRESS** (P2-F05-T08, "resume: หยุดกลางทางเพราะ usage limit") งานนี้จึงตั้งใจ **ไม่ผูก** case อัตโนมัติกับ `packages/shared/src/reward/gate.ts` โดยตรง (ไฟล์กำลังถูกแก้พร้อมกันในเวฟเดียวกัน เสี่ยง flaky ถ้าอ้างรูปภายในที่ยังไม่นิ่ง) แทนที่ด้วย 2 ทาง:

1. **Vector ของ systems-designer** (`design/systems/test-vectors/movement-gate.json`, `reward-window.json`, `partial-tick.json`, `tick-reward.json`, `run-loop.json`) ผ่าน `packages/shared/src/formulas/vectors.test.ts` — ค้นแบบ dynamic ตาม P2-F05-T02 อยู่แล้ว ครอบทุกฟังก์ชัน pure ของ `src/reward` (`tauAt`, `gateAccumulatorStep`, `partialTick`, `rollTickLoot` ฯลฯ) เมื่อไฟล์นิ่งแล้ว
2. **เครื่องคำนวณอ้างอิงของ QA** (`tools/traces/src/metrics.ts` `gateWindows`/`traceStats`, location-engineer ระบุไว้ตรง ๆ ว่า "เป็นค่าคาดหวังสำหรับ QA ... ไม่ใช่ตัว gate เอง", `data/gps-traces/README.md` §5) — ใช้พิสูจน์ระดับ "รูปร่างของ trace ให้ผลตามสัญชาตญาณของ GDD" (นิ่ง 0 หน้าต่างผ่าน, jitter บนม้านั่งยังผ่าน, ช่องว่างคร่อมระยะไม่ถูกนับ) โดยไม่ต้อง import โมดูลที่ยังไม่นิ่ง

ตาราง trace → ตัวเลขจริง (README §6/§8) เป็นของ location-engineer อยู่แล้ว งานนี้อ้างอิงไม่สร้างซ้ำ

เมื่อ `packages/shared/src/reward` และ `src/session` เสร็จ (P2-F05-T08 DONE) งาน P2-F05-T11 (black-box F05, qa-tester เช่นกัน) จะต่อยอดแผนนี้เป็น trace-replay ผ่าน Mock/`sessionStep` จริง — ตารางหัวข้อ 6 ระบุ case ที่รอไว้แล้ว

## 1. ค่า config ที่ทุก case อ้างอิง (D-102, อ่านสดจาก config — เหมือน F04 test plan หัวข้อ 1)

| key | ค่า | ใช้ใน |
| --- | --- | --- |
| `dungeons.movementGate.window_s` / `minDistancePerWindow_m` / `comparison` | 300 / 50 / `greaterThan` | R01, R04, R08, G1 |
| `dungeons.movementGate.sampleCadence_s` | 5 | grid resample (ADR 0003 5.3) |
| `dungeons.movementGate.maxSamplePairGap_s` | 30 | R05(3), G2, G8 |
| `dungeons.movementGate.maxSampleAccuracy_m` | 30 | R05(4) |
| `anticheat.speedLock.speedLock_kmh` | 25 | R05(5), G7 |
| `dungeons.rewardTick.rewardTickInterval_s` | 300 (= `window_s`, config lint ตรวจ) | R04 |
| `dungeons.emergencyClose.partialTickMinElapsed_s` | (อ่านจาก config) | R22, G9/G10 |
| `dungeons.hpSafety.*`, `dungeons.death.loseAllRunLoot` | (F06) | R18, R21 |

## 2. คลัง trace ที่ใช้

### 2.1 ของ location-engineer (อ่านอย่างเดียว)

| ไฟล์ | ใช้พิสูจน์อะไรใน F05 |
| --- | --- |
| `synthetic-table-still-01` | E3 "มือถือวางนิ่งให้ 0 tick" — ทุกหน้าต่างไม่ผ่าน (README §6 ยืนยันแล้วว่า max 3.3 ม./หน้าต่าง) |
| `synthetic-bench-jitter-01` | E4 "นั่งม้านั่งมี jitter ยังได้ tick" — ทุกหน้าต่างผ่าน (README §6: 53.4–56.5 ม., ขอบแคบ — finding F-16 ของ location-engineer) |
| `synthetic-boundary-50m-01` | G1 "ระยะเท่าเกณฑ์พอดีไม่ผ่าน" แบบ deterministic (grid burst เท่าเกณฑ์ vs เกิน 0.01–0.02 ม.) |
| `synthetic-park-loop-01` | acceptance 12 "run ยาวไม่มีตัวลด" ตัวอย่าง 30 นาที ผ่านทุกหน้าต่าง |
| `synthetic-edge-walk-01` | G3/G4 "ออกนอกเขตกลางหน้าต่าง"/"เลียบขอบไม่ยืนยันออก" ระยะนอกไม่นับ — ใช้ร่วมกับ F04 |
| `synthetic-driving-40kmh-01` | G7 "speed lock กลางหน้าต่าง" นาฬิกาหยุด ระยะระหว่าง lock ไม่นับ |
| `synthetic-soi-occluded-01` | ตัวกรอง accuracy/gap ตาม acceptance 4 |

### 2.2 ของ qa-tester (สร้างใหม่ เหตุผลไม่ซ้ำ)

| ไฟล์ | ใช้พิสูจน์อะไร |
| --- | --- |
| `qa-movement-gap-400m-01` | G2 ตรงตัวอักษร (20 นาที + gap 5 นาทีคร่อม 400 ม. + 5 นาที) — ของเดิมไม่มีไฟล์ที่ตรงตัวเลขนี้ (`soi-occluded` มี gap แค่ 15–25 วิ, `qa-gps-gap-2min` ของ F02 มี gap 2 นาทีแต่ไม่ได้ออกแบบให้คร่อม 400 ม. ที่ 20 นาทีเข้า) |

ไม่ต้องสร้าง trace ใหม่สำหรับ E3/E4/G1/G3/G4/G7/acceptance 12 — ของเดิมครบแล้ว งานนี้แค่ต่อ "เครื่องคำนวณอ้างอิงของ QA" (`tools/traces/src/metrics.ts`) เข้ากับไฟล์เดิมให้เป็น assertion อัตโนมัติแทนการอ่านตาราง README เฉย ๆ (ดูหัวข้อ 6)

## 3. Traceability: spec F05 acceptance 1–12 → case

| # | ข้อความ acceptance (ย่อ) | case id | ระดับ | หลักฐาน |
| --- | --- | --- | --- | --- |
| 1 | ระยะเกินเกณฑ์ได้ tick · เท่าเกณฑ์ไม่ได้ · อ่านจาก `dungeons.movementGate` | F05-C01 | Vector (ของเดิม) + trace อ้างอิง | `design/systems/test-vectors/movement-gate.json`/`reward-window.json` ผ่าน `vectors.test.ts` · `synthetic-boundary-50m-01` (G1) |
| 2 | tick แรกครบ `window_s` จาก confirm · Grace 2 นาทีเลื่อน tick ออกไป 2 นาที ระยะช่วง Grace ไม่นับ | F05-C02 | Vector | `design/systems/test-vectors/reward-window.json` ("Grace 2 นาทีเลื่อน tick") |
| 3 | vector G2 (gap 400 ม.) ให้ผลตรงทั้ง engine และ trace ของ QA | F05-C03 | Vector + QA reference calculator | vector `movement-gate.json`/`run-loop.json` G2 (ของ systems) + `qa/tests/traces/engine-movement-gate.test.ts` (trace `qa-movement-gap-400m-01`, ดูหัวข้อ 6) |
| 4 | คู่ห่างเกิน `maxSamplePairGap_s` หรือ accuracy แย่กว่าเกณฑ์ไม่เพิ่มระยะ · ผลไม่ขึ้นกับความถี่ sample | F05-C04 | Vector (ของเดิม, TL B-03) | `design/systems/test-vectors/movement-gate.json` (1 Hz vs 0.2 Hz ให้ grid เดียวกัน — อ้างจาก `_sampleCadence_source` ของ `dungeons.json`) |
| 5 | HUD diagnostic คนละหน้าต่างกับ tick จริง · เปลี่ยน `gateDiagnosticWindows` ไม่กระทบผล tick | F05-C05 | Unit (รอ P2-F04-T25 HUD) | case ของ P2-F05-T11: เปลี่ยน `app.client.hudMeasurement.gateWindowStep_s` แล้วยืนยัน events ของ `sessionStep` เท่าเดิม (ตามที่ tech note §10 ระบุไว้ตรง ๆ) |
| 6 | tick ผ่านให้ exp/drop ตาม config · ไม่ผ่านไม่ให้อะไรไม่กระทบ HP/run state · seed เดียวกันผลเดิมทุกครั้ง | F05-C06 | Vector | `design/systems/test-vectors/tick-reward.json`, `drops.json` (RNG deterministic ตาม seed, ADR 0003 6.3) |
| 7 | ยามาจาก drop ของ tick ที่ผ่าน gate เท่านั้น · ไม่มี code path ของ onboarding ที่ให้ของ | F05-C07 | Vector + code search | vector `drops.json` (ยาอยู่ใน drop table ทุก preset) + grep โค้ด: ค้นทุกที่ที่เขียน `run.bag`/`player.inventory` ต้องมาจาก `rollTickLoot` เท่านั้น (รอ `src/reward` นิ่ง, P2-F05-T16 เป็นคนยืนยันสุดท้าย) |
| 8 | ตาราง R21 ตรงทุก exit_reason · ตายของหาย exp อยู่ · auto-retreat เก็บครบ | F05-C08 | Vector | `design/systems/test-vectors/run-loop.json` (ตารางจ่ายต่อ `exitReason`) |
| 9 | D-059 vector 59/60 วิ · tick บางส่วนที่ผ่านทำให้ run เป็น run ที่นับ | F05-C09 | Vector | `design/systems/test-vectors/partial-tick.json` (G9/G10) |
| 10 | R-B1 vector ขอบ (HP สูงลงลบ→1 แล้วถอน, มียาใช้ก่อน, ปิด auto-retreat→ตาย) | F05-C10 | Vector (F06) | `design/systems/test-vectors/damage.json` — **อยู่ใน scope ของ F06 test plan** ไม่ใช่ของแผนนี้ (spec F05 เองระบุว่าค่า damage/ยาเป็นของ F06) อ้างไว้เพื่อไม่ให้ตกหล่นข้าม feature |
| 11 | หน้าสรุปแสดงเหตุจบถูกทุกเหตุ · storage หลัง run จบไม่มีพิกัด | F05-C11 | UI (รอ P2-F04-T21) + storage (รอ P2-F04-T25) | เหมือน F04-C11a — เกณฑ์เดียวกัน (storage adapter ใช้ร่วมกันทั้ง F04/F05) |
| 12 | run 3 ชั่วโมงได้ tick เท่าจำนวนหน้าต่างที่ผ่าน ไม่มีตัวลด | F05-C12 | trace อ้างอิง + reference calculator | `synthetic-park-loop-01` (30 นาทีเป็นตัวอย่างสั้น) + case ของ P2-F05-T11 "run ยาว 3 ชั่วโมงจาก trace สังเคราะห์ที่ ×60" (tech note §10) — เป็น trace ที่ต้องสร้างตอน session พร้อม ไม่ใช่ของ T19 |

## 4. Traceability: edge case G1–G16 (spec หัวข้อ 5)

| edge | case id | หลักฐาน |
| --- | --- | --- |
| G1 ระยะเท่าเกณฑ์พอดี | F05-C01 | `synthetic-boundary-50m-01` (deterministic grid burst) |
| G2 gap 400 ม. | F05-C03 | `qa-movement-gap-400m-01` (หัวข้อ 6) |
| G3 ออกนอกเขต 2 นาทีกลางหน้าต่าง | F05-C13 | `synthetic-edge-walk-01` ผ่าน vector `run-state.json` `runTimeline` (ระยะนอกไม่นับ หน้าต่างเดินต่อด้วยระยะที่นับไว้ก่อนออก) |
| G4 เลียบขอบไม่ยืนยันออก | F05-C13 | เหมือน G3 (ไฟล์เดียวกัน) |
| G5 นั่งม้านั่ง/ยืนคุยโทรศัพท์ | F05-C14 | `synthetic-bench-jitter-01` (E4) — ผลจริงเครื่องวัดอยู่ใน P2-C03 (ของสนาม ไม่ใช่ของ T19) |
| G6 accuracy แย่ทั้งหน้าต่าง | F05-C15 | `synthetic-soi-occluded-01` ช่วง accuracy แย่ต่อเนื่อง — ไม่มีระยะ → denied แบบไม่ลงโทษ |
| G7 speed lock ระหว่างหน้าต่าง | F05-C16 | `synthetic-driving-40kmh-01` |
| G8 แอปถูกปิดที่ 4:59 ของหน้าต่าง | F05-C17 | vector `reward-window.json`/`run-state.json` (หน้าต่างค้างที่เวลา sample ที่ใช้ได้ตัวสุดท้าย) — เหมือน F04-C06 |
| G9/G10 ปิดตอนหน้าต่างค้าง 3 นาที/59 วิ | F05-C09 | เหมือนข้อ 9 |
| G11/G12 ตายขณะ auto-retreat / auto-retreat ตรง tick | F05-C10 | ของ F06 (R-B1) |
| G13 เลเวลขึ้นกลาง run | F05-C18 | vector `tick-reward.json` (เลเวลใหม่ใช้กับ tick ถัดไป) |
| G14 run ยาว/run ที่สามของวัน | F05-C12 | เหมือนข้อ 12 |
| G15 นาฬิกาเครื่องถูกตั้งย้อน | F05-C19 | เหมือน F04-C17 (`clockCheck` vector) |
| G16 tick แรกไม่ผ่าน | F05-C20 | vector `tick-reward.json`/flow onboarding — ยืนยันว่าไม่มีทางลัด (R15) |

## 5. รายละเอียด case ที่ทำเสร็จในงานนี้ (id, precondition, steps/trace, expected)

| case id | precondition | steps / trace | expected |
| --- | --- | --- | --- |
| F05-C-E3 | โหลด `synthetic-table-still-01` | `gateWindows(samples, {window_s:300, minDistance_m:50, comparison:'greaterThan'})` (ค่าจาก config, `tools/traces/src/metrics.ts`) | ทุกหน้าต่าง `pass:false` (เกณฑ์ไม่ผ่านสักหน้าต่าง — 0 tick) |
| F05-C-E4 | โหลด `synthetic-bench-jitter-01` | เหมือนข้างบน | ทุกหน้าต่าง `pass:true` |
| F05-C03-1 | สร้าง `qa-movement-gap-400m-01` (script), หา gap จริงจาก trace (`cur.t-prev.t>30000`) | `gateWindows` แล้วกรองหน้าต่างที่อยู่ **ในกรอบเวลาของ gap ล้วน** | หน้าต่างนั้น `distance_m === 0` และ `pass:false` เป๊ะ (ไม่ใช่แค่ต่ำกว่าเกณฑ์) |
| F05-C03-2 | เหมือนบน | กรองหน้าต่างที่จบก่อน gap เริ่ม | ทุกหน้าต่างนั้น `pass:true` (เดิน 20 นาทีผ่าน gate ปกติ) |
| F05-C03-3 | เหมือนบน | ดูหน้าต่าง 6 ตัวสุดท้าย (คาบเกี่ยว gap ท้าย + เดินหลัง gap) | ระยะไต่ขึ้นต่อเนื่อง (ไม่กระโดด) และหน้าต่างสุดท้ายผ่าน — พิสูจน์ว่าเครดิตมาจากที่เดินจริงหลัง gap ไม่ใช่ระยะ 400 ม. ที่ถูกรับคืน |

รันแล้วผ่านทั้งหมด: `pnpm exec vitest run qa/tests/traces/engine-movement-gate.test.ts` → **1 test file, 6 tests passed**

## 6. Case ที่ยังทำไม่ได้ตอนนี้ (รอ component อื่น)

| case id | รอ | แผนตอนพร้อม |
| --- | --- | --- |
| F05-C05 (HUD diagnostic แยกจาก tick) | P2-F04-T25 (HUD), P2-F05-T08 (`session`) | เปลี่ยน `gateWindowStep_s` แล้ว diff events ของ `sessionStep` |
| F05-C07 (โค้ด search: ไม่มีทางให้ของนอก reward engine) | P2-F05-T08 (`src/reward`, `src/session` นิ่ง) | `grep -rn "\.bag\s*="` และ `"inventory\s*="` ใน `packages/shared/src/{reward,session}` ต้องมาจาก `rollTickLoot`/`session` เท่านั้น |
| F05-C11 (สรุป run + storage) | P2-F04-T21 (UI), P2-F04-T25 (storage) | เหมือน F04-C11a/b |
| F05-C12 (run 3 ชม. ×60) | P2-F05-T08 (`session`), P2-F04-T25 (game clock ×60) | trace สังเคราะห์ยาว (ของ location-engineer หรือ QA แล้วแต่ scope ตอนนั้น) เล่นผ่าน Mock ×60 |
| F05-C10 / G11 / G12 (R-B1) | F06 engine (`src/hp`, P2-F06-T06) | อยู่ใน `qa/plans/F06-test-plan.md` (งานถัดไปของ F06) ไม่ใช่ของแผนนี้ |

## 7. หลักฐานการรัน (`pnpm test`, 2026-09-27)

```
pnpm exec vitest run qa/tests/traces --reporter=verbose
  Test Files  5 passed (5)
  Tests  36 passed (36)
  (build.test.ts 13, engine-checkin.test.ts 6, engine-run-state.test.ts 3,
   engine-opening-hours.test.ts 8, engine-movement-gate.test.ts 6)

pnpm exec vitest run packages/shared/src/formulas/vectors.test.ts --reporter=verbose
  movement-gate.json / reward-window.json / partial-tick.json / tick-reward.json / run-loop.json /
  drops.json groups: passing except the 10 tick-reward.json `soloTickExp` cases affected by the
  same pre-existing D-112 zoneLevelFrom gap noted in F04-F1 below (unrelated to the gate/reward
  logic itself: the exp *amount* differs, the gate/tick/drop decision logic all passes)

root pnpm test: 119 test files, 1 failed · 1988 passed, 20 failed, 2 skipped (2010 tests)
  — same 20 pre-existing failures as F04-F1, none in qa/tests/traces
```

## 8. Findings (handoff — ไม่ใช่ของ `qa/bugs.md` งานนี้ เพราะ `qa/bugs.md` ไม่อยู่ใน `writes` ของ P2-F04-T19)

- เหมือน F04-F1 (D-112 `zoneLevelFrom`) — กระทบ F05-R11 (สูตร exp ต่อ tick ใช้ `combat.zoneLevelFrom`) โดยตรง ไม่ใช่แค่ F06 handoff เดียวกับที่ระบุใน `qa/plans/F04-test-plan.md` หัวข้อ 10
- ไม่มี finding ใหม่เฉพาะ F05 นอกเหนือจากนี้ — ตัวกรอง/หน้าต่าง/partial tick/drop ที่ตรวจได้ในระดับ vector (ของเดิม) และ reference calculator (ของงานนี้) ผ่านครบ

## 9. Human / out-of-scope

ผลจริงเครื่องวัดของ `bench-jitter`/`table-still` (G5, E4) รออยู่ที่ P2-C03 (ทดสอบสนาม, "ห้ามแตะเกณฑ์ 50 ม., cadence ไม่ต่ำกว่า 5 วิ" ตาม D-113 F-16) — ไม่ใช่ของ T19 · out-of-scope ตามสเปค F05 หัวข้อ 6 (server validate ย้อนหลัง, offline evidence, party, trust score, raid, gold/ร้าน NPC) ไม่ต้องมี case ในแผนนี้
