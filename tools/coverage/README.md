# tools/coverage — pipeline สำรวจ coverage (F01)

- task: P1-F01-T05 (pipeline) · P1-F01-T06 (แก้ช่องโหว่ P1-X08 + analysis รายเขต หัวข้อ 10) · เจ้าของ: location-engineer · สเปกวิธีการ: `tools/coverage/METHOD.md` (P1-F01-T01)
- ทำอะไร: อ่าน OSM extract ประเทศไทย → ตัดขอบเขตกรุงเทพฯ + ปริมณฑล 5 จังหวัด (79 เขต/อำเภอ) → คัด tag 6 ชุดตาม GDD → คำนวณพื้นที่ใน EPSG:32647 (UTM 47N) → ตัด blocklist → เขียน `data/coverage/candidates.geojson` และ `data/coverage/excluded.geojson`
- ภาษา: Python (ADR 0001 หัวข้อ 3.11) · ไม่ใช่ workspace ของ pnpm · ไม่แตะ lockfile

## 1. คำสั่งเดียว

รันจากโฟลเดอร์ `tools/coverage/`

```sh
cd tools/coverage
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # ครั้งแรกครั้งเดียว
.venv/bin/python -m pipeline all                                     # ดาวน์โหลด + ตรวจ checksum + clip + คัด tag + พื้นที่ + blocklist + เขียนผล
.venv/bin/python -m analysis all --offline                           # คำสั่งเดียวรันทุกอย่าง: pipeline ข้างบน + นับรายเขต + ระยะเดิน + Launch Score + heatmap (หัวข้อ 10)
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
| D2 | `tha_pop_2025_CN_100m_R2025A_v1.tif` (WorldPop) | 121,874,799 byte (≈116 MiB) | ไม่ใช้ใน pipeline · analysis T06 ใช้ (หัวข้อ 10) |
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

- คีย์ใดหายจาก config → หยุดด้วย `ConfigError` ทันที (มี test ยืนยัน) · แหล่งที่ใช้จริงและค่าของคีย์ที่ pipeline อ่านเขียนลง `coverage_meta.config` (เฉพาะ 25 คีย์ที่อ่านจริง หัวข้อ 5 ข้อ 10)
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
4. **`points-unmatched.geojson` ย้ายไป `data/coverage/` แล้ว (P1-F01-T06, `params.json#pipeline.outputs.pointsUnmatched`)** · `run-meta.json` ของ pipeline, `excluded-full.geojson`, `boundaries.geojson` ยังอยู่ที่ `tools/coverage/out/` (ignore) · `data/coverage/run-meta.json` ที่ commit เป็นของ analysis (หัวข้อ 10) ซึ่งรวมส่วนสำคัญของ run meta ของ pipeline ไว้ในคีย์ `pipeline` · ข้อมูลที่ต้องใช้ตรวจ (data_date, checksum, config, จำนวนต่อขั้น, ชุดสุ่มตรวจ, license) ฝังใน `coverage_meta` ของ GeoJSON ที่ commit แล้ว โดยไม่มีเวลารันจึงยังรันซ้ำได้ byte เดิม · เวลารันและเวอร์ชัน package อยู่ใน `out/run-meta.json` เท่านั้น
5. **บีบ `excluded.geojson` ให้ผ่านเพดาน CI guard** (5,242,880 byte, `pipeline.maxCommittedFileBytes`) แบบเป็นขั้นจนกว่าจะผ่าน: `trim_tags` (เหลือ key ใน `excludedTrimTagKeys`) → `drop_derived_properties` (`district`, `district_en`, `province`, `verification_mode`, `floor_level` ซึ่งหาได้จาก `district_osm_id`/`province_iso` และค่าคงที่ใน meta) → `point_geometry_area_only` (ชิ้นที่ตกแค่เรื่องพื้นที่ใช้ geometry เป็นจุด `rep_point`) → `point_geometry_all` · ขั้นที่ใช้จริงบันทึกใน `coverage_meta.excluded_compaction` · ตัวเต็ม schema ครบอยู่ที่ `out/excluded-full.geojson` · `candidates.geojson` ไม่ถูกบีบเลย · รอบ 2026-09-23 (T06): ใช้ `trim_tags` → `omit_empty_values` → `drop_derived_properties` (ไม่มีขั้นแปลง geometry เป็นจุด) ขนาด 4,085,085 byte = 77.9% ของเพดาน (เผื่อ 22.1%)
6. property เพิ่มใน schema 9.1: `rep_point` `[lon, lat]` (จุดใน polygon สำหรับวัดระยะใน T06) · `related_ids.blockers.<หมวด> = { ids, share }` มีทั้งใน candidates และ excluded
7. ระยะเดิน: T05 ไม่คำนวณระยะ · T06 คำนวณด้วย routing บนโครงข่ายทางเดิน OSM ตาม PRD F01 หัวข้อ 8.1 (หัวข้อ 10) ไม่ใช้ route factor เป็นค่าหลัก
8. **R2 ตรวจ "ข้างใน" ด้วยวงนอก (P1-F01-T06, แก้ GEO-02):** ศาสนสถานที่อยู่ในวงนอกของชิ้น `historic` / `attraction` นับเป็น "ข้างใน" แม้จะวาดเป็นรู (inner ring) ตามหลักระวังไว้ก่อนของ D-006 · id ของศาสนสถานที่ทำให้ตัดบันทึกใน `related_ids.religious_inside_heritage` · ชิ้นคลาสอื่น (สวน ตลาด) ยังใช้กฎสัดส่วน R4/7.2 บนพื้นที่หลังหักรูเหมือนเดิม (fixture `park_temple_hole` ยังเป็น candidate)
9. **way ที่ไม่ปิดแต่มี tag candidate ลง `assembly_failed` (P1-F01-T06, แก้ GEO-11):** pyosmium ข้าม way ที่ไม่ปิดโดยไม่แจ้ง จึงอ่านไฟล์รอบที่สองเฉพาะ way + relation (ไม่ต้องมีพิกัด ใช้เวลาไม่ถึง 1 วินาทีบนไฟล์ทั้งประเทศ) · way ที่มี tag candidate แต่ไม่กลายเป็น area ถูกบันทึกเป็น `osm-w<id>` · ยกเว้น way ไม่ปิดที่เป็นสมาชิกของ relation multipolygon ที่มี tag candidate (relation นั้นถูกตรวจแยกอยู่แล้ว) · นับทั้งไฟล์ (ทั้งประเทศ) เหมือนการนับ relation เดิม
10. **`coverage_meta.config` บันทึกเฉพาะคีย์ที่ pipeline อ่านจริง (P1-F01-T06):** `coverageFilter` ใน meta ของ GeoJSON ที่ commit มีแค่ 25 คีย์ใน `config.REQUIRED_FILTER_KEYS` (เรียงตามลำดับนั้น) · คีย์อื่นใน `dungeons.json#coverageFilter` (`walk*`, `educationAllowOsmIds`, `maxAspectRatio`, `aspectRatio*`, `maxEntranceGap_m`) ไม่ถูกเขียน เพราะ pipeline ไม่ได้ใช้ · คีย์ `walk*` ที่ analysis ใช้บันทึกใน `data/coverage/run-meta.json#config.coverageFilter` แทน · หมายเหตุ: `out/run-meta.json` (ไม่ commit) ยังเขียน config เต็มเพราะ `run.py` อยู่นอกขอบเขตงานนี้

