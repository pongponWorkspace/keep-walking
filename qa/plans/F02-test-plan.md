# Test plan F02 — Tech Foundation และ Map/Location Spike

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Draft — รอ P1-F02-T13 (build cases เหล่านี้), P1-F02-T14 (field kit), P1-F02-T16 (QA gate) |
| วันที่ | 2026-09-23 |
| task | P1-F02-T12 · เจ้าของ qa-tester |
| อ้างอิง | `docs/tech/F02-map-location-spike.md` (หัวข้อ 1–14), `docs/tech/gps-trace-format.md`, `docs/adr/0001-repo-layout.md` (หัวข้อ 3.6, 3.7, 3.12), `apps/client/README.md`, `apps/client/e2e/map-shell.spec.ts`, `design/ux/flows/F03-core-loop.md` (หัวข้อ 4.1, 7, 8, 9.5), `studio/roadmap.md` F02, `studio/phases/phase-1/board.md` #P1-F02-T12/T13/T14/T16, GDD "Movement gate", "Anti-cheat", "สัญญาณขาดและแอปถูกปิด", "ล็อกหน้าจอ" |
| ใช้โดย | P1-F02-T13 (build black-box test + QA trace ตาม case ในนี้), P1-F02-T14 (คัดลอกเกณฑ์ field ไปทำ kit/form), P1-F02-T16 (QA gate เทียบผลจริงกับตารางนี้), P1-CLOSE-QA |

## 1. ขอบเขตของ spike (จาก tech note หัวข้อ 1) และผลต่อ test plan นี้

F02 พิสูจน์เฉพาะ: MapLibre + tile บนมือถือลื่นไหม, จุดตำแหน่งขยับตามจริงไหม, FPS/แบต/data/accuracy ในสวนและซอยเป็นเท่าไร บน Android Chrome และ iOS Safari (D-003) **ไม่ใช่** dungeon polygon, check-in, tick รางวัลจริง, หรือ backend ใด ๆ ตัวเลขที่ HUD คำนวณ (ระยะสะสม, หน้าต่าง 5 นาที) เป็นค่าวัดเพื่อประเมิน GPS เท่านั้น ไม่ใช่รางวัลจริงและไม่ส่งไป server

ผลต่อ scope ของ test plan นี้:
- Movement gate ที่ทดสอบในนี้คือ **สูตรคำนวณของ HUD** (`config/balance/dungeons.json#movementGate`: > 50 ม. ใน 300 วินาที) ไม่ใช่ reward gate จริงบน server (ยังไม่มีจนถึง Phase 3) — ระบุไว้ชัดในทุก case ที่แตะเรื่องนี้เพื่อไม่ให้ QA gate ของ F02 ถูกเข้าใจผิดว่ารับรอง anti-cheat
- Presence/run state (Grace, Suspended, dungeon ปิดกลางคัน, raid) ยังไม่ถูกสร้างใน F02 (`design/ux/flows/F03-core-loop.md` หัวข้อ 4.1 เป็นเอกสารทิศทางสำหรับ Phase 2 เท่านั้น) → case เหล่านี้ถูกบันทึกไว้ในหัวข้อ 7 (inventory) เป็น **deferred** พร้อมเหตุผล ไม่ใช่ช่องโหว่ที่ QA gate ของ F02 ต้องปิด
- Anti-cheat ชั้น server (teleport เข้ากลาง polygon, speed lock ขับรถ, multi-device correlation, trust score, offline evidence upload จริง) อยู่ใน `config/balance/anticheat.json` แต่ไม่มี server ให้ทดสอบใน Phase 1 → deferred เช่นกัน (หัวข้อ 7)
- สิ่งที่ทดสอบได้จริงตอนนี้: `packages/location` (Web/Mock/Capacitor stub ผ่าน public interface), `packages/shared` (`validateTrace`), client spike (`apps/client`), debug HUD + export, tile build/serve ในเครื่อง, CI script — ทั้งหมดผ่าน black-box (public interface, ไม่แก้ unit test ของ dev ตาม TL-S04)

## 2. Traceability — เกณฑ์ผ่าน F02 ใน roadmap → กลุ่ม case

| เกณฑ์ผ่าน F02 (`studio/roadmap.md`) | กลุ่ม case | หลักฐานที่ต้องมี |
| --- | --- | --- |
| test ผ่านใน CI | `TC-CI-*` | output ของ `pnpm check` และ `pnpm test:e2e` ผ่านทั้งสอง Playwright project |
| Mock trace เล่นซ้ำได้และจุดขยับบนแผนที่ | `TC-LOC-*`, `TC-MAP-02`, `TC-MAP-03` | trace-replay test ผ่าน + e2e อ่าน `window.__kwSpike` เห็นตำแหน่งขยับตามเวลาของ trace |
| build ที่ deploy ได้ใน local/preview | `TC-TILE-01`, `TC-TILE-02`, `TC-CI-01` | `pnpm build && pnpm preview` สำเร็จ, e2e รันผ่านกับ build นั้น |
| คู่มือเดินทดสอบพร้อมใช้ | อ้างอิง P1-F02-T14 (ไม่ใช่ case ในไฟล์นี้) | QA gate F02 (T16) ตรวจว่าทำตาม kit ได้ครบในเครื่องคน (ไม่มี dev ต้องช่วย) |

เกณฑ์ spike ตัวเลข S1–S17, I1, I2 (tech note หัวข้อ 10.1) **ไม่ใช่** เกณฑ์ของ roadmap F02 โดยตรง แต่เป็นเกณฑ์ที่ P1-F02-T21 ใช้สรุป Go/No-go — QA มีหน้าที่ (ก) พิสูจน์ว่า**สูตรคำนวณ**ของแต่ละตัวถูกต้องด้วย trace ที่รู้ค่าคาดหวังล่วงหน้า (หัวข้อ 4) และ (ข) คัดลอกเกณฑ์ตัดสินไปยัง kit ของ T14 แบบไม่ปรับเอง (TL-M04, PM-M01) — QA **ไม่ตัดสิน** ผล Go/No-go เอง

