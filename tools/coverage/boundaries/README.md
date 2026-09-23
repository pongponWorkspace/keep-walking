# tools/coverage/boundaries — เส้นจังหวัดและโซนดำ (P1-H07)

สร้าง `data/map/provinces.geojson` และ `data/map/playarea-mask.geojson` ตามสัญญาใน `docs/tech/F02-map-location-spike.md` หัวข้อ 15.1 (D-037) และ `art/direction/map-style.md` หัวข้อ 6.2–6.3

## ที่มาของข้อมูล

- OSM extract ตัวเดียวกับ coverage survey: `tools/coverage/params.json#pipeline.sources` id `D1` (`thailand-260901.osm.pbf`, 326,905,982 bytes, ข้อมูลวันที่ 2026-09-01T20:20:50Z) · ตรวจ SHA-256 ทุกครั้ง ไม่ดาวน์โหลดเอง
- รายชื่อจังหวัดที่เล่นได้อ่านจาก `tools/coverage/params.json#pipeline.studyArea.provinces` (`iso` + `osmRelationId`) · ไม่มีรายชื่อในโค้ดหรือใน `params.json` ของโฟลเดอร์นี้
- จังหวัดทั้งหมด = relation `boundary=administrative` + `admin_level=4` ที่ `ISO3166-2` ขึ้นต้นด้วย `TH-` (extract มีจังหวัดของประเทศเพื่อนบ้านติดมาด้วย) · ต้องได้ 77 ไม่งั้นหยุด
- ลิขสิทธิ์: © OpenStreetMap contributors (ODbL) · ฝังใน `attribution` ของทั้งสองไฟล์ · client ต้องใส่ใน `attribution` ของ source ด้วย

## วิธีรัน (offline)

```sh
cd tools/coverage
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # ครั้งแรกเท่านั้น
.venv/bin/python -m pipeline fetch                                  # ครั้งแรก ถ้ายังไม่มี D1 (~327 MB)
.venv/bin/python -m boundaries                                      # ~10 วินาที
.venv/bin/python -m pytest boundaries/tests -q -p no:cacheprovider  # test (ไม่ต้องมี D1)
```

รันซ้ำด้วย extract และ params เดิมได้ไฟล์ byte เดิม (ไม่มีเวลารันในไฟล์)

## วิธีทำ

1. อ่าน polygon ของ 77 จังหวัดในรอบเดียว (`osm.py`) · ตัดคำนำหน้า "จังหวัด" ออกจากชื่อ (`provinces.nameStripPrefixes`)
2. รวมเส้นขอบทุกจังหวัดด้วย union แล้ว `line_merge` ที่จุดดีกรี 2 → แต่ละเส้นอยู่ระหว่างสองจังหวัดเดิมตลอด และจบที่จุดบรรจบ · เส้นที่ใช้ร่วมกันจึงมีครั้งเดียว และ simplify แล้วจุดบรรจบไม่ขยับ (`build.border_lines`)
3. เส้นที่แตะจังหวัดที่เล่นได้ simplify 20 ม. ทศนิยม 5 ตำแหน่ง · เส้นอื่น 350 ม. ทศนิยม 4 ตำแหน่ง (ตัวเลขและเหตุผลใน `params.json#_source`)
4. รูของโซนดำ = polygonize เส้นที่คั่นพื้นที่เล่นกับที่เหลือ (ชุดเดียวกับข้อ 3) → เส้นจังหวัดตรงกับขอบโซนดำทุกจุด · วงนอก `[-180,-85]..[180,85]` ทวนเข็ม รูตามเข็ม (RFC 7946) · ถ้ามีจังหวัดที่ไม่เปิดล้อมอยู่กลางพื้นที่เล่น (ต้องใช้ MultiPolygon) script หยุดแทนที่จะเปลี่ยนสัญญาเอง
5. จุดชื่อ = pole of inaccessibility (`polylabel`, 500 ม.) ของส่วนที่ใหญ่ที่สุด · property `kind: label`, `name`, `playable`, `iso`
6. ตรวจขนาด ≤ `maxFileBytes` (300 KB) ทั้งสองไฟล์ก่อนเขียน

## Test

- `tests/test_fixture.py`: รัน CLI จริงบน grid สังเคราะห์ 3 × 3 + จังหวัดต่างประเทศ (ตัดทิ้ง, ตัดคำนำหน้า, เส้นร่วมมีครั้งเดียว, รูตรงกับ union, playable ตาม params, enclave/relation ไม่พบ/ISO ไม่ตรง/จำนวนไม่ครบ/เกินขนาด → หยุด, รันซ้ำได้ byte เดิม)
- `tests/test_outputs.py`: ตรวจไฟล์ที่ commit ใน `data/map/` (ขนาด, attribution, source D1, winding, ทศนิยม ≤ 5, label 77, `playable` ตรงกับ params, รูของ mask ใช้จุดชุดเดียวกับเส้นจังหวัด)
- `tests/pytest-bridge.test.ts`: ให้ root `pnpm test` รัน pytest นี้ (ต้องเพิ่ม glob ใน `vitest.config.ts`, งานของ tech-lead)

## เมื่อเปิดจังหวัดใหม่

แก้รายการใน `tools/coverage/params.json#pipeline.studyArea.provinces` (Phase 3 ย้ายไป `config/content/`) แล้วรัน `python -m boundaries` · ไม่ต้องแก้ style หรือ build tile ใหม่
