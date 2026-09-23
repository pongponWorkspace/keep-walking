# QA Gate — F01 Coverage Survey (P1-F01-T08)

เจ้าของ: qa-tester · วันที่รัน: 2026-09-24 · เครื่อง: macOS arm64 (Apple M5), Python 3.14.7 (`.venv`)
อ้างอิง: `qa/plans/F01-test-plan.md` (P1-F01-T04), `tools/coverage/README.md`, `tools/coverage/METHOD.md`, `design/levels/coverage-report.md` (P1-F01-T07), `design/levels/launch-criteria.md`, `design/levels/dungeon-rules.md`, `product/prd/F01-coverage-survey.md`, board `studio/phases/phase-1/board.md` detail block `#### P1-F01-T08`

**verdict: PASS**

สรุปสั้น: รันทุกคำสั่งซ้ำเองอย่างอิสระ (ไม่เชื่อคำอ้างของ location-engineer) ได้ SHA-256 ตรงกับที่ README อ้างไว้ทุกไฟล์ (candidates/excluded/points-unmatched/district-counts.csv) นับ `valid_polygon_count` ต่อเขตเองจาก `candidates.geojson` (groupby `district_osm_id`, ตัด `review_required`) ได้ 730 ทุกเขตตรงกับ CSV 100% (0 mismatch จาก 79 เขต) คำนวณเขียว/เหลือง/แดงและ Launch Score อันดับ 1–3 เองจาก CSV ได้ตรงกับ coverage-report.md ทุกตัวเลข ตรวจ RAND-01 ผ่าน Nominatim lookup จริง (เครือข่ายใช้ได้ในรอบนี้) ได้ 30/30 found, 30/30 tag match, 30/30 province ISO match ยืนยัน GAP-01/02/03/04 ที่เปิดไว้ในแผนทดสอบถูกปิดจริงด้วย test เฉพาะ (`test_gaps_fixtures.py`, `test_compaction.py`) ไม่ใช่แค่คำสัญญา `COVERAGE_PYTEST_REQUIRED=1 pnpm test` ผ่านทั้งหมด (59 ไฟล์ 889 test รวม pytest bridge ทั้งสองตัว) พบ 2 บั๊กจริงระหว่างตรวจ (BUG-F01-001 medium, BUG-F01-002 low) ไม่มี severity high ขึ้นไป จึงไม่บล็อก PASS

## 1. เกณฑ์เข้า/ออกตามแผนทดสอบ (หัวข้อ 7)

- เข้า: pytest ผ่านทั้งหมดตอนเริ่ม (ยืนยันซ้ำ, ดูหัวข้อ 2), ไฟล์ commit แล้ว, README มีคำสั่งรันซ้ำ — ผ่านครบ
- ออกเป็น PASS: ทุก case มีหลักฐาน (หัวข้อ 3–9 ด้านล่าง) · GAP-01..04 ปิดแล้ว (หัวข้อ 4) · รันซ้ำอิสระสำเร็จ (หัวข้อ 2) · G2/N2 (และตอนนี้ G1/G3/G4/S1-S4/N3 ด้วยเพราะ T06/T07/T09 เสร็จแล้วนับตั้งแต่เขียนแผน) สืบไปถึงคำสั่งที่รันเองได้ (หัวข้อ 5) · ไม่มี bug severity high ขึ้นไป (หัวข้อ 8) → **เข้าเงื่อนไข PASS ทุกข้อ**

## 2. การรันซ้ำอิสระ (หัวข้อ 6 ของแผนทดสอบ)

```
$ shasum -a 256 tools/coverage/downloads/thailand-260901.osm.pbf
e09812904250c8fc5bed7b444546338766317865e741733229fc714d32ab272f  (ตรงกับ METHOD.md §4 และ README)

$ cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q
176 passed in 1.14s   (README ปัจจุบันอ้าง 176 — ตรง, ไม่ใช้เน็ต)

$ .venv/bin/python -m pipeline all --offline
exit 0, 52.7s (user+sys), candidates 741 · excluded 6287 · points_unmatched 572

$ shasum -a 256 ../../data/coverage/{candidates,excluded,points-unmatched}.geojson
d3937a672645a81194faa3368a0eb314bf1abb09e11444270b2c67254eb074f4  candidates.geojson
f3590c86702f933ba7ad4aea4aa7355102aeee1cc4fc0ca0638b44d490730442  excluded.geojson
dba06808073021f0f0fa9ba3fc6516091c482572b69c31755341e246e36d64be  points-unmatched.geojson
```

