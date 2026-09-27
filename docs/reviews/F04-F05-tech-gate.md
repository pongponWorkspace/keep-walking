# Tech gate F04 + F05 — Dungeon Presence และ Movement Gate / Reward Tick

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F05-T15 (review-gate) |
| ผู้ตรวจ | tech-lead |
| วันที่ | 2026-09-27 |
| ฐานที่ตรวจ | commit `d6f77a7` (HEAD) ใน worktree แยก `/tmp/tg-head` (`git worktree add --detach`, `pnpm install --offline --frozen-lockfile`) · เหตุผล: ระหว่างตรวจ working tree หลักมีงานที่ยังไม่ commit ของ P2-X34 (`packages/shared/src/session/*`) และ P2-X37 / F06-T08 (`apps/client/src/f04-app.ts`, `config/app/client.json`, `config/content/copy.th.json`) เปลี่ยนอยู่ · เลขบรรทัดในรายงานนี้อ้าง HEAD `d6f77a7` |
| ขอบเขต | `apps/client/src/**` (F04: P2-F04-T21, P2-X21 · F05: P2-F05-T10), `packages/shared/src/{session,reward,run,formulas,hp,config}`, `packages/geo`, `tools/config-lint`, `tools/dungeons`, `qa/tests/F04`, `eslint.config.js`, ADR 0003, tech note F04 และ F05 |
| **verdict F04** | **NEEDS_CHANGES** (blocking: TG-01, TG-02, TG-04, TG-05, TG-07) |
| **verdict F05** | **NEEDS_CHANGES** (blocking: TG-02, TG-03, TG-06) |
| **verdict รวม** | **NEEDS_CHANGES** (ตามเงื่อนไข game-director ของ board: feature ใดไม่ผ่าน = รวมไม่ผ่าน) |

## 0. สรุป

- **สถาปัตยกรรมตรง ADR 0003.** game core เป็น reducer pure ใน `packages/shared` ที่ client เรียกผ่าน `@keep-walking/shared/session` ทางเดียว (lint บังคับ) · `packages/geo` เป็น leaf จริง · ไม่มี Ajv / `eval` / `new Function` ใน runtime · นาฬิกาและ RNG ฉีดเข้าจากนอก (`now_ms`, `runSeed`) · client ไม่คำนวณ gate, tick, drop, exp หรือ HP เอง · ทุกรางวัลมาจาก event ของ `sessionStep` · ไม่มีพิกัดใน log, telemetry หรือ `kw.p2.session` หลัง P2-H02
- **typecheck, test และ build ผ่าน · lint ไม่ผ่าน** ที่ HEAD เพราะ prettier ล้ม 6 ไฟล์ (TG-02) · ESLint, copy lint, config lint และ dungeon validator ผ่าน · golden vector ทั้งหมดผ่าน ยกเว้นข้อที่ QA ทำเครื่องหมาย `it.fails` ไว้สำหรับ BUG-P2-002
- **เหตุที่ไม่ผ่าน** ไม่ใช่ปัญหาโครงสร้าง แต่เป็นข้อบกพร่องเฉพาะจุดที่แก้ได้ในรอบเดียว:
  - F04: check-in แบบ teleport ยังผ่านได้ (BUG-P2-002 · P2-X34 กำลังแก้) · hook ทดสอบสองตัวทำงานใน build จริงโดยไม่มีด่าน · ขั้นระยะที่แสดงบนจอถูก hardcode ซ้ำกับ config
  - F05: `?seed=` ทำงานนอก `loc=mock` ทำให้ client เลือก `runSeed` เองได้ ซึ่งขัด tech note F04 17 · `RunSummary.expGained` / `levelsGained` เป็น 0 ตายตัว (P2-X35)
  - ทั้งสอง feature: `pnpm lint` แดง
- คำตัดสินสองข้อที่ brief ขอ (หัวข้อ 6): กฎ `#hud { position: absolute; inset: 0 }` **รับเป็นกฎ layout ฐาน** · hook `?e2eClassId` และ `?e2eSkipF04App` **อยู่ในโค้ด production ได้เมื่อมีด่าน `loc=mock` แบบเดียวกับ `start` / `seed` เท่านั้น** (ตอนนี้ไม่มีด่าน จึงเป็น TG-04, TG-05)

## 1. หลักฐานที่รัน

ทุกคำสั่งรันที่ `/tmp/tg-head` (HEAD `d6f77a7`) บน macOS, Node 24, pnpm 11.24.0 เว้นแต่ระบุ

