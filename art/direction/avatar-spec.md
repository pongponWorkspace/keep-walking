# Avatar Spec — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T11 · เจ้าของ: art-director · สถานะ: ฉบับเสนอ รอ HUMAN อนุมัติทิศทางภาพพร้อม style guide · วันที่: 2026-09-23
แหล่งอ้างอิง: GDD "Avatar" (2D layered sprite เรนเดอร์แบบ isometric, 3 มุมมอง หน้า ข้าง หลัง, "เพิ่มไอเทมใหม่คือวาดภาพเดียว"), GDD "Quick command", GDD "อุปกรณ์" · `config/balance/equipment.json` (4 ช่อง: `weapon`, `armor`, `charm`, `boots`) · `art/direction/style-guide.md` (หัวข้อ 3.4, 5, 6) · `art/direction/icon-grammar.md` · `art/vfx/specs/motion-direction.md` หัวข้อ 2 และ 5 · `design/ux/components.md` (avatar icon 40 px) · `design/narrative/world.md` หัวข้อ 2 และข้อห้ามชุดประดับ
เอกสารคู่กัน: `art/direction/asset-pipeline.md` (การตั้งชื่อ, format, manifest, งบขนาด) · ผู้ใช้เอกสาร: artist-2d (P1-F03-T14), vfx-animator, uiux-designer, gameplay-programmer

ลำดับอำนาจ: GDD > roadmap > style guide > เอกสารนี้ · ตัวเลขทุกตัวในเอกสารนี้เป็นพิกเซลที่ 1x บน canvas 128 × 160 เว้นแต่ระบุอื่น

## สารบัญ
1. หลักการ: ของใหม่ 1 ชิ้น = 1 แผ่นวาด
2. มุมมอง 3 view และ projection
3. Canvas, scale และขนาดแสดงผล
4. สัดส่วน โซน และ anchor point
5. Layer และลำดับการซ้อน (z-order)
6. Sprite sheet ต่อ layer
7. Palette: สีผิว สีผม ชุดตั้งต้น key color และหน้า
8. การ map อุปกรณ์ 4 ช่องและชุดประดับไป layer
9. ตัวเลือกตัวละครและความเป็นส่วนตัว
10. Pose kit สำหรับ quick command 10 ตัว
11. กฎการวาดต่อ layer
12. ชุด placeholder ขั้นต่ำสำหรับ P1-F03-T14
13. Checklist ตรวจ avatar (content gate)
14. สมมติฐานและการส่งต่อ

## 1. หลักการ: ของใหม่ 1 ชิ้น = 1 แผ่นวาด

GDD เลือก 2D layered เพราะ "เพิ่มไอเทมใหม่คือวาดภาพเดียว" · เอกสารนี้ล็อกสิ่งที่ทำให้คำนั้นเป็นจริง
- **ตัวละครมีโครงเดียว (body base 1 แบบ)** ใน v1 · ทุก outfit, อาวุธ, รองเท้า, ของประดับวาดบนโครงนี้ครั้งเดียวใช้ได้กับผู้เล่นทุกคน · การเพิ่มโครงที่ 2 จะทำให้ของทุกชิ้นต้องวาดเพิ่มเท่าตัว จึงเป็น decision ของ HUMAN ไม่ใช่งานวาด
- **ทุก frame เป็น full canvas ที่จัดตำแหน่งแล้ว** ไม่มีการ trim ไม่มี offset ต่อชิ้น · การประกอบ avatar คือวางทุก layer ที่ (0, 0) ซ้อนกันตามลำดับ z เท่านั้น
- **ของ 1 ชิ้น = 1 sprite sheet** ที่มี 3 view (หน้า ข้าง หลัง) ในแถวเดียว · ถ้าชิ้นนั้นมีส่วนย่อย (เช่น แขนเสื้อ) ส่วนย่อยอยู่ในแถวถัดไปของ sheet เดียวกัน · ของที่ติดตัวจริงต้องมี item icon 64 px อีก 1 ไฟล์ตาม icon-grammar 7.3 ด้วย (รวม = 1 sheet + 1 icon)
- **สีผิวและสีผมไม่วาดซ้ำ** วาด master ครั้งเดียวด้วย key color แล้ว build แทนสีเป็น 6 ระดับ (หัวข้อ 7.4)
- **ไม่มีการ rig ไม่มี animation ต่อเฟรมของตัวละคร** · ท่าทาง quick command ใช้ transform ของทั้งตัว + สลับหน้า + มือท่า (หัวข้อ 10) จึงไม่ต้องวาด outfit ใหม่ต่อท่า
- **ไม่มีการ flip ซ้ายขวาตอน runtime** เพราะแสงต้องมาจากซ้ายบนเสมอ (style guide 6.3) และ GDD ต้องการแค่ 3 view

## 2. มุมมอง 3 view และ projection

| View | id | ตัวละครหันไปทาง | ใช้ที่ (ตาม GDD "Avatar" และ IA) |
| --- | --- | --- | --- |
| หน้า | `front` | หันตรงเข้าหาผู้ชม | หน้า profile, การ์ดในพาเนล party, quick-command emote, avatar icon (ครอปหัว) · view หลักของเกม |
| ข้าง | `side` | หันขวาของจอ (profile ด้านข้าง) | หน้า profile (สลับ view), หน้า confirm เข้า dungeon |
| หลัง | `back` | หันหลังให้ผู้ชม | หน้า profile (สลับ view) · ใช้โชว์ของที่ติดหลัง |

ความเป็น isometric มาจาก 3 อย่าง ไม่ใช่จากการหมุนตัวละครเฉียง
1. **พื้นและเงา** วางบน grid dimetric 2:1 เดียวกับ prop (style guide 6.1) · จุดยืนคือกึ่งกลาง tile 64 × 32 · เงาตกกระทบเป็นวงรีตามกฎ style guide 6.3
2. **แสงเงา 3 หน้าแบบก้อน**: ทุกชิ้นส่วน (หัว ลำตัว แขน ขา ของที่ถือ) วาดเป็นก้อนหนา มีหน้าบน `top` หน้าซ้าย `left` หน้าขวา `right` ตาม ramp · แสงจากซ้ายบนเสมอ ในทุก view (ใน view `back` หน้าซ้ายของภาพยังเป็นด้านสว่าง ไม่กลับตามตัวละคร)
3. **ความหนาของก้อน**: ขอบล่างของหัวและลำตัวมีแถบหน้ามืด (`right`) หนา 4–6 px ให้รู้สึกเป็นก้อนที่มีความลึก แบบ pixel-3D แต่ขอบโค้งเรียบแบบ vector ไม่เป็นขั้นบันได (ไม่ใช่ voxel)

ทิศ "ขวา" ใน view `side` ตายตัว · ถ้าอนาคตต้องการหันซ้าย ต้องวาด view ที่ 4 (ไม่ flip) และเป็น decision ใหม่

## 3. Canvas, scale และขนาดแสดงผล