## 3. Traceability — ตัวชี้วัด spike (หัวข้อ 10.1 ของ tech note) → วิธีพิสูจน์

| # | ตัวชี้วัด | พิสูจน์สูตรด้วย synthetic/QA trace (case) | พิสูจน์ตัวเลขจริงต้องเดินจริง | หมายเหตุ |
| --- | --- | --- | --- | --- |
| S1, S2 | FPS pan/zoom, ตามตัว | `TC-HUD-05` (ตรรกะคำนวณจากอาร์เรย์ frame-time จำลอง) | ใช่ (FIELD-S1, FIELD-S2) | `requestAnimationFrame` จริงทดสอบอัตโนมัติไม่ได้ |
| S3 | แบตต่อ 30 นาที | `TC-HUD-06` (สูตร + `battery_source`) | ใช่ (FIELD-S3) | iOS ไม่มี Battery API ต้องคนจด |
| S4 | เวลาแผนที่แรกขึ้น | `TC-MAP-01`/`TC-TILE-01` (ผ่าน/ไม่ผ่านเชิง fixture) | ใช่ (FIELD-S4, เน็ตมือถือจริง) | e2e ใช้ fixture local ไม่ใช่เน็ตมือถือจริง |
| S5–S8 | MB ของ JS/style/tile | `TC-HUD-07` | ใช่ (FIELD-S5..S8) | ตัวนับ byte พิสูจน์แยกจากขนาดจริงของ build เต็ม |
| S9, S10 | accuracy สวน/ซอย | `TC-HUD-08` (warm-up cutoff, median/p90 บน trace ที่รู้ค่า) | ใช่ (FIELD-S9, FIELD-S10) | accuracy จริงจาก GPS จำลองไม่ได้ |
| S11 | TTFF ≤ 30 ม. | `TC-HUD-09` | ใช่ (FIELD-S11) | — |
| S12 | % หน้าต่าง gate ผ่าน | `TC-HUD-01a/b/c` | ใช่ (FIELD-S12) | สูตรพิสูจน์ได้เต็มที่ด้วย trace แต่ "เดินจริงผ่าน gate กี่ %" ต้องเดินจริง |
| S13 | sample ขาด > 10 วิ | `TC-HUD-02` | ใช่ (FIELD-S13) | — |
| S14 | ช่วงห่าง fix | `TC-HUD-03` | ใช่ (FIELD-S14) | — |
| S15 | ความหน่วงจุด | `TC-HUD-04` | ใช่ (FIELD-S15) | latency จริงรวม network/render จริงต้องเดินจริง |
| S16 | ป้ายไทย 20 ป้าย 3 zoom | — (ต้องเห็น tile+font จริง) | ใช่ (FIELD-S16) | screenshot ตามหัวข้อ 10.4 |
| S17 | อ่านจอกลางแดด | — | ใช่ (FIELD-S17) | ต้องแดดจริง |
| I1 | jitter นิ่ง (bench/table) | `TC-HUD-01a` (table), `TC-HUD-01b` (bench) | ใช่ (FIELD-I1) | ข้อมูลประกอบ Phase 2 ไม่ใช่ Go/No-go เด็ดขาด |
| I2 | sample ขาดในกระเป๋า | `TC-LOC-04` (จำลองด้วย event) | ใช่ (FIELD-I2) | ข้อมูลประกอบ |

## 4. Case catalog

รันทั้งหมดผ่าน public interface เท่านั้น (`packages/location`, `packages/shared`, client ที่ build แล้ว) ตาม TL-S04 · ไฟล์จริงสร้างโดย P1-F02-T13 (Writes: `qa/tests/F02/`, `data/gps-traces/qa/`): `TC-LOC-*`/`TC-HUD-*`/`TC-PRIVACY-*`/`TC-COPY-*` เป็น Vitest ที่ `qa/tests/F02/*.test.ts` (root Vitest เก็บ `qa/tests/**` ตาม ADR 0001 หัวข้อ 3.6) · `TC-MAP-*`/`TC-TILE-*`/`TC-CI-02` ที่ต้องใช้ browser จริงต้องอยู่ที่ `qa/tests/e2e/*.spec.ts` เท่านั้น (root Playwright glob เฉพาะ path นี้ ไม่ใช่ `qa/tests/F02/`) รัน project `android-chrome` และ `ios-safari`

### 4.1 `TC-LOC-*` — LocationProvider (Web/Mock/Capacitor) ผ่าน trace-replay