## 6. Test

```sh
cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q      # 176 test (pipeline + analysis) ราว 1 วินาที ไม่ใช้เน็ต
.venv/bin/python -m pytest pipeline/tests -q -s -k print_case_table    # พิมพ์ตาราง case → expected → actual (pipeline)
.venv/bin/python -m pytest pipeline/tests -q -s -k print_analysis_case_table   # ตารางของ analysis (หัวข้อ 10.6)
```

- fixture: `pipeline/tests/fixture_osm.py` วาด OSM XML สังเคราะห์ด้วยมือ (ไม่ได้ตัดจาก OSM จึงไม่ติด ODbL) ใน UTM 47N แถวกรุงเทพฯ · 1 จังหวัด 2 เขต 38 case polygon + 4 case จุดและนอกพื้นที่ · สร้างไฟล์ `.osm.xml` ขนาดราว 24 KB ใน temp ตอนรัน test แล้วรันผ่าน CLI จริง (`python -m pipeline run`)
- ครอบคลุม: ขอบพื้นที่ 2,999 / 3,000 / 150,000 / 150,001 (unit บนค่าจาก config และ round-trip WGS84↔UTM) · ทุกแถวของ METHOD 7.4 · multipolygon มีรู · way/relation ซ้ำ · nested · `split_candidate` · access / indoor market / private garden · คร่อมสองเขต · ถนนหลักตัดผ่าน และสะพานไม่นับ · POI ข้างใน / เดี่ยว / ศาสนา · ศาสนาบนตัวเอง · multipart ห่าง/ใกล้ · ชิ้นนอกพื้นที่ · สืบทอดธง review
- config: area / verification / coverageFilter มาจาก dungeons.json เท่านั้น · คีย์หาย = หยุด · สลับ `minArea_m2` และ `maxBlockedShare.religious` แล้วผลเปลี่ยน · สวิตช์ D-026 D-027 D-028 · ปิดหมวดศาสนาไม่ได้ · จำนวนเขตไม่ตรง = exit 1
- รันซ้ำได้ byte เดิม (SHA-256 เท่ากัน) · fetch: ดาวน์โหลด/ข้าม/checksum ผิดแล้วลบ/ห้ามดาวน์โหลดใน CI (ใช้ `file://` ไม่ใช้เน็ต)
- **จาก root:** `pipeline/tests/pytest-bridge.test.ts` เป็น Vitest test ที่เรียก pytest ด้านบน (ข้ามพร้อมคำเตือนถ้าไม่มี `.venv` · บังคับรันเมื่อ `COVERAGE_PYTEST_REQUIRED=1`) · ต้องให้ tech-lead เพิ่ม glob `tools/coverage/pipeline/tests/**/*.test.ts` ใน `vitest.config.ts` จึงจะรันจาก `pnpm test` (ดูรายงาน P1-F01-T05) · CI ต้องสร้าง venv ก่อน: `python3 -m venv tools/coverage/.venv && tools/coverage/.venv/bin/pip install -r tools/coverage/requirements.txt`

