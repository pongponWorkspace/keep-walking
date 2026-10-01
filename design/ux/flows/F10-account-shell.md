# Flow F10 — Account shell, สร้างตัวละคร, เรื่องเล่า 5 slide และ main nav

Task: P2-F10-T06 · เจ้าของ: uiux-designer · สถานะ: ร่าง (รอ P2-F10-T10 อนุมัติ) · วันที่: 2026-10-01
แหล่งอ้างอิง: `design/features/F10-account-shell.md` (R01–R52, ตาราง A1–A12, คำตัดสิน 1–9, edge case A-E1–A-E26) · `art/direction/F10-shell-direction.md` (หัวข้อ 1–11) · `art/direction/icon-grammar.md` หัวข้อ 7.4 · `design/narrative/F10-story.md` · `config/balance/character.json` · `design/pillars.md` หัวข้อ 6.1–6.2 · `design/ux/ia.md`, `design/ux/components.md`, `design/ux/tokens.json` · `design/ux/flows/F06-hp-damage-onboarding.md` (Flow A/B เดิม — ดูหัวข้อ 0 ว่าอะไรถูกแทนที่)
ลำดับอำนาจ: GDD > pillars.md > `design/features/F10-account-shell.md` > เอกสารนี้ > `art/direction/F10-shell-direction.md` (เรื่องพฤติกรรม ตัวเลขภาพขั้นต่ำมาจากที่นั่น ค่าสุดท้ายเป็นของเอกสารนี้/components.md) · ตัวเลขทุกตัวอ้าง `config:` เท่านั้น ถ้อยคำทุกจอเป็น copy key — ค่าจริงเป็นของ narrative-designer (P2-F10-T11) คีย์ในเอกสารนี้เป็นข้อเสนอ เปลี่ยนชื่อได้โดยไม่กระทบโครงสร้าง flow

## สารบัญ
0. เอกสารนี้แทนที่อะไรใน flow F06
1. หลักการอ่าน flow นี้ + state machine อ้างอิง
2. Flow A — เริ่มเกม → login → email login / register / forgot
3. Flow B — ยืนยันอายุ → consent ตำแหน่ง → permission เบราว์เซอร์ (ของเดิมจาก F06)
4. Flow C — สร้างตัวละคร + migration ผู้เล่นเดิม
5. Flow D — เรื่องเล่า 5 slide
6. Flow E — Map หลัก, bottom nav 5 ปุ่ม, จอเร็วๆ นี้
7. Flow F — Setting, ออกจากระบบ, ลบข้อมูลในเครื่อง
8. กฎการแสดง nav และปุ่ม Setting ต่อจอ
9. Reload กลางทาง, ปุ่ม back เบราว์เซอร์, deep link
10. ตารางสถานะที่ต้องมีทุกจอ (offline, error, GPS, ว่าง)
11. รายการ copy key ที่ flow นี้อ้าง
12. สมมติฐานและคำถามค้าง
13. ส่งต่อ

## 0. เอกสารนี้แทนที่อะไรใน flow F06

- **Flow A** (F06 หัวข้อ 2, ข้อ A1–A6): ลำดับ `S-00-intro` → `S-00-age-gate` → `S-00-consent-location` → `S-00-permission-browser` → `S-01-map` → `S-00-class-select` sheet **ถูกแทนที่ทั้งหมด** ด้วยลำดับ 8 ขั้นของ D-149 (หัวข้อ 2–7 ของเอกสารนี้) — ข้อ **A7 เป็นต้นไป** ของ F06 (สถานะหลังเลือกพลัง, `S-02-dungeon-confirm`, เข้า run, รางวัลก้อนแรก) **ยังใช้ได้ทั้งหมดไม่เปลี่ยน** เพียงแต่จุดเริ่มคือหลัง `O-map` (ขั้น 8 ของ F10) แทนที่จะเป็นหลัง `O-class`
- **Flow B** (F06 หัวข้อ 3, ข้อ B1): `S-00-class-select` sheet ทับแผนที่ **ถูกแทนที่** ด้วย `S-00-create-character` หน้าเต็มจอ (หัวข้อ 4 ของเอกสารนี้) — ข้อ **B2–B4** ของ F06 (หน้าอ่าน role เข้าถึงได้เสมอ, ห้ามอธิบายกลไก party, เปลี่ยน class ไม่ได้) **ยังใช้ได้ไม่เปลี่ยน**
- **Flow G** (F06 หัวข้อ 8): G1 (ถอน/ให้ consent) และ G6–G7 (Credits) **ไม่เปลี่ยน** · G3–G5 (ลบข้อมูลในเครื่อง) ขยายผลตาม F10-R44 (ล้าง `kw.p2.account` และชื่อตัวละครด้วย ไม่ใช่แค่ class/HP/inventory) ดูหัวข้อ 7 ของเอกสารนี้ · `S-22-settings` เพิ่มแถวใหม่ "ออกจากระบบ"
- state machine อ้างอิงแทนบรรทัด Onboarding ของ F06 หัวข้อ 4 เดิม ใช้ของสเปกหัวข้อ 4 แทน: `O-start` → `O-login` → `O-age` → (`O-underage` → `O-start`) / `O-consent` → `O-permission` (ข้ามเมื่อปฏิเสธ consent) → `O-character` → `O-story` → `O-map` → ต่อด้วย `O-nearest`/`O-home` → `O-first-run` → `O-done` ของ F06 (ไม่เปลี่ยน)

## 1. หลักการอ่าน flow นี้

- ทุกขั้นเป็นจอเดียว ปุ่มเด่นเดียว ยกเว้นจอ login ที่ปุ่ม Google/Apple น้ำหนักเท่ากัน (F10-R02, R08)
- ความคืบหน้าเก็บใน `kw.p2.*` ทันทีที่ผ่านแต่ละขั้นตามเกณฑ์ของสเปกหัวข้อ 3.1 (F10-R05) — เปิดแอปใหม่กลางทางกลับไปขั้นแรกที่ยังไม่ผ่าน ไม่เริ่มใหม่ทั้งหมด
- ทุกจอ shell (login และจอย่อย, สร้างตัวละคร, เรื่องเล่า, เร็วๆ นี้, จอเริ่มเกม) มีจุดเด่นทางภาพ 1 จุดตาม SH1 ของ art direction — ตำแหน่งเป๊ะระบุไว้ในแต่ละหัวข้อด้านล่าง
- ปุ่มยืนยันของ login/email login/register/forgot **bypass ไปขั้นถัดไปเสมอ** ไม่มี error state ไม่มี loading spinner ค้าง (F10-R10, R11) — ตารางสถานะหัวข้อ 10 จึงไม่มีแถว "error" ของฟอร์มเหล่านี้
- headerbar ระหว่าง onboarding ขั้น 1–7 มีแค่ label กึ่งกลาง **ไม่มี avatar icon/settings icon** (รูปแบบเดียวกับที่ F06 ใช้อยู่แล้วที่ age gate/consent/permission) เพราะ shell ยังไม่พร้อม (F10-R06, R33) · headerbar เต็มรูปแบบ (avatar + label + Setting มุมบนขวา) กลับมาที่ `S-01-map` เป็นต้นไป

ตาราง S-code ต่อขั้น (ใหม่ทั้งหมด ยกเว้นที่มี `*` คือของเดิมจาก F06 ไม่เปลี่ยนเนื้อหา แค่เปลี่ยนตำแหน่งในลำดับรวม):

| ขั้น (`O-`) | S-code | มาจาก |
| --- | --- | --- |
| start | `S-00-start` | ใหม่ (เดิมคือ `S-00-intro` ของ F06 ก่อน D-144, ตอนนี้เหลือปุ่มเดียว) |
| login | `S-00-login`, `S-00-login-email`, `S-00-register`, `S-00-forgot` | ใหม่ |
| age | `S-00-age-gate`* | F06 ข้อ A2 (ไม่เปลี่ยน) |
| underage | `S-00-underage`* | F06 ข้อ A2 (ไม่เปลี่ยน) |
| consent | `S-00-consent-location`* | F06 ข้อ A3 (ไม่เปลี่ยน) |
| permission | `S-00-permission-browser`* | F06 ข้อ A4 (ไม่เปลี่ยน) |
| character | `S-00-create-character` | ใหม่ (แทน `S-00-class-select` sheet ของ F06 B1) |
| story | `S-00-story-1` .. `S-00-story-5` | ใหม่ |
| map | `S-01-map`* | F06 ข้อ A5 (ไม่เปลี่ยน, ตอนนี้มี bottom nav 5 ปุ่ม + Setting มุมบนขวา ดูหัวข้อ 6) |

