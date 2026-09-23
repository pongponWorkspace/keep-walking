# tools/tiles — build แผนที่ฐานกรุงเทพฯ + ปริมณฑล

task: P1-F02-T06 · เจ้าของ: location-engineer · อ้างอิง: tech note `docs/tech/F02-map-location-spike.md` หัวข้อ 5, 6, 7, 9 · D-008, D-031, D-032 · ADR 0001 หัวข้อ 3.11

สคริปต์ในโฟลเดอร์นี้สร้างชุดไฟล์แผนที่ที่ publish บน Cloudflare Pages Free ได้ (ไดเรกทอรี XYZ + `tiles.json` + glyph + font-faces ไทย + sprite + `manifest.json`) จาก Protomaps Basemap v4 ที่ pin ไว้ ด้วยคำสั่งเดียว · **ไม่ upload และไม่ใช้ credential ใด ๆ** การ publish เป็นของ P1-F02-T08 (script) และ HUMAN P1-F02-T19

## 1. ความต้องการ

| เครื่องมือ | เวอร์ชัน | หมายเหตุ |
| --- | --- | --- |
| bash | 3.2 ขึ้นไป | macOS และ Linux |
| jq | 1.6 ขึ้นไป (ทดสอบกับ 1.8.2) | อ่าน `config.json` และเขียน JSON |
| curl, unzip, tar, gzip, xargs, awk | ของระบบ | |
| python3 | 3.11 ขึ้นไป · stdlib เท่านั้น | `verify-bbox.py`, `serve.py` · ไม่ต้องมี venv |
| go-pmtiles | 1.31.2 (pin + sha256) | `bin/fetch-tools.sh` ดาวน์โหลดลง `downloads/` เอง ไม่ติดตั้ง global |

ไม่มี Node workspace ใน `tools/tiles` (ADR 0001 หัวข้อ 3.3, 3.11) · ไฟล์ `test/tiles.test.ts` เป็นแค่ bridge ให้ root `pnpm test` เรียก `test/run.sh`

## 2. สิ่งที่ pin (ตรวจ 2026-09-23)

ค่าทั้งหมดอยู่ใน `config.json` ที่เดียว สคริปต์ไม่ hardcode

| รายการ | ค่า | การตรวจ |
| --- | --- | --- |
| tile schema | Protomaps Basemap v4 · build `20260923` (`https://build.protomaps.com/20260923.pmtiles`) · metadata `version = 4.15.2` · OSM replication `2026-09-23T04:00:00Z` | build ล้มถ้า metadata version ไม่ตรง `schema.expectedMetadataVersion` |
| CLI | go-pmtiles v1.31.2 (commit `a3e4951`, 2026-07-22) | sha256 ต่อ OS/arch ใน `tools.pmtiles.assets` (ค่าจาก GitHub release) |
| glyph PBF + sprite | `protomaps/basemaps-assets` commit `028c18f713baecad011301ff7a69acc39bcc2ae7` (2025-10-31) · fontstack `Noto Sans Regular/Medium/Italic` (256 ไฟล์ต่อ stack) · sprite `v4/light` (+`@2x`) | `treeSha256` = sha256 ของรายการ sha256 ทุกไฟล์ที่ใช้ (tarball ของ codeload ไม่รับประกันว่า byte คงที่ จึงไม่ตรวจที่ตัว tarball) |
| font-faces ไทย (D-032) | Noto Sans Thai release `NotoSansThai-v2.002` (notofonts/thai) · zip sha256 `af889cc6…a485` · ใช้ `unhinted/ttf/NotoSansThai-Regular.ttf` และ `-Medium.ttf` | sha256 ของ zip, ของแต่ละ TTF และของ `OFL.txt` |
| ขอบเขตปกครองที่ใช้ตรวจ bbox | `tools/coverage/out/boundaries.geojson` (OSM, data date 2026-09-01) · รายชื่อจังหวัดจาก `tools/coverage/params.json#pipeline.studyArea.provinces` | `bin/verify-bbox.py` |

ใช้ font แบบ unhinted เพราะ MapLibre วาด font-faces เป็น SDF ผ่าน canvas (TinySDF) hinting จึงไม่มีผล แต่ทำให้ไฟล์ใหญ่ขึ้นเกือบเท่าตัว (20.9 KB เทียบ 37.8 KB)

