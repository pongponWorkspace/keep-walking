# Plan Review — Phase 1 Board (มุม tech-lead)

Task: P1-PLAN-REV-TL · ผู้ตรวจ: tech-lead · วันที่: 2026-09-23
ขอบเขต: `studio/phases/phase-1/board.md` ฉบับ DRAFT (P1-PLAN-01, 60 task) เทียบกับ `studio/roadmap.md` Phase 1, `studio/protocol.md` และ GDD "สถาปัตยกรรมเทคนิค", "แผนงาน" (M0, M1)

## 1. Verdict

**NEEDS_CHANGES** — โครงแผนถูกทิศ ลำดับ ADR 0001 และ critical path ใช้ได้ ไม่มี scope ที่ขัด GDD แต่มี must-fix 6 ข้อที่ต้องแก้บน board ก่อนเริ่ม W1 (ทุกข้อแก้ได้ด้วยการเพิ่ม acceptance, deps หรือ writes ไม่ต้องวางแผนใหม่)

สรุปจำนวน: must-fix 6 · should-fix 13 · nice-to-have 8

## 2. ผลตรวจตามรายการที่ได้รับมอบ

| หัวข้อ | ผล | หมายเหตุ |
| --- | --- | --- |
| ADR 0001 (scaffold + `git init`) เป็นงานแรก และงานโค้ดทุกงานรอ | ผ่าน | F01-T05, F02-T02..T09, F03-T07 ขึ้นกับ P1-F02-T01 ทั้งหมด · ยืนยัน A-P1-PLAN-01-1 · ดู TL-S06 เรื่อง commit แรก |
| ตำแหน่ง ADR 0002 (stack) | ผ่านโดยมีข้อเสนอ | ไม่ขวาง Phase 1 ถูกต้อง · เสนอเลื่อนเร็วขึ้นและแก้ถ้อยคำให้ตรงกับ roadmap (TL-S12, TL-N01) |
| `LocationProvider` Web / Mock / Capacitor stub | ผ่านโดยมีข้อเสนอ | ขาด schema ที่เครื่องอ่านได้ (TL-M05) และ type ที่ server ใช้ซ้ำได้ + clock ที่ฉีดได้ (TL-S09) |
| PMTiles build และ R2 upload | ต้องแก้ | ยังไม่ล็อก tile schema ให้ตรงกับ map style (TL-M02) · glyph/sprite และการแสดงชื่อถนนไทยไม่มีเจ้าของ (TL-M03) · ขาด fixture ขนาดเล็กที่ commit ได้ (TL-S08) |
| เครื่องมือวัด | ต้องแก้ | เกณฑ์ผ่านไม่ได้ถูกบังคับให้ตั้งล่วงหน้า (TL-M04) · วิธีวัด data ผ่าน Resource Timing จะได้ 0 กับ cross-origin (TL-S07) · พิกัดดิบของคนเดินจะถูก commit (TL-M06) |
| CI | ผ่านโดยมีข้อเสนอ | ขาดการตัดสิน e2e runner (TL-S04) · CI บน GitHub ยืนยันเร็วเกินไป (TL-S02) |
| Local / preview deployability | ผ่านโดยมีข้อเสนอ | ชื่อ env ของ client เสี่ยงไม่ตรงกันเพราะ T03 กับ T07 อยู่ wave เดียวกัน (TL-S05) |
| ขนาดงาน 1–3 วัน | ผ่าน | ทุกงานอยู่ในช่วง · T01, F01-T05, T11 แน่นแต่ไม่เกิน |
| Owner | ผ่าน | ตรงกับ agent file ทุกงาน (interface = tech-lead, implementation + tiles + traces = location-engineer, `apps/client` = gameplay, infra/CI = devops) |
| Writes-path exclusivity ภายใน wave | ต้องแก้ | ไม่มีชน path ที่ประกาศไว้ แต่มี path แฝงที่ทุกงานโค้ดแก้ร่วมกัน: lockfile และ root `package.json` (TL-M01) และ root config ของ test runner (TL-S04) |
| ข้าม tech gate ของ F01 และ F03 | ยอมรับได้แบบมีเงื่อนไข | ดูหัวข้อ 5 |
| HUMAN ครอบคลุมทุก credential / deploy | ผ่านโดยมีข้อเสนอ | T17, T18, T19 ครบ · เพิ่มลำดับ gate ก่อน deploy (TL-S01) และทางสำรองถ้า agent ดาวน์โหลดข้อมูลใหญ่ไม่ได้ (TL-S11) |
| Scope ขัด GDD | ไม่พบ | ไม่มี reward logic ใน Phase 1, ใช้ MapLibre + PMTiles + R2 ตาม baseline, Capacitor เป็น stub ตาม M8 |