## 2. Flow A — เริ่มเกม → login → email login / register / forgot (F10-R07–R14, D-144, D-145)

A1. **`S-00-start`** (`O-start`) — จอเดียวเต็มความสูง ไม่มี headerbar (D-144, art direction 5.1): ภาพหลัก (`illus.story.slide-3` ซ้ำ, SH1) ในกรอบการ์ดขอบหมึก → ป้ายชื่อเกม (ข้อความ DOM จาก copy key ไม่ใช่ภาพ, บน plate มุม 12px) → ปุ่มเด่นเดียวเต็มความกว้าง `[onboarding.introStart]` ("เริ่มเกม") · แตะนอกปุ่มไม่ไปต่อ (F10-R07) · ปุ่มกดได้ทันทีไม่รอภาพโหลด (art direction หัวข้อ 9) · กดแล้ว → บันทึกธง intro (เหมือน F06 เดิม) → `S-00-login`

A2. **`S-00-login`** (`O-login`) — headerbar label เดียว `[account.loginHeader]` ("เข้าสู่ระบบ") ไม่มี avatar/settings icon (shell ยังไม่พร้อม, F10-R33) · เนื้อหาเรียงบนลงล่าง: ป้ายชื่อเกมเล็ก (h1 24px, SH1) → ปุ่มผู้ให้บริการ 2 ปุ่มน้ำหนักเท่ากันเรียงแนวตั้ง `[account.loginGoogleButton]` / `[account.loginAppleButton]` (หน้าตาเหมือนกันทุกอย่าง ไม่มีปุ่ม `accent.signal` ในจอนี้ — ข้อยกเว้น SH4 ตาม F10-shell-direction 5.2, R08) → ลิงก์รอง `[account.loginEmailLink]` ("ใช้อีเมลแทน") → บรรทัดกำกับโหมดทดสอบ `[account.testModeNote]` (14px `ink.700`, R-F10-1) · กดปุ่ม Google หรือ Apple → **bypass ไป `S-00-age-gate` ทันที** (F10-R10) เก็บวิธี (`google`/`apple`) ไว้ในหน่วยความจำเท่านั้น ยังไม่เขียนลง storage (ตาราง A ข้อ A2 ของสเปก, F10-R13) · กดลิงก์อีเมล → `S-00-login-email`

A3. **`S-00-login-email`** — headerbar เดียวกัน · ฟอร์ม: ช่องอีเมล (`type=email`, ไม่ validate รูปแบบใดๆ) ช่อง password (`type=password`, `autocomplete=off`, ตัวอักษรซ่อน) → ปุ่มหลัก `[account.emailLoginButton]` ("เข้าสู่ระบบ") → ลิงก์รอง 2 เส้น `[account.registerLink]` ("สมัครใหม่") และ `[account.forgotLink]` ("ลืมรหัสผ่าน") → ลิงก์กลับ `[account.backToLogin]` ("กลับ") ชี้ `S-00-login` หลัก (ปุ่มในจอ ไม่ใช่พึ่ง back เบราว์เซอร์อย่างเดียว) · ปุ่มหลักกดได้แม้ช่องว่าง (F10-R11) กดแล้ว bypass ไป `S-00-age-gate` เหมือน A2 (เก็บวิธี `email`)

A4. **`S-00-register`** — เข้าจากลิงก์ของ A3 · ฟอร์มเหมือน A3 (อีเมล + password) ปุ่มหลัก `[account.registerButton]` ("สมัคร") → bypass เหมือนกัน (วิธี `email`) · ไม่มี copy ใดสัญญาว่ามีอีเมลยืนยันส่งจริงหรือย้ายข้อมูลข้ามเครื่องได้ (F10-R12) · ลิงก์กลับ `S-00-login-email`

A5. **`S-00-forgot`** — เข้าจากลิงก์ของ A3 · ช่องเดียว (อีเมล) ปุ่มหลัก `[account.forgotButton]` ("ส่งคำขอ") → bypass เหมือนกัน (วิธี `email`) · ไม่สัญญาว่ามีอีเมลส่งจริง · ลิงก์กลับ `S-00-login-email`

**ค่าที่พิมพ์ในทุกช่องของ A3–A5 ถูกทิ้งทันทีที่ออกจากจอ** ไม่เขียนลง storage ใด ไม่อยู่ใน telemetry ไม่อยู่ใน URL (F10-R11, acceptance ข้อ 3) — ทางออกจากจอทั้งสามทาง (ไปต่อ/กลับจอ login หลัก/ปิดแอป) ล้างค่าเหมือนกัน

**ไม่มี network request ออกนอก allowlist และไม่มี SDK ของผู้ให้บริการถูกโหลดจากปุ่มใดใน A2–A5** (F10-R12, C2-1) ปุ่ม Google/Apple ไม่เปิด popup ไม่ redirect · กดขณะออฟไลน์ยังไปต่อได้ปกติ (A-E23)

## 3. Flow B — ยืนยันอายุ → consent ตำแหน่ง → permission เบราว์เซอร์ (ของเดิมจาก F06 ไม่เปลี่ยนเนื้อหา)

เนื้อหาเต็มอยู่ที่ `design/ux/flows/F06-hp-damage-onboarding.md` หัวข้อ 2 ข้อ A2–A4 และ `wireframes/F06-01-onboarding-intro-age-consent.html` เฟรม A2–A4 **ใช้ได้ทุกจุดโดยไม่แก้** เอกสารนี้เปลี่ยนแค่ตำแหน่งในลำดับรวมและผลข้างเคียงต่อ storage:

B1. **`S-00-age-gate`** เข้าจาก A2/A3 ของ Flow A ด้านบน (ไม่ใช่จาก `S-00-start` โดยตรงอีกต่อไป) — เนื้อหาเดิมทุกประการ (ปีเกิดจากรายการแสดงเป็น พ.ศ., ปุ่มยืนยัน `.btn-disabled` จนกว่าจะเลือก) **ผลต่างจาก F06 เดิม:** ผ่านเกณฑ์ → เขียน `kw.p2.account` (provider ที่ถืออยู่ในหน่วยความจำจาก Flow A + ธง signed in) **พร้อมกับ** ธงอายุผ่าน (F10-R13, ตาราง A ข้อ A3) → `S-00-consent-location` · ต่ำกว่าเกณฑ์ (หลังกดยืนยัน) → `S-00-underage` เหมือนเดิมทุกประการ **และไม่เขียน account ใดๆ** (F10-R14, ตาราง A ข้อ A4) — เครื่องไม่มี key ใหม่ของ F10 เลยในกรณีนี้ (A-E1)

B2. **`S-00-underage`** เหมือน F06 ทุกประการ ปุ่มเดียวกลับ `S-00-start` (ไม่ใช่ `S-00-login` เพราะต้องเลือก provider ใหม่อีกครั้ง)

B3. **`S-00-consent-location`** เหมือน F06 ทุกประการ — อนุญาต → `S-00-permission-browser` · **ไม่อนุญาต → ข้ามไป `S-00-create-character` ตรง** (F10-R03) ต่างจาก F06 เดิมที่ไปแผนที่ตรง เพราะ D-149 แทรกขั้นสร้างตัวละครและเรื่องเล่าไว้ก่อนแผนที่เสมอไม่ว่าจะรู้ตำแหน่งหรือไม่

B4. **`S-00-permission-browser`** เหมือน F06 ทุกประการ — ทั้งอนุญาตจริงจาก OS และถูกบล็อกไปต่อที่ **`S-00-create-character`** เสมอ (F10-R04) ไม่ใช่ `S-01-map` เหมือน F06 เดิม

## 4. Flow C — สร้างตัวละคร (F10-R15–R24, D-146) + migration ผู้เล่นเดิม (F10-R45–R48)

C1. **`S-00-create-character`** (`O-character`) — หน้าเต็มจอ (ไม่ใช่ sheet ทับแผนที่แบบ F06 เดิม, F10-R15) headerbar label `[character.headerLabel]` ("สร้างตัวละคร") ไม่มี avatar/settings icon · เรียงบนลงล่าง 3 ส่วน:
   1. **เลือก class** — การ์ด 4 ใบ grid 2×2 (`badge.class.<class>-48` + ชื่อ + ผลหนึ่งบรรทัด เหมือน F06 B1 ทุกประการ ไม่มีตัวเลข ไม่มี % ไม่พูดถึง party/debuff) ไม่มีค่าเลือกไว้ล่วงหน้า เลือกแล้วเปลี่ยนใจได้จนกว่าจะกดสร้าง (`.card.selected`)
   2. **ช่องชื่อ** — ช่องพิมพ์ (ไม่มีค่าตั้งต้น) + ปุ่มสุ่ม 48×48 ข้างช่อง (`icon.ui.shuffle`) + คำเตือนถาวรหนึ่งบรรทัดใต้ช่อง `[character.nameRealNameWarning]` ("อย่าใช้ชื่อจริงหรือเบอร์โทร") แบบ `.banner`/`state.info` + `icon.ui.consent` (F10-R17) + พื้นที่ error inline ใต้ช่อง (ว่างเปล่าเมื่อยังไม่พิมพ์หรือผ่านแล้ว)
   3. **ปุ่มเด่น** `[character.createButton]` ("สร้างตัวละคร") — `.btn-disabled` จนกว่าจะเลือก class แล้วและชื่อผ่านตัวกรอง (F10-R21)
   ไม่บังแผนที่ (F10-R15 — ต่างจาก sheet เดิมเพราะขั้นนี้มาก่อนเห็นแผนที่ตาม D-149)

