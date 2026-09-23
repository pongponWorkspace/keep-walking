# Component Spec — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T17 · แก้ไขโดย P1-X10 (บันทึกข้อยกเว้น `buttonFullWidth` D-050 หัวข้อ 10.1, ยืนยันเพดานชื่อโซน 17/14/34 หัวข้อ 8), P1-X17 (2026-09-23: F-04 ตัดสินทิศทาง A จอพกกระเป๋า/Wake Lock แทนประเด็นเปิดเดิมในหัวข้อ 12, F-08 ตัดเมนูภาษาออกจาก v1) และ P1-X35 (2026-09-24: แก้ V-02 ตาม `art/reviews/F03-visual-gate.md` 3.7a–d — เลิกพื้นอ่อนนอก token ของ pill/banner, toast จางเป็นทึบ 100%, การ์ดที่เลือกคงขอบหมึก+เพิ่มวงแหวนนอก, รอยแยกจำลองทึบมีขอบหมึก · เพิ่มหัวข้อ 3.1 บันทึกเงื่อนไข R-6 ของปุ่ม login) · เจ้าของ: uiux-designer · สถานะ: แก้ตาม `art/reviews/F03-visual-gate.md` (V-02) รอ re-run gate รอบถัดไป · วันที่: 2026-09-24
แหล่งอ้างอิง: `design/ux/tokens.json` (ค่า token) · `design/ux/wireframes/*.html` (ตัวอย่างจริงของทุกคอมโพเนนต์) · `design/ux/ia.md`, `design/ux/flows/F03-core-loop.md` (พฤติกรรมและ copy key) · `art/direction/style-guide.md` หัวข้อ 2–7 (กฎอ่านออกกลางแดด, palette, shape, เส้น, ฟอนต์) · `art/direction/icon-grammar.md` (ขนาด icon, class badge, rarity frame) · `design/narrative/style-guide.md` หัวข้อ 4 (ตัวแปร, ความยาว, `kind`)
ลำดับอำนาจ: GDD > pillars.md > ia.md > flow (T16) > เอกสารนี้ · สีทุกค่าต้องตรง `tokens.json` เท่านั้น ห้าม hardcode hex ใหม่

## สารบัญ
1. หลักการออกแบบคอมโพเนนต์ (โจทย์ 3 วินาที มือเดียว)
2. Navigation shell (header bar, bottom tab, floating overlay)
3. ปุ่ม (primary, secondary, danger-confirm, disabled)
4. การ์ดและ popup (confirm, overlap, generic)
5. Drawer (bottom sheet)
6. Toast และ banner (สถานะ, tick, GPS)
7. HP bar และตัวเลข
8. ป้ายชื่อโซน (zone name label)
9. Toggle ที่ตั้งใจฝังลึก (auto-retreat pattern)
10. ตาราง copy `kind` และเพดานความยาว
11. ตารางสถานะที่คอมโพเนนต์ต้องรองรับ (อ้างจาก flow หัวข้อ 7)
12. จอพกกระเป๋า (Wake Lock pocket screen) — ทิศทาง A ตัดสินแล้ว (F-04)
13. สมมติฐานและการส่งต่อ

## 1. หลักการออกแบบคอมโพเนนต์

โจทย์ตั้งต้น: ผู้เล่นเดินกลางแดดหรือฝนด้วยมือเดียว มองจอ 3 วินาทีแล้วเก็บมือถือกลับกระเป๋า ทุกคอมโพเนนต์ในเอกสารนี้ต้องผ่านเกณฑ์ 4 ข้อนี้ก่อนถูกใช้ในหน้าจอจริง:

1. **อ่านออกใน 3 วินาที** — ไม่มีคอมโพเนนต์ใดต้องอ่านมากกว่า 1 ประโยคสั้นเพื่อเข้าใจ (สอดคล้อง narrative style guide 4.3 เพดานความยาว)
2. **กดได้ด้วยนิ้วโป้งข้างเดียว** — ปุ่มและ target ที่ต้องกดระหว่างเดินอยู่ครึ่งล่างจอเสมอ (ia.md หลักการ 6)
3. **อ่านออกกลางแดดก่อนสวย** — ทุกคอมโพเนนต์สืบทอดกฎ S1–S10 ของ style-guide (contrast, เส้นขอบ, ห้ามพึ่งสีอย่างเดียว) เอกสารนี้ไม่ทวนตัวเลข contrast ซ้ำ อ้างกลับไปที่ style-guide หัวข้อ 4 เสมอ
4. **ไม่มีช่องพิมพ์อิสระ** — ทุกคอมโพเนนต์ input เป็นการเลือกจากรายการ/การ์ด/ปุ่มเท่านั้น (ia.md หลักการ 5)

ขนาดขั้นต่ำอ้างจาก `tokens.json`: touch target ≥ `touchTarget.min_px` (48 px) · ปุ่มหลักสูง ≥ `touchTarget.primaryButtonHeight_px` (56 px) · ข้อความเนื้อหา ≥ `type.body.size_px` (16 px) · caption ≥ `type.caption.size_px` (14 px) เฉพาะที่ contrast ≥ 7:1

## 2. Navigation shell

ที่มา: `ia.md` หัวข้อ 2 · ตัวอย่างจริง: ทุกไฟล์ใน `wireframes/` (`.headerbar`, `.bottombar`)

### 2.1 Header bar (`.headerbar`)
| ส่วน | คอมโพเนนต์ | ขนาด | พฤติกรรม |
| --- | --- | --- | --- |
| ซ้าย | avatar icon ย่อ | 40×40 px วงกลม ขอบ `ink.900` 2px · touch target ขยายเป็น 48×48 ด้วย padding โปร่งรอบนอก | กดแล้วไป `S-10-profile` เสมอ ทุกหน้า ทุกสถานะ consent/unlock |
| กลาง | context label | `type.body` 700 | **ไม่ใช่ปุ่ม** เป็น label เฉยๆ ห้ามทำให้ดูกดได้ (ไม่มีขอบ ไม่มีพื้นการ์ด) |
| กลาง (ต่อ) | GPS pill | `.gps-pill` สูง ~20px มุม `radius.chip` พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบ 2px สี state | ไอคอนเล็ก + สถานะสีตาม `state.success`(ok)/`state.danger`(bad) ทั้งขอบและข้อความ **ต้องมีคำกำกับด้วยเสมอ** (ห้ามใช้สีอย่างเดียว ตาม style-guide S4) |
| ขวา | settings icon | เหมือน avatar icon | กดแล้วไป `S-22-settings` เสมอ ทุกหน้า ทุกสถานะ |

กฎร่วม: header bar อยู่ตำแหน่งเดิมทุกหน้าไม่เปลี่ยน (เดาตำแหน่งได้แม้ไม่มองจอนาน ตาม ia.md) สูงขั้นต่ำ = `touchTarget.min_px` (48 px)

### 2.1.1 ตาราง header → copy key (F03 copy gate F-02, บันทึกโดย uiux-designer P1-X13)

GPS pill ทุกหน้าใช้คำกำกับคงที่ `gps.pillLabel` ("GPS") เสมอ สถานะ (ok/bad/สีอื่น) มาจาก `gps.*` ตาม `_meta.gpsStateMap` ของ `copy.th.json` — ไม่ใช่ข้อความในตัว pill

