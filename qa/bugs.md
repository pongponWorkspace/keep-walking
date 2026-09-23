# Bug list

รูปแบบต่อรายการ: id, severity, feature, steps/trace, expected, actual, owner, status

**สถานะรวม (P1-CLOSE-QA, 2026-09-24):** BUG-F01-001, BUG-F01-002, BUG-F01-003 ปิดครบทั้ง 3 รายการ (ดูหลักฐานปิดในแต่ละรายการด้านล่าง) — ไม่มี bug OPEN เหลืออยู่ในไฟล์นี้ และไม่เคยมี bug severity high ขึ้นไปที่พบตลอด Phase 1

---

## BUG-F01-001

- severity: medium
- feature: F01 — Coverage Survey
- found_in: `qa/reports/F01-qa-gate.md` (P1-F01-T08)
- steps/trace:
  1. `grep -n "hospital\|townhall\|government\|military\|embassy\|diplomatic" tools/coverage/pipeline/tests/fixture_osm.py` → พบเฉพาะ `park_hospital_fence` (รั้วแตะ 2% share, ใช้พิสูจน์ REL-09 ว่า "ไม่ตัด" ที่ share ต่ำ ไม่ใช่พิสูจน์ว่า "ตัด" ที่ share สูง)
  2. `grep -n "hospital\|townhall\|government\|military\|embassy\|diplomatic" tools/coverage/pipeline/tests/test_rules.py` → ไม่พบเลย ยกเว้น `test_blocklist_categories_and_area_only` ที่ทดสอบเฉพาะ `amenity=clinic → health` และหมวดศาสนา 3 แบบที่ระดับ unit function `rules.categories()`
  3. ผลรันจริงบน D1 (README §7) ยืนยันว่าตัวนับ `blocked_health 31 · blocked_government 152 · blocked_military 295 · blocked_diplomatic 24` มีอยู่จริง แต่เป็นหลักฐานทางอ้อมจากข้อมูลจริง ไม่ใช่ regression test ที่ควบคุมได้
- expected: BLOCK-03 (โรงพยาบาล เต็มพื้นที่), BLOCK-04 (ราชการ), BLOCK-05 (ทหาร), BLOCK-06 (สถานทูต) ควรมี fixture end-to-end หรืออย่างน้อย unit test ที่ `rules.categories()` แบบเดียวกับที่มีให้ `health`/`religious` เพื่อพิสูจน์ว่าแต่ละ tag ในตาราง `coverageFilter.blocklistCategoryTags` (`config/balance/dungeons.json:215-240`) map เข้าหมวดที่ถูกต้องจริง ไม่ใช่ผ่านเพราะบังเอิญไม่มีชิ้นทดสอบพัง
- actual: ไม่มี fixture หรือ unit test แยกสำหรับ 4 หมวดนี้ (มีแค่ config ที่ประกาศ tag ไว้ และผลนับจากข้อมูลจริงที่ไม่ได้ถูก assert ไว้ใน test ใด ๆ) — ถ้าคนแก้ `pipeline/tags.py` หรือ `config/balance/dungeons.json` ในอนาคตพลาดจนหมวดนี้หลุด จะไม่มี test ใดจับได้ก่อนขึ้น production
- risk: การเดินเข้าโรงพยาบาล/ค่ายทหาร/สถานทูตในเกมมีความเสี่ยงด้านความปลอดภัยและความสัมพันธ์ระหว่างประเทศจริง ไม่ใช่แค่บั๊กเชิงข้อมูล — แม้ปัจจุบันทำงานถูกต้องบนข้อมูลจริง แต่ไม่มี safety net เชิง regression
- owner: location-engineer
- status: **CLOSED** (fixed by P1-X29, verified by P1-CLOSE-QA regression on 2026-09-24)
- closed_evidence:
  1. `tools/coverage/pipeline/tests/test_blocklist_categories.py` and `tools/coverage/pipeline/tests/fixture_blocklist.py` now exist, with a dedicated case table for all four categories (health/government/military/diplomatic), e.g. `park_is_hospital → blocked_health`, `park_in_townhall → blocked_government`, `park_is_military → blocked_military`, `park_is_embassy → blocked_diplomatic`.
  2. Re-ran independently: `cd tools/coverage && .venv/bin/python -m pytest pipeline/tests/test_blocklist_categories.py -q` → `80 passed in 0.07s`.
  3. These 80 cases are part of the full suite verified green in this regression: `COVERAGE_PYTEST_REQUIRED=1 pnpm test` → `Test Files 62 passed (62)`, `Tests 927 passed | 2 skipped (929)`.
