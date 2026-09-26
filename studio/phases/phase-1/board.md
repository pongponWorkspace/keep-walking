# Phase 1 Board — Pre-production และพิสูจน์ความเสี่ยง

สถานะ board: COMPLETE — AGENT SIDE, WAITING FOR HUMAN (rev 6, P1-CLOSE-PM 2026-09-24 · งาน agent ที่ไม่ขึ้นกับคนเสร็จหมด · เหลือ HUMAN 9 งาน และ P1-F02-T21, P1-F02-T24, P1-CLOSE-QA รอบ 2 ที่รอผลเดินทดสอบ P1-F02-T20 · P1-F02-T25 CUT · รายงานปิด `studio/phases/phase-1/report.md` (producer ส่งเนื้อหาใน report ของ P1-CLOSE-PM ให้ orchestrator บันทึกลงไฟล์)) · rev 5 (P1-PLAN-SYNC-01 ระหว่าง run 1 · หัวข้อ 3 เขียนใหม่สำหรับงานที่เหลือ · รายการเปลี่ยนในหัวข้อ 10) · rev 4 (P1-PLAN-04) — rev 2 ปรับตาม plan review แล้ว (หัวข้อ 7) · rev 3 ปรับตามคำตอบคน D-001 (ต้นทุนศูนย์ ห้ามผูกบัตร) และ D-002 (repo public + GitHub Actions) (หัวข้อ 8) · rev 4 (P1-PLAN-04) ปรับตาม D-003..D-010: stack และ tile host ตัดสินแล้วเป็น Cloudflare Free ไม่ผูกบัตร (D-008), P1-F02-T22 CUT, E11/E14/E20 ยืนยันแล้ว (D-009), roadmap แก้ตาม D-010 (หัวข้อ 9) · ไม่มีคำถามคนค้างที่ขวางการเริ่ม W1
Feature: F01 Coverage Survey · F02 Tech Foundation และ Map/Location Spike · F03 Game Bible และทิศทางทุกสาย

## 1. บริบท

### เป้าหมาย phase (จาก roadmap)
ตอบให้ได้ก่อนเขียน gameplay ว่า (1) กรุงเทพฯ และปริมณฑลมีพื้นที่พอทำ dungeon ไหม (2) แผนที่และ GPS บนเว็บมือถือใช้ได้จริงไหม (3) ทุก role มีทิศทางเดียวกัน
ปิด phase เมื่อมีผล Go / No-go จาก F01 + F02 · ถ้า No-go producer เสนอการปรับ design ก่อนเข้า Phase 2

### แหล่งอ้างอิง
- `studio/roadmap.md` หัวข้อ Phase 1 และตารางการมีส่วนร่วมของ role
- `studio/protocol.md` ข้อ 5 (อำนาจตัดสินใจ), 6 (gate), 7 (รูปแบบ board), 8 (chain), 9 (สัญญาร่วม)
- GDD: "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "World building", "โทนและภาษาในเกม", "พื้นที่เล่นและ Dungeon" (โดยเฉพาะ "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม"), "Class และ Party" (สูตร buff stacking), "Core loop ใน Dungeon", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู", "Progression > ตัวเลขตั้งต้น", "Economy", "สถานที่ที่ไม่ควรเป็น dungeon", "สถาปัตยกรรมเทคนิค", "แผนงาน" (M0, M1), "ความเสี่ยงที่ต้องเฝ้าดู"
- ไม่มี phase ก่อนหน้า จึงไม่มีงานค้างยกมา · decision log และ open questions ยังว่าง

### สมมติฐานของแผน (ให้ผู้รับผิดชอบยืนยัน)
- A-P1-PLAN-01-1: workspace ยังไม่เป็น git repo และยังไม่มี `apps/` `packages/` ดังนั้น P1-F02-T01 (ADR 0001 + `git init`) เป็นงาน tech แรก และทุกงานที่เขียนโค้ด (รวม `tools/coverage/`, `tools/tiles/`, `tools/sim/`) ต้องรองานนี้ (ยืนยัน: tech-lead)
- A-P1-PLAN-01-2: ขอบเขตพื้นที่ = กรุงเทพฯ + ปริมณฑล 5 จังหวัด (นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร นครปฐม) (ยืนยัน: level-designer)
- A-P1-PLAN-01-3: CI ใช้ GitHub Actions โดยคนสร้าง repo และ push เอง (P1-F02-T18) · agent ตรวจ CI ได้ในเครื่องผ่าน script เดียวกับที่ workflow เรียก (ยืนยันแล้ว D-002, D-007: repo public `pongponWorkspace/keep-walking` สร้างแล้ว)
- A-P1-PLAN-01-4 (แก้ใน P1-PLAN-03, P1-PLAN-04): การ publish tile และ deploy preview บน Cloudflare Pages / Workers static assets แผน Free ที่ไม่ผูกบัตร (D-008 · GitHub Pages เป็นทางสำรองชั่วคราวเท่านั้น) เป็นงาน HUMAN (P1-F02-T19) เพราะต้องกดสั่งจากบัญชีของคน · agent พิสูจน์ได้แค่ build, serve ใน local และ dry-run
- A-P1-PLAN-01-5: เกณฑ์ขนาดพื้นที่ dungeon (3,000–150,000 ตร.ม.) อยู่ใน `config/balance/dungeons.json` ที่ systems-designer เป็นเจ้าของ ไม่ hardcode ใน script coverage (ยืนยัน: systems-designer, location-engineer)
- A-P1-PLAN-01-6: วิธีวัดแบต FPS data และ accuracy บนเว็บมือถือทำในตัว client (debug HUD + export CSV) ค่าแบตใช้ Battery Status API เมื่อมี (Chrome Android) และให้คนจด % จากเครื่องเมื่อไม่มี (iOS Safari) (ยืนยัน: tech-lead)
- A-P1-PLAN-01-7 (แก้ใน P1-PLAN-02): backend-programmer ไม่มีงานใน Phase 1 · vfx-animator มีงานเดียวคือเอกสารทิศทาง motion (P1-F03-T27) เพื่อให้ exit criterion "ทุก role" ครบ (MF-5)
- A-P1-PLAN-02-1: sandbox ของ agent ดาวน์โหลดไฟล์ใหญ่ได้ (OSM extract, ข้อมูลประชากร, tile extract, browser binary ของ e2e) · ถ้าไม่ได้ orchestrator เปิดงานคนสำรอง P1-F02-T25 ทันที (ยืนยัน: location-engineer เมื่อเริ่ม P1-F01-T05)
- A-P1-PLAN-02-2: E14 "ทุก role มีเอกสารทิศทางที่ผ่าน design gate" อ่านว่า role ฝั่ง design/art ผ่าน design gate A/B และ content gate · role ฝั่ง tech ใช้ ADR + tech note ที่ผ่าน tech gate · qa-tester ใช้ test plan (ตารางใน F03) ตามข้อเสนอ game-director (ยืนยันแล้ว D-009)
- A-P1-PLAN-02-3 (ยืนยันเป็น D-006 แล้ว): ทุก polygon ที่อยู่ในหรือทับเขตวัดและศาสนสถานถูกตัด รวมงานวัด · อนุญาตเฉพาะงาน event หรือตลาดนัดที่อยู่นอกเขตศาสนสถานทั้งหมด (ยืนยันแล้ว D-006)
- A-P1-PLAN-02-4 (แก้ใน P1-PLAN-04): HUMAN P1-F03-T28 (อนุมัติการแก้ถ้อยคำ GDD) ไม่ใช่เกณฑ์ปิด Phase 1 · ถ้ายังไม่ได้คำตอบตอนปิด phase producer ย้ายไปเป็นงาน HUMAN บน board Phase 2 (ไม่ขวางงาน Phase 2) และต้องปิดก่อนเริ่ม Phase 3 ตามกติกา roadmap (ยืนยันแล้ว D-009) · P1-F02-T22 (backend stack) ไม่ยกยอดแล้วเพราะ CUT ตาม D-008

