# Component Spec — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T17 · แก้ไขโดย P1-X10 (บันทึกข้อยกเว้น `buttonFullWidth` D-050 หัวข้อ 10.1, ยืนยันเพดานชื่อโซน 17/14/34 หัวข้อ 8), P1-X17 (2026-09-23: F-04 ตัดสินทิศทาง A จอพกกระเป๋า/Wake Lock แทนประเด็นเปิดเดิมในหัวข้อ 12, F-08 ตัดเมนูภาษาออกจาก v1), P1-X35 (2026-09-24: แก้ V-02 ตาม `art/reviews/F03-visual-gate.md` 3.7a–d — เลิกพื้นอ่อนนอก token ของ pill/banner, toast จางเป็นทึบ 100%, การ์ดที่เลือกคงขอบหมึก+เพิ่มวงแหวนนอก, รอยแยกจำลองทึบมีขอบหมึก · เพิ่มหัวข้อ 3.1 บันทึกเงื่อนไข R-6 ของปุ่ม login) P2-H05 (2026-09-27: เพิ่มหัวข้อ 13.9 — เทคนิคเรนเดอร์ `icon.ui.*`/`icon.ui16.*` ที่ต้อง tint ตามโทน, ตัดสินใช้ inline SVG + field `tintable` ใหม่ในทะเบียน asset) P2-H39 (2026-09-28: แก้หัวข้อ 12.1 แถว Toast/cue + เพิ่มหัวข้อ 15.4 — ตัดสินไม่เพิ่มระดับ z-index ใหม่เหนือ `overlay` ให้ toast บนจอพกกระเป๋า ใช้เสียง/สั่น/ตัวเลข HP-tick ของจอพกกระเป๋าเองแทน) และ P2-H40 (2026-09-28: ปิด A-P2-X38-4/V-38/V-32/V-22 — เพิ่มหัวข้อ 3.2 (ปุ่มทางลัดในเนื้อหา), 3.3 (ยืนยันปุ่ม primary ของ inventory = 0), แก้ GPS pill หัวข้อ 2.1 เป็น 16px, แก้ตาราง toast/banner หัวข้อ 6 ให้ 16px ทุกแถวและรวมป้าย auto-retreat-off เข้ากับ `.banner.warn`, ยืนยัน `run.hpBarLabel` ไม่ใช้ในหัวข้อ 7) และ P2-H49 (2026-09-28: ตรวจสมมติฐาน CSS ของ P2-X42 — ปิด A-P2-X42-1 เพิ่มตารางสีต่อสถานะของ `.gps-pill` หัวข้อ 2.1 (ไม่ใช่ `state.danger` เดียวทุกสถานะ, `searching`=`state.info`), ปิด A-P2-X42-3 เพิ่มตาราง icon ต่อเหตุของแถว check-in หัวข้อ 13.3 (ยืนยันโค้ดถูกแล้ว), ปิด A-P2-X42-4 เพิ่มหัวข้อ 3.4 (แก้ทิศทาง: `.btn-fullwidth-bottom` ต้อง `position: sticky` ไม่ใช่ normal flow เฉยๆ เพราะรายการรางวัลของ `S-04-run-summary` ไม่มีเพดาน)) และ P2-H51 (2026-09-28: ยืนยันตำแหน่งป้าย Recovering ที่ build เดาไว้เอง (C6-05) เป็นสเปกจริง เพิ่มหัวข้อ 6.1 พร้อมพบไอคอนที่ขาด · ปิด C6-06 เพิ่มย่อหน้าในหัวข้อ 13.8 ว่าชิประยะของ `home.farBody` อยู่บรรทัดใหม่ต่อจาก body ไม่ใช่ฝังกลางประโยค) และ P2-H54 (2026-09-30: ปิด R2-3/R2-5 ของ `art/reviews/F04-F06-visual-gate.md` §7.3 — แก้หัวข้อ 3.4 ให้พื้น `bg.paper` อยู่ที่แถบ `.screen-bottom-bar` ใหม่ ไม่ใช่ที่ตัวปุ่ม `.btn-fullwidth-bottom` เอง, แก้หัวข้อ 13.2 ให้ตัวอักษร run-state pill เป็น 16px ทุกสถานะ, เพิ่มหัวข้อ 13.10 ยืนยันรูปทรงปุ่มแผนที่ตามตัว `#follow-toggle` และหัวข้อ 9.1 ปิด V-42 รูปทรง toggle switch) และ P2-F10-T06 (2026-10-01: เพิ่มหัวข้อ 16 — bottom nav 5 ช่องคงที่ของ F10 (`.bottombar-f10`), ปุ่ม Setting มุมบนขวาแบบ plate ลอย, จอเร็วๆ นี้, ช่องชื่อตัวละคร+ปุ่มสุ่ม+คำเตือน, story pager, ปุ่ม login bypass, แถวออกจากระบบ · ยืนยัน A-P2-F10-T02-3/A-4 ของ `art/direction/F10-shell-direction.md` เป็นค่าสุดท้าย) · เจ้าของ: uiux-designer · สถานะ: แก้ตาม `art/reviews/F03-visual-gate.md` (V-02) รอ re-run gate รอบถัดไป · วันที่: 2026-10-01
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
13. คอมโพเนนต์ F04 Phase 2 (state chip, run header, check-in row, speed-lock overlay, direction arrow card, HP bar edge marker, chip-sponsored, distance chip, run-state pill, 13.9 เทคนิคเรนเดอร์ icon ที่ต้อง tint)
14. สมมติฐานและการส่งต่อ
15. Z-index scale และโครง `#hud` (D-129, P2-H28)
16. คอมโพเนนต์ F10 (bottom nav 5 ช่องคงที่, ปุ่ม Setting ลอย, จอเร็วๆ นี้, ช่องชื่อ+ปุ่มสุ่ม, story pager, ปุ่ม login bypass, แถวออกจากระบบ)

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
| กลาง (ต่อ) | GPS pill | `.gps-pill` สูง ≥28px (พอสำหรับข้อความ 16px + padding แนวตั้ง — แก้จาก ≥24px/14px ใน P2-H40) มุม `radius.chip` พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบ 2px สี state | ไอคอนเล็ก 16px (`icon.ui16.location-off` เมื่อ bad) + ข้อความ **16 px ตัวหนา** สีตาม `state.success`(ok)/`state.danger`(bad) ทั้งขอบและข้อความ **ต้องมีคำกำกับด้วยเสมอ** (ห้ามใช้สีอย่างเดียว ตาม style-guide S4) |
| ขวา | settings icon | เหมือน avatar icon | กดแล้วไป `S-22-settings` เสมอ ทุกหน้า ทุกสถานะ |

กฎร่วม: header bar อยู่ตำแหน่งเดิมทุกหน้าไม่เปลี่ยน (เดาตำแหน่งได้แม้ไม่มองจอนาน ตาม ia.md) สูงขั้นต่ำ = `touchTarget.min_px` (48 px)

**ปิด V-38/V-22 (P2-H40, ยืนยันแบบเดียวของ GPS pill):** เลือก **ทรง `bg.surface` + ขอบสี state เดิมของหัวข้อนี้** ไม่ใช้ทางเลือกพื้นทึบ `ink.900` ที่ build ปัจจุบันทำอยู่ (ซึ่งบังเอิญผ่าน contrast ที่ 14px เพราะพื้นเข้มกว่ามาก) เหตุผล: (1) สม่ำเสมอกับทุก pill/chip/badge อื่นในระบบที่ใช้ `bg.surface`+ขอบสี ไม่ใช่พื้นทึบเข้ม (chip สถานะ 13.1 ห้ามพื้น `ink.900`+`bg.paper` ชัดเจนอยู่แล้วด้วยเหตุผลเดียวกัน) พื้นทึบเข้มสงวนไว้เฉพาะปุ่มหลัก/toast อันตรายที่ตั้งใจให้เด่นสุดของจอเท่านั้น (2) กัน GPS pill กลายเป็นภาษาภาพที่สองแยกจาก header — ตาม `art/direction/style-guide.md` หัวข้อ 2 "ตัวอย่าง S8" (เพิ่มโดย P2-H43): คู่สี state บนพื้นสว่างได้แค่ 5.50–6.25:1 ไม่ถึง 7:1 จึงต้อง **16 px เสมอ ไม่มีข้อยกเว้น 14 px สำหรับสี state** (14px สงวนไว้เฉพาะคู่ `ink.900`/`ink.700` บน `bg.surface`/`bg.paper` ที่ได้ ≥16:1 เท่านั้น ตามตารางเดียวกัน) — ปิด V-22 เดิมที่เคยอนุญาต "≥14px" ของหัวข้อนี้ด้วย ตัวเลขนั้นใช้ไม่ได้แล้วสำหรับสี state [handoff gameplay-programmer: แก้ `.gps-pill` ให้เป็นพื้น `bg.surface`+ขอบสี state (ไม่ใช่พื้น `ink.900` ทึบ) และข้อความ 16px ตัวหนา ไม่ blocking ด้าน PDPA]

**ปิด A-P2-X42-1 (แม็ปสีต่อสถานะ, ไม่ใช่ `state.danger` เดียวทุกสถานะที่แสดง):** `GpsDisplayState` (`src/copy/gps-state.ts`) มี 6 ค่า แต่ `none` ไม่เคยวาด pill เลย (ซ่อนทั้งก้อนเมื่อสัญญาณดี, `GPS_DISPLAY_COPY.none = null`) ดังนั้นในทางภาพไม่เคยมี pill สี "ok"/`state.success` จริง — ประโยคเดิมด้านบนของหัวข้อนี้ ("สีตาม `state.success`(ok)/`state.danger`(bad)") จึงอ่านเป็นเคสทฤษฎีที่ไม่เกิดขึ้นจริง แก้เป็นตารางสถานะจริงทั้ง 5 ที่แสดงได้:

| `GpsDisplayState` | โทน | เหตุผล |
| --- | --- | --- |
| `searching` | `state.info` | ชั่วคราวปกติ (รอ fix แรก/หลัง resume) เกิดทุกครั้งที่เปิดแอปหรือกลับจาก background ไม่ใช่ปัญหาที่ต้องแก้ไข — ถ้าใช้สีแดงจะเป็น "false alarm" ซ้ำทุกครั้งจนผู้เล่นเมินป้ายแดงตอนมีปัญหาจริง (หลักการเดียวกับ `signal-wait` ของแถว check-in หัวข้อ 13.3: สถานะรอ ไม่ใช่การจับผิด/ความล้มเหลว) ไม่มี icon คู่ (ไม่มี "bad" ให้ชี้ตาม `icon.ui16.location-off`) |
| `off` / `denied` / `unsupported` / `lowAccuracy` | `state.danger` | ทั้ง 4 บล็อกไม่ให้เปิด popup confirm dungeon และตกไปที่สถานะ "ไม่รู้ตำแหน่ง" (D3) เดียวกันของ `S-01-map` (flow F03 หัวข้อ 7) ต้องให้ผู้เล่นรู้ทันทีว่าต้องแก้ไขเอง (เปิด GPS/ไปเปิดสิทธิ์ในตั้งค่า/หาที่โล่ง) — มี `icon.ui16.location-off` กำกับคู่ข้อความเสมอ |

ใช้ pattern เดียวกับ run-state pill (13.2)/chip-status (13.1): `data-tone="info"|"danger"` บนตัว `.gps-pill` แทนสีตายตัวในคลาสฐาน (build ปัจจุบันฝัง `state.danger` ไว้ตรงในคลาส `.gps-pill` เดียว ทำให้ `searching` กลายเป็นสีแดงไปด้วย) — ไม่ใช้ `state.success` เลยในคอมโพเนนต์นี้เพราะไม่มีสถานะ "ok ที่ยังวาด pill" ในดีไซน์นี้จริง (ยืนยันพฤติกรรมซ่อนทั้งก้อนตอน `none` เป็นของถูกต้องแล้ว ไม่ใช่ของตกหล่น)

[handoff gameplay-programmer: `apps/client/src/app.css` เพิ่ม `.gps-pill[data-tone="info"]` (ขอบ+ข้อความ `state.info`) คู่กับ `.gps-pill[data-tone="danger"]` (ขอบ+ข้อความ `state.danger`, ค่าเดิมที่มีอยู่แล้ว) แทนสีตายตัวในคลาสฐาน · `apps/client/src/ui/gps-ui.ts` ตั้ง `pillLabel.dataset['tone']` ตามตารางนี้ (`searching`→`info`, ที่เหลืออีก 4 ตัว→`danger`) เวลาเรียก `setDisplay()` ไม่ blocking]

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
ใช้กับป้ายเหตุการณ์สดที่ไม่ใช่ nav ถาวร (เช่น อยู่ใน dungeon, HP ต่ำ, raid ใกล้เริ่ม) วางไว้ใต้ header bar เสมอ ไม่ทับ context label · z-index = `zIndex.banner` (10, **แก้ P2-H28** — เดิมชื่อ `zIndex.mapOverlayBanner`) ต่ำกว่า toast/popup เสมอ — สเกลเต็มและกฎการวางดู หัวข้อ 15

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

### 3.2 ปุ่มทางลัดภายในเนื้อหา (in-content shortcut link) — ปิด A-P2-X38-4 (P2-H40)

ที่มา: `apps/client/src/ui/privacy-screen.ts` (`clearLocalDataShortcut` — ทางลัดจาก `S-23-privacy` ไปแถว "ลบข้อมูลในเครื่อง" ของ `S-22-settings`, ไม่ใช่ทางเข้าที่สอง ไม่เปิด popup ลบเอง) — ระบบคอมโพเนนต์นี้ไม่เคยมี `.btn-link`/ตัวหนังสือขีดเส้นใต้เลย

**ตัดสิน: ใช้ `.btn.btn-secondary` เดิม ไม่สร้างคลาสใหม่** เหตุผล:
1. ปุ่มนี้เป็นแค่ "ทางลัดนำทาง" ไม่ใช่ปุ่มทำลาย/ยืนยันอะไรเอง (กดแล้วแค่พาไปแถวเดิมใน `S-22`) น้ำหนักภาพเท่ากับปุ่มรองอื่นในจอเดียวกัน (`ถอนความยินยอม`, `ปิด`) จึงเหมาะสมอยู่แล้วที่จะไม่เด่นกว่าปุ่มเหล่านั้น (ไม่ใช่ CTA เดียวของจอ)
2. ทั้งแอปมีจุดใช้งานแบบนี้จุดเดียว ไม่คุ้มที่จะเปิด token/สไตล์ใหม่และขอ art-director ตรวจ contrast เพิ่มสำหรับ 1 จุด
3. ไม่ขัดกฎข้อใดของหัวข้อ 1/3 (ยังกดได้ด้วยนิ้วโป้ง ≥48px, อ่านออกกลางแดดเหมือนปุ่มรองอื่นทุกประการ)

ปิด [ASSUMPTION A-P2-X38-4] ในคอมเมนต์ของ `privacy-screen.ts` — **ไม่ต้องแก้โค้ด** (คลาสเดิมถูกต้องแล้ว) ถ้าในอนาคตมีจุดใช้งาน "ทางลัดในเนื้อหา" แบบนี้เกิน 1 จุดในแอป ให้กลับมาทบทวนร่วมกับ art-director ว่าคุ้มที่จะเปิดคลาส `.btn-link` ใหม่หรือไม่ (ไม่ใช่ตอนนี้)

### 3.3 จำนวนปุ่มหลักบน `S-11-inventory` — ปิด V-38 ข้อปุ่ม primary (P2-H40)

`S-11-inventory` มีปุ่มเงื่อนไขสองปุ่มที่อาจแสดงพร้อมกันได้ (flow F06 หัวข้อ 4 ข้อ C8): `[inventory.usePotionButton]` ("ใช้ยา" ใช้ได้เมื่อไม่มี run และ HP < maxHP) และ `[inventory.useRevivePotionButton]` ("ใช้ยาฟื้น" ใช้ได้เฉพาะสถานะ Recovering ที่มียาฟื้น) — ทั้งสองเงื่อนไขไม่ตัดกัน จึงอาจเห็นพร้อมกันทั้งคู่ในบางสถานะ

**ตัดสิน: ทั้งสองปุ่มเป็น `.btn-secondary` เสมอ ไม่มีปุ่มใดเป็น `.btn-primary` บนจอนี้** (ยืนยันจำนวนปุ่มหลักของ `S-11-inventory` = **0**) เหตุผล:
1. กฎ "1 ปุ่มหลักต่อจอ" (หัวข้อ 3) จะพังทันทีถ้าทั้งสองปุ่มเปิดพร้อมกันและเป็น primary ทั้งคู่
2. `S-11-inventory` เป็นจอเรียกดู/เลือกทำรายการ (browse) ไม่ใช่จอที่มี CTA เดียวที่ต้องกดต่อเสมอแบบ popup confirm หรือหน้าสรุป run ปุ่มใช้ยาเป็นการกระทำเสริมต่อรายการ ไม่ใช่จุดหมายหลักของการเข้าจอนี้ ควรมีน้ำหนักภาพเท่าปุ่มอื่นในรายการ (สอดคล้องกับ Settings/Credits ที่ใช้ `.btn-secondary` ทั้งจอเช่นกัน)
3. กันไม่ให้สีเหลืองเด่นสุดของจอไปแย่งความสนใจจากทางกลับ/นำทางออกจากจอ

[handoff gameplay-programmer: ยืนยัน `apps/client/src/ui/inventory-screen.ts` (หรือไฟล์ที่เทียบเท่า) ใช้ `.btn-secondary` กับปุ่มใช้ยาทั้งสอง ไม่มี `.btn-primary` บนจอนี้เลย ไม่ blocking ด้าน PDPA]

### 3.4 ปุ่มเต็มความกว้างของ `S-04-run-summary` ต้องปักอยู่ล่างจอเสมอ — ปิด A-P2-X42-4 (แก้ทิศทางจากที่ build เสนอ) · แก้ซ้ำใน P2-H54 (ปิด R2-3)

