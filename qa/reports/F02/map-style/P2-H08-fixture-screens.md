# S2/S5/S6 ด้วย fixture เฉพาะจอ — ปิดข้อจำกัดของ P1-H06 / P2-F04-T09 หัวข้อ 5.3 (P2-H08)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-H08 (handoff จาก P2-F04-T23) · เจ้าของ: qa-tester · วันที่ 2026-09-27 |
| ผู้ตรวจ | qa-tester |
| รันที่ | `/Users/pongpon/Game` · node v24.19.0 · pnpm · Playwright (chromium/webkit) · `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview --port 4173` (build ผ่านจาก working tree ปัจจุบัน ไม่ต้องใช้ worktree แยกแบบ P2-F04-T09 — build เขียวตอนรันงานนี้) |
| อ้างอิง | `art/direction/map-style.md` หัวข้อ 10.1 (ตาราง S1–S6, เกณฑ์ผ่าน), `qa/reports/F02/map-style/P1-H06-screenshot-tests.md` หัวข้อ 0 (ข้อจำกัดเดิม), `P2-F04-T09-rerun.md` หัวข้อ 5.3 (ข้อจำกัดของ S6), `tools/tiles/fixtures/screens/*/manifest.json` (fixture ใหม่ของ location-engineer, P2-F04-T23) |
| **verdict** | S2/S5/S6-z10/S6-z13 ถ่ายได้ครบด้วยข้อมูล tile จริง (ไม่ใช่จอดำ) — เกณฑ์หลักของทั้ง 4 จอผ่าน มี 1 ข้อค้นพบไม่บล็อก (S5: ชื่อแม่น้ำมีอยู่จริงในข้อมูลแต่ไม่ตกอยู่ในกรอบภาพที่ตำแหน่ง/ซูมตามตาราง 10.1 พอดี — หัวข้อ 3) ปิดข้อจำกัดของ P1-H06 หัวข้อ 0 และ P2-F04-T09 หัวข้อ 5.3 ได้ตามที่ตั้งใจ |

## 0. สรุปสำหรับผู้ที่ไม่มีเวลาอ่านทั้งหมด

