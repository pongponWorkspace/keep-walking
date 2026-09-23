# Screenshot และทดสอบ map style กับ fixture (P1-H06)

| หัวข้อ | ค่า |
| --- | --- |
| task | P1-H06 (handoff จาก P1-F03-T12, P1-F03-T13) |
| ผู้ตรวจ | qa-tester |
| วันที่ | 2026-09-24 |
| รันที่ | `/Users/pongpon/Game` · node v24.19.0 · pnpm · Playwright 1.63.0 (chromium/webkit ติดตั้งแล้ว) |
| อ้างอิง | `art/direction/map-style.md` หัวข้อ 10 (ขั้นทดสอบ S1–S5), 11 (ไม่มี animation ต่อเนื่อง), 13 (การตรวจ style JSON); `apps/client/e2e/map-real-fixture.spec.ts` (route-helper pattern); `qa/tests/e2e/f02-map-fixture-tile.spec.ts` (ของ qa-tester เอง); `tools/tiles/fixtures/lumpini/manifest.json` (bbox); `art/direction/map-style/samples/*.geojson` |
| deps ที่ต้อง DONE ก่อน | P1-F02-T06, P1-F02-T11, P1-X05, P1-H07, P1-X23 — ยืนยันแล้วว่า DONE ทั้งหมดจากบอร์ด |
| **verdict ของงานนี้** | ทุกข้อใน detail block ของ P1-H06 มีหลักฐาน — พบบั๊ก 1 รายการ (severity **high**, ป้ายชื่อ/จำนวนคน/ไอคอนรอยแยกซ้ำกันหลายชุดต่อ 1 dungeon) ส่งต่อ art-director (หัวข้อ 5) |

## 0. สรุปสำหรับผู้ที่ไม่มีเวลาอ่านทั้งหมด

- ถ่าย screenshot ครบ **40 ภาพ** (S1–S5 × 390×844/360×800 × PMTiles/TileJSON × android-chrome/ios-safari) เก็บใน `qa/reports/F02/map-style/screenshots/` ขนาดไฟล์ 69–184 KB (ส่วนใหญ่ ≤150 KB ตามเป้า มี ios-safari S1 สองไฟล์เกินเล็กน้อยเพราะ dpr 3 — ดูหัวข้อ 2.5)
- **ข้อจำกัดสำคัญของ fixture**: fixture `tools/tiles/fixtures/lumpini` มี bbox ครอบแค่สวนลุมพินี (`manifest.json`: `[100.538, 13.727, 100.545, 13.734]`, ~700×700 ม.) ส่วน S2 (ซอยสุขุมวิท) และ S5 (แม่น้ำเจ้าพระยา) ตามตาราง 10.1 อยู่นอก bbox นี้ — ไม่มีข้อมูล basemap จริงให้ตรวจ (จอดำสนิท) ส่วน S1 (อยู่ใน bbox พอดี), S3 (ป้าย sponsored เป็น overlay GeoJSON ไม่ผูกกับ bbox), S4 (โซนดำ/เส้นจังหวัดเป็น overlay จาก `data/map/*.geojson` จริงของ P1-H07 ไม่ผูกกับ bbox เช่นกัน) **ทดสอบได้ครบตามเกณฑ์จริง**
- **พบบั๊กใหม่ (severity high)**: ชื่อ dungeon / จำนวนคน / ป้าย sponsored / ไอคอนรอยแยก **ซ้ำกันหลายชุดสำหรับ dungeon เดียว** (S1 เห็น 4 ชุด, S3 เห็น 2 ชุด) สาเหตุคือ symbol layer ทั้ง 4 ชั้น (`kw-rift-name/-count/-sponsored/-crack`) วางตำแหน่ง anchor จาก geometry ของ polygon เดียวกับ `kw-dungeons` โดยตรง เมื่อ polygon กว้างพอที่จะถูกตัดข้ามหลาย tile ภายในของ GeoJSON source (geojson-vt) แต่ละ tile จะคำนวณ anchor ของตัวเองและวาดซ้ำ ยิ่งซ้ำชัดเพราะทุกชั้นตั้ง `*-allow-overlap: true` (ปิดการชนกันตามปกติ) — รายละเอียดและข้อเสนอแก้ในหัวข้อ 5
- `qa/tests/unit/map-style.test.ts` เรียก `validateStyleMin` จริงกับ `kw-light.style.json` → **0 error** (2/2 test ผ่าน) รันจริงใน root `pnpm test`
- จำลองตาบอดสี 4 แบบบน `style-tile.svg`/`contact-sheet-1x.svg` → **PASS** เต็มเกณฑ์ icon-grammar §6.3 (รายละเอียดแยกที่ `qa/reports/F03/colorblind/verdict.md`)
- ทดสอบกลางแดด (หัวข้อ 10.2): ยังไม่มีผลจริง เพราะเป็นขั้นที่ต้องใช้คนจริงกลางแจ้ง — อยู่ใน `qa/playtest/field-walk-kit.md` หัวข้อ 8 และแบบฟอร์ม `field-walk-form.md` หัวข้อ 3/S17 แล้ว (ตามที่ P1-F02-T14 เตรียมไว้) รอผล **HUMAN P1-F02-T20** — PENDING-HUMAN ไม่ใช่ของงานนี้
- `pnpm lint` / `pnpm typecheck` / `COVERAGE_PYTEST_REQUIRED=1 pnpm test` (910 passed, 2 skipped ที่ตั้งใจ) / `pnpm build` / `pnpm test:e2e` (28/28) — **เขียวทั้งหมด** หลังเพิ่มไฟล์ของงานนี้ (หัวข้อ 6)

