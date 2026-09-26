# Plan review — tech-lead · board Phase 2 DRAFT rev 1 (P2-PLAN-01)

task: P2-PLAN-REV-TL · วันที่ 2026-09-26 · ผู้ตรวจ: tech-lead
ขอบเขต: `studio/phases/phase-2/board.md` ทั้งไฟล์ (หัวข้อ 1–5) เทียบกับ ADR 0001/0002, `docs/tech/gps-trace-format.md`, โค้ดจริงใน repo ณ commit d24f676

## 0. Verdict

**verdict: NEEDS_CHANGES** — มี finding แบบ blocking 14 ข้อ (หัวข้อ 2) · ทุกข้อแก้ได้ด้วยการแก้ acceptance / deps / writes ของงานเดิม หรือเพิ่มงาน 3 งาน (P2-F04-T24, T25, T26) และ review 1 งาน (P2-F05-T19) · ไม่มีข้อใดต้องตัดเกณฑ์ปิด phase และไม่มีข้อใดต้องใช้บริการคิดเงิน

สรุปคำตัดสินที่ถูกขอ
| หัวข้อ | คำตัดสิน |
| --- | --- |
| A-P2-PLAN-01-1 (ผลบน client ไม่ใช่รางวัลจริง · logic pure ย้ายไป Worker ได้) | **ACCEPT** พร้อมเงื่อนไข C1-1..C1-5 (หัวข้อ 1.1) |
| A-P2-PLAN-01-2 (ไม่มีข้อมูลออกจากเครื่อง · telemetry ในเครื่อง · export ไม่มีพิกัด) | **ACCEPT** พร้อมเงื่อนไข C2-1..C2-6 (หัวข้อ 1.2) |
| A-P2-PLAN-01-6 (backend ถือ `src/reward`, `src/hp` · gameplay ถือ `src/formulas`, `src/config`, `src/run`) | **ACCEPT** ส่วน backend ถือ reward + hp · เสนอขยาย (non-blocking แต่แนะนำ) ให้ backend ถือ `src/formulas`, `src/config`, `src/run` ด้วย (หัวข้อ 1.3) |
| งานที่ต้องใช้ผลเดินทดสอบจริง | ตารางในหัวข้อ 1.4 · ปลด P2-F06-T14, T13, T15, T16 ออกจากสายสนาม · P2-F05-T12 ขึ้นกับ P2-C03/C04 ไม่ใช่ P2-C05 |

## 1. คำตัดสินเชิงสถาปัตยกรรม

### 1.1 A-P2-PLAN-01-1 — ACCEPT พร้อมเงื่อนไข

เหตุผล: ตรงกับ ADR 0001 หัวข้อ 3.8 (SF-10) ที่บันทึกไว้แล้วว่า "ผลที่คำนวณบน client ใน Phase 2 ไม่ใช่รางวัลจริง และไม่ถูกย้ายเข้า account ใน Phase 3" และ ADR 0002 หัวข้อ 5.3 ที่ให้ logic ของ run/gate ย้ายไป CellDO ได้โดยไม่แก้ · non-negotiable 1 ยังไม่ถูกละเมิดเพราะ Phase 2 ไม่มีรางวัลจริงให้ปกป้อง และโค้ดที่ client เรียกเป็นตัวเดียวกับที่ server จะเรียก

เงื่อนไข (ต้องอยู่ใน ADR 0003 ของ P2-F04-T05 และ tech gate P2-F05-T15 / P2-F06-T20 ตรวจ)
- C1-1 ADR 0003 บันทึกว่านี่คือข้อยกเว้นที่มีวันหมดอายุ: ตั้งแต่ Phase 3 client เลิกเรียก `reward`/`hp`/`run` เพื่อตัดสินผล (เหลือเพียงแสดงผลจาก server) · tech gate ของ F08 ตรวจการถอด
- C1-2 ความ pure บังคับด้วยเครื่องมือ ไม่ใช่ด้วยตา: ESLint `no-restricted-globals` / `no-restricted-properties` ใน `packages/shared/src/**` และ `packages/geo/src/**` ห้าม `Date.now`, `Math.random`, `performance`, `setTimeout`, `setInterval`, `window`, `document`, `navigator`, `localStorage`, `indexedDB`, `fetch`, `crypto.getRandomValues` · tsconfig ของสองแพ็กเกจคง `lib: ["ES2023"]`, `types: []` (ตอนนี้ `packages/shared/tsconfig.json` ถูกแล้ว ให้ `packages/geo/tsconfig.json` ตามแบบเดียวกัน)
- C1-3 เวลาและสุ่มเป็น parameter: engine เป็น reducer รูป `step(state, input, now_ms, params) → { state, events }` · ไม่มี timer ใน shared · client เป็นคนตั้ง timer และส่ง `now_ms` (ดู B-07, B-09)
- C1-4 ห้ามใช้ Ajv หรือ `new Function` ใน runtime path ของ shared (Worker ไม่อนุญาต · ADR 0001 บรรทัด 228) · Ajv ใช้ได้ใน test / tools / build step เท่านั้น (ดู B-06)
- C1-5 state ที่ client เก็บใช้ namespace `kw.p2.*` และ Phase 3 ล้างทิ้งเมื่อผู้ใช้ login ครั้งแรก · ไม่มีเส้นทาง "import progress" ใดใน Phase 3 · UI ไม่ต้องมีป้าย "ไม่ใช่รางวัลจริง" (playtest ต้องการความรู้สึกจริง) แต่ kit ของ P2-F06-T18 ต้องแจ้งผู้ร่วม

### 1.2 A-P2-PLAN-01-2 — ACCEPT พร้อมเงื่อนไข

เหตุผล: Phase 2 ไม่มี backend (ADR 0002 หัวข้อ 5.3) · การไม่ส่งข้อมูลออกจากเครื่องตัดความเสี่ยง PDPA ของ `position_log` ออกทั้งหมดใน phase นี้ และ repo เป็น public (D-002)

