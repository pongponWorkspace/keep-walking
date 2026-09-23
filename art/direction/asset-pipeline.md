# Asset Pipeline — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T11 · เจ้าของ: art-director · สถานะ: ฉบับเสนอ · วันที่: 2026-09-23
แหล่งอ้างอิง: `art/direction/style-guide.md` (token, หัวข้อ 7 ตัวอักษร, 11 prompt) · `art/direction/icon-grammar.md` หัวข้อ 7–8 · `art/direction/avatar-spec.md` · `art/vfx/specs/motion-direction.md` หัวข้อ 2 · `docs/adr/0001-repo-layout.md` · `docs/tech/F02-map-location-spike.md` หัวข้อ 6 (glyph, sprite, font-faces) · `design/ux/tokens.json` (font) · D-001 (ต้นทุนศูนย์) · repo เป็น public (D-002, D-007)
ผู้ใช้เอกสาร: artist-2d (ลงทะเบียน asset ทุกชิ้น), vfx-animator, uiux-designer, gameplay-programmer (อ่าน manifest ตาม id), tech-lead และ devops-engineer (build และ validator)

เอกสารนี้ชนะ icon-grammar หัวข้อ 7–8 เรื่อง id, path และงบขนาด (ตามที่ icon-grammar ระบุไว้เอง) · กฎการวาดยังเป็นของ style guide, icon-grammar และ avatar-spec

## สารบัญ
1. หลักการ
2. โครงโฟลเดอร์
3. การตั้งชื่อ: id และ path
4. Format และขั้นตอน build ต่อชนิด
5. การโหลดใน client: ความละเอียดและ cache
6. `art/assets/manifest.json`: schema
7. งบขนาดไฟล์
8. Validator (ตรวจอัตโนมัติ)
9. License และที่มาของ asset (รวมฟอนต์)
10. วงจรสถานะของ asset
11. สมมติฐานและการส่งต่อ

## 1. หลักการ

1. **code อ้าง asset ด้วย id เท่านั้น** ไม่ hardcode path · id → ไฟล์ ผ่าน `art/assets/manifest.json` · ของเกม (ไอเทม ชุดประดับ) ชี้ไป asset ด้วย id จาก content config ไม่ใช่ชื่อ (NN-3: ชื่อมาจากหลังบ้าน)
2. **ทุกไฟล์ที่ส่งถึงผู้เล่นอยู่ใน manifest** พร้อมที่มาและ license · ไฟล์ที่ไม่อยู่ใน manifest ถือว่าไม่มีอยู่ (validator ตก)
3. **vector ก่อน raster** · SVG สำหรับ icon, UI, badge, frame, ภาพประกอบเรียบ · PNG sprite sheet สำหรับ avatar และ VFX เท่านั้น (VFX ใช้ CSS ก่อนเสมอตาม motion-direction 2)
4. **ต้นทุนศูนย์ (D-001):** ไม่มี asset pack เสียเงิน ไม่ใช้ภาพจากเว็บที่ไม่รู้ license ไม่ใช้ CDN ภายนอก · เครื่องมือ build เป็น open source ฟรี · ภาพ raster จาก prompt ต้องมาจากเครื่องมือฟรีที่เงื่อนไขอนุญาตให้เผยแพร่ใน repo public (หัวข้อ 9)
5. **repo public:** ทุก asset, prompt และ source เผยแพร่พร้อม repo · ห้ามมีของที่เราไม่มีสิทธิ์เผยแพร่ต่อ แม้เป็นของทดสอบ
6. **master แยกจากไฟล์ส่ง:** master ที่ต้อง build (avatar) อยู่ใน `art/src/` · ไฟล์ที่ client ใช้อยู่ใน `art/assets/` เท่านั้น

## 2. โครงโฟลเดอร์

```
art/
  direction/                 เอกสารทิศทาง (art-director) · map-style/ (MapLibre style + icon SVG ของแผนที่)
  prompts/                   prompt raster ต่อหมวด เช่น avatar.md (artist-2d)
  reviews/                   content gate F<nn>-visual-gate.md (art-director)
  src/                       master ที่ต้อง build ไม่ส่งถึงผู้เล่น
    avatar/<layer>/<name>.svg      master sheet ของ avatar (มี key color)
  assets/                    ไฟล์ที่ส่งถึงผู้เล่น (source of truth ของ client)
    manifest.json
    icon/ui/<name>.svg             UI glyph 24
    icon/ui16/<name>.svg           UI glyph 16 (วาดแยก)
    icon/qc/<name>.svg             quick command 24 master (แสดง 32)
    icon/item/<name>.svg           item icon 64
    badge/class/<name>.svg         class badge 20/32/48
    frame/rarity/<name>.svg        rarity frame 52/72
    avatar/<layer>/<name>[-<variant>]@<1|2>x.png   sprite sheet ที่ build แล้ว
    vfx/<group>/<name>@<1|2>x.png  VFX sheet (เมื่อได้รับอนุมัติเท่านั้น)
    ui/<group>/<name>.svg          ชิ้น UI (ขอบใบเสร็จรอยฉีก, รอยแตกบนการ์ด)
    illus/<group>/<name>.<svg|png|webp>  ภาพประกอบ หน้าว่าง onboarding
    font/<role>/<file>.<woff2|ttf> + OFL.txt ในโฟลเดอร์เดียวกัน
  ref/                       ภาพอ้างอิงที่ไม่ส่งถึงผู้เล่น (style tile, ภาพจาก prompt ที่ใช้เป็นแนวคิด)
```
- ชื่อโฟลเดอร์ใน `art/assets/` ตรงกับ 2 ส่วนแรกของ id (หัวข้อ 3) จึงแปลง id เป็น path ได้โดยไม่ต้องเปิด manifest (manifest ยังเป็นตัวตัดสิน)
- วิธีที่ `art/assets/` ไปถึง client (copy ตอน build ของ `apps/client` หรือ symlink) เป็นของ tech-lead [ASSUMPTION A-P1-F03-T11-6]
- ไฟล์ PNG ที่ build จาก `art/src/` **commit ลง `art/assets/`** เพื่อให้ content gate ตรวจภาพจริงได้ และ CI ของ client ไม่ต้องมีเครื่องมือภาพ · validator ตรวจว่าไฟล์ตรงกับ master (หัวข้อ 8)

## 3. การตั้งชื่อ: id และ path

### 3.1 ไวยากรณ์ id
```
id      = root "." group "." name
root    = "icon" | "badge" | "frame" | "avatar" | "vfx" | "ui" | "illus" | "font" | "map" | "ref"
group   = kebab                        เช่น ui, ui16, qc, item, class, rarity, outfit-body
name    = kebab                        เช่น map, on-my-way, weapon-folding-umbrella, tanker-48
kebab   = [a-z][a-z0-9]*(-[a-z0-9]+)*
regex   = ^(icon|badge|frame|avatar|vfx|ui|illus|font|map|ref)\.[a-z][a-z0-9]*(-[a-z0-9]+)*\.[a-z][a-z0-9]*(-[a-z0-9]+)*$
```
- ตัวพิมพ์เล็ก ASCII เท่านั้น ไม่มีช่องว่าง ไม่มีภาษาไทยใน id หรือชื่อไฟล์ · ใช้คำนามทั่วไปภาษาอังกฤษ ห้ามชื่อคน ชื่อแบรนด์ ชื่อสถานที่จริง
- id ตายตัวตลอดอายุ asset · เปลี่ยนภาพ = ไฟล์ใหม่ใน id เดิม (hash เปลี่ยน) · เปลี่ยนความหมาย = id ใหม่ + ตั้ง id เดิมเป็น `deprecated` พร้อม `replacedBy`

