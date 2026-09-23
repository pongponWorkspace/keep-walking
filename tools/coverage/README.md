# tools/coverage — pipeline สำรวจ coverage (F01)

- task: P1-F01-T05 · เจ้าของ: location-engineer · สเปกวิธีการ: `tools/coverage/METHOD.md` (P1-F01-T01)
- ทำอะไร: อ่าน OSM extract ประเทศไทย → ตัดขอบเขตกรุงเทพฯ + ปริมณฑล 5 จังหวัด (79 เขต/อำเภอ) → คัด tag 6 ชุดตาม GDD → คำนวณพื้นที่ใน EPSG:32647 (UTM 47N) → ตัด blocklist → เขียน `data/coverage/candidates.geojson` และ `data/coverage/excluded.geojson`
- ภาษา: Python (ADR 0001 หัวข้อ 3.11) · ไม่ใช่ workspace ของ pnpm · ไม่แตะ lockfile

## 1. คำสั่งเดียว

รันจากโฟลเดอร์ `tools/coverage/`

```sh
cd tools/coverage
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # ครั้งแรกครั้งเดียว
.venv/bin/python -m pipeline all                                     # ดาวน์โหลด + ตรวจ checksum + clip + คัด tag + พื้นที่ + blocklist + เขียนผล
```

- `all` = ขั้น 1 `fetch` (ข้ามไฟล์ที่มีอยู่แล้วและ SHA-256 ตรง) แล้วรันขั้น 2–8 บน D1
- `all --offline` = ไม่ใช้เน็ตเลย ตรวจแค่ checksum ของไฟล์ที่มีแล้ว (ใช้หลังดาวน์โหลดครั้งแรก)
- `fetch` = ดาวน์โหลดและตรวจอย่างเดียว · `--include-optional` ดึง D2 (WorldPop, ใช้ใน T06) และ D4 ด้วย
- `--skip-crosscheck` = ข้ามการเทียบพื้นที่เขตกับ geoBoundaries (ไม่ต้องมี D3 ขนาด 253 MiB)
- `run --osm <ไฟล์>` = รันบนไฟล์ OSM ที่ระบุ (ใช้กับ fixture ของ test หรือทดลอง) ต้องใช้คู่กับ `--params` ที่ระบุ `studyArea` ของไฟล์นั้น
- exit code: `0` สำเร็จ · `1` config ขาด / checksum ไม่ตรง / จำนวนจังหวัดหรือเขตไม่ตรง config (หยุดพร้อมรายชื่อ) · `2` ใช้คำสั่งผิด · `3` ไฟล์ที่จะ commit ใหญ่เกิน `pipeline.maxCommittedFileBytes`
- เวลาและทรัพยากรบน Apple M5 (macOS, Python 3.14.6): อ่าน PBF 39–40 วินาที · ทั้ง pipeline รวม cross-check ราว 45 วินาที
- ใน CI: ขั้น `fetch` ปฏิเสธการดาวน์โหลดเมื่อมี env `CI` (TL-S11) · CI รันเฉพาะ test บน fixture (หัวข้อ 6)

## 2. ติดตั้ง

- Python 3.11 ขึ้นไป · venv อยู่ที่ `tools/coverage/.venv/` (ถูก ignore) · ห้ามติดตั้ง global
- `requirements.txt` pin ตรงทุกตัวรวม transitive: `osmium==4.3.1` (pyosmium) `shapely==2.1.2` `pyproj==3.8.0` `numpy==2.5.3` `pytest==9.1.1` และ dependency ของมัน
- ตรวจแล้วว่า venv ใหม่จาก `requirements.txt` ติดตั้งผ่าน `pip check` ไม่มีปัญหา และ test ผ่าน (2026-09-23, macOS arm64)
- ไม่ต้องมี `osmium-tool`, GDAL หรือ binary อื่น · ไม่มี secret หรือ API key ใด (ทุกแหล่งเป็น HTTP GET ธรรมดา D-001)

## 3. ข้อมูลเข้า (ไม่เข้า git)

รายการ URL ขนาด และ SHA-256 อยู่ใน `params.json#pipeline.sources` (ตรงกับ METHOD หัวข้อ 4) · ไฟล์วางที่ `tools/coverage/downloads/` ซึ่ง `.gitignore` ครอบ (ตรวจด้วย `git check-ignore -v` แล้ว)

