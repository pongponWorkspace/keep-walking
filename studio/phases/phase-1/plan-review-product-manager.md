# Plan Review — Phase 1 Board (มุม product-manager)

Task: P1-PLAN-REV-PM · ผู้ตรวจ: product-manager · วันที่: 2026-09-23
ขอบเขต: `studio/phases/phase-1/board.md` ฉบับ DRAFT (P1-PLAN-01, 60 task) เทียบกับ `studio/roadmap.md` Phase 1, `studio/protocol.md`, `CLAUDE.md` (metrics ที่ GDD ขอ) และ GDD หัวข้อ "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม", "10 นาทีแรกของคนใหม่", "ความเสี่ยงที่ต้องเฝ้าดู", "กลยุทธ์การเปิด", "แผนงาน" (M0, M1)

## 1. Verdict

**NEEDS_CHANGES** — ทิศทางของ board ถูกต้อง ไม่มี scope ที่ขัด GDD และไม่มี dark pattern แต่มี must-fix 4 ข้อที่กระทบความน่าเชื่อถือของผล Go/No-go และการปิด phase ทุกข้อแก้ได้ด้วยการเพิ่ม acceptance/dependency บน board โดยไม่ต้องวางแผนใหม่

สรุปจำนวน: must-fix 4 · should-fix 7 · nice-to-have 2

## 2. ผลตรวจตามรายการที่ได้รับมอบ

| หัวข้อ | ผล | หมายเหตุ |
| --- | --- | --- |
| เกณฑ์ Go/No-go ของ F01 เป็นตัวเลข | ผ่าน | P1-F01-T03 (PRD, product-manager) บังคับตั้งเกณฑ์ตัวเลขล่วงหน้าก่อนเห็นข้อมูลจริง ตรงเจตนา "ไม่ลำเอียงหลังเห็นข้อมูล" |
| เกณฑ์ Go/No-go ของ F02 เป็นตัวเลข | ต้องแก้ | ไม่มีงานใดกำหนดตัวเลขเกณฑ์ผ่าน (FPS, แบต/30 นาที, data ที่โหลด, accuracy) ไว้ล่วงหน้าโดย tech-lead/product-manager ถูกผลักไปเป็นทางเลือกสำรองของ qa-tester ที่ W7 (ดู PM-M01) |
| งาน metrics framework + telemetry event ตั้งขอบเขตถูกไหม | ผ่านโดยมีข้อเสนอ | P1-F03-T19 มี north star + guardrail และ event หลักของ Phase 1–2 ครบแนวคิด แต่ยังไม่ครบ 6 หมวดที่ CLAUDE.md ขอ และ event onboarding เขียนกว้างเกินไป (PM-S01, PM-S02, PM-S07) |
| หลักฐานการเลือกย่านเปิดตัว | ผ่าน | F01-T06/T07 (location-engineer, level-designer) ให้ตัวเลขรายเขต + heatmap + คะแนนตาม launch-criteria ก่อนสรุป และ product gate (T10) ตรวจกับ PRD ไม่ใช่ตัดสินเอง ตรงอำนาจตาม protocol ข้อ 5 |
| ตำแหน่ง product gate | ผ่านโดยมีข้อเสนอ | F01 มี product gate ตรงจุด (T10) · F02/F03 ไม่มี product gate ซึ่งสมเหตุสมผลเพราะเป็นงาน infra/design ล้วน แต่ผลของ M1 กระทบ player experience โดยตรง ควรมี PM ร่วม sign-off ผลสรุป spike ก่อนส่ง HUMAN (PM-S06) |
| exit checklist ตรงกับ roadmap | ต้องแก้ | E11 ขัดกับเงื่อนไขที่ P1-F02-T02 เขียนไว้เอง (PM-M03) และ E18 อ้างอิง task ที่ไม่มีอยู่จริงในตาราง (PM-M04) |
| Phase 1 over-scope เทียบ "พิสูจน์ความเสี่ยงก่อน" | ต้องแก้บางส่วน | F01/F02 ไม่เกินขอบเขต แต่ F03 มีบางงานลึกเกินสิ่งที่ต้องพิสูจน์ใน phase นี้ (PM-S04, PM-N01) |
| Dark pattern / ไม่มี IAP | ผ่าน | ไม่มีเนื้อหาเกี่ยวกับเงินจริงหรือ sponsor ใน Phase 1 · P1-F03-T20 แยกรายการที่เกี่ยวเงินจริงเป็น HUMAN ไว้แล้ว |

