# Tech gate F02 — Tech Foundation และ Map/Location Spike

| หัวข้อ | ค่า |
| --- | --- |
| task | P1-F02-T15 (review-gate) |
| ผู้ตรวจ | tech-lead |
| วันที่ | 2026-09-23 ถึง 2026-09-24 (รันคำสั่งทั้งหมดบน working tree ปัจจุบัน รวมไฟล์ที่ยังไม่ commit) |
| ขอบเขต | `apps/client/`, `packages/shared`, `packages/location`, `tools/{coverage,traces,sim,tiles,copy-lint}` (hygiene เท่านั้นสำหรับ coverage/traces/sim ตาม TL-S03), `infra/`, `.github/workflows/`, `qa/tests/`, ADR 0001, ADR 0002, tech note F02 และเอกสารประกอบ, decision D-017..D-068 |
| **verdict** | **PASS** (มี 1 finding ที่ต้องแก้ก่อน commit ของ wave นี้ ดู F-01 · ไม่ต้องรัน gate ซ้ำ) |

## 0. สรุป

- สถาปัตยกรรมตรง ADR 0001, ADR 0002 และ tech note F02 · client ใช้ `LocationProvider` ผ่าน interface เท่านั้น · ไม่มี logic รางวัลหรือ gate ใน client นอกจากการวัดของ HUD spike (measurement-only ตาม tech note 10.5) · ไม่มี magic number (lint ผ่านโดยไม่มี `eslint-disable`) · ไม่มี secret และไม่มีไฟล์ต้องห้าม · lint, typecheck, test (889 test รวม pytest 2 bridge แบบบังคับ), build ผ่าน · generator ของ traces และ vectors ตรงกับไฟล์ที่ commit
- e2e ล้ม 2 test ตามที่คาด (`qa/tests/e2e/f02-map-fixture-tile.spec.ts:109` ทั้ง Android และ iOS ซึ่ง QA แก้ใน P1-X24) · การ render จริงจาก fixture ครอบด้วย `apps/client/e2e/map-real-fixture.spec.ts` ที่ผ่านทั้งสอง project จึงไม่ถือเป็น defect ของ product
- finding ที่ต้องแก้จริงมีข้อเดียว (F-01): gitleaks จับ false positive ใน `tools/coverage/analysis/__main__.py:222` ซึ่งยังไม่ถูก commit · ถ้า commit ไปทั้งอย่างนี้ job `secret-scan` ของ CI (สแกน history ทั้งหมด) จะแดงถาวร · แก้หนึ่งบรรทัด ตรวจซ้ำด้วยคำสั่งเดียว (หัวข้อ 5) จึงไม่ต้องรัน gate ใหม่

### 0.1 คำตอบสำหรับ HUMAN P1-F02-T19: build นี้ขึ้น URL สาธารณะได้หรือไม่

**ได้** เมื่อ F-01 แก้แล้วก่อน commit ของ wave (orchestrator ยืนยันด้วยคำสั่งในหัวข้อ 5 F-01) เหตุผล:

1. ไม่มี secret ใน history และใน working tree (gitleaks 8.30.1 ทั้งสองแบบ) · `.env.example` ทั้งสองไฟล์ไม่มีค่า · `.env.local` ถูก ignore (`.gitignore:6`) · secret ของ Cloudflare อ่านจาก GitHub Actions secret เท่านั้น (`.github/workflows/deploy-preview.yml` ขั้น "Publish ...")
2. client ไม่ส่งข้อมูลใดออกจากเครื่อง: `fetch` มีเฉพาะ style, tile, glyph/sprite, GeoJSON ของแผนที่ (`apps/client/src/map/*.ts`) · ไม่มี `sendBeacon`, `WebSocket`, `XMLHttpRequest`, `localStorage` · raw trace เป็นไฟล์ download บนเครื่องเมื่อผู้ใช้กดปุ่มเองเท่านั้น และผ่าน `validateTrace` (trim ปลาย, ปัดทศนิยม) ก่อน (`apps/client/src/debug/raw-trace-export.ts`, `config/app/privacy.json#rawTraceExport`)
3. ไม่มีพิกัดใน log: `console.*` ใน client มี 6 จุด ไม่มีจุดใดพิมพ์ lat/lng (หัวข้อ 3.6)
4. `window.__kwSpike` (มีตำแหน่งของเครื่องตัวเอง) สร้างเฉพาะเมื่อ `hud=1` (`apps/client/src/main.ts:49-52`) · production ค่าเริ่มต้น `provider: web`, `hud: false` (`config/app/client.json#providerQueryDefaultsByMode.production`)
5. workflow deploy เป็น `workflow_dispatch` เท่านั้น ค่าเริ่มต้น `dry_run: true` · ไม่มีบริการที่ต้องผูกบัตร ไม่มีชื่อ env ที่ผูกกับ R2 · tile อยู่ในงบ Cloudflare Pages Free (หัวข้อ 3.9)
6. source map ถูก publish ไปด้วย (`dist/assets/*.map`) ยอมรับได้เพราะ repo เป็น public อยู่แล้ว (D-002)

