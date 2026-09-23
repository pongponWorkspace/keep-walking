# วิธีสำรวจ coverage (F01) — METHOD

- task: P1-F01-T01 · เจ้าของ: location-engineer · สถานะ: พร้อมให้ P1-F01-T04 (test plan) และ P1-F01-T05 (pipeline) ใช้
- อ้างอิง: GDD "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม", "การกำหนด dungeon", "Validation ตอนวาด dungeon", "สถานที่ที่ไม่ควรเป็น dungeon", "M0" · roadmap F01 · board detail "#### P1-F01-T01" · D-001, D-002, D-006 · ADR 0001 หัวข้อ 3.11
- เอกสารนี้เป็นสเปกวิธีการเท่านั้น ยังไม่มีโค้ด script จริงเขียนใน P1-F01-T05 และ P1-F01-T06 ตามเอกสารนี้

## 1. เป้าหมายและหลักการ

นับให้ได้ว่ากรุงเทพฯ และปริมณฑลมี polygon สาธารณะกลางแจ้งที่ "ใช้เป็น dungeon ได้" กี่ชิ้น อยู่เขตไหน และเทียบกับที่คนอยู่จริงตรงไหน

หลักการที่ script ต้องทำตาม

1. **รันซ้ำได้ผลเดิม** ข้อมูลเข้าเป็นไฟล์ลงวันที่ (ไม่ใช้ `*-latest`) ตรวจ checksum ก่อนใช้ เรียง output ตาม `id` และบันทึกค่า config ที่ใช้ลงไฟล์ meta
2. **offline หลังดาวน์โหลด** ขั้นเดียวที่ใช้เน็ตคือ `fetch` ขั้นอื่นอ่านไฟล์ในเครื่องเท่านั้น
3. **ไม่มี magic number** เกณฑ์พื้นที่อ่านจาก `config/balance/dungeons.json` คีย์ `area.minArea_m2` และ `area.maxArea_m2` · สัดส่วน blocklist และค่าเรขาคณิตอ่านจากคีย์ในหัวข้อ 8 ไม่เขียนเลขใน script
4. **ต้นทุนศูนย์ ไม่มีบัญชี** (D-001) ทุกแหล่งดาวน์โหลดได้ด้วย HTTP GET ธรรมดา ไม่ต้องสมัคร ไม่มี API key
5. **ไฟล์ดิบไม่เข้า git** (D-002) ทุกไฟล์ดาวน์โหลดอยู่ใน `tools/coverage/downloads/` ซึ่ง `.gitignore` ครอบแล้ว (ADR 0001 หัวข้อ 3.12) · commit ได้เฉพาะ output ขนาดเล็กใน `data/coverage/`
6. **ตัดแบบระวังไว้ก่อนเรื่องศาสนา** (D-006) เมื่อกฎกำกวม ให้ตัดหรือส่งตรวจ ไม่ปล่อยผ่าน

## 2. ขอบเขตพื้นที่

ตาม A-P1-PLAN-01-2: กรุงเทพฯ + ปริมณฑล 5 จังหวัด ใช้ขอบเขตจาก OSM ในไฟล์ extract เดียวกัน (วันที่ตรงกัน license เดียวกัน ชื่อไทยครบ)

| จังหวัด | ISO 3166-2 | OSM relation (`admin_level=4`) | จำนวนเขต/อำเภอที่คาด |
| --- | --- | --- | --- |
| กรุงเทพมหานคร | TH-10 | 92277 | 50 เขต |
| นนทบุรี | TH-12 | 1908796 | 6 อำเภอ |
| ปทุมธานี | TH-13 | 1908797 | 7 อำเภอ |
| สมุทรปราการ | TH-11 | 1908815 | 6 อำเภอ |
| สมุทรสาคร | TH-74 | 1908816 | 3 อำเภอ |
| นครปฐม | TH-73 | 1908788 | 7 อำเภอ |
| รวม | | | 79 |

- ระดับ "เขต/อำเภอ" = relation `boundary=administrative` + `admin_level=6` ที่จุด representative point อยู่ใน 6 จังหวัดข้างบน
- ตรวจแล้วบน extract 2026-09-01: พบ relation `admin_level=6` ใน 6 จังหวัด **79 ชิ้น ตรงกับจำนวนที่คาด** และพบ relation ระดับจังหวัดครบ 6 ชิ้นตาม ID ข้างบน (สคริปต์สำรวจชั่วคราว ดูหัวข้อ 10)
- script ต้อง assert ว่าได้ 6 จังหวัดและ 79 เขต/อำเภอ ถ้าไม่ตรงให้หยุดพร้อมบอกชื่อที่ขาด (ขอบเขตใน OSM ถูกแก้ได้ระหว่างรอบ)
- ขอบเขตสำรองสำหรับตรวจไขว้: geoBoundaries gbOpen THA ADM1/ADM2 (ที่มาคือกรมแผนที่ทหาร ผ่าน OCHA HDX) ใช้เทียบพื้นที่ต่อเขต ถ้าต่างเกินค่า `coverageFilter.boundaryCrossCheckMaxDiffShare` ให้เตือน ไม่หยุด · ไม่ใช้เป็นขอบเขตหลักเพราะไม่มี field จังหวัดแม่ใน ADM2 และข้อมูลปี 2019
- "ย่าน" ที่ใช้ให้คะแนนเปิดตัว นิยามโดย level-designer (P1-F01-T02) · pipeline นี้ให้ `district` และ `province` ต่อ polygon ซึ่งพอสำหรับทั้งแบบเขตและแบบ grid

## 3. แหล่งข้อมูลและ license

ทุกแหล่งไม่ต้องใช้บัญชีหรือ credential (ทดสอบดาวน์โหลดด้วย `curl` ไม่มี header พิเศษเมื่อ 2026-09-23)

| # | ข้อมูล | ใช้ทำอะไร | หน้าแหล่ง | License และการอ้างอิง |
| --- | --- | --- | --- | --- |
| S1 | OSM extract ประเทศไทย (Geofabrik) snapshot 2026-09-01 | polygon ผู้สมัคร, blocklist, ขอบเขตจังหวัด/เขต | https://download.geofabrik.de/asia/thailand.html | ODbL 1.0 · แสดง "© OpenStreetMap contributors" · output ที่ derive จาก OSM (`candidates.geojson`) ต้องเผยแพร่ภายใต้ ODbL ด้วย (share-alike) |
| S2 | WorldPop Global2 R2025A v1, ประเทศไทย ปี 2025, constrained, 100 ม. (คนต่อช่อง) | heatmap และประชากรต่อเขต (P1-F01-T06) | https://hub.worldpop.org/ (Global2 R2025A, DOI 10.5258/SOTON/WP00839) | CC BY 4.0 · อ้าง Bondarenko M. et al. 2025, WorldPop, University of Southampton |
| S3 | geoBoundaries gbOpen THA ADM1 และ ADM2 (commit 9469f09) | ตรวจไขว้ขอบเขตเท่านั้น | https://www.geoboundaries.org/ · API `https://www.geoboundaries.org/api/current/gbOpen/THA/ADM2/` | CC BY 3.0 IGO · ที่มา Royal Thai Survey Department, OCHA ROAP |
| S4 (ทางเลือก) | WorldPop 2020 constrained (BSGM) ประเทศไทย | ตรวจไขว้ประชากรเมื่อ S2 มีปัญหา | https://hub.worldpop.org/ | CC BY 4.0 |
| S5 (ทางเลือก) | Meta HRSL Thailand บน HDX | ตรวจไขว้ประชากรระดับหลังคาเรือน | https://data.humdata.org/dataset/thailand-high-resolution-population-density-maps-demographic-estimates | CC BY 4.0 · ดาวน์โหลดได้ไม่ต้องสมัคร แต่ยังไม่ได้ pin checksum (หน้า HDX ปฏิเสธ fetch อัตโนมัติ 403) ใช้เฉพาะเมื่อ T06 ต้องการ แล้วบันทึก URL + checksum เพิ่ม |

