# Test Plan F01 — Coverage Survey

- task: P1-F01-T04 · เจ้าของ: qa-tester · สถานะ: พร้อมใช้ในการรัน QA gate P1-F01-T08
- อ้างอิง: `tools/coverage/METHOD.md` (P1-F01-T01, โดยเฉพาะตาราง 7.4, หัวข้อ 8.1, หัวข้อ 11), `tools/coverage/README.md` (P1-F01-T05, หัวข้อ 6–9), `product/prd/F01-coverage-survey.md` (P1-F01-T03), `config/balance/dungeons.json#coverageFilter` (P1-H03), `studio/roadmap.md` หัวข้อ F01, board `studio/phases/phase-1/board.md` detail block "#### P1-F01-T04" และ "#### P1-F01-T08"
- หมายเหตุลำดับเวลา: เขียนแผนนี้หลังจาก orchestrator แจ้งว่า pipeline (P1-F01-T05) เสร็จแล้วจริง (README มีผลรันจริงและตาราง case→expected→actual) จึงตรวจสอบหลายกรณีในแผนนี้ทันทีเป็นหลักฐานตั้งต้น (baseline) ให้ P1-F01-T08 ใช้ต่อ — QA gate ยังต้องรันซ้ำอีกครั้งก่อนปิด phase เผื่อ config หรือข้อมูลเปลี่ยน

## 1. ขอบเขต

**ในขอบเขต:** ความถูกต้องและการรันซ้ำได้ของ `tools/coverage/pipeline/` และ output (`data/coverage/candidates.geojson`, `excluded.geojson`, `tools/coverage/out/run-meta.json` และไฟล์ประกอบ) เทียบกับ `METHOD.md` และ `config/balance/dungeons.json#coverageFilter` · การตรวจว่า blocklist ตัดถูกหมวด (ศาสนา สุขภาพ การศึกษา ราชการ ทหาร การทูต และสุสานตาม D-026) · ขอบเขตพื้นที่ (area.minArea_m2/maxArea_m2) · การจัดการเรขาคณิต (รู, ซ้ำ, ซ้อน, ทับบางส่วน, multipart) · schema ของ output และ license · ความสอดคล้องของตัวเลขที่ใช้ตัดสิน Go/No-go ใน PRD กับคำสั่งที่รันได้จริง · การสุ่มตรวจ candidate กับแผนที่จริงที่เป็นอิสระจาก pipeline เอง

**นอกขอบเขต (non-goals ของ F01 เอง ตาม PRD หัวข้อ 7):** ไม่ทดสอบการวาด polygon dungeon จริง, ไม่ทดสอบ drop/exp/balance, ไม่ทดสอบชื่อ dungeon จริง (มาจากหลังบ้านภายหลัง), ไม่ทดสอบ UI ผู้เล่น (F01 เป็นเครื่องมือวิเคราะห์ offline ไม่อยู่ใน client), ไม่ทดสอบ `district-counts.csv`/heatmap ของ P1-F01-T06 เพราะยังไม่เริ่ม (จะได้ test plan เพิ่มเติมหรือภาคผนวกเมื่อ T06 ส่งงาน — ดูหัวข้อ 8 เรื่อง dependency)

### การใช้ checklist มาตรฐานของ QA กับ F01

F01 เป็น pipeline วิเคราะห์ offline ไม่ใช่ฟีเจอร์เกมสด รายการที่ qa-tester ต้องตรวจทุกฟีเจอร์ (movement gate, presence, resilience, server authority, formulas, privacy, copy) จึงใช้ไม่เท่ากันทุกข้อ:

| หมวด | ใช้กับ F01 อย่างไร |
| --- | --- |
| Movement gate / Presence / Resilience / Server authority | **ไม่เกี่ยวโดยตรง** — F01 ไม่มี client/server แยก ไม่มีผู้เล่นจริง ไม่มีรางวัล ไม่ต้องพิสูจน์ non-negotiable ข้อ 1–2 ของ CLAUDE.md ที่นี่ (จะถูกพิสูจน์ใน F04+ ที่ใช้ dungeon จริง) |
| Formulas | **ใช้เต็ม** — สูตรพื้นที่ (EPSG:32647), สูตรสัดส่วน `blocked_share`, `duplicateIoU`, `nestedContainmentShare`, `partialOverlapShare` คือ "สูตร" ของ feature นี้ ตาราง 7.4 (9 ตัวอย่าง) ทำหน้าที่เหมือน golden test vectors → หมวด D ด้านล่าง |
| Privacy | **ใช้บางส่วน** — ไม่มีข้อมูลผู้เล่นในไฟล์เข้า/ออกของ F01 เลย (มีแต่ OSM สาธารณะ + WorldPop) ต้องยืนยันว่าไม่มีการปนข้อมูลผู้เล่นและ license/attribution ถูกต้อง (ODbL) → หมวด J |
| Copy | **ไม่เกี่ยวเป็นหลัก** — F01 ไม่สร้าง copy หน้าจอผู้เล่น (นั่นคือ F06) ชื่อเขต/จังหวัดในไฟล์ output เป็นข้อมูลภูมิศาสตร์จริง ไม่ใช่ copy ที่ต้องผ่าน style guide 6 ข้อ · ยังคง grep เบา ๆ ว่าโค้ด Python ไม่มีข้อความไทยที่ hardcode ไว้เป็น log/error (ควรเป็นภาษาอังกฤษตาม CLAUDE.md "โค้ดเป็นภาษาอังกฤษ") → หมวด J |

## 2. สภาพแวดล้อมทดสอบและการรันซ้ำ

- คำสั่งรันจริง (ต้องมี D1 ที่ดาวน์โหลดแล้วใน `tools/coverage/downloads/`): `cd tools/coverage && .venv/bin/python -m pipeline all --offline`
- คำสั่ง unit test บน fixture (ใช้ใน CI ได้ ไม่ใช้เน็ต): `cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q`
- fixture: `tools/coverage/pipeline/tests/fixture_osm.py` — วาดมือ 1 จังหวัด 2 เขต 38 case polygon + 4 case จุด/นอกพื้นที่ (README หัวข้อ 6) ครอบคลุมทุกแถวของ METHOD 7.4 และเคสเรขาคณิตหลัก
- pinned snapshot: D1 = `thailand-260901.osm.pbf`, `data_date = 2026-09-01T20:20:50Z`, SHA-256 `e09812904250c8fc5bed7b444546338766317865e741733229fc714d32ab272f` (ตรงกับ METHOD.md หัวข้อ 4 และ `coverage_meta.inputs.D1.sha256` ใน `candidates.geojson`) — QA ต้องตรวจ checksum นี้เองก่อนเชื่อผลใด ๆ (ไม่เชื่อคำบอกของ location-engineer เฉย ๆ)
- ผลลัพธ์ที่ commit แล้ว: `data/coverage/candidates.geojson` (741 candidate), `data/coverage/excluded.geojson` (6,287 ชิ้น, ถูกบีบให้ผ่านเพดาน CI 5,242,880 byte) · ไฟล์ประกอบที่ไม่ commit (ต้องรันเองถึงจะมี): `tools/coverage/out/run-meta.json`, `out/points-unmatched.geojson`, `out/excluded-full.geojson`, `out/boundaries.geojson`

### หลักฐานที่ตรวจสอบแล้วระหว่างเขียนแผนนี้ (baseline ให้ P1-F01-T08 ใช้ต่อ)

```
$ cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q
85 passed in 0.13s

$ shasum -a 256 ../../data/coverage/*.geojson
8237f065015a37ae7317b57215013effe33ead16748f66e4b6d078ea4b563503  candidates.geojson
ea8b1206759574a7c08be81f93cef54966d4b0b44d02383218dbd8a7ae9c3f7b  excluded.geojson
```

ตรงกับค่าที่ README.md หัวข้อ 7 อ้างไว้ทุกตัวอักษร (ยืนยันรันซ้ำได้อิสระจาก location-engineer โดยไม่ต้องเชื่อคำอ้าง)

