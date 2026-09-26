# Asset delivery — art, ฟอนต์ และเสียงถึง client

Task: P2-F06-T07 · เจ้าของ: tech-lead · สถานะ: ฉบับแรก · วันที่: 2026-09-27
อ้างอิง: `art/direction/asset-pipeline.md` (หัวข้อ 3.2, 4, 5, 7, 8, 9) · `art/direction/avatar-spec.md` 6, 7.4 · `art/direction/style-guide.md` 3, 6.2 · `art/direction/briefs/P2-assets.md` 5.2 · `docs/adr/0003-client-first-game-core.md` 8.1, 11.2 (D-057) · `audio/direction.md`, `audio/cue-list.md` · board P2-F06-T07 (TL N-07, TL B-14)
ผู้ใช้เอกสาร: gameplay-programmer (P2-F04-T21, P2-F05-T10, P2-F06-T08/T09/T14), sound-designer (P2-F05-T06, P2-F06-T13), artist-2d (P2-F05-T04, P2-F05-T07), vfx-animator, devops-engineer (CI, `_headers`), qa-tester

## สารบัญ
1. สรุป
2. ไฟล์และเจ้าของ
3. ลำดับของ root `pnpm build`
4. `tools/art`: คำสั่ง
5. ผลที่ client ใช้: `tools/art/out/client/`
6. สัญญาการโหลดฝั่ง client (path, cache, fallback)
7. ฟอนต์ (D-057)
8. เสียง: สัญญากับ generator ของ `audio/src/`
9. Avatar sheet: build แล้วใครเป็นคน commit
10. Validator V1–V13
11. สมมติฐาน ความเสี่ยง และการส่งต่อ

## 1. สรุป

- code ของ client อ้าง asset **ด้วย id เท่านั้น** (asset-pipeline 1.1) · id → URL มาจากไฟล์เดียวคือ `asset-manifest.json` ที่ `tools/art` สร้างตอน build · client ไม่อ่าน `art/assets/manifest.json` ตรง และไม่ประกอบ path เอง
- root `pnpm build` รัน `tools/art` ก่อน build workspace ทั้งหมด: (1) generator เสียง → (2) validator V1–V13 → (3) stage art + ฟอนต์ + เสียงลง `tools/art/out/client/` (gitignored) · ขั้นใดตก build ตก
- `tools/art` ไม่แก้ `art/assets/manifest.json` ของ artist · ผลของการ build อวตารเขียนลง `art/assets/manifest.build.json` เท่านั้น (TL N-07)
- validator V1–V13 รันใน `pnpm test` (`tools/art/test/repo.test.ts`) ตรวจ `manifest.json`, `manifest.build.json` และ `art/fonts/`
- ไม่มีส่วนใดคำนวณรางวัลหรือค่าที่กระทบรางวัล · asset เป็นข้อมูลแสดงผลอย่างเดียว

## 2. ไฟล์และเจ้าของ

| path | เนื้อหา | ผู้เขียน |
| --- | --- | --- |
| `art/assets/manifest.json` | ทะเบียน asset (id, kind, status, files, license) | artist-2d, vfx-animator · art-director เปลี่ยน status |
| `art/assets/manifest.schema.json` | JSON Schema 6.6 ตรงตัว + `$defs.buildManifest` | tech-lead (แก้ root ต้องแก้ที่ asset-pipeline 6.6 ก่อน · test เทียบให้) |
| `art/assets/manifest.build.json` | ผล build อวตาร: master + sha256 ของ master, ไฟล์ PNG ต่อ variant/scale, bytes, ขนาด, sha256, จำนวนสี | `tools/art build --write` เท่านั้น |
| `art/fonts/` | ฟอนต์ vendor + `OFL.txt` ต่อโฟลเดอร์ + `fonts.json` + `SHA256SUMS` | tech-lead (vendor ใหม่ตาม 7) |
| `tools/art/pipeline.config.json` | ค่าที่ปรับได้ทั้งหมดของ `tools/art`: งบ 7.1/7.2, key color 7.4, ขนาด sheet, จำนวนสีสูงสุด, element ต้องห้าม, id ที่ต้องเป็น miter | tech-lead · ค่าต้องตามเอกสารของ art-director |
| `tools/art/svgo.config.mjs` | SVGO ที่คง viewBox, สี hex ตัวพิมพ์ใหญ่, `currentColor`, `stroke-linejoin="miter"` + `stroke-miterlimit` | tech-lead |
| `design/ux/tokens.json` | รายการสีของ V7 (อ่านทุก hex ใต้ `color`) รวม `ramp.tonic` | uiux-designer |
| `audio/src/generate.ts`, `audio/manifest.json` | generator + ทะเบียน cue | sound-designer |
| `audio/out/` | ไฟล์เสียงที่ render (gitignored) | generator ตอน build |
| `tools/art/out/client/` | ชุดไฟล์ที่ client copy (gitignored) | `tools/art stage` |

