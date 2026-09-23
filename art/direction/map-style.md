# Map Style — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T12 (แก้ใน P1-X06: หัวข้อ 2, 5, 6.1, 9, 13, 14 ตาม tech note 15 และผลตรวจ contrast ของ QA · ไม่เปลี่ยน style JSON) · แก้ใน P1-X32 (2026-09-24): ป้ายรอยแยกย้ายไปอ่าน point source `kw-dungeon-labels` แก้บั๊กป้ายซ้ำจาก P1-H06 หัวข้อ 5 · style 0.2.0 · หัวข้อ 1, 5, 6, 6.1, 12, 13, 14 · เจ้าของ: art-director · สถานะ: ฉบับแรก (0.1.0) พร้อมให้ P1-F02-T11 โหลด · รอภาพทดสอบกับ fixture tile และกลางแดด (หัวข้อ 9) · วันที่: 2026-09-23
แหล่งอ้างอิง: GDD "แผนที่และโซนดำ", "รายได้ของโปรเจกต์" · `art/direction/style-guide.md` (3.5, 4.4, 4.5, 9.2, 9.3) · `art/direction/icon-grammar.md` · `docs/tech/F02-map-location-spike.md` (5, 6, 6.3, 7, 8, 14) · D-006, D-031, D-032

## สารบัญ
1. ไฟล์ในชุดนี้
2. ที่มาของ style และ schema
3. Placeholder ของ source, glyphs, sprite, font-faces
4. Font stack ภาษาไทย
5. ลำดับ layer และสี
6. สัญญาข้อมูลของ source ฝั่งเกม (GeoJSON)
7. รอยแยก (dungeon)
8. โซนดำและเส้นจังหวัด
9. ตาราง contrast บนแผนที่
10. การทดสอบ: fixture tile และกลางแดด
11. ไม่มี animation ต่อเนื่อง
12. ความเป็นส่วนตัวและข้อห้าม
13. การตรวจ style JSON
14. สมมติฐานและงานส่งต่อ

## 1. ไฟล์ในชุดนี้

| ไฟล์ | คืออะไร | ใครใช้ |
| --- | --- | --- |
| `art/direction/map-style/kw-light.style.json` | MapLibre style v8 ตัวหลัก (โหมดกลางวัน) | `apps/client/src/map/style.ts` (P1-F02-T11) |
| `art/direction/map-style/icons/rift-crack.svg` | icon รอยแตกของรอยแยก วาดที่ 2x (48 × 72) | client เรียก `map.addImage("kw-rift-crack", img, { pixelRatio: 2 })` |
| `art/direction/map-style/samples/dungeons.sample.geojson` | polygon ของ dungeon ตัวอย่าง 3 แบบ: เปิด, sponsored, ปิด (source `kw-dungeons`) | preview, e2e, ภาพทดสอบ |
| `art/direction/map-style/samples/dungeon-labels.sample.geojson` | จุดวางป้าย 1 จุดต่อ dungeon ของ 3 dungeon เดียวกัน `id` และ property ชุดเดียวกัน (source `kw-dungeon-labels`) | 〃 · ใช้เป็นค่าคาดหวังของ unit test ของ adapter |
| `art/direction/map-style/samples/playarea-mask.sample.geojson` | mask โซนดำตัวอย่าง (รูของ mask = bbox ของ tile) | 〃 |
| `art/direction/map-style/samples/provinces.sample.geojson` | เส้นจังหวัดและชื่อจังหวัดตัวอย่าง | 〃 |
| `art/direction/map-style/samples/self.sample.geojson` | ตำแหน่งตัวเอง + วง accuracy 15 ม. ตัวอย่าง | 〃 |

ไฟล์ตัวอย่างทั้งหมดเป็นข้อมูลทดสอบ ชื่อที่ขึ้นต้นด้วย "ตัวอย่าง:" ห้ามขึ้นใน build จริง · ข้อความใน `label_count` และ `label_sponsored` ของตัวอย่างเป็นร่าง ถ้อยคำจริงมาจาก copy key ของ narrative-designer

## 2. ที่มาของ style และ schema

| รายการ | ค่า |
| --- | --- |
| tile schema | Protomaps Basemap v4 · build `20260923` (metadata `version = 4.15.2`) · ตาม tech note 5.1 |
| theme ตั้งต้น | `@protomaps/basemaps` 5.7.2 flavor `light`, `lang: "th"` |
| สิ่งที่เปลี่ยนจาก theme ตั้งต้น | (1) สีทั้งหมดเป็น token จาก style-guide 3.1–3.5 · (2) ตัด layer ที่ไม่ช่วยการเดินหาที่: landcover, boundaries ของ tile, icon ของ POI, shield ทางหลวง, tunnel/bridge แยกชั้น, label ประเทศและทะเล · (3) POI เหลือแบบ whitelist (หัวข้อ 12) · (4) เพิ่ม layer เกม `kw-*` 15 ชั้น |
| ชื่อ layer | ชั้นพื้นฐานตั้งชื่อแบบ Protomaps (`earth`, `landuse_park`, `roads_minor`, `roads_label_major` ...) เพื่อให้ diff กับ theme ทางการได้ · ชั้นของเกมขึ้นต้น `kw-` |
| ชื่อภาษา | ทุก label ของ tile ใช้ `["coalesce", ["get", "name:th"], ["get", "name"]]` คือชื่อไทยก่อน ถ้าไม่มีใช้ `name` (ตรงกับ `lang: "th"`) · ยืนยันข้อเปิดใน tech note 14: ใช้ `th` · ตรวจซ้ำใน P1-X06: label ของ tile ทั้ง 7 ชั้น (`water_label_point`, `water_label_line`, `pois_label`, `roads_label_minor`, `roads_label_major`, `places_neighbourhood`, `places_locality`) ใช้ `coalesce` นี้ทุกชั้น · build `20260923` **ไม่มี key `name:th`** ชื่อไทยอยู่ใน `name` (`tools/tiles/README.md` หัวข้อ 5: tile z15 `25535/15122` มี `ถนนพระรามที่ 4`, `ถนนราชดำริ`, `ถนนวิทยุ` ใน `name`) จึงแสดงผ่านทาง fallback เสมอ ไม่ต้องแก้ style · ถ้า build ถัดไปมี `name:th` ชื่อนั้นจะขึ้นก่อนโดยอัตโนมัติ |
| ห้าม | ห้ามผสม schema แบบ OpenMapTiles · ห้ามชี้ font หรือ tile ไปที่ CDN ภายนอก |

[ASSUMPTION A-P1-F03-T12-1: ในเครื่องนี้ไม่มี package `@protomaps/basemaps` (ไม่อยู่ใน `node_modules` และงานนี้ห้ามแตะ lockfile) style จึงเขียนมือโดยยึดชื่อ source-layer และค่า `kind` ของ schema v4 (`earth`, `landuse`, `water`, `roads`, `buildings`, `places`, `pois` · roads `kind` = `highway`, `major_road`, `minor_road`, `path`, `other`, `rail`) · ผู้ที่ติดตั้ง package ได้ (P1-F02-T06 หรือ T11) ให้ generate `layers("protomaps", namedFlavor("light"), { lang: "th" })` แล้วเทียบชื่อ `source-layer`, `kind` และ filter กับไฟล์นี้ ถ้าต่างให้ส่ง handoff กลับมา art-director แก้ ไม่แก้สีเอง]

## 3. Placeholder ของ source, glyphs, sprite, font-faces

