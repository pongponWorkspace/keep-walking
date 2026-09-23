# Avatar Prompts — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T14 · เจ้าของ: artist-2d · สถานะ: ร่างสำหรับ HUMAN รันภายหลัง (ต้นทุนศูนย์) · วันที่: 2026-09-24
แหล่งอ้างอิง: `art/direction/avatar-spec.md` §12 (prompt ต้นแบบ), §3–§8, §11 (canvas, anchor, palette, กฎวาด) · `art/direction/style-guide.md` §3.4, §6, §10, §11 · `art/direction/asset-pipeline.md` §4.6, §9.2 (สิทธิ์และวิธีบันทึกที่มา)

## วิธีใช้เอกสารนี้ (สำคัญ อ่านก่อนรัน)

- ภาพที่ได้จาก prompt เหล่านี้เป็น **ภาพอ้างอิงเท่านั้น** (concept/turnaround) ไม่ใช่ layer ของเกมโดยตรง เพราะเครื่องมือสร้างภาพจัดตำแหน่งให้ตรง anchor/แถว/คอลัมน์ตาม avatar-spec §6 ไม่ได้ · ของจริงต้องมี artist-2d วาดใหม่เป็น master SVG บน rig เดียวกับไฟล์ placeholder ใน `art/assets/avatar/`
- การรันเครื่องมือสร้างภาพเป็นงานของ **HUMAN** เท่านั้น (ต้องใช้บัญชี ตาม asset-pipeline §4.6) · ก่อนรัน ให้ยืนยันว่าเงื่อนไขการใช้ของเครื่องมือ (แผนฟรี) อนุญาตให้เผยแพร่ภาพใน repo public และใช้ในเกมที่มีรายได้ (D-001, asset-pipeline §9.1–9.2) · ถ้าไม่แน่ใจ เก็บภาพไว้ใน `art/ref/` เท่านั้น (`shipped: false`) ห้ามใช้เป็น `illus.*` ที่ส่งถึงผู้เล่น
- บันทึกทุกครั้งที่รัน: เครื่องมือ + เวอร์ชัน, วันที่, prompt ฉบับที่ใช้จริง (ถ้าแก้ไข ให้เพิ่มฉบับใหม่ต่อท้ายไฟล์นี้ ห้ามแก้ย้อนหลัง) ลงใน `source.tool` และ `source.prompt` ของ manifest entry ที่เกี่ยวข้อง
- ห้ามใช้รูปคนจริงเป็น input (image-to-image) ห้าม prompt ที่อ้างชื่อศิลปิน ชื่อคนจริง หรือชื่อแบรนด์ · ภาพที่ออกมาเหมือนบุคคลจริงหรือแบรนด์ ตก content gate แม้ไม่ได้ตั้งใจ (avatar-spec §9)
- Negative prompt ท้ายเอกสารนี้ (หัวข้อ "Negative prompt ร่วม") ต้องแนบไปกับทุก prompt ด้านล่าง

## Negative prompt ร่วม (แนบท้ายทุก prompt)

```
Negative: realistic person, celebrity likeness, real politician, royal family,
uniform with school or agency logo, license plate text, readable text on clothes,
brand logo, religious clothing or symbol, crown, halo, prayer beads, amulet,
weapon that looks like a real firearm or real knife, blood, tears, crossed-out eyes,
voxel, 3D render, photo background, gradient background, drop shadow, blur, noise texture.
```

## ค่าอ้างอิงร่วม (ใส่แทนใน `<...>` ของทุก prompt)