`tools/art` ไม่มี `package.json` (ADR 0003 8.1): ใช้ `@resvg/resvg-js` 2.6.2 จาก root · typecheck โดย root `tsconfig.json` · test เก็บโดย glob `tools/*/test` · JSON Schema ตรวจด้วย validator ขนาดเล็กใน `tools/art/src/json-schema.ts` (ajv resolve จาก `tools/art` ไม่ได้) ซึ่ง throw เมื่อเจอ keyword ที่ไม่รองรับ จึงไม่มีทางข้ามกฎเงียบๆ

## 3. ลำดับของ root `pnpm build`

```
pnpm build
  = tsx tools/art/src/cli.ts prebuild
      1. audio     รัน audio/src/generate.ts --out audio/out (ถ้ามี) แล้วตรวจว่าทุก cue มีไฟล์
      2. validate  V1–V12 = error (build ตก) · V13 = warning
      3. stage     copy asset ที่ shipped + ฟอนต์ + เสียง → tools/art/out/client/ + asset-manifest.json
  && pnpm -r --if-present run build      (apps/client, workspace อื่น)
```
- ยังไม่มี `audio/src/generate.ts` (P2-F05-T06 ยังไม่เริ่ม) → ขั้น 1 ผ่านโดยข้าม · ถ้ามี `audio/manifest.json` ที่มี cue แต่ไม่มี generator → ตก
- ขั้นตอนนี้ deterministic และไม่ใช้ network: rasterize ด้วย resvg (ไม่โหลด system font), quantize แบบกำหนดลำดับตายตัว, PNG encode ด้วย zlib level 9 filter 0 · generator เสียงได้ env `KW_OFFLINE=1` และ `KW_AUDIO_OUT`
- path อื่นที่ build client โดยไม่ผ่าน root build (`pnpm --filter @keep-walking/client build`, `webServer` ของ Playwright, `deploy-preview.yml`) **ต้องรัน `pnpm exec tsx tools/art/src/cli.ts prebuild` ก่อน** ไม่งั้น client ได้ชุด asset ว่างและใช้ fallback ทั้งหมด (ส่งต่อ gameplay-programmer และ devops-engineer หัวข้อ 11)

## 4. `tools/art`: คำสั่ง

ทุกคำสั่งรันจาก root: `pnpm exec tsx tools/art/src/cli.ts <คำสั่ง>`
| คำสั่ง | ทำอะไร | เขียนไฟล์ |
| --- | --- | --- |
| `validate` | V1–V13 ครบ พิมพ์ finding ทีละบรรทัด (`ERROR [V7] <file> (<id>): …`) · exit 1 เมื่อมี error | ไม่เขียน |
| `build` | สร้าง sheet อวตารทุก entry `kind: avatar-layer` ที่ shipped และมี master SVG (dry run ในหน่วยความจำ) | ไม่เขียน |
| `build --write [--id <id>]…` | เหมือนข้างบน แล้วเขียน PNG ลง `art/assets/avatar/<layer>/<name>[-<variant>]@<1|2>x.png` (3.2) และอัปเดต `manifest.build.json` (`--id` แทนเฉพาะ entry นั้น) | PNG + `manifest.build.json` |
| `audio` | ขั้น 1 ของ prebuild อย่างเดียว | `audio/out/` (โดย generator) |
| `stage [--out <dir>]` | ขั้น 3 อย่างเดียว | `tools/art/out/client/` |
| `prebuild` | audio → validate → stage (ใช้ใน root build) | ตามข้างบน |