| id | precondition | trace / steps | expected |
| --- | --- | --- | --- |
| TC-LOC-01 | T04, T05 DONE | glob ทุกไฟล์ `data/gps-traces/{synthetic,qa,recorded}/*.trace.json`, เล่นผ่าน MockLocationProvider ด้วย fake `Clock` | ทุกไฟล์ผ่าน `validateTrace` ก่อนเล่น · จำนวน sample ที่ provider ส่งออก = `samples.length` ของ trace (หัก sample ที่อยู่ในช่วง `visibility-hidden`) · `timestamp` เรียงเพิ่มขึ้นเคร่งครัด |
| TC-LOC-02 | เหมือนบน | เล่น trace เดียวกันที่ `speed=1,10,60` วัดเวลาที่ fake clock ต้องเดินจนจบ | เวลาที่ใช้ ∝ 1/speed (คลาดเคลื่อนได้จาก rounding เท่านั้น) |
| TC-LOC-03 | เหมือนบน | เรียก `pause()` กลางเรื่อง แล้ว `resume()`, แล้ว `seek(t)`, แล้วเล่นด้วย `loop=1` จนวนครบ 1 รอบ | หยุดจริงระหว่าง pause (ไม่มี sample ใหม่) · resume ต่อจากจุดเดิม · seek กระโดดไป sample ที่ตรง `t` ที่ใกล้สุด · loop เริ่ม sample แรกใหม่หลัง sample สุดท้าย |
| TC-LOC-04 | trace มี `events` ชนิด `visibility-hidden`/`visibility-visible` | เล่น trace `synthetic-*` ที่มีคู่ event นี้ (หรือ qa trace ที่ T13 เพิ่ม) | provider state → `suspended` ที่ `visibility-hidden`, ไม่ส่ง sample ระหว่างนั้นและไม่เก็บไว้ส่งย้อนหลัง (ตรง GDD "ล็อกหน้าจอ") · กลับเป็น `running` ที่ `visibility-visible` |
| TC-LOC-05 | trace มี event `permission-denied` | เล่น trace นั้น | provider เข้า state `error` ทันที, error code `permission-denied`, ไม่ retry เอง |
| TC-LOC-06 | trace มี event `position-unavailable` หรือ `timeout` | เล่น trace นั้น | provider ไม่เข้า `error` (non-fatal), ยังส่ง sample ถัดไปได้ต่อ |
| TC-LOC-07 | `packages/location/src/capacitor/` | เลือก provider `capacitor` แล้วเรียก `start()` | ได้ error `not-implemented`, state = `error`, ข้อความอ้าง "not implemented until Phase 8" |
| TC-LOC-08 | Web provider | ป้อนลำดับ fix ปลอมที่ `timestamp` ไม่เพิ่มขึ้น (fix ซ้ำจาก cache) ผ่าน stub ของ `navigator.geolocation` | provider ทิ้ง fix ที่ `timestamp` ไม่เพิ่มขึ้น ไม่ส่งออกซ้ำ |
| TC-LOC-09 | Web provider | เรียก `getPermission()` ก่อน `start()` เมื่อ Permissions API ไม่มี (จำลอง iOS Safari) | คืนค่า `unknown` ไม่เด้ง native prompt (ตรวจว่าไม่มีการเรียก `navigator.geolocation.getCurrentPosition`) |
| TC-LOC-10 | ทุก trace ใน repo | รัน `validateTrace` วนทุกไฟล์ | ผลลัพธ์ `ok: true` ทุกไฟล์ 100% — ถ้ามีไฟล์ไม่ผ่านคือ bug ของงานที่สร้างไฟล์นั้น ไม่ใช่ของ T12/T13 |

### 4.2 `TC-MAP-*` — Map spike client (Playwright, ทั้งสอง project)

| id | precondition | steps | expected |
| --- | --- | --- | --- |
| TC-MAP-R1 | `apps/client/e2e/map-shell.spec.ts` มีอยู่แล้ว (T09 DONE) | รัน `pnpm test:e2e` ตามที่เป็น | regression baseline: canvas ขึ้น, attribution มี OSM+Protomaps, ไม่มี request ข้าม origin, fallback ข้อความเมื่อไม่ตั้งค่า `VITE_TILES_URL`, viewport เต็มจอ — **ห้ามแก้ไฟล์นี้เอง (เป็นของ gameplay-programmer) หากพัง ให้ handoff** |
| TC-MAP-02 | T10 DONE (`LocationProvider` ต่อกับแผนที่) | เปิดหน้าด้วย `?loc=mock&trace=<id>&speed=60&hud=1`, อ่าน `window.__kwSpike.position` ทุก ~500ms จนจบ trace | ตำแหน่งที่อ่านได้ในแต่ละช่วงตรงกับพิกัดของ trace ณ เวลานั้น (คลาดเคลื่อนได้ตาม interpolation ที่ tech note นิยาม) · จุดเริ่มต้น = sample แรก, จุดจบ = sample สุดท้าย |
| TC-MAP-03 | เหมือนบน | เล่น trace ที่มี `accuracy` เปลี่ยนค่า (มาก/น้อยสลับกัน) | รัศมีวงกลม accuracy บนแผนที่เปลี่ยนตาม `sample.accuracy` (ตรวจผ่าน `window.__kwSpike` ไม่ใช่วัดพิกเซลของ canvas) |
| TC-MAP-04 | T10 DONE, `gps.*` state เดินสาย (design/ux F03-core-loop 9.5) | บังคับแต่ละ state ผ่าน trace event: ปกติ, `permission-denied`, `visibility-hidden`, ตัด network (Playwright `context.setOffline(true)`) | UI แสดง key/ข้อความตรงกับ state: `gps.searching`, `gps.denied`, (suspended ผ่าน visibility ไม่ใช่ scope ของ F02 — ดูหัวข้อ 7), `gps.offline`, และ `gps.restored` เมื่อกลับสถานะปกติ (toast แล้วหาย) |
| TC-MAP-05 | build+preview ทำงานพร้อม tile fixture | เริ่มโหลดแผนที่แล้วสั่ง `context.setOffline(true)` กลาง pan (จำลอง F9: เน็ตหลุดระหว่างโหลด tile) | ส่วนที่โหลดไม่ทันของแผนที่ว่างแต่แอปไม่ค้าง/ไม่ crash, ไม่กระทบ location (จุดตัวเองยังขยับต่อถ้า Mock ยังเดินอยู่), เมื่อ `setOffline(false)` แล้ว pan ใหม่ tile โหลดต่อ |
| TC-MAP-06 | T06 มี fixture PMTiles จริงของสวนลุมพินี (`tools/tiles/fixtures/`) | โหลดแผนที่ด้วย fixture นั้นแทน placeholder | canvas render, zoom ได้ถึง maxzoom ที่ fixture รองรับ, ไม่มี error "HTTP Byte Serving" ใน console (F1) |
| TC-MAP-07 | T11 รองรับ TileJSON URL ด้วย (ไม่ใช่แค่ `pmtiles://`) | ตั้ง `VITE_TILES_URL` เป็น local static server ที่เสิร์ฟ `tiles.json` + `{z}/{x}/{y}.mvt` | แผนที่ขึ้นเหมือนกันทั้งสองรูปแบบ source (ตรง tech note หัวข้อ 8) |
| TC-MAP-08 | เหมือนบน | ขอ tile ที่ไม่มีในชุด (`z/x/y` นอกพื้นที่) | ไม่ throw error ที่ทำให้แผนที่พัง (MapLibre ไม่ถือ 404 เป็น error ตามหัวข้อ 9 ของ tech note) — ตรวจว่า client ไม่มี handler ที่ throw ซ้ำ |