เหตุที่เลือก WorldPop เป็นหลัก: ปีใหม่สุด (2025), ดาวน์โหลดตรงไม่ต้องสมัคร, CC BY 4.0, ความละเอียด 100 ม. พอสำหรับระยะเดินระดับย่าน · HRSL ละเอียดกว่า (30 ม.) แต่ปีเก่ากว่าและ URL บน HDX เปลี่ยนตามรุ่น

ข้อควรระวังเรื่อง license

- ODbL: `data/coverage/candidates.geojson`, `excluded.geojson` เป็น derived database ต้องมีไฟล์ `data/coverage/LICENSE-DATA.md` (หรือหัวข้อใน README) ระบุ ODbL + attribution · repo เป็น public อยู่แล้วจึงผ่านเงื่อนไข share-alike
- ถ้าภายหลังจะรวม polygon OSM เข้าฐานข้อมูล dungeon ของเกม (Phase 2) ต้องถาม HUMAN เรื่องขอบเขต share-alike ของ ODbL ก่อน (อยู่ในหัวข้อคำถามของรายงาน)
- ตัวเลขประชากรใน `district-counts.csv` ต้องมีบรรทัดอ้าง WorldPop (CC BY 4.0)

## 4. ไฟล์ที่ต้องดาวน์โหลด

ตารางนี้ใช้ทั้งกับขั้น `fetch` ของ script และกับงานคนสำรอง P1-F02-T25 (เมื่อ agent ดาวน์โหลดไม่ได้) · checksum คำนวณจากไฟล์ที่ดาวน์โหลดจริงเมื่อ 2026-09-23 ด้วย `shasum -a 256` บน macOS · path เป็น path จาก root ของ repo และถูก `.gitignore` ครอบ (`tools/coverage/downloads/`, `*.osm.pbf`, `*.tif`)

| # | ไฟล์ | URL | ขนาด (byte) | SHA-256 | วาง path |
| --- | --- | --- | --- | --- | --- |
| D1 | OSM Thailand 2026-09-01 | https://download.geofabrik.de/asia/thailand-260901.osm.pbf | 326,905,982 (≈312 MiB) | `e09812904250c8fc5bed7b444546338766317865e741733229fc714d32ab272f` | `tools/coverage/downloads/thailand-260901.osm.pbf` |
| D2 | WorldPop THA 2025 constrained 100 ม. | https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2025/THA/v1/100m/constrained/tha_pop_2025_CN_100m_R2025A_v1.tif | 121,874,799 (≈116 MiB) | `c3c03df280fe19fad9892410b05c33c43c4e787535741748781e9455c78b9dec` | `tools/coverage/downloads/tha_pop_2025_CN_100m_R2025A_v1.tif` |
| D3 | geoBoundaries THA ADM2 | https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/THA/ADM2/geoBoundaries-THA-ADM2.geojson | 265,765,263 (≈253 MiB) | `d3496a7a342e6b895afaa7c2b6710afac243cd45359d3ecb0adec487e4bd3d59` | `tools/coverage/downloads/geoBoundaries-THA-ADM2.geojson` |
| D4 | geoBoundaries THA ADM1 | https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/THA/ADM1/geoBoundaries-THA-ADM1.geojson | 4,032,763 (≈3.8 MiB) | `145beb11e52785a42e16997c92a65426b3df8d009941db6b012ec8e411f3e33c` | `tools/coverage/downloads/geoBoundaries-THA-ADM1.geojson` |

รวมที่ต้องดาวน์โหลด ≈ 718 MB (D1 + D2 จำเป็น ≈ 449 MB · D3 + D4 ใช้ตรวจไขว้ ข้ามได้ถ้าพื้นที่ดิสก์จำกัด)

รายละเอียดเสริม

- D1 มีไฟล์ MD5 ของ Geofabrik ให้ตรวจอีกชั้น: https://download.geofabrik.de/asia/thailand-260901.osm.pbf.md5 ค่า `ca050c953a0e916e21267e6b8bc4cb6d` (ตรงกับไฟล์ที่ดาวน์โหลด) · **วันที่ของข้อมูล D1 = 2026-09-01T20:20:50Z** (อ่านจาก header ของ PBF `osmosis_replication_timestamp` ด้วย pyosmium 4.3.1 · Last-Modified ของไฟล์ 2026-09-02 05:15 GMT) · script อ่านค่านี้ซ้ำทุกครั้งแล้วเขียนลงไฟล์ meta เป็น `data_date`
- เหตุที่ pin snapshot ต้นเดือน: Geofabrik เก็บไฟล์รายวันไว้แค่ไม่กี่วัน แต่เก็บไฟล์วันที่ 1 ของเดือนไว้นานกว่า และไฟล์ 1 มกราคมของทุกปีเก็บถาวร (เห็น `thailand-140101.osm.pbf` ถึง `thailand-260101.osm.pbf` ในโฟลเดอร์) · ถ้า `260901` ถูกลบ ให้เลือก snapshot ต้นเดือนล่าสุดที่มี แล้วแก้ตาราง D1 (URL, ขนาด, SHA-256) ในงานของ location-engineer ห้ามใช้ `thailand-latest.osm.pbf` ในการรันที่ต้องรายงานผล
- ขั้นตอนสำหรับคน (P1-F02-T25): ดาวน์โหลดแต่ละ URL ด้วยเบราว์เซอร์หรือ `curl -L -o <path> <URL>` · รัน `shasum -a 256 <path>` แล้วเทียบกับคอลัมน์ SHA-256 · ไม่ต้องสมัครบัญชีใด ถ้าหน้าใดขอให้ login ให้หยุดและแจ้ง orchestrator · ตรวจด้วย `git status` ว่าไฟล์ไม่ขึ้น
- script ขั้น `fetch` ต้อง: ข้ามไฟล์ที่มีอยู่แล้วและ checksum ตรง · ลบไฟล์ครึ่งๆ กลางๆ เมื่อ checksum ไม่ตรงแล้วหยุด · ไม่ดาวน์โหลดใน CI (CI ใช้ fixture เล็กเท่านั้น)

## 5. เครื่องมือและขั้นตอน pipeline

### 5.1 เครื่องมือ (ติดตั้งในโฟลเดอร์ ไม่ติดตั้ง global)

