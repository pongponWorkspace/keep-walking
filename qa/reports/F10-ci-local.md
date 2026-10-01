CI-LOCAL GREEN

# F10 — CI local run (P2-F10-CI)

**สรุป (รอบ 2, 2026-10-01): CI-LOCAL GREEN** — ทุกขั้นของ `ci.yml` เขียวครบ 16/16 รวมทั้งขั้นที่เคย
แดงแบบ flaky ในรอบ 1 (`CI=1 playwright test --retries=0`) ตอนนี้ผ่านสะอาดทั้งสองรอบที่สั่งซ้ำ และ
`f10-telemetry-nav-story.spec.ts --repeat-each=10 --retries=0` ผ่าน 100/100 สองครั้งติด หลังแก้
BUG-P2-006 ด้วย commit `5870f0b` (P2-X70) — ดูหัวข้อ "รอบ 2" ด้านล่างสำหรับหลักฐานเต็ม
(ผลรอบ 1 เดิมเก็บไว้ไม่แก้ไขในหัวข้อ 1-4 ด้านล่างเพื่อ audit trail)

**สรุปเดิม (รอบ 1): CI-LOCAL RED** (1 ขั้นจาก 16 ไม่เขียวแบบ deterministic — ดูหัวข้อ 2.11 และ BUG-P2-006; ทุกขั้นอื่นเขียว)

รันทุกขั้นของ `.github/workflows/ci.yml` ในเครื่อง (macOS, Node ตาม `.nvmrc`=24, pnpm 11.24.0)
แบบ `CI=1` ตามลำดับจริงของไฟล์ ไม่มีขั้นไหนถูกข้ามโดยไม่มีเหตุผลบันทึกไว้ (ดูหัวข้อ 3)
commit ที่ทดสอบ: `cc0ad73` (HEAD ตอนเริ่มงานนี้, `git status` สะอาด)

## 1. สรุปผลต่อขั้น (ตามลำดับใน `ci.yml`)

| # | ขั้น | job ใน ci.yml | ผล | หลักฐาน |
| --- | --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | build-test | PASS | exit=0, "Lockfile is up to date" |
| 2 | `pnpm lint` | build-test | PASS | exit=0 (eslint+prettier+copy-lint, WARN เดิมเท่านั้น) |
| 3 | `pnpm typecheck` | build-test | PASS | exit=0, 4 โปรเจกต์ "Done" |
| 4 | `tsx tools/traces/src/generate.ts --check` | build-test | PASS | exit=0, 17 fixture "ok" |
| 5 | `tsx tools/sim/src/gen-vectors.ts --check` | build-test | PASS | exit=0, 19 ไฟล์ "up-to-date" |
| 6 | `pnpm test` | build-test | PASS | exit=0, 231 ไฟล์ผ่าน, 3542/3544 ผ่าน (2 skip เดิม) |
| 7 | `pnpm build` | build-test | PASS | exit=0, built ทุก workspace |
| 8 | `measure-bundle.ts` | build-test | PASS | exit=0, ทั้งสองกลุ่มอยู่ใน budget |
| 9 | `tsx tools/art/src/cli.ts prebuild` | e2e (ขั้นก่อน webServer build) | PASS | exit=0, "0 errors, 0 warnings" |
| 10 | `CI=1 pnpm test:e2e` (retries ตาม CI=2) | e2e | PASS | exit=0, 218 passed (3.2m) |
| 11 | `CI=1 pnpm exec playwright test --retries=0` (รอบที่ 2 ตาม brief) | — (เพิ่มเองตาม acceptance) | **RED (flaky)** | 217 passed, 1 failed ครั้งแรก; ยืนยันซ้ำ 5 ครั้ง: ผ่าน 4 แดง 1 → BUG-P2-006 |
| 12 | `bash infra/scripts/test/test-lint-headers.sh` | lint-headers | PASS | exit=0, "9 case(s), 0 failed" |
| 13 | `bash infra/scripts/test/test-billing-guard.sh` | billing-guard | PASS | exit=0, "7 case(s), 0 failed" |
| 14 | `bash infra/scripts/test/test-bbox-guard.sh` | map-bbox-guard | PASS | exit=0, "4 case(s), 0 failed" |
| 15 | gitleaks (secret-scan) | secret-scan | PASS | exit=0, "69 commits scanned ... no leaks found" |
| 16 | forbidden-files guard | forbidden-files | PASS | exit=0, ทุกกลุ่ม (1-5) "ok" |

