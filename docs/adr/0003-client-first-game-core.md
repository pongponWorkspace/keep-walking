# ADR 0003 — Game core แบบ client-first ใน Phase 2 (reducer pure ที่ย้ายไป server ได้)

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted |
| วันที่ | 2026-09-26 |
| task | P2-F04-T05 |
| ผู้เขียน / authority | tech-lead (architecture, code standards) · ไม่มี vendor หรือค่าใช้จ่ายใหม่ จึงไม่ต้องให้ HUMAN อนุมัติ |
| อ้างอิง | CLAUDE.md non-negotiable 1, 2, 3, 5, 7 · GDD "การเข้าและออก", "Core loop ใน Dungeon", "สัญญาณขาดและแอปถูกปิด", "Anti-cheat > มาตรการเป็นชั้น", "Progression > Drop table" · D-033, D-054, D-057, D-062, D-064, D-075, D-085, D-087, D-088, D-090 · plan review `studio/phases/phase-2/plan-review-tech-lead.md` หัวข้อ 1.1, 1.2, B-01..B-03, B-07..B-09, B-12, N-01, N-02, N-13 |
| ADR ที่เกี่ยวข้อง | ADR 0001 (แก้ไขครั้งที่ 3 พร้อมงานนี้) · ADR 0002 หัวข้อ 5.3 (logic ของ run/gate ย้ายไป CellDO ได้โดยไม่แก้) |
| เอกสารที่ตามมา | tech note F04 + F05 (P2-F04-T14: API ของ `session`, sequence ต่อ tick, failure modes) · `docs/tech/gps-trace-format.md` 4.1 (แก้พร้อมงานนี้) · tech note F02 หัวข้อ 15 (แก้พร้อมงานนี้) |

## 0. สรุป

| เรื่อง | คำตัดสิน | หัวข้อ |
| --- | --- | --- |
| ที่รันของ game core ใน Phase 2 | reducer pure ใน `packages/shared` (+ geometry ใน `packages/geo`) รันบน client · ผลไม่ใช่รางวัลจริง · ข้อยกเว้นหมดอายุเมื่อเริ่ม Phase 3 | 3 |
| รูปของ engine | `step(state, input, now_ms, params) → { state, events }` · state เป็นข้อมูลล้วน · ไม่มี timer / เวลาจริง / สุ่มที่ไม่มี seed / I/O | 3.2 |
| ทางเข้าเดียวของ client | `@keep-walking/shared/session` · ห้าม import `run` / `reward` / `hp` ตรง (lint) | 3.3 |
| `packages/geo` | leaf ไม่มี dependency `@keep-walking/*` · input เป็น structural type ของตัวเอง · ค่าทุกตัวเป็น parameter · R = 6,371,008.8 ม. | 4 |
| หน้าต่าง gate | `gateDiagnosticWindows` (เลื่อน 30 วิ, HUD เท่านั้น) แยกจาก `rewardWindow` (ไม่ทับกัน, นับเฉพาะเวลาในสถานะที่นับ) · `greaterThan` | 5 |
| ตัวกรองของ gate | ทิ้งเฉพาะ outlier (accuracy, ความเร็วที่เป็นไปไม่ได้) · ไม่ smoothing jitter · resample เป็นจังหวะคงที่ก่อนสะสมระยะ · คู่ sample ที่ห่างเกินเกณฑ์ไม่นับ | 5.3 |
| RNG | stream แยกต่อระบบแบบ counter-based แตกจาก seed ของ run · ลำดับการดึงคงที่ · Phase 3 seed อยู่ที่ server เท่านั้น | 6 |
| check-in / check-out | `PresenceStrategy` เลือกจาก `verification_mode` · `continuous_gps` ทำจริง · `entry_exit` โยน `NotImplementedError` | 7 |
| dependency ของทั้ง phase | ติดตั้งล่วงหน้าในงานนี้ · ไม่มี install script ใหม่ · ไม่มี library `opening_hours` | 8 |
| งบ bundle | brotli ของ JS ที่โหลดตอนเปิด · maplibre + worker ที่โหลดแบบ lazy มีงบแยก | 10 |
| D-054, D-057, D-075 | ACCEPTED ทั้งสามข้อ (D-057 และ D-075 มีเงื่อนไข) | 11 |

## 1. บริบท

- roadmap Phase 2 ต้องการ loop ที่เล่นได้จริงบนมือถือโดยยังไม่มี backend (ADR 0002 หัวข้อ 5.3, D-085: ไม่มี Worker / DO / D1 ใน Phase 2) · แต่ non-negotiable 1 กำหนดให้ทุกค่าที่มีผลต่อรางวัลคำนวณบน server
- ADR 0001 หัวข้อ 3.8 วางหลักไว้แล้ว: สูตรเป็น pure function ใน `packages/shared` ที่ server ใช้ซ้ำได้ และผลบน client ใน Phase 2 ไม่ใช่รางวัลจริง · plan review ของ tech-lead (D-087) รับหลักนี้พร้อมเงื่อนไข C1-1..C1-5 ที่ต้องบังคับด้วยเครื่องมือ
- engine แบ่งเป็นหลายโฟลเดอร์และมีเจ้าของสองคน (D-090: backend-programmer ถือ `formulas`, `config`, `run`, `reward`, `hp`, `session` · location-engineer ถือ `packages/geo`) · ถ้าไม่มีสัญญากลาง ลำดับการเรียกและนิยามหน้าต่าง gate จะไปอยู่ในโค้ด client และ server Phase 3 จะได้ผลไม่ตรง (B-02, B-07)
- `packages/geo` ยังไม่มี · client มีสำเนา haversine ที่ใช้ R ผิด (`apps/client/src/debug/stats.ts` บรรทัด 25) และ `tools/traces` มีสำเนาที่สาม (N-06, N-12)

## 2. ทางเลือกที่พิจารณา

| เรื่อง | ทางเลือก | ผล | เหตุผล |
| --- | --- | --- | --- |
| ที่อยู่ของ logic ใน Phase 2 | (ก) เขียนใน `apps/client` แล้วค่อยย้าย · (ข) pure reducer ใน `packages/shared` + `packages/geo` · (ค) รอ backend | **(ข)** | (ก) คือ fork ที่ต้องเขียนใหม่ใน Phase 3 · (ค) ขัด roadmap และ D-085 · (ข) โค้ดชุดเดียวรันได้ทั้งสองฝั่งและทดสอบด้วย vector ได้ทันที |
| รูปของ engine | class ที่มี timer ภายใน · event emitter · reducer ที่รับเวลาเข้ามา | **reducer** | timer ใน shared ทำให้ test ต้อง fake clock และรันใน DO hibernation ไม่ได้ · reducer ทำซ้ำได้จาก log ของ input และเก็บ state ลง storage ได้ตรงๆ |
| ทิศ dependency geo ↔ shared | geo import type จาก shared · shared import geo · ทั้งสองทาง | **shared → geo เท่านั้น, geo เป็น leaf** | กันวง `geo ↔ shared` ที่ pnpm/tsc ไม่จับ (B-01) |
| นิยามหน้าต่างรางวัล | หน้าต่างเลื่อน (แบบ HUD) · หน้าต่างไม่ทับกันผูก tick | **ไม่ทับกัน** | หน้าต่างเลื่อนให้ tick จากระยะเดียวกันซ้ำ (B-02) |
| ตัวกรอง jitter | smoothing / min-step · ทิ้งเฉพาะ outlier + resample | **outlier + resample** | smoothing ทำให้ม้านั่ง jitter ได้ 0 tick ขัด E4 · resample ทำให้ผลไม่ขึ้นกับความถี่ sample ของเครื่อง (B-03) |
| RNG | stream เดียวต่อ run · stream ต่อระบบแบบลำดับ · counter-based ต่อ tick / ต่อการตี | **counter-based** | การตีเพิ่มหนึ่งครั้งหรือ tick ที่ไม่ผ่าน gate ไม่เลื่อนผลของ tick อื่น (B-09) |
| barrel ของ shared | `src/index.ts` ตัวเดียว · subpath exports | **subpath exports** | งานหลายงานเขียนพร้อมกันได้โดยไม่ชนไฟล์เดียว (N-01) |