- ก่อนงานนี้: S2/S5 เป็นจอดำสนิท (fixture ลุมพินีไม่ครอบพิกัด) และ S6 เห็นเฉพาะเส้นจังหวัด/ป้ายชื่อ (overlay GeoJSON ที่ไม่ผูกกับ bbox) แต่ไม่เห็น `map.water` จริงเพราะไม่มี tile ครอบชายฝั่ง — ต้องพิสูจน์ "ไม่มีขอบดำกลางทะเล" ทางอ้อมด้วย point-in-polygon แทนภาพจริง (`P2-F04-T09-rerun.md` หัวข้อ 5.3)
- location-engineer (P2-F04-T23) สร้าง fixture เฉพาะจอ 4 ชุดใต้ `tools/tiles/fixtures/screens/{s2-sukhumvit,s5-chaophraya,s6-coast-z10,s6-coast-z13}/` (tileset id รูปแบบ `pm4-20260923-z<maxzoom>-<name>`, glyphs/sprites ใช้ร่วมจาก `fixtures/lumpini`) — งานนี้แก้ `capture-screenshots.spec.ts` ให้แต่ละจอเลือก fixture ของตัวเองอัตโนมัติ (อ่าน `tileset_id` จาก `manifest.json` ของแต่ละจอเอง ไม่ hardcode) แล้วถ่ายใหม่ทั้ง 56 ภาพ (S1–S6 ครบ ไม่ใช่แค่ 4 จอใหม่ เพราะโครงสร้าง loop เปลี่ยนจาก "1 หน้าเดียวใช้ร่วมทุกจอ" เป็น "1 หน้าใหม่ต่อจอ" — ดูหัวข้อ 1)
- **S2 (ซอยสุขุมวิท, z17)**: เห็นชื่อถนน/ซอยจริงอ่านออกครบ ไม่มี tofu (`ถนนสุขุมวิท`, `ซอยสุขุมวิท 14/17/19`, `ซอยคอนเน็กซ์`, `อโศก`) — **ผ่าน**
- **S5 (แม่น้ำเจ้าพระยา, z14)**: เห็นขอบน้ำจริง (สีน้ำเงินอ่อนเต็มแม่น้ำ) และชื่อคลอง/ชุมชน/วัดจริงจำนวนมาก ครบเกณฑ์ "ขอบน้ำ...คลองเห็นเป็นเส้นน้ำเงินเข้ม" — ส่วน "ชื่อแม่น้ำอ่านออก" ไม่ปรากฏในภาพที่ตำแหน่ง/ซูมตามตาราง 10.1 พอดี แม้ข้อมูล tile จะมี feature `แม่น้ำเจ้าพระยา` (kind=river) อยู่จริงและ render ได้ที่ viewport กว้างกว่า — ดูหัวข้อ 3 (ไม่บล็อก)
- **S6-z10 / S6-z13 (ชายฝั่งสมุทรปราการ)**: เห็น `map.water` จริงเต็มเกณฑ์ครั้งแรก (ก่อนหน้านี้ต้องพิสูจน์ทางอ้อม) — ไม่มีขอบ/แถบดำกลางทะเล ไม่มีรอยตะเข็บ (seam) ที่ขอบรูของ mask เข้ากับขอบ bbox ของ tile พอดี ตามที่ตั้งใจไว้ใน map-style.md หัวข้อ 6.2/10.1 — **ผ่าน** ปิดข้อจำกัดของ P2-F04-T09 หัวข้อ 5.3 ได้เต็มที่ (ไม่ต้องพึ่ง point-in-polygon อีกต่อไป)
- `externalRequests: []`, `consoleErrors` ว่างทุกภาพ (56/56) ทั้งรอบสุดท้าย, `animationCheck.identical: true`
- `qa-builder.ts`: เปลี่ยนจาก stamp `meta.kind` หลัง `build()` เป็นส่ง `kind: 'qa'` เข้า `TraceHeader` ตรง ๆ (`tools/traces` รองรับแล้วจาก P2-F04-T23/N-06) — เอาต์พุตไบต์เท่าเดิมทุกไฟล์ (`build.ts --check`: ok ทั้ง 7 ไฟล์)
- `engine-movement-gate.test.ts`: ส่ง `loadTraceConfig()` (TraceConfig) เข้า `gateWindows` ตรง ๆ แทน `GateOptions` (`@deprecated`) เดิม — ผลลัพธ์เหมือนเดิมทุกกรณี (`pnpm exec vitest run qa/tests/traces` เขียว)

## 1. สิ่งที่แก้ใน `capture-screenshots.spec.ts`

โครงสร้างเดิม (P1-H06/P2-F04-T09): ลูปนอก `engine` → `format` → เปิด **หน้าเดียว** ต่อ (engine, format) แล้ววนทุกจอ (`selectedScreens()`) บนหน้านั้น เพราะทุกจอเคยใช้ fixture ลุมพินีชุดเดียว (tileset เดียว) ร่วมกัน

หลังแก้ (P2-H08): ลูปนอกเปลี่ยนเป็น `engine` → `screen` → `format` — แต่ละจอเรียก `screenFixture(screen)` เพื่อหา fixture ของตัวเอง:

- ถ้าจอนั้นอยู่ใน `SCREEN_FIXTURE_SLUGS` (S2, S5, S6-z10, S6-z13) → อ่าน `tools/tiles/fixtures/screens/<slug>/manifest.json` เอา `tileset_id` จริงมาใช้ (ไม่ hardcode — ถ้า location-engineer build ใหม่ด้วย `build_key` อื่น สคริปต์นี้ไม่ต้องแก้)
- ถ้าไม่ใช่ (S1, S3, S4) → ใช้ fixture ลุมพินีเดิมเหมือนก่อนหน้านี้ทุกประการ (`LUMPINI_DIR`, `pm4-20260923-z15-lumpini`)
- glyphs/sprites (`/glyphs/**`, `/sprites/**`) ยังคง route ไปที่ `LUMPINI_DIR` เสมอไม่ว่าจอไหน (ตาม `glyphs_and_sprites_from: "fixtures/lumpini"` ในทุก manifest.json ของจอใหม่) — มีแค่ `/pmtiles/**`/`/tiles/**` เท่านั้นที่ไป fixture ของจอนั้นเอง (`fixturePathFor(url, tileDir)`)
- `rewriteTileJson` และ URL ของ pmtiles/tilejson กลายเป็นฟังก์ชันรับ `tilesetId` แทนค่าคงที่ระดับโมดูล
- โหลด dungeon sample (`kw-dungeons`/`kw-dungeon-labels`) เฉพาะ S1/S3 เท่านั้น (จอที่ต้องใช้จริง) แทนที่จะโหลดทุกจอเหมือนก่อน — S2/S5/S6 อยู่ไกลจาก sample dungeon อยู่แล้วจึงไม่กระทบผลไม่ว่าจะโหลดหรือไม่ แต่การไม่โหลดทำให้ชัดว่าจอเหล่านี้ไม่ได้พึ่งพา sample overlay ใด ๆ เลย (ข้อมูลจริงล้วนจาก tile)

ผลคือรันครั้งเดียว (`pnpm exec tsx qa/reports/F02/map-style/capture-screenshots.spec.ts`, ไม่ต้องใช้ `SCREENS_FILTER`) ได้ครบทั้ง 7 จอ (S1, S2, S3, S4, S5, S6-z10, S6-z13) × 2 viewport × 2 format × 2 engine = **56 ภาพ** ในรอบเดียว ไม่ต้องรันแยกแล้วมา merge `results.json` ด้วยมือ (ต่างจากที่ `P2-F04-T09-rerun.md` หัวข้อ 5 ทำตอนใช้ `SCREENS_FILTER`)

ยืนยันว่า S1/S3/S4 (ไม่แตะ fixture) ไม่ถดถอย: `selfDots`, `thaiLabels` (ชื่อถนนสวนลุมพินี, ป้าย sponsored สวนจตุจักร, ชื่อจังหวัดขอบเขตตะวันออก) และไม่มีป้ายซ้ำ (S1: `kw-rift-name`/`kw-rift-count`/`kw-rift-crack` อย่างละ 1 ชุดต่อ dungeon เหมือน `P2-F04-T09-rerun.md` หัวข้อ 5.1) ตรงกับ baseline เดิมทุกประการ (เทียบ `results.json` ก่อน/หลัง)

## 2. ผลต่อจอ (S2, S5, S6-z10, S6-z13) เทียบเกณฑ์ map-style.md หัวข้อ 10.1

ไฟล์ตัวอย่างที่อ้างถึงคือ `android-chrome--pmtiles--S{n}--390x844.jpg`; ผลของ tilejson/ios-safari/360x800 สอดคล้องกัน (ดู `results.json`)

### 2.1 S2 — ซอยสุขุมวิท (100.5600, 13.7370) zoom 17 — เกณฑ์: "ชื่อซอย (`roads_label_minor`) ครบ ไม่มีกล่องสี่เหลี่ยม (tofu)"

**ผ่าน**: `screenshots/android-chrome--pmtiles--S2--390x844.jpg` เห็นถนน/ซอยจริงจาก tile จริงของย่านนี้ (`ถนนสุขุมวิท`, `ซอยสุขุมวิท 14`, `ซอยคอนเน็กซ์`, ป้ายสถานที่ `อโศก`) สระบน/ล่างและวรรณยุกต์วางตำแหน่งถูกต้อง ไม่ลอยไม่ซ้อนไม่มี tofu (ตรวจด้วยตาจากภาพจริง) — `thaiLabels` รวมทุก viewport/format/engine มี 8 ชื่อ (`ถนนสุขุมวิท`, `ถนนรัชดาภิเษก`, `ซอยคอนเน็กซ์`, `ซอยสุขุมวิท 19/17/14`, `สยามสมาคม`, `อโศก`) ไม่มี `externalRequests`, ไม่มี `consoleErrors` (รอบสุดท้าย 0/8; รอบก่อนหน้าเห็น 404 หลุดมา 1 ครั้งในสองแถวของ `tilejson` แต่รันซ้ำแบบแยกจอ (`SCREENS_FILTER=S2`) 5 ครั้งไม่เกิดซ้ำเลย และรอบเต็ม 56 ภาพสุดท้ายก็ 0 เช่นกัน — สรุปว่าเป็น flake ของ browser/เครื่องช่วงรันยาวข้ามหลายจอ ไม่ใช่บั๊กของ fixture/style นี้ ไม่ถือเป็นปัญหาที่บล็อก)
ก่อนหน้านี้ (P1-H06 หัวข้อ 0): จอนี้ดำสนิท เพราะ fixture ลุมพินีไม่ครอบพิกัดนี้ — **ปิดข้อจำกัดนี้แล้ว**