| หน้าจอ | context label key | ข้อความ | หมายเหตุ |
| --- | --- | --- | --- |
| S-00-intro | `onboarding.headerLabel` | "เริ่มต้น" | |
| S-00-consent-location | `consent.headerLabel` | "สิทธิ์ตำแหน่ง" | |
| S-00-permission-browser | `consent.headerLabel` | "สิทธิ์ตำแหน่ง" | ใช้ key เดียวกับ consent-location แทนข้อความเดิม "ขอสิทธิ์เบราว์เซอร์" |
| S-00-age-gate | `age.gateTitle` | "ยืนยันอายุ" | ใช้ key เดียวกับหัว popup (`h1.scr-title`) |
| S-00-login | `account.loginHeader` | "เข้าสู่ระบบ" | หัว `h1` แยกใช้ `account.loginTitle` ("เข้าสู่ระบบก่อนเริ่มเดิน") |
| S-00-class-select | `onboarding.pickRoleTitle` | "เลือกพลัง" | ใช้ key เดียวกับ `h1` |
| S-01-map (ทุกสถานะ) และ bottom tab | `nav.map` | "แผนที่" | |
| S-02-dungeon-confirm | `nav.map` | "แผนที่" | พื้นหลังยังเป็นแผนที่ popup ลอยทับ ไม่เปลี่ยน context label |
| S-03-run (ทุกสถานะ) | `run.headerZoneLabel` | "{zoneRealName}" | ดูคำตัดสิน D-058 ด้านล่าง |
| S-04-run-summary (ทุกสถานะ) | `run.summary.headerLabel` | "สรุป run" | หัวข้อบอกสาเหตุ (จบปกติ/ตาย/ออกเอง/ปิดฉุกเฉิน) ใช้ `run.summary.*` แยกที่ `h1` |
| S-06/S-07/S-08-*-panel | `nav.map` | "แผนที่" | ยังเป็น S-01-map เดิม เปลี่ยนแค่แผงล่าง |
| S-09-interest-register | `interest.title` | "ยื่นเรื่องขอเปิดจังหวัด" | หัว `h1` แยกใช้ `interest.selectProvince` |
| S-22-settings | `settings.title` | "ตั้งค่า" | |
| S-22 หน้าย่อยการเดินและความปลอดภัย | `settings.walkingSafetyLink` | "การเดินและความปลอดภัย" | ใช้ key เดียวกับลิงก์เมนูในหน้าแรก |

**คำตัดสิน D-058 (uiux-designer เป็นผู้มีอำนาจตัดสิน ยืนยันใน P1-X13):** header ระหว่าง run ใช้ `run.headerZoneLabel` = `{zoneRealName}` (≤17 ช่อง) **ไม่ใช่** `{zoneName}` เต็ม (≤34 ช่อง) เหตุผล: context label กลาง header ต้องแบ่งพื้นที่กับ avatar icon (40px) + settings icon (40px) + GPS pill ทางซ้าย-ขวา พื้นที่ที่เหลือบนจอ 360px ไม่พอให้ 34 ช่องยังคงอ่านออกกลางแดดภายใน 3 วินาทีตามโจทย์หลักของบทบาทนี้ (หัวข้อ 1) โดยไม่ตัดบรรทัดหรือย่อขนาดตัวอักษรต่ำกว่า `type.body`/`type.caption` — ต่างจาก 2 จุดที่มีพื้นที่มากกว่าซึ่งยังใช้ `{zoneName}` เต็มได้ตามเดิม: ป้ายชื่อโซนบนแผนที่ (S-01-map, ดูหัวข้อ 8) และหัว popup confirm เข้า dungeon (S-02, `h1.scr-title`) ทั้งสองจุดนี้ไม่มี icon ซ้าย-ขวาแย่งพื้นที่ ถ้าในอนาคตมีการปรับ layout header ให้มีพื้นที่กลางกว้างขึ้นพอสำหรับ 34 ช่อง ต้องกลับมาทบทวนค่านี้ร่วมกับ art-director (ดู handoff หัวข้อ 13)

### 2.2 Bottom tab bar (`.bottombar`)
เริ่มจากแท็บเดียว ("แผนที่", `nav.map`) ตาม `ia.md` หัวข้อ 2 และ 6 · แท็บที่ 2 คือ "ร้าน" (`nav.shop`) โผล่ทันทีที่ปลด `unlocks.npcShop` (จบ run แรก) เร็วกว่าระบบอื่นทั้งหมด (F-01, ia.md หัวข้อ 2/6) ระบบอื่น (ตีบวก, ตลาด, stat, class, party, raid) ไม่ได้แท็บของตัวเอง อยู่เป็นปุ่ม/ลิงก์ในหน้าอื่นแทน กันแถบล่างยาวเกิน 2 แท็บในช่วงต้นเกม · แต่ละแท็บ ≥ 48×48 px จัดกลางแนวนอนเท่ากัน · แท็บที่ active ใช้พื้น `ink.100` (ไม่ใช่สีเดียวบอกความหมาย เพราะข้อความ label ยังอยู่) · **ไม่แสดงระหว่าง onboarding นาที 0–1** (ก่อนถึง `S-01-map` ครั้งแรก) ตามที่ `00-onboarding.html` เลือกออกแบบ — ดูหัวข้อ 13 ข้อ 1

### 2.3 Floating overlay banner
ใช้กับป้ายเหตุการณ์สดที่ไม่ใช่ nav ถาวร (เช่น อยู่ใน dungeon, HP ต่ำ, raid ใกล้เริ่ม) วางไว้ใต้ header bar เสมอ ไม่ทับ context label · z-index = `zIndex.mapOverlayBanner` (10) ต่ำกว่า toast/popup เสมอ

## 3. ปุ่ม

