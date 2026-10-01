# Plan-sync F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav

งาน: P2-PLAN-F10 (producer) · วันที่ 2026-10-01
อ่านจาก: `studio/decisions/decision-log.md` (D-144..D-149), `studio/phases/phase-2/board.md` (หัวข้อ 1 กฎ path ร่วม, 2, 4, 5), `design/features/F06-hp-damage-onboarding.md` (R36, R44–R49, หัวข้อ 8 ข้อ 12), `docs/tech/F06-hp-damage-onboarding.md` หัวข้อ 8, `apps/client/src/f04-app.ts` (route `#/settings*`, `#/inventory`), `apps/client/src/onboarding-flow.ts`, `apps/client/src/onboarding/`, `art/assets/icon/ui/`, `product/telemetry-events.md`

## 1. เหตุผล

- คนสั่งโดยตรงใน chat 2026-10-01 หลังทดสอบ preview และตอบคำถามแล้ว: login ทั้ง Google/Apple และ email, ชื่อพิมพ์เอง + ตัวกรอง, Upgrade/Shop/Party แสดง "เร็วๆ นี้", ทำใน Phase 2 ทันที, playtest คนจัดการเอง · คำตัดสินลงแล้วเป็น D-144..D-149 (ACCEPTED, authority HUMAN)
- F10 ไม่อยู่ในเกณฑ์ปิด Phase 2 เดิมของ roadmap · producer เพิ่มเป็น feature และ exit item E18–E26 ใน board ตามคำสั่งของคน · **ไม่แก้ `studio/roadmap.md` ในงานนี้** (ไม่อยู่ใน writes) · ถ้าคนต้องการให้ roadmap สะท้อน F10 ให้สั่ง producer แยก
- ID: board ใช้ `P2-F10-Tnn` ตาม brief (ล่าสุดบน board: P2-X59, P2-H61) · **เลขชน:** `studio/roadmap.md` บรรทัด 14 และ 95 ใช้ F10 = "Level, Stat และอุปกรณ์" ของ Phase 4 · ผลกระทบตอนนี้คือชื่อไฟล์ใน `design/features/`, `docs/tech/`, `product/prd/` จะมีสอง feature ที่ขึ้นต้น `F10-` เมื่อถึง Phase 4 (ชื่อไฟล์ต่างกัน `F10-account-shell` จึงไม่ทับกัน) [ASSUMPTION A-P2-PLAN-F10-1: เดินต่อด้วยชื่อ F10 ตาม brief · ทุกไฟล์ใช้ชื่อเต็ม `F10-account-shell` หลักฐานใน exit checklist ระบุชื่อไฟล์เต็ม (glob `F10-*` ใช้ได้เฉพาะ wireframe ของ Phase 2) · คนตัดสินใน Q-F10-1 ว่าจะเปลี่ยนชื่อ feature (เช่น F06b หรือเลขใหม่หลังสุดของ roadmap) ก่อน Phase 4 หรือไม่ · owner: HUMAN, blocking: no]
- ขัด GDD หนึ่งจุด: D-145 (มี password) ขัด GDD "ไม่มีให้ตั้ง password" · คนอนุมัติทิศทางแล้ว · รอบนี้ game-director ร่างถ้อยคำใน `design/reviews/gdd-wording-D-145.md` เพื่อผูกกับ Q-P2-10 ไม่แก้ GDD
- หลักที่ใช้ตัดสินขอบเขต: (1) non-negotiable 1–7 ไม่แตะ โดยเฉพาะ age gate + consent (NN-7), ไม่มีข้อความอิสระ (NN-4), config-not-hardcode (NN-3), movement gate (NN-2) (2) ไม่มีงาน agent รอ HUMAN (3) ไม่แตะงาน playtest: P2-F06-T26..T29, `qa/playtest/`, `product/playtest/` (D-149)

### 1.1 การตัดสินของ producer ในแผนนี้ (ไม่ต้องถามคน)