| id | ไฟล์ | ขนาด | ใช้ใน T05 |
| --- | --- | --- | --- |
| D1 | `thailand-260901.osm.pbf` (Geofabrik) | 326,905,982 byte (≈312 MiB) | จำเป็น |
| D2 | `tha_pop_2025_CN_100m_R2025A_v1.tif` (WorldPop) | 121,874,799 byte (≈116 MiB) | ไม่ใช้ (T06) |
| D3 | `geoBoundaries-THA-ADM2.geojson` | 265,765,263 byte (≈253 MiB) | ตรวจไขว้ขอบเขต (ข้ามได้) |
| D4 | `geoBoundaries-THA-ADM1.geojson` | 4,032,763 byte (≈3.8 MiB) | ไม่ใช้ |

- **วันที่ของข้อมูล OSM: `2026-09-01T20:20:50Z`** อ่านจาก header ของ PBF (`osmosis_replication_timestamp`) ทุกครั้งที่รัน และเขียนลง `coverage_meta.data_date` ของ GeoJSON ทุกไฟล์
- ถ้า Geofabrik ลบ `260901` ให้เลือก snapshot ต้นเดือนล่าสุด แก้ `url` `bytes` `sha256` `path` ของ D1 ใน `params.json` แล้วรันใหม่ (ห้ามใช้ `*-latest`)

## 4. ค่าที่อ่านจาก config (ไม่มีค่า default ในโค้ด)

| ค่า | อ่านจาก | หมายเหตุ |
| --- | --- | --- |
| `area.minArea_m2`, `area.maxArea_m2` | `config/balance/dungeons.json` | เทียบแบบรวมขอบ `min ≤ area_m2 ≤ max` บนค่าก่อนปัด |
| `verification.v1VerificationMode`, `v1FloorLevel` | `config/balance/dungeons.json` | เขียนลง `verification_mode` / `floor_level` ของทุก feature |
| `coverageFilter.*` (25 คีย์) | `config/balance/dungeons.json#coverageFilter` เท่านั้น | systems-designer ย้ายมาจาก `params.json` ใน P1-H03 (ค่าเท่ากันทุกคีย์) จึงปิด A-P1-F01-T01-1 · `params.json` ไม่มี `coverageFilter` แล้ว (แหล่งเดียว) · ค่าทั้งหมดยังเป็น **ค่าเสนอ** ตาม METHOD 8.2 |
| `pipeline.*` | `params.json#pipeline` | แหล่งข้อมูล, ขอบเขต 6 จังหวัด + จำนวนเขตที่คาด, tag 6 ชุด, CRS, ความละเอียดตัวเลข, seed สุ่มตรวจ, เพดานขนาดไฟล์, path output |

- คีย์ใดหายจาก config → หยุดด้วย `ConfigError` ทันที (มี test ยืนยัน) · แหล่งที่ใช้จริงและค่าทุกคีย์เขียนลง `coverage_meta.config`
- หมวด `religious` ปิดไม่ได้ (D-006) · config ที่พยายามปิดจะถูกปฏิเสธ
- ห้าม agent ใดนอกจาก systems-designer แก้ `config/balance/` · จะปรับค่าให้ส่ง handoff (test ของ pipeline สลับค่าผ่านสำเนาชั่วคราวของ `dungeons.json` เท่านั้น)
- คีย์ที่เพิ่มจาก METHOD หัวข้อ 8.2 (ค่าเสนอเช่นกัน): `blocklistDisabledCategories`, `blocklistDisabledTags`, `blocklistAreaOnlyTags`, `reviewTags`, `reviewNamePatterns`, `reviewMinAreaTags`, `outdoorBuildingValues`, `privateGardenTypes`, `majorWayTags`, `majorWayIgnoreIfTagged`, `majorWayAction`, `majorWayMinInsideLength_m` · เดิม METHOD เขียนค่าเหล่านี้เป็นข้อความในตาราง ตอนนี้ย้ายมาเป็นคีย์เพื่อไม่ให้มีค่าคงที่ในโค้ด

### 4.1 สวิตช์ของ decision ที่ยัง PROPOSED

