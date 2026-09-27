# Plan-sync W7 — ข้อเสนอแก้ board Phase 2 (P2-PLAN-SYNC-W7)

ผู้เสนอ: producer · วันที่ 2026-09-27 · สถานะ: APPLIED ส่วนใหญ่โดย producer (2026-09-27) · เลข ID ถูกเลื่อนตามที่ orchestrator แจ้ง (H18 → H20, X26..X32 → X27..X33) · หลัง apply แผน wave ใน board หัวข้อ 3 เป็นตัวจริง (P2-H17 DONE แล้ว จึงใช้ช่อง W8 ให้ P2-X30 แทน) · ส่วนที่ตัวจัดสิทธิ์ปฏิเสธให้ orchestrator ลงเอง: context ของ F05-T10 (O-01), deps F05-T15 (O-10), deps F06-T08 (O-14), กฎสลับข้อ 8–10 + ประมาณการ (O-43, O-44)
อ่านจาก: `studio/phases/phase-2/board.md` (ตาราง + หัวข้อ 3–5), `studio/phases/phase-2/ledger.md` (ถึงแถว 100), `studio/decisions/decision-log.md` (ถึง D-122), `docs/tech/F06-hp-damage-onboarding.md` §9, `design/features/F06-hp-damage-onboarding.md` R37, `design/reviews/F05-F06-flow-approval.md` R2-4, `data/coverage/launch-districts-before-after.csv`

## 0. สรุป

- งาน gameplay ที่เหลือ 7 แถว (F05-T10 กำลังทำ, F06-T08, T09, T10, T14, H03, H14) = 7 wave ต่อกันถ้าไม่แก้ · ข้อเสนอนี้เหลือ **5 wave (W7–W11)** โดยรวม H03/H14 เข้างานที่มีอยู่ และย้ายส่วนที่เป็นโมดูล pure ของ client ให้ backend-programmer (ว่างทั้ง phase แล้ว) ทำในไฟล์ใหม่ที่แยก path ชัด เพื่อไม่ให้งาน gameplay เกิน 3 วัน
- พบ "วงวนแฝง" 2 จุด: D-120 และทางเลือก §21 ถูกตั้งให้ game-director ตัดสินใน F06-T24 ซึ่งอยู่ **หลัง** งาน client ที่ต้องใช้คำตัดสินนั้น (H03, F06-T09, F06-T10) → ย้ายการตัดสินขึ้นมาเป็น P2-H20 ใน W8
- พบ deps ขาด 8 จุด และงานค้างที่ไม่มีแถว 4 รายการ (tech note F06 §9.2 ข้อ 5 ขัด spec R37, ชื่อ key ใน flow F04 ที่ X14 ทำไม่ได้, GR-1 ต้องคำนวณซ้ำหลัง H11, composite-f03)
- ไม่มี op ใด CUT gate หรือ exit item · ที่ CUT มีเฉพาะส่วนย่อยนอกขอบเขต Phase 2 (V-15 chip-sponsored, geometry 76 เขต, slot-empty) และแถวที่ถูกรวมเข้างานอื่น (H03, H14)
- เส้นวิกฤตฝั่ง agent ถึง playtest แรก (F06-T27 พร้อม): **8 wave (W8–W15)** หรือ 7 wave ถ้า product-manager รับ op O-22 · ปิด phase ราว W18 · เหลือ buffer 7 wave จากเพดาน 25 สำหรับรอบ NEEDS_CHANGES (รอบละราว 2 wave)
- เส้นวิกฤตตามเวลาจริงคือ **งานสนามของคน** ซึ่งยังไม่เริ่มสักงาน (P2-C01, C02, P2-F04-T11) · ฝั่ง agent จะถึง QA gate F06 (W13) ก่อนคนเดินเสร็จ ถ้าคนไม่เริ่มตอนนี้

## 1. ข้อค้นพบตามหัวข้อใน brief

### 1.1 handoff ซ้ำหรือรวมได้ (P2-H01..H16, P2-X01..X25)
- ซ้ำที่ปิดไปแล้ว: X08 → X11 (CUT ถูกต้อง) · H12 ต่อท้าย H03 · H04 → H09 · สาย coverage H07 → H10 → H11 → X25 เสร็จครบ · X05 กับ X19 (typecheck ของ qa/tests/F02) เสร็จทั้งคู่ ไม่ต้องทำอะไร
- **H03 กลายเป็นถุงรวม 4 เรื่องไม่เกี่ยวกัน** (e2e flag, persist.test หลัง H02, route `no_class`/`no_hp`, preview เสิร์ฟ `dist/kw/`) → แยกเป็นส่วน test infra กับส่วน onboarding แล้วรวมเข้างาน gameplay ที่ติดกัน (O-01, O-02)
- **H14** เป็นโมดูลแยกตัวได้ (fetch + sanitize + inject) → โมดูลไป backend, การต่อสายไป F06-T14 (O-03)
- composite-f03 approval (ค้างจาก P2-F05-T04) กับ D-122 เป็นงาน art-director ทั้งคู่ → รวมใน P2-H17 (O-04)
- X20 (ทางเลือก §21), H09 (D-120), handoff GD N-08 ของ F06-T19 (game-director อ่านแบบสอบถาม) รอ game-director ทั้งสาม → รวมเป็น P2-H20 (O-05)