| รายการ | ค่า |
| --- | --- |
| Frame (1 view ของ 1 layer) ที่ 1x | **128 × 160 px** (กว้าง × สูง) |
| Frame ที่ 2x | 256 × 320 px (ไฟล์ `@2x`) |
| Master SVG | viewBox หน่วยละ 1 px ที่ 1x (ดูหัวข้อ 6 สำหรับขนาด sheet) |
| เส้นรอบนอก | 2 px `ink.900` ที่ 1x (= 4 px ในไฟล์ 2x) ตาม style guide 6.2 |
| เส้นใน | 1 px `ink.700` ที่ 1x |
| Safe area | x 8–120, y 4–154 · นอกจากนี้ห้ามมีพิกเซลทึบ (กันตัดขอบเมื่อครอป) ยกเว้นอาวุธตามหัวข้อ 11 |
| ไฟล์ที่ client โหลด | `devicePixelRatio` ≥ 1.5 → `@2x` · ต่ำกว่า → `@1x` (asset-pipeline หัวข้อ 5) |

ขนาดแสดงผล (CSS px) ที่อนุญาต · ขนาดเล็กกว่าตารางนี้ให้ใช้การครอปหัวแทนตัวเต็ม
| ที่ใช้ | ขนาดแสดง | scale ของ frame | ความหนาเส้นรอบนอกที่เห็น |
| --- | --- | --- | --- |
| หน้า profile | 256 × 320 | 2.0 | 4 px |
| การ์ดรายละเอียด party, หน้า confirm | 128 × 160 | 1.0 | 2 px |
| การ์ดในพาเนล party ระหว่าง run (emote เล่นที่นี่) | **96 × 120 ขั้นต่ำ** | 0.75 | 1.5 px |
| avatar icon ในแถบบน (components.md: วงกลม 40 px) และ list | ครอปหัว `head_crop` 80 × 80 → แสดง 40–48 px | 0.5–0.6 | 1–1.2 px (ยอมรับได้เพราะอยู่ในวงกลมขอบหมึก 2 px ของ UI) |

เหตุผลของขั้นต่ำ 96 px: style guide 5 กำหนดให้ silhouette ของ avatar จำได้ที่ 64 px · ที่ 96 px เส้นรอบนอกยังหนา ≥ 1.5 px จึงไม่หายกลางแดด (style guide S8)

**พื้นหลังของ avatar:** avatar แสดงบนแผ่นรองสว่าง `bg.surface` หรือ `bg.paper` เสมอ รวมถึงโหมดกลางคืน · เหตุผล: เส้นรอบนอก `ink.900` มีค่าเดียวกับ `bg.night` (1.00:1) silhouette จะหายทั้งตัว · บนหน้ากลางคืนให้วาง avatar ในการ์ดหรือวงกลม `bg.surface` ขอบ `ink.900` 2 px (ส่งต่อ uiux-designer)

## 4. สัดส่วน โซน และ anchor point

### 4.1 สัดส่วน (chibi ตาม style guide 5: หัว : ตัว ≈ 1 : 1.2)
ความสูงตัวละครจากบนหัว (ไม่รวมผม) ถึงพื้น = 128 px · หัว 58 px : ตัว 70 px = 1 : 1.21
| โซน (view `front`) | x | y | หมายเหตุ |
| --- | --- | --- | --- |
| หัว (รูปก้อนกลมมน) | 34–94 (60) | 20–78 (58) | ก้อนเดียว ไม่มีคอแยก · แถบหน้ามืดใต้คาง 4 px |
| กล่องตา (eye box) | 44–84 | 50–62 | **ห้ามทุก layer อื่นทับ** ยกเว้น `accessory_face` (แว่น) |
| ปาก | 58–70 | 66–70 | เส้น `ink.700` |
| ลำตัว | 42–86 (44) | 78–120 (42) | สี่เหลี่ยมมุมมน รัศมี 10 |
| ขา + เท้า | 46–82 | 120–148 | ขา 2 ก้อนสั้น เท้าเป็นก้อนไม่มีนิ้ว · พื้นเท้าที่ y = 148 |
| แขน (ข้างละก้อน) | 30–42 และ 86–98 | 84–118 | มือเป็นก้อนกลม ⌀ 12 ไม่มีนิ้ว |
| พื้นที่ผม | 28–100 | 10–84 | หน้าม้าลงได้ถึง y = 50 เท่านั้น (ห้ามทับกล่องตา) |
| พื้นที่หมวก | 24–104 | 4–34 | ฐานหมวกวางที่ anchor `head_top` |

view `side` และ `back` ใช้เส้นแนวนอนเดียวกันทุกเส้น (บนหัว 20, คาง 78, เอว 120, พื้น 148) · ความกว้างลำตัวใน `side` = 32 px (x 48–80)
ห้ามเปลี่ยนเส้นแนวนอนเหล่านี้หลัง T14 เพราะทุก outfit ที่วาดแล้วจะเลื่อนผิดตำแหน่ง · ถ้าจำเป็นต้องเปลี่ยน ให้ art-director ออก version ใหม่ของ spec (`avatarRig: 2` ใน manifest)

### 4.2 Anchor point (พิกัด x, y ที่ 1x ใน frame 128 × 160)
เพราะทุก frame เป็น full canvas ที่จัดตำแหน่งแล้ว anchor จึงเป็น **ข้อตกลงสำหรับคนวาด** (ของต้องวางตรงจุดนี้) และ **ข้อมูลให้ code** (จุดหมุนของ transform, ตำแหน่ง bubble, การครอป) · ไม่ใช่ offset ที่ code ใช้ขยับ layer
| Anchor | `front` | `side` | `back` | ใช้โดย |
| --- | --- | --- | --- | --- |
| `root` | 64, 148 | 64, 148 | 64, 148 | จุดยืนบน tile · จุดศูนย์กลางเงา · จุดหมุนของ transform ทั้งตัว (เอน ย่อ) |
| `head_center` | 64, 49 | 66, 49 | 64, 49 | จุดหมุนของหัวเวลาเอียง |
| `head_top` | 64, 20 | 64, 20 | 64, 20 | ขอบล่างกึ่งกลางของหมวก (`accessory_head`) |
| `eye_line` | 64, 56 | 78, 56 | — | กึ่งกลางแว่น (`accessory_face`) · `back` ไม่มี |
| `neck` | 64, 80 | 64, 80 | 64, 80 | ขอบคอเสื้อของ `outfit_body` |
| `shoulder_w` | 42, 86 | 70, 86 | 86, 86 | จุดหมุนแขนถืออาวุธ (`arm_w`) |
| `hand_w` | 36, 112 | 80, 112 | 92, 112 | จุดกำด้ามอาวุธ (`weapon` grip) |
| `shoulder_p` | 86, 86 | 58, 86 | 42, 86 | จุดหมุนแขนว่าง (`arm_p`) · pose หมุนรอบจุดนี้ |
| `hand_p` | 92, 112 | 52, 110 | 36, 112 | ตำแหน่งมือท่าและของในมือ (`pose_hand`, `pose_prop`) |
| `hip_charm` | 78, 120 | 60, 120 | 50, 120 | จุดแขวนเครื่องราง (`accessory_charm`) |
| `foot_l` / `foot_r` | 54, 146 / 74, 146 | 58, 146 / 70, 146 | 54, 146 / 74, 146 | กึ่งกลางพื้นรองเท้า (`outfit_feet`) |
| `emote` | 64, 4 | 64, 4 | — | ปลายหางของ bubble quick command (bubble อยู่นอก frame เหนือหัว ต้องมีที่ว่างเหนือ frame ≥ 40 px ใน layout) |

