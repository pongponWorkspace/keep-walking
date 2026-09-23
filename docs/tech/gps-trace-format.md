# รูปแบบ GPS trace และ export ของการเดินทดสอบ

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted (สัญญาร่วมตาม protocol ข้อ 9) |
| วันที่ | 2026-09-23 |
| task | P1-F02-T03 · เจ้าของ tech-lead · แก้ไข P1-H01 (หัวข้อ 4.2: path config จริง, ปิด A-P1-F02-T03-1) |
| ไฟล์ที่เครื่องอ่าน | `packages/shared/schemas/gps-trace.schema.json` (JSON Schema 2020-12) · `packages/shared/src/trace.ts` (`validateTrace`, type) |
| ผู้ใช้ | P1-F02-T04 (synthetic), T05 (Mock), T10 (client), T11 (export), T13 (QA trace), T14 (kit), T24 (recorded), Phase 3 server |
| อ้างอิง | TL-M05, TL-M06, TL-S09, TL-S10, TL-N04, MF-3 · GDD "ข้อมูลตำแหน่ง", "สัญญาณขาดและแอปถูกปิด" · ADR 0001 หัวข้อ 3.1, 3.12 |

## 1. กติกา

1. **ใช้ตัวตรวจกลางตัวเดียว:** ทุกงานที่อ่านหรือเขียน trace เรียก `validateTrace()` จาก `@keep-walking/shared` ห้ามเขียน validator เอง · JSON Schema ใช้กับเครื่องมือภายนอกและ editor ได้ แต่ runtime ใช้ `validateTrace` เพราะ Ajv สร้างโค้ดด้วย `new Function` ซึ่ง Cloudflare Workers ไม่อนุญาต · `trace.test.ts` รันทั้งสองกับ fixture ชุดเดียวกันเพื่อกัน drift
2. **เวลาเป็น relative เสมอ:** `t` = มิลลิวินาทีนับจาก sample แรก (`t` ของ sample แรก = 0) · ไม่มีเวลาจริงหรือวันที่ในไฟล์ · Mock แปลงเป็น `LocationSample.timestamp` ด้วย `toLocationSample(sample, clock.now() ตอนเริ่มเล่น)`
3. **`timestamp` ของ `LocationSample` = เวลาของ fix** (`GeolocationPosition.timestamp`) ไม่ใช่เวลาที่แอปได้รับ (TL-S09) · server ใน Phase 3 ใช้ค่านี้ตรวจความต่อเนื่อง
4. **metadata ไม่ระบุตัวตนโดยโครงสร้าง:** key ที่ไม่อยู่ใน schema ถูกปฏิเสธ (`unknown-key`) จึงใส่รุ่นเครื่อง ชื่อ อีเมล หรือเวลาจริงไม่ได้ · `platform` มีแค่ค่ากว้าง (`android-chrome`, `ios-safari`, `desktop`, `synthetic`)
5. **พิกัดจริงออกจากเครื่องได้เฉพาะเมื่อยินยอม** และผ่านการตัดต้น/ปลายแล้ว (หัวข้อ 4) · raw trace ห้าม commit (ADR 0001 หัวข้อ 3.12)

## 2. โครงไฟล์ (`*.trace.json`)

```json
{
  "$schema": "../../../packages/shared/schemas/gps-trace.schema.json",
  "format": "keep-walking.gps-trace",
  "formatVersion": 1,
  "meta": {
    "id": "synthetic-park-loop-01",
    "kind": "synthetic",
    "timeBase": "relative-ms",
    "description": "เดินวนรอบสวน 30 นาที ความเร็ว 1.3 m/s",
    "environment": "park",
    "platform": "synthetic",
    "generator": { "tool": "tools/traces", "version": "0.1.0", "seed": 42, "scenario": "park-loop" }
  },
  "samples": [
    { "t": 0, "lat": 13.730512, "lng": 100.541234, "accuracy": 6.5, "speed": 1.3, "heading": 90 },
    { "t": 1000, "lat": 13.730521, "lng": 100.541249, "accuracy": 7.0 }
  ],
  "events": [
    { "t": 600000, "type": "visibility-hidden" },
    { "t": 720000, "type": "visibility-visible" }
  ]
}
```

### 2.1 ฟิลด์