ตรวจลำดับ wave แล้ว: deps ทุกงานเสร็จใน wave ก่อนหน้าจริง, ไม่มี agent ซ้ำใน wave เดียว, ไม่มี wave เกิน 6 งาน

## 3. Must-fix

### TL-M01 — lockfile และ root `package.json` เป็น writes แฝงที่ชนกันทุก wave
- Task: P1-F02-T01 (ต้นเหตุ) · กระทบ P1-F01-T05, P1-F02-T04, T05, T06, T08, T09, T10, T11, T13, P1-F03-T07, T08
- ปัญหา: package manager แบบ workspace (pnpm/npm) เขียน lockfile ที่ root ทุกครั้งที่งานใดเพิ่ม dependency · ทุก wave ตั้งแต่ W2 มีงานโค้ด 2–3 งานรันพร้อมกันใน working tree เดียว (เช่น W3: T04, T08, T09 · W6: F01-T06, T11, T13) จะ race กันทั้ง lockfile และ `node_modules` · ไม่มีงานใดประกาศ path นี้ใน Writes จึงผิด protocol ข้อ 3.2 โดยไม่ตั้งใจ
- ข้อเสนอ:
  1. เพิ่ม acceptance ใน P1-F02-T01: สร้าง `package.json` stub ของทุก workspace ที่รู้แล้วใน Phase 1 (`apps/client`, `packages/location`, `packages/shared`, `tools/traces`, `tools/sim` ถ้าเป็น TS) และติดตั้ง dependency ที่คาดได้ล่วงหน้าพร้อม pin version (typescript, test runner, lint, `maplibre-gl`, `pmtiles`, `vite`, JSON Schema validator, e2e runner) เพื่อให้งานถัดไปแทบไม่ต้องเพิ่ม dependency
  2. เพิ่มกฎใน ADR 0001 และหัวข้อ 1 ของ board: "lockfile + root `package.json` เป็น path ร่วม · ใน wave หนึ่งให้ได้ไม่เกิน 1 งานที่เพิ่ม dependency (ระบุ `pnpm-lock.yaml` ใน Writes ของงานนั้น) · งานอื่นที่ต้องการ dependency ใหม่ให้เขียน handoff ถึง tech-lead"
  3. Python ใน `tools/` ใช้ไฟล์ pin แยกต่อโฟลเดอร์ (`tools/coverage/requirements.txt` + venv ในโฟลเดอร์) จึงไม่ชนกัน
- Severity: must-fix