ขั้นตอน build อวตาร (asset-pipeline 4.2) ต่อ entry:
1. master = `source.master` ถ้ามี ไม่งั้นใช้ไฟล์ SVG ใน `files[]` (placeholder)
2. variant = `variants.values` ของ entry ถ้ามี ไม่งั้นตาม axis ของ layer ใน `pipeline.config.json` (`body`, `pose_hand` → `skin-1..6` · `hair` → `hair-1..6` · layer อื่นไม่มี variant)
3. แทน key color (avatar-spec 7.4) ด้วย ramp ของ variant จาก `design/ux/tokens.json` **ในข้อความ SVG** ก่อน rasterize (ขอบ antialias จึงผสมกับสีจริง ไม่ใช่สี key)
4. rasterize ทั้งแผ่นที่ scale 1 และ 2 (resvg, antialias เปิด, พื้นโปร่งใส)
5. quantize เป็น palette ≤ 128 สี ไม่ dither: ถ้าภาพมีสีไม่เกิน 128 ใช้สีตรงตัว · ถ้าเกินใช้ median cut ถ่วงด้วยจำนวน pixel โดยตัวแทนของแต่ละกล่องคือสีที่พบมากที่สุด สีแบนของ token จึงคงค่า hex เดิม มีแต่ pixel ขอบที่ขยับ
6. PNG 8-bit palette + tRNS · sha256 ของไฟล์ · บันทึก bytes, width, height, จำนวนสี

ผลวัดกับ placeholder 12 ชิ้นปัจจุบัน (64 ไฟล์, ~0.6 วินาที): ทุกไฟล์ต่ำกว่างบ 7.1 มาก เช่น `body` skin-1 = 4.1 KB @1x / 8.9 KB @2x (งบ 16 / 40 KB) · อวตารครบชุด 9 layer @2x ≈ 32 KB (งบ 200 KB) · ไม่มี key color เหลือใน PNG

## 5. ผลที่ client ใช้: `tools/art/out/client/`

```
tools/art/out/client/
  asset-manifest.json            ตัวชี้เวอร์ชัน (runtime manifest)
  art/<root>/<group>/<file>      ไฟล์ของ entry ที่ shipped (ไม่รวม master ใน art/src/ และ ref.*)
  fonts/ui/*.woff2, fonts/ui/OFL.txt
  fonts/map/*.ttf,  fonts/map/OFL.txt
  audio/<file>                   ไฟล์จาก audio/out/ ตาม audio/manifest.json
```

`asset-manifest.json` (type `RuntimeManifest` ใน `tools/art/src/stage.ts`)
| field | ความหมาย |
| --- | --- |
| `runtimeVersion` | 1 · client ปฏิเสธค่าอื่น |
| `avatarRig` | ตรงกับ `manifest.json` · renderer ปฏิเสธ rig ที่ไม่ตรง (asset-pipeline 6.1) |
| `assets[id]` | `kind`, `status`, `placeholder`, `size`, `layer?`, `sheet?`, `variants?`, `replacedBy?`, `files[]` |
| `assets[id].files[]` | `url` (สัมพัทธ์กับฐานของชุด เช่น `art/avatar/hair/buzz-hair-3@2x.png?v=1a2b3c4d`), `format`, `scale`, `variant`, `width`, `height`, `bytes` · รวมไฟล์ของ artist และไฟล์ PNG จาก `manifest.build.json` |
| `fonts[]` | `id`, `role` (`ui`/`map`), `family`, `weight`, `url`, `format`, `bytes` |
| `audio[cueId]` | `url` + field อื่นของ cue จาก `audio/manifest.json` ตามที่ sound-designer เขียน (เช่น `vibration_ms`, `priority`, `loudness`) ส่งต่อตรงตัว |
| `credits[]` | `attribution`, `spdx`, `holder` ไม่ซ้ำ เรียงตามตัวอักษร · หน้า "เครดิตและสัญญาอนุญาต" อ่านจากตรงนี้ (asset-pipeline 9.4) |

- ไม่มี `source`, `license` เต็ม, `review`, `notes`, `tags` (asset-pipeline 5) · งบ ≤ 30 KB ตรวจใน test และ V13
- entry `prompt-only` และ `shipped: false` ไม่อยู่ในชุด · entry `placeholder` อยู่ พร้อม `placeholder: true`

## 6. สัญญาการโหลดฝั่ง client (path, cache, fallback)

ส่วนนี้เป็นสัญญาที่ gameplay-programmer implement ใน `apps/client/` (task นี้ไม่แก้ `apps/client`)