### 2.2 S5 — แม่น้ำเจ้าพระยา (100.4950, 13.7400) zoom 14 — เกณฑ์: "ขอบน้ำและชื่อแม่น้ำอ่านออก คลองเห็นเป็นเส้นน้ำเงินเข้ม"

**ผ่านบางส่วน**: `screenshots/android-chrome--pmtiles--S5--390x844.jpg` เห็นแม่น้ำเจ้าพระยาเป็น `map.water` สีน้ำเงินอ่อนเต็มความกว้างจริง โค้งตามภูมิศาสตร์จริง (ฝั่งธนบุรี/ฝั่งพระนคร) พร้อมชื่อคลอง 2 ชื่อเป็นเส้นสีน้ำเงินเข้มอ่านออกชัด (`คลองตลาดสมเด็จ`, `คลองบางไส้ไก่`) ตรงตามเกณฑ์ย่อย "คลองเห็นเป็นเส้นน้ำเงินเข้ม" — เห็นชื่อวัด/ชุมชน/ถนนจริงจำนวนมาก (37 ชื่อรวมทุกภาพ) ไม่มี tofu, `externalRequests: []`, `consoleErrors: []`
**ไม่ผ่านเกณฑ์ย่อย "ชื่อแม่น้ำอ่านออก" ที่ตำแหน่ง/ซูมนี้พอดี** — ดูหัวข้อ 3 (ไม่ใช่บั๊กของ style/fixture แต่เป็นข้อค้นพบเรื่องตำแหน่งทดสอบ)
ก่อนหน้านี้ (P1-H06 หัวข้อ 0): จอนี้ดำสนิทเช่นเดียวกับ S2 — **ปิดข้อจำกัด "ไม่มีข้อมูล tile จริง" แล้ว** ส่วนย่อยเรื่องชื่อแม่น้ำเป็นข้อจำกัดใหม่ที่เพิ่งพิสูจน์ได้เพราะตอนนี้มีภาพจริงให้ตรวจแล้วเท่านั้น

### 2.3 S6-z10 — ชายฝั่งสมุทรปราการ (100.60, 13.50) zoom 10 — เกณฑ์: "ทะเลในเขตจังหวัดเป็น `map.water` ไม่มีขอบ/แถบดำกลางทะเล ไม่มีเศษดำตามแนวชายฝั่ง"

**ผ่าน**: `screenshots/android-chrome--pmtiles--S6-z10--390x844.jpg` เห็นชายฝั่งสมุทรปราการจริง (แผ่นดินสีครีมด้านบน คลอง/แม่น้ำจริงหลายสาย ป้าย `สมุทรปราการ`, `พระประแดง`, `บางปู` ฯลฯ อ่านออกครบ) ต่อด้วยทะเลสีน้ำเงินอ่อน (`map.water`) เต็มพื้นที่ในเขต bbox ของ fixture (ครอบถึงละติจูด 13.4 องศาเหนือพอดีตาม brief) แล้วจึงเป็นโซนดำ (พื้นหลัง `map.zone-black`, นอก bbox ของ tile fixture) — **รอยต่อระหว่างทะเลกับโซนดำเป็นเส้นตรงเดียว ไม่มีขอบสว่าง/แถบดำแทรกกลางทะเล ไม่มีรอยหยักตามแนวชายฝั่ง** ตรงตามที่ brief ระบุ ("มาส์กรูตัดตาม tile bbox แล้ว")
ก่อนหน้านี้ (P2-F04-T09 หัวข้อ 5.3): ตรวจได้แค่ point-in-polygon ทางอ้อม เพราะพื้นที่ส่วนใหญ่ในภาพเป็นดำล้วนไม่มี `map.water` ให้เห็นเลย — **ปิดข้อจำกัดนี้แล้วด้วยภาพจริง**

