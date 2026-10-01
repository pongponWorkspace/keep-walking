# Asset delivery — art, ฟอนต์ และเสียงถึง client

Task: P2-F06-T07 · เจ้าของ: tech-lead · สถานะ: ฉบับแรก · วันที่: 2026-09-27
อ้างอิง: `art/direction/asset-pipeline.md` (หัวข้อ 3.2, 4, 5, 7, 8, 9) · `art/direction/avatar-spec.md` 6, 7.4 · `art/direction/style-guide.md` 3, 6.2 · `art/direction/briefs/P2-assets.md` 5.2 · `docs/adr/0003-client-first-game-core.md` 8.1, 11.2 (D-057) · `audio/direction.md`, `audio/cue-list.md` · board P2-F06-T07 (TL N-07, TL B-14)
ผู้ใช้เอกสาร: gameplay-programmer (P2-F04-T21, P2-F05-T10, P2-F06-T08/T09/T14), sound-designer (P2-F05-T06, P2-F06-T13), artist-2d (P2-F05-T04, P2-F05-T07), vfx-animator, devops-engineer (CI, `_headers`), qa-tester

## สารบัญ
1. สรุป
2. ไฟล์และเจ้าของ
3. ลำดับ prebuild: ที่เดียวคือ script ของ `apps/client`
4. `tools/art`: คำสั่ง
5. ผลที่ client ใช้: `tools/art/out/client/`
6. สัญญาการโหลดฝั่ง client (path, cache, fallback)
7. ฟอนต์ (D-057)
8. เสียง: สัญญากับ generator ของ `audio/src/`
9. Avatar sheet: build แล้วใครเป็นคน commit
10. Validator V1–V13 (10.1 ทะเบียนแยกตาม key)
11. สมมติฐาน ความเสี่ยง และการส่งต่อ

## 1. สรุป

- code ของ client อ้าง asset **ด้วย id เท่านั้น** (asset-pipeline 1.1) · id → URL มาจากไฟล์เดียวคือ `asset-manifest.json` ที่ `tools/art` สร้างตอน build · client ไม่อ่าน `art/assets/manifest.json` ตรง และไม่ประกอบ path เอง
- script `dev`, `dev:https` และ `build` ของ `apps/client` รัน `tools/art prebuild` ก่อน vite ทุกครั้ง (ที่เดียว · หัวข้อ 3 · P2-X22): (1) generator เสียง → (2) validator V1–V13 → (3) stage art + ฟอนต์ + เสียงลง `tools/art/out/client/` (gitignored) · ขั้นใดตก build ตก
- ทะเบียนของ artist แยกตาม key: `art/assets/manifest.json` (index) + `art/assets/manifest.<key>.json` (key = root หรือ root.group, หัวข้อ 10.1 · P2-X22, P2-H67) · `tools/art` ไม่แก้ไฟล์ทะเบียนของ artist (ยกเว้นคำสั่ง `split-manifest --write` ที่ artist สั่งเอง) · ผลของการ build อวตารเขียนลง `art/assets/manifest.build.json` เท่านั้น (TL N-07)
- validator V1–V13 รันใน `pnpm test` (`tools/art/test/repo.test.ts`) ตรวจ `manifest.json`, `manifest.build.json` และ `art/fonts/`
- ไม่มีส่วนใดคำนวณรางวัลหรือค่าที่กระทบรางวัล · asset เป็นข้อมูลแสดงผลอย่างเดียว

## 2. ไฟล์และเจ้าของ

| path | เนื้อหา | ผู้เขียน |
| --- | --- | --- |
| `art/assets/manifest.json` | index: header (`manifestVersion`, `avatarRig`, `updated`, `baseDir`) + entry ที่ยังไม่ย้าย (หลังย้ายครบ `assets: []`) | artist-2d, vfx-animator · art-director เปลี่ยน status |
| `art/assets/manifest.<key>.json` | ทะเบียน asset ของ key นั้น (id, kind, status, files, license) · schema เดียวกับ index · key ตาม `manifestRoots` ใน `pipeline.config.json` (root ของ asset-pipeline 3.1 หรือ root.group, หัวข้อ 10.1) | artist-2d (icon, badge, frame, avatar, illus, map, ref, ui) · vfx-animator (vfx) · art-director เปลี่ยน status |
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

## 3. ลำดับ prebuild: ที่เดียวคือ script ของ `apps/client` (P2-X22)

