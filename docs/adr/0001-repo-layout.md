# ADR 0001 — โครง repo, toolchain และมาตรฐานโค้ด

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted · แก้ไขครั้งที่ 1 (P1-H01, 2026-09-23) · แก้ไขครั้งที่ 2 (P1-X27, 2026-09-24) ดูหัวข้อ 7 |
| วันที่ | 2026-09-23 |
| task | P1-F02-T01 · แก้ไข P1-H01, P1-X27 |
| ผู้เขียน / authority | tech-lead (architecture, code standards) |
| อ้างอิง | CLAUDE.md, GDD "สถาปัตยกรรมเทคนิค", `studio/phases/phase-1/board.md` หัวข้อ 1, D-001, D-002, D-007, D-008, plan review TL-M01, TL-S04, TL-S05, TL-S11, TL-N02, TL-N05, SF-10 |
| ADR ที่เกี่ยวข้อง | ADR 0002 (backend stack ตาม D-008) ยืนยันชื่อ `apps/api` |

ADR นี้ไม่มีการผูก vendor หรือค่าใช้จ่ายใหม่: ทุกเครื่องมือเป็น open source ที่รันในเครื่อง ส่วน vendor (Cloudflare) ตัดสินแล้วใน D-008 และยืนยันใน ADR 0002

## 1. บริบท

- workspace ยังไม่เป็น git repo และยังไม่มีโค้ด ทุกงานโค้ดของ Phase 1 (client spike, LocationProvider, tile build, simulator, coverage) รองานนี้
- GDD กำหนด server-authoritative, LocationProvider เป็น interface ตั้งแต่วันแรก, ค่า balance และชื่อทุกอย่างอยู่ใน config, stack Cloudflare (D-008)
- repo เป็น public บน GitHub (D-002, D-007) และทุกบริการต้องเป็น free tier ที่ไม่ผูกบัตร (D-001)
- agent หลายตัวเขียนโค้ดพร้อมกันเป็น wave จึงต้องมีกติกาชัดเรื่อง path ร่วม (lockfile, root config) และการ commit

## 2. ทางเลือกที่พิจารณา

| เรื่อง | ทางเลือก | ผล | เหตุผล |
| --- | --- | --- | --- |
| package manager | pnpm workspaces · npm workspaces · Bun | **pnpm** | lockfile เดียว, strict node_modules กัน import dependency ที่ไม่ได้ประกาศ, `minimumReleaseAge` และ `allowBuilds` กัน supply-chain, เร็วใน CI · Bun ยังไม่ใช่ runtime ของ Workers |
| monorepo orchestrator | Turborepo / Nx · pnpm `-r` อย่างเดียว | **pnpm `-r`** | workspace ยังน้อย ไม่คุ้มเพิ่มเครื่องมือและ remote cache · ทบทวนเมื่อ build ช้ากว่า 3 นาที |
| internal package | build เป็น `dist/` · ส่ง TS source | **TS source** | Vite, Wrangler (esbuild) และ Vitest bundle TS ได้เอง ไม่มีขั้น build ที่ลืมรัน |
| unit test | Jest · Vitest · `node:test` | **Vitest** | ใช้ Vite pipeline เดียวกับ client, ESM/TS ไม่ต้องตั้งค่า, รันได้ทั้ง node และ browser-like |
| e2e | Playwright · Cypress · WebdriverIO | **Playwright** | emulate มือถือ + geolocation + permission ในตัว, มี WebKit แทน iOS Safari (D-003), ฟรีใน GitHub Actions |
| lint / format | ESLint + Prettier · Biome | **ESLint (flat) + typescript-eslint + Prettier** | ต้องใช้ `@typescript-eslint/no-magic-numbers` และ `no-restricted-imports` แบบ pattern ซึ่ง Biome ยังไม่ครบ |
| ภาษาใน `tools/` | TS ล้วน · TS + Python ต่อโฟลเดอร์ | **TS เป็นหลัก, Python ได้สำหรับ GIS** | GIS (GeoPandas, Shapely, rasterio) ใน Python ครบกว่ามาก · pin ต่อโฟลเดอร์จึงไม่ชนกัน |

## 3. การตัดสินใจ

### 3.1 repo public และต้นทุนศูนย์ (D-001, D-002)

- repo `https://github.com/pongponWorkspace/keep-walking` เป็น **public** · ทุกไฟล์ที่ commit เปิดเผยต่อสาธารณะ รวม GDD, `studio/` ทั้งหมด (roadmap, board, decision log, คำถาม), `.claude/agents/`, CLAUDE.md และเอกสาร design
- ห้าม commit: secret และ credential, `.env*` ที่มีค่า (ยกเว้น `.env.example` ที่ไม่มีค่า), `.dev.vars`, raw GPS trace, ข้อมูลส่วนบุคคล, ไฟล์ข้อมูลดิบขนาดใหญ่ (OSM, raster ประชากร, PMTiles เต็ม)
- ป้องกันสามชั้น:
  1. `.gitignore` (งานนี้) · รายการในหัวข้อ 3.12
  2. CI: secret scan (gitleaks) + guard ไฟล์ต้องห้าม (P1-F02-T07)
  3. GitHub secret scanning + push protection ที่คนเปิดก่อน push แรก (HUMAN P1-F02-T18)
  - tech gate (P1-F02-T15) และ regression (P1-CLOSE-QA) ตรวจซ้ำ
- บริการภายนอกทุกตัวต้องเป็น free tier ที่ไม่ผูกบัตร · ถ้าไม่มีทางฟรีให้หยุดและถามคน
- ยังไม่มีไฟล์ license = สงวนสิทธิ์ทั้งหมด · การเลือก license เป็นการตัดสินใจของคน ไม่ขวาง Phase 1

### 3.2 layout

```
apps/
  client/            เว็บมือถือ Vite + MapLibre GL JS + PMTiles            gameplay-programmer
  api/               API Worker + Durable Objects + migrations             backend-programmer
                     (ชื่อจองแบบมีเงื่อนไข ยืนยันใน ADR 0002 · ยังไม่สร้างใน Phase 1)
packages/
  shared/            type, JSON Schema, pure formula (server-safe)         tech-lead
  location/          LocationProvider interface + Web / Capacitor / Mock   tech-lead (interface), location-engineer (impl)
  geo/               geometry แบบ pure (server-safe)                       location-engineer (ยังไม่สร้าง)
tools/
  coverage/          Python · OSM coverage survey                          location-engineer
  tiles/             shell + CLI pmtiles · build PMTiles                   location-engineer
  traces/            TS · validate / sanitize / แปลง trace                 location-engineer
  sim/               TS · balance simulator + golden vectors               systems-designer
qa/tests/            unit/ (Vitest) และ e2e/ (Playwright)                  qa-tester
config/              balance/, content/, app/ (อ่านอย่างเดียวจากโค้ด)       systems-designer, narrative-designer, tech-lead (หัวข้อ 3.10.1)
infra/               IaC, CI, monitoring                                   devops-engineer
docs/                adr/, tech/                                           tech-lead
```

