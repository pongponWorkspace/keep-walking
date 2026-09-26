# tools/dungeons — validator ข้อมูล dungeon + build artifact ของ client

เจ้าของ: location-engineer (P2-F04-T26) · สัญญา: `docs/adr/0003-client-first-game-core.md` หัวข้อ 9, 11.3 · `docs/tech/F04-dungeon-presence.md` หัวข้อ 8, 13, 14 · กฎ: `design/levels/dungeon-rules.md` (จุด B) · schema: `packages/shared/schemas/dungeon.schema.json`

ทำงาน offline ทั้งหมด (ไม่มี network ตอน build) · deterministic (เรียงตาม `id`, ลำดับ key คงที่, ไม่มีเวลาที่ build ในไฟล์) · ไม่มี library เวลาทำการ (parser ของเราเอง) · `polylabel` 2.1.0 ใช้ตอน build เท่านั้น

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `pnpm --filter @keep-walking/tools-dungeons run dungeons:build` | validate `data/dungeons/` แล้วเขียน `data/dungeons/artifact/dungeons.client.v1.json` (ไม่เขียนถ้ามี error) |
| `pnpm --filter @keep-walking/tools-dungeons run dungeons:check` | exit 1 ถ้า artifact ที่ commit ไม่ตรงกับผล build หรือ validate ไม่ผ่าน |
| `pnpm --filter @keep-walking/tools-dungeons run dungeons:validate` | validate อย่างเดียว ไม่เขียนไฟล์ · เติม `--json` ได้ (`pnpm exec tsx tools/dungeons/src/cli.ts --validate --json`) |
| `pnpm test` | รวม `tools/dungeons/test/committed.test.ts` = โหมด `--check` (tech note 13.1) |

ตัวย่อ root `pnpm dungeons:build` ตาม tech note 13.1 ยังไม่มีใน `package.json` ของ root (อยู่นอก writes ของงานนี้ · ส่ง handoff ถึง tech-lead แล้ว)

## ข้อมูลเข้า (`data/dungeons/dungeons.json`)

- `format: "kw-dungeons-source"`, `format_version: 1`, `dungeons: [record]` · field ทั้งหมดดู `packages/shared/schemas/dungeon.schema.json#/$defs/sourceRecord` · ตัวอย่างครบทุกแบบ: `tools/dungeons/test/fixtures/dungeons.json` (สมมติ ไม่ใช่สถานที่จริง)
- geometry ใส่ใน record หรือแยกไว้ใน GeoJSON ข้างกัน แล้วระบุใน `geometry_files` (feature ต้องมี `properties.id` ตรงกับ record)
- `status`: `draft` / `review` / `published` / `retired` · เฉพาะ `published` ที่ไม่มี error เข้า artifact
- `entrance`: `{ point: [lng, lat], evidence }` จุดทางเข้าสาธารณะบนขอบ polygon (กฎข้อ 4) · `null` = ยังไม่ปัก → นำทางไปจุดป้ายและติด warning `nav_fallback_label_point`
- `opening_hours`: `{ source: "osm", osm: "<ข้อความ OSM>" }` (แปลงตอน build) · `{ source: "manual", weekly, exceptions?, reason }` (กรอกเอง) · `{ source: "manual_required" }` (ยังไม่กรอก = build ล้มถ้า published · F04-R26)
- `review_acknowledged: [{ flag: "<code>", ref: "<decision id หรือบันทึกสนาม>" }]` ปลด flag ประเภท review ทีละ code

## ไวยากรณ์เวลาทำการที่รับ (ADR 0003 9.2)

`24/7` · กฎคั่นด้วย `;` · วัน `Mo`..`Su` เป็นช่วง (`Mo-Fr`, วนได้ `Sa-Mo`) หรือรายการ (`Fr,Sa`) · เวลา `HH:MM-HH:MM` หลายช่วงคั่น `,` · `off` / `closed` · กฎไม่มีวัน = ทุกวัน · กฎหลังแทนเวลาของวันที่ระบุ · ช่วงข้ามเที่ยงคืน (`22:00-02:00` หรือ `22:00-26:00`) แยกส่วนหลังเที่ยงคืนไปวันถัดไป (หลังใช้ทุกกฎแล้ว) · นอกนั้น (`PH`, `SH`, `sunrise`, `sunset`, comment, week, เดือน, `+`, `||`) = error `opening_hours_outside_grammar` → ต้องกรอก `manual` พร้อมเหตุผล