### กฎ path ร่วม (TL-M01 · ใช้ทุก wave)
- lockfile ที่ root (`pnpm-lock.yaml` หรือไฟล์ตาม package manager ที่ ADR 0001 เลือก) และ root `package.json` เป็น path ร่วม · เจ้าของตั้งต้นคือ P1-F02-T01 ซึ่งติดตั้ง dependency ที่คาดได้ของทั้ง phase ไว้ล่วงหน้าพร้อม pin version
- การแก้ `dependencies` ใน `package.json` ใดก็ตามถือว่าเขียน lockfile · ใน wave หนึ่งมีได้ไม่เกิน 1 งานที่ประกาศ lockfile ใน Writes
- งานอื่นที่ต้องการ dependency ใหม่ให้เขียน handoff ถึง tech-lead · orchestrator เปิดงาน `X` ของ tech-lead (Writes: lockfile, root `package.json`, `package.json` ของ workspace นั้น) ใน wave ถัดไป ระหว่างรอใช้ assumption ต่อได้
- Python ใน `tools/` pin dependency ต่อโฟลเดอร์ (เช่น `tools/coverage/requirements.txt` + venv ในโฟลเดอร์) จึงไม่ชนกัน
- ไฟล์ `.env.example` มีเจ้าของได้ครั้งละ 1 งานต่อ wave (P1-F02-T07 ใน W2, P1-F02-T08 ใน W5)
- ชื่อ env ฝั่ง client ล็อกแล้ว (TL-S05): `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` · ชื่อกลางฝั่ง deploy: `TILES_PUBLIC_BASE_URL` (แทน `R2_PUBLIC_BASE_URL` เดิม) · ไม่มีชื่อ env ที่ผูกกับ R2 · env ของ host (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` ตาม D-008 · ชื่อ Pages project อยู่ใน config ของ `infra/` ไม่ใช่ secret) เพิ่มใน `.env.example` โดย P1-F02-T08 ใน W5 เท่านั้น · ทางสำรอง GitHub Pages ผ่าน Actions ไม่ต้องมี secret เพิ่ม (ใช้ `GITHUB_TOKEN` ของ workflow)

### กฎคุมค่าใช้จ่าย (D-001 · ใช้กับทุกงาน infra และทุกงาน HUMAN)
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** กับบริการใดทั้งสิ้น ใช้เฉพาะ free tier ที่สมัครได้โดยไม่ใส่ช่องทางชำระเงิน · ห้ามกดทดลองแผนเสียเงิน (trial) ที่ต้องใส่บัตร
- ถ้างานใดพบว่าสิ่งที่ต้องทำไม่มีทางฟรีที่ไม่ใช้บัตร ให้หยุดส่วนนั้น รายงาน status `BLOCKED` หรือ `PARTIAL` พร้อมคำถามถึง HUMAN (ทางเลือกฟรีที่ลดขอบเขต เทียบกับการขออนุมัติค่าใช้จ่าย) ห้ามทำต่อด้วยบริการเสียเงิน
- ADR และ tech note ที่อ้าง free tier ต้องระบุเพดาน (ขนาดไฟล์, พื้นที่รวม, bandwidth, request, การ pause เมื่อไม่ใช้งาน) พร้อม URL และวันที่ที่ตรวจ
- งาน HUMAN ที่เป็นการตัดสินใจล้วน (P1-F01-T11, P1-F02-T23, P1-F03-T26, P1-F03-T28 · P1-F02-T22 CUT ตาม D-008) ไม่แตะบริการใด แต่ถ้าคำตอบใดทำให้ต้องใช้บริการเสียเงิน ต้องเป็น decision แยกที่คนอนุมัติค่าใช้จ่ายโดยตรง

### กฎ repo public (D-002)
- ทุกไฟล์ที่ commit เปิดเผยต่อสาธารณะ: ห้าม commit secret, `.env*` ที่มีค่า (ยกเว้น `.env.example` ที่ไม่มีค่า), raw GPS trace, ข้อมูลส่วนบุคคล, ไฟล์ข้อมูลดิบขนาดใหญ่
- บังคับสามชั้น: `.gitignore` (P1-F02-T01) → secret scan + guard ไฟล์ต้องห้ามใน CI (P1-F02-T07) → GitHub secret scanning + push protection ที่คนเปิดใน P1-F02-T18 · tech gate (P1-F02-T15) และ regression (P1-CLOSE-QA) ตรวจซ้ำ

### ข้อเสนอ decision จาก tech-lead review (ให้ ADR 0001 / tech note F02 รับไปตัดสิน)
- propose: basemap ใช้ schema ของ Protomaps (pin เวอร์ชัน) และได้ tile ด้วย `pmtiles extract` จาก Protomaps daily build ตาม bbox กรุงเทพฯ + 5 จังหวัด · planetiler เป็นทางสำรองโดยต้องใช้ profile ของ Protomaps | authority: tech-lead | ที่บันทึก: P1-F02-T03
- propose: agent ไม่ commit เอง · orchestrator commit เมื่อจบแต่ละ wave ด้วยข้อความอ้าง task ID · commit แรกของ P1-F02-T01 `git add` เฉพาะ path ของตัวเอง · ใช้ git config ระดับ repo | authority: tech-lead | ที่บันทึก: ADR 0001 (P1-F02-T01)
- propose: โค้ดใน `apps/*` และ `packages/*` ห้าม import จาก `tools/*` บังคับด้วย lint (`no-restricted-imports` หรือ boundary rule) | authority: tech-lead | ที่บันทึก: ADR 0001 (P1-F02-T01)

### ข้อสังเกตจาก GDD ที่ต้องให้คนตัดสิน (ไม่แก้ GDD เอง · รวมใน HUMAN P1-F03-T28)
หลักร่วม: config ใช้ค่าตาม GDD ไปก่อนทุกข้อ simulator ต้องได้ค่าตามตาราง GDD แล้วค่อยเสนอ decision · orchestrator ลง decision log และ `studio/questions/open-questions.md` ทันทีที่ P1-F03-T06 หรือ T08 รายงาน ไม่รอ design gate B
- Support base 25 / cap 50 = 0.50 เกินกฎ "base ราว 1/3 ถึง 2/5 ของ cap" → ผลใน P1-F03-T06 และ T08 → ตัดสินแล้ว D-004: คงค่า 25/50 เป็นข้อยกเว้นโดยเจตนา
- รายได้ 1,470 gold/ชม. เทียบค่ายา 600 = 2.45 เท่า ต่ำกว่าเป้า 2.5–3 แต่ GDD เขียนว่า "ตรงกับเป้าหมาย" → ผลใน P1-F03-T08 (ค่ายาต้องคำนวณจาก damage model) · exit criterion ของ Phase 4 ใน roadmap เป็นไปไม่ได้ตามตัวอักษร → ตัดสินแล้ว D-005: ยอมรับ 2.45 ภายใน tolerance · producer แก้ exit criterion Phase 4 ใน roadmap
- งานวัดเป็น dungeon ชั่วคราว (หัวข้อ "ปัญหา coverage") ขัดกับห้ามวัดและศาสนสถาน (หัวข้อ "สถานที่ที่ไม่ควรเป็น dungeon") → ตัดสินแล้ว D-006: ตัดเขตวัดและศาสนสถานทั้งหมดรวมงานวัด
- รายการ "ที่ยังต้องตัดสินใจ" ใน GDD ยังไม่ติ๊ก แต่ 5 ข้อมีคำตอบใน GDD แล้ว → ตารางสถานะใน P1-F03-T01
- เวลาอยู่รอด 45 นาทีไม่ได้บอกว่านับถึง HP 0 หรือถึง auto-retreat 25% → P1-F03-T07 รายงานทั้งสองค่า

### เลือก gate ต่อ feature (protocol ข้อ 6)
| Feature | Gate | เหตุผล |
| --- | --- | --- |
| F01 | QA → Design, Product | script เป็นเครื่องมือวิเคราะห์ offline ไม่อยู่ในเส้นทาง product · QA ตรวจความถูกต้องและรันซ้ำได้ก่อน แล้ว Design/Product ตัดสินบนตัวเลขที่ผ่าน QA แล้ว (PM-M02) · tech gate F02 (P1-F02-T15) ตรวจ hygiene ของ `tools/coverage/` เท่านั้น ไม่ขวาง Go/No-go (TL-S03) |
| F02 | Tech, QA | งานโค้ดและ infra · เกณฑ์ spike ตั้งล่วงหน้าโดย tech-lead (P1-F02-T03) และ product-manager ร่วมยืนยัน (P1-F02-T27) แทน product gate เต็มรูป (PM-M01, PM-S06) |
| F03 | Content (copy), Content (visual), QA (simulator), Design A, Design B | เอกสารทิศทางเป็นงาน design ล้วน · simulator ข้าม tech gate แบบมีเงื่อนไข: `tools/sim/` อยู่ในขอบเขต hygiene ของ P1-F02-T15 และ `apps/*` `packages/*` ห้าม import `tools/*` · design gate แยกสองชุดให้แต่ละชุดอยู่ใน 1–3 วัน |

### คำตอบจากคน (orchestrator กรอก)
คำถามที่ส่งคนและคำตอบ · ณ rev 4 ทุกคำถามของการวางแผนได้คำตอบแล้ว (D-001..D-010) · คำถามใหม่ระหว่าง run ให้เพิ่มแถวพร้อม assumption ระหว่างรอ
| วันที่ | คำถาม | คำตอบ | assumption ระหว่างรอ | กระทบ task |
| --- | --- | --- | --- | --- |
| 2026-09-23 | CI host | GitHub Actions บน repo **public** (D-002) · repo: `https://github.com/pongponWorkspace/keep-walking` (สร้างแล้ว ว่าง) | GitHub Actions (A-P1-PLAN-01-3) | P1-F02-T07, T18, T26 |
| 2026-09-23 | วิธีชำระเงินของ Cloudflare เพื่อเปิด R2 | **ห้ามผูกบัตรกับบริการใดเลย** ใช้เฉพาะ free tier ที่ไม่ต้องใส่บัตร · R2 ใช้ไม่ได้ (D-001) | — | P1-F02-T17, T19 |
| 2026-09-23 | รุ่นมือถือที่ใช้เดินทดสอบ | ทั้ง Android (Chrome) และ iOS (Safari) · เดินทดสอบและบันทึกผลแยกต่อเครื่อง | — | P1-F02-T14, T20 |
| 2026-09-23 | Support base 25 / cap 50 | คนมอบให้ orchestrator ตัดสิน → คง 25/50 เป็นข้อยกเว้นโดยเจตนาของกฎ 1/3–2/5 (D-004) | — | P1-F03-T06, T08, T28 |
| 2026-09-23 | อัตราส่วนรายได้ต่อค่ายา 2.45 | คนมอบให้ orchestrator ตัดสิน → ยอมรับ 2.45 ว่าอยู่ในเป้า "ราว 2.5" · tolerance เป็น config key (D-005) | — | P1-F03-T08, T28 |
| 2026-09-23 | นโยบายงานวัด | คนไม่มีความเห็น ("ไม่สน") → orchestrator เลือกทางเสี่ยงต่ำ: ตัดเขตวัดและศาสนสถานทั้งหมด รวมงานวัด (D-006) | — | P1-F01-T01, T02, T04, P1-F03-T20, T28 |
| 2026-09-23 | backend stack และ host ของ tile/preview | คนมอบให้ orchestrator ตัดสิน ("ทำทุกอย่างให้ฟรีและง่ายสำหรับการ scale ที่สุด ตัดสินใจได้เลย") → Cloudflare Free ไม่ผูกบัตร: Workers + Durable Objects (SQLite-backed) + D1 + Pages · tile บน Cloudflare Pages/Workers static assets แบ่งไฟล์ตามพื้นที่ถ้าเกินเพดาน · GitHub Pages สำรองชั่วคราว · URL ของ tile อยู่ใน config · ทางขยาย Workers Paid + R2 ในบัญชีเดิม (D-008) | — | P1-F02-T02, T03, T06, T08, T11, T17, T19, T22 (CUT) |
| 2026-09-23 | การถอด E11, การอ่าน E14, เกณฑ์ปิด E20 | คนมอบให้ orchestrator ตัดสิน → ยอมรับทั้งสามข้อ exit checklist คงตาม rev 3 (D-009) | — | หัวข้อ 5, A-P1-PLAN-02-2, A-P1-PLAN-02-4 |
| 2026-09-23 | แก้ถ้อยคำ roadmap (R2, เกณฑ์ปิด Phase 4) | อนุมัติ producer แก้ roadmap (D-010) · แก้แล้วใน P1-PLAN-04 | — | `studio/roadmap.md`, E9 |

ผลที่ตามมาจากคำตอบ D-001 และ D-002 (producer บันทึกใน P1-PLAN-03)
- D-001: GDD "สถาปัตยกรรมเทคนิค" กำหนด PMTiles บน R2 · เป้าหมายนี้**คงเป็นแผนระยะยาว** แต่เลื่อนไปจนกว่าคนอนุมัติค่าใช้จ่าย (decision แยก) · Phase 1 ใช้ Cloudflare Pages / Workers static assets แผน Free แทน (D-008 · P1-F02-T03 ยืนยันเพดานและงบขนาด ไม่เลือก host ใหม่) · การย้ายไป R2 อยู่ในบัญชี Cloudflare เดิม · URL ของ tile, glyph, sprite เป็น config ทั้งหมด (`VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL`, `TILES_PUBLIC_BASE_URL`) การย้ายไป R2 ภายหลังจึงเป็นแค่เปลี่ยนค่า env และรัน script publish ใหม่ ไม่แตะโค้ด client
- D-001: host ฟรีมีเพดานขนาดไฟล์ (เช่น GitHub Pages 100 MB ต่อไฟล์ และ 1 GB ต่อ site · Cloudflare Pages ราว 25 MiB ต่อไฟล์) จึงอาจต้องลด maxzoom (vector tile ขยายเกิน maxzoom ได้), ตัดเฉพาะพื้นที่เปิดตัว หรือแบ่งไฟล์ · ตัวเลขเหล่านี้ต้องตรวจซ้ำใน P1-F02-T03 ก่อนใช้ · (P1-PLAN-04) ตาม D-008 ทางแก้หลักบน Cloudflare คือแบ่ง PMTiles ตามพื้นที่ให้ทุกไฟล์ผ่านเพดานต่อไฟล์ · GitHub Pages ใช้เป็นทางสำรองชั่วคราวเท่านั้น
- D-001, D-008: ADR 0002 ยืนยัน stack Cloudflare Free ตาม D-008 (Supabase Free บันทึกเป็นทางเลือกที่พิจารณาแล้วไม่เลือก) · ต้นทุนเมื่อเกิน free tier เป็นข้อมูลประกอบให้คนตัดสินในอนาคตเท่านั้น
- D-002 ผลที่รู้ล่วงหน้า: GDD, `studio/` ทั้งหมด (roadmap, board, decision log, คำถาม), `.claude/agents/`, CLAUDE.md และเอกสาร design ทุกฉบับจะเปิดเผยต่อสาธารณะเมื่อ push ครั้งแรก (P1-F02-T18) · คนควรอ่านทวนว่าไม่มีข้อมูลที่ไม่อยากเปิดเผยก่อน push · repo public ที่ไม่มีไฟล์ license มีผลเป็นสงวนสิทธิ์ทั้งหมด การเลือก license เป็นการตัดสินใจของคนภายหลัง ไม่ขวาง Phase 1
- D-001, D-010: roadmap หัวข้อ F02 เคยเขียน "upload R2" และงานคน "บัญชี Cloudflare/R2" · producer แก้แล้วใน P1-PLAN-04 ตาม D-010 เป็น publish บน Cloudflare Free ที่ไม่ผูกบัตร (R2 เมื่ออนุมัติงบ) · เกณฑ์ปิด Phase 4 แก้ตาม D-005 ในงานเดียวกัน

### งานที่ยกไปให้การวางแผน Phase 2
- จาก P1-X42: gameplay-programmer เปลี่ยน apps/client/src/main.ts ให้ tilesUrlMissing ผ่าน getCopyText · narrative-designer เพิ่ม area `client` ใน copy-rules.json (ปิด WARN S1) · uiux-designer ตรวจป้ายปุ่ม 11 cell บนจอจริง
- tech-lead/devops (จาก P1-X41): ต่อ `infra/scripts/test/test-lint-headers.sh` เข้า CI (step ใน ci.yml หรือ vitest bridge) ให้ตรวจ _headers ทับกันก่อน deploy ทุกครั้ง
- tech-lead/location-engineer (จาก P1-X39): เช็ก bbox-vs-province ใน build.sh ข้ามใน CI แล้ว ถ้าแก้ area.bbox ต้องรัน tools/coverage + tools/tiles/test/run.sh ในเครื่องก่อน · พิจารณาไฟล์ polygon จังหวัดขนาดเล็กที่ commit ได้เพื่อให้ CI ตรวจได้ (playarea-mask.geojson ใช้แทนตรงๆ ไม่ได้ เพราะ simplify แล้วขอบไม่ตรง)
- devops-engineer: เพิ่มการตรวจใน CI/runbook ว่า token มีแค่สิทธิ์ Pages Edit และ `infra/` ไม่เรียกบริการคิดเงิน (D-085) · runbook ตั้ง billing notification ของ Cloudflare/GitHub ให้ HUMAN
- level-designer: แผนทางเสริมและ dungeon นำร่องของเขตบางรัก (ย่านที่ 3 ตาม D-083, มี 6 แห่ง ติดปทุมวัน) · location-engineer: ใส่ osm_id ที่ตัดตาม D-083 เข้า coverageFilter.reviewOsmIds แล้วรัน pipeline ซ้ำ · product-manager: คำนวณ GR-1 ใหม่สำหรับ 3 ย่านชุดนี้ (D-081 ถูกปฏิเสธ)
- ผู้ที่ได้รับมอบหมาย (ระบุตอนวาง Phase 2): แก้ไฟล์ GDD ตามถ้อยคำที่ HUMAN อนุมัติใน D-084 · systems-designer: ใช้ D-038 ทาง B (vitPotionEfficiency +2% → +1% ต่อแต้ม) ใน config + vectors
- qa-tester: บันทึกบั๊ก severity high ของ P1-H06 (ป้าย dungeon ซ้ำ ปิดแล้วใน P1-X32/X33) ย้อนหลังใน `qa/bugs.md` (จาก P1-CLOSE-PRODUCT)
- (จาก P1-F03-T25) systems B-01 farDungeonThreshold_m ≤1,970 (เสนอ 1,900) ตาม D-079, B-02 dungeons.safety ตาม D-061 ที่แก้, B-03 R-B1 ใน balance-model 3.1 + vector ขอบ, B-04 partyMult cap ใน raid.json, B-05 งาน F-12b ใน Phase 4 · PM B-06 telemetry (run_death ตาม R-B1, property ของ run_auto_retreat, exit_reason suspended_by_reports, event เปิด/ปิด auto-retreat, reason_category), B-07 metrics (P2 เวลาถึง auto-retreat, party ratio ตาม D-039, ratio รายได้/ยา ตาม class/party/level, 10.1 ตาม D-063, GR-9 ตามหมวด) · game-director B-08 pillars 7.1 ตาม D-072/B-01 และใส่ R-B1/D-059/D-061 ใน spec F05/F13
- (จาก P1-F03-T22 รอบ 2) artist V-18 clipPath แถบแสงเงาในทุกไฟล์อวตาร (ล้นขอบถึง ~13 px ใต้คาง) ก่อนงานอวตาร Phase 2, V-19 composite เพิ่มมุมข้าง/หลัง + panel กลางคืนบน bg.night, ตั้ง ref.style-tile.v1 status approved · uiux V-20 ขอบ .toast.faded เป็น ink.500, V-22 ข้อความ .gps-pill ≥14 px (ก่อน build F04) · vfx V-21 Rare ขอบกะพริบเป็นความหนาขอบ/scale ไม่ใช้ filter/opacity
- (จาก P1-F03-T22) qa V-10: e2e นับ kw-rift-sponsored/kw-rift-crack, ถ่าย S1/S3 ใหม่ + S6 ชายฝั่งสมุทรปราการ (100.60, 13.50 z10/z13) · location: ถ้า S6 เห็นขอบดำกลางทะเลให้ตัดรู mask ด้วย bbox tile · uiux V-15 .chip-sponsored, V-16 tokens (12 ramp, nameMapping, font.map.weights, ตัวเลขตีบวก ≥64 px) · gameplay: วัดความสูงปุ่มแบรนด์ตอน F07 · art-director F-AD-1..4 (map-style 6.2/6.3/10.1 ตาม D-060, style guide 10 แถว 4, 8.2, 3.5, 7, 6.2, S7)
- (จาก P1-X33) tech-lead/gameplay: ต่อ setDungeonsSourceData เข้า main.ts เมื่อมีรายการ dungeon ฝั่ง client (F04) · qa ถ่าย S1/S3 ใหม่
- (จาก P1-X32) tech-lead: tech note 15.2 ครอบ source kw-dungeon-labels + ตัดสิน D-075 และใช้แพ็กเกจ polylabel หรือเขียนเอง · qa: static check ใน map-style.test.ts (ไม่มี symbol layer บน kw-dungeons) และถ่าย S1/S3 ใหม่หลัง P1-X33
- (จาก P1-H06) location: fixture ลุมพินีแคบเกินทดสอบ S2 (ซอยสุขุมวิท) และ S5 (เจ้าพระยา) ของ map-style · narrative: copy key client.mapSpike.followModeOn/Off/startLocation
- (จาก P1-F02-T16) qa/gameplay: e2e ถาวรสำหรับ TC-MAP-05 (เน็ตหลุดกลาง pan) และ TC-MAP-08 (ขอ tile นอกชุด) · tech-lead/gameplay: DOM environment ของ Vitest สำหรับ S15 latency และ S3 แบต/CSV ใน hud-panel.ts
- (จาก P1-F01-T09) N-01 location+systems: เพิ่มคำราชาศัพท์ (เฉลิมพระเกียรติ, ราชานุสรณ์, ราชานุสาวรีย์, พระบรม, ราชอุทยาน, สมเด็จ) ใน reviewNamePatterns + flag สถานีรถไฟและสถานที่เก็บค่าเข้า/พิพิธภัณฑ์ แล้วรันซ้ำก่อน F14 · N-02 systems/uiux/level: ปรับ farDungeonThreshold_m ตาม D-072 และแสดงระยะเป็นค่าประมาณ · N-03 PM/uiux: แยก guardrail โซนแดงในและนอกย่านเปิดตัว, หน้าที่บ้านสำหรับคนนอกย่านเปิดตัว (D-073) · N-04 level: ไม่มี level band ในย่านเปิดตัวที่พึ่ง dungeon เดียว, สำรวจชั้นที่สองของดินแดงก่อน F04 · N-05 level: วาดขอบเลี่ยงศาลในสวนสราญรมย์, อุทยาน 100 ปี จุฬาฯ, ตลาดขวัญพัฒนา 2, ตลาดนัดรถไฟรัชดา; ตรวจภาคสนามตลาดที่มีคำว่า "วัด" · game-director: pillars 7.1 ตาม D-072
- (จาก P1-X29) location: README หัวข้อ 6 บันทึก fixture_blocklist.py และไฟล์ข้อความ/template heatmap, ลบข้อความไทยใน docstring boundaries/osm.py:27, ผูกตัวเลขใน legend heatmap (800 ม./3 กม./79 เขต) กับ config · qa: ปิด BUG-F01-001/002 ใน qa/bugs.md
- (จาก P1-F02-T14) gameplay: HUD เลือก environment/segment และคำนวณ stationary_5min_accum_m ตาม gps-trace-format 4.1 (Phase 1 ใช้วิธีเปิดหน้าใหม่ต่อช่วง + เปลี่ยนชื่อไฟล์ ถือเป็นช่องว่างที่ยอมรับ)
- (จาก P1-F02-T15) gameplay: F-04 เลิก bundle dungeons.json/anticheat.json ทั้งไฟล์เข้า client, F-05b ย้าย haversine/gate ไป packages/shared, F-06 code-split maplibre ถ้า T20 วัด S5 เกิน 1.0 MB, F-08 ค่าคงที่ UI เข้า config/app · location: F-05a ลบ LegacyWebLocationTiming, F-07 excluded.geojson ≤ 4.5 MB
- (จาก P1-F01-T07) หลัง HUMAN ตัดสิน P1-F01-T11: location รัน analysis ซ้ำด้วยสูตร transit ใหม่ (D-069), เพิ่มคอลัมน์ pocketPark_walk_median_m, ใส่ osm_id ที่คนตัดสินเข้า coverageFilter.reviewOsmIds (systems) แล้วรัน pipeline ซ้ำ, ถ้าเลือกดินแดงให้สำรวจชั้นที่สอง · narrative: ชื่อไม่มีราชาศัพท์สำหรับ #16 สวนสมเด็จพระปกเกล้าฯ ถ้าคนปล่อย
- (จาก P1-F01-T06) location: pipeline/run.py ให้ out/run-meta.json บันทึกเฉพาะคีย์ที่อ่านจริง (ไฟล์ ignore ไม่กระทบที่ commit) · PM ยืนยัน A-P1-F01-T06-2/-4/-7
- (จาก P1-F03-T24 รอบ 2, สำคัญ) uiux N-3: run แรกของบัญชีต้องแสดง dungeon.confirmTutorialLine ก่อนเข้าจอพกกระเป๋า หรือแสดงบนจอพกกระเป๋าเอง (บทเรียนเดียวของนาที 3–6) · uiux N-1: ia.md บรรทัด ~96 S-22 ยังมี auto-retreat toggle และ "ภาษา" ในหน้าแรก · tech-lead N-2: tech note F02 บรรทัด ~424 ใช้ key ที่ถูกถอด · level-designer F-11, sound F-13 ยังเปิด
- (จาก P1-X18) tech-lead: tech note F02 บรรทัด ~424 สถานะ "นอกพื้นที่" ฝั่ง server ใช้ mask ผ่าน packages/geo · PM: telemetry event anticheat_speed_lock_triggered / checkin_rejected และ exit_reason ครอบปิดฉุกเฉิน · (จาก P1-F02-T13) qa: TC-HUD-03..12 หลัง HUD เสร็จ
- (จาก P1-F03-T24) sound: F-13 raid.thirtyMinWarning ไม่เร่งรีบ priority ต่ำกว่า run.hpLow · PM: F-16 metric เวลาถึง raid notice แรก, สัดส่วนผู้เล่นใหม่ที่พลาดเสาร์แรก, event Wake Lock/เวลา page hidden ต่อ run (ไม่มีพิกัด) · tech-lead: F-17 ทดสอบความเป็นไปได้ของ Wake Lock + pocket screen บน Android/iOS, แบต, vibrate/web push matrix ถ้าไม่ได้ส่งกลับ game-director
- (จาก P1-F03-T21 รอบ 2) uiux: 01-map-home-states.html บรรทัด 105 interest.confirm → "(ยื่นเรื่อง)", ตัดสินเมนู "ภาษา" ใน S-22 (เสนอเอาออกจาก v1), index.html ศัพท์ "ยื่นเรื่องเปิดจังหวัด" · narrative: dungeon.vsBossNormalCardHint / vsBossRaidCardHint ก่อนสเปก raid
- (จาก P1-X05) tech-lead: แก้ ADR 0001 ข้อ 3.5, 3.10.1, 3.10.3, 3.11 ตามการตัดสินใน X05 · location-engineer: export WebLocationTiming จาก packages/location/src/index.ts และลบ alias หลัง T11 ย้ายชื่อ · product-manager: telemetry-events.md ชี้ config/app/telemetry.json
- (จาก P1-X04) product-manager: แก้ telemetry-events.md / metrics.md ให้อ้าง key จริง telemetry.sampling.*, telemetry.timestamps.clockSkewTolerance_s, telemetry.goldAmountBuckets.upperBounds_gold, dungeons.safety.reportThreshold/reportWindow_h
- (จาก P1-X06) uiux: เพิ่ม color.ramp.skin-1..6 / hair-1..6 ใน design/ux/tokens.json · qa: ขยาย regex ramp ใน contrast.test.ts เป็น `ramp\.([a-z0-9-]+)` และนับ 22 · qa: เพิ่ม qa/tests/unit/map-style.test.ts (validateStyleMin) หลังติดตั้ง style-spec · (จาก P1-H07) backend Phase 3 ใช้รูของ playarea-mask เป็นขอบพื้นที่เล่นฝั่ง server ผ่าน packages/geo
- (จาก P1-X04/F-07) backend: จ่ายรางวัลปิดฉุกเฉินตาม dungeons.json#emergencyClose._note พร้อม test ขอบ elapsed 59/60 วิ และระยะเท่าเกณฑ์พอดี (ต้องไม่ผ่าน)
- (จาก P1-F03-T11) tech-lead: tools/art (rasterize, สลับสี key, quantize 1x/2x, อัปเดต bytes/sha256), validator V1–V13 + art/assets/manifest.schema.json เป็น test ใน CI, วิธีส่ง art/assets ถึง client, field appearance ใน profile API, vendor font (IBM Plex Sans Thai Looped WOFF2 ไม่แก้ไข, Noto Sans Thai TTF) + OFL.txt + sha256 · uiux: อวตารบนแผ่น bg.surface เสมอ, party card ≥96×120, หน้าสร้างตัวละคร 6×6×6 ไม่มีเพศ, หน้า Credits/ลิขสิทธิ์ · vfx: ใช้ pose kit ของ avatar-spec §10 · systems: content config ของอุปกรณ์/cosmetic มี assets.icon/assets.layer เป็น manifest id
- (จาก P1-F03-T27) vfx-animator build: module CSS/WAAPI ใน `art/vfx/` ตาม motion-direction §10 และ `art/vfx/demo/*.html` · artist-2d ยืนยันท่า quick-command 10 ตัวกับ layer อวตาร 3 มุม
- (จาก P1-F03-T20) liveops: `ops/raid-playbook.md` และ `ops/runbooks/` (ปิด dungeon ฉุกเฉิน, คิวรายงาน, sponsored lifecycle) · systems: ขยาย tuning playbook ถึง epic/legendary chance และ marketTax · producer: แปลง W1–W13 เป็นวันจริงตอนวาง F24 · (จาก P1-F02-T05) tech-lead: ย้าย listeners.ts/platform.ts ไป src/internal/ (ทางเลือก)
- (จาก P1-F03-T18) sound-designer build: `audio/src/` (Web Audio generator), `audio/out/`, `audio/manifest.json`, `audio/demo.html` · gameplay: fire-together 4 ชั้น (visual/vibration/sound/push) + priority queue ตาม cue-list.md §4 · **ความเสี่ยง:** `navigator.vibrate()` ไม่รองรับบน iOS WebKit ทำให้ "สั่นก่อนเสียง" ใช้ได้แค่ Android — tech-lead ยืนยัน matrix และหา fallback (ผลเดินทดสอบ T20 บน iPhone ยืนยันได้)
- (จาก P1-F02-T04, สำคัญ) systems-designer + location-engineer: speed lock ต้องใช้ความเร็วแบบกรอง/ต่อเนื่อง ไม่ใช่ความเร็วระหว่าง fix ดิบ (เดินในซอยพร้อม jitter ได้ 23.2–24.3 km/h ใกล้เพดาน 25) + กฎปลดล็อกเมื่อรถหยุดติดไฟแดง · tech-lead: กำหนด R ของ haversine (6,371,008.8 ม.) และนิยามหน้าต่าง gate (ช่วงปิด เลื่อน 30 วิ นับเฉพาะคู่ที่อยู่ในหน้าต่าง) ใน packages/geo ให้ตรงกับ trace และ HUD S12
- (จาก P1-F03-T19) Phase 3: tech-lead ออกแบบ pipeline ให้ run_tick_granted/denied ไม่เขียน row แยก (batch export) เพื่อไม่ชนเพดาน rows written · Phase 5: narrative + game-director กำหนด enum dungeon_report_submitted.reason_category
- (จาก P1-F03-T05) HUMAN: ทบทวนข้อความ legal/PDPA (consent.locationBody, age.underMinBody, privacy.positionLogExplain, privacy.withdrawConfirmBody, account.deleteBody) ก่อน closed beta · gameplay: wire area ใหม่ของ copy (roleInfo, profile, nav, label, push, weekday, privacy, interest, qc) และ formatter · อ่าน copy.th.json เป็น flat map
- (จาก P1-H01) tech-lead: config lint (ADR 0001 3.10.7) ถ้า P1-X05 ไม่ทำ
- (จาก P1-H03) tech-lead: config loader ของ Phase 2 ตรวจ raid.schedule.endLocalTime = start + durationTicks × raidTick_s และ fail ชัด · รองรับ namespace balance.privacy / app.privacy และไฟล์ใหม่ location.json, privacy.json
- (จาก P1-F02-T02) Phase 3: devops ตั้ง alert 50%/70% ของทุกเพดานใน ADR 0002 หัวข้อ 4.2 + runbook "โควตาเต็ม" · tech-lead เขียน tech note F07/F08 (API contract, WebSocket batch + `seq` idempotent, รหัสสถานะเมื่อโควตาเต็ม, schema D1/DO) · narrative เขียน copy "เซิร์ฟเวอร์ไม่พร้อม แต่เก็บการเดินไว้ให้แล้ว" · Phase 6/7: producer เพิ่ม decision ขออนุมัติ Workers Paid ตาม D-036
- (จาก P1-F03-T07) Phase 2: port `tools/sim/src/formulas.ts` เข้า `packages/shared` และผ่านทุก vector ใน `design/systems/test-vectors/`
- PRD ของ F04–F06 ต้องครอบกลุ่มผู้เล่นทั้งสาม (40 นาที/วัน เทียบ 3–6 ชม./วัน, คนอยู่บ้านตอนฝนตก, คนอยู่นอกพื้นที่) (PM-N02)
- HUMAN P1-F03-T28 ถ้ายังเปิดอยู่ (A-P1-PLAN-02-4) · P1-F02-T22 CUT แล้ว (D-008) ไม่ยกยอด
- ถ้าผล F01 ไม่ใช่ Go ล้วน game-director ประเมินผลต่อ pillars, preset และหน้าจอที่บ้านก่อนปิด phase (SF-13)

## 2. ตารางงาน

| ID | Feature | Task | Type | Owner | Deps | Writes | Status | Output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-F01-T01 | F01 | วิธีสำรวจ coverage และแหล่งข้อมูล (OSM, ขอบเขตจังหวัด, ประชากร, blocklist tag) | research | location-engineer | — | `tools/coverage/METHOD.md` | DONE | `tools/coverage/METHOD.md` |
| P1-F01-T02 | F01 | กฎคัด dungeon และเกณฑ์ให้คะแนนย่านเปิดตัว | spec | level-designer | — | `design/levels/dungeon-rules.md`, `design/levels/launch-criteria.md` | DONE | `design/levels/dungeon-rules.md`, `design/levels/launch-criteria.md` |
| P1-F01-T03 | F01 | PRD F01 พร้อมเกณฑ์ตัวเลข Go / ทางเสริม / No-go | spec | product-manager | — | `product/prd/F01-coverage-survey.md` | DONE | `product/prd/F01-coverage-survey.md` |
| P1-F01-T04 | F01 | Test plan F01 | spec | qa-tester | P1-F01-T01 | `qa/plans/F01-test-plan.md` | DONE | `qa/plans/F01-test-plan.md` |
| P1-F01-T05 | F01 | Pipeline ดึง OSM + คัด tag + คำนวณพื้นที่ + ตัด blocklist → candidates | build | location-engineer | P1-F02-T01, P1-F01-T01, P1-F03-T06 | `tools/coverage/pipeline/`, `tools/coverage/README.md`, `tools/coverage/requirements.txt`, `data/coverage/candidates.geojson`, `data/coverage/excluded.geojson` | DONE | `tools/coverage/pipeline/`, `data/coverage/candidates.geojson` (741), `data/coverage/excluded.geojson` (vitest glob ย้ายไป P1-X05) |
| P1-F01-T06 | F01 | นับรายเขต + heatmap เทียบความหนาแน่นประชากร | build | location-engineer | P1-F01-T05, P1-H08, P1-F01-T02, P1-X04 | `tools/coverage/analysis/`, `data/coverage/district-counts.csv`, `data/coverage/heatmap/`, `data/coverage/run-meta.json`, `data/coverage/points-unmatched.geojson`, `data/coverage/LICENSE-DATA.md`, `tools/coverage/params.json` (pipeline.outputs เท่านั้น), `tools/coverage/pipeline/process.py`, `tools/coverage/pipeline/osm_read.py`, `tools/coverage/pipeline/output.py`, `tools/coverage/pipeline/tests/`, `tools/coverage/README.md`, `data/coverage/candidates.geojson`, `data/coverage/excluded.geojson` | DONE | `data/coverage/district-counts.csv`, `heatmap/`, `run-meta.json`, `tools/coverage/analysis/` (730 dungeon, routing จริง) |
| P1-F01-T07 | F01 | Coverage report: ตีความผล, 2–3 ย่านเปิดตัว, คำแนะนำ Go / ทางเสริม | spec | level-designer | P1-F01-T02, P1-F01-T03, P1-F01-T06 | `design/levels/coverage-report.md`, `design/levels/launch-criteria.md` | DONE | `design/levels/coverage-report.md`, `design/levels/launch-criteria.md` |
| P1-F01-T08 | F01 | QA gate F01 | review-gate | qa-tester | P1-F01-T04, P1-F01-T07, P1-X08 | `qa/reports/F01-qa-gate.md` | DONE | `qa/reports/F01-qa-gate.md` (PASS), `qa/bugs.md` |
| P1-F01-T09 | F01 | Design gate F01 | review-gate | game-director | P1-F01-T07, P1-F01-T08, P1-X30 | `design/reviews/F01-design-gate.md` | DONE | `design/reviews/F01-design-gate.md` (รอบ 2 PASS, เงื่อนไข C-1 ถ้อยคำ) |
| P1-F01-T10 | F01 | Product gate F01 | review-gate | product-manager | P1-F01-T07, P1-F01-T08 | `product/reviews/F01-product-gate.md` | DONE | `product/reviews/F01-product-gate.md` (PASS) |
| P1-F01-T11 | F01 | ยืนยันผล Go / No-go ของ coverage | review-gate | HUMAN | P1-F01-T08, P1-F01-T09, P1-F01-T10 | — (orchestrator บันทึกใน decision log) | DONE | D-083: Go 3 ย่าน พระนคร + ปทุมวัน + บางรัก · สถานที่อ่อนไหวตามข้อเสนอ (2026-09-25) |
| P1-F02-T01 | F02 | ADR 0001 โครง repo + `git init` + monorepo skeleton + lint + test runner + e2e runner + ติดตั้ง dependency ล่วงหน้า | spec | tech-lead | — | `docs/adr/0001-repo-layout.md`, root config (`package.json`, lockfile, workspace file, `tsconfig.base.json`, lint/format config, test/e2e config, `.gitignore`, `.editorconfig`, `.nvmrc`), `apps/README.md`, `apps/client/package.json`, `packages/README.md`, `packages/shared/`, `packages/location/package.json`, `tools/README.md`, `tools/traces/package.json`, `tools/sim/package.json` (ถ้าเป็น TS) | DONE | `docs/adr/0001-repo-layout.md`, root config, workspace stubs, `packages/shared/` (commit 3163a3d) |
| P1-F02-T02 | F02 | ADR 0002 ยืนยัน backend stack ตาม D-008 (Cloudflare Free: Workers + DO SQLite + D1 + Pages) พร้อมเพดาน free tier ที่ตรวจแล้ว, ประมาณการโหลด Phase 2–3 และทางขยาย · Supabase Free เป็นทางที่ไม่เลือก | research | tech-lead | P1-F02-T01 | `docs/adr/0002-backend-stack.md` | DONE | `docs/adr/0002-backend-stack.md` (Accepted) |
| P1-F02-T03 | F02 | Tech note F02 + เกณฑ์ spike + รูปแบบ trace/CSV + tile schema + glyph + เพดานและงบขนาด tile บน Cloudflare Pages (D-008) + `LocationProvider` interface + trace schema | spec | tech-lead | P1-F02-T01 | `docs/tech/F02-map-location-spike.md`, `docs/tech/gps-trace-format.md`, `packages/shared/schemas/gps-trace.schema.json`, `packages/shared/src/trace.ts`, `packages/shared/src/index.ts`, `packages/location/src/types.ts`, `packages/location/src/index.ts` | DONE | `docs/tech/F02-map-location-spike.md`, `docs/tech/gps-trace-format.md`, `packages/shared/` trace + schema, `packages/location/src/types.ts` |
| P1-F02-T04 | F02 | ชุด GPS trace สังเคราะห์ + generator + README | build | location-engineer | P1-F02-T03 | `data/gps-traces/README.md`, `data/gps-traces/synthetic/`, `tools/traces/` | DONE | `data/gps-traces/synthetic/` (13 traces), `data/gps-traces/README.md`, `tools/traces/` |
| P1-F02-T05 | F02 | Web + Mock `LocationProvider` + Capacitor stub พร้อม test | build | location-engineer | P1-F02-T03, P1-F02-T04 | `packages/location/src/web/`, `packages/location/src/mock/`, `packages/location/src/capacitor/`, `packages/location/src/index.ts`, `packages/location/test/` | DONE | `packages/location/src/{web,mock,capacitor}/`, `packages/location/test/` (66 tests) |
| P1-F02-T06 | F02 | Script build PMTiles กรุงเทพ+ปริมณฑล ให้ผ่านเพดานไฟล์ของ host ฟรี + fixture เล็ก + glyph/sprite + size report | build | location-engineer | P1-F02-T01, P1-F02-T03 | `tools/tiles/` | DONE | `tools/tiles/` (build.sh, fixture lumpini, size-report; 13,502 tiles z15 budget PASS) |
| P1-F02-T07 | F02 | CI (lint, typecheck, test, build, secret scan, guard ไฟล์ต้องห้าม) + `.env.example` + เอกสาร environment | build | devops-engineer | P1-F02-T01 | `.github/workflows/`, `.gitleaks.toml`, `.env.example`, `docs/tech/environments.md` | DONE | `.github/workflows/ci.yml`, `.gitleaks.toml`, `.env.example`, `docs/tech/environments.md` |
| P1-F02-T08 | F02 | Infra preview บน Cloudflare Pages Free ไม่ผูกบัตร (D-008, งบขนาดจาก P1-F02-T03) + script publish tile/glyph/sprite + runbook | build | devops-engineer | P1-F02-T07, P1-F02-T03 | `infra/`, `.github/workflows/deploy-preview.yml`, `.env.example` | DONE | `infra/` (Pages config, _headers, publish scripts, runbook), `.github/workflows/deploy-preview.yml` |
| P1-F02-T09 | F02 | Client scaffold + หน้า spike MapLibre GL JS + PMTiles | build | gameplay-programmer | P1-F02-T01 | `apps/client/` | DONE | `apps/client/` (Vite + MapLibre + PMTiles spike, e2e 6 passed) |
| P1-F02-T10 | F02 | ต่อ `LocationProvider` เข้าแผนที่ (Web/Mock) + UI เล่น trace | build | gameplay-programmer | P1-F02-T09, P1-F02-T05 | `apps/client/` | DONE | `apps/client/src/{config,copy,location,map,ui,debug}/`, e2e location-mock (14 passed) |
| P1-F02-T11 | F02 | เครื่องมือวัด FPS / แบต / data / accuracy + tile กรุงเทพ + map style | build | gameplay-programmer | P1-F02-T10, P1-F02-T06, P1-F03-T12, P1-H05, P1-X05 | `apps/client/` | DONE | `apps/client/` HUD + real style + kw+https byte counting (888 tests, e2e 20) · แผนที่จริงยังดำ → P1-X23 |
| P1-F02-T12 | F02 | Test plan F02 | spec | qa-tester | P1-F02-T03 | `qa/plans/F02-test-plan.md` | DONE | `qa/plans/F02-test-plan.md` |
| P1-F02-T13 | F02 | Black-box trace-replay test + QA trace | build | qa-tester | P1-F02-T12, P1-F02-T05, P1-F02-T10, P1-F02-T06 | `qa/tests/F02/`, `data/gps-traces/qa/` | DONE | `qa/tests/F02/` (99 tests), `qa/tests/e2e/f02-map-fixture-tile.spec.ts`, `data/gps-traces/qa/` |
| P1-F02-T14 | F02 | ชุดคู่มือเดินทดสอบภาคสนาม + แบบฟอร์มผล + safety briefing | spec | qa-tester | P1-F02-T11, P1-F02-T08, P1-F02-T27, P1-X23 | `qa/playtest/field-walk-kit.md`, `qa/playtest/field-walk-form.md`, `qa/playtest/safety-briefing.md` | DONE | `qa/playtest/field-walk-kit.md`, `field-walk-form.md`, `safety-briefing.md` |
| P1-F02-T15 | F02 | Tech gate F02 (รวม hygiene ของ `tools/coverage/`, `tools/traces/`, `tools/sim/`) | review-gate | tech-lead | P1-F02-T02, P1-F02-T04, P1-F02-T05, P1-F02-T06, P1-F02-T07, P1-F02-T08, P1-F02-T11, P1-F01-T05, P1-F03-T08, P1-H02, P1-X04, P1-X05, P1-X07, P1-X16, P1-X23 | `docs/reviews/F02-tech-gate.md` | DONE | `docs/reviews/F02-tech-gate.md` (PASS, F-01 ต้องแก้ก่อน commit) |
| P1-F02-T16 | F02 | QA gate F02 | review-gate | qa-tester | P1-F02-T13, P1-F02-T14, P1-F02-T15, P1-X24, P1-X25, P1-X26 | `qa/reports/F02-qa-gate.md` | DONE | `qa/reports/F02-qa-gate.md` (PASS), `qa/tests/F02/hud-panel-blackbox.test.ts` |
| P1-F02-T17 | F02 | สมัคร Cloudflare Free (ไม่ผูกบัตร) + สร้าง Pages project + API token สิทธิ์จำกัด เก็บใน GitHub Actions secret / `.env.local` (D-008) | research | HUMAN | — | — (ถ้ามี token เก็บใน `.env.local` หรือ GitHub Actions secret เท่านั้น ไม่ commit) | DONE | 2026-09-25 บัญชี Cloudflare พร้อม · ได้ Worker keep-walking.pongponcrb.workers.dev (ไม่ใช้) แทน Pages project · publish-client.sh สร้าง keep-walking-preview เอง · GitHub secrets 2 ตัวครบ · Billing มีบัตรแต่ Free plan (D-085) |
| P1-F02-T18 | F02 | สร้าง GitHub repo **public**, เปิด secret scanning + push protection, push ครั้งแรก, ยืนยัน CI รัน | research | HUMAN | P1-F02-T07 | — | DONE | push main 2026-09-25 · CI run 36155723116 เขียวทั้ง 4 job · Secret scanning/Push protection: เปิดแล้ว (user ยืนยัน 2026-09-25) |
| P1-F02-T19 | F02 | Publish PMTiles + glyph/sprite และ deploy preview บน host ฟรีตาม runbook | build | HUMAN | P1-F02-T17, P1-F02-T18, P1-F02-T08, P1-F02-T11, P1-F02-T15, P1-X26 | — | HUMAN | deploy สำเร็จ run 36214493818 (2ab1fa1) · client https://keep-walking-preview.pages.dev · map https://keep-walking-map.pages.dev · orchestrator ตรวจ curl ครบ + headless Pixel 7 โหลด 6 tile, 2 glyph, 0 error, ป้ายไทยแสดง · รอ user เปิดบนมือถือจริง |
| P1-F02-T20 | F02 | เดินทดสอบจริงกลางแดด 30 นาทีในสวน + 30 นาทีในซอย แล้วกรอกผลวัด (raw trace เป็น opt-in) | research | HUMAN | P1-F02-T19, P1-F02-T14 | `qa/playtest/results/` (คนกรอก, summary + form เท่านั้น · raw trace อยู่ใน `qa/playtest/results/raw/` ที่ถูก ignore) | HUMAN | — |
| P1-F02-T21 | F02 | สรุปผล spike + คำแนะนำ Go / No-go ของ map/location | research | tech-lead | P1-F02-T20, P1-F02-T16 | `docs/tech/F02-spike-results.md` | TODO | — |
| P1-F02-T22 | F02 | ยืนยัน backend stack ตาม ADR 0002 (vendor commitment) | review-gate | HUMAN | — | — | CUT | ตัดสินแล้วใน D-008 (คนมอบให้ orchestrator ตัดสิน) |
| P1-F02-T23 | F02 | ยืนยันผล Go / No-go ของ map spike | review-gate | HUMAN | P1-F02-T21 | — (orchestrator บันทึกใน decision log) | HUMAN | — |
| P1-F02-T24 | F02 | แปลง trace จริงที่คนเดินยินยอมเป็น recorded trace (ตัดต้น/ปลาย, ปัดพิกัด) | build | location-engineer | P1-F02-T20 | `data/gps-traces/recorded/`, `data/gps-traces/README.md` | TODO | — |
| P1-F02-T25 | F02 | สำรอง: ดาวน์โหลดไฟล์ใหญ่ตาม URL + checksum แล้ววางที่ path ที่ระบุ (เปิดเมื่อ agent ดาวน์โหลดไม่ได้เท่านั้น) | research | HUMAN | — | path ตาม README ที่ agent ระบุ (ไฟล์อยู่นอก git) | CUT | ไม่จำเป็น: agent ดาวน์โหลดไฟล์ใหญ่ทั้งหมดได้เอง (OSM extract, WorldPop, Protomaps extract, go-pmtiles 16 MB พร้อม checksum ใน P1-CLOSE-QA) · ไม่มีงานใดเปิดใช้ (P1-CLOSE-PM) |
| P1-F02-T26 | F02 | push รอบสุดท้ายและส่ง URL CI run สีเขียวของโค้ดทั้ง phase | research | HUMAN | P1-F02-T16, P1-F01-T08, P1-F03-T23, P1-H06, P1-F02-T24 | — | HUMAN | — |
| P1-F02-T27 | F02 | product-manager ร่วมยืนยันเกณฑ์ spike (มุมประสบการณ์ผู้เล่น) | review-gate | product-manager | P1-F02-T03 | `product/reviews/F02-spike-criteria.md` | DONE | `product/reviews/F02-spike-criteria.md` (PASS) |
| P1-F03-T01 | F03 | Design pillars + non-negotiables + รายการห้ามสอนใน 10 นาทีแรก + ดัชนี feature spec F01–F24 | spec | game-director | — | `design/pillars.md` | DONE | `design/pillars.md` |
| P1-F03-T02 | F03 | World bible ฉบับเสนอ (ธง HUMAN ทุกจุดที่ต้องยืนยัน) | spec | narrative-designer | — | `design/narrative/world.md` | DONE | `design/narrative/world.md` |
| P1-F03-T03 | F03 | คู่มือ copy: กฎ 6 ข้อ, คำทับศัพท์ที่ใช้ได้, คำต้องห้าม, checklist ตรวจ | spec | narrative-designer | P1-F03-T02 | `design/narrative/style-guide.md` | DONE | `design/narrative/style-guide.md` |
| P1-F03-T04 | F03 | ชุดชื่อเริ่มต้น (รูปแบบชื่อโซน, มอนสเตอร์, ไอเทม, วัตถุดิบ, บอส) + ปรับ copy ตาม D-050 | asset | narrative-designer | P1-F03-T02, P1-F03-T03 | `config/content/names.th.json`, `config/content/copy.th.json`, `config/content/copy-rules.json` | DONE | `config/content/names.th.json`, copy D-050 (`copy.th.json`, `copy-rules.json`) |
| P1-F03-T05 | F03 | Copy bank ของ core loop (onboarding 0–10 นาที, เข้า dungeon, tick, HP ต่ำ/auto-retreat/ตาย, สถานะ GPS) | asset | narrative-designer | P1-F03-T03, P1-F03-T16 | `config/content/copy.th.json` | DONE | `config/content/copy.th.json` (225 keys) |
| P1-F03-T06 | F03 | Balance model (สูตรทั้งหมด) + config balance ชุดแรก | spec | systems-designer | — | `design/systems/balance-model.md`, `config/balance/*.json` | DONE | `design/systems/balance-model.md`, `config/balance/*.json` (11 files) |
| P1-F03-T07 | F03 | Simulator แกนสูตร (buff stacking, damage/เวลาอยู่รอด, exp curve, stat, gear) + golden test vectors | build | systems-designer | P1-F03-T06, P1-F02-T01 | `tools/sim/`, `design/systems/test-vectors/` | DONE | `tools/sim/`, `design/systems/test-vectors/` (170 vectors) |
| P1-F03-T08 | F03 | Simulator drop + economy + อัตรารางวัล party ต่อหัว + sim report | build | systems-designer | P1-F03-T07 | `tools/sim/`, `design/systems/test-vectors/`, `design/systems/sim-report.md`, `config/balance/combat.json` | DONE | `tools/sim/` (drops/economy/party), `design/systems/sim-report.md`, 248 vectors, `config/balance/combat.json` |
| P1-F03-T09 | F03 | Dungeon preset (สวนใหญ่ / ตลาด / สวนหย่อม) | spec | level-designer | P1-F01-T02, P1-F03-T06 | `design/levels/presets.md`, `data/dungeons/presets.json` | DONE | `design/levels/presets.md`, `data/dungeons/presets.json` |
| P1-F03-T10 | F03 | Art style guide (palette + contrast กลางแดด) + icon grammar | spec | art-director | — | `art/direction/style-guide.md`, `art/direction/icon-grammar.md` | DONE | `art/direction/style-guide.md`, `art/direction/icon-grammar.md` |
| P1-F03-T11 | F03 | Spec avatar 2D layered isometric 3 มุม + asset pipeline | spec | art-director | P1-F03-T10 | `art/direction/avatar-spec.md`, `art/direction/asset-pipeline.md` | DONE | `art/direction/avatar-spec.md`, `art/direction/asset-pipeline.md` |
| P1-F03-T12 | F03 | Map style (MapLibre style JSON บน Protomaps schema, font ไทย, รอยแยก, โซนดำ + เส้นจังหวัด) | spec | art-director | P1-F03-T10, P1-F02-T03 | `art/direction/map-style.md`, `art/direction/map-style/` | DONE | `art/direction/map-style.md`, `art/direction/map-style/kw-light.style.json` (validator/screenshots ย้ายไป T11, P1-H06) |
| P1-F03-T13 | F03 | Style tile | asset | artist-2d | P1-F03-T10 | `art/assets/ui/style-tile/` | DONE | `art/assets/ui/style-tile/` (style-tile.svg, contact-sheet-1x.svg, README) |
| P1-F03-T14 | F03 | Avatar placeholder layer 3 มุม (SVG) + prompt raster + manifest | asset | artist-2d | P1-F03-T11, P1-F03-T13 | `art/assets/avatar/`, `art/assets/manifest.json`, `art/prompts/avatar.md` | DONE | `art/assets/avatar/` (12 SVG), `art/assets/manifest.json`, `art/prompts/avatar.md` |
| P1-F03-T15 | F03 | IA: รายการหน้าจอ (รวม consent, ความเป็นส่วนตัว, ลบบัญชี), navigation, ลำดับการปลดระบบ | spec | uiux-designer | P1-F03-T01 | `design/ux/ia.md` | DONE | `design/ux/ia.md` |
| P1-F03-T16 | F03 | Flow หลัก (onboarding + consent + อายุ 15+, แผนที่ → เข้า dungeon → run → HP ต่ำ/auto-retreat/ตาย/ออกเอง → สรุป, dungeon ไกล/นอกพื้นที่) + รายการ copy key | spec | uiux-designer | P1-F03-T15, P1-F03-T01 | `design/ux/flows/F03-core-loop.md` | DONE | `design/ux/flows/F03-core-loop.md` |
| P1-F03-T17 | F03 | Wireframe HTML ของ flow หลัก + design tokens + component spec | spec | uiux-designer | P1-F03-T16, P1-F03-T10 | `design/ux/wireframes/`, `design/ux/tokens.json`, `design/ux/components.md` | DONE | `design/ux/wireframes/` (7 หน้า), `design/ux/tokens.json`, `design/ux/components.md` |
| P1-F03-T18 | F03 | Audio direction + cue list (vibration pattern ก่อนเสียง) | spec | sound-designer | — | `audio/direction.md`, `audio/cue-list.md` | DONE | `audio/direction.md`, `audio/cue-list.md` |
| P1-F03-T19 | F03 | Metrics framework (6 หมวด) + ชื่อ telemetry event | spec | product-manager | P1-F03-T01, P1-F03-T16 | `product/metrics.md`, `product/telemetry-events.md` | DONE | `product/metrics.md`, `product/telemetry-events.md` |
| P1-F03-T20 | F03 | กรอบทิศทาง live ops + ประเภท event + ตัวอย่างไตรมาสแรก + tuning playbook ฉบับตั้งต้น | spec | liveops-operator | — | `ops/calendar.md`, `ops/tuning-playbook.md` | DONE | `ops/calendar.md`, `ops/tuning-playbook.md` |
| P1-F03-T21 | F03 | Content gate (copy) F03 | review-gate | narrative-designer | P1-F03-T04, P1-F03-T05, P1-F03-T17, P1-H02, P1-X09, P1-X10, P1-X11, P1-X12, P1-X13 | `design/reviews/F03-copy-gate.md` | DONE | `design/reviews/F03-copy-gate.md` (รอบ 2 PASS) |
| P1-F03-T22 | F03 | Content gate (visual) F03 | review-gate | art-director | P1-F03-T12, P1-F03-T13, P1-F03-T14, P1-F03-T17, P1-F03-T27, P1-X06, P1-H04, P1-X15, P1-X32, P1-X33, P1-X34, P1-X35, P1-X36 | `art/reviews/F03-visual-gate.md` | DONE | `art/reviews/F03-visual-gate.md` (รอบ 2 PASS) |
| P1-F03-T23 | F03 | QA gate F03: simulator ตรงตาราง GDD | review-gate | qa-tester | P1-F03-T08 | `qa/reports/F03-qa-gate.md` | DONE | `qa/reports/F03-qa-gate.md` (PASS) |
| P1-F03-T24 | F03 | Design gate A F03 (pillars, narrative, UX, level preset, audio, live ops) | review-gate | game-director | P1-F03-T01, P1-F03-T09, P1-F03-T18, P1-F03-T20, P1-F03-T21, P1-X01, P1-X17, P1-X18, P1-X19, P1-X20, P1-X21 | `design/reviews/F03-design-gate-a.md` | DONE | `design/reviews/F03-design-gate-a.md` (รอบ 2 PASS) |
| P1-F03-T25 | F03 | Design gate B F03 (systems + simulator, art direction, motion, metrics) | review-gate | game-director | P1-F03-T19, P1-F03-T22, P1-F03-T23, P1-F03-T27, P1-X04, P1-X22 | `design/reviews/F03-design-gate-b.md` | DONE | `design/reviews/F03-design-gate-b.md` (PASS) |
| P1-F03-T26 | F03 | ยืนยัน world building และ design pillars | review-gate | HUMAN | P1-F03-T02, P1-F03-T01 | — (orchestrator บันทึกใน decision log) | DONE | D-084: รับ H-01..H-13 ตามคำแนะนำ + ยืนยัน pillars (2026-09-25) |
| P1-F03-T27 | F03 | Motion direction (งบ motion, feedback, rarity, จังหวะ auto-retreat/ตาย, rift บนแผนที่) | spec | vfx-animator | P1-F03-T10, P1-F03-T18 | `art/vfx/specs/motion-direction.md` | DONE | `art/vfx/specs/motion-direction.md` |
| P1-F03-T28 | F03 | ยืนยันรายการ "ที่ยังต้องตัดสินใจ" ใน GDD ที่ล้าสมัย และอนุมัติการแก้ถ้อยคำ GDD ตาม D-004, D-005, D-006 | review-gate | HUMAN | P1-F03-T06, P1-F03-T08 | — (orchestrator บันทึกใน decision log) | DONE | D-084: อนุมัติถ้อยคำ GDD + D-020 รับ, D-038 ทาง B, D-080 (2026-09-25) |
| P1-H01 | F03 | ADR 0001 amendment: ยืนยัน config convention (`_source`/`_assumption`/`_note`, unit suffix ผสม, `null` = fail ชัด, `seeFile`, ข้าม key `_`) + schema `copy.th.json` และ registry ตัวแปร | spec | tech-lead | P1-F02-T03 | `docs/adr/0001-repo-layout.md`, `docs/tech/copy-schema.md`, `docs/tech/gps-trace-format.md`, `docs/tech/F02-map-location-spike.md` | DONE | `docs/adr/0001-repo-layout.md` (amendment), `docs/tech/copy-schema.md` |
| P1-H02 | F03 | Copy lint script ตาม style guide หัวข้อ 7 (S1–S14) + ไฟล์คำ + test + shared content types ตาม copy-schema หัวข้อ 4–7, 10 | build | gameplay-programmer | P1-H01, P1-F03-T03, P1-X03 | `tools/copy-lint/`, `packages/shared/src/content/`, `packages/shared/schemas/copy.schema.json`, `packages/shared/schemas/copy-rules.schema.json`, `packages/shared/src/index.ts`, `pnpm-lock.yaml`, root `package.json` (scripts เท่านั้น) | DONE | `tools/copy-lint/`, `packages/shared/src/content/`, copy schemas (358 tests, lint:copy 0 FAIL) |
| P1-H03 | F03 | เติม config key ที่ pillars/IA/style guide อ้าง: เกณฑ์ปลด U1–U8, `unlocks.parentalConsent`, `unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s`, `location.minAccuracy_m`, ตาราง raid (วัน/เวลา) และค่าที่ copy formatter อ่าน | spec | systems-designer | P1-F03-T07 | `config/balance/unlocks.json`, `config/balance/raid.json`, `config/balance/privacy.json`, `config/balance/location.json`, `config/balance/dungeons.json` | DONE | `config/balance/{unlocks,privacy,location,raid,dungeons}.json` |
| P1-H04 | F03 | ตรวจ contrast ทุกคู่สีใน art style guide หัวข้อ 4 ด้วย script อัตโนมัติ | build | qa-tester | P1-F03-T10 | `qa/tests/unit/contrast.test.ts`, `qa/reports/F03-contrast-check.md` | DONE | `qa/tests/unit/contrast.test.ts` (119 คู่), `qa/reports/F03-contrast-check.md` |
| P1-H05 | F02 | สร้าง `config/app/privacy.json` (`rawTraceTrim_m`) + config ของ client (ค่า Web provider, ค่าเริ่มต้นของ query) ตาม tech note | spec | tech-lead | P1-F02-T03 | `config/app/` | DONE | `config/app/privacy.json`, `config/app/client.json` |
| P1-H06 | F03 | Screenshot map style S1–S5 (390x844, 360x800) บน fixture tile ทั้ง PMTiles และ TileJSON + ทดสอบกลางแดดตาม map-style.md หัวข้อ 10 | build | qa-tester | P1-F02-T06, P1-F02-T11, P1-X05, P1-H07, P1-X23 | `qa/reports/F02/map-style/`, `qa/tests/unit/map-style.test.ts`, `qa/reports/F03/colorblind/` | DONE | `qa/reports/F02/map-style/` (40 screenshots), `qa/tests/unit/map-style.test.ts`, `qa/reports/F03/colorblind/` (PASS) |
| P1-H07 | F02 | GeoJSON โซนดำ (mask รูเท่ากับ 6 จังหวัดที่เล่นได้, simplify ~20 ม.) + เส้นและชื่อ 77 จังหวัด (simplify ~200 ม., ≤300 KB) ตาม map-style.md หัวข้อ 6.2–6.3 | build | location-engineer | P1-F01-T05 | `data/map/playarea-mask.geojson`, `data/map/provinces.geojson`, `tools/coverage/boundaries/` | DONE | `data/map/playarea-mask.geojson`, `data/map/provinces.geojson`, `tools/coverage/boundaries/` |
| P1-X01 | F03 | แก้ชื่อ config key ใน `design/pillars.md` ให้ตรง config จริง (ตารางจับคู่จาก P1-H03) | fix | game-director | P1-H03 | `design/pillars.md` | DONE | `design/pillars.md` (key names = config) |
| P1-X02 | F03 | แก้ชื่อ config key ใน `design/ux/ia.md` และ `design/ux/flows/F03-core-loop.md` ให้ตรง config จริง + ลบหมายเหตุ "รอ P1-H03" | fix | uiux-designer | P1-H03, P1-F03-T17 | `design/ux/ia.md`, `design/ux/flows/F03-core-loop.md` | DONE | `design/ux/ia.md`, `design/ux/flows/F03-core-loop.md` |
| P1-X03 | F03 | ปรับ copy bank ตาม copy-schema หัวข้อ 9 (ฉบับเขียนใหม่) + สร้าง `copy-rules.json` + แก้ style guide 4.4, 5.1, 5.2, 7, 9 | fix | narrative-designer | P1-H01, P1-F03-T05 | `config/content/copy.th.json`, `config/content/copy-rules.json`, `design/narrative/style-guide.md` | DONE | `config/content/copy.th.json`, `config/content/copy-rules.json`, `design/narrative/style-guide.md` |
| P1-X04 | F03 | เพิ่ม `_nullMeans` 5 จุด (ADR 3.10.5) + vectors*.ts อ่านค่าขอบจาก SimParams แล้วลบ eslint-disable บรรทัดแรก | fix | systems-designer | P1-H01 | `config/balance/combat.json`, `config/balance/economy.json`, `config/balance/dungeons.json`, `config/balance/telemetry.json`, `tools/sim/src/vectors.ts`, `tools/sim/src/vectors-economy.ts` | DONE | `config/balance/{combat,economy,dungeons,telemetry}.json`, `tools/sim/src/vectors*.ts` |
| P1-X05 | F02 | eslint override สำหรับ `tools/sim/src/vectors*.ts` + `@maplibre/maplibre-gl-style-spec` 26.4.4 เป็น root devDependency + เพิ่ม `tools/coverage/pipeline/tests/**/*.test.ts` ใน vitest include | fix | tech-lead | P1-H02, P1-X04 | `eslint.config.js`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `docs/tech/copy-schema.md`, `.prettierignore`, `tsconfig.json`, `packages/location/src/types.ts`, `packages/location/src/web/`, `packages/location/test/` (เฉพาะถ้าเปลี่ยนชื่อ option · ห้ามแตะ `apps/client/`) | DONE | root install/lint/typecheck/test/check เขียว (716 tests), style-spec devDep, pytest bridges, alias timing |
| P1-X07 | F01 | CI step สร้าง venv ของ tools/coverage + `pip install -r requirements.txt` + ตั้ง `COVERAGE_PYTEST_REQUIRED=1` ก่อน `pnpm test` (ไม่ดาวน์โหลดข้อมูล) | fix | devops-engineer | P1-X05 | `.github/workflows/ci.yml`, `docs/tech/environments.md` | DONE | `.github/workflows/ci.yml` (pytest required, trace check, caches, space-path self-check), `docs/tech/environments.md` |
| P1-X06 | F03 | map-style.md: หัวข้อ 6.1 adapter สร้าง property จาก whitelist, status ที่ไม่รู้จัก → closed · หัวข้อ 13 ชี้ test ใหม่ | fix | art-director | P1-H01, P1-F03-T11 | `art/direction/map-style.md`, `art/direction/style-guide.md`, `art/direction/icon-grammar.md` | DONE | `art/direction/map-style.md`, `style-guide.md` §3.4.1, `icon-grammar.md` §7–8 |
| P1-X08 | F01 | เติม fixture ของ pipeline coverage: ขอบพื้นที่พอดี 2,999/3,000/150,000/150,001 + blocker วงใน, แตะกันต่ำกว่า partialOverlapShare, geometry ต้อง make_valid, assembly_failed (GAP-01, GAP-02) + ลดขนาด excluded.geojson ให้มีระยะเผื่อ (GAP-04) | fix | location-engineer | P1-F01-T05 | `tools/coverage/pipeline/tests/`, `tools/coverage/pipeline/output.py`, `data/coverage/excluded.geojson`, `data/coverage/candidates.geojson` (สร้างซ้ำ ต้อง byte-identical), `data/coverage/run-meta.json` (ถ้า pipeline เขียน) | DONE | `tools/coverage/pipeline/tests/` (111 pass + 2 xfail), `output.py`, `data/coverage/excluded.geojson` (4.08 MB) |
| P1-H08 | F01 | ล็อกแหล่งอ้างอิงและค่า route factor (ระยะเส้นตรง → ระยะเดิน) ใน PRD ก่อน T06 | spec | product-manager | P1-F01-T03 | `product/prd/F01-coverage-survey.md` | DONE | `product/prd/F01-coverage-survey.md` §8.1 (network walking distance; fallback route factor 1.4 ±0.2) |
| P1-X09 | F03 | world.md หัวข้อ 4 (ย่อหน้า dungeon ชั่วคราว) และ 11 (แถว "ชั่วคราว", "เปิดถึงอาทิตย์", ตัวอย่าง #3) ให้ตรง D-049 และ names.th.json + style guide 4.3 เพิ่มแถว buttonFullWidth | fix | narrative-designer | P1-F03-T04 | `design/narrative/world.md`, `design/narrative/style-guide.md` | DONE | `design/narrative/world.md`, `design/narrative/style-guide.md` |
| P1-X10 | F03 | components.md หัวข้อ 10 บันทึก buttonFullWidth (D-050) + wireframe 05-run-summary ใช้วลีเต็ม + ยืนยันเพดานชื่อโซน (nameReal ≤17, suffix ≤14, เต็ม ≤34) | fix | uiux-designer | P1-F03-T04 | `design/ux/components.md`, `design/ux/wireframes/05-run-summary.html` | DONE | `design/ux/components.md`, `design/ux/wireframes/05-run-summary.html` |
| P1-X11 | F03 | names.th.json: `dungeon.khlongOngAng._preset` pocketPark → market (class-first ของ P1-F03-T09) + copy.th.json `_variables.zoneRealName.maxCells` 18 → 17 | fix | narrative-designer | P1-F03-T09, P1-X10 | `config/content/names.th.json`, `config/content/copy.th.json` | DONE | `config/content/names.th.json`, `config/content/copy.th.json` |
| P1-X12 | F03 | แก้ copy ตาม copy gate: F-01 `dungeon.emergencyClosedTitle` → "โซนนี้ปิดกะทันหัน ได้ของเท่าที่เดินจริง", F-02 เพิ่ม key header/label 7 ตัว, F-04 cells ของ dungeon.vsBossTitle=11 และ label.sponsored=7, F-05 style-guide 4.1 zoneRealName=17 | fix | narrative-designer | P1-F03-T21 | `config/content/copy.th.json`, `design/narrative/style-guide.md` | DONE | `config/content/copy.th.json`, `design/narrative/style-guide.md` (lint:copy exit 0, 11 WARN) |
| P1-X13 | F03 | แก้ wireframe ตาม copy gate F-03: ผูก key ทุกจุดใน gate หัวข้อ 6.2, ใช้ข้อความจริงจาก copy.th.json, `hp` → `run.hpBarLabel`, quick command 10 ตัวข้อความเต็ม · F-02 ตาราง header→key ใน components 2.1 · F-06 ลบค่า zoneRealName 18 ที่ค้าง | fix | uiux-designer | P1-F03-T21, P1-X12 | `design/ux/wireframes/`, `design/ux/components.md` | DONE | `design/ux/wireframes/` (key จริงทุกจุด), `design/ux/components.md` 2.1.1 |
| P1-X15 | F03 | contrast.test.ts: ค่าที่คาดของ map.road บน map.land 1.16 → 1.22 ตามเอกสารที่แก้แล้ว (P1-X06) | fix | qa-tester | P1-X06 | `qa/tests/unit/contrast.test.ts`, `qa/reports/F03-contrast-check.md` | DONE | `qa/tests/unit/contrast.test.ts` (295/295), `qa/reports/F03-contrast-check.md` |
| P1-X16 | F03 | vectors*.ts อ่าน p.partyMaxMembers / p.maxEnhanceLevel จาก SimParams (ตัดจาก EconomyRefs) + แก้ tools/sim/README บรรทัด eslint-disable + ย้าย config/balance/telemetry.json → config/app/telemetry.json (key เดิม) | fix | systems-designer | P1-X05 | `tools/sim/src/vectors.ts`, `tools/sim/src/vectors-economy.ts`, `tools/sim/README.md`, `config/balance/telemetry.json`, `config/app/telemetry.json` | DONE | `tools/sim/src/vectors*.ts`, `tools/sim/README.md`, `config/app/telemetry.json` (ย้ายจาก balance) |
| P1-X17 | F03 | แก้ UX ตาม design gate A: F-01 หน้าร้าน NPC + แยก "ขายให้ NPC" กับ "ลงขายในตลาด", F-02 เรียง IA 6 ตาม D-041, F-03 flow D2/IA 4 ใช้ mask (D-064), F-04 ทาง A Wake Lock + pocket screen (D-063) ใน flow 8/10, components 12, wireframe 03/06, F-05 ลำดับนาที 0–1 (แผนที่ก่อน class select เป็น sheet), F-07 ปุ่มยืนยัน age gate, F-08 ตัดเมนูภาษา, F-09 แนะนำ rift ที่ level ครอบผู้เล่น | fix | uiux-designer | P1-F03-T24 | `design/ux/ia.md`, `design/ux/flows/F03-core-loop.md`, `design/ux/components.md`, `design/ux/wireframes/` | DONE | `design/ux/ia.md`, `flows/F03-core-loop.md`, `components.md` §12, wireframes 00/03/06 |
| P1-X18 | F03 | config ตาม design gate A: F-01 `unlocks.npcShop` (ปลดเมื่อจบ run แรก), F-03 ตัด/เปลี่ยน `unlocks.home.outOfServiceAreaThreshold_m` ให้ชี้ playarea-mask, F-15 นิยาม run ที่นับ (จบด้วยเหตุใดก็ได้ มี tick ที่ได้รับ ≥1) + antiCheatHelp event id ตรง telemetry | fix | systems-designer | P1-F03-T24 | `config/balance/unlocks.json` | DONE | `config/balance/unlocks.json` v3 (npcShop, out-of-area = mask, counted run) |
| P1-X19 | F03 | live ops ตาม design gate A: F-06 event ฤดูฝน (type C) เป็นส่วนลดของที่ได้แล้วเท่านั้น ห้ามสร้าง gold/exp/drop ที่บ้าน ห้ามขึ้นราคาขาย NPC/ลดภาษี ห้ามผ่อน movement gate, F-14 ตัด movementGate.* และ hpSafety.* ออกจาก playbook/event, ประกาศ raid เฉพาะคนที่ผ่าน unlocks.raid | fix | liveops-operator | P1-F03-T24 | `ops/calendar.md`, `ops/tuning-playbook.md` | DONE | `ops/calendar.md`, `ops/tuning-playbook.md` (ฤดูฝนไม่ให้ของที่บ้าน, gate/hpSafety non-tunable) |
| P1-X20 | F03 | copy ตาม design gate A: F-10 ย้าย shop ออกจากกลุ่ม U1–U3 ใน style guide 4.4, copy key สำหรับร้าน NPC, pocket screen และกรณี Wake Lock ใช้ไม่ได้, confirm ปุ่ม age gate | fix | narrative-designer | P1-F03-T24 | `config/content/copy.th.json`, `design/narrative/style-guide.md` | DONE | `config/content/copy.th.json` (+28 key), `design/narrative/style-guide.md` 4.4 |
| P1-X21 | F03 | pillars 6.2, 7.1, 11 ให้ตรงคำตัดสินของ design gate A (D-040, D-041, D-063, D-064, D-065) | fix | game-director | P1-F03-T24 | `design/pillars.md` | DONE | `design/pillars.md` (ตรงคำตัดสิน gate A) |
| P1-X22 | F03 | balance-model.md: ลบแถว "นอกพื้นที่ 20,000 ม." (D-064) + เพิ่มแถว npcShop ในหัวข้อ 10 (D-065) + unlocks.json npcShop._note: id NPC ถาวร ไม่มีเลข U (pillars 6.2) | fix | systems-designer | P1-X18 | `design/systems/balance-model.md`, `config/balance/unlocks.json` | DONE | `design/systems/balance-model.md`, `config/balance/unlocks.json` (note) |
| P1-X23 | F02 | หาสาเหตุและแก้แผนที่ดำเมื่อโหลด fixture ลุมพินีจริง (map `load` ไม่ fire หลัง T11 ใช้ style จริง) + e2e ที่ใช้ fixture จริงกับ style จริง | fix | tech-lead | P1-F02-T11 | `apps/client/src/map/`, `apps/client/src/map.ts`, `apps/client/src/main.ts`, `apps/client/e2e/` | DONE | `apps/client/src/map/worker.ts` (setWorkerUrl), e2e `map-real-fixture.spec.ts` 4/4 |
| P1-X24 | F02 | แก้ `qa/tests/e2e/f02-map-fixture-tile.spec.ts` ให้ส่ง glyphs/sprite override (route helper แบบ map-real-fixture.spec.ts) และตรวจ `load` fire + tile render จริง (D-068) | fix | qa-tester | P1-X23 | `qa/tests/e2e/` | DONE | `qa/tests/e2e/f02-map-fixture-tile.spec.ts` (load + render จริง, e2e 28/28) |
| P1-X25 | F02 | apps/client: README บรรทัด ~157–165 ชี้ `src/map/worker.ts` แทนข้อความ "load never fired" · ตรวจ/แก้ปุ่ม follow-mode ซ้อน 2 ปุ่มบน ios-safari · ignore `apps/client/e2e/__screenshots__/` ถ้าใหญ่ (หรือย่อภาพ) | fix | gameplay-programmer | P1-X23 | `apps/client/README.md`, `apps/client/src/ui/`, `apps/client/src/main.ts`, `apps/client/e2e/__screenshots__/` | DONE | `apps/client/README.md`, `src/app.css`, e2e button test, screenshots jpg |
| P1-X26 | F01 | gitleaks false positive: ต่อท้าย `  # gitleaks:allow` ที่ tools/coverage/analysis/__main__.py:222 แล้วรัน gitleaks --no-git ต้อง exit 0 (tech gate F-01, blocking ก่อน commit) | fix | location-engineer | P1-F02-T15 | `tools/coverage/analysis/__main__.py` | DONE | `tools/coverage/analysis/__main__.py` (gitleaks:allow, gitleaks exit 0) |
| P1-X27 | F02 | tech-lead T-01..T-05: tech note F02 บรรทัด 424 (key ที่ถูกถอด), ADR 0001 3.5/3.6/3.10.1/3.10.3/3.11 ให้ตรง D-062 และ X05/X07 | fix | tech-lead | P1-F02-T15 | `docs/tech/F02-map-location-spike.md`, `docs/adr/0001-repo-layout.md` | DONE | `docs/tech/F02-map-location-spike.md`, `docs/adr/0001-repo-layout.md` (แก้ไขครั้งที่ 2) |
| P1-X28 | F02 | CI: เพิ่ม `pnpm exec tsx tools/sim/src/gen-vectors.ts --check` (tech gate F-03) | fix | devops-engineer | P1-F02-T15 | `.github/workflows/ci.yml` | DONE | `.github/workflows/ci.yml` (gen-vectors --check) |
| P1-X29 | F01 | BUG-F01-001: fixture/unit test หมวด blocklist health/government/military/diplomatic · BUG-F01-002: ย้ายข้อความไทยออกจาก Python (analysis/__main__.py, heatmap.py) ไปไฟล์ข้อความ/template | fix | location-engineer | P1-F01-T08 | `tools/coverage/pipeline/tests/`, `tools/coverage/analysis/` | DONE | `tools/coverage/pipeline/tests/` (+blocklist, heatmap_text), `tools/coverage/analysis/` (Thai text → JSON/template) |
| P1-X30 | F01 | coverage-report ตาม design gate F01: F-01 เพิ่มพระปฐมบรมราชานุสรณ์ฯ, สวนสราญรมย์, สนามพระท่าพระจันทร์ + ตรวจ candidate ไม่มีชื่อในพระนคร + #16/สราญรมย์ตาม H-05 ทาง B (ไม่ตั้งชื่อใหม่) + แก้ถ้อยคำ "ตรวจทุกชื่อแล้ว" · F-02 หัวลำโพงออกจาก valid เสนอตัดถาวร · F-03 หมวดใหม่ "การเข้าถึงสาธารณะไม่แน่นอน" (จิม ทอมป์สัน, ปาร์คนายเลิศ, วัน แบงค็อก พาร์ค) + worst-case G1–G4 ของพระนคร/ปทุมวันในหัวข้อ 0 | fix | level-designer | P1-F01-T09 | `design/levels/coverage-report.md` | DONE | `design/levels/coverage-report.md` (รายการ HUMAN 25 ข้อ, worst-case G1–G4) |
| P1-X31 | F01 | `.prettierignore` เพิ่ม `tools/coverage/analysis/heatmap-template.html` พร้อมเหตุผล (`{{`/`}}` ของ str.format ถูก prettier ตัดบรรทัด) · root `pnpm lint` เขียว (BUG-F01-003) | fix | tech-lead | P1-F02-T16 | `.prettierignore` | DONE | `.prettierignore` (heatmap-template), root lint exit 0 |
| P1-X32 | F03 | map style: ป้าย/ไอคอน dungeon (kw-rift-name/-count/-sponsored/-crack) ใช้ source จุด centroid แยก (เช่น kw-dungeon-labels) ส่วน polygon source ใช้เฉพาะ fill/outline — แก้ป้ายซ้ำ (P1-H06 §5) + อัปเดต map-style.md 6.1 contract | fix | art-director | P1-H06 | `art/direction/map-style/kw-light.style.json`, `art/direction/map-style.md`, `art/direction/map-style/samples/` | DONE | `kw-light.style.json` 0.2.0 (kw-dungeon-labels), `map-style.md` 6.1, sample labels (validateStyleMin 0 error โดย orchestrator) |
| P1-X33 | F02 | client: สร้าง/ป้อน source จุด centroid ของ dungeon ตาม style ใหม่ (P1-X32) + e2e ยืนยันป้ายต่อ dungeon ขึ้นครั้งเดียว | fix | gameplay-programmer | P1-X32 | `apps/client/src/map/`, `apps/client/e2e/` | DONE | `apps/client/src/map/dungeons-source.ts` (+15 test), e2e dungeon-labels (1 ป้ายต่อ dungeon) |
| P1-X34 | F03 | motion-direction ตาม visual gate V-01/R-1: ลบ idle breathing และข้อยกเว้น loop (หัวข้อ 2/3/8/11/12) ใส่ one-shot รอยแตกกางออก 300 ms ด้วย scaleY · V-11 filter ที่อนุญาต, Uncommon ใช้ scale, HP bar ใช้ scaleX | fix | vfx-animator | P1-F03-T22 | `art/vfx/specs/motion-direction.md` | DONE | `art/vfx/specs/motion-direction.md` (ไม่มี loop, one-shot scaleY, filter allow-list) |
| P1-X35 | F03 | components/wireframes ตาม visual gate V-02 ข้อ a–d (banner/pill = bg.surface + ขอบ state 2 px, toast จางแบบทึบ, การ์ดที่เลือกคงขอบหมึก + วงนอก signal, รอยแยกจำลองทึบมีขอบหมึก) + fallback login ใช้ .btn-secondary ทั้งสองปุ่ม (R-6) | fix | uiux-designer | P1-F03-T22 | `design/ux/components.md`, `design/ux/wireframes/` | DONE | `design/ux/components.md` §3.1, `design/ux/wireframes/` (สีตาม token, ไม่มี opacity บนข้อความ) |
| P1-X36 | F03 | avatar placeholder ตาม visual gate V-03 ข้อ a–g (แสงซ้ายบน, stroke 2 px ชั้นบนสุด, แขนเสื้อ/มือ, แว่นบนตา ≤44 px, บูทมุมข้าง, ท่า point ใน safe area, ภาพประกอบทดสอบ) + ย้าย master สี key ไป art/src/avatar/ (R-5) + style tile ไป art/ref/style-tile/ (R-4) + manifest · V-12/13/14 ถ้าทำได้ | fix | artist-2d | P1-F03-T22 | `art/assets/avatar/`, `art/src/avatar/`, `art/ref/`, `art/assets/ui/style-tile/`, `art/assets/manifest.json`, `art/prompts/avatar.md` | DONE | `art/assets/avatar/`, `art/src/avatar/`, `art/ref/` (style-tile, composite), manifest (schema ผ่าน) |
| P1-X37 | F03 | qa/reports/F03/colorblind/capture-colorblind.spec.ts ชี้ path ใหม่ art/ref/style-tile/ (R-4) แล้วรันซ้ำยืนยันภาพ/ผลเดิม | fix | qa-tester | P1-X36 | `qa/reports/F03/colorblind/` | DONE | `qa/reports/F03/colorblind/` (path ใหม่, ผลเดิม PASS) |
| P1-X38 | F02 | CI e2e job ล้มบน GitHub run 36154940915: ไม่มีการ build + เปิด preview server (4173) และติดตั้ง WebKit ไม่มี system deps · แก้ให้ e2e รันได้จาก clean checkout | fix | devops-engineer | P1-F02-T18 | `.github/workflows/ci.yml`, `playwright.config.ts` | DONE | `playwright.config.ts` webServer, `ci.yml` --with-deps + report artifact · clean clone CI=1 e2e 30 passed |
| P1-X39 | F02 | deploy-preview run 36157061484: tools/tiles/bin/build.sh exit 1 บน ubuntu-latest (ไม่ใช่ผลงบ exit 3/4) · หา root cause จาก clean clone แก้ให้ build ได้ และแยกข้อความ rc=4 ออกจาก error ทั่วไป | fix | devops-engineer | P1-F02-T17 | `.github/workflows/deploy-preview.yml`, `tools/tiles/bin/`, `infra/scripts/` | DONE | build.sh ข้าม bbox-vs-province เมื่อไม่มี tools/coverage/out/boundaries.geojson (gitignored) · workflow แยก rc=4 ออกจาก error ทั่วไป · clean clone build 13,502 tile exit 0 |
| P1-X40 | F02 | deploy-preview run 36158481205 (4c0b15a): build.sh ยัง exit 1 บน ubuntu-latest (เฉพาะ Linux) · จำลองใน Docker ubuntu:24.04 หา root cause แก้ + อัปโหลด log ของ tile build เมื่อล้ม | fix | devops-engineer | P1-X39 | `.github/workflows/deploy-preview.yml`, `tools/tiles/bin/` | DONE | workflow env TILES_CONFIG ชนกับ tools/tiles/bin/lib.sh → เปลี่ยนเป็น PAGES_CONFIG · อัปโหลด tile-build-logs เมื่อล้ม · clean clone 13,502 tile exit 0 |
| P1-X41 | F02 | preview จริง: tiles.json ได้ header ซ้อน (ACAO `*, *`, content-type x-protobuf) เพราะกฎ `/tiles/*` กับ tiles.json ทับกัน → เบราว์เซอร์บล็อก CORS แผนที่ไม่ขึ้น · แก้ _headers + ตัวตรวจกฎทับกันใน test | fix | devops-engineer | P1-F02-T19 | `infra/pages/`, `infra/scripts/` | DONE | _headers ใช้ `!` detach ใน `/tiles/*/tiles.json` · infra/scripts/lint-headers.py + test 9 เคส (ยังไม่ต่อเข้า CI → Phase 2) |
| P1-X42 | F02 | ปุ่ม spike บน preview แสดง copy key ดิบ (user ขอแก้) · เพิ่มข้อความไทย client.mapSpike.startLocation / followModeOn / followModeOff / tilesUrlMissing ใน copy.th.json | fix | narrative-designer | P1-F02-T19 | `config/content/copy.th.json` | DONE | เริ่มหาตำแหน่ง · แผนที่ตามตัว · แผนที่ไม่ตามตัว · tilesUrlMissing · lint:copy 0, test 927 ผ่าน |
| P1-CLOSE-QA | ปิด phase | Regression ปิด Phase 1: ทวนทุก task DONE/CUT, ทุก gate PASS, exit checklist มีหลักฐาน | review-gate | qa-tester | P1-F01-T09, P1-F01-T10, P1-F02-T16, P1-F02-T21, P1-F02-T24, P1-F03-T24, P1-F03-T25, P1-H06 | `qa/reports/phase-1-regression.md`, `qa/bugs.md` | TODO | `qa/reports/phase-1-regression.md` รอบ 1 (agent side 100%) · ต้องรันซ้ำหลัง P1-F02-T21/T24 |

## 3. ลำดับ wave และ critical path

(เขียนใหม่ใน P1-PLAN-SYNC-01 สำหรับงานที่เหลือเท่านั้น · แผน W1–W12 เดิมดูประวัติได้ในหัวข้อ 7–9 และ `ledger.md`)

จำนวนงาน ณ plan-sync 01: 86 task (แผนเดิม 67 + handoff H01–H08 8 งาน + fix X01–X11 11 งาน) · DONE 41 · IN_PROGRESS 5 · TODO 29 · HUMAN 10 (รวมสำรอง P1-F02-T25) · CUT 1 (P1-F02-T22)
งาน agent ที่เหลือต่อ role (รวมที่กำลังทำ): qa-tester 7 (H04, F02-T13, T14, F01-T08, F02-T16, H06, CLOSE-QA) · location-engineer 5 (F02-T06, F01-T06, X08, H07, F02-T24) · game-director 4 (X01, F03-T24, F01-T09, F03-T25) · tech-lead 3 (X05, F02-T15, T21) · gameplay-programmer 3 (H02, F02-T10, T11) · art-director 3 (F03-T11, X06, F03-T22) · devops-engineer 2 (F02-T08, X07) · artist-2d 2 (F03-T13, T14) · narrative-designer 1 (F03-T21) · level-designer 1 (F01-T07) · product-manager 1 (F01-T10) · systems-designer 1 (X04) · vfx-animator 1 (F03-T27) · uiux, sound, liveops ไม่มีงานเหลือ

### แผน wave ของงานที่เหลือ (เพดาน 6 task ต่อ wave, 1 task ต่อ agent)
ใช้ R0–R7 แทนเลข W เพราะ run นี้เดินแบบต่อเนื่อง · R0 = ชุดที่กำลังทำอยู่ · ตรวจแล้ว: deps ของทุกงานเสร็จใน R ก่อนหน้า (หรือ DONE แล้ว), ไม่มี agent ซ้ำใน R เดียวกัน, Writes ไม่ชนกันภายใน R · lockfile: P1-H02 (R0) แล้ว P1-X05 (R1) เท่านั้น เรียงด้วย deps · `.github/workflows/`: P1-F02-T08 (R0, `deploy-preview.yml`) กับ P1-X07 (R2, `ci.yml`) คนละไฟล์และคนละ R · `.env.example` ที่ root: P1-F02-T08 เท่านั้น · `data/coverage/`: P1-F01-T06 (R1) กับ P1-X08 (R2) เจ้าของเดียวกัน คนละ R

| R | งาน agent | งานคนที่ทำได้ | หมายเหตุ |
| --- | --- | --- | --- |
| R0 (กำลังทำ) | P1-H02, P1-F02-T06, P1-X04, P1-F03-T13, P1-F03-T27 · **เติม 1 ช่องทันที: P1-F02-T08** | **P1-F02-T17 และ P1-F02-T18 ควรทำตอนนี้** (ต้องเสร็จก่อนจบ R3) · P1-F03-T26, P1-F03-T28 ตอบได้ทุกเมื่อ | T08 ต้องเสร็จก่อน T14/T15 และ devops ต้องว่างให้ X07 ใน R2 |
| R1 | P1-F02-T10, P1-F01-T06, P1-X05, P1-F03-T21, P1-F03-T11, P1-H04 | — | T10 เป็นเส้นวิกฤต เริ่มทันทีที่ H02 จบ · F01-T06 เริ่มทันทีที่ F02-T06 และ X04 จบ |
| R2 | P1-F02-T11, P1-F01-T07, P1-X08, P1-X07, P1-F02-T13, P1-X01 | — | X08 ขนานกับ F01-T07 (candidates ต้อง byte-identical) |
| R3 | P1-F02-T14, P1-F02-T15, P1-F03-T24, P1-H07, P1-X06, P1-F03-T14 | P1-F02-T19 ทันทีที่ T15 PASS (ต้องมี T17, T18, T08, T11) | qa ทำ T14 ก่อน F01-T08 เพราะอยู่บนเส้นวิกฤตที่มีงานคนต่อท้าย |
| R4 | P1-F01-T08, P1-F03-T22 | P1-F02-T20 หลัง T19 และ T14 | ช่องว่าง 4 ช่อง · qa เป็นคอขวด (ดูกฎสลับด้านล่าง) |
| R5 | P1-F01-T09, P1-F01-T10, P1-F02-T16 | (เดินทดสอบต่อ) | game-director ทำ F01 gate ก่อน F03-T25 เพื่อให้ HUMAN P1-F01-T11 เริ่มเร็ว |
| R6 | P1-F03-T25, P1-H06 · P1-F02-T21 และ P1-F02-T24 เมื่อผล T20 กลับมา (T21 ต้องมี T16) | P1-F01-T11 (gate F01 ครบใน R5) · P1-F02-T23 หลัง T21 · P1-F02-T26 หลัง T16, H06, T24 | ถ้าคนไม่ยินยอมให้ใช้ raw trace orchestrator เปลี่ยน T24 เป็น CUT |
| R7 | P1-CLOSE-QA | งานคนที่ยกยอดได้ตาม A-P1-PLAN-02-4 (P1-F03-T28) · P1-F02-T25 → CUT ถ้าไม่มีใครต้องใช้ | — |

กฎสลับ (orchestrator ใช้ได้เลยโดยไม่ต้องถาม producer)
- ถ้าผลเดินทดสอบ (T20) กลับมาก่อนจบ R4 ให้ qa ทำ P1-F02-T16 ก่อน P1-F01-T08 เพราะ T21 → HUMAN T23 จะกลายเป็นเส้นวิกฤต
- ถ้า P1-F02-T06 รายงาน PARTIAL (เกินงบจำนวนไฟล์ของ Pages แม้ลด z14 แล้ว) ให้ location-engineer ทำ F01-T06 ต่อทันที และเปิด fix ของ T06 หลังจากนั้น · T11 ใช้ fixture tile ไปก่อนได้ แต่ HUMAN T19 ต้องรอ tile ที่ผ่านงบ
- ช่องว่างใน R4–R6 ใช้รับ fix task (X) จาก gate ที่ได้ NEEDS_CHANGES ก่อนงานอื่น
- ประมาณการ: ฝั่ง agent อีกราว 7 R (R1–R7) · ระยะจริงของ phase ขึ้นกับเวลาที่คนใช้ทำ P1-F02-T17, T18, T19, T20

### Critical path
(งานที่เหลือเท่านั้น · DONE ทั้งหมดตัดออกจากเส้นแล้ว)
1. **Map/location spike (ยาวที่สุด มีงานคนสามงานต่อท้าย):** P1-H02 (R0, gameplay ต้องปิดก่อน) → P1-F02-T10 (R1) → P1-F02-T11 (R2 · ต้องมี T06 จาก R0, T12 และ H05 DONE แล้ว, X05 จาก R1) → P1-F02-T15 tech gate ∥ P1-F02-T14 kit (R3) → HUMAN P1-F02-T19 → HUMAN P1-F02-T20 → P1-F02-T21 (ต้องมี T16 จาก R5) → HUMAN P1-F02-T23 → P1-CLOSE-QA (R7)
   - ต้องพร้อมก่อน T15: P1-F02-T08 (R0), P1-X07 (R2) ← P1-X05 (R1) ← P1-H02 + P1-X04 (R0) · ทุกข้อจบก่อนหรือพร้อม T11 จึงไม่ยืดเส้น
   - ต้องพร้อมก่อน HUMAN T19: HUMAN P1-F02-T17 (Cloudflare) และ P1-F02-T18 (push ครั้งแรก) · สองงานนี้ยังไม่เริ่ม ถ้าไม่เสร็จภายใน R3 จะกลายเป็นเส้นวิกฤตทันที → orchestrator ควรส่งถึงคนตอนนี้
   - ความเสี่ยงบนเส้น: P1-F02-T06 ต้องผ่านงบจำนวนไฟล์ของ Pages ตาม D-031 (tile ≤ 15,000) · ถ้าไม่ผ่านต้องใช้ทางสำรองตามลำดับใน tech note
2. **Coverage:** P1-F02-T06 (R0, ครอง location-engineer) ∥ P1-X04 (R0) → P1-F01-T06 (R1) → P1-F01-T07 (R2) ∥ P1-X08 (R2) → P1-F01-T08 QA gate (R4 · R3 ให้ T14 ก่อน) → P1-F01-T09 ∥ P1-F01-T10 (R5) → HUMAN P1-F01-T11
3. **F03 gates:** deps จริงแยกเป็นสองสาย · สาย A: P1-H02 (R0) → P1-F03-T21 (R1) → P1-F03-T24 (R3, ต้องมี X01 จาก R2) · สาย B: P1-F03-T11 (R1) → P1-F03-T14 (R3) → P1-F03-T22 (R4, ต้องมี X06, H04, T27) → P1-F03-T25 (R6, ต้องมี X04) · game-director ทำตามลำดับ X01 (R2) → T24 (R3) → F01-T09 (R5) → T25 (R6) · T24 ไม่ต้องรอ T22
4. **ส่วนท้าย:** P1-H07 (R3) → P1-H06 (R6) → HUMAN P1-F02-T26 (หลัง T16, H06, T24) และ P1-CLOSE-QA

คอขวดทรัพยากรและลำดับที่เสนอ
- **gameplay-programmer (เส้นวิกฤต):** H02 → T10 → T11 · H02 ถูกจัดก่อน T10 ระหว่าง run ทำให้เส้นวิกฤตเลื่อน 1 R · ห้ามเพิ่มงานใหม่ให้ gameplay จนกว่า T11 จะ DONE · handoff ใหม่ถึง gameplay (เช่น wire copy area ใหม่, fire-together ของเสียง) ยกไป Phase 2 ตามหัวข้อ 1 "งานที่ยกไป" ยกเว้น fix ที่ gate ของ T11 ต้องใช้
- **location-engineer:** F02-T06 (R0) → F01-T06 (R1) → X08 (R2) → H07 (R3) → F02-T24 (หลัง T20) · F01-T06 ก่อนเพราะ level-designer (T07) รออยู่ · X08 ขนานกับ T07 และต้องเสร็จก่อน QA gate F01 · H07 ท้ายสุดเพราะใช้แค่ใน H06 (R6) และ T11 มีทางสำรองเป็น GeoJSON ว่าง · F02-T06 ครองทั้งเส้นวิกฤตและ coverage ถ้าลากเกิน 1 R ให้ orchestrator ขอให้ location-engineer ปิด T06 แบบ PARTIAL (tile ที่ผ่านงบแล้ว + fixture) แล้วเปิด fix task ต่อท้ายคิว แทนการถือ agent ไว้ยาว
- **qa-tester (หนักที่สุด 7 งาน):** H04 (R1) → F02-T13 (R2) → F02-T14 (R3) → F01-T08 (R4) → F02-T16 (R5) → H06 (R6) → CLOSE-QA (R7) · ใช้กฎสลับ T16/F01-T08 ด้านบน · งานใหม่ที่ส่งถึง qa ให้ลงช่องหลัง R6 เว้นแต่ gate ต้องใช้
- **game-director:** มี 4 งาน ไม่ชนกันตามลำดับข้อ 3 · ถ้า F01-T08 เลื่อน ให้ทำ F03-T25 ใน R5 แทนแล้วเลื่อน F01-T09 ไป R6
- **tech-lead:** X05 (R1) → T15 (R3) → T21 (หลังผลเดิน) · ว่างใน R2 และ R4–R5 ใช้รับ fix ของ T15 ได้ทันที

## 4. รายละเอียดงาน

### F01 — Coverage Survey

Lead: location-engineer · ร่วม: level-designer, product-manager, qa-tester · Gate: QA ก่อน แล้ว Design และ Product · งานคน: P1-F01-T11 (สำรอง P1-F02-T25 ถ้าดาวน์โหลดไม่ได้)

#### P1-F01-T01 — วิธีสำรวจ coverage และแหล่งข้อมูล (location-engineer, 1 วัน)
- Goal: กำหนดวิธีที่รันซ้ำได้ก่อนเขียน script ทั้งแหล่งข้อมูล ขอบเขต tag และกฎตัดออก
- Inputs: GDD "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม", "การกำหนด dungeon", "สถานที่ที่ไม่ควรเป็น dungeon", "M0"
- Acceptance:
  - [ ] ระบุแหล่งข้อมูลพร้อม URL และ license: OSM extract ประเทศไทย (Geofabrik), ขอบเขตเขต/อำเภอของกรุงเทพฯ + 5 จังหวัดปริมณฑล, ข้อมูลความหนาแน่นประชากร (เช่น WorldPop หรือ HRSL) — ไม่มีแหล่งใดต้องใช้บัญชีหรือ credential
  - [ ] tag ที่นับครบ 6 ชุดตาม GDD และวิธีจัดการ multipolygon, polygon ซ้อนกัน, `historic=*` ที่เป็นจุดไม่ใช่พื้นที่
  - [ ] กฎ blocklist แปลงเป็น OSM tag ชัดเจน (`amenity=hospital|school|place_of_worship|embassy`, `landuse=military|religious`, `office=government`, `military=*`, `building=temple|church|mosque` ฯลฯ) พร้อมกฎว่าทับหรืออยู่ภายในแค่ไหนจึงตัด (สัดส่วนเป็นค่าใน config)
  - [ ] polygon `historic=*` หรือ `tourism=attraction` ที่มี node หรือ polygon ศาสนสถานอยู่ภายในหรือทับเกินสัดส่วนที่กำหนดถูกตัด · เขตวัดและศาสนสถานทั้งหมดถูกตัดรวมงานวัด ตาม A-P1-PLAN-02-3 (SF-9, MF-4) · สวนที่มีศาลเจ้าเล็กข้างในตัดสินตามกฎสัดส่วน ไม่ตัดทั้งสวนอัตโนมัติ
  - [ ] ระบุ URL + checksum ของไฟล์ใหญ่ทุกไฟล์และ path ที่วาง เพื่อให้เปิด HUMAN P1-F02-T25 ได้ทันทีถ้าดาวน์โหลดไม่ได้
  - [ ] ระบุว่าเกณฑ์พื้นที่อ่านจาก `config/balance/dungeons.json` (P1-F03-T06) ไม่ hardcode
  - [ ] ระบุ output schema ของ `candidates.geojson` (id, osm_id, tags, area_m2, district, province, reason_excluded)

#### P1-F01-T02 — กฎคัด dungeon และเกณฑ์ให้คะแนนย่านเปิดตัว (level-designer, 1–2 วัน)
- Goal: แปลงกฎ GDD เป็นกฎตรวจได้ และกำหนดว่าย่านเปิดตัวที่ดีวัดจากอะไร
- Inputs: GDD "การกำหนด dungeon", "เวลาทำการ", "กลยุทธ์การเปิด", "ความปลอดภัยทางกายภาพ", "สถานที่ที่ไม่ควรเป็น dungeon" · `product/prd/F01-coverage-survey.md` (cross-read หน่วยวัดและนิยาม "ย่าน" ให้ตรงกับ PRD, PM-S07)
- Acceptance:
  - [ ] `dungeon-rules.md` มีกฎพื้นที่ (อ้าง key ใน `config/balance/dungeons.json` ไม่เขียนเลขซ้ำ), ห้ามทับกัน, ห้ามข้ามถนน `highway=primary` ขึ้นไป ทางรถไฟ แหล่งน้ำ ทางด่วน, ต้องมีทางเข้าจากทางเท้า, หมวด blocklist และหมวดกำกวมที่ต้องส่ง HUMAN รวมหมวด "เขตพระราชฐาน อนุสาวรีย์ และสถานที่เชิงสัญลักษณ์ทางการเมือง" (SF-9) · งานวัดตาม A-P1-PLAN-02-3
  - [ ] `launch-criteria.md` มีสูตรให้คะแนนย่าน (เช่น จำนวน dungeon ต่อ ตร.กม., ระยะเดินเฉลี่ยถึง dungeon ใกล้สุด, ความหนาแน่นประชากร, ความหลากหลายของ preset, ระยะเดินจากสถานีรถไฟฟ้าหรือป้ายรถเมล์ซึ่งมีน้ำหนักมากกว่าที่จอดรถ (N-6)) พร้อมน้ำหนัก · หน่วยวัดตรงกับเกณฑ์ใน PRD F01
  - [ ] นิยามขอบเขต "ย่าน" (เขต หรือ grid) ให้ location-engineer นับได้ตรงกัน
  - [ ] ระบุ `verification_mode` = `continuous_gps` และ `floor_level` = null สำหรับ v1

#### P1-F01-T03 — PRD F01 พร้อมเกณฑ์ Go / ทางเสริม / No-go (product-manager, 1 วัน)
- Goal: ตั้งเกณฑ์ตัวเลขล่วงหน้าเพื่อให้ผล coverage ตัดสินได้โดยไม่ลำเอียงหลังเห็นข้อมูล
- Inputs: GDD "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม", "กลยุทธ์การเปิด", "ความเสี่ยงที่ต้องเฝ้าดู" (Coverage ไม่พอ, Cold start), "10 นาทีแรกของคนใหม่" (ตัวอย่าง 650 ม. และปัญหา 3 กม., N-3), `design/pillars.md` ถ้ามี
- หมายเหตุ: อยู่ W1 ก่อนที่ `candidates.geojson` จะมี (W2) เพื่อให้เกณฑ์ตั้งก่อนเห็นข้อมูลจริง · level-designer จะ cross-read นิยาม "ย่าน" ใน P1-F01-T02 ให้ตรงกับ PRD นี้ (PM-S07)
- Acceptance:
  - [ ] ปัญหาผู้เล่น: "เปิดแอปแล้วไม่มี dungeon ใกล้" พร้อมกลุ่มผู้เล่นที่ได้รับผลกระทบ
  - [ ] เกณฑ์ Go เป็นตัวเลข (เช่น % ประชากรในย่านเปิดตัวที่อยู่ภายใน X ม. จาก dungeon, จำนวน dungeon ขั้นต่ำต่อย่าน) และเกณฑ์ "Go พร้อมทางเสริม" กับ "No-go"
  - [ ] ระบุว่าทางเสริมทั้งสาม (ชั้นที่สอง, dungeon ชั่วคราว, ผู้เล่นเสนอ) นับเข้าเกณฑ์อย่างไร
  - [ ] non-goals ของ F01 (ยังไม่วาด polygon จริงเป็น dungeon, ยังไม่ตั้งค่า drop)

#### P1-F01-T04 — Test plan F01 (qa-tester, 1 วัน)
- Goal: กำหนดวิธีพิสูจน์ว่าผล coverage ถูกและรันซ้ำได้
- Inputs: `tools/coverage/METHOD.md`, roadmap F01
- Acceptance:
  - [ ] case ตรวจ: รันซ้ำได้ผลเท่าเดิม, สุ่ม polygon อย่างน้อย 30 ชิ้นเทียบกับแผนที่จริง (พื้นที่, tag, blocklist), polygon ขนาดขอบ 2,999 / 3,000 / 150,000 / 150,001 ตร.ม.
  - [ ] case ตรวจว่าวัด โรงเรียน โรงพยาบาล ราชการ ทหาร สถานทูต ไม่หลุดเข้า candidates
  - [ ] case เพิ่ม (SF-9): วัดที่ tag เป็น `historic=*` หรือ `tourism=attraction`, สวนที่มีศาลเจ้าเล็กอยู่ข้างใน (ต้องตัดสินตามกฎสัดส่วน), งานวัดตาม A-P1-PLAN-02-3
  - [ ] traceability จากเกณฑ์ผ่านของ F01 ใน roadmap ไปยัง case

#### P1-F01-T05 — Pipeline ดึง OSM และคัด candidates (location-engineer, 2–3 วัน)
- Goal: ได้ `candidates.geojson` ที่สร้างซ้ำได้ด้วยคำสั่งเดียว
- Inputs: `tools/coverage/METHOD.md`, `docs/adr/0001-repo-layout.md` (ภาษาและ layout ของ `tools/`), `config/balance/dungeons.json`
- Acceptance:
  - [ ] คำสั่งเดียว (ระบุใน `tools/coverage/README.md`) ดาวน์โหลด extract, clip ขอบเขต, คัด tag, คำนวณพื้นที่แบบ projected (UTM 47N หรือเทียบเท่า), ตัด blocklist
  - [ ] ไฟล์ดิบขนาดใหญ่อยู่นอก git (`.gitignore`) · output มี `candidates.geojson` และ `excluded.geojson` พร้อมเหตุผลที่ตัด
  - [ ] เกณฑ์พื้นที่อ่านจาก config · ไม่มี magic number
  - [ ] มี test อย่างน้อยสำหรับการคำนวณพื้นที่และกฎ blocklist บน fixture เล็กที่ commit ได้ และรันผ่านจาก root `test` script (CI ไม่ดาวน์โหลดข้อมูลใหญ่)
  - [ ] dependency ของ Python pin ใน `tools/coverage/requirements.txt` + venv ในโฟลเดอร์ (กฎ path ร่วม) · ไม่มี secret
  - [ ] บันทึกวันที่ของ OSM extract และจำนวน polygon ก่อนและหลังแต่ละขั้น

#### P1-F01-T06 — นับรายเขตและ heatmap (location-engineer, 2 วัน)
- **เพิ่มจาก P1-X08 (ก่อนนับ, orchestrator):** (1) แก้ R2 ใน process.py ให้ศาสนสถานที่อยู่ในวงนอกของ historic/attraction (รวมที่เป็นรู) นับเป็น "ข้างใน" ตามหลักระวังไว้ก่อนของ D-006 แล้วเอา xfail GEO-02 ออก (2) osm_read.py ส่ง way ที่ไม่ปิดแต่มี tag candidate ลง assembly_failed แล้วเอา xfail GEO-11 ออก (3) coverage_meta.config บันทึกเฉพาะคีย์ที่ pipeline อ่านจริง (4) regenerate candidates + excluded พร้อมกันครั้งเดียว บันทึก SHA ใหม่และจำนวนที่เปลี่ยน (ถ้ามี) ใน README §5.5/§7/§8
- Goal: ให้ตัวเลขรายเขตและภาพเทียบความหนาแน่นประชากรพอให้เลือกย่านได้
- (P1-PLAN-SYNC-01) Deps เพิ่ม P1-X04 (เพิ่ม `coverageFilter.walkGraphSnapMaxDistance_m`, route factor สำรอง และ `educationAllowOsmIds`/`maxAspectRatio`/`maxEntranceGap_m` ใน `config/balance/dungeons.json` ที่งานนี้ต้องอ่าน ไม่ hardcode) และ P1-F01-T02 (launch criteria, DONE แล้ว) · ระยะเดินใช้ routing บนเครือข่ายทางเดิน OSM ตาม PRD หัวข้อ 8.1 (P1-H08)
- Inputs: `data/coverage/candidates.geojson`, `design/levels/launch-criteria.md` (เสร็จ W5 ก่อนงานนี้ใน W6), `product/prd/F01-coverage-survey.md`
- Acceptance:
  - [ ] `district-counts.csv`: จังหวัด, เขต/อำเภอ, จำนวน polygon ที่ใช้ได้, แยกตาม tag และตามขนาด (เล็ก/กลาง/ใหญ่), พื้นที่รวม, ประชากร, dungeon ต่อประชากร 100,000 คน
  - [ ] heatmap (HTML เปิดได้ตรงหรือ PNG) ซ้อน candidates กับความหนาแน่นประชากร และแสดงย่านว่าง
  - [ ] ตัวชี้วัดตาม launch criteria ต่อย่าน (เช่น ระยะเดินถึง dungeon ใกล้สุด) คำนวณด้วย script
  - [ ] รันซ้ำได้ด้วยคำสั่งเดียว

#### P1-F01-T07 — Coverage report (level-designer, 2 วัน)
- Goal: ตีความตัวเลขเป็นคำแนะนำที่คนตัดสินใจได้ภายใน 10 นาที
- Inputs: `data/coverage/`, `design/levels/dungeon-rules.md`, `design/levels/launch-criteria.md`, `product/prd/F01-coverage-survey.md`
- Acceptance:
  - [ ] ตารางจำนวน polygon ที่ใช้ได้แยกรายเขต (อ้างอิง `district-counts.csv`)
  - [ ] รายชื่อ 2–3 ย่านเปิดตัวที่ dungeon หนาแน่นที่สุด พร้อมคะแนนตาม launch criteria และตัวอย่าง candidate ต่อย่าน
  - [ ] คำแนะนำหนึ่งข้อ: Go / Go พร้อมทางเสริม (ระบุชั้นที่สอง / dungeon ชั่วคราว / ผู้เล่นเสนอ) / No-go พร้อมตัวเลขเทียบเกณฑ์ใน PRD
  - [ ] รายการสถานที่กำกวมหรือหมวดอ่อนไหวที่ต้องให้ HUMAN ตัดสิน
  - [ ] สรุปหน้าแรกไม่เกิน 20 บรรทัด

#### P1-F01-T08 — QA gate F01 (qa-tester, 1–2 วัน)
- Acceptance:
  - [ ] ทุก case ใน `qa/plans/F01-test-plan.md` มีผล พร้อมหลักฐาน (คำสั่งที่รัน, ผลต่าง, ภาพ)
  - [ ] ยืนยันรันซ้ำได้ผลตรงกัน และตัวเลขใน report ตรงกับ `district-counts.csv`
  - [ ] verdict PASS / NEEDS_CHANGES พร้อม findings เป็น handoff

#### P1-F01-T09 — Design gate F01 (game-director, 1 วัน)
- เริ่มหลัง QA gate F01 (P1-F01-T08) เพื่อตัดสินบนตัวเลขที่ผ่านการตรวจแล้ว (PM-M02)
- Acceptance:
  - [ ] ย่านที่แนะนำและทางเสริมสอดคล้องกับ pillars, หลักการตัดสินข้อ 3 และ 5, และกลยุทธ์เปิดรายย่าน
  - [ ] ไม่มีหมวดต้องห้ามหลุดเข้ารายชื่อ (รวมเขตวัดตาม A-P1-PLAN-02-3) · verdict PASS / NEEDS_CHANGES
  - [ ] ถ้าคำแนะนำไม่ใช่ Go ล้วน ระบุผลต่อ pillars, dungeon preset (P1-F03-T09) และหน้าจอที่บ้าน (P1-F03-T16) เป็น handoff ก่อนปิด phase (SF-13)

#### P1-F01-T10 — Product gate F01 (product-manager, 1 วัน)
- เริ่มหลัง QA gate F01 (P1-F01-T08) (PM-M02)
- Acceptance:
  - [ ] คำแนะนำเทียบกับเกณฑ์ใน PRD ได้ตรงและไม่มีการเปลี่ยนเกณฑ์หลังเห็นผล
  - [ ] ระบุ metric ที่ต้องเฝ้าต่อ (dungeon ใกล้สุดเมื่อเปิดแอป) ให้มีใน `product/telemetry-events.md` · verdict PASS / NEEDS_CHANGES

#### P1-F01-T11 — HUMAN: ยืนยันผล Go / No-go ของ coverage
- ปลดล็อก: exit item "ผล Go / No-go F01" และการเลือกย่านนำร่องของ Phase 2 (F04)
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · งานนี้เป็นการอ่านไฟล์ในเครื่องและตอบเท่านั้น
- ขั้นตอน:
  1. เปิด `design/levels/coverage-report.md` อ่านสรุปหน้าแรกและตารางย่านที่แนะนำ
  2. เปิด `data/coverage/heatmap/` ในเบราว์เซอร์เพื่อดูภาพรวม
  3. อ่าน verdict ใน `qa/reports/F01-qa-gate.md`, `design/reviews/F01-design-gate.md`, `product/reviews/F01-product-gate.md`
  4. ตอบ orchestrator หนึ่งข้อ: (ก) Go (ข) Go พร้อมทางเสริม ระบุทาง (ค) No-go ให้ producer เสนอการปรับ design
  5. ถ้ามีรายการสถานที่กำกวมใน report ให้ตอบว่ารวมหรือตัดทีละรายการ
  6. ยืนยันย่านเปิดตัว 2–3 ย่าน (ยอมรับตามที่แนะนำ หรือระบุย่านอื่น)

### F02 — Tech Foundation และ Map/Location Spike

Lead: tech-lead · ร่วม: location-engineer, gameplay-programmer, devops-engineer, qa-tester, product-manager (เกณฑ์ spike) · Gate: Tech, QA · งานคน: P1-F02-T17, T18, T19, T20, T23, T26 · สำรอง: T25 · CUT: T22 (D-008)

#### P1-F02-T01 — ADR 0001 โครง repo + git init (tech-lead, 2–3 วัน) — งาน tech แรกของ phase
- Goal: ตัดสิน layout ของ `apps/` `packages/` `tools/` และวางโครงที่ทุกงานโค้ดใช้ร่วมกัน
- Inputs: CLAUDE.md (Workspace map), GDD "สถาปัตยกรรมเทคนิค", `.claude/agents/tech-lead.md`
- Acceptance:
  - [ ] ตั้ง remote `origin` = `https://github.com/pongponWorkspace/keep-walking` (repo public ที่คนสร้างไว้แล้ว ยังว่าง) · branch หลักชื่อ `main` · **ห้าม push** (push เป็นงานคนใน P1-F02-T18)
  - [ ] `git init` แล้ว มี `.gitignore` (node_modules, `.env*` ยกเว้น `.env.example`, `.dev.vars`, ไฟล์ key/credential (`*.pem`, `*.key`), ไฟล์ข้อมูลดิบขนาดใหญ่ (`*.osm.pbf`, raster ประชากร `*.tif`, โฟลเดอร์ดาวน์โหลดของ `tools/coverage/`), `*.pmtiles` ทุกไฟล์ยกเว้น `tools/tiles/fixtures/`, `tools/tiles/out/`, `qa/playtest/results/raw/`, venv ของ `tools/*`, `audio/out/` ถ้าใหญ่) และ commit แรกในเครื่องที่ `git add` เฉพาะ path ของงานนี้ (ไม่ push) · ใช้ git config ระดับ repo ไม่แตะ global · แนบผล `git check-ignore -v` ของตัวอย่างไฟล์ต้องห้ามแต่ละประเภท
  - [ ] ADR 0001 ระบุว่า repo เป็น **public** (D-002) และผลที่ตามมา: ทุกไฟล์ที่ commit เปิดเผย (รวม GDD และ `studio/`), ห้าม commit secret/`.env*` ที่มีค่า/raw trace/ข้อมูลส่วนบุคคล/ไฟล์ดิบใหญ่, การป้องกันสามชั้นตามหัวข้อ 1 "กฎ repo public" · ระบุว่าบริการทุกตัวต้องเป็น free tier ไม่ผูกบัตร (D-001)
  - [ ] ADR 0001 ระบุ package manager, TypeScript strict, lint (มีกฎหรือ check กัน magic number), formatter, test runner, e2e runner (เช่น Playwright + Chromium mobile emulation) และ layout: `apps/client`, `apps/api` (ชื่อจองแบบมีเงื่อนไขตามผล ADR 0002), `packages/shared`, `packages/location`, `packages/geo`, `tools/*`, ที่อ่าน `config/` · workspace/test config ครอบ `qa/tests/*` (TL-S04)
  - [ ] ADR ระบุนโยบายภาษาใน `tools/` (Python สำหรับ GIS ได้ โดย pin ต่อโฟลเดอร์) · กฎ lint "`apps/*` `packages/*` ห้าม import `tools/*`" · กฎ path ร่วมของ lockfile ตามหัวข้อ 1 · นโยบาย commit: agent ไม่ commit เอง orchestrator commit เมื่อจบ wave · รูปแบบ golden vectors `{input, expected, tolerance, source}` เป็นรูปแบบกลาง · ข้อตกลง config ขั้นต่ำ (camelCase, หน่วยในชื่อ key, `_source`) ตามที่ P1-F03-T06 ใช้ (TL-N02)
  - [ ] ADR ประกาศว่า logic ของ movement gate, damage, drop, exp เป็น pure function ใน `packages/shared` ที่รันฝั่ง server ได้และต้องผ่าน golden vectors · ผลที่คำนวณบน client ใน Phase 2 ไม่ใช่รางวัลจริงและไม่ย้ายเข้า account ใน Phase 3 (SF-10)
  - [ ] สร้าง `package.json` stub ของทุก workspace ที่รู้แล้ว (`apps/client`, `packages/shared`, `packages/location`, `tools/traces`, `tools/sim` ถ้าเป็น TS) และติดตั้ง dependency ที่คาดได้ล่วงหน้าพร้อม pin version (typescript, test runner, lint, `maplibre-gl`, `pmtiles`, `vite`, JSON Schema validator, e2e runner, `wrangler` สำหรับ deploy และ local preview ตาม D-008) ใน lockfile เดียว (TL-M01)
  - [ ] คำสั่ง root `lint`, `typecheck`, `test`, `build`, `test:e2e` รันผ่านบน skeleton (`packages/shared` มี test ตัวอย่าง 1 ตัว) พร้อมหลักฐาน output
  - [ ] `apps/README.md`, `packages/README.md`, `tools/README.md` บอกเจ้าของแต่ละโฟลเดอร์ตาม agent file

#### P1-F02-T02 — ADR 0002 ยืนยัน backend stack ตาม D-008 (tech-lead, 2 วัน)
- Goal: บันทึกและ**ยืนยัน** stack ที่ตัดสินแล้วใน D-008 (Cloudflare แผน Free ไม่ผูกบัตร: Workers + Durable Objects แบบ SQLite-backed + D1 + Pages) ด้วยเพดาน free tier ที่ตรวจจากแหล่งจริง และบอกว่ารองรับ Phase 2–3 ได้แค่ไหนก่อนต้องขยาย · ไม่ใช่การเลือก stack ใหม่
- Inputs: `studio/decisions/decision-log.md` (D-001, D-008), GDD "โครงสร้างระบบ", "Data model หลัก", "Raid Boss > ข้อควรระวังเชิงเทคนิค", ADR 0001, roadmap Phase 2–3
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · งานนี้เป็นการอ่านเอกสารสาธารณะ ไม่ต้องสมัครบัญชีใด · **ถ้าชิ้นใดที่ stack ต้องใช้ไม่ฟรีหรือต้องผูกบัตร ให้รายงาน `PARTIAL` พร้อมคำถาม HUMAN** (ทางเลือกฟรีที่ลดขอบเขต เทียบกับการขออนุมัติค่าใช้จ่าย) ห้ามเปลี่ยน stack เอง
- Acceptance:
  - [ ] ADR 0002 สถานะ Accepted อ้าง D-008 เป็น decision · Supabase Free (Postgres + PostGIS) บันทึกเป็นทางเลือกที่พิจารณาแล้วไม่เลือก พร้อมเหตุผลอย่างน้อย: project ถูก pause เมื่อไม่มีการใช้งาน (ผลต่อ dev และ playtest), realtime และ state ต่อ dungeon เป็นคนละโมเดลกับ Durable Objects ต่อ geohash-5 ที่ GDD ออกแบบไว้, ต้องย้าย vendor เมื่อขยาย
  - [ ] ตารางเพดาน free tier ที่ตรวจแล้ว **แต่ละแถวมี URL แหล่งอ้างอิงและวันที่ตรวจ**: Workers Free (request ต่อวัน, CPU time ต่อ request), Durable Objects บนแผน Free (ใช้ได้โดยไม่ผูกบัตรจริงหรือไม่, ต้องเป็นแบบ SQLite-backed, เพดาน request / duration / storage), D1 Free (ขนาดต่อ DB, จำนวน DB, row read/write ต่อวัน), Pages / Workers static assets (ขนาดต่อไฟล์, จำนวนไฟล์ต่อ deploy, build ต่อเดือน, bandwidth) · ระบุด้วยว่าเมื่อชนเพดานแล้วบริการทำอะไร (ปฏิเสธ request หรือคิดเงิน)
  - [ ] ประมาณการโหลด Phase 2 (client-first, ใช้แค่ Pages + tile) และ Phase 3 (backend + party, playtest ราว 5–20 คน ระบุสมมติฐาน เช่น 1 sample ต่อ 5–10 วินาทีต่อคน, ข้อความ party sync) เทียบกับเพดานด้านบน · ระบุว่าจุดไหนชนก่อน และที่ 1,000 / 5,000 ผู้เล่นยังอยู่ใน free tier หรือไม่ (ตัวเลขเมื่อเกินเป็นข้อมูลประกอบการขออนุมัติค่าใช้จ่ายในอนาคตเท่านั้น พร้อมวันที่ของราคา)
  - [ ] ทางขยาย: อัปเกรดเป็น Workers Paid และเปิด R2 ในบัญชีเดิมโดยไม่ย้าย vendor · สิ่งที่เปลี่ยน (env, config, script publish) และสิ่งที่ไม่เปลี่ยน (โค้ด client, interface) · ทุกขั้นที่มีค่าใช้จ่ายต้องเป็น decision อนุมัติงบแยก
  - [ ] ผลต่อ data model (`verification_mode`, `floor_level`, `position_log` TTL 24 ชม. บน D1 หรือ DO storage) และการทำ geo query (point-in-polygon, ระยะ) บน stack นี้ · ยืนยันชื่อ `apps/api` ใน ADR 0001
  - [ ] ระบุว่า Phase 1–2 ไม่ต้องรอ backend (client-first) · ไม่มีงาน HUMAN ยืนยัน stack แล้ว (P1-F02-T22 CUT ตาม D-008)

#### P1-F02-T03 — Tech note F02 + เกณฑ์ spike + รูปแบบ trace + interface (tech-lead, 3 วัน)
- Goal: ให้ location, gameplay, qa, art build ตามสัญญาเดียวกัน และตั้งเกณฑ์ Go/No-go ของ spike ก่อนวัด
- Inputs: GDD "โครงสร้างระบบ", "แผนที่", "สัญญาณขาดและแอปถูกปิด", "Movement gate", "M1", ADR 0001
- Acceptance:
  - [ ] `LocationSample` type + `validateTrace` แบบ pure (ไม่มี DOM API) ใน `packages/shared/src/trace.ts` และ JSON Schema ใน `packages/shared/schemas/gps-trace.schema.json` · P1-F02-T04, T05, T13, T24 ใช้ไฟล์นี้เท่านั้น (TL-M05) · `timestamp` = เวลาจาก fix ไม่ใช่เวลาที่ได้รับ (TL-S09) · และ `LocationProvider` interface ใน `packages/location/src/types.ts` (re-export `LocationSample`): start/stop, subscribe sample, สถานะ permission, error (denied, unavailable, timeout), visibility (หยุดเมื่อหน้าจอล็อก), รับ `Clock`/scheduler ที่ฉีดได้เพื่อให้ test เล่น trace 30 นาทีในไม่กี่ ms
  - [ ] `docs/tech/gps-trace-format.md`: trace (metadata ไม่ระบุตัวตน; samples: t, lat, lng, accuracy, speed?) และรูปแบบ export สองแบบ (TL-M06, MF-3): (ก) `summary` CSV ไม่มีพิกัด (FPS, แบต, MB แยกประเภท, accuracy stats, ระยะสะสม, ช่วง sample ขาด) เป็นค่าเริ่มต้น (ข) raw trace มีพิกัด เป็น opt-in ที่ตัดต้นและปลายตามระยะใน config (ตั้งต้น 200 ม.) และเวลาเป็น relative ก่อนออกจากเครื่อง · วิธีที่ client โหลด trace จาก `data/gps-traces/` (TL-N04)
  - [ ] tile schema = Protomaps basemap (pin เวอร์ชัน) ได้ tile ด้วย `pmtiles extract` ตาม bbox กรุงเทพฯ + 5 จังหวัด · planetiler เป็นทางสำรองด้วย profile ของ Protomaps (TL-M02) · font stack ที่ครอบ Thai (เช่น Noto Sans Thai + Noto Sans) และ path ของ glyph/sprite ที่ P1-F02-T06 สร้าง, P1-F03-T12 อ้าง, P1-F02-T11 โหลด, P1-F02-T08 publish (TL-M03)
  - [ ] หัวข้อ "เกณฑ์ spike" ตั้งก่อนวัด (TL-M04, PM-M01) พร้อมนิยามวิธีวัด: FPS ระหว่าง pan/zoom และโหมดตามตัว (เฉลี่ย, p5) · แบตต่อ 30 นาทีแบบจอเปิดตลอด · MB ใน 30 นาทีแยก JS / style + glyph / tile โดยนับ byte ในตัว client ผ่าน custom `Source` ของ `pmtiles` และ wrapper ของ fetch (Resource Timing เป็นตัวรอง, TL-S07) · accuracy median/p90 แยกสวนกับซอยเทียบ check-in < 30 ม. และ movement gate 50 ม./5 นาที · ความหน่วงของจุด · ป้ายภาษาไทยวรรณยุกต์ถูกตำแหน่ง · ทุกตัวมีช่วง Go / Go พร้อมเงื่อนไข / No-go · ส่งให้ product-manager ยืนยันใน P1-F02-T27
  - [ ] หัวข้อ "host ของ tile และ preview" (D-001, D-008): host หลัก = **Cloudflare Pages / Workers static assets แผน Free** (ตัดสินแล้ว ไม่เลือกใหม่) · GitHub Pages (deploy ผ่าน Actions) เป็นทางสำรองชั่วคราวเท่านั้น · ตารางเพดานของทั้งสองพร้อม URL และวันที่ (ขนาดต่อไฟล์ เช่น Cloudflare ราว 25 MiB / GitHub Pages 100 MB, จำนวนไฟล์ต่อ deploy, ขนาด site รวม, bandwidth, Cache-Control ตั้งเองได้ไหม ผ่าน `_headers`, HTTPS) · **ยืนยันว่ารองรับ HTTP range request** ด้วยหลักฐาน (เช่น `curl -sI -H "Range: bytes=0-99"` กับไฟล์สาธารณะบน `*.pages.dev` ได้ `206` และ `Content-Range`) และ CORS ถ้า tile อยู่คนละ origin กับ client · "งบขนาด tile" = เพดานต่อไฟล์ของ Cloudflare ที่ P1-F02-T06 ต้องผ่าน และลำดับทางแก้: **แบ่ง PMTiles ตามพื้นที่** (กำหนดวิธีแบ่ง เช่น ต่อจังหวัดหรือ grid, ชื่อไฟล์, และวิธีที่ client เลือกไฟล์ตามตำแหน่งจาก manifest ใน config) → ลด maxzoom เสริม → ใช้ GitHub Pages สำรองชั่วคราวถ้ายังไม่ผ่าน · URL ฐานของ tile มาจาก config (`TILES_PUBLIC_BASE_URL`) · ระบุว่า PMTiles บน R2 ตาม GDD คือทางขยายในบัญชีเดิมเมื่ออนุมัติงบ
  - [ ] tech note: โมดูลของ spike, การเลือก provider ผ่าน URL/config, การโหลด PMTiles (fixture / local file / URL บน Cloudflare Pages ตาม D-008 รวมกรณีหลายไฟล์ที่แบ่งตามพื้นที่ · ทุกแบบมาจาก config), failure modes รวมความเสี่ยง Thai shaping ของ MapLibre พร้อมทางเลือกถ้าไม่ผ่าน (ลดป้ายชื่อ, ป้าย dungeon แบบ HTML marker) · ใช้ชื่อ env `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` (map จาก `TILES_PUBLIC_BASE_URL`) · typecheck และ test ของ `validateTrace` ผ่าน

#### P1-F02-T04 — ชุด GPS trace สังเคราะห์ (location-engineer, 1–2 วัน)
- Goal: มี trace ให้ Mock เล่นและ test ใช้ได้ทันทีโดยไม่ต้องออกไปเดิน
- Inputs: `docs/tech/gps-trace-format.md`, GDD "Movement gate", "การเข้าและออก"
- Acceptance:
  - [ ] generator ใน `tools/traces/` สร้าง trace ซ้ำได้ด้วย seed
  - [ ] อย่างน้อย 6 trace ใน `data/gps-traces/synthetic/`: เดินวนในสวน, นั่งม้านั่งมี jitter, มือถือวางนิ่งบนโต๊ะ, เดินเลียบขอบ polygon, drift spike, เดินในซอยตึกบัง (accuracy แย่)
  - [ ] ทุกไฟล์ผ่าน `validateTrace` / `gps-trace.schema.json` ของ `packages/shared` (ไม่เขียน validator เอง) และ README อธิบายแต่ละ trace (ระยะ, เวลา, สิ่งที่คาดว่าจะเกิด) รวมกฎตั้งชื่อและการปัดพิกัด
  - [ ] ไม่มีพิกัดที่ผูกกับบ้านหรือบุคคลจริง

#### P1-F02-T05 — Web + Mock `LocationProvider` + Capacitor stub (location-engineer, 2–3 วัน)
- Goal: implementation ที่ client ใช้ได้ทันที โดย Mock สำคัญที่สุด
- Inputs: `packages/location/src/types.ts`, `data/gps-traces/`
- Acceptance:
  - [ ] Web: ใช้ `navigator.geolocation.watchPosition` ที่นี่ที่เดียว, จัดการ permission denied, timeout, accuracy ต่ำ, หยุดเมื่อ `visibilitychange` ซ่อน
  - [ ] Mock: เล่น trace ตามเวลาจริงและเร่งความเร็วได้ (×1, ×10, ×60), pause/seek, loop · ใช้ `Clock` ที่ฉีดได้ test ใช้ fake clock (TL-S09) · โหลด trace ผ่าน `validateTrace`
  - [ ] Capacitor: stub ที่ implement interface และ throw "not implemented until Phase 8" ชัดเจน
  - [ ] unit test + trace-replay test ผ่าน (Mock ส่ง sample ครบตามลำดับและเวลา)
  - [ ] ไม่ log พิกัดดิบในระดับ production log

#### P1-F02-T06 — Script build PMTiles (location-engineer, 2 วัน)
- **แก้ตาม D-031 (orchestrator, 2026-09-23):** Cloudflare Pages ไม่ตอบ 206 → แทนที่ข้อ "แบ่ง PMTiles ตามพื้นที่ + manifest" ด้วย: แตก PMTiles ที่ `pmtiles extract` ได้เป็นไดเรกทอรี XYZ + `tiles.json` (TileJSON) + `manifest.json` · ตรวจงบจำนวนไฟล์ (tile ≤ 15,000, รวมทั้ง deploy ≤ 16,000, เพดาน Pages 20,000) · ลำดับทางแก้ z15 → z14 → GitHub Pages ชั่วคราว (PMTiles) → HUMAN · publish ไฟล์ font Noto Sans Thai (D-032) · ดู `docs/tech/F02-map-location-spike.md` หัวข้อ 7 และ 14 · bbox เริ่มต้น `99.80,13.40,101.00,14.35` ให้ตรวจกับขอบเขตปกครอง
- Goal: ได้ไฟล์ PMTiles ของกรุงเทพฯ + ปริมณฑลที่สร้างซ้ำได้ และรู้ขนาดจริง
- Inputs: GDD "แผนที่", ADR 0001, `docs/tech/F02-map-location-spike.md` (tile schema, font stack, path glyph/sprite, หัวข้อ "host ของ tile และ preview" งบขนาด tile และวิธีแบ่งตามพื้นที่), D-008
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · แหล่ง tile ต้องดาวน์โหลดได้ฟรีโดยไม่ใช้บัญชี · ถ้าผ่านเพดานของ host ไม่ได้แม้ใช้ทางแก้ทั้งสามแล้ว ให้รายงาน PARTIAL พร้อมคำถาม HUMAN ไม่เปลี่ยนไปใช้ host เสียเงินเอง
- Acceptance:
  - [ ] script สร้าง PMTiles กรุงเทพฯ + ปริมณฑลใน `tools/tiles/out/` ตาม tile schema และวิธีที่ P1-F02-T03 pin ไว้ (`pmtiles extract` เป็นหลัก) ด้วยคำสั่งเดียว (output อยู่นอก git) · **ทุกไฟล์ที่ต้อง publish ไม่เกินเพดานต่อไฟล์ของ Cloudflare Pages / Workers static assets** (ราว 25 MiB ตามที่ tech note ยืนยัน, D-008) โดยใช้ทางแก้ตามลำดับใน tech note: **แบ่งไฟล์ตามพื้นที่** เป็นหลัก (ต่อจังหวัดหรือ grid ตาม tech note, ครอบกรุงเทพฯ + 5 จังหวัดครบ, สร้าง `manifest` บอก bbox ของแต่ละไฟล์ให้ client เลือกโหลด) → ลด maxzoom เสริม (พารามิเตอร์ของ script) → ถ้ายังไม่ผ่าน ให้ script ส่งออกชุดสำหรับ GitHub Pages สำรองชั่วคราวและรายงาน · จำนวนไฟล์รวมต้องไม่เกินเพดานจำนวนไฟล์ต่อ deploy · script ล้มพร้อมข้อความชัดเมื่อไฟล์ใดเกินเพดาน (ค่าเพดาน, วิธีแบ่ง, maxzoom และ bbox อยู่ในไฟล์ config ของ script ใน `tools/tiles/` ไม่ hardcode)
  - [ ] fixture PMTiles ขนาดเล็กที่ commit ได้ (เช่น สวนลุมพินี zoom ถึง 16 ไม่เกิน 2 MB) ใน `tools/tiles/fixtures/` พร้อมคำสั่งสร้างซ้ำ สำหรับ CI, QA และ client (TL-S08)
  - [ ] สร้าง glyph PBF ของ font stack ภาษาไทยและ sprite ตาม path ที่ tech note กำหนด (output อยู่นอก git ยกเว้นชุดเล็กที่ fixture ต้องใช้) (TL-M03)
  - [ ] size report: ขนาดแต่ละไฟล์และจำนวนไฟล์เทียบเพดานของ Cloudflare, วิธีแบ่งที่ใช้, zoom range ที่เลือกและผลต่อการอ่านชื่อถนน (overzoom ถึง 18), เวลา build, ประมาณการขนาดถ้าทั้งประเทศไทย เทียบตัวเลข 1–3 GB ใน GDD และเทียบกรณี R2 (ไม่มีเพดานต่อไฟล์) เพื่อประกอบการตัดสินในอนาคต
  - [ ] serve ในเครื่องได้ (HTTP range request ตอบ `206`) พร้อมคำสั่งใน README · ไม่มีขั้นตอนใดใช้ credential (การ publish เป็นของ P1-F02-T08 script + HUMAN P1-F02-T19)

#### P1-F02-T07 — CI + secret scan + env docs (devops-engineer, 2 วัน)
- Goal: pipeline lint/typecheck/test/build ที่คนเปิดใช้บน GitHub ได้ทันที และกันไม่ให้ของอ่อนไหวหลุดเข้า repo public
- Inputs: ADR 0001, หัวข้อ 1 "กฎ repo public" และ "กฎคุมค่าใช้จ่าย"
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · GitHub Actions บน repo public ใช้ฟรี (D-002) · ห้ามใช้ action หรือบริการที่ต้องมี license key เสียเงินหรือบัญชีภายนอก · ถ้าเครื่องมือใดต้องจ่าย ให้เลือกตัวฟรีหรือรายงานคำถาม HUMAN
- Acceptance:
  - [ ] workflow ใน `.github/workflows/` เรียก root script ชุดเดียวกับที่รันในเครื่อง (รวม test ของ `tools/` ที่เป็น Python ถ้า ADR เลือก) และ e2e แยก job (TL-S04) · ไม่แก้ root `package.json` (script มาจาก P1-F02-T01) · CI ไม่ดาวน์โหลดข้อมูลใหญ่ test ใช้ fixture เท่านั้น (TL-S11)
  - [ ] **secret scan** (D-002): job ที่รัน gitleaks CLI (open source, ไม่ต้องมี license key) ครอบ git history ทั้งหมดทุก push และ pull request พร้อม `.gitleaks.toml` (allowlist เฉพาะ `.env.example` ที่ไม่มีค่า) · job ล้มเมื่อพบ secret · มีคำสั่งรันในเครื่องใน `docs/tech/environments.md`
  - [ ] **guard ไฟล์ต้องห้าม** (D-002): job ล้มเมื่อมีไฟล์ถูก track ใน `qa/playtest/results/raw/`, ไฟล์ `.env*` อื่นนอกจาก `.env.example`, ไฟล์ `*.pmtiles` นอก `tools/tiles/fixtures/`, `*.osm.pbf` หรือไฟล์ใดใหญ่เกินเพดานที่ตั้งใน workflow (เช่น 5 MB) · พิสูจน์ด้วยการลองใน branch ทดลองในเครื่องว่าล้มจริง แล้วแนบ output
  - [ ] รัน script ชุดเดียวกันในเครื่องผ่าน พร้อมหลักฐาน output (CI จริงยืนยันใน P1-F02-T18 และ T26)
  - [ ] `.env.example` มีเฉพาะชื่อ env ฝั่ง client `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` (TL-S05) และ `TILES_PUBLIC_BASE_URL` · ไม่มีชื่อที่ผูกกับ R2 · ไม่มีค่าจริง · env ของ host เพิ่มโดย P1-F02-T08
  - [ ] `docs/tech/environments.md` อธิบาย local / preview, ว่า env ไหนใช้ที่ไหน, และกฎ repo public (สิ่งที่ห้าม commit และชั้นป้องกัน)

#### P1-F02-T08 — Infra preview บน host ฟรี + script publish + runbook (devops-engineer, 2 วัน)
- **แก้ตาม D-031 (orchestrator, 2026-09-23):** ใช้ Pages project แยกสำหรับแผนที่ · ตั้ง `_headers` ตาม tech note หัวข้อ 7.5 และใส่ `404.html` · ตรวจด้วย curl ตามหัวข้อ 7.2: XYZ ต้องได้ `200` + content-type + CORS + Timing-Allow-Origin · `206` ตรวจเฉพาะทางสำรอง PMTiles บน GitHub Pages
- Goal: ทุกอย่างพร้อมให้คนกดหรือรันคำสั่งเดียวแล้วได้ preview URL บน Cloudflare Pages แผน Free ที่ไม่ผูกบัตร (D-008)
- Inputs: ADR 0001, ADR 0002 ถ้ามี, D-008, `docs/tech/environments.md`, `docs/tech/F02-map-location-spike.md` หัวข้อ "host ของ tile และ preview" (งบขนาด tile และวิธีแบ่งตามพื้นที่), `tools/tiles/README.md` ถ้ามี (output ใน `tools/tiles/out/`)
- กฎคุมค่าใช้จ่าย: **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** · ใช้เฉพาะความสามารถของแผนฟรี · ไม่มี R2 bucket หรือ storage เสียเงินใดใน `infra/` · ถ้าพบว่าสิ่งที่ต้องทำใช้ไม่ได้บนแผนฟรี ให้รายงานคำถาม HUMAN แทนการทำต่อ
- Acceptance:
  - [ ] config เป็น code สำหรับ Cloudflare Pages แผน Free: config ใน `infra/` (ชื่อ Pages project, `_headers` สำหรับ `Content-Type`, `Cache-Control`, CORS, `noindex`) และ workflow `.github/workflows/deploy-preview.yml` (สั่งเองด้วย `workflow_dispatch` ไม่รันทุก push) ที่ build client, สร้างหรือดึง tile ตามงบขนาดและวิธีแบ่งตามพื้นที่ แล้ว deploy ด้วย `wrangler pages deploy` โดยอ่าน `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` จาก GitHub Actions secret · ไม่ commit ไฟล์ tile ใหญ่เข้า git · workflow tile แยกจาก CI test จึงไม่ขัด "CI ไม่ดาวน์โหลดข้อมูลใหญ่" · ทางสำรอง GitHub Pages (`actions/deploy-pages`) เขียนเป็น input หรือ job แยกที่ปิดไว้ตั้งต้น พร้อมหมายเหตุว่าใช้ชั่วคราวเท่านั้น
  - [ ] script publish PMTiles พร้อม glyph/sprite (TL-M03) ตรวจขนาดทุกไฟล์ก่อน publish ว่าไม่เกินเพดาน, ตั้ง `Content-Type` และ `Cache-Control` ผ่าน `_headers` ของ Cloudflare (ถ้าใช้ทางสำรอง GitHub Pages ซึ่งตั้งไม่ได้ ให้บันทึกค่าที่ host ใช้จริงใน runbook เพื่อให้ตีความตัวเลข data ถูก, TL-S07) · มี dry-run · preview ใส่ `noindex` (TL-N07)
  - [ ] secret อ่านจาก env หรือ GitHub Actions secret เท่านั้น · เพิ่ม `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` ใน `.env.example` โดยไม่มีค่า · ไม่มีชื่อ env ที่ผูกกับ R2 · runbook ระบุสิทธิ์ token ขั้นต่ำที่ต้องใช้ (ตรงกับที่คนสร้างใน P1-F02-T17)
  - [ ] `infra/runbooks/preview-setup.md`: ขั้นตอนที่คนทำใน P1-F02-T17 และ T19 ทีละขั้น พร้อมวิธีตรวจว่าสำเร็จ (รวมคำสั่ง `curl` ตรวจว่า URL ของ tile ตอบ `206` เมื่อส่ง header `Range`), วิธีลบ/rollback และหมายเหตุว่าทางขยายคือ Workers Paid + PMTiles บน R2 ในบัญชี Cloudflare เดิมเมื่อคนอนุมัติค่าใช้จ่าย (เปลี่ยนแค่ env และ target ของ script)
  - [ ] local preview (static server ที่รองรับ range request หรือ `wrangler dev`) รันได้โดยไม่ต้องมี credential

#### P1-F02-T09 — Client scaffold + หน้า spike แผนที่ (gameplay-programmer, 2 วัน)
- Goal: หน้าเว็บมือถือที่แสดง MapLibre GL JS + PMTiles ได้
- Inputs: ADR 0001, GDD "แผนที่"
- Acceptance:
  - [ ] `apps/client` ตาม framework ใน ADR, build ผ่าน, test ตัวอย่างผ่าน
  - [ ] แสดงแผนที่จาก PMTiles ผ่าน pmtiles protocol โดย URL มาจาก `VITE_TILES_URL` (ใช้ fixture จาก Protomaps demo ชั่วคราวก่อนมี fixture ของ P1-F02-T06, TL-S08)
  - [ ] เปิด `AttributionControl` แสดง "© OpenStreetMap contributors" และ Protomaps (TL-S13) · มีคำสั่ง dev แบบ HTTPS สำหรับลองบนมือถือใน LAN (TL-N03)
  - [ ] ไม่มี Mapbox หรือ Google SDK · ไม่มี string ไทยฝังในโค้ด (ใช้ key ชั่วคราวได้) · ไม่เพิ่ม dependency นอกจากที่ P1-F02-T01 ติดตั้งไว้ (ถ้าต้องการให้ handoff ถึง tech-lead)
  - [ ] ใช้งานบน viewport มือถือ (ทดสอบด้วย device emulation) ได้

#### P1-F02-T10 — ต่อ `LocationProvider` เข้าแผนที่ (gameplay-programmer, 2 วัน)
- Goal: จุดตำแหน่งขยับบนแผนที่จากทั้ง GPS จริงและ Mock trace
- Inputs: `packages/location`, `data/gps-traces/`, `docs/tech/F02-map-location-spike.md`
- Acceptance:
  - [ ] เลือก Web หรือ Mock ผ่าน URL/config · Mock เลือก trace และความเร็วได้
  - [ ] จุดตำแหน่ง + วง accuracy + โหมดตามตัว ขยับตาม sample
  - [ ] สถานะ GPS ปิด / permission denied / accuracy ต่ำ แสดงผลแยกกัน ใช้ชื่อ key กลุ่ม `gps.*` ที่ P1-F03-T16 ประกาศ (N-7) และแสดง key เป็น fallback เมื่อ `copy.th.json` ยังไม่มี (TL-N06)
  - [ ] test เล่น trace แล้วตรวจว่าตำแหน่งบนแผนที่เปลี่ยนตามลำดับ ผ่าน
  - [ ] เรียก location ผ่าน interface เท่านั้น

#### P1-F02-T11 — เครื่องมือวัด + tile กรุงเทพ + map style (gameplay-programmer, 2–3 วัน)
- **เพิ่มจาก P1-F03-T12 (blocking):** (1) รัน `node node_modules/.pnpm/@maplibre+maplibre-gl-style-spec@26.4.4/node_modules/@maplibre/maplibre-gl-style-spec/dist/gl-style-validate.mjs art/direction/map-style/kw-light.style.json` แนบผล (2) ใน style.ts แทน placeholder ตาม map-style.md หัวข้อ 3 และ throw ถ้ายังเหลือ `kw-placeholder.invalid` (3) addImage `kw-rift-crack` pixelRatio 2 และ `fadeDuration: 0` · ถ้าติดตั้ง `@protomaps/basemaps` 5.7.2 ได้ (ผ่าน tech-lead) ให้เทียบชื่อ source-layer/kind/filter กับ kw-light.style.json แล้วรายงาน art-director
- **แก้ตาม D-031 (orchestrator, 2026-09-23):** client รองรับทั้ง TileJSON (XYZ) และ `pmtiles://` ผ่าน `VITE_TILES_URL` ตัวเดียว · นับ byte ตาม tech note หัวข้อ 11 (custom Source / protocol `kw+https`)
- **(P1-PLAN-SYNC-01)** Deps เพิ่ม P1-X05 (style-spec เป็น root devDependency · ถ้า X05 เปลี่ยนชื่อ option ของ `WebLocationOptions` ให้ย้ายมาใช้ชื่อใหม่ในงานนี้) · source `kw-provinces` และ mask โซนดำโหลดจาก `data/map/playarea-mask.geojson`, `data/map/provinces.geojson` ผ่าน `setData` (D-043) · ถ้า P1-H07 ยังไม่เสร็จใช้ FeatureCollection ว่างที่ path เดิมและไม่ throw (ไม่ใช่ deps เพื่อไม่ยืดเส้นวิกฤต) · `apps/client/.env.example` ค่า `VITE_*` ว่างตาม D-044 (ไฟล์ `.env.example` ที่ root เป็นของ P1-F02-T08)
- Goal: ใช้ build นี้ออกไปเดินวัดจริงได้
- Inputs: `tools/tiles/README.md`, `art/direction/map-style/`, `docs/tech/F02-map-location-spike.md` (เกณฑ์ spike และนิยามการวัด)
- Acceptance:
  - [ ] debug HUD เปิด/ปิดได้หลัง flag (ป้ายภาษาอังกฤษได้, TL-N06): FPS ระหว่าง pan/zoom และโหมดตามตัว (เฉลี่ย, p5), MB ที่โหลดแยก JS / style + glyph / tile นับจาก custom `Source` ของ `pmtiles` + wrapper ของ fetch (Resource Timing เป็นตัวรอง, TL-S07), accuracy (ล่าสุด, median, p90), % แบต (Battery Status API เมื่อมี ไม่มีให้แสดง "จดจากเครื่อง"), ช่วง sample ขาด
  - [ ] export สองแบบตาม tech note (TL-M06, MF-3): `summary` ไม่มีพิกัดเป็นค่าเริ่มต้น · raw trace ต้องกดเลือกเอง ตัดต้นและปลายตามระยะใน config และเวลาเป็น relative ก่อนออกจากเครื่อง · ไม่ส่งพิกัดออกนอกเครื่อง
  - [ ] ใช้ tile กรุงเทพ (fixture ของ P1-F02-T06 ใน test, ไฟล์ใน `tools/tiles/out/` ใน local, URL บน Cloudflare Pages ใน preview ตาม D-008 รวมการเลือกไฟล์ตามพื้นที่จาก manifest ถ้า P1-F02-T06 แบ่งไฟล์ · ทั้งหมดผ่าน `VITE_TILES_URL`) และ style จาก `art/direction/map-style/` · รองรับ maxzoom ที่ลดลงตามงบขนาด tile ด้วย overzoom ถึง 18 · โหลด glyph/sprite จาก path ใน build หรือ host เดียวกับ tile (ไม่พึ่ง CDN ภายนอก) และแนบ screenshot ชื่อถนนไทยที่ zoom 14, 16, 18 (TL-M03)
  - [ ] build production ผ่าน และขนาด bundle ถูกบันทึก

#### P1-F02-T12 — Test plan F02 (qa-tester, 1 วัน)
- Acceptance:
  - [ ] case ครอบ: Mock เล่นทุก synthetic trace, permission denied, accuracy ต่ำ, หน้าจอล็อก/เปลี่ยนแท็บ, เน็ตหลุดระหว่างโหลด tile, build + serve local, CI script
  - [ ] traceability จากเกณฑ์ผ่าน F02 ใน roadmap ไป case · ระบุ case ที่ต้องใช้คนเดินจริง (โยงไป P1-F02-T20)

#### P1-F02-T13 — Black-box trace-replay test (qa-tester, 2 วัน)
- Acceptance:
  - [ ] test ใน `qa/tests/F02/` ใช้ public interface ของ `packages/location` และ client (ไม่แก้ unit test ของ dev) · การพิสูจน์ "จุดขยับบนแผนที่" ใช้ e2e runner ที่ ADR 0001 เลือก กับ fixture tile (TL-S04)
  - [ ] QA trace เพิ่มอย่างน้อย 2 ไฟล์ใน `data/gps-traces/qa/` (เช่น GPS กระโดดกลางทาง, sample ขาดช่วง 2 นาที) ผ่าน `validateTrace` ของ `packages/shared` และตั้งชื่อตาม README
  - [ ] รันผ่านด้วยคำสั่งเดียว บันทึก output

#### P1-F02-T14 — ชุดคู่มือเดินทดสอบภาคสนาม (qa-tester, 1–2 วัน)
- Goal: คนที่ไม่ใช่ dev เดินทดสอบและกรอกผลได้ครบโดยไม่ต้องถามใคร
- Inputs: build จาก P1-F02-T11, `infra/runbooks/preview-setup.md`, `docs/tech/F02-map-location-spike.md` หัวข้อ "เกณฑ์ spike", `product/reviews/F02-spike-criteria.md`, GDD "M1"
- Acceptance:
  - [ ] kit: อุปกรณ์ที่ต้องมี, การเตรียมเครื่อง (ชาร์จเต็ม, ปิด battery saver, จดรุ่นเครื่อง/OS/เบราว์เซอร์), เวลาที่ควรเดิน (กลางวัน แดดจัด), ลำดับขั้นตอนในสวน 30 นาทีและในซอย 30 นาที แบ่งช่วงชัด: จอเปิดตลอดอย่างน้อย 20 นาทีสำหรับตัวเลขหลัก และช่วงเก็บกระเป๋าแยกที่ HUD บันทึกช่วงขาด (TL-N08), วิธีเปิด HUD และ export
  - [ ] form: ช่องกรอก FPS เฉลี่ย/p5, % แบตที่ใช้ต่อ 30 นาที, MB ที่โหลดแยกประเภท, accuracy median/p90, จุดขยับตามจริงไหม (หน่วงกี่วินาที), อ่านจอกลางแดดได้ไหม, ชื่อถนน/สถานที่ภาษาไทยอ่านถูกไหม (วรรณยุกต์ถูกตำแหน่ง, TL-M03), ปัญหาที่เจอ
  - [ ] เกณฑ์ผ่านของแต่ละตัวเลขคัดลอกจาก "เกณฑ์ spike" ที่ P1-F02-T27 ยืนยันแล้วเท่านั้น qa-tester ไม่ตั้งเกณฑ์เอง (PM-M01, TL-M04)
  - [ ] safety briefing: ไม่จ้องจอขณะข้ามถนน, เดินกับเพื่อน, ดื่มน้ำ, หยุดถ้าฝนตกหรือร้อนเกิน
  - [ ] (P1-PLAN-SYNC-01 จาก P1-H06) kit มีขั้นทดสอบกลางแดดของ map style ตาม `art/direction/map-style.md` หัวข้อ 10.2 (จอ S1, S3, S4 ถ่ายด้วยกล้องอีกเครื่อง แปลงขาวดำ) และช่องกรอกผลใน form เพื่อให้ HUMAN P1-F02-T20 ทำในรอบเดินเดียวกัน
  - [ ] ที่เก็บผล (TL-M06, MF-3): commit ได้เฉพาะ `qa/playtest/results/<YYYY-MM-DD>-<park|soi>-<device>.md` + summary CSV ที่ไม่มีพิกัด · raw trace เก็บใน `qa/playtest/results/raw/` (ถูก `.gitignore`) และแปลงเป็น `data/gps-traces/recorded/` ได้เฉพาะเมื่อคนเดินยินยอมเป็นลายลักษณ์อักษร (ข้อความยินยอมอยู่ใน kit)

#### P1-F02-T15 — Tech gate F02 (tech-lead, 1–2 วัน)
- (P1-PLAN-SYNC-01) Deps เพิ่ม P1-H02 (`tools/copy-lint/` อยู่ในขอบเขต hygiene), P1-X04 (vectors ไม่ฝังเลข), P1-X05 (lint/vitest/tsconfig), P1-X07 (pytest ของ coverage อยู่ใน CI) · ทั้งหมดเสร็จก่อนหรือพร้อม P1-F02-T11 จึงไม่ยืดเส้นวิกฤต · `tools/coverage/boundaries/` (P1-H07) ตรวจถ้าเสร็จแล้ว ถ้ายังไม่เสร็จ hygiene ของโฟลเดอร์นี้ตรวจใน P1-CLOSE-QA ไม่ขวาง gate นี้
- Acceptance:
  - [ ] ตรงตาม ADR 0001 และ tech note · ใช้ interface เท่านั้น · ไม่มี magic number และไม่มี secret ใน repo (แนบผล gitleaks ของ P1-F02-T07 บน history ทั้งหมด และผล guard ไฟล์ต้องห้าม · repo public, D-002) · ไม่มีบริการหรือ config ใดที่ต้องผูกบัตร และไม่มีชื่อ env ที่ผูกกับ R2 (D-001)
  - [ ] รัน lint, typecheck, test, build เองและแนบ output
  - [ ] ตรวจการจัดการ error/offline/permission และไม่มีพิกัดใน log · verdict PASS / NEEDS_CHANGES พร้อมไฟล์และบรรทัด
  - [ ] ขอบเขต hygiene เท่านั้นของ `tools/coverage/`, `tools/traces/`, `tools/sim/` (TL-S03): pin dependency, ไฟล์ดิบไม่เข้า git, ไม่มี secret, อ่านค่าจาก `config/`, test รันจาก root script และอยู่ใน CI, `apps/*` `packages/*` ไม่ import `tools/*` · finding ของ hygiene ไม่ขวาง Go/No-go ของ F01 และ QA gate ของ F03
  - [ ] ADR 0002 สอดคล้องกับ ADR 0001 และ non-negotiables (เป็นเอกสารทิศทางของ backend-programmer ตาม E14)
  - [ ] ผลนี้ PASS เป็นเงื่อนไขก่อน HUMAN P1-F02-T19 deploy preview (TL-S01)

#### P1-F02-T16 — QA gate F02 (qa-tester, 1–2 วัน)
- Acceptance:
  - [ ] ทุก case ใน test plan มีผล · Mock trace เล่นซ้ำได้และจุดขยับบนแผนที่ (หลักฐาน test output หรือ screenshot)
  - [ ] build ที่ deploy ได้ใน local (หรือ local preview) ยืนยันแล้ว · คู่มือเดินทดสอบลองทำตามได้ครบในเครื่อง
  - [ ] `qa/bugs.md` อัปเดต · verdict PASS / NEEDS_CHANGES

#### P1-F02-T17 — HUMAN: สมัคร Cloudflare Free (ไม่ผูกบัตร) + Pages project + API token (D-008)
- **หมายเหตุจาก P1-F02-T08 (orchestrator):** คนสร้างเฉพาะ Pages project `keep-walking-preview` · project แผนที่ `keep-walking-map` ถูกสร้างอัตโนมัติตอน deploy ครั้งแรกด้วย token สิทธิ์เดียวกัน (Account > Cloudflare Pages > Edit) · ขั้นตอนเต็มใน `infra/runbooks/preview-setup.md`
- ปลดล็อก: P1-F02-T19 (publish tile + deploy preview) · ไม่มี deps: host ตัดสินแล้วใน D-008 และ repo `https://github.com/pongponWorkspace/keep-walking` มีอยู่แล้ว (D-007) · เริ่มได้ทันทีตั้งแต่ W1 · ต้องเสร็จก่อน W7
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001): ถ้าหน้าใดถามบัตร ช่องทางชำระเงิน หรือชวนอัปเกรด/เปิด trial (รวม Workers Paid และ R2) ให้**หยุดทันที** ไม่กรอก แล้วแจ้ง orchestrator ว่าหยุดที่หน้าไหน (ชื่อหน้าและข้อความที่เห็น)
- ขั้นตอน:
  1. สมัครที่ https://dash.cloudflare.com/sign-up ด้วยอีเมลของโปรเจกต์ ยืนยันอีเมล แล้วเปิด 2FA (My Profile → Authentication) · ไม่ต้องเพิ่มช่องทางชำระเงินใด
  2. จด Account ID (เมนู Account home หรือหน้า Workers & Pages แถบขวา) · Account ID ไม่ใช่ความลับร้ายแรงแต่ยังไม่ต้อง commit
  3. สร้าง Pages project: Workers & Pages → Create → แท็บ Pages → "Upload assets" (Direct Upload) · ตั้งชื่อ project `keep-walking-preview` · อัปโหลดโฟลเดอร์ที่มีไฟล์ `index.html` เปล่าหนึ่งไฟล์เพื่อสร้าง project (deploy จริงทำใน P1-F02-T19) · จด URL `https://keep-walking-preview.pages.dev` · ถ้าชื่อซ้ำให้ใช้ชื่ออื่นและแจ้ง orchestrator
  4. สร้าง API token: My Profile → API Tokens → Create Token → Create Custom Token · สิทธิ์: Account → Cloudflare Pages → Edit (เพิ่ม Account → Workers Scripts → Edit และ Account → D1 → Edit **เฉพาะเมื่อ** `infra/runbooks/preview-setup.md` ระบุ) · Account Resources: เฉพาะบัญชีนี้ · ตั้ง TTL ได้ถ้าต้องการ · คัดลอก token ครั้งเดียวที่แสดง
  5. เก็บค่า: GitHub repo → Settings → Secrets and variables → Actions → New repository secret สองตัวชื่อ `CLOUDFLARE_ACCOUNT_ID` และ `CLOUDFLARE_API_TOKEN` · ถ้าจะรันคำสั่งในเครื่องด้วย ให้ใส่ชื่อเดียวกันใน `/Users/pongpon/Game/.env.local` **หลัง** P1-F02-T01 เสร็จ (มี `.gitignore` แล้ว) แล้วรัน `git check-ignore -v .env.local` ต้องเห็นว่าถูก ignore · ถ้า T01 ยังไม่เสร็จ ข้ามส่วนนี้ไปก่อน (GitHub secret พอสำหรับ workflow)
  6. ห้ามวาง token ใน chat, board, issue หรือไฟล์ที่ commit (repo เป็น public) · ตอบ orchestrator แค่: "เสร็จ", ชื่อ project และ URL `*.pages.dev`, และยืนยันหนึ่งประโยคว่าไม่มีหน้าใดถามบัตรและหน้า Billing ไม่มีช่องทางชำระเงิน