ตาม ADR 0001 หัวข้อ 3.11: Python 3.11 ขึ้นไป · venv ที่ `tools/coverage/.venv/` (ignore) · pin ใน `tools/coverage/requirements.txt` (เขียนใน P1-F01-T05)

| package | รุ่นที่ทดลองแล้ว (2026-09-23) | ใช้ทำอะไร |
| --- | --- | --- |
| `osmium` (pyosmium) | 4.3.1 | อ่าน PBF, ประกอบ multipolygon (`FileProcessor.with_areas()`) |
| `shapely` | 2.1.2 | เรขาคณิต, `make_valid`, STRtree |
| `pyproj` | 3.8.0 | แปลงพิกัดไป EPSG:32647 |
| `numpy` | 2.5.3 | ตามที่ shapely ต้องใช้ |
| `rasterio` | pin ใน T06 | อ่าน raster WorldPop (T06 เท่านั้น) |
| `pytest` | pin ใน T05 | test บน fixture |

- ไม่ต้องมี `osmium-tool` หรือ GDAL CLI (ไม่มีในเครื่องและไม่จำเป็น) · ทดลองแล้วว่า wheel ของทั้งสาม package ติดตั้งผ่าน pip ได้บน macOS arm64 Python 3.14
- รอบสำรวจ (หัวข้อ 10) อ่าน D1 ทั้งไฟล์ด้วย `KeyFilter` + ประกอบ area ใช้เวลา 316 วินาทีบน Apple M5 · ยอมรับได้สำหรับ tool ที่รันไม่บ่อย จึงไม่ต้องตัด extract ย่อยก่อน

### 5.2 ขั้นตอน

คำสั่งเดียวรันทุกขั้นตามลำดับ (ชื่อคำสั่งจริงกำหนดใน `tools/coverage/README.md` ของ T05) · แต่ละขั้นเขียนจำนวนชิ้นเข้าและออกลง `data/coverage/run-meta.json`

| ขั้น | ทำอะไร | ข้อมูลเข้า → ออก |
| --- | --- | --- |
| 1 `fetch` | ดาวน์โหลดตามหัวข้อ 4 ถ้ายังไม่มี และตรวจ SHA-256 ทุกครั้ง | URL → `tools/coverage/downloads/` |
| 2 `boundaries` | ประกอบ polygon 6 จังหวัด (relation ID หัวข้อ 2) และ 79 เขต/อำเภอ · assert จำนวน · ตรวจไขว้กับ geoBoundaries ถ้ามีไฟล์ | D1 → cache ขอบเขต |
| 3 `extract` | อ่าน D1 ด้วย `KeyFilter('leisure','amenity','tourism','historic','landuse','military','office','building','healthcare','diplomatic','government','religion','boundary')` เก็บ area และ node ที่ tag ตรงกับหัวข้อ 6 หรือ 7 · ทิ้งชิ้นที่ representative point ไม่อยู่ใน union 6 จังหวัด (ชิ้น blocklist เก็บถ้าแตะ union เพราะอาจทับ candidate ริมขอบ) | D1 → ชิ้นดิบ (candidate, blocker, point) |
| 4 `normalize` | ซ่อม geometry, รวมชิ้นซ้ำ, จัดการ polygon ซ้อน (หัวข้อ 6.3) | ชิ้นดิบ → polygon สะอาด |
| 5 `area` | คำนวณ `area_m2` ใน EPSG:32647 (UTM 47N) หลังหักรูใน · จัด `size_band` · ชิ้นนอกช่วง `area.minArea_m2`..`area.maxArea_m2` (รวมขอบทั้งสองข้าง) ไปที่ excluded | → candidate ในช่วง |
| 6 `blocklist` | ใช้กฎหัวข้อ 7 ทีละชิ้น | → candidate ผ่าน / excluded พร้อมเหตุผล |
| 7 `assign` | ใส่ `district` และ `province` (หัวข้อ 9) | → property ครบ |
| 8 `write` | เขียน `candidates.geojson`, `excluded.geojson`, `run-meta.json` เรียงตาม `id` พิกัดทศนิยม 6 ตำแหน่ง | → `data/coverage/` |

- ขั้น 6 ทำหลังขั้น 5 เพื่อให้ excluded มีเหตุผลเดียวที่ชัดที่สุด · ลำดับความสำคัญของเหตุผลเมื่อเข้าหลายข้อ: เหตุผลศาสนา > blocklist อื่น > พื้นที่ > ซ้อน/ซ้ำ · ทุกเหตุผลที่เข้าเก็บใน `reasons_all` ส่วน `reason_excluded` คือเหตุผลลำดับแรก
- UTM 47N ครอบคลุม lon 96°–102°E ซึ่งรวม 6 จังหวัดทั้งหมด (lon ราว 99.8°–101.0°E) ความคลาดของพื้นที่จาก scale factor ที่ละติจูดนี้ต่ำกว่า 0.1% จึงไม่ต้องใช้ equal-area projection แยก
- ขนาดแยกตาม preset ใน GDD ("สวนหย่อม" "ตลาด" "สวนใหญ่") ใช้ `size_band` = `small` / `medium` / `large` จากคีย์ `coverageFilter.sizeBandUpper_m2` (หัวข้อ 8)

## 6. tag ที่นับ และการจัดการเรขาคณิต

### 6.1 tag 6 ชุดตาม GDD

GDD "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม" กำหนด 6 ชุด · `class` คือชื่อกลุ่มใน output

| ชุด | tag OSM | `class` | เงื่อนไขเพิ่ม (ไม่เข้า → excluded) |
| --- | --- | --- | --- |
| 1 | `leisure=park` | `park` | — |
| 2 | `amenity=marketplace` | `marketplace` | ไม่มี `building=*` ที่มีค่าอื่นนอกจาก `no`/`roof` บนชิ้นเดียวกัน (ตลาดในอาคารขัดกับ outdoor only) → `indoor_market` |
| 3 | `leisure=garden` | `garden` | `garden:type` ไม่ใช่ `residential` / `private` → `private_garden` |
| 4 | `historic=*` (ทุกค่า) | `historic` | ต้องเป็น area (หัวข้อ 6.4) · ค่าที่เป็นศาสนาโดยตรงถูกตัดในหัวข้อ 7 |
| 5 | `tourism=attraction` | `attraction` | — |
| 6 | `leisure=pitch` | `pitch` | — |

กฎร่วมทุกชุด

- `access=private` หรือ `access=no` → excluded `access_private` (ค่าจากคีย์ `coverageFilter.excludeAccessValues`)
- `indoor=*` ที่ไม่ใช่ `no` หรือ `layer` ติดลบ → excluded `indoor` (outdoor only ใน v1)
- ชิ้นเดียวเข้าหลายชุด (เช่น `leisure=park` + `historic=*`) ให้ `class` ตามลำดับในตาราง (park ก่อน) และเก็บทุกชุดใน `classes_all` · นับครั้งเดียว
- `tourism=museum`, `leisure=sports_centre`, `landuse=recreation_ground` ไม่อยู่ใน 6 ชุดของ GDD จึงไม่นับใน F01 · ถ้า level-designer ต้องการเพิ่มเป็นชั้นที่สองให้เสนอเป็น decision