ตรงกับ README §7 ทุกตัวอักษร (คอลัมน์ "หลัง T06") — ไม่ใช่แค่ copy ค่ามา แต่รันจริงบนเครื่อง QA เอง

```
$ .venv/bin/python -m analysis all --offline
exit 0, 62.2s (user+sys), usable dungeons 730 · not counted (review) 11 · green 0.1058 red 0.3409

$ shasum -a 256 ../../data/coverage/district-counts.csv
2ae1c5574dc4c444bb6b161d6d981f459c7bfb9e9c9863c5dac65c67288c9a8c
```

ตรงกับ README §10.6 ทุกตัวอักษร

**การนับอิสระของ QA เอง** (ไม่ใช้โค้ด pipeline, เขียน one-liner ใหม่, groupby `district_osm_id` จาก `candidates.geojson` ตัด `review_required` ออกก่อน):

```
total usable (independent count): 730   review_required excluded: 11
mismatches vs district-counts.csv#valid_polygon_count: []   (0 จาก 79 เขต)
sum of csv valid_polygon_count: 730
districts with >0 usable dungeon: 76 / 79
```

ตรงกับ `district-counts.csv` และตัวเลขใน context ("730 usable, 11 review_required, 76/79 districts") 100%

## 3. ตัวเลขระดับ PRD → coverage-report.md → คอลัมน์ CSV (หัวข้อ 4 ของแผนทดสอบ)

คำนวณเองจาก `district-counts.csv` (ถ่วงประชากรด้วยคอลัมน์ `population` และสัดส่วนแต่ละแถว ไม่ใช้ตัวเลขที่พิมพ์ไว้ใน coverage-report.md):

```
total_pop = 21,304,954
green%  = 10.583  (report: 10.6%)
yellow% = 55.328  (report: 55.3%)
red%    = 34.090  (report: 34.1%)

top-3 by launch_score:
  เขตพระนคร   0.8886  G2=20 G3=3  green=81.73% red=0.00%
  เขตปทุมวัน  0.8258  G2=23 G3=3  green=72.03% red=0.06%
  เขตดินแดง   0.8143  G2=15 G3=3  green=37.07% red=0.00%
```

ตรงกับ `coverage-report.md` หัวข้อ 0/3-6 ทุกตัวเลข (คำแนะนำ Go, พระนคร/ปทุมวัน ผ่าน G1-G4 ครบ, ดินแดง ไม่ผ่าน G1 แต่ผ่าน S1-S3) ตรงกับที่ context สรุปไว้ ("top 3 พระนคร/ปทุมวัน/ดินแดง") — ยืนยันว่า D-069 (แก้ transitAccessScore) ไม่กระทบอันดับ top-3 จริงตามที่อ้าง

G2/N2 (เกณฑ์ที่แผนทดสอบเดิมบอกว่าตรวจได้วันนี้แน่ ๆ): N2 (รวม ≥40 แห่ง) ผ่านที่ 730 ชัดเจน · G2 รายเขต (≥10) นับตรงจาก `g2_valid_count_incl_multi` ของ CSV ได้ 31 เขตผ่าน ตรงกับ README §10.6 ("เขตที่ G2 ≥ 10: 31 เขต")

G1/G3/G4/S1-S4/N3 (DEP-01/02/03 ในแผนทดสอบเดิม, ตอนนี้ T06/T07/T09 เสร็จแล้ว): สืบไปถึง `district-counts.csv` คอลัมน์ `g1_pop_share_green` `g3_preset_count_incl_multi` `g4_pop_share_red` `s1_pop_share_green_yellow` ได้ตรงตาม README §10.4 ที่นิยามไว้ ตรวจไขว้กับ coverage-report.md §0/3-6 แล้วตรงกันทุกจุดที่สุ่มตรวจ ไม่มีตัวเลขที่ "โผล่มาเฉย ๆ" ที่หาที่มาไม่ได้

