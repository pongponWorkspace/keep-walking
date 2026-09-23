# Tech note F02 — Tech Foundation และ Map/Location Spike

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted (เกณฑ์ spike รอ product-manager ร่วมยืนยันใน P1-F02-T27) |
| วันที่ | 2026-09-23 |
| task | P1-F02-T03 · ผู้เขียน tech-lead · แก้ไข P1-H01 (หัวข้อ 2, 3, 4, 8, 14 และเพิ่มหัวข้อ 15) |
| อ้างอิง | GDD "สถาปัตยกรรมเทคนิค" (แผนที่, โครงสร้างระบบ, สัญญาณขาดและแอปถูกปิด), "Movement gate", "Anti-cheat" ชั้น 1, "M1" · ADR 0001 · D-001, D-002, D-003, D-008 · plan review TL-M02..M06, TL-S05, TL-S07..S09, TL-S13, TL-N04 |
| สัญญาร่วม | `docs/tech/gps-trace-format.md` · `packages/shared/src/trace.ts` · `packages/shared/schemas/gps-trace.schema.json` · `packages/location/src/types.ts` |
| ผู้ build ตาม note นี้ | location-engineer (T04, T05, T06, T24), gameplay-programmer (T09, T10, T11), devops-engineer (T08), art-director (P1-F03-T12), qa-tester (T12, T13, T14), product-manager (T27) |

## 0. สรุปสิ่งที่ต้องรู้ก่อนอ่านต่อ

1. **พบข้อจำกัดใหม่ที่เปลี่ยนแผน tile:** Cloudflare Pages ตอบ HTTP range request ด้วย `200` และส่งทั้งไฟล์ ไม่ใช่ `206` (เอกสารทางการ + ทดสอบจริง หัวข้อ 7.2) · library `pmtiles` จะ error ทันทีเมื่อเจอแบบนี้ **จึงวาง PMTiles ไฟล์เดียวหรือแบ่งตามพื้นที่บน Pages ไม่ได้**
2. **ทางแก้ที่เลือก (ยังอยู่ใน D-008):** host ยังเป็น Cloudflare Pages Free แต่ publish tile เป็น **ไดเรกทอรี XYZ แบบ static** (`/{z}/{x}/{y}.mvt` + `tiles.json`) ที่แตกออกจาก PMTiles ที่ได้จาก `pmtiles extract` · ไม่ต้องใช้ range request · ขนาดต่อไฟล์เล็กมาก งบจึงเปลี่ยนจาก "ขนาดต่อไฟล์" เป็น "จำนวนไฟล์ต่อ deploy" (20,000) · วัดแล้ว bbox กรุงเทพฯ + 5 จังหวัดถึง z15 = 13,502 tile ผ่านงบ (หัวข้อ 7.4)
3. **PMTiles ยังเป็นรูปแบบหลักของ pipeline:** ใช้ใน local dev, fixture ของ test และ CI, ทางสำรอง GitHub Pages (ตอบ `206` ได้ วัดแล้ว) และ R2 ในอนาคตตาม GDD · client รองรับทั้งสองแบบผ่าน `VITE_TILES_URL` ค่าเดียว (หัวข้อ 8)
4. **ภาษาไทยบนแผนที่:** MapLibre GL JS 6.10 วาด grapheme cluster (พยัญชนะ + สระบน/ล่าง + วรรณยุกต์) ด้วย text engine ของ browser ผ่าน TinySDF และรองรับ style key `font-faces` · แผนหลักคือประกาศ Noto Sans Thai (ไฟล์ font ที่ host เอง) ใน `font-faces` สำหรับช่วง U+0E00–0E7F (หัวข้อ 6)
5. **เกณฑ์ spike ตั้งล่วงหน้าแล้ว** ในหัวข้อ 10 (ตารางเดียว) · ห้ามปรับหลังเห็นผล (TL-M04)

การเปลี่ยนจาก "แบ่ง PMTiles ตามพื้นที่ + manifest" เป็น "ไดเรกทอรี XYZ" กระทบ acceptance ของ P1-F02-T06, T08, T11 บน board · ส่งเป็น decision ให้ producer ปรับ board (ดูหัวข้อ 14)

## 1. ขอบเขต

spike ต้องตอบคำถาม M1 ของ GDD ให้เป็นตัวเลข: แผนที่ MapLibre + tile กรุงเทพฯ ลื่นบนมือถือจริงไหม, จุดตำแหน่งขยับตามจริงไหม, FPS / แบตต่อ 30 นาที / data / accuracy ในสวนและในซอยเป็นเท่าไร · บนทั้ง Android Chrome และ iOS Safari (D-003)

ไม่อยู่ในขอบเขต: dungeon polygon, check-in, tick, รางวัล, backend · ตัวเลขที่ HUD คำนวณ (ระยะสะสม, หน้าต่าง 5 นาที) เป็นค่าวัดเพื่อประเมิน GPS เท่านั้น ไม่ใช่รางวัล และไม่ส่งไป server (server authority ไม่ถูกแตะ)

## 2. โมดูลของ spike

```
apps/client/src/
  config/env.ts        อ่าน VITE_* ครั้งเดียว ตรวจรูปแบบ ล้มพร้อมข้อความชัดถ้าขาด
  config/runtime.ts    อ่าน config/app/client.json และ config/app/privacy.json (ADR 0001 3.10.1) ไม่ใช่ literal
  map/
    source.ts          resolveTileSource(VITE_TILES_URL) → pmtiles:// หรือ TileJSON (หัวข้อ 8)
    style.ts           โหลด style จาก art/direction/map-style/ แล้วแทน placeholder ของ source/glyphs/sprite/font-faces
    counting.ts        ตัวนับ byte: custom Source ของ pmtiles + protocol ห่อ fetch (หัวข้อ 11)
    marker.ts          จุดตำแหน่ง + วง accuracy + โหมดตามตัว
  location/
    select.ts          เลือก provider จาก URL/config (หัวข้อ 3)
    traces.ts          รายการ trace จาก import.meta.glob (gps-trace-format หัวข้อ 5)
  hud/                 debug HUD หลัง flag (FPS, MB, accuracy, แบต, sample ขาด, หน้าต่าง gate)
  export/              summary CSV (ค่าเริ่มต้น) + raw trace (opt-in) ตาม gps-trace-format หัวข้อ 4
packages/location/src/
  types.ts             interface (งานนี้)
  web/ mock/ capacitor/  implementation (P1-F02-T05)
packages/shared/src/trace.ts   LocationSample, validateTrace (งานนี้)
tools/tiles/           build tile + แตก XYZ + glyph/sprite/font + size report (P1-F02-T06)
infra/                 _headers, publish script, deploy-preview (P1-F02-T08)
```

- client เรียก location ผ่าน `LocationProvider` เท่านั้น · `navigator.geolocation` ปรากฏได้ที่ `packages/location/src/web/` ที่เดียว (tech gate ตรวจด้วย grep)
- `apps/*` และ `packages/*` ห้าม import จาก `tools/*` (lint บังคับแล้ว ADR 0001)

## 3. การเลือก provider ผ่าน URL/config

| query | ค่า | ผล |
| --- | --- | --- |
| `loc` | `web` (ค่าเริ่มต้นใน preview) · `mock` (ค่าเริ่มต้นใน dev) | provider ที่ใช้ |
| `trace` | `meta.id` เช่น `synthetic-park-loop-01` | trace สำหรับ Mock · ไม่ระบุ = ตัวแรกในรายการ |
| `speed` | `1` · `10` · `60` | ความเร็วเล่น Mock |
| `loop` | `1` · `0` | เล่นวน |
| `hud` | `1` | เปิด debug HUD |

- ชื่อ query, ค่าที่อนุญาต และค่าเริ่มต้นต่อ environment อยู่ใน `config/app/client.json#providerQuery` และ `#providerQueryDefaultsByMode` (key ตาม `import.meta.env.MODE`) ไม่ใช่ literal ในโค้ด · ค่าที่ไม่รู้จัก → ใช้ค่าเริ่มต้นและเตือนใน console (ไม่ crash)
- `capacitor` เลือกได้ แต่ stub คืน error `not-implemented` (ทดสอบ path error)

## 4. Location contract

รายละเอียดอยู่ในโค้ด (`packages/location/src/types.ts`, `packages/shared/src/trace.ts`) · หัวข้อนี้สรุปพฤติกรรมที่ implementation ทุกตัวต้องมี