| # | ประเด็น | ตัดสิน | เหตุผล |
| --- | --- | --- | --- |
| P-1 | เก็บอะไรจาก login | `kw.p2.account` มีเฉพาะ provider + ธง signedIn · ไม่เก็บอีเมล ไม่เก็บ password ไม่เก็บ token · tech-lead ยืนยันใน T07 | PDPA ลดข้อมูล · D-145 ห้ามเก็บ password · NN-7 ห้ามแสดงตัวตนจริง ไม่เก็บเลยจึงไม่มีทางแสดง |
| P-2 | เขียน account เมื่อไร | หลังผ่าน age gate เท่านั้น | ลำดับใหม่ login มาก่อน age · R46 ต่ำกว่าเกณฑ์ต้องไม่มี key ใด |
| P-3 | ที่อยู่ค่าตัวกรอง | ตัวเลข/ชุดอักขระ/รูปแบบ = `config/balance/character.json` (systems) · คลังชื่อสุ่ม + รายการคำต้องห้าม = `config/content/character-names.th.json` (narrative) | ค่าที่ปรับได้เป็นของ systems ตามกฎ path ร่วม · ชื่อและถ้อยคำเป็น content ของ narrative (CLAUDE.md "ทุกชื่อมาจาก back office") |
| P-4 | ที่อยู่โค้ดตัวกรองชื่อ | `packages/shared/src/character` (pure, subpath ใหม่ `./character` ที่ tech-lead ประกาศใน T07) | Phase 3 ตรวจชื่อซ้ำที่ server (NN-1) ได้โดยไม่ย้ายโค้ด · ตรงหลัก A-P2-PLAN-01-6 |
| P-5 | telemetry ก่อน build | ย้าย product-manager ขึ้น W1 (brief วางหลัง build) | protocol ข้อ 9: programmer emit ตามชื่อที่ PM ประกาศ และ tech-lead ต้องใส่ allowlist ใน `config/app/telemetry.json` ก่อน build · ผลเหมือนเดิมและไม่เพิ่ม wave |
| P-6 | flow approval | เพิ่ม P2-F10-T10 (game-director) ก่อน build | F10 แก้ลำดับ onboarding ซึ่งเป็น core-loop flow (protocol ข้อ 5, แบบ P2-F06-T30) · เป็นงานเพิ่มจาก 6 gate ที่ brief กำหนด |
| P-7 | งาน CI สุดท้าย | owner = qa-tester · ล้มนอก path ของ qa → handoff X ถึงเจ้าของ แล้วรัน P2-F10-CI ซ้ำ | ต้องเป็น role agent · qa ถือ e2e ของ qa และเป็นผู้ตรวจ exit · ช่อง gameplay ใน W10 เว้นไว้รับ fix |
| P-8 | e2e เดิมที่พัง | แยก: gameplay แก้ `apps/client/e2e/` ในงาน build ของตัวเอง · qa แก้ `qa/tests/e2e/` ใน P2-F10-T16 ทันทีหลัง build 1 | กฎ path: apps/client เป็นของ gameplay, qa/ เป็นของ qa · แก้เร็วเพื่อไม่ให้ CI แดงค้างหลาย wave |

## 2. งานที่เพิ่ม (25 แถว · agent ทั้งหมด)

| ID | Owner | Type | วัน | Wave |
| --- | --- | --- | --- | --- |
| P2-F10-T01 spec | game-director | spec | 2 | F1 |
| P2-F10-T02 art direction | art-director | spec | 1 | F1 |
| P2-F10-T03 เรื่อง 5 slide + คลังชื่อ + คำต้องห้าม | narrative-designer | asset | 2 | F1 |
| P2-F10-T04 config ตัวกรองชื่อ + vector | systems-designer | build | 1 | F1 |
| P2-F10-T05 telemetry + PRD addendum | product-manager | spec | 1 | F1 |
| P2-F10-T06 flow + wireframe + component | uiux-designer | spec | 2–3 | F2 |
| P2-F10-T07 tech note + schema + allowlist | tech-lead | spec | 2 | F2 |
| P2-F10-T08 test plan | qa-tester | spec | 1–2 | F2 |
| P2-F10-T09 icon nav/setting/logout | artist-2d | asset | 1–2 | F2 |
| P2-F10-T10 flow approval | game-director | review-gate | 0.5–1 | F3 |
| P2-F10-T11 copy key จอ F10 | narrative-designer | asset | 1–2 | F3 |
| P2-F10-T12 โมดูล pure (ตัวกรอง, สุ่ม, step machine) | backend-programmer | build | 2 | F3 |
| P2-F10-T13 ภาพ slide 5 ภาพ | artist-2d | asset | 2 | F3 |
| P2-F10-T14 build 1 login + ลำดับ | gameplay-programmer | build | 2–3 | F4 |
| P2-F10-T15 build 2 สร้างตัวละคร + เรื่อง | gameplay-programmer | build | 2–3 | F5 |
| P2-F10-T16 แก้ e2e เดิมของ qa | qa-tester | fix | 1–2 | F5 |
| P2-F10-T17 build 3 nav + Setting/logout | gameplay-programmer | build | 2 | F6 |
| P2-F10-T18 tech gate | tech-lead | review-gate | 1 | F7 |
| P2-F10-T19 e2e ใหม่ + ภาพหน้าจอ | qa-tester | build | 2 | F7 |
| P2-F10-T20 copy gate | narrative-designer | review-gate | 1 | F8 |
| P2-F10-T21 visual gate | art-director | review-gate | 1 | F8 |
| P2-F10-T22 QA gate | qa-tester | review-gate | 1 | F8 |
| P2-F10-T23 design gate | game-director | review-gate | 1 | F9 |
| P2-F10-T24 product gate | product-manager | review-gate | 1 | F9 |
| P2-F10-CI CI ในเครื่อง CI=1 | qa-tester | build | 0.5–1 | F10 |