#### P1-F02-T18 — HUMAN: สร้าง GitHub repo และ push ครั้งแรก
- ปลดล็อก: ยืนยันว่า workflow รันบน GitHub ได้ตั้งแต่ต้น · หลักฐานของ exit item "test ผ่านใน CI" มาจาก P1-F02-T26 (push รอบสุดท้าย, TL-S02)
- คำตอบคน: CI = GitHub Actions บน repo **public** (D-002) · ทุกไฟล์ที่ push จะเปิดเผยต่อสาธารณะทันที
- **สถานะ 2026-09-23:** คนสร้าง repo แล้วที่ `https://github.com/pongponWorkspace/keep-walking` (public, ยังว่าง ไม่มี branch · orchestrator ตรวจด้วย `git ls-remote`) → ขั้น 2 เสร็จแล้ว เหลือขั้น 1, 3–6 · P1-F02-T01 ใส่ remote นี้ให้เลย (`git remote add origin`) แต่ห้าม push
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001): ใช้ GitHub Free เท่านั้น ไม่เปิด GitHub Pro, Team, Copilot หรือ Advanced Security แบบเสียเงิน · ถ้าหน้าใดถามบัตรให้หยุดและแจ้ง orchestrator
- ขั้นตอน:
  1. ก่อนสร้าง repo อ่านทวนว่ายอมรับให้เนื้อหาต่อไปนี้เปิดเผยได้: GDD, `studio/` (roadmap, board, decision log, คำถาม), `.claude/agents/`, CLAUDE.md, `design/` · ถ้ามีไฟล์ใดไม่อยากเปิดเผย แจ้ง orchestrator ก่อน push และหยุดรอ
  2. สร้าง repository ใหม่บน GitHub เลือก **Public** (ไม่ต้องใส่ README, .gitignore หรือ license · การเลือก license ตัดสินภายหลัง)
  3. ใน repo → Settings → Code security (หรือ Advanced Security) → เปิด **Secret scanning** และ **Push protection** (ฟรีสำหรับ repo public) · ถ้าเมนูใดต้องจ่ายเงิน ข้าม
  4. ในเทอร์มินัลที่ `/Users/pongpon/Game`: รัน `git status` ดูว่าไม่มี `.env.local` หรือไฟล์ใน `qa/playtest/results/raw/` ถูก track แล้วรัน `git remote -v` ดูว่า origin คือ `https://github.com/pongponWorkspace/keep-walking` (P1-F02-T01 ตั้งไว้ให้แล้ว) และ `git push -u origin main` (หรือชื่อ branch ที่ ADR 0001 ใช้)
  5. เปิดแท็บ Actions ดูว่า workflow รันและเป็นสีเขียว รวม job secret scan · CI ของ Phase 1 ไม่ต้องใช้ secret
  6. ส่ง URL ของ run ที่ผ่านให้ orchestrator (ถ้าแดง ส่ง log บรรทัดที่ fail) · ถ้า push protection บล็อก push ห้ามกด bypass ให้ส่งข้อความที่ GitHub แสดงให้ orchestrator

