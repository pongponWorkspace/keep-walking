# F06 — HP, Damage และ 10 นาทีแรก: Test Plan

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F06-T11 (เขียนแผน) · P2-F06-T17 (black-box, 2026-09-28) · **P2-F06-T21 (QA gate F06, 2026-09-28 — สถานะทุก case พลิกเป็น PASS ในหัวข้อ 3–5, 9, 9.1, 10)** · เจ้าของ: qa-tester |
| อ้างอิง spec | `design/features/F06-hp-damage-onboarding.md` (R01–R58, ตาราง 3.8, H1–H6, H-E1–H-E24, acceptance 1–17, คำตัดสิน 1–10) |
| อ้างอิง tech note | `docs/tech/F06-hp-damage-onboarding.md` §2–8 (state/API), §9 (สถานะที่บ้าน), §10 (telemetry), §11 (`PresenceStrategy`), §12 (FH-01..16), §13.1–13.4 (vector/engine test/client hook), §14 (สมมติฐาน) |
| อ้างอิง flow | `design/ux/flows/F06-hp-damage-onboarding.md` (post-X11, ผ่านรอบ 2) + `design/reviews/F05-F06-flow-approval.md` (verdict PASS, K-1..K-11, B-01..B-06, R2-F1..F5) |
| อ้างอิง decision | D-020, D-038 B, D-078 (R-B1), D-089, D-096, D-100, D-112, D-114, D-116, D-118 (J-P2-T30-1..4) |
| GDD (read-only) | "HP การตาย และการฟื้นฟู", "10 นาทีแรกของคนใหม่" (รายการต้องห้าม บรรทัด 321), "Class และ Party" |
| Exit checklist ที่ผูก | E6 (~45 นาทีถึง auto-retreat), E7 (copy สามจังหวะผ่าน content gate), E8 (ไม่สอนสิ่งต้องห้าม), E16 ส่วน F06 (ยาจาก drop เท่านั้น, ยาไม่มีทางอื่นเข้า inventory) |
| คู่กับ | `qa/plans/F04-test-plan.md` (run state, presence), `qa/plans/F05-test-plan.md` (tick, ที่มาของยา, R-B1 อ้างมาที่นี่), P1-F02-T13 → `qa/plans/F02-test-plan.md` §4.3 (TC-HUD-*, งานนี้ปิด TC-HUD-03..12) |
| ก่อนหน้า | P1-F02-T13 "qa TC-HUD-03..12 หลัง HUD เสร็จ" ถูกยกมาเป็นงานนี้ (board หัวข้อ 1.9) |

## 0. สถานะโค้ดที่ทดสอบได้จริง (ตามแบบ `qa/plans/F05-test-plan.md` §0)

**`packages/shared/src/hp/`, client F06 (`apps/client` ส่วน HP bar/onboarding/จอที่บ้าน/ตั้งค่า) — ยังไม่มีโค้ด** ณ วันที่เขียนแผนนี้: P2-F06-T06 (backend-programmer, HP engine), P2-F06-T08/T09/T10 (gameplay-programmer, client) ทั้งหมดสถานะ `TODO` บน board ยังไม่เริ่ม งานนี้จึงตั้งใจ **ไม่ผูก** case อัตโนมัติกับโค้ดที่ยังไม่มี (จะ import แล้วพังทันที) เหมือนที่ `F05-test-plan.md` ทำกับ `src/reward` ตอนยังไม่นิ่ง

สามทางที่ทำได้ตอนนี้ และสิ่งที่ต้องรอ:

1. **Vector ของ systems-designer** (`design/systems/test-vectors/damage.json`, `run-loop.json` รวม `resolveHit`/`hitAttempt`/`soloDamage`/`runLoop`/`runLoopStats` และ survival D-020) ผ่าน `packages/shared/src/formulas/vectors.test.ts` แบบ dynamic — **พร้อมอยู่แล้วสำหรับส่วนที่ไม่ต้องมี `src/hp`** (เช่น `damagePerHit`, `survivalMinutes` ใน `formulas`) แต่ `resolveHit`, `hitAttempt`, `soloHitDamage`, `runLoop` ที่ประกอบระดับ `hp` ยังอยู่ใน `SKIP_FNS` ของ dispatcher จนกว่า P2-F06-T06 จะเพิ่มตัวจริง (tech note §13.1) — งานนี้บันทึกเป็น PENDING พร้อมจำนวน vector ที่ต้องผ่าน ไม่ใช่ไปเขียน `src/hp` เอง (นอก `writes`)
2. **engine test 13.3 (16 ข้อ) และ client hook 13.4** เป็นสัญญาที่ backend-programmer/gameplay-programmer ต้องทำตาม — งานนี้แปลงเป็น traceability (หัวข้อ 4–6) ให้ P2-F06-T17/T21 (black-box F06 และ QA gate F06) ตรวจต่อว่าตรงสัญญาจริง ไม่ใช่เขียนใหม่
3. **สิ่งที่ทำได้เต็มรูปวันนี้โดยไม่รอ engine/client**: TC-HUD-03..12 ของ debug HUD (มีโค้ดจริงจาก P2-F04-T10 แล้ว, หัวข้อ 7), checklist "ไม่สอนสิ่งต้องห้าม" ต่อจอเทียบกับ flow F06 + wireframe ที่ผ่าน design gate รอบ 2 แล้ว (หัวข้อ 3), traceability ครบทุก acceptance/edge/failure-mode เป็นเอกสาร (หัวข้อ 4–6), สคริปต์การเดินของทีม (P-3.4, หัวข้อ 8)

เมื่อ P2-F06-T06/T08/T09/T10 DONE งาน P2-F06-T17 (black-box F06, qa-tester เช่นกัน) ต่อยอดแผนนี้เป็น trace-replay ผ่าน Mock/`sessionStep`/UI จริง — ทุกแถวที่ทำเครื่องหมาย PENDING ในหัวข้อ 4–6 ระบุไว้แล้วว่ารอใคร

## 1. ค่า config ที่ทุก case อ้างอิง (อ่านสดจาก config เสมอ ไม่ hardcode ในเทสต์)

| key | ค่า (อธิบาย ไม่ผูกโค้ด) | ใช้ใน |
| --- | --- | --- |
| `dungeons.hpSafety.autoRetreatThreshold_pct` / `lowHpWarningThreshold_pct` | 25 / 30 | acceptance 6, 7 · H1, H2 |
| `economy.autoPotion.defaultThreshold_pct` / `sourceOrder` / `defaultPotionOrder` | < 40 / runBag→inventory / hpSmall→hpMedium→hpLarge | acceptance 5 · R12, H-E14 |
| `progression.hpRecovery.deathRecoveryTo_pct` / `deathRecoveryDuration_s` / `outsideDungeonRegen_pctMaxHpPerMin` | 50 / 1,800 / 1.6667 | acceptance 8, 9 · R25 |
| `progression.statPerPoint.vitPotionEfficiency_pct` | 1%/แต้ม (D-038 B) | acceptance 5 |
| `combat.attackCheck.intervalMin_s/intervalMax_s/hitChancePerCheck_pct` | ตาม `combat.json` | acceptance 1, 2 |
| `combat.levelGapDamage.mode/maxMult` | `compound` / `null` (ไม่มีเพดาน) | acceptance 2 · H-E6 |
| `combat.monsterAttack.zoneLevelFrom` | `playerLevelClampedToRange` (D-112) | acceptance 2 |
| `unlocks.home.farDungeonThreshold_m` | ≤ 1,900 ม. (D-079) | acceptance 12, 15 · R37, K-11 |
| `privacy.minAge_yr` / `minAgeComparison` | ตาม `privacy.json` | acceptance 12 · R45 |
| `dungeons.movementGate.window_s` | 300 (อ้างจาก F05) | acceptance 4, 13 (tick ก่อน hit) |

## 2. คลัง vector / trace ที่ใช้

### 2.1 Vector ของ systems-designer (อ่านอย่างเดียว)

