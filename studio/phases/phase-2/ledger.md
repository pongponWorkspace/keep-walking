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
| 35 | W4 | Q-P2-09 | user | — | 20:52:33 | อนุญาตให้ agent แก้ client.schema.json (D-111) → P2-X07 TODO |
| 36 | W4 | P2-X06 | systems-designer | 20:42:30 | 20:54:52 | DONE — rename 11 key · check-in[11] ผ่าน · config-lint ขึ้น 11 error schema ชื่อเก่า → รวมใน X07 · generated.json ของ client ต้อง regen → T10 · agent ใช้ git stash/pop ชั่วคราว (ตรวจแล้ว board/ledger/log ครบ) |
| 37 | W4 | P2-F04-T27 (รอบ 2) | game-director | 20:42:30 | 20:55:22 | PASS — B-01..B-08 แก้ครบ · C-1..C-5 → P2-X08 · J-8 แก้ F-18 ด้วย clamp เลเวลผู้เล่น (D-112) → X09/X10 · D-103, D-110 ACCEPTED · F-16 รับจนมีผลสนาม |
| 38 | W4 | P2-X07 | tech-lead | 20:54:52 | 20:56:48 | DONE — config-lint เขียว (allowlist ว่าง) · root: lint/prettier/typecheck ผ่าน, test 1730 ผ่าน 1 ตก (generated subset ของ client → T10) |
| 39 | W4 | P2-F06-T04 | tech-lead | 20:42:30 | 21:12:23 | DONE — tech note F06 ครบ · ตอบ PM (run_tick_denied มี partial, wake lock นับเวลาที่ถือจริง) และ backend (presence() แสดงผลเท่านั้น) · board แก้ acceptance F06-T06 เรื่อง tankerBuff ตาม spec R31 |
| 40 | W4 | P2-F06-T07, P2-F06-T03, P2-X09, P2-F05-T08, P2-F04-T10, P2-F04-T13 | (6 agent) | — | 23:57:02 | FAILED — API session limit (รีเซ็ต 23:20) หยุดกลางงาน · กลับเป็น TODO พร้อม context resume |
| 41 | W4 | P2-F05-T08, P2-F04-T13, P2-F06-T03, P2-X09, P2-F04-T10, P2-F06-T07 | (6 agent) | 23:57:45 | — | RESUME หลังโควตารีเซ็ต (ส่งต่อบริบทเดิม ครั้งที่ 1 ตาม failure handling) |
| 42 | W4 | P2-X09 | systems-designer | 20:55:37 | 00:02:55 | DONE (resume ครั้งที่ 1) — R43 ผ่าน (median ต่ำสุด 39.7 นาที) · exp ไม่ runaway · F-20: playtest เลเวล 1 แทบไม่เห็น auto-retreat, เลเวลอัปแรกที่ tick 4 · vector shared แดง 20 รอ X10 · gateWindows[10] แดงไม่เกี่ยว |
| 43 | W4 | P2-F06-T03 | uiux-designer | 20:42:30 | 00:05:43 | DONE (resume ครั้งที่ 1) — flow F05/F06 + wireframe 7 ไฟล์ · ต้องแก้ wireframe เดิม 3 ไฟล์ → รวมใน X08 · รอ game-director อนุมัติ F06-T30 |
| 44 | W4 | P2-F04-T13 | level-designer | 20:42:30 | 00:07:28 | DONE (resume ครั้งที่ 1) — 13 published / 6 review / 1 draft · ทางเข้าทุกแห่งยังไม่ยืนยันภาคสนาม · BR-1 วาดรูเลี่ยงศาลแล้ว · พระนคร published แค่ 7 (PN-1 รอ narrative, PN-9/10 review) → G2 เปิดตัวยังไม่ครบ ไม่กระทบ playtest พระนคร |
| 45 | W5 | P2-F06-T30 (รอบ 1) | game-director | 00:05:43 | 00:14:23 | NEEDS_CHANGES — B-01..B-06 (ข้อความ canon auto-retreat/ตายบนหน้าสรุป, tutorial ทุก run จนได้รางวัลแรก, ทางเข้า inventory จากจอบ้าน, ลงทะเบียนตอนไม่รู้ตำแหน่ง, นำทางเป็น primary นอกย่าน, ถอน consent ระหว่าง run ไม่บล็อก) · ยอมรับ override 7 ข้อ · P-1..P-5 ตัดสินครบ → P2-X11 (รวม X08) แล้วตรวจรอบ 2 |
| 46 | W4 | P2-F04-T10 | gameplay-programmer | 20:56:48 | 00:19:14 | DONE (resume ครั้งที่ 1) — probe ครบ · bundle ผ่านงบ · e2e ios flake แก้ (ข้าม blob:) · config-lint ตก 2 จาก suffix _bytes → P2-X12 · พบไฟล์ dbg*.mts ที่ root (ของ agent อื่น) |
| 47 | W5 | P2-X03 | location-engineer | 00:07:28 | 00:20:02 | DONE — geo ตรง reference ทุก vector · แก้ tools/traces/src/scenarios/street.ts นอก writes 1 ค่าเพื่อ regen ผ่าน builder (orchestrator ยอมรับ) · speedLock [6][7] ต้อง regen → P2-X13 · data/gps-traces/README.md แถว driving ค้าง → ยกไปงาน location ถัดไป |
| 48 | W5 | P2-F06-T07 | tech-lead | 21:12:23 | 00:22:32 | DONE (resume ครั้งที่ 1) — pipeline art + font + hook เสียง · manifest.build.json ว่างจนกว่า artist รัน build --write · Playwright/deploy ยังไม่ผ่าน prebuild → gameplay T21 / devops T08 · root lint ตกจากไฟล์ session ของ backend ที่กำลังทำ |
| 49 | W5 | P2-X12 | tech-lead | 00:22:32 | 00:24:18 | DONE — config-lint เขียว · root เหลือ 20 ตก (zoneLevel/soloTickExp รอ X10) · ยอมรับ D-115 · follow-up เล็ก: scaffold.ts _bytes + test ช่วงค่า → carry |
| 50 | W5 | P2-X13 | systems-designer | 00:20:02 | 00:40:17 | DONE — root เหลือ 20 ตก (รอ X10) · P-4 ข้อ (2) ใน Phase 2 ถึงได้เฉพาะทางช่องว่าง (D-104) ไม่มีเพดาน → แจ้ง game-director |
| 51 | W4 | P2-F05-T08 | backend-programmer | 20:42:30 | 00:45:46 | PARTIAL → DONE ส่วนหลัก (resume ครั้งที่ 1) — reward + sessionStep ครบลำดับ run→gate→tick→drop · ขาด backdating เต็ม, opening hours, persistence/selectors → รวมเข้า P2-X10 · root 2049 ผ่าน / 21 ตก (20 zoneLevel + 1 direction.test ของ T21 ที่กำลังทำ) |
| 52 | W5 | P2-X11 | uiux-designer | 00:14:23 | 00:50:05 | DONE — แก้ครบ พร้อม gate รอบ 2 · handoff: tech-lead แก้ tech note F06 ส่วนถอน consent (B-06), art ยืนยัน banner.info-full, uiux ia.md npcShop (N-10) |
| 53 | W5 | P2-F05-T09 | narrative-designer | 00:40:24 | 00:51:18 | DONE — orchestrator รัน lint:copy: 0 FAIL, WARN S1 area credits/inventory (แก้งานถัดไป) · D-023 ACCEPTED แล้ว (legal ยาวได้) · credits ภาษาอังกฤษแยกเป็นไฟล์ข้อมูล → tech-lead |
| 54 | W5 | P2-F04-T08 | devops-engineer | 00:25:21 | 00:52:44 | DONE — CI ตรวจ _headers ทับกันและบริการคิดเงินแบบ static · runbook billing พร้อมสำหรับ P2-C07 · root lint ตกจาก apps/client ของ T21 ที่กำลังทำ · gitleaks สะอาด |
| 55 | W5 | P2-F04-T19 | qa-tester | 00:02:55 | 00:53:09 | DONE — traceability ครบ · case storage/origin รอ client (ตรวจใน T22) · bug 2 รายการต้องลง qa/bugs.md → งาน qa ถัดไปที่ถือ bugs.md |
| 56 | W5 | P2-F06-T30 (รอบ 2) | game-director | 00:50:05 | 00:54:59 | PASS — B-01..B-06, K-11 แก้ครบ · เศษ R2-F1..F5 → X14 (uiux), X15 (spec) · tech note consent → X16 · vector J-P2-T30-4 → X17 · กฎ build ชั่วคราว: flow ชนะ wireframe, copy ชนะร่าง, K-11 ชนะ R37 |
| 57 | W5 | P2-X15 | game-director | 00:54:59 | 00:59:00 | DONE — spec ตรงคำตัดสิน · กรณีไม่มี dungeon เปิดที่ครอบเลเวล = สถานะไกลชั่วคราว + เวลาเปิดถัดไป (A-P2-X15-1 → uiux ตรวจใน X14) |
| 58 | W5 | P2-X16 | tech-lead | 00:59:00 | 01:09:21 | DONE ส่วนที่อยู่ใน writes · schema credits อยู่นอก writes → P2-X18 · พบ engine defect S-1/S-2 → ส่งเข้า X10 · PM ตัดสิน event location_consent_withdrawn (A-P2-X16-1) · game-director ยืนยัน A-P2-X16-2 |
| 59 | W5 | P2-F06-T11 | qa-tester | 00:53:09 | 01:09:44 | DONE — case ที่ต้องใช้ engine/client เป็น PENDING · level-designer ต้องเลือก dungeon สำหรับเดินของทีม (P-3.4) |
| 60 | W5 | P2-X18 | tech-lead | 01:09:21 | 01:10:20 | DONE — config-lint เขียว · root เหลือ 1 ตก (reducer.test ของ X10 ที่กำลังทำ) |
| 61 | W5 | P2-F05-T07 | artist-2d | 00:51:25 | 01:10:33 | DONE — id ไอเทมตรง drops.json · ผ่านตรวจขาวดำ/แดด/ตาบอดสีแบบ render เอง · พบ icon.ui.in-run มองไม่เห็นบนพื้นกลางคืน → art-director · manifest.json เกินงบ → tech-lead · ยังไม่ทำ slot-empty 4 ไฟล์ (P2) |
| 62 | W5 | P2-X17 | systems-designer | 01:10:20 | 01:15:27 | DONE — vector ใหม่ 8 · vector เดิมไม่เปลี่ยน · shared ตก 4 รอ X10 · client snapshot ต้อง regen (แจ้ง T21) · typecheck ตกที่ไฟล์ qa → P2-X19 |
| 63 | W5 | P2-X19 | qa-tester | 01:15:28 | 01:16:21 | DONE — root typecheck เขียว |
| 64 | W5 | P2-F05-T06 | sound-designer | 00:52:44 | 01:18:13 | DONE — 20 cue WAV (iOS เล่นได้) · speed lock สั่นครั้งเดียว · raid.thirtyMinWarning priority ต่ำกว่า hpLow · audio/src ยังไม่อยู่ใน typecheck (tech-lead) |
| 65 | W5 | P2-RISK-01 | producer | 01:16:21 | 01:21:36 | DONE — risks.md 38 แถว · D-104 ปรับเป็น ACCEPTED ตาม X04 · handoff: level เลือก dungeon สำหรับเดินของทีม, qa เพิ่มวันสำรองฝนใน kit |
| 66 | W5 | P2-X10 | backend-programmer | 00:45:46 | 01:24:41 | DONE — root test เขียวทั้งหมด (2211 ผ่าน) · lint เหลือ 9 no-undef ใน art/vfx ของ F05-T05 ที่กำลังทำ · recoveryTimeLeft ต้องรอ HP model → F06-T06 |
| 67 | W5 | P2-H01 | location-engineer | 01:18:13 | 01:27:13 | DONE — root test 2211 ผ่าน 0 ตก · คำถามออกแบบ: รายชื่อเขตของจอลงทะเบียน + {areaName} ต้องมี geometry ทุกเขตหรือแก้ copy → P2-X20 + game-director |
| 68 | W6 | P2-X20 | systems-designer | 01:27:33 | 01:30:30 | DONE — config-lint 0 error · root test 2211 ผ่าน · ข้อเสนอ {areaName} ให้ game-director |
| 69 | W6 | P2-X14 | uiux-designer | 01:09:44 | 01:30:55 | DONE — R2-F1..F4, N-10, copy alignment ครบ · flow F04 ยังมีชื่อ nav.approximateDistancePrefix ค้าง (นอก writes) + wireframe เก่า 04/05 → carry |
| 70 | W6 | P2-F04-T21 | gameplay-programmer | 00:19:14 | 01:33:06 | PARTIAL → DONE ส่วนหลัก — loop F04 ต่อ session จริง · เจอและแก้ปัญหาแผนที่ไม่โหลดเมื่อ refresh ทุก sample · ส่วนที่เหลือ → P2-X21 (gameplay), P2-X22 (tech-lead), readyIn_s → F06-T06 |
| 71 | W6 | P2-F06-T19 | product-manager | 01:21:44 | 01:33:42 | DONE — แบบสอบถาม + แผนวิเคราะห์ · HP/auto-retreat ไม่ใช่เกณฑ์รอบนี้ (F-20) · game-director ทบทวนก่อน T27 · telemetry enum → P2-X23 |
| 72 | W6 | P2-C09 | game-director | 01:30:45 | 01:37:30 | DONE — GDD 10 จุดตาม D-084 · orchestrator ยืนยัน diff เฉพาะหัวข้อที่อนุมัติ · Q-P2-10 รอบถ้อยคำถัดไป |
| 73 | W6 | P2-F05-T05 | vfx-animator | 01:10:33 | 01:46:59 | DONE — lint art/vfx ผ่าน · งบ motion ต่ำกว่า 20 KB ทุกชุด · overlay HP/ตายยกไป F06-T05 |
| 74 | W6 | P2-X23 | product-manager | 01:37:45 | 01:47:25 | DONE — telemetry enum ครบ |
| 75 | W6 | P2-X22 | tech-lead | 01:33:06 | 01:47:25 | PARTIAL → DONE ส่วนของตน · typecheck ตกที่ audio/src/cues.ts:55 → รวมใน F06-T13 · artist รัน split-manifest ใน F05-T04 · devops ลบ prebuild ซ้ำใน F05-T14 |
| 76 | W6 | P2-F05-T14 | devops-engineer | 01:47:33 | 01:55:05 | DONE — dry-run ยืนยัน profile ฝังใน bundle · playtest กับ preview ใช้ project เดียวกัน (อย่า deploy ทับระหว่าง playtest) |
| 77 | W6 | P2-F06-T13 | sound-designer | 01:47:33 | 09:01:45 | DONE (ส่งรายงานก่อนโดน limit) — typecheck ทั้ง repo ผ่าน · ลำดับเสียงความปลอดภัยชนะเสมอ · buzz.svg ไม่ตรง manifest.build (งาน artist ค้าง) |
| 78 | W6 | P2-F05-T04, P2-F04-T23, P2-F04-T09, P2-X21, P2-F06-T06 | (5 agent) | — | 09:01:45 | FAILED — usage limit ครั้งที่ 2 (รีเซ็ต 04:50) · กลับเป็น TODO รอ resume |
| 79 | W6 | P2-F06-T06, P2-X21, P2-F04-T09, P2-F05-T04, P2-F04-T23 | (5 agent) | 09:02:18 | — | RESUME หลังโควตารีเซ็ต (ต่อบริบทเดิม) |
| 80 | W6 | P2-F04-T09 | qa-tester | 01:31:03 | 09:04:21 | DONE (resume) — ios flake ยืนยันหาย 5/5 · S6 ชายฝั่งตรวจได้แค่ข้อมูล mask (fixture ไม่ครอบ) → location |
| 81 | W6 | P2-F05-T04 | artist-2d | 01:46:59 | 09:11:40 | DONE (resume) — PNG จริงชุดแรก · stage.test ตก (runtime manifest 37.8 KB > 30 KB) → P2-X24 · composite-f03 รอ art-director เปลี่ยนเป็น approved |
| 82 | W6 | P2-F06-T18 | qa-tester | 09:04:21 | 09:26:21 | DONE — ชุด playtest ครบ · สถานที่ PN-2 · ช่องเบอร์ผู้ประสานงานให้คนกรอก (เพิ่มในขั้นตอน P2-F06-T27) |
| 83 | W6 | P2-X24 | tech-lead | 09:11:40 | 09:29:04 | DONE — tools/art เขียว · client ต้องรองรับ parts + แก้ type + copy dist/kw (แจ้ง X21) · qa trace test พังจาก gateWindows ใหม่ของ T23 (แจ้ง location) |
| 84 | W6 | P2-X21 | gameplay-programmer | 04:50 | 09:31:23 | PARTIAL — adapter สลับของจริง, asset runtime/fonts/icon/audio core, ชื่อไอเทม+กรอบ rarity, countdown, credits, e2e แก้ · client 437/437 · ส่งกลับทำ parts/type/dist-kw ของ X24 · handoff → H02 (privacy latestSample), H03 (e2e flaky), H04 copy, H05 icon render |
| 85 | W6 | P2-F06-T06 | backend-programmer | 04:50 | 09:31:57 | DONE — HP engine ใน packages/shared/src/hp + session (chooseClass, usePotion, processHits, selectPlayerView, readyIn_s) · แก้บั๊ก lastSummary หายใน handleSample · shared 590 pass |
| 86 | W6 | P2-F04-T23 | location-engineer | 04:50 | 09:31:57 | DONE — location hygiene ครบ, mask hole ตัดตาม tile bbox (S6 ขอบดำจริง), bbox check ใน CI, gateWindows เข้ากันได้ย้อนหลัง · root 2354 pass · handoff → H06 tech-lead, H07 systems, H08 qa, T16 context |
| 87 | W7 | P2-H04 | narrative-designer | 09:31:01 | 09:34:05 | DONE — 2 copy key · ไม่มี shell จึง orchestrator รัน lint (163 pass) · ขัด flow §9 → D-120 PROPOSED + H09 |
| 88 | W7 | P2-H07 | systems-designer | 09:32:06 | 09:34:05 | DONE — reviewFlagTags civic_building/rooftop · พบ D-109 ยังไม่ลง excludeOsmIds → H10, rerun → H11 |
| 89 | W7 | P2-H06 | tech-lead | 09:32:06 | 09:34:05 | DONE — geo workspace dep, lockfile +3 |
| 90 | W7 | P2-X21 | gameplay-programmer | 09:25 | 09:34:45 | DONE (addendum) — parts avatar loader, type ตรง tools/art, Vite /kw/ + dist/kw · client 449 pass · handoff → H12 |
| 91 | W7 | P2-H10 | systems-designer | 09:34:13 | 09:35:30 | DONE — D-109 ลง config · coverage pytest 1 fail (test hard-code D-083) → รวมเข้า H11 |
| 92 | W7 | P2-H12 | tech-lead | 09:34:52 | 09:37:16 | DONE — ทาง (a): header production จาก _headers เท่านั้น · preview ควรเสิร์ฟ dist/kw (ต่อท้าย H03) |
| 93 | W7 | P2-H02 | backend-programmer | 09:32:06 | 09:38:40 | DONE — พบพิกัดอีก 3 จุด (lock.lastAccurate, gate filter, grid) ตัดหมด · blob เก่าถูก sanitize ตอนโหลด |
| 94 | W7 | P2-F06-T16 | devops-engineer | 09:32:06 | 09:39:50 | DONE — CI bundle budget + bbox guard, negative test ผ่าน, ไม่มีค่าใช้จ่าย |
| 95 | W7 | P2-H05 | uiux-designer | 09:31:01 | 09:40:08 | DONE — §13.9 inline SVG ตาม tintable · D-121 PROPOSED · handoff → H13 tech-lead, H14 gameplay, H15 artist-2d |
| 96 | W7 | P2-H11 | location-engineer | 09:35 | 09:41:14 | DONE — rerun coverage, SHA ใหม่, ปทุมวันตก G1 · root test พัง 1 จาก H07 (tools/dungeons roof ซ้ำ) → X25 · pilot/G1 → H16 |
| 97 | W7 | P2-X25 | location-engineer | 09:41:14 | 09:43:07 | DONE — tools/dungeons 138 · root เหลือ fail persist.test (F05-T10) + qa/tests/F04 2 ข้อ (งาน T22 กำลังทำ) |
| 98 | W7 | P2-H13 | tech-lead | 09:40:08 | 09:43:58 | DONE — tintable field +448 B, D-121 ACCEPTED |
| 99 | W7 | P2-H09 | uiux-designer | 09:40:08 | 09:45:45 | DONE — D-120 ฝั่ง uiux รับ, flow §9/§15 · game-director อนุมัติใน T24 |
| 100 | W7 | P2-H15 | artist-2d | 09:40:08 | 09:46:21 | DONE — in-run ปิดบั๊กกลางคืน · D-122 PROPOSED · → H17 art-director |
| 101 | W7 | P2-F06-T05 | vfx-animator | 04:50 | 09:48:52 | DONE — VFX F06 4 module + 10 emote · handoff → H18 sound, T08 context, F09 review (Phase 3) |
| 102 | W7 | P2-H17 | art-director | 09:46:21 | 09:55:00 | DONE (NEEDS_CHANGES) — in-run PASS, D-122 REJECTED → D-123, D-124 ui16 rule + composite conditional · → X26 artist, H19 uiux, H14 context |
| 103 | W7 | P2-H18 | sound-designer | 09:48:52 | 09:57:45 | DONE — cue inventory.potionUsed / inventory.reviveUsed (22 cue, deterministic) · handoff: gameplay ต่อ potion_used.revived, toast copy (narrative/uiux), telemetry potion_used (PM) |
| 104 | W7 | P2-H16 | level-designer | 09:41:14 | 09:59:40 | DONE — pilot 20 แห่งยัง valid, SHA/ตัวเลขใหม่, §10 ทางเลือก G1/G2 (แนะนำยอมรับใน Phase 2 + ตรวจภาคสนามคู่ขนาน) · คำถามรวมเข้า Q-P2-11 |
| 105 | W7 | P2-H19 | uiux-designer | 09:55:00 | 09:59:45 | DONE — components.md §13.9 ตรง D-121/D-123/D-124 · ยืนยัน A-P2-H17-2 |
| 106 | W7 | P2-PLAN-SYNC-W7 | producer | 09:42 | 10:06:28 | PARTIAL — ใช้ O-01..O-45 แล้ว (+8 แถว H20, X27–X33, CUT H03/H14) · ตัวจัดสิทธิ์ปฏิเสธ 4 edit (O-01, O-10, O-14, O-43/44 รวมกฎ backend เขียนใน apps/client) → ถามผู้ใช้ ไม่ทำแทน |
| 107 | W7 | P2-F04-T22 | qa-tester | 04:50 | 10:08:28 | DONE — black-box F04 ครบ, พบ BUG-P2-002 (teleport check-in ผ่าน sessionStep, high → X34 บล็อก F05-T16) + BUG-P2-003 (→ F06-T08) · origin allowlist key หาย (→ F06-T08) · qa แตะ pnpm-lock.yaml (workspace qa/tests/F04) |
| 108 | W8 | P2-X26 | artist-2d | 09:55:00 | 10:09:36 | DONE — icon + composite แก้ครบ, composite-f03 approved · art-director ยืนยันซ้ำใน content gate F06-T23 |
| 109 | W8 | P2-X31 | tech-lead | 10:06:28 | 10:10:11 | DONE — tech note §9.2 แก้ตาม R37, scaffold _bytes · handoff → X27 (relay), H21 tech-lead, H22 location, A-P2-X31-1 → H20 |
| 110 | W8 | P2-X30 | uiux-designer | 10:06:28 | 10:10:45 | DONE — key rename + wireframe เก่าติดหมายเหตุ |
| 111 | W8 | P2-H21 | tech-lead | 10:10:11 | 10:11:47 | DONE — $defs bytes/minutes/degrees · telemetry/dungeons schema ยัง inline (ค่าบวกเท่านั้น ใช้ได้กับกรุงเทพฯ) เลื่อนไปทำพร้อมงาน schema ครั้งถัดไป |
| 112 | W8 | P2-H20 | game-director | 10:06:28 | 10:12:37 | DONE — D-120 ACCEPTED, D-126 §21 ข, D-127 3A, D-128 gate/auto-retreat ผ่าน GD+HUMAN · → X32 ready, H23 uiux, H24 PM, H25 GD, context T09/T10/T21 |
| 113 | W8 | P2-H22 | location-engineer | 10:10:11 | 10:13:12 | DONE — ตรวจ dungeon ครอบเลเวลเริ่มต้น · ข้อมูลจริงผ่าน |
| 114 | W8 | P2-X33 | product-manager | 10:06:28 | 10:13:37 | DONE — GR-1 PASS 3 ย่าน, แนะนำ Q-P2-11 (ก), O-22 ปฏิเสธ, inventory_potion_used → H24 |
| 115 | W8 | P2-H25 | game-director | 10:12:53 | 10:14:10 | DONE — spec F06 ตาม D-126/D-127 · spec 276 บรรทัด แยกไฟล์หลัง design gate (บันทึกไว้ plan-sync ถัดไป) |
| 116 | W8 | P2-X32 | narrative-designer | 10:12:53 | 10:16:33 | PARTIAL — 2 body ใหม่ (outOfAreaBody เดิมผิด R57 แก้แล้ว) lint 171 pass · ขยาย writes names.th.json ส่งกลับเขียนชื่อ 79 เขต · → H26 location |
| 117 | W8 | P2-X32 | narrative-designer | 10:12:53 | 10:18:39 | DONE — ชื่อ 79 เขต ใน names.th.json · lint 208 pass (orchestrator รัน) · id ส่งต่อ H26 |
| 118 | W8 | P2-H23 | uiux-designer | 10:12:53 | 10:18:39 | DONE — flow F06 ตรง D-120/126/127 + body ใหม่ |
| 119 | W8 | P2-H26 | location-engineer | 10:16:42 | 10:20:53 | DONE — study-districts.json 79 เขต, id ตรงทั้ง 2 ไฟล์ · root test แดงจาก home-state.test.ts (X27 กำลังทำ) |
| 120 | W8 | P2-H24 | product-manager | 10:13:37 | 10:21:33 | DONE — รับความเห็น GD ทั้ง 9 ข้อ, inventory_potion_used ประกาศแล้ว (client ยิงใน F06-T10) |
| 121 | W8 | P2-X27 | backend-programmer | 10:07:53 | 10:25:31 | DONE — home-state pure 28 test, privacy-copy 200 pass · A-P2-X27-1 → F06-T20 |
| 122 | W8 | P2-F05-T10 | gameplay-programmer | 09:34:52 | 10:25:57 | DONE — client F05 ครบ, พบ+แก้ #hud คลิกไม่ได้ใน build จริง · handoff → X35 (expGained 0), F05-T11/T20/T08 context |
