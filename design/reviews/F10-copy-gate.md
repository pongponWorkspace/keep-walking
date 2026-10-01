# F10 Copy Gate (P2-F10-T20)

ผู้ตรวจ: narrative-designer · วันที่: 2026-10-01
อินพุต: `qa/reports/F10/screens/*-360.png` (18 ภาพ), `config/content/copy.th.json` (prefix account., character., story., nav., comingSoon., settings.logout, onboarding.introStart)

verdict: NEEDS_CHANGES · blocking 6 ข้อ (F-01 ถึง F-06) · ไม่ blocking 4 ข้อ (N-01 ถึง N-04)
เหตุหลัก: key ดิบ `story.headerLabel` บนจอเล่าเรื่องทั้ง 3 ภาพ (ไม่มี key นี้ใน copy) และ `\n` ที่เขียนไว้ไม่ถูกแสดงบนจอเล่าเรื่องกับคำเตือนชื่อจริง ทำให้ตัดบรรทัดกลางคำและกลับความหมาย

## 1. ผลตรวจรายจอ (ภาพ 360 px)

กฎ copy 6 ข้อ: 1 ไม่มีคำต้องห้าม · 2 ไม่เกิน 2 บรรทัด · 3 มุกจากสถานการณ์จริง · 4 แซวไม่ด่า · 5 อังกฤษเฉพาะคำที่ใช้กันอยู่ · 6 ไม่มีคำหยาบในเสียงระบบ

| ภาพ | key ที่เห็น | ผล | หมายเหตุ |
| --- | --- | --- | --- |
| 01-start | onboarding.introStart | ผ่าน | ปุ่มเดียว ตรงคำตัดสินคน |
| 02-login | loginTitle, loginGoogleButton/AppleButton, loginEmailLink, testModeNote | ผ่าน | Google/Apple = providerName ชื่อผู้ให้บริการจาก SDK ไม่ใช่การโฆษณาแบรนด์ · ไม่เห็น `account.loginHeader` บนจอ (ดู N-03) |
| 03-login-email | emailLoginTitle, emailLabel, passwordLabel, emailLoginButton, registerLink, forgotLink, backToLogin, testModeNote | ผ่าน | ไม่สัญญาอีเมลจริง |
| 04-register | registerTitle, registerButton, backToLogin, testModeNote | ผ่าน | |
| 05-forgot | forgotTitle, forgotButton, backToLogin, testModeNote | ไม่ผ่าน (F-05) | ปุ่ม "ขอตั้งรหัสใหม่" แต่กดแล้วเข้าเกมทันที (`chooseLoginMethod('email_forgot')`) ไม่มีการตั้งรหัสใดๆ = สัญญาสิ่งที่ไม่เกิด |
| 06-create-fresh | character.headerLabel, classLabel, nameLabel, nameRealNameWarning, createButton | ไม่ผ่าน (F-02, F-04) | คำเตือนชื่อจริงตัดเป็น "...เพื่อน / ร่วมงานก็โหลด..." แทนที่ `\n` หลัง "เห็น" · "ปาร์ตี้" ขัด style-guide 5.1 |
| 07-name-invalid | nameError.tooShort ("สั้นไป ขออย่างน้อย 2 ตัว") | ผ่าน | ตัวแปร min แทนค่าถูก |
| 08-migration-locked | classLockedNote | ผ่าน | |
| 09-story-1 | story.headerLabel (ดิบ), slide1.title/body, next, skip | ไม่ผ่าน (F-01, F-02) | key ดิบ · body ตัด "คนก็ยังวิ่ง / รอบสวน" |
| 10-story-4 | story.headerLabel (ดิบ), slide4.title, slide4.bodySystem | ไม่ผ่าน (F-01, F-02) | ใช้ bodySystem ตรง D-156 · แต่ตัด "คนอื่นตี / ไม่ได้" บรรทัดแรกอ่านกลับความหมาย |
| 11-story-5 | story.headerLabel (ดิบ), slide5.title/body, start | ไม่ผ่าน (F-01, F-02) | ตัดกลางคำ "แล้วก / ลับบ้าน" |
| 12-map-nav | nav.inventory/upgrade/map/shop/party | ผ่าน (copy) | ป้ายแถบล่างไม่ตัดไม่ล้น · ป้ายลอยมุมขวาบน "แผนที่ตา…" ถูกปุ่ม Setting ทับ (N-02 ไม่ใช่ copy) |
| 13-cs-upgrade | comingSoon.upgradeTitle/Body | ผ่าน (copy) | 1 บรรทัด · ไม่บอกวัน ไม่สัญญา · หัวถูกกล่อง icon ทับครึ่งล่าง (N-02) |
| 14-cs-shop | comingSoon.shopTitle/Body | ผ่าน (copy) | มุกรถติด กฎ 3 · ทับเหมือน 13 |
| 15-cs-party | comingSoon.partyTitle/Body | ผ่าน (copy) | ไม่สื่อว่ามีแชท · ทับเหมือน 13 |
| 16-settings | settings.logoutLink | ผ่าน | ช่องว่างหน้า "ออกจากระบบ" = ไอคอนไม่ขึ้น ส่ง art gate T21 |
| 17-logout-outside | logoutConfirmTitle/Body/Button, logoutCancelButton | ผ่าน | `\n` ใน popup แสดงถูก (เทียบกับ F-02) |
| 18-logout-in-run | + logoutConfirmRunNote | ไม่ผ่าน (F-03) | ข้อความในป๊อปอัปรวม 4 บรรทัด (body 2 + note 2) เกินกฎ 2 |