ตัวอย่างจริง: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger-confirm`, `.btn-disabled` ใน `shared/style.css`

| ชนิด | ใช้เมื่อ | พื้น | ข้อความ | สูง | ตำแหน่ง |
| --- | --- | --- | --- | --- | --- |
| Primary (`.btn-primary`) | มีได้ **1 ปุ่มต่อจอเท่านั้น** (style-guide 5, ia.md หลักการ 6) | `accent.signal` + ขอบ `ink.900` 2px + เงาทึบเลื่อน 4px | `ink.900` ตัวหนา (contrast 11.43 AAA) · ปกติเพดาน `kind: button` 12 ช่อง ยกเว้น key ที่เข้าเงื่อนไข `buttonFullWidth` (16 ช่อง — ดูหัวข้อ 10.1) | `touchTarget.primaryButtonHeight_px` (56 px) | เต็มความกว้าง ครึ่งล่างจอเสมอ |
| Secondary (`.btn-secondary`) | ปุ่มรอง/ยกเลิก | `bg.surface` ขอบ `ink.900` 2px | `ink.700` (contrast 12.37 AAA) | ≥48 px | ข้าง primary หรือใต้ primary |
| Danger-confirm (`.btn-danger-confirm`) | ปุ่มยืนยันผลที่แรง (ออกจริง, ปิด auto-retreat) | `bg.surface` ขอบ `state.danger` | `state.danger` (5.21 AA) | ≥48 px | คู่กับปุ่มยกเลิกเสมอ ไม่อยู่เดี่ยว |
| Disabled (`.btn-disabled`) | ปุ่มที่ยังกดไม่ได้ (เช่น "เข้า" ก่อนเลือกการ์ดใน B2) | `ink.100` | `ink.500` (5.44 AA — ตั้งใจให้ยังอ่านออกกลางแดด) | เท่าปุ่มเดิม | ไม่ลดขนาดหรือขยับตำแหน่งตอน disabled (กันกดพลาดตอนกลับมา enable) |

กฎกดปุ่ม (feedback ที่ไม่ใช่ animation ต่อเนื่อง ตาม style-guide 5): เมื่อกด เงาหายและปุ่มเลื่อนลง `elevation.pressedOffset_px` (4px) ทันที ไม่มี transition ยืดเวลา

### 3.1 ปุ่ม login ผู้ให้บริการภายนอก (R-6, ข้อไม่บังคับของ V-02 — art gate F03-visual-gate 3.7, หัวข้อ 4)

ปุ่มแบรนด์ (Google/Apple) เป็น UI ของบุคคลที่สามที่ต้องตามแนวทางแบรนด์ของเขาเอง จึงเป็นข้อยกเว้นเดียวที่ **ไม่ตาม** กฎ "1 ปุ่มหลักต่อจอ" และ "ห้ามใช้สีนอก token" ของหัวข้อ 3 — art-director (ผู้มีอำนาจด้านภาพ) ตัดสิน ACCEPTED พร้อม 6 เงื่อนไขนี้ ต้องคงไว้ทุกข้อ:

1. ใช้เฉพาะ `S-00-login` และหน้าเชื่อมบัญชีใน settings เท่านั้น ที่อื่นในเกมห้ามมีปุ่มแบรนด์
2. เลือกธีมที่ contrast สูงสุดบน `bg.paper`: Google แบบ filled black, Apple แบบ black (ปุ่ม native ของ SDK ผู้ให้บริการ ไม่ใช่ `.btn-primary`/`.btn-secondary` ของเรา)
3. ปุ่มสองผู้ให้บริการกว้างเท่ากัน เรียงแนวตั้ง ห่าง ≥ 8 px
4. ถ้าความสูงที่ SDK ให้ต่ำกว่า `touchTarget.min_px` (48 px) ยอมเป็นข้อยกเว้นของ style-guide S8 เฉพาะปุ่มนี้ — gameplay-programmer วัดความสูงจริงตอน build F07 แล้วรายงานกลับ
5. **fallback** (กรณี SDK เรนเดอร์ปุ่มเองไม่ได้): ทั้งสองปุ่มเป็น `.btn-secondary` น้ำหนักเท่ากัน ห้ามใช้ `accent.signal` กับผู้ให้บริการรายใดรายหนึ่ง (กันไม่ให้ดูเหมือนชี้นำและกันไม่ให้กินสิทธิ์ CTA เดียวของจอ) — ดู `wireframes/00-onboarding.html` เฟรม 5 (S-00-login)
6. ไม่มีโลโก้ผู้ให้บริการที่อื่นในเกมนอกจากปุ่มนี้

## 4. การ์ดและ popup

ตัวอย่างจริง: `.card`, `.popup-overlay`, `.popup` ใน `wireframes/02-dungeon-confirm.html`, `04-run-critical.html`, `06-settings-autoretreat.html`

| คอมโพเนนต์ | ใช้กับ | โครงสร้าง | กฎเฉพาะ |
| --- | --- | --- | --- |
| Card (`.card`) | รายการเมนู, ตัวเลือกในการ์ดซ้อน (B2), รายละเอียดของรางวัล | พื้น `bg.surface` ขอบ `ink.900` 2px มุม `radius.card` (12px) padding `space.cardPadding_px` (16px) | ห้าม tint พื้นด้วยสี semantic/rarity (จะกลืนกับสถานะจริง) |
| Card ที่เลือกแล้ว (`.card.selected`) | ตัวเลือกที่แตะเลือกได้ (Overlap card B2, ตัวเลือกปีเกิดใน age-gate) | ขอบ `ink.900` **เพิ่ม** ความหนาเป็น 4px (จากปกติ 2px) + วงแหวนนอกทึบ `accent.signal` 3px (`box-shadow: 0 0 0 3px`) | สถานะเลือกคือ "เพิ่มเส้น" ไม่ใช่ "แทนที่สี" (icon-grammar 3) — ขอบหมึกต้องยังอยู่เสมอ เพื่อให้เห็นชัดแม้ในภาพขาวดำ (style-guide S3, S10) ห้ามใช้ `accent.signal` เป็นสีขอบแทน `ink.900` เพราะบน `bg.surface` เหลือแค่ 1.43:1 (ต่ำกว่า S3) |
| Popup — bottom sheet (`.popup` จาก `.popup-overlay`) | confirm เข้า dungeon, ยืนยันออกเอง, ยืนยันปิด auto-retreat | เลื่อนขึ้นจากล่าง มุมบนโค้ง `radius.card` overlay พื้นหลัง `rgba(ink.900, .45)` | ปุ่มหลักอยู่ล่างสุดของ popup เสมอ (ยังอยู่ครึ่งล่างจอทั้งที่ popup สูงขึ้นมา) |
| Popup — center sheet (`.popup.center-sheet`) | เหตุการณ์ที่ต้องหยุดความสนใจเต็มที่ (ตาย, เตือนปิด auto-retreat) | กึ่งกลางจอ กว้าง 90% มุมโค้งทุกด้าน | ใช้เมื่อเนื้อหาไม่ผูกกับตำแหน่งล่างจอ (เช่น ทางเลือกฟื้น 3 ทางของ 4.5) |
| Confirm dungeon card (พิเศษ) | `S-02-dungeon-confirm` ปกติ | ชื่อโซน + จำนวนคน + role + ช่วงเลเวล + ปุ่ม 2 ปุ่ม (secondary ยกเลิก, primary เข้า) | ถ้าจำนวนคน = 0 **ซ่อนทั้งบรรทัด** ไม่แสดงเลข 0 (A-P1-F03-T16-3) |
| Overlap card (พิเศษ) | B2 polygon ซ้อน | 2 การ์ดเรียงแนวนอนเท่ากัน แตะเพื่อ select (ใช้ `.card.selected` ด้านบนเมื่อเลือก) | ปุ่ม "เข้า" เป็น `.btn-disabled` จนกว่าจะเลือกการ์ดใดการ์ดหนึ่ง |

## 5. Drawer (bottom sheet ไม่บล็อกจอ)

ตัวอย่างจริง: `.drawer` ใน `wireframes/03-run-active.html` (Nearby Party, Quick command)

| คอมโพเนนต์ | ต่างจาก popup อย่างไร | กฎ |
| --- | --- | --- |
| `S-03a-nearby-party` | ไม่บล็อกการโต้ตอบกับจอหลัง (ไม่มี overlay ทึบ) โผล่ขึ้นเองไม่ต้องกดเปิด | แสดงเฉพาะจำนวนคน+role (badge class) **ห้ามชื่อ ห้ามตำแหน่ง** (NN-4) · ไม่มีคนในโซน = ไม่แสดง drawer เลย ไม่ใช่แสดงว่าง |
| `S-03b-quick-command` | ต้องกดเปิดเอง (ไอคอนคงที่บนหน้า run) | grid ไอคอน 32px (icon-grammar 2.1) แตะ 1 ครั้ง = ส่งคำสั่งทันที ปิด drawer เอง ไม่มีขั้นยืนยัน |

กฎร่วม: `.drawer-handle` (แถบจับ 40×4px สี `ink.300`) อยู่บนสุดเสมอเพื่อสื่อว่าปัดลงเพื่อปิดได้ · drawer ไม่บัง header bar และไม่บังปุ่มออกเองของ `S-03-run`

## 6. Toast และ banner

ตัวอย่างจริง: `.toast`, `.banner` ใน `wireframes/03-run-active.html`, `04-run-critical.html`

| คอมโพเนนต์ | ใช้กับ | โทนสี | หายเอง? |
| --- | --- | --- | --- |
| Toast กลาง (`.toast.neutral`) | `run.tickGranted`, `party.buffApplied`, `run.autoPotionUsed` | พื้น `bg.surface` เสมอ · ขอบ `ink.900` ปกติ หรือเน้น `state.success` เมื่อเป็นผลบวก (สีขอบเปลี่ยนได้ พื้นห้าม tint) | หายเองสั้นๆ |
| Toast จาง (`.toast.faded`) | `run.tickDenied` | **ทึบ 100% เสมอ** ห้ามใช้ opacity บนข้อความ/ขอบ (style-guide S7) — "จาง" คือไม่มีเงาทึบ (flat) + ขอบ `ink.300` 2px + ข้อความ `ink.700` · **ห้ามใช้ `state.danger`** เพราะไม่ใช่การลงโทษ (icon-grammar `gate-miss` ก็ห้ามกากบาทแดงเช่นกัน) | หายเองสั้นๆ |
| Toast อันตราย (`.toast.danger`) | `run.hpLow` (canon, ห้ามแก้คำ) | ขอบ+ข้อความ `state.danger` | ค้างจนกว่าผู้เล่นตัดสินใจหรือ HP เปลี่ยนสถานะ |
| Banner บนสุด (`.banner.info`) | `run.stateGrace`, `gps.offline` | พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบล่าง 2px และข้อความ `state.info` | ค้างตลอดสถานะนั้น ไม่ใช่ toast ชั่วคราว |
| Banner เตือน (`.banner.warn`) | `run.stateSuspended`, ป้ายเตือน auto-retreat ปิดอยู่ | พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบล่าง 2px และข้อความ `state.danger` | ค้างตลอดสถานะนั้น |

กฎร่วม: ทุก toast/banner มี **icon + ข้อความ** เสมอ ไม่ใช้สีอย่างเดียว (style-guide S4) · z-index ตาม `tokens.json`: banner (10) < drawer (20) < toast (30) < popup (40)

## 7. HP bar และตัวเลข

ตัวอย่างจริง: `.hp-track`, `.hp-fill` ใน `wireframes/03-run-active.html`, `04-run-critical.html`

- ราง (`.hp-track`) พื้น `ink.100` ขอบ `ink.900` 2px มุม `radius.chip` สูง 20px
- แถบเติม (`.hp-fill`) ปกติ `state.success` (contrast กับราง 4.22) เมื่อ ≤ `lowHpWarningThreshold_pct` (30) เปลี่ยนเป็น `.hp-fill.low` สี `state.danger` (contrast 4.10)
- ตัวเลข % วางถัดจากแถบเสมอ (ไม่ใช่แค่สีบอก) ใช้ `type.numeric` tabular figures เพื่อไม่ให้ตัวเลขกระโดดเวลาค่าเปลี่ยน
- ค่า HP เป็นค่าจาก server เท่านั้น **client ห้ามคำนวณเอง** (server-authoritative, CLAUDE.md non-negotiable 1) — คอมโพเนนต์นี้แค่ render ค่าที่ได้รับ ไม่ interpolate ค่าเดาระหว่างรอ sync

## 8. ป้ายชื่อโซน (zone name label)

ที่มา: `names.th.json#_meta.limits` (P1-F03-T04): `nameRealMaxCells` 17, `nameSuffixMaxCells` 14, `fullZoneNameMaxCells` 34 · ia.md A-P1-F03-T15-5 (ทดสอบพื้นที่จอ 360px) · ยืนยันโดย uiux-designer ใน P1-X10 (หัวข้อนี้แก้จากฉบับ T17 ที่อ้างเลขเก่า `zoneRealName` 18 จาก `copy.th.json#_variables`)

