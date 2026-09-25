# Environments — local, CI, preview

เจ้าของ: devops-engineer (P1-F02-T07) · แก้เพิ่มโดย P1-F02-T08 (เพิ่ม env ของ host preview)
อ้างอิง: `docs/adr/0001-repo-layout.md` (3.1 repo public, 3.7 root scripts, 3.12 git/.gitignore), `studio/phases/phase-1/board.md` หัวข้อ 1 "กฎ path ร่วม" และ "กฎ repo public (D-002)"

## 1. ภาพรวม environment

Repo นี้มีสอง environment ในเชิงข้อมูล ไม่มี "production" ใน Phase 1:

| environment | ใครรัน | ใช้ทำอะไร | credential |
| --- | --- | --- | --- |
| **local** | ทุกคนที่ dev บนเครื่องตัวเอง | dev client, รัน test/lint/build, เดินทดสอบด้วย Mock LocationProvider | ไม่มี (ใช้ fixture ในเครื่อง) |
| **preview** | GitHub Actions (`workflow_dispatch` แบบสั่งเอง, เพิ่มโดย P1-F02-T08) | build client + tile แล้ว deploy ขึ้น Cloudflare Pages Free (ไม่ผูกบัตร, D-008) | GitHub Actions secret เท่านั้น ไม่มีใน repo |

Phase 1 **ไม่มี production**: การอนุมัติ deploy จริงเป็นงาน HUMAN เสมอ (CLAUDE.md "Actions no agent may take") และไม่มีในขอบเขตงานนี้

## 2. local development ต้อง offline ได้ทั้งหมด

- แผนที่: ใช้ PMTiles fixture ขนาดเล็กใต้ `tools/tiles/fixtures/` (ยกเว้นจาก `.gitignore` ที่ ignore `*.pmtiles` ทุกไฟล์อื่น) หรือ Protomaps demo tile ชั่วคราวตามที่ P1-F02-T09 ระบุ
- ตำแหน่งผู้เล่น: `MockLocationProvider` เล่น GPS trace จาก `data/gps-traces/` แทนพิกัดจริงของเบราว์เซอร์ ไม่ต้องมี GPS จริงหรือเครือข่ายภายนอก
- ฐานข้อมูล: Phase 1 ยังไม่มี backend service (`apps/api` ยังไม่สร้าง ตาม ADR 0001 3.2) เมื่อสร้างในเฟสถัดไป local ใช้ D1 จำลอง (SQLite ผ่าน `wrangler dev` หรือ Durable Object local storage) ไม่ต้องพึ่งบัญชี Cloudflare
- ทดสอบ (`pnpm test`, `pnpm test:e2e`) ต้องไม่พึ่งเครือข่ายภายนอกระหว่างรัน (ใช้ fixture, ไม่ยิง API จริง)

## 3. รายการ environment variable

`.env.example` (root, ที่ path นี้เท่านั้น) คือรายชื่อตัวแปรที่เป็นทางการ ก็อปปี้เป็น `.env.local` (ถูก `.gitignore` กัน) แล้วใส่ค่าเอง ห้ามใส่ค่าใน `.env.example`

| ตัวแปร | ฝั่ง | ใช้ทำอะไร | local | preview |
| --- | --- | --- | --- | --- |
| `VITE_TILES_URL` | client (Vite, bundle เป็นค่า build-time) | base URL ของ PMTiles ที่ MapLibre เปิดผ่าน `pmtiles://` protocol | ชี้ fixture ในเครื่องหรือ dev server | ชี้ origin ของ Cloudflare Pages deployment |
| `VITE_GLYPHS_URL` | client | base URL ของ font glyph (PBF) ที่ style ใช้ | เช่นเดียวกับข้างต้น | เช่นเดียวกับข้างต้น |
| `VITE_SPRITE_URL` | client | base URL ของ sprite (`sprite.json`/`sprite.png` และ `@2x`) | เช่นเดียวกับข้างต้น | เช่นเดียวกับข้างต้น |
| `TILES_PUBLIC_BASE_URL` | deploy/publish script (ไม่ bundle เข้า client) | URL สาธารณะที่ tile/glyph/sprite ที่ publish แล้วจะไปอยู่ | ไม่ใช้ (build ในเครื่องอ่าน fixture ตรง) | Cloudflare Pages Free ตาม D-008 |

