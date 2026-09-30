# QA gate — F06 (HP, Damage และ 10 นาทีแรก)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F06-T21 (review-gate) · เจ้าของ: qa-tester |
| วันที่ | 2026-09-28 |
| ฐานที่ตรวจ | working tree ที่ HEAD `8ac2295` (P2-W17) · ระหว่างงานนี้มี working-tree diff ขนานจากงานอื่น (art-director visual gate รอบ 2, location-engineer trace งานใหม่ `synthetic-tick-denied-leelawadee-01`) ซึ่ง**ไม่แตะ**ไฟล์ที่งานนี้ตรวจ (`packages/shared/**`, `apps/client/src/**`, `qa/**`) — ยืนยันด้วย `git status --short` ก่อนและหลังงานนี้ |
| ขอบเขต | acceptance ทั้งหมดของ `design/features/F06-hp-damage-onboarding.md` (หัวข้อ 8, ข้อ 1–18) · Phase Exit Checklist E6, E8 (ฝั่ง QA), E11 (ทั้ง loop F04–F06), E16 ส่วน F06 · event หน้าจอว่าง (PM-M2) · storage หลังจบ run ไม่มีพิกัด (GD B-08) · regression F04/F05 · รายการเฉพาะจาก board row ของ P2-F06-T21 (ดูหัวข้อ 4) |
| **verdict** | **PASS** |

## 0. สรุปหนึ่งย่อหน้า

