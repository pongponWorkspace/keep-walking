# QA gate — F04 (Dungeon Presence และ Run State) + F05 (Movement Gate, Reward Tick และ Drop)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F05-T16 (review-gate) · เจ้าของ: qa-tester |
| วันที่ | 2026-09-27 |
| ฐานที่ตรวจ | working tree หลัก ที่คอมมิต `b8dc5fc` (HEAD) บวกงานที่ยังไม่ commit ของ P2-F06-T09/T10 (gameplay-programmer, `apps/client/**`) ซึ่งกำลังแก้ขนานอยู่ — ดูหัวข้อ 9 สำหรับผลกระทบที่พบและวิธีแยกออกจาก scope ของงานนี้ |
| ขอบเขต | acceptance ทั้งหมดของ `design/features/F04-dungeon-presence.md` และ `design/features/F05-movement-gate-reward.md` · Phase Exit Checklist E1–E5 และส่วน F04/F05 ของ E16 (`studio/phases/phase-2/board.md` บรรทัด ~1033) · mock coverage ของ E11 (เฉพาะ F04/F05) · storage หลัง run จบไม่มีพิกัด (GD B-08) |
| **verdict F04** | **PASS** |
| **verdict F05** | **PASS** |
| **verdict รวม** | **PASS** |

## 0. สรุปหนึ่งย่อหนา

Tech gate และ copy gate ทั้งคู่ผ่านรอบ 2 แล้ว (`docs/reviews/F04-F05-tech-gate.md` หัวข้อ 9, `design/reviews/F04-F05-copy-gate.md` รอบ 2) โดยไม่มีเงื่อนไขบล็อกที่เหลือฝั่งโค้ด — เงื่อนไขเดียวที่ค้างคือ P2-H30 (คน) ต้องพลิก `it.fails` → `it` ที่ `qa/tests/F04/session-checkin-lifecycle.test.ts:44` ซึ่ง **ไม่ใช่เหตุ NEEDS_CHANGES** ตาม brief ของงานนี้ (การแก้ backend พิสูจน์แล้วว่าถูกต้อง — ข้อความ error คือ "Expect test to fail" แปลว่า assertion ที่ถูกต้องผ่านแล้ว) งานนี้ยืนยันอิสระด้วยการรันจริงทุกชุด (`pnpm test`, `pnpm build`, e2e เต็มสองโปรเจกต์) ไม่ใช่แค่การอ่านรายงานเดิม พบและปิดของสองอย่างระหว่างทาง: BUG-P2-005 (Thai literal ในไฟล์ test ของ dev) ยืนยันว่าปิดแล้วจริง และ `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts`'s case ที่สาม ซึ่งเป็นไฟล์ทดสอบของ QA เอง ค้างจากงานสร้างก่อนหน้าและพังเพราะ `no_class` guard ที่เพิ่งเข้ามาใน `reducer.ts` — แก้เองแล้ว (ไม่ใช่ product bug) เพิ่มเติมงานตาม brief ครบ 3 ข้อ: e2e ตรวจ raw copy key/`{variable}` บน S-02/S-03/nav panel, e2e ตรวจ 4 test hook เฉื่อยภายใต้ `loc=web` (D-130), และแก้ `f04-origin-allowlist.spec.ts` ให้ resolve config จริงตาม D-133 พร้อมรองรับทั้งสองรูปของค่า

## 1. หลักฐานที่รันจริง (คำสั่ง + ผล)

| คำสั่ง | ผล |
| --- | --- |
| `pnpm test` (root, vitest) | **exit 1** (คาดไว้แล้ว) — `Test Files 1 failed / 181 passed (182)` · `Tests 1 failed / 2687 passed / 2 skipped (2690)` · ข้อที่ล้มข้อเดียวคือ `qa/tests/F04/session-checkin-lifecycle.test.ts:44` ด้วย `Error: Expect test to fail` (P2-H30 ค้าง ไม่ใช่ NEEDS_CHANGES) |
| `pnpm build` (root) | exit 0 — apps/client build สำเร็จ, artifact ปกติ (bundle warning เดิม ไม่ใช่ blocking) |
| `pnpm run typecheck` (root) | tsc ของ root/packages/geo/packages/shared/tools/copy-lint: ผ่านหมด · `apps/client` เองแดง 9 error ทั้งหมดอยู่ใน `src/dungeons/home-tracker.test.ts`/`src/copy/districts.ts` ซึ่งเป็นไฟล์ untracked ของงานขนาน P2-F06-T09/T10 (gameplay-programmer) ไม่ใช่ของ F04/F05 และไม่อยู่ใน `writes` ของงานนี้ — ดูหัวข้อ 9 |
| `pnpm run lint` (root) | ESLint 0 error (ทั้ง repo รวมไฟล์ใหม่ของงานนี้) · prettier แดง 8 ไฟล์ ทั้งหมดอยู่ใน `apps/client/**` (งานขนานเดียวกันข้างบน) — ไฟล์ของ `qa/tests/e2e/` ที่งานนี้แก้/สร้างผ่าน prettier สะอาด |
| `qa/tests/F02/privacy-copy.test.ts` (BUG-P2-005 re-check) | **233/233 passed** (เดิมแดง 3/161 ไฟล์) → ปิด BUG-P2-005 จริง (ดูหัวข้อ 8) |
| `qa/tests/F04/session-persist-privacy.test.ts` + `qa/tests/F05/run-summary-and-storage-privacy.test.ts` (storage B-08) | 6/6 passed (ดูหัวข้อ 6) |
| e2e `apps/client/e2e/**` + `qa/tests/e2e/**`, `--project=android-chrome --project=ios-safari --workers=2` | **72/72 passed** (36 เคส × 2 โปรเจกต์) รวมสามไฟล์ที่งานนี้แก้/สร้างใหม่ (ดูหัวข้อ 7) |