### 4.3 `TC-HUD-*` — สูตรคำนวณของ debug HUD และ export (T11)

ทุก case ในหมวดนี้ต้อง**รู้ค่าคาดหวังล่วงหน้า** (คำนวณมือหรือ script แยกจากโค้ด HUD) แล้วเทียบกับผลของ HUD — ไม่ใช้ HUD ตรวจ HUD เอง trace ที่ยังไม่มีให้ handoff ไป location-engineer (synthetic) หรือ QA สร้างเอง (`data/gps-traces/qa/`, กฎเดียวกับ synthetic — ดูหัวข้อ 6)

| id | precondition | trace / steps | expected |
| --- | --- | --- | --- |
| TC-HUD-01a | trace `*-table-still` (มือถือวางนิ่งบนโต๊ะ: `accuracy` คงที่ต่ำ ~3–5 ม., พิกัดขยับ < 1 ม.ตลอด) | ป้อนเข้าตัวคำนวณ gate window (S12) ช่วง 5 นาที | ระยะสะสมในหน้าต่างต่ำกว่า 50 ม. อย่างชัดเจน (คำนวณ haversine มือแล้วต้อง < 50) → `gate_windows_pass_pct = 0%` — ตรงกับ CLAUDE.md "a still phone gives 0 ticks" |
| TC-HUD-01b | trace `*-bench-jitter` (มือถือในมือ นั่งม้านั่ง: jitter ธรรมชาติตาม GDD "ยืนคุยโทรศัพท์หรือนั่งพักบนม้านั่งยังได้อยู่") | เหมือนบน | ระยะสะสมจาก jitter เพียงอย่างเดียวเกิน 50 ม. ในบาง/ทุกหน้าต่าง (ตามที่ trace ถูกออกแบบ) → `gate_windows_pass_pct > 0%` ตรงกับ CLAUDE.md "a bench with jitter still gives ticks" · **ถ้าผลออกมาเกิน 50 ม. โดยไม่ตั้งใจในทุกหน้าต่างของเดินจริง (FIELD-I1) ให้ยกเป็นประเด็นดีไซน์ต่อ systems-designer** ไม่ใช่ bug ของ HUD |
| TC-HUD-01c | trace `*-boundary-50m` (ระยะสะสมต่อหน้าต่างเท่ากับ 50.0 ม. พอดี 1 หน้าต่าง และ 50.01 ม. อีกหน้าต่าง) | เหมือนบน | `comparison: greaterThan` → หน้าต่างที่ = 50.0 ม. พอดี **ไม่ผ่าน** (fail) หน้าต่างที่ 50.01 ม. **ผ่าน** — ตรงกับ CLAUDE.md "exactly 50 m at the boundary" และ config `dungeons.json#movementGate.comparison` |
| TC-HUD-01d | ทุก trace ข้างต้น | รันสูตรเดียวกันกับที่ระบุไว้ว่า "ใช้ทั้งใน dungeon และ raid" (GDD, `movementGate.appliesTo`) | บันทึกไว้ว่า **สูตรเดียวกัน** (ไม่มี branch แยกตาม context) เพื่อให้ P1-F02-T13 ใช้ยืนยันว่า HUD ไม่ hardcode เฉพาะ dungeon — การพิสูจน์ว่า "gate ถูกใช้จริงใน raid" รอ Phase 2/3 (ไม่มี raid ใน F02) |
| TC-HUD-02 | trace `qa-gps-gap-2min` (ต้องมีจาก T13 ตาม gps-trace-format หัวข้อ 3) | ป้อนเข้าตัวคำนวณ S13 | `gap_count_10s = 1`, `gap_total_s` ≈ 120 (±1 จาก rounding), `gap_pct` = 120/`duration_s` ตรงตามสูตร |
| TC-HUD-03 | trace ที่ interval สม่ำเสมอที่รู้ค่า (เช่น synthetic ทุก 1 วิ) ผสมกับ trace ที่ interval ไม่สม่ำเสมอ | คำนวณ S14 | median ตรงกับค่าคำนวณมือ ทั้งกรณีคี่/คู่จำนวน sample |
| TC-HUD-04 | จำลอง event `render` ของแผนที่ด้วย timestamp ปลอมที่รู้ค่าต่อ sample (รวมกรณี timestamp ปลอมย้อนหลังกว่า `sample.timestamp`) | คำนวณ S15 | median/p90 ตรงตามสูตร · sample ที่ latency ติดลบถูกตัดออกจากค่าเฉลี่ยและถูกนับแยก (ไม่ถูกเงียบหาย) |
| TC-HUD-05 | ป้อนอาร์เรย์ `frame-time` ปลอม (จำลอง 60fps คงที่, จำลอง drop เหลือ 20fps ช่วงสั้น, จำลองช่วงห่าง > 1 วินาทีตอนหน้าถูกซ่อน) | คำนวณ S1/S2 | เฉลี่ยและ p5 ตรงสูตร · ช่วงห่าง > 1 วินาทีถูกตัดออก (ไม่ทำให้ FPS เฉลี่ยตกเทียม) |
| TC-HUD-06 | (ก) จำลอง `navigator.getBattery` คืนค่า level ต้น/ท้ายที่รู้ค่า (ข) ปิด Battery API (จำลอง iOS) | export CSV | (ก) `battery_source=api`, `battery_drain_per30min_pct` ตรงสูตร (ข) `battery_source=manual`, ฟอร์มบังคับให้กรอกเอง ไม่ export ค่า `api` ปลอม |
| TC-HUD-07 | จำลอง fetch/`getBytes` คืน `byteLength` ที่รู้ค่าต่อประเภท (js/style/tile) ทั้งกรณีมี `Timing-Allow-Origin` และไม่มี | export CSV | มี header ครบ → `bytes_method=transfer`, ผลรวมตรงสูตร · ไม่มี header (F11) → `bytes_method=decoded` ใช้ตัวนับหลักแทน ไม่ error |
| TC-HUD-08 | trace ที่ accuracy ในวินาทีที่ 0–60 แย่ผิดปกติ (จำลอง warm-up) แล้วดีขึ้นหลัง 60 วิ | คำนวณ S9/S10 | median/p90 คำนวณจากช่วงหลัง 60 วินาทีแรกเท่านั้น (ตัด warm-up ตามหัวข้อ 10.5) |
| TC-HUD-09 | trace ที่ accuracy ค่อย ๆ ดีขึ้นจนถึง ≤ 30 ม. (`checkIn.maxAccuracy_m` ใน `anticheat.json`) ที่ sample ลำดับที่รู้ | คำนวณ S11 | TTFF = เวลาของ sample แรกที่ accuracy ≤ 30 ม. พอดี (ทดสอบ boundary 30.0 ม. เท่ากับผ่าน/ไม่ผ่านตามนิยาม `≤`) |
| TC-HUD-10 | export summary CSV จากทุก case ข้างบนอย่างน้อย 1 ครั้ง | grep header + ทุกแถวข้อมูล | ไม่มีคอลัมน์หรือค่า `lat`, `lng`, geohash, ชื่อสถานที่, เวลาจริงเป็นวินาที (epoch), user agent เต็ม, รุ่นเครื่อง — ตรง CLAUDE.md "no PII in logs" และ gps-trace-format หัวข้อ 4.1 |
| TC-HUD-11 | ผู้ใช้กด export raw trace (opt-in) | (ก) trace ที่ตัดต้น/ปลายแล้วไม่ถึง `rawTraceTrim_m` (200 ม. ค่าตั้งต้น) (ข) trace ปกติที่ตัดได้พอ | (ก) ปุ่มดาวน์โหลด disable/ปฏิเสธ เพราะ `validateTrace` ล้มด้วย code `trim` (ข) ได้ไฟล์ `field-<uuid>.trace.json`, `meta.sanitized.trimStart_m/trimEnd_m` ≥ ค่า config, พิกัด ≤ 5 ทศนิยม, ไม่มี upload อัตโนมัติ (ตรวจว่าไม่มี network request ระหว่างกดปุ่มนี้ใน e2e) |
| TC-HUD-12 | build ที่ไม่มี `?hud=1` | เปิดหน้า, ตรวจ `window.__kwSpike` และ console log | `window.__kwSpike` เป็น `undefined` และไม่มี log ที่มีพิกัดในระดับ production (grep pattern ตัวเลขทศนิยมคู่คล้ายพิกัดในสองสามหลักแรกของ กทม. 13.x, 100.x) |