```
pnpm --filter @keep-walking/client build     (หรือ dev / dev:https)
  = tsx ../../tools/art/src/cli.ts prebuild
      1. audio     รัน audio/src/generate.ts --out audio/out แล้วตรวจว่าทุก cue มีไฟล์
      2. validate  V1–V12 = error (build ตก) · V13 = warning
      3. stage     copy asset ที่ shipped + ฟอนต์ + เสียง → tools/art/out/client/ + asset-manifest.json
  && vite build                               (dev: vite · dev:https: cert แล้ว vite --mode https)
```
- เหตุที่เลือก script ของ `apps/client` เป็นที่เดียว: `apps/client` เป็น workspace เดียวที่ใช้ `tools/art/out/client/` และทุกทางที่ build client ผ่าน script นี้: root `pnpm build` (ผ่าน `pnpm -r run build`), `webServer` ของ Playwright, `infra/scripts/publish-client.sh` (`pnpm --filter @keep-walking/client build`) และ dev server ของนักพัฒนา · ใส่ที่ root หรือใน script ของ devops จะมีทางที่ข้ามได้เสมอ
- `cli.ts` หา repo root จากตำแหน่งไฟล์ของตัวเอง (`config.ts` `REPO_ROOT`) จึงรันจาก cwd `apps/client` ได้ผลเท่ากับรันจาก root · `tsx` (root devDependency 4.23.13) resolve ได้เพราะ pnpm ใส่ `<root>/node_modules/.bin` ใน PATH ของ script ทุก workspace (ตรวจแล้ว 2026-09-27) ไม่ต้องเพิ่ม dependency ใน `apps/client` และไม่แตะ lockfile
- ค่าใช้จ่าย: prebuild ทั้งสามขั้นใช้ไม่ถึง 1 วินาทีบน M-series (วัด 2026-09-27: 88 asset, 20 cue) · dev server รันครั้งเดียวตอนเริ่ม ไม่ watch · แก้ asset ระหว่าง dev ให้ restart `pnpm dev` หรือรัน `prebuild` เอง
- ช่วงเปลี่ยนผ่านปิดแล้ว (P2-X24, 2026-09-27): root `package.json` `build` = `pnpm -r --if-present run build` และ `infra/scripts/publish-client.sh` ไม่มีบรรทัด prebuild ของตัวเอง · ตรวจแล้ว: root `pnpm build` พิมพ์ `art-validate:` และ `stage:` อย่างละ 1 ครั้ง (จาก script ของ `apps/client`) · ห้ามเพิ่ม prebuild ที่อื่นอีก
- ขั้นตอนนี้ deterministic และไม่ใช้ network: rasterize ด้วย resvg (ไม่โหลด system font), quantize แบบกำหนดลำดับตายตัว, PNG encode ด้วย zlib level 9 filter 0 · generator เสียงได้ env `KW_OFFLINE=1` และ `KW_AUDIO_OUT`
- ถ้ามี `audio/manifest.json` ที่มี cue แต่ไม่มี generator → ตก
- งานที่ใช้ `tools/art` โดยไม่ build client (`pnpm test`, config lint) เรียก validator เองผ่าน `tools/art/test/repo.test.ts` ไม่ต้องรอ prebuild

## 4. `tools/art`: คำสั่ง

ทุกคำสั่งรันจาก root: `pnpm exec tsx tools/art/src/cli.ts <คำสั่ง>`
| คำสั่ง | ทำอะไร | เขียนไฟล์ |
| --- | --- | --- |
| `validate` | V1–V13 ครบ พิมพ์ finding ทีละบรรทัด (`ERROR [V7] <file> (<id>): …`) · exit 1 เมื่อมี error | ไม่เขียน |
| `build` | สร้าง sheet อวตารทุก entry `kind: avatar-layer` ที่ shipped และมี master SVG (dry run ในหน่วยความจำ) | ไม่เขียน |
| `build --write [--id <id>]…` | เหมือนข้างบน แล้วเขียน PNG ลง `art/assets/avatar/<layer>/<name>[-<variant>]@<1|2>x.png` (3.2) และอัปเดต `manifest.build.json` (`--id` แทนเฉพาะ entry นั้น) | PNG + `manifest.build.json` |
| `audio` | ขั้น 1 ของ prebuild อย่างเดียว | `audio/out/` (โดย generator) |
| `stage [--out <dir>]` | ขั้น 3 อย่างเดียว | `tools/art/out/client/` |
| `prebuild` | audio → validate → stage (ใช้ใน script `dev`/`build` ของ `apps/client` · หัวข้อ 3) | ตามข้างบน |
| `split-manifest` | แสดงไฟล์ปลายทางและขนาดเมื่อย้ายทุก entry ไป `manifest.<key>.json` (หัวข้อ 10.1) | ไม่เขียน |
| `split-manifest --write` | ย้ายจริง: เขียน part ต่อ key ที่มี entry และเหลือ index เป็น header + `assets: []` · ผล merge เท่าเดิมทุก entry | index + `manifest.<key>.json` |

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
  asset-manifest.json            ตัวชี้เวอร์ชัน (runtime manifest หลัก)
  art/avatar/runtime-manifest.json  part ของ avatar-layer ที่โหลดแบบ lazy (5.1)
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
| `parts[name]` | `url` (มี `?v=<sha256 8 ตัว>` ของเนื้อไฟล์ part), `bytes` · ตอนนี้มี `avatar` ตัวเดียว (5.1) · field ใหม่ของ P2-X24 เพิ่มแบบไม่ทำลายของเดิม (`runtimeVersion` ยังเป็น 1) |
| `assets[id]` | `kind`, `status`, `placeholder`, `size`, `layer?`, `sheet?`, `variants?`, `replacedBy?`, `tintable?`, `files[]` |
| `assets[id].tintable` | P2-H13 (D-121) · มีเฉพาะเมื่อเป็น `true` (ไม่มี key = ไม่ tint ได้) · `stage` คำนวณเอง: entry ที่ kind อยู่ใน config `svg.currentColorKinds` (วันนี้ `icon-ui` = `icon.ui.*` และ `icon.ui16.*`) และไฟล์ SVG ที่ ship อย่างน้อยหนึ่งไฟล์ใช้ `currentColor` ใน attribute สี (`svg.colorAttributes`, รวม `style`) หรือใน `<style>` · ไม่มีใครตั้งมือ · kind อื่นไม่สแกน (V7 ห้าม `currentColor` อยู่แล้ว) · field เพิ่มแบบไม่ทำลายของเดิม (`runtimeVersion` ยังเป็น 1) · ต้นทุน 16 B ต่อ entry ที่เป็น `true` (วันนี้ 28 entry = +448 B) |
| `assets[id].files[]` | `url` (สัมพัทธ์กับฐานของชุด เช่น `art/avatar/hair/buzz-hair-3@2x.png?v=1a2b3c4d`), `format`, `scale`, `variant`, `width`, `height`, `bytes` · รวมไฟล์ของ artist และไฟล์ PNG จาก `manifest.build.json` |
| `fonts[]` | `id`, `role` (`ui`/`map`), `family`, `weight`, `url`, `format`, `bytes` |
| `audio[cueId]` | `url` + field อื่นของ cue จาก `audio/manifest.json` ตามที่ sound-designer เขียน (เช่น `vibration_ms`, `priority`, `loudness`) ส่งต่อตรงตัว |
| `credits[]` | `attribution`, `spdx`, `holder` ไม่ซ้ำ เรียงตามตัวอักษร · หน้า "เครดิตและสัญญาอนุญาต" อ่านจากตรงนี้ (asset-pipeline 9.4) |