#### P1-F02-T19 — HUMAN: publish tile และ deploy preview บน host ฟรี
- ปลดล็อก: P1-F02-T20 (เดินทดสอบ)
- เริ่มได้เมื่อ: P1-F02-T15 (tech gate) PASS แล้ว เพื่อไม่ deploy build ที่อาจมี secret หรือ log พิกัดหลุดขึ้น URL สาธารณะ (TL-S01)
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001): ถ้าขั้นใดแจ้งว่าเกินโควตาฟรีหรือขอให้อัปเกรด ให้หยุดและส่งข้อความนั้นให้ orchestrator ห้ามอัปเกรด
- ขั้นตอน (รายละเอียดเต็มใน `infra/runbooks/preview-setup.md`):
  0. (P1-PLAN-SYNC-01) ตรวจว่า P1-F02-T18 เสร็จแล้ว (push ครั้งแรกผ่าน) แล้วรอ orchestrator แจ้งว่า commit ของ wave ที่มี P1-F02-T08, T11, T15 แล้ว · ในเทอร์มินัลที่ `/Users/pongpon/Game`: `git status` ตรวจว่าไม่มี `.env.local` หรือไฟล์ใน `raw/` ถูก track แล้ว `git push` (workflow deploy-preview รันจากโค้ดบน GitHub) · ถ้า push protection บล็อก ห้าม bypass ให้ส่งข้อความให้ orchestrator
  1. ตรวจว่า P1-F02-T17 เสร็จ (มี Pages project และ secret `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` ใน repo แล้ว)
  2. repo → แท็บ Actions → workflow "deploy-preview" → Run workflow แบบ dry-run ก่อน (ตามตัวเลือกใน runbook) แล้วรันจริง · workflow publish tile + glyph/sprite และ deploy client ขึ้น Cloudflare Pages (D-008) · ใช้ทางสำรอง GitHub Pages เฉพาะเมื่อ runbook หรือ orchestrator สั่ง (เช่น tile ผ่านเพดาน Cloudflare ไม่ได้)
  3. จด preview URL จากผลของ workflow หรือคำสั่ง
  4. รันคำสั่ง `curl` ใน runbook ตรวจ URL ของ tile ตาม D-031: tile แบบ XYZ บน Cloudflare Pages ต้องได้ `200` พร้อม content-type, CORS และ Timing-Allow-Origin · ตรวจ `206` เฉพาะเมื่อใช้ทางสำรอง PMTiles บน GitHub Pages · จำนวนไฟล์และขนาดตรงกับ size report (แก้ใน P1-PLAN-SYNC-01 จากเดิมที่ให้ตรวจ `206` เสมอ)
  5. เปิด URL บนมือถือจริง ตรวจว่าแผนที่กรุงเทพขึ้น ชื่อถนนไทยอ่านได้ และ HUD เปิดได้ · ส่ง URL ให้ orchestrator

