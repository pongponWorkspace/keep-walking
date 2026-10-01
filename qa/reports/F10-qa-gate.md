# QA gate — F10 (Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F10-T22 (review-gate) · เจ้าของ: qa-tester |
| วันที่ | 2026-10-01 |
| ฐานที่ตรวจ | working tree ที่ HEAD `8198130` (P2-F10-T19) + commit ขนาน `f300a7f` (P2-X63, แก้ finding story-dot CSS จาก T19 แล้ว) · ระหว่างงานนี้มี working-tree diff ของ `art/assets/manifest.icon.ui.json` (modified, งานขนานอื่น) และไฟล์ใหม่ `design/reviews/F10-copy-gate.md` (untracked, งาน T20 ของ narrative-designer) — ทั้งสอง**ไม่แตะ**ไฟล์ที่งานนี้ตรวจและไม่อยู่ใน `writes` ของงานนี้ จึงไม่แตะ |
| ขอบเขต | ทุก acceptance ของ P2-F10-T01–T19 ตามบอร์ด (detail block P2-F10-T22) · acceptance 1–13 ของ `design/features/F10-account-shell.md` หัวข้อ 8 · traceability ของ `qa/plans/F10-test-plan.md` §4–5 · ผลรันจริงของ `qa/reports/F10/e2e-coverage.md` และ `e2e-full-run.log` (ตรวจซ้ำเอง ไม่ใช่แค่เชื่ออ่าน) · Phase Exit Checklist E18–E23 (ฝั่ง QA) · `qa/bugs.md` (bug blocking = 0) |
| **verdict** | **PASS** |

## 0. สรุปหนึ่งย่อหน้า

Tech gate F10 PASS รอบ 2 (`docs/reviews/F10-tech-gate.md`, ปิดครบ F-01..F-05) และ e2e ใหม่ของ T19 รายงาน 170/170 ผ่าน งานนี้ตรวจซ้ำอิสระด้วยการรันจริงเองทั้งสองชุดตามที่ brief สั่ง: root `pnpm test` (229 ไฟล์/3519 ผ่าน/2 skip, ตรงกับตัวเลขของ tech gate รอบ 2 เป๊ะ — ไม่มี regression ใหม่) และ `CI=1 npx playwright test --retries=0` ทั้งสอง project (`apps/*/e2e/` + `qa/tests/e2e/`, android-chrome + ios-safari): **170 passed, 0 failed, 0 flaky** (3.3 นาที) ตรงกับผลของ T19 เป๊ะ ยืนยันว่าไม่มีอะไรหลุดหายระหว่างงานขนาน (P2-X63) ที่แก้ finding story-dot CSS ไปแล้วจริง (เห็น `.story-dot`/`.story-dot-active` มีขนาด 10px ใน `app.css:1663-1673` ตอนนี้) อ่าน `qa/reports/F10/e2e-coverage.md` ทั้งไฟล์พบว่า**หัวบทสรุปจำนวนของ T19 เขียนผิด**: ระบุ "COVERED เต็ม 71 case, PARTIAL 14 case" แต่ตารางจริงมี COVERED เต็ม 44 · PARTIAL 26 · GAP 11 · out-of-scope (ส่งต่อ gate อื่นถูกต้อง) 4 = 85 — งานนี้แก้ตัวเลขให้ถูกใน §5 และ**ตัดสินใหม่ทีละข้อครบทั้ง 37 รายการ** (ไม่ใช่แค่ 14 ตามตัวเลขเดิมที่ผิด) โดยเพิ่มหลักฐานระดับ unit ของ `onboarding-step.test.ts` ที่ T19 ไม่ได้อ้างสำหรับ 2 ใน 11 GAP (TC-F10-FLOW-03 เรื่อง permission ถูกบล็อก และ TC-F10-MIGRATE-06 เรื่อง legacy player ค้างกลางทาง) — ทั้งสองมี unit test ตรงจุดอยู่แล้ว (`onboarding-step.test.ts:179-186`, `:141-144`) เพียงไม่มี e2e ระดับ UI ไม่ใช่ไม่มีหลักฐานเลยอย่างที่ตารางเดิมสื่อ สรุป: **ไม่มีรายการใดใน 37 รายการกระทบ acceptance 1–13 หรือ non-negotiable 1–7** — ทุกรายการเป็น (ก) พิสูจน์แล้วที่ชั้น unit/vector/code-review ของ tech gate, (ข) ส่งต่อ gate เฉพาะทางที่ถูกต้องอยู่แล้ว (T20 copy, T21 visual, T24 product/telemetry), หรือ (ค) ข้อจำกัดเครื่องมือ/edge ต่ำ (Playwright ปฏิเสธ permission ไม่ได้ตรงๆ, สองแท็บพร้อมกัน) ที่เหมาะเป็น backlog ของ P2-F10-CI/Phase 3 ไม่มี bug severity high ขึ้นไปที่ OPEN (`qa/bugs.md` ไม่มี bug ค้างก่อนงานนี้) พบ 1 finding ใหม่ชั่วคราวระหว่างรันงานนี้ (prettier ของไฟล์ผลลัพธ์สคริปต์ถ่ายภาพที่ถูกคอมมิตใหม่โดย P2-X63) บันทึกเป็น severity low ไม่ blocking ใน §6 — **verdict: PASS**