ตรวจ Writes ของ product-manager (T03, T10, T19) แล้ว: ตรงกับ path ที่ CLAUDE.md มอบให้เจ้าของ (`product/prd/`, `product/reviews/`, `product/metrics.md`, `product/telemetry-events.md`) ไม่มีงานอื่นเขียนทับ

## 3. Must-fix

### PM-M01 — F02 ไม่มีเกณฑ์ตัวเลข Go/No-go ของ map/location spike ที่ตั้งไว้ล่วงหน้า
- Task: P1-F02-T03 (ต้นเหตุ) · กระทบ P1-F02-T09, T10, T11, T14, T21, T23
- ปัญหา: GDD ระบุว่า M1 คือจุดเสี่ยงสูงสุดของ phase ("ถ้า M1 ไม่ผ่าน แผนทั้งหมดต้องรื้อ") วัด FPS, แบตต่อ 30 นาที, data ที่โหลด, accuracy ในสวนและในซอย แต่ไม่ได้ให้ตัวเลขเกณฑ์ผ่านไว้ ฝั่ง board ก็ไม่มีงานใดกำหนดตัวเลขเหล่านี้ล่วงหน้า acceptance ของ P1-F02-T14 (field-walk kit, qa-tester, W7) เขียนแค่ "เกณฑ์ผ่าน...เขียนไว้ล่วงหน้า (ค่าจากทีม tech...ถ้าไม่มีให้เสนอและติดธง assumption)" คือผลักภาระตั้งเกณฑ์ไปให้ qa-tester ในนาทีสุดท้ายก่อนเดินทดสอบจริง (W7 จาก 10 wave) ซึ่งสายเกินกว่าจะมีผลต่อการ build (T09–T11 สร้างเสร็จไปแล้วโดยไม่มีเป้าให้เล็ง) และไม่ใช่ผู้มีอำนาจตัดสินใจที่ถูกต้องตาม protocol ข้อ 5 (metric = product-manager, สถาปัตยกรรม/perf = tech-lead)
- เทียบกับ F01: P1-F01-T03 (PRD) บังคับให้ product-manager ตั้งเกณฑ์ตัวเลข Go/เสริม/No-go ไว้ก่อนเห็นข้อมูลอย่างชัดเจน แต่ F02 ไม่มีงานคู่ขนานแบบเดียวกันเลย ทั้งที่ F02 คือความเสี่ยงอีกครึ่งหนึ่งของ phase
- ข้อเสนอ:
  1. เพิ่ม acceptance ใน P1-F02-T03 (tech note, W1–W2, tech-lead): ตั้งตัวเลขเกณฑ์ผ่าน/ไม่ผ่านของ spike ไว้ล่วงหน้า เช่น FPS เฉลี่ยขั้นต่ำระหว่างเดิน, แบตที่ใช้ได้ต่อ 30 นาทีก่อนเสียประสบการณ์ (อิงว่าเกมต้องเปิดจอค้างระหว่างเดิน), ขนาด data เริ่มต้นที่โหลดได้บนเน็ตมือถือทั่วไป, accuracy median/p90 ที่ยังให้ movement gate 50 ม./5 นาทีทำงานถูกต้องโดยไม่เกิด false positive/negative มากเกินไป
  2. ให้ P1-F02-T03 ระบุ product-manager เป็นผู้ร่วมยืนยันตัวเลขเหล่านี้ (ไม่ใช่แค่ tech-lead คนเดียว) เพราะเป็นเกณฑ์ที่กระทบว่าเกมเล่นได้จริงในมือผู้เล่นหรือไม่ ไม่ใช่แค่เกณฑ์วิศวกรรม
  3. P1-F02-T14 เปลี่ยนจาก "เสนอเกณฑ์เองถ้าไม่มี" เป็น "คัดลอกเกณฑ์จาก tech note มาใส่ฟอร์ม" เท่านั้น