พื้นที่พิเศษ
| ชื่อ | ค่า | ใช้โดย |
| --- | --- | --- |
| `head_crop` | สี่เหลี่ยม x 24–104, y 4–84 (80 × 80) ของ view `front` | avatar icon 40–48 px และ list · code ครอปจากภาพที่ประกอบแล้ว ไม่มีไฟล์หัวแยก |
| `shadow` | วงรีกึ่งกลาง `root` กว้าง 56 สูง 22 · `ink.900` ความทึบ 20% | code วาดเอง (style guide 6.3) ไม่อยู่ในไฟล์ layer ใด |

## 5. Layer และลำดับการซ้อน (z-order)

### 5.1 กลุ่ม layer (ลำดับตาม brief: body, hair, outfit, weapon, accessories)
| กลุ่ม | layer (id ใน manifest) | มาจาก | บังคับมีไหม |
| --- | --- | --- | --- |
| body | `body` (หัว ลำตัว ขา ชุดตั้งต้น) · `arm_w` · `arm_p` · `face` | ตัวเลือกตัวละคร (สีผิว) + การแสดงสีหน้า | มีเสมอ |
| hair | `hair` (ด้านหน้า) · `hair_back` (ส่วนที่อยู่หลังตัว) | ตัวเลือกตัวละคร (ทรง + สี) | มีเสมอ (ทรง "สั้นเกรียน" นับเป็นทรงหนึ่ง) |
| outfit | `outfit_feet` (รองเท้า) · `outfit_body` (เกราะ ชุด) + แขนเสื้อ `sleeve_w`, `sleeve_p` | ช่อง `boots`, `armor` หรือชุดประดับ | ไม่บังคับ (ว่าง = เห็นชุดตั้งต้นใน `body`) |
| weapon | `weapon` | ช่อง `weapon` | ไม่บังคับ (ว่าง = มือเปล่า) |
| accessories | `accessory_charm` · `accessory_head` · `accessory_face` | ช่อง `charm` และชุดประดับ | ไม่บังคับ |
| pose (ชั่วคราว) | `pose_hand` · `pose_prop` | quick command (หัวข้อ 10) | เฉพาะตอน emote |

ลำดับกลุ่มจากหลังไปหน้าคือ body → hair → outfit → weapon → accessories ตาม brief · มีข้อยกเว้นที่ตั้งใจ 3 ข้อ (5.3) เพื่อให้มือกำอาวุธได้และผมยาวอยู่หลังตัว

### 5.2 ตาราง z ต่อ view (เลขน้อยอยู่หลัง · code ใช้ตารางนี้ตรงตัว ควรเก็บเป็นค่าคงที่ของ renderer ชุดเดียวกับ `avatarRig: 1`)
| z | `front` | `side` | `back` |
| --- | --- | --- | --- |
| 0 | เงา (code วาด) | เงา | เงา |
| 10 | `hair_back` | `hair_back` | — |
| 12 | — | — | `weapon` |
| 15 | — | `arm_p` (แขนไกล หลังตัว) | — |
| 16 | — | `sleeve_p` | — |
| 20 | `body` | `body` | `body` |
| 22 | `face` | `face` | — (ไม่มีหน้า) |
| 30 | `hair` | `hair` | `hair` |
| 40 | `outfit_feet` | `outfit_feet` | `outfit_feet` |
| 45 | `outfit_body` | `outfit_body` | `outfit_body` |
| 47 | — | — | `hair_back` (ผมยาวทับหลังเสื้อ) |
| 48 | `weapon` | `weapon` | — |
| 50 | `arm_w` | `arm_w` | `arm_w` |
| 51 | `sleeve_w` | `sleeve_w` | `sleeve_w` |
| 52 | `arm_p` | — | `arm_p` |
| 53 | `sleeve_p` | — | `sleeve_p` |
| 60 | `accessory_charm` | `accessory_charm` | `accessory_charm` |
| 70 | `accessory_head` | `accessory_head` | `accessory_head` |
| 72 | `accessory_face` | `accessory_face` | `accessory_face` (มักว่าง) |
| 80 | `pose_hand` (แทน `arm_p` + `sleeve_p`) | — | — |
| 82 | `pose_prop` | — | — |

### 5.3 ข้อยกเว้นจากลำดับกลุ่ม (ตั้งใจ)
| # | ข้อยกเว้น | เหตุผล | ผลต่อคนวาด |
| --- | --- | --- | --- |
| E1 | แขน `arm_w`, `arm_p` (กลุ่ม body) อยู่ **เหนือ** outfit และ weapon | มือก้อนกลมต้องทับด้ามอาวุธจึงดูเหมือนกำอยู่ และ pose ต้องซ่อน/หมุนแขนได้โดยไม่กระทบเสื้อ | `outfit_body` ห้ามวาดทับบริเวณแขน · แขนเสื้อวาดในแถว `sleeve_w`/`sleeve_p` ของ sheet outfit แยก ซึ่งซ้อนเหนือแขน |
| E2 | `hair_back` อยู่หลัง `body` ใน `front`/`side` แต่อยู่เหนือ `outfit_body` ใน `back` | ผมยาวอยู่หลังคอเมื่อมองจากหน้า แต่ทับหลังเสื้อเมื่อมองจากหลัง | ทรงผมยาววาดแถว `hair_back` ทั้ง 3 view · ทรงสั้นปล่อยแถวนี้ว่าง |
| E3 | `weapon` อยู่หลัง `body` ใน `back` | ตัวบังของที่ถืออยู่ด้านหน้า | view `back` ของอาวุธวาดเฉพาะส่วนที่โผล่พ้นตัว (ส่วนที่ถูกบังจะไม่เห็นอยู่แล้ว วาดเต็มก็ได้) |

`face` (z 22) อยู่ใต้ `hair` (z 30) เพื่อให้หน้าม้าทับหน้าผากได้ · กติกากล่องตา (4.1) กันไม่ให้ผมบังตา

## 6. Sprite sheet ต่อ layer