รูปแบบเต็ม: `{ชื่อจริง} — {คำขยาย}` เช่น "ลุมพินี — ป่าในเมือง" ใช้ตัวแปร `{zoneName}` เต็ม (`maxCells` 34) = `{zoneRealName}` (≤17) + ตัวคั่น " — " (คงที่ 3 ช่อง) + คำขยาย (≤14) · 17+3+14 = 34 พอดี ไม่มีช่องเหลือ

**คำตัดสินของ uiux-designer (P1-X10, verdict = ยืนยันตัวเลขทั้งสามไม่แก้):**
- ชุดชื่อจริงในสต็อกตั้งต้น (`names.th.json`) ทุกรายการยาวสุด 11 ช่อง (`dungeon.chatuchakMarket`, `dungeon.nonthaburiPierMarket`) ยังห่างจากเพดาน 17 อยู่มาก — เพดาน 17 ปลอดภัยกับข้อมูลจริงตอนนี้
- คำขยายยาวสุดในคลัง (`zoneSuffix.grillSmokeWalk`, `.afterWorkBallYard`, `.weekendMeetup`) = 14 ช่องพอดี ตรงกับเพดานเป๊ะ (ไม่มีช่องเหลือสำหรับคำขยายใหม่ที่ยาวกว่านี้ — เจตนา ไม่ใช่บั๊ก แจ้ง narrative-designer ไว้เป็น handoff)
- **แก้แล้วใน P1-X11:** `copy.th.json#_variables.zoneRealName.maxCells` เคยเป็น 18 (ค่าเก่าก่อน T04) narrative-designer แก้เป็น **17** แล้วตรงกับ `names.th.json#_meta.limits.nameRealMaxCells` (T04) ทั้งสองที่ตรงกันแล้ว ไม่มีตัวเลขขัดกันอีก (ปิด handoff เดิม ดูหัวข้อ 13, F03 copy gate F-05/F-06)

| บริบท | ขนาดตัวอักษร | กฎพื้นที่ |
| --- | --- | --- |
| ป้ายบนแผนที่ (`.caption` บนพื้น `rift.500`) | 14px ตัวหนา, halo/แผ่นรองทึบตาม style-guide S6 | ความกว้างป้ายไม่เกิน 2/3 ของความกว้างจอ (360px → ≤240px) ถ้ายาวเกินให้ตัดที่คำขยาย ไม่ตัดชื่อจริง (คำขยายอาจถูกตัดทั้งคำแม้เพดาน 14 ช่องก็เกิน 240px ได้ ขึ้นกับ font จริง — ดูข้อสังเกตด้านล่าง) |
| หัว popup confirm (`h1.scr-title`) | 24px (`type.h1`) | เต็มความกว้าง popup ลบ padding 2×16px — ทดสอบแล้วตัวอย่างยาวสุดในสต็อกจริง (`dungeon.chatuchakMarket` รวม 27 ช่อง) พอดีบรรทัดเดียวที่ 360px แบบ "ชิดขอบ" ไม่เหลือที่ว่าง (ดู 05-run-summary ไม่เกี่ยวข้องตรงนี้ อ้าง `02-dungeon-confirm.html`) **ปรับกฎ (P1-X10):** เพดานจริงคือ 34 ช่อง (มากกว่าที่ทดสอบจริง 7 ช่อง) เพราะสต็อกตั้งต้นยังไม่มีชื่อที่ชนเพดาน — `h1.scr-title` ต้อง **รองรับการตัดบรรทัดเป็น 2 บรรทัดได้** (ไม่บังคับบรรทัดเดียวเหมือนที่ทดสอบ) เมื่อชื่อจากหลังบ้านในอนาคตเข้าใกล้เพดาน 34 ช่อง กันหัว popup ล้นขอบ 360px |
| Tagline (ถ้ามีในหน้ารายละเอียดโซนภายหลัง) | ไม่ใช้ในนาที 0–10 — เนื้อหาประวัติอยู่ที่ `S-26-lore` เท่านั้น | ต้องมีที่ว่างแยกจากชื่อจริงอย่างน้อย 1 บรรทัด ไม่ต่อท้ายชื่อในบรรทัดเดียวกัน |

**ยังไม่ทดสอบจริงกับ font สุดท้าย** (IBM Plex Sans Thai Looped) เพราะ art-director ยังไม่ส่งไฟล์ font จริงมาถึง T17 — ยืนยันซ้ำในหัวข้อ 13 · การนับ "ช่อง" (cells) ตัดสระ/วรรณยุกต์ลอย (combining) ออกตาม copy-schema 4.1 จึงใกล้เคียงความกว้างจริงที่แสดงผล แต่ต้องยืนยันซ้ำด้วย font จริงก่อนเชื่อเพดาน 34 ช่องแบบเป๊ะ

## 9. Toggle ที่ตั้งใจฝังลึก (auto-retreat pattern)

ที่มา: `ia.md` หัวข้อ 5 ข้อ 6, flow Flow E — ใช้ซ้ำได้กับ toggle ความปลอดภัยอื่นในอนาคตที่มีผลรุนแรงเทียบเท่ากัน

