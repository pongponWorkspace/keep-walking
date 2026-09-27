# Bug list

รูปแบบต่อรายการ: id, severity, feature, steps/trace, expected, actual, owner, status

**สถานะรวม (P1-CLOSE-QA, 2026-09-24):** BUG-F01-001, BUG-F01-002, BUG-F01-003 ปิดครบทั้ง 3 รายการ (ดูหลักฐานปิดในแต่ละรายการด้านล่าง) — ไม่มี bug OPEN เหลืออยู่ในไฟล์นี้ และไม่เคยมี bug severity high ขึ้นไปที่พบตลอด Phase 1

**สถานะรวม (P2-F04-T09, 2026-09-27):** เพิ่ม 2 รายการย้อนหลัง (P1-H06 severity high, บันทึกตอนพบใน P1-F03-T22 แต่ยังไม่เคยลงในไฟล์นี้ · BUG-P2-001 severity medium จาก P2-F04-T19) — ทั้งสองปิดแล้วพร้อมหลักฐานตรวจซ้ำอิสระด้านล่าง ไม่มี bug OPEN เหลืออยู่ในไฟล์นี้

**สถานะรวม (P2-F04-T22, 2026-09-27):** เพิ่ม **BUG-P2-002 severity high, สถานะ OPEN** (พบตอนขับ trace teleport-spoof ผ่าน `sessionStep` จริงเป็นครั้งแรก แทน `checkInBatch`) — **บั๊กนี้บล็อกการให้ verdict PASS ของ QA gate** จนกว่า backend-programmer จะแก้และ regression test กลับมาเขียวปกติ · เพิ่ม **BUG-P2-003 severity medium, สถานะ OPEN** (เดินเข้า dungeon ที่ปิดครั้งแรกไม่ขึ้น popup B4 ตาม flow spec — ไม่กระทบ safety property เพราะไม่มีปุ่ม "เข้า" ให้กดอยู่แล้ว) — ไม่บล็อก PASS

---

## BUG-P1-H06

- severity: **high**
- feature: F02/F03 — Map style spike (dungeon rift rendering)
- found_in: `qa/reports/F02/map-style/P1-H06-screenshot-tests.md` หัวข้อ 5 (P1-F03-T22, ตรวจ 2026-09-24) — บันทึกย้อนหลังในไฟล์นี้ตอนนี้เพราะ `qa/bugs.md` ไม่เคยอยู่ใน `writes` ของงานที่พบบั๊ก จนกระทั่ง P2-F04-T09 (บอร์ด: "qa-tester: บันทึกบั๊ก severity high ของ P1-H06 ... ย้อนหลัง")
- steps/trace:
  1. เปิด fixture ลุมพินี (`tools/tiles/fixtures/lumpini`) ด้วย `art/direction/map-style/kw-light.style.json` เวอร์ชันตอนนั้น (0.2.0 ก่อน P1-X32) ผ่าน `qa/reports/F02/map-style/capture-screenshots.spec.ts`
  2. ถ่ายจอ S1 (สวนลุมพินี, `sample-open-01`) และ S3 (สวนจตุจักร, `sample-sponsored-01`) ที่ zoom ตามตาราง 10.1
  3. ดูภาพ: S1 เห็นชื่อ dungeon/จำนวนคน/ไอคอนรอยแยกซ้ำกัน **4 ชุด** กระจาย 4 มุมของ polygon เดียว, S3 เห็นซ้ำ **2 ชุด** ซ้อนทับเกือบสนิท