| ไฟล์ | ใช้พิสูจน์อะไรใน F06 | สถานะรันผ่าน engine จริง |
| --- | --- | --- |
| `damage.json` (`resolveHit` 26 ข้อ) | R-B1 ทั้งลำดับ: shield → floor HP 1 (auto-retreat) → auto-potion → ตรวจ auto-retreat → เตือน 30% → ตาย (D-078) | **PASS** — `packages/shared/src/formulas/vectors.test.ts` (P2-F06-T21) |
| `damage.json` (`damagePerHit`, `survivalMinutes`) | acceptance 2, 4 | **PASS** — ผ่านใน `formulas` |
| `run-loop.json` (`hitAttempt`, `soloDamage`, `runLoop`, `runLoopStats`) | acceptance 1, 2, 3, 10 | **PASS** — `vectors.test.ts` (P2-F06-T21) |
| survival D-020 (engine, Monte Carlo 2,000 seed) | acceptance 4 (44.4 นาที Tanker/ครอบเลเวล, 27.8 นาที non-Tanker) | **PASS** — `packages/shared/src/hp/survival.test.ts` (P2-F06-T21) |
| `hp-recovery.json` (เสนอใหม่, tech note 13.5) | acceptance 8, 9 (ฟื้น 0→50% ที่ 1,800 วิ) | **PASS** — มีแล้ว (tech gate F06 รอบ 2 F06-TG-14 ปิด, H47+X45) อ่านใน `vectors.test.ts` (P2-F06-T21) |
| `run-loop.json` เพิ่ม `pauses` (เสนอ, 13.5) | ยืนยัน "นับต่อ ไม่รีเซ็ต" ระดับ vector | **PASS** — engine test ครอบแทน (`hp/regen.test.ts`, `session/hp.test.ts`, tech gate F06-TG-14) |
| `run-state.json` [32]–[35] (edge-band hysteresis, J-9/P2-X13) | หัวข้อ 9 ของแผนนี้ (พฤติกรรมที่รู้แล้ว ไม่ใช่บั๊ก) | ผ่านแล้วใน `packages/shared/src/run` (P2-F04-T20) |
| `run-state.json` [36]–[43] (J-P2-T30-4, no_evidence กลับ Active) | หัวข้อ 9.2 | **PASS** — P2-X17 ส่งแล้ว (board DONE) อ่านใน `vectors.test.ts` (P2-F06-T21) |

### 2.2 ของ location-engineer / QA (F04/F05 อ้างใช้ซ้ำ)

`synthetic-edge-walk-01` (edge-band hysteresis), `synthetic-park-loop-01` (run ยาวไม่มีการตีชนกัน), `synthetic-bench-jitter-01`/`synthetic-table-still-01` (ไม่เกี่ยวกับ HP โดยตรง แต่ยืนยันว่านาฬิกาการตีหยุดเมื่อ gate ไม่ผ่านจริง — ใช้ร่วมกับ engine test 13.3 ข้อ 6 เมื่อมี `src/hp`)

## 3. Traceability: spec F06 acceptance 1–17 (หัวข้อ 8 ของ spec) → case

**อัพเดต P2-F06-T21 (2026-09-28):** `src/hp` (P2-F06-T06), client F06 (P2-F06-T08/T09/T10) DONE ทั้งหมด · tech gate F06 PASS รอบ 2 (`docs/reviews/F06-tech-gate.md`) · ทุกแถวที่พลิกเป็น `PASS` ยืนยันซ้ำอิสระในงานนี้ผ่าน `pnpm test` (216 ไฟล์/3063 test, 0 แดง) + `pnpm exec playwright test` (92/92 ทั้งสอง project) — คอลัมน์ "หลักฐาน / รอ" ที่เหลือคำว่า "รอ ..."/"ยังไม่มี" เป็นข้อความประวัติศาสตร์ตอนเขียนแผน (ก่อนโค้ดมี) ไม่ใช่สถานะปัจจุบัน รายละเอียดหลักฐานเต็มอยู่ใน `qa/reports/F06-qa-gate.md` หัวข้อ 3–4

| # | ข้อความ acceptance (ย่อ) | case id | ระดับ | สถานะ | หลักฐาน / รอ (ข้อความ "รอ" เป็นบันทึกประวัติ ดูอัพเดตด้านบน) |
| --- | --- | --- | --- | --- | --- |
| 1 | ช่วงห่างการทอยอยู่ใน `intervalMin_s`–`intervalMax_s` ทุกครั้ง · seed เดียวกันให้ลำดับ hit เดียวกัน · Grace 2 นาทีไม่มีการทอยแล้วเดินต่อ · speed lock ไม่มีการทอย | F06-C01 | Vector (`run-loop.json` `hitAttempt`) + engine test 13.3#1,#2 | PASS | `packages/shared/src/session/hp.test.ts` (Grace pause: no run_hit during the gap, hit clock resumes) + `packages/shared/src/formulas/vectors.test.ts` (run-loop.json) เขียวใน `pnpm test` (P2-F06-T21) |
| 2 | damage ตรง vector `damage.json` (สูตร, ห่างเลเวล compound ไม่มีเพดาน, เลเวลสูงกว่าช่วงไม่ลด) · เปลี่ยน `combat.json` แล้วผลเปลี่ยนตาม | F06-C02 | Vector (`damagePerHit` ผ่านแล้วใน `formulas`) + engine test 13.3#16 | PASS (P2-F06-T21) บางส่วน | `damagePerHit`/`survivalMinutes` ผ่านแล้ว (`packages/shared/src/formulas/vectors.test.ts`) · `soloHitDamage`/config-change-propagates ต้องรอ `src/hp` |
| 3 | `resolveHit` ทั้ง 26 vector ผ่าน · เปิด auto-retreat ไม่มี trace ใดจบ `death` | F06-C03 | Vector (`damage.json` `resolveHit`) + engine test 13.3#6 (fuzz 500 seed) | PASS | `resolveHit` 26 vector เขียวใน `vectors.test.ts` · `qa/tests/F06/hp-safety-auto-retreat-death-revive.test.ts` ยืนยัน auto-retreat เปิดไม่มี trace จบ `death` (P2-F06-T21) |
| 4 | vector survival: เลเวลตรงโซน ≈ 44.4 นาที · solo non-Tanker ≈ 27.8 นาที (D-020) · R43 ผ่าน | F06-C04 | Vector (survival D-020, Monte Carlo) | PASS | `packages/shared/src/hp/survival.test.ts` + `qa/tests/F06/survival-zone-level-no-potions.test.ts` เขียว (P2-F06-T21) |
| 5 | ยาอัตโนมัติ 1 ขวด/hit ตาม R12 (ถุงของ run ก่อน, ลำดับชนิด, heal รวม VIT) · ยาชุบไม่ถูกดื่มอัตโนมัติ · ไม่มียาเข้า inventory ทางอื่นนอก tick ที่ผ่าน gate | F06-C05 | Vector + engine test 13.3#11 + code-search (7.3) | PASS (P2-F06-T21) | รอ `src/hp` · code-search (`player.inventory` เขียนได้ 3 จุดเท่านั้น) ทำได้ทันทีที่ P2-F06-T06 DONE โดยไม่ต้องรอ client |
| 6 | แจ้ง HP ต่ำครั้งเดียวต่อการลงผ่านเส้น ไม่เกิดตอนตาย · auto-retreat ได้สัญญาณเดียว · iOS มีเสียง+ภาพแทนสั่น | F06-C06 | Engine test 13.3#12 + client hook (F06 flow C2, C4) | PASS (P2-F06-T21) | engine รอ T06 · client (fire-together) รอ T08 · ข้อความ canon อ้าง flow F06 C2/C4 (ผ่าน design gate รอบ 2 แล้ว) |
| 7 | auto-retreat ปิดได้เฉพาะหน้าย่อยตั้งค่า · ไม่มี element ปิดบนจอ run/พกกระเป๋า/onboarding · ป้ายค้างขณะปิด · ลบข้อมูลในเครื่องกลับเป็นเปิด | F06-C07 | Client (flow F06 Flow D) + code-search (call site เดียว, tech note 5.2) | PASS (P2-F06-T21) | รอ T08/T09 · checklist ต่อจอทำได้แล้วกับ wireframe (หัวข้อ 3 นี้ทับซ้อนกับหัวข้อ checklist §... ดู §3.1) |
| 8 | ตาย: ของใน run หาย exp อยู่ ยา inventory ที่ไม่ได้ใช้อยู่ · Recovering 0→`deathRecoveryTo_pct` ตามนาฬิกา (รวมแอปปิด) · ยาชุบ→`reviveToHp_pct` ทันทีนอก run | F06-C08 | Vector/engine test 13.3#8,#9,#11 | PASS (P2-F06-T21) | รอ `src/hp` |
| 9 | HP ไม่ฟื้นระหว่าง run (ยกเว้น Support) · ฟื้นหลังจบทุก exit_reason · นาฬิกาย้อนไม่ทำ HP ลด | F06-C09 | Engine test 13.3#5,#10 | PASS (P2-F06-T21) | รอ `src/hp` |
| 10 | เลือก class ครั้งเดียวนาที 0–1 บน sheet ไม่มีค่าเลือกให้ · ผลตรง R31 ใน vector · โล่ Magic เฉพาะ tick ที่ผ่าน gate | F06-C10 | Vector (`run-loop.json` seed 5/9/11) + engine test 13.3#12,#13 + client (Flow B) | PASS (P2-F06-T21) | รอ `src/hp` (vector) + T08/T09 (sheet UI) |
| 11 | เลเวลขึ้นไม่มีทางไปหน้า stat · แต้มสะสมถูกต้องตาม `statPoints` ไม่มีจอเอ่ยถึง | F06-C11 | Code-search (`apps/client` ไม่อ่าน `statPointsUnspent`) + design checklist | PASS (P2-F06-T21) (code-search) / DONE (design checklist, §3.1) | code-search รอ T08-10 มีโค้ดให้ grep |
| 12 | onboarding ตามตาราง 3.8 ลำดับ intro→age→consent→permission→map→class · ต่ำกว่าเกณฑ์อายุไม่เก็บข้อมูล/ไม่ขอตำแหน่ง · ไม่มี login · รอยแยกแนะนำเปิดอยู่เสมอ (K-11) | F06-C12 | Client (flow F06 Flow A, G) + engine test 13.3#13 | PASS (P2-F06-T21) | รอ T09/T10 · ลำดับผ่าน design gate รอบ 2 แล้ว (K-1, K-11) |
| 13 | รางวัลก้อนแรก = tick ปกติทุกประการ (vector เทียบ tick แรก/ที่สอง seed เดียวกัน) · engine ไม่มีสาขา onboarding | F06-C13 | Vector/engine test 13.3#14 + code-search (`lifetimeTicksGranted` ไม่ถูกอ่านใน `reward`/`hp`) | PASS (P2-F06-T21) | รอ `src/hp` |
| 14 | นาที 0–10 ไม่มีทางไปหน้า/copy ของ U1–U8 และร้าน NPC | F06-C14 | Design checklist (ต่อจอ) + client (รอ build) | **DONE (checklist ต่อจอกับ flow/wireframe, §3.1)** / PASS (P2-F06-T21) (ยืนยันกับ build จริงใน P2-F06-T21) |
| 15 | จอไกล/นอกพื้นที่/นอกย่านเปิดตัว/ไม่รู้ตำแหน่ง มีสิ่งให้ทำตาม R51–R52 · ลงทะเบียนไม่มีช่องพิมพ์ ไม่มีพิกัดใน storage ไม่มีรางวัล | F06-C15 | Client (flow F06 Flow F, `home-state.ts`) + storage grep | PASS (P2-F06-T21) | รอ T09 · โครงผ่าน design gate รอบ 2 (B-03, B-04, B-05) |
| 16 | ไม่มีจำนวนคน/role/จำนวนลงทะเบียน (รวม 0 และ placeholder) บนจอใด | F06-C16 | Design checklist + client grep (`home.outOfAreaCount` ไม่ถูก import) | **DONE (checklist, §3.1)** / PASS (P2-F06-T21) (grep build) |
| 17 | ทุกตัวเลขอ่านจาก config key หัวข้อ 9 ของ spec (ไม่ hardcode) | F06-C17 | `tools/config-lint` (schema มีอยู่แล้ว, P2-F04-T24) + code-search ตอน T06/T08 DONE | PASS (P2-F06-T21) | schema พร้อม แต่ยังไม่มีโค้ดให้ lint |