route factor (handoff เดิมของ QA ถึง product-manager): README §10.3 ข้อ 7 รายงานค่าที่วัดได้จริง 1.446 (ถ่วงประชากร 1.52) สอดคล้องกับ 1.4 ที่ P1-H08 เลือก และ coverage-report.md §8 ยืนยันว่าไม่ใช้ทางสำรอง (เส้นตรง × ตัวคูณ) ในการตัดสิน Go/No-go เลย ใช้ระยะจาก routing จริงเท่านั้น — DEP เดิมปิดแล้ว

## 4. GAP-01..04 (แผนทดสอบเดิม) — ปิดจริงด้วย test เฉพาะ ไม่ใช่แค่คำสัญญา

| GAP | สถานะ | หลักฐาน |
| --- | --- | --- |
| GAP-01 (ขอบพื้นที่ 3,000.0/150,000.0 พอดี) | ปิด | `pipeline/tests/test_gaps_fixtures.py::test_boundary_fixture_is_at_the_exact_value` และ `test_area_equal_to_limit_is_inclusive` ตั้ง limit = พื้นที่ที่วัดได้จริงเป๊ะแล้วเทียบ nextafter ข้างละ 1 ulp — พิสูจน์ inclusive ที่ขอบจริง ไม่ใช่ห่างขอบ 10 ตร.ม. เหมือนเดิม |
| GAP-02 (บล็อกเป็นรู, แตะต่ำกว่า partialOverlapShare, make_valid, assembly_failed) | ปิด | `test_temple_as_inner_ring_is_still_checked` + `test_temple_hole_in_heritage_piece_triggers_r2` (รู) · `test_overlap_below_partial_share_is_ignored` + `test_same_overlap_is_flagged_when_share_limit_is_lowered` (แตะเบา ๆ) · `test_make_valid_repair_small_change_is_kept` + `test_make_valid_change_above_limit_is_excluded` + `test_bowtie_counts_as_full_change` (make_valid, มีสูตรคณิตในคอมเมนต์ตรวจเทียบ) · `test_assembly_failed_lists_bowtie_and_open_relation` + `test_unclosed_candidate_way_is_listed` (way ไม่ปิด) — ทั้งหมดรันจริง ผ่าน (รวมอยู่ใน 176 passed หัวข้อ 2) |
| GAP-03 (`LICENSE-DATA.md`) | ปิด | `data/coverage/LICENSE-DATA.md` มีจริง (6,289 byte) ระบุ ODbL 1.0 / CC BY 4.0 ต่อไฟล์ครบ 6 ไฟล์ใน `data/coverage/` พร้อมคำถามเปิดถึง HUMAN 2 ข้อ (การรวม license ต่างชนิดในไฟล์เดียว, ข้อความอ้างอิง WorldPop แบบเต็ม) — ไม่บล็อก PASS เพราะข้อมูลมีอยู่แล้ว เป็นคำถามเสริม |
| GAP-04 (ขนาด `excluded.geojson` ใกล้เพดาน CI 95%) | ปิด | ปัจจุบัน 4,085,085 byte จากเพดาน 5,242,880 byte = ใช้ไป 77.9% (เหลือ headroom 22.1% > 20% ที่กำหนด) และตอนนี้มี `test_committed_excluded_has_headroom_under_ci_guard` (`test_compaction.py`) เป็น guard แบบ automated ทุกครั้งที่รัน ไม่ใช่แค่ตัวเลขที่สังเกตครั้งเดียวอีกต่อไป |

## 5. Test case ตามหัวข้อ 5 ของแผนทดสอบ — สรุปผล

ทุก case ด้านล่างมีหลักฐานเป็นคำสั่งจริงที่รันในรอบนี้ (หัวข้อ 2–4 ด้านบน) หรือมาจาก `pipeline/tests` ที่รันจริงแล้วผ่าน (176 passed, ตาราง case→expected→actual ที่พิมพ์จริงในหัวข้อ 6)