## 3. การตัดสินใจ: โมดูล เจ้าของ และข้อยกเว้นของ Phase 2

### 3.1 โมดูลและเจ้าของ (ตรงกับ "กฎ path ร่วม" ของ board Phase 2)

| โมดูล | import path | หน้าที่ | เจ้าของโค้ด | งาน |
| --- | --- | --- | --- | --- |
| `packages/geo/src/` | `@keep-walking/geo` | haversine, ตัวกรอง outlier + resample, `gateDiagnosticWindows`, ตัวสะสมระยะของ `rewardWindow`, ความเร็วของ speed lock, point-in-polygon + hysteresis, play area mask | location-engineer | P2-F04-T12, P2-F05-T13 |
| `packages/shared/src/formulas/` | `@keep-walking/shared/formulas` | สูตรจาก `tools/sim` + PRNG + ส่วน pure ของ drops / survival | backend-programmer | P2-F05-T02 |
| `packages/shared/src/config/` | `@keep-walking/shared/config` | typed accessor ของ config (ข้าม `_`, pointer, `null` = `ConfigUnsetError`) · ไม่มี Ajv | backend-programmer | P2-F05-T02 |
| `packages/shared/src/run/` | `@keep-walking/shared/run` | run state machine (Active / Grace / Suspended / Ended), `PresenceStrategy`, speed lock ฝั่งผู้เล่น, เวลาทำการ | backend-programmer | P2-F04-T20 |
| `packages/shared/src/reward/` | `@keep-walking/shared/reward` | `rewardWindow` → reward tick → drop | backend-programmer | P2-F05-T08 |
| `packages/shared/src/hp/` | `@keep-walking/shared/hp` | การตี, HP, auto-retreat, ยา | backend-programmer | P2-F06-T06 |
| `packages/shared/src/session/` | `@keep-walking/shared/session` | reducer ตัวเดียวที่ประกอบ run → reward → hp ตามลำดับใน tech note F04/F05 | backend-programmer | P2-F05-T08, P2-F06-T06 |
| `packages/shared/src/index.ts` (barrel ราก) | `@keep-walking/shared` | ของเดิมเท่านั้น (trace, content, golden-vector) · ไม่มีงานใดใน Phase 2 แก้ | tech-lead | — |
| `packages/shared/schemas/config/` | `@keep-walking/shared/schemas/*` | JSON Schema ต่อไฟล์ config (ใช้ใน test / tools เท่านั้น) | tech-lead | P2-F04-T24 |
| `packages/shared/schemas/dungeon.schema.json` | 〃 | schema ของ record dungeon | location-engineer | P2-F04-T26 |
| `apps/client/` | — | UI, timer, storage adapter, telemetry sink, game clock, LocationProvider | gameplay-programmer | หลายงาน |

- แต่ละงานถือ `index.ts` ในโฟลเดอร์ของตัวเอง · subpath ประกาศล่วงหน้าแล้วใน `packages/shared/package.json` (หัวข้อ 8.4) จึงไม่มีงานใดต้องแก้ `package.json` ของ shared ใน Phase 2
- ทิศ import ภายใน shared: `session` import ได้ทุกโฟลเดอร์ · `run`, `reward`, `hp` import ได้เฉพาะ `formulas`, `config` และ `@keep-walking/geo` · สาม engine ไม่ import ค่ากันเอง (ยกเว้น `import type`) ข้อมูลข้ามโมดูล (เช่น run อยู่ในสถานะที่นับหรือไม่) ส่งผ่าน `session` · tech gate ตรวจด้วยตาใน Phase 2 (วงภายในแพ็กเกจเดียวไม่ทำให้ build พัง · ถ้าพบวงจริงให้เพิ่ม lint ระดับโฟลเดอร์)
- backend-programmer เขียนตามสัญญาในเอกสารนี้และ tech note P2-F04-T14 ไม่ใช่ตามโค้ด client · ไม่มีโค้ด Worker / DO / D1 / wrangler ใน Phase 2 (D-085, D-090)

### 3.2 สัญญา reducer (C1-3)

```ts
// รูปร่วมของทุก engine ใน packages/shared/src/{run,reward,hp,session}
type Step<S, I, P, E> = (state: S, input: I, now_ms: number, params: P) => { state: S; events: readonly E[] };
```

1. **pure:** ผลขึ้นกับ argument เท่านั้น · input ชุดเดิม → output เดิมทุกครั้ง · ไม่แก้ object ที่รับเข้ามา (คืน state ใหม่)
2. **state เป็นข้อมูลล้วน:** JSON-serializable (ไม่มี function, class instance, `Map`, `Set`, `Date`, `undefined` ที่มีความหมาย) · มี `schemaVersion` (integer) ที่ระดับบนสุด · client เก็บลง storage และ server เก็บลง DO storage ได้โดยไม่แปลง
3. **เวลาเข้ามาเป็น `now_ms`** (ms ตั้งแต่ epoch) · ใน Phase 2 client ส่งจาก game clock (Mock ใช้เวลาเริ่ม replay + ตำแหน่งใน trace · Web ใช้ `Date.now()` ใน `apps/client`) · ใน Phase 3 server ส่งจากนาฬิกาของตัวเอง · `now_ms` ที่ลดลงจากครั้งก่อนต้องไม่ทำให้ state ถอยหลัง (พฤติกรรมละเอียดใน tech note P2-F04-T14 ตาม N-09)
4. **เวลาของ sample = `timestamp` ของ fix** (gps-trace-format ข้อ 1.3) · sample ที่ `timestamp` ไม่เพิ่มขึ้นแบบเคร่งถูกทิ้งก่อนเข้า geo
5. **ไม่มี timer ใน shared:** client ตั้ง timer (เช่น ทุก 1 วินาที และเมื่อกลับจาก page hidden) แล้วเรียก step ด้วย input ชนิด `tick` · shared ไม่มี `setTimeout`, `setInterval`, `requestAnimationFrame` (lint หัวข้อ 8.2)
6. **params = config ที่อ่านแล้วแบบ typed** จาก `src/config` + ข้อมูล dungeon + seed (หัวข้อ 6) · engine ไม่อ่านไฟล์เอง
7. **events เป็นข้อมูล** สำหรับ UI, เสียง และ telemetry (ชื่อ event ตาม `product/telemetry-events.md`) · engine ไม่ยิง telemetry เอง · event ไม่มีพิกัด (C2-3)
8. ชนิดของ `input` และ `events` แต่ละตัว รวมถึง signature ของ `sessionStep` กำหนดใน tech note P2-F04-T14 · argument ที่ board เรียกว่า `rng` คือ **ข้อมูล** `{ runSeed }` ใน params หรือ state ไม่ใช่ function (state ต้อง serialize ได้และกู้คืนแล้วได้ผลเดิม)

### 3.3 ทางเข้าเดียวของ client (B-07)