### 3.2 id → path (ค่าเริ่มต้น)
```
art/assets/<root>/<group>/<name>.<ext>                      SVG, font, illus
art/assets/<root>/<group>/<name>[-<variant>]@<scale>x.png   sprite sheet (avatar, vfx)
```
ตัวอย่าง: `icon.qc.on-my-way` → `art/assets/icon/qc/on-my-way.svg` · `avatar.hair.bob` variant `hair-3` ที่ 2x → `art/assets/avatar/hair/bob-hair-3@2x.png`
ข้อยกเว้นเดียวที่ path ไม่ตามกฎ: `map.*` ซึ่งอยู่ใน `art/direction/map-style/` (ต้องอยู่คู่ style JSON ตาม tech note F02) และ `ref.*` ซึ่งอยู่ใน `art/ref/` · ทั้งสองระบุ `files[].path` ตรงใน manifest

### 3.3 ตาราง kind
| `kind` (manifest) | id | format | canvas ที่ 1x | ตัวอย่าง id |
| --- | --- | --- | --- | --- |
| `icon-ui` | `icon.ui.<name>` · `icon.ui16.<name>` | SVG | 24 × 24 · 16 × 16 | `icon.ui.gate-pass`, `icon.ui16.gate-pass` |
| `icon-qc` | `icon.qc.<name>` | SVG | 24 × 24 (แสดง 32) | `icon.qc.arrived` |
| `icon-item` | `icon.item.<category>-<name>` · category = `weapon`, `armor`, `charm`, `boots`, `slot-empty`, `mat`, `potion`, `currency`, `badge`, `cosmetic` | SVG | 64 × 64 | `icon.item.weapon-folding-umbrella`, `icon.item.slot-empty-boots`, `icon.item.mat-rift-stone` |
| `badge-class` | `badge.class.<class>-<size>` · size = 20, 32, 48 | SVG | ตาม size | `badge.class.support-20` |
| `frame-rarity` | `frame.rarity.<tier>-<size>` · size = 52, 72 | SVG | ตาม size | `frame.rarity.legendary-72` |
| `avatar-layer` | `avatar.<layer-kebab>.<name>` · layer-kebab = `body`, `face`, `hair`, `outfit-body`, `outfit-feet`, `weapon`, `accessory-charm`, `accessory-head`, `accessory-face`, `pose-hand`, `pose-prop` | PNG sheet (+ master SVG ใน `art/src/`) | frame 128 × 160 · sheet ตาม avatar-spec 6 | `avatar.outfit-body.raincoat` |
| `vfx` | `vfx.<group>.<name>` | PNG sheet | ตามที่อนุมัติ | `vfx.drop.legendary-shards` (ถ้าจำเป็น) |
| `ui` | `ui.<group>.<name>` | SVG | ตามชิ้น | `ui.enhance.receipt-tear` |
| `illus` | `illus.<group>.<name>` | SVG (ค่าเริ่มต้น) · PNG หรือ WebP lossless ถ้าเป็นภาพจาก prompt | ตามชิ้น | `illus.empty.no-dungeon-nearby` |
| `font` | `font.<role>.<name>` · role = `ui`, `map` | WOFF2 (UI) · TTF (MapLibre `font-faces`) | — | `font.ui.plex-sans-thai-looped-500` |
| `map-icon` | `map.icon.<name>` | SVG → build เป็น MapLibre sprite | ตาม map-style.md | `map.icon.rift-crack` |
| `reference` | `ref.<group>.<name>` | SVG/PNG | — | `ref.style-tile.v1` (`shipped: false`) |

ชื่อ layer ใน field `layer` ของ manifest ใช้ snake_case ตาม avatar-spec (`outfit_body`) · ใน id ใช้ kebab (`outfit-body`) · renderer แปลงด้วยการแทน `-` เป็น `_`

### 3.4 id สุดท้ายของ quick command (แทนข้อเสนอใน icon-grammar 7.2)
ชื่อตาม copy key `qc.*` ของ narrative-designer แปลง camelCase เป็น kebab
| copy key | icon id | pose (avatar-spec 10) |
| --- | --- | --- |
| `qc.arrived` | `icon.qc.arrived` | `wave` |
| `qc.onMyWay` | `icon.qc.on-my-way` | แกว่งแขน |
| `qc.goOn` | `icon.qc.go-on` | `point` |
| `qc.needHeal` | `icon.qc.need-heal` | `reach` |
| `qc.hpCritical` | `icon.qc.hp-critical` | `clutch` |
| `qc.needCover` | `icon.qc.need-cover` | `hold` + `shield` |
| `qc.needBreak` | `icon.qc.need-break` | `hold` + `cup` |
| `qc.retreating` | `icon.qc.retreating` | แกว่งแขน |
| `qc.goodDrop` | `icon.qc.good-drop` | `fist` |
| `qc.thanks` | `icon.qc.thanks` | `thumb` |

UI glyph ใน icon-grammar 7.1 ใช้ชื่อเดิมเป็น `<name>` ได้ทันที (`icon.ui.map`, `icon.ui.gate-miss`, …) · item icon ใน icon-grammar 7.3 เปลี่ยน prefix จาก `item-<slot>-<id>` เป็น `icon.item.<slot>-<name>` และ `mat-*`, `potion-*`, `currency-gold`, `badge-*` เป็น `icon.item.mat-*`, `icon.item.potion-*`, `icon.item.currency-gold`, `icon.item.badge-*`

## 4. Format และขั้นตอน build ต่อชนิด

### 4.1 SVG (icon, badge, frame, ui, illus, map-icon)
กฎของ icon-grammar 8 ใช้กับ SVG ทุกไฟล์ใน `art/assets/` บวกข้อต่อไปนี้
| กฎ | ค่า |
| --- | --- |
| root | `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H">` · W, H ตรง `size` ใน manifest |
| ห้าม element | `<image>`, `<text>`, `<script>`, `<foreignObject>`, `<style>` ที่มี `@import`, `<use>` ที่ชี้ไฟล์ภายนอก, `href` ภายนอกทุกชนิด |
| สี | hex 6 หลักตัวพิมพ์ใหญ่จาก token/ramp ใน style guide 3 และ avatar-spec 7 · `currentColor` เฉพาะ UI glyph แบบ outline · `none` |
| ความโปร่งใส | ห้าม `opacity`, `fill-opacity`, `stroke-opacity` ยกเว้นเงาตกกระทบ `ink.900` ที่ 0.2 (style guide 6.3) |
| id ภายใน | prefix ด้วยชื่อไฟล์ เช่น `gate-pass-check` (กัน id ชนเมื่อ inline หลายตัว) |
| ปรับขนาด | ผ่าน SVGO (MIT, ฟรี) preset default โดยปิด `removeViewBox` และคง `currentColor` · precision 2 ตำแหน่ง |
| สิ่งที่ต้องคงไว้ | viewBox, `stroke-linecap="round"`, `stroke-linejoin="round"` ของ UI glyph |