### 4.4 `TC-TILE-*` — build + serve ในเครื่อง

| id | precondition | steps | expected |
| --- | --- | --- | --- |
| TC-TILE-01 | client scaffold (T09/T10/T11) | `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview` จาก root | build ผ่าน exit 0, serve ที่ `:4173`, ขนาด bundle ถูกบันทึกไว้ (ตรง acceptance ของ T11 "build production ผ่าน และขนาด bundle ถูกบันทึก") |
| TC-TILE-02 | T06 มี fixture PMTiles ของสวนลุมพินี ≤ 2 MB (`tools/tiles/fixtures/`) | รัน `pnpm test:e2e` กับ preview จาก TC-TILE-01 โดยชี้ `VITE_TILES_URL` ไป fixture นี้ | e2e ผ่านโดยไม่มี request ออกนอกเครื่อง (ยืนยันซ้ำ TL-S11) |
| TC-TILE-03 | T08 publish แล้ว (preview URL จริงบน Cloudflare Pages) — case นี้ **ทำไม่ได้จนกว่า infra พร้อม** ระบุสถานะ `PENDING-INFRA` ไม่ใช่ `FAIL` จนกว่าจะถึงเวลานั้น | รันคำสั่ง curl ตามหัวข้อ 7.2 ของ tech note ต่อไฟล์ตัวอย่างจริงที่ publish แล้ว | XYZ: `200`, `content-type: application/x-protobuf`, มี `access-control-allow-origin`, `timing-allow-origin`, และเมื่อขอ `Accept-Encoding: gzip, br` ต้องเห็น `content-encoding` · ถ้าใช้ทางสำรอง PMTiles/GitHub Pages: `206` + `content-range` |
| TC-TILE-04 | เหมือนบน (`PENDING-INFRA` จนกว่าจะ publish) | curl ขอ `z/x/y` ที่ไม่มีในชุด | ต้องได้ `404` จริง ไม่ใช่ `200` พร้อมเนื้อหา `index.html` (F5 — ตรวจว่ามี `404.html` ที่รากของ project แผนที่) |

### 4.5 `TC-CI-*` — pipeline ที่รันได้ในเครื่อง (เหมือน workflow เรียก)

| id | precondition | steps | expected |
| --- | --- | --- | --- |
| TC-CI-01 | ADR 0001, T07 DONE | รัน `pnpm check` (lint + typecheck + test + build ต่อกัน) จาก root | exit 0 ทุกขั้น บันทึก output ทุกบรรทัดสุดท้ายของแต่ละขั้น |
| TC-CI-02 | เหมือนบน | รัน `pnpm test:e2e` (ทั้งสอง project) | ทั้งสอง project ผ่าน, จำนวน test ที่รันตรงกับจำนวน spec ที่มี ณ ตอนนั้น (ไม่ใช่ `--pass-with-no-tests` อีกต่อไปเมื่อ T13 เพิ่ม spec) |
| TC-CI-03 | `.github/workflows/ci.yml`, `.gitleaks.toml` (T07 DONE) | รัน gitleaks และ script guard ไฟล์ต้องห้ามด้วยคำสั่งเดียวกับที่ workflow เรียก (ไม่เปิด GitHub UI) | ไม่พบ secret, ไม่พบไฟล์ต้องห้าม (raw trace, `.env.local` ที่มีค่า) ใน working tree ปัจจุบัน |
| TC-CI-04 | repo ทั้งหมด | `git check-ignore -v` ต่อ path ที่ ADR 0001 ระบุว่าต้อง ignore (`qa/playtest/results/raw/`, `data/gps-traces/raw/`, `.env.local`, `.wrangler/`, ฯลฯ) | ทุก path แสดงว่าถูก ignore จริง (ยืนยันซ้ำผลของ T01 ก่อนใช้งานต่อในโฟลว์ QA) |