### 6.2 multipolygon

- area ประกอบด้วย pyosmium: closed way ที่มี tag ตรง และ relation `type=multipolygon` · relation `type=boundary` ใช้เฉพาะขอบเขตปกครอง
- วงใน (inner) ถูกหักออกก่อนคำนวณพื้นที่ · ถ้าวงในเป็นชิ้น blocklist (เช่น วัดเป็นรูในสวน) ชิ้นนั้นยังถูกนำไปตรวจกฎหัวข้อ 7 ตามปกติ เพราะการเป็นรูไม่ได้แปลว่าไม่ติดกัน
- multipolygon ที่มีหลายวงนอก (outer) แยกกัน: นับเป็น 1 candidate ถ้าทุกวงห่างกันไม่เกิน `coverageFilter.multipartMaxGap_m` · ถ้าห่างกว่านั้น excluded `multipart_disjoint` พร้อม flag ให้ level-designer ตัดสินเอง (dungeon ต้องเป็นพื้นที่เดินต่อเนื่อง)
- geometry เสีย: ใช้ `shapely.make_valid` แล้วเก็บเฉพาะส่วน polygon · ถ้าพื้นที่หลังซ่อมต่างจากก่อนซ่อมเกิน `coverageFilter.repairMaxAreaChangeShare` → excluded `invalid_geometry` · ประกอบ area ไม่สำเร็จ (วงไม่ปิด) นับใน `run-meta.json` เป็น `assembly_failed` พร้อม osm_id

### 6.3 polygon ซ้ำและ polygon ซ้อนกัน

ใช้ STRtree หาคู่ที่แตะกันระหว่าง candidate ด้วยกัน (หลังขั้น 5 ทั้งในช่วงและนอกช่วง)

| กรณี | วิธีตรวจ | ผล |
| --- | --- | --- |
| ซ้ำ (way กับ relation หรือสองชิ้นแทนที่เดียวกัน) | IoU ≥ `coverageFilter.duplicateIoU` | เก็บชิ้นที่มี `name` และ tag มากกว่า (เสมอกันเก็บ osm_id น้อยกว่า) · อีกชิ้น excluded `duplicate_of` |
| ซ้อนใน (สนามในสวน, สวนในสวน) | พื้นที่ส่วนตัด / พื้นที่ชิ้นเล็ก ≥ `coverageFilter.nestedContainmentShare` | ถ้าชิ้นแม่อยู่ในช่วงพื้นที่: เก็บแม่ ชิ้นลูก excluded `nested_in` (ห้ามนับซ้ำ และ GDD ห้าม dungeon ทับกัน) · ถ้าชิ้นแม่ใหญ่เกิน `area.maxArea_m2`: แม่ excluded `area_too_large` + flag `split_candidate` และลูกที่อยู่ในช่วงเป็น candidate ได้ (สวนใหญ่แบ่งเป็นหลาย dungeon ได้ภายหลัง) · ถ้าแม่เล็กกว่า `area.minArea_m2` ลูกก็เล็กกว่าด้วย จึงไม่มีกรณีนี้ |
| ทับบางส่วน | พื้นที่ส่วนตัด / พื้นที่ชิ้นเล็ก ≥ `coverageFilter.partialOverlapShare` แต่ต่ำกว่าเกณฑ์ซ้อนใน | เก็บทั้งคู่ ใส่ flag `overlaps_candidate` พร้อม id อีกชิ้น · นับใน coverage ได้ทั้งคู่ แต่ level-designer ต้องตัดเส้นใหม่ก่อนเป็น dungeon จริง |
| แตะกันเล็กน้อย | ต่ำกว่า `coverageFilter.partialOverlapShare` | ถือว่าไม่ทับ (ความคลาดจากการวาด) |

- ประมวลผลชิ้นใหญ่ไปเล็ก เพื่อให้ผลไม่ขึ้นกับลำดับในไฟล์ (รันซ้ำได้ผลเดิม)
- ใน `district-counts.csv` (T06) นับ candidate หลังขั้นนี้เท่านั้น จึงไม่มีการนับพื้นที่ซ้ำ

### 6.4 `historic=*` และ `tourism=attraction` ที่เป็นจุด

ในกรอบสี่เหลี่ยมที่ครอบ 6 จังหวัดมี node `historic=*` ราว 1,400 จุด และ `tourism=attraction` ราว 550 จุด มากกว่า area ของสองชุดนี้หลายเท่า (หัวข้อ 10) · จุดไม่มีพื้นที่จึง **ไม่นับเป็น candidate** แต่ไม่ทิ้ง

- จุดที่อยู่ใน candidate: เพิ่มลงใน property `poi_inside` ของ candidate นั้น (osm_id, tag หลัก, name) ช่วยให้ level-designer เห็นว่าสวนไหนมีจุดน่าสนใจ
- จุดที่ไม่อยู่ใน candidate ใด: เขียนลง `data/coverage/points-unmatched.geojson` พร้อม `reason_excluded = point_only` เป็นรายการ "ต้องวาดเองถ้าจะใช้" สำหรับทางเสริมชั้นที่สอง · ไม่นับใน coverage หลัก
- จุดศาสนสถาน (หัวข้อ 7.1) ไม่ลงไฟล์ unmatched และไม่ลง `poi_inside` แต่ใช้ตัด candidate ตามหัวข้อ 7.3
- `amenity=marketplace` ที่เป็นจุด (ราว 130 จุด) ใช้กฎเดียวกัน · ตลาดนัดที่เป็นจุดเป็นวัตถุดิบของทางเสริม dungeon ชั่วคราว

## 7. กฎ blocklist

GDD "สถานที่ที่ไม่ควรเป็น dungeon" และ "Validation ตอนวาด dungeon": โรงพยาบาล สถานที่ราชการ วัดและศาสนสถาน โรงเรียน เขตทหาร สถานทูต · D-006: ตัดทุก polygon ที่อยู่ในหรือทับเขตวัดและศาสนสถาน รวมงานวัด

### 7.1 หมวดและ tag

ชิ้นที่ตรง tag ใดในหมวดเรียกว่า "blocker" · เก็บทั้งที่เป็น area และ node · รายการ tag ทั้งหมดอยู่ในคีย์ `coverageFilter.blocklistTags` เพื่อให้เพิ่มได้โดยไม่แก้โค้ด (ตารางนี้คือค่าตั้งต้นที่เสนอ)

| หมวด (`category`) | tag OSM |
| --- | --- |
| `religious` | `amenity=place_of_worship` · `amenity=monastery` · `landuse=religious` · `building=temple\|church\|mosque\|shrine\|monastery\|cathedral\|chapel\|synagogue\|religious` · `historic=wayside_shrine\|temple\|church\|monastery` · `office=religion` · `amenity=crematorium` · ชิ้นใดก็ได้ที่มี `religion=*` |
| `health` | `amenity=hospital` · `healthcare=hospital` · `building=hospital` · `amenity=clinic` ที่เป็น area |
| `education` | `amenity=school\|kindergarten\|college\|university` · `building=school\|university\|college\|kindergarten` · `landuse=education` · `office=educational_institution` |
| `government` | `office=government` · `government=*` · `amenity=townhall\|courthouse\|police\|fire_station\|prison` · `landuse=government` · `building=government` |
| `military` | `landuse=military` · `military=*` |
| `diplomatic` | `office=diplomatic` · `amenity=embassy` · `diplomatic=embassy\|consulate\|*` |
| `cemetery` | `landuse=cemetery` · `amenity=grave_yard` |