### 4.2 PNG sprite sheet ของ avatar
```
art/src/avatar/<layer>/<name>.svg  (master sheet, viewBox = sheet 1x, มี key color)
   │ 1. แทน key color ด้วย ramp ของแต่ละ variant (ถ้า layer มี variant)
   │ 2. rasterize ทั้งแผ่นที่ scale 1 และ 2 (antialias เปิด, พื้นโปร่งใส)
   │ 3. quantize เป็น PNG 8-bit palette + alpha (≤ 128 สี), ไม่มี dithering
   │ 4. เขียนไฟล์ตาม 3.2 และอัปเดต bytes, width, height, sha256 ใน manifest
   v
art/assets/avatar/<layer>/<name>[-<variant>]@1x.png และ @2x.png
```
- variant ที่ build: `body` และ `pose-hand` → `skin-1` … `skin-6` · `hair` → `hair-1` … `hair-6` · layer อื่นไม่มี variant (ไฟล์ไม่มีส่วน `-<variant>`)
- ขนาด sheet ต้องตรงตาราง avatar-spec 6 × scale · ไม่ trim ไม่ pack ใหม่ ไม่มี padding
- ไม่มี dithering เพราะภาพเป็นสีแบน 3 ค่า การ dither ทำให้ขอบเป็นจุดและไฟล์ใหญ่ขึ้น
- เครื่องมือ: script ใน `tools/` (เจ้าของตาม ADR 0001 คือ tech-lead) ใช้ library ฟรีที่ rasterize SVG ได้ตรง · ข้อเสนอ: `@resvg/resvg-js` (MPL-2.0) สำหรับ rasterize + quantizer แบบ JS · การเลือก dependency และ `allowBuilds` เป็นของ tech-lead [ASSUMPTION A-P1-F03-T11-7]
- ก่อนมีเครื่องมือ (ช่วง T14): artist-2d ส่ง master SVG + ลงทะเบียน manifest `status: "placeholder"` โดย `files` ชี้ master SVG ใน `art/src/` ได้ชั่วคราว (`format: "svg"`, `scale: null`) · validator ยอมเฉพาะ `status` = `placeholder`

### 4.3 VFX
- ค่าเริ่มต้นคือ CSS/WAAPI ไม่มีไฟล์ภาพ (motion-direction 2: module ≤ 20 KB, ไม่มี raster สำหรับ motion) · effect ที่ใช้ icon ที่มีอยู่แล้วไม่ต้องลงทะเบียนอะไรเพิ่ม
- PNG sheet ใช้ได้เมื่อ art-director อนุมัติเป็นรายชิ้นเท่านั้น · กฎ: frame เท่ากันทุกช่อง เรียงซ้ายไปขวา แถวเดียว · ≤ 12 frame · สีแบนจาก token · quantize แบบเดียวกับ 4.2 · ไฟล์ @1x และ @2x · ลงทะเบียน `sheet.frames` และ `sheet.fps` ใน manifest

### 4.4 Map icon และ MapLibre sprite
- source SVG อยู่ใน `art/direction/map-style/icons/` (เช่น `rift-crack.svg`) ตามกฎ 4.1 · ลงทะเบียนเป็น `kind: "map-icon"`
- การรวมเป็น sprite ของ MapLibre (`.json` + `.png` และ `@2x`) ทำโดย `tools/tiles` ตาม tech note F02 หัวข้อ 6 และ publish ที่ `sprites/v4/light` ร่วมกับ sprite ของ Protomaps · ไฟล์ sprite ที่ build แล้วไม่อยู่ใน manifest (MapLibre อ่านผ่าน `VITE_SPRITE_URL`) แต่ source ทุกชิ้นต้องอยู่

### 4.5 ฟอนต์
| บทบาท | family | ไฟล์ | ใช้โดย |
| --- | --- | --- | --- |
| `font.ui.*` | IBM Plex Sans Thai Looped 500, 700 | WOFF2 ทางการจาก release ของ IBM (`github.com/IBM/plex` หรือ npm `@ibm/plex-sans-thai-looped`) **ไม่แก้ไข ไม่ subset** | CSS `@font-face` ของ client · `font-display: swap` · fallback ตาม `tokens.json` |
| `font.map.*` | Noto Sans Thai Regular, Medium | TTF จาก `notofonts/thai` subset เหลือ U+0E00–0E7F ได้ | MapLibre `font-faces` ตาม tech note F02 หัวข้อ 6.2 (path `glyphs/_faces/`) |
- host เองทั้งหมด ห้ามชี้ Google Fonts หรือ CDN อื่น (tech note F02 TL-M03 และ PDPA: ไม่ส่ง IP ผู้เล่นให้บุคคลที่สาม)
- pin เวอร์ชันและ sha256 ของไฟล์ต้นทางใน manifest (`source.tool.version`, `files[].sha256`) · ไฟล์ฟอนต์ของแผนที่ที่ `tools/tiles` ดึงมาเองให้ลงทะเบียน id เดียวกันด้วยเพื่อบันทึก license
- license และข้อจำกัดชื่อฟอนต์: หัวข้อ 9.3

### 4.6 ภาพ raster จาก prompt
- agent ในสตูดิโอเขียน prompt ได้ แต่สร้างภาพ raster เองไม่ได้ · entry เริ่มเป็น `status: "prompt-only"` (`files: []`, `source.prompt` ชี้หัวข้อใน `art/prompts/<หมวด>.md`)
- การรันเครื่องมือสร้างภาพเป็นงาน `HUMAN` (ต้องใช้บัญชี) · คนบันทึกชื่อเครื่องมือ เวอร์ชันหรือรุ่น และวันที่ใน `source.tool` แล้วส่งไฟล์เข้า `art/ref/` ก่อน
- ภาพจาก prompt ที่จะส่งถึงผู้เล่น (ภาพประกอบ `illus.*`) ต้อง remap สีให้ตรง token (style guide 11), ตรวจตาม checklist style guide 10 และส่งเป็น PNG 8-bit หรือ WebP lossless · avatar ห้ามใช้ภาพจาก prompt เป็น layer ตรงๆ (avatar-spec 12)

## 5. การโหลดใน client: ความละเอียดและ cache