- workspace glob ใน `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `tools/*`, `qa/tests/*` · โฟลเดอร์ที่ไม่มี `package.json` (เช่น `tools/coverage/`) ไม่ถือเป็น workspace
- scope ของ package: `@keep-walking/<name>` · tools ใช้ชื่อ `@keep-walking/tools-<name>` เพื่อให้ lint จับได้
- ทิศทาง import ที่อนุญาต: `apps → packages`, `tools → packages`, `packages/location → packages/shared`, `packages/shared → packages/geo` (เมื่อมี) · **ห้าม** `apps/*` หรือ `packages/*` import `tools/*` และห้าม `packages/*` import `apps/*`
- internal package ส่ง TS source (`"exports": { ".": "./src/index.ts" }`) ไม่มีขั้น build
- โค้ดอ่าน `config/` ผ่าน JSON import หรือ loader ที่ validate ด้วย JSON Schema (Phase 2) · ไม่มีโค้ดใดเขียนลง `config/`
- test ของ QA ไม่ต้องมี `package.json`: root Vitest เก็บ `qa/tests/**/*.test.ts` และ root Playwright เก็บ `qa/tests/e2e/**/*.spec.ts` ให้เอง (TL-S04)

### 3.3 package manager และกฎ path ร่วมของ lockfile (TL-M01)

- **pnpm 11** (`packageManager: pnpm@11.24.0` ใน root `package.json`) · Node **24** LTS (`.nvmrc`, `engines`)
- lockfile เดียว `pnpm-lock.yaml` ที่ root · เจ้าของคือ tech-lead
- `saveExact: true` · ทุก dependency pin เวอร์ชันตรง ไม่มี `^` หรือ `~`
- `minimumReleaseAge: 10080` (7 วัน) · resolve เฉพาะเวอร์ชันที่ออกมาแล้วอย่างน้อย 7 วัน กัน package ที่ถูกยึดแล้วปล่อยเวอร์ชันใหม่ · ห้ามใช้ `minimumReleaseAgeExclude` โดยไม่มี ADR
- `allowBuilds`: อนุญาต install script เฉพาะ `esbuild` และ `workerd` (ที่ Vite และ Wrangler ต้องใช้) · ที่เหลือถูกปฏิเสธ
- การแก้ `dependencies` หรือ `devDependencies` ใน `package.json` ใดก็ตาม และการสร้าง workspace ใหม่ (`package.json` ใหม่ใต้ glob) ถือว่าเขียน lockfile · ใน wave หนึ่งมีได้ไม่เกิน 1 งานที่ประกาศ lockfile ใน Writes
- งานอื่นที่ต้องการ dependency ใหม่: เขียน handoff ถึง tech-lead พร้อมชื่อ package เหตุผล และ workspace · orchestrator เปิดงาน `X` ของ tech-lead ใน wave ถัดไป (Writes: lockfile, root `package.json`, `package.json` ของ workspace นั้น) · ระหว่างรอใช้ assumption ต่อได้
- เจ้าของ workspace แก้ส่วนอื่นของ `package.json` ตัวเองได้ (`scripts`, `exports`) โดยไม่ถือว่าเขียน lockfile ตราบที่ไม่แตะ dependency
- Python ใน `tools/` ที่มี dependency นอก stdlib pin ต่อโฟลเดอร์ (`requirements.txt` + `.venv/` ในโฟลเดอร์นั้น) จึงไม่ชน lockfile · script ที่ใช้ stdlib ล้วนไม่ต้องมีทั้งสองอย่าง (3.11)

### 3.4 TypeScript

- TypeScript **6.0** (typescript-eslint 8 รองรับถึง `<6.1` · TS 7 native ยังใช้กับ typescript-eslint ไม่ได้ ทบทวนเมื่อรองรับ)
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `noImplicitReturns`, `verbatimModuleSyntax`, `isolatedModules`, `moduleResolution: Bundler`, target ES2023
- `packages/shared/tsconfig.json` ไม่มี DOM และไม่มี Node types โดยเจตนา: ทุกอย่างในนั้นต้องรันบน Worker / Durable Object ได้ตรงๆ · ถ้าเผลอใช้ `window` หรือ `fs` typecheck จะพัง
- root `tsconfig.json` เป็น catch-all สำหรับ root config และ workspace ที่ยังไม่มี tsconfig ของตัวเอง (`packages/location`, `tools/traces`, `tools/sim`, `qa/tests`) · เมื่อ workspace ใดเพิ่ม tsconfig + script `typecheck` ของตัวเอง ให้ย้ายออกจาก `include` ของ root (ผ่านงาน tech-lead)
- `apps/client` และ `apps/api` มี tsconfig ของตัวเอง (DOM สำหรับ client, `@cloudflare/workers-types` สำหรับ api) เพราะ environment ต่างกัน

### 3.5 lint และ format

- ESLint flat config (`eslint.config.js`) + `typescript-eslint` ชุด `strict` + `eslint-config-prettier` · Prettier (`.prettierrc.json`) ตรวจเฉพาะโค้ดและ config ของโค้ด · เอกสาร `.md`, `config/`, `data/`, `design/`, `studio/` ไม่ถูก reformat (ดู `.prettierignore`)
- **กัน magic number:** `@typescript-eslint/no-magic-numbers` เป็น error ในโค้ดทุกไฟล์ · ตัวเลขที่อนุญาต `-1, 0, 1, 2, 100` · ปิดใน test, e2e, `qa/tests/`, `*.config.ts`
  - **ไฟล์สร้าง golden vector** (`tools/sim/src/vectors*.ts`): ห้ามปิด rule ทั้งไฟล์ด้วย `eslint-disable` และ **ไม่มี override** ใน `eslint.config.js` (D-062 · ดูหมายเหตุใน `eslint.config.js` หลังบล็อก `no-restricted-imports`) · ไฟล์เหล่านี้ผ่าน rule เต็มชุด: กรณีขอบที่อ้างค่า config (เพดาน, จำนวนสมาชิกสูงสุด, เกณฑ์ถอยอัตโนมัติ, เลเวลสูงสุด) อ่านจาก `SimParams` / `EconomyRefs` ไม่พิมพ์เลข เพื่อให้กรณีขอบย้ายตาม config · ค่าตัวอย่างของ input ที่ไม่ใช่ค่า balance (เลเวล 25, gap 3) เป็น const ที่ตั้งชื่อ (`CASE`) · override แบบปิด rule ทั้ง glob จะซ่อนค่า balance ที่ hardcode ในอนาคต จึงไม่ทำ
  - `eslint-disable` ของ `no-magic-numbers` นอก test เป็น finding ของ tech gate (ตรวจด้วย `grep -rn "eslint-disable.*no-magic-numbers" apps packages tools --include='*.ts'`)
  - lint จับได้เฉพาะ literal ในนิพจน์ · ค่าคงที่ที่ตั้งชื่อแล้ว (`const GATE_M = 50`) ผ่าน lint แต่ **ถือว่าผิดใน tech gate** ถ้าเป็นค่า balance หรือค่าที่มีผลต่อรางวัล · ค่าที่ยอมให้เป็น const ในโค้ดคือค่าคงที่ทางฟิสิกส์หรือหน่วย (รัศมีโลก, 1000 m ต่อ km, 60 s ต่อ min) และต้องตั้งชื่อบอกหน่วย
- **กัน import ข้ามขอบ:** `@typescript-eslint/no-restricted-imports` ใน `apps/**` และ `packages/**` ห้าม pattern `**/tools/**` และ `@keep-walking/tools-*` (ทดสอบแล้วว่า lint แจ้ง error ทั้งสองแบบ ดูหัวข้อ 6)
- กฎเพิ่ม: `consistent-type-imports`, `eqeqeq`, `no-console` (ยกเว้น `warn`/`error` และยกเว้น `tools/**`)
- `pnpm lint` = `eslint . --max-warnings=0 && prettier --check .` · warning ถือเป็น fail

### 3.6 test runner และ e2e runner

- **Vitest 5** ตัวเดียวที่ root (`vitest.config.ts`) เก็บ `apps/*/src|test`, `packages/*/src|test`, `tools/*/src|test` และ `qa/tests/**` · environment `node` · coverage v8 ออกที่ `reports/coverage/` (ignore)
  - ถ้า client ต้องการ DOM environment ให้ handoff ถึง tech-lead เพื่อเพิ่ม Vitest project และ dependency (jsdom หรือ happy-dom)
  - **pytest bridge** (P1-X05, P1-X07): include มี `tools/coverage/pipeline/tests/**/*.test.ts` และ `tools/coverage/boundaries/tests/**/*.test.ts` · แต่ละไฟล์ (`pytest-bridge.test.ts`) เรียก pytest ด้วย `tools/coverage/.venv` · ไม่มี venv ในเครื่อง → skip พร้อมคำเตือน (`pnpm test` ของ dev ที่ไม่ได้ทำงาน GIS ยังผ่าน) · env `COVERAGE_PYTEST_REQUIRED=1` → ไม่มี venv = fail แทน skip · CI ตั้งค่านี้เสมอ (3.11)
  - ประเภท test: unit สำหรับ logic, trace-replay สำหรับ location logic (อ่าน trace จาก `data/gps-traces/` ผ่าน MockLocationProvider), contract test สำหรับ API (Phase 3)
- **Playwright 1.63** (`playwright.config.ts`) เก็บ `qa/tests/e2e/**/*.spec.ts` และ `apps/*/e2e/**/*.spec.ts`
  - project `android-chrome` (Pixel 7, Chromium) และ `ios-safari` (iPhone 14, WebKit) ตาม D-003 · ค่าตั้งต้น geolocation อนุญาตแล้ว, locale `th-TH`, timezone `Asia/Bangkok`
  - `baseURL` จาก env `E2E_BASE_URL` (ค่าตั้งต้น `http://localhost:4173` คือ `vite preview`) · หน้าที่ใช้ geolocation ต้องเป็น secure context (`localhost` หรือ https) มิฉะนั้น browser ไม่ให้ตำแหน่ง
  - ติดตั้ง browser ด้วย `pnpm test:e2e:install` (ต้องใช้เน็ต ~200 MB ต่อเครื่อง, cache ที่ `~/Library/Caches/ms-playwright`)
  - e2e ใช้ fixture ในเครื่องเท่านั้น ห้ามดาวน์โหลด tile หรือข้อมูลใหญ่ระหว่าง test (TL-S11)
  - CI รัน e2e เป็น job แยก (P1-F02-T07)