รูปแบบบังคับ (3 ชั้น กันปิดโดยไม่ตั้งใจ):
1. หน้าตั้งค่าแรก (`S-22-settings`) มีแค่ **ลิงก์เมนู** ไปหน้าย่อย ไม่มี toggle ในหน้าแรก
2. หน้าย่อยมี toggle จริงพร้อม label เห็นสถานะปัจจุบันชัดเจน (เปิด/ปิด) — การ "เปิด" ไม่ต้องยืนยัน การ "ปิด" ต้องกดเข้า popup ยืนยัน
3. Popup ยืนยันอธิบาย **ผลลัพธ์ตรงไปตรงมา** (จะตายจริง ของหายจริง) ไม่ใช่คำถามลอยๆ แบบ "แน่ใจไหม"

ผลข้างเคียงที่บังคับต้องมี: banner เตือนค้างอยู่ในหน้า `S-03-run` ตลอดเวลาที่ปิดอยู่ (ไม่ใช่แค่ตอนตั้งค่า) — ดู `wireframes/06-settings-autoretreat.html` เฟรมสุดท้าย

## 10. ตาราง copy `kind` และเพดานความยาว

อ้างตรงจาก `design/narrative/style-guide.md` หัวข้อ 4.3–4.4 (uiux ไม่มีอำนาจเปลี่ยนเพดาน มีแค่หน้าที่ทำ layout ให้พอ)

| `kind` | เพดาน | คอมโพเนนต์ที่ใช้ | ตัวอย่างในเอกสารนี้ |
| --- | --- | --- | --- |
| `message` | 64 ช่อง (หลังแทนตัวแปร) · `\n` ได้ 1 ตัว แต่ละบรรทัด ≤32 ช่อง | Toast, banner เนื้อหา popup | `run.hpLow`, `run.autoRetreat` (canon, 63 ช่อง ชิดเพดาน) |
| `button` | 12 ช่อง 1 บรรทัด | `.btn-primary`, `.btn-secondary`, `.btn-danger-confirm` | `dungeon.confirmEnter` "(เข้า)", `run.exitConfirmButton` "(ออกเลย)" |
| `buttonFullWidth` (ข้อยกเว้น D-050) | **16 ช่อง** ไม่มีการตัดบรรทัด (`maxNewlines` 0) — เพดานเดียวกับที่ประกาศใน `copy-rules.json#limits.buttonFullWidth` | เฉพาะ `.btn-primary` ที่เป็น **ปุ่มเต็มความกว้างปุ่มเดียวของจอ ไม่มีปุ่มคู่** (ไม่ใช่ `.btn-secondary`/`.btn-danger-confirm` และไม่ใช่ `.btn-primary` ที่มีปุ่มรองวางข้างหรือใต้) | `run.summaryContinue` "(เดินต่อเพื่อรับเพิ่ม)" 13 ช่อง — ปุ่มหลักเดี่ยวของทุก state ใน `S-04-run-summary` (ยืนยันซ้ำหัวข้อ 3 และ 05-run-summary.html) |
| `label` | 20 ช่อง 1 บรรทัด | context label, หัว card, chip, tab | `settings.autoRetreatToggleLabel` "(ถอยอัตโนมัติ)" — เจ้าของ layout ต้องเหลือที่ว่างพอ 20 ช่องข้าง toggle เสมอ |
| `push` | หัวข้อ ≤24 ช่อง เนื้อหา ≤64 ช่อง | native push notification (นอกขอบเขต HTML wireframe นี้ แต่ใช้ copy key เดียวกับ toast บนจอ ตาม flow หัวข้อ 8) | HP ต่ำ/auto-retreat/ตายขณะแอปพื้นหลัง |
| `dialogue` | ≤5 บรรทัด บรรทัดละ ≤32 ช่อง | ไม่ใช้ในนาที 0–10 (ไม่มีตัวละครพูดยาวในนี้) | สำรองสำหรับหน้า lore/NPC ในอนาคต |
| `command` | ≤16 ช่อง | ปุ่มใน Quick command drawer (32px grid) | "มาแล้วจ้า", "ขอเลือดหน่อย" |

หน่วยและตัวเลข: ระยะ format ตาม `unit.m`/`unit.km` (narrative style-guide 4.2) · เลเวลในป้ายสั้นใช้ `Lv.{levelMin}–{levelMax}` เสมอ (ตัวย่อ "Lv." เป็นคำทับศัพท์ที่อนุญาต ตัวพิมพ์ใหญ่-เล็กตายตัว) · ห้ามพิมพ์ตัวเลขตรงในคอมโพเนนต์ ทุกเลขต้องมาจากตัวแปรหรือ config เท่านั้น

### 10.1 กฎเลือก `buttonFullWidth` (D-050, บันทึกโดย P1-X10)

`buttonFullWidth` ไม่ใช่ `kind` ใหม่ใน `copy.th.json` (ยังเป็น `kind: button` เดิม) แต่เป็น**เพดานทางเลือก**ที่ copy lint ใช้แทน `limits.button` (12 ช่อง) เมื่อครบทั้ง 2 เงื่อนไข:

1. **key อยู่ในรายชื่อ** `copy-rules.json#limits.buttonFullWidth.keys` เท่านั้น (ปัจจุบันมีรายการเดียว: `run.summaryContinue`) — narrative-designer เป็นผู้เพิ่ม/ลด key ในรายชื่อนี้ ไม่ใช่ uiux
2. **uiux-designer ยืนยันในเอกสารนี้ว่าหน้าจอที่ใช้ key นั้นแสดงปุ่มนี้เป็นปุ่มหลักเต็มความกว้างปุ่มเดียวจริง** (ไม่มีปุ่มคู่ ไม่มีปุ่มรอง) — ตรวจแล้ว: `S-04-run-summary` ทุก state (จบปกติ, ตาย, ออกเอง, ปิดฉุกเฉินโดย moderator) มีแค่ `.btn-primary.btn-fullwidth-bottom` เดียวต่อจอ ไม่มี `.btn-secondary`/`.btn-danger-confirm` คู่กัน (ดู `wireframes/05-run-summary.html`) — เข้าเงื่อนไขครบ ยืนยัน `run.summaryContinue` ใช้เพดาน 16 ช่องได้

ถ้าในอนาคตมีจอที่ต้องการปุ่มเต็มความกว้างข้อความยาวอีก ต้องขอ narrative-designer เพิ่ม key ใน `copy-rules.json` และ uiux-designer ต้องยืนยันเงื่อนไขข้อ 2 ในเอกสารนี้ก่อน ไม่ใช่ผู้พัฒนาเลือกเอง

## 11. ตารางสถานะที่คอมโพเนนต์ต้องรองรับ

รายละเอียดเต็มอยู่ที่ `design/ux/flows/F03-core-loop.md` หัวข้อ 7 (ตารางสถานะทุกหน้า) เอกสารนี้สรุปเฉพาะที่กระทบ "คอมโพเนนต์" โดยตรงเพื่อให้ gameplay-programmer ต่อ state ได้ครบตอน build จริง