- ไม่มี `source`, `license` เต็ม, `review`, `notes`, `tags` (asset-pipeline 5) · งบ ≤ 30 KB **ต่อไฟล์** (ไฟล์หลักและแต่ละ part) ตรวจใน test และ V13
- `assets` ของไฟล์หลักไม่มี entry ของ kind ที่ย้ายไป part (ตอนนี้ `avatar-layer`) · `credits[]` ยังรวมทุก entry รวมทั้งใน part
- entry `prompt-only` และ `shipped: false` ไม่อยู่ในชุด · entry `placeholder` อยู่ พร้อม `placeholder: true`

### 5.1 part ที่โหลดแบบ lazy: avatar (P2-X24)

ปัญหา: หลัง artist build อวตารจริงครั้งแรก (12 entry, 64 PNG) `asset-manifest.json` = 37,779 B เกินงบ 30,720 B (asset-pipeline 7.2) · 13.5 KB เป็นรายการไฟล์ของ `avatar-layer` (72 ไฟล์ = variant × scale)

ทางเลือกที่พิจารณา
| ทาง | ผล | ตัดสิน |
| --- | --- | --- |
| (a) บีบรูปแบบ (files เป็น tuple, ตัด `bytes`/`width`/`height`) | ลดได้ ~7 KB ≈ 30.5 KB ยังเกินหรือเฉียดงบ · เปลี่ยนรูปแบบ `files[]` ที่ client loader (`apps/client/src/assets/manifest.ts`) และ `icon.ts` อ่านอยู่ ต้อง bump `runtimeVersion` → client ปัจจุบันตกไป fallback ทั้งแอปจนกว่าจะแก้ · ไม่แก้ต้นเหตุ (รายการโตตาม content ทุก phase) | ไม่เลือก |
| (b) แยก avatar ไป part ที่โหลดทีหลัง | ไฟล์หลัก 24,325 B (79% ของงบ) · part avatar 13,588 B (44%) · ไฟล์หลักรูปแบบเดิม ไม่ต้องแก้ loader ที่มีอยู่ · ตรงกับ asset-pipeline 7.2 ที่ให้ avatar โหลดหลังแผนที่แสดงแล้ว และ pose kit โหลดเมื่อเปิดพาเนล party | **เลือก** |
| (c) ขึ้นงบ | gzip ของไฟล์ 37.8 KB เหลือ ~5 KB จึงถูกในแง่ data มือถือ แต่แค่เลื่อนปัญหา: cosmetic Phase 3 เพิ่มไฟล์ละ ~135 B × variant × scale และ JSON ที่ต้อง parse ก่อน icon แรกโตตาม · งบเป็นของ art-director | ไม่เลือก |

รูปแบบ (ค่าอยู่ใน `tools/art/pipeline.config.json` `runtimeParts.parts`)
- `avatar` = `{ kinds: ["avatar-layer"], path: "art/avatar/runtime-manifest.json" }` · entry ของ kind ในรายการไปอยู่ใน part แทนไฟล์หลัก · เพิ่ม part ใหม่ (เช่น `vfx`, `illus`) ได้ด้วย config อย่างเดียว เมื่อไฟล์หลักใกล้งบอีกครั้ง
- ไฟล์ part = `{ runtimeVersion: 1, avatarRig, assets }` · `assets[id]` รูปแบบเดียวกับไฟล์หลักทุก field
- ไฟล์หลักชี้ด้วย `parts.avatar.url` ที่มี `?v=` ของเนื้อ part · part อยู่ใต้ `art/` จึงได้ header immutable ของ `/kw/art/*` (6.2) โดย devops ไม่ต้องแก้ `_headers` · ไฟล์หลักยัง `no-cache` จึงเป็นตัวชี้เวอร์ชันตัวเดียวเหมือนเดิม
- งบ 30 KB ใช้ต่อไฟล์ · V13 หน้าแรกนับไฟล์หลัก + ทุก part (avatar ของตัวเองอยู่ในงบหน้าแรก 7.2) · วันนี้หน้าแรกโดยประมาณ 168,306 B จาก 400 KB

## 6. สัญญาการโหลดฝั่ง client (path, cache, fallback)

ส่วนนี้เป็นสัญญาที่ gameplay-programmer implement ใน `apps/client/` (task นี้ไม่แก้ `apps/client`)