## 1. หลักฐานที่รันจริง (งานนี้เอง ไม่ใช่แค่เชื่อรายงานเดิม)

| คำสั่ง | ผล | บรรทัดสรุป |
| --- | --- | --- |
| `pnpm test` (root, vitest) | exit 0 | `Test Files 229 passed (229)` · `Tests 3519 passed \| 2 skipped (3521)` — ตรงกับ tech gate F10 รอบ 2 เป๊ะ (ไม่มี regression ใหม่ตั้งแต่ tech gate) · 2 skipped = `qa/tests/F02/hud-panel-blackbox.test.ts` ของเดิม (F02) ไม่เกี่ยว F10 |
| `CI=1 npx playwright test --retries=0 --reporter=list` (ทั้ง `apps/*/e2e/` + `qa/tests/e2e/`, android-chrome + ios-safari, พอร์ต 4173 ว่างก่อนรัน) | exit 0 | **170 passed (3.3m)**, 0 failed, 0 flaky (`grep -c "✓"` = 170, `grep -c "failed"` = 0) — ตรงกับผลของ T19 (170 passed, 3.2m) เป๊ะ รวม build+preview ของ webServer ในตัว |
| `pnpm lint:config` | exit 0 | `config-lint: 22 files, 0 errors, 2 warnings, 0 allowed, 0 stale` — ตรงกับ tech gate รอบ 2 (2 warning เดิมของ `enhance.json`/`raid.json` ไม่เกี่ยว F10) |
| `pnpm lint` (root) | **exit 1** | ล้มที่ `prettier --check` บรรทัดเดียว: `qa/reports/F10/screens/capture-results.json` — ไฟล์นี้ถูกคอมมิตใหม่โดย P2-X63 (งานขนาน, `f300a7f`) ตอนรันสคริปต์ถ่ายภาพซ้ำหลังแก้ CSS ไม่ได้รัน prettier ก่อนคอมมิต ไม่ใช่ของงาน T19/T22 — ดู §6 (severity low, ไม่ blocking ของ gate นี้ เพราะ acceptance ของ T22 ตาม brief ระบุแค่ `pnpm test` และ playwright ไม่ใช่ `pnpm lint` เต็ม ซึ่งเป็นหน้าที่ของ P2-F10-CI ถัดไป) |

ขอบเขตคำสั่งตาม brief ("รันเองแนบผล: pnpm test (root) และ `CI=1 npx playwright test --retries=0` ทั้งชุด") ผ่านทั้งสองคำสั่งหลัก · `lint`/`lint:config` รันเพิ่มเพื่อยืนยันไม่มี regression จาก tech gate เท่านั้น ไม่ใช่ขอบเขตบังคับของ T22

## 2. Acceptance 1–13 (`design/features/F10-account-shell.md` หัวข้อ 8) → หลักฐาน → MET/NOT MET

