# P2-H17 — ตรวจ icon กลางคืน (in-run, suspended, ui16) และ composite อวตาร F03

Task: P2-H17 · ผู้ตรวจ: art-director · วันที่: 2026-09-27 · ประเภท: review
อ้างอิง: `art/direction/style-guide.md` (S3, S4, S9, ตาราง contrast หัวข้อ 4, ข้อยกเว้นรอยแยก F-AD-4) · `art/direction/icon-grammar.md` (2.1, 3, 7.1.1, 8) · `art/direction/avatar-spec.md` (5.2, 5.3, 12, 13) · `art/direction/briefs/P2-assets.md` (แถว 77, 105, 194, 231–233) · `design/ux/components.md` 13.1, 13.2, 13.9 · `art/reviews/F03-visual-gate.md` (V-18, V-19) · decision-log D-121, D-122

ไฟล์ render ใน `/tmp` ไม่ได้ใช้ · ทุกคำตัดสินในเอกสารนี้มาจาก source SVG และค่า luminance ในตาราง token ของ style guide หัวข้อ 3

## สรุปคำตัดสิน

| ข้อ | เรื่อง | คำตัดสิน |
| --- | --- | --- |
| 1 | `icon.ui.in-run` (24) แปลงเป็น `currentColor` | **PASS** · ปิดประเด็นเปิด "night visibility ของ `icon.ui.in-run`" ได้ · มี finding ไม่ blocking 1 ข้อ (V-25) |
| 2 | D-122 คง `icon.ui.suspended` เป็นสีตายตัว fill `#006699` | **REJECTED ในรูปที่เสนอ** · หลักการ "ตายตัว ไม่ใช้ `currentColor`" ถูก แต่สีเติมต้องเป็น `bg.surface` `#FFFFFF` ขอบ `ink.900` 2 px (V-24) |
| 3 | `icon.ui16.*` ตามกฎเดียวกับ 24 px หรือไม่ | **ตาม** · `ui16.<name>` อยู่กลุ่ม tint เดียวกับ `ui.<name>` เสมอ · ต้องแก้ `ui16/in-run.svg` (V-23) และ `ui16/suspended.svg` (V-24) และแก้บรรทัดใน components.md 13.9 |
| 4 | `art/ref/avatar/composite-f03.svg` | **NEEDS_CHANGES** · V-18 และ V-19 ผ่าน แต่ลำดับ z ของ view `side` และ `back` ใช้ตาราง `front` (V-26, V-27) · ยังเป็น `draft` จนกว่าจะแก้ |

## 1. `icon.ui.in-run` (24 px) — PASS

Source ปัจจุบัน: path รอยแตก `fill="currentColor" stroke="currentColor" stroke-width="2"` miter limit 4 · เส้นแกน `stroke="#FFF8EE"` 1 px ตายตัว · รูปทรง path เดียวกับ `icon.ui.rift` ทุกพิกัด

| ข้อตรวจ (icon-grammar 9 / style guide) | ผล | หลักฐาน |
| --- | --- | --- |
| รูปทรงประจำตระกูล (รอยแยก = ซิกแซก) | ผ่าน | path `m13 2 3 7-4 1.5 3.5 5.5-4.5 6 1.5-7.5L9 13Z` ตรงกับ `rift.svg` |
| viewBox และ live area | ผ่าน | `0 0 24 24` · จุดยอดอยู่ใน x 9–16, y 2–22 (ดู V-25 เรื่องปลาย miter ด้านบน) |
| miter ของรอยแยก (style guide F-AD-4, grammar 3 และ 8) | ผ่าน | `stroke-linejoin="miter"` `stroke-miterlimit="4"` ทั้งสอง path |
| กลางวัน: `color` = `ink.900` บน `bg.surface` / `bg.paper` | ผ่าน | ตัว 17.29 / 16.39 · แกน `bg.paper` บนตัว `ink.900` 16.39 เห็นชัด = เหมือนไฟล์เดิมทุกพิกเซล |
| กลางคืน: `color` = `bg.paper` บน `bg.night` | ผ่าน | ตัว 16.39 (เดิม 1.00 มองไม่เห็นเลย) |
| S3 องค์ประกอบ ≥ 3:1 ทุกโทน | ผ่าน | ต่ำสุด 16.39 |
| silhouette จำได้เมื่อระบายทึบ | ผ่าน | รอยแตกซิกแซกไม่ชนกับ glyph อื่น (grammar 1 กฎแยกตระกูล) |
| งบขนาด ≤ 2 KB | ผ่าน | ไฟล์ 1 บรรทัด ราว 0.4 KB |

