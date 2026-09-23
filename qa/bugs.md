# Bug list

รูปแบบต่อรายการ: id, severity, feature, steps/trace, expected, actual, owner, status

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
- status: OPEN
- not blocking: severity ต่ำกว่า high, ข้อมูลจริงปัจจุบันถูกต้อง (ตรวจแล้วในหัวข้อ QA gate report ส่วน BLOCK) — ไม่บล็อก verdict PASS ของ P1-F01-T08 แต่ต้องแก้ก่อนรอบถัดไปที่มีการแก้ `pipeline/tags.py`

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
- status: OPEN
- not blocking: F01 เป็นเครื่องมือวิเคราะห์ offline ภายในทีม ไม่ใช่ UI ผู้เล่น ไม่ผ่าน copy.th.json/style guide 6 ข้อเพราะไม่ใช่ copy เกม (ตาม test plan หัวข้อ 1) แต่ยังถือเป็นการเบี่ยงเบนจากกติกา "โค้ดเป็นภาษาอังกฤษ" ของ CLAUDE.md จริง จึงบันทึกไว้ ไม่บล็อก verdict PASS

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
- status: OPEN
- not blocking: ไม่ใช่โค้ดของ F02 (client/location) ไม่กระทบ movement gate, privacy, หรือ non-negotiable ใด ๆ ของ F02 · เป็นเครื่องมือวิเคราะห์ offline ของ F01 เท่านั้น และ tech-lead เคยให้บรรทัดฐานเดียวกันไว้แล้วใน tech gate F02 (F-01: gitleaks false positive ในไฟล์ข้าง ๆ กัน — "blocking ก่อน commit ของ wave" ไม่ใช่ "blocking verdict ของ gate") จึงไม่บล็อก verdict ของ QA gate F02 แต่ **ต้องแก้ก่อน commit ของ wave นี้** เช่นเดียวกับ F-01 มิฉะนั้น job `lint` ของ CI จะแดงทันทีที่ไฟล์ทั้งสองถูก commit