สิ่งที่คนควรรู้ก่อน push ใน T19 ขั้น 0: job `e2e` ของ CI จะยังแดงจนกว่า P1-X24 เสร็จ (F-02) ซึ่งเป็นที่คาดไว้ · job `secret-scan` และ `forbidden-files` ต้องเขียว ถ้าแดงให้หยุดและแจ้ง orchestrator

## 1. ผลคำสั่งที่รัน

รันที่ `/Users/pongpon/Game` · node v24.19.0 · pnpm 11.24.0 · gitleaks 8.30.1 (เวอร์ชันเดียวกับ CI) · ตามลำดับเดียวกับ job `build-test` ของ CI

| # | คำสั่ง | ผล | บรรทัดสำคัญจาก output |
| --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | ผ่าน (exit 0) | `Scope: all 8 workspace projects` · `Already up to date` |
| 2 | `pnpm lint` | ผ่าน (exit 0) | eslint ไม่มี error/warning (`--max-warnings=0`) · `All matched files use Prettier code style!` · copy lint มีแต่ S7 WARN 10 รายการ (ตัวแปรสงวนที่ยังไม่ใช้ ตาม D-058 ยอมรับแล้ว) |
| 3 | `pnpm typecheck` | ผ่าน (exit 0) | root `tsc` + `tools/copy-lint`, `packages/shared`, `apps/client` `typecheck: Done` |
| 4 | `COVERAGE_PYTEST_REQUIRED=1 pnpm test` | ผ่าน (exit 0) | `Test Files 59 passed (59)` · `Tests 889 passed (889)` · รันซ้ำแบบ verbose: `tools/coverage/pipeline/tests/pytest-bridge.test.ts` และ `tools/coverage/boundaries/tests/pytest-bridge.test.ts` ผ่านจริง (ไม่ได้ skip, venv อยู่ที่ `tools/coverage/.venv`) |
| 5 | `pnpm build` | ผ่าน (exit 0) | `apps/client build: ✓ built in 665ms` · ขนาดในหัวข้อ 3.7 |
| 6 | `pnpm test:e2e` | 24 ผ่าน, 2 ล้ม (exit 1) | ล้มเฉพาะ `qa/tests/e2e/f02-map-fixture-tile.spec.ts:94` ทั้ง `[android-chrome]` และ `[ios-safari]`: `expect(locator('canvas.maplibregl-canvas')).toBeVisible()` → `element(s) not found` ที่บรรทัด 109 · ตรงกับที่ brief คาดไว้ (P1-X24) · `apps/client/e2e/map-real-fixture.spec.ts` และ spec อื่นทั้งหมดผ่าน |
| 7 | `gitleaks detect --source . --log-opts="--all" --config .gitleaks.toml --redact` (history ทั้งหมด แบบเดียวกับ CI) | ผ่าน (exit 0) | `6 commits scanned` · `no leaks found` |
| 8 | `gitleaks detect --source . --no-git --config .gitleaks.toml --redact` (working tree รวมไฟล์ที่ยังไม่ commit) | **1 finding** (exit 1) | `tools/coverage/analysis/__main__.py:222` rule `generic-api-key` match `excludeAccessValues", "REDACTED"` entropy 3.75 · เป็นชื่อ config key ไม่ใช่ secret → F-01 |
| 9 | guard ไฟล์ต้องห้าม (5 กลุ่มเดียวกับ job `forbidden-files`) บนชุดไฟล์ที่จะถูก commit = `git ls-files` ∪ `git ls-files --others --exclude-standard` (488 ไฟล์) | ผ่าน | กลุ่ม 1 raw playtest: 0 · กลุ่ม 2 `.env*` ที่ไม่ใช่ example: 0 · กลุ่ม 3 `.pmtiles` นอก fixtures: 0 · กลุ่ม 4 `.osm.pbf`: 0 · กลุ่ม 5 ไฟล์ > 5 MiB: 0 (ใหญ่สุด `data/coverage/excluded.geojson` 4,085,085 byte) · path ที่มีช่องว่าง 8 ไฟล์ (self-check ของ guard มีของให้ตรวจ) |
| 10 | `pnpm exec tsx tools/traces/src/generate.ts --check` | ผ่าน (exit 0) | ทุก trace และ `polygons/test-rect-benchasiri.geojson` เป็น `ok` |
| 11 | `pnpm exec tsx tools/sim/src/gen-vectors.ts --check` | ผ่าน (exit 0) | `up-to-date damage.json (38 vectors)` · `drops.json (23)` · `economy.json (38)` · `party.json (17)` |

หมายเหตุ: ขั้น 7 สแกนเฉพาะ 6 commit ที่มีอยู่ · ไฟล์ของ wave 7 ยังไม่ถูก commit (`git status` แสดงไฟล์แก้ 48 ไฟล์และไฟล์ใหม่ 120 ไฟล์) จึงเพิ่มขั้น 8 และขั้น 9 บนชุดไฟล์ที่จะ commit จริง เพื่อให้ผลตรงกับสิ่งที่ CI จะเห็นหลัง push

## 2. Acceptance ของ P1-F02-T15 (board "#### P1-F02-T15")