ข้อสังเกตที่ยอมรับ (ไม่ใช่ finding)
- กลางคืนตัวรอยแตกเป็น `bg.paper` และเส้นแกนก็เป็น `bg.paper` ตายตัว แกนจึงกลืนกับตัว เหลือ silhouette ทึบ · ยอมรับ เพราะ (ก) แกนเป็นรายละเอียดภายในไม่ใช่ตัวบอกความหมาย (ข) ยังแยกจาก `icon.ui.rift` ได้ด้วยสี (`rift.500` + แกน) และ chip `in-run` มีขอบ 4 px + ข้อความ `bg.paper` คู่เสมอ (components 13.1, S4) (ค) ถ้าจะให้แกนกลับเป็น `ink.900` ตอนกลางคืน ต้องมีสีที่ code ตั้งได้ 2 ค่าต่อ glyph ซึ่งเกินกลไก D-121 · ไม่คุ้ม
- ในกรณี fallback ของ components 13.9.2 (fetch ข้อความ SVG ไม่ได้ แล้วถอยไป `<img>`) `currentColor` ใน `<img>` resolve เป็นดำ `#000000` จึงกลับไปมองไม่เห็นบน `bg.night` ชั่วคราว · ยอมรับเป็นความเสี่ยงของ fallback เท่านั้น (chip ยังมีขอบ 4 px และข้อความ) · ส่งต่อ gameplay-programmer ให้ fallback ของ id ที่ `tintable` บน `bg.night` ใส่แผ่นรอง `bg.surface` ขนาด glyph (ดู handoff)
- ความขัดกับ icon-grammar 8 บรรทัด "สีที่ code เปลี่ยนได้" ซึ่งเดิมเขียนให้ `currentColor` ใช้ได้เฉพาะ glyph แบบ outline: `in-run` เป็น glyph เติมทึบสี "active" (`ink.900` ตามกฎ active ในหัวข้อ 3) ไม่ใช่สีความหมาย จึงเป็นกลุ่มที่ควร tint ได้ · แก้ถ้อยคำ grammar 8 ในงานนี้แล้ว (หัวข้อ 5 ด้านล่าง)

**ผล:** ประเด็นเปิด "night visibility ของ `icon.ui.in-run`" (มาจาก P2-F05-T07, ledger แถว 61) **ปิดแล้ว** สำหรับ 24 px · ส่วน 16 px ยังเปิดอยู่จนกว่า V-23 เสร็จ (ข้อ 3)

**V-25 (artist-2d, ไม่ blocking) ปลาย miter ด้านบนล้น canvas** — จุดยอดบน (13, 2) มีมุมภายในราว 43° · ปลาย miter ยื่นออก (2/2) / sin(21.6°) ≈ 2.7 px จึงไปถึง y ≈ −0.7 เกินขอบ viewBox ราว 0.7 px และถูกตัดแบน ขัด style guide F-AD-4 ("ปลายแหลมของ miter ต้องไม่ล้นขอบ canvas ขยับจุดยอดเข้าแทนการลดความหนา") · เป็นเรื่องเดียวกันใน `icon.ui.rift` (path เดียวกัน) และใน 16 px ของทั้งคู่ (จุดยอด (8.7, 1.4) stroke 1.4 ยื่น ≈ 1.9 px ถึง y ≈ −0.5) · วิธีแก้: ขยับจุดยอดบนลงเป็น y = 2.8 ใน 24 px และ y = 2.0 ใน 16 px ทั้ง `rift` และ `in-run` ให้ path ยังเหมือนกันทุกพิกัด · ตรวจ: ปลาย miter y ≥ 0 · ไม่ต้องแก้ความหนาเส้น

## 2. D-122 `icon.ui.suspended` — REJECTED ในรูปที่เสนอ, ตัดสินแทนเป็น "ตายตัว เติม `bg.surface` ขอบ `ink.900`"

ข้อเสนอของ artist-2d: คง fill `#006699` (`state.info`) + ขอบ `ink.900` 2 px ไม่แปลงเป็น `currentColor` · เหตุผล: icon-grammar 8 สงวน `currentColor` ไว้ให้ glyph แบบ outline · เทียบกับ `gate-pass`, `rift`, `hp` ที่เป็น badge สีความหมายตายตัว

