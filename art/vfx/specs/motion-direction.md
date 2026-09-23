# Motion Direction — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T27 · เจ้าของ: vfx-animator · สถานะ: ฉบับเสนอ รอ content gate (visual) P1-F03-T22 และ design gate B P1-F03-T25 · วันที่: 2026-09-23
แหล่งอ้างอิง: `art/direction/style-guide.md` หัวข้อ 9.1 (ตีบวก), 9.3 (รอยแยกบนแผนที่) · `art/direction/icon-grammar.md` หัวข้อ 4 (rarity 4 ช่องทาง) และ 4.5 (ข้อห้าม motion ของ rarity) · `art/direction/map-style.md` หัวข้อ 7, 8, 11 (รอยแยกเป็นภาพนิ่ง, ห้าม animation ต่อเนื่องบนแผนที่) · `audio/direction.md` และ `audio/cue-list.md` (vibration-first, ระดับความเร่งด่วน, priority) · `design/ux/flows/F03-core-loop.md` หัวข้อ 4.2–4.5, 4.8 · `design/ux/components.md` หัวข้อ 6, 7, 9 · `design/pillars.md` P4 (มือถืออยู่ในกระเป๋า, ห้าม animation ต่อเนื่องบนแผนที่), P5 (โทนแห้ง กวน ไม่ดราม่า) · `config/content/copy.th.json` (`run.*`, `qc.*`, `rarity.*`, `dungeon.*`) · GDD "โทนและภาษาในเกม", "HP การตาย และการฟื้นฟู", "ระบบตีบวก"
ลำดับอำนาจ: GDD > pillars.md > style-guide.md/icon-grammar.md/map-style.md (ตัดสินภาพแล้ว) > audio/direction.md (ตัดสินเสียง/สั่นแล้ว) > เอกสารนี้ · เอกสารนี้ไม่แก้ timing หรือ pattern ที่ audio ตัดสินไปแล้ว มีหน้าที่ "เดินตามจังหวะเดียวกัน" เท่านั้น

## สารบัญ
1. หลักการ motion 4 ข้อ
2. งบ motion และกฎเทคนิค (แบต, visibility, prefers-reduced-motion, ห้าม animation บนแผนที่)
3. ตารางช่วงเวลามาตรฐาน (feedback / reveal / เพดานบล็อก input)
4. การไล่ระดับ rarity 5 ระดับ
5. Quick-command emote 10 ตัว
6. จังหวะ HP ต่ำ / auto-retreat / ตาย
7. ระบบตีบวก (enhance) — ตลกแบบเจ็บแสบ ไม่ใช่โศกนาฏกรรม
8. รอยแยกบนแผนที่ — ทำไมไม่มี motion บนแผนที่ และ "จังหวะ rift ช้า frame ต่ำ" อยู่ที่ไหนแทน
9. ตารางโยง cue id / vibration / motion
10. แนวทาง implementation และการวัด
11. สรุป Do / Don't
12. สมมติฐาน คำถามค้าง และส่งต่อ

## 1. หลักการ motion 4 ข้อ

1. **งบแบตมาก่อนความสวย** — motion ทำงานเฉพาะตอนจอเห็น (`document.visibilityState === "visible"`) หยุดและ cancel ทันทีที่ `visibilitychange` เป็น hidden ไม่มี animation ใดวนไม่จบ โดยเฉพาะบนแผนที่ที่ห้ามเด็ดขาด (pillars P4)
2. **รู้ได้แม้ไม่ได้ดูจอ** — motion เป็นชั้นเสริมเสมอ เหมือนหลักการเสียง/สั่นใน `audio/direction.md` หัวข้อ 10 (ยิงทุกชั้นพร้อมกัน ไม่ใช่ conditional) ไม่มี moment ใดที่ผู้เล่น "ต้องเห็น motion ถึงจะเข้าใจผล" — ข้อมูลจริงมาจาก visual คงที่ (สี ตัวเลข ข้อความ icon) เสมอ motion แค่ทำให้รู้เร็วขึ้นและรู้สึกดีขึ้น
3. **rarity ไม่ใช้ motion เป็นช่องทางเดียว** (icon-grammar 4.5) — rarity มี 4 ช่องทางคงที่อยู่แล้ว (สี, pip, ขอบ, มุมตกแต่ง) motion เป็นช่องทางเสริมที่ 5 (คู่กับเสียง/สั่นที่เป็นช่องทางที่ 6) ห้ามใช้ความโปร่งใส ประกาย (sparkle/glitter) หรือ animation วนเพื่อ "บอกระดับ" — ทุก motion ของ rarity เป็นแบบเล่นจบครั้งเดียว (one-shot) ไม่ใช่ loop
4. **โทนตรงกับ copy เสมอ** — ตาย/auto-retreat แห้ง ไม่ดราม่า ไม่ปลอบ (P5, style guide 1) · enhance กวนแบบใบเสร็จ ไม่ใช่การพนัน ไม่มีภาพของแตก (style guide 9.1, N-5) · rarity สูงขึ้น escalate ได้ แต่ห้าม suspense เทียมแบบสล็อต (ต้องรู้ผลทันทีที่ server รู้ผล ไม่ delay เพื่อสร้างความลุ้น — ตรงกับ `audio/direction.md` หัวข้อ 8)

## 2. งบ motion และกฎเทคนิค

**Engine ที่อนุญาต** (D-001 ต้นทุนศูนย์ ไม่มี CDN ไม่มี library เสียเงิน):
- CSS `@keyframes` / `transition` — ค่าเริ่มต้นสำหรับ feedback และ reveal ส่วนใหญ่ (คอมไพล์ได้ล่วงหน้า ฟรี ไม่มีโค้ด JS ต่อเฟรม)
- Web Animations API (WAAPI, `element.animate()`) — ใช้เมื่อ timing ต้องเริ่มพอดีกับ event จาก server/cue (auto-retreat, ตาย, legendary reveal หลายจังหวะ, quick-command emote) เพราะต้อง `cancel()` ได้แน่นอนตอน `visibilitychange` และไล่ตาม keyframe หลายช่วง
- Canvas 2D module ขนาดเล็ก — สงวนไว้เฉพาะ legendary reveal's "shard burst" (หัวข้อ 4) ที่ pattern เป็นเส้นเรขาคณิตยิงออกจากจุดศูนย์กลาง ถ้า CSS/WAAPI ทำภาพเดียวกันได้ (เช่นด้วย pseudo-element หลายตัว) ให้เลือกอันนั้นก่อนเสมอ
- ห้าม animation library ภายนอก (GSAP ฯลฯ) และห้าม sprite sheet ที่ไฟล์ใหญ่เกินงบ (ดูเพดานไฟล์ท้ายหัวข้อนี้)