#### P1-F02-T20 — HUMAN: เดินทดสอบกลางแดด 30 นาทีในสวน + 30 นาทีในซอย
- ปลดล็อก: P1-F02-T21 (สรุปผล spike)
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001): ใช้ preview URL จาก P1-F02-T19 เท่านั้น ไม่ต้องสมัครบริการหรือแอปเสียเงินใด · raw trace ห้ามวางใน repo นอก `qa/playtest/results/raw/` เพราะ repo เป็น public (D-002)
- ขั้นตอน:
  1. อ่าน `qa/playtest/safety-briefing.md` และ `qa/playtest/field-walk-kit.md`
  2. ชาร์จมือถือเต็ม ปิด battery saver จดรุ่นเครื่อง OS เบราว์เซอร์ และ % แบตเริ่มต้น
  3. ช่วงกลางวันแดดจัด (ประมาณ 10:00–15:00) ไปสวนสาธารณะที่มีคนเดิน เปิด preview URL อนุญาต location เปิด HUD แล้วเดินต่อเนื่อง 30 นาที: จอเปิดตลอดอย่างน้อย 20 นาทีแรก แล้วเก็บมือถือในกระเป๋าช่วงที่เหลือตามที่ kit กำหนด
  4. export แบบ `summary` (ไม่มีพิกัด) จด % แบตที่ใช้ แล้วกรอก `qa/playtest/field-walk-form.md`
  5. raw trace (มีพิกัด) เป็นทางเลือก: อ่านข้อความยินยอมใน kit ก่อน ถ้ายินยอมให้ export แล้ววางไฟล์ใน `qa/playtest/results/raw/` เท่านั้น (ไม่ถูก commit) และตอบ orchestrator ว่ายินยอมให้แปลงเป็น recorded trace (P1-F02-T24) หรือไม่ · ถ้าไม่ยินยอม ข้ามขั้นนี้
  6. ทำซ้ำในซอยแคบที่มีตึกสองข้าง 30 นาที
  7. บันทึกผลเป็น `qa/playtest/results/<YYYY-MM-DD>-park-<device>.md` และ `...-soi-<device>.md` พร้อม summary CSV · ต้องเดินทั้งบน Android (Chrome) และ iOS (Safari) ตาม D-003 (เดินพร้อมกันสองเครื่องในรอบเดียวได้) · iOS จด % แบตเองต้นและท้ายรอบ

#### P1-F02-T21 — สรุปผล spike + คำแนะนำ Go / No-go (tech-lead, 1 วัน)
- Acceptance:
  - [ ] ตารางผลวัดทุกเครื่องและทุกสถานที่เทียบ "เกณฑ์ spike" ที่ P1-F02-T03 ตั้งและ P1-F02-T27 ยืนยันเท่านั้น ไม่ปรับเกณฑ์หลังเห็นผล (TL-M04)
  - [ ] คอลัมน์ผลต่อประสบการณ์ผู้เล่นตามเกณฑ์ที่ product-manager ยืนยัน และส่งร่างคำแนะนำให้ product-manager อ่านเป็น handoff ก่อนส่ง HUMAN (PM-S06 แบบย่อ)
  - [ ] ความเสี่ยงที่พบ (เช่น accuracy ในซอย, วรรณยุกต์ไทยบนแผนที่) และผลต่อ design (Grace 3 นาที, jitter filter, movement gate 50 ม.) · attribution ไม่บัง UI บนจอมือถือ (TL-S13) · ข้อจำกัดของ host ฟรีที่ใช้ (เพดานขนาดไฟล์, bandwidth, Cache-Control ที่ตั้งเองได้หรือไม่, maxzoom ที่ลดลง) และผลต่อตัวเลขที่วัด · ทางไป production = PMTiles บน R2 ตาม GDD พร้อม custom domain (HUMAN, DNS) ก่อน closed beta ซึ่งต้องมี decision อนุมัติค่าใช้จ่ายแยก (D-001, TL-N07)
  - [ ] คำแนะนำ Go / Go พร้อมเงื่อนไข / No-go พร้อมเหตุผลเป็นตัวเลข · ถ้า No-go ระบุทางเลือกที่ต้องรื้อ

#### P1-F02-T22 — HUMAN: ยืนยัน backend stack — CUT
- สถานะ: CUT · เหตุผล: ตัดสินแล้วใน D-008 (คนมอบให้ orchestrator ตัดสิน) · ADR 0002 (P1-F02-T02) เปลี่ยนเป็นการยืนยัน D-008 · ไม่มีงานใดขึ้นกับงานนี้ และไม่ยกไป Phase 2
- ถ้า P1-F02-T02 พบว่าชิ้นใดของ stack ไม่ฟรีหรือต้องผูกบัตร คำถามนั้นเป็นคำถาม HUMAN ใหม่ผ่าน report ของ T02 ไม่เปิดงานนี้ซ้ำ

#### P1-F02-T23 — HUMAN: ยืนยันผล Go / No-go ของ map spike
- ปลดล็อก: exit item "ผล Go / No-go F02" และการปิด Phase 1
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · ถ้าผลเป็น "Go พร้อมเงื่อนไข" ที่ต้องใช้บริการเสียเงิน (เช่น ย้าย tile ไป R2) ให้ตอบเป็น decision อนุมัติค่าใช้จ่ายแยก
- ขั้นตอน: อ่าน `docs/tech/F02-spike-results.md`, `product/reviews/F02-spike-criteria.md` และ `qa/reports/F02-qa-gate.md` → ตอบ (ก) Go (ข) Go พร้อมเงื่อนไข ระบุ (ค) No-go ให้ producer เสนอแผนรื้อ

#### P1-F02-T24 — Recorded trace จากการเดินจริง (location-engineer, 1 วัน) — ใหม่ (TL-S10)
- Goal: ได้ trace จริงชุดแรกให้ Mock และการจูน movement gate ใน Phase 2 โดยไม่เก็บข้อมูลที่ระบุตัวคนเดิน
- Inputs: raw trace ใน `qa/playtest/results/raw/` ที่คนเดินยินยอมใน P1-F02-T20, `docs/tech/gps-trace-format.md`, `data/gps-traces/README.md`
- ไม่อยู่บน critical path ของ P1-F02-T21 · ถ้าคนเดินไม่ยินยอม orchestrator เปลี่ยนเป็น CUT พร้อมเหตุผล "ไม่มีความยินยอม"
- Acceptance:
  - [ ] ใช้เฉพาะไฟล์ที่มีคำยืนยันความยินยอมบันทึกไว้ (orchestrator แนบคำตอบใน brief)
  - [ ] ตัดต้นและปลายอย่างน้อย 200 ม. (ค่าจาก config), ปัดพิกัดตาม README, เวลาเป็น relative, ไม่มีรุ่นเครื่องหรือข้อมูลที่ระบุตัวตน
  - [ ] ทุกไฟล์ใน `data/gps-traces/recorded/` ผ่าน `validateTrace` · README เพิ่มหัวข้อ recorded (ที่มา, สภาพ, สิ่งที่คาดว่าจะเกิด)
  - [ ] ไม่แก้หรือย้ายไฟล์ใน `raw/` และไม่ commit ไฟล์ raw

#### P1-F02-T25 — HUMAN (สำรอง): ดาวน์โหลดไฟล์ใหญ่แทน agent — ใหม่ (TL-S11)
- **สถานะ: CUT (P1-CLOSE-PM, 2026-09-24)** · เหตุผล: ตลอด run ไม่มีงานใดรายงานว่าดาวน์โหลดไม่ได้ (A-P1-PLAN-02-1 เป็นจริง) และ P1-CLOSE-QA ยืนยันว่า agent ดาวน์โหลด go-pmtiles พร้อม checksum ได้เอง · ไม่มีงานใดขึ้นกับงานนี้ ไม่ยกไป Phase 2 · ถ้าวันหน้า agent ดาวน์โหลดไม่ได้ ให้เปิดงาน HUMAN ใหม่ใน phase นั้น
- เปิดเมื่อ: agent (P1-F01-T05, P1-F02-T06, P1-F02-T13 หรืองานใดก็ได้) รายงานว่าดาวน์โหลดไม่ได้ · ถ้าไม่มีใครต้องใช้จนปิด phase producer เปลี่ยนเป็น CUT
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001): ดาวน์โหลดเฉพาะแหล่งฟรี · ห้าม commit ไฟล์ที่ดาวน์โหลด (repo public, D-002 · `.gitignore` ครอบแล้ว ตรวจด้วย `git status` ว่าไม่ขึ้น)
- ขั้นตอน:
  1. เปิด README ที่ orchestrator ระบุ (เช่น `tools/coverage/METHOD.md` หรือ `tools/tiles/README.md`) หาตาราง "ไฟล์ที่ต้องดาวน์โหลด"
  2. ดาวน์โหลดแต่ละไฟล์จาก URL ในตาราง (ไม่ต้องสมัครบัญชีหรือใช้ credential ถ้าต้องใช้ให้หยุดและแจ้ง orchestrator)
  3. ตรวจ checksum: ในเทอร์มินัลรัน `shasum -a 256 <ไฟล์>` แล้วเทียบกับค่าในตาราง
  4. วางไฟล์ที่ path ในตาราง (อยู่นอก git ตาม `.gitignore`) แล้วตอบ orchestrator ว่า "วางแล้ว" พร้อมชื่อไฟล์

#### P1-F02-T26 — HUMAN: push รอบสุดท้ายและยืนยัน CI เขียว — ใหม่ (TL-S02)
- ปลดล็อก: exit item E5 "test ผ่านใน CI" และ E20 (ไม่มี secret ใน repo public + ไม่มีบริการใดผูกบัตร)
- **ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน** (D-001)
- ขั้นตอน:
  1. รอ orchestrator แจ้งว่า wave ล่าสุด commit แล้ว (หลัง P1-F02-T16 QA gate F02)
  2. ในเทอร์มินัลที่ `/Users/pongpon/Game`: `git status` ตรวจว่าไม่มี `.env.local` หรือไฟล์ใน `raw/` ถูก track แล้ว `git push` · ถ้า push protection บล็อก ห้าม bypass ให้ส่งข้อความให้ orchestrator
  3. เปิดแท็บ Actions รอ workflow ของ commit ล่าสุดจบ (รวม job secret scan) · ส่ง URL ของ run สีเขียวให้ orchestrator (ถ้าแดง ส่ง log บรรทัดที่ fail)
  4. ยืนยันกับ orchestrator หนึ่งประโยค: ทุกบัญชีที่ใช้ใน phase นี้ (GitHub และ Cloudflare) ไม่มีช่องทางชำระเงินผูกอยู่ (ดูได้ที่หน้า Billing ของแต่ละบัญชี)

#### P1-F02-T27 — ร่วมยืนยันเกณฑ์ spike (product-manager, 0.5–1 วัน) — ใหม่ (PM-M01)
- Goal: ให้เกณฑ์ Go/No-go ของ M1 สะท้อนว่าเกมเล่นได้จริงในมือผู้เล่น ไม่ใช่แค่เกณฑ์วิศวกรรม และตั้งก่อนเริ่ม build หน้าวัด
- Inputs: `docs/tech/F02-map-location-spike.md` หัวข้อ "เกณฑ์ spike", GDD "M1", "10 นาทีแรกของคนใหม่", "Movement gate"
- Acceptance:
  - [ ] ทุกเกณฑ์ใน tech note มีความเห็น: ยอมรับ / เสนอค่าใหม่ พร้อมเหตุผลเชิงผู้เล่น (เช่น แบตต่อ 30 นาทีที่คนยังยอมเปิดจอ, data เริ่มต้นบนเน็ตมือถือทั่วไป)
  - [ ] ถ้าเสนอค่าใหม่ ส่ง handoff ถึง tech-lead (blocking: yes) · orchestrator เปิดงานแก้ tech note ก่อน P1-F02-T14
  - [ ] ระบุว่าตัวเลขใดเป็นเกณฑ์ No-go เด็ดขาด และตัวใดเป็น "Go พร้อมเงื่อนไข"
  - [ ] verdict PASS (ยืนยันเกณฑ์) / NEEDS_CHANGES

### F03 — Game Bible และทิศทางทุกสาย

Lead: game-director · ร่วม: narrative-designer, systems-designer, level-designer, art-director, artist-2d, vfx-animator, uiux-designer, sound-designer, product-manager, liveops-operator · Gate: Content (copy), Content (visual), QA, Design A, Design B · งานคน: P1-F03-T26, P1-F03-T28

#### เอกสารทิศทางราย role และ gate ที่ผ่าน (ใช้ตรวจ E14, MF-5)
| Role | เอกสารทิศทาง | Gate ที่ผ่าน |
| --- | --- | --- |
| game-director | `design/pillars.md` | HUMAN P1-F03-T26 (ยืนยันคู่กับ world) + design gate A ตรวจความสอดคล้อง |
| narrative-designer | `design/narrative/world.md`, `style-guide.md` | copy gate P1-F03-T21 + design gate A + HUMAN P1-F03-T26 |
| systems-designer | `design/systems/balance-model.md`, `sim-report.md` | QA gate P1-F03-T23 + design gate B |
| level-designer | `dungeon-rules.md`, `launch-criteria.md`, `presets.md` | design gate F01 (P1-F01-T09) + design gate A |
| art-director | style guide, icon grammar, avatar spec, map style | visual gate P1-F03-T22 + design gate B |
| artist-2d | style tile, avatar placeholder (ทำตามทิศทางของ art-director) | visual gate P1-F03-T22 |
| vfx-animator | `art/vfx/specs/motion-direction.md` | visual gate P1-F03-T22 + design gate B |
| uiux-designer | IA, flow, wireframe, tokens, components | copy gate + visual gate + design gate A (อนุมัติ core-loop flow) |
| sound-designer | `audio/direction.md`, `cue-list.md` | design gate A |
| product-manager | PRD F01, metrics, telemetry, เกณฑ์ spike | product gate F01 + design gate B |
| liveops-operator | `ops/calendar.md`, `tuning-playbook.md` | design gate A |
| tech-lead, gameplay-programmer, location-engineer, devops-engineer | ADR 0001, tech note F02 | tech gate P1-F02-T15 |
| backend-programmer (ไม่มีงานใน Phase 1) | ADR 0001 + ADR 0002 (ยืนยัน D-008) | tech gate P1-F02-T15 · stack ตัดสินแล้วใน D-008 (P1-F02-T22 CUT) |
| qa-tester | test plan F01/F02, field-walk kit | QA gate ของแต่ละ feature |
| producer | board, risk register | นอกขอบเขต E14 |

#### P1-F03-T01 — Design pillars และดัชนี spec (game-director, 1–2 วัน)
- Inputs: GDD "ภาพรวมและหลักการออกแบบ", "10 นาทีแรกของคนใหม่", "หลักการที่ห้ามละเมิด", "สิ่งที่ตัดออกจาก v1 โดยตั้งใจ", roadmap
- Acceptance:
  - [ ] pillars 3–5 ข้อ พร้อมหลักการตัดสิน 5 ข้อของ GDD เรียงตามลำดับ
  - [ ] non-negotiables 7 ข้อตาม CLAUDE.md พร้อมอ้างหัวข้อ GDD · กฎคู่ auto-retreat + movement gate เป็น non-negotiable ที่ระบุชื่อ (SF-5)
  - [ ] รายการสิ่งที่ห้ามสอนใน 10 นาทีแรก และเงื่อนไขปลดของแต่ละอย่างอ้างเป็น `config: unlocks.<system>` ไม่เขียนเลข (SF-6)
  - [ ] หัวข้อ "สถานะที่บ้าน": นิยาม "ไกล" และ "นอกพื้นที่" (อ้าง `config: unlocks.home.farDungeonThreshold_m`), สิ่งที่ผู้เล่นทำได้ และสิ่งที่ห้าม (ห้ามให้รางวัลโดยไม่เดิน) (SF-5)
  - [ ] ดัชนี feature spec F01–F24 (ชื่อ, phase, path ที่จะอยู่, สถานะ) และตารางรายการ "ที่ยังต้องตัดสินใจ" ของ GDD ต่อข้อ: ตอบแล้วในหัวข้อใด / ยังเปิด / phase ที่ต้องตอบ พร้อมเสนอ decision authority HUMAN ว่ารายการล้าสมัย (ส่งเข้า P1-F03-T28)

#### P1-F03-T02 — World bible ฉบับเสนอ (narrative-designer, 2 วัน)
- Inputs: GDD "World building" ทั้งหมด, "โทนและภาษาในเกม"
- Acceptance:
  - [ ] ธีม, ผู้เล่นคือใคร (ไม่เกินที่ GDD กำหนด), ทำไมรอยแยกเกิด, raid boss, ทำไมวันเสาร์, tagline
  - [ ] แนวตั้งชื่อโซน (ชื่อจริง + คำขยาย) พร้อมตัวอย่าง 10 ชื่อ และกฎเลี่ยงศาสนา การเมือง แบรนด์จริง
  - [ ] ทุกจุดที่ต้องให้คนยืนยันติดธง `[HUMAN]` และสรุปรวมไว้ต้นไฟล์ (ใช้ใน P1-F03-T26)
  - [ ] ไม่มีคำต้องห้ามตามกฎข้อ 1

#### P1-F03-T03 — คู่มือ copy (narrative-designer, 1 วัน)
- Acceptance:
  - [ ] กฎ 6 ข้อพร้อมตัวอย่างผ่าน/ไม่ผ่านอย่างน้อยข้อละ 2 คู่ (ใช้สามจังหวะ HP ต่ำ / auto-retreat / ตาย จาก GDD เป็นต้นแบบ)
  - [ ] รายการคำทับศัพท์ที่ใช้ได้ และคำต้องห้าม (รวมคำหยาบที่ห้ามในข้อความระบบ)
  - [ ] checklist ตรวจที่ทำเป็น script ได้ (คำต้องห้าม, ความยาวไม่เกิน 2 บรรทัด) และที่ต้องใช้คนอ่าน

#### P1-F03-T04 — ชุดชื่อเริ่มต้น (narrative-designer, 1–2 วัน)
- Acceptance:
  - [ ] `names.th.json` มีกลุ่ม: คำขยายโซน, มอนสเตอร์ (อย่างน้อย 12), วัตถุดิบ 4 ชนิดตาม GDD (ผงธาตุ แก่นธาตุ หินรอยแยก แกนบอส), ยา 4 ขนาด, บอสตัวอย่าง 3 ตัว
  - [ ] ทุกชื่อมี id คงที่ภาษาอังกฤษ และ JSON valid
  - [ ] ไม่มีชื่อศาสนา การเมือง แบรนด์จริง

#### P1-F03-T05 — Copy bank ของ core loop (narrative-designer, 2–3 วัน)
- Inputs: `design/ux/flows/F03-core-loop.md` (รายการ key), `design/narrative/style-guide.md`
- Acceptance:
  - [ ] ครบทุก key ที่ flow กำหนด: onboarding นาที 0–10, dungeon ใกล้/ไกล/นอกพื้นที่, confirm เข้า, tick และ movement gate, สรุป run, HP ต่ำ / auto-retreat / ตาย, สถานะ GPS (ปิด, denied, accuracy ต่ำ, offline)
  - [ ] สามจังหวะ HP ต่ำ / auto-retreat / ตาย ใช้ต้นแบบจาก GDD
  - [ ] ทุก string ไม่เกิน 2 บรรทัด ไม่มีคำต้องห้าม (ผล script checklist แนบใน report)
  - [ ] key กลุ่ม `onboarding.*` ผ่าน script ตรวจคำของระบบต้องห้ามทั้ง 8 หมวดใน 10 นาทีแรก (รายการคำจาก style guide) (SF-11)
  - [ ] ครอบ key ของ consent location, จุดตรวจอายุ 15+, auto-retreat default และ tick ที่ไม่ผ่าน movement gate ตาม flow (MF-1, MF-2)
  - [ ] key ใช้รูปแบบ `<area>.<name>` และ JSON valid