หมายเหตุหมวด

- `education` รวมมหาวิทยาลัยและวิทยาลัย: GDD เขียนว่า "โรงเรียน" แต่ใช้หลักระวังไว้ก่อน · ถ้า level-designer จะเปิดสวนในมหาวิทยาลัย ให้ปิดค่า `university` ในคีย์ผ่าน decision (อยู่ในรายงาน)
- `cemetery` ไม่อยู่ในรายการ GDD แต่สุสานในไทยผูกกับศาสนาเกือบทั้งหมด (สุสานจีน สุสานมุสลิม ป่าช้าวัด) จึงเสนอให้ตัดด้วยเหตุผลเดียวกับ D-006 · รออนุมัติใน decision
- `amenity=crematorium` อยู่หมวดศาสนาเพราะเมรุในไทยอยู่ในวัดเกือบทั้งหมด
- หมวดกำกวมที่ **ไม่ตัดอัตโนมัติแต่ติด flag `review_required`** ให้ level-designer ส่ง HUMAN (SF-9): `historic=palace` หรือชื่อมี "พระราชวัง" "วัง" · `historic=monument\|memorial` ที่ area ไม่ต่ำกว่า `area.minArea_m2` · `tourism=attraction` ที่อยู่ในเขตพระราชฐานหรือสถานที่เชิงสัญลักษณ์ทางการเมือง (รายชื่อ OSM id อยู่ใน `coverageFilter.reviewOsmIds` ที่ level-designer เติม)

### 7.2 กฎสัดส่วน (ใช้กับทุกหมวด)

ให้ C คือ candidate และ B คือ union ของ blocker หมวดเดียวกันที่แตะ C (หลังแปลงเป็น EPSG:32647)

```
blocked_share(C, หมวด) = area(C ∩ B) / area(C)
ตัด C ถ้า blocked_share > coverageFilter.maxBlockedShare.<หมวด>
```

- ใช้ค่าต่อหมวด เพราะความเสี่ยงต่างกัน: ศาสนาตั้งให้เข้มที่สุด (ค่าที่เสนอเท่ากับความคลาดของการวาดเส้นเท่านั้น) · หมวดอื่นยอมให้แตะขอบได้มากกว่า เช่น สวนที่ติดรั้วโรงพยาบาล
- ครอบทั้งสองทิศในสูตรเดียว: candidate อยู่ในเขตวัด (share ใกล้ 1) ถูกตัด · เขตวัดทับบางส่วนของสวนเกินค่า ถูกตัด · ศาลเจ้าเล็กในสวนใหญ่ (share น้อย) ผ่าน
- blocker ที่เป็นจุด: ขยายเป็นวงกลมรัศมี `coverageFilter.pointBlockerRadius_m` แล้วใช้สูตรเดียวกัน
- ผ่านแต่มี blocker ศาสนาแตะ (share > 0): เก็บไว้ใน candidates พร้อม flag `contains_religious_feature` และ id ของ blocker เพื่อให้ level-designer วาดเส้นหลบตอนทำ dungeon จริง

### 7.3 กฎศาสนาเพิ่มเติม (D-006, SF-9)

ใช้ก่อนกฎสัดส่วน ตามลำดับ · ข้อใดเข้าให้ตัดทันที

| # | กฎ | ใช้กับ | `reason_excluded` |
| --- | --- | --- | --- |
| R1 | candidate เองมี tag ศาสนา (tag ใดในหมวด `religious` หรือ `religion=*`) | ทุก class | `religious_self` |
| R2 | `historic=*` หรือ `tourism=attraction` ที่มี **node หรือ polygon** ศาสนสถานอยู่ภายใน ไม่ว่าสัดส่วนเท่าไร | class `historic`, `attraction` | `religious_inside_heritage` |
| R3 | ชื่อ (`name`, `name:th`, `name:en`) ตรง pattern ใน `coverageFilter.religiousNamePatterns` (ค่าตั้งต้น: ขึ้นต้นด้วย "วัด" "มัสยิด" "โบสถ์" "ศาลเจ้า" "สำนักสงฆ์" "อาราม" "Wat " "Temple" "Mosque" "Church" "Shrine") | class `historic`, `attraction` → ตัด · class อื่น → flag `review_required` ไม่ตัด | `religious_name` |
| R4 | กฎสัดส่วนหัวข้อ 7.2 หมวด `religious` | class `park`, `garden`, `marketplace`, `pitch` | `blocked_religious` |

- เหตุผลของ R2: ใน OSM วัดสำคัญหลายแห่งถูก tag เป็น `historic=*` หรือ `tourism=attraction` บน polygon ของเขตวัด (เช่น พื้นที่ท่องเที่ยวที่มีพระอุโบสถอยู่ข้างใน) แต่ไม่มี `amenity=place_of_worship` บนชิ้นเดียวกัน · การมีศาสนสถานอยู่ข้างในจึงเป็นสัญญาณแรงพอให้ตัดทั้งชิ้นตามหลักระวังไว้ก่อน
- เหตุผลที่สวน ตลาด สนาม ใช้กฎสัดส่วนแทน R2: สวนสาธารณะใหญ่ในกรุงเทพฯ หลายแห่งมีศาลเจ้าหรือศาลพระภูมิเล็กอยู่ข้างใน · ตัดทั้งสวนจะเสีย coverage โดยไม่จำเป็น และตรงตามที่ board กำหนดว่า "สวนที่มีศาลเจ้าเล็กข้างในตัดสินตามกฎสัดส่วน ไม่ตัดทั้งสวนอัตโนมัติ"
- ตลาดที่อยู่ในเขตวัด (ตลาดนัดในลานวัด) ถูกตัดด้วย R4 เพราะ share ใกล้ 1 · ตรงกับ D-006 ที่อนุญาตเฉพาะตลาดหรือ event ที่อยู่นอกเขตศาสนสถานทั้งหมด
- **งานวัด:** OSM ไม่มี tag งานวัดที่เชื่อถือได้ และงานวัดจัดในเขตวัดซึ่งถูกตัดด้วย R1/R4 อยู่แล้ว · pipeline จึงไม่สร้าง candidate งานวัดใดๆ · dungeon ชั่วคราวในอนาคต (หลังบ้าน) ต้องผ่านกฎ R4 ด้วยค่าเดียวกัน (handoff ถึง level-designer และ backend ในรายงาน)
- ขอบเขตวัดใน OSM ไม่ครบทุกวัด (บางวัดมีแค่ node) · node ศาสนสถานจึงถูกขยายเป็นวงกลมตามหัวข้อ 7.2 ซึ่งให้ผลระวังไว้ก่อนกับ candidate เล็ก

### 7.4 ตัวอย่างการตัดสิน (ค่าตัวอย่างจากข้อเสนอหัวข้อ 8 ไม่ใช่ค่าที่ล็อก)