### TL-M02 — ยังไม่ล็อก tile schema ทำให้ map style กับ PMTiles อาจใช้ร่วมกันไม่ได้
- Task: P1-F02-T03, P1-F02-T06, P1-F03-T12, P1-F02-T11
- ปัญหา: T06 เขียนว่า "Protomaps / planetiler หรือเทียบเท่า" แต่ planetiler ค่าเริ่มต้นให้ schema แบบ OpenMapTiles ส่วน T12 เขียน style ตาม "PMTiles schema ของ Protomaps" · ถ้าสองงานเลือกต่างกัน T11 (W6 บน critical path) จะรวมไม่ได้และต้องย้อนแก้ · T12 อยู่ W5 โดยไม่มี tile ให้ทดสอบ
- ข้อเสนอ:
  - เพิ่ม acceptance ใน P1-F02-T03: ระบุ tile schema = Protomaps basemap (pin เวอร์ชัน schema) และวิธีได้ tile ที่แนะนำ: `pmtiles extract` จาก Protomaps daily build ด้วย bbox กรุงเทพฯ + 5 จังหวัด (ไม่ต้องใช้ Java หรือ build ทั้ง planet) · planetiler ใช้เป็นทางสำรองโดยต้องใช้ profile ของ Protomaps
  - เพิ่ม P1-F02-T03 เป็น dep ของ P1-F03-T12 (T03 เสร็จ W2 ก่อน T12 ที่ W5 ไม่เลื่อน wave) และให้ T12 เริ่มจาก theme ทางการของ Protomaps (`@protomaps/basemaps`) แล้วปรับสี
- Severity: must-fix

### TL-M03 — glyph, sprite และการแสดงชื่อถนนภาษาไทยไม่มีเจ้าของและไม่ถูกวัด
- Task: P1-F02-T08, P1-F02-T11, P1-F03-T12, P1-F02-T14
- ปัญหา: MapLibre ต้องโหลด glyph (font PBF) และ sprite แยกจาก tile · ข้อความภาษาไทยมีสระบน/ล่างและวรรณยุกต์ซึ่ง MapLibre วางตำแหน่งด้วย glyph ทีละตัวโดยไม่มี complex shaping จึงเสี่ยงวรรณยุกต์ลอยหรือทับกัน · นี่คือความเสี่ยงระดับ Go / No-go ของ M1 ("ชื่อถนนจริงอ่านออก" ใน T12) แต่ไม่มีงานใดสร้าง glyph ภาษาไทย ไม่มีที่ host และไม่มีช่องวัดใน form
- ข้อเสนอ:
  - T12: ระบุ font stack ที่ครอบช่วง Thai (เช่น Noto Sans Thai) และ path ของ glyph/sprite ที่ style อ้าง
  - T11: โหลด glyph/sprite จาก path ใน build หรือ R2 (ไม่พึ่ง CDN ภายนอกโดยไม่ได้ตัดสินใจ) และแนบ screenshot ชื่อถนนไทยที่ zoom 14, 16, 18
  - T08: script upload ครอบ glyph/sprite นอกจาก `.pmtiles`
  - T14: เพิ่มช่องในแบบฟอร์ม "ชื่อถนน/สถานที่ภาษาไทยอ่านถูกไหม (วรรณยุกต์ถูกตำแหน่ง)" พร้อมเกณฑ์
  - T03: ระบุเป็นความเสี่ยงใน failure modes พร้อมทางเลือกถ้าไม่ผ่าน (ลดป้ายชื่อ, ใช้ป้ายแบบ HTML marker สำหรับ dungeon)
- Severity: must-fix

### TL-M04 — เกณฑ์ผ่านของ spike ไม่ถูกบังคับให้ตั้งล่วงหน้า
- Task: P1-F02-T03 (เพิ่ม), P1-F02-T14, P1-F02-T21
- ปัญหา: T14 อ้าง "เกณฑ์ spike ของ tech note ถ้ามี ไม่มีให้เสนอและติดธง assumption" แต่ acceptance ของ T03 ไม่ได้บังคับให้มี · ผลคือ qa-tester อาจเป็นผู้ตั้งเกณฑ์ tech แทน tech-lead และ T21 ตัดสิน Go / No-go เทียบเกณฑ์ที่ไม่มีเจ้าของ (ผิดหลักเดียวกับที่ PRD F01 ตั้งเกณฑ์ก่อนเห็นข้อมูล)
- ข้อเสนอ: เพิ่ม acceptance ใน P1-F02-T03 หัวข้อ "เกณฑ์ spike" ที่ตั้งก่อนวัด พร้อมนิยามวิธีวัด:
  - FPS ระหว่าง pan/zoom และโหมดตามตัว (ไม่ใช่ตอนแผนที่นิ่ง เพราะ MapLibre ไม่ render เมื่อไม่มีการเปลี่ยน): เฉลี่ย และ p5
  - แบตที่ใช้ต่อ 30 นาทีแบบจอเปิดตลอด
  - MB ที่โหลดใน 30 นาที แยก JS bundle / style + glyph / tile
  - accuracy median และ p90 แยกสวนกับซอย เทียบค่าที่ design ใช้ (check-in < 30 ม., movement gate 50 ม. ต่อ 5 นาที)
  - ความหน่วงของจุดตำแหน่ง
  - แต่ละตัวมีช่วง Go / Go พร้อมเงื่อนไข / No-go · T14 คัดลอกเกณฑ์นี้ไปใส่ form และ T21 เทียบกับเกณฑ์นี้เท่านั้น