## 7. ผลรอบจริง (D1 = OSM 2026-09-01T20:20:50Z, regenerate 2026-09-23 ใน P1-F01-T06)

คำสั่ง `.venv/bin/python -m pipeline all --offline` (หรือ `python -m analysis all --offline` ซึ่งเรียกคำสั่งเดียวกันแล้วได้ byte เดียวกัน) · exit 0 · 46 วินาที · รันซ้ำได้ SHA-256 เท่ากัน

| ไฟล์ | ก่อน T06 | หลัง T06 (regenerate ครั้งเดียว) | byte |
| --- | --- | --- | --- |
| `data/coverage/candidates.geojson` | `8237f065015a37ae7317b57215013effe33ead16748f66e4b6d078ea4b563503` | `d3937a672645a81194faa3368a0eb314bf1abb09e11444270b2c67254eb074f4` | 882,636 |
| `data/coverage/excluded.geojson` | `05b656362c39727ccbcae78925f5274c7c2e218c33edb0748e45ba472425df5f` | `f3590c86702f933ba7ad4aea4aa7355102aeee1cc4fc0ca0638b44d490730442` | 4,085,085 |
| `data/coverage/points-unmatched.geojson` | (อยู่ใน `out/`) | `dba06808073021f0f0fa9ba3fc6516091c482572b69c31755341e246e36d64be` | 302,838 |

**สิ่งที่เปลี่ยนจากการแก้ P1-X08 ทั้ง 3 ข้อ (เทียบ 741 / 6,287 เดิม)**

- จำนวน **ไม่เปลี่ยน**: candidates 741 · excluded 6,287 · id ชุดเดิมทั้งสองไฟล์ · feature ใน candidates เหมือนเดิมทุกตัว (เปลี่ยนเฉพาะ `coverage_meta`) · `reasons_all` ทุกชิ้นใน excluded เหมือนเดิม
- R2 วงนอก: บนข้อมูลจริงไม่มีศาสนสถานที่เป็นรูของชิ้น historic/attraction จึงไม่มีชิ้นเปลี่ยนเหตุผล · 61 ชิ้นใน excluded ได้ `related_ids.religious_inside_heritage` (id ศาสนสถานที่ทำให้ตัด) เพิ่ม
- `assembly_failed` 0 → **67** (ทั้งประเทศ, way ทั้งหมด ไม่มี relation): way ไม่ปิด 66 + way ปิดที่ประกอบไม่ได้ 1 · ส่วนใหญ่ `tourism=attraction` 34 · `historic=ruins` 17 · `historic=castle_wall` 6 (เส้นกำแพงเมือง ไม่ใช่พื้นที่) · รายการเต็มใน `coverage_meta.counts.extract.assembly_failed`
- `coverage_meta.config.coverageFilter` ใน excluded 34 → 25 คีย์ (candidates เป็น 25 อยู่แล้วเพราะ commit ก่อน P1-X04 เพิ่มคีย์)

**ก่อนและหลังแต่ละขั้น**

| ขั้น | เข้า | ออก | หมายเหตุ |
| --- | --- | --- | --- |
| อ่านไฟล์ | | 55,453 area · 36,547 node · 81,853 way สายหลัก | ทั้งประเทศ หลังกรอง tag |
| 2 boundaries | | 6 จังหวัด · 79 เขต/อำเภอ | ตรงกับที่คาด · geoBoundaries เตือน 2 เขต: ทุ่งครุ (ต่าง 15.9%) พระสมุทรเจดีย์ (6.3%) ขอบชายฝั่ง/ขอบเขตต่างรุ่น ไม่หยุด |
| 3 extract | 16,574 candidate ทั้งประเทศ | 7,028 candidate ในพื้นที่ | blocker 11,055 (area 8,718 · node 2,337) · POI node 638 · way สายหลัก 20,204 · ประกอบ area ไม่สำเร็จ 67 (ทั้งประเทศ, เดิมนับได้ 0 เพราะไม่เห็น way ไม่ปิด) |
| 4 normalize | 7,028 | 7,026 | repaired 0 · multipart_disjoint 2 |
| 5 area | 7,026 | 1,591 | นอกช่วง 3,000–150,000 ตร.ม. 5,435 |
| 6 blocklist | 1,591 | 749 | |
| 6b overlap | 749 | **741** | nested / duplicate 8 |