#### P1-F03-T06 — Balance model + config ชุดแรก (systems-designer, 2–3 วัน)
- Inputs: GDD "Class และ Party", "Core loop ใน Dungeon", "HP การตาย และการฟื้นฟู", "Progression > ตัวเลขตั้งต้น", "Economy", "การกำหนด dungeon"
- Acceptance:
  - [ ] `balance-model.md` เขียนทุกสูตรพร้อมอ้างหัวข้อ GDD: buff stacking + P, damage + monsterATK, exp curve + expPerTick + ตัวคูณ, stat, gearStat, drop + ตัวคูณ, ราคา NPC และยา, ภาษีขั้นบันได, ค่าเปลี่ยน class
  - [ ] config แยกไฟล์ใน `config/balance/`: `classes.json`, `combat.json`, `progression.json`, `equipment.json`, `enhance.json`, `drops.json`, `economy.json`, `dungeons.json` (พื้นที่ 3,000–150,000 ตร.ม., Grace 3 นาที, Suspended 15 นาที, movement gate 50 ม. ต่อ 5 นาที, auto-retreat 25%, แจ้ง HP 30%), `unlocks.json` (เงื่อนไขปลดต่อระบบ, `home.far_dungeon_threshold_m` · ค่าที่ GDD ไม่ระบุติดธง assumption, SF-6) · ทุกค่ามี field อ้างหัวข้อ GDD
  - [ ] รูปแบบ config ขั้นต่ำ: key แบบ camelCase, หน่วยอยู่ในชื่อ key (`_m`, `_s`, `_pct`), ค่าเป็นตัวเลขตรง, แหล่ง GDD อยู่ใน `_source` ข้างเคียง (TL-N02) · `enhance.json` ผลล้มเหลวมีแค่ลดระดับตาม GDD และสะสมความล้มเหลว ไม่มีสถานะแตก (N-5)
  - [ ] ตรวจกฎ base/cap ทุก role พร้อมตารางส่วนเพิ่มคนที่ 1–4 ต่อ role ที่เลเวล 25 และระบุ Support (25/50 = 0.50) เป็นข้อยกเว้นโดยเจตนาตาม D-004 (ไม่ต้องเสนอ decision ซ้ำ)
  - [ ] JSON valid ทุกไฟล์

#### P1-F03-T07 — Simulator แกนสูตร + golden test vectors (systems-designer, 2–3 วัน)
- Inputs: `design/systems/balance-model.md`, `config/balance/*.json`, ADR 0001 (ภาษาของ `tools/sim/`)
- Acceptance:
  - [ ] simulator อ่านค่าจาก `config/balance/` เท่านั้น
  - [ ] buff stacking: Tanker เลเวล 25 จำนวน 1–4 คน = 21.7 / 33.0 / 38.8 / 41.8% · ค่าต่อ 1 คนเลเวล 25: Ranged และ Magic 23.2%, Support 32.3% · Tanker เลเวล 50 หนึ่งคน = Tanker เลเวล 1 สองคน
  - [ ] exp: tick ต่อเลเวลที่ L = 10/20/30/45/60 = 10/16/22/29/35 · รวมเลเวล 1–60 ราว 1,240 tick / 103 ชม. · เลเวล 30 ราว 32 ชม.
  - [ ] gear: ตาราง tier 1–5 ที่ +0/+10/+15 ตรง GDD (เช่น tier 5 = 285 / 513 / 627) · stat สุดขั้วเลเวล 60 (ATK 740, DEF 560 ลด damage 65%, HP 27,300)
  - [ ] damage/เวลาอยู่รอด: เลเวลตรงโซนไม่ใช้ยาราว 45 นาที, มี Tanker เลเวล 25 ราว 55 นาที (ระบุสมมติฐาน build และโอกาสโดนตีใน 45–75 วินาที) · รายงานทั้งเวลาถึง auto-retreat 25% และถึง HP 0 ใช้ค่าที่ตรงตาราง GDD เป็น vector · ถ้าเวลาถึง auto-retreat สั้นกว่า 45 นาทีเกินราว 20% เสนอ decision authority HUMAN (SF-4)
  - [ ] economy: อัตราส่วนรายได้ต่อค่ายาเทียบกับ config key `economy.incomeToPotionRatio` {target 2.5–3, tolerance ที่ยอม 2.45} ตาม D-005 · ค่ายา 600 ต้องคำนวณได้จาก damage model ไม่ใช่ค่าคงที่
  - [ ] vectors ใน `design/systems/test-vectors/{buff-stacking,exp-curve,gear,damage}.json` (input, expected, tolerance, GDD source) และ test ของ simulator รันผ่าน

#### P1-F03-T08 — Simulator drop + economy + party + sim report (systems-designer, 2–3 วัน)
- Acceptance:
  - [ ] drop: อัตราต่อ tick และตัวคูณ Ranged / ไม่มี Ranged / dungeon เล็ก / trust ต่ำ · ความถี่ Epic และ Legendary ของคน 40 นาทีต่อวันและ 3 ชม. ต่อวันเทียบ GDD
  - [ ] economy: รายได้ราว 1,470 gold/ชม. · ค่ายาต่อชั่วโมงคำนวณจาก damage model ของ T07 × ความถี่โดนตี × ขนาดยาที่ใช้ × ราคายาใน config (ไม่รับ 600 เป็น input) พร้อมสมมติฐาน (เลเวลตรงโซน, มี/ไม่มี Tanker, ขนาดยา) แล้วเทียบกับ 600 ของ GDD (SF-3) · รายงานอัตราส่วนเทียบ config key `economy.incomeToPotionRatio` (ต่ำสุด 2.45, เป้า 2.5–3) ตาม D-005 · เสนอ decision authority HUMAN เฉพาะเมื่อผลอยู่นอกช่วงนั้น หรือค่ายาที่คำนวณได้ต่างจาก 600 จนอัตราส่วนหลุดช่วง · ไม่ปรับค่าเอง
  - [ ] party ครบ role ได้รางวัลต่อหัว 1.8–2.2 เท่าของคนเดียว (หรือรายงานตัวเลขจริงถ้าไม่ถึง) · รันภายใต้ Support 25/50 (ค่า GDD, D-004)
  - [ ] vectors `drops.json`, `economy.json`, `party.json` · test ผ่าน
  - [ ] `sim-report.md` ตารางเทียบ GDD ทุกค่า (ตรง / ต่าง / เหตุผล) และคำสั่งรันซ้ำ

#### P1-F03-T09 — Dungeon preset (level-designer, 1–2 วัน)
- Inputs: `design/levels/dungeon-rules.md`, `config/balance/drops.json`, `config/balance/dungeons.json`, GDD "การกำหนด dungeon" · `data/coverage/district-counts.csv` และ `design/levels/coverage-report.md` ถ้ามี (optional)
- Acceptance:
  - [ ] 3 preset: สวนใหญ่ / ตลาด / สวนหย่อม · ช่วงขนาด ตัวคูณ และ drop table อ้าง key ใน `config/balance/` ทั้งหมด · `presets.json` เก็บเฉพาะ id, ชื่อ key และค่าที่เป็นข้อมูลของ preset เอง (เช่น ช่วงเลเวลตั้งต้น) พร้อมเหตุผล (SF-8), แหล่งเวลาทำการ
  - [ ] `data/dungeons/presets.json` valid และมี `verification_mode` = `continuous_gps`, `floor_level` = null
  - [ ] อธิบายว่าทำไมสวนหย่อมยังน่าไป (rare สูงกว่า)

#### P1-F03-T10 — Art style guide + icon grammar (art-director, 2 วัน)
- Acceptance:
  - [ ] palette พร้อม hex และค่า contrast สำหรับจอกลางแดด (อย่างน้อย WCAG AA ของข้อความบนพื้นหลักทุกคู่)
  - [ ] shape language, เส้น, แสงเงา, do/don't อย่างน้อย 5 คู่ สไตล์น่ารัก isometric
  - [ ] icon grammar: ขนาด, grid, stroke, สี rarity 5 ระดับ, สี class 4 แบบ (แยกได้แม้ตาบอดสี)

#### P1-F03-T11 — Avatar spec + asset pipeline (art-director, 1–2 วัน)
- Acceptance:
  - [ ] avatar 2D layered isometric 3 มุม (หน้า ข้าง หลัง): ลำดับ layer (body, hair, outfit, weapon, accessories), anchor point, canvas size, การ map อุปกรณ์ 4 ช่องไป layer
  - [ ] asset pipeline: การตั้งชื่อ, format (SVG สำหรับ icon/UI, PNG sprite สำหรับ avatar/VFX), schema ของ `art/assets/manifest.json`, งบขนาดไฟล์

#### P1-F03-T12 — Map style (art-director, 2 วัน) — ย้ายขึ้น W3 (SF-13)
- Inputs: `art/direction/style-guide.md`, `docs/tech/F02-map-location-spike.md` (tile schema, font stack, path glyph/sprite), theme ทางการ `@protomaps/basemaps`
- Acceptance:
  - [ ] MapLibre style JSON ใน `art/direction/map-style/` เริ่มจาก theme ทางการของ Protomaps ตามเวอร์ชัน schema ที่ P1-F02-T03 pin แล้วปรับสี (TL-M02) · source มี `attribution` ของ OSM และ Protomaps (TL-S13)
  - [ ] ระบุ font stack ที่ครอบ Thai และ path glyph/sprite ตาม tech note · ชื่อถนนจริงอ่านออก ทดสอบกับ fixture tile และแนบภาพ (TL-M03)
  - [ ] dungeon แสดงเป็นรอยแยก (layer ตัวอย่างจาก GeoJSON), พื้นที่นอกเขตเล่นเป็นสีดำพร้อมเส้นจังหวัด
  - [ ] style มี layer ตำแหน่งของตัวเองเท่านั้น · ข้อมูลผู้เล่นอื่นแสดงได้แค่จำนวนและ role ระดับ dungeon บน label ของรอยแยก ไม่มีจุด ไม่มี heatmap ผู้เล่น (SF-7)
  - [ ] `map-style.md` อธิบาย layer, สี, การทดสอบกลางแดด และไม่มี animation ต่อเนื่องบนแผนที่

#### P1-F03-T13 — Style tile (artist-2d, 1–2 วัน)
- Acceptance:
  - [ ] SVG style tile แสดง palette, ตัวอย่าง icon 4 class, กรอบ rarity 5 ระดับ, ปุ่ม, การ์ด, ตัวอย่าง isometric prop 1 ชิ้น
  - [ ] ใช้สีจาก palette token เท่านั้น, SVG มี viewBox และไม่มี raster ฝัง

#### P1-F03-T14 — Avatar placeholder 3 มุม + manifest (artist-2d, 2 วัน)
- Acceptance:
  - [ ] placeholder SVG ต่อ layer ตาม avatar spec ครบ 3 มุม (หน้า ข้าง หลัง) และ canvas ตรง spec
  - [ ] prompt raster ครบ (มุม isometric, palette hex, เส้น, พื้นโปร่งใส, ขนาด, การแยก layer) ใน `art/prompts/avatar.md`
  - [ ] `art/assets/manifest.json` ตาม schema ใน asset pipeline สถานะ `placeholder` / `prompt-only`

#### P1-F03-T15 — IA (uiux-designer, 1–2 วัน)
- Inputs: `design/pillars.md` (รายการห้ามสอน, หัวข้อ "สถานะที่บ้าน") · deps P1-F03-T01 (SF-5)
- Acceptance:
  - [ ] รายการหน้าจอทั้งเกม v1 และ navigation · รวมหน้าจอ consent location, ตั้งค่าความเป็นส่วนตัว, ลบบัญชี, และ profile ที่ไม่มีข้อมูลตัวตนจริง (MF-2)
  - [ ] ลำดับการปลดระบบ (ตลาด, ตีบวก, raid, stat, เปลี่ยน class, party ละเอียด) สอดคล้องกับรายการห้ามสอนใน 10 นาทีแรก และอ้าง `config: unlocks.<system>` (SF-6)
  - [ ] หน้าที่ต้องมีสำหรับคนที่ dungeon ไกลหรืออยู่นอกพื้นที่ (ดู avatar, อ่าน role, ลงทะเบียนความสนใจ) ตามเจตนาใน pillars

#### P1-F03-T16 — Flow หลัก + รายการ copy key (uiux-designer, 2–3 วัน)
- Acceptance:
  - [ ] flow 10 นาทีแรกตรงตาราง GDD ทีละช่วง (0–1, 1–3, 3–6, 6–8, 8–10) · นาที 0–1 รวม consent location (แยก ไม่รวมกับ consent อื่น), permission ของเบราว์เซอร์, จุดตรวจอายุ 15+ พร้อมช่องต่อ parental consent (scaffold ปิดไว้) โดยยังเห็นแผนที่และเลือกพลังได้ภายในนาทีแรก (MF-2)
  - [ ] กรณีปฏิเสธ consent location: ยังดู avatar อ่าน role และลงทะเบียนความสนใจได้ (ใช้หน้าเดียวกับกรณี dungeon ไกล) (MF-2)
  - [ ] flow แผนที่ → confirm เข้า (รวมกรณี polygon ซ้อน) → run (Active/Grace/Suspended/Ended) → สรุปรางวัล และ flow dungeon ไกล / นอกพื้นที่
  - [ ] สถานะ run ครอบ (MF-1): HP 30% (สั่น + แจ้ง), ยาอัตโนมัติ, auto-retreat ที่ 25% (เก็บของครบ run จบ), ตาย (ของใน run หาย, ฟื้น 0→50% หรือใช้ยา), กดออกเองได้ทุกเมื่อโดยไม่ต้องเดินออก, tick ที่ไม่ผ่าน movement gate แสดงให้เห็น (เดินไม่พอ) โดยไม่ลงโทษ · หน้าตั้งค่ามี auto-retreat เปิดเป็น default การปิดต้องเข้าไปปิดเองและมีขั้นยืนยัน
  - [ ] ทุกตัวเลขใน flow (25%, 30%, 5 นาที, 50 ม., ระยะ "ไกล") อ้างเป็น `config: <key>` ไม่เขียนค่า
  - [ ] ทุกหน้ามีสถานะ empty, loading, GPS ปิด, accuracy ต่ำ, offline, dungeon ปิด, นอกระยะ, error
  - [ ] ตารางรายการ copy key ที่ต้องใช้ (key + บริบท + ร่างไทยในวงเล็บ) ส่งต่อ P1-F03-T05 · ประกาศชื่อ key กลุ่ม `gps.*` ให้ P1-F02-T10 ใช้ (N-7)
  - [ ] ไม่แสดงตำแหน่งรายบุคคลของผู้เล่นอื่นในทุกหน้า (แสดงแค่จำนวนและ role) · ไม่มีช่องกรอกข้อความอิสระในทุกหน้า (ชื่อตัวละครถ้ามีให้เลือกจากชุดที่ระบบสร้าง หรือเสนอเป็น decision) · flow นาที 0–10 ไม่มีทางไปหน้าของระบบต้องห้าม (SF-11)

#### P1-F03-T17 — Wireframe + tokens + components (uiux-designer, 2–3 วัน)
- Acceptance:
  - [ ] wireframe HTML เปิดตรงในเบราว์เซอร์ ไม่มี build step ครอบทุกหน้าใน flow หลัก รวมหน้า consent + อายุ 15+, HP 30%, auto-retreat, ตาย, ออกเอง, tick ไม่ผ่าน gate และตั้งค่า auto-retreat (MF-1, MF-2)
  - [ ] ข้อความใช้ copy key พร้อมร่างไทยในวงเล็บ
  - [ ] `tokens.json` (spacing, type scale, touch target ขั้นต่ำ 44 px, สีจาก palette) และ `components.md`
  - [ ] ใช้งานมือเดียวบนจอมือถือได้

#### P1-F03-T18 — Audio direction + cue list (sound-designer, 2 วัน)
- Inputs: GDD "โทนและภาษาในเกม", `design/pillars.md` (optional input ไม่ใช่ deps แข็ง, N-2) · ไม่มี deps orchestrator ดึงขึ้นมาก่อน W7 ได้เมื่อ wave ใดมีช่อง
- Acceptance:
  - [ ] pillars เสียง, mood ต่อบริบท (แผนที่, dungeon, raid, บ้าน), loudness target, กฎ mix/ducking สำหรับเสียงรถและคนรอบตัว
  - [ ] cue list พร้อม vibration pattern (ms array) และ fallback เมื่อปิดเสียง สำหรับอย่างน้อย: tick ได้รางวัล, drop ตาม rarity, HP 30%, auto-retreat, ตาย, เข้า dungeon, raid checkpoint, raid เหลือ 30 นาที
  - [ ] สัญญาณสำคัญแยกได้โดยไม่ต้องดูจอและไม่ต้องมีเสียง

#### P1-F03-T19 — Metrics framework + telemetry events (product-manager, 2 วัน)
- Inputs: `design/pillars.md`, `design/ux/flows/F03-core-loop.md` (deps P1-F03-T16 เพื่อให้ event ตรงขั้นตอน flow จริง, PM-S03)
- Acceptance:
  - [ ] metric tree ครบ 6 หมวด: onboarding, social, economy, progression, places (entries/day ต่อ dungeon, เวลาเฉลี่ย, death rate, ขนาด party, จำนวนรายงานซ้ำ), seasonality แม้บางหมวดยังไม่มี event ใน Phase 1–2 (PM-S01)
  - [ ] north star = นาทีเดินที่ validate ต่อสัปดาห์ต่อผู้เล่น active พร้อม guardrail: อัตราส่วนรายได้ต่อค่ายา, ขนาด party เฉลี่ย, DAU ช่วงฝน, คนเลเวลสูงหายสัปดาห์ 3–4, อัตราส่วน auto-retreat ต่อการตาย, สัดส่วนคนที่ปิด auto-retreat, อัตรา tick ไม่ผ่าน gate ต่อ run (SF-12)
  - [ ] telemetry event ของ Phase 1–2 พร้อม property และจังหวะยิง: event ต่อขั้น onboarding ตามช่วง 0–1 / 1–3 / 3–6 / 6–8 / 8–10 (funnel), ได้รางวัลก้อนแรก, dungeon ใกล้สุดเมื่อเปิดแอป และสัดส่วนที่เกิน `config: unlocks.home.farDungeonThreshold_m`, ปิดแอปบนหน้าจอที่บ้านเมื่อ dungeon ไกล/นอกพื้นที่, เข้า/ออก dungeon, tick granted/denied, HP ต่ำ, auto-retreat, ตาย, สถานะ GPS (PM-S02, SF-12)
  - [ ] ทุก event ระบุ privacy note: ไม่มีพิกัด ใช้ dungeon id เท่านั้น

#### P1-F03-T20 — กรอบ live ops + tuning playbook (liveops-operator, 1–2 วัน)
- ขอบเขต: กรอบทิศทางเท่านั้น ปฏิทินเต็มปีเป็นงานของ F24 ใน Phase 8 เมื่อรู้ผล Go/No-go และวันเปิดจริง (PM-S04) · ไม่มี deps orchestrator ดึงขึ้นมาก่อน W7 ได้เมื่อ wave ใดมีช่อง
- Acceptance:
  - [ ] กรอบทิศทาง + ประเภท event หลัก (raid ทุกเสาร์ 16:00–18:00, เทศกาลไทย, ฤดูฝน, dungeon ชั่วคราวที่ตลาดนัดหรืองาน event นอกเขตศาสนสถาน) + ตัวอย่างปฏิทินไตรมาสแรกเพื่อยืนยันแนวคิด · แต่ละรายการมี config ที่เปลี่ยน, copy ที่ต้องใช้, แผน rollback
  - [ ] dungeon ชั่วคราวที่อยู่ในหรือทับเขตศาสนสถานไม่อยู่ในปฏิทินตาม D-006 (MF-4, PM-S05) · ไม่มีตัวอย่าง "งานวัด" ในปฏิทิน
  - [ ] ไม่มี event ที่ผู้เล่นหรือกลุ่มแข่งกันเอง · อันดับ contribution ของ raid เป็นไปตาม GDD เท่านั้น (N-4)
  - [ ] tuning playbook ตั้งต้นด้วย 3 ค่าแรกของ GDD (`expPerTick`, ราคาขายวัตถุดิบ NPC, โอกาส Rare) พร้อมสัญญาณ ขอบเขต และผู้อนุมัติ (systems-designer, game-director เมื่อเกิน ±20%)
  - [ ] ระบุรายการที่เกี่ยวกับเงินจริงหรือ sponsor ว่าต้องเป็น HUMAN

#### P1-F03-T21 — Content gate (copy) F03 (narrative-designer, 1 วัน)
- ขอบเขต: `copy.th.json`, `names.th.json`, ข้อความใน wireframe
- Acceptance:
  - [ ] ผล script checklist (คำต้องห้าม, ความยาว) แนบใน report และผ่านทุก key
  - [ ] ตรวจด้วยคนตามกฎ 3, 4, 5, 6 ทีละกลุ่ม key
  - [ ] ข้อความใน wireframe ใช้ key ที่มีจริง · verdict PASS / NEEDS_CHANGES
- หมายเหตุ: ผู้ตรวจเป็นเจ้าของ copy ตาม protocol ข้อ 6 · design gate A (P1-F03-T24) ตรวจซ้ำอีกชั้น

#### P1-F03-T22 — Content gate (visual) F03 (art-director, 1 วัน)
- ขอบเขต: style tile, avatar placeholder, manifest, wireframe/tokens, map style, motion direction (P1-F03-T27)
- Acceptance:
  - [ ] สี ขนาด stroke และ layer ตรง style guide, icon grammar, avatar spec · motion direction สอดคล้องกับ style guide และ map style (ไม่มี animation ต่อเนื่องบนแผนที่)
  - [ ] tokens ของ uiux ใช้ palette ตรง และ contrast ผ่านเกณฑ์กลางแดด · verdict PASS / NEEDS_CHANGES

#### P1-F03-T23 — QA gate F03: simulator (qa-tester, 1 วัน)
- Acceptance:
  - [ ] รัน test ของ simulator เองและแนบ output
  - [ ] เทียบ vectors กับตาราง GDD อิสระจากผู้เขียน อย่างน้อย: Tanker 1–4 คน, ค่าต่อ 1 คนต่อ role, tick ต่อเลเวล 5 จุด, gear tier 1–5, อัตราส่วนรายได้ต่อค่ายา
  - [ ] ยืนยันว่า simulator อ่านค่าจาก config (แก้ค่าใน config สำเนาแล้วผลเปลี่ยน) · verdict PASS / NEEDS_CHANGES

#### P1-F03-T24 — Design gate A (game-director, 1–2 วัน)
- ขอบเขต: `design/pillars.md`, `design/narrative/*`, copy bank, `design/ux/*`, `design/levels/presets.md`, `audio/*`, `ops/*`
- Acceptance:
  - [ ] ทุกเอกสารสอดคล้องกับ pillars, non-negotiables และหลักการตัดสิน 5 ข้อ (pillars เองยืนยันโดย HUMAN P1-F03-T26 gate นี้ตรวจแค่ความสอดคล้องของเอกสารอื่นกับ pillars, N-1)
  - [ ] core-loop flow ของ uiux ได้รับการอนุมัติ (protocol ข้อ 5) รวมจังหวะ HP ต่ำ / auto-retreat / ตาย / tick ไม่ผ่าน gate และ consent + อายุ 15+
  - [ ] ผลรายเอกสารระบุ role, verdict และ finding ที่ต้องแก้ ตามตารางเอกสารทิศทางราย role ของ F03 เพื่อให้ E14 ตรวจได้ตรง · verdict PASS / NEEDS_CHANGES

#### P1-F03-T25 — Design gate B (game-director, 1–2 วัน)
- ขอบเขต: `design/systems/*`, `config/balance/*`, `tools/sim/` (ผลลัพธ์), `art/direction/*`, `art/vfx/specs/motion-direction.md`, `product/metrics.md`, `product/telemetry-events.md`
- Acceptance:
  - [ ] ให้คำแนะนำของ game-director ต่อ decision ที่ systems-designer เสนอ (เวลาอยู่รอด · Support และ 2.45 ตัดสินแล้วใน D-004, D-005) พร้อมหลักการตัดสินที่ใช้ แล้วยืนยันว่า config ยังเป็นค่าตาม GDD จนกว่า HUMAN ตัดสินใน P1-F03-T28 (SF-1) · ไม่ตัดสินแทนคน
  - [ ] art direction และ motion direction ตรงกับโทน GDD (น่ารัก, 2D layered isometric, อ่านง่ายกลางแดด, จังหวะ auto-retreat/ตายไม่ดราม่า)
  - [ ] metrics วัดสิ่งที่ pillars ต้องการ · ผลรายเอกสารระบุ role, verdict และ finding · verdict PASS / NEEDS_CHANGES

#### P1-F03-T26 — HUMAN: ยืนยัน world building และ design pillars
- ปลดล็อก: exit item "ยืนยัน world building" และทำให้ pillars ไม่ถูกตรวจโดยผู้เขียนเองเท่านั้น (N-1) · ไม่ขวางงาน agent (copy และชื่อใช้ฉบับเสนอไปก่อน ถ้าคนขอแก้ producer จะเพิ่ม fix task)
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · งานนี้เป็นการอ่านและตอบเท่านั้น · หมายเหตุ: world และ pillars จะเปิดเผยใน repo public (D-002)
- ขั้นตอน:
  1. เปิด `design/narrative/world.md` อ่านสรุปธง `[HUMAN]` ต้นไฟล์
  2. ตรวจเป็นพิเศษเรื่องที่แตะศาสนา การเมือง หน่วยงานรัฐ ("รัฐบาล" ในเรื่องเล่า) และแบรนด์จริง
  3. ตอบต่อธงแต่ละข้อ: (ก) ยอมรับ (ข) ยอมรับพร้อมแก้ ระบุ (ค) ไม่ยอมรับ ระบุทิศทาง
  4. ตอบภาพรวมหนึ่งข้อ: ยืนยันโลกนี้เป็นฉบับทำงานของ v1 หรือไม่
  5. เปิด `design/pillars.md` อ่าน pillars และ non-negotiables แล้วตอบ: (ก) ยืนยัน (ข) ยืนยันพร้อมแก้ ระบุข้อ

#### P1-F03-T27 — Motion direction (vfx-animator, 1–2 วัน) — ใหม่ (MF-5)
- Goal: ให้ Phase 2 (F05, F06) มีทิศทาง motion ของจังหวะได้ของ auto-retreat และตาย ก่อนเริ่ม build และให้ exit criterion "ทุก role" ครบ
- Inputs: `art/direction/style-guide.md`, `audio/cue-list.md`, GDD "โทนและภาษาในเกม", "HP การตาย และการฟื้นฟู", "ตีบวก"
- Acceptance:
  - [ ] งบ motion: ทำงานเฉพาะเมื่อจอเห็น หยุดเมื่อ `visibilitychange`, ไม่มี animation ต่อเนื่องบนแผนที่, รองรับ `prefers-reduced-motion` พร้อม fallback
  - [ ] ช่วงเวลา feedback และ reveal, การไล่ระดับ rarity 5 ระดับ, จังหวะ rift บนแผนที่ (ช้า frame ต่ำ)
  - [ ] หลักของจังหวะ HP ต่ำ / auto-retreat / ตาย แบบไม่ดราม่า และตีบวกล้มเหลวไม่มีภาพของแตก
  - [ ] โยง cue id จาก `audio/cue-list.md` ต่อจังหวะ · ถ้าต้องการ cue ใหม่ส่ง handoff ถึง sound-designer

#### P1-F03-T28 — HUMAN: ตัดสินความไม่สอดคล้องใน GDD — ใหม่ (SF-1, SF-2, MF-4)
- ปลดล็อก: ไม่ขวาง exit ของ Phase 1 · ถ้ายังเปิดตอนปิด phase ย้ายไป board Phase 2 ตาม A-P1-PLAN-02-4
- กฎคุมค่าใช้จ่าย: ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน · งานนี้เป็นการตัดสินค่าใน design ไม่แตะบริการใด
- เตรียมโดย: orchestrator รวมรายการจาก decision log ทันทีที่ P1-F03-T06 และ T08 รายงาน พร้อมคำแนะนำของ game-director จาก `plan-review-game-director.md` หัวข้อ 8
- ขั้นตอน (ตอบทีละข้อ):
  1. Support base 25 / cap 50: ปิดแล้ว (D-004 คง 25/50) · เหลือเพียงให้คนอนุมัติการเพิ่มหนึ่งประโยคใน GDD ว่า Support เป็นข้อยกเว้นโดยเจตนาของกฎ 1/3–2/5
  2. อัตราส่วนรายได้ต่อค่ายา 2.45: ปิดแล้ว (D-005 ยอมรับภายใน tolerance) · เหลือเพียงให้คนอนุมัติแก้คำว่า "ตรงกับเป้าหมาย" ใน GDD เป็น "ราว 2.5 (2.45)"
  3. งานวัด: ปิดแล้ว (D-006 ตัดทั้งหมด อนุญาตเฉพาะ event นอกเขตศาสนสถาน) · เหลือเพียงให้คนอนุมัติแก้ตัวอย่าง "งานวัด" ในหัวข้อ "ปัญหา coverage" ของ GDD
  4. รายการ "ที่ยังต้องตัดสินใจ" ใน GDD: ยืนยันตารางสถานะใน `design/pillars.md` ว่ารายการล้าสมัยหรือไม่ (GDD แก้ได้โดยคนเท่านั้น)
  5. เวลาอยู่รอด 45 นาที (ถ้า P1-F03-T07 เสนอ): นับถึง auto-retreat หรือถึง HP 0

#### P1-CLOSE-QA — Regression ปิด Phase 1 (qa-tester, 1 วัน) — ใหม่ (PM-M04)
- Goal: ทวนว่าทุกอย่างพร้อมปิด phase ก่อนส่งคนตรวจ แทนงาน phantom ที่ E18 เคยอ้าง
- Inputs: board นี้ (อ่านอย่างเดียว), รายงาน gate ทุกฉบับ, `qa/bugs.md`
- Acceptance:
  - [ ] ทุก task ในตารางเป็น DONE หรือ CUT (พร้อมเหตุผล) ยกเว้นงาน HUMAN ที่ยกยอดได้ตาม A-P1-PLAN-02-4 ซึ่งระบุชื่อไว้
  - [ ] ทุก gate PASS (F01: T08, T09, T10 · F02: T15, T16, T27 · F03: T21–T25) พร้อม path ของรายงาน
  - [ ] ทุกข้อใน Phase Exit Checklist มีหลักฐานที่เปิดได้จริง · รัน root `lint`, `typecheck`, `test`, `test:e2e`, `build` อีกครั้งและแนบ output
  - [ ] ยืนยันว่า `qa/playtest/results/` ใน git ไม่มีไฟล์ที่มีพิกัด และ `raw/` ถูก ignore · รัน gitleaks บน git history ทั้งหมดและ guard ไฟล์ต้องห้ามของ P1-F02-T07 อีกครั้ง ผลต้องสะอาด (repo public, D-002) · ตรวจว่าไม่มีชื่อ env หรือ config ที่ผูกกับ R2 หรือบริการเสียเงิน (D-001)
  - [ ] `qa/bugs.md` ไม่มี bug blocking ที่เปิดค้าง · verdict PASS / NEEDS_CHANGES
  - [ ] (P1-PLAN-SYNC-01) ทุกงาน H และ X ในตารางเป็น DONE หรือ CUT · ถ้า tech gate P1-F02-T15 ไม่ได้ตรวจ `tools/coverage/boundaries/` (P1-H07) ให้ตรวจ hygiene ชุดเดียวกัน (pin, ไม่มีไฟล์ดิบใน git, test รันจาก root script)

### งาน handoff ระหว่าง run (orchestrator สร้าง)

#### P1-H01 — ADR 0001 amendment: config convention + copy schema (tech-lead, 1 วัน)
- ที่มา: handoff จาก P1-F03-T06 (systems-designer) และ P1-F03-T03 (narrative-designer)
- [ ] ADR 0001 ข้อ 3.10 ยืนยันหรือแก้ convention ที่ `config/balance/*.json` ใช้อยู่: `_source`/`_assumption`/`_note`, unit suffix ผสม (เช่น `_pctMaxHpPerMin`), `null` = ยังไม่ตั้ง code ต้อง fail ชัด, `seeFile`, key ที่ขึ้นต้นด้วย `_` ถูกข้ามเมื่อวนลูป
- [ ] `docs/tech/copy-schema.md`: schema ของ `config/content/copy.th.json` (text/voice/kind/context/cells/alts/beat) + registry ตัวแปรพร้อม maxCells ตาม style guide หัวข้อ 4.1, 4.4 · ระบุที่เก็บไฟล์คำของ lint (`tools/copy-lint/`)
- [ ] ระบุ JSON Schema หรือ type ที่ lint และ client ใช้ร่วมกัน
- [ ] (จาก P1-H05) เพิ่ม `_ms` ในรายการ unit suffix · บันทึก `config/app/` (เจ้าของ tech-lead, ค่า runtime ของ app) และกฎ namespace ตาม path เทียบ `config/balance/` · แก้ `docs/tech/gps-trace-format.md` 4.2 และ tech note หัวข้อ 4, 14 ให้ใช้ path จริง (`config/app/privacy.json#rawTraceExport.rawTraceTrim_m`, `timeout_ms`, `maximumAge_ms`) และปิด A-P1-F02-T03-1
- [ ] ตัดสิน D-037 (ขอบเขต/โซนดำจาก GeoJSON) และ property contract ของ `kw-dungeons` (A-P1-F03-T12-5) · ตัดสิน default ชั่วคราวใน `apps/client/.env.example` และ `@maplibre/maplibre-gl-style-spec` เป็น dependency หรือไม่ · no-magic-numbers ใน `tools/sim/src/vectors.ts`

#### P1-H02 — Copy lint script (gameplay-programmer, 1–2 วัน)
- ที่มา: handoff จาก P1-F03-T03 · ต้องเสร็จก่อน copy gate P1-F03-T21
- [ ] script ใน `tools/copy-lint/` ตรวจ S1–S14 ของ `design/narrative/style-guide.md` หัวข้อ 7 (คำต้องห้าม W1–W8 ด้วย regex กันคำซ้อน, นับช่องแสดงผลไทยตามหัวข้อ 4.3, เพดานบรรทัด, ตัวแปรต้องอยู่ใน registry) ตาม schema ใน `docs/tech/copy-schema.md`
- [ ] ไฟล์คำอยู่ใน `tools/copy-lint/` (ไม่พิมพ์คำเหยียด/แบรนด์ในเอกสาร) · test case 10 แถวของ style guide ผ่านทั้งหมดผ่าน `pnpm test`
- [ ] (แก้ใน P1-PLAN-SYNC-01 ให้ตรงกับ Writes ในตาราง) งานนี้เป็นเจ้าของ lockfile เพียงงานเดียวใน wave ของตัวเอง: เพิ่ม dependency ได้เฉพาะที่ copy-lint ต้องใช้จริง pin exact ตาม D-019 · root `package.json` แก้ได้เฉพาะ `scripts` · ถ้าต้องแก้ `vitest.config.ts`, `tsconfig.json` หรือ `eslint.config.js` (เช่น include `tools/copy-lint/`) ให้ handoff ถึง tech-lead ซึ่ง P1-X05 รับทำต่อทันทีใน wave ถัดไป

#### P1-H03 — เติม config key ที่เอกสารทิศทางอ้าง (systems-designer, 1 วัน)
- ที่มา: handoff จาก P1-F03-T01, P1-F03-T15, P1-F03-T03, P1-F03-T02
- [ ] ทุก key ที่ `design/pillars.md` (6.2, 7.1, 11), `design/ux/ia.md` (หัวข้อ 6) และ style guide อ้างมีอยู่ใน config หรือมีตารางจับคู่ชื่อจริง: `unlocks.*` U1–U8 พร้อมเกณฑ์ตัวเลข (เลเวล/จำนวน run), `unlocks.parentalConsent`, `unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s` (24 ชม. ตาม PDPA), `location.minAccuracy_m`, `privacy.minAge_yr` (เกณฑ์อายุ 15+ เสนอโดย P1-F03-T16)
- [ ] ตาราง raid (วัน เวลาเริ่ม เวลาจบ) และ autoRetreatPct, hpWarnPct, minAge อ่านได้โดย copy formatter (ไม่ hardcode "เสาร์ 16:00")
- [ ] object `coverageFilter` ใน `config/balance/dungeons.json` ตาม key และค่าที่เสนอใน `tools/coverage/METHOD.md` หัวข้อ 8.2 (handoff จาก P1-F01-T01) · pipeline F01 อ่านจากที่นี่
- [ ] JSON valid, มี `_source` ทุก object, ตาม convention ADR 0001

#### P1-H04 — ตรวจ contrast อัตโนมัติ (qa-tester, 0.5–1 วัน)
- ที่มา: handoff จาก P1-F03-T10 (art-director คำนวณ contrast ด้วยมือ ไม่มี shell)
- [ ] test ใน `qa/tests/unit/contrast.test.ts` คำนวณ WCAG 2.x contrast ของทุกคู่ใน `art/direction/style-guide.md` หัวข้อ 4.1–4.5 จาก hex (ไม่เพิ่ม dependency ใหม่ ถ้าต้องการให้ handoff tech-lead) รันผ่าน `pnpm test`
- [ ] รายงาน `qa/reports/F03-contrast-check.md`: ทุกค่าที่ต่างจากตารางเกิน 0.05 และทุกคู่ที่ตกเกณฑ์ 4.5:1 · ถ้าพบ ส่ง handoff ถึง art-director

#### P1-H05 — config ของ app และ client (tech-lead, 0.5 วัน)
- ที่มา: handoff จาก P1-F02-T03 · ต้องเสร็จก่อน P1-F02-T11
- [ ] `config/app/privacy.json` มี `rawTraceTrim_m` (200) และค่า privacy ฝั่ง app อื่นที่ tech note อ้าง พร้อม `_source`
- [ ] config ของ client สำหรับค่า Web provider (timeout, maximumAge, enableHighAccuracy ฯลฯ) และค่าเริ่มต้นของ query ตาม tech note หัวข้อ 4 และ 8 · ไม่มีค่าเหล่านี้ hardcode ใน code
- [ ] JSON valid ตาม convention ADR 0001

#### P1-H06 — Screenshot และทดสอบกลางแดดของ map style (qa-tester, 1 วัน)
- ที่มา: handoff จาก P1-F03-T12 (art-director ไม่มี shell/browser) · ขั้นทดสอบ S1–S5 และเกณฑ์ผ่านอยู่ใน `art/direction/map-style.md` หัวข้อ 10.1
- (P1-PLAN-SYNC-01) Deps เพิ่ม P1-H07: จอ S4 ต้องเห็นโซนดำและเส้นจังหวัดจาก `data/map/*.geojson` · ขั้นทดสอบกลางแดดด้วยคนจริง (หัวข้อ 10.2) ถูกใส่ไว้ในคู่มือ P1-F02-T14 แล้ว งานนี้แค่อ้างผลจาก `qa/playtest/results/` ถ้ามีตอนรัน
- [ ] screenshot S1–S5 ที่ 390x844 และ 360x800 บน fixture tile ทั้งแบบ PMTiles และ TileJSON (Playwright android-chrome + ios-safari) เก็บใน `qa/reports/F02/map-style/`
- [ ] ป้ายชื่อถนนไทยอ่านได้ วรรณยุกต์และสระวางถูก (TL-M03) · ไม่มีจุดผู้เล่นอื่น · ไม่มี animation ต่อเนื่อง
- [ ] ผลทดสอบกลางแดดตามหัวข้อ 10.2 (ถ้าต้องใช้คนจริง ส่งเป็นขั้นในคู่มือเดินทดสอบ P1-F02-T14)
- [ ] (จาก P1-F03-T13) จำลองตาบอดสี 4 แบบ (protanopia, deuteranopia, tritanopia, achromatopsia) ด้วย Playwright + CDP `Emulation.setEmulatedVisionDeficiency` บน `art/assets/ui/style-tile/style-tile.svg` และ contact-sheet-1x.svg เก็บภาพใน `qa/reports/F03/colorblind/` · ยืนยันว่า rarity/class แยกได้ด้วยรูปทรง (icon-grammar §6.3)
- [ ] `qa/tests/unit/map-style.test.ts` เรียก `validateStyleMin` กับ `art/direction/map-style/kw-light.style.json` คาด 0 error (หลัง P1-X05 ติดตั้ง style-spec)
- [ ] ถ้าพบปัญหา ส่ง handoff ถึง art-director