ผลรวม: กฎ 1, 3, 4, 6 ผ่านทุกจอ · กฎ 5 ไม่ตรง style-guide ที่ F-04 (เขียน "ปาร์ตี้" ทั้งที่ style-guide 5.1 กำหนด "party") · กฎ 2 ไม่ผ่านที่ F-03 · เพดานช่องผ่านทุก key ตาม lint:copy · key ดิบบนจอ: ไม่ผ่าน (F-01)

## 2. Key ที่ orchestrator เขียนแทน

| key | ข้อความ | ช่อง | ผล | เหตุผล |
| --- | --- | --- | --- | --- |
| settings.logoutLink | ออกจากระบบ | 10 | ยอมรับ | คำมาตรฐานที่คนไทยคุ้น |
| settings.logoutConfirmTitle | ออกจากระบบไหม | 13 | ยอมรับ | สั้น ถามตรง |
| settings.logoutConfirmBody | ตัวละครกับของในเครื่องยังอยู่ครบ / กลับมาเข้าใหม่ได้ทุกเมื่อ | 43 | ยอมรับ | ตรง D-158 (logout ไม่ลบข้อมูล) · ไม่ปลอบ ไม่ขอโทษ · 2 บรรทัด |
| settings.logoutConfirmRunNote | รอบเดินที่ค้างอยู่จะจบตอนนี้ ของที่ได้มาแล้วอยู่ครบ | 37 | ให้แก้ (F-03) | ที่ 360 px ขึ้น 2 บรรทัด รวมกับ body เป็น 4 บรรทัดในป๊อปอัปเดียว · "อยู่ครบ" ซ้ำกับ body · แก้เป็น "รอบเดินที่ค้างอยู่จะจบตอนนี้" (20 ช่อง 1 บรรทัด) ข้อเท็จจริงเรื่องของถูกบอกแล้วใน body |
| settings.logoutConfirmButton | ออกจากระบบ | 10 | ยอมรับ | ตรงกับแถวเมนู ผู้เล่นรู้ว่ากดอะไร |
| settings.logoutCancelButton | ยังก่อน | 5 | ยอมรับ | ภาษาพูด เข้าโทน ไม่กดดัน |
| character.unsupportedBrowser | เบราว์เซอร์นี้ตั้งชื่อตัวละครไม่ได้ / ลองอัปเดตหรือเปิดด้วยเบราว์เซอร์อื่น | 52 | ยอมรับ | 2 บรรทัด · ไม่มีชื่อเทคนิค · "เบราว์เซอร์" "อัปเดต" เป็นคำทับศัพท์เขียนไทยที่คนใช้ทั่วไป (กฎ 5) · ไม่มีภาพจอนี้ ตรวจจาก copy อย่างเดียว · เมื่อแก้ F-02 ต้องแสดง `\n` ตามที่เขียน |

ทั้ง 7 key: เมื่อแก้ F-03 แล้ว narrative-designer รับเป็นเจ้าของ ลบวลี "done by orchestrator ... รอ copy gate T20" ออกจาก context (รวมใน F-06)

## 3. A-P2-H64-1 และ A-P2-H64-2

