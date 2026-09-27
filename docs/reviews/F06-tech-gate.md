# Tech gate F06 — HP, Damage และ 10 นาทีแรก

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F06-T20 (review-gate) · รอบ 1 |
| ผู้ตรวจ | tech-lead |
| วันที่ | 2026-09-28 |
| ฐานที่ตรวจ | working tree หลักที่ commit `3b7e78c` (HEAD) · ตอนเริ่มรัน (02:24) ไฟล์ที่ยังไม่ commit มีแค่ `studio/phases/phase-2/board.md` · tsc, ESLint, prettier, lint:config, vitest, build และ e2e รอบแรกรันบนสถานะนั้น · ระหว่าง 02:30–02:37 agent อื่นที่ทำงานขนานกันแก้ `config/content/copy.th.json`, `design/ux/flows/F06-*.md`, `art/direction/*.md` และ `tools/tiles/**` (copy gate, visual gate, งาน tiles) ซึ่ง `apps/client/src/**`, `packages/**` และ `config/app/**` ไม่ถูกแตะ · e2e รอบซ้ำหลัง 02:32 จึงอาจรวม `copy.th.json` ใหม่ · เลขบรรทัดในรายงานนี้อ้าง `3b7e78c` |
| ขอบเขต | `packages/shared/src/{hp,session}` (P2-F06-T06, P2-X10), `apps/client/src/**` (P2-F06-T08, T09, T10, T14, P2-X27, X28, X29, X38, X39), `config/app/*.json`, `config/balance/privacy.json`, `tools/config-lint`, `apps/client/scripts/measure-bundle.ts` + CI (P2-F04-T10, P2-F06-T16), asset + เสียงใน `dist/` (P2-F06-T07), ADR 0003, tech note F06 · **ไม่รวม** speed filter (P2-F05-T19) |
| **verdict** | **NEEDS_CHANGES** (blocking: F06-TG-01 ถึง F06-TG-06) |

## 0. สรุป

- **โครงสร้างผ่าน.** HP engine อยู่ใน `packages/shared/src/hp` เป็นฟังก์ชัน pure ที่ `session` เรียกเท่านั้น · `hp` import แค่ `../formulas`, `import type` จาก `../reward` และ `@keep-walking/geo` ตาม ADR 0003 3.1 · client import `@keep-walking/shared/session` 26 จุด ไม่มี `run` / `reward` / `hp` (lint `CLIENT_ENGINE_BAN` บังคับ, ESLint 0 error) · ทุก input ที่แตะ HP / ของ / class ไปผ่าน `engine.dispatch` (`chooseClass` `f04-app.ts:399`, `confirm` `:484`, `exit` `:502,512,643`, `usePotion` `:559,563`, `setAutoRetreat` `:589`) · ไม่มี query, input หรือปุ่มที่เพิ่ม inventory (tech note F06 13.4 แถว B-06) · ไม่มี Worker / DO / D1
- **คำสั่งที่ brief ขอผ่านทั้งหมดยกเว้นสองจุด:** `prettier --check` ล้ม 7 ไฟล์ของ `qa/tests` ทำให้ `pnpm lint` แดง (F06-TG-01) และ e2e webkit ล้ม 1 ครั้งจาก 4 รอบแบบขนานที่ `pocket-screen.spec.ts:74` (flake · F06-TG-07 ไม่ blocking)
- **เหตุที่ไม่ผ่าน** เป็นข้อบกพร่องเฉพาะจุด ไม่ใช่โครงสร้าง แก้ได้ในรอบเดียว:
  - telemetry หลักของ F06 `onboarding_first_reward_granted` ไม่ถูกยิงเลย ทั้งที่ tech note F06 10.1 กำหนดแถว mapper ไว้ และเป็นตัววัด metric "≥70% ถึงรางวัลก้อนแรกใน 10 นาที" ของ playtest (F06-TG-02)
  - ค่าคงที่ที่ควรมาจาก config: `{ttlText}` 24 ชม. (F06-TG-03 · คำตัดสิน A-P2-X38-3 ในหัวข้อ 6.2) และ `storageKeyPrefix` (F06-TG-04)
  - privacy path สองจุดไม่ตรงสัญญา tech note F06: consent ที่ไม่มี key อ่านเป็น granted (fail-open ค้างจาก F06-T09 · F06-TG-05) และ `clearLocalData` ไม่ปฏิเสธเองเมื่อมี run (8.3 · F06-TG-06)
- คำตัดสินที่ brief ขอ (หัวข้อ 6): **D-134 ACCEPT** · **A-P2-X38-3: เลื่อน `positionLogTtl_s` จากกลุ่ม C เป็นกลุ่ม B** (ไม่ทำ mirror) · A-P2-X27-1 ACCEPT · A-P2-X28 (สองข้อที่พบในโมดูล) ACCEPT · A-P2-F06-T14-1 ACCEPT · hook `e2eSkipOnboarding` ผ่าน D-130
- **C1-1 บันทึกไว้:** ใน Phase 2 client เรียก `sessionStep` เพื่อตัดสินผลของ run รวม HP, damage, ยา, การฟื้น และ exp ตามข้อยกเว้น C1-1 ของ ADR 0003 3.4 · ข้อยกเว้นนี้ **หมดอายุเมื่อเริ่ม Phase 3** · tech gate ของ F08 ต้องตรวจว่าการเรียก `sessionStep` เพื่อตัดสินผลถูกถอดจาก client, `runSeed` ย้ายไป server, hook `seed` หายจาก client และ `session/config.ts` ย้ายเข้า shared ตาม D-131

## 1. หลักฐานที่รัน

รันที่ `/Users/pongpon/Game` (HEAD `3b7e78c`) บน macOS, Node 24, pnpm 11.24.0

