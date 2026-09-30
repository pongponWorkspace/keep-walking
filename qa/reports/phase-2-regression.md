# Phase 2 Regression — Interim (P2-CLOSE-QA, run 2)

เจ้าของ: qa-tester · วันที่รัน: 2026-09-30 · เครื่อง: macOS arm64, Node v24.19.0, pnpm 11.24.0,
Python 3.14.6, Playwright 1.63.0 (chromium 1243, webkit 2359), gitleaks 8.30.1 (ตรงกับ pin
`GITLEAKS_VERSION` ใน `.github/workflows/ci.yml`) · HEAD `714cd82` (P2-W22, ก่อนหน้านี้)

**นี่คือ regression ชั่วคราว (interim, run 2)** ตาม task brief: จุดนี้เหลือเฉพาะงาน HUMAN และงานที่
รอผลเดินสนาม (field walk) เท่านั้น ไม่มีงาน agent ค้างอยู่ที่ทำต่อได้โดยไม่มีข้อมูลจากคนหรือสนาม —
**regression รอบสุดท้ายจะรันซ้ำอีกครั้งหลังเดินสนาม + playtest** (P2-CLOSE-QA ตัวจริงตามบอร์ด)

อ้างอิง: `studio/phases/phase-2/board.md` หัวข้อ 5 (Phase Exit Checklist), หัวข้อ 2 (ตารางงานเต็ม),
หัวข้อ 4 (`#### P2-CLOSE-QA`) · ทุก gate report ที่ระบุใน task brief · `qa/bugs.md` ·
`data/gps-traces/` · `qa/reports/phase-1-regression.md` (รูปแบบ)

## 0. สรุปบนสุด

**agent side: complete, waiting for human.** ทุกคำสั่งที่ agent รันได้ในรอบนี้ (lint รวม
lint:copy/lint:config, typecheck, `pnpm test` เต็ม 217 ไฟล์/3113 test, `pnpm build`, bundle budget,
`test:e2e` ทั้งสอง project 106/106, trace `--check` ทั้ง synthetic/qa, golden vector `--check`,
`tools/tiles` test 71 เคส, gitleaks full history, forbidden-file guard, billing-guard/lint-headers/
map-bbox-guard) **เขียวทั้งหมด** ไม่มี bug OPEN เหลือใน `qa/bugs.md` (ไม่เคยมี severity ≥ high ที่ยัง
OPEN) ทุกแถวในตารางงานที่ agent เป็นเจ้าของเป็น **DONE หรือ CUT** ทุก gate ที่ acceptance ของ
P2-CLOSE-QA ระบุเป็น **PASS** ในรอบล่าสุด (รวมรอบ 2 ของ gate ที่เคย NEEDS_CHANGES)

**สิ่งที่เหลือทั้งหมดเป็นงาน HUMAN หรืองานที่ deps ตรงบนงาน HUMAN โดยตรง (รอผลเดินสนาม)** — ไม่มี
งานไหนเป็นความผิดของ agent หรือบั๊กของโค้ด รายชื่อเต็ม (ตรงกับที่ context ของ task brief ระบุไว้ล่วงหน้า):

| ID | งาน | สถานะ | บล็อกอะไร |
| --- | --- | --- | --- |
| P2-C01 | ยืนยัน preview บนมือถือจริง | HUMAN | ต้นทางของ chain ทั้งหมดด้านล่าง |
| P2-C02 | เดินทดสอบเชิงเทคนิค 30+30 นาที | HUMAN | E4 (ฝั่งเครื่องจริง), C03, C04 |
| P2-C03 | สรุปผล spike + Go/No-go (tech-lead) | TODO — รอ C02 | C06, F05-T12 |
| P2-C04 | recorded trace จากการเดินจริง (location-engineer) | TODO — รอ C02 + ความยินยอม | C06, F05-T12 |
| P2-C05 | ยืนยัน Go/No-go ของ map spike | HUMAN | C08, P1-E16 |
| P2-C06 | regression ปิด Phase 1 รอบ 2 (qa-tester) | TODO — รอ C03, C04 | C07, C08 |
| P2-C07 | CI เขียว + Billing (HUMAN) | HUMAN | C08, P1-E5/E20 |
| P2-C08 | ปิด Phase 1 (producer) | TODO — รอ C05, C06, C07 | P1-CLOSE |
| P2-F04-T11 | deploy probe + ทดสอบบนสองเครื่อง | HUMAN | F06-T12 |
| P2-F05-T12 | speed lock ค่าจาก trace จริง (systems-designer) | TODO — รอ C03, C04 | F05-T13 |
| P2-F05-T13 | speed filter ใน geo (location-engineer) | TODO — รอ T12 | F05-T19 |
| P2-F05-T19 | tech review ตัวกรองความเร็ว | TODO — รอ T13 | CLOSE-QA (ตัวจริง) |
| P2-F06-T12 | support matrix F-17 จาก probe + เดินทดสอบ | TODO — รอ F04-T11, C02 | CLOSE-QA (ตัวจริง) |
| P2-F06-T26 | deploy build playtest + smoke | HUMAN | F06-T27 |
| P2-F06-T27 | playtest เดินจริงอย่างน้อย 3 คน | HUMAN | E9, F06-T28 |
| P2-F06-T28 | playtest report (product-manager) | TODO — รอ T27 | E10, T29 |
| P2-F06-T29 | ยอมรับข้อสรุป playtest | HUMAN | E10, CLOSE-PM |
| P2-CLOSE-QA (ตัวจริง) | regression ปิด Phase 2 รอบสุดท้าย | TODO — รอ F05-T19, F06-T12/T28 | CLOSE-PM |
| P2-CLOSE-PM | รายงานปิด Phase 2 | TODO — รอ CLOSE-QA, T29, C08 | ปิด Phase 2 |

ทุกแถวข้างต้นตรงกับ `context` ของ task brief เป๊ะ (ไม่มีแถวเกินหรือขาด) — ยืนยันด้วยการสแกนตาราง
เต็มของ board (`P2-C01`..`P2-X54`, ทุกแถว) ด้วยตัวเองอิสระในหัวข้อ 6 ด้านล่าง