## 3. Traceability — เกณฑ์ผ่านของ F01 (roadmap/board) → กลุ่ม test case

| เกณฑ์ผ่านตาม `studio/roadmap.md` F01 / board `#### P1-F01-T04` | กลุ่ม case ในหัวข้อ 5 |
| --- | --- |
| รันซ้ำได้ผลเท่าเดิม | REPRO-01, REPRO-02, CONF-01..06 |
| สุ่ม polygon ≥30 ชิ้นเทียบแผนที่จริง (พื้นที่, tag, blocklist) | RAND-01 |
| polygon ขอบ 2,999 / 3,000 / 150,000 / 150,001 ตร.ม. | AREA-01..04 |
| วัด โรงเรียน โรงพยาบาล ราชการ ทหาร สถานทูต ไม่หลุดเข้า candidates | BLOCK-01..07 |
| SF-9: historic/tourism ที่มีศาสนสถานข้างใน, สวนที่มีศาลเจ้าเล็ก (กฎสัดส่วน), งานวัด (A-P1-PLAN-02-3) | REL-01..09, TEMPLEFAIR-01 |
| จำนวน polygon ที่ใช้ได้แยกรายเขต (roadmap "เกณฑ์ผ่าน") | อยู่ใน scope ของ P1-F01-T06 (ยังไม่เริ่ม) — ดู DEP-01 หัวข้อ 8 |
| heatmap เทียบความหนาแน่นประชากร | อยู่ใน scope ของ P1-F01-T06 — DEP-01 |
| coverage report + คำแนะนำ Go/ทางเสริม | อยู่ใน scope ของ P1-F01-T07/T09/T10 — ใช้ตาราง PRD traceability หัวข้อ 4 ด้านล่างตรวจว่าตัวเลขสืบไปถึงคำสั่งได้ |

## 4. Traceability — ตัวเลข Go/No-go ใน PRD → คำสั่งที่รันซ้ำได้

เกณฑ์ตัวเลขใน `product/prd/F01-coverage-survey.md` หัวข้อ 4–5 ต้องสืบไปถึงคอลัมน์ในไฟล์ output และคำสั่งที่สร้างคอลัมน์นั้นได้ ไม่ใช่ตัวเลขที่พิมพ์มือใน coverage report

| เกณฑ์ PRD | มาจากไฟล์/คอลัมน์ | คำสั่งที่สร้างค่านี้ | พึ่งงานที่ยังไม่เสร็จ |
| --- | --- | --- | --- |
| G2 (จำนวน dungeon ที่ใช้ได้ ≥10/ย่าน, base tag เท่านั้น) | `candidates.geojson` กรอง `district` (นับด้วย `district_osm_id`) | `python -m pipeline all --offline` แล้วนับจาก `features[].properties.district_osm_id` | ไม่มี — รันได้วันนี้ |
| N2 (รวมทั้งหมด ≥40 แห่ง, base tag) | `candidates.geojson` ทั้งไฟล์ | เดียวกับข้างบน (741 candidate ปัจจุบัน ผ่าน N2 แน่นอนที่ระดับรวมทั้งหมด — ไม่ได้แปลว่าผ่านระดับย่าน) | ไม่มี |
| G1/S1/G4/S3/N3 (สัดส่วนประชากรโซนเขียว/เหลือง/แดง) | `district-counts.csv` (คอลัมน์ระยะ+ประชากร, P1-F01-T06) ใช้ `rep_point` ของ candidates + route factor ตาม PRD หัวข้อ 8 | ยังไม่มีคำสั่ง — T06 ต้องเขียนและอ้าง route factor ที่มาชัดเจน | **DEP-01**: T06 ยังไม่เริ่ม (TODO) |
| G3 (ความหลากหลาย preset ≥2/3) | ต้อง map `class`/`size_band` → preset ผ่าน `data/dungeons/presets.json` (P1-F03-T09) | ยังไม่มีคำสั่ง | **DEP-02**: T09 ยังไม่เริ่ม (TODO) |
| S2 (นับรวมทางเสริมถ่วงน้ำหนัก) | ต้องมีรายชื่อ "ชั้นที่สอง" และ "dungeon ชั่วคราว" จาก `design/levels/launch-criteria.md`/coverage report | ยังไม่มีคำสั่ง | **DEP-03**: T02/T07 |

**ผลต่อ QA gate:** P1-F01-T08 ตรวจได้เต็มเฉพาะ G2/N2 วันนี้จากคำสั่งข้างบน · เกณฑ์ที่เหลือต้องรอ T06/T07/T09 ก่อน QA gate จะยืนยัน "ตัวเลขใน report ตรงกับ `district-counts.csv`" ได้ตามเกณฑ์ของ T08 เอง (ดูหัวข้อ 8)

## 5. Test case

Precondition ร่วมทุก case (ไม่เขียนซ้ำต่อแถว): venv ติดตั้งตาม README หัวข้อ 2 · D1 ผ่าน checksum ตามหัวข้อ 2 ของแผนนี้ · รันจาก `tools/coverage/`

### 5.1 การรันซ้ำได้ (REPRO)

| id | precondition เพิ่ม | ขั้นตอน | ผลที่คาด |
| --- | --- | --- | --- |
| REPRO-01 | fixture มาตรฐาน (`pipeline/tests/fixture_osm.py`) | รัน `pytest pipeline/tests -q` สองครั้งติดกัน | ผ่านทั้งคู่ 85/85 ไม่มี flake (สุ่มลำดับหรือ timing ไม่กระทบ) |
| REPRO-02 | D1 จริง (312 MiB) | รัน `python -m pipeline all --offline` สองครั้ง, `shasum -a 256` ทั้งสองไฟล์ output ทุกครั้ง | SHA-256 ของ `candidates.geojson` และ `excluded.geojson` เท่ากันทุกครั้ง (ไม่รวมไฟล์ `out/run-meta.json` ซึ่งมีเวลารัน) — **ยืนยันแล้ว** ดูหัวข้อ 2 |
| REPRO-03 | เดียวกับ REPRO-02 | เปรียบเทียบลำดับ `features[].properties.id` ในไฟล์ output | เรียงตาม `id` จากน้อยไปมาก ทุกรอบ |

### 5.2 Config ขับเคลื่อนทุกค่า ไม่มี magic number (CONF)

| id | ขั้นตอน | ผลที่คาด |
| --- | --- | --- |
| CONF-01 | ทำสำเนาชั่วคราวของ `config/balance/dungeons.json` แก้ `area.minArea_m2` เป็นค่าอื่น (เช่น 5000) แล้วรันด้วย path ที่ชี้ไปสำเนา | จำนวน candidate เปลี่ยนตามค่าใหม่ (ไม่ตรงกับ 741 เดิม) ยืนยันว่าไม่มี `3000`/`150000` ฝังในโค้ด — มี test อยู่แล้วใน pytest suite (README หัวข้อ 6) ต้องอ่าน source เพื่อยืนยันว่า assertion เทียบค่าจาก config ไม่ใช่ hardcode |
| CONF-02 | แก้ `coverageFilter.maxBlockedShare.religious` เป็นค่าอื่น (เช่น 0.5) รันบน fixture `park_sala_400` (share 0.05) | ผลเปลี่ยนจาก `blocked_religious` เป็น `candidate` (เพราะ 0.05 ≤ 0.5 แล้ว) |
| CONF-03 | ลบคีย์ใดคีย์หนึ่งใน `coverageFilter` ออกจากสำเนาชั่วคราว แล้วรัน | pipeline หยุดด้วย `ConfigError` ระบุชื่อคีย์ที่หาย ไม่ใช้ค่า default เงียบ ๆ |
| CONF-04 | เพิ่ม `"cemetery"` ใน `coverageFilter.blocklistDisabledCategories` (D-026 switch) แล้วรัน | จำนวน candidate ไม่เปลี่ยนจาก 741 บนข้อมูลจริงปัจจุบัน (ตรงกับที่ README หัวข้อ 4.1 รายงาน เพราะชิ้นที่โดนหมวดนี้โดนเหตุผลอื่นตัดอยู่แล้ว) — ต้องตรวจว่า `reason_excluded` ของชิ้นเหล่านั้นเปลี่ยนจาก `blocked_cemetery` เป็นเหตุผลถัดไป ไม่ใช่แค่ตัวเลขรวมเท่าเดิมโดยบังเอิญ |
| CONF-05 | เพิ่ม `amenity=university`/`college`, `building=university`/`college` ใน `blocklistDisabledTags` (D-027 switch) แล้วรัน | candidate เพิ่มจาก 741 เป็น 892 (+151) ตรงกับ README หัวข้อ 4.1 |
| CONF-06 | ตั้ง `majorWayAction` เป็น `exclude` แล้วรัน (D-028 switch) | 51 candidate ที่เดิมมี flag `crosses_major_way` หายจาก `candidates.geojson` ไปอยู่ `excluded.geojson` แทน · ตั้งเป็น `off` แล้วรัน → ไม่มี flag นี้เลยแต่จำนวน candidate เท่าเดิมกับค่าเริ่มต้น (`flag`) |
| CONF-07 (negative) | พยายามเพิ่ม `"religious"` ใน `blocklistDisabledCategories` แล้วรัน | pipeline ปฏิเสธ (error ชัดเจน อ้าง D-006) **ไม่ใช่** เพิกเฉยหรือรันผ่านเงียบ ๆ — ป้องกันไม่ให้ config ในอนาคตเผลอเปิดวัด |

