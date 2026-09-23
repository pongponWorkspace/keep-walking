# Content gate (visual) F03 — Game Bible และทิศทางทุกสาย

Task: P1-F03-T22 · ผู้ตรวจ: art-director · วันที่: 2026-09-24 · protocol ข้อ 6 (content gate, visuals)
ขอบเขตตาม board "#### P1-F03-T22": style tile, avatar placeholder, manifest, wireframe/tokens, map style, motion direction (P1-F03-T27)

**verdict: NEEDS_CHANGES**

## 0. สรุป

ทิศทางภาพของ Phase 1 ใช้ต่อได้ทั้งชุด palette 51/51 hex ใน `design/ux/tokens.json` ตรงกับ style guide ทุกตัว (QA `qa/reports/F03-contrast-check.md`) · contrast ผ่าน 295/295 · rarity และ class แยกได้ครบใน 4 แบบจำลองตาบอดสี (`qa/reports/F03/colorblind/verdict.md`) · map style 0.2.0 ผ่าน validator 0 error และป้ายรอยแยกขึ้น 1 ชุดต่อ dungeon ใน e2e · rig ของ avatar (frame 128 × 160, เส้นแนวนอน 20/78/120/148, ขนาด sheet ทุก layer, ลำดับแถวและคอลัมน์) ถูกต้องทุกไฟล์

ที่ไม่ผ่านมี 3 กลุ่ม เป็นการผิดกฎของ style guide จริง แก้ได้ในงานเล็ก 3 งาน
1. **V-01 (vfx-animator):** motion direction ให้ไอคอนรอยแยกในการ์ด "หายใจ" ด้วย opacity แบบวนไม่จบ ขัด S7 (ห้ามความโปร่งใสบนขอบ) และหลักงบแบตของเอกสารเอง
2. **V-02 (uiux-designer):** wireframe และ components ใช้สีนอก token (พื้นอ่อนของ banner และ GPS pill) ใช้ opacity กับ toast ที่มีข้อความ และการ์ดที่เลือกแล้วใช้ขอบ `accent.signal` แทนขอบหมึก (1.43:1 ตก S3)
3. **V-03 (artist-2d):** avatar placeholder วางแสงกลับด้าน (ด้านขวาสว่างกว่าด้านซ้าย) เส้นรอบนอกเหลือ 1 px จริงบนขอบบนและข้าง และมีของวางผิดตำแหน่ง 5 จุด ซึ่งขัดข้อกำหนดของ placeholder เองที่ว่า "ตำแหน่ง ขนาด ต้องตรง spec 100%" และเป็นแม่แบบที่ของจริงจะลอกตาม

ทุกข้อที่เหลือเป็น finding ไม่บังคับ (blocking: no) หรืองานตามหลังของ Phase 2 · คำตัดสินที่ brief ขอครบทุกข้อในหัวข้อ 4

## 1. สิ่งที่ตรวจและวิธีตรวจ

| กลุ่ม | ไฟล์ | วิธีตรวจ |
| --- | --- | --- |
| ทิศทาง | `art/direction/style-guide.md`, `icon-grammar.md`, `avatar-spec.md`, `asset-pipeline.md`, `map-style.md`, `map-style/kw-light.style.json` 0.2.0, `map-style/icons/rift-crack.svg` | อ่านเทียบกันเองและเทียบกับของที่ส่งมอบ |
| Style tile | `art/assets/ui/style-tile/style-tile.svg`, `contact-sheet-1x.svg`, `README.md` | อ่านพิกัดและค่า stroke ใน SVG เทียบ icon-grammar 4.2, 5.2 · checklist icon-grammar 9 |
| Avatar | 12 ไฟล์ใน `art/assets/avatar/`, `art/prompts/avatar.md` | อ่านพิกัดทุก `<g>` เทียบตาราง avatar-spec 4.1, 4.2, 6, 11 · ประกอบ z ตามตาราง 5.2 ในใจทีละ view · checklist avatar-spec 13 |
| Manifest | `art/assets/manifest.json` | เทียบ schema และ validator V1–V11 ของ asset-pipeline 6.6, 8 |
| Motion | `art/vfx/specs/motion-direction.md` | เทียบ style guide S7, 9.1, 9.3 · icon-grammar 4.5 · map-style 11 · pillars P4 |
| UI | `design/ux/tokens.json`, `components.md`, `wireframes/*.html`, `wireframes/shared/style.css` | เทียบ hex กับ style guide 3 · กฎ S3, S4, S7 · shape language 5 |
| หลักฐาน QA | `qa/reports/F03-contrast-check.md`, `qa/reports/F03/colorblind/verdict.md`, `qa/reports/F02/map-style/P1-H06-screenshot-tests.md`, `apps/client/e2e/dungeon-labels.spec.ts`, `apps/client/e2e/__screenshots__/*.jpg` | อ่านผลและดูภาพจริง |
| ข้อมูลแผนที่ | `data/map/provinces.geojson`, `data/map/playarea-mask.geojson` | ตรวจ property ของ label (`kind`, `name`, `playable`, `iso`) |

ข้อจำกัด: ผู้ตรวจไม่มี browser จึงไม่ได้ render avatar ประกอบจริง ผลในหัวข้อ 3.2 มาจากการคำนวณพิกัด (ระบุตัวเลขทุกข้อให้ตรวจซ้ำได้) · ภาพประกอบทดสอบที่ avatar-spec 12 ขอให้แนบ ยังไม่มีในงาน T14 จึงรวมไว้ใน V-03

## 2. Acceptance ของ P1-F03-T22

| # | เกณฑ์ (board) | ผล | หลักฐาน |
| --- | --- | --- | --- |
| A1 | สี ขนาด stroke และ layer ตรง style guide, icon grammar, avatar spec | **ไม่ผ่านบางส่วน** | สีทุกไฟล์เป็น token/ramp/key ที่อนุญาต · layer, sheet, rig ถูกต้อง · ตก: แสงและเส้นรอบนอกของ avatar (V-03), ความหนาแถบ rarity ใน style tile (V-12 ไม่บังคับ) |
| A2 | motion direction สอดคล้องกับ style guide และ map style (ไม่มี animation ต่อเนื่องบนแผนที่) | **ไม่ผ่านบางส่วน** | บนแผนที่ผ่าน: รอยแยกนิ่ง 100% (motion 8, map-style 11, style JSON `transition` 0) · ตก: loop opacity ของไอคอนรอยแยกในการ์ด (V-01) |
| A3 | tokens ของ uiux ใช้ palette ตรง และ contrast ผ่านเกณฑ์กลางแดด | **tokens ผ่าน · wireframe ไม่ผ่าน** | tokens 51/51 ตรง, contrast 295/295 · wireframe มีสีนอก token 3 ค่า, opacity บนข้อความ, ขอบเลือกที่ contrast 1.43 (V-02) |
| A4 | verdict PASS / NEEDS_CHANGES | ทำแล้ว | NEEDS_CHANGES · re-run gate เดียวกันหลัง fix V-01 ถึง V-03 |

## 3. ผลตรวจรายชิ้น

### 3.1 Style tile และ contact sheet (P1-F03-T13) — ผ่าน มี finding ไม่บังคับ

| ข้อ (icon-grammar 9) | ผล | หมายเหตุ |
| --- | --- | --- |
| ตระกูลและรูปทรงประจำตระกูล | ผ่าน | class วงกลม, rarity สี่เหลี่ยมมุม 12, รอยแยกซิกแซก |
| สีเฉพาะ token | ผ่าน | ไม่มี gradient, blur, `<image>` · opacity 0.15 มีเฉพาะในแผง Don't #3 ซึ่งเป็นตัวอย่างผิดโดยเจตนา ยอมรับ |
| rarity: สี + pip + ขอบ + มุม | ผ่านเชิงโครง · ความหนาไม่ตรง | pip 1–5, มุม 0/1/2/4/ดาว 4 ถูก · แต่แถบสี rarity ถูกเส้นหมึกทับครึ่งหนึ่ง เห็นจริงบาง 1/2/2/2/3 px แทน 2/3/3/3/4 px (Common: แถบ `x=1` stroke 2 = 0–2 px, หมึก `x=0` stroke 2 = −1–1 px) และถ้าอยู่ใน viewBox 72 จริง หมึกครึ่งนอกจะถูกตัดเหลือ 1 px → V-12 |
| class: สี + glyph | ผ่าน · มีข้อย่อย | glyph ลูกศรไม่มีขนนก 2 แฉกที่หาง (มีแค่รอยบาก) และ stroke ของลูกศรกับประกาย 1.6 แทน 2 → V-13 |
| มุมตกแต่ง | ข้อย่อย | ดาวและสามเหลี่ยม stroke 1.5 แทน 2 px (icon-grammar 4.1 ดาว "ขอบ `ink.900` 2 px") → V-12 |
| ตาบอดสี 4 แบบ | ผ่าน | QA PASS ที่ 72/48 px และขนาดจริง 52/20 px |
| motif ต้องห้าม | ผ่าน | ไม่มีมงกุฎ รัศมี กากบาท · Don't #1 มีเขี้ยวและตาแดงแต่ไม่มีเลือด อยู่ในขอบเขตของ style guide 10 ข้อ 1 |
| Do/Don't #4 ไม่มีมงกุฎ | ผ่าน | ดูคำตัดสิน R-3 |
| ตำแหน่งไฟล์ | ไม่ตรง pipeline | reference อยู่ใต้ `art/assets/ui/` → คำตัดสิน R-4 |