- `apps/client` เรียก engine ผ่าน `@keep-walking/shared/session` เท่านั้น · import `@keep-walking/shared/run`, `/reward`, `/hp` หรือ path ลึกเข้า `packages/**` เป็น lint error (หัวข้อ 8.2)
- client import `@keep-walking/geo` ได้ตรงสำหรับการแสดงผลที่ไม่ใช่รางวัล (HUD, `gateDiagnosticWindows`, "นอกพื้นที่" จาก mask ตาม D-064) · การตัดสินว่าได้ tick หรือไม่มาจาก event ของ `session` เท่านั้น
- ลำดับ sample เข้า → presence → gate → tick → drop → hit → auto-retreat → จบ run อยู่ใน `src/session` ไม่อยู่ใน client

### 3.4 ข้อยกเว้นของ server authority ใน Phase 2 และวันหมดอายุ (C1-1, C1-4, C1-5)

- **C1-1 ข้อยกเว้นที่มีวันหมดอายุ:** ใน Phase 2 client เรียก `sessionStep` เพื่อตัดสินผลของ run เพราะยังไม่มี server · ผลนี้ **ไม่ใช่รางวัลจริง** ไม่มี account ไม่มีการส่งออกนอกเครื่อง และไม่ถูกย้ายเข้า account ใน Phase 3 · ข้อยกเว้น **หมดอายุเมื่อเริ่ม Phase 3**: ตั้งแต่นั้น client ส่งแค่ตำแหน่ง + timestamp (batch ทุกนาที) และแสดงผลที่ server ส่ง · client ห้ามแสดงรางวัลก่อน server ยืนยัน · ใช้ `@keep-walking/geo` เพื่อแสดงผลคาดการณ์ที่ไม่ใช่รางวัลได้ (เช่น แถบระยะของหน้าต่าง) · tech gate ของ F08 ตรวจว่าการเรียก `sessionStep` เพื่อตัดสินผลถูกถอดออกจาก client แล้ว
- **C1-2** บังคับด้วย ESLint และ tsconfig (หัวข้อ 8.2, 8.3)
- **C1-3** คือสัญญา reducer (หัวข้อ 3.2)
- **C1-4 ไม่มี Ajv / `new Function` / `eval` ใน runtime:** Worker ไม่อนุญาต · `src/config` ตรวจชนิดและช่วงด้วยโค้ดธรรมดา · JSON Schema + Ajv ใช้ได้ใน test, `tools/*` และ build step เท่านั้น · `ajv` ย้ายจาก `dependencies` เป็น `devDependencies` ของ `packages/shared` ในงานนี้ · lint ห้าม import `ajv` ใน `packages/shared/src/**` (ยกเว้นไฟล์ test), `packages/geo/**` และ `apps/client/**`
- **C1-5 namespace ของ state ในเครื่อง:** ทุก key ของ localStorage / ชื่อ database ของ IndexedDB ที่ client สร้างใน Phase 2 ขึ้นต้นด้วย `kw.p2.` (เช่น `kw.p2.session`, `kw.p2.telemetry`, `kw.p2.consent`) · Phase 3 ล้าง `kw.p2.*` ทั้งหมดเมื่อผู้ใช้ login ครั้งแรก · **ไม่มีเส้นทาง import progress** · UI ไม่ต้องมีป้าย "ไม่ใช่รางวัลจริง" แต่ kit ของ playtest (P2-F06-T18) แจ้งผู้ร่วม
- เงื่อนไข C2-1..C2-6 (ไม่มีข้อมูลออกจากเครื่อง, telemetry ในเครื่อง, ไม่มีพิกัดใน event/export, เวลา relative, เก็บ sample ไม่เกินที่หน้าต่างปัจจุบันต้องใช้, ปุ่มลบข้อมูลในเครื่อง) บันทึกใน D-088 และรายละเอียดเชิงเทคนิคอยู่ใน tech note P2-F04-T14 · ADR นี้ยืนยันว่า engine เก็บ sample ใน state ได้เฉพาะช่วงที่หน้าต่างปัจจุบันต้องใช้ (หัวข้อ 5.4) จึงไม่มี trace ต่อเนื่องค้างใน `kw.p2.session`

## 4. `packages/geo` (B-01)

### 4.1 กติกา

- **leaf:** `packages/geo/package.json` ไม่มี dependency `@keep-walking/*` · lint ห้าม import `@keep-walking/*` และ path ข้ามแพ็กเกจใน `packages/geo/**` (รวม test)
- **structural type ของตัวเอง:** input ของ sample คือ `{ t_ms: number; lat: number; lng: number; accuracy_m: number }` · caller (session, client HUD, `tools/traces`) แปลงจาก `LocationSample` / `TraceSample` เอง · geometry ของ polygon ใช้ type ของ `geojson` (dev dependency แบบ type-only)
- **ไม่มีค่าตั้งต้นในโค้ด:** ทุกเกณฑ์ (accuracy, ความเร็ว, cadence, ช่องว่าง, hysteresis, ความยาวหน้าต่าง) เป็น parameter · geo ไม่อ่าน config · test ใช้ fixture
- **ค่าคงที่ทางฟิสิกส์ที่อยู่ในโค้ดได้:** รัศมีโลกเฉลี่ย `EARTH_MEAN_RADIUS_M = 6_371_008.8` (IUGG mean radius R1) และค่าแปลงหน่วย (ms ต่อ s, m/s ต่อ km/h) ตั้งชื่อบอกหน่วยตาม ADR 0001 3.5 · client, `tools/traces` และ server ใช้ค่านี้จาก geo ตัวเดียว (ลบสำเนาใน P2-F04-T25 และ P2-F04-T23)
- tsconfig เหมือน shared (`lib: ["ES2023"]`, `types: []`) · test ที่ต้องใช้ Node (`fs` อ่าน trace) อยู่ใน `packages/geo/test/` และถูก typecheck โดย root `tsconfig.json`

### 4.2 ฟังก์ชันที่ geo ต้องมี (ชื่อสุดท้ายเลือกได้ใน P2-F04-T12 · ความหมายเป็นสัญญา)

| ฟังก์ชัน | ความหมาย |
| --- | --- |
| `haversine_m(a, b)` | ระยะวงกลมใหญ่ด้วย `EARTH_MEAN_RADIUS_M` |
| `filterGateSamples(samples, p)` | ขั้น 1 ของหัวข้อ 5.3: ทิ้ง outlier คืน sample ที่เหลือพร้อมเหตุผลของตัวที่ถูกทิ้ง (สำหรับ HUD/test) |
| `resampleOnGrid(kept, grid, p)` | ขั้น 2: ตำแหน่งบนจุดของ grid ที่คำนวณได้ (หัวข้อ 5.3) |
| `gridDistance_m(points)` | ขั้น 3: ผลรวมระยะระหว่างจุด grid ที่ติดกันและใช้ได้ทั้งคู่ |
| `gateDiagnosticWindows(samples, p)` | หน้าต่างเลื่อนของ HUD (หัวข้อ 5.1) · แบบดิบและแบบกรอง |
| ตัวสะสมของ `rewardWindow` | สถานะสะสมระยะแบบ incremental ที่ serialize ได้ (ใช้ใน `src/reward`) ตามหัวข้อ 5.2–5.4 |
| `pairSpeed_kmh(a, b)` | ความเร็วดิบระหว่างคู่ sample สำหรับ speed lock v1 · P2-F05-T13 เปลี่ยนภายในเป็นแบบกรองโดยคง signature |
| `pointInPolygon(pt, polygon)` | รองรับรูและ `MultiPolygon` (RFC 7946) |
| `boundaryDistance_m(pt, polygon)` + hysteresis | ใช้กับการเปลี่ยนสถานะ inside/outside เท่านั้น (ไม่ใช้กับระยะของ gate) |
| `inPlayArea(pt, mask)` | "นอกพื้นที่" = อยู่นอกรูของ `data/map/playarea-mask.geojson` (D-064) |
| `rewindPolygon(geometry)` | วงนอกทวนเข็ม รูตามเข็ม (แทน `@turf/rewind` · tech note F02 15.2 ข้อ 7) |