รายละเอียดทั้งหมดอยู่ในหัวข้อถัดไป

## 1. รันชุดคำสั่งเต็มจาก root (agent-checkable ทั้งหมด, รันจริงรอบนี้)

```
$ pnpm install --frozen-lockfile
Scope: all 15 workspace projects
Already up to date

$ pnpm run typecheck             # exit 0
$ tsc -p tsconfig.json --noEmit && pnpm -r --if-present run typecheck
Scope: 14 of 15 workspace projects
packages/geo typecheck: Done
packages/shared typecheck: Done
tools/copy-lint typecheck: Done
apps/client typecheck: Done
EXIT:0

$ pnpm run lint                  # exit 0
$ eslint . --max-warnings=0 && prettier --check . && pnpm run lint:copy
Checking formatting...
All matched files use Prettier code style!
$ tsx tools/copy-lint/src/cli.ts
(20 WARN: unused template variables bossName/itemName/monsterName/... และ area "credits"/
"inventory" ที่ยังไม่อยู่ใน copy-rules.json#areas · field cells ผิด 1 ที่ dungeon.checkinNoHp —
ทุกอันเป็น WARN ไม่ใช่ FAIL, มีมาก่อนรอบนี้ตามที่ระบุใน gate reports ก่อนหน้า)
EXIT:0

$ pnpm exec tsx tools/config-lint/src/cli.ts    # exit 0
config-lint: 20 files, 0 errors, 2 warnings (null-undeclared: bossGearMaterial.bossCorePerAttempt,
bossDamage.bossAtkPerTick — ค่าที่ยังไม่ตั้งของ raid, out of scope Phase 2), 0 allowed, 0 stale
EXIT:0

$ pnpm exec tsx tools/sim/src/gen-vectors.ts --check    # exit 0
up-to-date × 19 ไฟล์ (buff-stacking 44, class-change 6, exp-curve 34, gear 48, damage 70,
drops 23, economy 38, party 17, raid 15, movement-gate 20, reward-window 14, partial-tick 20,
run-state 44, check-in 14, speed-lock 11, opening-hours 31, tick-reward 32, run-loop 32,
hp-recovery 16)
EXIT:0

$ pnpm exec tsx tools/traces/src/generate.ts --check    # exit 0
ok × 17 (16 synthetic trace + 1 polygon fixture)
EXIT:0

$ pnpm exec tsx qa/tests/traces/build.ts --check    # exit 0 (qa-tester's own trace check, mirrors
                                                     # the generator's --check contract, same
                                                     # validateTrace gate, P2-F04-T19)
ok × 7 (6 qa trace เข้า catalog + 1 polygon overlap-b — อีก 8 ไฟล์ใน data/gps-traces/qa/ เป็นไฟล์
qa-gate-*/qa-gps-jump-01/qa-gps-gap-2min/qa-home-states-walk-01 ที่เขียนด้วยมือนอก catalog นี้
ยังผ่าน validateTrace ผ่านการเรียกใน qa/tests/traces/*.test.ts เอง — ดูหัวข้อ 3.1)
EXIT:0

$ pnpm test                      # exit 0
 Test Files  217 passed (217)
      Tests  3113 passed | 2 skipped (3115)
   Duration  11.14s
EXIT:0
(2 skip เป็น it.skip ที่ตั้งใจของ TC-HUD-04/TC-HUD-06 เดิมมาตั้งแต่ Phase 1 — ไม่ใช่ regression ของ
รอบนี้ ยืนยันด้วย `grep -rn "it.skip" apps packages qa tools` ตรงกับ qa/plans/F06-test-plan.md
หัวข้อ "2 skipped" เป๊ะ) · DOMException [AbortError] ที่ปรากฏใน stderr ระหว่างรันเป็น noise จาก
happy-dom teardown ของ Fetch/AsyncTaskManager ตอนปิด window ของแต่ละ test file ไม่ใช่ assertion
ที่พัง (ไม่กระทบ "Test Files 217 passed (217)")

$ pnpm run build                 # exit 0
apps/client build: ✓ 246 modules transformed, built in 344ms
(คำเตือน "chunks larger than 500 kB" เป็นของ maplibre-gl เอง ไม่กระทบ EXIT:0 — งบจริงตรวจแยกด้านล่าง)

$ pnpm exec tsx apps/client/scripts/measure-bundle.ts    # exit 0 (ADR 0003 หัวข้อ 10, P2-F04-T10)
initial JS (entry + static imports): 0.119 MB / งบ 1.000 MB
map lazy JS (maplibre-gl + worker): 0.350 MB / งบ 0.700 MB
EXIT:0

$ pnpm run test:e2e               # exit 0 (playwright, ทั้ง qa/tests/e2e/**/*.spec.ts และ
                                   # apps/*/e2e/**/*.spec.ts ตาม testMatch ของ playwright.config.ts)
Running 106 tests using 2 projects (android-chrome × ios-safari)
106 passed (2.0m)
EXIT:0

$ bash tools/tiles/test/run.sh    # exit 0
71 passed, 0 failed, 0 skipped
EXIT:0
```

## 2. gitleaks (full history) + forbidden-file guard + infra guard scripts (D-002, D-085, PDPA)

```
$ gitleaks detect --source . --log-opts="--all" --config .gitleaks.toml --redact --verbose --exit-code 1
44 commits scanned.
scanned ~24.74 MB in 4.12s
no leaks found
EXIT:0
```

gitleaks 8.30.1 ตรงกับ `GITLEAKS_VERSION` ที่ pin ไว้ใน `.github/workflows/ci.yml` เป๊ะ — ผลนี้เทียบเท่า
สิ่งที่ CI job `secret-scan` จะได้จริง (job นี้ยังไม่เคยรันบน GitHub จริงจนกว่า P2-C07 จะ push — แต่
input/config/binary เดียวกันทุกอย่าง)

Forbidden-file guard (คัดลอกตรรกะจาก job `forbidden-files` ทีละ step, รันจริงบน `git ls-files`):