style ใช้ origin ปลอม `https://kw-placeholder.invalid` (TLD `.invalid` สงวนไว้ ไม่มีวันโหลดได้จริง) และคง path ตามโครงสร้างใน tech note 6.3 เพื่อให้ style ผ่าน validator และอ่านเข้าใจได้ · `style.ts` แทนค่าตามตารางนี้ก่อนส่งให้ MapLibre

| ตำแหน่งใน style | ค่า placeholder | แทนด้วย |
| --- | --- | --- |
| `sources.protomaps.url` | `https://kw-placeholder.invalid/tiles/pm4-20260923-z15/tiles.json` | `VITE_TILES_URL` ทั้งค่า (TileJSON URL หรือ `pmtiles://...`) |
| `glyphs` | `https://kw-placeholder.invalid/glyphs/{fontstack}/{range}.pbf` | `VITE_GLYPHS_URL` ทั้งค่า |
| `sprite` | `https://kw-placeholder.invalid/sprites/v4/light` | `VITE_SPRITE_URL` ทั้งค่า |
| `font-faces.<stack>[i].url` | `https://kw-placeholder.invalid/glyphs/_faces/<ไฟล์>.ttf` | `VITE_GLYPHS_URL` ที่แทน `{fontstack}/{range}.pbf` ด้วย `_faces/<ไฟล์>.ttf` (ไฟล์ = ชื่อท้าย URL ของ placeholder) ตาม tech note 6.3 |

กติกาของ `style.ts`
- source ใช้ key `url` ช่องเดียว จึงรองรับทั้ง XYZ + TileJSON บน Cloudflare Pages และ `pmtiles://` (D-031) โดยไม่ต้องมี style สองชุด · กรณี `pmtiles://` client ต้องลงทะเบียน protocol ของ `pmtiles` ก่อนสร้าง map
- หลังแทนค่าแล้ว ถ้ายังมีสตริง `kw-placeholder.invalid` อยู่ที่ใดในวัตถุ style ให้ throw พร้อมข้อความที่บอก path ของค่านั้น (กันลืมแทน)
- ห้ามแก้สี ลำดับ layer หรือ filter ในโค้ด · ต้องการเปลี่ยนให้ส่ง handoff มา art-director
- attribution อยู่ใน `sources.protomaps.attribution` (© OpenStreetMap ลิงก์ copyright + Protomaps) และ `sources.kw-provinces.attribution` (© OpenStreetMap) · client เปิด `AttributionControl` (TL-S13) · ถ้า TileJSON มี attribution ด้วย MapLibre แสดงรวมกัน ไม่ต้องลบฝั่งใด

## 4. Font stack ภาษาไทย

| `text-font` ที่ใช้ | Latin และสัญลักษณ์ | ไทย U+0E00–0E7F (`font-faces`) | ใช้กับ |
| --- | --- | --- | --- |
| `Noto Sans Regular` | glyph PBF `glyphs/Noto Sans Regular/<range>.pbf` | `_faces/NotoSansThai-Regular.ttf` | ชื่อถนนรอง, ชื่อน้ำ, ชื่อ POI |
| `Noto Sans Medium` | glyph PBF `glyphs/Noto Sans Medium/<range>.pbf` | `_faces/NotoSansThai-Medium.ttf` | ชื่อถนนหลัก, ชื่อย่าน/เขต, ชื่อจังหวัด, ป้ายรอยแยกทุกป้าย |
| `Noto Sans Italic` | ประกาศไว้ตาม tech note 6.2 | `_faces/NotoSansThai-Regular.ttf` | **ไม่มี layer ใดใช้** (style-guide 7 ห้ามตัวเอียงกับไทย ชื่อน้ำจึงใช้ Regular แทน Italic ของ theme ตั้งต้น) |

- ทุกรายการใน `font-faces` ระบุ `"unicode-range": ["U+0E00-0E7F"]` ทำให้ตัวไทยทั้งตัวเดี่ยวและ grapheme cluster (พยัญชนะ + สระบน/ล่าง + วรรณยุกต์) วาดจากไฟล์ font เดียวกันบนทุกเครื่อง แก้ปัญหา baseline ไม่ตรงระหว่าง PBF กับ canvas ในหัวข้อ 6.1 ของ tech note
- น้ำหนักตัวหนาใช้ Medium (500) ไม่ใช่ Bold (700) เพราะชุด glyph ที่ pin มีแค่ Regular/Medium/Italic · ชดเชยด้วย halo ทึบ 2–3 px · [ASSUMPTION A-P1-F03-T12-2: style-guide 7 เขียน "Noto Sans Thai Regular, Bold" สำหรับ label แผนที่ ให้ถือ Regular/Medium ตามเอกสารนี้ art-director จะแก้ style-guide ในงานถัดไปที่มีสิทธิ์เขียนไฟล์นั้น]
- `text-letter-spacing` = 0 ทุกชั้น (ระยะห่างตัวอักษรทำให้สระลอยแยกจากพยัญชนะ) · ขนาดข้อความบนแผนที่ต่ำสุด 14 px และใช้ 14 px เฉพาะคู่สีที่ ≥ 7:1 (style-guide S8)

## 5. ลำดับ layer และสี

ลำดับจากล่างขึ้นบน (ตรงกับ array `layers`) · 38 ชั้น: พื้นฐาน 23 + เกม 15 · สีทุกค่าเป็น token ของ style-guide ไม่มีสีนอก token

