สถานะ: COMPLETE — AGENT SIDE, WAITING FOR HUMAN

# Phase 2 Close Report (interim, จบ Run 2) — Dungeon loop เล่นได้ (client-first)

เจ้าของ: producer (P2-CLOSE-PM interim · orchestrator เขียนลงไฟล์แทนเพราะ harness ไม่ให้ subagent เขียนไฟล์ report) · วันที่: 2026-09-30 · HEAD `714cd82` (P2-W22) · อ้างอิง: `studio/phases/phase-2/board.md`, `studio/phases/phase-2/ledger.md` (Run 1 + Run 2), `qa/reports/phase-2-regression.md` (interim run 2), gate report 12 ฉบับ + flow approval 2 ฉบับ, `studio/decisions/decision-log.md` (D-086..D-143), `studio/questions/open-questions.md`, `studio/risks.md`, `studio/phases/phase-2/plan-sync-w16.md`
หมายเหตุ: ฉบับ interim · ฉบับปิดจริงเขียนใหม่หลัง P2-CLOSE-QA ตัวจริง, P2-F06-T29 และ P2-C08

## 1. สรุป
- ฝั่ง agent ครบ: lint (รวม lint:copy/lint:config), typecheck, `pnpm test` 217 ไฟล์ / 3,113 test ผ่าน (2 skip โดยเจตนาตั้งแต่ Phase 1), build, bundle budget (initial 0.119/1.000 MB · map lazy 0.350/0.700 MB), e2e 106/106 (android-chrome + ios-safari), vector `--check` 19 ไฟล์, trace `--check`, tiles test 71/71, gitleaks ทั้ง history, forbidden-file guard, billing-guard / lint-headers / bbox-guard เขียวทั้งหมด (regression §1–2)
- `qa/bugs.md` ไม่มี OPEN · BUG-P2-002 (high) ปิดแล้ว · ทุก gate PASS ในรอบล่าสุด (หัวข้อ 4)
- คำถามหลักของ phase "สนุกไหมที่ต้องเดินไปหา" **ยังไม่มีคำตอบ** เพราะ playtest เดินจริง (P2-F06-T27) ยังไม่เกิด · loop F04–F06 เล่นได้ครบด้วย MockLocationProvider
- board: **203 แถว · DONE 179 · HUMAN 8 · TODO 11 (รอผลคน/สนามทั้งหมด) · CUT 5**
- CUT 5 แถวเป็นการรวมงาน ไม่ได้ตัดขอบเขต: P2-F04-T07 → T16, P2-F06-T15 → P2-F04-T10, P2-X08 → X11, P2-H03 → F05-T10 + F06-T10, P2-H14 → X29 + F06-T14 · CUT ส่วนย่อย: V-37 rift-reveal → Phase 3 (plan-sync W16 O-16)
- ไม่พบช่องว่างของเกณฑ์ปิดที่ agent แก้ได้

