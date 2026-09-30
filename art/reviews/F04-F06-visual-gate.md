# Content gate (visual) F04–F06 — loop dungeon ทั้งวงบน client

Task: P2-F06-T23 · ผู้ตรวจ: art-director · วันที่: 2026-09-28 · protocol ข้อ 6 (content gate, visuals) · รอบ 1

**verdict: NEEDS_CHANGES** (รอบ 1) · **รอบ 2 (2026-09-28): verdict: NEEDS_CHANGES → ส่ง HUMAN ตาม protocol ข้อ 6** ดูหัวข้อ 7

## 0. สรุป

ของที่เป็นงานภาพต้นทางผ่านทั้งหมด: อวตาร (V-18/V-19 แก้ครบ) ชุดไอคอน Phase 2 และ effect ทุกตัว (จบในตัว ไม่มี loop และ opacity ใช้เฉพาะช่วงเข้าออก ≤ 200 ms) · non-negotiable ด้านภาพก็ผ่าน: ไม่มีตำแหน่งผู้เล่นอื่นบนแผนที่ ไม่มีเส้นทางวาดบนแผนที่ และการนำทางบอกเป็นระยะเส้นตรง + ทิศ + ลิงก์ไปแอปแผนที่ภายนอก

ที่ไม่ผ่านคือ **ชั้นภาพของ client** `apps/client/src/app.css` เองยังเขียนไว้ว่าเป็น placeholder ("no visual design here yet") และคอมโพเนนต์ส่วนใหญ่ใน `design/ux/components.md` ไม่มีกฎ CSS เลย มี class อยู่ใน DOM แต่ไม่มี style (`.btn-primary`, `.card`, `.chip-status`, `.chip-distance`, `.direction-arrow`, `.banner.warn`, `.home-panel` ฯลฯ ค้นใน CSS ที่ build แล้ว `dist/assets/index-BH6dW-pl.css` เจอ 0 ครั้ง) ผลที่เห็นจริงในภาพหน้าจอ QA: ข้อความของแผงนำทางลอยทับแผนที่โดยไม่มีแผ่นรอง ปุ่ม "นำทาง" กลายเป็นลิงก์สีน้ำเงินขีดเส้นใต้ของ browser และลูกศรทิศไม่แสดง ข้อนี้ผิด S6 และ shape language 5 ตรงๆ และเป็นเรื่องใหญ่สุดของ pillar "อ่านออกกลางแดดก่อนสวย"

finding ที่ต้องแก้ก่อน re-run มี 6 ข้อ (หัวข้อ 5.1): ชั้นคอมโพเนนต์ CSS (V-30), ฟอนต์ (V-31), สีนอก token/opacity/ขนาดตัวอักษร (V-32), กรอบ rarity ที่ถูกย่อจนต่ำกว่าขนาดขั้นต่ำ (V-33), ป้ายบนแผนที่ที่แสดง key ดิบ (V-34) และชุดภาพหน้าจอครบ loop (V-36)

## 1. ขอบเขตและวิธีตรวจ

| กลุ่ม | ไฟล์ | วิธีตรวจ |
| --- | --- | --- |
| ทิศทาง | `art/direction/style-guide.md` (S1–S10, 3, 5, 6, 7, 9), `icon-grammar.md` 2, 4.3, `map-style.md` 10.1, `art/vfx/specs/motion-direction.md` | ใช้เป็นเกณฑ์ |
| UX | `design/ux/components.md` 3, 4, 6, 7, 12.1, 13.1–13.9, 15.1–15.4, `design/ux/tokens.json` | ใช้เป็นเกณฑ์ของ client |
| Client | `apps/client/src/app.css` (552 บรรทัด), `apps/client/src/ui/*.ts` (DOM และ class ทุกจอ), `apps/client/src/assets/{fonts,icon-dom,icon-glyph}.ts`, `apps/client/src/map/*`, `apps/client/dist/assets/index-BH6dW-pl.css` | อ่านโค้ดและเทียบ class ที่ DOM ใช้กับกฎ CSS ที่มีจริง |
| อวตาร | `art/src/avatar/**`, `art/assets/avatar/**`, `art/ref/avatar/composite-f03.svg` | ตรวจ V-18/V-19 จากพิกัดใน SVG |
| ไอคอน | `art/assets/icon/**`, `badge/class/*`, `frame/rarity/*` | สี stroke เทียบ token, ขนาดที่ client นำไปแสดง |
| Effect | `art/vfx/*/*.ts`, `*/timing.json` | property, ระยะเวลา, loop, filter |
| ภาพหน้าจอ | `qa/reports/F02/map-style/screenshots/android-chrome--pmtiles--S1--390x844.jpg`, `...--S5--390x844.jpg` (P2-H08, build ปัจจุบัน) | ดูภาพจริง |

**ข้อจำกัดของรอบนี้ (ต้องบอกตรงๆ):** session ของผู้ตรวจไม่มี shell จึง build client และรัน Playwright เองไม่ได้ ภาพหน้าจอที่มีอยู่ใน repo ตอนนี้มีแค่จอแผนที่/แผงนำทาง (จาก P2-H08) จอที่เหลือตรวจจากโค้ด DOM และ CSS ซึ่งพอให้ตัดสินได้ เพราะ finding หลักคือกฎ CSS ที่ไม่มีอยู่จริง ไม่ใช่รายละเอียดที่ต้องดูด้วยตา · ภาพครบทุกจอเป็นงาน V-36 และเป็นเงื่อนไขของ re-run · ไม่ได้เขียนไฟล์ลง `art/reviews/screens/F04-F06/` ในรอบนี้

**ภาพกลางแดด (S10):** P2-C02 ยังไม่ได้เดิน และ D-093 กำหนดให้เดินเฉพาะช่วงเช้าหรือเย็น จึงไม่มีภาพกลางแดดจัดในสนามของ Phase 2 · บันทึกไว้และไม่ถือเป็นเงื่อนไขของ gate นี้ ความเสี่ยงยกไป P2-RISK-01 (ตรวจกลางแดดก่อน closed beta)

## 2. Acceptance ของ P2-F06-T23

| # | เกณฑ์ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | verdict + finding เป็น handoff ถึงเจ้าของ (blocking: yes) | ทำแล้ว | NEEDS_CHANGES · หัวข้อ 5.1 |
| A2 | ทุกจอใน loop ตรวจพร้อมอ้างภาพหน้าจอ | **ทำได้บางส่วน** | ตรวจครบ 12 จอจากโค้ด (หัวข้อ 3) · ภาพหน้าจอมี 1 จอ (แผนที่ + แผงนำทาง, S1/S5) · ที่เหลือคือ V-36 |
| A3 | ไม่แสดงตำแหน่งผู้เล่นอื่น · การนำทางไม่ใช่เส้นทางที่วาด · สี rarity ตามทิศทาง | **ผ่าน** (สี rarity ผ่าน แต่ขนาดที่แสดงไม่ผ่าน → V-33) | หัวข้อ 4 |
| A4 | S5 ใน map-style 10.1 (จาก H08) | บันทึกเป็นงานของ art-director เอง | หัวข้อ 5.3 F-AD-5 |

## 3. ผลตรวจรายจอ

คอลัมน์ "ภาพ" = ภาพหน้าจอที่ใช้อ้าง · "—" = ยังไม่มีภาพ ตรวจจากโค้ด (ต้องมีใน V-36 ด้วยชื่อไฟล์ที่ระบุในหัวข้อ 5.1)