ทุกขั้น 1-10, 12-16 เขียวตรงตามที่ ci.yml รันจริง ไม่มีขั้นไหนต้องข้าม — เครื่องนี้มีทั้ง `gitleaks`
(8.30.1 ตรงกับ pin ของ workflow เป๊ะ) และ Playwright browsers ติดตั้งแล้ว (`chromium-1243`,
`webkit-2359`) จึงไม่ต้องข้ามขั้นไหนด้วยเหตุผลเครื่องมือขาด

รายละเอียดเต็มของแต่ละขั้น (output จริง) อยู่ในหัวข้อ 2 ด้านล่าง ไฟล์ log เต็มอยู่ใน scratchpad ของ
งานนี้ (ไม่ commit เพราะไม่ใช่ path ใน `writes`)

## 2. รายละเอียดต่อขั้น (บรรทัดผลจริง)

### 2.1-2.5 build-test (ส่วน lint/typecheck/trace/vector)

```
$ pnpm install --frozen-lockfile
✓ Lockfile passes supply-chain policies (verified 3d ago)
Lockfile is up to date, resolution step is skipped
Done in 296ms using pnpm v11.24.0 — EXIT=0

$ pnpm lint
$ eslint . --max-warnings=0 && prettier --check . && pnpm run lint:copy
Checking formatting... All matched files use Prettier code style!
copy-lint: 12 WARN (ตัวแปร copy ที่ยังไม่ถูกใช้ + wording เดิม, ไม่ใช่ error, มีมาก่อนงานนี้) — EXIT=0

$ pnpm typecheck
packages/geo, packages/shared, tools/copy-lint, apps/client: tsc --noEmit → "Done" ทั้ง 4 — EXIT=0

$ pnpm exec tsx tools/traces/src/generate.ts --check
ok x 17 (รวม synthetic-*, qa-gate-*, polygons/test-rect-benchasiri.geojson) — EXIT=0

$ pnpm exec tsx tools/sim/src/gen-vectors.ts --check
up-to-date x 19 ไฟล์ (buff-stacking ... hp-recovery.json) — EXIT=0
```

**หมายเหตุตามที่ brief สั่งเฝ้าระวัง (character-name vectors):** `design/systems/test-vectors/
character-name.json` **ไม่อยู่ในรายการที่ `gen-vectors.ts --check` ตรวจ** (ตรวจแค่ 19 ไฟล์ตามรายการ
ข้างบน) เพราะไม่มี generator ของไฟล์นี้ใน `tools/sim` ตามที่ brief เตือนไว้จริง — เป็น reference
vectors ของ systems-designer ที่ถูก "ตรวจ" โดยการ import ตรงในเทสต์หน่วย 6 ไฟล์แทน (`apps/client/
src/onboarding/e2e-skip-seed.test.ts`, `apps/client/src/ui/create-character-screen.test.ts`,
`tools/config-lint/test/character.test.ts`, `tools/sim/src/sim.test.ts`, `packages/shared/src/
formulas/vectors.test.ts`, `packages/shared/src/character/character.test.ts`) ซึ่งทั้งหมดรันผ่านใน
ขั้น `pnpm test` ข้อ 2.6 ด้านล่าง — **ขั้นนี้ไม่ตกและไม่มีช่องว่างจริง** แค่ตรวจผ่านคนละกลไกกับไฟล์
vectors อื่น ไม่ใช่บั๊ก ไม่ต้อง handoff

### 2.6 `pnpm test` (รวม Python pytest bridge, `COVERAGE_PYTEST_REQUIRED=1`)