### 5.3 ขอบเขตพื้นที่ (AREA)

| id | ขนาด (ตร.ม.) | ผลที่คาด | อ้างอิง |
| --- | --- | --- | --- |
| AREA-01 | 2,999 (ทำสี่เหลี่ยมใน UTM 47N แล้วแปลงกลับ WGS84) | `area_too_small` — ไม่รวมขอบล่าง | METHOD 8.1 |
| AREA-02 | 3,000 | `candidate` — รวมขอบล่าง (`min ≤ area_m2`) | METHOD 8.1, fixture `park_at_min` (3,010 ในไฟล์จริงใช้ค่าที่ห่างขอบเล็กน้อยเพื่อกันความคลาด projection — ต้องมี case ที่ตรง 3,000.0 พอดีแยกต่างหากถ้า fixture ปัจจุบันไม่มี ดู GAP-01 หัวข้อ 8) |
| AREA-03 | 150,000 | `candidate` — รวมขอบบน (`area_m2 ≤ max`) | เดียวกับ AREA-02 (ต้องมี case ตรง 150,000.0 พอดี ดู GAP-01) |
| AREA-04 | 150,001 | `area_too_large` (+ อาจมี flag `split_candidate` ถ้ามีชิ้นย่อยในช่วง) — ไม่รวมขอบบน | METHOD 8.1 |

**หมายเหตุ (พบระหว่างเขียนแผน, ดู GAP-01 หัวข้อ 8):** fixture จริงใน `pipeline/tests/fixture_osm.py:114-117` ใช้ 2,990 / 3,010 / 149,950 / 150,050 ตร.ม. ไม่ใช่ 2,999 / 3,000 / 150,000 / 150,001 ตามตัวอักษรที่ METHOD 11 และ board กำหนด — ค่าที่ใช้ตรวจการเทียบ "รวมขอบ" (`>=`/`<=`) ห่างขอบ 10 ม.² จึงยังไม่พิสูจน์ว่าค่าที่ตรงขอบพอดี (`area_m2 == 3000.0` หรือ `== 150000.0`) ผ่านเป็น candidate จริง (อาจมีบั๊ก off-by-one ที่ค่าห่างขอบ 10 ตร.ม. ตรวจไม่เจอ) → ต้องเพิ่ม fixture ที่ตรงขอบพอดีก่อน QA gate จะปิด AREA-01..04 ว่า PASS เต็ม

### 5.4 หมวด blocklist หลัก ไม่หลุดเข้า candidates (BLOCK)

ทุก case ใช้ polygon ที่ตัวเองติด tag ของหมวดนั้นตรง ๆ (ไม่ใช่แค่แตะ) เพื่อพิสูจน์ว่า "ไม่หลุด" ในกรณีที่ชัดที่สุดก่อน แล้วจึงต่อด้วยกรณีสัดส่วน (REL/OTHER)

| id | หมวด | tag ตัวอย่าง | ผลที่คาด | อ้างอิง |
| --- | --- | --- | --- | --- |
| BLOCK-01 | ศาสนา (วัด) | `amenity=place_of_worship` บนพื้นที่ 20,000 ตร.ม. | `excluded`, `reason_excluded = religious_self` (R1) ไม่ปรากฏใน `candidates.geojson` เลย | METHOD 7.3 R1, fixture `park_is_temple` |
| BLOCK-02 | การศึกษา (โรงเรียน) | `amenity=school` บนพื้นที่ในช่วง | `excluded`, `blocked_education` (share ≈1 > 0.10) | fixture `pitch_in_school` |
| BLOCK-03 | สุขภาพ (โรงพยาบาล) | `amenity=hospital` | `excluded`, `blocked_health` | METHOD 7.1 หมวด health |
| BLOCK-04 | ราชการ | `amenity=townhall` หรือ `office=government` | `excluded`, `blocked_government` | METHOD 7.1 หมวด government |
| BLOCK-05 | ทหาร | `landuse=military` | `excluded`, `blocked_military` | fixture ครอบคลุมใน README หัวข้อ 8 (`blocked_military` 295 ชิ้นในรันจริง) |
| BLOCK-06 | สถานทูต | `amenity=embassy` หรือ `diplomatic=embassy` | `excluded`, `blocked_diplomatic` | METHOD 7.1 หมวด diplomatic |
| BLOCK-07 | สุสาน (D-026, PROPOSED) | `landuse=cemetery` | ค่าเริ่มต้น (สวิตช์ยังปิดไม่ได้ตาม D-026 ปัจจุบัน = ตัด): `excluded`, `blocked_cemetery` | fixture `park_in_cemetery` |

ทุก case ใน BLOCK ต้องตรวจเพิ่มว่า: (ก) ไม่ปรากฏใน `candidates.geojson` แม้แต่แถวเดียว (ข) ปรากฏใน `excluded.geojson` พร้อม `reason_excluded` ตรงตามตาราง (ค) ไม่ปรากฏใน `points-unmatched.geojson` (เพราะเป็น area ไม่ใช่ point-only)

### 5.5 กฎศาสนาเพิ่มเติมและ SF-9 (REL) — ตรงกับตาราง METHOD 7.4 ทั้ง 9 แถว

case กลุ่มนี้คือ golden test vectors ของ F01 (เทียบเท่า `design/systems/test-vectors/` ของ systems-designer) ตัวเลขในตารางเป็นตัวเลขที่ล็อกจาก METHOD.md ไม่ใช่ค่าอิสระของ QA — ยืนยันแล้วว่า `pipeline/tests` มีทั้ง 9 case นี้และผ่านหมด (README หัวข้อ 8, pytest 85 passed)