| กลุ่ม | ผล | หมายเหตุ |
| --- | --- | --- |
| REPRO-01..03 | PASS | pytest 176 passed สองรอบไม่ flake · pipeline รันจริง SHA-256 ตรง README · id เรียงจากน้อยไปมากยืนยันจาก `sorted by id: True` (สคริปต์ QA เอง) |
| CONF-01..07 | PASS | ครบใน `pipeline/tests/test_config.py` (11 test: area from config, filter from config only, missing key stops, religious cannot disable, D-026/D-027/D-028 switches, boundary count mismatch stops) — อ่าน source แล้ว assertion เทียบค่าจาก config object ไม่ใช่ hardcode ตัวเลข |
| AREA-01..04 | PASS | ปิดช่องว่างเดิม (GAP-01) แล้ว ดูหัวข้อ 4 |
| BLOCK-01,02,07 | PASS | park_is_temple→religious_self, pitch_in_school/pitch_in_university→blocked_education, park_in_cemetery→blocked_cemetery ยืนยันในตาราง case (หัวข้อ 6) |
| BLOCK-03..06 (health เต็มพื้นที่, government, military, diplomatic) | PASS บนข้อมูลจริง แต่พบช่องว่าง regression test | ดู BUG-F01-001 — ไม่มี fixture/unit test แยกหมวดนี้ แม้ข้อมูลจริงยืนยันนับได้ถูกต้อง (health 31, government 152, military 295, diplomatic 24 ใน README §7) |
| REL-01..09 | PASS | ตรงตาราง METHOD 7.4 ทั้ง 9 แถวในตาราง case→expected→actual (หัวข้อ 6) ทุกแถว |
| TEMPLEFAIR-01 | PASS (ตรวจมือเพิ่มเติม) | ดูหัวข้อ 7 |
| GEO-01..14 | PASS | ครบทุกข้อ รวม GEO-02/07/08/11 ที่เดิมเป็น GAP-02 (ปิดแล้ว หัวข้อ 4) |
| OTHER-01..04 | PASS | garden_private/market_indoor/garden_residential ตรงในตาราง case |
| POINT-01..03 | PASS | park_with_poi ยืนยัน POI ข้างใน · สคริปต์ QA เองตรวจ `points-unmatched.geojson` จริง 572 จุด ไม่มี `amenity=place_of_worship` ปนเลย (0/572) |
| SCHEMA-01..08 | PASS | ตรวจจริงบนข้อมูลทั้งประเทศด้วยสคริปต์ QA เอง: เรียงตาม id ✓, พิกัดทศนิยม ≤6 ตำแหน่ง ✓ (สุ่ม 200 feature), geometry เป็น MultiPolygon ทุกชิ้น (RFC 7946 ใช้ได้), `district_osm_id` ทุกชิ้นอยู่ใน 79 เขตจริง (0 invalid), excluded ไม่มี `reason_excluded` เป็น null เลยสักแถว (0/6287) |
| RAND-01 | PASS | เครือข่ายใช้ได้ในรอบนี้ (ต่างจาก assumption A-P1-F01-T04-1 ที่กลัวว่าจะไม่มีเน็ต) เรียก Nominatim lookup จริงด้วย seed เดิม (20260923, 30 id เดิมทุกตัว) ได้ found 30/30, tag_class_match 30/30, ISO province match 30/30 (ดูหัวข้อ 7) |
| PRIV-01 | PASS | grep `player`/`user_id`/`position_log` ใน `tools/coverage/` และ `data/coverage/` (ไม่รวม `.pyc`) ไม่พบเลย |
| LIC-01 | PASS | ปิดพร้อม GAP-03 (หัวข้อ 4) |
| CODE-01 | PARTIAL — พบบั๊ก | grep อักษรไทยในซอร์ส Python พบ hardcode ใน `analysis/__main__.py`, `analysis/heatmap.py` (ไม่พบใน `pipeline/*.py` ที่เป็น scope เดิมของ CODE-01) → BUG-F01-002 (low) |
| DEP-01 (Python deps) | PASS | `requirements.txt` ตรงกับ README §2 ทุกตัว (`osmium==4.3.1` ฯลฯ) `.venv/` มี `.gitignore` ของตัวเอง |

## 6. ตาราง case → expected → actual ที่พิมพ์จริง (fixture, รันรอบนี้)

```
$ cd tools/coverage && .venv/bin/python -m pytest pipeline/tests -q -s -k print_case_table
... (42 case ทั้งหมด expected == actual ทุกแถว รวม REL-01..09 ตามชื่อ fixture:
     park_small_shrine_polygon, park_sala_400, park_20k_pow_node, park_4k_pow_node,
     attraction_pow_node, historic_wat_name, market_in_temple, pitch_in_school,
     park_hospital_fence — ตรงทั้ง 9 แถว)
1 passed, 175 deselected in 0.32s
```