| คำสั่ง | ผล |
| --- | --- |
| `pnpm exec tsc -p tsconfig.json --noEmit` (root) | exit 0 |
| `pnpm typecheck` (root + geo, shared, copy-lint, client) | exit 0 |
| `pnpm exec eslint . --max-warnings=0` | exit 0 · 0 error 0 warning |
| `pnpm exec prettier --check .` | **exit 1** · 7 ไฟล์ (F06-TG-01) |
| `pnpm run lint:copy` | exit 0 · มีแต่ WARN S7 เดิม (ตัวแปรของ Phase ถัดไป เช่น `{raidDay}`) |
| `pnpm run lint:config` | exit 0 · `config-lint: 20 files, 0 errors, 2 warnings, 0 allowed, 0 stale` (2 warning เดิมของ `enhance` / `raid`) |
| `pnpm test` (root vitest) | exit 0 · `Test Files 209 passed (209)` · `Tests 2906 passed / 2 skipped (2908)` |
| `pnpm --filter @keep-walking/client build` | exit 0 · entry `index-*.js` 515.49 kB (gzip 143.78 kB) · `maplibre-gl` แยก chunk lazy 1,010.51 kB (warning ขนาด chunk ของ Vite เป็นเรื่องเดิม วัดงบด้วย script แทน) |
| `pnpm exec tsx apps/client/scripts/measure-bundle.ts` | exit 0 · `initial JS 0.115 MB (115332 B) / budget 1.000 MB` · `map lazy JS 0.350 MB (350202 B) / budget 0.700 MB` |
| `pnpm exec playwright test apps/client/e2e` (android-chrome + ios-safari) รอบแรก | **exit 1** · `49 passed / 1 failed` · ล้มที่ `[ios-safari] pocket-screen.spec.ts:78` → `enterRun` `:74` `expect(.run-bar).not.toBeHidden({ timeout: 5_000 })` |
| ซ้ำ `pocket-screen.spec.ts --repeat-each=5` | `20 passed` |
| ซ้ำทั้งชุด `--workers=1` | `50 passed (2.5m)` |
| ซ้ำทั้งชุดแบบขนานอีก 2 รอบ | `50 passed (48.0s)`, `50 passed (47.8s)` |

- **2 skipped** ใน vitest = `it.skip` แบบ PENDING เดิมของ `qa/tests/F02/hud-panel-blackbox.test.ts` (e2e ครอบแล้ว) · `it.fails` ของ BUG-P2-002 ถูกพลิกแล้ว (P2-H30) ไม่มี expected fail เหลือ
- **CI bundle (P2-F06-T16):** `.github/workflows/ci.yml:118-123` เรียก `measure-bundle.ts` หลัง build และ fail เมื่อเกินงบ · งบอ่านจาก `config/app/client.json#bundle` · วิธีวัดตรง ADR 0003 หัวข้อ 10 (manifest, static imports แบบ recursive, brotli q11)
- **asset + เสียงใน build (P2-F06-T07):** `dist/kw/asset-manifest.json` มี `url` 100 รายการ ตรวจด้วย script แล้วมีไฟล์จริงใน `dist/kw/` ครบ 100 (missing 0) · `audio` 22 cue ตรงกับ `dist/kw/audio/*.wav` 22 ไฟล์ · font UI / map และ `kw/art/**` อยู่ใน `dist` · root build = prebuild ของ `tools/art` + `vite build`

## 2. ผลตรวจตามรายการของ brief