### 3.7 root scripts (CI เรียกชุดเดียวกัน)

| คำสั่ง | ทำอะไร |
| --- | --- |
| `pnpm lint` | ESLint ทั้ง repo + Prettier check |
| `pnpm typecheck` | `tsc` ของ root catch-all + `typecheck` ของทุก workspace ที่มี script |
| `pnpm test` | Vitest ครั้งเดียว |
| `pnpm build` | `build` ของทุก workspace ที่มี script (ตอนนี้ยังไม่มี workspace ที่ต้อง build · client เพิ่มใน P1-F02-T09) |
| `pnpm test:e2e` | Playwright (`--pass-with-no-tests` จนกว่า QA/client จะเพิ่ม spec) |
| `pnpm test:e2e:install` | ดาวน์โหลด Chromium + WebKit ของ Playwright |
| `pnpm check` | lint + typecheck + test + build ต่อกัน |

- CI (P1-F02-T07) เรียกคำสั่งชุดนี้เท่านั้น ไม่มี logic ของตัวเองใน workflow · test ของ Python ใน `tools/coverage/` รันจาก `pnpm test` ผ่าน Vitest bridge (3.6) · CI มีแค่ step เตรียม environment (สร้าง venv, 3.11) ไม่มี step รัน pytest แยก
- เจ้าของ workspace เพิ่ม script ในระดับ workspace ได้ (`build`, `typecheck`, `dev`) · root รวมให้อัตโนมัติผ่าน `pnpm -r --if-present`

### 3.8 server authority และ pure function (SF-10)

- logic ของ **movement gate, damage, drop, exp** (และต่อไป contribution, tax, trust) เป็น pure function ใน `packages/shared` (geometry พื้นฐานใน `packages/geo`) · input ทั้งหมดรวมค่า config ส่งเข้าเป็น parameter · ไม่มี I/O, ไม่มีเวลาจริง, ไม่มี random ที่ไม่ได้รับ seed เข้ามา
- โค้ดเดียวกันรันบน server (Worker / Durable Object) ใน Phase 3 ขึ้นไป **ห้าม fork logic** ระหว่าง client กับ server
- ทุกสูตรต้องผ่าน golden vectors ของ systems-designer (หัวข้อ 3.9) ใน `pnpm test`
- Phase 2 (client-first) เรียก function เหล่านี้บน client เพื่อพิสูจน์ loop เท่านั้น · **ผลที่คำนวณบน client ใน Phase 2 ไม่ใช่รางวัลจริง และไม่ถูกย้ายเข้า account ใน Phase 3** · ตั้งแต่ Phase 3 client ส่งแค่ตำแหน่ง + timestamp (batch ทุกนาที) และ server คำนวณทุกค่าที่มีผลต่อรางวัลจาก trace
- client ที่คำนวณค่าที่มีผลต่อรางวัลแล้วส่งให้ server เชื่อ = tech gate fail อัตโนมัติ