| ตรวจ | ผล |
| --- | --- |
| self-check: tracked path มีช่องว่างอยู่จริง | ok — 8 path (เช่น `tools/tiles/fixtures/lumpini/glyphs/Noto Sans Medium/0-255.pbf`) |
| 1. raw playtest results (`qa/playtest/results/raw/`) tracked | ok — ไม่มี (ยังไม่มีการเดินสนามจริง `qa/playtest/results/` ยังไม่มีไฟล์ใน git เลย) |
| 2. `.env*` ที่ไม่ใช่ `.example` tracked | ok — ไม่มี, `.env.example` มีแต่ชื่อตัวแปร (`VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL`, `TILES_PUBLIC_BASE_URL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) ไม่มีค่าจริงสักตัว |
| 3. `.pmtiles` นอก `tools/tiles/fixtures/` | ok — ไม่มี |
| 4. `.osm.pbf` ดิบ tracked | ok — ไม่มี |
| 5. ไฟล์ที่ commit ใหญ่กว่า 5 MiB (`MAX_TRACKED_FILE_BYTES`) | ok — ไม่มี |

Infra guard scripts (ตัวจริงที่ CI job `lint-headers`/`billing-guard`/`map-bbox-guard` เรียก, รันตรง
จาก root):

```
$ bash infra/scripts/test/test-billing-guard.sh   → 7 case(s), 0 failed  → PASS
$ bash infra/scripts/test/test-lint-headers.sh    → 9 case(s), 0 failed  → PASS
$ bash infra/scripts/test/test-bbox-guard.sh      → 4 case(s), 0 failed  → PASS
```

ไม่มี config ที่ผูกบริการคิดเงิน (D-085): `billing-guard.sh` สแกน workflow/script/config จริงของ repo
เอง (ไม่ใช่แค่ fixture สังเคราะห์) และ PASS · `.env.example` ไม่มีชื่อ env ผูก R2 หรือบริการ paid ใด ๆ

**E13 privacy check เพิ่มเติม (ไม่มีพิกัดหรือข้อมูลระบุตัวคนใน git, storage หลัง run ไม่มีพิกัด):**
- `qa/playtest/results/` ยังไม่มีไฟล์ใน git เลย (field walk ยังไม่เกิดขึ้นจริง) — เงื่อนไข "ไม่มีไฟล์
  มีพิกัด" เป็นจริงโดยปริยาย ต้องตรวจซ้ำอีกครั้งหลัง P2-C02/T26/T27 เสร็จ ก่อน push รอบสุดท้าย (P2-C07)
- `.gitignore` ครอบ `qa/playtest/results/raw/`, `data/gps-traces/raw/` — ยืนยันด้วย `git check-ignore -v`
  ทั้งสองเส้นทาง (ok)
- `data/gps-traces/{synthetic,qa}/*.trace.json` ทุกไฟล์เป็น `meta.platform = synthetic` (ตรวจผ่าน
  `TC-PRIVACY-02` ใน `qa/tests/F02/privacy-copy.test.ts`, ส่วนหนึ่งของ `pnpm test` ที่เขียวทั้ง 3113
  test — ตรวจ bbox กรุงเทพฯ+5 จังหวัดและไม่มีชื่อคน/บ้านเลขที่ใน `meta.description` ทุกไฟล์)
- storage ในเครื่องไม่มีพิกัดหลังจบ run: `packages/shared/src/session/persistence.test.ts`,
  `qa/tests/F04/session-persist-privacy.test.ts` (walk-every-leaf-value scanner หา lat/lng/
  latitude/longitude/accuracy) + `qa/tests/F05/run-summary-and-storage-privacy.test.ts` — ผ่านใน
  `pnpm test` · ปุ่มลบข้อมูลในเครื่องทำงานจริง: `qa/tests/F06/clear-local-data-integration.test.ts`
  + e2e `withdraw-consent.spec.ts` (106/106 e2e เขียว รวมไฟล์นี้)
- telemetry/export ไม่มีพิกัด (C2-3): `qa/tests/F04/contract-telemetry.test.ts`,
  `apps/client/src/telemetry/known-events.test.ts`, e2e `telemetry-export.spec.ts`,
  `f06-telemetry-export-gps-status.spec.ts` — ผ่านทั้งหมด
- consent ตำแหน่งแยกจาก consent อื่น: e2e `onboarding.spec.ts` ("declining consent never starts
  GPS but still reaches class select") ผ่าน

## 3. ไม่มีข้อความไทย hardcode ในโค้ด (กฎ copy ข้อ "no hardcoded Thai strings")

`qa/tests/F02/privacy-copy.test.ts` describe `TC-COPY-01` เดินทุกไฟล์ `.ts` ใน `apps/client/src`
(ยกเว้น `node_modules`/`dist`/`.certs`), ตัด comment ออกก่อน แล้วหา string literal ที่มีอักษรไทย
นอกไฟล์ยกเว้น 2 ไฟล์ (`copy/gps-state.test.ts`, `copy/load.test.ts` — เทสต์ของ copy pipeline เอง) —
เป็น automated regression ที่ครอบคลุมกว่าการ grep มือ (ตัด comment/ไฟล์ test ที่ยกเว้นแบบเดียวกับที่
`qa/reports/phase-1-regression.md` หัวข้อ 4 เคยทำด้วยมือ) รันเป็นส่วนหนึ่งของ `pnpm test` ที่เขียว
ทั้ง 3113 test ในหัวข้อ 1 — **ไม่มีไฟล์ใดแดง** (BUG-P2-005 ที่เคยพบ 3 ไฟล์ทดสอบ dev มี Thai literal
ปิดไปแล้วตั้งแต่ P2-F05-T16, ยืนยันซ้ำอิสระในรอบนี้ว่ายังปิดอยู่จริงเพราะ test ยังเขียว)

Sanity check เพิ่มเติม: `grep -rlP "[ก-๙]" apps/client/src packages/*/src` ยังพบไฟล์จำนวนมาก (โค้ด
ของ F04-F06 โตขึ้นมากจาก Phase 1) — สุ่มตรวจ 15 ไฟล์อิสระ ทุกจุดเป็นคอมเมนต์อ้างอิง spec/tech note
ตรงตัว, string literal ใน `*.test.ts`, หรือ config/content generated file (`balance-subset.generated.json`,
`config/telemetry.ts`ที่ export ชื่อ event ไม่ใช่ copy) — ไม่มีจุดใดเป็น hardcoded UI copy ที่ผู้เล่น
เห็นจริง สอดคล้องกับผลของ `TC-COPY-01` ข้างต้นซึ่งครอบคลุม 100% ของไฟล์ ไม่ใช่แค่สุ่ม

**หมายเหตุพบระหว่างงานนี้ (ไม่ blocking, เอกสารเก่าไม่ทัน):** `data/gps-traces/qa/` มี 14 ไฟล์
`*.trace.json` แต่ตาราง `data/gps-traces/README.md` หัวข้อ 6.1 ("trace ใน `qa/`") มีแถวเดียว
(`qa-home-states-walk-01`, ปิดโดย P2-H37) — ไฟล์อีก 8 ไฟล์ (`qa-gate-bench-jitter-01`,
`qa-gate-boundary-01`, `qa-gate-normalwalk-gap-01`, `qa-gate-speedlock-01`, `qa-gate-still-01`,
`qa-gps-gap-2min`, `qa-gps-jump-01`, `qa-e2e-khlong-ong-ang-closed-01`) ไม่มี metadata ในตารางนั้น
(อีก 4 ไฟล์ `qa-checkin-accuracy-35-01`/`qa-movement-gap-400m-01`/`qa-polygon-overlap-01`/
`qa-e2e-leelawadee-*` อยู่ใน catalog ของ `qa/tests/traces/build.ts --check` และ/หรือถูกอธิบาย inline
ในหัวข้อ 7 ของ README แล้ว) — ทุกไฟล์ผ่าน `validateTrace` จริง (เรียกใน `qa/tests/traces/*.test.ts`
ของตัวเอง ซึ่งเขียวใน `pnpm test`) และใช้งานจริงในเทสต์ที่ผ่านทั้งหมด จึงไม่ใช่ปัญหาความถูกต้อง —
เป็นช่องว่างเอกสารล้วน ๆ ตามที่ระบุไว้แล้วในโน้ตเดิมของแถว `P2-CLOSE-QA` บนบอร์ด (จาก H37) — ส่ง
handoff ให้ location-engineer เพิ่มแถวเหล่านี้ในหัวข้อ 6.1 (ดูหัวข้อ 9)

## 4. ทุก task ในตารางเป็น DONE/CUT (ยกเว้น HUMAN และงานที่ deps ตรงบนงาน HUMAN)

สแกนตารางเต็มของ `studio/phases/phase-2/board.md` หัวข้อ 2 ทุกแถว (`P2-C01` ถึง `P2-X54`, รวม
กลุ่ม C/RISK/F04/F05/F06/CLOSE/H/X ทั้งหมด) ด้วยคำสั่งเดียว
(`awk` ดึงคอลัมน์ ID + Status ของทุกแถวที่ขึ้นต้น `| P2-`) — ผลตรง 100% กับตารางในหัวข้อ 0:

- **HUMAN (8 แถว):** C01, C02, C05, C07, F04-T11, F06-T26, F06-T27, F06-T29
- **TODO ที่ deps ตรงบนงาน HUMAN โดยตรง (10 แถว, รอผลสนาม):** C03, C04, C06, C08, F05-T12,
  F05-T13, F05-T19, F06-T12, F06-T28, P2-CLOSE-PM
- **TODO ของงานนี้เอง (1 แถว):** P2-CLOSE-QA (interim) — กำลังทำอยู่
- **CUT (5 แถว, ทุกแถวมีเหตุผลรวมเข้างานอื่นหรือ decision ชัดเจน):** F04-T07 (รวมใน F04-T16, GD B-09),
  F06-T15 (รวมใน F04-T10), X08 (รวมใน X11), H03 (รวมใน F05-T10 + F06-T10, plan-sync W7 O-01/O-02),
  H14 (รวมใน X29 + F06-T14, plan-sync W7 O-03)
- **ทุกแถวที่เหลือทั้งหมด (รวม P2-C09, RISK-01/02, F04-T01..T27 ที่เหลือ, F05-T01..T20 ที่เหลือ,
  F06-T01..T30 ที่เหลือ, H01..H60 ที่มีอยู่จริง, X01..X54 ที่มีอยู่จริง): DONE**

ไม่มี task ใดที่ agent เป็นเจ้าของค้างอยู่โดยไม่มีเหตุผล — ตรงตาม (O-07) ที่บันทึกไว้ในโน้ตของแถว
P2-CLOSE-QA เองว่า "ก่อน dispatch ตรวจว่าทุกแถวยกเว้น P2-C07, P2-C08, P2-F06-T29, P2-CLOSE-PM เป็น
DONE/CUT" — ผลตรวจอิสระรอบนี้: มีอีก 6 แถวที่ไม่ใช่ DONE/CUT นอกเหนือจาก 4 แถวนั้น (C01, C02, C05,
F04-T11, F06-T26, F06-T27) แต่ทั้งหมดเป็น **HUMAN** ที่ระบุชื่อไว้แล้วในบอร์ดเอง ไม่ใช่ความผิดพลาด —
สอดคล้องกับ context ของ task brief นี้เป๊ะ

## 5. ทุก gate ที่ acceptance ของ P2-CLOSE-QA ระบุ — verdict รอบล่าสุดทั้งหมดเป็น PASS

| Gate | ไฟล์ | Verdict รอบล่าสุด |
| --- | --- | --- |
| Tech gate F04+F05 | `docs/reviews/F04-F05-tech-gate.md` | **PASS** (F04 มีเงื่อนไขหลังผ่าน P2-H30 พลิก `it.fails` — ปิดแล้ว, ดูหัวข้อ 7) |
| QA gate F04+F05 | `qa/reports/F04-F05-qa-gate.md` | **PASS** |
| Copy gate F04+F05 | `design/reviews/F04-F05-copy-gate.md` | **PASS** (รอบ 2 — F04 NEEDS_CHANGES รอบ 1 แก้ครบ C-01..C-12) |
| Design gate F04+F05 | `design/reviews/F04-F05-design-gate.md` | **PASS** ทั้ง F04 และ F05 |
| Flow approval F04 | `design/reviews/F04-flow-approval.md` | **PASS** (รอบ 2 — รอบ 1 NEEDS_CHANGES 8 ข้อ blocking แก้ครบ) |
| Flow approval F05+F06 | `design/reviews/F05-F06-flow-approval.md` | **PASS** |
| Tech gate F06 | `docs/reviews/F06-tech-gate.md` | **PASS** |
| Copy gate F06 | `design/reviews/F06-copy-gate.md` | **PASS** (รอบ 2 — รอบ 1 NEEDS_CHANGES 5 blocker แก้ครบ) |
| QA gate F06 | `qa/reports/F06-qa-gate.md` | **PASS** |
| Design gate F06 | `design/reviews/F06-design-gate.md` | **PASS** (รอบ 2) |
| Visual gate F04-F06 | `art/reviews/F04-F06-visual-gate.md` | **PASS** (รอบ 3 — รอบ 1/2 NEEDS_CHANGES ส่ง HUMAN ตามโปรโตคอลข้อ 6 แล้วกลับมา PASS) |
| Product gate F04-F06 | `product/reviews/F04-F06-product-gate.md` | **PASS** |

**ไม่มี gate ใดที่ acceptance ของ P2-CLOSE-QA เรียกร้อง (F04-T27, F06-T30 → flow ด้านบน · F05-T15..T18
· F06-T20..T25) ค้างที่ NEEDS_CHANGES ในรอบล่าสุด** — เงื่อนไขหลังผ่านเดียวที่เคยมี (P2-H30 พลิก
`it.fails`) ปิดแล้วจริง (BUG-P2-002 CLOSED, ยืนยันซ้ำใน `qa/tests/F04/session-checkin-lifecycle.test.ts`
เขียวในรอบ `pnpm test` ของงานนี้ด้วย — ไม่ใช่ `it.fails` ที่ผ่านเพราะพัง)

**ยังไม่มีและยังรันไม่ได้ในรอบนี้ (รอ chain ของ field walk):** tech review ตัวกรองความเร็ว
(`docs/reviews/F05-speed-filter-tech-gate.md`, task P2-F05-T19) — ยังไม่มีไฟล์ เพราะ P2-F05-T12/T13
ยังเป็น TODO รอ P2-C03/C04 (trace เดินจริง) ตามที่ระบุในหัวข้อ 0/4 — **ไม่ใช่ gate ที่ NEEDS_CHANGES
ไม่ใช่ gate ที่พัง แค่ยังไม่เกิดขึ้น** เพราะ input ของมันยังไม่มี

## 6. Phase Exit Checklist — สถานะจริงพร้อมหลักฐาน (E1–E17, P1-E5/E7/E10/E16/E17/E18–E20/P1-CLOSE)

### F04 / F05 / F06

| # | เกณฑ์ | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| E1 | GPS trace ครบทุก transition รวมเดินเลียบขอบและ GPS drift | **MET** | `qa/reports/F04-F05-qa-gate.md` §2 E1 · `synthetic-edge-walk-01`/`synthetic-drift-spike-01` ผ่าน `run-state.json` `edgeHysteresis` (8 vector) + `qa/tests/traces/engine-run-state.test.ts` — เขียวใน `pnpm test` รอบนี้ |
| E2 | dungeon ที่ปิดเข้าไม่ได้ | **MET** | `qa/tests/e2e/f04-closed-dungeon.spec.ts` 2 เคส เขียว android-chrome+ios-safari (ยืนยันซ้ำใน e2e รอบนี้ 106/106) |
| E3 | trace "มือถือวางนิ่ง" ได้ 0 tick | **MET** | `qa/tests/traces/engine-movement-gate.test.ts` describe E3 — `synthetic-table-still-01` ทุกหน้าต่าง `pass:false` |
| E4 | trace "นั่งม้านั่งมี jitter" ยังได้ tick | **MET (ฝั่งโค้ด) / WAITING-HUMAN (ฝั่งเครื่องจริง)** | โค้ด: describe E4 — `synthetic-bench-jitter-01` ทุกหน้าต่าง `pass:true` — เขียว · เครื่องจริง: P2-C03 (TL N-11) ยังไม่เกิด รอ P2-C02 |
| E5 | ผลตรง golden test vectors | **MET** | `packages/shared/src/formulas/vectors.test.ts` ค้นไฟล์ `design/systems/test-vectors/*.json` แบบ dynamic (19 ไฟล์) + `gen-vectors --check` exit 0 — ทั้งคู่รันจริงในหัวข้อ 1 |
| E6 | เลเวลตรงโซนไม่ใช้ยาอยู่ได้ราว 45 นาทีตาม simulator | **MET** | `qa/reports/F06-qa-gate.md` §2 E6 — survival ≈ 44.4 นาที (D-020 ACCEPTED), `hp/survival.test.ts` + `qa/tests/F06/survival-zone-level-no-potions.test.ts` เขียว |
| E7 | copy สามจังหวะ (HP ต่ำ/auto-retreat/ตาย) ผ่าน content gate | **MET** | `design/reviews/F06-copy-gate.md` รอบ 2 PASS (หัวข้อ 9, บรรทัด 162) |
| E8 | ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก | **MET** | `design/reviews/F06-design-gate.md` รอบ 2 PASS + `qa/reports/F06-qa-gate.md` §2 E8 + `product/reviews/F04-F06-product-gate.md` PASS |
| E9 | playtest เดินจริงอย่างน้อย 3 คน กรอกแบบสอบถาม | **WAITING-HUMAN** | P2-F06-T27 ยังเป็น HUMAN, `product/playtest/results/` ยังไม่มีไฟล์ — สคริปต์/ฟอร์มพร้อมแล้ว (`qa/playtest/phase-2-kit.md`, `phase-2-observer-form.md`, `phase-2-parental-consent.md`, `safety-briefing.md`) |

### ปิด Phase 2

| # | เกณฑ์ | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| E10 | playtest report สรุปว่าสนุกพอไปต่อหรือระบุสิ่งที่ต้องแก้ | **WAITING-HUMAN** | รอ P2-F06-T27 → T28 → T29 ทั้งสาย ยังไม่มี `product/playtest/phase-2-playtest-report.md` |
| E11 | MockLocationProvider ใช้ได้เต็ม: เล่นทั้ง loop F04–F06 ด้วย trace เลือกได้/เร่งได้ | **MET** | QA gate F04+F05 §2 E11 + QA gate F06 §2 E11 ทั้งคู่ PASS · `?trace=<id>&speed=1\|10\|60&loop=0\|1` ใช้จริงตลอด e2e ทุกไฟล์ (106/106 เขียวรอบนี้) |
| E12 | ทุก task DONE/CUT และทุก gate PASS | **MET (ฝั่ง agent) / WAITING-HUMAN (บางแถว)** | หัวข้อ 4 (task table) + หัวข้อ 5 (gate table) ของรายงานนี้ — รายชื่อ HUMAN/field-dependent ครบใน หัวข้อ 0 |
| E13 | ไม่มี secret/พิกัด/ข้อมูลระบุตัวคนใน git, ไม่มีบริการคิดเงิน, consent แยก, storage/telemetry ไม่มีพิกัดหลัง run, ปุ่มลบข้อมูลทำงาน | **MET** | หัวข้อ 2 ของรายงานนี้ (ครบทุกจุดย่อย) |
| E14 | logic presence/gate/tick/drop/damage อยู่ใน `packages/shared`/`packages/geo` แบบ pure, client เรียก `session` เท่านั้น, ไม่มีค่า/ชื่อฝังโค้ด | **MET** | `docs/reviews/F04-F05-tech-gate.md` PASS, `docs/reviews/F06-tech-gate.md` PASS (ทั้งคู่ตรวจ conform ADR 0003, geo เป็น leaf, config-not-hardcode) |
| E15 | CI มี gate ครบ 7 อย่างตามที่ระบุ | **MET** | `.github/workflows/ci.yml` มีครบ 7 job (`build-test`, `e2e`, `secret-scan`, `forbidden-files`, `lint-headers`, `billing-guard`, `map-bbox-guard`) — รันซ้ำ **local ทุกก้อนตรงกับที่ job เรียก** ในหัวข้อ 1–2 (เขียวหมด) ยังไม่เคยรันบน GitHub จริงจนกว่า P2-C07 จะ push |
| E16 | speed lock ล็อกการเล่นจริง, check-in ปฏิเสธ teleport/accuracy แย่, ระยะคร่อมช่องว่างไม่ได้รางวัล, รางวัลแรกของ onboarding เป็น tick ปกติ, ยามาจาก drop ที่ผ่าน gate | **MET** | `qa/tests/F04/`, `F05/`, `F06/` (ทุกไฟล์เขียว) + design gate F04+F05 PASS + design gate F06 PASS — รายละเอียดต่อจุดอยู่ใน gate reports ที่อ้างในหัวข้อ 5 |
| E17 | GR-1 ของพระนคร+ปทุมวัน+บางรัก ผ่าน guardrail G4/S3 หรือมี decision | **MET** | `product/metrics.md` §9.1/§9.2 (P2-F04-T18) — PASS ทั้ง 3 ย่าน 2 รอบ (ก่อน/หลัง P2-H11 rerun coverage) |

### ยกมาจาก Phase 1 (D-086, ต้องปิดก่อน P2-CLOSE-PM)

| # | เกณฑ์ | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| P1-E5 | test ผ่านใน CI (run บน GitHub ของ push สุดท้าย) | **MET (local) / WAITING-HUMAN (GitHub run จริง)** | local: หัวข้อ 1–2 เขียวทั้งหมด เทียบเท่าทุก step ของ `ci.yml` · run จริงบน GitHub รอ P2-C07 |
| P1-E7 | build deploy ได้บน preview และเปิดบนมือถือจริง | **MET (local build) / WAITING-HUMAN (preview จริงบนมือถือ)** | `pnpm build` exit 0 · P2-C01 ยังเป็น HUMAN |
| P1-E10 | เดินทดสอบ 30+30 นาที กรอกผลวัด | **WAITING-HUMAN** | P2-C02 ยังเป็น HUMAN, `qa/playtest/results/` ยังไม่มีไฟล์ |
| P1-E16 | ผล Go/No-go ของ F02 | **WAITING-HUMAN** | P2-C05 ยังเป็น HUMAN รอ P2-C03 |
| P1-E17 | ถ้า No-go มีข้อเสนอปรับ design | **WAITING-HUMAN (ยังไม่ทราบผล)** | ขึ้นกับ P1-E16 ก่อน |
| P1-E18, E19, E20 | ทุก task Phase 1 DONE/CUT, พิกัดคนเดินไม่อยู่ใน git, ไม่มี secret/บริการคิดเงิน | **MET (agent side) / WAITING-HUMAN (P2-C06 ยังไม่รัน)** | `qa/reports/phase-1-regression.md` รอบ 1 PASS (agent side) แล้ว · P2-C06 (regression รอบ 2) ยังรอ P2-C03/C04 · gitleaks/guard ของรอบนี้ (หัวข้อ 2) ยังเขียวเหมือนเดิม ไม่มีอะไรเปลี่ยนแย่ลง |
| P1-CLOSE | Phase 1 board/report เป็น COMPLETE | **WAITING-HUMAN** | P2-C08 ยังรอ C05/C06/C07 |

## 7. qa/bugs.md — สถานะบั๊ก

ตรวจทั้งไฟล์ (335 บรรทัด) หา `status: OPEN`/`status: **OPEN**` — **ไม่พบสักรายการ** บันทึก
"สถานะรวม" ล่าสุด (P2-F06-T21, 2026-09-28, QA gate F06): *"ไม่มี bug OPEN เหลืออยู่ในไฟล์นี้เลย
(ทั้งของ F01–F06)"* — ยืนยันซ้ำอิสระในรอบนี้ว่ายังเป็นจริง (ไม่มีงานไหนหลัง T21 เปิดบั๊กใหม่ จนถึง
คอมมิตล่าสุด `714cd82`)

| Bug | Severity | สถานะ | หลักฐานปิด (สรุป) |
| --- | --- | --- | --- |
| BUG-P1-H06 | high | CLOSED | บันทึกย้อนหลัง P2-F04-T09, ปิดแล้วตั้งแต่ P1-F03-T22 |
| BUG-P2-001 | medium | CLOSED | P2-F04-T09 |
| BUG-P2-002 | **high** | CLOSED | P2-H30 พลิก `it.fails`→`it` แล้วจริง — ยืนยันซ้ำในรอบนี้: `qa/tests/F04/session-checkin-lifecycle.test.ts` เขียวปกติ (ไม่ใช่ fail-that-passes) ภายใน `pnpm test` เต็ม |
| BUG-P2-003 | medium | CLOSED | P2-F06-T08 + P2-H31 ยืนยันซ้ำ (e2e 5/5) |
| BUG-P2-005 | medium | CLOSED | P2-F05-T16 — `TC-COPY-01` เขียว 233/233 ตอนนั้น, รอบนี้เขียวทุกไฟล์ (หัวข้อ 3) |

**ไม่มี bug OPEN เหลืออยู่ · ไม่มี bug severity ≥ high ที่ OPEN** → เงื่อนไข "qa/bugs.md ไม่มี bug
blocking ที่เปิดค้าง" ผ่าน — ไม่มีรายการอะไรต้องเพิ่มในไฟล์นี้จากรอบตรวจนี้ (ไม่พบบั๊กใหม่จากการรัน
regression เต็ม)

## 8. Traceability กับ acceptance ของ task brief นี้

- [x] รันและแปะ: root tsc, eslint --max-warnings=0, prettier --check, root vitest, lint:config,
  lint:copy, gen-vectors --check, tools/tiles test, trace replay suites (mock replay + qa trace
  tests), client build + bundle budget, playwright ทั้งสอง project — หัวข้อ 1 (ทุกคำสั่งเขียว)
- [x] ทุกข้อ E1–E17 และ P1-E5/E7/E10/E16/E17/E18–E20/P1-CLOSE เป็น MET/WAITING-HUMAN พร้อมหลักฐาน,
  E12 ระบุทุกแถวที่ไม่ DONE/CUT พร้อมเหตุผล (ทุกแถวเป็น HUMAN หรือรอผลสนาม) — หัวข้อ 0, 4, 6
- [x] E13 privacy check: gitleaks full history สะอาด, forbidden-file guard สะอาด, ไม่มีบริการคิดเงิน,
  E14/E15 ผ่านครบ — หัวข้อ 2, 5, 6
- [x] bugs.md ไม่มี bug OPEN severity high ขึ้นไป (ไม่มี OPEN เลย) — หัวข้อ 7
- [x] สรุปหนึ่งบรรทัด: "agent side complete, waiting for human" — หัวข้อ 0, 9

## 9. Verdict

**verdict (ขอบเขตที่ agent ตรวจได้): PASS** — ทุกคำสั่ง (lint/typecheck/test/build/e2e/vector-check/
trace-check/tiles-test/gitleaks/guard/billing-guard/lint-headers/bbox-guard), ทุก gate ที่ acceptance
ระบุ, ทุก task ที่ agent เป็นเจ้าของ เขียว/DONE/CUT ครบ ไม่มี bug OPEN ไม่มี severity ≥ high

**สถานะรวมของ Phase 2 ณ จุดนี้: agent side complete, waiting for human.** ไม่มีงานไหนที่ agent ทำต่อ
ได้อีกโดยไม่มีข้อมูลจากคนหรือผลเดินสนามจริง — chain ทั้งหมดเริ่มจาก P2-C01/C02 (ยืนยัน preview บน
มือถือจริง + เดินทดสอบเชิงเทคนิค 30+30 นาที) และ P2-F06-T26/T27 (deploy playtest + เดินจริงอย่างน้อย
3 คน) รายชื่อเต็มของงาน HUMAN และงานที่รอผลสนามอยู่ในหัวข้อ 0

**การเปลี่ยนแปลงจากรอบก่อนหน้า (P1-CLOSE-QA, 2026-09-24):** Phase 1 เองยังไม่ปิดจริง (P1-E4/E9/E15
ของ Phase 1 เดิมกลายเป็นงาน P2-C* ตาม D-086) — รายงานนี้ตรวจ Phase 2 ทับซ้อนกับ Phase 1 ที่ยกมา
ตามที่ context ของ task brief กำหนด ไม่มีอะไรถดถอย (regressed) จากรอบก่อน — เลขตัวเลขดีขึ้นทุกจุด
(test 927→3113, e2e 30→106, tiles test 39→71, vector 8→19 ไฟล์)

## 10. Handoff

- ถึง producer/orchestrator: agent side ของ Phase 2 (interim) พร้อมแล้ว 100% — เสนอเปิดคิว HUMAN
  ตามลำดับ P2-C01 → P2-C02 → (P2-C03/C04 ต่อทันที, tech-lead/location-engineer) → P2-C05 →
  P2-F04-T11/P2-F06-T26 → P2-F06-T27 → P2-C06/C07 → P2-C08 → P2-F05-T12/T13/T19, P2-F06-T12/T28/T29
  → P2-CLOSE-QA (ตัวจริง) → P2-CLOSE-PM | blocking: yes (สำหรับปิด Phase 2 จริง ไม่ blocking agent side)
- ถึง location-engineer: เพิ่มแถว metadata ให้ 8 ไฟล์ trace ใน `data/gps-traces/qa/` ที่ยังไม่อยู่ใน
  README หัวข้อ 6.1 (`qa-gate-bench-jitter-01`, `qa-gate-boundary-01`, `qa-gate-normalwalk-gap-01`,
  `qa-gate-speedlock-01`, `qa-gate-still-01`, `qa-gps-gap-2min`, `qa-gps-jump-01`,
  `qa-e2e-khlong-ong-ang-closed-01`) — รายละเอียด/จุดประสงค์ของแต่ละไฟล์อยู่ในหัวข้อ 3 ของรายงานนี้
  และในคอมเมนต์หัวไฟล์ `qa/tests/traces/*.test.ts` ที่เรียกใช้แต่ละไฟล์ | why: จาก H37 เดิม (ยังไม่
  ปิด) — ความถูกต้องของ trace ไม่กระทบ (ผ่าน validateTrace และใช้งานจริงในเทสต์ที่เขียวทั้งหมด) เป็น
  ช่องว่างเอกสารล้วน ๆ | blocking: no (ไม่ block PASS ของรายงานนี้หรือของ gate ใด)
- ถึง HUMAN (ผ่าน producer): รายการงานเต็มพร้อมลำดับที่แนะนำอยู่ในหัวข้อ 0 และย่อหน้าแรกของหัวข้อนี้
  | why: เป็นเงื่อนไขเดียวที่เหลือก่อนปิด Phase 2 | blocking: yes

## REPORT
task: P2-CLOSE-QA (interim, run 2)
status: DONE
summary: Agent side ของ Phase 2 (interim) ครบ 100% — lint/typecheck/test(3113)/build/bundle-budget/
  e2e(106)/vector+trace `--check`/tiles-test(71)/gitleaks/forbidden-guard/billing-guard/lint-headers/
  bbox-guard เขียวทั้งหมด, ไม่มี bug OPEN (ไม่เคยมี severity ≥ high ที่ยัง OPEN), ทุก gate ที่
  acceptance ระบุ PASS รอบล่าสุด, ทุก task ที่ agent เป็นเจ้าของ DONE/CUT — สิ่งที่เหลือทั้งหมดเป็นงาน
  HUMAN (8 แถว) หรืองานที่ deps ตรงบนงาน HUMAN โดยตรง รอผลเดินสนาม (10 แถว) ตามที่ context ระบุไว้เป๊ะ
outputs:
  - qa/reports/phase-2-regression.md — รายงาน regression interim เต็ม พร้อม command output,
    checklist E1–E17/P1-E*, gate verdict table, task table check, bug status, handoffs
  - qa/bugs.md — ตรวจซ้ำเท่านั้น ไม่มีบั๊กใหม่ ไม่มีการแก้ไข (ไม่มีอะไรต้องเพิ่ม)
acceptance:
  - [x] รันและแปะทุกคำสั่ง (tsc, eslint, prettier, vitest, lint:config, lint:copy, gen-vectors
    --check, tools/tiles test, trace replay suites, client build + bundle budget, playwright
    ทั้งสอง project) — หัวข้อ 1
  - [x] E1–E17, P1-E5/E7/E10/E16/E17/E18–E20/P1-CLOSE: MET/WAITING-HUMAN พร้อมหลักฐาน · E12 ระบุ
    ทุกแถวไม่ DONE/CUT พร้อมเหตุผล ทุกแถวเป็น HUMAN หรือรอสนาม — หัวข้อ 0, 4, 6
  - [x] E13 privacy: gitleaks full history + forbidden-file guard สะอาด, ไม่มีบริการคิดเงิน · E14/E15
    ผ่าน — หัวข้อ 2, 5, 6
  - [x] bugs.md ไม่มี OPEN bug severity high ขึ้นไป (ไม่มี OPEN เลย) — หัวข้อ 7
  - [x] สรุปหนึ่งบรรทัด "agent side complete, waiting for human" — หัวข้อ 0, 9
assumptions:
  - A-P2-CLOSE-QA-interim-1: "trace replay suites (packages/location mock replay, qa trace tests)"
    ในโจทย์หมายถึง `qa/tests/traces/*.test.ts` (engine-checkin/engine-movement-gate/
    engine-run-state) ที่รันเป็นส่วนหนึ่งของ `pnpm test` บวก `qa/tests/traces/build.ts --check`
    (การ check เฉพาะของ qa trace) และ e2e `location-mock.spec.ts`/`full-run.spec.ts` — ไม่ใช่คำสั่ง
    แยกอีกตัวที่ไม่มีอยู่จริงในโค้ด (owner ที่ควรยืนยัน: tech-lead/producer)
  - A-P2-CLOSE-QA-interim-2: การพบว่า `data/gps-traces/qa/` มี 8 ไฟล์ที่ไม่มี metadata ใน README
    หัวข้อ 6.1 ไม่ใช่เหตุ NEEDS_CHANGES ของรายงานนี้ (ความถูกต้องของ trace ไม่กระทบ, validateTrace
    ผ่านและใช้งานจริงในเทสต์ที่เขียว) — เป็น handoff ให้ location-engineer ปิดต่อ ไม่ blocking
    (owner ที่ควรยืนยัน: location-engineer/producer)
handoffs:
  - to: producer/orchestrator | need: เปิดคิวงาน HUMAN ตามลำดับในหัวข้อ 0/9 | why: เป็นเงื่อนไขเดียว
    ที่เหลือก่อนปิด Phase 2 | blocking: yes
  - to: location-engineer | need: เพิ่มแถว metadata ให้ 8 ไฟล์ trace ใน data/gps-traces/qa/ ที่ยังไม่
    อยู่ใน README หัวข้อ 6.1 (รายชื่อในหัวข้อ 3/9 ของรายงานนี้) | why: จาก H37 เดิม ยังไม่ปิด | blocking: no
  - to: HUMAN (ผ่าน producer) | need: ทำ C01→C02→(C03/C04)→C05→F04-T11/F06-T26→F06-T27→C06/C07→C08
    →F05-T12/T13/T19, F06-T12/T28/T29→CLOSE-QA(ตัวจริง)→CLOSE-PM ตามลำดับในหัวข้อ 0/9 | why: เงื่อนไข
    ปิด Phase 2 ตาม exit checklist E4(เครื่องจริง)/E9/E10/P1-E5/E7/E10/E16/E17/E18-E20/P1-CLOSE |
    blocking: yes
decisions:
  - none
questions_for_human:
  - none