ส่วนที่เห็นด้วย: **ไม่ใช้ `currentColor`** · glyph นี้เป็นรูปเติมทึบ (นาฬิกาทรายนอน = โบว์สองสามเหลี่ยม) ไม่ใช่ outline · แบบตายตัวยังทำงานได้แม้ fallback เป็น `<img>` ซึ่งสำคัญกับแถบ Suspended ที่ต้องอ่านออกกลางแดดทันที

ส่วนที่ไม่เห็นด้วย: **สีเติม `state.info` ใช้ไม่ได้กับพื้นที่ glyph นี้ไปอยู่จริง** · Suspended ต่างจาก `gate-pass`/`rift`/`hp` ตรงที่พื้นของสถานะนี้คือสีเดียวกับสีเติม (components 13.2: "พื้นทั้งแถบ `state.info`") · และ brief ของ art-director เองกำหนดไว้แล้วว่า glyph ต้อง "เติม `bg.surface` ขอบ `ink.900`" (`briefs/P2-assets.md` แถว 233) · ต้นเหตุคือ icon-grammar 7.1.1 แถว `icon.ui.suspended` เขียนว่า "เติม `state.info`" ขัดกับ brief · แก้ grammar ให้ตรง brief ในงานนี้แล้ว

contrast ของสีเติมกับพื้นที่ glyph ใช้จริง (L: `state.info` 0.1180, `ink.900`/`bg.night` 0.0107, `bg.surface` 1.0000)
| พื้น (ที่ใช้) | fill `state.info` (ไฟล์ปัจจุบัน) | ขอบ `ink.900` | fill `bg.surface` (ตัดสิน) | ผล |
| --- | --- | --- | --- | --- |
| แถบ header และจอพกกระเป๋า `state.info` ทั้งกลางวันและกลางคืน (`L-header`, `L-pocket` · brief 3.7 แถว Suspended, components 13.2) | 1.00 มองไม่เห็น | 2.77 ตก S3 | **6.25** | ต้องเปลี่ยน |
| พื้น `bg.night` (toast หรือ layer กลางคืนที่ไม่ได้ทาพื้นทั้งแถบ) | 2.77 ตก S3 | 1.00 มองไม่เห็น | **17.29** | ต้องเปลี่ยน |
| toast / การ์ด `bg.surface` (`L-toast`) | 6.25 | 17.29 | 1.00 แต่ขอบ 17.29 อ่านเป็น outline | ผ่านทั้งคู่ |

สรุป: fill `state.info` ตก S3 ใน 2 ใน 3 พื้นที่ใช้จริง ("ยังพอมองเห็น" ใน components 13.9.1 มาจากขอบหมึก 2.77:1 ซึ่งต่ำกว่าเกณฑ์) · fill `bg.surface` + ขอบ `ink.900` ผ่าน ≥ 6.25 ทุกพื้นโดยไม่ต้องให้ code ตั้งสี และตรงกับสเปกข้อความ `bg.surface` ของแถบ Suspended

**คำตัดสินที่บันทึก (art-director เป็นเจ้าของอำนาจเรื่องสไตล์ภาพ ตาม protocol 5):**
- D-122 → **REJECTED** (fill `#006699`)
- แทนด้วย: `icon.ui.suspended` และ `icon.ui16.suspended` เป็น glyph **สีตายตัว ไม่ tintable** · fill `#FFFFFF` (`bg.surface`) · stroke `#1A1A22` 2 px round join · ไม่มี `currentColor` · ความหมาย "info" มาจากพื้นแถบ `state.info` และข้อความ `run.stateSuspendedLabel` ไม่ใช่จากสี glyph (S4)
- ผลกับ components 13.9.1 แถว Suspended: เปลี่ยนจาก "ยังไม่พร้อม" เป็น "พร้อม · ไม่ต้องตั้ง `color` (glyph ตายตัว `bg.surface` + ขอบหมึก)"