| เรื่อง | กติกา |
| --- | --- |
| type ของ sample | `LocationSample { timestamp, lat, lng, accuracy, speed?, heading? }` อยู่ใน `packages/shared` (ไม่มี DOM) และ `packages/location` re-export · server ใน Phase 3 ใช้ type เดียวกัน |
| `timestamp` | เวลาของ fix (ms epoch) จาก `GeolocationPosition.timestamp` ไม่ใช่เวลาที่ได้รับ · Mock = เวลาเริ่มเล่นจาก `Clock` + `t` |
| ลำดับ | ส่ง sample ตามลำดับ `timestamp` · Web ทิ้ง fix ที่ `timestamp` ไม่เพิ่มขึ้น (browser บางตัวส่ง cache ซ้ำ) |
| start/stop | `start()` เรียกจาก user gesture · resolve เมื่อเข้า `running`, `suspended` หรือ `error` ไม่ reject · `stop()` idempotent และปล่อย `watchPosition` |
| permission | `getPermission()` ไม่เด้ง prompt · ใช้ Permissions API เมื่อมี · iOS Safari ที่ไม่มีให้คืน `unknown` จนกว่า `start()` จะได้ผล |
| error | `permission-denied` (fatal) · `position-unavailable`, `timeout` (ไม่ fatal ลองต่อ) · `unsupported`, `not-implemented` (fatal) · ข้อความเป็นภาษาอังกฤษสำหรับ dev · UI ใช้ key `gps.*` (P1-F03-T16) |
| visibility | หน้าถูกซ่อน (`visibilitychange` → hidden, จอล็อก, สลับแท็บ) → state `suspended`, ไม่ส่งและไม่เก็บ sample · กลับมา visible → `running` · ไม่นับช่วงที่ซ่อน (GDD "ล็อกหน้าจอ") |
| clock | ทุกการรอผ่าน `Clock` ที่ฉีดได้ · test ใช้ fake clock เล่น trace 30 นาทีในไม่กี่ ms (P1-F02-T05) |
| ค่า Web | `config/app/client.json#locationWeb.enableHighAccuracy`, `#locationWeb.timeout_ms`, `#locationWeb.maximumAge_ms` (ค่าในไฟล์ `true`, 15000, 0) ส่งเป็น `PositionOptions { enableHighAccuracy, timeout, maximumAge }` ภายใน `packages/location/src/web/` เท่านั้น · ชื่อ `timeoutMs`/`maximumAgeMs` ของฉบับแรกเลิกใช้ (convention suffix `_ms` ADR 0001 3.10.3) |
| log | ห้าม log พิกัดดิบในระดับ production · debug log พิกัดได้เฉพาะหลัง flag `hud=1` บนเครื่อง |
| Mock | เล่นตามเวลา × `speed` (1, 10, 60), pause/resume/seek/loop, เล่น `events` ของ trace (ซ่อนหน้า, error) · รับเฉพาะ trace ที่ผ่าน `validateTrace` |
| Capacitor | stub ที่ implement interface ครบ · `start()` ส่ง error `not-implemented` ("not implemented until Phase 8") และเข้า `error` |

## 5. Tile schema และการได้ tile (TL-M02)

### 5.1 สิ่งที่ pin

| รายการ | ค่าที่ pin (2026-09-23) | หลักฐาน |
| --- | --- | --- |
| tile schema | **Protomaps Basemap v4** · build `20260923.pmtiles` ที่ metadata `version = 4.15.2` · `tile type: mvt`, `tile compression: gzip`, zoom 0–15 | `pmtiles show https://build.protomaps.com/20260923.pmtiles` (รันแล้ว) · รายการ build: `https://build-metadata.protomaps.dev/builds.json` |
| style package | `@protomaps/basemaps` **5.7.2** (latest บน npm 2026-03-10) · docs ระบุ build v4 ใช้กับ style v4.0.0 ขึ้นไป | `https://docs.protomaps.com/basemaps/downloads` |
| CLI | `go-pmtiles` **v1.31.2** (2026-07-22) · binary ตาม OS pin checksum ใน `tools/tiles/README.md` | `https://github.com/protomaps/go-pmtiles/releases/tag/v1.31.2` |
| assets | `protomaps/basemaps-assets`: glyph `fonts/{Noto Sans Regular, Noto Sans Medium, Noto Sans Italic}` (256 ไฟล์ต่อ fontstack) · sprite `sprites/v4/light` (+ `@2x`) | GitHub contents API ของ repo นั้น |

- การเลือก build: ใช้ build ล่าสุดของ patch version ที่ pin (bucket เก็บ build ล่าสุดของทุก patch version ถาวร) · เปลี่ยน build = เปลี่ยน `tileset_id` และบันทึกใน size report
- ห้ามผสม schema: style ของ P1-F03-T12 เริ่มจาก `@protomaps/basemaps` 5.7.2 flavor `light` แล้วปรับสี · ห้ามใช้ style แบบ OpenMapTiles

### 5.2 ขอบเขตพื้นที่และคำสั่ง

- bbox กรุงเทพฯ + นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร นครปฐม: `99.80,13.40,101.00,14.35` (min_lon,min_lat,max_lon,max_lat) · [ASSUMPTION A-P1-F02-T03-2: ค่าประมาณจากขอบจังหวัด ครอบทั้ง 6 จังหวัดพร้อมขอบเผื่อ · location-engineer ยืนยันกับ polygon ขอบเขตปกครองใน T06 และใช้ `--region=<geojson>` แทนได้ถ้าลดจำนวน tile]
- คำสั่งหลัก (ไม่ต้องใช้บัญชีหรือ credential):

```
pmtiles extract https://build.protomaps.com/20260923.pmtiles tools/tiles/out/bkk-pm4-20260923-z15.pmtiles \
  --bbox=99.80,13.40,101.00,14.35 --maxzoom=15
```

- ผล dry-run ที่วัดแล้ว (`--dry-run`, 2026-09-23):

| maxzoom | tile ในพื้นที่ | tile entry หลัง dedup | ขนาด PMTiles |
| --- | --- | --- | --- |
| 15 | 13,502 | 12,713 | 72 MB |
| 14 | 3,492 | 3,337 | 37 MB |
| 13 | 962 | 932 | 19 MB |

- ทางสำรอง: planetiler ด้วย profile ของ Protomaps (`tiles/` ใน repo `protomaps/basemaps` ที่ commit ซึ่ง `version()` = 4.15.2) จาก extract ประเทศไทยของ Geofabrik · ใช้เมื่อ build.protomaps.com ใช้ไม่ได้เท่านั้น · ห้ามใช้ planetiler-openmaptiles
- attribution: TileJSON และ style ต้องมี `© OpenStreetMap` (ลิงก์ `https://www.openstreetmap.org/copyright`) และ `Protomaps` · client เปิด `AttributionControl` (TL-S13)

## 6. Glyph, sprite และภาษาไทย (TL-M03)

### 6.1 วิธีที่ MapLibre 6.10 วาดข้อความ (ตรวจจาก source ใน `node_modules/maplibre-gl/src/render/glyph_manager.ts`)

- ตัวอักษรเดี่ยว (1 codepoint): ถ้ามี `font-faces` ที่ครอบ codepoint นั้น → วาดจากไฟล์ font ด้วย TinySDF · ไม่งั้นโหลดจาก URL `glyphs` (PBF ช่วงละ 256 codepoint)
- **grapheme cluster** (เช่น "กี่" = ก + ี + ่): URL `glyphs` ส่งเป็นรูปรวมไม่ได้ จึงวาดทั้ง cluster ด้วย text engine ของ browser (TinySDF บน canvas) ซึ่งวางสระบน/ล่างและวรรณยุกต์ถูกตำแหน่ง · ใช้ไฟล์จาก `font-faces` ถ้ามี ไม่งั้นใช้ font ในเครื่อง
- ความเสี่ยงที่เหลือ: ตัวเดี่ยวจาก PBF กับ cluster จาก canvas อาจ baseline ไม่ตรงกัน (MapLibre ปรับด้วยค่าประมาณ) และ font ในเครื่องต่างกันระหว่าง Android กับ iOS → **แก้ด้วยการให้ช่วงไทยทั้งหมดวาดจากไฟล์ font เดียวกันผ่าน `font-faces`**
- Protomaps build มี pre-shaped glyph (`pgf`) เฉพาะ Devanagari ไม่มีไทย (`pmtiles show` ของ build) จึงไม่ใช้ทางนั้น

### 6.2 font stack และไฟล์

| ใช้กับ | ค่า |
| --- | --- |
| `text-font` ใน style | ใช้ชื่อ fontstack ของ Protomaps ตามเดิม: `Noto Sans Regular`, `Noto Sans Medium`, `Noto Sans Italic` |
| Latin และสัญลักษณ์ | glyph PBF จาก `basemaps-assets/fonts/<fontstack>/<range>.pbf` |
| ไทย U+0E00–0E7F | `font-faces` ใน style: `Noto Sans Regular` → `NotoSansThai-Regular.ttf`, `Noto Sans Medium` → `NotoSansThai-Medium.ttf`, `Noto Sans Italic` → `NotoSansThai-Regular.ttf` (ไทยไม่มีตัวเอียง) · แต่ละรายการระบุ `"unicode-range": ["U+0E00-0E7F"]` |
| ที่มาของ font | Noto Sans Thai จาก `notofonts/thai` (OFL-1.1) · pin release และ checksum ใน `tools/tiles/README.md` · host เอง ห้ามชี้ CDN ภายนอก (TL-M03) |
| ชื่อภาษาบนแผนที่ | style จาก `@protomaps/basemaps` ตั้ง `lang: "th"` (ชื่อไทยก่อน fallback เป็น `name`) · art-director ยืนยันใน P1-F03-T12 |