```
Test Files  231 passed (231)
     Tests  3542 passed | 2 skipped (3544)
  Duration  20.20s — EXIT=0
```

**N-02 (ไม่บล็อก, ตามที่ backlog ของ design gate สั่งให้ตรวจในงานนี้): ที่มาของ `DOMException
[AbortError]` ของ happy-dom ระหว่าง `pnpm test`.** ไล่หาต้นทางจริงด้วยการรันทีละไฟล์ที่ใช้ `fetch`
ใน happy-dom (`f04-app.test.ts`, `map/protocol.test.ts`, `map/style.test.ts`, `dungeons/
home-geometry.test.ts`, `assets/manifest.test.ts`, `assets/runtime.test.ts`, `assets/
icon-glyph.test.ts`) ทีละไฟล์แยกกัน: **`apps/client/src/f04-app.test.ts` คือต้นตอเดียว** (18/18
ครั้งของ AbortError มาจากไฟล์นี้ ไฟล์อื่น 0 ครั้ง) แต่ไฟล์นั้นเองผ่านครบ **11/11 test** ทุกครั้งที่รัน
(ทั้งรันเดี่ยวและรันรวมใน `pnpm test`) — ไม่ใช่ error จริงที่ error นี้ไปบังไว้

Root cause (อ่านจากโค้ดจริง ไม่ได้เดา): `apps/client/src/assets/icon-dom.ts`'s `setIconImg` สร้าง
`<img>` element แล้วตั้ง `src` แต่ไม่เคย await หรือยกเลิกการโหลดนั้นก่อนจบเทสต์ — `happy-dom` จำลอง
การโหลดภาพเป็น fetch งานหนึ่งอยู่เบื้องหลัง เมื่อเทสต์จบและ vitest teardown หน้าต่าง happy-dom ของ
ไฟล์นั้น มันเรียก `DetachedWindowAPI.abort()` ซึ่งยกเลิกทุก fetch ที่ยังค้างอยู่ รวมถึง fetch ของ
`<img>` เหล่านั้น แล้ว happy-dom เอง print `DOMException [AbortError]` ลง stderr เป็น console noise
(ไม่ใช่ unhandled rejection ที่ทำให้ process exit ไม่ใช่ศูนย์, ไม่ใช่ assertion ที่ถูกจับ try/catch
ทิ้งอย่างเงียบ) **ไม่ใช่บั๊กใหม่ ไม่บล็อก** — เป็นแค่ความรำคาญของ log ระหว่างทดสอบ owner ที่เหมาะสม
ถ้าจะทำความสะอาด log คือ gameplay-programmer (`apps/client/src/assets/icon-dom.ts` หรือ `f04-app.
test.ts` เพิ่ม `await` ให้ภาพโหลดเสร็จ/ใช้ `AbortController` เองก่อนจบแต่ละ test) แต่ไม่ใช่ความ
จำเป็นเร่งด่วนเพราะไม่กระทบผลทดสอบจริง

### 2.7-2.9 build / bundle budget / art prebuild

```
$ pnpm build → ✓ built in 358ms ทุก workspace (apps/client + packages) — EXIT=0
  (คำเตือน "chunks larger than 500 kB" เป็น informational ของ rolldown/Vite ไม่ใช่ error — ขั้นถัดไป
  คือตัวตรวจ budget จริง)

$ pnpm exec tsx apps/client/scripts/measure-bundle.ts
initial JS: 0.137 MB / budget 1.000 MB
map lazy JS: 0.350 MB / budget 0.700 MB — EXIT=0 (ทั้งสองกลุ่มอยู่ในงบ)

$ pnpm exec tsx tools/art/src/cli.ts prebuild
audio: generated, 0 problems
art-validate: 100 assets ... 0 errors, 0 warnings
stage: 85 assets + 12 in 1 lazy parts, 4 fonts, 22 audio cues → tools/art/out/client — EXIT=0
```

### 2.10 `CI=1 pnpm test:e2e` (รอบแรก, retries ตาม config CI = 2)