## 5. หน้าต่างของ movement gate (B-02, B-03, GD B-04)

ค่าที่อ้าง: `balance.dungeons.movementGate.{minDistancePerWindow_m, window_s, comparison}` (50, 300, `greaterThan`) · `balance.dungeons.runState.*` · `app.client.hudMeasurement.gateWindowStep_s` (30) · key ใหม่ในหัวข้อ 5.5 เป็นของ systems-designer (P2-F05-T20)

### 5.1 `gateDiagnosticWindows` — ค่าวัดของ HUD เท่านั้น

- หน้าต่างยาว `window_s` เลื่อนทีละ `gateWindowStep_s` ตามเวลาจริงตั้งแต่ sample แรกของ segment · ผ่านเมื่อระยะสะสม `greaterThan` `minDistancePerWindow_m`
- มีสองแบบ: **ดิบ** = ผลรวม haversine ระหว่าง sample ต่อเนื่องโดยไม่กรอง (ความหมายของ `gate_windows_*` ใน gps-trace-format 4.1 `format_version` 1 ไม่เปลี่ยน) · **กรอง** = ใช้ขั้น 1–3 ของหัวข้อ 5.3 เหมือน `rewardWindow` (คอลัมน์ใหม่ `*_filtered` ใน `format_version` 2 · ใช้ตอบ N-11 ว่ามือถือวางนิ่งจริงผ่าน gate หรือไม่)
- **ไม่ใช้ตัดสินรางวัลเด็ดขาด** · ไม่อยู่ใน `session` · ไม่ถูกส่งให้ server ใด

### 5.2 `rewardWindow` — หน้าต่างที่ตัดสิน reward tick

1. **ไม่ทับกัน** ต่อกันเป็นลำดับ `k = 0, 1, 2, …` ภายใน run เดียว
2. **นาฬิกาของหน้าต่างนับเฉพาะเวลาในสถานะที่นับ:** เริ่มเมื่อ run เข้า Active หลัง confirm (check-in ผ่าน, หัวข้อ 7) · เวลาใน Grace นับเมื่อ `runState.rewardTickDuringGrace = true` เท่านั้น · Suspended นับเมื่อ `rewardTickDuringSuspended = true` และ `suspendedTimeCounts = true` · ค่าปัจจุบันทั้งหมด `false` = นาฬิกาหยุดระหว่าง Grace/Suspended และเดินต่อจากค่าเดิมเมื่อกลับ Active (ไม่เริ่มหน้าต่างใหม่)
3. เรียกเวลาที่นับว่า active time `τ` · หน้าต่าง k ครอบ `τ ∈ (k·window_s, (k+1)·window_s]` (เปิดซ้าย ปิดขวา)
4. **ผ่านเมื่อ** ระยะของหน้าต่าง `>` `minDistancePerWindow_m` (`comparison: greaterThan` · ระยะเท่าเกณฑ์พอดี = ไม่ผ่าน) · `comparison` ค่าอื่นที่ไม่รู้จัก → engine throw (fail closed)
5. หน้าต่างที่ผ่าน = reward tick หนึ่งครั้ง (drop ตามหัวข้อ 6) · หน้าต่างที่ไม่ผ่าน = event `run_tick_denied` ไม่มี drop · ไม่มีการยกระยะส่วนเกินไปหน้าต่างถัดไป
6. **เวลาที่ประเมิน:** หน้าต่าง k ถูกประเมินเมื่อ (ก) มี sample ที่ผ่านขั้น 1 และมี `τ ≥` ปลายหน้าต่าง (นาฬิกาเดินถึงปลายหน้าต่างด้วยหลักฐาน) และ (ข) ถ้า `now_ms − t_last > maxSamplePairGap_s` (`t_last` = sample ที่ใช้ได้ล่าสุด) ถือว่าไม่มีหลักฐาน: run ออกด้วย `cause: no_evidence` ที่ `t_last` และนาฬิกาหยุดที่ `t_last` (spec F04 R14, tech note F04 5.3) · เวลาจริงที่ผ่านไปโดยไม่มี sample **ไม่ทำให้หน้าต่างครบ** หน้าต่างที่ค้างครบได้เมื่อ sample กลับมาและนาฬิกาเดินถึงปลายเท่านั้น (tech note F05 หัวข้อ 4, G8) · ผลจึงขึ้นกับ sample เท่านั้น ไม่ขึ้นกับว่า step ถูกเรียกเมื่อไร (client ประเมินได้ทันที · server Phase 3 ประเมินเมื่อ batch มาถึง ได้ผลเท่ากัน) · [แก้ถ้อยคำใน P2-F04-T24: ฉบับก่อนเขียน (ข) ว่า "`now_ms` เลยปลายหน้าต่างไปแล้ว `maxSamplePairGap_s`" ทำให้หน้าต่างครบ ซึ่งขัดกับ F04 R14]

### 5.3 ตัวกรองและการสะสมระยะ (ใช้ร่วมโดย `rewardWindow` และแบบกรองของ HUD)

**ขั้น 1 — ทิ้งเฉพาะ outlier** (ไม่ smoothing, ไม่ min-step, ไม่ Kalman)
- ทิ้ง sample ที่ `accuracy_m > maxSampleAccuracy_m`
- ทิ้ง sample ที่ความเร็วจาก sample ล่าสุดที่เก็บไว้ `> outlierSpeed_kmh` (spike แบบ `synthetic-drift-spike-01`: กระโดด 150/300 ม. แล้วกลับ)
- **re-anchor:** ถ้าถูกทิ้งเพราะความเร็วติดกัน `outlierReanchorSamples` ตัว และตัวที่ถูกทิ้งเหล่านั้นสอดคล้องกันเอง (ความเร็วระหว่างกัน ≤ `outlierSpeed_kmh`) ให้ตัวล่าสุดเป็น anchor ใหม่ · คู่ที่ข้ามการกระโดดนับระยะ 0 · กันการติดค้างเมื่อตำแหน่งย้ายจริง (เช่น GPS กลับมาหลังตึกบัง)
- jitter เล็กไม่ถูกแตะ: ม้านั่ง jitter (`synthetic-bench-jitter-01`) ยังได้ระยะ · โต๊ะนิ่ง (`synthetic-table-still-01`) ได้ระยะน้อยเพราะ jitter เล็กจริง ไม่ใช่เพราะถูกกรอง

**ขั้น 2 — resample เป็นจังหวะคงที่**
- จุด grid อยู่ที่ `τ = i · sampleCadence_s` (ผูกกับนาฬิกาของหน้าต่าง) · `window_s` ต้องหาร `sampleCadence_s` ลงตัว (config lint ตรวจใน P2-F04-T24) · จุดขอบหน้าต่างจึงเป็นจุด grid เสมอ
- ตำแหน่งที่จุด grid = interpolate เชิงเส้นใน lat/lng ระหว่าง sample ที่เก็บไว้สองตัวที่คร่อมจุดนั้น · คำนวณได้เฉพาะเมื่อ **คู่ที่คร่อม** ห่างกัน `≤ maxSamplePairGap_s` และทั้งสองตัวอยู่ในเวลาที่นับ (GD B-04) · ไม่เข้าเงื่อนไข = จุด grid นั้นไม่มีค่า
- เหตุผล: เครื่องที่ส่ง 1 Hz กับ 0.2 Hz ได้ระยะใกล้กันจากการเดินเดียวกัน (interpolation เชิงเส้นไม่เพิ่มระยะ · การลดความถี่ตัด jitter ส่วนที่ถี่กว่า cadence) และ server ที่ได้ batch รายนาทีคำนวณได้ผลเท่ากัน