### 4.6 `TC-PRIVACY-*` และ `TC-COPY-*` — ตามหน้าที่ประจำของ qa-tester (CLAUDE.md)

| id | steps | expected |
| --- | --- | --- |
| TC-PRIVACY-01 | grep coordinate-like number pair ใน log ระดับ production ของ client (ไม่ใช่ debug HUD หลัง flag) | ไม่พบ (ครอบคลุมโดย TC-HUD-12 ด้วย) |
| TC-PRIVACY-02 | ตรวจพิกัดของทุกไฟล์ trace ที่ commit ได้ (`synthetic`, `qa`, `recorded`) เทียบ bbox กรุงเทพฯ+5 จังหวัด และไม่ใช่พิกัดบ้าน/ที่ทำงานของบุคคลจริง (D-002) | อยู่ในพื้นที่สาธารณะตาม README ของ `data/gps-traces/`, ไม่มี `meta` ที่ระบุตัวตน (schema ปฏิเสธ unknown key อยู่แล้ว — ตรวจซ้ำว่า `description` ไม่เขียนชื่อคนหรือบ้านเลขที่) |
| TC-COPY-01 | grep `apps/client/src/**` หา string literal ภาษาไทย (unicode range U+0E00–0E7F) นอกไฟล์ copy/config | ไม่พบ (client ต้องใช้ copy key เช่น `client.mapSpike.tilesUrlMissing`, `gps.*` ไม่ใช่ข้อความไทยฝังในโค้ด — ตรง CLAUDE.md "no hardcoded Thai strings in code") — **หมายเหตุ:** ก่อน P1-F03-T05/T10 เสร็จ UI อาจยังโชว์ copy key ดิบ (เช่น e2e ปัจจุบันคาดหวังข้อความ `client.mapSpike.tilesUrlMissing` ตรง ๆ) ซึ่งถูกต้องตาม design ชั่วคราว ไม่ใช่ bug |
| TC-COPY-02 | เมื่อ `config/content/copy.th.json` (T03/T05) พร้อมและ client อ่านจริง | สุ่มตรวจ copy 10 รายการที่เกี่ยวกับ GPS/แผนที่ (`gps.*`, `map.loading`, `run.stateGrace`, `run.stateSuspended`) กับกฎ 6 ข้อของ `design/narrative/style-guide.md` | ผ่านทุกข้อ — ถ้าไม่พร้อมในรอบนี้ให้ระบุ `PENDING` พร้อม task ที่ต้องรอ (T05/T10) ไม่ใช่ `FAIL` |

## 5. `FIELD-*` — case ที่ต้องใช้คนเดินจริง (โยงไป P1-F02-T20)

qa-tester **ไม่ตั้งเกณฑ์เอง**: เกณฑ์ Go / Go พร้อมเงื่อนไข / No-go ของแต่ละแถวคือของ tech note หัวข้อ 10.1 ทุกประการ ตามที่ P1-F02-T27 ยืนยัน (TL-M04, PM-M01) — ตารางนี้แค่ผูก case กับหน้าที่ของ P1-F02-T14 (สร้าง kit/form) และ P1-F02-T20 (คนเดินจริง)

| id | ที่มา | สภาพที่ต้องเตรียม (สรุปจากหัวข้อ 10.4) | เครื่อง |
| --- | --- | --- | --- |
| FIELD-S1, FIELD-S2 | S1, S2 | segment `screen_on` ≥ 20 นาที ต่อเนื่อง, pan/zoom ตามสคริปต์ ≥ 60 วินาที | Android Chrome และ iOS Safari แยกกัน |
| FIELD-S3 | S3 | แบตชาร์จเต็ม, ปิด battery saver/Low Power Mode, จอเปิดตลอด segment | ทั้งสอง — iOS จดจากเครื่อง |
| FIELD-S4 | S4 | cache ว่าง (ล้างข้อมูลเว็บไซต์ก่อน), เน็ตมือถือ (ไม่ใช้ Wi-Fi) | ทั้งสอง |
| FIELD-S5–S8 | S5–S8 | เหมือน S4 | ทั้งสอง |
| FIELD-S9, FIELD-S11 | S9, S11 | เดินในสวน, ตัด warm-up 60 วินาทีแรกออกจากการตีความ | ทั้งสอง |
| FIELD-S10 | S10 | เดินในซอย | ทั้งสอง |
| FIELD-S12 | S12 | เดินต่อเนื่องในสวน ไม่หยุดเกิน 1 นาที | ทั้งสอง |
| FIELD-S13, FIELD-S14, FIELD-S15 | S13–S15 | segment เดียวกับ S1/S2 | ทั้งสอง |
| FIELD-S16 | S16 | screenshot ป้ายไทยที่ zoom 14/16/18 ทั้งสวนและซอย | ทั้งสอง |
| FIELD-S17 | S17 | อ่านจอกลางแดดจริง เที่ยงถึงบ่าย | ทั้งสอง |
| FIELD-I1 | I1 | segment `stationary` 5 นาที มือถือในมือ (ม้านั่ง) — **เสนอเพิ่มใน kit ของ T14:** อีก 5 นาทีวางมือถือนิ่งบนโต๊ะ/พื้นราบ (segment ใหม่ `table`) เพื่อให้มีทั้งคู่เทียบกับ TC-HUD-01a/01b ไม่ใช่แค่กรณีม้านั่งอย่างเดียว | ทั้งสอง |
| FIELD-I2 | I2 | เก็บมือถือในกระเป๋ากางเกง/เป้ระหว่างเดินส่วนหนึ่งของ segment | ทั้งสอง |