### 1.2 วงวนและ deps ที่ขาด
- วงวนแฝง: F06-T24 อนุมัติ D-120 และ §21 แต่ F06-T24 รอ F06-T09/T10 ที่ต้อง build ตามคำตัดสินนั้น · ถ้าตัดสินกลับด้านใน T24 จะเกิด fix → gate ซ้ำหลัง build (ราว 3 wave) → แก้ด้วย O-05
- ไม่พบวงวนจริงในตาราง (ตรวจ gate F05-T15..T18, F06-T20..T25 และ T26..T29 แล้ว)
- deps ที่ขาด (O-10..O-19): F06-T08 และ T10 ไม่รอ F06-T05 (VFX HP bar/รางวัลก้อนแรก) · F06-T21 ไม่รอ F05-T16 ทั้งที่ตรวจ regression F04/F05 · F06-T23 ไม่รอ H15/H17 (ไอคอนกลางคืน) · F05-T15 ไม่รอ X21/H02 · F05-T17 ไม่รอการแก้ชื่อ key ใน flow F04 · F06-T24 ไม่รอ H20 · P2-CLOSE-QA ไม่รอแถวใหม่
- tech note F06 §9.2 ข้อ 5 ยังมีทางสำรอง "ไม่มีก็ใช้ dungeon เปิดที่ใกล้สุด" ซึ่งขัด spec F06-R37 หลัง X15 (K-11, D-116) · spec อยู่เหนือ tech note ตาม CLAUDE.md แต่ต้องแก้ก่อน tech gate (O-08)

### 1.3 คอขวด gameplay-programmer
- ลำดับที่เสนอ: W7 F05-T10 (+ H03 ส่วน test) → W8 F06-T08 → W9 F06-T09 → W10 F06-T10 (+ H03 ส่วน route) → W11 F06-T14 (+ ต่อสาย H14) → W12–W13 ว่างไว้รับ fix จาก gate
- เหตุผลลำดับ: T08 ต่อจาก F05-T10 ตรง (สรุป run ตอนตาย) และ HP คือความเสี่ยงหลักของ E6 · T09 ต้องรอ home-state (X27, W8) · T10 รอ T08 + T09 · T14 รอ T10 (บรรทัดบทเรียนบนจอพกกระเป๋า N-3) และโมดูล feedback (X29, W10)
- งานที่ย้ายไป backend-programmer เป็น **ไฟล์ใหม่ที่ยังไม่มีใครเขียน** และเป็น pure/test ได้โดยไม่มี DOM ตาม tech note (F06 §9 เสนอ `apps/client/src/home/home-state.ts` ไว้แล้ว) · gameplay เป็นคนต่อสายเข้า UI · ใช้หลักเดียวกับ A-P2-PLAN-01-6 (backend ถือ engine เพื่อลดคอขวด)

### 1.4 งานที่ใหญ่เกิน
- F06-T09, T10, T14 เป็น 3 วันเต็มอยู่แล้ว ถ้ารับ H03/H14 เพิ่มจะเกิน 3 วัน และงาน gameplay 3 วันกลับมา PARTIAL แล้ว 2 ครั้งใน phase นี้ (F04-T21, X21) → ลดขนาดด้วยการแยกโมดูล (O-06, O-07, O-03) แทนการแตกเป็นหลายแถวของ gameplay ซึ่งจะเพิ่ม wave
- F06-T09: หน้า Credits (`apps/client/src/ui/credits*.ts`) และลบข้อมูลในเครื่อง (`apps/client/src/storage/clear-local-data.ts`) มีแล้วจาก X21/T25 → เหลือต่อสายเท่านั้น
- F06-T08: ตัด V-15 chip-sponsored ออก (ไม่มี dungeon ผู้สนับสนุนใน Phase 2) (O-20)

### 1.5 ปทุมวันตก G1 (46.29% < 60%) และบางรักตก G2 (4 < 10) หลัง P2-H11
- **ไม่กระทบ exit item ของ Phase 2 โดยตรง** · G1–G3 เป็นเกณฑ์ความพร้อมเปิดตัวรายย่านของ PRD F01 (ที่มาของ D-083) ไม่อยู่ใน roadmap Phase 2 และไม่อยู่ใน E1–E17
- กระทบทางอ้อม 3 จุด:
  1. **E17** (GR-1 ผ่าน G4/S3 ของ 3 ย่าน) คำนวณใน P2-F04-T18 จากข้อมูลก่อน rerun · กฎสลับข้อ 3 บังคับให้คำนวณซ้ำเมื่อชุดข้อมูลเปลี่ยน → O-09 (P2-X33) · ค่า G4 ใน CSV ใหม่ยังผ่านทั้ง 3 ย่าน (0, 0.0006, 0) จึงคาดว่า E17 ยังผ่าน
  2. **D-083 (Go ของย่านเปิดตัว)** ตัดสินจากปทุมวัน G1 61.42% · ตัวเลขใต้คำตัดสินเปลี่ยน → เป็นคำถามถึงคน (Q-1) ไม่ blocking Phase 2 · P1-E16 บันทึก "F01 = D-083" ไว้แล้ว ถ้าคนยืนคำตัดสินเดิม P1-E16 ไม่ต้องเปิดใหม่
  3. playtest ใช้ PN-2 สวนสันติชัยปราการ (พระนคร) · พระนครยังผ่าน G1 (68.48%) และ G2 = 10 **พอดีขอบ** (ตัดอีก 1 แห่งจะตก) → บันทึกในความเสี่ยง ไม่กระทบ playtest