| ข้อ | ผล | หลักฐาน |
| --- | --- | --- |
| HP engine ตาม ADR 0003 3.1 และ tech note F06 1–3 | ผ่าน | `packages/shared/src/hp/{attempt,hit,heal,regen,params,stats,types}.ts` · import ภายนอกโฟลเดอร์มีแค่ `../formulas`, `../reward` (type) และ `@keep-walking/geo` · ไม่มี `Date.now` / `Math.random` / `crypto.*` ใน `hp` และ `session` (lint `IMPURE_*` + grep) · สูตร damage / survival ใช้ `src/formulas` ร่วมกับ `tools/sim` (ไม่เขียนซ้ำ) |
| golden vector ของ F06 | ผ่าน | `design/systems/test-vectors/{damage,run-loop}.json` อ่านใน `packages/shared/src/formulas/vectors.test.ts`, `packages/shared/src/hp/survival.test.ts`, `qa/tests/F06/survival-zone-level-no-potions.test.ts` · เขียวทั้งหมด · `hp-recovery.json` (tech note 13.5) ยังไม่มี แต่ `hp/regen.test.ts:47-82` ครอบเพดาน, นาฬิกาถอยหลัง และจุดตัด 50% ที่ 1,800 วิ (F06-TG-14) |
| session ต่อ HP ตามลำดับ tech note F06 4 | ผ่าน | `session/hp.test.ts` 11 เคส + `session/reducer.test.ts` + black-box `qa/tests/F06/hp-safety-auto-retreat-death-revive.test.ts` · `RunSummary.expGained` / `levelsGained` สะสมจริง (TG-06 ของ F04/F05 ปิดแล้ว) |
| client เรียก `session` เท่านั้น | ผ่าน | import ของ client: `shared/session` 26, `geo` 13, `location` 20, ราก `shared` 6 (trace, copy · เดิม), `shared/formulas` 2 และ `shared/config` 1 (type) ใน `session/config.ts` เท่านั้น (ย้ายเข้า shared ตาม D-131 ก่อน F08) · client ไม่คำนวณ HP / damage / การฟื้น: แถบ HP และจอพกกระเป๋าอ่าน `hpRatio` จาก selector แล้วปัดเพื่อแสดงผล (`ui/hp-bar.ts`, `ui/pocket-screen.ts:30-32`) |
| pocket screen: feature detection + fallback | ผ่าน (ข้อสังเกต F06-TG-09) | `feedback/wake-lock-controller.ts` ตรวจด้วย `'wakeLock' in navigator` ไม่ throw เมื่อไม่มี API · `request()` ที่ reject → `request_denied` · ขอใหม่เมื่อกลับ visible · `f04-app.ts:1146-1160`: ไม่รองรับ → ทาง B (`showFallbackNoticeOnce`, จอ run ปกติ) · รองรับ + เปิดใน settings → overlay หลังบรรทัด tutorial · Wake Lock ถูกขอทุก `dungeon_entered` ไม่ขึ้นกับ toggle (components.md 12.4) · ออกจากจอด้วยท่าปัดขึ้นค้างเท่านั้น ไม่มีปุ่ม · e2e ครอบทั้งทาง A และ B ทั้งสอง project |
| bundle | ผ่าน | หัวข้อ 1 · initial 115,332 B (11.5% ของงบ) · map lazy 350,202 B (50% ของงบ) |
| asset + เสียงใน build | ผ่าน | หัวข้อ 1 · TG-13 ของ F04/F05 (trace fixture ของ e2e ติดไปใน `dist`) ยังเปิดอยู่ เช่น `e2e-f06-koa-run-01.trace-*.js` · โหลดแบบ lazy ไม่นับในงบ ไม่มีข้อมูลผู้เล่น |
| C1-1 | บันทึกแล้ว | หัวข้อ 0 · ใน client ไม่มี `fetch` แบบเขียน, `sendBeacon`, `XMLHttpRequest` หรือ `WebSocket` (grep: `fetch` มีแค่ GET ของ style / tile / GeoJSON / mask / SVG icon / manifest) · ผลของ run อยู่ใน `kw.p2.*` เท่านั้น |
| config-not-hardcode | **ไม่ผ่าน** (F06-TG-03, F06-TG-04) | lint `@typescript-eslint/no-magic-numbers` ใช้ `enforceConst: true` จึงยอมค่าคงที่ที่มีชื่อ · ตรวจค่าคงที่ตัวเลขที่มีชื่อทุกตัวใน `apps/client/src` (ไม่รวม test) แล้ว: ส่วนใหญ่เป็นค่าแปลงหน่วย, ขอบ bucket ของ telemetry ตาม `product/telemetry-events.md`, schemaVersion หรือค่า debug ซึ่งรับได้ · ที่ไม่ผ่าน: `copy/position-log-ttl.ts:28` · ข้อสังเกต: `assets/audio.ts:17-24` (F06-TG-11) |
| ชื่อ telemetry ตรง `product/telemetry-events.md` | **ไม่ผ่าน** (F06-TG-02) | event ทุกตัวที่ client ยิง (`name:` / `record(`) มีหัวข้อในเอกสาร PM และผ่าน `KNOWN_EVENT_NAMES` · แต่ event ของ F06 ที่ tech note 10.1 กำหนดไว้ `onboarding_first_reward_granted` ไม่มีจุดยิง |
| error / offline path | ผ่าน (ข้อสังเกต F06-TG-05, F06-TG-06) | mask / geometry โหลดล้ม → `console.warn` + ใช้ R55 (`dungeons/home-geometry.ts:83,114,141`) · storage อ่านไม่ได้ → ค่าเริ่ม (`storage/local-store.ts`) · quota → ตัด telemetry ก่อน session (`writeLocationConsent` ส่ง `trimTelemetryHalf` / `clearTelemetryAll`) · ถอน consent ระหว่าง run ตามลำดับ 8.4 ข้อ 1–4 ใน call site เดียวไม่มี `await` (`privacy/withdraw-consent.ts`, `f04-app.ts:636-660`) · e2e `withdraw-consent.spec.ts` ผ่าน |
| ไม่มี PII / พิกัดใน log | ผ่าน | `console.*` ใน runtime 15 จุด ไม่มีจุดใดพิมพ์พิกัด, ปีเกิด หรือ consent · ปีเกิดไม่ถูกเก็บ (`kw.p2.onboarding` มีแค่ธง, R45) · อายุต่ำกว่าเกณฑ์ไม่เขียน key ใด (R46, `onboarding-step.ts` ไม่มี event สำหรับ underage) |
| namespace `kw.p2.` (C1-5) | ผ่าน (ข้อสังเกต F06-TG-04, F06-TG-13) | key ที่ client สร้าง: `kw.p2.session`, `kw.p2.telemetry`, `kw.p2.onboarding`, `kw.p2.consent`, `kw.p2.interest`, `kw.p2.settings.pocketScreenEnabled`, `kw.p2.settings.pocketWakeHintShown`, `kw.p2.settings.screenLockNoticeShown` · ทุกตัวขึ้นต้น `kw.p2.` จึงถูกลบด้วย `clearKeysWithPrefix` · `kw.p2.runClientStats` ของ tech note 8.1 ไม่มี เพราะตัวนับอยู่ในหน่วยความจำของ `WakeLockController` (รับได้ ดู F06-TG-13) |

## 3. Finding ที่ blocking