P2-X42 เสนอว่า `.btn-fullwidth-bottom` (ปุ่มเดียวของ `run.summaryContinue`, buttonFullWidth หัวข้อ 10.1) อยู่ใน normal flow ตามเนื้อหาปกติ ไม่ปักกับ viewport — **ตัดสิน: ต้องปัก (`position: sticky`) ไม่ใช่ normal flow เฉยๆ** เหตุผล:

1. `apps/client/src/ui/run-summary.ts` render รายการรางวัล (`rewardList`) โดยไม่มีเพดานจำนวนรายการ (ทุกไอเทมที่ดรอปทั้ง run) — run ที่เดินนาน (โดยเฉพาะ raid 2 ชม. ที่ GDD ย้ำว่า "ต้องรู้สึกว่ามีส่วนร่วม") อาจมีของมากพอที่ปุ่มเดียวของจอ (ไม่มีปุ่มอื่นให้กดแทนเลย) จะเลื่อนพ้นจอด้านล่างจนต้องเลื่อนหาก่อนกดได้ ขัดกับโจทย์หลักของบทบาทนี้โดยตรง (หัวข้อ 1 ข้อ 1–2: อ่านออก 3 วินาที, กดได้ด้วยนิ้วโป้งทันที) — acceptance เดิมของ P1-F03-T17 ที่เคยยืนยัน "ปุ่มหลักอยู่ครึ่งล่างจอเสมอ" ทดสอบด้วยตัวอย่างสั้นเท่านั้น ยังไม่เคยเจอเคสรายการยาวจริง
2. `.screen` (`app.css`) เป็นลูกของ `#hud` ที่ห้าม `position: fixed` (หัวข้อ 15.2, D-129) แต่ `position: sticky; bottom: ...` บน**แถบที่ห่อปุ่ม** (หลานของ `#hud`, ไม่ใช่ลูกโดยตรง) ไม่ขัดกฎนั้น — `.screen` ยังเป็น `position: absolute; inset: 0; overflow-y: auto` เหมือนเดิมทุกประการ sticky แค่ทำให้แถบค้างที่ก้นพื้นที่เลื่อนของ `.screen` เอง ไม่ใช่ค้างกับ viewport ทั้งจอ (เลี่ยงปัญหา keyboard/แถบเบราว์เซอร์ย่อขยายแบบเดียวกับเหตุผลเดิมของ D-129)
3. ขอบเขตแคบมาก ไม่กระทบที่อื่น: คลาส `.btn-fullwidth-bottom` มีจุดใช้จริงจุดเดียวในทั้งแอปวันนี้ (`run.summaryContinue`, ยืนยันซ้ำหัวข้อ 10.1) จึงแก้ CSS ของคลาสนี้ตรงๆ ได้โดยไม่กระทบจออื่น ไม่ต้องเปิดคลาสใหม่นอกเหนือจากแถบห่อ (ข้อ 3 ใหม่ด้านล่าง)

**แก้ซ้ำใน P2-H54 (ปิด R2-3, `art/reviews/F04-F06-visual-gate.md` §7.3):** สเปกเดิมของรอบก่อน (P2-H49) ให้ `background: #FFF8EE` ประกาศตรงที่ `.btn-fullwidth-bottom` เอง — X41/X42 เขียนตามนั้นจริง แต่ CSS นั้นประกาศทีหลัง `.btn-primary` ในไฟล์เดียวกันด้วย specificity เท่ากัน (class เดียวกันคู่กัน) จึงชนะและทับสี `accent.signal` ของปุ่มทั้งก้อน ผลคือปุ่มหลักเดียวของ `S-04-run-summary` (จอที่ปุ่มหลักต้องเด่นที่สุดของ loop ทั้งหมด ตาม style guide 5) กลายเป็นพื้นขาวไม่มีสีเหลืองเลย ต้นเหตุคือเอกสารนี้เอง ไม่ใช่ความผิดของ build — แก้โดยแยกความรับผิดชอบเป็นคนละ element เสมอต่อไปนี้ ห้ามให้ทั้งสองคลาสประกาศ property เดียวกันซ้ำอีก:

```css
/* แถบห่อปุ่ม เป็นเจ้าของ position/background/padding ทั้งหมด */
.screen-bottom-bar {
  position: sticky;
  bottom: 0;
  background: #fff8ee; /* bg.paper, สีเดียวกับ .screen */
  padding: 8px 0 max(16px, env(safe-area-inset-bottom));
}

/* ตัวปุ่ม เป็นเจ้าของแค่ width ปล่อยสี/ขอบ/เงาให้ .btn-primary ทั้งหมด */
.btn-fullwidth-bottom {
  display: block;
  width: 100%;
}
```

DOM: `run-summary.ts` ห่อ `continueButton` (`class="btn btn-primary btn-fullwidth-bottom"`) ด้วย `<div class="screen-bottom-bar">` แล้ว append div นั้นเข้า `.screen` (แทนที่จะ append ปุ่มตรงๆ) — ปุ่มยังอยู่ครึ่งล่างจอเสมอเหมือนเดิมทุกประการ แค่กลไกทางเทคนิคเปลี่ยนจาก "ปุ่มปักเอง" เป็น "แถบปักแล้วปุ่มลอยตามในแถบ" ความสูงปุ่มยังเป็น `touchTarget.primaryButtonHeight_px` (56px) เท่าเดิม ไม่ต้องเพิ่มเงา/เส้นแบ่งใหม่ (เงาทึบเลื่อนของ `.btn-primary` เดิมช่วยแยกจากพื้นหลังของแถบโดยธรรมชาติอยู่แล้ว)

**ชื่อคลาส (ให้ตรงกับ P2-X52):** `.screen-bottom-bar` คือชื่อทางการของแถบห่อนี้ — ใช้ชื่อเดียวกับที่ `art/reviews/F04-F06-visual-gate.md` R2-3 เสนอไว้ตรงๆ ไม่เปลี่ยน เพื่อให้โค้ดที่ gameplay-programmer เขียนคู่ขนาน (P2-X52) กับสเปกนี้ไม่ชนชื่อกัน — เทียบเคียงกับ `.run-top-stack` ของ R2-2 (แถบห่อ `.run-bar`+`.hp-bar` บนจอ run ที่ gameplay-programmer ตั้งชื่อเองตามข้อความ R2-2 ของ gate โดยตรงเช่นกัน ไม่ใช่ชื่อจากเอกสารนี้) ทั้งสองแถบเป็นรูปแบบเดียวกัน (container ที่ปักตำแหน่งแทนลูกข้างในเพื่อกันแผงทับกันตามปัญหาแบบเดียวกันของ R2-2/R2-3) แต่คนละจุดใช้งาน: `.run-top-stack` อยู่บนจอ run (บนสุดของจอ, มี banner/pill/HP bar) ส่วน `.screen-bottom-bar` อยู่บนจอ summary (ล่างสุดของจอ, มีปุ่มเดียว)

ถ้าในอนาคตมีจุดใช้ `.btn-fullwidth-bottom` แบบที่สองภายใน `.popup` (bottom sheet, ไม่ใช่ `.screen`) ที่เนื้อหาสั้นและถูก bound ด้วย `max-height: 85vh` อยู่แล้ว (หัวข้อ 4) — ไม่บังคับห่อด้วย `.screen-bottom-bar` ที่นั่น เพราะ popup ตั้งใจให้เนื้อหาสั้นพอเห็นปุ่มเสมอโดยดีไซน์ (ตัดสินแยกเฉพาะกรณีนั้นถ้าเกิดขึ้นจริง ไม่ใช่ตอนนี้)

[handoff gameplay-programmer, P2-X52: แก้ `apps/client/src/app.css` — ลบ `background`/`position`/`bottom` ออกจาก `.btn-fullwidth-bottom` (เหลือแค่ `display: block; width: 100%;`) แล้วเพิ่มกฎใหม่ `.screen-bottom-bar` ตามบล็อก CSS ข้างบน · แก้ `apps/client/src/ui/run-summary.ts` ให้ห่อ `continueButton` ด้วย `<div class="screen-bottom-bar">` ก่อน append เข้า `.screen` · จุดใช้เดียวคือ `run-summary.ts` ไม่กระทบไฟล์อื่น | blocking: yes (ปิด R2-3)]

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
| Toast กลาง (`.toast.neutral`) | `run.tickGranted`, `party.buffApplied`, `run.autoPotionUsed`, `run.screenLockNotice` | พื้น `bg.surface` เสมอ · ขอบ `ink.900` ปกติ หรือเน้น `state.success` เมื่อเป็นผลบวก (สีขอบเปลี่ยนได้ พื้นห้าม tint) · ข้อความ **16px** สี `ink.900` | หายเองสั้นๆ (`run.screenLockNotice` ครั้งเดียวต่อเครื่อง — ปิด C6-03, flow F06 Flow E ข้อ E2) |
| Toast จาง (`.toast.faded`) | `run.tickDenied` | **ทึบ 100% เสมอ** ห้ามใช้ opacity บนข้อความ/ขอบ (style-guide S7) — "จาง" คือไม่มีเงาทึบ (flat) + ขอบ **`ink.500`** 2px (V-20, art gate F03-visual-gate.md รอบ 2: `ink.300` เดิมได้แค่ 2.80:1 กับ `bg.surface` ต่ำกว่า S3 — แก้ใน P2-F04-T06 เป็น `ink.500` ซึ่งได้ 7.30:1) + ข้อความ `ink.700` **16px** · **ห้ามใช้ `state.danger`** เพราะไม่ใช่การลงโทษ (icon-grammar `gate-miss` ก็ห้ามกากบาทแดงเช่นกัน) | หายเองสั้นๆ |
| Toast อันตราย (`.toast.danger`) | `run.hpLow` (canon, ห้ามแก้คำ) | พื้น `bg.surface` เสมอ (**ห้ามพื้นทึบสี `state.danger`** — แก้ P2-H40/V-32: build เดิมใช้พื้นแดงเต็ม+ข้อความ `bg.paper` ได้แค่ 5.21:1 ที่ 14px) + ขอบ 2px และข้อความ `state.danger` **16px ตัวหนา** (5.50:1) + ไอคอน `icon.ui.hp-low` คู่ข้อความเสมอ | ค้างจนกว่าผู้เล่นตัดสินใจหรือ HP เปลี่ยนสถานะ |
| Banner บนสุด (`.banner.info`) | `run.stateGrace`, `gps.offline` | พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบล่าง 2px และข้อความ `state.info` **16px** น้ำหนัก ≥500 + ไอคอน 24px คู่ข้อความเสมอ | ค้างตลอดสถานะนั้น ไม่ใช่ toast ชั่วคราว |
| Banner เตือน (`.banner.warn`) | `run.stateSuspended`, `run.autoRetreatOffBadge` (ป้ายเตือน auto-retreat ปิดอยู่ — ปิด V-32 ของ `art/reviews/F04-F06-visual-gate.md`: build เดิมเป็นคลาสแยก `.auto-retreat-off-badge` 12px ให้ reuse ทรงนี้แทนทั้งหมด ดู flow F06 หัวข้อ 4 ข้อ C10) | พื้น `bg.surface` เสมอ (ห้าม tint พื้นอ่อนนอก token) + ขอบล่าง 2px และข้อความ `state.danger` **16px ตัวหนา** (5.50:1) + ไอคอนคู่ข้อความเสมอ **ห้ามพื้น `ink.900`+ข้อความ `bg.paper`** (รูปแบบสงวนไว้เฉพาะป้าย sponsored, style-guide หัวข้อ 9.2) | ค้างตลอดสถานะนั้น |

กฎร่วม: ทุก toast/banner มี **icon + ข้อความ** เสมอ ไม่ใช้สีอย่างเดียว (style-guide S4) · z-index ตาม `tokens.json`: `map` (0) < `hud` (1) < `banner` (10) < `drawer` (20) < `toast` (30) < `popupModal` (40) < `overlay` (50) < `system` (60) — สเกลเต็ม กฎการวาง (`inset: 0` เฉพาะ modal, ห้าม `position: fixed` ใต้ `#hud`) และตารางคอมโพเนนต์→ระดับ ดูหัวข้อ 15 (**แก้ P2-H28**, D-129)

**ปิด V-38 (P2-H40) — กฎขนาดตัวอักษรของ toast/banner ทุกตัว:** ค่าเริ่มต้นคือ **16px เสมอ** ไม่มีข้อยกเว้น เหตุผล: ทุก toast/banner ในหัวข้อนี้ใช้สี state (success/danger/info) เป็นข้อความอย่างน้อยบางส่วน และคู่สี state บนพื้น `bg.surface` ได้แค่ 5.50–6.25:1 (ไม่ถึง 7:1) ตามตาราง "ตัวอย่าง S8" ที่ art-director เพิ่มใน `art/direction/style-guide.md` หัวข้อ 2 (P2-H43) จึง **ห้ามลดเป็น 14px ไม่ว่ากรณีใด** สำหรับข้อความสี state — ยึดค่าเดียว (16px) ทุกแถวของตารางบนแทนการแยกกรณีเป็น 14/16px ตามคู่สี เพื่อกันความสับสนตอน build ที่เป็นต้นเหตุของ V-32 ทั้งหมด (ป้ายต่างๆ หลุดมาที่ 12–14px เพราะไม่มีกฎรวมเขียนไว้ชัดจุดเดียว) ข้อความที่ไม่ใช่สี state ในกลุ่มนี้ (เช่น `ink.900`/`ink.700` ของ toast กลาง/จาง) ก็ใช้ 16px เดียวกันเพื่อความสม่ำเสมอของจังหวะอ่าน แม้ทางทฤษฎีจะลดเป็น 14px ได้ตามตาราง S8 (คู่นั้น ≥16:1) — **ยืนยันตรวจ P2-H43 (คำขอแยก):** `design/ux/tokens.json` (`type.caption` 14px จำกัดเฉพาะคู่ `ink.700`/`bg.paper` หรือ `ink.500`/`bg.surface` ที่ ≥7:1 อยู่แล้ว) **ไม่ต่ำกว่า** ตาราง S8 ของ style-guide เลย ไม่ต้องแก้ · จุดที่เคยต่ำกว่า S8 ทั้งหมดอยู่ใน `components.md` เอง (GPS pill หัวข้อ 2.1, ป้าย auto-retreat-off, ขนาด `.toast.danger`/`.banner.info` ที่ไม่เคยเขียนตัวเลขชัด) ปิดครบในรอบนี้แล้วทุกจุด

### 6.1 ป้าย Recovering (`.recovering-banner`) — ยืนยัน C6-05 (P2-H51)

ที่มา: `apps/client/src/ui/recovering-banner.ts` (P2-X41 ต้องเดาเอง ยังไม่มีสเปกเขียนไว้ตรงจุดนี้มาก่อน แม้ flow F06 Flow C ข้อ C7 จะบอกพฤติกรรมไว้แล้ว) — หัวข้อนี้เขียนกฎที่ build ทำไว้ให้เป็นสเปกจริง (ยืนยัน ไม่ใช่คิดใหม่) เพราะตรวจแล้วว่าตรงเจตนาของ flow ทุกข้อ

**เป็นป้ายลอยที่สอง ใต้ `#network-banner` เสมอ** ไม่ใช่ป้ายเดียวกัน (ต่างจากป้ายเดิมของหัวข้อ 2.3 ที่มีป้ายลอยเต็มความกว้างใต้ header ได้แค่ป้ายเดียว): ทั้งคู่เต็มความกว้าง กึ่งกลางบน (`top` ของ network banner ปกติ, recovering banner บวก ~44px ลงมา, ทั้งคู่ `left/right: 8px`) และ `z-index: zIndex.banner` (10) เท่ากัน — offset นี้เป็นค่าคงที่เสมอ **ไม่ผูกกับว่า network banner กำลังแสดงอยู่จริงหรือไม่** (ถ้า network banner ซ่อนอยู่ recovering banner จะมีที่ว่างด้านบนเล็กน้อยแทนที่จะขยับขึ้นชิด header) — ยอมรับเป็นข้อลดรูปที่ตั้งใจ: ทั้งสองป้ายพร้อมกันได้จริง (offline ระหว่าง Recovering) และการคำนวณตำแหน่งแบบ dynamic ต้องมี observer เพิ่มโดยไม่ได้ประโยชน์ต่อการอ่านออกใน 3 วินาที (หัวข้อ 1) ไม่ต้องแก้เพิ่มเว้นแต่ QA/playtest พบว่าช่องว่างทำให้อ่านสับสนจริง

**กฎการแสดงผล (ยืนยันตรงกับ flow F06 C7 ทุกข้อ):** ซ่อนเป็นค่าเริ่มต้นทุกครั้งที่ render แล้วแสดงเฉพาะกิ่งสุดท้าย "อยู่ที่บ้าน" เท่านั้น (หลังทุก route/popup/run/onboarding/speed-lock ข้างบนเช็คแล้วว่า "ไม่ใช่ฉัน") — คือทุกสถานะที่บ้าน (`S-06`/`S-07`/`S-08`) **รวมสถานะใกล้ (`near`, แผง `nav-panel` ธรรมดา) ด้วย** เมื่อ `PlayerView.recovering === true` และ `recoveryTimeLeft_ms` ไม่ใช่ `null`/`0` (ค่าทั้งสองนี้แปลว่า "ซ่อน ไม่ใช่ขึ้นเลข 0 นาที" ตามคอมเมนต์ของ `selectors.ts`) — ซ่อนเสมอบนจอ run, popup ทุกชนิด, จอพกกระเป๋า, speed-lock overlay, onboarding ทุกจอ, settings/privacy/credits และทุก route อื่นนอก main