- ถ้า P2-H16 พบว่ามี record ที่ publish ใน `data/dungeons/` กลายเป็น review/excluded หลัง rerun → เปิด fix ให้ level-designer (data) + location-engineer (artifact) ใน wave ถัดไป (O-21 แบบมีเงื่อนไข) · ตรวจแล้วว่าไปรษณีย์กลาง, ดุสิตอรุณ, One Bangkok ไม่อยู่ใน `data/dungeons/`

### 1.6 งานค้างที่ยกมา
- game-director · §21 ของ balance-model (ทาง ก/ข ของ {areaName}) และ D-120 → ย้ายจาก F06-T24 ขึ้นมาเป็น P2-H20 W8 (O-05) · F06-T24 เหลือเพียงตรวจว่า build ตรงคำตัดสิน
- art-director · composite-f03 approval + D-122 → P2-H17 W8 (O-04) · night visibility ของ in-run ปิดแล้วที่ H15 (ledger แถว 100) แต่จะเห็นผลบนจอจริงก็ต่อเมื่อ client เรนเดอร์ inline SVG (H14) เพราะ `<img>` ไม่รับ currentColor → F06-T23 ต้องรอ F06-T14 ซึ่งรับการต่อสาย H14 (มีอยู่แล้วใน deps) + H17 (O-15)
- uiux · X14 ทิ้งไว้: ชื่อ `nav.approximateDistancePrefix` ใน flow F04 และ wireframe เก่า 04/05 → P2-X30 (O-11)
- tech-lead · follow-up ของ X12 (`scaffold.ts` suffix `_bytes` + test ช่วงค่า) → รวมใน P2-X31 (O-08)
- artist-2d · slot-empty 4 ไฟล์ (P2) → เลื่อน Phase 4 (O-24) · buzz.svg ไม่ตรง manifest.build (ledger แถว 77) → orchestrator รัน validator ของ `tools/art` ถ้ายังตกเปิด fix ให้ artist-2d ใน W8 (O-25 แบบมีเงื่อนไข)

## 2. ตาราง operations

ID ใหม่ที่เสนอ: P2-H20, P2-X27..P2-X33 · ถ้าเลขใดถูกใช้แล้วระหว่างที่ orchestrator แก้ board ให้เลื่อนเลขต่อไปและคงความหมายเดิม · "W" คือ wave ที่เสนอ

### 2.1 merge / split-into / CUT