| # | acceptance (ย่อ) | หลักฐาน | ผล |
| --- | --- | --- | --- |
| 1 | ลำดับ 8 ขั้นเป๊ะ · ปฏิเสธ consent ข้าม permission ยังถึงแผนที่ | `apps/client/e2e/onboarding.spec.ts:108` เดินครบ 8 ขั้น (TC-FLOW-01, COVERED) + `:317` decline-consent ข้าม permission (TC-FLOW-02) + step-machine `onboarding-step.ts`/`.test.ts` (unit, D-149 table ครบ) · ส่วนที่เหลือของ FLOW-02 (ไปถึงแผนที่จริงในสถานะไม่รู้ตำแหน่ง) เป็น PARTIAL ไม่ blocking (§5) | **MET** |
| 2 | ทุกปุ่มยืนยัน → อายุ (หรือแผนที่เมื่อ `SignedOut`) · ไม่มี request นอก allowlist | `onboarding.spec.ts:220` ครบ Google/Apple/email/register/forgot (COVERED) + `qa/tests/e2e/f10-pdpa-storage.spec.ts:177` ดัก network ตลอดทาง (COVERED) + `f10-nav-shell.spec.ts:133` relogin ตรงแผนที่ (COVERED) | **MET** |
| 3 | ค่าอีเมล/password ไม่หลงเหลือในเก็บข้อมูลใด · `kw.p2.account` มีแค่ provider+signedIn(+schemaVersion) | `f10-pdpa-storage.spec.ts:107` กรอกอีเมล/password จริง ยืนยันไม่รอดเข้า storage/telemetry/export (COVERED) + tech gate T18 §2.1 code review (`login-screen.ts` ไม่มี `<form>`, ปุ่ม `type="button"`, ไม่มี handler อ่าน `.value`) | **MET** |
| 4 | อายุต่ำกว่าเกณฑ์: ไม่มี key ใหม่ใด | `onboarding.spec.ts:272` (COVERED) + `f10-pdpa-storage.spec.ts:77` สแกน key เต็ม (COVERED) + tech gate T18 code review `onboarding-flow.ts:314-317` (`saveAccount` มี 2 call site เดียว ทั้งคู่ต้องผ่าน age gate) | **MET** |
| 5 | ตัวกรองชื่อตรงทุก vector · สุ่ม 10,000 seed ผ่านทุกครั้ง · ปุ่มสร้างล็อกจนครบเงื่อนไข | `packages/shared/src/character/character.test.ts` รัน 75 vector แบบ dynamic + 10,000-seed property test (ทั้งคู่อยู่ใน root `pnpm test` ที่งานนี้รันซ้ำแล้วเขียว) (COVERED) + `onboarding.spec.ts:343` ปุ่มสร้าง disabled จนผ่านเงื่อนไข + ปุ่มสุ่มได้ชื่อผ่านเสมอ (COVERED) | **MET** |
| 6 | ไม่พบชื่อตัวละครใน telemetry/export · ไม่มีจอผู้อื่นแสดงชื่อ | `f10-pdpa-storage.spec.ts:107` export scan (COVERED) + `onboarding.spec.ts` telemetry buffer scan (COVERED) + Phase 2 ไม่มีจอผู้เล่นอื่นจริง (ยืนยันจาก spec §7 out-of-scope) | **MET** |
| 7 | เรื่อง 5 slide: ปุ่มถูกต้องต่อ slide, ข้ามได้, ไม่เห็นซ้ำ, ไม่เอ่ยระบบห้ามสอน | `onboarding.spec.ts:108` จบเรื่อง→แผนที่ (COVERED) + `:442` reload กลางเรื่องกลับ slide 1 (COVERED) + ภาพ `qa/reports/F10/screens/09-11-story-slide-*.png` (6 ภาพ, ถ่ายใหม่หลัง P2-X63 แก้ CSS จุดบอกตำแหน่ง) ให้ T20 (copy gate, อยู่ระหว่างทำ — ไม่ใช่ deps ของ T22 ตามบอร์ด) ตรวจเนื้อหาไม่เอ่ยระบบห้ามสอน · finding story-dot CSS ของ T19 **ปิดแล้ว** (verified: `apps/client/src/app.css:1663-1673` มี `.story-dot`/`.story-dot-active` ขนาด 10px ไม่ใช่ 0 อีกต่อไป) | **MET** |
| 8 | nav 5 ช่องเห็นถูกจอ ไม่เห็นผิดจอ ที่ 360/390 px · Setting ไม่ทับ HUD | `qa/tests/e2e/f10-nav-shell.spec.ts` ทั้งไฟล์ (ลำดับ 5 แท็บ, viewport-fit 360/390, Inventory/coming-soon/Setting) ล้วน COVERED + tech gate T18 F-04 ปิด (z-index token `navScreen:35`/`nav:38` ระหว่าง `toast:30` กับ `popupModal:40`) | **MET** |
| 9 | จอเร็วๆ นี้ 3 จอไม่มีกลไก เงื่อนไขปลด ตัวเลข หรือจำนวนคน | `f10-nav-shell.spec.ts` loop test 3 แท็บ (ไม่มีปุ่มอื่น, COVERED) + เนื้อหาคำ (ไม่มีตัวเลข/จำนวนคน) ส่งต่อ T20 ตรวจคำต่อคำ (เหมือนรูปแบบเดียวกับ F06-qa-gate.md ข้อ E8 ที่ให้ design/content gate ปิดเนื้อหาละเอียด ไม่ใช่เงื่อนไขบล็อกของ QA gate เอง) | **MET** |
| 10 | logout นอก run: ไปจอ login ข้อมูลเดิมครบ · relogin ตรงแผนที่ · logout ระหว่าง run: จบ `manual_exit` ของครบ ไม่ผ่าน Grace/Suspended/`timeout` | `f10-nav-shell.spec.ts:133` (COVERED) + `:168` during-run manual_exit (COVERED) + tech gate T18 §2 ข้อ 8 code review (`account/logout.ts`→`exitRun`→`engine.dispatch({type:'exit'})` เส้นเดียวกับปุ่มออกปกติ ไม่มี exit_reason ใหม่) | **MET** |
| 11 | ลบข้อมูลในเครื่อง: ไม่เหลือ `kw.p2.*` ใด, กลับจอเริ่มเกม, ปุ่มใช้ไม่ได้ระหว่าง run | `f10-pdpa-storage.spec.ts:212` (COVERED) + `qa/tests/F06/clear-local-data-integration.test.ts` unit `canClear` false ระหว่าง run (COVERED, อยู่ใน root `pnpm test`) | **MET** |
| 12 | migration ผู้เล่นเดิม: login → ตั้งชื่อ (class ล็อก) → เรื่อง → แผนที่ · ข้อมูลเดิมไม่เปลี่ยน · run ค้างเล่นต่อได้ก่อน | `onboarding.spec.ts:384` migration (class ล็อก, session/inventory/HP คงเดิม, COVERED) + tech gate T18 code review `onboarding-step.test.ts:381-` (4 แถวของ migration table) · "run ค้างเล่นต่อก่อน" (R48) ไม่มี e2e เฉพาะ (TC-MIGRATE-05, GAP) แต่มี unit ตรงจุด (`onboarding-step.test.ts:408-412`, "step machine ... run-agnostic") + กลไก resume-run เดิมของ F04/F06 ที่ F10 ไม่แตะ (diff ว่าง) ถูก e2e คุมอยู่แล้วหลายไฟล์ (`location-mock.spec.ts`, `full-run.spec.ts`, `f06-hp.spec.ts`) — ไม่ blocking (§5) | **MET** |
| 13 | diff ของ F10 ไม่แตะ reward, movement gate, HP, run state · ทุกค่าตัวกรองและป้ายอ่านจาก config/content/copy | tech gate T18 §1 diff `packages/shared/src/{reward,hp,session,run}` = ว่าง ทั้งสองรอบ (PASS) + `pnpm lint:config` ของงานนี้ 0 errors/0 allowed/0 stale (ตรงกับ tech gate รอบ 2) + `qa/tests/F02/privacy-copy.test.ts` (TC-COPY-01, grep ไม่มี Thai hardcode รวมไฟล์ใหม่ของ F10) อยู่ใน root `pnpm test` ที่งานนี้รันซ้ำเขียว | **MET** |