**ทรง:** reuse `.banner.info` เต็มรูป (พื้น `bg.surface`, ขอบล่าง 2px + ข้อความ `state.info`, **ไม่ใช่** `.banner.warn`) — Recovering เป็นข้อมูลความคืบหน้าเป็นกลาง ไม่ใช่คำเตือน ตรงกับที่ Flow C ข้อ C7 สั่งห้ามใช้ไอคอนนาฬิกาทราย (สื่อเร่งด่วน) อยู่แล้ว จัดเรียงเป็น 2 บรรทัดกึ่งกลาง (label ตัวหนา `home.recoveringLabel` แล้วบรรทัดถัดไป `home.recoveringDetail` น้ำหนักปกติ) แทนแนวนอนแบบ banner อื่น เพราะข้อความสองบรรทัดยาวกว่า banner ทั่วไป

**ไอคอนที่ขาด (ต้องเพิ่ม, ไม่ blocking):** ตารางหัวข้อ 6 กำหนดให้ `.banner.info` ทุกจุดต้องมีไอคอน 24px คู่ข้อความเสมอ (S4) — build ปัจจุบันมีแค่สองบรรทัดข้อความ ไม่มีไอคอน `icon.ui.recovering` (มีอยู่แล้วในกลุ่ม tintable ของหัวข้อ 13.9) ทั้งที่ชื่อ id ตรงกับป้ายนี้พอดี วางไอคอนไว้ก่อนบรรทัด label (แนวตั้งกึ่งกลางกับกลุ่มข้อความสองบรรทัด) สี `state.info` เหมือนข้อความ (`aria-hidden` เพราะมีข้อความกำกับข้างอยู่แล้ว, 13.9.2) — เพิ่มแถวใหม่ในตาราง 13.9.1: `Recovering banner (6.1) | Recovering | icon.ui.recovering | state.info | พร้อม (อยู่ในกลุ่ม tintable แล้ว)`

[handoff gameplay-programmer: เพิ่ม `icon.ui.recovering` 24px (`aria-hidden`, สี `state.info`) หน้ากลุ่มข้อความใน `recovering-banner.ts` — ไม่ blocking ด้าน PDPA]

## 7. HP bar และตัวเลข

ตัวอย่างจริง: `.hp-track`, `.hp-fill` ใน `wireframes/03-run-active.html`, `04-run-critical.html`

- ราง (`.hp-track`) พื้น `ink.100` ขอบ `ink.900` 2px มุม `radius.chip` สูง 20px
- แถบเติม (`.hp-fill`) ปกติ `state.success` (contrast กับราง 4.22) เมื่อ ≤ `lowHpWarningThreshold_pct` (30) เปลี่ยนเป็น `.hp-fill.low` สี `state.danger` (contrast 4.10)
- ตัวเลข % วางถัดจากแถบเสมอ (ไม่ใช่แค่สีบอก) ใช้ `type.numeric` tabular figures เพื่อไม่ให้ตัวเลขกระโดดเวลาค่าเปลี่ยน
- ค่า HP เป็นค่าจาก server เท่านั้น **client ห้ามคำนวณเอง** (server-authoritative, CLAUDE.md non-negotiable 1) — คอมโพเนนต์นี้แค่ render ค่าที่ได้รับ ไม่ interpolate ค่าเดาระหว่างรอ sync
- **ยืนยัน `run.hpBarLabel` ไม่ใช้ใน Phase 2 (ปิดข้อค้างของ F06 copy gate, P2-H40):** ตั้งใจ ไม่ใช่ของตกหล่น — แถบสี (เขียว/แดงตามเกณฑ์) คู่กับตัวเลข % ที่วางถัดกันเสมอ (สองบรรทัดข้างบน) ก็ทำหน้าที่ครบตามกฎ S4 (ไม่ใช้สีอย่างเดียว) อยู่แล้วโดยไม่ต้องมีคำว่า "HP" กำกับซ้ำอีกชั้น (บริบทรอบข้าง เช่น หัวจอ run, ตำแหน่งของแถบใต้ context label ก็บอกอยู่แล้วว่านี่คือ HP) การเพิ่มป้ายข้อความจะกินพื้นที่แนวนอนที่จำกัดของ run bar โดยไม่ได้ข้อมูลใหม่ — คีย์นี้อยู่ในกลุ่ม "มี key สำรองไว้แต่ context อนุญาตให้ไม่ใช้" ไม่ต้องส่งต่อ narrative ว่าเป็น unused key ถาวร

## 8. ป้ายชื่อโซน (zone name label)

ที่มา: `names.th.json#_meta.limits` (P1-F03-T04): `nameRealMaxCells` 17, `nameSuffixMaxCells` 14, `fullZoneNameMaxCells` 34 · ia.md A-P1-F03-T15-5 (ทดสอบพื้นที่จอ 360px) · ยืนยันโดย uiux-designer ใน P1-X10 (หัวข้อนี้แก้จากฉบับ T17 ที่อ้างเลขเก่า `zoneRealName` 18 จาก `copy.th.json#_variables`)

รูปแบบเต็ม: `{ชื่อจริง} — {คำขยาย}` เช่น "ลุมพินี — ป่าในเมือง" ใช้ตัวแปร `{zoneName}` เต็ม (`maxCells` 34) = `{zoneRealName}` (≤17) + ตัวคั่น " — " (คงที่ 3 ช่อง) + คำขยาย (≤14) · 17+3+14 = 34 พอดี ไม่มีช่องเหลือ

**คำตัดสินของ uiux-designer (P1-X10, verdict = ยืนยันตัวเลขทั้งสามไม่แก้):**
- ชุดชื่อจริงในสต็อกตั้งต้น (`names.th.json`) ทุกรายการยาวสุด 11 ช่อง (`dungeon.chatuchakMarket`, `dungeon.nonthaburiPierMarket`) ยังห่างจากเพดาน 17 อยู่มาก — เพดาน 17 ปลอดภัยกับข้อมูลจริงตอนนี้
- คำขยายยาวสุดในคลัง (`zoneSuffix.grillSmokeWalk`, `.afterWorkBallYard`, `.weekendMeetup`) = 14 ช่องพอดี ตรงกับเพดานเป๊ะ (ไม่มีช่องเหลือสำหรับคำขยายใหม่ที่ยาวกว่านี้ — เจตนา ไม่ใช่บั๊ก แจ้ง narrative-designer ไว้เป็น handoff)
- **แก้แล้วใน P1-X11:** `copy.th.json#_variables.zoneRealName.maxCells` เคยเป็น 18 (ค่าเก่าก่อน T04) narrative-designer แก้เป็น **17** แล้วตรงกับ `names.th.json#_meta.limits.nameRealMaxCells` (T04) ทั้งสองที่ตรงกันแล้ว ไม่มีตัวเลขขัดกันอีก (ปิด handoff เดิม ดูหัวข้อ 14, F03 copy gate F-05/F-06)

| บริบท | ขนาดตัวอักษร | กฎพื้นที่ |
| --- | --- | --- |
| ป้ายบนแผนที่ (`.caption` บนพื้น `rift.500`) | 14px ตัวหนา, halo/แผ่นรองทึบตาม style-guide S6 | ความกว้างป้ายไม่เกิน 2/3 ของความกว้างจอ (360px → ≤240px) ถ้ายาวเกินให้ตัดที่คำขยาย ไม่ตัดชื่อจริง (คำขยายอาจถูกตัดทั้งคำแม้เพดาน 14 ช่องก็เกิน 240px ได้ ขึ้นกับ font จริง — ดูข้อสังเกตด้านล่าง) |
| หัว popup confirm (`h1.scr-title`) | 24px (`type.h1`) | เต็มความกว้าง popup ลบ padding 2×16px — ทดสอบแล้วตัวอย่างยาวสุดในสต็อกจริง (`dungeon.chatuchakMarket` รวม 27 ช่อง) พอดีบรรทัดเดียวที่ 360px แบบ "ชิดขอบ" ไม่เหลือที่ว่าง (ดู 05-run-summary ไม่เกี่ยวข้องตรงนี้ อ้าง `02-dungeon-confirm.html`) **ปรับกฎ (P1-X10):** เพดานจริงคือ 34 ช่อง (มากกว่าที่ทดสอบจริง 7 ช่อง) เพราะสต็อกตั้งต้นยังไม่มีชื่อที่ชนเพดาน — `h1.scr-title` ต้อง **รองรับการตัดบรรทัดเป็น 2 บรรทัดได้** (ไม่บังคับบรรทัดเดียวเหมือนที่ทดสอบ) เมื่อชื่อจากหลังบ้านในอนาคตเข้าใกล้เพดาน 34 ช่อง กันหัว popup ล้นขอบ 360px |
| Tagline (ถ้ามีในหน้ารายละเอียดโซนภายหลัง) | ไม่ใช้ในนาที 0–10 — เนื้อหาประวัติอยู่ที่ `S-26-lore` เท่านั้น | ต้องมีที่ว่างแยกจากชื่อจริงอย่างน้อย 1 บรรทัด ไม่ต่อท้ายชื่อในบรรทัดเดียวกัน |

**ยังไม่ทดสอบจริงกับ font สุดท้าย** (IBM Plex Sans Thai Looped) เพราะ art-director ยังไม่ส่งไฟล์ font จริงมาถึง T17 — ยืนยันซ้ำในหัวข้อ 14 · การนับ "ช่อง" (cells) ตัดสระ/วรรณยุกต์ลอย (combining) ออกตาม copy-schema 4.1 จึงใกล้เคียงความกว้างจริงที่แสดงผล แต่ต้องยืนยันซ้ำด้วย font จริงก่อนเชื่อเพดาน 34 ช่องแบบเป๊ะ

## 9. Toggle ที่ตั้งใจฝังลึก (auto-retreat pattern)

ที่มา: `ia.md` หัวข้อ 5 ข้อ 6, flow Flow E — ใช้ซ้ำได้กับ toggle ความปลอดภัยอื่นในอนาคตที่มีผลรุนแรงเทียบเท่ากัน

รูปแบบบังคับ (3 ชั้น กันปิดโดยไม่ตั้งใจ):
1. หน้าตั้งค่าแรก (`S-22-settings`) มีแค่ **ลิงก์เมนู** ไปหน้าย่อย ไม่มี toggle ในหน้าแรก
2. หน้าย่อยมี toggle จริงพร้อม label เห็นสถานะปัจจุบันชัดเจน (เปิด/ปิด) — การ "เปิด" ไม่ต้องยืนยัน การ "ปิด" ต้องกดเข้า popup ยืนยัน
3. Popup ยืนยันอธิบาย **ผลลัพธ์ตรงไปตรงมา** (จะตายจริง ของหายจริง) ไม่ใช่คำถามลอยๆ แบบ "แน่ใจไหม"

ผลข้างเคียงที่บังคับต้องมี: banner เตือนค้างอยู่ในหน้า `S-03-run` ตลอดเวลาที่ปิดอยู่ (ไม่ใช่แค่ตอนตั้งค่า) — ดู `wireframes/06-settings-autoretreat.html` เฟรมสุดท้าย

### 9.1 รูปทรงตัว toggle switch เอง — ปิด V-42 (P2-H54, `art/reviews/F04-F06-visual-gate.md` §7.7)

หัวข้อ 9 เดิมกำหนดแค่ "รูปแบบบังคับ 3 ชั้น" (พฤติกรรม/flow) ไม่เคยระบุรูปทรงภาพของตัว switch เอง build จึงเดาเป็นวงกลมเขียวทึบไม่มีราง ไม่มีปุ่มเลื่อน และตอนเปิดเสียขอบหมึกไปทั้งเส้น (เจอเป็น V-42 ในภาพ `22-settings-walking-safety.png`) หัวข้อนี้ยืนยันรูปทรงตามที่ gate เสนอเป็นสเปกทางการ (ไม่มีข้อแก้ เพราะตรงกับ shape language อื่นของทั้งระบบอยู่แล้ว — "เพิ่มเส้น/องค์ประกอบ ไม่ใช่แทนที่สี" เหมือน `.card.selected` หัวข้อ 4):

- **ราง:** 56 × 32px มุมโค้งเต็ม (`radius.chip`, 999px) ขอบ `ink.900` 2px **ทุกสถานะ** (เปิดหรือปิดขอบไม่เปลี่ยนสี ต่างจาก build เดิมที่ขอบเปลี่ยนเป็นเขียวตอนเปิดแล้วเสียเส้นหมึก) พื้นรางตามสถานะ: เปิด = `state.success`, ปิด = `ink.100`
- **ปุ่มเลื่อน (thumb):** วงกลม 24px พื้น `bg.surface` (ขาว) ขอบ `ink.900` 2px ชิดซ้ายสุดของรางเมื่อปิด ชิดขวาสุดเมื่อเปิด (มีระยะห่างจากขอบรางเท่ากันทั้งสองด้าน ให้เห็นเป็นรางจริงไม่ใช่วงกลมลอย)
- **พื้นที่แตะ:** ยังคง 48 × 48px ขั้นต่ำเสมอ (touch target ครอบรางที่มองเห็น 56×32px ด้วย padding โปร่งรอบนอกถ้าจำเป็น เหมือนไอคอน header หัวข้อ 2.1)
- **สถานะไม่ใช้สีอย่างเดียว** (S4): ต้องมีคำ label ข้างเคียงที่บอกชื่อ toggle เสมออยู่แล้ว (หัวข้อ 9 ข้อ 2) ตำแหน่งของปุ่มเลื่อน (ซ้าย/ขวา) เป็นตัวช่วยแยกเปิด/ปิดเพิ่มอีกชั้นที่อ่านได้แม้ภาพขาวดำ (สีรางต่างกันเป็นสัญญาณเสริม ไม่ใช่สัญญาณเดียว) — ไม่ต้องเพิ่มคำ "เปิด/ปิด" แยกอีกก้อนในตัว toggle เอง เพราะ label ที่มีอยู่ + ตำแหน่งปุ่มเลื่อน + สีราง ครบ 3 ชั้นแล้ว
- ใช้ทรงเดียวกันนี้กับทุก toggle ความปลอดภัยของหน้า "การเดินและความปลอดภัย" ทั้งหมด (auto-retreat, จอพกกระเป๋า หัวข้อ 12.4) ไม่ใช่แค่จุดที่ภาพ `22` จับได้

[handoff gameplay-programmer: แก้ CSS ของ toggle (`app.css:1051-1055` ตามที่ gate อ้าง) จากวงกลมเขียวทึบเป็นราง 56×32px + ปุ่มเลื่อน 24px ตามสเปกข้างบน คงขอบ `ink.900` 2px ทุกสถานะ | ไม่ blocking (V-42 ไม่บังคับก่อนปิด gate รอบนี้ ตามตารางหัวข้อ 7.10 ของ gate)]

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
| Toast/cue | HP ต่ำ, auto-retreat, ตาย, tick — **ไม่มี `.toast` ที่มองเห็นบนจอนี้เลย** (คำตัดสิน P2-H39, ดู 15.4) สัญญาณจริงคือเสียง + สั่น ชั้นฐานเดิม (audio direction หัวข้อ 10) บวกตัวเลข HP %/เวลาถึง tick ของจอพกกระเป๋าเอง (สองแถวบนตารางนี้) ซึ่งอัปเดตสดจากค่า server ทุกครั้งที่โดนตีอยู่แล้ว (F06-R11) — ไม่ต้องออกจากจอพกกระเป๋าเพราะหน้าเว็บยัง foreground (เสียง/สั่นเล่นได้ปกติแม้จอมืด) |

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

## 13. คอมโพเนนต์ F04 Phase 2

ที่มา: `art/direction/briefs/P2-assets.md` หัวข้อ 3.3–3.8 (art-director), `design/ux/flows/F04-dungeon-presence.md` (uiux-designer), `art/reviews/F03-visual-gate.md` V-15 · สีทุกค่าอ้าง `tokens.json` เท่านั้น · ตัวอย่างจริงอยู่ใน `wireframes/F04-*.html` (เขียนใน P2-F04-T15 อยู่นอก writes ของงานนี้ P2-F04-T06 จึงไม่แก้ไฟล์เหล่านั้นในรอบนี้ — โครงสร้าง CSS/ตัวอย่างเพิ่มเติมทำในรอบถัดไปที่แตะไฟล์นั้น)

### 13.1 Chip สถานะ dungeon (`.chip-status`)
4 แบบ ต่างกันด้วยรูปทรงขอบ + glyph + ข้อความ ไม่ใช่สีอย่างเดียว (style-guide S4) สูง ≥32px ข้อความ ≥14px ตัวหนา (S8) ทั้งแถวของการ์ดที่แตะได้สูง ≥48px

| สถานะ | ขอบ | พื้น/ข้อความ (กลางวัน) | พื้น/ข้อความ (กลางคืน) |
| --- | --- | --- | --- |
| เปิด | ไม่มี chip (ค่าตั้งต้น) | — | — |
| ใกล้ปิด (`icon.ui.closing-soon`) | `ink.900` 2px ทึบ | `accent.signal` + ข้อความ `ink.900` ตัวหนา (11.43) | เหมือนกลางวัน |
| ปิดทำการ (`icon.ui.closed`) | **`ink.500` เส้นประ 2px (4/4)** | `bg.surface` + ข้อความ `ink.700` (12.37) | `bg.night` + ขอบ `ink.300` (6.17) + ข้อความ `ink.100` (12.88) |
| กำลังเล่นอยู่ (`icon.ui.in-run`) | **`ink.900` ทึบ 4px** | `bg.surface` + ข้อความ `ink.900` (17.29) | `bg.night` + ขอบ `bg.paper` 4px + ข้อความ `bg.paper` (16.39) |

กฎห้าม: ห้ามใช้พื้น `ink.900` + ข้อความ `bg.paper` กับ chip สถานะใดเลย (นั่นคือรูปของ `.chip-sponsored` หัวข้อ 13.7 เท่านั้น) · ห้ามสี `rarity.*`/`rift.*` เป็นพื้น chip · dungeon ปิดยังกดปุ่มนำทางได้ (ปุ่มยังเป็นปุ่มรอง ไม่ย้ายไปเป็น CTA เหลือง)

