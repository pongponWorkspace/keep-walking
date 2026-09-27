# Effect spec — Drop reveal, 5 rarity tiers

Task: P2-F05-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §4, §9 · `art/direction/briefs/P2-assets.md` 2.11 · `art/reviews/F03-visual-gate.md` V-21 · `audio/cue-list.md` หัวข้อ 2 · `design/ux/flows/F05-movement-gate-reward.md` Flow B1 (แถวรายการของในหน้าสรุป ใช้ effect เดียวกันได้)
Source: `art/vfx/rarity-reveal/rarity-reveal.ts` (registers `drop.rarity.common|uncommon|rare|epic|legendary`) · `art/vfx/rarity-reveal/rarity-reveal.css` · `art/vfx/rarity-reveal/timing.json`
Demo: `art/vfx/demo/rarity-reveal.html`

## ขอบเขต — rarity เป็น channel เสริมที่ 5 เท่านั้น

icon-grammar §4 ให้ rarity อ่านออกจากภาพนิ่งอยู่แล้ว 4 ช่องทาง (สี, pip, ขอบ, มุมตกแต่ง) ทุก effect ในไฟล์นี้เป็น**ช่องทางเสริม**เท่านั้น — ปิด motion (`prefers-reduced-motion`) แล้วข้อมูล rarity ต้องอ่านได้ครบเหมือนเดิมทุกกรณี (การ์ด/ไอคอนที่ artist-2d วาดมาแสดงครบทุกช่องทางอยู่แล้วโดยไม่ต้องพึ่ง JS module นี้เลย)

## ทำไม beat ถูก scale ไม่ใช่คัดลอกตรงตัว

motion-direction §4 สั่งสองเรื่องที่ดูขัดกันถ้าอ่านผิว ๆ: (ก) "จำนวนจังหวะ visual เท่ากับจำนวนจังหวะใน `vibration_ms`" และ (ข) ตารางเวลารวมต่อ tier (350/450/550/900–1,200 ms) ที่**ยาวกว่า**ผลรวม `vibration_ms` ของ cue เดียวกันเสมอ (เช่น Uncommon: `vibration_ms` รวม 160 ms แต่ตารางเวลาบอก 350 ms) เพราะสั่น/เสียงสั้นได้ (haptic buzz อ่านได้เร็ว) แต่ตาต้องการเวลานานกว่าเพื่ออ่านภาพให้ทัน — โมดูลนี้จึงตีความว่า: **จำนวนจังหวะ**และ**สัดส่วนความยาวระหว่างจังหวะ**คัดลอกจาก `vibration_ms` ตรงตัว (satisfies ก) แล้ว **scale ทั้งชุดขึ้นด้วยตัวคูณเดียว** ให้ผลรวมตรงกับตารางเวลา §3/§9 พอดี (satisfies ข) วิธีนี้รักษา "จังหวะเดียวกับที่หู/ผิวหนังรู้สึก" ไว้ครบ เพียงแต่ทำให้ตาเห็นสบายขึ้น ไม่ใช่การคิดจังหวะใหม่แยกจากที่ sound-designer ตัดสินไปแล้ว

ตัวคูณต่อ tier (คำนวณสด ไม่ hardcode เลขที่ scale แล้ว — ดู source): Uncommon ×2.1875, Rare ×1.6364, Epic ×1.358, Legendary ×2 (เลือกจุดสูงสุดของงบ 900–1,200 ms พอดี เพราะ Legendary "เป็นเสียงเดียวที่ดังได้" ตามกฎ role)

## ตารางต่อ tier