**Property ที่ใช้ได้เท่านั้น** (compositor-only บนมือถือส่วนใหญ่ ไม่ trigger layout/paint ซ้ำทุกเฟรม): `transform` (translate/scale/rotate), `opacity` · `filter` ใช้ได้เฉพาะจุดที่ระบุไว้ชัด (legendary เท่านั้น, ความเข้มต่ำ) เพราะเป็น paint-heavy บนมือถือรุ่นล่าง · ห้ามแก้ `width/height/top/left/margin` แบบต่อเนื่องเพราะ trigger layout reflow

**กฎ visibility (บังคับทุก effect ไม่มีข้อยกเว้น):**
- subscribe `visibilitychange` เสมอ hidden → `cancel()`/`pause()` ทันที ไม่ปล่อยให้เล่นค้างเบื้องหลัง
- กลับมา visible → เริ่ม effect นั้นใหม่ตั้งแต่ต้น ไม่ไล่ตามเวลาที่หายไป (ไม่ seek ไปกลางคัน) ยกเว้น effect ที่ตั้งใจ "ค้าง" อยู่แล้วแบบไม่มี motion ต่อ (เช่น toast อันตรายที่ค้างจนกว่าผู้เล่นตัดสินใจ — กลับมาเห็นก็เห็นสถานะนิ่งเดิม ไม่ต้อง replay)
- ห้าม `setInterval`/`requestAnimationFrame` วนไม่จบทุกกรณี (ตรงกับกฎเดียวกันของแผนที่ใน `map-style.md` หัวข้อ 11) ทุก effect เป็น finite one-shot ยกเว้นที่ระบุไว้ชัดว่าเป็น idle breathing งบต่ำมาก (หัวข้อ 8)

**prefers-reduced-motion (บังคับทุก effect มี reduced variant):**
- ตัด `transform` (translate/scale/rotate) ทั้งหมด เหลือแค่ `opacity` cross-fade ≤150 ms หรือสลับสถานะทันที (0 motion ก็ยอมรับได้)
- ข้อมูลที่สื่อสารต้องอ่านได้ครบเหมือนเดิมทุกกรณี (สี ตัวเลข ข้อความ ตำแหน่ง icon คงที่ ไม่หายไปพร้อม motion)
- ตรวจด้วย `window.matchMedia("(prefers-reduced-motion: reduce)")` ที่ต้น module ทุกตัว ไม่ใช่เช็คทีละจุดเรียก

**ห้าม animation ต่อเนื่องบนแผนที่ (MapLibre canvas):** ห้ามทุกกรณี ไม่มีข้อยกเว้น (pillars P4, `map-style.md` หัวข้อ 11) — รายละเอียดและที่ที่ "จังหวะ rift" ไปอยู่แทนอยู่ในหัวข้อ 8

**เพดานบล็อก input:** ไม่มี motion ใดกันการกดปุ่มถัดไปเกิน 1.5 วินาที ปุ่มออก/ปุ่มยืนยันกดได้เสมอระหว่าง motion กำลังเล่น ยกเว้นช่วง legendary reveal ที่ยาวสุดในงบ reveal (1200 ms) ซึ่งยังต่ำกว่าเพดาน 1.5 วิ

**เพดานขนาดไฟล์ (D-001):** ไฟล์ CSS/JS/JSON ต่อ effect module ≤20 KB (ก่อน gzip) ไม่มี asset ภาพ raster สำหรับ motion (ใช้ shape/CSS ล้วน ยกเว้น icon ที่มีอยู่แล้วจาก artist-2d)

## 3. ตารางช่วงเวลามาตรฐาน

งบตามกฎ role: feedback 150–300 ms, reveal 600–1,200 ms, ไม่บล็อก input เกิน 1.5 วิ ตารางนี้คือค่าเริ่มต้นให้ effect ใหม่ทุกตัวอ้างก่อนคิดใหม่เอง

| ประเภท motion | ตัวอย่าง | ช่วงเวลา | easing | engine |
| --- | --- | --- | --- | --- |
| Tap feedback | ปุ่มกด, toggle | 100–150 ms | ease-out, scale 1→0.97→1 | CSS |
| Toast เข้า/ออก | `run.tickGranted/Denied`, `run.autoPotionUsed` | เข้า 150 ms / ค้างตามเนื้อหา / ออก 200 ms | ease-out (เข้า), ease-in (ออก), translateY 8px + opacity | CSS |
| Banner เข้า/ออก | `run.stateGrace/Suspended` | เข้า 200 ms / ออก 150 ms | ease-out, opacity + translateY 4px | CSS |
| HP bar เปลี่ยนค่า | ทุกครั้งที่ server ส่งค่าใหม่ | 200 ms | ease-out, `.hp-fill` width tween จากค่าเก่า→ค่าใหม่ที่รู้แล้ว (ไม่เดา ไม่ interpolate ค่าที่ยังไม่รู้ ตรงกับ components.md 7) | CSS |
| Drop reveal — Common | `drop.rarity.common` | 220 ms | ease-out, scale 0.92→1.04→1 | CSS |
| Drop reveal — Uncommon | `drop.rarity.uncommon` | 350 ms | ease-out, 2 จังหวะ | CSS |
| Drop reveal — Rare | `drop.rarity.rare` | 450 ms | ease-out overshoot เบา, 3 จังหวะ | CSS |
| Drop reveal — Epic | `drop.rarity.epic` | 550 ms | ease-out overshoot, 3 จังหวะ + จบยาว | WAAPI |
| Drop reveal — Legendary | `drop.rarity.legendary` | 900–1,200 ms | ease-out overshoot + settle, 4 จังหวะ + จบยาว + shard burst | WAAPI (+Canvas ถ้าจำเป็น) |
| Auto-retreat sequence | `run.autoRetreat` | รวม ≤700 ms | ดูหัวข้อ 6 | WAAPI |
| Death sequence | `run.death` | รวม ≤900 ms | ดูหัวข้อ 6 | WAAPI |
| Enhance result | success / fail | 300–400 ms | ease-linear (จำลองเครื่องพิมพ์ใบเสร็จ) | CSS |
| Quick-command emote | `qc.*` (10 ตัว) | ≤1,200 ms ต่อตัว | ดูหัวข้อ 5 | WAAPI |
| Rift idle breathing (การ์ด UI นอกแผนที่) | ไอคอนรอยแยกในรายการ/การ์ด | รอบละ 4,000 ms (opacity 0.85↔1.0) | linear, loop เบามาก | CSS |

## 4. การไล่ระดับ rarity 5 ระดับ