| คำสั่ง | ผล |
| --- | --- |
| `pnpm exec eslint . --max-warnings=0` | exit 0 · 0 error 0 warning |
| `pnpm exec prettier --check .` | **exit 1** · 6 ไฟล์ (หัวข้อ 7) |
| `pnpm run lint:copy` | exit 0 · มีแต่ WARN S7 (ตัวแปรที่ยังไม่ใช้ เช่น `{raidDay}` ของ Phase ถัดไป) |
| `pnpm lint` (= eslint && prettier && lint:copy) | **exit 1** เพราะ prettier |
| `pnpm run lint:config` | exit 0 · `config-lint: 20 files, 0 errors, 2 warnings, 0 allowed, 0 stale` (warning 2 ข้อเป็น `null` ของ enhance / raid ซึ่งอยู่นอก F04/F05) |
| `pnpm run dungeons:build -- --check` | exit 0 · `records 20 · published 13 · in artifact 13 · errors 0 · warnings 31` · `dungeons.client.v1.json is up to date` |
| `pnpm typecheck` | exit 0 (root + geo, shared, copy-lint, client) |
| `pnpm test` | exit 0 · `Test Files 163 passed / 2 skipped (165)` · `Tests 2491 passed / 1 expected fail / 4 skipped (2496)` |
| `pnpm build` | exit 0 · `maplibre-gl` chunk 1,010.51 kB (warning ของ Vite ขนาด chunk เป็นเรื่องเดิมที่ F06-T16 วัดงบแล้ว) |

- **1 expected fail** = `qa/tests/F04/session-checkin-lifecycle.test.ts:44` (`it.fails` ของ BUG-P2-002) · ต้องพลิกเป็น `it` เมื่อ P2-X34 เสร็จ
- **skipped** = 2 ไฟล์ pytest bridge ของ `tools/coverage` และ test ของ `tools/tiles` (worktree ไม่มี `.venv` / tool ของ tiles · ใน working tree หลักที่มีเครื่องมือครบรันได้ 165/165 ไฟล์) และ 2 test `it.skip` แบบ PENDING ของ `qa/tests/F02/hud-panel-blackbox.test.ts:67,119` (F02 · e2e ครอบแล้ว)
- **working tree หลัก (ข้อมูลประกอบ ไม่ใช่ฐานของ verdict):** `pnpm test` 2493 passed · `pnpm typecheck` และ `pnpm build` ผ่าน · ESLint แดง 1 ข้อที่ `packages/shared/src/session/types.ts:5` (`GateFilterState` import แล้วไม่ใช้) ซึ่งเป็นงานค้างของ P2-X34 (TG-14)
- e2e ไม่ได้รันในรอบนี้ (brief ระบุว่าไม่บังคับ · gameplay รายงาน 30/30)

## 2. ผลตรวจตามรายการของ brief