| # | id | source / source-layer | zoom | สี (token) | หน้าที่ |
| --- | --- | --- | --- | --- | --- |
| 1 | `background` | — | ทุก zoom | `map.zone-black` #111111 | นอกพื้นที่ที่มี tile เป็นโซนดำเสมอ |
| 2 | `earth` | protomaps / earth | ทุก zoom | `map.land` #EEE8DD | พื้นดิน |
| 3 | `landuse_park` | protomaps / landuse | ทุก zoom | `map.park` #CCEEBB | สวน ป่า สนาม (ที่ที่ dungeon ส่วนใหญ่อยู่) |
| 4 | `landuse_pedestrian` | protomaps / landuse | ≥ 14 | `bg.paper` #FFF8EE | ลานคนเดิน ชายหาด |
| 5 | `water` | protomaps / water (polygon) | ทุก zoom | `map.water` #AADDFF | แม่น้ำ บึง |
| 6 | `water_line` | protomaps / water (line) | ≥ 12 | `ramp.water` right #3377AA | คลอง ลำราง (สีเข้มเพื่อให้เห็นกลางแดด) |
| 7 | `water_edge` | protomaps / water (polygon) | ≥ 12 | #3377AA 1.5 px | ขอบแม่น้ำ แยกน้ำออกจากดินกลางแดด |
| 8 | `kw-rift-fill` | kw-dungeons | ≥ 12 | `rift.300` #FF99CC ทึบ 20% | แต้มพื้นที่ dungeon ใต้ถนนและชื่อถนน (ไม่ทับข้อความ) |
| 9 | `buildings` | protomaps / buildings | ≥ 15 | `ink.100` #DDDDEE | อาคาร (ตั้งใจให้จาง ไม่แย่งถนน) |
| 10 | `transit_rail` | protomaps / roads `rail` | ≥ 12 | `ink.500` #555566 เส้นประ 3/2 | ราง |
| 11 | `roads_path` | protomaps / roads `path` | ≥ 14 | `ink.500` เส้นประ 2/1.5 | ทางเดินในสวน ทางเท้า |
| 12–14 | `roads_minor_casing`, `roads_major_casing`, `roads_highway_casing` | protomaps / roads | ≥ 13 / ≥ 9 / ≥ 7 | `map.road-casing` #555566 | ขอบถนนทุกระดับ (ถนนขาวบนดินได้แค่ 1.22:1 จึงต้องมีขอบ) |
| 15–17 | `roads_minor`, `roads_major`, `roads_highway` | protomaps / roads | ≥ 13 / ≥ 9 / ≥ 7 | `map.road` #FFFFFF | ตัวถนน |
| 18–19 | `water_label_point`, `water_label_line` | protomaps / water | ≥ 13 | `map.label-water` #005588 halo #FFFFFF 2 px | ชื่อแม่น้ำ คลอง |
| 20 | `pois_label` | protomaps / pois (whitelist) | ≥ 15 | `ink.700` #333344 halo ขาว 2 px, 14 px | ชื่อสวน ตลาด สถานี (ข้อความอย่างเดียว ไม่มี icon) |
| 21 | `roads_label_minor` | protomaps / roads | ≥ 15 | `map.label` #1A1A22 halo ขาว 2 px, 14→16 px | ชื่อซอย ถนนรอง |
| 22 | `roads_label_major` | protomaps / roads | ≥ 12 | `map.label` Medium, 14→17 px | ชื่อถนนหลัก |
| 23 | `places_neighbourhood` | protomaps / places | ≥ 13 | `ink.700` Medium 14→16 px | ชื่อย่าน แขวง |
| 24 | `places_locality` | protomaps / places | ≥ 8 | `ink.900` Medium 14→18 px | ชื่อเมือง เขต |
| 25 | `kw-zone-black` | kw-playarea-mask | ทุก zoom | `map.zone-black` ทึบ 100% | ปิดทุกอย่างของ basemap นอกเขตเล่น รวมถนนและชื่อถนน |
| 26 | `kw-province-border-casing` | kw-provinces `border` | ≥ 5 | `ink.900` 3→4 px เส้นทึบ | ฐานของเส้นจังหวัด (มองไม่เห็นบนโซนดำ เห็นเป็นเส้นเข้มในเขตเล่น) |
| 27 | `kw-province-border` | kw-provinces `border` | ≥ 5 | `map.province-border` #9999AA 2 px ประ 2/2 (= 4/4 px) | เส้นจังหวัด |
| 28 | `kw-rift-outline-closed` | kw-dungeons `status = closed` | ≥ 12 | `ink.500` 3 px ประ | dungeon ที่ปิดอยู่ |
| 29 | `kw-rift-outline` | kw-dungeons | ≥ 12 | `rift.500` #CC1177 3 px มุมแหลม (miter) | ขอบรอยแยก |
| 30 | `kw-rift-inner` | kw-dungeons | ≥ 14 | `rift.300` 1 px offset −2 px (ด้านใน) | ขอบในของรอยแยก |
| 31 | `kw-province-label` | kw-provinces `label` | ≥ 6 | `ink.100` #DDDDEE halo `ink.900` 2 px | ชื่อจังหวัด (อยู่เหนือโซนดำ) |
| 32 | `kw-rift-crack` | kw-dungeon-labels (เปิด) | ≥ 10 | image `kw-rift-crack` | icon รอยแตกที่จุดวางป้าย (ด้านในของ polygon) |
| 33 | `kw-rift-name` | kw-dungeon-labels | ≥ 12 | `bg.paper` บน halo `rift.500` 3 px (ปิด: halo `ink.500`) 16→18 px | ชื่อ dungeon เหนือ icon |
| 34 | `kw-rift-count` | kw-dungeon-labels | ≥ 14 | `ink.900` บน halo `rift.300` 3 px, 14 px | จำนวนคนและ role ระดับ dungeon ใต้ icon |
| 35 | `kw-rift-sponsored` | kw-dungeon-labels `sponsored = true` | ≥ 12 (เท่ากับชื่อ) | `bg.paper` บน halo `ink.900` 3 px, 14 px | ป้าย sponsored |
| 36 | `kw-self-accuracy` | kw-self `accuracy` | ทุก zoom | `state.info` #006699 ทึบ 12% | วง accuracy |
| 37 | `kw-self-accuracy-edge` | kw-self `accuracy` | ทุก zoom | `state.info` 2 px | ขอบวง accuracy |
| 38 | `kw-self-dot` | kw-self `position` | ทุก zoom | `accent.signal` #FFCC00 รัศมี 8 px ขอบ `ink.900` 3 px | ตำแหน่งของตัวเอง |

เหตุผลของลำดับ
- label ของ basemap อยู่ **ใต้** `kw-zone-black` เพื่อให้ชื่อถนนนอกเขตถูกปิดไปด้วย (style-guide 9.3 "ถนนนอกเขตไม่แสดง")
- ชั้นเกมที่อยู่บนสุดได้สิทธิ์วางป้ายก่อน (MapLibre วางสัญลักษณ์จากชั้นบนลงล่าง) ป้ายรอยแยกจึงไม่ถูกชื่อถนนเบียด และใช้ `text-allow-overlap: true` ให้ชื่อ จำนวน และป้าย sponsored แสดงคู่กันเสมอ · การตั้ง allow-overlap นี้ **ตั้งใจ** และปลอดภัยเพราะป้ายซ้ำเกิดไม่ได้ตั้งแต่โครงสร้างข้อมูล (หัวข้อ 6.1 "ทำไมไม่ซ้ำ") ไม่ได้พึ่ง collision ซ่อนให้
- symbol layer ของรอยแยกทั้ง 4 ชั้นอ่าน `kw-dungeon-labels` (Point) เท่านั้น · `kw-dungeons` (polygon) มีแค่ fill และ line 4 ชั้น (8, 28, 29, 30) · **ห้ามเพิ่ม symbol layer ที่อ่าน `kw-dungeons`** (P1-X32)
- `kw-rift-fill` อยู่ใต้ถนนเพื่อไม่ทับชื่อถนน (style-guide 3.5 หมายเหตุ rift-fill) · ความหมายของรอยแยกอยู่ที่ขอบทึบและ icon ไม่ใช่สีพื้น

## 6. สัญญาข้อมูลของ source ฝั่งเกม (GeoJSON)

ทุก source `kw-*` ใน style เริ่มเป็น FeatureCollection ว่าง · client เติมด้วย `map.getSource(id).setData(...)` · style ไม่มีข้อความไทยฝังเอง ทุกข้อความที่ผู้เล่นเห็นมาจาก property ที่ client เตรียมจาก back office หรือ copy key

### 6.1 `kw-dungeons` (polygon) และ `kw-dungeon-labels` (จุดวางป้าย)

ตั้งแต่ P1-X32 (style 0.2.0) adapter เดียวผลิต **2 FeatureCollection จาก dungeon ชุดเดียวกัน** แล้วเรียก `setData` ทั้งสอง source ในรอบเดียวกัน

| source | geometry | จำนวน feature | layer ที่อ่าน |
| --- | --- | --- | --- |
| `kw-dungeons` | `Polygon` / `MultiPolygon` | 1 ต่อ dungeon | `kw-rift-fill`, `kw-rift-outline-closed`, `kw-rift-outline`, `kw-rift-inner` (fill/line เท่านั้น) |
| `kw-dungeon-labels` | `Point` (ห้าม `MultiPoint`) | **1 ต่อ dungeon เท่านั้น** | `kw-rift-crack`, `kw-rift-name`, `kw-rift-count`, `kw-rift-sponsored` (symbol เท่านั้น) |