กติกาทั่วไป
- frame 128 × 160 ที่ 1x · ระหว่าง frame ไม่มีช่องว่าง (padding 0) · พิกัด frame = (คอลัมน์ × 128, แถว × 160)
- **คอลัมน์คือ view เสมอ: 0 = `front`, 1 = `side`, 2 = `back`** (ยกเว้น sheet ของ pose ซึ่งมีแค่ `front`)
- แถวคือส่วนย่อยตามตารางด้านล่าง · แถวที่ไม่ใช้ให้เป็นพื้นโปร่งใสทั้ง frame แต่ต้องคงไว้ เพื่อให้ขนาด sheet ของ layer ชนิดเดียวกันเท่ากันเสมอ
- master SVG มี viewBox เท่ากับ sheet ที่ 1x และวาง frame ตามตำแหน่งเดียวกัน (`<g id="<ชื่อไฟล์>-r<แถว>-c<คอลัมน์>">`) · build แปลงทั้งแผ่นเป็น PNG ทีเดียว (asset-pipeline หัวข้อ 4)

| layer | แถว (บน → ล่าง) | คอลัมน์ | ขนาด sheet 1x | variant ที่ build สร้าง |
| --- | --- | --- | --- | --- |
| `body` | 0 `body` · 1 `arm_w` · 2 `arm_p` | front, side, back | 384 × 480 | สีผิว 6 (`skin-1` … `skin-6`) |
| `face` | 0 `neutral` · 1 `smile` · 2 `wince` · 3 `dizzy` · 4 `content` | front, side (คอลัมน์ back ว่าง) | 384 × 800 | ไม่มี (สีหน้าไม่ขึ้นกับสีผิว) |
| `hair` | 0 `hair` · 1 `hair_back` | front, side, back | 384 × 320 | สีผม 6 (`hair-1` … `hair-6`) |
| `outfit_body` | 0 `outfit_body` · 1 `sleeve_w` · 2 `sleeve_p` | front, side, back | 384 × 480 | ไม่มี (สีชุดวาดตายตัว) |
| `outfit_feet` | 0 | front, side, back | 384 × 160 | ไม่มี |
| `weapon` | 0 | front, side, back | 384 × 160 | ไม่มี |
| `accessory_charm`, `accessory_head`, `accessory_face` | 0 | front, side, back | 384 × 160 | ไม่มี |
| `pose_hand` | 0 | 7 ท่า: `wave`, `point`, `reach`, `thumb`, `fist`, `clutch`, `hold` (view `front` เท่านั้น) | 896 × 160 | สีผิว 6 |
| `pose_prop` | 0 | 2 ของ: `cup`, `shield` (view `front` เท่านั้น) | 256 × 160 | ไม่มี |

ไฟล์ 2x มีขนาดเป็น 2 เท่าทุกค่า (เช่น `body` 768 × 960)

## 7. Palette: สีผิว สีผม ชุดตั้งต้น key color และหน้า

หลักเดียวกับ style guide 3.4: วัสดุละ 3 ค่า (`top`, `left`, `right`) + ขอบ `ink.900` · ไม่มี gradient · ramp ใหม่ในหัวข้อนี้เป็น token เพิ่มเติมของ style guide (ชื่อ `ramp.skin-<n>`, `ramp.hair-<n>`) · ไม่มีสีผิวใดผูกกับ class ความเก่ง หรือราคา (style guide 3.4)

### 7.1 สีผิว 6 ระดับ
| Token | top | left | right | หมายเหตุ |
| --- | --- | --- | --- | --- |
| `ramp.skin-1` | #FFEADB | #F8D5BE | #DDB093 | อ่อนสุด |
| `ramp.skin-2` | #F9D8BC | #EDBF9C | #CF9D78 | |
| `ramp.skin-3` | #EDC09A | #D9A57C | #B8845C | |
| `ramp.skin-4` | #D39C70 | #B98356 | #96653E | |
| `ramp.skin-5` | #B07A50 | #93613C | #744A2B | |
| `ramp.skin-6` | #8A5A38 | #6E4529 | #54331D | เข้มสุด |

ตัวเลือกสีผิวในหน้าสร้างตัวละครเรียงเป็นแถวเท่ากันทั้ง 6 ไม่มีค่าเริ่มต้นที่ "ถูกต้อง" · ค่าเริ่มต้นสุ่มเท่ากันทุกระดับ [ASSUMPTION A-P1-F03-T11-1]

### 7.2 สีผม 6 แบบ
| Token | top | left | right | ชื่อเล่น (ห้ามใช้เป็น id) |
| --- | --- | --- | --- | --- |
| `ramp.hair-1` | #4E4A5E | #37344A | #26243A | ดำ |
| `ramp.hair-2` | #A0704E | #7E5236 | #5A3822 | น้ำตาล |
| `ramp.hair-3` | #F4D27E | #DDB255 | #B58A35 | ทองย้อม |
| `ramp.hair-4` | #D6D6E0 | #AEAEBE | #85859A | เทาเงิน |
| `ramp.hair-5` | #F6AECB | #E184AC | #BC5E88 | ชมพูย้อม |
| `ramp.hair-6` | #93BCEB | #6394D0 | #4270A8 | ฟ้าย้อม |

สีผมไม่ใช้ hex เดียวกับ `rift.*`, `rarity.*`, `class.*` เพื่อไม่ให้อ่านเป็นความหมายของระบบ