C2. **ตัวกรองชื่อ — 11 เหตุผลตามลำดับ `checkOrder` ของ `config/balance/character.json`** (ละเอียดกว่า 5 กลุ่มของสเปก R18 ซึ่งเป็นภาพรวม กฎการแสดงเหตุผลเดียว ไม่ใช่หลายเหตุผลพร้อมกัน ยังตรง R18/R19 เดิม): `empty` → `email` → `url` → `phone` → `charset` → `misplacedMark` → `stackedMarks` → `noLetter` → `tooShort` → `tooLong` → `banned` — client รันตามลำดับนี้ คืนเหตุผล**แรก**ที่ไม่ผ่าน แสดง inline ใต้ช่องด้วย copy key แยกต่อเหตุผล (ร่าง `[character.nameError.<reason>]`) ไม่ใช้ popup (F10-R19) ไม่บอกคำต้องห้ามที่จับได้ (F10-R19) แก้ไขแล้วผ่าน → ข้อความ error หายทันที ไม่มีโทษจากจำนวนครั้งที่พิมพ์ไม่ผ่าน

C3. **ปุ่มสุ่มชื่อ** — เติมชื่อจาก `randomCharacterName` ลงในช่องทันที (ไม่เปิด popup เลือก) กดซ้ำได้ไม่จำกัด ชื่อที่ได้ผ่านตัวกรองเสมอ (F10-R20) แก้ต่อจากชื่อที่สุ่มได้นับเป็นชื่อพิมพ์เอง (ตัวกรองทำงานปกติทันทีที่แก้)

C4. **กดสร้าง** → บันทึก class + ชื่อ (normalize แล้ว: NFC, ตัด zero-width, ยุบช่องว่างซ้ำ, ตัดหัวท้าย) พร้อมกันครั้งเดียว → `S-00-story-1` ไม่มี popup ยืนยันซ้อน (F10-R21, R22)

### 4.1 Migration ผู้เล่นเดิม (F10-R45–R48, คำตัดสิน ค)

C5. ผู้เล่นที่มีธง onboarding ของ F06 ผ่านแล้วแต่ไม่มี `kw.p2.account`/ชื่อตัวละคร: เข้า `S-00-login` ก่อนเสมอ (ไม่ข้าม login) → ผ่านอายุ/consent ที่เคยผ่านแล้วไม่ถามซ้ำ (F10-R46) → ถ้ามี class อยู่แล้ว `S-00-create-character` แสดง **class เป็นค่าที่ล็อก เห็นได้แต่แตะเปลี่ยนไม่ได้** (การ์ดที่เลือกไว้มีวงแหวน `accent.signal` ถาวร การ์ดอื่นเป็น `.btn-disabled` ไม่ต้องกดได้ — ป้ายกำกับ `[character.classLockedNote]` "เลือกไว้แล้ว เปลี่ยนไม่ได้") มีแค่ช่องชื่อให้กรอกใหม่ตาม C2–C3 ปุ่มสร้างกดได้เมื่อชื่อผ่าน (F10-R47) → เรื่องเล่า → แผนที่ · ผู้เล่นเดิมที่ยังไม่เคยเลือก class ใช้จอปกติของ C1 ทั้งหมด (F10-R47 ท้าย)

C6. run ค้างของผู้เล่นเดิมเล่นต่อได้ตาม F04 ก่อนเสมอ ขั้น migration เริ่มหลัง run จบและสรุป run ปิด ความคืบหน้า onboarding ของ F06 (`first_run_entered`, `first_reward`) ไม่รีเซ็ต (F10-R48)

## 5. Flow D — เรื่องเล่า 5 slide (F10-R25–R30, D-147, narrative T03)

D1. **`S-00-story-<n>`** (n = 1–5) headerbar เหมือนขั้นก่อนหน้า ไม่มี avatar/settings icon · เนื้อหาเรียงบนลงล่าง (art direction 8.6): ภาพ 4:3 (`illus.story.slide-<n>`, กรอบขอบหมึก 2px มุม 12px) → ตัวบอก slide (จุด 5 จุด เส้นผ่านศูนย์กลาง 10px, slide ปัจจุบันเติม `ink.900` ที่เหลือ outline) → หัว (`story.slide<n>.title`) + เนื้อหา (`story.slide<n>.body`, พื้นที่ข้อความคงที่ 4 บรรทัดทุก slide แม้ slide 1/2/3/5 ใช้จริงแค่ 2 บรรทัด — กันปุ่มกระโดดตำแหน่งตาม narrative T03 หัวข้อ 5) → ปุ่มเด่น (`story.next` slide 1–4 / `story.start` slide 5) → ลิงก์ข้าม (`story.skip`, เฉพาะ slide 1–4, F10-R27)

D2. **slide 4 เป็นเสียงระบบ** (`voice: system`, คีย์เดียว `story.slide4.bodySystem`, 4 บรรทัด ไม่มีป้ายชื่อผู้พูด, D-156 ACCEPTED: เสียงระบบ ไม่มีคำหยาบ) — เลิกใช้บทพูดตัวละครพร้อมชื่อผู้พูดกำกับที่เคยออกแบบไว้ ยืนยันตาม narrative T03 หัวข้อ 5: เนื้อหา 4 บรรทัดพอดีที่ 360px เหมือน slide อื่น **ห้ามแก้ถ้อยคำ** (narrative เป็นเจ้าของ)

D3. **ปุ่ม "ถัดไป"** (slide 1–4) → slide ถัดไป (เปลี่ยน state ในหน่วยความจำ ยังไม่บันทึกถาวรจนถึง D5) · **ปุ่ม "ออกไปลุย!"** (slide 5) → บันทึกธง "เรื่องผ่านแล้ว" → `S-01-map` (shell พร้อม, F10-R25)

D4. **ลิงก์ "ข้าม"** (slide 1–4) → บันทึกธง "เรื่องผ่านแล้ว" ทันที → `S-01-map` ตรง (จบหรือข้ามนับว่าผ่านขั้น 7 เท่ากัน, F10-R27)

D5. **ย้อน slide** ด้วยปุ่ม back เบราว์เซอร์หรือปัดกลับ ย้อนไป slide ก่อนหน้าได้ (ไม่ข้ามผ่าน URL โดยตรง, A-E18) จาก slide 1 ย้อนกลับจอสร้างตัวละครไม่ได้ (ตัวละครสร้างแล้ว, F10-R28)

D6. **reload กลางเรื่อง** → กลับ slide 1 เสมอ (F10-R30, A-E6) ตัวละครที่สร้างไปแล้วยังอยู่ครบ · เรื่องแสดงครั้งเดียวในชีวิตข้อมูลเครื่อง ไม่มีทางเปิดซ้ำจากตั้งค่าใน Phase 2

D7. **การโหลดภาพ** (art direction หัวข้อ 9): โหลด slide 1 เมื่อเข้าจอเล่าเรื่อง prefetch slide ถัดไปทีละภาพ ถ้าภาพยังไม่มาใน ~1 วินาที แสดงกรอบเปล่า `bg.paper` ขนาดเท่าภาพ (ไม่มี spinner ไม่มี shimmer) ปุ่ม "ถัดไป"/"ออกไปลุย!" กดได้เสมอไม่รอภาพ

## 6. Flow E — Map หลัก, bottom nav 5 ปุ่ม, จอเร็วๆ นี้ (F10-R31–R38, D-148)

