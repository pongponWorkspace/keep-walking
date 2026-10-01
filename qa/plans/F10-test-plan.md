# F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav: Test Plan

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F10-T08 (เขียนแผนนี้) · P2-F10-T16 (แก้ e2e เดิม, รอ T14) · P2-F10-T19 (e2e ใหม่ + ภาพหน้าจอ, รอ T17/T16) · P2-F10-T22 (QA gate F10) · เจ้าของ: qa-tester |
| อ้างอิง spec | `design/features/F10-account-shell.md` (R01–R52, ตาราง transition A1–A12, คำตัดสิน 1–9, edge case A-E1–A-E26, acceptance 1–13, หัวข้อ 10 non-negotiable) |
| อ้างอิง decision | D-144 (จอเริ่มเกมปุ่มเดียว), D-145 (login เป็น shell ไม่มี auth จริง), D-146 (สร้างตัวละคร + ตัวกรองชื่อ), D-147 (เรื่องเล่า 5 slide), D-148 (map หลัก + nav + setting/logout), D-149 (ลำดับ onboarding 8 ขั้น), D-152 (สรุปคำตัดสินของ T01 ลง decision log) |
| อ้างอิง vector | `design/systems/test-vectors/character-name.json` (75 vector: 71 `validateCharacterName`, 4 `randomCharacterName` — ครบ 11 เหตุผล empty/email/url/phone/charset/misplacedMark/stackedMarks/noLetter/tooShort/tooLong/banned) |
| อ้างอิง telemetry | `product/telemetry-events.md` §2b (`account_login_shown`, `account_login_method_chosen`, `character_created`, `story_completed`, `story_skipped`, `nav_tab_opened`, `coming_soon_viewed`, `account_logout` — 8 event) |
| อ้างอิง config | `config/balance/character.json` (ตัวกรองชื่อ), `config/content/character-names.th.json` (คลังชื่อสุ่ม + คำต้องห้าม), `config/content/copy.th.json` (ป้ายทุกจอของ F10) |
| GDD (read-only) | "การเข้าสู่ระบบ", "10 นาทีแรกของคนใหม่", "เรื่องเล่า", "โทนและภาษาในเกม", "ความปลอดภัยผู้เล่นและ PDPA", "หลักการที่ห้ามละเมิด" |
| Exit checklist ที่ผูก | ไม่แตะ E6–E9 ของ F06 โดยตรง แต่ R-F10-4 ผูกกับ E6/E7 (ต้องยังถึงรอยแยกแรกใน 10 นาที) และ NN-4/NN-7 (ตรวจในหัวข้อ 3.7, 3.8) |
| คู่กับ | `qa/plans/F06-test-plan.md` (onboarding เดิม ก่อนถูกแทรกโดย F10), F04/F05 (movement gate, presence, run state — F10 ไม่แตะแต่ nav ต้องไม่บัง HUD run) |

## 0. สถานะโค้ดที่ทดสอบได้จริง ณ วันที่เขียนแผนนี้ (2026-10-01)

Board: P2-F10-T12 (โมดูล pure + step machine, backend-programmer), P2-F10-T14/T15/T17 (build client, gameplay-programmer) ทั้งหมดสถานะ `TODO` — ยังไม่มีโค้ดของ F10 ที่รันได้จริงในเครื่อง (เหมือนสถานะของ F06-test-plan §0 ตอนเขียน) แผนนี้จึง:

1. เขียน case ทุกข้อจาก R01–R52 และ A-E1–A-E26 เป็น traceability พร้อมสถานะ **PENDING** (รอ T12/T14/T15/T17) ไม่ผูกกับโค้ดที่ยังไม่มี
2. ระบุจุดเดียวที่พิสูจน์ได้วันนี้โดยไม่รอ build: ตัวกรองชื่อผ่าน vector runner แบบ dynamic (`packages/shared/src/formulas/vectors.test.ts` รูปแบบเดียวกับ F06) เมื่อ `packages/shared/src/character/` (T12) มีโค้ด — วันนี้ยัง TODO เช่นกัน จึงยังเป็น PENDING แต่ vector เองพร้อมแล้ว (75 ข้อ ครบ 11 เหตุผล) ตรวจแล้วในหัวข้อ 2 ว่าไม่มีเหตุผลใดขาด
3. รายการ e2e เดิมที่จะพัง (หัวข้อ 6) ตรวจจากโค้ดจริงที่มีอยู่วันนี้ (`apps/client/e2e/*.spec.ts`, `qa/tests/e2e/*.spec.ts`) เทียบกับลำดับใหม่ของ spec — ส่วนนี้ทำได้เต็มรูปวันนี้เพราะไม่ต้องรอ build ของ F10

เมื่อ T12/T14/T15/T17 DONE, P2-F10-T19 (e2e ใหม่, qa-tester) พลิกทุกแถว PENDING ในหัวข้อ 3–5 เป็น PASS/FAIL จริงในรายงาน `qa/reports/F10-qa-gate.md`

## 1. ค่า config ที่ทุก case อ้างอิง (อ่านสดจาก config เสมอ ไม่ hardcode ในเทสต์)

| key | ใช้ใน |
| --- | --- |
| `character.name.minGraphemes` / `maxGraphemes` (2/16, นับ grapheme cluster) | 3.2 (ความยาว, reason tooShort/tooLong) |
| `character.name.normalize` (NFC, strip zero-width, ยุบช่องว่าง) | 3.2 (A-E9) |
| `character.name.*` (charset, phone, email/url pattern, banned compare) | 3.2 (reason charset/phone/email/url/banned/misplacedMark/stackedMarks/noLetter) |
| `character.random.*` (`randomMaxAttempts`, prefixes/cores/fallbacks จาก content) | 3.2 (ปุ่มสุ่ม, A-E10) |
| `privacy.minAge_yr` / `minAgeComparison` (มีแล้วจาก F06, ไม่เปลี่ยน) | 3.1 (A-E1) |
| `config: app/telemetry.json` allowlist ของ export/ring buffer | 3.7 (ตรวจไม่มี PII) |

## 2. คลัง vector ที่ใช้

| ไฟล์ | ใช้พิสูจน์อะไร | สถานะ |
| --- | --- | --- |
| `character-name.json` (`validateCharacterName` 71 ข้อ, `randomCharacterName` 4 ข้อ) | acceptance 5 ทั้งข้อ: ทุกเหตุผลของ R18 (1–5) ครบ 11 ป้าย reason (`empty`, `email`, `url`, `phone`, `charset`, `misplacedMark`, `stackedMarks`, `noLetter`, `tooShort`, `tooLong`, `banned`), `randomCharacterName` คืนชื่อผ่านเสมอ, fallback เมื่อสุ่มไม่ผ่านครบ `randomMaxAttempts` | PENDING รอ `packages/shared/src/character/` (T12) |
| Monte Carlo 10,000 seed ของ `randomCharacterName` (เพิ่มจากงานนี้ ไม่ใช่ vector คงที่) | acceptance 5 "ปุ่มสุ่ม 10,000 seed ได้ชื่อที่ผ่านทุกครั้ง" | PENDING รอ T12 · runner: `packages/shared/src/character/random.property.test.ts` (เสนอชื่อไฟล์ให้ backend-programmer) |
| PDPA: ไม่มี vector แยก — ตรวจด้วย black-box (localStorage/IndexedDB/telemetry buffer/export/URL scan) ตามหัวข้อ 3.7 | acceptance 3, 4, 6 | PENDING รอ T14 |