| tier | จังหวะ (จาก `vibration_ms`) | duration (สเกลแล้ว) | motion | corners | สิ่งที่ห้าม |
| --- | --- | --- | --- | --- | --- |
| Common | 1 | 220 ms | `scale(0.92→1.04→1)` ครั้งเดียว | 0 | motion เพิ่มใด ๆ |
| Uncommon | 2 | 350 ms | pop (`0.9→1.05→1`) + wiggle (`1→1.03→1`) | 0 | `filter`, opacity ของกรอบ/ไอคอน, sparkle |
| Rare | 3 | 450 ms | pop + 3 บีตขยับสเกลไล่ขึ้น (`1.03/1.06/1.10`, V-21) + 2 มุม stroke-reveal (tl, br) 80 ms/มุม | 2 | `filter`/`opacity` (V-21) |
| Epic | 4 | 550 ms | pop + 4 บีตไล่ขึ้น (`1.03/1.05/1.08/1.12`) + 4 มุมตามเข็มนาฬิกา 80 ms/มุม | 4 | fanfare เต็มจอ, screen flash |
| Legendary | 5 | 1,200 ms | pop + 5 บีตไล่ขึ้น (`1.03/1.06/1.10/1.14/1.18`) + 4 มุม + shard burst 10 เส้น (transform เท่านั้น) + `brightness()` one-shot จังหวะสุดท้าย (ข้อยกเว้น `filter` เดียวของ tier นี้) | 4 | มงกุฎ/รัศมี/ฉัตร, screen shake, slow-motion, เสียง fanfare วงใหญ่ |

รายละเอียดตัวเลขทุกจังหวะ/ดีเลย์อยู่ใน `timing.json` (คอลัมน์ `rawBeatPatternMs` = ค่าดิบจาก cue-list, `scaleFactor` = ตัวคูณที่ใช้, `durationMs` = ผลลัพธ์)

## DOM contract (สำหรับ integrator — gameplay-programmer)

- `play('drop.rarity.<tier>', frameEl)` — `frameEl` คือ container ที่แสดง SVG ของ `frame.rarity.<tier>-52|72` (จาก `art/assets/manifest.json`) เป็น child ปกติอยู่แล้ว โมดูลนี้ไม่วาด frame เอง
- `frameEl` ต้องเป็น DOM node ที่เพิ่ง mount ใหม่ต่อการปรากฏหนึ่งครั้ง (toast ใหม่ทุก tick, แถวใหม่ทุกแถวในหน้าสรุป) — โมดูลไม่ล้าง decoration เก่าก่อนเล่นซ้ำบน element เดิม (ตรงกับกฎ "ไม่มี effect ใด resume/replay กลางสถานะ" ของ motion-direction §2)
- สำหรับ Rare/Epic/Legendary: โมดูลสร้าง `<span class="vfx-rarity-corner vfx-rarity-corner--{tl,tr,bl,br}">` เป็น child ของ `frameEl` เอง (ต้องมี `rarity-reveal.css` โหลดอยู่เพื่อให้ shape/position ถูกต้อง) แล้ว**ปล่อยค้างไว้**หลังเล่นจบ (เป็นส่วนหนึ่งของภาพนิ่งที่ตกแต่งแล้ว ไม่ลบออก)
- สำหรับ Legendary เท่านั้น: สร้าง `<span class="vfx-rarity-shard">` ชั่วคราว 10 ชิ้น แล้ว**ลบออกจาก DOM หลังเล่นจบ** (เป็น flourish ชั่วคราว ไม่ใช่ channel บอก rarity ถาวร)
- สี (`color`) ของ `frameEl` ควรตั้งเป็น token ของ rarity นั้น (`design/ux/tokens.json` `color.rarity.*`) เพราะ corner/shard ใช้ `currentColor`

## P2-H42 (V-39) — ยืนยันสัญญา DOM เมื่อกรอบเปลี่ยนเป็น 52 px