### 6.3 path บน host (ทุกงานอ้างชุดนี้)

ราก = `TILES_PUBLIC_BASE_URL` (หัวข้อ 8) · ในเครื่อง = `tools/tiles/out/publish/`

```
<root>/
  tiles/<tileset_id>/tiles.json            TileJSON 3.0 (bounds, minzoom 0, maxzoom, attribution, vector_layers)
  tiles/<tileset_id>/{z}/{x}/{y}.mvt       MVT ไม่บีบอัด (Cloudflare บีบอัดตอนส่ง)
  pmtiles/<tileset_id>.pmtiles             สำหรับ local/GitHub Pages สำรอง/R2 เท่านั้น (ไม่ publish ขึ้น Pages)
  glyphs/<fontstack>/<start>-<end>.pbf      เช่น glyphs/Noto Sans Regular/0-255.pbf
  glyphs/_faces/NotoSansThai-Regular.ttf    ไฟล์ของ font-faces
  glyphs/_faces/NotoSansThai-Medium.ttf
  sprites/v4/light.json, light.png, light@2x.json, light@2x.png
  manifest.json                            tileset_id, schema version, build key, bbox, maxzoom, จำนวนไฟล์, ขนาดรวม, วันที่
```

- `tileset_id` = `pm4-<build yyyymmdd>-z<maxzoom>` เช่น `pm4-20260923-z15` · URL ใหม่ทุกครั้งที่เปลี่ยน build ทำให้ตั้ง cache ยาวได้
- ที่อยู่ของ font-faces ได้จาก `VITE_GLYPHS_URL` โดยแทน `{fontstack}/{range}.pbf` ด้วย `_faces/<ไฟล์>` (ไม่เพิ่ม env ใหม่)
- P1-F02-T06 สร้างชุดนี้ · P1-F03-T12 อ้างใน style ด้วย placeholder · P1-F02-T11 โหลด · P1-F02-T08 publish

## 7. Host ของ tile และ preview (D-001, D-008)

### 7.1 ตารางเพดาน (ตรวจ 2026-09-23)

| รายการ | Cloudflare Pages Free (host หลัก) | Workers static assets Free | GitHub Pages (สำรองชั่วคราว) |
| --- | --- | --- | --- |
| ขนาดต่อไฟล์ | 25 MiB | 25 MiB | repo บล็อกไฟล์ > 100 MiB · การ deploy ผ่าน Actions artifact ไม่ระบุเพดานต่อไฟล์แยก (T08 ตรวจ) |
| จำนวนไฟล์ | 20,000 ต่อ site | 20,000 ต่อ Worker version | ไม่ระบุ |
| ขนาด site รวม | ไม่ระบุ (ผูกกับจำนวน × ขนาดไฟล์) | ไม่ระบุ | ≤ 1 GB |
| bandwidth / request | static request ฟรีไม่จำกัด (ไม่นับ Functions) | static request ฟรีไม่จำกัด | soft limit 100 GB/เดือน |
| deploy | 500 build/เดือน (Git integration) · preview ไม่จำกัด | ตาม Workers | timeout 10 นาที/deploy · 10 build/ชม. (ไม่นับเมื่อใช้ Actions) |
| ตั้ง `Cache-Control`, CORS, `Content-Type` เอง | ได้ ผ่าน `_headers` (สูงสุด 100 rule, 2,000 ตัวอักษร/บรรทัด) | ได้ ผ่าน `_headers` | ไม่ได้ (`cache-control: max-age=600` คงที่) · ส่ง `access-control-allow-origin: *` เอง |
| HTTP range → `206` | **ไม่ได้: ตอบ `200` ทั้งไฟล์** | ไม่พบเอกสารว่าได้ · ทดสอบ `developers.cloudflare.com` ได้ `200` | **ได้** |
| HTTPS | อัตโนมัติ `*.pages.dev` | อัตโนมัติ `*.workers.dev` | อัตโนมัติ `*.github.io` |
| เงื่อนไขอื่น | บัตร: ไม่ต้อง (D-008) | เช่นเดียวกัน | ห้ามใช้เป็น host ของธุรกิจเชิงพาณิชย์ (ToS) → ใช้ช่วง spike เท่านั้น |

แหล่งอ้างอิง (เปิดอ่าน 2026-09-23):
- `https://developers.cloudflare.com/pages/platform/limits/` (อัปเดต 2026-09-05): 20,000 files, 25 MiB, `_headers` 100 rules
- `https://developers.cloudflare.com/pages/configuration/serving-pages/`: "Pages currently returns `200` responses for HTTP range requests; however, the team is working on adding spec-compliant `206` partial responses."
- `https://developers.cloudflare.com/pages/functions/pricing/`: static asset requests free and unlimited
- `https://developers.cloudflare.com/pages/configuration/headers/`: CORS และ `Cache-Control` ผ่าน `_headers`
- `https://developers.cloudflare.com/workers/platform/limits/` หัวข้อ Static Assets และ `https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/`
- `https://developers.cloudflare.com/speed/optimization/content/compression/`: บีบอัด `application/x-protobuf` ให้อัตโนมัติ
- `https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits` และ `.../about-large-files-on-github`

### 7.2 หลักฐาน range request และวิธีพิสูจน์ซ้ำ

คำสั่งที่ใช้ (ส่ง `Range` และขอไม่บีบอัดเพื่อให้เห็นขนาดจริง):

```
curl -sS -o /dev/null -D - -H "Range: bytes=0-99" -H "Accept-Encoding: identity" <URL>
```

| URL (ไฟล์สาธารณะ) | host | ผล 2026-09-23 |
| --- | --- | --- |
| `https://astro-docs.pages.dev/favicon.svg` | Cloudflare Pages | `HTTP/2 200` · `content-length: 749` (ทั้งไฟล์) · ไม่มี `content-range` |
| `https://developers.cloudflare.com/og-docs.png` | Cloudflare | `HTTP/2 200` · `content-length: 917439` (ทั้งไฟล์) |
| `https://pmtiles.io/` | GitHub Pages | `HTTP/2 206` · `content-range: bytes 0-99/880` · `content-length: 100` · `access-control-allow-origin: *` |

ผลต่อ `pmtiles` 4.5.0 (`node_modules/pmtiles/src/index.ts` บรรทัด 459–465): ถ้าได้ `200` และ `content-length` มากกว่าที่ขอ จะ throw "Server returned no content-length header or content-length exceeding request. Check that your storage backend supports HTTP Byte Serving." → แผนที่ไม่ขึ้น

วิธีพิสูจน์ใน T08 / T19 (ทุก URL ที่ publish จริง):
1. XYZ บน Pages: `curl -sS -o /dev/null -D - <root>/tiles/<tileset_id>/14/12765/7560.mvt` ต้องได้ `200`, `content-type: application/x-protobuf`, `access-control-allow-origin`, `timing-allow-origin` และเมื่อส่ง `Accept-Encoding: gzip, br` ต้องได้ `content-encoding`
2. ถ้าใช้ทางสำรอง PMTiles (GitHub Pages): คำสั่งด้านบนกับไฟล์ `.pmtiles` ต้องได้ `206` และ `content-range: bytes 0-99/<ขนาด>`
3. ทุกครั้งที่ Cloudflare ประกาศว่ารองรับ `206` แล้ว ให้รันข้อ 2 กับไฟล์ทดสอบบน Pages · ถ้าได้ `206` เปิดทางเลือก PMTiles บน Pages ใหม่ได้ (ไม่ต้องเปลี่ยนโค้ด client)

### 7.3 การตัดสินใจและลำดับทางแก้ (แทนลำดับเดิมใน board)

ทางที่พิจารณา:

| ทาง | ผล | เหตุผล |
| --- | --- | --- |
| ก. PMTiles แบ่งตามพื้นที่บน Pages + manifest (แผนเดิม) | ตัด | ต้องใช้ `206` ซึ่ง Pages ไม่ให้ · แบ่งไฟล์กี่ชิ้นก็ไม่ช่วย |
| ข. Worker (Free) ตัด byte range จาก static asset | ตัด | ต้องอ่านไฟล์สูงสุด 25 MiB ต่อ request ภายใต้ CPU 10 ms และทุก tile กินโควตา 100,000 request/วัน ของ Free |
| ค. **ไดเรกทอรี XYZ static บน Pages** | **เลือก** | ไม่ต้องใช้ range · request static ฟรีไม่จำกัด · Cloudflare cache และบีบอัดให้ต่อ tile · MapLibre รองรับในตัวผ่าน TileJSON · 13,502 ไฟล์ที่ z15 ผ่านเพดาน 20,000 |
| ง. PMTiles ไฟล์เดียวบน GitHub Pages | สำรองชั่วคราว | `206` ได้, 72 MB < 1 GB · แต่ Cache-Control ตั้งไม่ได้และ ToS ไม่ให้ใช้เชิงพาณิชย์ (ตาม D-008) |
| จ. PMTiles บน R2 | ระยะยาว | ตรงกับ GDD แต่ต้องผูกช่องทางชำระเงิน → รอคนอนุมัติ (D-001) |

ลำดับทางแก้ที่ P1-F02-T06 และ T08 ใช้:
1. **XYZ maxzoom 15 บน Cloudflare Pages** (project แยกสำหรับแผนที่ หัวข้อ 7.5) · ต้องผ่านงบจำนวนไฟล์ในหัวข้อ 7.4
2. ถ้าเกินงบ → **ลด maxzoom เป็น 14** (3,492 tile) และให้ client overzoom ถึง 18 (vector tile ขยายได้โดยไม่แตก แต่รายละเอียดเล็กเช่นทางเท้าบางเส้นหายไป)
3. ถ้ายังไม่ผ่าน หรือ XYZ ใช้ไม่ได้ด้วยเหตุอื่น → **GitHub Pages ชั่วคราว** ด้วย PMTiles ไฟล์เดียว (หรือ XYZ) และบันทึกใน size report
4. ถ้าไม่ผ่านทั้งหมด → หยุด รายงาน PARTIAL พร้อมคำถาม HUMAN · ห้ามเปลี่ยนไป host เสียเงินเอง

### 7.4 งบของ tile (สิ่งที่ P1-F02-T06 ต้องผ่าน)

| งบ | ค่า | ที่มา |
| --- | --- | --- |
| จำนวนไฟล์รวมต่อ deploy ของ project แผนที่ | ≤ 20,000 (เพดาน) · **เป้า ≤ 16,000** เผื่อ 20% | Pages limits |
| tile XYZ | ≤ 15,000 ไฟล์ | ที่เหลือ ≤ 1,000 สำหรับ glyph (3 × 256 = 768), font-faces, sprite, TileJSON, manifest, `_headers` |
| ขนาดต่อไฟล์ | ≤ 25 MiB (เพดาน) · tile ใหญ่สุดที่คาด < 1 MB | Pages limits · T06 รายงาน tile ใหญ่สุดจริง |
| ขนาดรวม | ไม่มีเพดาน · รายงานไว้เพื่อประเมิน R2 | size report |
| ค่าที่วัดแล้ว | z15: 13,502 tile (ผ่าน) · z14: 3,492 | dry-run หัวข้อ 5.2 |

ค่าเพดาน 20,000 / 25 MiB, เป้า 16,000 / 15,000, bbox และ maxzoom อยู่ในไฟล์ config ของ script ใน `tools/tiles/` · script ล้มพร้อมข้อความชัดเมื่อเกิน · project client แยกจาก project แผนที่ จึงไม่แบ่งงบจำนวนไฟล์กัน

### 7.5 การตั้งค่า host

- **สอง Pages project ในบัญชีเดียว:** `keep-walking-preview` (client) และ `keep-walking-map` (tile, glyph, font, sprite) · ชื่อจริงยืนยันใน T08 · แยกเพื่อให้งบไฟล์ไม่ชนกันและเลียนแบบ bucket R2 ในอนาคต (เปลี่ยนแค่ base URL)
- `_headers` ของ project แผนที่ (T08 เขียน):
  - `/tiles/*`: `Content-Type: application/x-protobuf` · `Cache-Control: public, max-age=31536000, immutable` (URL มี `tileset_id` จึงไม่ต้อง revalidate)
  - `/glyphs/*.pbf`: `Content-Type: application/x-protobuf` · `/glyphs/_faces/*`: `Content-Type: font/ttf` · cache 1 ปี immutable เช่นกัน
  - `/tiles/*/tiles.json`, `/manifest.json`: `Cache-Control: public, max-age=300`
  - ทุก path: `Access-Control-Allow-Origin: *` (ข้อมูลสาธารณะ ODbL) · `Timing-Allow-Origin: *` (ให้ Resource Timing อ่านขนาดได้ หัวข้อ 11) · `X-Robots-Tag: noindex`
- tile ไม่ถูก commit · workflow publish สร้างหรือดึง tile ตอน deploy (T08)

### 7.6 ทางขยาย: PMTiles บน R2 ตาม GDD

- อยู่ในบัญชี Cloudflare เดิม เมื่อคนอนุมัติค่าใช้จ่ายและการผูกช่องทางชำระเงิน (decision แยก ตาม D-001) · R2 ไม่มีเพดานต่อไฟล์แบบ Pages และตอบ `206` · เปลี่ยน `VITE_TILES_URL` เป็น `pmtiles://https://<r2-domain>/<tileset_id>.pmtiles` และเปลี่ยน target ของ publish script · ไม่แตะโค้ด client

## 8. Env และ config (TL-S05)

| ชื่อ | ใช้ที่ | ค่า | ตัวอย่าง preview |
| --- | --- | --- | --- |
| `TILES_PUBLIC_BASE_URL` | publish script (T08), build ของ client ใน workflow | ราก URL ของ project แผนที่ ไม่มี `/` ท้าย | `https://keep-walking-map.pages.dev` |
| `VITE_TILES_URL` | client | TileJSON URL **หรือ** `pmtiles://<URL ของไฟล์ .pmtiles>` | `${TILES_PUBLIC_BASE_URL}/tiles/pm4-20260923-z15/tiles.json` |
| `VITE_GLYPHS_URL` | client | template ของ MapLibre ต้องมี `{fontstack}` และ `{range}` | `${TILES_PUBLIC_BASE_URL}/glyphs/{fontstack}/{range}.pbf` |
| `VITE_SPRITE_URL` | client | ฐานของ sprite ไม่มีนามสกุล (MapLibre เติม `.json`/`.png`/`@2x`) | `${TILES_PUBLIC_BASE_URL}/sprites/v4/light` |

- workflow สร้าง `VITE_*` จาก `TILES_PUBLIC_BASE_URL` + `tileset_id` ใน `manifest.json` ก่อน build client · ไม่มีชื่อ env ที่ผูกกับ R2 · ไม่มี secret ในสี่ตัวนี้
- กฎของ client (`map/source.ts`):
  - ค่าขึ้นต้น `pmtiles://` → ลงทะเบียน `pmtiles.Protocol` (ผ่าน Source ที่นับ byte หัวข้อ 11) แล้วใช้เป็น `source.url`
  - ค่าลงท้าย `.json` → ใช้เป็น `source.url` (TileJSON) · MapLibre อ่าน `bounds`, `maxzoom` และไม่ขอ tile นอก bounds
  - รูปแบบอื่น → error ของ dev ที่บอกชื่อ env และรูปแบบที่รับ
  - ทั้งสองแบบใช้ `source-layer` ชุดเดียวกัน (schema Protomaps v4) style จึงไม่ต้องรู้ว่าเป็นแบบไหน · maxzoom ของ source มาจาก TileJSON/PMTiles header · style ตั้ง `maxzoom` ของแผนที่ 18 เพื่อ overzoom
- `.env.example` มีสี่ชื่อนี้แบบไม่มีค่า (P1-F02-T07) และ `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (P1-F02-T08)
- **ค่าชั่วคราวใน `apps/client/.env.example` (ตัดสินใน P1-H01):** ทั้งสามตัว `VITE_*` **ว่าง** · ทางเลือกเขียนเป็น comment เท่านั้น เหตุผล:
  1. ค่าที่ใส่อยู่ `https://build.protomaps.com/20230925.pmtiles` เป็น basemap **schema v3** (อ่าน metadata ของไฟล์ 2026-09-23: layer `natural`, `physical_line`, `physical_point`, `transit`, planetiler 0.6) แต่ `art/direction/map-style/kw-light.style.json` เขียนตาม schema v4 · ชื่อ layer และค่า `kind` ไม่ตรง แผนที่จะวาดไม่ครบโดยไม่มี error
  2. build ที่ออกไปเดินทดสอบห้ามชี้ host ภายนอก (หัวข้อ 9) · ค่าว่างทำให้ client แสดงสถานะ "ยังไม่ได้ตั้งค่า" ตามที่ `env.ts` รองรับอยู่แล้ว แทนการได้แผนที่ผิด schema แบบเงียบ
  3. ตรงกับ ADR 0001 3.1 (`.env.example` ไม่มีค่า)