### 13.2 Run header / run-state pill (`.run-state-pill`)
ทางการของ pill ที่เสนอไว้ใน flow F04 หัวข้อ 6 (คำถามเปิดของ flow นั้น — ปิดในเอกสารนี้): pill รูปเม็ดยา (`radius.chip`) วางในแถบใต้ header คงที่ทุกสถานะ (ไม่ใช่แค่ตอนมีปัญหา) มี glyph + คำ + สีขอบ ไม่ใช้สีอย่างเดียว

| สถานะ | glyph | ขอบ pill / แถบ header | tick timer |
| --- | --- | --- | --- |
| Active | `icon.ui.in-run` ● | พื้น `bg.paper` ขอบล่าง `ink.900` 2px | เดินนับถอยหลังปกติ |
| Grace | `icon.ui.grace` ◐ | แถบล่าง `state.info` 6px + ข้อความ `state.info` (5.93) | หยุดนับ → `run.tickPausedLabel` |
| Suspended | `icon.ui.suspended` ■ | พื้นทั้งแถบ `state.info` ข้อความ `bg.surface` (6.25) | ยัง `run.tickPausedLabel` |
| Ended | — | ออกจากจอ run ไปหน้าสรุป | — |

ไม่มีสถานะใดใช้ `state.danger` (ออกนอกเขตไม่ใช่ความผิด) · ไม่มีการกะพริบระหว่างสถานะ · รายละเอียด copy/เงื่อนไขเต็มอยู่ flow F04 หัวข้อ 6 เอกสารนี้ยืนยันแค่รูปทรง (compontent ทางการ)

**ขนาดตัวอักษรและความสูง (ปิด R2-5, P2-H54, `art/reviews/F04-F06-visual-gate.md` §7.3):** ข้อความ pill (คำสถานะ) เป็น **16px ตัวหนาเสมอทุกสถานะ** (`.run-state-pill { font-size: 16px; }`) ไม่แยกขนาดตามสถานะ — build เดิมใช้ 14px ทุกสถานะ ซึ่งพอสำหรับ Active (`ink.900` บน `bg.paper` 16.39:1) แต่ Grace (`state.info` บนพื้นขาว) และ Suspended (`bg.surface` บนพื้น `state.info`) ได้แค่ 6.25:1 ต่ำกว่าเกณฑ์ 7:1 ที่ 14px ต้องมีตาม "ตัวอย่าง S8" ใน `art/direction/style-guide.md` หัวข้อ 2 (P2-H43) — ใช้ 16px ค่าเดียวทุกสถานะ (ไม่ใช่แค่ Grace/Suspended) เพื่อไม่ให้ pill เปลี่ยนขนาดเวลาสลับสถานะระหว่าง run เดียวกัน (เหตุผลเดียวกับกฎรวมของ toast/banner หัวข้อ 6, V-38) `min-height` ของ `.run-state-pill` ต้องเพิ่มตามให้รองรับ 16px + padding แนวตั้งโดยไม่ให้ข้อความชิดขอบ: **≥32px** (เท่าเกณฑ์ความสูงขั้นต่ำของ chip สถานะ หัวข้อ 13.1 ใช้ค่าเดียวกันเพื่อให้จังหวะแถวบนสม่ำเสมอ) ถ้าแถวบนแน่นเกินจนชนกับ tick timer ให้ tick timer ขึ้นบรรทัดใหม่ (`flex-wrap` มีอยู่แล้วตาม R2-5) ห้ามลดขนาดตัวอักษรกลับไปต่ำกว่า 16px เพื่อประหยัดที่

[handoff gameplay-programmer, P2-X52: แก้ `apps/client/src/app.css` `.run-state-pill { font-size: 14px }` (บรรทัดที่พบใน `art/reviews/F04-F06-visual-gate.md` §7.3 R2-5) เป็น `font-size: 16px; min-height: 32px;` ทุกสถานะ | blocking: yes (ปิด R2-5)]

### 13.3 แถว check-in (ในหน้า popup confirm)
หนึ่งแถวเหนือปุ่ม "เข้า" (F04 flow หัวข้อ 4, GD B-03): ไอคอน 48px (`icon.ui.signal-wait`/`icon.ui.walk-in`/`icon.ui.speed-lock` ตามเหตุเดียวที่แสดง ณ ขณะนั้น) + ข้อความหนึ่งบรรทัด `ink.900` ≥16px + ตัวนับถอยหลังตัวหนา tabular (เฉพาะเหตุ `not_enough_trace`) ปุ่ม "เข้า" ระหว่างรอ: พื้น `ink.100` ข้อความ `ink.500` (5.44) ไม่มีเงา — พร้อมแล้วเปลี่ยนเป็นปุ่มหลักทันที **ไม่มี animation ดึงความสนใจ** `signal-wait` เป็นภาพนิ่งเสมอ (ห้ามขีดสัญญาณไล่ขั้น) และห้ามภาพ/คำที่สื่อการจับผิด (แว่นขยาย ตา กล้อง ไฟไซเรน — R10, U7)

**ปิด A-P2-X42-3 (ตาราง icon ต่อเหตุ, ยืนยันแนวทางที่ `apps/client/src/ui/checkin-status.ts` ทำไว้แล้วถูกต้อง — ไม่ต้องแก้โค้ด):**

| `CheckInRejectReason` | icon | หมายเหตุ |
| --- | --- | --- |
| `speed_lock` | `icon.ui.speed-lock` | |
| `not_enough_trace` | `icon.ui.signal-wait` | ตัวนับถอยหลัง mm:ss คู่กันเสมอ **ยกเว้น** ตอน `readyIn_s === null` (ยังไม่เริ่มนับ ไม่ใช่ error) ใช้ `dungeon.checkinNotEnoughTraceWaiting` แยก ไม่มี `{countdown}` ค้าง — ยัง**มี** icon เดิมทั้งสองกรณี มีแค่ตัวนับถอยหลังที่ต่างกัน |
| `no_approach_from_outside` | `icon.ui.walk-in` | **ยกเว้น** เมื่อ client ยืนยันว่าตำแหน่งล่าสุดอยู่นอก polygon จริง ณ ขณะนั้น (`isOutOfRangeNow`) เปลี่ยนเป็น `dungeon.outOfRangeTitle` แทน — คนละเหตุกับ "ยังเดินเข้าไม่ครบเงื่อนไข approach" จึงไม่ใช้ icon เดิม (โค้ดปัจจุบันไม่ผูก icon ให้กรณีนี้เลย ตรงกับ "ข้อความอย่างเดียว" ของแถวถัดไป) |
| `poor_accuracy`, `dungeon_closed`, `run_active`, `unsupported_mode`, `no_class`, `no_hp` | ไม่มี icon (ข้อความอย่างเดียว) | อยู่นอกรายชื่อ 3 เหตุที่หัวข้อนี้ระบุไว้ (V-30 บังคับ icon เฉพาะ 3 เหตุที่เอ่ยชื่อเท่านั้น ห้ามเดา icon ให้เหตุอื่น) แถวยังอ่านออกได้ด้วยข้อความล้วนตามกฎหัวข้อ 1 ข้อ 1 |

`no_class`/`no_hp` (F06 6.3, D-114) ยังไม่มี copy key ใน `copy.th.json` — ไม่ใช่ของ handoff ใหม่จากงานนี้ (ค้างอยู่แล้วจากงานก่อนหน้า ดู comment ในไฟล์เดียวกัน)

### 13.4 Speed-lock overlay (`.overlay-speedlock`)
overlay เต็มจอทับทุกอย่าง (แผนที่, popup, จอ run รวมจอพกกระเป๋า, F04 flow หัวข้อ 5, GD B-02): พื้น `bg.paper` (กลางวัน) หรือ `bg.night` (จอพกกระเป๋า) ทึบ 100% ไม่มี animation ต่อเนื่อง (เหมือนจอพกกระเป๋า) · ไอคอน `icon.ui.speed-lock` 48px กึ่งกลาง · ข้อความหนึ่งบรรทัด ≥20px ตัวหนา · **ปุ่มบนจอนี้เป็น `.btn-secondary` ขนาดปกติเท่านั้น 2 ปุ่ม (ลิงก์ตั้งค่า, ออก) — ห้ามมี `.btn-primary`/สีเหลืองใดๆ บนจอนี้เด็ดขาด** (ไม่มีปุ่มชวนเล่นต่อ) สั่นหนึ่งครั้งตอนเข้า lock เท่านั้น ไม่มีเสียงวนซ้ำ

### 13.5 การ์ดนำทาง / ลูกศรทิศ (`.direction-arrow`)
`icon.ui.direction` ทรงหัวลูกศรว่าว เติม `accent.signal` ขอบ `ink.900` 2px (48px แสดงจริง = เส้น 3px) วางซ้ายของบรรทัดระยะเสมอ **ห้ามแสดงลำพังโดยไม่มีคำบอกทิศ** (`nav.directionLabel`) หมุนแบบปัดเป็น 8 ทิศ (ทีละ 45°) เปลี่ยนเฉพาะเมื่อได้ sample ใหม่และทิศที่ปัดแล้วเปลี่ยนจริง ด้วย `transform: rotate()` แบบกระโดดหรือ one-shot ≤150ms (`reduced-motion` = กระโดดทันที ไม่มีข้อยกเว้น) ซ่อนลูกศรเมื่ออยู่ใน polygon แล้ว (โชว์ chip สถานะ 13.1 แทน) หรือไม่รู้ตำแหน่ง (โชว์ `icon.ui.location-off` แทน) **ไม่มีเส้นใดจากผู้เล่นถึง dungeon บนแผนที่ในทุกกรณี** (D-089, R36)

### 13.6 เส้นแบ่งขอบแถบ HP (`.hp-fill` edge marker)
เพิ่มจากสเปกเดิมหัวข้อ 7: วางเส้น `ink.900` หนา 2px ที่ปลายส่วนที่เติมของ `.hp-fill` เสมอ (art brief 4.3: `state.danger` บนราง `ink.100` ใต้แสงสะท้อนจำลองได้แค่ 1.497 ต่ำกว่าเกณฑ์ 1.50 เล็กน้อย จึงต้องมีเส้นดำให้ระดับ HP อ่านได้จากตำแหน่งเส้น ไม่ใช่จากสีแดงเพียงอย่างเดียว) แถบสูง ≥8px (ค่าจริงปัจจุบัน 20px ผ่านอยู่แล้ว) การลดค่าใช้ `transform: scaleX()` (motion-direction 3) โดยเส้นแบ่งเลื่อนตามตำแหน่งเสมอ ไม่ใช่ค้างที่ปลายราง

### 13.7 Chip ป้าย sponsored (`.chip-sponsored`, V-15)
ปิด finding ที่ค้างจาก content gate F03 (style guide 9.2 กำหนดตำแหน่งไว้ 4 ที่แต่เอกสารนี้ไม่มี spec): พื้น `ink.900` ตัวอักษร `bg.paper` ตัวหนา ≥14px (16.39:1) มุม `radius.chip` (999px) ขอบ `bg.surface` 2px (ให้เห็นชัดบนพื้นเข้ม) ข้อความจาก copy key (`label.sponsored`) **ห้ามย่อเหลือแค่ icon** ตำแหน่งบังคับ 4 ที่: ป้ายชื่อรอยแยกบนแผนที่ทุก zoom ที่ป้ายชื่อแสดง, หัวการ์ด dungeon, หน้า confirm เข้า, หน้าสรุป run ของ dungeon นั้น — ห้ามใช้สี `rarity.*`/`rift.*`/`accent.signal` กับ chip นี้ (กันไม่ให้ดูเป็นรางวัลหรือของหายาก) · Phase 2 ยังไม่มี sponsored dungeon จริง (ไม่อยู่ใน `art/direction/briefs/P2-assets.md` หัวข้อ 1.1) แต่ spec ต้องพร้อมก่อน Phase ที่เปิดใช้

### 13.8 Chip ระยะเส้นตรง (`.chip-distance`, ของใหม่จาก flow F04)
tag เล็กติดกับตัวเลขระยะเสมอทุกจุดที่แสดงระยะ (`nav.straightLineTag` = "เส้นตรง", F04-R34): pill ขอบ `ink.700` 1px พื้น `bg.surface`/`bg.paper` ตามพื้นหลังโดยรอบ ข้อความ `ink.700` ตัวหนา `type.caption` (12.37 บน surface) **ไม่ใช่ chip สถานะ จึงไม่ใช้กฎห้ามสีของ 13.1** เพราะเป็นคำกำกับหน่วยวัด ไม่ใช่สถานะ ใช้ร่วมกับตัวเลขระยะปัดขึ้น `type.numeric` ตัวหนา tabular ≥24px `ink.900` เสมอ ห้ามใช้ตัวเลขระยะโดยไม่มี chip นี้กำกับ (กันสับสนว่าเป็นระยะเดินจริง)

**ตำแหน่งใน `home.farBody` (ปิด C6-06 ของ F06 copy gate, P2-H51):** ประโยค `home.farBody` ("ใกล้สุด {distanceText} ไกลก็จริง แต่ขามีไว้เดิน") ฝัง `{distanceText}` กลางประโยค ไม่ใช่ปลายประโยค และ `formatCopyText` (`copy/format.ts`) แทนค่าตัวแปรแบบสตริงล้วนเท่านั้น ไม่รองรับการแทรก DOM element กลางข้อความ — การติด `.chip-distance` เข้ากับตัวเลขตรงกลางประโยคเป๊ะจึงต้องเขียน plumbing แยกส่วนข้อความใหม่ทั้งหมด ไม่คุ้มกับ finding ระดับ "should" นี้ **ตัดสิน: วางเป็นบรรทัดใหม่ต่อจาก `body` ทันที** (ก่อน `nextOpenLine`/`registerCard`) ใช้ DOM/class เดียวกับที่ `nav-panel.ts` ทำอยู่แล้วเป๊ะ (สอง `<span>` พี่น้อง: ตัวเลข `.chip-distance` แล้ว tag `.chip-distance-tag` ต่อท้าย — reuse โค้ดเดิมได้ตรงๆ ไม่ต้องออกแบบใหม่) ประโยค `home.farBody` เดิมยังอยู่ครบไม่ต้องแก้คำ — บรรทัดใหม่นี้คือแหล่งที่มีชิปกำกับจริงตาม R34 ส่วนตัวเลขในประโยคเป็นแค่บริบทเสริม ไม่ใช่การแสดงระยะซ้ำที่ขัดกัน (ตัวเลขเดียวกันทั้งสองจุดเสมอ)
- ใช้กับ 2 kind เท่านั้นที่ `home.farBody` ถูกเรนเดอร์จริง: `far` และ `outside_launch_district` — ไม่ใช้กับ `temporarilyClosed` (ตั้ง `body = ''` อยู่แล้ว ไม่มีระยะให้กำกับ), `out_of_area`/`unknown` (ไม่มีระยะเลย)
- accuracy ต่ำ: ตัวเลขในบรรทัดชิปสลับเป็น `nav.distanceApprox` ("ราว {distanceText}") ด้วยตัวแปร `approximate` เดียวกับที่ `renderNearbyNav`/`nav-panel.ts` คำนวณอยู่แล้ว (`lastAccuracy_m` เทียบ `homeState.maxAccuracy_m`) — ไม่ใช่ chip ที่สองแยกจาก `nav.straightLineTag` (13.8 นี้มีแค่ chip เดียว ตัวเลขข้างในสลับคำได้ตามความแม่นยำ เหมือนที่ nav-panel ทำ)
- DOM order ที่คาดหวัง: `title` → `body` → **`.chip-distance` + `.chip-distance-tag`** → `nextOpenLine` → `registerCard` → `primaryCta`

[handoff gameplay-programmer: เพิ่มบรรทัดชิประยะใน `home-panel.ts` (state `far`/`outside_launch_district`) reuse `.chip-distance`/`.chip-distance-tag` ตามที่ `nav-panel.ts#setDistance` ทำอยู่แล้ว, ส่ง `approximate` เข้ามาจาก `f04-app.ts` เหมือนที่ `renderNearbyNav` ทำ | ไม่ blocking, P2-X47]

### 13.9 การเรนเดอร์ `icon.ui.*` ที่ต้องเปลี่ยนสีตามโทน (P2-H05)

**ปัญหา:** chip สถานะ (13.1) และ run-state pill (13.2) ต้องให้ glyph เปลี่ยนสีตามโทนของสถานะ (เช่น Grace = `state.info`, chip ปิดกลางคืน = `ink.100`) แต่ `apps/client/src/assets/icon-dom.ts` (P2-X21) เรนเดอร์ทุก icon เป็น `<img>` เสมอ — `<img>` โหลด SVG เป็นเอกสารแยก `currentColor` ในนั้น resolve จาก context ของตัวเองเท่านั้น **รับสีจาก CSS ของหน้า HTML ไม่ได้** จึงต้องเปลี่ยนเทคนิคเฉพาะกลุ่ม glyph ที่ใช้ `currentColor` จริง