เงื่อนไข
- C2-1 request ที่ออกจากเครื่องมีได้เฉพาะ static asset ของ Pages และ tile/glyph ของ map origin (ซึ่งเป็นการโหลดข้อมูลแผนที่ ไม่มีข้อมูลผู้ใช้) · e2e ของ P2-F04-T22 ตรวจว่า request ทุกตัวระหว่างเล่น run ครบรอบผ่าน Mock ไปเฉพาะ origin ที่อนุญาต (รายการ origin อ่านจาก `config/app/client.json`) · ไม่มี analytics SDK ภายนอก
- C2-2 sink ในเครื่อง = ring buffer ใน IndexedDB (หรือ localStorage ถ้า tech note เลือก) เพดานจำนวน event เป็น key ใน `config/app/telemetry.json` · export = ดาวน์โหลดไฟล์ (Blob) เท่านั้น ไม่มี upload
- C2-3 property allowlist: test ของ P2-F04-T25 ยืนยันว่าไม่มี property ชื่อหรือค่าที่เป็นพิกัด (`lat`, `lng`, `lon`, `coords`, `accuracy` รวมคู่ตัวเลขทศนิยม ≥ 4 หลักที่อยู่ในช่วง lat/lng ของประเทศไทย) ใน event ใดและใน export
- C2-4 export สำหรับ playtest ใช้เวลาแบบ relative จากต้น run (ไม่มีเวลาจริง) เพราะ `dungeon_id` + เวลาจริงบอกได้ว่าคนอยู่ที่ไหนเมื่อไร และผลวางใน `product/playtest/results/` ซึ่ง commit ลง repo public
- C2-5 run state ในเครื่องเก็บ sample เฉพาะที่หน้าต่าง gate ปัจจุบันต้องใช้ (≤ `window_s` ย้อนหลัง) และล้างเมื่อ run จบ · ไม่มี trace ต่อเนื่องค้างในเครื่อง (สอดคล้องเจตนา TTL 24 ชม. ของ `position_log`)
- C2-6 หน้าตั้งค่ามีปุ่ม "ลบข้อมูลในเครื่อง" (ล้าง `kw.p2.*` + telemetry) ต่อจากการถอน consent ใน P2-F06-T09 · copy key จาก P2-F05-T09

### 1.3 A-P2-PLAN-01-6 — ACCEPT (พร้อมข้อเสนอขยาย)

ส่วนที่ขอ: backend-programmer ถือ `packages/shared/src/reward/` (P2-F05-T08) และ `src/hp/` (P2-F06-T06) → **ACCEPT**
- เหตุผลทางเทคนิค: สองโมดูลนี้จะรันใน CellDO ตั้งแต่ Phase 3 (ADR 0002) · คนที่จะรันบน server เขียนเองลดความเสี่ยงที่ server ต้อง fork · agent file ของ backend-programmer กำหนดให้ "recompute ... using `packages/shared` pure functions" อยู่แล้ว · การมอบนี้ไม่แตะเกณฑ์ปิดของ roadmap จึงเป็นอำนาจ producer (บันทึกใน decision log) ไม่ต้องถาม HUMAN
- เงื่อนไข: backend-programmer ไม่เขียนโค้ด Worker / DO / D1 / wrangler ใด ๆ ใน Phase 2 (D-085, ADR 0002 หัวข้อ 5.3) · สร้างตามสัญญาใน tech note (P2-F04-T14, P2-F06-T04) ไม่ใช่ตามโค้ด client

ข้อเสนอขยาย (non-blocking แต่แนะนำ · ดู B-13 ประกอบ): ให้ backend-programmer ถือ `src/formulas/` + `src/config/` (P2-F05-T02, W2) และ `src/run/` (P2-F04-T20, W3) ด้วย
- เหตุผล: (1) run state machine ตัดสินว่าอยู่ใน dungeon หรือไม่ ซึ่งเป็นค่าที่มีผลต่อรางวัล และย้ายไป CellDO ใน Phase 3 เหมือน reward · หลักเดียวกับที่ producer ใช้กับ reward/hp (2) backend ว่างใน W2–W3 ตามแผน ส่วน gameplay เป็นคอขวด 10 งาน (3) ช่อง gameplay ที่ว่างใน W3 ใช้ทำ P2-F04-T25 (plumbing ที่แยกจาก T21 ตาม B-13) ทำให้ T21 เล็กลงและเสร็จใน W4 ได้จริง
- ผล: backend = W2 F05-T02 → W3 F04-T20 → F05-T08 → F06-T06 (4 งาน ไม่ชนกัน · wave ตามหัวข้อ 5) · gameplay = W1 T10 → W3 T25 → W4 T21 → ... (จาก 10 เหลือ 9 งาน: ได้ T25 เสีย T20 และ F05-T02)
- ถ้า producer ไม่รับข้อขยาย: gameplay ถือ formulas/config/run ตามร่างได้ แต่ต้องแก้ B-04, B-13 ด้วยวิธีอื่น

### 1.4 งานไหนต้องใช้หลักฐานจากการเดินจริง (P2-C03 / P2-C05)

หลัก: รอผลเดินเฉพาะงานที่ "ค่า" หรือ "ข้อสรุป" มาจากข้อมูลสนาม · งานที่เขียนโค้ดแบบ feature detection พร้อม fallback ได้ ไม่ต้องรอ · Go/No-go (P2-C05) เป็นคำตัดสินเรื่อง stack แผนที่ จึงควรกั้นเฉพาะการเอาไปให้คนนอกเล่น (P2-F06-T26)

| งาน | ต้องรอสนาม? | deps ที่ถูกต้อง | เหตุผล |
| --- | --- | --- | --- |
| P2-C03 | ใช่ | P2-C02 | เป็นตัวสรุปผลสนามเอง |
| P2-C04, P2-C06 | ใช่ | ตามร่าง | ต้องมี raw trace / ผลเดิน |
| P2-F06-T12 matrix F-17 | ใช่ | P2-F04-T11, **P2-C02** (แทน P2-C03) | อ่านผล probe + ผลเดินตรง ไม่ต้องรอบทสรุปของ C03 · tech-lead ทำต่อจาก C03 ใน wave เดียวกันไม่ได้อยู่แล้ว |
| P2-F05-T12 ค่า speed lock แบบกรอง | ใช่ (ข้อมูล ไม่ใช่คำตัดสิน) | **P2-C03, P2-C04** (CUT = ใช้ synthetic `soi-occluded` + `driving-40kmh`) · ถอด P2-C05 | ต้องการ trace ซอยจริง ไม่ต้องการผล Go/No-go |
| P2-F05-T13 | ตาม T12 | P2-F05-T12, P2-F04-T12 | — |
| P2-F06-T26 deploy playtest | ใช่ | คง P2-C05 + **เพิ่ม P2-F06-T12** | ไม่ให้คนนอกเล่นบน stack ที่ยังไม่ Go และต้องรู้ว่าเครื่องไหนใช้ทาง A ได้ |
| P2-F06-T14 pocket screen + Wake Lock + fire-together | **ไม่** | ถอด P2-C05 และ P2-F06-T12 | Wake Lock / vibrate ใช้ feature detection (`'wakeLock' in navigator`, `'vibrate' in navigator`) และต้องมี fallback ทาง B ทุกเครื่องอยู่แล้ว · iOS ไม่มี vibrate รู้แล้วจาก Phase 1 (F-17) · matrix ใช้ยืนยันบนเครื่องจริงและเปิด X ถ้าพบต่าง |
| P2-F06-T13 cue fallback | **ไม่** | P2-F06-T03, P2-F05-T06 · ถอด P2-F06-T12 | fallback เมื่อไม่มี vibrate ต้องมีเสมอ |
| P2-F06-T15 code-split + งบ bundle | **ไม่** | ถอด P2-C03 และ P2-F06-T14 | S5 วัดจาก `dist/` ได้แน่นอน (ขนาด gzip/brotli = transfer) ไม่ขึ้นกับสนาม · งบตั้งต้นใช้เกณฑ์ S5 ≤ 1.0 MB ในหัวข้อ "เกณฑ์ spike" ของ tech note F02 · ถ้า P2-C03 ให้ตัวเลขใหม่ แก้ค่าใน config เท่านั้น · deps บน T14 เป็นแค่การต่อคิว `apps/client/` ซึ่ง orchestrator จัดเองได้ |
| P2-F06-T16 CI bundle + bbox | **ไม่** | P2-F06-T15, P2-F04-T23 | ตามข้างบน |
| P2-F06-T20 tech gate F06 | ไม่ | ถอด P2-F05-T13 (ย้ายไป P2-F05-T19 ใหม่ · ดู B-11) | ไม่ให้สายสนามขวาง gate → QA → playtest |
| P2-F04-T12, P2-F05-T08 gate + jitter filter | ไม่ (เริ่มด้วย synthetic) | ตามร่าง | แต่ต้องมีจุดตรวจซ้ำหลัง P2-C03 ตาม N-11 |