A-P2-H64-1: ยืนยัน (อ่านจาก `config/balance/character.json#banned._note` และ `allow`)
- Latin run: map ตัวเลข/สัญลักษณ์ที่หน้าตาเหมือนตัวอักษรเฉพาะ run ที่มีตัวอักษรละตินอย่างน้อย 1 ตัว ถูกต้อง · ปีหรือเลขนำโชคเดี่ยวๆ (2026, 99) ไม่โดน map และไทยติดตัวเลขไม่โดน ตรงเจตนา F10-story.md ส่วน 7
- ลบคำ allow แบบ longest-at-position แล้วต่อชิ้นที่เหลือโดยไม่เว้นช่อง: ยืนยัน และเป็นทางที่ถูก เพราะถ้าเว้นช่อง ผู้เล่นแทรกคำ allow กลางคำหยาบเพื่อเลี่ยงได้ (เช่น แทรก "ห่าง" กลางคำต้องห้าม) · ผลข้างเคียงคือชื่อที่ประกอบขึ้นมาจงใจอาจโดนปฏิเสธ ซึ่งยอมรับได้ (fail-closed)
- token mode ลบ allow ก่อนเทียบ: ยืนยัน · ชื่อที่เหลือว่างหลังลบ allow (ชื่อทั้งชื่อเป็นคำ allow) ไม่ match เพราะ term ว่างถูกข้าม จึงผ่าน ถูกต้อง
- หมายเหตุไม่ blocking: leet อาจทำให้ชื่อละตินปกติบางชื่อโดน substring (เช่น Hancock มี cock) · ยอมรับใน Phase 2 เพราะชื่อเก็บในเครื่องและข้อความปฏิเสธเป็นแบบเดียว ส่งต่อไป Phase 3 server re-check (R-F10-3) ไม่ต้องแก้ตอนนี้

A-P2-H64-2: ยืนยัน · ชื่อที่ถูกปฏิเสธจากขั้นก่อน banned (charset, contact, ความยาว) นับว่าไม่ผ่าน และผู้เล่นเห็นข้อความของเหตุผลขั้นนั้น · ไม่รั่วคำต้องห้าม เพราะข้อความทุกเหตุผลไม่ยกคำที่ผู้เล่นพิมพ์ · ใช้กับสุ่มชื่อด้วย (ชื่อที่ตกขั้นก่อนถือว่าสุ่มใหม่) ตรงเจตนา

## 4. F10-story.md กับ D-156

D-156 (game-director): slide 4 ใช้ `story.slide4.bodySystem` เสียงระบบ · บทพูดต้นฉบับเก็บไว้ไม่ลบ · build ใช้ถูกแล้ว (`story-screen.ts` อ่าน bodySystem, ภาพ 10 ยืนยัน)

ที่ยังไม่ตรง (finding ถึงตัวเอง รวมใน F-06):
- `design/narrative/F10-story.md` ตารางหัวข้อ 4 (แถว slide4.body / bodySystem), หัวข้อ 5.1, A-P2-F10-T03-3 และแถวกฎ 6 ในตาราง self-check ยังเขียนว่าบทพูดเป็นหลัก bodySystem เป็นสำรอง → แก้ให้ bodySystem เป็นหลักตาม D-156
- หัวข้อ 5.1 เขียนว่า "ถ้าเลือกทางสำรอง ให้ลบ story.slide4.body" ขัด D-156 ที่ให้เก็บไว้ → แก้เป็นเก็บไว้ ไม่มี UI อ่าน
- context ใน copy: `story.slide4.title` ("ใช้คู่กับ body หรือ bodySystem"), `story.slide4.body` ("ถ้า game-director ไม่ให้ ... ใช้ bodySystem"), `story.slide4.bodySystem` ("UI ไม่ใช้จนกว่ามีคำตัดสิน") ล้าสมัยทั้ง 3 → เขียนใหม่ให้ตรง D-156
- กฎ 6 ของจอ F10 ที่ผู้เล่นเห็นจริงจึงผ่านโดยไม่ต้องโค้ง (ไม่มี "กู" บนจอ) · เอาข้อ "กฎที่โค้ง" ออกจากรายงานของ F10

## 5. Key ที่ไม่ได้ใช้

ตรวจด้วย Grep ทั้ง `apps/`, `packages/`, `qa/`, `tools/` · ไม่มี code อ่าน key เหล่านี้ (`tools/copy-lint/test/s10.test.ts` มี `onboarding.intro` ใน fixture ของตัวเอง ไม่ได้อ่านไฟล์จริง)