| # | ข้อ | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | ตรงตาม ADR 0001 และ tech note | ผ่าน | layout `apps/`, `packages/`, `tools/`, `qa/tests/*` ตรง ADR 0001 หัวข้อ 3 และ `pnpm-workspace.yaml` · boundary rule `apps/*` `packages/*` ห้าม import `tools/*` อยู่ใน `eslint.config.js:11-20, 67-78` และ grep ไม่พบการ import `tools/` ใน `apps/client/src`, `packages/*/src` · worker ของ MapLibre ตาม D-068 (หัวข้อ 3.8) · env ชื่อตาม TL-S05 |
| A2 | ใช้ interface เท่านั้น | ผ่าน | client สร้าง provider ที่ `apps/client/src/location/session.ts` จุดเดียว ส่วนอื่นใช้ `import type { LocationProvider, ... }` · `navigator.geolocation` มีเฉพาะ `packages/location/src/web/web-provider.ts:88` (มี test ยืนยัน `packages/location/test/capacitor-and-hygiene.test.ts:124`) |
| A3 | ไม่มี magic number | ผ่าน | `@typescript-eslint/no-magic-numbers` error ทุกไฟล์ `.ts` นอก test (`eslint.config.js:46-60`) · `grep -rn "eslint-disable" apps packages tools --include='*.ts'` ไม่พบ · const ที่ตั้งชื่อใน client เป็นหน่วยหรือเรขาคณิต (`MS_PER_SECOND`, `EARTH_RADIUS_M`, `FULL_TURN_DEG`) หรือค่า UI ที่ไม่ใช่ balance (F-08) · ค่าที่เกี่ยวกับ gate/accuracy อ่านจาก `config/balance/*.json` ผ่าน `apps/client/src/config/balance.ts` ซึ่ง throw ตอน import ถ้าค่าผิด |
| A4 | ไม่มี secret ใน repo (gitleaks history ทั้งหมด + guard) | ผ่าน โดยมีเงื่อนไข F-01 | หัวข้อ 1 ขั้น 7–9 |
| A5 | ไม่มีบริการที่ต้องผูกบัตร และไม่มีชื่อ env ที่ผูกกับ R2 (D-001) | ผ่าน | `.env.example` มี 6 ชื่อ ค่าว่างทั้งหมด (`VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL`, `TILES_PUBLIC_BASE_URL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) · `R2_*` ไม่อยู่ในโค้ด, workflow หรือ `.env*` (มีเฉพาะในเอกสารที่อธิบายว่าเลิกใช้: `docs/tech/environments.md:35`, และ `infra/runbooks/preview-setup.md` หัวข้อ 7 เป็นทางขยายที่ต้องให้คนอนุมัติค่าใช้จ่ายแยก) · CI ใช้ GitHub Actions ฟรีของ repo public, gitleaks แบบ open source ไม่มี license key |
| A6 | รัน lint, typecheck, test, build เองและแนบ output | ผ่าน | หัวข้อ 1 ขั้น 1–6 |
| A7 | error/offline/permission และไม่มีพิกัดใน log | ผ่าน | หัวข้อ 3.6 |
| A8 | hygiene ของ `tools/coverage/`, `tools/traces/`, `tools/sim/` | ผ่าน (finding F-01, F-03, F-07 ไม่ขวาง Go/No-go ของ F01 และ QA gate ของ F03) | หัวข้อ 4 |
| A9 | ADR 0002 สอดคล้องกับ ADR 0001 และ non-negotiables | ผ่าน | หัวข้อ 3.12 |
| A10 | ผลนี้เป็นเงื่อนไขก่อน HUMAN P1-F02-T19 | ตอบแล้ว | หัวข้อ 0.1 |
| A11 | (P1-PLAN-SYNC-01) `tools/copy-lint/`, vectors ไม่ฝังเลข (X04), lint/vitest/tsconfig (X05), pytest ใน CI (X07) | ผ่าน | copy lint รันใน `pnpm lint` จาก root script · `tools/sim/src/vectors*.ts` lint ผ่านโดยไม่มี override (D-062) · `vitest.config.ts` รวม pytest bridge ทั้งสอง · `.github/workflows/ci.yml` สร้าง venv และตั้ง `COVERAGE_PYTEST_REQUIRED: '1'` |
| A12 | (P1-PLAN-SYNC-01) `tools/coverage/boundaries/` (P1-H07) ถ้าเสร็จแล้ว | ผ่าน | pytest bridge ของ boundaries รันและผ่านใน `pnpm test` · ใช้ `requirements.txt` ชุดเดียวกับ coverage · ข้อมูลดิบอยู่ใน `tools/coverage/downloads/` ที่ถูก ignore · ผลลัพธ์ที่ commit คือ `data/map/provinces.geojson` 259,787 byte และ `data/map/playarea-mask.geojson` · P1-CLOSE-QA ไม่ต้องตรวจโฟลเดอร์นี้ซ้ำ |

## 3. ข้อที่ brief ให้ตรวจเฉพาะ

### 3.1 ไม่มีรางวัลหรือ gate ใน client นอกจากการวัดของ spike — ผ่าน

- `apps/client/src/debug/stats.ts:176-204` (`computeGateWindows`) นับว่าหน้าต่าง `window_s` เลื่อนทีละ `gateWindowStep_s` ผ่านเกณฑ์ `minDistancePerWindow_m` กี่ % เพื่อเติมคอลัมน์ `gateWindowsPassPct` ของ summary CSV (S12) เท่านั้น · ผลไม่ถูกส่งออกจากเครื่อง ไม่ผูกกับรางวัล สถานะ หรือ UI ของผู้เล่น · เรียกเฉพาะใน `debug/hud-panel.ts:164` ซึ่ง dynamic import เมื่อ `hud=1` (`main.ts:60-61`)
- ค่าทั้งหมดอ่านจาก config: `balance.dungeons.movementGate` และ `balance.anticheat.checkIn.maxAccuracy_m` (`apps/client/src/config/balance.ts:124-128`) · step และ warm-up จาก `config/app/client.json#hudMeasurement`
- haversine ซ้ำใน `debug/stats.ts:47-57` ยอมรับสำหรับ spike (header ของไฟล์บอกเหตุผล) · Phase 2 ต้องย้าย geometry และ gate ไป `packages/shared` แล้วลบของซ้ำนี้ (อยู่ใน handoff F-05)
- สถานะแสดงผล (`gps.lowAccuracy`, นอกพื้นที่) เป็น display-only ตาม D-054 และ D-064 ไม่กระทบ NN-1

### 3.2 LocationProvider ผ่าน interface — ผ่าน (ดู A2)

### 3.3 apps/packages ไม่ import tools — ผ่าน (ดู A1)

### 3.4 ไม่มีค่า balance ฝังในโค้ด — ผ่าน (ดู A3)

### 3.5 lockfile — ยอมรับการเปลี่ยนของ P1-F02-T13

diff ของ `pnpm-lock.yaml` เทียบ commit ล่าสุดมีสองส่วน:

1. `@maplibre/maplibre-gl-style-spec` 26.4.4 เป็น root devDependency · มาจาก P1-X05 ซึ่งประกาศ `package.json` และ `pnpm-lock.yaml` ใน writes (board บรรทัด P1-X05) · ถูกต้อง
2. importer `qa/tests/F02` (`@keep-walking/location`, `@keep-walking/shared` เป็น `workspace:*`) · มาจาก P1-F02-T13 นอก writes (ledger แถว 67) · **ยอมรับ ไม่ต้องแก้** เพราะ (ก) เป็น link ภายใน workspace ล้วน ไม่มีโค้ดภายนอกหรือเวอร์ชันใหม่เข้าระบบ (ข) `qa/tests/*` อยู่ใน glob ของ `pnpm-workspace.yaml` ตาม ADR 0001 อยู่แล้ว (ค) `pnpm install --frozen-lockfile` ผ่าน · ข้อสังเกตเชิงกระบวนการ: กฎ TL-M01 ยังใช้ต่อ ครั้งหน้างานที่ต้องเพิ่ม `package.json` ให้ handoff ถึง tech-lead แม้เป็น workspace link

### 3.6 error, offline, permission และพิกัดใน log — ผ่าน

- permission ถูกปฏิเสธ → สถานะ `denied`, ไม่รองรับหรือ Capacitor stub → `unsupported`, `position-unavailable` ซ้ำโดยไม่มี sample → สถานะสัญญาณหาย, `timeout` ไม่เปลี่ยนสถานะ (`apps/client/src/location/gps-status.ts:150-160`) · มี test `gps-status.test.ts` และ trace `synthetic-permission-denied-01`
- offline: `windowNetworkStatus()` ผูกกับ `gpsUi.setOffline` (`main.ts:94-96`) · style/GeoJSON/รูปโหลดไม่ได้ → `console.warn` และใช้ค่าว่าง ไม่ทำให้ app ล่ม (`map/geo-sources.ts:39`, `map/runtime-images.ts:55`) · env ไม่ครบ → สถานะ "ยังไม่ตั้งค่า" (`main.ts` ฟังก์ชัน `main`)
- `console.*` นอก test มี 6 จุด: `main.ts:116`, `location/select.ts:36`, `location/select.ts:41`, `map/runtime-images.ts:55`, `map/geo-sources.ts:39`, `debug/hud-panel.ts:271` · ไม่มีจุดใดพิมพ์ sample หรือพิกัด · ข้อความ error ของ `validateTrace` ที่ `hud-panel.ts:271` อาจแสดง `value ${value} is out of range` (`packages/shared/src/trace.ts:268`) เฉพาะค่าที่อยู่นอก ±90/±180 ซึ่งไม่ใช่ตำแหน่งจริงบนโลก จึงไม่ใช่พิกัดหลุด
- summary CSV ไม่มีคอลัมน์พิกัด (`apps/client/src/debug/csv-export.ts` รายการ `COLUMNS` ตาม gps-trace-format 4.1) · CSV เดียวที่จะ commit คือ `data/coverage/district-counts.csv` (ยอดรวมรายเขต ไม่มีตำแหน่งรายบุคคล)

### 3.7 ขนาด bundle เทียบ S5 — "Go พร้อมเงื่อนไข" ถ้านับ decoded, "Go" ถ้านับ transfer · ไม่ขวาง gate

| ไฟล์ | raw (byte) | gzip -9 (byte) |
| --- | --- | --- |
| `index-*.js` (main รวม maplibre-gl) | 1,189,942 | 319,185 (Vite รายงาน 324.11 kB) |
| `maplibre-gl-worker-*.js` | 507,813 | 143,750 |
| `hud-panel-*.js` (โหลดเมื่อ `hud=1`) | 9,573 | 3,922 |

JS ที่ต้องโหลดตอนเปิดครั้งแรก = main + worker ≈ 1.70 MB decoded (ช่วง > 1.0 ถึง 2.0 = Go พร้อมเงื่อนไข) หรือ ≈ 0.46 MB ถ้า host ส่งแบบบีบอัด (Go) · tech note หัวข้อ 11 ให้ใช้ `encodedBodySize` เมื่อมี จึงให้ผลวัดจริงใน P1-F02-T20 เป็นตัวตัดสิน · trace 15 ไฟล์แยกเป็น chunk ที่โหลดเมื่อใช้ mock เท่านั้น · S5 เป็นเกณฑ์ประเภท "มีทางเลือก" ไม่ใช่เด็ดขาด · ทางลดสำหรับ Phase 2 อยู่ใน F-06

### 3.8 worker fix D-068 — ผ่าน

`apps/client/src/map/worker.ts` ตั้ง `setWorkerUrl()` จาก `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` · เรียกก่อนสร้างแผนที่ (`apps/client/src/map.ts:92-93`) · build ออกไฟล์ `dist/assets/maplibre-gl-worker-*.js` จริง · e2e `apps/client/e2e/map-real-fixture.spec.ts` ตรวจ `load` และ tile render ผ่านทั้งสอง project ตามเงื่อนไขของ D-068

### 3.9 งบ tile — ผ่าน

จาก `tools/tiles/out/size-report.txt` (build `pm4-20260923-z15`, bbox 99.8,13.4,101.0,14.35, z0–15): tile 13,502 / target 15,000 (90%) · deploy 14,283 (รวม 2 ไฟล์สำรอง) / target 16,000 (89.3%) / เพดาน Pages Free 20,000 (71.4%) · ไฟล์ใหญ่สุด 300,539 byte เทียบเพดาน 25 MiB · `RESULT PASS Cloudflare Pages Free budget` · ค่าทั้งหมดอยู่ใน `tools/tiles/config.json` · ไม่มีไฟล์ `tools/tiles/out/` ถูก track (ignore)

### 3.10 hygiene ของข้อมูลที่ commit ใน repo public — ผ่าน (ข้อสังเกต F-07)

- ไฟล์ > 1 MB ที่จะ commit มีสองไฟล์: `data/coverage/excluded.geojson` 4,085,085 byte (78% ของ 5 MiB) และ fixture `tools/tiles/fixtures/lumpini/pmtiles/pm4-20260923-z15-lumpini.pmtiles` 1,479,856 byte · fixture ทั้งหมดใต้ 5 MiB
- `data/coverage/` มี `LICENSE-DATA.md` ระบุ ODbL (OSM) และ CC BY 4.0 (WorldPop) พร้อม attribution · ไม่มีข้อมูลตำแหน่งรายบุคคล · trace ใน `data/gps-traces/` เป็น `kind: synthetic` และ `kind: qa` ที่สร้างจากสคริปต์ทั้งหมด ไม่มี raw หรือ recorded trace
- ข้อสังเกตเล็ก: path เครื่อง `/Users/pongpon/Game` อยู่ในเอกสารที่ commit (`infra/runbooks/preview-setup.md:58,78`, `qa/reports/F03-qa-gate.md:21`, `qa/reports/F03-contrast-check.md:54` และเอกสาร studio) · ไม่ใช่ secret และคนยอมรับการเปิดเผยเอกสาร studio แล้วใน T18 ขั้น 1 จึงไม่ต้องแก้

### 3.11 ชื่อ timing แบบ alias ของ X05 — ผ่าน (T11 ย้ายแล้ว)

client ส่ง `timeout_ms` / `maximumAge_ms` จาก `config/app/client.json#locationWeb` (`apps/client/src/location/session.ts:38-39`) · ชื่อเก่า `timeoutMs` / `maximumAgeMs` เหลือเฉพาะ type `LegacyWebLocationTiming` (`packages/location/src/types.ts:108-125`), `web/timing.ts` และ test ของ alias · ไม่มีผู้เรียกแล้วจึงลบได้ (F-05)

### 3.12 ADR 0002 เทียบ ADR 0001 และ non-negotiables — ผ่าน

- ยืนยัน D-008 (Cloudflare Free: API Worker + CellDO ต่อ geohash-5 + RaidDO + D1 + Pages) ตรงกับ baseline ของ GDD ยกเว้น tile บน Pages แบบ XYZ แทน PMTiles บน R2 ซึ่งมี D-031 รองรับ และทางกลับไป R2 ต้องเป็น decision ค่าใช้จ่ายของคน (ADR 0002 หัวข้อ 4.1, runbook หัวข้อ 7)
- NN-1: "ทุกค่าที่มีผลต่อรางวัลคำนวณใน CellDO / RaidDO / API Worker เท่านั้น" client ส่ง batch ทุก 1 นาที formula จาก `packages/shared` (ADR 0002 หัวข้อ 3) · PDPA: `position_log` TTL 24 ชม. ด้วย DO alarm · ใช้ `apps/api` ตาม layout ของ ADR 0001
- ADR 0002 ไม่ได้พูดถึง `verification_mode` และ `floor_level` เพราะเป็นเรื่อง stack ไม่ใช่ data model · ต้องอยู่ใน tech note F07/F08 ของ Phase 3 (บันทึกเป็นข้อเตือนในหัวข้อ 6)

## 4. Hygiene ของ tools (TL-S03 · hygiene เท่านั้น)

ขอบเขตตาม board: pin dependency, ไฟล์ดิบไม่เข้า git, ไม่มี secret, อ่านค่าจาก `config/`, test รันจาก root script และอยู่ใน CI, `apps/*` `packages/*` ไม่ import `tools/*` · ไม่ได้ตรวจความถูกต้องของผลวิเคราะห์ (เป็นงาน QA ของ F01)

| เกณฑ์ | `tools/coverage/` (รวม `boundaries/`) | `tools/traces/` | `tools/sim/` | `tools/tiles/` | `tools/copy-lint/` |
| --- | --- | --- | --- | --- | --- |
| pin dependency | ผ่าน · `requirements.txt` pin ตรงทุกตัวรวม transitive · venv ใน `.venv/` (ignore) | ผ่าน · ไม่มี dependency ภายนอก (workspace เท่านั้น) | ผ่าน · เช่นเดียวกัน | ผ่าน · `pmtiles` CLI pin เวอร์ชันและ sha256 ใน `tools/tiles/config.json` · CI cache ด้วย key เดียวกัน | ผ่าน · `@keep-walking/shared` workspace |
| ไฟล์ดิบไม่เข้า git | ผ่าน · `downloads/`, `raw/`, `cache/`, `*.osm.pbf`, `*.tif` อยู่ใน `.gitignore` · output ที่ commit มี license | ผ่าน · synthetic ล้วน | ไม่มีไฟล์ดิบ | ผ่าน · `out/`, `downloads/`, `*.pmtiles` นอก fixtures ถูก ignore | ไม่มี |
| ไม่มี secret | **F-01** (false positive ใน `analysis/__main__.py:222`) | ผ่าน | ผ่าน | ผ่าน | ผ่าน |
| อ่านค่าจาก `config/` | ผ่าน · กติกาเกมจาก `config/balance/dungeons.json` ส่วนค่าเครื่องมือ (source URL, CRS, path) จาก `tools/coverage/params.json` (`pipeline/config.py:3-6`) ตาม ADR 0001 3.11 | ผ่าน · `config/balance/dungeons.json`, `anticheat.json` (`src/config.ts:56-57`) | ผ่าน · `config/balance/*.json` เท่านั้น (`src/config.ts:2, 28`) · vectors ไม่มีเลขฝัง (lint ผ่านโดยไม่มี override, D-062) | ผ่าน · `tools/tiles/config.json` (ค่าเครื่องมือ ไม่ใช่ balance) | ผ่าน · `config/content/copy-rules.json` |
| test จาก root script และอยู่ใน CI | ผ่าน · pytest 2 bridge ใน `pnpm test` แบบบังคับใน CI (`COVERAGE_PYTEST_REQUIRED=1`) | ผ่าน · `pnpm test` + `generate.ts --check` ใน CI (`ci.yml:89-90`) | test ผ่านใน `pnpm test` · **`gen-vectors.ts --check` ยังไม่อยู่ใน CI** → F-03 | ผ่าน · `tools/tiles/test/tiles.test.ts` ใน `pnpm test` | ผ่าน · `pnpm lint:copy` อยู่ใน `pnpm lint` |
| ไม่ถูก import จาก apps/packages | ผ่าน (ภาษา Python แยกอยู่แล้ว) | ผ่าน | ผ่าน | ผ่าน | ผ่าน |

ข้อสังเกต: `eslint.config.js:30` ignore `tools/coverage/**` ทั้งโฟลเดอร์ ถูกต้องเพราะเป็น Python เกือบทั้งหมด · ไฟล์ `.ts` ในโฟลเดอร์นี้มีแค่ pytest bridge สองไฟล์ ซึ่งเป็น test อยู่แล้ว

## 5. Findings

| id | ไฟล์และบรรทัด | ปัญหา | ให้ใคร | blocking | ทำอะไร |
| --- | --- | --- | --- | --- | --- |
| F-01 | `tools/coverage/analysis/__main__.py:222` (ยังไม่ commit) | gitleaks rule `generic-api-key` จับ `"excludeAccessValues", "sizeBandUpper_m2"` (คำว่า access + string entropy 3.75) เป็น false positive · ถ้าเข้า commit แล้ว job `secret-scan` ของ CI จะแดงทุกครั้งเพราะสแกน history ทั้งหมด และแก้ย้อนหลังได้แค่ด้วย `.gitleaksignore` fingerprint | location-engineer (เจ้าของ `tools/coverage/analysis/`, P1-F01-T06) หรือ orchestrator ทำแทนก่อน commit ของ wave | **yes** (ก่อน commit ของ wave และก่อน push ของ T19 · ไม่ต้องรัน gate ซ้ำ) | ต่อท้ายบรรทัด 222 ด้วย `  # gitleaks:allow` (ทดสอบแล้วบนสำเนาใน scratch: Python parse ได้ และ gitleaks รายงาน `no leaks found`) · ยืนยันด้วย `gitleaks detect --source . --no-git --config .gitleaks.toml --redact --exit-code 1` ต้องได้ exit 0 · ห้ามแก้ด้วยการขยาย `[allowlist]` ใน `.gitleaks.toml` ให้ครอบทั้ง path |
| F-02 | `qa/tests/e2e/f02-map-fixture-tile.spec.ts:109` | spec รอ `canvas.maplibregl-canvas` ไม่เจอภายใน 5 วินาที ล้มทั้ง `[android-chrome]` และ `[ios-safari]` · product render ได้จริง (`apps/client/e2e/map-real-fixture.spec.ts` ผ่าน) จึงเป็น spec ที่ไม่ตรงกับ app หลัง D-068 | qa-tester (P1-X24) | no สำหรับ gate นี้ · yes สำหรับ QA gate P1-F02-T16 (มี X24 ใน deps แล้ว) | ปรับ spec ตาม D-068 โดยใช้แนวเดียวกับ `apps/client/e2e/map-real-fixture.spec.ts` (ตรวจว่า `load` fire และ tile render จริง) · job `e2e` ของ CI จะแดงจนกว่าเสร็จ |
| F-03 | `.github/workflows/ci.yml:89-90` | CI ตรวจ `tools/traces/src/generate.ts --check` แต่ไม่ตรวจ `tools/sim/src/gen-vectors.ts --check` · ถ้ามีคนแก้ `config/balance/` โดยไม่ regenerate vectors จะไม่มีใครรู้จน test ของ Phase 2 ใช้ vectors เก่า | devops-engineer | no | เพิ่ม step `pnpm exec tsx tools/sim/src/gen-vectors.ts --check` ต่อจาก step trace ในงาน X ถัดไป (ก่อน P1-CLOSE-QA) |
| F-04 | `apps/client/src/config/balance.ts:17-18` | import ทั้งไฟล์ `config/balance/dungeons.json` และ `anticheat.json` เข้า bundle (ยืนยันแล้วว่า key อื่น เช่น `emergencyClose` อยู่ใน `dist/assets/index-*.js`) ทั้งที่ใช้แค่ 3 ค่า · ไม่ใช่การหลุดเพราะ repo เป็น public แต่ใน Phase 3 ค่า anti-cheat ไม่ควรติดไปกับ client และเพิ่มขนาด bundle | gameplay-programmer (Phase 2) | no | Phase 2: ให้ client อ่านเฉพาะ subtree ที่แสดงผล (เช่น build-time pick หรือ `config/app/` ที่ชี้ด้วย pointer ตาม ADR 0001 3.10.6) · ผู้ตรวจ Phase 2 เพิ่ม test ว่า bundle ไม่มี key ของ `anticheat` นอกจาก `checkIn.maxAccuracy_m` |
| F-05 | `packages/location/src/types.ts:108-125`, `packages/location/src/web/timing.ts`, `packages/location/test/web-timing-alias.test.ts`, `apps/client/src/debug/stats.ts:47-57` | (ก) alias `LegacyWebLocationTiming` ไม่มีผู้เรียกแล้วหลัง T11 (ข) haversine และ gate window ซ้ำใน client สำหรับ spike | location-engineer (ก), gameplay-programmer (ข) · Phase 2 | no | (ก) ลบ alias และ test ของ alias (ข) เมื่อ `packages/shared` มี geometry และ movement gate ใน Phase 2 ให้ HUD import จากที่นั่นแล้วลบของซ้ำ |
| F-06 | `apps/client/dist/assets/index-*.js` (1,189,942 byte) | S5 อยู่ในช่วง Go พร้อมเงื่อนไขถ้านับ decoded (main + worker ≈ 1.70 MB) · ผลจริงตัดสินจากสนามใน T20 | gameplay-programmer (Phase 2) | no | ถ้า T20 วัดได้ S5 > 1.0 MB แบบ transfer: แยก maplibre-gl เป็น chunk ที่ cache ได้ยาว (`build.rolldownOptions.output.codeSplitting`) และตัด module ที่ไม่ใช้ · ตั้งงบ bundle ใน CI ใน Phase 2 |
| F-07 | `data/coverage/excluded.geojson` (4,085,085 byte) | ใช้ 78% ของเพดาน guard 5 MiB · D-066 จะ regenerate อีกครั้งและอาจโตเกิน | location-engineer | no | ถ้าหลัง regenerate เกิน 4.5 MB ให้ลดทศนิยมพิกัดหรือ simplify ด้วยค่าใน `tools/coverage/params.json` หรือแยกไฟล์ตามจังหวัด · ห้ามเพิ่ม `MAX_TRACKED_FILE_BYTES` |
| F-08 | `apps/client/src/ui/gps-ui.ts:19` (`TOAST_AUTO_HIDE_MS`), `apps/client/src/map.ts:18-20` (จุดกลางและ zoom เริ่มต้น), `apps/client/src/debug/hud-panel.ts:83` (`FOLLOW_ACTIVE_WINDOW_MS`) | ค่า UI ที่ตั้งชื่อเป็น const ในโค้ด · ไม่ใช่ balance และไม่กระทบรางวัลจึงไม่ผิด NN-3 แต่เป็นค่าที่ UX อาจอยากปรับ | gameplay-programmer (Phase 2) | no | Phase 2: ย้ายไป `config/app/client.json` เมื่อแตะไฟล์เหล่านี้ (จุดกลางแผนที่ควรมาจาก play area ใน `data/map/`) |

ไม่มี finding ด้าน server authority, secret จริง, PII, หรือบริการที่ต้องผูกบัตร

## 6. งานค้างของ tech-lead (Phase 1)

งานนี้เขียนได้เฉพาะ `docs/reviews/F02-tech-gate.md` จึงไม่ได้แก้ tech note และ ADR เอง · ทั้งสองข้อเป็นเอกสารล้วน ไม่กระทบโค้ดหรือ build ที่จะ deploy · ขอเปิดงาน `X` ของ tech-lead หนึ่งงาน (writes: `docs/tech/F02-map-location-spike.md`, `docs/adr/0001-repo-layout.md`) ก่อน P1-CLOSE-QA

| id | ไฟล์และบรรทัด | ต้องแก้อะไร |
| --- | --- | --- |
| T-01 (N-2) | `docs/tech/F02-map-location-spike.md:424` | ยังอ้าง `config/balance/unlocks.json#home.outOfServiceAreaThreshold_m` ที่ถูกลบใน P1-X18 · แก้เป็น: สถานะ "นอกพื้นที่" = ตำแหน่งอยู่นอกรูของ `data/map/playarea-mask.geojson` (D-064, D-043) และ "ไกล" ใช้ `farDungeonThreshold_m` · geometry ชุดเดียวกันใช้ฝั่ง server ใน Phase 3 |
| T-02 | `docs/adr/0001-repo-layout.md` หัวข้อ 3.5 (บรรทัด 100) | ยังเขียนว่าให้ใช้ override ของ `eslint.config.js` สำหรับ `tools/sim/src/vectors*.ts` ขัดกับ D-062 และ `eslint.config.js:79-82` ที่ตัดสินว่าไม่มี override · แก้เป็น "ไม่มี override · vectors อ่านกรณีขอบจาก `SimParams`/`EconomyRefs` และค่าตัวอย่างเป็น const ที่ตั้งชื่อ" · บรรทัด 327 (handoff ของ P1-H01 ที่ให้ tech-lead ทำ override) ให้ขีดว่ายกเลิกตาม D-062 |
| T-03 | ADR 0001 หัวข้อ 3.6 | เพิ่ม pytest bridge (`tools/coverage/pipeline/tests/`, `tools/coverage/boundaries/tests/`) ใน include ของ Vitest และความหมายของ `COVERAGE_PYTEST_REQUIRED=1` (skip เมื่อไม่มี venv ในเครื่อง, บังคับใน CI) |
| T-04 | ADR 0001 หัวข้อ 3.10.1 และ 3.10.3 | บันทึกผล P1-X05 / D-062: `telemetry.json` อยู่ `config/app/` (ไม่กระทบกฎหรือรางวัล) · ชื่อ `maxAspectRatio` และ `reportThreshold` ผ่านเกณฑ์ 3.10.3 (ไม่มีหน่วยเพราะเป็นอัตราส่วนและจำนวนนับ) · `timeout_ms` / `maximumAge_ms` เป็นชื่อตาม suffix |
| T-05 | ADR 0001 หัวข้อ 3.11 | เพิ่มว่า test ของ Python รันผ่าน Vitest bridge จาก `pnpm test` และ CI สร้าง `tools/coverage/.venv` จาก `requirements.txt` (cache ตาม hash) · เพิ่มแถวในตาราง revision ท้าย ADR อ้าง P1-X05, P1-X07, D-062, D-068 |

ข้อเตือนสำหรับ Phase 2–3 (ไม่ใช่งานของ Phase 1):

- tech note F07/F08 ต้องมี `verification_mode` และ `floor_level` ใน data model และ `position_log` TTL 24 ชม. ตาม NN-5 และ NN-7 (ADR 0002 ครอบเฉพาะ stack)
- Phase 2 ย้าย geometry และ movement gate เข้า `packages/shared` พร้อม test vectors ก่อนมีผู้ใช้ฝั่ง server · HUD ของ spike ใช้ตัวเดียวกัน (F-05)
- config lint (ตรวจ convention 3.10 อัตโนมัติ) ยกไป Phase 2 ตาม D-062