## กฎที่ตรวจ (code → ความรุนแรงเมื่อ `published`)

ความรุนแรง: `error` = build ล้ม · `review` = ล้มจนกว่าใส่ใน `review_acknowledged` (แล้วเหลือ warning) · `warning` = ไม่ล้ม · record `draft`/`review` รายงานทุกข้อเป็น warning/review ไม่ล้ม · `retired` ตรวจแค่ schema

| code | ระดับ | ที่มา |
| --- | --- | --- |
| `schema` | error | `dungeon.schema.json` (รวม field บังคับ `verification_mode`, `floor_level`) |
| `duplicate_id` | error | tech note 13.2 |
| `geometry_missing`, `geometry_invalid`, `geometry_out_of_bounds` | error | ring ปิด ≥ 4 จุด, ไม่ตัดตัวเอง, hole อยู่ใน, ส่วนของ MultiPolygon ไม่ทับกัน, อยู่ใน `validator.bounds` |
| `area_out_of_range` | error (`area.outOfRange`) | กฎข้อ 1 · `config/balance/dungeons.json#area` · คำนวณใน EPSG:32647 เท่ากับ `tools/coverage` |
| `overlap_dungeon` | error (published ทั้งคู่) / warning | กฎข้อ 2 · เกิน `validator.maxOverlap_m2` |
| `overlap_excluded_zone` | error | กฎข้อ 8, 10, D-083 · feature ใน `data/coverage/excluded.geojson` ที่ `reason_excluded` อยู่ใน `validator.excludedZoneReasons` |
| `crosses_major_way` | error | กฎข้อ 3 จุด B · ใช้เมื่อตั้ง `paths.majorWays` (ยังไม่ตั้ง → warning `major_ways_not_checked` และใช้ flag ของ candidate แทน) |
| `verification_mode`, `floor_level` | error | กฎข้อ 13 · NN-5 · `dungeons.json#verification` |
| `preset_unknown`, `level_range` | error | `data/dungeons/presets.json` · กฎข้อ 6 (min < max) |
| `drop_table_unknown`, `drop_tables_missing` | error | FR-11 · `paths.dropTables` |
| `name_key_missing`, `search_name_key_missing` / `*_unknown` | error / `validator.nameKeyMissing` | กฎข้อ 14 · `config/content/names.th.json` |
| `opening_hours_manual_required`, `opening_hours_outside_grammar`, `opening_hours_invalid` | error | F04-R26 · tech note 8.1 |
| `blocklist_tag`, `religious_name`, `osm_id_excluded` | error | กฎข้อ 8, 10 · D-006 · D-083 |
| `review_tag`, `review_name`, `review_osm_id` | review | กฎข้อ 9 (SF-9) |
| `review_flag_<ชื่อ>` | review | `coverageFilter.reviewFlagTags` + `validator.extraReviewFlagTags` (`civic_building` = `building=civic`, `roof` = `location=roof`) |
| `candidate_<flag>` | review | flag ของ candidate ที่ `osm_id` ตรง (`contains_religious_feature`, `crosses_major_way`, `review_required`) |
| `aspect_ratio` | review | กฎข้อ 12 · `coverageFilter.maxAspectRatio` (minRotatedRectangle) |
| `entrance_far_from_edge` | error | กฎข้อ 4 · `validator.entranceMaxBoundaryDistance_m` |
| `nav_fallback_label_point`, `entrance_unverified` | warning | A-3 ข้อ 3 · กฎข้อ 4 |
| `label_point_outside` | error | ตรวจความถูกต้องของจุดป้ายหลังปัดทศนิยม |

## ผลลัพธ์ (`data/dungeons/artifact/dungeons.client.v1.json`)