## 3. Case ต่อ rule (traceability)

รูปแบบ id: `TC-F10-<หมวด>-<nn>` · precondition ที่ไม่ระบุ = ติดตั้งใหม่ (ไม่มี key `kw.p2.*` ใด) · ทุก case สถานะ PENDING จนกว่า build ของหัวข้อนั้นจะ DONE (ดูหัวข้อ 0)

### 3.1 ลำดับ onboarding 8 ขั้น (R01–R14, D-149, transition A1–A6/A12)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-FLOW-01 | ติดตั้งใหม่ | เดินครบ: เริ่มเกม → login (Google) → อายุผ่าน → consent ยอมรับ → permission อนุญาต → สร้างตัวละคร → เรื่อง 5 slide (กด "ถัดไป" ทุกจอ) → แผนที่ | ลำดับตรง R01 เป๊ะ ไม่มีจอแทรก · shell พร้อมที่แผนที่ | R01, R02, acceptance 1 |
| TC-F10-FLOW-02 | ติดตั้งใหม่ | เดินถึง consent แล้วกด "ปฏิเสธ" | ข้ามจอ permission ไปสร้างตัวละครทันที · ถึงแผนที่สถานะไม่รู้ตำแหน่งพร้อมปุ่มกลับไปให้ consent | R03, F06-R48, acceptance 1 |
| TC-F10-FLOW-03 | ผ่าน consent แล้ว | ที่จอ permission กดปฏิเสธ browser permission (หรือ GPS ปิด) | ไม่ติด onboarding ไปขั้น 6 ต่อ สถานะไม่รู้ตำแหน่ง | R04, A-E12 |
| TC-F10-FLOW-04 | จอ login/จอย่อยอีเมล/register/forgot | กดปุ่มยืนยันแต่ละปุ่ม (Google, Apple, เข้าสู่ระบบอีเมล, สมัคร, ลืมรหัสผ่าน) ทีละปุ่ม (5 รอบ ติดตั้งใหม่ทุกรอบ) | ทุกปุ่มพาไปขั้นยืนยันอายุเสมอ ไม่มีจอ error/รออีเมล/ยืนยันตัวตน | R10, acceptance 2 |
| TC-F10-FLOW-05 | จอ login หลัก | สังเกตน้ำหนักปุ่ม Google/Apple เทียบกัน และลิงก์รองไปอีเมล | Google/Apple เป็นกลุ่มปุ่มหลักน้ำหนักเท่ากัน ไม่มีปุ่มเด่นเดียวแบบจออื่น | R02 ข้อยกเว้น, R08 |
| TC-F10-FLOW-06 | จอ email login/register/forgot | ปล่อยช่องอีเมล/password ว่าง กดปุ่มยืนยัน | ปุ่มทำงานแม้ว่าง ไปขั้นอายุได้ | R11 |
| TC-F10-FLOW-07 | อายุต่ำกว่าเกณฑ์ | กด login ใดก็ได้ → ตอบอายุต่ำกว่าเกณฑ์ | จอ "ยังเปิดใช้ไม่ได้" (F06-R46) · ปุ่มเดียวกลับจอเริ่มเกม | R13, R14, A-E1 |
| TC-F10-FLOW-08 | ต่อจาก TC-F10-FLOW-07 | ตรวจ localStorage/IndexedDB ทั้งหมดหลังกลับจอเริ่มเกม | ไม่มี `kw.p2.account`, ชื่อตัวละคร หรือ key ใหม่ใดของ F10 | R14, acceptance 4 |
| TC-F10-FLOW-09 | จอเริ่มเกม | แตะนอกปุ่ม "เริ่มเกม" หลายจุด | ไม่ไปต่อ | R07 |
| TC-F10-FLOW-10 | จอเริ่มเกม/login | กด "เริ่มเกม" ครั้งเดียว ตรวจ network log ตลอดจนถึงแผนที่ (ทุกปุ่มของ R10) | ไม่มี network request ไป origin นอก allowlist ตลอดทาง (ไม่ popup ไม่ redirect) | R12, C2-1, acceptance 2 |
| TC-F10-FLOW-11 (reload matrix) | แต่ละขั้น A-E2–A-E8 | reload ที่: จอเริ่มเกม/login, จอยืนยันอายุ, consent, permission, สร้างตัวละคร, ระหว่างเรื่อง, แผนที่ | กลับขั้นที่ยังไม่ผ่านตามที่บันทึกแล้ว (R05) ตรงตามตาราง A-E2–A-E8 ทีละแถว ไม่รีเซ็ตทั้งหมด | R05, A-E2–A-E8 |
| TC-F10-FLOW-12 | reload ที่จอยืนยันอายุ | reload กลางจอยืนยันอายุ (ยังไม่กดยืนยัน) | กลับจอ login (account ยังไม่เขียนตาม R13) ไม่ใช่กลับจอเริ่มเกม | R13, A-E3 |
| TC-F10-FLOW-13 | shell ยังไม่พร้อม (ขั้น 1–7 ใดๆ) | เปิด deep link `#/inventory`, `#/upgrade`, `#/shop`, `#/party`, `#/settings` | พาไปขั้นแรกที่ยังไม่ผ่านเสมอ ไม่เข้าจอปลายทาง | R06, A-E16 |
| TC-F10-FLOW-14 | ผ่านขั้นนั้นแล้ว | เปิด deep link `#/login`, `#/create-character`, `#/story/<n>` | ไปแผนที่ (ขั้นที่ผ่านแล้วไม่เปิดซ้ำ) ยกเว้น `#/login` ขณะ `SignedOut` = จอ login | A-E17 |
| TC-F10-FLOW-15 | ระหว่าง story slide 1 | เปิด deep link `#/story/4` ตรง | ยังอยู่ slide 1 ไม่กระโดดข้าม | A-E18 |
| TC-F10-FLOW-16 | onboarding ทุกขั้น | กดปุ่ม back ของเบราว์เซอร์ที่แต่ละขั้น | ไม่ย้อนขั้นที่บันทึกแล้ว (จอเดิมแสดงซ้ำ) · จอย่อยอีเมลกลับจอ login หลัก · ใน story ย้อน slide ได้ | A-E19, R28 |
| TC-F10-FLOW-17 | offline ที่จอ login | ปิดเน็ตก่อนกด Google/Apple | ไปต่อได้ตามปกติ (ไม่มี network เรียกในขั้นนี้) | A-E23, R12 |
| TC-F10-FLOW-18 | ระหว่าง onboarding | จำลอง dungeon ปิด/เน็ตหลุด/GPS drift ระหว่างขั้นใดก็ตาม | ไม่มีผลต่อขั้น F10 ถึงแผนที่ตามสถานะที่บ้านของ F06 ปกติ | A-E24 |
| TC-F10-FLOW-19 | เปิดสองแท็บ | แท็บ A logout, แท็บ B ลบข้อมูล (หรือสลับกัน) พร้อมกัน | แท็บที่ทำทีหลังชนะ · แท็บอื่น reload แล้วเข้า A12 ปกติ ไม่มี sync สด | A-E25 |