รอยแยกใน tile (`rift-mini`) และ `rift-crack.svg` ใช้ `stroke-linejoin="round"` ตาม style guide 6.2 แต่ shape language 5 ต้องการมุมหักแหลม · ขัดกันในเอกสารของ art-director เอง แก้ที่เอกสาร (F-AD-4) และปรับ icon เป็น miter เมื่อ artist-2d วาดฉบับจริง (V-13)

### 3.2 Avatar placeholder 12 ชิ้น (P1-F03-T14) — ไม่ผ่าน (V-03)

ผ่านทุกไฟล์: ขนาด sheet ตรง avatar-spec 6 (body/outfit_body 384 × 480, face 384 × 800, hair 384 × 320, layer แถวเดียว 384 × 160, pose_hand 896 × 160, pose_prop 256 × 160) · id ของ `<g>` เป็น `<ชื่อไฟล์>-r<แถว>-c<คอลัมน์>` · แถวว่างคงไว้ (buzz `hair_back`, face คอลัมน์ back, glasses back) · หัว 34–94 × 20–78, ลำตัว 42–86 × 78–120, key color อยู่เฉพาะ body, hair, pose-hand · ไม่มีตัวอักษร โลโก้ เครื่องแบบ สัญลักษณ์ต้องห้าม · สีหน้าไม่มีตากากบาท น้ำตา เลือด · pose ไม่มีมือพนมหรือท่าการเมือง · ทุกไฟล์ต่ำกว่างบ

ไม่ผ่าน (blocking เพราะเป็นกฎ "ห้าม" ของ style guide หรือเป็นจุดประสงค์ข้อเดียวของ placeholder คือพิสูจน์ตำแหน่ง)

| # | ไฟล์ / แถว | ปัญหา (ตัวเลขตรวจซ้ำได้) | กฎ | วิธีแก้ |
| --- | --- | --- | --- | --- |
| a | ทุกก้อนที่มีแสงเงา (body, hair, outfit, weapon, hat, boots, pose) | ด้านซ้ายของก้อนเป็น `left` (ค่ากลาง) แต่พื้นที่ส่วนใหญ่รวมด้านขวาเป็น `top` (สว่างสุด) ภาพจึงอ่านว่าแสงมาจากขวา | style guide 6.3 "แสงมาจากซ้ายบนเสมอ ห้ามเปลี่ยน" | สูตรต่อก้อน: `top` แถบบน ~35% ของความสูง · `left` ส่วนล่างซ้ายของหน้า · `right` แถบขวา ~30% ของความกว้าง + แถบล่าง 4–6 px · ไฮไลต์ `bg.surface` 1 จุดมุมซ้ายบน · เงื่อนไขตรวจ: ครึ่งซ้ายของก้อนต้องไม่เข้มกว่าครึ่งขวาในทุก view รวม `back` (avatar-spec 2 ข้อ 2) |
| b | ทุกก้อน | stroke 2 px อยู่ที่ rect ฐานเท่านั้น rect แสงเงาที่วางทับใช้พิกัดเดียวกันจึงทับครึ่งในของเส้น (เช่น หัว: เส้น 33–35 px ถูก rect `top` ทับช่วง 34–35) เส้นที่เห็นบนขอบบนและข้างเหลือ 1 px (= 0.75 px ที่ 96 × 120 และ 0.5 px ที่ head crop) | style guide 6.2, S8 (เส้นที่มีความหมาย ≥ 2 px) | วาดเส้นรอบนอกเป็น element สุดท้ายของก้อน: `<rect … fill="none" stroke="#1A1A22" stroke-width="2"/>` ทับบนแสงเงา |
| c | `outfit-body/raincoat` แถว `sleeve_w`, `sleeve_p` | ทุก view มีวงกลม `cx 36 cy 112 r 6` สีเสื้อทับตำแหน่งมือ มือผิวหายเป็นถุงมือสีฟ้า · แขนเสื้อกว้าง 22 px เกินแขน 18 px ข้างละ 2 px | avatar-spec 11 (แขนเสื้อ "ห้ามทับ มือ", "ไม่เกินขอบแขน") | ลบวงกลมมือออกจากแถวแขนเสื้อ · แขนเสื้อจบที่ y ≤ 104 (มือเริ่ม y 106) · ความกว้างเท่า rect แขนใน `body` |
| d | `accessory-face/round-glasses` | view `front` เลนส์ที่ cx 50/78 r 11 ไม่อยู่บนตา (ตาอยู่ cx 54/74) และกว้างรวมเส้น 52 px · view `side` เลนส์ที่ cx 64 แต่ `eye_line` ของ side คือ (78, 56) ตาใน face side อยู่ x 78 | avatar-spec 4.2, 11 (กว้าง ≤ 44 กึ่งกลาง `eye_line`) | front: r 8 ที่ cx 54 และ 74, สะพาน 62–66 (กว้างรวมเส้น 38 px) · side: r 8 ที่ cx 78 · แถบสะท้อน stroke 2 (ไม่ใช่ 1.5) |
| e | `outfit-feet/rain-boots` view `side` | บูท x 49–79 แต่รองเท้าแตะตั้งต้นใน `body` side กว้าง x 46–82 สีเทาอ่อนโผล่ข้างละ 3 px ที่ y 140–151 | avatar-spec 11 (ครอบมิด กว้าง ≥ เท้าเดิม + 2 px) | บูท side ครอบ x 44–84 · front ขยายเป็น x 42–86 รวมสองข้าง |
| f | `pose-hand/base` คอลัมน์ `point` | ปลายนิ้ว `cx 124 r 3` + เส้น = 128 px เกิน safe area x ≤ 120 | avatar-spec 3, 10 (`point` ถึง x ≈ 118) | เลื่อนแขนเข้า: มือ cx 110, ปลายนิ้ว cx 116 (รวมเส้น 120) |
| g | งานส่งของ T14 | ไม่มีภาพประกอบทดสอบทุก layer ซ้อนกัน 3 view บน `bg.paper` และบนแผ่น `bg.surface` ของหน้ากลางคืน ที่ 128 × 160 และ 96 × 120 | avatar-spec 12 | ส่งเป็น reference `ref.avatar.composite-f03` ที่ `art/ref/avatar/composite-f03.svg` (`shipped: false`, ใช้ `<use>` ภายในไฟล์ได้) |

ข้อย่อยที่ไม่บังคับ แต่ให้แก้ในรอบเดียวกัน: ปากใน `face` ใช้ `ink.700` แต่ avatar-spec 7.5 กำหนด `ink.900` 2 px (สีหน้าคือข้อมูลของ emote) · หยดเหงื่อ stroke 1.5 → 2 · แขน `arm_w`/`arm_p` ใน front กว้าง 18 px (x 30–48) เกินกล่องแขน 30–42 และทับลำตัว 6 px ยอมรับได้ถ้าต่อมนเข้าลำตัว แต่ raincoat front (x 36–92) ต้องหดเป็น 38–90 ตาม avatar-spec 11 · ห่วงพวงกุญแจอยู่ y 107–113 เหนือ `hip_charm` (y 120) ให้ห่วงเริ่มที่ anchor

A-P1-F03-T11-5 (แขนเปล่าระหว่าง emote): **ยืนยันใช้ได้ใน v1** จาก placeholder `pose-hand` ท่าทั้ง 7 อ่านเป็นท่ามือชัดโดยไม่ต้องมีแขนเสื้อ และเห็นไม่เกิน 900 ms · เงื่อนไข: มือท่าใช้ key ผิวเท่านั้น ไม่รับสีจาก outfit