- Severity: must-fix

### PM-M02 — ลำดับ gate ของ F01 ผิด: Design/Product gate ไม่รอ QA gate ตรวจความถูกต้องของตัวเลขก่อน
- Task: P1-F01-T08, T09, T10
- ปัญหา: P1-F01-T09 (design gate) และ P1-F01-T10 (product gate) มี deps แค่ P1-F01-T07 (coverage report) ไม่ได้ deps P1-F01-T08 (QA gate) ทั้งที่ QA gate มีหน้าที่ตรวจว่า "รันซ้ำได้ผลตรงกัน และตัวเลขใน report ตรงกับ `district-counts.csv`" คือตรวจความถูกต้องของข้อมูลตั้งต้นที่ Design/Product gate ใช้ตัดสินใจ ถ้าปล่อยให้สามงานนี้ขนานกันตาม wave plan ปัจจุบัน (W8: T09, T10 ก่อน · W9: T08 ทีหลัง) มีความเสี่ยงที่ Design/Product gate จะ PASS คำแนะนำ Go/No-go ที่อิงตัวเลขซึ่งภายหลัง QA พบว่าผิด (NEEDS_CHANGES) ทำให้ level-designer ต้องแก้ report แล้ว Design/Product gate ต้องตรวจซ้ำอยู่ดี เสียเวลาไปฟรี และเสี่ยงให้คำแนะนำที่ยังไม่ผ่าน QA หลุดไปถึง HUMAN (แม้ T11 จะรอครบทั้งสามgate แต่กระบวนการระหว่างทางไม่ปลอดภัย)
- เทียบกับ F03 ที่ทำถูก: P1-F03-T24 (design gate A) deps P1-F03-T21 (content gate copy) และ P1-F03-T25 (design gate B) deps P1-F03-T22, T23 (content gate visual, QA gate simulator) คือให้ QA/content ตรวจก่อนแล้ว design gate ค่อยตัดสินทับอีกชั้น ควรทำ F01 ให้เป็นแบบเดียวกัน
- ข้อเสนอ: เพิ่ม P1-F01-T08 เป็น dependency ของทั้ง P1-F01-T09 และ P1-F01-T10 ในตารางงาน และย้าย QA gate F01 มาอยู่ wave ก่อนหน้า Design/Product gate ในแผน wave (สลับตำแหน่งกับที่ปัจจุบันอยู่ W9 ให้มาก่อน W8)
- Severity: must-fix

### PM-M03 — Exit checklist E11 บังคับปิด Phase 1 ด้วยเงื่อนไขที่ขัดกับ task ต้นทางของมันเอง
- Task: `board.md` ส่วน "Phase Exit Checklist" แถว E11 (ผูก P1-F02-T22) และ E18
- ปัญหา: E11 เขียนว่า "backend stack ได้รับการยืนยัน (ADR 0002 ต้องการ authority HUMAN)" เป็นเกณฑ์ปิด Phase 1 และ E18 ("ทุก task เป็น DONE/CUT และทุก gate PASS") จะนับ P1-F02-T22 รวมอยู่ด้วย แต่ P1-F02-T02 (ADR 0002) เขียน acceptance ของตัวเองไว้ชัดว่า "ระบุว่า Phase 1–2 ไม่ต้องรอผลนี้ (client-first) และต้องได้คำตอบก่อน Phase 3" คือขัดแย้งกันเองในเอกสารเดียว และ `studio/roadmap.md` เกณฑ์ผ่าน F02 ก็ไม่ได้พูดถึงการยืนยัน backend stack เลย (มีแค่ 4 ข้อ: CI, mock trace, build ที่ deploy ได้, คู่มือเดินทดสอบ) การผูก T22/E11 เป็นเงื่อนไขบังคับปิด phase จึงเสี่ยงทำให้ Phase 1 ค้างรอการตัดสินใจที่ยังไม่จำเป็นต้องมี ขัดกับเป้าหมาย "พิสูจน์ความเสี่ยงก่อน" ของ phase นี้
- ข้อเสนอ: เอา E11 ออกจากเกณฑ์ปิด Phase 1 หรือระบุในหมายเหตุของ E11/E18 ว่า P1-F02-T22 อนุญาตให้ยังไม่ DONE ตอนปิด Phase 1 ได้ ให้ยกยอดเป็นเงื่อนไขก่อนเริ่ม Phase 3 แทน (ตรงกับสิ่งที่ P1-F02-T02 กำหนดไว้เอง)
- Severity: must-fix