### 3.9 รูปแบบ golden vectors (รูปแบบกลาง)

- ไฟล์ `design/systems/test-vectors/<formula>.json` · รูปแบบ `{ "formula": "<name>", "vectors": [ { "input": {...}, "expected": <value>, "tolerance": <number>, "source": "<GDD section | config key | sim run>" } ] }`
- `tolerance` เป็นค่าต่างสัมบูรณ์สูงสุดต่อค่าตัวเลข · 0 = ต้องเท่ากันพอดี · ค่าที่ไม่ใช่ตัวเลขต้องเท่ากันพอดี
- type `GoldenVector` / `GoldenVectorFile` และตัวเปรียบเทียบ `isWithinTolerance` อยู่ใน `packages/shared/src/golden-vector.ts` · simulator (`tools/sim`) และ test ใน `packages/shared` ใช้ตัวเดียวกัน

### 3.10 ข้อตกลง config (TL-N02 · แก้ไขและยืนยันใน P1-H01)

ยืนยัน convention ที่ `config/balance/*.json` (P1-F03-T06) และ `config/app/*.json` (P1-H05) ใช้อยู่ ทุกข้อด้านล่างตรงกับไฟล์ที่มี ยกเว้นที่ระบุว่า "ต้องเพิ่ม"

**3.10.1 namespace ตาม path**

| โฟลเดอร์ | เนื้อหา | เจ้าของ | ผู้อ่าน |
| --- | --- | --- | --- |
| `config/balance/` | ค่า balance สูตร movement gate เศรษฐกิจ anti-cheat และค่า PDPA ฝั่ง server | systems-designer (liveops-operator ปรับในช่วง operate) | server (Phase 3+), simulator, tools · client อ่านเพื่อแสดงผลเท่านั้น |
| `config/content/` | ชื่อ copy registry ของ copy และข้อมูลเนื้อหา | narrative-designer (copy, ชื่อ) · level-designer (ข้อมูล dungeon เมื่อมี) | client, หลังบ้าน, copy lint |
| `config/app/` | ค่า runtime ของ app และ tools ที่ไม่ใช่ balance: option ของ provider, ค่าเริ่มต้นของ query, นิยามการวัดของ HUD, privacy ฝั่งเครื่อง, การวัด telemetry (sampling, bucket, timestamp) | tech-lead | client, tools, server เฉพาะส่วนที่ไม่กระทบรางวัล (telemetry ingest อ่าน `app.telemetry.timestamps`) |

- `config/app/` **ห้าม** มีค่าที่มีผลต่อรางวัล การต่อสู้ เศรษฐกิจ หรือ movement gate และห้ามมีชื่อหรือข้อความที่ผู้เล่นเห็น · ถ้าไม่แน่ใจว่าค่าอยู่ที่ไหน: ผู้เล่นรู้สึกได้ในกติกา → `balance` · ผู้เล่นอ่าน → `content` · ที่เหลือ → `app`
- `telemetry.json` อยู่ `config/app/` (D-062, ย้ายใน P1-X16 key เดิม): telemetry วัดเกม ไม่มีค่าใดเปลี่ยนรางวัล movement gate การต่อสู้ หรือเศรษฐกิจ · server อ่านไฟล์ใน `config/app/` ได้ตามกติกาเดียวกัน (ห้ามใช้ค่าจาก `app` ในการคำนวณที่กระทบรางวัล) · bucket อ้างสเกลของ `config/balance/economy.json` เป็นข้อมูลอ้างอิงเท่านั้น ไม่ merge
- ชื่อเต็มของค่า = `<โฟลเดอร์>.<ชื่อไฟล์ไม่มี .json>.<path>` เช่น `balance.dungeons.movementGate.minDistancePerWindow_m`, `app.privacy.rawTraceExport.rawTraceTrim_m` · loader ห้าม merge ไฟล์ข้ามโฟลเดอร์ (`app/privacy.json` กับ `balance/privacy.json` อยู่คู่กันได้โดยไม่ชน)
- ค่าหนึ่งมีที่อยู่เดียว · ที่อื่นอ้างด้วย pointer (3.10.6) ไม่คัดลอกค่า

**3.10.2 ไฟล์**

- JSON ล้วน UTF-8 ไม่มี comment · top-level เป็น object
- ทุกไฟล์มี `_meta` ที่ top-level: `file`, `version` (integer เพิ่มเมื่อความหมายของ key เปลี่ยน), `owner`, `task`, `doc` · ตัวเลือก `readBy`, `locale`, `_note`
- โค้ดอ่านอย่างเดียว ไม่มีโค้ดใดเขียนลง `config/`

**3.10.3 key และหน่วย**

- key เป็น camelCase · ค่าตัวเลขเป็นตัวเลขตรง ไม่ห่อ object (`"window_s": 300` ไม่ใช่ `{ "value": 300 }`) · ตารางใช้ array ของ object ได้ (เช่น `marketTax.brackets`) โดย element ทำตามกติกาเดียวกัน
- ค่าที่มีหน่วยต้องมี suffix ท้ายชื่อ:

| suffix | หน่วย | ตัวอย่างที่ใช้อยู่ |
| --- | --- | --- |
| `_m` | เมตร | `maxAccuracy_m` |
| `_m2` | ตารางเมตร (แทน `_sqm` ของฉบับแรก · ไม่มีไฟล์ใดใช้ `_sqm`) | `minArea_m2` |
| `_ms` | มิลลิวินาที | `timeout_ms`, `maximumAge_ms` (app · `WebLocationOptions` ใช้ชื่อเดียวกันตั้งแต่ P1-X05, D-062) |
| `_s` · `_h` · `_days` · `_yr` | วินาที · ชั่วโมง · วัน · ปี | `window_s`, `cooldown_h`, `minAccountAge_days`, `minAge_yr` (P1-H03) |
| `_kmh` | กม./ชม. | `speedLock_kmh` |
| `_pct` | เปอร์เซ็นต์ 0–100 (16 = 16%) | `autoRetreatThreshold_pct` |
| `_ratio` | สัดส่วน 0–1 | — |
| `_gold` | หน่วยเงินในเกม | `buyPrice_gold` |
| `_levels` | จำนวนเลเวล (ช่วงหรือระยะห่าง) | `exampleRangeWidth_levels` |
| `_pct<Ref>[Per<Unit>]` | เปอร์เซ็นต์ของค่าอ้างอิงที่ตั้งชื่อ ต่อหน่วย (suffix ผสม) | `heal_pctMaxHp`, `inDungeonHealBase_pctMaxHpPerMin`, `shieldPerRewardTick_pctMaxHpPerBuffPct` |