ทุก acceptance 1–13: **MET** ไม่มีข้อใด NOT MET

## 3. Phase Exit Checklist F10 (E18–E23, ฝั่ง qa-tester ตามบอร์ด §5)

| # | เกณฑ์ (ย่อ) | หลักฐาน | สถานะ |
| --- | --- | --- | --- |
| E18 | ลำดับ 8 ขั้นครบ รวม reload กลางทางและปฏิเสธ consent | acceptance 1 (§2) + `onboarding.spec.ts` reload-mid-story (`:442`) + unit ของ step-machine ครบตาราง D-149 | **PASS** |
| E19 | login bypass: ไม่มี request นอก allowlist, ไม่มี password/อีเมลใน storage/telemetry/export | acceptance 2, 3 (§2) | **PASS** |
| E20 | จอสร้างตัวละคร: ตัวกรองจาก config ครบทุกเหตุผล, ชื่อสุ่มผ่านเสมอ | acceptance 5 (§2) | **PASS** |
| E21 | map หลัก + nav 5 ปุ่ม, เร็วๆ นี้, Setting+logout, nav ไม่บัง HUD/จอพกกระเป๋า | acceptance 8, 9, 10 (§2) | **PASS** |
| E22 | ผู้เล่นเดิม: session/class/inventory ไม่หาย | acceptance 12 (§2) | **PASS** |
| E23 | PDPA/non-negotiable: age gate ก่อน consent, ต่ำกว่าเกณฑ์ไม่มี key, ชื่อไม่ออกเครื่อง/ไม่โชว์ผู้อื่น, ไม่มีช่องอิสระอื่น, ไม่มีค่า/ชื่อฝังโค้ด, gate/reward/HP ไม่เปลี่ยน | acceptance 1, 4, 6, 13 (§2) + §4 ด้านล่าง | **PASS** |