- expected: dungeon เดียวแสดงชื่อ/จำนวนคน/ป้าย sponsored/ไอคอนรอยแยก **1 ชุดเท่านั้น** ไม่ว่า polygon จะกว้างแค่ไหน
- actual: `kw-rift-name`/`kw-rift-count`/`kw-rift-sponsored`/`kw-rift-crack` เป็น symbol layer ที่อ่านตำแหน่งจาก source polygon `kw-dungeons` โดยตรง — เมื่อ polygon กว้างพอที่ MapLibre จะตัดข้ามหลาย internal geojson-vt tile ภายใน แต่ละ tile คำนวณ anchor ของตัวเองและวาดซ้ำ ยิ่งเห็นชัดเพราะทุกชั้นตั้ง `*-allow-overlap: true` (ปิด collision detection)
- risk: กระทบภาพลักษณ์หลักของ "รอยแยก" ซึ่งเป็นองค์ประกอบ UI หลักของเกม และจะเกิดกับ dungeon จริงเกือบทุกแห่งที่ขนาดไม่เล็กมาก ไม่ใช่แค่ sample ทดสอบ
- owner: art-director (สไตล์ JSON) + gameplay-programmer (client ป้อน source ใหม่)
- status: **CLOSED** (fixed by P1-X32 + P1-X33, verified independently by P2-F04-T09 on 2026-09-27)
- closed_evidence:
  1. P1-X32 (art-director): แยก source จุด centroid `kw-dungeon-labels` — ทุก symbol layer (`kw-rift-crack`, `kw-rift-name`, `kw-rift-count`, `kw-rift-sponsored`) อ่านจาก `kw-dungeon-labels` เท่านั้น ส่วน `kw-dungeons` (polygon) เหลือแค่ fill/line layer (`kw-rift-fill`, `kw-rift-outline-closed`, `kw-rift-outline`, `kw-rift-inner`) — ยืนยันด้วย metadata `kw:dungeonSources` ในตัว `kw-light.style.json` เอง
  2. P1-X33 (gameplay-programmer): `apps/client/src/map/dungeons-source.ts` สร้าง/ป้อน source จุด centroid ตาม contract ใหม่ + e2e ยืนยันป้ายต่อ dungeon ขึ้นครั้งเดียว (`apps/client/e2e/dungeon-labels.spec.ts`)
  3. ตรวจซ้ำอิสระ (P2-F04-T09, 2026-09-27): สคริปต์อ่าน `kw-light.style.json` ยืนยันว่าทุก layer ที่ `source: "kw-dungeons"` เป็น `type: "fill"`/`"line"` เท่านั้น (`kw-rift-fill`, `kw-rift-outline-closed`, `kw-rift-outline`, `kw-rift-inner`) และทั้ง 4 symbol layer อ่าน `source: "kw-dungeon-labels"` — ไม่มี symbol layer เหลืออยู่บน `kw-dungeons` เลย
  4. เพิ่ม regression ถาวรใน `qa/tests/unit/map-style.test.ts` (P1-X32 handoff เดิม → P2-F04-T09): 2 case ใหม่ — "no symbol layer reads the kw-dungeons polygon source" และ "every dungeon symbol layer reads kw-dungeon-labels" — รัน `npx vitest run qa/tests/unit/map-style.test.ts` → `Test Files 1 passed`, `Tests 4 passed`
- not blocking: closed, มี regression test ถาวรกันการกลับมาเกิดซ้ำแล้ว

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

---

## BUG-P2-001

- severity: medium
- feature: F04/F05/F06 — combat formulas (`combat.zoneLevelFrom`), reward tick exp
- found_in: `qa/plans/F04-test-plan.md` §10 "F04-F1" and `qa/plans/F05-test-plan.md` §8 (P2-F04-T19, 2026-09-27) — both explicitly deferred logging this bug to whichever task holds `qa/bugs.md` in its `writes` (that task did not), which is this task
- steps/trace:
  1. `pnpm test` (root) at the time of P2-F04-T19
  2. Failure surfaced in `packages/shared/src/formulas/vectors.test.ts`: 20 cases red — `damage.json` `fn=zoneLevel` (10 cases), `tick-reward.json` `fn=soloTickExp` (10 cases)
  3. Root cause (D-112, `studio/decisions/decision-log.md`): `combat.zoneLevelFrom` had not yet been changed to `clamp(playerLevel, levelMin, levelMax)` — e.g. a level-30 player in a 1–35 zone was expected to get `Z=30` but the engine still returned `Z=18` (the old "midpoint of range" rule)
- expected: `combat.zoneLevelFrom` implements `playerLevelClampedToRange` per D-112, used consistently by both `damage` and `exp` — every vector in `design/systems/test-vectors/damage.json` and `tick-reward.json` passes
- actual (at time found): `zoneLevelFrom` still implemented the pre-D-112 rule, breaking 20 golden-vector cases and blocking a fully green `pnpm test`
- owner: systems-designer (vector/formula spec) + backend-programmer (port into `packages/shared`)
- status: **CLOSED** (fixed by P2-X09 (systems-designer: `combat.zoneLevelFrom = playerLevelClampedToRange` + regenerated vectors) and P2-X10 (backend-programmer: engine implementation + fail-closed guard), verified independently by P2-F04-T09 on 2026-09-27)
- closed_evidence:
  1. `config/balance/combat.json`'s `zoneLevelFrom` is now `"playerLevelClampedToRange"` (P2-X09) and `packages/shared/src/formulas/` computes `zoneLevel(playerLevel, min, max)` as a clamp, used by both the damage and exp call sites, with an engine guard that fails closed if `zoneLevelFrom` is ever anything else (P2-X10)
  2. Re-ran independently: `npx vitest run packages/shared/src/formulas/vectors.test.ts` → `Test Files 1 passed`, `Tests 380 passed` — includes every `damage.json` `fn=zoneLevel` and `tick-reward.json` `fn=soloTickExp` case, all green. Re-confirmed later the same day with a name filter immune to unrelated concurrent edits to this same file (see note below): `-t "zoneLevel"` → `10 passed`, `-t "soloTickExp"` → `13 passed` — both still 100% green
  3. Full `pnpm test` at the start of this task's run (before an unrelated, concurrent in-progress edit to `packages/shared/src/session/types.ts` / `packages/shared/src/hp/` — outside this task's `writes`, apparently a different in-flight task building F06 HP/damage — began transiently failing `packages/shared/src/session/reducer.test.ts` on a `SessionConfig` fixture shape mismatch unrelated to zoneLevel/soloTickExp): `Test Files 140 passed (140)`, `Tests 2217 passed | 2 skipped (2219)` — zero failures anywhere, including every formula/reward/session file. See this task's QA gate report for the exact timestamp and the note on the later transient unrelated failures.