ที่มา: `icon-grammar.md` หัวข้อ 4 — rarity มี 4 ช่องทาง visual คงที่อยู่แล้ว (สี, จำนวน pip, ความหนา/ชั้นขอบ, มุมตกแต่ง) แม้ตัด motion และเสียงออกหมด ผู้เล่นยังอ่าน rarity ได้ครบจากภาพนิ่ง motion ในหัวข้อนี้เป็นแค่ **ช่องทางเสริมที่ 5** ที่ต่อยอดจาก `run.tickGranted` เสมอ (ตาม `audio/cue-list.md` หัวข้อ 2: "กฎการต่อยอด")

**หลักการเลือกจำนวนจังหวะ (beat):** ให้จำนวนจังหวะ visual เท่ากับจำนวนจังหวะใน `vibration_ms` ของ cue เดียวกันใน `audio/cue-list.md` เพื่อให้ตา/สั่น/เสียงสอดคล้องกันโดยไม่ต้องออกแบบจังหวะใหม่ซ้ำซ้อน — ผลคือ motion ไม่ใช้ความโปร่งใสหรือประกาย (sparkle) เป็นตัวบอกระดับตามข้อห้ามใน icon-grammar 4.5 แต่ใช้ "จำนวนจังหวะ" ที่ตรงกับสั่น/เสียงอยู่แล้วแทน

| ระดับ | จังหวะ (อ้าง `vibration_ms`) | motion | ระยะเวลารวม | สิ่งที่ห้าม |
| --- | --- | --- | --- | --- |
| Common | 1 จังหวะ `[45]` | icon กรอบ rarity pop เข้า (scale 0.92→1.04→1) ไม่มี particle ไม่มี effect เพิ่มจาก toast ปกติ | 220 ms | ไม่มี motion เพิ่มเติมใด ๆ (ตั้งใจให้ "ไม่เด่น" ตาม cue-list) |
| Uncommon | 2 จังหวะ `[45,70,45]` | icon pop + ขอบกรอบกะพริบสว่างขึ้น 2 ครั้ง (brightness pulse ผ่าน `filter: brightness()` สั้น ไม่ใช้ opacity/transparency ของภาพ icon เอง) | 350 ms | sparkle/glitter particle, loop |
| Rare | 3 จังหวะ `[45,70,45,70,45]` | icon pop + ขอบกะพริบ 3 ครั้งไล่สว่างขึ้น + เส้นมุมตกแต่ง (แถบสามเหลี่ยม 2 มุม) ลากเข้าที่แบบ stroke reveal 80 ms ต่อมุม | 450 ms | build-up ก่อนเฉลย (ต้องเห็นกรอบเต็มทันทีที่ผลออกจาก server ไม่หน่วง) |
| Epic | 3 จังหวะ + จบยาว `[45,60,45,60,45,60,90]` | เหมือน Rare แต่มุมตกแต่งครบ 4 มุมลากเข้าไล่ตามเข็มนาฬิกา + จังหวะสุดท้ายมีการ "ค้าง-เรือง" เบา 90 ms ปิดท้าย | 550 ms | fanfare ภาพเต็มจอ, screen flash แรง |
| Legendary | 4 จังหวะ + จบยาว `[45,60,45,60,45,60,45,60,180]` | เหมือน Epic + ดาว 4 แฉกที่มุมกาง (scale+rotate เบา) ทีละมุม + shard burst เส้นตรงสั้น 8–12 เส้นยิงออกจากศูนย์กลาง (Canvas หรือ pseudo-element ชุดเดียว) จบด้วยกรอบทั้งหมด "นิ่งเต็มความสว่าง" ค้างไว้ | 900–1,200 ms (นี่คือ effect เดียวที่ยาวเกินเพดาน reveal ปกติได้ตามกฎ role "Legendary เป็นเสียงเดียวที่ดังได้") | มงกุฎ รัศมี ฉัตร สีทองเมทัลลิก (style guide 8.2, icon-grammar 4.5), screen shake, slow-motion ทั้งจอ, เสียง fanfare วงใหญ่ |

กฎร่วมทุกระดับ: เมื่อ tick เดียวได้หลาย rarity พร้อมกัน เล่น motion ของ rarity สูงสุดเท่านั้น (ตรงกับกฎ audio ต่อยอดข้อเดียวกัน) ไม่ซ้อนหลาย pattern · reduced-motion ตัดทุกจังหวะเหลือแค่กรอบ rarity ปรากฏทันที (opacity 0→1, 100 ms) ข้อมูล rarity อ่านได้ครบจากภาพนิ่งเหมือนเดิม

## 5. Quick-command emote 10 ตัว

ที่มา: GDD "Quick command", `icon-grammar.md` หัวข้อ 7.2 (glyph), `config/content/copy.th.json` (`qc.*`) — เหตุผลที่ต้องออกแบบ motion ให้แยกกันชัดเจน: `audio/cue-list.md` หัวข้อ 3 ใช้ **cue เสียง/สั่นเดียวกันทุกคำสั่ง** (`qc.sent`/`qc.received`, `vibration_ms [15]`, tap เบาแบบเดียวกันทั้ง 10 คำสั่ง เพราะ "เนื้อความอ่านจาก UI ไม่ใช่จากเสียง") — motion + glyph + ข้อความจึงเป็น **ช่องทางหลักช่องทางเดียว** ที่แยกว่าใครส่งคำสั่งอะไร ไม่ใช่ช่องทางเสริมเหมือน rarity

กติการ่วมทุกตัว: เล่นที่การ์ด/แถบสถานะผู้เล่นในพาเนล party ของ `S-03-run` (ไม่ใช่บนแผนที่ เพราะไม่แสดงตำแหน่งผู้เล่นอื่น NN-4) · one-shot ไม่ loop · อ่าน silhouette ออกได้ที่ 64 px แม้ปิดสี (deutan-safe เหมือนกฎ icon-grammar 6) · แต่ละตัวมี "ลายเซ็นจังหวะ" ต่างกัน (จำนวนจังหวะ, ทิศทาง, ความเร็ว) ไม่ใช่แค่ต่างสี