### 2.4 S6-z13 — ชายฝั่งสมุทรปราการ ซูมลึก (100.60, 13.50) zoom 13 — เกณฑ์เดียวกับ S6-z10

**ผ่าน**: `screenshots/android-chrome--pmtiles--S6-z13--390x844.jpg` ที่ซูมนี้ทั้งเฟรมอยู่ในทะเลเกือบทั้งหมด (bbox ของ fixture z13 อยู่ที่ 13.456–13.544N ล้วนอยู่ในรูของ playarea-mask) เห็น `map.water` เต็มจอเรียบสนิท มีแผ่นดินเฉียงมุมซ้ายบน/ขวาบนเป็นรอยต่อชายฝั่งจริงเท่านั้น **ไม่มีขอบดำหรือแถบดำใด ๆ เจือปนกลางทะเลเลย** — ผ่านเกณฑ์เต็มที่ ไม่มี `thaiLabels` ที่ซูมนี้เพราะเป็นทะเลเปิดไม่มีป้ายสถานที่ (คาดได้ ไม่ใช่ปัญหา)

### 2.5 เส้นประจังหวัดทับขอบโซนดำ (S6, เดิมยืนยันแล้วใน P2-F04-T09)

เกณฑ์ "เส้นประจังหวัดทับขอบโซนดำพอดี ไม่มีร่องสว่าง/ร่องดำคั่น" มาจาก overlay GeoJSON (`data/map/provinces.geojson`) ที่ไม่ผูกกับ bbox ของ tile fixture อยู่แล้ว — ยืนยันไปแล้วที่ตำแหน่งเดียวกันนี้ใน `P2-F04-T09-rerun.md` หัวข้อ 5.3 ("เห็นเส้นประจังหวัดทับขอบโซนดำพอดี ไม่มีร่องสว่าง/ร่องดำคั่น และป้ายชื่อ 'สมุทรปราการ' อ่านออก") ไม่ได้รับผลกระทบจาก fixture ใหม่ในงานนี้ (คนละ source) จึงไม่ต้องตรวจซ้ำ

## 3. ข้อค้นพบ: ชื่อแม่น้ำ "แม่น้ำเจ้าพระยา" มีจริงในข้อมูล แต่ไม่ปรากฏในกรอบภาพ S5 พอดี (ไม่บล็อก)

`thaiLabels` ของ S5 (รวมทุก viewport/format/engine, 8 ภาพ) ไม่มีคำว่า "แม่น้ำ" เลย แม้ layer `water_label_line`/`water_label_point` อยู่ใน `LABEL_LAYERS` ของสคริปต์นี้อยู่แล้ว (query ถูก layer) จึงตรวจสอบเพิ่มด้วยสคริปต์แยก (`page.evaluate` เรียก `map.querySourceFeatures('protomaps', { sourceLayer: 'water' })` ตรง ๆ ที่ตำแหน่ง/ซูมเดียวกัน):

- ข้อมูลต้นทางมี feature จริง: `แม่น้ำเจ้าพระยา` (kind=river) และ `คลองสมเด็จเจ้าพระยา` (kind=canal) อยู่ใน tile นี้แน่นอน (ไม่ใช่ fixture ไม่มีข้อมูล)
- ที่ viewport ขนาดเริ่มต้นของ browser (กว้างกว่าจอมือถือมาก) `queryRenderedFeatures` เจอป้าย `แม่น้ำเจ้าพระยา` จริง 2 จุด
- ที่ viewport จริงของสคริปต์นี้ (390×844 CSS px, dpr 3 — ขนาดเดียวกับที่ใช้ถ่ายภาพ) `queryRenderedFeatures` เจอแค่ 2 ชื่อคลอง ไม่เจอชื่อแม่น้ำเลย