- not blocking: closed, no residual risk — regression coverage now exists for all four blocklist categories.

---

## BUG-F01-002

- severity: low
- feature: F01 — Coverage Survey
- found_in: `qa/reports/F01-qa-gate.md` (P1-F01-T08)
- steps/trace:
  1. `grep -rnP "[ก-๙]" tools/coverage/pipeline/*.py tools/coverage/analysis/*.py tools/coverage/boundaries/*.py`
  2. พบข้อความไทย hardcode เป็น f-string/print ใน `tools/coverage/analysis/__main__.py:155-160` (สรุปผลรันทาง CLI) และ `tools/coverage/analysis/heatmap.py:135-234` (หัวข้อ ป้ายกำกับ และข้อความในหน้า `heatmap/index.html`)
- expected: ตาม CLAUDE.md "โค้ด, คอมเมนต์โค้ด, ชื่อ API: ภาษาอังกฤษ" — ข้อความไทยควรอยู่ใน config/ข้อมูล ไม่ใช่ hardcode ในซอร์สโค้ด Python (ยกเว้นชื่อเขต/จังหวัดซึ่งเป็นข้อมูลจริง ไม่ใช่ log/UI copy)
- actual: มีข้อความ UI ของหน้า heatmap และบรรทัดสรุปผลทาง CLI เป็นภาษาไทย hardcode ตรงในซอร์สโค้ด
- owner: location-engineer
- status: **CLOSED** (fixed by P1-X29, verified by P1-CLOSE-QA regression on 2026-09-24)
- closed_evidence:
  1. Thai UI/summary text moved out of Python source into `tools/coverage/analysis/heatmap-strings.th.json` (labels/copy for the heatmap page) and `tools/coverage/analysis/heatmap-template.html` (template with placeholders, filled at build time).
  2. Re-ran: `grep -rnP "[ก-๙]" tools/coverage/pipeline/*.py tools/coverage/analysis/*.py tools/coverage/boundaries/*.py` → only remaining hit is a docstring in `boundaries/osm.py:27` quoting a real administrative prefix ("จังหวัด") as a data example, not hardcoded UI/log copy — acceptable (CLAUDE.md exempts real names/data, only bars UI/log copy).
  3. `pipeline/tests/test_heatmap_text.py` (part of the 80+ new/updated tests) asserts the template's placeholder fields match the strings file; included in the green `COVERAGE_PYTEST_REQUIRED=1 pnpm test` run (927 passed | 2 skipped).
- not blocking: closed.

---

## BUG-F01-003