### 2.1 เปลี่ยน build ของ Protomaps

1. เลือก build ใหม่จาก `https://build-metadata.protomaps.dev/builds.json` (patch version เดียวกันกับ `expectedMetadataVersion` หรืออัปเดตค่านั้นหลัง art-director ยืนยันว่า style ยังเข้ากันได้)
2. แก้ `schema.buildKey` และ `schema.sourceUrl` → `tileset_id` เปลี่ยนเอง (`pm4-<build>-z<maxzoom>`) ทำให้ URL ใหม่และ cache เก่าไม่ชนกัน
3. รัน `bin/build.sh` และ `bin/build-fixture.sh` แล้วบันทึกผลใน size report

## 3. คำสั่ง

รันจากรากของ repo ได้ทุกคำสั่ง (สคริปต์หา path เอง)

| คำสั่ง | ทำอะไร |
| --- | --- |
| `tools/tiles/bin/build.sh` | **คำสั่งหลัก:** เครื่องมือ + asset ที่ pin → ตรวจ bbox กับขอบจังหวัด → `pmtiles extract` → แตกเป็น XYZ + `tiles.json` → glyph, font-faces, sprite → `manifest.json` → ตรวจงบ → size report |
| `tools/tiles/bin/build-fixture.sh` | สร้าง fixture สวนลุมพินีใน `fixtures/lumpini/` (commit ได้) |
| `tools/tiles/test/run.sh` | test แบบ offline กับ fixture (39 ข้อ) · root `pnpm test` เรียกผ่าน `test/tiles.test.ts` |
| `python3 tools/tiles/bin/serve.py` | static server ในเครื่องที่ตอบ range request ด้วย `206` + CORS ที่ `http://127.0.0.1:8765/` (ราก = `tools/tiles/`) |
| `tools/tiles/bin/set-public-url.sh <root> <base-url>` | เขียน URL ใน `tiles.json` ใหม่โดยไม่ build ซ้ำ (ใช้ใน publish ของ T08 และ dev server ของ T11) |
| `tools/tiles/bin/size-report.sh` | พิมพ์ size report จาก `out/size-report.json` อีกครั้ง |
| `tools/tiles/bin/estimate-area.sh <bbox\|thailand\|area> <maxzoom> [--region FILE]` | ประมาณจำนวน tile และขนาดด้วย `--dry-run` (ใช้เน็ต ไม่ดาวน์โหลด tile) |
| `python3 tools/tiles/bin/verify-bbox.py [--region-out FILE]` | ตรวจว่า bbox ครอบ 6 จังหวัดและพิมพ์ระยะเผื่อแต่ละด้าน |
| `tools/tiles/bin/fetch-tools.sh`, `fetch-assets.sh` | ดาวน์โหลดและตรวจ checksum เท่านั้น (build.sh เรียกให้เอง) |
| `shellcheck -x tools/tiles/bin/*.sh tools/tiles/test/run.sh` | lint shell (config ใน `.shellcheckrc`) |

### 3.1 option ของ `build.sh`

| option | ค่าเริ่มต้น | ผล |
| --- | --- | --- |
| `--maxzoom N` | `area.maxzoom` (15) | zoom สูงสุดของ tile |
| `--region-mode bbox\|provinces` | `area.regionMode` (`bbox`) | `provinces` = ตัดตาม polygon อำเภอของ 6 จังหวัด (7,789 tile ที่ z15 แทน 13,502 แต่นอกเขตจังหวัดจะว่าง) |
| `--public-url URL` | env `TILES_PUBLIC_BASE_URL` ถ้ามี ไม่งั้น `http://127.0.0.1:8765/out/publish` | ราก URL ที่เขียนลง `tiles.json` (MapLibre 6.10 ใช้ `tiles[]` ตามที่เขียน ไม่ resolve กับ URL ของ TileJSON จึงต้องเป็น URL เต็ม) |
| `--allow-over-target` | ปิด | ยอมเกินเป้า 15,000/16,000 แต่ยังไม่เกินเพดาน 20,000 |
| `--no-fallback` | ปิด | ไม่ลด maxzoom อัตโนมัติ |
| `--force` | ปิด | extract ใหม่แม้มีไฟล์ใน `out/pmtiles/` แล้ว |
| env `TILES_CONFIG` | `tools/tiles/config.json` | ใช้ config อื่น (test ใช้ทดสอบทางแก้) |
| env `TILES_JOBS` | จำนวน CPU | จำนวน worker ตอนแตก XYZ |