| กรณี | ตัวเลข | ผล |
| --- | --- | --- |
| สวน 40,000 ตร.ม. มีศาลเจ้า polygon 60 ตร.ม. ข้างใน | share 0.0015 ≤ 0.02 | ผ่าน + flag `contains_religious_feature` |
| สวน 8,000 ตร.ม. มีศาลาการเปรียญ polygon 400 ตร.ม. ข้างใน | share 0.05 > 0.02 | ตัด `blocked_religious` |
| สวน 20,000 ตร.ม. มี node `amenity=place_of_worship` ข้างใน รัศมี 10 ม. | share 314 / 20,000 = 0.016 ≤ 0.02 | ผ่าน + flag |
| สวน 4,000 ตร.ม. มี node ศาสนสถานข้างใน | share 314 / 4,000 = 0.079 > 0.02 | ตัด |
| `tourism=attraction` 30,000 ตร.ม. มี node `amenity=place_of_worship` ข้างใน | R2 | ตัด `religious_inside_heritage` |
| `historic=*` ชื่อ "วัด..." ไม่มี tag ศาสนา | R3 | ตัด `religious_name` |
| ตลาดนัดในลานวัด | share ≈ 1 | ตัด `blocked_religious` |
| สนามฟุตบอลในโรงเรียน | share `education` ≈ 1 > 0.10 | ตัด `blocked_education` |
| สวนติดรั้วโรงพยาบาล เส้นทับกัน 2% | share `health` 0.02 ≤ 0.10 | ผ่าน |

กรณีในตารางนี้ส่งต่อให้ qa-tester ใช้เป็น case ใน P1-F01-T04 และให้ T05 สร้างเป็น fixture

## 8. ค่าที่อ่านจาก config

### 8.1 เกณฑ์พื้นที่ (มีอยู่แล้ว)

อ่านจาก `config/balance/dungeons.json` (systems-designer, P1-F03-T06) · script ห้ามมีเลข 3000 หรือ 150000 ในโค้ด

| คีย์ | ใช้ที่ |
| --- | --- |
| `area.minArea_m2` | ขั้น 5 ขอบล่าง (รวมค่าเท่ากับ) |
| `area.maxArea_m2` | ขั้น 5 ขอบบน (รวมค่าเท่ากับ) และกฎ `split_candidate` หัวข้อ 6.3 |

- เทียบแบบรวมขอบ (`min ≤ area_m2 ≤ max`) ตาม GDD "พื้นที่ 3,000–150,000 ตร.ม." · QA ใช้ขอบ 2,999 / 3,000 / 150,000 / 150,001 ตร.ม. ตาม P1-F01-T04 ได้ตรง
- เปรียบเทียบกับ `area_m2` ก่อนปัดเศษ · output เก็บ `area_m2` ปัด 1 ตำแหน่ง

### 8.2 ค่ากรองของ coverage (ใหม่ เสนอให้ systems-designer เพิ่ม)

เสนอให้อยู่ใน `config/balance/dungeons.json` object `coverageFilter` (มี `_source` ตามข้อตกลง config ของ ADR 0001 หัวข้อ 3.10) เพราะกฎเดียวกันต้องใช้ใน back office validation ตอนวาด dungeon และ dungeon ชั่วคราว · ตัวเลขข้างล่างเป็น **ค่าเสนอ** ไม่ใช่ค่าล็อก

| คีย์ | ค่าเสนอ | เหตุผล |
| --- | --- | --- |
| `coverageFilter.maxBlockedShare.religious` | 0.02 | เท่ากับความคลาดจากการวาดเส้นขอบใน OSM เท่านั้น (D-006) |
| `coverageFilter.maxBlockedShare.health` | 0.10 | ยอมให้แตะรั้ว |
| `coverageFilter.maxBlockedShare.education` | 0.10 | เหมือนกัน |
| `coverageFilter.maxBlockedShare.government` | 0.10 | เหมือนกัน |
| `coverageFilter.maxBlockedShare.military` | 0.02 | ความเสี่ยงทางกฎหมายสูง |
| `coverageFilter.maxBlockedShare.diplomatic` | 0.02 | ความเสี่ยงทางกฎหมายสูง |
| `coverageFilter.maxBlockedShare.cemetery` | 0.02 | ผูกกับศาสนา (รอ decision) |
| `coverageFilter.pointBlockerRadius_m` | 10 | ขนาดศาลเจ้าหรืออาคารศาสนาเล็กโดยประมาณ |
| `coverageFilter.duplicateIoU` | 0.9 | way กับ relation ที่วาดซ้ำ |
| `coverageFilter.nestedContainmentShare` | 0.9 | ชิ้นลูกอยู่ในแม่เกือบทั้งชิ้น |
| `coverageFilter.partialOverlapShare` | 0.05 | ต่ำกว่านี้ถือเป็นความคลาดการวาด |
| `coverageFilter.multipartMaxGap_m` | 30 | ราวความกว้างถนนสองเลน · ข้ามถนนใหญ่ไม่นับเป็นผืนเดียว |
| `coverageFilter.repairMaxAreaChangeShare` | 0.01 | ซ่อมแล้วพื้นที่เปลี่ยนเกิน 1% ถือว่าเสีย |
| `coverageFilter.excludeAccessValues` | `["private", "no"]` | ไม่ใช่พื้นที่สาธารณะ |
| `coverageFilter.sizeBandUpper_m2` | `{ "small": 10000, "medium": 50000 }` | small = สวนหย่อม, medium = ตลาด/สวนกลาง, large = สวนใหญ่ถึง `area.maxArea_m2` · level-designer ยืนยันให้ตรง preset |
| `coverageFilter.boundaryCrossCheckMaxDiffShare` | 0.05 | เตือนถ้าพื้นที่เขตจาก OSM กับ geoBoundaries ต่างเกิน 5% |
| `coverageFilter.religiousNamePatterns` | รายการใน R3 | regex ขึ้นต้นชื่อ |
| `coverageFilter.blocklistTags` | ตารางหัวข้อ 7.1 | map หมวด → รายการ `key=value` (`*` = ทุกค่า) |
| `coverageFilter.reviewOsmIds` | `[]` | level-designer เติม OSM id หมวดกำกวม (SF-9) |

[ASSUMPTION A-P1-F01-T01-1: ถ้า `coverageFilter` ยังไม่อยู่ใน `config/balance/dungeons.json` ตอนเริ่ม P1-F01-T05 ให้ T05 วางค่าเสนอข้างบนใน `tools/coverage/params.json` (location-engineer เป็นเจ้าของ รูปแบบคีย์เหมือนกันทุกตัว) · script อ่าน `dungeons.json#coverageFilter` ก่อน ถ้าไม่มีจึงอ่าน `params.json` และเขียนแหล่งที่ใช้จริงลง `run-meta.json` · ไม่มีค่า default ในโค้ด ถ้าหาไม่เจอทั้งสองที่ให้หยุด]

## 9. output schema

### 9.1 `data/coverage/candidates.geojson`