| decision | ค่าตั้งต้น (ระวังไว้ก่อน) | วิธีปิด/เปลี่ยน | ผลบนข้อมูลจริง 2026-09-01 |
| --- | --- | --- | --- |
| D-026 หมวด `cemetery` | เปิด | เพิ่ม `"cemetery"` ใน `coverageFilter.blocklistDisabledCategories` | candidate 741 → 741 (ไม่เปลี่ยน: ทุกชิ้นที่โดนหมวดนี้ถูกตัดด้วยเหตุผลอื่นอยู่แล้ว ส่วนใหญ่เป็นหลุมศพเล็ก) |
| D-027 `education` รวมมหาวิทยาลัย/วิทยาลัย | รวม | เพิ่ม `amenity=university`, `amenity=college`, `building=university`, `building=college` ใน `coverageFilter.blocklistDisabledTags` | candidate 741 → **892 (+151)** เช่น สวนในจุฬาฯ ธรรมศาสตร์ ราชมงคล |
| D-028 `crosses_major_way` | `"flag"` (ติดธง ไม่ตัด) | `coverageFilter.majorWayAction`: `"flag"` / `"exclude"` / `"off"` | 51 candidate ติดธง · ถ้าเป็น `exclude` จะหายไปจาก candidates |

## 5. ขั้นตอนและจุดที่ต่างจาก METHOD

| ขั้น | โมดูล | ทำอะไร |
| --- | --- | --- |
| 1 fetch | `pipeline/fetch.py` | ดาวน์โหลดเป็น `.part` แล้ว rename · ตรวจ SHA-256 ทุกครั้ง · ไม่ตรงหลังดาวน์โหลด = ลบไฟล์แล้วหยุด |
| 2 boundaries | `pipeline/boundaries.py` | 6 จังหวัดตาม relation id · เขต/อำเภอ `admin_level=6` ที่ representative point อยู่ในจังหวัด · assert จำนวนต่อจังหวัด · เทียบพื้นที่กับ geoBoundaries (เตือน ไม่หยุด) |
| 3 extract | `pipeline/osm_read.py`, `process.extract` | อ่าน PBF รอบเดียว กรองใน C++ ด้วย `KeyFilter` (key สร้างจาก config) + `TagFilter` ของ way สายหลัก · candidate = representative point อยู่ใน union 6 จังหวัด · blocker = แตะ union |
| 4 normalize | `process.normalize` | `make_valid` เฉพาะชิ้นที่เสีย · multipolygon หลายผืนที่ห่างเกิน `multipartMaxGap_m` → `multipart_disjoint` |
| 5 area | `process.compute_area` | พื้นที่ใน `pipeline.projectedCrs` หลังหักรู · `size_band` |
| 6 blocklist | `process.blocklist` | กฎ 6.1 (access, indoor, ตลาดในอาคาร, สวนส่วนตัว) · R1–R4 · สัดส่วน 7.2 ทุกหมวด · flag `review_required`, `contains_religious_feature`, `crosses_major_way` |
| 6b overlap | `process.resolve_overlaps` | ซ้ำ / ซ้อนใน / `split_candidate` / ทับบางส่วน (6.3) ประมวลผลใหญ่ไปเล็ก |
| 7 assign | `process.assign_districts` | เขตที่ทับมากสุด · `multi_district` |
| 8 write | `pipeline/output.py`, `run.py` | GeoJSON เรียงตาม `id` พิกัด 6 ตำแหน่ง วงนอกทวนเข็มตาม RFC 7946 |

จุดที่ตัดสินใจเพิ่มหรือต่างจาก METHOD (บันทึกไว้เพื่อให้ QA ตรวจตาม)