**candidates 741** · excluded 6,287 · POI ที่ไม่อยู่ใน candidate 572 (`data/coverage/points-unmatched.geojson`) · candidate ที่หาเขตไม่ได้ 0

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
- `excluded.geojson` ใช้การบีบ 3 ขั้นที่ไม่เสียข้อมูล (หัวข้อ 5 ข้อ 5) ขนาด 4,085,085 byte · `candidates.geojson` 882,636 byte

## 8. ตาราง case → expected → actual (fixture, ผลรันล่าสุด 2026-09-23 หลัง P1-F01-T06)

| case | expected | actual | flag ที่ตรวจ |
| --- | --- | --- | --- |
| park_too_small (2,999 ตร.ม.) | area_too_small | area_too_small | |
| park_at_min (3,000) | candidate | candidate | |
| park_at_max (150,000) | candidate | candidate | |
| park_too_large (150,001) | area_too_large | area_too_large | |
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
| park_temple_hole (GEO-02, สวนมีวัดเป็นรู) | candidate | candidate | บันทึกวัดใน `related_ids.blockers.religious` share 0 |
| attraction_temple_hole (GEO-02, attraction มีวัดเป็นรู) | religious_inside_heritage | religious_inside_heritage (เดิม xfail) | `related_ids.religious_inside_heritage` |
| touch_a · touch_b (GEO-07, ทับกัน 2% < 5%) | candidate · candidate | candidate · candidate | ไม่มี overlaps_candidate |
| assembly_bowtie · assembly_open_relation (GEO-11) | assembly_failed | assembly_failed | |
| unclosed_way (GEO-11, way `leisure=park` ไม่ปิด) | assembly_failed | assembly_failed (เดิม xfail) | |
| coverage_meta.config (P1-X08 ข้อ 3) | 25 คีย์ที่อ่านจริง | 25 คีย์ | test `test_meta_config_lists_only_keys_the_pipeline_reads` |

## 9. License ของ output

รายละเอียดทุกไฟล์ใน `data/coverage/` (รวม `district-counts.csv` และ heatmap ที่ใช้ WorldPop CC BY 4.0) อยู่ใน `data/coverage/LICENSE-DATA.md` · `candidates.geojson` `excluded.geojson` `points-unmatched.geojson` เป็น derived database จาก OpenStreetMap: **© OpenStreetMap contributors, ODbL 1.0** (เขียนใน `coverage_meta.attribution` และ `coverage_meta.license` ของทุกไฟล์) · repo เป็น public จึงผ่าน share-alike · ถ้าจะรวม polygon เข้าฐานข้อมูล dungeon ของเกม (Phase 2) ต้องถาม HUMAN ก่อน (METHOD หัวข้อ 3)

## 10. Analysis รายเขต (P1-F01-T06): `tools/coverage/analysis/`

### 10.1 คำสั่งเดียวและเวลา

```sh
cd tools/coverage
.venv/bin/python -m analysis all --offline   # fetch/verify D1-D4 → pipeline all → analysis (ใช้ไฟล์ที่ดาวน์โหลดแล้ว ไม่ใช้เน็ต)
.venv/bin/python -m analysis all             # เหมือนกันแต่ดาวน์โหลดไฟล์ที่ขาด (D2 ≈116 MiB)
.venv/bin/python -m analysis run             # analysis อย่างเดียว บน output ของ pipeline ที่มีอยู่
.venv/bin/python -m analysis run --no-cache  # สร้างกราฟทางเดินใหม่จาก D1 ไม่ใช้ cache
```

- เวลาบน Apple M5: `all --offline` ≈ 62 วินาทีเมื่อมี cache กราฟ · ≈ 104 วินาทีเมื่อสร้างกราฟใหม่ (อ่านกราฟจาก PBF 41 วินาที, routing 3 รอบ + metric 13 วินาที) · หน่วยความจำสูงสุด ≈ 1.7 GB
- cache กราฟ: `tools/coverage/cache/walk-graph-<key>.npz` (≈208 MB, ignore) · key = SHA-256 ของ D1 + ค่า config ที่ใช้สร้างกราฟ + bbox + `ANALYSIS_VERSION` · รันแบบมี cache กับ `--no-cache` ได้ `district-counts.csv` และ heatmap byte เดียวกัน
- exit code: `0` สำเร็จ · `1` config ขาด / checksum D1 หรือ D2 ไม่ตรง / ไฟล์ขาด · `3` ไฟล์ output ใหญ่เกิน `pipeline.maxCommittedFileBytes`
- ไม่เพิ่ม dependency: ใช้ `osmium` `shapely` `pyproj` `numpy` ที่ pin ใน `requirements.txt` อยู่แล้ว (เหตุผลในหัวข้อ 10.3) · อ่าน GeoTIFF ของ WorldPop ด้วยตัวอ่านขนาดเล็กใน `analysis/raster.py` (BigTIFF, tile, LZW + predictor 2) ไม่ต้องมี GDAL / rasterio