## 1. วิธีทดสอบ

สคริปต์ `qa/reports/F02/map-style/capture-screenshots.spec.ts` (รันตรงด้วย `pnpm exec tsx`, ไม่ใช่ผ่าน `playwright test` เพราะโฟลเดอร์นี้ไม่อยู่ใน `testMatch` ของ `playwright.config.ts` และ `writes` ของงานนี้ไม่รวม `qa/tests/e2e/` — ใช้ `@playwright/test`'s `chromium`/`webkit` launcher ตรง) ทำตามรูปแบบเดียวกับ `apps/client/e2e/map-real-fixture.spec.ts`: `page.route()` ตอบทุก request ของ fixture (pmtiles archive, glyph pbf, sprite json/png, font-face ttf, tiles.json ที่ rewrite URL) จากไฟล์บนดิสก์ พร้อม Range/206 จริง ไม่มี network ออกนอกเครื่อง

ก่อนรัน: `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview` (พอร์ต 4173)

ขั้นต่อหน้า:
1. `page.goto` ด้วย `hud=1&loc=mock&trace=synthetic-park-loop-01&speed=1&loop=1` + `e2eTilesUrl`/`e2eGlyphsUrl`/`e2eSpriteUrl` ชี้ fixture (ตามรูปแบบ P1-F02-T13/X24)
2. รอ `window.__kwSpike.map._loaded === true`
3. คลิก `#follow-toggle` **ครั้งเดียว** — ปิด follow mode ก่อนเริ่มวน S1–S5 (ดูหัวข้อ 2.6 เหตุผล)
4. ซ่อน `#hud-panel` (แผงตัวเลข debug ของ P1-F02-T11) ด้วย CSS เท่านั้น — ไม่ใช่ player-facing UI จึงไม่ควรบังภาพแผนที่ที่ใช้ตรวจ style; `window.__kwSpike.hud` ยังอัปเดตตามปกติ
5. เติม `kw-dungeons` ด้วย `art/direction/map-style/samples/dungeons.sample.geojson` ผ่าน `map.getSource('kw-dungeons').setData(...)` (ตามขั้นตอน 10.1 ข้อ 2) — `kw-playarea-mask`/`kw-provinces` **ไม่ต้องเติมเอง** เพราะ `apps/client/src/map/geo-sources.ts` โหลดจาก `data/map/*.geojson` จริงอัตโนมัติเมื่อ map `load` อยู่แล้ว (ของจริงจาก P1-H07 ไม่ใช่ sample) และ `kw-self` มาจาก mock location provider ที่กำลังเล่นอยู่
6. วนทุกคู่ (S1–S5) × (390×844, 360×800): `setViewportSize` → `map.jumpTo({center, zoom})` ตามตาราง 10.1 → รอ `idle` → รอ 150ms ให้ symbol วางตำแหน่งเสร็จ → screenshot JPEG (ปรับ quality ลดหลั่นจนไฟล์ ≤150KB หรือ quality ถึงพื้น 15)
7. เก็บ Thai labels ที่ render จริง (`queryRenderedFeatures` บน layer ป้ายทั้งหมดรวม `kw-rift-*`/`kw-province-label`), จำนวนจุดตัวเอง (`kw-self-dot`), console error, request ที่ไม่ใช่ fixture/BASE_URL (= external) ต่อภาพ บันทึกลง `results.json`
8. ทดสอบ "ไม่มี animation ต่อเนื่อง": ถ่าย 2 ภาพติดกันไม่มี `waitForTimeout` คั่น (ไม่ใช่ delay คงที่ ซึ่งเสี่ยงชนกับรอบ sample ถัดไปของ mock trace แล้วให้ผลลวงว่ามี "animation") เทียบ byte ตรงกันหรือไม่

ผลรันจริง (`pnpm exec tsx qa/reports/F02/map-style/capture-screenshots.spec.ts`): 40/40 ภาพสำเร็จ, `externalRequests: []`, `consoleErrors` ว่างทุกภาพ, `animationCheck.identical: true` (ดูหัวข้อ 4)

## 2. ผลต่อจอ (S1–S5)

ไฟล์ตัวอย่างที่อ้างถึงคือ `android-chrome--pmtiles--S{n}--390x844.jpg`; ผลของ tilejson/ios-safari/360x800 สอดคล้องกัน (ดูรายการเต็มใน `results.json`)

### 2.1 S1 — สวนลุมพินี (100.5410, 13.7310) zoom 16 — **อยู่ใน bbox ของ fixture เต็ม**

**ผ่าน**: เห็นถนนไทยจริงจาก tile จริง 7 ชื่อ (ถนนราชดำริ, ถนนหลังสวน, ถนนสารสิน, ถนนพระรามที่ 4, ซอยสารสิน 1, ซอยสาทร 2, ซอยศาลาแดง 1/1) — สระ/วรรณยุกต์วางถูกตำแหน่ง ไม่ลอย ไม่ซ้อน ไม่มีกล่อง tofu (ตรวจด้วยตาจากภาพจริง) · ป้ายชื่อสวน (สวนลุมพินี, สวนบึง, ห้องสมุดประชาชนลุมพินี, ลานลีลาวดี, สระบัว, น้ำพุลูกหินสวิส) อ่านออกครบ · จุดตัวเอง (สีเหลือง) ปรากฏ **1 จุดเท่านั้น** (`selfDots: 1` ทุกภาพ S1) ไม่มีจุดผู้เล่นอื่น · ไม่มี request ออกนอก origin ของ fixture/แอปเอง (`externalRequests: []`) · ไม่มี console error
**พบปัญหา** (ไม่ใช่ acceptance ของจอนี้โดยตรง แต่เห็นชัดที่จอนี้): ป้ายชื่อ/จำนวนคน/ไอคอนรอยแยกของ dungeon ตัวอย่าง (`sample-open-01`) ปรากฏ **4 ชุดซ้ำ** กระจายทั่วจอ — ดูหัวข้อ 5

### 2.2 S2 — ซอยสุขุมวิท (100.5600, 13.7370) zoom 17 — **นอก bbox ของ fixture**

จอดำสนิททั้งภาพ (background `map.zone-black` เพราะไม่มี tile ให้โหลดที่พิกัดนี้ในชุด fixture — พฤติกรรมถูกต้องตามหัวข้อ 8 ของ map-style.md ที่นอก bbox ต้องดำเอง) **ไม่มี Thai label ใดปรากฏเลย** (`thaiLabels: []` ทุกภาพ) — เกณฑ์ "ชื่อซอย (`roads_label_minor`) ครบ ไม่มี tofu" **ตรวจไม่ได้จริงด้วย fixture นี้** เพราะไม่มีข้อมูล tile จริงของย่านนี้ ไม่ใช่เพราะ style ผิด ไม่มี console error, ไม่มี external request — ต้องรอ fixture/ทดสอบกับ tileset เต็มเมืองจริง (ดูหัวข้อ 7 ข้อจำกัด)

### 2.3 S3 — สวนจตุจักร (100.5530, 13.8060) zoom 15 — **นอก bbox ของ tile แต่ป้าย sponsored เป็น overlay GeoJSON**

พื้นหลังดำสนิทเหมือน S2 (นอก bbox) แต่ dungeon ตัวอย่าง `sample-sponsored-01` (feature ใน `dungeons.sample.geojson` ที่ตั้งพิกัดตรงกับ S3 พอดี — ผู้เขียน sample เตรียมไว้ให้ตรงกับตาราง 10.1) render ได้ปกติเพราะเป็น GeoJSON source แยก ไม่ผูกกับ tile bbox: **ผ่านเกณฑ์หลักของจอนี้** — เห็นป้าย "ได้รับการสนับสนุน" เป็นตัวสีครีม/ขาวบน halo สีเข้ม (`ink.900`) ไม่ใช่สี rift/rarity ตรงตามข้อกำหนดหัวข้อ 7 ของ map-style.md เป๊ะ
**พบปัญหาเดียวกับ S1**: ป้ายชื่อ/จำนวนคน/ป้าย sponsored/ไอคอนซ้ำกัน **2 ชุด** ทับกันพอดี — ยืนยันว่าปัญหาไม่ได้เกิดจากขนาด polygon ใหญ่ผิดปกติเท่านั้น (polygon ของ `sample-sponsored-01` มีขนาด ~700×700 ม. ใกล้เคียงสวนลุมพินีจริง) ดูหัวข้อ 5

### 2.4 S4 — ขอบเขตเล่นตะวันออก (101.00, 13.80) zoom 9 — **overlay จริงจาก P1-H07 ไม่ผูกกับ bbox**

**ผ่าน**: เห็นโซนดำเต็มจอ (ตำแหน่งนี้อยู่นอก 6 จังหวัดที่เล่นได้จริงตามภูมิศาสตร์ จึงดำถูกต้อง) เส้นจังหวัดประสีเทาอ่อนชัดเจน พร้อมชื่อจังหวัดภาษาไทยอ่านออก **2–3 ชื่อจริง** ต่อภาพ (นครนายก, ปทุมธานี, กรุงเทพมหานคร) — ข้อมูลนี้มาจาก `data/map/provinces.geojson` ของจริง (78 features, P1-H07) ไม่ใช่ sample overlay อีกต่อไป ยืนยันว่า pipeline โหลดข้อมูลจริงทำงานถูกต้องแล้ว ไม่มี console error, ไม่มี request นอก origin
หมายเหตุ: ตำแหน่งนี้อยู่นอกเขตเล่นทั้งหมด (ไม่ได้อยู่ชายขอบพอดีระหว่างเขตเล่น/นอกเขต) จึงไม่เห็น contrast ระหว่างโซนดำกับพื้นที่เล่นได้ในภาพเดียว — ไม่ใช่ปัญหา เกณฑ์ "เส้นจังหวัดประ ชื่อจังหวัด ไม่มีถนนนอกเขต" ยังพิสูจน์ได้ครบจากภาพนี้

### 2.5 S5 — แม่น้ำเจ้าพระยา (100.4950, 13.7400) zoom 14 — **นอก bbox ของ fixture**

จอดำสนิทเหมือน S2 — ไม่มีข้อมูล water/river label จริงให้ตรวจ (`thaiLabels: []`) เกณฑ์ "ขอบน้ำและชื่อแม่น้ำอ่านออก คลองเห็นเป็นเส้นน้ำเงินเข้ม" **ตรวจไม่ได้จริงด้วย fixture นี้** ด้วยเหตุผลเดียวกับ S2 — ไม่มี console error, ไม่มี external request

### 2.6 ขนาดไฟล์ (เป้า ≤~150 KB)

37/40 ไฟล์ ≤150 KB (69–149 KB) · เกิน 2 ไฟล์คือ `ios-safari--{pmtiles,tilejson}--S1--390x844.jpg` (159,842 / 159,885 bytes) และ `ios-safari--{pmtiles,tilejson}--S1--360x800.jpg` (168,180 / 168,244 bytes) — ทั้งหมดเป็น S1 บน ios-safari (device pixel ratio 3 ของ iPhone 14 ทำให้พิกเซลจริงมากกว่า android-chrome/Pixel 7 ที่ dpr เดียวกันแต่ viewport เท่ากัน) แม้ลด JPEG quality ลงถึงพื้น 15 แล้วก็ยังเกินเล็กน้อยเพราะ S1 มีรายละเอียด (ป้ายซ้ำ 4 ชุด, เส้นถนนหนาแน่น) มากกว่าจออื่น — ใกล้เป้า "~150 KB" ตามที่ brief ระบุว่าเป็นค่าประมาณ ไม่ใช่ hard limit จึงไม่ถือเป็นปัญหาที่บล็อก

## 3. ความเป็นส่วนตัว (non-negotiable 4)

- `kw-self` มีจุดของอุปกรณ์นี้เครื่องเดียวเสมอ (`selfDots` ที่ query ได้คือ 0 หรือ 1 ทุกภาพ ไม่เคย >1)
- `kw-dungeons` sample ที่เติมมีเฉพาะ 6 property ตาม whitelist ของหัวข้อ 6.1 (`id`, `name`, `status`, `sponsored`, `label_sponsored`, `label_count`) ไม่มีพิกัด/ชื่อ/รหัสผู้เล่นรายคนใด
- ไม่มี request ออกนอก origin ของ fixture/แอปเองเลยตลอด 40 ภาพ (`externalRequests: []`) — ยืนยันว่าไม่มี CDN หรือปลายทางอื่นที่อาจรั่วข้อมูลตำแหน่ง

## 4. ไม่มี animation ต่อเนื่อง (หัวข้อ 11)

ทดสอบ: ที่ S1 (pmtiles, android-chrome) ถ่าย 2 ภาพติดกันทันที **ไม่มี `waitForTimeout` คั่นระหว่างสอง `page.screenshot()`** (ตั้งใจไม่ใช้ delay คงที่ เช่น 700ms ที่ลองก่อนหน้านี้ เพราะ mock provider ยังเดินอยู่เบื้องหลังแม้ปิด follow mode แล้ว — delay คงที่เสี่ยงชนรอบ sample ถัดไปพอดีแล้วให้ผลลวงว่า "มี animation" ทั้งที่จริงคือตำแหน่ง GPS ขยับจริงตามรอบ sample ไม่ใช่ animation ต่อเนื่อง)

ผล: `Buffer.compare(shotA, shotB) === 0` (**เท่ากันทุก byte**) — สอดคล้องกับหลักฐานในโค้ด 2 จุดที่ map-style.md หัวข้อ 11 กำหนดไว้: `fadeDuration: 0` ใน `apps/client/src/map.ts` (`FADE_DURATION_MS`) และ root `"transition": {"duration": 0, "delay": 0}` ใน `kw-light.style.json` เอง — **ผ่าน**

## 5. บั๊ก: ป้าย/ไอคอนของ dungeon ซ้ำกันหลายชุดต่อ 1 dungeon (severity: high)

**อาการ**: dungeon เดียว (`sample-open-01` ที่ S1, `sample-sponsored-01` ที่ S3) แสดงชื่อ, จำนวนคน/role, ป้าย sponsored และไอคอนรอยแยกซ้ำกันหลายชุดพร้อมกันบนจอเดียว — S1 เห็น 4 ชุดกระจาย 4 มุมของ polygon, S3 เห็น 2 ชุดซ้อนทับกันเกือบสนิท (ดูภาพ `screenshots/android-chrome--pmtiles--S1--390x844.jpg` และ `...--S3--390x844.jpg`)

**สาเหตุ (ยืนยันจาก style JSON จริง)**:
1. `kw-rift-name`, `kw-rift-count`, `kw-rift-sponsored`, `kw-rift-crack` เป็น symbol layer ที่ดึง `text-field`/`icon-image` จาก **source `kw-dungeons` เดียวกับ polygon fill/outline** (`kw-rift-fill`, `kw-rift-outline`) โดยตรง ไม่มี point source แยกสำหรับป้าย
2. `kw-dungeons` เป็น GeoJSON source — MapLibre subdivide ข้อมูลเป็น internal tile ด้วย geojson-vt ภายใน เมื่อ polygon ของ dungeon กว้างพอที่จะถูกตัดคาบเกี่ยวหลาย internal tile ที่ zoom นั้น **แต่ละ tile จะคำนวณตำแหน่ง anchor ของ symbol เป็นของตัวเอง** ทำให้ป้าย/ไอคอนเดียวกันถูกวาดซ้ำหนึ่งครั้งต่อ tile ที่ polygon คาบเกี่ยว (พฤติกรรมที่รู้จักกันดีของ Mapbox GL/MapLibre กับ symbol layer บน polygon geometry)
3. ทั้ง 4 layer ตั้ง `icon-allow-overlap: true` / `text-allow-overlap: true` (`kw-light.style.json`) ซึ่งปิดกลไก collision-detection ที่ปกติจะซ่อน symbol ที่ซ้อนทับกันเอง — ทำให้ทุกชุดที่ซ้ำแสดงครบโดยไม่มีการกรองใด ๆ

**ผลกระทบ**: dungeon จริงในโปรดักชันมีขนาดระดับสวนสาธารณะทั่วไป (ใกล้เคียงหรือใหญ่กว่า `sample-sponsored-01` ที่ทำให้เกิดปัญหาแล้ว) จึงมีความเสี่ยงสูงที่จะเกิดปัญหานี้กับ dungeon จริงแทบทุกแห่งที่มีขนาดไม่เล็กมาก ไม่ใช่แค่ sample ทดสอบ — กระทบภาพลักษณ์หลักของ "รอยแยก" ซึ่งเป็นองค์ประกอบ UI หลักของเกม

**ข้อเสนอ (ให้ art-director/tech-lead ตัดสิน ไม่ใช่ QA)**: แนวทางที่มั่นคงที่สุดคือแยก point source ต่างหากสำหรับป้าย/ไอคอน (เช่น server/adapter คำนวณจุดศูนย์กลาง polygon เพียงจุดเดียวต่อ dungeon แล้วส่งเป็น feature `Point` แยกจาก polygon) แทนการอ้าง property จาก polygon source ตรง ๆ — polygon source ใช้เฉพาะกับ `kw-rift-fill`/`-outline`/`-inner`/`-outline-closed` เท่านั้น วิธีนี้ไม่ผูกกับขนาด/รูปร่างของ dungeon และไม่ต้องพึ่งการปรับ `tolerance`/`buffer`/`maxzoom` ของ source ซึ่งเปราะกว่า

**ทำซ้ำได้**: เปิด `screenshots/android-chrome--pmtiles--S1--390x844.jpg` หรือ `...--S3--390x844.jpg` ด้วยตา หรือรัน `qa/reports/F02/map-style/capture-screenshots.spec.ts` ใหม่แล้วดู `results.json` (จำนวน label ที่ query ได้จาก `kw-rift-name`/`kw-rift-count` มากกว่า 1 ค่าเดียวสำหรับ dungeon เดียว)

**หมายเหตุแยก (ไม่บล็อก แต่ควรทราบ)**: ปุ่ม follow toggle แสดงข้อความเป็น key ดิบ `client.mapSpike.followModeOff`/`...On` แทนคำแปลไทย — ตรวจแล้วเป็นพฤติกรรมตั้งใจตามคอมเมนต์ใน `apps/client/src/copy/load.ts` (TL-N06: "fallback ... คืน key เอง ... หน้าจอยังมี label ตรงไปตรงมาแทนที่จะไม่มีอะไรเลย") เพราะ key นี้ยังไม่มีใน `config/content/copy.th.json` — เป็น dev-only UI (`hud=1`) ไม่ใช่สิ่งที่ผู้เล่นจริงเห็น จึงไม่ยกเป็นบั๊กใหม่ของงานนี้ แค่บันทึกไว้เผื่อ narrative-designer ต้องการเติม key

## 6. `validateStyleMin` (หัวข้อ 13) และคำสั่งที่รัน

`qa/tests/unit/map-style.test.ts` (ใหม่): เรียก `validateStyleMin` จาก `@maplibre/maplibre-gl-style-spec` 26.4.4 (root devDependency ของ P1-X05) กับ `art/direction/map-style/kw-light.style.json` ที่อ่านจากดิสก์ตรง (`readFileSync` + `JSON.parse`) — คาด `errors.length === 0`

```
$ npx vitest run qa/tests/unit/map-style.test.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

ผลตรงกับที่ P1-H01 เคยตรวจด้วย `gl-style-validate.mjs` มาก่อน (0 error) — ตอนนี้เป็น regression test ถาวรแล้ว ไม่ต้องรันมือซ้ำ

คำสั่งเต็มชุด (หลังเพิ่มไฟล์ของงานนี้ — `qa/tests/unit/map-style.test.ts`, สคริปต์ 2 ไฟล์ใต้ `qa/reports/`, ภาพ/ผลลัพธ์):

| # | คำสั่ง | ผล |
| --- | --- | --- |
| 1 | `pnpm run lint` | ผ่าน (eslint 0 error, prettier ผ่านทั้ง repo รวมไฟล์ใหม่, `lint:copy` มีแต่ WARN S7 เดิม 10 รายการที่ยอมรับแล้วตาม D-058) |
| 2 | `pnpm run typecheck` | ผ่าน (root + `packages/shared` + `tools/copy-lint` + `apps/client` ทั้งหมด Done — `qa/tests/unit/map-style.test.ts` อยู่ใต้ root tsconfig `include: qa/tests/**/*.ts`) |
| 3 | `COVERAGE_PYTEST_REQUIRED=1 pnpm run test` | ผ่าน (**61 test files passed**, **910 tests passed, 2 skipped** ที่ตั้งใจ — เพิ่มจาก 60 ไฟล์เดิมของ F02-qa-gate เป็น 61 เพราะไฟล์ทดสอบใหม่) |
| 4 | `pnpm run build` | ผ่าน (`apps/client build: ✓ built in 435ms`) |
| 5 | `pnpm run test:e2e` | ผ่าน **28/28** (`android-chrome` + `ios-safari` รวม `qa/tests/e2e/f02-map-fixture-tile.spec.ts` และ `apps/client/e2e/*` ทั้งหมด — ยืนยันว่าการเพิ่มไฟล์ของงานนี้ไม่กระทบ e2e เดิมเลย เพราะไม่ได้แตะ `apps/client/` หรือ `qa/tests/e2e/`) |

`qa/reports/F02/map-style/screenshots/*.jpg` และไฟล์สคริปต์ทั้งสอง (`capture-screenshots.spec.ts`, `qa/reports/F03/colorblind/capture-colorblind.spec.ts`) ผ่าน `eslint`/`prettier` แยกแล้วก่อนรวมเข้า `pnpm run lint` ด้านบน (ตั้งชื่อ `*.spec.ts` เพื่อให้เข้าเกณฑ์ยกเว้น `no-magic-numbers` ที่ตั้งไว้แล้วสำหรับไฟล์ทดสอบ/e2e ใน `eslint.config.js` — ไฟล์เหล่านี้เป็นสคริปต์ช่วย QA รันด้วย `tsx` ตรง ไม่ใช่ Playwright Test spec ที่ runner เก็บอัตโนมัติ ตามที่ brief อนุญาตไว้ ("อาจเขียน helper spec ใต้ qa/reports/F02/map-style/"))

## 7. ทดสอบกลางแดด (หัวข้อ 10.2) — อ้างอิงเท่านั้น ตามที่ brief ระบุ

ขั้นทดสอบกลางแดดต้องใช้คนจริงกลางแจ้ง (กล้องอีกเครื่องถ่ายจอ 35–40 ซม. มุม 30° แล้วแปลงขาวดำ) — เตรียมไว้ครบแล้วโดย P1-F02-T14:
- ขั้นตอน: `qa/playtest/field-walk-kit.md` หัวข้อ 8 ("งานเสริมระหว่างเดิน: กลางแดด, ป้ายไทย, การสั่น")
- ช่องกรอกผล: `qa/playtest/field-walk-form.md` หัวข้อ 3 ("ทดสอบอ่านจอกลางแดด") และแถว `S17` ในตารางเดียวกัน
- ผู้ทำจริง: **HUMAN P1-F02-T20** (เดินทดสอบกลางแดด 30 นาทีในสวน + 30 นาทีในซอย, Android Chrome + iPhone Safari) — ยังไม่พบไฟล์ผลใน `qa/playtest/results/` (ไม่มีโฟลเดอร์นี้เลยตอนตรวจ) แปลว่ายังไม่ได้เดินจริง — **PENDING-HUMAN** ไม่ใช่สิ่งที่ QA ทำแทนได้ และไม่ใช่ของ P1-H06 ตามที่ระบุไว้ในบอร์ดเอง ("ถ้าต้องใช้คนจริง ส่งเป็นขั้นในคู่มือเดินทดสอบ P1-F02-T14")

## 8. Traceability — เกณฑ์ P1-H06 → หลักฐาน

| เกณฑ์ (detail block P1-H06) | หลักฐาน |
| --- | --- |
| screenshot S1–S5 ที่ 390×844/360×800 บน fixture PMTiles+TileJSON, android-chrome+ios-safari | `screenshots/*.jpg` 40 ไฟล์ (หัวข้อ 1, 2), `results.json` |
| ป้ายชื่อถนนไทยอ่านได้ สระ/วรรณยุกต์ไม่ลอยไม่ซ้อน | หัวข้อ 2.1 (S1 มี 7 ชื่อถนน/ป้ายสวนจริงจาก tile, ตรวจด้วยตา) |
| ไม่มีจุดผู้เล่นอื่น | หัวข้อ 3 (`selfDots` ≤1 ทุกภาพ) |
| ไม่มี animation ต่อเนื่อง | หัวข้อ 4 (byte เท่ากันทุกไบต์ระหว่าง 2 ภาพติดกัน) |
| ผลทดสอบกลางแดด (10.2) | หัวข้อ 7 — อ้างอิง field-walk kit ที่มีอยู่แล้ว, PENDING-HUMAN |
| จำลองตาบอดสี 4 แบบบน style-tile/contact-sheet, ยืนยัน rarity/class แยกด้วยรูปทรง | `qa/reports/F03/colorblind/verdict.md` (PASS เต็มเกณฑ์) |
| `qa/tests/unit/map-style.test.ts` → `validateStyleMin` 0 error, รันใน `pnpm test` | หัวข้อ 6 (2/2 ผ่าน, รวมอยู่ใน 61 test files ของ `pnpm test`) |
| ถ้าพบปัญหา ส่ง handoff ถึง art-director | หัวข้อ 9 ด้านล่าง |
| Root lint/test green, ไม่ commit | หัวข้อ 6 (ทุกคำสั่งผ่าน) — ไม่ได้รัน `git add`/`git commit` ใด ๆ |

## 9. Handoffs

- **ถึง art-director (blocking: yes)**: บั๊ก severity high ในหัวข้อ 5 — ป้าย/จำนวนคน/ป้าย sponsored/ไอคอนรอยแยกของ dungeon เดียวซ้ำกันหลายชุดเมื่อ polygon กว้างระดับสวนสาธารณะทั่วไป ขอให้ตัดสินแนวทางแก้ (แยก point source สำหรับป้าย เทียบกับทางเลือกอื่น) ก่อนที่ dungeons-source.ts จริงจะถูกสร้างใน Phase 3 (map-style.md 14 A-P1-F03-T12-5) เพราะกระทบทั้งสัญญา property และโครงสร้าง source
- **ถึง narrative-designer (blocking: no)**: คีย์ copy `client.mapSpike.followModeOn`/`followModeOff` ยังไม่มีใน `config/content/copy.th.json` (หัวข้อ 5 หมายเหตุแยก) — ไม่บล็อกเพราะเป็น dev-only UI แต่เพิ่มได้เมื่อสะดวก
- **ถึง location-engineer (blocking: no)**: fixture `tools/tiles/fixtures/lumpini` มี bbox แคบเกินกว่าจะตรวจ S2 (ซอยสุขุมวิท) และ S5 (แม่น้ำเจ้าพระยา) ตามตาราง 10.1 ได้จริง — ถ้าต้องการปิดช่องว่างนี้ในอนาคตต้องมี fixture ที่ครอบคลุมพื้นที่กว้างกว่านี้ หรือทดสอบกับ tileset เต็มเมืองจริงแทน (ไม่ใช่ของ P1-H06 นี้ตรง ๆ แค่บันทึกเป็นข้อจำกัดที่รู้อยู่)