| สถานะ | คอมโพเนนต์ที่ต้องมี state นี้ | พฤติกรรม |
| --- | --- | --- |
| empty | Card (ไม่มีคนใน dungeon), Drawer (ไม่มี nearby party), reward list (ตาย) | ซ่อน element ทั้งชิ้น ไม่แสดงเลข 0 หรือกล่องว่างเด่น (A-P1-F03-T16-3) |
| loading | Button (กลายเป็น spinner + disable กันกดซ้ำ), HP bar (spinner ทับสั้นตอน resume) | ห้ามค้าง spinner เกิน UX ที่ยอมรับได้โดยไม่มีข้อความอธิบาย |
| GPS ปิด / accuracy ต่ำ | GPS pill (หัวจอ), Popup confirm (ห้ามเปิดถ้าไม่รู้ตำแหน่ง) | ใช้ copy `gps.off` / `gps.denied` / `gps.lowAccuracy` ตรงกับ state enum ของ `LocationProvider` (flow หัวข้อ 9.5) |
| offline | Toast/Banner (`gps.offline`), ปุ่มที่ต้องยิง request (disable + `common.offlineRetry`) | ไม่ใช้คำว่า "หยุด"/"เสีย" เพราะ run ยังไม่ขาด |
| dungeon ปิด | Confirm card/Popup (B4) | ไม่มีปุ่ม "เข้า" เลย มีแค่ปุ่มปิด popup |
| นอกระยะ | Popup confirm (GPS drift) | ปิด popup กลับแผนที่ ไม่ลงโทษ ไม่ค้างจอ |
| error | ทุกคอมโพเนนต์ที่ยิง request | `common.error` + ปุ่มลองใหม่เสมอ ไม่ใช้สีเดียวกับ `run.tickDenied` (นั่นไม่ใช่ error) |

## 12. จอพกกระเป๋า (Wake Lock pocket screen) — ทิศทาง A ตัดสินแล้ว (F-04)

เดิมเป็นประเด็นเปิด (จาก P1-F02-T27, product-manager): โจทย์ต้นเรื่องของ role นี้บอกว่า "มือถือกลับกระเป๋าได้" แต่ GDD กำหนดว่า "ล็อกหน้าจอ (v1 เว็บ) หยุดนับ movement ทันที" สองข้อนี้ขัดกันตรง ๆ ในทางปฏิบัติ — **game-director ตัดสินทิศทาง A** ใน `design/reviews/F03-design-gate-a.md` หัวข้อ 4.4 (แทนทางเลือก B ที่เคยเป็นค่าเริ่มต้น) ด้วยหลักการข้อ 3 ของ pillars: คนที่เดินทางมาและเดินจริงตามที่เกมบอกไม่ควรเสีย tick เพราะข้อจำกัดของ browser ทางเลือก B ยังอยู่เป็นทางสำรองเมื่อ Wake Lock ใช้ไม่ได้ (หัวข้อ 12.3) ตัวอย่างจริงอยู่ที่ `wireframes/03-run-active.html` เฟรม C0/C0b

### 12.1 องค์ประกอบของจอพกกระเป๋า
| ส่วน | สเปก |
| --- | --- |
| พื้นหลัง | เต็มจอสีเกือบดำ (`ink.900`) ไม่มี animation ต่อเนื่อง (P4, ประหยัดแบตจอ OLED) |
| ตัวเลข HP (`[run.pocketHp]`) | ใหญ่สุดในแอป ตัวหนา contrast สูงสุดกับพื้นหลัง (เกินเพดานขนาดปกติของ `type.h1` ได้ เพราะเป็นจอพิเศษจอเดียวไม่มีองค์ประกอบอื่นแย่งพื้นที่) ใช้ `type.numeric` (tabular figures) ค่าจาก server เท่านั้น เหมือน HP bar ปกติ (หัวข้อ 7) — client ห้ามคำนวณเอง |
| เวลาถึง tick ถัดไป (`[run.pocketNextTick]`) | รองจากตัวเลข HP ขนาดเล็กกว่า (เทียบเท่า `type.h2`) นับถอยหลัง mm:ss เป็น widget ตัวเลขสด |
| ป้ายยืนยันว่านับระยะอยู่ (`[run.pocketCounting]`) | `type.caption` สีจาง อยู่ล่างสุดของกลุ่มข้อความ ให้ความมั่นใจว่าจอมืดไม่ได้แปลว่าไม่นับ |
| ปุ่ม | **ไม่มีปุ่มใดบนจอนี้เลย** (กันแตะพลาดในกระเป๋า) รวมปุ่มออกเอง ยา quick command |
| Gesture ออก | ปัดขึ้นค้าง (`swipe-up-hold`) ระยะเวลาขั้นต่ำเป็น implementation ของ gameplay-programmer แต่ต้องนานพอกันปัดผ่านโดยบังเอิญ แสดงคำใบ้ `[run.pocketWakeHint]` ครั้งแรกของบัญชีเท่านั้น |
| กลับเข้าจอพกกระเป๋า | ปุ่ม `[run.pocketEnterButton]` บนจอ run ปกติ (หลังปัดออกมาแล้ว) ให้ผู้เล่นกดกลับเข้าเองเมื่อพร้อม — ไม่กลับอัตโนมัติตามเวลา (กันจอมืดกะทันหันระหว่างใช้ยา/ดู nearby party) |
| Toast/cue | HP ต่ำ, auto-retreat, ตาย, tick — ใช้ sound/vibrate ชั้นฐานเดิม (audio direction หัวข้อ 10) ไม่ต้องออกจากจอพกกระเป๋าเพราะหน้าเว็บยัง foreground |

### 12.2 จังหวะขอ/ปล่อย Wake Lock
- ขอ (`navigator.wakeLock.request('screen')`) ทันทีหลัง server ยืนยัน B5 (เข้า run สำเร็จ) — ไม่ขอที่หน้าอื่นนอก `S-03-run`
- ปล่อยเสมอเมื่อจบ run ทุกทาง (สรุปผล, auto-retreat, ตายแล้วออก, ปิดฉุกเฉิน — ครบทุก exit path ของ run state machine หัวข้อ 4.1 ของ flow)
- ถ้า tab ถูกซ่อน (visibility hidden) OS อาจปล่อย wake lock เองอัตโนมัติ — client ต้อง request ใหม่ทันทีที่ visibility กลับมา visible โดยไม่ต้องแจ้งผู้เล่น เว้นแต่ request ล้มเหลวซ้ำ

### 12.3 ทางสำรอง B (Wake Lock ใช้ไม่ได้)
ถ้า `navigator.wakeLock` ไม่มีใน browser หรือ request throw/reject: ไม่แสดงจอพกกระเป๋าเลย ใช้จอ run ปกติ (หัวข้อ 2–11 เดิม) พร้อม toast ครั้งเดียวต่อบัญชี `[run.screenLockNotice]` ("จอดับ ระยะก็หยุดนับ เปิดจอไว้ระหว่างเดิน") ตอนเข้า run ครั้งแรก — ถ้าผู้เล่นล็อกจอเองอยู่ดี เมื่อกลับมาแสดง `[gps.suspended]` ตามข้อเท็จจริง ไม่ใช่ tutorial ซ้ำ

### 12.4 Toggle ในตั้งค่า
หน้าย่อย "การเดินและความปลอดภัย" (เหมือน auto-retreat หัวข้อ 9) มี toggle `[settings.pocketScreenLabel]` ("จอพกกระเป๋า") พร้อมคำอธิบาย `[settings.pocketScreenHint]` ค่าเริ่มต้นเปิด **ปิด/เปิดไม่ต้อง popup ยืนยันทั้งคู่** (ต่างจาก auto-retreat) เพราะเป็นทางเลือกการแสดงผล ไม่ใช่ระบบกันตาย — ปิดแล้วจอ `S-03-run` แสดงข้อมูลเต็มตลอด ไม่มีจอมืดให้ปัด ยัง request Wake Lock เหมือนเดิมเพื่อกัน movement หยุดนับ

### 12.5 เกณฑ์ถอยกลับไป B ทั้งระบบ
ถ้า Phase 2 (tech-lead + product-manager, F-17) วัดแบตต่อชั่วโมงในเครื่องทดสอบทั้ง Android และ iOS เกินงบที่ตกลงไว้ ให้ส่งกลับ game-director ตัดสินใหม่ ไม่ถอยเงียบ (gate A หัวข้อ 4.4 ข้อ 8)

## 13. สมมติฐานและการส่งต่อ