| ข้อ | ผล | หลักฐาน |
| --- | --- | --- |
| ADR 0003 3.1 โมดูลและเจ้าของ | ผ่าน | โฟลเดอร์ `packages/shared/src/{formulas,config,run,reward,hp,session}` และ `packages/geo/src` ตรงตาราง · ไม่มีโค้ด Worker / DO / D1 ใน Phase 2 |
| ADR 0003 3.1 ทิศ import ภายใน shared | ผ่าน | ข้าม engine มีแค่ `import type`: `reward/gate.ts:32` (`DungeonSample` จาก run), `hp/types.ts:4` (`PlayerClass` จาก reward) · `session` import ได้ทุกโฟลเดอร์ · ไม่พบวง import ค่า |
| C1-2 lint และ tsconfig | ผ่าน | `eslint.config.js`: `IMPURE_GLOBALS` / `IMPURE_PROPERTIES` / `IMPURE_SYNTAX` บน `GAME_CORE_SRC` · `CLIENT_ENGINE_BAN` บน `apps/client/**/*.ts` · `GEO_LEAF_BAN` บน `packages/geo/**/*.ts` (รวม test) · `packages/geo/tsconfig.json` `lib: ["ES2023"], types: []` · shared ใช้ `tsconfig.base.json` เดียวกัน (strict) · ESLint 0 error |
| C1-3 สัญญา reducer | ผ่าน | `sessionStep(state, input, now_ms, params)` ใน `packages/shared/src/session/reducer.ts` · state JSON ล้วน มี `schemaVersion` · `runSeed` เป็นข้อมูลใน input `confirm` (`apps/client/src/f04-app.ts:191`) ไม่ใช่ function · ไม่มี timer ใน shared (lint) |
| C1-4 ไม่มี Ajv / eval / `new Function` ใน runtime | ผ่าน | `ajv`, `ajv-formats` อยู่ใน `devDependencies` ของ `packages/shared/package.json` เท่านั้น · `apps/client` และ `packages/geo` ไม่มี Ajv · grep `new Function` / `eval(` ใน runtime พบแค่ comment · `src/config` ตรวจด้วยโค้ดธรรมดา |
| C1-5 namespace `kw.p2.` | ผ่าน | key ที่ client สร้าง: `kw.p2.session` (`session/engine.ts:27`), `kw.p2.telemetry` (`f04-app.ts:44`) · การลบข้อมูลในเครื่องลบตาม prefix (`storage/clear-local-data.ts:35`) |
| client เรียก `@keep-walking/shared/session` เท่านั้น | ผ่าน (มีข้อสังเกต TG-11) | import จาก client: `shared/session` 18 จุด, `geo` 9, `location` 16, ราก `shared` 6 (trace, copy · ของเดิม), `shared/formulas` 2 และ `shared/config` 1 (type) เฉพาะใน `session/config.ts` เพื่อประกอบ `SessionParams` · ไม่มี `run` / `reward` / `hp` หรือ path ลึก |
| `packages/geo` เป็น leaf | ผ่าน | `packages/geo/package.json` ไม่มี `dependencies` · import ใน `src` และ `test` มีแค่ path ภายใน, `geojson` (type), `vitest`, `node:fs` |
| ไม่มี logic แตกสาขาใน client | ผ่าน (มีข้อสังเกต TG-09, TG-11) | การตัดสิน tick / drop / exp / HP / check-in มาจาก event ของ `sessionStep` เท่านั้น (`f04-app.ts:335-363` ใช้ `event.loot`, `firstEver`, `levelBefore/After` ตรง) · geo ใน client ใช้เพื่อแสดงผล: popup confirm (`f04-app.ts:239-285` · กด "เข้า" แล้ว engine ตัดสินเอง), ระยะถึงขอบ (`:118-121`), HUD (`debug/stats.ts`), home-state · `dungeons/direction.ts` และ `map/geo-circle.ts` เป็นเรขาคณิตของการวาดเท่านั้น |
| config ไม่ hardcode รวมชื่อสถานที่ | **ไม่ผ่าน** (TG-07) | ไม่มีชื่อสถานที่หรือข้อความไทยในโค้ด runtime (grep ช่วง U+0E00–0E7F พบแค่ `CELL_FILLER_CHAR` ของ Phase 1) · ชื่อ dungeon มาจาก `name_key` ของ artifact · แต่ `f04-app.ts:46-50` คัดลอก `unlocks.home.distanceDisplaySteps_m` เป็นค่าคงที่ในโค้ด |
| schema + config lint (P2-F04-T24) | ผ่าน | 0 error · ตรวจเงื่อนไขข้ามไฟล์ของ C2-5 ที่ `tools/config-lint/src/cross.ts:58-95` |
| dungeon validator (P2-F04-T26) | ผ่าน | `--check` 0 error, artifact ตรงกับที่ commit |
| นาฬิกาและ RNG ฉีดเข้าได้ | ผ่าน (มีข้อบกพร่อง TG-03) | `clock/game-clock.ts:45-49` เลือก Web (`Date.now`) หรือ Mock (`replayStart_ms + position()`) · `start` อ่านเฉพาะ Mock ถูกต้อง · `runSeed` จาก `crypto.getRandomValues` (`f04-app.ts:107-108`) · ใน shared ห้าม `Date.now` / `Math.random` / `crypto.*` ด้วย lint |
| golden vector | ผ่าน | `packages/shared/src/formulas/vectors.test.ts`, `packages/geo/test/vectors.test.ts`, `packages/shared/src/run/*.test.ts`, `qa/tests/traces/*` อ่าน `design/systems/test-vectors/{movement-gate,reward-window,tick-reward,run-loop,run-state,speed-lock,check-in,opening-hours,partial-tick,drops,exp-curve}.json` · ทั้งหมดเขียว · ช่องโหว่ teleport ถูกจับโดย black-box ของ QA ไม่ใช่ vector (TG-01) |
| ไม่มีพิกัดใน log / telemetry / storage หลังจบ run (P2-H02) | ผ่าน | `packages/shared/src/session/persistence.ts:109-133` `stripCoordinates` ใช้ทั้งตอน `toPersisted` (`:143`) และ `fromPersisted` (`:166`): `latestSample`, `lock.lastAccurate`, `filter.anchor/pending`, `grid.last/lastPoint` · `pre` ไม่ persist · `console.*` ใน runtime 11 จุด ไม่มีจุดใดพิมพ์พิกัด · test: `qa/tests/F04/session-persist-privacy.test.ts:140-154` (storage และ telemetry ผ่าน sink จริง) |

### 2.1 C2-1..C2-5 (D-088, tech note F04 11–12)