สรุป: ป้ายชื่อแม่น้ำ (symbol-placement บนเส้น) มีตำแหน่ง anchor ที่ maplibre-gl เลือกอยู่นอกกรอบ 390×844/360×800 พอดีที่ตำแหน่งศูนย์กลาง/ซูมตามตาราง 10.1 ของ map-style.md (100.4950, 13.7400, zoom 14) — ไม่ใช่บั๊กของ style JSON (layer/สี/ฟอนต์ถูกต้องหมด พิสูจน์แล้วว่า render ได้จริงที่ viewport อื่น) และไม่ใช่บั๊กของ fixture (ข้อมูลมีครบ) เป็นเรื่องตำแหน่งทดสอบที่ map-style.md หัวข้อ 10.1 ระบุไว้พอดีที่จุดหนึ่งซึ่งบังเอิญไม่ตรงกับตำแหน่งป้ายที่ label-placement เลือกในกรอบมือถือ

**ไม่ยกเป็นบั๊กใน `qa/bugs.md`** (ไฟล์นั้นไม่อยู่ใน `writes` ของงานนี้ และไม่มีอะไรผิดในโค้ด/ข้อมูล) — บันทึกเป็น handoff แทน (หัวข้อ 8)

## 4. ขนาดไฟล์ (เป้า ≤~150 KB, เป็นค่าประมาณตาม brief เดิม ไม่ใช่ hard limit)

44/56 ไฟล์ ≤150 KB — 12 ไฟล์เกิน (ทั้งหมดเป็น S1 บน ios-safari ที่เกินอยู่แล้วตั้งแต่ P1-H06, กับ S5 ทั้งสอง engine และ S6-z10 บน ios-safari 360×800 หนึ่งไฟล์) เกิดจากปริมาณรายละเอียดจริงของพื้นที่ (S5 = เขตเมืองเก่ากรุงเทพชั้นในหนาแน่นถนน/คลอง/ชื่อสถานที่มาก, ios-safari dpr 3 = พิกเซลจริงมากกว่า) แม้ลด JPEG quality ลงถึงพื้น 15 แล้ว — เช่นเดียวกับที่ P1-H06 หัวข้อ 2.6 บันทึกไว้แล้วว่า "~150 KB" เป็นค่าประมาณ ไม่ใช่ hard limit จึงไม่ถือเป็นปัญหาที่บล็อก (ไฟล์ที่หนักสุดคือ `ios-safari--pmtiles--S5--360x800.jpg` ที่ 308,773 bytes)

## 5. QA trace builder ใช้ `kind: 'qa'` ผ่าน `TraceHeader` แทนการ stamp ทีหลัง

`qa/tests/traces/lib/qa-builder.ts`: `generateQa` เดิมสร้าง `TraceBuilder` โดยไม่ส่ง `kind` (ปล่อยให้เป็นค่าเริ่มต้น `'synthetic'` ของ `tools/traces`) แล้วค่อย `asQaTrace()` แก้ `meta.kind` เป็น `'qa'` หลัง `build()` เสร็จ — งานนี้ลบ `asQaTrace()` ออก เปลี่ยนเป็นส่ง `kind: 'qa'` เข้า `TraceHeader` ตอนสร้าง `TraceBuilder` ตรง ๆ (`tools/traces/src/builder.ts` รองรับฟิลด์นี้อยู่แล้วตั้งแต่ P2-F04-T23/tech-lead N-06 — `TraceHeader.kind`, `GeneratedTraceKind = 'synthetic' | 'qa'`) แล้วคืนค่า `b.build()` ตรง ๆ โดยไม่แก้ trace object หลังสร้างอีก

ยืนยัน: `pnpm exec tsx qa/tests/traces/build.ts --check` → `ok` ทั้ง 7 ไฟล์ (6 trace + 1 polygon) — เอาต์พุตไบต์เหมือนเดิมทุกไฟล์ ไม่มีไฟล์ใด stale (การเปลี่ยนวิธี stamp `kind` ไม่กระทบผลลัพธ์สุดท้ายเลย เพราะ `TraceBuilder.build(kind?)` ให้ผลเดียวกันไม่ว่า `kind` จะมาจาก argument ของ `build()` หรือจาก header ตอนสร้าง)

