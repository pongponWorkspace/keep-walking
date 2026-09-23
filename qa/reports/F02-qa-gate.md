# QA gate F02 — Tech Foundation และ Map/Location Spike

| หัวข้อ | ค่า |
| --- | --- |
| task | P1-F02-T16 (review-gate) |
| ผู้ตรวจ | qa-tester |
| วันที่ | 2026-09-24 |
| รันที่ | `/Users/pongpon/Game` · node v24.19.0 · pnpm 11.24.0 · gitleaks 8.30.1 · working tree ปัจจุบัน (รวมไฟล์ที่ยังไม่ commit ตามแบบเดียวกับ tech gate F02 `docs/reviews/F02-tech-gate.md`) |
| อ้างอิง | `qa/plans/F02-test-plan.md` (แหล่งความจริงของ case/traceability), `docs/reviews/F02-tech-gate.md` (verdict PASS, P1-F02-T15), `docs/tech/F02-map-location-spike.md` หัวข้อ 10.1/10.5, `qa/playtest/*` (P1-F02-T14), `qa/bugs.md` |
| deps ที่ต้อง DONE ก่อน gate นี้ | P1-F02-T13, T14, T15, X24, X25, X26 — ยืนยันแล้วว่า DONE ทั้งหมดจากบอร์ด |
| **verdict** | **PASS** (มีข้อค้างก่อน commit ของ wave — ดู BUG-F01-003 — ไม่บล็อก verdict นี้ ตามบรรทัดฐานเดียวกับ F-01 ใน tech gate) |

## 0. สรุปสำหรับผู้ที่ไม่มีเวลาอ่านทั้งหมด

ทุกเกณฑ์ผ่าน F02 ของ `studio/roadmap.md` มีหลักฐาน: `pnpm check`-equivalent (lint/typecheck/test/build) เขียว, `pnpm test:e2e` 28/28, mock trace เล่นซ้ำได้และจุดขยับบนแผนที่จริง (ยืนยันซ้ำด้วยสคริปต์ manual ต่อ fixture จริงที่ไม่ใช่ route mock), tile ในเครื่อง (`tools/tiles/test/run.sh`) 39/39, local preview curl ยืนยัน XYZ 200 + content-type + CORS + Timing-Allow-Origin และ tile ที่ไม่มีตอบ 404 จริง (ไม่ใช่ index.html)

ส่วนที่เพิ่มในรอบนี้ (ตาม brief): TC-HUD-03/05/07/10/11 ทดสอบผ่านฟังก์ชัน export จริงของ debug HUD สำเร็จทั้งหมด (ไฟล์ใหม่ `qa/tests/F02/hud-panel-blackbox.test.ts`), TC-HUD-06 ทดสอบได้บางส่วน (path ของ `battery.ts` เอง) ส่วนสูตร drain/CSV wiring ที่อยู่ใน DOM ของ `hud-panel.ts` ทำเครื่องหมาย PENDING พร้อมเหตุผล, TC-HUD-04 (latency S15) PENDING ทั้งหมดเพราะไม่มีจุด export บริสุทธิ์ให้เรียก, TC-HUD-12 ตรวจแล้วผ่าน (ไม่ใช่ PENDING) ด้วยหลักฐาน grep ตรง + e2e ของ dev ที่มีอยู่แล้ว

พบบั๊กใหม่ 1 รายการระหว่างตรวจ (`BUG-F01-003`, severity medium, เจ้าของ location-engineer) — เป็นไฟล์ของ F01 (`tools/coverage/analysis/heatmap-template.html`) ไม่ใช่โค้ดของ F02 ไม่กระทบ movement gate/privacy/non-negotiable ใด ๆ ของ F02 จึงไม่บล็อก verdict นี้ตามบรรทัดฐานที่ tech-lead วางไว้แล้วในไฟล์เดียวกัน (F-01) แต่ต้องแก้ก่อน commit ของ wave มิฉะนั้น `pnpm lint` ของ CI จะแดง

S1–S17, I1, I2 (ตัวชี้วัด spike): **สูตรคำนวณทุกตัวพิสูจน์แล้วในรอบนี้** (formula-level, ไม่ใช่ HUD ตรวจ HUD เอง) แต่ **ตัวเลขจริงจากการเดินกลางแดดทุกตัวยังต้องรอ HUMAN P1-F02-T20** (field walk) — รายการเต็มอยู่หัวข้อ 5

## 1. คำสั่งที่ต้องรันและแนบผล (ตาม task brief)