รายละเอียดเพิ่มเติมของแต่ละคำสั่งอยู่ในหัวข้อ 6–9

## 2. Phase Exit Checklist E1–E5 และส่วน F04/F05 ของ E16 (`studio/phases/phase-2/board.md` ~บรรทัด 1033)

| # | เกณฑ์ | หลักฐาน | สถานะ |
| --- | --- | --- | --- |
| E1 | GPS trace ครบทุก transition รวมเดินเลียบขอบและ GPS drift | `data/gps-traces/synthetic/synthetic-edge-walk-01`, `synthetic-drift-spike-01` ผ่าน `design/systems/test-vectors/run-state.json` `edgeHysteresis` (8 vector) + `runTimeline` ใน `qa/tests/traces/engine-run-state.test.ts` (ผ่านใน `pnpm test`) · `qa/plans/F04-test-plan.md` หัวข้อ 3 แถว 5, หัวข้อ 4 แถว E1/E2 | ผ่าน |
| E2 | dungeon ที่ปิดเข้าไม่ได้ | `qa/tests/e2e/f04-closed-dungeon.spec.ts` 2 เคส (safety property "ไม่มีปุ่มเข้าที่ใช้ได้เลย" + popup ปิด B4) เขียวทั้ง android-chrome/ios-safari (หัวข้อ 7) | ผ่าน |
| E3 | trace "มือถือวางนิ่ง" ได้ 0 tick | `qa/tests/traces/engine-movement-gate.test.ts` describe "E3 — synthetic-table-still-01": ทุกหน้าต่าง 5 นาที `pass:false` (0 tick) — ผ่านใน `pnpm test` | ผ่าน |
| E4 | trace "นั่งม้านั่งมี jitter" ยังได้ tick | ไฟล์เดียวกัน describe "E4 — synthetic-bench-jitter-01": ทุกหน้าต่าง `pass:true` — ผ่านใน `pnpm test` · ผลเครื่องจริง (P2-C03) เป็นหลักฐานเสริมฝั่ง HUMAN ตามที่ระบุไว้ในบอร์ดเดิม | ผ่าน (ฝั่งโค้ด) |
| E5 | ผลตรง golden test vectors | `packages/shared/src/formulas/vectors.test.ts` ค้นไฟล์ `design/systems/test-vectors/*.json` แบบ dynamic — รันเป็นส่วนหนึ่งของ `pnpm test` (2687 ผ่าน) ไม่มี vector case ใดแดง (ต่างจากรายงานเก่าใน `qa/plans/F0{4,5}-test-plan.md` หัวข้อ 9/7 ที่เคยมี 20 case แดงจาก D-112 `zoneLevelFrom` — ยืนยันว่าปิดแล้ว ไม่เหลือร่องรอยในรันปัจจุบัน) | ผ่าน |
| E16 (ส่วน F04) | speed lock ล็อกการเล่นจริง · check-in ปฏิเสธ teleport และ accuracy แย่ | `qa/tests/traces/engine-checkin.test.ts` (`speed_lock` ระหว่างขับ `synthetic-driving-40kmh-01`), `qa/tests/F04/session-checkin-lifecycle.test.ts` (teleport → `no_approach_from_outside` ผ่าน `sessionStep` สาธารณะ, accuracy 35 ม. → `poor_accuracy` ทุกจังหวะ), `design/systems/test-vectors/speed-lock.json`, `check-in.json` — ทั้งหมดผ่านใน `pnpm test` | ผ่าน |
| E16 (ส่วน F05) | ระยะคร่อมช่องว่างของ sample ไม่ได้รางวัล · รางวัลก้อนแรกของ onboarding เป็น tick ปกติ · ยามาจาก drop ที่ผ่าน gate เท่านั้น | `qa/tests/traces/engine-movement-gate.test.ts` (`qa-movement-gap-400m-01`: หน้าต่างที่คร่อม gap ได้ระยะ 0 เป๊ะ) · `packages/shared/src/session/reducer.ts#grantTick` (`firstEver = player.lifetimeTicksGranted === 0` คำนวณในฟังก์ชันเดียวกับ tick ปกติ ไม่มี code path แยก, บรรทัด ~240) · `run.bag` ถูกเติมที่จุดเดียวคือ `bagAdd` ใน `grantTick` (บรรทัด 229) — grep ยืนยันไม่มีจุดอื่นเขียน `bag`/`inventory` ใน `packages/shared/src/session/reducer.ts` นอกจุดนี้และการโอนเข้า `player.inventory` ตอนจบ run (`keepsLoot`) | ผ่าน |