เดิม V-33 พบว่า client ย่อ `.item-icon-frame` เหลือ 32 px (ต่ำกว่าขั้นต่ำของ icon-grammar §2) ตอนนี้ P2-X42 แก้แล้ว: `apps/client/src/app.css` `.item-icon-frame` = 52×52, `.item-icon-glyph` = 48×48 กึ่งกลาง inset 2 px, `position: relative` ตั้งไว้ใน CSS ตรงตัว (ไม่ต้องพึ่ง `ensurePositioned()` ของโมดูลนี้เลย เพราะ computed style ไม่ใช่ `static` อยู่แล้ว) และ `ui/tick-toast.ts`/`ui/item-icon-dom.ts` เรียก `play('drop.rarity.<tier>', iconEl)` โดย `iconEl` คือ `.item-icon-frame` ตัวเดียวกับที่ frame SVG + glyph เป็น child อยู่แล้ว — ตรงกับ DOM contract ของไฟล์นี้ทุกข้อ (`frameEl` เป็น container ที่โชว์ SVG เป็น child ปกติ, เพิ่งถูก mount ใหม่ต่อการปรากฏหนึ่งครั้งเพราะ toast/แถวสรุปสร้างใหม่ทุกครั้ง)

**ผล: ACCEPT** ไม่ต้องแก้โค้ดของโมดูลนี้ — corner decoration (`vfx-rarity-corner`, 10×10 px คงที่ไม่สัมพันธ์กับขนาด container) และ shard burst ยังวางตำแหน่งถูกต้องที่ 52 px เช่นเดียวกับที่เคยออกแบบไว้สำหรับ 72 px (สัดส่วนกว้างขึ้นเล็กน้อยเมื่อ container เล็กลง แต่ยังอยู่ในกรอบและไม่ล้นออกนอกภาพ — ตรวจด้วยตาใน `demo/rarity-reveal.html` ที่ปรับขนาด container เป็น 52 px แล้ว)

**พบช่องว่างแยกต่างหาก ไม่ใช่ของ V-39 (คงอยู่ตั้งแต่ก่อน X42 ไม่ใช่สิ่งที่ X42 ทำให้แย่ลง) — handoff ถึง gameplay-programmer, blocking: no:** ไม่มีจุดใดใน `ui/item-icon-dom.ts`/`ui/item-line-view.ts`/`ui/tick-toast.ts` ตั้ง `color` ของ `.item-icon-frame` เป็น `color.rarity.<tier>` (`design/ux/tokens.json`: common `#888899`, uncommon `#119933`, rare `#2266EE`, epic `#9933DD`, legendary `#DD6600`) ตามที่ DOM contract หัวข้อก่อนหน้าขอไว้ ("สี (color) ของ frameEl ควรตั้งเป็น token ของ rarity นั้น เพราะ corner/shard ใช้ currentColor") — ผลคือ corner ornament (Rare ขึ้นไป) และ shard burst (Legendary) จะได้สีที่ inherit มาจาก ancestor (ไม่ใช่สี rarity ที่ถูกต้อง) แม้ตัวกรอบ SVG เองยังคงสีถูกต้องอยู่แล้ว (สีอยู่ใน SVG ไฟล์ ไม่ใช่ CSS) ไม่ blocking เพราะ 4 ช่องทางหลักของ rarity (สี/pip/ขอบ/มุม) ยังอ่านออกได้ครบจากกรอบ SVG แม้ไม่แก้จุดนี้ — แก้โดยตั้ง `iconEl.style.setProperty('color', <hex>)` ใน `buildItemIconElement` จาก `view.rarity` เมื่อสะดวก

## รายการต้องตรวจก่อน content gate (ตาม motion-direction §10)

- [x] ปิด `prefers-reduced-motion` แล้วอ่าน rarity ได้ครบจากภาพนิ่ง (ทดสอบใน `demo/rarity-reveal.html` checkbox "Force reduced-motion fallback")
- [x] สลับแท็บกลาง Legendary (ยาวสุด 1,200 ms) แล้ว `activeCount()` เหลือ 0 ทันที ไม่มี animation ค้าง (ทดสอบใน `demo/visibility-and-reduced-motion.html`)
- [x] ไม่มี `filter`/`opacity` ที่ Rare (V-21) — ตรวจโค้ดแล้วไม่มีทั้งสอง property ใน `runRare`