| ตัวแปร | ค่า |
| --- | --- |
| `<CANVAS>` | 128x160 px ต่อ view ที่ 1x (แสดงผลจริงทำที่ 256x320 หรือย่อ ไม่ใช่ generate ที่ขนาดนี้ตรงๆ — แนะนำ generate ที่ 512x640 ต่อ view แล้วย่อ) |
| `<OUTLINE>` | เส้นรอบนอกหนา สีเข้ม `#1A1A22`, เส้นใน `#333344` บางกว่า |
| `<LIGHT>` | flat 3-tone cel shading, light source from top-left, no gradient |
| `<GROUND>` | dimetric 2:1 isometric ground implied by shading only (ไม่หมุนตัวละคร) |
| `<BG>` | transparent background (หรือ flat green #00FF00 เพื่อ key-out ทีหลังถ้าเครื่องมือไม่รองรับ alpha — เปลี่ยนจาก magenta #FF00FF ตาม F03-visual-gate V-14: magenta ใกล้ key ผิว #FF40FF เกินไป เขียวห่างจากทั้ง key ผิวและ key ผม #40FFFF) |

## #turnaround-template — ต้นแบบตัวละคร (จาก avatar-spec §12)

ใช้เป็นฐานของทุก prompt ด้านล่าง แทนค่าใน `<...>` ตามชิ้นที่ต้องการ

```
Character turnaround sheet of one cute chibi city walker, isometric dimetric style,
three views side by side in one row on a plain <BG>:
front (facing viewer), side (facing right), back (facing away).
Each view fits an equal <CANVAS> cell, feet aligned on the same ground line,
head-to-body ratio 1:1.2, round chunky head about 58px tall relative to the frame,
stubby rounded arms and legs, no fingers except where noted, dot eyes with a small
white highlight top-left, closed content mouth, plain white t-shirt, grey shorts,
grey flip-flops, skin painted in three flat tones <SKIN TOP/LEFT/RIGHT HEX>,
hair in <HAIR NAME> style painted in three flat tones <HAIR TOP/LEFT/RIGHT HEX>.
<LIGHT>. <OUTLINE>. <GROUND>. No ground plane texture, character only.
```

Negative prompt ร่วม: ต่อท้ายด้วยหัวข้อ "Negative prompt ร่วม" ด้านบนเสมอ

## #body-base — โครงตัวตั้งต้น (id `avatar.body.base`)

ใช้ยืนยันสัดส่วนและชุดตั้งต้นก่อนวาด master SVG จริง ไม่ต้องระบุทรงผม (โกร๋นหรือหมวกคลุม)

```
<turnaround-template>, bald or shaved head (no hair layer), wearing only the
default outfit: plain white t-shirt (#FFFFFF/#DDDDEE/#9999AA), grey shorts
(#9999AA/#555566/#333344), grey rubber flip-flops (#EEEEEE/#CCCCCC/#999999).
Render six copies side by side, each with a different skin tone from this list
(top/left/right hex per copy): #FFEADB/#F8D5BE/#DDB093, #F9D8BC/#EDBF9C/#CF9D78,
#EDC09A/#D9A57C/#B8845C, #D39C70/#B98356/#96653E, #B07A50/#93613C/#744A2B,
#8A5A38/#6E4529/#54331D. Neutral body, no gender markers, no facial hair.
```

## #hair-buzz — ทรงผมสั้นเกรียน (id `avatar.hair.buzz`)

```
<turnaround-template>, add a very short buzz-cut hair cap covering only the top of
the head (does not reach the eyebrows, no strands behind the neck), hair painted
in <HAIR TOP/LEFT/RIGHT HEX>. Show six copies, one per hair tone:
#4E4A5E/#37344A/#26243A, #A0704E/#7E5236/#5A3822, #F4D27E/#DDB255/#B58A35,
#D6D6E0/#AEAEBE/#85859A, #F6AECB/#E184AC/#BC5E88, #93BCEB/#6394D0/#4270A8.
```

## #hair-long-straight — ทรงผมยาวตรง (id `avatar.hair.long-straight`)

```
<turnaround-template>, add long straight hair that frames both sides of the face
down to shoulder height in the front view, and flows down the back to waist height
in the back view (drawn as a separate back-hair mass, visible past the shoulders),
hair painted in <HAIR TOP/LEFT/RIGHT HEX>, same six-tone set as #hair-buzz.
```

## #outfit-body-raincoat — เสื้อกันฝนสีสด (id `avatar.outfit-body.raincoat`)

```
<turnaround-template>, character now wears a bright rain jacket with a small hood
resting up near the top of the head (hood does not cover the eyes), jacket hem
reaches mid-thigh, sleeves fully cover both arms to the wrist. Jacket main fabric
in three flat tones #AADDFF/#66AADD/#3377AA, hood and cuff trim in
#FFFFFF/#DDDDEE/#9999AA. No zipper teeth detail, no text, no logo, no brand mark.
```

## #outfit-feet-rain-boots — รองเท้าบูทกันน้ำ (id `avatar.outfit-feet.rain-boots`)

```
<turnaround-template>, character now wears chunky ankle-high rain boots fully
covering the default sandals, boots painted in three flat tones
#FF9944/#EE6622/#BB4411, no laces, no brand marks, rounded toe.
```

## #weapon-folding-umbrella — ร่มพับ (id `avatar.weapon.folding-umbrella`)

```
<turnaround-template>, character holds one closed folding umbrella like a cane in
the hand on the viewer's left in the front view; grip centered in the closed fist.
Umbrella canopy (folded) painted #FF9944/#EE6622/#BB4411 with a thin white stripe,
metal shaft and hook handle painted #CCDDEE/#8899AA/#556677. Umbrella length about
matches the character's leg. No sharp point, rounded ferrule tip.
```

## #accessory-charm-keychain — พวงกุญแจห้อยเอว (id `avatar.accessory-charm.keychain`)

```
<turnaround-template>, a small keychain charm (rounded tag shape, no text, no
brand mascot) hangs from a short metal ring at the character's hip, tag painted
#FFFFFF/#DDDDEE/#9999AA, ring and cord painted #CCDDEE/#8899AA/#556677.
```

## #accessory-head-sun-hat — หมวกกันแดด (id `avatar.accessory-head.sun-hat`)

```
<turnaround-template>, character wears a simple woven sun hat with a modest brim
that does not cover the eyes, hat painted in three flat tones
#DDAA77/#AA7744/#774422, no text, no logo, no royal or religious shape.
```

## #accessory-face-round-glasses — แว่นกันแดดทรงกลม (id `avatar.accessory-face.round-glasses`)

```
<turnaround-template>, character wears small round sunglasses centered on the
eye line, lenses solid dark #333344 with two thin white reflection streaks,
frame outline #1A1A22, temple arms hidden behind the hair/head silhouette.
Glasses visible in front and side views only, omit in back view.
```

## #pose-hand-kit — ชุดมือท่า 7 ท่า (id `avatar.pose-hand.base`)

```
Concept sheet, front view only, seven small vignettes of a stubby rounded hand
and forearm on a plain <BG>, each showing one pose: (1) wave - hand raised beside
the head, palm out; (2) point - arm fully extended sideways, one finger nub
extended; (3) reach - arm forward and slightly up, palm open; (4) thumb - fist at
shoulder height with one thumb nub up; (5) fist - closed fist raised to shoulder
height; (6) clutch - hand pressed flat against the chest; (7) hold - hand open at
belly height, palm up, ready to hold a small prop. Skin painted in
<SKIN TOP/LEFT/RIGHT HEX> (six-tone set as in #body-base). No fingers except
poses 2 and 4. <LIGHT>. <OUTLINE>.
```

## #pose-prop-kit — ของประกอบท่า cup/shield (id `avatar.pose-prop.base`)

```
Concept sheet, two small props on a plain <BG>: (1) a plain drinking cup with a
thick straw, no text, no logo, painted #FFFFFF/#DDDDEE/#9999AA; (2) a small round
plain shield with no emblem, painted #CCDDEE/#8899AA/#556677. Both sized to sit in
an open palm at belly height. <LIGHT>. <OUTLINE>.
```

## บันทึกการรัน (กรอกโดย HUMAN ทุกครั้งที่รันจริง)

| วันที่ | anchor | เครื่องมือ + เวอร์ชัน | ไฟล์ผลลัพธ์ (`art/ref/...`) | หมายเหตุสิทธิ์ |
| --- | --- | --- | --- | --- |
| — | — | — | — | ยังไม่มีการรัน ณ P1-F03-T14 |