## 6. Trace ที่ต้องขอ/สร้างเพิ่ม (handoff ให้ P1-F02-T04 และ T13)

ตาราง 4.3 อ้าง trace ที่ยังไม่มีในบอร์ด ณ วันที่เขียนแผนนี้ (T04 ยัง TODO) — รายการต่อไปนี้ส่งเป็น handoff:

| trace ที่ต้องมี | `meta.kind` | เจ้าของ | เหตุผล |
| --- | --- | --- | --- |
| `synthetic-table-still-01` | `synthetic` | location-engineer (T04) | TC-HUD-01a — ต้องมี jitter ต่ำมาก (< 1 ม.) ตลอด ≥ 10 นาที |
| `synthetic-bench-jitter-01` | `synthetic` | location-engineer (T04) | TC-HUD-01b — jitter ระดับที่ GDD อธิบายว่า "มีพอ" ให้ผ่าน gate ได้บางส่วน |
| `synthetic-boundary-50m-01` | `synthetic` | location-engineer (T04) | TC-HUD-01c —ออกแบบให้ระยะสะสมต่อหน้าต่างแตะ 50.0 ม. พอดีในหน้าต่างหนึ่ง และ 50.01+ ม. ในอีกหน้าต่าง (คำนวณ haversine ไว้ล่วงหน้าเป็นเอกสารประกอบ) |
| `qa-gps-jump-01` | `qa` | qa-tester (T13, ตาม acceptance บอร์ด) | GPS กระโดดกลางทาง — ใช้พิสูจน์ว่า provider/HUD ไม่ crash และระยะสะสมไม่ถูกนับเกินจริงจากจุดกระโดด |
| `qa-gps-gap-2min` | `qa` | qa-tester (T13, ตาม acceptance บอร์ด) | TC-HUD-02, TC-LOC-04 variant — sample ขาดช่วง 2 นาที |

หมายเหตุ: T13 (build black-box test + QA trace) ต้อง**สร้างตามตารางนี้เป็นอย่างน้อย** สองไฟล์ `qa-*` ตามที่บอร์ดกำหนดไว้แล้วคือ `qa-gps-jump-01` และ `qa-gps-gap-2min` ส่วน `synthetic-*` สามไฟล์เป็น handoff ไปยัง location-engineer — ถ้า T04 ปิดงานไปแล้วโดยไม่มีสามไฟล์นี้ ให้ qa-tester สร้างเป็น `qa` kind แทนได้ (กฎพิกัดเดียวกัน) เพื่อไม่ block T13

## 7. Inventory: GPS edge case ตามมาตรฐานของ qa-tester (CLAUDE.md) → สถานะใน F02

รายการนี้คือ checklist ทั่วไปที่ qa-tester ต้องดูแลตลอดโครงการ — ระบุไว้ที่นี่เพื่อไม่ให้หายไปเงียบ ๆ พร้อมเหตุผลว่าอันไหนอยู่ใน scope ของ F02 และอันไหนต้องรอ feature ที่ยังไม่สร้าง

| edge case | อยู่ใน F02 ไหม | เหตุผล / ไปที่ไหนต่อ |
| --- | --- | --- |
| phone นิ่งให้ 0 tick, ม้านั่ง jitter ให้ tick, ขอบ 50 ม. พอดี | **ใช่** | TC-HUD-01a/b/c (สูตรของ HUD) + FIELD-I1 (ค่าจริง) — แต่ "tick" ที่แท้จริง (reward) ยังไม่มีจน Phase 3 นี่คือแค่ตัวเลขวัด |
| gate เดียวกันใช้ทั้งใน dungeon และ raid | **บางส่วน** | สูตรพิสูจน์แล้วไม่มี branch แยก (TC-HUD-01d) แต่ raid ยังไม่มีระบบให้ทดสอบจริง → พิสูจน์ซ้ำเต็มรูปใน test plan ของ F ที่มี raid (Phase 2/3) |
| edge walking พร้อม drift (เข้า-ออกขอบ polygon) | **ไม่** | ไม่มี dungeon polygon/run state ใน F02 (tech note หัวข้อ 1) — deferred ไปยัง test plan ของ feature ที่สร้าง run state (`design/ux/flows/F03-core-loop.md` หัวข้อ 4.1 เป็นแค่ทิศทาง ยังไม่ implement) |
| Grace ที่ 2:59/3:01, Suspended ที่ 14:59/15:01, dungeon ปิดกลาง run, ปิดฉุกเฉิน | **ไม่** | เช่นเดียวกับข้างบน — ค่า config (`graceMax_s=180`, `suspendedMax_s=900`) มีอยู่แล้วใน `config/balance/dungeons.json` แต่ยังไม่มีโค้ด run state ให้ทดสอบ |
| polygon ซ้อนกัน | **ไม่** | ไม่มี dungeon polygon ใน F02 |
| network loss ระหว่างเดิน (รางวัลตามหลักฐานที่พิสูจน์ได้เท่านั้น), offline evidence 29 กับ 31 นาที | **บางส่วน** | network loss **ระหว่างโหลด tile** อยู่ใน scope (TC-MAP-05, F9) แต่ "รางวัลเฉพาะนาทีที่พิสูจน์ได้" และหน้าต่าง `maxOfflineEvidenceAge_s = 1800` (30 นาที) ต้องมี server ตรวจย้อนหลัง (Phase 3) → deferred |
| แอปถูกปิดแล้ว resume | **บางส่วน** | `visibilitychange` (ซ่อน/เปลี่ยนแท็บ/ล็อกจอ) อยู่ใน scope (TC-LOC-04) เพราะเป็นพฤติกรรมของ `LocationProvider` เอง แต่การ resume เข้า `S-03-run` ที่ HP/สถานะล่าสุดจาก server (design/ux F03-core-loop หัวข้อ 8) ต้องมี backend → deferred |
| accuracy ต่ำตอน check-in | **บางส่วน** | ค่า accuracy ที่ HUD วัดได้ (S9–S11) อยู่ใน scope แต่ "check-in" (เข้า dungeon จริง, `checkIn.maxAccuracy_m`) ยังไม่มีหน้าจอ/ระบบให้ทดสอบ |
| teleport เข้ากลาง polygon | **ไม่** | ต้องมี server ตรวจ 60 วินาทีเดินเข้าจริง (`anticheat.json#checkIn`) — Phase 3 |
| ขับรถ (speed lock 25 กม./ชม.) | **ไม่** | ต้องมี server/gameplay logic บังคับ lock — Phase 3 · trace-replay ทำได้แค่ "ป้อน trace ความเร็วสูงแล้วดูว่า HUD ไม่ error" ซึ่งไม่ใช่การพิสูจน์ speed lock จริง จึงไม่นับเป็น case ของ feature นี้ |
| multi-device correlation | **ไม่** | ต้องมีหลายบัญชี + server anti-cheat ชั้น 4 — ไกลเกิน scope Phase 1 ทั้งหมด |
| ทดสอบ tamper (payload ที่แก้แล้ว, batch ซ้ำ, นาฬิกาเพี้ยน) ต่อ server authority | **ไม่** | ไม่มี server ใน Phase 1 (tech note หัวข้อ 1: "ไม่อยู่ในขอบเขต ... backend") — deferred ทั้งหมดไปยัง test plan ของ feature ที่มี server (Phase 3) |
| test vector สูตรทั้งหมดใน `design/systems/test-vectors/` | **ไม่ใช่ของ F02** | เป็นของ QA gate F03 (P1-F03-T23) เพราะ F02 ไม่มีสูตร balance/damage — F02 มีแค่สูตร HUD (S1–S17) ที่ครอบในหัวข้อ 4.3 ของไฟล์นี้ |