### 3.2 สร้างตัวละคร + ตัวกรองชื่อ (R15–R24, D-146)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-NAME-01 | จอสร้างตัวละคร | ตรวจ layout: การ์ด class 4 ใบ (Tanker/Ranged/Support/Magic), ช่องชื่อ+ปุ่มสุ่ม+คำเตือน, ปุ่ม "สร้างตัวละคร" เรียงบนลงล่าง ไม่ทับแผนที่ | ตรง R15, R16 คำอธิบาย class ไม่มีสูตร/%/party/debuff | R15, R16 |
| TC-F10-NAME-02 | จอสร้างตัวละคร | ไม่เลือก class กดปุ่มสร้าง | ปุ่มกดไม่ได้ | R21, acceptance 5 |
| TC-F10-NAME-03 | เลือก class, ช่องชื่อว่าง | กดปุ่มสร้าง | ปุ่มกดไม่ได้ (ชื่อว่าง = reason `empty`) | R21, acceptance 5 |
| TC-F10-NAME-04 (vector runner) | `packages/shared/src/character/` DONE | รัน `validateCharacterName`/`randomCharacterName` กับทุกแถวของ `character-name.json` แบบ dynamic (import ไฟล์จริง ไม่ hardcode ทีละเคส) | ผลตรง `expected` ทุกแถว (75/75) รวม `normalized`/`graphemes` เมื่อ `ok:true` และ `reason` ตรงเมื่อ `ok:false` | R18, acceptance 5 |
| TC-F10-NAME-05 (UI ต่อเหตุผล) | จอสร้างตัวละคร | พิมพ์ชื่อตัวอย่างของแต่ละเหตุผล (เลือก 1 vector ต่อ `empty,email,url,phone,charset,misplacedMark,stackedMarks,noLetter,tooShort,tooLong,banned` จาก `character-name.json`) | ข้อความ inline ใต้ช่องตรงกับเหตุผลนั้น แสดงทีละหนึ่งเหตุผล (เหตุผลแรกตามลำดับ R18) ไม่ใช้ popup ไม่โชว์คำต้องห้ามที่จับได้กลับมา | R18, R19, acceptance 5, 6 |
| TC-F10-NAME-06 | ชื่อไม่ผ่าน | แก้ไขจนผ่าน | ข้อความ error หายทันที ปุ่มสร้างกดได้ | R19, A-E8 |
| TC-F10-NAME-07 | ชื่อไม่ผ่านกี่ครั้งก็ตาม | พิมพ์ผิด 10+ ครั้งติดกัน | ไม่มีโทษ ไม่ล็อกปุ่ม ไม่หน่วงเวลา | R19 |
| TC-F10-NAME-08 | จอสร้างตัวละคร | กดปุ่มสุ่มชื่อ 1 ครั้ง | ชื่อที่ได้ผ่าน `validateCharacterName` เสมอ | R20, acceptance 5 |
| TC-F10-NAME-09 (property test 10,000 seed) | `randomCharacterName` DONE | รัน `randomCharacterName` 10,000 seed ต่างกัน ผ่าน config จริงของ `character.json` | ทุก seed ได้ชื่อที่ `validateCharacterName` คืน `ok:true` (รวม path ที่ชนครบ `randomMaxAttempts` แล้วตกไปใช้ fallback) | R20, acceptance 5 |
| TC-F10-NAME-10 | จอสร้างตัวละคร | กดสุ่มซ้ำหลายครั้งติดกัน (≥20 ครั้ง) | ทุกครั้งได้ชื่อผ่าน ไม่ crash ไม่ค้าง | R20, A-E10 |
| TC-F10-NAME-11 | สุ่มชื่อได้แล้ว | แก้ต่อจากชื่อที่สุ่มได้จนไม่ผ่าน (เช่น พิมพ์คำต้องห้ามต่อท้าย) | นับเป็นชื่อพิมพ์เอง กลับเข้าตัวกรองปกติ (error โชว์) | R20, A-E10 |
| TC-F10-NAME-12 | ช่องชื่อ | พิมพ์ชื่อมีช่องว่างหัวท้าย/ซ้ำ เช่น `"  สม  ชาย  "` | ผ่าน (ถ้าเนื้อหาโอเค) และบันทึกแบบ normalize (`"สม ชาย"`) | R22, A-E9 |
| TC-F10-NAME-13 | ช่องชื่อ | วางข้อความยาวมาก (>maxGraphemes) หรือ emoji/อักขระควบคุมลงช่อง | ไม่ผ่านด้วยเหตุผล `tooLong`/`charset` ไม่ crash ไม่ตัดเงียบ | A-E11 |
| TC-F10-NAME-14 | เลือก class + ชื่อผ่าน | กดปุ่ม "สร้างตัวละคร" | class + ชื่อบันทึกพร้อมกันครั้งเดียว ไม่มี popup ยืนยันเพิ่ม ไปขั้น 7 (เรื่องเล่า) | R21, acceptance 5 |
| TC-F10-NAME-15 | ตัวละครสร้างแล้ว (อยู่ slide เรื่องเล่า) | ลองหาทางกลับไปแก้ class หรือชื่อ (back, deep link `#/create-character`) | ไม่มีทางแก้ได้ใน Phase 2 (R23) | R23, R28 |
| TC-F10-NAME-16 | ตัวละครสร้างแล้ว | เปิดจอที่ผู้เล่นอื่นเห็นได้ใน Phase 2 (ไม่มี — ตรวจว่าไม่มีจอแชร์ใดโชว์ชื่อ) | ชื่อไม่ปรากฏนอกจอของผู้เล่นเอง (Phase 2 ไม่มีจอผู้อื่นอยู่แล้ว) | R24, acceptance 6 |