**ไม่มีชื่อ env ที่ผูกกับ R2** (เช่น `R2_PUBLIC_BASE_URL`, `R2_BUCKET`) ตามมติ D-008: Phase 1 ใช้ Cloudflare Pages/Workers static assets แผน Free แทน R2 (ต้องผูกบัตรจึงยังไม่เปิด, D-001) การย้ายไป R2 ในอนาคตจึงเปลี่ยนแค่ค่าของ `TILES_PUBLIC_BASE_URL` และ target ของ script publish ไม่แตะโค้ด client

env ของ host deploy (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) **ยังไม่อยู่ใน `.env.example` ของงานนี้** — P1-F02-T08 เป็นผู้เพิ่ม (ไม่มีค่าเช่นกัน อ่านจาก GitHub Actions secret หรือ `.env.local` ของคนเท่านั้น)

## 4. กฎ repo public (D-002) และการป้องกันสามชั้น

Repo `https://github.com/pongponWorkspace/keep-walking` เป็น **public** ทุกไฟล์ที่ commit เปิดเผยต่อสาธารณะทันที ห้าม commit:

- secret หรือ credential ใดๆ, `.env*` ที่มีค่าจริง (ยกเว้น `.env.example` ที่ไม่มีค่า), `.dev.vars` ที่มีค่าจริง
- raw GPS trace หรือข้อมูลตำแหน่งจริงที่ผูกกับผู้เล่น (PDPA) — trace ที่ commit ได้ต้องเป็น synthetic หรือผ่านการ sanitize เท่านั้น (`data/gps-traces/README.md`)
- ไฟล์ผลเดินทดสอบภาคสนามแบบ raw (`qa/playtest/results/raw/`)
- ไฟล์ข้อมูลดิบขนาดใหญ่: `*.osm.pbf`, tile เต็ม (`*.pmtiles` นอก `tools/tiles/fixtures/`)
- ไฟล์อื่นที่ใหญ่เกินควรสำหรับ repo โค้ด (เพดาน CI: 5 MiB ต่อไฟล์ที่ track ใน git — ดูหัวข้อ 6)

ป้องกันสามชั้น (ADR 0001 3.1):

1. **`.gitignore`** (root, เจ้าของ tech-lead) — กันไม่ให้ไฟล์เหล่านี้ถูก `git add` เข้ามาตั้งแต่แรกในเครื่อง dev
2. **CI ของงานนี้** (`.github/workflows/ci.yml`) — สองชั้นย่อย ตรวจซ้ำทุก push และทุก pull request แม้ `.gitignore` จะถูกข้ามหรือถูกแก้โดยไม่ตั้งใจ:
   - job `secret-scan`: รัน gitleaks ครอบ **ทั้ง git history** (ไม่ใช่แค่ diff) เพื่อจับ secret ที่เคย commit แล้วลบออกทีหลังด้วย
   - job `forbidden-files`: ตรวจรายชื่อไฟล์ที่ `git ls-files` เห็นจริง (ไฟล์ที่ถูก track แล้ว) เทียบกับ pattern ต้องห้าม 5 ข้อ (ดูหัวข้อ 7)
3. **GitHub secret scanning + push protection** (เปิดโดยคนใน P1-F02-T18 ก่อน push ครั้งแรก) — ชั้นสุดท้ายฝั่ง GitHub เอง กันที่ต้นทางระดับ push

`tools/coverage/` (Python) มี `.gitignore` ของตัวเองสำหรับ raw/cache; ไม่ผูกกับ workflow นี้เพิ่มเติมนอกจาก guard ทั่วไป

## 5. รันชุดเดียวกับ CI ในเครื่อง