| ข้อ | ผล | หลักฐาน |
| --- | --- | --- |
| C2-1 ไม่มีข้อมูลออกจากเครื่อง | ผ่าน | `fetch` มีแค่ GET ของ asset manifest (`main.ts:201`), style / tile / sprite / GeoJSON (`map/*.ts`) · ไม่มี `sendBeacon`, `XMLHttpRequest`, `WebSocket`, analytics SDK · raw trace เป็นไฟล์ download ที่ผู้ใช้กดเองหลัง `hud=1` (F02) |
| C2-2 telemetry อยู่ในเครื่อง | ผ่าน | ring buffer ใน `kw.p2.telemetry` (`telemetry/sink.ts`) · ชื่อ event ตรวจกับ `KNOWN_EVENT_NAMES` (`telemetry/known-events.ts`) ที่ test แยกหัวข้อจาก `product/telemetry-events.md` · ชื่อที่ไม่รู้จักถูกทิ้ง (`sink.ts:92`) |
| C2-3 ไม่มีพิกัดใน event / export | ผ่าน | `SessionEvent` ไม่มี field พิกัด · sink ตรวจ `forbiddenPropertyNames` และ `coordinateLikeNumberGuard` ตอนรับ และ `telemetry/export.ts` ตรวจซ้ำตอน export |
| C2-4 เวลา relative | ผ่าน | export ใช้ `t_rel_ms` ไม่มี `client_ts_ms` (`telemetry/export.ts`) |
| C2-5 เก็บ sample ไม่เกินที่หน้าต่างต้องใช้ | ผ่าน (มีข้อสังเกต TG-12) | state ไม่มีรายการ sample · buffer `pending` ของตัวกรองถูกตัดที่ `outlierReanchorSamples` (`packages/geo/src/filter.ts:79-84`) · storage ไม่มีพิกัดเลยหลัง P2-H02 ซึ่งเข้มกว่าเพดาน 11.1 |

## 3. F04 — Dungeon Presence: verdict **NEEDS_CHANGES**

สิ่งที่ผ่าน: สัญญา `session` (tech note F04 2), PresenceStrategy + hysteresis + backdating (5, 7), speed lock ฝั่งผู้เล่น (6), เวลาทำการใน `src/run` และ `selectOpening` (8), persistence + ทิ้งแล้วเริ่มใหม่ (10), artifact ของ dungeon (13), config กลุ่ม A/B/C (15 · ตรวจ bundle แล้วไม่มี key ของกลุ่ม C เป็นค่า มีแค่ในข้อความ `_note` ดู TG-13), telemetry sink (12), ไม่มี code path ส่ง `emergencyClose` จาก client (2.4)