งานต่อ role: qa-tester 5 · game-director 3 · gameplay-programmer 3 · narrative-designer 3 · art-director 2 · artist-2d 2 · product-manager 2 · tech-lead 2 · uiux-designer 1 · systems-designer 1 · backend-programmer 1 · role ที่ไม่มีงาน F10: location, level, vfx, sound, devops, liveops, producer (ไม่มีเสียง/effect ใหม่ที่ D-144..D-149 สั่ง · ถ้า gate ขอให้เปิดเป็น handoff)

## 3. แผน wave (F1–F10)

กติกา: ไม่เกิน 6 task ต่อ wave · 1 task ต่อ agent ต่อ wave · deps ทุกตัวเสร็จใน wave ก่อนหน้า · Writes ไม่ทับกันภายใน wave (ตรวจแล้วทุกแถว) · wave F นับแยกจาก W ของ Run 2 · orchestrator แทรกงานเดิมที่ยัง TODO และไม่ใช่ playtest (P2-X58 location-engineer) ในช่องว่างได้ ถ้าไม่เกิน 6 และ Writes ไม่ทับ

| Wave | งาน (owner) | จำนวน | Writes ร่วมที่ต้องระวัง | ช่องว่างที่แทรกได้ |
| --- | --- | --- | --- | --- |
| F1 | T01 (gd), T02 (ad), T03 (nar), T04 (sys), T05 (pm) | 5 | `copy.th.json` = T03 เท่านั้น (key `story.*`) · `config/balance/character.json` = T04 · `product/telemetry-events.md` = T05 | 1 ช่อง: P2-X58 (location · `tools/tiles/`, `docs/adr/`) ควรเข้าที่นี่ เพราะ pin tile หมดราว 2026-10-07 |
| F2 | T06 (uiux), T07 (tl), T08 (qa), T09 (artist) | 4 | `packages/shared/package.json`, `config/app/*.json`, `packages/shared/schemas/config/` = T07 · `art/assets/manifest.json` = T09 | 2 |
| F3 | T10 (gd), T11 (nar), T12 (be), T13 (artist) | 4 | `copy.th.json` = T11 · `apps/client/src/onboarding/` = T12 (กฎสลับ 10: gameplay ไม่มีงานใน F3) · `manifest.json` = T13 | 2 |
| F4 | T14 (gp) | 1 | `apps/client/` ทั้งหมด = T14 | 5 · รับ fix ของ uiux จาก T10 ถ้า NEEDS_CHANGES (ต้องเสร็จก่อน T14 เริ่ม ถ้าแตะลำดับหรือ route) |
| F5 | T15 (gp), T16 (qa) | 2 | `apps/client/` = T15 · `qa/tests/e2e/`, `qa/bugs.md` = T16 | 4 |
| F6 | T17 (gp) | 1 | `apps/client/` = T17 | 5 |
| F7 | T18 (tl), T19 (qa) | 2 | `qa/tests/e2e/`, `qa/reports/F10/`, `qa/bugs.md` = T19 | 4 · gameplay ว่างรับ fix ขนาดเล็กจาก T16/T19 ที่พบระหว่างเขียน e2e |
| F8 | T20 (nar), T21 (ad), T22 (qa), [X ของ gameplay จาก T18] | 3–4 | `qa/bugs.md` = T22 · X ของ gameplay ถือ `apps/client/` | 2 |
| F9 | T23 (gd), T24 (pm), [X จาก T20/T21/T22 · gate รอบ 2 ถ้ามี] | 2–5 | X ต่อ owner คนละ path | 1–4 |
| F10 | P2-F10-CI (qa), [X ของ gameplay จาก CI ถ้ามี] | 1–2 | `qa/tests/e2e/`, `qa/bugs.md` = CI | 4 |