### 3.1 Checklist "ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก" ต่อจอ (E8, GDD บรรทัด 321: ตลาด, ตีบวก, raid, ลงแต้ม stat, เปลี่ยน class, กลไก party ละเอียด, anti-cheat, lore ยาว)

ทำวันนี้ได้เต็มรูปโดยไม่รอโค้ด: เทียบทุกจอที่ onboarding นาที 0–10 อาจพาไปถึง (flow F06 หัวข้อ 1: "นาที 0–10 ห้ามมีทางกดไปหน้าใดของ U1–U8") กับ flow F06 (ผ่าน design gate รอบ 2, PASS) + 5 ไฟล์ wireframe ที่เกี่ยวข้อง ผลคือ **DONE ระดับเอกสาร** — ยืนยันซ้ำกับ build จริงเป็นหน้าที่ของ P2-F06-T21 (QA gate F06) เพราะโค้ดยังไม่มี

| จอ (รหัส flow F06) | สิ่งต้องห้ามที่เช็ค | ผล (อ้างอิงเอกสาร) |
| --- | --- | --- |
| `S-00-intro`..`S-00-permission-browser` (A1–A4) | lore ยาว, login | ผ่าน: ประโยคเดียวไม่มี lore ยาว, ไม่มีขั้น login (D-087/088, override ข้อ 1) |
| `S-01-map` + `S-00-class-select` sheet (A5–A6, Flow B B1) | เปลี่ยน class, กลไก party ละเอียด | ผ่าน: เลือกครั้งเดียวไม่มีปุ่มยืนยันซ้อน (R29) · คำอธิบายเป็นระดับเล่นคนเดียวเท่านั้น ห้ามพูด stacking/debuff (B3, F06-R32) |
| `S-05-role-info` (Flow B B2–B3) | กลไก party ละเอียด (stacking, missingDebuffMult) | ผ่าน: "ไม่มีตัวเลข % ไม่มีคำว่า 'ขาด Tanker' หรือ 'missingDebuffMult'" ตรงคำ (B3) |
| `S-02-dungeon-confirm` (A8, F04 popup + F06-R05 note) | ลงแต้ม stat | ผ่าน: บรรทัดเสริมมีแค่ HP/auto-retreat note ไม่มีสูตร |
| `S-03-run` + จอพกกระเป๋า (A9–A10, Flow C, E) | ตลาด, ตีบวก, raid, anti-cheat | ผ่าน: บรรทัด tutorial เดียว "เดินต่อไปเพื่อรับรางวัล" ไม่มี tooltip HP bar/tick timer (F06-R38, R41) · นาที 6–8 (party) ข้ามทั้งช่วงไม่มีแผงว่าง (A10) |
| `run.hpLow` toast (C2) | ร้าน NPC (ทางลัด) | ผ่าน: ข้อความ canon เอ่ยคำว่า "ซื้อยา" เป็นวรรณกรรมของ GDD (R18/R41 อนุญาตข้อความ ไม่ใช่ลิงก์) — flow-approval ยืนยันแล้วว่า "ไม่มีลิงก์ไปร้าน" (ตาราง §3 แถว 2) |
| `S-04-run-summary` (C4, C6 auto-retreat/ตาย) | ตีบวก, ร้าน, ตลาด | ผ่าน: รายการของแยก rarity เท่านั้น ไม่มีปุ่มขาย/ตีบวก (override ข้อ 8) |
| `S-06-far-dungeon-panel` (F1, F2), `S-07-out-of-area-panel` (F3), unknown (F6) | ลงแต้ม stat, เปลี่ยน class | ผ่าน: ทางลัด 5 อย่างของ 7.0 ไม่มีลงแต้ม/เปลี่ยน class ปนอยู่ |
| `S-11-inventory` (7.0, override ข้อ 8, B-03) | ตลาด (ขายร้าน/ตลาด), ตีบวก | ผ่าน (แก้ B-03 แล้ว): "ไม่มีปุ่มขายร้าน/ลงขายตลาด/ตีบวก และไม่มี logic ปลด `unlocks.npcShop`" ยืนยันตรงคำใน override ข้อ 8 + R2-2 ตาราง B-03 |
| `S-22-settings` หน้าแรก + "การเดินและความปลอดภัย" (Flow D) | ปรับ/ปิดยาอัตโนมัติ (สงวน Phase 4) | ผ่าน (override ข้อ 5, D1): เหลือแค่ 2 แถว (auto-retreat toggle, จอพกกระเป๋า toggle) ไม่มีแถวยาอัตโนมัติ |
| ทุกจอรวมกัน | anti-cheat (คำอธิบาย speed lock/hysteresis ถึงผู้เล่น) | ผ่าน: ไม่มีจอใดอธิบาย speed lock เป็นกลไก anti-cheat (F04 test plan ยืนยันแยกแล้ว) |

หมายเหตุ: `S-24-account-delete` (2 ขั้น, บัญชีจริง) ไม่ใช้ใน Phase 2 (override ข้อ 6) — ไม่มีทางไปถึงจากจอใดของ onboarding จึงไม่อยู่ในตารางนี้

## 4. Traceability: edge case H-E1–H-E24 (spec หัวข้อ 5) → case

**อัพเดต P2-F06-T21:** โค้ดครบแล้ว (ดูหัวข้อ 3) — สถานะ `PASS` ที่พลิกด้านล่างยืนยันซ้ำอิสระผ่าน `pnpm test`/e2e ในงานนี้ ข้อความ "รอ" ในคอลัมน์เดิมเป็นบันทึกประวัติ ไม่ใช่สถานะปัจจุบัน


