# Phase 2 Board — Dungeon loop เล่นได้ (client-first)

สถานะ board: DRAFT rev 2 (P2-PLAN-02, 2026-09-26) — แก้ตาม plan review 3 ฉบับ (game-director, tech-lead, product-manager ทั้งหมด NEEDS_CHANGES) · รอคนทบทวนและตอบคำถามหัวข้อ 6 · Phase 1 ยังไม่ปิด (D-086) งานที่เหลือของ Phase 1 อยู่ในกลุ่ม `P2-C*`
Feature: F04 Dungeon Presence และ Run State · F05 Movement Gate, Reward Tick และ Drop · F06 HP, Damage และ 10 นาทีแรก
Plan review: `studio/phases/phase-2/plan-review-game-director.md`, `plan-review-tech-lead.md`, `plan-review-product-manager.md` · การแก้ทุกข้ออยู่ในหัวข้อ 7

## 1. บริบท

### เป้าหมาย phase (จาก roadmap)
เอาไปเดินจริงแล้วตอบว่า "สนุกไหมที่ต้องเดินไปหา" · backend ยังไม่เต็ม ใช้ logic ร่วม (`packages/shared`, `packages/geo`) ที่ต่อ server ได้ภายหลัง · **MockLocationProvider ต้องใช้ได้เต็มในเฟสนี้**
ปิด phase เมื่อ playtest report สรุปว่า loop สนุกพอไปต่อ หรือระบุสิ่งที่ต้องแก้ · ต้องปิดงานของ Phase 1 ที่ยกมา (P2-C01..C09) ก่อนหรือพร้อมกัน

### แหล่งอ้างอิง
- `studio/roadmap.md` หัวข้อ Phase 2 · `studio/protocol.md` ข้อ 5–9
- GDD: "การเข้าและออก", "เวลาทำการ", "ระดับเลเวลที่เหมาะสม", "Core loop ใน Dungeon", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู", "Progression > Drop table", "ราคา NPC และยา", "สัญญาณขาดและแอปถูกปิด", "Anti-cheat > มาตรการเป็นชั้น", "ความปลอดภัยทางกายภาพ", "ความปลอดภัยผู้เล่นและ PDPA", "หลักการที่ห้ามละเมิด", "M2"
- Phase 1: `studio/phases/phase-1/report.md` หัวข้อ 8–10, `studio/phases/phase-1/board.md` หัวข้อ 1 (ทุกข้อจับคู่ในหัวข้อ 1.9)
- decision: D-002, D-008, D-017, D-020, D-038 (B), D-054, D-057, D-059, D-061, D-062, D-063, D-064, D-072, D-073, D-075, D-079, D-083, D-084, D-085, D-086
- ADR 0001, ADR 0002, `docs/tech/gps-trace-format.md` · ของที่มีอยู่แล้วตามร่าง rev 1 (`design/pillars.md`, flow F03, `config/content/copy.th.json`, `config/balance/*.json`, `design/systems/test-vectors/`, `tools/sim/`, `tools/traces/`, `packages/location/`, `packages/shared/`, `apps/client/`, `audio/cue-list.md`, `art/vfx/specs/motion-direction.md`, `art/assets/avatar/`)

### สมมติฐานของแผนและผลการตัดสิน (rev 2)
- A-P2-PLAN-01-1 **ACCEPTED (tech-lead)** พร้อมเงื่อนไข C1-1..C1-5: ผลบน client ใน Phase 2 ไม่ใช่รางวัลจริง เป็นข้อยกเว้นที่หมดอายุเมื่อเริ่ม Phase 3 · ความ pure บังคับด้วย ESLint · engine รูป reducer `step(state, input, now_ms, params)` · ไม่มี Ajv/`new Function` ใน runtime · state ใช้ namespace `kw.p2.*` และถูกล้างเมื่อ login ครั้งแรกใน Phase 3 (ลงใน ADR 0003 ของ P2-F04-T05)
- A-P2-PLAN-01-2 **ACCEPTED (tech-lead)** พร้อมเงื่อนไข C2-1..C2-6: request ออกเฉพาะ origin ที่อนุญาต · telemetry เป็น ring buffer ในเครื่อง export เป็นไฟล์เท่านั้น · property allowlist ไม่มีพิกัด · export ใช้เวลา relative · run state เก็บ sample เฉพาะที่หน้าต่างปัจจุบันต้องใช้ · ปุ่ม "ลบข้อมูลในเครื่อง"
- A-P2-PLAN-01-3 **ACCEPTED (game-director)** พร้อมเงื่อนไข 5 ข้อ: ระยะเส้นตรงปัดขั้นแบบไม่ปัดลงและมีคำกำกับ · ไม่วาดเส้นทางในแอป · ลิงก์ภายนอกส่งเฉพาะจุดสาธารณะของ dungeon (ไม่มีตำแหน่งผู้เล่นใน URL) · dungeon ที่ปิดแสดงเวลาเปิดถัดไป และ onboarding เลือกเฉพาะที่เปิด · tech-lead ยืนยันรูปแบบลิงก์ใน P2-F04-T14
- A-P2-PLAN-01-4 รอคน (คำถาม Q-H1 หัวข้อ 6): polygon นำร่องจาก OSM เผยแพร่ใต้ ODbL พร้อม attribution
- A-P2-PLAN-01-5 รอคน (คำถาม Q-H2): ผู้ร่วม playtest เป็นผู้ใหญ่ 18+ ที่คนชวนเอง
- A-P2-PLAN-01-6 **ACCEPTED (tech-lead) + ข้อขยาย ACCEPTED (producer)**: backend-programmer ถือ engine ทั้งชุดใน `packages/shared`: `src/formulas` + `src/config` (P2-F05-T02), `src/run` (P2-F04-T20), `src/reward` + `src/session` (P2-F05-T08), `src/hp` + `src/session` (P2-F06-T06) · เหตุผลของ producer: run state ตัดสินว่าอยู่ใน dungeon ซึ่งมีผลต่อรางวัลและย้ายไป CellDO ใน Phase 3 เหมือน reward (หลักเดียวกับ A-6 เดิม), gameplay-programmer เป็นคอขวดของทั้ง phase (ลดจาก 10 เหลือ 8 งาน), backend ว่างใน W2–W3 · เงื่อนไข: backend ไม่เขียน Worker/DO/D1/wrangler ใน Phase 2 (D-085) และเขียนตามสัญญาใน tech note ไม่ใช่ตามโค้ด client · ไม่แตะเกณฑ์ปิด roadmap จึงไม่ต้องถามคน (orchestrator ลง decision log)
- A-P2-PLAN-01-7 (แก้ตาม tech-lead 1.4): งานที่ต้องใช้หลักฐานจากสนามมีเพียง P2-C03, C04, C06, P2-F06-T12, P2-F05-T12, T13, T19 และ P2-F06-T26 · งานอื่นทั้งหมดใช้ feature detection + fallback หรือค่าที่วัดจาก `dist/` ได้ จึงไม่รอสนาม · ไม่มีงานสนามบนเส้นวิกฤต
- A-P2-PLAN-01-8 (แก้): 2 wave แรกมี 12 ช่องแต่มี 17 role ที่มีงาน และช่องทั้งหมดใช้กับงานบนเส้นวิกฤต · role ที่ได้งานแรกใน W1–W2: tech-lead, game-director, location, level, product-manager, systems, backend, gameplay · W3: uiux, art-director · W4: narrative · W5: artist · W6: qa, vfx, sound, devops · W8: producer (P2-RISK-01)
- A-P2-PLAN-02-1 คำตัดสินของ game-director ที่ต้องลง decision log (handoff ถึง orchestrator): ยาใน Phase 2 มาจาก drop ของ tick ที่ผ่าน gate เท่านั้น ไม่มีชุดยาตั้งต้น · รางวัลก้อนแรกของ onboarding = reward tick ปกติ ไม่มี code path แยก · Phase 2 ซ่อนจำนวนคนใน dungeon และจำนวนลงทะเบียนต่อจังหวัด (ไม่แสดง 0 หรือเลขปลอม) · gate รวม F04 + F05 รับได้ตามเงื่อนไขในตาราง gate ด้านล่าง