ทั้งสอง source ใช้ property whitelist ชุดเดียวกัน (ตารางด้านล่าง ไม่เปลี่ยนจากเดิม) และตั้ง `promoteId: "id"` ทั้งคู่ · feature ที่มี `id` เดียวกันในสอง source ต้องมีค่า property เท่ากันทุกตัว

| property | type | ที่มา | ใช้ที่ |
| --- | --- | --- | --- |
| `id` | string | back office (`promoteId` ของ source) | feature-state ในอนาคต |
| `name` | string | ชื่อ dungeon จาก back office (non-negotiable 3) | `kw-rift-name` |
| `status` | `"open"` \| `"closed"` | server ผ่าน adapter (ค่าอื่น → `"closed"`) | `closed` → ขอบประ `ink.500` ไม่มี icon ไม่มีสีพื้น |
| `sponsored` | boolean | back office | เปิด `kw-rift-sponsored` |
| `label_sponsored` | string | copy key `label.sponsored` (เสนอใน style-guide 9.2 ถ้อยคำของ narrative-designer) | `kw-rift-sponsored` |
| `label_count` | string | client จัดรูปจากค่าระดับ dungeon ที่ server ส่ง (จำนวนคนรวม + จำนวนต่อ class) ผ่าน copy key | `kw-rift-count` |

ฝั่ง polygon: `status` ใช้กับ fill/line · ฝั่งจุด: `name`, `status` (สี halo ของชื่อ, ซ่อน icon ของ dungeon ที่ปิด), `sponsored`, `label_sponsored`, `label_count` ใช้กับ symbol · ใส่ครบทั้ง 6 ตัวทั้งสองฝั่งเพื่อให้สร้างจาก object เดียวกันและตรวจเท่ากันได้ง่าย

สัญญานี้ ACCEPTED ใน tech note `docs/tech/F02-map-location-spike.md` 15.2 เป็น **view model ฝั่ง client** ไม่ใช่ API · กติกาของ adapter เดียว `apps/client/src/map/dungeons-source.ts`
- **สร้าง object ใหม่จาก whitelist:** ใส่เฉพาะ 6 property ในตาราง (`id`, `name`, `status`, `sponsored`, `label_sponsored`, `label_count`) · **ห้าม spread payload ของ server ลง feature** · property อื่นที่ server ส่งมาทิ้งทั้งหมด (tech gate ตรวจว่าไม่มีรหัส ชื่อ พิกัด geohash หรือเวลาที่เห็นล่าสุดของผู้เล่นคนใด, non-negotiable 4)
- **`status` ที่ไม่รู้จัก → `"closed"`:** ค่าใดที่ไม่ใช่ `"open"` หรือ `"closed"` (รวมค่าว่างหรือไม่มี field) adapter แปลงเป็น `"closed"` และ `console.warn` · style จึงเห็นแค่สองค่านี้ ส่วน dungeon ที่สถานะไม่ชัดแสดงเป็นขอบประ `ink.500` ไม่ชวนให้เดินไปที่ที่อาจเข้าไม่ได้ · เพิ่มสถานะใหม่ต้องแก้ทั้ง style (art-director) และ adapter พร้อมกัน
- `label_count` จำนวน 0 → สตริงว่าง (ไม่มีป้ายจำนวน) · `name` มาจาก payload ของหลังบ้าน ไม่ใช่ copy · ไม่มีอักษรไทยในโค้ด
- geometry: `Polygon` หรือ `MultiPolygon` ตาม RFC 7946 · **วงนอกทวนเข็มนาฬิกา** (ทำให้ `line-offset: -2` ของ `kw-rift-inner` อยู่ด้านในเสมอ) · adapter rewind ด้วย pure function ของโปรเจกต์ (`packages/geo` เมื่อสร้าง ระหว่างนี้อยู่ใน `apps/client/src/map/`) · ไม่เพิ่ม `@turf/rewind` โดยไม่มี handoff ถึง tech-lead (tech note 15.2 ข้อ 7)
- ห้ามมี property ที่เป็นพิกัด รหัส หรือชื่อของผู้เล่นคนใด · `label_count` เป็นตัวเลขรวมระดับ dungeon เท่านั้น
- ต่อไปเมื่อ artist-2d วาด glyph class 4 แบบตาม icon-grammar แล้ว จะเพิ่ม image `kw-class-tanker` ... ใน `label_count` ด้วย `format` + `image` แทนตัวย่อ (เวอร์ชันถัดไปของ style ไม่เปลี่ยนสัญญา property)

**การเลือกจุดวางป้าย (`kw-dungeon-labels`)**
1. ใช้ **pole of inaccessibility** (อัลกอริทึม polylabel: จุดภายใน polygon ที่ห่างจากขอบมากที่สุด) ของ polygon · **ห้ามใช้** จุดกึ่งกลาง bbox หรือ centroid ทางเรขาคณิต เพราะทั้งสองแบบตกนอก polygon ได้เมื่อรูปเว้า (สวนรูปตัว L ริมคลอง ตลาดที่เป็นแนวยาวหักมุม) ทำให้ icon และชื่อไปอยู่บนถนนหรือในพื้นที่ของที่อื่น
2. `MultiPolygon`: เลือก polygon ย่อยที่มีพื้นที่ (planar) มากที่สุด แล้วหาจุดของ polygon นั้นจุดเดียว · ไม่สร้างจุดต่อ polygon ย่อย
3. คำนวณในพิกัด lon/lat ตรงได้ (dungeon กว้างไม่กี่ร้อยเมตร ความเพี้ยนของมาตราส่วนที่ละติจูด 13–14 องศาน้อยจนไม่มีผลกับการวางป้าย) · precision 0.00001 องศา (~1 ม.) · ปัดพิกัดผลลัพธ์ ≤ 5 ทศนิยม
4. ผลต้อง **อยู่ภายใน polygon** เสมอ (ไม่อยู่ในรู ไม่อยู่บนขอบ) · ถ้าอัลกอริทึมคืนจุดที่ไม่ผ่าน point-in-polygon (polygon เสีย) ให้ `console.warn` และ **ไม่ใส่จุดของ dungeon นั้น** ดีกว่าวางป้ายผิดที่ (polygon ยังแสดงตามปกติ)
5. คำนวณครั้งเดียวเมื่อ geometry ของ dungeon เปลี่ยน แล้ว cache ตาม `id` · การเปลี่ยน `label_count` ทุก tick ไม่ต้องคำนวณจุดใหม่ (แค่สร้าง feature ใหม่ด้วยจุดเดิม)
6. ในอนาคต (Phase 3) หลังบ้านอาจส่งจุดที่ level-designer เลือกเองมาได้ · ถ้ามี ให้ใช้เมื่อผ่านข้อ 4 ไม่ผ่านจึงคำนวณเอง (ต้องมีใน API contract ของ tech-lead ก่อน ไม่ใช่งานของ Phase 1)
7. อัลกอริทึม: เขียนเป็น pure function ของโปรเจกต์ (`packages/geo` เมื่อสร้าง ระหว่างนี้ `apps/client/src/map/` เหมือน rewind) หรือใช้ package `polylabel` (ISC, ไม่มี dependency) **ต่อเมื่อ tech-lead อนุมัติผ่าน handoff** เช่นเดียวกับกติกา `@turf/rewind`

ค่าคาดหวังของตัวอย่าง: `samples/dungeon-labels.sample.geojson` · `sample-open-01` (polygon เกือบสี่เหลี่ยม ขอบบนเอียง) → `[100.54085, 13.7306]` รัศมีวงในสุด ~0.00435 องศา · `sample-sponsored-01` และ `sample-closed-01` (สี่เหลี่ยมจัตุรัส) → จุดกลาง `[100.553, 13.806]`, `[100.559, 13.73]` · test ของ adapter เทียบได้ด้วย tolerance 0.0001 องศา