E1. **`S-01-map`** (`O-map`) — เปิดแอปเมื่อ shell พร้อม (ผ่านขั้น 1–7) และไม่มี run ค้าง → แผนที่เสมอ (มี run ค้าง → จอ run ก่อน ไม่ผ่านหน้านี้, F10-R31, A12) · headerbar เต็มรูปแบบกลับมา (avatar icon ซ้าย → `S-10-profile`, context label กลาง `nav.map`) **แทนที่ settings icon เดิมในหัวมุมขวาด้วยปุ่ม Setting แยกก้อนที่ลอยเหนือแผนที่** ดู E5 · **bottom nav ปรากฏครั้งแรกที่นี่** · สถานะที่บ้านทุกแบบ (ใกล้/ไกล/นอกพื้นที่/ไม่รู้ตำแหน่ง) ตาม F06 หัวข้อ 7 เดิมไม่เปลี่ยน

E2. **bottom nav 5 ช่อง** (`.bottombar-f10` ใหม่ต่างจาก `.bottombar` เดิมของ F06 ที่โตทีละแท็บ — สเปกคอมโพเนนต์เต็มอยู่ที่ `components.md` หัวข้อ 16.1) เรียงซ้ายไปขวาเสมอ **คงที่ 5 ช่องตั้งแต่แรก ไม่เปลี่ยนตามการปลด**: Inventory (`nav.inventory`, `icon.ui.bag`) → Upgrade (`nav.upgrade`, `icon.ui.enhance`) → **Map กลาง** (`nav.map`, `icon.ui.map`, active ตั้งต้น) → Shop (`nav.shop`, `icon.ui.market`) → Party (`nav.party`, `icon.ui.party`) — ทุกช่องกดได้ทันที ไม่มีช่องใดซีดหรือมีป้าย "เร็วๆ นี้" บน nav เอง (art direction 2.2) · ช่อง Map ไม่ใช่ปุ่มกลมยกลอย ขนาดและน้ำหนักเท่าช่องอื่น (art direction 2.2)

E3. **กด Inventory** → `S-11-inventory` เดิมไม่เปลี่ยนเนื้อหา (F10-R34) · **กด Map** ขณะอยู่ที่ Map ไม่มีผล (already active) · **กด Upgrade/Shop/Party** → จอ "เร็วๆ นี้" คนละจอ (E4)

E4. **`S-27-coming-soon-upgrade` / `S-28-coming-soon-shop` / `S-29-coming-soon-party`** — จอเดียวกันสามชุดต่างแค่ glyph/ข้อความ กึ่งกลางจอ: plate glyph 96×96 (glyph ของช่องนั้น scale เป็น 48px) + กรวยกั้นเล็ก 56×56 มุมขวาล่าง (`icon.ui.coming-soon`) → หัวข้อ h1 24px (`comingSoon.<system>Title`) → เนื้อหา 1 บรรทัด 16px (`comingSoon.<system>Body`) → **ไม่มีปุ่มอื่นใดบนจอนี้** (F10-R35, หัวจอ+ข้อความ+nav เท่านั้น) ทางกลับคือกด Map บน nav → bottom nav ยังอยู่ด้านล่างเสมอ · ไม่มีตัวเลข เงื่อนไขปลด หรือวันที่สัญญาในจอนี้ (F10-R36) — จอ Party ห้ามมีอะไรอ่านเป็นจำนวนคนแม้ทางอ้อม (ไม่มีหัวคนเพิ่ม ไม่มีจุด ไม่มี silhouette แถว, F06-R56/R57)

E5. **ปุ่ม Setting มุมบนขวา** (`icon.ui.settings` 24px ในปุ่มสี่เหลี่ยม 48×48 มุม 12px, plate ทึบของตัวเอง) แยกจาก header bar เดิม — อยู่ทุกจอ shell (`S-01-map`, `S-11-inventory`, จอเร็วๆ นี้ 3 จอ) **ไม่วางบนจอ run และจอพกกระเป๋า** (F10-R37, ทางเข้าตั้งค่าระหว่าง run มีอยู่แล้วตาม F06 คงเดิม) กดแล้ว → `S-22-settings`

E6. **ไม่มี badge หรือตัวเลขแจ้งเตือนบน nav หรือปุ่ม Setting** ใน Phase 2 (F10-R38, ไม่มีอะไรใหม่ให้เชียร์ ห้ามชวนเข้าจอเร็วๆ นี้)

## 7. Flow F — Setting, ออกจากระบบ, ลบข้อมูลในเครื่อง (F10-R39–R44, คำตัดสิน ก/ข/จ)

F1. **`S-22-settings`** — 4 แถวเดิมของ F06 (การเดินและความปลอดภัย, เครดิตและลิขสิทธิ์, ลบข้อมูลในเครื่อง, ความเป็นส่วนตัว) ไม่เปลี่ยนพฤติกรรม **+ แถวใหม่ที่ 5 `[settings.logoutLink]`** ("ออกจากระบบ") วางท้ายรายการ glyph `icon.ui.logout` (ไม่ใช่ `icon.ui.exit` — เหตุผลเต็มอยู่ใน art direction หัวข้อ 3.2: `exit` แปลว่าออกจาก run เอง ใช้ร่วมกันจะแยกไม่ออกว่ากดแล้วจบ run หรือออกจากบัญชี) สีข้อความ `ink.900` ปกติ **ไม่ใช้สี `state.danger`** เพราะไม่ทำลายข้อมูล (F10-R40)

F2. **กด "ออกจากระบบ"** → popup ยืนยันชั้นเดียว หัว `[settings.logoutConfirmTitle]` เนื้อหา `[settings.logoutConfirmBody]` ("ตัวละครและของในเครื่องยังอยู่") · **ถ้ามี run อยู่ (Active/Grace/Suspended) เติมบรรทัดเพิ่ม** `[settings.logoutConfirmRunNote]` ("run ที่เล่นอยู่จะจบทันที ของที่เก็บมาอยู่ครบ" — รูปแบบเดียวกับ `privacy.withdrawDuringRunNote` ของ F06 G1) ปุ่มคู่น้ำหนักเท่ากัน: ยืนยัน `[settings.logoutConfirmButton]` (ไม่ใช้ `.btn-danger-confirm` เพราะไม่ทำลายข้อมูล, F10-R40) / ยกเลิก `[settings.logoutCancelButton]`

F3. **ผลของยืนยัน:**
   - ไม่มี run: ธง signed in → false ทันที → `S-00-login` (F10-R41, ตาราง A ข้อ A9) **ไม่ลบ** class/ชื่อ/HP/inventory/สรุป run/consent ตำแหน่ง/ธงอายุ/ธงเรื่องผ่าน/ตั้งค่า auto-retreat
   - มี run: run จบทันทีด้วย `manual_exit` ทางเดียว ของในถุง run เก็บครบ หยุดขอตำแหน่งทันที **ไม่ผ่าน Grace/Suspended/`timeout`** (F10-R42, คำตัดสิน ก) → หน้าสรุป run ปกติ → `S-00-login`

F4. **login ใหม่หลังออกจากระบบ** (`S-00-login` หรือจอย่อยอีเมล) — ทุกปุ่มยืนยันเขียน account ใหม่ทันที (provider เลือกต่างจากเดิมได้) → **ไปแผนที่ตรง** ข้ามอายุ/consent/สร้างตัวละคร/เรื่องเล่าทั้งหมดที่ผ่านแล้ว (F10-R43, ตาราง A ข้อ A10, คำตัดสิน ข) ตัวละครเดิมตัวเดียวกัน (Phase 2 มีโปรไฟล์เดียวต่อเครื่อง)

F5. **ปุ่ม "ลบข้อมูลในเครื่อง"** (แถวเดิมของ F06 G3–G5, พฤติกรรม popup ยืนยันชั้นเดียวไม่เปลี่ยน) — **ผลขยายตาม F10-R44**: ล้างทุก key `kw.p2.*` **รวม `kw.p2.account` และชื่อตัวละครด้วย** (ของเดิม G4 ของ F06 ล้างแค่ class/HP/inventory/onboarding/สรุป run/ความสนใจ/consent) → กลับ `S-00-start` (ขั้น 1) เริ่ม **8 ขั้นใหม่ทั้งหมด** ของ F10 ไม่ใช่แค่ onboarding เดิมของ F06 · auto-retreat กลับเป็นเปิด (F06-R22) · ใช้ไม่ได้ระหว่างมี run เหมือนเดิม (`.btn-disabled` + คำอธิบายใต้แถว, F06 G5) — **ต่างจากออกจากระบบชัดเจน** (คำตัดสิน จ): ออกจากระบบ = ปลดธง signed in อย่างเดียว ทำได้ระหว่าง run · ลบข้อมูล = ล้างทุกอย่างรวม account ทำไม่ได้ระหว่าง run

## 8. กฎการแสดง nav และปุ่ม Setting ต่อจอ (F10-R33, R37, D-148, art direction หัวข้อ 2.5/3.1)