### กฎ path ร่วม (ใช้ทุก wave)
- 1 task ต่อ agent ต่อ wave · ไม่เกิน 6 task ต่อ wave · Writes ห้ามทับกันภายใน wave (orchestrator ตรวจ) · agent ไม่ commit (D-017) orchestrator commit ตอนจบ wave และ push ได้ (D-086)
- **root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`:** P2-F04-T05 (W1) ติดตั้ง dependency ของทั้ง phase ล่วงหน้าพร้อม pin และตั้ง include ของ vitest ให้ครอบ `tools/config-lint`, `tools/dungeons`, `tools/art` · P2-F06-T07 (W5) แตะเฉพาะ script `build` ของ root `package.json` · งานอื่นต้องการ dependency ใหม่ให้ handoff ถึง tech-lead แล้วใช้ assumption ระหว่างรอ
- **`apps/client/` + `config/app/client.json`:** gameplay-programmer เท่านั้น (ยกเว้น `apps/client/package.json` ที่เป็นของ P2-F04-T05)
- **`packages/shared/`:** subpath exports ประกาศล่วงหน้าใน `packages/shared/package.json` โดย P2-F04-T05 (`./formulas`, `./config`, `./run`, `./reward`, `./hp`, `./session` → `./src/<x>/index.ts`) · แต่ละงานถือ `index.ts` ในโฟลเดอร์ตัวเอง · barrel ราก `src/index.ts` ไม่มีงานใดแก้ · เจ้าของโฟลเดอร์: `src/formulas`, `src/config` (P2-F05-T02), `src/run` (P2-F04-T20), `src/reward` + `src/session` (P2-F05-T08), `src/hp` + `src/session` (P2-F06-T06) ทั้งหมด backend-programmer · `packages/shared/schemas/config/` (P2-F04-T24, tech-lead) · `packages/shared/schemas/dungeon.schema.json` (P2-F04-T26, location) · tech-lead เป็นเจ้าของสัญญาของแพ็กเกจ
- **`packages/geo/`:** location-engineer (P2-F04-T12, P2-F05-T13) · เป็น leaf ไม่มี dependency `@keep-walking/*` · stub โดย P2-F04-T05
- **`config/balance/*.json`:** systems-designer เท่านั้น ยกเว้น `dungeons.json` ส่วน `coverageFilter` ที่ P2-F04-T03 ถือใน W1 · **`config/app/privacy.json`, `config/app/telemetry.json`:** tech-lead (P2-F04-T14)
- **`tools/`:** `tools/sim` = systems · `tools/traces`, `tools/coverage`, `tools/tiles`, `tools/dungeons` = location · `tools/config-lint`, `tools/art` = tech-lead
- **`config/content/copy.th.json`, `names.th.json`, `copy-rules.json`, `design/narrative/world.md`:** narrative-designer เท่านั้น · UI อ่าน key เท่านั้น
- **`qa/`** (รวม `qa/bugs.md`, `data/gps-traces/qa/`): qa-tester · **`data/gps-traces/synthetic/`, `recorded/`, `README.md`:** location-engineer
- **`.github/workflows/`, `infra/`, `docs/tech/environments.md`:** devops-engineer เท่านั้น
- **`art/assets/manifest.json`:** artist-2d · `art/assets/manifest.schema.json`, `art/assets/manifest.build.json` (ผลของ `tools/art`): P2-F06-T07
- **GDD:** แก้ได้เฉพาะ P2-C09 (game-director) ตามถ้อยคำที่ D-084 อนุมัติ งานอื่น read-only

### กฎคุมค่าใช้จ่าย (D-001 → D-085)
- บัญชี Cloudflare ผูกบัตรแต่อยู่แผน Free · **agent และ workflow ห้ามเปิดบริการหรือแผนที่คิดเงิน** (Workers Paid, R2, Images, Stream, Argo, Load Balancing, Logpush, GitHub Actions/Packages เกินโควตาฟรี, Codespaces ฯลฯ) · token มีสิทธิ์แค่ Cloudflare Pages Edit
- พบว่าต้องใช้บริการคิดเงิน ให้หยุดส่วนนั้นและรายงาน `PARTIAL`/`BLOCKED` พร้อมคำถามถึงคน · Phase 2 ไม่มี backend จริงและไม่มีบัญชีใหม่ · backend-programmer ไม่เขียนโค้ด Worker/DO/D1
- deploy preview ทำโดยคนกด workflow `deploy-preview` เท่านั้น ไม่มี deploy production
- การนำทางไม่ใช้ routing API หรือ API key ใด (A-P2-PLAN-01-3)

### กฎ repo public (D-002) และ PDPA
- ห้าม commit secret, `.env*` ที่มีค่า, raw GPS trace, ข้อมูลส่วนบุคคล, คำตอบที่ระบุตัวคน · ผล playtest ใช้รหัส P1, P2, P3 และเวลา relative (C2-4)
- client ขอ consent ตำแหน่งแยกก่อนใช้ GPS และมี age gate 15+ (scaffold) · ไม่มีข้อมูลตำแหน่งออกจากเครื่อง · sample ในเครื่องเก็บไม่นานกว่าเพดานใน `config/app/privacy.json` และลบเมื่อ run จบ (GD B-08, C2-5) · มีปุ่มลบข้อมูลในเครื่อง (C2-6)

### กฎงานที่ขึ้นกับผลเดินทดสอบ (D-086 · แก้ตาม tech-lead 1.4 / B-11)
- รอผลสนามเฉพาะงานที่ค่าหรือข้อสรุปมาจากข้อมูลสนาม: P2-C03 (deps P2-C02), P2-C04 (P2-C02), P2-C06 (P2-C03, C04), P2-F06-T12 (P2-F04-T11 + P2-C02), P2-F05-T12 (P2-C03 + P2-C04 · ถ้า C04 = CUT ใช้ synthetic `soi-occluded` + `driving-40kmh`) → P2-F05-T13 → P2-F05-T19, และ P2-F06-T26 (P2-C05 + P2-F06-T12 · ไม่ให้คนนอกเล่นบน stack ที่ยังไม่ Go)
- ไม่รอสนาม: pocket screen + Wake Lock + fire-together (P2-F06-T14 ใช้ feature detection และมี fallback ทาง B เสมอ), cue fallback (P2-F06-T13), code-split + งบ bundle (รวมใน P2-F04-T10 · วัดจาก `dist/`), CI bundle (P2-F06-T16), tech gate F06 (P2-F06-T20) · ถ้า matrix ของ P2-F06-T12 พบพฤติกรรมต่างจากที่ใช้ orchestrator เปิด fix task (X) ให้ gameplay
- P2-F06-T14 ยืนยันบนเครื่องจริงผ่าน P2-F06-T26 (smoke) · speed lock ฝั่งผู้เล่น (ล็อกการเล่นที่ `anticheat.speedLock.speedLock_kmh` จากความเร็วดิบ) อยู่ใน P2-F04-T20 ไม่รอสนาม · ตัวกรองความเร็วของ P2-F05-T13 แทนที่ฟังก์ชันเดิมโดยไม่เปลี่ยน signature
- ถ้า P2-C05 = No-go: หยุด P2-F06-T26 และงานที่รอผลสนาม แล้วเรียก producer ทำ plan-sync

### เลือก gate ต่อ feature (protocol ข้อ 6)
| Feature | Gate | เหตุผล / เงื่อนไข |
| --- | --- | --- |
| F04 + F05 | Tech (P2-F05-T15), QA (P2-F05-T16), Content copy (P2-F05-T17), Design (P2-F05-T18) · Content visual และ Product รวมกับ F06 | engine ร่วมและเสร็จช่วงเดียวกัน · **เงื่อนไขของ game-director:** (1) รายงานทุก gate รวมมีหัวข้อแยก F04 และ F05 พร้อม verdict ย่อย verdict รวม = NEEDS_CHANGES ถ้า feature ใดไม่ผ่าน (2) NEEDS_CHANGES ครั้งที่สองของ gate รวม escalate ถึงคนสำหรับทั้งสอง feature ในรายงานเดียว (3) design gate ตรวจ "gate เดียวไม่มีข้อยกเว้น" ครอบทุกทางที่ให้ของ รวม D-059 และรางวัลก้อนแรกของ onboarding (4) flow ของ core loop ผ่านการอนุมัติก่อน build (P2-F04-T27, P2-F06-T30) |
| F06 | Tech (P2-F06-T20), QA (P2-F06-T21), Content copy (P2-F06-T22), Design (P2-F06-T24) | copy สามจังหวะเป็นเกณฑ์ปิด · design gate ตรวจ "ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก", "movement gate กับ auto-retreat อยู่ด้วยกัน" และ regression F04/F05 |
| F04–F06 | Content visual (P2-F06-T23), Product (P2-F06-T25) | ภาพและ telemetry ต้องดูทั้ง loop · product gate ก่อน playtest |
| Flow ของ core loop | P2-F04-T27 (flow F04), P2-F06-T30 (flow F05 + F06) · game-director | protocol ข้อ 5 "game-director approves core-loop flows" (GD B-01) |
| Speed filter | P2-F05-T19 (tech-lead) | แยกจาก tech gate F06 เพื่อไม่ให้สายสนามขวาง gate → QA → playtest (TL B-11) |

### คำตอบจากคน (orchestrator กรอก)
| วันที่ | คำถาม / decision | คำตอบ | กระทบ task |
| --- | --- | --- | --- |
| 2026-09-25 | D-083 Go ของ coverage และย่านเปิดตัว | Go · 3 ย่าน: พระนคร + ปทุมวัน + **บางรัก** · สถานที่อ่อนไหว: ตัดถาวร #1–5, #8, #12–17, #20, #22, #23 · ปล่อย #9, #11 · #6, #7, #10, #18, #19, #21, #24, #25 ยังไม่ใช้จนตรวจเพิ่ม | P2-F04-T03, T04, T13, T18 |
| 2026-09-25 | D-084 world H-01..H-13, pillars, ถ้อยคำ GDD | รับตามคำแนะนำทั้งหมด · อนุมัติแก้ถ้อยคำ GDD ตาม D-004/005/006/015/020/021/022/030/038 B/080 | P2-C09, P2-F04-T16 |
| 2026-09-25 | D-020 เวลาอยู่รอด | ACCEPTED: 45 นาที = ถึง auto-retreat ที่ damage ×1.0 · solo non-Tanker ~27.8 นาทีรายงานแยก | P2-F05-T01, P2-F06-T02, T18, T19, E6 |
| 2026-09-25 | D-038 อัตราส่วนรายได้/ยา | ทาง B: `vitPotionEfficiency_pct` 2 → 1 ต่อแต้ม ต้องลง config + vectors ก่อน F06 | P2-F06-T01 → P2-F06-T06 |
| 2026-09-25 | D-085 billing | บัตรผูกอยู่แต่ Free plan · ห้ามเปิดสิ่งที่คิดเงิน · token = Pages Edit เท่านั้น | P2-F04-T08, P2-C07 |
| 2026-09-26 | D-086 วาง Phase 2 ขณะ Phase 1 ยังไม่ปิด | ย้ายงานที่เหลือของ Phase 1 มาเป็น P2-C01..C08 · งานที่ต้องใช้ผลเดินรอ P2-C02/C03/C05 ตามกฎข้างบน | หัวข้อ 1 "กฎงานที่ขึ้นกับผลเดินทดสอบ" |
| 2026-09-26 | D-091 Q-H1 (Q-P1-16) ODbL | (ข) เผยแพร่ polygon นำร่องใต้ ODbL 1.0 + attribution "© OpenStreetMap contributors" · ทวนกับนักกฎหมายใน F20 | P2-F04-T13 (push ได้) |
| 2026-09-26 | D-092 Q-H2 ผู้ร่วม playtest | **(ข) รวมอายุ 15–17** โดยต้องมีแบบฟอร์มยินยอมของผู้ปกครองแบบกระดาษที่เซ็นก่อนเดิน · อายุต่ำกว่า 15 ไม่รับ · ผู้ร่วม 15–17 เดินกับทีมหรือผู้ใหญ่ตลอด · ฟอร์มที่เซ็นแล้วเก็บนอก git (ห้าม commit/สแกนเข้า repo) | P2-F06-T18 (เพิ่มฟอร์มผู้ปกครอง), P2-F06-T19, P2-F06-T27 |
| 2026-09-26 | D-093 Q-H3 ช่วงเวลาเดิน | **(ค) ทุกการเดินช่วงเช้า ~07:00–09:30 หรือเย็น ~16:30–18:30** รวมเดินเชิงเทคนิค · ไม่มีการเดินกลางแดดจัด → ภาพจอกลางแดด V-17 และแบตในสภาพโหดสุดไม่มีหลักฐานจากสนาม (ความเสี่ยงยกไป P2-RISK-01, ตรวจกลางแดดเลื่อนไปก่อน closed beta) | P2-C02, P2-F04-T11, P2-F06-T18, P2-F06-T23, P2-F06-T27 |

### งานของ Phase 1 ที่ย้ายมา (D-086)
| ID ใหม่ | ID เดิม | สถานะตอนย้าย |
| --- | --- | --- |
| P2-C01 | P1-F02-T19 | preview deploy แล้วและตรวจ headless แล้ว (client https://keep-walking-preview.pages.dev · map https://keep-walking-map.pages.dev) · เหลือคนเปิดบน Android + iPhone จริง |
| P2-C02 | P1-F02-T20 | ยังไม่เดิน |
| P2-C03 | P1-F02-T21 | TODO รอ P2-C02 |
| P2-C04 | P1-F02-T24 | TODO รอ P2-C02 · ไม่มีความยินยอม = CUT |
| P2-C05 | P1-F02-T23 | HUMAN รอ P2-C03 |
| P2-C06 | P1-CLOSE-QA รอบ 2 | รอบ 1 PASS ฝั่ง agent · รอบ 2 รอ P2-C03, C04 |
| P2-C07 | P1-F02-T26 | orchestrator push เองได้แล้ว (D-086) · คนเหลือตรวจ Billing + เปิด URL CI |
| P2-C08 | (ใหม่) ปิด Phase 1 | producer อัปเดต board/report ของ Phase 1 เป็น COMPLETE |
| P2-C09 | ผลของ P1-F03-T28 (D-084) | game-director แก้ไฟล์ GDD ตามถ้อยคำที่อนุมัติแล้ว |

### 1.9 จับคู่รายการ "งานที่ยกไปให้การวางแผน Phase 2" (Phase 1 board หัวข้อ 1) กับงาน
ทุกข้อต้องเป็นงาน, รวมในงาน, ปิดแล้ว, หรือเลื่อนพร้อมเหตุผล · แถวที่ rev 2 เปลี่ยนปลายทางมีคำว่า (rev 2)
| ต้นทาง | รายการ | ปลายทาง |
| --- | --- | --- |
| P1-X42 | main.ts ส่ง tilesUrlMissing ผ่าน getCopyText | P2-F04-T10 |
| P1-X42 | area `client` ใน copy-rules.json (ปิด WARN S1) | P2-F04-T16 (rev 2 · รวม T07) |
| P1-X42 | ตรวจป้ายปุ่ม 11 cell บนจอจริง | P2-C01 ขั้น 4 → P2-F04-T06 |
| P1-X41 | ต่อ `test-lint-headers.sh` เข้า CI | P2-F04-T08 |
| P1-X39 | bbox-vs-province ใน CI ด้วย polygon จังหวัดขนาดเล็ก | P2-F04-T23 → P2-F06-T16 |
| D-085 | CI/runbook ตรวจสิทธิ์ token + `infra/` ไม่เรียกบริการคิดเงิน · runbook billing notification | P2-F04-T08 · HUMAN ตั้ง alert ใน P2-C07 |
| D-083 | แผนบางรัก + dungeon นำร่อง | P2-F04-T04 → P2-F04-T13 |
| D-083 | reviewOsmIds + รัน pipeline ซ้ำ | P2-F04-T03 |
| D-083 / D-081 | GR-1 ใหม่ของ 3 ย่าน | P2-F04-T18 (rev 2 · W2 + กฎสลับ) |
| D-084 | แก้ไฟล์ GDD ตามถ้อยคำที่อนุมัติ | P2-C09 |
| D-084 | world.md รับธง H-01..H-13 | P2-F04-T16 (rev 2 · รวม T07) |
| D-038 B | vitPotionEfficiency +2% → +1% ใน config + vectors | P2-F06-T01 |
| P1-CLOSE-PRODUCT | บันทึกบั๊ก high ของ P1-H06 ย้อนหลังใน qa/bugs.md | P2-F04-T09 |
| P1-F03-T25 B-01 | farDungeonThreshold_m ≤ 1,970 (เสนอ 1,900) ตาม D-079 | P2-F06-T01 |
| B-02 | dungeons.safety ตาม D-061 ที่แก้ | P2-F05-T01 |
| B-03, B-04 | R-B1 ใน balance-model 3.1 + vector ขอบ · partyMult cap ใน raid.json | P2-F06-T01 |
| B-05 | F-12b | เลื่อน Phase 4 (ขอบเขต F11/F12) |
| B-06, B-07 | telemetry (run_death, run_auto_retreat, exit_reason, event auto-retreat) + metrics (P2, party ratio D-039, ratio รายได้/ยา, 10.1 ตาม D-063, GR-9) | P2-F04-T17 (reason_category enum เลื่อน Phase 5) |
| B-08 | pillars 7.1 ตาม D-072/B-01 · R-B1/D-059 ใน spec F05 · D-061 ใน spec F13 | P2-F06-T02 · P2-F04-T01 · F13 เลื่อน Phase 5 |
| P1-F03-T22 | V-18 clipPath, V-19 composite + panel กลางคืน, ref.style-tile.v1 approved | P2-F05-T04 |
| P1-F03-T22 | V-20 ขอบ toast, V-22 gps-pill ≥14 px, V-15 chip-sponsored, V-16 tokens | P2-F04-T06 → client ใน P2-F06-T08 (rev 2) |
| P1-F03-T22 | V-21 Rare ใช้ความหนาขอบ/scale | P2-F05-T05 |
| P1-F03-T22 V-10 | e2e นับ kw-rift-sponsored/crack, ถ่าย S1/S3 ใหม่ + S6 | P2-F04-T09 · รู mask ทะเล S6 → P2-F04-T23 |
| P1-F03-T22 | ความสูงปุ่มแบรนด์ | เลื่อน Phase 3 (F07 login) |
| P1-F03-T22 | F-AD-1..4 (map-style 6.2/6.3/10.1 ตาม D-060, style guide) | P2-F05-T03 |
| P1-X33 | setDungeonsSourceData เข้า main.ts | P2-F04-T21 (artifact จาก P2-F04-T26 · rev 2) |
| P1-X32 | tech note 15.2 ครอบ kw-dungeon-labels + ตัดสิน D-075 + polylabel | P2-F04-T05 (polylabel ใช้ตอน build ใน P2-F04-T26) |
| P1-X32 | static check ใน map-style.test.ts (ไม่มี symbol layer บน kw-dungeons) | P2-F04-T09 |
| P1-H06 | fixture ลุมพินีแคบเกิน S2/S5 | P2-F04-T23 |
| P1-H06 | copy key client.mapSpike.* | ปิดแล้วใน P1-X42 |
| P1-F02-T16 | e2e ถาวร TC-MAP-05, TC-MAP-08 | P2-F04-T09 |
| P1-F02-T16 | DOM environment ของ Vitest สำหรับ S15/S3 ใน hud-panel.ts | P2-F04-T05 (dependency) + P2-F04-T25 (rev 2 · TL B-04) |
| P1-F01-T09 N-01 | คำราชาศัพท์ใน reviewNamePatterns + flag สถานีรถไฟ/ที่เก็บค่าเข้า | P2-F04-T03 |
| N-02 | farDungeonThreshold ตาม D-072 + แสดงระยะเป็นค่าประมาณ | P2-F06-T01 (ค่า) + P2-F04-T15, P2-F06-T03 (แสดงเป็นระยะเส้นตรง ตาม A-3) |
| N-03 | guardrail โซนแดงในและนอกย่านเปิดตัว · หน้าที่บ้านของคนนอกย่านเปิดตัว (D-073) | P2-F04-T17 + P2-F06-T03 + P2-F06-T09 |
| N-04 | ไม่มี level band ที่พึ่ง dungeon เดียว · ชั้นที่สองของดินแดง | P2-F04-T04 · ดินแดง CUT (D-083 เลือกบางรัก) |
| N-05 | วาดขอบเลี่ยงศาล · ตรวจตลาดชื่อ "วัด" ภาคสนาม | P2-F04-T04 เฉพาะแห่งที่ยังใช้ · ภาคสนามเลื่อน Phase 5 (F14) |
| P1-X29 | README หัวข้อ 6, docstring osm.py:27, legend heatmap ผูก config | P2-F04-T23 |
| P1-X29 | ปิด BUG-F01-001/002 ใน qa/bugs.md | P2-F04-T09 |
| P1-F02-T14 | HUD เลือก environment/segment + stationary_5min_accum_m | P2-F04-T10 |
| P1-F02-T15 | F-04 เลิก bundle config ทั้งไฟล์ · F-08 ค่าคงที่ UI เข้า config/app | P2-F04-T05 (สัญญา) + P2-F04-T25 (rev 2 · TL B-13) |
| P1-F02-T15 | F-05b haversine/gate ไป shared | P2-F04-T12 + P2-F05-T08 + P2-F04-T25 (client) + P2-F04-T23 (`tools/traces` · TL N-06) |
| P1-F02-T15 | F-06 code-split + งบ bundle | P2-F04-T10 (rev 2 · รวม P2-F06-T15) + P2-F06-T16 |
| P1-F02-T15 | F-05a ลบ LegacyWebLocationTiming, F-07 excluded ≤ 4.5 MB | P2-F04-T23 |
| P1-F01-T07 | รันซ้ำด้วยสูตร transit D-069, คอลัมน์ pocketPark_walk_median_m, reviewOsmIds | P2-F04-T03 |
| P1-F01-T07 | ดินแดงชั้นที่สอง · ชื่อไม่มีราชาศัพท์ของ #16 | CUT ทั้งสองข้อ: D-083 เลือกบางรัก และตัด #16 ถาวร |
| P1-F01-T06 | run-meta.json บันทึกเฉพาะคีย์ที่อ่านจริง | P2-F04-T23 |
| P1-F01-T06 | PM ยืนยัน A-P1-F01-T06-2/-4/-7 | P2-F04-T18 |
| P1-F03-T24 N-3 | run แรกแสดง dungeon.confirmTutorialLine ก่อน/บนจอพกกระเป๋า | P2-F04-T06 → P2-F06-T10 |
| P1-F03-T24 N-1 | ia.md S-22 ยังมี auto-retreat toggle และ "ภาษา" | P2-F04-T06 → P2-F06-T08 |
| P1-F03-T24 N-2 / P1-X18 | tech note F02 บรรทัด ~424, "นอกพื้นที่" ใช้ mask ผ่าน packages/geo | P2-F04-T05 + P2-F04-T12 |
| P1-F03-T24 | level F-11 (dungeon เลเวลเริ่มต้นใกล้ที่อยู่อาศัย) | P2-F04-T04 |
| P1-F03-T24 / T25 | sound F-13 raid.thirtyMinWarning priority ต่ำกว่า run.hpLow | P2-F05-T06 |
| P1-X18 | PM event anticheat_speed_lock_triggered / checkin_rejected, exit_reason ปิดฉุกเฉิน | P2-F04-T17 · พฤติกรรมที่ยิง event: P2-F04-T20 (rev 2 · GD B-02, B-03) |
| P1-F02-T13 | qa TC-HUD-03..12 หลัง HUD เสร็จ | P2-F06-T11 |
| P1-F03-T24 F-16 | metric raid notice แรก + event Wake Lock/เวลา page hidden ต่อ run | P2-F04-T17 |
| P1-F03-T24 F-17 | Wake Lock + pocket screen, แบต, vibrate/web push matrix | P2-F04-T10 → P2-F04-T11 (HUMAN) → P2-F06-T12 (deps P2-C02 · rev 2) |
| P1-F03-T21 | wireframe 01 interest.confirm, เมนู "ภาษา" S-22, index.html "ยื่นเรื่องเปิดจังหวัด" | P2-F04-T06 |
| P1-F03-T21 | dungeon.vsBossNormalCardHint / vsBossRaidCardHint | เลื่อน Phase 6 (ก่อนสเปก raid) |
| P1-X05 | ADR 0001 ข้อ 3.5, 3.10.1, 3.10.3, 3.11 | ปิดแล้วใน P1-X27 · P2-F04-T05 ทวน |
| P1-X05 | export WebLocationTiming + ลบ alias | P2-F04-T23 |
| P1-X05 / P1-X04 | telemetry-events.md ชี้ config/app/telemetry.json + key จริง | P2-F04-T17 |
| P1-X06 | color.ramp.skin-1..6 / hair-1..6 ใน tokens.json | P2-F04-T06 |
| P1-X06 | regex ramp ใน contrast.test.ts นับ 22 | P2-F04-T09 (deps P2-F04-T06 · rev 2) |
| P1-X06 | map-style.test.ts (validateStyleMin) | ปิดแล้วใน P1-H06 |
| P1-H07 / P1-X04 F-07 | รู mask เป็นขอบพื้นที่ฝั่ง server · จ่ายรางวัลปิดฉุกเฉินฝั่ง server | เลื่อน Phase 3 (F08) · vector ของ D-059 ทำใน P2-F05-T20 (rev 2) |
| P1-F03-T11 | tools/art, validator V1–V13 + manifest.schema.json, วิธีส่ง art ถึง client, vendor font + OFL + sha256 | P2-F06-T07 |
| P1-F03-T11 | field appearance ใน profile API · party card · หน้าสร้างตัวละคร 6×6×6 | เลื่อน Phase 3 (F07/F09) และ Phase 4 (F10) |
| P1-F03-T11 | อวตารบนแผ่น bg.surface · หน้า Credits/ลิขสิทธิ์ | P2-F06-T03 + P2-F06-T09 |
| P1-F03-T11 | vfx ใช้ pose kit ของ avatar-spec §10 | P2-F06-T05 |
| P1-F03-T11 | content config ของอุปกรณ์/cosmetic มี assets.icon/assets.layer | P2-F05-T01 เฉพาะไอเทมที่ drop (รวมยา) · อุปกรณ์/cosmetic เลื่อน Phase 4 |
| P1-F03-T27 | module CSS/WAAPI ใน art/vfx ตาม motion-direction §10 + demo | P2-F05-T05 |
| P1-F03-T27 | artist ยืนยันท่า quick-command 10 ตัว | เลื่อน Phase 3 (F09) |
| P1-F03-T20 | ops/raid-playbook.md, ops/runbooks/ | เลื่อน Phase 5/6 · liveops ไม่มีงานใน Phase 2 ตาม roadmap |
| P1-F03-T20 | tuning playbook ถึง epic/legendary + marketTax · แปลง W1–W13 เป็นวันจริง | เลื่อน Phase 4 และ Phase 8 (F24) |
| P1-F02-T05 | ย้าย listeners.ts/platform.ts ไป src/internal/ (ทางเลือก) | P2-F04-T23 (ทางเลือก) |
| P1-F03-T18 | sound build audio/src, audio/out, manifest, demo | P2-F05-T06 + hook ใน root build ของ P2-F06-T07 (rev 2 · TL B-14) |
| P1-F03-T18 | fire-together 4 ชั้น + priority queue · iOS ไม่มี navigator.vibrate | P2-F06-T13 → P2-F06-T14 (ไม่รอ matrix · rev 2) · web push เลื่อน Phase 8 |
| P1-F02-T04 | speed lock แบบกรอง + กฎปลดล็อกไฟแดง | P2-F05-T12 (deps P2-C03 + C04 · rev 2) → P2-F05-T13 → P2-F05-T19 · lock ฝั่งผู้เล่นแบบดิบ: P2-F04-T20 |
| P1-F02-T04 | R ของ haversine 6,371,008.8 ม. + นิยามหน้าต่าง gate | P2-F04-T05 (แยก `gateDiagnosticWindows` / `rewardWindow`) → P2-F04-T12 |
| P1-F03-T19 | run_tick ไม่เขียน row แยก · enum reason_category | เลื่อน Phase 3 และ Phase 5 |
| P1-F03-T05 | HUMAN ทวนข้อความ legal/PDPA ก่อน closed beta | เลื่อน Phase 7 |
| P1-F03-T05 | wire area ใหม่ของ copy + formatter + flat map | P2-F04-T25 (แกน · rev 2) และงาน client ที่ใช้ area นั้น |
| P1-H01 / P1-H03 | config lint · loader ตรวจ raid.schedule + namespace, location.json, privacy.json | P2-F04-T24 (schema + lint H01 · rev 2) + P2-F05-T02 (loader + H03) |
| P1-F02-T02 | alert 50/70%, tech note F07/F08, copy "เซิร์ฟเวอร์ไม่พร้อม", decision Workers Paid (D-036) | เลื่อน Phase 3 และ Phase 6/7 |
| P1-F03-T07 | port formulas.ts เข้า packages/shared ผ่านทุก vector | P2-F05-T02 (backend · ขยายขอบเขตตาม TL B-05) |
| PM-N02 | PRD F04–F06 ครอบผู้เล่น 3 กลุ่ม | P2-F04-T02 |
| A-P1-PLAN-02-4 | HUMAN P1-F03-T28 | ปิดแล้ว (D-084) · การแก้ไฟล์ = P2-C09 |
| SF-13 | ผล F01 เป็น Go มีเงื่อนไขรายย่าน → ประเมินผลต่อ pillars, preset, หน้าที่บ้าน | P2-F06-T02 |
| report หัวข้อ 6 | D-054, D-057, D-075 ให้ tech-lead ปิด | P2-F04-T05 |
| report หัวข้อ 8 | สร้าง studio/risks.md | P2-RISK-01 |
| GD N-06 (rev 2) | ปุ่มรายงานสถานที่เข้าไม่ถึง (GDD "ความปลอดภัยทางกายภาพ") | เลื่อน Phase 5 (F13/F14 ต้องมี backend) · Phase 2 บันทึกในแบบฟอร์มผู้สังเกตของ P2-F06-T18 |

## 2. ตารางงาน

| ID | Feature | Task | Type | Owner | Deps | Writes | Status | Output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2-C01 | P1 | (เดิม P1-F02-T19) ยืนยัน preview ที่ deploy แล้วบน Android (Chrome) และ iPhone (Safari) จริง + ภาพหน้าจอปุ่ม | research | HUMAN | — | — (orchestrator บันทึกผลในคอลัมน์ Output) | HUMAN | — |
| P2-C02 | P1 | (เดิม P1-F02-T20) เดินทดสอบเชิงเทคนิค (เช้า/เย็นตาม D-093) 30 นาทีในสวน + 30 นาทีในซอย บนสองเครื่อง กรอกผลวัด (raw trace เป็น opt-in) | research | HUMAN | P2-C01 | `qa/playtest/results/` (summary + form เท่านั้น · raw อยู่ใน `qa/playtest/results/raw/` ที่ถูก ignore) | HUMAN | — |
| P2-C03 | P1 | (เดิม P1-F02-T21) สรุปผล spike + คำแนะนำ Go / No-go + jitter ของเครื่องจริงเทียบ gate (TL N-11) | research | tech-lead | P2-C02 | `docs/tech/F02-spike-results.md` | TODO | — |
| P2-C04 | P1 | (เดิม P1-F02-T24) แปลง raw trace ที่คนเดินยินยอมเป็น recorded trace (ไม่มีความยินยอม = CUT) | build | location-engineer | P2-C02 | `data/gps-traces/recorded/`, `data/gps-traces/README.md` | TODO | — |
| P2-C05 | P1 | (เดิม P1-F02-T23) ยืนยันผล Go / No-go ของ map spike | review-gate | HUMAN | P2-C03 | — (orchestrator บันทึกใน decision log) | HUMAN | — |
| P2-C06 | P1 | (เดิม P1-CLOSE-QA รอบ 2) regression ปิด Phase 1 หลังผลเดินทดสอบ | review-gate | qa-tester | P2-C03, P2-C04 | `qa/reports/phase-1-regression.md`, `qa/bugs.md` | TODO | — |
| P2-C07 | P1 | (เดิม P1-F02-T26) ยืนยัน CI run สีเขียวของ push สุดท้ายของ Phase 1 + ตรวจหน้า Billing + ตั้ง billing alert | research | HUMAN | P2-C06, P2-F04-T08 | — | HUMAN | — |
| P2-C08 | P1 | ปิด Phase 1: อัปเดตสถานะ board และ report ของ Phase 1 เป็น COMPLETE พร้อมหลักฐาน | plan | producer | P2-C05, P2-C06, P2-C07 | `studio/phases/phase-1/board.md`, `studio/phases/phase-1/report.md` | TODO | — |
| P2-C09 | P1 | แก้ไฟล์ GDD ตามถ้อยคำที่ HUMAN อนุมัติใน D-084 เท่านั้น + บันทึก diff | spec | game-director | P2-F06-T01 | `เกม GPS Dungeon กรุงเทพฯ — Design Document.md` (เฉพาะหัวข้อที่ D-084 อนุมัติ), `design/reviews/gdd-wording-D-084.md` | TODO | — |
| P2-RISK-01 | ทั้ง phase | Risk register จาก GDD "ความเสี่ยงที่ต้องเฝ้าดู" + Phase 1 report หัวข้อ 8 + ความเสี่ยงใหม่ของ Phase 2 (รวม GR-1/บางรัก) | plan | producer | — | `studio/risks.md` | TODO | — |
| P2-F04-T01 | F04, F05 | Feature spec F04 + F05: presence, run state, check-in, speed lock, เวลาทำการ, นำทาง · gate, rewardWindow, ช่องว่างของ sample, tick, drop, exp, สรุป run, R-B1, D-059 | spec | game-director | — | `design/features/F04-dungeon-presence.md`, `design/features/F05-movement-gate-reward.md` | TODO | — |
| P2-F04-T02 | F04–F06 | PRD F04, F05, F06 ครอบผู้เล่น 3 กลุ่ม + ตัวชี้วัด + non-goals + ข้อจำกัดของ playtest | spec | product-manager | — | `product/prd/F04-dungeon-presence.md`, `product/prd/F05-movement-gate-reward.md`, `product/prd/F06-hp-damage-onboarding.md` | TODO | — |
| P2-F04-T03 | F04 | ใส่ osm_id ที่ตัดตาม D-083 + คำราชาศัพท์ใน coverageFilter แล้วรัน pipeline + analysis ซ้ำ | build | location-engineer | — | `config/balance/dungeons.json` (เฉพาะ `coverageFilter`), `tools/coverage/`, `data/coverage/` | TODO | — |
| P2-F04-T04 | F04 | แผนทางเสริมบางรัก + รายชื่อ dungeon นำร่อง 10–20 แห่งจาก 3 ย่าน (F-11, N-04, N-05) | spec | level-designer | — | `design/levels/pilot-dungeons.md`, `design/levels/bangrak-plan.md`, `design/levels/launch-criteria.md`, `design/levels/presets.md` | TODO | — |
| P2-F04-T05 | F04–F06 | ADR 0003 game core client-first (C1-1..C1-5, geo leaf, สองหน้าต่าง, ตัวกรอง gate, PresenceStrategy, สัญญา RNG, subpath exports, วิธีวัดงบ bundle) + ติดตั้ง dependency + lint boundary + ปิด D-054/D-057/D-075 | spec | tech-lead | — | `docs/adr/0003-client-first-game-core.md`, `docs/adr/0001-repo-layout.md`, `docs/tech/F02-map-location-spike.md`, `docs/tech/gps-trace-format.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `eslint.config.js`, `vitest.config.ts`, `tsconfig.json`, `packages/geo/package.json`, `packages/geo/tsconfig.json`, `packages/shared/package.json`, `apps/client/package.json`, `tools/dungeons/package.json`, `tools/config-lint/package.json` | TODO | — |
| P2-F04-T06 | F04–F06 | UX carry-over: N-1, N-3, V-15, V-16, V-20, V-22, ramp skin/hair, S-22, interest.confirm, index ศัพท์, ตรวจป้ายปุ่ม 11 cell | fix | uiux-designer | — | `design/ux/ia.md`, `design/ux/tokens.json`, `design/ux/components.md`, `design/ux/wireframes/` (ไฟล์ 00–06 ของ F03), `design/ux/flows/F03-core-loop.md` | TODO | — |
| P2-F04-T07 | F04–F06 | (รวมเข้า P2-F04-T16 ตาม GD B-09 ทาง ก) world.md ตาม D-084 + area `client` ใน copy-rules.json | fix | narrative-designer | — | — | CUT | รวมใน P2-F04-T16 |
| P2-F04-T08 | F04–F06 | CI: lint-headers, ตรวจสิทธิ์ token และบริการคิดเงิน (D-085) + runbook billing guard | build | devops-engineer | — | `.github/workflows/ci.yml`, `infra/scripts/`, `infra/runbooks/billing-guard.md`, `docs/tech/environments.md` | TODO | — |
| P2-F04-T09 | F04–F06 | QA carry-over: bugs.md ย้อนหลัง + ปิด BUG-F01-001/002, e2e TC-MAP-05/08, regex ramp 22, static check kw-dungeons, นับ kw-rift-sponsored/crack, ถ่าย S1/S3/S6 ใหม่ | fix | qa-tester | P2-F04-T06 | `qa/tests/e2e/`, `qa/tests/unit/`, `qa/reports/F02/map-style/`, `qa/bugs.md` | TODO | — |
| P2-F04-T10 | F04–F06 | HUD probe (Wake Lock, vibrate, จอล็อก/page hidden, แบต) + environment/segment + stationary_5min_accum_m + tilesUrlMissing + code-split maplibre และงบ bundle (รับ P2-F06-T15) | build | gameplay-programmer | P2-F04-T05 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F04-T11 | F04–F06 | HUMAN: กด deploy-preview ของ build ที่มี probe แล้วรัน probe บน Android + iPhone (15–25 นาที) | research | HUMAN | P2-F04-T10 | `qa/playtest/results/` (คนกรอก summary ไม่มีพิกัด) | HUMAN | — |
| P2-F04-T12 | F04 | `packages/geo` (leaf): haversine, หน้าต่าง diagnostic + ระยะสะสมของ rewardWindow, ตัวกรอง outlier + resample, ตัดคู่ sample ที่ห่าง/accuracy แย่, ความเร็วของ lock, PIP + hysteresis, play area mask | build | location-engineer | P2-F04-T05 | `packages/geo/` | TODO | — |
| P2-F04-T13 | F04 | ข้อมูล dungeon นำร่อง 10–20 แห่ง (polygon, level range, preset, drop_table_id, opening_hours แบบ normalized, จุดปลายทางนำทาง, verification_mode, floor_level) | asset | level-designer | P2-F04-T01, P2-F04-T03, P2-F04-T04 | `data/dungeons/pilot.geojson`, `data/dungeons/dungeons.json`, `data/dungeons/README.md`, `data/dungeons/LICENSE-DATA.md` | TODO | — |
| P2-F04-T14 | F04, F05 | Tech note F04 + F05: API session/run/reward, sequence ต่อ tick, check-in, แอปถูกปิดแล้วเปิดใหม่, เพดานเก็บ sample, telemetry sink, artifact ของ dungeon, ลิงก์นำทาง, failure modes, test hooks | spec | tech-lead | P2-F04-T01, P2-F04-T05 | `docs/tech/F04-dungeon-presence.md`, `docs/tech/F05-movement-gate-reward.md`, `config/app/privacy.json`, `config/app/telemetry.json` | TODO | — |
| P2-F04-T15 | F04 | Flow F04 + wireframe: dungeon ใกล้ตัว, นำทาง (A-3), เลือก + confirm, รอ check-in, speed lock, Active/Grace/Suspended/Ended, ปิดทำการ, GPS แย่ | spec | uiux-designer | P2-F04-T01 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/F04-*.html` | TODO | — |
| P2-F04-T16 | F04 | Copy F04 + ชื่อโซนนำร่อง + world.md รับธง H-01..H-13 (D-084) + area `client` ใน copy-rules.json (รับ T07) | asset | narrative-designer | P2-F04-T15, P2-F04-T04 | `config/content/copy.th.json`, `config/content/names.th.json`, `config/content/copy-rules.json`, `design/narrative/world.md` | TODO | — |
| P2-F04-T17 | F04–F06 | Telemetry + metrics F04–F06 (รวม speed lock, check-in, empty screen ตาม reason, ลบข้อมูลในเครื่อง, proxy ของ north star) | spec | product-manager | P2-F04-T01, P2-F04-T02 | `product/telemetry-events.md`, `product/metrics.md` | TODO | — |
| P2-F04-T18 | F04 | คำนวณ GR-1 ของ 3 ย่าน (D-083) เทียบ guardrail G4/S3 + ยืนยัน A-P1-F01-T06-2/-4/-7 | spec | product-manager | P2-F04-T03, P2-F04-T04 | `product/metrics.md`, `product/prd/F01-coverage-survey.md` | TODO | — |
| P2-F04-T19 | F04, F05 | Test plan F04 + F05 + QA trace ที่สร้างด้วย script (ทุก transition, check-in, speed lock, ช่องว่าง sample, ปิดทำการ, ขอบเวลา) | spec | qa-tester | P2-F04-T01, P2-F04-T14 | `qa/plans/F04-test-plan.md`, `qa/plans/F05-test-plan.md`, `qa/tests/traces/`, `data/gps-traces/qa/` | TODO | — |
| P2-F04-T20 | F04 | Run engine `src/run/`: เลือกทีละ 1 + confirm, PresenceStrategy (check-in), state machine, speed lock, เวลาทำการ, sample ที่เก็บในเครื่อง | build | backend-programmer | P2-F04-T14, P2-F04-T12, P2-F05-T02, P2-F05-T20 | `packages/shared/src/run/` | TODO | — |
| P2-F04-T21 | F04 | Client F04 UI: แผนที่ dungeon + นำทาง + confirm + สถานะ run + check-in/speed lock + Mock UI + setDungeonsSourceData + ยิง event | build | gameplay-programmer | P2-F04-T20, P2-F04-T15, P2-F04-T16, P2-F04-T13, P2-F04-T25, P2-F04-T26, P2-F04-T27, P2-F04-T17 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F04-T22 | F04 | Black-box trace-replay F04 + e2e origin allowlist + contract test ชื่อ event | build | qa-tester | P2-F04-T21, P2-F04-T19 | `qa/tests/F04/`, `data/gps-traces/qa/`, `qa/bugs.md` | TODO | — |
| P2-F04-T23 | F04 | Location hygiene (F-05a, F-07, alias, README §6, docstring, legend, run-meta, fixture S2/S5, รู mask S6, polygon จังหวัดเล็ก) + `tools/traces` ใช้ `packages/geo` | fix | location-engineer | P2-F04-T03 | `tools/coverage/`, `data/coverage/`, `tools/tiles/`, `data/map/`, `packages/location/`, `tools/traces/` | TODO | — |
| P2-F04-T24 | F04–F06 | JSON Schema ต่อไฟล์ config + config lint (D-062, H01) ต่อเข้า `pnpm test` | build | tech-lead | P2-F04-T05 | `packages/shared/schemas/config/`, `tools/config-lint/` | TODO | — |
| P2-F04-T25 | F04–F06 | Client plumbing: config เฉพาะ key (F-04, F-08), สลับไป `packages/geo` (F-05b), game clock ของ Mock, storage adapter, telemetry sink + export, build profile, DOM test ของ HUD | build | gameplay-programmer | P2-F04-T05, P2-F04-T12, P2-F04-T14 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F04-T26 | F04 | `tools/dungeons`: validator ตาม dungeon-rules.md + build artifact ของ client (polygon, จุดป้าย polylabel, จุดปลายทางนำทาง, property whitelist, เวลาทำการ normalized) | build | location-engineer | P2-F04-T05, P2-F04-T14 | `tools/dungeons/`, `packages/shared/schemas/dungeon.schema.json` | TODO | — |
| P2-F04-T27 | F04 | อนุมัติ flow F04 (core loop) ก่อน build | review-gate | game-director | P2-F04-T15 | `design/reviews/F04-flow-approval.md` | TODO | — |
| P2-F05-T01 | F05, F06 | Config loop: exp ต่อ tick, drop table ต่อ preset (รวมยา) + ไอเทม (assets.icon), ค่า F06, dungeons.safety + vector drop/exp/survival/ตายเทียบ auto-retreat/seed + `tools/sim` ใช้สูตรจาก shared | spec | systems-designer | P2-F04-T01, P2-F04-T03, P2-F06-T01, P2-F06-T02, P2-F05-T02, P2-F05-T20 | `config/balance/drops.json`, `config/balance/combat.json`, `config/balance/economy.json`, `config/balance/dungeons.json`, `config/balance/classes.json`, `design/systems/balance-model.md`, `design/systems/sim-report.md`, `design/systems/test-vectors/`, `tools/sim/` | TODO | — |
| P2-F05-T02 | F05, F06 | Port สูตร + PRNG + ส่วน pure ของ drops/survival จาก `tools/sim` เข้า `src/formulas/` + config accessor แบบ typed (ไม่ใช้ Ajv) + H03 | build | backend-programmer | P2-F04-T05 | `packages/shared/src/formulas/`, `packages/shared/src/config/` | TODO | — |
| P2-F05-T03 | F04–F06 | Art: F-AD-1..4 + brief asset ของ Phase 2 (ไอคอน class 4, กรอบ rarity 5, สถานะ dungeon, ยา, ไอเทม drop, ตัวนำทาง, speed lock) | spec | art-director | — | `art/direction/map-style.md`, `art/direction/map-style/`, `art/direction/style-guide.md`, `art/direction/icon-grammar.md`, `art/direction/briefs/P2-assets.md` | TODO | — |
| P2-F05-T04 | F06 | อวตาร: V-18 clipPath, V-19 composite มุมข้าง/หลัง + panel กลางคืน, ref.style-tile.v1 approved | fix | artist-2d | — | `art/assets/avatar/`, `art/src/avatar/`, `art/ref/`, `art/assets/manifest.json` | TODO | — |
| P2-F05-T05 | F05 | VFX: module ฐาน CSS/WAAPI + effect ได้ tick / ได้ของตาม rarity + V-21 + demo | build | vfx-animator | P2-F05-T03 | `art/vfx/` | TODO | — |
| P2-F05-T06 | F05, F06 | Audio: generator `audio/src/` + cue ของ loop + manifest + demo + F-13 | build | sound-designer | — | `audio/src/`, `audio/out/`, `audio/manifest.json`, `audio/demo.html`, `audio/cue-list.md` | TODO | — |
| P2-F05-T07 | F04–F06 | ชุดไอคอน Phase 2 (SVG) + manifest | asset | artist-2d | P2-F05-T03, P2-F05-T01 | `art/assets/icons/`, `art/assets/items/`, `art/assets/ui/`, `art/assets/manifest.json`, `art/prompts/` | TODO | — |
| P2-F05-T08 | F05 | Reward engine `src/reward/` + ตัวประกอบ loop `src/session/` (`sessionStep`: run → gate → tick → drop) | build | backend-programmer | P2-F04-T14, P2-F05-T02, P2-F05-T01, P2-F04-T12, P2-F04-T20 | `packages/shared/src/reward/`, `packages/shared/src/session/` | TODO | — |
| P2-F05-T09 | F05, F06 | Copy F05 + F06: tick, ของ, สรุป run, HP/ยา/auto-retreat/ตาย/ฟื้น, class, onboarding, ไกล/นอกพื้นที่, pocket screen, Wake Lock, consent/age gate, ลบข้อมูลในเครื่อง | asset | narrative-designer | P2-F06-T03, P2-F04-T16 | `config/content/copy.th.json`, `config/content/names.th.json` | TODO | — |
| P2-F05-T10 | F05 | Client F05: เรียก `sessionStep` เท่านั้น, feedback ได้ tick/ของ (icon + effect + เสียง), สรุปรางวัลหลังจบ run | build | gameplay-programmer | P2-F05-T08, P2-F05-T07, P2-F05-T09, P2-F05-T05, P2-F05-T06, P2-F06-T07, P2-F04-T21, P2-F04-T17, P2-F06-T03, P2-F06-T30 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F05-T11 | F05 | Black-box trace-replay F05 (วางนิ่ง 0 tick, ม้านั่ง ≥1 tick, ช่องว่าง sample ไม่ได้รางวัล, ตรง vector, สรุป run) | build | qa-tester | P2-F05-T08, P2-F05-T10, P2-F04-T19 | `qa/tests/F05/`, `data/gps-traces/qa/`, `qa/bugs.md` | TODO | — |
| P2-F05-T12 | F05 | Speed lock แบบความเร็วกรอง + กฎปลดเมื่อหยุดไฟแดง: ค่าใน config + vector จาก trace จริง | spec | systems-designer | P2-C03, P2-C04, P2-F05-T01 | `config/balance/anticheat.json`, `design/systems/balance-model.md`, `design/systems/test-vectors/`, `tools/sim/` | TODO | — |
| P2-F05-T13 | F05 | ความเร็วแบบกรองใน `packages/geo` (แทนฟังก์ชันความเร็วของ lock โดยไม่เปลี่ยน signature) | build | location-engineer | P2-F05-T12, P2-F04-T12 | `packages/geo/` | TODO | — |
| P2-F05-T14 | F04–F06 | Build profile playtest ใน deploy-preview (ส่ง env ผ่าน workflow) + runbook | build | devops-engineer | P2-F04-T05, P2-F04-T08, P2-F04-T25 | `.github/workflows/deploy-preview.yml`, `infra/pages/`, `infra/runbooks/preview-setup.md`, `docs/tech/environments.md` | TODO | — |
| P2-F05-T15 | F04, F05 | Tech gate F04 + F05 (verdict ย่อยต่อ feature) | review-gate | tech-lead | P2-F04-T21, P2-F05-T10, P2-F05-T08, P2-F04-T20, P2-F04-T12, P2-F05-T02, P2-F04-T24, P2-F04-T25, P2-F04-T26 | `docs/reviews/F04-F05-tech-gate.md` | TODO | — |
| P2-F05-T16 | F04, F05 | QA gate F04 + F05 (verdict ย่อยต่อ feature) | review-gate | qa-tester | P2-F05-T15, P2-F04-T22, P2-F05-T11 | `qa/reports/F04-F05-qa-gate.md`, `qa/bugs.md` | TODO | — |
| P2-F05-T17 | F04, F05 | Content gate (copy) F04 + F05 (verdict ย่อยต่อ feature) | review-gate | narrative-designer | P2-F04-T21, P2-F05-T10 | `design/reviews/F04-F05-copy-gate.md` | TODO | — |
| P2-F05-T18 | F04, F05 | Design gate F04 + F05 (verdict ย่อยต่อ feature · gate เดียวครอบรางวัลก้อนแรก) | review-gate | game-director | P2-F05-T16, P2-F05-T17, P2-F06-T10 | `design/reviews/F04-F05-design-gate.md` | TODO | — |
| P2-F05-T19 | F05 | Tech review ตัวกรองความเร็ว (P2-F05-T12/T13) | review-gate | tech-lead | P2-F05-T13 | `docs/reviews/F05-speed-filter-tech-gate.md` | TODO | — |
| P2-F05-T20 | F04, F05 | Config + vector ของ gate / run state / check-in: cadence, ตัวกรอง outlier, ช่องว่าง sample, accuracy, hysteresis ขอบ, timezone offset + vector rewardWindow, D-059, ขอบเวลา Grace/Suspended | spec | systems-designer | P2-F04-T01, P2-F04-T05 | `config/balance/dungeons.json` (`movementGate`, `runState`, `openingHours`), `config/balance/anticheat.json` (`checkIn`), `design/systems/balance-model.md`, `design/systems/test-vectors/`, `tools/sim/` | TODO | — |
| P2-F06-T01 | F05, F06 | Balance carry-over: D-038 B (vitPotionEfficiency 2 → 1) + vectors + sim report, farDungeonThreshold_m 1,900, R-B1 + vector ขอบ, partyMult cap | spec | systems-designer | — | `config/balance/progression.json`, `config/balance/unlocks.json`, `config/balance/raid.json`, `design/systems/balance-model.md`, `design/systems/sim-report.md`, `design/systems/test-vectors/`, `tools/sim/` | TODO | — |
| P2-F06-T02 | F06 | Feature spec F06 (damage, auto-retreat, ยาจาก drop, แจ้ง 30%, ตาย/ฟื้น, class, onboarding + รางวัลก้อนแรก = tick ปกติ, จอไกล/นอกพื้นที่, ซ่อนจำนวนคน) + pillars 7.1 + SF-13 | spec | game-director | P2-F04-T01 | `design/features/F06-hp-damage-onboarding.md`, `design/pillars.md` | TODO | — |
| P2-F06-T03 | F05, F06 | Flow F05 + F06 + wireframe: feedback tick/ของ, สรุป run, HP/auto-retreat/ตาย/ฟื้น, class, onboarding 0–10, pocket screen, จอไกล/นอกพื้นที่, consent/age gate, ลบข้อมูลในเครื่อง, Credits | spec | uiux-designer | P2-F06-T02, P2-F04-T15 | `design/ux/flows/F05-movement-gate-reward.md`, `design/ux/flows/F06-hp-damage-onboarding.md`, `design/ux/wireframes/F05-*.html`, `design/ux/wireframes/F06-*.html`, `design/ux/components.md`, `design/ux/ia.md` | TODO | — |
| P2-F06-T04 | F06 | Tech note F06: HP engine ใน session, class, onboarding state, จอไกล/นอกพื้นที่ | spec | tech-lead | P2-F06-T02, P2-F04-T14 | `docs/tech/F06-hp-damage-onboarding.md` | TODO | — |
| P2-F06-T05 | F06 | VFX F06: HP ต่ำ, auto-retreat, ตาย, ฟื้น, เข้า dungeon/Grace + pose kit | build | vfx-animator | P2-F05-T05, P2-F06-T03 | `art/vfx/` | TODO | — |
| P2-F06-T06 | F06 | HP engine `src/hp/` + ต่อเข้า `src/session/`: การตี, damage, auto-retreat 25%, ยาอัตโนมัติจาก inventory ที่มาจาก drop, แจ้ง 30%, ตาย, ฟื้น | build | backend-programmer | P2-F06-T04, P2-F05-T01, P2-F06-T01, P2-F05-T08 | `packages/shared/src/hp/`, `packages/shared/src/session/` | TODO | — |
| P2-F06-T07 | F04–F06 | Asset ถึง client: `tools/art`, validator V1–V13 + schema, font + OFL, hook เสียงใน root build, asset-delivery | build | tech-lead | P2-F05-T03, P2-F04-T05 | `tools/art/`, `art/fonts/`, `art/assets/manifest.schema.json`, `art/assets/manifest.build.json`, `docs/tech/asset-delivery.md`, `package.json` (script `build` เท่านั้น) | TODO | — |
| P2-F06-T08 | F06 | Client F06: แถบ HP, แจ้ง 30%, auto-retreat, ยาอัตโนมัติ, จอตาย/ฟื้น, ตั้งค่า S-22 + token/component ของ P2-F04-T06 | build | gameplay-programmer | P2-F06-T06, P2-F06-T03, P2-F05-T09, P2-F05-T10, P2-F06-T30, P2-F04-T17, P2-F04-T06 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F06-T09 | F06 | Client: จอไกล / นอกพื้นที่ / นอกย่านเปิดตัว + consent + age gate 15+ (scaffold) + Credits + ลบข้อมูลในเครื่อง + telemetry empty screen | build | gameplay-programmer | P2-F06-T03, P2-F05-T09, P2-F05-T07, P2-F06-T07, P2-F04-T21, P2-F06-T30, P2-F04-T17 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F06-T10 | F06 | Client: onboarding นาที 0–10 (รางวัลก้อนแรกจาก tick ปกติ) + ล็อกระบบที่ห้ามสอน | build | gameplay-programmer | P2-F06-T08, P2-F06-T09, P2-F05-T10, P2-F06-T03, P2-F06-T30, P2-F04-T17, P2-F04-T06 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F06-T11 | F06 | Test plan F06 + TC-HUD-03..12 | spec | qa-tester | P2-F06-T02, P2-F04-T10 | `qa/plans/F06-test-plan.md`, `qa/tests/F02/` | TODO | — |
| P2-F06-T12 | F06 | Support matrix F-17 จากผล probe + เดินทดสอบ | research | tech-lead | P2-F04-T11, P2-C02 | `docs/tech/F06-device-capability.md` | TODO | — |
| P2-F06-T13 | F06 | cue-list + audio: fallback เมื่อไม่มี vibrate, priority queue ของ cue F05/F06 | build | sound-designer | P2-F06-T03, P2-F05-T06 | `audio/cue-list.md`, `audio/src/`, `audio/out/`, `audio/manifest.json` | TODO | — |
| P2-F06-T14 | F06 | Client: pocket screen + Wake Lock (feature detection) + fire-together + priority queue + telemetry Wake Lock/page hidden | build | gameplay-programmer | P2-F06-T13, P2-F06-T10, P2-F06-T05, P2-F04-T17 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | TODO | — |
| P2-F06-T15 | F06 | (รวมเข้า P2-F04-T10) code-split maplibre + งบ bundle | build | gameplay-programmer | — | — | CUT | รวมใน P2-F04-T10 |
| P2-F06-T16 | F06 | CI: ตรวจงบ bundle + bbox-vs-province (X39) | build | devops-engineer | P2-F04-T10, P2-F04-T23 | `.github/workflows/ci.yml`, `infra/scripts/` | TODO | — |
| P2-F06-T17 | F06 | Black-box F06: เวลาอยู่รอด, auto-retreat, ตาย/ฟื้น, ยาจาก drop, รางวัลก้อนแรก, onboarding, จอไกล + event | build | qa-tester | P2-F06-T06, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T11 | `qa/tests/F06/`, `data/gps-traces/qa/`, `qa/bugs.md` | TODO | — |
| P2-F06-T18 | F04–F06 | ชุด playtest: script เดิน, safety briefing (รวม speed lock), แบบฟอร์มผู้สังเกต, ช่วงเวลาตาม Q-H3 | spec | qa-tester | P2-F06-T03, P2-F04-T15 | `qa/playtest/phase-2-kit.md`, `qa/playtest/phase-2-observer-form.md`, `qa/playtest/phase-2-parental-consent.md`, `qa/playtest/safety-briefing.md` | TODO | — |
| P2-F06-T19 | F04–F06 | แบบสอบถาม + แผนวิเคราะห์ + proxy ของ north star | spec | product-manager | P2-F04-T02, P2-F06-T02, P2-F04-T17 | `product/playtest/phase-2-questionnaire.md`, `product/playtest/phase-2-plan.md` | TODO | — |
| P2-F06-T20 | F06 | Tech gate F06 (HP engine, session, client F06, pocket screen, bundle, asset delivery) | review-gate | tech-lead | P2-F06-T06, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F06-T07, P2-F04-T10, P2-F06-T16 | `docs/reviews/F06-tech-gate.md` | TODO | — |
| P2-F06-T21 | F06 | QA gate F06 | review-gate | qa-tester | P2-F06-T20, P2-F06-T17 | `qa/reports/F06-qa-gate.md`, `qa/bugs.md` | TODO | — |
| P2-F06-T22 | F06 | Content gate (copy) F06 รวมสามจังหวะ | review-gate | narrative-designer | P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F05-T17 | `design/reviews/F06-copy-gate.md` | TODO | — |
| P2-F06-T23 | F04–F06 | Content gate (visual) F04–F06 | review-gate | art-director | P2-F04-T21, P2-F05-T10, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F05-T07, P2-F05-T04, P2-F06-T05 | `art/reviews/F04-F06-visual-gate.md` | TODO | — |
| P2-F06-T24 | F06 | Design gate F06 + regression F04/F05 | review-gate | game-director | P2-F06-T21, P2-F06-T22, P2-F06-T23, P2-F05-T18 | `design/reviews/F06-design-gate.md` | TODO | — |
| P2-F06-T25 | F04–F06 | Product gate F04–F06 (checklist เต็ม + หลักฐาน E8) | review-gate | product-manager | P2-F06-T24, P2-F06-T21, P2-F04-T17, P2-F04-T02 | `product/reviews/F04-F06-product-gate.md` | TODO | — |
| P2-F06-T26 | F04–F06 | HUMAN: deploy build playtest ผ่าน deploy-preview + smoke บน Android + iPhone | build | HUMAN | P2-F05-T16, P2-F06-T21, P2-C05, P2-F05-T14, P2-F06-T12 | — | HUMAN | — |
| P2-F06-T27 | F04–F06 | HUMAN: playtest เดินจริงอย่างน้อย 3 คน + แบบสอบถาม | research | HUMAN | P2-F06-T26, P2-F06-T18, P2-F06-T19, P2-F06-T24, P2-F06-T25 | `product/playtest/results/` (คนกรอก ไม่ระบุตัวคน) | HUMAN | — |
| P2-F06-T28 | F04–F06 | Playtest report: loop สนุกพอไปต่อ หรือรายการที่ต้องแก้ | spec | product-manager | P2-F06-T27 | `product/playtest/phase-2-playtest-report.md` | TODO | — |
| P2-F06-T29 | F04–F06 | HUMAN: ยอมรับข้อสรุป playtest (ไป Phase 3 / แก้ก่อน) | review-gate | HUMAN | P2-F06-T28 | — (orchestrator บันทึกใน decision log) | HUMAN | — |
| P2-F06-T30 | F05, F06 | อนุมัติ flow F05 + F06 (core loop) ก่อน build | review-gate | game-director | P2-F06-T03 | `design/reviews/F05-F06-flow-approval.md` | TODO | — |
| P2-CLOSE-QA | ปิด phase | Regression ปิด Phase 2 | review-gate | qa-tester | P2-C06, P2-F04-T09, P2-F04-T18, P2-F04-T23, P2-F05-T16, P2-F05-T17, P2-F05-T18, P2-F05-T19, P2-F06-T16, P2-F06-T21, P2-F06-T22, P2-F06-T23, P2-F06-T24, P2-F06-T25, P2-F06-T28 | `qa/reports/phase-2-regression.md`, `qa/bugs.md` | TODO | — |
| P2-CLOSE-PM | ปิด phase | รายงานปิด Phase 2 | plan | producer | P2-CLOSE-QA, P2-F06-T29, P2-C08 | `studio/phases/phase-2/report.md`, `studio/phases/phase-2/board.md` (สถานะเท่านั้น) | TODO | — |

กติกา deps ที่เป็น CUT: ถ้างานใน Deps ถูก CUT (เช่น P2-C04 เมื่อไม่มีความยินยอม) orchestrator ถือว่าผ่านและบันทึกในคอลัมน์ Output ของงานที่รอ · P2-F04-T07 และ P2-F06-T15 เป็น CUT แบบรวมงาน ไม่มีงานใดรอสองแถวนี้

## 3. ลำดับ wave และ critical path

จำนวนงาน: 89 แถว = 87 งานที่ทำจริง + 2 CUT แบบรวมงาน (P2-F04-T07, P2-F06-T15) · agent 79 (build 29, spec 22, review-gate 15, fix 4, asset 4, research 2, plan 3 · นับรวม P2-C*) · HUMAN 8 (P2-C01, C02, C05, C07, P2-F04-T11, P2-F06-T26, T27, T29)
งานต่อ role: qa-tester 11 · tech-lead 10 · gameplay-programmer 8 · game-director 7 · product-manager 6 · location-engineer 6 · backend-programmer 4 · narrative-designer 4 · systems-designer 4 · uiux-designer 3 · devops-engineer 3 · producer 3 · level-designer 2 · art-director 2 · artist-2d 2 · vfx-animator 2 · sound-designer 2 · liveops-operator 0 (roadmap ไม่มีบทบาทใน Phase 2)

### Wave 1 — พร้อมทันที
ready list (dispatch ทั้ง 6): P2-F04-T05 tech-lead · P2-F04-T01 game-director · P2-F04-T03 location-engineer · P2-F04-T04 level-designer · P2-F04-T02 product-manager · P2-F06-T01 systems-designer
พร้อมแต่รอช่อง (ไม่มี deps): P2-F05-T03 art-director (W3), P2-F04-T08 devops (W6), P2-F05-T06 sound (W6), P2-F04-T06 uiux (W7), P2-RISK-01 producer (W8), P2-F05-T04 artist (W10)
**งานคนที่ทำได้ตอนนี้:** P2-C01 (5–10 นาที) → P2-C02 (เดินเชิงเทคนิค ช่วงเช้า/เย็นตาม D-093) · P2-C07 ขั้น 1 (ตรวจ Billing) · Q-H1..Q-H3 ตอบแล้ว (D-091..D-093) · P2-F04-T11 เมื่อ probe ของ W2 ถูก push

### แผน wave (เพดาน 6 task ต่อ wave, 1 task ต่อ agent · ตรวจแล้ว: deps เสร็จใน wave ก่อนหน้า, Writes ไม่ทับกันภายใน wave)
| W | งาน agent | ถอยได้ 1 wave โดยไม่กระทบเส้นวิกฤต | งานคน / งานสนามที่แทรกได้ | หมายเหตุ path ร่วม |
| --- | --- | --- | --- | --- |
| W1 | P2-F04-T05, P2-F04-T01, P2-F04-T03, P2-F04-T04, P2-F04-T02, P2-F06-T01 | — | P2-C01 → P2-C02 | root config ทั้งหมด = T05 · `dungeons.json` = T03 (coverageFilter) · `tools/sim` = F06-T01 |
| W2 | P2-F04-T12, P2-F04-T14, P2-F05-T02, P2-F05-T20, P2-F04-T10, P2-F04-T18 | — | P2-F04-T11 (หลัง orchestrator push T10 และคนกด deploy-preview) | `dungeons.json` + `tools/sim` = F05-T20 · `config/app/privacy.json`, `telemetry.json` = T14 · `config/app/client.json` = T10 |
| W3 | P2-F04-T20, P2-F04-T25, P2-F04-T15, P2-F06-T02, P2-F04-T13, P2-F05-T03 | — | — | ถ้า T18 ได้ GR-1 เกิน guardrail ห้าม dispatch T13 (กฎสลับข้อ 2) |
| W4 | P2-F04-T27, P2-F06-T03, P2-F04-T17, P2-F04-T16, P2-F04-T26, P2-F05-T01 | — | — | gameplay ว่างตามแผน (T21 รอ T16/T26/T27/T17) · `dungeons.json` + `tools/sim` = F05-T01 · validator ของ T26 ตรวจข้อมูลของ T13 |
| W5 | P2-F04-T21, P2-F05-T08, P2-F05-T09, P2-F06-T30, P2-F05-T07, P2-F06-T07 | — | — | root `package.json` (script build) = F06-T07 คนเดียว · `manifest.json` = F05-T07 |
| W6 | P2-F06-T09, P2-F06-T04, P2-F04-T19, P2-F05-T05, P2-F05-T06, P2-F04-T08 | — | — | T08 ไม่เลื่อนเกิน W6 (TL N-04) |
| W7 | P2-F05-T10, P2-F06-T06, P2-F04-T24, P2-F04-T22, P2-F04-T06, P2-F06-T05 | — | — | `src/session/` = F06-T06 (F05-T08 ถือใน W5) |
| W8 | P2-F06-T08, P2-F05-T15, P2-F06-T11, P2-F05-T17, P2-F06-T13, P2-RISK-01 | P2-F05-T17, P2-RISK-01 | — | — |
| W9 | P2-F06-T10, P2-F05-T11, P2-C03, P2-C09, P2-F04-T23, P2-F05-T14 | P2-C09, P2-F05-T14 | P2-C05 HUMAN หลัง C03 | ถ้า C02 ยังไม่เสร็จ ช่อง tech-lead ว่าง |
| W10 | P2-F06-T14, P2-F05-T16, P2-F06-T19, P2-F06-T16, P2-F06-T12, P2-F05-T04 | P2-F06-T19 | — | — |
| W11 | P2-F06-T20, P2-F06-T17, P2-F06-T22, P2-F06-T23, P2-F05-T18, P2-C04 | — | — | `data/gps-traces/qa/` (F06-T17) กับ `recorded/` (C04) คนละ path |
| W12 | P2-F06-T21, P2-F05-T12 | — | P2-F06-T26 HUMAN หลัง F06-T21 PASS · P2-C07 HUMAN หลัง C06 | ช่องว่างใช้รับ fix task จาก gate |
| W13 | P2-F06-T24, P2-F06-T18, P2-F05-T13 | — | คนนัดผู้ร่วม playtest | — |
| W14 | P2-F06-T25, P2-C06, P2-F05-T19 | — | P2-F06-T27 HUMAN หลัง T24 + T25 | — |
| W15 | P2-F06-T28, P2-F04-T09 | — | P2-F06-T29 HUMAN | — |
| W16 | P2-CLOSE-QA, P2-C08 | — | — | — |
| W17 | P2-CLOSE-PM | — | — | ปิด phase |

กฎสลับ (orchestrator ใช้ได้เลยโดยไม่ต้องถาม producer)
1. **งานสนาม** (P2-C03, C04, C06, P2-F06-T12, P2-F05-T12, T13, T19, P2-C08) เข้าตาม wave ในแผนเมื่อ deps ครบ หรือเข้าช่องว่างของ agent นั้นใน W12–W16 · จะเร็วกว่าแผนได้เฉพาะโดยสลับกับงานในคอลัมน์ "ถอยได้" ของ wave นั้น (งานที่ถอยย้ายไป W12 ซึ่งมีช่องว่าง) · ห้ามถอยงานบนเส้นวิกฤต ห้ามเกิน 6 งานต่อ wave และตรวจ 1 งานต่อ agent + Writes ใหม่ · tech-lead มีงานทุก wave ใน W5–W8 และ W1–W7 ไม่มีงานถอยได้ จึง P2-C03 เร็วสุด W9 · P2-C04 เร็วสุด W8 (แทน P2-RISK-01 ซึ่งย้ายไป W12)
2. **GR-1 เกิน guardrail (PM-M3):** ถ้า P2-F04-T18 รายงานว่า GR-1 ของย่านใดเกิน G4 (≤ 5%) หรือ S3 (≤ 15%) ถือเป็น blocking · orchestrator ไม่ dispatch P2-F04-T13 และงานที่ผูกกับชุด dungeon (P2-F04-T26 ส่วนข้อมูล, P2-F04-T21) และเรียก producer ทำ plan-sync ทันที · ถ้าทางแก้เปลี่ยนชุดย่านของ D-083 ต้องเป็นคำถามถึงคน
3. **ข้อมูลนำร่องเปลี่ยนหลัง T18:** ถ้า P2-F04-T13 ตัดหรือเพิ่ม dungeon จากรายชื่อของ P2-F04-T04 จนกระทบช่วงเลเวลเริ่มต้นของย่านใด level-designer ส่ง handoff ถึง product-manager และ orchestrator เปิด X ให้คำนวณ GR-1 ซ้ำใน wave ถัดไป
4. **jitter ของเครื่องจริง (TL N-11):** ถ้า P2-C03 พบว่าเครื่องที่วางนิ่งผ่าน gate หลังใช้ตัวกรอง orchestrator เปิด X ให้ systems-designer (ค่าของ P2-F05-T20) และแจ้ง game-director ก่อน P2-F05-T16
5. **P2-C05 = No-go:** หยุด P2-F06-T26 และงานที่รอผลสนาม แล้วเรียก producer ทำ plan-sync · **Q-P1-16 ยังไม่มีคำตอบเมื่อจบ W3:** orchestrator commit ได้แต่ไม่ push commit ที่มี `data/dungeons/` จนกว่าคนตอบ
6. ช่องว่างใน W12–W16 ใช้รับ fix task จาก gate ที่ได้ NEEDS_CHANGES ก่อนงานอื่น · งาน carry-over (P2-F04-T09, T23, P2-C09, P2-RISK-01) ขยับขึ้นช่องว่างได้ แต่ต้องเสร็จก่อน P2-CLOSE-QA
7. handoff ที่ไม่ใช่ fix ถึง gameplay-programmer หรือ qa-tester (คอขวด) ให้ producer ตัดสินใน plan-sync ว่ายกไป Phase 3 หรือไม่
- ประมาณการ: ฝั่ง agent 17 wave เท่า rev 1 แต่ **ไม่มีงานสนามบนเส้นวิกฤต** · ระยะจริงขึ้นกับคนใน P2-F06-T26, T27, T29

### Critical path
1. **Build loop (ยาวที่สุด · gameplay เป็นคอขวด 8 งาน):** P2-F04-T05 (W1) → P2-F04-T12 + T14 (W2) → P2-F04-T25 (W3) → P2-F04-T21 (W5 · รอ T16, T26, T27, T17 จาก W4) → P2-F06-T09 (W6) → P2-F05-T10 (W7) → P2-F06-T08 (W8) → P2-F06-T10 (W9) → P2-F06-T14 (W10) → P2-F06-T20 tech gate (W11) → P2-F06-T21 QA gate (W12) → P2-F06-T24 design gate (W13) → P2-F06-T25 product gate (W14) → HUMAN P2-F06-T27 → P2-F06-T28 (W15) → HUMAN P2-F06-T29 → P2-CLOSE-QA (W16) → P2-CLOSE-PM (W17)
2. **spec → flow → copy (ไม่มี slack):** P2-F04-T01 (W1) → P2-F04-T15 (W3) → P2-F04-T16 + T27 (W4) → P2-F04-T21 (W5) · และ P2-F04-T01 → P2-F06-T02 (W3) → P2-F06-T03 (W4) → P2-F05-T09 + P2-F06-T30 (W5) → P2-F06-T09 (W6)
3. **engine (backend):** P2-F05-T02 (W2) → P2-F04-T20 (W3) → P2-F05-T08 (W5 · รอ P2-F05-T01 W4) → P2-F06-T06 (W7 · รอ P2-F06-T04 W6) → P2-F06-T08 (W8) · systems: P2-F06-T01 (W1) → P2-F05-T20 (W2) → P2-F05-T01 (W4)
4. **art/audio:** P2-F05-T03 (W3) → P2-F05-T07 + P2-F06-T07 (W5) → P2-F06-T09 (W6) · P2-F05-T05 + T06 (W6) → P2-F05-T10 (W7) · P2-F06-T05 (W7) + P2-F06-T13 (W8) → P2-F06-T14 (W10)
5. **qa (คอขวดที่สอง ไม่มี slack W6–W12):** P2-F04-T19 (W6) → T22 (W7) → P2-F06-T11 (W8) → P2-F05-T11 (W9) → P2-F05-T16 (W10) → P2-F06-T17 (W11) → P2-F06-T21 (W12)
6. **สายสนาม (slack ราว 3 wave · ต้องครบก่อน P2-F06-T26 หลัง W12):** HUMAN P2-C01 → P2-C02 → P2-C03 (W9 · เร็วสุดตามกฎสลับ 1) → HUMAN P2-C05 · P2-F04-T10 (W2) → HUMAN P2-F04-T11 → P2-F06-T12 (W10) · P2-C04 (W11) → P2-F05-T12 (W12) → T13 (W13) → T19 (W14) → P2-CLOSE-QA
7. **ปิด Phase 1 (ขนาน):** P2-C06 (W14) → HUMAN P2-C07 → P2-C08 (W16) · ต้องเสร็จก่อน P2-CLOSE-PM

## 4. รายละเอียดงาน

ทุกงาน: ไม่มี emoji · เอกสารภาษาไทย โค้ดภาษาอังกฤษ · ค่าเกมและชื่อทั้งหมดจาก config · ไม่มีพิกัดใน log/telemetry/commit · agent ไม่ commit · พบว่าต้องใช้บริการคิดเงินให้หยุดและถามคน

### P1 — งานของ Phase 1 ที่ย้ายมา (D-086)

#### P2-C01 — HUMAN: ยืนยัน preview บนมือถือจริง (เดิม P1-F02-T19)
- ปลดล็อก: P2-C02, exit P1-E7 · deploy สำเร็จ run 36214493818 (2ab1fa1) · orchestrator ตรวจ curl + headless Pixel 7 แล้ว (6 tile, 2 glyph, 0 error)
- ห้ามเปิดบริการหรือแผนที่คิดเงิน (D-085) · ไม่ต้องใส่ credential ใด
- ขั้นตอน:
  1. บน Android (Chrome) เปิด https://keep-walking-preview.pages.dev · อนุญาตตำแหน่งเมื่อถูกถาม
  2. ตรวจว่าแผนที่กรุงเทพฯ ขึ้น ชื่อถนนภาษาไทยอ่านได้ วรรณยุกต์ไม่ลอย · กดปุ่ม "เริ่มหาตำแหน่ง" แล้วจุดตำแหน่งขึ้น · เปิด HUD ได้
  3. ทำซ้ำบน iPhone (Safari)
  4. ถ่ายภาพหน้าจอเครื่องละ 1 ภาพที่เห็นปุ่มทั้งหมด (ใช้ตรวจป้ายปุ่ม 11 cell ใน P2-F04-T06 · ถ่ายนอกบ้านหรือก่อนกดหาตำแหน่ง เพื่อไม่ให้เห็นจุดบ้าน) · ส่งภาพให้ orchestrator
  5. ตอบ orchestrator: "ผ่าน" หรือสิ่งที่ผิด (เครื่อง/เบราว์เซอร์ + อาการ)

#### P2-C02 — HUMAN: เดินทดสอบเชิงเทคนิค 30 + 30 นาที (เดิม P1-F02-T20)
- ปลดล็อก: P2-C03, P2-C04, P2-F06-T12, exit P1-E10 · raw trace ห้ามวางนอก `qa/playtest/results/raw/` (D-002) · ไม่ต้องสมัครบริการใด
- ขั้นตอน:
  1. อ่าน `qa/playtest/safety-briefing.md` และ `qa/playtest/field-walk-kit.md`
  2. ชาร์จทั้งสองเครื่องเต็ม ปิด battery saver จดรุ่น OS เบราว์เซอร์ และ % แบตเริ่มต้น
  3. ช่วงเช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 (D-093 · ดื่มน้ำตาม safety briefing) ไปสวนสาธารณะ เปิด preview URL อนุญาตตำแหน่ง เปิด HUD เดินต่อเนื่อง 30 นาทีตาม kit (จอเปิด 20 นาทีแรก แล้วเก็บเข้ากระเป๋า)
  4. export แบบ `summary` (ไม่มีพิกัด) จด % แบต กรอก `qa/playtest/field-walk-form.md` · ถ้ามีช่วงวางมือถือนิ่ง 5 นาทีตาม kit ให้จดค่า `stationary_5min_accum_m`
  5. raw trace เป็นทางเลือก: อ่านข้อความยินยอมใน kit ก่อน ถ้ายินยอมให้ export ไปไว้ที่ `qa/playtest/results/raw/` เท่านั้น แล้วตอบ orchestrator ว่ายินยอมให้แปลงเป็น recorded trace (P2-C04) หรือไม่
  6. ทำซ้ำในซอยแคบที่มีตึกสองข้าง 30 นาที
  7. บนทั้งสองเครื่อง: ถ่ายภาพจอ S1, S3, S4 ที่ความสว่าง 100% ในช่วงที่เดิน (V-17 กลางแดดจัดไม่ทำตาม D-093) · บน iPhone จดว่าสั่นได้หรือไม่ และเมื่อกดล็อกจอเองแล้วจุดยังขยับหรือไม่
  8. บันทึกเป็น `qa/playtest/results/<YYYY-MM-DD>-park-<device>.md` และ `...-soi-<device>.md` พร้อม summary CSV · ถ้า probe (P2-F04-T11) deploy แล้ว ทำขั้นตอนของ T11 ในรอบเดียวกันได้

#### P2-C03 — สรุปผล spike + คำแนะนำ Go / No-go (tech-lead, 1 วัน · เดิม P1-F02-T21)
- Inputs: `qa/playtest/results/`, `docs/tech/F02-map-location-spike.md` "เกณฑ์ spike", `product/reviews/F02-spike-criteria.md`, `qa/reports/F02-qa-gate.md`
- Acceptance:
  - [ ] ตารางผลวัดทุกเครื่อง × สถานที่ เทียบเกณฑ์ที่ตั้งไว้ก่อนวัดเท่านั้น ไม่ปรับเกณฑ์หลังเห็นผล · คอลัมน์ผลต่อผู้เล่นตามเกณฑ์ product-manager (handoff ร่างให้ product-manager อ่าน, blocking: no)
  - [ ] ความเสี่ยงและผลต่อ design: accuracy ในซอย, Grace 3 นาที, วรรณยุกต์บนแผนที่, attribution, ขนาด bundle S5 แบบ transfer (ถ้าต่างจากงบให้แก้ค่าใน `config/app/client.json` ผ่าน X ของ gameplay), ข้อจำกัดของ Pages Free
  - [ ] (TL N-11) `stationary_5min_accum_m` ต่อเครื่องเทียบ `movementGate.minDistancePerWindow_m` หลังใช้ตัวกรองของ ADR 0003 · ถ้าวางนิ่งจริงผ่าน gate: handoff ถึง systems-designer + game-director (blocking: yes) ตามกฎสลับ 4 · ไม่แก้ GDD
  - [ ] คำแนะนำ Go / Go พร้อมเงื่อนไข / No-go พร้อมเหตุผลเป็นตัวเลข · ถ้า No-go ระบุงาน Phase 2 ที่กระทบ

#### P2-C04 — Recorded trace จากการเดินจริง (location-engineer, 1 วัน · เดิม P1-F02-T24)
- ไม่มีความยินยอมบันทึกไว้ → orchestrator เปลี่ยนเป็น CUT เหตุผล "ไม่มีความยินยอม"
- Acceptance:
  - [ ] ใช้เฉพาะไฟล์ที่มีคำยืนยันความยินยอม (orchestrator แนบใน brief)
  - [ ] ตัดต้น/ปลาย ≥ `rawTraceTrim_m` จาก `config/app/privacy.json`, ปัดพิกัดตาม README, เวลา relative, ไม่มีรุ่นเครื่องหรือข้อมูลระบุตัวตน
  - [ ] ทุกไฟล์ใน `data/gps-traces/recorded/` ผ่าน `validateTrace` · README เพิ่มหัวข้อ recorded · ไม่แก้/ย้าย/commit ไฟล์ใน `raw/`

#### P2-C05 — HUMAN: ยืนยัน Go / No-go ของ map spike (เดิม P1-F02-T23)
- ปลดล็อก: P2-F06-T26, exit P1-E16 (rev 2: ไม่กั้น P2-F06-T14 และ P2-F05-T12 แล้ว)
- ขั้นตอน: อ่าน `docs/tech/F02-spike-results.md`, `product/reviews/F02-spike-criteria.md` → ตอบ orchestrator (ก) Go (ข) Go พร้อมเงื่อนไข ระบุ (ค) No-go ให้ producer เสนอแผนปรับ · ถ้าเงื่อนไขต้องใช้บริการคิดเงิน (เช่น R2) ต้องเป็น decision อนุมัติค่าใช้จ่ายแยก (D-085)

#### P2-C06 — Regression ปิด Phase 1 รอบ 2 (qa-tester, 1 วัน · เดิม P1-CLOSE-QA)
- Acceptance:
  - [ ] ทุก task ของ Phase 1 board เป็น DONE/CUT หรือระบุว่าย้ายมา P2-C* แล้ว
  - [ ] Phase 1 exit checklist E1–E20 มีหลักฐาน (E4, E15 = D-083, D-084) · รัน root `lint`, `typecheck`, `test`, `test:e2e`, `build` ใหม่ แนบ output
  - [ ] `qa/playtest/results/` ใน git ไม่มีพิกัด, `raw/` ถูก ignore · gitleaks ทั้ง history + forbidden-file guard สะอาด · ไม่มี config ที่ผูก R2 หรือบริการคิดเงิน (D-085)
  - [ ] `qa/bugs.md` ไม่มี blocking ค้าง · verdict PASS / NEEDS_CHANGES

#### P2-C07 — HUMAN: CI เขียว + Billing (เดิม P1-F02-T26)
- ปลดล็อก: exit P1-E5, P1-E20 · orchestrator push commit ของ P2-C06 เอง (D-086) แล้วส่ง URL ของ CI run ให้คน · ขั้น 1 ทำได้ทันทีไม่ต้องรอ
- ขั้นตอน:
  1. เปิดหน้า Billing ของ Cloudflare: ยืนยันว่าแผนเป็น Free และไม่มีบริการคิดเงินเปิดอยู่ (Workers Paid, R2 ฯลฯ) · เปิดหน้า Billing ของ GitHub: ยืนยันว่าไม่มีแผนหรือ spending limit ที่เกิน 0
  2. ตั้ง billing notification ตาม `infra/runbooks/billing-guard.md` (จาก P2-F04-T08) ถ้าบริการรองรับ · ห้ามเปลี่ยนแผน
  3. เปิด URL CI run ที่ orchestrator ส่ง ยืนยันว่าสีเขียวทุก job รวม secret scan (ถ้าแดง ส่งบรรทัดที่ fail)
  4. ตอบ orchestrator หนึ่งประโยค: "Billing ไม่มีบริการคิดเงิน, CI เขียว" หรือสิ่งที่พบ

#### P2-C08 — ปิด Phase 1 (producer, 0.5–1 วัน)
- Acceptance:
  - [ ] Phase 1 board: status ของ T19/T20/T21/T23/T24/T26/CLOSE-QA อ้างผลจาก P2-C* · สถานะ board เป็น COMPLETE
  - [ ] Phase 1 report: exit checklist ทุกข้อ PASS พร้อมหลักฐาน · ถ้า P2-C05 = No-go บันทึก E17 เป็นข้อเสนอปรับ design · change log ของทั้งสอง board บันทึกการปิด

#### P2-C09 — แก้ไฟล์ GDD ตาม D-084 (game-director, 1 วัน)
- ขอบเขต (GD N-01): แก้เฉพาะถ้อยคำของ D-004, D-005, D-006, D-015, D-020, D-021, D-022, D-030, D-038 B, D-080 ห้ามแก้คำพิมพ์ผิดหรือถ้อยคำอื่นแม้จะเห็น · ไม่ต้องมี HUMAN gate เพิ่ม · ระหว่างรอ งาน spec/copy/test plan อ้างเลข decision แทนถ้อยคำ GDD ใหม่
- Acceptance:
  - [ ] ทุก decision ในรายการมีการแก้ที่ตรงกับข้อความที่อนุมัติ (อ้างแถวใน decision log) · รายการ "ที่ยังต้องตัดสินใจ" ติ๊กตามที่ตัดสินแล้ว
  - [ ] `design/reviews/gdd-wording-D-084.md` แสดง diff ก่อน/หลังต่อหัวข้อ และยืนยันว่าไม่แตะ non-negotiable
  - [ ] ตาราง stat ใน GDD แสดง VIT ต่อยา +1% (D-038 B) ตรงกับ `config/balance/progression.json` หลัง P2-F06-T01
  - [ ] handoff ถึง orchestrator ให้บันทึกใน decision log ว่าถ้อยคำถูกนำไปใช้แล้ว (agent ไม่แก้ decision log)

#### P2-RISK-01 — Risk register (producer, 1 วัน)
- Acceptance:
  - [ ] ทุกแถวของ GDD "ความเสี่ยงที่ต้องเฝ้าดู" + Phase 1 report หัวข้อ 8 (iOS vibrate, Wake Lock, free tier, bundle, speed lock, solo survival, economy, coverage พระนคร/บางรัก, กฎหมาย) มี: สัญญาณเตือน, มาตรการ, เจ้าของ, task ที่เกี่ยว, สถานะ
  - [ ] ความเสี่ยงใหม่ของ Phase 2: ผลเดินทดสอบช้า/No-go, คอขวด gameplay/qa, ODbL (Q-P1-16), ผู้ร่วม playtest, **GR-1/บางรักไม่ผ่าน guardrail (PM-M3 · ผลจาก P2-F04-T18 + กฎสลับ 2)**, jitter ของเครื่องจริงผ่าน gate (TL N-11), โค้ดที่ client เรียก engine ต่างจาก server (C1-1)

### F04 — Dungeon Presence และ Run State

Lead: gameplay-programmer · ร่วม: backend (run engine), location-engineer, level-designer, uiux-designer, narrative-designer, qa-tester (+ งานฐาน: tech-lead, devops, product-manager, systems) · Gate: P2-F04-T27 (flow), P2-F05-T15..T18 (รวม F05), P2-F06-T23, T25 · งานคน: P2-F04-T11

#### P2-F04-T01 — Feature spec F04 + F05 (game-director, 3 วัน)
- Inputs: GDD "การเข้าและออก", "เวลาทำการ", "ระดับเลเวลที่เหมาะสม", "Core loop ใน Dungeon", "HP การตาย", "Anti-cheat ชั้น 1", "ความปลอดภัยทางกายภาพ", "สัญญาณขาดและแอปถูกปิด", `design/pillars.md`, flow F03, D-059, D-063, D-064, D-072, D-079, D-083, R-B1 · plan review GD หัวข้อ 1 และ B-02..B-05, N-03
- Acceptance:
  - [ ] F04: เลือกได้ทีละ 1 dungeon แม้ polygon ซ้อน, popup confirm ทุกครั้ง, ตาราง Active / Grace (≤ `graceMax_s`) / Suspended (≤ `suspendedMax_s`, เวลาไม่นับ) / Ended พร้อมทุก transition และการกลับเข้า, dungeon ปิดทำการเข้าไม่ได้ (และถ้าปิดระหว่าง run ทำอะไร), ช่วงเลเวลไม่บล็อกการเข้า
  - [ ] (GD B-03) check-in: sample ต่อเนื่อง ≥ `anticheat.checkIn.minContinuousApproach_s` ที่เดินเข้ามาจากข้างนอก และ accuracy < `anticheat.checkIn.maxAccuracy_m` · สิ่งที่ผู้เล่นเห็นระหว่างรอ · (GD B-02) speed lock: ล็อกการเล่นที่ `anticheat.speedLock.speedLock_kmh` (ไม่มี tick ไม่มีการตี) ข้อความบนจอ กฎปลดล็อก ผลต่อ run state
  - [ ] (A-3) การนำทางตามเงื่อนไข 1–4 ของ game-director: ระยะเส้นตรงปัดขั้นไม่ปัดลง + คำกำกับ, เกณฑ์ไกลใช้ `unlocks.home.farDungeonThreshold_m`, ไม่วาดเส้นทาง ไม่มี turn-by-turn, ลิงก์ส่งเฉพาะจุดสาธารณะของ dungeon โหมดเดิน ไม่มีตำแหน่งผู้เล่นใน URL, dungeon ปิดแสดงเวลาเปิดถัดไป
  - [ ] F05: gate ใช้ระยะสะสม > `minDistancePerWindow_m` ใน `rewardWindow` ที่ไม่ทับกัน (ตัวเดียวกันทุกที่) · จุดตั้งต้นของ tick นับจาก confirm และหยุดนาฬิการะหว่าง Grace/Suspended · ระยะที่เดินนอก polygon นับหรือไม่ (ตัดสินด้วยหลักข้อ 2 แล้ว handoff ถึง orchestrator ลง decision) · (B-04) คู่ sample ที่ห่างเกิน `maxSamplePairGap_s` หรือ accuracy แย่กว่า `maxSampleAccuracy_m` ไม่นับระยะ · (B-05) hysteresis ใช้กับการเปลี่ยนสถานะเท่านั้น เล็กเมื่อเทียบ `dungeons.area.minArea_m2` ไม่ซ้อนหน้าที่กับ Grace
  - [ ] tick ทุก 5 นาที, drop Common–Legendary + exp จาก config, สรุป run, ไม่มีเพดานเวลา, R-B1, D-059 · (TL N-14) นิยาม "ของใน run" ว่ารวม exp หรือไม่ เมื่อตาย (`death.loseAllRunLoot`) เทียบ auto-retreat (`autoRetreatKeepsRunLoot`)
  - [ ] edge case (เลียบขอบ, drift, accuracy แย่, สัญญาณขาด, ปิดแอปแล้วเปิดใหม่, เปลี่ยน dungeon, นาฬิกาเพี้ยน) · out-of-scope ชัด (party, server, raid, ตลาด) · อ้างค่าเป็นชื่อ config key (ชื่อ key ใหม่เป็นข้อเสนอให้ systems ตั้งใน P2-F05-T20)

#### P2-F04-T02 — PRD F04, F05, F06 (product-manager, 2–3 วัน)
- Acceptance:
  - [ ] ทุก PRD ครอบผู้เล่น 3 กลุ่ม: 40 นาที/วัน เทียบ 3–6 ชม./วัน, คนอยู่บ้านตอนฝนตก, คนอยู่นอกพื้นที่/นอกย่านเปิดตัว (PM-N02, D-073)
  - [ ] ตัวชี้วัดต่อ feature พร้อมเป้าที่วัดได้ใน playtest (เวลาจากเปิดแอปถึงเข้า dungeon แรก, สัดส่วน tick ที่ผ่าน gate ขณะเดิน, สัดส่วนคนที่ถึงรางวัลก้อนแรกใน 10 นาที) · อ้าง north star · ตัวชี้วัดเป็นที่มาของ event ใน P2-F04-T17 (GD N-05, PM-S1)
  - [ ] non-goals และคำถามที่ playtest ต้องตอบ · ข้อจำกัดของ playtest: ไม่มีจำนวนคนใน dungeon/ต่อจังหวัด (GD N-04), ผลบน client ไม่ใช่รางวัลจริง (C1-5), ผู้เล่นอายุ 15–17 ไม่ถูกทดสอบภาคสนามถ้าคนยืนยัน Q-H2 (PM 6.2)

#### P2-F04-T03 — reviewOsmIds + รัน pipeline ซ้ำ (location-engineer, 2–3 วัน)
- Inputs: D-083, `design/levels/coverage-report.md` หัวข้อ 6 และ 9, `tools/coverage/README.md`, P1-F01-T09 N-01, D-069
- Acceptance:
  - [ ] osm_id ที่ตัดถาวร (#1–5, #8, #12–17, #20, #22, #23) และที่ "ยังไม่ใช้" (#6, #7, #10, #18, #19, #21, #24, #25) อยู่ใน `coverageFilter.reviewOsmIds` (หรือ key ที่แยกสถานะได้) · #9, #11 ปล่อย · แตะเฉพาะ `coverageFilter`
  - [ ] คำราชาศัพท์ (เฉลิมพระเกียรติ, ราชานุสรณ์, ราชานุสาวรีย์, พระบรม, ราชอุทยาน, สมเด็จ) ใน `reviewNamePatterns` + flag สถานีรถไฟ/สถานที่เก็บค่าเข้า
  - [ ] รัน pipeline + analysis ซ้ำด้วยสูตร transit D-069 และคอลัมน์ `pocketPark_walk_median_m` · ตารางก่อน/หลังรายเขตของพระนคร ปทุมวัน บางรัก (input ของ P2-F04-T18 ใน W2)
  - [ ] pytest ผ่าน · ผลรันซ้ำได้ (SHA ของ output ใน run-meta) · ไม่มีไฟล์ดิบใน git

#### P2-F04-T04 — แผนบางรัก + รายชื่อ dungeon นำร่อง (level-designer, 2 วัน)
- Acceptance:
  - [ ] รายชื่อ 10–20 แห่งจากพระนคร + ปทุมวัน + บางรัก เฉพาะที่ผ่าน D-083 · ต่อแห่ง: osm_id, preset, level range, เหตุผล, ความเสี่ยงการเข้าถึง, ทางเข้าสาธารณะที่ใช้เป็นปลายทางนำทาง (A-3 ข้อ 3)
  - [ ] ช่วงเลเวลเริ่มต้น (1–5) มีในทุกย่าน ภายใน `farDungeonThreshold_m` ของพื้นที่อยู่อาศัย (F-11) และไม่มี level band ที่พึ่ง dungeon เดียว (N-04)
  - [ ] แผนบางรัก: ทางเสริม (ชั้นที่สอง / ริมน้ำ / ชั่วคราว) พร้อมจำนวนที่คาดและเงื่อนไข (input ของ GR-1 ใน P2-F04-T18) · แห่งที่ต้องวาดขอบเลี่ยงศาล (N-05) ระบุวิธี
  - [ ] `launch-criteria.md` 4.2 และ `presets.md` 8 เพิ่มเกณฑ์ F-11

#### P2-F04-T05 — ADR 0003 game core client-first (tech-lead, 3 วัน) — งาน tech แรกของ phase
- Inputs: ADR 0001/0002, `docs/tech/gps-trace-format.md` 4.1, HUD S12, F02 tech gate F-04/F-05b/F-08, D-054, D-057, D-075, `tools/sim/src/*`, plan review TL หัวข้อ 1 และ B-01..B-03, B-08, B-09, N-01, N-02, N-13
- Acceptance:
  - [ ] โมดูลและเจ้าของตามกฎ path ร่วม · C1-1 (ข้อยกเว้นหมดอายุ Phase 3), C1-3 (reducer `step(state, input, now_ms, params) → { state, events }` ไม่มี timer ใน shared), C1-4 (ไม่มี Ajv/`new Function` ใน runtime), C1-5 (`kw.p2.*` ล้างเมื่อ login ครั้งแรก) · `PresenceStrategy` (`continuous_gps` ทำจริง, `entry_exit` เป็น interface ที่โยน `NotImplemented`, เลือกจาก `verification_mode`) (B-08)
  - [ ] (B-02) นิยามแยก `gateDiagnosticWindows` (เลื่อน 30 วิ, HUD เท่านั้น) กับ `rewardWindow` (ไม่ทับกัน เริ่มเมื่อเข้า Active หลัง confirm หยุดนับระหว่าง Grace/Suspended · เลือกกฎคู่ sample ที่คร่อมขอบหน้าต่างหนึ่งแบบ) · `comparison: greaterThan` · R = 6,371,008.8 ม. · (B-03) ตัวกรองของ gate ทิ้งเฉพาะ outlier (accuracy, ความเร็วที่เป็นไปไม่ได้) ไม่ smoothing jitter เล็ก และ resample เป็นจังหวะคงที่จาก config ก่อนสะสมระยะ · (GD B-04) คู่ sample ที่ห่างเกินเกณฑ์ไม่นับระยะ
  - [ ] (B-09) สัญญา RNG: stream แยกต่อระบบ (drop, hit) แตกจาก seed ของ run แบบกำหนดแน่นอน, ลำดับการดึงต่อ tick (rarity → item → `stochasticRound`) และต่อการตี, Phase 3 seed อยู่ที่ server เท่านั้น · (N-13) วิธีวัดงบ bundle (brotli ของ JS ที่โหลดตอนเปิด, maplibre + worker lazy มีงบแยก)
  - [ ] (C1-2, B-01, B-07) ESLint: ห้าม `Date.now`, `Math.random`, `performance`, timer, `window`, `document`, `navigator`, storage, `fetch`, `crypto.getRandomValues` ใน `packages/shared/src/**` และ `packages/geo/src/**` · ห้าม `@keep-walking/*` ใน `packages/geo/src/**` · ห้าม `apps/client` import `run`/`reward`/`hp` ตรง (ใช้ `session`) · `packages/geo/tsconfig.json` แบบเดียวกับ shared (`lib: ["ES2023"]`, `types: []`)
  - [ ] (N-01, N-02) subpath exports ใน `packages/shared/package.json` · ติดตั้งล่วงหน้า: `happy-dom` (dev), `polylabel` (ใน `tools/dungeons`), ตัว rasterize SVG ที่ไม่มี install script (เช่น `@resvg/resvg-js`), ตัว parse opening_hours เฉพาะใน `tools/dungeons` ถ้าเลือก (ห้ามใน apps/packages · B-12) · stub `packages/geo`, `tools/dungeons`, `tools/config-lint` · vitest include ครอบ tools ใหม่ · root `lint`, `typecheck`, `test`, `build` เขียว
  - [ ] ตัดสิน D-054, D-057, D-075 ใน ADR (handoff ให้ orchestrator ลง decision log) · tech note F02 หัวข้อ 15.2 และบรรทัด ~424 (นอกพื้นที่ = mask ผ่าน packages/geo) แก้แล้ว

#### P2-F04-T06 — UX carry-over (uiux-designer, 1–2 วัน · W7)
- หมายเหตุ rev 2: ย้ายจาก W1 ไป W7 เพื่อเปิดช่องเส้นวิกฤต · client นำไปใช้ใน P2-F06-T08 (token/component, S-22) และ P2-F06-T10 (N-3) แทน P2-F04-T21
- Acceptance:
  - [ ] N-3: run แรกแสดง `dungeon.confirmTutorialLine` ก่อนหรือบนจอพกกระเป๋า · N-1 + F-08: S-22 ไม่มี toggle auto-retreat ในหน้าแรกและไม่มีเมนู "ภาษา"
  - [ ] tokens: V-16 (12 ramp, nameMapping, font.map.weights, ตัวเลขตีบวก ≥64 px), `color.ramp.skin-1..6` / `hair-1..6` · components: V-15 `.chip-sponsored`, V-20 ขอบ `.toast.faded` = ink.500, V-22 `.gps-pill` ≥14 px · สอดคล้องกับ flow F04–F06 ที่เขียนไปแล้ว (P2-F04-T15, P2-F06-T03)
  - [ ] wireframe 01 บรรทัด ~105 `interest.confirm` "(ยื่นเรื่อง)" · index.html ใช้ "ยื่นเรื่องเปิดจังหวัด"
  - [ ] ตรวจป้ายปุ่ม 11 cell จากภาพของ P2-C01 (ถ้ายังไม่มีภาพ ใช้ screenshot e2e และบันทึก assumption)

#### P2-F04-T08 — CI hygiene + cost guard (devops-engineer, 1–2 วัน · ไม่เกิน W6)
- Acceptance:
  - [ ] CI รัน `infra/scripts/test/test-lint-headers.sh` (หรือ vitest bridge) และล้มเมื่อกฎ `_headers` ทับกัน
  - [ ] CI ตรวจว่า `infra/` และ workflow ไม่เรียกบริการคิดเงิน (รายการใน D-085) · runbook บอกวิธีตรวจว่า token มีแค่ Pages Edit (คนตรวจ agent ไม่ใช้ token)
  - [ ] `infra/runbooks/billing-guard.md`: ขั้นตอนตั้ง billing notification ของ Cloudflare และ GitHub สำหรับคน (ใช้ใน P2-C07) · ต้อง DONE ก่อน orchestrator แจ้ง P2-C07
  - [ ] CI ทั้งหมดเขียวในเครื่องด้วย script เดียวกับ workflow

#### P2-F04-T09 — QA carry-over (qa-tester, 2 วัน)
- Acceptance:
  - [ ] `qa/bugs.md`: บั๊ก high ของ P1-H06 (ป้ายซ้ำ ปิดใน P1-X32/X33) บันทึกย้อนหลัง · BUG-F01-001/002 ปิดพร้อมหลักฐาน P1-X29
  - [ ] e2e ถาวร TC-MAP-05 (เน็ตหลุดกลาง pan), TC-MAP-08 (tile นอกชุด) · นับ layer kw-rift-sponsored/kw-rift-crack
  - [ ] contrast.test.ts regex `ramp\.([a-z0-9-]+)` นับ 22 (หลัง P2-F04-T06) · map-style.test.ts static check ไม่มี symbol layer บน source kw-dungeons
  - [ ] ถ่าย S1/S3 ใหม่ + S6 ชายฝั่งสมุทรปราการ (100.60, 13.50 z10/z13) · ถ้าพบขอบดำกลางทะเล handoff ถึง location

#### P2-F04-T10 — HUD probe + carry-over + code-split (gameplay-programmer, 3 วัน)
- Goal: ให้คนวัดความสามารถของเครื่องที่ D-063 พึ่ง (F-17) ได้เร็ว และตั้งงบ bundle ก่อน client โต (รับ P2-F06-T15 · TL B-04: DOM test ย้ายไป P2-F04-T25)
- Acceptance:
  - [ ] probe ใน HUD: ขอ/ปล่อย Screen Wake Lock และบันทึก release, ปุ่มทดสอบ `navigator.vibrate` (รายงาน "ไม่รองรับ" ถ้าไม่มี), นับ sample GPS และเวลาขณะ `visibilitychange` hidden/จอล็อก, แบต (ถ้ามี API) · export เป็น summary ไม่มีพิกัด
  - [ ] HUD เลือก environment/segment ในหน้าเดียว และคำนวณ `stationary_5min_accum_m` ตาม gps-trace-format 4.1 ฉบับที่ใช้อยู่ · `tilesUrlMissing` ผ่าน `getCopyText` ไม่มีข้อความไทยฝัง
  - [ ] maplibre (และ worker) โหลดแบบ lazy · ขนาดตอนเปิดแบบ transfer วัดตามวิธีใน ADR 0003 ≤ `bundle.initialJsBudget_bytes` ใน `config/app/client.json` (ค่าตั้งต้น S5 ≤ 1.0 MB · แก้เฉพาะค่าถ้า P2-C03 ให้ตัวเลขใหม่) · script วัดที่ CI เรียกได้ (ใช้ใน P2-F06-T16)
  - [ ] lint/typecheck/test/e2e เขียว · ไม่ log พิกัดดิบ

#### P2-F04-T11 — HUMAN: deploy probe + ทดสอบบนสองเครื่อง
- ปลดล็อก: P2-F06-T12 · เริ่มเมื่อ orchestrator แจ้งว่า commit + push ของ P2-F04-T10 แล้ว · ห้ามเปิดบริการหรือแผนที่คิดเงิน (D-085) · ถ้าหน้าใดขอให้อัปเกรด ให้หยุดและแจ้ง orchestrator
- ขั้นตอน:
  1. GitHub repo → Actions → "deploy-preview" → Run workflow (ตามตัวเลือกใน `infra/runbooks/preview-setup.md`) · รอจบสีเขียว
  2. เปิด preview บน Android (Chrome) → HUD → probe: กดขอ Wake Lock, กดทดสอบสั่น, จดผลที่หน้าจอแสดง
  3. เปิดโหมดตามตัว แล้วกดล็อกจอเอง เดินรอบบ้าน/ซอยใกล้บ้าน 10 นาที เปิดจอกลับมาดูว่า sample ขาดช่วงหรือไม่
  4. ทำซ้ำบน iPhone (Safari) · จด % แบตต้นและท้าย
  5. export summary (ไม่มีพิกัด) ของทั้งสองเครื่อง วางใน `qa/playtest/results/<YYYY-MM-DD>-probe-<device>.md` แล้วแจ้ง orchestrator

#### P2-F04-T12 — `packages/geo` (location-engineer, 3 วัน)
- Acceptance:
  - [ ] (TL B-01) geo เป็น leaf: `packages/geo/package.json` ไม่มี dependency `@keep-walking/*` · input เป็น structural type ของตัวเอง (`{ t_ms, lat, lng, accuracy_m }`) · (GD B-05, TL B-03) ค่าทุกตัวรับเป็น parameter ไม่มีค่าตั้งต้นในโค้ด geo ไม่อ่าน config เอง (test ใช้ fixture)
  - [ ] haversine ด้วย R ตาม ADR 0003 · `gateDiagnosticWindows` + ตัวช่วยสะสมระยะของ `rewardWindow` ตามนิยาม ADR · ตัวกรอง outlier (accuracy, ความเร็วเป็นไปไม่ได้) + resample ตาม cadence · ไม่ smoothing jitter เล็ก
  - [ ] (GD B-04) คู่ sample ที่ห่างเกิน `maxSamplePairGap_s` หรือ accuracy แย่กว่า `maxSampleAccuracy_m` ไม่นับระยะ · ฟังก์ชันความเร็วสำหรับ speed lock (v1 = ความเร็วดิบระหว่างคู่ sample · P2-F05-T13 เปลี่ยนภายในโดยคง signature)
  - [ ] point-in-polygon + hysteresis ที่ขอบ (ใช้กับการเปลี่ยนสถานะเท่านั้น) · polygon มีรูและ multipolygon · "อยู่ใน play area" จาก `data/map/playarea-mask.geojson` (D-064)
  - [ ] ผลกับ trace สังเคราะห์: table-still = 0 หน้าต่างผ่าน, bench-jitter ≥ 1, drift-spike ไม่ได้ระยะจาก spike, edge-walk ไม่สลับถี่ · unit test ครอบ ไม่มี DOM · ผ่าน lint boundary ของ ADR

#### P2-F04-T13 — ข้อมูล dungeon นำร่อง (level-designer, 2 วัน)
- Acceptance:
  - [ ] 10–20 record ตามรายชื่อ P2-F04-T04: id, zone name key (รูปแบบ key ตกลงเป็น assumption ถ้า P2-F04-T16 ยังไม่เสร็จ), polygon, level_range, preset, drop_table_id ที่มีใน config, `verification_mode: continuous_gps`, `floor_level: null`, status, จุดปลายทางนำทางสาธารณะ (ถ้ามี · A-3 ข้อ 3)
  - [ ] opening_hours: ตาราง normalized ตามรูปแบบใน tech note P2-F04-T14 พร้อมแหล่ง (OSM หรือกรอกเอง) · ค่า `PH` ของ OSM → `opening_hours_source: manual_required` (TL B-12) · อย่างน้อย 1 แห่งมีช่วงปิดที่ QA ใช้ทดสอบได้
  - [ ] polygon ตามกฎ `dungeon-rules.md` (พื้นที่ 3,000–150,000 ตร.ม., ไม่ทับกันเกินเกณฑ์, ไม่ทับเขตที่ตัด) · validator ของ P2-F04-T26 ตรวจใน W4 (ไม่ผ่าน = orchestrator เปิด X)
  - [ ] `LICENSE-DATA.md` ตามคำตอบ Q-H1 (ค่าตั้งต้น: ODbL 1.0 + attribution OSM) · ไม่มีชื่อสถานที่ฝังในโค้ด · ถ้าชุด record ต่างจากรายชื่อ T04 จนกระทบช่วงเลเวลเริ่มต้น handoff ถึง product-manager (กฎสลับ 3)

#### P2-F04-T14 — Tech note F04 + F05 (tech-lead, 3 วัน)
- Acceptance:
  - [ ] API: `sessionStep(state, input, now_ms, config, rng) → { state, events }` ใน `src/session/` และ API ย่อยของ run/reward · sequence ต่อ tick (sample เข้า → presence → gate → tick → drop) · sequence ของ confirm + check-in ผ่าน `PresenceStrategy` · client เรียกเฉพาะ `session` (TL B-07, B-08)
  - [ ] (GD B-04, TL N-09) failure modes: แอปถูกปิดแล้วเปิดใหม่ (run ไม่ถูกลบ, เข้า Grace/Suspended ตามเวลาที่หาย, > `connectionLostEndsRunAfter_s` = Ended เก็บของที่ได้แล้ว, ระยะที่คร่อมช่องว่างไม่นับ), นาฬิกาเครื่องเปลี่ยน (ใช้ timestamp ของ sample + ตรวจ monotonic · ถอยหลัง = ไม่ให้ tick ในหน้าต่างนั้น), state เวอร์ชันเก่ากู้ไม่ได้ = ทิ้ง, storage เต็ม (ทิ้ง telemetry ก่อน run state), GPS หาย, accuracy ต่ำ
  - [ ] (GD B-08, C2-5) เก็บเฉพาะ sample ที่ `rewardWindow` ปัจจุบันและการกู้ run ต้องใช้ ลบเมื่อ run จบ · key เพดานการเก็บ sample ในเครื่องใน `config/app/privacy.json` ไม่เกิน `balance.privacy.positionLogTtl_s` · (C2-2, C2-4) sink ring buffer + key เพดานใน `config/app/telemetry.json` · export เป็น Blob เวลา relative ไม่มีพิกัด (dungeon id เท่านั้น)
  - [ ] (TL B-12) รูปแบบ artifact ของ dungeon ที่ `tools/dungeons` สร้าง (polygon, จุดป้าย, จุดปลายทางนำทาง, property whitelist, ตารางเวลาทำการ) · ประเมินเวลาทำการด้วยฟังก์ชัน pure ใน `src/run/` จาก `now_ms` + offset คงที่ `dungeons.openingHours.utcOffset_min` ไม่ใช้ timezone ของเครื่อง
  - [ ] (A-3 ข้อ 5) รูปแบบลิงก์เปิดแอปแผนที่บน Android Chrome และ iOS Safari (ปลายทางเท่านั้น โหมดเดิน ไม่มี API key) + fallback แสดงชื่อสถานที่ให้คัดลอก · (TL N-14) exp หายเมื่อตายหรือไม่ ตาม spec (ถ้า spec ไม่ระบุ ใช้ assumption + handoff ถึง game-director)
  - [ ] test hooks: เล่น trace ผ่าน Mock แบบเร่ง, กำหนดเวลาเริ่มผ่าน query (เวลาทำการ), seed ของ RNG · ชื่อ event จาก `product/telemetry-events.md`

#### P2-F04-T15 — Flow F04 + wireframe (uiux-designer, 2 วัน)
- Acceptance:
  - [ ] ทุกสถานะ: ว่าง, กำลังโหลด, GPS ปิด, accuracy ต่ำ, ออฟไลน์, dungeon ปิด (เวลาเปิดถัดไปก่อนปุ่มนำทาง), ไกล, นอกพื้นที่, error · Active/Grace/Suspended/Ended ต่างกันชัดโดยไม่ต้องอ่านตัวเลข
  - [ ] (A-3) นำทาง: ลูกศร/ข้อความทิศ + ระยะเส้นตรงแบบปัดขั้นพร้อมคำกำกับ, ไม่มีเส้นทางหรือเส้นตรงบนแผนที่, ปุ่มเปิดแอปแผนที่ภายนอก + fallback คัดลอกชื่อ · เลือก dungeon เมื่อ polygon ซ้อน · popup confirm แสดงชื่อโซน **ไม่แสดงจำนวนคน** (GD N-04 · ระบุตำแหน่งที่จะแสดงเมื่อมี backend)
  - [ ] (GD B-03) สถานะ "รอสัญญาณ" / "เดินเข้ามาจากข้างนอก" ขณะ check-in ยังไม่ผ่าน · (GD B-02) จอ speed lock (ล็อกการเล่น บอกเหตุ บอกวิธีปลด ไม่ต้องจ้องจอ)
  - [ ] ใช้ copy key (ร่างไทยในวงเล็บ) · ไม่แสดงตำแหน่งผู้เล่นคนอื่น ไม่มีข้อความอิสระ · touch target และ token ตาม `components.md`

#### P2-F04-T16 — Copy F04 + ชื่อโซน + world.md + area client (narrative-designer, 2–3 วัน)
- Acceptance:
  - [ ] (GD B-09 ทาง ก) ธง H-01..H-13 ใน `world.md` เปลี่ยนเป็น "ยืนยันแล้ว (D-084)" ตามทางที่เลือก และเนื้อหาที่ขึ้นกับธงสอดคล้อง **ก่อน** ตั้งชื่อโซน
  - [ ] ทุก key ที่ flow F04 อ้าง (รวมรอ check-in, speed lock, นำทาง "ระยะเส้นตรง", fallback คัดลอกชื่อ, dungeon ปิด + เวลาเปิดถัดไป) ผ่านกฎ 6 ข้อและเพดาน cell · `pnpm lint:copy` 0 FAIL
  - [ ] ชื่อโซนของ dungeon นำร่องทุกแห่งใน `names.th.json` ตามรูปแบบใน world.md (ไม่มีราชาศัพท์, ไม่มีแบรนด์) · ไม่มีข้อความที่ทำให้ผู้เล่นเป็นวีรบุรุษ
  - [ ] `copy-rules.json` มี area `client` · ไม่มี WARN S1 ของ key client.*

#### P2-F04-T17 — Telemetry + metrics F04–F06 (product-manager, 2 วัน · W4 ก่อน client)
- Acceptance:
  - [ ] event ของ F04–F06 ตามตัวชี้วัดใน PRD (P2-F04-T02): เข้า/ออก dungeon, state change, tick granted/denied, drop, run end + exit_reason (auto-retreat, ตาย, ปิดฉุกเฉิน, suspended_by_reports), run_death ตาม R-B1, เปิด/ปิด auto-retreat, ยา, onboarding step, Wake Lock ได้/ไม่ได้/ถูกปล่อย, เวลา page hidden ต่อ run, `anticheat_speed_lock_triggered` (เข้า/ออก lock), `checkin_rejected` (reason), ลบข้อมูลในเครื่อง · ไม่มีพิกัด
  - [ ] (PM-M2) `onboarding_empty_screen_shown` / `onboarding_empty_screen_abandoned` พร้อม `reason` = far / out_of_area / outside_launch_district และ `interest_registered_outside_area`
  - [ ] metrics: B-07 (เวลาถึง auto-retreat ต่อ class, party ratio D-039, ratio รายได้/ยา, 10.1 ตาม D-063, GR-9), F-16, guardrail โซนแดง (N-03) · (PM-S3) proxy ของ north star ฝั่ง client สำหรับ Phase 2 คำนวณจาก event ของ movement gate ตัวเดียวกับรางวัล
  - [ ] อ้าง key จริง (`telemetry.sampling.*`, `telemetry.timestamps.clockSkewTolerance_s`, `telemetry.goldAmountBuckets.upperBounds_gold`, `dungeons.safety.*`) และ key ใหม่ของ P2-F04-T14 ใน `config/app/telemetry.json`

#### P2-F04-T18 — GR-1 ของ 3 ย่าน (product-manager, 1 วัน · W2)
- Acceptance:
  - [ ] GR-1 คำนวณจากผลรันซ้ำ (P2-F04-T03) + จำนวนทางเสริมที่คาดของบางรัก (P2-F04-T04) สำหรับพระนคร + ปทุมวัน + บางรัก พร้อมวิธีคิดและเทียบค่าเดิม
  - [ ] verdict ต่อย่านเทียบ guardrail G4 (≤ 5%) และ S3 (≤ 15%) · ถ้าเกิน: handoff ถึง producer (blocking: yes) ตามกฎสลับ 2 พร้อมทางเลือกที่เห็น
  - [ ] A-P1-F01-T06-2/-4/-7 ยืนยันหรือแก้ พร้อมเหตุผล

#### P2-F04-T19 — Test plan F04 + F05 + QA traces (qa-tester, 3 วัน)
- Acceptance:
  - [ ] traceability: ทุก acceptance ใน spec F04/F05 และ E1–E5, E16 → case id · ระบุวิธีรันผ่าน Mock แบบเร่งและผลที่คาดต่อ trace
  - [ ] (TL N-08) QA trace สร้างด้วย script ใน `qa/tests/traces/` ที่เรียก builder ของ `tools/traces` พร้อมโหมด `--check` ใน `pnpm test` · ผ่าน `validateTrace` · ขาดความสามารถ = handoff ถึง location-engineer
  - [ ] trace: ทุก transition, Grace 2:59/3:01, Suspended 14:59/15:01, เลียบขอบ, drift spike, วางนิ่ง, ม้านั่ง jitter, polygon ซ้อน, เข้าตอนปิดทำการ (ใช้ hook เวลาเริ่ม), (GD B-03) teleport เข้า polygon และ accuracy 35 ม. ถูกปฏิเสธ, (GD B-02) `driving-40kmh` ติด lock, (GD B-04) เดิน 20 นาที + ช่องว่าง 5 นาทีห่าง 400 ม. + เดินต่อ 5 นาที → 400 ม. ไม่ถูกนับ
  - [ ] case ตรวจ storage หลังจบ run ไม่มีพิกัดค้าง (GD B-08) และ request ไปเฉพาะ origin ที่อนุญาต (C2-1)

#### P2-F04-T20 — Run engine (backend-programmer, 3 วัน)
- เงื่อนไข A-6: ไม่เขียนโค้ด Worker/DO/D1 · สร้างตามสัญญาใน tech note P2-F04-T14 ไม่ใช่ตามโค้ด client
- Acceptance:
  - [ ] reducer ตาม ADR 0003 · เลือกได้ทีละ 1 dungeon ต้อง confirm · polygon ซ้อนยังนับ dungeon ที่เลือก · state machine ค่าจาก `dungeons.json` (`graceMax_s`, `suspendedMax_s`, `suspendedTimeCounts`, hysteresis ของ `runState`)
  - [ ] (TL B-08, GD B-03) `continuous_gps` ใช้ `anticheat.checkIn.*` ตอน confirm (teleport เข้า polygon และ accuracy เกินเกณฑ์ถูกปฏิเสธพร้อม reason) · `entry_exit` โยน `NotImplemented` · เลือก strategy จาก `verification_mode` ของ record
  - [ ] (GD B-02) สถานะ speed lock จากฟังก์ชันความเร็วของ `packages/geo` เทียบ `anticheat.speedLock.speedLock_kmh`: ไม่มี tick ไม่มีการตี มี event เข้า/ออก lock · กฎปลดตาม spec
  - [ ] ปิดทำการ: เข้าไม่ได้พร้อมเหตุผลที่ UI แสดงได้ · ปิดระหว่าง run ตาม spec · ประเมินด้วย `now_ms` + `openingHours.utcOffset_min` (TL B-12)
  - [ ] (GD B-08) state เก็บเฉพาะ sample ที่หน้าต่างปัจจุบันต้องใช้ ไม่เกินเพดานใน `config/app/privacy.json` ลบเมื่อ Ended · serialize/กู้คืนได้
  - [ ] ผ่าน vector ของ P2-F05-T20 (run state, check-in, ขอบเวลา 180/900 วิ, ช่องว่าง sample) · ไม่มีตัวเลขเกมฝัง · ผ่าน lint ความ pure

#### P2-F04-T21 — Client F04 UI (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] แผนที่แสดง dungeon นำร่องผ่าน `setDungeonsSourceData` จาก artifact ของ P2-F04-T26 (ป้าย 1 ต่อ dungeon) · รายการใกล้ตัว + นำทางตาม flow ที่อนุมัติ (P2-F04-T27) และ A-3 (ไม่มีเส้นทาง, ลิงก์ไม่มีตำแหน่งผู้เล่น) · popup confirm ไม่มีจำนวนคน · แถบสถานะ run ทุก state
  - [ ] จอรอ check-in และจอ speed lock ตาม flow · dungeon ปิดแสดงเวลาเปิดถัดไป
  - [ ] Mock UI: เลือก trace (รวม QA trace) + ความเร็ว ×1/×10/×60 ผ่าน URL/config แล้ว loop เดินตาม game clock ของ P2-F04-T25 · เรียก `sessionStep` เท่านั้น (ไม่ import `run`/`reward`/`hp` ตรง)
  - [ ] ยิงเฉพาะ event ที่ประกาศใน `product/telemetry-events.md` ฉบับของ P2-F04-T17 (PM-M1) · wire copy area ใหม่ · ไม่มีข้อความไทยฝัง · lint/typecheck/test/e2e เขียว (android-chrome + ios-safari)

#### P2-F04-T22 — Black-box F04 (qa-tester, 2 วัน)
- Acceptance:
  - [ ] trace-replay ผ่าน interface สาธารณะ ครบทุก case ของ test plan F04 (รวม check-in, speed lock) · รันจาก root script ใน CI ได้
  - [ ] e2e: เข้า dungeon ที่ปิดไม่ได้, confirm, เปลี่ยนสถานะเมื่อเดินออก/กลับเข้า · (C2-1) request ระหว่างเล่น run ครบรอบผ่าน Mock ไปเฉพาะ origin ใน `config/app/client.json`
  - [ ] (TL N-03) contract test: ชื่อ event ที่ client ยิงตรงกับตารางใน `product/telemetry-events.md` · บั๊กลง `qa/bugs.md` พร้อม trace ที่ทำซ้ำ

#### P2-F04-T23 — Location hygiene (location-engineer, 2–3 วัน)
- Acceptance:
  - [ ] F-05a ลบ `LegacyWebLocationTiming` · export `WebLocationTiming` จาก index แล้วลบ alias · (ทางเลือก) ย้าย listeners/platform ไป `src/internal/`
  - [ ] F-07 `excluded.geojson` ≤ 4.5 MB · run-meta.json เก็บเฉพาะคีย์ที่อ่านจริง · README หัวข้อ 6 · ลบข้อความไทยใน docstring `boundaries/osm.py:27` · legend heatmap อ่านตัวเลขจาก config
  - [ ] fixture ที่ครอบ S2 (ซอยสุขุมวิท) และ S5 (เจ้าพระยา) · ถ้า S6 มีขอบดำกลางทะเล ตัดรู mask ด้วย bbox tile · polygon จังหวัดขนาดเล็กที่ commit ได้ + `build.sh` ตรวจ bbox-vs-province ได้โดยไม่ต้องมีไฟล์ใน `tools/coverage/out/` (X39)
  - [ ] (TL N-06) `tools/traces` ใช้ haversine + หน้าต่างจาก `packages/geo` และลบสำเนา · `generate.ts --check` ยังเขียว · pytest + tiles test ผ่าน

#### P2-F04-T24 — Config schema + config lint (tech-lead, 2 วัน · ใหม่ rev 2 · TL B-06)
- Acceptance:
  - [ ] JSON Schema ต่อไฟล์ใน `config/balance/`, `config/content/`, `config/app/` ใน `packages/shared/schemas/config/` · ใช้ใน test/build เท่านั้น (C1-4)
  - [ ] config lint ตาม ADR 0001 หัวข้อ 3.10 / D-062 (`_meta`, `_source`, suffix หน่วย, pointer, `null`) + H01 · รันใน `pnpm test` (เข้า CI เอง)
  - [ ] config ปัจจุบันผ่านทั้งหมด หรือรายการที่ไม่ผ่านเป็น handoff ถึงเจ้าของไฟล์ (systems, narrative) · root test เขียว

#### P2-F04-T25 — Client plumbing (gameplay-programmer, 3 วัน · ใหม่ rev 2 · TL B-13)
- Acceptance:
  - [ ] F-04: client โหลดเฉพาะ key ที่ใช้ผ่าน build step (virtual module หรือไฟล์ generate) ไม่ import `dungeons.json`/`anticheat.json` ทั้งไฟล์ · F-08: ค่าคงที่ UI เข้า `config/app/client.json` · F-05b: `apps/client/src/debug/stats.ts` ใช้ `packages/geo` และลบสำเนา (ปิด TL N-12 · R 6,371,000 → ของ geo)
  - [ ] game clock adapter: `now_ms` = เวลาเริ่ม replay + `mock.position()` เมื่อใช้ Mock (×10/×60 แล้ว tick/การตีตรง) · เวลาเริ่มเลือกผ่าน query (test hook ของ QA)
  - [ ] storage adapter ของ run state ใน `kw.p2.*` (มี `schemaVersion`, กู้ไม่ได้ = ทิ้งแล้วเริ่มใหม่ไม่ crash, บังคับเพดานเก็บ sample · GD B-08) + ฟังก์ชันล้างข้อมูลในเครื่องสำหรับปุ่มใน P2-F06-T09 (C2-6)
  - [ ] telemetry sink ring buffer + export Blob เวลา relative (C2-2, C2-4) · (C2-3) test ยืนยันว่าไม่มี property ชื่อหรือค่าที่เป็นพิกัด (`lat`, `lng`, `lon`, `coords`, `accuracy`, คู่ทศนิยม ≥ 4 หลักในช่วง lat/lng ของไทย) ใน event และ export · รายการ origin ที่อนุญาตใน `config/app/client.json` (C2-1)
  - [ ] (TL B-10) อ่าน profile ตอน build (env ตามชื่อใน tech note เช่น `VITE_KW_PROFILE`, `VITE_KW_COMMIT`) · profile `playtest`: HUD ปิดตั้งต้น, Mock เปิดได้เฉพาะ query, แสดง version + short SHA
  - [ ] (TL B-04) test ของ hud-panel ใน DOM environment ครอบ S15 latency และ S3 แบต/CSV · ตามนิยาม 4.1 ของ ADR 0003 · lint/typecheck/test/e2e เขียว

#### P2-F04-T26 — `tools/dungeons` (location-engineer, 2–3 วัน · ใหม่ rev 2 · TL B-12)
- Acceptance:
  - [ ] validator ตาม `design/levels/dungeon-rules.md` (พื้นที่ 3,000–150,000 ตร.ม., ไม่ทับกันเกินเกณฑ์, ไม่ทับเขตที่ตัด, field บังคับ รวม `verification_mode`, `floor_level`) + `packages/shared/schemas/dungeon.schema.json` · รันใน `pnpm test` กับ `data/dungeons/`
  - [ ] build artifact ของ client ตามรูปแบบใน P2-F04-T14: polygon, จุดป้ายด้วย polylabel ตอน build (D-075), จุดปลายทางนำทาง (ทางเข้าที่ปักไว้ ไม่งั้นจุดป้าย · A-3 ข้อ 3), property whitelist, ตารางเวลาทำการ normalized (แปลงจาก OSM ได้ใน tools · `PH` → `manual_required`)
  - [ ] deterministic (รันซ้ำได้ผลเดิม) · ไม่มี network ตอน build · test ครอบ fixture ที่ผ่านและไม่ผ่าน

#### P2-F04-T27 — อนุมัติ flow F04 (game-director, 1 วัน · ใหม่ rev 2 · GD B-01)
- ตรวจ: flow + wireframe F04 ตรง spec F04 และเงื่อนไข A-3, จอ check-in/speed lock, ไม่มีตำแหน่งรายบุคคล ไม่มีจำนวนคน ไม่มีข้อความอิสระ, ไม่สอนสิ่งต้องห้าม · verdict PASS / NEEDS_CHANGES (ข้อแก้เป็น fix ของ uiux ก่อน P2-F04-T21)

### F05 — Movement Gate, Reward Tick และ Drop

Lead: gameplay-programmer · ร่วม: systems-designer, backend-programmer (engine), artist-2d, vfx-animator, sound-designer, qa-tester · Gate: P2-F06-T30 (flow), P2-F05-T15..T19, P2-F06-T23, T25

#### P2-F05-T01 — Config loop + vectors (systems-designer, 3 วัน)
- Acceptance:
  - [ ] exp ต่อ tick ต่อระดับโซน และ drop table Common–Legendary ต่อ preset (dungeon เล็กของน้อยแต่ rare สูงกว่า) · ไอเทมที่ drop มี `assets.icon` เป็น manifest id และชื่อเป็น key
  - [ ] (GD B-06) ยาอยู่ใน drop table ทุก preset พร้อม `assets.icon` · vector ยืนยันว่าผู้เล่นเลเวลตรงโซนมีโอกาสได้ยาก่อนถึง auto-retreat (ค่าให้ systems ตั้ง) · ไม่มีชุดยาตั้งต้น
  - [ ] ค่า F06 ครบและอ้าง GDD: ช่วงสุ่มการตี 45–75 วิ, hit chance, ตัวคูณห่างเลเวล ×1.25, เกณฑ์ยาอัตโนมัติ, แจ้ง 30%, ฟื้น 0→50% ใน 30 นาที · `dungeons.safety` ตาม D-061 ที่แก้ (B-02)
  - [ ] vector: drop/hit ระบุ seed + ลำดับการดึงตาม ADR 0003 (TL B-09) · ตายเทียบ auto-retreat (`death.loseAllRunLoot` / `autoRetreatKeepsRunLoot` · TL N-14) · "เลเวลตรงโซนไม่ใช้ยา ≈ 45 นาทีถึง auto-retreat" (D-020) ผ่านหลัง D-038 B · ไม่มีค่าเกิน ±20% ของ GDD โดยไม่มีการอนุมัติ
  - [ ] (TL B-05) `tools/sim` import สูตร/PRNG จาก `@keep-walking/shared/formulas` และลบสำเนา (Monte Carlo/report คงใน tools) · `gen-vectors --check` เขียว

#### P2-F05-T02 — Port formulas + config accessor (backend-programmer, 3 วัน)
- Acceptance:
  - [ ] (TL B-05) port `formulas.ts` + `rng.ts` (PRNG `mulberry32`, `uniform`) + ส่วน pure ของ `drops.ts` (`dropRates`, `rangedTerm`, `stochasticRound`, `dropParamsFromConfig`) และ `survival.ts` (`hitsToThreshold`, ส่วน pure ของ `simulateRun`) เข้า `src/formulas/` โดยไม่ fork · อ่านอย่างเดียวจาก `tools/sim`
  - [ ] test ค้นทุกไฟล์ vector ใน `design/systems/test-vectors/` แบบ dynamic จึงจับ vector ใหม่ของ systems ได้เอง (TL N-03) · ทุก vector ของสูตรผ่าน
  - [ ] (TL B-06) `src/config/` เป็น typed accessor ตรวจ type/ช่วงด้วยโค้ดธรรมดา ไม่ใช้ Ajv, `null` = fail ชัด, ข้าม key `_`, namespace `balance.privacy` / `app.privacy`, `location.json`, `privacy.json` · ตรวจ `raid.schedule.endLocalTime = start + durationTicks × raidTick_s` (H03)
  - [ ] pure ไม่มี DOM ผ่าน lint ของ ADR 0003 · ไม่เขียนโค้ด Worker/DO

#### P2-F05-T03 — Art F-AD + brief asset (art-director, 2 วัน)
- Acceptance:
  - [ ] F-AD-1..4: map-style 6.2/6.3/10.1 ตาม D-060, style guide แถว 4, 8.2, 3.5, 7, 6.2, S7
  - [ ] brief: รายการ asset ของ Phase 2 (id, ขนาด, layer, สถานะ) · ไอคอน class 4, กรอบ rarity 5, สถานะ dungeon 4 (รวมปิดทำการ), ยา, ไอเทม drop, ตัวนำทาง (ลูกศรทิศ ไม่ใช่เส้นทาง · A-3), speed lock, รอ check-in · ข้อกำหนดกลางแดดและตาบอดสี

#### P2-F05-T04 — อวตาร V-18/V-19 (artist-2d, 1–2 วัน)
- Acceptance:
  - [ ] clipPath แถบแสงเงาในทุกไฟล์อวตาร ไม่ล้นขอบ (V-18) · composite มุมข้าง/หลัง + panel กลางคืนบน bg.night (V-19)
  - [ ] `ref.style-tile.v1` status approved · manifest ผ่าน schema

#### P2-F05-T05 — VFX ฐาน + effect F05 (vfx-animator, 2–3 วัน)
- Acceptance:
  - [ ] module CSS/WAAPI ตาม motion-direction §10 (API เล็ก เช่น `play(effectId, target)`), ไม่มี motion วน, reduced-motion fallback
  - [ ] effect ได้ tick และได้ของ 5 rarity · Rare ใช้ความหนาขอบ/scale ไม่ใช้ filter/opacity (V-21) · spec ต่อ effect ใน `art/vfx/specs/`
  - [ ] `art/vfx/demo/*.html` เปิดดูได้โดยไม่ต้องใช้เกม · อยู่ในงบ motion

#### P2-F05-T06 — Audio build (sound-designer, 2–3 วัน)
- Acceptance:
  - [ ] generator ใน `audio/src/` render ไฟล์ deterministic ลง `audio/out/` โดยไม่มี network · `audio/manifest.json` (cue id → ไฟล์, loudness) · `audio/demo.html` · ใช้ได้กับ hook ของ root build ใน P2-F06-T07 (TL B-14)
  - [ ] cue ของ loop ครบตามแถว Phase 2 ใน cue-list (รวม speed lock) · ไม่มี BGM (D-052) · มี vibration pattern + silent fallback ต่อ cue
  - [ ] F-13: `raid.thirtyMinWarning` โทน "ชวนเดินต่อ" และ priority ต่ำกว่า `run.hpLow`

#### P2-F05-T07 — ชุดไอคอน Phase 2 (artist-2d, 2–3 วัน)
- Acceptance:
  - [ ] SVG ครบตาม brief (P2-F05-T03) และไอเทมที่ drop ใน config รวมยา (P2-F05-T01) · ตาม icon grammar
  - [ ] manifest: id, path, ขนาด, status (`placeholder`/`final`) · id ตรงกับ `assets.icon` ใน config · ไม่แก้ `manifest.build.json`
  - [ ] ผ่าน contrast/ตาบอดสีตามเกณฑ์ style guide

#### P2-F05-T08 — Reward engine + session (backend-programmer, 3 วัน)
- Acceptance:
  - [ ] (TL B-07) `src/session/` = reducer เดียว `sessionStep(state, input, now_ms, config, rng) → { state, events }` ประกอบ run → gate → tick → drop ตามลำดับใน tech note · client ใช้ได้เพียง entry นี้
  - [ ] (TL B-02) gate ต่อ `rewardWindow` ไม่ทับกันจาก `packages/geo` · tick ทุก `rewardTickInterval_s` เฉพาะ Active และผ่าน gate · Grace/Suspended/speed lock ไม่ได้ tick · (GD B-04) ระยะคร่อมช่องว่างไม่นับ · ระยะเท่าเกณฑ์พอดีไม่ผ่าน
  - [ ] drop roll + exp จาก config ผ่าน `src/formulas` · RNG ตามสัญญา ADR 0003 · สรุป run (tick ได้/ไม่ได้, ของตาม rarity, exp) · ตาย = ของใน run หายตามนิยาม spec, auto-retreat = เก็บครบ
  - [ ] ผ่าน vector ของ P2-F05-T20 (rewardWindow, gate, D-059) และ P2-F05-T01 (drop, exp, seed) · trace table-still = 0 tick, bench-jitter ≥ 1 tick
  - [ ] pure ไม่มี DOM ผ่าน lint · ไม่มีตัวเลขเกมฝัง · ไม่เขียนโค้ด Worker/DO

#### P2-F05-T09 — Copy F05 + F06 (narrative-designer, 2–3 วัน)
- Acceptance:
  - [ ] ทุก key ที่ flow F05/F06 อ้างมีข้อความ · สามจังหวะ HP ต่ำ / auto-retreat / ตาย ตามน้ำเสียง GDD (ไม่เสียใจ ไม่ปลอบ ไม่อธิบาย)
  - [ ] onboarding: "กรุงเทพฯ กำลังมีปัญหา", รอยแยกใกล้ + ระยะ + ระดับ, บทเรียนเดียว "เดินต่อไปเพื่อรับรางวัล", ปิดด้วย "เดินต่อเพื่อรับเพิ่ม" · รางวัลก้อนแรกเด่นที่ถ้อยคำ ไม่สัญญาปริมาณพิเศษ (GD B-07) · ไม่มีคำที่สอนสิ่งต้องห้ามใน 10 นาทีแรก
  - [ ] จอไกล/นอกพื้นที่/นอกย่านเปิดตัว ("ช่วยกันปลุกย่านเรา" ตาม D-073), pocket screen, Wake Lock ใช้ไม่ได้, consent/age gate (legal ใช้ของเดิม), ปุ่มและ confirm "ลบข้อมูลในเครื่อง" (C2-6) · `lint:copy` 0 FAIL

#### P2-F05-T10 — Client F05 (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] เรียก `sessionStep` เท่านั้น (TL B-07) · feedback ตอนได้ tick และได้ของ: ไอคอนตาม manifest + effect จาก `art/vfx` + เสียงจาก `audio/manifest.json` (สั่นและ priority queue อยู่ใน P2-F06-T14) · tick ที่ไม่ผ่าน gate แสดงตาม flow ที่อนุมัติ (P2-F06-T30)
  - [ ] สรุปรางวัลหลังจบ run ทุกกรณี (ออกเอง, Ended, auto-retreat, ตาย)
  - [ ] โหลด asset ตาม `docs/tech/asset-delivery.md` · (TL B-14) `pnpm build` จาก checkout สะอาดมีไฟล์ทุก cue ที่ client ใช้ · ยิง event ของ F04/F05 ที่เหลือตาม P2-F04-T17
  - [ ] e2e เล่นทั้ง run ผ่าน Mock ×60 ได้ tick ตาม vector · lint/typecheck/test/e2e เขียว

#### P2-F05-T11 — Black-box F05 (qa-tester, 2 วัน)
- Acceptance:
  - [ ] trace วางนิ่ง = 0 tick, ม้านั่ง jitter ≥ 1 tick, เดินปกติได้ tick ทุกหน้าต่าง, ระยะเท่าเกณฑ์พอดีไม่ผ่าน, ช่องว่าง 5 นาทีห่าง 400 ม. ไม่ได้ระยะนั้น (GD B-04), speed lock ไม่มี tick
  - [ ] ผลของ engine ตรง golden vectors (drop, exp, gate, seed) และสรุป run ตรงกับจำนวน tick · storage หลังจบ run ไม่มีพิกัด
  - [ ] บั๊กลง `qa/bugs.md`

#### P2-F05-T12 — Speed lock แบบกรอง: ค่า (systems-designer, 1–2 วัน)
- Inputs: `data/gps-traces/recorded/` (ถ้ามี จาก P2-C04), synthetic soi-occluded + driving-40kmh, `docs/tech/F02-spike-results.md`
- Acceptance:
  - [ ] นิยามความเร็วแบบกรอง/ต่อเนื่อง (หน้าต่าง, วิธีกรอง) และเกณฑ์ 25 km/h + กฎปลดล็อกเมื่อหยุดไฟแดง เป็น key ใน `anticheat.json` พร้อม `_source`
  - [ ] vector: เดินในซอยมี jitter (เดิม 23.2–24.3 km/h ดิบ) ไม่ติด lock · ขับ 40 km/h ติด lock · หยุดไฟแดงแล้วขับต่อไม่ปลดผิด

#### P2-F05-T13 — Speed filter ใน geo (location-engineer, 1–2 วัน)
- Acceptance:
  - [ ] ความเร็วแบบกรองตาม P2-F05-T12 แทนภายในฟังก์ชันความเร็วของ lock โดยคง signature (run engine ไม่ต้องแก้) · ช่วงที่ lock ไม่นับเข้าระยะสะสมของ gate ตาม spec
  - [ ] ผ่าน vector ของ P2-F05-T12 · trace เดินจริงทุกไฟล์ไม่โดน lock · geo ยังเป็น leaf

#### P2-F05-T14 — Build profile playtest (devops-engineer, 1 วัน)
- Acceptance:
  - [ ] input ของ workflow_dispatch เลือก profile `playtest` และส่ง env ที่ P2-F04-T25 อ่าน (`VITE_KW_PROFILE`, `VITE_KW_COMMIT` หรือตาม tech note) ผ่าน workflow เท่านั้น · ไม่มี secret ใหม่
  - [ ] runbook `preview-setup.md` มีขั้นตอน deploy playtest สำหรับ P2-F06-T26 · ไม่ใช้บริการคิดเงิน

#### P2-F05-T15 — Tech gate F04 + F05 (tech-lead, 1–2 วัน)
- ตรวจ (verdict ย่อย F04 / F05): conform ADR 0003, C1-2..C1-4, C2-1..C2-5, client เรียก `session` เท่านั้น (lint), geo เป็น leaf, logic ไม่ fork ใน client, config-not-hardcode (รวมชื่อสถานที่), schema + config lint (P2-F04-T24), validator dungeon (P2-F04-T26), clock/RNG ฉีดได้, ผ่าน vectors, ไม่มีพิกัดใน log/telemetry/storage หลังจบ run · verdict PASS / NEEDS_CHANGES

#### P2-F05-T16 — QA gate F04 + F05 (qa-tester, 1–2 วัน)
- ตรวจ (verdict ย่อย F04 / F05): E1–E5 และ E16 ส่วน F04/F05 พร้อมหลักฐาน, ทุก acceptance ของ spec F04/F05, Mock ใช้ได้เต็ม (E11 ส่วน F04/F05), storage หลังจบ run ไม่มีพิกัด (GD B-08) · รายงาน `qa/reports/F04-F05-qa-gate.md` · verdict

#### P2-F05-T17 — Copy gate F04 + F05 (narrative-designer, 1 วัน)
- ตรวจ (verdict ย่อย F04 / F05): ข้อความบนจอจริง (screenshot e2e) ตรง key รวมจอ check-in/speed lock/นำทาง, เพดาน cell ไม่ล้น, กฎ 6 ข้อ, ไม่มีข้อความไทยฝังในโค้ด · verdict

#### P2-F05-T18 — Design gate F04 + F05 (game-director, 1 วัน)
- ตรวจ (verdict ย่อย F04 / F05 · NEEDS_CHANGES ครั้งที่สอง escalate ถึงคนทั้งสอง feature): pillars และ non-negotiables, **gate เดียวไม่มีข้อยกเว้นครอบทุกทางที่ให้ของ รวม D-059 และรางวัลก้อนแรกของ onboarding (P2-F06-T10)**, speed lock ล็อกการเล่นจริง, ไม่แสดงตำแหน่งหรือจำนวนคน, config, ประสบการณ์เข้า dungeon และได้ tick เข้าใจได้โดยไม่ต้องอ่าน · verdict

#### P2-F05-T19 — Tech review ตัวกรองความเร็ว (tech-lead, 1 วัน · ใหม่ rev 2 · TL B-11)
- ตรวจ: P2-F05-T12/T13 ตรง ADR 0003 (geo leaf, pure, signature เดิม), ผ่าน vector, trace เดินจริงไม่โดน lock, ขับรถติด lock · verdict PASS / NEEDS_CHANGES · ไม่กั้น P2-F06-T20 และ playtest

#### P2-F05-T20 — Config + vector ของ gate / run state / check-in (systems-designer, 2–3 วัน · ใหม่ rev 2 · GD B-04/B-05, TL B-02/B-03/B-08, N-15 ทาง ก)
- Acceptance:
  - [ ] key ใหม่พร้อม `_source`/`_assumption` ตามชื่อที่ spec F04/F05 เสนอ: `movementGate.sampleCadence_s`, ตัวกรอง outlier (เช่น `movementGate.maxPlausibleSpeed_kmh`), `movementGate.maxSamplePairGap_s`, `movementGate.maxSampleAccuracy_m`, hysteresis ขอบ polygon ใน `runState` (ระยะและ/หรือจำนวน sample), `openingHours.utcOffset_min` (กรุงเทพฯ ไม่มี DST) · ตรวจ `anticheat.checkIn.*` ที่มีอยู่
  - [ ] vector `rewardWindow`: ไม่ทับกัน, เริ่มเมื่อ confirm, หยุดนับระหว่าง Grace/Suspended, กฎคู่ sample คร่อมขอบหน้าต่างตาม ADR, `greaterThan` (ระยะเท่าเกณฑ์ไม่ผ่าน)
  - [ ] vector gate: table-still = 0 หน้าต่างผ่าน, bench-jitter ≥ 1, drift-spike ไม่ได้ tick จาก spike, edge-walk ไม่นับ spike ข้ามขอบ, ช่องว่าง 5 นาทีห่าง 400 ม. ไม่นับ (GD B-04) · ผลไม่ขึ้นกับความถี่ sample 1 Hz เทียบ 0.2 Hz
  - [ ] vector run state + check-in: Grace 179/180/181 วิ, Suspended 899/900/901 วิ, ต้องเข้าใกล้ต่อเนื่อง ≥ `minContinuousApproach_s`, teleport เข้า polygon ถูกปฏิเสธ, accuracy 35 ม. ถูกปฏิเสธ · D-059 (elapsed 59/60 วิ)
  - [ ] `gen-vectors --check` เขียว · vector ใหม่ค้นเจอโดย test แบบ dynamic ของ P2-F05-T02

### F06 — HP, Damage และ 10 นาทีแรก

Lead: gameplay-programmer · ร่วม: systems-designer, backend-programmer (engine), uiux-designer, narrative-designer, artist-2d, vfx-animator, sound-designer, product-manager · Gate: P2-F06-T30 (flow), P2-F06-T20..T25 · งานคน: P2-F06-T26, T27, T29

#### P2-F06-T01 — Balance carry-over ก่อน F06 (systems-designer, 1–2 วัน · W1)
- Acceptance:
  - [ ] `progression.json` `vitPotionEfficiency_pct` = 1 (D-038 B) · vectors สร้างใหม่ · sim-report แสดงอัตราส่วนรายได้/ยาหลังแก้ (คนเล่นคนเดียวเฉลี่ย L25 ≈ 2.69 ตาม D-038)
  - [ ] `unlocks.json` `farDungeonThreshold_m` = 1,900 (B-01, D-079 ≤ 1,970, D-072) พร้อม `_source`
  - [ ] R-B1 ใน balance-model 3.1 + vector ขอบ (B-03) · partyMult cap ของ raid 1.6 / 1.2 ใน `raid.json` (B-04)
  - [ ] `gen-vectors --check` และ test ทั้งหมดผ่าน

#### P2-F06-T02 — Feature spec F06 + pillars 7.1 (game-director, 3 วัน)
- Acceptance:
  - [ ] การตีทุก 45–75 วิตามสูตร GDD (ระดับโซน, ×1.25 ต่อระดับที่ห่าง), auto-retreat 25% เปิดตั้งต้นและปิดได้เฉพาะหน้าตั้งค่า, ยาอัตโนมัติ, แจ้ง 30% (สั่น · push เลื่อน Phase 8), ตาย (ของใน run หาย), ฟื้น 0→50% ใน 30 นาที, ยาฟื้นทันที, ออกได้ทุกเมื่อ · Support ชุบเพื่อนเลื่อน Phase 3
  - [ ] (GD B-06) แหล่งที่มาของยาใน Phase 2 = drop ของ tick ที่ผ่าน gate เท่านั้น ไม่มีชุดยาตั้งต้นหรือของขวัญแรกเข้า · ร้าน NPC เลื่อน Phase 4
  - [ ] (GD B-07) รางวัลก้อนแรกของ onboarding = reward tick ปกติที่ผ่าน `movementGate` เดียวกัน ไม่มี code path แยก · ความเด่นทำที่การแสดงผลเท่านั้น
  - [ ] เลือก class 4 แบบในนาที 0–1 · onboarding ตามตาราง GDD + รายการห้ามสอน · (GD N-03) การขึ้นเลเวล: แต้ม stat สะสมเงียบหรือกระจายอัตโนมัติ และปลดหน้าลงแต้มตาม `unlocks.json` · แถบ HP ในนาที 3–10 ไม่มีคำอธิบาย · ลำดับ age gate + consent ตำแหน่ง (แยกจาก consent อื่น) สั้นที่สุด · onboarding เลือก dungeon ที่ **เปิดอยู่** ใกล้สุด (A-3 ข้อ 4)
  - [ ] จอไกล/นอกพื้นที่ (D-064)/นอกย่านเปิดตัว (D-073) มีสิ่งให้ทำที่บ้าน · (GD N-04) Phase 2 ซ่อนจำนวนคนในนั้น (นาที 3–6) และจำนวนลงทะเบียนต่อจังหวัด (S-07) ไม่แสดง 0 หรือเลขปลอม
  - [ ] pillars 7.1 ตาม D-072/B-01 · ประเมินผลของ D-083 ต่อ pillars, preset, หน้าที่บ้าน (SF-13) · อ้าง D-020 และบันทึกว่า solo non-Tanker ถึง auto-retreat ~27.8 นาที (ใช้ใน kit/แบบสอบถาม) · ดัชนี spec ใน pillars อัปเดตสถานะ F04–F06

#### P2-F06-T03 — Flow F05 + F06 (uiux-designer, 3 วัน)
- Acceptance:
  - [ ] ทุกสถานะของ feedback tick/ของ, สรุป run, HP/แจ้งเตือน/auto-retreat/ตาย/ฟื้น, ตั้งค่า auto-retreat, เลือก class (sheet บนแผนที่), onboarding 0–10 นาทีตาม GDD (รางวัลก้อนแรกเด่นที่ภาพ/ถ้อยคำเท่านั้น), pocket screen + บทเรียนเดียวของ run แรก (N-3), Wake Lock ใช้ไม่ได้ (ทาง B)
  - [ ] จอไกล/นอกพื้นที่/นอกย่านเปิดตัว: อวตารบนแผ่น bg.surface, role 4 แบบ, ลงทะเบียนความสนใจรายเขต (ไม่เก็บพิกัด ไม่มีข้อความอิสระ), ระยะเส้นตรงแบบประมาณ, **ไม่มีจำนวนคนหรือจำนวนลงทะเบียน** (GD N-04)
  - [ ] consent ตำแหน่งแยก + age gate 15+ (scaffold) + หน้า Credits/ลิขสิทธิ์ + ปุ่ม "ลบข้อมูลในเครื่อง" พร้อม confirm ในหน้าตั้งค่า (C2-6) · wireframe ใช้ copy key

#### P2-F06-T04 — Tech note F06 (tech-lead, 2 วัน)
- Acceptance:
  - [ ] API ของ HP engine ที่ประกอบใน `sessionStep`: schedule การตีจาก stream `hit` ของ RNG + clock ร่วม, สูตร damage จาก `src/formulas`, ลำดับกับ tick, auto-retreat → จบ run, ยาอัตโนมัติจาก inventory ในเครื่องที่มาจาก drop (GD B-06), ตาย/ฟื้น (ฟื้นต่อหลังจบ run ตามเวลาของ clock)
  - [ ] state ของ class, inventory และ onboarding (ขั้นที่ผ่าน, ระบบที่ล็อก) เก็บใน `kw.p2.*` · จอไกล/นอกพื้นที่ใช้ `packages/geo` + mask
  - [ ] failure modes (แอปถูกปิดระหว่าง HP ต่ำ, นาฬิกาเปลี่ยน) + test hooks + vector ที่ต้องผ่าน (survival 45 นาที)

#### P2-F06-T05 — VFX F06 (vfx-animator, 2 วัน)
- Acceptance:
  - [ ] effect HP ต่ำ, auto-retreat, ตาย, ฟื้น, เข้า dungeon/Grace, รางวัลก้อนแรก ตามจังหวะใน motion-direction · ไม่มี motion วน (D-076/D-077) · reduced-motion
  - [ ] ใช้ pose kit ของ avatar-spec §10 · demo + spec ต่อ effect · HP bar ใช้ scaleX

#### P2-F06-T06 — HP engine (backend-programmer, 3 วัน)
- Acceptance:
  - [ ] การตีสุ่มในช่วงจาก config, damage = สูตร GDD ผ่าน `src/formulas` (DEF, tankerBuff = 0 ใน Phase 2, ห่างเลเวล ×1.25), hit chance จาก config · RNG stream `hit` ตามสัญญา ADR 0003
  - [ ] auto-retreat ที่ `autoRetreatThreshold_pct` เมื่อเปิด · ยาอัตโนมัติเมื่อมียาใน inventory (มาจาก drop เท่านั้น) และ HP ต่ำกว่าเกณฑ์ · event แจ้ง 30% · ตาย = ของใน run หาย · ฟื้น 0→50% ใน 30 นาที · ยาฟื้นทันที
  - [ ] ต่อ hp เข้า `src/session/` โดยไม่เปลี่ยนสัญญาของ run/reward (TL B-07) · speed lock และ Grace/Suspended ไม่มีการตีตาม spec
  - [ ] ผ่าน vector damage/survival: เลเวลตรงโซนไม่ใช้ยา ≈ 44.4 นาทีถึง auto-retreat (D-020) หลัง D-038 B · pure, ไม่มีตัวเลขฝัง, ไม่เขียนโค้ด Worker/DO

#### P2-F06-T07 — Asset ถึง client + font + เสียงใน build (tech-lead, 2–3 วัน)
- Acceptance:
  - [ ] `tools/art`: rasterize SVG, สลับสี key, quantize 1x/2x, sha256 · (TL N-07) เขียนผลลง `art/assets/manifest.build.json` ไม่แก้ `manifest.json` ของ artist · validator V1–V13 + `manifest.schema.json` ตรวจทั้งสองไฟล์ใน `pnpm test`
  - [ ] vendor font (IBM Plex Sans Thai Looped WOFF2 ไม่แก้ไข, Noto Sans Thai) + OFL.txt + sha256 ใน `art/fonts/` ตาม D-057
  - [ ] (TL B-14) root `pnpm build` รัน generator ของ `audio/src/` ก่อน build client (deterministic, ไม่มี network) · client โหลดตาม id ใน `audio/manifest.json` · test ยืนยันว่าทุก cue id ใน manifest มีไฟล์หลัง build (manifest ว่าง = ผ่าน) · แตะเฉพาะ script `build` ของ root `package.json`
  - [ ] `docs/tech/asset-delivery.md`: client โหลด art + เสียงตาม manifest id อย่างไร (path, cache, fallback)

#### P2-F06-T08 — Client F06 (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] แถบ HP + แจ้ง 30% (ภาพ + เสียง) · auto-retreat เปิดตั้งต้น ปิดได้เฉพาะหน้าตั้งค่า (มี confirm) · ยาอัตโนมัติจาก inventory ที่มาจาก drop · จอตาย/ฟื้น + ใช้ยาฟื้นทันที · สามจังหวะใช้ copy key ตาม flow ที่อนุมัติ (P2-F06-T30)
  - [ ] เรียก `sessionStep` เท่านั้น (ตาย = สรุปว่าของหาย) · telemetry ตาม P2-F04-T17
  - [ ] หน้าตั้งค่า S-22 ตาม P2-F04-T06 (N-1) + token/component V-15, V-16, V-20, V-22, ramp
  - [ ] e2e ผ่าน Mock: run ยาวถึง auto-retreat, ปิด auto แล้วตาย, ฟื้น · lint/typecheck/test/e2e เขียว

#### P2-F06-T09 — Client จอไกล / นอกพื้นที่ + consent (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] สถานะ "ไกล" เมื่อ dungeon ใกล้สุด > `farDungeonThreshold_m` · "นอกพื้นที่" เมื่ออยู่นอก mask · "นอกย่านเปิดตัว" ตาม D-073 · อวตาร (asset ตาม manifest), role 4 แบบ, ลงทะเบียนความสนใจรายเขต (เก็บในเครื่อง ไม่มีพิกัด ไม่มีข้อความอิสระ) · ไม่แสดงจำนวนลงทะเบียน (GD N-04)
  - [ ] (PM-M2) ยิง `onboarding_empty_screen_shown` / `onboarding_empty_screen_abandoned` พร้อม `reason` (far / out_of_area / outside_launch_district) และ `interest_registered_outside_area` ตาม P2-F04-T17 · ไม่มีพิกัด
  - [ ] consent ตำแหน่งแยกก่อนเรียก GPS ครั้งแรก + ถอน consent ได้ · age gate 15+ (scaffold, ต่ำกว่า = ไม่เข้าเกม) · หน้า Credits (font OFL, OSM ตาม Q-H1, WorldPop ถ้าใช้) · (C2-6) ปุ่ม "ลบข้อมูลในเครื่อง" ล้าง `kw.p2.*` + telemetry ผ่านฟังก์ชันของ P2-F04-T25
  - [ ] font จาก `art/fonts/` · lint/typecheck/test/e2e เขียว

#### P2-F06-T10 — Client onboarding 0–10 (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] ลำดับตาม GDD: แผนที่ + ข้อความเปิด → เลือก class (sheet) → รอยแยกใกล้ที่ **เปิดอยู่** + ระยะเส้นตรง + ระดับ + นำทาง → confirm + บทเรียนเดียว (N-3 ตาม P2-F04-T06) → รางวัลก้อนแรก → "เดินต่อเพื่อรับเพิ่ม" · นาที 6–8 (party) ซ่อนใน Phase 2
  - [ ] (GD B-07) รางวัลก้อนแรก = tick ปกติจาก `sessionStep` ไม่มี code path แยก ไม่ลด gate ไม่เร่ง tick · ความเด่นทำที่ effect/copy เท่านั้น
  - [ ] ระบบที่ห้ามสอน (ตลาด, ตีบวก, raid, ลงแต้ม stat, เปลี่ยน class, party ละเอียด, anti-cheat, lore ยาว) ไม่ปรากฏใน 10 นาทีแรก · ปลดตาม `unlocks.json`
  - [ ] telemetry onboarding step · e2e เล่น onboarding ครบผ่าน Mock ×60

#### P2-F06-T11 — Test plan F06 + TC-HUD (qa-tester, 1–2 วัน)
- Acceptance:
  - [ ] traceability ทุก acceptance ของ spec F06 และ E6–E8, E16 · case "ไม่สอนสิ่งต้องห้าม" แบบ checklist ต่อจอ · case ยาจาก drop เท่านั้น, รางวัลก้อนแรกเป็น tick ปกติ, event empty screen (PM-M2)
  - [ ] TC-HUD-03..12 เป็น test อัตโนมัติ

#### P2-F06-T12 — Support matrix F-17 (tech-lead, 1 วัน)
- Inputs: ผล P2-F04-T11 และ P2-C02 ใน `qa/playtest/results/`, `docs/tech/F02-spike-results.md` ถ้ามี, design gate A 4.4
- Acceptance:
  - [ ] ตาราง Android Chrome × iOS Safari: Wake Lock ขอได้/ถูกปล่อยเมื่อใด, GPS ขณะล็อกจอเองและ page hidden, แบตต่อชั่วโมงขณะจอพกกระเป๋า, vibrate, web push (อ้างอิงเท่านั้น)
  - [ ] ข้อสรุปว่าทาง A (D-063) ใช้ได้บนเครื่องไหน · fallback ต่อเครื่อง · ถ้าทาง A ใช้ไม่ได้บนเครื่องใด handoff ถึง game-director (blocking: yes) · ถ้าพฤติกรรมจริงต่างจาก feature detection ใน P2-F06-T14 handoff เป็น fix ถึง gameplay

#### P2-F06-T13 — Cue fallback (sound-designer, 1 วัน)
- Acceptance:
  - [ ] cue-list: fallback เมื่อไม่มี vibrate (เสียง/ภาพนำก่อน · iOS ไม่มี `navigator.vibrate` รู้จาก Phase 1) · priority queue ของ cue F05/F06 (cue ความปลอดภัยชนะเสมอ)
  - [ ] ไฟล์ audio ที่เพิ่ม/แก้ render ซ้ำได้ + manifest อัปเดต

#### P2-F06-T14 — Client pocket screen + fire-together (gameplay-programmer, 3 วัน)
- Acceptance:
  - [ ] pocket screen ตามกฎ 8 ข้อของ design gate A 4.4 + Screen Wake Lock ผ่าน feature detection (`'wakeLock' in navigator`) · ขอใหม่เมื่อถูกปล่อย · fallback ทาง B เมื่อไม่รองรับ
  - [ ] fire-together 4 ชั้น (ภาพ/สั่น/เสียง/push = ไม่มีใน Phase 2) + priority queue ตาม cue-list · ไม่มี `vibrate` = ใช้ fallback
  - [ ] telemetry Wake Lock ได้/ไม่ได้/ถูกปล่อย + เวลา page hidden ต่อ run ตาม P2-F04-T17 (ไม่มีพิกัด)
  - [ ] e2e ครอบทั้งสอง emulation ด้วย API ที่ mock ได้ · ยืนยันบนเครื่องจริงใน P2-F06-T26 และเทียบ matrix ของ P2-F06-T12

#### P2-F06-T16 — CI bundle + bbox (devops-engineer, 1 วัน)
- Acceptance:
  - [ ] CI ล้มเมื่อ bundle เกิน `bundle.initialJsBudget_bytes` ด้วย script ของ P2-F04-T10 · CI รัน bbox-vs-province ด้วย polygon จาก P2-F04-T23 (ไม่ข้ามอีก)
  - [ ] ทุก job เขียวในเครื่องด้วย script เดียวกับ workflow · ไม่ใช้บริการคิดเงิน

#### P2-F06-T17 — Black-box F06 (qa-tester, 2 วัน)
- Acceptance:
  - [ ] เลเวลตรงโซนไม่ใช้ยาอยู่ได้ตาม simulator (≈ 44.4 นาทีถึง auto-retreat, tolerance ตาม vector) ผ่าน Mock เร่ง
  - [ ] auto-retreat ที่ 25% และเก็บของครบ · ปิด auto แล้วตาย = ของหาย · ฟื้นตามเวลา · แจ้ง 30% · ยามาจาก drop เท่านั้น (ไม่มียาตั้งต้น)
  - [ ] onboarding ไม่แสดงระบบต้องห้าม · รางวัลก้อนแรกมาจาก tick ปกติ (ไม่มีรางวัลเมื่อไม่ผ่าน gate) · จอไกล/นอกพื้นที่/นอกย่านเปิดตัวถูกกรณี + event empty screen และ interest ตาม PM-M2 · ไม่มีจำนวนคน
  - [ ] ปุ่มลบข้อมูลในเครื่องล้างครบ · บั๊กลง `qa/bugs.md`

#### P2-F06-T18 — ชุด playtest Phase 2 (qa-tester, 1–2 วัน)
- Acceptance:
  - [ ] script: นัดจุดเริ่มนอก dungeon นำร่องที่ระยะ 400–800 ม., เดินไปหา, เล่น 30–45 นาที, ลองเก็บมือถือในกระเป๋า · เครื่องละคน · ไม่ใช้ Mock · ช่วงเวลาตามคำตอบ Q-H3 (ค่าตั้งต้น: เช้า ~07:00–09:30 หรือเย็น ~16:30–18:30) + แผนสำรองเมื่อฝนตก · ผู้ร่วมตามคำตอบ Q-H2 (ค่าตั้งต้น: 18+)
  - [ ] safety briefing สำหรับผู้ร่วมที่ไม่ใช่ทีม (ข้ามถนน, แดด, ไม่จ้องจอ, **เกมล็อกเมื่อนั่งรถ** · GD B-02) · แจ้งผู้ร่วมว่าผลในเกมไม่ใช่รางวัลจริงและข้อมูลตำแหน่งไม่ออกจากเครื่อง (C1-5)
  - [ ] **แบบฟอร์มยินยอมของผู้ปกครอง (D-092)** `qa/playtest/phase-2-parental-consent.md`: สำหรับผู้ร่วมอายุ 15–17 · อธิบายกิจกรรม ความเสี่ยง ข้อมูลที่เก็บ (ไม่มีพิกัดออกจากเครื่อง) การถอนตัว · ช่องลายเซ็นผู้ปกครอง · กฎ: ไม่รับอายุต่ำกว่า 15, ผู้ร่วม 15–17 เดินกับทีมหรือผู้ใหญ่ตลอด, ฟอร์มที่เซ็นแล้วเก็บนอก git · script ใช้ช่วงเช้า/เย็น (D-093)
  - [ ] แบบฟอร์มผู้สังเกตใช้รหัส P1..Pn ไม่มีชื่อหรือพิกัด · ช่องเวลาถึง auto-retreat ต่อ class (solo non-Tanker ~27.8 นาที · GD N-03 ข้อ 6) · ช่องจุดที่เดินเข้าไม่ถึงจริง (ชื่อ dungeon + ด้าน · GD N-06) · export summary ใช้เวลา relative (C2-4)

#### P2-F06-T19 — แบบสอบถาม playtest (product-manager, 1–2 วัน)
- Acceptance:
  - [ ] คำถามวัด "สนุกไหมที่ต้องเดินไปหา", ความเข้าใจ gate/tick, ความรู้สึกต่อ HP/auto-retreat, 10 นาทีแรก, จอพกกระเป๋า, การนำทางแบบทิศ + ระยะเส้นตรง · สเกลเดียวกันทุกข้อ + คำถามปลายเปิด 2–3 ข้อ
  - [ ] แผนวิเคราะห์ + เกณฑ์ตัดสิน "ไปต่อ / แก้ก่อน" ตั้งก่อนเห็นผล · (PM-S3) proxy ของ north star ฝั่ง client และวิธีคำนวณจาก event ของ movement gate จริง · ไม่เก็บข้อมูลระบุตัวคน
  - [ ] (GD N-08) handoff ร่างคำถามเรื่อง gate/tick และ auto-retreat ให้ game-director อ่านก่อนล็อกเกณฑ์ (blocking: no)

#### P2-F06-T20 — Tech gate F06 (tech-lead, 1–2 วัน)
- ตรวจ: HP engine + session ตาม ADR 0003 และ tech note, client เรียก `session` เท่านั้น, pocket screen (feature detection + fallback), bundle (P2-F04-T10 + CI ของ P2-F06-T16), asset + เสียงใน build (P2-F06-T07), C1-1 (บันทึกว่าข้อยกเว้นหมดอายุ Phase 3), config-not-hardcode, test ผ่าน · ไม่รวม speed filter (อยู่ใน P2-F05-T19) · verdict

#### P2-F06-T21 — QA gate F06 (qa-tester, 1–2 วัน)
- ตรวจ: E6, E8 (ฝั่ง QA), E11 ทั้ง loop, E16 ส่วน F06, ทุก acceptance ของ spec F06, event empty screen (PM-M2), storage หลังจบ run ไม่มีพิกัด (GD B-08) · regression F04/F05 · verdict

#### P2-F06-T22 — Copy gate F06 (narrative-designer, 1 วัน)
- ตรวจ: สามจังหวะ HP ต่ำ / auto-retreat / ตาย บนจอจริง (E7), onboarding, จอไกล/นอกพื้นที่, pocket screen, ลบข้อมูลในเครื่อง · verdict

#### P2-F06-T23 — Visual gate F04–F06 (art-director, 1–2 วัน)
- ตรวจ: ไอคอน, อวตาร (V-18/V-19), effect, จอทั้ง loop ตาม style guide และ token (รวม V-15/V-20/V-22 ที่ client นำไปใช้), ตัวนำทางไม่ใช่เส้นทาง · ภาพกลางแดดจาก P2-C02 ถ้ามี · verdict

#### P2-F06-T24 — Design gate F06 (game-director, 1–2 วัน)
- ตรวจ: "ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก" (E8), low penalty high travel cost, auto-retreat default, **movement gate กับ auto-retreat อยู่ด้วยกันเสมอ** (GDD "ผลข้างเคียงที่ตั้งใจ"), ยาจาก drop เท่านั้น, ไม่มีจำนวนคน, **regression ของ F04/F05** (GD หัวข้อ 2 ข้อ 3), ภาพรวม loop ก่อน playtest · verdict

#### P2-F06-T25 — Product gate F04–F06 (product-manager, 1 วัน)
- ตรวจ (PM-S2 · checklist เต็มของ product gate): (1) ปัญหาของผู้เล่นใน PRD F04–F06 ถูกแก้จริงตามที่ build (2) ไม่มี dark pattern ไม่มี IAP (3) onboarding ยังสะอาด (4) event ครบตาม P2-F04-T17 รวม empty screen และ export ได้สำหรับ playtest โดยไม่มีพิกัด · ยืนยันหลักฐาน E8 จาก design gate (P2-F06-T24) + QA gate (P2-F06-T21) ก่อนให้ verdict PASS / NEEDS_CHANGES

#### P2-F06-T26 — HUMAN: deploy build playtest + smoke
- ปลดล็อก: P2-F06-T27 · เริ่มเมื่อ QA gate F04+F05 และ F06 PASS, P2-C05 = Go, P2-F06-T12 DONE และ orchestrator แจ้งว่า push แล้ว · ห้ามเปิดบริการหรือแผนที่คิดเงิน (D-085) · ถ้าหน้าใดขอให้อัปเกรด ให้หยุดและแจ้ง orchestrator
- ขั้นตอน:
  1. GitHub → Actions → "deploy-preview" → Run workflow เลือก profile `playtest` (ตาม `infra/runbooks/preview-setup.md`) · รอจบสีเขียว
  2. เปิด preview บน Android และ iPhone · ตรวจป้าย version ตรงกับ short SHA ที่ orchestrator ส่ง
  3. smoke 10 นาทีใกล้ dungeon นำร่องที่ใกล้บ้านที่สุด: consent → เลือก class → เห็นรอยแยก → เดินเข้า → รอ check-in → confirm → เดินจนได้ tick แรก · เก็บมือถือเข้ากระเป๋า 5 นาทีแล้วดูว่า tick ยังขึ้น · จดว่าจอพกกระเป๋า/Wake Lock และการสั่นทำงานบนเครื่องใด
  4. แจ้ง orchestrator: "ผ่าน" หรืออาการที่พบ (เครื่อง + ขั้น)

#### P2-F06-T27 — HUMAN: playtest เดินจริงอย่างน้อย 3 คน
- ปลดล็อก: P2-F06-T28, exit E9 · ผู้ร่วมอายุ 15 ขึ้นไป (D-092): 15–17 ต้องมีฟอร์มผู้ปกครองที่เซ็นแล้วก่อนเดิน และเดินกับทีมหรือผู้ใหญ่ตลอด · ใช้มือถือตัวเอง ไม่มีค่าใช้จ่ายและไม่ต้องสมัครบริการใด
- ขั้นตอน:
  1. อ่าน `qa/playtest/phase-2-kit.md` และ `qa/playtest/safety-briefing.md` · ชวนผู้ร่วมอย่างน้อย 3 คน (ต่างกลุ่มถ้าได้: เดินน้อย/เดินมาก) · อธิบายว่าข้อมูลตำแหน่งไม่ออกจากเครื่องและผลในเกมไม่ใช่รางวัลจริง
  1b. ผู้ร่วมอายุ 15–17: รับ `qa/playtest/phase-2-parental-consent.md` ที่ผู้ปกครองเซ็นแล้วก่อนเริ่ม เก็บฉบับกระดาษไว้เอง **ห้ามถ่ายรูปหรือสแกนเข้า repo** · ในไฟล์ผลบันทึกแค่ "มีฟอร์มผู้ปกครอง: ใช่" กับช่วงอายุ ไม่ใส่ชื่อ
  2. นัดที่จุดเริ่มตาม kit (ห่าง dungeon นำร่อง 400–800 ม.) ในช่วงเวลาที่ kit ระบุ (ค่าตั้งต้น: เช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 · ฝนตกให้เลื่อนตามแผนสำรอง) · อ่าน safety briefing ให้ฟัง
  3. ให้แต่ละคนเปิด URL playtest บนเครื่องตัวเองและเล่นตาม script 30–45 นาที โดยไม่ช่วยอธิบายระบบ · ผู้สังเกตกรอก `qa/playtest/phase-2-observer-form.md` ด้วยรหัส P1, P2, P3
  4. หลังเล่น ให้ตอบ `product/playtest/phase-2-questionnaire.md` · ขอให้กด export summary ในเครื่อง (ไม่มีพิกัด เวลา relative) ถ้ายินดี
  5. วางคำตอบและ summary เป็นไฟล์ `product/playtest/results/P<n>.md` โดยไม่มีชื่อ เบอร์ หรือพิกัด แล้วแจ้ง orchestrator

#### P2-F06-T28 — Playtest report (product-manager, 1–2 วัน)
- Acceptance:
  - [ ] สรุปผลตามแผนวิเคราะห์ที่ตั้งไว้ก่อน (P2-F06-T19) ไม่เปลี่ยนเกณฑ์หลังเห็นผล · ข้อสรุป "สนุกพอไปต่อ" หรือรายการที่ต้องแก้เรียงตามผลกระทบ
  - [ ] เทียบตัวชี้วัดใน PRD F04–F06 + ค่า proxy ของ north star ต่อผู้ร่วมแบบไม่ระบุตัวคน (PM-S3) · ข้อค้นพบต่อกลุ่มผู้เล่น · ข้อเสนอถึง Phase 3
  - [ ] (GD N-08) handoff ถึง game-director สำหรับข้อค้นพบที่กระทบกฎของเกม เพื่อเสนอ decision ก่อน P2-F06-T29 · ไม่มีข้อมูลระบุตัวคน

#### P2-F06-T29 — HUMAN: ยอมรับข้อสรุป playtest
- ขั้นตอน: อ่าน `product/playtest/phase-2-playtest-report.md` → ตอบ orchestrator (ก) ไป Phase 3 (ข) ไป Phase 3 พร้อมรายการแก้ที่ระบุ (ค) แก้ใน Phase 2 ก่อน ให้ producer เพิ่มงาน

#### P2-F06-T30 — อนุมัติ flow F05 + F06 (game-director, 1 วัน · ใหม่ rev 2 · GD B-01)
- ตรวจ: flow + wireframe F05/F06 ตรง spec F05/F06, ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก, รางวัลก้อนแรกเด่นที่การแสดงผลเท่านั้น, ไม่มีตำแหน่งรายบุคคล ไม่มีจำนวนคน ไม่มีข้อความอิสระ · verdict PASS / NEEDS_CHANGES · copy (P2-F05-T09) ทำขนานได้ ข้อแก้จาก review เป็น fix

### ปิด phase

#### P2-CLOSE-QA — Regression ปิด Phase 2 (qa-tester, 1 วัน)
- Acceptance:
  - [ ] ทุก task เป็น DONE/CUT (พร้อมเหตุผล) ยกเว้น HUMAN ที่ระบุชื่อ · ทุก gate PASS พร้อม path (flow: F04-T27, F06-T30 · F04+F05: F05-T15–T19 · F06: F06-T20–T25)
  - [ ] Phase Exit Checklist ทุกข้อมีหลักฐาน · รัน root `lint`, `typecheck`, `test`, `test:e2e`, `build`, `gen-vectors --check` แนบ output · CI gate ตาม E15 อยู่ใน `ci.yml`
  - [ ] repo public: gitleaks ทั้ง history + guard สะอาด · ไม่มีพิกัด/คำตอบระบุตัวคนใน git · ไม่มีบริการคิดเงิน (D-085)
  - [ ] `qa/bugs.md` ไม่มี blocking ค้าง · verdict

#### P2-CLOSE-PM — รายงานปิด Phase 2 (producer, 1 วัน)
- Acceptance: รายงานตามรูปแบบใน agent file (≤ 200 บรรทัด) · สถานะ board เป็น COMPLETE หรือ COMPLETE — AGENT SIDE, WAITING FOR HUMAN · งานที่ยกไป Phase 3 ครบ (รวมการถอด engine ออกจาก client ตาม C1-1)

## 5. Phase Exit Checklist

คัดจากเกณฑ์ผ่านใน `studio/roadmap.md` Phase 2 + งานที่ยกมาจาก Phase 1 · ผู้ตรวจ (qa-tester, product-manager หรือ HUMAN) แนบหลักฐาน (path, ผล test, ตัวเลข)

### F04 — Dungeon Presence และ Run State
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E1 | GPS trace ทดสอบครบทุก transition รวมเดินเลียบขอบและ GPS drift | qa-tester | `qa/tests/F04/`, `qa/reports/F04-F05-qa-gate.md` | TODO |
| E2 | dungeon ที่ปิดเข้าไม่ได้ | qa-tester | case ปิดทำการใน `qa/tests/F04/` + e2e | TODO |

### F05 — Movement Gate, Reward Tick และ Drop
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E3 | trace "มือถือวางนิ่ง" ได้ 0 tick | qa-tester | `qa/tests/F05/` output | TODO |
| E4 | trace "นั่งม้านั่งมี jitter" ยังได้ tick | qa-tester | `qa/tests/F05/` output + ผลเครื่องจริงใน P2-C03 (TL N-11) | TODO |
| E5 | ผลตรง golden test vectors | qa-tester | test ของ `packages/shared` ผ่านทุก vector (ค้นแบบ dynamic) + `gen-vectors --check` | TODO |

### F06 — HP, Damage และ 10 นาทีแรก
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E6 | เลเวลตรงโซนไม่ใช้ยาอยู่ได้ราว 45 นาทีตาม simulator (D-020: ถึง auto-retreat) | qa-tester | `qa/tests/F06/` + vector survival หลัง D-038 B | TODO |
| E7 | copy สามจังหวะ (HP ต่ำ / auto-retreat / ตาย) ผ่าน content gate | qa-tester | `design/reviews/F06-copy-gate.md` PASS | TODO |
| E8 | ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก | qa-tester + product-manager (หลักฐานหลักจาก game-director) | `design/reviews/F06-design-gate.md` PASS + case ต่อจอใน `qa/reports/F06-qa-gate.md` + ยืนยันใน `product/reviews/F04-F06-product-gate.md` | TODO |
| E9 | งานของคน: playtest เดินจริงอย่างน้อย 3 คน กรอกแบบสอบถาม | HUMAN | P2-F06-T27 DONE + `product/playtest/results/` ≥ 3 ไฟล์ | TODO |

### ปิด Phase 2
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E10 | playtest report สรุปว่า loop สนุกพอไปต่อ หรือระบุสิ่งที่ต้องแก้ | HUMAN | `product/playtest/phase-2-playtest-report.md` + P2-F06-T29 DONE | TODO |
| E11 | (เป้าหมาย phase) MockLocationProvider ใช้ได้เต็ม: เล่นทั้ง loop F04–F06 ด้วย trace ที่เลือกได้และเร่งได้ | qa-tester | QA gate F04+F05 และ F06 | TODO |
| E12 | (producer เพิ่ม) ทุก task DONE/CUT และทุก gate PASS (รวม flow approval และ speed filter review) | qa-tester | `qa/reports/phase-2-regression.md` | TODO |
| E13 | (producer เพิ่ม · D-002, D-085, PDPA) ไม่มี secret, พิกัด หรือข้อมูลระบุตัวคนใน git · ไม่มีบริการคิดเงิน · consent ตำแหน่งแยก · storage ในเครื่องไม่มีพิกัดหลังจบ run และปุ่มลบข้อมูลในเครื่องทำงาน (GD B-08, C2-5, C2-6) · telemetry/export ไม่มีพิกัด (C2-3) | qa-tester + HUMAN | regression + QA gate ทั้งสอง + P2-C07 ขั้น 1 | TODO |
| E14 | (producer เพิ่ม · non-negotiable 1, 3) logic ของ presence/gate/tick/drop/damage อยู่ใน `packages/shared`/`packages/geo` แบบ pure ที่ server รันได้, client เรียก `session` เท่านั้น, ไม่มีค่าหรือชื่อฝังในโค้ด | qa-tester | `docs/reviews/F04-F05-tech-gate.md`, `docs/reviews/F06-tech-gate.md` PASS | TODO |
| E15 | (producer เพิ่ม · TL N-03) CI มี gate: ความ pure ของ shared/geo, geo เป็น leaf, client ไม่ import engine ย่อย, config schema + lint, vector ค้นแบบ dynamic, dungeon validator, telemetry contract + ไม่มีพิกัด, e2e origin allowlist, lint-headers, งบ bundle, bbox-vs-province | qa-tester | `.github/workflows/ci.yml` + CI run เขียว | TODO |
| E16 | (producer เพิ่ม · non-negotiable 2 + GDD ความปลอดภัย) speed lock ล็อกการเล่นจริง · check-in ปฏิเสธ teleport และ accuracy แย่ · ระยะคร่อมช่องว่างของ sample ไม่ได้รางวัล · รางวัลก้อนแรกของ onboarding เป็น tick ปกติ · ยามาจาก drop ที่ผ่าน gate เท่านั้น | qa-tester | `qa/tests/F04/`, `qa/tests/F05/`, `qa/tests/F06/` + design gate F04+F05 และ F06 | TODO |
| E17 | (producer เพิ่ม · D-083, PM-M3) GR-1 ของพระนคร + ปทุมวัน + บางรักผ่าน guardrail G4/S3 หรือมี decision ของคนรับทางแก้ | product-manager | `product/metrics.md` (P2-F04-T18) + decision log ถ้ามี | TODO |

### ยกมาจาก Phase 1 (D-086 · ต้องปิดก่อน P2-CLOSE-PM)
| # | เกณฑ์ (เลขเดิม) | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| P1-E5 | test ผ่านใน CI (run บน GitHub ของ push สุดท้าย) | HUMAN + qa-tester | P2-C07 ขั้น 3 + P2-C06 | TODO |
| P1-E7 | build deploy ได้บน preview และเปิดบนมือถือจริง | HUMAN | P2-C01 | TODO |
| P1-E10 | เดินทดสอบ 30 + 30 นาที กรอกผลวัด | HUMAN | `qa/playtest/results/` + `docs/tech/F02-spike-results.md` | TODO |
| P1-E16 | ผล Go / No-go ของ F02 (F01 = D-083 แล้ว) | HUMAN | P2-C05 | TODO |
| P1-E17 | ถ้า No-go มีข้อเสนอปรับ design | HUMAN | decision log หรือ "ไม่จำเป็น" | TODO |
| P1-E18, E19, E20 | ทุก task Phase 1 DONE/CUT · พิกัดคนเดินไม่อยู่ใน git · ไม่มี secret และไม่มีบริการคิดเงิน (D-085) | qa-tester + HUMAN | `qa/reports/phase-1-regression.md` รอบ 2 + P2-C07 | TODO |
| P1-CLOSE | Phase 1 board/report เป็น COMPLETE | HUMAN (รับรายงาน) · ทำโดย producer | P2-C08 | TODO |

## 6. คำถามถึงคนที่เหลือหลัง plan review (rev 2)

ตอบแล้ว 2026-09-26: Q-H1 = (ข) D-091 · Q-H2 = (ข) รวม 15–17 พร้อมฟอร์มผู้ปกครอง D-092 · Q-H3 = (ค) เช้า/เย็นทุกการเดิน D-093 (ดูตาราง "คำตอบจากคน" หัวข้อ 1)

| ID | คำถาม | ตัวเลือก | ทีมแนะนำ | Blocking | ต้องการคำตอบก่อน |
| --- | --- | --- | --- | --- | --- |
| Q-H1 (Q-P1-16) | เผยแพร่ polygon ของ dungeon นำร่องที่ได้จาก OSM ใน repo public และใน client ภายใต้ ODbL หรือไม่ | (ก) วาด polygon เองทั้งหมดไม่อิง OSM (ข) เผยแพร่ใต้ ODbL 1.0 + attribution OSM แบบเดียวกับ `data/coverage/` ใน Phase 1 (ค) ปรึกษานักกฎหมายก่อน แล้วค่อยเผยแพร่ | **(ข)** แล้วยืนยันซ้ำกับนักกฎหมายใน F20 (Phase 7) ก่อนเปิดตัวเชิงพาณิชย์ (product-manager 6.1) · repo เผยแพร่ข้อมูลอนุพันธ์ OSM ใต้ ODbL อยู่แล้ว ไม่เพิ่มความเสี่ยงใหม่ | ใช่ สำหรับการ push ข้อมูล (ไม่กั้นการทำงาน) | P2-F04-T13 ใน **W3** · ถ้ายังไม่ตอบเมื่อจบ W3 orchestrator ไม่ push commit ที่มี `data/dungeons/` (กฎสลับ 5) · (ก) ทำให้ T13 ยาวขึ้นราว 2 วัน · (ค) กั้น push จนกว่าจะได้ความเห็น |
| Q-H2 (A-P2-PLAN-01-5) | ผู้ร่วม playtest เดินจริงของ Phase 2 จำกัดเฉพาะผู้ใหญ่ 18+ ที่ยินยอมเองหรือไม่ | (ก) 18+ เท่านั้น (ข) 15+ พร้อมแบบฟอร์มยินยอมของผู้ปกครองแบบกระดาษ (ค) 15–17 ได้ถ้าผู้ปกครองเดินด้วย | **(ก)** · Phase 2 มีแค่ scaffold ของ parental consent ไม่ใช่ระบบจริง และผู้ร่วมถูกชวนแบบไม่คัดกรอง · กลุ่ม 15–17 เลื่อนไปทดสอบหลังปรึกษานักกฎหมายใน F20 (product-manager 6.2) · PRD F06 ระบุเป็น non-goal | ไม่ (ไม่กั้นการ build) | P2-F06-T18 (kit) ใน **W13** และก่อน P2-F06-T27 |
| Q-H3 | ช่วงเวลาเดินทดสอบภาคสนาม | (ก) แยก: เดินเชิงเทคนิค (P2-C02, P2-F04-T11) 10:00–15:00 แดดจัด เพื่อวัดสภาพโหดสุด · playtest กับผู้เล่นจริง (P2-F06-T27) ช่วงเช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 พร้อมแผนสำรองเมื่อฝนตก (ข) ทุกการเดินช่วงแดดจัด (ค) ทุกการเดินช่วงเช้า/เย็น | **(ก)** (product-manager 6.3) · ผู้ร่วมที่ไม่ใช่ทีมไม่ควรเจอแดดเที่ยง เพราะคำตอบ "สนุกไหม" จะปนกับ "ร้อนไหม" · (ค) เสียข้อมูลจอกลางแดด V-17 และแบตในสภาพโหดสุด | ไม่ | ก่อนคนเริ่ม P2-C02 (ตอนนี้) และ P2-F06-T18 ใน **W13** |

ข้อมูลที่ไม่ต้องให้คนตัดสิน (แจ้งเพื่อทราบ · orchestrator ลง decision log): ข้อขยาย A-P2-PLAN-01-6 (backend ถือ engine ทั้งชุดใน `packages/shared`) ไม่แตะเกณฑ์ปิด roadmap จึงเป็นอำนาจ producer ตามที่ tech-lead ระบุ · คำตัดสินของ game-director ใน A-P2-PLAN-02-1

## 7. Change log

| วันที่ | โดย | การเปลี่ยนแปลง |
| --- | --- | --- |
| 2026-09-26 | producer (P2-PLAN-01) | สร้าง board ฉบับร่าง 82 task (P1 carry-in 9, RISK 1, F04 23, F05 18, F06 29, ปิด phase 2 · agent 74, HUMAN 8) · ย้ายงาน Phase 1 ที่เหลือเป็น P2-C01..C08 ตาม D-086 + P2-C09 · จับคู่รายการยกมาทุกข้อในหัวข้อ 1.9 · มอบ reward/HP engine ให้ backend-programmer (รอ plan review) |
| 2026-09-26 | producer (P2-PLAN-02) | rev 2 ตาม plan review 3 ฉบับ: เพิ่ม 7 งาน (P2-F04-T24..T27, P2-F05-T19, P2-F05-T20, P2-F06-T30), รวม 2 งาน (P2-F04-T07 → T16, P2-F06-T15 → P2-F04-T10), ย้าย engine ทั้งชุดไป backend (รับข้อขยาย A-6), แก้ deps สายสนาม, จัด wave ใหม่ 17 wave (ไม่มีงานสนามบนเส้นวิกฤต), เพิ่ม E15–E17, หัวข้อ 6 คำถามถึงคน · รวม 89 แถว (agent 79, HUMAN 8, CUT 2) |

### rev 2: การกำหนด ID ของงานใหม่ (ID ที่ review เสนอ → ID สุดท้าย)
| Review | ID ที่เสนอ | งาน | ID สุดท้าย | เหตุผล |
| --- | --- | --- | --- | --- |
| game-director B-01 | P2-F04-T24 | อนุมัติ flow F04 | **P2-F04-T27** | ชนกับ P2-F04-T24 ของ tech-lead · ให้ ID เดิมกับงานของ tech-lead เพราะเสนอเป็นชุดต่อเนื่อง T24–T26 |
| game-director B-01 | P2-F06-T30 | อนุมัติ flow F05 + F06 | **P2-F06-T30** | ไม่ชน |
| tech-lead B-06 | P2-F04-T24 | JSON Schema + config lint | **P2-F04-T24** | คงเดิม |
| tech-lead B-13 | P2-F04-T25 | Client plumbing | **P2-F04-T25** | คงเดิม |
| tech-lead B-12 | P2-F04-T26 | `tools/dungeons` | **P2-F04-T26** | คงเดิม |
| tech-lead B-11 | P2-F05-T19 | Tech review ตัวกรองความเร็ว | **P2-F05-T19** | คงเดิม |
| (producer · ตาม GD B-05 + TL N-15 ทาง ก) | — | Config + vector ของ gate / run state / check-in | **P2-F05-T20** | แยกจาก P2-F06-T01 เพราะรวมแล้วเกิน 3 วัน · ทำให้ P2-F06-T01 อยู่ W1 และ key/vector พร้อมใน W2 ก่อน run engine (W3) ตามเจตนาของทั้งสอง review |

### rev 2: ข้อค้นพบ → สิ่งที่เปลี่ยน · game-director
| ID | สิ่งที่เปลี่ยน |
| --- | --- |
| หัวข้อ 1 (A-3 ACCEPTED 5 เงื่อนไข) | A-P2-PLAN-01-3 เป็น ACCEPTED · เงื่อนไข 1–4 ลง acceptance ของ P2-F04-T01, T15, T16, T21, T26 (จุดปลายทางนำทาง), T13, P2-F06-T02/T03/T10 (เลือกเฉพาะที่เปิด) · เงื่อนไข 5 ลง P2-F04-T14 |
| หัวข้อ 2 (gate รวม ACCEPTED 4 เงื่อนไข) | ตาราง gate หัวข้อ 1 · verdict ย่อยต่อ feature ใน P2-F05-T15..T18 · escalate ครั้งที่สองใน P2-F05-T18 · P2-F05-T18 deps P2-F06-T10 (ตรวจรางวัลก้อนแรก) · P2-F06-T24 ตรวจ gate + auto-retreat และ regression F04/F05 |
| B-01 | เพิ่ม P2-F04-T27 (deps T15 → เป็น deps ของ T21) และ P2-F06-T30 (deps F06-T03 → เป็น deps ของ P2-F05-T10, P2-F06-T08, T09, T10) · copy P2-F05-T09 ขนานได้ |
| B-02 | speed lock ฝั่งผู้เล่น: P2-F04-T01 (กฎ), T20 (สถานะ lock ด้วย `speedLock_kmh` ดิบ ไม่รอ C05), T15 (จอ), T16 (copy), T21 (แสดงผล), T19 (`driving-40kmh`), P2-F06-T18 (safety briefing) · P2-F04-T12 ให้ฟังก์ชันความเร็วที่ P2-F05-T13 แทนภายในโดยคง signature · E16 |
| B-03 | check-in: P2-F04-T01, T20 (ผ่าน `PresenceStrategy`), T15, T16, T19 (teleport + accuracy 35 ม.), P2-F05-T20 (vector) · E16 |
| B-04 | ช่องว่างของ sample: P2-F04-T05 (นิยาม), P2-F05-T20 (key `maxSamplePairGap_s`, `maxSampleAccuracy_m` + vector 400 ม.), T12 (ทำ), T14 (sequence แอปถูกปิด), T19 (trace), P2-F05-T08, T11 · E16 |
| B-05 | key ของ hysteresis/jitter/sample อยู่ใน P2-F05-T20 (W2) · P2-F04-T12 รับค่าเป็น parameter · P2-F04-T20 deps P2-F05-T20 · กรอบค่าของ hysteresis ลง P2-F04-T01 |
| B-06 | ยาจาก drop ที่ผ่าน gate เท่านั้น: P2-F06-T02 (กฎ), P2-F05-T01 (ยาใน drop table ทุก preset + vector), P2-F06-T04, T06, T08 (inventory จาก drop), T17 · A-P2-PLAN-02-1 · E16 |
| B-07 | รางวัลก้อนแรก = tick ปกติ: P2-F06-T02, T03, T10, T17, T30, P2-F05-T09, T18 · E16 |
| B-08 | เพดานเก็บ sample ในเครื่อง: P2-F04-T14 เพิ่ม `config/app/privacy.json` ใน Writes + key · P2-F04-T20 (run state), T25 (storage adapter), T19, P2-F05-T11, T15, T16, P2-F06-T21 ตรวจ storage · E13 |
| B-09 | ทาง ก: รวมส่วน world.md ของ P2-F04-T07 เข้า P2-F04-T16 (W4) · ส่วน area `client` รวมเข้า T16 ด้วย (ดู "rejected/ปรับ" ข้อ GD-B09) · P2-F04-T07 = CUT แบบรวมงาน |
| N-01 | P2-C09 deps P2-F06-T01 · ขอบเขตห้ามแก้คำอื่น + handoff ลง decision log · wave W9 (ดูรายการปรับ) |
| N-02 | E8 ผู้ตรวจ = qa-tester + product-manager โดยหลักฐานหลักคือ design gate ของ game-director (ดูรายการปรับ) |
| N-03 | ข้อ 1–2 ลง P2-F04-T01 · ข้อ 3–6 ลง P2-F06-T02 · ข้อ 6 ลง P2-F06-T18 (ช่องเวลาถึง auto-retreat ต่อ class) |
| N-04 | ซ่อนจำนวนคน: P2-F04-T02 (ข้อจำกัด), T15, T21, P2-F06-T02, T03, T09, T17, T24 · A-P2-PLAN-02-1 |
| N-05 | P2-F04-T02 (W1) → P2-F04-T17 (W4, deps T02) → P2-F04-T21 (W5, deps T17) · T21 ยิงเฉพาะ event ที่ประกาศแล้ว |
| N-06 | แถวใหม่ในหัวข้อ 1.9 (เลื่อน Phase 5) + ช่องในแบบฟอร์มผู้สังเกตของ P2-F06-T18 |
| N-07 | บันทึกไว้ใน A-P2-PLAN-01-6 (สนับสนุน) |
| N-08 | handoff ถึง game-director ใน P2-F06-T19 และ P2-F06-T28 |

### rev 2: ข้อค้นพบ → สิ่งที่เปลี่ยน · tech-lead
| ID | สิ่งที่เปลี่ยน |
| --- | --- |
| 1.1 (A-1 ACCEPT, C1-1..C1-5) | A-P2-PLAN-01-1 เป็น ACCEPTED · C1-1..C1-5 ใน P2-F04-T05 · C1-2 lint ใน T05 · C1-3 reducer ใน T05/T14/T20/F05-T08 · C1-4 ใน T05, F05-T02, T24 · C1-5 ใน T05, T25, P2-F06-T18, T27 · gate P2-F05-T15, P2-F06-T20 ตรวจ |
| 1.2 (A-2 ACCEPT, C2-1..C2-6) | A-P2-PLAN-01-2 เป็น ACCEPTED · C2-1 ใน T25 (รายการ origin) + T22 (e2e) · C2-2/C2-3/C2-4 ใน T14 + T25 · C2-5 ใน T14, T20 · C2-6 ใน P2-F06-T03, F05-T09, F06-T09 · E13 |
| 1.3 (A-6 ACCEPT + ข้อขยาย) | producer **รับข้อขยาย**: backend ถือ P2-F05-T02 และ P2-F04-T20 เพิ่ม (เหตุผลใน A-P2-PLAN-01-6) · gameplay 10 → 8 งาน, backend 2 → 4 งาน |
| 1.4 (งานสนาม) | หัวข้อ 1 "กฎงานที่ขึ้นกับผลเดินทดสอบ" เขียนใหม่ · กฎสลับข้อ W9 ของ rev 1 ถูกลบ |
| B-01 | geo เป็น leaf ใน P2-F04-T05 (lint) และ P2-F04-T12 (acceptance) · กฎ path ร่วม |
| B-02 | แยก `gateDiagnosticWindows` / `rewardWindow` ใน T05 · T14 sequence ต่อ tick · vector ใน P2-F05-T20 · P2-F05-T08 ใช้ `rewardWindow` |
| B-03 | ตัวกรองทิ้งเฉพาะ outlier + resample ตาม cadence ใน T05, T12 · key ใน P2-F05-T20 · vector table/bench/drift/edge + ไม่ขึ้นกับความถี่ sample |
| B-04 | DOM test ย้ายจาก P2-F04-T10 ไป P2-F04-T25 |
| B-05 | P2-F05-T02 port `formulas` + PRNG + ส่วน pure ของ `drops`/`survival` · การสลับ `tools/sim` ไปใช้ shared ย้ายไป P2-F05-T01 (W4, ถือ `tools/sim`, deps P2-F05-T02) |
| B-06 | เพิ่ม P2-F04-T24 (tech-lead) · P2-F05-T02 เหลือ typed accessor ไม่มี Ajv + H03 · 1.9 แถว P1-H01 ชี้ T24 |
| B-07 | `src/session/` ใน P2-F05-T08 (Writes) และ P2-F06-T06 (Writes, คนละ wave) · P2-F05-T08 deps P2-F04-T20 · client เรียก `sessionStep` เท่านั้น (T21, F05-T10, F06-T08, T10) · lint ใน T05 |
| B-08 | `PresenceStrategy` ใน T05, sequence ใน T14, acceptance ใน T20 · vector check-in ใน P2-F05-T20 |
| B-09 | สัญญา RNG ใน T05 + T14 · vector seed/ลำดับใน P2-F05-T01 · P2-F06-T06 ใช้ stream `hit` |
| B-10 | profile อ่านตอน build ใน P2-F04-T25 · P2-F05-T14 deps P2-F04-T25 และส่ง env ผ่าน workflow เท่านั้น |
| B-11 | P2-F06-T14 ถอด C05, F06-T12 · P2-F06-T13 ถอด F06-T12 · P2-F06-T15 ถอด C03, F06-T14 (แล้วรวมเข้า T10) · P2-F05-T12 C05 → C03 + C04 · P2-F06-T12 C03 → C02 · P2-F06-T20 ถอด F05-T13 · P2-F06-T26 เพิ่ม F06-T12 · เพิ่ม P2-F05-T19 · P2-CLOSE-QA ใช้ P2-F05-T19 แทน T13 |
| B-12 | เพิ่ม P2-F04-T26 (location, W4) · T21 deps T26 · opening_hours: normalized ตอน build, `PH` → `manual_required`, ประเมินด้วย offset คงที่ `openingHours.utcOffset_min` (key ใน P2-F05-T20) · T05 ห้ามติดตั้ง library opening_hours ใน apps/packages |
| B-13 | เพิ่ม P2-F04-T25 (gameplay, W3) · T21 เหลือ UI F04 + Mock UI + `setDungeonsSourceData` + ยิง event · deps เพิ่ม T25, T26 |
| B-14 | P2-F06-T07 เพิ่ม hook เสียงใน root build + root `package.json` (script `build`) ใน Writes · W5 ไม่มีงานอื่นถือ root `package.json` · P2-F05-T10 ตรวจ build จาก checkout สะอาด |
| N-01 | subpath exports ใน T05 · ถอด `src/index.ts` ออกจาก Writes ของทุกงาน |
| N-02 | Writes ของ T05 เพิ่ม `vitest.config.ts`, `tsconfig.json`, `pnpm-workspace.yaml`, stub `tools/dungeons`, `tools/config-lint` · รายการ dependency ตามข้อเสนอ |
| N-03 | E15 ใหม่ · T22 contract test + origin e2e · F05-T02 ค้น vector แบบ dynamic |
| N-04 | P2-F04-T08 อยู่ W6 (ไม่เกิน W6) · ต้อง DONE ก่อนแจ้ง P2-C07 |
| N-05 | รวมกับ PM-M1 (T17 W4 → T21 W5) |
| N-06 | P2-F04-T23 Writes เพิ่ม `tools/traces/` + acceptance |
| N-07 | `art/assets/manifest.build.json` ใน P2-F06-T07 |
| N-08 | P2-F04-T19 สร้าง trace ด้วย script ใน `qa/tests/traces/` + `--check` · เวลาทำการใช้ hook เวลาเริ่มของ T25 |
| N-09 | failure modes ใน P2-F04-T14 |
| N-10 | P2-F05-T15 deps เพิ่ม F05-T02, T24, T25, T26 + ขอบเขตตรวจ |
| N-11 | acceptance ใน P2-C03 + กฎสลับ 4 + ความเสี่ยงใน P2-RISK-01 |
| N-12 | ปิดใน P2-F04-T25 |
| N-13 | วิธีวัดใน T05 · key `bundle.initialJsBudget_bytes` ใน P2-F04-T10 |
| N-14 | P2-F04-T01 นิยาม "ของใน run" · T14 ตาม spec · vector ใน P2-F05-T01 |
| N-15 | ทาง ก แบบแยกงาน: P2-F05-T20 (W2) แทนการขยาย P2-F06-T01 |
| หัวข้อ 5 (wave ตัวอย่าง) | ใช้เป็นฐานแต่ไม่ตามทุกช่อง เพราะต้องรองรับ PM-M1/M3, GD B-01 และการรวม F06-T15 (ดูรายการปรับ) |

### rev 2: ข้อค้นพบ → สิ่งที่เปลี่ยน · product-manager
| ID | สิ่งที่เปลี่ยน |
| --- | --- |
| PM-M1 | P2-F04-T17 ย้าย W4 → ก่อน T21 (W5) และเป็น deps ของ T21 · T21 ยิงเฉพาะ event ที่ประกาศ |
| PM-M2 | P2-F06-T09 acceptance ยิง `onboarding_empty_screen_*` (reason) + `interest_registered_outside_area` · deps P2-F04-T17 · case ใน P2-F06-T11, T17, T21 · event ใน P2-F04-T17 |
| PM-M3 | P2-F04-T18 ย้าย W7 → **W2** (หลัง T03/T04 ใน W1 ก่อน T13 ใน W3) พร้อม verdict G4/S3 · กฎสลับ 2 (เกิน guardrail = blocking + plan-sync) · กฎสลับ 3 (ข้อมูลนำร่องเปลี่ยน = คำนวณซ้ำ) · แถวความเสี่ยงใน P2-RISK-01 · E17 |
| PM-S1 | P2-F04-T02 ย้าย W5 → W1 และเป็น deps ของ P2-F04-T17 |
| PM-S2 | P2-F06-T25 ตรวจ checklist เต็ม 4 ข้อ + ยืนยันหลักฐาน E8 · deps เพิ่ม P2-F06-T21 |
| PM-S3 | proxy ของ north star ใน P2-F04-T17 (นิยาม), P2-F06-T19 (แผนวิเคราะห์), P2-F06-T28 (รายงาน) · P2-F06-T19 deps T17 |
| PM-S4 | เพิ่ม deps P2-F04-T17 ให้ P2-F04-T21, P2-F05-T10, P2-F06-T08, T09, T10, T14 (T08, T10 ไม่เพิ่ม · ดูรายการปรับ) |
| PM-N1 | ไม่รับ (ดูรายการปรับ) |
| PM-N2 | ไม่รับ (ดูรายการปรับ) |
| 6.1–6.3 | เป็นคำแนะนำของทีมใน Q-H1..Q-H3 หัวข้อ 6 |

### rev 2: การเปลี่ยนที่ producer ทำเพิ่มเพื่อจัด wave
- P2-F06-T15 (code-split + งบ bundle) รวมเข้า P2-F04-T10 (W2): gameplay มีช่องว่างใน W4 ที่ใช้ไม่ได้ (T21 รอ W4) · การรวมทำให้ gameplay เหลือ 8 งานและเส้นวิกฤตไม่ยาวขึ้น · T10 เป็น 3 วัน (DOM test ออกไป T25 แล้ว) · P2-F06-T16 และ P2-F06-T20 deps ชี้ T10
- P2-F04-T06 (UX carry-over) ย้าย W1 → W7 และไม่เป็น deps ของ P2-F04-T21 อีก · client นำไปใช้ใน P2-F06-T08 และ T10 · เหตุผล: W1–W4 ต้องใช้ทุกช่องกับงานเส้นวิกฤต · ผลดีข้างเคียง: มีเวลารอภาพของ P2-C01 · P2-F04-T09 deps P2-F04-T06
- P2-F04-T13 ย้าย W3 คงเดิม, P2-F04-T15 ย้าย W2 → W3, P2-F06-T02 W2 → W3, P2-F05-T03 W3 คงเดิม, P2-F05-T01 W3 → W4, P2-F05-T08 W4 → W5, P2-F06-T06 W6 → W7 · ตรวจแล้วเส้นวิกฤตยังจบ gameplay ที่ W10 และปิด phase ที่ W17 เท่า rev 1

### rev 2: review points ที่ไม่รับหรือรับแบบปรับ (พร้อมเหตุผล)
| ID | ผล | เหตุผล |
| --- | --- | --- |
| GD B-09 (ส่วน area client คงไว้ใน T07) | ปรับ | ย้าย area `client` เข้า P2-F04-T16 ด้วย เพราะ T07 ที่เหลือจะเป็นงานราว 0.25 วัน ต่ำกว่าขั้นต่ำ 1 วัน และเจ้าของเดียวกัน |
| GD B-05 / TL N-15 (ใส่ key + vector ใน P2-F06-T01) | ปรับ | แยกเป็น P2-F05-T20 เพราะรวมแล้วเกิน 3 วัน · ได้ผลเดียวกัน (key + vector พร้อมใน W2) |
| GD N-01 (P2-C09 ไป W3 หรือ W5) | ปรับ | W3–W8 ทุกช่องเป็นงานเส้นวิกฤต จึงวาง W9 (อยู่ในคอลัมน์ถอยได้) · ระหว่างนี้ spec/copy อ้างเลข decision ตามที่ game-director เสนอ |
| GD N-02 (ผู้ตรวจ E8 = game-director) | ปรับ | กติกาของ producer ให้ผู้ตรวจ exit checklist เป็น qa-tester, product-manager หรือ HUMAN · E8 ผู้ตรวจ = qa-tester + product-manager โดยหลักฐานหลักคือ design gate ของ game-director |
| PM-S4 (เพิ่ม deps T17 ให้ P2-F04-T08, T10) | ไม่รับบางส่วน | T08 (CI) ไม่ยิง event · T10 เป็น probe ที่ export summary ของตัวเองใน W2 ก่อน T17 มี และไม่ใช้ชื่อ event ของ F04–F06 |
| PM-N1 (ย้าย P2-F06-T18 ขึ้นเร็ว) | ไม่รับ | qa-tester ไม่มีช่องว่างใน W6–W12 (คอขวดที่สอง) · W13 ยังอยู่ก่อน P2-F06-T26/T27 มีเวลา dry-run แบบฟอร์ม |
| PM-N2 (เปลี่ยนเลขงาน) | ไม่รับ | ID ถูกอ้างใน review 3 ฉบับและ Phase 1 board · การเปลี่ยนเลขเสี่ยงอ้างผิดมากกว่า |
| PM-M3 ข้อ 1 (GR-1 ฉบับร่าง W2 + ฉบับยืนยัน W7) | ปรับ | ทำฉบับเต็มครั้งเดียวใน W2 (T03/T04 เสร็จ W1 แล้ว) + คำนวณซ้ำเฉพาะเมื่อข้อมูลนำร่องเปลี่ยน (กฎสลับ 3) · ประหยัดช่องของ product-manager |
| TL หัวข้อ 5 (wave ตัวอย่าง) | ปรับ | ตัวอย่างวาง T17 ใน W4 พร้อม T21 และ T18 ไว้ช้า ซึ่งขัด PM-M1/M3 และไม่มีช่องของ flow approval (GD B-01) · แผน rev 2 ตรวจ deps/Writes ใหม่ทั้งหมด |
| TL 1.4 (F06-T15 คงเป็นงานแยก) | ปรับ | รวมเข้า P2-F04-T10 ตามเหตุผลในรายการเปลี่ยนของ producer · ยังไม่รอสนามตามที่ tech-lead ตัดสิน |