| key | ตัดสิน | เหตุผล |
| --- | --- | --- |
| onboarding.intro | ลบ | D-155 ย้ายถ้อยคำไป `story.slide1.title` แล้ว · build เลิกอ้างแล้ว ตามเงื่อนไขการลบใน D-155 |
| onboarding.introTap | ลบ | D-155 · D-144 ตัดการแตะทั้งจอ |
| account.loginGoogle, account.loginApple | ลบ | ถูกแทนด้วย `loginGoogleButton` / `loginAppleButton` (context ของสองตัวใหม่บอกว่าแทนตัวเดิม) |
| account.registerDone | ลบ | flow ไปขั้นอายุทันที (A-P2-F10-T14-3) ไม่มีจังหวะแสดง · ข้อเท็จจริง "อยู่แค่ในเครื่องนี้" อยู่ใน `testModeNote` บนทุกจออีเมลแล้ว |
| account.forgotResult | ลบ | ไม่มีจังหวะแสดงเหมือนกัน · ความซื่อตรงย้ายไปที่ปุ่ม (F-05) · Phase 3 ที่มีอีเมลจริงต้องเขียน copy ใหม่อยู่ดี |
| story.slide4.body | เก็บ | D-156 สั่งเก็บ · context ระบุว่าไม่มี UI อ่าน |
| account.loginHeader | เก็บ รอ uiux | ไม่มีจออ่าน แต่ components.md 2.1 กำหนด context label บน S-00-login (N-03) |

การลบ key: ต้องลบใน `copy-rules.json` ส่วน `keys`/area ที่อ้างถึงด้วยถ้ามี แล้วรัน lint:copy

## 6. Findings

Blocking (ทุกข้อ blocking: yes ตาม protocol ข้อ 6)

| id | ถึง | ต้องทำ | หลักฐาน |
| --- | --- | --- | --- |
| F-01 | narrative-designer | เพิ่ม `story.headerLabel` text "เรื่องราว" (7 ช่อง, label, system, context: context label ใน headerbar ของจอเล่าเรื่องทุก slide) | ภาพ 09, 10, 11 แสดง "story.headerLabel" · `story-screen.ts:53` อ่าน key นี้ · ไม่มีใน copy.th.json |
| F-01b | qa-tester, tech-lead | lint:copy ผ่านทั้งที่ client อ่าน key ที่ไม่มี และ e2e T19 ไม่จับ key ดิบบนจอ · ขอเพิ่มการตรวจ key ที่ code อ้างต้องมีใน copy (lint หรือ unit) และ e2e ตรวจข้อความรูป `area.key` บนจอ | ภาพ T19 ผ่านออกมาพร้อม key ดิบ |
| F-02 | gameplay-programmer (cc uiux-designer) | ข้อความ message ที่มี `\n` บนจอเล่าเรื่อง (`story.slide*.body*`) และ banner `character.nameRealNameWarning` ต้องแสดงตัดบรรทัดตามที่เขียน (แบบเดียวกับ popup logout ซึ่งแสดงถูก) · `character.unsupportedBrowser` ใช้กฎเดียวกัน | ภาพ 06 "เพื่อน / ร่วมงาน" · 09 "คนก็ยังวิ่ง / รอบสวน" · 10 "คนอื่นตี / ไม่ได้" (กลับความหมาย) · 11 "แล้วก / ลับบ้าน" (ตัดกลางคำ) |
| F-03 | narrative-designer | `settings.logoutConfirmRunNote` → "รอบเดินที่ค้างอยู่จะจบตอนนี้" (20 ช่อง) | ภาพ 18 ข้อความรวม 4 บรรทัด เกินกฎ 2 |
| F-04 | narrative-designer | `character.classLabel` → "เลือกบทใน party" (14 ช่อง) ให้ตรง style-guide 5.1 (party เขียนละตินทุกที่) และตรงแถบล่าง `nav.party` / `comingSoon.partyTitle` | ภาพ 06 "ปาร์ตี้" กับภาพ 12 "party" ในเกมเดียวกัน · copy มี "ปาร์ตี้" ที่เดียว |
| F-05 | narrative-designer (cc uiux-designer) | `account.forgotButton` → "เข้าด้วยอีเมลนี้" (11 ช่อง) บอกตรงว่าโหมดทดสอบกดแล้วเข้าเกมเลย ไม่มีการตั้งรหัสใหม่ · แก้ context ให้อ้าง flow จริง | `f04-app.ts:442` onConfirmForgot → `chooseLoginMethod('email_forgot')` ไม่มีขั้นตั้งรหัส · board T20: ไม่สัญญาสิ่งที่ไม่มีจริง (R12) |
| F-06 | narrative-designer | แก้ F10-story.md และ context 3 key ของ slide 4 ตามหัวข้อ 4 · ลบ 6 key ตามหัวข้อ 5 · ลบวลี "done by orchestrator ... รอ copy gate T20" ใน 7 key หัวข้อ 2 · รัน lint:copy exit 0 | หัวข้อ 4, 5 |