| คำสั่ง | copy key | glyph (icon-grammar) | motion concept | ระยะเวลา | ท่าโพสอวตารที่ต้องมี (ส่งต่อ artist-2d) |
| --- | --- | --- | --- | --- | --- |
| มาแล้วจ้า | `qc.arrived` | มือโบก + เส้นเคลื่อนไหว 2 เส้น | มือโบกกวัดแกว่ง ±15° 2 รอบ (rotate) เข้าจังหวะเร็ว-ช้า-หยุด | 700 ms | ยกมือโบก ยิ้ม เอนตัวไปข้างหน้าเล็กน้อย |
| กำลังไป รอแป๊บ | `qc.onMyWay` | รอยเท้า + นาฬิกาเล็ก | รอยเท้า 2 อันปรากฏสลับซ้าย-ขวาไล่ตามกัน (translateX แบบ step) นาฬิกาเล็กกะพริบเข็มครั้งเดียว | 900 ms | ท่าเดินเอนตัวไปข้างหน้า มือแกว่ง |
| ไปต่อ | `qc.goOn` | ลูกศรหนาชี้ขวา | ลูกศรลื่นเข้าจากซ้ายแล้วสะบัดหยุดกะทันหัน (ease-out แรง ไม่มี overshoot) — สั้นและเด็ดขาดตรงกับความหมาย | 400 ms | ท่าชี้มือไปข้างหน้าอย่างมั่นใจ |
| ขอเลือดหน่อย | `qc.needHeal` | หยด HP + ลูกศรขึ้น | หยด HP เด้งขึ้น 6 px 2 ครั้ง (bounce) ลูกศรขึ้นตามหลังแบบ nudge เบา — อุ่นแต่ไม่ตื่นตระหนก | 800 ms | มือเหยียดออกขอ ตัวเอนเล็กน้อย |
| เลือดจะหมดแล้ว | `qc.hpCritical` | หยด HP ครึ่งหยด + ! | เขย่าซ้าย-ขวาเร็ว 3 ครั้ง (amplitude มากกว่า needHeal, เร็วกว่า) แล้วหยุดนิ่งทันที ไม่มีจอสั่นทั้งจอ | 600 ms | ท่าเซ ถือแขนอีกข้าง (ไม่ใช่ท่าล้ม — ห้ามดูดราม่าเกิน) |
| ช่วยบังหน่อย | `qc.needCover` | โล่ outline (ไม่มีวงกลมพื้น) | โล่เลื่อนขึ้นจากล่างแล้ว "ล็อกเข้าที่" ด้วย settle-bounce เบา (เหมือนกลไกขึ้นล็อก) | 500 ms | ท่าย่อตัวก้มหลบด้านหลังโล่ |
| ขอพักแป๊บ | `qc.needBreak` | แก้วน้ำมีหลอด | แก้วเอียงจิบครั้งเดียว (rotate 8° แล้วคืน) ช้าที่สุดในชุด ease-in-out นุ่ม ไม่มี snap | 900 ms | ท่านั่ง/พิงเอนสบาย |
| ขอถอยก่อนนะ | `qc.retreating` | ประตูเปิด + ลูกศรออก | ประตูหมุนเปิด 0→35° แล้วลูกศรเลื่อนออกทางช่องประตู | 700 ms | ท่าก้าวถอยหลังผ่านช่องประตู |
| ของออกแล้ว | `qc.goodDrop` | กล่องเปิด + เส้นประกายตรง 3 เส้น | ฝากล่องเปิด (rotate −25°) พร้อมเส้นตรง 3 เส้นลาก stroke ออกแนวรัศมี (ไม่ใช่ glitter/dust ตามที่ glyph อนุญาตไว้แล้วว่าเป็นเส้นตรง) | 500 ms | ท่าชูของ/ปั้มกำปั้นเบา ๆ ไม่ฉลองเกินเหตุ |
| ขอบคุณ | `qc.thanks` | นิ้วโป้งชู | นิ้วโป้งเด้งขึ้น scale 0.8→1.1→1 ครั้งเดียว สั้นที่สุดในชุด | 350 ms | ท่าชูนิ้วโป้ง ยิ้มเล็กน้อย |

หมายเหตุ: ท่าโพสอวตารในตารางเป็นทิศทางล่วงหน้า ยังไม่ใช่ sprite จริงเพราะ `art/direction/avatar-spec.md` (P1-F03-T11) ยังไม่เสร็จ (ดูสมมติฐานหัวข้อ 12) — คอลัมน์ motion concept ใช้ได้ทันทีกับ glyph 2D ที่มีอยู่แล้วใน `icon-grammar.md` โดยไม่ต้องรออวตาร

## 6. จังหวะ HP ต่ำ / auto-retreat / ตาย

หลักร่วม: แห้ง ตรงไปตรงมา ไม่ปลอบ ไม่ตกใจเกินจริง (P5, style guide 1) — จังหวะภาพต้อง "เดินตาม" จังหวะสั่น/เสียงที่ `audio/cue-list.md` ตัดสินไปแล้วเป๊ะ ไม่ออกแบบจังหวะใหม่คนละอันจากภาพ

### 6.1 HP ต่ำ (`run.hpLow`, ชั้นเร่งด่วน "เตือน", `vibration_ms [80,80,80,80,80]`)
- toast อันตราย (`.toast.danger` ตาม components.md 6) เข้าจอด้วย motion มาตรฐาน (translateY 8px + opacity, 150 ms)
- ขณะเข้าจอ ตัวเลข %HP หรือ icon หยดเลือดบน toast เต้น (scale 1→1.06→1) **3 ครั้ง** ให้ตรงกับ 3 จังหวะการสั่น จังหวะห่างเท่ากัน (80 ms สั่น + ช่องว่างตามจริงจาก pattern) รวม ~350 ms
- จบ 3 จังหวะแล้ว **หยุดนิ่งสนิท** ไม่ pulse ต่อเนื่อง (toast ค้างอยู่จนกว่าผู้เล่นตัดสินใจหรือ HP เปลี่ยนสถานะ ตามกฎเดียวกับที่ห้าม animation วนเพื่อประหยัดแบตระหว่างค้างนาน)
- ไม่ใช้สีแดงกะพริบเป็น loop, ไม่ใช้ไอคอนเตือนแบบ error/กากบาท (ตรงกับ icon-grammar ที่ห้ามกากบาทแดงกับ gate-miss อยู่แล้ว ใช้หลักเดียวกัน)

### 6.2 Auto-retreat (`run.autoRetreat`, ชั้น "วิกฤต", `vibration_ms [100,80,100,80,100,80,350]`, ≈600 ms)
ความหมาย: ระบบดึงผู้เล่นออกเอง ของอยู่ครบ ไม่ใช่บทลงโทษ — motion ต้องรู้สึกเหมือน "ถูกดึงตัวออกอย่างสุภาพ" ไม่ใช่ถูกเหวี่ยงหรือถูกลงโทษ
1. 3 จังหวะแรก (ตาม `[100,80,100,80,100]`): กรอบ HP bar/สถานะ nudge สั้น (translateY −3px แล้วคืน) 3 ครั้งไล่เร็วขึ้นเล็กน้อยให้ตรงกับความรู้สึก "ถูกดึง" ที่ audio direction อธิบายไว้ — ไม่ shake ทั้งจอ ไม่ zoom กล้อง
2. จังหวะสุดท้าย (`350`): เล่นพร้อมกับ transition เปลี่ยนหน้าจอจริงจาก `S-03-run` ไป `S-04-run-summary` — ใช้ slide-up หรือ cross-fade ธรรมดา 300–350 ms (ease-out) ไม่ใช่ effect ตกแต่ง เป็นการเปลี่ยนหน้าจอตามจริงที่ต้องเกิดอยู่แล้ว
3. toast ข้อความ `[run.autoRetreat]` ปรากฏพร้อมขั้นตอนที่ 1 และคงอยู่ข้าม transition ไปจนถึงหน้าสรุป
4. **ห้ามเด็ดขาด:** screen shake, vignette แดง, slow-motion, camera zoom, เสียง/ภาพแบบ "แพ้" — บทสรุปคือข้อเท็จจริง ไม่ใช่ความพ่ายแพ้