### 6.1 path
- Vite ของ client copy `tools/art/out/client/` ทั้งโฟลเดอร์ไปที่ `dist/kw/` ตอน build (plugin copy หรือ `publicDir` เพิ่มเติม) และตอน dev เสิร์ฟโฟลเดอร์เดียวกันที่ `/kw/` · ฐาน = `import.meta.env.BASE_URL + 'kw/'` · ห้าม import ไฟล์จาก `tools/` เป็น module (ESLint `TOOLS_IMPORT_BAN`) อ่านเป็นไฟล์ static เท่านั้น
- client โหลด `kw/asset-manifest.json` ครั้งเดียวต่อ session ก่อนแสดง icon/ฟอนต์/เสียงแรก · URL จริง = ฐาน + `files[].url` ตรงตัว (มี `?v=` แล้ว) · ห้ามประกอบ path จาก id เอง
- sprite sheet: `devicePixelRatio >= 1.5` → `scale: 2` ไม่งั้น `scale: 1` · ตัดสินครั้งเดียวต่อ session (asset-pipeline 5) · เลือกไฟล์ด้วย (`variant`, `scale`) · ตำแหน่ง frame จาก `sheet` (คอลัมน์ × `frameW`, แถว × `frameH`) ไม่ hardcode
- SVG icon ใช้เป็น `<img>` หรือ inline หลัง fetch · glyph ที่ใช้ `currentColor` ต้อง inline (img ไม่รับสีจาก CSS)
- ถ้า entry มีทั้ง SVG (placeholder master ที่อยู่ใน `art/assets`) และ PNG ของ build ให้ใช้ PNG สำหรับ sheet อวตาร · entry ที่ยังไม่มี PNG (สถานะ placeholder ตอนนี้) ใช้ SVG แผ่นเดียวแทนได้ใน dev/preview เพราะ viewBox = ขนาด sheet ที่ 1x

### 6.2 cache
| ไฟล์ | header (devops-engineer ตั้งใน `_headers` ของ Pages) | เหตุผล |
| --- | --- | --- |
| `/kw/asset-manifest.json` | `Cache-Control: no-cache` + ETag | เป็นตัวชี้เวอร์ชัน (asset-pipeline 5) |
| `/kw/art/*`, `/kw/fonts/*`, `/kw/audio/*` | `Cache-Control: public, max-age=31536000, immutable` | URL มี `?v=<sha256 8 ตัว>` เปลี่ยนเมื่อไฟล์เปลี่ยน |
| `/kw/fonts/*.woff2` | `Content-Type: font/woff2` · `*.ttf` → `font/ttf` | |
- ไม่ใช้ CDN ภายนอกหรือ Google Fonts (PDPA: ไม่ส่ง IP ผู้เล่นให้บุคคลที่สาม, asset-pipeline 4.5)
- service worker (ถ้ามีภายหลัง) cache ตาม URL เต็มรวม `?v=`

### 6.3 สถานะและ environment
| `status` | dev / preview | production |
| --- | --- | --- |
| `approved` | แสดง | แสดง |
| `draft`, `placeholder` | แสดง | ใช้ fallback |
| `deprecated` | ใช้ `replacedBy` อัตโนมัติ | ใช้ `replacedBy` อัตโนมัติ |
| ไม่มีใน manifest / `prompt-only` | fallback | fallback |
environment อ่านจาก `env.ts` ที่มีอยู่ของ client (segment/environment ของ P2-F04-T10) ไม่เพิ่ม env ใหม่

### 6.4 fallback (ห้ามแสดงรูปแตกหรือ alt text อังกฤษ, asset-pipeline 10)
| กรณี | ทำอะไร |
| --- | --- |
| `asset-manifest.json` โหลดไม่ได้ / `runtimeVersion` ไม่ตรง | เล่นต่อได้: icon ทุกตัวใช้กรอบว่างขนาดเดียวกัน + ข้อความจาก copy key · ฟอนต์ใช้ stack สำรองจาก `design/ux/tokens.json` · ไม่มีเสียง (เหลือ vibration + toast) · ส่ง telemetry ที่ product-manager กำหนดใน `product/telemetry-events.md` (ถ้ายังไม่มี event ให้ขอ PM ไม่ตั้งชื่อเอง) |
| icon id ไม่มี / ใช้ไม่ได้ | `icon.ui.help` ขนาดเดียวกัน + ข้อความจาก copy key · ถ้า `icon.ui.help` เองก็ไม่มี ใช้กรอบว่าง |
| layer อวตารใช้ไม่ได้ | ข้าม layer นั้น (avatar-spec 8.1) |
| ไฟล์โหลดไม่ขึ้น (network) | ลองใหม่ 1 ครั้งเมื่อกลับมา online แล้วใช้ fallback · ไม่ block การเล่น เพราะ asset ไม่กระทบ state ของ run |
| offline หลังโหลดแล้ว | ใช้ของใน HTTP cache ต่อ (immutable) |
- log ของ fallback ห้ามมีตำแหน่งหรือข้อมูลผู้เล่น (id ของ asset และชนิดความผิดพลาดเท่านั้น)