**ทำไมป้ายไม่ซ้ำ (by construction) และทำไม allow-overlap ยังเป็น true**
- บั๊กเดิม (P1-H06 หัวข้อ 5): symbol layer อ่าน polygon จาก GeoJSON source · geojson-vt ตัด polygon ข้าม internal tile และ MapLibre คำนวณ anchor ของ symbol ต่อชิ้นใน tile แต่ละใบ ป้ายของ dungeon เดียวจึงออกหลายชุด (S1 เห็น 4 ชุด) · `*-allow-overlap: true` ทำให้ collision ไม่กรองชุดที่ซ้ำ
- ตอนนี้แต่ละ dungeon มี Point จุดเดียว · จุดเดียวมี anchor เดียว · แม้ geojson-vt ใส่จุดที่อยู่ใกล้ขอบ tile ลงใน buffer ของ tile ข้างเคียงด้วย MapLibre ข้าม anchor ที่อยู่นอก extent ของ tile นั้นเมื่อวางแบบ point placement จึงวาดแค่ใน tile ที่เป็นเจ้าของจุด · จำนวนป้ายต่อ dungeon จึงเท่ากับ 1 เสมอโดยไม่ขึ้นกับขนาดหรือรูปร่าง polygon และไม่ต้องปรับ `tolerance`/`buffer`/`maxzoom` ของ source
- `icon-allow-overlap`/`text-allow-overlap` = `true` (และ `icon-ignore-placement` = `true` ที่ `kw-rift-crack`) คงไว้โดยตั้งใจ: (1) ชื่อ จำนวน ป้าย sponsored และ icon ของ dungeon เดียวกันวางซ้อนกันที่ anchor เดียวด้วย offset ต้องไม่ซ่อนกันเอง (2) ป้าย sponsored ต้องไม่หายเพราะชื่อถนนเบียด (style-guide 9.2 "sponsored ต้องมีป้ายชัดเจน") · ผลข้างเคียงที่ยอมรับ: dungeon สองแห่งที่อยู่ใกล้กันมากอาจมีป้ายทับกันที่ zoom ต่ำ · ถ้าเจอจริงในข้อมูลของ level-designer จะแก้ด้วย `symbol-sort-key` หรือ minzoom ไม่ใช่ปิด allow-overlap
- ห้ามแก้ปัญหาป้ายซ้ำด้วยการปิด allow-overlap: จะซ่อนป้ายซ้ำแบบสุ่มตามลำดับ tile และซ่อนป้าย sponsored ไปด้วย

### 6.2 `kw-playarea-mask` (โซนดำ)

- 1 feature `Polygon` ที่วงนอกคลุมโลก `[-180,-85]..[180,85]` และมีรู (วงใน ตามเข็มนาฬิกา) เป็นขอบรวมของจังหวัดที่เปิดเล่น (กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร นครปฐม) · เมื่อเปิดจังหวัดใหม่ แค่เปลี่ยนข้อมูล ไม่แก้ style
- ข้อมูลรูมาจาก config/ข้อมูลของ location-engineer (`data/coverage/`) ไม่ใช่ค่าในโค้ด · ไฟล์ตัวอย่างใช้ bbox ของ tile แทน
- ลดความละเอียดเส้นขอบก่อนส่ง (simplify ~20 ม.) เพื่อไม่ให้ mask หนักเกินบนมือถือ

### 6.3 `kw-provinces` (เส้นและชื่อจังหวัด)

| kind | geometry | property | ใช้ที่ |
| --- | --- | --- | --- |
| `border` | LineString / MultiLineString | — | `kw-province-border-casing`, `kw-province-border` |
| `label` | Point (จุดวางชื่อที่เลือกไว้แล้ว) | `name` (ชื่อจังหวัดไทย), `playable` (boolean) | `kw-province-label` |

- ใช้ GeoJSON แยกแทน layer `boundaries` ของ tile เพราะ tile ครอบแค่ bbox ของกรุงเทพฯ + 5 จังหวัด ส่วนเส้นจังหวัดต้องเห็นทั่วประเทศในโซนดำ (GDD "แผนที่เต็มคือประเทศไทย")
- ความละเอียดที่แนะนำ: simplify ~200 ม. ทั้งประเทศ (77 จังหวัด) ขนาดเป้า ≤ 300 KB ก่อน gzip · ที่มา OSM (ODbL) จึงมี attribution OSM ใน source
- `playable` ใช้ในอนาคตเพื่อแสดงจำนวนการลงทะเบียนความสนใจบนชื่อจังหวัดในโซนดำ (GDD) ผ่าน property ที่ client จัดรูปเหมือน `label_count`

### 6.4 `kw-self` (ตำแหน่งของตัวเองเท่านั้น)

| kind | geometry | ที่มา |
| --- | --- | --- |
| `position` | Point 1 จุด | `LocationProvider` บนเครื่องนี้ (marker.ts ใน P1-F02-T11) |
| `accuracy` | Polygon วงกลมรัศมี = `accuracy` (เมตร) ของ sample ล่าสุด, 32–64 จุด | คำนวณบนเครื่องจาก sample เดียวกัน |

- source นี้มีได้แค่ feature ของอุปกรณ์เครื่องนี้ · ห้ามเติมข้อมูลจาก server หรือของผู้เล่นอื่น (หัวข้อ 12)
- อัปเดตเมื่อได้ sample ใหม่เท่านั้น ไม่ interpolate ระหว่าง sample และไม่มีวงเต้น (หัวข้อ 11) · ถ้า P1-F02-T11 เลือกวาด marker เป็น DOM element แทน ต้องใช้สีและขนาดเดียวกับ `kw-self-dot` และลบ layer นี้ออกจาก style ผ่าน handoff ไม่ใช่ลบในโค้ด

## 7. รอยแยก (dungeon)

ภาพที่ต้องเห็นที่ zoom 16 บนสวนสาธารณะ: polygon ของสวนมีขอบบานเย็นเข้ม 3 px มุมหักแหลม ขอบในชมพูอ่อน 1 px พื้นในแต้มชมพูจางใต้ถนนและทางเดิน · ที่จุดวางป้ายด้านในของ polygon (หัวข้อ 6.1) มี icon **ชุดเดียว** รอยแตกซิกแซกแนวตั้ง (ขอบหมึก พื้นบานเย็น ขอบในชมพู แกนครีม) สูง 36 px · เหนือ icon คือชื่อ dungeon ตัวครีมบนแถบบานเย็น · ใต้ icon คือจำนวนคนและ role ตัวหมึกบนแถบชมพู · ถ้าเป็น sponsored มีป้ายตัวครีมบนแถบดำใต้จำนวนคน