| ID | severity | file:line (HEAD `d6f77a7`) | finding | owner | blocking | งาน |
| --- | --- | --- | --- | --- | --- | --- |
| TG-01 | high | `packages/shared/src/session/reducer.ts:817-823` | **BUG-P2-002:** `usableAndUnlocked = accuracyOk && !lock.locked` ไม่ผ่านตัวกรอง outlier ความเร็ว (ADR 0003 5.3 ขั้น 1, `outlierSpeed_kmh`) · teleport เข้า polygon ครั้งเดียวยังนับเป็นหลักฐาน "เห็นจากข้างนอก" และไม่ตัดสาย approach · check-in แบบ teleport จึงผ่าน `sessionStep` ได้ ขัด `anticheat.checkIn.teleportIntoPolygonAllowed = false` (F04-R07, E5) · หลักฐาน: `qa/tests/F04/session-checkin-lifecycle.test.ts:44` `it.fails` | backend-programmer | yes | P2-X34 (กำลังทำ) · ปิดเมื่อ `it.fails` พลิกเป็น `it` แล้วเขียว และ lint สะอาด (TG-14) |
| TG-04 | medium | `apps/client/src/f04-app.ts:149`, `apps/client/src/clock/query-params.ts:101`, `apps/client/src/session/engine.ts:35-39` | hook `?e2eClassId` อ่านทุก build ทุก provider ไม่มีด่าน `loc=mock` · URL ธรรมดาของ build playtest / production เลือก class ข้าม onboarding ได้ · ชื่อ param เป็น literal ในโค้ด ต่างจาก `start` / `seed` ที่อ่านจาก `config/app/client.json#providerQuery.paramNames` · comment ใน `engine.ts:37` บอกว่า "main.ts only reads the query param under `?loc=mock`" ซึ่งไม่จริง · แก้ตามคำตัดสิน 6.2 | gameplay-programmer | yes | X ใหม่ (รวมกับ TG-03, TG-05) |
| TG-05 | low | `apps/client/src/main.ts:217`, `apps/client/src/env.ts:98` | hook `?e2eSkipF04App` ไม่มีด่านเช่นกัน · ผลคือปิด game loop ทั้งหมด ไม่ให้ประโยชน์กับผู้เล่น แต่ลิงก์ที่ติด param นี้ทำให้เกมเงียบโดยไม่มีข้อความ · แก้ตามคำตัดสิน 6.2 | gameplay-programmer | yes (แก้พร้อม TG-04 ต้นทุนต่ำ) | X เดียวกับ TG-04 |
| TG-07 | medium | `apps/client/src/f04-app.ts:46-50` (ใช้ที่ `:314`) | **config-not-hardcode:** `DISTANCE_STEPS` คัดลอกค่า `config/balance/unlocks.json#home.distanceDisplaySteps_m` เป็นค่าคงที่ในโค้ด ทั้งที่ค่านี้อยู่ใน balance subset ที่ client โหลดอยู่แล้ว (`config/generated/balance-subset.generated.json` key `distanceDisplaySteps_m`) · ถ้า systems-designer เปลี่ยนค่า จอจะไม่เปลี่ยนตาม และ vector `displayDistance` ของ `opening-hours.json` จะยังเขียวทั้งที่จอผิด · อ่านจาก subset แทน | gameplay-programmer | yes | รวมใน P2-X37 ได้ (แตะบรรทัดเดียวกับ C-03) |
| TG-08 | medium | `apps/client/src/f04-app.ts:247-285` | **BUG-P2-003:** เดินเข้า dungeon ที่ปิดครั้งแรกไม่ขึ้น popup B4 (`showClosed` ไม่ถูกเรียกบนเส้นทาง walk-in) · ไม่กระทบ server authority (ไม่มีปุ่ม "เข้า") | gameplay-programmer | no (สำหรับ tech gate) | P2-F06-T08 |
| TG-09 | low | `apps/client/src/map/geo-circle.ts:12` | สำเนา `EARTH_RADIUS_M = 6_371_008.8` ขัด ADR 0003 4.1 ("client ... ใช้ค่านี้จาก geo ตัวเดียว") · ใช้ `EARTH_MEAN_RADIUS_M` จาก `@keep-walking/geo` | gameplay-programmer | no | ครั้งถัดไปที่แตะไฟล์ |
| TG-10 | low | `apps/client/src/f04-app.ts:205` | `speedLockOverlay.onExit` เรียก `engine.dispatch` แต่ไม่ส่ง event ต่อให้ `handleSessionEvents` (ต่างจาก `runBar.onExitConfirmed` ที่ `:199`) · `dungeon_exited` จากทางนี้จึงไม่ล้างป้ายใกล้ปิด · telemetry ยังถูก map ครบใน `engine.dispatch` | gameplay-programmer | no | P2-X37 หรือ F06-T08 |

ข้อที่รู้แล้วและติดตามใน P2-X37 (จาก copy gate P2-F05-T17 · ยืนยันว่าไม่ใช่การ hardcode ชื่อสถานที่ เพราะชื่อยังมาจาก key ของ content):

- C-01 ชื่อ dungeon ค้นจาก `copy.th.json` แทน `names.th.json` (`ui/dungeon-confirm.ts:88,104`, `dungeons/artifact.ts:85`)
- C-03 หน่วย `'m'` เป็น literal (`f04-app.ts:314`) แทน `unit.m` / `unit.km`
- C-04 `{openTime}` ได้ epoch ms ดิบ (`f04-app.ts:321` `String(openTime)`)

## 4. F05 — Movement Gate, Reward Tick และ Drop: verdict **NEEDS_CHANGES**

สิ่งที่ผ่าน: `rewardWindow` แยกจาก `gateDiagnosticWindows` (ADR 0003 5.1–5.2), ตัวกรอง + resample + สะสมระยะใน geo (5.3), การย้อน τ และตัวสะสม scratch (tech note F05 3.4–3.5), gate `greaterThan` เดียวทุกทางที่ให้ของ รวม partial tick ของ D-059 (vector `partial-tick.json`), drop ผ่าน `rollTickLoot` ที่ seed จาก `runSeed` + ลำดับ tick (ADR 0003 6), toast และสรุป run ใช้ค่าจาก event / `RunSummary` เท่านั้น (`f04-app.ts:348-360`, `ui/tick-toast.ts`, `ui/run-summary.ts`) · ยามาจาก loot เท่านั้น: `bag` ถูกเขียนที่ `reducer.ts` (`bagRemoveOne` ตอนใช้ยา, `EMPTY_BAG` ตอนเริ่ม run, การเพิ่มจาก loot ของ tick) ไม่มีทางอื่น (tech note F05 5 ข้อ 4)