ประมาณการ: 10 wave ถ้าทุก gate PASS รอบแรก · gate NEEDS_CHANGES รอบหนึ่ง = +1 ถึง +2 wave (fix แล้วรัน gate ซ้ำ) · เพดานที่คาด 12 wave

ข้อสังเกตเรื่อง parallelism: F1 มี 5 งานพร้อมทันที และทุก role ที่มีงาน F10 ได้งานแรกภายใน F1–F3 (gameplay F4 เพราะต้องรอสัญญา) · F4–F6 แคบเพราะ `apps/client/` มีเจ้าของเดียว (กฎ path ร่วม) · ส่วนที่แยกได้ถูกย้ายไป backend ใน T12 แล้ว

### กติกา push ระหว่าง F4–F5
หลัง T14 ลง e2e ใน `qa/tests/e2e/` จะพังจนกว่า T16 เสร็จ · orchestrator commit ได้ทุก wave แต่ **ไม่ push** commit ของ F4 จนกว่า T16 DONE และ e2e ของ qa เขียว (กัน CI บน GitHub แดงค้าง) · ถ้า T16 กลับมา PARTIAL ให้ push พร้อมกับ F7 (T19)

## 4. Critical path

1. **build (ยาวสุด · slack 0):** T01 (F1) → T06 (F2) → T10 (F3) → T14 (F4) → T15 (F5) → T17 (F6) → T19 (F7) → T22 (F8) → T23 (F9) → P2-F10-CI (F10)
2. **สัญญา (ขนาน · slack 0 ถึง F4):** T04 + T05 (F1) → T07 (F2) → T12 (F3) → T14 (F4)
3. **copy:** T03 (F1) → T11 (F3, หลัง T06) → T14 (F4) · และ T11 → T20 (F8)
4. **art:** T02 (F1) → T09 (F2) → T17 (F6) · T02 + T03 + T06 → T13 (F3) → T15 (F5) · slack 2 wave สำหรับ T09
5. **qa:** T08 (F2) → T16 (F5) → T19 (F7) → T22 (F8) → CI (F10)
6. **gate:** T18 (F7) + T19 → T22 (F8) → T23 + T24 (F9) → CI · T20, T21 (F8) → T23

ความเสี่ยงบนเส้นวิกฤต: T14 และ T15 ประมาณ 2–3 วันต่อชิ้น · ถ้ากลับมา PARTIAL สองครั้ง producer แยกงานตามกติกา plan-sync · ถ้า T10 = NEEDS_CHANGES ที่แตะลำดับ D-149 ต้องแก้ flow ก่อน T14 (+1 wave)

## 5. ตรวจ non-negotiable และข้อห้ามของ brief

| ข้อ | ผลต่อ F10 | งานที่คุม |
| --- | --- | --- |
| NN-1 server-authoritative | ไม่มีรางวัลหรือค่าเกมใหม่ · ตัวกรองชื่ออยู่ใน `packages/shared` พร้อมย้ายไป server ใน Phase 3 | T07, T12, T18 |
| NN-2 movement gate | ไม่แตะ `reward`, `hp`, `session`, `run` · tech gate ตรวจ diff | T18, T23, E23 |
| NN-3 config-not-hardcode | ค่าตัวกรอง = `character.json` · ชื่อสุ่ม/คำต้องห้าม = content · ป้ายทุกจอ = copy key | T04, T03, T11, T18, T20 |
| NN-4 ไม่มี free-text chat | ช่องชื่อเป็นข้อความเดียวที่พิมพ์ได้ อยู่ในเครื่อง ไม่แสดงให้ผู้อื่น ผ่านตัวกรอง | T01, T06, T15, E23 |
| NN-7 PDPA | age gate ก่อน consent คงอยู่ · consent ตำแหน่งแยก · ไม่เก็บอีเมล/password · ต่ำกว่าเกณฑ์ไม่มี key · ไม่มีชื่อจริงในโปรไฟล์ (คำเตือน + ตัวกรอง) · ปุ่มลบข้อมูลในเครื่องล้าง account/character ด้วย (prefix `kw.p2.`) | T01, T07, T14, T15, T19, E19, E23 |
| playtest | ไม่มีงานใดมี Writes ใน `qa/playtest/`, `product/playtest/` และไม่มีงานใดอยู่ใน Deps ของ P2-F06-T26..T29 หรือรอแถวเหล่านั้น | ทุกแถว F10 |
| HUMAN dep | ไม่มีแถว F10 ใดมี HUMAN เป็น owner หรือ dep | ทุกแถว F10 |