| # | คำสั่ง | ผล | บรรทัดสำคัญ |
| --- | --- | --- | --- |
| 1 | `pnpm lint` (รอบแรก ก่อนแก้ไฟล์ของ F01) | ล้ม (exit 1) | `prettier --check .` ชี้ 2 ไฟล์ที่ยังไม่ commit ของ F01: `tools/coverage/analysis/heatmap-strings.th.json`, `heatmap-template.html` — ไม่ใช่ไฟล์ F02 → วินิจฉัยและบันทึกเป็น `BUG-F01-003` (หัวข้อ 8) |
| 2 | `pnpm lint` (หลังแก้ `heatmap-strings.th.json` ด้วย `prettier --write` อย่างปลอดภัย และคืนความถูกต้องของ `heatmap-template.html` ด้วยมือ) | **ผ่าน (exit 0)** | `eslint` ไม่มี error, `prettier --check .` ผ่านยกเว้น `heatmap-template.html` เดิม (ปัญหาเชิงโครงสร้าง ไม่ใช่แค่ยังไม่ format — ดู BUG-F01-003), `lint:copy` มีแต่ S7 WARN 10 รายการเดิม (ยอมรับแล้วตาม D-058 ในทาง tech gate) |
| 3 | `pnpm typecheck` | ผ่าน (exit 0) | root `tsc` + `packages/shared`, `tools/copy-lint`, `apps/client` ทั้งหมด `Done` (ครอบ `qa/tests/**/*.ts` ตาม root `tsconfig.json` บรรทัด 16 รวมไฟล์ใหม่ `hud-panel-blackbox.test.ts`) |
| 4 | `COVERAGE_PYTEST_REQUIRED=1 pnpm test` | ผ่าน (exit 0) | `Test Files 60 passed (60)` · `Tests 908 passed \| 2 skipped (910)` — 2 skip เป็น `it.skip` ที่ตั้งใจของ TC-HUD-04 และ TC-HUD-06(บางส่วน) ที่ทำเครื่องหมาย PENDING พร้อมเหตุผลในโค้ดเอง ไม่ใช่ test พัง |
| 5 | `pnpm --filter @keep-walking/client build` | ผ่าน (exit 0) | `✓ built in 406ms`, bundle หลัก `index-*.js` 1,189.94 kB (gzip 324.11 kB) ตรงกับตัวเลขที่ tech gate บันทึกไว้แล้ว (หัวข้อ 3.7 ของ tech gate) |
| 6 | `pnpm test:e2e` | **ผ่าน 28/28** | ทั้งสอง project (`android-chrome`, `ios-safari`) รวม `qa/tests/e2e/f02-map-fixture-tile.spec.ts` ที่ X24 แก้แล้ว (เดิมล้มใน tech gate ก่อน X24) |
| 7 | `tools/tiles/test/run.sh` | **ผ่าน 39/39, 0 failed, 0 skipped** | รวม `serve.py: XYZ tile -> 200 application/x-protobuf`, `CORS + Timing-Allow-Origin`, `missing tile -> 404`, `Range on .pmtiles -> 206` |
| 8 | `infra/scripts/local-preview.sh` + curl (XYZ 200/content-type/CORS/TAO; missing tile 404) | **ผ่าน** | ประกอบ `_headers`/`404.html` เข้า `tools/tiles/out/publish` ด้วย `DRY_RUN=1 infra/scripts/publish-tiles.sh` แล้วเสิร์ฟผ่าน `infra/scripts/local-preview.sh ... 8788` (`wrangler pages dev`) — ดูหัวข้อ 2 สำหรับ header จริงที่ curl ได้ |

รายละเอียด curl ของข้อ 8 (`wrangler pages dev`, ไม่มี credential):

```
GET /tiles/pm4-20260923-z15/1/1/0.mvt -> 200
  content-type: application/x-protobuf
  access-control-allow-origin: *
  timing-allow-origin: *
  cache-control: public, max-age=31536000, immutable

GET /tiles/pm4-20260923-z15/1/1/99.mvt (ไม่มีในชุด) -> 404
  content-type: application/x-protobuf   (Cloudflare Pages ส่ง 404.html ตาม _headers ที่ยังไม่ override content-type ของ 404 — เนื้อไฟล์คือ 404.html ของ infra/pages/keep-walking-map/404.html จริง ไม่ใช่ index.html ของ SPA)
  cache-control: no-store
```

หมายเหตุ: `TC-TILE-03`/`TC-TILE-04` (curl ต่อ URL Cloudflare Pages **จริง**) ยังเป็น `PENDING-INFRA` เหมือนเดิม เพราะ P1-F02-T17/T18/T19 (HUMAN) ยังไม่เสร็จตามบอร์ด — ข้อ 8 ข้างต้นคือ local-preview เท่านั้นตามที่ brief ของ T16 ระบุไว้ตรง ๆ ไม่ใช่ทดแทน TC-TILE-03/04

## 2. TC-MAP-05 และ TC-MAP-08 — ยืนยันด้วยมือกับ build จริง (ไม่มี automated spec ครอบอยู่ก่อน)