| Op | ชนิด | เป้าหมาย | รายละเอียด | เหตุผล |
| --- | --- | --- | --- | --- |
| O-01 | split-into + merge | P2-H03 (ส่วน test infra) | ส่วน (ก) e2e query flag ข้าม f04App, (ข) `persist.test.ts` คาดว่าไม่มี `latestSample`, (ค) `configurePreviewServer` เสิร์ฟจาก `dist/kw/` → **รวมเป็น addendum ของ P2-F05-T10** ถ้ายังทำอยู่ ถ้า T10 ส่งรายงานแล้วให้รวมเข้า P2-F06-T08 | root test แดงจาก persist.test อยู่ตอนนี้ (ledger แถว 97) และ F05-T10 ถือ `apps/client/` ใน wave นี้ · งานเล็กรวมไม่ถึงครึ่งวัน ไม่ควรกิน 1 wave ของคอขวด |
| O-02 | split-into + merge | P2-H03 (ส่วน route) | route `no_class` → เปิด sheet เลือกพลัง และ `no_hp` → `dungeon.checkinNoHp` ตามคำตัดสินใน P2-H20 → **รวมเข้า P2-F06-T10** (sheet เลือก class อยู่ใน onboarding) · deps เพิ่ม P2-H20 | ส่วนนี้ขึ้นกับ D-120 ซึ่งยังไม่อนุมัติ และ sheet เลือก class สร้างใน T10 อยู่แล้ว |
| O-03 | CUT-with-reason (รวมงาน) + split-into | P2-H14 | สถานะ CUT "รวมใน P2-X29 + P2-F06-T14" · โมดูล `setIconGlyph` (fetch, cache ต่อ session, sanitize allowlist, inject, `aria-hidden`, fallback `setIconImg`, เช็ค `tintable === true`) ไป P2-X29 · การต่อสายกับ `icon.ui.grace`, `icon.ui.closed`, `icon.ui.in-run` ไป F06-T14 | โมดูลแยกตัวได้และ test ได้โดยไม่มี UI · ลด gameplay 1 wave · ไม่ใช่ gate |
| O-04 | (ยกเลิก) | composite-f03 approval | ไม่ต้องทำ: P2-H17 (DONE) ตัดสิน composite-f03 แล้ว และ P2-X26 (artist-2d, กำลังทำ) แก้ V-26/V-27 แล้วตั้ง approved · F06-T23 รอ H17 + X26 แทน | ซ้ำกับงานที่มีอยู่ (แจ้งโดย orchestrator ตอน apply) |
| O-05 | split-into + merge | F06-T24 (ส่วนตัดสิน) + P2-X20 + P2-H09 + handoff GD N-08 ของ F06-T19 | งานใหม่ **P2-H20** (game-director, 1 วัน, W8): (1) อนุมัติ/ปฏิเสธ D-120 (2) เลือกทาง ก/ข ของ balance-model §21 (ทีมแนะนำ ข: เลิกระบุชื่อเขตที่ผู้เล่นยืน · ทาง ก เลื่อนไป Phase 3 ตาม O-23) (3) อ่านร่างแบบสอบถาม `product/playtest/phase-2-questionnaire.md` แล้วให้ความเห็น (ไม่แก้ไฟล์ของ PM) · writes `design/reviews/P2-H20-decisions.md` · deps: P2-X20, P2-H09, P2-F06-T19 (DONE ทั้งหมด) | คำตัดสินต้องมาก่อน build ไม่ใช่หลัง gate (1.2) · game-director ว่างจนถึง F05-T18 (W11) |
| O-06 | split-into | F06-T09 | งานใหม่ **P2-X27** (backend-programmer, 1–2 วัน, W8): `apps/client/src/home/home-state.ts` + test ตาม tech note F06 §9.1–9.2 (unknown / out_of_area / far + temporarilyClosed / outside_launch_district / near) โดยข้อ 5 ใช้ spec F06-R37 (ไม่มีทางสำรองนอกช่วงเลเวล) · pure ไม่มี DOM ไม่มีพิกัดใน log · writes `apps/client/src/home/` · deps P2-F06-T04, P2-H01, P2-X20 · F06-T09 เหลือจอ + ลงทะเบียนความสนใจ + consent/age gate + ต่อสาย Credits และปุ่มลบข้อมูลที่มีอยู่แล้ว | tech note เสนอโมดูล pure นี้ไว้แล้ว · ลด T09 ให้อยู่ใน 3 วัน · backend ว่าง |
| O-07 | split-into | F06-T10 | งานใหม่ **P2-X28** (backend-programmer, 1–2 วัน, W9): `apps/client/src/onboarding/` ตัวเดินขั้น onboarding แบบ pure (intro → age → consent → permission → map → class → run แรก → รางวัลก้อนแรกจาก `run_tick_granted.firstEver` เท่านั้น) + guard ระบบที่ห้ามสอนจาก `unlocks.json` + test · ไม่มี code path รางวัลแยก (GD B-07) · deps P2-F06-T04, P2-F06-T06 · F06-T10 เหลือ UI + ต่อสาย + e2e | ตรงสัญญา `kw.p2.onboarding` ใน tech note F06 §8 · ทำให้ T10 รับ H03 ส่วน route ได้โดยไม่เกิน 3 วัน |
| O-08 | split-into | F06-T04 (ส่วนที่ค้าง) + follow-up X12 | งานใหม่ **P2-X31** (tech-lead, 0.5–1 วัน, W9): แก้ tech note F06 §9.2 ข้อ 5 ให้ตรง R37/K-11/D-116 และตรวจการอ้าง R37 จุดอื่นในเอกสาร · `tools/config-lint/src/scaffold.ts` suffix `_bytes` + test ช่วงค่า · writes `docs/tech/F06-hp-damage-onboarding.md`, `tools/config-lint/` · ถ้าผล P2-C02 มาถึงก่อน W9 ให้ P2-C03 เข้าช่องนี้ก่อนแล้ว X31 เลื่อนไป W10 | tech note ขัด spec · tech gate F06 จะตกถ้าเอกสารกับโค้ดไม่ตรงกัน |
| O-26 | split-into | F06-T14 + P2-H14 (ส่วนโมดูล) | งานใหม่ **P2-X29** (backend-programmer, 2–2.5 วัน, W10): (ก) `apps/client/src/feedback/` fire-together 4 ชั้น (ภาพ/สั่น/เสียง, push = ไม่มี) + priority queue ตาม `audio/cue-list.md` §4 (cue ความปลอดภัยชนะเสมอ) + fallback เมื่อไม่มี `navigator.vibrate` (ข) ตัวคุม Wake Lock: feature detection, ขอใหม่เมื่อถูกปล่อย, นับเวลาที่ถือและเวลา page hidden ต่อ run สำหรับ telemetry (ค) `apps/client/src/assets/icon-glyph.ts` ตาม O-03 · ทุกส่วน inject API ของเบราว์เซอร์ได้ test ใน happy-dom · ไม่แก้ `apps/client/src/debug/` (probe ของ T10) · writes `apps/client/src/feedback/`, `apps/client/src/assets/icon-glyph.ts`, `apps/client/src/assets/icon-glyph.test.ts` · deps P2-F06-T13, P2-H13 · F06-T14 เหลือจอพกกระเป๋า + ต่อสาย + e2e | T14 เหลือราว 2 วัน รับการต่อสาย H14 ได้ |
| O-11 | split-into | P2-X14 (ส่วนที่ทำไม่ได้เพราะนอก writes) | งานใหม่ **P2-X30** (uiux-designer, 0.5 วัน, W9): flow F04 เปลี่ยน `nav.approximateDistancePrefix` → `nav.distanceApprox` ทุกจุด · wireframe เก่าชุด 04/05 ของ F03 ติดหมายเหตุ "ถูกแทนด้วย F04-*/F05-*" หรือแก้ key ให้ตรง · writes `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/04-*.html`, `design/ux/wireframes/05-*.html` | copy gate F05-T17 ตรวจ key บนจอเทียบ flow · ถ้าไม่แก้ gate จะตกด้วยเรื่องเอกสาร |
| O-27 | split-into | P2-X20 (ผลตามคำตัดสิน) | งานใหม่ **P2-X32** (narrative-designer, 0.5 วัน, W9): แก้ `home.outsideLaunchBody` และ key ที่เกี่ยวตามทางที่ P2-H20 เลือก (ทาง ข = ไม่มี `{areaName}`) · รัน lint:copy · writes `config/content/copy.th.json` · deps P2-H20 · ถ้า H20 เลือกทาง ก ให้ CUT แถวนี้และเปิดงาน geometry ให้ location-engineer แทน (คาดว่าเกิน Phase 2 ดู O-23) | F06-T09 (W9) ใช้ key นี้ · F06-T22 ตรวจ copy นี้ |
| O-20 | CUT-with-reason (ส่วนย่อย) | F06-T08 acceptance ข้อ 3 | ตัด V-15 chip-sponsored ออกจาก F06-T08 · เลื่อนไป Phase ที่มี dungeon ผู้สนับสนุน (F13/F14 หรือ live-ops) · แก้แถว 1.9 "V-20 ขอบ toast, V-22 gps-pill, V-15, V-16" ให้ V-15 = เลื่อน | Phase 2 ไม่มีข้อมูลผู้สนับสนุนและ liveops ไม่มีงาน · ไม่ใช่ gate/exit |
| O-23 | CUT-with-reason (ส่วนย่อย, มีเงื่อนไข) | ทาง ก ของ balance-model §21 | ถ้า P2-H20 เลือกทาง ข: geometry ทุกเขต 76 เขตสำหรับ `{areaName}` เลื่อนไป Phase 3 (ต้องมีตัวเลือกเขตฝั่ง server อยู่แล้ว) · ไม่มีแถวบน board ให้ CUT เพิ่ม บันทึกใน change log และหัวข้อ 1.9 | systems แนะนำทาง ข ก่อนอยู่แล้ว (X20) · ทาง ก เพิ่มงาน location + asset ขนาดใหญ่ที่ไม่ช่วยตอบคำถามของ playtest |
| O-24 | CUT-with-reason (ของค้าง) | artist-2d slot-empty 4 ไฟล์ | เลื่อน Phase 4 (อุปกรณ์/cosmetic ถูกเลื่อนไป Phase 4 แล้วในหัวข้อ 1.9) · ไม่มีแถว ให้บันทึกใน change log | ไม่มีจอใช้ใน Phase 2 |
| O-21 | split-into (มีเงื่อนไข) | P2-H16 | ถ้า H16 รายงานว่ามี record ที่ publish แล้วต้องย้ายเป็น review/excluded: เปิด X ให้ level-designer (`data/dungeons/`) แล้ว location-engineer (artifact ผ่าน `tools/dungeons`) ใน 2 wave ถัดไป และ P2-X33 รอ X นั้น · ถ้าไม่มี ไม่ต้องทำอะไร | ข้อมูล client ต้องตรงคำตัดสินพื้นที่ (D-109) |
| O-25 | split-into (มีเงื่อนไข) | ของค้าง ledger แถว 77 | orchestrator รัน `tools/art` validator · ถ้า buzz.svg ยังไม่ตรง `manifest.build.json` เปิด X ให้ artist-2d (`art/assets/icon/`, manifest ผ่าน tools/art) ใน W8 | visual gate และ asset test ต้องเขียว |
| O-09 | split-into | F04-T18 (คำนวณซ้ำตามกฎสลับข้อ 3) | งานใหม่ **P2-X33** (product-manager, 1 วัน, W10): GR-1 ของ 3 ย่านจาก coverage SHA 3c75c91e เทียบ G4/S3 · อัปเดตหลักฐาน E17 · ส่งตัวเลขให้คำถาม Q-1 · writes `product/metrics.md` · deps P2-H11, P2-H16 | ข้อมูลเปลี่ยนหลัง T18 · E17 เป็น exit item |