- regex ของ suffix: `_(m|m2|ms|s|h|days|yr|kmh|pct|ratio|gold|levels)$` หรือ `_pct[A-Z][A-Za-z]*$` · suffix ใหม่ต้องแก้ตารางนี้ (tech-lead)
- ไม่ต้องมี suffix: boolean · string enum · จำนวนนับที่ชื่อบอกสิ่งที่นับ (`maxMembers`, `durationTicks`, `spawnPointsMin`) · จำนวนนับที่ชื่อลงท้าย `Threshold` เมื่อ object แม่หรือ `_note` บอกสิ่งที่นับ (`dungeons.reportThreshold` = จำนวนผู้เล่นที่รายงาน, D-062) · เกณฑ์ที่มีหน่วยยังต้องมี suffix (`farDungeonThreshold_m`, `autoRetreatThreshold_pct`) · อัตราส่วนไร้หน่วยที่ชื่อ camelCase ลงท้าย `Ratio` และบอกตัวตั้งกับตัวหาร (`maxAspectRatio` = ด้านยาว/ด้านสั้น, `incomeToPotionRatio`, `minBaseToCapRatio`) ไม่ผูกช่วง 0–1 (`maxAspectRatio` = 8 ได้, D-062) · suffix `_ratio` สงวนไว้สำหรับสัดส่วน 0–1 ของทั้งหมดที่ไม่ได้ตั้งชื่อ · ตัวคูณไร้หน่วยที่ชื่อมี `Mult`, `Coef` หรือ `Divisor` · percentile ที่ชื่อลงท้าย `Percentile` · ความยาวข้อความที่ชื่อมี `Cells` (copy registry)
- key ที่เป็น suffix ล้วน (`base_pct`, `cap_pct`) ใช้ได้เมื่อ object แม่บอกบริบท
- เวลาของวัน: string `"HH:mm"` ใน key ที่ลงท้าย `LocalTime` คู่กับ `timezone` (IANA) ใน object เดียวกัน · วันในสัปดาห์: string อังกฤษตัวเล็ก (`"saturday"`)

**3.10.4 key metadata (ขึ้นต้นด้วย `_`)**

- ทุก key ที่ขึ้นต้นด้วย `_` เป็น metadata · โค้ดและ loader **ข้ามเมื่อวนลูป** และไม่อ่านเป็นค่า
- `_source`: บังคับในทุก object ที่มีค่า (ยกเว้น `_meta`) · string หรือ map ชื่อ key → หัวข้อ GDD / decision ID / เอกสาร · ข้อยกเว้น: รายการใน `config/content/copy.<locale>.json` และ `_variables` ของไฟล์เดียวกันไม่ต้องมี `_source` ต่อรายการ (ที่มาคือ `_meta.doc`, field `context` และ `source` ของตัวแปร) · object ใน `config/content/copy-rules.json` (`limits`, `formats`) ยังต้องมี · ไฟล์ copy อ่านเป็น flat key map ห้ามแยก key ตามจุด (`docs/tech/copy-schema.md` หัวข้อ 2.1)
- `_assumption`: `"A-<task>-<n>: <ข้อสมมติ>. Owner: <role>"` · `_note`: คำอธิบายอิสระ
- รูปต่อ key `_<key>_source`, `_<key>_assumption` ใช้ได้เมื่อ object มีหลายค่าที่มาต่างกัน (เช่น `_npcDailySellLimit_source`)
- `_meta` อยู่ที่ top-level เท่านั้น · `_nullMeans` ดู 3.10.5

**3.10.5 `null`**

- `null` = **ยังไม่ตั้งค่า** เป็นความหมายตั้งต้น · accessor ของ loader ต้อง throw `ConfigUnsetError` ที่บอกชื่อเต็มของค่าเมื่อถูกอ่าน · simulator, server และ client ห้ามเดาค่าแทน · ค่าที่ยังไม่ตั้งแต่ไม่มีใครอ่านไม่ทำให้โหลดล้ม
- `null` ที่ตั้งใจ (ไม่ใช่ยังไม่ตั้ง) ต้องประกาศใน object เดียวกัน: `"_nullMeans": { "<key>": "unbounded" | "none" }` · สำหรับ element ใน array ใช้ `"<arrayKey>[].<field>"` · `unbounded` = ไม่มีเพดาน · `none` = สิ่งนี้ไม่มี (เช่น ขายให้ NPC ไม่ได้, ไม่มีชั้น) · accessor คืน `null` ได้เฉพาะ key ที่ประกาศ
- `null` ในไฟล์ ณ P1-H01 (7 จุด) · **ต้องเพิ่ม** `_nullMeans` 5 จุด (handoff systems-designer):

| ค่า | ความหมาย | `_nullMeans` |
| --- | --- | --- |
| `balance.enhance.bossGearMaterial.bossCorePerAttempt` | ยังไม่ตั้ง (Phase 6) | ไม่ประกาศ |
| `balance.raid.bossDamage.bossAtkPerTick` | ยังไม่ตั้ง (Phase 6) | ไม่ประกาศ |
| `balance.combat.levelGapDamage.maxMult` | ไม่มีเพดาน | `unbounded` |
| `balance.economy.npcPricing.npcDailySellLimit` | ไม่จำกัด | `unbounded` |
| `balance.economy.marketTax.brackets[].toDailySales_gold` | ขั้นบนสุดไม่มีเพดาน | `unbounded` |
| `balance.economy.npcSellPrice_gold.equipment` | ขายให้ NPC ไม่ได้ | `none` |
| `balance.dungeons.verification.v1FloorLevel` | กลางแจ้ง ไม่มีชั้น (non-negotiable 5) | `none` |

**3.10.6 pointer (`seeFile`, `see<Name>`)**

- key `seeFile` หรือ `see` + ชื่อ camelCase (`seeGateWindow`, `seeMonsterAtk`) มีค่าเป็น string `<ไฟล์>#<path คั่นด้วยจุด>` บอกว่าค่านี้อยู่ที่อื่น
- ไฟล์ไม่มี `/` = โฟลเดอร์เดียวกัน (`drops.json#smallDungeon`) · มี `/` = จากรากของ repo และขึ้นต้นด้วย `config/` (`config/balance/dungeons.json#movementGate`) · path ชี้ object หรือค่าเดี่ยวได้ ชี้เข้า array ไม่ได้
- pointer ไม่ใช่ค่า: loader ข้ามเมื่อวนลูปเหมือน key `_` · config lint ตรวจว่าปลายทางมีจริง · ห้ามตั้งชื่อ key ค่าจริงขึ้นต้นด้วย `see` ตามด้วยตัวใหญ่

**3.10.7 การโหลดในโค้ด**