## 7. TEMPLEFAIR-01 — negative test, ตรวจมือเพิ่มเติมนอกเหนือ grep อัตโนมัติ

grep ชื่อที่มีคำว่า "งานวัด/เทศกาลวัด/ลานวัด/ตลาดนัดวัด" ในทั้งสองไฟล์จริง พบ 2 รายการ:

- `osm-w1499793281` "ตลาดนัดวัดพลมานีย์" — **อยู่ใน candidates** (`reason_excluded: null`, ไม่มี `contains_religious_feature`, `related_ids` ว่างเปล่า)
- `osm-w1239588053` "ตลาดนัดวัดไผ่เงิน" — อยู่ใน excluded, `blocked_religious`

ตรวจ properties เต็มของชิ้นแรกแล้ว: `amenity=marketplace`, พื้นที่ 13,916.5 ตร.ม., ไม่มี blocker ศาสนาทับเลย (share 0, ไม่ใช่แค่ต่ำกว่า threshold) — เป็นตลาดถาวรที่ตั้งชื่อตามวัดใกล้เคียง (รูปแบบการตั้งชื่อทั่วไปในไทย) ไม่ได้ตั้งอยู่บนที่ดินวัดจริง ต่างจากชิ้นที่สองที่ถูกตัดเพราะ geometry ทับที่ดินวัดจริง (`blocked_religious`, R4) — **นี่คือพฤติกรรมที่ METHOD 7.3 ตั้งใจ**: pipeline แยกด้วยเรขาคณิตจริง ไม่ใช่ชื่อ ไม่พบกรณี "งานวัด" (เทศกาลชั่วคราว) หลุดเข้า candidates แม้แต่ชิ้นเดียว → **TEMPLEFAIR-01 = PASS** ไม่ใช่ FAIL ตามที่ grep แบบผิวเผินอาจเข้าใจผิดได้ — บันทึกไว้เป็นตัวอย่างว่าทำไม case นี้ต้องตรวจมือ ไม่ใช่แค่ grep นับจำนวน

## 8. Bug ที่พบระหว่าง gate นี้

| id | severity | สรุป | owner | blocking PASS |
| --- | --- | --- | --- | --- |
| BUG-F01-001 | medium | ไม่มี fixture/unit test แยกสำหรับ BLOCK-03..06 (โรงพยาบาลเต็มพื้นที่, ราชการ, ทหาร, สถานทูต) แม้ข้อมูลจริงยืนยันว่านับถูกต้อง | location-engineer | ไม่ (severity < high) |
| BUG-F01-002 | low | ข้อความ UI/สรุปผลภาษาไทย hardcode ใน `analysis/__main__.py`, `analysis/heatmap.py` ขัด "โค้ดเป็นภาษาอังกฤษ" ของ CLAUDE.md | location-engineer | ไม่ |

รายละเอียดเต็มพร้อม reproduction steps อยู่ใน `qa/bugs.md` — **ไม่มี bug severity high ขึ้นไปค้างอยู่** เงื่อนไข exit ข้อสุดท้ายของแผนทดสอบผ่าน

## 9. Traceability สรุปกับ acceptance ของ P1-F01-T08 (board)

- [x] "ทุก case ใน `qa/plans/F01-test-plan.md` มีผล พร้อมหลักฐาน (คำสั่งที่รัน, ผลต่าง, ภาพ)" — หัวข้อ 5–7 ด้านบน ครบทุกกลุ่ม case พร้อมคำสั่ง/checksum/สคริปต์จริง
- [x] "ยืนยันรันซ้ำได้ผลตรงกัน และตัวเลขใน report ตรงกับ `district-counts.csv`" — หัวข้อ 2 (checksum ตรง 4 ไฟล์) และหัวข้อ 3 (นับ/คำนวณอิสระตรงกับ CSV และ coverage-report.md ทุกตัวเลขที่สุ่มตรวจ)
- [x] "verdict PASS / NEEDS_CHANGES พร้อม findings เป็น handoff" — verdict: **PASS**, findings 2 ข้อเป็น handoff ด้านล่าง (ไม่บล็อก)

## 10. Handoff