| # | จอ | ภาพ | ผล | ที่พบ (ไฟล์:บรรทัด) |
| --- | --- | --- | --- | --- |
| 1 | `S-01-map` แผนที่ + รอยแยก | S1, S5 | ผ่านบางส่วน | ผ่าน: รอยแยกขอบ `rift.500` + ไอคอนซิกแซกนิ่ง, ถนนขาวมีขอบ, ชื่อถนนไทยมี halo, จุดตัวเองสีเหลืองจุดเดียว, ไม่มีตัวเลขจำนวนคน · **ไม่ผ่าน:** ป้ายรอยแยกแสดง key ดิบ `dungeon.leelawadeeLawn`, `dungeon.pakKhlongTalat` (S1 ซ้ายกลาง, S5 กลาง) → V-34 · ป้ายสองรอยแยกใน S5 ชนกัน (`dungeon.pa…` ทับ `dungeon:khlo…`) ซึ่งหายไปเองเมื่อชื่อสั้นลงหลังแก้ V-34 ให้ตรวจซ้ำใน V-36 |
| 2 | แผงนำทาง A2 (`.nav-panel`) | S1, S5 (แถบบนสุด) | **ไม่ผ่าน** | ข้อความระยะ ทิศ และ "ใกล้ถึงแล้วกลับมาเปิดเกม" ลอยทับแผนที่โดยไม่มีแผ่นรอง (S6) ตัวอักษรชนกันเป็นบรรทัดเดียว · ปุ่ม "นำทาง" `a.btn.btn-primary` แสดงเป็นลิงก์น้ำเงินขีดเส้นใต้ (ไม่มีกฎ `.btn-primary`) · `.direction-arrow` เป็น `span` ว่างไม่มี CSS จึงไม่มีลูกศร เหลือแค่คำบอกทิศ · `.chip-distance-tag` ไม่มีรูป chip · `app.css:426-432` ตั้งแค่ตำแหน่ง ไม่มีพื้น · ส่วนเนื้อหาถูกต้องตามหลัก: ระยะเส้นตรง + คำ "เส้นตรง" + ทิศ 8 ทิศ + ลิงก์ภายนอก ไม่วาดเส้น → V-30 |
| 3 | `S-02-dungeon-confirm` | — | **ไม่ผ่าน** | `.popup` เป็นกล่องกลางจอ (`app.css:274-294`) แต่ spec เป็น bottom sheet (components 4) · หัวเป็น `div.confirm-title` ไม่ใช่ `h1.scr-title` 24 px · ปุ่ม "เข้า" `.btn-primary` และ "ยกเลิก" `.btn-secondary` เป็นปุ่ม default ของ browser · การ์ดซ้อน `.card.selected` ไม่มีขอบ 4 px + วง `accent.signal` · แถว check-in มีแต่ข้อความ ไม่มีไอคอน 48 px (`signal-wait`/`walk-in`/`speed-lock`, components 13.3) · `.chip-status.closing-soon` ไม่มีรูป chip → V-30 |
| 4 | Run HUD (`.run-bar`, `.hp-bar`, tick timer, ปุ่มออก) | — | **ไม่ผ่าน** | pill สถานะเป็น `ink.900` ทึบทุกสถานะ (`app.css:355-362`) แต่ spec 13.2 แยก Active/Grace/Suspended ด้วยขอบ แถบ และ glyph · `.run-tick-timer`, `.hp-percent` วางบนแผนที่ไม่มีแผ่นรอง (S6) · ไม่มีเส้นแบ่งปลายแถบ HP 2 px `ink.900` (13.6, art brief 4.3: แดงบนราง `ink.100` ใต้แสงสะท้อน 1.497) · แถบ HP เอง ผ่าน: ราง `ink.100` ขอบ 2 px, เติม `state.success`/`state.danger`, `scaleX` ไม่ใช่ `width`, มีตัวเลข % คู่เสมอ → V-30 |
| 5 | Toast (tick ผ่าน/ไม่ผ่าน/ของตก/เลเวล) และ banner | — | **ไม่ผ่าน** | `.toast.faded` ขอบ `ink.500` ตรง V-20 **ผ่าน** · `.toast` ปกติเป็นพื้น `ink.900` แต่ spec 6 `.toast.neutral` = พื้น `bg.surface` ขอบ `ink.900` · `.banner` ไม่มีพื้น (โปร่งทับแผนที่) · `.banner.info` พื้น `#d9edf7` เป็นสีนอก token (`app.css:123-126`, ซ้ำ V-02a ของ F03) · `.banner.warn` ไม่มีกฎ · ไม่มีไอคอนคู่ข้อความตามกฎร่วมของหัวข้อ 6 → V-30, V-32 · กรอบ rarity ในแถวของตกถูกย่อเป็น 32 px → V-33 |
| 6 | HP ต่ำ / auto-retreat / ตาย | — | ผ่านบางส่วน | effect ผ่าน (หัวข้อ 4.3) · `.toast.danger` พื้น `state.danger` ตัวอักษร `bg.paper` 5.21:1 ที่ 14 px ต่ำกว่า S8 (14 px ใช้ได้เฉพาะ ≥ 7:1) · spec 6 กำหนดเป็นขอบและข้อความ `state.danger` บน `bg.surface` · ป้าย "ถอยอัตโนมัติปิดอยู่" `.auto-retreat-off-badge` 12 px (`app.css:410-417`) ต่ำกว่า S8 → V-32 |
| 7 | จอพกกระเป๋า | — | ผ่านบางส่วน | ผ่าน: พื้น `ink.900` ทึบ, HP 64 px ตัวหนา `bg.paper` (16.39:1), ไม่มีปุ่ม, ไม่มี animation, ไม่มี toast ทับ (15.4) · **ไม่ผ่าน:** `.pocket-screen-counting` และ `.pocket-screen-wake-hint` 13 px + `opacity: 0.7` (`app.css:531-536`) ผิด S7 และ S8 · HP ไม่มี `font-variant-numeric: tabular-nums` (12.1 "type.numeric") → V-32 |
| 8 | Speed-lock overlay | — | ผ่านบางส่วน | ผ่าน: พื้น `bg.paper` ทึบ, ปุ่มเป็น `.btn-secondary` ทั้งหมด ไม่มีปุ่มเหลือง (13.4) · ขาดไอคอน `speed-lock` 48 px และหัวข้อ ≥ 20 px ตัวหนา · ปุ่มไม่มี style → V-30 |
| 9 | `S-04-run-summary` (จบปกติ/ตาย/ออกเอง/auto-retreat) | — | ผ่านบางส่วน | ผ่าน: `.screen` พื้น `bg.paper` ทึบ, ปุ่มหลักปุ่มเดียว `.btn-primary.btn-fullwidth-bottom` · ไม่ผ่าน: ปุ่มไม่มี style (ไม่มีเหลือง ไม่มีขอบ ไม่สูง 56 px) · กรอบ rarity 32 px → V-30, V-33 |
| 10 | Onboarding: intro, age gate, consent ตำแหน่ง, เลือกพลัง | — | ผ่านบางส่วน | ผ่าน: การ์ดเลือกพลังใช้ `badge.class.<id>-48` ที่ขนาดจริง 48 px + ชื่อ class เป็นข้อความ (S4) · ปุ่ม consent สองปุ่มน้ำหนักเท่ากัน ไม่ชี้นำ (ดี สำหรับ PDPA) · ไม่ผ่าน: `.card.class-select-card` และปุ่มทุกปุ่มเป็น default ของ browser · age gate และ consent ใช้ `.screen` z 50 แต่ 15.1 กำหนด `system` 60 → V-30 |
| 11 | Settings (เมนู, การเดินและความปลอดภัย), privacy, inventory, credits | — | ผ่านบางส่วน | ผ่าน: toggle 48 px ขอบ `ink.900`, สถานะเปิดมีทั้งสีและ `data-on` · ปุ่มยืนยันปิด auto-retreat เป็น `.btn-danger-confirm` คู่ปุ่มยกเลิก (9) · ไม่ผ่าน: `.btn-*` ไม่มี style ทุกตัว · inventory ปุ่ม "ใช้ยาฟื้น" เป็น `.btn-primary` ขณะที่จอเดียวกันอาจมีปุ่มหลักอื่นหรือไม่ ให้ uiux ยืนยัน (ไม่บังคับ) → V-30 |
| 12 | Home ไกล / นอกพื้นที่ / ไม่รู้ตำแหน่ง (`.home-panel`) | — | **ไม่ผ่าน** | `.home-panel` ไม่มีกฎ CSS เลย เป็นกล่อง static มุมซ้ายบนของ `#hud` ทับแผนที่ ไม่มีพื้น (S6) และซ้อนกับ GPS pill และแผงนำทาง · การ์ดอวตาร `.home-avatar-card` เป็น `div` ว่าง (โหลด asset ล่วงหน้าแต่ไม่วาด) → V-30 |

ข้อสังเกต ไม่ใช่ finding: แผนที่แสดงชื่อ POI จริงจาก OSM เช่น วัดและพระบรมมหาราชวัง (S5) เป็นชื่อสถานที่จริงบนแผนที่ฐาน ไม่ใช่ motif ที่เกมวาดขึ้น จึงไม่ขัด style guide 8.2 (map-style เลือกคงชื่อจริงให้อ่านออก) · แผง debug `#hud-panel` (alpha 85%, 11 px) แสดงเฉพาะ `?hud=1` ยอมรับเป็นเครื่องมือ ห้ามเปิดใน build ผู้เล่น

## 4. สิ่งที่ผ่าน (พร้อมหลักฐาน)

### 4.1 Non-negotiable ด้านภาพ
- **ไม่มีตำแหน่งผู้เล่นอื่น (NN-4):** `map/location-layer.ts` เขียนได้แค่ source `kw-self` (จุดตัวเองจุดเดียว เห็นใน S1) · `label_count` ไม่ถูกตั้งเลยใน Phase 2 (`dungeons/artifact.ts:76`, test `artifact.test.ts:39-43` ยืนยัน) ตรง D-089 และ style guide 9.3
- **การนำทางไม่ใช่เส้นทาง:** ใน client ไม่มี `addSource`/`addLayer`/`LineString` เลย (ค้นทั้ง `apps/client/src` ไม่รวม test) · `ui/nav-panel.ts` แสดงระยะ + `nav.straightLineTag` ("เส้นตรง") + ทิศ 8 ทิศจาก `DIRECTION_COPY_KEY` + ลิงก์ `<a target="_blank">` ไปแอปแผนที่ภายนอก + แผงคัดลอกชื่อ/พิกัด · ตรง components 13.5 และ D-089 · (ปัญหาของแผงนี้คือ style เท่านั้น → V-30)
- **สี rarity ตามทิศทาง:** `frame/rarity/*-52.svg` และ `*-72.svg` 10 ไฟล์ ขอบสีตรง token (`#888899`, `#119933`, `#2266EE`, `#9933DD`, `#DD6600` ครบ 1 ครั้งต่อไฟล์) บนขอบหมึก `#1A1A22` · client เลือก id `frame.rarity.<rarity>-52` จาก catalog ไม่เดาสีเอง (`ui/item-line-view.ts:49`) · ข้อที่ไม่ผ่านคือขนาดที่แสดง → V-33

### 4.2 อวตาร (V-18/V-19, P2-F05-T04) — ผ่าน
- V-18: clipPath ครอบแถบแสงเงาครบ 11 ไฟล์ (50 จุด ใน `art/src/avatar/**` และ `art/assets/avatar/**`) · ตัวอย่าง `art/src/avatar/body/base.svg` `base-r0-c0`: แถบล่างหัว `rect y72 h6 rx26` อยู่ใน `<g clip-path="url(#base-r0-c0-clip1)">` ซึ่ง clip ด้วย rect เดียวกับก้อนฐาน แล้ววาดเส้นรอบนอก `stroke-width="2"` นอก `<g>` เป็นลำดับสุดท้าย ตรงวิธีแก้ใน F03 R2-4 ทุกข้อ ติ่งสีเข้มใต้คางหายไปโดยโครงสร้าง
- V-19: `art/ref/avatar/composite-f03.svg` มีแถว front/side/back ครบ แต่ละแถว 4 แผง (`bg.paper` และ `bg.surface` บนพื้น `bg.night` ที่ 128 × 160 และ 96 × 120) · แผงกลางคืนวางแผ่นขาวบนพื้นดำจริงตามที่ขอ
- ใน client Phase 2 อวตารยังไม่ถูกวาดบนจอใด (`home-panel.ts:63,116` โหลด asset ล่วงหน้าแต่ `.home-avatar-card` ว่าง) ไม่ใช่ finding ของ gate นี้ เพราะไม่มีจอใน scope ที่ต้องแสดงอวตาร · เมื่อมีจอที่วาดอวตารให้ตรวจใน content gate ของ phase นั้น

### 4.3 Effect — ผ่าน
- ทุก effect ใน `art/vfx/` เป็น one-shot ไม่มี `iterations: Infinity` · opacity ใช้เฉพาะช่วงเข้าออก (`tick-feedback/timing.json`: 150/150/200 ms, exit 200 ms) ตรง S7/D-077
- `filter` มีแค่ 2 ที่ที่อนุญาต: `grayscale()` ตอนตาย (`hp-critical.ts:218`) และ `brightness()` one-shot ของ Legendary (`rarity-reveal.ts:334`) · Rare ใช้ beat แบบ transform ล้วน (`core/beats.ts:10`) ปิด V-21
- `rift-reveal.ts` ไม่ใช้ opacity กับไอคอนขอบหมึก (R-1) · แต่ client ยังไม่เรียก effect นี้ที่หัวจอ confirm (ไม่บังคับ V-37)
- แถบ HP ใช้ `scaleX` (`hp-bar.ts` ผ่าน `art/vfx/hp-bar`) ตาม V-11

### 4.4 ไอคอน (P2-F05-T07, P2-H15/H17) — ผ่าน
- ชุด SVG 72 ไฟล์ ตาม board (ui 28 + ui16 11, item 11, badge 12, frame 10) · `in-run` เป็น `currentColor` แล้ว (night 16.39:1) · `suspended` สีตายตัว D-123 · ของที่ client ใช้จริงในจอเหล่านี้: badge class 48 px ที่ขนาดจริง (ผ่าน), `icon.ui.closed` แบบ tint ด้วย `setIconGlyph` (ผ่าน), กรอบ rarity (ไม่ผ่านด้านขนาด → V-33)
- ไอคอนที่ spec กำหนดให้ใช้แต่ client ยังไม่วาง (`direction`, `signal-wait`/`walk-in`/`speed-lock`, `grace`/`in-run` ใน pill, icon คู่ toast/banner) รวมไว้ใน V-30

### 4.5 ข้อค้างจาก F03 ที่ brief สั่งตรวจ
| id | ผล | หลักฐาน |
| --- | --- | --- |
| V-15 `.chip-sponsored` | ไม่อยู่ใน Phase 2 | spec อยู่ components 13.7 · build เลื่อนออกจาก Phase 2 ตาม plan-sync W7 O-20 (board บรรทัด 120) · Phase 2 ไม่มี dungeon ผู้สนับสนุน ไม่มีจอให้ตรวจ · ต้องตรวจใน content gate ของ phase ที่เปิด sponsored |
| V-20 ขอบ `.toast.faded` | ผ่าน | `app.css:148-153` ขอบ `#555566` 2 px ทึบ ไม่มีเงา ไม่มี opacity |
| V-22 `.gps-pill` ≥ 14 px | ผ่านด้านขนาด | `app.css:98` 14 px บน `ink.900` (16.39:1 ≥ 7:1 จึงใช้ 14 px ได้) · แต่รูปทรงยังไม่ตรง components 2.1 (พื้น `bg.surface` + ขอบสี state + ไอคอน 16 px) → รวมใน V-30 |