### 3.3 Manifest (`art/assets/manifest.json`) — ผ่านเชิง schema มีข้อยกเว้นชั่วคราว 2 ข้อ

- V1 ผ่าน: `manifestVersion` 1, `avatarRig` 1, `assets` เรียงตาม id, ทุก entry มี field บังคับ, `placeholder` สอดคล้องกับ `status` · 12 entry avatar มี `layer`, `sheet`, `variants` (body/pose-hand = skin, hair = hair) ตรง avatar-spec 6
- V3 ส่วน `width`/`height` ตรงขนาด sheet · `bytes` และ `sha256` ผู้ตรวจไม่ได้คำนวณซ้ำ (ไม่มี shell) ให้ validator ของ Phase 2 ยืนยัน
- V8 ตกโดยเจตนา: master ที่มี key color 3 ไฟล์อยู่ใต้ `art/assets/avatar/` → คำตัดสิน R-5
- V2/V7 ตก: `ref.style-tile.v1` ชี้ `ui/style-tile/*.svg` ใต้ `art/assets/` และไฟล์มี `<text>` → คำตัดสิน R-4
- `source.method` ของ master เป็น `agent-svg` ถูกต้องสำหรับช่วงก่อนมี build tool (asset-pipeline 4.2 ข้อสุดท้าย)

### 3.4 Prompt (`art/prompts/avatar.md`) — ผ่าน

negative prompt ครอบรายการต้องห้าม · ramp ทุก hex ตรง avatar-spec 7 · มีบันทึกการรันให้ HUMAN · ข้อเสนอเล็ก (V-14): `<BG>` ทางสำรองใช้ magenta #FF00FF ใกล้ key ผิว #FF40FF ให้เปลี่ยนเป็นเขียว #00FF00 ซึ่งห่างจาก key ผิว (magenta) และ key ผม (cyan) ทั้งคู่ กันการสับสนตอน key-out

### 3.5 Map style 0.2.0, ข้อมูลแผนที่ และภาพหน้าจอ — ผ่าน

- สีทุก layer เป็น token · ป้าย sponsored `bg.paper` บน halo `ink.900` ไม่ใช้สี rift/rarity/signal (QA ยืนยันที่ S3) · โซนดำและเส้นจังหวัดประอ่านออก ชื่อจังหวัดไทยจากข้อมูลจริง 77 จังหวัด (QA S4)
- ไม่มี animation: root `transition` 0, ไม่มี dasharray ที่เลื่อน, QA เทียบภาพสองช่วงเวลาเท่ากันทุก byte (P1-H06 หัวข้อ 4)
- ป้ายซ้ำ (P1-H06 หัวข้อ 5) แก้แล้วในโครงสร้าง: symbol layer 4 ชั้นอ่าน `kw-dungeon-labels` เท่านั้น · `apps/client/e2e/dungeon-labels.spec.ts` ยืนยัน `kw-rift-name` และ `kw-rift-count` = 1 ต่อ id ที่ z16 · ช่องว่าง: e2e ยังไม่นับ `kw-rift-sponsored` และ `kw-rift-crack` และยังไม่มีภาพ S1/S3 หลัง P1-X33 (board บรรทัดงานค้าง) → V-10
- ภาพ `P1-X23-lumpini-*` (Android/iOS): ถนนขาวมีขอบ, ขอบน้ำเข้ม, ชื่อไทย "พระราม 4" และชื่อ POI มี halo อ่านออก สระไม่ลอย · HUD ดำโปร่งและปุ่มที่แสดง copy key ดิบเป็นเครื่องมือ spike ไม่อยู่ในขอบเขต gate นี้ แต่ห้ามติดไปใน build ผู้เล่น
- `data/map/provinces.geojson` label มี `kind`, `name`, `playable`, `iso` (เช่น `TH-10`) → คำตัดสิน R-2

### 3.6 Motion direction (P1-F03-T27) — ไม่ผ่านบางส่วน (V-01)