**V-24 (artist-2d, blocking สำหรับ F04 content gate)** — แก้ 2 ไฟล์
- `art/assets/icon/ui/suspended.svg`: เปลี่ยน `fill="#006699"` เป็น `fill="#FFFFFF"` · คง path และ `stroke="#1A1A22" stroke-width="2" stroke-linejoin="round"`
- `art/assets/icon/ui16/suspended.svg`: ไฟล์ปัจจุบัน**ไม่มีขอบหมึกเลย** (ตก grammar 3 "เส้นรอบนอก 2 px `ink.900`" และบนพื้น `state.info` เป็น 1.00 หายทั้งตัว) · เปลี่ยนเป็น `fill="#FFFFFF" stroke="#1A1A22" stroke-width="2" stroke-linejoin="round"` บน path เดิม (จุดยอด x 2.7–13.3, y 5.3–10.7 ขอบยื่นออกไม่เกิน 1 px จึงอยู่ใน `0 0 16 16`)
- ตรวจ: ไม่มี `currentColor` ในทั้ง 2 ไฟล์ (stage จะไม่ใส่ `tintable`) · ไม่มี `#006699` · ขนาดไฟล์ ≤ 2 KB / 1.5 KB

## 3. `icon.ui16.*` — ตามกลุ่มของ 24 px ชื่อเดียวกัน

**กฎ (เพิ่มใน icon-grammar 8 ในงานนี้):** `icon.ui16.<name>` อยู่กลุ่มสีเดียวกับ `icon.ui.<name>` เสมอ · 24 tint ได้ → 16 ต้อง tint ได้ · 24 ตายตัว → 16 ตายตัวด้วยสีเดียวกัน · เหตุผล: 16 px คือ glyph เดียวกันที่ตัดรายละเอียด (grammar 2.1) ไม่ใช่ glyph ใหม่ · code สลับขนาดโดยไม่รู้ว่าเป็นคนละไฟล์ ถ้ากลุ่มสีต่างกัน glyph จะเปลี่ยนสีเองเมื่อสลับขนาด หรือหายไปในโทนที่ 24 เห็นอยู่ (เช่น `ui16.in-run` ตอนนี้ยังเป็น `#1A1A22` บน `bg.night` = 1.00)

ผลตรวจทั้ง 11 ไฟล์ใน `art/assets/icon/ui16/` (สแกน `currentColor` จาก source)
| กลุ่ม | 24 px | 16 px | ตรงกัน |
| --- | --- | --- | --- |
| tint ได้ | `closed`, `closing-soon` (ผสม), `gate-miss`, `grace`, `help`, `location-off` | มี `currentColor` ครบ 6 ไฟล์ | ตรง |
| tint ได้ | `in-run` (หลัง P2-H15) | `fill`/`stroke="#1A1A22"` ตายตัว | **ไม่ตรง → V-23** |
| ตายตัว | `gate-pass`, `hp`, `rift` | ตายตัวสีเดียวกัน | ตรง |
| ตายตัว | `suspended` | ตายตัว แต่ไม่มีขอบหมึก และสีเติมผิดตาม D-122 ที่ตัดสินแทน | **ไม่ตรง → V-24** |

**V-23 (artist-2d, blocking สำหรับ F04 content gate)** — `art/assets/icon/ui16/in-run.svg`: เปลี่ยน `fill="#1A1A22" stroke="#1A1A22"` เป็น `fill="currentColor" stroke="currentColor"` · คง path, miter, `stroke-miterlimit="4"` · ไม่ต้องเพิ่มเส้นแกน (16 px ตัดรายละเอียดภายในตาม grammar 2.1) · รวมกับ V-25 (ขยับจุดยอดบน) ในรอบเดียว · ตรวจ: `tools/art stage` ใส่ `tintable: true` ให้ `icon.ui16.in-run`

**แก้เอกสาร uiux (handoff):** `design/ux/components.md` 13.9 บรรทัด "กลุ่ม glyph เส้น (tintable)" ที่เขียนว่า "`icon.ui16.*` ทั้งชุด" ผิดตามของจริง · ให้แทนด้วยกฎข้างบน และย้าย `icon.ui.in-run` จากกลุ่ม badge สีตายตัวไปกลุ่ม tint ได้ · กลุ่ม badge สีตายตัวคงเป็น `gate-pass`, `rift`, `direction`, `hp`, `suspended` (ทั้ง 24 และ 16 ที่มี) · ตาราง 13.9.1 แถว in-run กลางคืนเป็น "พร้อม" (หลัง V-23 สำหรับ 16 px) · แถว Suspended เป็น "พร้อม · glyph ตายตัว `bg.surface` + ขอบหมึก ไม่ตั้ง `color`" (หลัง V-24)