ผล: สายสนามเหลือกั้นเฉพาะ P2-F05-T12/T13 (ไม่อยู่ในเกณฑ์ปิด) และ P2-F06-T26 (ต้องกั้นจริง) · กฎสลับข้อ "ถ้าถึง W9 แล้ว P2-C05 ยังไม่ DONE" ในหัวข้อ 3 ไม่จำเป็นอีก เพราะ gameplay ทำ T14 และ T15 ได้โดยไม่รอ

## 2. Findings แบบ blocking (ต้องแก้ใน board rev 2 ก่อน `/run-phase 2`)

**B-01 · P2-F04-T05, P2-F04-T12 · ทิศ dependency ระหว่าง `packages/geo` กับ `packages/shared` วนได้**
- ปัญหา: ADR 0001 บรรทัด 71 อนุญาต `packages/shared → packages/geo` · reward engine ใน shared ต้องเรียก geo แต่ร่าง T12 มีแนวโน้ม import `LocationSample` / `TraceSample` จาก shared (ทุกโค้ด location ตอนนี้ทำแบบนั้น) → วง `geo ↔ shared` ที่ pnpm/tsc ไม่จับให้จนกว่าจะพัง
- แก้: acceptance ของ T05 เพิ่ม "geo เป็น leaf: ไม่มี workspace dependency · input เป็น structural type ของตัวเอง (`{ t_ms, lat, lng, accuracy_m }`) · lint `no-restricted-imports` ห้าม `@keep-walking/*` ใน `packages/geo/src/**`" · acceptance ของ T12 เพิ่ม "`packages/geo/package.json` ไม่มี dependency `@keep-walking/*`"

**B-02 · P2-F04-T05, P2-F04-T14, P2-F05-T01, P2-F05-T08 · นิยามหน้าต่าง gate ปนระหว่างค่าวัดของ HUD กับกฎของรางวัล**
- ปัญหา: T05 เขียน "นิยามหน้าต่าง gate (ช่วงปิด, เลื่อนทีละ 30 วิ ...)" ซึ่งเป็นนิยามของ `gate_windows_*` ใน `gps-trace-format.md` 4.1 (หน้าต่างเลื่อน ใช้วัดคุณภาพ GPS) · แต่รางวัลต้องใช้หน้าต่างแบบไม่ทับกันที่ผูกกับ reward tick (`rewardTickInterval_s` = `window_s` = 300) · ถ้า engine ใช้หน้าต่างเลื่อน ผู้เล่นได้ tick จากระยะเดียวกันซ้ำ และ server Phase 3 จะได้ผลต่างจาก client
- แก้: ADR 0003 นิยามสองอย่างแยกชื่อ: `gateDiagnosticWindows` (เลื่อน 30 วิ, HUD เท่านั้น) และ `rewardWindow` (ไม่ทับกัน เริ่มนับเมื่อเข้า Active หลัง confirm, หยุดนับระหว่าง Grace/Suspended ตาม `rewardTickDuringGrace`/`suspendedTimeCounts`, ระยะของคู่ sample ที่คร่อมขอบหน้าต่างแบ่งตามสัดส่วนเวลา หรือนับเข้าหน้าต่างของ sample ปลาย — เลือกหนึ่งแบบ) · `comparison: greaterThan` = ระยะเท่าเกณฑ์พอดีไม่ผ่าน · tech note T14 มี sequence ต่อ tick · vector ของ systems (ดู B-03) ครอบทุกข้อ

**B-03 · P2-F04-T12, P2-F05-T01 (หรือ P2-F06-T01), P2-F05-T08 · ตัวกรอง jitter อาจทำให้ E4 (ม้านั่ง jitter ต้องได้ tick) ตก**
- ปัญหา: trace `synthetic-bench-jitter-01` ผ่าน gate **เพราะ** jitter ราว 1.5 ม. ที่ 1 Hz สะสมเกิน 50 ม. ส่วน `table-still` jitter < 1 ม. ไม่ผ่าน · T12 เขียน "กรอง jitter" โดยไม่มีข้อกำหนดว่ากรองอะไร · ถ้ากรองแบบ smoothing หรือ min-step ม้านั่งจะได้ 0 tick (ขัด E4 และ GDD) · และระยะสะสมจาก jitter ขึ้นกับความถี่ sample ของเครื่อง (1 Hz กับ 0.2 Hz ได้ระยะต่างกันหลายเท่า) ทำให้ gate ไม่ใช่ "ตัวเดียวกันทุกที่"
- แก้: (1) ADR 0003 กำหนดว่าตัวกรองของ gate ทิ้งเฉพาะ outlier (accuracy เกินเกณฑ์, ความเร็วระหว่างคู่ sample เกินเกณฑ์ความเป็นไปได้ เช่น spike 150/300 ม. ใน `drift-spike`) และไม่ทำ smoothing ของ jitter เล็ก (2) ก่อนสะสมระยะ ให้ resample เป็นจังหวะคงที่จาก config (เช่น `movementGate.sampleCadence_s`) เพื่อให้ผลไม่ขึ้นกับความถี่ sample ของเครื่องและ server ได้ผลเท่ากันจาก batch รายนาที (3) ค่าทุกตัวเป็น key ของ systems-designer · vector: table-still = 0 หน้าต่างผ่าน, bench-jitter ≥ 1, drift-spike ไม่ได้ tick จาก spike, edge-walk ไม่นับ spike ข้ามขอบ · T12 รับค่าเป็น parameter (geo ไม่อ่าน config เอง)

