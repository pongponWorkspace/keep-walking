# Phase 2 Board — Dungeon loop เล่นได้ (client-first)

สถานะ board: IN PROGRESS — F10 (D-144..D-149, Run 3 เริ่ม 2026-10-01) · ก่อนหน้า COMPLETE — AGENT SIDE, WAITING FOR HUMAN (จบ Run 2, 2026-09-30 · report.md) · เดิม DRAFT rev 2 (P2-PLAN-02, 2026-09-26) — แก้ตาม plan review 3 ฉบับ (game-director, tech-lead, product-manager ทั้งหมด NEEDS_CHANGES) · รอคนทบทวนและตอบคำถามหัวข้อ 6 · Phase 1 ยังไม่ปิด (D-086) งานที่เหลือของ Phase 1 อยู่ในกลุ่ม `P2-C*`
Feature: F04 Dungeon Presence และ Run State · F05 Movement Gate, Reward Tick และ Drop · F06 HP, Damage และ 10 นาทีแรก · F10 Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav (เพิ่ม 2026-10-01, plan-sync-f10.md)
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
| F10 | Flow approval (P2-F10-T10), Tech (T18), Copy (T20), Visual (T21), QA (T22), Design (T23), Product (T24) → P2-F10-CI | คนสั่งให้ผ่าน gate ครบ 6 อัน · flow approval เพิ่มเพราะลำดับ onboarding ของ core loop เปลี่ยน (plan-sync-f10 P-6) |

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
| P1-F03-T22 | V-20 ขอบ toast, V-22 gps-pill ≥14 px, V-15 chip-sponsored, V-16 tokens | P2-F04-T06 → client ใน P2-F06-T08 (rev 2) · V-15 เลื่อนไป phase ที่มี dungeon ผู้สนับสนุน (plan-sync W7 O-20) |
| P2-X20 / plan-sync W7 | ทาง ก ของ balance-model §21 (geometry 76 เขตสำหรับ {areaName}) | เลื่อน Phase 3 ถ้า P2-H20 เลือกทาง ข (O-23) |
| P2-F05-T07 | slot-empty 4 ไฟล์ (P2) | เลื่อน Phase 4 พร้อมอุปกรณ์/cosmetic (O-24) |
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
| P2-C09 | P1 | แก้ไฟล์ GDD ตามถ้อยคำที่ HUMAN อนุมัติใน D-084 เท่านั้น + บันทึก diff | spec | game-director | P2-F06-T01 | `เกม GPS Dungeon กรุงเทพฯ — Design Document.md` (เฉพาะหัวข้อที่ D-084 อนุมัติ), `design/reviews/gdd-wording-D-084.md` | DONE | GDD แก้ 10 จุดตาม D-084 (11 hunk, +24/−12 เทียบ 7fdb54c), `design/reviews/gdd-wording-D-084.md` · 5 จุดตีความ |
| P2-RISK-01 | ทั้ง phase | Risk register จาก GDD "ความเสี่ยงที่ต้องเฝ้าดู" + Phase 1 report หัวข้อ 8 + ความเสี่ยงใหม่ของ Phase 2 (รวม GR-1/บางรัก) | plan | producer | — | `studio/risks.md` | DONE | `studio/risks.md` (38 ความเสี่ยง: GDD 7, Phase 1 12, Phase 2 19 · top 6 · ตารางทบทวน) |
| P2-F04-T01 | F04, F05 | Feature spec F04 + F05: presence, run state, check-in, speed lock, เวลาทำการ, นำทาง · gate, rewardWindow, ช่องว่างของ sample, tick, drop, exp, สรุป run, R-B1, D-059 | spec | game-director | — | `design/features/F04-dungeon-presence.md`, `design/features/F05-movement-gate-reward.md` | DONE | `design/features/F04-dungeon-presence.md`, `design/features/F05-movement-gate-reward.md` |
| P2-F04-T02 | F04–F06 | PRD F04, F05, F06 ครอบผู้เล่น 3 กลุ่ม + ตัวชี้วัด + non-goals + ข้อจำกัดของ playtest | spec | product-manager | — | `product/prd/F04-dungeon-presence.md`, `product/prd/F05-movement-gate-reward.md`, `product/prd/F06-hp-damage-onboarding.md` | DONE | `product/prd/F04-dungeon-presence.md`, `F05-movement-gate-reward.md`, `F06-hp-damage-onboarding.md` |
| P2-F04-T03 | F04 | ใส่ osm_id ที่ตัดตาม D-083 + คำราชาศัพท์ใน coverageFilter แล้วรัน pipeline + analysis ซ้ำ | build | location-engineer | — | `config/balance/dungeons.json` (เฉพาะ `coverageFilter`), `tools/coverage/`, `data/coverage/` | DONE | `config/balance/dungeons.json` coverageFilter (exclude/review/release), `tools/coverage/` 1.1.0, `data/coverage/launch-districts-before-after.csv` · พระนคร 20→10 (G2 พอดี), ปทุมวัน G1 61.42%, บางรัก 6 · pytest 311 |
| P2-F04-T04 | F04 | แผนทางเสริมบางรัก + รายชื่อ dungeon นำร่อง 10–20 แห่งจาก 3 ย่าน (F-11, N-04, N-05) | spec | level-designer | — | `design/levels/pilot-dungeons.md`, `design/levels/bangrak-plan.md`, `design/levels/launch-criteria.md`, `design/levels/presets.md` | DONE | `design/levels/pilot-dungeons.md` (20: พระนคร 10, ปทุมวัน 6, บางรัก 4), `bangrak-plan.md` (+2–4), launch-criteria 4.2/4.6, presets 8 |
| P2-F04-T05 | F04–F06 | ADR 0003 game core client-first (C1-1..C1-5, geo leaf, สองหน้าต่าง, ตัวกรอง gate, PresenceStrategy, สัญญา RNG, subpath exports, วิธีวัดงบ bundle) + ติดตั้ง dependency + lint boundary + ปิด D-054/D-057/D-075 | spec | tech-lead | — | `docs/adr/0003-client-first-game-core.md`, `docs/adr/0001-repo-layout.md`, `docs/tech/F02-map-location-spike.md`, `docs/tech/gps-trace-format.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `eslint.config.js`, `vitest.config.ts`, `tsconfig.json`, `packages/geo/package.json`, `packages/geo/tsconfig.json`, `packages/shared/package.json`, `apps/client/package.json`, `tools/dungeons/package.json`, `tools/config-lint/package.json` | DONE | `docs/adr/0003-client-first-game-core.md`, ADR 0001 rev 3, deps + lint boundary, stubs geo/dungeons/config-lint · D-054/057/075 ตัดสิน |
| P2-F04-T06 | F04–F06 | UX carry-over: N-1, N-3, V-15, V-16, V-20, V-22, ramp skin/hair, S-22, interest.confirm, index ศัพท์, ตรวจป้ายปุ่ม 11 cell | fix | uiux-designer | — | `design/ux/ia.md`, `design/ux/tokens.json`, `design/ux/components.md`, `design/ux/wireframes/` (ไฟล์ 00–06 ของ F03), `design/ux/flows/F03-core-loop.md` | DONE | `design/ux/tokens.json` (tonic, waterEdge, skin/hair 12, nameMapping), `components.md` §13, ia.md S-22, F03 override note, wireframe 01/03/index, shared/style.css · contrast เหลือ 2 row-count (P2-X01) |
| P2-F04-T07 | F04–F06 | (รวมเข้า P2-F04-T16 ตาม GD B-09 ทาง ก) world.md ตาม D-084 + area `client` ใน copy-rules.json | fix | narrative-designer | — | — | CUT | รวมใน P2-F04-T16 |
| P2-F04-T08 | F04–F06 | CI: lint-headers, ตรวจสิทธิ์ token และบริการคิดเงิน (D-085) + runbook billing guard · + (จาก P2-F06-T07) cache header ของ /kw/* ใน preview _headers และรัน prebuild ของ tools/art ใน deploy-preview.yml | build | devops-engineer | — | `.github/workflows/ci.yml`, `infra/scripts/`, `infra/runbooks/billing-guard.md`, `docs/tech/environments.md`, `.github/workflows/deploy-preview.yml`, `infra/pages/keep-walking-preview/_headers`, `infra/runbooks/preview-setup.md` | DONE | ci.yml job lint-headers + billing-guard + prebuild ก่อน e2e, publish-client.sh prebuild, preview _headers /kw/*, `infra/runbooks/billing-guard.md`, environments.md |
| P2-F04-T09 | F04–F06 | QA carry-over: bugs.md ย้อนหลัง + ปิด BUG-F01-001/002, e2e TC-MAP-05/08, regex ramp 22, static check kw-dungeons, นับ kw-rift-sponsored/crack, ถ่าย S1/S3/S6 ใหม่ | fix | qa-tester | P2-F04-T06 | `qa/tests/e2e/`, `qa/tests/unit/`, `qa/reports/F02/map-style/`, `qa/bugs.md` | DONE | bugs.md (P1-H06, P2-001), e2e TC-MAP-05/08 ถาวร, map-style static check, ภาพ S1/S3/S6 56 ภาพ, `qa/reports/F02/map-style/P2-F04-T09-rerun.md` |
| P2-F04-T10 | F04–F06 | HUD probe (Wake Lock, vibrate, จอล็อก/page hidden, แบต) + environment/segment + stationary_5min_accum_m + tilesUrlMissing + code-split maplibre และงบ bundle (รับ P2-F06-T15) | build | gameplay-programmer | P2-F04-T05 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | HUD probe (wake-lock, vibrate, visibility, probe-summary), environment/segment + stationary_5min_accum, tilesUrlMissing via getCopyText, maplibre lazy + measure-bundle (initial 48.4 KB br, map-lazy 350 KB br) · client 277 unit, e2e 28/28 |
| P2-F04-T11 | F04–F06 | HUMAN: กด deploy-preview ของ build ที่มี probe แล้วรัน probe บน Android + iPhone (15–25 นาที) | research | HUMAN | P2-F04-T10 | `qa/playtest/results/` (คนกรอก summary ไม่มีพิกัด) | HUMAN | — |
| P2-F04-T12 | F04 | `packages/geo` (leaf): haversine, หน้าต่าง diagnostic + ระยะสะสมของ rewardWindow, ตัวกรอง outlier + resample, ตัดคู่ sample ที่ห่าง/accuracy แย่, ความเร็วของ lock, PIP + hysteresis, play area mask | build | location-engineer | P2-F04-T05 | `packages/geo/` | DONE | `packages/geo/` (haversine, filter+re-anchor, grid resample, rewardWindow, diagnostic, PIP+hysteresis, inPlayArea) · 85 test |
| P2-F04-T13 | F04 | ข้อมูล dungeon นำร่อง 10–20 แห่ง (polygon, level range, preset, drop_table_id, opening_hours แบบ normalized, จุดปลายทางนำทาง, verification_mode, floor_level) | asset | level-designer | P2-F04-T01, P2-F04-T03, P2-F04-T04 | `data/dungeons/pilot.geojson`, `data/dungeons/dungeons.json`, `data/dungeons/README.md`, `data/dungeons/LICENSE-DATA.md` | DONE | `data/dungeons/dungeons.json` + `pilot.geojson` 20 record (published 13: พระนคร 7, ปทุมวัน 4, บางรัก 2 · review 6 · draft PN-1), artifact 13 · validator 0 error |
| P2-F04-T14 | F04, F05 | Tech note F04 + F05: API session/run/reward, sequence ต่อ tick, check-in, แอปถูกปิดแล้วเปิดใหม่, เพดานเก็บ sample, telemetry sink, artifact ของ dungeon, ลิงก์นำทาง, failure modes, test hooks | spec | tech-lead | P2-F04-T01, P2-F04-T05 | `docs/tech/F04-dungeon-presence.md`, `docs/tech/F05-movement-gate-reward.md`, `config/app/privacy.json`, `config/app/telemetry.json` | DONE | `docs/tech/F04-dungeon-presence.md`, `docs/tech/F05-movement-gate-reward.md`, `config/app/privacy.json` v2, `config/app/telemetry.json` v2 |
| P2-F04-T15 | F04 | Flow F04 + wireframe: dungeon ใกล้ตัว, นำทาง (A-3), เลือก + confirm, รอ check-in, speed lock, Active/Grace/Suspended/Ended, ปิดทำการ, GPS แย่ | spec | uiux-designer | P2-F04-T01 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/F04-*.html` | DONE | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/F04-01..04-*.html` · 19 copy key ใหม่ |
| P2-F04-T16 | F04 | Copy F04 + ชื่อโซนนำร่อง + world.md รับธง H-01..H-13 (D-084) + area `client` ใน copy-rules.json (รับ T07) | asset | narrative-designer | P2-F04-T15, P2-F04-T04 | `config/content/copy.th.json`, `config/content/names.th.json`, `config/content/copy-rules.json`, `design/narrative/world.md` | DONE | `design/narrative/world.md` (D-084, 11.1 ชื่อนำร่อง), `names.th.json` (19 + PN-1 พัก), `copy.th.json` +55 key, `copy-rules.json` area client/anticheat · lint:copy exit 0, 0 FAIL, 10 WARN (orchestrator รัน) |
| P2-F04-T17 | F04–F06 | Telemetry + metrics F04–F06 (รวม speed lock, check-in, empty screen ตาม reason, ลบข้อมูลในเครื่อง, proxy ของ north star) | spec | product-manager | P2-F04-T01, P2-F04-T02 | `product/telemetry-events.md`, `product/metrics.md` | DONE | `product/telemetry-events.md` (local ring buffer, event F04–F06 ครบ), `product/metrics.md` (north star proxy client, funnel ใหม่) |
| P2-F04-T18 | F04 | คำนวณ GR-1 ของ 3 ย่าน (D-083) เทียบ guardrail G4/S3 + ยืนยัน A-P1-F01-T06-2/-4/-7 | spec | product-manager | P2-F04-T03, P2-F04-T04 | `product/metrics.md`, `product/prd/F01-coverage-survey.md`, `product/prd/F04-dungeon-presence.md`, `product/prd/F06-hp-damage-onboarding.md` (แก้ตาม handoff ของ P2-F04-T17) | DONE | `product/metrics.md` §9.1 GR-1: พระนคร 0%, ปทุมวัน 0.06%, บางรัก 0% → PASS ทั้ง 3 · PRD F01/F04/F06 แก้แล้ว |
| P2-F04-T19 | F04, F05 | Test plan F04 + F05 + QA trace ที่สร้างด้วย script (ทุก transition, check-in, speed lock, ช่องว่าง sample, ปิดทำการ, ขอบเวลา) | spec | qa-tester | P2-F04-T01, P2-F04-T14 | `qa/plans/F04-test-plan.md`, `qa/plans/F05-test-plan.md`, `qa/tests/traces/`, `data/gps-traces/qa/` | DONE | `qa/plans/F04-test-plan.md`, `F05-test-plan.md`, `qa/tests/traces/` (3 QA trace + --check, engine test 36), `data/gps-traces/qa/` |
| P2-F04-T20 | F04 | Run engine `src/run/`: เลือกทีละ 1 + confirm, PresenceStrategy (check-in), state machine, speed lock, เวลาทำการ, sample ที่เก็บในเครื่อง | build | backend-programmer | P2-F04-T14, P2-F04-T12, P2-F05-T02, P2-F05-T20 | `packages/shared/src/run/` | DONE | `packages/shared/src/run/` (time, hysteresis D-103/104, speed lock, approach, check-in PresenceStrategy, run timeline, opening hours) · vector 275/276 |
| P2-F04-T21 | F04 | Client F04 UI: แผนที่ dungeon + นำทาง + confirm + สถานะ run + check-in/speed lock + Mock UI + setDungeonsSourceData + ยิง event | build | gameplay-programmer | P2-F04-T20, P2-F04-T15, P2-F04-T16, P2-F04-T13, P2-F04-T25, P2-F04-T26, P2-F04-T27, P2-F04-T17 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | client F04 ครบ loop ต่อ session จริง: artifact → แผนที่, confirm, check-in, run bar, speed-lock, summary, nav link + fallback, telemetry · adapter 3 ตัวรอสลับ → P2-X21 · root test 2211, e2e 29/30 |
| P2-F04-T22 | F04 | Black-box trace-replay F04 + e2e origin allowlist + contract test ชื่อ event | build | qa-tester | P2-F04-T21, P2-F04-T19 | `qa/tests/F04/`, `data/gps-traces/qa/`, `qa/bugs.md` | DONE | qa/tests/F04 (sessionStep black-box: check-in, run-state, persist-privacy, opening hours, telemetry contract, nav-link) + e2e 3 spec + QA trace 3 ตัวบน dungeon จริง · 105 pass + 1 expected-fail · BUG-P2-002 (high), BUG-P2-003 (medium) |
| P2-F04-T23 | F04 | Location hygiene (F-05a, F-07, alias, README §6, docstring, legend, run-meta, fixture S2/S5, รู mask S6, polygon จังหวัดเล็ก) + `tools/traces` ใช้ `packages/geo` | fix | location-engineer | P2-F04-T03 | `tools/coverage/`, `data/coverage/`, `tools/tiles/`, `data/map/`, `packages/location/`, `tools/traces/` | DONE | legacy timing ลบ, excluded/run-meta guard, legend จาก config, screen fixtures S2/S5/S6, mask hole ตัดตาม tile bbox, playable-provinces.geojson (bbox check ใน CI), tools/traces ใช้ packages/geo, LICENSE-DATA.md · gateWindows เข้ากันได้ย้อนหลัง |
| P2-F04-T24 | F04–F06 | JSON Schema ต่อไฟล์ config + config lint (D-062, H01) ต่อเข้า `pnpm test` | build | tech-lead | P2-F04-T05 | `packages/shared/schemas/config/`, `tools/config-lint/`, `docs/adr/0003-client-first-game-core.md` (แก้ถ้อยคำ 5.2 ข้อ 6(b)) | DONE | `packages/shared/schemas/config/` (19 schema), `tools/config-lint/` (58 test, รันใน pnpm test), ADR 0003 5.2 ข้อ 6 · 0 error, 15 allowlist มีเจ้าของ |
| P2-F04-T25 | F04–F06 | Client plumbing: config เฉพาะ key (F-04, F-08), สลับไป `packages/geo` (F-05b), game clock ของ Mock, storage adapter, telemetry sink + export, build profile, DOM test ของ HUD | build | gameplay-programmer | P2-F04-T05, P2-F04-T12, P2-F04-T14 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | client plumbing: whitelist config generate, geo swap, game clock, storage kw.p2.*, telemetry sink+export, build profile, HUD DOM test · apps/client 232 unit, e2e 30/30 |
| P2-F04-T26 | F04 | `tools/dungeons`: validator ตาม dungeon-rules.md + build artifact ของ client (polygon, จุดป้าย polylabel, จุดปลายทางนำทาง, property whitelist, เวลาทำการ normalized) | build | location-engineer | P2-F04-T05, P2-F04-T14 | `tools/dungeons/`, `packages/shared/schemas/dungeon.schema.json`, `data/dungeons/artifact/` | DONE | `tools/dungeons/` (validator + artifact build + --check ใน pnpm test, 138 test), `packages/shared/schemas/dungeon.schema.json`, `data/dungeons/artifact/dungeons.client.v1.json` (ว่าง รอ T13), fixture expected.client.v1.json |
| P2-F04-T27 | F04 | อนุมัติ flow F04 (core loop) ก่อน build | review-gate | game-director | P2-F04-T15, P2-X02 | `design/reviews/F04-flow-approval.md` | DONE | `design/reviews/F04-flow-approval.md` รอบ 2 PASS (B-01..B-08 แก้ครบ, เงื่อนไข C-1..C-5 ไม่ blocking) · J-8 F-18 ทาง b, J-9 D-103, J-10 D-110 |
| P2-F05-T01 | F05, F06 | Config loop: exp ต่อ tick, drop table ต่อ preset (รวมยา) + ไอเทม (assets.icon), ค่า F06, dungeons.safety + vector drop/exp/survival/ตายเทียบ auto-retreat/seed + `tools/sim` ใช้สูตรจาก shared | spec | systems-designer | P2-F04-T01, P2-F04-T03, P2-F06-T01, P2-F06-T02, P2-F05-T02, P2-F05-T20 | `config/balance/drops.json`, `config/balance/combat.json`, `config/balance/economy.json`, `config/balance/dungeons.json`, `config/balance/classes.json`, `design/systems/balance-model.md`, `design/systems/sim-report.md`, `design/systems/test-vectors/`, `tools/sim/` | DONE | drops.json items 11 + dropTables 3 preset (hpSmall 17%, revive 1%), exp ต่อ tick, safety D-061, vectors tick-reward 30 + run-loop 29, tools/sim import shared · F-18 PN-2 ตก R43 |
| P2-F05-T02 | F05, F06 | Port สูตร + PRNG + ส่วน pure ของ drops/survival จาก `tools/sim` เข้า `src/formulas/` + config accessor แบบ typed (ไม่ใช้ Ajv) + H03 | build | backend-programmer | P2-F04-T05 | `packages/shared/src/formulas/`, `packages/shared/src/config/` | DONE | `packages/shared/src/formulas/` (rng + deriveSeed, damage, exp, gear, party, survival closed-form, drops), `src/config/` (typed accessor, H03) · 229 test, 188 vector |
| P2-F05-T03 | F04–F06 | Art: F-AD-1..4 + brief asset ของ Phase 2 (ไอคอน class 4, กรอบ rarity 5, สถานะ dungeon, ยา, ไอเทม drop, ตัวนำทาง, speed lock) | spec | art-director | — | `art/direction/map-style.md`, `art/direction/map-style/`, `art/direction/style-guide.md`, `art/direction/icon-grammar.md`, `art/direction/briefs/P2-assets.md` | DONE | `art/direction/briefs/P2-assets.md` (72 SVG), map-style/style-guide/icon-grammar F-AD-1..4 · ramp.tonic + map.water-edge ใหม่ (contrast test ตก 4 จนกว่า P2-F04-T06 + P2-X01) |
| P2-F05-T04 | F06 | อวตาร: V-18 clipPath, V-19 composite มุมข้าง/หลัง + panel กลางคืน, ref.style-tile.v1 approved | fix | artist-2d | — | `art/assets/avatar/`, `art/src/avatar/`, `art/ref/`, `art/assets/manifest.json` | DONE | manifest แยก 8 ไฟล์, V-18 clipPath 11 ไฟล์, V-19 composite หน้า/ข้าง/หลัง + panel กลางคืน, PNG 64 ไฟล์ (≤46% งบ), manifest.build.json |
| P2-F05-T05 | F05 | VFX: module ฐาน CSS/WAAPI + effect ได้ tick / ได้ของตาม rarity + V-21 + demo | build | vfx-animator | P2-F05-T03 | `art/vfx/` | DONE | `art/vfx/` core (play/registerEffect, WAAPI, reduced-motion, visibility cancel), tick-feedback 4, rarity-reveal 5 (V-21 แก้), rift-reveal, demo 5, specs 4 · lint สะอาด |
| P2-F05-T06 | F05, F06 | Audio: generator `audio/src/` + cue ของ loop + manifest + demo + F-13 | build | sound-designer | — | `audio/src/`, `audio/out/`, `audio/manifest.json`, `audio/demo.html`, `audio/cue-list.md` | DONE | `audio/src/` (generator WAV deterministic), `audio/manifest.json` 20 cue, `audio/demo.html`, cue-list F-13 · build ผ่าน 115 KB |
| P2-F05-T07 | F04–F06 | ชุดไอคอน Phase 2 (SVG) + manifest | asset | artist-2d | P2-F05-T03, P2-F05-T01 | `art/assets/icon/`, `art/assets/badge/`, `art/assets/frame/`, `art/assets/illus/`, `art/assets/manifest.json`, `art/prompts/` | DONE | SVG 72/72 (ui 28 + ui16 11, item 11, badge 12, frame 10), manifest +74, ref.style-tile.v1 approved · validator 0 error 1 warn (manifest.json เกินงบ 60 KB) |
| P2-F05-T08 | F05 | Reward engine `src/reward/` + ตัวประกอบ loop `src/session/` (`sessionStep`: run → gate → tick → drop) | build | backend-programmer | P2-F04-T14, P2-F05-T02, P2-F05-T01, P2-F04-T12, P2-F04-T20 | `packages/shared/src/reward/`, `packages/shared/src/session/` | DONE | `packages/shared/src/reward/` (gate, loot, exp), `src/session/` (createSession, sessionStep, endRun) · vector gate/reward-window/partial-tick/loot ผ่าน · ส่วนที่ขาด → P2-X10 |
| P2-F05-T09 | F05, F06 | Copy F05 + F06: tick, ของ, สรุป run, HP/ยา/auto-retreat/ตาย/ฟื้น, class, onboarding, ไกล/นอกพื้นที่, pocket screen, Wake Lock, consent/age gate, ลบข้อมูลในเครื่อง | asset | narrative-designer | P2-F06-T03, P2-F04-T16 | `config/content/copy.th.json`, `config/content/names.th.json` | DONE | `copy.th.json` +29 key (F05/F06, ลบข้อมูลในเครื่อง, credits, B-04/B-06), `names.th.json` PN-1 (D-107) + อุปกรณ์ 4 · lint:copy exit 0, 0 FAIL (orchestrator รัน) |
| P2-F05-T10 | F05 | Client F05: เรียก `sessionStep` เท่านั้น, feedback ได้ tick/ของ (icon + effect + เสียง), สรุปรางวัลหลังจบ run | build | gameplay-programmer | P2-F05-T08, P2-F05-T07, P2-F05-T09, P2-F05-T05, P2-F05-T06, P2-F06-T07, P2-F04-T21, P2-F04-T17, P2-F06-T03, P2-F06-T30 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | tick-toast (vfx+audio queue), audio-player, run-summary Flow B ทุกเหตุจบ, e2e full-run ×60 (30/30 ไม่ flaky) · แก้ #hud ถูก map บัง (คลิกไม่ได้), game clock ใน dispatch · H03 (ก)(ข)(ค) ครบ · root 2493 pass |
| P2-F05-T11 | F05 | Black-box trace-replay F05 (วางนิ่ง 0 tick, ม้านั่ง ≥1 tick, ช่องว่าง sample ไม่ได้รางวัล, ตรง vector, สรุป run) | build | qa-tester | P2-F05-T08, P2-F05-T10, P2-F04-T19 | `qa/tests/F05/`, `data/gps-traces/qa/`, `qa/bugs.md`, `qa/tests/F04/session-checkin-lifecycle.test.ts` (เฉพาะพลิก it.fails ของ BUG-P2-002), `qa/tests/F02/hud-flag-gate.test.ts` (prettier เท่านั้น, TG-02) | DONE | qa/tests/F05 10 test ผ่าน sessionStep (วางนิ่ง 0, ม้านั่ง ≥1, ขอบ 50 ม. ไม่ผ่าน, ช่องว่าง 400 ม. ไม่นับ, speed lock ไม่มี tick, exp vector 18, drop table, seed ซ้ำได้, storage ไม่มีพิกัด) + QA trace 5 ตัว · BUG-P2-005 · การพลิก it.fails ของ BUG-P2-002 ถูกตัวจัดสิทธิ์ปฏิเสธ → P2-H30 |
| P2-F05-T12 | F05 | Speed lock แบบความเร็วกรอง + กฎปลดเมื่อหยุดไฟแดง: ค่าใน config + vector จาก trace จริง | spec | systems-designer | P2-C03, P2-C04, P2-F05-T01 | `config/balance/anticheat.json`, `design/systems/balance-model.md`, `design/systems/test-vectors/`, `tools/sim/` | TODO | — |
| P2-F05-T13 | F05 | ความเร็วแบบกรองใน `packages/geo` (แทนฟังก์ชันความเร็วของ lock โดยไม่เปลี่ยน signature) | build | location-engineer | P2-F05-T12, P2-F04-T12 | `packages/geo/` | TODO | — |
| P2-F05-T14 | F04–F06 | Build profile playtest ใน deploy-preview (ส่ง env ผ่าน workflow) + runbook | build | devops-engineer | P2-F04-T05, P2-F04-T08, P2-F04-T25 | `.github/workflows/deploy-preview.yml`, `infra/pages/`, `infra/runbooks/preview-setup.md`, `docs/tech/environments.md` | DONE | deploy-preview input profile (preview/playtest) → VITE_KW_PROFILE/COMMIT, publish-client.sh ลบ prebuild ซ้ำ, runbook §10 ขั้นตอน P2-F06-T26 |
| P2-F05-T15 | F04, F05 | Tech gate F04 + F05 (verdict ย่อยต่อ feature) | review-gate | tech-lead | P2-F04-T21, P2-F05-T10, P2-F05-T08, P2-F04-T20, P2-F04-T12, P2-F05-T02, P2-F04-T24, P2-F04-T25, P2-F04-T26, P2-X21, P2-H02, P2-X34, P2-X35, P2-X37, P2-H29 | `docs/reviews/F04-F05-tech-gate.md` | DONE | tech gate PASS (รอบ 2) F04 + F05 · docs/reviews/F04-F05-tech-gate.md §9 · ค้าง P2-H30 (คน) · R2-01 Mock clock δ, R2-02 allowedOrigins |
| P2-F05-T16 | F04, F05 | QA gate F04 + F05 (verdict ย่อยต่อ feature) | review-gate | qa-tester | P2-F05-T15, P2-F04-T22, P2-F05-T11, P2-X34 | `qa/reports/F04-F05-qa-gate.md`, `qa/bugs.md`, `qa/tests/e2e/` | DONE | QA gate PASS F04 + F05 · qa/reports/F04-F05-qa-gate.md · e2e 72/72 · e2e ใหม่ no-raw-copy-key, web-hooks-no-effect · BUG-P2-005 ปิด · ค้าง P2-H30 (คน) |
| P2-F05-T17 | F04, F05 | Content gate (copy) F04 + F05 (verdict ย่อยต่อ feature) | review-gate | narrative-designer | P2-F04-T21, P2-F05-T10, P2-X30, P2-X36, P2-X37 | `design/reviews/F04-F05-copy-gate.md` | DONE | copy gate F04 PASS, F05 PASS (รอบ 2) · design/reviews/F04-F05-copy-gate.md · note R2-N1 (โน้ต registry mm:ss), R2-N2 (comment names.ts) |
| P2-F05-T18 | F04, F05 | Design gate F04 + F05 (verdict ย่อยต่อ feature · gate เดียวครอบรางวัลก้อนแรก) | review-gate | game-director | P2-F05-T16, P2-F05-T17, P2-F06-T10, P2-H20 | `design/reviews/F04-F05-design-gate.md` | DONE | design gate PASS รอบ 1 (F04 PASS, F05 PASS) · design/reviews/F04-F05-design-gate.md · O-1..O-4 ไม่บล็อก → H33, H34, H35, X38 (O-2) · เงื่อนไขค้าง §8: F-16 รอ P2-C03, pendingSetMax_s ใน spec F08, F06-T24 ตรวจ regression + O-3 |
| P2-F05-T19 | F05 | Tech review ตัวกรองความเร็ว (P2-F05-T12/T13) | review-gate | tech-lead | P2-F05-T13 | `docs/reviews/F05-speed-filter-tech-gate.md` | TODO | — |
| P2-F05-T20 | F04, F05 | Config + vector ของ gate / run state / check-in: cadence, ตัวกรอง outlier, ช่องว่าง sample, accuracy, hysteresis ขอบ, timezone offset + vector rewardWindow, D-059, ขอบเวลา Grace/Suspended | spec | systems-designer | P2-F04-T01, P2-F04-T05 | `config/balance/dungeons.json` (`movementGate`, `runState`, `openingHours`), `config/balance/anticheat.json` (`checkIn`), `design/systems/balance-model.md`, `design/systems/test-vectors/`, `tools/sim/` | DONE | `config/balance/dungeons.json` movementGate/runState/openingHours, anticheat speedLock, unlocks distanceDisplaySteps · vector ใหม่ 142 (7 ไฟล์) · reference tools/sim ตรงกับ geo ยกเว้นกฎคู่เร็วเกิน speedLock |
| P2-F06-T01 | F05, F06 | Balance carry-over: D-038 B (vitPotionEfficiency 2 → 1) + vectors + sim report, farDungeonThreshold_m 1,900, R-B1 + vector ขอบ, partyMult cap | spec | systems-designer | — | `config/balance/progression.json`, `config/balance/unlocks.json`, `config/balance/raid.json`, `design/systems/balance-model.md`, `design/systems/sim-report.md`, `design/systems/test-vectors/`, `tools/sim/` | DONE | `config/balance/{progression,unlocks,raid}.json`, balance-model 3.1.1, sim-report 11, vectors 289 (damage 64, raid 15) · test 937 ผ่าน |
| P2-F06-T02 | F06 | Feature spec F06 (damage, auto-retreat, ยาจาก drop, แจ้ง 30%, ตาย/ฟื้น, class, onboarding + รางวัลก้อนแรก = tick ปกติ, จอไกล/นอกพื้นที่, ซ่อนจำนวนคน) + pillars 7.1 + SF-13 | spec | game-director | P2-F04-T01 | `design/features/F06-hp-damage-onboarding.md`, `design/pillars.md` | DONE | `design/features/F06-hp-damage-onboarding.md` (R01–R58), `design/pillars.md` 6.1/7.1–7.5/8/9 |
| P2-F06-T03 | F05, F06 | Flow F05 + F06 + wireframe: feedback tick/ของ, สรุป run, HP/auto-retreat/ตาย/ฟื้น, class, onboarding 0–10, pocket screen, จอไกล/นอกพื้นที่, consent/age gate, ลบข้อมูลในเครื่อง, Credits | spec | uiux-designer | P2-F06-T02, P2-F04-T15 | `design/ux/flows/F05-movement-gate-reward.md`, `design/ux/flows/F06-hp-damage-onboarding.md`, `design/ux/wireframes/F05-*.html`, `design/ux/wireframes/F06-*.html`, `design/ux/components.md`, `design/ux/ia.md` | DONE | `design/ux/flows/F05-movement-gate-reward.md`, `F06-hp-damage-onboarding.md`, wireframe F05-01..02, F06-01..05 · ปิด N-14 |
| P2-F06-T04 | F06 | Tech note F06: HP engine ใน session, class, onboarding state, จอไกล/นอกพื้นที่ | spec | tech-lead | P2-F06-T02, P2-F04-T14 | `docs/tech/F06-hp-damage-onboarding.md` | DONE | `docs/tech/F06-hp-damage-onboarding.md` (hit clock ร่วม ActiveClock, at<H, R-B1, HP anchor, kw.p2.* player/onboarding, home states, FH-01..16, vector survival 44.44 นาที) |
| P2-F06-T05 | F06 | VFX F06: HP ต่ำ, auto-retreat, ตาย, ฟื้น, เข้า dungeon/Grace + pose kit | build | vfx-animator | P2-F05-T05, P2-F06-T03 | `art/vfx/` | DONE | art/vfx: hp-bar (scaleX), hp-critical (hpLow/autoRetreat/death), run-state (Grace/Suspended/Resumed/confirmEnter), quick-command 10 qc.* · spec+demo ต่อ effect · ทุก module ≤ 20 KB |
| P2-F06-T06 | F06 | HP engine `src/hp/` + ต่อเข้า `src/session/`: การตี, damage, auto-retreat 25%, ยาอัตโนมัติจาก inventory ที่มาจาก drop, แจ้ง 30%, ตาย, ฟื้น | build | backend-programmer | P2-F06-T04, P2-F05-T01, P2-F06-T01, P2-F05-T08 | `packages/shared/src/hp/`, `packages/shared/src/session/` | DONE | packages/shared/src/hp/ (hit/attempt/heal/regen/stats/params), session: classId/hp/chooseClass/usePotion/processHits/selectPlayerView/readyIn_s, isCorruptPlayer · shared 590 test, D-020 MC ±2%, root 2354 |
| P2-F06-T07 | F04–F06 | Asset ถึง client: `tools/art`, validator V1–V13 + schema, font + OFL, hook เสียงใน root build, asset-delivery | build | tech-lead | P2-F05-T03, P2-F04-T05 | `tools/art/`, `art/fonts/`, `art/assets/manifest.schema.json`, `art/assets/manifest.build.json`, `docs/tech/asset-delivery.md`, `package.json` (script `build` เท่านั้น) | DONE | `tools/art/` (rasterize/quantize/sha256, validator V1–V13 ใน pnpm test, 35 test), `art/fonts/` (Plex Looped WOFF2 44/43 KB, Noto Sans Thai, OFL, SHA256SUMS), `docs/tech/asset-delivery.md`, root build = prebuild + build |
| P2-F06-T08 | F06 | Client F06: แถบ HP, แจ้ง 30%, auto-retreat, ยาอัตโนมัติ, จอตาย/ฟื้น, ตั้งค่า S-22 + token/component ของ P2-F04-T06 | build | gameplay-programmer | P2-F06-T06, P2-F06-T03, P2-F05-T09, P2-F05-T10, P2-F06-T30, P2-F04-T17, P2-F04-T06, P2-F06-T05 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` (ยกเว้น `apps/client/src/home/` ที่ P2-X27 ถือใน W8) | DONE | hp-bar, toast HP ต่ำ/ยาอัตโนมัติ, S-22 settings (auto-retreat confirm), S-11 inventory (ยาฟื้นทันที), event F06 + telemetry, BUG-P2-003 แก้, C2-1 requestOrigins, CSS z-index, แก้ clock ของ Mock provider · e2e 21/21 · root 2612 pass |
| P2-F06-T09 | F06 | Client: จอไกล / นอกพื้นที่ / นอกย่านเปิดตัว (ใช้ home-state ของ P2-X27) + consent + age gate 15+ (scaffold) + ต่อสาย Credits และลบข้อมูลในเครื่องที่มีอยู่ + telemetry empty screen | build | gameplay-programmer | P2-F06-T03, P2-F05-T09, P2-F05-T07, P2-F06-T07, P2-F04-T21, P2-F06-T30, P2-F04-T17, P2-X27, P2-H20, P2-F05-T04 | `apps/client/` (ยกเว้น `apps/client/package.json` และ `apps/client/src/onboarding/` ที่ P2-X28 ถือใน wave เดียวกัน), `config/app/client.json` | DONE | home-tracker ต่อ homeState (selectOpening, mask, D-127 tie-break, R55 เฉพาะโหลดล้ม), home-panel, role-info, S-09 interest-register 76 เขต (kw.p2.interest), telemetry empty screen + interest, แก้ onEnter render · lint/typecheck 0 · root 2720 pass · ยังไม่ทำ: จอ consent/age gate/S-23/settings menu → P2-X38 |
| P2-F06-T10 | F06 | Client: onboarding นาที 0–10 (รางวัลก้อนแรกจาก tick ปกติ · ใช้ตัวเดินขั้นของ P2-X28) + ล็อกระบบที่ห้ามสอน + (รับจาก P2-H03) route check-in reject no_class/no_hp ตามคำตัดสิน D-120 ใน P2-H20 | build | gameplay-programmer | P2-F06-T08, P2-F06-T09, P2-F05-T10, P2-F06-T03, P2-F06-T30, P2-F04-T17, P2-F04-T06, P2-X28, P2-H20, P2-F06-T05 | `apps/client/` (ยกเว้น `apps/client/package.json`, `apps/client/src/feedback/`, `apps/client/src/assets/icon-glyph.ts`, `apps/client/src/assets/icon-glyph.test.ts` ที่ P2-X29 ถือใน wave เดียวกัน), `config/app/client.json` | DONE | onboarding ครบ (Run 1 + ตรวจ Run 2): onboarding-flow.ts, storage/onboarding.ts, config/unlocks-teach-lock.ts, ui/intro-screen.ts, ui/class-select.ts, ui/run-tutorial-line.ts (N-3), clock/mock-offset-clock.ts (R2-01), client.json allowedOrigins (R2-02) · e2e ใหม่ apps/client/e2e/onboarding.spec.ts + fixtures/e2e-onboarding-01.trace.json ผ่าน android+ios · vitest client 710/710 · พบ full-run.spec.ts ไม่ pin start= (flake ตามเวลาจริง) → F06-T14 |
| P2-F06-T11 | F06 | Test plan F06 + TC-HUD-03..12 | spec | qa-tester | P2-F06-T02, P2-F04-T10 | `qa/plans/F06-test-plan.md`, `qa/tests/F02/` | DONE | `qa/plans/F06-test-plan.md` (39 case, checklist ห้ามสอน, script เดินของทีม F06-C32), `qa/tests/F02/hud-flag-gate.test.ts` TC-HUD-12 · qa/tests/F02 221 ผ่าน |
| P2-F06-T12 | F06 | Support matrix F-17 จากผล probe + เดินทดสอบ | research | tech-lead | P2-F04-T11, P2-C02 | `docs/tech/F06-device-capability.md` | TODO | — |
| P2-F06-T13 | F06 | cue-list + audio: fallback เมื่อไม่มี vibrate, priority queue ของ cue F05/F06 | build | sound-designer | P2-F06-T03, P2-F05-T06 | `audio/cue-list.md`, `audio/src/`, `audio/out/`, `audio/manifest.json` | DONE | cues.ts type fix, cue-list §4 priority queue (safety ชนะเสมอ) + fallback ไม่มี vibrate, manifest priority |
| P2-F06-T14 | F06 | Client: pocket screen + ต่อสาย Wake Lock / fire-together / priority queue จาก P2-X29 + telemetry Wake Lock/page hidden + (รับจาก P2-H14) ต่อสาย setIconGlyph กับ icon.ui.grace, icon.ui.closed, icon.ui.in-run | build | gameplay-programmer | P2-F06-T13, P2-F06-T10, P2-F06-T05, P2-F04-T17, P2-X29, P2-H13 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | ui/pocket-screen.ts (กฎ 8 ข้อ A 4.4, ปัดขึ้นค้างเพื่อออก, ทาง B toast), cue-visual.ts, icon-tone.ts, WakeLockController snapshot/onStateChange, telemetry wake_lock_state_changed + dungeon_exited page_hidden/wake_lock bucket, setIconGlyph ที่ run-bar/nav-panel · e2e pocket-screen.spec.ts 2 ทาง × 2 project · full-run.spec.ts pin start= · client e2e 42/42, vitest root 2831 pass, lint:config 0 error · D-134 PROPOSED · → H38 qa, H39 uiux |
| P2-F06-T15 | F06 | (รวมเข้า P2-F04-T10) code-split maplibre + งบ bundle | build | gameplay-programmer | — | — | CUT | รวมใน P2-F04-T10 |
| P2-F06-T16 | F06 | CI: ตรวจงบ bundle + bbox-vs-province (X39) | build | devops-engineer | P2-F04-T10, P2-F04-T23 | `.github/workflows/ci.yml`, `infra/scripts/` | DONE | ci.yml: measure-bundle ใน build-test + job map-bbox-guard (verify-bbox ไม่ข้าม) · infra/scripts/check-bbox.sh + test-bbox-guard.sh · actionlint, billing-guard ผ่าน · negative test ทั้งสอง |
| P2-F06-T17 | F06 | Black-box F06: เวลาอยู่รอด, auto-retreat, ตาย/ฟื้น, ยาจาก drop, รางวัลก้อนแรก, onboarding, จอไกล + event | build | qa-tester | P2-F06-T06, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T11 | `qa/tests/F06/`, `data/gps-traces/qa/`, `qa/bugs.md` | DONE | qa/tests/F06 7 ไฟล์ 31/31 pass (auto-retreat/ตาย/ฟื้น, survival เลเวล 1 ผ่าน sessionStep 10 seed, รางวัลแรก + teach-lock, home states trace replay, S-09 76 เขต, telemetry ไม่มีจำนวนคน, clearLocalData) + data/gps-traces/qa/qa-home-states-walk-01.trace.json · QA F02/F04/F05/F06 378 pass · BUG-P2-002 CLOSED · ไม่พบบั๊กใหม่ · → H36, H37 · สังเกต: pocketScreen.swipeUpMinDistance_px ไม่ผ่าน config-lint (งาน T14) |
| P2-F06-T18 | F04–F06 | ชุด playtest: script เดิน, safety briefing (รวม speed lock), แบบฟอร์มผู้สังเกต, ช่วงเวลาตาม Q-H3 | spec | qa-tester | P2-F06-T03, P2-F04-T15 | `qa/playtest/phase-2-kit.md`, `qa/playtest/phase-2-observer-form.md`, `qa/playtest/phase-2-parental-consent.md`, `qa/playtest/safety-briefing.md` | DONE | `qa/playtest/phase-2-kit.md` (PN-2 พระนคร, เช้า/เย็น + วันสำรองฝน), `phase-2-observer-form.md`, `phase-2-parental-consent.md`, safety-briefing Part B |
| P2-F06-T19 | F04–F06 | แบบสอบถาม + แผนวิเคราะห์ + proxy ของ north star | spec | product-manager | P2-F04-T02, P2-F06-T02, P2-F04-T17 | `product/playtest/phase-2-questionnaire.md`, `product/playtest/phase-2-plan.md` | DONE | `product/playtest/phase-2-questionnaire.md`, `phase-2-plan.md` (เกณฑ์ PASS/FIX-FIRST/ESCALATE ล็อกก่อนเห็นผล, north star proxy) |
| P2-F06-T20 | F06 | Tech gate F06 (HP engine, session, client F06, pocket screen, bundle, asset delivery) | review-gate | tech-lead | P2-F06-T06, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F06-T07, P2-F04-T10, P2-F06-T16, P2-X27, P2-X28, P2-X29, P2-X31, P2-X38, P2-X39, P2-X41, P2-X44, P2-H45, P2-X45 | `docs/reviews/F06-tech-gate.md` | DONE | tech gate F06 PASS (รอบ 2) · docs/reviews/F06-tech-gate.md R2 · TG-01..06 ปิด + TG-07/08/09/10/13/14 ปิด · TG-11 → X47, TG-15 → backlog Phase 3 · tsc/eslint/prettier/lint:config/lint:copy/vitest 3023/build/bundle 116.9 KB/e2e 50/50 ผ่านบน b1dee22 · A-P2-X41-2 รับแบบมีเงื่อนไข (canClear ต้องเป็น required ใน X47) · R2-N1 → T21 |
| P2-F06-T21 | F06 | QA gate F06 | review-gate | qa-tester | P2-F06-T20, P2-F06-T17, P2-F05-T16, P2-X38, P2-H38, P2-X39, P2-X41, P2-X48, P2-X50, P2-X51 | `qa/reports/F06-qa-gate.md`, `qa/bugs.md` | DONE | QA gate F06 PASS · qa/reports/F06-qa-gate.md · spec 18/18, E6/E8(QA)/E11/E16 PASS · test ใหม่ no_class/no_hp ผ่าน confirm, tie-break 3A, export มี run_gps_status_changed + onboarding_first_reward_granted, toast ≤ 2 บรรทัดบน S-03-run 360 px · แก้ต้นเหตุ flake f02 (ขาด e2eSkipOnboarding หลัง X38) · canClear ใน integration test · root vitest 3065, e2e 92/92 · ไม่มีบั๊กเปิด · F06-C32 เดินทีมเป็น HUMAN → H56 |
| P2-F06-T22 | F06 | Content gate (copy) F06 รวมสามจังหวะ | review-gate | narrative-designer | P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F05-T17, P2-X32, P2-X38, P2-X40, P2-X41 | `design/reviews/F06-copy-gate.md` | DONE | copy gate F06 PASS (รอบ 2) · design/reviews/F06-copy-gate.md §9 · C6-01..05 ปิดครบพร้อมภาพ 360 px · สามจังหวะไม่เปลี่ยนถ้อยคำ (E7) · lint:copy 0 FAIL · ไม่บล็อก N2-02 → X47, N2-04/05 → F06-T21 · PDPA sign-off ยังเป็นของคน (Q-P2-13) |
| P2-F06-T23 | F04–F06 | Content gate (visual) F04–F06 | review-gate | art-director | P2-F04-T21, P2-F05-T10, P2-F06-T08, P2-F06-T09, P2-F06-T10, P2-F06-T14, P2-F05-T07, P2-F05-T04, P2-F06-T05, P2-H15, P2-H17, P2-X26, P2-H19, P2-X38, P2-H39, P2-X42, P2-H41, P2-X41, P2-X52, P2-H53, P2-H54, P2-H55 | `art/reviews/F04-F06-visual-gate.md` | DONE | visual gate F04–F06 PASS (รอบ 3 · D-140) · art/reviews/F04-F06-visual-gate.md §8 · R2-1..R2-5, V-30, V-43, V-44, V-45 ปิด · 12-hp-low รับเป็นหลักฐาน · 09b ถ่ายใน gate ถัดไปเมื่อ trace H57 มา · ไม่มีตำแหน่งคนอื่น/เส้นทาง |
| P2-F06-T24 | F06 | Design gate F06 + regression F04/F05 | review-gate | game-director | P2-F06-T21, P2-F06-T22, P2-F06-T23, P2-F05-T18, P2-H20, P2-X53, P2-H58 | `design/reviews/F06-design-gate.md` | DONE | design gate F06 PASS (รอบ 2) · design/reviews/F06-design-gate.md R2 · DG6-01..04 ปิด · DG6-05 เปิดใน X47 (ถ้าเป็นตำแหน่งกระโดดกลับ GD ก่อน playtest) · loop พร้อม playtest ฝั่ง design |
| P2-F06-T25 | F04–F06 | Product gate F04–F06 (checklist เต็ม + หลักฐาน E8) | review-gate | product-manager | P2-F06-T24, P2-F06-T21, P2-F04-T17, P2-F04-T02, P2-H50, P2-X50, P2-X54 | `product/reviews/F04-F06-product-gate.md` | DONE | product gate F04–F06 PASS · product/reviews/F04-F06-product-gate.md · คำถาม playtest ทุกข้อมีแหล่งข้อมูลใน build · ตรง H50 (mapping X48 ยืนยัน) · export ใช้ได้ไม่มีพิกัด · E8, E17, PM-S2, PM-M2 ยืนยัน |
| P2-F06-T26 | F04–F06 | HUMAN: deploy build playtest ผ่าน deploy-preview + smoke บน Android + iPhone | build | HUMAN | P2-F05-T16, P2-F06-T21, P2-C05, P2-F05-T14, P2-F06-T12, P2-X50, P2-X51, P2-X54 | — | HUMAN | — · (O-14) ถ้ามี commit ใหม่ใน apps/client/ หลัง smoke orchestrator แจ้ง SHA ใหม่ → คนรันขั้น 1–2 ซ้ำก่อน T27 |
| P2-F06-T27 | F04–F06 | HUMAN: playtest เดินจริงอย่างน้อย 3 คน + แบบสอบถาม | research | HUMAN | P2-F06-T26, P2-F06-T18, P2-F06-T19, P2-F06-T24, P2-F06-T25 | `product/playtest/results/` (คนกรอก ไม่ระบุตัวคน) | HUMAN | — |
| P2-F06-T28 | F04–F06 | Playtest report: loop สนุกพอไปต่อ หรือรายการที่ต้องแก้ | spec | product-manager | P2-F06-T27 | `product/playtest/phase-2-playtest-report.md` | TODO | — |
| P2-F06-T29 | F04–F06 | HUMAN: ยอมรับข้อสรุป playtest (ไป Phase 3 / แก้ก่อน) | review-gate | HUMAN | P2-F06-T28 | — (orchestrator บันทึกใน decision log) | HUMAN | — |
| P2-F06-T30 | F05, F06 | อนุมัติ flow F05 + F06 (core loop) ก่อน build | review-gate | game-director | P2-F06-T03, P2-X11 | `design/reviews/F05-F06-flow-approval.md` | DONE | `design/reviews/F05-F06-flow-approval.md` รอบ 2 PASS · เศษ R2-F1..F5 ต้องปิดก่อน F06-T24 · J-P2-T30-2..4 |
| P2-CLOSE-QA | ปิด phase | Regression ปิด Phase 2 | review-gate | qa-tester | P2-C06, P2-F04-T09, P2-F04-T18, P2-F04-T23, P2-F05-T16, P2-F05-T17, P2-F05-T18, P2-F05-T19, P2-F06-T16, P2-F06-T21, P2-F06-T22, P2-F06-T23, P2-F06-T24, P2-F06-T25, P2-F06-T28, P2-H08, P2-H16, P2-H17, P2-H18, P2-H19, P2-H20, P2-X26, P2-X27, P2-X28, P2-X29, P2-X30, P2-X31, P2-X32, P2-X33, P2-F06-T20, P2-F06-T12, P2-C03, P2-C04, P2-F05-T12, P2-F05-T13, P2-X41, P2-H41, P2-H42, P2-H46, P2-H49, P2-H50, P2-H21..P2-H40, P2-H43..P2-H45, P2-H47, P2-H48, P2-X34..P2-X40, P2-X42..P2-X45 (+ X46..X49 ถ้าเปิด), P2-X48, P2-X50, P2-H57, P2-X54 | `qa/reports/phase-2-regression.md`, `qa/bugs.md` | TODO | — · (plan-sync W7) ถ้า P2-H08 ถูก CUT ตาม O-41 ถือว่าผ่านตามกติกา deps ที่เป็น CUT · (จาก H37) ส่ง metadata + จุดประสงค์ของ trace ใน data/gps-traces/qa/ ที่ยังไม่อยู่ใน README 6.1 (qa-gate-*, qa-e2e-*, qa-gps-jump-01) ให้ location ผ่าน handoff · (O-07) ก่อน dispatch orchestrator ตรวจว่าทุกแถวยกเว้น P2-C07, P2-C08, P2-F06-T29, P2-CLOSE-PM เป็น DONE/CUT · (จาก H56) ปิด precondition ของ F06-C32 ใน qa/plans/F06-test-plan.md §8 ด้วย dungeon จาก design/levels/F06-C32-team-walk-dungeon.md · interim Run 2 (2026-09-30): qa/reports/phase-2-regression.md · ฝั่ง agent ครบ · test 3113, e2e 106/106, tiles 71, vector/trace --check, gitleaks 44 commit สะอาด, bundle 0.119/1 MB · ไม่มีบั๊ก OPEN · รันจริงอีกครั้งหลังงานสนาม · (จาก H61 ไม่บล็อก) ปัด lat/lng เป็น 5 ตำแหน่งใน qa-gate-bench-jitter-01, qa-gate-still-01, qa-gate-speedlock-01 + เพิ่ม generator ให้ qa-gps-gap-2min, qa-gps-jump-01 แล้วแจ้ง location อัปเดต §6.1 |
| P2-CLOSE-PM | ปิด phase | รายงานปิด Phase 2 | plan | producer | P2-CLOSE-QA, P2-F06-T29, P2-C08 | `studio/phases/phase-2/report.md`, `studio/phases/phase-2/board.md` (สถานะเท่านั้น) | TODO | — |
| P2-H01 | F06 | (handoff จาก P2-F06-T02) geometry ย่านเปิดตัว 3 เขต (`data/map/launch-area.geojson`) + เสนอ key `unlocks.home.seeLaunchAreaMask` ให้ systems | build | location-engineer | P2-F06-T02, P2-F04-T12 | `data/map/launch-area.geojson`, `tools/coverage/` (สคริปต์สร้าง) | DONE | `data/map/launch-area.geojson` (3 เขต, 2.4 KB, 65 vertex), `tools/coverage/boundaries/launch.py` + source + --check ใน pnpm test, gps-traces README แถว driving |
| P2-X01 | F04–F06 | (handoff จาก P2-F05-T03) contrast.test.ts: จำนวนแถว color 41→42, ramp 10→11, เพิ่มคู่ตาม brief 4.1, รัน contrast + map-style test ให้เขียว | fix | qa-tester | P2-F05-T03, P2-F04-T06 | `qa/tests/unit/contrast.test.ts`, `qa/tests/unit/map-style.test.ts` | DONE | `qa/tests/unit/contrast.test.ts` (regex ramp กว้างขึ้น, 42/23 แถว, +14 คู่จาก brief 4.1) · qa/tests 499 ผ่าน |
| P2-X02 | F04 | (fix จาก gate P2-F04-T27 รอบ 1) แก้ B-01..B-08 + N-01..N-15 ใน flow F04 + wireframe F04-01..04 ตาม `design/reviews/F04-flow-approval.md` · ใส่หมายเหตุหัว F03-core-loop.md ชี้มาที่ flow F04 (J-1) | fix | uiux-designer | P2-F04-T27, P2-F04-T06 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/F04-*.html`, `design/ux/flows/F03-core-loop.md` | DONE | flow F04 + wireframe F04-01..04 แก้ B-01..B-08, N-01..N-15 (N-14 defer) · ตาราง "รอบ 2" หัวข้อ 12 |
| P2-X03 | F04, F05 | (handoff จาก P2-F05-T20) geo: hysteresis ย้อนไปที่ sample ฝั่งตรงข้ามตัวแรก (รวมในแถบ) และช่องว่าง > maxSamplePairGap_s ล้างชุดที่รอยืนยัน · เพิ่มเงื่อนไขคู่ pairSpeed ≤ speedLock_kmh ใน gridStep (drift-spike ต่าง 51.5 ม.) · fixture outlier 60, hysteresis 6/5 ม. · ขยาย trace driving-40kmh ให้เห็นการปลดล็อก · + fixture tools/dungeons drop_table_id → largeParkDefault/marketDefault/pocketParkDefault | fix | location-engineer | P2-F05-T20, P2-F04-T12 | `packages/geo/`, `data/gps-traces/synthetic/`, `tools/dungeons/test/` | DONE | geo D-103/D-104 (edgeHysteresisFeed/DropStale), speed-lock pair rule, pause-point resume · ตรงกับ reference 16 gateWindows + 8 hysteresis · driving trace 520 วิ · tools/dungeons fixture camelCase · 320 test |
| P2-X04 | F04, F05 | (handoff จาก P2-F05-T20) แก้ tech note F04 5.2 (hysteresis ยืนยันเมื่อครบทั้งสองเงื่อนไข, ย้อนไป sample ฝั่งตรงข้ามตัวแรก, ช่องว่างล้างชุดรอยืนยัน) และ F05 หัวข้อ 6 (ตอนปิด หน้าต่างที่ end tau ≤ tau(endAt) ตัดสินปกติ, endAt หยุดนาฬิการะยะ) · + (จาก P2-F04-T24) ADR 0001 3.10.3 เพิ่ม suffix _min/_deg, ข้อยกเว้น Exponent/IoU/Share, การสืบ _source 1 ชั้น, names.<locale>.json แล้วลบ allowlist ที่เกี่ยว · tech note F04 10.3 เตือน→error · `.prettierignore` config/ → /config/ · root script dungeons:build, lint:config | fix | tech-lead | P2-F05-T20, P2-F04-T14 | `docs/tech/F04-dungeon-presence.md`, `docs/tech/F05-movement-gate-reward.md`, `docs/adr/0001-repo-layout.md`, `tools/config-lint/allowlist*`, `.prettierignore`, `package.json` (scripts เท่านั้น), `packages/shared/schemas/config/app/client.schema.json` | DONE | tech note F04 5.2/10.3/13.2, F05 §6, ADR 0001 3.10.3/3.10.4, .prettierignore /config/, root scripts lint:config + dungeons:build · schema client.json ถูกปฏิเสธสิทธิ์ → P2-X07 |
| P2-X05 | F02 | (handoff จาก P2-F04-T24) เติม gateWindowsPassFiltered, gateWindowsPassFilteredPct, stationary5MinAccumFilteredM ใน FULL_ROW ของ qa/tests/F02/hud-panel-blackbox.test.ts:173 ให้ typecheck ผ่าน | fix | qa-tester | P2-F04-T24 | `qa/tests/F02/` | DONE | `qa/tests/F02/hud-panel-blackbox.test.ts` เติม 3 field · qa/tests/F02 161 ผ่าน |
| P2-X06 | F05, F06 | (handoff จาก P2-F04-T24) เปลี่ยนชื่อ key ให้ตรง ADR 0001 3.10.3/3.10.6: anticheat offlineEvidence.trustWeightVsLive→…Mult · economy partyReward.fullPartyPerHeadToSolo{Min,Max}→…Ratio · equipment gearStat.enhanceBonusPerLevel→…Coef, slots.*.vitPointsPerGearStat→…Coef · raid bossHp.alphaLaunch/alphaTarget→…Coef · unlocks home.seeOutOfAreaMask→outOfAreaMaskPath · อัปเดตตัวอ่านใน tools/sim · แจ้ง tech-lead ลบ allowlist + แก้ schema · + (จาก P2-F04-T20/X04) check-in.json [11] walk-in: ย้ายจุดข้ามออกจากขอบ polygon พอดี หรือยอมรับกฎ on-edge = inside ของ geo (123000) · prettier tools/sim/src/vectors.ts · อัปเดต fixture drop_table_id camelCase ถ้าจำเป็น | fix | systems-designer | P2-F05-T01 | `config/balance/anticheat.json`, `config/balance/economy.json`, `config/balance/equipment.json`, `config/balance/raid.json`, `config/balance/unlocks.json`, `tools/sim/`, `design/systems/test-vectors/`, `data/gps-traces/synthetic/` (เฉพาะ walk-in ถ้าเลือกแก้ trace) | DONE | เปลี่ยนชื่อ 11 key ใน 5 ไฟล์ + reader ใน tools/sim · sim point-in-polygon นับขอบเป็นข้างใน (check-in[11] = 123000) · vector 371 ผ่าน |
| P2-X07 | F04–F06 | (ต่อจาก P2-X04) `packages/shared/schemas/config/app/client.schema.json`: speed→speedMult, engine required [tickInterval_ms, seeUtcOffset] + pointer · `tools/config-lint/src/units.ts` เพิ่ม min, deg แล้วลบ allowlist 3 รายการ · ต้องได้สิทธิ์จากคน (แก้ schema ถูกปฏิเสธ 'Modify Shared Resources') · + (จาก P2-X06) schema balance 11 key ที่เปลี่ยนชื่อ (anticheat/economy/equipment/raid/unlocks) + ลบ allowlist STALE 9 รายการ · ตัวอย่าง drop_table_id ใน tech note F04:559 | fix | tech-lead | P2-X04 | `packages/shared/schemas/config/app/client.schema.json`, `tools/config-lint/src/units.ts`, `tools/config-lint/src/allowlist.ts`, `packages/shared/schemas/config/balance/`, `docs/tech/F04-dungeon-presence.md` (ตัวอย่าง drop_table_id) | DONE | client.schema.json speedMult/seeUtcOffset, balance schema 5 ไฟล์ rename, units.ts min/deg, allowlist ว่าง · config-lint 0 error 0 stale |
| P2-X08 | F04 | (จาก gate P2-F04-T27 รอบ 2) เงื่อนไข C-1..C-5: ปุ่มยกเลิกใน F04-02 B1/B5 และ F04-03 C1/C2, nav.returnBeforeArrive ใน A3, caption C1 ตาม N-03, เลิกใช้ emoji รูปกุญแจ, ย้าย key offline 10.2 เป็น 'สงวนไว้ Phase 3', ตั้งชื่อแบนเนอร์ Suspended ร่วมกับ art · + (จาก P2-F06-T03, blocking design gate F06-T24) F04-04 เฟรม F3 เพิ่ม run.summary.diedBody · 06-settings-autoretreat.html E2 ลบแถวยาอัตโนมัติที่ปรับได้ · F04-02 เพิ่ม dungeon.confirmLowHpNote / run.autoRetreatOffBadge | fix | uiux-designer | P2-F04-T27, P2-F06-T03 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/F04-*.html`, `design/ux/wireframes/06-settings-autoretreat.html` | CUT | รวมเข้า P2-X11 (uiux คนเดียว ไฟล์ทับกัน) |
| P2-X09 | F05, F06 | (J-8 / D-112) เขียนสูตร Z ใหม่ใน balance-model (clamp เลเวลผู้เล่นเข้าช่วง) + tools/sim + regen vector damage/exp/run-loop + รัน R43 ทุกช่วงนำร่อง + รายงาน exp/ชม. ของเลเวลสูงในช่วงกว้าง · เสนอเพดานเวลาชุดรอยืนยัน (J-9, ก่อน Phase 3) | spec | systems-designer | P2-F04-T27 | `design/systems/`, `tools/sim/`, `config/balance/combat.json` | DONE | combat.json zoneLevelFrom = playerLevelClampedToRange, tools/sim zone.ts, vector damage 70/tick-reward 32/run-loop 30, balance-model §18 (D-112) §19 (J-9 pendingSetMax_s 90) · R43 ผ่านทุกช่วงที่รับเลเวล 1 |
| P2-X10 | F05, F06 | (J-8 / D-112 + ส่วนที่ขาดของ P2-F05-T08) zoneLevel(playerLevel, min, max) + ผู้เรียก + engine ล้มถ้า zoneLevelFrom ไม่ใช่ playerLevelClampedToRange · session: backdating เต็ม (F04 R14/R15, F05 3.5 scratch accumulator), ต่อ opening hours / dungeon_closed / closing soon, toPersisted/fromPersisted + selectors (tech note F04 2.1/2.6) · ลบ correction ใน src/run/hysteresis.ts ใช้ geo edgeHysteresisFeed · ผ่าน run-state [32]–[35] | fix | backend-programmer | P2-X09, P2-F05-T08 | `packages/shared/src/formulas/`, `packages/shared/src/reward/`, `packages/shared/src/session/`, `packages/shared/src/run/` | DONE | zoneLevel clamp + guard, run/hysteresis ใช้ geo, run-timeline R15 ข้อ 7, session: scratch accumulator F05 3.5, opening hours, persistence + selectors, S-1/S-2, purgeLocationData · shared 508 test, root 2211 ผ่าน |
| P2-X11 | F04–F06 | (fix จาก gate P2-F06-T30 รอบ 1 + รวม P2-X08) แก้ B-01..B-06 + N-01..N-10 ของ `design/reviews/F05-F06-flow-approval.md` และ C-1..C-5 + wireframe เดิม 3 ไฟล์ของ X08 · เพิ่มตาราง 'รอบ 2: สิ่งที่แก้' | fix | uiux-designer | P2-F06-T30, P2-F04-T27 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/flows/F05-movement-gate-reward.md`, `design/ux/flows/F06-hp-damage-onboarding.md`, `design/ux/wireframes/F04-*.html`, `design/ux/wireframes/F05-*.html`, `design/ux/wireframes/F06-*.html`, `design/ux/wireframes/06-settings-autoretreat.html` | DONE | flow F04/F05/F06 + wireframe 11 ไฟล์ แก้ B-01..B-06, C-1..C-5, K-11, N · ตาราง รอบ 2/3 |
| P2-X12 | F04–F06 | (จาก P2-F04-T10) เพิ่ม suffix `_bytes` ใน tools/config-lint/src/units.ts + ตาราง ADR 0001 3.10.3 (bundle.initialJsBudget_bytes, mapLazyJsBudget_bytes) · combat.schema.json zoneLevelFrom enum [playerLevelClampedToRange] (จาก P2-X09) | fix | tech-lead | P2-F04-T10, P2-X09 | `tools/config-lint/src/units.ts`, `docs/adr/0001-repo-layout.md`, `packages/shared/schemas/config/balance/combat.schema.json` | DONE | units.ts _bytes (+ ตรวจ integer ≥0), ADR 0001 3.10.3, combat.schema zoneLevelFrom enum · config-lint 0 error · ยืนยัน signature zoneLevel + D-115 |
| P2-X13 | F04, F05 | (จาก P2-X03) regen speed-lock.json [6][7] (driving trace ใหม่มีการปลดล็อกที่ 400 วิ) + แก้ note ใน tools/sim/src/vectors-presence.ts ~542 · ยืนยัน A-P2-X03-3 (edgeHysteresis_m = 0 นับจุดบนขอบ) · อัปเดต key ชื่อเก่าใน balance-model.md:443 · P-4 vector ขากลับเกิน graceMax_s | fix | systems-designer | P2-X03 | `design/systems/`, `tools/sim/` | DONE | speed-lock.json [6][7] exit 400000, run-state.json +4 ([32] ขอบ d=0, [33]–[35] P-4), presence.ts d=0 ตรง geo, balance-model 19.4/19.5 |
| P2-X14 | F05, F06 | (จาก gate P2-F06-T30 รอบ 2 + P2-F05-T09) R2-F1 wireframe F06-03 C6 · R2-F2 ร่าง run.summary.died = 'HP หมด' · R2-F3 ปุ่มยาฟื้น inventory.useRevivePotionButton · R2-F4 onboarding สายไกลระบุ dungeon ปลายทางของระยะ · N-10 ia.md 3.4/6 ตัด npcShop + หมายเหตุหัว F03 → F06 · nav.approximateDistancePrefix → nav.distanceApprox, ตัด credits.osmAttribution · ต้องปิดก่อน P2-F06-T24 · ตรวจ flow F06 A7/F1 ครอบ R37 ข้อ 2 (ไม่มี dungeon เปิดที่ครอบเลเวล → ไกลชั่วคราว + เวลาเปิดถัดไป, A-P2-X15-1) | fix | uiux-designer | P2-F06-T30, P2-F05-T09 | `design/ux/flows/F05-movement-gate-reward.md`, `design/ux/flows/F06-hp-damage-onboarding.md`, `design/ux/flows/F03-core-loop.md`, `design/ux/ia.md`, `design/ux/wireframes/F04-*.html`, `design/ux/wireframes/F05-*.html`, `design/ux/wireframes/F06-*.html` | DONE | flow F06/F05/F03, ia.md override npcShop, wireframe F06-03 C6/C7/C8, F04-04, F05-02, F06-05 credits · ตาราง รอบ 3 |
| P2-X15 | F04, F06 | (จาก gate F04 รอบ 2 + F05/F06 รอบ 1–2) แก้ spec F06-R37 ตาม K-11, F06-R48 ตาม J-P2-T30-1 (ถอน consent ระหว่าง run จบทันทีเก็บของครบ), F04-R15 ข้อ 1 'และ/หรือ' → 'และ' (J-9) | fix | game-director | P2-F06-T30 | `design/features/F04-dungeon-presence.md`, `design/features/F06-hp-damage-onboarding.md` | DONE | spec F06 R37 (K-11), R48 (ถอน consent), F04 R15 ข้อ 1/2/6/7 · change log |
| P2-X16 | F06 | (จาก gate + narrative) tech note F06 ส่วนถอน consent ตาม B-06 (manual_exit เก็บของครบ ไม่ผ่าน Grace) + ยืนยัน J-P2-T30-4 · ไฟล์ข้อมูล credits (OSM ODbL, ฟอนต์ OFL, WorldPop CC BY ถ้าใช้) · ยืนยัน engine ให้เวลาที่เหลือถึง HP 50% · infra/README.md ตาราง script | fix | tech-lead | P2-F06-T30, P2-F05-T09 | `docs/tech/F06-hp-damage-onboarding.md`, `config/content/credits.json`, `infra/README.md` | DONE | tech note F06 8.4 ถอน consent (exit เดิม = manual_exit), 6.2 timeLeft, §15 ตรวจ J-P2-T30-4 พบ S-1/S-2 · `config/content/credits.json` · infra/README.md · schema credits → P2-X18 |
| P2-X17 | F04, F06 | (J-P2-T30-4 / J-P2-T30-3) vector 3 ข้อของการกลับหลัง no_evidence (ในแถบ 5 ม., sample แรกอยู่นอก, นอกเกิน suspendedMax_s) · key จำนวน run ที่เก็บในเครื่องถ้ายังไม่มี · + (จาก P2-X16 §15) รวมกรณีออกก่อนแล้วกลับน้อยกว่า N sample และกลับเฉพาะในแถบ | spec | systems-designer | P2-F06-T30 | `design/systems/`, `tools/sim/`, `config/balance/dungeons.json` (runState เท่านั้น) | DONE | tools/sim runTimeline ตาม F04 R15 ข้อ 7, run-state [36]–[43], `runState.pastRunSummariesKept` = 10, balance-model §20 |
| P2-X18 | F06 | (จาก P2-X16) เพิ่ม `packages/shared/schemas/config/content/credits.schema.json` (ร่างอยู่ที่ /tmp/kw-x16/credits.schema.json ตรวจแล้ว) ให้ config-lint กลับมาเขียว | fix | tech-lead | P2-X16 | `packages/shared/schemas/config/content/credits.schema.json` | DONE | `packages/shared/schemas/config/content/credits.schema.json` · config-lint 0 error |
| P2-X19 | F06 | typecheck ตกที่ qa/tests/F02/hud-flag-gate.test.ts:58 (ไฟล์ใหม่ของ P2-F06-T11) แก้ให้ root typecheck ผ่าน | fix | qa-tester | P2-F06-T11 | `qa/tests/F02/` | DONE | qa/tests/F02/hud-flag-gate.test.ts narrow type · typecheck ผ่านทั้ง repo · F02 222 ผ่าน |
| P2-X20 | F06 | (จาก P2-H01) ตั้ง `unlocks.home.launchAreaMaskPath` = data/map/launch-area.geojson · ตัดสินรายชื่อเขตของจอลงทะเบียนความสนใจ (76 เขตนอกย่านเปิดตัวจาก district-counts.csv) และ {areaName} ของ home.outsideLaunchBody: (ก) ส่ง geometry ทุกเขต (ข) เลิกระบุชื่อเขตที่ผู้เล่นยืน — ตัดสินร่วม game-director | spec | systems-designer | P2-H01 | `config/balance/unlocks.json` | DONE | `unlocks.home.launchAreaMaskPath` + balance-model §21 ข้อเสนอ (76 เขต; แนะนำทาง ข ก่อน, ทาง ก ถ้ามีเวลา) · (plan-sync W7) game-director ตัดสินใน P2-H20 แทน F06-T24 |
| P2-X21 | F04 | (ต่อจาก P2-F04-T21) สลับ adapter 3 ตัวไปใช้ของจริงจาก P2-X10 (toPersisted/fromPersisted, selectCheckInPreview, opening hours ใน session) แล้วลบ port ฝั่ง client · โหลด asset ตาม asset-delivery.md §6 (asset-manifest, @font-face, เสียงตาม cue id, credits.json) · ชื่อไอเทม/กรอบ rarity ในหน้าสรุป · countdown readyIn_s · แก้ e2e dungeon-labels ที่ยังคาด kw-rift-count (ตัดตาม D-089) · regen balance subset | fix | gameplay-programmer | P2-F04-T21, P2-X10 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | adapter สลับของจริง + assets runtime (manifest/parts avatar lazy/fonts/icon/audio core), ชื่อไอเทม+กรอบ rarity, countdown, credits, Vite /kw/ dev+preview + copy dist/kw · client 449 pass |
| P2-X22 | F04–F06 | ยืนยัน whitelist ใหม่ของ client (drops.dropTables, drops.items, economy.npcSellPrice_gold) + แก้ตาราง tech note F04 §15.1 · `apps/client/package.json` scripts dev/build รัน tools/art prebuild ก่อน · เพิ่ม audio/src ใน root tsconfig include · แยก art/assets/manifest.json ตาม root (V13) | fix | tech-lead | P2-F04-T21 | `docs/tech/F04-dungeon-presence.md`, `apps/client/package.json`, `tsconfig.json`, `docs/tech/asset-delivery.md`, `tools/art/` | DONE | whitelist ยืนยัน + tech note §15.1, apps/client scripts prebuild, tsconfig include audio/src, tools/art manifest แยกต่อ root (split-manifest) · cues.ts:55 type error → sound F06-T13 |
| P2-X23 | F06 | (จาก P2-F06-T19 + T06 audio) telemetry-events.md: เพิ่ม no_class, no_hp ใน checkin_rejected.reason · ประกาศ location_consent_withdrawn { during_run } · ชื่อ event ของ qc.sent/qc.received/dungeon.closedOrOutOfRange (หรือระบุว่าไม่มี) | spec | product-manager | P2-F06-T19 | `product/telemetry-events.md`, `product/metrics.md` | DONE | telemetry-events: checkin_rejected 9 reason, location_consent_withdrawn, cue audio ไม่มี event · metrics §3.3 |
| P2-X24 | F04–F06 | (จาก P2-F05-T04) งบ runtime asset-manifest.json 30 KB ไม่พอเมื่อ build อวตารครบ (37,779 B) → ตัดสินงบใหม่หรือลดสิ่งที่ stage (เช่น เฉพาะ variant ที่ใช้) ให้ stage.test ผ่าน · root build script = `pnpm -r --if-present run build` (prebuild ที่เดียว) | fix | tech-lead | P2-F05-T04 | `tools/art/`, `docs/tech/asset-delivery.md`, `package.json` (script build เท่านั้น) | DONE | avatar แยกเป็น runtime part lazy (asset-manifest 24.3 KB, part 13.6 KB), V13 ต่อไฟล์, root build = pnpm -r build (prebuild ครั้งเดียว), cli stage --out resolve |
| P2-H02 | F04 | (handoff จาก P2-X21, privacy) `toPersisted` ใน packages/shared/src/session/persistence.ts ยังเขียน `latestSample` (พิกัดจริง) ลง localStorage ขัด tech note F04 10.1 — ตัดออก + test ว่า persisted state ไม่มีพิกัด | fix | backend-programmer | P2-F06-T06 | `packages/shared/src/session/persistence.ts`, `packages/shared/src/session/persistence.test.ts` | DONE | stripCoordinates ใน toPersisted/fromPersisted: latestSample, lock.lastAccurate, reward/rewardScratch filter+grid · persistence.test.ts 5 test · shared 595 |
| P2-H03 | F04 | (handoff จาก P2-X21) e2e dungeon-labels flaky (~1/4-8) เพราะ refreshMapDungeons ของ f04App ทับ fixture — เพิ่ม e2e query flag ข้ามการสร้าง f04App เมื่อ spec ต้องการแค่ map spike · หลังแก้ ให้ apps/client/src/session/persist.test.ts คาดว่าไม่มี latestSample (หลัง P2-H02) | fix | gameplay-programmer | P2-X21, P2-H02 | `apps/client/` (ยกเว้น `apps/client/package.json`) | CUT | (plan-sync W7 O-01, O-02) CUT แบบรวมงาน: ส่วน test (persist.test, e2e flag, preview dist/kw) รวมใน P2-F05-T10 · ส่วน route no_class/no_hp รวมใน P2-F06-T10 · ข้อความเดิม: (จาก H04) confirm reject no_class/no_hp ต้อง route เข้าบรรทัดสถานะ (preview ไม่คืน 2 เหตุผลนี้) · key ไม่เปลี่ยนชื่อ · no_class เปิด S-00-class-select ตาม N-01 (รอ H09/D-120 สำหรับ no_hp) · (จาก H12) configurePreviewServer เสิร์ฟจาก dist/kw/ แทน tools/art/out/client/ ให้ e2e ตรวจ closeBundle copy ด้วย · ห้ามใส่ Cache-Control ใน middleware |
| P2-H04 | F06 | (handoff จาก P2-X21) copy key สำหรับ check-in reject ใหม่ `no_class`/`no_hp` (D-114) — ตอนนี้ client ใช้ placeholder `dungeon.checkinNoClass`/`dungeon.checkinNoHp` | copy | narrative-designer | P2-F04-T21 | `config/content/copy.th.json` | DONE | dungeon.checkinNoClass (30 ช่อง), dungeon.checkinNoHp (25 ช่อง) · copy/config lint 163 pass (orchestrator รัน) · ขัด flow F06 §9 N-01 → H09 |
| P2-H05 | F04–F06 | (handoff จาก P2-X21) ตัดสินวิธี render icon.ui.* ที่ใช้ currentColor (pill สถานะ components.md 13.2): inline SVG หรือ `<img>` + variant สี — ระบุใน components.md ร่วม art-director | spec | uiux-designer | P2-F04-T21 | `design/ux/components.md` | DONE | components.md §13.9: inline SVG เฉพาะ icon.ui ที่ tintable, ที่เหลือ <img> · ตาราง tone→token, a11y · handoff H13/H14/H15 |
| P2-H06 | F04 | (handoff จาก P2-F04-T23) เพิ่ม `"@keep-walking/geo": "workspace:*"` ใน tools/traces/package.json + lockfile แล้วเปลี่ยน import `../../../packages/geo/src/index` → `@keep-walking/geo` ใน tools/traces/src/{geo,metrics,config,generator.test}.ts · ยืนยัน A-P2-F04-T23-1/3 | fix | tech-lead | P2-F04-T23 | `tools/traces/package.json`, `tools/traces/src/`, `pnpm-lock.yaml` | DONE | tools/traces ใช้ @keep-walking/geo (workspace), lockfile +3 บรรทัด · ยืนยัน A-T23-1/3 · verify-bbox ผ่าน |
| P2-H07 | F04 | (handoff จาก P2-F04-T23, คำขอ qa) เพิ่ม `building=civic`, `location=roof` ใน `config/balance/dungeons.json` coverageFilter.reviewFlagTags (config-lint ผ่าน) — rerun coverage ภายหลังโดย location | spec | systems-designer | P2-F04-T23 | `config/balance/dungeons.json` | DONE | reviewFlagTags + civic_building, rooftop · config-lint 58, coverage pytest 291 · output coverage ยังไม่ rerun → H11 |
| P2-H08 | F02 | (handoff จาก P2-F04-T23) จับภาพ S2/S5/S6 จาก tools/tiles/fixtures/screens/ เพื่อปิดข้อจำกัด P1-H06 / P2-F04-T09 5.3 · qa-builder ใช้ TraceHeader kind:'qa' · (ถ้าสะดวก) ส่ง loadTraceConfig() ให้ gateWindows แทน options เก่า | test | qa-tester | P2-F04-T23, P2-F04-T22 | `qa/reports/F02/`, `qa/tests/traces/`, `qa/tools/` | DONE | จับภาพ S2/S5/S6 จาก fixture ใหม่ 56/56 ไม่มี request ภายนอก · ปิดข้อจำกัด P1-H06 + T09 §5.3 · qa-builder kind:qa, gateWindows(loadTraceConfig) · S5 ป้ายชื่อแม่น้ำนอกกรอบ (พิกัดทดสอบ) |
| P2-H09 | F06 | (handoff จาก P2-H04) flow F06 §9 (N-01) บอก no_class = เปิด sheet เลือกพลังโดยไม่มีข้อความ, no_hp = common.error/common.retry แต่ narrative เสนอใช้ `dungeon.checkinNoHp` (ซื่อตรงกว่า) และ `dungeon.checkinNoClass` เป็นบรรทัดสำรอง — ตัดสินและแก้ตาราง §9 (ข้อเสนอ D-120; game-director อนุมัติใน F06 design gate) | spec | uiux-designer | P2-H04, P2-H05 | `design/ux/flows/` (F06 เท่านั้น) | DONE | flow F06 §9 แก้ + §15 (D-120 ฝั่ง uiux รับ, rollback plan) · (plan-sync W7) game-director อนุมัติใน P2-H20 แทน F06-T24 |
| P2-H10 | F04 | (จาก P2-H07) D-109 ตัดไปรษณีย์กลางถาวรแต่ยังไม่อยู่ใน `coverageFilter.excludeOsmIds` — เพิ่ม `osm-w231293478` + _source D-109 · ตรวจ One Bangkok/สวนดุสิตอรุณตาม D-109 (พักไว้ = review ไม่ใช่ exclude) | fix | systems-designer | P2-H07 | `config/balance/dungeons.json` | DONE | excludeOsmIds + ไปรษณีย์กลาง (16), reviewOsmIds + สวนดุสิตอรุณ + One Bangkok 5 (14) ตาม D-109 · config-lint 58 · test_config_matches_d083 hard-code D-083 → แก้ใน H11 |
| P2-H11 | F04 | (จาก P2-H07/H10) rerun coverage (`cd tools/coverage && .venv/bin/python -m pipeline all` + analysis --offline ถ้าจำเป็น) ให้ data/coverage สะท้อน flag ใหม่ + D-109 · รายงานจำนวน civic_building/rooftop และ SHA ใหม่ (แทน 9a0605cd) ให้ level-designer | build | location-engineer | P2-H10 | `data/coverage/`, `tools/coverage/` | DONE | coverage rerun: 725 candidate / 685 ใช้ได้ / 40 review · ไปรษณีย์ excluded, ดุสิตอรุณ rooftop+review · SHA 3c75c91e · ปทุมวัน G1 46.29% ตก · test_config_matches_human_decisions |
| P2-H12 | F04–F06 | (handoff จาก P2-X21) ยืนยัน middleware `/kw/` ของ vite dev/preview ที่ไม่ส่ง Cache-Control (asset-delivery.md 6.2 กำหนด immutable/no-cache ต่อ path) — ยอมรับหรือระบุ header · ยืนยัน A-P2-X21-6 (preview เสิร์ฟ /kw/ ด้วย) | review | tech-lead | P2-X21 | `docs/tech/asset-delivery.md` | DONE | asset-delivery.md 6.2.1: dev/preview ไม่ส่ง header, production = _headers ของ Pages (มีครบแล้ว) · ยืนยัน A-P2-X21-6 |
| P2-H13 | F04–F06 | (handoff จาก P2-H05) เพิ่ม `assets[id].tintable: boolean` ใน runtime manifest (tools/art stage คำนวณจาก currentColor ใน SVG ต้นฉบับ เฉพาะ kind icon-ui) + แก้ asset-delivery.md §6.1 ให้ client เลือก inline/`<img>` ตาม field นี้ · ร่วมอนุมัติ D-121 | build | tech-lead | P2-H05 | `tools/art/`, `docs/tech/asset-delivery.md` | DONE | stage เขียน tintable: true (มีเฉพาะเมื่อจริง) 28 entry, manifest 24,773 B · asset-delivery §5/§6.1 · D-121 อนุมัติ |
| P2-H14 | F04–F06 | (handoff จาก P2-H05) client `setIconGlyph` (fetch SVG, cache ต่อ session, sanitize แบบ allowlist, inject, aria-hidden+focusable=false, style.color ตาม components.md §13.9.1) fallback เป็น `setIconImg` · ใช้กับ icon.ui.grace และ icon.ui.closed ก่อน | build | gameplay-programmer | P2-H13, P2-F05-T10 | `apps/client/` (ยกเว้น `apps/client/package.json`) | CUT | (plan-sync W7 O-03) CUT แบบรวมงาน: โมดูล setIconGlyph รวมใน P2-X29 · การต่อสายรวมใน P2-F06-T14 · ข้อความเดิม: (จาก H13) `RuntimeAsset.tintable?: true` เฉพาะ asset-manifest.json หลัก ไม่มีค่า false · เช็ค `=== true` · ห้ามอนุมานจาก id/kind · sanitize ตัด script/on*/href ที่ไม่ใช่ #local · fail → <img> URL เดิม · (จาก H17) glyph tintable ที่ fallback เป็น <img> บน bg.night ต้องมีแผ่นรอง bg.surface ขนาด glyph + 2 px |
| P2-H15 | F04–F06 | (handoff จาก P2-H05 + ค้างของ art-director) แปลง `art/assets/icon/ui/in-run.svg` (fill #1A1A22 มองไม่เห็นบน bg.night) และพิจารณา `icon.ui.suspended` (#006699) เป็น currentColor · อัปเดต manifest.icon.json ผ่าน tools/art · art-director ตรวจใน content gate | build | artist-2d | P2-H05 | `art/assets/icon/ui/`, `art/assets/manifest.icon.json` | DONE | in-run.svg → currentColor (night contrast 1.0 → 16.39:1) · suspended คงสีตายตัว (เสนอ) · validator 0 error · ui16 ยังไม่แก้ |
| P2-X25 | F04 | (จาก P2-H11, บล็อก root test) `tools/dungeons/build.config.json` validator.extraReviewFlagTags → {} (roof ซ้ำกับ coverageFilter.reviewFlagTags.rooftop) · `tools/dungeons/test/validate.test.ts` บรรทัด 144, 216, 220 review_flag_roof → review_flag_rooftop · แก้ _source บรรทัด 38 | fix | location-engineer | P2-H11 | `tools/dungeons/` | DONE | extraReviewFlagTags {} + test review_flag_rooftop · tools/dungeons 138 pass |
| P2-H16 | F04 | (handoff จาก P2-H11) อัปเดต design/levels/pilot-dungeons.md (SHA 3c75c91e…, บางรัก 6→4, ปทุมวัน 18→13, ไปรษณีย์ออก, ดุสิตอรุณ + One Bangkok ×5 review, คลาวด์ 11 พาร์ค rooftop ใหม่นอก D-109) · ปทุมวันตก G1 (46.29% < 60%) และบางรักยังตก G2 (4 < 10): เสนอทางเลือก (เร่งตรวจ One Bangkok / เพิ่มสถานที่ / ยอมรับ) พร้อมคำแนะนำ — ถ้าต้องเปลี่ยนเกณฑ์หรือย่าน ส่งเป็นคำถาม HUMAN · ร่วม product-manager | spec | level-designer | P2-H11 | `design/levels/pilot-dungeons.md`, `design/levels/bangrak-plan.md` | DONE | pilot-dungeons/bangrak-plan: SHA 3c75c91e, pilot 20 ยัง valid, §10 ทางเลือก G1/G2 |
| P2-H17 | F04–F06 | (handoff จาก P2-H15 + ค้างของ art-director) ตรวจ icon.ui.in-run (currentColor) และตัดสิน icon.ui.suspended คงสีตายตัว (D-122) · ตัดสินว่า icon.ui16.in-run / ui16.suspended ต้องแปลงตามหรือไม่ (components.md 13.9 ระบุว่า ui16 ทั้งชุด tintable แต่ไฟล์จริงไม่ใช่) · อนุมัติ composite-f03 ที่ค้าง | review | art-director | P2-H15 | `art/direction/` | DONE | review P2-H17: in-run 24 px PASS (ปิดเรื่องกลางคืน), D-122 REJECTED → suspended fill #FFFFFF + ink 2 px, ui16 ตามกลุ่ม ui, composite-f03 NEEDS_CHANGES (V-26/V-27) อนุมัติแบบมีเงื่อนไข · icon-grammar 7.1.1/§8 |
| P2-H18 | F06 | (handoff จาก P2-F06-T05) cue เสียง priority ปกติ (แนว ป๊อก ของ run.autoPotionUsed) สำหรับใช้ยา HP / ยาฟื้นนอก run (`inventory.usePotionButton`, `inventory.useRevivePotionButton`) ตอนนี้เงียบ · อัปเดต cue-list + manifest + WAV generator | build | sound-designer | P2-F06-T05 | `audio/` | DONE | cue inventory.potionUsed + inventory.reviveUsed (22 cue, deterministic) · handoff: gameplay potion_used.revived |
| P2-X26 | F03–F06 | (จาก P2-H17, art-director NEEDS_CHANGES) V-23 ui16/in-run.svg → currentColor · V-24 ui/suspended.svg fill #FFFFFF และ ui16/suspended.svg fill #FFFFFF + stroke #1A1A22 2 px round (D-123) · V-25 ยอด crack rift+in-run ลง y 2.8 (24 px) / 2.0 (16 px) · V-26 side view arm_p/sleeve_p หลัง body · V-27 back view weapon ก่อน body (E3), hair_back หลัง outfit_body (E2) · V-28 ขอบพื้นกลางคืน 10 px · แล้วตั้ง ref.avatar.composite-f03 approved (D-124) + bytes/sha256 | fix | artist-2d | P2-H17 | `art/assets/icon/ui/`, `art/assets/icon/ui16/`, `art/assets/manifest.icon.json`, `art/ref/avatar/`, `art/assets/manifest.ref.json` | DONE | V-23..V-28 แก้ครบ: ui16/in-run currentColor, suspended fill ขาว+ink (D-123), ยอด crack, composite side/back z-order + ขอบกลางคืน · composite-f03 approved (D-124) · validator 0 error, tools/art 51 |
| P2-H19 | F04–F06 | (handoff จาก P2-H17) components.md 13.9: แทน "icon.ui16.* ทั้งชุด" ด้วยกฎ ui16 ตามกลุ่ม ui ชื่อเดียวกัน (D-124) · in-run เข้ากลุ่ม tintable · 13.9.1 Suspended = glyph สีตายตัว bg.surface (D-123), in-run กลางคืน = พร้อม · ยืนยัน A-P2-H17-2 | spec | uiux-designer | P2-H17 | `design/ux/components.md` | DONE | components.md §13.9 ตาม D-121/123/124 + fallback plate |
| P2-H20 | F04–F06 | (plan-sync W7 O-05 · รวม P2-X20, P2-H09 และ GD N-08 ของ P2-F06-T19) คำตัดสินก่อน build: (1) อนุมัติหรือปฏิเสธ D-120 (2) เลือกทาง ก หรือ ข ของ balance-model §21 สำหรับ {areaName} ของ home.outsideLaunchBody (3) อ่านร่างแบบสอบถาม playtest แล้วให้ความเห็น · รายละเอียดหัวข้อ 4 | spec | game-director | P2-X20, P2-H09, P2-F06-T19 | `design/reviews/P2-H20-decisions.md` | DONE | design/reviews/P2-H20-decisions.md: D-120 ACCEPTED, §21 ทาง ข (ก → Phase 3), รายชื่อ 76 เขต, A-P2-X31-1 ยืนยัน + tie-break, ความเห็นแบบสอบถาม Q-1..Q-9 |
| P2-X27 | F06 | (plan-sync W7 O-06 · แยกจาก P2-F06-T09) `apps/client/src/home/home-state.ts` + test: ฟังก์ชัน pure ตาม tech note F06 §9.1–9.2 (unknown, out_of_area, far + temporarilyClosed, outside_launch_district, near) · ข้อ 5 ใช้ spec F06-R37 ไม่มีทางสำรองนอกช่วงเลเวล (K-11, D-116) · ไม่มี DOM ไม่มีพิกัดใน log หรือ storage · gameplay ต่อสายใน F06-T09 | build | backend-programmer | P2-F06-T04, P2-H01, P2-X20 | `apps/client/src/home/` | DONE | apps/client/src/home/home-state.ts pure ตาม tech note §9.2 ใหม่ (R37 onboarding, D-127) · 28 test (H-E6/E21/E26, 13.4 a–e) · client 505 pass |
| P2-X28 | F06 | (plan-sync W7 O-07 · แยกจาก P2-F06-T10) `apps/client/src/onboarding/` ตัวเดินขั้น onboarding แบบ pure (intro → age → consent → permission → map → class → run แรก → รางวัลก้อนแรกจาก run_tick_granted.firstEver เท่านั้น) + guard ระบบที่ห้ามสอนจาก unlocks.json + test · ไม่มี code path รางวัลแยก (GD B-07) · สัญญา kw.p2.onboarding ตาม tech note F06 §8 | build | backend-programmer | P2-F06-T04, P2-F06-T06, P2-X27 | `apps/client/src/onboarding/` | DONE | apps/client/src/onboarding/onboarding-step.ts pure (intro→age→underage/consent→permission→map→class→first_run→first_reward→done) + isSystemTeachLocked · 26 test |
| P2-X29 | F06 | (plan-sync W7 O-26 + O-03 · แยกจาก P2-F06-T14 และ P2-H14) (ก) `apps/client/src/feedback/` fire-together ภาพ/สั่น/เสียง (push ไม่มีใน Phase 2) + priority queue ตาม audio/cue-list.md §4 (cue ความปลอดภัยชนะเสมอ) + fallback เมื่อไม่มี navigator.vibrate (ข) ตัวคุม Wake Lock: feature detection, ขอใหม่เมื่อถูกปล่อย, นับเวลาที่ถือและเวลา page hidden ต่อ run (ค) setIconGlyph: fetch SVG, cache ต่อ session, sanitize allowlist (ตัด script, on*, href ที่ไม่ใช่ #local), inject, aria-hidden + focusable=false, เช็ค tintable === true, fail → img URL เดิม · inject API ของเบราว์เซอร์ได้ test ใน happy-dom · ไม่แก้ `apps/client/src/debug/` | build | backend-programmer | P2-F06-T13, P2-H13, P2-H18, P2-X28 | `apps/client/src/feedback/`, `apps/client/src/assets/icon-glyph.ts`, `apps/client/src/assets/icon-glyph.test.ts` | DONE | feedback/cue-feedback.ts (ห่อ audio-player เพิ่มขาภาพ, safeVibrate), wake-lock-controller.ts (held/hidden ต่อ run), assets/icon-glyph.ts (sanitize allowlist, tintable, fallback img + แผ่นรองกลางคืน) · 26 test |
| P2-X30 | F04 | (plan-sync W7 O-11 · ค้างจาก P2-X14 เพราะนอก writes) flow F04 เปลี่ยน nav.approximateDistancePrefix → nav.distanceApprox ทุกจุด · wireframe เก่าชุด 04/05 ของ F03 ติดหมายเหตุว่าถูกแทนด้วย F04-* และ F05-* หรือแก้ key ให้ตรง | fix | uiux-designer | P2-X14, P2-H19 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/wireframes/04-*.html`, `design/ux/wireframes/05-*.html` | DONE | flow F04 ใช้ nav.distanceApprox ทุกจุด + §14 · wireframe 04/05 เก่าติดหมายเหตุชี้ F04-04, F05-02, F06-03 |
| P2-X31 | F06 | (plan-sync W7 O-08) tech note F06 §9.2 ข้อ 5 ให้ตรง spec F06-R37, K-11, D-116 (ลบทางสำรองนอกช่วงเลเวล) + ตรวจการอ้าง R37 จุดอื่นในเอกสาร · (follow-up ของ P2-X12) tools/config-lint/src/scaffold.ts suffix _bytes + test ช่วงค่า · ถ้าผล P2-C02 มาถึงก่อน ให้ P2-C03 ใช้ช่อง tech-lead ก่อนแถวนี้ | fix | tech-lead | P2-F06-T04, P2-X15, P2-X12 | `docs/tech/F06-hp-damage-onboarding.md`, `tools/config-lint/` | DONE | tech note F06 §9.1–9.2 ตรง R37/K-11/D-116 (onboarding เฉพาะ dungeon ที่ครอบเลเวล ไม่มีทางสำรอง) + §13.4 test hook · scaffold.ts _bytes + test · config-lint 66 |
| P2-X32 | F06 | (plan-sync W7 O-27) แก้ home.outsideLaunchBody และ key ที่เกี่ยวตามทางที่ P2-H20 เลือก (ทาง ข = ไม่มี {areaName}) + รัน lint:copy · ถ้า H20 เลือกทาง ก ให้ CUT แถวนี้และเรียก producer | copy | narrative-designer | P2-H20 | `config/content/copy.th.json`, `config/content/names.th.json` | DONE | copy: outsideLaunchBody/outOfAreaBody ใหม่ (R57) · names.th.json district.<id> 79 ชื่อ · lint 208 pass (orchestrator รัน) |
| P2-X33 | F04 | (plan-sync W7 O-09 · กฎสลับข้อ 3 หลัง P2-H11) คำนวณ GR-1 ของพระนคร ปทุมวัน บางรัก ซ้ำจาก coverage SHA 3c75c91e เทียบ G4/S3 · อัปเดตหลักฐาน E17 · ส่งตัวเลขประกอบคำถาม Q-1 (D-083 หลัง G1/G2) · ถ้าย่านใดเกิน guardrail ให้เป็นคำถามถึงคน | spec | product-manager | P2-H11, P2-H16 | `product/metrics.md` | DONE | metrics.md §9.2: GR-1 ผ่านทั้ง 3 ย่าน (g4 red ไม่เปลี่ยน) · แนะนำ Q-P2-11 (ก) · ปฏิเสธ O-22 · potion telemetry ต้องมี event inventory_potion_used |
| P2-X34 | F04 | (จาก P2-F04-T22, BUG-P2-002 high) `packages/shared/src/session/reducer.ts` handleSample: `usableAndUnlocked` ไม่มีตัวกรอง speed outlier (outlierSpeed 60 km/h, D-102) ทำให้ teleport เข้า polygon ครั้งเดียวยังนับเป็นการเห็นจากข้างนอกและไม่ตัดสาย approach — check-in แบบ teleport ผ่านได้ใน sessionStep (บล็อกแค่ใน checkInBatch) · แก้ + test จาก trace synthetic-teleport-spoof-01 · เอา it.fails ของ qa ออกเมื่อผ่าน (แจ้ง qa) | fix | backend-programmer | P2-F04-T22 | `packages/shared/src/session/` | DONE | SessionState.checkInFilter (gateFilterStep ของ geo, config เดียวกับ gate) → teleport ไม่นับเป็นการเห็นจากข้างนอก · strip ใน persistence · checkin-teleport.test.ts · shared 597 |
| P2-X35 | F05 | (จาก P2-F05-T10) RunSummary.expGained และ levelsGained เป็น 0 ตายตัวใน endRun/processHits (RunState ไม่มีตัวสะสม exp) ทั้งที่มี tick ได้รับจริง — Flow B2 ต้องแสดงยอดจริง · สะสมจาก run_tick_granted + test | fix | backend-programmer | P2-F05-T10 | `packages/shared/src/session/`, `packages/shared/src/run/hysteresis.ts`, `packages/shared/src/run/run-timeline.ts` (prettier เท่านั้น) | DONE | RunState.expGained/levelsGained สะสมใน grantTick, endRun อ่านจริง, ตายไม่ลด exp (F05-R21/R26, F06-R23) · schemaVersion 1→2 · prettier run/ · shared 599 |
| P2-X36 | F04 | (จาก copy gate P2-F05-T17 C-06) เพิ่ม key `dungeon.checkinNotEnoughTraceWaiting` "รอสัญญาณต่อเนื่องอีกสักพัก" (ไม่มีตัวแปร) สำหรับตอน countdown เป็น null | copy | narrative-designer | P2-F05-T17 | `config/content/copy.th.json` | DONE | dungeon.checkinNotEnoughTraceWaiting (19 ช่อง) · lint ผ่าน (orchestrator รัน) |
| P2-X37 | F04 | (จาก copy gate P2-F05-T17) C-01 ชื่อ dungeon อ่านจาก names.th.json (dungeon-confirm.ts:88,104, dungeons/artifact.ts:85) · C-02 ชื่อค้นหา+ปุ่มคัดลอกในแผงนำทาง (nav-panel.ts:214,218) · C-03 ใช้ unit.m/unit.km แทน m (f04-app.ts:314) · C-04 {openTime} เป็นเวลาไม่ใช่ epoch (f04-app.ts:321) · C-05 เติม {timeLeft} (f04-app.ts:290-291) · C-06 ใช้ key ใหม่ของ X36 เมื่อ countdown null · C-07 nav.copyPlaceLink · C-08 nav.fallbackBody/fallbackManualCopy · C-09 nav.distanceApprox เมื่อ GPS ไม่แม่น · C-10 body ของ timeout/clock_invalid · C-11 dungeon.closingSoonTag · C-12 run.stateResumed · F05-N1 toast tick แรกไม่ต่อสอง key เป็นบรรทัดเดียว | fix | gameplay-programmer | P2-X36, P2-F06-T08, P2-H27, P2-H28 | `apps/client/` (ยกเว้น `apps/client/package.json`, `apps/client/src/home/`, `apps/client/src/onboarding/`) | DONE | copy gate C-01..C-12, F05-N1, A2 + tech gate TG-02..05, TG-07, TG-10 + z-index + [hidden] global + tintable type · lint/typecheck/build เขียว · root 2654 pass (เหลือ BUG-P2-002 it.fails) · e2e 56/58 (fail เดิมก่อนงานนี้) |
| P2-H27 | F04, F05 | (handoff จาก P2-F05-T17) ยืนยัน C-10 ใน flow F04 §7 (body ของ timeout/clock_invalid) · แผงนำทางใกล้ (A2) เมื่อไม่มีชื่อปลายทาง · F05-N1 toast tick แรก 41 ช่องขึ้นสองบรรทัด | spec | uiux-designer | P2-F05-T17 | `design/ux/flows/F04-dungeon-presence.md`, `design/ux/flows/F05-movement-gate-reward.md` | DONE | flow F04 §7 body timeout/clock_invalid (run.summary.timeoutBody/clockInvalidBody), A2 ซ่อนบรรทัดชื่อเมื่อยังไม่มีชื่อ · flow F05 F05-N1 toast สองบรรทัด |
| P2-H28 | F06 | (handoff จาก tech gate P2-F05-T15, เงื่อนไข D-129) เพิ่มสเกล z-index เป็น token ใน design/ux/tokens.json (banner, drawer, toast, popup, overlay) สำหรับจอซ้อนของ F06 · อ้างใน components.md | spec | uiux-designer | P2-F05-T15 | `design/ux/tokens.json`, `design/ux/components.md` | DONE | tokens.json zIndex map0/hud1/banner10/drawer20/toast30/popupModal40/overlay50/system60 + กฎ D-129 · components.md §15 จอ→ระดับ |
| P2-H29 | F04 | (handoff จาก tech gate TG-12) แก้ tech note F04 §11.1: เพดาน onDeviceSamples มาจากรูปของ state ไม่ใช่การอ่านค่า runtime และ persist ตัดพิกัดทั้งหมด (P2-H02, P2-X34 checkInFilter) | fix | tech-lead | P2-F05-T15 | `docs/tech/F04-dungeon-presence.md` | DONE | tech note F04 §11.1/11.2: เพดานมาจากรูป state, persist ตัดพิกัดทั้งหมดรวม checkInFilter · กฎ field พิกัดใหม่ต้องเข้า stripCoordinates + test |
| P2-H30 | F04 | (จาก P2-F05-T11) พลิก `it.fails(` → `it(` ของเคส BUG-P2-002 ใน qa/tests/F04/session-checkin-lifecycle.test.ts (บั๊กแก้แล้วใน P2-X34) + ปิด BUG-P2-002 ใน qa/bugs.md · ตัวจัดสิทธิ์ปฏิเสธ qa ครั้งแรก รอผู้ใช้ตัดสินว่าใครทำ | fix | HUMAN | P2-F05-T11, P2-X34 | `qa/tests/F04/session-checkin-lifecycle.test.ts`, `qa/bugs.md` | DONE | ผู้ใช้พลิก it.fails → it บรรทัด 44 เอง (2026-09-28) · orchestrator รัน vitest: 5/5 pass · ปิด BUG-P2-002 ใน qa/bugs.md ยกให้ qa ใน P2-F06-T17 |
| P2-H31 | F04 | (handoff จาก P2-F06-T08) qa/tests/e2e/f04-closed-dungeon.spec.ts: แก้เทสต์ "พฤติกรรมปัจจุบัน" (popup B4 ซ่อนแผงนำทางแล้ว) และเอา test.fail ของ BUG-P2-003 ออก + ปิด BUG-P2-003 · f04-origin-allowlist.spec.ts ใส่ ?e2eClassId= ให้ confirm ไม่ถูก no_class · ถ้าตัวจัดสิทธิ์ปฏิเสธการเอา test.fail ออก ให้หยุดและรายงาน | fix | qa-tester | P2-F06-T08 | `qa/tests/e2e/`, `qa/bugs.md` | DONE | f04-closed-dungeon.spec (ตัด test.fail), f04-origin-allowlist.spec (e2eClassId + selector) · e2e 10/10 · BUG-P2-003 CLOSED |
| P2-X38 | F06 | (ต่อจาก P2-F06-T09 acceptance ที่ยังไม่ครบ) จอ S-00 age gate 15+ (scaffold) + consent ตำแหน่งแยกก่อน GPS ครั้งแรก (เขียน kw.p2.consent) · S-23 privacy ถอน consent (purgeLocationData) · เมนูตั้งค่าหลัก: Credits (ui/credits.ts), ลบข้อมูลในเครื่อง (ฟังก์ชัน P2-F04-T25), เดินปลอดภัย S-22 · ใช้ onboarding-step.ts ของ P2-X28 · hook ข้าม onboarding สำหรับ e2e อ่านเฉพาะ Mock (D-130, ชื่อใน providerQuery.paramNames) แล้วแก้ apps/client/e2e ให้ใช้ · แจ้ง qa ชื่อ hook เพื่อแก้ qa/tests/e2e | build | gameplay-programmer | P2-F06-T09, P2-F06-T10 | `apps/client/` (ยกเว้น `apps/client/package.json`, `apps/client/src/home/`, `apps/client/src/onboarding/`, `apps/client/src/feedback/`), `config/app/client.json` | DONE | age-gate.ts, ui/age-gate-screen.ts, ui/consent-location-screen.ts, ui/settings-menu.ts, ui/privacy-screen.ts, privacy/withdraw-consent.ts, copy/position-log-ttl.ts, onboarding-flow.ts (GPS เริ่มจาก acceptConsent เท่านั้น), main.ts gate consent · แก้ H32/O-2/H34/H39 · e2e withdraw-consent.spec.ts + onboarding 2 เคสใหม่ · client vitest 792, root 2906 pass, client e2e 50/50, qa f04 e2e 24/24 · → H40 uiux, A-3/storageKeyPrefix → F06-T20 |
| P2-H32 | F06 | (handoff จาก P2-F06-T09 A-1..A-3) ชื่อจังหวัด province.<iso> 6 จังหวัดศึกษาใน names.th.json (หัวกลุ่ม S-09) · ตัดสิน home.outOfAreaBody เมื่อไม่รู้ {provinceName} (นอกทั้ง 6 จังหวัด): เพิ่ม key แบบไม่มีตัวแปร | copy | narrative-designer | P2-F06-T09 | `config/content/names.th.json`, `config/content/copy.th.json` | DONE | names.th.json province.th10..th74 (กรุงเทพมหานคร), copy home.outOfAreaBodyUnknown (54 ช่อง ไม่มีตัวแปร) · lint ผ่าน (orchestrator รัน) |
| P2-H21 | F04–F06 | (handoff จาก P2-X31) เพิ่ม `bytes` (และตรวจ `_min`, `_deg`) ใน `$defs` ของ packages/shared/schemas/config/common.schema.json แล้วเปลี่ยน scaffold.ts ให้ใช้ $ref แทน inline | fix | tech-lead | P2-X31 | `packages/shared/schemas/config/common.schema.json`, `tools/config-lint/` | DONE | common.schema.json \$defs + bytes/minutes/degrees, scaffold ใช้ \$ref · config-lint 20 ไฟล์ 0 error, 66 test |
| P2-H22 | F06 | (handoff จาก P2-X31) tools/dungeons validator ตรวจว่ามี dungeon อย่างน้อย 1 แห่งที่ level_range ครอบเลเวล 1 (ไม่งั้น onboarding แนะนำอะไรไม่ได้ ตาม tech note F06 §9.2 กรณีข้อมูลผิด) + test | fix | location-engineer | P2-X31 | `tools/dungeons/` | DONE | validator start_level_not_covered (อ่าน progression.level.startLevel, fail-closed) · ข้อมูลจริง 0 error · tools/dungeons 144 |
| P2-H23 | F06 | (handoff จาก P2-H20) flow F06 §15.2 เปลี่ยนเป็น approved (D-120) · F2 ใช้ key launchAreaMaskPath + body ใหม่ (D-126) · S-09 โหมดเขตไม่เลือกเขตไว้ก่อน · A7/F1 ชี้เป้าหมายเดียวตาม 3A (D-127) | spec | uiux-designer | P2-H20 | `design/ux/flows/` (F06 เท่านั้น) | DONE | flow F06: D-120 approved §15, F2/F3 body ใหม่, S-09 ไม่เลือกเขตไว้ก่อน, A7 เป้าหมายเดียว + tie-break (§16) |
| P2-H24 | F06 | (handoff จาก P2-H20) เพิ่มความเห็น Q-1..Q-9 เป็น addendum ใน product/playtest/phase-2-plan.md §12 ก่อน F06-T27 · แก้ถ้อยคำ §6.4 ตาม D-128 · ยืนยัน checkin_rejected.reason มี no_class/no_hp · ตัดสิน telemetry potion_used นอก run (จาก H18) | spec | product-manager | P2-H20, P2-X33 | `product/playtest/`, `product/telemetry-events.md` | DONE | แบบสอบถาม + phase-2-plan §12 addendum Q-1..Q-9, §6.4 ตาม D-128 · telemetry-events: inventory_potion_used |
| P2-H25 | F06 | (handoff จาก P2-H20) แก้ spec F06: R37 ข้อ 2 ตาม 3A (D-127), R55 เป็น fallback เท่านั้น, R52 ข้อ 2 body ไม่ระบุเขต (D-126) · บันทึกทาง ก เป็น backlog Phase 3 | spec | game-director | P2-H20 | `design/features/` (F06 เท่านั้น) | DONE | spec F06: R37 ข้อ 2 ตาม D-127, R52 ข้อ 2 ตาม D-126, R55 fallback เท่านั้น, ทาง ก เป็น backlog Phase 3 |
| P2-H26 | F06 | (handoff จาก P2-X32) ไฟล์รายชื่อเขตของพื้นที่ศึกษาที่เครื่องอ่านได้ (id camelCase ตาม launch-area.geojson, osmRelationId, provinceIso) ใน data/map/ ให้ client ลบ launch-area ออกได้ (D-126 ข้อมูลชุดเดียว) + --check ใน pnpm test + LICENSE-DATA | build | location-engineer | P2-X32 | `data/map/`, `tools/coverage/` | DONE | data/map/study-districts.json 79 เขต (id, osmRelationId, provinceIso) · districts.py build --check ใน pnpm test · id ตรง launch-area + names.th.json · 16 test |
| P2-H33 | F04, F05 | (O-1 จาก P2-F05-T18) schema `anticheat.speedLock.action` เป็น `const: "lockPlay"` + case ใน tools/config-lint/test/schema.test.ts (engine ล็อกเสมอ ไม่ให้คนแก้ config เข้าใจผิดว่าเปลี่ยนเป็นเตือนได้) | fix | tech-lead | P2-F05-T18 | `packages/shared/schemas/config/`, `tools/config-lint/` | DONE | anticheat.schema.json speedLock.action const "lockPlay" + 4 case ใน schema.test.ts · lint:config 0 errors · config-lint 70/70 · anticheat.json เป็น lockPlay อยู่แล้ว |
| P2-H34 | F05, F06 | (O-3 จาก P2-F05-T18) flow F05/F06 ระบุว่ารางวัลก้อนแรกที่มาจาก partial tick D-059 แสดงบนจอสรุป run แทน toast | spec | uiux-designer | P2-F05-T18 | `design/ux/flows/` (F05, F06) | DONE | flow F05 A2b + §12, flow F06 A11 + §17: partial tick D-059 ที่เป็น firstEver ไม่แสดง toast ไปจอสรุป run ตรงเลย · run.summaryContinue = run.continueCta (D-050) · ไม่ใช่ทางรางวัลแยก (GD B-07) · handoff client → X38 |
| P2-H35 | F04, F05 | (O-4 จาก P2-F05-T18) spec F04/F05 สถานะ "ผ่าน design gate P2-F05-T18" + ชื่อ key ตรง config/ADR (`sampleCadence_s`, `outlierSpeed_kmh`, `outlierReanchorSamples`) | spec | game-director | P2-F05-T18 | `design/features/` (F04, F05) | DONE | spec F04/F05 สถานะ "ผ่าน design gate P2-F05-T18" · key ตรง config/ADR 0003 (sampleCadence_s, outlierSpeed_kmh, outlierReanchorSamples, ถอด "เสนอ" จาก key ที่มีแล้ว) · A-P2-F04-T01-1 ปิด · ไม่เปลี่ยนกฎ |
| P2-H36 | F06 | (จาก P2-F06-T17) `pnpm install` ครั้งเดียวให้ qa/tests/F06 เป็น workspace member (แบบ F04/F05) แล้วตรวจว่า pnpm-lock.yaml เปลี่ยนเฉพาะ importer qa/tests/F06 · ไม่เปลี่ยน version | fix | tech-lead | P2-F06-T17 | `pnpm-lock.yaml` | DONE | pnpm install offline · pnpm-lock.yaml +9 บรรทัด (importer qa/tests/F06 เท่านั้น) · vitest qa/tests/F06 31/31 lockfile ไม่เปลี่ยน |
| P2-H37 | F06 | (จาก P2-F06-T17) เพิ่มแถว data/gps-traces/qa/qa-home-states-walk-01.trace.json ใน data/gps-traces/README.md หัวข้อ 6 | fix | location-engineer | P2-F06-T17 | `data/gps-traces/README.md` | DONE | data/gps-traces/README.md หัวข้อ 6.1 (trace ใน qa/, เจ้าของ qa-tester) + แถว qa-home-states-walk-01 · ยืนยัน synthetic · ห้ามใช้ทดสอบ gate/speed lock (กระโดดระหว่างช่วง) |
| P2-H38 | F04, F05 | (จาก P2-F06-T14) qa/tests/e2e/f04-checkin-confirm-flow.spec.ts, f04-f05-no-raw-copy-key.spec.ts, f04-origin-allowlist.spec.ts: pin `?start=` กลางวัน (แบบ apps/client/e2e/full-run.spec.ts) + บังคับ Wake Lock unsupported ด้วย addInitScript ที่ต้องกดจอ run หลัง dungeon_entered (pocket screen บัง pointer) · e2e ชุด qa เขียวไม่ขึ้นกับเวลาจริง | fix | qa-tester | P2-F06-T14 | `qa/tests/e2e/` | DONE | qa/tests/e2e: pin START=2026-10-02T12:00 + e2eSkipOnboarding=1 (spec ติดจอ intro ตั้งแต่ F06-T10) + Wake Lock unsupported ในเคสที่กดจอ run · f04-closed-dungeon เคสความปลอดภัยเคยผ่านแบบว่างเปล่า ตอนนี้ตรวจ popup จริง · qa e2e 36/36 × 2 รอบ × 2 project |
| P2-H39 | F06 | (จาก P2-F06-T14) toast (zIndex 30) อยู่ใต้ pocket screen (overlay 50) ขัด components.md 12.1 ที่ให้ cue แสดงโดยไม่ออกจากจอพกกระเป๋า · ตัดสิน: เพิ่ม tier (เช่น toastOnOverlay) หรือยอมรับว่าบนจอพกใช้เสียง/สั่น + HP/tick ของจอเอง (flow C2) · ถ้าต้องแก้ client เขียน handoff ถึง gameplay | spec | uiux-designer | P2-F06-T14 | `design/ux/tokens.json`, `design/ux/components.md`, `design/ux/flows/F06-hp-damage-onboarding.md` | DONE | ไม่เพิ่ม z-index tier · บนจอพกกระเป๋า cue ใช้เสียง + สั่น + ตัวเลข HP/tick ของจอเอง ไม่มี toast ที่มองเห็น · components.md 12.1/15.3/15.4, tokens.json zIndex.rule, flow F06 C2 · handoff client (ข้าม mount toast ขณะ pocket screen แสดง แต่ยังส่งเสียง) → รวมใน X38 |
| P2-X39 | F04, F05 | (orchestrator ตรวจหลัง P2-H33) root `tsc -p tsconfig.json --noEmit` แดง: tools/config-lint/test/schema.test.ts(71,28) TS2345 readonly ConfigFile[] → ConfigFile[] จาก test ใหม่ของ H33 | fix | tech-lead | P2-H33 | `tools/config-lint/` | DONE | schema.test.ts:31 helper รับ readonly ConfigFile[] · root tsc สะอาด · config-lint 70/70 |
| P2-H40 | F06 | (จาก P2-X38) ตัดสิน A-P2-X38-2 (ต้องมีจอ priming ก่อนขอสิทธิ์เบราว์เซอร์แบบบล็อกไหม · key consent.browserPriming* ยังไม่ใช้), A-P2-X38-4 (สไตล์ปุ่มลัดลบข้อมูล ไม่มี .btn-link), ขอบเขตเมนูตั้งค่า 4 แถว (walking-safety, credits, clear-local-data, privacy), R46 ปุ่มกลับจอ underage · A-P2-X38-1 ช่วงปีเกิด 100 ปี · ถ้าต้องแก้ client เขียน handoff ถึง gameplay | spec | uiux-designer | P2-X38 | `design/ux/flows/F06-hp-damage-onboarding.md`, `design/ux/components.md` | DONE | flow F06 §18/§19 + components.md §2.1/3.2/3.3/6/7: ต้องมีจอ S-00-permission-browser ก่อนขอสิทธิ์ (build ต้องแก้), ปุ่มลัดลบข้อมูล .btn-secondary, เมนูตั้งค่า 4 แถวถูก, R46 ถูก, ปีเกิด 100 ปีเป็นค่าคงที่ UI แสดง พ.ศ., screenLockNotice เป็น toast จางเอง, first-reward ใต้จอพกรับได้, far title ใน temporarilyClosed ถูก, toast/banner 16 px, GPS pill แบบ surface + ขอบสี, badge auto-retreat = .banner.warn · → X41/X42 (client), H48 (ia.md) |
| P2-X40 | F06 | (copy gate F06 C6-04, C6-07) เพิ่ม key home.farNextOpenUnknown "ที่ใกล้กว่าปิดอยู่ ยังไม่รู้ว่าเปิดเมื่อไร" (message) + unit.yesterday "เมื่อวาน {clockText}" (label) ใน copy.th.json · lint:copy ผ่าน | fix | narrative-designer | P2-F06-T22 | `config/content/copy.th.json` | DONE | copy.th.json + home.farNextOpenUnknown (message 27 cells), unit.yesterday (label 12 cells) · lint:copy (orchestrator) exit 0, 0 FAIL, 21 WARN เท่าเดิม · JSON valid |
| P2-X41 | F06 | (copy gate F06 blocker) C6-01 white-space: pre-line ใน consent body, privacy explainer, popup body ทั้งสอง, screen-lock notice · C6-02 ความกว้าง toast (width:max-content; max-width:calc(100vw - 32px)) ให้ run.hpLow ไม่เกิน 2 บรรทัดที่ 360 px · C6-03 run.screenLockNotice หายเองตามรูปแบบที่ H40 เลือก + ซ่อนเมื่อ dungeon_exited · C6-04 ใช้ home.farNextOpenUnknown เมื่อ nextOpenAt_ms เป็น null · C6-05 แสดง home.recoveringLabel/Detail ทุกสถานะ home (timeLeft จาก recoveryTimeLeft_ms) · ไม่บล็อก: C6-06 chip ระยะเส้นตรงข้าง home.farBody, C6-07 formatter เวลาที่ผ่านมา (unit.yesterday) + หัว run.summary.* + ซ่อนชื่อ dungeon ที่ resolve ไม่ได้, C6-08 aria-labelledby toggle ตั้งค่า · แนบภาพ 360 px · รวม finding จาก tech gate T20 / visual gate T23 / H40 ที่ส่งถึง gameplay · (tech gate F06 blocker) TG-02 ยิง onboarding_first_reward_granted {dungeon_id, minutes_since_first_open_bucket, class} เมื่อ run_tick_granted.firstEver (unit + e2e) · TG-03 positionLogTtl_s เข้า BALANCE_WHITELIST privacy (ออกจาก FORBIDDEN_ANYWHERE) regen subset, parse ใน config/balance.ts, positionLogTtlText() คำนวณจาก config (D-135) · TG-04 parse localData ใน parsePrivacyConfig แทน literal kw.p2. (f04-app.ts:617) + test ทุก storage key ขึ้นต้นด้วย prefix จาก config, ใช้ CONSENT_STORAGE_KEY ที่ :238 · TG-05 ไม่มี consent key = ไม่ได้รับอนุญาต (f04-app.ts:230-250,1417-1423) ยกเว้น Mock ตาม D-130 · TG-06 clearLocalData รับ canClear และปฏิเสธระหว่าง run + test · ไม่บล็อก: TG-07 e2e timeout pocket-screen.spec.ts:74 ios, TG-10 system screens z 60, TG-11 audio stale time + safety cue id เข้า config, D-134 คำนวณ px ตอน pointerdown · (จาก H45) ย้ายการคำนวณ px ของ swipe จาก mount (pocket-screen.ts:151-154) ไป pointerdown + unit test เปลี่ยน innerHeight ระหว่างสอง gesture + แก้ _note ใน client.json#pocketScreen · (จาก H40, flow F06 §18.1) สร้างจอ S-00-permission-browser จริง: ย้าย startLocationProvider()/resolvePermission() ออกจาก acceptConsent() ไปที่ปุ่ม "ไปต่อ" ของจอ priming + render step permission ใน f04-app.ts · age-gate-screen แสดงปี พ.ศ. (เก็บ ค.ศ.) · screenLockNotice toast จางเองด้วยค่า hold ใหม่ใน client.json + ซ่อนเมื่อ dungeon_exited (C6-03) · CSS ที่ X42 ยังไม่ทำจาก V-38 · ไม่บล็อก V-37 rift-reveal ที่หัว confirm (ถ้ามีเวลา) · toast screenLockNotice ทับ run.hpLow (X42 เห็นในภาพ) ปิดด้วย C6-03 · (จาก H42, D-137) hp-bar.ts ใช้ tweenHpEdgeMarker/setHpEdgeMarkerReduced/hardCutHpEdgeMarker แทน style.left + ลบ transition: left ใน app.css (บล็อก visual gate) · ไม่บล็อก: item-icon-dom.ts ตั้ง color ตาม color.rarity.* · (จาก H49 ไม่บล็อก) .gps-pill data-tone ตามสถานะ, .btn-fullwidth-bottom sticky | fix | gameplay-programmer | P2-X40, P2-H40, P2-X42 | `apps/client/` (ยกเว้น package.json, src/assets/icon-glyph.ts(+test), src/feedback/ ที่ H46 ถือ), `config/app/client.json` | DONE | blocking ครบ: TG-02 onboarding_first_reward_granted, TG-03 positionLogTtl_s จาก config (Group B), TG-04 storageKeyPrefix จาก config + test, TG-05 consent fail-closed, TG-06 clearLocalData canClear · C6-01..05 (pre-line, toast กว้าง 2 บรรทัดที่ 360 px, screenLockNotice จางเอง 4000 ms, farNextOpenUnknown, recovering-banner.ts) · จอ S-00-permission-browser จริง, ปี พ.ศ., D-134 pointerdown, D-137 edge marker transform, gps-pill data-tone, ปุ่มล่าง sticky, TG-07, TG-10, C6-08 · root vitest 3023, client e2e 50/50, bundle 116.9 KB · ไม่ทำ: C6-06, C6-07, TG-11 → X47 · V-37 → CUT เลื่อน Phase 3 (O-16) · qa e2e f02 2 spec flake เดิม (ยืนยันด้วย git stash) → F06-T21 |
| P2-X42 | F04–F06 | (visual gate F04–F06 blocker) V-30 CSS ของ component ตาม components.md 3/4/6/13 (ปุ่ม, card.selected, bottom-sheet popup, แผ่นรองทึบของ nav/home/run-bar/แถว HP, chip-distance + ลูกศรทิศ 48 px 8 ทิศ, chip-status, สถานะ run-state pill, ขีด HP, toast/banner พร้อมไอคอน, ไอคอน check-in/speed-lock, z 60 ของ age gate/consent) · V-31 ฟอนต์ IBM Plex Sans Thai Looped ที่ #hud (500/700, tabular-nums) · V-32 สีนอก token (banner.info, caption จอพก, toast.danger, off-badge, fallback #444) · V-33 .item-icon-frame 52×52 glyph 48 · V-34 ป้ายรอยแยกบนแผนที่ resolve ผ่าน names.th.json ไม่ resolve = ไม่แสดง · ไม่บล็อก V-35 .cue-visual-pulse, V-37 rift-reveal | fix | gameplay-programmer | P2-F06-T23 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | app.css ชั้น component เต็ม (ปุ่ม, popup, chip, ลูกศรทิศ 48 px 8 ทิศ, toast/banner 16 px, แผ่นรอง, HP edge marker, pill Grace/Suspended, z 60) · fonts.ts --kw-font-ui จาก manifest · ไอคอน check-in/speed-lock · V-34 ป้ายรอยแยกไม่ resolve = ไม่แสดง · V-35 · แก้ .cue-visual-pulse บังคลิก · client vitest 795, e2e 50/50, bundle 0.116/1 MB · V-37 ยังไม่ทำ (ไม่บล็อก → X41) · → H49 uiux |
| P2-H41 | F04–F06 | (visual gate V-36) หลัง X41 + X42: ภาพ Playwright 26 จอ (390×844, Mock) + สำเนา grayscale ตามชื่อไฟล์ใน art/reviews/F04-F06-visual-gate.md 5.1 + ถ่าย S5 ใหม่ที่พิกัด F-AD-5 | review-gate | test | P2-X41, P2-X42, P2-H43, P2-H44, P2-X43 | `art/reviews/screens/F04-F06/` | DONE | art/reviews/screens/F04-F06/ 24/26 จอ + grayscale + bonus settings menu (ทุกไฟล์ ≤ 264 KB, รวม 6.9 MB) + README index · S5 ใหม่ 8/8 เห็นป้ายแม่น้ำเจ้าพระยาที่ z14 · ถ่ายไม่ได้: 06-confirm-b2-overlap (ไม่มี dungeon ซ้อนกัน), 11-toast-tick-denied (ไม่มี fixture) → H52 · สังเกต 12-hp-low toast ชิดขวา (อาจเป็นเฟรมที่ exit animation แช่) · script qa/tests/e2e/visual/ |
| P2-H42 | F06 | (visual gate V-39) ยืนยันสัญญา DOM ของ hp-bar และ rarity-reveal หลัง X42 (V-30 ข้อ 7, V-33) | review-gate | vfx-animator | P2-X42 | `art/vfx/` | DONE | edge marker แบบ left ถูกปฏิเสธ → transform ผ่าน tweenHpEdgeMarker/hardCutHpEdgeMarker/setHpEdgeMarkerReduced ใน art/vfx/hp-bar/hp-bar.ts (D-137) · rarity-reveal บนกรอบ 52 px ACCEPT · specs hp-bar.md, rarity-reveal.md · handoff client → ส่งเข้า X41 |
| P2-H43 | F02 | (visual gate F-AD-5/F-AD-6) map-style.md 10.1 S5 → 100.5140, 13.7180 z14 + ตรวจป้ายแม่น้ำ · เพิ่มตัวอย่างสีสถานะ 16 px ใน S8 | spec | art-director | P2-F06-T23 | `art/direction/` | DONE | map-style.md 10.1 S5 → 100.5140, 13.7180 z14 + เกณฑ์ป้ายแม่น้ำ (water_label_line) + fallback z13 · style-guide.md หัวข้อ 2 "ตัวอย่าง S8" สี state บนพื้นสว่าง 16 px · → H44 location (fixture) |
| P2-H44 | F02 | (จาก P2-H43, F-AD-5) rebuild fixture tools/tiles/fixtures/screens/s5-chaophraya/ ที่ bbox [100.5035, 13.696, 100.5245, 13.740] minzoom 13 maxzoom 14 center [100.514, 13.718] + อัปเดต manifest.json | fix | location-engineer | P2-H43 | `tools/tiles/fixtures/screens/s5-chaophraya/` | DONE | fixture S5 ใหม่ bbox [100.5035, 13.696, 100.5245, 13.740] z13–14 · 5 tile · 1,220,152 B · มีเส้น river "แม่น้ำเจ้าพระยา" ~2.7 km ในกรอบ 390×844 · build ซ้ำ sha256 ตรง · config.json ยังเก่า → X43 |
| P2-X43 | F02 | (จาก P2-H44) tools/tiles/config.json รายการ s5-chaophraya → center [100.514, 13.718], bbox [100.5035, 13.696, 100.5245, 13.740], minzoom 13, maxzoom 14 (zoom 14) + README.md 5.1 แถว s5 และยอดรวม · tools/tiles/test/run.sh ผ่านด้วย config ที่ commit | fix | location-engineer | P2-H44 | `tools/tiles/config.json`, `tools/tiles/README.md` | DONE | tools/tiles/config.json s5 ตรง manifest · README 5.1 แถว s5 + รวม 28 ไฟล์ 2,365,844 B · tiles run.sh 71/71 · lint:config 0 error |
| P2-X44 | F04–F06 | (tech gate F06 TG-01) prettier --write qa/tests/F04/session-checkin-lifecycle.test.ts + 6 ไฟล์ใน qa/tests/F06/ (รายการใน docs/reviews/F06-tech-gate.md §3) จน `pnpm lint` exit 0 · แก้ comment it.fails ที่ล้าสมัยบรรทัด ~41 ของ session-checkin-lifecycle ได้ | fix | qa-tester | P2-F06-T20 | `qa/tests/F04/session-checkin-lifecycle.test.ts`, `qa/tests/F06/` | DONE | prettier 7 ไฟล์ qa · prettier --check . ทั้ง repo สะอาด · comment BUG-P2-002 แก้แล้ว · vitest 36/36 · eslint แดง 1 จุดใน apps/client/src/ui/checkin-status.ts (งาน X42 ที่กำลังทำ ไม่ใช่ของ qa) |
| P2-H45 | F04, F06 | (tech gate F06) tech note F04 15.2/15.3 ย้าย positionLogTtl_s เป็น Group B (D-135) · tech note F06 8.1 (แยก key ตั้งค่า, runClientStats อยู่ในหน่วยความจำ) และ 9.2 ข้อ 4 (D-136) | spec | tech-lead | P2-F06-T20 | `docs/tech/F04-dungeon-presence.md`, `docs/tech/F06-hp-damage-onboarding.md` | DONE | tech note F04 15.2/15.3 positionLogTtl_s → Group B (D-135) · F06 8.1 kw.p2.settings.<name> แยก key + runClientStats ในหน่วยความจำ, 9.2 ข้อ 4 (D-136), 8.5 ใหม่ gesture จอพก (D-134 คำนวณตอน pointerdown) |
| P2-H46 | F06 | (tech gate F06 ไม่บล็อก) TG-08 SVG sanitizer เป็น allowlist จริง (icon-glyph.ts:80-112) · TG-09 flag request-in-flight ใน wake-lock-controller.ts | fix | backend-programmer | P2-F06-T20, P2-X42 | `apps/client/src/assets/icon-glyph.ts`, `apps/client/src/assets/icon-glyph.test.ts`, `apps/client/src/feedback/` | DONE | icon-glyph.ts sanitizer เป็น allowlist element + attribute (ลบทั้ง subtree) + test 9 กลุ่ม + glyph จริง 30 ตัวยัง render · wake-lock-controller requestInFlight + 2 test · API เดิม · root vitest 2975 pass |
| P2-H47 | F06 | (tech gate F06 TG-14 ไม่บล็อก) vector hp-recovery.json + เคส pause ใน run-loop.json (tech note F06 13.5) | fix | systems-designer | P2-F06-T20 | `design/systems/test-vectors/`, `tools/sim/` | DONE | hp-recovery.json 16 vector + run-loop.json [30][31] pause (Grace/Suspended) สร้างจาก tools/sim · gen-vectors --check ผ่าน · tools/sim 115/115 · engine ตรง spec (regen 16/16) · evaluator ใน packages/shared ขาด → X45 (root vitest แดง 19) |
| P2-H48 | F06 | (จาก P2-H40) ia.md §3.6 เพิ่มหมายเหตุ override Phase 2: S-17/S-25 (report/help) ยังไม่มีจอ, S-24 นอกขอบเขต Phase 2 | spec | uiux-designer | P2-H40 | `design/ux/ia.md` | DONE | ia.md §3.6 หมายเหตุ Phase 2: S-17/S-25 กลับเป็นข้อบังคับ F09/Phase 3, S-24 เร็วสุด Phase 3 (F07), S-22 4 แถว |
| P2-X45 | F06 | (จาก P2-H47) packages/shared/src/formulas/vectors.test.ts: case hpAfterRegen + recoveryTime (ผ่าน hpAt/recoveredAt_ms ของ src/hp/regen.ts) + runLoop ที่มี pauses/pauseParams ตาม tools/sim/src/loop-pauses.ts (ควรขับผ่าน sessionStep ที่ออกนอก dungeon จริง) · root vitest กลับมาเขียว (ตอนนี้แดง 19) | fix | backend-programmer | P2-H47 | `packages/shared/src/formulas/`, `packages/shared/src/session/` (test เท่านั้น) | DONE | vectors.test.ts + hpAfterRegen, recoveryTime, runLoop pauses (withPauses) · A-P2-H47-1/2/3 ยืนยัน · ไม่แก้ engine/vector · vectors 455 pass · root vitest 2934 pass |
| P2-H49 | F06 | (จาก P2-X42) ยืนยัน/แยกสี .gps-pill ตาม GpsDisplayState (ตอนนี้ใช้ state.danger แบบเดียว, A-P2-X42-1) + ตาราง map reason → icon ของแถว check-in (A-P2-X42-3) + ปุ่ม .btn-fullwidth-bottom อยู่ใน flow ไม่ pin (A-P2-X42-4) · ถ้าต้องแก้ client เขียน handoff | spec | uiux-designer | P2-X42 | `design/ux/components.md` | DONE | components.md 2.1 ตารางสี .gps-pill (searching=info, อื่น=danger), 13.3 ตาราง icon check-in (โค้ดถูกแล้ว), 3.4 .btn-fullwidth-bottom sticky · handoff client (ไม่บล็อก) → ส่งเข้า X41 |
| P2-H50 | F04–F06 | (plan-sync W16 O-12) ตัดสินว่า onboarding_nearest_dungeon_distance และ run_gps_status_changed ต้องมีก่อน playtest หรือเลื่อนเฟส (บันทึกใน telemetry-events.md) + รับทราบ A-P2-H45-1 (page_hidden/wake_lock bucket นับขาดเมื่อ reload) และผลต่อแผนวิเคราะห์ · ถ้าต้องมี handoff ถึง gameplay พร้อม field ครบ (→ X48) | spec | product-manager | P2-F06-T20, P2-H45 | `product/telemetry-events.md`, `product/playtest/phase-2-plan.md` | DONE | run_gps_status_changed ต้องมีก่อน playtest → X48 · onboarding_nearest_dungeon_distance ไม่ต้องมีก่อน playtest (ก่อนเปิดตัวระดับภูมิภาค) · A-P2-H45-1 รับทราบ (bucket เป็นขอบล่าง, observer จด reload) · telemetry-events.md + phase-2-plan.md |
| P2-RISK-02 | ทั้ง phase | (plan-sync W16 O-08) ลงความเสี่ยง R-W16-1..8 จาก plan-sync-w16.md หัวข้อ 4 ใน studio/risks.md + ทบทวน top 6 | plan | producer | — | `studio/risks.md` | DONE | studio/risks.md 4.4 R-W16-1..8 + top 6 ใหม่ (งานสนามคน, gate รอบ 2 escalate, X41 ใหญ่, jitter, Wake Lock, ผู้ร่วม playtest) · ทบทวน R-W16-3/6 หลัง X41 |
| P2-X48 | F06 | (จาก P2-H50, plan-sync O-02) ยิง run_gps_status_changed {status: searching/off/denied/low_accuracy/offline/restored, context: onboarding/map/run} ทุกครั้งที่สถานะ LocationProvider เปลี่ยน (ไม่ debounce) ตามสเปกใน product/telemetry-events.md §3 · envelope กลาง · ไม่มีพิกัด/accuracy · unit test + e2e ใน export · telemetry contract ของ client | fix | gameplay-programmer | P2-H50, P2-X41 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | telemetry/gps-status-events.ts (map + wireGpsStatusTelemetry, catch-up ตอน wire) + 19 test รวม integration sink→export · main.ts wire · unsupported→denied, suspended→restored (A-P2-X48) · e2e ผ่าน export ยังทำไม่ได้เพราะไม่มีปุ่ม download export · client vitest 898, e2e 50/50 · ไม่แตะภาพ |
| P2-X47 | F06 | (plan-sync O-11) รายการไม่บล็อกที่ X41 ไม่ได้ทำ: C6-06 chip ระยะเส้นตรงข้าง home.farBody, C6-07 formatter เวลาที่ผ่านมา (unit.yesterday) + หัว run.summary.* ในรายการ run ล่าสุด + ซ่อนชื่อ dungeon ที่ resolve ไม่ได้, TG-11 DEFAULT_STALE_AFTER_MS/SAFETY_CUE_IDS ใน assets/audio.ts เข้า config/app/client.json#feedback + ผลจาก H51 · (copy gate รอบ 2 N2-02) toast อื่นทับ run.screenLockNotice ใน 4 วินาทีแรก (ทาง B) · (tech gate รอบ 2) R2-N2 canClear เป็น required + แก้ call site ใน qa/tests/F06/clear-local-data-integration.test.ts ผ่าน handoff ถึง qa (ส่ง () => true) · R2-N3 prefix test import key จริงแทน literal 4 ตัว · R2-N4 comment pocket-screen.ts:71 · (จาก H51) ตามสเปก components.md §6.1/§13.8 + flow F06 §20: icon.ui.recovering บน recovering banner, chip ระยะบรรทัดใหม่ใต้ home.farBody (แบบ nav-panel.ts#setDistance), recent-run "{title} · {name} · {time}" ด้วย runSummaryHeaderKey + formatPastTime ใน dungeons/open-time.ts + isResolvedDungeonName · (จาก X51) แก้ comment settings-menu.ts:28-30 ที่บอกว่า key ยังไม่มี · (จาก H54) toggle ตั้งค่าตาม §9.1 (V-42) · copy จริงของ follow toggle เมื่อ narrative ส่ง key · (จาก H55) ตรวจว่า Mock loop=1 ที่วน trace กลับไปจุดเริ่มนอก polygon ทำให้ run จบด้วย run.summary.clockInvalid เป็นบั๊กหรือไม่ · (visual gate รอบ 3) V-40 (รวมวงกลมเปล่าในภาพ 01), V-41, V-42 + เพิ่มกรณี run.hpLow และ reduced-motion ใน toast-position.spec.ts · (DG6-05) ยืนยันว่า clock_invalid จาก Mock loop=1 มาจาก timestamp ถอยหลังตอนวน trace ไม่ใช่ตำแหน่งกระโดด ถ้าเป็นตำแหน่งกระโดดส่งกลับ game-director ก่อน playtest · (design gate รอบ 2 ข้อสังเกตภาพ) .confirm-hp-note ใช้สีเตือนตาม token (art-director ตัดสินรอบ content ถัดไป) | fix | gameplay-programmer | P2-H51, P2-F06-T24 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | DG6-05: สาเหตุคือ timestamp ถอยหลังใน createMockGameClock เมื่อ Mock วน lap (ไม่ใช่ตำแหน่งกระโดด) แก้ให้ now() ไม่ลด (Mock เท่านั้น) · R2-N2/N3/N4 · icon.ui.recovering, chip ระยะ, recent-run line + formatPastTime · TG-11 เข้า client.json#feedback · N2-02 · V-40/V-41/V-42 · toast-position เพิ่ม hpLow + reduced-motion · root vitest 3113, e2e 106/106 · ไม่ทำ: สีของ .confirm-hp-note (รอ art-director รอบ content ถัดไป → backlog Phase 3) |
| P2-H51 | F06 | (จาก P2-X41) ยืนยันตำแหน่ง recovering-banner.ts (บนสุด ใต้ #network-banner, แสดงทุกสถานะ home รวม near) + รายละเอียด C6-06 (ตำแหน่ง chip ระยะ) และ C6-07 (map หัว run.summary.* ในรายการ run ล่าสุด) · client → handoff ถึง X47 | spec | uiux-designer | P2-X41 | `design/ux/components.md`, `design/ux/flows/F06-hp-damage-onboarding.md` | DONE | components.md §6.1 recovering banner ยืนยัน (.banner.info ใต้ #network-banner) + ต้องมี icon.ui.recovering · §13.8 chip ระยะเป็นบรรทัดใหม่ใต้ body · flow F06 §20 recent-run = runSummaryHeaderKey + formatPastTime (today/yesterday/onWeekday) + ซ่อนชื่อที่ resolve ไม่ได้ · handoff → X47 |
| P2-X50 | F06 | (orchestrator ตรวจหลัง X48) ปุ่ม export telemetry ในแอปสำหรับผู้ร่วม playtest: แถวในเมนูตั้งค่า → ดาวน์โหลดไฟล์ summary/JSONL จาก buildTelemetryExport ผ่าน Blob/anchor (C2-2, phase-2-plan.md แถว 'ไฟล์ export ต่อเครื่อง') · ไม่มีพิกัด · ใช้ได้ทั้ง Web และ Mock · copy key ใหม่ถ้าจำเป็น handoff narrative | fix | gameplay-programmer | P2-X48 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | telemetry/download.ts (Blob/anchor, ชื่อไฟล์ kw-p2-telemetry-<8hex>.jsonl, guard พิกัด) + test · settings-menu แถว .settings-menu-export · e2e telemetry-export.spec.ts (download จริง, มี onboarding_first_reward_granted, ไม่มีพิกัด) · client vitest 905, e2e 52/52 · key settings.exportLink ยังไม่มี → X51 · (X50 รายงานผิดว่า run_gps_status_changed ยังไม่ wire — orchestrator ตรวจแล้ว main.ts:367 wire แล้ว) |
| P2-X51 | F06 | (จาก P2-X50) เพิ่ม key settings.exportLink (label ≤ 20 cells, register เดียวกับแถวเมนูตั้งค่าอื่น) ใน copy.th.json · ตอนนี้แถวแสดง key ดิบ | fix | narrative-designer | P2-X50 | `config/content/copy.th.json` | DONE | settings.exportLink = "ส่งออกบันทึกการเล่น" (label 15 cells, เลี่ยงคำว่า ข้อมูล ไม่ให้เข้าใจว่ามีตำแหน่ง) · comment settings-menu.ts:28-30 ล้าสมัย → X47 |
| P2-H52 | F05 | (จาก P2-H41) trace e2e ใน dungeon จริงที่เปิดอยู่ ที่เดินไม่ถึง gate ครบหนึ่งหน้าต่าง rewardTickInterval_s ระหว่าง run (ให้เห็น toast tick-denied) สำหรับภาพ 11-toast-tick-denied · หมายเหตุ: 06-confirm-b2-overlap ถ่ายไม่ได้เพราะไม่มี dungeon ที่ซ้อนกันจริงในข้อมูล (art-director ตัดสินใน T23) | fix | location-engineer | P2-H41 | `data/gps-traces/synthetic/`, `data/gps-traces/README.md` | DONE | synthetic-tick-denied-leelawadee-01 (tools/traces seed 601) · replay sessionStep: denied #0, granted #1/#2 ทุก class และ confirm delay 0–150 s · Mock URL ใน README §7 · แก้ tools/traces + packages/location test count นอก writes แต่เป็นพื้นที่ของ location (A-P2-H52-1 ยอมรับ) · root vitest 3059 pass · ภาพ 11-toast-tick-denied ให้ qa ถ่ายถ้า art-director ต้องการ |
| P2-X52 | F04–F06 | (visual gate รอบ 2, D-140 fix รอบแคบ) ตามค่าใน art/reviews/F04-F06-visual-gate.md §7.3: R2-1 .toast จัดกลางด้วย left:0; right:0; margin-inline:auto; width:max-content ไม่มี transform ใน CSS · R2-2 ห่อ .run-bar + .hp-bar ใน .run-top-stack (flex column) ไม่ให้แถบ Grace ถูกบัง · R2-3 ลบ background จาก .btn-fullwidth-bottom (ย้ายไปแถบ sticky ถ้าต้องมี) ให้ปุ่มหลักเป็นสีเหลือง · R2-4 #follow-toggle เป็น .btn .btn-secondary มุมขวาบน ซ่อนระหว่าง run · R2-5 .run-state-pill 16 px · V-44/V-46 ในรอบเดียวกัน | fix | gameplay-programmer | P2-F06-T23 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | R2-1 .toast จัดกลางไม่มี transform (D-141) + e2e toast-position.spec.ts วัดระหว่าง animation · R2-2 .run-top-stack · R2-3 .screen-bottom-bar sticky ปุ่มเหลือง · R2-4 #follow-toggle .btn-secondary มุมขวาบน ซ่อนระหว่าง run · R2-5 pill 16 px · V-44 direction-label nowrap · V-46 hp-bar hidden ตอน mount · vitest 905, e2e ทั้งสองชุด 96/96 |
| P2-H53 | F06 | (visual gate รอบ 2 R2-1) ยืนยันว่า art/vfx ถือ transform ของ .toast 100% (แบบ D-137) + comment หัวไฟล์ tick-feedback.ts / hp-critical.ts | review-gate | vfx-animator | P2-F06-T23 | `art/vfx/` | DONE | ยืนยัน art/vfx ถือ transform ของ .toast (D-141) · keyframe ทุกชุดเริ่ม/จบที่ identity ไม่มี -50% · comment หัวไฟล์ + art/vfx/specs/tick-feedback.md, hp-critical.md · tsc ผ่าน |
| P2-H54 | F06 | (visual gate รอบ 2 R2-3/R2-5) components.md บรรทัด ~145/149: bg.paper อยู่บนแถบ sticky ไม่ใช่ตัวปุ่ม · 13.2 run-state pill 16 px · ตัดสินรูปทรง toggle (V-42 ไม่บล็อก) | spec | uiux-designer | P2-F06-T23 | `design/ux/components.md` | DONE | components.md §3.4 .screen-bottom-bar sticky ถือพื้นหลัง ปุ่มคงสี primary · §13.2 pill 16 px min-height 32 · §13.10 #follow-toggle · §9.1 toggle ตั้งค่า (V-42) · handoff narrative: คำจริงแทน client.mapSpike.followModeOn/Off (ไม่บล็อก → X47 รอบ copy) |
| P2-H55 | F04–F06 | (visual gate รอบ 2 §7.9) หลัง X52: ถ่ายใหม่ 10, 12 (HP ต่ำระหว่าง run ยังเดิน), 09 (+09b suspended ถ้าไปถึง), 15, 01 (far จริง, V-45), 02 (≥ 300 ms หลังตั้งทิศ, V-43), 08, 11 (trace synthetic-tick-denied-leelawadee-01) พร้อมคู่ -gray | test | qa-tester | P2-X52, P2-H53, P2-H54 | `art/reviews/screens/F04-F06/`, `qa/tests/e2e/visual/` | DONE | ถ่ายใหม่ 01, 02, 08, 09, 10, 11 (ครั้งแรก จาก trace H52), 12, 15 + gray จาก build 41a1125 · 09b ไปไม่ถึง (ไม่มี trace) · 12-hp-low ได้ช่วงก่อนจอสรุปแค่ ~348 ms (ไม่ถึง 700 ms) เพราะ HP ต่ำกับถอยเกิด hit เดียว — README §7.5 · script กรองตาม id + merge ผล · → H57 location, loop=1 ทำ clock_invalid → X47 |
| P2-H56 | F06 | (จาก P2-F06-T21) เลือก dungeon นำร่อง 1 แห่งที่ level_range.min > 1 และเปิดในช่วง D-093 สำหรับสคริปต์เดินทีม F06-C32 (qa/plans/F06-test-plan.md §8) | spec | level-designer | P2-F06-T21 | `data/dungeons/notes/` หรือ `design/levels/` (ไฟล์บันทึกใหม่) | DONE | design/levels/F06-C32-team-walk-dungeon.md · หลัก mahakan-fort (20–30, 06:00–18:30) สำรอง pak-khlong-talat (10–25) · ช่องว่างเลเวล 9–19 → auto-retreat ราว 1.2 นาที แจ้ง 30% กับ 25% อาจเกิดใน hit เดียวกัน · ไม่แตะข้อมูล |
| P2-H57 | F04–F06 | (จาก P2-H55) trace 2 ชุด: (ก) dungeon จริงที่เปิด เข้าผ่าน confirm แล้วออกนอก polygon ต่อเนื่องเกิน graceMax_s (ภาพ 09b suspended) (ข) dungeon ระดับ 1 ไม่ loop ที่ทำให้ HP อยู่ในช่วงเตือนโดยยังไม่ถอยนาน ≥ 700 ms ที่ speed=60 (ภาพ 12-hp-low รอบหน้า) | fix | location-engineer | P2-H55 | `data/gps-traces/synthetic/`, `data/gps-traces/README.md`, `tools/traces/`, `packages/location/test/` | DONE | synthetic-suspended-leelawadee-01 (Grace 465 → Suspended 645 → กลับ 1015 s, ทุก class) + synthetic-hp-low-leelawadee-01 (tanker seed 15 อยู่ ≤ 30% นาน 6.17 s จริงที่ speed=60) · Mock URL ใน README §7 · root vitest 3079 · พบ run_tick_denied tickIndex 0 ซ้ำตอนกลับจาก Suspended → X54 backend |
| P2-X53 | F06 | (design gate F06 DG6-01 บล็อก) dungeon-confirm.ts แสดง dungeon.confirmHp ทุกครั้ง (จาก selectPlayerView), dungeon.confirmLowHpNote เมื่อ HP ≤ autoRetreatThreshold_pct และ auto-retreat เปิด, run.autoRetreatOffBadge (.banner.warn) เมื่อปิด auto-retreat · ไม่ปิดปุ่ม "เข้า" · + DG6-03 เปิดจอสรุปด้วย .finally ของ play('run.autoRetreat'/'run.death') (f04-app.ts:1285/1309) | fix | gameplay-programmer | P2-F06-T24 | `apps/client/` (ยกเว้น package.json), `config/app/client.json` | DONE | dungeon-confirm.ts แถว .confirm-hp ทุกครั้ง + .confirm-hp-note (HP ≤ threshold, auto-retreat เปิด) หรือ .confirm-auto-retreat-off-badge (.banner.warn) · ปุ่มเข้าไม่ถูกปิดด้วย HP · DG6-03 .finally · unit + regression test · root vitest 3086 pass, lint สะอาด, e2e ที่เกี่ยวข้องผ่าน |
| P2-H58 | F06 | (design gate DG6-01/DG6-02) หลัง X53: e2e สองโปรเจกต์ 3 กรณี popup (HP เต็ม, HP ≤ 25% auto-retreat เปิด, auto-retreat ปิด) + ภาพ popup กรณี HP ต่ำใน art/reviews/screens/F04-F06/ · แก้ qa/plans/F06-test-plan.md 8.2–8.4 เพิ่มการตรวจคำเตือน 30% แยก (regen นอก run ให้เกิน 30% แล้วเข้า dungeon ในช่วงเลเวล) และเกณฑ์ผ่านตาม R16 · (จาก H57) ใน capture script ชี้ reach09bRunSuspended ไป trace synthetic-suspended-leelawadee-01 และ reach12HpLow ไป synthetic-hp-low-leelawadee-01 (tanker seed 15) แล้วถ่าย 09b + 12 (รอ ≥ 700 ms) · (จาก H60) เพิ่มหัวข้อ 2b ใน qa/playtest/phase-2-observer-form.md ตามฟิลด์ใน product/playtest/phase-2-plan.md §11.3 (dungeon, level_range, เลเวลผู้เล่น, ครอบ/ไม่ครอบ, เลือกเข้าเอง, สรุปจำนวน) | test | qa-tester | P2-X53 | `qa/tests/e2e/`, `qa/plans/F06-test-plan.md`, `art/reviews/screens/F04-F06/`, `qa/tests/e2e/visual/`, `qa/playtest/phase-2-observer-form.md` | DONE | qa/tests/e2e/f06-confirm-hp-notice.spec.ts 3 สถานะ 6/6 สองโปรเจกต์ + fixture 3 ไฟล์ · ภาพ 05 ถ่ายใหม่, 05b ใหม่, 09b ครั้งแรก, 12 รอครบ 700 ms · ยืนยัน X54 ไม่มี toast denied ตอนกลับ · test plan §8 ตาม D-143 + dungeon C32 · ฟอร์มผู้สังเกต §2b · root vitest 3086, e2e 102/102 |
| P2-H59 | F06 | (design gate DG6-02) แก้ design/levels/F06-C32-team-walk-dungeon.md หัวข้อ 0: hit เดียวที่ข้ามทั้ง 30% และ 25% แสดงแค่ auto-retreat เป็นพฤติกรรมที่ถูกต้อง (F06-R16, D-143) ไม่ใช่บั๊ก | fix | level-designer | P2-F06-T24 | `design/levels/F06-C32-team-walk-dungeon.md` | DONE | F06-C32-team-walk-dungeon.md §0 ตรง R16/D-143 · บั๊กจริง = hit ข้าม 30% โดยไม่ถึง 25% แล้วไม่มีคำเตือน · ชี้ไป qa plan 8.2–8.4 |
| P2-H60 | F06 | (design gate DG6-04) แบบสอบถาม P2-F06-T19 บันทึกต่อ run ว่าช่วงเลเวลครอบผู้เล่นไหม และผู้เล่นเข้า dungeon นอกช่วงเองบ่อยแค่ไหน · kit/ฟอร์มผู้สังเกต (P2-F06-T18, qa) ต้องเพิ่มช่องเดียวกัน → handoff qa | spec | product-manager | P2-F06-T24 | `product/playtest/phase-2-questionnaire.md`, `product/playtest/phase-2-plan.md` | DONE | telemetry ไม่มีเลเวลต่อ run → ผู้สังเกตบันทึก §2b เป็นหลัก · แบบสอบถามข้อ 5.7 + หมายเหตุ D-143 · plan §2/§5/§6.3/§11.3/§12.3 · handoff qa: ฟอร์มผู้สังเกตเพิ่มหัวข้อ 2b → H58 |
| P2-X54 | F05 | (จาก P2-H57) บั๊ก engine ที่สงสัย: trace synthetic-suspended-leelawadee-01 confirm ที่ 120–180 s → reducer ยิง run_tick_denied tickIndex 0 ตอนกลับจาก Suspended (backdated 1015 s) ทั้งที่ tick #0 grant ไปแล้วที่ 420 s (confirm ≥ 240 ไม่เกิด) · หาสาเหตุ (rewardScratch/k รีสตาร์ต?) แก้ + regression test ผ่าน sessionStep · ห้ามแก้ vector ให้ตรง engine | fix | backend-programmer | P2-H57 | `packages/shared/src/session/`, `packages/shared/src/reward/`, `packages/shared/src/run/` | DONE | บั๊กจริง: feedScratch เริ่ม rewardScratch ใหม่ที่ k 0 แทนที่จะต่อหน้าต่างของ main (ขัด tech note F05 §3.5) → ยิง run_tick_denied tickIndex 0 ซ้ำตอนกลับจาก Grace/Suspended · แก้ด้วย gateAccumulatorResume(run.reward) ใน reward/gate.ts + regression test ใน reducer.test.ts (ล้มก่อนแก้ ผ่านหลังแก้) · vector ไม่แก้ · packages/shared + tools/traces + qa F04 841 pass · typecheck/lint สะอาด |
| P2-H61 | ทั้ง phase | (จาก P2-CLOSE-QA interim, ต่อ H37) เพิ่มแถว metadata 8 trace ใน data/gps-traces/README.md §6.1: qa-gate-bench-jitter-01, qa-gate-boundary-01, qa-gate-normalwalk-gap-01, qa-gate-speedlock-01, qa-gate-still-01, qa-gps-gap-2min, qa-gps-jump-01, qa-e2e-khlong-ong-ang-closed-01 | fix | location-engineer | P2-CLOSE-QA | `data/gps-traces/README.md` | DONE | README §6.1 + 8 แถว (คำนวณจากไฟล์) · ทั้ง 8 synthetic ไม่มีข้อมูลเดินจริง |
| P2-X55 | F06 | (CI 4d29ada แดง) qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts ล้มบน ios-safari และ flaky บน android-chrome ใน runner ubuntu (suite 6.3 นาที เทียบกับ 2.0 นาทีในเครื่อง) · ให้เสถียรโดยไม่ลดสิ่งที่ตรวจ: ใช้ trace synthetic-hp-low-leelawadee-01 (ช่วงเตือน 6.17 s ที่ speed=60) หรือลด speed, รอสถานะ DOM แทนการจับเวลา | fix | qa-tester | — | `qa/tests/e2e/` | DONE | verified: 50/50 ซ้ำ 5 รอบ 8 worker retry 0 · e2e 106/106 · lint+typecheck เขียว |
| P2-X56 | F06 | (CI 4d29ada flaky) apps/client/e2e/toast-position.spec.ts:161 (360/390 px, ios-safari) · ให้เสถียรบน runner ช้า: จับ boundingBox ระหว่าง animation ด้วยการรอ getAnimations() ที่ running แบบมี retry/timeout พอ ไม่พึ่งจังหวะเวลาแคบ · ยังต้องพิสูจน์ความกึ่งกลางระหว่างและหลัง animation | fix | gameplay-programmer | — | `apps/client/e2e/` | DONE | verified: 50/50 ซ้ำ 5 รอบ 8 worker retry 0 · e2e 106/106 · lint+typecheck เขียว |
| P2-X57 | F02 | (deploy-preview dry run แดง, Build tiles exit 1) source `build.protomaps.com/20260923.pmtiles` ตอบ 404 เพราะ Protomaps ลบ daily build เก่า · เลื่อน pin ไป 20260930 (metadata 4.15.2 เท่าเดิม) · tiles test อ่าน tileset id ของ fixture จาก manifest.json แทน buildKey | fix | orchestrator | — | `tools/tiles/` | DONE | verified: build.sh ในเครื่อง exit 0 PASS Pages Free budget (13,502 tile) · tiles test 71/71 |
| P2-X58 | F02 | ทำให้ tile build ไม่พังทุก ~7 วัน: pin daily build ของ Protomaps หมดอายุเร็ว · เสนอทางเลือก (เลือก build ล่าสุดที่ metadata version ตรงอัตโนมัติ, เก็บ archive สำเนาเองใน host ฟรี, หรือ planetiler) ใน ADR · ห้ามใช้บริการคิดเงิน (D-001) | adr | location-engineer | P2-X57 | `tools/tiles/`, `docs/adr/` | DONE | `docs/adr/0004-tile-source-build-selection.md` (PROPOSED), `tools/tiles/bin/resolve-build.sh` · tiles test 89/89 · build pin หายแล้วยังผ่าน, version ไม่ตรงยังล้ม |
| P2-H63 | F02 | (handoff จาก P2-X58) ตรวจและตัดสิน ADR 0004 (เลือก Protomaps build อัตโนมัติจาก builds.json, expectedMetadataVersion คือ pin จริง) · ถ้ารับ แก้ docs/tech/F02-map-location-spike.md หัวข้อ 5.1 และ F13 ให้ตรง | review-gate | tech-lead | P2-X58 | `docs/adr/0004-tile-source-build-selection.md` (เฉพาะ status), `docs/tech/F02-map-location-spike.md` | DONE | verdict PASS · ADR 0004 ACCEPTED · tech note F02 5.1/5.2/F13/16 |
| P2-X59 | F06 | (คนทดสอบ preview 2026-10-01) (1) age gate: ปีเกิดที่เลือกหายและ picker ของ iOS reset ระหว่างเลื่อน เพราะ render() เรียก showGate() ทุก state change แล้วสร้าง option ใหม่ + ตั้งค่าว่าง → reset เฉพาะตอนเปิดจอ (2) S-00-intro เหลือปุ่ม "เริ่มเกม" ปุ่มเดียว (D-144) | fix | orchestrator | — | `apps/client/`, `config/content/copy.th.json` | DONE | verified: unit 3,114 · e2e 106/106 · lint+typecheck · เลือกปีแล้วรอ 8 s ค่ายังอยู่ |
| P2-F10-T01 | F10 | Feature spec F10: account shell (login bypass Google/Apple + email login/register/forgot), ลำดับ onboarding ใหม่ D-149, จอสร้างตัวละคร D-146, เล่าเรื่อง 5 slide D-147, map หลัก + nav 5 ปุ่ม + Setting/logout D-148, migration ผู้เล่นเดิม · แก้ R36/R44/ข้อ 12 ของ spec F06 ให้ชี้ F10 · ร่างถ้อยคำแก้ GDD เรื่อง password (D-145) เข้า Q-P2-10 | spec | game-director | — | `design/features/F10-account-shell.md`, `design/features/F06-hp-damage-onboarding.md` (เฉพาะ R36, R44, หัวข้อ 8 ข้อ 12, change log), `design/reviews/gdd-wording-D-145.md` | DONE | `design/features/F10-account-shell.md` (R01..R52), `design/reviews/gdd-wording-D-145.md`, F06 R36/R44 ชี้ F10 |
| P2-H62 | F10 | (handoff จาก P2-F10-T01) แก้ design/pillars.md: (1) ข้อความตรวจ NN-4 เรื่องชื่อตัวละครตามคำตัดสิน 6 ของ spec F10 (2) 6.1 แถวนาที 0–1 ตามลำดับ D-149 (3) 6.2 ข้อยกเว้นจอเร็วๆ นี้ตามคำตัดสิน 8 (4) แถว F10 ในดัชนีหัวข้อ 8 · และแก้ข้อความ F06 R29, R42, R51, หัวข้อ 2 ข้อ 2, หัวข้อ 4 บรรทัด Onboarding, หัวข้อ 8 ข้อ 10 และ 14 ให้ตรง F10 | spec | game-director | P2-F10-T01 | `design/pillars.md`, `design/features/F06-hp-damage-onboarding.md` | DONE | `design/pillars.md` (NN-4 ข้อยกเว้นช่องชื่อ 4 เงื่อนไข, 6.1 ลำดับ D-149, 6.2 ข้อยกเว้นเร็วๆ นี้ 5 เงื่อนไข, ดัชนี F10), F06 R29/R42/R51 ชี้ F10 |
| P2-F10-T02 | F10 | Art direction ของ shell: icon nav 5 ปุ่ม + Setting + logout ตาม icon-grammar, สไตล์ภาพประกอบ slide เรื่อง 5 ภาพ, นโยบายปุ่ม Google/Apple (ไม่วาด logo แบรนด์เอง) | spec | art-director | — | `art/direction/F10-shell-direction.md`, `art/direction/icon-grammar.md` (เพิ่มหัวข้อ nav) | DONE | `art/direction/F10-shell-direction.md` (หัวข้อ 1–11), `art/direction/icon-grammar.md` 7.1.2 + 7.4 |
| P2-F10-T03 | F10 | เรื่องเล่า 5 slide (ย้าย onboarding.intro มาใช้ได้ · ปุ่ม "ถัดไป"/"ออกไปลุย!") + คลังชื่อสุ่ม + รายการคำไม่สุภาพสำหรับตัวกรองชื่อ | asset | narrative-designer | — | `config/content/copy.th.json` (เฉพาะ key `story.*`), `config/content/character-names.th.json` (ใหม่), `design/narrative/F10-story.md` (ใหม่) | DONE | `copy.th.json` story.* 14 key, `config/content/character-names.th.json` (ชื่อ 256 + fallback, blockedTerms 2 pass), `design/narrative/F10-story.md` · lint:copy exit 0 (WARN S1 area story → T11) |
| P2-F10-T04 | F10 | Config ตัวกรองชื่อตัวละคร: ความยาว (หน่วย grapheme), ชุดอักขระที่อนุญาต, ค่าจับรูปแบบเบอร์โทร/อีเมล/ลิงก์, กติกาสุ่มชื่อ + golden vector | build | systems-designer | — | `config/balance/character.json` (ใหม่), `design/systems/test-vectors/character-name.json` (ใหม่) | DONE | `config/balance/character.json`, `design/systems/test-vectors/character-name.json` (75 vector) · schema-missing รอ T07 |
| P2-H64 | F10 | (orchestrator พบ: key ไม่ตรงกันระหว่าง T03 กับ T04) ปรับ config/balance/character.json ให้อ้างโครงสร้างจริงของ config/content/character-names.th.json (randomName.heads/tails/fallback, blockedTerms: normalization + substring/substringHeavy/token/allow ตาม design/narrative/F10-story.md หัวข้อ 7 และ 9) แทน banned.th/banned.en/random.prefixes/cores/fallbacks · รวมวิธี fold ของสองงานเป็นแบบเดียว · อัปเดต test vector (fixture lexicon ตามโครงสร้างใหม่ + vector ที่ T03 เสนอในหัวข้อ 7) · ยืนยันว่าชื่อสุ่มทั้ง 256 + fallback ผ่านตัวกรอง | fix | systems-designer | P2-F10-T03, P2-F10-T04 | `config/balance/character.json`, `design/systems/test-vectors/character-name.json` | DONE | `config/balance/character.json` v2 (banned.passes/modes/allow), vector v2 116 check 0 mismatch · ชื่อสุ่ม 256/256 + fallback 6/6 ผ่าน |
| P2-F10-T05 | F10 | Telemetry events ของ F10 (login shown/method, age/consent ตามเดิม, character created, story completed, nav tab, coming soon, logout) + PRD addendum ตัวชี้วัด funnel | spec | product-manager | — | `product/telemetry-events.md` (หมวดใหม่ F10), `product/prd/F10-account-shell.md` (ใหม่) | DONE | `product/telemetry-events.md` §2b (8 event + funnel step 6 ค่า), `product/prd/F10-account-shell.md` |
| P2-F10-T06 | F10 | Flow F10 + wireframe HTML + component spec: เริ่มเกม → login/register/forgot → age → consent → permission → สร้างตัวละคร → เรื่อง 5 slide → map · bottom nav 5 ปุ่ม · coming soon · Setting + logout · กฎไม่บัง HUD run/จอพกกระเป๋า | spec | uiux-designer | P2-F10-T01, P2-F10-T02 | `design/ux/flows/F10-account-shell.md`, `design/ux/wireframes/F10-*.html`, `design/ux/components.md`, `design/ux/ia.md`, `design/ux/tokens.json`, `design/ux/flows/F06-hp-damage-onboarding.md` (หมายเหตุ superseded เท่านั้น) | DONE | `design/ux/flows/F10-account-shell.md` (หัวข้อ 0–13), wireframe `F10-01..06-*.html`, components.md 16, ia.md override F10, tokens type.title |
| P2-H68 | F10 | (orchestrator: wireframe F10 ใช้ emoji/ตัวอักษรเป็น placeholder ของ glyph ขัดกฎ "no emoji" ของ CLAUDE.md · icon จริงเสร็จแล้วใน T09) แทน placeholder ใน design/ux/wireframes/F10-*.html ด้วย SVG จริงจาก art/assets/icon/ui/ (อ้าง path หรือ inline) · ยืนยัน A-P2-F10-T06-4 กับ T02 | fix | uiux-designer | P2-F10-T06, P2-F10-T09 | `design/ux/wireframes/F10-*.html` | DONE | (done by orchestrator) emoji 22 จุดใน F10-03/F10-05 → img SVG จริงจาก art/assets/icon/ui · ตรวจแล้ว 0 emoji ทุกไฟล์ F10-*.html · A-P2-F10-T06-4 ให้ T21 ยืนยัน |
| P2-F10-T07 | F10 | Tech note F10: storage schema `kw.p2.account` + `kw.p2.character`, route ใหม่, ผลต่อ step machine ของ onboarding, migration ผู้เล่นเดิม, test hook/seed ของ e2e · schema config ใหม่ + subpath `./character` + allowlist telemetry F10 | spec | tech-lead | P2-F10-T01, P2-F10-T04, P2-F10-T05 | `docs/tech/F10-account-shell.md`, `docs/tech/F06-hp-damage-onboarding.md` (เฉพาะหัวข้อ 8), `config/app/privacy.json`, `config/app/telemetry.json`, `packages/shared/schemas/config/`, `packages/shared/package.json`, `tools/config-lint/` | DONE | `docs/tech/F10-account-shell.md` (หัวข้อ 1–11), schema character + character-names, config-lint rule character, `./character` subpath, `config/app/telemetry.json` f10Events, `config/app/privacy.json` localData · config-lint 0 error · lint/test แดงจากงานอื่นที่ค้าง (H65, T12, T14, T09) |
| P2-H65 | F10 | (handoff จาก P2-F10-T07) เพิ่ม `_source` ให้ banned.modes.{substring,token,substringHeavy} และ banned.allow.{light,heavy} ใน character.json · เพิ่ม `tolerance` ให้ vector ใน character-name.json ตามรูปแบบที่ packages/shared/src/formulas/vectors.test.ts และ tools/sim ต้องการ | fix | systems-designer | P2-F10-T07 | `config/balance/character.json`, `design/systems/test-vectors/character-name.json` | DONE | _source 5 object + tolerance 0 ให้ 116 vector · lint:config 0 error (5 STALE รอ tech-lead ลบ) |
| P2-H66 | F10 | (handoff จาก P2-F10-T07) แก้ข้อความ `account_logout` ใน product/telemetry-events.md เป็น "หลังปลดธง signedIn" (ไม่ลบ kw.p2.account ตาม spec R41) · ปิด A-P2-F10-T05-1/2/3 เทียบ tech note หัวข้อ 5 และ 8 | fix | product-manager | P2-F10-T07 | `product/telemetry-events.md`, `product/prd/F10-account-shell.md` | DONE | account_logout หลังปลดธง signedIn · ปิด A-T05-1/2/3/5 · ชื่อ event ตรง telemetry.json f10Events |
| P2-F10-T08 | F10 | Test plan F10 (flow ใหม่, ตัวกรองชื่อ, migration, logout, nav, PDPA, ไม่มี request ออกไปผู้ให้บริการ login) + รายการ e2e เดิมที่ต้องแก้ | spec | qa-tester | P2-F10-T01 | `qa/plans/F10-test-plan.md` | DONE | `qa/plans/F10-test-plan.md` (85 case, e2e impact 3 กลุ่ม) |
| P2-F10-T09 | F10 | Icon SVG: nav Inventory/Upgrade/Map/Shop/Party (ใช้ bag/map เดิมหรือทำรุ่น nav) + Setting + logout + coming soon ตาม T02 · ลง manifest | asset | artist-2d | P2-F10-T02 | `art/assets/icon/ui/` (ไฟล์ใหม่เท่านั้น), `art/assets/manifest.icon.json`, `art/assets/manifest.json` | DONE | 7 SVG ใน `art/assets/icon/ui/` + manifest.icon.json · art validate 0 error (V13 manifest เกินงบ → H67) · tools/art 51 test ผ่าน |
| P2-H67 | F10 | (handoff จาก P2-F10-T09) art validate WARN V13: art/assets/manifest.icon.json 63,458 B เกิน 61,440 B · แยก root ตามกลุ่มใน pipeline.config.json (manifestRoots) และย้ายรายการ icon ไปไฟล์ใหม่ตามกลุ่ม · validate ต้อง 0 error 0 warning ของ V13 · client ยังโหลด icon ได้ (pnpm test ของ apps/client/src/assets ผ่าน) | fix | tech-lead | P2-F10-T09 | `tools/art/pipeline.config.json`, `art/assets/manifest.icon.json`, `art/assets/manifest.icon.*.json` (ใหม่), `art/assets/manifest.json`, `tools/art/` | DONE | manifest icon แยกเป็น manifest.icon.{ui,item,ui16}.json · validate 0 error 0 warning · entry 57 ครบ sha เดิม |
| P2-F10-T10 | F10 | อนุมัติ flow F10 (แตะลำดับ onboarding ของ core loop) ก่อน build | review-gate | game-director | P2-F10-T06 | `design/reviews/F10-flow-approval.md`, `design/features/F10-account-shell.md` (แก้ถ้อยคำ R18 ตาม D-150 และผลคำตัดสิน D-156 เท่านั้น) | DONE | verdict PASS (attempt 3 ส่วน A) · `design/reviews/F10-flow-approval.md` · D-156 = bodySystem |
| P2-F10-T11 | F10 | Copy key ของจอ F10: login/register/forgot, error ของฟอร์ม, จอสร้างตัวละคร + ข้อความตัวกรอง + คำเตือนชื่อจริง, nav 5 ป้าย, coming soon, Setting/logout + confirm · ตัดสินที่อยู่ของ onboarding.intro/introTap (D-144) | asset | narrative-designer | P2-F10-T06, P2-F10-T03 | `config/content/copy.th.json`, `config/content/copy-rules.json`, `config/content/character-names.th.json` (เฉพาะ blockedTerms.normalization, H64) | DONE | (attempt 3 ส่วน A) 37 key: account.login*/email/register/forgot, character.* + nameError 11 reason · lint:copy มี FAIL 6 → แก้ใน H70 |
| P2-H69 | F10 | (แยกจาก P2-F10-T10 หลังหลุด 2 ครั้ง) ส่วน B ของ flow approval: แก้ spec R18 ข้อ 1 เป็น name.minGraphemes/maxGraphemes (D-150) · ยืนยัน A-P2-F10-T07-2 (ไม่มี Intl.Segmenter = fail-closed) | spec | game-director | P2-F10-T10 | `design/features/F10-account-shell.md` (R18 เท่านั้น) | DONE | R18 ใช้ minGraphemes/maxGraphemes · ยืนยัน fail-closed เมื่อไม่มี Intl.Segmenter (เหตุผลหลัก: ความปลอดภัยของตัวกรอง) |
| P2-H71 | F10 | (handoff จาก P2-F10-T10) flow F10: (N1) ลบบรรทัดค้าง "F4-note-continued: (ดูต่อด้านล่าง)" ราวบรรทัด 140 (N2) Flow D ข้อ D2 ให้ slide 4 อ่าน story.slide4.bodySystem เป็น key เดียว เลิกใช้ป้ายชื่อผู้พูด (D-156) · แก้ wireframe F10-04-story.html ให้ตรง | fix | uiux-designer | P2-F10-T10 | `design/ux/flows/F10-account-shell.md`, `design/ux/wireframes/F10-04-story.html` | DONE | flow N1 ลบบรรทัดค้าง, N2 slide 4 = bodySystem คีย์เดียว · wireframe F10-04 ตรง D-156 |
| P2-H70 | F10 | (แยกจาก P2-F10-T11 หลังหลุด 2 ครั้ง) ส่วน B ของ copy: nav 5 ป้าย, comingSoon.*, settings.logout* + confirm, area ใหม่ใน copy-rules.json#areas, character-names.th.json (pointer + _source 8 object + ยืนยัน A-P2-H64-1/2) | asset | narrative-designer | P2-F10-T11 | `config/content/copy.th.json`, `config/content/copy-rules.json`, `config/content/character-names.th.json` | DONE | (ส่วนท้าย done by orchestrator) lint FAIL 6 แก้แล้ว, area ใหม่, nav/comingSoon, settings.logout* 6 key, character.unsupportedBrowser, character-names: prose → pointer + _source 8 object · lint:copy exit 0 · lint:config 0 error (13 STALE) · A-P2-H64-1/2 ยังไม่มี narrative ยืนยัน → T20 |
| P2-F10-T12 | F10 | โมดูล pure: ตัวกรองชื่อ + สุ่มชื่อ (`packages/shared/src/character`) ผ่าน vector ของ T04 · step machine onboarding ลำดับใหม่ D-149 + migration (`apps/client/src/onboarding/`) | build | backend-programmer | P2-F10-T07, P2-F10-T04, P2-F10-T03, P2-H64 | `packages/shared/src/character/`, `apps/client/src/onboarding/`, `packages/shared/src/formulas/vectors.test.ts` (ลงทะเบียน evaluator เท่านั้น), `tools/sim/src/` (evaluator ของ character-name เท่านั้น) | DONE | `packages/shared/src/character/` + test 121, step machine D-149 `apps/client/src/onboarding/onboarding-step.ts` + test 44 · vectors 554/554, sim 116/116 · root typecheck แดงที่ onboarding-flow.ts/f04-app.ts (T14) และ qa/tests/F06 (T16) |
| P2-F10-T13 | F10 | ภาพประกอบ SVG slide เรื่อง 5 ภาพ ตาม T02 + ข้อความ T03 + ขนาดจาก wireframe T06 · ลง manifest | asset | artist-2d | P2-F10-T02, P2-F10-T03, P2-F10-T06 | `art/assets/illus/` (ไฟล์ `story-*` ใหม่), `art/assets/manifest.illus.json`, `art/assets/manifest.json` | DONE | `art/assets/illus/story/slide-1..5.svg` (รวม 20,666 B) + manifest.illus.json · validate 0/0 · status draft |
| P2-F10-T14 | F10 | Build 1: จอเริ่มเกม → login (Google/Apple/email) + register + forgot แบบ bypass, `kw.p2.account`, ต่อ step machine ใหม่เข้า onboarding-flow ถึงขั้น permission, migration, e2e ใน apps/client ให้ผ่านกับ flow ใหม่ | build | gameplay-programmer | P2-F10-T07, P2-F10-T10, P2-F10-T11, P2-F10-T12, P2-F10-T02, P2-H70 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | login-screen, storage account/character, nav/routes, e2e-skip-seed, onboarding-flow rewire, f04-app · client unit 1028, e2e apps/client 62/62, qa e2e 23/23 · root typecheck แดงเฉพาะ qa/tests/F06 (T16) |
| P2-F10-T15 | F10 | Build 2: จอสร้างตัวละคร (class + ชื่อ + ตัวกรอง + สุ่ม + คำเตือน + ปุ่มสร้าง) แทน class sheet เดิม + เรื่อง 5 slide → map · telemetry F10 ส่วนนี้ | build | gameplay-programmer | P2-F10-T14, P2-F10-T13 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | create-character-screen + story-screen แทน class-select, onboarding-flow createCharacter/story, telemetry F10 · unit 3483, e2e apps/client 68/68 |
| P2-F10-T16 | F10 | แก้ e2e เดิมใน qa/tests/e2e (และ script ถ่ายภาพ visual) ที่พังเพราะมีขั้น login ใหม่ ใช้ seed/test hook ของ tech note โดยไม่ลดสิ่งที่ตรวจ | fix | qa-tester | P2-F10-T14, P2-F10-T08 | `qa/tests/e2e/`, `qa/bugs.md`, `qa/tests/F06/onboarding-first-reward-and-teach-lock.test.ts` (ปรับตาม OnboardingStepInput ใหม่, T12) | DONE | qa/tests/F06 test ใช้ OnboardingStepInput ใหม่, capture script ผ่าน login · root typecheck + test 3457 ผ่าน · qa e2e 46/46 |
| P2-F10-T17 | F10 | Build 3: map เป็นหน้าหลัก + bottom nav 5 ปุ่ม + route coming soon (Upgrade/Shop/Party) + Setting มุมบนขวา (ตั้งค่า + ออกจากระบบ) · nav ไม่บัง HUD run/จอพกกระเป๋า · telemetry F10 ส่วนที่เหลือ | build | gameplay-programmer | P2-F10-T15, P2-F10-T09 | `apps/client/` (ยกเว้น `apps/client/package.json`), `config/app/client.json` | DONE | bottom-nav, setting-button-float, coming-soon-screen, account/logout, route guard รวมที่ nav/routes.ts, e2e f10-nav-shell 11×2 · test 3517 · e2e ทั้งชุด 68/68 ×2 project |
| P2-H72 | F10 | (handoff จาก P2-F10-T17) ตั้ง tintable: true ให้ icon.ui.bag, enhance, map, market, party, settings, logout, coming-soon ใน art/assets/manifest.icon.ui.json ถ้า SVG ใช้ currentColor จริง (ตรวจแต่ละไฟล์) เพื่อให้ glyph ของแท็บ active เปลี่ยนสีตาม components.md 16.1 · validate 0/0 | fix | artist-2d | P2-F10-T17 | `art/assets/manifest.icon.ui.json` | DONE | tintable คำนวณอัตโนมัติตอน stage (ไม่ใช่ field ใน manifest) · ทั้ง 8 icon ได้ tintable=true อยู่แล้ว · บันทึกใน notes · validate 0/0 · ที่ T17 เห็นน่าจะเป็น build เก่า |
| P2-X60 | F10 | (tech gate T18 F-01..F-03) F-01 ลบ 13 STALE + H64_SOURCE/T03_SOURCE ใน tools/config-lint/src/allowlist.ts ให้ lint:config 0 allowed 0 stale · F-02 docs/tech/asset-delivery.md manifest.<root>.json → manifest.<key>.json (บรรทัด 24,33,75,76,235,245,295) + เขียน 10.1 ใหม่ (P2-H67) · F-03 docs/tech/F10-account-shell.md: บรรทัด 22 randomCharacterName throw และจอจับไว้, บรรทัด 208 ไม่มี <form>, 9.1 เพิ่มข้อ 3 (chooseLoginMethod ใต้ e2e hook เขียน account ทันที) | fix | tech-lead | P2-F10-T18 | `tools/config-lint/src/allowlist.ts`, `docs/tech/asset-delivery.md`, `docs/tech/F10-account-shell.md` | DONE | allowlist ว่าง (lint:config 0 allowed 0 stale) · asset-delivery.md manifest.<key>.json + 10.1 · tech note F10 บรรทัด 22/208/9.1 ข้อ 3 |
| P2-X61 | F10 | (tech gate T18 F-04) เพิ่ม token zIndex ชื่อใหม่ 2 ระดับใน design/ux/tokens.json#zIndex: 35 (จอเต็มที่มี nav เช่น inventory/coming soon) และ 38 (nav/Setting) ลำดับ toast 30 < 35 < 38 < popupModal 40 + อธิบายใน design/ux/components.md หัวข้อ 15 | fix | uiux-designer | P2-F10-T18 | `design/ux/tokens.json`, `design/ux/components.md` | DONE | tokens zIndex.navScreen 35, zIndex.nav 38 · components.md 15.1/15.3/15.5 + 16.2 · D-160 ACCEPTED · prettier ผ่าน |
| P2-X62 | F10 | (tech gate T18 F-05) apps/client/src/onboarding/e2e-skip-seed.ts:17–28 ให้หาชื่อผ่าน character.json#random.fallbackKey (resolveStringList + balanceCharacterNameParamsConfig) ลบ literal 'player' (รายการว่าง = throw) + unit test · อัปเดต comment ใน apps/client/src/app.css (ราวบรรทัด 1492–1514, 1573) ให้อ้างชื่อ token zIndex ใหม่จาก X61 | fix | gameplay-programmer | P2-F10-T18, P2-X61 | `apps/client/` (ยกเว้น apps/client/package.json) | DONE | (agent หลุดตอนรัน test หลังแก้เสร็จ · orchestrator ตรวจ) e2e-skip-seed อ่าน random.fallbackKey + throw เมื่อว่าง + test · app.css อ้าง zIndex.navScreen/nav · client unit 1089, typecheck, eslint, prettier ผ่าน · e2e ทั้งชุดตรวจใน T19/CI |
| P2-F10-T18 | F10 | Tech gate F10 | review-gate | tech-lead | P2-F10-T17, P2-F10-T12, P2-F10-T07, P2-X60, P2-X61, P2-X62 | `docs/reviews/F10-tech-gate.md` | DONE | รอบ 1 NEEDS_CHANGES → รอบ 2 PASS · `docs/reviews/F10-tech-gate.md` · test 3519 · lint:config 0/0 |
| P2-F10-T19 | F10 | e2e ใหม่ของ flow F10 ตาม test plan + รัน e2e ทั้งชุด + ภาพหน้าจอ 360/390 px ของทุกจอ F10 ให้ gate copy/visual | build | qa-tester | P2-F10-T17, P2-F10-T16, P2-F10-T08 | `qa/tests/e2e/`, `qa/reports/F10/`, `qa/bugs.md` | DONE | e2e ใหม่ 4 ไฟล์ (pdpa, render, segmenter, deep-link) + capture-f10-screens 36 ภาพใน qa/reports/F10/screens/ + e2e-coverage.md (71/85 COVERED, 14 PARTIAL/GAP) · e2e ทั้งชุด 170/170 |
| P2-X63 | F10 | (finding จาก P2-F10-T19) .story-dot / .story-dot-active ไม่มี CSS ขนาด ทำให้จุดบอก slide 1–5 มองไม่เห็นที่ 360/390 px · เพิ่ม rule ตาม components.md 16.5 และ art/direction/F10-shell-direction.md 8.6 (จุด 10 px, แยก active ด้วยรูปทรงไม่ใช่สีอย่างเดียว) · ถ่ายภาพ story ใหม่ด้วย qa/tests/e2e/visual/capture-f10-screens.ts | fix | gameplay-programmer | P2-F10-T19 | `apps/client/` (ยกเว้น apps/client/package.json), `qa/reports/F10/screens/` (เฉพาะภาพ story ที่ถ่ายใหม่) | DONE | app.css .story-dots/.story-dot/.story-dot-active (10 px, active ทึบ vs โปร่ง) · ภาพ story ใหม่ 6 ภาพ · unit 1089 |
| P2-X64 | F10 | (copy gate T20 F-01, F-03..F-06) เพิ่ม story.headerLabel "เรื่องราว" · settings.logoutConfirmRunNote → "รอบเดินที่ค้างอยู่จะจบตอนนี้" · character.classLabel → "เลือกบทใน party" · account.forgotButton → "เข้าด้วยอีเมลนี้" · design/narrative/F10-story.md + context ของ key slide4 ตรง D-156 · ลบ 6 key ที่ไม่ใช้ (onboarding.intro, onboarding.introTap, account.loginGoogle, account.loginApple, account.registerDone, account.forgotResult) ถ้า client ไม่อ้างแล้ว · ลบคำ "done by orchestrator" ใน context 7 key | fix | narrative-designer | P2-F10-T20 | `config/content/copy.th.json`, `design/narrative/F10-story.md` | DONE | story.headerLabel ใหม่, logoutConfirmRunNote/classLabel/forgotButton แก้, F10-story.md ตรง D-156, ลบ 6 key ที่ไม่ใช้, ลบคำ done by orchestrator · lint:copy exit 0 (orchestrator รัน) |
| P2-X65 | F10 | (copy gate T20 F-02 + visual gate T21 V-F10-01/02/04/09) F-02 แสดง \n ของ story.slide*.body*, character.nameRealNameWarning, character.unsupportedBrowser ตามที่เขียน · V-01 glyph ที่ตั้งตอน mount ขึ้นจริง (nav 5 ช่อง, Setting, กรวยเร็วๆ นี้, ปุ่มสุ่ม, logout, sign-in) โดย re-render เมื่อ onManifestReady + unit test · V-02 nav ใช้ currentColor, CSS .nav-tab-pill = ink.900 และ .nav-tab-pill-active glyph = bg.paper · V-04 .story-image 100% กว้าง 4:3 ขอบ 2 px ink.900 มุม 12 px พื้น bg.paper จองพื้นที่ก่อนภาพโหลด · V-09 glyph ใน plate 96 ขนาด 48 อยู่กลาง หัวข้อห่าง plate ≥ 24 px | fix | gameplay-programmer | P2-F10-T20, P2-F10-T21 | `apps/client/` (ยกเว้น apps/client/package.json) | DONE | setIconGlyphWhenReady (glyph ขึ้นหลัง manifest), nav currentColor + สี active, white-space pre-line, .story-image 4:3, plate glyph 48 กลาง · unit 1095 · ยืนยันจากภาพเอง |
| P2-X68 | F10 | (visual gate T21 V-F10-03/06/07/08/10) V-03 จอเริ่มเกมแสดง illus.story.slide-3 ในกรอบหมึกเหนือปุ่ม "เริ่มเกม" ปุ่มกดได้ทันทีไม่ต้องรอภาพ ภาพยังไม่มาแสดงกรอบเปล่า · V-06 ปุ่ม login เรียงแนวตั้ง สูง 56 px มี glyph sign-in, "ใช้อีเมลแทน" เป็นลิงก์, ช่องกรอกทุกช่องสูง ≥ 48 px ขอบ 2 px มุม 12 px · V-07 ปุ่มสุ่ม 48×48 มี glyph, error ใช้ขอบและข้อความ state.danger, banner คำเตือนมี icon.ui.consent · V-08 ย้ายปุ่มตามตัวไปใต้ปุ่ม Setting ไม่ทับกัน, การ์ด dungeon และ toast อยู่เหนือ nav · V-10 แถว "ลบข้อมูลในเครื่อง" ใช้ state.danger แยกจาก logout | fix | gameplay-programmer | P2-X65 | `apps/client/` (ยกเว้น apps/client/package.json) | DONE | intro ภาพ slide-3 ในกรอบ, login 56 px/ช่อง 48 px, ปุ่มสุ่ม/error danger/banner icon, follow-toggle ใต้ Setting + panel/toast เหนือ nav, ลบข้อมูล = danger · unit 1095 · e2e 169/170 (TC-MAP-05 ios ตก → X67) |
| P2-X66 | F10 | (copy gate T20 F-01b) เพิ่มการตรวจว่าทุก key ที่ client เรียกผ่าน getCopyText มีอยู่ใน copy.th.json (lint:copy exit 0 ทั้งที่ story.headerLabel ไม่มี) · ตัวตรวจต้องล้มถ้ามี key หาย | fix | tech-lead | P2-F10-T20 | `tools/copy-lint/`, `apps/client/src/copy/` (เฉพาะ test) | DONE | กฎ S15 ใน copy-lint (TypeScript checker สแกน getCopyText/formatCopyText/getCopyEntry ใน apps/client/src) · พิสูจน์ว่าจับ story.headerLabel ได้ · copy-lint 122 test |
| P2-X67 | F10 | (copy gate T20 F-01b, N-04) e2e ตรวจไม่มีข้อความรูปแบบ area.key ดิบบนจอ F10 ทุกจอ · ถ่ายภาพ 06, 09, 10, 11, 18 (และจอที่ visual gate ระบุ) ใหม่ที่ 360/390 หลัง X64/X65 · (visual gate V-04) ถ่ายหลัง img.complete ทุกภาพ + เพิ่มภาพ story slide 2, 3 · ถ่ายจอ 05 ใหม่ (ปุ่ม forgot เปลี่ยน) · ถ่ายทุกจอที่ X65/X68 แตะ · capture script ต้องเขียน capture-results.json ให้ผ่าน prettier (หรือรัน prettier หลังเขียน) เพราะ root lint ตกจากไฟล์นี้ · (product gate ไม่บล็อก F10-PM-01/02) e2e assert nav_tab_opened/coming_soon_viewed ลง telemetry storage จริง และ e2e กดลิงก์ข้ามเรื่องแล้ว story_skipped ถูกบันทึก · ตรวจและทำให้ qa/tests/e2e/f02-map-network-resilience.spec.ts TC-MAP-05 (ios-safari) เสถียร (ตกใน run ของ X68 ทั้งก่อนและหลังแก้) โดยไม่ลดสิ่งที่ตรวจ | fix | qa-tester | P2-X64, P2-X65, P2-X68 | `qa/tests/e2e/`, `qa/reports/F10/` | IN_PROGRESS | — |
| P2-F10-T20 | F10 | Content gate (copy) F10 | review-gate | narrative-designer | P2-F10-T19, P2-F10-T11, P2-F10-T03, P2-X64, P2-X65, P2-X66, P2-X67 | `design/reviews/F10-copy-gate.md` | TODO | รอบ 1 NEEDS_CHANGES (F-01..F-06) → รอบ 2 ตรวจเฉพาะ finding |
| P2-F10-T21 | F10 | Content gate (visual) F10 | review-gate | art-director | P2-F10-T19, P2-F10-T09, P2-F10-T13, P2-X63, P2-X65, P2-X68, P2-X67 | `art/reviews/F10-visual-gate.md` | TODO | รอบ 1 NEEDS_CHANGES (V-F10-01..10) → รอบ 2 ตรวจเฉพาะ finding |
| P2-F10-T22 | F10 | QA gate F10 | review-gate | qa-tester | P2-F10-T18, P2-F10-T19 | `qa/reports/F10-qa-gate.md`, `qa/bugs.md` | DONE | verdict PASS · `qa/reports/F10-qa-gate.md` · acceptance 13/13 · test 3519, e2e 170/170 · PARTIAL/GAP 37 ไม่บล็อก (ยกไป) |
| P2-F10-T23 | F10 | Design gate F10 | review-gate | game-director | P2-F10-T22, P2-F10-T20, P2-F10-T21, P2-F10-T10, P2-H62, P2-H69 | `design/reviews/F10-design-gate.md` | TODO | — |
| P2-F10-T24 | F10 | Product gate F10 | review-gate | product-manager | P2-F10-T22, P2-F10-T05 | `product/reviews/F10-product-gate.md` | DONE | verdict PASS · `product/reviews/F10-product-gate.md` · คำสั่งคน 7/7 MET · event 8 + funnel 6 ตรง 3 ที่ ไม่มี PII |
| P2-F10-CI | F10 | รัน lint, typecheck, pnpm test, build, e2e ทั้งหมดในเครื่องแบบ CI=1 ให้เขียว + แนบ output | build | qa-tester | P2-F10-T23, P2-F10-T24 | `qa/reports/F10-ci-local.md`, `qa/tests/e2e/`, `qa/bugs.md` | TODO | — |

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
| W7 (จริง) | กำลังรัน: P2-F05-T10, P2-F04-T22, P2-H16, P2-H18, P2-X26, P2-H19 | — | **HUMAN P2-C01 ทันที → P2-C02 + P2-F04-T11 ในการออกเดินครั้งเดียว** (O-45) | แถว W8–W18 ข้างล่างแทนแผนเดิมตาม plan-sync W7 (O-40) |
| W8 | P2-F06-T08 (gp), P2-X27 (be), P2-F05-T15 (tl), P2-F05-T11 (qa), P2-H20 (gd), P2-X30 (uiux หลัง H19) | P2-X30 | — | `apps/client/src/home/` = X27 · F06-T08 ห้ามแตะ path นั้น |
| W9 | P2-F06-T09 (gp), P2-X28 (be), P2-F05-T16 (qa), P2-X32 (nar), P2-X31 หรือ P2-C03 (tl), P2-X30 ถ้ายังไม่ได้ทำ (uiux) | P2-X31 | P2-C05 HUMAN หลัง C03 | `apps/client/src/onboarding/` = X28 · `copy.th.json` = X32 |
| W10 | P2-F06-T10 (gp), P2-X29 (be), P2-F05-T17 (nar), P2-H08 (qa), P2-X33 (pm), P2-C03 / P2-F06-T12 / P2-X31 (tl) | P2-H08, P2-X33 | [P2-C04 location ถ้ามี C02] | `apps/client/src/feedback/`, `icon-glyph*` = X29 |
| W11 | P2-F06-T14 (gp), P2-F06-T17 (qa), P2-F05-T18 (gd), P2-F06-T12 (tl) | — | [P2-C04, P2-F05-T12 เมื่อ C03 + C04] | F06-T12 ต้องจบใน W11 |
| W12 | P2-F06-T20 (tl), P2-F06-T22 (nar), P2-F06-T23 (ad), [gp fix จาก gate ตามกฎสลับข้อ 8] | — | [P2-C06, P2-F05-T13] | — |
| W13 | P2-F06-T21 (qa), [gp fix], [gate F04+F05 รอบ 2 ถ้ามี] | — | P2-F06-T26 HUMAN หลัง F05-T16 + F06-T21 PASS, C05 = Go, F06-T12 DONE · คนนัดผู้ร่วม playtest | — |
| W14 | P2-F06-T24 (gd) [+ P2-F06-T25 ถ้า PM รับ O-22] | — | [P2-F05-T19] | — |
| W15 | P2-F06-T25 (pm) | — | P2-F06-T27 HUMAN หลัง T24 + T25 PASS | ถ้ารับ O-22 wave นี้ว่าง |
| W16 | P2-F06-T28 (pm), [P2-C06 ถ้ายังไม่ทำ] | — | P2-F06-T29 HUMAN · P2-C07 HUMAN หลัง C06 | — |
| W17 | P2-CLOSE-QA, P2-C08 | — | — | C08 ต้องมี C05, C06, C07 |
| W18 | P2-CLOSE-PM | — | — | ปิด phase |

กฎสลับ (orchestrator ใช้ได้เลยโดยไม่ต้องถาม producer)
1. **งานสนาม** (P2-C03, C04, C06, P2-F06-T12, P2-F05-T12, T13, T19, P2-C08) เข้าตาม wave ในแผนเมื่อ deps ครบ หรือเข้าช่องว่างของ agent นั้นใน W12–W16 · จะเร็วกว่าแผนได้เฉพาะโดยสลับกับงานในคอลัมน์ "ถอยได้" ของ wave นั้น (งานที่ถอยย้ายไป W12 ซึ่งมีช่องว่าง) · ห้ามถอยงานบนเส้นวิกฤต ห้ามเกิน 6 งานต่อ wave และตรวจ 1 งานต่อ agent + Writes ใหม่ · tech-lead มีงานทุก wave ใน W5–W8 และ W1–W7 ไม่มีงานถอยได้ จึง P2-C03 เร็วสุด W9 · P2-C04 เร็วสุด W8 (แทน P2-RISK-01 ซึ่งย้ายไป W12)
2. **GR-1 เกิน guardrail (PM-M3):** ถ้า P2-F04-T18 รายงานว่า GR-1 ของย่านใดเกิน G4 (≤ 5%) หรือ S3 (≤ 15%) ถือเป็น blocking · orchestrator ไม่ dispatch P2-F04-T13 และงานที่ผูกกับชุด dungeon (P2-F04-T26 ส่วนข้อมูล, P2-F04-T21) และเรียก producer ทำ plan-sync ทันที · ถ้าทางแก้เปลี่ยนชุดย่านของ D-083 ต้องเป็นคำถามถึงคน
3. **ข้อมูลนำร่องเปลี่ยนหลัง T18:** ถ้า P2-F04-T13 ตัดหรือเพิ่ม dungeon จากรายชื่อของ P2-F04-T04 จนกระทบช่วงเลเวลเริ่มต้นของย่านใด level-designer ส่ง handoff ถึง product-manager และ orchestrator เปิด X ให้คำนวณ GR-1 ซ้ำใน wave ถัดไป
4. **jitter ของเครื่องจริง (TL N-11):** ถ้า P2-C03 พบว่าเครื่องที่วางนิ่งผ่าน gate หลังใช้ตัวกรอง orchestrator เปิด X ให้ systems-designer (ค่าของ P2-F05-T20) และแจ้ง game-director ก่อน P2-F05-T16
5. **P2-C05 = No-go:** หยุด P2-F06-T26 และงานที่รอผลสนาม แล้วเรียก producer ทำ plan-sync · **Q-P1-16 ยังไม่มีคำตอบเมื่อจบ W3:** orchestrator commit ได้แต่ไม่ push commit ที่มี `data/dungeons/` จนกว่าคนตอบ
6. ช่องว่างใน W12–W16 ใช้รับ fix task จาก gate ที่ได้ NEEDS_CHANGES ก่อนงานอื่น · งาน carry-over (P2-F04-T09, T23, P2-C09, P2-RISK-01) ขยับขึ้นช่องว่างได้ แต่ต้องเสร็จก่อน P2-CLOSE-QA
7. handoff ที่ไม่ใช่ fix ถึง gameplay-programmer หรือ qa-tester (คอขวด) ให้ producer ตัดสินใน plan-sync ว่ายกไป Phase 3 หรือไม่
8. (plan-sync W7) fix ของ gameplay จาก gate ที่ใช้เวลา ≤ 0.5 วันให้พ่วงไปกับงาน gameplay ถัดไปใน W9–W11 · fix ที่ใหญ่กว่าใช้ช่อง gameplay ใน W12 แล้ว gate รันซ้ำใน W13
9. (plan-sync W7) P2-C03 และ P2-F06-T12 ได้ช่อง tech-lead แรกหลังผลภาคสนามมาถึง ก่อน X31 · F06-T12 ต้องเสร็จภายใน W11 · ถ้า X27, X28 หรือ X29 กลับมา PARTIAL ให้งาน gameplay ที่รออยู่รับส่วนที่เหลือโดยเพิ่มโฟลเดอร์นั้นใน Writes ของตัวเอง
10. (plan-sync W7 · ผู้ใช้อนุมัติ 2026-09-27) backend-programmer เขียนโมดูล pure ในโฟลเดอร์ใหม่ของ `apps/client/` (home/, onboarding/, feedback/, assets/icon-glyph*) ได้ ระหว่างที่ถือโฟลเดอร์นั้น gameplay ห้ามแตะใน wave เดียวกัน · เป็นข้อยกเว้นของกฎ path · tech-lead ตรวจใน F06-T20
11. (plan-sync W16 O-01) แถว fix/handoff (X, H) ที่มี gate อยู่ใน Deps หมายถึงรายงานรอบ 1 ของ gate นั้น (ครบเมื่อ gate ส่งรายงานรอบ 1 ไม่ว่า verdict ใด) · gate ที่มีแถว fix ใน Deps หมายถึงรอบถัดไปและต้องรอ fix DONE จริง
12. (plan-sync W16 O-04) escalation รอบ 2: ถ้า T20, T22 หรือ T23 ได้ NEEDS_CHANGES ครั้งที่สอง orchestrator ไม่เปิด fix เอง · เพิ่ม Q-P2-xx สรุปสองรอบ พร้อมตัวเลือก (ก) fix รอบ 3 เฉพาะรายการ แล้วตรวจซ้ำครั้งเดียว (ข) รับเป็น known issue ของ playtest ถ้าไม่แตะ non-negotiable หรือ exit item E7/E8/E13/E14/E16 (ค) ถอนออกจาก build playtest · เดินงานที่ไม่รอ gate นั้นต่อ · gate รอบ 2 ตรวจเฉพาะ finding ที่ระบุ
13. (plan-sync W16 O-20) หยุด Run 2 เมื่อ ready list เหลือเฉพาะ HUMAN และแถวที่รอผล HUMAN · (O-15) ห้ามแก้ client ใน wave ที่ H41 ถ่ายภาพ · (O-16) ถ้า X41 ไม่ทำ V-37 เลื่อน Phase 3 · แผน wave W16–W23 ดู plan-sync-w16.md หัวข้อ 3
ประมาณการหลัง plan-sync W7: agent ต้องใช้อีก 8 wave (W8–W15) ถึง playtest แรก (F06-T27) หรือ 7 ถ้า PM รับ O-22 · ปิด phase ราว W18 · critical path จริงคือการเดินภาคสนามของคน (P2-C01, C02, F04-T11)
- ประมาณการ: ฝั่ง agent 17 wave เท่า rev 1 แต่ **ไม่มีงานสนามบนเส้นวิกฤต** · ระยะจริงขึ้นกับคนใน P2-F06-T26, T27, T29

### Critical path
1. **Build loop (ยาวที่สุด · gameplay เป็นคอขวด 8 งาน):** P2-F04-T05 (W1) → P2-F04-T12 + T14 (W2) → P2-F04-T25 (W3) → P2-F04-T21 (W5 · รอ T16, T26, T27, T17 จาก W4) → P2-F06-T09 (W6) → P2-F05-T10 (W7) → P2-F06-T08 (W8) → P2-F06-T10 (W9) → P2-F06-T14 (W10) → P2-F06-T20 tech gate (W11) → P2-F06-T21 QA gate (W12) → P2-F06-T24 design gate (W13) → P2-F06-T25 product gate (W14) → HUMAN P2-F06-T27 → P2-F06-T28 (W15) → HUMAN P2-F06-T29 → P2-CLOSE-QA (W16) → P2-CLOSE-PM (W17)
2. **spec → flow → copy (ไม่มี slack):** P2-F04-T01 (W1) → P2-F04-T15 (W3) → P2-F04-T16 + T27 (W4) → P2-F04-T21 (W5) · และ P2-F04-T01 → P2-F06-T02 (W3) → P2-F06-T03 (W4) → P2-F05-T09 + P2-F06-T30 (W5) → P2-F06-T09 (W6)
3. **engine (backend):** P2-F05-T02 (W2) → P2-F04-T20 (W3) → P2-F05-T08 (W5 · รอ P2-F05-T01 W4) → P2-F06-T06 (W7 · รอ P2-F06-T04 W6) → P2-F06-T08 (W8) · systems: P2-F06-T01 (W1) → P2-F05-T20 (W2) → P2-F05-T01 (W4)
4. **art/audio:** P2-F05-T03 (W3) → P2-F05-T07 + P2-F06-T07 (W5) → P2-F06-T09 (W6) · P2-F05-T05 + T06 (W6) → P2-F05-T10 (W7) · P2-F06-T05 (W7) + P2-F06-T13 (W8) → P2-F06-T14 (W10)
5. **qa (คอขวดที่สอง ไม่มี slack W6–W12):** P2-F04-T19 (W6) → T22 (W7) → P2-F06-T11 (W8) → P2-F05-T11 (W9) → P2-F05-T16 (W10) → P2-F06-T17 (W11) → P2-F06-T21 (W12)
6. **สายสนาม (slack ราว 3 wave · ต้องครบก่อน P2-F06-T26 หลัง W12):** HUMAN P2-C01 → P2-C02 → P2-C03 (W9 · เร็วสุดตามกฎสลับ 1) → HUMAN P2-C05 · P2-F04-T10 (W2) → HUMAN P2-F04-T11 → P2-F06-T12 (W10) · P2-C04 (W11) → P2-F05-T12 (W12) → T13 (W13) → T19 (W14) → P2-CLOSE-QA
7. **ปิด Phase 1 (ขนาน):** P2-C06 (W14) → HUMAN P2-C07 → P2-C08 (W16) · ต้องเสร็จก่อน P2-CLOSE-PM

### Critical path หลัง plan-sync W7 (แทนข้อ 1 ด้านบนตั้งแต่ W8)
1. **gameplay + gate:** P2-F05-T10 (W7) → P2-F06-T08 (W8) → P2-F06-T09 (W9) → P2-F06-T10 (W10) → P2-F06-T14 (W11) → P2-F06-T20 (W12) → P2-F06-T21 (W13) → P2-F06-T24 (W14) → P2-F06-T25 (W15) → HUMAN P2-F06-T27 → P2-F06-T28 (W16) → HUMAN P2-F06-T29 → P2-CLOSE-QA (W17) → P2-CLOSE-PM (W18)
2. **โมดูลของ backend (slack 0):** P2-X27 (W8) → F06-T09 · P2-X28 (W9) → F06-T10 · P2-X29 (W10) → F06-T14
3. **คำตัดสิน:** P2-H20 (W8) → P2-X32 (W9) → P2-F06-T22 (W12) · P2-H20 → F06-T09, F06-T10, F05-T18, F06-T24
4. **สนาม:** HUMAN P2-C01 → HUMAN P2-C02 + P2-F04-T11 → P2-C03 → HUMAN P2-C05 และ P2-F06-T12 → P2-F06-T26 · speed filter: C03 + C04 → P2-F05-T12 → T13 → T19 → P2-CLOSE-QA (กั้นการปิด phase ไม่กั้น playtest)

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
  - [ ] non-goals และคำถามที่ playtest ต้องตอบ · ข้อจำกัดของ playtest: ไม่มีจำนวนคนใน dungeon/ต่อจังหวัด (GD N-04), ผลบน client ไม่ใช่รางวัลจริง (C1-5), ผู้เล่นอายุ 15–17 เข้าร่วมได้พร้อมฟอร์มผู้ปกครอง (D-092 แทน A-P2-PLAN-01-5)

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
  - [ ] การตีสุ่มในช่วงจาก config, damage = สูตร GDD ผ่าน `src/formulas` (DEF, tankerBuff = 0 (= ไม่มี Tanker อื่นใน party, Tanker เดี่ยวได้ buff ตัวเอง · A-P2-F06-T04-8) ใน Phase 2, ห่างเลเวล ×1.25), hit chance จาก config · RNG stream `hit` ตามสัญญา ADR 0003
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
  - [ ] หน้าตั้งค่า S-22 ตาม P2-F04-T06 (N-1) + token/component V-16, V-20, V-22, ramp (V-15 chip-sponsored เลื่อนออกจาก Phase 2 ตาม plan-sync W7 O-20)
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
  5. (plan-sync W16 O-14) ถ้าหลัง smoke มี commit ใหม่ใน `apps/client/` orchestrator แจ้ง SHA ใหม่ → รันขั้น 1–2 ซ้ำก่อน P2-F06-T27 (ไม่ต้อง smoke 10 นาทีซ้ำ ยกเว้น orchestrator ระบุ)

#### P2-F06-T27 — HUMAN: playtest เดินจริงอย่างน้อย 3 คน
- ปลดล็อก: P2-F06-T28, exit E9 · ผู้ร่วมอายุ 15 ขึ้นไป (D-092): 15–17 ต้องมีฟอร์มผู้ปกครองที่เซ็นแล้วก่อนเดิน และเดินกับทีมหรือผู้ใหญ่ตลอด · ใช้มือถือตัวเอง ไม่มีค่าใช้จ่ายและไม่ต้องสมัครบริการใด
- ขั้นตอน:
  1. อ่าน `qa/playtest/phase-2-kit.md` และ `qa/playtest/safety-briefing.md` · ชวนผู้ร่วมอย่างน้อย 3 คน (ต่างกลุ่มถ้าได้: เดินน้อย/เดินมาก) · อธิบายว่าข้อมูลตำแหน่งไม่ออกจากเครื่องและผลในเกมไม่ใช่รางวัลจริง
  1a. ก่อนวันเดิน: กรอกเบอร์ติดต่อผู้ประสานงานของทีมในช่องที่เว้นไว้ใน `qa/playtest/safety-briefing.md` §11 (agent กรอกแทนไม่ได้) และใช้ `qa/playtest/phase-2-kit.md` (สถานที่ PN-2 ป้อมพระสุเมรุ พระนคร)
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

### plan-sync W7 — งานใหม่ (ที่มา `studio/phases/phase-2/plan-sync-w7.md`)

#### P2-H20 — คำตัดสินก่อน build: D-120, §21, แบบสอบถาม (game-director, 1 วัน · W8)
- Inputs: `design/ux/flows/F06-hp-damage-onboarding.md` §9 และ §15 (P2-H09), `config/content/copy.th.json` key `dungeon.checkinNoClass` / `dungeon.checkinNoHp` (P2-H04), decision D-120, `design/systems/balance-model.md` §21 (P2-X20), `config/balance/unlocks.json` `home.launchAreaMaskPath`, `product/playtest/phase-2-questionnaire.md` + `phase-2-plan.md` (P2-F06-T19), spec F06 R37/R55–R57
- Acceptance:
  - [ ] D-120: ACCEPTED หรือ REJECTED พร้อมเหตุผล · ถ้า ACCEPTED ระบุพฤติกรรมที่ client ต้องทำ (no_class เปิด sheet เลือกพลังเป็นทางหลัก + `dungeon.checkinNoClass` เป็นบรรทัดสำรอง · no_hp แสดง `dungeon.checkinNoHp`) · ถ้า REJECTED ระบุสิ่งที่ uiux ต้องย้อน (rollback ใน flow F06 §15)
  - [ ] §21: เลือกทาง ก (geometry ทุกเขต) หรือ ข (เลิกระบุชื่อเขตที่ผู้เล่นยืน) · ถ้า ข ระบุถ้อยคำเจตนาของ `home.outsideLaunchBody` ให้ narrative (P2-X32) · ถ้า ก ระบุว่าต้องเปิดงาน geometry และแจ้ง producer (คาดว่าเกิน Phase 2)
  - [ ] ความเห็นต่อแบบสอบถามเรื่อง gate/tick และ auto-retreat (GD N-08) เป็น handoff ถึง product-manager (blocking: no) · ไม่แก้ไฟล์ของ PM
  - [ ] ยืนยันว่าไม่มีคำตัดสินใดขัด non-negotiable (ไม่มีจำนวนคน, gate เดียว, ไม่มีข้อความอิสระ) · ถ้าขัด GDD ให้เป็นคำถามถึงคน
  - [ ] บันทึกใน `design/reviews/P2-H20-decisions.md` + decision ใน REPORT ให้ orchestrator ลง decision log

#### P2-X27 — home-state แบบ pure (backend-programmer, 1–2 วัน · W8)
- Acceptance:
  - [ ] `homeState(input, params)` คืนสถานะตามลำดับ tech note F06 §9.2 · ข้อ 5 ไม่มีทางสำรองนอกช่วงเลเวล (spec R37 ชนะ tech note จนกว่า P2-X31 แก้) · temporarilyClosed คืนเวลาเปิดถัดไป
  - [ ] ระยะใช้ `boundaryDistance_m` / `pointInPolygon` จาก `packages/geo` · ค่าและ path ทั้งหมดจาก config · ไม่ import engine ย่อยนอก subpath ที่อนุญาต (lint boundary)
  - [ ] test ครอบ H-E6, H-E21, H-E26 และขอบ farDungeonThreshold_m · ไม่มีพิกัดใน log/telemetry · lint/typecheck/test เขียว

#### P2-X28 — ตัวเดินขั้น onboarding แบบ pure (backend-programmer, 1–2 วัน · W9)
- Acceptance:
  - [ ] ลำดับ intro → age → consent → permission → map → class → run แรก → รางวัลก้อนแรก ตาม spec F06 ข้อ 12 และตาราง 3.8 · ขั้นที่ engine รู้อ่านจาก `selectPlayerView` ไม่เก็บซ้ำใน `kw.p2.onboarding`
  - [ ] รางวัลก้อนแรก = `run_tick_granted` ที่ `firstEver = true` เท่านั้น ไม่มี code path แยก (GD B-07) · guard ระบบที่ห้ามสอนอ่านจาก `unlocks.json`
  - [ ] ต่ำกว่าเกณฑ์อายุ = ไม่เก็บข้อมูลและไม่ขอตำแหน่ง · test ครบทุกขั้น · lint/typecheck/test เขียว

#### P2-X29 — feedback, Wake Lock, icon glyph (backend-programmer, 2–2.5 วัน · W10)
- Acceptance:
  - [ ] priority queue ตาม `audio/cue-list.md` §4 · cue ความปลอดภัยชนะเสมอ · ไม่มี `navigator.vibrate` = ใช้ fallback ตาม cue-list
  - [ ] Wake Lock: `'wakeLock' in navigator`, ขอใหม่เมื่อถูกปล่อยและกลับมา visible, คืนค่าเวลาที่ถือและเวลา page hidden ต่อ run ให้ telemetry (ไม่มีพิกัด)
  - [ ] setIconGlyph ตามแถวตาราง (sanitize allowlist, `tintable === true`, fallback img) · test ใน happy-dom รวมกรณี fetch ล้มและ SVG มี script

#### P2-X30, P2-X31, P2-X32, P2-X33
- X30 (uiux, 0.5 วัน · W8): ไม่เหลือ `nav.approximateDistancePrefix` ใน `design/ux/` · wireframe 04/05 เก่ามีหมายเหตุหรือ key ตรง
- X31 (tech-lead, 0.5–1 วัน · W9–W10): tech note F06 §9.2 ข้อ 5 ตรง R37 · `scaffold.ts` รู้จัก `_bytes` + test ช่วงค่า · config-lint 0 error
- X32 (narrative, 0.5 วัน · W9): `home.outsideLaunchBody` ตามคำตัดสิน H20 · lint:copy 0 FAIL (orchestrator รันถ้า agent ไม่มี shell)
- X33 (product-manager, 1 วัน · W10): ตาราง GR-1 ใหม่ 3 ย่านพร้อม SHA 3c75c91e · E17 PASS หรือคำถามถึงคน · ตัวเลขประกอบ Q-1

### F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav (ที่มา D-144..D-149 · `studio/phases/phase-2/plan-sync-f10.md`)

กฎร่วมของ F10 ทุกงาน: login ทุกแบบ bypass ฝั่ง client ไม่มี auth จริง ไม่มี request ออกไป Google/Apple/อีเมล (origin allowlist C2-1 ยังบังคับ) · **ไม่เก็บ password และไม่เก็บอีเมล** ในเครื่องหรือ telemetry · age gate + consent ตำแหน่งแยกยังอยู่ครบ (NN-7) · ต่ำกว่าเกณฑ์อายุไม่เขียน key ใดเลย รวม `kw.p2.account` (R46) · ชื่อตัวละครเก็บในเครื่อง ไม่ส่งออก ไม่อยู่ใน telemetry/export ไม่แสดงให้ผู้เล่นอื่น · ไม่มีช่องข้อความอิสระอื่นนอกจากชื่อตัวละคร (NN-4) · ค่าและชื่อทุกอย่างจาก config/copy (NN-3) · movement gate, reward, HP ไม่เปลี่ยน (NN-1, NN-2) · **ไม่มีงาน F10 ใดแตะ P2-F06-T26..T29, `qa/playtest/`, `product/playtest/`** (D-149) · ไม่มี dep ถึงงาน HUMAN

#### P2-F10-T01 — Feature spec F10 (game-director, 2 วัน · W1)
- Inputs: D-144..D-149, spec F06 R36/R44–R49, flow F06, GDD "10 นาทีแรกของคนใหม่", "ความปลอดภัยผู้เล่นและ PDPA", "หลักการที่ห้ามละเมิด", `apps/client/src/onboarding-flow.ts`
- Acceptance:
  - [ ] rule ที่มีเลข (F10-Rnn) ครอบ: จอ login (Google, Apple เป็นปุ่มหลัก + ลิงก์ email → login / register / forgot), ผลของทุกปุ่ม = bypass ไปขั้นถัดไป, ลำดับ D-149 ครบ 8 ขั้น, ปฏิเสธ consent ข้าม permission แล้วไปสร้างตัวละครต่อ, จอสร้างตัวละครตาม D-146, เรื่อง 5 slide ตาม D-147 (ข้ามได้หรือไม่ ระบุ), map หลัก + nav ตาม D-148
  - [ ] ตัดสินพร้อมเหตุผล: (ก) logout ระหว่าง run ทำได้ไหม (ถ้าได้ จบ run ด้วย `manual_exit` ทางเดียว) (ข) หลัง logout แล้ว login ใหม่ข้ามขั้นที่ผ่านแล้วไป map (ค) migration ผู้เล่นที่ผ่าน onboarding เดิม (มี class ไม่มีชื่อ/account) ไปจอไหน class แก้ได้หรือไม่ (ง) login เก็บลงเครื่องหลังผ่าน age gate เท่านั้น (จ) ความต่างของ logout กับ "ลบข้อมูลในเครื่อง"
  - [ ] ตาราง edge case อย่างน้อย: ต่ำกว่าเกณฑ์อายุ, reload กลางทางทุกขั้น, ชื่อไม่ผ่านตัวกรอง, สุ่มชื่อ, ไม่รู้ตำแหน่ง, logout แล้วเปิดใหม่, ลบข้อมูลในเครื่อง, deep link ไป route nav ก่อนจบ onboarding
  - [ ] spec F06 R36, R44, หัวข้อ 8 ข้อ 12 ชี้มาที่ F10 (class sheet R44 ถูกแทนด้วยจอสร้างตัวละคร) + change log · ไม่แก้ GDD
  - [ ] `design/reviews/gdd-wording-D-145.md`: ถ้อยคำเสนอแก้ GDD เรื่อง password (ก่อน/หลัง, หัวข้อที่กระทบ) ให้ orchestrator ผูกกับ Q-P2-10 · ยืนยันใน spec ว่าไม่มี rule ใดขัด non-negotiable 1–7

#### P2-F10-T02 — Art direction shell (art-director, 1 วัน · W1)
- Acceptance:
  - [ ] สเปก icon nav 5 ปุ่ม + Setting + logout + coming soon ตาม `icon-grammar.md` (grid, stroke, สถานะ active/inactive, `tintable`) ระบุว่า icon เดิมใดใช้ซ้ำ (`bag.svg`, `map.svg`, `settings.svg`, `exit.svg`)
  - [ ] direction ภาพ slide เรื่อง 5 ภาพ (สัดส่วน, palette จาก tokens, ข้อห้าม: ไม่มีสถานที่จริงที่ระบุตัวได้ ไม่มีบุคคลจริง ไม่มีสัญลักษณ์ศาสนา/การเมือง) + งบขนาดไฟล์ต่อภาพ
  - [ ] นโยบายปุ่ม Google/Apple: ไม่วาดหรือดัดแปลง logo แบรนด์เอง · Phase 2 ใช้ป้ายข้อความ (+ glyph กลาง) เว้นแต่อ้าง asset ทางการพร้อมเงื่อนไขการใช้ · ส่งต่อ uiux และ artist

#### P2-F10-T03 — เรื่องเล่า 5 slide + คลังชื่อ + รายการคำ (narrative-designer, 2 วัน · W1)
- Acceptance:
  - [ ] key `story.slide1..5.title/body`, `story.next` = "ถัดไป", `story.start` = "ออกไปลุย!" ตาม `design/narrative/world.md` และกฎ copy 6 ข้อ · ความยาวต่อ slide อยู่ในเพดาน cell ของจอ 360 px (ระบุตัวเลข)
  - [ ] `config/content/character-names.th.json`: คลังส่วนประกอบชื่อสุ่มพอให้ได้ ≥ 200 ชื่อต่างกัน ทุกชื่อไม่ใช่ชื่อคนจริงที่เป็นที่รู้จัก · รายการคำไม่สุภาพ/ต้องห้าม (ไทย + อังกฤษ) พร้อมหมายเหตุวิธีเทียบ (ตัดวรรณยุกต์/ช่องว่าง/ตัวซ้ำ) ให้ tech-lead และ backend
  - [ ] `design/narrative/F10-story.md` เหตุผลเชิงเรื่อง + ตัดสินว่าใช้ `onboarding.intro` เดิมใน slide ใด · lint:copy 0 FAIL

#### P2-F10-T04 — Config ตัวกรองชื่อ (systems-designer, 1 วัน · W1)
- Acceptance:
  - [ ] `config/balance/character.json`: `name.minLength`, `name.maxLength` (หน่วย grapheme cluster), ชุดอักขระที่อนุญาต (ช่วง Unicode ไทย, Latin, ตัวเลข, ช่องว่างเดี่ยว), เกณฑ์จับเบอร์โทร (จำนวนตัวเลขติดกัน/รวม), รูปแบบอีเมล/ลิงก์ (`@`, `://`, `www.`, TLD), จำนวนครั้งสุ่มใหม่สูงสุดก่อนคืนค่าสำรอง · ไม่มี regex ที่ต้อง `new Function`
  - [ ] `design/systems/test-vectors/character-name.json` ≥ 30 vector (ผ่าน/ไม่ผ่านพร้อมเหตุผล: สั้น/ยาว, อักขระนอกชุด, เบอร์ 0812345678 และแบบเว้นวรรค/ขีด, อีเมล, URL, คำต้องห้ามแบบแทรกช่องว่าง, ชื่อไทยมีสระบน/ล่าง)
  - [ ] ทุกค่ามีเหตุผลสั้นในไฟล์หรือหมายเหตุ · ไม่แตะไฟล์ balance อื่น

#### P2-F10-T05 — Telemetry F10 + PRD addendum (product-manager, 1 วัน · W1)
- Acceptance:
  - [ ] หมวด F10 ใน `product/telemetry-events.md`: event อย่างน้อย `account_login_shown`, `account_login_method_chosen` (`method`: google/apple/email_login/email_register/email_forgot), `character_created` (`class_id`, `name_source`: typed/random, `filter_reject_count` เป็น bucket), `story_completed` / `story_skipped` (ถ้า spec ให้ข้าม), `nav_tab_opened` (`tab`), `coming_soon_viewed` (`tab`), `account_logout` · ต่อ `onboarding_funnel_step` ด้วยขั้นใหม่
  - [ ] ทุก event ผ่านกติกาบังคับของไฟล์: ไม่มีพิกัด ไม่มีชื่อตัวละคร ไม่มีอีเมล ไม่มีข้อความที่ผู้เล่นพิมพ์
  - [ ] `product/prd/F10-account-shell.md`: เป้าหมายผู้เล่น, ตัวชี้วัด funnel ใหม่ (เริ่มเกม → map) และ non-goals (auth จริง = F07 Phase 3) · [ASSUMPTION] ถ้า spec T01 ยังไม่มีให้อิง D-144..D-149 แล้วตรวจซ้ำใน product gate

#### P2-F10-T06 — Flow + wireframe + component F10 (uiux-designer, 2–3 วัน · W2)
- Acceptance:
  - [ ] `design/ux/flows/F10-account-shell.md`: screen id ใหม่ใน `ia.md` (login, email login, register, forgot, สร้างตัวละคร, story 1–5, coming soon ×3, Setting ที่มีแถวออกจากระบบ + confirm) · ทุกทางเข้า/ออก รวม reload กลางทาง, back ของเบราว์เซอร์, logout, ลบข้อมูลในเครื่อง, deep link route nav ก่อนจบ onboarding
  - [ ] wireframe HTML `design/ux/wireframes/F10-*.html` ที่ 360 px และ 390 px ทุกจอ · ใช้ copy key (ไม่ใช่ข้อความจริง) · ปุ่มเด่นเดียวต่อจอ
  - [ ] `components.md`: bottom nav (5 ช่อง, active, safe-area, ขนาดแตะ ≥ 44 px), ช่องชื่อ + ข้อความตัวกรองแบบ inline + ปุ่มสุ่ม, pager ของ slide, coming soon, ปุ่ม login ตามนโยบาย T02
  - [ ] กฎการแสดง nav: ซ่อนหรือไม่ทับระหว่าง run, จอพกกระเป๋า, sheet confirm และ onboarding (ระบุต่อ state) · Setting มุมบนขวาไม่ทับ HUD
  - [ ] flow F06 มีหมายเหตุว่าส่วน onboarding ถูกแทนโดย F10 · ไม่มีตำแหน่งรายบุคคล จำนวนคน หรือข้อความอิสระนอกช่องชื่อ

#### P2-F10-T07 — Tech note F10 (tech-lead, 2 วัน · W2)
- Acceptance:
  - [ ] `docs/tech/F10-account-shell.md`: schema `kw.p2.account` `{ schemaVersion, provider: 'google'|'apple'|'email', signedIn: bool }` (ไม่มีอีเมล ไม่มี password ไม่มี token) และที่เก็บชื่อตัวละคร (`kw.p2.character` หรือ field ใน `player` พร้อมเหตุผล) · เขียนหลังผ่าน age gate เท่านั้น · อยู่ใต้ prefix `kw.p2.` จึงถูกล้างโดยปุ่มลบข้อมูลและ Phase 3 ตาม C1-5
  - [ ] step machine ใหม่ตาม D-149 (ตารางขั้น → ธง → แหล่งความจริงเดียว แทน tech note F06 8.2) · class ยังผ่าน `chooseClass` ของ engine · ขั้น permission ยังใช้ LocationProvider
  - [ ] route ใหม่ (`#/login`, `#/login/email`, `#/register`, `#/forgot`, `#/create-character`, `#/story/<n>`, `#/upgrade`, `#/shop`, `#/party` หรือชื่อที่เลือก) + guard: route nav ใช้ได้เมื่อ onboarding จบ · ความสัมพันธ์กับ route เดิม `#/settings*`, `#/inventory`
  - [ ] migration ผู้เล่นเดิมตามคำตัดสิน T01 (ไม่ลบ session/inventory) + test hook/seed ของ e2e สำหรับ "ผ่าน onboarding แล้ว" ให้ qa และ gameplay ใช้ร่วม
  - [ ] schema ของ `config/balance/character.json` และ `config/content/character-names.th.json` ใน `packages/shared/schemas/config/` + ลงทะเบียนใน config-lint (0 error) · subpath `./character` ใน `packages/shared/package.json` · allowlist event F10 ใน `config/app/telemetry.json` ตรงชื่อ T05 · `privacy.json` รายการ key ใหม่

#### P2-F10-T08 — Test plan F10 (qa-tester, 1–2 วัน · W2)
- Acceptance:
  - [ ] case ต่อ rule ของ spec T01 + edge case ทุกแถว · case PDPA: ต่ำกว่าเกณฑ์ไม่มี key, ไม่มีอีเมล/password ใน localStorage และ export, ไม่มี request ไป origin นอก allowlist ตอนกดปุ่ม Google/Apple
  - [ ] รายการ e2e เดิมที่พังเพราะขั้น login/สร้างตัวละคร (ทั้ง `apps/client/e2e/` และ `qa/tests/e2e/` รวม script visual) พร้อมเจ้าของที่แก้ (gameplay ใน T14/T15/T17, qa ใน T16)
  - [ ] case migration, logout ระหว่าง/นอก run, nav ไม่บัง HUD run และจอพกกระเป๋าที่ 360/390 px, ตัวกรองชื่อผ่าน vector T04

#### P2-F10-T09 — Icon SVG ของ shell (artist-2d, 1–2 วัน · W2)
- Acceptance:
  - [ ] SVG ใหม่ใน `art/assets/icon/ui/` ตาม T02 (upgrade, shop, party, logout, coming-soon และรุ่น nav ถ้า T02 สั่ง) · ไม่แก้ไฟล์ icon เดิม · ไม่มี script/external ref · ผ่าน `tools/art` (sanitize + `tintable`)
  - [ ] ลง `manifest.icon.json` + `manifest.json` ครบ field ตาม schema · ไม่มี logo แบรนด์

#### P2-F10-T10 — อนุมัติ flow F10 (game-director, 0.5–1 วัน · W3)
- ตรวจ: flow + wireframe ตรง spec T01 และ D-144..D-149, age gate ก่อน consent ก่อน permission, ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก, ไม่มีตำแหน่งรายบุคคล/จำนวนคน/ข้อความอิสระ, nav ไม่ทับ HUD run · verdict PASS / NEEDS_CHANGES · ข้อแก้เป็น fix ของ uiux ก่อน T14

#### P2-F10-T11 — Copy key ของจอ F10 (narrative-designer, 1–2 วัน · W3)
- Acceptance:
  - [ ] ทุก key ที่ flow T06 อ้างมีใน `copy.th.json` (ตรวจด้วยการ grep key จาก wireframe) · ป้าย nav 5 ป้าย ≤ เพดาน cell ของ components · coming soon, logout + confirm, คำเตือนอย่าใช้ชื่อจริง, ข้อความตัวกรองแยกตามเหตุผล (สั้น/ยาว/อักขระ/เบอร์/อีเมล/ลิงก์/คำไม่เหมาะ)
  - [ ] ข้อความ register/forgot ไม่สัญญาว่ามีอีเมลส่งจริง (Phase 2 bypass) · ป้ายปุ่ม Google/Apple ตามนโยบาย T02
  - [ ] ตัดสินที่อยู่ของ `onboarding.intro` / `onboarding.introTap` (D-144) · area ใหม่ใน `copy-rules.json` ถ้าต้องมี · lint:copy 0 FAIL

#### P2-F10-T12 — โมดูล pure ของ F10 (backend-programmer, 2 วัน · W3 · ข้อยกเว้นกฎสลับ 10)
- Acceptance:
  - [ ] `packages/shared/src/character/`: `validateCharacterName(name, params, lexicon)` คืนผ่าน/เหตุผลเป็น enum ตาม T04 · normalize (NFC, ตัด zero-width, ยุบช่องว่าง, เทียบคำต้องห้ามหลังตัดวรรณยุกต์/ตัวซ้ำ) · `randomCharacterName(rng, lexicon, params)` คืนชื่อที่ผ่าน validate เสมอ (test 10,000 seed)
  - [ ] ผ่านทุก vector ใน `design/systems/test-vectors/character-name.json` (ค้นแบบ dynamic) · ค่าทั้งหมดจาก config ไม่มีฝัง · pure ตาม ESLint boundary
  - [ ] `apps/client/src/onboarding/`: step machine ลำดับ D-149 + migration ตาม tech note T07 · test ทุกขั้น, reload กลางทาง, consent ปฏิเสธ, ต่ำกว่าเกณฑ์ (ไม่เขียน key) · lint/typecheck/test เขียว

#### P2-F10-T13 — ภาพประกอบ slide 5 ภาพ (artist-2d, 2 วัน · W3)
- Acceptance:
  - [ ] `art/assets/illus/story-01..05.svg` ตาม direction T02 และเนื้อหา T03 · อยู่ในงบขนาดของ T02 · ไม่มีสถานที่จริงระบุตัวได้/บุคคลจริง/ข้อความฝังในภาพ
  - [ ] ลง `manifest.illus.json` + `manifest.json` · ผ่าน `tools/art`

#### P2-F10-T14 — Build 1: login shell + ลำดับ onboarding (gameplay-programmer, 2–3 วัน · W4)
- Acceptance:
  - [ ] จอเริ่มเกม (D-144 เดิม) → login: ปุ่ม Google, Apple เด่น + ลิงก์ email → email login / register / forgot · ทุกปุ่มยืนยัน = bypass ไปขั้นถัดไป · ช่อง password เป็น `type=password` `autocomplete=off` และค่าไม่ถูกเขียนลง storage/log/telemetry (test ตรวจ localStorage ทั้งหมดหลัง submit)
  - [ ] ไม่มี request ใหม่ออกนอก origin allowlist (e2e origin allowlist เดิมผ่าน) · ไม่ load SDK ของผู้ให้บริการ login
  - [ ] ใช้ step machine ของ T12: login → age → consent → permission ตาม D-149 · `kw.p2.account` เขียนหลังผ่าน age gate เท่านั้น · ต่ำกว่าเกณฑ์ไม่มี key ใด · migration ตาม tech note
  - [ ] ข้อความทั้งหมดจาก copy key (ไม่มีสตริงไทยในโค้ด) · e2e ใน `apps/client/e2e/` (รวม `onboarding.spec.ts`) ผ่านกับ flow ใหม่ · client unit + lint + typecheck เขียว · ระบุใน REPORT ว่า spec ใดใน `qa/tests/e2e/` พังแล้ว (ให้ T16)

#### P2-F10-T15 — Build 2: สร้างตัวละคร + เรื่อง 5 slide (gameplay-programmer, 2–3 วัน · W5)
- Acceptance:
  - [ ] จอสร้างตัวละครแทน class sheet เดิม: เลือก class (ข้อมูลจาก `classes.json`), ช่องชื่อ + validate แบบ inline ด้วย `validateCharacterName`, คำเตือนอย่าใช้ชื่อจริง, ปุ่มสุ่มชื่อ, ปุ่มสร้างตัวละคร disabled จนผ่าน · class ผ่าน `chooseClass` ของ engine
  - [ ] migration: ผู้เล่นเดิมที่มี class เข้าจอนี้ตามคำตัดสิน T01 (เช่น class ล็อก ใส่แค่ชื่อ) โดย session/inventory/HP ไม่หาย
  - [ ] เรื่อง 5 slide ใช้ภาพ T13 + key `story.*` · "ถัดไป" ทีละ slide, slide 5 ปุ่ม "ออกไปลุย!" → map · reload กลางเรื่องกลับ slide ตามกติกา tech note
  - [ ] ชื่อไม่อยู่ใน telemetry/export (test) · emit event F10 ส่วนนี้ตรงชื่อ T05 · unit + e2e `apps/client/e2e/` เขียว

#### P2-F10-T16 — แก้ e2e เดิมของ qa ตาม flow ใหม่ (qa-tester, 1–2 วัน · W5)
- Acceptance:
  - [ ] ทุก spec ใน `qa/tests/e2e/` ที่ผ่าน onboarding ใช้ seed/test hook ของ tech note T07 หรือเดินขั้น login ใหม่ · ไม่ลบ assertion เดิม (diff ของ `expect` นับได้)
  - [ ] script visual (`qa/tests/e2e/visual/`) เดินถึงจอเดิมได้ · e2e ของ qa ผ่านทั้งชุด (ส่วนที่รอ T15 ระบุชื่อ spec + เหตุผล แล้วปิดใน T19)

#### P2-F10-T17 — Build 3: map หลัก + nav + Setting/logout (gameplay-programmer, 2 วัน · W6)
- Acceptance:
  - [ ] หลังจบ onboarding map เป็นหน้าหลัก · bottom nav 5 ปุ่ม Inventory, Upgrade, Map, Shop, Party (icon T09, ป้าย key T11) · Inventory เปิด `S-11` เดิม · Upgrade/Shop/Party เปิดจอ "เร็วๆ นี้" · route guard ก่อนจบ onboarding
  - [ ] icon Setting มุมบนขวา เปิดเมนูตั้งค่าเดิม + แถวออกจากระบบ + confirm · logout ตั้ง `kw.p2.account.signedIn = false` อย่างเดียว ไม่ลบ key (spec R41, D-158, orchestrator แก้ 2026-10-01) แล้วกลับจอ login · ตัวละคร/session/inventory ยังอยู่ (test) · พฤติกรรมระหว่าง run ตามคำตัดสิน T01
  - [ ] nav ไม่ทับ HUD run, จอพกกระเป๋า, sheet confirm ที่ 360/390 px (e2e วัด boundingBox ไม่ซ้อนกัน) · ท่าปัดขึ้นค้างของจอพกกระเป๋ายังทำงาน
  - [ ] emit event F10 ที่เหลือ · unit + lint + typecheck + e2e `apps/client/e2e/` เขียว · bundle เริ่มต้นยังอยู่ในงบของ CI

#### P2-F10-T18 — Tech gate F10 (tech-lead, 1 วัน · W7)
- ตรวจ: ตรง tech note T07, config-not-hardcode (ค่าตัวกรอง, คลังชื่อ, route), ไม่มี password/อีเมล/ชื่อใน storage ที่ไม่ควร/telemetry/log, origin allowlist, lint boundary ของ `packages/shared/src/character`, migration ไม่ทำข้อมูลหาย, test ครบและเขียว, gate/reward/HP ไม่ถูกแตะ (diff `packages/shared/src/{reward,hp,session,run}` = ไม่มี หรือมีเหตุผล) · verdict PASS / NEEDS_CHANGES

#### P2-F10-T19 — e2e ใหม่ F10 + ภาพหน้าจอ (qa-tester, 2 วัน · W7)
- Acceptance:
  - [ ] e2e ครอบทุก case อัตโนมัติได้ใน test plan T08: ลำดับ D-149 ครบ, ปฏิเสธ consent, ต่ำกว่าเกณฑ์, ตัวกรองชื่อ (≥ 1 case ต่อเหตุผล), สุ่มชื่อ, เรื่อง 5 slide, nav 5 ปุ่ม + coming soon, logout แล้วข้อมูลตัวละครยังอยู่, migration จาก seed ผู้เล่นเดิม, ไม่มี request นอก allowlist
  - [ ] ภาพหน้าจอ 360/390 px ทุกจอ F10 + run HUD/จอพกกระเป๋าพร้อม nav ใน `qa/reports/F10/` · e2e ทั้งชุด (apps + qa) ผ่านบน android-chrome และ ios-safari

#### P2-F10-T20, T21, T22, T23, T24 — gate ของ F10
- T20 copy (narrative-designer, 1 วัน · W8): กฎ copy 6 ข้อ, key ครบไม่มี key ดิบบนจอ (จากภาพ T19), ความยาวในเพดาน, ไม่สัญญาอีเมลจริง · `design/reviews/F10-copy-gate.md` verdict
- T21 visual (art-director, 1 วัน · W8): icon/ภาพตาม T02, ความเข้ากันกับ HUD เดิม, contrast, ไม่มี logo แบรนด์ผิดนโยบาย · `art/reviews/F10-visual-gate.md` verdict
- T22 QA (qa-tester, 1 วัน · W8): ทุก acceptance ของ T01–T19 มีหลักฐาน, test report `qa/reports/F10-qa-gate.md`, bug blocking = 0 · E18–E23 มีหลักฐาน (E24 เติมหลัง T23/T24, E26 ใน P2-F10-CI)
- T23 design (game-director, 1 วัน · W9): ตรง spec + pillar + non-negotiable 1–7, 10 นาทีแรกยังถึงรางวัลก้อนแรกได้ (ขั้นใหม่ไม่ดันเวลาเกินเป้า spec F06), ไม่สอนสิ่งต้องห้าม · `design/reviews/F10-design-gate.md`
- T24 product (product-manager, 1 วัน · W9): เป้าหมายผู้เล่นใน PRD T05 ถึง, event F10 ทุกตัวถูก emit และอยู่ใน export ไม่มีข้อมูลส่วนบุคคล (E25) · `product/reviews/F10-product-gate.md`
- ทุก gate: NEEDS_CHANGES → orchestrator เปิด X ให้เจ้าของเดิม แล้วรัน gate ซ้ำครั้งเดียว (protocol ข้อ 6) · ครั้งที่สอง escalate ถึงคน

#### P2-F10-CI — CI ในเครื่องเขียว (qa-tester, 0.5–1 วัน · W10)
- Acceptance:
  - [ ] รันจาก root ด้วย `CI=1`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, e2e ทั้งหมด (`apps/client/e2e/` + `qa/tests/e2e/` ทุก project) · แนบบรรทัดสรุปของแต่ละคำสั่งใน `qa/reports/F10-ci-local.md` (exit 0 ทุกคำสั่ง, จำนวน test, retry = 0)
  - [ ] flaky ใน `qa/tests/e2e/` แก้เองโดยไม่ลดสิ่งที่ตรวจ · ล้มนอก path ของ qa → handoff ถึงเจ้าของ (blocking: yes) แล้ว orchestrator รันงานนี้ซ้ำหลัง fix · ห้ามข้าม/skip test
  - [ ] ยืนยัน `lint:copy` 0 FAIL และ config-lint 0 error · E26 มีหลักฐาน

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

### F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav (D-144..D-149 · คนสั่ง 2026-10-01 · ไม่อยู่ใน roadmap เดิม)
| # | เกณฑ์ | ผู้ตรวจ | หลักฐานที่คาด | สถานะ |
| --- | --- | --- | --- | --- |
| E18 | ลำดับ เริ่มเกม → login → ยืนยันอายุ → consent → permission → สร้างตัวละคร → เรื่อง 5 slide → map ทำงานครบ รวม reload กลางทางและปฏิเสธ consent (D-149) | qa-tester | e2e ของ P2-F10-T19 + `qa/reports/F10-qa-gate.md` | TODO |
| E19 | login Google/Apple/email (login, register, forgot) bypass ฝั่ง client: ไม่มี request นอก allowlist, ไม่มี password และอีเมลใน localStorage/telemetry/export (D-145) | qa-tester | e2e ตรวจ storage + origin allowlist + QA gate | TODO |
| E20 | จอสร้างตัวละคร: เลือก class + ชื่อ, ตัวกรองจาก config ปฏิเสธความยาว/อักขระ/เบอร์โทร/อีเมล/ลิงก์/คำต้องห้าม, คำเตือนชื่อจริง, ชื่อสุ่มผ่านตัวกรองเสมอ (D-146) | qa-tester | vector `character-name.json` ผ่าน + e2e + tech gate F10 | TODO |
| E21 | map หลัก + nav 5 ปุ่ม, Upgrade/Shop/Party = "เร็วๆ นี้", Setting มุมบนขวามีตั้งค่า + ออกจากระบบ, logout กลับ login โดยตัวละครยังอยู่, nav ไม่บัง HUD run และจอพกกระเป๋า (D-148) | qa-tester | e2e boundingBox 360/390 px + ภาพ `qa/reports/F10/` | TODO |
| E22 | ผู้เล่นเดิมที่ผ่าน onboarding แล้วอัปเดตโดย session, class, inventory ไม่หาย | qa-tester | e2e migration จาก seed + unit ของ T12 | TODO |
| E23 | PDPA และ non-negotiable: age gate ก่อน consent ยังอยู่, ต่ำกว่าเกณฑ์ไม่มี key ใด, ชื่อตัวละครไม่ออกจากเครื่องและไม่แสดงให้ผู้อื่น, ไม่มีข้อความอิสระอื่น, ไม่มีค่าหรือชื่อฝังโค้ด, gate/reward/HP ไม่เปลี่ยน | qa-tester | QA gate + tech gate + design gate F10 | TODO |
| E24 | gate F10 ครบ 6 อัน PASS (design T23, tech T18, copy T20, visual T21, QA T22, product T24) + flow approval T10 PASS | qa-tester | `design/reviews/F10-flow-approval.md`, `design/reviews/F10-design-gate.md`, `design/reviews/F10-copy-gate.md`, `docs/reviews/F10-tech-gate.md`, `art/reviews/F10-visual-gate.md`, `qa/reports/F10-qa-gate.md`, `product/reviews/F10-product-gate.md` | TODO |
| E25 | event F10 อยู่ใน `product/telemetry-events.md`, ถูก emit ตรงชื่อ และไม่มีข้อมูลส่วนบุคคล · product gate PASS | product-manager | `product/reviews/F10-product-gate.md` | TODO |
| E26 | lint, typecheck, pnpm test, build, e2e ทั้งหมดเขียวในเครื่องแบบ CI=1 หลัง F10 | qa-tester | `qa/reports/F10-ci-local.md` (P2-F10-CI) | TODO |

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

คำถามใหม่จาก plan-sync W7 (2026-09-27):

| ID | คำถาม | ตัวเลือก | ทีมแนะนำ | Blocking | ต้องการคำตอบก่อน |
| --- | --- | --- | --- | --- | --- |
| Q-W7-1 | หลัง rerun coverage (P2-H11) ปทุมวันตก G1 (46.29% < 60%) และบางรักยังตก G2 (4 < 10) · Go ของ 3 ย่านเปิดตัวใน D-083 ยังใช้อยู่หรือไม่ | (ก) คงไว้ ตรวจใหม่ก่อน closed beta ตามข้อเสนอ P2-H16 (ข) เร่งตรวจภาคสนาม One Bangkok / สวนดุสิตอรุณใน Phase 2 (ค) เปลี่ยนย่าน | **(ก)** · ไม่กระทบ playtest ที่ PN-2 พระนครและไม่อยู่ในเกณฑ์ปิด Phase 2 | ไม่ | ก่อน P2-CLOSE-PM |
| Q-W7-2 | วันออกเดิน P2-C01 แล้ว P2-C02 + P2-F04-T11 ในรอบเดียวกัน | ระบุวันและช่วง เช้า ~07:00–09:30 หรือเย็น ~16:30–18:30 (D-093) | ภายใน 1–2 วัน ให้ผลถึงก่อน W10 | ใช่ สำหรับ F06-T26/T27 (ไม่กั้นการ build) | dispatch W10 |

ข้อมูลที่ไม่ต้องให้คนตัดสิน (แจ้งเพื่อทราบ · orchestrator ลง decision log): ข้อขยาย A-P2-PLAN-01-6 (backend ถือ engine ทั้งชุดใน `packages/shared`) ไม่แตะเกณฑ์ปิด roadmap จึงเป็นอำนาจ producer ตามที่ tech-lead ระบุ · คำตัดสินของ game-director ใน A-P2-PLAN-02-1

## 7. Change log

| วันที่ | โดย | การเปลี่ยนแปลง |
| --- | --- | --- |
| 2026-09-26 | producer (P2-PLAN-01) | สร้าง board ฉบับร่าง 82 task (P1 carry-in 9, RISK 1, F04 23, F05 18, F06 29, ปิด phase 2 · agent 74, HUMAN 8) · ย้ายงาน Phase 1 ที่เหลือเป็น P2-C01..C08 ตาม D-086 + P2-C09 · จับคู่รายการยกมาทุกข้อในหัวข้อ 1.9 · มอบ reward/HP engine ให้ backend-programmer (รอ plan review) |
| 2026-09-26 | producer (P2-PLAN-02) | rev 2 ตาม plan review 3 ฉบับ: เพิ่ม 7 งาน (P2-F04-T24..T27, P2-F05-T19, P2-F05-T20, P2-F06-T30), รวม 2 งาน (P2-F04-T07 → T16, P2-F06-T15 → P2-F04-T10), ย้าย engine ทั้งชุดไป backend (รับข้อขยาย A-6), แก้ deps สายสนาม, จัด wave ใหม่ 17 wave (ไม่มีงานสนามบนเส้นวิกฤต), เพิ่ม E15–E17, หัวข้อ 6 คำถามถึงคน · รวม 89 แถว (agent 79, HUMAN 8, CUT 2) |
| 2026-09-27 | producer (P2-PLAN-SYNC-W7) | plan-sync W7 ตาม `studio/phases/phase-2/plan-sync-w7.md`: เพิ่ม P2-H20, P2-X27..X33 (8 แถว) · P2-H03 CUT รวมเข้า F05-T10 (ส่วน test) + F06-T10 (route) · P2-H14 CUT รวมเข้า X29 + F06-T14 · composite-f03 อยู่ใน H17/X26 แล้ว (ไม่มี op แยก) · deps ใหม่: F05-T17, F05-T18, F06-T09, T10, T14, T20, T21, T22, T23, T24, P2-CLOSE-QA · F06-T25 บันทึกทางเลือก O-22 รอ PM · ตัดส่วนย่อยนอกขอบเขต: V-15 chip-sponsored, geometry 76 เขต (ถ้า H20 เลือกทาง ข), slot-empty · H08 → W10 · แผน wave W8–W18 · ไม่มีการตัด gate หรือ exit item · คำถามคน Q-1 (D-083 หลัง G1/G2), Q-2 (วันเดิน) · ค้างให้ orchestrator ลงเอง (ตัวจัดสิทธิ์ปฏิเสธ producer): context note ของ F05-T10, deps F05-T15 (+X21, H02), deps F06-T08 (+F06-T05), กฎสลับข้อ 8–10 + ประมาณการ |
| 2026-10-01 | producer (P2-PLAN-F10) | เพิ่ม feature F10 ตาม D-144..D-149 (คนสั่งใน chat 2026-10-01): 25 แถว P2-F10-T01..T24 + P2-F10-CI (spec 6, asset 4, build 7, fix 1, review-gate 7 รวม flow approval · agent ทั้งหมด ไม่มี HUMAN ไม่มี dep ถึงงาน HUMAN) · detail block "F10" ในหัวข้อ 4 · exit E18–E26 ในหัวข้อ 5 · แผน wave F1–F10 + critical path ใน `studio/phases/phase-2/plan-sync-f10.md` · ไม่แตะ P2-F06-T26..T29, `qa/playtest/`, `product/playtest/` (D-149) · ไม่ตัด gate หรือ exit item · หมายเหตุ: แถว change log 2026-09-30 ของ orchestrator อยู่ท้ายตาราง "rev 2: review points" (ที่ผิด) ไม่ได้ย้าย |

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
| 2026-09-30 | orchestrator | Run 2 (W12–W22): apply plan-sync W16 (O-01/03..07/12/14/20/21 + กฎสลับ 11–13), เพิ่มแถว H33–H61, X39–X54, RISK-02 · gate F04+F05 และ F06 ผ่านครบ (visual gate escalate → D-140) · CUT V-37 → Phase 3 · สถานะ COMPLETE — AGENT SIDE, WAITING FOR HUMAN |