### 2.2 set-deps (เพิ่ม = +, ลบ = −)

| Op | งาน | Deps ใหม่ (เต็มแถว) | เหตุผล |
| --- | --- | --- | --- |
| O-10 | P2-F05-T15 | เดิม + P2-X21, P2-H02 | tech gate ตรวจ "storage ไม่มีพิกัดหลังจบ run" ซึ่งปิดที่ H02 และ adapter จริงที่ X21 · ส่วน test ของ H03 ไปกับ F05-T10 แล้ว (O-01) |
| O-12 | P2-F05-T17 | P2-F04-T21, P2-F05-T10, **P2-X30** | copy gate เทียบ key บนจอกับ flow F04 ที่ต้องแก้ชื่อ key ก่อน |
| O-13 | P2-F05-T18 | เดิม + **P2-H20** | D-120 (check-in reject) เป็นพฤติกรรมของ F04 · design gate ต้องเห็นคำตัดสินก่อน |
| O-14 | P2-F06-T08 | เดิม + **P2-F06-T05** (+ ส่วน test ของ H03 ถ้า F05-T10 ไม่ได้รับไป) · acceptance ข้อ 3 ตัด V-15 (O-20) | แถบ HP ใช้ `art/vfx/hp-bar`, `hp-critical` ของ F06-T05 |
| O-16 | P2-F06-T09 | เดิม + **P2-X27**, **P2-H20**, P2-F05-T04 · (X32 ทำใน wave เดียวกัน ใช้ assumption ตามคำตัดสิน H20 ไม่ใส่เป็น deps) | home-state มาจาก X27 · `{areaName}` ขึ้นกับทาง ก/ข · อวตารบนจอบ้านมาจาก F05-T04 |
| O-17 | P2-F06-T10 | เดิม + **P2-X28**, **P2-H20**, **P2-F06-T05** · รับ H03 ส่วน route (O-02) | ตัวเดินขั้นจาก X28 · D-120 · effect รางวัลก้อนแรกอยู่ใน F06-T05 |
| O-18 | P2-F06-T14 | P2-F06-T13, P2-F06-T10, P2-F06-T05, P2-F04-T17, **P2-X29**, **P2-H13** · รับการต่อสาย H14 (O-03) | โมดูล feedback/Wake Lock/icon-glyph จาก X29 · field `tintable` จาก H13 |
| O-19 | P2-F06-T20 | เดิม + **P2-X27, P2-X28, P2-X29, P2-X31** | tech gate ต้องตรวจโมดูลที่ backend เขียนใน `apps/client/` และ tech note ที่แก้แล้ว |
| O-29 | P2-F06-T21 | P2-F06-T20, P2-F06-T17, **P2-F05-T16** | QA gate F06 ตรวจ regression F04/F05 ต้องมีผล QA gate F04+F05 ก่อน |
| O-30 | P2-F06-T22 | เดิม + **P2-X32** | copy จอนอกย่านเปิดตัวต้องเป็นฉบับตามคำตัดสิน |
| O-15 | P2-F06-T23 | เดิม + **P2-H15, P2-H17** | ไอคอน in-run กลางคืน (H15) และ D-122/composite-f03 (H17) ต้องปิดก่อน visual gate |
| O-31 | P2-F06-T24 | เดิม + **P2-H20** · คอลัมน์ Output: ลบ "(จาก H09) อนุมัติ/ปฏิเสธ D-120" เปลี่ยนเป็น "ตรวจว่า build ตรงคำตัดสิน P2-H20 (D-120, §21)" | คำตัดสินย้ายไป H20 · gate ยังอยู่ครบ |
| O-22 | P2-F06-T25 (ทางเลือก ต้องให้ product-manager รับก่อน) | P2-F06-T21, P2-F06-T22, P2-F06-T23, P2-F04-T17, P2-F04-T02 (**− P2-F06-T24**) · รันใน wave เดียวกับ F06-T24 · orchestrator ติด E8 เป็น DONE เมื่อ T24 และ T25 PASS ทั้งคู่ · ถ้า T24 ได้ NEEDS_CHANGES ที่กระทบ E8 ให้ T25 ตรวจซ้ำเฉพาะ E8 | ประหยัด 1 wave บนเส้นวิกฤต · ไม่ตัด gate · แต่เปลี่ยนเงื่อนไข PM-S2 ที่ PM ขอไว้ใน plan review จึงต้องให้ PM ยืนยัน (ใส่ใน brief ของ T25 หรือ X33) ถ้าไม่รับ ให้คง deps เดิม |
| O-32 | P2-CLOSE-QA | เดิม + P2-H16, P2-H17, P2-H20, P2-X27..P2-X33 (+ P2-H08 ถ้าไม่ถูกเลื่อนตาม O-41) | E12 "ทุก task DONE/CUT" ต้องนับแถวใหม่ |