### 3.3 เรื่องเล่า 5 slide (R25–R30, D-147)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-STORY-01 | ตัวละครสร้างแล้ว, slide 1 | สังเกตปุ่มของ slide 1–4 และ slide 5 | slide 1–4 มี "ถัดไป" + ลิงก์รอง "ข้าม" · slide 5 มี "ออกไปลุย!" อย่างเดียว ไม่มีลิงก์ข้าม | R25, R27, acceptance 7 |
| TC-F10-STORY-02 | slide 1 | กด "ถัดไป" จนถึง slide 5 แล้วกด "ออกไปลุย!" | ไปแผนที่ ธงเรื่องผ่านถูกบันทึก | R25, A7 |
| TC-F10-STORY-03 | slide 1–4 ใดก็ได้ | กดลิงก์ "ข้าม" | ไปแผนที่ทันที นับผ่านขั้น 7 เท่ากับจบเรื่อง | R27, acceptance 7 |
| TC-F10-STORY-04 | slide ใดก็ได้ | ปัดซ้าย/ขวา (ถ้า uiux เปิดใช้) และดูตัวบอกตำแหน่ง slide | เลื่อนได้ตรงทิศ ปุ่มเด่นยังเป็นทางหลัก มีจุดบอกตำแหน่ง 5 จุด | R26 |
| TC-F10-STORY-05 | slide 1 | ย้อนกลับด้วยปุ่ม back ของเบราว์เซอร์/ปัด | ย้อนไปจอสร้างตัวละครไม่ได้ | R28 |
| TC-F10-STORY-06 | slide ≥2 | reload กลางเรื่อง | กลับ slide 1 เสมอ ตัวละครอยู่ครบ | R30, A-E6 |
| TC-F10-STORY-07 | เรื่องผ่านแล้ว (จบหรือข้าม) | เปิดแอปใหม่ทั้งหมด (ไม่ logout ไม่ลบข้อมูล) | ไม่เห็นเรื่องอีก ไม่มีทางเปิดซ้ำจากตั้งค่า | R30, acceptance 7 |
| TC-F10-STORY-08 | เนื้อหาเรื่องพร้อม (หลัง T13/T11) | อ่านทุก slide ที่ 360 px เทียบ content gate | ไม่เกิน 2 บรรทัดต่อ slide (กฎ copy ข้อ 2), ไม่มีตัวเลข/ชื่อสถานที่จริงระบุตัวได้, ไม่เอ่ยระบบห้ามสอน (ตลาด/ตีบวก/raid/boss/stat point/เปลี่ยน class/party/anti-cheat) | R29, acceptance 7, pillars 6.2 |
| TC-F10-STORY-09 | telemetry buffer เปิดอยู่ | จบเรื่อง / ข้ามเรื่อง | `story_completed{slides_viewed_count}` หรือ `story_skipped{slide_index_at_skip}` ยิงครั้งเดียว ไม่มีเนื้อหาเรื่องหรือพิกัดใน property | telemetry §2b, acceptance 6 |

### 3.4 Map หลักและ nav ล่าง (R31–R38, D-148)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-NAV-01 | shell พร้อม, ไม่มี run ค้าง | เปิดแอป | แผนที่เป็นหน้าแรก สถานะที่บ้านตาม F06-R50–R55 แสดงตามเดิม | R31, A-E7 |
| TC-F10-NAV-02 | shell พร้อม, มี run ค้าง | เปิดแอป | จอ run ตาม F04 ก่อนเสมอ ไม่ใช่แผนที่ nav ไม่ขึ้น | R31, R33 |
| TC-F10-NAV-03 | แผนที่ | ตรวจลำดับ nav 5 ช่อง ซ้ายไปขวา | Inventory, Upgrade, Map, Shop, Party ตรงลำดับ R32 · ช่องเปิดอยู่มีสถานะ active · ป้ายเป็น copy key | R32, acceptance 8 |
| TC-F10-NAV-04 | ที่ 360 px และ 390 px | เปิดทีละจอ: onboarding ขั้น 1–7 ทุกจอ, popup confirm เข้า dungeon, จอ run (Active/Grace/Suspended/speed lock), จอพกกระเป๋า, สรุป run, sheet/popup ยืนยันใดๆ | ไม่มี nav แสดงในทุกจอเหล่านี้ ไม่ทับ HUD ของ run | R33, acceptance 8 |
| TC-F10-NAV-05 | แผนที่ | กดแท็บ Inventory | เปิด `#/inventory` เดิม เนื้อหาไม่เปลี่ยน ใช้ยานอก run ได้ตาม F06-R26 | R34 |
| TC-F10-NAV-06 | แผนที่ | กดแท็บ Upgrade / Shop / Party ทีละแท็บ | จอ "เร็วๆ นี้" คนละจอ มีหัวจอ+ข้อความ 1 บรรทัด+nav ไม่มีปุ่มอื่น ไม่มีช่องลงทะเบียน ไม่มีรางวัล | R35, acceptance 9 |
| TC-F10-NAV-07 | จอเร็วๆ นี้ทั้งสาม | อ่านเนื้อหาเทียบ pillars 6.2 | ไม่อธิบายกลไก ไม่บอกเงื่อนไขปลด ไม่มีตัวเลข/วันที่สัญญา · จอ Party ไม่มีจำนวนคน/role/placeholder ชวนเดา | R36, acceptance 9 |
| TC-F10-NAV-08 | จอ shell ใดๆ ที่มี nav | สังเกต icon มุมบนขวา | Setting icon อยู่จอเดียวกับ nav เท่านั้น ไม่วางบนจอ run/จอพกกระเป๋า | R37 |
| TC-F10-NAV-09 | nav ทุกช่อง | สังเกต badge/ตัวเลขแจ้งเตือน | ไม่มี badge ใดบน nav ใน Phase 2 | R38 |
| TC-F10-NAV-10 | telemetry buffer เปิดอยู่ | กดแท็บ Upgrade (หรือ Shop/Party) | `nav_tab_opened{tab}` และ `coming_soon_viewed{tab}` ยิงพร้อมกันเวลาเดียวกัน · กดแท็บ Inventory/Map มีแค่ `nav_tab_opened` | telemetry §2b |

### 3.5 Setting, ออกจากระบบ, ลบข้อมูลในเครื่อง (R39–R44, คำตัดสิน 1, 2, 5)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-LOGOUT-01 | shell พร้อม, ไม่มี run | เปิด Setting → กด "ออกจากระบบ" | ต้อง confirm ก่อนเสมอ · ข้อความบอกตรงว่าตัวละคร/ของในเครื่องยังอยู่ | R40 |
| TC-F10-LOGOUT-02 | ต่อจาก 01 | ยืนยัน confirm | ธง signed in = false → จอ login · class/ชื่อ/HP/inventory/สรุป run/consent/ธงอายุ/onboarding/auto-retreat ไม่ถูกลบ | R41, acceptance 10 |
| TC-F10-LOGOUT-03 | มี run กำลัง Active | กด logout → confirm | confirm บอกด้วยว่า run จะจบและของอยู่ครบ · run จบด้วย `manual_exit` ทางเดียว หยุดขอตำแหน่งทันที ของเก็บครบ ไม่ผ่าน Grace/Suspended/`timeout` · แสดงสรุป run → จอ login | R42, A-E14, acceptance 10 |
| TC-F10-LOGOUT-04 | มี run อยู่ใน Grace/Suspended | กด logout → confirm | เหมือน 03: จบ `manual_exit` ทันที ไม่รอ trace ใหม่ ไม่ไหลต่อเป็น timeout | R42, A-E14 |
| TC-F10-LOGOUT-05 | ต่อจาก 03/04 | ตรวจ telemetry | `account_logout{during_run:true}` และ `dungeon_exited{exit_reason:manual_exit}` ที่เวลาเดียวกัน | telemetry §2b (`account_logout`) |
| TC-F10-LOGOUT-06 | `SignedOut` ที่จอ login | กดปุ่มยืนยันใดของ R10 | เขียน provider ใหม่ + `SignedIn` ทันที → **แผนที่ตรง** ข้ามอายุ/consent/สร้างตัวละคร/เรื่อง | R43, acceptance 10 |
| TC-F10-LOGOUT-07 | ต่อจาก 06 | เลือก provider ต่างจากครั้งก่อน (เช่น เคย Google ตอนนี้ Apple) | ไปแผนที่ตรงเหมือนกัน ตัวละครเดิมตัวเดียวกัน (Phase 2 โปรไฟล์เดียวต่อเครื่อง) | R43 |
| TC-F10-LOGOUT-08 | logout นอก run แล้วปิดแอป เปิดใหม่ | เปิดแอปใหม่ | จอ login (A12) ไม่ใช่จอเริ่มเกม | A-E13 |
| TC-F10-LOGOUT-09 | shell พร้อม, ไม่มี run | Setting → "ลบข้อมูลในเครื่อง" → confirm | ล้างทุก key `kw.p2.*` (รวม account, ชื่อ) → จอเริ่มเกม เริ่ม 8 ขั้นใหม่ทั้งหมด · auto-retreat กลับเป็นเปิด | R44, acceptance 11 |
| TC-F10-LOGOUT-10 | มี run กำลังทำงาน | เปิด Setting พยายามลบข้อมูลในเครื่อง | ปุ่มใช้ไม่ได้ระหว่าง run | R44, A-E15, acceptance 11 |
| TC-F10-LOGOUT-11 | เมนู Setting | ตรวจแถวเดิม (การเดินและความปลอดภัย, privacy/consent, ลบข้อมูล, Credits) เทียบก่อนมี F10 | พฤติกรรมแถวเดิมไม่เปลี่ยน มีแค่แถวใหม่ "ออกจากระบบ" เพิ่ม | R39 |