1. บอร์ด T17 เสนอ touch target ขั้นต่ำ 44px แต่ context ของ task และ `art/direction/style-guide.md` S8 กำหนด 48px เอกสารนี้และ `tokens.json` ใช้ **48px** เป็นค่าจริง (สูงกว่าค่าเสนอในบอร์ดโดยตั้งใจ ไม่ใช่ต่ำกว่า) — ยืนยัน: art-director, game-director
2. ป้ายชื่อโซนที่ 360px ยังทดสอบด้วย font ตัวแทน (system font) ไม่ใช่ IBM Plex Sans Thai Looped ตัวจริง เพราะยังไม่มีไฟล์ font จริงส่งมาถึง T17 — ต้องทดสอบซ้ำเมื่อ `asset-pipeline.md` (P1-F03-T11) ส่งไฟล์ font จริง (ยืนยัน: art-director)
3. Icon จริง (SVG ตาม icon-grammar) ยังไม่มีไฟล์จาก artist-2d (P1-F03-T14/T13) wireframe จึงใช้ตัวอักษรย่อ/รูปทรงพื้นฐานแทน icon จริงชั่วคราว ไม่ใช่ของสุดท้าย — ต้องเปลี่ยนเป็น SVG จริงก่อน build (ยืนยัน: artist-2d)
4. เกณฑ์ตัวเลขที่ยังไม่มีใน config (`unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s`, `location.minAccuracy_m`) ใช้ค่าตัวอย่างในวงเล็บของ wireframe เท่านั้น รอ P1-H03 (ยืนยัน: systems-designer)
5. (P1-X10) เพดานชื่อโซน 17/14/34 ยืนยันด้วยการคำนวณจากข้อมูลจริงใน `names.th.json` (นับ cells จาก field `cells` ที่มีอยู่ ลบตัวคั่นและคำขยาย) ไม่ใช่การวัดจริงบนหน้าจอด้วย font สุดท้าย — ยังต้องทดสอบซ้ำเมื่อมี font จริง (สืบเนื่องจากข้อ 2) โดยเฉพาะกรณีชื่อที่เข้าใกล้เพดาน 34 ช่องเต็ม ซึ่งสต็อกตั้งต้นยังไม่มีตัวอย่างจริง (ยืนยัน: art-director, narrative-designer)
6. (ปิดแล้ว, P1-X17, F-07) `A-P1-F03-T17-4` เดิม (age-gate ไม่มีปุ่มยืนยันแยก) **ถูกแก้แล้ว:** game-director ตัดสิน CHANGE ใน gate A หัวข้อ 4.8 — age-gate ต้องมีปุ่มยืนยันแยก (`age.gateConfirm`, `.btn-disabled` จนกว่าจะเลือกตัวเลือก) เพราะการแตะพลาดบนรายการที่เลื่อนได้เกิดบ่อย และผลของการเลือกผิดกระทบข้อมูลอายุที่มีผลทางกฎหมาย (NN-7) ดู `wireframes/00-onboarding.html` เฟรม 4 และ flow หัวข้อ 2 ขั้น 4

### Handoff
- ~~to: game-director, tech-lead | need: ตัดสินประเด็นเปิดหัวข้อ 12 (Wake Lock vs คำเตือนเปิดจอค้าง)~~ **ตัดสินแล้วใน design gate A หัวข้อ 4.4 (P1-X17):** ทิศทาง A (จอพกกระเป๋า/Wake Lock) เป็นค่าเริ่มต้น สเปกเต็มอยู่หัวข้อ 12 ข้างบน — เหลือ handoff ต่อ tech-lead: ยืนยันความเป็นไปได้จริงของ Wake Lock บน Android Chrome/iOS Safari, พฤติกรรมเมื่อผู้ใช้กดล็อกจอเอง, แบตต่อชั่วโมง, support matrix ของ vibrate/web push (F-17, Phase 2 ก่อน build F04/F05) | blocking: no (ถ้าทำไม่ได้จริงหรือเกินงบแบต ส่งกลับ game-director ตาม gate 4.4 ข้อ 8 ไม่ถอยไปทางเลือก B เงียบ ๆ)
- ~~to: narrative-designer | need: ยืนยัน copy key ทั้งหมดที่ wireframe ใช้ตรงกับ `copy.th.json` จริง~~ **ทำแล้วใน P1-X13:** ผูก copy key จริงครบทุกจุดที่ copy gate (`design/reviews/F03-copy-gate.md` หัวข้อ 6.2, 6.3) ระบุ แทนที่ pseudo-key `hp` ด้วย `run.hpBarLabel` และแก้ร่างไทยให้ตรง `copy.th.json` ทุกจุดแล้ว (F-02, F-03)
- ~~to: narrative-designer | need: แก้ `copy.th.json#_variables.zoneRealName.maxCells` จาก 18 เป็น 17~~ **ปิดแล้ว (P1-X11):** narrative-designer แก้เป็น 17 แล้ว ตรงกับ `names.th.json` (ยืนยันโดย uiux-designer ใน P1-X13, F03 copy gate F-06)
- to: art-director | need: ทดสอบป้ายชื่อโซนซ้ำด้วย font จริงเมื่อมี asset-pipeline (ข้อ 2 ด้านบน) และยืนยัน icon จริงแทนตัวอักษรย่อ (ข้อ 3) รวมถึงกรณีชื่อยาวเข้าใกล้เพดาน 34 ช่อง (ข้อ 5 ใหม่) | why: contrast และความกว้างจริงอาจต่างจาก wireframe | blocking: no
- to: gameplay-programmer | need: state enum ของ `LocationProvider` (`gps.*`) ต้องตรงกับชื่อใน flow หัวข้อ 9.5 และคอมโพเนนต์นี้หัวข้อ 11 | why: กันเดาชื่อ state เอง (N-7) | blocking: no
- to: gameplay-programmer | need: (P1-X10) `h1.scr-title` (หัว popup confirm dungeon) ต้อง implement เป็น layout ที่รับการตัดบรรทัดเป็น 2 บรรทัดได้ (ไม่ใช่ `white-space: nowrap` หรือ ellipsis บังคับบรรทัดเดียว) | why: เพดาน `zoneName` เต็ม 34 ช่องยังไม่เคยถูกทดสอบจริงบนจอ 360px (สต็อกตั้งต้นยาวสุดแค่ 27 ช่อง) | blocking: no
- to: narrative-designer | need: (P1-X13) เพิ่ม copy key ให้ข้อความบนการ์ด B3 (คร่อมวง raid) ใน `wireframes/02-dungeon-confirm.html`: คำอธิบายการ์ด dungeon ปกติ ("dungeon ปกติ") และการ์ดบอส ("HP realtime · ทุกคนช่วยกัน") ปัจจุบันไม่มี key ใน `copy.th.json` | why: UI ห้ามฝังข้อความ (protocol 9) ตอนนี้ยังเป็น placeholder ไม่มี key | blocking: no
- ~~to: narrative-designer, game-director | need: ตัดสินว่าเมนู "ภาษา" ใน S-22-settings อยู่ใน scope Phase 1 จริงหรือไม่~~ **ตัดสินแล้ว (F-08, gate A หัวข้อ 5.2):** เมนู "ภาษา" ไม่อยู่ใน v1 (in-game copy เป็นไทยล้วนตาม CLAUDE.md) ตัดออกจาก `06-settings-autoretreat.html` เฟรม E1 แล้ว ไม่ต้องสร้าง key `settings.languageLink`
- to: systems-designer, narrative-designer | need: ยืนยันข้อยกเว้นใน `02-dungeon-confirm.html` เฟรม B2 (polygon ซ้อน): การ์ดเทียบต้องโชว์ "0 คน" ตรงๆ เพื่อให้เทียบ 2 การ์ดได้ ต่างจากกฎทั่วไปที่ซ่อนบรรทัดเมื่อจำนวนเป็น 0 (A-P1-F03-T16-3) | why: ป้องกันไม่ให้อ่านผิดว่าเป็นบั๊ก | blocking: no
- to: narrative-designer | need: ยืนยันการ์ด B3 (คร่อมวง raid) ใช้ `shop.title`/`market.title`-style copy key จริงแทน placeholder "dungeon ปกติ"/"HP realtime · ทุกคนช่วยกัน" ใน `02-dungeon-confirm.html` — ยังไม่มี key รองรับ 2 บรรทัดนี้โดยเฉพาะ | why: UI ห้ามฝังข้อความ (protocol 9) | blocking: no
- to: gameplay-programmer | need: implement gesture "ปัดขึ้นค้าง" (swipe-up-hold) ออกจากจอพกกระเป๋า (หัวข้อ 12.1) กำหนดระยะเวลาขั้นต่ำจริงกันปัดผ่านโดยบังเอิญ และ implement toggle `settings.pocketScreenLabel` (หัวข้อ 12.4) | why: เอกสารนี้กำหนดพฤติกรรม UX เท่านั้น ไม่ได้กำหนดตัวเลข ms จริง | blocking: no