ไม่ blocking (ไม่นับใน verdict)

| id | ถึง | เรื่อง |
| --- | --- | --- |
| N-01 | narrative-designer | การ์ด class ที่ 360 px มีคำกำพร้า "ขึ้น" (Ranged) และตัด "มีโล่กัน / แรงตี" (Magic) · ดู key `onboarding.pickRole*` ว่าย่อให้ลงตัว 2 บรรทัดได้ไหม หลัง F-02 แก้แล้ว |
| N-02 | uiux-designer, art-director (T21) | กล่อง icon ทับหัวจอ comingSoon ครึ่งล่าง (ภาพ 13-15) · ปุ่ม Setting ทับป้าย "แผนที่ตา…" (ภาพ 12) · ไอคอนสุ่มชื่อและ logout ไม่ขึ้น (ภาพ 06, 16) · ไม่ใช่ copy แต่ทำให้อ่าน copy ไม่ครบ |
| N-03 | uiux-designer | S-00-login ไม่มี context label `account.loginHeader` ในขณะที่จอสร้างตัวละครมี · ตัดสินว่าจะแสดงหรือให้ narrative ลบ key |
| N-04 | qa-tester | หลังแก้ F-01, F-02 ถ่ายภาพ 06, 09, 10, 11, 18 ใหม่ทั้ง 360 และ 390 เพื่อรัน gate ซ้ำ |

รัน gate ซ้ำ: ตรวจภาพใหม่ของ N-04 กับ diff ของ copy.th.json และ F10-story.md

## รอบ 2 (P2-F10-T20 รอบ 2 · 2026-10-01)

verdict: PASS · F-01 ถึง F-06 (รวม F-01b) ปิดครบ · ไม่มี regression จากการแก้ · note ไม่บล็อก 1 ข้อ (N-01 ค้างเดิม)
อินพุต: ภาพ 360 px ชุดใหม่จาก X67 (05-forgot, 06-create-character-fresh, 09-story-slide-1, 09b, 09c, 10-story-slide-4, 11-story-slide-5, 18-logout-confirm-in-run) · Grep `copy.th.json` · Grep "D-156" ใน `F10-story.md` · `qa/reports/F10/x67-qa-fixes.md`