- Severity: must-fix

### TL-M05 — schema ของ GPS trace ไม่มีไฟล์ที่เครื่องอ่านได้
- Task: P1-F02-T03 (Writes), P1-F02-T04, P1-F02-T05, P1-F02-T13
- ปัญหา: T03 เขียน schema ไว้ใน `docs/tech/gps-trace-format.md` (markdown) แต่ T04 ("ทุกไฟล์ผ่าน schema"), T05 (Mock โหลด trace) และ T13 (QA trace "ผ่าน schema") ต้อง validate ด้วยโค้ด · ถ้าไม่มีไฟล์กลาง แต่ละงานจะเขียน validator ของตัวเองและ drift กัน ซึ่งขัด protocol ข้อ 9 (GPS traces เป็นสัญญาร่วม)
- ข้อเสนอ: เพิ่มใน Writes ของ P1-F02-T03: `packages/shared/schemas/gps-trace.schema.json` (JSON Schema) และ `packages/shared/src/trace.ts` (type + ฟังก์ชัน `validateTrace` แบบ pure) · T04, T05, T13 ใช้ไฟล์นี้เท่านั้น · T01 เสร็จก่อน T03 จึงไม่ชน path กับ T01
- Severity: must-fix

### TL-M06 — พิกัดดิบของคนที่เดินทดสอบจะถูก commit เข้า git
- Task: P1-F02-T11, P1-F02-T14, HUMAN P1-F02-T20, P1-F02-T01 (`.gitignore`)
- ปัญหา: T11 export CSV ของ session และ T20 ขั้น 6 ให้บันทึก CSV ไว้ใน `qa/playtest/results/` · ถ้า CSV มี lat/lng ทุก sample จะเป็นเส้นทางเดินจริงของบุคคลจริง (มักเริ่มหรือจบใกล้บ้านหรือที่ทำงาน) อยู่ใน git ถาวร ซึ่งขัด non-negotiable ข้อ 7 (PDPA) และหลัก "ไม่มีพิกัดดิบนอก `position_log` ที่มี TTL"
- ข้อเสนอ:
  - T11: CSV ที่ export มีสองแบบ: `summary` (ค่ารวม ไม่มีพิกัด: FPS, แบต, MB, accuracy stats, ระยะสะสม, ช่วง sample ขาด) เป็นค่าเริ่มต้น และ `trace` (มีพิกัด ตาม `gps-trace-format`) ต้องกดเลือกเอง
  - T01: `.gitignore` ครอบ `qa/playtest/results/raw/`
  - T14 และ T20: commit ได้เฉพาะ summary + form · ไฟล์ trace เก็บใน `raw/` ในเครื่อง และส่งต่อได้เฉพาะเมื่อคนเดินยินยอม (ดู TL-S10 เรื่องการแปลงเป็น recorded trace แบบตัดต้นและปลาย)
- Severity: must-fix

## 4. Should-fix