CI (`build-test` job) เรียก root script ชุดเดียวกับที่รันในเครื่องเป๊ะๆ (ADR 0001 3.7) ไม่มี logic แยกใน workflow นอกจาก dependency caching (หัวข้อ 5.1):

```bash
pnpm install --frozen-lockfile

# Python pytest bridges (P1-X05/P1-X07): ต้องมี venv ก่อน pnpm test จึงจะไม่ skip
python3 -m venv tools/coverage/.venv
tools/coverage/.venv/bin/pip install -r tools/coverage/requirements.txt

pnpm lint
pnpm typecheck
pnpm exec tsx tools/traces/src/generate.ts --check   # trace generator ตรงกับไฟล์ที่ commit
COVERAGE_PYTEST_REQUIRED=1 pnpm test                 # bridge fail แทน skip เมื่อไม่มี venv
pnpm build
```

หรือรันรวดเดียวด้วย `pnpm check` (เท่ากับ lint + typecheck + test + build ต่อกัน — ไม่รวมสองบรรทัดข้างต้นที่ไม่ใช่ pnpm script)

e2e แยก job (Playwright browser ใหญ่ ดาวน์โหลดนาน) รันในเครื่องด้วย:

```bash
pnpm test:e2e:install   # ดาวน์โหลด Chromium + WebKit ครั้งแรกเท่านั้น
pnpm test:e2e
```

`pnpm test:e2e` เพียงคำสั่งเดียวพอ ไม่ต้อง build/preview เอง (P1-X38): `playwright.config.ts` มี
`webServer` ที่รัน `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client
preview` ให้อัตโนมัติแล้วรอจน `http://localhost:4173` ตอบก่อนเริ่มเทสต์ (ทุก spec's header comment
ที่บอกให้ build+preview เองคือ prerequisite เดิมก่อน P1-X38 — ปัจจุบันไม่จำเป็นแล้วแต่ยังรันซ้ำได้
ปลอดภัย เพราะ `reuseExistingServer: !CI` จะใช้ preview server ที่ค้างอยู่แทนถ้ามี). ตั้ง
`E2E_BASE_URL` เป็นค่าอื่น (เช่น ชี้ไป preview deploy จริง) เพื่อข้าม `webServer` นี้ทั้งหมด

ใน CI (job `e2e`) ใช้ `pnpm exec playwright install --with-deps chromium webkit` แทน
`pnpm test:e2e:install` ธรรมดา — แฟล็ก `--with-deps` ติดตั้ง system library ของ Ubuntu ที่ WebKit
ต้องใช้ (apt-get ภายใน) รองรับเฉพาะ Debian/Ubuntu จึงใช้เฉพาะใน CI เท่านั้น ไม่ใส่ใน root script
ที่ dev รันในเครื่อง (macOS/Linux distro อื่นไม่รองรับแฟล็กนี้ และเครื่อง dev มัก
มี library พวกนี้อยู่แล้วจากการติดตั้งเบราว์เซอร์จริง). ถ้า `pnpm test:e2e` fail ใน CI, artifact
`playwright-report` (HTML) จะถูกอัปโหลดให้ดาวน์โหลดจากหน้า run เพื่อ debug

Node version มาจาก `.nvmrc` (24) และ pnpm version จาก `packageManager` ใน root `package.json` (11.24.0) — ใช้ `nvm use` หรือเทียบเท่า ก่อนรัน

### 5.1 pytest bridge, trace generator check และ dependency caching ใน CI (P1-X07)

`vitest.config.ts` include สอง glob ที่เป็น "bridge" เรียก pytest ของ Python จาก root `pnpm test`: `tools/coverage/pipeline/tests/**/*.test.ts` และ `tools/coverage/boundaries/tests/**/*.test.ts` (ทั้งคู่ใช้ fixture สังเคราะห์ในเครื่อง ไม่ใช้เน็ต ไม่ดาวน์โหลด OSM/ประชากรจริง) โดยดีฟอลต์ถ้าไม่มี `tools/coverage/.venv` bridge จะ **skip พร้อม warning** เพื่อไม่บังคับให้ dev ที่ไม่แตะ Python ต้องมี venv — CI ต้อง**ไม่ skip เงียบๆ** จึงสร้าง venv ก่อนเสมอแล้วตั้ง `COVERAGE_PYTEST_REQUIRED=1` ให้ `pnpm test` (bridge จะ fail แทน skip ถ้า venv หาย)