| id | สถานะ | หลักฐาน |
| --- | --- | --- |
| F-01 | ปิดแล้ว | key `story.headerLabel` "เรื่องราว" (7 ช่อง, label, system) อยู่ใน copy.th.json · headerbar ขึ้น "เรื่องราว" ในภาพ 09, 09b, 09c, 10, 11 ทั้ง 5 slide · ไม่มีข้อความรูป `area.key` บนจอใดในชุดที่ตรวจ |
| F-01b | ปิดแล้ว | กฎ S15 ใน `tools/copy-lint/src/checks/s15.ts` (+ `code-refs.ts`, test `s15.test.ts`) สแกน getCopyText/formatCopyText/getCopyEntry ใน `apps/client/src` แล้วล้มถ้า key หาย (X66, พิสูจน์ว่าจับ story.headerLabel ได้) · e2e `qa/tests/e2e/f10-no-raw-copy-key.spec.ts` 38 passed / 0 failed (19 จอ × 2 project, x67-qa-fixes.md บรรทัด 37) · root `pnpm lint` รวม lint:copy exit 0 |
| F-02 | ปิดแล้ว | `\n` แสดงตรงที่เขียน ไม่ตัดกลางคำ ความหมายไม่กลับ: 06 "อย่าใช้ชื่อจริง ชื่อนี้คนอื่นอาจเห็น / เพื่อนร่วมงานก็โหลดเกมได้นะ" · 09 "รอยแยกมิติโผล่ตามสวนกับตลาด / คนก็ยังวิ่งรอบสวนกันตามปกติ" · 09b "...ต่อคิวชานม / พูดแบบนี้พร้อมกัน มิติก็รับไม่ไหว" · 09c "...ยึดเมือง / มันแค่ไม่ชอบให้ใครเดินในบ้านมัน" · 10 "...ก็แค่นั้น / คนอื่นตีไม่ได้ งานเลยมาถึงคุณ" (ประโยคปฏิเสธอยู่ครบบรรทัดเดียว) · 11 "...ต้องเดินไปเก็บเอง / แล้วกลับบ้านก่อนฝนตก" · `character.unsupportedBrowser` ไม่มีภาพ ใช้ทางแสดงผลเดียวกัน (X65) ตรวจจาก copy ว่ามี `\n` ที่จุดเดียวกับที่ตั้งใจ |
| F-03 | ปิดแล้ว | `settings.logoutConfirmRunNote` "รอบเดินที่ค้างอยู่จะจบตอนนี้" (20 ช่อง) · ภาพ 18: body 2 บรรทัด + note 1 บรรทัด = 3 บรรทัด ≤ 3 · ไม่พูดซ้ำเรื่องของ |
| F-04 | ปิดแล้ว | `character.classLabel` "เลือกบทใน party" (14 ช่อง) · ภาพ 06 หัวส่วนการ์ดขึ้น "เลือกบทใน party" ตรงกับ nav.party · Grep "ปาร์ตี้" ทั้ง copy.th.json ไม่พบ |
| F-05 | ปิดแล้ว | `account.forgotButton` "เข้าด้วยอีเมลนี้" (11 ช่อง) · context อ้าง onConfirmForgot → chooseLoginMethod email_forgot และบอกว่าไม่มีการตั้งรหัสใหม่ · ภาพ 05 ปุ่มหลักขึ้น "เข้าด้วยอีเมลนี้" คู่กับ "บัญชีทดสอบ อยู่แค่เครื่องนี้" ไม่สัญญาสิ่งที่ไม่เกิด |
| F-06 | ปิดแล้ว | F10-story.md: หัวข้อ 4 แถว bodySystem "ที่ UI แสดง D-156" และ body "เก็บไว้ ไม่มี UI อ่าน" · 5.1 "ตัดสินแล้วด้วย D-156 (ไม่มีกฎโค้ง)" · self-check กฎ 2 และกฎ 6 อ้าง bodySystem · A-P2-F10-T03-3 ปิดด้วย D-156 · context 3 key ของ slide 4 เขียนใหม่ตรง D-156 · 6 key ที่สั่งลบ (onboarding.intro, onboarding.introTap, account.loginGoogle, account.loginApple, account.registerDone, account.forgotResult) Grep ทั้ง `config/` ไม่พบ · วลี "done by orchestrator" / "รอ copy gate" Grep ไม่พบใน copy · lint:copy 0 FAIL (ledger X64) และ exit 0 หลัง X67 |

ตรวจกฎ 6 ข้อบนจอชุดใหม่: กฎ 1 ไม่มีคำต้องห้าม · กฎ 2 ข้อความระบบทุกจอ ≤ 2 บรรทัด (popup in-run รวม 3 บรรทัดตามเพดานจอนี้) · กฎ 3, 4 เดิมผ่าน · กฎ 5 party ละตินตรง style-guide 5.1 · กฎ 6 ไม่มีคำหยาบบนจอ (slide 4 ใช้ bodySystem) · ไม่มีกฎที่โค้ง

Note ไม่บล็อก (ไม่ใช่ regression)
- N-01 ยังค้าง: ภาพ 06 การ์ด Ranged มีคำกำพร้า "ขึ้น" และ Magic ตัด "มีโล่กัน / แรงตี" · เป็นการตัดคำอัตโนมัติของข้อความ label ในการ์ด ไม่ใช่ `\n` · เสนอทำเป็นงาน copy แยกหลัง F10 (เช่น ย่อ `onboarding.pickRoleRanged` / `pickRoleMagic` หรือใส่ `\n` ที่ตั้งใจ) ต้องเช็กกับ S-05-role-info ที่ใช้ key ซ้ำ
- N-02, N-03 ไม่ได้ตรวจซ้ำในรอบนี้ (อยู่นอก scope F-01..F-06)