`build.test.ts`'s "every QA trace declares meta.kind 'qa'" ยังผ่าน (อยู่ใน 90 test ที่รันผ่านหัวข้อ 6)

## 6. `gateWindows` ใน `engine-movement-gate.test.ts` ใช้ `loadTraceConfig()` ตรง ๆ

`gateOpts` (object รูปแบบเก่า `{ window_s, minDistance_m, comparison }`, สร้างจาก `cfg` เพียงบางส่วน) ถูกลบทั้งหมด — เปลี่ยนทุกจุดที่เรียก `gateWindows(trace.samples, gateOpts)` เป็น `gateWindows(trace.samples, cfg)` (ส่ง `TraceConfig` เต็มจาก `loadTraceConfig()` ตรง ๆ) ตามที่ `tools/traces/src/metrics.ts` เองระบุ `GateOptions` เป็น `@deprecated` แนะนำให้ส่ง `TraceConfig` แทน

ยืนยันว่าให้ผลเดียวกันทุกกรณี: `fromOptions(gateOpts)` ภายใน `gateWindows` เดิมสร้าง `TraceConfig` โดย spread ทับ `base = loadTraceConfig()` ด้วยค่าที่แกะมาจาก `cfg` เอง (`gateWindow_s`, `gateMinDistance_m`, `gateComparison` เท่ากับของ `cfg` ทุกตัว, `gateWindowStep_s` ใช้ `base.gateWindowStep_s` เดิมอยู่แล้วเพราะ `gateOpts` ไม่เคยส่ง `slide_s`) ผลคือ `TraceConfig` ที่ได้จาก `fromOptions(gateOpts)` เท่ากับ `cfg` ทุก field พอดี — การเปลี่ยนแปลงนี้จึงให้ windows เหมือนเดิมทุกประการ ไม่ใช่แค่ "ควรจะ" เหมือนกัน ยืนยันด้วยผลรันจริง (หัวข้อ 7): ทุก test ที่พึ่ง `gateWindows` (E3, E4, `qa-movement-gap-400m-01` 4 case) ยังผ่านครบ

## 7. คำสั่งที่รันจริง

| # | คำสั่ง | ผล |
| --- | --- | --- |
| 1 | `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview --port 4173` | build เขียว (`✓ built in 319ms`), preview ให้ HTTP 200 ที่ `localhost:4173` — ไม่แดงตามที่ context เตือนไว้ตอนรันงานนี้ |
| 2 | `E2E_BASE_URL=http://localhost:4173 pnpm exec tsx qa/reports/F02/map-style/capture-screenshots.spec.ts` | 56/56 ภาพสำเร็จ, `externalRequests=0`, `consoleErrors` ว่างทุกภาพ, `animationCheck.identical: true` |
| 3 | `npx tsc --noEmit -p tsconfig.json` | ผ่าน (root, ครอบ `qa/tests/traces` และ `qa/reports/F02`) |
| 4 | `npx eslint qa/reports/F02/map-style/capture-screenshots.spec.ts qa/tests/traces/lib/qa-builder.ts qa/tests/traces/engine-movement-gate.test.ts` | 0 error |
| 5 | `npx prettier --check` (ไฟล์ที่แก้ทั้งหมด รวม `results.json`) | ผ่านทุกไฟล์ (ก่อนหน้านี้ `results.json` ไม่ผ่านเพราะเพิ่งเขียนใหม่ด้วย `JSON.stringify` — รัน `--write` แล้วผ่าน) |
| 6 | `pnpm exec tsx qa/tests/traces/build.ts --check` | `ok` ทั้ง 7 ไฟล์ (ไม่ stale) |
| 7 | `npx vitest run qa/tests/traces tools/traces/src/generator.test.ts` | **6 test files passed, 90 tests passed** |