## 2. เกิดอะไรขึ้นระหว่าง run
- **Run 1** (2026-09-26 18:33 → 09-27 17:47, W1–W11, ledger #7–#145): ADR 0003, spec/PRD/tech note, engine, client F04/F05, gate F04+F05 ครบ · usage limit 2 ครั้ง (W4, W6) resume ได้ทุกงาน · ตัวจัดสิทธิ์ปฏิเสธ 3 เรื่อง (X04 → D-111, H30 → D-132 แล้วผู้ใช้พลิกเอง, 4 edit ของ plan-sync W7) · plan-sync W7 เพิ่ม 8 แถว
- **Run 2** (2026-09-28 00:04 → 09-30, **W12–W22 = 11 wave**, ledger #146–#212): ปิดสาย F06 (onboarding, pocket screen, consent/age gate, export telemetry), gate F06 ทั้งชุด และ product gate F04–F06 · plan-sync W16 (21 op) + P2-RISK-02
- **escalation ถึงคน:** visual gate F04–F06 (P2-F06-T23) NEEDS_CHANGES ครั้งที่สองใน W18 → Q-P2-14 → คนตอบ 2026-09-30 เลือก fix รอบแคบ R2-1..R2-5 (D-140) → X52/H53/H54/H55 → รอบ 3 PASS
- **บั๊ก engine:** trace `synthetic-suspended-leelawadee-01` (P2-H57) ทำให้เห็นว่า reducer ยิง `run_tick_denied` tickIndex 0 ซ้ำเมื่อกลับจาก Grace/Suspended (scratch accumulator เริ่มที่ k 0 ใหม่ ขัด tech note F05 §3.5) · **P2-X54** แก้ด้วย `gateAccumulatorResume` + regression test · ไม่แก้ vector · H58 ยืนยันแล้ว
- orchestrator ตรวจพบของที่ขาดเอง: ไม่มีปุ่ม export telemetry ใน UI → P2-X50 + X51 · DG6-05 `clock_invalid` จาก Mock `loop=1` คือ timestamp ถอยหลังของ Mock clock (แก้ใน X47 ไม่กระทบ Web provider)
- เลข decision ชนกัน 1 ครั้ง (H53 เสนอ D-142 → ใช้ D-141) · Run 2 ไม่มี stall หรือ usage limit
- จุดหยุด Run 2 ตาม O-20: ready list เหลือเฉพาะ HUMAN และแถวที่รอผลของ HUMAN · Run 3 เริ่มเมื่อคนส่งผล P2-C02 / P2-F04-T11 หรือ P2-F06-T27

## 3. ผลต่อ feature

### F04 — Dungeon Presence และ Run State
- ส่งมอบ: `design/features/F04-dungeon-presence.md` (R01–R39) · `product/prd/F04-dungeon-presence.md` · `docs/adr/0003-client-first-game-core.md` · `docs/tech/F04-dungeon-presence.md` · `design/ux/flows/F04-dungeon-presence.md` + wireframe · `data/dungeons/{dungeons.json,pilot.geojson,README.md,LICENSE-DATA.md}` (ODbL, D-091) · `design/levels/{bangrak-plan.md,pilot-dungeons.md}` · `packages/geo/` (leaf: filter, hysteresis, polygon, reward-window, grid) · `packages/shared/src/run/` · `packages/shared/schemas/` + `tools/config-lint/` + `tools/dungeons/` · `config/app/{privacy,telemetry}.json` · `apps/client/` (plumbing, UI F04, HUD probe, code-split) · `qa/plans/F04-test-plan.md`, `qa/tests/F04/`, `data/gps-traces/qa/` · `product/metrics.md` §9 (GR-1)
- ตัวเลข: coverage รันซ้ำ usable 730 → 693 (P2-F04-T03, P2-H11) · นำร่อง 20 แห่ง · GR-1 ผ่าน guardrail ครบ 3 ย่าน 2 รอบ · speed lock ฝั่งผู้เล่นใช้ความเร็วดิบ (ไม่รอสนาม)

### F05 — Movement Gate, Reward Tick และ Drop
- ส่งมอบ: `design/features/F05-movement-gate-reward.md` (R01–R28) · `product/prd/F05-movement-gate-reward.md` · `docs/tech/F05-movement-gate-reward.md` · `design/ux/flows/F05-movement-gate-reward.md` · `config/balance/*.json` · `design/systems/test-vectors/` (19 ไฟล์) · `packages/shared/src/{formulas,config,reward,session}/` · `apps/client/` F05 · `art/assets/` · `art/vfx/` · `audio/manifest.json` (22 cue) · build profile playtest (P2-F05-T14) · `qa/plans/F05-test-plan.md`, `qa/tests/F05/`
- ตัวเลข: vector ผ่านทั้งหมดแบบค้นหาอัตโนมัติ · E3 วางนิ่ง 0 tick · E4 ม้านั่งมี jitter ได้ tick (synthetic) · **ยังค้าง:** speed lock แบบกรอง (P2-F05-T12 → T13 → T19) รอ trace จริงจาก P2-C03/C04

### F06 — HP, Damage และ 10 นาทีแรก
- ส่งมอบ: `design/features/F06-hp-damage-onboarding.md` · `product/prd/F06-hp-damage-onboarding.md` · `docs/tech/F06-hp-damage-onboarding.md`, `docs/tech/asset-delivery.md` · `design/ux/flows/F06-hp-damage-onboarding.md` · `packages/shared/src/hp/` + session · `apps/client/` (HP, inventory, settings, far/outside, consent + age gate 15+, priming screen, onboarding 0–10, pocket screen, export telemetry, popup ยืนยันแสดง HP) · `tools/art/` · `.github/workflows/ci.yml` · `qa/plans/F06-test-plan.md`, `qa/tests/F06/` · ชุด playtest `qa/playtest/{phase-2-kit.md,phase-2-observer-form.md,phase-2-parental-consent.md,safety-briefing.md}`, `product/playtest/{phase-2-questionnaire.md,phase-2-plan.md}` · `design/levels/F06-C32-team-walk-dungeon.md` · ภาพ `art/reviews/screens/F04-F06/`
- ตัวเลข: E6 อยู่รอดราว 44.4 นาทีถึง auto-retreat (D-020) · รางวัลก้อนแรกคือ `run_tick_granted` ที่ `firstEver` ไม่มี code path แยก · ยามาจาก drop ที่ผ่าน gate เท่านั้น

## 4. Gate verdict
| Gate | Task | ไฟล์ | รอบ → ผล |
| --- | --- | --- | --- |
| Flow F04 | P2-F04-T27 | `design/reviews/F04-flow-approval.md` | R1 NEEDS_CHANGES → R2 PASS |
| Flow F05+F06 | P2-F06-T30 | `design/reviews/F05-F06-flow-approval.md` | R1 NEEDS_CHANGES → R2 PASS |
| Tech F04+F05 | P2-F05-T15 | `docs/reviews/F04-F05-tech-gate.md` | R1 NEEDS_CHANGES → R2 PASS (D-129..D-131, D-133) |
| QA F04+F05 | P2-F05-T16 | `qa/reports/F04-F05-qa-gate.md` | R1 PASS |
| Copy F04+F05 | P2-F05-T17 | `design/reviews/F04-F05-copy-gate.md` | R1 NEEDS_CHANGES → R2 PASS |
| Design F04+F05 | P2-F05-T18 | `design/reviews/F04-F05-design-gate.md` | R1 PASS (F04 PASS, F05 PASS) |
| Tech F06 | P2-F06-T20 | `docs/reviews/F06-tech-gate.md` | R1 NEEDS_CHANGES (TG-01..06) → R2 PASS (D-134..D-136) |
| Copy F06 | P2-F06-T22 | `design/reviews/F06-copy-gate.md` | R1 NEEDS_CHANGES (C6-01..05) → R2 PASS |
| QA F06 | P2-F06-T21 | `qa/reports/F06-qa-gate.md` | R1 PASS |
| Visual F04–F06 | P2-F06-T23 | `art/reviews/F04-F06-visual-gate.md` | R1 NEEDS_CHANGES → R2 NEEDS_CHANGES (ครั้งที่สอง, escalate ถึงคน, Q-P2-14) → คนเลือก fix รอบแคบ (D-140) → R3 PASS |
| Design F06 | P2-F06-T24 | `design/reviews/F06-design-gate.md` | R1 NEEDS_CHANGES (DG6-01 popup ไม่มี HP) → R2 PASS (D-142, D-143) |
| Product F04–F06 | P2-F06-T25 | `product/reviews/F04-F06-product-gate.md` | R1 PASS |
| Speed filter | P2-F05-T19 | `docs/reviews/F05-speed-filter-tech-gate.md` | ยังไม่เกิด: รอ F05-T12/T13 ซึ่งรอ P2-C03/C04 |

## 5. Phase Exit Checklist (จาก `qa/reports/phase-2-regression.md` §6)
| # | เกณฑ์ | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| E1 | trace ครบทุก transition รวมเลียบขอบและ drift | MET | QA gate F04+F05 §2 |
| E2 | dungeon ที่ปิดเข้าไม่ได้ | MET | `qa/tests/e2e/f04-closed-dungeon.spec.ts` |
| E3 | มือถือวางนิ่งได้ 0 tick | MET | `engine-movement-gate.test.ts` E3 |
| E4 | ม้านั่งมี jitter ยังได้ tick | MET (โค้ด) / WAITING-HUMAN (เครื่องจริง) | เครื่องจริง = P2-C03 ← P2-C02 |
| E5 | ตรง golden vectors | MET | `vectors.test.ts` + `gen-vectors --check` |
| E6 | เลเวลตรงโซนไม่ใช้ยาอยู่ได้ราว 45 นาที | MET | QA gate F06 §2 E6 |
| E7 | copy สามจังหวะผ่าน content gate | MET | copy gate F06 R2 PASS |
| E8 | ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก | MET | design gate F06 R2 + QA gate F06 + product gate |
| E9 | playtest เดินจริง ≥ 3 คน | WAITING-HUMAN | P2-F06-T27 |
| E10 | playtest report | WAITING-HUMAN | T27 → T28 → T29 |
| E11 | MockLocationProvider เล่นได้ทั้ง loop | MET | QA gate F04+F05 และ F06 · e2e 106/106 |
| E12 | ทุก task DONE/CUT, ทุก gate PASS | MET (agent) / WAITING-HUMAN | regression §4–5 |
| E13 | privacy, ไม่มีบริการคิดเงิน, consent แยก, ปุ่มลบทำงาน | MET (agent) · ส่วนของคน = P2-C07 ขั้น 1 | regression §2 |
| E14 | logic อยู่ใน shared/geo แบบ pure | MET | tech gate ทั้งสอง PASS |
| E15 | CI gate ครบ | MET (local) / WAITING-HUMAN (run บน GitHub) | `.github/workflows/ci.yml` · P2-C07 |
| E16 | speed lock, check-in, ช่องว่าง, รางวัลแรก, ยาจาก drop | MET | `qa/tests/F04/`, `F05/`, `F06/` + design gate |
| E17 | GR-1 ของ 3 ย่านผ่าน G4/S3 | MET | `product/metrics.md` §9.1/§9.2 |
| P1-E5 | test ผ่านใน CI บน GitHub | WAITING-HUMAN | P2-C07 |
| P1-E7 | preview เปิดบนมือถือจริง | WAITING-HUMAN | P2-C01 |
| P1-E10 | เดินทดสอบ 30 + 30 นาที | WAITING-HUMAN | P2-C02 |
| P1-E16 / E17 | Go/No-go ของ F02 (+ ข้อเสนอถ้า No-go) | WAITING-HUMAN | P2-C05 ← P2-C03 |
| P1-E18/E19/E20 | งาน Phase 1 ครบ, ไม่มีพิกัด/secret/บริการคิดเงิน | MET (agent) / WAITING-HUMAN | P2-C06 + P2-C07 |
| P1-CLOSE | Phase 1 เป็น COMPLETE | WAITING-HUMAN | P2-C08 |

## 6. งาน HUMAN ที่ค้าง (ทำตามลำดับนี้)
ก่อนเริ่ม: ตอบ **Q-P2-12** (วันออกเดิน) · ข้อ 1–3 ทำในวันเดียวกันได้ · P2-C07 ขั้น 1 ทำได้ทุกเมื่อ · ระหว่างรอ นัดผู้ร่วม playtest อย่างน้อย 3 คน (15–17 ต้องมีฟอร์มผู้ปกครองที่เซ็นแล้ว, D-092)

**1. P2-C01 — ยืนยัน preview บนมือถือจริง** → ปลด P2-C02, P1-E7
1. บน Android (Chrome) เปิด https://keep-walking-preview.pages.dev · อนุญาตตำแหน่งเมื่อถูกถาม
2. ตรวจว่าแผนที่กรุงเทพฯ ขึ้น ชื่อถนนภาษาไทยอ่านได้ วรรณยุกต์ไม่ลอย · กดปุ่ม "เริ่มหาตำแหน่ง" แล้วจุดตำแหน่งขึ้น · เปิด HUD ได้
3. ทำซ้ำบน iPhone (Safari)
4. ถ่ายภาพหน้าจอเครื่องละ 1 ภาพที่เห็นปุ่มทั้งหมด (ถ่ายนอกบ้านหรือก่อนกดหาตำแหน่ง) · ส่งภาพให้ orchestrator
5. ตอบ "ผ่าน" หรือสิ่งที่ผิด (เครื่อง/เบราว์เซอร์ + อาการ)

**2. P2-F04-T11 — deploy probe + ทดสอบบนสองเครื่อง** (ทำรอบเดียวกับข้อ 3 ได้) → ปลด P2-F06-T12 (คู่กับ C02)
1. GitHub → Actions → "deploy-preview" → Run workflow (ตาม `infra/runbooks/preview-setup.md`) · รอจบสีเขียว · ถ้าหน้าใดขอให้อัปเกรด ให้หยุด
2. เปิด preview บน Android (Chrome) → HUD → probe: กดขอ Wake Lock, กดทดสอบสั่น, จดผล
3. เปิดโหมดตามตัว กดล็อกจอเอง เดินใกล้บ้าน 10 นาที เปิดจอกลับมาดูว่า sample ขาดช่วงหรือไม่
4. ทำซ้ำบน iPhone (Safari) · จด % แบตต้นและท้าย
5. export summary (ไม่มีพิกัด) ของทั้งสองเครื่อง วางใน `qa/playtest/results/<YYYY-MM-DD>-probe-<device>.md`

**3. P2-C02 — เดินทดสอบเชิงเทคนิค 30 + 30 นาที** → ปลด P2-C03, P2-C04, P2-F06-T12, P1-E10, E4 ฝั่งเครื่องจริง
1. อ่าน `qa/playtest/safety-briefing.md` และ `qa/playtest/field-walk-kit.md`
2. ชาร์จทั้งสองเครื่องเต็ม ปิด battery saver จดรุ่น OS เบราว์เซอร์ และ % แบตเริ่มต้น
3. ช่วงเช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 (D-093) ไปสวนสาธารณะ เปิด preview URL อนุญาตตำแหน่ง เปิด HUD เดินต่อเนื่อง 30 นาที (จอเปิด 20 นาทีแรก แล้วเก็บเข้ากระเป๋า)
4. export แบบ `summary` (ไม่มีพิกัด) จด % แบต กรอก `qa/playtest/field-walk-form.md` · ถ้ามีช่วงวางมือถือนิ่ง 5 นาที จดค่า `stationary_5min_accum_m`
5. raw trace เป็นทางเลือก: ถ้ายินยอม export ไปไว้ที่ `qa/playtest/results/raw/` เท่านั้น แล้วบอกว่ายินยอมให้แปลงเป็น recorded trace (P2-C04) หรือไม่
6. ทำซ้ำในซอยแคบที่มีตึกสองข้าง 30 นาที
7. บนทั้งสองเครื่อง: ถ่ายภาพจอ S1, S3, S4 ที่ความสว่าง 100% · บน iPhone จดว่าสั่นได้หรือไม่ และเมื่อล็อกจอเองแล้วจุดยังขยับหรือไม่
8. บันทึกเป็น `qa/playtest/results/<YYYY-MM-DD>-park-<device>.md` และ `...-soi-<device>.md` พร้อม summary CSV

**4. P2-C05 — ยืนยัน Go / No-go ของ map spike** (หลัง P2-C03) → ปลด P2-F06-T26, P1-E16, P1-E17, P2-C08
- อ่าน `docs/tech/F02-spike-results.md`, `product/reviews/F02-spike-criteria.md` → ตอบ (ก) Go (ข) Go พร้อมเงื่อนไข (ค) No-go · ถ้าเงื่อนไขต้องใช้บริการคิดเงิน ต้องเป็น decision อนุมัติค่าใช้จ่ายแยก (D-085) · No-go = หยุด T26 และเรียก plan-sync

**5. P2-C07 — CI เขียว + Billing** (ขั้น 1 ทำได้ทันที · ขั้น 3 หลัง P2-C06)
1. หน้า Billing ของ Cloudflare: แผน Free และไม่มีบริการคิดเงิน · หน้า Billing ของ GitHub: ไม่มีแผนหรือ spending limit เกิน 0
2. ตั้ง billing notification ตาม `infra/runbooks/billing-guard.md` ถ้ารองรับ · ห้ามเปลี่ยนแผน
3. เปิด URL CI run ที่ orchestrator ส่ง ยืนยันว่าเขียวทุก job รวม secret scan
4. ตอบหนึ่งประโยค: "Billing ไม่มีบริการคิดเงิน, CI เขียว" หรือสิ่งที่พบ

**6. P2-F06-T26 — deploy build playtest + smoke** (หลัง C05 = Go และ F06-T12) → ปลด P2-F06-T27
1. GitHub → Actions → "deploy-preview" → Run workflow เลือก profile `playtest` · รอจบสีเขียว
2. เปิด preview บน Android และ iPhone · ตรวจป้าย version ตรงกับ short SHA ที่ orchestrator ส่ง
3. smoke 10 นาทีใกล้ dungeon นำร่อง: consent → เลือก class → เห็นรอยแยก → เดินเข้า → check-in → confirm → เดินจนได้ tick แรก · เก็บมือถือเข้ากระเป๋า 5 นาทีแล้วดูว่า tick ยังขึ้น · จดว่าจอพกกระเป๋า/Wake Lock/การสั่นทำงานบนเครื่องใด
4. แจ้ง "ผ่าน" หรืออาการที่พบ
5. (O-14) ถ้าหลัง smoke มี commit ใหม่ใน `apps/client/` orchestrator แจ้ง SHA ใหม่ → รันขั้น 1–2 ซ้ำก่อน T27

**7. P2-F06-T27 — playtest เดินจริงอย่างน้อย 3 คน** → ปลด P2-F06-T28, E9
1. อ่าน `qa/playtest/phase-2-kit.md` และ `safety-briefing.md` · ชวนผู้ร่วมอย่างน้อย 3 คน · อธิบายว่าตำแหน่งไม่ออกจากเครื่องและผลในเกมไม่ใช่รางวัลจริง
2. ก่อนวันเดิน กรอกเบอร์ผู้ประสานงานใน `safety-briefing.md` §11 · ผู้ร่วม 15–17 ต้องมี `phase-2-parental-consent.md` ที่เซ็นแล้ว เก็บฉบับกระดาษเอง ห้ามถ่ายหรือสแกนเข้า repo
3. นัดที่จุดเริ่มตาม kit ในช่วงเวลาที่ kit ระบุ อ่าน safety briefing ให้ฟัง
4. ให้แต่ละคนเล่นตาม script 30–45 นาทีโดยไม่ช่วยอธิบาย · ผู้สังเกตกรอก `phase-2-observer-form.md` (รวมหัวข้อ 2b ช่วงเลเวล) ด้วยรหัส P1, P2, P3
5. หลังเล่น ตอบ `product/playtest/phase-2-questionnaire.md` · กด "ส่งออกบันทึกการเล่น" ในหน้าตั้งค่าถ้ายินดี (ไม่มีพิกัด)
6. วางคำตอบและไฟล์ export เป็น `product/playtest/results/P<n>.md` โดยไม่มีชื่อ เบอร์ หรือพิกัด

**8. P2-F06-T29 — ยอมรับข้อสรุป playtest** (หลัง T28) → ปลด E10, P2-CLOSE-PM ฉบับจริง
- อ่าน `product/playtest/phase-2-playtest-report.md` → ตอบ (ก) ไป Phase 3 (ข) ไป Phase 3 พร้อมรายการแก้ (ค) แก้ใน Phase 2 ก่อน

ลำดับ agent หลังงานคน (Run 3 ราว 6 wave): C03 + C04 → F06-T12, F05-T12, C06 → F05-T13 → F05-T19 + T28 → CLOSE-QA ตัวจริง + C08 → CLOSE-PM

## 7. Decisions
ACCEPTED ช่วงท้าย Run 1 (2026-09-27): D-129 layout ฐาน `#hud` + สเกล z-index token · D-130 hook ทดสอบอ่านเฉพาะ Mock · D-131 ย้ายการแปลง SessionConfig เข้า shared ก่อน F08 (งาน Phase 3) · D-132 (HUMAN) พลิก `it.fails` ของ BUG-P2-002 · D-133 `allowedOrigins` = self + env first-party
ACCEPTED ใน Run 2: D-134 `swipeUpMinDistance_ratio` · D-135 `positionLogTtl_s` เป็น Group B · D-136 ไม่มี dungeon เปิดหลัง onboarding → temporarilyClosed ที่ใกล้สุด · D-137 edge marker ขยับด้วย transform · D-138 จอ confirm ที่ dungeon ซ้อน ย้ายไป phase ที่มี · D-139 V-30 ข้อ 8/9 ไม่บล็อก · **D-140 (HUMAN) fix รอบแคบของ visual gate** · D-141 art/vfx ถือ transform ของ `.toast` · D-142 ค้างจอ run จน effect จบ · D-143 hit เดียวที่ข้าม 30% และ 25% แสดงแค่ auto-retreat (F06-R16)
PROPOSED ที่ค้าง: ไม่มี

## 8. Assumptions ที่ยังไม่ยืนยัน และคำถามที่เปิด
- **Q-P2-12** วันออกเดิน C01 → C02 + F04-T11 · **บล็อก playtest และการปิด phase** · ยังไม่มีคำตอบตั้งแต่ 2026-09-27
- **Q-P2-11** D-083 ยังใช้ไหม หลังปทุมวันตก G1 และบางรักตก G2 · ไม่บล็อก · ทีมแนะนำ (ก) คงไว้ ตรวจใหม่ก่อน closed beta · ต้องการคำตอบก่อน CLOSE-PM ฉบับจริง
- **Q-P2-13** รับรอง PDPA ของถ้อยคำ consent/privacy ใน Phase 2 หรือ 3 · ไม่บล็อก · ทีมแนะนำ Phase 3 · ถ้าเลือก Phase 2 ต้องทำก่อน T27 ที่มีผู้ร่วม 15–17
- **Q-P2-10** รอบแก้ถ้อยคำ GDD ถัดไป · ไม่บล็อก · ทีมแนะนำต้น Phase 3
- ค้างจากก่อนหน้า: Q-P2-04 (วิธีวัด metric playtest) · Q-P2-08 (ยายังดรอปจาก tick เมื่อร้าน NPC เปิด, ตัดสินตอนวาง Phase 4)
- A-P2-CLOSE-QA-interim-1 ("trace replay suites" = `qa/tests/traces/*.test.ts` + `build.ts --check` + e2e): รอ tech-lead ยืนยัน
- F-16 margin ของ bench-jitter แคบ รับไว้จนมีผลสนาม (P2-C03)

## 9. ความเสี่ยงที่ยกไป Phase 3 (`studio/risks.md`)
- **R-W16-2 / R-P2-01 งานสนามของคนยังไม่เริ่ม** (สูง) → Phase 2 ปิดไม่ได้ · การผ่อนเกณฑ์ต้องเป็นคำตัดสินของคน
- **R-P2-03 + R-W16-8 jitter ของเครื่องจริงกับ gate** (สูง) · ถ้า C03 พบว่าวางนิ่งแล้วผ่าน gate ต้องเปิดงาน systems + QA gate F05 ซ้ำเฉพาะส่วน gate
- **R-P1-02 Wake Lock / จอล็อกแล้ว GPS บนเว็บหยุด** (สูง) · รอ P2-F04-T11 · iOS สั่นไม่ได้ (fallback มีแล้ว)
- **R-P2-16 ผู้ร่วม playtest / ฟอร์มผู้ปกครองไม่ครบ** (กลาง)
- **C1-1 engine ตัดสินผลบน client** หมดอายุเมื่อเริ่ม Phase 3 · tech gate F08 ต้องตรวจว่าถอด `sessionStep` ออกจาก client, `runSeed` ย้ายไป server, hook `seed` หาย, SessionConfig ย้ายเข้า shared (D-131)
- speed lock แบบกรอง (รอ F05-T12/T13/T19) · เพดาน free tier ก่อน raid (batch tick, D-036) · coverage ปทุมวัน/บางรัก (Q-P2-11) · ODbL/PDPA/ผู้ปกครอง
- เสนอปิดในการทบทวน register ครั้งถัดไป: R-W16-1 (gate F06 ผ่านครบ) · R-W16-3/4/5/6 (X41, H50, X47, X48 DONE)

## 10. Backlog ที่ยกไป Phase 3
- **tech/client:** ถอด engine ออกจาก client ตาม C1-1 · D-131 · TG-15 แยก `apps/client/src/f04-app.ts` ก่อน F08 · ล้าง namespace `kw.p2.*` เมื่อ login ครั้งแรก · schema ของ telemetry/dungeons ยังเขียน inline (P2-H21)
- **visual/UX:** V-37 rift-reveal ที่หัว confirm · สีเตือนของ `.confirm-hp-note` (art-director ตัดสินใน content gate ถัดไป) · D-139 ตรวจว่า V-41 ครบ · D-138 · ภาพจอกลางแดด V-17 ก่อน closed beta
- **product/telemetry:** `onboarding_nearest_dungeon_distance` (ทำก่อน regional launch, P2-H50) · telemetry ไม่มีเลเวลผู้เล่น/ช่วงเลเวลต่อ run (ตอนนี้ใช้ผู้สังเกต §2b)
- **data hygiene:** ปัดพิกัด 5 ตำแหน่งใน qa-gate-bench-jitter-01, qa-gate-still-01, qa-gate-speedlock-01 และเพิ่ม generator ให้ qa-gps-gap-2min, qa-gps-jump-01 (P2-H61, ทำใน CLOSE-QA ตัวจริง) · ตรวจภาคสนามทางเข้า dungeon นำร่อง
- **design/content:** Q-P2-10 รอบถ้อยคำ GDD · ปุ่มรายงานสถานที่ (Phase 5) · quick-command 10 ท่า (F09)

## 11. Phase 3 ควรวางอะไรก่อน
1. ห้ามเริ่ม build ของ Phase 3 เต็มจนกว่า P2-F06-T29 ตอบแล้ว · spec และ ADR ของ F07/F08 วางขนานได้
2. ผล P2-C05 และ P2-F06-T29 กำหนดขอบเขต: ถ้า (ข) หรือ (ค) ต้องใส่รายการแก้เป็นงานแรก
3. ADR ของ server (Workers + DO + D1 ตาม D-008) และการย้าย engine ตาม C1-1, D-131, TG-15 เป็นงาน tech แรก
4. งบ free tier (batch tick, alert 50/70%) และ D-036 ก่อนมี backend จริง
5. ตัดสิน Q-P2-10, Q-P2-11, Q-P2-13 ตอนวางแผน

## 12. Product sign-off (product-manager · P2-CLOSE-PRODUCT)

**Verdict ฝั่ง agent: YES พร้อมเงื่อนไข** — build พร้อมสำหรับ playtest ภาคสนาม (P2-F06-T27) จากมุมมองผลิตภัณฑ์ · product gate F04–F06 PASS: ทุกคำถามใน `product/playtest/phase-2-plan.md` §5 มีแหล่งข้อมูลจริง, mapping ของ P2-H50 ยืนยันแล้ว, ปุ่ม export ทำงานจริงไม่มีพิกัด, ไม่มี dark pattern/IAP, E8/PM-S2/PM-M2 ผ่านครบ

**Playtest ต้องตอบอะไร และเกณฑ์ตัดสิน (ล็อกแล้วใน `phase-2-plan.md` §6 ห้ามแก้หลังเห็นผล):**
- คำถามหลัก "สนุกไหมที่ต้องเดินไปหา" — แบบสอบถามข้อ 3.1/9.1/9.2 คู่กับ north star proxy (§4)
- **PASS** (§6.1): ≥ 2/3 คนตอบ 3.1 ≥ 4, มีคนถึงรางวัลแรกอย่างน้อย 1 คน, เฉลี่ย 9.1 ≥ 3.5, ไม่มีเหตุการณ์ความปลอดภัย
- **FIX-FIRST** (§6.2): 7 เงื่อนไข เช่น ความเข้าใจ movement gate ต่ำเป็นวงกว้าง, `no_approach_from_outside` เกิน 3 ครั้งและรู้สึกว่าเกมงอแง, จุดเดินเข้าไม่ถึงจริง, empty screen ทำให้ไม่อยากกลับมา, บั๊ก high/critical, copy `tickDenied` สื่อสารไม่ได้ผล (แก้ที่ copy/UX เท่านั้น ไม่แตะ gate)
- **ESCALATE ให้ HUMAN** (§6.4): เหตุการณ์ความปลอดภัยจริง, ข้อเสนอแก้ movement gate/auto-retreat ทุกขนาด, N ไม่ครบ 3 หรือฟอร์มผู้ปกครองไม่ครบ
- HP ต่ำ/auto-retreat จาก playtest ไม่ใช่เกณฑ์ PASS/FIX-FIRST (R-P2-06) — สัญญาณจริงมาจากการเดินตรวจทีม F06-C32

**เงื่อนไขที่ต้องปิดก่อน T27:**
1. ผู้ร่วมอย่างน้อย 3 คน · อายุ 15–17 ต้องมีแบบยินยอมผู้ปกครองเซ็นแล้วก่อนเริ่ม (เก็บนอก repo, D-092) · ถ้าไม่ครบส่งคนตัดสิน
2. export เป็นความยินยอมรายคน · N ของ proxy แยกจาก N ของแบบสอบถามได้ · ใช้รหัส P1..Pn เท่านั้น ห้ามชื่อ/เบอร์/พิกัดในไฟล์ผล (แผน §9)
3. ก่อนอ่านหมวด 7 ให้ตรวจ observer form §2b ว่า dungeon ครอบเลเวลไหม · "ไม่เห็นคำเตือน 30%" ใน dungeon ที่ไม่ครอบเลเวล (ช่องว่าง 9–19) เป็นพฤติกรรมตั้งใจตาม F06-R16/D-143
4. A-P2-H45-1: `page_hidden_total_s_bucket`/`wake_lock_engaged_share_bucket` อ่านเป็นค่าต่ำสุดเมื่อสงสัยว่ามี reload · ไม่กระทบ north star proxy
5. ไม่จัดเดิน playtest ที่บางรักจนกว่าช่องว่างเวลาเปิดเช้า-เย็นจะปิด (`design/levels/bangrak-plan.md` §5) · ใช้พระนคร/ปทุมวันเป็นหลัก
6. Q-P2-11 ไม่บล็อก T27 แต่ต้องตอบก่อน CLOSE-PM ฉบับจริง

**สถานะ E9/E10:** WAITING-HUMAN ทั้งคู่ · sign-off ผลิตภัณฑ์ฉบับจริงเกิดหลัง P2-F06-T28/T29 เท่านั้น · ฉบับนี้ยืนยันความพร้อมของ build และเกณฑ์ล่วงหน้า ไม่ใช่ sign-off ปิด phase