- not blocking: closed — the specific D-112 zoneLevel/soloTickExp vectors this bug is about remain green in every run performed during this task, including the most recent one done in isolation.
- note (unrelated, not part of this bug): later in this same task, `packages/shared/src/formulas/vectors.test.ts` itself started failing on *new* `fn` cases ("vectors.test.ts does not know how to evaluate fn=...") because a different, concurrent in-progress task (outside this task's `writes`) was mid-edit adding HP/damage vector coverage to that file. Confirmed unrelated by filtering to only this bug's own cases (`-t "zoneLevel"` / `-t "soloTickExp"`), both still fully green — see evidence item 2.

---

## BUG-P2-002

- severity: **high**
- feature: F04 — check-in anti-cheat (`teleportIntoPolygonAllowed: false`, GD B-03, F04-R07(2)/E5)
- found_in: `qa/tests/F04/session-checkin-lifecycle.test.ts` (P2-F04-T22, 2026-09-27) — the first
  time the teleport-spoof case was driven through the *real* public entry point
  (`createSession`/`sessionStep`, `@keep-walking/shared/session`) instead of the standalone
  `checkInBatch` helper `qa/tests/traces/engine-checkin.test.ts` (P2-F04-T19) uses
- steps/trace:
  1. Replay `data/gps-traces/synthetic/synthetic-teleport-spoof-01.trace.json` (stand ~1.3 km away
     for 90 s, one 1-second-gap fix teleports into the middle of the polygon, then a legitimate
     3-minute loop inside) sample-by-sample through `sessionStep` (`{type:'sample', ...}` per
     trace sample), against a QA dungeon whose config comes from the client's own real
     `buildSessionConfig()` (`config/balance/anticheat.json#checkIn.teleportIntoPolygonAllowed =
     false`)
  2. Call `selectCheckInPreview(state, dungeonId, now_ms, params)` at the end of the trace
  3. Compare against `checkInBatch` called on the identical trace/samples
     (`qa/tests/traces/engine-checkin.test.ts`, already green)
- expected: `{ ok: false, reason: 'no_approach_from_outside' }` forever (same as `checkInBatch`) —
  a single implausible-speed jump into the polygon must never count as a legitimate "seen from
  outside, then walked in" approach
- actual: `sessionStep` returns `{ ok: true }` once 60+ seconds have elapsed inside after the
  teleport. Root cause (`packages/shared/src/session/reducer.ts`, function `handleSample`):
  `usableAndUnlocked = accuracyOk && !lock.locked` is fed straight into `approachStep` — there is
  no speed-outlier check at all here, even though `packages/shared/src/run/approach.ts`'s own
  `ApproachSample.usableAndUnlocked` field comment documents it as "Passed the gate outlier filter
  (accuracy + speed, ADR 0003 5.3 step 1) and not speed-locked". Because the outlier-speed filter
  never breaks the chain: (a) the 1-second gap between the last far-away fix and the teleported fix
  is far under `maxSamplePairGap_s` (30 s), so `approachStep` treats it as one unbroken chain
  instead of restarting it at the teleported fix, and (b) the far-away fix immediately before the
  teleport gets recorded as a genuine `outsideSeenAt_ms[dungeonId]` sighting, which is exactly what
  `teleportIntoPolygonAllowed: false`'s own check in `packages/shared/src/run/check-in.ts` treats as
  proof of "seen from outside" — so the anti-teleport rule is satisfied by a sighting that was never
  a real walk, only a jump
- risk: a player can teleport (GPS spoof) directly into any dungeon and, after standing still for
  just over `minContinuousApproach_s`, check in without ever having been physically near it —
  exactly the attack GD B-03 names by ID as forbidden. Does not by itself grant any reward (the
  separate movement gate still requires real movement for a tick), but it does grant a real,
  provable `dungeon_entered`/run/HP-hit-clock start on zero real presence, which is the specific
  guarantee this config flag and this GD ruling exist to give
- owner: backend-programmer (`packages/shared/src/session/reducer.ts` `handleSample`, and/or
  `packages/shared/src/run/approach.ts` if the outlier params should be threaded into
  `ApproachSample` instead)
- status: **OPEN**
- suggested fix (not authoritative — backend-programmer's call): compute a genuine outlier-speed
  flag the same way the gate/movement-distance path already does (it clearly exists somewhere for
  `dungeons.movementGate.outlierSpeed_kmh`/`outlierReanchorSamples`, since traces like
  `synthetic-drift-spike-01` prove distance-accumulation already ignores spikes) and AND it into
  `usableAndUnlocked` before calling `approachStep`, so a physically-impossible jump breaks the
  approach chain (and is never recorded as an `outsideSeenAt_ms` sighting) the same way a
  poor-accuracy or speed-locked sample already does
- regression test: `qa/tests/F04/session-checkin-lifecycle.test.ts` — `it.fails(...)` case named
  with `(BUG-P2-002)` encodes the spec-correct expectation as an expected-red test (passes the
  suite only while the assertion still fails); flip it back to a plain `it` once fixed, at which
  point `it.fails` itself will fail loudly (Vitest fails an `it.fails` block that unexpectedly
  passes), forcing that flip to happen
- not blocking: **this bug blocks a QA-gate PASS** (severity high, protocol section "QA gate": "A
  bug of severity high or above blocks PASS") until backend-programmer fixes it and the regression
  test above is converted back to a normal, green `it`

---

## BUG-P2-003

- severity: **medium**
- feature: F04 — dungeon presence, closed-dungeon UX (flow B4)
- found_in: `qa/tests/e2e/f04-closed-dungeon.spec.ts` (P2-F04-T22, 2026-09-27)
- steps/trace:
  1. `data/gps-traces/qa/qa-e2e-khlong-ong-ang-closed-01.trace.json` (stand inside the real
     committed `khlong-ong-ang` dungeon, closed all day every Monday —
     `data/dungeons/artifact/dungeons.client.v1.json` `weekly["1"] = []`)
  2. Load the client with `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&start=2026-09-28T10:00`
     (a Monday, `openingHours.utcOffset_min` = UTC+7) and watch `.popup`/`.nav-panel-closed`
  3. Compare against `design/ux/flows/F04-dungeon-presence.md` line 80 (B4): "เกิดได้ทั้งตอนเดินเข้า
     เขตครั้งแรก (แทน B1) และตอนกด 'เข้า' แล้ว engine ปฏิเสธ" (occurs both walking in for the first
     time, replacing B1, and when pressing Enter and the engine rejects)
- expected: walking into a closed dungeon for the first time shows the B4 closed popup
  (`dungeon.closedTitle` + next-open time via `dungeon.closedBody`, no Enter button, only
  `dungeon.closedDismiss`) — the same screen a mid-confirm rejection would show
- actual: no popup appears at all. `apps/client/src/f04-app.ts`'s `renderConfirmIfNeeded` computes
  `openDungeonsContaining` filtered to `dungeonStatus(d, params, now_ms) === 'open'` *before*
  building any candidate list, so a closed dungeon is invisible to the whole confirm-popup code
  path — `ui/dungeon-confirm.ts`'s own `showClosed()` method has no real call site anywhere in
  `apps/client/src` (grepped: the only two matches are the method's own definition and the
  developer's isolated unit test `ui/dungeon-confirm.test.ts`). The only visible signal is the nav
  panel's `.nav-panel-closed` line (distance chip + `dungeon.closedBody`/`dungeon.closedEmergencyBody`),
  which does correctly show a next-opening-time value — so the player is not left with *no*
  information, just not the B4 screen the flow spec describes
- risk: UX/discoverability gap only — the safety property still holds (there is no Enter button
  anywhere to press, proven by the passing case in the same spec file), so no reward or anti-cheat
  guarantee is affected. A player walking into a closed dungeon sees a smaller nav-panel hint
  instead of the more prominent, spec-described full-screen closed message
- owner: gameplay-programmer (`apps/client/src/f04-app.ts` `renderConfirmIfNeeded`)
- status: **OPEN**
- suggested fix (not authoritative): when `openDungeonsContaining` (open-only) is empty but the
  player is inside at least one *closed* dungeon's polygon, call `confirmPopup.showClosed(...)`
  for the nearest/first such dungeon instead of falling through silently to `renderNearbyNav`
- regression test: `qa/tests/e2e/f04-closed-dungeon.spec.ts` — `test.fail(true, 'BUG-P2-003: ...')`
  encodes the spec-correct expectation (Playwright fails the suite if this test starts *passing*
  unexpectedly instead, which is the signal to remove the `test.fail` call once fixed)
- not blocking: severity medium, does not block a QA-gate PASS on its own (only high-or-above
  blocks, protocol section "QA gate") — still a handoff for the owner above