**ตรวจของจริงวันที่ 2026-09-27 (แก้ตาม `art/direction/reviews/P2-H17-icon-night-and-composite.md`, D-121/D-123/D-124, P2-H19):** ภายใต้ `kind: "icon-ui"` (`icon.ui.*`, `icon.ui16.*`) มี 2 กลุ่มปนกัน ไม่ใช่ทุก id ที่ tint ได้ · **กฎจัดกลุ่มของ 16px (D-124):** `icon.ui16.<name>` อยู่กลุ่มสีเดียวกับ `icon.ui.<name>` ชื่อเดียวกัน**เสมอ** — 24px tint ได้ → 16px ของชื่อนั้นต้อง tint ได้ด้วยไฟล์ตัวเอง (มี `currentColor` ของตัวเอง ไม่ใช่ inherit จาก 24px) · 24px ตายตัว → 16px ของชื่อนั้นตายตัวด้วยสีเดียวกัน (**ไม่ใช่** "`icon.ui16.*` ทั้งชุด tint ได้" อย่างที่เอกสารนี้เคยเขียนผิดไว้ก่อนหน้านี้) เหตุผล: 16px คือ glyph เดียวกันที่ตัดรายละเอียด (icon-grammar 2.1) ไม่ใช่ glyph ใหม่ code สลับขนาดโดยไม่รู้ว่าเป็นคนละไฟล์ ถ้ากลุ่มสีต่างกัน glyph จะเปลี่ยนสีเองหรือหายไปตอนสลับขนาด
- **กลุ่ม glyph เส้น (tintable):** `stroke`/`fill="currentColor"` จริง เช่น `icon/ui/grace.svg`, `closed.svg`, `help.svg`, `location-off.svg`, `gate-miss.svg`, `hp-low.svg`, `knocked-out.svg`, `exit.svg`, `copy.svg`, `bag.svg`, `consent.svg`, `map.svg`, `hours.svg`, `navigate.svg`, `potion-used.svg`, `recovering.svg`, `retreat.svg`, `settings.svg`, `signal-wait.svg`, `speed-lock.svg`, `walk-in.svg` · `icon.ui.in-run` (**ย้ายเข้ากลุ่มนี้ที่ P2-H17** — แปลง `fill/stroke` เป็น `currentColor` แล้ว ปิดประเด็นเปิดเดิมเรื่อง night visibility) · และ `icon.ui16.<name>` ของทุก id ข้างต้นตามกฎ D-124 (`closed`, `closing-soon`, `gate-miss`, `grace`, `help`, `location-off`, `in-run` — 16px ของ `in-run` แปลงเป็น `currentColor` แล้วที่ P2-H17 เช่นกัน) — `closing-soon` (16px/24px) เป็นสองสีผสม: วง `stroke=currentColor` + เข็ม `fill="#1A1A22"` คงที่
- **กลุ่ม badge สีตายตัว (ไม่ tintable):** `icon.ui.gate-pass` (`#117733`), `icon.ui.rift` (`#CC1177`), `icon.ui.direction` (`#FFCC00`), `icon.ui.hp` (`#CC2222`) — วาดเป็นภาพประกอบสีความหมายเดียวตายตัว ไม่ใช่ outline glyph ทั่วไป · `icon.ui.suspended` (**D-123, P2-H17:** เปลี่ยนจากข้อเสนอเดิม `fill="#006699"` เป็น fill `#FFFFFF` (`bg.surface`) + stroke `#1A1A22` 2px round join ตายตัว ไม่ใช้ `currentColor` — สีความหมาย "info" มาจากพื้นแถบ `state.info` และข้อความ `run.stateSuspendedLabel` ไม่ใช่จากสี glyph เอง, S4) · และ `icon.ui16.<name>` ของทุก id ข้างต้นตาม D-124 (`gate-pass`, `hp`, `rift`, `suspended` — 16px ของ `suspended` ก็เป็น `#FFFFFF`+ขอบ `#1A1A22` เดียวกัน)

**ตัดสิน: เทคนิค (a) inline SVG** เฉพาะ entry ที่มี field ใหม่ `tintable?: true` (ตัดสินโดย tech-lead ที่ P2-H13, D-121: field เป็น **optional และมีอยู่เฉพาะเมื่อค่าเป็น `true`** — entry ที่ไม่ tintable **ไม่มี field นี้เลย** ไม่ใช่ `tintable: false`, ดูหัวข้อผลกระทบ manifest ด้านล่าง) — fetch ข้อความ SVG มาครั้งเดียวต่อ id (cache ใน memory ของ session, URL เดิมมี `?v=<sha256>` อยู่แล้วจึง cache HTTP แบบ immutable ได้ตาม `docs/tech/asset-delivery.md` 6.2), กรอง (allowlist tag/attribute, ตัด `script`/`on*`/`href` ที่ไม่ใช่ `#local`) ก่อนแทรกเข้า DOM แล้วตั้ง `style.color` ที่ตัวห่อ (หรือ `<svg>` เอง) เป็น token ตามหัวข้อ 13.9.2 · entry ที่ไม่มี field `tintable` (รวม badge สีตายตัวข้างต้น) และทุก kind อื่น (`icon.item.*`, `icon.qc.*`, `badge.*`, `frame.*`, `map.icon.*`, `illus.*`, `vfx.*`) **ยังเป็น `<img>` เหมือนเดิมทุกประการ ไม่แก้** (V7 บังคับ `currentColor` เฉพาะ `icon-ui` อยู่แล้ว จึง kind อื่นไม่มีเคสต้อง tint เลย)

เหตุผลเทียบ 3 ทาง (battery/perf, a11y, ความชัดบนแผนที่มืด, ผลกับ manifest):
| ทาง | battery/perf | a11y | ความชัดกลางคืน | ผลกับ manifest/art |
| --- | --- | --- | --- | --- |
| **(a) inline SVG เฉพาะ tintable — เลือก** | glyph ที่แสดงพร้อมกันน้อยมากเสมอ (กฎ S4 บังคับมีคำกำกับคู่ ไม่เคยเป็นลิสต์ยาวลำพัง) fetch 1 ครั้ง/id แล้ว cache ตลอด session ต้นทุนแบต/CPU ต่ำกว่าที่เห็นชัด ไม่มี animation ต่อเนื่อง | inline แล้วเป็น decorative เสมอ (`aria-hidden`) เพราะมีข้อความคำกำกับข้างเสมอตามกฎ S4 — ไม่ต้องมี `alt` แยก | glyph สีตามโทนได้ตรง token จริงทุกกรณี รวมกรณีสองสีผสม (`closing-soon`) ที่ยังคงส่วนคงที่ไว้ถูกต้อง | ไม่ต้องเพิ่มไฟล์ art ต่อโทน · ต้องเพิ่ม field `tintable?: true` ใน runtime manifest (คำนวณอัตโนมัติจากการสแกน `currentColor` ใน `tools/art stage`, มีอยู่เฉพาะเมื่อ `true` — D-121) |
| (b) `<img>` + ไฟล์สีสำเร็จรูปต่อโทน — ไม่เลือก | เพิ่มจำนวนไฟล์ = id × จำนวนโทนทุกครั้งที่เพิ่มสถานะใหม่ ดันงบ V4/V13 ที่ `manifest.icon.json` ตึงอยู่แล้ว (83% ของงบ ตาม asset-delivery.md 10.1) | เท่าเดิม (ไม่มีปัญหา แต่ก็ไม่ได้อะไรเพิ่ม) | ต้องผลิตไฟล์กลางคืนแยกทุก glyph ที่ต้องใช้กลางคืน เพิ่มงานศิลป์ไม่รู้จบ | ขัดกับเหตุผลที่ icon-grammar ออกแบบ `currentColor` ไว้ตั้งแต่แรกเพื่อเลี่ยงปัญหานี้ (icon-grammar.md 281) |
| (c) `mask-image` + `background-color` — ไม่เลือก | เบา ไม่ต้อง fetch/parse DOM (แค่ CSS) | ต้องมี text label แยกอยู่แล้วเหมือน (a) เพราะ mask ไม่ใช่ `<img>` ไม่มี `alt` เอง | **ใช้ไม่ได้กับ `closing-soon`**: mask ใช้ alpha ของทั้งแผ่นเป็นแม่แบบ สีเดียวทาทับทุกส่วน เข็มที่ต้องคงที่ `ink.900` เสมอจะถูกเปลี่ยนสีไปด้วย เสียรายละเอียดที่ style-guide ตั้งใจ (V-16 เหตุผลเรื่อง contrast เข็ม) | ต้องเพิ่ม `-webkit-mask-image` แยกสำหรับ iOS Safari (กลุ่มผู้เล่นเดินกลางแจ้งจำนวนมากอยู่บนเบราว์เซอร์นี้ ตามหัวข้อ 12) เพิ่มความซับซ้อนโดยไม่ได้อะไรที่ (a) ทำไม่ได้ |

#### 13.9.1 กฎสี glyph ต่อโทน (ไม่สร้างตารางใหม่ซ้ำ — สีของ glyph ที่ inline แล้ว = token เดียวกับ "ข้อความ" ของสถานะนั้นในตารางที่มีอยู่แล้วเสมอ)
| คอมโพเนนต์ | สถานะ | id | token สี (`color` ที่ตั้งบนตัวห่อ SVG) | พร้อมใช้วันนี้ไหม |
| --- | --- | --- | --- | --- |
| chip-status (13.1) | ใกล้ปิด | `icon.ui.closing-soon` | `ink.900` (กลางวัน/กลางคืนเหมือนกัน) | พร้อม (มี `currentColor` ที่วงแหวนแล้ว) |
| chip-status (13.1) | ปิดทำการ กลางวัน | `icon.ui.closed` | `ink.700` | พร้อม |
| chip-status (13.1) | ปิดทำการ กลางคืน | `icon.ui.closed` | `ink.100` | พร้อม |
| chip-status (13.1) / run-state pill Active (13.2) | กำลังเล่นอยู่ กลางวัน | `icon.ui.in-run` | `ink.900` | พร้อม (บังเอิญตรงกับสีตายตัวในไฟล์อยู่แล้ว) |
| chip-status (13.1) / run-state pill Active (13.2) | กำลังเล่นอยู่ กลางคืน | `icon.ui.in-run` | `bg.paper` | **พร้อม (แก้ที่ P2-H17)** — master แปลงเป็น `currentColor` แล้วทั้ง 24px และ 16px (D-124) ปิดประเด็นเปิดเดิมเรื่อง "night visibility ของ `icon.ui.in-run`" ครบ |
| run-state pill Grace (13.2) | Grace | `icon.ui.grace` | `state.info` | พร้อม |
| run-state pill Suspended (13.2) | Suspended | `icon.ui.suspended` | **ไม่ตั้งค่า `color` เลย (D-123)** | **พร้อม แต่คนละกลไก** — หลัง P2-H17 glyph นี้เป็น**สีตายตัว** fill `bg.surface` (`#FFFFFF`) + ขอบ `ink.900` 2px ไม่ใช่ `currentColor` (ไม่มี field `tintable`) จึงเรนเดอร์เป็น `<img>` ปกติเหมือนกลุ่ม badge เดิม ไม่ใช่ inline+tint แบบแถวอื่นในตารางนี้ — สีความหมาย "info" มาจากพื้นแถบ `state.info` ของ pill เองและข้อความ `run.stateSuspendedLabel` ไม่ใช่จากสี glyph (ยืนยันคอนทราสต์ ≥ 6.25:1 ทุกพื้นที่ใช้จริงใน `P2-H17-icon-night-and-composite.md` หัวข้อ 2) · **A-P2-H17-2 ยืนยันแล้ว:** บนพื้น `bg.night` glyph นี้ปรากฏเฉพาะนอกแถบเต็มความกว้างของ `state.info` เท่านั้น (เช่น ใน toast) ไม่เคยวางลอยบน `bg.night` เปล่าๆ นอกบริบทนั้น — ตรงกับแถวคอนทราสต์ "พื้น `bg.night` (toast หรือ layer กลางคืนที่ไม่ได้ทาพื้นทั้งแถบ)" ของรีวิว ซึ่ง fill `bg.surface` ได้ 17.29:1 |

#### 13.9.2 กฎ a11y
- glyph ที่ inline แล้วเป็น **decorative เสมอ**: `aria-hidden="true"` + `focusable="false"` บน `<svg>` ที่แทรกเข้าไป และตัด `<title>`/`<desc>` เดิมออกถ้ามีติดมาจากไฟล์ (กัน screen reader อ่านซ้ำสอง) — เหตุผล: ทุกจุดที่ใช้กลุ่ม `icon-ui` (chip, pill, toast, banner, checkin-row) บังคับมีคำกำกับเป็นข้อความอยู่ข้างเสมอตาม style-guide S4 ("ห้ามใช้สีอย่างเดียว") จึงให้ข้อความนั้นเป็น accessible name แทน ไม่ใช่ตัว glyph
- ถ้าในอนาคตมีจุดที่ต้องแสดง `icon-ui` **โดยไม่มีข้อความกำกับข้าง** (ยังไม่มีในสเปกปัจจุบันของเอกสารนี้) ห้ามใช้ `aria-hidden` เฉยๆ ต้องเพิ่ม `role="img"` + `<title>` (หรือข้อความที่ซ่อนด้วย visually-hidden) จาก copy key เดียวกับที่ใช้เป็น `alt` วันนี้ — ระบุเป็นเงื่อนไขล่วงหน้าไว้กันลืมตอน build จุดใหม่
- fallback เดิมของ `docs/tech/asset-delivery.md` 6.4 ("icon id ไม่มี → ใช้ `icon.ui.help`", "ไฟล์โหลดไม่ขึ้น → ลองใหม่ 1 ครั้งตอนกลับมา online แล้วใช้กรอบว่าง") ต้องยังทำงานเหมือนเดิมทั้งสองเทคนิค: ถ้า fetch ข้อความ SVG ของ id ที่มี `tintable: true` ล้มเหลว (offline/network) ให้ถอยไปแสดงเป็น `<img src>` ธรรมดาด้วย URL เดิมก่อน (สีจะไม่ตรงโทนแต่ยังเห็น glyph ดีกว่าไม่เห็นเลย) แล้วค่อย fallback ต่อไปที่กรอบว่างตามเดิมถ้า `<img>` เองก็ error ซ้ำ — ไม่มี "จอค้าง"/"retry ไม่จบ" เพิ่มจากเดิม เพราะ asset ไม่กระทบ state ของ run (asset-pipeline หลักการเดิม)
- **กฎ fallback บนพื้นมืด (P2-H17, handoff เดิมถึง gameplay-programmer):** เมื่อ glyph ที่ `tintable` ต้องถอยไปเป็น `<img>` ตามข้อข้างบน **และ** ตำแหน่งที่แสดงอยู่บนพื้น `bg.night` — `currentColor` ใน `<img>` resolve เป็นดำ (`#000000`) เสมอ ไม่ใช่ token ที่ควรได้ จึงมองไม่เห็นบนพื้นมืด (เหมือนปัญหาเดิมของ `icon.ui.in-run` ก่อนแก้) ต้องวาง**แผ่นรอง (backing plate) สี `bg.surface`** ขนาดเท่ากรอบ glyph บวก 2px รอบด้าน ไว้หลัง `<img>` เสมอในกรณีนี้เท่านั้น (เทียบกับกฎแผ่นรองพื้นหลังของ avatar ใน avatar-spec 3) — ไม่ต้องทำกับ glyph ที่ไม่ tintable (badge สีตายตัวรวม `icon.ui.suspended` ไม่มีปัญหานี้อยู่แล้วเพราะเป็น `<img>` ปกติที่สีถูกต้องเสมอไม่ว่า fetch สำเร็จหรือไม่)

#### 13.9.3 ผลกับ manifest / asset pipeline
`tools/art` (ขั้น `stage`, `docs/tech/asset-delivery.md` หัวข้อ 3/5) ต้องเพิ่ม field ใหม่ต่อ entry ใน `asset-manifest.json`: `assets[id].tintable?: true` — คำนวณอัตโนมัติจากการสแกนไฟล์ SVG ต้นทางว่ามี `currentColor` หรือไม่ (ไม่ใช่ให้ artist-2d ตั้งเองเพื่อกันลืม/พิมพ์ผิด) เฉพาะ entry `kind: "icon-ui"` เท่านั้นที่ตรวจ (kind อื่นบังคับไม่มี `currentColor` อยู่แล้วตาม V7 จึงไม่มี field นี้เสมอโดยไม่ต้องสแกน) **field เป็น optional และปรากฏเฉพาะเมื่อค่าเป็น `true` เท่านั้น** (D-121, ตัดสินโดย tech-lead ที่ P2-H13) — entry ที่ไม่ tintable ไม่มี key `tintable` อยู่เลยใน JSON ของ entry นั้น ไม่ใช่ `tintable: false` client (`apps/client/src/assets/`) อ่าน field นี้ (ตรวจด้วย `'tintable' in asset` หรือเทียบเท่า ไม่ใช่ `asset.tintable === false`) เพื่อเลือกเทคนิคเรนเดอร์ ไม่ต้อง hardcode รายชื่อ id เอง — ตรงนี้เป็นการเปลี่ยนสัญญาที่ tech-lead เป็นเจ้าของ (`docs/tech/asset-delivery.md` หัวข้อ 6.1 ปัจจุบันเขียนว่า "glyph ที่ใช้ `currentColor` ต้อง inline" อยู่แล้วในหลักการ แต่ยังไม่ได้ระบุว่า client รู้ได้อย่างไรว่า id ไหนใช้ — field นี้ปิดช่องว่างนั้น) ดู handoff หัวข้อ 14

### 13.10 ปุ่มแผนที่ตามตัว (`#follow-toggle`) — ยืนยันรูปทรงตาม R2-4 (P2-H54)

ที่มา: `apps/client/src/ui/gps-ui.ts` (ปุ่มลอยมุมบนของแผนที่ สลับ "ตามตัว"/"ไม่ตามตัว") ไม่เคยมีสเปกในเอกสารนี้มาก่อน — build เดิมสร้างด้วย `class="button"` เปล่า (ปุ่ม default ของ browser) เจอเป็น finding R2-4 ของ art gate (`art/reviews/F04-F06-visual-gate.md` §7.3) หัวข้อนี้ปิดโดยยืนยันทิศทางที่ gate เสนอเป็นสเปกทางการ ไม่แก้ไข:

- **ชนิดปุ่ม:** `.btn.btn-secondary` เดิม (หัวข้อ 3) ไม่สร้างคลาสใหม่ — เหตุผลเดียวกับหัวข้อ 3.2: ไม่ใช่ CTA เดียวของจอ (ปุ่มเข้า/นำทางยังเป็น `.btn-primary` เดิม) และปุ่มนี้มีจุดใช้จุดเดียวในแอป ไม่คุ้มเปิด token ใหม่
- **สถานะเปิด/ปิด แสดงด้วยข้อความ ไม่ใช่สี/ไอคอนอย่างเดียว** (style-guide S4): สลับข้อความเต็มคำระหว่าง "ตามตัว" (`FOLLOW_ON_KEY`) กับ "ไม่ตามตัว" (`FOLLOW_OFF_KEY`) พร้อม `aria-pressed` ตามสถานะ — ทั้งสอง key ปัจจุบันเป็น placeholder (`client.mapSpike.followModeOn/Off`) ยังไม่ใช่คำจริงจาก narrative-designer (ค้างจาก comment เดิมใน `gps-ui.ts` ไม่ใช่ของใหม่จากงานนี้ ยังต้องขอคำจริงก่อน build ที่ไม่ใช่ spike)
- **ตำแหน่ง:** `position: absolute; top: max(8px, env(safe-area-inset-top)); right: 8px;` มุมขวาบนของพื้นที่แผนที่ เพื่อไม่ชนกับ `.gps-pill` ที่อยู่มุมซ้ายบน (ตำแหน่งลอยเหนือแผนที่ตามที่ build ปัจจุบันวาง ไม่ใช่ `.headerbar` ทางการของหัวข้อ 2 — ยอมรับเป็นโครง HUD ชั่วคราวของ Phase 2 จนกว่าจะมี headerbar เต็มรูปตามหัวข้อ 2)
- **ซ่อนระหว่าง run เสมอ:** ต้องไม่โผล่ทับ/แทรกใต้ `.run-top-stack` (R2-2) หรือแผงใดของจอ `S-03-run` — เหตุผล: ระหว่าง run แผนที่ไม่ใช่จุดสนใจหลักของจอ (HP/tick/HUD ของ run สำคัญกว่า) และการโผล่ปนกับแผงที่ปักตำแหน่งของ run ทำให้เกิดปัญหาแบบเดียวกับ R2-2/R2-4 ซ้ำอีก

ไม่ใช่ V-42 ตัวจริงของ art gate (นั่นคือ toggle switch ของหัวข้อ 9.1) — ปุ่มนี้เป็นปุ่มกดสลับสถานะ (`.btn-secondary`) ไม่ใช่ switch รูปราง ทั้งสองใช้คำว่า "toggle" ในบทสนทนาปนกันได้ง่าย บันทึกแยกไว้ชัดตรงนี้กันสับสนซ้ำ

[handoff gameplay-programmer, P2-X52: ยืนยัน `#follow-toggle` ใช้ `class="btn btn-secondary"` (ไม่ใช่ `class="button"` เปล่า) ตั้งตำแหน่งตามข้างบน และซ่อนขณะ `.screen.run-screen`/`S-03-run` แสดงอยู่ | ไม่ blocking (R2-4 ไม่ใช่ข้อบังคับของ uiux แต่ยืนยันสเปกไว้ให้ตรงโค้ด) | to: narrative-designer, need: คำจริงแทน `client.mapSpike.followModeOn/Off` (kind `label`, เพดาน 20 ช่อง) | blocking: no]

## 14. สมมติฐานและการส่งต่อ

1. บอร์ด T17 เสนอ touch target ขั้นต่ำ 44px แต่ context ของ task และ `art/direction/style-guide.md` S8 กำหนด 48px เอกสารนี้และ `tokens.json` ใช้ **48px** เป็นค่าจริง (สูงกว่าค่าเสนอในบอร์ดโดยตั้งใจ ไม่ใช่ต่ำกว่า) — ยืนยัน: art-director, game-director
2. ป้ายชื่อโซนที่ 360px ยังทดสอบด้วย font ตัวแทน (system font) ไม่ใช่ IBM Plex Sans Thai Looped ตัวจริง เพราะยังไม่มีไฟล์ font จริงส่งมาถึง T17 — ต้องทดสอบซ้ำเมื่อ `asset-pipeline.md` (P1-F03-T11) ส่งไฟล์ font จริง (ยืนยัน: art-director)
3. Icon จริง (SVG ตาม icon-grammar) ยังไม่มีไฟล์จาก artist-2d (P1-F03-T14/T13) wireframe จึงใช้ตัวอักษรย่อ/รูปทรงพื้นฐานแทน icon จริงชั่วคราว ไม่ใช่ของสุดท้าย — ต้องเปลี่ยนเป็น SVG จริงก่อน build (ยืนยัน: artist-2d)
4. เกณฑ์ตัวเลขที่ยังไม่มีใน config (`unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s`, `location.minAccuracy_m`) ใช้ค่าตัวอย่างในวงเล็บของ wireframe เท่านั้น รอ P1-H03 (ยืนยัน: systems-designer)
5. (P1-X10) เพดานชื่อโซน 17/14/34 ยืนยันด้วยการคำนวณจากข้อมูลจริงใน `names.th.json` (นับ cells จาก field `cells` ที่มีอยู่ ลบตัวคั่นและคำขยาย) ไม่ใช่การวัดจริงบนหน้าจอด้วย font สุดท้าย — ยังต้องทดสอบซ้ำเมื่อมี font จริง (สืบเนื่องจากข้อ 2) โดยเฉพาะกรณีชื่อที่เข้าใกล้เพดาน 34 ช่องเต็ม ซึ่งสต็อกตั้งต้นยังไม่มีตัวอย่างจริง (ยืนยัน: art-director, narrative-designer)
6. (ปิดแล้ว, P1-X17, F-07) `A-P1-F03-T17-4` เดิม (age-gate ไม่มีปุ่มยืนยันแยก) **ถูกแก้แล้ว:** game-director ตัดสิน CHANGE ใน gate A หัวข้อ 4.8 — age-gate ต้องมีปุ่มยืนยันแยก (`age.gateConfirm`, `.btn-disabled` จนกว่าจะเลือกตัวเลือก) เพราะการแตะพลาดบนรายการที่เลื่อนได้เกิดบ่อย และผลของการเลือกผิดกระทบข้อมูลอายุที่มีผลทางกฎหมาย (NN-7) ดู `wireframes/00-onboarding.html` เฟรม 4 และ flow หัวข้อ 2 ขั้น 4
7. **(P2-F04-T06)** หัวข้อ 13 (คอมโพเนนต์ F04 Phase 2) ยังไม่มี `.html` ตัวอย่างจริงในไฟล์ `wireframes/F04-*.html` เพราะไฟล์เหล่านั้นอยู่นอก `writes` ของงานนี้ (จำกัดที่ 00–06 ของ F03 เท่านั้น) — spec หัวข้อ 13 อ้างพิกัด/สีตรงจาก `art/direction/briefs/P2-assets.md` 3.3–3.8 และ flow F04 แทนการมีตัวอย่าง HTML สดในรอบนี้ ต้องเพิ่ม class CSS จริงใน `wireframes/shared/style.css` (`.chip-status`, `.run-state-pill`, `.checkin-row`, `.overlay-speedlock`, `.direction-arrow`, `.chip-sponsored`, `.chip-distance`) ในงานที่แตะ `wireframes/F04-*.html` ครั้งถัดไป (owner: uiux-designer)
8. ~~(P2-H05) หัวข้อ 13.9 อ้าง field `tintable` ใน runtime manifest ที่ยังไม่มีจริง~~ **ปิดแล้ว (P2-H13, D-121):** tech-lead อนุมัติ field แล้วเป็น `tintable?: true` (optional, มีเฉพาะเมื่อ `true`) · art-director ตรวจ/แก้ master SVG ที่เหลือแล้วที่ P2-H17 (D-123, D-124 — ดูหัวข้อ 13.9) เหลือแค่ gameplay-programmer implement ฝั่ง client ตาม handoff ด้านล่าง (ยังไม่ blocking)
9. **(P2-H49) ปิดสมมติฐาน CSS ทั้ง 3 ข้อของ P2-X42:** A-P2-X42-1 (`.gps-pill` ใช้ `state.danger` เดียวทุกสถานะ) — **แก้ทิศทาง**, เพิ่มตารางสีต่อสถานะที่หัวข้อ 2.1 (`searching`=`state.info`, อีก 4 ตัว=`state.danger`) เพราะ `searching` เป็นสถานะรอปกติที่เกิดทุกครั้งที่เปิดแอป ไม่ใช่ปัญหา · A-P2-X42-3 (icon ต่อเหตุของแถว check-in) — **ยืนยันโค้ดถูกต้องแล้ว**, เพิ่มตารางอ้างอิงที่หัวข้อ 13.3 ไม่ต้องแก้ `checkin-status.ts` · A-P2-X42-4 (`.btn-fullwidth-bottom` อยู่ normal flow) — **แก้ทิศทาง**, เพิ่มหัวข้อ 3.4 บังคับ `position: sticky` เพราะรายการรางวัลของ `S-04-run-summary` ไม่มีเพดานจำนวน เสี่ยงดันปุ่มเดียวของจอพ้นล่างจอ (owner: uiux-designer, handoff: gameplay-programmer ทั้งสองข้อที่แก้ทิศทาง)
10. **(P2-H51) ป้าย Recovering (C6-05) และชิประยะของ `home.farBody` (C6-06):** ทั้งสองเป็นรายละเอียดที่ P2-X41 ต้อง build โดยไม่มีสเปกเขียนไว้ตรงจุด — ตรวจแล้วว่าตำแหน่ง/กฎการแสดงผลของป้าย Recovering ที่ build เลือกไว้เองตรงกับเจตนาของ flow F06 C7 ทุกข้อ จึงยืนยันเป็นสเปกจริงที่หัวข้อ 6.1 (พบเพิ่มว่าไอคอนที่ควรมีตามกฎ `.banner.info` ยังขาดอยู่) · ชิประยะของ `home.farBody` ยังไม่เคยถูก build เลย (C6-06 ของ copy gate) เพิ่มคำตัดสินตำแหน่งที่หัวข้อ 13.8 (owner: uiux-designer, handoff: gameplay-programmer ทั้งสองข้อ, ไม่ blocking ด้าน PDPA — รายละเอียดโค้ดสำหรับบรรทัดสรุป run ที่ผ่านมา (C6-07) อยู่ที่ `design/ux/flows/F06-hp-damage-onboarding.md` หัวข้อ 20 แทน ไม่ใช่เอกสารนี้ เพราะเป็นกฎการจัดรูปแบบข้อความ/เวลาข้ามสถานะ ไม่ใช่คอมโพเนนต์ภาพใหม่)

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
- to: gameplay-programmer (P2-F04-T21, P2-F06-T08) | need: build คอมโพเนนต์ F04 หัวข้อ 13 ทั้งหมดตาม tokens.json/components.md ใหม่นี้ (chip สถานะ, run-state pill, check-in row, speed-lock overlay ไม่มีปุ่มเหลือง, ลูกศรทิศ 8 ทิศ, เส้นแบ่งขอบ HP bar, chip-sponsored, chip-distance) | why: P2-F04-T06 ปิด finding V-15/V-20/V-22 และคำถามเปิดของ flow F04 หัวข้อ 11 เรื่อง run-state pill | blocking: no
- to: qa-tester (P2-X01) | need: อัปเดต `qa/tests/unit/contrast.test.ts` — ขยาย regex `ramp\.([a-z]+)` เป็น `ramp\.([a-z0-9-]+)` (รับ `skin-1`..`hair-6`), แก้ค่านับแถวที่แข็งเป็นตัวเลข (`colorRows.length` 41→42 จาก `color.map.water-edge`, `rampRows.length` 10→23 หลังขยาย regex รับ 12 ramp ผิว/ผมกับ `ramp.tonic`) | why: tokens.json ตอนนี้ตรงกับ style-guide ครบแล้ว เหลือแค่ตัวนับที่ qa เป็นเจ้าของ (บล็อก BLOCKING ของ P2-F04-T06 ระบุไว้) | blocking: no (ทดสอบผ่านหมดยกเว้น 2 row-count check ตามที่คาดไว้)
- ~~to: tech-lead | need: (P2-H05) เพิ่ม field `assets[id].tintable: boolean`~~ **ปิดแล้ว (P2-H13, D-121):** field เป็น `tintable?: true` (optional, มีเฉพาะเมื่อ `true`) ไม่ใช่ `boolean` เสมอไป
- to: gameplay-programmer | need: (P2-H05, อัปเดต P2-H19) เพิ่มเทคนิคเรนเดอร์ที่สองใน `apps/client/src/assets/` ข้าง `setIconImg` เดิม (เช่น `setIconGlyph`) สำหรับ entry ที่**มี** `tintable: true` (ตรวจด้วย `'tintable' in asset`, ดูหัวข้อ 13.9.3): fetch ข้อความ SVG จาก URL ที่ resolve ได้ (cache ใน memory ต่อ session), sanitize แบบ allowlist tag/attribute (ตัด `script`/`on*`/`href` ที่ไม่ใช่ `#local`), แทรกเข้า DOM, ตั้ง `aria-hidden="true"` + `focusable="false"`, ตั้ง `style.color` เป็น token ตามตาราง 13.9.1 · ถ้า fetch ล้มเหลวให้ถอยไปใช้ `setIconImg` เดิมกับ URL เดียวกัน **และถ้าตำแหน่งนั้นอยู่บนพื้น `bg.night` ให้วางแผ่นรอง `bg.surface` ขนาด glyph + 2px ไว้หลัง `<img>` ด้วย** (13.9.2, กฎ fallback บนพื้นมืด ใหม่จาก P2-H17) · ใช้ได้ทันทีกับ run-state pill ทั้ง 3 สถานะ (`icon.ui.grace`, `icon.ui.in-run` ทั้งกลางวัน/กลางคืน) และ chip สถานะทุกแถว เพราะพร้อมครบแล้วหลัง P2-H17 (ตาราง 13.9.1 คอลัมน์ขวาสุด = "พร้อม" ทุกแถว) · Suspended **ไม่ต้องใช้เทคนิคนี้** ยังเป็น `<img>` ปกติเหมือนเดิม (glyph สีตายตัวจาก D-123 ไม่มี `tintable`) | why: ปิดปัญหาที่ระบุใน P2-H05 (`<img>` รับ CSS `currentColor` ไม่ได้) | blocking: no
- ~~to: art-director | need: (P2-H05) พิจารณาแก้ master `art/assets/icon/ui/in-run.svg`/`suspended.svg`~~ **ปิดแล้ว (P2-H17):** `in-run` แปลงเป็น `currentColor` ทั้ง 24px/16px (D-124) · `suspended` ตัดสินเป็นสีตายตัว fill `bg.surface` + ขอบ `ink.900` แทน (D-123, ไม่ใช่ `currentColor`) — ทั้งสองปิดครบ ดูหัวข้อ 13.9/13.9.1

## 15. Z-index scale และโครง `#hud` (D-129, P2-H28)

ที่มา: tech-lead อนุมัติฐาน layout `#hud { position: absolute; inset: 0 }` (D-129, ดูคอมเมนต์เต็มใน `apps/client/src/app.css` ที่อธิบายเหตุที่ต้องมี `position` ชัดเจน — ไม่งั้น `#map` ที่เป็น `position: absolute` เช่นกันจะวาดทับ `#hud` ทั้งก้อนตาม CSS2.1 Appendix E) เงื่อนไขที่แนบมา: ต้องมี z-index scale เป็น token ก่อนที่ flow F06 จะเพิ่มจอซ้อนกันอีก (speed-lock, HP ต่ำ, auto-retreat, ตาย, Recovering ฯลฯ) — หัวข้อนี้ปิดเงื่อนไขนั้น

### 15.1 สเกลเต็ม (`tokens.json#zIndex`)

| ระดับ | ค่า | ใช้กับ |
| --- | --- | --- |
| `map` | 0 | `#map` — ตัวแผนที่เอง (canvas ของ MapLibre หรือ fallback ข้อความ) |
| `hud` | 1 | `#hud` เอง (container เดียวที่ลอยเหนือแผนที่เสมอ ทุกจอ/ทุกคอมโพเนนต์ในเอกสารนี้เป็นลูกของ container นี้) |
| `banner` | 10 | ป้ายเหตุการณ์สดใต้ header (หัวข้อ 2.3), `.banner.info`/`.banner.warn` (หัวข้อ 6) |
| `drawer` | 20 | bottom sheet ไม่บล็อกจอ (หัวข้อ 5) — Nearby Party, Quick command |
| `toast` | 30 | `.toast.*` ทุกแบบ (หัวข้อ 6) รวม `run.hpLow` |
| `navScreen` | 35 | **(D-160, ใหม่ ปิด finding F-04)** จอเต็มจอของ F10 shell ที่ยังต้องโชว์ nav ทับอยู่ — `.screen.inventory-screen`, `.screen.coming-soon-screen` (หัวข้อ 16.3) — ดูเหตุผลที่ 15.5 |
| `nav` | 38 | **(D-160, ใหม่ ปิด finding F-04)** bottom nav ถาวร + ปุ่ม Setting ลอยของ F10 shell — `.bottombar-f10` (หัวข้อ 16.1), `.setting-button-float` (หัวข้อ 16.2) — ดูเหตุผลที่ 15.5 |
| `popupModal` | 40 | popup/modal ที่บล็อกจอด้วยปุ่มยืนยัน (หัวข้อ 4) — `.popup-overlay`/`.popup` ทุกที่ที่ใช้ |
| `overlay` | 50 | จอเต็มที่ทับทุกอย่างชั่วคราวระหว่างเปลี่ยนสถานะ — speed-lock (หัวข้อ 13.4), เอฟเฟกต์เปลี่ยนจอตอน auto-retreat, `S-04-run-summary` (จอเดียวที่แทนที่ทุกอย่างตอนจบ run) |
| `system` | 60 | จอบังคับระดับระบบก่อนเล่นได้ — consent ตำแหน่ง, age gate (`S-00-consent-location`, `S-00-age-gate`) |
| `nativePrompt` | 9999 | prompt ของเบราว์เซอร์/OS เอง (geolocation permission) — นอกสเกลนี้ ควบคุมไม่ได้ |

ลำดับเดียวคงที่: `map < hud < banner < drawer < toast < navScreen < nav < popupModal < overlay < system < nativePrompt` (D-160 เพิ่ม `navScreen`/`nav` คั่นระหว่าง `toast` กับ `popupModal`, ดูเหตุผลที่ 15.5)

### 15.2 ข้อบังคับคู่กัน (D-129)