### 7.3 ชุดตั้งต้น (อยู่ในแถว `body` ของ sheet `body` เห็นเมื่อช่องว่าง)
| ส่วน | Ramp | เหตุผล |
| --- | --- | --- |
| เสื้อยืดเรียบ ไม่มีลาย ไม่มีตัวอักษร | `ramp.plastic` (#FFFFFF / #DDDDEE / #9999AA) | เป็นกลาง ของใส่ทับเด่นกว่าเสมอ |
| กางเกงขาสั้น | `ramp.asphalt` (#9999AA / #555566 / #333344) | |
| รองเท้าแตะก้อน | `ramp.concrete` (#EEEEEE / #CCCCCC / #999999) | มุกคนกรุงเทพเดินรองเท้าแตะ · ถูกทับเมื่อมี `outfit_feet` |

ผู้เล่นไม่เคยแสดงเป็นชุดชั้นในหรือไม่มีเสื้อ · ชุดตั้งต้นวาดในแถว `body` ตรงๆ (ไม่ใช่ layer outfit) จึงไม่มีสถานะ "ว่างเปล่า"

### 7.4 Key color (สำหรับ master ที่ build แทนสี)
master SVG ของ `body`, `pose_hand` วาดส่วนผิวด้วย key ผิว · master ของ `hair` วาดด้วย key ผม · build แทน key ด้วย ramp ของแต่ละ variant แบบตรงตัวใน attribute `fill`/`stroke` ก่อน rasterize (ไม่ใช่แทนบน pixel จึงไม่มีปัญหาขอบ antialias)
| Key | Hex | แทนด้วย |
| --- | --- | --- |
| `key.skin.top` | #FF40FF | `ramp.skin-<n>` top |
| `key.skin.left` | #C020C0 | `ramp.skin-<n>` left |
| `key.skin.right` | #800080 | `ramp.skin-<n>` right |
| `key.hair.top` | #40FFFF | `ramp.hair-<n>` top |
| `key.hair.left` | #20C0C0 | `ramp.hair-<n>` left |
| `key.hair.right` | #008080 | `ramp.hair-<n>` right |

key hex ทั้ง 6 **ห้ามปรากฏในไฟล์ PNG ที่ส่งออก** และห้ามใช้ใน SVG อื่นนอก master ของ 3 layer นี้ (validator ตรวจ, asset-pipeline หัวข้อ 8)

### 7.5 หน้า (layer `face`)
- ตา: วงรีทึบ `ink.900` ขนาด 6 × 8 · **ต้องมีจุดไฮไลต์ `bg.surface` 3 × 3 ที่มุมซ้ายบนของตาทุกข้าง** · เหตุผลจากการคำนวณ: `ink.900` บน `skin-1` top = 14.86:1 แต่บน `skin-6` left = 2.10:1 (ต่ำกว่า 3.0) · จุดไฮไลต์ขาวบน `skin-6` left = 8.25:1 ทำให้ตาอ่านออกทุกสีผิว
- ปาก: เส้น `ink.900` 2 px (สีหน้าคือข้อมูลของ emote จึงใช้เส้นที่มีความหมาย ไม่ใช่เส้นใน 1 px)
- ไม่มีจมูก ไม่มีคิ้วในสีหน้าปกติ · ไม่มีแก้มสีชมพู (กันสับสนกับ `rift.300`)

| สีหน้า | ตา | ปาก | ใช้กับ |
| --- | --- | --- | --- |
| `neutral` | วงรีทึบ + ไฮไลต์ | ขีดสั้นตรง 8 px | ค่าเริ่มต้น |
| `smile` | วงรีทึบ + ไฮไลต์ | โค้งขึ้น 10 px | arrived, goOn, goodDrop, thanks |
| `wince` | ขีดเฉียง `>` `<` เส้น 2 px | เส้นหยัก 10 px + หยดเหงื่อ `ramp.water` ข้างหัว | needHeal, needCover, onMyWay (แดดร้อน) |
| `dizzy` | วงแหวนเส้น 2 px ไม่เติม | วงรีเล็กเปิด | hpCritical · **ห้ามตากากบาท** (อ่านเป็นตาย ดราม่าเกิน P5) |
| `content` | โค้งคว่ำ `^ ^` เส้น 2 px | โค้งขึ้น | needBreak, retreating |

ห้าม: น้ำตาไหล เลือด ฟัน เขี้ยว ตาแดง (style guide 10 ข้อ 1)

## 8. การ map อุปกรณ์ 4 ช่องและชุดประดับไป layer

ช่องตาม `config/balance/equipment.json` → `slots` (`weapon`, `armor`, `charm`, `boots`)
| ช่อง (config) | ชื่อใน GDD | layer ที่แสดง | anchor | z (`front`/`side`/`back`) | ถ้าช่องว่าง | ชุดประดับทับได้ |
| --- | --- | --- | --- | --- | --- | --- |
| `weapon` | อาวุธ (ATK) | `weapon` | `hand_w` | 48 / 48 / 12 | มือเปล่า (ไม่วาดอะไร) | ไม่ได้ใน v1 |
| `armor` | เกราะ (DEF) | `outfit_body` + `sleeve_w` + `sleeve_p` | `neck` | 45 (+51, 53) | เสื้อยืดตั้งต้นใน `body` | ได้ (ชุดประดับ `outfit_body`) |
| `charm` | เครื่องราง (ผสม) | `accessory_charm` | `hip_charm` | 60 ทุก view | ไม่วาดอะไร | ไม่ได้ใน v1 |
| `boots` | รองเท้า (VIT) | `outfit_feet` | `foot_l`, `foot_r` | 40 ทุก view | รองเท้าแตะตั้งต้นใน `body` | ได้ (ชุดประดับ `outfit_feet`) |

ชุดประดับ (GDD "ชุดเสื้อผ้าประดับ avatar", มีเพดาน) ใช้ layer ได้ 4 ชั้น: `outfit_body`, `outfit_feet`, `accessory_head`, `accessory_face` · ชุดหนึ่งชุดอาจมีหลายชั้น (เช่น เสื้อกันฝน + หมวก) แต่ละชั้นเป็น sheet ของตัวเอง

### 8.1 กติกาเลือกสิ่งที่แสดง (renderer ใช้ตรงตัว)
```
outfit_body  = cosmetic.outfit_body  ?? equipped.armor?.layer  ?? none   // none → เห็นชุดตั้งต้น
outfit_feet  = cosmetic.outfit_feet  ?? equipped.boots?.layer  ?? none
weapon       = equipped.weapon?.layer ?? none
accessory_charm = equipped.charm?.layer ?? none
accessory_head  = cosmetic.accessory_head ?? none
accessory_face  = cosmetic.accessory_face ?? none
sleeve_w, sleeve_p = แถว 1 และ 2 ของ sheet ที่ถูกเลือกเป็น outfit_body
```
- ข้อมูลรูปลักษณ์ (สีผิว ทรงผม สีผม id ชุดประดับ id ของที่ใส่) มาจาก server ใน profile ของผู้เล่น · client แค่ประกอบภาพ · ภาพไม่มีผลกับค่าพลังใดๆ (NN-1)
- avatar **ไม่แสดง** rarity ระดับตีบวก หรือ tier ของอุปกรณ์ (ไม่มีแสงเรือง ไม่มีกรอบ) · rarity อยู่ที่ item icon ตาม icon-grammar 4 · เหตุผล: คุมต้นทุน (ของ 1 ชิ้นไม่ต้องมีหลายเวอร์ชัน) และไม่ให้ระบบตีบวกมีภาพประกายแบบการพนัน (style guide 9.1)
- ไอเทมหลายชิ้นใน config ชี้ไป layer asset เดียวกันได้ (เช่น ร่มพับ tier 1–3 ใช้ภาพเดียว) · ความสัมพันธ์ item → asset อยู่ใน content config ไม่อยู่ใน manifest (asset-pipeline หัวข้อ 6.4)
- ถ้า id ของ layer ไม่พบใน manifest หรือไฟล์โหลดไม่ขึ้น renderer ข้าม layer นั้นแล้วแสดงส่วนที่เหลือ (ตกไปเป็นชุดตั้งต้นเอง) · ห้ามแสดงรูปแตกหรือกล่องว่าง

### 8.2 ของแต่ละช่องควรเป็นอะไร (ทิศทางภาพ รายการจริงเป็นของ content)
| ช่อง | ตัวอย่างที่ใช้ได้ (ของในเมือง ตลกแบบแห้ง) | ห้าม |
| --- | --- | --- |
| `weapon` | ร่มพับ, ไม้ถูพื้น, หนังสติ๊ก, พัดลมพกพา, ไม้แขวนเสื้อ, ดาบโฟมก้อนกลม | ปืนสมจริง มีดสมจริง อาวุธโบราณไทยที่ผูกกับพิธี (icon-grammar 7.3) |
| `armor` | เสื้อกันฝนสีสด, เสื้อกั๊กสะท้อนแสงไม่มีตัวอักษร, เสื้อแจ็กเก็ตมีฮู้ด, เกราะโฟมก้อนกลม | เครื่องแบบจริงทุกชนิด เสื้อวินมีเลขหรือเขต จีวร ชุดนักเรียนที่ระบุโรงเรียนได้ |
| `charm` | พวงกุญแจ, ป้ายห้อยกระเป๋า, ตุ๊กตาห้อย, เข็มกลัด | พระเครื่อง ตะกรุด ยันต์ สายสิญจน์ ลูกประคำ |
| `boots` | รองเท้าผ้าใบ, บูทกันน้ำ, รองเท้าแตะหูคีบ, ถุงคลุมรองเท้ากันฝน | ลายหรือโลโก้ที่ระบุแบรนด์ได้ |
| ชุดประดับ | หมวกกันแดด, หมวกแก๊ป (ไม่มีตัวอักษร), แว่นกันแดด, ชุดนอนลายการ์ตูนทั่วไป | มงกุฎ ชฎา รัศมี หมวกเครื่องแบบ ชุดที่ลอกตัวละครหรือมาสคอตของแบรนด์จริง |

## 9. ตัวเลือกตัวละครและความเป็นส่วนตัว

NN-7 (PDPA) และ world หัวข้อ 2 ("ไม่มีใครพิเศษ"): avatar คือหุ่นที่ผู้เล่นประกอบจากชุดตัวเลือกเท่านั้น
| ตัวเลือก | จำนวนใน v1 | ที่มา |
| --- | --- | --- |
| สีผิว | 6 (`skin-1` … `skin-6`) | หัวข้อ 7.1 |
| ทรงผม | 6 ทรงตั้งต้น: `buzz` (สั้นเกรียน), `bob`, `bun` (มวยกลางหัว), `ponytail`, `messy` (ยุ่ง), `long-straight` (ยาวตรง) | master 1 ไฟล์ต่อทรง × build 6 สี = 36 แบบจาก 6 แผ่นวาด |
| สีผม | 6 (`hair-1` … `hair-6`) | หัวข้อ 7.2 |
| โครงตัว | 1 (เป็นกลาง ไม่ระบุเพศ) | หัวข้อ 1 · ไม่มีช่องเพศในการสร้างตัว |

กติกาความเป็นส่วนตัวที่ภาพต้องรองรับ
- ไม่มีการอัปโหลดรูป ไม่มีการสร้าง avatar จากกล้องหรือใบหน้าจริง ไม่มีช่องข้อความอิสระบนตัว avatar (เสื้อไม่มีตัวอักษร)
- ห้ามออกแบบทรงผม ชุด หรือหน้าให้เหมือนบุคคลจริงที่จำได้ (ดารา นักการเมือง ราชวงศ์ อินฟลูเอนเซอร์) หรือมาสคอตของแบรนด์ · ชื่อไฟล์และ id ใช้คำนามทั่วไป ห้ามใช้ชื่อคน
- avatar ของผู้เล่นอื่นแสดงได้ในพาเนล party การ์ด profile และหน้าที่แสดงจำนวนและ role ระดับ dungeon เท่านั้น · **ไม่วาง avatar บนแผนที่ในตำแหน่งของผู้เล่นอื่น** (NN-4) · บนแผนที่มีแค่ตำแหน่งของตัวเอง (map-style.md)
- หน้า profile แสดง avatar + ชื่อที่ระบบสร้าง + badge ไม่มีข้อมูลตัวตนจริง (ตาม IA และ P1-F03-T16)

## 10. Pose kit สำหรับ quick command 10 ตัว

ที่มา: `motion-direction.md` หัวข้อ 5 (ท่าโพสที่ต้องมี, ระยะเวลา, เล่นบนการ์ด party ไม่ใช่บนแผนที่) · หัวข้อ 2 (WAAPI, compositor-only, cancel เมื่อ hidden, reduced motion)
หลัก: **ท่า = transform ของทั้งตัว + สลับ `face` + สลับแขนว่างเป็น `pose_hand` (+ `pose_prop`)** · ไม่วาดตัวละครใหม่ต่อท่า outfit ทุกชิ้นใช้ได้กับทุกท่าทันที · emote เล่นเฉพาะ view `front`
- ภาพที่ประกอบแล้ว (ทุก layer ยกเว้นแขนว่าง) เป็นก้อนเดียวที่ transform รอบ `root`
- `arm_p` + `sleeve_p` หมุนรอบ `shoulder_p` ได้ (ท่าแกว่งแขน) โดยใช้ transform เดียวกันทั้งคู่
- เมื่อใช้ `pose_hand` ให้ซ่อน `arm_p` และ `sleeve_p` · มือท่าเป็นแขนเปล่าไม่มีแขนเสื้อ (ยอมรับได้เพราะเห็นไม่เกิน 900 ms) · มือท่าหมุนรอบ `shoulder_p` ได้
- จบ emote กลับเป็น `neutral` + แขนปกติทันที · ไม่ loop

| คำสั่ง (copy key) | glyph (icon-grammar 7.2) | transform ทั้งตัว (รอบ `root`) | แขนว่าง | `face` | `pose_prop` | เวลา (motion 5) |
| --- | --- | --- | --- | --- | --- | --- |
| `qc.arrived` | มือโบก | เอนหน้า rotate 4° แล้วคืน | `pose_hand` `wave` หมุน ±15° รอบ `shoulder_p` 2 รอบ | `smile` | — | 700 ms |
| `qc.onMyWay` | รอยเท้า + นาฬิกา | เอนหน้า 6° + ขยับขึ้นลง translateY −3 px 2 จังหวะ | `arm_p` แกว่ง ±20° | `wince` | — | 900 ms |
| `qc.goOn` | ลูกศรขวา | translateX +4 px หยุดกะทันหัน | `pose_hand` `point` (ชี้ไปขวา) | `smile` | — | 400 ms |
| `qc.needHeal` | หยด HP + ลูกศรขึ้น | เอนหน้า 3° | `pose_hand` `reach` (ยื่นมือหงาย) | `wince` | — | 800 ms |
| `qc.hpCritical` | หยดครึ่ง + ! | เซ rotate ±5° 3 ครั้งแล้วหยุด (ไม่ล้ม) | `pose_hand` `clutch` (มือกุมอก) | `dizzy` | — | 600 ms |
| `qc.needCover` | โล่ outline | ย่อตัว scaleY 0.92 | `pose_hand` `hold` | `wince` | `shield` (โล่ก้อนกลม ไม่มีลาย วางหน้า `hand_p`) | 500 ms |
| `qc.needBreak` | แก้วมีหลอด | เอนหลัง rotate −6° + scaleY 0.96 (ท่าพิงสบาย) | `pose_hand` `hold` | `content` | `cup` (แก้วทั่วไป หลอดใหญ่ ไม่มีตัวอักษร) | 900 ms |
| `qc.retreating` | ประตู + ลูกศรออก | translateX −6 px แล้วคืน (ก้าวถอย) | `arm_p` แกว่ง ±12° 1 รอบ | `content` | — | 700 ms |
| `qc.goodDrop` | กล่องเปิด + 3 เส้น | เด้ง translateY −6 px 1 ครั้ง | `pose_hand` `fist` (กำปั้นชูระดับไหล่ ไม่ชูสุดแขน) | `smile` | — | 500 ms |
| `qc.thanks` | นิ้วโป้ง | scale 1 → 1.04 → 1 | `pose_hand` `thumb` | `smile` | — | 350 ms |

ข้อกำหนดของภาพในชุด pose
- `pose_hand` 7 ท่าวาดในตำแหน่งจริงบน frame 128 × 160 ของ view `front` เริ่มที่ `shoulder_p` (86, 86) · ทุกท่าอยู่ใน safe area (x ≤ 120) · `wave` มือยกถึง y ≈ 56 ข้างหัว · `point` แขนเหยียดแนวนอนถึง x ≈ 118 · `thumb` และ `fist` มืออยู่ระดับไหล่ (y ≈ 84) · `clutch` มือพาดอกที่ (70, 100) · `hold` มืออยู่หน้าท้องที่ (84, 108) รับ `pose_prop`
- มือท่าวาดด้วย key ผิว (7.4) จึงได้ 6 สีผิวจาก master เดียว · ไม่มีนิ้ว ยกเว้น `thumb` (นิ้วโป้ง 1 ก้อน) และ `point` (นิ้วชี้ 1 ก้อน) · ความหนาทุกส่วน ≥ 4 px ที่ 1x
- ห้ามท่ามือพนม ไหว้ ท่านั่งสมาธิ ท่าชี้นิ้วกลาง และท่ามือที่มีความหมายทางการเมือง (เช่น ชูสามนิ้ว) · `thanks` ใช้นิ้วโป้งตาม icon-grammar 7.2
- glyph ของคำสั่ง (icon-grammar 7.2) แสดงใน bubble ที่ anchor `emote` คู่กับท่า · ท่าเป็นช่องทางเสริม glyph + ข้อความ copy key คือข้อมูลหลัก (motion 1 ข้อ 2)

Reduced motion (`prefers-reduced-motion: reduce`, motion 2): ตัด transform ทั้งหมด · แสดงสถานะท้ายท่าแบบนิ่ง (`face` + `pose_hand` + `pose_prop` + bubble glyph) ด้วย opacity cross-fade ≤ 150 ms ค้างเท่าระยะเวลาในตาราง แล้ว cross-fade กลับ · ข้อมูลครบเท่าเดิมเพราะ glyph และข้อความไม่ขึ้นกับ motion

## 11. กฎการวาดต่อ layer

กฎร่วมทุก layer: เส้นรอบนอก `ink.900` 2 px ปิดรอบ · 3 ค่าต่อวัสดุจาก ramp ใน token เท่านั้น · แสงจากซ้ายบน · ไฮไลต์ `bg.surface` 1 จุดต่อชิ้น ≤ 10% ของหน้าบน · ไม่มี gradient, blur, texture, ความโปร่งใส, เงาตกกระทบภายใน layer (เงาพื้น code วาด) · ไม่มีตัวอักษร โลโก้ ตัวเลข · ส่วนที่บางที่สุด ≥ 2 px
| layer | พื้นที่ที่วาดได้ (view `front`, 1x) | ห้ามทับ | หมายเหตุ |
| --- | --- | --- | --- |
| `body` | หัว ลำตัว ขา ตามตาราง 4.1 | — | ไม่มีแขนในแถวนี้ · ส่วนผิวใช้ key ผิว · ชุดตั้งต้นตาม 7.3 |
| `arm_w`, `arm_p` | กล่องแขน x 30–42 / 86–98, y 84–118 | — | ปลายไหล่มนเข้ากับลำตัว · มือ ⌀ 12 ที่ `hand_w` / `hand_p` |
| `face` | กล่องตา + ปาก | — | view `side` ตา 1 ข้างที่ x ≈ 78 |
| `hair`, `hair_back` | x 28–100, y 10–84 · `hair_back` ลงได้ถึง y 110 | กล่องตา | ไม่ทับแขน · ส่วนผมใช้ key ผม |
| `outfit_body` | x 38–90, y 76–140 (ฮู้ดขึ้นได้ถึง y 14) | กล่องตา, กล่องแขน | ฮู้ดทับผมได้ · ชายเสื้อยาวทับขาได้ถึง y 140 |
| `sleeve_w`, `sleeve_p` | ทับกล่องแขนพอดี ไม่เกินขอบแขน | มือ | ต้องตรงรูปแขนใน `body` เพราะหมุนพร้อม `arm_p` |
| `outfit_feet` | รอบ `foot_l`/`foot_r` y 132–156 | — | ครอบรองเท้าแตะตั้งต้นให้มิด (กว้าง ≥ เท้าเดิม + 2 px) |
| `weapon` | x 0–64, y 24–156 (`side`: x 64–128 · `back`: x 64–128) · ยาวไม่เกิน 110 px | กล่องตา | ด้ามกึ่งกลางที่ `hand_w` · อนุญาตออกนอก safe area ถึงขอบ frame |
| `accessory_charm` | กล่อง 16 × 20 ห้อยจาก `hip_charm` | — | เชือกหนา 2 px |
| `accessory_head` | พื้นที่หมวก x 24–104, y 4–34 · ปีกหมวกลงได้ถึง y 44 | กล่องตา | กึ่งกลางฐานที่ `head_top` · ทับผมได้ |
| `accessory_face` | กว้าง ≤ 44 กึ่งกลาง `eye_line` | — | เลนส์ใสไม่เติมสี หรือเลนส์ทึบ `ink.700` มีแถบสะท้อน `bg.surface` 2 เส้น (แว่นกันแดดได้ สีหน้าของ emote ยังอ่านจากปากและท่า) |
| `pose_hand`, `pose_prop` | ตามหัวข้อ 10 | กล่องตา | view `front` เท่านั้น |

## 12. ชุด placeholder ขั้นต่ำสำหรับ P1-F03-T14

เป้าหมาย: พิสูจน์ว่า rig นี้ประกอบได้จริงทุก layer ทุก view ก่อนวาดของจริง · placeholder วาดเป็น SVG ตามกฎหัวข้อ 11 แบบลดรายละเอียด (รูปทรงก้อน + 3 ค่า + ขอบหมึก) ไม่ต้องสวย แต่ **ตำแหน่ง ขนาด แถว คอลัมน์ ต้องตรง spec 100%** · id และ path ตาม asset-pipeline หัวข้อ 2–3 · manifest `status: "placeholder"`
| id | layer | ทดสอบอะไร |
| --- | --- | --- |
| `avatar.body.base` | `body` (+ `arm_w`, `arm_p`) | key ผิว → 6 variant · เส้นแนวนอนของ rig · ชุดตั้งต้น |
| `avatar.face.base` | `face` | สีหน้า 5 แบบ · จุดไฮไลต์ตาบน `skin-6` |
| `avatar.hair.buzz` | `hair` | ทรงสั้น แถว `hair_back` ว่าง · key ผม → 6 variant |
| `avatar.hair.long-straight` | `hair` | แถว `hair_back` ครบ 3 view · ข้อยกเว้น E2 |
| `avatar.outfit-body.raincoat` | `outfit_body` | แขนเสื้อ `sleeve_w`/`sleeve_p` · ฮู้ด · ชายเสื้อทับขา |
| `avatar.outfit-feet.rain-boots` | `outfit_feet` | ครอบรองเท้าแตะตั้งต้นมิด |
| `avatar.weapon.folding-umbrella` | `weapon` | มือกำด้าม (E1) · view `back` อยู่หลังตัว (E3) |
| `avatar.accessory-charm.keychain` | `accessory_charm` | จุดแขวน `hip_charm` ทั้ง 3 view |
| `avatar.accessory-head.sun-hat` | `accessory_head` | ปีกหมวกไม่ทับกล่องตา |
| `avatar.accessory-face.round-glasses` | `accessory_face` | ตรง `eye_line` · view `back` ว่าง |
| `avatar.pose-hand.base` | `pose_hand` | 7 ท่า · key ผิว → 6 variant |
| `avatar.pose-prop.base` | `pose_prop` | `cup`, `shield` วางตรง `hand_p` ของท่า `hold` |

ภาพประกอบทดสอบ (ไม่ใช่ asset ที่ส่ง): artist-2d แนบภาพประกอบครบทุก layer ซ้อนกันทั้ง 3 view บนพื้น `bg.paper` และบนแผ่น `bg.surface` ในหน้ากลางคืน ขนาด 128 × 160 และ 96 × 120 เพื่อใช้ใน content gate

Prompt raster (ภาพอ้างอิงเท่านั้น): ภาพจาก prompt ใช้เป็นแนวคิด ไม่ใช้เป็น layer ตรงๆ เพราะ generator จัดตำแหน่งให้ตรง anchor ไม่ได้ · ของจริงต้องวาดใหม่เป็น master SVG บน rig นี้ · prompt ฉบับเต็มอยู่ใน `art/prompts/avatar.md` (P1-F03-T14) ต่อยอดจาก style guide 11 โดยเพิ่มอย่างน้อย
```
Character turnaround sheet of one cute chibi city walker, three views in a row:
front (facing viewer), side (facing right), back. Each view on a 128x160 cell,
feet on the same baseline, head:body ratio 1:1.2, round head 58px tall,
stubby rounded arms and legs, no fingers, dot eyes with a white highlight,
plain white t-shirt, grey shorts, flip-flops, <HAIR STYLE> hair in <HAIR RAMP HEX x3>,
skin in <SKIN RAMP HEX x3>, dimetric 2:1 ground, thick #1A1A22 outline 2px,
flat 3-tone cel shading, light from top-left, transparent background.
Negative: realistic person, celebrity likeness, uniform, school uniform, logo,
text on clothes, religious clothing, crown, halo, voxel, 3D render.
```

## 13. Checklist ตรวจ avatar (content gate `art/reviews/F<nn>-visual-gate.md`)

ทุกข้อต้องผ่าน · ข้อที่ตกเขียนเป็น finding พร้อมวิธีแก้
- [ ] sheet ขนาดตรงตารางหัวข้อ 6 · frame 128 × 160 · คอลัมน์ front/side/back ถูกลำดับ · แถวครบแม้ว่าง
- [ ] เส้นแนวนอนของ rig (20, 78, 120, 148) และ anchor ตรงหัวข้อ 4 (ตรวจโดยซ้อนกับ `avatar.body.base`)
- [ ] ไม่ทับกล่องตา (ยกเว้น `accessory_face`) · `outfit_body` ไม่ทับกล่องแขน · แขนเสื้อตรงรูปแขน
- [ ] ประกอบกับชุดตั้งต้นและ placeholder ทุกชิ้นแล้วไม่มีช่องโหว่หรือของทะลุ ทั้ง 3 view
- [ ] เส้นรอบนอก 2 px ปิดรอบ · 3 ค่าต่อวัสดุ · แสงซ้ายบน · ไม่มี gradient/blur/texture/ความโปร่งใส
- [ ] ใช้ hex จาก token และ ramp ในหัวข้อ 7 เท่านั้น · ไม่มี key color ในไฟล์ PNG
- [ ] silhouette ระบายดำแล้วจำได้ที่ 64 px · อ่านออกที่ 96 × 120 ในภาพขาวดำ (style guide S10)
- [ ] ตาอ่านออกบน `skin-1` และ `skin-6` (มีจุดไฮไลต์)
- [ ] ไม่มีตัวอักษร โลโก้ เครื่องแบบ สัญลักษณ์ศาสนา สถาบัน การเมือง (style guide 8.2) · ไม่เหมือนบุคคลจริงหรือมาสคอตแบรนด์
- [ ] ท่า pose ไม่มีมือพนม ไหว้ หรือท่ามือทางการเมือง · สีหน้าไม่มีตากากบาท น้ำตา เลือด
- [ ] ขนาดไฟล์ไม่เกินงบใน asset-pipeline หัวข้อ 7 และลงทะเบียนใน manifest ครบทุก field บังคับ

## 14. สมมติฐานและการส่งต่อ

สมมติฐาน
- A-P1-F03-T11-1: ค่าเริ่มต้นสีผิว ทรงผม สีผมตอนสร้างตัวละครสุ่มเท่ากันทุกตัวเลือก และเปลี่ยนได้ฟรีภายหลัง (ยืนยัน: uiux-designer, game-director)
- A-P1-F03-T11-2: v1 มีโครงตัว 1 แบบ ไม่มีช่องเพศ (ยืนยัน: game-director)
- A-P1-F03-T11-3: ชุดประดับตาม GDD ครอบ 4 layer (`outfit_body`, `outfit_feet`, `accessory_head`, `accessory_face`) · ไม่มีสกินอาวุธหรือเครื่องรางใน v1 (ยืนยัน: game-director, systems-designer)
- A-P1-F03-T11-4: การ์ด party ระหว่าง run แสดง avatar ได้อย่างน้อย 96 × 120 CSS px (ยืนยัน: uiux-designer)
- A-P1-F03-T11-5: ชุดแขนเปล่าระหว่าง emote (มือท่าไม่มีแขนเสื้อ) ยอมรับได้ใน v1 (ยืนยัน: art-director หลังดู placeholder ใน T14)

การเปลี่ยนเอกสารนี้: เส้นแนวนอน anchor ขนาด frame และลำดับแถวคอลัมน์ล็อกหลัง T14 ผ่าน · การเปลี่ยนต้องขึ้น `avatarRig` เป็นเวอร์ชันใหม่และระบุว่าของชิ้นไหนต้องวาดใหม่