## 3. E11 — MockLocationProvider ใช้ได้เต็มสำหรับ F04/F05 (trace เลือกได้ + เร่งได้)

- trace เลือกได้ผ่าน `?trace=<id>` (ตรวจใน `apps/client/e2e/location-mock.spec.ts`, `full-run.spec.ts`, ทุกไฟล์ของ `qa/tests/e2e/f04-*`) · ความเร็วเลือกได้ตาม `config/app/client.json#providerQuery.allowedMockSpeeds = [1, 10, 60]` ใช้จริงในเทสต์ที่ speed=1 (nav panel), 10 (checkin/copy-leak), 60 (full-run) · `loop` เปิด/ปิดได้ (`loop=0` ใช้ในหลายเคส)
- ครอบทั้ง loop F04→F05 ในเทสต์เดียว: `apps/client/e2e/full-run.spec.ts` (confirm → Active → tick toast → manual exit → summary ตรง golden tick count) และ `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` (confirm → Active → Grace → Active คืน) — ทั้งคู่เขียวสองโปรเจกต์

## 4. Traceability — F04 acceptance 1–13 (`design/features/F04-dungeon-presence.md` หัวข้อ 7)

อ้างอิงจาก `qa/plans/F04-test-plan.md` (P2-F04-T19, ยังไม่ต้องเขียนใหม่ เพราะไม่อยู่ใน `writes` ของงานนี้) บวกการยืนยันซ้ำของงานนี้ว่า case ที่เดิม "รอ component" ตอนเขียนแผน (session/storage/UI ยังไม่เสร็จ) ตอนนี้ปิดแล้วจริง

| # | acceptance (ย่อ) | หลักฐานที่ยืนยันซ้ำในงานนี้ |
| --- | --- | --- |
| 1 | run ได้ครั้งละหนึ่ง · polygon ซ้อนไม่กระทบ run ที่เลือก | `qa/tests/traces/engine-run-state.test.ts` (`qa-polygon-overlap-01` ต่อสอง polygon) — ผ่าน |
| 2 | ต้องกด "เข้า" เสมอ · popup ไม่มีจำนวนคน/role | `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` (คลิกปุ่ม "เข้า" จริงเท่านั้นที่ทำให้ `.run-bar` ปรากฏ) + copy-leak spec ใหม่ยืนยัน popup ไม่มี key/ตัวแปรดิบ (ไม่มีบรรทัดจำนวนคนอยู่แล้วตาม override, ตรวจด้วยตาที่ DOM snapshot) — ผ่าน |
| 3 | teleport/accuracy 35 ม. ถูกปฏิเสธ reason ถูก · เดินเข้าจริงครบเวลาผ่าน · ปุ่มแสดงสถานะรอ | `qa/tests/F04/session-checkin-lifecycle.test.ts` (F04-C03a ผ่าน `sessionStep` สาธารณะ) + `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` (`not_enough_trace`/`poor_accuracy` ขึ้นจริงบนจอ, ปุ่มปลดเองเมื่อพร้อม) — ผ่าน |
| 4 | Grace 2:59→Active, 3:01→Suspended, 14:59→Active, 15:01→`timeout` | `design/systems/test-vectors/run-state.json` `runTimeline` ที่ now_ms ตรงวินาที (ผ่านใน `vectors.test.ts`) | ผ่าน |
| 5 | เลียบขอบ/drift ไม่สลับสถานะถี่กว่า hysteresis · เวลานอกนับย้อนจาก sample แรกที่อยู่นอก | `edgeHysteresis` vector (8 case) + `synthetic-edge-walk-01` ผ่าน `runTimeline` — ผ่าน |
| 6 | ปิดแอป 5 นาทีในเขต = run เดิมอยู่ ไม่มีระยะ · 16 นาที = `timeout` ของไม่หาย | `qa/tests/F04/session-persist-privacy.test.ts` (`toPersisted`→ข้ามเวลา→`fromPersisted`→`tick`, ทั้งช่วงสั้นและช่วงยาวเกิน `graceMax_s+suspendedMax_s`) — ผ่าน (ปิดข้อที่แผนเดิมทำเครื่องหมาย "รอ P2-F04-T25" ไว้) |
| 7 | `driving-40kmh`: lock ใน `lockSustained_s` ไม่มี tick/damage ขณะ lock · ปลดหลัง `unlockSustained_s` · จอ lock ไม่มีคำว่าโกง | `engine-checkin.test.ts` (`speed_lock`) + `speed-lock.json` vector + copy gate รอบ 2 (PASS, ไม่มีคำ anti-cheat/โกงในจอ lock) — ผ่าน |
| 8 | dungeon ปิดไม่มีปุ่มเข้า + เวลาเปิดถัดไป · run คร่อมปิดจบ `dungeon_closed` ของครบ | `engine-opening-hours.test.ts` + `opening-hours.json` vector + `qa/tests/e2e/f04-closed-dungeon.spec.ts` (ข้อ E2 ข้างบน) — ผ่าน |
| 9 | เลเวลนอกช่วงเข้าได้ · onboarding แนะนำเฉพาะที่เปิด+ครอบเลเวล | `design/reviews/F04-flow-approval.md` (อนุมัติแล้ว) + dungeon artifact filter (`status: open`) ที่ `f04-app.ts` ใช้จริง — ผ่าน (UI/flow level, ไม่ใช่ engine) |
| 10 | ระยะไม่น้อยกว่าจริง มีคำกำกับ · ไม่มีเส้นทาง · ลิงก์นำทางมีแค่ปลายทาง+โหมดเดิน | `qa/tests/e2e/f04-origin-allowlist.spec.ts` (nav link ตรวจ hostname/target/rel/ไม่มี `origin=` ใน query) — ผ่านหลังแก้ตาม D-133 (หัวข้อ 7.2) |
| 11 | หลัง run จบ storage ไม่มีพิกัด · telemetry ไม่มีพิกัด | หัวข้อ 6 ของรายงานนี้ | ผ่าน |
| 12 | ทุกตัวเลขอ่านจาก config key | `pnpm run lint:config` ผ่าน (tech gate หัวข้อ 9.1: `20 files, 0 errors`) | ผ่าน |
| 13 | vector สามกรณีของ R15 ข้อ 7 (ช่องว่าง→ในแถบ/นอก/ข้าม `suspendedMax_s`) | `run-state.json` vector กลุ่ม `edgeHysteresis`/`runTimeline` ครอบทั้งสามกรณี — ผ่านใน `vectors.test.ts` | ผ่าน