**ขั้น 3 — สะสมระยะ**
- ระยะของหน้าต่าง = ผลรวม `haversine_m` ของคู่จุด grid ที่ติดกันซึ่งมีค่าทั้งคู่ · คู่ใดขาด = 0
- **กฎคู่ที่คร่อมขอบหน้าต่าง (เลือกแบบเดียว):** ระยะของคู่ `(g_i, g_{i+1})` นับเข้าหน้าต่างที่มี `g_{i+1}` (หน้าต่างของจุดปลาย) · เพราะขอบหน้าต่างเป็นจุด grid (ขั้น 2) ไม่มีคู่ใดคร่อมขอบจริง กฎนี้จึงไม่แบ่งสัดส่วน
- คู่ที่คร่อมช่วงหยุดนับ (เข้า Grace แล้วกลับ Active) = 0 เพราะ sample ในช่วงไม่นับไม่ใช้ใน interpolation

### 5.4 sample ที่ engine เก็บใน state (C2-5)

- ตัวสะสมเก็บเฉพาะ: sample ล่าสุดที่ผ่านขั้น 1 (anchor), ตัวที่ถูกทิ้งติดกันซึ่งรอ re-anchor (ไม่เกิน `outlierReanchorSamples`), จุด grid ล่าสุด, ระยะสะสมของหน้าต่างปัจจุบัน และ `τ` · ไม่เก็บรายการ sample ของทั้งหน้าต่าง
- HUD (`gateDiagnosticWindows`) ต้องการ sample ย้อนหลัง `window_s` ในหน่วยความจำของ HUD เท่านั้น ไม่เขียนลง storage

### 5.5 key ของ config ที่ต้องมี (ข้อเสนอชื่อ · systems-designer ถือใน P2-F05-T20)

| key (ใน `config/balance/dungeons.json#movementGate`) | ความหมาย | ข้อจำกัดจาก ADR นี้ |
| --- | --- | --- |
| `sampleCadence_s` | จังหวะของ grid | `window_s % sampleCadence_s = 0` · ต้องทำให้ vector table-still = 0 หน้าต่างผ่าน และ bench-jitter ≥ 1 หน้าต่างผ่านบน trace 1 Hz |
| `maxSampleAccuracy_m` | เกณฑ์ทิ้ง sample ของ gate | แยกจาก `anticheat.checkIn.maxAccuracy_m` (อ้างด้วย pointer ได้ถ้าตั้งใจให้เท่ากัน) |
| `maxSamplePairGap_s` | คู่ที่คร่อมห่างเกินนี้ไม่ interpolate | vector 400 ม. ของ GD B-04 |
| `outlierSpeed_kmh` | ความเร็วที่เป็นไปไม่ได้สำหรับคนเดิน | แยกจาก `anticheat.speedLock.speedLock_kmh` (ล็อกการเล่น) |
| `outlierReanchorSamples` | จำนวน sample ที่ถูกทิ้งติดกันก่อน re-anchor | จำนวนนับ ไม่มี suffix (ADR 0001 3.10.3) |

- ระหว่างที่ key ยังไม่มีในไฟล์ geo และ engine ยังเขียนได้เพราะรับเป็น parameter · accessor ของ `src/config` throw `ConfigUnsetError` ถ้าอ่าน key ที่ไม่มี · vector ของ systems ต้องครอบ: table-still = 0, bench-jitter ≥ 1, drift-spike ไม่ได้ระยะจาก spike, edge-walk ไม่นับ spike ข้ามขอบ, ระยะเท่าเกณฑ์พอดีไม่ผ่าน, คู่ห่างเกินเกณฑ์ไม่นับ, นาฬิกาหยุดระหว่าง Grace

## 6. สัญญา RNG (B-09)

1. **seed ของ run:** `runSeed` เป็น uint32 · Phase 2 client สร้างตอนเริ่ม run ด้วย `crypto.getRandomValues` ใน `apps/client` (ไม่ใช่ใน shared) แล้วส่งเข้า session · Mock / test / vector ส่งค่าคงที่ได้ · **Phase 3 seed สร้างและเก็บที่ server เท่านั้น ไม่ส่งถึง client** (ไม่งั้นทำนาย drop ได้)
2. **stream แยกต่อระบบแบบ counter-based:** ทุกครั้งที่ต้องสุ่ม engine สร้าง PRNG ใหม่จาก `deriveSeed(runSeed, streamTag, index)` แล้วดึงเลขตามลำดับในข้อ 3–4 · ไม่มี PRNG ที่มีสถานะต่อเนื่องข้าม tick หรือข้ามการตี จึงไม่มีสถานะของ PRNG ใน state
   - `deriveSeed` = FNV-1a 32 บิต (offset basis `0x811c9dc5`, prime `0x01000193`) ของ byte UTF-8 ของสตริง `` `${runSeed}:${streamTag}:${index}` `` (`runSeed`, `index` เป็นเลขฐานสิบไม่มีเลขศูนย์นำหน้า)
   - PRNG = `mulberry32(deriveSeed(...))` (ตัวเดียวกับ `tools/sim/src/rng.ts` ที่ P2-F05-T02 port) · ให้เลขใน `[0, 1)`
   - `streamTag`: `"drop"` (index = ลำดับ reward tick ที่ผ่าน gate ใน run เริ่ม 0) · `"hit"` (index = ลำดับความพยายามตีของมอนสเตอร์ใน run เริ่ม 0) · ระบบใหม่เพิ่ม tag ใหม่ ห้ามใช้ tag เดิมร่วม
   - ผล: tick ที่ไม่ผ่าน gate ไม่ใช้เลขสุ่ม · การตีเพิ่มหนึ่งครั้งไม่เลื่อนผล drop · server Phase 3 ทำซ้ำได้จาก `runSeed` + ลำดับ
3. **ลำดับการดึงต่อ reward tick (stream `drop`):**
   1. rarity: ดึง 1 ครั้งต่อ rarity ที่เป็นแบบโอกาส **ทุก rarity** ตามลำดับใน config ของ drop table (ต่ำไปสูง) · `u < rate_pct / 100` = ได้
   2. item: สำหรับแต่ละ rarity ที่ได้ ตามลำดับเดิม ดึง 1 ครั้งเลือก item ใน pool ของ rarity นั้นตาม weight ใน config (index แรกที่ผลรวม weight สะสม `> u × ผลรวม weight`)
   3. จำนวน: ตามลำดับ item ที่ได้ (common ก่อน แล้วตามลำดับข้อ 2) ดึงค่าฐานแบบจำนวนเต็มสม่ำเสมอถ้า item มีช่วงจำนวน แล้ว `stochasticRound` ของจำนวนที่คูณตัวคูณแล้ว 1 ครั้ง (`rng() < x − floor(x)` → ปัดขึ้น) ตาม `tools/sim/src/drops.ts`
   - จำนวนครั้งที่ดึงในข้อ 2–3 ขึ้นกับผลของข้อ 1 ได้ เพราะ stream ของ tick นี้ไม่ต่อไปยัง tick อื่น