### 6.1 path
- Vite ของ client copy `tools/art/out/client/` ทั้งโฟลเดอร์ไปที่ `dist/kw/` ตอน build (plugin copy หรือ `publicDir` เพิ่มเติม) และตอน `vite dev` กับ `vite preview` เสิร์ฟโฟลเดอร์เดียวกันที่ `/kw/` (ทำแล้ว: `kwAssetStagePlugin()` P2-X21 · header ดู 6.2.1 · หมายเหตุ: middleware ของ preview อ่านจาก `tools/art/out/client/` ตรง ไม่ใช่จาก `dist/kw/` ที่ `closeBundle` copy ไว้) · ฐาน = `import.meta.env.BASE_URL + 'kw/'` · ห้าม import ไฟล์จาก `tools/` เป็น module (ESLint `TOOLS_IMPORT_BAN`) อ่านเป็นไฟล์ static เท่านั้น
- client โหลด `kw/asset-manifest.json` ครั้งเดียวต่อ session ก่อนแสดง icon/ฟอนต์/เสียงแรก · URL จริง = ฐาน + `files[].url` ตรงตัว (มี `?v=` แล้ว) · ห้ามประกอบ path จาก id เอง
- part แบบ lazy (5.1): อ่าน `parts[name].url` จากไฟล์หลักแล้วโหลด ฐาน + url ตรงตัว ครั้งเดียวต่อ session · part `avatar` โหลดเมื่อจะวาดอวตารตัวแรก (หลังแผนที่แสดงแล้ว, asset-pipeline 7.2) ไม่ block icon/ฟอนต์/เสียง · entry `avatar-layer` หาใน `assets` ของ part ไม่ใช่ไฟล์หลัก · ตรวจ `runtimeVersion` และ `avatarRig` ของ part เหมือนไฟล์หลัก
- sprite sheet: `devicePixelRatio >= 1.5` → `scale: 2` ไม่งั้น `scale: 1` · ตัดสินครั้งเดียวต่อ session (asset-pipeline 5) · เลือกไฟล์ด้วย (`variant`, `scale`) · ตำแหน่ง frame จาก `sheet` (คอลัมน์ × `frameW`, แถว × `frameH`) ไม่ hardcode
- SVG icon: client เลือกเทคนิคด้วย `assets[id].tintable` **อย่างเดียว** (P2-H13, D-121, components.md 13.9) · `tintable === true` → fetch ข้อความ SVG จาก ฐาน + `files[].url` ครั้งเดียวต่อ id ต่อ session, sanitize แบบ allowlist (ตัด `script`, `on*`, `href` ที่ไม่ใช่ `#local`) แล้ว inline พร้อม `aria-hidden="true"` `focusable="false"` และตั้ง `color` ที่ตัวห่อเป็น token · ไม่มี key `tintable` → `<img>` เหมือนเดิม · ห้ามเดาจาก id, prefix หรือ `kind` (kind `icon-ui` เดียวกันมีทั้ง glyph `currentColor` และ glyph สีตายตัว เช่น `icon.ui.in-run`, `icon.ui.suspended` วันนี้) และห้าม hardcode รายชื่อ id ใน client · fetch หรือ sanitize ล้มเหลว → ถอยไป `<img>` URL เดียวกัน (ได้รูปสีตาม SVG แทนสีตามโทน ไม่ใช่รูปแตก, 6.4) · entry จะกลายเป็น tintable เมื่อ artist แก้ SVG เป็น `currentColor` แล้ว `stage` รันใหม่ โดย client ไม่ต้องแก้
- ถ้า entry มีทั้ง SVG (placeholder master ที่อยู่ใน `art/assets`) และ PNG ของ build ให้ใช้ PNG สำหรับ sheet อวตาร · entry ที่ยังไม่มี PNG (สถานะ placeholder ตอนนี้) ใช้ SVG แผ่นเดียวแทนได้ใน dev/preview เพราะ viewBox = ขนาด sheet ที่ 1x

### 6.2 cache
| ไฟล์ | header (devops-engineer ตั้งใน `_headers` ของ Pages) | เหตุผล |
| --- | --- | --- |
| `/kw/asset-manifest.json` | `Cache-Control: no-cache` + ETag | เป็นตัวชี้เวอร์ชัน (asset-pipeline 5) |
| `/kw/art/*`, `/kw/fonts/*`, `/kw/audio/*` | `Cache-Control: public, max-age=31536000, immutable` | URL มี `?v=<sha256 8 ตัว>` เปลี่ยนเมื่อไฟล์เปลี่ยน |
| `/kw/fonts/*.woff2` | `Content-Type: font/woff2` · `*.ttf` → `font/ttf` | |
- ไม่ใช้ CDN ภายนอกหรือ Google Fonts (PDPA: ไม่ส่ง IP ผู้เล่นให้บุคคลที่สาม, asset-pipeline 4.5)
- service worker (ถ้ามีภายหลัง) cache ตาม URL เต็มรวม `?v=`

#### 6.2.1 ใครส่ง header: ที่ deploy vs local (P2-H12 ตัดสิน)
| environment | ผู้เสิร์ฟ `/kw/*` | header cache | แหล่งจริงของ header |
| --- | --- | --- | --- |
| Pages ที่ deploy (วันนี้มีแค่ `keep-walking-preview`, ยังไม่มี production ตาม `docs/tech/environments.md` 1) | Cloudflare Pages จาก `dist/kw/` | ตามตาราง 6.2 ทุกแถว | `infra/pages/keep-walking-preview/_headers` (devops-engineer) · `infra/scripts/publish-client.sh` copy ไฟล์นี้เข้า `dist/_headers` ก่อน deploy · `infra/scripts/lint-headers.sh` ตรวจ path `/kw/*` ทั้ง 5 แบบ |
| `vite dev` / `vite preview` บนเครื่อง และ e2e (`playwright.config.ts` `webServer` = build + preview) | middleware `serveKw` ของ `kwAssetStagePlugin()` ใน `apps/client/vite.config.ts` | **ไม่ส่ง** `Cache-Control` (ยอมรับ) · ส่งแค่ `content-type` ตาม `KW_CONTENT_TYPES` | ไม่มี: local ไม่ใช่สัญญา cache |