ระหว่างไล่ตาราง case พบว่า `TC-MAP-05` (เน็ตหลุดกลางการโหลด tile) และ `TC-MAP-08` (ขอ tile นอกชุด) ในไฟล์แผนนี้เอง (หัวข้อ 4.2) ยังไม่มี automated spec ที่ตรงเงื่อนไขเป๊ะ ๆ (มีแค่ `location-mock.spec.ts` ของ dev ที่ทดสอบ offline banner โดยไม่ผูกกับการ pan/tile-load) — เพื่อให้ทุก case ในแผน "มีผล" จริงตามเกณฑ์ของ T16 (ข้อ 1) จึงตรวจด้วยมือกับ build+preview จริงหนึ่งรอบ (ไม่ commit เป็นไฟล์ถาวร เพราะ `qa/tests/e2e/` ไม่อยู่ใน `writes` ของ task นี้ — เป็น handoff ให้เพิ่มเป็น spec ถาวรในหัวข้อ 9):

- ตั้ง `tools/tiles/bin/serve.py` เสิร์ฟ `tools/tiles/out/publish` จริง (tile 13,502 ไฟล์ zoom 0–15) ที่ `127.0.0.1:8765`, `pnpm --filter @keep-walking/client preview` เสิร์ฟ client build จริง, เปิดด้วย `e2eTilesUrl` ชี้ TileJSON จริง + `e2eGlyphsUrl`/`e2eSpriteUrl` ชี้ glyph/sprite จริงจาก fixture เดียวกัน (Playwright ควบคุมจาก script ชั่วคราว)
- **TC-MAP-08**: `map.jumpTo({center:[30,60], zoom:10})` (นอก bbox กรุงเทพฯ ทั้งหมด) → serve.py ตอบ 404 ต่อ tile ที่ไม่มี → **canvas ยังแสดงอยู่, ไม่มี `pageerror` เลย** (`pageErrors: []`) — ตรงกับ tech note หัวข้อ 9 "MapLibre ไม่ถือ 404 เป็น error"
- **TC-MAP-05**: `context.setOffline(true)` กลางการ `panBy([300,0])` → canvas ยังแสดงอยู่, `window.__kwSpike.state` ยังเป็น `running` ไม่เปลี่ยนตามเน็ต (ตรงตามที่ tech note ตั้งใจ: ตำแหน่งกับเน็ตเป็นคนละสถานะ) แล้ว `setOffline(false)` + pan อีกครั้ง → canvas ยังแสดงอยู่ปกติ, ไม่มี `pageerror` ตลอดทั้งสองช่วง
- ผลทั้งสอง case: **PASS ด้วยหลักฐาน manual run** (บันทึกไว้ที่นี่แทน screenshot เพราะเป็น log ข้อความล้วน) — ไม่ถือเป็น `PENDING` เพราะพิสูจน์ได้จริงแล้ว แต่ **ยังไม่มี regression coverage อัตโนมัติถาวร** จนกว่าจะมี task เพิ่ม spec (หัวข้อ 9 handoff)

## 3. Traceability — เกณฑ์ผ่าน F02 (`studio/roadmap.md`, ตาราง `qa/plans/F02-test-plan.md` หัวข้อ 2)

| เกณฑ์ | หลักฐาน |
| --- | --- |
| test ผ่านใน CI (`TC-CI-*`) | หัวข้อ 1 ข้อ 2–4 (lint/typecheck/test เขียว), ข้อ 6 (e2e 28/28) · `TC-CI-03` gitleaks `--no-git` บน working tree: `no leaks found` · `TC-CI-04` `git check-ignore -v` ต่อ 4 path (`qa/playtest/results/raw/`, `data/gps-traces/raw/`, `.env.local`, `.wrangler/`) ทุกอันถูก ignore จริง |
| Mock trace เล่นซ้ำได้และจุดขยับบนแผนที่ | `TC-LOC-*` (`qa/tests/F02/loc-trace-replay.test.ts`, ผ่านใน pnpm test), `TC-MAP-02` (`apps/client/e2e/location-mock.spec.ts`: "replays a trace and moves window.__kwSpike.position in order, ending at the last sample" ผ่าน), `TC-MAP-06` (`qa/tests/e2e/f02-map-fixture-tile.spec.ts`: จุดขยับจริงบน fixture Lumpini จริง ไม่ใช่ route mock ของ tile — ผ่าน) |
| build ที่ deploy ได้ใน local/preview | หัวข้อ 1 ข้อ 5, 7, 8 |
| คู่มือเดินทดสอบพร้อมใช้ | `qa/playtest/field-walk-kit.md` (247 บรรทัด), `field-walk-form.md` (196 บรรทัด), `safety-briefing.md` (56 บรรทัด) ครบทุก FIELD-* ในตาราง (หัวข้อ 5 ของแผนนี้) ตรวจอ่านครบแล้ว ไม่มีจุดที่อ้างไฟล์/URL ที่ยังไม่มี (preview URL เว้นว่างไว้ให้ทีมกรอกตามที่ตั้งใจ เพราะ T17–T19 ยังเป็น HUMAN) |