| edge | สรุป | case id | สถานะ |
| --- | --- | --- | --- |
| H-E1 | GPS drift/Grace/Suspended: ไม่มีการทอย นาฬิกาหยุดแล้วนับต่อ | F06-C01 | PASS (P2-F06-T21) (`src/hp`) |
| H-E2 | จอล็อก/hidden/แอปปิดขณะ HP ต่ำ: ไม่มีหลักฐาน = ไม่มีการตี · กลับใน `suspendedMax_s` เล่นต่อ HP เดิม · เกิน = `timeout` ของครบ | F06-C18 | PASS (P2-F06-T21) — engine test 13.3#5 |
| H-E3 | speed lock: ไม่มีการตี | F06-C01 | PASS (P2-F06-T21) (เหมือน H-E1) — engine test 13.3#2 |
| H-E4 | ปิดทำการกลาง run/`clock_invalid`: ของครบ ฟื้นเริ่มที่เวลาจบ | F06-C19 | PASS (P2-F06-T21) — engine test 13.3#10 |
| H-E5 | เน็ตหลุด: Phase 2 ไม่มีผล (ไม่มี server) | — | ไม่ต้องมี case (out-of-scope Phase 2 โดย spec เอง) |
| H-E6 | เลเวล 1 เข้าโซนสูงกว่าหลายระดับ: damage คูณไม่มีเพดาน, floor HP 1 แล้วถอย, onboarding ไม่แนะนำถ้ามีที่ครอบเลเวล | F06-C20 | PASS (P2-F06-T21) — engine test 13.3#16 + design checklist (K-11 แล้ว, §3.1 แถวแนะนำ dungeon) |
| H-E7 | เลเวลสูงกว่าช่วง: damage ไม่ลด | F06-C02 | PASS (P2-F06-T21) (เหมือน acceptance 2) |
| H-E8 | tick กับ hit เวลาเดียวกัน + tick นั้น drop ยา: tick ก่อน ยาเข้าถุงแล้ว hit ใช้ได้ | F06-C21 | PASS (P2-F06-T21) — engine test 13.3#4 (step invariance) ครอบโดยอ้อม |
| H-E9 | tick + hit ที่ทำให้ตายเวลาเดียวกัน: tick มาก่อน exp อยู่ ของของ tick หายพร้อมถุง | F06-C21 | PASS (P2-F06-T21) (ไฟล์เดียวกับ H-E8) |
| H-E10 | hit ใหญ่พา HP ต่ำกว่า 25% มียาเล็กพาพ้น 30%: ดื่มยา เล่นต่อ ไม่แจ้ง | F06-C05 | PASS (P2-F06-T21) (vector ขอบของ R-B1) |
| H-E11 | เข้า run ที่ HP ≤ 25%: เข้าได้พร้อมคำบอก · hit แรกไม่มียา→auto-retreat | F06-C22 | PASS (P2-F06-T21) — client (Flow C9) + engine |
| H-E12 | ปิด auto-retreat กลาง run แล้ว HP ถึง 0: ตาย | F06-C23 | PASS (P2-F06-T21) — engine test 13.3#7 |
| H-E13 | เปิด auto-retreat กลับขณะ HP ≤ 25%: ไม่ถอนจนกว่าจะโดน hit ถัดไป | F06-C23 | PASS (P2-F06-T21) (ไฟล์เดียวกับ H-E12) |
| H-E14 | ยาถุงของ run + inventory พร้อมกัน: ใช้ถุงก่อน · ตายแล้วยา inventory ที่ไม่ใช้อยู่ครบ | F06-C05, F06-C08 | PASS (P2-F06-T21) |
| H-E15 | Support heal ดัน HP เหนือ 30% แล้วโดนลงอีก: แจ้งอีกครั้ง | F06-C06 | PASS (P2-F06-T21) — engine test 13.3#12 |
| H-E16 | Magic ได้ tick ที่ไม่ผ่าน gate: ไม่ได้โล่ | F06-C10 | PASS (P2-F06-T21) — engine test 13.3#12 |
| H-E17 | ใช้ยาชุบระหว่างมี run: ใช้ไม่ได้ | F06-C24 | PASS (P2-F06-T21) — engine test 13.3#11 (`usePotion` reason `run_active`) |
| H-E18 | ปิดแอปก่อนเลือก class/กลาง age gate: เปิดใหม่กลับขั้นที่ยังไม่ผ่าน | F06-C12 | PASS (P2-F06-T21) — client (flow A6 ⤷) |
| H-E19 | เปิดแอปครั้งแรกกลางสวน: check-in บอกให้เดินออกแล้วเข้า, onboarding ค้างที่ `O-nearest` ไม่ลงโทษ | F06-C12 | PASS (P2-F06-T21) — เหมือน F04 E4 |
| H-E20 | tick แรกของชีวิตไม่ผ่าน gate: บอกแค่เดินไม่พอ ไม่มีทางลัด | F06-C13 | PASS (P2-F06-T21) — flow A11 ⤷ (ผ่าน design gate แล้วว่า "ไม่มีทางลัด") |
| H-E21 | ย่านเปิดตัวแต่ dungeon ใกล้สุดปิดหมด: ไกลชั่วคราว แสดงเวลาเปิดถัดไป ไม่มีลงทะเบียนรายเขต | F06-C15 | PASS (P2-F06-T21) — client (flow F1 ⤷) |
| H-E22 | นอกย่านเปิดตัวแต่ใกล้ dungeon ข้ามเขต: สถานะใกล้ เล่นปกติ | F06-C15 | PASS (P2-F06-T21) (ไฟล์เดียวกับ H-E21) |
| H-E23 | ลบข้อมูลในเครื่องระหว่าง run: ปุ่มใช้ไม่ได้จนกว่า run จบ | F06-C25 | PASS (P2-F06-T21) — `selectCanClearLocalData` (tech note 8.3) รอ T06/T08 |
| H-E24 | party ออก/เข้า: ไม่อยู่ใน Phase 2 | — | ไม่ต้องมี case |
| H-E25 (เพิ่มหลัง P2-X15, spec §12) | ถอน consent ตำแหน่งระหว่าง run (รวมตอน Grace/Suspended): ถอนได้ทันที run จบ `manual_exit` ของครบ หยุดขอตำแหน่ง ไปสรุป run แล้วจอไม่รู้ตำแหน่ง | F06-C33 | **PASS (P2-F06-T21)** — `apps/client/e2e/withdraw-consent.spec.ts` จริง |
| H-E26 (เพิ่มหลัง P2-H25, D-127) | onboarding ไม่มี dungeon เปิดอยู่+ครอบเลเวลในเกณฑ์ แต่มีแห่งไม่ครอบอยู่ใกล้: จอไกลชี้แห่งที่ครอบเลเวลใกล้สุด (ไม่ใช่แห่งใกล้สุดทั่วไป) · ระยะเท่ากันเลือกแห่งเปิดเร็วกว่า ยังเท่ากันเลือก `dungeon_id` น้อยกว่า (3A tie-break) | F06-C40 (ใหม่) | **PASS (P2-F06-T21)** — `qa/tests/F06/home-tracker-tie-break.test.ts` (2 test ใหม่, ยันทั้งสองชั้นของ tie-break ผ่าน `HomeTracker` จริง) + `home-state.ts`/`home-tracker.ts` โค้ดจริงตรงคำตัดสิน D-127 |

## 5. Traceability: Failure modes FH-01–FH-16 (tech note §12) → case

**อัพเดต P2-F06-T21:** โค้ดครบแล้ว (ดูหัวข้อ 3) — สถานะ `PASS` ที่พลิกด้านล่างยืนยันซ้ำอิสระผ่าน `pnpm test`/e2e ในงานนี้ ข้อความ "รอ" ในคอลัมน์เดิมเป็นบันทึกประวัติ ไม่ใช่สถานะปัจจุบัน