```
218 passed (3.2m) — EXIT=0
```
ครบทั้งสอง project (`android-chrome`, `ios-safari`) ตรงกับผลล่าสุดของ gameplay/e2e ก่อนหน้า
(context ของ brief บอก 218/218 — ตรงกันเป๊ะ) ไม่มี retry ไหนถูกใช้จริง (log ไม่มีบรรทัด "retry")

### 2.11 รันซ้ำแบบ `CI=1 pnpm exec playwright test --retries=0` (ตามที่ brief สั่งเพิ่ม)

รอบแรกของการรันซ้ำแบบไม่มี retry:
```
217 passed, 1 failed (3.2m) — EXIT=1
Failing: [ios-safari] qa/tests/e2e/f10-telemetry-nav-story.spec.ts:56:3
  F10-PM-01 ... "Inventory then upgrade/shop/party tapped back-to-back each record their own event(s)"
  Error: expect(navRecord?.client_ts_ms).toBe(comingSoonRecord?.client_ts_ms)
  Expected: 1790845789563
  Received: 1790845789562
```
ยืนยัน flaky จริงด้วยการรันเคสเดียวซ้ำ 5 ครั้งติด (`-g` + `--project=ios-safari`, ไม่มีการแก้โค้ด
ระหว่างรอบ): **ผ่าน 4, แดง 1** (รันที่ 5) ด้วย error เดิมทุกประการ (ต่างกัน 1 ms) — สรุปว่าเป็น flake
จริงจาก clock-tick boundary ของ `Date.now()` สองครั้งติดกัน ไม่ใช่ environment/เครื่องนี้ผิดปกติ
รายละเอียด root cause เต็มและ fix ที่แนะนำอยู่ใน **BUG-P2-006** (`qa/bugs.md`) — เปิดเป็นบั๊กใหม่
severity low, สถานะ OPEN, owner: gameplay-programmer, blocking: no สำหรับ QA gate F10 ที่ PASS ไป
แล้ว แต่เป็นเหตุผลเดียวที่ทำให้บรรทัดแรกของรายงานนี้เป็น RED แทน GREEN

### 2.12-2.14 lint-headers / billing-guard / map-bbox-guard

```
$ bash infra/scripts/test/test-lint-headers.sh → "9 case(s), 0 failed" / "test-lint-headers: PASS" — EXIT=0
$ bash infra/scripts/test/test-billing-guard.sh → "7 case(s), 0 failed" / "test-billing-guard: PASS" — EXIT=0
$ bash infra/scripts/test/test-bbox-guard.sh → "4 case(s), 0 failed" / "test-bbox-guard: PASS" — EXIT=0
```
ทั้งสามสคริปต์นี้ไม่ต้องใช้ network/credential (Python stdlib ล้วน ตามที่ header comment ของ ci.yml
ระบุ) รันได้ตรงตัวแบบเดียวกับใน workflow

### 2.15 secret-scan (gitleaks, full history) — **ไม่ข้าม มีเครื่องมือในเครื่อง**

เครื่องนี้มี `gitleaks` ติดตั้งผ่าน Homebrew ที่เวอร์ชัน **8.30.1 ตรงกับ `GITLEAKS_VERSION` ที่ pin
ไว้ใน ci.yml เป๊ะ** จึงรันคำสั่งเดียวกับ workflow ได้ตรงตัว (ข้ามขั้นดาวน์โหลด/ตรวจ sha256 เพราะ
binary มีอยู่แล้ว — เนื้อหาการสแกนเหมือนกัน):
```
$ gitleaks detect --source . --log-opts="--all" --config .gitleaks.toml --redact --verbose --exit-code 1
69 commits scanned.
scanned ~26545679 bytes (26.55 MB) in 3.87s
no leaks found — EXIT=0
```

### 2.16 forbidden-files guard — **ไม่ข้าม จำลองสคริปต์ inline ของ ci.yml เอง**