### 3.2 exit code และลำดับทางแก้ (tech note 7.3)

| exit | ความหมาย | สิ่งที่ script ทำ |
| --- | --- | --- |
| `0` | ชุด XYZ ผ่านงบ Cloudflare Pages | `out/publish/` พร้อมให้ T08 publish |
| (ภายใน) | เกินงบที่ `area.maxzoom` | ลดเป็น `area.fallbackMaxzoom` (14) โดย extract จาก archive z15 ในเครื่อง (ไม่ใช้เน็ต) แล้วตรวจใหม่ |
| `3` | z14 ก็ยังเกินงบ Pages | ย้ายชุดที่เกินไป `out/publish-over-budget/` (กัน deploy ผิด) และสร้าง `out/publish-ghpages/` = PMTiles z15 ไฟล์เดียว + glyph + sprite สำหรับ GitHub Pages ชั่วคราว (ToS ไม่ให้ใช้เชิงพาณิชย์, D-008) |
| `4` | GitHub Pages ก็เกิน (site > 1 GB หรือไฟล์ > 100 MiB) | หยุด · ต้องถาม HUMAN · **ห้ามเปลี่ยนไป host เสียเงินเอง** |
| `1` | error อื่น (ดาวน์โหลด, checksum, bbox ไม่ครอบจังหวัด, schema ไม่ตรง) | ข้อความบอกสาเหตุและทางแก้ |

ทดสอบทุกทางแล้วด้วย config ที่ตั้งงบให้แคบลง (ผลใน size report หัวข้อ 4)

## 4. Output (อยู่นอก git ทั้งหมด ยกเว้น `fixtures/`)

```
tools/tiles/downloads/          binary + zip + tarball ที่ pin และ assets/ ที่แตกแล้ว (~93 MB)
tools/tiles/out/pmtiles/        pm4-20260923-z15.pmtiles (68.3 MiB) · -z14 (35.4 MiB) ถ้าเคย fallback
tools/tiles/out/publish/        ชุดที่ deploy ขึ้น Pages project แผนที่ = <root> ของ tech note 6.3
  tiles/pm4-20260923-z15/tiles.json
  tiles/pm4-20260923-z15/{z}/{x}/{y}.mvt      MVT ไม่บีบอัด (Cloudflare บีบอัดตอนส่ง)
  glyphs/<fontstack>/<start>-<end>.pbf         3 × 256 ไฟล์ + OFL-NotoSans.txt
  glyphs/_faces/NotoSansThai-{Regular,Medium}.ttf + OFL-NotoSansThai.txt
  sprites/v4/light{,@2x}.{json,png} + sprites/LICENSE-sprites.txt
  manifest.json
tools/tiles/out/size-report.{json,txt}   verify-bbox.txt   region-provinces.geojson
```

- **ต่างจาก tech note 6.3 หนึ่งจุด:** PMTiles อยู่ที่ `out/pmtiles/` ไม่ใช่ `out/publish/pmtiles/` เพื่อให้ `out/publish/` deploy ได้ทั้งโฟลเดอร์ (ไฟล์ 68 MiB เกินเพดาน 25 MiB ต่อไฟล์ของ Pages) · ชุด GitHub Pages สำรองมี `pmtiles/<tileset_id>.pmtiles` ตามผัง 6.3 [ASSUMPTION A-P1-F02-T06-1]
- `_headers` และ `404.html` ของ project แผนที่เป็นของ T08 · งบจำนวนไฟล์กันไว้ 2 ไฟล์แล้ว (`budget.reservedDeployFiles`)
- `manifest.json`: `tileset_id`, schema, `build_key`, `osm_replication_time`, bbox, zoom, จำนวนไฟล์แยกประเภท, byte รวม, ไฟล์ใหญ่สุด, ตารางต่อ zoom, pin, attribution, เวลา build · workflow ของ T08 สร้าง `VITE_*` จาก `tileset_id` ในไฟล์นี้ (tech note 8) · `bytes.total` ไม่นับขนาดของ `manifest.json` เอง