- รูปไฟล์ตาม tech note 13.2 และ `dungeon.schema.json#/$defs/artifactFile` (build ตรวจ artifact กับ schema ก่อนเขียน) · property whitelist 14 ตัวเท่านั้น ไม่มี `name_real`, tag OSM, `osm_id`, ข้อความเวลาทำการดิบ, flag, สถานะ
- `geometry`: ปัด `coordinateDecimals` แล้ว rewind (วงนอกทวนเข็ม) · `area_m2`, `bbox` คำนวณจาก geometry ที่ปัดแล้ว (ค่าเดียวกับที่ engine เห็น)
- `label_point`: polylabel ของ polygon ที่ใหญ่ที่สุด บนพิกัด equirectangular รอบจุดกลาง bbox (หน่วยเมตร, `labelPoint.precision_m`) · D-075
- `nav_destination`: ทางเข้าที่ปักไว้ (`entrance`) ไม่งั้นจุดป้าย (`label_point`) · ไม่ใช้ centroid (R37)
- `source_sha256`: sha256 ของ record ต้นทางที่ published (เรียงตาม id, JSON เรียง key) · `attribution` จาก `build.config.json` ตาม D-091
- ไฟล์อยู่ใต้ `data/` ซึ่ง prettier ข้าม จึงเทียบแบบ byte ได้ตรง

## ค่าตั้ง (`tools/dungeons/build.config.json`)

ค่าของเครื่องมือ ไม่ใช่ค่า balance (tech note 13.1) · เกณฑ์ที่เป็น balance อ่านจาก `config/balance/dungeons.json` (`area`, `verification`, `coverageFilter`) · path ของ input ทั้งหมดอยู่ใน `paths` · ตั้ง `paths.majorWays` เป็น GeoJSON เส้น (LineString/MultiLineString) เมื่อ `tools/coverage` ส่งออกชั้นถนนใหญ่/ราง/น้ำให้แล้ว

## Test (`tools/dungeons/test/`)

| ไฟล์ | ครอบ |
| --- | --- |
| `opening-hours.test.ts` | ข้อความที่แปลงได้ 15 แบบ (รวมข้ามเที่ยงคืน, วน `Sa-Mo`, `off`) · ข้อความที่ต้อง `manual_required` 15 แบบ · ตรวจตารางกรอกเอง |
| `geometry.test.ts` | UTM 47N เทียบ pyproj ≤ 1 มม. · พื้นที่ fixture เทียบ shapely ≤ 0.05 ตร.ม. · พื้นที่ส่วนทับ (hole, concave, MultiPolygon) · ความถูกต้องของ ring · ความยาวเส้นใน polygon · aspect ratio |
| `validate.test.ts` | fixture ที่ผ่าน · fixture ที่ไม่ผ่าน 27 แบบ (หนึ่ง code ต่อแบบ) · schema 8 แบบ · review ack, draft, retired, id ซ้ำ · excluded zone, flag ของ candidate, ถนนใหญ่ |
| `artifact.test.ts` | golden `test/fixtures/expected.client.v1.json` · deterministic (ซ้ำ/สลับลำดับ) · whitelist · rewind + ทศนิยม · จุดป้ายเลี่ยง hole · นำทาง fallback · แยกช่วงข้ามเที่ยงคืน · `source_sha256` |
| `committed.test.ts` | `data/dungeons/` ผ่าน validator และ artifact ที่ commit ตรงกับผล build |

## ข้อจำกัดที่รู้

- ยังไม่ตรวจระยะจากทางเข้าถึงทางเท้า OSM (`coverageFilter.maxEntranceGap_m`) เพราะยังไม่มีชั้นทางเท้าใน repo · ใช้ `entrance.evidence` + ระยะถึงขอบ polygon แทน
- ศาลเจ้าเล็กที่ไม่ใช่ candidate ไม่อยู่ใน `excluded.geojson` · กรณีนี้พึ่ง flag `candidate_contains_religious_feature` ที่ต้อง ack หลังวาดหลบแล้ว
- ลำดับกฎ OSM: ช่วงข้ามเที่ยงคืนของวันก่อนไม่ถูก `off` ของวันถัดไปลบ (บันทึกไว้ในหัวไฟล์ `src/opening-hours.ts`)