1. **มีแค่ระดับ `popupModal`/`overlay`/`system` เท่านั้นที่อนุญาตให้เป็นกล่องเต็มจอโปร่งใส** (`position: absolute; inset: 0` + พื้นหลังโปร่งแสง/ทึบคลุมทั้งจอ) — `banner`/`drawer`/`toast` ต้องวางเฉพาะพื้นที่จริงที่มองเห็น (เช่น banner ปักบนสุดเต็มความกว้างแต่สูงแค่แถบ, toast กึ่งกลางล่างกว้างเท่าข้อความ, drawer ปักล่างสูงเท่าเนื้อหา) **ห้ามใช้ `inset: 0` เด็ดขาด** เหตุผล: `#hud > *` ทุกตัวถูกตั้ง `pointer-events: auto` (`#hud` เองตั้ง `pointer-events: none`) ถ้า element ระดับ banner/toast เป็นกล่องเต็มจอ (แม้พื้นหลังจะโปร่งใสจนมองไม่เห็น) จะดักคลิกทั้งจอทับแผนที่ด้านล่างไปด้วยทั้งที่มองเห็นแค่แถบเล็กๆ
2. **Child ของ `#hud` ห้ามใช้ `position: fixed` เด็ดขาด** ต้องเป็น `position: absolute` เพื่ออยู่ในบริบทตำแหน่งเดียวกับ `#hud` ที่ตั้ง `inset: 0` คลุมทั้งจอไว้แล้ว — กัน viewport/safe-area คลาดเคลื่อนบนมือถือจริงเวลาคีย์บอร์ดหรือแถบเบราว์เซอร์ย่อ/ขยาย (พฤติกรรม `position: fixed` ต่างจาก `absolute` บนมือถือจริงโดยเฉพาะ)

### 15.3 คอมโพเนนต์/จอ → ระดับ (P2-H28)

| คอมโพเนนต์/จอ | ระดับ | หมายเหตุ |
| --- | --- | --- |
| `.popup-overlay`/`.popup` (`S-02-dungeon-confirm`, popup ยืนยันออกใน `.run-bar`, แผง fallback ของ `.nav-panel`) | `popupModal` (40) | ทุกจุดที่ใช้ class เดียวกันนี้ใช้ระดับเดียวกันเสมอ ไม่ว่าจะเป็น popup ไหน |
| `.run-bar` (run-state pill, tick timer, ปุ่มออกเอง) | `hud` (1, ไม่ยกระดับ) | เป็นแถบถาวรของจอ run ปกติ ไม่ใช่ overlay ชั่วคราว · ลูกของมันมีสองส่วนที่ยกระดับ: `.banner` ลูก (Grace/Suspended/ใกล้ปิด) ใช้ `banner` (10), ส่วน popup ยืนยันออกที่ฝังอยู่ในนั้นใช้ `popupModal` (40) ตามแถวบน |
| `.overlay-speedlock` (หัวข้อ 13.4) | `overlay` (50) | "ทับทุกอย่าง" ตามสเปกเดิม — ต้องอยู่เหนือ `popupModal` เพราะอาจมี popup เปิดค้างอยู่ตอน speed-lock เริ่ม (race) |
| `.screen.run-summary` (`S-04-run-summary`) | `overlay` (50) | เป็นจอแทนที่ทั้งหมดตอนจบ run เหมือนกันทุก `exit_reason` — ลำดับความสำคัญของแอป (`apps/client/src/f04-app.ts`) คือ speed-lock > summary > run > confirm > map/nav ทั้งสองจอที่สูงสุด (speed-lock, summary) จึงอยู่ระดับเดียวกัน โดยแอปเป็นคนตัดสินว่าจะ mount จอไหน ไม่ใช่ z-index ต่างกันที่ทำให้ exclusive กัน |
| `.nav-panel` (แผงระยะ+ทิศ+ปุ่มนำทาง, A2) | `hud` (1, ไม่ยกระดับ) | แผงถาวรในเลย์เอาต์ ไม่ใช่ overlay · แผง fallback ภายในใช้ `popupModal` (40, แถวบน) และ toast ยืนยันคัดลอกใช้ `toast` (30) |
| F06 — `run.hpLow` (แจ้ง HP ต่ำ 30%) | `toast` (30) | `.toast.danger` ตามหัวข้อ 6 ของเอกสารนี้ |
| F06 — ตาย/`auto_retreat` | `overlay` (50) | Phase 2 ไม่มีสถานะล้มในดัน (F06 override ข้อ 2) ตายและ auto-retreat จบ run ทันทีแล้วสลับเข้า `.screen.run-summary` ตรงๆ จึงใช้ระดับเดียวกับแถวบน ไม่มีจอ/overlay แยกของตัวเอง |
| `S-00-consent-location`, `S-00-age-gate` | `system` (60) | สูงสุดในสเกลนี้ (ไม่รวม `nativePrompt`) เพราะเป็นจอบังคับก่อนเล่นได้ ไม่ควรมีจอใดบังจอเหล่านี้ในทางทฤษฎี แม้ในทางปฏิบัติจะไม่เกิดพร้อมกับ `overlay`/`popupModal` เพราะเกิดก่อน onboarding เท่านั้น |
| `.pocket-screen` (จอพกกระเป๋า, ทับเนื้อหาของ `S-03-run` เมื่อเปิดใช้งาน ตามหัวข้อ 12) | `overlay` (50) | เต็มจอทึบเหมือน speed-lock/run-summary จึงอยู่ระดับเดียวกัน — **ตารางนี้เดิมไม่มีแถวนี้เลย ช่องว่างนั้นคือที่มาของปัญหา P2-H39:** `.toast` (30, HP ต่ำ/tick) เรนเดอร์อยู่ *หลัง* พื้นทึบของจอนี้เสมอ (30 < 50) ตัวเลขจริงจากโค้ด (`apps/client/src/app.css`) ตรงกับ `tokens.json` อยู่แล้วทั้งคู่ — นี่ไม่ใช่บั๊กที่ต้องแก้ค่า แต่เป็นกฎที่ต้องเขียนให้ชัด ดูคำตัดสินเต็มที่ 15.4 |
| `.screen.inventory-screen`, `.screen.coming-soon-screen` (F10 shell, หัวข้อ 16.3) | `navScreen` (35, **D-160 ใหม่**) | จอเต็มจอปกติทุกใบของแอปอยู่ที่ `overlay` (50) แต่สองจอนี้ต้องต่ำกว่า `nav` (38, แถวถัดไป) เพื่อให้ bottom nav/ปุ่ม Setting วาดทับอยู่บนจอได้ตลอด (ผู้เล่นสลับแท็บ/เปิด Setting จากจอเหล่านี้ได้โดยไม่ต้องออกจอก่อน) — ไม่กระทบจอ `overlay` (50) อื่น เพราะ nav ถูกซ่อนบนจอเหล่านั้นอยู่แล้ว (หัวข้อ 8 ของ flow F10) |
| `.bottombar-f10`, `.setting-button-float` (F10 shell, หัวข้อ 16.1/16.2) | `nav` (38, **D-160 ใหม่**) | ต้องทับ `navScreen` (35) เสมอ แต่ยังต้องถูก `popupModal` (40) บังด้วย scrim เมื่อมี popup เปิดค้างอยู่ (เช่น `S-02-dungeon-confirm` ที่เปิดทับจาก `S-01-map`) กันผู้เล่นกดปุ่ม nav ทะลุ popup โดยไม่ตั้งใจ — เหตุผลเต็มที่ 15.5 |

### 15.4 ข้อยกเว้นของจอพกกระเป๋า: ทำไมไม่เพิ่มระดับใหม่เหนือ `overlay` ให้ toast (P2-H39)

**ปัญหาที่พบ:** หัวข้อ 12.1 (ก่อนแก้) เขียนว่า cue ของ HP ต่ำ/auto-retreat/ตาย/tick "ไม่ต้องออกจากจอพกกระเป๋า" ซึ่งอ่านได้ว่าอาจต้องมี `.toast` แสดงทับจอมืดด้วย แต่ `.toast` อยู่ที่ `zIndex.toast` (30) ต่ำกว่า `.pocket-screen` ที่อยู่ `zIndex.overlay` (50) เสมอ (ยืนยันตรงกับโค้ดจริงทั้ง `tokens.json#zIndex` และ `apps/client/src/app.css`/`ui/pocket-screen.ts`) toast ที่ถูก mount ขณะจอพกกระเป๋าเปิดอยู่จึงเรนเดอร์อยู่หลังพื้นทึบเสมอ มองไม่เห็น

**คำตัดสิน (uiux-designer, สอดคล้องกับทิศทาง A ที่ game-director อนุมัติแล้วใน `design/reviews/F03-design-gate-a.md` 4.4 — ไม่ใช่การเปลี่ยน core-loop mechanic ใดๆ เป็นแค่การเขียนกฎการแสดงผลให้ตรงกับทิศทางเดิม): ไม่เพิ่มระดับ z-index ใหม่ (เช่น `toastOnOverlay`) เหนือ `overlay`** เหตุผล:

1. **เหตุผลทางกายภาพ ชี้ขาดกว่า z-index:** "จอพกกระเป๋า" แปลว่ามือถืออยู่ในกระเป๋าจริงตามกติกาข้อ 1–2 ของ gate 4.4 — ผู้เล่นมองไม่เห็นจอเลยไม่ว่า toast จะอยู่ชั้นไหน การยกระดับ toast ขึ้นมาเหนือพื้นทึบจึงไม่เพิ่มการรับรู้จริงแม้แต่น้อย (ต่างจากป้าย GPS หรือ toast บนจอ run ปกติที่จอยังอยู่นอกกระเป๋า)
2. **สอดคล้องกับกฎข้อ 1 ของทิศทาง A (12.1 เดิม):** จอพกกระเป๋าตั้งใจให้มีแค่ตัวเลข HP % และเวลาถึง tick ถัดไปเท่านั้น "ไม่มี animation ต่อเนื่อง" (ประหยัดแบต, จอ OLED) — การเพิ่ม toast ภาพที่ไม่มีใครเห็นขัดกับความตั้งใจให้จอนี้เรียบง่ายที่สุด และยังกิน CPU/แบตโดยไม่มีประโยชน์ (จอถูกวาดซ้อนอยู่ดีแม้มองไม่เห็น)
3. **ช่องทางที่ใช้จริงมีอยู่แล้วครบ ไม่ต้องเพิ่ม UI ใหม่:** เสียง + สั่น (ชั้นฐานเดิม ทำงานได้เพราะหน้าเว็บยัง foreground ตามกติกาข้อ 3 ของ gate 4.4) บวกตัวเลข HP %/tick ของจอพกกระเป๋าเองที่อัปเดตสดทุกครั้งที่โดนตี (server-authoritative, F06-R11) เพียงพอสำหรับ "รู้ว่ามีเหตุ" — ผู้เล่นที่หยิบมือถือขึ้นมาดูจะเห็นตัวเลข HP ที่ลดลงจริงทันที ไม่ต้องมี toast ซ้อน
4. **ไม่กระทบความปลอดภัย:** auto-retreat ทำงานที่ server เสมอไม่ขึ้นกับว่าผู้เล่นเห็นการแจ้งเตือนหรือไม่ (NN-8, ยืนยันซ้ำใน gate 4.6) ความเสี่ยงที่เหลืออยู่ (เครื่อง iOS Safari ที่ไม่มี `navigator.vibrate` และปิดเสียงพร้อมกัน จะไม่มีทางรับรู้ HP ต่ำ 30% ก่อนถูกดึงออกอัตโนมัติที่ 25%) เป็นความเสี่ยงที่ gate 4.6 ยอมรับไว้แล้วก่อนหน้านี้ (ไม่ใช่ความเสี่ยงใหม่ที่คำตัดสินนี้สร้างขึ้น) — คำตัดสินนี้แค่หยุดไม่ให้ผลข้างเคียงของ z-index (toast ที่มองไม่เห็นอยู่แล้ว) บังตาไม่ให้เห็นว่าช่องทางที่ใช้จริงคือเสียง/สั่น/ตัวเลขบนจอพกกระเป๋าเท่านั้น

**ผลต่อ flow:** `design/ux/flows/F06-hp-damage-onboarding.md` หัวข้อ 4.1 (C2) แก้ตามคำตัดสินนี้แล้ว (ระบุช่องทางที่ใช้จริงชัดเจน ไม่ใช่แค่ "ไม่ต้องออกจากจอพกกระเป๋า" แบบเปิดกว้าง)

**Handoff:** gameplay-programmer นำสเกลนี้ไปใส่ CSS จริงใน `apps/client/src/app.css` — ตอนนี้มีแค่ `.banner`(10)/`.toast`(30) ตรงกับสเกลอยู่แล้ว ยังไม่มี z-index บน `#map`/`#hud` เอง (0/1), `.popup-overlay` จริง (ควรเป็น 40 ให้ตรง wireframe), `.drawer` (20, ยังไม่มี component จริง), `.overlay-speedlock`/`.screen.run-summary` (50) และจอ consent/age gate (60) ที่ยังไม่ได้ build · **เพิ่ม (P2-H39, ไม่ blocking):** `ui/tick-toast.ts` (`showHpLow`/`showGranted`/`showDenied`/`showAutoPotionUsed`/`showStateResumed`) mount `.toast` DOM + เล่น vfx `play()` เหมือนกันทุกครั้งไม่ว่าจอพกกระเป๋าจะเปิดอยู่หรือไม่ ตามคำตัดสิน 15.4 ควรข้าม DOM mount และ `play()` (ภาพ) เมื่อ `pocket-screen.ts`'s `overlayRoot` กำลังแสดงอยู่ แต่ยังต้องเรียก `deps.audio.submit(...)` เหมือนเดิมเสมอ (ส่วนเสียง/สั่นยังต้องทำงาน) — ไม่ใช่การแก้บั๊กที่ผู้เล่นเห็น (toast มองไม่เห็นอยู่แล้ว) จึงไม่ blocking แค่ลดงาน CPU/แบตที่เสียเปล่าให้ตรงกับกฎข้อ 1 ของ 12.1

### 15.5 สองระดับใหม่ของ F10 nav shell: `navScreen` (35) และ `nav` (38) (D-160, ปิด finding F-04 ของ `docs/reviews/F10-tech-gate.md`)

**ปัญหาที่พบ (tech gate F10, F-04):** `apps/client/src/app.css:1503–1514` ใช้ตัวเลขดิบ `z-index: 35` บน `.screen.inventory-screen`/`.screen.coming-soon-screen` และ `z-index: 38` บน `.bottombar-f10`/ปุ่ม Setting ลอย (`.setting-button-float`) พร้อมคอมเมนต์ ASSUMPTION ที่ tech-lead ยืนยันลำดับถูกต้องแล้ว แต่ตัวเลขทั้งสองไม่มีอยู่ใน `tokens.json#zIndex` (มีแค่ 0,1,10,20,30,40,50,60,9999) ขัดกับเงื่อนไข D-129 ที่ต้องมี z-index scale เป็น token เสมอ

**คำตัดสิน (uiux-designer, ในฐานะ authority ของสเกลนี้ตาม D-129):** เพิ่ม token สองตัวเข้า `tokens.json#zIndex` คั่นระหว่าง `toast` (30) กับ `popupModal` (40) — **`navScreen` = 35** และ **`nav` = 38** ลำดับเต็มใหม่: `toast (30) < navScreen (35) < nav (38) < popupModal (40)` ไม่เปลี่ยนตัวเลขเดิมที่ tech-lead อนุมัติไว้แล้วใน F-04 (แค่ตั้งชื่อ ไม่ใช่เถียงค่า)

**เหตุผลที่ต้องมีสองระดับ ไม่ใช่ระดับเดียว:**

1. **`navScreen` (35) — จอเต็มจอที่ยังต้องเห็น nav ทับอยู่:** `.screen.inventory-screen`/`.screen.coming-soon-screen` (หัวข้อ 16.3) เป็น `.screen` เหมือนจออื่น (ปกติทุกจอได้ `overlay` 50) แต่สองจอนี้เป็นจอเดียวในแอปที่ bottom nav/ปุ่ม Setting ต้องวาดทับค้างอยู่ตลอด (flow F10-account-shell.md หัวข้อ 8) เพื่อให้สลับแท็บ/เปิด Setting ได้โดยไม่ต้องออกจอก่อน ถ้าใช้ `overlay` (50) เท่าจอทั่วไป จอจะทับ nav ไปด้วย (50 > 38) ขัดกับ flow โดยตรง จึงต้องลดระดับลงมาต่ำกว่า `nav`
2. **`nav` (38) — ต้องทับ `navScreen` เสมอ แต่ยังให้ popup บังได้:** `.bottombar-f10`/`.setting-button-float` ต้องอยู่เหนือสองจอข้างต้นเสมอ (35 < 38) แต่ต้องยังต่ำกว่า `popupModal` (40) เพื่อให้ scrim ของ popup ยืนยัน (เช่น `S-02-dungeon-confirm` ที่เปิดทับจาก `S-01-map`) บังปุ่ม nav ไว้ด้วยเสมอ — กันผู้เล่นกดปุ่มนำทางทะลุ popup ที่กำลังรอการยืนยันอยู่ (เช่น กดเข้า Inventory ขณะ popup "ยืนยันเข้าดันเจี้ยน" เปิดค้าง) ถ้าใช้ระดับเดียวกับ `navScreen` หรือไม่มี tier คั่นระหว่าง `navScreen` กับ `popupModal` เลย จะไม่มีทางให้ nav ทับจอ 35 ได้โดยไม่ขัดกับข้อบังคับข้อ 1
3. **ทำไมไม่ใช้ตัวเลขกลางอื่น (เช่น 36/37):** เลือก 35/38 เพราะ tech-lead อนุมัติค่าดิบนี้ไว้แล้วในโค้ดจริง (F-04) การเปลี่ยนค่าตัวเลขจะเป็นการเถียงงานที่ปิดไปแล้ว ส่วนนี้จึงเป็นแค่การห่อค่าที่อนุมัติแล้วให้เป็น token ที่มีชื่อ ไม่ใช่การออกแบบสเกลใหม่
4. **ไม่กระทบจอ `overlay` (50) อื่น:** ไม่มีจอไหนอื่นในแอปเปลี่ยนค่า — เพราะ `.bottombar-f10`/`.setting-button-float` ถูกซ่อนไม่ mount เลยบนจอ `overlay` ทั้งหมด (onboarding, run, จอพกกระเป๋า, settings, profile, run-summary) ตามหัวข้อ 8 ของ flow F10 ลำดับ 50 vs 38/35 จึงไม่เคยถูกเทียบกันจริงในแอป