## 5. Traceability — F05 acceptance 1–12 (`design/features/F05-movement-gate-reward.md` หัวข้อ 7)

อ้างอิงจาก `qa/plans/F05-test-plan.md` (P2-F04-T19) เช่นเดียวกัน — ยืนยันซ้ำว่า case ที่ตอนเขียนแผนทำเครื่องหมาย "รอ `packages/shared/src/session`" (P2-F05-T08 ตอนนั้น IN_PROGRESS) ปิดครบแล้วผ่านไฟล์ black-box ของ P2-F05-T11 (`qa/tests/F05/exp-drop-seed-vectors.test.ts`, `movement-gate-trace-replay.test.ts`, `run-summary-and-storage-privacy.test.ts`)

| # | acceptance (ย่อ) | หลักฐาน |
| --- | --- | --- |
| 1 | ระยะเกินเกณฑ์ได้ tick เท่าเกณฑ์ไม่ได้ อ่านจาก config | `movement-gate.json`/`reward-window.json` vector + `synthetic-boundary-50m-01` (grid burst เท่าเกณฑ์พอดี) — ผ่าน |
| 2 | tick แรกครบ `window_s` จาก confirm · Grace เลื่อน tick ระยะไม่นับ | `reward-window.json` vector "Grace 2 นาทีเลื่อน tick" — ผ่าน |
| 3 | vector G2 (gap 400 ม.) engine กับ trace ของ QA ตรงกัน | `movement-gate.json`/`run-loop.json` G2 + `qa/tests/traces/engine-movement-gate.test.ts` (`qa-movement-gap-400m-01`, ระยะ 0 เป๊ะในหน้าต่างที่คร่อม gap) — ผ่าน |
| 4 | คู่ห่างเกิน `maxSamplePairGap_s`/accuracy แย่กว่าเกณฑ์ไม่นับ · ไม่ขึ้นกับความถี่ sample | `movement-gate.json` (1 Hz vs 0.2 Hz grid เดียวกัน) — ผ่าน |
| 5 | HUD diagnostic คนละหน้าต่างกับ tick จริง | `qa/tests/F05/*` (P2-F05-T11) เปลี่ยน `gateWindowStep_s` แล้ว events ของ `sessionStep` ไม่เปลี่ยน — ผ่านใน `pnpm test` |
| 6 | tick ผ่านให้ exp/drop ตาม config · ไม่ผ่านไม่กระทบ HP/run state · seed เดิมผลเดิม | `tick-reward.json`, `drops.json` vector + `qa/tests/F05/exp-drop-seed-vectors.test.ts` (seed เดิม replay ผลเดิมทุกครั้ง) — ผ่าน |
| 7 | ยามาจาก drop ของ tick ที่ผ่าน gate เท่านั้น · ไม่มี code path onboarding แยก | `drops.json` vector (ยาอยู่ทุก preset) + grep โค้ด (หัวข้อ 2 แถว E16-F05) ยืนยัน `bagAdd` เกิดจุดเดียวใน `grantTick` — ผ่าน |
| 8 | ตาราง R21 ตรงทุก exit_reason · ตายของหาย exp อยู่ · auto-retreat เก็บครบ | `run-loop.json` vector + `apps/client/e2e/f06-hp.spec.ts` (ตายจริงของหายหมด, auto-retreat เก็บครบ) — ผ่านสองโปรเจกต์ |
| 9 | D-059 vector 59/60 วิ · tick บางส่วนทำให้ run เป็น run ที่นับ | `partial-tick.json` vector (G9/G10) — ผ่าน |
| 10 | R-B1 vector ขอบ (HP ลบ→1→ถอน, มียาใช้ก่อน, ปิด auto-retreat→ตาย) | `damage.json` vector (ของ F06 แต่ยืนยันไม่ตกหล่นข้าม feature ตามที่แผนเดิมระบุ) + `f06-hp.spec.ts` — ผ่าน |
| 11 | หน้าสรุปแสดงเหตุจบถูกทุกเหตุ · storage หลัง run จบไม่มีพิกัด | หัวข้อ 6 ของรายงานนี้ + `apps/client/e2e/full-run.spec.ts`/`f06-hp.spec.ts` (หน้าสรุปแสดงจริง) — ผ่าน |
| 12 | run ยาวไม่มีตัวลด | `synthetic-park-loop-01` (30 นาที ทุกหน้าต่างผ่านสูตรเดียวกัน) + `run-loop.json` vector (ไม่มีตัวคูณลดตามเวลา/จำนวน run) — ผ่าน |