| id | สถานการณ์ | ตัวเลข | ผลที่คาด | fixture (README §8) |
| --- | --- | --- | --- | --- |
| REL-01 | สวน 40,000 ตร.ม. มีศาลเจ้า polygon 60 ตร.ม. ข้างใน | share 0.0015 ≤ 0.02 | `candidate` + flag `contains_religious_feature` | `park_small_shrine_polygon` |
| REL-02 | สวน 8,000 ตร.ม. มีศาลาการเปรียญ polygon 400 ตร.ม. ข้างใน | share 0.05 > 0.02 | `excluded`, `blocked_religious` | `park_sala_400` |
| REL-03 | สวน 20,000 ตร.ม. มี node ศาสนสถาน รัศมี 10 ม. | share 314/20,000 = 0.0157 ≤ 0.02 | `candidate` + flag | `park_20k_pow_node` |
| REL-04 | สวน 4,000 ตร.ม. มี node ศาสนสถานข้างใน | share 314/4,000 = 0.0785 > 0.02 | `excluded`, `blocked_religious` | `park_4k_pow_node` |
| REL-05 (SF-9) | `tourism=attraction` 30,000 ตร.ม. มี node `amenity=place_of_worship` ข้างใน | กฎ R2 (ไม่ดูสัดส่วนเลย) | `excluded`, `religious_inside_heritage` | `attraction_pow_node` |
| REL-06 (SF-9) | `historic=*` ชื่อขึ้นต้น "วัด..." ไม่มี tag ศาสนาใด ๆ บนตัวเอง | กฎ R3 (จับชื่อ) | `excluded`, `religious_name` | `historic_wat_name` |
| REL-07 (SF-9 = งานวัด) | ตลาดนัดในลานวัด (`amenity=marketplace` ทับเขต `amenity=place_of_worship` เกือบสนิท) | share ≈ 1 | `excluded`, `blocked_religious` (R4) | `market_in_temple` |
| REL-08 | สนามฟุตบอลในโรงเรียน | share education ≈1 > 0.10 | `excluded`, `blocked_education` (ไม่ใช่ศาสนา แต่อยู่ในตาราง 7.4 เพื่อเทียบว่าหมวดอื่นก็มีสัดส่วนแบบเดียวกัน) | `pitch_in_school` |
| REL-09 | สวนติดรั้วโรงพยาบาล เส้นทับกัน 2% | share health 0.02 ≤ 0.10 | `candidate` (ไม่มี flag เพราะไม่ใช่หมวดศาสนา) | `park_hospital_fence` |

**TEMPLEFAIR-01 (งานวัดตาม A-P1-PLAN-02-3, ไม่ใช่ตัวอย่างในตาราง 7.4 แต่เป็น case แยก):** METHOD 7.3 ระบุว่า pipeline "ไม่สร้าง candidate งานวัดใดๆ" เพราะ OSM ไม่มี tag งานวัดที่เชื่อถือได้และงานวัดจัดในเขตวัดที่ถูกตัดด้วย R1/R4 อยู่แล้ว → **case คือการยืนยันการไม่มีอยู่ (negative test)**: grep ทั้ง `candidates.geojson` และ `excluded.geojson` หา tag หรือชื่อที่บ่งชี้ "งานวัด"/"เทศกาลวัด" ที่ไม่ได้มาพร้อมเหตุผลตัดจากหมวดศาสนา — ถ้าเจอชิ้นใดที่เป็นงานวัดแต่ผ่านเป็น candidate ถือว่า **FAIL ร้ายแรง** (ขัด D-006 ตรง ๆ) ต้องรายงานเป็น bug severity สูงสุดทันที ไม่รอ QA gate

### 5.6 เรขาคณิต (GEO)

| id | สถานการณ์ | ผลที่คาด | fixture |
| --- | --- | --- | --- |
| GEO-01 | multipolygon มีวงใน (รู) พื้นที่ 7,500 ตร.ม. หลังหักรู | `candidate`, `area_m2` คำนวณหลังหักรูแล้ว | `mp_with_hole` |
| GEO-02 | วงในเป็นชิ้นบล็อกลิสต์ (เช่น วัดเป็นรูในสวน) | ชิ้นที่เป็นรูยังถูกตรวจกฎหมวด 7 ตามปกติ (ไม่ผ่านฟรีเพราะเป็นรู) | อนุมานจาก METHOD 6.2 — ต้องยืนยันกับ location-engineer ว่ามี fixture ตรงนี้หรือครอบคลุมโดย REL-01..04 (การเป็น "รู" vs "บล็อกที่แตะ" อาจเป็นโค้ดคนละ path) → ถ้าไม่มี ให้เพิ่มเป็น handoff |
| GEO-03 | way กับ relation แทนที่เดียวกัน (IoU ≥ 0.9) | เก็บชิ้นที่มี `name`+tag มากกว่า, อีกชิ้น `excluded` `duplicate_of` | `dup_way` / `dup_relation` |
| GEO-04 | สนามในสวน (nested, containment ≥0.9), แม่อยู่ในช่วงพื้นที่ | เก็บแม่เป็น `candidate`, ลูก `excluded` `nested_in` | `nested_parent` / `nested_pitch` |
| GEO-05 | สวนใหญ่เกิน maxArea มีสวนย่อยในช่วงข้างใน | แม่ `excluded` `area_too_large` + flag `split_candidate`, ลูกในช่วง `candidate` | `split_parent` / `split_child` |
| GEO-06 | ทับบางส่วน (partialOverlapShare ≤ share < nestedContainmentShare) | เก็บทั้งคู่เป็น `candidate` พร้อม flag `overlaps_candidate` และ `related_ids` ชี้กันและกัน | `overlap_a` / `overlap_b` |
| GEO-07 | แตะกันเล็กน้อย (share < partialOverlapShare) | ไม่นับว่าทับ ไม่มี flag ใด | อนุมานจาก METHOD 6.3 แถวสุดท้าย — ยืนยันว่ามี fixture หรือครอบด้วยค่า default ของ geometry ที่ไม่แตะกันจริง (ต้องแยกจาก "ไม่ทับเลย" ให้ชัด) |
| GEO-08a | geometry เสียแต่ซ่อมแล้วพื้นที่เปลี่ยน ≤ `repairMaxAreaChangeShare` (1%) | ซ่อมด้วย `make_valid` แล้วเก็บเป็น candidate ตามปกติ | ต้องยืนยันกับ location-engineer ว่ามี fixture geometry เสียจริงหรือ README ระบุ `repaired 0` ในรันจริง (แปลว่าไม่เจอในข้อมูลจริงรอบนี้ แต่ fixture ควรมี synthetic case) |
| GEO-08b | ซ่อมแล้วพื้นที่เปลี่ยน > 1% | `excluded` `invalid_geometry` | เดียวกับ GEO-08a |
| GEO-09 | multipolygon หลายวงนอกห่างกันเกิน `multipartMaxGap_m` (30 ม.) | `excluded` `multipart_disjoint` | `multipart_far` |
| GEO-10 | multipolygon หลายวงนอกห่างกันไม่เกิน 30 ม. | นับเป็น 1 `candidate` | `multipart_near` |
| GEO-11 | way ไม่ปิด (ประกอบ area ไม่สำเร็จ) | นับใน `run-meta.json` เป็น `assembly_failed` พร้อม osm_id ไม่ใช่หายเงียบ ๆ | รันจริงรอบนี้ได้ 0 (README §7) — ต้องมี fixture synthetic แยกเพื่อพิสูจน์โค้ด path นี้ทำงานจริงตอนเกิดเหตุ ไม่ใช่แค่ "บังเอิญไม่เจอ" |
| GEO-12 | ถนน `highway=primary` ตัดผ่าน candidate ยาวเกิน `majorWayMinInsideLength_m` (20 ม.) | flag `crosses_major_way` (ค่าเริ่มต้น `majorWayAction=flag` ไม่ตัด) | `park_crossed_by_primary` |
| GEO-13 | สะพาน/อุโมงค์ทับเส้นทาง (tunnel/bridge ที่ไม่ใช่ `no`) | ไม่นับว่าตัดผ่าน ไม่มี flag | `park_under_bridge` |
| GEO-14 | candidate คร่อมสองเขต, เขตรองมีสัดส่วนเกิน `partialOverlapShare` | `multi_district = true`, `district` = เขตที่ทับมากสุด, `related_ids.districts` มีรายชื่อ | `park_multi_district` |

### 5.7 access / indoor / private garden / ตลาดในอาคาร (OTHER)