### 2.3 reorder

| Op | งาน | จาก → ไป | เหตุผล |
| --- | --- | --- | --- |
| O-40 | แผน wave หัวข้อ 3 ของ board | แทนตาราง W8–W17 ด้วยตารางในหัวข้อ 3 ของเอกสารนี้ | แผนเดิมไม่มีแถว H/X และ gameplay อยู่คนละ wave กับที่เป็นจริง |
| O-41 | P2-H08 (qa) | ไม่มี wave → **W10** (ช่องว่างของ qa ระหว่าง F05-T16 กับ F06-T17) · ถ้าช่อง W10 ต้องใช้กับ fix จาก gate F04+F05 ให้ CUT-with-reason "เลื่อน Phase 3: ข้อจำกัดภาพของ P1-H06 ไม่ใช่ exit item ของ Phase 2" | qa เป็นคอขวดที่สอง · H08 ไม่อยู่บนเส้นทางถึง playtest |
| O-42 | P2-F05-T17 (narrative) | W8 → **W10** | รอ X30 (W9) · F05-T18 ต้องการผลใน W11 จึงไม่เสียเวลา |
| O-43 | P2-C03, P2-F06-T12 (tech-lead) | ตามแผนเดิม W9/W10 → **ช่องแรกของ tech-lead หลังคนส่งผลสนาม** ใน W9–W11 แทน X31 (X31 เลื่อนได้) · F06-T12 ต้องเสร็จไม่เกิน W11 เพราะ W12 เป็น F06-T20 | สองงานนี้กั้น F06-T26 |
| O-44 | fix จาก gate F04+F05 ที่เป็นของ gameplay | กฎใหม่ (ต่อกฎสลับข้อ 6–7): fix ขนาด ≤ 0.5 วัน ต่อท้ายงาน gameplay ถัดไปใน W9–W11 เป็น addendum · fix ที่ใหญ่กว่าใช้ช่อง gameplay W12 แล้วรัน gate ซ้ำ W13 | กันไม่ให้ fix เล็กดันงาน F06 ออกไปทีละ wave |
| O-45 | HUMAN P2-C01, P2-C02, P2-F04-T11 | ยังไม่เริ่ม → **เริ่มทันที** · C01 ก่อน (5–10 นาที) แล้ว C02 กับ F04-T11 ในการออกเดินครั้งเดียวกัน (ช่วงเช้าหรือเย็นตาม D-093 · F04-T11 15–25 นาทีแรก แล้วต่อ C02) · คงเป็นสองแถวเพราะ acceptance ต่างกัน | ทั้งสองสายกั้น F06-T26 ผ่าน C03 → C05 และ F06-T12 · ต้องได้ผลก่อน W10 เพื่อไม่ให้ playtest รอคน |