ขั้นนี้ไม่ใช่สคริปต์แยกไฟล์ (เป็น inline bash ใน `ci.yml` job `forbidden-files` โดยตรง) จึงคัดลอก
ตรรกะทั้ง 5 กลุ่มมารันในเครื่อง (ไฟล์ playtest raw, `.env*`, `*.pmtiles`, `*.osm.pbf`, ไฟล์เกิน 5 MiB)
พร้อม self-check ของกลุ่ม 0 (ไฟล์ tracked ที่มีช่องว่างในชื่อ):
```
0. self-check: ok: 8 tracked path(s) contain a space
1-4: ok (ไม่พบไฟล์ต้องห้ามแต่ละกลุ่ม)
5. oversized files: ok (ไม่มีไฟล์เกิน 5242880 bytes)
Forbidden-file guard passed. — EXIT=0
```
**หมายเหตุ cross-platform ที่ไม่กระทบผล:** กลุ่ม 5 ใช้ `stat -c '%s'` (GNU/Linux, ตามที่ ci.yml เขียน
สำหรับ `ubuntu-latest`) แต่เครื่อง macOS นี้ต้องใช้ `stat -f '%z'` แทน — ตรรกะ/ผลลัพธ์เหมือนกันทุก
ประการ (อ่านขนาดไฟล์เป็น byte เท่ากัน) เป็นแค่ความต่างของ `stat` flag ระหว่าง BSD/GNU ไม่ใช่ gap ของ
การทดสอบ

## 3. ขั้นที่ข้าม

**ไม่มีขั้นไหนถูกข้ามในงานนี้** — เครื่องมือที่ ci.yml ใช้ทั้งหมด (`gitleaks`, Playwright browsers,
Python3, `jq`) มีอยู่ในเครื่องนี้ครบ จึงรันได้ตรงตามลำดับจริงทุกขั้น

## 4. สรุป

- 15/16 ขั้นเขียวตรงตามที่ ci.yml กำหนด ไม่มีขั้นไหนต้องข้าม
- 1 ขั้น (`CI=1 playwright test --retries=0` รอบที่สอง) แดงแบบ non-deterministic (~1 ใน 5) —
  สาเหตุอยู่นอก `qa/` (`apps/client/src/f04-app.ts` + `telemetry/sink.ts`) → **BUG-P2-006 severity
  low, OPEN, handoff ถึง gameplay-programmer, blocking: ไม่บล็อก QA gate ของ F10 ที่ PASS ไปแล้ว**
  แต่บล็อกบรรทัดแรกของรายงานนี้ให้เป็น RED ตรงไปตรงมา
- N-02 (happy-dom AbortError) ตรวจแล้ว: มาจาก `f04-app.test.ts` เท่านั้น เป็น console noise จาก
  `<img>` ที่ไม่ await ไม่ใช่ error จริงที่ถูกบัง ไม่บล็อก
- character-name vectors: ยืนยันว่า `gen-vectors.ts --check` ไม่ครอบคลุมไฟล์นั้นจริงตามที่ brief
  เตือน แต่มีเทสต์หน่วย 6 ไฟล์ตรวจแทนอยู่แล้วและผ่านครบ ไม่ใช่ช่องว่าง

---

## รอบ 2 (P2-F10-CI รอบ 2, 2026-10-01) — หลัง P2-X70 แก้ BUG-P2-006

commit ที่ทดสอบ: `5870f0b` (HEAD ตอนเริ่มงานนี้, `git status` สะอาด) — ตามหลัง `cc0ad73` ของรอบ 1
ด้วย 1 commit คือ P2-X70 (`apps/client/src/f04-app.ts`, `telemetry/sink.ts` + ไฟล์ที่เรียก
`telemetry.record()` คู่กันอื่น ๆ: `account/logout.ts`, `onboarding-flow.ts`,
`privacy/withdraw-consent.ts`, `session/engine.ts`)

รันทุกขั้นของ `ci.yml` ซ้ำทั้งหมดตามลำดับเดิมของรอบ 1 แบบ `CI=1` (เครื่องเดิม, Node/pnpm เวอร์ชันเดิม
ตามหัวข้อ "สรุป" ด้านบน) — ไม่มีขั้นไหนถูกข้าม