หลักเดียว: bottom nav 5 ช่องและปุ่ม Setting มุมบนขวาปรากฏพร้อมกันเสมอเป็นคู่เดียวกัน ไม่แยกจอ (ยกเว้นตอนถูก scrim ของ popup บัง) — รายการด้านล่างคือรายการปิดของ R33 ถ้าจอใดไม่อยู่ในคอลัมน์ "แสดง" แปลว่าไม่แสดงเด็ดขาด

| กลุ่มจอ | S-code | nav 5 ช่อง | ปุ่ม Setting | เหตุผล |
| --- | --- | --- | --- | --- |
| onboarding ขั้น 1–7 ทั้งหมด | `S-00-start` .. `S-00-story-5` | ไม่แสดง | ไม่แสดง | R06: shell ยังไม่พร้อมก่อนผ่านขั้น 7 · headerbar มีแค่ label (หัวข้อ 1) |
| แผนที่ทุกสถานะที่บ้าน | `S-01-map` | แสดง, active = Map | แสดง | R31–R33, R37 — จอหลักที่ nav เกิดครั้งแรก |
| กระเป๋าของ | `S-11-inventory` | แสดง, active = Inventory | แสดง | R34 |
| เร็วๆ นี้ | `S-27/28/29-coming-soon-*` | แสดง, active = ช่องนั้น | แสดง | R35 — เป็น "จอของ shell" ไม่ใช่จอ error |
| popup confirm เข้า dungeon | `S-02-dungeon-confirm` | ถูก scrim ปิดทับ (มองเห็นจางอยู่หลัง `rgba(ink.900,.45)` แต่กดไม่ได้) | ถูก scrim ปิดทับเช่นกัน | R33 ระบุชัด + art direction 2.5 (`.popup-overlay` เป็น `inset:0` คลุมทั้ง header) · ปิด popup แล้วกลับมาเป็นปกติทันที |
| popup ยืนยัน logout / ลบข้อมูลในเครื่อง / ยืนยันเข้า overlap/raid | `.popup-overlay` ใดๆ | ถูก scrim ปิดทับเหมือนกัน | ถูก scrim ปิดทับเหมือนกัน | กลไกเดียวกับแถวบน — sheet/popup ทุกชนิดไม่แยกกรณี |
| จอ run ทุกสถานะ (Active/Grace/Suspended) | `S-03-run` | ไม่แสดง | ไม่แสดง (ทางเข้าตั้งค่าอยู่ในแถบ run เอง ตาม F06 เดิม) | R33, R37 |
| จอพกกระเป๋า | `.pocket-screen` | ไม่แสดง | ไม่แสดง | R33, R37 |
| สรุปผล run | `S-04-run-summary` | ไม่แสดง | ไม่แสดง | R33 (อยู่ในรายการห้ามชัดเจน) — ปุ่มเดียวของจอนี้คือ `run.summaryContinue` กลับแผนที่ ซึ่งจะพา nav กลับมาเองที่ปลายทาง |
| ตั้งค่าและหน้าย่อยทั้งหมด (`S-22-settings`, หน้าย่อยการเดินและความปลอดภัย, `S-23-privacy`, Credits) | `S-22-*`, `S-23-privacy` | ไม่แสดง | ไม่แสดง (อยู่ในจอนี้แล้ว ไม่ต้องมีทางลัดไปตัวเอง) | R37 อ่านตรงตัว: ปุ่ม Setting อยู่ "บนจอ shell เดียวกับที่มี nav" — `S-22`/`S-23` ไม่อยู่ในรายการนั้น ทางกลับคือปุ่ม "กลับ"/back ของเบราว์เซอร์ในจอเอง |
| โปรไฟล์ | `S-10-profile` | ไม่แสดง | ไม่แสดง | เหตุผลเดียวกับแถวบน (ไม่อยู่ในรายการ R33/R37) |

ข้อควรระวังสำหรับ build: nav และ Setting เป็น sibling ที่ห่อด้วย container เดียวกันใน `#hud` (ดู `components.md` หัวข้อ 15) ควร toggle ทั้งคู่จาก flag เดียว (`shellChromeVisible`) ที่คำนวณจากรายการจอด้านบน ไม่ใช่ toggle แยกกันสองจุด เพื่อกันเคสหลุด (nav โผล่แต่ Setting หาย หรือกลับกัน) ซึ่งไม่เคยถูกต้องตาม R33/R37 เลยสักจอ

## 9. Reload กลางทาง, ปุ่ม back เบราว์เซอร์, deep link (F10-R05, R06, A-E1–A-E19, route ตาม A-P2-F10-T01-2)

ค่าความจริงเดียว (single source of truth) ที่ใช้คำนวณ "ขั้นแรกที่ยังไม่ผ่าน" ในทั้งหัวข้อนี้: ธง `kw.p2.*` ที่เขียนจริงแล้ว ไม่ใช่ URL/route ปัจจุบัน (R05) — route เป็นแค่ตัวสะท้อนผล ไม่ใช่แหล่งความจริง

### 9.1 Reload (ปิดแอป, ปิดแท็บ, OS kill, refresh เบราว์เซอร์)

| จอตอน reload | ปลายทางที่เปิดใหม่ | อ้างอิง |
| --- | --- | --- |
| `S-00-start` (ยังไม่กดเริ่มเกม) | `S-00-start` | ธง intro ยังไม่เขียน |
| `S-00-login`/`-login-email`/`-register`/`-forgot` (ยังไม่กดปุ่มยืนยัน) | `S-00-login` หลัก (ไม่ใช่จอย่อยที่ค้างอยู่) | ธง intro ผ่านแล้วแต่ provider ยังไม่ถูกเขียน (A-E2) · ค่าที่พิมพ์ในฟอร์มหายเสมอ |
| หลังกดปุ่มยืนยันของ login แต่ยังไม่ผ่าน age gate | `S-00-login` (ไม่ใช่ age gate ค้างไว้) | provider อยู่ในหน่วยความจำเท่านั้น หายเมื่อ reload (A-E3, คำตัดสิน ง) ต้องกดปุ่มยืนยันใหม่ 1 ครั้ง |
| `S-00-age-gate` | `S-00-age-gate` (ปีเกิดที่เลือกไว้ไม่ถูกจำ, F06-R45) | account ยังไม่เขียนจนผ่านอายุ |
| `S-00-consent-location` / `S-00-permission-browser` | ขั้นเดิมนั้น | A-E4 — account เขียนแล้วตั้งแต่ผ่านอายุ ไม่ต้อง login ซ้ำ |
| `S-00-create-character` (ก่อนกดสร้าง) | `S-00-create-character` ว่างใหม่ (class/ชื่อที่พิมพ์ค้างหาย) | A-E5, F10-R21 — บันทึกเฉพาะตอนกดสร้างสำเร็จเท่านั้น |
| `S-00-story-<n>` (n ใดก็ได้) | `S-00-story-1` เสมอ | F10-R30, A-E6 — เรื่องเริ่มใหม่จาก slide 1 ทุกครั้ง ตัวละครที่สร้างไปแล้วไม่หาย |
| `S-01-map`, `S-11-inventory`, จอเร็วๆ นี้, `S-22-settings`/หน้าย่อย, `S-10-profile` | `S-01-map` (ตามสถานะที่บ้านจริง ณ ตอนนั้น) | A-E7 — shell พร้อมแล้ว ไม่มี run ค้าง |
| จอ run ทุกสถานะ / จอพกกระเป๋า / สรุป run | จอ run ต่อ (ตาม F04) ก่อนกลับ `S-01-map` | F10-R31, A12 — run ค้างชนะทุกกรณี ไม่ว่า onboarding จะค้างอยู่ตรงไหนก็ตาม (ผู้เล่นเดิมกรณี migration ก็เช่นกัน, R48) |

### 9.2 ปุ่ม back ของเบราว์เซอร์ / ปัดกลับ (A-E19)

| อยู่ที่จอ | กด back แล้วไปไหน |
| --- | --- |
| `S-00-login-email` / `S-00-register` / `S-00-forgot` | กลับ `S-00-login` หลัก (เหมือนกดลิงก์ "กลับ" ในจอ, A3) |
| `S-00-age-gate`, `S-00-consent-location`, `S-00-permission-browser` | ไม่ย้อน — จอเดิมแสดงซ้ำ (ขั้นที่ "เขียนแล้ว" ย้อนไม่ได้ตาม R05 เพราะจะขัดกับ "ไม่เริ่มใหม่ทั้งหมด") |
| `S-00-create-character` | ไม่ย้อนกลับ login (ตัวละครยังไม่สร้าง แต่ถือว่าผ่านขั้น login/age/consent/permission แล้วอย่างถาวร) |
| `S-00-story-<n>`, n > 1 | ย้อนไป `S-00-story-<n-1>` (F10-R28) |
| `S-00-story-1` | ไม่ย้อนกลับจอสร้างตัวละคร (F10-R28 ชัดเจน) — back ที่ slide 1 ไม่มีผล หรือออกจากแอป ตามพฤติกรรมเบราว์เซอร์ปกติ |
| `S-01-map` และจอ shell อื่นหลัง onboarding จบ | เดินตาม browser history ปกติของ SPA (ไม่ใช่ขอบเขตพิเศษของ F10) |