### 10.2 ข้อมูลเข้าและ output

| ไฟล์ | บทบาท | deterministic |
| --- | --- | --- |
| `data/coverage/candidates.geojson`, `tools/coverage/out/boundaries.geojson` | จาก pipeline (ขอบเขต 79 เขตและพื้นที่ใน EPSG:32647) | |
| D1 `thailand-260901.osm.pbf` | กราฟทางเดิน + สถานีรถไฟฟ้า/ป้ายรถเมล์ | |
| D2 WorldPop R2025A constrained 100 ม. | ประชากรต่อช่อง (ใช้เชิงเปรียบเทียบ ไม่ใช่ตัวเลขทะเบียนราษฎร์) | |
| `data/dungeons/presets.json` | กฎ preset แบบ class ก่อน (`presets[].matches`) | |
| `analysis/launch-score.config.json` | น้ำหนัก Launch Score, โซนระยะ, ชนิดทางเดิน, tag ขนส่ง (ค่าวิเคราะห์ ไม่ใช่ค่าเกม ตาม launch-criteria หัวข้อ 3) | |
| `config/balance/dungeons.json#coverageFilter` | `walkGraphSnapMaxDistance_m`, `excludeAccessValues`, `sizeBandUpper_m2`, `walkRouteFactor*` (อ่านจากที่นี่ที่เดียว) | |
| → `data/coverage/district-counts.csv` | 79 แถว 48 คอลัมน์ (หัวข้อ 10.4) | ใช่ |
| → `data/coverage/heatmap/index.html` + `population-density.png` + `distance-zones.png` | heatmap เปิดตรงในเบราว์เซอร์ ไม่ต้องใช้เน็ต (หัวข้อ 10.5) | ใช่ |
| → `data/coverage/run-meta.json` | checksum ของไฟล์เข้า, config ที่ใช้, จำนวน node/edge, tie-break, เวลารัน, เวอร์ชัน package, ตัวเปรียบเทียบ route factor | ไม่ (มีเวลารัน) |
| → `data/coverage/LICENSE-DATA.md` | license ของทุกไฟล์ใน `data/coverage/` | เขียนมือ |

**dungeon ที่ใช้ได้** = feature ใน `candidates.geojson` ที่ไม่มี flag `review_required` · 11 ชิ้นที่ยังรอ HUMAN (เช่น พระที่นั่งอัมพรสถาน พระที่นั่งวิมานเมฆ สวนอัมพร ตาม D-048, วังต่าง ๆ, ตลาดน้ำวัดไทร) **ไม่ถูกนับ** ในทุกตัวชี้วัดและไม่เป็นจุดตั้งต้นของระยะเดิน · รายชื่อพร้อมเหตุผลอยู่ใน `run-meta.json#counts.not_counted_review_required` และจำนวนต่อเขตในคอลัมน์ `review_required_not_counted` · ถ้า HUMAN ปล่อยชิ้นใดภายหลัง ให้ level-designer ใส่/ถอดธงผ่าน config แล้วรันคำสั่งเดียวซ้ำ

### 10.3 วิธีคำนวณระยะเดิน (PRD F01 หัวข้อ 8.1 วิธีหลัก, ไม่ได้ใช้ทางสำรอง)