(E24 รอ T20/T21/T23/T24 ปิดครบตามลำดับบอร์ด · E25 เป็นของ product-manager (T24) · E26 เป็นของ P2-F10-CI — ทั้งสามไม่ใช่ของ T22 ตาม brief)

## 4. ตรวจ non-negotiable 1–7 (CLAUDE.md) อิสระจากหัวข้อ 10 ของ spec

| ข้อ | ผล |
| --- | --- |
| 1. Server-authoritative | F10 ไม่เพิ่ม logic คำนวณรางวัล/gate/HP ใดๆ · diff `packages/shared/src/{reward,hp,session,run}` ว่างทั้งสองรอบของ tech gate — ยืนยันอิสระ: `git diff 9faa88c~1..HEAD -- packages/shared/src/reward packages/shared/src/hp packages/shared/src/session packages/shared/src/run` ว่างเช่นกันในงานนี้ |
| 2. Movement gate ทุกรางวัล | F10 ไม่แตะ tick/gate · ทางจบ run ใหม่ (`manual_exit` จาก logout) ใช้ `engine.dispatch({type:'exit'})` เส้นเดียวกับปุ่มออกเดิม ไม่สร้าง exit reason ใหม่ (tech gate T18 §2 ข้อ 8) |
| 3. ค่าทุกตัวอยู่ใน config | ตัวกรองชื่อ/คลังชื่อ/route มาจาก `config/balance/character.json`, `config/content/character-names.th.json`, `nav/routes.ts` (identifier ไม่ใช่ balance) · `pnpm lint:config` 0 errors/0 allowed/0 stale |
| 4. ไม่มี PvP, ไม่มีแชทอิสระ, ไม่โชว์ตำแหน่งผู้เล่นอื่น | ช่องชื่อ/login ไม่ออกจากเครื่อง (ยืนยันซ้ำ §2 ข้อ 3, 6) · จอ Party ไม่มีจำนวนคน (`f10-nav-shell.spec.ts` loop test) |
| 5. Outdoor only v1 | F10 ไม่แตะ `verification_mode`/`floor_level` — ไม่มี diff ในไฟล์ที่เกี่ยวข้อง |
| 6. Low penalty, auto-retreat default on | logout ไม่แตะ `kw.p2.settings.autoRetreat` (tech gate: logout = `signedIn:false` เท่านั้น ไม่ลบ key ใด) · ลบข้อมูลในเครื่องคืนค่า default เปิด (R44, COVERED `f10-pdpa-storage.spec.ts:212`) |
| 7. PDPA: consent แยก, TTL, ลบบัญชีจริง, อายุ 15+ | consent location ยังเป็นจอแยกจาก login เสมอ (ทุก test ของ `onboarding.spec.ts` เห็น `.consent-location-screen` แยกจาก `.login-screen`) · age gate ก่อน consent ก่อน permission คงลำดับเดิม (D-149 ไม่สลับ 3 ขั้นนี้) · ลบข้อมูลในเครื่องล้าง `kw.p2.*` ทั้งหมดจริง (COVERED) |

ไม่มีข้อใดใน 1–7 ถูกละเมิด

## 5. PARTIAL/GAP ของ `qa/reports/F10/e2e-coverage.md` (T19): แก้จำนวนที่สรุปผิด + ตัดสินทีละข้อ

**แก้ไขจำนวน:** หัวบทสรุปของ T19 เขียนว่า "COVERED เต็ม 71 case, PARTIAL 14 case" (85 case รวม) แต่การนับจริงจากตาราง 3.1–3.8 ของไฟล์เดียวกัน (นับด้วย `grep`/`awk` ทีละแถว แล้วยืนยันด้วยตาเปล่าอีกครั้ง) คือ **COVERED เต็ม 44 · PARTIAL 26 · GAP 11 · out-of-scope (ส่งต่อ gate อื่นโดยตั้งใจ ไม่ใช่ความผิดพลาด) 4** = 85 ตรง ตัวเลข "14" ในหัวบทสรุปไม่ตรงกับตารางของมันเอง — เป็นข้อผิดพลาดของการสรุปตัวเลข ไม่ใช่ของตารางรายละเอียด (รายละเอียดแต่ละแถวที่ T19 เขียนไว้ถูกต้องและมีประโยชน์ ใช้เป็นหลักฐานหลักของตารางด้านล่าง)

ตัดสินใหม่ครบทั้ง **37 รายการ** (26 PARTIAL + 11 GAP) ไม่ใช่แค่ 14 ตามตัวเลขเดิม จัดกลุ่มตามเหตุผลร่วม:

### 5.1 กลุ่ม A — ส่งต่อ gate เฉพาะทางที่ถูกต้องอยู่แล้ว (ไม่ใช่ gap ของ QA, ไม่ blocking)