## 8. Traceability — ข้อจำกัดเดิม → สถานะตอนนี้

| ข้อจำกัดเดิม | จากไฟล์ | สถานะตอนนี้ |
| --- | --- | --- |
| S2 (ซอยสุขุมวิท) จอดำสนิท ไม่มีข้อมูล tile จริง | `P1-H06-screenshot-tests.md` หัวข้อ 0, 2.2 | **ปิดแล้ว** — หัวข้อ 2.1 ข้างต้น |
| S5 (แม่น้ำเจ้าพระยา) จอดำสนิท ไม่มีข้อมูล tile จริง | `P1-H06-screenshot-tests.md` หัวข้อ 0, 2.5 | **ปิดแล้ว** (ขอบน้ำ+คลอง) — หัวข้อ 2.2; ชื่อแม่น้ำเป็นข้อค้นพบใหม่ ไม่บล็อก — หัวข้อ 3 |
| S6 (ชายฝั่งสมุทรปราการ) พิสูจน์ "ไม่มีขอบดำกลางทะเล" ได้แค่ทางอ้อม (point-in-polygon) เพราะไม่มี `map.water` ให้เห็นจริง | `P2-F04-T09-rerun.md` หัวข้อ 5.3 | **ปิดแล้วด้วยภาพจริง** — หัวข้อ 2.3, 2.4 |

## 9. Acceptance checklist (จาก detail block ของ P2-H08 บนบอร์ด)

- [x] S2/S5/S6 ถ่ายภาพจริงด้วย fixture เฉพาะจอ พร้อม verdict ต่อจอเทียบ `art/direction/map-style.md` — หัวข้อ 2
- [x] อัปเดตรายงาน F02 ปิด/บันทึกสถานะข้อจำกัดของ P1-H06 และ P2-F04-T09 หัวข้อ 5.3 — หัวข้อ 8
- [x] qa-builder ใช้ `TraceHeader.kind: 'qa'` แทนการ stamp ทีหลัง — หัวข้อ 5
- [x] `build.ts --check` ok — หัวข้อ 5, 7#6
- [x] `pnpm exec vitest run qa/tests/traces` เขียว — หัวข้อ 7#7 (90/90 ผ่าน)
- [x] `gateWindows` ใน `qa/tests/traces` ใช้ `loadTraceConfig()` แทน options เก่า ให้ผลเหมือนเดิม — หัวข้อ 6
- [x] Prettier สะอาดบนไฟล์ของงานนี้ รวม `results.json` — หัวข้อ 7#5 (`qa/tests/F02/hud-flag-gate.test.ts` ไม่อยู่ใน `writes` ของงานนี้ ไม่แตะ)

## 10. Verdict และ handoffs

**Verdict: PASS** — ทุกเกณฑ์ใน acceptance มีหลักฐาน ไม่มีบั๊ก severity high/critical ใหม่ที่พบในงานนี้ ข้อค้นพบเดียว (S5, ชื่อแม่น้ำนอกกรอบ) ไม่บล็อกเพราะเป็นเรื่องตำแหน่งทดสอบ ไม่ใช่ข้อผิดพลาดของ style/โค้ด/ข้อมูล

handoffs:
- **ถึง art-director (blocking: no)**: พิจารณาขยับพิกัด/ซูมของ S2 ในตาราง 10.1 (หรือระบุพิกัดที่สองสำหรับ "ชื่อแม่น้ำ" โดยเฉพาะ) เล็กน้อยเพื่อให้ป้าย `แม่น้ำเจ้าพระยา` ตกอยู่ในกรอบ 390×844/360×800 พอดี — ข้อมูลมีอยู่แล้วและ render ถูกที่ viewport กว้างกว่า (หัวข้อ 3) เป็นแค่เรื่องตำแหน่งทดสอบ ไม่ใช่บั๊ก
- **ถึง location-engineer (blocking: no)**: ขอบคุณสำหรับ fixture 4 ชุดใหม่ — ปิดข้อจำกัดของ P1-H06/P2-F04-T09 ได้ครบตามที่ตั้งใจ ไม่มีคำขอเพิ่มเติมในตอนนี้