ข้อสังเกตไม่ blocking (ไม่เปิดใหม่ในงานนี้): ชุด 16 px ใช้ `stroke-width="1.4"` ใน `rift`, `hp`, `in-run` ขณะที่ grammar 2.1 เขียนว่า "เส้นยังเป็น 2 px" · กับ `in-run` 16 (สีเติมเท่ากับสีเส้น) ไม่มีผลต่อการอ่าน · กับ `rift`/`hp` 16 เป็นขอบหมึกที่มองเห็น · ให้ตรวจใน F04 content gate ครั้งถัดไปพร้อม render จริงที่ 1x

## 4. `art/ref/avatar/composite-f03.svg` — NEEDS_CHANGES

ตรวจจาก source (552 × 636, 48 group): แถว `front`, `side`, `back` × แผง `bg.paper` และแผ่น `bg.surface` บนพื้น `bg.night` × ขนาด 128 × 160 (scale 1) และ 96 × 120 (scale 0.75) รวม 12 แผง

| ข้อตรวจ (avatar-spec 12, 13 · F03 gate V-18, V-19) | ผล | หลักฐาน |
| --- | --- | --- |
| V-19 ครบ 3 view | ผ่าน | group `row-front-title`, `row-side-title`, `row-back-title` และแผงครบ 4 ต่อแถว |
| V-19 แผงกลางคืนเป็นแผ่น `bg.surface` บนพื้น `bg.night` | ผ่าน | `panel-*-surface-night-*-bg` rect `#1A1A22` ใต้ rect `#FFFFFF` |
| V-18 แถบแสงเงาอยู่ใน `clipPath` ของก้อน · เส้นรอบนอกวาดหลังสุด | ผ่าน | ทุกก้อนมี `<g clip-path="url(#<layer>-r<n>-c<n>-clip<k>-...)">` แล้วตามด้วย rect/circle `fill="none" stroke="#1A1A22" stroke-width="2"` · id prefix ไม่ซ้ำข้ามแผง (`-day` / `-night`) |
| 3 ค่าต่อวัสดุ · ไฮไลต์ `bg.surface` 1 จุด · ไม่มี gradient/blur | ผ่าน | ทุกก้อนมีหน้า top / left / right 3 ค่า + ไฮไลต์ `#FFFFFF` 1 จุด · ผิว `skin-1` (`#FFEADB`/`#F8D5BE`/`#DDB093`) ผม `hair-1` |
| เงาพื้น `ink.900` 20% (style guide 6.3) | ผ่าน | `ellipse rx 28 ry 11 opacity 0.2` · สูง 22 = 40% ของกว้าง 56 · ในไฟล์ ref จำลองเงาที่ code วาด (avatar-spec กฎร่วมทุก layer: "เงาพื้น code วาด") |
| ปากและพวงกุญแจ (ข้อย่อยท้าย F03 gate 3.2) | ผ่าน | ปาก `#1A1A22` stroke 2 · ห่วง cy 123 r 3 |
| กล่องตา: หมวกไม่ทับตา | ผ่าน | ปีกหมวก y 24–44 · ตา y 52–60 |
| `accessory_face` ว่างใน `back` | ผ่าน | ไม่มี `round-glasses-*-back-*` |
| ลำดับ z `front` ตาม 5.2 | ผ่าน | hair_back → body+face → hair → outfit_feet → outfit_body → weapon → arm_w → sleeve_w → arm_p → sleeve_p → charm → head → face |
| ลำดับ z `side` ตาม 5.2 | **ตก → V-26** | ดูด้านล่าง |
| ลำดับ z `back` ตาม 5.2 และ E2, E3 | **ตก → V-27** | ดูด้านล่าง |
| ข้อความใน ref | ยอมรับ | `<text>` เป็นป้ายแผงของไฟล์ `ref.*` ที่ `shipped: false` ไม่ใช่ asset |

ลำดับที่ composite วาดจริง (อ่านจากลำดับ `<clipPath>` ต่อก้อน ซึ่งวางก่อนก้อนนั้นเสมอ) เหมือนกันทั้ง 3 view: `hair_back` → `body` → `hair` → `outfit_feet` → `outfit_body` → `weapon` → `arm_w` → `sleeve_w` → `arm_p` → `sleeve_p` → `accessory_charm` → `accessory_head` → `accessory_face` · นี่คือตาราง `front` ถูกใช้กับ `side` และ `back` ด้วย · composite มีไว้พิสูจน์ว่า rig ประกอบได้ตามตาราง 5.2 ซึ่ง renderer จะใช้ตรงตัว (5.2 หัวตาราง) ถ้า ref ผิด คนที่ใช้ ref เป็นต้นแบบ (rasterizer, build avatar) จะผิดตาม