### PM-M04 — Exit checklist E18 อ้างอิง task ที่ไม่มีอยู่จริงในตารางงาน
- Task: `board.md` ส่วน "Phase Exit Checklist" แถว E18, ตารางงาน section 2
- ปัญหา: E18 ระบุหลักฐานที่ต้องมีคือ `qa/reports/phase-1-regression.md (P1-CLOSE-QA)` แต่เมื่อไล่ตารางงานทั้ง 60 แถว (P1-F01-T01..T11, P1-F02-T01..T23, P1-F03-T01..T26) ไม่มี task ID `P1-CLOSE-QA` อยู่เลย ทั้งในตารางงาน section 2 และในแผน wave section 3 ทำให้เกณฑ์ปิด phase ข้อนี้ตรวจไม่ได้ตามที่เขียนไว้จริง เป็นช่องว่างงานจริง ไม่ใช่แค่ถ้อยคำ
- ข้อเสนอ: เพิ่ม task ใหม่ในตารางงาน (เช่น `P1-CLOSE-QA`) ประเภท review-gate เจ้าของ qa-tester deps = ทุก gate ของ F01/F02/F03 (T08, T09, T10, T15, T16, T21, T23, T24, T25) เขียน `qa/reports/phase-1-regression.md` ทวนว่าทุก task DONE/CUT และทุก gate PASS จริงก่อนส่ง HUMAN ปิด phase และใส่ใน wave สุดท้ายของแผน (หลัง W10)
- Severity: must-fix

## 4. Should-fix

### PM-S01 — Metric tree ใน P1-F03-T19 ไม่ครบ 6 หมวดที่ CLAUDE.md ขอให้วางไว้ตั้งแต่ต้น
- Task: P1-F03-T19
- ปัญหา: acceptance ปัจจุบันระบุ north star + guardrail 4 ตัว (อัตราส่วนรายได้ต่อค่ายา, ขนาด party เฉลี่ย, DAU ช่วงฝน, คนเลเวลสูงหายสัปดาห์ 3–4) ยังไม่ครอบคลุมหมวด "Places" (entries/day ต่อ dungeon, เวลาเฉลี่ย, death rate, ขนาด party, จำนวนรายงานซ้ำ) ที่ CLAUDE.md ระบุชัดว่าต้อง instrument ตั้งแต่ต้น แม้ event จริงจะยังไม่ implement จนถึง phase หลัง แต่ metric tree เชิงเอกสารควรวางโครงครบตั้งแต่ Phase 1 ไม่ให้ทีมหลังต้องออกแบบใหม่
- ข้อเสนอ: เพิ่ม acceptance ให้ `product/metrics.md` ระบุครบ 6 หมวด (onboarding, social, economy, progression, places, seasonality) แม้จะมีแค่บาง event รองรับใน Phase 1–2
- Severity: should-fix

### PM-S02 — Telemetry event หมวด onboarding เขียนกว้างเกินไป เสี่ยงไม่ตรงกับ funnel ที่ CLAUDE.md ต้องการ
- Task: P1-F03-T19
- ปัญหา: acceptance เขียนแค่ "onboarding" เป็นหนึ่งบรรทัดในรายการ event ไม่ได้ระบุว่าต้องมี event แยกตามขั้นในตาราง GDD (นาที 0–1, 1–3, 3–6, 6–8, 8–10), event ตอนได้รางวัลก้อนแรก, และ event ตอนปิดแอปบนหน้าจอว่างเมื่อ dungeon ไกล/นอกพื้นที่ ซึ่งเป็นสามอย่างที่ CLAUDE.md ระบุชื่อไว้ตรงๆ ว่าต้องวัด
- ข้อเสนอ: ระบุชื่อ event ตัวอย่างในหัวข้อ acceptance ของ T19 เช่น event ต่อ step onboarding, event ได้รางวัลแรก, event ปิดแอปเพราะไม่มี dungeon ใกล้ เพื่อไม่ให้ผู้ทำงานต้องคิดเองตอนเขียนจริงโดยไม่มี checklist กำกับ
- Severity: should-fix