| ID | severity | file:line (HEAD `d6f77a7`) | finding | owner | blocking | งาน |
| --- | --- | --- | --- | --- | --- | --- |
| TG-03 | medium | `apps/client/src/f04-app.ts:101-106` | `resolveRunSeed()` อ่าน `?seed=` ทุก build ทุก provider · tech note F04 17 แถว "seed ของ RNG" กำหนด "เฉพาะ `loc=mock`" และ header ของ `clock/query-params.ts:1-5` ก็อ้างอย่างนั้น · ผลคือผู้เล่นบน Web provider เลือก `runSeed` เองได้ ทำให้ลำดับ drop และ hit ทำนายได้ · Phase 2 ไม่มีรางวัลจริง (C1-1) แต่เป็นค่าที่มีผลต่อรางวัลซึ่ง client เลือกได้นอกจากตำแหน่งกับเวลา จึงต้องปิดก่อนเป็นแบบให้ Phase 3 · แก้: อ่าน seed เฉพาะเมื่อ provider เป็น Mock (ใช้ `isMockProvider` แบบเดียวกับ `createGameClock`) และเพิ่ม unit test ว่า Web provider ไม่อ่าน `seed` | gameplay-programmer | yes | X ใหม่ (รวมกับ TG-04, TG-05) |
| TG-06 | medium | `packages/shared/src/session/reducer.ts:395-396` | **P2-X35:** `RunSummary.expGained = 0` และ `levelsGained = 0` ตายตัวใน `endRun` ทั้งที่ `run_tick_granted` ให้ exp จริง (`reducer.ts:239,282,350`) · `RunState` ไม่มีตัวสะสม · สรุป run (Flow B2) จึงแสดงค่าผิดจากสัญญา · แก้ใน engine (สะสมใน `RunState` แล้วอ่านตอนจบ) ไม่ใช่รวมยอดใน client | backend-programmer | yes | P2-X35 |
| TG-11 | low | `apps/client/src/session/config.ts:1-335` | client ประกอบ `SessionConfig` จาก balance subset เอง (map ทีละ field + `dropParamsFromConfig`) · ถูกต้องตามสัญญา tech note F04 2.2 ใน Phase 2 แต่ Phase 3 server ต้องทำ mapping เดียวกันจากไฟล์เต็ม ถ้าเขียนซ้ำจะเป็น logic สองชุดที่ drift ได้ · เสนอย้ายเป็น `sessionConfigFromBalance(raw)` ใน `@keep-walking/shared/session` ก่อน F08 (client ส่ง subset, server ส่งไฟล์เต็ม) | backend-programmer (ย้าย), tech-lead (สัญญา) | no | decision ใหม่ (หัวข้อ REPORT) · งาน Phase 3 |

## 5. ข้อที่กระทบทั้งสอง feature

| ID | severity | file:line | finding | owner | blocking | งาน |
| --- | --- | --- | --- | --- | --- | --- |
| TG-02 | medium | 6 ไฟล์ในหัวข้อ 7 | `pnpm lint` exit 1 ที่ HEAD เพราะ `prettier --check` · CI job lint จะแดง · แก้ด้วย `pnpm exec prettier --write <ไฟล์>` แล้วรัน `pnpm lint` ให้ exit 0 · ไม่มีการเปลี่ยน logic | ตามหัวข้อ 7 | yes | X ใหม่ต่อเจ้าของ หรือ orchestrator รวมเป็นงานเดียว |
| TG-12 | low | `docs/tech/F04-dungeon-presence.md` 11.1, `packages/shared/src/session/persistence.ts:136-138` | `app.privacy.onDeviceSamples.{maxAge_s,maxCount,deleteOnRunEnd}` ถูกตรวจโดย config lint แต่ไม่มีโค้ด runtime อ่าน · ข้อความ 11.1 "ถูกลบทุก step และตอนโหลด" และ comment ใน persistence ("caps ... are `sessionStep`'s own job on every step") จึงไม่ตรงโค้ด · ผลต่อความเป็นส่วนตัวไม่มี เพราะเพดานเป็นจริงโดยโครงสร้าง (TG C2-5) และ storage ไม่มีพิกัดเลย · แก้เอกสารให้ตรง (เพดานเชิงโครงสร้าง + strip ทั้งหมดตอน persist) หรือเพิ่ม test ที่ assert เพดานจากค่า config | tech-lead (tech note), backend-programmer (comment) | no | งานต่อของ tech-lead |
| TG-13 | low | `apps/client/src/location/traces.ts:29`, `apps/client/src/config/telemetry.ts:9` | build production มี chunk ของ fixture e2e (`e2e-full-run-01`, `qa-e2e-*`) และข้อความ `_note` / `_source` ของ `config/app/*.json` · ไม่มีข้อมูลผู้เล่นหรือความลับ (trace เป็น synthetic / QA ที่อยู่ใน repo สาธารณะแล้ว) · เสนอให้ glob ของ e2e fixture อยู่หลังด่านเดียวกับหัวข้อ 6.2 และตัด key `_` ตอน generate subset เพื่อขนาด bundle | gameplay-programmer | no | ครั้งถัดไปที่แตะไฟล์ |
| TG-14 | info | `packages/shared/src/session/types.ts:5` (working tree ไม่ใช่ HEAD) | งานค้างของ P2-X34 ทำให้ ESLint แดง (`GateFilterState` import แล้วไม่ใช้ ณ เวลาที่รัน) · X34 ต้องส่งมอบพร้อม `pnpm lint` exit 0 | backend-programmer | no (ติดตามใน X34) | P2-X34 |