- Phase 1: JSON import หรืออ่านไฟล์ แล้วเข้าถึงผ่าน helper ที่ใช้กติกา 3.10.4–3.10.6 (ข้าม `_` และ pointer, throw เมื่อ `null` ที่ไม่ประกาศ) · helper อยู่ใน `packages/shared` เมื่อมีผู้ใช้เกิน 1 ที่ (tech-lead)
- Phase 2: JSON Schema ต่อไฟล์ (tech-lead) และ loader ที่ validate ก่อนใช้ · Ajv ใช้ได้ใน tools, test และ build step เท่านั้น เพราะ Worker ห้าม `new Function` (ดู `packages/shared/src/trace.ts`)
- config lint (ตรวจ `_meta`, `_source` ในทุก object ที่มีค่า, regex suffix และข้อยกเว้นของ 3.10.3, ปลายทาง pointer, `null` ที่ไม่ประกาศเป็น WARN) เป็นงานของ tech-lead ใน Phase 2 (D-062) · ระหว่างนี้ tech gate ตรวจด้วยตา
- ชื่อทุกอย่างที่ผู้เล่นเห็น (zone, dungeon, monster, item, boss) มาจาก `config/content/` หรือ back office ไม่อยู่ในโค้ด · schema ของ `copy.th.json` และ registry ตัวแปรอยู่ใน `docs/tech/copy-schema.md`

### 3.11 นโยบายภาษาใน `tools/`

- TypeScript เป็นค่าตั้งต้น (workspace ใน glob `tools/*`, source ใน `src/`, รันด้วย `pnpm exec tsx`)
- Python ได้สำหรับงาน GIS (`tools/coverage/`) · pin เวอร์ชันใน `requirements.txt` ของโฟลเดอร์นั้น, venv ที่ `tools/<name>/.venv/` (ignore), Python 3.11 ขึ้นไป · README ของโฟลเดอร์ระบุคำสั่งติดตั้งและรัน test
  - test ของ Python รันจาก `pnpm test` ผ่าน Vitest bridge (3.6) · CI สร้าง `tools/coverage/.venv` จาก `requirements.txt` เมื่อ cache miss (cache key = hash ของ `requirements.txt`) แล้วรัน `pnpm test` ด้วย `COVERAGE_PYTEST_REQUIRED=1` (P1-X07, `.github/workflows/ci.yml`)
- `tools/tiles/` ใช้ shell + CLI `pmtiles` (binary เดียว pin เวอร์ชันและ checksum ใน README) · ถ้าต้องใช้ Node ให้ขอสร้าง workspace ผ่านงาน tech-lead
  - script Python ใน `tools/tiles/bin/` (`serve.py`, `verify-bbox.py`) ใช้ได้เมื่อเป็น **stdlib ล้วน** Python 3.11 ขึ้นไป ไม่ต้องมี `requirements.txt` หรือ venv · ถ้าต้องการ package นอก stdlib ให้ทำตามกติกาของ `tools/coverage/` ข้างบน (pin + venv ในโฟลเดอร์) และแจ้ง tech-lead
- ผลลัพธ์ของ tools ที่ commit ได้ต้องเล็กและไม่มีข้อมูลส่วนบุคคล · ข้อมูลดิบอยู่ในโฟลเดอร์ที่ ignore

### 3.12 git, การ commit และ `.gitignore`

- `git init` branch หลัก `main` · remote `origin` = `https://github.com/pongponWorkspace/keep-walking` · **agent ไม่ push** (push แรกเป็นงานคน P1-F02-T18 หลังเปิด secret scanning + push protection)
- git config ระดับ repo เท่านั้น ไม่แตะ global: `user.name = keep-walking studio`, `user.email = pongponWorkspace@users.noreply.github.com` (กันอีเมลจริงของคนหลุดไปใน history ของ repo public · คนเปลี่ยนเป็นตัวตนของตัวเองได้ก่อน push ด้วย `git config --local user.email <noreply ของตัวเอง>` แล้ว `git commit --amend --reset-author` สำหรับ commit ที่ยังไม่ push), `core.autocrlf = input`
- **นโยบาย commit:** agent ไม่ commit เอง · orchestrator commit เมื่อจบแต่ละ wave ข้อความขึ้นต้นด้วย task ID (`P1-F02-T03: ...`) และ `git add` เฉพาะ path ใน Writes ของงานที่ DONE · ข้อยกเว้นเดียวคือ commit แรกของ P1-F02-T01 ที่ `git add` เฉพาะ path ของงานนี้ · ก่อน commit ทุกครั้งตรวจ `git status` ว่าไม่มีไฟล์ต้องห้ามถูก stage
- `.gitignore` (เจ้าของ tech-lead · งานอื่นขอเพิ่มผ่าน handoff) ครอบคลุม:
  - secret: `.env`, `.env.*` ยกเว้น `.env.example`, `.dev.vars*` ยกเว้น `.dev.vars.example`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `service-account*.json`, `credentials*.json`, `secrets/`
  - ข้อมูลดิบใหญ่: `*.osm.pbf`, `*.osm`, `*.o5m`, `*.tif`, `*.tiff`, `*.mbtiles`, `tools/coverage/{downloads,raw,cache,.cache}/`
  - tile: `*.pmtiles` ทุกไฟล์ยกเว้นใต้ `tools/tiles/fixtures/`, `tools/tiles/out/`, `tools/tiles/downloads/`
  - ข้อมูลตำแหน่งจริง (PDPA): `data/gps-traces/raw/`, `qa/playtest/results/raw/`, `*.raw.gpx`, `*.raw.csv` · trace ที่ commit ใน `data/gps-traces/` ต้องเป็น synthetic หรือผ่านการ sanitize (เลื่อนพิกัดและตัดเวลาจริง) ตาม tech note F02
  - output: `node_modules/`, `dist/`, `build/`, `out/`, `.wrangler/`, `.vite/`, `/reports/`, `test-results/`, `playwright-report/`, venv ของ Python (`.venv/`, `venv/`, `__pycache__/`), `audio/out/`
  - อื่นๆ: `.DS_Store`, `.idea/`, `.vscode/*`, `.claude/settings.local.json`
  - หมายเหตุ: ไม่ ignore `coverage/` แบบทั้ง repo เพราะจะกิน `tools/coverage/` และ `data/coverage/` · coverage ของ test ออกที่ `/reports/` แทน

### 3.13 dependency ที่ติดตั้งล่วงหน้า (pin ตรง, อายุอย่างน้อย 7 วัน ณ 2026-09-23)