1. **กราฟ:** อ่าน D1 รอบเดียวด้วย pyosmium · way ที่ `highway` อยู่ใน `walkHighways` (12 ค่าตาม PRD 8.1, ไม่มี motorway/trunk) · ตัด `foot=no` · ตัด `access` ใน `coverageFilter.excludeAccessValues` ยกเว้นมี `foot=yes|designated|permissive` [ASSUMPTION A-P1-F01-T06-2] · ไม่สนใจ oneway (คนเดิน) · ทุก node ของ way เป็น node ของกราฟ (ไม่ย่อ node ดีกรี 2 เพื่อให้ snap เห็นรูปทางจริง) · ความยาว edge ใน EPSG:32647 · edge ซ้ำเก็บอันสั้นสุด · ครอบคลุม bbox ของ 79 เขต + 3 กม. (`graphBboxBuffer_m`) ตรวจ way ด้วย node แรก กลาง สุดท้าย
2. **ผลบนข้อมูลจริง:** 3,158,376 node · 3,300,731 edge · 9,074 component · component ใหญ่สุด 3,031,696 node (96%) · ใช้เฉพาะ component ใหญ่สุดในการ snap (เกาะทางเดินที่ไม่เชื่อมจะให้ระยะอนันต์โดยไม่มีหลักฐาน)
3. **routing:** multi-source Dijkstra ครั้งเดียวจาก `rep_point` ของ dungeon ที่ใช้ได้ทั้ง 730 แห่งพร้อมกัน (heap ของ stdlib บน CSR) · ระยะของเซลล์ = snap(ศูนย์กลางเซลล์ → node) + ระยะบนกราฟ + snap(rep_point → node) · ใช้วิธีเดียวกันอีก 2 รอบจากสถานีรถไฟฟ้า/รถไฟ 425 จุด และป้ายรถเมล์/สถานีขนส่ง 5,515 จุด เพื่อหาระยะเดินจาก dungeon ถึงขนส่ง
4. **snap:** node ที่ใกล้ที่สุด (shapely STRtree) · เซลล์ที่ snap ไกลเกิน `walkGraphSnapMaxDistance_m` (150 ม.) นับเป็นโซนแดง (66,593 จาก 769,128 เซลล์ = 3.35% ของประชากร) · ค่ากลาง snap ของเซลล์ 41.8 ม. (p90 140.3) · ของ dungeon 36.0 ม. (p90 97.2, 32 แห่งเกิน 150 ม. ยังใช้เป็นต้นทางโดยบวกระยะ snap)
5. **tie-break:** snap เท่ากัน → OSM node id ต่ำสุด · Dijkstra ระยะเท่ากัน → dungeon id ที่เรียงก่อน · เซลล์ที่ศูนย์กลางอยู่บนขอบเขตร่วม → `district_osm_id` ต่ำกว่า · Launch Score เท่ากัน → `district_osm_id` ต่ำกว่า (ข้อความเต็มใน `run-meta.json#distance_method.tie_break`)
6. **ทำไมไม่ใช้ pyrosm / osmnx + networkx:** PRD 8.1 ยกเป็น "ตัวอย่าง" · pyosmium อ่าน `.osm.pbf` ตรงได้อยู่แล้วและ pin ไว้ · networkx บนกราฟ 3.2 ล้าน node ใช้หน่วยความจำหลาย GB และต้องเพิ่ม dependency ให้ CI · Dijkstra ใน `analysis/graph.py` ถูกตรวจเทียบ Floyd–Warshall บนกราฟสุ่มใน test ทุกครั้ง
7. **ตัวเปรียบเทียบ (ไม่ใช้ตัดสิน):** `run-meta.json#distance_method.fallback_comparison` คำนวณระยะเส้นตรง × 1.2 / 1.4 / 1.6 ต่อทุกเขต · ทั้งพื้นที่ศึกษา: เขียว network 10.6% เทียบเส้นตรง ×1.2 25.0% · ×1.4 19.9% · ×1.6 16.2% · แดง network 34.1% เทียบ 17.1% / 22.2% / 27.2% · routing จริงเข้มกว่าทางสำรองทุกค่า เพราะรวมระยะ snap สองปลายและวัดถึง `rep_point` ภายใน polygon ไม่ใช่ขอบ · route factor ที่วัดได้จริง (ระยะ network ÷ เส้นตรงถึง dungeon เดียวกัน, เซลล์ที่ห่างเส้นตรง ≥ 250 ม.) ค่ากลาง 1.446 (ถ่วงประชากร 1.52, p25 1.29, p75 1.71) สอดคล้องกับค่า 1.4 ที่ P1-H08 เลือก

### 10.4 คอลัมน์ของ `district-counts.csv`

แถวเรียงตาม `province_iso` แล้ว `district_osm_id` · ค่าว่าง = ไม่มีข้อมูล (เช่น ไม่มี dungeon ในเขตจึงไม่มีค่าเฉลี่ยขนส่ง) ไม่ใช่ 0