| ส่วน | ค่า |
| --- | --- |
| ขอบนอก | `rift.500` 3 px, `line-join: miter` (มุมแหลมตาม shape language ของรอยแยก) |
| ขอบใน | `rift.300` 1 px, offset −2 px, เริ่มที่ z14 (ต่ำกว่านั้นขอบในกับขอบนอกชนกัน) |
| พื้น | `rift.300` ทึบ 20% ใต้ถนน · ไม่ใช้พื้นทึบทับชื่อถนน |
| icon | `kw-rift-crack` 24 × 36 CSS px ที่ z ≥ 14, ย่อ 0.6 เท่าที่ z10 · ภาพนิ่ง |
| ชื่อ | `Noto Sans Medium` 16→18 px, `bg.paper` บน halo `rift.500` 3 px, anchor ล่างเหนือ icon 1.4 em, กว้างสูงสุด 8 em |
| จำนวน/role | `Noto Sans Medium` 14 px, `ink.900` บน halo `rift.300` 3 px, ใต้ icon 1.4 em, เริ่ม z14 |
| sponsored | `Noto Sans Medium` 14 px, `bg.paper` บน halo `ink.900` 3 px · z12–13 อยู่ใต้ icon 1.4 em · z ≥ 14 อยู่ใต้จำนวนคน 3.0 em · แสดงทุก zoom ที่ชื่อแสดง (z ≥ 12) |
| dungeon ปิด | ขอบ `ink.500` 3 px ประ · ไม่มี icon ไม่มีพื้น · ชื่อ halo `ink.500` |

ข้อกำหนดป้าย sponsored (style-guide 9.2): สีของป้ายคือ `ink.900` + `bg.paper` เท่านั้น **ไม่ใช้สี rarity, สี rift (`rift.*`) หรือ `accent.signal`** · ไม่ย่อเหลือ icon · ไม่มีโลโก้ผู้สนับสนุนบนแผนที่ · ถ้อยคำจาก copy key
เหตุผลที่ใช้ halo แทนกล่องพื้นหลัง: กล่องพื้นหลังต้องใช้ image ใน sprite ซึ่ง sprite ของ Protomaps ที่ pin ไม่มี · halo 3 px ทึบให้ผลใกล้เคียง chip และไม่เพิ่ม asset · เวอร์ชันถัดไปอาจเปลี่ยนเป็น chip ด้วย `icon-text-fit` เมื่อมี image `kw-chip-*`

## 8. โซนดำและเส้นจังหวัด

- `background` เป็น `map.zone-black` ส่วนนอก bbox ของ tile จึงดำเองโดยไม่ต้องมีข้อมูล · ส่วนใน bbox แต่นอกจังหวัดที่เปิดเล่นถูกปิดด้วย `kw-zone-black` (ทึบ 100%, ปิด antialias เพื่อไม่ให้เห็นรอยต่อระหว่าง tile)
- เส้นจังหวัดเป็นคู่ชั้น: ฐานทึบ `ink.900` 3–4 px + เส้นประ `map.province-border` 2 px รูปแบบ 4/4 px · บนโซนดำฐานกลืนหาย (1.09:1) เหลือเส้นประเทา 6.74:1 · ในเขตเล่นเห็นเป็นเส้นเข้มมีประเทา (ฐาน 14.18:1 กับพื้นดิน) จึงผ่านกลางแดดทั้งสองพื้นด้วยชั้นเดียวกัน
- ชื่อจังหวัด `ink.100` halo `ink.900` · อ่านได้บนโซนดำ (14.07:1) และในเขตเล่น (12.88:1 กับ halo)
- ถนน ชื่อถนน อาคาร และ POI นอกเขตไม่แสดง เพราะอยู่ใต้ mask

## 9. ตาราง contrast บนแผนที่

คำนวณตามวิธีใน style-guide 2 (WCAG 2.x) · ค่า L ของ #3377AA = 0.1680 (คำนวณใหม่ในงานนี้) ค่าอื่นจาก style-guide 3 · ทุกแถวตรวจอัตโนมัติด้วย `qa/tests/unit/contrast.test.ts` (P1-H04, ผลใน `qa/reports/F03-contrast-check.md`) · แก้ใน P1-X06: แถว `map.road` บน `map.land` 1.16 → 1.22 (= (1.0000 + 0.05) / (0.8111 + 0.05) = 1.2194) ข้อสรุปเดิมไม่เปลี่ยน ถนนทุกระดับยังต้องมีขอบ

| คู่ | Ratio | ผล | หมายเหตุ |
| --- | --- | --- | --- |
| `map.label` บน halo `map.road`/ขาว | 17.29 | AAA | ชื่อถนน |
| `map.label` บน `map.land` / `map.park` | 14.18 / 13.60 | AAA | กรณี halo บาง |
| `ink.700` (POI, ย่าน) บน halo ขาว | 12.37 | AAA | 14 px ใช้ได้ |
| `map.label-water` บน halo ขาว / บน `map.water` | 7.91 / 5.46 | AAA / AA | ชื่อน้ำ |
| `bg.paper` บน halo `rift.500` | 5.09 | AA | ชื่อ dungeon 16 px ขึ้นไป |
| `bg.paper` บน halo `ink.500` | 6.92 | AA | ชื่อ dungeon ที่ปิด |
| `ink.900` บน halo `rift.300` | 8.79 | AAA | จำนวน/role 14 px |
| `bg.paper` บน halo `ink.900` | 16.39 | AAA | sponsored 14 px |
| `ink.100` บน `map.zone-black` / halo `ink.900` | 14.07 / 12.88 | AAA | ชื่อจังหวัด |
| ขอบ `rift.500` บน `map.park` / `map.land` / `map.water` | 4.22 / 4.40 / 3.70 | UI | ขอบรอยแยก |
| ขอบ `ink.500` (dungeon ปิด) บน `map.park` | 5.74 | UI | |
| `map.road-casing` บน `map.land` / `map.park` | 5.99 / 5.74 | UI | ขอบถนน |
| `map.road` บน `map.road-casing` | 7.30 | UI | ตัวถนนแยกจากขอบ |
| `ink.500` ทางเดิน/ราง บน `map.land` / `map.park` / `bg.paper` | 5.99 / 5.74 / 6.92 | UI | |
| #3377AA คลอง/ขอบน้ำ บน `map.land` / `map.park` / `map.water` | 3.95 / 3.79 / 3.32 | UI | |
| `map.province-border` บน `map.zone-black` | 6.74 | UI | |
| ฐาน `ink.900` ของเส้นจังหวัดบน `map.land` | 14.18 | UI | |
| ขอบ `ink.900` ของจุดตัวเองบน `map.land` / `map.park` / ถนน | 14.18 / 13.60 / 17.29 | UI | |
| `accent.signal` ในจุดตัวเองกับขอบ `ink.900` | 11.43 | UI | |
| ขอบวง accuracy `state.info` บน `map.land` / `map.park` / ถนน | 5.13 / 4.91 / 6.25 | UI | |
| `map.road` บน `map.land` (ไม่มีขอบ) | 1.22 | ห้าม | เหตุผลที่ถนนทุกระดับมีขอบ |
| `buildings` `ink.100` บน `map.land` | 1.10 | ตกแต่ง | ตั้งใจให้จาง ไม่ถือเป็นข้อมูล |
| `map.water` บน `map.land` (ไม่มีขอบ) | 1.19 | ห้าม | เหตุผลที่เพิ่ม `water_edge` |

## 10. การทดสอบ: fixture tile และกลางแดด

### 10.1 ทดสอบกับ fixture tile (ทำโดยผู้ที่รัน browser ได้: gameplay-programmer ใน P1-F02-T11 หรือ qa-tester)
1. ใช้ fixture ใน `tools/tiles/fixtures/` (PMTiles และ TileJSON จาก P1-F02-T06) ทดสอบทั้ง 2 รูปแบบ source ด้วย style เดียว
2. เติม source `kw-*` ด้วยไฟล์ใน `art/direction/map-style/samples/` และ addImage `kw-rift-crack`
3. ถ่ายภาพจอขนาด 390 × 844 CSS px (dpr 3) และ 360 × 800 (dpr 2) ที่ตำแหน่งและ zoom ตามตาราง · เก็บที่ `qa/reports/F02/map-style/` (ผู้ถ่ายเป็นเจ้าของ path นั้น) แล้วแนบใน report