**ชื่อ token ที่ gameplay-programmer ต้องใช้ (handoff):** แทน `z-index: 35` ด้วย comment อ้างอิง `zIndex.navScreen` และ `z-index: 38` ด้วย comment อ้างอิง `zIndex.nav` ใน `apps/client/src/app.css` (ลบคอมเมนต์ ASSUMPTION เดิมที่บรรทัด 1492–1502 ทิ้ง แทนด้วยอ้างอิง `tokens.json#zIndex` + `components.md` หัวข้อ 15.5 นี้) — ตัวเลขดิบ 35/38 ไม่เปลี่ยน มีแค่ชื่อ/ที่มาที่เพิ่มเข้ามา

## 16. คอมโพเนนต์ F10 — account shell, สร้างตัวละคร, เรื่องเล่า, bottom nav 5 ช่อง

ที่มา: `design/ux/flows/F10-account-shell.md` (พฤติกรรม), `art/direction/F10-shell-direction.md` (ค่าด้านภาพขั้นต่ำ — ยืนยันเป็นค่าสุดท้ายในหัวข้อนี้ตาม A-P2-F10-T02-4), `art/direction/icon-grammar.md` หัวข้อ 7.1.2/7.4 (glyph) · ตัวอย่างจริง: `wireframes/F10-*.html`

### 16.1 Bottom nav 5 ช่อง (`.bottombar-f10`)

ต่างจาก `.bottombar` เดิมของหัวข้อ 2.2 (ที่โตทีละแท็บตามการปลดระบบ): `.bottombar-f10` มีครบ **5 ช่องคงที่ตั้งแต่แรก** ไม่เปลี่ยนตามการปลด (F10-R32, override เหนือ ia.md หัวข้อ 2/6 สำหรับ Phase 2 — ระบบอื่นยังไม่ปลดแต่ช่องนำทางเห็นครบ)

| ส่วน | ค่า | อ้างอิง |
| --- | --- | --- |
| พื้นแถบ | `bg.surface` ทึบ เส้นบน 2px `ink.900` ไม่มี blur ไม่มีความโปร่งใส ต่อพื้นลงใต้ `env(safe-area-inset-bottom)` ด้วยสีเดียวกัน | art direction 2.2 |
| ความสูงพื้นที่กด | 64 px + `safeArea.bottomInset` (**ค่าสุดท้าย ยืนยัน A-4**) | art direction 2.2, `tokens.json#safeArea` |
| จำนวนช่อง/ลำดับ | 5 ช่องกว้างเท่ากัน ซ้ายไปขวา: Inventory (`icon.ui.bag`) → Upgrade (`icon.ui.enhance`) → Map (`icon.ui.map`, กลาง) → Shop (`icon.ui.market`) → Party (`icon.ui.party`) | F10-R32, D-148 |
| โครงในช่อง (บนลงล่าง) | padding บน 4px → pill 48×32 px มุม 999px (glyph 24px กลาง) → ระยะ 2px → ป้าย 14px/line-height 1.5 → เหลือล่าง ~5px | art direction 2.2 (**ค่าสุดท้าย ยืนยัน A-4**) |
| ช่อง Map | ขนาด/น้ำหนักเท่าช่องอื่นทุกประการ **ไม่ใช่ปุ่มกลมยกลอย** (กันชนภาษาภาพของ class badge และกฎปุ่มเด่นเดียวต่อจอ) | art direction 2.2 |
| ช่องที่ยังไม่ปลด (Upgrade/Shop/Party ใน Phase 2) | หน้าตาเหมือนช่องจริงทุกประการ **ไม่ซีด ไม่มีป้าย "เร็วๆ นี้" ไม่มี badge** กดได้ทันทีไปจอ 16.3 | art direction 2.2 (เหตุผล: ป้าย/สีซีดทำให้ nav ดูยังไม่เสร็จ ขัดกับ D-148 ที่ให้กดได้) |
| สถานะ active | pill เติม `ink.900` ทึบ + glyph กลับเป็น `bg.paper` (`currentColor` ที่ code ส่งให้) + ป้ายตัวหนา `ink.900` — บอกพร้อมกัน 3 ช่องทาง (รูปทรง/สี/น้ำหนักตัวอักษร) ไม่ใช้สีอย่างเดียว (style-guide S4, S10) | icon-grammar 7.4, art direction 2.3 |
| สถานะไม่ active | ไม่มี pill (โปร่งเป็นพื้นแถบ) glyph/ป้าย `ink.900` น้ำหนัก 500 | icon-grammar 7.4 |
| สถานะกดค้าง | pill เติม `ink.100` glyph/ป้าย `ink.900` (ไม่ใช่สถานะที่ค้าง) | art direction 2.3 |
| badge แจ้งเตือน | ไม่มีเด็ดขาดใน Phase 2 (ไม่มีจุดแดง ไม่มีตัวเลข แม้ช่องที่ยังไม่ปลด) | F10-R38 |
| ความยาวป้าย | ≤68 px ที่ 14px ตัวหนา (ช่อง 72px ที่จอ 360 − padding 2×2px) ห้ามตัด "…" ห้ามย่อขนาด ห้ามขึ้นบรรทัดสอง — ยาวเกินให้เปลี่ยนคำ (ของ narrative) | art direction 2.4 |
| การซ่อน/แสดงทั้งแถบ | ดูตารางเต็มที่ `design/ux/flows/F10-account-shell.md` หัวข้อ 8 — สรุป: แสดงเฉพาะ `S-01-map`/`S-11-inventory`/จอเร็วๆ นี้ 3 จอ ไม่แสดงที่อื่นเลย ถูก scrim ของ popup บังเมื่อมี popup เปิด | F10-R33, D-148 |
| โหมดกลางคืน (ถ้าเปิด) | แถบ `bg.night` เส้นบน `ink.300` · glyph ปกติ `bg.paper` ป้าย `ink.100` · active: pill `bg.paper` glyph `ink.900` ป้าย `bg.paper` ตัวหนา | art direction 2.3 |

DOM: `<nav class="bottombar-f10"><a class="nav-tab" data-tab="inventory">...</a>...</nav>` แต่ละ `.nav-tab` คือ touch target เต็มความสูง 64px (≥48×48 ตาม S8) ห้ามมีเส้นคั่นระหว่างช่อง

### 16.2 ปุ่ม Setting มุมบนขวาแบบ plate ลอย (`.setting-button-float`)

แทนที่ settings icon วงกลม 40px เดิมของ `.headerbar` (หัวข้อ 2.1) **เฉพาะบนจอ shell ที่มี bottom nav** (`S-01-map`, `S-11-inventory`, จอเร็วๆ นี้ 3 จอ) — จอที่เหลือทั้งหมด (onboarding, run, จอพกกระเป๋า, settings เอง, profile) ไม่มีปุ่มนี้เลยตาม `flows/F10-account-shell.md` หัวข้อ 8

| ส่วน | ค่า |
| --- | --- |
| รูปทรง | สี่เหลี่ยม 48×48 px มุม 12px (ไม่ใช่วงกลม — วงกลมสงวนให้ avatar/class badge) |
| พื้น | `bg.surface` ทึบ ขอบ `ink.900` 2px เงาทึบเลื่อน 0/4px `ink.900` (กดได้, ตาม `.btn-secondary`/`elevation.pressable`) |
| glyph | `icon.ui.settings` (ใช้ซ้ำ ไม่แก้) 24px `ink.900` อยู่กลางปุ่ม |
| ตำแหน่ง | มุมบนขวา ห่างขอบ 12px + `safeArea.topInset`/`safeArea.rightInset` เป็น plate ของตัวเอง ไม่ใช่ส่วนหนึ่งของ `.headerbar` (ลอยเหนือเนื้อหา, z-index = `zIndex.nav` (38, **แก้ D-160** — เดิมเขียนผิดว่า "เดียวกับ `#hud`" ดูเหตุผลเต็มที่หัวข้อ 15.5) ) |
| กดแล้ว | เงาหายเลื่อนลง 4px (เหมือน `.btn-primary` ที่กด) → เปิด `S-22-settings` |
| ข้อห้าม | ไม่มี badge จุดแดง, ไม่ทับ HUD ของ run/จอพกกระเป๋า (ไม่ปรากฏบนจอเหล่านั้นอยู่แล้วตามหัวข้อ 8 ของ flow) |

**หมายเหตุสำคัญ:** headerbar เดิม (หัวข้อ 2.1) ยังอยู่ครบ (avatar ซ้าย, context label + GPS pill กลาง) มีแค่ตำแหน่งขวาที่เปลี่ยนจาก settings icon วงกลม 40px ฝังในแถบ เป็นปุ่มสี่เหลี่ยม 48px ลอยแยก plate ของตัวเอง **ไม่ใช่การเพิ่มปุ่มที่สอง** (ยืนยัน A-P2-F10-T06-4 ของ flow)

### 16.3 จอ "เร็วๆ นี้" (`.coming-soon-screen`)

ใช้ร่วมกัน 3 ชุด (Upgrade/Shop/Party) ต่างแค่ glyph และ copy key — โครงกึ่งกลางจอ บนลงล่าง:

| # | องค์ประกอบ | ค่า |
| --- | --- | --- |
| 1 | plate glyph หลัก | สี่เหลี่ยม 96×96 px มุม 12px พื้น `bg.surface` ขอบ `ink.900` 2px **ไม่มีเงา** (ไม่ใช่ของกดได้) glyph ของช่องนั้น (`icon.ui.enhance`/`market`/`party`) scale เป็น 48px `stroke-width:1.5` (ไม่ใช่ไฟล์แยก) |
| 2 | plate กรวยกั้น | สี่เหลี่ยม 56×56 px มุม 12px แบบเดียวกัน วางทับมุมขวาล่างของ plate หลัก เยื้องออกนอก 12px ทั้งสองแกน ใน `icon.ui.coming-soon` 32px |
| 3 | หัวข้อ | h1 24px `ink.900` จาก `comingSoon.<system>Title` |
| 4 | เนื้อหา | body 16px `ink.900` 1 บรรทัดจาก `comingSoon.<system>Body` |
| 5 | ปุ่ม | **ไม่มีเลย** (F10-R35) — ทางกลับคือแตะช่อง Map บน `.bottombar-f10` ที่ยังแสดงอยู่ใต้จอนี้เสมอ |

ข้อห้ามเนื้อหา (ตรวจซ้ำที่ visual/design gate): ไม่มีตัวเลข วันที่ เงื่อนไขปลด กลไกระบบ ภาพตัวอย่างของในร้าน/กราฟ % — จอ Party ห้ามมีอะไรอ่านเป็นจำนวนคนแม้ทางอ้อม (ไม่มีหัวคนเพิ่ม ไม่มีจุด ไม่มี silhouette แถว, F06-R56/R57) DOM: `<div class="coming-soon-screen"><div class="cs-plate-main">...<div class="cs-plate-badge">...`

### 16.4 ช่องชื่อตัวละคร + ปุ่มสุ่ม + คำเตือน (`.name-field`, `.shuffle-button`, `.name-warning-banner`)

| ส่วน | ค่า |
| --- | --- |
| ช่องชื่อ | ใช้โครง input เดิม (ขอบ `ink.900` 2px มุม 12px สูง ≥48px ข้อความ 16px) ไม่มีค่าตั้งต้น |
| ปุ่มสุ่ม | สี่เหลี่ยม 48×48 px ข้างช่องชื่อ (ไม่ใช่วงกลม) `icon.ui.shuffle` 24px กลาง — **ห้ามลูกเต๋า ห้ามลูกศรวงกลม** (icon-grammar 7.4) |
| แถวจัดวาง | `display:flex;gap:8px` ช่องชื่อ `flex:1` + ปุ่มสุ่ม คงที่ 48px ข้าง |
| banner คำเตือน | `.banner` แบบ `state.info` เดิม (หัวข้อ 6) + `icon.ui.consent` 24px ซ้ายข้อความ ค้างถาวรใต้ช่อง (ไม่ใช่ toast ที่หายไป) ข้อความ `character.nameRealNameWarning` |
| error inline | ใต้ช่องชื่อ (ใต้ banner) ขอบช่องเปลี่ยนเป็น `state.danger` 2px + ข้อความ `character.nameError.<reason>` สี `state.danger` 14px — ว่างเปล่าเมื่อผ่านหรือยังไม่พิมพ์ (ดูสถานะว่างที่ flow หัวข้อ 10.4) |
| ปุ่มสร้าง | `.btn-primary` เดิม `.btn-disabled` จนกว่าจะเลือก class + ชื่อผ่าน (F10-R21) |
| class ล็อก (migration, C5 ของ flow) | การ์ดที่เคยเลือกมีวงแหวน `accent.signal` ถาวร (เหมือน `.card.selected` แต่ไม่มีทาง deselect) การ์ดอื่นเป็น `.btn-disabled` (กดไม่ได้) + ป้าย `character.classLockedNote` ใต้การ์ดที่เลือก |

### 16.5 Story slide pager (`.story-dots`)

| ส่วน | ค่า |
| --- | --- |
| จุด | เส้นผ่านศูนย์กลาง 10px ระยะห่าง 8px (**ค่าสุดท้าย ยืนยัน A-4**) |
| slide ปัจจุบัน | เติม `ink.900` ทึบ |
| slide อื่น | outline `ink.900` 2px ไม่เติม (แยกด้วยรูปทรง ไม่ใช่สีอย่างเดียว) |
| touch target | ไม่ต้องมี 48px (ไม่ใช่ของกดได้ — จุดบอกตำแหน่งอย่างเดียว ไม่ใช่ปุ่มเปลี่ยน slide) |
| พื้นที่ข้อความใต้ภาพ | **คงที่ 4 บรรทัดทุก slide** (`min-height` คำนวณจาก `type.body.lineHeight` × 4) แม้ slide ที่เนื้อหาสั้นกว่าก็เว้นที่ไว้เท่ากัน กันปุ่ม "ถัดไป"/ลิงก์ข้ามขยับตำแหน่งระหว่างเลื่อน slide |
| slide 4 (บทพูด) | ชื่อผู้พูดเป็นคำนำหน้าตัวหนาในบรรทัดเดียวกับประโยค (ไม่ใช่บรรทัดแยก) เพื่อคง 4 บรรทัดเท่ากัน — ถ้าบรรทัดแรกล้นที่ 360px ให้ย่อเฉพาะชื่อผู้พูดเหลือ 14px ก่อนเสมอ (เนื้อหายังคง 16px) |

### 16.6 ปุ่มผู้ให้บริการ login (recap — สเปกเต็มอยู่หัวข้อ 3.1, เพิ่มส่วนที่ต่างสำหรับ Phase 2 bypass)

Phase 2 **ไม่ใช้** ปุ่มแบรนด์จริงของหัวข้อ 3.1 (นั่นสงวนไว้ Phase 3 ที่มี auth จริง) ใช้ปุ่มของเกมเองแทนตามนโยบาย bypass:

| ส่วน | ค่า |
| --- | --- |
| หน้าตา | `.btn-secondary` เดิม สูง 56px (สูงกว่าปกติของ secondary เพื่อให้เท่าปุ่มหลัก — ข้อยกเว้น SH4: จอ login ไม่มีปุ่ม `accent.signal` เลย) กว้างเต็มคอลัมน์ ทั้งสองปุ่มหน้าตาเหมือนกันทุกอย่าง |
| glyph | `icon.ui.sign-in` เดียวกันทั้งสองปุ่ม ชิดซ้าย (ของเกมเอง ไม่ใช่ของแบรนด์ — ห้ามตัว G, ผลไม้, วงกลม 4 สี) |
| ข้อความ | ชื่อผู้ให้บริการเป็นข้อความปกติฟอนต์ของเกม จาก copy key `account.loginGoogleButton`/`account.loginAppleButton` |
| ระยะห่างระหว่างปุ่ม | 12px แนวตั้ง |
| ไฟล์ | ไม่มีไฟล์ logo ใดใน repo ห้าม `<image>`/URL ชี้ asset แบรนด์ |

### 16.7 แถวออกจากระบบ + popup ยืนยัน (ใช้คอมโพเนนต์เดิม เพิ่มกฎสี)

แถว `settings.logoutLink` ใช้โครง card-list เดิมของ `S-22-settings` (เหมือนแถวอื่น) glyph `icon.ui.logout` 24px **สีข้อความ `ink.900` ปกติ ไม่ใช่ `state.danger`** (logout ไม่ทำลายข้อมูล ต่างจากแถว "ลบข้อมูลในเครื่อง" ที่ยังคง `state.danger` เดิม) popup ยืนยันใช้ `.popup.center-sheet` เดิม (เหมือน popup ลบข้อมูล) ปุ่มคู่น้ำหนักเท่ากัน **ปุ่มยืนยันไม่ใช้ `.btn-danger-confirm`** (ใช้ `.btn-primary` หรือ `.btn-secondary` ก็ได้ที่ไม่ใช่สี danger — เลือก `.btn-primary` เพื่อให้เด่นเป็นทางหลักของ popup นี้เพราะเป็นการกระทำที่ตั้งใจทำ ไม่ใช่อุบัติเหตุที่ต้องเตือนด้วยสีแดง) บรรทัดเพิ่ม `settings.logoutConfirmRunNote` ต่อท้าย body เมื่อมี run ค้างอยู่ (เงื่อนไขเดียวกับ `privacy.withdrawDuringRunNote` ของ F06)

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