กฎ
1. `_headers` ของ Pages project เป็นแหล่งจริงแหล่งเดียวของ header cache ของ `/kw/*` · Pages project ใหม่ (production ในอนาคต) ต้อง copy `_headers` ที่มีกฎ `/kw/*` ชุดเดียวกันใน publish script ของตัวเอง และเพิ่มไฟล์นั้นใน `lint-headers.sh` · ห้ามย้ายกฎไปไว้ในโค้ด client
2. middleware ของ Vite **ห้าม** จำลอง header ของ 6.2 · เหตุผล: (ก) ถ้ามีสองที่ ค่าจะเลื่อนจากกันโดยไม่มี lint จับ (ข) `immutable` บน local ทำให้ browser ของนักพัฒนาถือไฟล์เก่าหลังรัน prebuild ใหม่ เพราะ URL ของฟอนต์และ URL ที่ใส่ใน dev มือไม่มี `?v=` เสมอ (ค) ไม่มี header = browser ใช้ heuristic ซึ่งบน localhost ไม่ทำให้อะไรผิด · ถ้าต่อไปอยากตั้งอะไรบน local ให้ตั้งได้อย่างเดียวคือ `Cache-Control: no-store` (ผ่าน tech-lead ก่อน)
3. ความถูกต้องของ client ไม่พึ่ง header: `fetchAssetManifest` ส่ง `{ cache: 'no-cache' }` เอง (`apps/client/src/assets/manifest.ts`) และไฟล์ art/audio ใช้ URL ที่มี `?v=` · e2e จึงไม่ต้องตรวจ header · การตรวจ header จริงทำบน URL ที่ deploy ตาม `infra/runbooks/preview-setup.md` (คำสั่ง `curl -D -` ของ `/kw/*`)
4. ไฟล์ `/kw/*` ที่ไม่มีอยู่: middleware เรียก `next()` จึงตกไปที่ SPA fallback ของ Vite (ได้ `index.html` 200 `text/html`) เหมือน Pages ที่ไม่มี `404.html` · loader ต้องถือว่า JSON parse ไม่ผ่าน = โหลดไม่ได้ (ตอนนี้ `fetchAssetManifest`/`fetchManifestPart` จับใน `catch` แล้ว) แล้วไป fallback 6.4 · path ที่หนีออกนอก `tools/art/out/client/` (`..`, `%2e%2e`) ก็ตกไป SPA fallback เช่นกัน ไม่รั่วไฟล์ (ตรวจแล้ว 2026-09-27)
5. ผลตรวจ 2026-09-27 (`vite preview` บน `apps/client`): `/kw/asset-manifest.json` → 200 `application/json`, `/kw/fonts/.../*.ttf` → 200 `font/ttf`, ไม่มี `Cache-Control` ตามที่ยอมรับข้างบน

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
| part `avatar` โหลดไม่ได้ / `runtimeVersion` หรือ `avatarRig` ไม่ตรง / ไม่มี `parts.avatar` | แสดงโครงอวตารตั้งต้น (เหมือนระหว่างรอพาเนล party, 7.2) · ส่วนอื่นของแอปใช้ไฟล์หลักตามปกติ |
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