- sprite sheet: `window.devicePixelRatio >= 1.5` → ไฟล์ `scale: 2` · อื่นๆ → `scale: 1` · ตัดสินครั้งเดียวต่อ session
- ตำแหน่ง frame คำนวณจาก `sheet` ใน manifest (คอลัมน์ × `frameW`, แถว × `frameH`) ไม่ hardcode ใน code
- avatar ของแต่ละคนประกอบลง canvas ครั้งเดียวต่อ view แล้ว cache ภาพที่ประกอบแล้วด้วย key = รายการ id + variant · ไม่ประกอบใหม่ทุกเฟรม (ไม่มี animation ต่อเนื่อง)
- URL ของไฟล์ต่อท้าย `?v=<8 ตัวแรกของ sha256>` จาก manifest เพื่อให้ cache ได้ยาว (`Cache-Control: public, max-age=31536000, immutable`) และเปลี่ยนภาพได้โดยไม่ต้องเปลี่ยน id · header จริงตั้งโดย devops-engineer ใน `_headers` ของ Pages
- manifest เองใช้ cache สั้น (no-cache + ETag) เพราะเป็นตัวชี้เวอร์ชัน
- client โหลดเฉพาะ entry ที่ `shipped` ไม่เป็น `false` · ถ้ามี build step ให้ตัด field ที่ไม่ใช้ตอน runtime (`source`, `license`, `review`, `notes`) ออกเป็น `manifest.runtime.json` ได้ แต่ id, files, sheet, variants ต้องคงเดิม

## 6. `art/assets/manifest.json`: schema

ไฟล์เดียว เป็น JSON UTF-8 เยื้อง 2 ช่อง · `assets` เรียงตาม `id` ตามตัวอักษร (diff อ่านง่ายเมื่อหลาย agent ลงทะเบียนพร้อมกัน) · ผู้แก้: artist-2d และ vfx-animator ลงทะเบียน · art-director เปลี่ยน `status` เป็น `approved` · เครื่องมือ build แก้ได้เฉพาะ `files[]`

### 6.1 ระดับบนสุด
| field | ชนิด | บังคับ | ความหมาย |
| --- | --- | --- | --- |
| `manifestVersion` | integer = 1 | ใช่ | เวอร์ชัน schema ของเอกสารนี้ |
| `avatarRig` | integer = 1 | ใช่ | เวอร์ชันของ rig ใน avatar-spec (frame, anchor, z) · renderer ปฏิเสธ manifest ที่ rig ไม่ตรง |
| `updated` | string `YYYY-MM-DD` | ใช่ | วันที่แก้ล่าสุด |
| `baseDir` | string = `"art/assets"` | ใช่ | ฐานของ `files[].path` ที่ไม่ขึ้นต้นด้วย `art/` |
| `assets` | array ของ entry | ใช่ | ว่างได้ |

### 6.2 Entry (1 asset = 1 id)
| field | ชนิด | บังคับ | ความหมายและกติกา |
| --- | --- | --- | --- |
| `id` | string ตาม regex 3.1 | ใช่ | ไม่ซ้ำทั้งไฟล์ |
| `kind` | enum ตาราง 3.3 | ใช่ | `icon-ui`, `icon-qc`, `icon-item`, `badge-class`, `frame-rarity`, `avatar-layer`, `vfx`, `ui`, `illus`, `font`, `map-icon`, `reference` |
| `status` | enum | ใช่ | `prompt-only`, `placeholder`, `draft`, `approved`, `deprecated` (หัวข้อ 10) |
| `placeholder` | boolean | ใช่ | `true` ก็ต่อเมื่อ `status` เป็น `prompt-only` หรือ `placeholder` · client แสดงของ placeholder ได้ใน dev/preview เท่านั้น |
| `size` | `{ "width": int, "height": int }` | ใช่ | ขนาด canvas ที่ 1x (SVG = viewBox · sheet = ขนาด frame) · font ใช้ `null` |
| `files` | array ของ file | ใช่ | ว่างได้เฉพาะ `prompt-only` |
| `layer` | enum avatar-spec 5.1 | เมื่อ `kind` = `avatar-layer` | `body`, `face`, `hair`, `outfit_body`, `outfit_feet`, `weapon`, `accessory_charm`, `accessory_head`, `accessory_face`, `pose_hand`, `pose_prop` |
| `sheet` | object | เมื่อเป็น PNG sheet | `frameW`, `frameH` (int) · `cols` (array ของชื่อคอลัมน์ เช่น `["front","side","back"]` หรือชื่อท่า) · `rows` (array ของชื่อแถว เช่น `["body","arm_w","arm_p"]`) · VFX เพิ่ม `frames`, `fps` |
| `variants` | object | เมื่อมี variant | `axis` (`"skin"` หรือ `"hair"`) · `values` (array เช่น `["skin-1", …, "skin-6"]`) |
| `source` | object | ใช่ | ดู 6.3 |
| `license` | object | ใช่ | ดู 6.3 |
| `shipped` | boolean | ไม่ (ค่าเริ่มต้น `true`) | `false` = ไม่ส่งถึงผู้เล่น (`reference`, master) |
| `review` | object | เมื่อ `status` = `approved` | `{ "gate": "art/reviews/F03-visual-gate.md", "verdict": "PASS", "date": "YYYY-MM-DD" }` |
| `replacedBy` | string (id) | เมื่อ `status` = `deprecated` | id ที่ใช้แทน |
| `tags` | array ของ string | ไม่ | เช่น `["class:tanker"]`, `["slot:weapon"]` ใช้ค้นหาเท่านั้น code ห้ามพึ่ง |
| `notes` | string | ไม่ | ภาษาไทยได้ · สั้น |

File (`files[]`)
| field | ชนิด | บังคับ | ความหมาย |
| --- | --- | --- | --- |
| `path` | string | ใช่ | สัมพัทธ์กับ `baseDir` หรือขึ้นต้นด้วย `art/` สำหรับข้อยกเว้น 3.2 และ master ชั่วคราว |
| `format` | enum | ใช่ | `svg`, `png`, `webp`, `woff2`, `ttf` |
| `scale` | 1, 2 หรือ `null` | ใช่ | `null` สำหรับ SVG และ font |
| `variant` | string หรือ `null` | ใช่ | ค่าจาก `variants.values` หรือ `null` |
| `bytes` | integer | ใช่ | ขนาดไฟล์จริง · ต้องไม่เกินงบหัวข้อ 7 |
| `width`, `height` | integer หรือ `null` | ใช่ | ขนาดพิกเซลจริงของไฟล์ (sheet = ขนาดทั้งแผ่น × scale) · font ใช้ `null` |
| `sha256` | string hex 64 ตัว | ใช่เมื่อ `status` ≥ `draft` | ใช้ทำ `?v=` และตรวจว่าไฟล์ตรง |

### 6.3 `source` และ `license`
`source`
| field | ชนิด | ความหมาย |
| --- | --- | --- |
| `method` | enum | `agent-svg` (agent วาด SVG เอง) · `build-generated` (สร้างจาก master) · `prompt-raster` (ภาพจากเครื่องมือสร้างภาพที่คนรัน) · `agent-svg-from-ref` (agent วาดใหม่โดยอิงภาพจาก prompt) · `vendor` (ของบุคคลที่สามที่ license อนุญาต เช่น ฟอนต์) · `human-commission` (คนวาดหรือจ้าง ต้องผ่าน HUMAN) |
| `author` | string | ชื่อ role (`artist-2d`) หรือ `HUMAN` หรือชื่อผู้พัฒนาต้นทาง (`IBM Corp.`) |
| `task` | string | id ของ task ที่สร้าง เช่น `P1-F03-T14` |
| `master` | string หรือ `null` | path ของ master เมื่อ `build-generated` เช่น `art/src/avatar/body/base.svg` |
| `prompt` | `{ "file": string, "anchor": string }` หรือ `null` | เช่น `{ "file": "art/prompts/avatar.md", "anchor": "#body-base" }` · บังคับเมื่อ `prompt-only`, `prompt-raster`, `agent-svg-from-ref` |
| `tool` | `{ "name": string, "version": string }` หรือ `null` | เครื่องมือสร้างภาพ, rasterizer หรือเวอร์ชัน release ของฟอนต์ |
| `origin` | string (URL) หรือ `null` | แหล่งดาวน์โหลดของ `vendor` |
| `date` | `YYYY-MM-DD` | วันที่สร้างหรือดึงไฟล์ |