| id | tag | ผลที่คาด | fixture |
| --- | --- | --- | --- |
| OTHER-01 | `access=private` หรือ `access=no` | `excluded` `access_private` | `garden_private` |
| OTHER-02 | `indoor=*` ที่ไม่ใช่ `no`/layer ติดลบ | `excluded` `indoor` | อนุมานจากตาราง README §8 (`market_indoor` ให้ `indoor_market` ซึ่งเป็นกฎเฉพาะตลาด ต้องแยกยืนยันกฎ `indoor` ทั่วไปที่ใช้ทุก class ด้วย) |
| OTHER-03 | `amenity=marketplace` มี `building=*` ที่ไม่ใช่ `no`/`roof` | `excluded` `indoor_market` | `market_indoor` |
| OTHER-04 | `leisure=garden` ที่ `garden:type=residential`/`private` | `excluded` `private_garden` | `garden_residential` |

### 5.8 จุด (historic/tourism/marketplace เป็น node) (POINT)

| id | สถานการณ์ | ผลที่คาด |
| --- | --- | --- |
| POINT-01 | node `historic=*`/`tourism=attraction`/`amenity=marketplace` อยู่ในขอบเขต candidate | ปรากฏใน property `poi_inside` ของ candidate นั้น (osm_id, tag หลัก, name) | 
| POINT-02 | node เดียวกันแต่ไม่อยู่ใน candidate ใดเลย | อยู่ใน `points-unmatched.geojson`, `reason_excluded = point_only`, ไม่นับใน coverage หลัก |
| POINT-03 | node ศาสนสถาน (`amenity=place_of_worship`) | **ไม่** ปรากฏทั้งใน `poi_inside` และ `points-unmatched.geojson` — ใช้ตัด candidate ตาม R1–R4 เท่านั้น (ยืนยันว่าไม่รั่วไปโผล่เป็น POI เฉย ๆ) |

fixture `park_with_poi` ยืนยัน POINT-01 แล้ว (README §8: `poi_inside มี 1 จุด`) — POINT-02/03 ต้องยืนยันแยกจาก `out/points-unmatched.geojson` ของรันจริง (572 จุดตาม README §7) สุ่มตรวจว่าไม่มี node ศาสนาปนอยู่ในนั้น

**ยืนยันแล้วโดยตรวจ `fixture_osm.py` ระหว่างเขียนแผนนี้:** ไม่มี fixture case สำหรับ GEO-02 (blocker เป็นวงในของ multipolygon), GEO-07 (แตะกันต่ำกว่า `partialOverlapShare` แยกจากกรณีทับจริง), GEO-08a/08b (geometry เสียที่ต้องผ่าน `make_valid`), GEO-11 (`assembly_failed` จาก way ไม่ปิด) — ทั้งสี่รายการเป็น **GAP-02** (ดูหัวข้อ 8) ไม่ใช่แค่สมมติฐาน

### 5.9 เขต/จังหวัด และ schema output (SCHEMA)

| id | ตรวจอะไร | ผลที่คาด |
| --- | --- | --- |
| SCHEMA-01 | `candidates.geojson` เป็น RFC 7946 ที่ valid (`Polygon`/`MultiPolygon`, WGS84), เรียงตาม `id`, พิกัดทศนิยม 6 ตำแหน่ง | ผ่านทุกข้อ — ตรวจด้วย `python -c "import json,geojson; ..."` หรือ schema validator ทั่วไป + สคริปต์เช็คลำดับ `id` |
| SCHEMA-02 | `excluded.geojson`: `reason_excluded` ไม่เป็น `null` เลยสักแถว, `reasons_all` มีอย่างน้อย 1 รายการเสมอ, ลำดับความสำคัญตรง METHOD 9.4 (ศาสนา > blocklist อื่น > พื้นที่ > ซ้อน/ซ้ำ) | ผ่านทุกแถว |
| SCHEMA-03 | `properties.district_osm_id` ทุก candidate ตรงกับ relation `admin_level=6` จริงใน 79 เขต/อำเภอ (ไม่ใช่ nickname/ชื่อซ้ำ) | ไม่มี `district_osm_id` ที่อยู่นอกรายการ 79 เขต |
| SCHEMA-04 | candidate คร่อมสองเขต (`multi_district=true`) ต้องมี `related_ids.districts` ไม่ว่าง | ตรงกับ fixture `park_multi_district` |
| SCHEMA-05 | `out/run-meta.json` มีครบ: `pipeline_version`, `data_date`, SHA-256 ของไฟล์เข้าทุกไฟล์ (เทียบกับ `coverage_meta.inputs` ใน geojson ต้องตรงกัน), แหล่ง config ที่ใช้จริง+ค่าทุกคีย์, จำนวนก่อน/หลังทุกขั้น, จำนวนต่อ `reason_excluded`, `assembly_failed`, เวลารัน, เวอร์ชัน package | ต้องรัน pipeline เองก่อนถึงจะมีไฟล์นี้ (ไม่ commit) — ตรวจตอน QA gate |
| SCHEMA-06 | `candidates.geojson` ไม่ถูกบีบ (`excluded_compaction` step = none) ตาม METHOD 9.2/README §5.5 | ตรวจ `coverage_meta` ของ `candidates.geojson` |
| SCHEMA-07 | `excluded.geojson` ถูกบีบให้ ≤ `pipeline.maxCommittedFileBytes` (5,242,880 byte) แต่ `out/excluded-full.geojson` (ไม่ commit) มี schema ครบทุก property | ขนาดปัจจุบัน 4,984,195 byte < เพดาน — ต้องเฝ้าเพราะข้อมูล OSM เพิ่มขึ้นได้ทุกรอบ (ใกล้เพดานแล้วราว 95%) — **flag เป็นความเสี่ยงต่อรอบถัดไป** |
| SCHEMA-08 | จำนวนจังหวัด/เขต assert เท่ากับ 6/79 พอดี (METHOD หัวข้อ 2), ถ้าไม่ตรงต้องหยุดพร้อมชื่อที่ขาด | ทดสอบ negative: ป้อน fixture ที่ตัดเขตหนึ่งออก แล้วยืนยันว่า exit code ≠ 0 และข้อความระบุชื่อเขตที่ขาด (README §1: exit 1 = จำนวนจังหวัด/เขตไม่ตรง) |

### 5.10 สุ่มตรวจ ≥30 candidate กับแผนที่จริง ที่เป็นอิสระจาก pipeline เอง (RAND-01)

**ปัญหาของวิธีตรงไปตรงมา:** การเทียบ candidate กับ "แผนที่จริง" ต้องเป็นแหล่งที่เป็นอิสระจากโค้ด pipeline เอง ไม่ใช่แค่รัน pipeline ซ้ำ (นั่นคือ REPRO ไม่ใช่ RAND) วิธีที่ทดลองแล้วว่า **ใช้ไม่ได้ดี**: Nominatim **reverse** geocoding (พิกัด→สถานที่) คืนวัตถุที่ "ใกล้/สำคัญที่สุด" ณ จุดนั้นตามอัลกอริทึมของ Nominatim เอง ไม่ใช่วัตถุที่ `osm_id` เดียวกับ candidate เสมอ (ทดลองกับ `osm-r17746457` ได้ผลตรง แต่กับอีก 19/30 ตัวอย่างได้วัตถุอื่นที่ใกล้กว่า เช่น ถนน/ป้ายรถเมล์/ร้านค้า) — **ห้ามใช้ reverse geocoding เป็นวิธีหลัก** เพราะจะสร้าง false-positive "ไม่ตรง" จำนวนมากจนเสียเวลา QA gate

**วิธีที่ยืนยันแล้วว่าใช้ได้ (lookup by id):** เรียก Nominatim `lookup` ด้วย `osm_type`+`osm_id` ตรง ๆ (ไม่ผ่านพิกัด) แล้วเทียบ `category`/`type` ที่ได้กับ `class` ของเรา, เทียบ `name`/`address.province` — วิธีนี้อิสระจากโค้ด pipeline จริง (เรียก service คนละตัว อ่านจากฐานข้อมูล OSM สด ไม่ใช่ snapshot ที่ pipeline ใช้) และจับกรณี pipeline อ่าน tag หรือกำหนด class ผิดได้ (ถ้า tag เปลี่ยนไปแล้วในฐานสดจะเห็นความต่างชัดเจน ต่างจาก snapshot ที่ pin ไว้)