**B-04 · P2-F04-T10 (W1) กับ P2-F04-T05 (W1) · T10 ใช้ของที่ T05 ติดตั้งใน wave เดียวกัน**
- ปัญหา: acceptance ของ T10 ข้อ "test ของ hud-panel ใน DOM environment" ต้องมี `happy-dom`/`jsdom` ใน lockfile ซึ่ง T05 เป็นคนติดตั้งใน W1 เดียวกัน · agent สองตัวรันขนานกัน T10 จึงรัน test นั้นไม่ได้ และถ้าแก้ lockfile เองจะชน Writes ของ T05
- แก้: ย้ายข้อ DOM test (S15 latency, S3 แบต/CSV) ออกจาก T10 ไปไว้ใน P2-F04-T25 (W3, ดู B-13) · T10 คงเฉพาะ probe + environment/segment + `stationary_5min_accum_m` + `tilesUrlMissing` · T10 ใช้นิยาม 4.1 ฉบับปัจจุบัน (ถ้า T05 แก้นิยาม ให้ T25 ตามแก้)

**B-05 · P2-F05-T02, P2-F05-T01 · ขอบเขตการ port แคบเกินจน engine ต้อง fork สูตร**
- ปัญหา: T02 port เฉพาะ `tools/sim/src/formulas.ts` · แต่ logic ที่ reward/HP engine ต้องใช้อยู่ในไฟล์อื่นของ `tools/sim`: `rng.ts` (`mulberry32`, `uniform`), `drops.ts` (`dropRates`, `rangedTerm`, `stochasticRound`, `dropParamsFromConfig`), `survival.ts` (`hitsToThreshold`, ส่วน pure ของ `simulateRun`) · ถ้าไม่ port backend จะเขียนใหม่ใน `src/reward`/`src/hp` = fork · อีกข้อ T02 เขียนว่า "tools/sim ใช้สูตรจาก shared" แต่ `tools/sim/` ไม่อยู่ใน Writes ของ T02 และ W2 มี P2-F06-T01 ถือ `tools/sim/` อยู่ (ชนถ้าเพิ่ม)
- แก้: T02 port `formulas.ts` + `rng.ts` (เฉพาะ PRNG) + ส่วน pure ของ `drops.ts` และ `survival.ts` เข้า `packages/shared/src/formulas/` · Monte Carlo / report คงอยู่ใน tools · ย้ายข้อ "tools/sim import จาก `@keep-walking/shared` และลบสำเนา" ไปเป็น acceptance ของ P2-F05-T01 (systems, W3, ถือ `tools/sim/` · `tools/sim/package.json` มี dependency shared อยู่แล้ว) · `gen-vectors --check` ต้องเขียวหลังสลับ

**B-06 · P2-F05-T02 · config loader ต้องไม่ใช้ Ajv ใน runtime และ schema/config lint เป็นงาน tech-lead ตาม D-062**
- ปัญหา: acceptance "validate schema" ใน `src/config/` ถ้าใช้ Ajv จะรันใน Worker ไม่ได้ (ADR 0001 บรรทัด 228) · และ ADR 0001 หัวข้อ 3.10 / D-062 กำหนดให้ JSON Schema ต่อไฟล์ config และ config lint (`_meta`, `_source`, suffix, pointer, `null`) เป็นงานของ tech-lead ใน Phase 2 · board ไม่มีงานนี้ และยก H01 config lint ให้ gameplay
- แก้: เพิ่ม **P2-F04-T24 (tech-lead, W3, ช่องที่ว่างอยู่แล้ว)** "JSON Schema ต่อไฟล์ config + config lint + ต่อเข้า `pnpm test`" · Writes: `packages/shared/schemas/config/`, `tools/config-lint/` · deps: P2-F04-T05 · T02 เหลือ loader แบบ typed accessor (ตรวจ type/ช่วงด้วยโค้ดธรรมดา, `null` = fail ชัด, ข้าม `_`, namespace ตาม 3.10) และตรวจ H03 · schema ใช้ใน test/build เท่านั้น

**B-07 · P2-F04-T14, P2-F05-T08, P2-F06-T06, P2-F05-T10, P2-F06-T08 · ลำดับเรียก run → reward → hp อยู่ในโค้ด client**
- ปัญหา: engine สามตัวอยู่ในสามโฟลเดอร์และสองเจ้าของ · board ให้ client (F05-T10, F06-T08) เป็นคน "ต่อ reward engine เข้า run" และ "ต่อ HP engine เข้า run และ reward" · ลำดับการเรียก (sample เข้า → presence → gate → tick → drop → hit → auto-retreat → จบ run) จึงเป็น logic ที่อยู่ใน `apps/client` ซึ่ง server ใช้ไม่ได้ = fork ที่มองไม่เห็น
- แก้: เพิ่มโมดูล `packages/shared/src/session/` (ตัวประกอบ loop แบบ reducer เดียว `sessionStep(state, input, now_ms, config, rng) → { state, events }`) · Writes ของ P2-F05-T08 เพิ่ม `src/session/` (สร้างพร้อม run + reward) · P2-F06-T06 ต่อ hp เข้า session (Writes เพิ่ม `src/session/`, คนละ wave) · tech note T14 กำหนด API และลำดับ · acceptance ของ F05-T10 / F06-T08 เปลี่ยนเป็น "client เรียก `sessionStep` เท่านั้น ไม่เรียก engine ย่อยตรง" · tech gate ตรวจด้วย lint `no-restricted-imports` ห้าม client import `src/run|reward|hp` ตรง
- deps: P2-F05-T08 เพิ่ม P2-F04-T20

**B-08 · P2-F04-T05, P2-F04-T14, P2-F04-T20 · ไม่มี check-in/check-out strategy ตาม baseline**
- ปัญหา: baseline ของสถาปัตยกรรม (GDD, tech-lead brief) กำหนด check-in/check-out เป็น strategy: `continuous_gps` ทำจริง, `entry_exit` มีแค่ interface · เลือกตาม `verification_mode` ของ dungeon · board ไม่มีข้อนี้ในงานใด และไม่อ้าง `anticheat.checkIn.*` (`minContinuousApproach_s`, `maxAccuracy_m`, `teleportIntoPolygonAllowed`) ที่มีอยู่แล้วใน config ทั้งที่ event `checkin_rejected` อยู่ใน T17
- แก้: T05 กำหนด interface `PresenceStrategy` ใน ADR 0003 · T14 ระบุ sequence ของ confirm + check-in · T20 acceptance เพิ่ม "`continuous_gps` ใช้ `checkIn.*` จาก config · `entry_exit` เป็น interface ที่โยน `NotImplemented` · strategy เลือกจาก `verification_mode` ของ record" · vector ของ check-in (ต้องเข้าใกล้ต่อเนื่อง ≥ `minContinuousApproach_s`, teleport เข้า polygon ถูกปฏิเสธ) อยู่ในงาน vector ของ systems