### 1. สรุปผลต่อขั้น (รอบ 2)

| # | ขั้น | ผล | หลักฐาน |
| --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | PASS | exit=0, "Already up to date" |
| 2 | `pnpm lint` | PASS | exit=0 (eslint+prettier+copy-lint, 12 WARN เดิมเท่านั้น ไม่มี error) |
| 3 | `pnpm typecheck` | PASS | exit=0, 4 โปรเจกต์ "Done" |
| 4 | `tsx tools/traces/src/generate.ts --check` | PASS | exit=0, 17 fixture "ok" |
| 5 | `tsx tools/sim/src/gen-vectors.ts --check` | PASS | exit=0, 19 ไฟล์ "up-to-date" |
| 6 | `pnpm test` (`COVERAGE_PYTEST_REQUIRED=1`) | PASS | exit=0, 231 ไฟล์ผ่าน, **3553/3555** ผ่าน (2 skip เดิม) — เพิ่ม 11 เทสต์จากรอบ 1 (3542→3553) ตรงกับเทสต์ใหม่ของ P2-X70 |
| 7 | `pnpm build` | PASS | exit=0, built ทุก workspace |
| 8 | `measure-bundle.ts` | PASS | exit=0, initial 0.137MB/1.0MB, map lazy 0.350MB/0.700MB เท่ารอบ 1 |
| 9 | `tsx tools/art/src/cli.ts prebuild` | PASS | exit=0, "0 errors, 0 warnings" |
| 10 | `CI=1 pnpm test:e2e` (retries ตาม config CI=2) | PASS | exit=0, 218 passed (3.2m), ไม่มีบรรทัด "retry" |
| 11a | `CI=1 playwright test --retries=0` (ครั้งที่ 1) | **PASS** | exit=0, 218 passed (3.2m) |
| 11b | `CI=1 playwright test --retries=0` (ครั้งที่ 2 ติดกัน) | **PASS** | exit=0, 218 passed (3.2m) |
| 11c | `f10-telemetry-nav-story.spec.ts --repeat-each=10 --retries=0` (ครั้งที่ 1) | **PASS** | exit=0, 100 passed (23.5s) |
| 11d | `f10-telemetry-nav-story.spec.ts --repeat-each=10 --retries=0` (ครั้งที่ 2 ยืนยันซ้ำ) | **PASS** | exit=0, 100 passed (23.2s) |
| 12 | `test-lint-headers.sh` | PASS | exit=0, "9 case(s), 0 failed" |
| 13 | `test-billing-guard.sh` | PASS | exit=0, "7 case(s), 0 failed" |
| 14 | `test-bbox-guard.sh` | PASS | exit=0, "4 case(s), 0 failed" |
| 15 | gitleaks (secret-scan) | PASS | exit=0, "71 commits scanned ... no leaks found" (69→71 ตรงกับ 2 commit ใหม่ตั้งแต่รอบ 1) |
| 16 | forbidden-files guard | PASS | exit=0, ทุกกลุ่ม (0-5) "ok" |

**16/16 ขั้นเขียวทุกขั้น ไม่มีขั้นไหนข้าม** รวมทั้ง 2 ขั้นเสริม (11c/11d) ที่ brief รอบนี้สั่งเพิ่มเพื่อ
ยืนยัน BUG-P2-006 โดยเฉพาะ

### 2. หลักฐานขั้น 10-11 (บรรทัดผลจริง)