| id | เหตุผล | ส่งต่อ |
| --- | --- | --- |
| NAME-01 | เนื้อหาคำอธิบาย class ไม่มีสูตร/% (layout 4 การ์ดตรวจแล้ว) | T20 copy gate |
| STORY-01, -03, -04, -07, -08 | เนื้อหา/ภาพ slide (ปุ่มข้าม, gesture ยังไม่เปิด, ภาพ 360/390) | T20 copy, T21 visual |
| NAV-07 | เนื้อหาจอเร็วๆ นี้ | T20 copy gate |
| LOGOUT-11 | เทียบแถว Setting เดิมด้วยภาพ | T20/T21 |
| FLOW-05 | น้ำหนักปุ่ม Google/Apple เป็นภาพ ไม่ใช่ DOM assertion | T21 visual gate |
| PDPA-06 | ไม่มีจอดึงข้อมูลจาก provider — พิสูจน์เชิงตรรกะแล้ว (ไม่มี request ออกเลยจาก PDPA-04 จึงไม่มีอะไรให้ดึงกลับมา) | ไม่ต้องส่งต่อ, ปิดแล้วด้วยเหตุผล |

**บล็อก: ไม่มีข้อใด** — ทุกข้อถูกมอบหมายให้ gate ที่ตรวจเนื้อหา/ภาพโดยตรงอยู่แล้ว เหมือนรูปแบบเดียวกับ F06-qa-gate.md ข้อ E8 (เนื้อหาละเอียดรอ design/content gate ไม่ใช่เงื่อนไขบล็อกของ QA gate เอง)

### 5.2 กลุ่ม B — พิสูจน์แล้วที่ชั้น unit/vector/code-review (function เดียวกับที่ e2e อื่นพิสูจน์แล้วบางส่วน)

| id | หลักฐานชั้น unit/vector/code | บล็อก? |
| --- | --- | --- |
| FLOW-02 | e2e พิสูจน์ถึงแค่ "ขั้นสร้างตัวละคร" หลังปฏิเสธ consent ไม่ได้เดินต่อถึงแผนที่จริงในเทสต์เดียวกัน — แต่ FLOW-01 (COVERED) พิสูจน์แล้วว่า character→story→map เดินได้เต็มเส้นเมื่อ consent ยอมรับ และ step-machine (`onboarding-step.ts:179-186`, "declined skips permission straight to character") ใช้โค้ดเส้นเดียวกันไม่แยกสาขาตามค่า consent หลังจากขั้น permission แล้ว ไม่มีจุดใดในโค้ดที่ทำให้ consent=declined ไปติดก่อนถึงแผนที่ | ไม่ |
| NAME-03, -05, -07, -10, -12 | `validateCharacterName`/`randomCharacterName` เดียวกันที่ผ่าน 75 vector dynamic + 10,000-seed property (NAME-09, root `pnpm test`, งานนี้รันซ้ำเขียว) — ที่เหลือคือ "พิมพ์ซ้ำในช่อง UI จริงกี่ครั้ง" ซึ่งเป็น DOM wrapper บาง ไม่ใช่ logic ใหม่ | ไม่ |
| FLOW-09, -11 (reload matrix), -12 | code review ยืนยัน handler เดียว (`intro-screen.ts`), route resolver เดียว (`nav/routes.ts#resolveRoute`, unit test ครบทุกแถวของ `routes.test.ts`) ที่ deep-link e2e (FLOW-13/14/15) เรียกอยู่แล้ว · FLOW-11 มี 1 แถวจริง (reload-mid-story, COVERED) จาก 5 แถวที่ตารางขอ ที่เหลือ 4 แถว (intro/age/consent/permission) ตรวจผ่าน `routes.test.ts` + `onboarding-step.test.ts` แทน | ไม่ |
| FLOW-03 | **unit ตรงจุด** `apps/client/src/onboarding/onboarding-step.test.ts:158-168` ("step permission: consent granted ... not yet resolved") และ `:179-186` ("step character: ... permission resolved [false]") — ยืนยันว่า `permissionGranted: false` เดินหน้าไป `character` ไม่ติด ตรง R04 เป๊ะ เพียงไม่มี e2e จำลอง browser permission-prompt จริง (ข้อจำกัดของ Playwright API เอง ไม่ใช่ของแอป) | ไม่ |
| FLOW-16, STORY-05 | `resolveRoute`/history guard แหล่งเดียวกับที่ deep-link e2e (FLOW-13/14/15, COVERED) เรียกผ่าน URL แทน back-button จริง — ฟังก์ชันเดียวกัน | ไม่ |
| NAV-02, -04, -09 | nav ซ่อนระหว่าง run ตรวจแล้วบางสถานะ (COVERED), โครงสร้าง `render()`'s top guard เดียวกันครอบทุกจอ (อ่านโค้ดยืนยันใน tech gate), ไม่มี badge เป็น negative assertion ที่เห็นจากภาพ | ไม่ |
| LOGOUT-04, -07, -08 | `manual_exit` เป็น path เดียวไม่แยกสถานะ run (อ่านโค้ด engine ยืนยัน), เขียน provider ใหม่ใช้ฟังก์ชันเดียวกับที่ทดสอบด้วย Google แล้ว, localStorage คงอยู่ข้าม reload เป็นพฤติกรรม browser มาตรฐานที่ทดสอบซ้ำอยู่แล้วในที่อื่น | ไม่ |
| MIGRATE-04 | `seedLegacyPlayer({withClass:false})` ตก path "ยังไม่เลือก class" ซึ่ง R47 เองสั่งให้ "ใช้จอปกติ" — เท่ากับ flow ใหม่ธรรมดาที่ FLOW-01/NAME-* ครอบอยู่แล้ว ไม่ใช่โค้ดใหม่ | ไม่ |
| MIGRATE-06 | **unit ตรงจุด** `onboarding-step.test.ts:141-144` ("step login: a legacy player has ageGatePassed already true but no account yet") — `account:null, ageGatePassed:true` → คืน `'login'` เสมอ (ฟังก์ชันไม่ดู `consentAnswered` เลยในสาขานี้ ตาม `onboarding-step.ts:174-177`) ตรง A-E22 เป๊ะ แม้ test "row 3" ของไฟล์เดียวกัน (บรรทัด 402) จะติดป้าย "A-E22" ผิดจุด (ตั้ง `account: SIGNED_IN` ซึ่งไม่ใช่สถานะ legacy จริง) — **ข้อสังเกตเล็กไม่ blocking**: ป้ายชื่อ test คลาดเคลื่อน ไม่ใช่ logic ผิด เสนอ backend-programmer แก้ชื่อ test "row 3" ให้ตรงสิ่งที่มันพิสูจน์จริง (ครั้งหน้าที่แตะไฟล์นี้) | ไม่ |