| ID | Task | ปัญหา | ข้อเสนอ |
| --- | --- | --- | --- |
| TL-S01 | HUMAN P1-F02-T19 | คน deploy preview ขึ้น URL สาธารณะก่อนผ่าน tech gate (T19 deps = T17, T08, T11) จึงอาจ deploy build ที่มี secret หรือ log พิกัดหลุด | เพิ่ม P1-F02-T15 (PASS) เป็น dep ของ T19 · ไม่เลื่อน critical path เพราะ T15 อยู่ W7 เท่ากับ T14 ที่ T20 รออยู่แล้ว · แก้คำอธิบาย critical path ให้ตรง deps จริง (ตอนนี้เขียน T14 → T19 แต่ T19 ไม่ได้ขึ้นกับ T14) |
| TL-S02 | HUMAN P1-F02-T18, exit E5 | T18 ขึ้นกับ T07 อย่างเดียว คนอาจ push ตั้งแต่ W3 แล้ว CI เขียวบน skeleton ซึ่งไม่พิสูจน์ "test ผ่านใน CI" ของโค้ดทั้ง phase | แยกเป็นสองขั้น: T18 ตั้ง repo + push ครั้งแรก (deps T07) และเพิ่มขั้นท้ายใน T18 หรือ HUMAN task ใหม่ "push ล่าสุดหลัง P1-F02-T16 และส่ง URL run สีเขียว" ให้ E5 อ้างอันหลัง |
| TL-S03 | P1-F02-T15 | T15 ไม่ครอบ `tools/coverage/`, `tools/traces/`, `tools/sim/` เลย จึงไม่มีใครตรวจ repo hygiene ของงานโค้ดที่ข้าม tech gate | เพิ่ม P1-F01-T05, P1-F02-T04, P1-F03-T08 เป็น deps ของ T15 (เสร็จ W2–W4 ก่อน T15 ที่ W7 จึงไม่เลื่อน) และเพิ่มขอบเขต "hygiene เท่านั้น" ดูหัวข้อ 5 |
| TL-S04 | P1-F02-T01, P1-F02-T07, P1-F02-T13 | T13 ต้องพิสูจน์ "จุดขยับบนแผนที่" (E6) ผ่าน client แบบ black-box ซึ่งต้องใช้ browser e2e runner แต่ ADR 0001 ไม่ได้ถูกขอให้เลือก · `qa/tests/` อยู่นอก workspace glob (`apps/*` `packages/*` `tools/*`) ทำให้ QA ต้องแก้ root config เอง | T01: เลือก e2e runner (เช่น Playwright + Chromium พร้อม mobile emulation) และรวม `qa/tests/*` ใน workspace/test config · T07: CI รัน e2e แยก job · T13: ระบุว่าใช้ runner นี้ |
| TL-S05 | P1-F02-T03, P1-F02-T07 | T03 เป็นผู้เลือกชื่อ env ของ client (`VITE_TILES_URL` "หรือชื่อที่ ADR เลือก") แต่ T07 เขียน `.env.example` ใน wave เดียวกัน (W2) และรายการของ T07 ไม่มีตัวแปรฝั่ง client เลย | ล็อกชื่อบน board ตอนนี้: `VITE_TILES_URL` (และ `VITE_GLYPHS_URL` ตาม TL-M03) · เพิ่มลงรายการใน acceptance ของ T07 · T03 ใช้ชื่อตามนี้ |
| TL-S06 | P1-F02-T01 | commit แรกของ T01 จะเก็บไฟล์ที่ agent อื่นใน W1 เขียนค้างอยู่ (METHOD.md, balance config, world.md) และไม่มีนโยบาย commit ตลอด phase ทั้งที่หลาย agent เขียน working tree เดียวกัน | T01 commit เฉพาะ path ของตัวเอง (`git add` ระบุ path) · ADR 0001 กำหนดว่า agent ไม่ commit เอง orchestrator commit เมื่อจบแต่ละ wave ด้วยข้อความอ้าง task ID · ใช้ git config ระดับ repo ไม่แตะ global |
| TL-S07 | P1-F02-T11, P1-F02-T08 | วัด "ขนาด data ที่โหลด" ด้วย Resource Timing จะได้ `transferSize = 0` กับ resource ข้าม origin (R2 r2.dev) ที่ไม่ส่ง `Timing-Allow-Origin` และ r2.dev ตั้ง header นี้เองไม่ได้ · ถ้าไม่ตั้ง `Cache-Control` ตอน upload ตัวเลข data ต่อ session จะสูงเกินจริง | T11: นับ byte ที่ได้รับจริงผ่าน custom `Source` ของ `pmtiles` และ wrapper ของ fetch สำหรับ style/glyph เป็นตัวหลัก Resource Timing เป็นตัวรอง · T08: script upload ตั้ง `Cache-Control` และ `Content-Type` · T03: เขียนนิยามนี้ในเกณฑ์ spike |
| TL-S08 | P1-F02-T06, P1-F02-T09, P1-F02-T13 | `bangkok.pmtiles` อยู่นอก git (ถูกต้อง) แต่ CI, QA และ T09 ("ไฟล์ตัวอย่างขนาดเล็ก") ไม่มีไฟล์ tile กลางที่แน่นอน | T06 ส่งมอบ fixture PMTiles ขนาดเล็ก (เช่น พื้นที่สวนลุมพินี zoom ถึง 16 ไม่เกิน 2 MB) ที่ commit ได้ พร้อมคำสั่งสร้างซ้ำ · ย้าย fixture ขึ้นก่อน: ให้ T09 ใช้ fixture จาก Protomaps demo ชั่วคราว แล้ว T11 เปลี่ยนเป็น fixture ของ T06 |
| TL-S09 | P1-F02-T03 | `packages/location/src/types.ts` จะถูก import โดย server ใน Phase 3 (validate trace ย้อนหลัง) แต่ package นี้มีโค้ด browser · Mock ที่เล่นตามเวลาจริงจะทำให้ trace-replay test ช้าและไม่ deterministic | ให้ type `LocationSample` อยู่ใน `packages/shared` (ไม่มี DOM API) และ `packages/location` re-export · interface รับ `Clock`/scheduler ที่ฉีดได้ เพื่อให้ test ใช้ fake clock เล่น trace 30 นาทีภายในไม่กี่ ms · ระบุความหมายของ `timestamp` (เวลาจาก fix ไม่ใช่เวลาที่ได้รับ) |
| TL-S10 | หลัง HUMAN P1-F02-T20 (task ใหม่) | roadmap F02 ระบุ Mock "เล่น GPS trace ที่อัดไว้" แต่ board มีแค่ trace สังเคราะห์ ผลเดินจริงของ T20 เป็นแหล่ง trace จริงแหล่งแรกและมีค่ามากต่อการจูน movement gate ใน Phase 2 | เพิ่มงาน location-engineer (1 วัน, deps T20): แปลง trace จริงที่คนยินยอมให้ใช้เป็น `data/gps-traces/recorded/` โดยตัดต้นและปลายอย่างน้อย 200 ม., ปัดพิกัดตาม README, ไม่มีข้อมูลเครื่องที่ระบุตัวตน · เพิ่มข้อถามความยินยอมใน T20 · ไม่อยู่บน critical path ของ T21 |
| TL-S11 | P1-F01-T05, P1-F02-T06, P1-F02-T13 (e2e browser) | ต้องดาวน์โหลดข้อมูลใหญ่ (Geofabrik Thailand หลายร้อย MB, ข้อมูลประชากร, tile extract, browser binary) · ถ้า sandbox ของ agent ไม่มีเน็ตหรือจำกัดขนาด งานบน critical path จะ BLOCKED ทั้งสองสาย | เพิ่ม assumption ใน board และเตรียม HUMAN task สำรอง "ดาวน์โหลดไฟล์ตาม URL และ checksum ที่ระบุใน README แล้ววางที่ path X" ที่ orchestrator เปิดได้ทันทีเมื่อ agent รายงานว่าดาวน์โหลดไม่ได้ · T07: CI ห้ามดาวน์โหลดข้อมูลใหญ่ test ใช้ fixture เท่านั้น |
| TL-S12 | P1-F02-T02, exit E11 | T02 acceptance เขียนว่า "ต้องได้คำตอบก่อน Phase 3" แต่ board ตั้ง E11 เป็นเกณฑ์ปิด Phase 1 และ roadmap กำหนดว่างาน HUMAN ต้องปิดก่อนเริ่ม phase ถัดไป จึงขัดกันเอง | แก้ถ้อยคำ T02 เป็น "ต้องได้คำตอบก่อนเริ่ม Phase 2 ตามกติกา roadmap แต่ไม่ขวางงาน agent ใน Phase 1" และให้ E11 คงไว้ |
| TL-S13 | P1-F02-T09, P1-F03-T12 | ODbL ของ OSM และ Protomaps บังคับให้แสดง attribution บนแผนที่ ไม่มี acceptance ใดพูดถึง | T09: เปิด `AttributionControl` แสดง "© OpenStreetMap contributors" และ Protomaps · T12: style มี `attribution` ใน source · T21: ระบุว่าตำแหน่ง attribution ไม่บัง UI ในจอมือถือ |