### 3.6 Migration ผู้เล่นเดิม (R45–R48, คำตัดสิน 3)

Seed ต้องสร้างด้วยข้อมูลในเครื่องแบบ F06 เดิม (มีธง onboarding ของ F06 แต่ไม่มี `kw.p2.account`/ชื่อตัวละคร) ผ่าน `addInitScript` เหมือนที่ `withdraw-consent.spec.ts`/`map-shell.spec.ts` ทำกับ `kw.p2.consent` — ขอ tech note ของ T07/T12 ยืนยัน key ที่ต้อง seed ก่อนเขียน e2e จริง (ดูหัวข้อ 8)

| id | precondition (seed) | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-MIGRATE-01 | seed ผ่าน onboarding F06 ครบ (intro/อายุ/consent/permission/class) มี inventory/HP จริง ไม่มี account/ชื่อ | เปิดแอป | เข้า login → ตั้งชื่อ (class ที่เลือกไว้ล็อกแสดงเป็นค่าอ่านอย่างเดียว) → เรื่อง 5 slide → แผนที่ · ไม่ถามอายุ/consent ซ้ำ | R45, R46, R47, acceptance 12 |
| TC-F10-MIGRATE-02 | ต่อจาก 01 | ตรวจ inventory, HP, สรุป run ก่อน/หลัง migration | ไม่เปลี่ยนค่าใดเลย | R45, acceptance 12 |
| TC-F10-MIGRATE-03 | seed ผู้เล่นเดิมมี class แต่ไม่มีชื่อ | เปิดจอสร้างตัวละคร | class ที่เลือกไว้แสดงล็อก เปลี่ยนไม่ได้ ตั้งชื่อได้ตาม R17–R22 ปุ่มสร้างกดได้เมื่อชื่อผ่าน | R47, A-E20 |
| TC-F10-MIGRATE-04 | seed ผู้เล่นเดิมยังไม่เลือก class เลย | เปิดจอสร้างตัวละคร | ใช้จอปกติ (เลือก class ได้อิสระ ไม่ล็อก) | R47 |
| TC-F10-MIGRATE-05 | seed ผู้เล่นเดิมมี run ค้าง | เปิดแอป | run เล่นต่อตาม F04 ไม่ถูกขัด · migration เริ่มหลังสรุป run ปิด · `first_run_entered`/`first_reward` ของ F06 ไม่รีเซ็ต | R48, A-E21 |
| TC-F10-MIGRATE-06 | seed onboarding F06 ค้างกลางทาง (ผ่านอายุแต่ยังไม่ตอบ consent) | เปิดแอป | ขั้นแรกที่ยังไม่ผ่านตาม R01 คือ login ก่อน (ไม่ใช่กระโดดกลับ consent ตรง) | A-E22 |

### 3.7 ข้อมูลในเครื่อง, PDPA, ไม่มี network ออกไปผู้ให้บริการ login (R49–R52, NN-4, NN-7)

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-PDPA-01 | เดินครบ flow ใหม่ทั้งเส้น (login มีอีเมล/password จริง) | สแกน `localStorage`, `sessionStorage`, `IndexedDB` ทุก key | มีแค่ 3 key ใหม่ใต้ `kw.p2.` ตาม R49 (account: provider+signedIn, ชื่อตัวละคร, ธงเรื่องผ่าน) · ไม่มีอีเมล/password/token/ปีเกิด/ข้อมูลจาก provider ใดๆ | R49, acceptance 3 |
| TC-F10-PDPA-02 | ต่อจาก 01 | export ข้อมูล (telemetry export + data export ถ้ามี) | ไม่พบค่าที่พิมพ์ในช่องอีเมล/password, ไม่พบชื่อตัวละคร, ไม่พบคำที่ตัวกรองจับได้ | R50, acceptance 3, 6 |
| TC-F10-PDPA-03 | ต่อจาก 01 | ตรวจ telemetry buffer สดและ URL ตลอด flow | ไม่มี PII ใน property ใดของ 8 event ของ §2b · ไม่มีค่าที่พิมพ์ปรากฏใน URL | R50, telemetry §2b, acceptance 6 |
| TC-F10-PDPA-04 | จอ login/email/register/forgot | เปิด network devtools ดักทุก request ตั้งแต่กดปุ่มยืนยันจนถึงแผนที่ | ไม่มี request ใดออกไป origin ของ Google/Apple/บริการอีเมลจริง (นอก allowlist ของแอปเอง) | R12, C2-1, acceptance 2 |
| TC-F10-PDPA-05 | จอ login ทุกแบบ | อ่าน copy ของจอสมัคร/ลืมรหัสผ่าน | ไม่สัญญาว่ามีอีเมลส่งจริง ไม่สัญญาว่าข้อมูลย้ายข้ามเครื่องได้ | R12 |
| TC-F10-PDPA-06 | จอไหนก็ได้ของ F10 | หาจุดที่อาจดึงข้อมูลจาก provider (ชื่อ/รูป/อีเมล) | ไม่มีจอใดดึงหรือนำมาแสดง (Phase 2 ไม่มี provider จริง) | R51 |
| TC-F10-PDPA-07 | จอ consent | ตรวจว่า consent ตำแหน่งเป็นจอแยกจาก login | ไม่มี checkbox รวมกับปุ่ม login ใดๆ consent ยังเป็นจอของตัวเอง | R52 |
| TC-F10-PDPA-08 | ทุก key ใน `kw.p2.*` | grep โค้ด client หา literal ไทยที่ควรเป็น copy key | ไม่มีสตริงไทย hardcode ในโค้ด (ทุกป้ายอ้าง `copy.th.json`) | NN-3, acceptance 13 |
| TC-F10-PDPA-09 | diff ของ build F10 (T14/T15/T17) | เทียบกับ tech gate checklist | ไม่แตะ reward, movement gate, HP, run state (ยกเว้นเรียก `manual_exit` เดิม) | R05 หัวข้อ 2, acceptance 13 |