### 6.3 ตาย (`run.death`, ชั้น "วิกฤต" หนักสุด, `vibration_ms [150,120,600]`, ≈750–900 ms)
ความหมาย: ของหายทั้งหมด หนักกว่า auto-retreat ชัดเจน แต่ยังต้องแห้งและตรงไปตรงมา ไม่ใช่โศกนาฏกรรม — ผู้เล่น**ยังอยู่หน้าเดิม** `S-03-run` ระหว่างรอฟื้น (flow 4.5 ข้อ 4) จึงไม่มี screen transition ใด ๆ ในจังหวะนี้ ต่างจาก auto-retreat ชัดเจนแม้ในทาง motion
1. จังหวะสั้นแรก (`150`): HP bar fill ตัดลงมาที่ 0 แบบ hard-cut ทันที (ไม่ใช่ไล่ลดแบบ drain ช้า ๆ) เพราะค่าจาก server เป็น 0 อยู่แล้วตอนที่ client รู้ผล (server-authoritative, components.md 7) — ไม่มี "ค่อย ๆ ตาย" ให้ดูดราม่า
2. ช่วงเงียบ (`120`): ไม่มี motion เพิ่ม
3. จังหวะยาวปิดท้าย (`600`): กรอบ/แถบ HP ที่ตัดไปแล้วค่อย ๆ desaturate จากสี `state.success/danger` ไปเป็นโทน `ink` เรียบ (ผ่าน CSS `filter: grayscale()` ไล่ 0→1) ตลอด 600 ms ให้ความรู้สึก "หยุดทำงาน" แบบเรียบ ไม่ใช่ "พังทลาย"
4. เมื่อจบจังหวะยาว (600 ms) ตัวเลือกฟื้น 3 ทาง (`run.death.usePotion`, `run.death.waitRecover`, ตัวเลือก Support) fade เข้า 200 ms ถัดจากนั้นทันที
5. **ห้ามเด็ดขาด:** screen shake, แสงแดงเต็มจอ, slow-motion, ตราปั๊ม "GAME OVER" หรือคำแปลไทยแบบนั้น, เสียง/ภาพร้องเจ็บ — สอดคล้อง copy `[run.death]` ที่บอกข้อเท็จจริงตรง ๆ ("คุณตาย ของใน run นี้หายทั้งหมด...")
6. ข้อแตกต่างที่ต้องอ่านออกจาก motion อย่างเดียวแม้ปิดข้อความ: auto-retreat = จอเปลี่ยนหน้า (ออกจาก dungeon), ตาย = จอเดิม HP กลายเป็นสีเรียบ — ตรงกับที่ `audio/cue-list.md` หัวข้อ 5 ตั้งใจแยกสองอันนี้ด้วยรูปทรงจังหวะอยู่แล้ว

## 7. ระบบตีบวก (enhance) — ตลกแบบเจ็บแสบ ไม่ใช่โศกนาฏกรรม

ที่มา: `style-guide.md` หัวข้อ 9.1 ("ตู้ดูดเงินของคนทำเกม"), `audio/direction.md` หัวข้อ 9, `config: enhance.rules.itemCanBreak = false` (N-5) — ขอบเขต: enhance ยังไม่มี copy key ทางการ (เป็นของ feature ตีบวกใน phase ถัดไป) หัวข้อนี้จึงเป็นทิศทางล่วงหน้าเหมือนที่ audio ทำไว้แล้ว ไม่ผูก copy key จริง

**แนวคิดหลัก:** หน้าจอเป็นตู้จ่ายบิล/เครื่องกดคิวธนาคาร (ไม่ใช่ทั่งตีเหล็ก) ผลลัพธ์แสดงเป็น "ใบเสร็จ" — motion จึงเลียนแบบ **เครื่องพิมพ์ใบเสร็จจริง** ไม่ใช่ effect เกมทั่วไป:

1. เมื่อกดปุ่ม "ตีเลย" ผลจาก server กลับมาแล้วทันที (ไม่มี anticipation loop ก่อนเฉลยแบบสล็อต ตรงกับ `audio/direction.md` หัวข้อ 8 และหลัก server-authoritative) — ไม่มีจังหวะ "รอลุ้น" ใด ๆ ในภาพ
2. บรรทัดผลลัพธ์บนใบเสร็จ **เลื่อนลงมาจากขอบบนของกระดาษ** เหมือนเครื่องพิมพ์ป้อนกระดาษจริง (`translateY` จาก −100% ของบรรทัดนั้นมาที่ 0) ระยะเวลา 300–400 ms **`ease-linear`** (ไม่ใช่ ease-out) เพราะกลไกเครื่องพิมพ์จริงเคลื่อนที่ด้วยความเร็วคงที่ ไม่ eased แบบ organic — รายละเอียดเล็กนี้คือส่วนที่ทำให้มันดู "ตลกแบบเจ็บแสบ" (สมจริงเกินไปจนขำ) โดยไม่ต้องมี effect ตกแต่งเพิ่ม
3. **สำเร็จและล้มเหลวใช้ motion รูปแบบเดียวกันทุกประการ** ต่างกันแค่เนื้อหาบรรทัด (เครื่องหมายถูก `state.success` กับรายการของที่เสีย) และเสียง/สั่น (ตาม `audio/direction.md` หัวข้อ 9) — **ห้ามให้ motion เศร้าลงหรือดีขึ้นตามผล** เพราะการทำ motion ต่างกันตามผลจะเริ่มเข้าเงื่อนไข "ดราม่า" หรือ "กระตุ้นแบบพนัน" ทันที ปล่อยให้ตัวเลขและถ้อยคำเป็นคนพูดแทน
4. รายละเอียดขำเล็กน้อยที่อนุญาต: ขอบล่างของ "ใบเสร็จ" มีรอยฉีกซิกแซกอยู่แล้ว (style guide 9.1) — ตอนบรรทัดสุดท้ายพิมพ์เสร็จ ให้ขอบกระดาษสั่นเบา 1 เฟรม (~16 ms, translateX ±2px) เลียนแบบรอยตัดกระดาษจริง เป็น flourish ที่ตัดทิ้งได้ทั้งหมดถ้า reduced-motion (ไม่ใช่ข้อมูลสำคัญ)
5. **สิ่งของ (item icon ในกรอบ rarity) ไม่ขยับ ไม่สั่น ไม่จาง ไม่แตกร้าวเด็ดขาด** ทุกผลลัพธ์ (ตรงกับ N-5 ของไม่มีวันแตก) — เฉพาะตัวเลข gold/วัตถุดิบที่ลดลงเท่านั้นที่ tween ตัวเลข (−N แบบนับถอยสั้น 200 ms) เหมือนกับทุกจุดอื่นที่ลดเงินในเกม ไม่ใช่ effect เฉพาะของ enhance
6. **ห้ามเด็ดขาด:** เสียง/ภาพหมุนสล็อต, เหรียญไหลรัว, ประกายไฟ/พลุ, fanfare เกิน 600 ms, ภาพของแตก/บิ่น/มีรอยร้าว, หน้าจอสั่นสะเทือน — ทุกข้อตรงกับข้อห้ามของ style guide 9.1 และ audio direction หัวข้อ 9