## 7. ฟอนต์ (D-057)

| id | ไฟล์ใน `art/fonts/` | bytes | งบ | sha256 (8 ตัวแรก) | ที่มา |
| --- | --- | --- | --- | --- | --- |
| `font.ui.plex-sans-thai-looped-500` | `ui/IBMPlexSansThaiLooped-Medium.woff2` | 44,120 | ≤ 61,440 | `5f3de9f3` | npm `@ibm/plex-sans-thai-looped@1.1.0` |
| `font.ui.plex-sans-thai-looped-700` | `ui/IBMPlexSansThaiLooped-Bold.woff2` | 43,144 | ≤ 61,440 | `57d56a28` | เหมือนกัน |
| `font.map.noto-sans-thai-400` | `map/NotoSansThai-Regular.ttf` | 20,960 | ≤ 61,440 | `d4303fe9` | `notofonts/thai` `NotoSansThai-v2.002` unhinted |
| `font.map.noto-sans-thai-500` | `map/NotoSansThai-Medium.ttf` | 20,868 | ≤ 61,440 | `043a0473` | เหมือนกัน |

- **ผลของ D-057:** WOFF2 ทางการของ IBM Plex Sans Thai Looped อยู่ในงบทั้งสองน้ำหนัก (UI 2 น้ำหนักรวม 87,264 B ≤ 120 KB) จึงใช้ Plex ตามแผนหลัก **ไม่แก้ ไม่ subset ไม่เปลี่ยนชื่อไฟล์** · ไม่ต้องเปลี่ยนไป Noto Sans Thai Looped
- Plex ดึงจาก tarball ของ npm (integrity sha512 ตรงกับ registry, sha256 ของ tarball `76f87add…799e`, gitHead `1da12f02…`) โดยแตกไฟล์เอง **ไม่ติดตั้ง package** เพราะ package มี `postinstall` ที่รัน IBM telemetry · `OFL.txt` = `fonts/complete/woff2/license.txt` ของ release เดียวกัน (Reserved Font Name "Plex" → `modified: false` บังคับ)
- Noto Sans Thai ใช้ zip ที่ pin ไว้แล้วใน `tools/tiles/config.json` (sha256 zip และ TTF ตรงกัน) · TTF unhinted ไม่ต้อง subset เพราะต่ำกว่างบ (`modified: false`) · `OFL.txt` ไม่มี Reserved Font Name (ยืนยัน A-P1-F03-T11-9)
- รายการ sha256 อยู่สองที่ที่ต้องตรงกัน: `art/fonts/fonts.json` และ `art/fonts/SHA256SUMS` (ตรวจด้วย `cd art/fonts && shasum -a 256 -c SHA256SUMS` ได้) · validator ตรวจ bytes, sha256, งบ, OFL อยู่โฟลเดอร์เดียวกับฟอนต์, sha256 ของ OFL และไฟล์ที่ไม่อยู่ใน `fonts.json`
- ใน client:
  - UI: `@font-face { font-family: 'IBM Plex Sans Thai Looped'; font-weight: 500 | 700; font-display: swap; src: url(<ฐาน + fonts[].url>) format('woff2'); }` · family, weight และ url มาจาก `fonts[]` ของ `asset-manifest.json` · fallback stack ตาม `design/ux/tokens.json`
  - แผนที่: `font-faces` ของ style ชี้ไฟล์ TTF ของ `role: map` ที่ tools/tiles publish ไว้แล้ว (`glyphs/_faces/`, tech note F02 6.2) · ชุดใน `art/fonts/map` คือไฟล์เดียวกัน (sha256 เดียวกัน) ใช้เป็นหลักฐาน license และสำหรับ build ที่ไม่มี tile publish · ถ้าจะให้ client ใช้ชุดจาก `/kw/fonts/map/` แทน ต้องแก้ `style.ts` (gameplay) และตัดสินใน tech note F02 ก่อน
- หน้าเครดิตแสดง `credits[]` (รวมบรรทัดของ Plex และ Noto)
- ต่ออายุฟอนต์: ดาวน์โหลด release ใหม่ → แทนไฟล์ → อัปเดต `fonts.json` (bytes, sha256, sources) → `shasum -a 256 ui/* map/* > SHA256SUMS` → `pnpm test`

## 8. เสียง: สัญญากับ generator ของ `audio/src/`