| FH | สรุป | case id | สถานะ |
| --- | --- | --- | --- |
| FH-01 | แอปปิด/จอล็อก/hidden ขณะ HP ต่ำ: ไม่มีหลักฐาน = ไม่มีการตี · กลับใน `suspendedMax_s` เล่นต่อ · เกิน = `timeout` ของครบ | F06-C18 | PASS (P2-F06-T21) |
| FH-02 | นาฬิกาถอยระหว่าง run: `clock_invalid` ของครบ HP ย้ายไป player ที่ `lastEventAt_ms` | F06-C19 | PASS (P2-F06-T21) |
| FH-03 | นาฬิกาถอยนอก run: HP ไม่ลด จุดยึดใหม่ที่ `now_ms` | F06-C09 | PASS (P2-F06-T21) |
| FH-04 | นาฬิกากระโดดหน้า: ฟื้นเร็ว/Recovering จบเร็ว — ยอมรับ (ไม่ใช่รางวัลจริง, C1-1) | — | ไม่ต้องมี case แก้บั๊ก (บันทึกเป็นความเสี่ยงที่รู้แล้ว, spec ยอมรับแล้ว) |
| FH-05 | client สุ่ม seed ใหม่เพื่อเลือกผลการตี: ตรวจไม่ได้ใน Phase 2 (ยอมรับตาม C1-1) | — | ไม่ต้องมี case (Phase 3 เท่านั้นที่พิสูจน์ได้ เพราะ seed อยู่ server) |
| FH-06 | แก้ `kw.p2.session` เอง: ค่านอกช่วง = `corrupt` ทิ้งแล้วเริ่มใหม่ | F06-C26 | PASS (P2-F06-T21) — `fromPersisted` ตรวจช่วงค่า (tech note 2.5), รอ T06 |
| FH-07 | config ผิด (distribution, mode, ลำดับเกณฑ์, ยาไม่มี heal, revive อยู่ในลำดับ): `hpParamsFromConfig` throw | F06-C27 | PASS (P2-F06-T21) — เหมือน `config-lint` ของ F04/F05, รอ T06 |
| FH-08 | การตีถูกตัดสินช้า (รอ hysteresis): `at_ms` อดีต client แสดงเมื่อได้รับ ไม่เล่นย้อน | F06-C21 | PASS (P2-F06-T21) (ไฟล์เดียวกับ H-E8/9, step invariance) |
| FH-09 | แจ้ง 30% ตอนมือถือในกระเป๋า/iOS ไม่มี vibrate: เสียง+ภาพแทน ห้ามลดเกณฑ์ | F06-C06 | PASS (P2-F06-T21) — ยืนยันด้วย TC-HUD probe (`vibrate.ts` feature-detect, มีอยู่แล้ว) + client fire-together (รอ T08) |
| FH-10 | เรียก `usePotion` ซ้ำเร็ว/ระหว่าง run/HP เต็ม: `potion_use_rejected` ไม่หักยา | F06-C24 | PASS (P2-F06-T21) |
| FH-11 | เปิด auto-retreat กลับขณะ HP ≤ 25%: ไม่ถอนจนกว่าจะโดนครั้งถัดไป | F06-C23 | PASS (P2-F06-T21) |
| FH-12 | กดลบข้อมูลในเครื่องระหว่าง run: ปุ่ม disabled ฟังก์ชันปฏิเสธ | F06-C25 | PASS (P2-F06-T21) |
| FH-13 | damage มหาศาลจากห่างเลเวล: floor HP 1 เมื่อเปิด auto-retreat → ถอยทันที | F06-C20 | PASS (P2-F06-T21) (ไฟล์เดียวกับ H-E6) |
| FH-14 | `level_range` ของ dungeon ขาด/ผิด: validator ของ `tools/dungeons` กันไว้แล้ว | — | **DONE แล้วใน P2-F04-T26** (validator มีอยู่ก่อน F06) ไม่ต้องมี case ใหม่ |
| FH-15 | storage เต็ม: `setItem` throw ตาม F04 10.4 | F06-C28 | PASS (P2-F06-T21) — เหมือน F04 storage-full case (อ้าง `qa/plans/F04-test-plan.md`) |
| FH-16 | Mock ×10/×60: τ มาจาก timestamp ของ sample จึงได้การตีชุดเดียวกับ ×1 | F06-C29 | PASS (P2-F06-T21) — engine test เทียบผลระหว่าง speed multiplier (เหมือน F05 acceptance 12 "run ยาว ×60") |

## 6. `TC-HUD-03..12` — ปิดงานที่ยกมาจาก P1-F02-T13 (board 1.9 "qa TC-HUD-03..12 หลัง HUD เสร็จ")

HUD probe ของ P2-F04-T10 (`wake-lock.ts`, `vibrate.ts`, `visibility-tracker.ts`, `probe-summary.ts`, environment/segment, `stationary_5min_accum`) เสร็จแล้ว งานนี้จึงปิดเลขที่เหลือของช่วง TC-HUD-03..12 ที่ `qa/plans/F02-test-plan.md` §4.3 วางไว้ล่วงหน้าตั้งแต่ P1

| case id | เนื้อหา | ไฟล์ | สถานะ |
| --- | --- | --- | --- |
| TC-HUD-03 | sample-interval median (S14) | `qa/tests/F02/hud-panel-blackbox.test.ts` | เขียวอยู่แล้ว (P1) |
| TC-HUD-04 | render latency median/p90 (S15) | `qa/tests/F02/hud-panel-blackbox.test.ts` | `it.skip` PENDING ตามเหตุผลเดิม (ไม่มี pure export ให้เรียก ต้องมี live `render` event ของแผนที่จริง — e2e-only, นอก `writes` ของงานนี้) — คงสถานะเดิม ไม่ใช่การถดถอยของงานนี้ |
| TC-HUD-05 | FPS average/p5 (S1/S2) | เดิม | เขียวอยู่แล้ว |
| TC-HUD-06 | battery source/reading (S3) | เดิม | เขียวบางส่วน + `it.skip` PENDING หนึ่งเคส (formula เข้า DOM closure, e2e-only) เหมือนเดิม |
| TC-HUD-07 | JS/style/tile byte totals (S5–S8) | เดิม | เขียวอยู่แล้ว |
| TC-HUD-08 | accuracy median/p90 หลังตัด warm-up (S9/S10) | `qa/tests/F02/hud-gate-formula.test.ts` | เขียวอยู่แล้ว |
| TC-HUD-09 | TTFF ≤ 30 ม. (S11) | เดิม | เขียวอยู่แล้ว |
| TC-HUD-10 | summary CSV ไม่มีพิกัด/ชื่อสถานที่/epoch/user agent | `qa/tests/F02/hud-panel-blackbox.test.ts` | เขียวอยู่แล้ว |
| TC-HUD-11 | raw trace export opt-in, trim, `validateTrace` | เดิม | เขียวอยู่แล้ว |
| **TC-HUD-12** | build ไม่มี `?hud=1`: `window.__kwSpike` เป็น `undefined`, ไม่มี log พิกัดระดับ production | **`qa/tests/F02/hud-flag-gate.test.ts` (ใหม่, งานนี้)** | **ใหม่ — เขียว (10/10 test)** |

**หลักฐาน (`pnpm exec vitest run qa/tests/F02`, 2026-09-27):**

```
Test Files  5 passed (5)
     Tests  206 passed | 2 skipped (208)
```

2 skipped = `TC-HUD-04` และ 1 เคสย่อยของ `TC-HUD-06` เท่านั้น (`it.skip` พร้อมเหตุผลในโค้ด, มีมาตั้งแต่ P1 ไม่ใช่ของใหม่) — ทุก `TC-HUD-03..12` มี "test อัตโนมัติ" ตามที่ acceptance ของ board ต้องการ, PENDING เพียง 2 เคสย่อยที่ประกาศไว้ตรงๆว่าต้องเป็น e2e (นอก `writes` ของงานนี้)

TC-HUD-12 พิสูจน์ 2 ชั้น: (a) `selectProvider` (pure function) คืน `hud: false` ทุกโหมดที่ workspace รองรับเมื่อไม่มี `?hud=1`, คืน `true` เมื่อมี, ค่าที่ไม่รู้จัก ("yes") fallback ไปค่า default ไม่ใช่ "on" เงียบๆ (b) grep เชิงสถิตของ `apps/client/src/main.ts`: จุดเดียวที่เรียก `installSpikeHook` และจุดเดียวที่ `import('./debug/hud-panel')` (dynamic) ทั้งคู่อยู่หลัง `if (selection.hud)`/ternary เดียวกัน ไม่มี static value import ของ `debug/hud-panel` (มีแต่ `import type`)

## 7. พฤติกรรมที่รู้แล้วของ Phase 2 (ไม่ใช่บั๊ก) — J-P2-T30-2, J-P2-T30-4 (D-118)

บันทึกตามคำสั่งของ game-director ที่ส่งถึงงานนี้โดยตรง (ไม่ใช่ finding ใหม่ของ QA แต่เป็นข้อมูลที่ P2-F06-T17/T21 และการเดินของทีม (หัวข้อ 8) ต้องรู้ล่วงหน้าเพื่อไม่จดว่าเป็นบั๊ก):