| คอลัมน์ | ความหมาย |
| --- | --- |
| `province_iso` `province` `district_osm_id` `district` `district_en` | ตัวระบุย่าน (launch-criteria หัวข้อ 1 ใช้ `district_osm_id`) |
| `district_area_km2` | พื้นที่เขตใน EPSG:32647 |
| `valid_polygon_count` | dungeon ที่ใช้ได้ที่เขตหลัก (`district_osm_id` ของ candidate) = เขตนี้ · รวมทุกเขต = 730 · QA นับอิสระด้วย groupby `district_osm_id` ได้ตรง (ไม่รวม `review_required`) |
| `review_required_not_counted` | candidate ในเขตที่ติด `review_required` จึงไม่นับ |
| `class_*` `size_*` `preset_*` `valid_total_area_m2` | แยก `valid_polygon_count` ตาม class 6 ชุด · size_band (small ≤ 10,000 / medium ≤ 50,000 / large) · preset ตาม `presets.json` (marketplace → market ทุกขนาด, อื่น ๆ small → pocketPark, medium/large → largePark) · ผลรวมแต่ละกลุ่ม = `valid_polygon_count` |
| `population` `population_cells` `population_resolution` | ผลรวม WorldPop ของเซลล์ที่ศูนย์กลางอยู่ในเขต · ความละเอียดเดียวกันทุกเขต (3 arc-second ≈ 100 ม.) ตามที่ PRD 8.2 ขอให้ระบุ |
| `dungeons_per_100k` | `valid_polygon_count` ÷ `population` × 100,000 |
| `distance_method` | `osm_walk_network` ทุกแถว (ไม่ได้ใช้ route factor) |
| `walk_avg_m` `walk_median_m` | ระยะเดินถึง dungeon ใกล้สุด (ไม่จำกัดเขต) เฉลี่ย/มัธยฐานถ่วงประชากร |
| `g1_pop_share_green` `pop_share_yellow` `g4_pop_share_red` `s1_pop_share_green_yellow` | สัดส่วนประชากรในโซน ≤ 800 / 800–3,000 / > 3,000 ม. หรือ snap เกิน 150 ม. (ตัวชี้วัด G1 / G4 / S1 ใน PRD 4) |
| `pop_share_red_snap` | ส่วนของโซนแดงที่แดงเพราะ snap เกิน 150 ม. |
| `g2_valid_count_incl_multi` `g3_preset_count_incl_multi` | จำนวน dungeon และจำนวน preset หลัก (0–3) ในเขต โดยนับ candidate `multi_district` เข้าทุกเขตที่คร่อม (launch-criteria หัวข้อ 1) · ตัวชี้วัด G2 / G3 |
| `transit_mean_m` `rail_walk_mean_m` `bus_walk_mean_m` `dungeons_with_rail_in_reach` | ระยะเดินจาก dungeon ถึงขนส่ง (launch-criteria 4.3): ถ้ามีรถไฟฟ้าในระยะ `railAcceptableWalk_m` (800 ม.) = (2 × ราง + 1 × รถเมล์) / 3 ไม่เช่นนั้นใช้รถเมล์อย่างเดียว · ที่จอดรถไม่ให้คะแนน |
| `density_per_km2` `population_density_per_km2` | ค่าดิบของ densityScore / populationDensityScore |
| `score_density` `score_walk` `score_transit` `score_preset` `score_population` `launch_score` `launch_rank` | Launch Score (หัวข้อ 10.5) |

ตัวชี้วัดทุกตัวคำนวณจาก dungeon หลัก 6 tag เท่านั้น · ทางเสริม (ชั้นที่สอง / ชั่วคราว) ยังไม่มีข้อมูลจึงไม่อยู่ในไฟล์นี้ · การตีความ Go / No-go เป็นของ P1-F01-T07 และ HUMAN

### 10.5 Launch Score และ heatmap

- `launch_score` = 0.25 densityScore + 0.25 walkDistanceScore + 0.20 transitAccessScore + 0.15 presetDiversityScore + 0.15 populationDensityScore (น้ำหนักจาก `launch-score.config.json` ที่คัดจาก launch-criteria หัวข้อ 3)
- min-max ข้ามเฉพาะเขตที่มี dungeon ที่ใช้ได้อย่างน้อย 1 แห่ง (76 เขต) · 3 เขตที่ไม่มีได้ 0 ทุกตัว (เขตป้อมปราบศัตรูพ่าย, อำเภอบางบ่อ, อำเภอดอนตูม) · ค่าเท่ากันทุกเขต → 1.0 · presetDiversityScore = preset ÷ 3 ไม่ normalize
- heatmap `data/coverage/heatmap/index.html` (≈584 KB) เปิดด้วยดับเบิลคลิก ไม่มี CDN / tile server · ชั้น: ความหนาแน่นประชากร (สีน้ำเงิน log) · พื้นที่ว่าง (ลายแดง = โซนแดง) · โซนทั้งสาม · จุด candidate สีตาม preset (hover เห็นชื่อ ขนาด id) · เส้นเขต (เขตที่ไม่มี dungeon เป็นเส้นประแดง) · ตาราง 79 เขตเรียงตาม Launch Score
- ความเป็นส่วนตัว: ประชากรถูกรวมเป็นช่อง 3 × 3 เซลล์ (≈300 ม., `heatmap.displayBlockCells`) ก่อนวาด · จุดที่แสดงเป็น `rep_point` ของสถานที่สาธารณะเท่านั้น · ไม่มีตำแหน่งบ้านหรือบุคคล

### 10.6 ผลรอบจริง (2026-09-23, OSM 2026-09-01, WorldPop R2025A)

dungeon ที่ใช้ได้ 730 (ไม่นับ review_required 11) · เขตที่มี dungeon 76 / 79 · ประชากรรวม 21.3 ล้าน (WorldPop, ใช้เชิงเปรียบเทียบ) · ทั้งพื้นที่: เขียว 10.6% เหลือง 55.3% แดง 34.1% (แดงเพราะ snap 3.35%) · เขตที่ G2 ≥ 10: 31 เขต · เขตที่เขียว ≥ 60%: พระนคร, ปทุมวัน, บางรัก