**B-09 · P2-F04-T05, P2-F04-T14 · สัญญา RNG ไม่พอให้ server ทำซ้ำได้**
- ปัญหา: board เขียนแค่ "RNG มี seed" · ถ้าลำดับการดึงเลขสุ่มไม่เป็นสัญญา การเพิ่มการตีหนึ่งครั้งจะเลื่อนผล drop ทั้งหมด และ server Phase 3 ได้ผลไม่ตรงกับ vector
- แก้: ADR 0003 กำหนด (1) stream แยกต่อระบบ (drop, hit) แตกจาก seed ของ run ด้วยวิธีที่กำหนดแน่นอน (2) ลำดับการดึงต่อ tick (rarity → item → `stochasticRound`) และต่อการตี (เวลาถึงการตีถัดไป → hit/miss) (3) Phase 3 seed อยู่ที่ server เท่านั้น ไม่ส่งถึง client (ไม่งั้นทำนาย drop ได้) · vector ของ drop/hit ระบุ seed + ลำดับ

**B-10 · P2-F05-T14 · build profile `playtest` ต้องมีงานฝั่ง client แต่ devops แก้ `apps/client/` ไม่ได้**
- ปัญหา: acceptance ของ F05-T14 (HUD ปิดตั้งต้น, Mock เปิดผ่าน query เท่านั้น, ป้าย version + short SHA) ต้องให้ client อ่านค่า profile ตอน build · Writes ของ devops มีแค่ workflow / infra · ตามกฎ path ร่วม `apps/client/` เป็นของ gameplay เท่านั้น
- แก้: acceptance ของ P2-F04-T25 เพิ่ม "client อ่าน profile ตอน build (env ชื่อที่ tech note กำหนด เช่น `VITE_KW_PROFILE`, `VITE_KW_COMMIT`) · profile `playtest`: HUD ปิดตั้งต้น, Mock เปิดได้เฉพาะ query, แสดง version + short SHA" · F05-T14 deps เพิ่ม P2-F04-T25 · F05-T14 ส่งค่า env ผ่าน workflow เท่านั้น (ไม่มี secret)

**B-11 · P2-F06-T14, P2-F06-T13, P2-F06-T15, P2-F05-T12, P2-F06-T20, P2-F06-T26 · deps ของสายสนามผิด**
- ปัญหาและแก้: ตามตารางหัวข้อ 1.4 · สรุปการแก้ deps: F06-T14 ถอด P2-C05, P2-F06-T12 · F06-T13 ถอด P2-F06-T12 · F06-T15 ถอด P2-C03, P2-F06-T14 · F05-T12 เปลี่ยน P2-C05 → P2-C03 + P2-C04 · F06-T12 เปลี่ยน P2-C03 → P2-C02 · F06-T20 ถอด P2-F05-T13 · F06-T26 เพิ่ม P2-F06-T12 · เพิ่ม **P2-F05-T19 (tech-lead) "Tech review speed filter"** deps P2-F05-T13 · Writes `docs/reviews/F05-speed-filter-tech-gate.md` · P2-CLOSE-QA deps เปลี่ยนจาก P2-F05-T13 เป็น P2-F05-T19
- หัวข้อ 1 "กฎงานที่ขึ้นกับผลเดินทดสอบ" และกฎสลับข้อ W9 แก้ตาม

**B-12 · P2-F04-T13, P2-F04-T14, P2-F04-T21 · ไม่มีงานสร้างเครื่องมือตรวจและแปลงข้อมูล dungeon ถึง client · `opening_hours` ไม่มีข้อกำหนดการประเมิน**
- ปัญหา: (1) T13 ต้อง "ผ่านกฎ dungeon-rules.md พร้อมผลตรวจ" (พื้นที่ 3,000–150,000 ตร.ม., ไม่ทับกัน, ไม่ทับเขตที่ตัด) แต่ไม่มีงานใดเขียนตัวตรวจ · (2) T14 ระบุ "build step จาก `data/dungeons/`" แต่ไม่มีงานใดสร้าง build step (จุดป้ายตาม D-075 / polylabel, ตัด property ให้เหลือ whitelist, แปลงเป็นไฟล์ที่ client โหลด) · (3) T05 เปิดทาง "ตัว parse opening_hours ถ้าเลือก" · library `opening_hours` บน npm ใหญ่และลาก dependency ด้านวันหยุด/i18n มาด้วย ไม่เหมาะกับ bundle และ Worker · (4) การประเมินเวลาทำการด้วย timezone ของเครื่องให้ผลต่างจาก server
- แก้: เพิ่ม **P2-F04-T26 (location-engineer, W3 · location ว่างใน W3)** "`tools/dungeons/`: validator ตาม `dungeon-rules.md` + build artifact ของ client (polygon, จุดป้าย polylabel, property whitelist, ตารางเวลาทำการแบบ normalized) + test" · Writes: `tools/dungeons/`, `packages/shared/schemas/dungeon.schema.json` · deps: P2-F04-T05, P2-F04-T14 · ตัวตรวจรันใน `pnpm test` กับไฟล์ใน `data/dungeons/` (T13 อยู่ W3 เดียวกัน: ถ้า record ของ T13 ไม่ผ่าน orchestrator เปิด X ให้ level-designer) · T21 deps เพิ่ม P2-F04-T26
- `opening_hours`: แปลงข้อความ OSM เป็นตาราง `{ days, open, close }` ตอน build (tools ใช้ library ได้) หรือ level-designer กรอกแบบ normalized · runtime ประเมินด้วยฟังก์ชัน pure เล็ก ๆ ใน `src/run/` · timezone เป็น offset คงที่จาก config (กรุงเทพฯ ไม่มี DST) ประเมินจาก `now_ms` ที่ฉีดเข้า ไม่ใช้ timezone ของเครื่อง · ค่า `PH` (วันหยุดราชการ) ของ OSM ไม่รองรับใน v1 → ต้องเป็น `opening_hours_source: manual_required` · T05 ไม่ติดตั้ง library opening_hours ใน `apps/` หรือ `packages/`