## 8. รอยแยกบนแผนที่ — "จังหวะ rift ช้า frame ต่ำ" อยู่ที่ไหน

**ข้อขัดแย้งที่ต้องชี้แจง:** ถ้อยคำ acceptance ของ task นี้ใน board ("จังหวะ rift บนแผนที่ ช้า frame ต่ำ") อ่านตรงตัวได้ว่ารอยแยกบนแผนที่ควรมี pulse ช้า ๆ แต่ `map-style.md` (P1-F03-T12, DONE, ผ่านมือ art-director แล้ว) หัวข้อ 7 และ 11 กำหนดชัดว่า **รอยแยกเป็นภาพนิ่ง** และ **ห้าม animation ต่อเนื่องบนแผนที่ทุกกรณี ไม่มีข้อยกเว้น** ("ไม่มี icon หมุนหรือเรือง... รอยแยกเป็นภาพนิ่ง") ซึ่งตรงกับ `design/pillars.md` P4 ที่เป็น non-negotiable ("ไม่มี animation ต่อเนื่องบนแผนที่" ระบุเป็นเงื่อนไขละเมิด design gate โดยตรง)

**การตัดสิน (เอกสารนี้เลือกทางที่ไม่ขัด pillar/decision ที่ผ่านไปแล้ว แทนที่จะขอ HUMAN):** ตาม `studio/protocol.md` หัวข้อ 5 "Visual style: art-director, always final within the approved direction" และ map-style.md เป็นเอกสาร DONE ที่ผูกกับเหตุผลแบตเตอรี่ตรง ๆ (spike criterion) — เอกสารนี้ **ไม่แตะ MapLibre canvas เด็ดขาด** รอยแยกบนแผนที่จริงยังคงเป็นภาพนิ่ง 100% ตามเดิม

"จังหวะ rift ช้า frame ต่ำ" ที่ acceptance ต้องการ จึงถูกย้ายไปไว้ใน **ชั้น UI ที่อยู่นอกแผนที่** (ตรงกับที่ `map-style.md` หัวข้อ 11 เขียนไว้เองว่า "เอฟเฟกต์ที่ต้องเคลื่อนไหว...อยู่นอกแผนที่ ในชั้น UI ที่เล่นครั้งเดียวแล้วหยุด...เป็นของ vfx-animator") มี 2 จุดที่ใช้ได้จริง:

1. **ไอคอนรอยแยกในการ์ด/รายการ dungeon** (การ์ดใน `S-01-map` แผงล่าง, หัว `S-02-dungeon-confirm`) — idle breathing งบต่ำมาก: `opacity` 0.85↔1.0 คาบ 4,000 ms เดียว ใช้ CSS `@keyframes` property เดียว (`opacity`) ซึ่งเป็น compositor-only แทบไม่มีต้นทุนแม้เล่นค้างไว้ · ทำงานเฉพาะตอนการ์ดนั้นอยู่ในจอจริง (`IntersectionObserver`) และหยุดที่ `visibilitychange`/`prefers-reduced-motion` เหมือน effect อื่นทุกประการ — **นี่คือ exception เดียวที่ยอมให้ loop ได้** เพราะ (ก) ไม่ได้อยู่บนแผนที่ (ข) ใช้ property เดียวที่เบาที่สุดเท่าที่มี (ค) มีเงื่อนไข visibility ครบ
2. **ไอคอนรอยแยกในหน้า confirm เข้า** (`S-02-dungeon-confirm`) — motion แบบ "รอยแตกกางออก" ครั้งเดียวตอนเปิดหน้า (ไม่ loop): 300 ms แล้วนิ่งค้าง

ส่งเป็น decision เสนอให้ art-director/game-director ยืนยันในหัวข้อ 12 (ไม่ใช่ HUMAN เพราะไม่ใช่คำถามระดับ non-negotiable ที่ขัดกัน แค่เป็นการตีความ acceptance ให้ตรงกับของที่ตัดสินไปแล้ว)

## 9. ตารางโยง cue id / vibration / motion

ทุก cue id มาจาก `audio/cue-list.md` ตรงตัว — เอกสารนี้**ไม่ขอ cue ใหม่** ทุกจังหวะภาพเดินตาม pattern ที่ sound-designer ตัดสินไปแล้ว