### 9.3 Deep link ก่อนจบ onboarding (route ตาม A-P2-F10-T01-2, F10-R06)

ทุก route ของ F10 (`#/login`, `#/login/email`, `#/register`, `#/forgot`, `#/create-character`, `#/story/<n>`, `#/upgrade`, `#/shop`, `#/party`) และ route เดิม (`#/inventory`, `#/settings*`) ผ่าน guard เดียว: **shell พร้อมหรือยัง** (ผ่านขั้น 1–7 แล้ว)

| deep link | shell ยังไม่พร้อม | shell พร้อมแล้ว |
| --- | --- | --- |
| `#/upgrade`, `#/shop`, `#/party`, `#/inventory`, `#/settings*` | redirect ไปขั้นแรกที่ยังไม่ผ่าน (A-E16) | เปิดจอนั้นตามปกติ |
| `#/login`, `#/login/email`, `#/register`, `#/forgot` | เปิดตามลำดับจริงถ้ายังไม่ผ่าน login · ถ้าผ่านไปแล้ว (มี account + `SignedIn`) → แผนที่ (A-E17) | `#/login` เมื่อ `SignedOut` (หลัง logout) → เปิดจอ login ได้จริง (ทางเข้าที่ตั้งใจ) · จอย่อยอีเมลไม่มีความหมายอีก (มี account แล้ว) → แผนที่เช่นกัน |
| `#/create-character` | เปิดได้เมื่อผ่านขั้น 1–5 แล้วเท่านั้น มิฉะนั้น redirect ไปขั้นที่ยังไม่ผ่าน | ตัวละครสร้างแล้ว → แผนที่ (A-E17, กันเปิดจอสร้างซ้ำ) |
| `#/story/<n>` (n = 1–5) | เปิดได้เมื่อผ่านขั้น 6 (สร้างตัวละครแล้ว) เท่านั้น **และเปิดเป็น slide 1 เสมอไม่ว่า n จะเป็นเท่าไร** (A-E18 — กันกระโดดข้าม slide ด้วย URL ตรงๆ) | เรื่องผ่านแล้ว → แผนที่ (A-E17) |

หมายเหตุสำหรับ gameplay-programmer: guard นี้เป็นชั้นเดียวกับที่ F06/F04 ใช้อยู่แล้วสำหรับ `#/inventory`/`#/settings*` (ไม่ใช่กลไกใหม่) F10 แค่ขยายรายการ route ที่ guard ครอบคลุม ไม่ต้องเขียน guard คนละระบบ

## 10. ตารางสถานะที่ต้องมีทุกจอ (offline, error, GPS, ว่าง) + แอปถูกย่อ/ปิด

หลักตั้งต้น: จอ 1–7 ของ F10 (login .. เรื่องเล่า) **ไม่เรียก network และไม่เรียก GPS เลยสักครั้ง** (F10-R12, หัวข้อ 2 ข้อ 1–2 ของสเปก) ตารางนี้จึงสั้นกว่าของ F06/F04 มากโดยตั้งใจ — ไม่ใช่ช่องว่างที่ลืมเติม

### 10.1 Offline (ตัดเน็ตหรือ airplane mode)

| กลุ่มจอ | พฤติกรรม |
| --- | --- |
| `S-00-start` .. `S-00-story-5` (onboarding ทั้ง 7 ขั้น) | ทำงานได้ 100% เหมือนออนไลน์ทุกประการ ไม่มี request ใดในจอเหล่านี้อยู่แล้ว (A-E23) — ปุ่ม Google/Apple ที่กดขณะออฟไลน์ยัง bypass ไปต่อได้ปกติ |
| `S-01-map`, `S-11-inventory`, จอเร็วๆ นี้ | ใช้สถานะ offline เดิมของ F06/F04 (tile แผนที่/GPS fix เป็นคนละเรื่องกับ F10) ไม่มีพฤติกรรมใหม่จาก F10 |
| ภาพ slide เรื่องเล่า / ภาพจอเริ่มเกม | ถ้าภาพยังไม่ถูก cache และออฟไลน์พอดีตอนเข้าเรื่องเล่า → กรอบเปล่า `bg.paper` ตาม D7/art direction หัวข้อ 9 (เหมือนกรณีโหลดช้า ไม่แยกเป็น error คนละแบบ) ปุ่ม "ถัดไป"/"ออกไปลุย!" ยังกดได้เสมอ |

### 10.2 Error

**ไม่มี error state ใดในจอ login/email login/register/forgot/สร้างตัวละคร (ฟอร์ม)** ตาม F10-R10, R11 — ปุ่มยืนยันทุกปุ่ม bypass เสมอไม่ว่าอินพุตจะเป็นอย่างไร (หัวข้อ 1 ยืนยันซ้ำ) สิ่งเดียวที่ใกล้เคียง "error" คือข้อความ inline ใต้ช่องชื่อตัวละครตอนไม่ผ่านตัวกรอง (C2) ซึ่งเป็นการ validate ไม่ใช่ error ของระบบ (ไม่มี retry, ไม่มี toast, ไม่มีรหัส error ใดโชว์ผู้เล่น)

### 10.3 GPS/ตำแหน่ง

ไม่เกี่ยวกับจอ 1–7 เลยสักจอ (ไม่มีการอ่านพิกัดใดๆ ก่อนถึงแผนที่) ผลของ consent/permission ที่ปฏิเสธ/ถูกบล็อกคือ "สถานะไม่รู้ตำแหน่ง" ซึ่งเป็นเรื่องของ F06 หัวข้อ 7 เดิมทั้งหมด (F10-R03, R04 แค่ยืนยันว่า onboarding ไม่ติดค้างเพราะเรื่องนี้ ไม่ได้เพิ่มสถานะ GPS ใหม่)

### 10.4 ว่างเปล่า (empty state)

| จุด | พฤติกรรม |
| --- | --- |
| ช่องอีเมล/password ว่าง (A3–A5) | ปุ่มยืนยันกดได้ปกติ ไม่มีข้อความเตือน (F10-R11) |
| ช่องชื่อตัวละครว่าง (ยังไม่พิมพ์/ยังไม่สุ่ม) | ปุ่ม "สร้างตัวละคร" เป็น `.btn-disabled` **ไม่มีข้อความ error ใต้ช่อง** (empty เป็นสถานะตั้งต้น ไม่ใช่การพิมพ์ผิด — ต่างจากพิมพ์แล้วไม่ผ่านซึ่งมีข้อความ, ตาราง edge case A-E8 ของสเปก) |
| ยังไม่เลือก class | ปุ่ม "สร้างตัวละคร" เป็น `.btn-disabled` เหมือนกัน ไม่มีการ์ดใดถูกเลือกไว้ล่วงหน้า (C1) |
| เรื่องเล่า ภาพยังไม่โหลด | กรอบเปล่า `bg.paper` ขนาดเท่าภาพ (D7, ดูหัวข้อ 10.1) |

### 10.5 แอปถูกย่อ/สลับแอป (background แต่ไม่ reload — ต่างจาก reload ของหัวข้อ 9.1)

สลับแอปไปมาโดยไม่ถูก OS kill ไม่นับเป็น reload (state ในหน่วยความจำของหน้านั้นยังอยู่ทั้งหมด):
- ฟอร์ม login/email/register/forgot ที่พิมพ์ค้างไว้: ค่ายังอยู่เมื่อกลับมา (เพิ่งถูกทิ้งตอน **ออกจากจอ** จริง ไม่ใช่ตอนสลับแอป, R11) — ต้องแยกให้ชัดใน build: `beforeunload`/component teardown ล้างค่า ไม่ใช่ `visibilitychange`
- `S-00-create-character`: class/ชื่อที่เลือก/พิมพ์ค้างไว้ยังอยู่ (ยังไม่บันทึกถาวรจนกดสร้าง แต่ในหน่วยความจำไม่หาย)
- `S-00-story-<n>`: กลับมาที่ slide เดิมที่ค้างไว้ (ไม่รีเซ็ตกลับ slide 1 — รีเซ็ตเฉพาะตอน reload จริงตาม F10-R30)
- จอ run/จอพกกระเป๋า: พฤติกรรมเดิมของ F04/F06 ไม่เปลี่ยน (นอกขอบเขต F10)