`pnpm test` ยังรัน `tools/tiles/test/tiles.test.ts` (bridge เรียก `tools/tiles/test/run.sh`) ซึ่งดาวน์โหลด CLI `go-pmtiles` ที่ pin ไว้ (~16 MiB, ตรวจ sha256, ไม่มี credential) มาไว้ที่ `tools/tiles/downloads/pmtiles-<version>/` เองถ้ายังไม่มี — เพื่อไม่ให้ทุก CI run โหลดไฟล์เดิมซ้ำ job `build-test` cache สองก้อนด้วย `actions/cache@v4`:

| cache | path | key |
| --- | --- | --- |
| pmtiles binary | `tools/tiles/downloads/pmtiles-<version>/` | `pmtiles-bin-<os>-<version>-<sha256 ของ build linux_x86_64>` (อ่านทั้งคู่จาก `tools/tiles/config.json` ที่รันไทม์ ไม่ hardcode ในไฟล์ workflow) |
| Python venv (`tools/coverage/.venv`) | `tools/coverage/.venv/` | `coverage-venv-<os>-<hash ของ tools/coverage/requirements.txt>` |

ทั้งสอง key ผูกกับ pin/ไฟล์ที่กำหนดเวอร์ชัน — เปลี่ยนเวอร์ชัน pmtiles ใน `config.json` หรือแก้ `requirements.txt` แล้ว cache เก่าใช้ไม่ได้อัตโนมัติ (key ไม่ตรง ต้องสร้างใหม่) ไม่ต้อง invalidate มือ

ลำดับ `pnpm exec tsx tools/traces/src/generate.ts --check` มาก่อน `pnpm test` โดยตั้งใจ: เร็วกว่า (ต่ำกว่า 1 วินาที) และ fail-fast ถ้า fixture ใต้ `data/gps-traces/synthetic/` ไม่ตรงกับ generator (`tools/traces/src/generate.ts`) ก่อนเสียเวลารัน suite เต็ม

## 6. secret scan ในเครื่อง (gitleaks)

gitleaks เป็น open source (MIT) ไม่ต้องมี license key หรือบัญชีภายนอก CI ติดตั้งจาก GitHub Release ที่ pin เวอร์ชันและตรวจ checksum (ดู `.github/workflows/ci.yml` job `secret-scan`) รันในเครื่องแบบเดียวกัน:

```bash
# macOS (Homebrew) — หรือดาวน์โหลด binary ที่ตรงกับ OS จาก
# https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1 แล้วตรวจ checksum จาก
# gitleaks_8.30.1_checksums.txt ในหน้า release เดียวกันก่อนรัน
brew install gitleaks

gitleaks detect \
  --source . \
  --log-opts="--all" \
  --config .gitleaks.toml \
  --redact \
  --verbose \
  --exit-code 1
```

`--log-opts="--all"` และ `--source .` = สแกนทุก commit ในทุก branch ที่มีในเครื่อง (git history ทั้งหมด) ไม่ใช่แค่ working tree `.gitleaks.toml` (root) ต่อยอดจาก default ruleset ของ gitleaks (`useDefault = true`) และ allowlist เฉพาะไฟล์ `*.example` ที่ไม่มีค่าเป็นเนื้อ ไม่ allowlist path หรือ regex อื่นใด

## 7. guard ไฟล์ต้องห้ามในเครื่อง

job `forbidden-files` ใน `.github/workflows/ci.yml` ตรวจ `git ls-files` (เฉพาะไฟล์ที่ถูก track แล้ว) กับ pattern 5 ข้อ แล้ว fail (`exit 1`) ถ้าเจอแม้ข้อเดียว:

1. ไฟล์ใต้ `qa/playtest/results/raw/` (ผลเดินทดสอบแบบ raw ผูกกับ PDPA)
2. `.env` หรือ `.env.<อะไรก็ได้>` ที่ไม่ได้ลงท้ายด้วย `.example`
3. `*.pmtiles` ที่อยู่นอก `tools/tiles/fixtures/`
4. `*.osm.pbf`
5. ไฟล์ใดก็ตามที่ถูก track และมีขนาดเกิน `MAX_TRACKED_FILE_BYTES` (ตั้งไว้ 5 MiB = 5,242,880 ไบต์ ใน workflow `env:`) — ปรับเพดานได้ที่จุดเดียวในไฟล์ workflow

รันเทียบเท่าในเครื่องด้วยสคริปต์สั้นๆ (ไม่มีไฟล์แยกต่างหาก เพราะ logic เดียวกับใน workflow):

```bash
git ls-files | grep -E '^qa/playtest/results/raw/'                     # ต้องว่าง
git ls-files | grep -E '(^|/)\.env(\.[A-Za-z0-9_.-]+)?$' | grep -v -E '\.example$'  # ต้องว่าง
git ls-files | grep -E '\.pmtiles$' | grep -v -E '^tools/tiles/fixtures/'           # ต้องว่าง
git ls-files | grep -E '\.osm\.pbf$'                                    # ต้องว่าง
git ls-files -z | xargs -0 -I{} stat -f '%z {}' {} 2>/dev/null | awk '$1 > 5242880' # ต้องว่าง (macOS stat)
```

หลักฐานว่า guard fail จริงเมื่อมีไฟล์ต้องห้าม: ดู REPORT ของ P1-F02-T07 (ทดลองใน local branch ทิ้ง ไม่ push)

**path ที่มีช่องว่าง (P1-X07):** repo มีไฟล์ที่ track จริงชื่อมีช่องว่าง เช่น `tools/tiles/fixtures/lumpini/glyphs/Noto Sans Regular/0-255.pbf` และ `.../Noto Sans Medium/…` guard ข้อ 1–4 ใช้ `git ls-files` (ไม่ใส่ `-z`) ซึ่งไม่ใส่ quote รอบช่องว่างธรรมดา (quote เฉพาะอักขระพิเศษ/นอก ASCII) หนึ่งบรรทัดต่อหนึ่ง path เสมอ ต่อให้ path มีช่องว่างก็ยังตรงกับ `grep -E` ถูกบรรทัด ส่วนข้อ 5 ใช้ `git ls-files -z` คู่กับ `while IFS= read -r -d ''` (ไม่ใช่ `for f in $(...)`) เพื่อให้ path เป็นค่าเดียวไม่ถูกตัดคำที่ space ก่อนส่งต่อให้ `stat` — ยืนยันแล้วว่า guard ผ่านทั้ง 5 ข้อบน repo จริงที่มี fixture เหล่านี้ (หัวข้อรายงาน P1-X07) `.github/workflows/ci.yml` job `forbidden-files` มี step self-check ก่อน guard จริงที่ยืนยันว่ายังมีอย่างน้อยหนึ่ง path ที่มีช่องว่างถูก track อยู่เสมอ (fail ทันทีถ้า fixture นี้หายไปโดยไม่มีใครมาแทนที่ property ที่ทดสอบ)

## 8. งานต่อยอด

- P1-F02-T08 เพิ่ม `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` ใน `.env.example` (ไม่มีค่า) พร้อม `infra/` และ `.github/workflows/deploy-preview.yml` (สั่งเองด้วย `workflow_dispatch`)
- เพดาน 5 MiB ในหัวข้อ 7 ข้อ 5 เป็นค่าเริ่มต้นที่ระบุใน board T07 acceptance ("เช่น 5 MB") ถ้า tile fixture หรือ asset ที่ตั้งใจ commit ใหญ่กว่านี้ในอนาคต ให้ tech-lead/QA ทบทวนเพดานพร้อม fixture นั้นแทนการเพิ่มเพดานเงียบๆ