## 5. การข้าม tech gate ของ F01 และ F03

**F01 (coverage scripts ใน `tools/coverage/`): ยอมรับ แบบมีเงื่อนไข**
- เหตุผลที่รับได้: เป็นเครื่องมือวิเคราะห์ offline ไม่อยู่ในเส้นทาง product ไม่มี reward logic ไม่มี server authority ให้ตรวจ · ความถูกต้องของผลตรวจได้ดีกว่าโดย QA (รันซ้ำ, สุ่ม 30 polygon, ค่าขอบ)
- เงื่อนไข: T15 ตรวจ hygiene ของ `tools/coverage/` ตาม TL-S03 เฉพาะ: pin dependency, ไฟล์ดิบไม่เข้า git, ไม่มี secret, อ่านเกณฑ์พื้นที่จาก `config/balance/dungeons.json`, test รันจาก root script และอยู่ใน CI · finding ของ hygiene ไม่ขวาง Go / No-go ของ F01

**F03 (simulator ใน `tools/sim/`): ยอมรับ แบบมีเงื่อนไข**
- เหตุผลที่รับได้: simulator เป็น reference implementation ส่วนสัญญาจริงคือ golden test vectors (protocol ข้อ 9) ซึ่ง QA gate (P1-F03-T23) ตรวจเทียบ GDD อิสระจากผู้เขียนอยู่แล้ว · สูตรใน product จะถูกเขียนใหม่ใน `packages/shared` โดย tech-lead ใน Phase 2 และต้องผ่าน vectors ชุดเดียวกัน การมีสอง implementation อิสระเป็นข้อดี
- เงื่อนไข:
  1. ADR 0001 ระบุกฎ "โค้ดใน `apps/*` และ `packages/*` ห้าม import จาก `tools/*`" และบังคับด้วย lint (`no-restricted-imports` หรือ boundary rule) เพื่อไม่ให้ simulator กลายเป็นโค้ด product โดยไม่ผ่าน gate
  2. test ของ simulator รันใน CI (ผ่าน root `test` ถ้าเป็น TS หรือ job แยกถ้าเป็น Python)
  3. รวม `tools/sim/` ในขอบเขต hygiene ของ T15 (TL-S03)
  4. vectors ใช้รูปแบบ `{input, expected, tolerance, source}` ที่ TS test runner อ่านได้ตรง (T07 ระบุไว้แล้ว ขอให้ tech-lead ยืนยันใน ADR 0001 ว่าเป็นรูปแบบกลาง)