| ID | severity | file:line (`3b7e78c`) | finding | owner | blocking | งาน |
| --- | --- | --- | --- | --- | --- | --- |
| F06-TG-01 | medium | `qa/tests/F04/session-checkin-lifecycle.test.ts`, `qa/tests/F06/home-states-trace-replay.test.ts`, `qa/tests/F06/hp-safety-auto-retreat-death-revive.test.ts`, `qa/tests/F06/lib/walk-until.ts`, `qa/tests/F06/onboarding-first-reward-and-teach-lock.test.ts`, `qa/tests/F06/survival-zone-level-no-potions.test.ts`, `qa/tests/F06/telemetry-onboarding-events-and-no-counts.test.ts` | `pnpm exec prettier --check .` exit 1 ที่ 7 ไฟล์ (commit ล่าสุดของทุกไฟล์คือ `f3b7251`) · `pnpm lint` และ CI job lint จะแดง · เป็นเรื่อง format ล้วน ไม่มีเหตุให้ใส่ `.prettierignore` | qa-tester | yes | X ใหม่: `pnpm exec prettier --write` 7 ไฟล์ แล้ว `pnpm lint` exit 0 |
| F06-TG-02 | medium | `apps/client/src/telemetry/f04-events.ts:242-244` (แถว `run_tick_granted`), `apps/client/src/telemetry/known-events.ts:15` | tech note F06 10.1 กำหนดว่า `run_tick_granted` ที่ `firstEver = true` ต้องยิง `onboarding_first_reward_granted` คู่กัน พร้อม `dungeon_id`, `minutes_since_first_open_bucket` (จาก `kw.p2.onboarding.firstOpenAt_ms`) และ `class` · grep ทั้ง `apps/client/src` ไม่พบจุดยิงนอกรายการชื่อใน `known-events.ts` · `firstOpenAt_ms` ถูกเก็บแต่ใช้แค่กับ `onboarding_funnel_step` · ผลคือ metric หลักของ PRD F06 หัวข้อ 4 (ตามเอกสาร PM "event นี้คือธงที่ metric ... วัดโดยตรง") วัดจาก export ของ playtest ไม่ได้ และ product gate P2-F06-T25 ข้อ (4) จะไม่ผ่าน · แก้: ใน mapper ของ `run_tick_granted` เมื่อ `event.firstEver` ให้ยิง record ที่สองชื่อ `onboarding_first_reward_granted` ที่ `at_ms` เดียวกัน · bucket `0-10`, `10-30`, `30-60`, `60+` เป็นค่าคงที่ที่มีชื่อแบบเดียวกับ bucket อื่นใน `f04-events.ts` · unit test ของ mapper (firstEver true ยิงสอง record, false ยิงหนึ่ง, ไม่มี property พิกัด) + assertion ใน e2e `onboarding.spec.ts` ว่า ring buffer มี event นี้หนึ่งครั้ง | gameplay-programmer | yes | X ใหม่ (รวมกับ F06-TG-03 ถึง -06) |
| F06-TG-03 | medium | `apps/client/src/copy/position-log-ttl.ts:28,31`, `apps/client/src/config/whitelist.ts:143,160` | `{ttlText}` ที่แสดงบนจอ consent และ S-23 มาจากค่าคงที่ `POSITION_LOG_TTL_HOURS_FALLBACK = 24` แทน `config/balance/privacy.json#positionLogTtl_s` · ถ้า HUMAN เปลี่ยนระยะเก็บ (PDPA sign-off) ข้อความที่บอกผู้เล่นจะผิดจากค่าจริงโดยไม่มีใครรู้ · ขัด non-negotiable 3 · แก้ตามคำตัดสิน 6.2: เพิ่ม `positionLogTtl_s` ใน `BALANCE_WHITELIST` แถว `privacy.json` (ข้าง `minAge_yr`, `minAgeComparison`), ลบออกจาก `FORBIDDEN_ANYWHERE`, แก้ `whitelist.test.ts:74`, generate subset ใหม่, parse ใน `config/balance.ts` (จำนวนเต็ม > 0), ให้ `positionLogTtlText()` คำนวณ `positionLogTtl_s / SECONDS_PER_HOUR` แล้ว format ด้วย `unit.hours` · test ใช้ค่าจาก config ไม่ใช่ 24 | gameplay-programmer (โค้ด), tech-lead (tech note F04 15.2 / 15.3) | yes | X ใหม่ (gameplay) + งาน tech-lead แก้ tech note F04 15.2 / 15.3 ในรอบเดียวกัน (กฎ "แก้ที่หนึ่งต้องแก้อีกที่" ของ 15.3) |
| F06-TG-04 | low | `apps/client/src/f04-app.ts:609-617`, `apps/client/src/config/runtime.ts:185-188,439-475` | `clearLocalData` รับ `storageKeyPrefix: 'kw.p2.'` เป็น literal เพราะ `parsePrivacyConfig` ไม่ parse `localData` · key ใน `config/app/privacy.json#localData.storageKeyPrefix` จึงเป็นค่าที่ไม่มีโค้ดอ่าน (config บอกอย่างหนึ่ง โค้ดทำอีกอย่าง) · แก้: parse `localData.{storageKeyPrefix, clearScope, afterClear}` ใน `AppPrivacyConfig` แล้วส่ง `appPrivacyConfig.localData.storageKeyPrefix` · เพิ่ม unit test ว่า storage key ทุกตัวที่ client สร้าง (`ONBOARDING_STORAGE_KEY`, `CONSENT_STORAGE_KEY`, key ของ interest, session, telemetry, `kw.p2.settings.*` ใน `ui/pocket-screen.ts:36-37` และ `ui/settings-walking-safety.ts:27`) ขึ้นต้นด้วย prefix จาก config · ชื่อ key แต่ละตัวยังเป็น literal ได้ (เป็น identifier ตาม tech note F06 8.1 ไม่ใช่ค่าปรับ) แต่ test ต้องกันการ drift · ลบ literal ซ้ำ `'kw.p2.consent'` ที่ `f04-app.ts:238` ให้ใช้ `CONSENT_STORAGE_KEY` | gameplay-programmer | yes | X เดียวกับ F06-TG-02 |
| F06-TG-05 | low | `apps/client/src/f04-app.ts:230-250` (`locationConsentGranted`), `:1417-1423` | ค่าเริ่มแบบชั่วคราวของ P2-F06-T09: `kw.p2.consent` ที่ไม่มี key อ่านเป็น **granted** · comment ของโค้ดเองบอกว่าเป็นค่าชั่วคราวจนกว่าจะมีจอ consent ซึ่ง P2-X38 สร้างแล้ว · ขัด tech note F06 9.2 ข้อ 1 (`consent.location ≠ granted` → `unknown`) และหลัก fail-closed ของ consent (NN-7) · ผลจริงตอนนี้ต่ำเพราะ `main.ts:390-397` ไม่เริ่ม LocationProvider ถ้าไม่ granted จึงไม่มี fix ให้ประเมิน แต่ถ้าวันหน้ามีทางอื่นที่ได้ตำแหน่ง ค่านี้จะเปิดทางโดยเงียบ · แก้: `readLocationConsent(storage) === 'granted'` (ฟังก์ชันเดียวกับ `main.ts`) หรือ Mock ภายใต้ hook `e2eSkipOnboarding` ตาม D-130 · ลบ `locationConsentGranted` ตัวเก่า · unit test: ไม่มี key → `unknown` | gameplay-programmer | yes | X เดียวกับ F06-TG-02 |
| F06-TG-06 | low | `apps/client/src/storage/clear-local-data.ts:34`, `apps/client/src/f04-app.ts:606-633` | tech note F06 8.3: "ฟังก์ชัน `clearLocalData` ของ client ต้องรับผลของ selector นี้และปฏิเสธเมื่อมี run (กันการเรียกจากที่อื่น)" · ตอนนี้กันแค่ที่ปุ่มใน `ui/settings-menu.ts:107,136-138` ส่วน `clearLocalData` ลบทุก key ทันทีโดยไม่ถาม · ถ้ามี call site ที่สองในอนาคตจะลบ run ที่กำลังเดินอยู่ได้ · แก้: เพิ่ม dep `canClear: () => boolean` (ส่ง `selectCanClearLocalData(engine.getState())`) แล้ว return โดยไม่ลบเมื่อ `false` · unit test ทั้งสองกรณี | gameplay-programmer | yes | X เดียวกับ F06-TG-02 |

