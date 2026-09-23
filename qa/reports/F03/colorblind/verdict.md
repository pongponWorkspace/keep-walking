# จำลองตาบอดสี — style-tile.svg / contact-sheet-1x.svg (P1-H06, handoff จาก P1-F03-T13)

| หัวข้อ | ค่า |
| --- | --- |
| task | P1-H06 (ข้อ 4 ของ detail block) |
| ผู้ตรวจ | qa-tester |
| วันที่ | 2026-09-24 |
| อ้างอิง | `art/direction/icon-grammar.md` §6 (โดยเฉพาะ §6.2 จุดเสี่ยงที่รู้อยู่แล้ว, §6.3 วิธีทดสอบ), `art/assets/ui/style-tile/README.md` ("สิ่งที่ยังไม่ได้ทำ" — งานนี้ปิดข้อนั้น) |
| เครื่องมือ | Playwright + Chromium (CDP `Emulation.setEmulatedVisionDeficiency`, Machado 2009 matrices — เครื่องมือเดียวกับที่ icon-grammar §6.3 อ้างถึง "Chrome DevTools > Rendering > Emulate vision deficiencies") |
| สคริปต์ | `qa/reports/F03/colorblind/capture-colorblind.spec.ts` (รัน: `pnpm exec tsx qa/reports/F03/colorblind/capture-colorblind.spec.ts`) |
| **verdict** | **PASS** — rarity 5 ระดับและ class 4 แบบแยกได้ 100% โดยไม่อ่านสี ในทั้ง 4 แบบจำลอง ตรงเกณฑ์ §6.3 ข้อ 3 |

## 1. ภาพที่เก็บ (10 ไฟล์ PNG ในโฟลเดอร์นี้)

| ไฟล์ | คำอธิบาย |
| --- | --- |
| `style-tile--none.png` | ภาพต้นฉบับ (ไม่จำลอง) 1440×2720 |
| `style-tile--protanopia.png` | จำลองตาบอดสีแดง |
| `style-tile--deuteranopia.png` | จำลองตาบอดสีเขียว |
| `style-tile--tritanopia.png` | จำลองตาบอดสีน้ำเงิน-เหลือง |
| `style-tile--achromatopsia.png` | จำลองตาบอดสีทั้งหมด (ขาวดำ) |
| `contact-sheet-1x--{none,protanopia,deuteranopia,tritanopia,achromatopsia}.png` | ชุดเดียวกัน บนแผ่น contact sheet ขนาดจริง 620×200 (rarity frame compact 52px, class badge 20px — ขนาดจริงที่เล็กที่สุดที่ใช้ในเกม) |

หมายเหตุการรัน: ต้องตั้ง viewport เท่ากับขนาดจริงของ SVG แต่ละไฟล์ (ไม่ใช้ `page.screenshot({ fullPage: true })` — เอกสาร SVG เดี่ยวไม่มี `<body>` ให้ Playwright ใช้วัดความสูงสำหรับ fullPage ทำให้ค้างไม่จบ; แก้แล้วในสคริปต์ ดูคอมเมนต์ในไฟล์)

## 2. ผลตรวจ — ส่วนที่ 3 Rarity frame (72px master, style-tile.svg)

ทั้ง 4 แบบจำลอง (รวมขาวดำ) ยังแยก 5 ระดับได้ครบจากช่องทางที่ไม่ใช่สีล้วน:
- จำนวน pip แถวล่าง: 1 / 2 / 3 / 4 / 5 (นับได้ชัดทุกแบบ)
- มุมตกแต่ง: ไม่มี → สามเหลี่ยม 1 มุม → 2 มุม → 4 มุม → ดาว 4 แฉก 4 มุม (Legendary มีดาวที่มุมขวาบนเพิ่มจากมุมตกแต่งฐาน สังเกตง่ายแม้ขาวดำ)
- ขอบคู่ (ขอบในเพิ่ม) เริ่มที่ Rare — ความหนาของเส้นเป็นสัญญาณรูปทรง ไม่ใช่สี

ผลนี้ตรงกับที่ README ของ artist-2d บันทึกไว้ด้วยตาเปล่า (ไม่มี devtools ตอนนั้น) — งานนี้ยืนยันซ้ำด้วยเครื่องมือจำลองจริงตามที่ระบุเป็น "สิ่งที่ยังไม่ได้ทำ"

## 3. ผลตรวจ — ส่วนที่ 4 Class badge (48px master, style-tile.svg)

Silhouette 4 แบบ (โล่ / ลูกศรทแยงมีขนนก / หัวใจมีรอยเว้าบน / ประกาย 4 แฉกเว้าโค้ง) แยกออกจากกันชัดเจนในทุกแบบจำลองรวมขาวดำ — ไม่มีคู่ไหนสับสนแม้สีใกล้กัน

จุดเสี่ยงที่ icon-grammar §6.2 เตือนไว้ล่วงหน้า ("Tanker กับ Support ใกล้กันที่สุดใน tritan") **ยืนยันตรงจริง**: ในภาพ `style-tile--tritanopia.png` สี Tanker และ Support กลายเป็นโทนเขียวอมฟ้าใกล้เคียงกันมาก — แต่ silhouette โล่ (Tanker) กับหัวใจมีรอยเว้า (Support) ยังต่างกันชัดพอที่จะระบุได้โดยไม่ต้องอ่านสี → ตรงตามที่มาตรการที่ออกแบบไว้ตั้งใจให้เกิดขึ้น ไม่ใช่จุดบกพร่องใหม่