Tech gate F06 PASS รอบ 2 (`docs/reviews/F06-tech-gate.md`) และ copy gate F06 PASS รอบ 2 (`design/reviews/F06-copy-gate.md`) ทั้งคู่ไม่มีเงื่อนไข blocking เหลือฝั่งโค้ด งานนี้ยืนยันอิสระด้วยการรันจริงทุกชุด (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm run lint:config`, `pnpm run lint:copy`, client build, e2e เต็มสองโปรเจกต์ทั้ง `apps/client/e2e` และ `qa/tests/e2e`) ไม่ใช่แค่อ่านรายงานเดิม พบและแก้เอง 4 อย่างในไฟล์ของ QA เอง (ไม่ใช่ product bug): (1) root cause ของ e2e flake เดิม `f02-map-fixture-tile`/`f02-map-network-resilience` (`window.__kwSpike.state` ค้าง `idle`) — ขาด hook `e2eSkipOnboarding=1` หลัง P2-X38 เพิ่มเงื่อนไข consent ก่อนเริ่ม GPS provider ทำให้ provider ไม่เริ่มเลยตั้งแต่ต้น (deterministic ไม่ใช่ flake จริง) แก้แล้วยืนยันเขียว 18/18 รอบซ้ำ; (2) `clear-local-data-integration.test.ts` ไม่เคยส่ง `canClear` ที่ call site (R2-N2 ของ tech gate รอบ 2) เพิ่มแล้วพร้อมเคส `canClear: () => false`; (3) format เก่าของ `qa/tests/e2e/visual/image-utils.ts` ที่ทำให้ `pnpm lint` แดง; (4) N2-04 ของ copy gate รอบ 2 (ภาพ screenshot ที่ไม่ใช่ fixture ที่ commit แสดงข้อความสองสถานะพร้อมกัน) ยืนยันด้วยโค้ดจริงว่าเป็น jig ไม่ใช่บั๊ก เพิ่ม case ใหม่ 3 ไฟล์ (7 test unit + 4 test e2e × 2 project) ครอบ F06-C34 (`no_class`/`no_hp` ผ่าน `confirm` จริง), F06-C40 (3A tie-break ของ D-127), toast ≤ 2 บรรทัดบน `S-03-run` จริงที่ 360 px, และ `run_gps_status_changed`/`onboarding_first_reward_granted` ในไฟล์ export จริง ไม่พบ bug severity high ขึ้นไปใหม่ ไม่มี bug OPEN เหลืออยู่ใน `qa/bugs.md`

## 1. หลักฐานที่รันจริง

| คำสั่ง | ผล |
| --- | --- |
| `pnpm test` (root, vitest) | exit 0 · `Test Files 217 passed (217)` · `Tests 3065 passed \| 2 skipped (3067)` |
| `pnpm typecheck` (root + geo + shared + copy-lint + client) | exit 0 ทุกโปรเจกต์ |
| `pnpm exec eslint . --max-warnings=0` | exit 0 · 0 error 0 warning |
| `pnpm exec prettier --check .` | exit 0 · "All matched files use Prettier code style!" |
| `pnpm run lint:config` | exit 0 · `config-lint: 20 files, 0 errors, 2 warnings, 0 allowed, 0 stale` (2 warning เดิมของ `enhance`/`raid`) |
| `pnpm run lint:copy` | exit 0 · 0 FAIL, 21 WARN (ตัวแปร template ที่ไม่ถูกใช้ในเฟสถัดไป, มีมาก่อน) |
| `pnpm --filter @keep-walking/client build` | exit 0 |
| `pnpm exec tsx apps/client/scripts/measure-bundle.ts` | exit 0 · ภายในงบทั้งสองตัว |
| `pnpm exec playwright test` (ทั้ง `apps/client/e2e/` และ `qa/tests/e2e/`, android-chrome + ios-safari) | exit 0 · **92/92 passed** (1.7 นาที) |
| `pnpm exec playwright test qa/tests/e2e/f02-map-fixture-tile.spec.ts qa/tests/e2e/f02-map-network-resilience.spec.ts --repeat-each=3` | exit 0 · 18/18 (ยืนยันว่า fix ของ flake เดิมไม่ใช่โชค) |
| `pnpm exec playwright test qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts --repeat-each=3` | exit 0 · 6/6 |
| `pnpm exec playwright test qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts --repeat-each=3` | exit 0 · 6/6 |

รายละเอียดต่อ command และไฟล์ที่แก้อยู่ในหัวข้อ 4, 6

## 2. Phase Exit Checklist — E6, E8, E11, E16

| # | เกณฑ์ | หลักฐาน | สถานะ |
| --- | --- | --- | --- |
| E6 | เลเวลตรงโซนไม่ใช้ยาอยู่ได้ราว 45 นาทีตาม simulator (D-020: ถึง auto-retreat) | `packages/shared/src/hp/survival.test.ts` + `qa/tests/F06/survival-zone-level-no-potions.test.ts`: survival ≈ 44.4 นาทีที่เลเวลตรงโซน damage ×1.0 ไม่ใช้ยา · solo non-Tanker ≈ 27.8 นาที (D-020 ACCEPTED) · R43 (มัธยฐานถึง auto-retreat ≥ 2× `movementGate.window_s`) ผ่านใน sim ของ systems-designer (`balance-model.md` §18.3, ยืนยันค่าเป้าหมายแล้วก่อนงานนี้) · ระดับ 25 ตาม GDD เป็น vector อีกชุดที่ผ่านใน `vectors.test.ts` เช่นกัน (ทุก `damage.json`/`run-loop.json` vector เขียว) | **PASS** |
| E8 | ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก | หลักฐานหลักจาก design gate (P2-F06-T24, ยังไม่รันเพราะ deps รอ QA gate นี้ตามลำดับบอร์ด) · หลักฐานฝั่ง QA: checklist ต่อจอในแผนทดสอบ §3.1 (ผ่านระดับเอกสาร/wireframe ทุกจอ, ยืนยันแล้วก่อนงานนี้) + ยืนยันซ้ำกับ build จริงในงานนี้ผ่าน `apps/client/e2e/onboarding.spec.ts` (intro→age→consent→class→confirm→first reward ไม่มีทางไปหน้า U1–U8/ร้าน NPC) และ grep โค้ดจริง: ไม่มี route/handler ของ `unlocks.npcShop`, `statAllocation` UI, หรือปุ่มเปลี่ยน class ใน onboarding flow (`onboarding-flow.ts`, `f04-app.ts`) — grep ยืนยันเป็นส่วนเสริมของ QA เท่านั้น หลักฐาน**หลัก**ของ E8 ตามบอร์ดยังต้องรอ design gate P2-F06-T24 + product gate P2-F06-T25 ปิดคู่กันตามลำดับที่บอร์ดกำหนด (ไม่ใช่เงื่อนไขบล็อกของ QA gate นี้เอง) | **PASS (ฝั่ง QA)** — ส่วนที่เหลือรอ P2-F06-T24/T25 ตามลำดับบอร์ด |
| E11 | MockLocationProvider ใช้ได้เต็ม: เล่นทั้ง loop F04–F06 ด้วย trace ที่เลือกได้และเร่งได้ | `?trace=<id>&speed=1\|10\|60&loop=0\|1` ใช้จริงตลอดทั้ง `apps/client/e2e/*` และ `qa/tests/e2e/*` ของ F04/F05/F06 (ยืนยันซ้ำจาก F04-F05 gate + ของใหม่ในงานนี้: `f06-telemetry-export-gps-status.spec.ts` ที่ `speed=60`, `f06-toast-two-lines-real-run.spec.ts` ที่ `speed=60`) · loop เต็ม onboarding→class→confirm→run→HP/auto-retreat/death→export ครอบทุกจุดต่อในเทสต์เดียวได้จริง (`onboarding.spec.ts`, `f06-hp.spec.ts`, `full-run.spec.ts`) | **PASS** |
| E16 (ส่วน F06) | รางวัลก้อนแรกของ onboarding เป็น tick ปกติ · ยามาจาก drop ที่ผ่าน gate เท่านั้น | `qa/tests/F06/onboarding-first-reward-and-teach-lock.test.ts` + `apps/client/src/session/engine.test.ts` (F06-TG-02, engine ไม่มีสาขา onboarding) + `apps/client/e2e/telemetry-export.spec.ts`/`qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` (`onboarding_first_reward_granted` จริงในไฟล์ export) · grep `packages/shared/src/session/reducer.ts`: `bagAdd`/`player.inventory` เขียนได้เฉพาะจุดของ `grantTick` (tick ที่ผ่าน gate) และการโอนตอนจบ run เท่านั้น — ไม่มีทางอื่น | **PASS** |

## 3. Traceability — spec F06 acceptance 1–18 (`design/features/F06-hp-damage-onboarding.md` หัวข้อ 8)

รายละเอียดเต็มต่อ case (39+1 case, F06-C01–C40) อยู่ใน `qa/plans/F06-test-plan.md` หัวข้อ 3–5, 9, 9.1 (ทุกแถวพลิกเป็น `PASS` แล้วในงานนี้พร้อมไฟล์หลักฐาน) ตารางนี้สรุประดับ acceptance เท่านั้น

| # | acceptance (ย่อ) | หลักฐานสรุป | ผล |
| --- | --- | --- | --- |
| 1 | จังหวะการทอยตรง `intervalMin_s`–`intervalMax_s` · seed เดียวกันผลเดียวกัน · Grace/speed lock ไม่มีการทอย | `packages/shared/src/session/hp.test.ts`, `formulas/vectors.test.ts` (`run-loop.json`) | PASS |
| 2 | damage ตรง vector (สูตร, ห่างเลเวล compound ไม่มีเพดาน, เลเวลสูงกว่าไม่ลด) | `vectors.test.ts` (`damage.json`) | PASS |
| 3 | `resolveHit` 26 vector ผ่าน · เปิด auto-retreat ไม่มี trace จบ `death` | `vectors.test.ts` + `qa/tests/F06/hp-safety-auto-retreat-death-revive.test.ts` | PASS |
| 4 | survival vector D-020 (44.4 นาที / 27.8 นาที non-Tanker) | `hp/survival.test.ts`, `qa/tests/F06/survival-zone-level-no-potions.test.ts` | PASS |
| 5 | ยาอัตโนมัติ 1 ขวด/hit ตามลำดับ R12 · ยาชุบไม่ถูกดื่มอัตโนมัติ · ไม่มีทางอื่นเข้า inventory | `session/hp.test.ts` + code-search `reducer.ts` (`bagAdd` จุดเดียว) | PASS |
| 6 | แจ้ง HP ต่ำครั้งเดียวต่อการลงผ่านเส้น · auto-retreat สัญญาณเดียว · iOS เสียง+ภาพแทนสั่น | `hp-safety-auto-retreat-death-revive.test.ts` + `feedback/cue-feedback.ts`/`wake-lock-controller.ts` (feature detect) + **`qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts` ใหม่** (toast จริงบน S-03-run) | PASS |
| 7 | auto-retreat ปิดได้เฉพาะหน้าย่อยตั้งค่า · ไม่มี element ปิดบน run/พกกระเป๋า/onboarding · ป้ายค้าง · ลบข้อมูลกลับเป็นเปิด | `apps/client/e2e/f06-hp.spec.ts` (ปิดผ่าน S-22 จริง) + copy gate รอบ 2 (ป้ายค้าง `run.autoRetreatOffBadge`) | PASS |
| 8 | ตาย: ของหาย exp อยู่ ยา inventory เดิมอยู่ · Recovering 0→เป้าตามนาฬิกา (รวมแอปปิด) · ยาชุบ→เป้าทันทีนอก run | `hp-safety-auto-retreat-death-revive.test.ts`, `hp/regen.test.ts` | PASS |
| 9 | HP ไม่ฟื้นระหว่าง run (ยกเว้น Support) · ฟื้นหลังจบทุก exit_reason · นาฬิกาย้อนไม่ลด HP | `session/hp.test.ts`, `hp/regen.test.ts` | PASS |
| 10 | เลือก class ครั้งเดียวนาที 0–1 · ผลตรง R31 · โล่ Magic เฉพาะ tick ที่ผ่าน gate | `apps/client/e2e/onboarding.spec.ts` (sheet จริง) + `run-loop.json` vector (seed 5/9/11) | PASS |
| 11 | เลเวลขึ้นไม่มีทางไปหน้า stat · แต้มสะสมถูกต้อง | code-search `apps/client/src`: ไม่มี route/element อ่าน `statPointsUnspent` + design checklist §3.1 | PASS |
| 12 | onboarding ตามลำดับ intro→age→consent→permission→map→class · ต่ำกว่าเกณฑ์ไม่เก็บข้อมูล/ไม่ขอตำแหน่ง · รอยแยกแนะนำเปิดอยู่เสมอ | `onboarding.spec.ts` (ทั้ง happy path, underage block, decline) | PASS |
| 13 | รางวัลก้อนแรก = tick ปกติทุกประการ · engine ไม่มีสาขา onboarding | `onboarding-first-reward-and-teach-lock.test.ts`, `session/engine.test.ts` (F06-TG-02) | PASS |
| 14 | นาที 0–10 ไม่มีทางไปหน้า/copy U1–U8 และร้าน NPC | checklist §3.1 (เอกสาร) + `onboarding.spec.ts` (build จริง) | PASS |
| 15 | จอไกล/นอกพื้นที่/นอกย่านเปิดตัว/ไม่รู้ตำแหน่ง มีสิ่งให้ทำ · ลงทะเบียนไม่มีช่องพิมพ์ ไม่มีพิกัด ไม่มีรางวัล | `qa/tests/F06/s09-interest-register.test.ts`, `home-states-trace-replay.test.ts` | PASS |
| 16 | ไม่มีจำนวนคน/role/จำนวนลงทะเบียนบนจอใด | `telemetry-onboarding-events-and-no-counts.test.ts` (D-100 describe block) + checklist §3.1 | PASS |
| 17 | ทุกตัวเลขอ่านจาก config key (ไม่ hardcode) | `pnpm run lint:config` เขียว (หัวข้อ 1) | PASS |
| 18 | ถอน consent ระหว่าง run ไม่บล็อก · จบ `manual_exit` ของครบ · ไม่ไหล Grace/Suspended/timeout · หยุดขอตำแหน่งทันที | `apps/client/e2e/withdraw-consent.spec.ts` (จริงทั้งสอง project) | PASS |

## 4. รายการเฉพาะจาก board row ของ P2-F06-T21

| # | รายการ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| 1 | `no_class`/`no_hp` ผ่าน `confirm` จริง ไม่ใช่ preview | **PASS** | `packages/shared/src/session/hp.test.ts` ("confirm rejects no_class...") ยิง `sessionStep({type:'confirm'})` จริงสำหรับ `no_class` แต่ไม่เคยไปถึง `no_hp` จริง (ชื่อ test เขียนแค่ว่า "unreachable at full HP") — **ช่องว่างนี้ปิดในงานนี้**: `qa/tests/F06/confirm-rejects-no-class-no-hp.test.ts` (ใหม่, F06-C34, 3 test) ขับ `walkUntilRetreatOrDeath` จนตายจริง (HP=0) แล้วยิง `confirm` รอบสองผ่าน `sessionStep` สาธารณะโดยตรง ยืนยัน reason `no_hp` จริง ทั้งกรณีปกติและกรณีที่ dungeon ปลายทางปิดพร้อมกัน (พิสูจน์ลำดับ `no_hp` มาก่อน `dungeon_closed` ตาม `handleConfirm`'s comment เอง) — ต้องแก้ `qa/tests/F06/lib/walk-until.ts` เพิ่ม option `stepMs` (backward-compatible) เพื่อคุมช่องว่างนาฬิกาให้อยู่ในกรอบ `clockSkewTolerance_s` (5 วิ) ไม่งั้น regen HP นอก run ทำให้ HP ไม่เป็น 0 พอดีตอนยิง `confirm` ซ้ำ (root cause วิเคราะห์เต็มในหัวข้อ 6) |
| 2 | 3A เป้าหมายเดียว + tie-break (D-127) | **PASS** | `apps/client/src/dungeons/home-tracker.ts#buildDungeons` เขียน tie-break ไว้ตรงตาม spec (ระยะเท่ากัน→เปิดเร็วกว่า→`dungeon_id` น้อยกว่า) แต่ไม่มี dev test ตั้งชื่อ tie-break นี้ตรงๆ — เพิ่ม `qa/tests/F06/home-tracker-tie-break.test.ts` (ใหม่, F06-C40, 2 test) ขับ `HomeTracker` จริงด้วย geometry เดียวกันทุ probe bit เพื่อบังคับระยะเท่ากันจริง (ไม่ใช่ประมาณ) ยืนยันทั้งสองชั้น: เปิดเร็วกว่าชนะแม้ id มากกว่า, และเมื่อเวลาเปิดเท่ากันด้วย `dungeon_id` น้อยกว่าชนะ ทั้งสองทิศทางของลำดับ array อินพุต |
| 3 | ฟอร์มผู้สังเกตบันทึกการปิด auto-retreat และการหยุดพัก (Q-3, Q-5) | HUMAN | อยู่ใน `qa/playtest/phase-2-kit.md` (ไม่อยู่ใน `writes` ของงานนี้) — ตรวจแล้วว่าฟอร์มมีช่องนี้จริงจากงานก่อนหน้า (P2-F06-T18) ไม่ต้องแก้ในงานนี้ |
| 4 | `qa/tests/F06` link เป็น workspace member ยืนยันรันจาก root ได้ | **PASS** | `pnpm test` (root) วิ่งผ่าน `qa/tests/F06` ครบ 9 ไฟล์/38 test เป็นส่วนหนึ่งของ 217 ไฟล์ (P2-H36 ปิดแล้วก่อนหน้า, ยืนยันซ้ำในงานนี้) |
| 5 | ตรวจเคส pass แบบว่างเปล่าใน `qa/tests/e2e` แบบที่พบใน `f04-closed-dungeon` (vacuous-pass audit) | **PASS** | ตรวจทุกไฟล์ใน `qa/tests/e2e/*.spec.ts` (10 ไฟล์): กรณีเดิมที่เคยเป็น vacuous pass (`f04-closed-dungeon.spec.ts` ก่อนหน้าเข้าไม่ถึงหน้าจริงเพราะขาด `e2eSkipOnboarding`) ปิดไปแล้วก่อนงานนี้ (H38) และมี comment อธิบายไว้ตรงจุด · ตรวจซ้ำทุกไฟล์ว่ามี `e2eSkipOnboarding` หรือเหตุผลชัดเจนที่ไม่ต้องมี (`f04-web-hooks-no-effect.spec.ts` ตรวจ `loc=web` เอง จึงตรวจ `.nav-panel` ด้วย `toHaveCount` ไม่ใช่ visibility ซึ่งถูกต้องอยู่แล้วเพราะจงใจพิสูจน์ที่การ mount ไม่ใช่การมองเห็น) · ไม่พบ pattern อันตราย (`toBeGreaterThanOrEqual(0)`, loop ว่าง, catch ที่กลืน assertion) ในไฟล์ใดที่ QA เป็นเจ้าของ · **พบ 2 vacuous-pass จริงระหว่างงานนี้เอง** (item 6 ด้านล่าง) ซึ่งแก้ไปแล้ว |
| 6 | root cause ของ `qa/tests/e2e` flake `f02-map-fixture-tile`/`f02-map-network-resilience` (`window.__kwSpike.state` ค้าง `idle`) | **PASS (แก้แล้ว)** | Root cause: P2-X38 (`3b7e78c`, age gate/consent) เพิ่มเงื่อนไขใน `main.ts` ว่า `provider.start()` (Mock รวมถึง) จะไม่ถูกเรียกจนกว่า `kw.p2.consent.location === 'granted'` (จาก session ก่อนหน้า) หรือ hook `e2eSkipOnboarding=1` (Mock only, D-130) — สอง spec นี้เขียนก่อน X38 และไม่เคยมี hook นั้น จึง provider **ไม่เริ่มทำงานเลย** ทุกครั้งบน browser fresh context (deterministic 100%, ไม่ใช่การแข่งเวลาแบบ flake จริง — "flake" ที่ tech gate F06 รอบ 1/X41 สังเกตเห็นเพียง 3-4 ครั้งจาก 4 รอบ เป็นเพราะ CI/local เคยมี localStorage เก่าจาก test ก่อนหน้า (`reuseExistingServer` ไม่รีเซ็ต context ระหว่าง spec ในบาง config) ทำให้บางครั้ง "บังเอิญ" ผ่านเพราะ consent ค้างจากรันก่อน) เพิ่ม `params.set('e2eSkipOnboarding','1')` ในทั้งสองไฟล์ · ยืนยันเขียว 6/6 ครั้งแรก และ 18/18 เมื่อรัน `--repeat-each=3` |
| 7 | `clear-local-data-integration.test.ts` เพิ่ม `canClear` ที่ call site (A-P2-X41-2) | **PASS (แก้แล้ว)** | R2-N2 (tech gate F06 รอบ 2) รับแบบมีเงื่อนไขว่า QA ต้องส่ง `canClear` จริงแทนใช้ default "อนุญาตเสมอ" — เพิ่ม `canClear: () => true` ทั้งสอง call site เดิม และเคสใหม่ `canClear: () => false` ยืนยันเป็น true no-op (ไม่ลบ key, ไม่เขียน telemetry, ไม่ reload) |
| 8 | N2-05: วัด `.toast` ≤ 2 บรรทัดบน `S-03-run` จริงที่ 360 px | **PASS (ใหม่)** | `qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts` — ขับ fixture ระดับ-ห่างจริง (`e2e-f06-koa-run-01`, ranged เข้าดันเจี้ยนช่วง 10–20) ที่ viewport 360×740 จนเจอ `run.hpLow` จริงบน `S-03-run` แล้ววัด `getBoundingClientRect().height` เทียบ `line-height` จริง: ปัดเป็นจำนวนบรรทัด ≤ 2 ทุกครั้ง (ยืนยัน 6/6 รอบซ้ำ) พร้อมเช็คว่า toast ไม่ถูกบีบแคบกว่างบ `calc(100vw - 32px)` |
| 9 | N2-04: ภาพ home far-unknown อยู่สถานะไหน (`home-panel.ts:161` ล้าง body ใน `temporarilyClosed`) | **PASS (ยืนยันด้วยโค้ด ไม่ใช่ e2e ใหม่)** | อ่าน `home-panel.ts` ตรงๆ: `renderState` reset `nextOpenLine.hidden = true` ทุกครั้งที่ท้ายบนสุด แล้วแต่ละ branch (`unknown`/`out_of_area`/`temporarilyClosed`/`far`+`outside_launch_district`) return ก่อนถึงกัน — `temporarilyClosed` เคลียร์ `body.textContent = ''` และเปิด `nextOpenLine` เท่านั้น ส่วน `far`/`outside_launch_district` ตั้ง `body` เป็นระยะทางแต่ไม่แตะ `nextOpenLine` เลย (ยังเป็น `hidden=true` จาก reset ต้นฟังก์ชัน) — **ทั้งสองข้อความไม่มีทางแสดงพร้อมกันได้จริงในโค้ดปัจจุบัน** ยืนยันเพิ่มด้วย `apps/client/src/ui/home-panel.test.ts` (dev unit test ที่มีอยู่แล้ว, บรรทัด 92-97, ผ่านใน `pnpm test`) ที่ตรง C6-04 พอดี · สรุป: screenshot "08-home-far-unknown" ของ P2-X41 (ไฟล์ scratchpad ที่ไม่ได้ commit เข้า repo) ต้องเป็นภาพจาก jig ที่ประกอบสองสถานะเข้าด้วยกันเพื่อรีวิว ไม่ใช่สถานะที่ผู้เล่นเจอได้จริง — ไม่มีบั๊ก ไม่ต้องแก้โค้ด |
| 10 | `onboarding_first_reward_granted` และ `run_gps_status_changed` ปรากฏในไฟล์ export จริงจากปุ่ม export ใหม่ | **PASS** | `onboarding_first_reward_granted`: `apps/client/e2e/telemetry-export.spec.ts` (ของ gameplay-programmer, P2-X50) มีอยู่แล้วและเขียว · `run_gps_status_changed`: spec เดิมมีคอมเมนต์ว่า "ไม่มี call site เลย" ซึ่ง**เป็นข้อมูลเก่า** (P2-X48 เพิ่ม `wireGpsStatusTelemetry` ใน `main.ts` แล้วในคอมมิตเดียวกัน) แต่ event นี้ยิงเฉพาะตอนสถานะ GPS เป็นปัญหาจริง (`none → null`, ไม่มี event) — fixture ปกติของสเปคนั้นไม่เคยกระตุ้นมันเลย **เพิ่ม `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` (ใหม่)**: บังคับ `context.setOffline(true/false)` จริงกลาง run แล้ว export จริงผ่าน `.settings-menu-export` ยืนยัน `run_gps_status_changed` (`offline`→`restored`, `context: 'run'`) และ `onboarding_first_reward_granted` ทั้งคู่อยู่ในไฟล์ JSONL จริง ไม่มีพิกัด/accuracy หลุด (6/6 รอบซ้ำ) |

## 5. New consent/priming/age-gate flow — black-box (ครบตามที่ต้องตรวจ)

ทุกจอจริง (ไม่ใช่ wireframe) ผ่าน `apps/client/e2e/onboarding.spec.ts` และ `apps/client/e2e/withdraw-consent.spec.ts` (เขียวทั้งสอง project ในหัวข้อ 1):

| เส้นทาง | หลักฐาน | ผล |
| --- | --- | --- |
| age gate ปกติ (ผ่านเกณฑ์) → consent → permission → map → class → confirm → tick แรก | `onboarding.spec.ts` case แรก | PASS |
| age gate: ปีเกิดต่ำกว่าเกณฑ์บล็อก ไม่มีจอ consent ไม่เก็บข้อมูล · ปุ่มเดียวกลับให้ลองใหม่ | `onboarding.spec.ts` "age gate: an under-min birth year blocks..." | PASS |
| consent ตำแหน่ง: ปฏิเสธ → ไม่เริ่ม GPS แต่ยังเลือก class และเห็นแผนที่ได้ (R48) | `onboarding.spec.ts` "declining consent never starts GPS but still reaches class select" | PASS |
| ถอน consent ระหว่าง run → `manual_exit` ทันที ของครบทุกชิ้น เขียน `withdrawn` ลบ sample พิกัด | `withdraw-consent.spec.ts` case แรก | PASS |
| ถอน consent ตอนไม่มี run → ไปจอไม่รู้ตำแหน่งทันที ไม่มี popup บรรทัดเสริม | `withdraw-consent.spec.ts` case ที่สอง | PASS |

ไฟล์ทั้งสองเป็นของ gameplay-programmer (`apps/client/e2e/`, ไม่แก้ตาม protocol "ห้ามแก้ unit/e2e test ของ dev") — งานนี้ตรวจสอบและยืนยันซ้ำอิสระว่าเขียวจริงเท่านั้น ไม่ใช่การเขียนใหม่

## 6. เช็กลิสต์มาตรฐานของ qa-tester (agent file)

| หัวข้อ | ผล | หมายเหตุขอบเขต F06 |
| --- | --- | --- |
| Movement gate: นิ่ง 0 tick, jitter ยังได้ tick, 50 ม. พอดี, gate เดียวกันในการตี | PASS | F04/F05 gate ยืนยันไว้แล้ว (PASS) · F06 เพิ่มว่า **การตีเองไม่ผ่าน movement gate เลย** (F06-R06/R07: จังหวะตีอิงเวลา Active-not-locked ไม่อิงระยะ) — ไม่ใช่ข้อขัดแย้ง เพราะ "gate เดียว" (NN-2) หมายถึง**รางวัล**ทุกก้อน (tick/ยา) ต้องผ่าน gate เดียวกัน ไม่ใช่การตี ยืนยันด้วย code-search: `bagAdd` มีจุดเดียว (`grantTick`) |
| Presence: เลียบขอบ+drift, Grace 2:59/3:01, Suspended 14:59/15:01, polygon ซ้อน, ปิดกลาง run, emergency close | PASS (เท่าที่อยู่ใน scope, เหมือน F04/F05 gate) | ใช้ engine เดียวกับ F04 ไม่มีการเปลี่ยนแปลงจาก F06 · Grace ระหว่างนั้นไม่มีการตี (H-E1, ยืนยันใน `session/hp.test.ts`) |
| Resilience: เน็ตหลุด (รางวัลเฉพาะนาทีที่พิสูจน์ได้), offline evidence 29/31 นาที, แอปถูกปิด/กลับมา, accuracy แย่ตอน check-in | PASS เท่าที่อยู่ใน scope | Phase 2 ไม่มี server (out-of-scope offline evidence ย้อนหลัง เหมือน F04/F05 gate) · แอปปิดขณะ HP ต่ำ: `hp/regen.test.ts` ยืนยันนาฬิกาถอยไม่ลด HP และคิดเวลาข้ามแอปปิดจริง (F06-R04) · **เน็ตหลุดจริงใหม่ในงานนี้:** `f06-telemetry-export-gps-status.spec.ts` ยืนยันว่าเน็ตหลุดจริงไม่กระทบ HP/run state เลย (ไม่มี server ผูกกับ HP) |
| Server authority: payload ที่แก้แล้ว, batch ซ้ำ, นาฬิกาเพี้ยน ไม่เปลี่ยนรางวัล | PASS เท่าที่ Phase 2 มี | เหมือน F04/F05 gate — Phase 2 ไม่มี server จริง (D-087) ตรวจได้แค่ความ pure ของ `sessionStep` (ไม่มี `Date.now`/`Math.random` ใน `hp`/`session`, ยืนยันด้วย lint `IMPURE_*` ในtech gate) และ `clock_invalid` (`clockCheck`) |
| Formulas: ทุก vector ใน `design/systems/test-vectors/` ผ่านโค้ดจริง | PASS | `packages/shared/src/formulas/vectors.test.ts` ค้นทุกไฟล์ `*.json` แบบ dynamic รวม `damage.json`, `run-loop.json`, `hp-recovery.json` (ใหม่, tech gate F06-TG-14) — ไม่มี vector ใดแดง |
| Privacy: ไม่มีพิกัด/ชื่อรายบุคคลให้ผู้เล่นอื่นเห็น, ไม่มี PII ใน log | PASS | หัวข้อ 7 (storage) + `telemetry-onboarding-events-and-no-counts.test.ts` (D-100: ไม่มีจำนวนคน/role บนจอใด) · `f06-telemetry-export-gps-status.spec.ts`/`telemetry-export.spec.ts` ยืนยันไฟล์ export จริงไม่มีพิกัด |
| Copy: สุ่มตรวจกฎ 6 ข้อ, grep ไม่มี Thai string hardcode ในโค้ด | PASS | copy gate F06 รอบ 2 PASS (`design/reviews/F06-copy-gate.md`) · `qa/tests/F02/privacy-copy.test.ts` (TC-COPY-01) กวาดทุกไฟล์ `apps/client/src/**/*.ts` แบบ dynamic (ตัดคอมเมนต์ก่อนตรวจ) เขียวเป็นส่วนหนึ่งของ `pnpm test` |

## 7. Storage หลังจบ run ไม่มีพิกัด (GD B-08)

| ไฟล์ | ตรวจอะไร | ผล |
| --- | --- | --- |
| `qa/tests/F04/session-persist-privacy.test.ts`, `qa/tests/F05/run-summary-and-storage-privacy.test.ts` | `toPersisted` ระหว่าง run และหลัง run จบ ไม่มี key พิกัด/accuracy และไม่มีเลขรูปพิกัดไทยหลุด — ยืนยันซ้ำแล้วใน F04/F05 gate, ไม่มีการเปลี่ยนแปลงจาก F06 (HP state ไม่มีฟิลด์พิกัดเลยตาม `PlayerHpState`/`RunState.hp` ที่อ่านโค้ดจริงในงานนี้: มีแค่ `value`, `anchorAt_ms`, `recovering`) | PASS |
| `qa/tests/F06/clear-local-data-integration.test.ts` | ลบข้อมูลในเครื่องแล้วทุก key `kw.p2.*` หายจริง (session, onboarding, consent, interest) telemetry buffer เหลือแค่ `local_data_cleared` ไม่มีพิกัด · key อื่นที่ไม่ใช่ของเกมยังอยู่ (ไม่ใช่ wipe ทั้ง storage) | PASS |
| `apps/client/e2e/withdraw-consent.spec.ts` | หลังถอน consent กลาง run, `kw.p2.session` ไม่มี sample พิกัดค้าง | PASS |
| `qa/tests/F06/s09-interest-register.test.ts` | ลงทะเบียนความสนใจเก็บแค่ `scope`+`areaId` จากรายการ ไม่มีช่องพิมพ์อิสระ ไม่มีพิกัด | PASS |
| `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts`, `apps/client/e2e/telemetry-export.spec.ts` | ไฟล์ export จริงที่ผู้เล่น (playtest) ดาวน์โหลดได้เอง ไม่มีพิกัด/accuracy ในทุก property รวม `run_gps_status_changed` | PASS |

## 8. `qa/bugs.md` — สรุปหลังงานนี้

- **verdict: PASS** — ไม่มี bug severity high ขึ้นไปที่ OPEN เหลืออยู่ในไฟล์ทั้งหมด (F01–F06)
- ไม่พบ bug ใหม่ระดับ product code จากงานนี้
- พบและแก้เองในไฟล์ทดสอบที่ QA เป็นเจ้าของ 4 จุด (บันทึกในสรุปรวมของ `qa/bugs.md` ไม่เปิดรายการใหม่ ตามหลักการเดียวกับ P2-F05-T16): root-cause flake ของ `f02-map-fixture-tile`/`f02-map-network-resilience`, `canClear` ไม่ถูกส่งใน `clear-local-data-integration.test.ts`, format เก่าของ `qa/tests/e2e/visual/image-utils.ts`, และการยืนยัน (ไม่ใช่บั๊ก) ของ N2-04

## 9. Findings / handoffs

- **ไม่มี handoff blocking**
- **handoff → level-designer (blocking: no):** เลือก dungeon นำร่อง 1 แห่งที่ `level_range.min > 1` เปิดอยู่ในช่วง D-093 สำหรับ F06-C32 (การเดินของทีมจริง, `qa/plans/F06-test-plan.md` หัวข้อ 8) — สคริปต์พร้อมแล้ว ตอนนี้ไม่มีอะไรบล็อกทางโค้ดอีกต่อไป เหลือแค่ข้อมูล dungeon
- **handoff → HUMAN (blocking: no, ไม่บล็อก verdict นี้):** F06-C32 (การเดินของทีมจริงบนอุปกรณ์จริง) ยังต้องนัดคนเดินหลังได้ dungeon จาก level-designer — เป็น field-test แยกตามนิยาม role นี้ ไม่ใช่เงื่อนไขของ QA gate
- **ไม่มี decision ใหม่ที่ต้องเสนอ** — decision ที่เกี่ยวข้อง (D-127 tie-break, D-089 ยาจาก drop, manual_exit สำหรับถอน consent) ถูกตัดสินและบันทึกไปแล้วก่อนงานนี้ งานนี้เพียงยืนยันด้วยโค้ดจริง

## 10. Verdict

**PASS** — เหตุผล:

1. ทุก acceptance criterion ของ spec F06 (18 ข้อ, หัวข้อ 3) มีหลักฐานทดสอบจริงที่เขียว ไม่มีข้อใดเหลือ PENDING
2. Phase Exit Checklist E6, E8 (ฝั่ง QA), E11, E16 ส่วน F06 ผ่านครบ (หัวข้อ 2)
3. รายการเฉพาะทั้ง 10 ข้อจาก board row ของงานนี้ปิดครบ รวมช่องว่างจริง 2 จุดที่พบและปิดเอง (`no_class`/`no_hp` ผ่าน `confirm` จริง, 3A tie-break) และ evidence ใหม่ 2 จุด (toast 2 บรรทัดจริง, `run_gps_status_changed` ในไฟล์ export จริง) (หัวข้อ 4)
4. consent/priming/age-gate/withdraw ครบตามเส้นทางที่ต้องมี black-box (หัวข้อ 5)
5. เช็กลิสต์มาตรฐานของ role ผ่านครบเท่าที่อยู่ใน scope ของ Phase 2 (หัวข้อ 6)
6. Storage/telemetry ไม่มีพิกัดหลังจบ run และหลังลบข้อมูล (หัวข้อ 7)
7. Full regression: root `pnpm test` (217 ไฟล์/3065 test), typecheck, lint, config-lint, copy-lint, build, e2e ทั้งสอง project (92/92) เขียวทั้งหมด ไม่มีข้อแดงเหลืออยู่เลย
8. ไม่มี bug severity high ขึ้นไปที่ OPEN (หัวข้อ 8)
9. Regression F04/F05: ทุก spec ของ F04/F05 (`qa/tests/F04`, `qa/tests/F05`, e2e ที่เกี่ยวข้อง) ยังเขียวเป็นส่วนหนึ่งของการรันเต็มในงานนี้ ไม่มีการถดถอย

ไม่มีเงื่อนไขใดเหลือให้ orchestrator เปิดงาน X ก่อนเดินหน้าไปยัง design gate (P2-F06-T24) และ product gate (P2-F06-T25) ตามลำดับบอร์ด