| อันดับ | เขต | G2 | G3 | เขียว | เขียว+เหลือง | แดง | ระยะเดินเฉลี่ย (ม.) | Launch Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | เขตพระนคร | 20 | 3 | 81.7% | 100.0% | 0.0% | 550 | 0.8886 |
| 2 | เขตปทุมวัน | 23 | 3 | 72.0% | 99.9% | 0.1% | 655 | 0.8258 |
| 3 | เขตดินแดง | 15 | 3 | 37.1% | 100.0% | 0.0% | 939 | 0.8143 |
| 4 | เขตสาทร | 9 | 2 | 42.3% | 99.4% | 0.6% | 936 | 0.7594 |
| 5 | เขตยานนาวา | 8 | 3 | 24.1% | 100.0% | 0.1% | 1,192 | 0.7491 |
| 6 | เขตบางกะปิ | 15 | 3 | 10.5% | 84.1% | 15.9% | 1,889 | 0.7480 |
| 7 | เขตคลองสาน | 7 | 3 | 45.4% | 100.0% | 0.0% | 857 | 0.7372 |
| 8 | เขตห้วยขวาง | 11 | 3 | 15.7% | 98.7% | 1.4% | 1,364 | 0.7286 |
| 9 | เขตจตุจักร | 24 | 3 | 22.1% | 98.1% | 1.9% | 1,274 | 0.7286 |
| 10 | เขตบางรัก | 6 | 2 | 74.3% | 100.0% | 0.0% | 640 | 0.7247 |

ตารางนี้เป็นตัวเลขดิบให้ P1-F01-T07 ตีความ ไม่ใช่คำแนะนำเลือกย่าน · SHA-256: `district-counts.csv` `2ae1c5574dc4c444bb6b161d6d981f459c7bfb9e9c9863c5dac65c67288c9a8c`

### 10.7 Test และตาราง trace → expected → actual

- `pipeline/tests/test_analysis_core.py` (33 test): LZW ถอด/เข้ารหัสไป-กลับ (รวม reset ตาราง) · อ่าน GeoTIFF ที่ test เขียนเอง (LZW/Deflate/ไม่บีบ, predictor 1/2, nodata) · Dijkstra เทียบ Floyd–Warshall 6 กราฟสุ่ม · tie-break · ระยะตั้งต้น · component · ทางเดินที่นับ/ไม่นับ 7 แบบ · ชนิดขนส่ง 5 แบบ · อ่านกราฟจาก OSM XML สังเคราะห์ · snap tie-break และ pool
- `pipeline/tests/test_analysis_metrics.py` (28 test): น้ำหนักตรง launch-criteria · คีย์ `walk*` มาจาก dungeons.json · ขอบโซน 800 / 3,000 · preset แบบ class ก่อน · `review_required` ไม่นับ · สูตรขนส่ง · min-max · เขตไม่มี dungeon = 0 · ฉากจำลองครบวงจร 3 เขต 4 candidate 6 เซลล์ (ค่าที่คาดคำนวณด้วยมือในคอมเมนต์) · เปลี่ยน `walkGraphSnapMaxDistance_m` แล้วผลเปลี่ยน · CSV ผลรวมตรง

| เซลล์ในฉากจำลอง (x ม., y ม., ประชากร) | expected | actual |
| --- | --- | --- |
| (600, 560, 100) ห่าง d1 ≈ 160 ม. | green | green |
| (1000, 950, 50) snap ≈ 450 ม. > 150 | red | red |
| (2600, 520, 200) ห่าง d4 ≈ 630 ม. | green | green |
| (4000, 500, 120) ห่าง d4 ≈ 2,010 ม. | yellow | yellow |
| (5300, 500, 300) d3 ห่าง 300 ม. แต่ `review_required` → d4 ≈ 3,310 ม. | red | red |
| (7000, 500, 80) เขตไม่มี dungeon ≈ 5,010 ม. | red | red |

### 10.8 ข้อจำกัดที่รู้แล้ว

- ระยะวัดถึง `rep_point` (จุดภายใน polygon ตามที่ PRD กำหนด) ไม่ใช่ขอบ polygon หรือทางเข้า · สำหรับสวนใหญ่เกือบ 150,000 ตร.ม. ต่างได้ถึงราว 200 ม. (ทำให้ผลเข้มขึ้น ไม่ใช่หลวมขึ้น)
- ข้อมูลทางเดิน OSM ในซอยและหมู่บ้านจัดสรรไม่ครบทุกที่ · เซลล์ที่ไกลทางเดินเกิน 150 ม. ถูกนับแดงไว้ก่อน (3.35% ของประชากร)
- WorldPop constrained ให้ประชากรรวม 21.3 ล้านในพื้นที่ศึกษา สูงกว่าทะเบียนราษฎร์ เพราะเป็นแบบจำลองที่รวมประชากรแฝง · ใช้เทียบระหว่างเขตเท่านั้น (PRD 3)
- ไม่คิดเรือข้ามฟาก · สะพานที่ OSM tag เป็น motorway/trunk ไม่นับเป็นทางเดิน