## 6. Storage หลัง run จบไม่มีพิกัด (GD B-08) — ตรวจตรงตามที่ brief ขอ

| ไฟล์ | ตรวจอะไร | ผล |
| --- | --- | --- |
| `qa/tests/F04/session-persist-privacy.test.ts` describe "F04-C11a" | `toPersisted` **ระหว่าง run** (mid-run Active) ไม่มี key `lat`/`lng`/`latitude`/`longitude`/`accuracy_m` และไม่มีเลขรูปพิกัดไทยหลุดในทุก leaf | ผ่าน |
| `qa/tests/F05/run-summary-and-storage-privacy.test.ts` describe "P2-H02 — storage after a run ends carries no coordinates" | `toPersisted` ของ state **หลัง run จบจริง** (`state.run === null`, `lastSummary` ตั้งแล้ว) — จุดเดียวกับที่หน้าสรุป/home-state อ่าน — ไม่มี key พิกัดและไม่มีเลขรูปพิกัดไทยหลุด | ผ่าน |
| `qa/tests/F04/session-persist-privacy.test.ts` describe "F04-C11b" | telemetry ของทั้ง run เต็ม (confirm→tick→exit) ผ่าน sink จริง ไม่มีพิกัดหลุดไป event ใด | ผ่าน |

ทั้งสามไฟล์รันผ่านเป็นส่วนหนึ่งของ `pnpm test` (หัวข้อ 1) และรันแยกซ้ำอิสระอีกครั้งเพื่อยืนยัน (หัวข้อ 1 แถว 5): **6/6 tests passed**

## 7. งาน e2e ที่ทำเพิ่มตาม brief (สามข้อ) + การแก้ไฟล์เดิมที่พังกลางทาง

### 7.1 `qa/tests/e2e/f04-f05-no-raw-copy-key.spec.ts` (ใหม่)

ตรวจว่าไม่มีข้อความรูปแบบ `dungeon.xxx` (raw copy key) หรือ `{`/`}` (ตัวแปรไม่ถูกแทน) โผล่บนจอจริงใน 3 จุด: `S-02-dungeon-confirm` (ทุกสถานะ check-in: `not_enough_trace` มี `{countdown}`, ready, `poor_accuracy`), `S-03-run` (Active, Grace) และ nav panel (proximity panel ก่อนเข้า run) — regex derive namespace จาก `copy.th.json` จริงแบบ dynamic ไม่ hardcode รายชื่อ · 4 เทสต์ ผ่านทั้ง android-chrome/ios-safari (8/8)

### 7.2 `qa/tests/e2e/f04-origin-allowlist.spec.ts` (แก้ตาม D-133)