| # | ตำแหน่ง | zoom | ต้องเห็น |
| --- | --- | --- | --- |
| S1 | สวนลุมพินี 100.5410, 13.7310 | 16 | รอยแยกตัวอย่าง ชื่อ จำนวน/role จุดตัวเอง + วง accuracy · ชื่อถนนพระราม 4 และถนนราชดำริเป็นภาษาไทยอ่านออก สระบน/ล่างและวรรณยุกต์ไม่ลอย ไม่ซ้อน |
| S2 | ย่านซอยแคบ เช่น สุขุมวิท 100.5600, 13.7370 | 17 | ชื่อซอย (`roads_label_minor`) ครบ ไม่มีกล่องสี่เหลี่ยม (tofu) |
| S3 | สวนจตุจักร 100.5530, 13.8060 | 15 | ป้าย sponsored ตัวครีมบนแถบดำ ไม่ใช่สี rift/rarity |
| S4 | ขอบเขตเล่นด้านตะวันออก 101.00, 13.80 | 9 | โซนดำด้านนอก เส้นจังหวัดประ ชื่อจังหวัด ไม่มีถนนนอกเขต |
| S5 | แม่น้ำเจ้าพระยา 100.4950, 13.7400 | 14 | ขอบน้ำและชื่อแม่น้ำอ่านออก คลองเห็นเป็นเส้นน้ำเงินเข้ม |

เกณฑ์ผ่าน: ไม่มี tofu · ข้อความไทยทุกป้ายวาดด้วย Noto Sans Thai (ตรวจใน DevTools ว่าโหลด `_faces/*.ttf`) · ไม่มี request ออกนอก host ของตัวเอง (ไม่มี CDN) · console ไม่มี error ของ style ยกเว้น image ที่ยังไม่ addImage ก่อนโหลด

### 10.2 ทดสอบกลางแดด (style-guide S10)
- เครื่อง: Android Chrome 1 เครื่อง + iPhone Safari 1 เครื่อง (ชุดเดียวกับ kit ของ spike) · ความสว่างจอ 100% ปิด auto-brightness · กลางแจ้งไม่มีร่มเงา เวลา 12:00–15:00
- เปิดจอ S1, S3, S4 ถ่ายรูปจอด้วยกล้องอีกเครื่องที่ระยะ 35–40 ซม. มุม 30° (ท่าถือเดินจริง) แล้วแปลงรูปเป็นขาวดำ
- ผ่านเมื่อในภาพขาวดำ: (1) อ่านชื่อถนนหลัก 2 ชื่อได้ (2) แยกขอบรอยแยกออกจากสวนได้ (3) เห็นจุดตัวเองภายใน 1 วินาที (4) อ่านชื่อ dungeon และป้าย sponsored ได้ (5) แยกโซนดำกับเส้นจังหวัดได้
- ตกข้อใด: บันทึกข้อที่ตก layer id และรูป ส่ง handoff มา art-director แก้สีหรือความหนา · ห้ามแก้ใน client

## 11. ไม่มี animation ต่อเนื่อง

เหตุผล: แบตเตอรี่ระหว่างเดิน 30 นาที (pillars P4 และเกณฑ์ spike) · การวาดแผนที่ใหม่ทุกเฟรมกินแบตมากที่สุด

- style ไม่มี layer ใดที่ต้องวาดซ้ำตามเวลา: ไม่มี `line-dasharray` ที่เลื่อน, ไม่มี pulse ของจุดตัวเอง, ไม่มี icon หมุนหรือเรือง, ไม่มี heatmap · รอยแยกเป็นภาพนิ่ง
- root `transition` = `{ "duration": 0, "delay": 0 }` ทำให้การเปลี่ยนค่า paint ไม่ไล่สี
- client ห้ามใช้ `requestAnimationFrame`, `setInterval` หรือ `setPaintProperty` วนเพื่อทำเอฟเฟกต์บนแผนที่ · แนะนำตั้ง `fadeDuration: 0` ใน option ของ map (การจางของป้ายเป็นครั้งเดียว ไม่ใช่ต่อเนื่อง แต่ตั้ง 0 เพื่อลดการวาดซ้ำ)
- การเคลื่อนกล้องตามตัว (follow mode) ขยับเมื่อได้ sample ใหม่เท่านั้น ใช้ `jumpTo` หรือ `easeTo` สั้นไม่เกิน 300 ms ต่อ sample · ไม่ interpolate ตำแหน่งระหว่าง sample
- เอฟเฟกต์ที่ต้องเคลื่อนไหว (เข้ารอยแยก รางวัล) อยู่นอกแผนที่ ในชั้น UI ที่เล่นครั้งเดียวแล้วหยุด (เป็นของ vfx-animator และ uiux-designer)

## 12. ความเป็นส่วนตัวและข้อห้าม

- **ตำแหน่งบนแผนที่มีแค่ของตัวเอง** (`kw-self`) · ข้อมูลผู้เล่นอื่นปรากฏได้แค่ `label_count` บนป้ายรอยแยก เป็นตัวเลขรวมระดับ dungeon และจำนวนต่อ role · Point ใน `kw-dungeon-labels` คือจุดวางป้ายของ **สถานที่** ที่คำนวณจาก polygon ของ dungeon ไม่ใช่ตำแหน่งของใคร และมี 1 จุดต่อ dungeon เสมอ ห้ามใส่จุดต่อผู้เล่นหรือต่อกลุ่มลงใน source นี้ · **ห้ามเพิ่ม** layer แบบ `circle`, `heatmap`, cluster, หรือ symbol ที่มาจากข้อมูลรายคนของผู้อื่น ไม่ว่าจะเบลอหรือหน่วงเวลาแล้วก็ตาม (non-negotiable 4, SF-7) · tech gate และ content gate ตรวจด้วยการไล่ `sources` ใน style และการเรียก `addSource`/`addLayer` ใน client
- POI: whitelist `park`, `garden`, `playground`, `marketplace`, `station`, `train_station`, `bus_station`, `ferry_terminal`, `museum`, `zoo`, `aquarium`, `library`, `sports_centre`, `stadium` · **ไม่มี** `place_of_worship` หรือศาสนสถานใดๆ และไม่มี icon ของ POI (D-006) · ตัด `attraction` ออกโดยเจตนา เพราะวัดท่องเที่ยวใน OSM มักติดแท็ก `tourism=attraction` · ชื่อถนนหรือย่านที่เป็นชื่อจริงยังแสดงตามข้อมูล OSM เพราะเป็นข้อมูลนำทาง ไม่ใช่การเน้น
- `landuse_park` รวม `cemetery` เป็นสีสวนธรรมดา ไม่มีสัญลักษณ์ใดๆ
- ไม่มีโลโก้ แบรนด์ หรือสีของผู้ให้บริการขนส่งจริงบนแผนที่ · รางใช้สีกลาง `ink.500`
- ป้าย sponsored ไม่ใช้สี rarity, rift หรือ `accent.signal`

## 13. การตรวจ style JSON