### PM-S03 — P1-F03-T19 ไม่ deps P1-F03-T16 ทำให้ event เสี่ยงไม่ตรงกับขั้นตอน flow จริง
- Task: P1-F03-T19 (deps ปัจจุบัน: P1-F03-T01 เท่านั้น)
- ปัญหา: T19 ต้องยิง event ตามช่วงเวลา onboarding และ flow หลัก (แผนที่ → confirm เข้า → run → สรุป) ซึ่งเป็นเนื้อหาของ P1-F03-T16 (flow หลัก, uiux-designer) แต่ T19 ไม่ได้ประกาศ deps ไปที่ T16 แม้ wave plan ปัจจุบันจะบังเอิญให้ T16 (W4) เสร็จก่อน T19 (W6) การไม่มี dependency อย่างเป็นทางการหมายความว่าไม่มีอะไรบังคับให้ผู้เขียน event เปิดอ่าน flow ก่อน เสี่ยงตั้งชื่อ/จังหวะ event ไม่ตรงกับขั้นตอนจริงที่ผู้เล่นเจอ
- ข้อเสนอ: เพิ่ม P1-F03-T16 เป็น dependency ของ P1-F03-T19 ในตารางงาน
- Severity: should-fix

### PM-S04 — ปฏิทิน live ops 12 เดือนเต็มใน P1-F03-T20 ลึกเกินสิ่งที่ phase นี้ต้องพิสูจน์ และซ้ำกับ F24
- Task: P1-F03-T20
- ปัญหา: Phase 1 มีเป้าหมายแค่ "พิสูจน์ความเสี่ยงและจัดทิศทาง" ยังไม่รู้ผล Go/No-go ของ coverage และยังไม่มีวันเปิดตัวจริง (เลือกย่านเปิดตัวจริงเป็นงานของ F23 ใน Phase 8) การร่างปฏิทิน 12 เดือนเต็มตอนนี้เสี่ยงต้องรื้อทันทีที่ผล F01 เปลี่ยนย่านเปิดตัวหรือ timeline และ Phase 8 มี F24 "Live Ops Program" ที่ทำปฏิทิน event เต็มรูปแบบอยู่แล้ว งานนี้จึงเสี่ยงซ้ำสองรอบ
- ข้อเสนอ: ลดขอบเขต P1-F03-T20 เหลือกรอบทิศทาง + ประเภท event หลัก + ตัวอย่าง 1 ไตรมาสแรกเพื่อยืนยันแนวคิด (raid ทุกเสาร์, dungeon ชั่วคราว) ไม่ต้องครบ 12 เดือน แล้วให้ F24 ทำฉบับเต็มเมื่อรู้ผล Go/No-go และวันเปิดจริง (authority: producer/liveops-operator)
- Severity: should-fix

### PM-S05 — ตัวอย่าง "งานวัด" ใน P1-F03-T20 แตะประเด็นศาสนาโดยไม่มีธง `[HUMAN]`
- Task: P1-F03-T20
- ปัญหา: รายการ dungeon ชั่วคราวตัวอย่างมี "งานวัดในฐานะงาน event ไม่ใช่ศาสนสถาน" แม้จะระบุเจตนาแยกจากศาสนสถานไว้แล้ว แต่ protocol ข้อ 5 กำหนดว่าเนื้อหาที่แตะศาสนาต้อง escalate ไป HUMAN เสมอ (แม้ authority ปกติของ role นั้นจะตัดสินเองได้) และ P1-F03-T02 (world bible) ก็ใช้วิธีติดธง `[HUMAN]` กับทุกจุดอ่อนไหวอยู่แล้ว แต่ T20 ไม่ได้ทำแบบเดียวกัน
- ข้อเสนอ: เพิ่ม acceptance ใน T20 ให้ติดธง `[HUMAN]` กับตัวอย่าง "งานวัด" และให้ P1-F03-T26 (HUMAN ยืนยัน world building) หรือ decision log ครอบคลุมการยืนยันจุดนี้ด้วย
- Severity: should-fix