- comment ใน `.env.example` เรียงตามลำดับที่ใช้: (ก) หลัง T06 → fixture ในเครื่อง `pmtiles://http://localhost:5173/map/fixture.pmtiles` หรือ `tiles.json` ของ `tools/tiles/out/publish/` · (ข) ก่อน T06 สำหรับ dev เท่านั้น → daily build ของ Protomaps ที่เป็น v4 `https://build.protomaps.com/<YYYYMMDD>.pmtiles` (ตรวจ 2026-09-23: build ล่าสุด 4.15.2 · เก็บไว้ราว 62 build แล้วลบ จึงห้าม pin วันที่ใน repo) · glyph/sprite: path ของหัวข้อ 6.3 หรือ `protomaps.github.io/basemaps-assets` สำหรับ dev เท่านั้น

## 9. การโหลด tile แยกตาม environment

| environment | tile | glyph / sprite / font | ค่า `VITE_TILES_URL` |
| --- | --- | --- | --- |
| unit / e2e / CI | fixture PMTiles ≤ 2 MB ใน `tools/tiles/fixtures/` (สวนลุมพินี z ≤ 16, T06, TL-S08) · e2e ห้ามดาวน์โหลดจากเน็ต | ชุดเล็กใน fixture | `pmtiles://http://localhost:4173/map/fixture.pmtiles` (dev server เสิร์ฟ fixture) |
| local dev | `tools/tiles/out/publish/pmtiles/<tileset_id>.pmtiles` หรือ XYZ ใน `tools/tiles/out/publish/tiles/` | `tools/tiles/out/publish/` | `pmtiles://...` (Vite/sirv ตอบ `206` ได้) หรือ TileJSON ผ่าน static server ใดก็ได้ |
| preview (Cloudflare Pages) | XYZ บน project แผนที่ | project แผนที่ | TileJSON URL (หัวข้อ 8) |
| สำรอง (GitHub Pages) | PMTiles ไฟล์เดียว | site เดียวกัน | `pmtiles://https://<owner>.github.io/<repo>/pmtiles/<tileset_id>.pmtiles` |
| อนาคต (R2) | PMTiles ไฟล์เดียว | bucket เดียวกัน | `pmtiles://https://<r2-domain>/<tileset_id>.pmtiles` |

- Protomaps demo ใช้ได้ชั่วคราวใน T09 ก่อนมี fixture ของ T06 เท่านั้น (TL-S08) · build ที่ออกไปเดินทดสอบต้องไม่ชี้ host ภายนอก
- วิธีแตก XYZ จาก PMTiles (T06 เลือก 1 ทาง บันทึกใน README):
  - ทาง shell (ตาม ADR 0001 หัวข้อ 3.11): วน z/x/y ใน bbox ตาม maxzoom เรียก `pmtiles tile <archive> z x y > z/x/y.mvt` · ถ้า output เป็น gzip (ขึ้นต้นด้วย byte `1f 8b`) ให้ gunzip · tile ที่ไม่มีใน archive ไม่ต้องสร้างไฟล์ (MapLibre 6.10 `vector_tile_source.ts` บรรทัด 253 ไม่ถือ 404 เป็น error) · project แผนที่ต้องมี `404.html` ที่ราก มิฉะนั้น Pages จะถือเป็น SPA และตอบ `index.html` ด้วย `200` แทน 404
  - ทาง Node: script TS ที่ใช้ library `pmtiles` (มีใน `apps/client` แล้ว) กับ Source ที่อ่านไฟล์ในเครื่อง · ต้องขอ workspace `tools/tiles` ผ่านงาน tech-lead ก่อน (ADR 0001 หัวข้อ 3.3)
  - เก็บ tile แบบไม่บีบอัด เพราะ `_headers` ของ Pages ตั้ง `Content-Encoding` ให้ไฟล์ gzip ล่วงหน้าไม่ได้อย่างน่าเชื่อถือ และ Cloudflare บีบอัด `application/x-protobuf` ให้เองตอนส่ง

## 10. เกณฑ์ spike (ตั้งก่อนวัด · TL-M04, PM-M01)

ตั้งเมื่อ 2026-09-23 ก่อนมี build หน้าวัดและก่อนเดินจริง · product-manager ร่วมยืนยันใน P1-F02-T27 · QA คัดลอกลง form (T14) · T21 เทียบกับตารางนี้เท่านั้น ห้ามปรับหลังเห็นผล · ใช้เกณฑ์เดียวกันทั้ง **Android Chrome และ iOS Safari** และตัดสินแยกต่อเครื่องต่อสถานที่

### 10.1 ตารางเกณฑ์

| # | ตัวชี้วัด (segment `screen_on`) | Go | Go พร้อมเงื่อนไข | No-go | ประเภท |
| --- | --- | --- | --- | --- | --- |
| S1 | FPS ระหว่าง pan/zoom (เฉลี่ย / p5) | ≥ 50 และ ≥ 30 | เฉลี่ย 30 ถึง < 50 หรือ p5 20 ถึง < 30 | เฉลี่ย < 30 หรือ p5 < 20 | เด็ดขาด |
| S2 | FPS โหมดตามตัว (เฉลี่ย / p5) | ≥ 50 และ ≥ 30 | เฉลี่ย 30 ถึง < 50 หรือ p5 20 ถึง < 30 | เฉลี่ย < 30 หรือ p5 < 20 | เด็ดขาด |
| S3 | แบตที่ใช้ต่อ 30 นาที จอเปิดตลอด | ≤ 10% | > 10% ถึง 15% | > 15% | เด็ดขาด |
| S4 | เวลาจนแผนที่แรกขึ้น (cache ว่าง, เน็ตมือถือ) | ≤ 3 วินาที | > 3 ถึง 6 วินาที | > 6 วินาที | มีทางเลือก |
| S5 | MB ของ JS (cache ว่าง) | ≤ 1.0 | > 1.0 ถึง 2.0 | > 2.0 | มีทางเลือก |
| S6 | MB ของ style + glyph + sprite + font (cache ว่าง) | ≤ 1.0 | > 1.0 ถึง 3.0 | > 3.0 | มีทางเลือก |
| S7 | MB ของ tile ใน 30 นาทีที่เดิน (เริ่มจาก cache ว่าง) | ≤ 10 | > 10 ถึง 25 | > 25 | มีทางเลือก |
| S8 | MB รวมใน 30 นาที (S5 + S6 + S7) | ≤ 12 | > 12 ถึง 30 | > 30 | เด็ดขาด |
| S9 | accuracy ในสวน (median / p90) | ≤ 10 ม. และ ≤ 20 ม. | median ≤ 15 ม. และ p90 ≤ 30 ม. | median > 15 ม. หรือ p90 > 30 ม. | เด็ดขาด |
| S10 | accuracy ในซอย (median / p90) | ≤ 20 ม. และ ≤ 35 ม. | median ≤ 30 ม. และ p90 ≤ 50 ม. | median > 30 ม. หรือ p90 > 50 ม. | มีทางเลือก |
| S11 | เวลาจน fix แรกที่ accuracy ≤ 30 ม. ในสวน | ≤ 15 วินาที | > 15 ถึง 45 วินาที | > 45 วินาที | มีทางเลือก |
| S12 | % หน้าต่าง 5 นาทีที่ผ่าน movement gate ขณะเดินต่อเนื่องในสวน | ≥ 95% | 85% ถึง < 95% | < 85% | เด็ดขาด |
| S13 | sample ขาด > 10 วินาที (% ของเวลา) | ≤ 2% | > 2% ถึง 5% | > 5% | มีทางเลือก |
| S14 | ช่วงห่างระหว่าง fix (median) | ≤ 2 วินาที | > 2 ถึง 5 วินาที | > 5 วินาที | มีทางเลือก |
| S15 | ความหน่วงของจุด: เวลาที่จุดขยับ − เวลา fix (median / p90) | ≤ 1.5 และ ≤ 3 วินาที | median ≤ 3 และ p90 ≤ 5 วินาที | เกินกว่านั้น | มีทางเลือก |
| S16 | ป้ายภาษาไทย 20 ป้ายจาก zoom 14 / 16 / 18 ที่สระหรือวรรณยุกต์ผิดตำแหน่ง ทับกัน หรือเป็นกล่อง | 0 ป้าย | 1–2 ป้ายและยังอ่านออกทุกป้าย | ≥ 3 ป้าย หรือมีป้ายที่อ่านไม่ออก | มีทางเลือก |
| S17 | อ่านแผนที่และจุดตำแหน่งกลางแดด (ความสว่างอัตโนมัติ) | อ่านได้ทันที | อ่านได้เมื่อบังแดดหรือเร่งความสว่างเอง | อ่านไม่ได้แม้บังแดด | มีทางเลือก |
| I1 | ระยะสะสมปลอมจาก jitter ใน 5 นาทีที่ยืนนิ่ง (segment `stationary`) | บันทึกค่าเทียบ 50 ม. | — | — | ข้อมูลประกอบ Phase 2 |
| I2 | sample ขาดขณะมือถืออยู่ในกระเป๋า (segment `pocket`) | บันทึกค่า | — | — | ข้อมูลประกอบ |