### 5.3 กลุ่ม C — ข้อจำกัดเครื่องมือ/edge ต่ำมาก, telemetry-only (ไม่กระทบ reward/HP/PII)

| id | เหตุผล | บล็อก? |
| --- | --- | --- |
| FLOW-19, MIGRATE-05 | สองแท็บพร้อมกัน (A-E25 เองยอมรับว่า "ไม่ต้อง sync สด"), run ค้างตอน migration ใช้กลไก resume-run เดิมของ F04/F06 ที่ F10 ไม่แตะ (diff ว่าง) และถูก e2e คุมอยู่แล้วหลายไฟล์ | ไม่ |
| NAME-11, -13 | สุ่มแล้วพิมพ์ต่อ / paste ยาว-emoji — ฟังก์ชัน validate เดียวกับที่ vector ครอบ 75 case รวม `charset`/`tooLong` | ไม่ |
| NAV-10, LOGOUT-05, STORY-09 | telemetry correlation/property (`nav_tab_opened`+`coming_soon_viewed` เวลาเดียวกัน, `account_logout`+`dungeon_exited` เวลาเดียวกัน, `story_skipped{slide_index_at_skip}` ยังไม่มี e2e ยืนยัน แม้ `story_completed` จะ COVERED แล้ว) — เป็น metric ไม่ใช่ reward/state จริง event ทุกตัวมีอยู่และยิงจริง (ยืนยันแยกกันคนละจุดใน e2e อื่น) เพียงไม่มี assertion ยืนยัน property/เวลาละเอียด | ไม่ (ส่งต่อ T24 product gate เป็น metric quality ไม่ใช่ QA blocker) |
| FLOW-17 | offline ที่จอ login โดยตรง — ปุ่ม login ทุกปุ่มเป็น bypass ไม่เรียก network อยู่แล้ว (พิสูจน์แล้วจาก PDPA-04 ว่าไม่มี request ใดเลยตลอดทาง ไม่ใช่แค่ตอน offline) | ไม่ |
| FLOW-18 | F10 ไม่แตะ presence/gate เลย (diff ว่าง) regression เดิมของ F04/F06 ยังคุมอยู่ (ไม่ใช่ของใหม่ที่ F10 ต้องพิสูจน์ซ้ำ) | ไม่ |