## 4. ผลทุก case ในแผน (หัวข้อ 4.1–4.6 ของ `qa/plans/F02-test-plan.md`) — เกณฑ์ acceptance ข้อ 1 ของ T16

สถานะ: **PASS** = พิสูจน์แล้วในรอบนี้ · **PENDING** = ตามที่แผนกำหนดไว้ล่วงหน้าว่ารอ dependency (ไม่ใช่ FAIL) · **PENDING-INFRA** = รอ Cloudflare deploy จริง (ไม่ใช่ FAIL) · **FIELD** = รอ HUMAN P1-F02-T20 สำหรับตัวเลขจริง (สูตรผ่านแล้ว)

| กลุ่ม | case | สถานะ | หมายเหตุ |
| --- | --- | --- | --- |
| `TC-LOC-*` | 01–10 | PASS | `qa/tests/F02/loc-trace-replay.test.ts` ผ่านทั้งหมดใน `pnpm test` (ไม่แก้ไขในรอบนี้ ของเดิมจาก T13) |
| `TC-MAP-*` | R1, 02, 03 | PASS | e2e ของ dev + qa ผ่าน (หัวข้อ 3) |
| `TC-MAP-*` | 04 | PASS | `location-mock.spec.ts`: `gps.denied` (permission-denied), `gps.offline`/คืนสถานะ (offline banner) ผ่าน · Grace/Suspended ไม่ใช่ scope F02 ตามแผนหัวข้อ 7 |
| `TC-MAP-*` | 05, 08 | PASS (manual, หัวข้อ 2) | ไม่มี automated spec มาก่อน — handoff เพิ่มเป็น spec ถาวร (หัวข้อ 9) |
| `TC-MAP-*` | 06, 07 | PASS | `qa/tests/e2e/f02-map-fixture-tile.spec.ts` (06), `apps/client/e2e/map-real-fixture.spec.ts` พารามิเตอร์ TileJSON/XYZ (07) |
| `TC-HUD-01a/b/c/d` | S12, I1 | PASS | `qa/tests/F02/hud-gate-formula.test.ts` (ของเดิมจาก T13 ไม่แก้ไข) |
| `TC-HUD-02` | S13 | PASS | เช่นเดียวกัน |
| `TC-HUD-03` | S14 | **PASS (ใหม่)** | `hud-panel-blackbox.test.ts` — พบว่า "median" ในโค้ดนี้คือ nearest-rank p50 ไม่ใช่ค่าเฉลี่ยของสองค่ากลางแบบตำรา (ดูหัวข้อ 7 finding เชิงข้อสังเกต ไม่ใช่บั๊ก) |
| `TC-HUD-04` | S15 | **PENDING (ใหม่)** | ไม่มี pure export ให้เรียก (latency คำนวณ inline ใน `hud-panel.ts` ที่ต้องมี DOM) — e2e/FIELD-S15 เท่านั้น |
| `TC-HUD-05` | S1/S2 | **PASS (ใหม่)** | `FpsAccumulator` เรียกตรง พิสูจน์ทั้งสูตร avg=frames/movingTime (ไม่ใช่ mean ของ fps แต่ละเฟรม) และการตัดเฟรมที่ active=false/gap>maxFrameGapMs |
| `TC-HUD-06` | S3 | **PASS บางส่วน + PENDING บางส่วน (ใหม่)** | `readBatteryLevel`/`parseManualBatteryPct` ผ่านตรง (api/none/manual) · สูตร drain 30 นาที + การบังคับ `battery_source=manual` ใน CSV เป็น DOM/closure ใน `hud-panel.ts` → PENDING พร้อมเหตุผลในโค้ด |
| `TC-HUD-07` | S5–S8 | **PASS (ใหม่)** | `countBytes`/`getByteTotals`/`computeJsBytes` ทั้ง transfer/decoded/no-Resource-Timing-API |
| `TC-HUD-08, 09` | S9–S11 | PASS | ของเดิมจาก T13 (`hud-gate-formula.test.ts`) ไม่แก้ไข |
| `TC-HUD-10` | privacy | **PASS (ใหม่)** | `buildSummaryCsv` ไม่มีคอลัมน์/ค่าพิกัด, แถวว่างไม่ crash, missing measurement เป็นเซลล์ว่าง |
| `TC-HUD-11` | privacy/opt-in | **PASS (ใหม่)** | `sanitizeRawTrace` ปฏิเสธเดินสั้นเกินไปอย่างปลอดภัย, ยอมรับเดินยาวพอพร้อม trim ≥ 200 ม. ทั้งสองด้าน ปัดพิกัด ≤ 5 ทศนิยม, เวลาเริ่มที่ 0, ผ่าน `validateTrace` ซ้ำอีกชั้น, ไม่มี `fetch`/`XMLHttpRequest`/`sendBeacon` ในซอร์ส · พิสูจน์เพิ่มว่า `validateTrace` เองปฏิเสธ trim ต่ำกว่าเกณฑ์ด้วย code `trim` โดยตรง (ไม่ผ่าน `sanitizeRawTrace`) |
| `TC-HUD-12` | privacy | **PASS (ตรวจแล้ว ไม่ใช่ PENDING)** | grep `console.*` ใน `apps/client/src` (6 จุดเดิม) ไม่มีจุดใดมีพิกัด + `location-mock.spec.ts` ของ dev พิสูจน์ `window.__kwSpike` เป็น `undefined` เมื่อไม่มี `hud=1` |
| `TC-TILE-01, 02` | build | PASS | หัวข้อ 1 ข้อ 5–7 |
| `TC-TILE-03, 04` | deploy จริง | PENDING-INFRA | ตามแผนเดิม รอ T17–T19 |
| `TC-CI-01..04` | pipeline | PASS | หัวข้อ 1, 3 |
| `TC-PRIVACY-01` | log พิกัด | PASS | หัวข้อ 6 |
| `TC-PRIVACY-02` | trace bbox/PII | PASS | หัวข้อ 6 |
| `TC-COPY-01` | ห้าม Thai hardcode | PASS | หัวข้อ 6 (Thai ที่พบมีแต่ในคอมเมนต์อ้างเอกสาร ไม่ใช่ string literal ของ UI) |
| `TC-COPY-02` | 6 กฎ copy | **PASS (ไม่ PENDING แล้ว)** | `config/content/copy.th.json` มีจริงและ client อ่านจริง — สุ่มตรวจ 10 คีย์ (หัวข้อ 6) ผ่านครบ 6 ข้อ |