| Motion moment | cue id | ชั้นเร่งด่วน / priority | vibration_ms | ระยะเวลา motion | อ้างหัวข้อ |
| --- | --- | --- | --- | --- | --- |
| Tick สำเร็จ | `run.tickGranted` | ปกติ / 5 | `[45]` | 220 ms | §3, §4 |
| Tick ไม่ผ่าน | `run.tickDenied` | นุ่ม / 6 | `[20]` | 150 ms (toast จาง) | §3 |
| HP ต่ำ | `run.hpLow` | เตือน / 2 | `[80,80,80,80,80]` | ~350 ms แล้วนิ่ง | §6.1 |
| Auto-retreat | `run.autoRetreat` | วิกฤต / 1 | `[100,80,100,80,100,80,350]` | ~600–700 ms | §6.2 |
| ตาย | `run.death` | วิกฤต / 0 | `[150,120,600]` | ~750–900 ms | §6.3 |
| เข้า dungeon สำเร็จ | `dungeon.confirmEnter` | ปกติ / 5 | `[30,40,30]` | เปลี่ยนหน้าจอทันที (visual state change เป็น fallback อยู่แล้ว) | — |
| Drop Common | `drop.rarity.common` | ปกติ / 5 | ใช้ของ `run.tickGranted` `[45]` | 220 ms | §4 |
| Drop Uncommon | `drop.rarity.uncommon` | ปกติ / 5 | `[45,70,45]` | 350 ms | §4 |
| Drop Rare | `drop.rarity.rare` | ปกติ / 5 | `[45,70,45,70,45]` | 450 ms | §4 |
| Drop Epic | `drop.rarity.epic` | ปกติ / 5 | `[45,60,45,60,45,60,90]` | 550 ms | §4 |
| Drop Legendary | `drop.rarity.legendary` | ปกติ / 5 (แต่ยาวสุดโดยตั้งใจ) | `[45,60,45,60,45,60,45,60,180]` | 900–1,200 ms | §4 |
| ใช้ยาอัตโนมัติ | `run.autoPotionUsed` | ปกติ / 4 | `[35]` | 150 ms toast | §3 |
| Support ชุบ | `run.revived` | ปกติ / 4 | `[30,50,30,50,60]` | 350 ms (ไล่ขึ้นตรงข้าม death) | §3 |
| ออกนอกเขต (Grace→Suspended) | `run.stateSuspended` | เตือนเบา / 3 | `[60,60,60]` | banner เข้า 200 ms แล้วค้าง | §3 |
| กลับเข้าเขต | `run.stateResumed` | ปกติ / 4 | `[30]` | 150 ms toast | §3 |
| เข้า party | `party.buffApplied` [ชั่วคราว รอ F09] | ปกติ / 5 | `[25,30,25]` | 220 ms | §3 |
| dungeon ปิด/นอกระยะ | `dungeon.closedOrOutOfRange` | นุ่ม / 6 | `[20]` | popup มาตรฐาน ไม่มี motion พิเศษ | — |
| Quick command | `qc.sent` / `qc.received` | นุ่ม / 6 | `[15]` (เหมือนกันทั้ง 10 คำสั่ง) | 350–900 ms ต่อตัวตามตาราง §5 | §5 |

หมายเหตุ `raid.*` และ enhance: ยังไม่มี copy key/telemetry ทางการ (F17/enhance เป็น phase ถัดไป) เอกสารนี้ไม่ผูก motion เฉพาะเจาะจงกับ cue ชั่วคราวเหล่านั้นนอกจากหลักทั่วไปในหัวข้อ 1–3 ให้ทีมที่ทำ F17/enhance หยิบไปต่อยอดตอนมี copy key จริง (เหมือนที่ audio ทำไว้)

## 10. แนวทาง implementation และการวัด

**โครงไฟล์ที่เสนอสำหรับงาน build ถัดไป** (ยังไม่ใช่ของ task นี้ เพราะ `writes` ของ P1-F03-T27 มีแค่ไฟล์ spec นี้ไฟล์เดียว — ดูหัวข้อ 12 ส่งต่อ producer):
```
art/vfx/
  toast/            (CSS: เข้า/ออก toast+banner มาตรฐาน §3)
  rarity-reveal/     (CSS + WAAPI: common..legendary §4, timing.json ต่อระดับ)
  quick-command/     (WAAPI: 10 emote §5, ผูกกับ glyph icon-grammar)
  hp-critical/       (WAAPI: hpLow, autoRetreat, death §6)
  enhance-receipt/   (CSS: paper-feed motion §7)
  rift-idle/         (CSS: idle breathing การ์ด §8)
  demo/*.html        (หน้าเดียวต่อกลุ่ม effect ให้ QA/reviewer กดดูได้โดยไม่ต้องเปิดเกมจริง)
```
แต่ละ module มี `timing.json` (duration, easing, keyframe %, cue id ที่โยง) เพื่อให้ gameplay-programmer wire event → animate ได้ตรงตาราง §9 โดยไม่ต้องเดา

**การวัด (ให้งาน build ถัดไปทำตามงบนี้):**
- ทุก demo page วัดด้วย `PerformanceObserver`/`performance.mark`-`measure` รอบ animation start→finish รายงานเป็น ms จริงเทียบกับตาราง §3
- รายงานขนาดไฟล์ (CSS/JS/JSON) ต่อ module เทียบเพดาน 20 KB ใน §2
- ทดสอบ `prefers-reduced-motion` และ `visibilitychange` (สลับแท็บกลางอนิเมชัน แล้วเช็คว่า `cancel()` ทำงานจริงไม่มี timer ค้าง) เป็น checklist บังคับก่อนผ่าน content gate

**ทางเลือก engine ต่อ effect (สรุปจาก §2):** CSS สำหรับ feedback/reveal ส่วนใหญ่และ enhance receipt · WAAPI สำหรับลำดับหลายจังหวะที่ต้องเริ่มพอดีกับ event จาก server (auto-retreat, ตาย, legendary, quick-command) · Canvas สงวนไว้เฉพาะ legendary shard burst และให้ gameplay-programmer เลือกแทนด้วย CSS/WAAPI ได้ถ้าภาพเหมือนกัน

## 11. สรุป Do / Don't

| # | Do | Don't | ตรวจอย่างไร |
| --- | --- | --- | --- |
| 1 | หยุด/cancel motion ทุกตัวทันทีที่ `visibilitychange` เป็น hidden | ปล่อยให้ animation เล่นต่อเบื้องหลังหรือ resume จากกลางคัน | สลับแท็บระหว่างเล่น แล้วเช็คด้วย DevTools ว่าไม่มี timer/animation ค้าง |
| 2 | รอยแยกบนแผนที่เป็นภาพนิ่ง 100% ไม่มีข้อยกเว้น | ใส่ pulse/glow/หมุนบน MapLibre canvas ไม่ว่าจะช้าแค่ไหน | ตรวจ style JSON และโค้ด client ว่าไม่มี `setPaintProperty` วนหรือ layer ที่ต้องวาดซ้ำตามเวลา |
| 3 | ให้ rarity อ่านออกจากภาพนิ่ง (สี/pip/ขอบ/มุม) แม้ปิด motion และเสียงทั้งหมด | ใช้ transparency/sparkle/loop เป็นตัวบอกระดับ rarity | ปิด `prefers-reduced-motion` + ปิดเสียง แล้วให้คนแยก 5 ระดับจากภาพนิ่งอย่างเดียว |
| 4 | เลือกจำนวนจังหวะ motion ให้ตรงกับจำนวนจังหวะ `vibration_ms` ของ cue เดียวกัน | ออกแบบจังหวะภาพใหม่ที่ไม่ตรงกับ pattern สั่น/เสียงที่ตัดสินไปแล้ว | เทียบตาราง §9 ทีละแถว |
| 5 | ตาย/auto-retreat ใช้สี/ทรง/transition ที่เรียบ ตรงไปตรงมา | screen shake, vignette แดง, slow-motion, ตราปั๊ม "แพ้" | รีวิวภาพนิ่งแต่ละเฟรมเทียบ Do/Don't นี้ในเนื้อหา §6 |
| 6 | enhance สำเร็จ/ล้มเหลวใช้ motion รูปแบบเดียวกัน (paper-feed) ต่างแค่เนื้อหา | motion ที่ต่างกันตามผล (ยิ่งดีขึ้น/แย่ลง) หรือภาพของแตก/บิ่น | เทียบ 2 เฟรมผลลัพธ์ว่าโครง motion เหมือนกันทุกสเต็ป |
| 7 | quick-command emote 10 ตัวมีลายเซ็นจังหวะต่างกันชัดแม้ปิดเสียง | ใช้ motion เดียวกันแล้วหวังให้สี/glyph แยกเองทั้งหมด | ให้คนดู 64 px ปิดเสียงแยก 10 ท่าออกจากกันได้ |
| 8 | ทุก effect มี reduced-motion variant ที่ข้อมูลครบ | ตัด motion แล้วข้อมูลบางส่วนหายไปด้วย (เช่น rarity หายเมื่อปิด motion) | เปิด `prefers-reduced-motion: reduce` แล้วไล่ทุกหน้าจอที่มี effect |