สิ่งที่ sound-designer ต้องทำใน P2-F05-T06 เพื่อให้ hook ของ root build ใช้ได้โดยไม่ต้องแก้ `tools/art`:
| ข้อ | สัญญา |
| --- | --- |
| entry | `audio/src/generate.ts` · รันด้วย `tsx audio/src/generate.ts --out <dir>` จาก root (`cwd` = root) · exit 0 เมื่อสำเร็จ |
| output | เขียนไฟล์ลง `<dir>` เท่านั้น (ค่าเริ่มต้น `audio/out/`, gitignored) · อ่านค่า `--out` หรือ env `KW_AUDIO_OUT` ห้ามเขียน path ตายตัว |
| deterministic | อินพุตเดียวกันได้ไบต์เดียวกันทุกครั้ง: ห้าม `Math.random` ที่ไม่มี seed, ห้ามเวลาในไฟล์ (เช่น metadata วันที่) |
| offline | ห้ามใช้ network (hook ตั้ง `KW_OFFLINE=1`) · dependency ใหม่ต้อง handoff ถึง tech-lead (lockfile) |
| manifest | `audio/manifest.json` (commit) รูปแบบ `{ "manifestVersion": 1, "cues": [ { "id": "run.tickGranted", "file": "run.tickGranted.wav", ...field อื่นของ cue } ] }` หรือ `cues` เป็น object ที่ key = cue id ก็ได้ · `id` เป็นรูปแบบ copy key มีจุด (เช่น `run.hpLow`) ไม่ซ้ำ · `file` เป็น path สัมพัทธ์ใน `audio/out/` ไม่มี `..` |
| field อื่น | เช่น `vibration_ms`, `priority`, `loudness_lufs`, `durationMs` ส่งต่อถึง client ตรงตัวใน `asset-manifest.json` `audio[cueId]` · ค่าที่ผูกกับ config เกม (priority, threshold) ต้องไม่ใช่ค่าที่กระทบรางวัล |

การตรวจ:
- `tools/art/test/audio.test.ts` (ใน `pnpm test`): ถ้าไม่มี generator → manifest ต้องว่างหรือไม่มี · ถ้ามี → รัน generator ลงโฟลเดอร์ชั่วคราวแล้วยืนยันว่า **ทุก cue id มีไฟล์** (manifest ว่าง = ผ่าน)
- root build: ขั้น audio รัน generator ลง `audio/out/` แล้วตรวจแบบเดียวกัน · ขาดไฟล์ = build ตก
- ฝั่ง client เล่นเสียงตาม cue id จาก `audio[cueId].url` · cue ที่ไม่มีใน manifest = ไม่มีเสียง แต่ยังมี vibration + toast ตามหลัก silent fallback ของ `audio/direction.md` หัวข้อ 10 · ไม่มี BGM (D-052)

## 9. Avatar sheet: build แล้วใครเป็นคน commit

- asset-pipeline 2 กำหนดให้ PNG ที่ build แล้ว **commit ลง `art/assets/avatar/`** เพื่อให้ content gate เห็นภาพจริง · path นั้นอยู่ใน writes ของ artist-2d ไม่ใช่ของ task นี้ จึง commit `manifest.build.json` ว่าง (`assets: []`) ไว้ก่อน · เมื่อ artist-2d รัน `build --write` ใน P2-F05-T04 (หรืองานถัดไปที่แก้ master) PNG 64 ไฟล์ + `manifest.build.json` จะเกิดพร้อมกันและต้อง commit ด้วยกัน
- เมื่อ master เปลี่ยนแต่ไม่ build ใหม่ → V12 ตก ("master changed since the last build") · เมื่อ PNG ถูกแก้มือ → V3 ตก · entry ที่ขึ้นเป็น `draft` แล้วยังไม่มี PNG ครบทุก variant × scale → V6 ตก
- ดูภาพโดยไม่ commit (content gate, review): `pnpm exec tsx tools/art/src/cli.ts stage --out /tmp/kw` ไม่รวม PNG ที่ยังไม่ build · หรือเขียน test เล็กที่เรียก `buildAll(..., { write: true, outDir })` ไปโฟลเดอร์ชั่วคราว (ไม่แตะ `manifest.build.json`)

## 10. Validator V1–V13

