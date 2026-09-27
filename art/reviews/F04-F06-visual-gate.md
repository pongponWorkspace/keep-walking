# Content gate (visual) F04–F06 — loop dungeon ทั้งวงบน client

Task: P2-F06-T23 · ผู้ตรวจ: art-director · วันที่: 2026-09-28 · protocol ข้อ 6 (content gate, visuals) · รอบ 1

**verdict: NEEDS_CHANGES**

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