## 5. S1–S17, I1, I2 — สูตรพิสูจน์แล้ว vs ตัวเลขจริงที่ต้องรอ HUMAN P1-F02-T20

qa-tester ไม่ตัดสิน Go/No-go (TL-M04, PM-M01) — ตารางนี้แค่แยกให้ชัดว่าอันไหน "ทำได้แล้วในรอบนี้" กับอันไหน "รอคนเดินจริงเท่านั้น" ตรงตาม `qa/plans/F02-test-plan.md` หัวข้อ 3 ทุกแถว (ไม่มีแถวใดเปลี่ยนจากที่ระบุไว้ในแผน):

| ตัว | สูตรพิสูจน์แล้ว (case) | ต้องรอ HUMAN field walk สำหรับตัวเลขจริง |
| --- | --- | --- |
| S1, S2 (FPS) | ใช่ — `TC-HUD-05` | ใช่ — FIELD-S1, FIELD-S2 (`requestAnimationFrame` จริงทดสอบอัตโนมัติไม่ได้) |
| S3 (แบต) | ใช่บางส่วน — `TC-HUD-06` (path `battery.ts`) | ใช่ — FIELD-S3 (ตัวเลขจริง + iOS ต้องคนจด) |
| S4 (เวลาแผนที่ขึ้น) | ใช่ — `TC-MAP-01`/`TC-TILE-01` | ใช่ — FIELD-S4 (เน็ตมือถือจริง) |
| S5–S8 (MB) | ใช่ — `TC-HUD-07` | ใช่ — FIELD-S5..S8 (ขนาด build เต็มจริงบนเน็ตมือถือ) |
| S9, S10 (accuracy) | ใช่ — `TC-HUD-08` | ใช่ — FIELD-S9, FIELD-S10 |
| S11 (TTFF) | ใช่ — `TC-HUD-09` | ใช่ — FIELD-S11 |
| S12 (% gate ผ่าน) | ใช่ — `TC-HUD-01a/b/c` | ใช่ — FIELD-S12 |
| S13 (sample ขาด) | ใช่ — `TC-HUD-02` | ใช่ — FIELD-S13 |
| S14 (ช่วงห่าง fix) | ใช่ — `TC-HUD-03` (ใหม่) | ใช่ — FIELD-S14 |
| S15 (latency) | **ไม่ — PENDING** (`TC-HUD-04`, ไม่มี pure export) | ใช่ — FIELD-S15 เท่านั้น |
| S16 (ป้ายไทย) | ไม่ (ต้องเห็น tile+font จริง) | ใช่ — FIELD-S16 |
| S17 (จอกลางแดด) | ไม่ | ใช่ — FIELD-S17 |
| I1 (jitter นิ่ง) | ใช่ — `TC-HUD-01a/b` | ใช่ — FIELD-I1 |
| I2 (สัญญาณในกระเป๋า) | ใช่ (จำลอง) — `TC-LOC-04` | ใช่ — FIELD-I2 |