อยู่ใน `tools/art/src/validate.ts` · รันใน `pnpm test` ผ่าน `tools/art/test/repo.test.ts` และใน build ของ client ผ่าน `prebuild` · fixture ต่อกฎอยู่ใน `tools/art/test/rules.test.ts`, `build.test.ts` และ `manifest-set.test.ts` (การแยกไฟล์) · ทุกกฎอ่านทะเบียนที่ merge แล้ว · finding ของ entry บอกไฟล์ที่ประกาศ entry นั้น (index หรือ part)
| # | ตรวจ (ตาม asset-pipeline 8) | ระดับ |
| --- | --- | --- |
| V1 | index และทุก part ผ่าน schema root (แยกไฟล์) · `manifest.build.json` ผ่าน `$defs/buildManifest` · id ไม่ซ้ำข้ามทุกไฟล์ · เรียงตาม id ภายในแต่ละไฟล์ · entry ใน `manifest.<key>.json` ต้องมี key ที่เจาะจงที่สุด (`partKeyOf`) ตรงชื่อไฟล์ · id ใน build ต้องมีในทะเบียนที่ merge แล้ว | error |
| V2 | path ตาม 3.2 (`<root>/<group>/<name>.<ext>`, sheet `<name>[-<variant>]@<scale>x.png`) · `map.*` อยู่ใต้ `art/direction/map-style/` · `ref.*` ใต้ `art/ref/` · `art/src/` เฉพาะ placeholder | error |
| V3 | ไฟล์มีจริง · bytes, width, height (SVG = width/height ของ root, PNG = IHDR) ตรง · sha256 ตรงเมื่อมีค่า และบังคับตั้งแต่ `draft` · ฟอนต์: bytes + sha256 ตรง `fonts.json` และ `SHA256SUMS` | error |
| V4 | งบต่อไฟล์ 7.1 ตาม kind (`icon.ui16.*` ใช้งบ 1.5 KB) · งบ PNG ต่อ layer · ผลรวมอวตาร 7.2 จาก variant ที่ใหญ่สุดต่อ layer · ฟอนต์ ≤ 60 KB ต่อน้ำหนัก | error |
| V5 | PNG sheet = `sheet` × คอลัมน์/แถว × scale และตรงตาราง avatar-spec 6 · มี alpha | error |
| V6 | entry sheet ที่สถานะ ≥ `draft` มีทุก variant ครบทั้ง scale 1 และ 2 (รวมไฟล์จาก build) | error |
| V7 | SVG ที่ shipped: viewBox = `size` (sheet = ขนาดทั้งแผ่น) และ width/height = viewBox · ไม่มี `image`, `text`, `script`, `foreignObject`, gradient, `filter` · ไม่มี `@import` · `href` ต้องเป็น `#local` · สีใน attribute/`style`/`<style>` ต้องเป็น hex 6 หลักตัวใหญ่จาก `design/ux/tokens.json` (รวม `ramp.tonic` #FF8877 #DD4433 #AA2222) หรือ `none`/`transparent`/`url(#…)` · `currentColor` เฉพาะ `icon-ui` · opacity เฉพาะเงา `#1A1A22` ที่ 0.2 · id ภายในขึ้นต้นด้วยชื่อไฟล์ · id ใน `svg.miterRequiredIds` (`map.icon.rift-crack`, `icon.ui.rift`, `icon.ui.in-run`, `icon.ui.enter`) ต้องมี `stroke-linejoin="miter"` + `stroke-miterlimit="4"` | error |
| V8 | key color 6 ค่าไม่อยู่ใน SVG ใดใน `art/assets/` และ `art/src/` นอก 3 โฟลเดอร์ master · ไม่มีใน pixel ของ PNG ใดๆ | error |
| V9 | `placeholder` ตรง `status` · `approved` มี review PASS · `deprecated` มี `replacedBy` | error |
| V10 | `license.spdx` อยู่ในรายการ 9.1 · ฟอนต์มี license file จริง · Reserved Font Name → `modified: false` · `OFL.txt` ตรง sha256 ของ release และอยู่โฟลเดอร์เดียวกับฟอนต์ | error |
| V11 | ทุกไฟล์ใน `art/assets/` ถูกอ้างจากทะเบียนหรือ `manifest.build.json` (ยกเว้น `manifest.json`, `manifest.schema.json`, `manifest.build.json`, `manifest.<key>.json` ของทุก key ใน `manifestRoots`, `OFL.txt`) · ทุกไฟล์ใน `art/fonts/` อยู่ใน `fonts.json` | error |
| V12 | ทุก entry ใน `manifest.build.json`: master ตรงกับ `manifest.json` และ sha256 ของ master ไม่เปลี่ยน · build ใหม่ในหน่วยความจำได้ sha256 เท่าเดิม · ถ้าเครื่องที่ตรวจต่าง platform จาก `platform` ที่บันทึก และต่างกันไม่เกิน `raster.crossPlatform*` → warning | error (Phase 2) |
| V13 | ขนาดหน้าแรกโดยประมาณ (ฟอนต์ UI + UI glyph ทั้งหมด + อวตาร @2x + runtime manifest หลัก + ทุก part) ≤ 400 KB · glyph ≤ 30 KB · runtime manifest ≤ 30 KB ต่อไฟล์ (หลักและแต่ละ part, 5.1) · **ต่อไฟล์** ทะเบียนแต่ละไฟล์ (index และแต่ละ part) ≤ 60 KB (`budgets.manifestBytes`) | warning |

สถานะ 2026-09-27 (P2-X22): 88 entry ใน 1 ไฟล์ทะเบียน, 88 ไฟล์, 0 ไฟล์ build, 4 ฟอนต์ · 0 error, 1 warning (V13 `manifest.json` 101,448 B) · หน้าแรกโดยประมาณ 127,677 B · หลัง artist-2d รัน `split-manifest --write` (ลองใน repo สำเนา): 8 ไฟล์, 0 error 0 warning, `asset-manifest.json` ที่ stage ได้เหมือนเดิมทุกไบต์

สถานะ 2026-09-27 (P2-X24): 88 entry ใน 8 ไฟล์ทะเบียน, 88 ไฟล์, 64 ไฟล์ build, 4 ฟอนต์ · 0 error 0 warning · หน้าแรกโดยประมาณ 168,306 B · `asset-manifest.json` 24,325 B (73 asset) + `art/avatar/runtime-manifest.json` 13,588 B (12 asset)

### 10.1 ทะเบียนแยกตาม key (P2-X22, P2-H67 · ตอบข้อเสนอใน asset-pipeline 7.2)

การตัดสิน: **แยกไฟล์ตาม key ไม่ขึ้นงบ** · key = root หรือ root.group · เหตุผล
- งบ 60 KB ไม่ใช่งบดาวน์โหลด (client ไม่อ่านทะเบียนนี้ อ่าน `asset-manifest.json` ที่มีงบ 30 KB ของตัวเอง) แต่เป็นงบให้ไฟล์ review ได้และแก้ด้วย chunked write (CLAUDE.md ≤ 120 บรรทัดต่อครั้ง) · ไฟล์เดียว 101 KB (3,770 บรรทัด) ขัดทั้งสองข้อ และจะโตอีกทุก phase · ขึ้นงบแก้แค่ตัวเลข ไม่แก้ต้นเหตุ
- artist-2d และ vfx-animator เขียนทะเบียนใน wave เดียวกัน · ไฟล์ต่อ key ทำให้ `writes` ของสอง task ไม่ชนกัน
- schema ไม่เปลี่ยน (ทุกไฟล์เป็นเอกสาร asset-pipeline 6.6 ครบ) · `manifest.build.json` `source` ยังเป็น `art/assets/manifest.json` · consumer ทุกตัวได้ `Manifest` ที่ merge แล้วจาก `loadManifestSet` จึงไม่มีโค้ดอื่นต้องแก้

รูปแบบ (ค่าอยู่ใน `tools/art/pipeline.config.json`)
- `paths.manifestPart` = `art/assets/manifest.{root}.json` (placeholder `{root}` ถูกแทนด้วย key ใดก็ได้ใน `manifestRoots`) · ไฟล์แบนใน `art/assets/` (ไม่อยู่ในโฟลเดอร์ root เพราะ `map.*` และ `ref.*` เก็บไฟล์นอก `art/assets/`)
- `manifestRoots` = รายการ key: root ทั้ง 10 ของ asset-pipeline 3.1 และ key ย่อยแบบ `root.group` · วันนี้มี key ย่อย 3 ตัว `icon.ui`, `icon.item`, `icon.ui16` (P2-H67 เพราะ `manifest.icon.json` เกิน `budgets.manifestBytes`)
- entry ไปที่ key ที่เจาะจงที่สุด (`partKeyOf` ใน `tools/art/src/manifest-set.ts`): ถ้า `<root>.<group>` อยู่ในรายการใช้ key นั้น ไม่งั้นใช้ `<root>` · ไม่มีทั้งสอง = ค้างใน index และ V1 รายงาน
- key root เปล่า (เช่น `icon`) เป็น catch-all ของ group ที่ไม่มี key ย่อย (เช่น `icon.qc`) · วันนี้ `manifest.icon.json` ไม่มี entry จึงไม่มีไฟล์
- `art/assets/manifest.json` เป็น index: header ครบตาม schema · เป้าหมายและสถานะวันนี้คือ `assets: []` · entry ใหม่ใส่ใน part ไม่ใส่ใน index
- part ที่ไม่มีไฟล์ = ไม่มี entry ของ key นั้น · `updated` ของทะเบียนรวม = ค่าล่าสุดของทุกไฟล์
- แก้ entry ที่ไฟล์ของ key นั้นเท่านั้น · V1 ตก (`id belongs to part <key>`) ถ้า entry อยู่ผิดไฟล์
- แยกขั้นถัดไป: เมื่อ part ใดเกินงบ V13 เตือนพร้อม hint ให้เพิ่ม key `<root>.<group>` · tech-lead เพิ่ม key ใน `manifestRoots` แล้วเจ้าของทะเบียนรัน `split-manifest --write` · ไม่ต้องแก้โค้ดของ `tools/art`

สถานะ 2026-10-01 (P2-X60, หลัง P2-H67): 100 entry ใน 10 ไฟล์ทะเบียน (index ว่าง + 9 part) · `icon.ui` 42,338 B (35 entry, 71% ของงบ) ใหญ่สุด · `avatar` 24,957 B · `icon.ui16` 12,351 B · `icon.item` 12,208 B · `badge` 12,129 B · `frame` 10,161 B · ที่เหลือ < 9 KB · `validate` 0 error 0 warning

## 11. สมมติฐาน ความเสี่ยง และการส่งต่อ

สมมติฐาน
- [ASSUMPTION A-P2-F06-T07-1] ฐาน URL ของชุด asset ใน client คือ `<BASE_URL>kw/` · gameplay-programmer เปลี่ยนชื่อโฟลเดอร์ได้ถ้าแจ้ง devops-engineer พร้อมกัน (header ใน 6.2 ผูกกับ path) (ยืนยัน: gameplay-programmer, devops-engineer)
- [ASSUMPTION A-P2-F06-T07-2] รูปแบบ `audio/manifest.json` ตามหัวข้อ 8 · ถ้า sound-designer ต้องการรูปแบบอื่น ส่ง handoff ถึง tech-lead ก่อนแก้ ไม่งั้น hook ตก (ยืนยัน: sound-designer)
- [ASSUMPTION A-P2-F06-T07-3] ตัวเลขทุกตัวใน `tools/art/pipeline.config.json` คัดจาก asset-pipeline 7 และ avatar-spec 6/7.4 · art-director ปรับงบ ±30% ตาม A-P1-F03-T11-8 ได้โดยแก้เอกสารแล้วแจ้ง tech-lead แก้ config (ยืนยัน: art-director)
- [ASSUMPTION A-P2-X21-6] `vite preview` เสิร์ฟ `/kw/` เหมือน `vite dev` · **ยืนยันแล้ว (tech-lead, P2-H12, 2026-09-27)**: `configurePreviewServer` ลง middleware เดียวกัน และ probe จริงได้ 200 ทั้ง manifest และฟอนต์ · ข้อจำกัด: preview อ่านจาก `tools/art/out/client/` ไม่ใช่ `dist/kw/` จึงไม่ได้พิสูจน์ว่า `closeBundle` copy ถูก (ดูความเสี่ยงและส่งต่อด้านล่าง)
- [ASSUMPTION A-P2-F06-T07-4] SVGO ยังไม่เป็น dependency (task นี้แก้ lockfile ไม่ได้) · config อยู่ที่ `tools/art/svgo.config.mjs` และรันผ่าน `pnpm dlx` เมื่อจำเป็น · V7 ป้องกันผลที่ SVGO อาจทำพัง (miter, สี) อยู่แล้ว (ยืนยัน: tech-lead ในงาน dependency ถัดไป)

ความเสี่ยง
| ความเสี่ยง | ผล | ทางแก้ |
| --- | --- | --- |
| resvg ให้ pixel ต่างกันเล็กน้อยระหว่าง macOS arm64 กับ Linux x64 ของ CI | V12 ตกใน CI หลัง artist commit PNG จาก Mac | `platform` ถูกบันทึกใน `manifest.build.json` · ต่าง platform แต่อยู่ในเกณฑ์ `raster.crossPlatform*` เป็น warning · ถ้าเกินเกณฑ์ให้ build ใน CI แล้ว commit ผล (devops-engineer) |
| path build อื่นข้าม root build (หัวข้อ 3) | client ได้ชุด asset ว่าง ใช้ fallback ทั้งหมด | ปิดโดย P2-X22: prebuild อยู่ใน script ของ `apps/client` ที่ทุกทางใช้ |
| `art/assets/manifest.json` โตเกิน 60 KB (101,448 B ที่ 88 entry) | V13 เตือน | ปิดโดย P2-X22: tools/art อ่านทะเบียนแยกตาม key (10.1) · artist-2d ย้าย entry แล้ว (index `assets: []`) |
| `manifest.icon.json` โตเกินงบ | V13 เตือน | ปิดโดย P2-H67: icon แยกเป็น `icon.ui` / `icon.item` / `icon.ui16` (10.1) · part ใดเกินงบอีก ให้เพิ่ม key root.group ตามกฎเดียวกัน |
| `closeBundle` copy ไป `dist/kw/` พัง แต่ e2e ยังผ่าน เพราะ preview เสิร์ฟจาก `tools/art/out/client/` (P2-H12) | deploy ได้ `/kw/*` 404 ทั้งชุด client ไป fallback ทั้งหมด โดยไม่มี test ใดจับ | ส่งต่อ gameplay-programmer ด้านล่าง (ไม่ block) · ระหว่างนี้ตรวจด้วย `curl` ตาม `infra/runbooks/preview-setup.md` หลัง deploy |
| header cache ของ `/kw/*` มีสองที่ (P2-H12) | ค่าเลื่อนจากกัน | ปิดโดย 6.2.1: `_headers` ของ Pages เป็นแหล่งเดียว middleware ห้ามจำลอง |

ส่งต่อ
| ถึง | เรื่อง |
| --- | --- |
| gameplay-programmer (P2-F05-T10, P2-F06-T09) | implement หัวข้อ 6: copy `tools/art/out/client/` → `dist/kw/`, loader ของ `asset-manifest.json`, `@font-face` จาก `fonts[]`, เสียงตาม `audio[cueId]`, fallback 6.4, หน้าเครดิตจาก `credits[]` · (script `build`/`dev` รัน prebuild แล้ว: P2-X22) |
| devops-engineer (P2-F04-T08 / P2-F06-T16) | header 6.2 ใน `_headers`: **ปิดแล้ว** (P2-H12 ตรวจ `infra/pages/keep-walking-preview/_headers` มีครบ 5 กฎ `/kw/*` และ `publish-client.sh` copy เข้า `dist/`) · ไม่มีงาน infra ใหม่จาก P2-H12 · เมื่อสร้าง Pages project production ให้ทำตามกฎ 1 ของ 6.2.1 · `deploy-preview.yml` ได้ `tools/art/out/client` จาก script build ของ client แล้ว (P2-X22) · ถ้า V12 ต่าง platform ให้เพิ่มขั้น build อวตารใน CI |
| sound-designer (P2-F05-T06, P2-F06-T13) | สัญญาหัวข้อ 8 |
| artist-2d (P2-F05-T04, P2-F05-T07) | รัน `build --write` แล้ว commit PNG + `manifest.build.json` · ลงทะเบียน `map.icon.rift-crack` ตาม brief 3.10 (validator ตรวจ miter ให้แล้ว) |
| qa-tester | test hook: `pnpm exec tsx tools/art/src/cli.ts validate`, `tools/art/test/*.test.ts`, `asset-manifest.json` สำหรับตรวจ fallback |
| artist-2d (P2-X22) | รัน `pnpm exec tsx tools/art/src/cli.ts split-manifest --write` แล้ว `validate` (ต้อง 0 error 0 warning) · commit index + `manifest.<key>.json` ทั้งหมดใน task เดียว · จากนั้นแก้ entry ที่ part ของ key เท่านั้น · ปิดแล้ว (P2-X22, แยก icon ตาม group ใน P2-H67) |
| vfx-animator (P2-X22) | entry `vfx.*` ใหม่ลงใน `art/assets/manifest.vfx.json` ไม่ใส่ใน index |
| art-director (P2-X22) | บันทึกรูปแบบ 10.1 ใน asset-pipeline 2 (โครงโฟลเดอร์), 6 (ระบุว่าทะเบียนมีหลายไฟล์ schema เดียว) และ 7.2 (ข้อเสนอแยกไฟล์ปิดแล้ว) |
| devops-engineer (P2-X22) | ลบบรรทัด `pnpm exec tsx tools/art/src/cli.ts prebuild` (และ log นำหน้า) ใน `infra/scripts/publish-client.sh` เพราะ `pnpm --filter @keep-walking/client build` รันให้แล้ว (หัวข้อ 3) |
| tech-lead (P2-X24) | ปิดแล้ว: root `build` = `pnpm -r --if-present run build` |
| gameplay-programmer (P2-X24 · งานถัดไปใน `apps/client/src/assets/`) | (1) type `RuntimeManifest` เพิ่ม `parts?: Record<string, { url: string; bytes: number }>` และ loader ของ part avatar ตาม 6.1/6.4 (ยังไม่มี renderer อวตาร จึงยังไม่มีอะไรพัง) · (2) type เดิมไม่ตรงกับที่ stage จริง: `RuntimeAssetSheet` ใช้ `columns`/`rows: number` แต่จริงคือ `cols`/`rows: string[]` (+ `frames?`, `fps?`) และ `variants` จริงคือ `{ axis, values }` ไม่ใช่ `string[]` · แหล่งจริง `tools/art/src/manifest.ts` `ManifestEntry` · (3) Vite ยังไม่ copy `tools/art/out/client/` ไป `dist/kw/` (`pnpm build` แล้วไม่มี `dist/kw/`) ตาม 6.1 · ข้อ (3) ปิดแล้วโดย P2-X21 (`kwAssetStagePlugin()` `closeBundle`, ตรวจใน P2-H12) |
| gameplay-programmer (P2-H12 · ไม่ block · ไม่ต้องแก้ header) | middleware `/kw/` ไม่ต้องเพิ่ม `Cache-Control` (6.2.1 กฎ 2) · ข้อเสนอให้ทำในงานถัดไปที่แตะ `apps/client/vite.config.ts`: ให้ `configurePreviewServer` เสิร์ฟจาก `dist/kw/` (outDir ที่ resolve แล้ว) แทน `tools/art/out/client/` เพื่อให้ e2e พิสูจน์ผลของ `closeBundle` ด้วย · `configureServer` (dev) คงอ่าน `tools/art/out/client/` ตามเดิม |