### 10.2 กฎรวมผล

1. ตัดสินแยกต่อเครื่อง (Android Chrome, iOS Safari) ต่อสถานที่ (สวน, ซอย) · S9, S11, S12 ใช้ข้อมูลสวน · S10 ใช้ข้อมูลซอย · ที่เหลือใช้ทั้งสองแล้วเอาค่าที่แย่กว่า
2. ผลต่อเครื่อง: **No-go** ถ้าตัวชี้วัด "เด็ดขาด" ใดเป็น No-go · **Go พร้อมเงื่อนไข** ถ้ามีตัวใดอยู่ช่วงเงื่อนไข หรือตัว "มีทางเลือก" เป็น No-go (ทางเลือกในหัวข้อ 12 กลายเป็นเงื่อนไขบังคับ) · **Go** เมื่อทุกตัวเป็น Go · I1, I2 ไม่นับ
3. ผลของ spike = ผลที่แย่กว่าระหว่างสองเครื่อง (D-003 ต้องผ่านทั้งสอง)
4. ตัว "เด็ดขาด" ที่วัดไม่ได้หรือข้อมูลไม่พอ (เช่น FPS เคลื่อนที่ < 60 วินาที, segment จอเปิด < 20 นาที) = ยังตัดสินไม่ได้ ต้องเดินซ้ำ ไม่นับเป็น Go
5. ค่าที่อยู่บนเส้นแบ่งพอดีให้ถือตามตารางตรงตัว (เช่น แบต 10.0% = Go)

### 10.3 เหตุผลเชิงผู้เล่น (ให้ product-manager ทบทวนใน T27)

- S3: ผู้เล่นเวลามากเล่น 3–6 ชม./วัน · 10% ต่อ 30 นาที = เล่น 2 ชม. ใช้ราว 40% ยังเหลือแบตกลับบ้าน · เกิน 15% (60% ใน 2 ชม.) คนจะเลิกก่อนเดินครบ
- S8: 12 MB ต่อ 30 นาที ≈ 72 MB ต่อ 3 ชม. ต่อวัน ยังอยู่ในแพ็กเกจเน็ตรายเดือนทั่วไป · 30 MB ต่อ 30 นาที ≈ 5 GB ต่อเดือนถ้าเล่นทุกวัน ซึ่งเกินแพ็กเกจราคาถูก · session ที่สองควรใช้น้อยกว่ามากเพราะ cache (บันทึกเป็นข้อมูลประกอบ)
- S9, S11: check-in ต้อง accuracy < 30 ม. (`config/balance/anticheat.json#checkIn.maxAccuracy_m`) · p90 > 30 ม. ในสวน = ผู้เล่นหนึ่งในสิบเข้า dungeon ไม่ได้ในจังหวะนั้น
- S12: GDD ให้ reward ผูกกับการเดิน · คนที่เดินจริงแต่ตก gate เกิน 15% ของเวลา = เกมไม่แฟร์กับคนที่ทำสิ่งที่เกมอยากให้ทำ
- S4, S17: ช่วง "10 นาทีแรกของคนใหม่" ต้องเห็นแผนที่และตัวเองเร็ว และเล่นกลางแจ้งตอนกลางวัน

### 10.4 สภาพการวัด (kit ของ T14 ต้องบังคับ)

- เครื่องชาร์จเต็ม, ปิด battery saver / Low Power Mode, ความสว่างอัตโนมัติ, เปิดเน็ตมือถือ (ไม่ใช้ Wi-Fi) สำหรับ S4–S8 · บันทึกสุขภาพแบต (iOS: การตั้งค่า > แบตเตอรี่ > ความจุสูงสุด · Android: ถ้าดูได้) · ต่ำกว่า 80% ให้ติดธง "ตีความระวัง"
- session แรกของแต่ละเครื่องเริ่มจาก cache ว่าง (ล้างข้อมูลเว็บไซต์ของ preview URL ก่อน)
- segment `screen_on` ต่อเนื่องอย่างน้อย 20 นาที โหมดตามตัวเปิด · มีช่วง pan/zoom ตามสคริปต์ใน kit รวมอย่างน้อย 60 วินาที · เดินความเร็วปกติ ไม่หยุดนานเกิน 1 นาที (ยกเว้น segment `stationary` 5 นาทีแยก)
- ถ่าย screenshot ป้ายไทยที่ zoom 14, 16, 18 ทั้งสวนและซอย (S16)

### 10.5 นิยามวิธีวัด

| ตัวชี้วัด | วิธีคำนวณใน HUD (T11) |
| --- | --- |
| FPS (S1, S2) | loop `requestAnimationFrame` เก็บช่วงห่างระหว่างเฟรมเฉพาะเมื่อ `map.isMoving()` เป็นจริง (pan/zoom) หรือกล้องกำลัง ease ตามจุด (โหมดตามตัว) · ตัดช่วงห่าง > 1 วินาที (หน้าถูกซ่อน) · เฉลี่ย = จำนวนเฟรม ÷ เวลาเคลื่อนที่ · p5 = เปอร์เซ็นไทล์ที่ 5 ของ `1000 / ช่วงห่าง` · ไม่วัดตอนแผนที่นิ่งเพราะ MapLibre ไม่ render |
| แบต (S3) | Android: `navigator.getBattery().level` ต้นและท้าย segment · iOS: คนจด % จาก status bar ต้นและท้าย พร้อมเวลา (D-003) · ต่อ 30 นาที = (ต้น − ท้าย) × 1800 ÷ `duration_s` · segment < 20 นาที = วัดไม่พอ |
| เวลาแผนที่แรก (S4) | `performance.now()` ตอน event `load` ของแผนที่ (นับจาก navigation start) |
| MB (S5–S8) | หัวข้อ 11 · 1 MB = 10^6 byte |
| accuracy (S9, S10) | `accuracy` ของทุก sample ใน segment หลังตัด 60 วินาทีแรกหลัง `start()` (warm-up) · median และ p90 |
| TTFF (S11) | เวลาจาก `start()` ถึง sample แรกที่ `accuracy ≤` `config/balance/anticheat.json#checkIn.maxAccuracy_m` |
| gate (S12) | หน้าต่างยาว `window_s` เลื่อนทีละ 30 วินาทีตลอด segment เดินในสวน · ระยะ = ผลรวม haversine ระหว่าง sample ต่อเนื่อง (ไม่กรอง jitter) · ผ่านเมื่อระยะเทียบ `minDistancePerWindow_m` ตาม `comparison` ของ `config/balance/dungeons.json#movementGate` · เป็นค่าวัดเท่านั้น gate จริงอยู่ใน `packages/shared` Phase 2 และรันบน server Phase 3 |
| sample ขาด (S13, I2) | ช่วงห่างระหว่าง sample ต่อเนื่องที่ > 10 วินาที · % = ผลรวมช่วงเหล่านั้น ÷ `duration_s` |
| ช่วงห่าง fix (S14) | median ของ `timestamp[i] − timestamp[i−1]` |
| ความหน่วง (S15) | ต่อ sample: `Date.now()` ใน event `render` แรกหลัง `setLngLat` ของจุด ลบ `sample.timestamp` · ค่าติดลบ (นาฬิกาเครื่องเพี้ยน) ตัดทิ้งและนับจำนวนไว้ |
| ป้ายไทย (S16) | จาก screenshot ไล่ป้ายไทยที่เห็นจนครบ 20 ป้าย (กระจายสาม zoom) · tech-lead กับ art-director ตัดสินใน T21 |
| jitter นิ่ง (I1) | ระยะสะสมแบบเดียวกับ S12 ใน segment `stationary` 5 นาที (ยืนหรือนั่งม้านั่ง มือถือในมือ) |

## 11. การนับ byte (TL-S07)

ปัญหา: MapLibre โหลด tile ใน Web Worker จึงไม่เห็นใน Resource Timing ของหน้าหลัก และ resource ข้าม origin ให้ `transferSize = 0` ถ้าไม่มี `Timing-Allow-Origin` · ตัวนับหลักจึงอยู่ในตัว client

| ประเภท | ตัวนับหลัก (ในตัว client) | ตัวรอง |
| --- | --- | --- |
| tile แบบ PMTiles | custom `Source` ที่ห่อ `FetchSource` ของ `pmtiles` นับ `byteLength` ของทุก `getBytes` (รวม header/directory) | Resource Timing ของ URL `.pmtiles` |
| tile แบบ XYZ | client โหลด TileJSON เอง แล้วแทน URL ใน `tiles[]` ด้วย scheme `kw+https://` ที่ลงทะเบียนด้วย `maplibregl.addProtocol` · handler ทำงานบน main thread: `fetch` → นับ `byteLength` (หลังคลายการบีบอัด) | `encodedBodySize` จาก Resource Timing (main thread เห็นเพราะ fetch เกิดใน handler · ต้องมี `Timing-Allow-Origin`) |
| style, glyph, sprite | `style.ts` เปลี่ยน URL ของ `glyphs`, `sprite` เป็น `kw+https://` แบบเดียวกัน · style JSON นับจาก fetch ที่โหลดเอง | Resource Timing |
| font-faces | Resource Timing (browser โหลดผ่าน FontFace) | — |
| JS | Resource Timing ของ script same-origin (`encodedBodySize` ได้เสมอ) | — |

