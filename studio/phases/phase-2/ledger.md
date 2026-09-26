# Phase 2 Ledger

planning started 2026-09-26 10:42 (Phase 1 ยังไม่ปิด: HUMAN อนุมัติให้วางต่อ โดยงานที่ขึ้นกับ spike รอไว้, D-086)

| # | Wave | Task | Agent | Start | End | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | plan | P2-PLAN-01 | producer | 10:42:53 | 11:08:28 | DONE — board draft 82 task (74 agent, 8 HUMAN), carry-in C01–C09, W1–W17 · เสนอ backend ถือ reward/hp ใน packages/shared, รวม gate F04+F05 |
| 2 | plan | P2-PLAN-REV-GD | game-director | 11:08:28 | 11:15:26 | NEEDS_CHANGES — B-01..B-09 (อนุมัติ flow, speed lock, check-in, sample gap, config key, ยามาจาก drop, รางวัลแรกเป็น tick ปกติ, storage ตำแหน่ง, deps copy), N-01..N-08 · A-P2-PLAN-01-3 และ gate รวม ACCEPTED มีเงื่อนไข |
| 3 | plan | P2-PLAN-REV-PM | product-manager | 11:08:28 | 11:19:50 | NEEDS_CHANGES — PM-M1 telemetry dep, PM-M2 telemetry จอไกล/นอกพื้นที่, PM-M3 GR-1 เร็วขึ้น + กฎ blocking · แนะนำ ODbL เผยแพร่, 18+, แยกเวลาเดิน |
| 4 | plan | P2-PLAN-REV-TL | tech-lead | 11:08:28 | 11:39:46 | NEEDS_CHANGES — B-01..B-14, N-01..N-15 · ACCEPT A-1, A-2 (มีเงื่อนไข), A-6 (+เสนอ backend ถือ formulas/config/run) · สายสนามเหลือกั้นเฉพาะ F05-T12/T13, F06-T12, F06-T26 |
| 5 | plan | P2-PLAN-02 | producer | 11:39:46 | 12:19:27 | DONE — board rev 2: 89 แถว (79 agent, 8 HUMAN, 2 CUT merge), task ใหม่ F04-T24..T27, F05-T19/T20, F06-T30 · backend ถือ engine ทั้งหมด · 17 wave · คำถามคน Q-H1..Q-H3 |
| 6 | plan | คำตอบคน Q-H1..Q-H3 | user | — | 18:29:31 | ODbL (D-091) · รวม 15–17 + ฟอร์มผู้ปกครอง (D-092) · เช้า/เย็นทุกการเดิน (D-093) · orchestrator บันทึกลง board |