#### P1-H07 — GeoJSON โซนดำและเส้นจังหวัด (location-engineer, 1 วัน)
- ที่มา: handoff จาก P1-F03-T12 · ข้อเสนอ D-037 (ขอบเขตมาจาก GeoJSON ไม่ใช่ tile)
- [ ] `data/map/playarea-mask.geojson`: outer ring ครอบโลก มีรูเท่ากับ union ของ 6 จังหวัดที่เล่นได้ simplify ~20 ม.
- [ ] `data/map/provinces.geojson`: เส้นขอบ 77 จังหวัด `kind: border` + จุดชื่อ `kind: label` มี `name` และ `playable` simplify ~200 ม. ขนาด ≤300 KB
- [ ] script ทำซ้ำได้ใน `tools/coverage/boundaries/` อ่านจาก OSM extract เดิม (D1) · attribution OSM · ผ่าน test ขนาดและ validity

#### P1-X01 / P1-X02 — แก้ชื่อ config key ในเอกสารทิศทาง (game-director / uiux-designer, 0.5 วัน)
- ที่มา: handoff จาก P1-H03 (A-P1-F03-T01-2, A-P1-F03-T16-5: เอกสารต้องตาม config)
- [ ] ทุก key ที่อ้างตรงกับ config จริง: `location.homeState.maxAccuracy_m`, `unlocks.home.farDungeonThreshold_m`, `unlocks.parentalConsent.enabled`, `dungeons.runState.graceMax_s`/`suspendedMax_s`, `dungeons.rewardTick.rewardTickInterval_s`, `dungeons.movementGate.minDistancePerWindow_m`, `dungeons.hpSafety.autoRetreatThreshold_pct`/`lowHpWarningThreshold_pct`, `anticheat.speedLock.speedLock_kmh`, `economy.json#market.minAccountAgeToTrade_days`, `privacy.minAge_yr`, `privacy.positionLogTtl_s`
- [ ] ลบหมายเหตุ "ยังไม่มีใน config / รอ P1-H03" · ตรวจด้วย grep ว่าไม่เหลือชื่อเก่า

#### P1-X03 — ปรับ copy bank ตาม copy schema (narrative-designer, 1 วัน)
- ที่มา: handoff จาก P1-H01 (D-024 ACCEPTED พร้อม 5 ส่วนเพิ่ม) และ P1-F03-T05
- [ ] (แก้ตาม copy-schema ฉบับเขียนใหม่ของ P1-H01) ทำตามหัวข้อ 9: `_meta` เพิ่ม `version`/`doc`, `_variables` คงเป็น registry + `configKey` 10 ตัวตามหัวข้อ 5.3, ข้อยกเว้น S6 ใช้ `_meta.dayNameExceptions`/`numericExceptions`, push title เป็น key `kind: push` แยก, สร้าง `config/content/copy-rules.json` ตามหัวข้อ 6, เพิ่ม `unit.m`, `unit.km`, `unit.weekday*`, `common.listSeparator`, `common.listLastSeparator`
- [ ] style guide: 5.1 ชื่อ rarity ภาษาอังกฤษ 5 ชื่อ + T/R/S/M ชั่วคราว, 5.2 เพิ่ม "บล็อก", "เว็บ", 4.4 รายการ area, หัวข้อ 7 และ 9 ชี้ไฟล์คำ `tools/copy-lint/words.json`
- [ ] JSON valid (ขอให้ตรวจด้วยการอ่านซ้ำ; lint เครื่องมาใน P1-H02)

#### P1-X04 — `_nullMeans` และ vectors ไม่ฝังเลข (systems-designer, 0.5 วัน)
- [ ] `_nullMeans` ใน 5 จุดตาม ADR 0001 3.10.5 (combat.levelGapDamage.maxMult, economy.npcPricing.npcDailySellLimit, economy.marketTax.brackets[].toDailySales_gold = unbounded; economy.npcSellPrice_gold.equipment, dungeons.verification.v1FloorLevel = none)
- [ ] (จาก P1-H08) เพิ่ม `coverageFilter.walkGraphSnapMaxDistance_m` (150) และ route factor สำรอง (1.4, ช่วง 1.2–1.6) ตาม PRD F01 หัวข้อ 8.1
- [ ] (จาก P1-F01-T02) เพิ่ม `coverageFilter.educationAllowOsmIds` (allowlist ว่าง), `coverageFilter.maxAspectRatio`, `coverageFilter.maxEntranceGap_m` ใน `dungeons.json` ตาม `design/levels/dungeon-rules.md` หัวข้อ 4, 8, 12, 16
- [ ] (จาก P1-F03-T19) เพิ่ม `dungeons.safety.reportThreshold` และไฟล์ `config/balance/telemetry.json` (`batterySampleInterval_s`, `emptyScreenAbandonTimeout_s`, `clockSkewTolerance_s`, `goldAmountBuckets`) ตามที่ `product/telemetry-events.md` อ้าง
- [ ] `tools/sim/src/vectors.ts` และ `vectors-economy.ts` อ่านค่าขอบจาก SimParams (บรรทัดที่ H01 ระบุ) แล้วลบ `eslint-disable` บรรทัดแรก · `pnpm lint`, `pnpm test`, `gen-vectors.ts --check` ผ่าน

#### P1-X05 — eslint override + style-spec dependency (tech-lead, 0.5 วัน)
- (P1-PLAN-SYNC-01) Deps: P1-H02 (lockfile ต่อคิว) และ P1-X04 (override ของ vectors ขึ้นกับผลของ X04) · รับ handoff config ของ H02 (include `tools/copy-lint/` ใน vitest/tsconfig/eslint) · วิ่งขนานกับ P1-F02-T10 จึง**ห้ามทำให้ API ของ `packages/location` ที่ T10 ใช้พัง**: ถ้าเปลี่ยน `timeoutMs`/`maximumAgeMs` เป็น `timeout_ms`/`maximumAge_ms` ให้คงชื่อเดิมเป็น alias แบบ deprecated พร้อม test และแก้ `src/web/` กับ `test/` ในงานนี้ · ไม่แตะ `apps/client/` · P1-F02-T11 (ขึ้นกับ X05) ย้ายไปใช้ชื่อใหม่
- [ ] override ใน `eslint.config.js` สำหรับ `tools/sim/src/vectors*.ts` ตาม ADR 3.5 (ถ้า X04 ลบ disable แล้วยังต้องการ)
- [ ] `@maplibre/maplibre-gl-style-spec` 26.4.4 เป็น root devDependency (task เดียวใน wave ที่เขียน lockfile) · `pnpm install --frozen-lockfile` และ `pnpm check` ผ่าน
- [ ] config lint (ADR 3.10.7) ยกไป Phase 2 ถ้าไม่ทันใน task นี้
- [ ] (จาก P1-X04) เพิ่ม partyMaxMembers และ maxEnhanceLevel ใน SimParams (tools/sim/src/params.ts) · ตัดสินว่ายังต้องมี override ของ vectors*.ts ไหม (lint สะอาดแล้ว) · ยืนยันชื่อ maxAspectRatio, reportThreshold กับตาราง suffix 3.10.3 · ตัดสินว่า telemetry.json อยู่ config/balance/ หรือ config/app/ (ถ้าย้าย ห้ามเปลี่ยนชื่อ key)
- [ ] (จาก P1-H04) `tools/copy-lint/test/cli.test.ts` "exits 0 with only expected WARNs" fail เพราะ copy เปลี่ยน (WARN 14 → 11 หลัง P1-X12) — ให้ test อ่านรายการ WARN ที่คาดจากข้อมูลจริงหรือปรับรายการ ไม่ hardcode จำนวนที่เปราะ
- [ ] (จาก P1-F02-T06) ยืนยัน A-P1-F02-T06-1 (PMTiles local อยู่ที่ tools/tiles/out/pmtiles/ ไม่ใช่ out/publish/pmtiles/) และ -2 (Python stdlib + Vitest bridge ใน tools/tiles ได้) · แก้ tech note 6.3/9 ให้ตรง
- [ ] (จาก P1-H07) เพิ่ม `tools/coverage/boundaries/tests/**/*.test.ts` ใน vitest include คู่กับ glob ของ pipeline
- [ ] (จาก P1-H02) `.prettierignore` ครอบ `tools/coverage/.venv/`, `tools/coverage/out/` และไฟล์ generated ที่ location/devops ระบุ · root `pnpm lint` (eslint + prettier + lint:copy) เขียวทั้ง repo
- [ ] (จาก P1-F02-T05) root `tsconfig.json` include `packages/location/test/**/*.ts` · ตัดสินเปลี่ยน `WebLocationOptions.timeoutMs`/`maximumAgeMs` เป็น `timeout_ms`/`maximumAge_ms` ให้ตรง tech note หรือคงไว้พร้อมบันทึก
- [ ] copy-schema 3.2 เพิ่มแถว "kind button + key อยู่ใน limits.buttonFullWidth.keys → buttonFullWidth" และหัวข้อ 6 อนุญาต limits.buttonFullWidth (D-050) · ตัดสิน nameReal/nameSuffix แบบ camelCase ใน names.th.json
- [ ] เพิ่ม `tools/coverage/pipeline/tests/**/*.test.ts` ใน include ของ `vitest.config.ts` (bridge รัน pytest ข้ามพร้อมคำเตือนเมื่อไม่มี .venv, บังคับเมื่อ `COVERAGE_PYTEST_REQUIRED=1`) · root `pnpm test` ผ่าน

#### P1-X07 — CI รัน pytest ของ coverage (devops-engineer, 0.5 วัน)
- [ ] เพิ่ม `pnpm exec tsx tools/traces/src/generate.ts --check` ใน CI
- [ ] job ที่รัน `COVERAGE_PYTEST_REQUIRED=1` ครอบ `tools/coverage/boundaries/tests` ด้วย
- [ ] forbidden-file guard รองรับ path ที่มีช่องว่าง (fixture `tools/tiles/fixtures/lumpini/glyphs/Noto Sans Regular/`) · test ของ tools/tiles ดึง pmtiles binary ~16 MB ครั้งแรก (checksum) ต้อง cache ใน CI
- [ ] ใน job build-test: `python3 -m venv tools/coverage/.venv && tools/coverage/.venv/bin/pip install -r tools/coverage/requirements.txt` แล้ว `COVERAGE_PYTEST_REQUIRED=1 pnpm test` · ไม่ดาวน์โหลด OSM/ประชากร · actionlint ผ่าน · อัปเดต environments.md

#### P1-X06 — แก้ map-style.md ตาม tech note 15 (art-director, 0.25 วัน)
- [ ] (จาก P1-F03-T11) style-guide §3.4 เพิ่ม ramp.skin-1..6 และ ramp.hair-1..6 ตาม avatar-spec §7 · icon-grammar §7–8 ชี้ id สุดท้ายใน asset-pipeline
- [ ] (จาก P1-H04, blocking) map-style.md §9 แถว "map.road บน map.land (ไม่มีขอบ)" ratio 1.16 → 1.22 · `qa/tests/unit/contrast.test.ts` ต้องผ่าน
- [ ] หัวข้อ 6.1: adapter สร้าง property จาก whitelist และ map `status` ที่ไม่รู้จักเป็น `closed` · หัวข้อ 13: ชี้ `qa/tests/unit/map-style.test.ts` แทนคำสั่ง path `.pnpm/`

#### P1-X08 — เติม fixture และลดขนาด excluded (location-engineer, 1 วัน)
- ที่มา: GAP-01, GAP-02, GAP-04 ใน `qa/plans/F01-test-plan.md` (P1-F01-T04)
- (P1-PLAN-SYNC-01) Writes เพิ่ม `data/coverage/excluded.geojson` (GAP-04 ต้องสร้างไฟล์ใหม่), `candidates.geojson` และ `run-meta.json` เพราะการรัน pipeline ซ้ำเขียนไฟล์เหล่านี้ · `candidates.geojson` ต้อง byte-identical กับก่อนแก้ (แนบ SHA-256 ก่อน/หลัง) เพื่อไม่ให้ตัวเลขของ P1-F01-T06 และ report ของ T07 ที่ทำขนานกันเปลี่ยน · ลำดับแนะนำ: ทำหลัง P1-F01-T06 ขนานกับ P1-F01-T07 และต้องเสร็จก่อน QA gate P1-F01-T08
- [ ] fixture ขอบพื้นที่ตรง 2,999 / 3,000 / 150,000 / 150,001 ตร.ม. (ตอนนี้ใช้ 2,990/3,010/149,950/150,050) · fixture blocker วงใน, แตะกันต่ำกว่า partialOverlapShare, geometry ที่ต้อง make_valid, assembly_failed · pytest ผ่านทั้งหมด
- [ ] excluded.geojson ที่ commit มีระยะเผื่อจากเพดาน 5 MiB อย่างน้อย 20% (ตอนนี้ 95%) โดยคง candidates ไม่บีบอัด · ผลรันซ้ำยัง deterministic

#### P1-H08 — ล็อก route factor (product-manager, 0.5 วัน)
- ที่มา: handoff จาก P1-F01-T04 · ต้องเสร็จก่อน P1-F01-T06
- [ ] PRD F01 ระบุค่า route factor (ระยะเส้นตรง × factor = ระยะเดินโดยประมาณ) พร้อมแหล่งอ้างอิงที่ตรวจได้ และวิธีใช้กับเกณฑ์ G1/S1/G4/S3/N3 · หรือระบุว่า T06 ต้องใช้ routing บนเครือข่ายทางเดิน OSM จริง

#### P1-X12 / P1-X13 — แก้ตาม copy gate รอบแรก (narrative-designer / uiux-designer)
- ที่มา: `design/reviews/F03-copy-gate.md` (P1-F03-T21 NEEDS_CHANGES) findings F-01..F-06
- X12: [ ] F-01, F-02 (key: run.hpBarLabel, gps.pillLabel, onboarding.headerLabel, consent.headerLabel, account.loginHeader, run.summary.headerLabel, run.headerZoneLabel), F-04, F-05 ตาม gate · lint:copy 0 FAIL
- X13: [ ] F-03 ทุกจุดในหัวข้อ 6.2/6.3 ของ gate, F-02 ตาราง header→key ใน components.md 2.1 และตัดสิน header ใน run ใช้ `{zoneRealName}` (17) หรือ `{zoneName}` (34), F-06 · ไม่ตัดข้อความให้สั้นลงเอง ถ้าไม่พอดีให้รายงาน

#### P1-X17..P1-X21 — แก้ตาม design gate A รอบแรก
- ที่มา: `design/reviews/F03-design-gate-a.md` (NEEDS_CHANGES) findings F-01..F-15 และคำตัดสิน D-040, D-041, D-052, D-063, D-064, D-065
- X17 uiux (blocking F-01..F-05, ไม่ blocking F-07..F-09) · X18 systems (F-01, F-03 blocking; F-15) · X19 liveops (F-06 blocking; F-14) · X20 narrative (F-10) · X21 game-director (F-12)
- รอบ 2 ของ gate ตรวจเฉพาะ F-01..F-06

#### P1-X23 — แผนที่ดำกับ fixture จริง (tech-lead, 1 วัน, blocking การเดินทดสอบ)
- ที่มา: รายงาน P1-F02-T11 — หลังเปลี่ยนเป็น style จริง (kw-light.style.json) + นับ byte ผ่าน `kw+https` การโหลด `tools/tiles/fixtures/lumpini` ผ่าน `tools/tiles/bin/serve.py` ได้แผนที่ดำ `map.on('load')` ไม่ fire แม้ bypass ตัวนับ byte · metadata ของ source โหลดได้ · ไม่มี error event · ก่อนหน้านี้ P1-F02-T09 (style ชั่วคราว) และ e2e ของ QA (`qa/tests/e2e/f02-map-fixture-tile.spec.ts`) render fixture ได้
- [ ] หาสาเหตุจริง (เช่น glyphs/sprite/font-faces URL, layer/source ใน style จริง, TileJSON vs pmtiles branch, headless-only artifact) พร้อมหลักฐาน
- [ ] แก้ให้แผนที่ลุมพินี render ได้ทั้งแบบ `pmtiles://` และ TileJSON (XYZ) ด้วย style จริง ป้ายไทยขึ้น
- [ ] e2e ใหม่ที่ใช้ fixture จริง + style จริง ยืนยัน `load` fire และ tile render (ไม่พึ่ง network ภายนอก) ผ่านทั้ง android-chrome และ ios-safari
- [ ] root lint/typecheck/test ผ่าน

## 5. Phase Exit Checklist

คัดจากเกณฑ์ผ่านใน `studio/roadmap.md` Phase 1 · ผู้ตรวจต้องแนบหลักฐาน (path, ผล test, ตัวเลข)

### F01 — Coverage Survey
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E1 | จำนวน polygon ที่ใช้ได้แยกรายเขต | qa-tester | `data/coverage/district-counts.csv`, `design/levels/coverage-report.md`, `qa/reports/F01-qa-gate.md` | TODO |
| E2 | รายชื่อ 2–3 ย่านเปิดตัวที่ dungeon หนาแน่นที่สุด | product-manager | `design/levels/coverage-report.md`, `product/reviews/F01-product-gate.md` | TODO |
| E3 | คำแนะนำ Go / ต้องใช้ทางเสริม พร้อมตัวเลขรองรับ | product-manager | coverage report เทียบเกณฑ์ใน `product/prd/F01-coverage-survey.md` | TODO |
| E4 | งานของคน: ยืนยันผล Go / No-go | HUMAN | P1-F01-T11 DONE + รายการใน decision log | TODO |

### F02 — Tech Foundation และ Map/Location Spike
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E5 | test ผ่านใน CI | qa-tester (script CI ในเครื่อง) + HUMAN (run บน GitHub) | output จาก P1-F02-T16 + URL run สีเขียวของ push รอบสุดท้ายจาก P1-F02-T26 (ไม่ใช่ run ของ skeleton ใน T18) | TODO |
| E6 | Mock trace เล่นซ้ำได้และจุดขยับบนแผนที่ | qa-tester | `qa/tests/F02/` output, `qa/reports/F02-qa-gate.md` | TODO |
| E7 | build ที่ deploy ได้ใน local/preview | qa-tester (local) + HUMAN (preview) | QA gate F02 + preview URL จาก P1-F02-T19 | TODO |
| E8 | คู่มือเดินทดสอบพร้อมใช้ | qa-tester | `qa/playtest/field-walk-kit.md`, `field-walk-form.md`, `safety-briefing.md` | TODO |
| E9 | งานของคน: สร้างบัญชี Cloudflare แผน Free ที่ไม่ผูกบัตรและใส่ credential เอง สำหรับ publish tile + preview (ถ้อยคำ roadmap แก้แล้วตาม D-010 · stack/host ตาม D-008 · R2 เมื่ออนุมัติงบ) | HUMAN | P1-F02-T17 DONE + P1-F02-T19 ได้ preview URL ที่ tile ผ่านการตรวจ curl ตาม runbook (XYZ `200` + CORS ตาม D-031 · `206` เฉพาะทางสำรอง PMTiles) | TODO |
| E10 | งานของคน: เดินทดสอบกลางแดด 30 นาทีในสวนและในซอย กรอกผลวัด | HUMAN | `qa/playtest/results/` ครบ 2 สถานที่ (form + summary ไม่มีพิกัด) + `docs/tech/F02-spike-results.md` เทียบเกณฑ์ใน P1-F02-T27 | TODO |
| E11 | (ถอดออกจากเกณฑ์ปิดใน P1-PLAN-02 ตาม PM-M03 · ยืนยันการถอดแล้ว D-009) การยืนยัน backend stack ไม่อยู่ในเกณฑ์ผ่าน F02 ของ roadmap · stack ตัดสินแล้วใน D-008 และ P1-F02-T22 CUT | — | — | ไม่ใช่เกณฑ์ปิด |

### F03 — Game Bible และทิศทางทุกสาย
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E12 | simulator ให้ค่าตรงตาราง GDD (Tanker 1–4 คน = 21.7 / 33.0 / 38.8 / 41.8%) | qa-tester | `design/systems/test-vectors/*.json`, `qa/reports/F03-qa-gate.md` | TODO |
| E13 | copy ผ่านกฎ 6 ข้อ | qa-tester | `design/reviews/F03-copy-gate.md` PASS + ผล script checklist | TODO |
| E14 | ทุก role มีเอกสารทิศทางที่ผ่าน gate (ตรงตาม roadmap "ทุก role" · การอ่านตาม A-P1-PLAN-02-2 ยืนยันแล้ว D-009): role ฝั่ง design/art (รวม vfx-animator) ผ่าน design gate A/B และ content gate · role ฝั่ง tech (tech-lead, gameplay, location, devops, backend) ใช้ ADR 0001/0002 + tech note ที่ผ่าน tech gate · qa-tester ใช้ test plan · producer นอกขอบเขต | product-manager | ตารางเอกสารทิศทางราย role ใน F03 ครบทุกแถว + `design/reviews/F03-design-gate-a.md`, `-b.md`, `art/reviews/F03-visual-gate.md`, `docs/reviews/F02-tech-gate.md` PASS | TODO |
| E15 | งานของคน: ยืนยัน world building | HUMAN | P1-F03-T26 DONE + รายการใน decision log | TODO |

### ปิด Phase 1
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E16 | มีผล Go / No-go จาก F01 + F02 | HUMAN | P1-F01-T11 และ P1-F02-T23 DONE | TODO |
| E17 | ถ้า No-go มีข้อเสนอปรับ design จาก producer ก่อนเข้า Phase 2 | HUMAN | ข้อเสนอใน `studio/decisions/decision-log.md` (หรือ "ไม่จำเป็น" ถ้า Go) | TODO |
| E18 | ทุก task เป็น DONE/CUT และทุก gate PASS (งาน HUMAN ที่ยกยอดตาม A-P1-PLAN-02-4 ระบุชื่อ) | qa-tester | `qa/reports/phase-1-regression.md` จาก P1-CLOSE-QA (มีในตารางแล้ว) | TODO |
| E19 | ข้อมูลพิกัดจริงของคนเดินทดสอบไม่อยู่ใน git (PDPA, TL-M06/MF-3) | qa-tester | ผลตรวจใน `qa/reports/phase-1-regression.md` + `.gitignore` ครอบ `qa/playtest/results/raw/` | TODO |
| E20 | (เพิ่มใน P1-PLAN-03 ตาม D-001, D-002 · producer เพิ่ม ไม่ได้มาจาก roadmap · ยอมรับแล้ว D-009) ไม่มี secret หรือไฟล์ต้องห้ามใน git history ของ repo public และไม่มีบริการใดผูกบัตร | qa-tester (gitleaks + guard) + HUMAN (ยืนยันหน้า Billing) | ผล gitleaks/guard ใน `qa/reports/phase-1-regression.md` + job secret scan สีเขียวใน run ของ P1-F02-T26 + คำยืนยันขั้น 4 ของ P1-F02-T26 | TODO |

## 6. Change log

| วันที่ | โดย | การเปลี่ยนแปลง |
| --- | --- | --- |
| 2026-09-23 | producer (P1-PLAN-01) | สร้าง board ฉบับร่าง 60 task (F01 11, F02 23, F03 26 · agent 52, HUMAN 8, review-gate ของ agent 10) |
| 2026-09-23 | producer (P1-PLAN-02) | ปรับตาม plan review 3 ฉบับ (ทั้งหมด NEEDS_CHANGES): เพิ่ม 7 task (P1-F02-T24 recorded trace, T25 HUMAN สำรองดาวน์โหลด, T26 HUMAN push รอบสุดท้าย, T27 PM ยืนยันเกณฑ์ spike, P1-F03-T27 vfx motion direction, T28 HUMAN ตัดสินความไม่สอดคล้องใน GDD, P1-CLOSE-QA regression) → 67 task (agent 56, HUMAN 11) · แก้ deps: F01-T09/T10 รอ F01-T08, F02-T06 รอ T03, F02-T14 รอ T27, F02-T15 ครอบ tools + ADR 0002, F02-T19 รอ T15, F03-T12 รอ F02-T03, F03-T15 รอ T01, F03-T19 รอ T16, F03-T22/T25 รอ T27, F03-T26 รอ T01 · แก้ Writes: F02-T01 (lockfile + stub package.json), F02-T03 (schema + trace.ts ใน `packages/shared`, เอา `packages/location/package.json` ออก), F01-T05 (requirements.txt) · เพิ่มกฎ path ร่วม, ข้อเสนอ decision ของ tech-lead, คำถามคนที่รอคำตอบ · ถอด E11 ออกจากเกณฑ์ปิด (ไม่อยู่ใน roadmap), แก้ E5, E10, E14, E18, เพิ่ม E19 · wave plan ใหม่ 12 wave · รายละเอียดทุกข้อในหัวข้อ 7 |
| 2026-09-23 | producer (P1-PLAN-03) | ปรับตามคำตอบคน D-001 (ต้นทุนศูนย์ ห้ามผูกบัตร · R2 ใช้ไม่ได้) และ D-002 (repo public + GitHub Actions): จำนวน task คงเดิม 67 (agent 56, HUMAN 11) · แก้ 22 task (รายการในหัวข้อ 8) · deps: P1-F02-T08 เพิ่ม T03, P1-F02-T17 จาก ไม่มี → T03 + T18 (เลื่อนจาก W1 เป็น W3, ไม่อยู่บนเส้นวิกฤต) · Writes: T07 เพิ่ม `.gitleaks.toml`, T08 เพิ่ม `.github/workflows/deploy-preview.yml` · เพิ่มกฎคุมค่าใช้จ่าย, กฎ repo public, ผลที่ตามมาของคำตอบคน ในหัวข้อ 1 · แก้ E9, เพิ่ม E20 · ไม่ตัด gate หรือเกณฑ์ปิด |
| 2026-09-23 | producer (P1-PLAN-04) | rev 4 ปรับตาม D-003..D-010: P1-F02-T22 HUMAN → CUT (D-008) ออกจาก wave W5 · P1-F02-T17 deps จาก T03 + T18 → ไม่มี และย้ายเป็นงานคน W1 · T02 เปลี่ยนเป็นยืนยัน D-008 · T01, T03, T06, T08, T11, T19, T26, F03-T08 แก้ acceptance · E9, E11, E14, E20 ยืนยันตาม D-009/D-010 · roadmap แก้ตาม D-010 · จำนวน task 67 เท่าเดิม (HUMAN ที่ต้องทำ 10) · ไม่ตัด gate หรือเกณฑ์ปิด · รายละเอียดในหัวข้อ 9 |
| 2026-09-23 | producer (P1-PLAN-SYNC-01) | plan-sync ระหว่าง run 1 หลังเพิ่ม H01–H08, X01–X11: แก้ deps 12 งาน, Writes 2 งาน (X05, X08), detail 11 จุด, หลักฐาน E9 ตาม D-031 · เขียนหัวข้อ 3 ใหม่สำหรับงานที่เหลือ (R0–R7) · ไม่เปลี่ยน Status/Output · ไม่ CUT งานใด · ไม่ตัด gate หรือเกณฑ์ปิด · 86 task · รายละเอียดในหัวข้อ 10 |
| 2026-09-24 | producer (P1-CLOSE-PM) | rev 6: P1-F02-T25 HUMAN → CUT (agent ดาวน์โหลดไฟล์ใหญ่ได้เองทั้งหมด ตามหลักฐานใน `qa/reports/phase-1-regression.md` §0, §11 · กติกาใน detail block "ถ้าไม่มีใครต้องใช้จนปิด phase producer เปลี่ยนเป็น CUT") · สถานะ board เป็น COMPLETE — AGENT SIDE, WAITING FOR HUMAN · เนื้อหารายงานปิดส่งใน report ของ P1-CLOSE-PM (เครื่องมือของ subagent ไม่อนุญาตให้เขียนไฟล์รายงาน · orchestrator บันทึกลง `studio/phases/phase-1/report.md`) · ไม่เปลี่ยน deps, Writes, gate หรือเกณฑ์ปิด · 111 task: DONE 97, TODO 3 (P1-F02-T21, P1-F02-T24, P1-CLOSE-QA รอบ 2 · ทั้งหมดรอ P1-F02-T20), HUMAN 9, CUT 2 |

## 7. บันทึกการปรับตามรีวิว (P1-PLAN-02)

ที่มา: `plan-review-tech-lead.md` (TL-*), `plan-review-game-director.md` (MF-*, SF-*, N-*), `plan-review-product-manager.md` (PM-*) · ผล: must-fix 15 ข้อ ใช้ทั้งหมด · ไม่มีการตัด gate หรือเกณฑ์ปิดของ roadmap

### Must-fix
| Finding | ผล | สิ่งที่เปลี่ยน หรือเหตุผล |
| --- | --- | --- |
| TL-M01 | ใช้ | หัวข้อ 1 "กฎ path ร่วม" · P1-F02-T01 Writes รวม lockfile + stub `package.json` ของทุก workspace และติดตั้ง dependency ล่วงหน้า · งานอื่นเพิ่ม dependency ผ่าน handoff ถึง tech-lead · Python pin ต่อโฟลเดอร์ (F01-T05 เพิ่ม `requirements.txt`) |
| TL-M02 | ใช้ | P1-F02-T03 pin Protomaps basemap schema + `pmtiles extract` (planetiler สำรอง) · P1-F03-T12 deps P1-F02-T03 และเริ่มจาก `@protomaps/basemaps` · P1-F02-T06 deps T03 |
| TL-M03 | ใช้ | T03 font stack ไทย + path glyph/sprite + failure mode · T06 สร้าง glyph/sprite · F03-T12 font stack + ทดสอบชื่อถนน · T11 โหลดจาก build/R2 + screenshot zoom 14/16/18 · T08 upload glyph/sprite · T14 ช่องวรรณยุกต์ในแบบฟอร์ม |
| TL-M04 | ใช้ | P1-F02-T03 หัวข้อ "เกณฑ์ spike" พร้อมนิยามวิธีวัดและช่วง Go / เงื่อนไข / No-go · T14 คัดลอกเท่านั้น · T21 เทียบกับเกณฑ์นี้เท่านั้น |
| TL-M05 | ใช้ | P1-F02-T03 Writes เพิ่ม `packages/shared/schemas/gps-trace.schema.json`, `packages/shared/src/trace.ts`, `packages/shared/src/index.ts` · T04, T05, T13, T24 ใช้ `validateTrace` นี้เท่านั้น |
| TL-M06 | ใช้ | T03 กำหนด export `summary` (ไม่มีพิกัด) กับ raw trace (opt-in, ตัดต้น/ปลาย, เวลา relative) · T11 implement · T01 `.gitignore` ครอบ `qa/playtest/results/raw/` · T14, T20 commit ได้เฉพาะ summary + form · เพิ่ม E19 |
| MF-1 | ใช้ | P1-F03-T16 เพิ่มสถานะ HP 30%, ยาอัตโนมัติ, auto-retreat 25% default เปิด (ปิดต้องยืนยัน), ตาย, ออกเอง, tick ไม่ผ่าน gate · ตัวเลขอ้าง config · T17 wireframe ครอบหน้าเหล่านี้ · T05 ครอบ key · T06 เพิ่มค่า 25%/30% ใน `dungeons.json` |
| MF-2 | ใช้ | T16 นาที 0–1 มี consent location แยก, permission, อายุ 15+ + parental consent scaffold, กรณีปฏิเสธ consent · T15 เพิ่มหน้าจอ consent, ความเป็นส่วนตัว, ลบบัญชี, profile ไม่มีตัวตนจริง |
| MF-3 | ใช้ | เหมือน TL-M06 · T20 เพิ่มขั้นยินยอมก่อน export raw · การแปลงเป็น recorded trace ต้องมีความยินยอมเป็นลายลักษณ์อักษร (P1-F02-T24) |
| MF-4 | ใช้ | ลบ "งานวัดในฐานะงาน event" ออกจาก P1-F03-T20 แทนด้วยธง `[HUMAN]` · A-P1-PLAN-02-3 ตัดทุกเขตวัดรวมงานวัดระหว่างรอ · F01-T01/T02/T04 ใช้กฎเดียวกัน · คำถามอยู่ใน P1-F03-T28 |
| MF-5 | ใช้ (ทางเลือก ก) | เพิ่ม P1-F03-T27 vfx-animator motion direction เข้า visual gate และ design gate B · E14 เขียนใหม่ให้ตรง "ทุก role" · เพิ่มตารางเอกสารทิศทางราย role และ gate ที่ผ่านใน F03 · แก้ A-P1-PLAN-01-7 |
| PM-M01 | ใช้ | เกณฑ์ตัวเลขตั้งใน P1-F02-T03 (tech-lead, W2) และ product-manager ร่วมยืนยันใน P1-F02-T27 ใหม่ (W3) ก่อนเริ่ม build หน้าวัด · T14 deps T27 และไม่ตั้งเกณฑ์เอง |
| PM-M02 | ใช้ | P1-F01-T09 และ T10 deps P1-F01-T08 · wave: QA gate W8 → design/product gate W9 |
| PM-M03 | ใช้ | E11 ถอดออกจากเกณฑ์ปิดเพราะเกณฑ์ผ่าน F02 ใน roadmap ไม่มีการยืนยัน stack และ Phase 2 เป็น client-first · เพื่อให้ตรงกติกา roadmap "ปิดงาน HUMAN ก่อน phase ถัดไป" P1-F02-T22 ย้ายไป board Phase 2 ได้ถ้ายังไม่ตอบ และต้องปิดก่อน Phase 3 (A-P1-PLAN-02-4) · แก้ถ้อยคำ T02 ให้ตรงกัน |
| PM-M04 | ใช้ | เพิ่ม P1-CLOSE-QA (qa-tester) ในตารางและ W12 · E18 อ้างงานที่มีจริง |

### Should-fix
| Finding | ผล | สิ่งที่เปลี่ยน หรือเหตุผล |
| --- | --- | --- |
| TL-S01 | ใช้ | P1-F02-T19 deps P1-F02-T15 · แก้คำอธิบาย critical path ให้ตรง deps จริง (T15 และ T14 → T19 → T20) |
| TL-S02 | ใช้ | เพิ่ม HUMAN P1-F02-T26 push รอบสุดท้ายหลัง QA gate F02 · T18 เหลือ push ครั้งแรก · E5 อ้าง T26 |
| TL-S03 | ใช้ | P1-F02-T15 deps เพิ่ม P1-F01-T05, P1-F02-T04, P1-F03-T08 และขอบเขต "hygiene เท่านั้น" ตามหัวข้อ 5 ของรีวิว tech-lead |
| TL-S04 | ใช้ | T01 เลือก e2e runner และรวม `qa/tests/*` ใน workspace/test config · T07 e2e แยก job · T13 ใช้ runner นี้ |
| TL-S05 | ใช้ | ล็อกชื่อ `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` ในหัวข้อ 1 · อยู่ใน acceptance ของ T07 และ T03 (เพิ่ม `VITE_SPRITE_URL` เพราะ sprite โหลดแยกจาก glyph) |
| TL-S06 | ใช้ | T01 commit เฉพาะ path ของตัวเอง · นโยบาย commit เป็นข้อเสนอ decision ในหัวข้อ 1 และอยู่ใน ADR 0001 |
| TL-S07 | ใช้ | T03 นิยามการนับ byte · T11 นับผ่าน `pmtiles` Source + fetch wrapper · T08 ตั้ง `Cache-Control` / `Content-Type` |
| TL-S08 | ใช้ | T06 ส่งมอบ fixture PMTiles เล็กที่ commit ได้ · T09 ใช้ fixture Protomaps demo ชั่วคราว · T11 และ T13 ใช้ fixture ของ T06 |
| TL-S09 | ใช้ | `LocationSample` อยู่ใน `packages/shared` · interface รับ `Clock` ที่ฉีดได้ · นิยาม `timestamp` (T03, T05) |
| TL-S10 | ใช้ | เพิ่ม P1-F02-T24 (location-engineer, deps T20) ไม่อยู่บน critical path ของ T21 · CUT ได้ถ้าไม่มีความยินยอม |
| TL-S11 | ใช้ | เพิ่ม HUMAN สำรอง P1-F02-T25 + A-P1-PLAN-02-1 · F01-T01 ระบุ URL + checksum · T07 CI ใช้ fixture เท่านั้น |
| TL-S12 | ไม่ใช้ | ขัดกับ PM-M03 ซึ่งตรงกับ roadmap มากกว่า (roadmap ไม่ได้ให้การยืนยัน stack เป็นงานคนของ Phase 1 และ Phase 2 เป็น client-first) · การบังคับให้ตอบก่อน Phase 2 เพิ่ม dependency โดยไม่จำเป็น · ใช้ทางยกยอดตาม A-P1-PLAN-02-4 แทน ซึ่งยังเคารพกติกา "ปิดงาน HUMAN ก่อน phase ถัดไป" |
| TL-S13 | ใช้ | T09 เปิด `AttributionControl` · F03-T12 ใส่ `attribution` ใน source · T21 ตรวจว่า attribution ไม่บัง UI |
| SF-1 | ใช้ | เพิ่ม HUMAN P1-F03-T28 · orchestrator ลง decision log/open questions ทันทีเมื่อ T06/T08 รายงาน (หัวข้อ 1) · T25 เปลี่ยนเป็นคำแนะนำ + ยืนยันว่า config ยังเป็นค่า GDD |
| SF-2 | ใช้ | ข้อ exit criterion Phase 4 อยู่ใน P1-F03-T28 ข้อ 2 · → ตัดสินแล้ว D-005: ยอมรับ 2.45 ภายใน tolerance · producer แก้ exit criterion Phase 4 ใน roadmap ไม่แก้ใน board นี้ |
| SF-3 | ใช้ | P1-F03-T08 คำนวณค่ายาจาก damage model ไม่รับ 600 เป็น input |
| SF-4 | ใช้ | P1-F03-T07 รายงานเวลาถึง auto-retreat และถึง HP 0 พร้อมเกณฑ์เสนอ decision |
| SF-5 | ใช้ | P1-F03-T01 เพิ่มกฎคู่ auto-retreat + movement gate, ตารางสถานะ "ที่ยังต้องตัดสินใจ", หัวข้อ "สถานะที่บ้าน" · P1-F03-T15 deps P1-F03-T01 |
| SF-6 | ใช้ | P1-F03-T06 เพิ่ม `config/balance/unlocks.json` · T01, T15, T16 อ้าง `config: unlocks.*` |
| SF-7 | ใช้ | P1-F03-T12 เพิ่มกฎ layer ตำแหน่งของตัวเองเท่านั้น |
| SF-8 | ใช้ | P1-F03-T09 ช่วงขนาด ตัวคูณ drop table อ้าง key ใน `config/balance/` ทั้งหมด |
| SF-9 | ใช้ | F01-T01 กฎตัดวัดที่ tag เป็น historic/attraction และ `building=temple|church|mosque` · F01-T02 หมวดกำกวมเขตพระราชฐาน/อนุสาวรีย์ · F01-T04 case เพิ่ม |
| SF-10 | ใช้ | P1-F02-T01 ADR ประกาศ logic เป็น pure function ใน `packages/shared` และผลบน client ใน Phase 2 ไม่ใช่รางวัลจริง |
| SF-11 | ใช้ | T05 script ตรวจคำระบบต้องห้ามใน `onboarding.*` · T16 ห้ามช่องกรอกข้อความอิสระ และนาที 0–10 ไม่มีทางไประบบต้องห้าม |
| SF-12 | ใช้ | P1-F03-T19 เพิ่ม guardrail auto-retreat/ตาย, สัดส่วนปิด auto-retreat, tick ไม่ผ่าน gate, funnel 5 ช่วง, dungeon ไกลเมื่อเปิดแอป |
| SF-13 | ใช้บางส่วน | ข้อ 1 ใช้: P1-F03-T12 ย้ายจาก W5 ขึ้น W3 · ข้อ 3 ใช้: F01-T06 เป็น optional input ของ T09 และ F01-T09 ส่ง handoff ประเมินผลต่อ pillars/preset/หน้าที่บ้านถ้าไม่ใช่ Go ล้วน · ข้อ 2 ไม่ใช้ตอนนี้: สลับ F01-T06 ขึ้นก่อน F02-T06 ทำให้การเดินทดสอบเลื่อน 1 wave โดยที่ T09 และ T16 ไม่ได้ใช้ผล heatmap ทันไม่ว่าจะเรียงแบบไหน · orchestrator สลับได้ถ้าคนยืนยันว่าวันเดินช้ากว่า W8 (หัวข้อ 3) |
| PM-S01 | ใช้ | P1-F03-T19 metric tree ครบ 6 หมวด |
| PM-S02 | ใช้ | P1-F03-T19 ระบุ event ต่อขั้น onboarding, รางวัลแรก, ปิดแอปเมื่อ dungeon ไกล |
| PM-S03 | ใช้ | P1-F03-T19 deps P1-F03-T16 |
| PM-S04 | ใช้ | P1-F03-T20 ลดเหลือกรอบทิศทาง + ประเภท event + ตัวอย่างไตรมาสแรก · ปฏิทินเต็มเป็นงาน F24 · ลดเวลาเป็น 1–2 วัน |
| PM-S05 | ใช้ | รวมกับ MF-4 · ธง `[HUMAN]` ใน T20 และคำถามใน P1-F03-T28 (ไม่ใช้ P1-F03-T26 เพราะ T26 เป็นเรื่อง world ส่วนนี้เป็นกฎสถานที่) |
| PM-S06 | ใช้บางส่วน | ไม่เพิ่ม product gate หลัง T21 เพราะจะเพิ่ม 1 wave บนเส้นวิกฤตก่อน HUMAN T23 · product-manager มีส่วนตั้งเกณฑ์ล่วงหน้าแล้วใน P1-F02-T27 · T21 เพิ่มคอลัมน์ผลต่อผู้เล่นและ handoff ให้ PM อ่านก่อนส่งคน · T23 ให้คนอ่านเกณฑ์ของ PM ด้วย |
| PM-S07 | ใช้ | F01-T02 cross-read PRD F01 และหน่วยวัดตรงกัน · F01-T03 อยู่ W1 ก่อนมีข้อมูล และหมายเหตุ cross-read · F01-T06 ใช้ทั้งสองไฟล์ |