4. **ลำดับการดึงต่อความพยายามตี (stream `hit`):** (1) ช่วงเวลาถึงความพยายามครั้งนี้ `uniform(intervalMin_s, intervalMax_s)` (2) ตีโดนหรือไม่ `u < hitChance_pct / 100` · ความเสียหายเป็นสูตรไม่สุ่ม (ถ้า systems เพิ่มการสุ่ม ให้ต่อเป็นลำดับที่ 3 และแก้ ADR นี้)
5. **vector:** vector ของ drop และ hit ระบุ `runSeed`, `index` และผลที่คาด (P2-F05-T02, P2-F05-T20) · การเปลี่ยนลำดับหรือ `deriveSeed` = เปลี่ยนสัญญา ต้องแก้ ADR นี้และ vector พร้อมกัน

## 7. `PresenceStrategy` — check-in / check-out ตาม `verification_mode` (B-08)

```ts
// packages/shared/src/run (backend-programmer) · รูปเป็นสัญญา ชื่อ field ละเอียดใน tech note P2-F04-T14
type VerificationMode = 'continuous_gps' | 'entry_exit';
interface PresenceStrategy {
  readonly mode: VerificationMode;
  /** ตัดสิน check-in จาก approach ที่เก็บไว้ + sample ล่าสุด · pure */
  checkIn(ctx: CheckInContext, params: CheckInParams): { ok: true } | { ok: false; reason: CheckInRejectReason };
  /** inside / outside สำหรับ run state machine (มี hysteresis ที่ขอบ) · pure */
  presence(ctx: PresenceContext, params: PresenceParams): 'inside' | 'outside' | 'unknown';
}
declare function selectPresenceStrategy(mode: string): PresenceStrategy;
```

- `continuous_gps` (ทำจริงใน P2-F04-T20): ใช้ `anticheat.checkIn.{minContinuousApproach_s, maxAccuracy_m, teleportIntoPolygonAllowed}` · ต้องมี sample ต่อเนื่องที่เดินเข้ามาจากนอก polygon อย่างน้อย `minContinuousApproach_s` · sample แรกที่อยู่ใน polygon โดยไม่มี approach = ปฏิเสธเมื่อ `teleportIntoPolygonAllowed = false` · ปฏิเสธ = event `checkin_rejected` พร้อม reason (ไม่มีพิกัด)
- `entry_exit`: มี class/ฟังก์ชันตาม interface แต่ทุก method throw `NotImplementedError` · dungeon ที่มี mode นี้ใน v1 แสดงเป็น "ปิด" (fail closed) · ไม่มี dungeon ใน Phase 2 ใช้ mode นี้
- `selectPresenceStrategy` เลือกจาก `verification_mode` ของ record dungeon · ค่าที่ไม่รู้จัก → throw `UnknownVerificationModeError` และ dungeon นั้นเล่นไม่ได้ (fail closed)
- `floor_level`: v1 ต้องเป็น `null` (`balance.dungeons.verification.v1FloorLevel`, `_nullMeans: none`) · record ที่มีค่าไม่ใช่ `null` ถูก validator ของ `tools/dungeons` ปฏิเสธใน v1 และ engine ถือว่าเล่นไม่ได้ (non-negotiable 5)
- sequence ของ confirm → check-in → Active อยู่ใน tech note P2-F04-T14 · vector ของ check-in อยู่ใน P2-F05-T20

## 8. dependency, lint boundary และ toolchain ของ Phase 2 (C1-2, N-01, N-02)

### 8.1 dependency ที่ติดตั้งล่วงหน้า (pin ตรง, ผ่าน `minimumReleaseAge` 7 วัน, ไม่มี install script)

| workspace | dependency | ใช้ใน | หมายเหตุการตรวจ |
| --- | --- | --- | --- |
| root (dev) | `happy-dom` 20.14.5 | DOM test ของ HUD (P2-F04-T25) | ออก 2026-09-12 · dependency: `ws`, `entities`, `whatwg-mimetype`, `buffer-image-size` · ไม่มี install script |
| root (dev) | `@resvg/resvg-js` 2.6.2 | rasterize SVG ใน `tools/art` (P2-F06-T07) | binary มากับ optional package ต่อ platform (`@resvg/resvg-js-darwin-arm64` ฯลฯ) ไม่ compile ตอนติดตั้ง · ไม่มี install script จึงไม่ต้องเพิ่ม `allowBuilds` |
| `tools/dungeons` | `polylabel` 2.1.0 (+ dev `@types/polylabel` 2.0.0), `ajv` 8.20.0, `ajv-formats` 3.0.1, `@keep-walking/geo`, `@keep-walking/shared` · dev `@types/geojson` 7946.0.16 | จุดป้าย (D-075), validator, schema ของ dungeon (P2-F04-T26) | `polylabel` ดึง `tinyqueue` 3.0.0 ตัวเดียว |
| `tools/config-lint` | `ajv` 8.20.0, `ajv-formats` 3.0.1, `@keep-walking/shared` | schema + lint ของ config (P2-F04-T24) | — |
| `packages/geo` | dev `@types/geojson` 7946.0.16 | type ของ polygon (type-only) | leaf: ไม่มี `@keep-walking/*` |
| `packages/shared` | `@keep-walking/geo` (workspace) · `ajv`, `ajv-formats` **ย้ายเป็น dev** | engine เรียก geo (ADR 0001 3.2) · Ajv ใช้ใน test เท่านั้น (C1-4) | — |
| `apps/client` | `@keep-walking/geo` (workspace) | HUD, mask, สลับจากสำเนา haversine (P2-F04-T25) | — |

- **ไม่ติดตั้ง** library `opening_hours` ที่ใดเลย (B-12 · เหตุผลหัวข้อ 9.2) · ไม่มี `@turf/*` · ไม่มี analytics SDK (C2-1) · ไม่มี package ของ font (font เป็นไฟล์ vendor ที่ `tools/art` ตรวจ sha256 · D-057)
- `tools/art` **ไม่มี `package.json`** (ไม่เป็น workspace): ใช้ `@resvg/resvg-js` จาก root devDependencies · รันด้วย `pnpm exec tsx tools/art/src/<cli>.ts` · typecheck โดย root `tsconfig.json` · test เก็บโดย glob `tools/*/src|test` ของ Vitest · เหตุผล: สร้าง workspace ใหม่ = เขียน lockfile (ADR 0001 3.3) แต่ Writes ของ P2-F06-T07 ไม่มี lockfile
- งานอื่นที่ต้องการ dependency เพิ่มใน Phase 2 ให้ handoff ถึง tech-lead ตาม ADR 0001 3.3

### 8.2 ESLint (`eslint.config.js`)

| ขอบเขตไฟล์ | กฎ | บังคับเงื่อนไข |
| --- | --- | --- |
| `packages/shared/src/**/*.ts`, `packages/geo/src/**/*.ts` ยกเว้น `*.test.ts` | `no-restricted-globals`: `window`, `self`, `document`, `navigator`, `location`, `localStorage`, `sessionStorage`, `indexedDB`, `caches`, `fetch`, `XMLHttpRequest`, `WebSocket`, `performance`, `crypto`, `setTimeout`, `setInterval`, `setImmediate`, `clear*`, `requestAnimationFrame`, `requestIdleCallback`, `queueMicrotask` · `no-restricted-properties`: `Date.now`, `Math.random`, `crypto.getRandomValues`, `globalThis.*` · `no-restricted-syntax`: `new Date()` ไม่มี argument, `Date()` · `no-eval`, `no-implied-eval`, `no-new-func` | C1-2, C1-3, C1-4 |
| `packages/shared/src/**/*.ts` ยกเว้น test | import `ajv`, `ajv-formats` ไม่ได้ | C1-4 |
| `packages/geo/**/*.ts` (รวม test) | import `@keep-walking/*`, `**/packages/**`, `**/shared/**`, `**/location/**`, `ajv` ไม่ได้ | B-01, C1-4 |
| `apps/client/**/*.ts` | import `@keep-walking/shared/run`, `/reward`, `/hp`, `@keep-walking/shared/src/**`, `**/packages/**`, `ajv` ไม่ได้ · `@keep-walking/shared/session` และ `@keep-walking/geo` ได้ | B-07, C1-4 |
| ทุกบล็อกข้างบน | คงกฎเดิม `**/tools/**`, `@keep-walking/tools-*` (flat config แทนที่ option ของ rule เดียวกัน จึงรวม pattern ไว้ทุกบล็อก) | ADR 0001 3.5 |