**B-13 · P2-F04-T21 · งานใหญ่เกิน 3 วันและรวม plumbing ที่ไม่ขึ้นกับ UI F04**
- ปัญหา: T21 รวม: แผนที่ + รายการใกล้ตัว + นำทาง + confirm + แถบสถานะ + Mock เต็ม + `setDungeonsSourceData` + เลิก bundle config (F-04) + UI constants (F-08) + สลับไปใช้ `packages/geo` (F-05b) + wire copy area + formatter + telemetry sink · เกินขนาดงานเดียวและรอ deps 5 ตัว (T20, T15, T16, T13, T06) ทั้งที่ครึ่งหนึ่งไม่ต้องรอ flow/copy
- แก้: เพิ่ม **P2-F04-T25 (gameplay-programmer, W3)** "Client plumbing" · deps: P2-F04-T05, P2-F04-T12, P2-F04-T14 · Writes: `apps/client/` (ยกเว้น `package.json`), `config/app/client.json` · acceptance:
  - F-04: client โหลดเฉพาะ key ที่ใช้ผ่าน build step (virtual module หรือไฟล์ที่ generate) ไม่ import `dungeons.json`/`anticheat.json` ทั้งไฟล์ · F-08: ค่าคงที่ UI ย้ายเข้า `config/app/client.json`
  - F-05b: `apps/client/src/debug/stats.ts` ใช้ haversine/หน้าต่างจาก `packages/geo` (ตอนนี้ใช้ `EARTH_RADIUS_M = 6371000` ผิดจาก 6,371,008.8 ที่บรรทัด 25) · ลบสำเนา
  - game clock adapter: `now_ms` = เวลาเริ่ม replay + `mock.position()` เมื่อใช้ Mock (เล่น ×10/×60 แล้ว tick/การตีตรง) · เลือกเวลาเริ่มผ่าน query เพื่อทดสอบเวลาทำการ (test hook ของ QA)
  - storage adapter ของ run state (มี `schemaVersion`, กู้คืนไม่ได้ = ทิ้งแล้วเริ่มใหม่ไม่ crash) · telemetry sink + export ตาม C2-2..C2-4 · profile ตาม B-10 · DOM test ของ hud-panel ตาม B-04
  - lint/typecheck/test/e2e เขียว
- T21 เหลือ UI ของ F04 + Mock UI + `setDungeonsSourceData` + wire copy + ยิง event · deps เพิ่ม P2-F04-T25, P2-F04-T26

**B-14 · P2-F06-T07, P2-F05-T10 · เสียงของ loop ไปไม่ถึง build ที่ deploy**
- ปัญหา: `audio/out/` ถูก ignore (`.gitignore` บรรทัด 81) · F05-T06 render ลง `audio/out/` · CI และ `deploy-preview` build จาก git จึงไม่มีไฟล์เสียง · `asset-delivery.md` ของ F06-T07 พูดถึงเฉพาะ art
- แก้: acceptance ของ F06-T07 เพิ่ม "asset-delivery ครอบเสียง: generator ของ `audio/src/` รันใน root `pnpm build` ก่อน build client (deterministic, ไม่มี network) และ client โหลดตาม id ใน `audio/manifest.json` · test ยืนยันว่าทุก cue id ใน manifest มีไฟล์หลัง build" · Writes ของ F06-T07 เพิ่ม root `package.json` (script `build`) → ต้องไม่อยู่ wave เดียวกับงานที่ถือ root `package.json` · ไม่ต้องเพิ่ม deps ให้ F06-T07 (W4 ก่อน F05-T06 ใน W5): F06-T07 ต่อ hook ของ build ที่เรียก generator ตามสัญญาของ `audio/manifest.json` (manifest ว่าง = ผ่าน) · F05-T10 (W6) acceptance เพิ่ม "`pnpm build` จาก checkout สะอาดมีไฟล์ทุก cue ที่ client ใช้" · ใน W4 ห้ามมีงานอื่นถือ root `package.json` (ตามร่างไม่มี)

## 3. Findings แบบ non-blocking (แก้ใน rev 2 ถ้าทำได้ หรือให้เจ้าของงานรับเป็น acceptance)

**N-01 · กฎ path ร่วม `packages/shared/src/index.ts` · ใช้ subpath exports แทน barrel ร่วม**
- ปัญหา: barrel ตัวเดียวต้องประกาศใน Writes ของ 4–5 งาน จึงบังคับให้งานเหล่านั้นอยู่คนละ wave โดยไม่จำเป็น
- แก้: T05 ประกาศ `exports` ใน `packages/shared/package.json` ล่วงหน้า: `./formulas`, `./config`, `./run`, `./reward`, `./hp`, `./session` → `./src/<x>/index.ts` · แต่ละงานถือ `index.ts` ในโฟลเดอร์ตัวเอง · barrel ราก (`src/index.ts`) คงเฉพาะของเดิม (trace, content, golden-vector) · ถอด `src/index.ts` ออกจาก Writes ของ T20, F05-T02, F05-T08, F06-T06

**N-02 · P2-F04-T05 · Writes ขาดไฟล์ที่ต้องแก้จริง**
- แก้: เพิ่ม `vitest.config.ts` (project/environment ของ DOM test ถ้าไม่ใช้ comment `@vitest-environment` ต่อไฟล์) และ root `tsconfig.json` (ถ้าต้องเพิ่ม include/reference ของ `packages/geo`) · dependency ที่ติดตั้งล่วงหน้า: `happy-dom` (dev), `polylabel` (ใน `tools/dungeons` หรือ `packages/geo` ตามที่ ADR เลือก), ตัว rasterize SVG แบบไม่มี install script (เช่น `@resvg/resvg-js` ที่ใช้ optional platform package · `pnpm-workspace.yaml` ปิด install script ตั้งต้นและ `minimumReleaseAge` 7 วัน) · **ไม่** ติดตั้ง library opening_hours ใน apps/packages (B-12)

**N-03 · CI gates ที่ต้องมีเมื่อจบ phase (รวมจากหลายงาน)**
| gate | สถานะตอนนี้ | งานที่เพิ่ม |
| --- | --- | --- |
| lint / typecheck / test / build / e2e / gitleaks / forbidden-files | มีใน `ci.yml` | — |
| `generate.ts --check` (trace), `gen-vectors --check` | มีใน `ci.yml` | — |
| ความ pure ของ shared/geo (C1-2), geo เป็น leaf (B-01), client ไม่ import engine ย่อย (B-07) | ไม่มี | P2-F04-T05 (`eslint.config.js`) |
| config schema + config lint (D-062) | ไม่มี | P2-F04-T24 (รันใน `pnpm test` จึงเข้า CI เอง) |
| vector ทุกไฟล์ถูกค้นแบบ dynamic | ไม่มี | P2-F05-T02 |
| dungeon data validator | ไม่มี | P2-F04-T26 |
| telemetry: ชื่อ event ตรง `product/telemetry-events.md` + ไม่มีพิกัด | ไม่มี | P2-F04-T25 (ไม่มีพิกัด) + P2-F04-T22 (contract test อ่านตารางใน md เทียบ union ของชื่อ event ที่ client ยิง) |
| e2e: request ไปเฉพาะ origin ที่อนุญาต (C2-1) | ไม่มี | P2-F04-T22 |
| lint-headers | ไม่มีใน CI | P2-F04-T08 |
| งบ bundle, bbox-vs-province | ไม่มี | P2-F06-T15 + P2-F06-T16 |
| QA trace-replay (`qa/tests/**`) | include อยู่แล้วใน `vitest.config.ts` | — |

**N-04 · P2-F04-T08 · อยู่ W6 ช้าเกินไป**
- ปัญหา: T08 ไม่มี deps แต่วางที่ W6 · P2-C07 (ปิด Phase 1) รอ T08 (runbook billing) และ lint-headers เป็นงานยกมาที่ควรกันการถดถอยของ `_headers` ตั้งแต่ต้น
- แก้: T08 นำหน้า carry-over อื่นทุกงานในช่องว่างแรกของ wave (devops ไม่มีงานอื่นก่อน W8) และต้อง DONE ก่อนแจ้ง P2-C07 · ถ้า W1–W5 เต็มตามตัวอย่างในหัวข้อ 5 ให้คงไว้ W6 ตามร่าง แต่ห้ามเลื่อนเกิน W6