## 5. Findings เป็น handoff

### 5.1 Blocking (ต้องแก้ก่อน re-run gate นี้)

ค่าทุกตัวข้างล่างมาจาก `design/ux/tokens.json` และ style guide 3 · เขียนเป็น hex พร้อมคอมเมนต์ชื่อ token ตามแบบที่ `app.css` ใช้อยู่แล้ว

**V-30 (gameplay-programmer) — ชั้นคอมโพเนนต์ CSS ตาม components.md** · writes ที่เสนอ: `apps/client/src/app.css` (แยกเป็น `apps/client/src/styles/components.css` ได้ ถ้า tech-lead เห็นด้วย)
1. ปุ่ม (components 3, style guide 5, Do/Don't 3): `.btn` = `min-height 48px`, `border 2px solid #1A1A22`, `border-radius 12px`, ตัวอักษร 16 px น้ำหนัก 700, `text-decoration: none`, จัดกลาง · `.btn-primary` = พื้น `#FFCC00` ข้อความ `#1A1A22`, `min-height 56px`, กว้างเต็ม, `box-shadow: 0 4px 0 #1A1A22` (ทึบ ไม่ blur), `:active` = `transform: translateY(4px)` + ไม่มีเงา ไม่มี transition · `.btn-secondary` = พื้น `#FFFFFF` ข้อความ `#333344` · `.btn-danger-confirm` = พื้น `#FFFFFF` ขอบและข้อความ `#CC2222` · `.btn-disabled`, `.btn:disabled` = พื้น `#DDDDEE` ข้อความ `#555566` ไม่มีเงา ขนาดเท่าเดิม · ใช้กับ `<a>` ได้ (ปุ่มนำทาง)
2. การ์ดและ popup (4): `.card` = พื้น `#FFFFFF` ขอบ 2 px `#1A1A22` มุม 12 px padding 16 px · `.card.selected` = ขอบ 4 px + `box-shadow: 0 0 0 3px #FFCC00` · `.popup` ของ confirm/ยืนยันออก/fallback เป็น bottom sheet (ชิดล่าง มุมบน 12 px) · หัว popup confirm 24 px ตัวหนา ตัดได้ 2 บรรทัด (ห้าม nowrap/ellipsis)
3. แผ่นรองทุกอย่างที่อยู่บนแผนที่ (S6): `.nav-panel`, `.home-panel`, `.run-bar`, แถว `.hp-bar` = พื้น `#FFFFFF` ขอบ 2 px `#1A1A22` มุม 12 px padding 12 px ทึบ 100% · `.home-panel` ต้องมี `position: absolute` ชิดล่างเหนือปุ่มตามตัว ไม่ทับ GPS pill และไม่ซ้อนกับ `.nav-panel` (สองแผงนี้ไม่แสดงพร้อมกัน ถ้าแสดงพร้อมกันได้ให้เรียงเป็น stack เดียว)
4. แผงนำทาง (13.5, 13.8): ตัวเลขระยะ 24 px ตัวหนา `tabular-nums` `#1A1A22` · `.chip-distance-tag` = pill ขอบ 1 px `#333344` ข้อความ `#333344` 14 px ตัวหนา (12.37:1) · `.direction-arrow` = ไอคอน `icon.ui.direction` 48 px วางซ้ายบรรทัดระยะ หมุนตาม `data-direction` ทีละ 45° ด้วย `transform: rotate()` แบบกระโดด (หรือ ≤ 150 ms, reduced-motion = กระโดด) · ปุ่มนำทางเป็น `.btn-primary` เต็มความกว้าง ครึ่งล่างจอ · `nav-fallback-open-link` เป็น `.btn-secondary`
5. Chip สถานะ (13.1): สูง ≥ 32 px ตัวหนา 14 px มุม 999 px + ไอคอนหน้า · `.closing-soon` พื้น `#FFCC00` ขอบ 2 px `#1A1A22` · `.closed` พื้น `#FFFFFF` ขอบ `2px dashed #555566` ข้อความ `#333344` · in-run ขอบ 4 px `#1A1A22` · ห้ามพื้น `ink.900` + ข้อความ `bg.paper` กับ chip สถานะ
6. Run-state pill (13.2): Active = พื้น `#FFF8EE` ขอบล่าง 2 px `#1A1A22` + glyph `in-run` · Grace = แถบล่าง 6 px `#006699` + ข้อความ `#006699` + glyph `grace` · Suspended = พื้น `#006699` ข้อความ `#FFFFFF` + glyph `suspended` · ไม่มีสถานะใดเป็นแดง ไม่มีกะพริบ
7. แถบ HP (13.6): เส้น 2 px `#1A1A22` ที่ปลายส่วนที่เติม ต้องเลื่อนตามค่า HP · ถ้าวางเป็น `::after` ของ `.hp-fill` เส้นจะถูก `scaleX` บีบไปด้วย ให้ใช้ element แยกที่เลื่อนด้วย `translateX` จากค่าเดียวกัน ประสานสัญญา DOM กับ vfx-animator (`art/vfx/hp-bar/hp-bar.ts`)
8. Toast และ banner (6): `.toast.neutral`/`.toast` = พื้น `#FFFFFF` ขอบ 2 px `#1A1A22` ข้อความ `#1A1A22` 16 px · `.banner` ต้องมีพื้นทึบเสมอ · ทุก toast/banner มีไอคอนคู่ข้อความ (S4) · GPS pill ตาม 2.1 (พื้น `#FFFFFF` ขอบ 2 px สี state ข้อความสี state 14 px ตัวหนา + `icon.ui16.location-off` ตอน bad) — state success/danger บน surface ได้ 5.66/5.50 จึงต้อง 16 px หรือคงพื้น `ink.900` แบบปัจจุบันซึ่ง 14 px ใช้ได้ ให้ uiux-designer เลือกหนึ่งแบบ
9. แถว check-in (13.3): ไอคอน 48 px ตามเหตุ + ข้อความ 16 px `#1A1A22` + ตัวนับถอยหลังตัวหนา tabular · Speed-lock (13.4): ไอคอน `speed-lock` 48 px + หัว ≥ 20 px ตัวหนา
10. z-index: `.screen.age-gate-screen` และ `.screen.consent-location-screen` = 60 (`zIndex.system`, 15.1)

**V-31 (gameplay-programmer) — ฟอนต์ UI** · `fonts.ts` ประกาศ `@font-face` แล้วแต่ไม่มีกฎใดใช้ family นั้น `#hud` ยังเป็น `system-ui` (`app.css:64-66`) · ให้ตั้ง `font-family` ของ `#hud` เป็น family จาก manifest (IBM Plex Sans Thai Looped, style guide 7) ตามด้วย `system-ui, sans-serif` · เนื้อหา 500, หัวข้อ/ปุ่ม/ตัวเลข 700, `line-height` ≥ 1.5 · ตัวเลข HP, ระยะ, tick timer, HP จอพกกระเป๋า ใช้ `font-variant-numeric: tabular-nums` · ห้ามฝังชื่อ family เป็น literal ถ้า manifest ให้ชื่อได้ (อ่านจาก `manifest.fonts[]` แล้วตั้ง CSS variable)

**V-32 (gameplay-programmer) — สีนอก token, opacity, ขนาดตัวอักษร**
| ที่ | ปัญหา | กฎ | แก้เป็น |
| --- | --- | --- | --- |
| `app.css:123-126` `.banner.info` | พื้น `#d9edf7` นอก token · ข้อความ `#006699` 14 px (6.25:1 < 7) | style guide 3, S8 | พื้น `#FFFFFF` ขอบล่าง 2 px `#006699` ข้อความ `#006699` **16 px** + ไอคอน · `.banner.warn` แบบเดียวกันด้วย `#CC2222` (5.50:1) |
| `app.css:531-536` ข้อความรองจอพกกระเป๋า | `opacity: 0.7` บนข้อความ, 13 px | S7, S8 | ไม่มี opacity · สี `#9999AA` (`ink.300` บน night 6.17:1) ขนาด 16 px · ยังอ่านเป็น "จาง" ตาม 12.1 |
| `app.css:421-424` `.toast.danger` | พื้นแดง ข้อความ `bg.paper` 14 px (5.21:1 < 7) | S8, components 6 | พื้น `#FFFFFF` ขอบ 2 px และข้อความ `#CC2222` 16 px ตัวหนา (5.50:1) + ไอคอน `icon.ui.hp-low` · ข้อความ `run.hpLow` เป็น canon ไม่แตะคำ |
| `app.css:410-417` `.auto-retreat-off-badge` | 12 px | S8 | 16 px ตัวหนา พื้น `#FFFFFF` ขอบ 2 px และข้อความ `#CC2222` (5.50:1) หรือใช้ `.banner.warn` ตาม components 9 "banner เตือนค้างในหน้า run" · ห้ามพื้น `ink.900`+`bg.paper` (รูปของ sponsored) |
| `app.css:135-139` `.toast` | 14 px | S8 | 16 px (พื้นเปลี่ยนเป็น surface ตาม V-30 ข้อ 8) |
| `app.css:26-37` fallback แผนที่ว่าง | `#444` นอก token | style guide 3 | `#333344` (`ink.700`) · เป็นจอ dev แต่ผู้เล่นเห็นได้ถ้า tile URL หาย |

**V-33 (gameplay-programmer) — กรอบ rarity ถูกย่อต่ำกว่าขั้นต่ำ** · `.item-icon-frame` กว้าง 32 px (`app.css:235-242`) แต่ใช้ไฟล์ `frame.rarity.*-52` (`item-line-view.ts:49`) ขอบหมึก 2 px จึงเหลือ 1.23 px และแถบสี 2 px เหลือ 1.23 px pip และมุมตกแต่งอ่านไม่ออก ผิด S8 และ icon-grammar 2 บรรทัด 60 ("ขนาดเล็กกว่านี้ห้ามใช้กรอบ ให้ใช้ chip ชื่อ rarity แทน") · แก้: `.item-icon-frame` 52 × 52 และ glyph 48 × 48 กึ่งกลาง (inset 2 px, icon-grammar 4.3) ทั้งในหน้าสรุป run และแถวของตกใน toast · ถ้าแถวใน toast ไม่มีที่ 52 px ให้ใช้ item icon 32 px ไม่มีกรอบ + chip ชื่อ rarity (icon-grammar 4.4, พื้นสี rarity ข้อความตามตาราง 4.2 ของ style guide) แทน ห้ามย่อกรอบ · effect `drop.rarity.*` ต้องยังได้ target แบบเดิม (ประสานกับ vfx-animator ถ้าเปลี่ยน DOM)

**V-34 (gameplay-programmer) — ป้ายรอยแยกแสดง key ดิบ** · S1 และ S5 เห็น `dungeon.leelawadeeLawn`, `dungeon.pakKhlongTalat`, `...rohGarden` เป็นอักษรอังกฤษบนป้าย `rift.500` · ใช้กฎเดียวกับแผงนำทาง A2 (`nav-panel.ts:268-270`): resolve ผ่าน `names.th.json` (`getDungeonShortName`) ก่อนใส่ `label_name` ใน `kw-dungeon-labels` และถ้า resolve ไม่ได้ให้ไม่ใส่ป้ายเลย (ขอบและไอคอนรอยแยกยังอยู่) ห้ามแสดง key ดิบบนแผนที่ · ถ้าต้นเหตุคือ fixture ของ QA ไม่มีชื่อใน `names.th.json` ก็ยังต้องมีทางหนีไฟนี้ในโค้ด · narrative-designer ตรวจคำใน copy gate แยกต่างหาก

**V-36 (qa-tester) — ภาพหน้าจอครบ loop หลังแก้ V-30 ถึง V-34** · Playwright, Android Chrome 390 × 844, provider Mock (trace สังเคราะห์เท่านั้น ห้ามมีตำแหน่งคนจริง), `?e2eSkipOnboarding=1&start=2026-10-02T12:00` ยกเว้นจอ onboarding · ทางไปแต่ละจอดูจาก `apps/client/e2e/{full-run,f06-hp,pocket-screen,onboarding,withdraw-consent,map-shell}.spec.ts` · บันทึก PNG ≤ 300 KB ต่อภาพ (ถ้าเกิน ลด device scale เป็น 1) ที่ `art/reviews/screens/F04-F06/` ชื่อไฟล์ตามนี้ และบันทึกคู่ขาวดำ `*-gray.png` ของทุกภาพ (ตัวแทน S10 จนกว่าจะมีภาพกลางแดดจริง):
`01-map-far` · `02-map-near-nav` · `03-nav-fallback` · `04-confirm-b1-wait` · `05-confirm-b1-ready` · `06-confirm-b2-overlap-selected` · `07-confirm-closed` · `08-run-active` · `09-run-grace` · `10-toast-tick-loot` · `11-toast-tick-denied` · `12-hp-low` · `13-pocket` · `14-speedlock` · `15-summary-normal` · `16-summary-death` · `17-summary-autoretreat` · `18-intro` · `19-age-gate` · `20-consent` · `21-class-select` · `22-settings-walking-safety` · `23-privacy` · `24-inventory` · `25-home-out-of-area` · `26-home-unknown` · writes ที่เสนอ: `art/reviews/screens/F04-F06/` (ขอ producer เพิ่มใน writes ของงาน qa) · ถ้างานนี้รวมกับ P2-H08 แบบเดียวกันได้ ใช้ harness เดิม

**เกณฑ์ re-run:** ตรวจเฉพาะ V-30 ถึง V-34 จาก diff และภาพ 26 จอของ V-36 · ผ่านเมื่อ (1) ทุกจอไม่มีข้อความบนแผนที่ที่ไม่มีแผ่นรอง (2) ทุกจอมีปุ่มเหลืองไม่เกินหนึ่งปุ่มและปุ่มทุกปุ่มมีขอบหมึก (3) ในภาพขาวดำ แยกปุ่มหลัก การ์ดที่เลือก chip สถานะ และแถบ HP ออกได้ (4) ไม่มีสีนอก token opacity บนข้อความ หรือข้อความ < 16 px ที่ contrast < 7:1 (5) ไม่มี key ดิบบนจอ · ถ้าได้ NEEDS_CHANGES อีกครั้ง ส่ง HUMAN ตาม protocol ข้อ 6

### 5.2 ไม่บังคับ

| id | ถึง | ต้องทำ | เมื่อไร |
| --- | --- | --- | --- |
| V-35 | gameplay-programmer | `ui/cue-visual.ts` สร้าง `.cue-visual-pulse` แต่ไม่มีกฎ CSS จึงเป็น element ว่างที่ไม่เคยแสดง และคอมเมนต์บรรทัด 17–20 อ้างว่าอยู่เหนือจอพกกระเป๋า ซึ่งขัดคำตัดสิน components 15.4 · เลือกหนึ่งทาง: ลบออก (toast/effect เดิมพอแล้ว) หรือกำหนด CSS ที่ one-shot ≤ 200 ms, ไม่ใช้ opacity กับขอบหมึก, ไม่ทำงานขณะจอพกกระเป๋าเปิด และแก้คอมเมนต์ให้ตรง 15.4 | รวมกับ V-30 |
| V-37 | gameplay-programmer | เรียก effect `rift-reveal` (scaleY 0.6→1 300 ms one-shot, R-1) กับ `icon.ui.rift` ที่หัว `S-02-dungeon-confirm` ตาม motion-direction 8 · ตอนนี้หัว popup ไม่มีไอคอนรอยแยกเลย | รวมกับ V-30 ถ้าทัน |
| V-38 | uiux-designer | components 6: เขียนขนาดตัวอักษรของ toast/banner ให้ชัด (16 px เว้นแต่คู่สี ≥ 7:1) และเลือกแบบ GPS pill หนึ่งแบบตาม V-30 ข้อ 8 · ยืนยันว่า inventory มีปุ่ม `.btn-primary` ได้กี่ปุ่ม (ปุ่ม "ใช้ยาฟื้น") | ก่อน X ของ V-30 เริ่ม (ไม่ต้องรอก็ได้ ใช้ค่าในหัวข้อนี้ไปก่อน) |
| V-39 | vfx-animator | ยืนยันสัญญา DOM ของ `hp-bar.ts` เมื่อเพิ่มเส้นแบ่งปลายแถบ (V-30 ข้อ 7) และของ `rarity-reveal.ts` เมื่อกรอบเปลี่ยนเป็น 52 px (V-33) | พร้อม X ของ V-30/V-33 |
| V-17 (ค้างจาก F03) | HUMAN ผ่าน qa-tester | ภาพกลางแดด 12:00–15:00 ตาม S10 · ตาม D-093 ไม่มีการเดินกลางแดดใน Phase 2 ยกไป P2-RISK-01 ก่อน closed beta | ก่อน closed beta |

### 5.3 งานของ art-director เอง (writes ของงานนี้คือไฟล์ review จึงบันทึกเป็นงานตามหลัง)

| id | ไฟล์ | แก้อะไร |
| --- | --- | --- |
| F-AD-5 | `art/direction/map-style.md` 10.1 แถว S5 | (จาก P2-H08) ที่ 100.4950, 13.7400 z14 แม่น้ำอยู่ในกรอบแต่เป็นช่วงโค้งสั้น MapLibre จึงไม่วางป้ายชื่อแม่น้ำ (ภาพ S5: เห็นขอบน้ำและคลอง แต่ไม่มีคำ "แม่น้ำเจ้าพระยา") · เสนอเปลี่ยนเป็นช่วงแม่น้ำที่ตรงและยาวกว่า: **100.5140, 13.7180 z14** (ช่วงสาทร–บางรัก แม่น้ำวิ่งเกือบแนวตั้งผ่านกลางจอ ~1.5 km) และเพิ่มเกณฑ์ "ป้ายชื่อแม่น้ำอย่างน้อย 1 ป้ายในกรอบ" · ถ้าจุดนี้ยังไม่ได้ป้าย ให้ถอยเป็น z13 ที่จุดเดิม · qa-tester ถ่ายซ้ำใน V-36 รอบเดียวกัน (ไม่เพิ่มงาน) · ไม่ใช่บั๊กของ style |
| F-AD-6 | `art/direction/style-guide.md` 2 (S8) | เพิ่มตัวอย่างว่าข้อความสี state บนพื้นสว่าง (5.2–6.3:1) ต้อง 16 px เสมอ เพราะไม่ถึง 7:1 · กันไม่ให้ banner/pill 14 px หลุดมาอีก |

## 6. สิ่งที่ gate นี้ไม่ได้ตัดสิน

- คำในเกม (key ดิบ, ความยาว, โทน) เป็นของ copy gate P2-F06-T22 · V-34 ตัดสินเฉพาะว่า "ห้ามมีอักษร key บนภาพ"
- ภาพกลางแดดจริง (S10) ไม่มีใน Phase 2 ตาม D-093 · ความเสี่ยงอยู่ที่ P2-RISK-01
- `.chip-sponsored` (V-15) ไม่อยู่ใน Phase 2 ตาม O-20 · ตรวจเมื่อ phase ที่มี dungeon ผู้สนับสนุนถึง content gate
- อวตารบนจอจริงยังไม่มีใน Phase 2 · ไฟล์ต้นทางผ่าน (4.2)

---

## 7. รอบ 2 (P2-F06-T23 round 2, 2026-09-28)

**verdict: NEEDS_CHANGES** · เป็น NEEDS_CHANGES ครั้งที่สองของ gate นี้ จึงส่ง HUMAN ตาม protocol ข้อ 6 และ board swap rule 12

### 7.0 สรุปรอบ 2

ชั้นคอมโพเนนต์ที่ X42/X41 ทำมาดีขึ้นมาก ปุ่มทุกปุ่มใน UI ของเกมมีขอบหมึก 2 px แล้ว popup ทั้งหมดเป็น bottom sheet แผงบนแผนที่มีแผ่นรองทึบ (nav, home, run-bar, แถว HP) ฟอนต์ IBM Plex Sans Thai Looped ขึ้นจริงทุกจอ ป้ายรอยแยกเป็นชื่อไทยแล้ว (ไม่มี key ดิบ) และกรอบ rarity แสดงที่ 52 px · **V-31, V-32, V-33, V-34 ปิด** · **V-36 ปิดแบบมีข้อยกเว้น** (ถ่ายได้ 24/26 จอ ส่วนอีก 2 จอไม่ block ดู 7.2)

**V-30 ยังไม่ปิด** เพราะภาพรอบนี้เจอ defect ของชั้นคอมโพเนนต์เอง 5 จุด (7.3) ซึ่งผิดเกณฑ์ re-run ข้อ 1, 2 และ 4 ที่ตั้งไว้ในหัวข้อ 5.1 จุดที่หนักสุดคือ **toast ทุกตัวที่มีการเคลื่อนไหวถูกดันไปชิดขวาจนข้อความขาด** (ทั้ง toast tick ผ่านและข้อความ canon `run.hpLow`) ต้นเหตุคือ effect เขียนทับ `transform` ของ `.toast` ซึ่งยืนยันได้จากโค้ด ข้อนี้ไม่ใช่เฟรมค้างระหว่างเปลี่ยนจอ (7.4) · อีก 4 จุด: banner Grace ถูกแถว HP ทับ, ปุ่มหลักหน้าสรุป run ไม่เป็นสีเหลือง, ปุ่ม "แผนที่ตามตัว" เป็นปุ่ม default ของ browser บนแผนที่ และข้อความ pill Grace/Suspended 14 px ที่ contrast ไม่ถึง 7:1 · ทุกจุดแก้ได้ใน CSS หรือแก้ DOM นิดเดียว ไม่ต้องทำงานภาพใหม่

ไม่มีจอไหนแสดงตำแหน่งผู้เล่นคนอื่น ไม่มีเส้นทางวาดบนแผนที่ และไม่มีข้อใดผิด non-negotiable (ตรวจภาพทั้ง 24 จอ + bonus: บนแผนที่มีจุดตัวเองสีเหลืองจุดเดียว ไม่มีตัวเลขจำนวนคน แผงนำทางมีแค่ระยะเส้นตรง + ทิศ + ปุ่มไปแอปภายนอก)

### 7.1 Findings blocking ของรอบ 1: ปิดหรือยัง

ชื่อไฟล์ทั้งหมดอยู่ใน `art/reviews/screens/F04-F06/` (`-gray.png` คือคู่ขาวดำของภาพเดียวกัน)

| id | ผล | หลักฐาน (ภาพ) | หมายเหตุ |
| --- | --- | --- | --- |
| V-30 | **ยังไม่ปิด** | `09-run-grace.png`, `10-toast-tick-loot.png`, `12-hp-low.png`, `15/16/17-summary-*.png`, `01/02/08-*.png` (ปุ่มมุมซ้ายบน) | ที่ผ่านแล้ว: ปุ่ม (`04`, `05`, `03`, `14`, `20`, `22`–`24`, `bonus-settings-menu`) ขอบหมึก 2 px ทุกปุ่ม ปุ่มเหลืองไม่เกินหนึ่งปุ่มต่อจอ ปุ่ม disabled เป็น `ink.100`/`ink.500` (`04`, `19`) · popup เป็น bottom sheet หัว 24 px ตัวหนา (`04`, `05`, `07`) · แผ่นรองทึบ (`01`, `02`, `08`, `25`, `26`) · แผงนำทางมีตัวเลขระยะ 24 px, chip "เส้นตรง", ลูกศร 48 px และปุ่มเหลือง (`02`) · pill Active/Grace ต่างกันด้วยพื้น แถบล่าง และ glyph (`08` เทียบ `09`) · เส้นแบ่งปลายแถบ HP เห็นชัด (`09`/`10` ที่ 98%, `12` ที่ 7%) · ภาพขาวดำยังแยกปุ่มหลัก ปุ่มรอง และแถบ HP ออกจากกันได้ (`05-…-gray`, `12-…-gray`) · **ที่ยังไม่ผ่าน: 5 จุดในข้อ 7.3** |
| V-31 | **ปิด** | ทุกภาพ เช่น `04`, `13`, `15` | ตัวอักษรไทยเป็นแบบมีหัว (Looped) ของ IBM Plex Sans Thai Looped · `app.css:33,52` ใช้ `var(--kw-font-ui, …)` · ตัวเลขใช้ `tabular-nums` (`.hp-percent`, `.run-tick-timer`, `.chip-distance`, จอพกกระเป๋า) |
| V-32 | **ปิด** | `13-pocket.png` (ข้อความรองเป็นสี `ink.300` ทึบ ไม่มี opacity), `12-hp-low.png` (`.toast.danger` พื้นขาว ข้อความแดง 16 px ตัวหนา), `08` (toast แจ้งจอดับ 16 px) | ใน `app.css` ไม่มี `#d9edf7` และ `#444` แล้ว · `.banner.info/.warn` พื้น `bg.surface` 16 px · ป้ายถอยอัตโนมัติปิดอยู่เปลี่ยนเป็น `.banner.warn` แล้ว (ดูจากโค้ด เพราะไม่มีภาพ) · ข้อ pill 14 px ที่เจอใหม่ นับรวมไว้ใน V-30 (7.3 R2-5) ไม่เปิด V-32 ใหม่ |
| V-33 | **ปิด** | `15-summary-normal.png` (กรอบ 52 px + ไอคอนของ), `10-toast-tick-loot.png` (กรอบ 52 px ในแถวของตก) | วัดจากภาพได้ประมาณ 51–52 CSS px · ขอบหมึกและแถบสี rarity อ่านออก |
| V-34 | **ปิด** | `04`, `05`, `08`, `12`, `25`, `26` | ป้ายเป็น "ลานลีลาวดี", "สวนนาวานุเคราะห์", "ตลาดพาหุรัด", "คลองโอ่งอ่าง", "ป้อมมหา…" ไม่มีอักษร key · ป้ายสองรอยแยกไม่ชนกันแล้ว (`04`, `05`) |
| V-36 | **ปิดแบบมีข้อยกเว้น** | README + 24 คู่ PNG + `bonus-settings-menu` | ขาด `06` และ `11` · ทั้งสองจอไม่ block (7.2) · แต่หลังแก้ 7.3 แล้ว ต้องถ่าย `09`, `10`, `12`, `15` และ `08` ใหม่เป็นหลักฐานปิด V-30 (7.6) |

### 7.2 สองจอที่ถ่ายไม่ได้

| จอ | block verdict ไหม | เหตุผล |
| --- | --- | --- |
| `06-confirm-b2-overlap-selected` | **ไม่ block · ไม่จำเป็นสำหรับ Phase 2** | ข้อมูลที่ publish ใน Phase 2 ไม่มี dungeon ที่ polygon ซ้อนกัน (README หัวข้อ 2 ตรวจด้วย grid 201 × 201 จุด) จึงไม่มีผู้เล่นคนไหนเห็นจอนี้ใน Phase 2 · กฎ `.card.selected` (ขอบ 4 px + วง `accent.signal` 3 px, `app.css:175` ต่อจากนั้น) มีอยู่ในโค้ดแล้ว และ `.interest-option[aria-pressed]` ใช้ภาษาภาพเดียวกัน (`app.css:977-980`) · **เงื่อนไข:** จอนี้ต้องมีภาพใน content gate ของ phase แรกที่ publish dungeon ซ้อนกัน (หรือเมื่อ level-designer/location-engineer มี fixture คู่ที่ซ้อนกัน) ไม่ต้องเพิ่ม test hook ใน client เพื่อ gate นี้ |
| `11-toast-tick-denied` | **ไม่ block** | `.toast.faded` ตรวจผ่านจากโค้ดตั้งแต่รอบ 1 (V-20: ขอบ `ink.500` 2 px ทึบ ไม่มีเงา ไม่มี opacity, `app.css:481-485`) · effect `run.tickDenied` animate แค่ `opacity` ไม่แตะ `transform` (`art/vfx/tick-feedback/tick-feedback.ts:60-67`) จึงไม่โดนบั๊กตำแหน่ง R2-1 · trace ของ P2-H52 มีแล้ว (`synthetic-tick-denied-leelawadee-01`, แจ้งจาก orchestrator) · **ภาพนี้ไม่จำเป็นต่อ verdict รอบนี้** ให้ถ่ายรวมในชุดภาพของรอบแก้ 7.9 (ไม่บังคับ แต่ขอให้มี เพราะต้นทุนแทบศูนย์และได้ยืนยันว่า toast จางอยู่กึ่งกลางหลังแก้ R2-1) |

### 7.3 ที่ทำให้ V-30 ยังไม่ปิด (blocking, ต้องแก้ก่อนปิด gate)

**R2-1 (gameplay-programmer + vfx-animator): toast ถูกดันไปชิดขวาจนข้อความขาด** · ภาพ `10-toast-tick-loot.png` (เฟรมนิ่ง ทึบ 100%) และ `12-hp-low.png`: ขอบซ้ายของ toast อยู่ที่กึ่งกลางจอพอดี (x ≈ 195 CSS px) และครึ่งขวาหลุดออกนอกจอ ข้อความ "ได้ของก้อนแรกแล้ว เดินม…" และข้อความ canon `run.hpLow` อ่านไม่ครบ · **ต้นเหตุ:** `.toast` จัดกึ่งกลางด้วย `left: 50%; transform: translateX(-50%)` (`app.css:458-460`) แต่ effect ทุกตัวที่เล่นกับ toast ใช้ `element.animate({ transform: 'translateY(…)' }, { fill: 'forwards' })` (`tick-feedback.ts:47-56, 76-91, 121-128`, `hp-critical.ts:66-91`) ค่า transform ของ Web Animations แทนที่ค่าใน CSS ทั้งก้อน และ `fill: 'forwards'` ทำให้ค่านั้นค้างตลอด `translateX(-50%)` จึงหายไปถาวร ไม่ได้หายแค่ช่วงเล่น effect · เป็นปัญหาแบบเดียวกับ edge marker ของแถบ HP ที่ P2-H42 แก้ไปแล้ว (effect เป็นเจ้าของ `transform` ทั้งหมด CSS ห้ามใช้ transform กับ element นั้น) · **แก้ (CSS อย่างเดียว ไม่ต้องแก้ effect):**
```css
.toast {
  position: absolute;
  left: 0;
  right: 0;
  margin-inline: auto;   /* centres an abspos box that has an explicit width */
  width: max-content;
  max-width: calc(100vw - 32px);
  bottom: 24px;
  /* no `transform` here: art/vfx owns 100% of this element's transform (same rule as P2-H42) */
}
```
ใส่คอมเมนต์ที่ `.toast` ว่า "art/vfx owns transform" และ vfx-animator ใส่คอมเมนต์คู่กันที่หัว `tick-feedback.ts`/`hp-critical.ts` · test: e2e ตรวจว่า `boundingBox()` ของ toast อยู่ในช่วง 0–390 px และ center ต่างจาก 195 ไม่เกิน 1 px **หลัง** effect เล่นจบ (ทั้ง tick ผ่าน, tick แรก, HP ต่ำ, reduced-motion)

**R2-2 (gameplay-programmer): banner Grace ใน run-bar ถูกแถว HP ทับ** · ภาพ `09-run-grace.png`: บรรทัด "กำลังยืนยันตำแหน่ง" (`.run-bar > .banner`) ถูกแผ่น `.hp-bar` ทับจนเหลือแต่ครึ่งบนของตัวอักษร · ต้นเหตุ: `.run-bar` สูงขึ้นเมื่อ banner ขึ้นบรรทัดใหม่ (`app.css:658-661`) แต่ `.hp-bar` ตั้งตำแหน่งตายตัวที่ `top: … + 92px` (`app.css:517`) ผิดกฎ V-30 ข้อ 3 ที่ว่าแผงที่แสดงพร้อมกันได้ต้องเรียงอยู่ใน stack เดียวกัน · Suspended, closing-soon และป้ายถอยอัตโนมัติปิดอยู่จะเจอปัญหาเดียวกัน · **แก้:** ครอบ `.run-bar` + `.hp-bar` (+ `.auto-retreat-off-badge` ถ้าอยู่ในกลุ่มนี้) ด้วย container เดียว `.run-top-stack { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 8px; right: 8px; display: flex; flex-direction: column; gap: 8px; }` แล้วเอา `position/top/left/right` ออกจาก `.run-bar` และ `.hp-bar` · ห้ามแก้ด้วยการเพิ่มตัวเลข `top` เพราะความสูงของ banner เปลี่ยนตามความยาวคำ · ตำแหน่งของ `#network-banner`/`.recovering-banner` ไม่เกี่ยว (ไม่แสดงบนจอ run)

**R2-3 (gameplay-programmer + uiux-designer): ปุ่มหลักหน้าสรุป run ไม่เป็นสีเหลือง** · ภาพ `15-summary-normal.png`, `16-summary-death.png`, `17-summary-autoretreat.png`: ปุ่ม "เดินต่อเพื่อรับเพิ่ม" เป็นพื้น `bg.paper` มีเงา แต่ไม่ใช่ `accent.signal` · ต้นเหตุ: `.btn-fullwidth-bottom { background: #fff8ee }` (`app.css:156`) ประกาศทีหลัง `.btn-primary` และ specificity เท่ากัน จึงชนะ · ที่มาคือ spec ของ components.md 3.x (บรรทัด 145/149, P2-H49) สั่งให้ใส่ `background: #FFF8EE` ที่ตัวปุ่มเอง ทั้งที่เจตนาคือพื้นทึบกันเนื้อหาที่เลื่อนผ่านใต้ปุ่ม · **แก้:** ลบ `background` ออกจาก `.btn-fullwidth-bottom` · ถ้าต้องมีพื้นกันทะลุ ให้ห่อปุ่มด้วย `.screen-bottom-bar { position: sticky; bottom: 0; background: #FFF8EE; padding: 8px 0 max(16px, env(safe-area-inset-bottom)); }` แล้วให้ปุ่มอยู่ใน flow ปกติในแถบนั้น · uiux-designer แก้ components.md บรรทัด 145/149 ให้พื้น `bg.paper` อยู่ที่แถบ ไม่ใช่ที่ปุ่ม · จอสรุป run เป็นจอเดียวของ loop ที่ปุ่มหลักต้องเด่นที่สุด (style guide 5, Do/Don't 3)

**R2-4 (gameplay-programmer): ปุ่ม "แผนที่ตามตัว" (`#follow-toggle`) เป็นปุ่ม default ของ browser บนแผนที่** · ภาพ `01`, `02`, `04`, `05`, `07`, `21`, `25`, `26` (มุมซ้ายบน: พื้นเทา ขอบบาง ตัวหนังสือปกติ) และ `08`–`12` (ปุ่มโผล่จากใต้ขอบบนของ run-bar ตัวอักษรถูกตัดครึ่ง) · ผิดเกณฑ์ re-run ข้อ 2 (ปุ่มทุกปุ่มต้องมีขอบหมึก) · สร้างใน `ui/gps-ui.ts:57` ด้วย class `button` ที่ไม่มีกฎ CSS · **แก้:** ให้ใช้ `btn btn-secondary` (สูง ≥ 48 px, ขอบ 2 px `#1A1A22`, มุม 12 px, 16 px ตัวหนา) ตั้ง `position: absolute` ที่มุมขวาบน `top: max(8px, env(safe-area-inset-top)); right: 8px;` เพื่อไม่ชน `.gps-pill` ที่อยู่ซ้ายบน · **ซ่อนระหว่าง run** (หรือวางใต้ `.run-top-stack` ของ R2-2) ห้ามมีปุ่มโผล่จากใต้แผ่นรอง · ปุ่ม "แผนที่ไม่ตามตัว" ในภาพ S5 คือปุ่มเดียวกัน แก้ครั้งเดียวได้ทั้งสองสถานะ

**R2-5 (gameplay-programmer): ข้อความ pill Grace/Suspended 14 px แต่ contrast 6.25:1** · ภาพ `09-run-grace.png` ("รอยืนยัน" สี `state.info`) · `.run-state-pill { font-size: 14px }` (`app.css:611`) ใช้ได้กับ Active (`ink.900` บน `bg.paper`) แต่ Grace (`#006699` บนแผ่นขาว 6.25:1) และ Suspended (`#FFFFFF` บน `#006699` 6.25:1) ต่ำกว่า S8 (14 px ต้อง ≥ 7:1) ผิดเกณฑ์ re-run ข้อ 4 และขัด "ตัวอย่าง S8" ใน style-guide หัวข้อ 2 · **แก้:** `.run-state-pill { font-size: 16px; }` ทุกสถานะ (ค่าเดียวกันทุกสถานะเพื่อไม่ให้ pill เปลี่ยนขนาดตอนเปลี่ยนสถานะ) ถ้าแถวบนแน่นเกิน ให้ tick timer ขึ้นบรรทัดใหม่ได้ (`flex-wrap` มีอยู่แล้ว)

### 7.4 ข้อสังเกตจาก H41: toast ของ `12-hp-low` ชิดขวาและถูกตัด เป็น defect จริงไหม

**เป็น defect จริง ไม่ใช่เฟรมที่ค้างตอนเปลี่ยนจอ** (R2-1) มีหลักฐาน 3 ข้อ: (1) `10-toast-tick-loot.png` เป็นเฟรมนิ่งระหว่าง run ปกติ (ทึบ 100%, timer 04:40) และขอบซ้ายของ toast อยู่ที่ x ≈ 195 CSS px เท่ากับใน `12` (2) effect `run.hpLow` ใช้ `transform` + `fill: 'forwards'` (`hp-critical.ts:67-72, 78-88`) ซึ่งแทนที่ `translateX(-50%)` ของ CSS ตลอดอายุของ toast (3) ตำแหน่งที่ผิดตรงกับ `left: 50%` แบบไม่มี transform เลย · ส่วนที่ **เป็นอาการของเฟรมกลางการเปลี่ยนจอจริง** ใน `12` คือ toast ดูโปร่ง (ถ่ายตอน opacity ของช่วงเข้ายังไม่ถึง 1) และทั้งจอมีสีเหลืองอมน้ำตาลจางๆ ซึ่งมาจาก pulse ของ V-35 (`#hud > .cue-visual-pulse`: `accent.signal` 25% → โปร่ง ใน 180 ms one-shot, `app.css:1309-1330`) ที่เล่นพร้อม cue HP ต่ำ ถ่ายติดตอนกลาง pulse พอดี สองอย่างนี้เป็นไปตามที่ออกแบบไว้ ไม่นับเป็น finding · หลังแก้ R2-1 ให้ถ่าย `12` ใหม่ตอน HP ต่ำและ run ยังไม่จบ รอ effect จบ ≥ 700 ms แล้วค่อยถ่าย เพื่อยืนยันตำแหน่ง ขนาด 16 px และไอคอน `icon.ui.hp-low` ในเฟรมเดียวกัน

### 7.5 S5 ถ่ายซ้ำ (F-AD-5) — **ปิด**

ดูภาพเอง 2 ภาพ ได้แก่ `S5-android-chrome--pmtiles--390x844--z14.jpg` และ `S5-ios-safari--tilejson--360x800--z14.jpg`: ป้าย "แม่น้ำเจ้าพระยา" วางตามแนวน้ำกลางจอ 1 ป้ายชัดๆ และมีอีกป้ายที่ขอบบน ตัวไทยมี halo ไม่ลอย ไม่ซ้อน ขอบน้ำและคลองเป็นเส้นน้ำเงินเข้ม ชื่อถนนอ่านได้ · อีก 6 ภาพยืนยันจาก `capture-s5-results.json` (`queryRenderedFeatures` เจอป้ายแม่น้ำที่ z14 ครบ 8/8 ไม่ต้องถอยไป z13) · ตรงเกณฑ์ใหม่ของ map-style 10.1 แถว S5 · F-AD-6 ก็ปิดแล้วเช่นกัน (style-guide หัวข้อ 2 "ตัวอย่าง S8", P2-H43) · งานเก็บของ art-director เอง (ไม่ block): หมายเหตุ S5 ใน `map-style.md` บรรทัด ~300 ยังเขียนว่า fixture "ไม่ครอบตำแหน่งใหม่" ซึ่งไม่จริงแล้ว ให้แก้เป็น "build แล้ว (P2-H41)" ในงานถัดไปที่มี `map-style.md` อยู่ใน writes

### 7.6 สถานะ findings ไม่บังคับของรอบ 1

| id | สถานะ | หลักฐาน |
| --- | --- | --- |
| V-35 | **ทำแล้ว** | `#hud > .cue-visual-pulse` มีกฎ CSS แล้ว (`app.css:1309-1330`) อยู่ที่ `zIndex.toast` 30 ใต้จอพกกระเป๋าตาม 15.4 เป็นของตกแต่ง `aria-hidden` ไม่รับการแตะ เล่นครั้งเดียว 180 ms ด้วยพื้นแบน `accent.signal` 25% ไม่ใช้ opacity กับขอบหมึก · เห็นในภาพ `12` เป็นสีเหลืองจางทั้งจอ ตรงตามที่ออกแบบ |
| V-37 | **ตัดไป Phase 3** | plan-sync O-16 · หัว popup confirm ยังไม่มีไอคอนรอยแยก (`04`, `05`) ยอมรับได้สำหรับ Phase 2 |
| V-38 | **ทำแล้ว** | components.md 6 (16 px ทุก toast/banner, P2-H40), 2.1 (GPS pill พื้น surface + ขอบสี state 16 px, P2-H40/H49), 3.3 (จำนวนปุ่ม primary ใน inventory) · `24-inventory.png` ปุ่ม "ใช้ยาฟื้น" เป็นปุ่มรอง ไม่มีปุ่มเหลือง ตรงกับคำตัดสินนั้น |
| V-39 | **ทำแล้ว** | P2-H42/D-137 + X41: `.hp-fill-edge-marker` เป็น element แยก และ `art/vfx/hp-bar` เป็นเจ้าของ `transform` ทั้งหมด (`app.css:552-569`) · ในภาพ เส้นแบ่งอยู่ตรงปลายส่วนที่เติมพอดี (`09`/`10` 98%, `12` 7%) · กรอบ 52 px ใช้ DOM เดียวกันทั้งหน้าสรุปและ toast (`app.css:811-836`) |

### 7.7 ที่เจอใหม่ในรอบ 2 (ไม่ block: ไม่แสดงตำแหน่งผู้เล่นอื่น ไม่มีเส้นทางวาด ไม่ผิด non-negotiable)

| id | ถึง | ภาพ | ที่พบ | แก้ | เมื่อไร |
| --- | --- | --- | --- | --- | --- |
| V-40 | gameplay-programmer | `21-class-select.png`, `24-inventory.png` | badge class 48 px บนการ์ดเลือกพลังไม่แสดง (รอบ 1 ผ่านจากโค้ด) และไอคอนยาในกระเป๋าเป็นช่องว่าง · `setIconImg` ซ่อน `<img>` ถ้า manifest ยังโหลดไม่เสร็จตอน mount (`assets/icon-dom.ts:28-37`) และจอเหล่านี้ render ครั้งเดียว จึงไม่ได้เรียกซ้ำตอน manifest มาถึง · ชื่อ class ยังเป็นข้อความ (S4 ยังผ่าน) | render ไอคอนใหม่เมื่อ manifest พร้อม (subscribe/เรียกซ้ำ) หรือรอ manifest ก่อน mount จอ onboarding/inventory · test: การ์ดทั้ง 4 ใบมี `img:not([hidden])` | ก่อน closed beta |
| V-41 | gameplay-programmer | `12`, `09`, `14` | ไอคอนคู่ข้อความที่ components.md 6 และ 13.4 บังคับยังไม่มี: `icon.ui.hp-low` ใน `.toast.danger`, ไอคอน 24 px ใน `.banner.info/.warn` (Grace, Suspended, ถอยอัตโนมัติปิดอยู่, network), `icon.ui.recovering` (6.1) และ `icon.ui.speed-lock` 48 px กึ่งกลางจอ speed-lock (`ui/speed-lock-overlay.ts` ไม่มี element ไอคอนเลย) · ข้อนี้อยู่ใน V-30 ข้อ 8/9 ของรอบ 1 แต่ลดเป็นไม่ block เพราะทุกจุดมีข้อความกำกับเสมอ และไม่อยู่ในเกณฑ์ re-run 5 ข้อ | ใช้ `iconGlyph.setIconGlyph` แบบเดียวกับ pill (`run-bar.ts:113`) สีตามข้อความ `aria-hidden` · speed-lock ใช้ 48 px เหนือหัวข้อ | ก่อน content gate ของ Phase 3 |
| V-42 | gameplay-programmer + uiux-designer | `22-settings-walking-safety.png` | toggle เป็นวงกลมเขียวทึบ ไม่มีราง ไม่มีปุ่มเลื่อน ไม่มีข้อความบอกสถานะ และตอนเปิดขอบเปลี่ยนเป็นเขียวทำให้เสียขอบหมึก (`app.css:1051-1055`) · ภาพขาวดำยังแยกเปิด/ปิดออกด้วยความสว่าง แต่ดูไม่ออกว่าเป็นสวิตช์ | คงขอบ `#1A1A22` 2 px ทุกสถานะ · ทำเป็นราง 56 × 32 px มีปุ่มเลื่อน 24 px ชิดซ้าย/ขวาตามสถานะ (ปุ่มเลื่อนสีขาวขอบหมึก รางเปิด `state.success` รางปิด `ink.100`) โดยพื้นที่แตะยังเป็น 48 px · ถ้า uiux ต้องการคำ "เปิด/ปิด" ให้ขอ copy จาก narrative-designer | ก่อน closed beta |
| V-43 | qa-tester + gameplay-programmer | `02-map-near-nav.png` | ลูกศรชี้เกือบขึ้นเหนือ (เอียงไปทาง NNE) แต่ข้อความบอก "ทิศตะวันออกเฉียงใต้" · น่าจะถ่ายตอน transition 150 ms ยังไม่จบ (`app.css:347-351`) เพราะ `rotate(135deg)` ของ SE ถูกต้องแล้ว (glyph ต้นทางชี้เหนือ, `art/assets/icon/ui/direction.svg`) | qa ถ่าย `02` ใหม่หลัง `data-direction` ถูกตั้งแล้ว ≥ 300 ms · ถ้าลูกศรยังไม่ตรงกับข้อความ ให้เลื่อนเป็น blocking ทันที (ลูกศรกับข้อความขัดกันคือการนำทางผิด) | รอบแก้ 7.9 |
| V-44 | gameplay-programmer | `02-map-near-nav.png` | คำบอกทิศถูกตัดกลางคำ "ทิศตะวันออกเฉียง / ใต้" | ให้ `.direction-label { white-space: nowrap; }` แล้วให้ทั้งคำขึ้นบรรทัดใหม่ทั้งก้อน (แถวระยะเป็น `flex-wrap`) หรือวางคำบอกทิศเป็นบรรทัดของตัวเองใต้ตัวเลขระยะ | รวมกับ R2 |
| V-45 | qa-tester | `01-map-far.png` | เนื้อหาเหมือน `25-home-out-of-area` ("ช่วยกันปลุกจังหวัดเรา") ไม่ใช่สถานะไกล ("รอยแยกใกล้สุดอยู่ไกล") ตามที่ README ระบุ | ถ่าย `01` ใหม่ตอน title ตรงกับสถานะไกลจริง | รอบแก้ 7.9 |
| V-46 | gameplay-programmer | `21-class-select.png` | แผ่นแถว HP (ไม่มีตัวเลข %) แสดงอยู่หลัง scrim ของจอเลือกพลัง ทั้งที่ยังไม่มี run | ซ่อน `.hp-bar` นอกจอ run | รวมกับ R2-2 |
| V-47 | art-director (ตัวเอง) | `09-run-grace.png` | จุดตัวเองวาดทับป้ายชื่อรอยแยก "ลานลีลาวดี" | ตรวจลำดับ layer/`text-offset` ของ `kw-dungeon-labels` เทียบกับ `kw-self` ใน `map-style.md` แล้วเสนอค่าในงาน map-style ถัดไป | Phase 3 |

### 7.8 ส่ง HUMAN (NEEDS_CHANGES ครั้งที่สอง, protocol ข้อ 6)

สิ่งที่ขอให้คนตัดสิน (เลือกหนึ่งข้อ):
1. **(แนะนำ)** อนุมัติรอบแก้ที่แคบลง: gameplay-programmer แก้ R2-1 ถึง R2-5 (CSS เป็นหลัก มีแก้ DOM ใน R2-2 และ R2-4) → qa-tester ถ่ายใหม่เฉพาะจอในข้อ 7.9 → art-director ตรวจ**เฉพาะ** R2-1 ถึง R2-5 และ V-43 จากภาพชุดใหม่ ถ้าผ่านทุกข้อจะปิด gate เป็น PASS ได้เลย ไม่ต้องเปิดรอบเต็ม
2. ยอมรับ R2-3 ถึง R2-5 เป็นหนี้ไว้แก้ใน Phase 3 แล้วบังคับแก้แค่ R2-1 และ R2-2 (สองข้อที่ข้อความของผู้เล่นอ่านไม่ได้จริง) · art-director ไม่แนะนำ เพราะ R2-3 ถึง R2-5 แก้ได้ไม่กี่บรรทัด และ R2-5 ผิด S8 ที่เพิ่งเขียนเพิ่มในรอบนี้โดยตรง
3. Override เป็น PASS ทั้งที่มีข้อค้าง · art-director **ไม่แนะนำ**: R2-1 ทำให้ toast tick ทุกตัวและข้อความเตือน HP ต่ำ (ข้อความด้านความปลอดภัยที่เป็น canon) ถูกตัดทุกครั้งที่เล่นจริง

### 7.9 เกณฑ์ปิด gate (ใช้กับข้อ 7.8 ข้อ 1)

ภาพใหม่ Android Chrome 390 × 844 ใช้ harness เดิม (`qa/tests/e2e/visual/capture-f04-f06-screens.ts`) ทุกภาพถ่ายหลัง effect เล่นจบแล้ว (รอ ≥ 700 ms หลัง toast ขึ้น) พร้อมคู่ `-gray.png`:
- `10-toast-tick-loot` และ `12-hp-low` (HP ต่ำ run ยังไม่จบ): toast อยู่ในจอทั้งก้อน กึ่งกลาง ข้อความครบ ≤ 2 บรรทัด → R2-1
- `09-run-grace` และภาพใหม่ `09b-run-suspended` (ถ้าไปถึงได้ด้วย trace ที่มีอยู่): ข้อความ banner ไม่มีอะไรทับ แถว HP อยู่ใต้ run-bar → R2-2 · pill 16 px → R2-5
- `15-summary-normal`: ปุ่ม "เดินต่อเพื่อรับเพิ่ม" พื้น `#FFCC00` มีเงาทึบ → R2-3
- `01-map-far` (สถานะไกลจริง, V-45), `02-map-near-nav` (ลูกศรตรงกับทิศที่เขียน, V-43), `08-run-active`: ปุ่มตามตัวเป็น `.btn-secondary` ไม่ชนแผ่นรองใดๆ และไม่มีบนจอ run → R2-4
- `11-toast-tick-denied` จาก trace `synthetic-tick-denied-leelawadee-01` (P2-H52): toast จางกึ่งกลาง ขอบ `ink.500` ทึบ (ขอให้มี แต่ไม่ใช่เงื่อนไขปิด)

ผ่านเมื่อทุกข้อข้างบนเห็นในภาพจริง และจอที่เหลือไม่มีอะไรถอยหลังจากรอบนี้ (ไม่มีข้อความบนแผนที่ที่ไม่มีแผ่นรอง, ปุ่มเหลือง ≤ 1 ปุ่มต่อจอ, ปุ่มทุกปุ่มมีขอบหมึก, ไม่มีสีนอก token, ไม่มีข้อความ < 16 px ที่ contrast < 7:1, ไม่มี key ดิบ)

### 7.10 Handoff ของรอบ 2

- to: gameplay-programmer | need: แก้ R2-1 (`.toast` จัดกึ่งกลางโดยไม่ใช้ transform), R2-2 (`.run-top-stack`), R2-3 (ปุ่มหลักหน้าสรุปกลับเป็นสีเหลือง), R2-4 (`#follow-toggle` เป็น `.btn-secondary` มุมขวาบน ซ่อนระหว่าง run), R2-5 (pill 16 px) ใน `apps/client/src/app.css`, `ui/gps-ui.ts`, `ui/run-bar.ts`/`ui/hp-bar.ts` และ V-44/V-46 ไปพร้อมกัน | why: V-30 ยังไม่ปิด (7.3) | blocking: yes
- to: vfx-animator | need: ยืนยันสัญญาว่า art/vfx เป็นเจ้าของ `transform` ของ `.toast` ทั้งหมด ใส่คอมเมนต์ที่หัว `tick-feedback.ts` และ `hp-critical.ts` (ไม่ต้องแก้ effect ถ้า R2-1 แก้ฝั่ง CSS) | why: R2-1 | blocking: yes (คู่กับ R2-1)
- to: uiux-designer | need: แก้ components.md บรรทัด 145/149 (P2-H49) ให้พื้น `bg.paper` อยู่ที่แถบ sticky ไม่ใช่ที่ตัวปุ่ม · ระบุขนาดตัวอักษร 16 px ของ run-state pill ใน 13.2 · ตัดสินรูปทรง toggle ของ V-42 | why: R2-3, R2-5, V-42 | blocking: yes สำหรับ R2-3 และ R2-5 · no สำหรับ V-42
- to: qa-tester | need: ถ่ายภาพตามข้อ 7.9 หลัง X ของ R2 merge แล้ว · V-43, V-45 | why: หลักฐานปิด gate | blocking: yes
- to: HUMAN (ผ่าน producer) | need: เลือกหนึ่งข้อจาก 7.8 | why: NEEDS_CHANGES ครั้งที่สอง, protocol ข้อ 6 | blocking: yes
- to: art-director (ตัวเอง) | need: แก้หมายเหตุ S5 ใน `map-style.md` (7.5) และ V-47 | why: เก็บงาน | blocking: no

## 8. รอบ 3 (P2-F06-T23 round 3, 2026-09-30, รอบแก้แคบตาม D-140)

**verdict: PASS**

### 8.0 ขอบเขตและสรุป

คนเลือกข้อ 7.8 ข้อ 1 (D-140) รอบนี้จึงตรวจ**เฉพาะ** R2-1 ถึง R2-5 กับ V-43 และ V-45 จากภาพชุดใหม่ของ P2-H55 (build สดจาก HEAD `41a1125`, Android Chrome 390 × 844, README ของโฟลเดอร์ภาพหัวข้อ 7) ดูภาพเองทุกใบ ได้แก่ `01`, `02`, `08`, `09`, `10`, `11`, `12`, `15` และคู่ขาวดำ `15-…-gray` และเทียบกับ `apps/client/src/app.css` กับ `apps/client/e2e/toast-position.spec.ts` · ไม่เปิด finding blocking ใหม่ เว้นแต่จะเจอตำแหน่งผู้เล่นอื่น เส้นทางวาด หรือของที่ผิด non-negotiable ซึ่งไม่เจอ

**R2-1 ถึง R2-5 ปิดครบ 5 ข้อ V-43 และ V-45 ปิด ข้อ V-30 จึงปิด และ gate F04–F06 ด้านภาพเป็น PASS**

### 8.1 R2-1 ถึง R2-5

| id | ผล | หลักฐาน (ภาพ) | ที่ดู |
| --- | --- | --- | --- |
| R2-1 toast ชิดขวาจนขาด | **ปิด** | `10-toast-tick-loot.png`, `12-hp-low.png`, `11-toast-tick-denied.png`, `08-run-active.png` | toast ทุกตัวอยู่ในจอทั้งก้อนและอยู่กึ่งกลาง ขอบซ้ายกับขวาห่างจากขอบจอเท่ากัน: `10` กล่องอยู่ที่ประมาณ x 51–339 CSS px ศูนย์กลาง ≈ 195 · `12` กว้างเกือบเต็มจอ (≈ 9–381) · `11` ≈ 61–328 · `08` (toast แจ้งจอดับ) ≈ 75–315 · ข้อความครบและไม่เกิน 2 บรรทัด ได้แก่ "ได้ของก้อนแรกแล้ว เดินมาเองทั้งนั้น / เดินต่อเพื่อรับเพิ่ม" และข้อความ canon `run.hpLow` "HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support / หรือไม่ก็เลิกดื้อ" เป็นสีแดงตัวหนาบนพื้นขาว ขอบแดง · ในโค้ด `.toast` (`app.css:481-497`) ใช้ `left: 0; right: 0; margin-inline: auto` และ `width: max-content` ไม่มี `transform` และมีคอมเมนต์ "art/vfx owns 100% of this element's transform" ตรงตามที่สั่งไว้ใน 7.3 |
| R2-2 banner Grace ถูกแถว HP ทับ | **ปิด** | `09-run-grace.png`, `08-run-active.png` | "กำลังยืนยันตำแหน่ง" อ่านได้ครบทั้งบรรทัด อยู่ในแผ่น run-bar และมีเส้นใต้ `state.info` · แถว HP เป็นแผ่นแยกอยู่ใต้ run-bar มีช่องไฟ 8 px · `08` มีสามแผ่นเรียงกัน (run-bar, HP, ข้อความแนะนำ) ไม่ซ้อนกัน · ในโค้ด `.run-top-stack` เป็น flex แนวตั้ง `gap: 8px` (`app.css:619-627`) ไม่ได้แก้ด้วยการเพิ่มค่า `top` |
| R2-3 ปุ่มหลักหน้าสรุปไม่เหลือง | **ปิด** | `15-summary-normal.png`, `15-summary-normal-gray.png` | ปุ่ม "เดินต่อเพื่อรับเพิ่ม" พื้น `#FFCC00` ขอบหมึก 2 px เงาทึบด้านล่าง เป็นปุ่มเหลืองปุ่มเดียวในจอ · ภาพขาวดำยังแยกปุ่มออกจากพื้น `bg.paper` ได้ (เทากลางบนพื้นเกือบขาว บวกขอบและเงาหมึก) · ในโค้ด `.btn-fullwidth-bottom` เหลือแค่ layout และพื้นทึบย้ายไปอยู่ที่ `.screen-bottom-bar` (`app.css:155-168`) |
| R2-4 ปุ่ม "แผนที่ตามตัว" เป็นปุ่ม default ของ browser | **ปิด** | `01-map-far.png`, `02-map-near-nav.png`, `08`–`12` | ปุ่มอยู่มุมขวาบน พื้นขาว มุม 12 px ตัวหนา 16 px สูงประมาณ 44–48 px ไม่ชนแผงไหน · บนจอ run (`08`, `09`, `10`, `11`, `12`) ไม่มีปุ่มนี้และไม่มีอะไรโผล่จากใต้แผ่นรอง · ข้อสังเกต (ไม่ block): บนพื้นแผนที่ดำ ขอบ `#1A1A22` แทบไม่ตัดกับพื้น ที่ทำให้อ่านออกว่าเป็นปุ่มคือพื้นขาว ซึ่งเป็นแบบเดียวกับแผ่นรองทุกแผ่นบนแผนที่ จึงถือว่าตรงกับภาษาภาพ |
| R2-5 ข้อความ pill 14 px | **ปิด** | `09-run-grace.png` (เทียบกับ `08`, `10`) | "รอยืนยัน" มีขนาดตัวอักษรเท่ากับ "อยู่ในเขต" และเท่ากับ banner 16 px ในแผ่นเดียวกัน pill สูงประมาณ 34 CSS px · ในโค้ด `.run-state-pill` เป็น `font-size: 16px; font-weight: 700; min-height: 32px` ใช้ค่าเดียวกันทุกสถานะ (`app.css:643-664`) · ที่ 16 px ตัวหนา contrast 6.25:1 ผ่าน S8 |

### 8.2 V-43, V-45 (ภาพที่ขอถ่ายใหม่)

| id | ผล | หลักฐาน | ที่ดู |
| --- | --- | --- | --- |
| V-43 ลูกศรไม่ตรงกับทิศที่เขียน | **ปิด** | `02-map-near-nav.png` | ลูกศรชี้ไปทางขวาล่าง ปลายแหลมอยู่ขวาล่าง มุมหางอยู่บนกับซ้าย ซึ่งตรงกับ glyph ชี้เหนือที่หมุน 135° ตรงกับข้อความ "ทิศตะวันออกเฉียงใต้" · V-44 ก็ปิดด้วย: คำบอกทิศอยู่บรรทัดเดียว ไม่ถูกตัดกลางคำ (`.direction-label { white-space: nowrap }`, `app.css:364-372`) |
| V-45 ภาพ `01` ไม่ใช่สถานะไกล | **ปิด** | `01-map-far.png` | หัวข้อเป็น "รอยแยกใกล้สุดอยู่ไกล" และบรรทัดรอง "ใกล้สุด 19.0 กม. …" เป็นสถานะไกลจริง แผนที่มีจุดตัวเองสีเหลืองจุดเดียว |

### 8.3 คำตัดสิน `12-hp-low` (รอได้แค่ ~250 ms จาก margin ~348 ms ไม่ถึง 700 ms)

**รับเป็นหลักฐานปิด R2-1 ได้** (ตามที่ qa แนะนำใน README 7.5 ข้อ 1) เหตุผล:
1. เกณฑ์ "รอ ≥ 700 ms" ใน 7.9 ตั้งไว้เพื่อกันกรณีบั๊กเดิมที่ตำแหน่งผิด**หลัง** effect เล่นจบ (`fill: 'forwards'` ค้างค่า transform) แต่ต้นเหตุถูกเอาออกที่ระดับ layout แล้ว: `.toast` ไม่มี `transform` ใน CSS เลย และการจัดกึ่งกลางมาจาก box layout ซึ่ง Web Animations แตะไม่ได้ ตำแหน่งแนวนอนจึงไม่ขึ้นกับเวลาของ effect
2. `toast-position.spec.ts` วัด `getBoundingClientRect()` ตอนที่ effect กำลัง `running` อยู่จริงและวัดอีกครั้งหลังจบ ที่ 360 และ 390 px ต้องห่างจากกึ่งกลางไม่เกิน 1 px ทั้งสองครั้ง ซึ่งเข้มกว่าการถ่ายภาพนิ่งหลัง 700 ms · spec นี้ใช้ toast tick แรก ไม่ใช่ `.toast.danger` แต่ทั้งสองตัวเป็น class `.toast` ตัวเดียวกัน และ `hp-critical.ts` animate แค่ `transform`/`opacity` แบบเดียวกัน
3. ภาพ `12` เองแสดงสิ่งที่ 7.4 ขอให้ยืนยันเกือบครบ: toast กึ่งกลาง ข้อความ canon ครบ 2 บรรทัด 16 px ตัวหนา ทึบเต็ม (ไม่เห็นว่าโปร่งเหมือนรอบ 2) และ run ยังไม่ขึ้นหน้าสรุป (พิสูจน์จาก DOM) · ส่วนที่ขาดคือไอคอน `icon.ui.hp-low` ซึ่งเป็น V-41 (ไม่ block, จัดไว้ใน P2-X47) ไม่ใช่ R2-1
4. ข้อจำกัดอยู่ที่ fixture (HP ต่ำกับถอยอัตโนมัติเกิดใน hit เดียวกัน) ไม่ใช่ที่ UI

เงื่อนไขที่ตามมา (ไม่ block): ขอ trace ที่ P2-H57 ขอไว้ (run เดี่ยวในดันเจี้ยนจริงที่ HP ค้างในช่วงเตือนนานพอ) แล้วถ่าย `12` ใหม่ตามเกณฑ์ ≥ 700 ms เต็มใน content gate ถัดไปที่มี HUD run และเพิ่ม `run.hpLow` กับ reduced-motion เข้า `toast-position.spec.ts` ตามที่ 7.3 ขอไว้ (ตอนนี้ spec ครอบแค่ toast tick แรก) ใน P2-X47

### 8.4 `09b-run-suspended` ไปไม่ถึง (ยังไม่มี trace, P2-H57)

**ไม่ block** · 7.9 เขียนไว้แล้วว่า "ถ้าไปถึงได้ด้วย trace ที่มีอยู่" · ส่วนที่ต้องพิสูจน์ใน Suspended มีสองเรื่อง และทั้งสองเรื่องถูกพิสูจน์ด้วยกลไกเดียวกันจากภาพอื่นแล้ว: (1) banner ไม่ถูกทับ: Suspended ใช้ `.run-bar > .banner` ตัวเดียวกับ Grace ใน `.run-top-stack` ที่เป็น flex (`09` ผ่าน) ความสูงที่เปลี่ยนตามความยาวคำจึงดันแถว HP ลงเองโดยไม่ต้องใช้ตัวเลข (2) pill 16 px: ใช้ `.run-state-pill` ขนาดเดียวทุกสถานะ (`app.css:651-658`) และที่ 16 px ตัวหนา คู่สี `#FFFFFF` บน `#006699` (6.25:1) ผ่าน S8 · เงื่อนไข: ถ่าย `09b` ใน content gate ถัดไปที่ trace ของ P2-H57 มาถึงแล้ว ถ้าตอนนั้นพบว่า banner หรือ pill ผิด ให้เปิดเป็น blocking ของ gate นั้น

### 8.5 ตรวจว่าไม่มีอะไรถอยหลัง (เฉพาะ 8 จอที่ถ่ายใหม่)

- ไม่มีข้อความบนแผนที่ที่ไม่มีแผ่นรอง (ป้ายรอยแยกมี halo ตาม map-style, แผงอื่นเป็นแผ่นขาวทึบ) · ปุ่มเหลืองไม่เกินหนึ่งปุ่มต่อจอ (`02` "นำทาง", `15` "เดินต่อเพื่อรับเพิ่ม", จอ run ไม่มีปุ่มเหลือง) · ปุ่มทุกปุ่มมีขอบหมึก · ไม่เห็นสีนอก token · ไม่มีข้อความ < 16 px ที่ contrast < 7:1 · ไม่มี key ดิบ
- ไม่มีตำแหน่งผู้เล่นอื่น ไม่มีตัวเลขจำนวนคนระดับบุคคล ไม่มีเส้นทางวาด (แผงนำทาง `02` มีแค่ระยะเส้นตรง chip "เส้นตรง" ทิศ และปุ่มไปแอปภายนอก) ไม่มีอะไรผิด non-negotiable

### 8.6 ข้อสังเกตใหม่ (ไม่ block, ไม่เปิด id ใหม่ รวมเข้ากับงานที่มีอยู่)

- `01-map-far.png`: วงกลมเปล่าที่มุมซ้ายบนของแผ่นหน้าบ้าน (ช่อง avatar/badge) ไม่มีรูป น่าจะเป็นต้นเหตุเดียวกับ V-40 (`setIconImg` ซ่อนรูปเมื่อ manifest ยังไม่มาตอน mount) ให้รวมตรวจใน P2-X47 ด้วย
- `09-run-grace.png`: จุดตัวเองทับป้าย "ลานลีลาวดี" ยังเป็น V-47 (Phase 3, งานของ art-director)

### 8.7 Handoff ของรอบ 3

- to: producer | need: ปิด P2-F06-T23 เป็น PASS และปิด V-30 บน board · ไม่ต้องส่ง HUMAN | why: 8.0 | blocking: no
- to: location-engineer (ผ่าน P2-H57) | need: trace HP ค้างในช่วงเตือนนาน ≥ 1 วินาทีจริง และ trace ค้างนอกขอบเกิน `graceMax_s` ในดันเจี้ยนจริง | why: ถ่าย `12` เต็มเกณฑ์และ `09b` (8.3, 8.4) | blocking: no
- to: gameplay-programmer (P2-X47) | need: V-40 รวมช่องวงกลมเปล่าใน `01` (8.6), V-41, V-42 และเพิ่มกรณี `run.hpLow` + reduced-motion ใน `toast-position.spec.ts` | why: ข้อค้างไม่บังคับ | blocking: no
- to: qa-tester | need: เมื่อ trace ของ P2-H57 มาถึง ให้ถ่าย `12-hp-low` (รอ ≥ 700 ms) และ `09b-run-suspended` แนบใน content gate ถัดไป | why: 8.3, 8.4 | blocking: no