**V-26 (artist-2d, blocking การ approve) `side`: แขนไกลอยู่หน้าตัว** — ตาราง 5.2 `side`: `arm_p` z 15 และ `sleeve_p` z 16 อยู่**หลัง** `body` z 20 · ใน composite วาดหลัง `weapon` จึงทับลำตัว: แขนไกล (`base-r2-c1` x 46–64 y 82–116) ทับลำตัว side (x 48–80) เกือบครึ่ง อ่านเป็นแขนที่สามอยู่หน้าอก · วิธีแก้: ใน view `side` ย้าย `arm_p` และ `sleeve_p` ไปวางหลัง `hair_back` ก่อน `body` · ตรวจ: ในแผง side เห็นแขนไกลเฉพาะส่วนที่พ้นขอบลำตัว (x 46–48 และมือที่ `hand_p` 52, 110 ถ้าพ้นขอบ) ไม่เห็นขอบหมึกของแขนไกลบนลำตัว

**V-27 (artist-2d, blocking การ approve) `back`: อาวุธและผมยาวผิดชั้น** — 2 จุด
- E3: `weapon` ต้องอยู่ z 12 **หลัง** `body` · ใน composite วาดหลัง `outfit_body` จึงทับหัว: ก้านร่ม (x 89–95 y 40–112) และร่มพับ (x 76–108 y 26–42) ทับหัวด้านขวา (หัว x 34–94) อ่านเป็นร่มแนบหน้าผู้ดูทั้งที่ตัวละครหันหลัง · วิธีแก้: ใน view `back` วาด `weapon` เป็นชั้นแรกถัดจากเงา ก่อน `body`
- E2: `hair_back` ต้องอยู่ z 47 **เหนือ** `outfit_body` · ใน composite วาดเป็นชั้นแรก (หลังตัว) ผมยาวจึงหายใต้เสื้อกันฝนแทนที่จะทับหลังเสื้อ · วิธีแก้: ใน view `back` วาด `hair_back` หลัง `outfit_body` ก่อน `weapon` เดิม (ตอนนี้ weapon ย้ายไปหลังตัวแล้ว) และก่อน `arm_w`
- ลำดับ `back` ที่ถูก (5.2): เงา → `weapon` → `body` → `hair` → `outfit_feet` → `outfit_body` → `hair_back` → `arm_w` → `sleeve_w` → `arm_p` → `sleeve_p` → `accessory_charm` → `accessory_head` → (`accessory_face` ว่าง)
- ตรวจ: แผง back ขนาด 128 เห็นร่มโผล่เฉพาะส่วนที่พ้นขอบหัวและลำตัว (ร่มพับ x 94–108, ก้านไม่ทับหัว) · ผมยาวทับฮู้ดและหลังเสื้อ

**V-28 (artist-2d, ไม่ blocking) ขอบพื้นกลางคืน** — rect `bg.night` ของแผงกลางคืน (`x=-10 y=0 w=148 h=170`) ยื่นซ้าย 10 ขวา 10 ล่าง 10 แต่บน 0 แผ่น `bg.surface` จึงชนขอบบนของพื้นมืด ไม่ตรงกับการ์ดจริงที่มีระยะรอบ · วิธีแก้: `y=-10 h=180` (และ 96 px: `y=-10 h=140`) ให้ระยะรอบ 10 px เท่ากันทุกด้าน · ถ้าชนป้ายแผงด้านบน ขยับป้ายขึ้น 10

**เงื่อนไข approve:** เมื่อ V-26 และ V-27 แก้ครบและผ่านข้อ "ตรวจ" ของแต่ละข้อ artist-2d เปลี่ยน `ref.avatar.composite-f03` ใน `art/assets/manifest.ref.json` จาก `draft` เป็น `approved` ได้เลยโดยไม่ต้องรอรอบตรวจใหม่ของ art-director (อนุมัติแบบมีเงื่อนไขในเอกสารนี้) · ต้องอัปเดต `bytes`/`sha256` ตามไฟล์ใหม่ · art-director ยืนยันซ้ำใน content gate ถัดไปที่ใช้ avatar · ตาราง 5.2 ไม่เปลี่ยน จึงไม่กระทบ `avatarRig: 1` และไม่ต้องวาด layer ใดใหม่ (แก้เฉพาะลำดับประกอบใน ref)