**ผลที่รันจริงระหว่างเขียนแผนนี้** (ใช้ `coverage_meta.qa_sample` ใน `candidates.geojson`: seed `20260923`, 30 id คงที่ — บันทึกไว้ในไฟล์ output แล้วจึงสุ่มชุดเดิมซ้ำได้เสมอตามที่ METHOD 11 กำหนด):

```
เรียก https://nominatim.openstreetmap.org/lookup?format=jsonv2&osm_ids=<30 ids>
found=30/30 (ทุก osm_id ยังมีอยู่จริงในฐาน OSM สด)
tag_class_match=30/30 (leisure=park↔park, amenity=marketplace↔marketplace, leisure=pitch↔pitch, leisure=garden↔garden ตรงทุกชิ้น)
name ตรงทุกชิ้นที่มีชื่อ (เช่น "สวนรมณีนาถ", "ตลาดซุโก้ยอีท", "สวนน้ำตลิ่งชัน")
province ตรงทุกชิ้น (กรุงเทพมหานคร/ปทุมธานี/นนทบุรี/สมุทรปราการ/สมุทรสาคร/นครปฐม ตรงกับ candidates.geojson)
```

ตัวอย่างเจาะจงที่ยืนยันด้วยตาว่าเป็นสถานที่จริงที่รู้จัก: `osm-r10904051` = "สวนรมณีนาถ" (Rommani Nat Park) เขตพระนคร — สวนสาธารณะจริงในกรุงเทพฯ ชั้นใน tag ตรง `leisure=park` พื้นที่ 37,689 ตร.ม. อยู่ในช่วงเกณฑ์

**ขั้นตอนสำหรับ P1-F01-T08 (ทำซ้ำก่อนปิด gate เพราะข้อมูลอาจเปลี่ยนถ้า D1/config เปลี่ยน):**
1. อ่าน `coverage_meta.qa_sample.ids` จาก `candidates.geojson` ที่ commit อยู่ตอนนั้น (seed ต้องตรงกับที่บันทึกไว้ ถ้า pipeline รันใหม่แล้ว seed หรือชุด id เปลี่ยน ต้องถามว่าทำไม — seedควรคงที่ตาม `pipeline.*` config)
2. เรียก `lookup` เป็นชุดเดียว (Nominatim จำกัด ~1 req/sec, "lookup" รับหลาย id ต่อ request จึงพอ 1 ครั้ง) พร้อม `User-Agent` ระบุโปรเจกต์ตามนโยบายการใช้งานของ Nominatim
3. เทียบ `category`/`type` → `class` ตาม mapping: `leisure/park→park`, `leisure/garden→garden`, `amenity/marketplace→marketplace`, `leisure/pitch→pitch`, `historic/*→historic`, `tourism/attraction→attraction`
4. ถ้า osm_id ใดไม่พบ (`found` < 30) หรือ tag ไม่ตรง (`tag_class_match` < `found`) ให้เปิดตรวจมือทีละชิ้นด้วยเบราว์เซอร์ (openstreetmap.org/way/<id> หรือ /relation/<id>) ก่อนสรุปว่าเป็นบั๊ก เพราะสถานที่จริงอาจถูกแก้ tag ใน OSM สดหลังวันที่ snapshot จริง ๆ (ไม่ใช่บั๊กของเรา) — บันทึกกรณีแบบนี้แยกเป็น "ข้อมูลเปลี่ยนหลัง snapshot" ไม่ใช่ FAIL ของ pipeline
5. เกณฑ์ผ่าน RAND-01: `found ≥ 27/30` (90%, ยอมพื้นที่ถูกลบ/รวมใน OSM สดได้บ้าง) และ `tag_class_match = found` ทั้งหมด (ห้ามมี class ผิดแม้แต่ชิ้นเดียวหลังตัดกรณี "ข้อมูลเปลี่ยนหลัง snapshot" ออก) — **รอบนี้ผ่าน 30/30 และ 30/30**

### 5.11 Privacy, license, และภาษาโค้ด (PRIV/LIC)

| id | ตรวจอะไร | ผลที่คาด |
| --- | --- | --- |
| PRIV-01 | grep `tools/coverage/` และ `data/coverage/` หาคำที่บ่งชี้ข้อมูลผู้เล่น (`player`, `user_id`, `position_log`, พิกัด GPS ของผู้เล่น) | ไม่พบ — F01 ใช้เฉพาะ OSM (สาธารณะ) และ WorldPop (สถิติประชากรระดับ grid ไม่ผูกคน) ไม่มี PII |
| LIC-01 | `data/coverage/LICENSE-DATA.md` หรือหัวข้อเทียบเท่ามีอยู่ ระบุ ODbL 1.0 + "© OpenStreetMap contributors" | ตรวจว่าตรงกับ `coverage_meta.license`/`attribution` ใน geojson จริง (`ODbL-1.0`, `© OpenStreetMap contributors` — ยืนยันแล้วว่ามีใน `coverage_meta` ของทั้งสองไฟล์) **หมายเหตุ:** ยังไม่พบไฟล์ `LICENSE-DATA.md` แยกต่างหากใน `data/coverage/` ระหว่างตรวจ (มีแต่ 2 ไฟล์ geojson) — ต้องยืนยันกับ location-engineer ว่าตั้งใจเก็บไว้ใน `coverage_meta` แทนไฟล์แยกหรือเป็น GAP-03 |
| CODE-01 | grep โค้ด Python ใน `tools/coverage/pipeline/` หา error/log message ที่ hardcode เป็นภาษาไทย | โค้ดควรเป็นภาษาอังกฤษล้วนตาม CLAUDE.md ("โค้ดเป็นภาษาอังกฤษ") — ชื่อเขต/จังหวัดที่เป็นข้อมูล (ไม่ใช่ log message) ยกเว้นได้ |
| DEP-01 (ชื่อซ้ำกับ dependency งาน แยกความหมาย: นี่คือ "dependency ของ Python") | `requirements.txt` pin ทุกตัวรวม transitive, venv ที่ไม่ commit, ไม่มี API key/secret ในโค้ดหรือ config | ตรวจแล้ว: `osmium==4.3.1`, `shapely==2.1.2`, `pyproj==3.8.0`, `numpy==2.5.3`, `pytest==9.1.1` ตรงกับ README §2 · `.venv/` มี `.gitignore` ของตัวเอง |

## 6. การพิสูจน์รันซ้ำได้อิสระสำหรับ QA gate (P1-F01-T08)

QA ต้องพิสูจน์ว่าตัวเลขที่ location-engineer รายงานไม่ใช่แค่ "เชื่อคำอ้าง" แต่รันเองแล้วได้เลขเดียวกัน โดยไม่พึ่ง pytest ของ location-engineer เอง (นั่นตรวจแค่ fixture ไม่ตรวจว่าคำสั่งจริงบน D1 ให้ผลตรงกับที่ commit)