## 8. Assumptions และของที่ยังเปิด

- [ASSUMPTION A-P1-F02-T12-1: `config/app/privacy.json` (`rawTraceTrim_m`) และ `config/balance/location.json#minAccuracy_m` ยังไม่มีไฟล์จริง (P1-H05, P1-H03 ยัง TODO) — TC-HUD-11 และ TC-MAP-04 (`gps.lowAccuracy`) อ้างค่าเหล่านี้แบบ key เดียวกับที่ tech note ระบุไว้ล่วงหน้า ถ้าค่าจริงต่างไป T13 ต้องอัปเดต test ตาม ไม่ใช่ผูกตัวเลขไว้ในโค้ด test — เจ้าของยืนยัน: tech-lead/systems-designer]
- [ASSUMPTION A-P1-F02-T12-2: `data/gps-traces/synthetic/` ยังว่าง (T04 TODO) ณ เวลาที่เขียนแผนนี้ — case ในหัวข้อ 4.1/4.3 ที่อ้าง synthetic trace เฉพาะชื่อจะรันไม่ได้จนกว่า T04/T13 เสร็จ ระบุสถานะ `PENDING` ไม่ใช่ `FAIL` ใน QA gate ก่อนถึงตอนนั้น]
- [ASSUMPTION A-P1-F02-T12-3: `window.__kwSpike` (hook สำหรับ e2e ตาม tech note หัวข้อ 13) ยังไม่ implement (T10/T11 TODO) — TC-MAP-02/03/04/12 รอ hook นี้จริงตามชื่อที่ tech note กำหนด ถ้า gameplay-programmer เปลี่ยนชื่อ ให้ handoff กลับมาที่ qa-tester แทนเปลี่ยนชื่อใน test เงียบ ๆ]
- case ที่มีสถานะ `PENDING-INFRA` (TC-TILE-03/04) หรือ `PENDING` (ตาม assumption ข้างต้น) **ไม่นับเป็น FAIL** ใน QA gate F02 (T16) แต่ต้องมีผลจริงก่อนที่ P1-F02-T21 จะสรุป Go/No-go เพราะ S16 และ CORS/206 ของ tile จริงมีผลต่อ S1–S17

## 9. เกณฑ์ bug และ exit ของ QA gate F02

- Bug ที่พบระหว่างรัน case ในไฟล์นี้บันทึกที่ `qa/bugs.md` ตามฟอร์แมต id/severity/feature/steps/expected/actual/owner/status (โครงสร้างมาตรฐานของ qa-tester)
- Severity **high ขึ้นไป** บล็อก verdict `PASS` ของ QA gate F02 (P1-F02-T16) เสมอ ตัวอย่าง high ที่คาดว่าจะเจอบ่อยในหมวดนี้: พิกัดหลุดเข้า log/CSV/console (privacy), `validateTrace` ปฏิเสธไฟล์ trace ที่ commit ไว้แล้ว, gate formula ให้ผลผิดจากสูตร (S12), raw trace อัปโหลดออกนอกเครื่องโดยไม่ได้กดยินยอม
- Severity ต่ำกว่า high (เช่น ป้ายไทยเพี้ยน 1–2 ป้ายที่ยังอ่านออก ตาม S16 "Go พร้อมเงื่อนไข") บันทึกไว้เป็นเงื่อนไขที่ P1-F02-T21/T23 (HUMAN) ต้องเห็นก่อนตัดสิน ไม่บล็อก PASS ของ QA gate เอง
- P1-F02-T16 (QA gate) และ P1-CLOSE-QA (regression ปิด phase) อ้างไฟล์นี้เป็นแหล่งความจริงเดียวของ case/traceability — ห้ามเพิ่ม case ใหม่นอกไฟล์นี้ตอนรัน gate โดยไม่อัปเดตที่นี่ก่อน