`license`
| field | ชนิด | ความหมาย |
| --- | --- | --- |
| `spdx` | string | `LicenseRef-KeepWalking-Original` (งานของโปรเจกต์) · `OFL-1.1` · ค่าอื่นต้องได้รับอนุมัติจาก art-director ก่อนลงทะเบียน |
| `holder` | string | เจ้าของลิขสิทธิ์ เช่น `keep-walking studio`, `IBM Corp.`, `The Noto Project Authors` |
| `file` | string หรือ `null` | path ของข้อความ license ใน repo (ฟอนต์บังคับ เช่น `art/assets/font/ui/OFL.txt`) |
| `attribution` | string หรือ `null` | ข้อความที่ต้องแสดงในหน้าเครดิต |
| `reservedFontName` | string หรือ `null` | ชื่อสงวนตาม OFL (IBM Plex = `"Plex"`) |
| `modified` | boolean | ไฟล์ถูกแก้จากต้นทางหรือไม่ (subset นับเป็นการแก้) · ถ้า `reservedFontName` ไม่เป็น `null` ต้องเป็น `false` |

### 6.4 ความสัมพันธ์กับ content config
- manifest ไม่รู้จักไอเทม · ไอเทมและชุดประดับใน content config (เจ้าของ systems-designer / liveops) ถือ id ของ asset เช่น `"assets": { "icon": "icon.item.weapon-folding-umbrella", "layer": "avatar.weapon.folding-umbrella" }` · ไอเทมหลายชิ้นชี้ asset เดียวกันได้ (avatar-spec 8.1)
- ตัวเลือกตัวละคร (ทรงผม สีผิว สีผม) ก็เป็น id + variant: `{ "hair": "avatar.hair.bob", "hairVariant": "hair-3", "skinVariant": "skin-5" }` · ชื่อ field สุดท้ายเป็นของ tech-lead ใน API contract ของ profile (ส่งต่อ)
- content ที่ชี้ id ที่ไม่มีใน manifest หรือเป็น `deprecated` โดยไม่มี `replacedBy` → validator ของ content ตก (ส่งต่อ tech-lead)

### 6.5 ตัวอย่าง
```json
{
  "manifestVersion": 1,
  "avatarRig": 1,
  "updated": "2026-09-23",
  "baseDir": "art/assets",
  "assets": [
    {
      "id": "avatar.body.base",
      "kind": "avatar-layer",
      "layer": "body",
      "status": "placeholder",
      "placeholder": true,
      "size": { "width": 128, "height": 160 },
      "sheet": { "frameW": 128, "frameH": 160, "cols": ["front", "side", "back"], "rows": ["body", "arm_w", "arm_p"] },
      "variants": { "axis": "skin", "values": ["skin-1", "skin-2", "skin-3", "skin-4", "skin-5", "skin-6"] },
      "files": [
        { "path": "avatar/body/base-skin-1@1x.png", "format": "png", "scale": 1, "variant": "skin-1", "bytes": 9120, "width": 384, "height": 480, "sha256": null },
        { "path": "avatar/body/base-skin-1@2x.png", "format": "png", "scale": 2, "variant": "skin-1", "bytes": 21870, "width": 768, "height": 960, "sha256": null }
      ],
      "source": { "method": "build-generated", "author": "artist-2d", "task": "P1-F03-T14", "master": "art/src/avatar/body/base.svg", "prompt": null, "tool": { "name": "<rasterizer ที่ tech-lead เลือก>", "version": "<pin>" }, "origin": null, "date": "2026-09-24" },
      "license": { "spdx": "LicenseRef-KeepWalking-Original", "holder": "keep-walking studio", "file": null, "attribution": null, "reservedFontName": null, "modified": false }
    },
    {
      "id": "font.ui.plex-sans-thai-looped-500",
      "kind": "font",
      "status": "approved",
      "placeholder": false,
      "size": null,
      "files": [
        { "path": "font/ui/plex-sans-thai-looped-500.woff2", "format": "woff2", "scale": null, "variant": null, "bytes": 0, "width": null, "height": null, "sha256": "<sha256 ของไฟล์ release>" }
      ],
      "source": { "method": "vendor", "author": "IBM Corp.", "task": "P1-F03-T11", "master": null, "prompt": null, "tool": { "name": "IBM Plex release", "version": "<tag ที่ pin>" }, "origin": "https://github.com/IBM/plex", "date": "<วันที่ดึง>" },
      "license": { "spdx": "OFL-1.1", "holder": "IBM Corp.", "file": "art/assets/font/ui/OFL.txt", "attribution": "IBM Plex Sans Thai Looped, SIL Open Font License 1.1", "reservedFontName": "Plex", "modified": false },
      "review": { "gate": "art/reviews/F03-visual-gate.md", "verdict": "PASS", "date": "<วันที่ gate>" }
    },
    {
      "id": "icon.qc.need-break",
      "kind": "icon-qc",
      "status": "draft",
      "placeholder": false,
      "size": { "width": 24, "height": 24 },
      "files": [
        { "path": "icon/qc/need-break.svg", "format": "svg", "scale": null, "variant": null, "bytes": 1432, "width": 24, "height": 24, "sha256": "<sha256>" }
      ],
      "source": { "method": "agent-svg", "author": "artist-2d", "task": "<task id>", "master": null, "prompt": null, "tool": null, "origin": null, "date": "<วันที่>" },
      "license": { "spdx": "LicenseRef-KeepWalking-Original", "holder": "keep-walking studio", "file": null, "attribution": null, "reservedFontName": null, "modified": false }
    },
    {
      "id": "illus.empty.no-dungeon-nearby",
      "kind": "illus",
      "status": "prompt-only",
      "placeholder": true,
      "size": { "width": 320, "height": 240 },
      "files": [],
      "source": { "method": "prompt-raster", "author": "artist-2d", "task": "<task id>", "master": null, "prompt": { "file": "art/prompts/illus.md", "anchor": "#no-dungeon-nearby" }, "tool": null, "origin": null, "date": "<วันที่>" },
      "license": { "spdx": "LicenseRef-KeepWalking-Original", "holder": "keep-walking studio", "file": null, "attribution": null, "reservedFontName": null, "modified": false }
    }
  ]
}
```
ค่า `bytes` ในตัวอย่างเป็นตัวเลขสมมติ · ใน entry จริงต้องเป็นขนาดไฟล์จริง · การเปลี่ยนชื่อไฟล์ฟอนต์ให้ตรงกฎ 3.2 ไม่ใช่การแก้ฟอนต์ (ชื่อ family ภายในไฟล์ไม่เปลี่ยน) จึงคง `modified: false`