## 5. Fixture สำหรับ CI, QA, e2e และ client (TL-S08, TL-S11)

`fixtures/lumpini/` (commit เข้า git · `.gitignore` ยกเว้น `tools/tiles/fixtures/**/*.pmtiles` ไว้แล้ว)

| ส่วน | path | ขนาด |
| --- | --- | --- |
| PMTiles | `pmtiles/pm4-20260923-z15-lumpini.pmtiles` | 1,479,856 B (เป้า ≤ 2 MiB) |
| XYZ + TileJSON | `tiles/pm4-20260923-z15-lumpini/tiles.json` + 18 tile (z0–15, z14 และ z15 อย่างละ 2) | 2,238,706 B |
| glyph ชุดเล็ก | `glyphs/Noto Sans {Regular,Medium}/{0-255,3584-3839,8192-8447}.pbf` | 6 ไฟล์ |
| font-faces + sprite | `glyphs/_faces/*`, `sprites/v4/*` | เหมือนชุดเต็ม |
| รวม | 36 ไฟล์ | 4,237,981 B · ไฟล์ใหญ่สุด 1.48 MB (CI guard 5 MiB ต่อไฟล์) |

- bbox `100.538,13.727,100.545,13.734` = สวนลุมพินีพร้อมถนนพระรามที่ 4 (ใต้) และถนนราชดำริ (ตะวันตก) · ตรวจแล้วว่า tile z15 `25535/15122` มีชื่อ `ถนนพระรามที่ 4`, `ถนนราชดำริ`, `ถนนวิทยุ` ใน property `name` (build นี้ไม่มี key `name:th` ชื่อไทยอยู่ใน `name`)
- tile มีถึง z15 (maxzoom ของแหล่ง) · ที่ z16 ขึ้นไป MapLibre overzoom จาก z15 (ตรงกับเกณฑ์ S1 ของ map-style ที่ z16)
- URL ใน `tiles.json` ของ fixture = `http://127.0.0.1:8765/fixtures/lumpini/...` (`fixture.publicUrl`) · client ที่เสิร์ฟ fixture จาก dev server ของตัวเองให้ copy โฟลเดอร์แล้วรัน `set-public-url.sh <copy> http://localhost:4173/map/lumpini` (ตัวอย่าง)
- ค่า `VITE_*` สำหรับ fixture ผ่าน `serve.py`:
  - PMTiles: `VITE_TILES_URL=pmtiles://http://127.0.0.1:8765/fixtures/lumpini/pmtiles/pm4-20260923-z15-lumpini.pmtiles`
  - XYZ: `VITE_TILES_URL=http://127.0.0.1:8765/fixtures/lumpini/tiles/pm4-20260923-z15-lumpini/tiles.json`
  - `VITE_GLYPHS_URL=http://127.0.0.1:8765/fixtures/lumpini/glyphs/{fontstack}/{range}.pbf`
  - `VITE_SPRITE_URL=http://127.0.0.1:8765/fixtures/lumpini/sprites/v4/light`
- สร้างซ้ำ: `tools/tiles/bin/build-fixture.sh` (ใช้ archive z15 ในเครื่องถ้ามี จึงทำ offline ได้ · ไม่งั้นดึงจาก build ที่ pin ~2 MB) · สคริปต์จัดรูป JSON ด้วย prettier ของ repo ให้ผ่าน `pnpm lint` และล้มถ้าเกินเพดานใน `fixture.*`
- test ยืนยันว่า `unpack-xyz.sh` สร้าง XYZ ที่ตรงกับไฟล์ที่ commit ทุก byte

## 6. serve ในเครื่องและตรวจ range request