1. **ตรวจซ้ำ/ซ้อน (6.3) หลัง blocklist** และเฉพาะชิ้นที่ผ่านทุกกฎยกเว้นพื้นที่ · เหตุผล: ชิ้นแม่ที่ถูกตัดเพราะกฎอื่น (เช่น ทับโรงพยาบาลบางส่วน) ไม่ควรกลืนชิ้นลูกที่ใช้ได้ · ลำดับความสำคัญของ `reason_excluded` ยังตาม METHOD 9.4
2. **ชิ้นที่ติด tag blocklist เอง** (เช่น สนามที่ tag `amenity=school` ด้วย) ถูกตัดเป็น `blocked_<หมวด>` (share = 1) · ศาสนาเป็น `religious_self` ตาม R1
3. **`review_required` สืบทอดจากชิ้นแม่** ที่เป็น `split_candidate`: พบบนข้อมูลจริงว่า "พระที่นั่งอัมพรสถาน" "พระที่นั่งวิมานเมฆ" "สวนอัมพร" อยู่ในเขตพระราชวังดุสิต ถ้าไม่สืบทอดจะเป็น candidate ไม่มีธง · เพิ่ม "พระที่นั่ง" "ตำหนัก" "พระราชฐาน" ใน `reviewNamePatterns` ด้วย
4. **`run-meta.json`, `points-unmatched.geojson`, `excluded-full.geojson`, `boundaries.geojson` ไปที่ `tools/coverage/out/`** (ignore) เพราะงานนี้ได้สิทธิ์เขียนใน `data/coverage/` แค่สองไฟล์ · ข้อมูลที่ต้องใช้ตรวจ (data_date, checksum, config, จำนวนต่อขั้น, ชุดสุ่มตรวจ, license) ฝังใน `coverage_meta` ของ GeoJSON ที่ commit แล้ว โดยไม่มีเวลารันจึงยังรันซ้ำได้ byte เดิม · เวลารันและเวอร์ชัน package อยู่ใน `out/run-meta.json` เท่านั้น
5. **บีบ `excluded.geojson` ให้ผ่านเพดาน CI guard** (5,242,880 byte, `pipeline.maxCommittedFileBytes`) แบบเป็นขั้นจนกว่าจะผ่าน: `trim_tags` (เหลือ key ใน `excludedTrimTagKeys`) → `drop_derived_properties` (`district`, `district_en`, `province`, `verification_mode`, `floor_level` ซึ่งหาได้จาก `district_osm_id`/`province_iso` และค่าคงที่ใน meta) → `point_geometry_area_only` (ชิ้นที่ตกแค่เรื่องพื้นที่ใช้ geometry เป็นจุด `rep_point`) → `point_geometry_all` · ขั้นที่ใช้จริงบันทึกใน `coverage_meta.excluded_compaction` · ตัวเต็ม schema ครบอยู่ที่ `out/excluded-full.geojson` · `candidates.geojson` ไม่ถูกบีบเลย
6. property เพิ่มใน schema 9.1: `rep_point` `[lon, lat]` (จุดใน polygon สำหรับวัดระยะใน T06) · `related_ids.blockers.<หมวด> = { ids, share }` มีทั้งใน candidates และ excluded
7. ระยะเดิน: T05 ไม่คำนวณระยะ · T06 ใช้ `rep_point` หรือ geometry แล้วคูณ route factor ตาม PRD F01 หัวข้อ 3 (ต้องระบุแหล่งของตัวคูณใน T06)

## 6. Test

```sh
cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q      # 85 test, ไม่ถึง 1 วินาที, ไม่ใช้เน็ต
.venv/bin/python -m pytest pipeline/tests -q -s -k print_case_table    # พิมพ์ตาราง case → expected → actual
```

- fixture: `pipeline/tests/fixture_osm.py` วาด OSM XML สังเคราะห์ด้วยมือ (ไม่ได้ตัดจาก OSM จึงไม่ติด ODbL) ใน UTM 47N แถวกรุงเทพฯ · 1 จังหวัด 2 เขต 38 case polygon + 4 case จุดและนอกพื้นที่ · สร้างไฟล์ `.osm.xml` ขนาดราว 24 KB ใน temp ตอนรัน test แล้วรันผ่าน CLI จริง (`python -m pipeline run`)
- ครอบคลุม: ขอบพื้นที่ 2,999 / 3,000 / 150,000 / 150,001 (unit บนค่าจาก config และ round-trip WGS84↔UTM) · ทุกแถวของ METHOD 7.4 · multipolygon มีรู · way/relation ซ้ำ · nested · `split_candidate` · access / indoor market / private garden · คร่อมสองเขต · ถนนหลักตัดผ่าน และสะพานไม่นับ · POI ข้างใน / เดี่ยว / ศาสนา · ศาสนาบนตัวเอง · multipart ห่าง/ใกล้ · ชิ้นนอกพื้นที่ · สืบทอดธง review
- config: area / verification / coverageFilter มาจาก dungeons.json เท่านั้น · คีย์หาย = หยุด · สลับ `minArea_m2` และ `maxBlockedShare.religious` แล้วผลเปลี่ยน · สวิตช์ D-026 D-027 D-028 · ปิดหมวดศาสนาไม่ได้ · จำนวนเขตไม่ตรง = exit 1
- รันซ้ำได้ byte เดิม (SHA-256 เท่ากัน) · fetch: ดาวน์โหลด/ข้าม/checksum ผิดแล้วลบ/ห้ามดาวน์โหลดใน CI (ใช้ `file://` ไม่ใช้เน็ต)
- **จาก root:** `pipeline/tests/pytest-bridge.test.ts` เป็น Vitest test ที่เรียก pytest ด้านบน (ข้ามพร้อมคำเตือนถ้าไม่มี `.venv` · บังคับรันเมื่อ `COVERAGE_PYTEST_REQUIRED=1`) · ต้องให้ tech-lead เพิ่ม glob `tools/coverage/pipeline/tests/**/*.test.ts` ใน `vitest.config.ts` จึงจะรันจาก `pnpm test` (ดูรายงาน P1-F01-T05) · CI ต้องสร้าง venv ก่อน: `python3 -m venv tools/coverage/.venv && tools/coverage/.venv/bin/pip install -r tools/coverage/requirements.txt`