## 12. สมมติฐาน คำถามค้าง และส่งต่อ

### สมมติฐาน
- `[ASSUMPTION A-P1-F03-T27-1]`: ถ้อยคำ acceptance ของ task นี้ ("จังหวะ rift บนแผนที่ ช้า frame ต่ำ") ถูกตีความใหม่ว่าหมายถึงชั้น UI นอกแผนที่ (การ์ด/หน้า confirm) ไม่ใช่ MapLibre canvas เพราะขัดกับ `map-style.md` (DONE) และ pillars P4 ที่ห้าม animation ต่อเนื่องบนแผนที่แบบไม่มีข้อยกเว้น (ดูหัวข้อ 8) (เจ้าของยืนยัน: art-director, game-director)
- `[ASSUMPTION A-P1-F03-T27-2]`: ท่าโพสอวตารสำหรับ quick-command emote (หัวข้อ 5) เป็นทิศทางล่วงหน้า เพราะ `art/direction/avatar-spec.md` (P1-F03-T11) ยังไม่เสร็จ (สถานะ TODO ในบอร์ด) ยืนยัน sprite จริงอีกครั้งเมื่อระบบ layer อวตาร 3 มุมพร้อม (เจ้าของยืนยัน: artist-2d)
- `[ASSUMPTION A-P1-F03-T27-3]`: ระบบตีบวก (หัวข้อ 7) ยังไม่มี copy key ทางการ (เป็นของ feature ตีบวกใน phase ถัดไป ตรงกับสถานะเดียวกันที่ `audio/direction.md` หัวข้อ 11 ประกาศไว้แล้ว) หัวข้อนี้เป็นทิศทางล่วงหน้าเท่านั้น ไม่ใช่ spec สุดท้าย (เจ้าของยืนยัน: narrative-designer เมื่อ feature เริ่ม)
- `[ASSUMPTION A-P1-F03-T27-4]`: การเลือก Canvas เทียบ CSS/WAAPI สำหรับ legendary shard burst (หัวข้อ 4) เปิดกว้างให้ gameplay-programmer ตัดสินตอน build จริงตามความสามารถของ browser target (เจ้าของยืนยัน: gameplay-programmer)
- `[ASSUMPTION A-P1-F03-T27-5]`: raid checkpoint/warning (`raid.checkpointReached`, `raid.thirtyMinWarning`) ใช้แค่หลักทั่วไปในหัวข้อ 1–3 ของเอกสารนี้ ยังไม่มี motion เฉพาะเจาะจง เพราะเป็นขอบเขตของ F17 (Phase 6) เหมือนสถานะเดียวกับ `audio/cue-list.md` (เจ้าของยืนยัน: ทีม F17 เมื่อเริ่ม)

### ส่งต่อ
- ถึง **producer**: ยังไม่มี build task บนบอร์ดสำหรับสร้างไฟล์ implementation จริงใน `art/vfx/` (CSS/WAAPI module ตามโครงหัวข้อ 10) และ `art/vfx/demo/*.html` — เสนอเปิดเป็นงานใหม่เมื่อ feature ที่เกี่ยวข้อง (F04 run state, F09 party, ระบบ drop) เริ่มใน Phase ถัดไป เพราะ `writes` ของ P1-F03-T27 มีแค่ไฟล์ spec นี้ไฟล์เดียว | blocking: no
- ถึง **art-director**: ขอยืนยัน assumption 1 (หัวข้อ 8) ในเนื้อหา content gate (visual) P1-F03-T22 และ design gate B P1-F03-T25 ว่าการย้าย "จังหวะ rift" ออกจากแผนที่ไปอยู่การ์ด/หน้า confirm ตรงกับเจตนาที่ต้องการ | blocking: yes (สำหรับ P1-F03-T22, P1-F03-T25)
- ถึง **artist-2d**: ยืนยัน motion concept ของ quick-command emote (หัวข้อ 5) ทำได้จริงกับระบบ layer อวตาร 3 มุม เมื่อ `avatar-spec.md`/`art/assets/avatar/` (P1-F03-T11, T14) เสร็จ | blocking: no
- ถึง **sound-designer**: ไม่มี cue ใหม่ที่ต้องขอ — เอกสารนี้ใช้ cue id/`vibration_ms` จาก `audio/cue-list.md` ตรงทุกตัว (ตารางหัวข้อ 9) | blocking: no
- ถึง **gameplay-programmer**: อ่านหัวข้อ 9–10 สำหรับ event→animation mapping และสัญญา `visibilitychange`/`prefers-reduced-motion` ที่ต้อง implement เป็น pattern เดียวกันทุก module (ตรงกับ integration layer 4 ชั้นที่ `audio/direction.md` ขอไว้แล้ว ให้ผูก motion trigger จุดเดียวกับที่ผูกเสียง/สั่น) | blocking: no

### decisions
- propose: รอยแยกไม่มี motion บนแผนที่จริงเด็ดขาด "จังหวะ rift ช้า frame ต่ำ" ย้ายไปเป็น idle breathing ของไอคอนรอยแยกในการ์ด/รายการ UI นอกแผนที่แทน (หัวข้อ 8) | authority: art-director | impact: ปิดข้อขัดแย้งระหว่างถ้อยคำ acceptance ของ board กับ `map-style.md`/pillars P4 ที่ตัดสินไปแล้ว โดยไม่ต้องถาม HUMAN และไม่กระทบงบแบตของแผนที่

### questions_for_human
- none (ไม่มีคำถามที่ต้องรอ HUMAN — ข้อขัดแย้งเดียวที่พบแก้ได้ด้วย decision authority ของ art-director ตามหัวข้อ 8)