- **J-P2-T30-2 (edge-band hysteresis, ไม่มี `pendingSetMax_s` ใน Phase 2):** ผู้เล่นที่กลับเข้ามาแล้วยืนอยู่ในแถบขอบ 5 ม. (`edgeHysteresis_m`) ค้างอยู่ใน Grace ได้ไม่จำกัด (`run-state.json` [33]) หรือ run ย้อนกลับเป็น Active แบบ backdate ได้ถ้าอยู่ในแถบนานเกิน `graceMax_s` แล้วเดินลึกเข้าไปภายหลัง ([35]) — ทางเดียวที่ได้ `timeout` แบบเก็บของครบจากเคสนี้คือผ่านช่องว่าง sample เกิน `maxSamplePairGap_s` เท่านั้น ([34]) ไม่ใช่การยืนยันด้วยเวลา (ขัด D-103 ถ้าทำ) เพดานเวลา (`pendingSetMax_s = 90`) เป็นแผนของ Phase 3 (P-4, J-9) เท่านั้น
  - **ผลต่อ F06:** ระหว่างที่ค้าง Grace ไม่มีการตี (นาฬิกา `hit` หยุดพร้อมนาฬิกา reward) — ไม่มีความเสี่ยงต่อ HP เกิดขึ้นเงียบๆ ระหว่างค้าง ตรงกับ H-E1 ทุกประการ
  - **case:** F06-C30 (ใหม่) — เมื่อ `src/hp`/`src/run` เชื่อมกันแล้ว ต่อ trace `synthetic-edge-walk-01` แบบขากลับที่ยืนในแถบ 5 ม. นานเกิน `graceMax_s` แล้วยืนยันว่า (1) ไม่มี `run_hit` เกิดขึ้นระหว่างค้าง Grace (2) ไม่มีการเสียของ (3) บันทึกเวลาที่ค้างและ accuracy ถ้าพบระหว่างการเดินของทีม (หัวข้อ 8) ไม่ใช่การรายงานเป็นบั๊กใน `qa/bugs.md`
- **J-P2-T30-4 (กลับ Active หลัง `no_evidence` ไม่ต้อง hysteresis):** หลัง exit ด้วยเหตุ `no_evidence` (ช่องว่าง sample), sample แรกที่ใช้ได้ซึ่งอยู่ข้างในของ polygon (รวมแถบใน 5 ม.) พา presence กลับเป็น `in`/Active ทันที **ไม่ต้องรอยืนยัน hysteresis ซ้ำ** (ต่างจากขากลับปกติที่ต้องสะสม `edgeHysteresisSamples`)
  - **สถานะ vector:** P2-X17 (systems-designer) ยังเป็น `TODO` บน board — vector 3 ข้อของกรณีนี้ (ในแถบ 5 ม., sample แรกอยู่นอก, นอกเกิน `suspendedMax_s`) ยังไม่ถูกเขียน งานนี้จึงบันทึกเป็น **PENDING รอ P2-X17** ไม่ใช่รอ P2-F06-T06 อย่างเดียว
  - **case:** F06-C31 (ใหม่) — เมื่อ P2-X17 ส่ง vector แล้วและ `src/run`/`src/hp` รองรับ ให้ยืนยันว่า sample แรกในแถบในหลัง `no_evidence` พา `run_state_changed` กลับ `active` ที่ sample นั้นทันที (ไม่มี `pendingSince_ms`/นับ hysteresis ใหม่) และการตี/tick กลับมานับต่อจาก sample นั้น ไม่ใช่ sample ที่ยืนยันครบ

## 8. F06-C32 — การเดินของทีม (P-3.4, `design/reviews/F05-F06-flow-approval.md` P-3 ข้อ 4): สัญญาณ HP ต่ำ/auto-retreat บนเครื่องจริง

**เหตุผลที่แยกจาก playtest ของผู้เล่นจริง (P2-F06-T18):** P-3 ตัดสินว่าผู้เล่นระดับ 1 แทบไม่เจอ auto-retreat ในช่วง 30–60 นาทีของ session ปกติ (มัธยฐานถึง auto-retreat ที่มียา: Tanker ~116, Support ~87, Ranged ~67, Magic ~51 นาที ตาม balance-model §17.8) — ให้ **ทีม (qa-tester) เอง** ใช้โปรไฟล์ที่ตั้งใจเข้าเงื่อนไข H-E6 (เลเวล 1 ในดันที่ช่วงเลเวลไม่ครอบเลเวล 1) เพื่อบังคับให้เจอสัญญาณเร็ว แทนที่จะรอผู้ร่วม playtest เจอเอง และ **ห้าม** ทำ build พิเศษที่คูณ damage หรือลดเกณฑ์ (P-3 ข้อ 5, NN-8)

สถานะงานนี้ (อัพเดต P2-F06-T21): เงื่อนไข (1) `src/hp` DONE และ (2) client F06 DONE ครบแล้ว (tech gate F06 PASS รอบ 2) — เหลือเงื่อนไข (3) level-designer เลือก dungeon นำร่องที่ `level_range.min > 1` ในช่วงเวลา D-093 ยังไม่ยืนยันแยกเป็นลายลักษณ์อักษร (handoff เดิมยังไม่มีคำตอบบันทึกไว้ในบอร์ด) การเดินจริงจึงยังเป็น **HUMAN** (ไม่ใช่ PENDING ของโค้ด) รอนัดคน — สคริปต์ในหัวข้อ 8.1–8.4 พร้อมใช้ได้ทันทีที่มีคำตอบข้อ (3) ไม่บล็อก verdict ของ QA gate นี้ (เป็น field-test แยกต่างหากตามนิยาม role นี้)

### 8.1 Precondition

- อุปกรณ์: 1 เครื่อง Android (Chrome) + 1 เครื่อง iPhone (Safari) — จริง ไม่ใช่ Mock (ต้องเห็นสั่น/เสียง/จอพกกระเป๋าจริง)
- โปรไฟล์: ลบข้อมูลในเครื่องให้เป็นบัญชีใหม่ เลือกเลเวล 1 (ค่าเริ่มต้น) ทุก class ทีละรอบ (Tanker, Ranged, Support, Magic — 4 รอบเดินจริงถ้าเวลาเอื้อ อย่างน้อย 1 class ที่ไม่ใช่ Tanker เพราะถึง auto-retreat เร็วสุด)
- dungeon: [handoff level-designer] เลือก 1 แห่งจาก `data/dungeons/pilot.geojson` ที่เปิดอยู่ในช่วง D-093 (07:00–09:30 หรือ 16:30–18:30) ซึ่ง `level_range.min > 1` (ช่วงไม่ครอบเลเวล 1 ตาม H-E6) — บันทึกชื่อ dungeon ที่เลือกไว้ในผลของ case นี้
- **ห้ามแก้ config ใดเพื่อให้เห็น auto-retreat เร็วขึ้น** (P-3 ข้อ 5) — ใช้ config จริงของ build ทั้งหมด

### 8.2 ขั้นตอน (เขียนให้ผู้ทดสอบที่ไม่ใช่โปรแกรมเมอร์ทำตามได้)

1. เปิดแอปที่ URL preview จริง (ไม่ใช่ `?loc=mock`) ยืนยัน consent ตำแหน่งและ permission เบราว์เซอร์
2. เดินไปยัง dungeon ที่เลือกไว้ (ข้อ 8.1) จนกด "เข้า" สำเร็จ (popup confirm ผ่าน check-in)
3. เก็บมือถือลงกระเป๋ากางเกงหรือกระเป๋าสะพาย (จอพกกระเป๋าควรขึ้นถ้า Wake Lock ใช้ได้) เดินต่อเนื่องในเส้นทางปลอดภัย
4. เมื่อรู้สึกสั่น/ได้ยินเสียง ให้หยิบมือถือขึ้นมาดูทันทีและจดเวลานาฬิกาปัจจุบัน + สิ่งที่เห็นบนจอ (ข้อความ, HP bar อยู่ระดับไหน)
5. เดินต่อจนกว่าจะถึง auto-retreat (จอสรุป run ขึ้นเอง) หรือครบ 60 นาที (ตัดจบถ้ายังไม่ถึง แล้วบันทึกว่า "ไม่เจอ")
6. ทำซ้ำบนอีกเครื่องหนึ่ง (Android ↔ iPhone) ด้วยโปรไฟล์/dungeon เดียวกัน

**ข้อควรระวังด้านความปลอดภัย (ใช้ชุดเดียวกับ safety briefing ของ P2-F06-T18):** เดินบนทางเท้าเท่านั้น ห้ามข้ามถนนขณะมองจอ ห้ามเดินขณะจ้องจอเก็บมือถือหลังยืนยันสัญญาณแล้วให้เดินต่อโดยไม่มองจอ พกน้ำถ้าอากาศร้อน หยุดพักได้ทุกเมื่อโดยกด "ออก" ในเกม (ของครบ, F06-R28) หลีกเลี่ยงเวลาแดดจัด (ใช้ช่วง D-093 เท่านั้น)