การตรวจหลัก (tech note 15.3): test `qa/tests/unit/map-style.test.ts` เรียก `validateStyleMin` ของ `@maplibre/maplibre-gl-style-spec` 26.4.4 (dev dependency ของ root ตาม ADR 0001 3.13 เวอร์ชันเดียวกับที่ `maplibre-gl` 6.10.0 ใช้) กับ `art/direction/map-style/kw-light.style.json` ต้องได้ error 0 · รันผ่าน `pnpm test` ไม่เรียก path ใต้ `node_modules/.pnpm/` อีก · qa-tester เพิ่ม test นี้หลัง tech-lead ติดตั้ง style-spec เป็น dev dependency (ระหว่างนี้ยังไม่มีไฟล์ test)

ผลตรวจที่มีแล้ว: P1-H01 (2026-09-23) รัน `gl-style-validate.mjs` กับไฟล์นี้ → exit 0 ไม่มีบรรทัด error (tech note 15.3)

contrast ของหัวข้อ 9 ตรวจด้วย `qa/tests/unit/contrast.test.ts` (P1-H04) · ผลรอบแรก 294/295 ผ่าน ตกข้อเดียวคือแถว `map.road` บน `map.land` ที่เขียนไว้ 1.16 · P1-X06 แก้เป็น 1.22 แล้ว test ข้อนั้นจึงควรผ่าน (295/295) · ผู้เขียนไม่มี shell ให้ qa-tester ยืนยันด้วยการรันซ้ำ

บันทึกเดิมของ P1-F03-T12 (ตรวจด้วยมือเทียบกับ `src/reference/v8.json` และ `src/validate/*.ts` ของ style-spec 26.4.4 ก่อนมีเครื่องมือ)

| สิ่งที่ตรวจ | ผล |
| --- | --- |
| root key ทุกตัวมีใน `$root` ของ v8 (`version`, `name`, `metadata`, `center`, `zoom`, `bearing`, `pitch`, `transition`, `sources`, `sprite`, `glyphs`, `font-faces`, `layers`) | ผ่าน |
| `glyphs` มี `{fontstack}` และ `{range}` (`validate_glyphs_url.ts`) | ผ่าน |
| `font-faces` เป็น object ของ array ที่มี `url` (บังคับ) และ `unicode-range` เป็น array ของสตริงรูป `U+0E00-0E7F` ตรง regex ใน `validate_font_faces.ts` | ผ่าน |
| source `vector` ใช้ key `type`, `url`, `attribution` · source `geojson` ใช้ `type`, `data`, `attribution`, `promoteId` (มีใน `source_vector`/`source_geojson`) | ผ่าน |
| `symbol-placement` ไม่ใช้ข้อมูลของ feature (เป็น property แบบ zoom เท่านั้น) จึงแยก `water_label_point` กับ `water_label_line` | ผ่าน |
| `text-offset` ใช้ `step` ตาม zoom ได้ (`expression.parameters` = zoom, feature) · `text-halo-color`, `symbol-sort-key` data-driven ได้ | ผ่าน |
| `id` ของ layer ไม่ซ้ำ 38 ชั้น · ทุก layer อ้าง source ที่มีอยู่ · layer ของ source `vector` มี `source-layer` ทุกชั้น | ผ่าน |
| JSON parse ได้ (อ่านทวนทั้งไฟล์หลังเขียนเสร็จ) | ผ่าน (ตรวจด้วยตา) |

ถ้า `map-style.test.ts` พบ error ให้ส่งกลับ art-director แก้ใน style JSON และไฟล์นี้ ไม่แก้ในโค้ด

P1-X32 (style 0.2.0): เพิ่ม source `kw-dungeon-labels` (`geojson`, `data`, `promoteId` เหมือน `kw-dungeons`) และเปลี่ยน `source` + filter ของ 4 symbol layer เป็น `["==", ["geometry-type"], "Point"]` · จำนวน layer ยัง 38 ชั้น id เดิม · ตรวจด้วยมือว่า key ทุกตัวมีใน v8 และ JSON ถูกต้อง · ผู้เขียนไม่มี shell **orchestrator ต้องรัน `npx vitest run qa/tests/unit/map-style.test.ts` (คาด 0 error, 2/2 ผ่าน)** และถ่าย S1/S3 ซ้ำตามหัวข้อ 10.1 หลัง P1-X33 เชื่อม source ใหม่ในโค้ด (คาด: ชื่อ จำนวน ป้าย sponsored และ icon อย่างละ 1 ชุดต่อ dungeon)

ข้อเสนอ static check เพิ่ม (qa-tester เป็นเจ้าของ test): ทุก layer ที่ `type = symbol` ต้องไม่มี `source = kw-dungeons` · ทุก layer ที่อ่าน `kw-dungeon-labels` ต้องเป็น `symbol` · กันบั๊กนี้กลับมาจากการแก้ style ครั้งหน้า

## 14. สมมติฐานและงานส่งต่อ

สมมติฐาน
- A-P1-F03-T12-1: style เขียนมือตาม schema v4 เพราะไม่มี `@protomaps/basemaps` ในเครื่อง (หัวข้อ 2) (ยืนยัน: gameplay-programmer หรือ location-engineer ที่ generate theme ทางการได้)
- A-P1-F03-T12-2: label แผนที่ใช้ Noto Sans Regular/Medium ไม่ใช่ Bold (หัวข้อ 4) (ยืนยัน: art-director แก้ style-guide 7)
- A-P1-F03-T12-3: เส้นจังหวัดและ mask โซนดำมาจาก GeoJSON แยก ไม่ใช้ layer `boundaries` ของ tile (หัวข้อ 6.2–6.3) · **ปิดแล้ว:** D-037 ACCEPTED ใน tech note 15.1 (ไฟล์ `data/map/playarea-mask.geojson`, `data/map/provinces.geojson`)
- A-P1-F03-T12-4: token ใหม่ที่ใช้บนแผนที่เป็น token เดิมทั้งหมด (`ramp.water` right #3377AA ใช้กับคลองและขอบน้ำ) ไม่มี hex ใหม่ · ตาราง 3.5 ของ style-guide ยังถูก แต่ควรเพิ่มแถว `map.water-edge` = #3377AA (ยืนยัน: art-director)
- A-P1-F03-T12-5: สัญญา property ของ `kw-dungeons` (หัวข้อ 6.1) เป็นร่างจนกว่า tech-lead จะออก API contract ของ dungeon ใน Phase 3 · **ปิดในส่วนชื่อ property:** tech note 15.2 ACCEPTED เป็น view model ฝั่ง client (adapter whitelist, `status` ไม่รู้จัก → `closed`) · ส่วนที่ยังเปิดคือรูป payload ของ server (Phase 3) ซึ่งไม่กระทบ style

- A-P1-X32-1: MapLibre (6.10.0) ข้าม anchor ของ point placement ที่อยู่นอก extent ของ tile จึงไม่วางจุดที่อยู่ใน buffer ของ tile ข้างเคียงซ้ำ (พฤติกรรมของ symbol layout ใน Mapbox GL/MapLibre ทุกเวอร์ชันที่รู้จัก) (ยืนยัน: qa-tester ด้วยภาพ S1/S3 ซ้ำ และ query จำนวนป้ายต่อ `id` หลัง P1-X33)
- A-P1-X32-2: ใน Phase 1–2 client คำนวณจุดวางป้ายเอง (หัวข้อ 6.1 ข้อ 1–5) · จุดที่หลังบ้านเลือกเองเป็นทางเลือกของ Phase 3 (ยืนยัน: tech-lead ตอนออก API contract ของ dungeon)

การเปลี่ยน style: art-director เท่านั้น · ทุกครั้งที่เปลี่ยนสี ให้คำนวณหัวข้อ 9 ใหม่ และเพิ่ม `metadata.kw:styleVersion`