## 6. คำตัดสินที่ brief ขอ

### 6.1 กฎ `#hud { position: absolute; inset: 0 }` (P2-F05-T10, `apps/client/src/app.css:51-62`) — **รับเป็นกฎ layout ฐาน**

- เหตุผล: `#map` เป็น `position: absolute` ส่วน `#hud` เดิมไม่ได้ position จึงถูกวาดก่อน `#map` ตาม CSS2.1 Appendix E และทุกจอที่ mount ใน `#hud` โดยไม่มี position ของตัวเองมองไม่เห็นและกดไม่ได้ · การแก้ที่ต้นทางครั้งเดียวดีกว่าให้ทุกจอจำเอง · `inset: 0` ตรงกับกล่องของ `#app` / `#map` จึงไม่ขยับลูกที่ position อยู่แล้ว
- `pointer-events: none` บน `#hud` + `auto` บนลูกตรง (`#hud > *`) ทำให้ gesture ของแผนที่ผ่านพื้นที่ว่างได้ ถือเป็นส่วนหนึ่งของกฎ
- เงื่อนไขของกฎ (บันทึกเพื่อ F06 และจอถัดไป):
  1. จอที่เป็น overlay เต็มจอ (`.popup-overlay`, `.overlay-speedlock`, `.screen.run-summary`) เป็นลูกตรงของ `#hud` จึงรับ pointer ทั้งกล่อง ซึ่งถูกต้องสำหรับ modal · องค์ประกอบที่ไม่ใช่ modal ห้ามทำกล่องใสเต็มจอ เพราะจะบังการลากแผนที่
  2. ลำดับชั้นตอนนี้อาศัยลำดับ DOM (ไม่มี `z-index`) · เมื่อมีจอซ้อนกันมากขึ้นใน F06 (pocket screen, HP overlay) ให้กำหนดสเกล `z-index` เป็น token ใน `design/ux/tokens.json` แทนเลขในแต่ละไฟล์ (handoff ถึง uiux-designer · ไม่ blocking)
  3. ห้ามลูกของ `#hud` ใช้ `position: fixed` เพื่อหนีกฎนี้

### 6.2 hook ทดสอบ `?e2eClassId` และ `?e2eSkipF04App` — **อยู่ในโค้ด production ได้ ภายใต้เงื่อนไข**

กฎเดียวสำหรับ query hook ที่ใช้ทดสอบทุกตัว (`start`, `seed`, `e2eClassId`, `e2eSkipF04App` และตัวที่เพิ่มในอนาคต):

1. **ด่าน:** อ่านค่าเฉพาะเมื่อ provider ที่เลือกได้เป็น Mock (`isMockProvider(provider)` หรือ `selection.provider === 'mock'`) · Web / Capacitor ไม่ parse เลย · `start` ทำถูกแล้ว (`clock/game-clock.ts:45-49`) · `seed`, `e2eClassId`, `e2eSkipF04App` ยังไม่ทำ (TG-03, TG-04, TG-05)
2. **ชื่อ param อยู่ใน config:** `config/app/client.json#providerQuery.paramNames` (เพิ่ม `e2eClassId`, `e2eSkipF04App`) ไม่เป็น literal ในโค้ด
3. **ทางเดียวกับของจริง:** hook ต้องส่ง input ชนิดเดียวกับที่ UI จริงส่ง (`chooseClass` ผ่าน `sessionStep`) ไม่เปิด code path ที่ให้ของหรือข้าม gate · `e2eClassId` ผ่านข้อนี้แล้ว (`session/engine.ts:98-108` ใช้เฉพาะเมื่อ `classId === null`)
4. **ไม่มีผลต่อรางวัลที่ไม่ได้มาจากการเดิน:** `seed` เป็นข้อยกเว้นที่ยอมรับเฉพาะใต้ด่านข้อ 1 เพราะ Mock ไม่ใช่การเดินจริงอยู่แล้ว · Phase 3 เมื่อ server ถือ `runSeed` hook นี้ต้องหายจาก client (tech gate F08 ตรวจ)
5. **test:** แต่ละ hook มี unit test ว่า Web provider ไม่อ่านค่า (ทำให้ข้อ 1 ไม่ถอยหลังเงียบ ๆ)