## 6. สิ่งที่ orchestrator ต้องทำ (นอก writes ของ producer ในงานนี้)

1. บรรทัดสถานะของ board (บรรทัด 3–4) ยังเขียน "COMPLETE — AGENT SIDE" และ Feature F04–F06 · เสนอแก้เป็น "IN PROGRESS — F10 (D-144..D-149)" และเพิ่ม F10 ในบรรทัด Feature · brief ให้ producer แก้เฉพาะหัวข้อ 2, 4, 5, 7 จึงไม่ได้แก้
2. หัวข้อ 1 "เลือก gate ต่อ feature" ยังไม่มีแถว F10 · เสนอเพิ่ม: `F10 | flow approval (T10), Tech (T18), copy (T20), visual (T21), QA (T22), Design (T23), Product (T24) | คนสั่งครบ 6 gate · flow approval เพราะแตะลำดับ onboarding`
3. P2-CLOSE-QA (interim) และ P2-CLOSE-PM ต้องนับ F10: E12 "ทุก task DONE/CUT" ครอบ F10 อยู่แล้ว · report.md ของ Phase 2 ต้องแก้หลัง P2-F10-CI (งานของ producer ในรอบปิด)
4. ผูก `design/reviews/gdd-wording-D-145.md` (ผลของ T01) กับ Q-P2-10 ใน `studio/questions/open-questions.md`
5. เพิ่มคำถาม Q-F10-1 ด้านล่างใน open-questions (ไม่บล็อก)

## 7. คำถามถึงคน (ไม่บล็อก)

| ID | คำถาม | ตัวเลือก | ทีมแนะนำ | ต้องการคำตอบก่อน |
| --- | --- | --- | --- | --- |
| Q-F10-1 | roadmap ใช้ F10 = "Level, Stat และอุปกรณ์" (Phase 4) อยู่แล้ว · feature account shell ของ Phase 2 จะใช้ชื่ออะไรถาวร | (ก) คง P2-F10 บน board นี้ แล้วเปลี่ยนเลข feature ของ roadmap Phase 4 ภายหลัง (ข) เปลี่ยนชื่อ feature นี้เป็น F06b (ส่วนขยายของ onboarding F06) ก่อนเริ่ม F1 (ค) ให้เลขใหม่ต่อท้าย roadmap | **(ข)** ถ้าตอบก่อน F1 (orchestrator แทน `F10` เป็น `F06b` ใน ID และชื่อไฟล์ได้ทันที) · ถ้าเริ่มไปแล้ว **(ก)** | ก่อนวางแผน Phase 4 |

## 8. ความเสี่ยงใหม่ (เสนอลง `studio/risks.md` ในรอบ plan-sync ถัดไป · ไม่อยู่ใน writes ของงานนี้)

- R-F10-1 ผู้เล่นเข้าใจว่า login จริง แล้วคาดว่าข้อมูลข้ามเครื่องได้ · ลดด้วย copy T11 (ไม่สัญญา sync/อีเมล) + ตรวจใน copy gate
- R-F10-2 ใช้ logo Google/Apple ผิดเงื่อนไขแบรนด์ · ลดด้วยนโยบาย T02 (ป้ายข้อความ) + visual gate
- R-F10-3 ตัวกรองคำไม่สุภาพภาษาไทยเลี่ยงได้ง่าย (สะกดแปลง) · ชื่อไม่แสดงให้ผู้อื่นใน Phase 2 จึงผลกระทบต่ำ · Phase 3 ต้องตรวจซ้ำที่ server
- R-F10-4 ขั้นใหม่ 3 ขั้น (login, สร้างตัวละคร, เรื่อง 5 slide) ดันเวลาถึงรางวัลก้อนแรกเกินเป้า 10 นาทีของ F06 · design gate T23 และ product gate T24 ตรวจ
- R-F10-5 flow เปลี่ยนหลัง product gate F04–F06 PASS และหลัง smoke/playtest build ที่คนเตรียม · คนจัดการ playtest เอง (D-149) แต่ควรรู้ว่า build ที่มี F10 ต่างจาก build ที่ผ่าน gate F06 (O-14: commit ใหม่ใน `apps/client/` → smoke ซ้ำ)