**ขั้นตอน (ทำที่ P1-F01-T08 ก่อนเขียน verdict):**
1. ดาวน์โหลด D1 เอง (หรือใช้ไฟล์ในเครื่องถ้ามีแล้ว) แล้วรัน `shasum -a 256 tools/coverage/downloads/thailand-260901.osm.pbf` เทียบกับ `e09812904250c8fc5bed7b444546338766317865e741733229fc714d32ab272f` — **ต้องตรงก่อนทำขั้นถัดไป** (ถ้าไม่ตรง ทุกอย่างข้างล่างไม่มีความหมาย)
2. รัน `cd tools/coverage && .venv/bin/python -m pipeline all --offline` เอง จับเวลาและ exit code (ต้องเป็น 0)
3. `shasum -a 256 data/coverage/*.geojson` เทียบกับค่าที่ commit อยู่ใน git ปัจจุบัน (`git show HEAD:data/coverage/candidates.geojson | shasum -a 256` เทียบกับไฟล์ที่เพิ่งรัน) — ต้องเท่ากันทุกตัวอักษร ไม่ใช่แค่ "จำนวนใกล้เคียงกัน"
4. ถ้าไม่ตรง: ตรวจว่าต่างเพราะ (ก) D1 เปลี่ยน snapshot (ต้องแก้ checksum ในเอกสารทุกที่ที่อ้าง) หรือ (ข) config เปลี่ยนตั้งแต่รันครั้งที่ commit (เทียบ `coverage_meta.config` เก่ากับใหม่) หรือ (ค) บั๊กจริงในโค้ด — สามกรณีนี้ตอบคำถามต่างกัน ห้ามข้ามขั้นวิเคราะห์นี้
5. รัน `.venv/bin/python -m pytest pipeline/tests -q` เอง ต้องได้ 85 passed (หรือมากกว่าถ้ามี case เพิ่มจาก GAP ในหัวข้อ 8 ที่ได้รับการแก้แล้ว) เวลา <1 วินาที ไม่ใช้เน็ต (ตรวจด้วยการตัดเน็ตชั่วคราวหรือดู log ว่าไม่มี network call)
6. บันทึกคำสั่งทุกคำสั่ง, checksum ทุกค่า, และเวลาที่รันลงใน `qa/reports/F01-qa-gate.md` เป็นหลักฐาน — นี่คือสิ่งที่ `P1-F01-T08` acceptance ต้องมี ("ยืนยันรันซ้ำได้ผลตรงกัน")
7. เมื่อ `district-counts.csv` (P1-F01-T06) พร้อมแล้ว ทำซ้ำขั้น 3 กับไฟล์นั้นด้วยการนับอิสระ: เขียนสคริปต์สั้นของ QA เอง (Python one-liner นับจาก `candidates.geojson` groupby `district_osm_id`) เทียบตัวเลขต่อเขตกับคอลัมน์ `valid_polygon_count` ใน CSV — ถ้าไม่ตรงคือบั๊กใน T06 ไม่ใช่ T05

## 7. เกณฑ์เข้า/ออก (entry/exit) ของ QA gate P1-F01-T08

**เข้า (เริ่ม gate ได้เมื่อ):** `tools/coverage/pipeline/` มี pytest ผ่านทั้งหมด (สถานะปัจจุบัน: มี, 85 passed) · `data/coverage/candidates.geojson`+`excluded.geojson` commit แล้ว (มีแล้ว) · README มีคำสั่งรันซ้ำ (มีแล้ว)

**ออก (ปิด gate เป็น PASS ได้เมื่อ):**
- ทุก case ในหัวข้อ 5 มีผล PASS/FAIL พร้อมหลักฐาน (คำสั่ง, checksum, หรือภาพ)
- GAP-01, GAP-02, GAP-03 (หัวข้อ 8) ได้รับการแก้ (เพิ่ม fixture/ไฟล์ที่ขาด) หรือ game-director/tech-lead ยอมรับความเสี่ยงอย่างชัดเจนเป็นลายลักษณ์อักษร — **ไม่ปล่อยผ่านเงียบ ๆ**
- หัวข้อ 6 (การรันซ้ำอิสระ) ทำครบและ checksum ตรงกันจริง ไม่ใช่แค่ copy ค่าจาก README
- ตัวเลขที่จะใช้ใน coverage report (P1-F01-T07) อย่างน้อยส่วน G2/N2 (หัวข้อ 4) สืบไปถึงคำสั่งที่ QA รันเองได้ตรงกัน — ส่วน G1/G3/G4/S1-S4/N3 รอ T06/T07/T09 (DEP-01..03) ไม่ใช่เงื่อนไขปิด T08 แต่ต้องถูกบันทึกเป็น "ยังตรวจไม่ได้" ไม่ใช่ "PASS ไปก่อน"
- ไม่มี bug severity สูง (high) ขึ้นไปค้างอยู่ (โดยเฉพาะ TEMPLEFAIR-01 ถ้าล้มเหลว คือ severity สูงสุดทันทีตาม non-negotiable ข้อ 3/D-006)

**verdict:** PASS ถ้าเงื่อนไขข้างต้นครบ · NEEDS_CHANGES พร้อม handoff ที่ระบุ reproduction steps ถ้าไม่ครบ (ตาม protocol ข้อ 6)

## 8. ช่องว่างที่พบระหว่างเขียนแผน (GAP) — ไม่ใช่สมมติฐานลอย ๆ ตรวจกับโค้ด/ไฟล์จริงแล้ว

| id | พบอะไร | หลักฐาน | severity เสนอ | handoff |
| --- | --- | --- | --- | --- |
| GAP-01 | fixture ขอบเขตพื้นที่ใช้ 2,990/3,010/149,950/150,050 ตร.ม. ไม่ใช่ 2,999/3,000/150,000/150,001 ตามตัวอักษรที่ METHOD.md หัวข้อ 11 และ board `#### P1-F01-T04` ระบุ — ยังไม่พิสูจน์ค่าตรงขอบพอดี (`==min`, `==max`) | `pipeline/tests/fixture_osm.py:114-117` (อ่านตรงแล้ว) | medium (ตรรกะ `min ≤ x ≤ max` ในโค้ดน่าจะถูก แต่ยังไม่มี test พิสูจน์ตรงขอบ) | location-engineer: เพิ่ม fixture case ตรง 3,000.0 และ 150,000.0 พอดี |
| GAP-02 | ไม่มี fixture สำหรับ: blocker เป็นวงในของ multipolygon (METHOD 6.2), แตะกันต่ำกว่า `partialOverlapShare` แยกจากกรณีทับจริง (METHOD 6.3 แถวสุดท้าย), geometry เสียที่ต้องผ่าน `make_valid` + เกิน/ไม่เกิน `repairMaxAreaChangeShare` (METHOD 6.2), `assembly_failed` จาก way ไม่ปิด (METHOD 6.2) | grep `fixture_osm.py` ไม่พบ case ชื่อที่เกี่ยวข้อง (ตรวจแล้ว, ดูหัวข้อ 5.6/5.8) | medium (โค้ด path เหล่านี้อาจถูกต้อง แต่ไม่มีอะไรพิสูจน์ ถ้าพังจะไม่มี test จับ) | location-engineer: เพิ่ม 4 fixture case ก่อน QA gate ปิด GEO-02/07/08/11 |
| GAP-03 | ไม่พบไฟล์ `data/coverage/LICENSE-DATA.md` ตามที่ METHOD หัวข้อ 3 และ 9.2 ระบุว่าต้องมี (แม้ข้อมูลเทียบเท่าจะฝังอยู่ใน `coverage_meta.license`/`attribution` ของทั้งสองไฟล์ geojson แล้ว) | `find data/coverage -iname "*license*"` ว่างเปล่า (ตรวจแล้ว) | low (ข้อมูลมีอยู่จริง แค่ไม่ได้อยู่ในไฟล์แยกตามที่ METHOD สัญญาไว้ — ผู้ดู repo ที่ไม่เปิด geojson อาจไม่เห็น license) | location-engineer: เพิ่มไฟล์ `LICENSE-DATA.md` หรือแก้ METHOD ให้ตรงกับที่ทำจริง (อย่างใดอย่างหนึ่ง) |
| GAP-04 | `excluded.geojson` ปัจจุบัน 4,984,195 byte ใกล้เพดาน CI guard 5,242,880 byte มาก (~95%) การเพิ่มขึ้นของ OSM edit ในอนาคต (snapshot ใหม่) อาจดันให้เกินเพดานได้ง่าย | คำนวณจากขนาดไฟล์จริงที่ README §7 รายงาน | low-medium (ไม่กระทบ Go/No-go รอบนี้ แต่จะกระทบรอบถัดไปถ้าไม่เฝ้า) | devops-engineer/location-engineer: พิจารณาขั้นบีบเพิ่ม (`point_geometry_area_only`/`point_geometry_all` ที่มีอยู่แล้วตาม README §5.5) หรือขยับเพดานเมื่อจำเป็น |