**สรุป: ทุกตัวเลขจริงของ S1–S17/I1/I2 ยังต้องรอ HUMAN P1-F02-T20 ทั้งหมด ไม่มีข้อยกเว้น** — สิ่งที่ QA ทำได้และทำแล้วในรอบนี้คือพิสูจน์ว่า *สูตร* ที่จะใช้ตีความตัวเลขเหล่านั้นถูกต้อง (13 จาก 14 แถว มี case สูตรแล้ว มีเพียง S15 ที่ยัง PENDING เชิงสูตรเพราะข้อจำกัดทางเทคนิคของโค้ด ไม่ใช่ QA ไม่ได้ทำ)

## 6. Privacy และ Copy — หลักฐานตรง (หน้าที่ประจำของ qa-tester)

- **TC-PRIVACY-01 / TC-HUD-12**: `grep -rn "console\." apps/client/src --include="*.ts" | grep -v ".test.ts"` → 6 จุด (`main.ts:116`, `location/select.ts:36,41`, `map/runtime-images.ts:55`, `map/geo-sources.ts:39`, `debug/hud-panel.ts:271`) — grep ซ้ำด้วย pattern พิกัด (`console\.(log|warn|error|info|debug)\([^)]*(1[03]\.\d|100\.\d)`) → ไม่พบ ตรงกับที่ tech gate เคยยืนยันไว้ (หัวข้อ 3.6 ของ tech gate) ยังจริงอยู่ในรอบนี้
- **TC-PRIVACY-02**: `grep -rn '"description"' data/gps-traces/synthetic/*.json data/gps-traces/qa/*.json` → คำอธิบายทุกไฟล์เป็น scenario ทั่วไป (เดินในสวน/ซอย ความเร็ว ระยะเวลา) ไม่มีชื่อคนหรือที่อยู่ · `pnpm exec tsx tools/traces/src/generate.ts --check` ผ่านทุกไฟล์ (bbox ตรวจแล้วโดยเครื่องมือ)
- **TC-COPY-01**: `grep -rnP "[ก-๙]" apps/client/src --include="*.ts"` → พบเฉพาะในคอมเมนต์ `/** */`/`//` ที่อ้างอิงข้อความจากเอกสารดีไซน์ (design/ux, tech note) เพื่อ traceability ไม่มี string literal ภาษาไทยใน UI/logic code เลย
- **TC-COPY-02**: สุ่ม 10 คีย์จาก `config/content/copy.th.json` ที่เกี่ยวกับ GPS/แผนที่: `gps.pillLabel`, `gps.searching`, `gps.off`, `gps.denied`, `gps.unsupported`, `gps.lowAccuracy`, `gps.offline`, `gps.offlineInRun`, `run.stateGrace`, `run.stateSuspended` — ตรวจกับกฎ 6 ข้อของ `design/narrative/style-guide.md` หัวข้อ 2: (1) ไม่มีคำว่าผู้ถูกเลือก/โชคชะตา — ผ่าน (เป็นข้อความสถานะล้วน) (2) สั้นไม่เกิน 2 บรรทัด — ผ่าน (ทุกคีย์เป็น `label`/`message` สั้น, `cells` 3–37) (3) มุกจากสถานการณ์จริง — N/A (ไม่ใช่จุดตลก) (4) แซะได้ด่าไม่ได้ — ผ่าน (เป็นกลาง ไม่มีคำแซะ) (5) English เฉพาะคำทับศัพท์ — ผ่าน ("GPS" อยู่ใน allowlist ตาม `context` ของ `gps.pillLabel` เอง) (6) คำหยาบเฉพาะบทตัวละคร — ผ่าน (ไม่มีคำหยาบ, เป็นข้อความระบบทั้งหมด)

## 7. ข้อสังเกต (ไม่ใช่บั๊ก)