### 8.3 สิ่งที่ต้องบันทึกต่อรอบ (ไม่ใช่ qa/playtest/ — ผลของ case นี้ต่อท้ายรายงานของ P2-F06-T17)

| ช่อง | ตัวอย่างค่า |
| --- | --- |
| เครื่อง (Android/iPhone) + class | Android · Ranged |
| dungeon + level_range | (ชื่อ) · 5–15 |
| แจ้ง HP ต่ำ (30%) เกิดที่นาทีใด, ช่องทางที่รับรู้ได้จริง (สั่น/เสียง/ภาพ) | นาที 6 · เสียง+ภาพ (iOS ไม่มี vibrate ตามคาด) |
| auto-retreat เกิดที่นาทีใด (ถ้าเกิด) | นาที 9 |
| ข้อความ canon ที่เห็นตรงกับ `run.autoRetreat`/`run.hpLow` หรือไม่ | ตรง/ไม่ตรง (ระบุคำที่ต่าง) |
| ปัญหาที่พบ (ถ้ามี) | — |

### 8.4 เกณฑ์ตัดสิน

- เกิดสัญญาณจริงบนทั้งสองเครื่องภายใน 60 นาที = ผ่าน case นี้ (ยืนยันว่ากลไกทำงานจริงนอก Mock)
- iPhone ไม่มี vibrate ต้องเห็นเสียง+ภาพแทนเสมอ (ไม่ใช่ "ไม่มีอะไรเกิดขึ้นเลย") — ถ้าไม่เห็นอะไรเลยบน iOS ให้บันทึกเป็นบั๊ก severity สูง (ขัด F06-R15/FH-09)
- ถ้าไม่เกิด auto-retreat ใน 60 นาทีทั้งสองเครื่อง ให้บันทึกเลเวล/class/dungeon ไว้และส่งกลับ handoff แทนที่จะตัดสินว่าเป็นบั๊ก (P-3 ข้อ 1)

## 9. กฎที่ brief ระบุชื่อตรงๆ → case (เพื่อไม่ให้ตกหล่นระหว่างตารางหัวข้อ 3–5)

**อัพเดต P2-F06-T21:** โค้ดครบแล้ว (ดูหัวข้อ 3) — สถานะ `PASS` ที่พลิกด้านล่างยืนยันซ้ำอิสระผ่าน `pnpm test`/e2e ในงานนี้ ข้อความ "รอ" ในคอลัมน์เดิมเป็นบันทึกประวัติ ไม่ใช่สถานะปัจจุบัน


| decision | กฎที่ต้องตรวจ | case id | สถานะ |
| --- | --- | --- | --- |
| D-096 | ตายจบ run ทันที ไม่มีสถานะล้มในดัน | F06-C08 | PASS (P2-F06-T21) |
| D-096 | age gate มาก่อน consent ตำแหน่ง | F06-C12 | PASS (P2-F06-T21) |
| D-096 | แต้ม stat สะสมเงียบ ไม่มีจอลงแต้มใน Phase 2 | F06-C11 | PASS (P2-F06-T21) (code-search) / DONE (checklist §3.1) |
| D-096 | ยาอัตโนมัติ: ถุงของ run ก่อนคลัง | F06-C05 | PASS (P2-F06-T21) |
| D-096 | เข้า run ได้ที่ HP > 0 (ไม่มีเกณฑ์ขั้นต่ำอื่น) | F06-C22 | PASS (P2-F06-T21) |
| D-096 | ไม่มีเปลี่ยน class ใน Phase 2 | F06-C10 (ส่วน R30) | PASS (P2-F06-T21) |
| D-114 | นาฬิกาการตีใช้ `ActiveClock` เดียวกับ rewardWindow, ตัดสินเมื่อ `at < H` เท่านั้น (ไม่ย้อน) | F06-C01, F06-C21 | PASS (P2-F06-T21) |
| D-114 | HP นอก run เก็บเป็นค่า+เวลาอ้างอิง (ไม่มี timer, นาฬิกาถอยไม่ลด HP) | F06-C09 | PASS (P2-F06-T21) |
| D-114 | `confirm` ปฏิเสธ `no_class`/`no_hp` | F06-C34 (ใหม่) | PASS (P2-F06-T21) — engine ปฏิเสธทั้งสอง reason ตาม tech note §6.3, N-01 ของ flow-approval (client แสดง sheet เลือกพลังทันทีสำหรับ `no_class`, `common.error`+`common.retry` สำหรับ `no_hp`) |
| D-114 | `run_tick_denied` มี `partial` เสมอ | F06-C09 (ร่วมกับ F05-C09) | PASS (P2-F06-T21) — cross-check กับ `qa/plans/F05-test-plan.md` |
| D-078 (R-B1) | ลำดับผลต่อ hit: shield → floor HP 1 (auto-retreat) → auto-potion → ตรวจ auto-retreat → เตือน 30% → ตาย | F06-C03, F06-C05 | PASS (P2-F06-T21) |
| D-089 | ยาทุกขวดมาจาก tick ที่ผ่าน gate เท่านั้น ไม่มีชุดยาตั้งต้น | F06-C05 (+ code-search 7.3) | PASS (P2-F06-T21) |
| D-089 | รางวัลก้อนแรกของ onboarding = tick ปกติ ไม่มี code path แยก | F06-C13 | PASS (P2-F06-T21) |
| D-100 | ไม่แสดงจำนวนคน/role/จำนวนลงทะเบียนทุกจอ (ไม่มี element ไม่จองช่อง) | F06-C16 | PASS (P2-F06-T21) (grep build) / DONE (checklist §3.1) |
| D-112 | `zoneLevelFrom = playerLevelClampedToRange` ใช้ทั้ง damage และ exp | F06-C02 | PASS (P2-F06-T21) บางส่วน (ผ่านแล้วใน `formulas`, รอ `src/hp` สำหรับ hit) |
| J-P2-T30-1 | ถอน consent ตำแหน่งระหว่าง run ห้ามบล็อก · run จบทันทีแบบเก็บของครบ (ไม่ไหล Grace→Suspended→timeout) · หยุดขอตำแหน่งทันที | **F06-C33** | **PASS (P2-F06-T21)** — handoff ปิดแล้ว: tech-lead เลือก `exit_reason: 'manual_exit'` (ไม่ใช่ enum ใหม่) · ยืนยันด้วย `apps/client/e2e/withdraw-consent.spec.ts` จริง (ถอนกลาง run → `manual_exit`, ของครบ, `kw.p2.consent` เป็น `withdrawn`, ไม่มีพิกัดหลุด, popup มีบรรทัด `privacy.withdrawDuringRunNote`) เขียวทั้งสอง project ในงานนี้ |

### 9.1 PM-M2 — event หน้าจอว่าง (`onboarding_empty_screen_shown`/`_abandoned`) และ `interest_registered_outside_area`

board ระบุชื่องานนี้ตรงๆ ว่าต้องมี case สำหรับ event เหล่านี้ (`product/telemetry-events.md` §"onboarding_empty_screen_shown/abandoned", "interest_registered_outside_area") คู่กับ F06-C15:

| case id | ตรวจอะไร | สถานะ |
| --- | --- | --- |
| F06-C35 | `onboarding_empty_screen_shown` ยิงเมื่อเข้าจอ fallback ไกล/นอกพื้นที่/นอกย่านเปิดตัว พร้อม `reason` ตรง (`far`\|`out_of_area`\|`outside_launch_district`, **ไม่มี** `unknown`/`temporarilyClosed`) · ไม่มีพิกัดใน property | **PASS** — `qa/tests/F06/telemetry-onboarding-events-and-no-counts.test.ts` (P2-F06-T21) |
| F06-C36 | `onboarding_empty_screen_abandoned` ยิงเมื่อสลับออกภายใน `telemetry.sampling.emptyScreenAbandonTimeout_s` โดยไม่กดปุ่มใด พร้อม `seconds_before_close_bucket` ถูก bucket (`0-10`/`10-30`/`30-60`/`60+`) | **PASS** — bucket edges ตรวจใน `telemetry-onboarding-events-and-no-counts.test.ts` (P2-F06-T21) |
| F06-C37 | `interest_registered_outside_area` มี `scope` ถูกต้อง (`district` เมื่อไกล+นอกย่านเปิดตัว, `province` เมื่อออกนอก playarea mask) และ `area_name` มาจากรายการเท่านั้น (ไม่ใช่ข้อความอิสระ, D-073) ไม่มีพิกัด | **PASS** — call site ตรวจใน `telemetry-onboarding-events-and-no-counts.test.ts` (ไม่มี `lat`/`lng`) · `qa/tests/F06/s09-interest-register.test.ts` ยืนยันรายการเลือกไม่มีช่องพิมพ์อิสระ (P2-F06-T21) |
| F06-C38 | ยาจาก drop เท่านั้น — ไม่มี code path อื่นเพิ่ม `player.inventory` (D-089, B-06, F05-R14) | **PASS** — grep `packages/shared/src/session/reducer.ts`: `bagAdd`/`player.inventory` เขียนได้เฉพาะจุดของ `grantTick`/การโอนตอนจบ run เท่านั้น (P2-F06-T21, เหมือนที่ F04/F05 gate ยืนยันไว้แล้ว) |
| F06-C39 | รางวัลก้อนแรกของ onboarding = tick ปกติ (ไม่มี code path แยก, ไม่มีของแถม/badge) — ยืนยันซ้ำเป็น case เดี่ยวเพราะ board เอ่ยแยกจาก acceptance 13 ของ spec | **PASS** — เหมือน F06-C13: `qa/tests/F06/onboarding-first-reward-and-teach-lock.test.ts` + `apps/client/src/session/engine.test.ts` (F06-TG-02) (P2-F06-T21) |