| workspace | dependency | ใช้ใน |
| --- | --- | --- |
| root (dev) | `typescript` 6.0.3, `@types/node` 24.13.5, `tsx` 4.23.13 | ทุกงานโค้ด, สคริปต์ใน `tools/` |
| root (dev) | `vitest` 5.0.1, `@vitest/coverage-v8` 5.0.1 | unit, trace-replay, golden vectors |
| root (dev) | `@playwright/test` 1.63.0 | e2e (P1-F02-T13) |
| root (dev) | `eslint` 10.10.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.70.0, `globals` 17.12.0, `eslint-config-prettier` 10.1.8, `prettier` 3.9.6 | lint / format |
| root (dev) | `wrangler` 4.132.0 | local preview และ deploy บน Cloudflare Pages/Workers (P1-F02-T08, T19 ตาม D-008) |
| `apps/client` | `maplibre-gl` 6.10.0, `pmtiles` 4.5.0 · dev `vite` 8.3.0 | spike แผนที่ (P1-F02-T09) · MapLibre 6.10 ESM ต้องตั้ง worker URL เองผ่าน `maplibre-gl-worker.mjs?worker&url` + `setWorkerUrl()` ใน `apps/client/src/map/worker.ts` (D-068) · bump `maplibre-gl` ต้องตรวจกติกานี้ซ้ำ |
| `packages/shared` | `ajv` 8.20.0, `ajv-formats` 3.0.1 · dev `@types/geojson` 7946.0.16 | JSON Schema ของ trace และ config (P1-F02-T03) |
| `tools/traces` | `ajv` 8.20.0, `ajv-formats` 3.0.1 | validate trace |
| `packages/location`, `tools/sim` | `@keep-walking/shared` (workspace) | interface และ simulator |
| root (dev) · เพิ่มใน P1-H01 (ติดตั้งในงาน `X` ของ tech-lead) | `@maplibre/maplibre-gl-style-spec` 26.4.4 (เวอร์ชันเดียวกับที่ `maplibre-gl` 6.10.0 ดึงมาอยู่แล้วใน lockfile จึงไม่มีโค้ดใหม่) | ตรวจ style JSON ของ art-director ใน `pnpm test` (`validateStyleMin`) แทนการเรียก path ใต้ `node_modules/.pnpm/` · bump คู่กับ `maplibre-gl` เสมอ |
| `tools/copy-lint` (workspace ใหม่ P1-H02) | `@keep-walking/shared` (workspace), `ajv` 8.20.0, `ajv-formats` 3.0.1 | copy lint (`docs/tech/copy-schema.md` หัวข้อ 8.1) |

- ไม่มี Mapbox หรือ Google SDK · งานที่ต้องการ dependency อื่นให้ handoff ถึง tech-lead

## 4. ผลที่ตามมา

ข้อดี
- ทุกงานโค้ดเริ่มได้ทันทีโดยไม่ต้องแก้ lockfile ใน Phase 1 (dependency ที่คาดได้ติดตั้งแล้ว)
- ขอบเขต server authority บังคับด้วยโครงสร้าง: สูตรอยู่ใน `packages/shared` ที่ไม่มี DOM/Node API และ lint กันไม่ให้โค้ด product พึ่ง `tools/`
- CI กับเครื่อง dev รันคำสั่งเดียวกัน · supply-chain ถูกกันด้วยอายุเวอร์ชัน 7 วัน + install script แบบ allowlist

ข้อเสียและความเสี่ยง
- การเพิ่ม dependency ต้องผ่านงาน tech-lead เพิ่ม latency 1 wave · ยอมรับเพื่อกัน lockfile ชนกัน
- `minimumReleaseAge` ทำให้ security patch ที่เพิ่งออกเข้าช้า 7 วัน · ถ้ามี CVE ร้ายแรง tech-lead เพิ่ม exclude เฉพาะเวอร์ชันนั้นผ่าน ADR แก้ไข
- TypeScript ถูกตรึงที่ 6.0 จนกว่า typescript-eslint รองรับ 7.x
- root `tsconfig.json` catch-all ต้องดูแลเมื่อ workspace เพิ่ม tsconfig ของตัวเอง
- `no-magic-numbers` ไม่จับค่าที่ตั้งชื่อเป็น const · tech gate ต้องตรวจด้วยตา
- Playwright WebKit ไม่ใช่ iOS Safari จริง · การวัด GPS/แบตบน iOS ยังต้องเดินจริง (P1-F02-T20)
- repo public: ทุกเอกสารภายใน studio เปิดเผยเมื่อ push · คนต้องทวนก่อน push แรก (P1-F02-T18)

งานที่ต้องทำต่อ
- ADR 0002 ยืนยัน `apps/api` และ layout ของ Worker/DO (P1-F02-T02)
- tech note F02: `LocationProvider` interface, trace schema, ชื่อ env client ที่ล็อกแล้ว `VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` (P1-F02-T03)
- CI เรียก root scripts + e2e job แยก + gitleaks (P1-F02-T07)
- `packages/geo/package.json` สร้างผ่านงาน tech-lead เมื่อ location-engineer ต้องการ

## 5. ต้นทุน

- เครื่องมือทุกตัวเป็น open source ฟรี · ไม่มีบริการใหม่ ไม่มีบัญชีใหม่ ไม่มีบัตร (D-001)
- GitHub Actions บน repo public ไม่นับนาที (D-002) · browser ของ Playwright ~200 MB cache ต่อ runner
- เวลา: ติดตั้งครั้งแรกราว 1 นาที (pnpm store cache ช่วยในรอบถัดไป)

## 6. หลักฐานการตรวจ (2026-09-23, macOS, Node 24.19.0, pnpm 11.24.0)

| คำสั่ง | ผล |
| --- | --- |
| `pnpm install` | 215 packages, lockfile ผ่าน supply-chain policy (`minimumReleaseAge`), install script เฉพาะ esbuild และ workerd |
| `pnpm lint` | exit 0 · "All matched files use Prettier code style!" |
| `pnpm typecheck` | exit 0 · root catch-all + `packages/shared typecheck: Done` |
| `pnpm test` | exit 0 · "Test Files 1 passed (1) · Tests 5 passed (5)" (`packages/shared/src/golden-vector.test.ts`) |
| `pnpm build` | exit 0 · ยังไม่มี workspace ที่มี script `build` |
| `pnpm test:e2e` | exit 0 · ยังไม่มี spec (`--pass-with-no-tests`) |
| smoke e2e ชั่วคราวนอก repo (ใช้ root config) | "2 passed" บน `android-chrome` และ `ios-safari`: หน้า https จำลองได้พิกัด 13.7309 และ touch event จาก emulation |
| probe lint (ไฟล์ชั่วคราวใน `packages/shared`, ลบแล้ว) | import `../../../../tools/sim/src/x` และ `@keep-walking/tools-sim` → error `no-restricted-imports` · `m >= 50` → error "No magic number: 50" |
| `git check-ignore -v` | ignore: `.env.local`, `.dev.vars`, `*.pem`, `*.key`, `node_modules/`, `tools/coverage/downloads/*.osm.pbf`, `*.tif`, `tools/coverage/.venv/`, `bangkok.pmtiles`, `tools/tiles/out/`, `qa/playtest/results/raw/`, `data/gps-traces/raw/`, `audio/out/`, `.wrangler/`, `reports/` · ไม่ ignore: `.env.example`, `tools/tiles/fixtures/*.pmtiles`, `data/coverage/*.geojson`, `tools/coverage/METHOD.md` |