**สรุป §5:** 37/37 รายการตัดสินแล้ว **ไม่มีรายการใดบล็อก acceptance 1–13 หรือ non-negotiable 1–7** ทุกรายการเป็นรายการยกไป (carry-over) ไม่ใช่ finding ถึงเจ้าของฟีเจอร์ — ยกเว้น 1 ข้อสังเกตเล็ก (ชื่อ test "row 3" ของ MIGRATE-06 คลาดเคลื่อน) ที่เสนอแก้แบบ opportunistic เท่านั้น ไม่ใช่ finding แยก

## 6. บั๊ก (`qa/bugs.md`)

ก่อนงานนี้ `qa/bugs.md` ไม่มี bug สถานะ OPEN ค้างอยู่เลย (ยืนยันจากบรรทัดสถานะรวมล่าสุดของ P2-F10-T19 และการอ่านทั้งไฟล์) — **bug blocking = 0** ตามเงื่อนไขของ gate นี้

พบ 1 finding ใหม่ระหว่างงานนี้ (ไม่ใช่ product bug, severity low, ไม่ blocking): `pnpm lint` (root) ล้มที่ `prettier --check` บรรทัดเดียวคือ `qa/reports/F10/screens/capture-results.json` — ไฟล์นี้ถูกคอมมิตใหม่โดยงานขนาน P2-X63 (`f300a7f`, แก้ finding story-dot CSS จาก T19 แล้วรันสคริปต์ถ่ายภาพซ้ำ) โดยไม่ได้รัน `prettier --write` ก่อนคอมมิต ไม่กระทบผู้เล่น ไม่กระทบ reward/HP/gate/PII ไม่อยู่ใน `writes` ของ T22 จึงไม่แก้เองในงานนี้ (ตามกติกา "เขียนเฉพาะใน writes") บันทึกไว้ให้ P2-F10-CI (ซึ่งต้องรัน `pnpm lint` ให้เขียวเป็นส่วนหนึ่งของ acceptance อยู่แล้ว) จับและรัน `pnpm exec prettier --write qa/reports/F10/screens/capture-results.json` ก่อนปิดงานนั้น — ไม่ใช่เหตุ NEEDS_CHANGES ของ gate นี้เพราะ T22 ไม่ได้ขอ `pnpm lint` เต็มตาม brief (ขอแค่ `pnpm test` และ playwright ซึ่งทั้งคู่ผ่าน)

## 7. รายการยกไป (carry-over, ไม่ใช่ finding — สำหรับ P2-F10-CI / Phase 3 backlog)

- เพิ่ม e2e จริงให้ 37 รายการใน §5 เมื่อมีเวลา โดยเฉพาะกลุ่ม B/C ที่ปัจจุบันพิสูจน์ที่ชั้น unit/code-review (ประโยชน์หลักคือกันการ regression ของ integration จริง ไม่ใช่เพราะสงสัย logic)
- MIGRATE-06: แก้ชื่อ/comment ของ test "row 3" ใน `onboarding-step.test.ts:402` ให้ตรงสถานะที่มันพิสูจน์จริง (ไม่ใช่ A-E22) ครั้งหน้าที่ backend-programmer แตะไฟล์นี้
- FLOW-03: ลองใช้ `context.grantPermissions([])` หรือปฏิเสธผ่าน dialog handler ของ Playwright จำลอง permission-prompt ถูกปฏิเสธจริง
- NAV-10, LOGOUT-05, STORY-09: เพิ่ม assertion telemetry correlation/property ให้ product-manager (T24) ใช้เป็นหลักฐานเพิ่มเติมของ metric quality
- `design/reviews/F10-copy-gate.md` (T20, อยู่ระหว่างทำโดย narrative-designer) และ `art/reviews/F10-visual-gate.md` (T21, IN_PROGRESS) ต้องปิดก่อน E24 ของ Phase Exit Checklist — ไม่ใช่ deps ของ T22 ตามบอร์ด จึงไม่รอที่นี่

## 8. Verdict

**PASS** — acceptance 1–13 ทั้งหมด MET (§2), Phase Exit Checklist E18–E23 ฝั่ง QA ทั้งหมด PASS (§3), non-negotiable 1–7 ไม่มีข้อใดถูกละเมิด (§4), ทั้ง 37 รายการ PARTIAL/GAP ของ e2e-coverage.md ตัดสินแล้วไม่มีรายการใดบล็อก (§5), bug blocking = 0 (§6) · หลักฐานการรันจริงของงานนี้เอง: `pnpm test` 3519/3521 ผ่าน (2 skip เดิม ไม่เกี่ยว F10) และ `CI=1 npx playwright test --retries=0` 170/170 ผ่าน 0 flaky (§1)