อยู่ใน `tools/art/src/validate.ts` · รันใน `pnpm test` ผ่าน `tools/art/test/repo.test.ts` และใน root build ผ่าน `prebuild` · fixture ต่อกฎอยู่ใน `tools/art/test/rules.test.ts` และ `build.test.ts`
| # | ตรวจ (ตาม asset-pipeline 8) | ระดับ |
| --- | --- | --- |
| V1 | `manifest.json` ผ่าน schema root · `manifest.build.json` ผ่าน `$defs/buildManifest` · id ไม่ซ้ำและเรียงในทั้งสองไฟล์ · id ใน build ต้องมีใน `manifest.json` | error |
| V2 | path ตาม 3.2 (`<root>/<group>/<name>.<ext>`, sheet `<name>[-<variant>]@<scale>x.png`) · `map.*` อยู่ใต้ `art/direction/map-style/` · `ref.*` ใต้ `art/ref/` · `art/src/` เฉพาะ placeholder | error |
| V3 | ไฟล์มีจริง · bytes, width, height (SVG = width/height ของ root, PNG = IHDR) ตรง · sha256 ตรงเมื่อมีค่า และบังคับตั้งแต่ `draft` · ฟอนต์: bytes + sha256 ตรง `fonts.json` และ `SHA256SUMS` | error |
| V4 | งบต่อไฟล์ 7.1 ตาม kind (`icon.ui16.*` ใช้งบ 1.5 KB) · งบ PNG ต่อ layer · ผลรวมอวตาร 7.2 จาก variant ที่ใหญ่สุดต่อ layer · ฟอนต์ ≤ 60 KB ต่อน้ำหนัก | error |
| V5 | PNG sheet = `sheet` × คอลัมน์/แถว × scale และตรงตาราง avatar-spec 6 · มี alpha | error |
| V6 | entry sheet ที่สถานะ ≥ `draft` มีทุก variant ครบทั้ง scale 1 และ 2 (รวมไฟล์จาก build) | error |
| V7 | SVG ที่ shipped: viewBox = `size` (sheet = ขนาดทั้งแผ่น) และ width/height = viewBox · ไม่มี `image`, `text`, `script`, `foreignObject`, gradient, `filter` · ไม่มี `@import` · `href` ต้องเป็น `#local` · สีใน attribute/`style`/`<style>` ต้องเป็น hex 6 หลักตัวใหญ่จาก `design/ux/tokens.json` (รวม `ramp.tonic` #FF8877 #DD4433 #AA2222) หรือ `none`/`transparent`/`url(#…)` · `currentColor` เฉพาะ `icon-ui` · opacity เฉพาะเงา `#1A1A22` ที่ 0.2 · id ภายในขึ้นต้นด้วยชื่อไฟล์ · id ใน `svg.miterRequiredIds` (`map.icon.rift-crack`, `icon.ui.rift`, `icon.ui.in-run`, `icon.ui.enter`) ต้องมี `stroke-linejoin="miter"` + `stroke-miterlimit="4"` | error |
| V8 | key color 6 ค่าไม่อยู่ใน SVG ใดใน `art/assets/` และ `art/src/` นอก 3 โฟลเดอร์ master · ไม่มีใน pixel ของ PNG ใดๆ | error |
| V9 | `placeholder` ตรง `status` · `approved` มี review PASS · `deprecated` มี `replacedBy` | error |
| V10 | `license.spdx` อยู่ในรายการ 9.1 · ฟอนต์มี license file จริง · Reserved Font Name → `modified: false` · `OFL.txt` ตรง sha256 ของ release และอยู่โฟลเดอร์เดียวกับฟอนต์ | error |
| V11 | ทุกไฟล์ใน `art/assets/` ถูกอ้างจาก `manifest.json` หรือ `manifest.build.json` (ยกเว้น `manifest*.json`, `OFL.txt`) · ทุกไฟล์ใน `art/fonts/` อยู่ใน `fonts.json` | error |
| V12 | ทุก entry ใน `manifest.build.json`: master ตรงกับ `manifest.json` และ sha256 ของ master ไม่เปลี่ยน · build ใหม่ในหน่วยความจำได้ sha256 เท่าเดิม · ถ้าเครื่องที่ตรวจต่าง platform จาก `platform` ที่บันทึก และต่างกันไม่เกิน `raster.crossPlatform*` → warning | error (Phase 2) |
| V13 | ขนาดหน้าแรกโดยประมาณ (ฟอนต์ UI + UI glyph ทั้งหมด + อวตาร @2x + runtime manifest) ≤ 400 KB · glyph ≤ 30 KB · runtime manifest ≤ 30 KB · `manifest.json` ≤ 60 KB | warning |

สถานะวันนี้: 14 entry, 15 ไฟล์, 0 ไฟล์ build, 4 ฟอนต์ · 0 error 0 warning · หน้าแรกโดยประมาณ 92,847 B

## 11. สมมติฐาน ความเสี่ยง และการส่งต่อ

สมมติฐาน
- [ASSUMPTION A-P2-F06-T07-1] ฐาน URL ของชุด asset ใน client คือ `<BASE_URL>kw/` · gameplay-programmer เปลี่ยนชื่อโฟลเดอร์ได้ถ้าแจ้ง devops-engineer พร้อมกัน (header ใน 6.2 ผูกกับ path) (ยืนยัน: gameplay-programmer, devops-engineer)
- [ASSUMPTION A-P2-F06-T07-2] รูปแบบ `audio/manifest.json` ตามหัวข้อ 8 · ถ้า sound-designer ต้องการรูปแบบอื่น ส่ง handoff ถึง tech-lead ก่อนแก้ ไม่งั้น hook ตก (ยืนยัน: sound-designer)
- [ASSUMPTION A-P2-F06-T07-3] ตัวเลขทุกตัวใน `tools/art/pipeline.config.json` คัดจาก asset-pipeline 7 และ avatar-spec 6/7.4 · art-director ปรับงบ ±30% ตาม A-P1-F03-T11-8 ได้โดยแก้เอกสารแล้วแจ้ง tech-lead แก้ config (ยืนยัน: art-director)
- [ASSUMPTION A-P2-F06-T07-4] SVGO ยังไม่เป็น dependency (task นี้แก้ lockfile ไม่ได้) · config อยู่ที่ `tools/art/svgo.config.mjs` และรันผ่าน `pnpm dlx` เมื่อจำเป็น · V7 ป้องกันผลที่ SVGO อาจทำพัง (miter, สี) อยู่แล้ว (ยืนยัน: tech-lead ในงาน dependency ถัดไป)

ความเสี่ยง
| ความเสี่ยง | ผล | ทางแก้ |
| --- | --- | --- |
| resvg ให้ pixel ต่างกันเล็กน้อยระหว่าง macOS arm64 กับ Linux x64 ของ CI | V12 ตกใน CI หลัง artist commit PNG จาก Mac | `platform` ถูกบันทึกใน `manifest.build.json` · ต่าง platform แต่อยู่ในเกณฑ์ `raster.crossPlatform*` เป็น warning · ถ้าเกินเกณฑ์ให้ build ใน CI แล้ว commit ผล (devops-engineer) |
| path build อื่นข้าม root build (หัวข้อ 3) | client ได้ชุด asset ว่าง ใช้ fallback ทั้งหมด | ส่งต่อด้านล่าง |
| `art/assets/manifest.json` โตเกิน 60 KB เมื่อมี 72 SVG ของ P2 | V13 เตือน | แยก manifest ตาม `root` (asset-pipeline 7.2) เป็นงาน schema v2 |

ส่งต่อ
| ถึง | เรื่อง |
| --- | --- |
| gameplay-programmer (P2-F05-T10, P2-F06-T09) | implement หัวข้อ 6: copy `tools/art/out/client/` → `dist/kw/`, loader ของ `asset-manifest.json`, `@font-face` จาก `fonts[]`, เสียงตาม `audio[cueId]`, fallback 6.4, หน้าเครดิตจาก `credits[]` · ให้ script `build`/`dev` ของ `apps/client/package.json` รัน `tsx ../../tools/art/src/cli.ts prebuild` ก่อน (Playwright `webServer` และ deploy ใช้ script นั้น) |
| devops-engineer (P2-F04-T08 / P2-F06-T16) | header 6.2 ใน `_headers` · `deploy-preview.yml` ต้องได้ `tools/art/out/client` ก่อน build client · ถ้า V12 ต่าง platform ให้เพิ่มขั้น build อวตารใน CI |
| sound-designer (P2-F05-T06, P2-F06-T13) | สัญญาหัวข้อ 8 |
| artist-2d (P2-F05-T04, P2-F05-T07) | รัน `build --write` แล้ว commit PNG + `manifest.build.json` · ลงทะเบียน `map.icon.rift-crack` ตาม brief 3.10 (validator ตรวจ miter ให้แล้ว) |
| qa-tester | test hook: `pnpm exec tsx tools/art/src/cli.ts validate`, `tools/art/test/*.test.ts`, `asset-manifest.json` สำหรับตรวจ fallback |