จุดเสี่ยงอีกข้อ ("Rare กับ Epic ใกล้กันใน protan และ tritan") ก็ยืนยันตรงจริงเช่นกันในภาพ `--protanopia.png`/`--tritanopia.png` (โทนม่วง/น้ำเงินของทั้งสองใกล้กัน) แต่จำนวน pip (3 กับ 4) และมุมตกแต่ง (2 กับ 4 มุม) ยังแยกได้ชัด

## 4. ผลตรวจ — contact sheet ขนาดจริง (52px / 20px)

ที่ขนาดจริงเล็กสุด (rarity frame compact 52px, class badge 20px ไม่มีขอบหมึกที่ glyph ตามสเปก) จำนวน pip (1–5) และดาวมุมขวาบนของ Legendary ยังนับได้ครบในทุกแบบจำลองรวมขาวดำ (`contact-sheet-1x--achromatopsia.png`) เพราะ pip เป็นสี `ink.900` คงที่ไม่ใช่สี rarity ที่ขนาดนี้ (ตามสเปก) — จึงไม่ถูกกระทบจากการจำลองสีเลย เป็นช่องทางที่แข็งแรงที่สุด

Class badge ที่ 20px มีขนาดเล็กพอที่การอ่าน silhouette จากภาพนิ่งอย่างเดียว (ไม่ได้ทดลองบนอุปกรณ์จริงที่ขยายด้วยนิ้ว/ซูม) ทำได้ยากกว่าที่ 48px master — แต่รูปทรงพื้นฐาน 4 แบบยังพอแยกออกจากกันได้ในภาพขาวดำ (เห็นได้จากรูปร่างกรอบนอกที่ไม่ใช่วงกลมสมบูรณ์ของบางไอคอนกับที่เป็นวงกลมเปิด/ปิดต่างกัน) ไม่มีคู่ไหนดูเหมือนกันทุกประการ — สรุปว่า**ผ่าน**แต่ pip ของ rarity เป็นสัญญาณที่แข็งแรงกว่า glyph ของ class ที่ขนาดนี้ตามสเปกอยู่แล้ว (ไม่ใช่ปัญหาใหม่)

## 5. สรุป

ทุกข้อใน icon-grammar §6.3 ข้อ 3 ผ่าน: "ในทั้ง 4 แบบ ผู้ตรวจระบุ rarity ครบ 5 ระดับและ class ครบ 4 แบบได้ถูก 100% โดยไม่อ่านข้อความ" — ยืนยันด้วยภาพจำลองจริงแล้ว (ก่อนหน้านี้เป็นการตรวจด้วยตาเปล่าโดยไม่มีเครื่องมือ) ไม่มีข้อเสนอแก้ไขสีหรือรูปทรงเพิ่มเติม จุดเสี่ยงที่มีอยู่แล้วใน §6.2 ทั้งหมดมีช่องทางรองรับตามที่ออกแบบไว้จริง

## Handoffs

- ถึง art-director: ไม่มีข้อบกพร่องให้แก้ (ยืนยันงาน P1-F03-T13 ผ่านเกณฑ์ §6.3 แล้ว) — ปิดรายการ "สิ่งที่ยังไม่ได้ทำ" ข้อจำลองตาบอดสีใน `art/ref/style-tile/README.md` ได้

## 6. อัปเดต 2026-09-24 (P1-X37) — ย้าย path ตาม P1-X36

artist-2d ย้ายโฟลเดอร์ style tile จาก `art/assets/ui/style-tile/` ไปเป็น `art/ref/style-tile/` ใน P1-X36 (ตาม asset-pipeline §2/§3.2 — ไฟล์ `ref.*` ที่ไม่ส่งถึงผู้เล่นต้องอยู่ใต้ `art/ref/`) และ handoff มาที่ QA ให้แก้ path ใน `capture-colorblind.spec.ts` ที่ยังอ้างตำแหน่งเดิม (บรรทัด `TARGETS[].file`)

การแก้ไข:
- แก้ `capture-colorblind.spec.ts` ให้ทั้งสอง target ชี้ไปที่ `art/ref/style-tile/style-tile.svg` และ `art/ref/style-tile/contact-sheet-1x.svg` แทนที่ path เดิมใต้ `art/assets/ui/style-tile/` (ซึ่งไม่มีอยู่แล้ว — ยืนยันด้วย `find` ก่อนแก้)
- รันสคริปต์ซ้ำ: `pnpm exec tsx qa/reports/F03/colorblind/capture-colorblind.spec.ts` → ได้ครบ 10 ไฟล์ PNG ตามเดิม (log: `done: 10 images`)
- เปรียบเทียบ SHA-256 ของ PNG ทั้ง 10 ไฟล์ ก่อน/หลังรัน: **ตรงกันทุกไฟล์ (byte-identical)** — ยืนยันว่าการย้าย path ไม่กระทบผลการทดสอบเลย เพราะ `art/ref/style-tile/README.md` ระบุว่าเนื้อหาไฟล์ SVG ไม่เปลี่ยน (bytes/sha256 เท่าเดิม) และผลนี้ก็สอดคล้องกัน
- Lint: `pnpm exec prettier --check` และ `pnpm exec eslint` บนไฟล์ spec ผ่านทั้งคู่ (ไม่มี warning/error)

**verdict คงเดิม: PASS** — ไม่มีความแตกต่างของผลตรวจจากการย้าย path ครั้งนี้ ปิดงาน P1-X37