## 9. Dependency และ assumption

- **DEP-01/02/03** (หัวข้อ 4): เกณฑ์ G1/G3/G4/S1-S4/N3 ต้องรอ P1-F01-T06 (district-counts + distance), P1-F03-T09 (presets), และส่วนทางเสริมของ P1-F01-T02/T07 — แผนนี้ยังตั้ง case ไม่ได้ครบสำหรับส่วนนั้น จะเขียนเพิ่มเป็นภาคผนวกเมื่อ T06/T09 ส่งงาน (ไม่ใช่ blocking สำหรับ T04 เอง เพราะ acceptance ของ T04 ไม่ได้บังคับให้ครอบ T06 ที่ยังไม่เริ่ม)
- [ASSUMPTION A-P1-F01-T04-1: การรัน RAND-01 เต็มรูปแบบใน P1-F01-T08 จะเรียก Nominatim (บริการนอก sandbox) ได้เหมือนตอนเขียนแผนนี้ — ถ้า sandbox ตอน gate ไม่มีอินเทอร์เน็ต ให้ลดเกณฑ์ RAND-01 เหลือ "สุ่มตรวจด้วยตา 30 ชิ้นผ่านชื่อ/พิกัด/tag ที่มีอยู่ใน geojson เทียบความสมเหตุสมผล (เช่น ชื่อขึ้นต้น "สวน"/"ตลาด" ตรงกับ class, พื้นที่ไม่ผิดปกติ) แล้วเปิดเป็นงาน HUMAN แยกถ้าต้องยืนยันด้วยภาพถ่ายดาวเทียม" (ยืนยัน: tech-lead เรื่อง sandbox access, location-engineer เรื่องวิธีสำรอง)]
- [ASSUMPTION A-P1-F01-T04-2: `design/levels/dungeon-rules.md` (P1-F01-T02) เพิ่งมีแล้วระหว่างเขียนแผนนี้ (พบไฟล์จริงที่ `design/levels/dungeon-rules.md`) แต่ไม่ได้อยู่ใน `inputs` ที่ task brief ระบุให้ต้องอ่าน จึงยังไม่ cross-read ในรอบนี้ — P1-F01-T07/T08 ควรตรวจว่ากฎใน dungeon-rules.md (เช่น ห้ามทับถนนสายหลัก) ตรงกับ `coverageFilter.majorWayTags` ที่ตรวจไปแล้วในหัวข้อ 5.6]

## 10. Handoff สรุป

- ถึง location-engineer (owner `tools/coverage/`): แก้ GAP-01, GAP-02, GAP-03 ก่อน P1-F01-T08 ปิด gate เป็น PASS เต็มรูป — ไม่ blocking การเริ่ม gate (case อื่นรันได้ก่อน) แต่ blocking การให้ verdict PASS ของ case ที่เกี่ยวข้อง
- ถึง devops-engineer/location-engineer: เฝ้า GAP-04 (ขนาด `excluded.geojson` ใกล้เพดาน) ในรอบถัดไปที่ D1 snapshot เปลี่ยน
- ถึง level-designer (P1-F01-T02, T07): ใช้ตาราง traceability หัวข้อ 4 วางแผนว่า `design/levels/launch-criteria.md`/`coverage-report.md` ต้องอ้างคอลัมน์ไหนจากไฟล์ไหนเพื่อให้ QA สืบย้อนได้จริงตอน T08
- ถึง product-manager: ยืนยันว่าตัวคูณ route factor (PRD หัวข้อ 8, ใช้ใน T06) จะมีแหล่งอ้างอิงที่ชัดเจนก่อน QA ตรวจ G1/S1/G4/S3/N3 ได้ (ปัจจุบัน PRD เสนอ 1.3–1.4 เป็นตัวอย่างเท่านั้น ยังไม่ล็อกค่า)

## REPORT
task: P1-F01-T04
status: DONE
summary: เขียน test plan F01 ครบ 11 กลุ่ม case (repro/config/area/blocklist/religious-SF9/geometry/access/point/schema/random-sample/privacy-license) พร้อม traceability จาก roadmap และ PRD ถึงคำสั่งจริง และพบ 4 ช่องว่างจริงในโค้ด/ข้อมูลปัจจุบัน (GAP-01..04) ด้วยการตรวจไฟล์ตรง ไม่ใช่คาดเดา
outputs:
  - qa/plans/F01-test-plan.md — test plan ฉบับเต็ม 10 หัวข้อ + traceability matrix + รายการ GAP
acceptance:
  - [x] case ตรวจ: รันซ้ำได้ผลเท่าเดิม, สุ่ม polygon ≥30 ชิ้นเทียบแผนที่จริง (พื้นที่/tag/blocklist), ขอบพื้นที่ 2,999/3,000/150,000/150,001 — ครบในหัวข้อ 5.1, 5.10, 5.3 (RAND-01 รันจริงแล้ว 30/30 found, 30/30 tag match ผ่าน Nominatim lookup ที่เป็นอิสระจาก pipeline; AREA-01..04 ระบุค่าครบแต่พบ GAP-01 ว่า fixture ปัจจุบันไม่ตรงขอบพอดี)
  - [x] case ตรวจว่าวัด โรงเรียน โรงพยาบาล ราชการ ทหาร สถานทูต ไม่หลุดเข้า candidates — หัวข้อ 5.4 (BLOCK-01..07 รวม cemetery ตาม D-026)
  - [x] case เพิ่ม SF-9: historic/tourism ที่มีศาสนสถานข้างใน, สวนที่มีศาลเจ้าเล็ก (กฎสัดส่วน), งานวัดตาม A-P1-PLAN-02-3 — หัวข้อ 5.5 (REL-01..09 ตรงตาราง METHOD 7.4 ทั้ง 9 แถวที่ยืนยันแล้วว่า pytest ผ่านจริง, TEMPLEFAIR-01 เป็น negative test เฉพาะ)
  - [x] traceability จากเกณฑ์ผ่านของ F01 ใน roadmap ไปยัง case — หัวข้อ 3 (roadmap/board) และหัวข้อ 4 (ตัวเลข PRD → คอลัมน์ไฟล์ → คำสั่ง)
assumptions:
  - A-P1-F01-T04-1: sandbox ของ P1-F01-T08 มีอินเทอร์เน็ตเรียก Nominatim ได้เหมือนตอนเขียนแผนนี้ (ยืนยัน: tech-lead) มีวิธีสำรองระบุไว้ถ้าไม่มี
  - A-P1-F01-T04-2: ยังไม่ cross-read `design/levels/dungeon-rules.md` ในรอบนี้เพราะไม่อยู่ใน `inputs` ที่ task brief ระบุ (ยืนยัน: level-designer/qa-tester รอบ T08)
handoffs:
  - to: location-engineer | need: เพิ่ม fixture case ตรงขอบพื้นที่พอดี (3,000.0/150,000.0), blocker-เป็นรู, geometry เสียที่ต้อง make_valid, assembly_failed, และไฟล์ LICENSE-DATA.md (GAP-01..03) | why: METHOD.md และ board สัญญาไว้แต่ยังไม่มีจริงในโค้ด/ไฟล์ปัจจุบัน (ตรวจแล้ว) | blocking: no (ไม่ block เริ่ม T08 แต่ block verdict PASS ของ case ที่เกี่ยวข้อง)
  - to: devops-engineer | need: เฝ้าขนาด `excluded.geojson` (ปัจจุบัน 95% ของเพดาน CI guard) | why: GAP-04 เสี่ยงเกินเพดานรอบถัดไปที่ snapshot เปลี่ยน | blocking: no
  - to: product-manager | need: ล็อกแหล่งอ้างอิงตัวคูณ route factor ก่อน T06 เริ่มคำนวณระยะ | why: G1/S1/G4/S3/N3 ใน PRD ต้องสืบไปถึงค่านี้ได้ (หัวข้อ 4) | blocking: no (T06 ยังไม่เริ่ม)
decisions:
  - none
questions_for_human:
  - none