- ค่าที่รายงาน: ถ้าทุกรายการในประเภทนั้นมี `encodedBodySize > 0` ใช้ผลรวม `encodedBodySize` (`bytes_method = transfer`) · ไม่งั้นใช้ตัวนับหลัก (`decoded` ซึ่งสูงกว่าจริงสำหรับ tile ที่ถูกบีบอัด จึงเป็นค่าที่ปลอดภัยต่อการตัดสิน)
- ตัวนับเก็บเฉพาะจำนวน byte ต่อประเภท ไม่เก็บ URL ของ tile (URL ของ tile บอกตำแหน่งโดยประมาณได้) · ไม่ส่งออกนอกเครื่องนอกจาก summary CSV

## 12. Failure modes และทางเลือก

| # | อาการ | ตรวจจับ | ผลต่อผู้ทดสอบ | ทางเลือก / การจัดการ |
| --- | --- | --- | --- | --- |
| F1 | host ไม่รองรับ `206` แต่ใช้ PMTiles | error "HTTP Byte Serving" ใน console | แผนที่ว่าง | ใช้ XYZ + TileJSON บน Pages (หัวข้อ 7.3) · curl ตรวจใน T08 |
| F2 | ไฟล์หรือจำนวนไฟล์เกินงบ | script ของ T06 ล้มก่อน publish | ไม่มี preview | ลด maxzoom → GitHub Pages ชั่วคราว → HUMAN (หัวข้อ 7.3) |
| F3 | **Thai shaping:** สระ/วรรณยุกต์ลอย ทับกัน baseline ไม่ตรง หรือ font-faces โหลดไม่ขึ้น | screenshot zoom 14/16/18 (S16) · warning "Unable to load glyph range" | ชื่อถนนอ่านยาก | (1) ตรวจว่า `font-faces` ครอบ U+0E00–0E7F ทุก fontstack ที่ style ใช้ (2) ลดป้าย: แสดงชื่อไทยเฉพาะถนนหลักและสวน ซ่อน POI ย่อย (3) **ป้าย dungeon เป็น HTML marker** (DOM ใช้ text engine ของ browser เต็มรูป) ไม่ใช้ symbol layer (4) ถ้ายังไม่ผ่าน ใช้ชื่ออังกฤษบนแผนที่ฐานและแสดงชื่อไทยเฉพาะใน UI นอกแผนที่ |
| F4 | CORS ขาดบน project แผนที่ | error CORS ใน console | แผนที่/glyph ไม่ขึ้น | `_headers` ใส่ `Access-Control-Allow-Origin` (หัวข้อ 7.5) |
| F5 | Pages ตอบ `index.html` แทน 404 | tile parse error | tile เสีย | ใส่ `404.html` ที่รากของ project แผนที่ |
| F6 | permission ถูกปฏิเสธ | error `permission-denied` | ไม่มีจุดตำแหน่ง | แสดงสถานะ `gps.*` แยกกรณี พร้อมวิธีเปิดสิทธิ์ต่อ browser · ไม่ retry วน |
| F7 | GPS timeout / unavailable (ซอย, ใต้ตึก) | error ไม่ fatal | จุดค้าง | แสดง accuracy ต่ำ/หา GPS · provider ลองต่อ · HUD นับเป็น sample ขาด |
| F8 | จอล็อก / สลับแท็บ | state `suspended` | ไม่มี sample ช่วงนั้น | ตั้งใจ (GDD) · HUD บันทึกช่วงขาด (segment `pocket`) |
| F9 | เน็ตหลุดระหว่างโหลด tile | fetch error ใน handler | บางส่วนของแผนที่ว่าง | MapLibre ลองโหลดใหม่เมื่อ pan · ไม่กระทบ location · QA case ใน T12 |
| F10 | Battery API ไม่มี (iOS Safari) | `navigator.getBattery` undefined | HUD ไม่มี % แบต | แสดง "จดจากเครื่อง" และให้กรอกเองใน form (`battery_source = manual`) |
| F11 | Resource Timing ให้ 0 | `encodedBodySize = 0` | MB ไม่มีค่า transfer | ใช้ตัวนับหลักแบบ decoded (หัวข้อ 11) |
| F12 | trace ไม่ผ่าน `validateTrace` | ผลตรวจ `ok: false` | Mock ไม่เริ่ม | แสดง path/code แรกของ error · ไม่ crash |
| F13 | build.protomaps.com ใช้ไม่ได้ หรือ agent ดาวน์โหลดไม่ได้ | extract ล้ม | ไม่มี tile ใหม่ | ใช้ build ที่ pin จาก cache ในเครื่อง · planetiler + profile Protomaps · HUMAN P1-F02-T25 ดาวน์โหลดแทน |
| F14 | พิกัดดิบหลุดเข้า git | CI guard (T07) + gitleaks | ละเมิด PDPA บน repo public | `.gitignore` ครอบ `raw/` · summary ไม่มีพิกัด · raw ผ่าน `validateTrace` แบบ `field` เท่านั้น |

## 13. Test plan hooks (สำหรับ T05, T10, T12, T13)

| hook | ที่ | ใช้ทำอะไร |
| --- | --- | --- |
| `validateTrace` + `trace.test.ts` | `packages/shared` | ทุก trace ใน `data/gps-traces/` ต้องผ่าน · QA เพิ่ม test ที่วนทุกไฟล์ได้ใน `qa/tests/F02/` |
| `Clock`, `VisibilitySource` ที่ฉีดได้ | `packages/location` | trace-replay test แบบ deterministic · จำลองจอล็อกโดยไม่ต้องมี DOM |
| `MockPlaybackControls` | `packages/location` | seek/pause/speed ใน test และ e2e |
| `events` ใน trace | trace format | จำลอง `permission-denied`, `timeout`, หน้าซ่อน ผ่านไฟล์ trace โดยไม่แก้โค้ด |
| query `loc`, `trace`, `speed`, `hud` | client | e2e (Playwright `android-chrome`, `ios-safari`) เปิดหน้าด้วย Mock และ fixture tile |
| fixture PMTiles + TileJSON ในเครื่อง | `tools/tiles/fixtures/` | e2e และ CI ไม่ดาวน์โหลดข้อมูลใหญ่ (TL-S11) · ทดสอบได้ทั้งสองรูปแบบ source |
| `window.__kwSpike` (เฉพาะเมื่อ `hud=1`) | client | e2e อ่านตำแหน่งจุดล่าสุด, state ของ provider, ตัวนับ byte · ห้ามมีใน build ที่ไม่มี flag |
| curl ตรวจ header | runbook T08 | `206` (PMTiles) หรือ `200` + `content-type` + CORS + `timing-allow-origin` (XYZ) |

## 14. การตัดสินใจ งานต่อ และสิ่งที่ยังเปิด

- **decision (tech-lead, แจ้ง producer):** tile บน Cloudflare Pages publish เป็นไดเรกทอรี XYZ + TileJSON แทน "PMTiles แบ่งตามพื้นที่ + manifest" · ลำดับทางแก้ใหม่: XYZ z15 → ลด maxzoom 14 → GitHub Pages ชั่วคราว → HUMAN · ไม่มีค่าใช้จ่ายหรือ vendor ใหม่ · host ยังเป็นไปตาม D-008 · board ต้องแก้ acceptance ของ P1-F02-T06 (สร้าง XYZ + TileJSON + manifest.json, งบจำนวนไฟล์), T08 (`_headers` ตามหัวข้อ 7.5, project แผนที่แยก, curl ตามหัวข้อ 7.2), T11 (รองรับ TileJSON และ `pmtiles://` ผ่าน `VITE_TILES_URL`)
- **config ของ spike (มีแล้ว P1-H05, ยืนยัน path ใน P1-H01):** raw export `config/app/privacy.json#rawTraceExport.rawTraceTrim_m` (200) และ `#rawTraceExport.coordinateDecimals` (5) · Web provider `config/app/client.json#locationWeb.{enableHighAccuracy, timeout_ms, maximumAge_ms}` · query `config/app/client.json#providerQuery`, `#providerQueryDefaultsByMode` · HUD `config/app/client.json#hudMeasurement` · A-P1-F02-T03-1 ปิดแล้ว (ค่า 200 ม. รอ product-manager ยืนยันใน T27)
- **P1-H01:** D-037 ACCEPTED และสัญญา `kw-dungeons` (หัวข้อ 15) · `.env.example` ไม่มีค่า (หัวข้อ 8) · `@maplibre/maplibre-gl-style-spec` เป็น dev dependency ของ root (หัวข้อ 15.3)
- **เปิดอยู่:** ยืนยัน bbox กับขอบปกครอง (T06) · ยืนยันว่า `_headers` override `Content-Type` ได้และ Cloudflare บีบอัด `.mvt` จริง (T08 ด้วย curl) · ยืนยัน `lang: "th"` ใน `@protomaps/basemaps` (P1-F03-T12)
- **ทบทวนเมื่อ:** Cloudflare ประกาศรองรับ `206` บน Pages (กลับไปใช้ PMTiles บน Pages ได้โดยเปลี่ยน env) · คนอนุมัติ R2 (หัวข้อ 7.6) · จำนวนไฟล์ใกล้ 16,000 เมื่อขยายพื้นที่