- test ใน shared ใช้ Ajv เทียบผลกับตัวตรวจที่เขียนเอง (D-033) จึงยกเว้นไฟล์ test จากกฎ pure และกฎ Ajv · test ของ geo ห้าม import ข้ามแพ็กเกจเช่นกัน (fixture อ่านจากไฟล์)
- `tools/*` ไม่อยู่ใต้กฎ pure (เป็น CLI ของ Node) · qa import `tools/*` ได้ (N-08)

### 8.3 TypeScript

- `packages/geo/tsconfig.json` = แบบเดียวกับ shared: extends base, `lib: ["ES2023"]`, `types: []`, include `src/**/*.ts` · มี script `typecheck` จึงถูกเรียกโดย `pnpm -r typecheck`
- root `tsconfig.json` (catch-all ที่มี DOM + Node types) เพิ่ม include: `packages/geo/test/**`, `tools/dungeons/{src,test}/**`, `tools/config-lint/{src,test}/**`, `tools/art/{src,test}/**` · เมื่อ tool ใดเพิ่ม tsconfig + script `typecheck` ของตัวเอง ให้ถอดออกจาก root ผ่านงาน tech-lead (ADR 0001 3.4)

### 8.4 Vitest และ subpath exports

- include เดิม (`packages/*/src|test`, `tools/*/src|test`, `qa/tests/**`) ครอบ `packages/geo`, `tools/dungeons`, `tools/config-lint`, `tools/art` แล้วโดยไม่ต้องเพิ่ม glob
- DOM test: environment ตั้งต้นยังเป็น `node` · ไฟล์ที่ต้องใช้ DOM ใส่ docblock บรรทัดแรก `// @vitest-environment happy-dom` (ตรวจแล้วใน Vitest 5.0.1 หัวข้อ 14) · ห้ามใช้ใน `packages/shared` และ `packages/geo`
- `packages/shared/package.json` `exports`: `.` → `./src/index.ts` · `./formulas`, `./config`, `./run`, `./reward`, `./hp`, `./session` → `./src/<x>/index.ts` · `./schemas/*` → `./schemas/*` · subpath ที่ยังไม่มีไฟล์ไม่ทำให้ typecheck พังจนกว่าจะมีคน import

## 9. ข้อมูล dungeon และ config ที่ไปถึง client (B-12, F-04)

### 9.1 artifact ของ dungeon

- `tools/dungeons` (P2-F04-T26) อ่าน `data/dungeons/` ตรวจตาม `design/levels/dungeon-rules.md` และ `packages/shared/schemas/dungeon.schema.json` แล้วสร้างไฟล์ที่ client โหลด: polygon (rewind แล้ว), จุดป้ายหนึ่งจุดต่อ dungeon (D-075, หัวข้อ 11.3), จุดปลายทางนำทางสาธารณะ, property ตาม whitelist, เวลาทำการแบบ normalized · รูปไฟล์และ whitelist กำหนดใน tech note P2-F04-T14
- validator รันใน `pnpm test` · record ที่มี `floor_level` ไม่ใช่ `null` หรือ `verification_mode` ที่ไม่รู้จักไม่ผ่าน
- runtime (client และ server Phase 3) ไม่คำนวณจุดป้ายหรือ parse เวลาทำการข้อความ OSM เอง

### 9.2 เวลาทำการ

- **ไม่ใช้ library `opening_hours`** (ใหญ่ ลาก dependency วันหยุด/i18n และประเมินด้วย timezone ของเครื่อง) · `tools/dungeons` มี parser เล็กสำหรับไวยากรณ์ย่อย (ช่วงวัน `Mo-Su`, ช่วงเวลา `HH:mm-HH:mm` หลายช่วง, `off`, `24/7`) · ข้อความที่อยู่นอกไวยากรณ์ย่อย (`PH`, `SH`, `sunrise`, comment, week) → `opening_hours_source: manual_required` ให้ level-designer กรอกตารางเอง
- runtime ประเมินด้วยฟังก์ชัน pure ใน `src/run` จาก `now_ms` + offset คงที่จาก config (กรุงเทพฯ ไม่มี DST · ชื่อ key กำหนดใน P2-F04-T14) ไม่ใช้ timezone ของเครื่อง

### 9.3 config ที่ client โหลด (F-04, F-08)

- client ไม่ import ไฟล์ config ทั้งไฟล์ (`dungeons.json`, `anticheat.json`) · ใช้ build step ใน `apps/client` (virtual module หรือไฟล์ generate) ที่ส่งเฉพาะ key ที่ client ใช้ตาม whitelist ในโค้ด client · server Phase 3 อ่านไฟล์เต็ม · ค่าคงที่ UI อยู่ `config/app/client.json` (P2-F04-T25)

## 10. วิธีวัดงบ bundle (N-13)

1. `pnpm build` แล้ววัดจาก `apps/client/dist` โดยใช้ Vite manifest (`build.manifest: true`)
2. **JS ตอนเปิด** = entry chunk ของ `index.html` + chunk ทุกตัวที่ entry import แบบ static (ตาม `imports` ของ manifest แบบ recursive · ไม่รวม `dynamicImports`)
3. ขนาด = ผลรวมของ brotli (Node `zlib.brotliCompressSync`, quality 11) ต่อไฟล์ · ใช้แทนขนาด transfer ของ Cloudflare Pages
4. งบ: `bundle.initialJsBudget_bytes` ใน `config/app/client.json` ค่าตั้งต้น 1,000,000 (S5 ≤ 1.0 MB, 10^6 byte) · maplibre + worker ที่โหลดแบบ lazy วัดแยกตามวิธีเดียวกันกับงบ `bundle.mapLazyJsBudget_bytes` (ค่าตั้งจากการวัดใน P2-F04-T10) · CSS, font, tile, trace ไม่นับในงบ JS
5. script วัดอยู่ใน `apps/client/scripts/` (P2-F04-T10) และ CI เรียก (P2-F06-T16) · เกินงบ = fail
- ข้อมูลอ้างอิง ณ งานนี้: chunk `index` ตัวเดียว 1,196.50 kB (gzip 326.19 kB) ยังไม่ code-split

## 11. คำตัดสิน decision ที่ค้างจาก Phase 1

### 11.1 D-054 — ACCEPTED

provider ไม่กรอง fix ตาม accuracy · ทิ้งเฉพาะ fix ที่เสีย (ค่าไม่ใช่ตัวเลข นอกช่วงพิกัด timestamp ไม่เพิ่มขึ้น) · สถานะ "accuracy ต่ำ" เป็นการแสดงผลบน client จาก config · การกรองเพื่อรางวัลอยู่ใน `packages/geo` (หัวข้อ 5.3) ที่ server Phase 3 ใช้โค้ดเดียวกันกับ batch ดิบ · ไม่มีการกรองสองชั้นที่ให้ผลต่างกัน