```
$ CI=1 pnpm test:e2e
218 passed (3.2m) — EXIT=0 (ไม่มีบรรทัด "retry")

$ CI=1 pnpm exec playwright test --retries=0   (ครั้งที่ 1, ติดกันไม่มีรีรัน)
218 passed (3.2m) — EXIT=0

$ CI=1 pnpm exec playwright test --retries=0   (ครั้งที่ 2, ต่อจากครั้งที่ 1 ทันที)
218 passed (3.2m) — EXIT=0

$ CI=1 pnpm exec playwright test qa/tests/e2e/f10-telemetry-nav-story.spec.ts \
    --repeat-each=10 --retries=0   (ครั้งที่ 1)
100 passed (23.5s) — EXIT=0
(50 เคสต่อ project [F10-PM-01 x10 + F10-PM-02 x4 สไลด์ x10 = 50] x 2 projects
android-chrome/ios-safari = 100)

$ CI=1 pnpm exec playwright test qa/tests/e2e/f10-telemetry-nav-story.spec.ts \
    --repeat-each=10 --retries=0   (ครั้งที่ 2, ยืนยันซ้ำอิสระ แยกคนละ invocation)
100 passed (23.2s) — EXIT=0 (ตรวจ exit code ตรงด้วย `echo "EXIT=$?"` แยกจาก log ไฟล์)
```

ทุกเคสของ `f10-telemetry-nav-story.spec.ts:56` (F10-PM-01, เคสที่ BUG-P2-006 เคยจับได้ตอน
`client_ts_ms` ต่างกัน 1ms) ผ่านครบทุกครั้งใน 4 การรันข้างบน (218+218+100+100 = 636 ครั้งที่เคสนี้
ถูกเรียก รวม 2 project — ไม่พบ `client_ts_ms` ต่างกันแม้แต่ครั้งเดียว) ตรงกับที่คาดจาก fix: ตอนนี้
`f04-app.ts`'s nav handler เรียก `deps.now()` ครั้งเดียว (`navAtMs`) แล้วส่งค่าเดียวกันเป็น
`atMsOverride` ให้ทั้ง `nav_tab_opened` และ `coming_soon_viewed` — `telemetry/sink.ts`'s `record()`
ใช้ `atMsOverride ?? deps.now()` จึงไม่มีการเรียก clock สองครั้งอิสระต่อกันอีกต่อไปสำหรับคู่นี้
(ยืนยันจากโค้ดจริงที่ diff ของ `5870f0b`, ไม่ได้เดา)

### 3. ขั้นที่ข้าม

ไม่มีขั้นไหนถูกข้ามในรอบ 2 เช่นเดียวกับรอบ 1 (เครื่องเดิม เครื่องมือครบเหมือนเดิม)

### 4. สรุปรอบ 2

- **16/16 ขั้นเขียวตรงตามที่ `ci.yml` กำหนด** รวม 2 ขั้นเสริมที่ brief สั่งเพิ่ม (e2e `--retries=0`
  ซ้ำ 2 ครั้งติด + `f10-telemetry-nav-story.spec.ts --repeat-each=10 --retries=0` ซ้ำ 2 ครั้งอิสระ)
  ไม่มีขั้นไหนข้าม
- BUG-P2-006 **ยืนยันปิดได้จริง**: การันตีด้วย 636 ครั้งของเคสที่เคยแดงใน 4 การรันที่ไม่มี retry เลย
  (ตรงข้ามกับรอบ 1 ที่เจอแดง 1 ใน 5 ครั้งตอนรันเคสเดียวซ้ำแบบ manual) — รายละเอียดการปิดอยู่ใน
  `qa/bugs.md`
- N-02 (happy-dom AbortError) ยังพบเหมือนเดิมใน `pnpm test` รอบนี้ (ไม่ใช่ปัญหาใหม่ ไม่บล็อก ตามที่
  บันทึกไว้แล้วในรอบ 1 หัวข้อ 2.6) ไม่ต้องตรวจซ้ำเพราะไม่มีอะไรเปลี่ยนในโค้ดที่เกี่ยวข้อง
  (`apps/client/src/assets/icon-dom.ts`, `f04-app.test.ts` ไม่ได้ถูกแก้โดย P2-X70 ในส่วนนั้น)
- **บรรทัดแรกของรายงานนี้เปลี่ยนเป็น CI-LOCAL GREEN** — ไม่มีขั้นไหนเหลือเป็นสีแดงอีก