**N-05 · P2-F04-T21 · telemetry ยังไม่มีฉบับ Phase 2 ตอนเริ่ม T21**
- ปัญหา: T17 (W4) อยู่ wave เดียวกับ T21 และ T21 ไม่มี deps ถึง T17
- แก้: T21 ใช้ชื่อที่มีแล้วใน `product/telemetry-events.md` (`dungeon_entered`, `run_tick_granted`, `run_tick_denied`, `run_gps_status_changed` ฯลฯ) · event ใหม่ของ F04 เข้าใน F05-T10 ซึ่งมี deps T17 อยู่แล้ว · ถ้า orchestrator ขยับ T17 ขึ้น W3 ได้ ให้เพิ่ม deps T21 → T17

**N-06 · P2-F04-T23 · สำเนา haversine / gate ใน tools ยังเหลือ**
- ปัญหา: F-05b ใน board ครอบเฉพาะ client · `tools/traces/src/geo.ts` (`haversine_m`, `EARTH_RADIUS_M`) และ `tools/traces/src/metrics.ts` (`gateWindows`, `passesGate`) เป็นสำเนาที่สาม
- แก้: Writes ของ T23 เพิ่ม `tools/traces/` · acceptance "tools/traces ใช้ haversine + หน้าต่างจาก `packages/geo` · `generate.ts --check` ยังเขียว (R เท่ากัน ผลไม่ควรเปลี่ยน)"

**N-07 · P2-F06-T07 · ข้อความขัดกันเรื่อง manifest**
- ปัญหา: "อัปเดต bytes/sha256 ใน manifest" กับ "ไม่แก้ manifest ของ artist เอง" ขัดกัน · `art/assets/manifest.json` เป็นของ artist-2d
- แก้: `tools/art` เขียนผลเป็นไฟล์ generate แยก (เช่น `art/assets/manifest.build.json` หรือ output ของ build ที่ไม่ commit) · validator V1–V13 ตรวจทั้งสองไฟล์ · Writes ของ F06-T07 ระบุไฟล์นั้น

**N-08 · P2-F04-T19 · ไม่มีวิธีสร้าง QA trace ที่ทำซ้ำได้ และ trace เวลาทำการต้องมีเวลาจริง**
- ปัญหา: trace ขอบเวลา Grace 2:59/3:01, Suspended 14:59/15:01 ยาวหลายนาทีที่ 1 Hz เขียนมือไม่ได้จริง · trace ใช้ `relative-ms` จึงทดสอบ "เข้าตอนปิดทำการ" ไม่ได้ถ้าไม่มีการกำหนดเวลาเริ่ม
- แก้: T19 สร้าง QA trace ด้วย script ใน `qa/tests/` ที่เรียก builder ของ `tools/traces` (qa import tools ได้ · lint ห้ามเฉพาะ apps/packages) พร้อมโหมด `--check` ใน `pnpm test` · กรณีเวลาทำการใช้ test hook เวลาเริ่มของ B-13 (T25) · ถ้า builder ขาดความสามารถ ให้ handoff ถึง location-engineer (X ใน wave ถัดไป)

**N-09 · P2-F04-T14 · failure modes ที่ต้องมีเพิ่ม**
- แก้: acceptance ของ T14 เพิ่ม: นาฬิกาเครื่องถูกเปลี่ยนระหว่าง run (ใช้ `timestamp` ของ sample เป็นเวลาเกม และตรวจ monotonic · กระโดดถอยหลัง = ไม่ให้ tick ในหน้าต่างนั้น), state เวอร์ชันเก่ากู้คืนไม่ได้, storage เต็ม (telemetry ทิ้งก่อน run state), tab ถูก kill ระหว่าง Grace (เปิดใหม่แล้วคำนวณ Grace/Suspended จากเวลาที่ผ่านไป ตาม `connectionLostEndsRunAfter_s`) · สอดคล้อง GDD "สัญญาณขาดและแอปถูกปิด"

**N-10 · P2-F05-T15 · deps ของ tech gate F04+F05 ขาดงาน contract**
- แก้: deps เพิ่ม P2-F05-T02, P2-F04-T24, P2-F04-T25, P2-F04-T26 · ขอบเขตการตรวจเพิ่ม C1-2..C1-4, C2-1..C2-5, B-07 (client เรียก session เท่านั้น)

**N-11 · P2-C03 → systems · jitter บนเครื่องจริงอาจไม่เหมือน synthetic**
- ปัญหา: E3/E4 พิสูจน์ด้วย trace สังเคราะห์ (table < 1 ม., bench ≈ 1.5 ม.) · มือถือจริงที่วางนิ่งบนโต๊ะอาจมี jitter 2–5 ม. ซึ่งอาจผ่าน gate · ตัวเลขจริงมาจาก `stationary_5min_accum_m` ของ P2-C02
- แก้: acceptance ของ P2-C03 ระบุ `stationary_5min_accum_m` ต่อเครื่องเทียบ `minDistancePerWindow_m` หลังใช้ตัวกรองของ B-03 · ถ้าวางนิ่งจริงผ่าน gate ให้ handoff ถึง systems-designer + game-director (blocking: yes) เพื่อปรับค่ากรอง/cadence หรือเสนอ decision · ไม่แก้ GDD

**N-12 · P2-F04-T10 · R ใน HUD ผิดเล็กน้อย**
- ปัญหา: `apps/client/src/debug/stats.ts` บรรทัด 25 ใช้ 6,371,000 ม. (ผลต่างสัมพัทธ์ราว 1.4 × 10⁻⁶ ไม่กระทบผลวัดของคน)
- แก้: ไม่ต้องแก้ใน T10 · ปิดใน T25 เมื่อสลับไป `packages/geo` (B-13)

**N-13 · P2-F06-T15 · งบ bundle ต้องระบุวิธีวัด**
- แก้: tech note (T05 หรือ T14) กำหนด: วัดจาก `apps/client/dist` เป็น brotli ของ JS ที่โหลดตอนเปิด (entry + chunk ที่ preload) · key `bundle.initialJsBudget_bytes` ใน `config/app/client.json` ค่าตั้งต้นตาม S5 ≤ 1.0 MB (10^6 byte) · chunk ของ maplibre + worker ไม่นับในงบตอนเปิดถ้าโหลดแบบ lazy แต่มีงบแยก