## 7. ผลรอบจริง (D1 = OSM 2026-09-01T20:20:50Z, รัน 2026-09-23)

คำสั่ง `.venv/bin/python -m pipeline all --offline` · exit 0 · 45 วินาที · รันสองรอบได้ SHA-256 เท่ากัน: `candidates.geojson` `8237f065…4b563503` · `excluded.geojson` `ea8b1206…ae9c3f7b` (ค่าเต็มดูได้ด้วย `shasum -a 256 data/coverage/*.geojson`)

**ก่อนและหลังแต่ละขั้น**

| ขั้น | เข้า | ออก | หมายเหตุ |
| --- | --- | --- | --- |
| อ่านไฟล์ | | 55,453 area · 36,547 node · 81,853 way สายหลัก | ทั้งประเทศ หลังกรอง tag |
| 2 boundaries | | 6 จังหวัด · 79 เขต/อำเภอ | ตรงกับที่คาด · geoBoundaries เตือน 2 เขต: ทุ่งครุ (ต่าง 15.9%) พระสมุทรเจดีย์ (6.3%) ขอบชายฝั่ง/ขอบเขตต่างรุ่น ไม่หยุด |
| 3 extract | 16,574 candidate ทั้งประเทศ | 7,028 candidate ในพื้นที่ | blocker 11,055 (area 8,718 · node 2,337) · POI node 638 · way สายหลัก 20,204 · ประกอบ area ไม่สำเร็จ 0 |
| 4 normalize | 7,028 | 7,026 | repaired 0 · multipart_disjoint 2 |
| 5 area | 7,026 | 1,591 | นอกช่วง 3,000–150,000 ตร.ม. 5,435 |
| 6 blocklist | 1,591 | 749 | |
| 6b overlap | 749 | **741** | nested / duplicate 8 |

**candidates 741** · excluded 6,287 · POI ที่ไม่อยู่ใน candidate 572 (`out/points-unmatched.geojson`) · candidate ที่หาเขตไม่ได้ 0

| แยกตาม | ค่า |
| --- | --- |
| class | park 369 · marketplace 141 · garden 115 · pitch 98 · historic 10 · attraction 8 |
| size_band | small 454 · medium 237 · large 50 |
| จังหวัด | TH-10 กรุงเทพฯ 459 · TH-13 ปทุมธานี 76 · TH-12 นนทบุรี 75 · TH-11 สมุทรปราการ 67 · TH-74 สมุทรสาคร 35 · TH-73 นครปฐม 29 |
| flag | crosses_major_way 51 · contains_religious_feature 26 · review_required 11 · multi_district 6 |

`reason_excluded` (เหตุผลลำดับแรกของแต่ละชิ้น): area_too_small 1,693 · access_private 1,527 · blocked_education 898 · blocked_cemetery 491 · private_garden 474 · blocked_religious 418 · blocked_military 295 · blocked_government 152 · religious_self 114 · indoor_market 107 · blocked_health 31 · religious_inside_heritage 28 · blocked_diplomatic 24 · area_too_large 21 · nested_in 8 · indoor 3 · religious_name 2 · multipart_disjoint 1