```
python3 tools/tiles/bin/serve.py                  # http://127.0.0.1:8765/ ราก = tools/tiles/
curl -sS -o /dev/null -D - -H "Range: bytes=0-99" -H "Accept-Encoding: identity" \
  http://127.0.0.1:8765/out/pmtiles/pm4-20260923-z15.pmtiles
#   HTTP/1.0 206 Partial Content · Content-Range: bytes 0-99/71592019 · Content-Length: 100
curl -sS -o /dev/null -D - http://127.0.0.1:8765/out/publish/tiles/pm4-20260923-z15/14/12765/7560.mvt
#   HTTP/1.0 200 OK · Content-type: application/x-protobuf · Access-Control-Allow-Origin: * · Timing-Allow-Origin: *
```

`python3 -m http.server` ไม่รองรับ `Range` (ตอบ 200 ทั้งไฟล์ ทำให้ `pmtiles://` error แบบเดียวกับ Cloudflare Pages) จึงเขียน `serve.py` ด้วย stdlib · tile ที่ไม่มีได้ `404` (MapLibre ถือเป็น tile ว่าง)

## 7. ส่งต่อให้ P1-F02-T08 (publish) — ไม่มีขั้นตอนใดใช้ credential ในโฟลเดอร์นี้

1. `tools/tiles/bin/build.sh` → exit `0` (ถ้าได้ `3` ใช้ `out/publish-ghpages/` ตาม runbook ทางสำรอง · `4` = หยุดถาม HUMAN)
2. `tools/tiles/bin/set-public-url.sh tools/tiles/out/publish "$TILES_PUBLIC_BASE_URL"`
3. T08 เพิ่ม `_headers` (tech note 7.5) และ `404.html` ลงใน `out/publish/` (นับอยู่ในงบแล้ว) แล้วตรวจงบซ้ำจาก `manifest.json` (`files.total_with_reserved` ≤ 16,000)
4. deploy ทั้งโฟลเดอร์ `out/publish/` เป็น Pages project แผนที่ (HUMAN P1-F02-T19)
5. สร้าง `VITE_TILES_URL=$TILES_PUBLIC_BASE_URL/tiles/<tileset_id>/tiles.json` จาก `manifest.json#tileset_id`

## 8. License และ attribution

| ของ | license | ไฟล์ที่ไปด้วย |
| --- | --- | --- |
| ข้อมูลแผนที่ (OSM ผ่าน Protomaps) | ODbL | `attribution` ใน `tiles.json` และ `manifest.json`: `© OpenStreetMap` (ลิงก์ `openstreetmap.org/copyright`) + `Protomaps` · client เปิด AttributionControl (TL-S13) |
| Noto Sans Thai | SIL OFL 1.1 | `glyphs/_faces/OFL-NotoSansThai.txt` (จาก zip ของ release ตรวจ sha256) |
| glyph PBF Noto Sans | SIL OFL 1.1 | `glyphs/OFL-NotoSans.txt` (จาก basemaps-assets) |
| sprite `v4/light` | MIT (มาจาก tangrams/icons ตาม README ของ basemaps-assets) | `sprites/LICENSE-sprites.txt` (ต้นฉบับใน `licenses/`) |

## 9. ทำงาน offline และขนาดที่ต้องดาวน์โหลด

- ครั้งแรกต้องใช้เน็ต (ไม่ต้องมีบัญชี): go-pmtiles 15.2 MB (macOS arm64) · basemaps-assets 6.4 MB · Noto Sans Thai 4.7 MB · `pmtiles extract` z15 ส่งข้อมูลจริง 75 MB → รวม ~101 MB · ใช้ดิสก์ ~93 MB (`downloads/`) + ~250 MB (`out/` เมื่อมีทั้ง z15, z14 และชุด publish)
- หลังจากนั้น `build.sh` และ `build-fixture.sh` รัน offline ได้ทั้งหมด (ใช้ไฟล์ใน `downloads/` และ `out/pmtiles/` · ตรวจ checksum ทุกครั้ง)
- ถ้าดาวน์โหลดไม่ได้: build ล้มพร้อมข้อความชี้ไปที่ HUMAN P1-F02-T25 (คนดาวน์โหลดไฟล์ตาม URL ใน `config.json` มาวางใน `tools/tiles/downloads/` ด้วยชื่อเดิม) · ทางสำรองสุดท้ายคือ planetiler + profile Protomaps (tech note 5.2)