## 11. รายการ copy key ที่ flow นี้อ้าง

คีย์ทั้งหมดเป็นข้อเสนอของ uiux-designer เปลี่ยนชื่อได้โดย narrative-designer (T11) โดยไม่กระทบโครงสร้าง flow นี้ · คอลัมน์ "เพดาน" อ้าง `kind` ของ `components.md` หัวข้อ 10 เมื่อเป็นปุ่ม/ป้ายมาตรฐาน หรือค่าตัวเลขเฉพาะที่ art direction กำหนดไว้แล้ว

### 11.1 คีย์ใหม่ของ F10

| คีย์ | ใช้ที่ | kind | เพดาน |
| --- | --- | --- | --- |
| `account.loginHeader` | headerbar ของ `S-00-login` และจอย่อย | label | ตาม context label เดิม |
| `account.loginGoogleButton`, `account.loginAppleButton` | ปุ่มผู้ให้บริการ | button (น้ำหนักเท่ากัน, ห้ามคำที่ลอก wordmark) | ตาม `.btn-secondary` เดิม ไม่ fullWidth พิเศษ |
| `account.loginEmailLink` | ลิงก์รองใน `S-00-login` | link | 1 บรรทัด |
| `account.testModeNote` | บรรทัดกำกับโหมดทดสอบ | caption | 1 บรรทัดที่ 360 px |
| `account.emailLoginButton`, `account.registerButton`, `account.forgotButton` | ปุ่มหลักของจอย่อยอีเมลแต่ละจอ | button, buttonFullWidth | 16 ช่อง (components.md 10.1) |
| `account.registerLink`, `account.forgotLink`, `account.backToLogin` | ลิงก์รองในจอย่อยอีเมล | link | 1 บรรทัด |
| `character.headerLabel` | headerbar ของ `S-00-create-character` | label | ตาม context label เดิม |
| `character.nameRealNameWarning` | banner คำเตือนถาวรใต้ช่องชื่อ | body (banner `state.info`) | 1–2 บรรทัดที่ 360 px |
| `character.createButton` | ปุ่มหลัก | button, buttonFullWidth | 16 ช่อง |
| `character.nameError.<reason>` (11 คีย์: `empty` ไม่ต้องมีเพราะ 10.4 ไม่แสดงข้อความ, ที่เหลือ `email`/`url`/`phone`/`charset`/`misplacedMark`/`stackedMarks`/`noLetter`/`tooShort`/`tooLong`/`banned`) | ข้อความ inline ใต้ช่องชื่อ | caption | 1 บรรทัดที่ 360 px ต่อเหตุผล |
| `character.classLockedNote` | ป้ายกำกับ class ที่ล็อกของผู้เล่นเดิม (C5) | caption | 1 บรรทัด |
| `story.slide1.title` .. `story.slide5.title` | หัว slide | h2 | ≤20 ช่อง (narrative style-guide 4.3) |
| `story.slide1.body`, `story.slide2.body`, `story.slide3.body`, `story.slide5.body`, `story.slide4.bodySystem` (slide 4 ใช้คีย์นี้คีย์เดียว ไม่มี `story.slide4.body`, D-156) | เนื้อหา slide | body | พื้นที่คงที่ 4 บรรทัดที่ 360 px (หัวข้อ 5 ข้อ D1–D2) |
| `story.next`, `story.start`, `story.skip` | ปุ่มเด่น/ลิงก์ข้าม | button / link | ปุ่ม ≤12 ช่อง (ไม่ใช่ buttonFullWidth) · ลิงก์ 1 บรรทัด |
| `nav.upgrade`, `nav.shop`, `nav.party` (ใหม่สำหรับ F10 — `nav.map`, ยังไม่มี `nav.inventory` ต้องยืนยันว่าใช้คีย์เดิมจาก F06 หรือไม่) | ป้าย nav | label | ≤68 px ที่ 14 px ตัวหนา (art direction 2.4) ห้ามตัด ห้ามขึ้นบรรทัดสอง |
| `comingSoon.upgradeTitle`, `comingSoon.shopTitle`, `comingSoon.partyTitle` | หัวข้อจอเร็วๆ นี้ | h1 | 1 บรรทัดที่ 360 px |
| `comingSoon.upgradeBody`, `comingSoon.shopBody`, `comingSoon.partyBody` | เนื้อหาจอเร็วๆ นี้ | body | 1 บรรทัดพอดี (F10-R35) |
| `settings.logoutLink` | แถวใหม่ใน `S-22-settings` | label | ตามแถวเมนูเดิม |
| `settings.logoutConfirmTitle`, `settings.logoutConfirmBody` | popup ยืนยัน | h1 / body | ตาม popup เดิม |
| `settings.logoutConfirmRunNote` | บรรทัดเพิ่มเมื่อมี run | body | 1–2 บรรทัด |
| `settings.logoutConfirmButton`, `settings.logoutCancelButton` | ปุ่มคู่ | button | ตามปุ่มคู่เดิม |

### 11.2 คีย์เดิมที่ยังใช้ซ้ำ (ไม่แก้)

`onboarding.introStart`, `age.gateTitle`/`age.gateBody`/`age.gateOptions`/`age.gateConfirm`, `age.underMinTitle`/`age.underMinBody`/`age.underMinBack`, `consent.headerLabel`/`consent.locationTitle`/`consent.locationBody`/`consent.locationAccept`/`consent.locationDecline`, `consent.browserPrimingTitle`/`consent.browserPrimingBody`/`consent.browserPrimingContinue`, `nav.map`, `class.tanker`/`ranged`/`support`/`magic` + `onboarding.pickRoleTanker`/`Ranged`/`Support`/`Magic` (ย้ายมาใช้ในการ์ดของ `S-00-create-character` แทน sheet เดิม), `settings.title`/`walkingSafetyLink`/`privacyLink`/`clearLocalDataLink`/`creditsLink`/`clearLocalDataConfirmTitle`/`clearLocalDataConfirmBody`/`clearLocalDataConfirmButton`/`clearLocalDataCancelButton`, `gps.pillLabel`, `common.close`

[handoff narrative-designer: ยืนยันว่า `nav.inventory` มีอยู่แล้วหรือเป็นคีย์ใหม่ — เอกสารนี้ไม่พบคีย์นี้ในรายการเดิมของ F06/F04 ที่อ้างถึง เดาว่าต้องเป็นคีย์ใหม่เช่นเดียวกับ `nav.upgrade`/`nav.shop`/`nav.party`]

## 12. สมมติฐานและคำถามค้าง