### 3.8 Regression: render() ทุก state change ต้องไม่ทำค่าฟอร์มหาย (บั๊กคลาส P2-X59)

บริบท: `apps/client` render แบบ re-render ทั้ง state บ่อยครั้ง (ทุก tick, ทุก GPS sample) — P2-X59 เคยพบว่า age-gate birth-year select หลุดค่าเดิมเพราะ render ทับ DOM โดยไม่รักษาค่าที่ผู้เล่นพิมพ์/เลือกไว้อยู่ก่อน คลาสบั๊กนี้เสี่ยงซ้ำกับทุกจอใหม่ของ F10 ที่มีช่องกรอก/ตัวเลือก

| id | precondition | ขั้นตอน | คาดหวัง | rule |
| --- | --- | --- | --- | --- |
| TC-F10-RENDER-01 | จอ email login | พิมพ์ในช่องอีเมลและ password บางส่วน แล้วค้างหน้าจอไว้ ≥ 10 วินาทีโดยไม่แตะอะไร (ปล่อยให้ interval/GPS/animation ใดที่ทำงานอยู่เบื้องหลัง trigger re-render) | ค่าที่พิมพ์ยังอยู่ครบในช่องหลังรอ ไม่หาย ไม่ reset cursor position กลางคำ | P2-X59, R11 |
| TC-F10-RENDER-02 | จอสร้างตัวละคร | เลือก class, พิมพ์ชื่อบางส่วน (ยังไม่กดสร้าง) แล้วค้างหน้าจอไว้ ≥ 10 วินาที | ค่า class ที่เลือกและชื่อที่พิมพ์ยังอยู่ครบ ไม่ reset กลับว่าง ไม่เด้ง focus | P2-X59, R17, R21 |
| TC-F10-RENDER-03 | จอสร้างตัวละคร, ชื่อไม่ผ่านตัวกรอง (error แสดงอยู่) | ค้างหน้าจอไว้ ≥ 10 วินาทีโดยไม่แก้ไข | ข้อความ error เดิมยังแสดงต่อเนื่อง ไม่กระพริบหาย ไม่กลับมาใหม่ซ้ำ | P2-X59, R19 |
| TC-F10-RENDER-04 | จอยืนยันอายุ (ของ F06 เดิม รวมเข้า flow ใหม่) | เลือกปีเกิด ค้างไว้ ≥ 10 วินาที | ค่าที่เลือกยังอยู่ (regression check ซ้ำของ P2-X59 ในบริบท flow ใหม่ที่ login มาก่อนแล้ว) | P2-X59 |
| TC-F10-RENDER-05 | จอ email register/forgot | พิมพ์ในช่อง แล้วสลับแท็บเบราว์เซอร์ไปมา (visibilitychange อาจ trigger re-render) กลับมาที่แท็บเดิม | ค่าที่พิมพ์ยังอยู่ | P2-X59, R11 |

## 4. Traceability: acceptance 1–13 → case

| # | acceptance (ย่อ) | case |
| --- | --- | --- |
| 1 | ลำดับ 8 ขั้นเป๊ะ · ปฏิเสธ consent ข้าม permission ยังถึงแผนที่ | TC-F10-FLOW-01, -02 |
| 2 | ทุกปุ่มยืนยัน → อายุ (หรือแผนที่เมื่อ `SignedOut`) · ไม่มี request นอก allowlist | TC-F10-FLOW-04, -10, TC-F10-PDPA-04, TC-F10-LOGOUT-06 |
| 3 | ค่าอีเมล/password ไม่หลงเหลือในเก็บข้อมูลใด · `kw.p2.account` มีแค่ provider+signedIn(+schemaVersion) | TC-F10-PDPA-01, -02 |
| 4 | อายุต่ำกว่าเกณฑ์: ไม่มี key ใหม่ใด | TC-F10-FLOW-07, -08 |
| 5 | ตัวกรองชื่อตรงทุก vector · สุ่ม 10,000 seed ผ่านทุกครั้ง · ปุ่มสร้างล็อกจนครบเงื่อนไข | TC-F10-NAME-02, -03, -04, -08, -09 |
| 6 | ไม่พบชื่อตัวละครใน telemetry/export · ไม่มีจอผู้อื่นแสดงชื่อ | TC-F10-NAME-16, TC-F10-PDPA-02, -03 |
| 7 | เรื่อง 5 slide: ปุ่มถูกต้องต่อ slide, ข้ามได้, ไม่เห็นซ้ำ, ไม่เอ่ยระบบห้ามสอน | TC-F10-STORY-01, -02, -03, -07, -08 |
| 8 | nav 5 ช่องเห็นถูกจอ ไม่เห็นผิดจอ ที่ 360/390 px · Setting ไม่ทับ HUD | TC-F10-NAV-03, -04, -08 |
| 9 | จอเร็วๆ นี้ 3 จอไม่มีกลไก/เงื่อนไข/ตัวเลข/จำนวนคน | TC-F10-NAV-06, -07 |
| 10 | logout นอก run ข้อมูลเดิมครบ + relogin ตรงแผนที่ · logout ระหว่าง run จบ `manual_exit` ของครบไม่ผ่าน Grace/Suspended/timeout | TC-F10-LOGOUT-02, -03, -04, -06 |
| 11 | ลบข้อมูล: ไม่เหลือ `kw.p2.*` ใด, กลับจอเริ่มเกม, ปุ่มใช้ไม่ได้ระหว่าง run | TC-F10-LOGOUT-09, -10 |
| 12 | migration ผู้เล่นเดิม: login → ตั้งชื่อ (class ล็อก) → เรื่อง → แผนที่ · ข้อมูลเดิมไม่เปลี่ยน · run ค้างเล่นต่อได้ก่อน | TC-F10-MIGRATE-01, -02, -05 |
| 13 | diff ไม่แตะ reward/gate/HP/run state · ค่าตัวกรอง/ป้ายจาก config/content/copy | TC-F10-PDPA-08, -09 |

## 5. Traceability: edge case A-E1–A-E26 → case