| ฟิลด์ | ชนิด | บังคับ | ความหมายและข้อจำกัด |
| --- | --- | --- | --- |
| `format` | `"keep-walking.gps-trace"` | ใช่ | ชื่อรูปแบบ |
| `formatVersion` | `1` | ใช่ | เปลี่ยนเมื่อโครงเปลี่ยนแบบไม่เข้ากัน (tech-lead เท่านั้น) |
| `meta.id` | string `^[a-z0-9][a-z0-9-]{2,63}$` | ใช่ | ตรงกับชื่อไฟล์ไม่รวม `.trace.json` |
| `meta.kind` | `synthetic` · `qa` · `field` · `recorded` | ใช่ | หัวข้อ 3 |
| `meta.timeBase` | `"relative-ms"` | ใช่ | ยืนยันว่า `t` เป็นเวลาสัมพัทธ์ |
| `meta.description` | string ≤ 500 | ไม่ | ภาษาไทยได้ · ห้ามระบุสถานที่ที่ผูกกับบุคคล |
| `meta.environment` | `park` · `soi` · `street` · `table` · `bench` · `mixed` · `other` | ไม่ | สภาพที่อัดหรือจำลอง |
| `meta.platform` | `android-chrome` · `ios-safari` · `desktop` · `synthetic` | ไม่ | ไม่มีรุ่นเครื่อง |
| `meta.generator` | `{tool, version, seed?, scenario?}` | ไม่ (ควรมีใน synthetic) | สร้างซ้ำได้ด้วย seed |
| `meta.sanitized` | `{trimStart_m, trimEnd_m, coordinateDecimals?}` | ใช่ เมื่อ `field` หรือ `recorded` | หลักฐานว่าตัดต้น/ปลายแล้ว |
| `samples[]` | 2 ถึง 200,000 รายการ | ใช่ | เรียงตาม `t` เพิ่มขึ้นแบบเคร่ง |
| `samples[].t` | integer ≥ 0 (ms) | ใช่ | sample แรก = 0 |
| `samples[].lat`, `lng` | number (WGS84 องศา) | ใช่ | −90..90, −180..180 |
| `samples[].accuracy` | number > 0 (เมตร) | ใช่ | รัศมี accuracy ตามที่ platform รายงาน |
| `samples[].speed` | number ≥ 0 (m/s) | ไม่ | ใส่เฉพาะเมื่อ platform ให้ค่า (ไม่ใส่ `null`) |
| `samples[].heading` | 0 ≤ x < 360 (องศา) | ไม่ | เช่นเดียวกัน |
| `events[]` | ≤ 10,000 รายการ `{t, type}` | ไม่ | เรียงตาม `t` (เท่ากันได้) และ `t` ไม่เกิน sample สุดท้าย |
| `events[].type` | `visibility-hidden` · `visibility-visible` · `permission-denied` · `position-unavailable` · `timeout` | ใช่ | ให้ Mock จำลองหน้าจอล็อกและ error ได้ |

- ช่วง sample ขาด (สัญญาณหาย, จอดับ) แทนด้วย "ไม่มี sample" ในช่วงนั้น ไม่มี marker พิเศษ
- ขณะ `visibility-hidden` Mock ต้องไม่ส่ง sample ที่อยู่ในช่วงนั้นและไม่เก็บไว้ส่งทีหลัง (ตรงกับพฤติกรรมเว็บจริงและ GDD "ล็อกหน้าจอ")

### 2.2 กฎที่ `validateTrace` ตรวจเพิ่มจาก JSON Schema

| กฎ | code |
| --- | --- |
| `samples[0].t` ต้องเป็น 0 | `first-sample-not-zero` |
| `t` ของ sample เพิ่มขึ้นแบบเคร่ง | `order` |
| `events` เรียงตาม `t` และไม่เกิน sample สุดท้าย | `order`, `range` |
| `field` / `recorded`: พิกัดไม่เกิน 5 ตำแหน่งทศนิยม (ราว 1.1 ม.) และไม่เกิน `coordinateDecimals` ที่ประกาศ | `precision` |
| `field` / `recorded`: `trimStart_m`, `trimEnd_m` ≥ ค่า config ที่ส่งเข้า `options.minTrim_m` | `trim` |

ผลตรวจ: `{ ok: true, trace }` หรือ `{ ok: false, errors: [{ path, code, message }] }` (สูงสุด 50 ข้อ)

## 3. ชนิดของ trace และที่เก็บ