## 3. แผน wave ที่เสนอ (W8–W18)

ตรวจแล้ว: ไม่เกิน 6 งานต่อ wave, 1 งานต่อ agent, deps เสร็จใน wave ก่อนหน้า · Writes ใน `apps/client/` แยกระดับโฟลเดอร์: ใน wave ที่ backend ถือ `apps/client/src/home/` (W8), `apps/client/src/onboarding/` (W9), `apps/client/src/feedback/` + `apps/client/src/assets/icon-glyph*.ts` (W10) งาน gameplay ใน wave นั้นห้ามแตะ path เหล่านั้น · [ ] = แทรกเมื่อ deps ครบ

| W | งาน agent | งานคน / งานที่แทรกได้ | หมายเหตุ |
| --- | --- | --- | --- |
| W7 (กำลังรัน) | F05-T10 (+ H03 ส่วน test, O-01), F04-T22, F06-T05, H16 และที่ orchestrator dispatch แล้ว | **C01 ทันที → C02 + F04-T11** (O-45) | — |
| W8 | **F06-T08** (gp), **X27** (be), F05-T15 (tl), F05-T11 (qa), **H20** (gd), **H17** (ad) | [O-25 artist ถ้า validator ตก → W9–W11] | `apps/client/src/home/` = X27 |
| W9 | **F06-T09** (gp), **X28** (be), F05-T16 (qa), **X30** (uiux), **X32** (nar), **X31** หรือ C03 (tl) | [O-21 level ถ้า H16 ต้องแก้ data] | `copy.th.json` = X32 · `apps/client/src/onboarding/` = X28 |
| W10 | **F06-T10** (gp, + H03 ส่วน route), **X29** (be), F05-T17 (nar), H08 (qa), **X33** (pm), C03 / F06-T12 / X31 (tl) | [C04 location ถ้ามี C02] | `apps/client/src/feedback/`, `icon-glyph*` = X29 |
| W11 | **F06-T14** (gp, + ต่อสาย H14), F06-T17 (qa), F05-T18 (gd), F06-T12 (tl) | [C04, F05-T12 systems เมื่อ C03 + C04] | F06-T12 ต้องจบใน W11 |
| W12 | **F06-T20** (tl), F06-T22 (nar), F06-T23 (ad), [gp: fix จาก gate ตาม O-44] | [C06 qa, F05-T13 location] | — |
| W13 | **F06-T21** (qa), [gp fix], [gate F04+F05 รอบ 2 ถ้ามี] | **HUMAN F06-T26** เมื่อ F05-T16 + F06-T21 PASS, C05 = Go, F06-T12 DONE | — |
| W14 | **F06-T24** (gd) [+ F06-T25 ถ้ารับ O-22] | [F05-T19 tl] | — |
| W15 | **F06-T25** (pm) | **HUMAN F06-T27** หลัง T24 + T25 PASS | ถ้ารับ O-22 wave นี้ว่าง และ T27 เริ่มหลัง W14 |
| W16 | F06-T28 (pm), [C06 ถ้ายังไม่ทำ] | HUMAN F06-T29 · HUMAN C07 หลัง C06 | — |
| W17 | P2-CLOSE-QA (qa), P2-C08 (producer) | — | C08 ต้องมี C05, C06, C07 |
| W18 | P2-CLOSE-PM (producer) | — | ปิด phase |

### 3.1 Critical path ถึง playtest แรก
1. **ฝั่ง agent (gameplay + gate):** F05-T10 (W7) → F06-T08 (W8) → F06-T09 (W9) → F06-T10 (W10) → F06-T14 (W11) → F06-T20 (W12) → F06-T21 (W13) → F06-T24 (W14) → F06-T25 (W15) → HUMAN F06-T27
   - เหลือ **8 wave (W8–W15)** จนพร้อม F06-T27 · **7 wave** ถ้ารับ O-22 · F06-T26 (smoke) พร้อมหลัง W13 (6 wave)
   - ปิด phase ราว **W18** (11 wave หลัง W7) · buffer 7 wave ถึงเพดาน 25 · gate บนเส้นวิกฤตได้ NEEDS_CHANGES หนึ่งครั้งกิน ~2 wave (fix + ตรวจซ้ำ) จึงรับได้ราว 3 รอบก่อนชนเพดาน