## 6. Nice-to-have

| ID | Task | ข้อเสนอ |
| --- | --- | --- |
| TL-N01 | P1-F02-T02 | เลื่อนจาก W4 ไป W3 (tech-lead ว่างใน W3) เพื่อให้คนมีเวลาตัดสิน T22 มากขึ้น · W3 เต็ม 6 งาน ให้ย้าย P1-F01-T03 (PRD F01) ไป W2 หรือ W4 แทน ต้องไม่ช้ากว่า F01-T07 ใน W7 |
| TL-N02 | P1-F03-T06 | T06 รันใน W1 คู่กับ T01 จึงยังไม่มีข้อตกลงรูปแบบ config · ขอใส่ข้อตกลงขั้นต่ำใน brief ของ T06: key แบบ camelCase, หน่วยอยู่ในชื่อ key (`_m`, `_s`, `_pct`), ค่าเป็นตัวเลขตรงไม่ห่อ object, แหล่ง GDD อยู่ใน `_source` ข้างเคียง · tech-lead จะรับรองรูปแบบนี้ใน ADR 0001 และทำ JSON Schema ใน Phase 2 |
| TL-N03 | P1-F02-T09 | เพิ่มคำสั่ง dev แบบ HTTPS (เช่น self-signed ใน LAN) เพราะ Geolocation บน iOS Safari และ Chrome ต้องใช้ secure context การลองบนมือถือจริงก่อนมี preview จึงทำได้ |
| TL-N04 | P1-F02-T03, P1-F02-T10 | ระบุวิธีที่ client โหลด trace จาก `data/gps-traces/` (เช่น build step คัดลอกไป `apps/client/public/traces/` หรือ import แบบ glob) เพื่อไม่ให้ T10 ต้องเดาเอง |
| TL-N05 | P1-F02-T01 | ระบุว่า `apps/api` เป็นชื่อจองแบบมีเงื่อนไขตามผล ADR 0002 (Workers หรือ Supabase edge functions อาจใช้ layout ต่างกัน) |
| TL-N06 | P1-F02-T09, P1-F02-T11 | ป้ายของ debug HUD เป็นเครื่องมือ dev ใช้ภาษาอังกฤษได้โดยไม่ต้องผ่าน copy key แต่ต้องซ่อนหลัง flag · สถานะ GPS ที่ผู้เล่นเห็น (T10) ใช้ copy key และมี fallback แสดง key เมื่อ `copy.th.json` ยังไม่มี (T05 ของ F03 เสร็จ W8 หลัง T10) |
| TL-N07 | P1-F02-T08, P1-F02-T21 | preview ใส่ `noindex` · T21 ระบุว่า r2.dev มี rate limit และไม่ใช่ทางของ production ต้องใช้ custom domain (HUMAN, DNS) ก่อน closed beta |
| TL-N08 | P1-F02-T14, HUMAN P1-F02-T20 | ขั้น 3 ของ T20 ให้ "เก็บมือถือในกระเป๋าบ้าง" ซึ่งทำให้ค่าแบตและ accuracy ปนกันระหว่างจอเปิดกับจอดับ (เว็บหยุดรับตำแหน่งเมื่อจอดับ) · ให้ kit แบ่งช่วงชัด: จอเปิดตลอดอย่างน้อย 20 นาทีสำหรับตัวเลขหลัก และช่วงเก็บกระเป๋าแยกที่ HUD บันทึกช่วงขาดเพื่อยืนยันพฤติกรรมตาม GDD "ล็อกหน้าจอ" |

## 7. ยืนยันสมมติฐานของแผน

- A-P1-PLAN-01-1: ยืนยัน (workspace ยังไม่เป็น git repo ตรวจแล้ว) · ทุกงานโค้ดรวม `tools/*` รอ P1-F02-T01
- A-P1-PLAN-01-4: ยืนยัน · agent พิสูจน์ได้แค่ build + serve local และ `wrangler` dry-run
- A-P1-PLAN-01-6: ยืนยันแบบแก้ไข · Battery Status API เมื่อมี และให้คนจดเมื่อไม่มี ถูกต้อง · การวัด data เปลี่ยนเป็นนับ byte ในตัว client ตาม TL-S07 · FPS วัดช่วงที่แผนที่ render ตาม TL-M04