## 4. Finding ที่ไม่ blocking

| ID | severity | file:line | finding | owner | blocking | งาน |
| --- | --- | --- | --- | --- | --- | --- |
| F06-TG-07 | low | `apps/client/e2e/pocket-screen.spec.ts:69-75` | flake: `enterRun` รอ `.run-bar` แค่ 5 วิหลังกด "เข้า" · ภายใต้ 8 worker แบบขนาน WebKit ช้าจนเกิน (1 ใน 4 รอบ) · รันเดี่ยว 20/20 และ serial 50/50 · ไม่ใช่บั๊กของ product (`.pocket-screen` ไม่ซ่อน `.run-bar` · `f04-app.ts:1015`) · CI มี `retries: 2` จึงไม่แดง แต่ flake ปิดบังการถอยหลังจริงได้ · แก้: ใช้ timeout เดียวกับ `enterButton` (20 วิ) หรือรอ `dungeon_entered` ใน `window.__kwSession` ก่อน | gameplay-programmer | no | ครั้งถัดไปที่แตะ spec (ทำพร้อม X ของหัวข้อ 3 ได้) |
| F06-TG-08 | low | `apps/client/src/assets/icon-glyph.ts:80-112` (D-125 · backend-programmer) | ตัว sanitize เรียกตัวเองว่า allowlist แต่ทำงานแบบ denylist: ตัด `<script>`, `on*`, `href` ที่ไม่ใช่ `#` · ยังผ่าน `<foreignObject>`, `<style>` (`url()` ภายนอกขัด C2-1), `<animate>` / `<set attributeName="href">` และ attribute `style` · components.md 13.9.3 และ board P2-X29 กำหนด allowlist · ความเสี่ยงจริงต่ำเพราะ SVG เป็น asset first-party ที่ `tools/art` สร้างและ serve จาก origin เดียวกัน · แก้เป็น allowlist ของชื่อ element (`svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `defs`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `stop`, `use`, `symbol`) และ attribute ที่ใช้วาด · element อื่นลบทั้ง subtree · test เพิ่ม `foreignObject` / `style` / `set` | backend-programmer | no | ก่อน Phase 3 หรือก่อนมี asset จาก origin อื่น (อย่างใดก่อน) |
| F06-TG-09 | low | `apps/client/src/feedback/wake-lock-controller.ts:145-190` (D-125 · backend-programmer) | ระหว่างที่ `request('screen')` ยังไม่ resolve ค่า `sentinel` เป็น `null` · ถ้า `visibilitychange` กลับเป็น visible อีกครั้งในช่วงนั้น `maybeReacquire` จะขอซ้ำ · sentinel ตัวแรกที่ resolve ถูกทับโดยไม่ release และ `heldSince_ms` ถูกตั้งใหม่ (เวลาที่ถือนับขาด) · เกิดได้ยากบนเครื่องจริง · แก้: ธง `requestInFlight` ที่ `maybeReacquire` ตรวจ + test ด้วย promise ที่ยังไม่ resolve | backend-programmer | no | ครั้งถัดไปที่แตะไฟล์ |
| F06-TG-10 | low | `apps/client/src/app.css:304-307`, `ui/age-gate-screen.ts:41`, `ui/consent-location-screen.ts:34`, `ui/intro-screen.ts:18` | จอ age gate / consent / intro ใช้ `.screen` (z-index 50 = `overlay`) แต่ `design/ux/tokens.json#zIndex.rule` จัดจอเหล่านี้เป็น `system` (60) ซึ่งต้องอยู่เหนือทุกจอ · ตอนนี้ไม่ชนเพราะไม่มี overlay ใดเปิดก่อน onboarding จบ · แก้: class เสริม `.screen-system { z-index: 60 }` | gameplay-programmer | no | visual gate P2-F06-T23 ตรวจซ้ำได้ |
| F06-TG-11 | low | `apps/client/src/assets/audio.ts:17-24` | `DEFAULT_STALE_AFTER_MS = 2000` และ `SAFETY_CUE_IDS` คัดลอกจาก `audio/cue-list.md` 4.1–4.2 เป็นค่าในโค้ด · เป็นค่า UX ไม่ใช่ balance แต่ถ้า sound-designer ปรับ cue-list จะ drift เงียบ · เสนอย้ายไป `config/app/client.json#feedback.cueStaleAfter_ms` และธง `safety: true` ต่อ cue ใน asset manifest (`tier` มีอยู่แล้ว) | gameplay-programmer, sound-designer | no | ครั้งถัดไปที่แตะไฟล์ |
| F06-TG-12 | info | `product/telemetry-events.md` หัวข้อ 9 | event อื่นที่เอกสาร PM บอกว่า "Phase 2 พร้อม emit" แต่ไม่มีจุดยิง: `onboarding_nearest_dungeon_distance`, `run_gps_status_changed` (และ `dungeon_report_submitted` ที่รอ F13, `battery_sample` ที่เป็นเครื่องมือภาคสนาม) · ไม่อยู่ในสัญญา tech note F06 10.1 จึงไม่ใช่ blocking ของ gate นี้ · product-manager ตัดสินใน product gate P2-F06-T25 ว่าต้องมีก่อน playtest หรือแก้ตารางเป็น Phase ถัดไป | product-manager | no | P2-F06-T25 |
| F06-TG-13 | info | `docs/tech/F06-hp-damage-onboarding.md` 8.1, 9.2 · `docs/tech/F04-dungeon-presence.md` 15.2–15.3 | เอกสารของ tech-lead ที่ต้องตามโค้ด: (ก) 8.1 `kw.p2.settings` เป็น key แยกต่อค่า `kw.p2.settings.<name>` ไม่ใช่ object เดียว · `kw.p2.runClientStats` ไม่ถูกเขียน (ตัวนับอยู่ในหน่วยความจำ · reload กลาง run ทำให้ bucket นับขาด ยอมรับได้ใน Phase 2) (ข) 9.2 ข้อ 4 เพิ่มกรณี A-P2-X27-1 ตามคำตัดสิน 6.3 (ค) 15.2 / 15.3 ย้าย `positionLogTtl_s` ตาม 6.2 | tech-lead | no (ข้อ ค ทำพร้อม F06-TG-03) | งาน tech-lead ถัดไป |
| F06-TG-14 | info | `design/systems/test-vectors/` | `hp-recovery.json` และ `runLoop` ที่มีช่วงหยุด (tech note F06 13.5) ยังไม่มี · engine test ครอบแทนแล้ว (`hp/regen.test.ts`, `session/hp.test.ts`) | systems-designer | no | backlog |
| F06-TG-15 | info | `apps/client/src/f04-app.ts` (1,506 บรรทัด) | orchestrator ของ client โตเป็นไฟล์เดียวที่ต่อสายทุกจอ · ไม่ผิดสัญญา แต่ Phase 3 ต้องเปลี่ยนทางเข้า `sessionStep` เป็น API (C1-1) ที่จุดเดียว · เสนอแยกตาม flow (run, home, onboarding, settings / privacy) ก่อน F08 | gameplay-programmer, tech-lead | no | backlog Phase 3 |
| ต่อจากรอบก่อน | — | — | TG-09 (`map/geo-circle.ts:12`), TG-13 (trace fixture ใน `dist`) ของ F04/F05 ยังเปิด · R2-01 ปิดแล้วด้วย `clock/mock-offset-clock.ts` (P2-F06-T10) · R2-02 ปิดด้วย D-133 | — | no | — |

## 5. โมดูลที่ backend-programmer เขียนใน `apps/client` (D-125 กฎสลับข้อ 10)

| โมดูล | งาน | ผล | หลักฐาน |
| --- | --- | --- | --- |
| `apps/client/src/home/home-state.ts` | P2-X27 | ผ่าน | pure ไม่มี DOM ไม่มี config / asset loading ไม่ import engine · ใช้ `boundaryDistance_m`, `inPlayArea`, `pointInPolygon`, `MS_PER_S` จาก `@keep-walking/geo` · คืนแค่ `kind` + id + `distance_m` ไม่มีชื่อสถานที่ · ลำดับตรง tech note 9.2 รวม R37 (onboarding ไม่มีทางสำรองไป dungeon ที่ไม่ครอบเลเวล) · test 28 เคสครอบ 13.4 (ก)–(จ), H-E6 / H-E21 / H-E26 · caller (`dungeons/home-tracker.ts`) resolve `selectOpening` และ geometry ก่อนส่งเข้า (รับได้ ดู 6.3) |
| `apps/client/src/onboarding/onboarding-step.ts` | P2-X28 | ผ่าน | pure · ธงที่เก็บมีแค่ `introSeen`, `ageGatePassed`, `consentAnswered`, `firstOpenAt_ms` · ขั้นที่ engine รู้ (`class`, `first_run`, `first_reward`) อ่านจาก `selectPlayerView` ไม่เก็บซ้ำ (tech note 8.2) · underage ไม่มี event จึงไม่เขียน key (R46) · `applyOnboardingEvent` idempotent · `isSystemTeachLocked` รับ `lockedSystemIds` จาก caller (`config/unlocks-teach-lock.ts` อ่าน `balanceLockedSystemIds` จาก subset ของ `unlocks.json`) · ไม่มี code path รางวัลแยก |
| `apps/client/src/feedback/cue-feedback.ts` | P2-X29 | ผ่าน | ยิงภาพ / สั่น / เสียงพร้อมกัน ไม่แตกสาขาตาม `navigator.vibrate` ก่อนยิงชั้นอื่น (cue-list 4.4) · API ของเบราว์เซอร์ฉีดผ่าน deps · ข้อสังเกตค่าคงที่ของคิวอยู่ที่ F06-TG-11 |
| `apps/client/src/feedback/wake-lock-controller.ts` | P2-X29 | ผ่าน (F06-TG-09) | feature detection, ขอใหม่เมื่อกลับ visible, นับเวลาที่ถือ / ซ่อนจากนาฬิกาที่ฉีดเข้า (Mock เร่งได้) · ไม่มีพิกัด |
| `apps/client/src/assets/icon-glyph.ts` | P2-X29 | ผ่าน (F06-TG-08) | ตรวจ `tintable === true` เอง · fetch / parse / sanitize ล้ม → `<img>` URL เดิม · `aria-hidden` + `focusable=false` · DOMParser ฉีดเข้า |

- ทั้งห้าโมดูลอยู่ใต้ lint ชุดเดียวกับ client (`CLIENT_ENGINE_BAN`, no-magic-numbers) และไม่ import `session` ยกเว้น type · ข้อยกเว้นของกฎ path ตาม D-125 ไม่ได้ทำให้เกิดทางลัดเข้า engine

## 6. คำตัดสินที่ brief ขอ

### 6.1 D-134 `pocketScreen.swipeUpMinDistance_ratio` เป็นสัดส่วนความสูง viewport — **ACCEPT**

- เหตุผล: ระยะปัดเป็นเรื่องของสัดส่วนจอ ไม่ใช่ pixel คงที่ ค่าเดียวใช้ได้ทั้งจอเล็กและจอใหญ่ · `_ratio` มีในตารางหน่วยของ config-lint และถูกตรวจช่วง 0–1 แล้ว (`tools/config-lint/src/units.ts:87-93`) จึงไม่ต้องเพิ่มหน่วย `_px` · ไม่มีผลต่อรางวัล
- เงื่อนไข (ไม่ blocking · gameplay-programmer ครั้งถัดไปที่แตะไฟล์): `ui/pocket-screen.ts:151-154` แปลงเป็น px ครั้งเดียวตอน mount · ถ้า mount ตอนแนวนอนแล้วหมุนจอ เกณฑ์จะผิดสัดส่วน · ให้คำนวณ `window.innerHeight × ratio` ที่ `pointerdown` แทน (ถูกและไม่มีต้นทุน)
- decision log: D-134 → ACCEPTED (producer บันทึก)

### 6.2 A-P2-X38-3 `{ttlText}` และ `positionLogTtl_s` — **เลื่อน key ออกจากกลุ่ม C ไปกลุ่ม B** (ไม่ทำ mirror)

- เหตุผลที่ key อยู่กลุ่ม C เดิม (tech note F04 15.3: "ใช้โดย config lint ไม่ใช่ runtime") คือยังไม่มีโค้ด runtime ที่ต้องใช้ ไม่ใช่เพราะเป็นค่าลับ · `positionLogTtl_s` เป็นค่าที่ต้องเปิดเผยต่อผู้เล่นอยู่แล้ว (GDD: ระบุใน privacy policy) และไม่มีผลต่อรางวัล จึงตรงนิยามกลุ่ม B "การแสดงผลเท่านั้น" แบบเดียวกับ `minAge_yr` ที่อยู่ไฟล์เดียวกัน
- ไม่เลือก mirror ใน `config/app/privacy.json`: ทั้ง `_note` ของ `config/balance/privacy.json` และ `config/app/privacy.json` ห้ามซ้ำค่าระหว่างสองไฟล์ · mirror ต้องมี lint ข้ามไฟล์เพิ่มและยังเป็นสองแหล่งความจริงของค่าที่เปลี่ยนได้ด้วย PDPA sign-off ของ HUMAN เท่านั้น
- งาน: gameplay-programmer แก้โค้ดตาม F06-TG-03 · tech-lead แก้ tech note F04 15.2 (แถว `balance/privacy.json` เพิ่ม `positionLogTtl_s` "ข้อความ `{ttlText}` บนจอ consent และ S-23") และ 15.3 (ลบออก) ในรอบเดียวกัน · ค่าใน `config/balance/privacy.json` ไม่เปลี่ยน จึงไม่ต้องขอ HUMAN
- decision ใหม่ที่เสนอให้ producer บันทึก: "positionLogTtl_s ย้ายจากกลุ่ม C เป็นกลุ่ม B (แสดงผล) เพื่อให้ {ttlText} อ่านจาก config · ปิด A-P2-X38-3"

### 6.3 A-P2-X27-1 หลังจบ onboarding ไม่มี dungeon ใดเปิดเลย → `temporarilyClosed` ที่ใกล้สุด — **ACCEPT**

- ตรงกับ F04-R33 (ไม่ชี้ไป dungeon ที่ปิด) และสมมาตรกับกรณีเดียวกันระหว่าง onboarding ที่ tech note 9.2 ข้อ 4 กำหนดไว้แล้ว (A-P2-X31-1: เวลาเปิดถัดไปของแห่งที่ใกล้สุด) · ไม่มีกรณีใดชี้ `far` ไปที่ dungeon ปิด
- การให้ caller resolve `selectOpening` และ geometry ก่อนเรียก **รับ**: ทำให้ `home-state.ts` ไม่ต้องรู้รูปของ `SessionParams` หรือโหลด asset และ test ได้โดยไม่ใช้ config · `selectOpening` มาจาก `@keep-walking/shared/session` ทางเดียวตาม ADR 0003 3.3
- tech-lead เพิ่มกรณีนี้ใน tech note F06 9.2 ข้อ 4 (F06-TG-13 ข้อ ข)

### 6.4 `onboarding-step.ts` (D-125) และ A-P2-X28-1/2 — **ACCEPT**

- ข้อความของ A-P2-X28-1/2 อยู่ใน REPORT ของ P2-X28 ไม่มี marker ใน repo · ตรวจจากสมมติฐานสองข้อที่โมดูลประกาศไว้ใน doc comment:
  1. `permissionGranted`, `underageThisSession`, `mapAcknowledged` เป็นค่าในหน่วยความจำ ไม่ persist · ถูกต้องตาม tech note 8.2 (permission ไม่มีธง) และ R46 (underage ไม่เขียน key) · `locationConsent = 'unanswered'` หลัง `consentAnswered = true` ถูกถือเป็น declined (fail-closed ไป `map` ที่สถานะไม่รู้ตำแหน่ง) · รับ
  2. `lockedSystemIds` = `unlockId` ทุกตัวใน `unlocks.json` ที่ caller ส่งเข้า แทนการโหลด config ในโมดูล · รับ (โมดูลยัง pure และแหล่งเดียวคือ subset ของ `unlocks.json`)

### 6.5 A-P2-F06-T14-1 `onNightBackground = false` ทุก call site — **ACCEPT**

- call site ของ `setIconGlyph` ตอนนี้มีสองจุด (`ui/run-bar.ts:112`, `ui/nav-panel.ts:249`) ทั้งคู่อยู่บนพื้นสว่าง · จอพกกระเป๋าที่เป็นพื้นมืดไม่วาดไอคอน (มีแค่ HP% / tick / ข้อความ) · ไม่มีธีมกลางคืนใน Phase 2 · ค่า `false` จึงถูกต้องตามข้อเท็จจริง
- เงื่อนไข: จอแรกที่วาดไอคอนบนพื้นมืด (`bg.night`) ต้องส่ง `true` และ visual gate ตรวจ · ไม่ต้องมีงานตอนนี้

### 6.6 ข้อที่ต่อจากรอบก่อน

- **กฎ `#hud { position: absolute; inset: 0 }`** (คำตัดสิน 6.1 ของ F04/F05): ยังเป็นกฎ layout ฐาน · เงื่อนไข z-index token ถูกทำแล้ว (`design/ux/tokens.json#zIndex`, D-129 · `app.css:17-20,57-63`) · ไม่มีลูกของ `#hud` ใช้ `position: fixed` (grep `app.css`) · `.pocket-screen` อยู่ระดับ `overlay` (50) ตาม P2-H39 (components.md 15.4) · ช่องว่างเดียวคือจอ system ใช้ 50 แทน 60 (F06-TG-10)
- **hook ทดสอบ (D-130):** `e2eClassId`, `e2eSkipF04App`, `e2eSkipOnboarding`, `seed`, `start` อ่านเฉพาะเมื่อ provider เป็น Mock · ชื่อ param อยู่ใน `config/app/client.json#providerQuery.paramNames` (parse ที่ `config/runtime.ts:281-283`) · `e2eSkipOnboarding` ใช้ `env.ts:103-110` `shouldSkipF04App` ตัวเดียวกันทั้งที่ `main.ts:390-397` และ `f04-app.ts:362-366` · unit test ว่า Web ไม่อ่าน (`env.test.ts:111-113`) · hook ข้าม age gate และ consent ได้เฉพาะ Mock ซึ่งไม่ขอตำแหน่งจริงจากเบราว์เซอร์ จึงไม่ขัด NN-7 · **ผ่าน**

## 7. เงื่อนไขของการรัน gate ซ้ำ (รอบ 2 ตรวจเฉพาะรายการนี้)

| ID | ต้องปิด | วิธีตรวจในรอบ 2 |
| --- | --- | --- |
| F06-TG-01 | prettier | `pnpm lint` exit 0 |
| F06-TG-02 | `onboarding_first_reward_granted` | unit test ของ mapper (firstEver true → สอง record ที่ `at_ms` เดียวกัน, property ครบ 3 ตัว, ไม่มีพิกัด) · e2e `onboarding.spec.ts` assert ว่ามี event นี้หนึ่งครั้งใน ring buffer |
| F06-TG-03 | `{ttlText}` จาก config | grep ไม่พบ `POSITION_LOG_TTL_HOURS_FALLBACK` · subset ที่ generate มี `privacy.positionLogTtl_s` · `generated.test.ts` และ `whitelist.test.ts` เขียว · test ของ `positionLogTtlText` ใช้ค่าจาก config · tech note F04 15.2 / 15.3 แก้แล้ว |
| F06-TG-04 | prefix จาก config | `appPrivacyConfig.localData.storageKeyPrefix` ถูกส่งเข้า `clearLocalData` · test ว่าทุก storage key ขึ้นต้นด้วย prefix นี้ |
| F06-TG-05 | consent fail-closed | ไม่มี key → `locationConsentGranted: false` → `unknown` (unit test) · e2e ทุกตัวยังผ่าน |
| F06-TG-06 | `clearLocalData` ปฏิเสธเมื่อมี run | unit test ทั้งสองกรณี |
| ทั้งหมด | — | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm run lint:config`, client build + `measure-bundle.ts`, `playwright test apps/client/e2e` ทั้งสอง project exit 0 |

- ข้อที่ไม่ blocking (F06-TG-07 ถึง -15) ไม่ต้องปิดก่อนรอบ 2
- รอบนี้เป็นรอบแรกของ gate F06 · ถ้ารอบ 2 ได้ NEEDS_CHANGES อีก ต้อง escalate ถึง HUMAN ตาม protocol หัวข้อ 6 · finding ทั้งหกข้อเป็นงานเล็กในไฟล์ของ gameplay-programmer (5 ข้อ) และ qa-tester (1 ข้อ) ที่ไม่ชน path กัน จึงทำขนานกันได้ใน wave เดียว
- QA gate P2-F06-T21 เริ่มได้ขนานกับ X ของรอบนี้สำหรับส่วนที่ไม่แตะ telemetry และ consent · ข้อเสนอสำหรับ QA: ตรวจ event `onboarding_first_reward_granted` ใน export หลัง F06-TG-02 ปิด