| edge case | case |
| --- | --- |
| A-E1 | TC-F10-FLOW-07 |
| A-E2 | TC-F10-FLOW-11 |
| A-E3 | TC-F10-FLOW-12 |
| A-E4 | TC-F10-FLOW-11 |
| A-E5 | TC-F10-FLOW-11 |
| A-E6 | TC-F10-STORY-06 |
| A-E7 | TC-F10-NAV-01 |
| A-E8 | TC-F10-NAME-06 |
| A-E9 | TC-F10-NAME-12 |
| A-E10 | TC-F10-NAME-10, -11 |
| A-E11 | TC-F10-NAME-13 |
| A-E12 | TC-F10-FLOW-03 |
| A-E13 | TC-F10-LOGOUT-08 |
| A-E14 | TC-F10-LOGOUT-03, -04 |
| A-E15 | TC-F10-LOGOUT-10 |
| A-E16 | TC-F10-FLOW-13 |
| A-E17 | TC-F10-FLOW-14 |
| A-E18 | TC-F10-FLOW-15 |
| A-E19 | TC-F10-FLOW-16 |
| A-E20 | TC-F10-MIGRATE-03 |
| A-E21 | TC-F10-MIGRATE-05 |
| A-E22 | TC-F10-MIGRATE-06 |
| A-E23 | TC-F10-FLOW-17 |
| A-E24 | TC-F10-FLOW-18 |
| A-E25 | TC-F10-FLOW-19 |
| A-E26 | out-of-scope ของ F10 (spec §6) — ไม่มี case, ตรวจแค่ว่า F10 ไม่เพิ่ม UI ใดสำหรับ party/level-band |

## 6. e2e เดิมที่ต้องแก้เพราะลำดับ onboarding เปลี่ยน (สำหรับ P2-F10-T16)

ค้นด้วย `grep -rln "intro-screen\|age-gate\|class-select\|consent" apps/client/e2e qa/tests/e2e` (คำสั่งของ task brief) แล้วอ่านแต่ละไฟล์เพื่อแยกว่าไฟล์ใดพังจริง vs. ใช้ query-param bypass ที่อาจรอด — พบว่ากลไก bypass หลักที่ทุกไฟล์อาศัยคือ query param `e2eSkipOnboarding=1` (D-130, P2-F06-T10) ซึ่ง**ปัจจุบันข้ามแค่ intro/class-select (ของ F06)** เท่านั้น ยังไม่รู้จักขั้น login/สร้างตัวละคร(ชื่อ)/เรื่องเล่าของ F10 เลย — ความเสี่ยงเดียวที่ครอบทุกไฟล์ในกลุ่ม B คือ **ถ้า P2-F10-T12 ไม่ขยายพฤติกรรมของ `e2eSkipOnboarding=1` ให้ข้ามขั้น login/character/story ของ F10 ไปด้วย ทุกไฟล์กลุ่ม B จะพังพร้อมกันด้วยอาการเดียวกัน: หน้าที่โหลดกลายเป็นจอ login แทนแผนที่/จอ run ที่ทดสอบต้องการ**

### กลุ่ม A — พังแน่นอน ต้องเขียนใหม่จริง (ไม่ใช่แค่ปรับ query param)

| ไฟล์ | ทำไมพัง | เจ้าของที่แก้ |
| --- | --- | --- |
| `apps/client/e2e/onboarding.spec.ts` | ขับจอจริงตรงๆ: `.intro-screen` → `.age-gate-screen` → `.consent-location-screen` → class-select sheet ตามลำดับ F06 เดิม (login มาแทรกก่อน age-gate ตาม D-149, และ class-select ถูกรวมเข้า `O-character` พร้อมช่องชื่อใหม่ตาม R15/F10-R01) ต้องเพิ่มขั้น login และเปลี่ยนขั้น class-select เป็นจอสร้างตัวละคร (class+ชื่อ) ทั้งหมด รวมเพิ่ม assertion ของเรื่องเล่า 5 slide ก่อนถึงแผนที่ | qa-tester (T16) เขียนใหม่ตาม §3.1–3.3 ของแผนนี้ · gameplay-programmer (T14/T15) ต้องส่ง selector/route จริงมาให้ก่อน (tech note T07) |

### กลุ่ม B — เสี่ยงพังยกชุดถ้า `e2eSkipOnboarding=1` ไม่ถูกขยาย (ต้องตรวจ ไม่ใช่แก้ทันที)