## 15. ข้อมูลแผนที่ฝั่งเกม: ขอบเขต โซนดำ และ `kw-dungeons` (P1-H01)

### 15.1 D-037 — ACCEPTED

เส้นจังหวัดและ mask โซนดำมาจาก GeoJSON แยก ไม่ใช้ layer `boundaries` ของ tile · ยืนยัน A-P1-F03-T12-3

| เหตุผล | รายละเอียด |
| --- | --- |
| tile ครอบแค่ bbox ของ 6 จังหวัด | เส้นจังหวัดต้องเห็นทั่วประเทศในโซนดำ (GDD "แผนที่เต็มคือประเทศไทย") · ขยาย tile ทั้งประเทศทำให้เกินงบไฟล์ของหัวข้อ 7.4 |
| เปิดจังหวัดใหม่ = เปลี่ยนข้อมูล | ไม่ต้อง build tile ใหม่ ไม่แก้ style |
| geometry ชุดเดียวทั้งระบบ | ขอบเขตพื้นที่เล่นชุดเดียวกันจะใช้ฝั่ง server (Phase 3: สถานะ "นอกพื้นที่" ตาม `config/balance/unlocks.json#home.outOfServiceAreaThreshold_m`, validation ของ dungeon) ผ่าน `packages/geo` · ไม่มีขอบเขตสองชุดที่ต้องทำให้ตรงกัน |

สัญญาของไฟล์ (P1-H07 สร้าง, location-engineer)

| ไฟล์ | เนื้อหา | กติกา |
| --- | --- | --- |
| `data/map/playarea-mask.geojson` | FeatureCollection 1 feature `Polygon` · วงนอก `[-180,-85]`–`[180,85]` ทวนเข็ม · รู = union ของจังหวัดที่เล่นได้ ตามเข็ม (RFC 7946) | simplify ~20 ม. · พิกัด ≤ 5 ทศนิยม · ≤ 300 KB ก่อน gzip · property ไม่มี |
| `data/map/provinces.geojson` | `kind: "border"` LineString/MultiLineString + `kind: "label"` Point ที่มี `name` (ไทย) และ `playable` (boolean) | simplify ~200 ม. · พิกัด ≤ 5 ทศนิยม · ≤ 300 KB ก่อน gzip (map-style 6.3) |

- รายชื่อจังหวัดที่เล่นได้ **ไม่ hardcode ใน script** · Phase 1 อ่านจาก `tools/coverage/params.json#pipeline.studyArea.provinces` (`iso` + `osmRelationId` ชุดเดียวกับ coverage survey) · ค่า `playable` และรูของ mask มาจากรายการเดียวกัน · Phase 3 ย้ายรายการเข้า `config/content/` เมื่อหลังบ้านเป็นเจ้าของ (งาน tech-lead + level-designer ตอนนั้น)
- attribution: © OpenStreetMap (ODbL) ใน `attribution` ของ source ทั้งสอง (ตาม map-style หัวข้อ 3)
- client โหลดแบบเดียวกับ trace (gps-trace-format หัวข้อ 5): `import.meta.glob` แบบ `?url` → `fetch` ขนานกับ style → `map.getSource(id).setData(...)` หลัง `load` · โหลดไม่สำเร็จ → แผนที่ยังใช้งานได้ ไม่มีโซนดำ และ `console.warn` (ไม่ crash) · e2e ใช้ไฟล์ใน repo ไม่ดาวน์โหลด
- test ของ P1-H07: ขนาดไฟล์ · GeoJSON valid · winding ตาม RFC 7946 · จำนวน label = 77 · `playable = true` ตรงกับรายการใน params

### 15.2 สัญญา property ของ `kw-dungeons` — ACCEPTED (ปิด A-P1-F03-T12-5 ในส่วนชื่อ property)

ตาราง property ใน `art/direction/map-style.md` หัวข้อ 6.1 (`id`, `name`, `status`, `sponsored`, `label_sponsored`, `label_count`) เป็นสัญญาของ **view model ฝั่ง client** ใช้ได้ตั้งแต่ Phase 1 จนถึงหลัง Phase 3 โดยมีกติกาเพิ่ม

1. **เป็น view model ไม่ใช่ API:** adapter เดียว `apps/client/src/map/dungeons-source.ts` แปลง payload ของ server (สัญญา API ของ dungeon ใน `docs/tech/api/` Phase 3) เป็น property เหล่านี้ · API เปลี่ยนชื่อ field ได้โดยไม่แก้ style · Phase 1–2 ใช้ fixture ใน repo
2. **สร้าง object ใหม่แบบ whitelist:** adapter ใส่เฉพาะ 6 property นี้ ห้าม spread payload ของ server ลง feature · tech gate ตรวจว่าไม่มี property ที่เป็นรหัส ชื่อ พิกัด geohash หรือเวลาที่เห็นล่าสุดของผู้เล่นคนใด (non-negotiable 4)
3. `id`: string ที่คงที่ของ dungeon จากหลังบ้าน · source ตั้ง `promoteId: "id"`
4. `status`: `"open"` | `"closed"` · ค่าอื่นจาก server → adapter แปลงเป็น `"closed"` และ `console.warn` (ปลอดภัยกว่า: ไม่ชวนเดินไปที่ที่อาจเข้าไม่ได้) · เพิ่มสถานะใหม่ต้องแก้ทั้ง style (art-director) และ adapter
5. `name`: ชื่อจากหลังบ้านผ่าน payload (non-negotiable 3) ไม่ใช่จาก copy
6. `label_count`: client จัดรูปด้วย `t()` (`docs/tech/copy-schema.md`) จากค่ารวมระดับ dungeon ที่ server ส่ง (จำนวนรวม + จำนวนต่อ role) เท่านั้น · จำนวน 0 → สตริงว่าง · `label_sponsored`: copy key จาก narrative-designer · ไม่มีอักษรไทยในโค้ด
7. geometry: `Polygon`/`MultiPolygon` วงนอกทวนเข็ม · adapter rewind ด้วย pure function (`packages/geo` เมื่อสร้าง · ระหว่างนี้ `apps/client/src/map/` แล้วย้าย) · **ไม่เพิ่ม `@turf/rewind`** โดยไม่มี handoff ถึง tech-lead
8. ชื่อ property `label_*` แบบ snake_case คงไว้ตาม style (เป็นชื่อฝั่ง style) · property ใหม่ใช้ชื่อตัวเล็กคำเดียวหรือ `label_*` สำหรับข้อความที่จัดรูปแล้ว

ส่วนที่ยังเปิด: รูปของ payload ของ server (Phase 3 API contract) และ feature-state สำหรับ dungeon ที่ผู้เล่นอยู่ข้างใน

### 15.3 การตรวจ style

- `@maplibre/maplibre-gl-style-spec` 26.4.4 เป็น **dev dependency ของ root** (ADR 0001 3.13 · ติดตั้งในงาน `X` ของ tech-lead) · เวอร์ชันเดียวกับที่ `maplibre-gl` 6.10.0 ดึงมาอยู่แล้ว จึงไม่มีโค้ดใหม่เข้าระบบ · bump คู่กับ `maplibre-gl` เสมอ
- ไม่ใส่ใน `apps/client` dependencies เพราะ runtime ใช้ตัวที่อยู่ใน `maplibre-gl` แล้ว · ใช้เฉพาะ test
- test `qa/tests/unit/map-style.test.ts` (qa-tester หลังติดตั้ง) เรียก `validateStyleMin` กับ `art/direction/map-style/kw-light.style.json` ต้องได้ error 0 · แทนคำสั่งที่เรียก path ใต้ `node_modules/.pnpm/` ใน map-style หัวข้อ 13
- ผลตรวจครั้งแรก (P1-H01, 2026-09-23): `gl-style-validate.mjs art/direction/map-style/kw-light.style.json` → exit 0 ไม่มีบรรทัด error