### Nice-to-have
| Finding | ผล | สิ่งที่เปลี่ยน หรือเหตุผล |
| --- | --- | --- |
| TL-N01 | ไม่ใช้ | W3 เต็มด้วยงานที่ต้องมาก่อน (P1-F02-T27 เกณฑ์ spike, P1-F03-T12 map style ตาม SF-13) · T02 อยู่ W4 เท่าร่างแรก และเมื่อ E11 ไม่ใช่เกณฑ์ปิดแล้ว เวลาให้คนตัดสิน T22 ไม่กดดัน phase |
| TL-N02 | ใช้ | ข้อตกลง config ขั้นต่ำใน P1-F03-T06 และให้ ADR 0001 รับรอง |
| TL-N03 | ใช้ | P1-F02-T09 คำสั่ง dev แบบ HTTPS |
| TL-N04 | ใช้ | P1-F02-T03 ระบุวิธี client โหลด trace |
| TL-N05 | ใช้ | P1-F02-T01 `apps/api` เป็นชื่อจองแบบมีเงื่อนไขตาม ADR 0002 |
| TL-N06 | ใช้ | HUD ภาษาอังกฤษหลัง flag (T11) · สถานะ GPS ใช้ copy key พร้อม fallback แสดง key (T10) |
| TL-N07 | ใช้ | T08 preview `noindex` · T21 ระบุข้อจำกัด r2.dev และ custom domain ก่อน closed beta |
| TL-N08 | ใช้ | T14 kit แบ่งช่วงจอเปิด 20 นาทีกับช่วงเก็บกระเป๋า · แก้ขั้นตอน 3 ของ T20 |
| N-1 | ใช้ | P1-F03-T26 ยืนยัน pillars คู่กับ world (deps เพิ่ม T01) · T24 ตรวจแค่ความสอดคล้องกับ pillars |
| N-2 | ใช้ | P1-F03-T18 ใช้ pillars เป็น optional input ไม่ใช่ deps แข็ง |
| N-3 | ใช้ | P1-F01-T03 เพิ่ม input GDD "10 นาทีแรก" และ pillars |
| N-4 | ใช้ | P1-F03-T20 ห้าม event ที่ผู้เล่นแข่งกันเอง |
| N-5 | ใช้ | P1-F03-T06 `enhance.json` ไม่มีสถานะแตก |
| N-6 | ใช้ | P1-F01-T02 ให้น้ำหนักระยะเดินจากรถไฟฟ้า/ป้ายรถเมล์มากกว่าที่จอดรถ |
| N-7 | ใช้ | P1-F03-T16 ประกาศ key กลุ่ม `gps.*` · P1-F02-T10 ใช้ชื่อนั้น (ไม่เป็น deps แข็งเพราะ T16 เสร็จ W3 ก่อน T10 ใน W5 อยู่แล้ว) |
| N-8 | ไม่ใช้ | spec F04 เป็นงานของ Phase 2 และไม่อยู่ใน exit ของ Phase 1 · เพิ่มตอนนี้เสี่ยงทำก่อนรู้ผล Go/No-go ของ coverage · producer จะวางเป็นงานแรกตอนวางแผน Phase 2 |
| PM-N01 | ไม่ใช้ | simulator economy/drop/party เป็นสิ่งส่งมอบใน roadmap F03 ("damage, exp curve, gear, economy") และ exit criterion "simulator ให้ค่าตรงตาราง GDD" · อัตรารางวัล party ต่อหัวจำเป็นต่อการตัดสินข้อ Support ใน P1-F03-T28 · ขนาดงานยังอยู่ใน 2–3 วัน |
| PM-N02 | ใช้ (ยกไป Phase 2) | บันทึกใน "งานที่ยกไปให้การวางแผน Phase 2" หัวข้อ 1 |

### ตรวจความสอดคล้องหลังปรับ
- ทุกงานใหม่ (P1-F02-T24, T25, T26, T27, P1-F03-T27, T28, P1-CLOSE-QA) มีแถวในตารางและ detail block
- ภายในแต่ละ wave ในหัวข้อ 3: ไม่มี agent ซ้ำ, ไม่เกิน 6 งาน, Writes ไม่ชนกัน (`.env.example` อยู่ W2 และ W5, `apps/client/` อยู่ W3, W5, W6, `tools/sim/` อยู่ W2 และ W4, lockfile มีแค่ W1)
- งาน agent ไม่มีงานใดขึ้นกับ HUMAN ยกเว้น P1-F02-T21 และ P1-F02-T24 (ต้องใช้ผลเดินจริงโดยธรรมชาติ)
- ไม่มีการตัด gate หรือเกณฑ์ปิดของ roadmap · E11 ที่ถอดออกเป็นเกณฑ์ที่ producer เพิ่มเองในร่างแรก ไม่ได้มาจาก roadmap (ให้คนรับทราบตอนตรวจ board)

## 8. บันทึกการปรับตามคำตอบคน (P1-PLAN-03)

ที่มา: `studio/decisions/decision-log.md` D-001 (ต้นทุนศูนย์ ห้ามผูกบัตรกับบริการใด รวม R2) และ D-002 (repo public + GitHub Actions) · คนตอบ 2026-09-23 "ต้องการทุกอย่างแบบฟรีก่อน" · คำถามอื่นที่ยังรอ ณ rev 3 (รุ่นมือถือ, Support 25/50, อัตราส่วน 2.45, งานวัด, การถอด E11, การอ่าน E14) ได้คำตอบครบแล้วใน D-003..D-009 (ดูหัวข้อ 9) · ไม่มีคำถามค้าง
หมายเหตุ: ข้อความในหัวข้อ 7 (เช่น TL-M03 "โหลดจาก build/R2") เป็นบันทึกประวัติของ rev 2 ไม่แก้ย้อนหลัง · สิ่งที่ใช้จริงคือ detail block ในหัวข้อ 4

### หัวข้อ 1 (บริบท)
| ส่วน | สิ่งที่เปลี่ยน |
| --- | --- |
| สถานะ board | rev 3 |
| A-P1-PLAN-01-4 | จาก "upload ขึ้น R2" เป็น publish บน host ฟรีที่ไม่ผูกบัตรตามที่ P1-F02-T03 เลือก |
| กฎ path ร่วม (env) | เพิ่มชื่อกลาง `TILES_PUBLIC_BASE_URL` แทน `R2_PUBLIC_BASE_URL` · ตัดชื่อ env ที่ผูกกับ R2 ทั้งหมด · env ของ host เพิ่มโดย T08 ใน W5 · `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` คงเดิม |
| ใหม่: กฎคุมค่าใช้จ่าย (D-001) | ห้ามผูกบัตร / ห้ามเปิดแผนที่เสียเงิน ทุกงาน infra และ HUMAN · ถ้าทำฟรีไม่ได้ให้รายงานคำถาม HUMAN แทนการทำต่อ · ADR/tech note ต้องระบุเพดาน free tier พร้อม URL และวันที่ |
| ใหม่: กฎ repo public (D-002) | ห้าม commit secret, `.env*` ที่มีค่า, raw trace, ข้อมูลส่วนบุคคล, ไฟล์ดิบใหญ่ · ป้องกันสามชั้น: `.gitignore` (T01) → gitleaks + guard ใน CI (T07) → secret scanning + push protection ของ GitHub (T18) |
| คำตอบจากคน | เพิ่ม "ผลที่ตามมา": PMTiles บน R2 ตาม GDD คงเป็นเป้าระยะยาว เลื่อนจนกว่าคนอนุมัติค่าใช้จ่าย · tile URL เป็น config จึงย้ายภายหลังได้ถูก · เพดานไฟล์ของ host ฟรี · ADR 0002 เทียบเฉพาะแผนฟรี · GDD และเอกสาร studio จะเปิดเผยสาธารณะ (ผลที่รู้ล่วงหน้า) · license ยังไม่เลือก · roadmap ยังเขียน R2 (เสนอแก้เมื่อคนสั่ง) |

### งานที่เปลี่ยน
| Task | สิ่งที่เปลี่ยน |
| --- | --- |
| P1-F01-T11 (HUMAN) | เพิ่มบรรทัดกฎคุมค่าใช้จ่าย |
| P1-F02-T01 | `.gitignore` ขยาย: `.dev.vars`, `*.pem`, `*.key`, `*.osm.pbf`, `*.tif`, โฟลเดอร์ดาวน์โหลดของ coverage, `*.pmtiles` นอก fixtures · แนบผล `git check-ignore -v` · acceptance ใหม่: ADR 0001 ระบุ repo public และผลที่ตามมา + บริการต้องเป็น free tier ไม่ผูกบัตร |
| P1-F02-T02 | เทียบเฉพาะแผนฟรีไม่ผูกบัตร: Cloudflare Workers Free + D1 + DO (ตรวจว่า DO ใช้บน Free ได้) เทียบ Supabase Free + PostGIS · ระบุเพดาน free tier และการ pause ของ Supabase Free · ต้นทุนเมื่อเกิน free tier เป็นข้อมูลประกอบเท่านั้น · เพิ่มกฎคุมค่าใช้จ่าย · แก้ชื่อในตาราง |
| P1-F02-T03 | acceptance ใหม่ "host ของ tile และ preview": เทียบ GitHub Pages กับ Cloudflare Pages/Workers แผน Free, ตารางเพดาน, หลักฐาน range request (`206`), CORS, เลือก host + งบขนาด tile + ลำดับทางแก้ · env map จาก `TILES_PUBLIC_BASE_URL` · รวมข้อ `LocationSample` กับ `LocationProvider` เป็นข้อเดียวเพื่อคง 6 ข้อ · แก้ชื่อในตาราง · ขนาดงานคง 3 วัน |
| P1-F02-T06 | ทุกไฟล์ที่ publish ต้องไม่เกินเพดานของ host (ลด maxzoom → clip bbox → แบ่งไฟล์) · ค่าเพดาน/maxzoom/bbox อยู่ใน config ของ script · size report เทียบเพดานและกรณี R2 · เพิ่มกฎคุมค่าใช้จ่าย · แก้ชื่อในตาราง |
| P1-F02-T07 | เพิ่ม secret scan ด้วย gitleaks CLI บน history ทั้งหมด + `.gitleaks.toml` · เพิ่ม guard ไฟล์ต้องห้าม (raw trace, `.env*`, `*.pmtiles` นอก fixtures, `*.osm.pbf`, ไฟล์ใหญ่) · `.env.example` ตัดชื่อ R2/Cloudflare ออก · เพิ่มกฎคุมค่าใช้จ่าย · Writes เพิ่ม `.gitleaks.toml` · ขนาดงาน 1–2 → 2 วัน |
| P1-F02-T08 | เขียนใหม่: infra บน host ฟรีที่ T03 เลือก (GitHub Pages ผ่าน `deploy-preview.yml` แบบ `workflow_dispatch` ไม่ commit tile ใหญ่ หรือ Cloudflare Pages Free) · script publish ตรวจขนาดไฟล์ · runbook เปลี่ยนเป็น `infra/runbooks/preview-setup.md` พร้อมคำสั่ง `curl` ตรวจ `206` · ไม่มี R2 · deps เพิ่ม P1-F02-T03 · Writes เพิ่ม `.github/workflows/deploy-preview.yml` |
| P1-F02-T11 | tile ใน preview มาจาก host ฟรีผ่าน `VITE_TILES_URL` · รองรับ maxzoom ที่ลดด้วย overzoom · glyph/sprite จาก build หรือ host เดียวกับ tile |
| P1-F02-T14 | input runbook เปลี่ยนเป็น `infra/runbooks/preview-setup.md` |
| P1-F02-T15 | ตรวจผล gitleaks + guard, ไม่มีบริการผูกบัตร, ไม่มีชื่อ env ของ R2 |
| P1-F02-T17 (HUMAN) | เขียนใหม่: เปิด host ฟรีตาม tech note (ทาง ก GitHub Pages ไม่ต้องสมัครใหม่ · ทาง ข Cloudflare Free token สิทธิ์ Pages เท่านั้น) · ห้ามผูกบัตรและหยุดทันทีถ้าถูกถาม · ตัดขั้น R2 ทั้งหมด · deps จาก ไม่มี → P1-F02-T03, P1-F02-T18 |
| P1-F02-T18 (HUMAN) | repo **public** (ลบคำว่า private) · ขั้นทวนเนื้อหาที่จะเปิดเผยก่อน push · เปิด secret scanning + push protection · ตรวจ `git status` ก่อน push · ห้าม bypass push protection · ใช้ GitHub Free เท่านั้น |
| P1-F02-T19 (HUMAN) | เขียนใหม่: publish + deploy บน host ฟรี (Run workflow หรือคำสั่ง Cloudflare) · ตรวจ `206` · ห้ามอัปเกรดเมื่อเกินโควตา · ตัดขั้น CORS ของ bucket |
| P1-F02-T20 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย และย้ำว่า raw trace อยู่ใน `raw/` เท่านั้นเพราะ repo public |
| P1-F02-T21 | แทนหมายเหตุ r2.dev ด้วยข้อจำกัดของ host ฟรี และทางไป production (R2 + custom domain) ที่ต้องมี decision อนุมัติค่าใช้จ่าย |
| P1-F02-T22 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย · อ่านส่วน Free tier limits ของ ADR 0002 |
| P1-F02-T23 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย · เงื่อนไขที่ต้องใช้เงินเป็น decision แยก |
| P1-F02-T25 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย และห้าม commit ไฟล์ที่ดาวน์โหลด |
| P1-F02-T26 (HUMAN) | ตรวจ `git status` ก่อน push, ห้าม bypass push protection, ขั้น 4 ยืนยันว่าไม่มีบัญชีใดผูกบัตร · ปลดล็อก E20 |
| P1-F03-T26 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย และหมายเหตุว่า world/pillars จะเปิดเผยใน repo public |
| P1-F03-T28 (HUMAN) | เพิ่มกฎคุมค่าใช้จ่าย |
| P1-CLOSE-QA | รัน gitleaks + guard บน history ทั้งหมดอีกครั้ง และตรวจว่าไม่มี config ผูก R2/บริการเสียเงิน |

### Exit checklist, wave และ critical path
- E9: ถ้อยคำ roadmap "บัญชี Cloudflare/R2" ตีความตาม D-001 เป็น host ฟรีไม่ผูกบัตร · หลักฐานเพิ่ม preview URL ที่ tile ตอบ `206`
- E20 ใหม่ (producer เพิ่ม ไม่ได้มาจาก roadmap): ไม่มี secret/ไฟล์ต้องห้ามใน history ของ repo public และไม่มีบริการใดผูกบัตร · ผู้ตรวจ qa-tester + HUMAN
- Wave: P1-F02-T17 ย้ายจาก W1 (งานคนเริ่มทันที) ไป W3 หลัง P1-F02-T18 · งาน agent ทุก wave คงเดิม · P1-F02-T08 ยังอยู่ W5 (deps ใหม่ T03 เสร็จ W2)
- Critical path ไม่เปลี่ยน: T17 มีเวลาถึง W7 ก่อน T19 · ความเสี่ยงใหม่บนเส้นวิกฤตคือ P1-F02-T06 ต้องผ่านเพดานไฟล์ ถ้าไม่ผ่านจะเป็นคำถาม HUMAN ก่อน T11 (W6)

### ตรวจความสอดคล้องหลังปรับ
- ไม่มีข้อความ "private repo" หรือขั้นตอนเปิด R2 เหลือในตาราง, detail block, exit checklist (ยกเว้นบันทึกประวัติหัวข้อ 7 และการอ้าง R2 ในฐานะเป้าระยะยาว)
- Writes ภายใน wave ไม่ชน: `.github/workflows/` W2 (T07) กับ `deploy-preview.yml` W5 (T08) · `.gitleaks.toml` W2 · `.env.example` W2 (T07) และ W5 (T08) · `.gitignore` W1
- งาน agent ยังไม่ขึ้นกับ HUMAN ยกเว้น P1-F02-T21 และ T24 เท่าเดิม (T08 ขึ้นกับ T03 ซึ่งเป็นงาน agent)
- ไม่ตัด gate หรือเกณฑ์ปิดใด · จำนวน task 67 เท่าเดิม

## 9. บันทึกการปรับตามคำตอบคน (P1-PLAN-04)

ที่มา: `studio/decisions/decision-log.md` D-003..D-010 · คนตอบ 2026-09-23 "ทำทุกอย่างให้ฟรีและง่ายสำหรับการ scale ที่สุด ตัดสินใจได้เลย" · orchestrator แก้ D-003..D-007 ในหัวข้อ 1, T01, T18, T20, T28 ไว้ก่อนแล้ว งานนี้ทวนความสอดคล้องและใช้ D-008..D-010 · หัวข้อ 7 และ 8 เป็นบันทึกประวัติ ไม่แก้ย้อนหลัง (ยกเว้นหมายเหตุหัวข้อ 8 ว่าคำถามค้างได้คำตอบแล้ว)

### หัวข้อ 1 (บริบท)
| ส่วน | สิ่งที่เปลี่ยน | ที่มา |
| --- | --- | --- |
| สถานะ board | rev 4 · ไม่มีคำถามคนค้างที่ขวาง W1 | D-003..D-010 |
| A-P1-PLAN-01-3 | ยืนยันแล้ว (repo public สร้างแล้ว) | D-002, D-007 |
| A-P1-PLAN-01-4 | host = Cloudflare Pages / Workers static assets แผน Free · GitHub Pages สำรองชั่วคราว | D-008 |
| A-P1-PLAN-02-2 | การอ่าน E14 ยืนยันแล้ว | D-009 |
| A-P1-PLAN-02-4 | เหลือเฉพาะ P1-F03-T28 ที่ยกยอดได้ · P1-F02-T22 ไม่ยกยอดเพราะ CUT | D-008, D-009 |
| กฎ path ร่วม (env) | env ของ host = `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (เพิ่มโดย T08 ใน W5) · ชื่อ Pages project อยู่ใน config ของ `infra/` | D-008 |
| กฎคุมค่าใช้จ่าย | ถอด P1-F02-T22 ออกจากรายการงานตัดสินใจล้วน | D-008 |
| คำตอบจากคน | หัวตารางเปลี่ยนจาก "ยังไม่ได้คำตอบ" เป็นรายการคำถามและคำตอบ · เพิ่ม 3 แถว: stack/host (D-008), E11/E14/E20 (D-009), roadmap (D-010) | D-008..D-010 |
| ผลที่ตามมา | host ไม่ต้องเลือกใน T03 แล้ว · ทางแก้หลักของเพดานไฟล์คือแบ่งตามพื้นที่ · ADR 0002 ยืนยัน D-008 · roadmap แก้แล้ว | D-008, D-010 |
| งานที่ยกไป Phase 2 | เหลือ P1-F03-T28 ถ้ายังเปิด | D-008 |

### งานที่เปลี่ยน
| Task | สิ่งที่เปลี่ยน | ที่มา |
| --- | --- | --- |
| P1-F02-T01 | เพิ่ม `wrangler` ในรายการ dependency ที่ติดตั้งล่วงหน้า (T08 ใน W5 เขียน lockfile ไม่ได้ตามกฎ path ร่วม) | D-008, TL-M01 |
| P1-F02-T02 | เขียนใหม่: ADR 0002 **ยืนยัน** D-008 ไม่ใช่เลือก stack · Supabase Free เป็นทางที่ไม่เลือกพร้อมเหตุผล (pause เมื่อไม่ใช้งาน, realtime/DO คนละโมเดล, ต้องย้าย vendor) · ตารางเพดาน Workers Free, DO Free แบบ SQLite, D1 Free, Pages พร้อม URL และวันที่ · ประมาณการโหลด Phase 2–3 · ทางขยาย Workers Paid + R2 บัญชีเดิม · ถ้าชิ้นใดไม่ฟรีรายงานคำถาม HUMAN · ชื่อในตารางเปลี่ยนตาม · 6 ข้อ acceptance | D-008 |
| P1-F02-T03 | หัวข้อ host: Cloudflare เป็น host หลัก (ไม่เลือกใหม่) · GitHub Pages สำรอง · ลำดับทางแก้ใหม่: แบ่งตามพื้นที่ + manifest → ลด maxzoom → GitHub Pages สำรอง · คงหลักฐาน range request `206` บน `*.pages.dev` · ชื่อในตารางเปลี่ยนตาม | D-008 |
| P1-F02-T06 | เพดานเป้าหมายเป็นของ Cloudflare · แบ่งไฟล์ตามพื้นที่เป็นหลักพร้อม manifest · ตรวจจำนวนไฟล์ต่อ deploy · size report รายงานวิธีแบ่ง | D-008 |
| P1-F02-T08 | infra เป็นของ Cloudflare Pages Free: `_headers`, `wrangler pages deploy` ใน `deploy-preview.yml` อ่าน secret จาก Actions · GitHub Pages เป็น job สำรองที่ปิดไว้ · `.env.example` เพิ่มสองชื่อ · ทางขยาย Workers Paid + R2 บัญชีเดิม · Writes เท่าเดิม | D-008 |
| P1-F02-T11 | preview โหลด tile จาก Cloudflare Pages และเลือกไฟล์ตามพื้นที่จาก manifest | D-008 |
| P1-F02-T17 (HUMAN) | เขียนใหม่: สมัคร Cloudflare Free ไม่ผูกบัตร, สร้าง Pages project `keep-walking-preview` (Direct Upload), API token สิทธิ์ Pages (Workers/D1 เฉพาะเมื่อ runbook ระบุ), เก็บใน GitHub Actions secret และ `.env.local` หลัง T01 · หยุดทันทีที่หน้าใดถามบัตร · **deps จาก T03 + T18 → ไม่มี** (host ตัดสินแล้ว, repo มีแล้วตาม D-007) · ย้ายเป็นงานคน W1 | D-007, D-008 |
| P1-F02-T19 (HUMAN) | ขั้น 1–2 ใช้ Cloudflare เป็นทางหลักผ่าน workflow · GitHub Pages เฉพาะเมื่อสั่ง | D-008 |
| P1-F02-T22 (HUMAN) | **CUT** เหตุผล "ตัดสินแล้วใน D-008 (คนมอบให้ orchestrator ตัดสิน)" · ไม่มี task ใดมี deps ถึงงานนี้ (ตรวจแล้ว) · ออกจาก wave W5 · detail block เหลือสถานะและเหตุผล | D-008 |
| P1-F02-T26 (HUMAN) | ขั้น 4 ยืนยัน Billing ทั้ง GitHub และ Cloudflare (ไม่ใช่ "ถ้ามี") | D-008 |
| P1-F03-T08 | ข้อ economy เทียบ config key `economy.incomeToPotionRatio` และเสนอ decision เฉพาะเมื่อหลุดช่วง (เดิมยังเขียนให้เสนอ decision รวมใน T28 ซึ่งค้างจากก่อน D-005) | D-005 |
| ตารางเอกสารทิศทาง (F03) | แถว backend-programmer ไม่อ้าง HUMAN P1-F02-T22 แล้ว | D-008 |

### ทวน D-003..D-007 (orchestrator แก้ไว้แล้ว)
- D-003: T14, T20 รองรับ Android + iOS, iOS จดแบตเอง · สอดคล้อง ไม่ต้องแก้
- D-004: T06, T08, T25, T28 และข้อสังเกตหัวข้อ 1 ใช้ 25/50 เป็นข้อยกเว้นโดยเจตนา · สอดคล้อง
- D-005: T07, T25, T28, SF-2 สอดคล้อง · แก้ T08 ที่ค้าง (ตารางด้านบน) · roadmap Phase 4 แก้แล้ว
- D-006: A-P1-PLAN-02-3, F01-T01/T02/T04, F03-T20, T28 สอดคล้อง
- D-007: T01 (remote origin ไม่ push), T18 (ขั้น 2 เสร็จแล้ว) สอดคล้อง · ใช้เป็นเหตุผลให้ T17 ไม่ต้องรอ T18

### Exit checklist, wave และ critical path
- E9: ถ้อยคำตรงกับ roadmap ที่แก้แล้ว (บัญชี Cloudflare Free ไม่ผูกบัตร) · หลักฐานเดิม (T17 DONE + T19 preview URL ตอบ `206`)
- E11: ยืนยันการถอดแล้ว (D-009) · E14: การอ่านยืนยันแล้ว (D-009) · E20: ยอมรับแล้ว (D-009) · ไม่มีการตัดหรือเพิ่มเกณฑ์ปิด
- Wave: งาน agent ทุก wave คงเดิม · งานคน W1 เพิ่ม P1-F02-T17 · W3 เหลือ P1-F02-T18 · W5 เหลือ P1-F03-T28
- Critical path ไม่เปลี่ยน · T17 เริ่มเร็วขึ้นจาก W3 เป็น W1 จึงมีเวลาถึง W7 มากขึ้น · ความเสี่ยงบนเส้นวิกฤตยังเป็น T06 ผ่านเพดานไฟล์ของ Cloudflare (ทางแก้: แบ่งตามพื้นที่ แล้ว GitHub Pages สำรอง)

### roadmap (ตาม D-010 เท่านั้น)
- บรรทัดสถานะ: เพิ่ม "ปรับตาม D-010 เมื่อ 2026-09-23"
- Phase 1 F02 ส่งมอบ: "upload R2" → "publish บน Cloudflare Free ที่ไม่ผูกบัตร (R2 เมื่ออนุมัติงบ)"
- Phase 1 F02 งานของคน: "บัญชี Cloudflare/R2" → "บัญชี Cloudflare แผน Free ที่ไม่ผูกบัตร (R2 เมื่ออนุมัติงบ)"
- ตารางภาพรวม Phase 4: "2.5–3 เท่า" → "อยู่ในช่วง config (ต่ำสุด 2.45, เป้า 2.5–3) ตาม D-005"
- เกณฑ์ปิด Phase 4 ใต้ F12: แก้ถ้อยคำเดียวกัน เพราะ D-005 และ D-010 อนุมัติการแก้ "เกณฑ์ปิด Phase 4" และถ้าไม่แก้ roadmap จะขัดกันเองสองจุด
- ไม่แตะส่วนอื่น (รวมคำว่า "ADR เลือก stack ... เทียบ Supabase" ใน F02 ซึ่งยังไม่ขัดเพราะ ADR 0002 ยังบันทึกการเทียบ)

### ตรวจความสอดคล้องหลังปรับ
- deps: ไม่มีงานใดอ้าง P1-F02-T22 · T17 ไม่มี deps · งาน agent ยังไม่ขึ้นกับ HUMAN ยกเว้น P1-F02-T21 และ T24 เท่าเดิม
- Writes ภายใน wave ไม่ชน: T08 ยังเป็นเจ้าของเดียวของ `.env.example` และ `deploy-preview.yml` ใน W5 · `wrangler` อยู่ใน lockfile ของ T01 (W1) · T17 ไม่เขียนไฟล์ใน repo
- จำนวน task 67 เท่าเดิม (agent 56, HUMAN 11 โดย CUT 1 · HUMAN ที่ต้องทำ 10 รวมงานสำรอง T25)
- ไม่มีข้อความ "รอคำตอบ" ของคำถามที่ตอบแล้วเหลือในหัวข้อ 1–5

## 10. Plan-sync 01 (run 1)

ที่มา: P1-PLAN-SYNC-01 (producer, 2026-09-23) หลัง run 1 ผ่านไปราว 5 wave และ orchestrator เพิ่ม H01–H08, X01–X11 · อ่าน: ตาราง, detail, exit checklist, `ledger.md`, `decision-log.md` (ถึง D-054), protocol, roadmap Phase 1
หลักที่ใช้: ไม่แตะคอลัมน์ Status และ Output ของงานใด (รวมงาน IN_PROGRESS: P1-H02, P1-F03-T27, P1-X04, P1-F03-T13, P1-F02-T06) · แก้เฉพาะ Deps, Writes และข้อความ detail

### ผลตรวจ
- งานซ้ำ: ไม่พบ · X01/X02 เป็นเอกสารคนละไฟล์คนละเจ้าของ · H06 กับ screenshot ใน T11 ต่างบทบาท (dev ตรวจตัวเอง เทียบ QA อิสระ) · H04 เป็นหลักฐานประกอบ visual gate T22 ไม่ซ้ำกับ gate
- วงจร deps: ไม่พบทั้งก่อนและหลังแก้ (ตรวจสายยาวสุด H02 → X05 → X07 → T15 → T19 → T20 → T21 → CLOSE-QA และ T26 ไม่มีงานใดขึ้นกับมัน)
- lockfile: P1-H02 → P1-X05 เรียงด้วย deps ถูกต้อง · detail ของ H02 เดิมเขียน "ไม่แก้ lockfile" ขัดกับ Writes ในตาราง → แก้ detail ให้ตรงตาราง
- ทุกงาน H และ X มี detail block อยู่แล้ว (X01/X02 ใช้ block ร่วม) · ไม่ต้องเพิ่ม block ใหม่
- CUT: ไม่มี · ไม่มีงานใดนอกขอบเขต Phase 1 · P1-F02-T25 (สำรอง) ยังคงไว้เพราะ P1-F02-T06 อาจต้องดาวน์โหลด tile · เปลี่ยนเป็น CUT ตอนปิด phase ถ้าไม่มีใครใช้

### Deps ที่แก้ (12 งาน)
| งาน | เพิ่ม | เหตุผล |
| --- | --- | --- |
| P1-F01-T06 | P1-X04, P1-F01-T02 | T06 ต้องอ่าน `coverageFilter.walkGraphSnapMaxDistance_m`, route factor สำรอง, `educationAllowOsmIds` ฯลฯ ที่ X04 เพิ่มใน `dungeons.json` · T02 (DONE) เป็น input launch criteria ที่ detail อ้างแต่ deps ไม่มี |
| P1-F02-T11 | P1-X05 | ใช้ style-spec ที่ X05 ติดตั้ง และรับการเปลี่ยนชื่อ option ของ `WebLocationOptions` ถ้ามี · X05 อยู่ R1 ขนานกับ T10 จึงไม่ยืดเส้น |
| P1-F02-T13 | P1-F02-T06 | e2e ต้องใช้ fixture tile ของ T06 ตาม acceptance |
| P1-F02-T15 | P1-H02, P1-X04, P1-X05, P1-X07 | hygiene ของ `tools/copy-lint/`, vectors ที่ไม่ฝังเลข, lint/vitest config และ pytest ของ coverage ใน CI อยู่ในขอบเขต tech gate |
| P1-F02-T19 (HUMAN) | P1-F02-T18 | workflow deploy-preview รันบน GitHub จึงต้องมี repo ที่ push แล้ว · เพิ่มขั้น 0 ให้คน push โค้ดล่าสุด |
| P1-F02-T26 (HUMAN) | P1-H06, P1-F02-T24 | push รอบสุดท้ายต้องอยู่หลังงานสุดท้ายที่เขียนไฟล์ใน repo (`qa/tests/unit/`, `data/gps-traces/recorded/`) |
| P1-F03-T22 | P1-X06, P1-H04 | map-style.md ต้องแก้ตาม tech note ก่อนตรวจ · ผล contrast อัตโนมัติเป็นหลักฐานของ acceptance "contrast ผ่านเกณฑ์กลางแดด" |
| P1-F03-T24 | P1-X01 | pillars อยู่ในขอบเขต gate A และต้องใช้ชื่อ config key จริงก่อน |
| P1-F03-T25 | P1-X04 | `config/balance/*` และ `tools/sim/` อยู่ในขอบเขต gate B |
| P1-H06 | P1-H07 | จอ S4 ของ map-style 10.1 ต้องเห็นโซนดำและเส้นจังหวัดจาก `data/map/` |
| P1-X05 | P1-X04 | override eslint ของ `vectors*.ts` ขึ้นกับว่า X04 ลบ `eslint-disable` แล้วยังต้องการหรือไม่ |
| P1-CLOSE-QA | P1-H06 | เป็นงาน agent เดียวที่ไม่ถูกครอบโดย deps ของ CLOSE-QA ทางอ้อม (งาน H/X อื่นถูกครอบผ่าน T15, T16, F01-T08, T21, T22, T24, T25) |

### Writes ที่แก้ (2 งาน)
- P1-X05: เพิ่ม `packages/location/src/web/`, `packages/location/test/` (เฉพาะถ้าเปลี่ยนชื่อ option) · เดิมมีแค่ `types.ts` ซึ่งถ้าเปลี่ยนชื่อ field จะทำให้ implementation และ test พังโดยแก้ไม่ได้ · ห้ามแตะ `apps/client/` เพราะ T10 เขียนอยู่ใน R เดียวกัน
- P1-X08: เพิ่ม `data/coverage/excluded.geojson`, `candidates.geojson` (ต้อง byte-identical), `run-meta.json` (ถ้า pipeline เขียน) · GAP-04 ต้องสร้าง excluded ใหม่แต่ Writes เดิมไม่มีไฟล์นี้ · ใช้ path ร่วมกับ P1-F01-T06 ได้เพราะเจ้าของเดียวกันและจัดคนละ R

### Detail ที่แก้ (11 จุด)
- P1-H02: เปลี่ยน "ไม่แก้ lockfile" เป็นกติกาเจ้าของ lockfile เดียวใน wave + handoff config ไป X05
- P1-X05: กติกาไม่ทำให้ API ของ `packages/location` ที่ T10 ใช้พัง (คง alias แบบ deprecated ถ้าเปลี่ยนชื่อ) และรับ handoff config ของ H02
- P1-X08: เหตุผลของ Writes ใหม่, ต้องแนบ SHA-256 ของ candidates ก่อน/หลัง, ลำดับหลัง F01-T06 ขนานกับ F01-T07
- P1-H06: deps H07 และให้ขั้นกลางแดดด้วยคนจริงอยู่ในคู่มือ T14
- P1-F01-T06: เหตุผลของ deps X04 และอ้าง routing ตาม PRD 8.1 (H08)
- P1-F02-T11: deps X05, โหลด `data/map/*.geojson` ผ่าน `setData` พร้อมทางสำรองเป็น FeatureCollection ว่าง (ไม่ผูก H07 เป็น deps เพื่อไม่ยืดเส้นวิกฤต), แยก `apps/client/.env.example` ออกจาก `.env.example` ที่ root
- P1-F02-T14: เพิ่ม acceptance ขั้นทดสอบกลางแดดของ map style (map-style 10.2) ใน kit และ form
- P1-F02-T15: เหตุผลของ deps ใหม่ และ `tools/coverage/boundaries/` ไม่ขวาง gate
- P1-F02-T19: เพิ่มขั้น 0 (ยืนยัน T18 และ push โค้ดล่าสุด) · แก้ขั้น 4 จาก "ตอบ 206 เสมอ" เป็นการตรวจตาม D-031 (XYZ `200` + CORS · `206` เฉพาะทางสำรอง PMTiles)
- P1-CLOSE-QA: เพิ่ม acceptance ว่าทุกงาน H/X เป็น DONE หรือ CUT และตรวจ hygiene ของ `tools/coverage/boundaries/` ถ้า T15 ไม่ได้ตรวจ

### Exit checklist
- E9: แก้เฉพาะคอลัมน์หลักฐานให้ตรง D-031 (Cloudflare Pages ไม่ตอบ `206` · tile เป็น XYZ) · ตัวเกณฑ์ ผู้ตรวจ และสถานะไม่เปลี่ยน · ไม่ตัดหรือเพิ่มเกณฑ์ใด

### หัวข้อ 3
- เขียนใหม่ทั้งหมดสำหรับงานที่เหลือ: จำนวนงานตามสถานะปัจจุบัน, แผน R0–R7, กฎสลับที่ orchestrator ใช้ได้เอง, critical path สี่สาย และคอขวดทรัพยากรพร้อมลำดับที่เสนอ
- จุดที่ต้องการการกระทำตอนนี้: เติม P1-F02-T08 เข้า R0 · ส่ง HUMAN P1-F02-T17 และ P1-F02-T18 ถึงคนทันที (ต้องเสร็จก่อนจบ R3 มิฉะนั้นเป็นเส้นวิกฤต) · ไม่เพิ่มงานให้ gameplay-programmer จนกว่า T11 จะ DONE

### ตรวจความสอดคล้องหลังปรับ
- Status และ Output ทุกแถวเหมือนก่อนแก้ · จำนวน task 86 (DONE 41, IN_PROGRESS 5, TODO 29, HUMAN 10, CUT 1)
- ทุก R มีไม่เกิน 6 งาน agent และไม่มี agent ซ้ำ · Writes ภายใน R ไม่ชน (ตรวจ R1: apps/client เทียบ root config และ `packages/location` · R2: `data/coverage/` มีเจ้าของเดียวคือ X08 · R3: `data/map/` กับ `art/direction/map-style.md` คนละงาน)
- งาน agent ที่ขึ้นกับ HUMAN ยังมีแค่ P1-F02-T21 และ P1-F02-T24 (ผ่าน T20) เท่าเดิม
- ไม่มีการตัด gate หรือเกณฑ์ปิด · ไม่แก้ roadmap