GeoJSON FeatureCollection ตาม RFC 7946 (WGS84 lon/lat) · geometry `Polygon` หรือ `MultiPolygon` แบบไม่ simplify (พื้นที่คำนวณจาก geometry ตัวเดียวกัน) · พิกัดทศนิยม 6 ตำแหน่ง (≈0.1 ม.) · feature เรียงตาม `id`

| property | ชนิด | ความหมาย |
| --- | --- | --- |
| `id` | string | id คงที่ข้ามรอบ รูปแบบ `osm-w<way id>` หรือ `osm-r<relation id>` |
| `osm_id` | integer | id ของ way หรือ relation ใน OSM |
| `osm_type` | string | `way` หรือ `relation` |
| `name` | string \| null | `name:th` ถ้ามี ไม่มีใช้ `name` |
| `name_en` | string \| null | `name:en` |
| `class` | string | `park` \| `marketplace` \| `garden` \| `historic` \| `attraction` \| `pitch` (หัวข้อ 6.1) |
| `classes_all` | string[] | ทุกชุดที่ชิ้นนี้เข้า |
| `tags` | object | tag OSM ทั้งหมดของชิ้น (key → value) |
| `area_m2` | number | พื้นที่ใน EPSG:32647 หลังหักรูใน ปัด 1 ตำแหน่ง |
| `size_band` | string | `small` \| `medium` \| `large` |
| `district` | string | ชื่อเขต/อำเภอ (ไทย) |
| `district_en` | string \| null | ชื่อภาษาอังกฤษ |
| `district_osm_id` | integer | relation id ของเขต/อำเภอ |
| `province` | string | ชื่อจังหวัด (ไทย) |
| `province_iso` | string | เช่น `TH-10` |
| `multi_district` | boolean | ชิ้นคร่อมหลายเขต (หัวข้อ 9.3) |
| `reason_excluded` | string \| null | ใน candidates เป็น `null` เสมอ |
| `reasons_all` | string[] | ใน candidates เป็น `[]` |
| `flags` | string[] | เช่น `contains_religious_feature`, `overlaps_candidate`, `review_required`, `multi_district`, `split_candidate` |
| `related_ids` | object | id ที่เกี่ยวกับ flag เช่น `{ "religious_blockers": ["osm-n123"], "overlaps": ["osm-w456"] }` |
| `poi_inside` | object[] | จุด `historic` / `attraction` / `marketplace` ข้างใน (หัวข้อ 6.4) |
| `opening_hours` | string \| null | ค่าดิบจาก OSM ใช้ต่อใน Phase 2 (GDD "เวลาทำการ") |
| `verification_mode` | string | `continuous_gps` ทุกชิ้นใน v1 |
| `floor_level` | null | `null` ทุกชิ้นใน v1 |

### 9.2 `data/coverage/excluded.geojson` และไฟล์อื่น

- `excluded.geojson`: schema เดียวกับ 9.1 · `reason_excluded` เป็นรหัสจากตาราง 9.4 (ห้ามเป็น null) · `reasons_all` มีทุกเหตุผลที่เข้า · `related_ids.blockers` มี id ของ blocker และ `blocked_share` ต่อหมวด · ชิ้นที่ไม่มีพื้นที่ในช่วงและไม่มีเหตุผลอื่นก็อยู่ที่นี่ (`area_too_small` / `area_too_large`)
- `points-unmatched.geojson`: Point features, property `id` (`osm-n<id>`), `osm_id`, `osm_type`, `name`, `tags`, `district`, `province`, `reason_excluded = point_only`
- `run-meta.json`: `pipeline_version`, `data_date` (หัวข้อ 4), SHA-256 ของไฟล์เข้าทุกไฟล์, แหล่ง config ที่ใช้จริง + ค่าทุกคีย์, จำนวนชิ้นก่อนและหลังแต่ละขั้น (หัวข้อ 5.2), จำนวนต่อ `reason_excluded`, `assembly_failed`, เวลารัน, เวอร์ชัน package
- `LICENSE-DATA.md`: ODbL + "© OpenStreetMap contributors" (หัวข้อ 3)
- ถ้า `excluded.geojson` ใหญ่เกินเพดานขนาดไฟล์ของ CI guard (P1-F02-T07) ให้ตัด `tags` เหลือเฉพาะ key ที่ใช้ตัดสิน และเก็บตัวเต็มใน `tools/coverage/out/` ที่ ignore · candidates ต้องครบเสมอ

### 9.3 การใส่เขตและจังหวัด

- `district` = เขต/อำเภอที่ทับกับ candidate มากที่สุด (พื้นที่ส่วนตัดใน EPSG:32647) · ถ้าเขตที่ใหญ่รองลงมามีส่วนตัดเกิน `coverageFilter.partialOverlapShare` ของ candidate ให้ `multi_district = true` และเก็บรายชื่อใน `related_ids.districts`
- `province` = จังหวัดแม่ของเขตนั้น (ใช้การทับเชิงพื้นที่ เพราะ relation เขตใน OSM ของไทยไม่มีรหัสจังหวัดแม่ที่ใช้ได้ครบ)
- candidate ที่อยู่นอก 6 จังหวัดทั้งหมด (ส่วนตัด 0) ถูกทิ้งตั้งแต่ขั้น 3 จึงไม่อยู่ในไฟล์ใดเลย
- T06 นับต่อเขตด้วย `district_osm_id` ไม่ใช้ชื่อ (ชื่อซ้ำข้ามจังหวัดได้ เช่น "เมือง...")

### 9.4 รหัส `reason_excluded`

เรียงตามลำดับความสำคัญ (ข้อบนชนะเมื่อเข้าหลายข้อ)

| รหัส | มาจาก |
| --- | --- |
| `religious_self` | R1 |
| `religious_inside_heritage` | R2 |
| `religious_name` | R3 (class `historic`, `attraction`) |
| `blocked_religious` | R4 / กฎสัดส่วนหมวดศาสนา |
| `blocked_military` · `blocked_diplomatic` · `blocked_health` · `blocked_education` · `blocked_government` · `blocked_cemetery` | กฎสัดส่วนหัวข้อ 7.2 |
| `access_private` · `private_garden` · `indoor` · `indoor_market` | หัวข้อ 6.1 |
| `invalid_geometry` · `multipart_disjoint` | หัวข้อ 6.2 |
| `area_too_small` · `area_too_large` | หัวข้อ 8.1 |
| `duplicate_of` · `nested_in` | หัวข้อ 6.3 |
| `point_only` | หัวข้อ 6.4 (เฉพาะ `points-unmatched.geojson`) |

## 10. ผลสำรวจเบื้องต้น (ไม่ใช่ผล F01)

รันสคริปต์สำรวจชั่วคราวใน scratchpad (ไม่ commit) บน D1 เมื่อ 2026-09-23 เพื่อตรวจว่าวิธีนี้ทำได้จริงและ tag ที่เลือกมีข้อมูลพอ · ยังไม่ได้ตัด blocklist ไม่ได้รวมชิ้นซ้ำหรือซ้อน และนับชิ้นเดียวซ้ำได้ถ้ามีหลาย key จึง **ห้ามใช้เป็นตัวเลขตัดสิน Go / No-go** · ตัวเลขจริงมาจาก T05 และ T06