## Run 1 — started 2026-09-26 18:33
| # | Wave | Task | Agent | Start | End | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | W1 | P2-F04-T02 | product-manager | 18:33:47 | 18:43:21 | DONE — PRD F04/F05/F06 ครอบ 3 กลุ่ม, metric + north star proxy client, D-091..D-093 · assumption 6 ข้อ (ไม่ blocking) |
| 8 | W1 | P2-F04-T01 | game-director | 18:33:47 | 18:44:53 | DONE — spec F04 (R01–R39) + F05 (R01–R28) · ระยะนอก polygon ไม่นับ (หลักข้อ 2) · decision 9 ข้อ (D-094) · handoff ไป systems/tech/narrative/uiux/level/PM/qa ผูกกับงานที่มีบน board |
| 9 | W1 | P2-F06-T01 | systems-designer | 18:33:47 | 18:48:46 | DONE — D-038 B: solo L25 = 2.69 · farDungeonThreshold 1,900 · R-B1 26 vector · raid cap 1.6/1.2 · test 937 ผ่าน · ส่งข้อมูลต่อให้ level/game-director ระหว่างทำ |
| 10 | W1 | P2-F04-T03 | location-engineer | 18:33:47 | 18:50:07 | DONE — D-083 ใน coverageFilter 3 key · รัน pipeline ใหม่: usable 730→693, พระนคร 10 (G2 พอดี), ปทุมวัน G1 61.42%, บางรัก 6 (G2 ตก) · อันดับ 1 ใหม่ ดินแดง · pytest 311 · ส่งผลให้ level-designer ระหว่างทำ |
| 11 | W1 | P2-F04-T05 | tech-lead | 18:33:47 | 18:51:02 | DONE — ADR 0003 (reducer, geo leaf, 2 หน้าต่าง, outlier+resample, RNG counter-based, PresenceStrategy, bundle measure) · deps happy-dom/resvg/polylabel · lint/typecheck/test 937/build เขียว (prettier ตกที่ไฟล์ของ systems ระหว่างทำ) |
| 12 | W2 | P2-F06-T02 | game-director | 18:48:04 | 19:03:55 | DONE — spec F06 58 กฎ, pillars 7.1/7.5 · decision 10 ข้อ (D-096) · รับ A-P2-F06-T01-1/-2 · handoff launch-area geometry → P2-H01 |
| 13 | W2 | P2-F05-T03 | art-director | 18:43:42 | 19:04:33 | DONE — F-AD-1..4 ปิด, brief 72 SVG · ramp.tonic/map.water-edge ใหม่ทำ contrast.test ตก 4 → P2-F04-T06 (tokens) + P2-X01 (qa) · orchestrator แก้ Writes ของ P2-F05-T07 ตาม asset-pipeline 3.2 |
| 14 | W2 | P2-F04-T15 | uiux-designer | 18:48:52 | 19:30:55 | DONE — flow F04 A–F + wireframe 4 ไฟล์ · ปิดจำนวนคน/role ทุกจุด (A-P2-F04-T15-1 override A-P1-F03-T16-3 → game-director ยืนยันใน T27) · 19 copy key → T16 |
| 15 | W2 | P2-F04-T14 | tech-lead | 18:54:58 | 19:33:27 | DONE — tech note F04/F05: timeline cutoff H + backdating, wall clock + clock_invalid, chain rule, sample cap 300 s/16, ring buffer 3000, ลิงก์นำทาง Google/Apple, artifact data/dungeons/artifact/ · ADR 5.2 6(b) แก้ถ้อยคำใน T24 · test 935 (4 ตกจาก contrast) |
| 16 | W1 | P2-F04-T04 | level-designer | 18:33:47 | 19:34:07 | DONE — นำร่อง 20 แห่ง · บางรักยังตก G2 (6) เสนอเสริม 2–4 · ปทุมวัน/บางรักยังไม่มี dungeon เลเวล 1 ที่เปิดทั้งสองช่วงเดิน (ห้ามนัด playtest จนกว่าจะมี) · พบสถานที่กำกวมใหม่ 3 กลุ่ม (คำถามคนไม่ blocking) · ยืนยัน assumption ของ T03 |
| 17 | W2 | P2-F04-T12 | location-engineer | 19:03:55 | 19:39:14 | DONE — packages/geo 85 test ผ่าน · table-still 0/3, bench 3/3, drift-spike ไม่นับ, edge-walk hysteresis 8 ครั้ง · cadence ต้อง 1–5 วิ (10 วิ bench ตก) · drift ช้าแบบ S3 ยังนับ (แจ้ง game-director, NN-8) |
| 18 | W3 | P2-F04-T27 (รอบ 1) | game-director | 19:34:07 | 19:41:33 | NEEDS_CHANGES — B-01..B-08 (สถานะ check-in บนปุ่มเข้า, offline, overlay speed lock ก่อน run, ลูกศร D-097, ลิงก์ A3, check-in หลังกลับจากแอปนำทาง, จอนอกระยะ, สรุป timeout) · J-1 flow F04 แทน F03 · J-2 ซ่อนจำนวนคน → P2-X02 แล้วตรวจรอบ 2 |
| 19 | W3 | P2-F04-T17 | product-manager | 18:50:15 | 19:44:20 | DONE — telemetry local-only ตาม D-088 + event ของ spec/tech note · metrics north star proxy · PRD F04/F06 ต้องแก้ (รวมเข้า T18) · interest_registered_outside_area เพิ่ม scope province/district |
| 20 | W2 | P2-F05-T02 | backend-programmer | 19:04:41 | 19:48:11 | DONE — port สูตร + RNG (deriveSeed/streamRng ADR §6) + config accessor ไม่ใช้ Ajv + H03 · vector test แบบ dynamic 188 ข้อ · ข้าม resolveHit (F06-T06), raidPartyMult, economy (ไม่มีเจ้าของใน Phase 2) |
| 21 | W3 | P2-F04-T18 | product-manager | 19:44:21 | 19:51:07 | DONE — GR-1 ผ่าน guardrail ทั้ง 3 ย่าน (ไม่เข้ากฎสลับ 2) · ยืนยัน A-P1-F01-T06-2/-4/-7 · แก้ PRD F04/F06 |
| 22 | W3 | P2-F04-T06 | uiux-designer | 19:30:55 | 19:53:09 | DONE (agent รายงาน PARTIAL เพราะรัน test ไม่ได้ · orchestrator รันแล้ว: contrast เหลือ 2 ข้อ row-count ตามคาด → P2-X01) · ยอมรับการแก้ wireframes/shared/style.css (A-P2-F04-T06-2) |
| 23 | W3 | P2-F04-T26 | location-engineer | 19:41:48 | 20:01:44 | DONE — validator จุด B + artifact deterministic (ว่างจนกว่า T13) · smoke กับนำร่อง 19 แห่ง: ต้องกรอกเวลาเปิดเองส่วนใหญ่, BR-1/BR-3 ทับเขตห้าม, BR-2/PW-4 คร่อมถนนใหญ่ · พบ vectors.test.ts ตก 149 จาก vector ใหม่ของ systems (fn checkIn/gateWindows) → ให้ run engine T20 รับ |
| 24 | W3 | P2-F05-T20 | systems-designer | 19:33:27 | 20:04:35 | DONE (pnpm test แดงจาก vector ใหม่ 149 ที่ engine ยังไม่รองรับ) · cadence 5 วิ, outlier 60 กม./ชม., hysteresis 6 sample และ 5 ม. (ครบทั้งสองเงื่อนไข), speed lock 15/60 วิ · geo ขาดกฎคู่เร็วเกิน speed lock → P2-X03 · tech note → P2-X04 · bench margin แคบ (F-16) |
| 25 | W3 | P2-X01 | qa-tester | 20:01:44 | 20:05:10 | DONE — contrast.test เขียว (339 ข้อใน 2 ไฟล์), qa/tests 499 ผ่าน |
| 26 | W3 | P2-F04-T24 | tech-lead | 19:51:07 | 20:06:55 | DONE — schema 19 ไฟล์ + config lint ใน pnpm test (0 error, allowlist 15 รายการมีเจ้าของ) · ADR 0003 5.2 ข้อ 6 แก้แล้ว · handoff → X04 (ADR 0001/prettierignore/root scripts), X05 (qa typecheck), X06 (systems ชื่อ key), gameplay (lint + speedMult) |
| 27 | W4 | P2-X05 | qa-tester | 20:06:56 | 20:08:18 | DONE — typecheck ของไฟล์ qa ผ่าน · เหลือ apps/client hud-panel.test.ts:53 (งาน T25 ที่กำลังทำ) |
| 28 | W3 | P2-F04-T16 | narrative-designer | 19:48:19 | 20:10:00 | DONE (agent รายงาน PARTIAL เพราะรัน lint ไม่ได้ · orchestrator รัน lint:copy exit 0, 0 FAIL, 10 WARN) · key ชื่อ dungeon.<id>/.search · PN-1 สวนรมณีนาถ พักรอคน (Q-01 blocking) |
| 29 | W3 | P2-X02 | uiux-designer | 19:53:09 | 20:42:10 | DONE — แก้ครบ B-01..B-08 + N (N-14 defer) · พร้อม gate รอบ 2 |
| 30 | W4 | P2-X04 | tech-lead | 20:08:18 | 20:42:10 | PARTIAL → DONE ส่วนที่ทำได้ · แก้ client.schema.json ถูกตัวจัดสิทธิ์ปฏิเสธ ("Modify Shared Resources") · orchestrator ไม่ทำแทน ถามคน → P2-X07 WAITING |
| 31 | W3 | P2-F04-T25 | gameplay-programmer | 19:39:21 | 20:42:10 | DONE — plumbing ครบ · apps/client lint/typecheck/232 unit/e2e 30 เขียว · e2e map-shell ios-safari flaky ~40% (blob URL) → qa |
| 32 | W4 | P2-F05-T01 | systems-designer | 20:05:18 | 20:42:10 | DONE — drop table 3 preset มียา · vector 59 · tools/sim ใช้ shared · F-18: PN-2 (1–35) เลเวล 1 ถึง auto-retreat 3.2 นาที ตก R43 → game-director (blocking onboarding พระนคร) |
| 33 | W3 | P2-F04-T20 | backend-programmer | 20:04:54 | 20:42:10 | DONE — run engine ครบ vector 275/276 (check-in[11] ต่างเพราะจุดอยู่บนขอบพอดี → X06) · guard suspendedTimeCounts ย้ายไป F05-T08 |
| 34 | W3 | คำตอบคน Q-01, Q-02, สถานที่กำกวม | user | — | 20:42:10 | ยกเว้นสวนรมณีนาถ (D-107) · ชื่อย่านจากพระนามใช้ได้ (D-108) · สถานที่ใหม่ตามคำแนะนำ (D-109) |