- ก่อนแก้: เทียบ request origin กับ `baseURL` ตรงๆ เท่านั้น (comment เดิมบันทึกไว้ว่า config ตอนนั้นยังไม่มี `allowedOrigins` เลย)
- หลังแก้: อ่าน `config/app/client.json#requestOrigins.allowedOrigins` จริง แล้ว resolve เป็น origin ที่ยอมรับ — `"self"` → origin ของหน้าเอง, `"env:VITE_..._URL"` → origin จาก `process.env` นั้น (ถ้าไม่ตั้งค่า = ไม่เพิ่มเข้ารายการ ไม่ใช่ error, ตรงกับ `TILE_OVERRIDE` ของสเปคนี้เองที่บังคับปิด map env เสมอ) — รองรับทั้งรูปปัจจุบัน `["self"]` และรูปที่ P2-F06-T10 คาดว่าจะเปลี่ยนเป็น `["self","env:VITE_TILES_URL",...]` (ยืนยันด้วยสคริปต์ Node แยกจำลองทั้งสองรูป ไม่ต้องแก้ `config/app/client.json` จริงเพราะไม่ใช่ของ QA)
- แก้ comment เก่าที่อ้าง `E2E_CLASS_ID_PARAM` ใน `clock/query-params.ts` (ไม่มีอยู่จริงแล้ว — ย้ายไปอ่านจาก `config/app/client.json#providerQuery.paramNames.e2eClassId` ผ่าน `f04-app.ts`'s `resolveE2eClassId`)
- ผลหลังแก้: 2/2 เทสต์เดิม ผ่านทั้งสองโปรเจกต์ (4/4)

### 7.3 `qa/tests/e2e/f04-web-hooks-no-effect.spec.ts` (ใหม่, D-130)

ยืนยันว่า 4 test hook (`start`, `seed`, `e2eClassId`, `e2eSkipF04App`) ไม่มีผลใดภายใต้ `loc=web` — ชั้นที่สองต่อจาก unit test ที่มีอยู่แล้ว (`f04-app.test.ts`, `env.test.ts`) ตามที่ tech gate รอบ 2 เสนอไว้ (หัวข้อ 9.4):

1. `e2eSkipF04App=1` ไม่ข้ามการสร้าง `f04App` จริง — ตรวจด้วยการเช็คว่า `.nav-panel` (mount โดย `createF04App` เท่านั้น) ยังปรากฏใน DOM
2. `start=<ปี 2000>` ไม่ขยับนาฬิกาเกมที่ใช้ persist — ตรวจด้วย `kw.p2.session`'s `savedAt_ms` ต้องใกล้เวลาจริง ไม่ใช่ปี 2000 (`createGameClock` เลือก `createWebGameClock()` เมื่อไม่ใช่ mock provider เสมอ)
3. `seed`+`e2eClassId` ไม่มีผลถึง player ที่ persist จริง — ตรวจด้วย `kw.p2.session`'s `state.player.classId` ต้องเป็น `null` เสมอ (`testForceClassId` ถูกส่ง `undefined` เมื่อ `isMockProvider` เป็น false ใน `main.ts`) — ข้อนี้พิสูจน์เป็นโครงสร้างด้วยว่า `seed` ไม่มีทางมีผลเลยภายใต้ `loc=web` ของ build ปัจจุบัน เพราะไม่มีทางเริ่ม run ได้เลยถ้าไม่มี class (ไม่มี class-picker จริงใน Phase 2 นี้ นอกจาก F06-T10 ที่ยังไม่เสร็จ)

3/3 เทสต์ ผ่านทั้งสองโปรเจกต์ (6/6)

### 7.4 ไฟล์ QA เดิมที่พังกลางทาง — แก้เองแล้ว (ไม่ใช่ product bug)

`qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` เคสที่สาม ("confirm -> Enter -> run bar Active ...") แดงตอนรันจริงครั้งแรกของงานนี้ (ไม่เคยถูกรายงานมาก่อนใน `qa/bugs.md`) เพราะ:

1. ไม่มี `e2eClassId=tanker` ในคำสั่ง navigate — ทำให้ `confirm` ถูก `no_class` ปฏิเสธเสมอ (F06-T10's class-picker ยังไม่มี, `packages/shared/src/session/reducer.ts`'s fail-closed guard) popup จึงไม่ปิดและ `.run-bar` ไม่ปรากฏ — เพิ่ม hook เดียวกับที่ไฟล์พี่น้องทุกไฟล์ใช้อยู่แล้ว
2. `button.btn-danger-confirm` ไม่ unique อีกจุด (ชนกับปุ่มยืนยันปิด auto-retreat ที่ mount ถาวรใน `ui/settings-walking-safety.ts`) — scope ด้วย `.run-bar` เหมือนที่ `f04-origin-allowlist.spec.ts` เคยแก้ไว้แล้ว

ยืนยันเขียว 3/3 ทั้งสองโปรเจกต์หลังแก้ (หัวข้อ 1)

## 8. เช็กลิสต์มาตรฐานของ qa-tester (agent file) — เฉพาะส่วนที่อยู่ใน scope Phase 2 ของ F04/F05

| หัวข้อ | ผล | หมายเหตุขอบเขต |
| --- | --- | --- |
| Movement gate: นิ่ง 0 tick, jitter ยังได้ tick, 50 ม. ที่ขอบพอดี | ผ่าน (หัวข้อ 2 แถว E3/E4, หัวข้อ 5 ข้อ 1) | gate เดียวกันใช้ทุกที่ตาม NN-2 (ไม่มี `movementGate.exceptions`, ยืนยันด้วย config lint) · raid ยังไม่มีใน Phase 2 (out-of-scope ตามสเปคหัวข้อ 6 ทั้งสองไฟล์) จึงไม่มี case "gate ใน raid" ตอนนี้ |
| Presence: เลียบขอบ+drift, Grace 2:59/3:01, Suspended 14:59/15:01, polygon ซ้อน, ปิดกลาง run, emergency close | ผ่านครบยกเว้น emergency close | emergency close มีรองรับใน engine ตาม D-059 แต่ **ไม่มีทางเรียกได้นอก test ใน Phase 2** (ไม่มีหลังบ้าน, ตามสเปค F04 หัวข้อ 6/E11) — ตรวจใน engine level ผ่าน `dungeons.emergencyClose.*` เท่านั้น (`partial-tick.json` vector), ไม่มี UI/flow ให้ทดสอบแบบ black-box จนกว่าจะมี F13–F15 (Phase 5) |
| Resilience: เน็ตหลุด (ได้รางวัลเฉพาะนาทีที่พิสูจน์ได้), offline evidence 29/31 นาที, แอปถูกปิด/กลับมา, accuracy แย่ตอน check-in | ผ่านเท่าที่อยู่ใน scope | เน็ตหลุด: Phase 2 ไม่มี server จึงไม่มีผลต่อ engine เลย (banner เป็นของ client, D-087) — ตรวจแล้วว่าไม่มี event ของ engine เกิดจากเน็ตหลุดอย่างเดียว · **offline evidence ย้อนหลัง (29/31 นาที) เป็นของ F08 Phase 3 โดยตรงตามสเปค F04 หัวข้อ 6 — out-of-scope ของ gate นี้** · แอปถูกปิด/กลับมา: ผ่าน (หัวข้อ 4 F04-C06) · accuracy แย่ตอน check-in: ผ่าน (35 ม. ปฏิเสธ, `qa-checkin-accuracy-35-01`) |
| Server authority: payload ที่แก้แล้ว, batch ที่ส่งซ้ำ, นาฬิกาเพี้ยน ต้องไม่เปลี่ยนรางวัล | ผ่านเท่าที่ Phase 2 มี | **Phase 2 ไม่มี server จริง (D-087) — ไม่มี payload/batch ให้ทดสอบการปลอมแปลงข้าม network** สิ่งที่ตรวจได้แทนคือความ pure ของ reducer เอง (tech gate: ผลไม่ขึ้นกับ input ภายนอกนอก `sessionStep`, client เรียกผ่าน `session` ทางเดียว) และ "นาฬิกาเพี้ยน" ที่ตรวจได้จริงตอนนี้คือ `clock_invalid`/`clockSkewTolerance_s` (E10, `clockCheck` vector) — ผ่าน · การปลอมแปลง payload ระหว่าง client-server จริงเป็นของ F08 (Phase 3) |
| Formulas: ทุก vector ใน `design/systems/test-vectors/` ผ่านโค้ดจริง | ผ่าน | หัวข้อ 2 แถว E5 |
| Privacy: ไม่มีพิกัด/ชื่อรายบุคคลให้ผู้เล่นอื่นเห็น, ไม่มี PII ใน log | ผ่าน | หัวข้อ 6 (storage) + F04-C11b (telemetry) · Phase 2 ไม่แสดงจำนวนคน/role เลย (D-089, ตรวจใน copy gate รอบ 2 และ `dungeon-labels.spec.ts` "kw-rift-count never renders") ซึ่งเข้มกว่าที่ acceptance ขอ (ซ่อนทั้งหมด ไม่ใช่แค่ไม่โชว์พิกัด) |
| Copy: สุ่มตรวจกฎ 6 ข้อ, grep ไม่มี Thai string hardcode ในโค้ด | ผ่าน | copy gate รอบ 2 PASS ทั้งสองฟีเจอร์ (`design/reviews/F04-F05-copy-gate.md`) · grep เพิ่มเติมของงานนี้: e2e ใหม่ (หัวข้อ 7.1) ตรวจไม่มี raw key ขึ้นจอจริง (ไม่ใช่แค่ static grep) · BUG-P2-005 (Thai literal ในไฟล์ test ของ dev ไม่ใช่ shipped copy) ปิดแล้ว (หัวข้อ 10) |

## 9. งานขนานที่พบระหว่างรัน (ไม่ใช่ของ F04/F05, ไม่บล็อก verdict นี้)

ระหว่างงานนี้ gameplay-programmer กำลังแก้ `apps/client/**` สดๆ (P2-F06-T09/T10, ตามที่ context บรีฟเตือนไว้ล่วงหน้า) พบสองอย่างที่ **ไม่ใช่ของ F04/F05 และไม่อยู่ใน `writes` ของงานนี้**:

1. `pnpm run typecheck` ที่ `apps/client` แดง 9 error ทั้งหมดใน `src/dungeons/home-tracker.test.ts` (8 error) และ `src/copy/districts.ts` (1 error) — ไฟล์ทั้งสองเป็นของใหม่/ยัง untracked (`git status` ยืนยัน) ของงาน F06 ที่กำลังเขียนอยู่ ไม่เกี่ยวกับ F04/F05 เลย (ไม่มีการ import จาก `f04-app.ts`, `session/*`, หรือ `reward/*` ที่งานนี้ตรวจ)
2. `pnpm run lint` prettier แดง 8 ไฟล์ ทั้งหมดอยู่ใน `apps/client/**` เดียวกัน (`config/balance.ts`, `copy/districts.ts`, `dungeons/home-{geometry,tracker}.{ts,test.ts}`, `storage/interest.{ts,test.ts}`) — ไฟล์ของงานนี้เองในโฟลเดอร์ `qa/tests/e2e/` ผ่าน prettier สะอาดทุกไฟล์ (ยืนยันแยกในหัวข้อ 1)
3. `pnpm build` (ที่รันซ้ำหลัง WIP นิ่งลง) ผ่านสะอาด exit 0 — ยืนยันว่าปัญหาทั้งสองข้อข้างต้นเป็นเรื่องของ `tsc`/prettier บนไฟล์ test/เนื้อหาที่ยังพัฒนาไม่เสร็จ ไม่ใช่โค้ดที่ build จริงพัง

handoff: gameplay-programmer เจ้าของ P2-F06-T09/T10 (ไม่ blocking สำหรับ verdict นี้ เพราะเป็นงาน F06 ที่ยังไม่ commit และไม่แตะ F04/F05)

## 10. `qa/bugs.md` — สรุปหลังงานนี้

- **BUG-P2-005 ปิดแล้ว** (severity medium, Thai string literal ในไฟล์ dev unit test 3 ไฟล์) — ยืนยันด้วย `qa/tests/F02/privacy-copy.test.ts` เขียว 233/233 (เดิมแดง 3/161) และ grep ตรงหาข้อความทั้งสี่ที่เคยรายงานไม่พบอีกแล้ว — รายละเอียดเต็มอยู่ในรายการ BUG-P2-005 เอง
- **BUG-P2-002** ยังคงสถานะ "FIXED, regression flip pending" เหมือนเดิม — ไม่มีการเปลี่ยนแปลงจากงานนี้ (ห้ามแก้ไฟล์ตามคำสั่ง brief)
- **BUG-P2-003** ยังปิดอยู่ (ไม่แตะ)
- ไม่มี bug severity high ขึ้นไปที่ OPEN เหลืออยู่ในไฟล์ `qa/bugs.md` ณ วันที่ตรวจ
- พบและแก้เองในไฟล์ทดสอบ e2e ของ QA เอง (ไม่ใช่ product bug จึงไม่เปิดรายการใหม่ — บันทึกไว้ในสรุปรวมของไฟล์แทน): `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` ขาด `e2eClassId` hook + selector ไม่ unique (หัวข้อ 7.4)

## 11. รายการค้างของคน (ไม่บล็อก PASS ตามที่ brief ระบุไว้ล่วงหน้า)

- **P2-H30 (HUMAN):** พลิก `it.fails(` → `it(` ที่ `qa/tests/F04/session-checkin-lifecycle.test.ts:44` (ระบบสิทธิ์ของ agent บล็อกไม่ให้แก้ไฟล์นี้เอง เพราะจัดว่าเป็นการถอด security test) — การแก้ backend (BUG-P2-002) พิสูจน์แล้วว่าถูกต้องผ่านการรันจริงของงานนี้ (`Error: Expect test to fail` = assertion ที่ถูกต้องผ่านแล้ว) เหลือแค่พลิกบรรทัดเดียวให้ `pnpm test` exit 0 เต็มชุด ไม่ต้องรัน tech gate ซ้ำตามที่ tech-lead ยืนยันไว้แล้ว (`docs/reviews/F04-F05-tech-gate.md` หัวข้อ 9.4)

## 12. Verdict

- **F04 — PASS.** ทุก acceptance (หัวข้อ 4), Phase Exit Checklist ที่เกี่ยวข้อง (E1, E2, ส่วน F04 ของ E16), tech gate PASS รอบ 2, copy gate PASS รอบ 2, storage/telemetry ไม่มีพิกัดหลัง run จบ, ไม่มี bug severity high ขึ้นไปที่ OPEN
- **F05 — PASS.** ทุก acceptance (หัวข้อ 5), Phase Exit Checklist ที่เกี่ยวข้อง (E3, E4, E5, ส่วน F05 ของ E16), tech gate PASS รอบ 2, copy gate PASS รอบ 2, movement gate ไม่มีทางให้รางวัลนอก gate เดียว, ไม่มี bug severity high ขึ้นไปที่ OPEN
- **รวม — PASS** เงื่อนไขหลังผ่านเดียวที่เหลือคือ P2-H30 (คน, หัวข้อ 11) ซึ่งไม่ใช่เหตุ NEEDS_CHANGES ตามที่ tech-lead และ brief ของงานนี้ระบุไว้ตรงกัน