## 5. เอกสารที่แก้ในงานนี้ (ใน `art/direction/`)

- `art/direction/icon-grammar.md` 7.1.1 แถว `icon.ui.in-run`: สีเติมเป็น `currentColor` (token ของโทน) แกน `bg.paper` ตายตัว · บันทึกว่าประเด็นกลางคืนปิดแล้ว (P2-H17)
- `art/direction/icon-grammar.md` 7.1.1 แถว `icon.ui.suspended`: จาก "เติม `state.info`" เป็น "เติม `bg.surface` ขอบ `ink.900` สีตายตัว ไม่ tint" ให้ตรง brief 3.7 (D-122 ตัดสินแทน)
- `art/direction/icon-grammar.md` 8 แถว "สีที่ code เปลี่ยนได้": เพิ่ม glyph เติมทึบสี active (`ink.900`) เป็นกลุ่มที่ใช้ `currentColor` ได้ · สีความหมาย (`state.*`, `rift.*`, `accent.*`, `bg.surface` บนพื้นสี) ใช้ hex ตายตัว · 16 px ตามกลุ่มของ 24 px ชื่อเดียวกัน

avatar-spec ไม่มีบรรทัดติดตามสถานะ composite (สถานะอยู่ใน `art/assets/manifest.ref.json` และ F03 gate) จึงไม่แก้

## 6. Finding และการส่งต่อ

| id | owner | ไฟล์ | สิ่งที่ต้องทำ | blocking |
| --- | --- | --- | --- | --- |
| V-23 | artist-2d | `art/assets/icon/ui16/in-run.svg` | fill/stroke `#1A1A22` → `currentColor` (หัวข้อ 3) | yes (F04 content gate) |
| V-24 | artist-2d | `art/assets/icon/ui/suspended.svg`, `art/assets/icon/ui16/suspended.svg` | fill → `#FFFFFF` · 16 px เพิ่ม stroke `#1A1A22` 2 px round join (หัวข้อ 2) | yes (F04 content gate) |
| V-25 | artist-2d | `ui/rift.svg`, `ui/in-run.svg`, `ui16/rift.svg`, `ui16/in-run.svg` | ขยับจุดยอดบนลง (24: y 2.8 · 16: y 2.0) ให้ปลาย miter ไม่ล้น canvas · path ของ rift และ in-run ต้องเหมือนกัน | no |
| V-26 | artist-2d | `art/ref/avatar/composite-f03.svg` | view `side`: `arm_p`, `sleeve_p` ไปอยู่หลัง `body` | yes (approve composite) |
| V-27 | artist-2d | `art/ref/avatar/composite-f03.svg` | view `back`: `weapon` หลัง `body` (E3) · `hair_back` เหนือ `outfit_body` (E2) | yes (approve composite) |
| V-28 | artist-2d | `art/ref/avatar/composite-f03.svg` | ขอบพื้น `bg.night` 10 px ทุกด้าน | no |
| doc | uiux-designer | `design/ux/components.md` 13.9, 13.9.1 | แก้ "`icon.ui16.*` ทั้งชุด" เป็นกฎ "16 ตามกลุ่มของ 24 ชื่อเดียวกัน" · ย้าย `in-run` ไปกลุ่ม tint ได้ · แถว Suspended เป็น glyph ตายตัว `bg.surface` ไม่ตั้ง `color` · แถว in-run กลางคืนเป็น "พร้อม" | no |
| fallback | gameplay-programmer | `apps/client/src/assets/` | เมื่อ glyph `tintable` ถอยไป `<img>` (components 13.9.2) บนพื้น `bg.night` ให้วางแผ่นรอง `bg.surface` ขนาด glyph + 2 px (เหมือนกฎพื้นหลัง avatar ใน avatar-spec 3) เพราะ `currentColor` ใน `<img>` เป็นดำ | no |
| log | producer | `studio/decisions/decision-log.md` | D-122 → REJECTED · บันทึกคำตัดสินแทน (suspended ตายตัว fill `bg.surface` ขอบ `ink.900`, ทั้ง 24/16) และกฎ "ui16 ตามกลุ่ม ui" | no |

รอบตรวจซ้ำ: V-23, V-24, V-25 ตรวจใน F04 content gate ครั้งถัดไปจาก source · V-26, V-27 อนุมัติแบบมีเงื่อนไขตามหัวข้อ 4