2. **สายโมดูลของ backend (slack 0):** X27 (W8) → F06-T09 (W9) · X28 (W9) → F06-T10 (W10) · X29 (W10) → F06-T14 (W11) · ถ้า X ใดกลับมา PARTIAL ให้งาน gameplay ที่รอรับส่วนที่เหลือเข้า writes ของตัวเอง (เพิ่มโฟลเดอร์นั้นใน Writes) แทนการรอ ไม่ต้องเรียก producer
3. **สายตัดสินใจ:** H20 (W8) → X32 (W9) → F06-T22 (W12) · H20 → F06-T09 (W9), F06-T10 (W10), F05-T18 (W11), F06-T24 (W14)
4. **สายสนาม (เส้นวิกฤตตามเวลาจริง):** HUMAN C01 → HUMAN C02 + F04-T11 → C03 (tl, 1 wave) → HUMAN C05 · และ F06-T12 (tl, 1 wave) → F06-T26 · ต้องได้ผลสนามก่อน dispatch W10 ไม่เช่นนั้น F06-T26 จะรอคนแม้ agent พร้อมแล้ว · wave ของ agent ใช้เวลาราวชั่วโมงถึงไม่กี่ชั่วโมง (ledger W5–W7) ส่วนการเดินต้องเป็นช่วงเช้า/เย็น (D-093) จึงคาดว่า **playtest จะรอคนมากกว่ารอ agent**
5. **สาย speed filter (ไม่กั้น playtest แต่กั้นการปิด phase):** C03 + C04 → F05-T12 → F05-T13 → F05-T19 → P2-CLOSE-QA

## 4. สิ่งที่ห้าม CUT แต่เสี่ยง (แจ้งคน ไม่มี op ตัด)

- **E4 และ E12 ขึ้นกับการเดินของคน:** E4 ใช้ผลเครื่องจริงใน P2-C03 · E12 ต้องการ speed filter review (F05-T19) ซึ่งรอ C03 + C04 · ถ้าไม่มีการเดิน P2-C02 เลย phase ปิดไม่ได้ ทางผ่อน (เช่น ใช้ trace synthetic อย่างเดียว) เป็นการเปลี่ยนเกณฑ์ปิด ต้องเป็นคำตัดสินของคน · producer ไม่เสนอให้ผ่อนตอนนี้
- **E17** ขึ้นกับผล P2-X33 · ถ้า GR-1 ของย่านใดเกิน G4/S3 หลัง rerun ต้องมีคำตัดสินของคนตามถ้อยคำของ E17
- **F06-T24** ไม่ได้ถูกตัด เพียงย้ายส่วน "ตัดสิน D-120/§21" ขึ้นไป H20 · gate ยังตรวจว่า build ตรงคำตัดสิน
- **O-22** เปลี่ยนลำดับ product gate กับ design gate (ไม่ตัด gate) แต่ต้องให้ product-manager รับ เพราะเป็นเงื่อนไข PM-S2 ของ plan review

## 5. คำถามถึงคน

| ID | คำถาม | ตัวเลือก | ทีมแนะนำ | Blocking |
| --- | --- | --- | --- | --- |
| Q-1 | หลัง rerun coverage (P2-H11) ปทุมวันตก G1 (46.29% < 60%) และบางรักยังตก G2 (4 < 10) · Go ของ 3 ย่านเปิดตัวใน D-083 ยังใช้อยู่หรือไม่ | (ก) คง D-083 ไว้ ตรวจใหม่ก่อน closed beta โดยใช้ทางที่ level-designer เสนอใน P2-H16 (ข) เร่งตรวจภาคสนามสถานที่ที่พักไว้ (One Bangkok, สวนดุสิตอรุณ) ภายใน Phase 2 (ค) เปลี่ยนย่านเปิดตัว | **(ก)** รอข้อเสนอของ H16 · ไม่กระทบ playtest ที่ PN-2 พระนคร และไม่อยู่ในเกณฑ์ปิด Phase 2 · (ข) เพิ่มงานเดินของคนซึ่งเป็นคอขวดอยู่แล้ว | ไม่ (สำหรับ Phase 2) |
| Q-2 | วันที่ออกเดิน P2-C02 + P2-F04-T11 (ทำครั้งเดียวกันได้) และ P2-C01 ก่อนหน้า | ระบุวันและช่วง (เช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 ตาม D-093) | ภายใน 1–2 วัน เพื่อให้ผลถึงก่อน W10 | ใช่ สำหรับ F06-T26/T27 (ไม่กั้นการ build) |

เตือนความจำ (ไม่ใช่คำถาม): P2-C07 ขั้น 1 (ตรวจหน้า Billing) ทำได้ทุกเมื่อ

## 6. ข้อความสำหรับ change log ของ board (orchestrator คัดลอก)

| 2026-09-27 | producer (P2-PLAN-SYNC-W7) | plan-sync W7: เพิ่ม P2-H20, P2-X27..X33 (8 แถว) · H03 แยกรวมเข้า F05-T10 + F06-T10 และ H14 รวมเข้า X29 + F06-T14 (CUT แบบรวมงาน 2 แถว) · composite-f03 รวมใน H17 · deps ใหม่ 13 แถว (O-10..O-32) · ตัดส่วนย่อยนอกขอบเขต: V-15 chip-sponsored, geometry 76 เขต (ถ้า H20 เลือกทาง ข), slot-empty · H08 → W10 · แผน wave W8–W18 · ไม่มีการตัด gate หรือ exit item · คำถามคน Q-1 (D-083 หลัง G1/G2), Q-2 (วันเดิน) |