### 11.2 D-057 — ACCEPTED พร้อมเงื่อนไข

- UI font = IBM Plex Sans Thai Looped 500/700 จาก WOFF2 ทางการที่ไม่แก้ไข pin ด้วย release tag + sha256 · `tools/art` (P2-F06-T07) ตรวจ sha256 และเก็บ `OFL.txt`
- **ไม่ subset และไม่ทำ subset เปลี่ยนชื่อ** (ตัดความเสี่ยงเรื่อง Reserved Font Name "Plex")
- งบ ≤ 60 KB ต่อน้ำหนัก วัดเป็นขนาดไฟล์ WOFF2 (บีบอัดแล้ว) ตาม `art/direction/asset-pipeline.md` · ไม่นับในงบ JS · `font-display: swap`
- เกินงบ → เปลี่ยนเป็น Noto Sans Thai Looped (OFL · ยืนยันว่าไม่มี Reserved Font Name จาก `OFL.txt` ตอนดึงไฟล์ ตาม A-P1-F03-T11-9) ซึ่ง subset เหลือช่วงไทย + Basic Latin ได้ (`modified: true`) · glyph ของแผนที่ไม่เกี่ยว (PBF ตาม tech note F02 6.2) · ไม่มี npm package ของ font

### 11.3 D-075 — ACCEPTED พร้อมเงื่อนไข

- view model ของ dungeon บนแผนที่มี 2 source: `kw-dungeons` (polygon, fill/line เท่านั้น) และ `kw-dungeon-labels` (Point หนึ่งจุดต่อ dungeon, symbol เท่านั้น) · whitelist 6 property เดิม
- จุดป้าย = pole of inaccessibility ของ polygon ที่ใหญ่สุด คำนวณ **ตอน build** ใน `tools/dungeons` ด้วย `polylabel` 2.1.0 บนพิกัดที่ project แบบ equirectangular รอบจุดศูนย์กลาง (x = lng·cos(lat₀)) เพื่อให้ precision เป็นเมตร · ค่า precision เป็น config ตามที่ P2-F04-T14 กำหนด
- runtime ไม่มี polylabel · สำเนาที่เขียนเองใน `apps/client/src/map/dungeons-source.ts` ถูกลบเมื่อ client อ่านจุดจาก artifact (P2-F04-T21) · Phase 3 หลังบ้านรัน build step เดียวกันตอน publish

## 12. ผลที่ตามมา

ข้อดี
- โค้ดชุดเดียวของ run / gate / drop / HP รันได้ทั้ง client (Phase 2) และ CellDO (Phase 3) · vector ของ systems ตรวจทั้งสองฝั่งด้วย test เดียว
- ความ pure บังคับด้วย lint ไม่ใช่ด้วยตา · client เรียก engine ย่อยตรงไม่ได้
- ผลของ gate ไม่ขึ้นกับความถี่ sample ของเครื่อง และ server ได้ผลเท่ากันจาก batch รายนาที
- drop ทำซ้ำได้จาก seed + ลำดับ โดยไม่มีสถานะ PRNG ใน state

ข้อเสียและความเสี่ยง
- ช่วง Phase 2 client ตัดสินผลเอง (C1-1) · ยอมรับเพราะไม่มีรางวัลจริง และมีวันหมดอายุที่ tech gate F08 ตรวจ
- ค่า `sampleCadence_s` เป็นการแลก: cadence สั้นให้เครื่อง 1 Hz ได้ระยะ jitter มากกว่าเครื่องความถี่ต่ำ · cadence ยาวอาจทำให้ม้านั่ง jitter ไม่ผ่าน · ต้องตั้งจาก vector + ผลสนาม (N-11, P2-C03)
- ทิศ import ภายใน shared ยังตรวจด้วยตา (หัวข้อ 3.1)
- ต้นทุน server Phase 3: ต้องเก็บ state ของตัวสะสมต่อ run ใน DO (เล็ก ไม่กี่สิบ byte ตามหัวข้อ 5.4)

## 13. ต้นทุน

- dependency ใหม่ทั้งหมดเป็น open source ฟรี (MIT / ISC / MPL-2.0 สำหรับ resvg) · ไม่มีบริการใหม่ ไม่มีบัญชี ไม่มีค่าใช้จ่าย (D-085) · ไม่มี vendor lock-in ใหม่
- ขนาดที่เพิ่มใน client: 0 (dependency ใหม่ทั้งหมดอยู่ใน dev หรือ tools)

## 14. หลักฐานการตรวจ (2026-09-26, macOS, Node 24.19.0, pnpm 11.24.0)

| คำสั่ง | ผล |
| --- | --- |
| `pnpm install --frozen-lockfile` | "Already up to date" · 11 workspace projects · ไม่มี package ใหม่ที่มี `install`/`preinstall`/`postinstall` |
| smoke `@resvg/resvg-js` | render SVG 4×4 เป็น PNG 74 byte (binary darwin-arm64 จาก optional package) |
| smoke `polylabel` | สี่เหลี่ยม 10×10 → `[5, 5]` distance 5 |
| probe lint (ไฟล์ชั่วคราวใน `packages/geo/src`, `packages/shared/src`, `apps/client/src` ลบแล้ว) | 22 error ตามคาด: `Date.now`, `Math.random`, `window`, `performance`, `new Date()`, `globalThis.fetch`, `setTimeout`, `new Function`, `localStorage`, `crypto`, `crypto.getRandomValues`, `navigator`, `document`, `fetch`, `ajv` (shared, geo), `@keep-walking/shared` และ `../../shared/src` ใน geo, client import `run`/`reward`/`hp`/path ลึก · import `@keep-walking/shared/session` และ `Date.now` ใน client ไม่ถูกแจ้ง |
| probe DOM (ไฟล์ชั่วคราวใน `apps/client/src` ลบแล้ว) | `// @vitest-environment happy-dom` → 1 passed |
| `pnpm lint` | ESLint ผ่าน 0 warning · Prettier ผ่านทุกไฟล์ของงานนี้ (ไฟล์ที่ไม่ผ่านเป็นของงานคู่ขนาน ดูรายงาน P2-F04-T05) |
| `pnpm typecheck` | exit 0 · root + `packages/geo`, `packages/shared`, `tools/copy-lint`, `apps/client` |
| `pnpm test` | 62 files · 929 passed, 2 skipped (รอบที่ tools/coverage ของงานคู่ขนานไม่อยู่ระหว่างแก้) |
| `pnpm build` | exit 0 · `apps/client` built |

## 15. งานต่อ

- P2-F04-T12 (location): สร้าง `packages/geo` ตามหัวข้อ 4–5
- P2-F04-T14 (tech-lead): API ของ `session`, ชนิด input/event, sequence ต่อ tick, confirm + check-in, failure modes (N-09), key offset ของเวลา, precision ของจุดป้าย, รูป artifact
- P2-F05-T20 (systems): key ในหัวข้อ 5.5 + vector gate / check-in / RNG
- P2-F05-T02 (backend): port `mulberry32` + `deriveSeed` ตามหัวข้อ 6 · `src/config` ไม่มี Ajv
- P2-F04-T24 (tech-lead): config lint ตรวจ `window_s % sampleCadence_s = 0`
- P2-F04-T25 (gameplay): สลับไปใช้ geo, DOM test ด้วย happy-dom, prefix `kw.p2.`
- P2-F04-T10 (gameplay): script วัดงบ bundle ตามหัวข้อ 10
- P2-F06-T07 (tech-lead): `tools/art` ไม่มี `package.json` (หัวข้อ 8.1) · font ตาม 11.2