| `kind` | ที่เก็บ | commit ได้ | ใครสร้าง | เงื่อนไข |
| --- | --- | --- | --- | --- |
| `synthetic` | `data/gps-traces/synthetic/` | ได้ | location-engineer (P1-F02-T04) ผ่าน generator ใน `tools/traces/` | สร้างซ้ำได้ด้วย seed · พิกัดอยู่ในพื้นที่สาธารณะ ไม่ผูกกับบ้านหรือบุคคล |
| `qa` | `data/gps-traces/qa/` | ได้ | qa-tester (P1-F02-T13) | กรณีขอบ (GPS กระโดด, sample ขาด 2 นาที) · กฎพิกัดเหมือน synthetic |
| `field` | `qa/playtest/results/raw/` เท่านั้น (ถูก `.gitignore`) | **ไม่ได้** | export แบบ raw จากเครื่องมือวัด (P1-F02-T11) เมื่อคนเดินกดเลือกเอง | ตัดต้น/ปลายและเวลา relative แล้วตั้งแต่ในเครื่อง · พิกัด ≤ 5 ทศนิยม |
| `recorded` | `data/gps-traces/recorded/` | ได้ | location-engineer (P1-F02-T24) แปลงจาก `field` | มีคำยินยอมเป็นลายลักษณ์อักษร · ตัดต้น/ปลาย ≥ ค่า config · ปัดพิกัดตาม `data/gps-traces/README.md` |

ชื่อไฟล์: `<meta.id>.trace.json` · `meta.id` ขึ้นต้นด้วยชนิด เช่น `synthetic-park-loop-01`, `qa-gps-jump-01`, `recorded-park-01` · กฎปัดพิกัดของ synthetic/qa อยู่ใน README ของ P1-F02-T04 (ไม่เกิน 6 ทศนิยม)

## 4. export จากเครื่องมือวัด (P1-F02-T11) สองแบบ (TL-M06, MF-3)

### 4.1 (ก) `summary` CSV — ค่าเริ่มต้น ไม่มีพิกัด

- ชื่อไฟล์: `summary-<session_id>.csv` · UTF-8 · คั่นด้วย `,` · หัวตารางแถวแรก · 1 แถวต่อ segment (`all` + แต่ละ segment ที่มี) · ค่าว่าง = วัดไม่ได้
- **ห้ามมี** lat, lng, geohash, ชื่อสถานที่, เวลาจริงเป็นวินาที, รุ่นเครื่อง, user agent เต็ม · `session_id` สุ่มใหม่ทุก session (UUID v4) ไม่ผูกกับเครื่อง
- commit ได้ใน `qa/playtest/results/` คู่กับไฟล์ form (P1-F02-T14)

| คอลัมน์ | หน่วย / ค่า | นิยาม (ดูวิธีวัดเต็มใน tech note F02 หัวข้อ 10) |
| --- | --- | --- |
| `format_version` | `1` | รุ่นของ CSV นี้ |
| `session_id` | UUID v4 | สุ่มต่อ session |
| `app_version` | git short SHA | build ที่ใช้ |
| `tileset_id` | string | id ของ tile set จาก TileJSON (เช่น `pm4-20260923-z15`) |
| `platform` | `android-chrome` · `ios-safari` · `other` | จาก UA แบบกว้าง |
| `environment` | `park` · `soi` · `other` | คนเดินเลือกใน HUD |
| `segment` | `all` · `screen_on` · `pocket` · `stationary` | ช่วงตาม kit (P1-F02-T14) |
| `local_hour` | 0–23 | ชั่วโมงท้องถิ่นตอนเริ่ม segment (เพื่อตีความแดด) |
| `duration_s` | วินาที | ความยาว segment |
| `fps_pan_avg`, `fps_pan_p5` | fps | ระหว่าง pan/zoom |
| `fps_follow_avg`, `fps_follow_p5` | fps | ระหว่างโหมดตามตัว |
| `moving_time_pan_s`, `moving_time_follow_s` | วินาที | เวลาที่นับ FPS จริง |
| `battery_start_pct`, `battery_end_pct` | % | จาก Battery API หรือคนกรอก |
| `battery_drain_per30min_pct` | % | (start − end) × 1800 / `duration_s` |
| `battery_source` | `api` · `manual` · `none` | iOS = `manual` |
| `mb_js`, `mb_style`, `mb_tiles`, `mb_total` | MB (10^6 byte) | แยกประเภท · `mb_style` = style + glyph + sprite + font |
| `bytes_method` | `transfer` · `decoded` | `transfer` เมื่อได้ `encodedBodySize` · ไม่งั้น `decoded` (ค่าสูงกว่าจริง) |
| `time_to_first_map_ms` | ms | จากเปิดหน้าจนแผนที่ `load` |
| `sample_count` | จำนวน | sample ใน segment |
| `sample_interval_median_s` | วินาที | ค่ากลางของช่วงห่างระหว่าง fix |
| `ttff_30m_s` | วินาที | จาก start() ถึง sample แรกที่ accuracy ≤ 30 ม. |
| `accuracy_median_m`, `accuracy_p90_m`, `accuracy_max_m` | เมตร | จาก `accuracy` ที่ platform รายงาน |
| `gap_count_10s`, `gap_total_s`, `gap_pct` | จำนวน, วินาที, % | ช่วงที่ไม่มี sample นานกว่า 10 วินาที |
| `path_length_m` | เมตร | ผลรวมระยะ haversine ระหว่าง sample ต่อเนื่อง (ไม่กรอง) |
| `gate_windows_total`, `gate_windows_pass`, `gate_windows_pass_pct` | จำนวน, % | หน้าต่าง 5 นาทีเลื่อนทีละ 30 วินาที ที่ระยะสะสมผ่านเกณฑ์ gate (`minDistancePerWindow_m`, `window_s`, `comparison` จาก `config/balance/dungeons.json#movementGate` ตอนนี้ > 50 ม. ใน 300 วินาที) |
| `stationary_5min_accum_m` | เมตร | ระยะสะสมปลอมจาก jitter ใน 5 นาทีที่ยืนนิ่ง (segment `stationary`) |
| `latency_median_ms`, `latency_p90_ms` | ms | เวลาที่จุดบนแผนที่ขยับ − `timestamp` ของ fix |