### PM-S06 — ไม่มี product-manager ร่วมตรวจผลสรุป spike ก่อนส่ง HUMAN ตัดสิน Go/No-go ของ F02
- Task: P1-F02-T21, T23 (ไม่มี product-manager ในเส้นทางนี้เลย)
- ปัญหา: F02 มีแค่ Tech gate และ QA gate ซึ่งเหมาะสมสำหรับตรวจความถูกต้องทางวิศวกรรม แต่ผลของ M1 ("ถ้า M1 ไม่ผ่าน แผนทั้งหมดต้องรื้อ") เป็นความเสี่ยงเชิง player experience โดยตรง (คนเดินจริงกลางแดดจะทนใช้แอปที่กินแบตเยอะหรือหน่วงแค่ไหน) ไม่ใช่แค่คำถามว่าโค้ดถูกหรือไม่ ปัจจุบันไม่มีจุดใดให้ product-manager มองผลสรุป (`docs/tech/F02-spike-results.md`) ก่อนที่ HUMAN จะตัดสินที่ T23
- ข้อเสนอ: ไม่จำเป็นต้องเปิด product gate เต็มรูปแบบสำหรับ F02 แต่เพิ่มบรรทัดใน P1-F02-T21 ให้ tech-lead ส่ง handoff ให้ product-manager อ่านผลก่อนสรุปคำแนะนำ หรือให้ product-manager เป็นผู้ร่วมเขียนคำแนะนำ Go/เงื่อนไข/No-go คู่กับ tech-lead
- Severity: should-fix

### PM-S07 — P1-F01-T02 และ P1-F01-T03 ไม่มี dependency หรือ input ร่วมกันทั้งที่ต้องใช้หน่วยวัดเดียวกัน
- Task: P1-F01-T02 (level-designer), P1-F01-T03 (product-manager)
- ปัญหา: T02 กำหนดสูตรให้คะแนนย่านเปิดตัว (เช่น ระยะเดินเฉลี่ยถึง dungeon ใกล้สุด, ความหนาแน่นประชากร) ส่วน T03 กำหนดเกณฑ์ตัวเลข Go/No-go (เช่น % ประชากรที่อยู่ภายใน X เมตรจาก dungeon) ทั้งสองงานไม่มี deps ต่อกันและไม่มี input ร่วม เสี่ยงที่หน่วยวัดหรือนิยาม "ย่าน" จะไม่ตรงกันตอนเอามารวมกันใน coverage report (T07 ซึ่ง deps ทั้งคู่)
- ข้อเสนอ: เพิ่มหมายเหตุใน context ของทั้งสอง task ให้ level-designer และ product-manager sync นิยามหน่วยวัดและขอบเขต "ย่าน" ก่อนเขียนฉบับสมบูรณ์ ไม่จำเป็นต้องเป็น hard dependency แต่ควรเป็น cross-read
- Severity: should-fix

## 5. Nice-to-have

### PM-N01 — พิจารณาลดความลึกของ simulator เศรษฐกิจ/party/drop (P1-F03-T08) ใน Phase 1
เป้าหมายหลักของ phase นี้คือพิสูจน์ coverage และ map/GPS ไม่ใช่ finalize เศรษฐกิจ ซึ่ง Phase 4 (F10–F12) จะมี economy simulation แบบ 30 วันอีกรอบอยู่แล้วโดยใช้ข้อมูลที่ใกล้เคียงของจริงกว่า การทำ simulator ครบทุกหมวด (drop, economy, party) ใน Phase 1 มีประโยชน์เชิง align ทิศทางแต่เสี่ยง scope creep เทียบกับหลักการ "เรียงตามความเสี่ยง ไม่ใช่ความสมบูรณ์ของฟีเจอร์" เสนอให้ producer พิจารณาว่าจะตัดหรือเลื่อนบางส่วน (เช่น party reward ratio ที่ต้องใช้จริงใน Phase 3/F09) ไปพิสูจน์ตอนใกล้ใช้งานจริงแทน (authority: producer)