ข้อสังเกตสำหรับ T06 / T07

- สวนใหญ่ที่คนรู้จักเกือบทั้งหมดใหญ่เกิน 150,000 ตร.ม. จึงอยู่ใน excluded เป็น `area_too_large` + `split_candidate` (สวนหลวง ร.๙, สวนลุมพินี, สวนป่าเบญจกิติ, สวนวชิรเบญจทัศ ฯลฯ) · ชิ้นย่อยที่อยู่ในช่วงเป็น candidate ได้ · ถ้าจะใช้ทั้งสวนต้องแบ่งเป็นหลาย dungeon ภายหลัง
- `blocked_cemetery` 491 ส่วนใหญ่เป็นหลุมศพ `historic=tomb` ขนาดเล็กในสุสานเดียว (ตกเรื่องพื้นที่อยู่แล้ว) · `blocked_military` ส่วนใหญ่เป็นสวน/สนามในค่ายทหาร
- `excluded.geojson` ใช้การบีบ 3 ขั้นแรก (หัวข้อ 5 ข้อ 5) ขนาด 4,984,195 byte · `candidates.geojson` 881,482 byte

## 8. ตาราง case → expected → actual (fixture, ผลรันล่าสุด)

| case | expected | actual | flag ที่ตรวจ |
| --- | --- | --- | --- |
| park_too_small (2,990 ตร.ม.) | area_too_small | area_too_small | |
| park_at_min (3,010) | candidate | candidate | |
| park_at_max (149,950) | candidate | candidate | |
| park_too_large (150,050) | area_too_large | area_too_large | |
| park_small_shrine_polygon (7.4 แถว 1) | candidate | candidate | contains_religious_feature |
| park_sala_400 (7.4 แถว 2) | blocked_religious | blocked_religious | |
| park_20k_pow_node (7.4 แถว 3) | candidate | candidate | contains_religious_feature |
| park_4k_pow_node (7.4 แถว 4) | blocked_religious | blocked_religious | |
| attraction_pow_node (7.4 แถว 5) | religious_inside_heritage | religious_inside_heritage | |
| historic_wat_name (7.4 แถว 6) | religious_name | religious_name | |
| market_in_temple (7.4 แถว 7) | blocked_religious | blocked_religious | |
| pitch_in_school (7.4 แถว 8) | blocked_education | blocked_education | |
| park_hospital_fence (7.4 แถว 9) | candidate | candidate | |
| mp_with_hole (7,500) | candidate | candidate | |
| dup_way / dup_relation | duplicate_of / candidate | duplicate_of / candidate | |
| nested_parent / nested_pitch | candidate / nested_in | candidate / nested_in | |
| split_parent / split_child | area_too_large / candidate | area_too_large / candidate | split_candidate |
| palace_ground_large / throne_hall_inside | area_too_large / candidate | area_too_large / candidate | review_required ทั้งคู่ |
| garden_private · market_indoor · garden_residential | access_private · indoor_market · private_garden | ตรงทั้งหมด | |
| park_crossed_by_primary / park_under_bridge | candidate / candidate | candidate / candidate | crosses_major_way / ไม่มี |
| overlap_a · overlap_b | candidate | candidate | overlaps_candidate |
| palace · park_wat_name | candidate | candidate | review_required |
| park_multi_district | candidate | candidate | multi_district |
| park_in_cemetery · pitch_in_university | blocked_cemetery · blocked_education | ตรงทั้งหมด | |
| park_is_temple | religious_self | religious_self | |
| multipart_far / multipart_near | multipart_disjoint / candidate | multipart_disjoint / candidate | |
| park_with_poi | candidate | candidate | poi_inside มี 1 จุด |

## 9. License ของ output

`candidates.geojson` และ `excluded.geojson` เป็น derived database จาก OpenStreetMap: **© OpenStreetMap contributors, ODbL 1.0** (เขียนใน `coverage_meta.attribution` และ `coverage_meta.license` ของทุกไฟล์) · repo เป็น public จึงผ่าน share-alike · ถ้าจะรวม polygon เข้าฐานข้อมูล dungeon ของเกม (Phase 2) ต้องถาม HUMAN ก่อน (METHOD หัวข้อ 3)