| ไฟล์ | ใช้ flag อะไรอยู่ | สิ่งที่ต้องยืนยันจาก T07/T12 |
| --- | --- | --- |
| `apps/client/e2e/full-run.spec.ts` | `e2eSkipOnboarding=1` | flag ต้องเขียน `kw.p2.account`(signedIn)+ชื่อตัวละคร+ธงเรื่องผ่านให้ครบ ไม่ใช่แค่ข้าม intro/class |
| `apps/client/e2e/location-mock.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `apps/client/e2e/withdraw-consent.spec.ts` | `e2eSkipOnboarding=1` + seed `kw.p2.consent` เอง | เดียวกัน + ตรวจว่า seed `kw.p2.consent` เพิ่มเติมยังพอสำหรับสถานะ "เคย withdraw ได้" หลัง F10 |
| `apps/client/e2e/f06-hp.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `apps/client/e2e/pocket-screen.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `apps/client/e2e/toast-position.spec.ts` | `e2eSkipOnboarding=1` (2 จุด) | เดียวกัน |
| `apps/client/e2e/telemetry-export.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f04-closed-dungeon.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f02-map-fixture-tile.spec.ts` | `e2eSkipOnboarding=1` (ตั้งผ่าน `URLSearchParams`) | เดียวกัน |
| `qa/tests/e2e/f06-confirm-hp-notice.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f04-f05-no-raw-copy-key.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน — เพิ่มเติม: ต้อง grep ป้ายใหม่ของ F10 (login/สร้างตัวละคร/nav/เร็วๆ นี้) เข้าไปในชุดที่ไฟล์นี้สแกนหา raw copy key ด้วย (ไม่ใช่แค่ F04/F05) |
| `qa/tests/e2e/f04-checkin-confirm-flow.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f02-map-network-resilience.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/f04-origin-allowlist.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน — เพิ่มเติม: allowlist ที่ไฟล์นี้ตรวจต้องครอบคลุมด้วยว่าจอ login ของ F10 (Google/Apple ปุ่ม) ไม่แอบเรียก origin จริง (คนละมุมกับ TC-F10-PDPA-04 ที่ตรวจจากจอ login ตรงๆ) |
| `qa/tests/e2e/f06-toast-two-lines-real-run.spec.ts` | `e2eSkipOnboarding=1` | เดียวกัน |
| `qa/tests/e2e/visual/capture-f04-f06-screens.ts` (สคริปต์ถ่ายภาพ ไม่ใช่ spec) | `e2eSkipOnboarding=1` ทุก URL (9+ จุด) | เดียวกัน — ถ้า flag ไม่ครอบ ภาพหน้าจอทั้งหมดของสคริปต์นี้จะกลายเป็นภาพจอ login แทนภาพที่ต้องการ ต้องรันซ้ำทั้งชุดหลัง T12 |

### กลุ่ม C — น่าจะไม่กระทบ แต่ต้องยืนยันหนึ่งจุด

| ไฟล์ | เหตุผลที่คาดว่าไม่กระทบ | จุดที่ต้องยืนยัน |
| --- | --- | --- |
| `apps/client/e2e/map-shell.spec.ts` | ส่วนใหญ่ทดสอบ map spike ด้วย query param เปิด MapLibre ตรงๆ (`e2eTilesUrl`/`e2eGlyphsUrl`/`e2eSpriteUrl`) ไม่ผ่าน router ของ onboarding เลย ไม่มี `e2eSkipOnboarding` ในไฟล์นี้ | เทสต์เดียวที่ seed `kw.p2.consent` เพื่อโชว์ปุ่ม start-location/follow-toggle (บรรทัด ~169) ต้องตรวจว่า boot-time gate ของ `main.ts` ยังอ่านแค่ `kw.p2.consent` เป็นเงื่อนไขจริง หรือหลัง F10 ต้องมี `kw.p2.account.signedIn=true` ด้วยถึงจะเห็นปุ่ม (ถ้าใช่ ต้อง seed เพิ่ม) |

รายการทั้งหมด (กลุ่ม A+B+C) ต้องรันซ้ำเป็นชุดหลัง P2-F10-T14/T15/T17 DONE ภายใต้ P2-F10-T16 (fix) แล้วยืนยันเขียวจริงใน P2-F10-T19/CI local report — งานนี้ (T08) ส่งแค่รายการและเหตุผล ไม่ใช่ตัว fix (T16 เป็นคนแก้ตามที่ acceptance ของ T08 ระบุ "พร้อมเจ้าของที่แก้")

## 7. งานสนามที่ไม่ต้องการ trace ใหม่

F10 ไม่แตะ movement gate/GPS ตรง — case ทั้งหมดใช้ trace เดิมที่มีอยู่แล้ว (`synthetic-park-loop-01` ฯลฯ) เท่าที่ยังต้องเดิน run เพื่อตรวจ nav ไม่บัง HUD (3.5) และ logout ระหว่าง run (3.6) · ไม่มี handoff ใหม่ถึง location-engineer สำหรับ F10

## 8. สมมติฐานและคำถามค้าง

- [ASSUMPTION A-P2-F10-T08-1: `e2eSkipOnboarding=1` (P2-F10-T12) จะถูกขยายให้เขียน `kw.p2.account`(provider+signedIn), ชื่อตัวละคร (จาก `e2eClassId` ที่มีอยู่แล้ว + ชื่อ placeholder คงที่), และธงเรื่องผ่าน ครบสามอย่างพร้อมกัน — ไม่ใช่แค่ข้าม intro/class เหมือนเดิม มิฉะนั้นทุกไฟล์กลุ่ม B ของหัวข้อ 6 (16 ไฟล์ + สคริปต์ถ่ายภาพ) พังพร้อมกันวันแรกที่ T14 build เสร็จ · owner ยืนยัน: tech-lead (T07), backend-programmer (T12) · blocking: ไม่บล็อกแผนนี้ (ระบุ risk ไว้แล้วในหัวข้อ 6) แต่บล็อก T16/T19 ถ้าไม่จริง]
- [ASSUMPTION A-P2-F10-T08-2: seed migration ของ §3.6 (ผู้เล่นเดิมมี F06 flag แต่ไม่มี F10 account/ชื่อ) ทำผ่าน `addInitScript` เขียน localStorage ตรง เหมือนที่ `withdraw-consent.spec.ts`/`map-shell.spec.ts` ทำกับ `kw.p2.consent` — รายชื่อ key ที่แน่นอน (schema version, ชื่อ key) เป็นของ T07 ยังไม่ประกาศ ณ วันที่เขียนแผนนี้ (spec §3.8 บอกแค่ชื่อ prefix `kw.p2.*` ไม่ใช่ schema เต็ม) · owner ยืนยัน: tech-lead (T07) · blocking: ไม่บล็อกแผนนี้ (case เขียนแบบอ้างพฤติกรรม ไม่อ้าง key ตรงๆ) แต่บล็อก T19 เขียน e2e จริง]
- [ASSUMPTION A-P2-F10-T08-3: `.intro-screen`, `.age-gate-screen`, `.consent-location-screen` selector เดิมของ F06 (ที่ `onboarding.spec.ts` ใช้อยู่) จะยังใช้ชื่อ class เดิมต่อใน flow ใหม่ (แค่ลำดับเปลี่ยน ไม่เปลี่ยนชื่อจอ) ส่วนจอใหม่ (`login`, `create-character` รวม class+ชื่อ, `story/<n>`) จะได้ selector convention เดียวกัน (`.xxx-screen`) จาก T14/T15 — ยังไม่มี tech note ยืนยันชื่อ class จริง · owner ยืนยัน: tech-lead (T07) · blocking: ไม่บล็อกแผนนี้ แต่บล็อกการเขียนโค้ด e2e จริงของ T16/T19]
- [ASSUMPTION A-P2-F10-T08-4: TC-F10-NAME-04/-09 (vector runner + 10,000-seed property test) จะรันในไฟล์ทดสอบของ `packages/shared` (unit-level ของ backend-programmer) ไม่ใช่ e2e — งานนี้ (qa-tester) อ้างผลของทั้งสองไฟล์เป็นหลักฐานใน QA gate (T22) แทนการเขียนโค้ด import ซ้ำเอง ตามรูปแบบเดียวกับที่ F06-test-plan §0 ทำกับ `vectors.test.ts` · ถ้า backend-programmer ไม่ครอบ 10,000-seed property test ไว้ใน T12 เอง qa-tester จะเพิ่มไฟล์นี้เองใน `qa/tests/` แทน (สิทธิ์ของ qa-tester ตามหัวข้อ "You own" — black-box ผ่าน public interface ของ `packages/shared`) · owner ยืนยัน: backend-programmer (T12) · blocking: no]
- คำถามเปิดถึง game-director/product-manager (ไม่บล็อกแผนนี้ แต่ต้องตอบก่อน T19 เขียน case ของ `account_login_shown{context}`): [ASSUMPTION A-P2-F10-T05-2 ใน `product/telemetry-events.md`] ยังไม่ยืนยันว่า client แยก `first_time`/`relogin` ได้จริงตาม step machine — TC-F10-LOGOUT-06/-07 ต้องตรวจ property นี้ด้วยเมื่อ T14 มีโค้ดจริง ถ้า T01 final ตัดออก ให้ตัด assertion นั้นออกจาก TC-F10-LOGOUT-06 โดยไม่ต้องแก้ case อื่น

## 9. บันทึกการแก้

| วันที่ | task | ส่วนที่แก้ | สาระ |
| --- | --- | --- | --- |
| 2026-10-01 | P2-F10-T08 | ทั้งเอกสาร | ร่างแรกครบ: หัวข้อ 0–9 · case 85 ข้อ (FLOW 19, NAME 16, STORY 9, NAV 10, LOGOUT 11, MIGRATE 6, PDPA 9, RENDER 5) ครอบ R01–R52 ทุกข้อ, acceptance 1–13 ครบ, edge case A-E1–A-E26 ครบ (A-E26 out-of-scope โดยเจตนา) · รายการ e2e เดิม 3 กลุ่ม (A พังแน่, B เสี่ยงยกชุดถ้า flag ไม่ขยาย 16 ไฟล์+สคริปต์ภาพ, C ต้องยืนยัน 1 ไฟล์) |