## REPORT
task: P1-F03-T17
status: DONE
summary: สร้าง wireframe HTML 7 ไฟล์ครอบทุกหน้าใน flow หลัก (consent+อายุ 15+, HP 30%, auto-retreat, ตาย, ออกเอง, tick ไม่ผ่าน gate, ตั้งค่า auto-retreat) พร้อม tokens.json และ components.md
outputs:
  - design/ux/tokens.json — color (คัดลอกจาก style-guide ตรงตัว), font, type scale, spacing, touch target 48px, radius, z-index, breakpoint
  - design/ux/components.md — สเปก navigation shell, ปุ่ม, การ์ด/popup, drawer, toast/banner, HP bar, ป้ายชื่อโซน, toggle ฝังลึก, ตาราง copy kind, ตารางสถานะ, ประเด็นเปิด
  - design/ux/wireframes/index.html — สารบัญ
  - design/ux/wireframes/00-onboarding.html — intro, consent ตำแหน่ง, permission เบราว์เซอร์, อายุ 15+, login, เลือกพลัง, แผนที่ครั้งแรก
  - design/ux/wireframes/01-map-home-states.html — ไกล, นอกพื้นที่ (โซนดำ), ไม่รู้ตำแหน่ง, ลงทะเบียนความสนใจ
  - design/ux/wireframes/02-dungeon-confirm.html — ปกติ, polygon ซ้อน, คร่อมวง raid boss, ปิดอยู่, นอกระยะ
  - design/ux/wireframes/03-run-active.html — idle, Nearby Party, Quick command, Grace/Suspended, tick granted/denied + ประเด็นเปิด Wake Lock
  - design/ux/wireframes/04-run-critical.html — HP ต่ำ 30%, auto-retreat 25% (canon), ตาย (3 ทางฟื้น), ออกเอง
  - design/ux/wireframes/05-run-summary.html — จบปกติ, ตาย, ออกเอง, ปิดฉุกเฉิน
  - design/ux/wireframes/06-settings-autoretreat.html — เมนูฝังลึก, popup ยืนยันปิด, ป้ายเตือนค้าง
  - design/ux/wireframes/shared/style.css — CSS ที่แปลงจาก tokens.json ตรงตัว
acceptance:
  - [x] wireframe HTML เปิดตรงในเบราว์เซอร์ ไม่มี build step ครอบทุกหน้าใน flow หลัก รวมหน้า consent + อายุ 15+, HP 30%, auto-retreat, ตาย, ออกเอง, tick ไม่ผ่าน gate และตั้งค่า auto-retreat (MF-1, MF-2) — evidence: ไฟล์ทั้ง 7 ใช้ `<link>` CSS ธรรมดา ไม่มี framework/bundler, ตรวจแล้วว่าเปิดได้ตรงจาก `file://`; ครอบ `S-00-consent-location`+`S-00-age-gate` (00-onboarding.html), HP 30%+auto-retreat 25%+ตาย+ออกเอง (04-run-critical.html), tick ไม่ผ่าน gate (03-run-active.html เฟรม C5), ตั้งค่า auto-retreat (06-settings-autoretreat.html)
  - [x] ข้อความใช้ copy key พร้อมร่างไทยในวงเล็บ — evidence: ทุกข้อความในทุกไฟล์ใช้ `<span class="copykey">key.name</span>` ตามด้วย `<span class="thaidraft">(ร่างไทย)</span>` ตรงกับรายการ copy key ใน flow หัวข้อ 9
  - [x] `tokens.json` (spacing, type scale, touch target ขั้นต่ำ 44 px, สีจาก palette) และ `components.md` — evidence: `tokens.json` มี `space`, `type`, `touchTarget.min_px=48` (สูงกว่าเกณฑ์ 44px ในบอร์ดตามคำสั่ง context ให้ยึด style-guide S8), `color.*` คัดลอกจาก `art/direction/style-guide.md` หัวข้อ 3 ตรงทุกค่า; `components.md` ครบ 13 หัวข้อ
  - [x] ใช้งานมือเดียวบนจอมือถือได้ — evidence: ทุกปุ่มหลักใน wireframe อยู่ครึ่งล่างจอ (`.btn-fullwidth-bottom` หรือใน popup/drawer ที่เลื่อนจากล่าง) สูง ≥48px ตาม `components.md` หัวข้อ 3
assumptions:
  - A-P1-F03-T17-1: touch target ใช้ 48px ไม่ใช่ 44px ตามบอร์ด เพราะ context ของ task สั่งให้ไม่ต่ำกว่า style-guide S8 (owner: art-director, game-director)
  - A-P1-F03-T17-2: ป้ายชื่อโซนทดสอบด้วย font ตัวแทน ยังไม่ใช่ IBM Plex Sans Thai Looped จริง (owner: art-director)
  - A-P1-F03-T17-3: icon ใน wireframe เป็นตัวอักษรย่อ/รูปทรงพื้นฐานแทน SVG จริงจาก icon-grammar เพราะยังไม่มีไฟล์ asset (owner: artist-2d)
  - A-P1-F03-T17-4: age-gate ไม่มีปุ่มยืนยันแยก เลือกตัวเลือกแล้วไปต่อทันที (owner: game-director)
handoffs:
  - to: game-director, tech-lead | need: ตัดสินประเด็นเปิด "เก็บมือถือกระเป๋าได้" vs "ล็อกจอหยุดนับระยะ" (2 ทางเลือกใน components.md หัวข้อ 12 และ wireframes/03-run-active.html) | why: กระทบ implementation ของ movement gate บนเว็บและความคาดหวังของผู้เล่น | blocking: no (ใช้ทางเลือก B เป็นค่าเริ่มต้นตาม flow T16 ไปก่อน)
  - to: narrative-designer | need: ยืนยัน copy key และร่างไทยสุดท้ายให้ตรงกับ `copy.th.json` (P1-F03-T05) ก่อน content gate (P1-F03-T21) | why: wireframe ใช้ร่างไทยชั่วคราว | blocking: no
  - to: art-director | need: ยืนยัน token สีตรงกับ style-guide (ตรวจซ้ำใน content gate visual P1-F03-T22), ส่ง font จริงและ icon SVG จริงมาแทนที่ placeholder | why: A-P1-F03-T17-2, A-P1-F03-T17-3 | blocking: no
  - to: gameplay-programmer | need: ใช้ `tokens.json`/`components.md` เป็นฐานตอน build จริง และยืนยันชื่อ state `gps.*` ตรงกับ `LocationProvider` | why: กันเดาค่าเอง (N-7) | blocking: no
decisions:
  - none
questions_for_human:
  - none