- severity: medium
- feature: F01 — Coverage Survey (พบระหว่างรัน `pnpm lint` ของ QA gate F02, P1-F02-T16, เพราะ `pnpm lint` เป็นคำสั่ง root เดียวที่ทั้งสอง feature ใช้ร่วมกัน)
- found_in: `qa/reports/F02-qa-gate.md` (P1-F02-T16), ตรวจซ้ำด้วย `pnpm lint` ตรง ๆ
- steps/trace:
  1. `pnpm lint` (root) ล้มที่ `prettier --check .` โดยชี้ 2 ไฟล์ที่ยังไม่ commit: `tools/coverage/analysis/heatmap-strings.th.json`, `tools/coverage/analysis/heatmap-template.html`
  2. ทดสอบสมมติฐาน "รัน `prettier --write` แล้วจบ" (แบบเดียวกับ F-01 ใน tech gate ที่แก้ด้วยคอมเมนต์บรรทัดเดียว): `npx prettier --write` ทั้งสองไฟล์ → `heatmap-strings.th.json` ผ่านจริงและปลอดภัย (JSON, ยืนยันด้วย `python3 -c "import json; json.load(...)"` ว่าค่าเหมือนเดิมทุกคีย์) แต่ `heatmap-template.html` **พังการทำงานจริง**: `COVERAGE_PYTEST_REQUIRED=1 pnpm test` ล้มที่ `pipeline/tests/test_heatmap_text.py::test_template_fields_match_build_html` (`ValueError: unexpected '{' in field name`)
  3. สาเหตุ: ไฟล์นี้ใช้ `{{` / `}}` ที่ต้องอยู่ติดกันเป็น escape ของ Python `str.format()` (บล็อก `<style>` และ `<script>`) — Prettier จัดรูปแบบ `<script>` ใหม่ (ตัด `function t(id, el) {{ ... }}` ออกเป็นหลายบรรทัด) ทำให้ `{` คู่ที่ต้องติดกันแยกจากกันด้วยขึ้นบรรทัดใหม่ ทำลาย escape
  4. QA แก้ไขคืนด้วยมือ (คงบล็อก `<script>` ให้ `{{`/`}}` ติดกันในบรรทัดเดียวเหมือนบล็อก `<style>` ที่อยู่ข้าง ๆ) ยืนยันด้วย `pytest pipeline/tests/test_heatmap_text.py -q` → 4 passed แต่ผลที่ได้ **ไม่ผ่าน `prettier --check` อีก** (`npx prettier --check` ยังฟ้องไฟล์เดิม) เพราะโครงสร้าง escape นี้ขัดกับการจัดรูปแบบอัตโนมัติของ Prettier โดยธรรมชาติ ไม่ใช่แค่ "ยังไม่ได้รัน format"
- expected: `pnpm lint` (root, ใช้ร่วมกันทุก feature รวมถึง F02) ควร exit 0 ได้โดยไม่ทำให้ไฟล์นี้เสียการทำงาน — ต้องเป็นทางแก้เชิงโครงสร้าง เช่น เพิ่ม path นี้ใน `.prettierignore` (มีบรรทัดเหตุผลกำกับเหมือนรายการอื่นในไฟล์นั้นที่ยกเว้น `config/`, `data/` ฯลฯ เพราะเจ้าของอื่นและไม่ใช่โค้ดแอป) หรือเปลี่ยนวิธี escape brace ของ template ให้ไม่ต้องพึ่งพา embedded `<script>`/`<style>` ที่ Prettier จะจัดรูปแบบใหม่ (เช่น เก็บ CSS/JS เป็นสตริง Python แยกแล้วประกอบตอน `write_text`)
- actual: ปัจจุบัน `heatmap-template.html` ทำงานถูกต้อง (pytest ผ่าน 4/4) แต่ไม่ผ่าน `prettier --check` และไม่มีทางแก้แบบ one-line เหมือน F-01 — เป็น pre-existing gap ที่มีอยู่ก่อน QA แตะไฟล์นี้ (ไฟล์ยังไม่ commit และไม่เคยผ่าน `pnpm lint` มาก่อนตั้งแต่ถูกสร้าง ไม่ใช่ QA ทำให้เกิดใหม่) — ยืนยันด้วย `git status --porcelain` ว่าทั้งสองไฟล์เป็น `??` (untracked) ตลอดการตรวจ
- owner: location-engineer (เจ้าของ `tools/coverage/analysis/`, P1-F01-T06) — อาจต้องปรึกษา tech-lead ถ้าเลือกแก้ที่ `.prettierignore` (ไฟล์นั้นเป็นของ root/tooling convention)
- status: **CLOSED** (fixed by P1-X31, verified by P1-CLOSE-QA regression on 2026-09-24)
- closed_evidence:
  1. `.prettierignore` line 39 now lists `tools/coverage/analysis/heatmap-template.html` with a reasoning comment above it (line 38, pointing at `pipeline/tests/test_heatmap_text.py` as the real correctness check instead of Prettier).
  2. Re-ran independently: `npx prettier --check tools/coverage/analysis/heatmap-template.html tools/coverage/analysis/heatmap-strings.th.json` → `All matched files use Prettier code style!`.
  3. Root `pnpm lint` (`eslint . --max-warnings=0 && prettier --check . && pnpm run lint:copy`) → exit 0 in this regression run.
- not blocking: closed.