ผ่าน: หลัก 4 ข้อ, visibility/reduced-motion บังคับทุก effect, ห้ามทุก motion บนแผนที่ (หัวข้อ 2, 8, Do/Don't 2) · rarity motion เป็น one-shot และจำนวนจังหวะเท่ากับ `vibration_ms` ไม่เป็นช่องทางเดียว (icon-grammar 4.5) · Legendary ห้ามมงกุฎ รัศมี ทองเมทัลลิก · ตายและ auto-retreat ไม่มี shake, vignette, ตราปั๊ม · ตีบวกเป็นเครื่องพิมพ์ใบเสร็จ motion เดียวกันทั้งสำเร็จและล้มเหลว item icon ไม่ขยับ ไม่แตก ตรง style guide 9.1 ดีมาก

ไม่ผ่าน
- หัวข้อ 3 แถวสุดท้ายและหัวข้อ 8 ข้อ 1: idle breathing `opacity` 0.85↔1.0 คาบ 4,000 ms วนไม่จบบนไอคอนรอยแยกในการ์ด → ขัด S7 (ความโปร่งใสบนขอบหมึกและขอบ `rift.500` ของไอคอน) และหลักข้อ 1 ของเอกสารเอง ("ไม่มี animation ใดวนไม่จบ") · การ์ดนี้อยู่ใน `S-01-map` ซ้อนบนแผนที่ loop ใดๆ ทำให้ browser ต้อง composite ใหม่ทุกเฟรมตลอดเวลาที่การ์ดเปิด → คำตัดสิน R-1

ไม่บังคับ (V-11): หัวข้อ 2 บอก `filter` ใช้ได้เฉพาะ legendary แต่หัวข้อ 4 Uncommon ใช้ `brightness()` และหัวข้อ 6.3 ใช้ `grayscale()` ให้แก้หัวข้อ 2 เป็นรายการที่อนุญาตชัด (death grayscale ใช้ได้, Uncommon เปลี่ยนเป็น scale ของกรอบ 1→1.03→1 สองครั้ง เพราะ brightness ทำให้สีกรอบหลุด token ชั่วขณะ) · HP bar tween `width` ให้เปลี่ยนเป็น `transform: scaleX()` + `transform-origin: left` ตามหลัก compositor-only ของหัวข้อ 2 · A-P1-F03-T27-2 ล้าสมัยแล้ว ให้อ้าง avatar-spec 10 เป็นแหล่งท่าจริง

### 3.7 Tokens, components, wireframes (P1-F03-T17) — tokens ผ่าน, wireframe ไม่ผ่าน (V-02)

tokens.json: hex 51/51 ตรง style guide · touch target 48, ปุ่มหลัก 56, radius, border 2/1, elevation เงาทึบ 4 px, caption 14 px เฉพาะคู่ ≥ 7:1 (เข้มกว่า style guide โดยเจตนา ดี) · ชื่อ key เป็น camelCase (`dangerOnNight`) ขณะที่ style guide เป็น kebab (`danger-on-night`) → คำตัดสิน R-7

ไม่ผ่าน (blocking)
| # | ที่ | ปัญหา | กฎ | วิธีแก้ |
| --- | --- | --- | --- | --- |
| a | `shared/style.css` บรรทัด 65–66, 111–112 · components 6 "บนพื้นอ่อน" | `.gps-pill.ok` #E9F7EE, `.gps-pill.bad` / `.banner.warn` #FDEBEB, `.banner.info` #E7F3FA เป็นสีนอก token | style guide 3 "ห้ามใช้สีนอก token" | พื้น `bg.surface` + ขอบ 2 px สี state + icon + ข้อความสี state (info 6.25, danger 5.50, success 5.66 บน surface) · ไม่เพิ่ม token tint |
| b | components 6 "Toast จาง (opacity ต่ำ)" · `03-run-active.html` บรรทัด 143 `opacity:.7` | ความโปร่งใสบนข้อความและขอบของ toast `run.tickDenied` | S7 | "จาง" = ไม่มีเงาทึบ (flat) + ขอบ `ink.300` 2 px + ข้อความ `ink.700` + icon `gate-miss` outline · ทึบ 100% |
| c | components 4 Overlap card · `02-dungeon-confirm.html` บรรทัด 47 · `00-onboarding.html` บรรทัด 77 | การ์ดที่เลือกเปลี่ยน `border-color` เป็น `accent.signal` ขอบหมึกหาย ขอบเหลืองบน `bg.surface` = 1.43:1 | S3 (≥ 3.0) และ icon-grammar 3 (selected = เพิ่ม ไม่ใช่แทน) | คงขอบ `ink.900` 2 px + วงนอก `accent.signal` 3 px (box-shadow ทึบ `0 0 0 3px`) + ขอบหมึกหนาเป็น 4 px หรือ icon ถูก · สถานะเลือกต้องเห็นในภาพขาวดำ |
| d | `01-map-home-states.html` บรรทัด 22 | รอยแยกจำลองเป็น `rift-500` ทึบ 50% ไม่มีขอบหมึก | S7, style guide 9.3 | ใช้ภาพ `rift-crack.svg` หรือรูปทรงทึบขอบ `ink.900` สีตาม icon จริง ให้ wireframe ไม่สอนภาพผิด |

ไม่บังคับ: ไม่มี component ป้าย sponsored ใน components.md แม้ style guide 9.2 กำหนดตำแหน่งไว้ 4 ที่ (หัวการ์ด dungeon, หน้า confirm, หน้าสรุป run, ป้ายบนแผนที่) → V-15 · fallback ของปุ่ม login ใน `00-onboarding.html` ให้ Google เป็น `.btn-primary` เหลือง และ Apple เป็น secondary → คำตัดสิน R-6

## 4. คำตัดสิน (art-director เป็นผู้มีอำนาจด้านภาพ ตาม protocol ข้อ 5)

| # | เรื่อง | คำตัดสิน | เหตุผล | งานตามหลัง |
| --- | --- | --- | --- | --- |
| R-1 | **D-055** รอยแยกนิ่งบนแผนที่ และ "จังหวะ rift" ย้ายไป UI นอกแผนที่ | **ACCEPTED พร้อมแก้:** (ก) รอยแยกบนแผนที่นิ่ง 100% ไม่มีข้อยกเว้น ยอมรับเต็ม (ข) ปฏิเสธ idle breathing แบบวน · ให้เหลือ motion "รอยแตกกางออก" one-shot 300 ms แล้วนิ่ง ใช้ได้ทั้งตอนการ์ด dungeon โผล่ครั้งแรกและตอนเปิด `S-02-dungeon-confirm` ใช้ `transform: scaleY` 0.6→1 จากฐาน ไม่ใช้ opacity กับไอคอน · v1 ไม่มี loop ใดในเกม | (1) opacity 0.85 ทำให้ขอบหมึกและขอบ `rift.500` จางลง ผิด S7 ซึ่งมีไว้เพื่อกลางแดด (pillar V1 ชนะ V3) (2) การ์ดอยู่ใน `S-01-map` บนแผนที่ loop บังคับให้ composite ทุกเฟรมตลอดเวลาที่เปิด ขัดเจตนา P4 "ไม่เปลืองแบต" (3) ความหมายของรอยแยกมาจากรูปทรงซิกแซกและสี ไม่ใช่การเคลื่อนไหว ภาพนิ่งจึงไม่เสียข้อมูล | vfx-animator แก้ motion-direction หัวข้อ 2 (ลบข้อยกเว้น loop), 3 (แถว rift), 8 ข้อ 1, 12 · orchestrator บันทึก D-055 = ACCEPTED (แก้ตาม R-1) |
| R-2 | **D-060** simplify เส้นจังหวัด, property `iso`, รูของ mask รวมทะเล | **ACCEPTED** ทั้ง 3 ข้อ · เงื่อนไขของข้อทะเล: ภาพตรวจ S6 (ชายฝั่งสมุทรปราการ 100.60, 13.50 ที่ z10 และ z13) ต้องไม่มีขอบดำตรงกลางทะเล ถ้ารูของ mask เลยขอบ bbox ของ tile ออกไป ให้ location-engineer ตัดรูด้วย bbox ของ tile (แก้ข้อมูล ไม่แก้ style) | 350 ม. ที่ z9 ≈ 1.2 px และเส้นที่ไม่แตะเขตเล่นอยู่กลางโซนดำซึ่งไม่มีอะไรให้เทียบ ความคลาดจึงมองไม่เห็น · เส้นที่แตะเขตเล่นใช้ 20 ม. และจุดชุดเดียวกับรู mask เส้นประจึงทับขอบโซนดำพอดี ไม่มีร่องสว่างหรือดำ ซึ่งสำคัญกว่า · `iso` เป็น id คงที่ให้ระบบลงทะเบียนความสนใจรายจังหวัดใช้แทนชื่อไทย style ไม่อ่าน จึงไม่กระทบภาพ · ทะเลเป็นของจังหวัดที่เปิด ถ้าปิดดำจะดูเหมือนชายฝั่งหายและเกิดเศษดำตามแนวชายฝั่งที่ OSM coastline กับ relation ไม่ตรงกัน สีน้ำ `map.water` บอก "เดินไม่ได้" เองอยู่แล้ว | art-director แก้ map-style 6.2 และ 6.3 (F-AD-1) · qa ถ่าย S6 (V-10) · orchestrator บันทึก D-060 = ACCEPTED |
| R-3 | **A-P1-F03-T13-1** Don't #4 ไม่วาดมงกุฎ | **ยืนยัน** | ภาพมงกุฎใน repo public ถูกคัดลอกออกไปนอกบริบท "ตัวอย่างผิด" ได้ และขัด 8.2 ที่ห้ามแบบไม่มีข้อยกเว้น · ข้อความระบุข้อห้ามพอสำหรับการตรวจ | art-director แก้ style guide 10 แถว 4 ให้ Don't เป็น "กรอบสีล้วนไม่มี pip/มุม" และเพิ่มกฎ "ห้ามวาดสัญลักษณ์ใน 8.2 แม้เป็นตัวอย่างผิด" (F-AD-2) |
| R-4 | **A-P1-F03-T13-2** path ของ `ref.*` | **ย้ายไป `art/ref/style-tile/`** (`style-tile.svg`, `contact-sheet-1x.svg`, `README.md`) · manifest `files[].path` เป็น `art/ref/style-tile/<ไฟล์>` · `shipped: false` คงเดิม | asset-pipeline 2 และ 3.2 กำหนดให้ `ref.*` อยู่ `art/ref/` · `art/assets/` คือชุดที่ส่งถึงผู้เล่น (V11) และไฟล์ reference มี `<text>` ซึ่งจะตก V7 · group `ui` ใต้ `art/assets` ทำให้คนเข้าใจว่าเป็น `ui.*` | artist-2d ย้ายใน V-03 (ข้อไม่บังคับของงานเดียวกัน) · รายงาน QA เก่าที่อ้าง path เดิมไม่ต้องแก้ |
| R-5 | master key color 3 ไฟล์ใต้ `art/assets/avatar/` (V8) | **ยอมรับชั่วคราว และย้ายไป `art/src/avatar/<layer>/` ในงาน fix V-03 เลย** ไม่รอ Phase 2 · manifest ชี้ `art/src/avatar/body/base.svg` ฯลฯ ได้ตาม asset-pipeline 4.2 ข้อสุดท้าย (placeholder ชี้ master ได้) · อีก 9 ไฟล์ที่ไม่มี key color อยู่ `art/assets/avatar/` ต่อได้จน build tool มา | ย้ายตอนนี้ต้นทุนเท่ากับย้ายทีหลัง แต่ทำให้ V8 ไม่ต้องมีข้อยกเว้นตอนเปิด validator ใน CI · entry ยัง `placeholder` production จึงแสดง fallback อยู่แล้ว ความเสี่ยงที่ key color หลุดถึงผู้เล่นเป็นศูนย์ในทั้งสองกรณี | artist-2d (V-03) · tech-lead รู้ไว้สำหรับ rasterizer Phase 2 |
| R-6 | ปุ่มแบรนด์ Google/Apple บน `S-00-login` | **ACCEPTED พร้อมเงื่อนไข** (1) ใช้เฉพาะ `S-00-login` และหน้าเชื่อมบัญชีใน settings (2) เลือกธีมที่ contrast สูงสุดบน `bg.paper`: Google แบบ filled black, Apple แบบ black (3) ปุ่มสองผู้ให้บริการกว้างเท่ากัน เรียงแนวตั้ง ห่าง ≥ 8 px (4) ถ้าความสูงที่ SDK ให้ต่ำกว่า 48 px ยอมเป็นข้อยกเว้นของ S8 เฉพาะปุ่มนี้ gameplay-programmer วัดจริงแล้วรายงาน (5) fallback ทั้งสองปุ่มเป็น `.btn-secondary` น้ำหนักเท่ากัน ไม่ใช้ `accent.signal` กับผู้ให้บริการรายใด (6) ไม่มีโลโก้ผู้ให้บริการที่อื่นในเกม | ข้อห้ามแบรนด์ใน 8.2 คุมโลกของเกมและ asset ของเรา ปุ่ม login เป็น UI ของบุคคลที่สามที่ต้องทำตาม brand guideline ของเขาเองและอยู่นอกโลกเกม · ธีมดำให้ขอบ ≥ 16:1 บนกระดาษครีม อ่านออกกลางแดด · การให้ปุ่มหนึ่งเหลืองเท่ากับชี้นำผู้ให้บริการ และกินสิทธิ์ CTA เดียวของจอ | uiux-designer แก้ fallback ใน `00-onboarding.html` และบันทึกใน flow 11.4 (V-02 ข้อไม่บังคับ) · gameplay-programmer วัดความสูงปุ่มตอน build F07 |
| R-7 | tokens.json สีเท่ากับ style guide และ ramp ผิว/ผม | **ผ่าน** (51/51) · ชื่อ camelCase ใน JSON ยอมรับ โดยใช้กฎแปลงเดียว: ส่วนที่มี `-` ใน style guide แปลงเป็น camelCase (`state.danger-on-night` ↔ `state.dangerOnNight`) บันทึกใน `_meta` · ramp `skin-1..6` และ `hair-1..6` **เลื่อนไป Phase 2 ได้** | ค่าสีตรงทุก byte และ QA แปลงชื่อได้ถูก · ramp ผิว/ผมใช้เฉพาะตอน build avatar (Phase 2) ไม่มี UI ใดของ Phase 1 ใช้ | uiux-designer Phase 2: เพิ่ม 12 ramp, `_meta.nameMapping`, `font.map.weights` เป็น [400, 500] (map-style 4), type สำหรับตัวเลขโอกาสตีบวก ≥ 64 px (style guide 9.1; `display` 32 px ปัจจุบันไม่พอ) · qa ขยาย regex ramp (handoff ข้อ 3 ของ QA) |
| R-8 | **D-075** สอง source ของ dungeon (ด้านภาพ) | **ACCEPTED ด้านภาพ** (authority ของ decision คือ tech-lead) | ป้าย ไอคอน จำนวน และ sponsored มีชุดเดียวต่อ dungeon โดยโครงสร้าง ป้ายอยู่ใน polygon เสมอเพราะใช้ pole of inaccessibility · ขอบและพื้นยังมาจาก polygon จึงไม่เปลี่ยนภาพที่อนุมัติไว้ | qa เพิ่มการนับ sponsored และ crack ใน e2e และถ่าย S1/S3 ใหม่ (V-10) |

## 5. Findings เป็น handoff

### 5.1 Blocking (ต้องแก้ก่อน re-run gate นี้)

| id | ถึง | ต้องทำ | writes ที่เสนอ |
| --- | --- | --- | --- |
| V-01 | vfx-animator | แก้ motion-direction ตาม R-1: ลบ idle breathing และข้อยกเว้น loop ในหัวข้อ 2, 3, 8, 11, 12 · ใส่ one-shot "รอยแตกกางออก" 300 ms (`scaleY` 0.6→1 จากฐาน ไม่ใช้ opacity) พร้อม reduced-motion = แสดงนิ่งทันที · รวมข้อไม่บังคับ V-11 ในรอบเดียวกัน | `art/vfx/specs/motion-direction.md` |
| V-02 | uiux-designer | แก้ 4 ข้อในตาราง 3.7 (สีนอก token, toast opacity, ขอบการ์ดที่เลือก, รอยแยกจำลอง) ทั้งใน components และ wireframe · รวมข้อไม่บังคับ: fallback login ตาม R-6 | `design/ux/components.md`, `design/ux/wireframes/` |
| V-03 | artist-2d | แก้ข้อ a–g ในตาราง 3.2 (แสงซ้ายบน, เส้นรอบนอกวาดทับสุดท้าย, แขนเสื้อไม่ทับมือ, แว่นกว้าง ≤ 44 และตรงตาทั้ง front/side, บูท side ครอบมิด, `point` อยู่ใน safe area, ภาพประกอบทดสอบ) · อัปเดต `bytes`/`sha256` ใน manifest · รวมข้อไม่บังคับ: ย้าย style tile ตาม R-4, ย้าย master key color ตาม R-5, ข้อย่อยท้าย 3.2 | `art/assets/avatar/`, `art/src/avatar/`, `art/ref/`, `art/assets/ui/style-tile/` (ลบหลังย้าย), `art/assets/manifest.json` |

เกณฑ์ re-run: ตรวจเฉพาะ V-01 ถึง V-03 และ diff ของไฟล์ที่แก้ · ถ้าผ่านทั้ง 3 ข้อ verdict จะเป็น PASS และ art-director ตั้ง `status` ของ `ref.style-tile.v1` เป็น `approved` ได้ (entry avatar ยังเป็น `placeholder` จนมีภาพจริง ไม่เปลี่ยน)

### 5.2 ไม่บังคับ (ทำใน Phase 2 หรือรวมกับงานถัดไปของเจ้าของ)

| id | ถึง | ต้องทำ | เมื่อไร |
| --- | --- | --- | --- |
| V-10 | qa-tester | e2e `dungeon-labels.spec.ts` นับ `kw-rift-sponsored` (ต้อง = 1 สำหรับ `sample-sponsored-01`) และ `kw-rift-crack` (= 1 ต่อ dungeon ที่เปิด, 0 สำหรับที่ปิด) · ถ่าย S1, S3 ใหม่หลัง P1-X33 และเพิ่ม S6 ชายฝั่งสมุทรปราการ (R-2) | งานค้างของ P1-X32/X33 บน board |
| V-11 | vfx-animator | หัวข้อ 2 เขียนรายการ `filter` ที่อนุญาต · Uncommon ใช้ scale แทน brightness · HP bar ใช้ `scaleX` แทน `width` · อัปเดต A-P1-F03-T27-2 | รวมใน V-01 |
| V-12 | artist-2d | ตอนวาด `frame.rarity.*` จริง: หมึก `x=1 y=1 w=70 h=70 rx=11` stroke 2 (0–2 px) · แถบสีความหนา t วางที่ inset `2 + t/2` stroke t · เส้นในขอบคู่ห่างจากขอบในของแถบสี 3 px · ดาวและสามเหลี่ยมมุม stroke 2 · แก้ style tile ตามถ้ามีเวลา | งานวาด icon ชุดแรก (Phase 2) |
| V-13 | artist-2d | glyph Ranged เพิ่มขนนก 2 แฉกที่หาง · stroke glyph 2 px ทุกตัว · `rift-crack.svg` และรอยแยกทุกภาพใช้ `stroke-linejoin="miter"` (`stroke-miterlimit` 4) ตาม F-AD-4 | งานวาด badge และ map icon จริง |
| V-14 | artist-2d | `art/prompts/avatar.md` `<BG>` สำรองเปลี่ยนจาก #FF00FF เป็น #00FF00 (เพิ่มฉบับใหม่ต่อท้าย ไม่แก้ย้อนหลังตามกติกาของไฟล์ ถ้ายังไม่เคยรันแก้ตรงได้) | ก่อน HUMAN รัน prompt ครั้งแรก |
| V-15 | uiux-designer | เพิ่ม component `.chip-sponsored` ใน components.md ตาม style guide 9.2 (พื้น `ink.900`, ข้อความ `bg.paper` ตัวหนา ≥ 14 px, ขอบ `bg.surface` 2 px, 4 ตำแหน่ง, ห้ามย่อเหลือ icon) | ก่อน build หน้า confirm dungeon (F04) |
| V-16 | uiux-designer | tokens.json ตาม R-7 (12 ramp, `_meta.nameMapping`, `font.map.weights` [400, 500], type ตัวเลขตีบวก ≥ 64 px) | Phase 2 พร้อม build avatar |
| V-17 | HUMAN (ผ่าน qa-tester) | ทดสอบกลางแดดตาม style guide S10 และ map-style 10.2 (S1, S3, S4 บน Android และ iPhone 12:00–15:00 ความสว่าง 100% แปลงขาวดำ) · wireframe เป็น HTML static ยังทดสอบกลางแดดไม่ได้จริง จึงไม่ถือเป็นเงื่อนไขของ gate นี้ แต่ต้องมีก่อน content gate ของ F05 ขึ้นไป | รวมกับเดินทดสอบภาคสนามครั้งถัดไป (ไม่เพิ่มต้นทุน) |

### 5.3 งานของ art-director เอง (writes ของ task นี้คือไฟล์ review เท่านั้น จึงบันทึกเป็นงานตามหลัง)

| id | ไฟล์ | แก้อะไร |
| --- | --- | --- |
| F-AD-1 | `art/direction/map-style.md` | 6.3: simplify 350 ม. สำหรับเส้นที่ไม่แตะจังหวัดที่เล่นได้ และ 20 ม. (จุดชุดเดียวกับรู mask) สำหรับเส้นที่แตะ · ตาราง label เพิ่ม `iso` (string, ISO 3166-2 เช่น `TH-10`, style ไม่อ่าน) · 6.2: รูของ mask ตามขอบ relation OSM รวมทะเลของจังหวัดที่เปิด · 10.1 เพิ่มจอ S6 (R-2) |
| F-AD-2 | `art/direction/style-guide.md` 10 แถว 4 และ 8.2 | Don't #4 ตาม R-3 · กฎ "ห้ามวาดสัญลักษณ์ใน 8.2 แม้เป็นตัวอย่างผิด" |
| F-AD-3 | `art/direction/style-guide.md` 3.5, 7 | เพิ่ม `color.map.water-edge` #3377AA (A-P1-F03-T12-4) · หมายเหตุ `map.rift-fill`: #CC1177 ใช้เป็นขอบ ส่วนพื้นใช้ `rift.300` ทึบ 20% ตาม map-style 5 · label แผนที่ Noto Sans Thai Regular/Medium (A-P1-F03-T12-2) |
| F-AD-4 | `art/direction/style-guide.md` 6.2, S7 | ข้อยกเว้น: รอยแยกใช้ miter join ได้ (ตาม shape language 5) · S7 เพิ่ม "ห้ามวน opacity กับ icon หรือ element ที่มีขอบหมึก" (R-1) |

## 6. สิ่งที่ gate นี้ไม่ได้ตัดสิน

- การอนุมัติทิศทางภาพทั้งชุด (D-025) เป็นของ HUMAN · gate นี้ยืนยันแค่ว่าของที่ส่งมอบตรงกับทิศทางที่เสนอ
- D-056 (ร่างอวตารเดียว ไม่มี field เพศ) เป็นของ game-director ใน P1-F03-T25 · ด้านภาพ placeholder สนับสนุนข้อเสนอนี้ (ของ 1 ชิ้น = 1 sheet ใช้ได้กับทุกคน)
- ความถูกต้องของ `bytes` และ `sha256` ใน manifest และการ render จริงของ avatar รอ validator และ rasterizer ของ Phase 2

---

# รอบ 2 (re-run หลัง P1-X34, P1-X35, P1-X36)

Task: P1-F03-T22 รอบ 2 · ผู้ตรวจ: art-director · วันที่: 2026-09-24 · ขอบเขตตามเกณฑ์ re-run ในหัวข้อ 5.1: ตรวจเฉพาะ V-01 ถึง V-03 และ diff ของไฟล์ที่แก้ · รอบ 1 ข้างบนคงไว้ตามเดิมไม่แก้

**verdict: PASS**

## R2-0. สรุป

แก้ครบทั้ง 3 ข้อที่ขวาง V-01 (motion) และ V-02 (UI) แก้ครบทุกข้อย่อย V-03 (avatar) แก้ครบข้อ a ถึง f ข้อ g ส่งมาเฉพาะ view `front` ส่วน view `side` และ `back` ผู้ตรวจตรวจจากพิกัดแทนแล้ว (หัวข้อ R2-3)

รอบนี้เจอปัญหาใหม่ 2 เรื่องใน diff และบันทึกเป็นงานตามหลังที่ไม่ขวาง gate นี้ (เหตุผลอยู่ในหัวข้อ R2-5)
1. **V-18:** แถบแสงเงาที่เตี้ยใช้ `rx` เดียวกับก้อนฐาน ค่า `ry` จึงถูกบีบให้เล็กลง มุมของแถบเลยยื่นออกนอกเส้นรอบนอก ที่คางยื่นออกมาประมาณ 13 px ต่อข้าง
2. **V-20:** ขอบ `ink.300` ของ toast จางได้ contrast 2.80:1 กับ `bg.surface` ต่ำกว่า S3 ต้นเหตุคือวิธีแก้ที่ผู้ตรวจกำหนดเองในรอบ 1 ข้อ 3.7b uiux-designer ทำตามถูกต้องแล้ว

## R2-1. V-01 motion direction (P1-X34) — แก้แล้ว

| ข้อที่ขอ | ผล | หลักฐาน (`art/vfx/specs/motion-direction.md`) |
| --- | --- | --- |
| ลบ idle breathing และข้อยกเว้น loop | แก้แล้ว | หัวข้อ 1 ข้อ 1 "ไม่มี animation ใดวนไม่จบ" · หัวข้อ 2 กฎ visibility ข้อ 3 "ทุก effect ในเอกสารนี้เป็น finite one-shot" · หัวข้อ 8 ย่อหน้าสถานะ บันทึกว่าข้อยกเว้นถูกปฏิเสธ · หัวข้อ 11 แถว 9 · ไม่เหลือ `opacity 0.85↔1.0` หรือคาบ 4,000 ms ในส่วนกำหนดใด (มีคำนี้อยู่แค่ในย่อหน้าประวัติของหัวข้อ 8) |
| one-shot "รอยแตกกางออก" 300 ms | แก้แล้ว | หัวข้อ 3 แถวสุดท้าย และหัวข้อ 8 "Motion เดียวที่ใช้ได้จริง": `transform: scaleY()` 0.6→1, `transform-origin: bottom`, 300 ms, ease-out เล่นครั้งเดียวตอนการ์ด mount หรือหน้าเปิด แล้วนิ่งค้าง ใช้ใน 2 ที่ตรงตาม R-1 (การ์ด `S-01-map` และหัว `S-02-dungeon-confirm`) |
| ห้าม opacity กับไอคอน | แก้แล้ว | หัวข้อ 8 bullet 2 และหัวข้อ 11 แถว 10 |
| reduced-motion | คงไว้ | หัวข้อ 2 (บังคับทุก effect) · หัวข้อ 8 bullet 4 แสดง scaleY 1 ทันที |
| V-11 รายการ `filter` ที่อนุญาต | แก้แล้ว | ตารางในหัวข้อ 2 มี 2 แถวที่อนุญาต (`grayscale()` ตอนตาย, Legendary one-shot) และแถว "ทุกกรณีอื่นห้าม" |
| V-11 Uncommon ใช้ scale | แก้แล้ว | หัวข้อ 4 แถว Uncommon: `transform: scale()` 1→1.03→1 สองครั้ง ห้าม `filter` ทุกชนิด |
| V-11 HP bar ใช้ `scaleX` | แก้แล้ว | หัวข้อ 3 แถว HP bar: `transform: scaleX()` + `transform-origin: left` |
| V-11 A-P1-F03-T27-2 | แก้แล้ว | หัวข้อ 12 ระบุว่าล้าสมัย ให้อ้าง avatar-spec 10 แทน |

ข้อชี้แจง ไม่บังคับ (V-21)
- หัวข้อ 4 แถว Rare เขียนว่า "ขอบกะพริบ 3 ครั้งไล่สว่างขึ้น" ถ้าทำด้วย `brightness()` หรือ `opacity` จะตกตารางในหัวข้อ 2 ของเอกสารเอง ให้เขียนวิธีทำให้ชัด คือสลับความหนาขอบ 2→3→4 px ตามแถบ rarity (icon-grammar 4.2) หรือใช้ `scale` ของกรอบ
- คำตัดสิน: `opacity` ช่วงเข้าและออกของ toast/banner (150–200 ms, หัวข้อ 3) และ cross-fade ≤ 150 ms ของ reduced-motion **ยอมรับ** เพราะเป็นช่วงเปลี่ยนสถานะสั้นๆ ไม่ใช่สถานะค้างบนจอ ส่วนกฎ S7 และ R-1 ห้าม opacity ที่ค้างอยู่หรือวนซ้ำ ให้ gameplay-programmer ใช้ข้อนี้เป็นเส้นแบ่ง

## R2-2. V-02 components และ wireframes (P1-X35) — แก้แล้ว

| ข้อ (ตาราง 3.7) | ผล | หลักฐาน |
| --- | --- | --- |
| a สีนอก token | แก้แล้ว | `shared/style.css` บรรทัด 64–67: `.gps-pill` พื้น `var(--bg-surface)` ส่วน `.ok`/`.bad` ขอบ 2 px และข้อความเป็นสี state · บรรทัด 115–118: `.banner` พื้น `bg.surface` ส่วน `.info`/`.warn` ขอบล่าง 2 px และข้อความเป็นสี state · components.md หัวข้อ 1 แถว GPS pill และหัวข้อ 6 แถว banner เขียนตรงกัน · ค้นทั้ง `wireframes/` แล้ว hex มีอยู่เฉพาะใน `:root` (style.css บรรทัด 8–16) และทุกค่าตรง tokens · ไม่เหลือ #E9F7EE, #FDEBEB, #E7F3FA · components.md ไม่มี hex เลย |
| b toast จาง | แก้แล้ว | style.css บรรทัด 114: `.toast.faded` ไม่มีเงา ขอบ `ink.300` ข้อความ `ink.700` ไม่มี opacity · `03-run-active.html` บรรทัด 143 เหลือแค่ class ไม่มี `opacity:.7` แล้ว · components.md หัวข้อ 6 แถว "Toast จาง" เขียนว่า "ทึบ 100% เสมอ" (ขอบ `ink.300` ดูข้อแก้ของผู้ตรวจที่ V-20) |
| c การ์ดที่เลือก | แก้แล้ว | style.css บรรทัด 105: `.card.selected { border-width: 4px; box-shadow: 0 0 0 3px var(--accent-signal); }` ขอบยังเป็น `ink.900` จาก `.card` · ใช้ใน `02-dungeon-confirm.html` บรรทัด 47 และ `00-onboarding.html` บรรทัด 77 · components.md หัวข้อ 4 แถว `.card.selected` · ในภาพขาวดำ ขอบ 4 px ต่างจาก 2 px ชัดเจน |
| d รอยแยกจำลอง | แก้แล้ว | `01-map-home-states.html` บรรทัด 23–26 และ `00-onboarding.html` บรรทัด 117–120: ก้อน `ink.900` เป็นชั้นล่าง ก้อน `rift.500` ทึบ inset 2 px ซ้อนบน ทรงซิกแซกแบบ `clip-path` ไม่มี opacity · ข้อสังเกต: เพราะ clip-path ใช้ค่า % ขอบหมึกตรงปลายแหลมจึงบางกว่า 2 px เล็กน้อย ยอมรับได้ใน wireframe (ของจริงใช้ `rift-crack.svg`) |
| R-6 fallback login | แก้แล้ว | `00-onboarding.html` บรรทัด 100–101: ทั้งสองปุ่มเป็น `.btn-secondary` กว้าง 100% เรียงแนวตั้ง ห่าง 8 px · components.md หัวข้อ 3.1 มีเงื่อนไขครบ 6 ข้อตรงตาม R-6 |

**คำตัดสิน A-P1-X35-3** (`00-onboarding.html` บรรทัด 134, `div` สี `map-park` ที่ `opacity:.35` วางใต้ drawer เลือกพลัง): **ยอมรับ** เข้าข้อยกเว้นในท้าย S7 ("alpha ใช้ได้กับ ... overlay พื้นหลัง") เพราะ element นี้ไม่มีข้อความและไม่มีขอบ ทำหน้าที่เป็นพื้นหลังที่ถูกบังอย่างเดียว ส่วน drawer ที่ซ้อนอยู่ด้านบนทึบ 100% · เงื่อนไขสำหรับตอน build: ห้ามลด opacity ของ MapLibre canvas หรือ layer ใดของแผนที่ ให้ใช้ scrim แบบเดียวกับ `.popup-overlay` (`ink.900` alpha วางทับแผนที่) หรือไม่ใช้อะไรเลย เพราะการลด opacity ของแผนที่เองจะทำให้ชื่อถนนและ halo จางไปด้วย ซึ่งผิด S6 และ S7 · `.popup-overlay` `rgba(26,26,34,.45)` (style.css บรรทัด 106) ก็เข้าข้อยกเว้นเดียวกัน ยอมรับ

ไม่บังคับ: `.gps-pill` ตั้ง `font-size: 10px` ต่ำกว่า S8 (14 px สำหรับป้ายรองที่ contrast ≥ 7:1) · ตาม components.md pill มีไว้คู่กับ icon ให้เพิ่มเป็น 14 px ตอน build F04 หรือใช้ icon + คำ "GPS" ขนาด 14 px (V-22)

## R2-3. V-03 avatar placeholder (P1-X36) — แก้แล้ว

| ข้อ (ตาราง 3.2) | ผล | หลักฐาน (พิกัดตรวจซ้ำได้) |
| --- | --- | --- |
| a แสงจากซ้ายบน | แก้แล้ว | ทุกก้อนใช้สูตรเดียวกัน ตัวอย่างหัวใน `art/src/avatar/body/base.svg` `base-r0-c0`: ฐาน `left` #C020C0 · `top` #FF40FF แถบบน y 20–40 (20/58 = 34%) · `right` #800080 แถบขวา x 76–94 (18/60 = 30%) + แถบล่าง y 72–78 · ไฮไลต์ `#FFFFFF` 4 × 4 ที่ (37, 23) · ครึ่งซ้ายไม่เข้มกว่าครึ่งขวาในทั้ง 3 คอลัมน์ รวม `back` (c2) และสูตรเดียวกันนี้ใช้กับ raincoat, boots, sun-hat, umbrella, pose-hand, pose-prop และ hair (ดูใน composite) · มือเป็นวงกลม 3 ชั้นที่เลื่อนไปทางซ้ายบน (cx −0.9) ถูกต้อง |
| b เส้นรอบนอกวาดสุดท้าย | แก้แล้ว | ทุกก้อนจบด้วย `<rect>` หรือ `<circle>` ที่ `fill="none" stroke="#1A1A22" stroke-width="2"` เป็น element สุดท้ายของก้อน · ค้นทั้ง `art/assets/avatar` และ `art/src/avatar` ไม่พบ `stroke-width="1"`, `"1.5"` หรือ `opacity` |
| c แขนเสื้อไม่ทับมือ | แก้แล้ว | `raincoat.svg` แถว r1/r2: ไม่มีวงกลมมือเหลืออยู่ · แขนเสื้อ y 82–104 (มือเริ่ม y 106) · กว้าง 18 px (front/back) และ 22 px (side) เท่ากับ rect แขนใน `body` · torso front/back x 38–90 ตาม avatar-spec 11 |
| d แว่น | แก้แล้ว | `round-glasses.svg` front: r 8 ที่ cx 54 และ 74, cy 56 · สะพาน 62–66 · กว้างรวมเส้น 45–83 = 38 px (≤ 44) · side: r 8 ที่ cx 78 · แถบสะท้อน stroke 2 · เลนส์ทึบ `ink.700` ได้ตาม avatar-spec 11 (แว่นกันแดด) |
| e บูทด้าน side | แก้แล้ว | `rain-boots.svg` c1: x 44–84 ครอบรองเท้าแตะของ `body` side (x 46–82) เกินข้างละ 2 px · front/back สองก้อน x 42–63 และ 65–86 เส้นรอบนอกทับช่อง 63–65 จนปิดสนิท |
| f ท่า `point` | แก้แล้ว | `art/src/avatar/pose-hand/base.svg` `base-r0-c1`: มือ cx 110 r 6 · ปลายนิ้ว cx 116 r 3 + เส้น 1 px = 120 (≤ 120) |
| g ภาพประกอบทดสอบ | แก้บางส่วน | `art/ref/avatar/composite-f03.svg` มีครบ 4 แผง (`bg.paper`/`bg.surface` × 128 × 160 และ 96 × 120) ใช้ ramp `skin-1`/`hair-1` ไม่ใช้ key color และลำดับ z ตาม avatar-spec 5.2 · แต่มีเฉพาะ view `front` ส่วน `side`/`back` ผู้ตรวจยืนยันจากพิกัดในข้อ c ถึง e แทน → V-19 |
| ข้อย่อยท้าย 3.2 | แก้แล้ว | ปากใน composite เป็น `#1A1A22` stroke 2 · ห่วงพวงกุญแจวงกลม cy 123 r 3 (ขอบบน y 120 = `hip_charm`) · raincoat front 38–90 |
| R-4 ย้าย style tile | แก้แล้ว | มีอยู่ที่ `art/ref/style-tile/{style-tile.svg, contact-sheet-1x.svg, README.md}` · ไม่มีไฟล์ใดเหลือใต้ `art/assets/ui/` แล้ว |
| R-5 ย้าย master key color | แก้แล้ว | `art/src/avatar/{body/base, hair/buzz, hair/long-straight, pose-hand/base}.svg` · ค้น key color ทั้งชุดใน `art/assets/` ได้ 0 ครั้ง |
| manifest | ผ่าน (V1, V2, V8, V11 และ V3 ส่วนที่ตรวจได้) | `art/assets/manifest.json`: 14 entry เรียงตาม id · `files[].path` ที่ขึ้นต้นด้วย `art/` ใช้กับ master ชั่วคราวและ `ref.*` ตาม asset-pipeline 6.6 บรรทัด 213 · ไฟล์ใน `art/assets/` มี 9 SVG และทุกไฟล์ถูกอ้าง (V11) · V8 ได้ 0 ครั้ง · `width`/`height` ตรงขนาด sheet · `ref.avatar.composite-f03` มี `shipped: false` · `bytes`/`sha256` ยังไม่ได้คำนวณซ้ำ (เหตุผลเดียวกับรอบ 1) |

## R2-4. สิ่งที่พบใหม่ใน diff

**V-18 แสงเงาล้นออกนอกเส้นรอบนอก (artist-2d)** — ต้นเหตุคือแถบ `top`/`right`/แถบล่างใช้ `rx` ค่าเดียวกับก้อนฐาน ตามกฎ SVG เมื่อไม่ได้ใส่ `ry` ค่า `ry` จะเท่ากับ `rx` แล้วถูกบีบลงเหลือครึ่งหนึ่งของความสูงแถบ มุมของแถบที่เตี้ยจึงแบนกว่ามุมของก้อนฐาน และยื่นออกนอกเส้นรอบนอก (เส้นกลบไว้ได้แค่ 1 px ด้านนอก)

| ก้อน | element | ตรวจที่ | แถบกว้าง | ก้อนฐานกว้าง | ล้นออกนอกเส้นต่อข้าง |
| --- | --- | --- | --- | --- | --- |
| หัว แถบล่าง | `rect x34 y72 w60 h6 rx26` (ry → 3) | y 75 | 34–94 | 47.9–80.1 | ~13 px สี `right` ของผิว |
| หัว แถบบน | `rect x34 y20 w60 h20 rx26` (ry → 10) | y 30 | 34–94 | 39.5–88.5 | ~4.5 px สี `top` |
| หมวก crown แถบล่าง | `rect x34 y30 w60 h4 rx14` (ry → 2) | y 32 | 34–94 | 40.5–87.5 | ~5.5 px (ทับปีกหมวก) |
| raincoat ชายล่าง | `rect x38 y134 w52 h6 rx12` (ry → 3) | y 137 | 38–90 | 42.1–85.9 | ~3 px |

ใน composite แขนเสื้อ raincoat และผมบังไปบางส่วน แต่ที่ y 72–74 ยังเห็นเป็นติ่งสีเข้มสองข้างขากรรไกร และถ้าดู `body` อย่างเดียว (ร่างตั้งต้นที่ยังไม่ใส่ชุด) จะเห็นเป็นแถบกว้าง 60 px ใต้คาง ปัญหานี้ขัด style guide 6.2 เพราะเส้นรอบนอกต้องเป็นขอบนอกสุดของก้อน

วิธีแก้: ครอบแถบแสงเงาและไฮไลต์ของแต่ละก้อนด้วย `<g clip-path="url(#<g-id>-<ก้อน>)">` โดย `<clipPath>` ใช้ rect เดียวกับก้อนฐาน (asset-pipeline 4.1 อนุญาต `clipPath` ภายในไฟล์) แล้ววาดเส้นรอบนอกไว้นอก `<g>` นั้นเป็นลำดับสุดท้ายเหมือนเดิม · เงื่อนไขตรวจ: ไม่มีพิกเซลที่ไม่ใช่ `ink.900` อยู่นอกเส้นรอบนอกของก้อน · ทำกับทุกไฟล์ใน `art/assets/avatar/` และ `art/src/avatar/` แล้วสร้าง composite ใหม่

**V-19 composite ยังไม่ครบ 3 view (artist-2d)** — เพิ่มแถว `side` และ `back` ขนาดและพื้นหลังเดียวกับแถว front (avatar-spec 12) · แผง "การ์ดกลางคืน" ให้วางแผ่น `bg.surface` บนพื้น `bg.night` ตามจริง ไม่ใช่แผ่นขาวเดี่ยวๆ

**V-20 แก้คำสั่งของผู้ตรวจเองในรอบ 1 ข้อ 3.7b (uiux-designer)** — ขอบ `ink.300` #9999AA ของ `.toast.faded` มี L = 0.3247 ได้ 2.80:1 กับ `bg.surface` และ 2.64:1 กับ `bg.paper` ต่ำกว่า S3 (3:1) · ให้เปลี่ยนขอบเป็น `ink.500` #555566 (≥ 7:1) ข้อความคง `ink.700` และไม่มีเงาเหมือนเดิม ความ "จาง" ยังอ่านออกจากการไม่มีเงาและขอบที่อ่อนกว่า `ink.900` · แก้ใน components.md หัวข้อ 6 และ style.css บรรทัด 114

## R2-5. ทำไม V-18 ถึง V-20 ไม่ขวาง gate นี้

- เกณฑ์ re-run ในหัวข้อ 5.1 ครบแล้ว: ข้อที่สั่งแก้ใน V-01 ถึง V-03 ทุกข้อแก้ตรงตามที่สั่งพร้อมหลักฐาน (หัวข้อ R2-1 ถึง R2-3)
- V-18 ไม่กระทบจุดประสงค์ของ placeholder คือตำแหน่ง anchor ขนาด และลำดับ layer ซึ่งถูกต้องทุกไฟล์ · entry ยังเป็น `placeholder` ซึ่ง production แสดง fallback (asset-pipeline หัวข้อ 10 แถว `placeholder`) ผู้เล่นจึงไม่มีทางเห็น · วิธีแก้เป็นงานเชิงกลที่ไม่ต้องตัดสินใจเรื่องออกแบบ ถ้าส่งต่อให้ HUMAN ก็ไม่มีข้อมูลใหม่ให้ตัดสิน
- V-19 ผู้ตรวจยืนยัน side/back จากพิกัดครบแล้ว composite ที่ขาดเป็นแค่เครื่องมือช่วยตรวจ
- V-20 เป็นความผิดของผู้ตรวจ toast นี้กดไม่ได้ และความหมายมาจาก icon + ข้อความ `ink.700` (S4) wireframe เป็น HTML static ที่ไม่ได้ส่งถึงผู้เล่น
- เงื่อนไข: V-18 และ V-19 ต้องเสร็จก่อนที่ `ref.avatar.composite-f03` จะเปลี่ยนเป็น `approved` และก่อนงานแรกของ Phase 2 ที่ใช้ไฟล์ avatar เหล่านี้เป็นต้นแบบ (rasterizer หรือ build avatar) · V-20 ต้องเสร็จก่อน build `.toast` จริงใน F04

## R2-6. ผลต่อสถานะ

- `ref.style-tile.v1`: art-director **อนุมัติ** ตามเกณฑ์ในหัวข้อ 5.1 · writes ของ task นี้มีแค่ไฟล์ review จึงส่งต่อให้ artist-2d เปลี่ยน `status` เป็น `approved` ใน manifest (เนื้อหาไฟล์ไม่เปลี่ยน)
- entry avatar 12 รายการยังเป็น `placeholder` · `ref.avatar.composite-f03` ยังเป็น `draft` จนกว่า V-18 และ V-19 จะเสร็จ
- งานไม่บังคับของรอบ 1 (V-10, V-12 ถึง V-17) และงานของ art-director (F-AD-1 ถึง F-AD-4) ยังเปิดอยู่ตามเดิม · รอบนี้เพิ่ม V-18 ถึง V-22

| id | ถึง | ต้องทำ | เมื่อไร |
| --- | --- | --- | --- |
| V-18 | artist-2d | clipPath แสงเงาทุกก้อน (R2-4) | ก่อน composite approved และก่อนงาน avatar แรกของ Phase 2 |
| V-19 | artist-2d | composite เพิ่ม `side`/`back` และแผงการ์ดบน `bg.night` | รวมกับ V-18 |
| V-20 | uiux-designer | `.toast.faded` ขอบ `ink.500` | ก่อน build toast ใน F04 |
| V-21 | vfx-animator | แถว Rare เขียนวิธีทำ "ขอบกะพริบ" แบบไม่ใช้ filter/opacity | งานแก้ motion ครั้งถัดไป |
| V-22 | uiux-designer | `.gps-pill` ตัวอักษร ≥ 14 px | ก่อน build header ใน F04 |
| — | artist-2d | manifest `ref.style-tile.v1` `status` → `approved` | งานถัดไปของ artist-2d (รวมกับ V-18 ได้) |