**N-14 · P2-F05-T08 · "ตาย = ของใน run หาย" ต้องชัดว่าอะไรคือ "ของใน run"**
- แก้: tech note T14 กำหนดว่า exp ที่ได้ระหว่าง run หายด้วยหรือไม่ (GDD หัวข้อ HP การตาย) · ถ้า spec F05 (T01) ไม่ระบุ ให้ backend ใช้ assumption และส่ง handoff ถึง game-director · vector ของ systems ต้องครอบ auto-retreat (`autoRetreatKeepsRunLoot`) เทียบตาย (`death.loseAllRunLoot`)

**N-15 · P2-F05-T01 / P2-F06-T01 · vector gate/run state ต้องพร้อมก่อน run engine**
- ปัญหา: P2-F04-T20 (W3) ต้องผ่าน vector ของ run state และใช้ key ใหม่ (hysteresis ของขอบ polygon, cadence/ตัวกรอง gate) แต่ vector และ key อยู่ใน F05-T01 ซึ่งอยู่ W3 เดียวกัน
- แก้ (เลือกหนึ่ง): (ก) ย้าย vector gate/tick/run state/D-059 + key ใหม่ของ B-03 จาก F05-T01 ไปไว้ใน P2-F06-T01 (W2) และเพิ่ม deps F06-T01 → P2-F04-T01, P2-F04-T05 (F06-T01 เป็นงานเล็ก 1–2 วัน รับได้) หรือ (ข) T20 ใช้ชื่อ key ตาม tech note T14 เป็น assumption และเจ้าของ `src/run` รัน vector ของ F05-T01 ใน wave ถัดไป (ถ้ารับข้อขยายของหัวข้อ 1.3 = backend ทำพร้อม F05-T08 ใน W4) · tech-lead แนะนำ (ก)

## 4. ตรวจงาน tech ที่ยกมาจาก Phase 1

| รายการ | งานใน board | ผลตรวจ |
| --- | --- | --- |
| port สูตร `tools/sim` เข้า `packages/shared` | P2-F05-T02 | ครอบแต่ขอบเขตแคบ → B-05 |
| `packages/geo` + haversine R = 6,371,008.8 ม. | P2-F04-T05 (นิยาม) → P2-F04-T12 | ครอบ · เพิ่ม leaf rule B-01 · ตรวจแล้ว `tools/traces/src/geo.ts` และ `apps/client/src/map/geo-circle.ts` ใช้ค่าถูก, `apps/client/src/debug/stats.ts` ใช้ 6,371,000 (N-12) |
| นิยามหน้าต่าง gate | P2-F04-T05 | ต้องแยก diagnostic กับ reward → B-02, B-03 |
| speed lock แบบกรอง | P2-F05-T12 → T13 | ครอบ · deps ผิด → B-11 |
| F-04 เลิก bundle config ทั้งไฟล์ | P2-F04-T05 → T21 | ย้ายไป P2-F04-T25 (B-13) |
| F-05b haversine/gate ไป shared | T12 + F05-T08 + T21 | ครอบฝั่ง client · ขาด `tools/traces` → N-06 |
| F-06 code-split + งบ bundle | P2-F06-T15 + T16 | ครอบ · ไม่ต้องรอสนาม (หัวข้อ 1.4) · วิธีวัด N-13 |
| F-08 ค่าคงที่ UI เข้า config | T21 | ย้ายไป T25 |
| `setDungeonsSourceData` | T21 | ครอบ · ต้องมี artifact จาก P2-F04-T26 (B-12) |
| lint-headers เข้า CI (P1-X41) | P2-F04-T08 | ครอบ · wave ช้า → N-04 |
| `tilesUrlMissing` ผ่าน `getCopyText` (P1-X42) | P2-F04-T10 | ครอบ |
| matrix Wake Lock/vibrate F-17 | T10 → T11 → P2-F06-T12 | ครอบ · T12 deps P2-C02 และไม่กั้น build (หัวข้อ 1.4) |
| D-054, D-057, D-075 | P2-F04-T05 | ครอบ · ความเห็นล่วงหน้า: D-054 สอดคล้องกับ B-03 (provider ไม่กรอง · ตัวกรองของ gate อยู่ใน geo และ server ใช้ตัวเดียวกัน) · D-075 ใช้ polylabel ตอน build ใน `tools/dungeons` ไม่ใช่ runtime |
| config lint + schema (D-062, ADR 0001 3.10.7) | ไม่มี (ยก H01 ให้ gameplay) | ขาด → B-06 เพิ่ม P2-F04-T24 |
| ข้อยกเว้น Ajv ใน Worker | ไม่มี | C1-4, B-06 |

## 5. ผลต่อแผน wave (ตัวอย่างที่ตรวจ deps + Writes แล้ว · producer จัดขั้นสุดท้าย)

สมมติรับ: ข้อขยายหัวข้อ 1.3, N-15 ทาง (ก), งานใหม่ T24/T25/T26/F05-T19 · เพดาน 6 งาน/wave, 1 งาน/agent
| W | งาน | หมายเหตุการตรวจ |
| --- | --- | --- |
| W1 | T10, T05, T01, T03, T04, T06 | เหมือนร่าง · T10 ไม่มี DOM test (B-04) |
| W2 | F05-T02 (backend), T14, F06-T02, T12, T15, F06-T01 (+ vector gate/run + key ใหม่) | F06-T01 ถือ `config/balance/dungeons.json` หลัง T03 คืนแล้ว · F05-T02 อ่าน vector เท่านั้น ไม่ชน |
| W3 | T20 (backend), T25 (gameplay), T13, T26, T16, F06-T03 | `tools/dungeons` กับ `data/dungeons` คนละ path · `src/run/index.ts` ของ T20 ไม่ชนเพราะ subpath (N-01) |
| W4 | T21, F05-T01, F05-T03, F05-T09, T17, F06-T04 | F05-T01 สลับ `tools/sim` ไปใช้ shared (B-05) |
| W5 | F05-T08 (+ session), F05-T07, F06-T07, F06-T15, F05-T05, F05-T06 | gameplay ใช้ช่องนี้ทำ code-split (ไม่รอสนาม) · F06-T07 ถือ root `package.json` คนเดียวใน wave |
| W6 | F05-T10, F06-T06, T24, F04-T19, T08, F06-T05 | T24 ต้องเสร็จก่อน tech gate F04+F05 |
| W7 → | F06-T09 → F06-T08 → F06-T10 → F06-T14 → tech gate F06 (W11) | tech gate F06 อยู่ W11 เท่าร่าง แต่ **ไม่มีงานสนามบนเส้นวิกฤต** · สายสนามเหลือ F05-T12/T13 → F05-T19 และ F06-T12 → F06-T26 |

ราคา: สาย art/systems ช้าลง 1 wave (F05-T01, F05-T03 ไป W4) โดยไม่กระทบเส้นวิกฤต · backend 4 งาน, gameplay 9 งาน (ได้ T25 · เสีย T20, F05-T02), tech-lead 10 งาน (เพิ่ม T24, F05-T19), location 6 งาน (เพิ่ม T26)