### 6.6 JSON Schema (draft 2020-12)
tech-lead คัดลอกเป็น `art/assets/manifest.schema.json` หรือไว้ใน validator ได้ตรงตัว · ถ้าต้องแก้ ให้แก้ที่เอกสารนี้ก่อน (art-director) แล้วจึงแก้ไฟล์
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "keep-walking/art-manifest/1",
  "type": "object",
  "required": ["manifestVersion", "avatarRig", "updated", "baseDir", "assets"],
  "additionalProperties": false,
  "properties": {
    "manifestVersion": { "const": 1 },
    "avatarRig": { "const": 1 },
    "updated": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "baseDir": { "const": "art/assets" },
    "assets": { "type": "array", "items": { "$ref": "#/$defs/entry" } }
  },
  "$defs": {
    "id": { "type": "string", "pattern": "^(icon|badge|frame|avatar|vfx|ui|illus|font|map|ref)\\.[a-z][a-z0-9]*(-[a-z0-9]+)*\\.[a-z][a-z0-9]*(-[a-z0-9]+)*$" },
    "date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "entry": {
      "type": "object",
      "required": ["id", "kind", "status", "placeholder", "size", "files", "source", "license"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "enum": ["icon-ui", "icon-qc", "icon-item", "badge-class", "frame-rarity", "avatar-layer", "vfx", "ui", "illus", "font", "map-icon", "reference"] },
        "status": { "enum": ["prompt-only", "placeholder", "draft", "approved", "deprecated"] },
        "placeholder": { "type": "boolean" },
        "size": { "oneOf": [ { "type": "null" }, { "type": "object", "required": ["width", "height"], "additionalProperties": false, "properties": { "width": { "type": "integer", "minimum": 1 }, "height": { "type": "integer", "minimum": 1 } } } ] },
        "layer": { "enum": ["body", "face", "hair", "outfit_body", "outfit_feet", "weapon", "accessory_charm", "accessory_head", "accessory_face", "pose_hand", "pose_prop"] },
        "sheet": { "type": "object", "required": ["frameW", "frameH", "cols", "rows"], "additionalProperties": false, "properties": {
          "frameW": { "type": "integer" }, "frameH": { "type": "integer" },
          "cols": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "rows": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "frames": { "type": "integer", "maximum": 12 }, "fps": { "type": "integer" } } },
        "variants": { "type": "object", "required": ["axis", "values"], "additionalProperties": false, "properties": {
          "axis": { "enum": ["skin", "hair"] },
          "values": { "type": "array", "items": { "type": "string", "pattern": "^(skin|hair)-[1-6]$" }, "minItems": 1, "uniqueItems": true } } },
        "files": { "type": "array", "items": { "$ref": "#/$defs/file" } },
        "source": { "$ref": "#/$defs/source" },
        "license": { "$ref": "#/$defs/license" },
        "shipped": { "type": "boolean" },
        "review": { "type": "object", "required": ["gate", "verdict", "date"], "properties": { "gate": { "type": "string" }, "verdict": { "enum": ["PASS", "NEEDS_CHANGES"] }, "date": { "$ref": "#/$defs/date" } } },
        "replacedBy": { "$ref": "#/$defs/id" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "notes": { "type": "string" }
      },
      "allOf": [
        { "if": { "properties": { "kind": { "const": "avatar-layer" } } }, "then": { "required": ["layer"] } },
        { "if": { "properties": { "status": { "enum": ["prompt-only", "placeholder"] } } }, "then": { "properties": { "placeholder": { "const": true } } }, "else": { "properties": { "placeholder": { "const": false } } } },
        { "if": { "properties": { "status": { "not": { "const": "prompt-only" } } } }, "then": { "properties": { "files": { "minItems": 1 } } } },
        { "if": { "properties": { "status": { "const": "approved" } } }, "then": { "required": ["review"], "properties": { "review": { "properties": { "verdict": { "const": "PASS" } } } } } },
        { "if": { "properties": { "status": { "const": "deprecated" } } }, "then": { "required": ["replacedBy"] } }
      ]
    },
    "file": {
      "type": "object",
      "required": ["path", "format", "scale", "variant", "bytes", "width", "height"],
      "additionalProperties": false,
      "properties": {
        "path": { "type": "string", "pattern": "^[a-z0-9@._/-]+$" },
        "format": { "enum": ["svg", "png", "webp", "woff2", "ttf"] },
        "scale": { "enum": [1, 2, null] },
        "variant": { "type": ["string", "null"] },
        "bytes": { "type": "integer", "minimum": 0 },
        "width": { "type": ["integer", "null"] },
        "height": { "type": ["integer", "null"] },
        "sha256": { "type": ["string", "null"], "pattern": "^[0-9a-f]{64}$" }
      }
    },
    "source": {
      "type": "object",
      "required": ["method", "author", "task", "master", "prompt", "tool", "origin", "date"],
      "additionalProperties": false,
      "properties": {
        "method": { "enum": ["agent-svg", "build-generated", "prompt-raster", "agent-svg-from-ref", "vendor", "human-commission"] },
        "author": { "type": "string" }, "task": { "type": "string" },
        "master": { "type": ["string", "null"] },
        "prompt": { "oneOf": [ { "type": "null" }, { "type": "object", "required": ["file", "anchor"], "properties": { "file": { "type": "string" }, "anchor": { "type": "string" } } } ] },
        "tool": { "oneOf": [ { "type": "null" }, { "type": "object", "required": ["name", "version"], "properties": { "name": { "type": "string" }, "version": { "type": "string" } } } ] },
        "origin": { "type": ["string", "null"] },
        "date": { "type": "string" }
      }
    },
    "license": {
      "type": "object",
      "required": ["spdx", "holder", "file", "attribution", "reservedFontName", "modified"],
      "additionalProperties": false,
      "properties": {
        "spdx": { "type": "string" }, "holder": { "type": "string" },
        "file": { "type": ["string", "null"] }, "attribution": { "type": ["string", "null"] },
        "reservedFontName": { "type": ["string", "null"] }, "modified": { "type": "boolean" }
      }
    }
  }
}
```
กติกาที่ JSON Schema ตรวจไม่ได้ อยู่ใน validator (หัวข้อ 8)

## 7. งบขนาดไฟล์

ขนาดหลังปรับ (SVGO หรือ quantize) ก่อน gzip · ตัวเลขนี้แทนงบเสนอใน icon-grammar 8 (ค่าเดิมคงไว้ทุกตัว เพิ่มชนิดที่ขาด)

### 7.1 ต่อไฟล์
| ชนิด | งบต่อไฟล์ | หมายเหตุ |
| --- | --- | --- |
| `icon-ui` 24 / `icon.ui16.*` | ≤ 2 KB / ≤ 1.5 KB | |
| `icon-qc` | ≤ 2 KB | |
| `icon-item` | ≤ 8 KB | |
| `badge-class` | ≤ 3 KB | |
| `frame-rarity` | ≤ 3 KB | |
| `ui` | ≤ 6 KB | |
| `illus` SVG / PNG หรือ WebP | ≤ 20 KB / ≤ 120 KB | raster โหลดแบบ lazy เท่านั้น |
| `map-icon` source SVG | ≤ 4 KB | sprite ที่ build แล้วนับในงบ S6 ของ tech note F02 (style + glyph + sprite + font ≤ 1.0 MB) |
| `vfx` PNG sheet @1x / @2x | ≤ 24 KB / ≤ 64 KB | ต้องได้รับอนุมัติรายชิ้น |
| `font.ui.*` WOFF2 | ≤ 60 KB ต่อน้ำหนัก (2 น้ำหนัก ≤ 120 KB) | ถ้าไฟล์ทางการเกิน ดู 9.3 ทางเลือก |
| `font.map.*` TTF (subset ไทย) | ≤ 60 KB ต่อน้ำหนัก | นับในงบ S6 ของ tech note F02 ด้วย |

sprite sheet ของ avatar (ต่อไฟล์ ต่อ variant)
| layer | ขนาด sheet 1x | @1x | @2x |
| --- | --- | --- | --- |
| `body` | 384 × 480 | ≤ 16 KB | ≤ 40 KB |
| `face` | 384 × 800 | ≤ 10 KB | ≤ 24 KB |
| `hair` | 384 × 320 | ≤ 10 KB | ≤ 28 KB |
| `outfit_body` | 384 × 480 | ≤ 14 KB | ≤ 36 KB |
| `outfit_feet` | 384 × 160 | ≤ 5 KB | ≤ 12 KB |
| `weapon` | 384 × 160 | ≤ 6 KB | ≤ 14 KB |
| `accessory_*` (แต่ละชั้น) | 384 × 160 | ≤ 4 KB | ≤ 10 KB |
| `pose_hand` | 896 × 160 | ≤ 8 KB | ≤ 20 KB |
| `pose_prop` | 256 × 160 | ≤ 4 KB | ≤ 10 KB |

### 7.2 ต่อ avatar และต่อหน้าจอ
| ขอบเขต | งบ | ที่มาของตัวเลข |
| --- | --- | --- |
| avatar 1 ตัวใส่ครบทุก layer (9 sheet) | ≤ 80 KB @1x · ≤ 200 KB @2x | ผลรวมงบ 7.1: 73 KB / 184 KB + เผื่อ ~10% |
| pose kit ต่อสีผิวที่มีในทีม | ≤ 30 KB @2x | `pose_hand` 20 + `pose_prop` 10 · โหลดเมื่อเปิดพาเนล party ครั้งแรก |
| หน้าแรก (แผนที่) cache ว่าง ไม่รวม tile และงบ S6 ของแผนที่ | ≤ 400 KB | ฟอนต์ UI 120 + UI glyph ที่ใช้ ≤ 30 + avatar ตัวเอง 200 + manifest ≤ 30 · avatar โหลดหลังแผนที่แสดงแล้ว |
| พาเนล party | ≤ 200 KB × จำนวนสมาชิกที่ยังไม่อยู่ใน cache | โหลดแบบ lazy · แสดงโครงตั้งต้นระหว่างรอ |
| `manifest.json` | ≤ 60 KB (runtime ≤ 30 KB) | ถ้าเกิน ให้แยก manifest ตาม `root` (ข้อเสนอต่อ tech-lead) |

[ASSUMPTION A-P1-F03-T11-8: งบ PNG ของ avatar ประมาณจากภาพสีแบน 3 ค่า พื้นโปร่งใส ≥ 60% ที่ PNG 8-bit · ต้องวัดจริงกับ placeholder ใน T14 และ art-director ปรับตารางนี้ได้ ±30% โดยไม่ต้องขออนุมัติ ถ้าเกินกว่านั้นแจ้ง tech-lead เพราะกระทบงบหน้าแรก]

## 8. Validator (ตรวจอัตโนมัติ)

เสนอเป็น script `tools/art/validate` + test ใน Vitest ที่รันใน CI (เจ้าของ tech-lead, devops-engineer) · ตก = CI แดง
| # | ตรวจ | ผลตก |
| --- | --- | --- |
| V1 | manifest ผ่าน JSON Schema 6.6 · `id` ไม่ซ้ำ · `assets` เรียงตาม `id` | ตก |
| V2 | path ตรงกฎ 3.2 (ยกเว้น `map.*`, `ref.*`, master ชั่วคราวของ `placeholder`) · ส่วน `<root>/<group>` ตรง id | ตก |
| V3 | ไฟล์มีอยู่จริง · `bytes`, `width`, `height` ตรงไฟล์ · `sha256` ตรงเมื่อมีค่า | ตก |
| V4 | `bytes` ไม่เกินงบ 7.1 · ผลรวมต่อ avatar ไม่เกิน 7.2 (คำนวณจาก variant ที่ใหญ่สุดของแต่ละ layer) | ตก |
| V5 | PNG sheet: ขนาด = `sheet` × จำนวนคอลัมน์/แถว × `scale` · ตรงตาราง avatar-spec 6 · มี alpha | ตก |
| V6 | ทุก `variants.values` มีไฟล์ครบทั้ง `scale` 1 และ 2 (ยกเว้น `placeholder`) | ตก |
| V7 | SVG: viewBox = `size` · ไม่มี element ต้องห้าม (4.1) · ไม่มี `href` ภายนอก · สีทุกค่าอยู่ในรายการ token + ramp · ไม่มี opacity นอกข้อยกเว้น | ตก |
| V8 | key color (avatar-spec 7.4) ไม่อยู่ในไฟล์ใดใน `art/assets/` · อยู่ได้เฉพาะ `art/src/avatar/{body,hair,pose-hand}/` | ตก |
| V9 | `placeholder` สอดคล้องกับ `status` · `approved` มี `review.verdict` = `PASS` | ตก |
| V10 | `license.spdx` อยู่ในรายการอนุญาต (9.1) · ฟอนต์มี `license.file` ที่มีอยู่จริง · `reservedFontName` ไม่เป็น `null` → `modified` = `false` | ตก |
| V11 | ไฟล์ใน `art/assets/` ทุกไฟล์ (ยกเว้น `manifest.json`, `OFL.txt`) ถูกอ้างจาก manifest | ตก |
| V12 | build ซ้ำจาก master ได้ไฟล์ที่ sha256 เท่าเดิม (ตรวจเมื่อมีเครื่องมือ build แล้ว) | เตือนใน Phase 1 · ตกตั้งแต่ Phase 2 |
| V13 | ขนาดรวมหน้าแรก (7.2) จาก build ของ client | เตือน |

## 9. License และที่มาของ asset

### 9.1 รายการ license ที่อนุญาต
| `spdx` | ใช้กับ | เงื่อนไข |
| --- | --- | --- |
| `LicenseRef-KeepWalking-Original` | งานที่ agent หรือคนในโปรเจกต์สร้าง (SVG, PNG ที่ build, ภาพจาก prompt ที่คนรัน) | license จริงของงานภาพในโปรเจกต์ยังไม่ได้เลือก (repo public) เป็นคำถามถึง HUMAN · ระหว่างนี้ใช้ค่านี้เป็นตัวแทน เปลี่ยนทีเดียวได้ทั้งไฟล์ |
| `OFL-1.1` | ฟอนต์ | ตาม 9.3 |
| อื่นๆ (เช่น `CC0-1.0`, `CC-BY-4.0`) | ของบุคคลที่สามที่ฟรี | ต้องให้ art-director อนุมัติเป็นรายชิ้นก่อน และบันทึก `attribution` · ห้าม license ที่ห้ามใช้เชิงพาณิชย์หรือห้ามดัดแปลง (เพราะ sponsored dungeon เป็นรายได้ตาม GDD) |

ห้ามโดยเด็ดขาด: asset pack เสียเงิน (D-001) · ภาพจากเว็บหรือ social ที่ไม่มี license ชัด · ภาพหน้าจอจากเกมอื่น · โลโก้หรือ artwork ของแบรนด์ · รูปถ่ายคนจริง

### 9.2 ภาพจาก prompt (raster)
- คนเป็นผู้รันเครื่องมือ (งาน `HUMAN`) และยืนยันว่าเงื่อนไขการใช้ของเครื่องมือ (แผนฟรี) อนุญาตให้เผยแพร่ภาพใน repo public และใช้ในเกมที่มีรายได้ได้ · ถ้าไม่แน่ใจ ภาพนั้นใช้เป็น `ref.*` (ไม่ส่งถึงผู้เล่น) ได้เท่านั้น
- บันทึก `source.prompt`, `source.tool` (ชื่อและรุ่น), `source.date` ทุกครั้ง · เก็บ prompt ฉบับที่ใช้จริงใน `art/prompts/` (ไม่แก้ย้อนหลัง เพิ่มฉบับใหม่แทน)
- ห้ามใส่รูปถ่ายคนจริง รูปของผู้เล่น หรือ artwork ที่มีลิขสิทธิ์เป็น input (image-to-image) · ห้าม prompt ที่อ้างชื่อศิลปิน ชื่อคน หรือชื่อแบรนด์
- ภาพที่ออกมาเหมือนบุคคลจริงหรือแบรนด์ ตก content gate แม้ไม่ได้ตั้งใจ (avatar-spec 9)

### 9.3 ฟอนต์ (SIL OFL 1.1)
| ข้อ | IBM Plex Sans Thai Looped (`font.ui.*`) | Noto Sans Thai (`font.map.*`) |
| --- | --- | --- |
| Reserved Font Name | มี: `"Plex"` | ไม่มี [ASSUMPTION A-P1-F03-T11-9: ตรวจจาก `OFL.txt` ของ release ที่ pin อีกครั้งตอนดึงไฟล์] |
| subset / แก้ไฟล์ | **ห้าม** ใช้ไฟล์ทางการตามที่ปล่อยมา · ถ้าจำเป็นต้อง subset เพื่อลดขนาด ต้องเปลี่ยนชื่อ family ของไฟล์ที่ได้ (ไม่มีคำว่า Plex) หรือเปลี่ยนไปใช้ Noto Sans Thai Looped แทน (style guide A-P1-F03-T10-2 อนุญาตไว้แล้ว) | subset เหลือ U+0E00–0E7F ได้ (`modified: true`) |
| ข้อความ license | วาง `OFL.txt` ของ release นั้นใน `art/assets/font/ui/` | วาง `OFL.txt` ใน `art/assets/font/map/` และในโฟลเดอร์ `glyphs/_faces/` ที่ publish |
| การขาย | ห้ามขายไฟล์ฟอนต์เดี่ยวๆ (เราไม่ขายอยู่แล้ว) · ใช้ฝังในเว็บและเกมได้ | เหมือนกัน |
| เครดิต | ระบุชื่อฟอนต์และ OFL ในหน้าเครดิต | เหมือนกัน |
| ที่มา | release ทางการของ IBM · pin tag + sha256 | `notofonts/thai` · pin release + sha256 ตาม tech note F02 (`tools/tiles/README.md`) |

### 9.4 ข้อมูลแผนที่
attribution ของ OpenStreetMap และ Protomaps อยู่ใน `source.attribution` ของ style JSON (map-style.md) · หน้าเครดิตแสดงซ้ำพร้อมรายการฟอนต์ (ส่งต่อ uiux-designer: ต้องมีหน้า "เครดิตและสัญญาอนุญาต" ที่อ่านข้อมูลจาก `license.attribution` ใน manifest)

## 10. วงจรสถานะของ asset

| สถานะ | ความหมาย | ใครตั้ง | เงื่อนไขก่อนตั้ง | client ใช้ได้ไหม |
| --- | --- | --- | --- | --- |
| `prompt-only` | มี prompt แต่ยังไม่มีไฟล์ | artist-2d | `source.prompt` ชี้หัวข้อที่มีอยู่จริง | ไม่ (renderer ใช้ fallback) |
| `placeholder` | ไฟล์แทนที่ตำแหน่งและขนาดตรง spec แต่ยังไม่ใช่ภาพจริง | artist-2d | ผ่าน V1–V3, V5, V7–V8 | ใน dev/preview เท่านั้น · production แสดง fallback |
| `draft` | ภาพจริงพร้อมตรวจ | artist-2d, vfx-animator | ผ่าน validator ทุกข้อ · มี `sha256` | dev/preview |
| `approved` | ผ่าน content gate | art-director | `review.verdict` = `PASS` ใน `art/reviews/F<nn>-visual-gate.md` | ทุก environment |
| `deprecated` | เลิกใช้ | art-director | มี `replacedBy` · ไฟล์เก็บไว้ ≥ 1 release เพื่อ cache เก่า | ใช้ `replacedBy` แทนอัตโนมัติ |

fallback เมื่อ asset ใช้ไม่ได้: avatar ข้าม layer (avatar-spec 8.1) · icon ใช้ `icon.ui.help` ขนาดเดียวกันพร้อมข้อความจาก copy key · ห้ามแสดงรูปแตกหรือ alt text ภาษาอังกฤษต่อผู้เล่น

## 11. สมมติฐานและการส่งต่อ

สมมติฐาน
- A-P1-F03-T11-6: วิธีนำ `art/assets/` ไปถึง client (copy ตอน build) เป็นของ tech-lead (ยืนยัน: tech-lead)
- A-P1-F03-T11-7: เครื่องมือ rasterize/quantize เป็น open source ฟรี ข้อเสนอ `@resvg/resvg-js` + quantizer JS · tech-lead เลือกและตัดสิน `allowBuilds` (ยืนยัน: tech-lead)
- A-P1-F03-T11-8: งบ PNG ของ avatar ต้องวัดจริงกับ placeholder (ยืนยัน: artist-2d ใน T14, art-director)
- A-P1-F03-T11-9: Noto Sans Thai ไม่มี Reserved Font Name (ยืนยัน: ผู้ดึงไฟล์ตอน pin, tech-lead)
- A-P1-F03-T11-10: license งานภาพของโปรเจกต์ยังไม่ได้เลือก ใช้ `LicenseRef-KeepWalking-Original` เป็นตัวแทน (ยืนยัน: HUMAN)

การเปลี่ยนเอกสารนี้: art-director แก้ได้ · การเปลี่ยน schema ต้องขึ้น `manifestVersion` และแจ้ง tech-lead, artist-2d, vfx-animator, gameplay-programmer พร้อมกัน