## 10. สรุปจำนวน case (อัพเดต P2-F06-T21, 2026-09-28)

- Case ทั้งหมดของแผนนี้: F06-C01–C40 (40 case หลัก, ไม่นับ TC-HUD-12 ที่แยกเป็นของ P1-F02-T13/F02 test plan) — C40 (H-E26, tie-break 3A) เพิ่มใหม่ในงานนี้ (P2-F06-T21)
- **PASS (P2-F06-T21):** F06-C01–C31, C33–C40 ทั้งหมด — ยืนยันซ้ำอิสระผ่าน `pnpm test` (217 ไฟล์/3065 test, 0 แดง, 2 skip เดิมจาก P1) และ `pnpm exec playwright test` (92/92 ทั้งสอง project รวม 4 e2e ใหม่ของงานนี้) หลักฐานละเอียดต่อ case อยู่ใน `qa/reports/F06-qa-gate.md` หัวข้อ 3–4 (ไม่ทำซ้ำในไฟล์นี้)
- **F06-C32 (การเดินของทีม, HUMAN):** สคริปต์พร้อม (หัวข้อ 8) รอ level-designer ยืนยัน dungeon ที่ `level_range.min > 1` ก่อนนัดเดินจริง — ไม่บล็อก verdict ของ QA gate (field-test แยกตามนิยาม role)
- **ปิดแล้วระหว่างงานนี้:** P2-X17 (vector J-P2-T30-4) DONE บนบอร์ด → F06-C31 PASS · tech-lead เลือก `exit_reason: 'manual_exit'` สำหรับถอน consent กลาง run → F06-C33 PASS (ไม่มี handoff ค้างอีกต่อไป)
- **DONE แล้วจากงานอื่น ใช้ซ้ำ ไม่ต้องเปิด case ใหม่:** FH-14 (`tools/dungeons` validator, P2-F04-T26) · TC-HUD-12 (P1-F02-T13/P2-F06-T17)

## 11. หลักฐานการรัน (`pnpm exec vitest run`, 2026-09-27)

```
pnpm exec vitest run qa/tests/F02 --reporter=verbose
  Test Files  5 passed (5)
       Tests  206 passed | 2 skipped (208)
  (privacy-copy.test.ts, hud-gate-formula.test.ts, hud-panel-blackbox.test.ts,
   loc-trace-replay.test.ts, hud-flag-gate.test.ts — ใหม่ของงานนี้, 10/10 test)

pnpm exec vitest run qa/tests/F02/hud-flag-gate.test.ts --reporter=verbose
  Test Files  1 passed (1)
       Tests  10 passed (10)

pnpm test (ทั้ง repo)
  Test Files  132 passed (132)
       Tests  2126 passed | 2 skipped (2128)
```

ไม่มี test แดงในทั้ง repo หลังเพิ่มไฟล์ของงานนี้ (2 skipped เป็นของเดิมตั้งแต่ P1 ตามที่บันทึกไว้ในโค้ดว่าทำไม่ได้แบบ unit — ไม่ใช่ผลจากงานนี้)

### 11.1 P2-F06-T21 (QA gate, 2026-09-28) — หลักฐานเต็มอยู่ใน `qa/reports/F06-qa-gate.md`

```
pnpm test (root)                 216 files / 3063 tests passed, 2 skipped (0 failed)
pnpm typecheck                   root + geo + shared + copy-lint + client: exit 0
pnpm exec eslint . --max-warnings=0    exit 0
pnpm exec prettier --check .     exit 0
pnpm run lint:config             20 files, 0 errors, 2 warnings (เดิม)
pnpm run lint:copy               exit 0, 0 FAIL, 21 WARN (เดิม)
pnpm exec playwright test        92/92 passed (android-chrome + ios-safari, apps/client/e2e + qa/tests/e2e)
```

ไฟล์ใหม่ของงานนี้: `qa/tests/F06/confirm-rejects-no-class-no-hp.test.ts` (F06-C34, 3 test) · `qa/tests/F06/home-tracker-tie-break.test.ts` (F06-C40, 2 test) · `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` (1 test × 2 project) · `qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts` (1 test × 2 project) · แก้ `qa/tests/F06/lib/walk-until.ts` (เพิ่ม `stepMs` option แบบ backward-compatible) และ `qa/tests/F06/clear-local-data-integration.test.ts` (`canClear` ที่ call site + เคส `canClear: () => false`) · แก้ root-cause flake `qa/tests/e2e/f02-map-fixture-tile.spec.ts`/`f02-map-network-resilience.spec.ts` (ขาด `e2eSkipOnboarding=1` หลัง P2-X38 เพิ่ม consent gate) · แก้ format `qa/tests/e2e/visual/image-utils.ts`

## 12. Findings / handoffs (ไม่ใช่ของ `qa/bugs.md` — `qa/bugs.md` เป็นของ P2-F06-T17/T21)

### 12.1 ปิดแล้วระหว่าง P2-F06-T21

- ~~handoff → tech-lead: `exit_reason` ของถอน consent กลาง run~~ **ปิด** — `manual_exit` (ยืนยันจริงด้วย `withdraw-consent.spec.ts`)
- ~~handoff → systems-designer: P2-X17 vector~~ **ปิด** — DONE บนบอร์ด, `run-state.json` [36]–[43] อยู่ใน `vectors.test.ts` แล้ว
- ไม่พบ bug severity สูงขึ้นไปใหม่จากงานนี้ (รายละเอียดใน `qa/reports/F06-qa-gate.md`) — พบและแก้เองในไฟล์ QA เอง 2 จุด (root cause ของ e2e flake `qa/tests/e2e/f02-map-fixture-tile`/`f02-map-network-resilience`, และ `canClear` ไม่ถูกส่งใน `clear-local-data-integration.test.ts`) ไม่เปิดเป็น bug เพราะเป็นไฟล์ทดสอบของ QA เอง ไม่ใช่ product code

### 12.2 ยังเปิดอยู่ (ไม่บล็อก verdict)

- **handoff → level-designer (blocking: no, ก่อนรัน F06-C32 จริง):** เลือก dungeon นำร่อง 1 แห่งที่ `level_range.min > 1` และเปิดอยู่ในช่วง D-093 สำหรับการเดินของทีม (หัวข้อ 8.1) — ยังไม่มีคำตอบบันทึกในบอร์ด

## 13. Human / out-of-scope

- การเดินของทีม (หัวข้อ 8, F06-C32) เป็น **HUMAN** ตามนิยามของ role นี้ (ต้องใช้อุปกรณ์จริงและการเดินจริง) — สคริปต์พร้อมแล้ว รอ engine+client DONE ก่อนนัดเดิน
- Out-of-scope ตามสเปค F06 หัวข้อ 7: Support ชุบเพื่อน, สถานะล้มในดัน, ยาชุบใน dungeon, Nearby Party, จำนวนคน/role (Phase 3 F09) · login/account (F07) · push แจ้ง HP (Phase 8) · ร้าน NPC/gold/ซื้อยา/ปรับเกณฑ์ยา/เลือกขนาดยา/ใช้ยาเองใน run (Phase 4 F11) · อุปกรณ์/หน้าลงแต้ม stat/สร้างตัวละคร (F10) · เปลี่ยน class (U5) · parental consent ในแอปจริง (F20) · raid/สัปดาห์ล้มบอส · ส่งข้อมูลความสนใจออกจากเครื่อง (F23) — ไม่ต้องมี case ในแผนนี้สำหรับรายการเหล่านี้