area ที่ representative point อยู่ใน 6 จังหวัด

| tag | area ทั้งหมด | area ในช่วง 3,000–150,000 ตร.ม. (ค่าปัจจุบันของ `area.*`) |
| --- | --- | --- |
| `leisure=park` | 891 | 462 |
| `leisure=garden` | 3,353 | 637 |
| `leisure=pitch` | 1,580 | 259 |
| `amenity=marketplace` | 371 | 189 |
| `tourism=attraction` | 58 | 34 |
| `historic=*` | 794 | 23 |
| blocker `amenity=place_of_worship` | 1,276 | 984 |
| blocker `amenity=school` | 1,088 | 961 |
| blocker `amenity=hospital` | 174 | 135 |
| blocker `landuse=military` / `military=*` | 99 / 39 | 62 / 21 |
| blocker `building=temple` | 1,882 | 4 |

สิ่งที่ได้เรียนรู้และถูกใส่ในกฎแล้ว

- เขตวัดใน OSM ส่วนใหญ่ tag เป็น `amenity=place_of_worship` บน polygon ขนาดใหญ่ (984 ชิ้นอยู่ในช่วงขนาดเดียวกับ dungeon) ไม่ใช่ `landuse=religious` (98 ชิ้น) · หมวดศาสนาจึงต้องใช้ทั้งสอง tag และ `building=temple` (อาคารในวัด) เป็นตัวเสริม
- `historic=*` ส่วนใหญ่เป็นอาคารหรือจุดเล็ก มีแค่ 23 area ในช่วง · node `historic=*` มีราว 1,400 จุด จึงต้องมีไฟล์ `points-unmatched.geojson` (หัวข้อ 6.4)
- `leisure=garden` มีจำนวนมากที่สุดแต่ปนสวนส่วนตัว จึงต้องมีกฎ `garden:type` และ `access`
- สนามจำนวนมากอยู่ในโรงเรียน (สนามโรงเรียน) กฎสัดส่วนหมวด `education` จะตัดส่วนนี้
- ขอบเขต 6 จังหวัดและ 79 เขต/อำเภอครบใน OSM (หัวข้อ 2)

## 11. การพิสูจน์ว่ารันซ้ำได้และถูก

สำหรับ T05 (test) และ T04 (test plan ของ QA)

- **fixture เล็กที่ commit ได้:** `tools/coverage/tests/fixtures/` เป็นไฟล์ `.osm` (XML) หรือ GeoJSON ที่วาดมือ พิกัดสมมติในกรุงเทพฯ ขนาดไม่กี่ KB · ห้ามตัดจาก D1 ตรงๆ เกินจำเป็น (ถ้าตัดจาก OSM ต้องใส่ attribution ODbL ในโฟลเดอร์ fixture) · ใช้นามสกุล `.osm.xml` หรือ `.geojson` เพราะ `*.osm` และ `*.osm.pbf` ถูก ignore (ตรวจแล้วด้วย `git check-ignore -v`: `tests/fixtures/a.osm.xml` และ `a.geojson` ไม่ถูก ignore · ไฟล์ใน `tools/coverage/downloads/` และ `tools/coverage/out/` ถูก ignore · `data/coverage/candidates.geojson` ไม่ถูก ignore)
- **case ขั้นต่ำใน fixture:** ขอบพื้นที่ 2,999 / 3,000 / 150,000 / 150,001 ตร.ม. (สี่เหลี่ยมใน UTM 47N แล้วแปลงกลับ) · ทุกแถวในตาราง 7.4 · multipolygon มีรูใน · way กับ relation ซ้ำกัน · สนามในสวน (nested) · สวนใหญ่เกินที่มีสวนย่อยในช่วง (`split_candidate`) · `access=private` · candidate คร่อมสองเขต
- **รันซ้ำได้:** รัน pipeline สองครั้งบน fixture แล้วเทียบ SHA-256 ของ output ต้องเท่ากัน (ห้ามมีเวลารันใน GeoJSON ให้เก็บใน `run-meta.json` เท่านั้น และไฟล์นี้ไม่รวมในการเทียบ)
- **ไม่มี magic number:** test สลับค่าใน config ชั่วคราว (เช่น `area.minArea_m2` เป็นค่าอื่น) แล้วผลต้องเปลี่ยนตาม
- **สุ่มตรวจกับแผนที่จริง (T04):** สุ่ม candidate อย่างน้อย 30 ชิ้นด้วย seed คงที่ที่บันทึกใน `run-meta.json` เพื่อให้ QA สุ่มชุดเดิมได้
- **รันจริงกับ D1:** ไม่รันใน CI · บันทึกจำนวนชิ้นต่อขั้นใน `run-meta.json` และสรุปใน README ของ T05

## 12. ขอบเขตที่ไม่ทำใน F01 และข้อจำกัด

- ไม่วาด polygon dungeon จริง ไม่ตั้ง drop ไม่ตั้งเวลาทำการ (non-goals ของ F01)
- กฎ "ห้ามทับถนน `highway=primary` ขึ้นไป ทางรถไฟ แหล่งน้ำ ทางด่วน" และ "ต้องมีทางเข้าจากทางเท้า" เป็น validation ตอนวาด dungeon (GDD "Validation ตอนวาด dungeon", level-designer P1-F01-T02) · T05 **ไม่ตัด** ด้วยกฎนี้ แต่ใส่ flag `crosses_major_way` เมื่อ candidate ถูก way `highway=motorway|trunk|primary` (รวม `_link`), `railway=rail|subway|light_rail` หรือ `waterway=river|canal` ที่ไม่ใช่ `tunnel`/`bridge` ตัดผ่าน เพื่อให้ level-designer รู้ว่าต้องตัดเส้น · ถ้าต้องอ่าน way เหล่านี้ด้วย ให้เพิ่ม `highway`, `railway`, `waterway` ใน `KeyFilter` ขั้น 3
- OSM ไม่ครบ: สวนหรือตลาดที่ไม่มีใน OSM จะไม่ถูกนับ ผล F01 จึงเป็นค่าต่ำสุดของ coverage จริง ควรเขียนข้อนี้ไว้ใน coverage report (P1-F01-T07)
- ขอบวัดใน OSM ไม่ครบ: บางวัดมีแค่ node · กฎวงกลมรอบ node (หัวข้อ 7.2) ครอบ candidate เล็กได้ แต่สวนใหญ่ที่มีวัดเป็น node อยู่ติดขอบอาจผ่านไปพร้อม flag · level-designer ต้องตรวจ flag `contains_religious_feature` ทุกชิ้นก่อนเป็น dungeon จริง
- ประชากร WorldPop เป็นค่าประมาณจากแบบจำลอง (ไม่ใช่สำมะโน) และนับตามที่อยู่อาศัย ไม่ใช่คนที่เดินผ่านย่านในเวลากลางวัน · ย่านธุรกิจ (เช่น สีลม สาทร) จะดูว่าคนน้อยกว่าจริงในเวลาเล่น · ระบุใน coverage report
- ขอบเขตปกครองใน OSM ถูกแก้ได้ทุกวัน script จึง assert จำนวนเขตทุกรอบ (หัวข้อ 2)