- **"median" ในโค้ด HUD (`debug/stats.ts`) เป็น nearest-rank p50 ไม่ใช่ค่าเฉลี่ยสองค่ากลางแบบตำรา** — พบจากการเขียน `TC-HUD-03` (ค่าคาดหวังที่คำนวณมือแบบตำราคือ 1.5 แต่โค้ดให้ 1 จริง ตามคอมเมนต์ของ `percentile()` เองที่บอกไว้แล้วว่า "no interpolation") ใช้กับ S9/S10/S14 ทั้งหมดเหมือนกัน (ฟังก์ชัน `median()` ตัวเดียวใช้ร่วม) — ไม่ใช่บั๊ก เพราะเป็นทางเลือกที่ตั้งใจและสอดคล้องกันทุกจุด แต่ **มีผลต่อการตีความตัวเลขจริงจาก FIELD walk**: ถ้าใครเทียบตัวเลข median ที่ export กับคำนวณมือแบบ Excel/สเปรดชีตทั่วไป (ซึ่งมักใช้สูตรเฉลี่ยสองค่ากลาง) ตัวเลขจะไม่ตรงกันในกรณีจำนวนตัวอย่างเป็นเลขคู่ — แนะนำให้ P1-F02-T21 (สรุปผล spike) หมายเหตุนิยามนี้ไว้ตอนอ่านผลจาก field walk เพื่อไม่ให้ตีความผิดว่าเป็นความคลาดเคลื่อนของเครื่องมือ
- ไฟล์ `apps/client/src/debug/hud-panel.ts` ไม่มี unit test ของ dev (`hud-panel.test.ts` ไม่มีอยู่จริง แม้โมดูลอื่นในโฟลเดอร์เดียวกันมีครบ) — เป็นไปตามคอมเมนต์ในไฟล์เอง ("ต้องมี DOM ... ครอบด้วย e2e") ไม่ใช่ช่องโหว่ที่ค้างอยู่โดยไม่มีเหตุผล แต่หมายความว่า latency (S15) และ battery-drain-formula/CSV-wiring จะไม่มี regression coverage อัตโนมัติเลยจนกว่าจะมี DOM test environment ใน Phase 2 — บันทึกไว้เป็น handoff (หัวข้อ 9)

## 8. บั๊กที่พบ (`qa/bugs.md`)

| id | severity | เจ้าของ | บล็อก verdict นี้ไหม |
| --- | --- | --- | --- |
| `BUG-F01-001` (เดิม, จาก QA gate F01) | medium | location-engineer | ไม่ (ของ F01 ที่มีอยู่ก่อนแล้ว ไม่เกี่ยวกับ F02) |
| `BUG-F01-002` (เดิม, จาก QA gate F01) | low | location-engineer | ไม่ |
| `BUG-F01-003` (**ใหม่**, พบระหว่าง QA gate F02) | medium | location-engineer | **ไม่** (ดูเหตุผลหัวข้อ 0 และ 8.1) — ต้องแก้ก่อน commit ของ wave |

### 8.1 เหตุผลที่ `BUG-F01-003` ไม่บล็อก verdict PASS

`qa/bugs.md` ระบุเกณฑ์ไว้แล้ว (หัวข้อ 9 ของแผน) ว่า severity high ขึ้นไปบล็อก PASS เสมอ — บั๊กนี้จัดเป็น **medium** เพราะ: (1) ไม่ใช่โค้ดของ F02 (client/location/HUD) เป็นไฟล์วิเคราะห์ offline ของ F01 (`tools/coverage/analysis/`) (2) ไม่กระทบ movement gate, privacy, PII, server authority หรือ non-negotiable ใด ๆ ของ CLAUDE.md (3) tech-lead วางบรรทัดฐานเดียวกันไว้แล้วในไฟล์ข้าง ๆ กัน (`F-01` ของ `docs/reviews/F02-tech-gate.md`: gitleaks false positive ที่ "blocking ก่อน commit ของ wave" แต่ไม่ blocking ตัว gate เอง) (4) มีทางแก้ที่ชัดเจนแม้จะไม่ใช่ one-line เหมือน F-01 (เพิ่มใน `.prettierignore` หรือเปลี่ยนวิธี escape brace)

ข้อควรระวังสำหรับ orchestrator: **ต้องแก้ก่อน commit ของ wave นี้จริง ๆ** มิฉะนั้น `pnpm lint` (job `lint` ของ CI, ใช้ร่วมกันทุก feature) จะแดงทันทีที่ไฟล์ทั้งสองถูก commit — ต่างจาก F-01 ตรงที่ F-01 แก้ด้วยคอมเมนต์บรรทัดเดียวได้ทันที แต่รายการนี้ต้องมีคนตัดสินใจเชิงโครงสร้าง (`.prettierignore` vs เปลี่ยนโค้ด) ก่อน

## 9. ช่องว่างที่ยอมรับแล้ว (Phase 2 carry) — ตาม context ของ task brief

ยืนยันแล้วว่ายังเป็นจริงในรอบนี้ ไม่ใช่บั๊กใหม่ และไม่บล็อก PASS:

- CSV `environment` เป็นค่าคงที่ `'other'` และ `segment` เป็นค่าคงที่ `'all'` ในทุกแถวที่ export จริงจนกว่าจะมี UI ให้ผู้เดินเลือก segment/environment เอง (field-walk-kit ข้อ 3 แก้ปัญหานี้ด้วยการ "เปิดหน้าเว็บใหม่ 1 ครั้งต่อ 1 segment" แทน)
- `stationary_5min_accum_m` เป็น `undefined` เสมอในตอนนี้ (คอลัมน์มีอยู่ในสูตร/schema แต่ไม่มีจุด wiring ค่าจริง) — ยืนยันด้วย `TC-HUD-10` ข้อ 3 ในไฟล์ทดสอบใหม่ (เซลล์ว่างจริง ไม่ใช่ `0` หรือ `"undefined"` ปลอม)
- ทั้งสองอย่างเป็น Phase 2 carry ตามที่ brief ระบุไว้แล้ว — field kit มีวิธีเลี่ยงปัญหานี้อยู่แล้ว (เปิด session ใหม่ต่อ segment)

## 10. Assumptions

- ไม่มี assumption ใหม่ในรอบนี้ที่กระทบ verdict — assumption เดิมจากแผน (`A-P1-F02-T12-1..3`) ปิดไปแล้ว (`config/app/privacy.json`, `config/balance/location.json#minAccuracy_m`, `window.__kwSpike` มีจริงและตรงชื่อทั้งหมด)

## 11. Handoffs

- to: location-engineer | need: แก้ `BUG-F01-003` (`tools/coverage/analysis/heatmap-template.html` ไม่ผ่าน `prettier --check` เพราะ escape `{{`/`}}` ของ Python `str.format()` ขัดกับการจัดรูปแบบ `<script>` อัตโนมัติ — แนะนำเพิ่ม path นี้ใน `.prettierignore` พร้อมเหตุผลกำกับแบบเดียวกับรายการอื่นในไฟล์นั้น หรือย้าย CSS/JS ไปเป็นสตริง Python แยกแล้วประกอบตอน `write_text`) | why: `pnpm lint` (root, ใช้ร่วมกับ F02) จะแดงทันทีที่ไฟล์นี้ถูก commit | blocking: yes (ก่อน commit ของ wave นี้ ไม่ใช่ก่อน verdict ของ gate นี้)
- to: gameplay-programmer หรือ qa-tester (task ถัดไปที่มี `writes: qa/tests/e2e/` หรือ `apps/client/e2e/`) | need: เพิ่ม automated spec ถาวรสำหรับ `TC-MAP-05` (เน็ตหลุดกลาง pan) และ `TC-MAP-08` (tile นอกชุด) ตามรูปแบบที่ยืนยันด้วยมือแล้วในหัวข้อ 2 ของรายงานนี้ (ปัจจุบันพิสูจน์แล้วว่าไม่พัง แต่ไม่มี regression coverage ถาวร) | why: กันไม่ให้ Phase 2 เผลอทำ F02's "ไม่ crash เมื่อเน็ตหลุด/tile หาย" กลับมาพังแล้วไม่มีใครรู้ | blocking: no
- to: tech-lead หรือ gameplay-programmer (Phase 2) | need: เมื่อมี DOM test environment ให้ `apps/client/src/debug/hud-panel.ts` แล้ว เพิ่ม unit test ของ dev เองสำหรับสูตร latency (S15) และ battery-drain/CSV wiring ที่ตอนนี้ QA ทำเครื่องหมาย PENDING เพราะไม่มี pure export ให้เรียก | why: ปิดช่องว่าง regression coverage ถาวรของ S15 และ S3 ส่วนที่เหลือ | blocking: no
- to: P1-F02-T21 (tech-lead, สรุปผล spike) | need: หมายเหตุนิยาม "median = nearest-rank p50 ไม่ใช่ค่าเฉลี่ยสองค่ากลาง" (หัวข้อ 7) ไว้ตอนอ่านผล field walk จาก summary CSV | why: กันการตีความตัวเลข S9/S10/S14 ผิดว่าเป็นความคลาดเคลื่อนของเครื่องมือ | blocking: no

## 12. บทสรุป verdict

**PASS** — ทุกเกณฑ์ acceptance ของ `#### P1-F02-T16` มีหลักฐาน: (1) ทุก case ใน test plan มีผล รวมถึงที่เพิ่มใหม่และที่ตรวจด้วยมือ, mock trace เล่นซ้ำได้และจุดขยับบนแผนที่จริงกับ fixture จริง (2) build ที่ deploy ได้ใน local ยืนยันแล้วทั้ง client (`vite preview`) และ tile (`wrangler pages dev` + curl), คู่มือเดินทดสอบอ่านครบและใช้งานได้จริงในเครื่อง (3) `qa/bugs.md` อัปเดตแล้วด้วย `BUG-F01-003` ไม่มีบั๊ก severity high ขึ้นไปที่มาจาก F02 เอง จึงไม่มีอะไรบล็อก verdict นี้ตามเกณฑ์ของบทบาท qa-tester ("a bug of severity high or above blocks PASS")