เหตุผลที่ไม่ย้ายไปไว้หลัง `import.meta.env.MODE !== 'production'`: e2e ของ CI รันกับ build production (`vite preview`) และ playtest ใช้ Mock ผ่าน query ตาม tech note F04 17 แถว build profile · ด่าน Mock จึงเป็นเส้นที่ถูก: ใครก็ตามที่ใช้ Mock ไม่ได้เดินจริงและไม่ได้รางวัลที่มีความหมายตั้งแต่ต้น

## 7. prettier: ไฟล์และเจ้าของ (TG-02)

ผลของ `pnpm exec prettier --check .` ที่ HEAD (ตรงกับ working tree หลัก):

| ไฟล์ | commit ล่าสุด | เจ้าของ |
| --- | --- | --- |
| `apps/client/e2e/full-run.spec.ts` | `d6f77a7` (P2-F05-T10) | gameplay-programmer |
| `apps/client/src/assets/audio-player.test.ts` | `d6f77a7` (P2-F05-T10) | gameplay-programmer |
| `apps/client/src/ui/tick-toast.ts` | `d6f77a7` (P2-F05-T10) | gameplay-programmer |
| `packages/shared/src/run/hysteresis.ts` | `40b2d47` (P2-F04-T20 / P2-X10) | backend-programmer |
| `packages/shared/src/run/run-timeline.ts` | `40b2d47` (P2-F04-T20 / P2-X10) | backend-programmer |
| `qa/tests/F02/hud-flag-gate.test.ts` | `40b2d47` | qa-tester |

- ไฟล์ทั้งหกเป็นเรื่อง format ล้วน ไม่มีเหตุผลที่ต้องยกเว้นใน `.prettierignore` · เสนอให้ orchestrator รวมเป็นงาน fix เดียวที่รัน `pnpm exec prettier --write` กับหกไฟล์นี้ (เจ้าของแต่ละไฟล์ไม่ต้องแก้ logic) หรือแยกตามเจ้าของถ้า `writes` ของ wave ชนกัน · `packages/shared/src/run/` ไม่ชนกับ P2-X34 (X34 ถือ `src/session/`)

## 8. เงื่อนไขของการรัน gate ซ้ำ (รอบ 2 ตรวจเฉพาะรายการนี้)

| feature | ต้องปิดก่อน | วิธีตรวจในรอบ 2 |
| --- | --- | --- |
| F04 | TG-01 (P2-X34) | `qa/tests/F04/session-checkin-lifecycle.test.ts:44` เป็น `it` และผ่าน · trace `synthetic-teleport-spoof-01` ผ่าน `sessionStep` แล้วได้ `checkin_rejected` · state ใหม่ที่มีพิกัด (ถ้ามี เช่น `checkInFilter`) ถูก strip ใน `stripCoordinates` และมี test |
| F04 | TG-04, TG-05 | unit test ว่า Web provider ไม่อ่าน `e2eClassId` / `e2eSkipF04App` · ชื่อ param อยู่ใน `config/app/client.json#providerQuery.paramNames` · e2e ยังผ่าน |
| F04 | TG-07 | grep ไม่พบ `DISTANCE_STEPS` literal · ค่ามาจาก balance subset · test ของ `displayDistance` ใช้ค่าจาก config |
| F05 | TG-03 | unit test ว่า Web provider ไม่อ่าน `seed` · `resolveRunSeed` ใช้ `crypto.getRandomValues` เสมอเมื่อไม่ใช่ Mock |
| F05 | TG-06 (P2-X35) | test ของ engine: run ที่ได้ tick N ครั้ง → `RunSummary.expGained` = ผลรวม exp ของ `run_tick_granted` · `levelsGained` ตรงกับ `levelAfter − levelBefore` รวม · ไม่มีการรวมยอดใน client |
| ทั้งสอง | TG-02, TG-14 | `pnpm lint` exit 0 · `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0 |

ข้อที่ไม่ blocking (TG-08..TG-13) ไม่ต้องปิดก่อนรอบ 2 · TG-08 ปิดใน P2-F06-T08 · TG-11 เป็น decision สำหรับ Phase 3 · TG-12 เป็นงานเอกสารของ tech-lead