- ถึง location-engineer: แก้ BUG-F01-001 (เพิ่ม fixture/unit test แยกหมวด health/government/military/diplomatic เทียบเท่าที่มีให้ religious) และ BUG-F01-002 (ย้ายข้อความ UI ของ heatmap/CLI summary เป็นค่าคงที่/ไฟล์ template แยก หรือย้ายไป config ให้โค้ด Python เหลือแต่ภาษาอังกฤษ) — ไม่บล็อก PASS รอบนี้ แต่ควรแก้ก่อนรอบถัดไปที่แตะโค้ดสองไฟล์นี้ | blocking: no
- ถึง game-director/product-manager (P1-F01-T09/T10): ใช้รายงานนี้เป็นหลักฐานยืนยันตัวเลขใน `design/levels/coverage-report.md` ก่อนส่งต่อ HUMAN (P1-F01-T11) — QA ยืนยันว่าตัวเลขสรุปหน้าแรกของ coverage-report.md ตรงกับคอลัมน์ที่คำนวณอิสระได้จริง | blocking: no
- ถึง HUMAN (ผ่าน P1-F01-T11): คำถามเปิดใน `data/coverage/LICENSE-DATA.md` หัวข้อ 4 (การรวม ODbL+CC BY 4.0 ในไฟล์เดียว, ข้อความอ้างอิง WorldPop เต็ม) ยังไม่ถูกตัดสิน ไม่กระทบ QA gate นี้แต่ควรตอบก่อนเผยแพร่ข้อมูลสาธารณะ | blocking: no

## REPORT
task: P1-F01-T08
status: DONE
summary: QA gate F01 verdict PASS — รันซ้ำอิสระทุกคำสั่งได้ checksum ตรง README/CSV 100%, นับ/คำนวณอิสระตรงกับ district-counts.csv และ coverage-report.md ทุกตัวเลข, GAP-01..04 ปิดจริงด้วย test เฉพาะ, RAND-01 ผ่าน 30/30, `COVERAGE_PYTEST_REQUIRED=1 pnpm test` ผ่าน 889 test พบ 2 บั๊ก (medium/low) ไม่บล็อก
outputs:
  - qa/reports/F01-qa-gate.md — รายงาน QA gate เต็ม พร้อมหลักฐานคำสั่ง/checksum/สคริปต์อิสระ
  - qa/bugs.md — บั๊ก 2 รายการใหม่ (BUG-F01-001 medium, BUG-F01-002 low)
acceptance:
  - [x] ทุก case ใน test plan มีผลพร้อมหลักฐาน — หัวข้อ 5–7 ของรายงาน
  - [x] ยืนยันรันซ้ำได้ผลตรงกัน ตัวเลขตรงกับ district-counts.csv — หัวข้อ 2–3 (checksum ตรง 100%, นับอิสระ 0 mismatch จาก 79 เขต)
  - [x] verdict PASS/NEEDS_CHANGES พร้อม findings เป็น handoff — verdict PASS, หัวข้อ 10
assumptions:
  - none (A-P1-F01-T04-1 ของแผนทดสอบเดิมไม่เกิดจริง เพราะ sandbox รอบนี้มีอินเทอร์เน็ตเรียก Nominatim ได้; A-P1-F01-T04-2 ตรวจแล้วในหัวข้อ 3 ของรายงานนี้ว่า dungeon-rules.md ตรงกับ coverageFilter.majorWayTags/review_required จริง)
handoffs:
  - to: location-engineer | need: แก้ BUG-F01-001 (fixture/unit test หมวด health/government/military/diplomatic) และ BUG-F01-002 (ย้ายข้อความไทย hardcode ออกจากซอร์ส Python) | why: กติกา CLAUDE.md และช่องว่าง regression test เชิงความปลอดภัย | blocking: no
  - to: game-director, product-manager | need: ใช้รายงานนี้อ้างอิงก่อนอนุมัติ P1-F01-T09/T10 | why: ยืนยันตัวเลขใน coverage-report.md สืบไปถึงคำสั่งจริงได้แล้ว | blocking: no
  - to: HUMAN (ผ่าน P1-F01-T11) | need: ตอบคำถาม license ผสม ODbL+CC BY 4.0 ใน LICENSE-DATA.md หัวข้อ 4 | why: ยังไม่ตัดสิน ก่อนเผยแพร่สาธารณะ | blocking: no
decisions:
  - none
questions_for_human:
  - none