ตัวเลขใน CSV เป็นค่าวัดสำหรับ spike เท่านั้น ไม่ใช่รางวัล และไม่ถูกส่งให้ server ใด

### 4.2 (ข) raw trace — opt-in มีพิกัด

- คนเดินต้องกดเลือกเองทุกครั้ง พร้อมข้อความยินยอมจาก kit (P1-F02-T14) · ไม่มีการส่งออกนอกเครื่องอัตโนมัติ (ดาวน์โหลดเป็นไฟล์เท่านั้น ไม่ upload)
- รูปแบบ = trace ในหัวข้อ 2 ด้วย `kind: "field"` · ก่อนเขียนไฟล์ เครื่องมือต้อง:
  1. ตัด sample ช่วงต้นจนกว่าระยะเส้นทางสะสมจาก sample แรกเกิน `rawTraceTrim_m` และตัดช่วงท้ายแบบเดียวกัน (ค่าตั้งต้นในไฟล์ 200 ม.)
  2. เลื่อนเวลาให้ sample แรกที่เหลือเป็น `t = 0` (ไม่มีเวลาจริง)
  3. ปัดพิกัดเหลือ `coordinateDecimals` ทศนิยม (ตอนนี้ 5) และใส่ `meta.sanitized = { trimStart_m, trimEnd_m, coordinateDecimals }`
  4. เรียก `validateTrace(trace, { minTrim_m })` ก่อนให้ดาวน์โหลด · ไม่ผ่าน = ไม่ให้ดาวน์โหลด
- ชื่อไฟล์: `field-<session_id>.trace.json` · วางได้ที่ `qa/playtest/results/raw/` เท่านั้น
- ค่า config (P1-H05 · ADR 0001 หัวข้อ 3.10.1 namespace `app`): ระยะตัด `config/app/privacy.json#rawTraceExport.rawTraceTrim_m` (200 ม.) · จำนวนทศนิยม `#rawTraceExport.coordinateDecimals` (5) · ค่าเดียวกันส่งเป็น `validateTrace(trace, { minTrim_m })` ในขั้น 4 · โค้ดไม่มี literal 200 หรือ 5 · A-P1-F02-T03-1 ปิดแล้วใน P1-H01 (ไฟล์มีแล้ว · ค่า 200 ม. ยังรอ product-manager ยืนยันใน P1-F02-T27 ตาม `_assumption` ในไฟล์)

## 5. วิธีที่ client โหลด trace (TL-N04)

- `apps/client` ใช้ Vite `import.meta.glob` แบบ `?url` ชี้ `data/gps-traces/{synthetic,qa,recorded}/*.trace.json` (path สัมพัทธ์จาก source ของ client) · Vite อนุญาตไฟล์ใน workspace root อยู่แล้ว (หา root จาก `pnpm-workspace.yaml`) จึงไม่ต้องคัดลอกไฟล์และไม่มีไฟล์ generated ใน git
- ห้าม glob `raw/` หรือ path ใดใต้ `qa/playtest/` · build production ของ preview จึงมีเฉพาะ trace ที่ commit ได้
- รายการ trace ใน UI สร้างจาก key ของ glob (ชื่อไฟล์ = `meta.id`) · เมื่อเลือก client `fetch(url)` → `JSON.parse` → `validateTrace` → ถ้าผ่านสร้าง Mock (`MockLocationOptions.trace`) · ถ้าไม่ผ่านแสดง error ของ dev พร้อม path แรก ไม่ crash
- test (Vitest, node) อ่านไฟล์เดียวกันด้วย `fs` ใน `packages/location/test/` หรือ `qa/tests/` แล้วเรียก `validateTrace` เช่นกัน