### PM-N02 — Handoff ไปยัง producer สำหรับ Phase 2: ต้องมี PRD ที่ครอบคลุมกลุ่มผู้เล่นทั้งสามกลุ่ม
P1-F01-T03 (PRD F01) ครอบคลุมเฉพาะปัญหา "อยู่นอกพื้นที่เล่น" ซึ่งถูกต้องตามขอบเขตของ F01 (ปัญหา coverage) แต่ CLAUDE.md ระบุให้ product-manager ดูแล segment ผู้เล่นครบสามกลุ่ม (40 นาที/วัน เทียบ 3–6 ชม./วัน, คนอยู่บ้านตอนฝนตก, คนอยู่นอกพื้นที่เล่น) Phase 1 board ยังไม่มี task PRD สำหรับ F04–F06 (dungeon loop) ซึ่งเป็นจุดที่ควรครอบคลุม segment เวลาและฝนตกด้วย ขอฝากให้ producer วาง task PRD นี้ไว้ตอนวางแผน Phase 2

## REPORT
task: P1-PLAN-REV-PM
status: DONE
summary: ตรวจ Phase 1 board จากมุม product-manager พบ must-fix 4 ข้อ (เกณฑ์ Go/No-go ตัวเลขของ F02 ยังไม่ถูกตั้ง, ลำดับ gate F01 ผิด, exit checklist ขัดแย้งกันเองและอ้าง task ที่ไม่มีอยู่จริง) และ should-fix 7 ข้อ ส่วนใหญ่เป็นเรื่อง metric tree/telemetry ไม่ครบและ scope ของ live-ops calendar
outputs:
  - studio/phases/phase-1/plan-review-product-manager.md — รายงานตรวจแผน พร้อม verdict, ตารางเทียบ checklist, findings 13 ข้อ (must/should/nice) และ report block
acceptance:
  - [x] Findings แต่ละข้อมี task ID, ปัญหา, ข้อเสนอ, severity — ดูหัวข้อ 3–5 ของรายงาน
  - [x] ตรวจเกณฑ์ Go/No-go ของ F01 และ F02 เป็นตัวเลข — F01 ผ่าน (T03), F02 ไม่ผ่าน (PM-M01)
  - [x] ตรวจขอบเขตงาน metrics framework + telemetry event naming — ผ่านโดยมีข้อเสนอ (PM-S01, PM-S02, PM-S03)
  - [x] ตรวจหลักฐานเลือกย่านเปิดตัว — ผ่าน (F01-T06/T07/T10)
  - [x] ตรวจตำแหน่ง product gate — ผ่านโดยมีข้อเสนอ (PM-S06)
  - [x] ตรวจ exit checklist เทียบ roadmap — พบ must-fix 2 ข้อ (PM-M03, PM-M04)
  - [x] ตรวจ over-scope เทียบ "พิสูจน์ความเสี่ยงก่อน" — พบ should-fix/nice-to-have (PM-S04, PM-S05, PM-N01)
assumptions:
  - none
handoffs:
  - to: producer | need: แก้ must-fix PM-M01 ถึง PM-M04 บน board ก่อนเริ่ม wave ที่เกี่ยวข้อง (M01 ก่อน W1–W2 ของ F02, M02 ก่อน W8–W9 ของ F01, M03/M04 ก่อนปิด phase) | why: กระทบความน่าเชื่อถือของผล Go/No-go และความสมบูรณ์ของเกณฑ์ปิด phase | blocking: yes
  - to: tech-lead | need: ร่วมกำหนดตัวเลขเกณฑ์ผ่านของ map/location spike ใน P1-F02-T03 กับ product-manager | why: PM-M01 | blocking: yes
  - to: liveops-operator | need: พิจารณาลดขอบเขต P1-F03-T20 และติดธง [HUMAN] ที่ตัวอย่าง "งานวัด" | why: PM-S04, PM-S05 | blocking: no
questions_for_human:
  - none