- ยืนยัน **A-P2-F10-T02-3** (art direction 11.1): เพิ่ม token `type.title` (36 px/700/line-height 1.5) ใน `design/ux/tokens.json` แล้วในงานนี้ — ใช้กับป้ายชื่อเกมของ `S-00-start` และ `S-00-login` (เล็กลงเป็น `h1` 24 px ตามเดิมสำหรับจอ login ตาม art direction 5.2)
- ยืนยัน **A-P2-F10-T02-4** (art direction 11.1): ตัวเลข layout ขั้นต่ำของ art direction (nav สูง 64 px, pill 48×32 px, จุด slide เส้นผ่านศูนย์กลาง 10 px) เป็นค่าสุดท้ายจริง ไม่ปรับเพิ่ม — บันทึกไว้เป็นทางการใน `components.md` หัวข้อ 16
- [ASSUMPTION A-P2-F10-T06-1: `character.name.minLength`/`maxLength` ที่ทั้งสเปก F10-R18 และหัวข้อ 4 ของเอกสารนี้ใช้อ้างอิง ตอนนี้ไม่ตรงชื่อ field จริงใน `config/balance/character.json` (v2 จาก P2-H64 ใช้ `name.minGraphemes`/`name.maxGraphemes` แทน) — เอกสารนี้ถือว่าเป็นคนละชื่อ อ้างความหมายเดียวกัน (2–16 grapheme) ไม่ใช่ความขัดแย้งของค่า ไม่บล็อกงานนี้ เพราะ wireframe และ flow ไม่ผูกกับชื่อ field ตรงๆ · owner ที่ควรยืนยัน: game-director/tech-lead เมื่อแก้สเปก F10-R18 ให้ตรงชื่อจริงในรอบถัดไป]
- [ASSUMPTION A-P2-F10-T06-2: ป้าย nav 5 ช่องในภาพ/wireframe ของงานนี้ใช้ข้อความร่างสั้น (Thai draft ในวงเล็บ) เพื่อทดสอบความยาว ≤68 px ที่ 14 px ตัวหนา ตามที่ art direction 2.4 กำหนด — ถ้อยคำจริงเป็นของ narrative-designer (T11) ที่ต้อง render จริงด้วยฟอนต์ IBM Plex Sans Thai Looped แล้วเทียบอีกครั้ง owner: narrative-designer]
- [ASSUMPTION A-P2-F10-T06-3: glyph SVG จริงของ T09 (enhance, market, party, logout, coming-soon, sign-in, shuffle) ยังไม่เสร็จตอนเขียนงานนี้ (board สถานะ IN_PROGRESS) — wireframe ใช้ตัวอักษรย่อ/เครื่องหมายแทนตำแหน่ง glyph ชั่วคราวเหมือนที่ wireframe อื่นทำกับ `class-badge` เดิม ไม่ใช่ตัวจริง owner: artist-2d ยืนยันขนาด/ตำแหน่งตรงกับที่ wireframe เว้นที่ไว้]
- [ASSUMPTION A-P2-F10-T06-4: ปุ่ม Setting มุมบนขวาระหว่างอยู่ที่ `S-01-map` วางที่ตำแหน่งเดียวกับ headerbar เดิมด้านขวา (แทนที่ settings icon วงกลม 40 px เดิมในสถานะที่บ้าน) ไม่ใช่วางซ้อนสองปุ่ม — แผนที่จึงมี avatar icon (ซ้าย, ไป `S-10-profile`) + context label/GPS pill (กลาง) เหมือนเดิมทั้งหมด มีแค่ settings icon ฝั่งขวาที่เปลี่ยนจากวงกลม 40 px ในแถบ header เป็นสี่เหลี่ยม 48×48 px ลอยแยกเป็น plate ของตัวเอง (art direction 3.1) owner: art-director/gameplay-programmer ยืนยันว่าไม่ใช่การเพิ่มปุ่มที่สองซ้ำกัน]
- คำถาม playtest (ไม่บล็อกงานนี้ ส่งต่อ product-manager ตามสเปกหัวข้อ 11): ผู้เล่นกี่ % กดลิงก์ "ใช้อีเมลแทน" แทนปุ่ม Google/Apple, กี่ % กดข้ามเรื่องเล่าที่ slide ใด, ความยาวเวลาเฉลี่ยจาก `S-00-start` ถึง `S-01-map` เทียบกับเป้า 10 นาทีของ F06

## 13. ส่งต่อ

| ถึง | งาน | สิ่งที่ส่ง | blocking |
| --- | --- | --- | --- |
| game-director | P2-F10-T10 (อนุมัติ flow) | เอกสารนี้ครบ 13 หัวข้อ + wireframe 6 ไฟล์ + component spec หัวข้อ 16 ของ `components.md` | yes (build รอ T10 PASS) |
| narrative-designer | P2-F10-T11 (copy key) | รายการคีย์หัวข้อ 11 พร้อมเพดานความยาว, ตัดสินตำแหน่ง `onboarding.intro`/`introTap` (D-144, นอกขอบเขตงานนี้เพราะทำไปแล้วใน P2-X59), ยืนยัน `nav.inventory` | yes (T14/T15/T17 ต้องใช้คีย์จริง) |
| artist-2d | P2-F10-T09 (icon), P2-F10-T13 (ภาพ slide) | ยืนยันขนาด/ตำแหน่ง glyph ตรงกับที่ wireframe เว้นที่ไว้ (A-P2-F10-T06-3), ขนาดภาพ slide 4:3 ตาม art direction หัวข้อ 8 ที่ wireframe ใช้ placeholder สี่เหลี่ยมแทน | no |
| gameplay-programmer | P2-F10-T14, T15, T17 | flow พร้อม build: state machine หัวข้อ 1/4 ของสเปก (ไม่เปลี่ยนในนี้), กฎ nav หัวข้อ 8, reload/back/deep-link หัวข้อ 9, ตารางสถานะหัวข้อ 10, route ชื่อจาก A-P2-F10-T01-2 | yes (รอ T10 PASS ก่อน) |
| tech-lead | P2-F10-T07 | แจ้ง mismatch ชื่อ field `character.name.minLength/maxLength` vs `minGraphemes/maxGraphemes` (A-P2-F10-T06-1) เผื่อกระทบ tech note | no |

## REPORT
task: P2-F10-T06
status: DONE
summary: เติม flow F10 หัวข้อ 8–13 ครบ (กฎ nav/Setting ต่อจอ, reload/back/deep-link, ตารางสถานะ offline/error/GPS/ว่าง, copy key, สมมติฐาน, ส่งต่อ) · เขียน wireframe HTML ใหม่ 6 ไฟล์ที่ 360/390 px · เพิ่ม component spec หัวข้อ 16 · เพิ่มรหัสหน้าจอใหม่ใน ia.md · เพิ่ม token `type.title` · เติมหมายเหตุ superseded ใน flow F06
outputs:
  - design/ux/flows/F10-account-shell.md — หัวข้อ 8–13 ใหม่ (เดิมมีแค่ 0–7)
  - design/ux/wireframes/F10-01-start-login.html
  - design/ux/wireframes/F10-02-email-forms.html
  - design/ux/wireframes/F10-03-create-character.html
  - design/ux/wireframes/F10-04-story.html
  - design/ux/wireframes/F10-05-map-nav-coming-soon.html
  - design/ux/wireframes/F10-06-setting-logout.html
  - design/ux/components.md — หัวข้อ 16 ใหม่ (bottom nav F10, ปุ่ม Setting, ช่องชื่อ+ปุ่มสุ่ม, pager slide, coming soon, ปุ่ม login)
  - design/ux/ia.md — เพิ่มรหัสหน้าจอ F10 (login/register/forgot/create-character/story/coming-soon) + หมายเหตุ override Phase 2
  - design/ux/tokens.json — เพิ่ม `type.title`
  - design/ux/flows/F06-hp-damage-onboarding.md — หมายเหตุ superseded ชี้ F10
acceptance:
  - [x] screen id ใหม่ใน ia.md ครบ (login, email login, register, forgot, สร้างตัวละคร, story 1–5, coming soon ×3, Setting+logout) — evidence: ia.md หัวข้อ 3.1/3.6 override ใหม่
  - [x] ทุกทางเข้า/ออกรวม reload/back/deep-link — evidence: flow หัวข้อ 9
  - [x] wireframe HTML 360/390 px ใช้ copy key ปุ่มเด่นเดียวต่อจอ — evidence: ไฟล์ F10-01..06
  - [x] components.md ครบ nav/ช่องชื่อ/pager/coming soon/ปุ่ม login — evidence: หัวข้อ 16.1–16.6
  - [x] กฎการแสดง nav ต่อ state + Setting ไม่ทับ HUD — evidence: flow หัวข้อ 8
  - [x] หมายเหตุ superseded ใน F06 + ไม่มีตำแหน่งรายบุคคล/จำนวนคน/ช่องพิมพ์อิสระนอกช่องชื่อ — evidence: F06 flow หมายเหตุใหม่, ตรวจ wireframe ไม่มี input อิสระอื่น
assumptions:
  - A-P2-F10-T06-1: ชื่อ field `minLength/maxLength` vs `minGraphemes/maxGraphemes` ไม่ตรงกันระหว่างสเปกกับ config v2 (owner: game-director/tech-lead)
  - A-P2-F10-T06-2: ป้าย nav เป็น Thai draft รอ narrative ยืนยันความยาวจริง (owner: narrative-designer)
  - A-P2-F10-T06-3: glyph ใน wireframe เป็น placeholder รอไฟล์จริงจาก T09 (owner: artist-2d)
  - A-P2-F10-T06-4: ปุ่ม Setting แทนที่ settings icon เดิมของ headerbar ไม่ใช่ปุ่มที่สอง (owner: art-director/gameplay-programmer)
handoffs:
  - to: game-director | need: อนุมัติ flow (P2-F10-T10) | why: ต้องผ่านก่อน build T14/T15/T17 | blocking: yes
  - to: narrative-designer | need: คีย์ครบตามหัวข้อ 11 + ยืนยัน nav.inventory | why: build ต้องใช้คีย์จริง | blocking: yes
  - to: artist-2d | need: ยืนยันขนาด glyph ตรงที่เว้นไว้ในจอเร็วๆ นี้/nav | why: ป้องกัน layout ขยับตอนใส่ไฟล์จริง | blocking: no
  - to: tech-lead | need: รับทราบ mismatch ชื่อ field ของตัวกรองชื่อ | why: กระทบ tech note T07 | blocking: no
decisions:
  - none
questions_for_human:
  - none