## 7. บันทึกการแก้ไข

### แก้ไขครั้งที่ 1 — P1-H01 (2026-09-23, tech-lead)

ที่มา: handoff จาก P1-F03-T06 (systems-designer), P1-F03-T03 (narrative-designer), P1-H05 และ P1-F03-T12 · ไม่มี vendor หรือค่าใช้จ่ายใหม่

| หัวข้อ | เปลี่ยนอะไร | เหตุผล |
| --- | --- | --- |
| 3.2 | `config/` มีสามโฟลเดอร์ `balance/`, `content/`, `app/` | `config/app/` เกิดใน P1-H05 · ต้องบอกเจ้าของและขอบเขต |
| 3.5 | กติกา literal ในไฟล์สร้าง golden vector และการตรวจ `eslint-disable` | `tools/sim/src/vectors.ts` และ `vectors-economy.ts` ปิด `no-magic-numbers` ทั้งไฟล์ และมีกรณีขอบที่พิมพ์ค่า config ตรง (เช่น `8` = `classes.json` `maxMembers`) |
| 3.10 | เขียนใหม่เป็น 3.10.1–3.10.7: namespace ตาม path, `_meta`, ตาราง suffix (เพิ่ม `_ms`, `_m2`, `_h`, `_days`, `_yr`, `_gold`, `_levels`, suffix ผสม `_pct<Ref>[Per<Unit>]` · เลิก `_sqm`), metadata `_*` รวมรูปต่อ key, `null` = ยังไม่ตั้ง + `_nullMeans`, pointer `seeFile`/`see<Name>`, การโหลด | ยืนยัน convention ที่ไฟล์จริงใช้อยู่ และปิดช่องที่ `null` มีสองความหมายโดยไม่มีป้ายบอก |
| 3.13 | เพิ่ม `@maplibre/maplibre-gl-style-spec` 26.4.4 (root dev) และ dependency ของ `tools/copy-lint` | ตรวจ style ใน `pnpm test` แทนการเรียก path ภายใน `.pnpm/` ที่พังเมื่อ bump · lint ของ copy |

ผลต่อไฟล์ที่มีอยู่: ไม่มีไฟล์ config ที่ผิด convention ใหม่ ยกเว้นต้องเพิ่ม `_nullMeans` 5 จุด (3.10.5) · งานที่ต้องทำต่อ (เป็น handoff ในรายงานของ P1-H01):

- systems-designer: `_nullMeans` 5 จุด · กรณีขอบใน `tools/sim/src/vectors*.ts` อ่านจาก `SimParams` (บรรทัด 143–146 `maxMembers`, 381–386 เพดาน Magic และพื้นของ gap, 618 เพดาน Tanker, 621–625 เกณฑ์ถอยอัตโนมัติ ของ `vectors.ts`) และลบ `eslint-disable` บรรทัด 1 ของทั้งสองไฟล์
- tech-lead (งาน `X`): ~~override ของ `eslint.config.js` สำหรับ `tools/sim/src/vectors*.ts`~~ ยกเลิกตาม D-062 (P1-X05: ไฟล์ผ่าน rule เต็มชุดแล้ว ไม่มี override) · ติดตั้ง `@maplibre/maplibre-gl-style-spec` · script `lint:copy` ที่ root
- ตรวจแล้ว: `node .../gl-style-validate.mjs art/direction/map-style/kw-light.style.json` → exit 0 ไม่มี error (2026-09-23) · ต่อไปรันผ่าน test แทน

### แก้ไขครั้งที่ 2 — P1-X27 (2026-09-24, tech-lead)

ที่มา: tech gate F02 (`docs/reviews/F02-tech-gate.md` T-02..T-05) · บันทึกผลที่ตัดสินแล้วใน P1-X05, P1-X07, D-062, D-068 ให้ ADR ตรงกับไฟล์จริง · ไม่มี vendor หรือค่าใช้จ่ายใหม่

| หัวข้อ | เปลี่ยนอะไร | เหตุผล |
| --- | --- | --- |
| 3.3 | Python ที่ใช้ stdlib ล้วนไม่ต้องมี `requirements.txt` / venv | ตรงกับ `tools/tiles/bin/*.py` |
| 3.5 | ไม่มี override ของ `eslint.config.js` สำหรับ `tools/sim/src/vectors*.ts` · กรณีขอบอ่านจาก `SimParams` / `EconomyRefs` · ค่าตัวอย่างเป็น const ที่ตั้งชื่อ · handoff เดิมในหัวข้อ 7 ขีดว่ายกเลิก | D-062, P1-X05, `eslint.config.js:79-82` (T-02) |
| 3.6, 3.7 | pytest bridge ใน include ของ Vitest · `COVERAGE_PYTEST_REQUIRED=1` (skip เมื่อไม่มี venv ในเครื่อง, บังคับใน CI) · Python test รันจาก `pnpm test` | P1-X05, P1-X07, `vitest.config.ts` (T-03) |
| 3.10.1 | `telemetry.json` อยู่ `config/app/` · ผู้อ่านของ `config/app/` รวม server telemetry ingest (ไม่กระทบรางวัล) | D-062, P1-X16 (T-04) |
| 3.10.3 | จำนวนนับที่ลงท้าย `Threshold` และอัตราส่วน camelCase ลงท้าย `Ratio` (ไม่ผูก 0–1) ไม่ต้องมี suffix · `_ratio` สงวนไว้สำหรับ 0–1 · `timeout_ms` / `maximumAge_ms` ใน `WebLocationOptions` | D-062 (`maxAspectRatio`, `reportThreshold`) (T-04) |
| 3.10.7 | config lint ยกไป Phase 2 | D-062 |
| 3.11 | CI สร้าง `tools/coverage/.venv` จาก `requirements.txt` (cache ตาม hash) · `tools/tiles/` ใช้ Python stdlib ได้โดยไม่มี venv | P1-X07, `.github/workflows/ci.yml` (T-05) |
| 3.13 | กติกา worker URL ของ MapLibre 6.10 ESM ในแถว `apps/client` | D-068, P1-X23 |

ผลต่อไฟล์ที่มีอยู่: ไม่มีไฟล์โค้ดหรือ config ที่ต้องแก้ · ทุกข้อบันทึกสิ่งที่ไฟล์ทำอยู่แล้ว
