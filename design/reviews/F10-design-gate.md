# F10 Design gate — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav

task: P2-F10-T23 · ผู้ตรวจ: game-director · วันที่ 2026-10-01
อ้าง: `design/features/F10-account-shell.md` (หัวข้อ 3, 8, 10), `design/pillars.md` (NN-1..NN-8, 6.1, 6.2), D-144..D-149, D-163

**summary: verdict PASS** · คำสั่งคน D-144..D-149 ตรงจากภาพ · NN-1..NN-8 ไม่ถูกละเมิด · จอเร็วๆ นี้ครบ 5 เงื่อนไขของ pillars 6.2 · แก้ตาราง F06 3.8 แถว 0–1 ให้ชี้ F10 แล้ว · finding บล็อก 0 · ข้อสังเกตใหม่ 3 ข้อไม่บล็อก (หัวข้อ 7)

หมายเหตุ: บอร์ดไม่มี detail block "#### P2-F10-T23" (มีแค่แถวตารางบรรทัด 451) จึงตรวจตาม acceptance ใน task brief เป็นหลัก

## 1. สถานะ gate อื่น (บรรทัด verdict)

| gate | ไฟล์ | verdict |
| --- | --- | --- |
| flow approval | `design/reviews/F10-flow-approval.md` | PASS · N1, N2 ไม่บล็อก |
| tech (รอบ 2) | `docs/reviews/F10-tech-gate.md` | PASS · F-01..F-05 ปิด · diff `packages/shared/src/{reward,hp,session,run}` ว่าง |
| QA | `qa/reports/F10-qa-gate.md` | PASS · acceptance 1–13 MET · bug blocking 0 |
| copy (รอบ 2) | `design/reviews/F10-copy-gate.md` | PASS · F-01..F-06 ปิด · N-01 ค้าง |
| visual (รอบ 3, หลัง D-163) | `art/reviews/F10-visual-gate.md` | PASS · 10/10 ปิด · polish N-01..N-08 |
| product | `product/reviews/F10-product-gate.md` | PASS · คำสั่งคน 7/7 MET · PM-01..03 ไม่บล็อก |

## 2. คำสั่งของคน D-144..D-149 เทียบภาพ 360 px

| คำสั่ง | ภาพ | สิ่งที่เห็น | ผล |
| --- | --- | --- | --- |
| D-144 จอเริ่มเกมปุ่มเดียว | 01-start | ภาพรอยแยกกลางสวน + ปุ่มเหลือง "เริ่มเกม" ปุ่มเดียว ไม่มีปุ่มอื่น | ตรง |
| D-145 login Google/Apple + email | 02-login | หัว "เข้าสู่ระบบก่อนเริ่มเดิน" · ปุ่ม Google, Apple น้ำหนักเท่ากัน · ลิงก์รอง "ใช้อีเมลแทน" · บรรทัด "บัญชีทดสอบ อยู่แค่เครื่องนี้" บอกตรงว่าเป็น bypass | ตรง |
| D-146 สร้างตัวละคร class + ชื่อ | 06-create-character | การ์ด 4 ใบ ไม่มีค่าเลือกให้ · ช่องชื่อว่าง + ปุ่มสุ่ม · คำเตือนอย่าใช้ชื่อจริงถาวร · ปุ่ม "สร้างตัวละคร" ปิดอยู่จนครบเงื่อนไข · ไม่ทับแผนที่ | ตรง |
| D-147 เรื่อง 5 slide "ออกไปลุย!" | 09-story-slide-1 (+ 11 slide 5 เพื่อยืนยันปุ่มท้าย) | slide 1 "กรุงเทพฯ กำลังมีปัญหา" จุด 5 จุด ปุ่ม "ถัดไป" + "ข้าม" · slide 5 "ออกไปเดินเก็บของ" ปุ่มเดียว "ออกไปลุย!" ไม่มี "ข้าม" · ไม่มี nav ทั้งสองภาพ | ตรง |
| D-148 map หลัก + nav 5 + Setting บนขวา | 12-map-nav | nav ซ้ายไปขวา กระเป๋า, ตีบวก, แผนที่ (active), ร้าน, party · icon ตั้งค่ามุมบนขวา · การ์ดรอยแยกใกล้สุดพร้อมระยะเส้นตรงและปุ่มนำทาง · ไม่มี badge | ตรง |
| D-149 ลำดับ 8 ขั้น | ภาพข้างบนเรียงตามลำดับ + QA acceptance 1 (`onboarding.spec.ts:108`, `:317`) | ลำดับตรง F10-R01 · age/consent/permission ไม่อยู่ในชุดภาพที่ให้อ่าน ใช้หลักฐาน e2e | ตรง |

ภาพ 01 ไม่มีป้ายชื่อเกม (visual N-07) ไม่ขัดคำสั่ง เพราะ D-144 สั่งแค่ปุ่มเดียว · ประโยค "กรุงเทพฯ กำลังมีปัญหา" ของ pillars 6.1 อยู่ที่ slide 1 แทน

## 3. Non-negotiable 1–7 (และ NN-8) ทีละข้อพร้อมหลักฐาน

| ข้อ | สิ่งที่ตรวจ | หลักฐาน | ผล |
| --- | --- | --- | --- |
| NN-1 server-authoritative | F10 ไม่เพิ่มการตัดสินรางวัล damage หรือ contribution ใดบน client · ตัวกรองชื่อเป็นฟังก์ชัน pure ใน `packages/shared` พร้อมย้ายไป server Phase 3 (F10-R18, R22) · login เป็น bypass ไม่มี token | tech gate 3 "gate/reward/HP ไม่ถูกแตะ" · ชื่อไม่เข้า engine | ผ่าน |
| NN-2 movement gate | gate, tick, reward ไม่ถูกแตะ · ไม่มีของแรกเข้าจาก login/สร้างตัวละคร/เรื่อง · logout ระหว่าง run ใช้ `manual_exit` เดิม | tech gate 1 diff `packages/shared/src/{reward,hp,session,run}` ว่าง · ภาพ 18 · QA acceptance 10 | ผ่าน |
| NN-3 config-not-hardcode | ค่าตัวกรองชื่อจาก `config: character.name.*`, รายการคำจาก `content: character-names.th`, ป้ายทุกจอเป็น copy key · ชื่อ dungeon บนการ์ด (ภาพ 12) มาจาก content | tech gate รอบ 2 `lint:config` 0 allowed 0 stale · F-01 (hardcode ใน e2e seed) ปิด · QA acceptance 13 | ผ่าน |
| NN-4 ไม่มี PvP / free-text / ตำแหน่งคนอื่น | ช่องพิมพ์ที่เพิ่มมีแค่ชื่อตัวละคร (อยู่ในเครื่อง ไม่ส่งถึงใคร F10-R24) และช่อง login (ทิ้งทันที R11) · ไม่มีช่องข้อความระหว่างผู้เล่น · จอ Party ไม่มีจำนวนคนหรือ role (ภาพ 15) · ภาพ 12 ไม่มีตำแหน่งผู้เล่นอื่น | ภาพ 06, 12, 15 · QA acceptance 6 | ผ่าน |
| NN-5 outdoor | ไม่เกี่ยว ไม่แตะ data model ของ dungeon | spec หัวข้อ 10 | ผ่าน |
| NN-6 low penalty | logout ไม่ทำให้ของหาย (ภาพ 18 "ตัวละครกับของในเครื่องยังอยู่ครบ" + "รอบเดินที่ค้างอยู่จะจบตอนนี้") · auto-retreat ไม่เปลี่ยน · ลบข้อมูลถูกปิดระหว่าง run (ภาพ 18 "จบ run ก่อนถึงลบได้") · พิมพ์ชื่อไม่ผ่านไม่มีโทษ (R19) | ภาพ 16, 18 · QA acceptance 10, 11 | ผ่าน |
| NN-7 PDPA | อายุ + consent ยังอยู่และเรียงอายุ → consent → permission (QA acceptance 1) · account เขียนหลังผ่านอายุเท่านั้น ต่ำกว่าเกณฑ์ไม่มี key ใหม่ (QA acceptance 4) · consent เป็นจอของตัวเอง login ไม่ใช่ consent (R52) · ชื่อจริงไม่แสดง: ไม่ดึงชื่อ/รูป/อีเมลจาก provider (R51) และคำเตือนอย่าใช้ชื่อจริงถาวร (ภาพ 06) · อีเมล/password ไม่ถูกเก็บ (QA acceptance 3) · ชื่อตัวละครผ่านตัวกรอง 5 ข้อ (75 vector + 10,000 seed, QA acceptance 5) และอยู่ในเครื่องเท่านั้น ไม่อยู่ใน telemetry/export (QA acceptance 6) · ลบข้อมูลล้างทุก `kw.p2.*` (QA acceptance 11) | ภาพ 02, 06, 16 · `qa/tests/e2e/f10-pdpa-storage.spec.ts` | ผ่าน |
| NN-8 กฎคู่ | ไม่มีการแตะ auto-retreat หรือ gate ข้างใดข้างหนึ่ง | เหมือน NN-2 | ผ่าน |

GDD ที่ขัด: จุดเดียวคือ D-145 (มี password บนจอ email) คนอนุมัติแล้ว · ไม่มีสิ่งใดใน cut list v1 (AR, ในอาคาร, แชทอิสระ, avatar 3D, PvP)

## 4. pillars 6.2 ข้อยกเว้นจอเร็วๆ นี้ 5 เงื่อนไข (ภาพ 13, 15)

| เงื่อนไข | ภาพ 13 Upgrade ("ตีบวก ยังไม่เปิด" / "ช่างยังไม่เข้างาน ของเก็บไว้ก่อน") | ภาพ 15 Party ("party ยังไม่เปิด" / "ยังนัดเพื่อนไม่ลงตัว ใครว่างวันไหนก็ไม่รู้") | ผล |
| --- | --- | --- | --- |
| (1) หัวจอ + หนึ่งบรรทัด + nav ไม่มีปุ่มอื่น ช่องลงทะเบียน รางวัล | icon + หัว + บรรทัดเดียว + nav + ปุ่มตั้งค่า (ทางเข้า Setting ตาม R37 ไม่ใช่ปุ่มของระบบ) | เหมือนกัน | ผ่าน |
| (2) ไม่อธิบายกลไก ไม่บอกเงื่อนไขปลด ไม่มีตัวเลข ไม่มีวันที่ | ไม่มี · "ของเก็บไว้ก่อน" ชวนเก็บของ ไม่สอนตีบวก | ไม่มีตัวเลขหรือวัน · "ใครว่างวันไหนก็ไม่รู้" เป็นมุกปฏิเสธการสัญญาวัน | ผ่าน |
| (3) Party ไม่มีจำนวนคน role ผู้อื่น placeholder ชวนเดา | — | ไม่มีจำนวน ไม่มี role ไม่มีช่องว่างรอใส่คน | ผ่าน (ดู O-2) |
| (4) ไม่มี badge ตัวเลข push | nav ทั้งสองภาพและภาพ 12 ไม่มีจุดหรือตัวเลข | เหมือนกัน | ผ่าน |
| (5) nav ไม่ขึ้นใน onboarding 1–7 และจอ run | ภาพ 09, 11 (เรื่องเล่า) ไม่มี nav · จอ run ใช้หลักฐาน flow approval ข้อ 4 (`shellChromeVisible`) และ QA acceptance 8 ที่ 360/390 px | — | ผ่าน |

## 5. ประสบการณ์ผู้เล่นและ pillars P1–P5

- P1 เดินจริงเท่านั้นที่นับ: ไม่มีรางวัลจาก login หรือการสร้างตัวละคร · slide 5 จบด้วย "ของไม่เดินมาหาคุณ ต้องเดินไปเก็บเอง" แล้วปุ่ม "ออกไปลุย!" พาไปแผนที่ที่มีการ์ดรอยแยกใกล้สุด + ปุ่มนำทางเป็นสิ่งเด่นที่สุดบนจอ (ภาพ 12) · เส้นทางจากเรื่องถึงการเดินไม่มีจอคั่น
- P2 มาถึงแล้วต้องได้เล่น: ไม่มีขั้นที่ติดเพราะ consent/permission (F10-R03, R04) · login bypass ไม่มี error ทำให้คนเดินถึงแผนที่ได้เสมอ
- P3 เล่นด้วยกัน: Phase 2 ไม่มี party จริง จอ Party ไม่สร้างความคาดหวังเชิงตัวเลข
- P4 มือถืออยู่ในกระเป๋า: nav ไม่ขึ้นบนจอ run และจอพกกระเป๋า จึงไม่ดึงให้เปิดจอระหว่างเดิน
- P5 แห้ง: copy ผ่าน copy gate รอบ 2 · เจตนาที่ผมตรวจ: มุกของจอเร็วๆ นี้ไม่ชวนรอหรือเร่ง ไม่มี FOMO
- เวลาในนาทีแรก: ขั้นเพิ่มขึ้นจาก 5 เป็น 8 ขั้น แต่ทุกขั้นจอเดียวปุ่มเด่นเดียว เรื่องข้ามได้ · การวัดเวลาจริงเป็นของ playtest (คนถือเอง ไม่แตะ) และ product-manager ตาม pillars 6.2 ย่อหน้าข้อยกเว้น

## 6. F06 หัวข้อ 3.8 ตารางนาที (H62)

ก่อนแก้: แถว 0–1 ยังเขียน "intro → age → consent → permission → แผนที่ → sheet เลือก class ทับแผนที่" และคอลัมน์ "สิ่งที่ไม่มี" ยังเป็น "login, lore, ชื่อตัวละครแบบพิมพ์" ซึ่งขัด D-146, D-149 โดยตรง

แก้แล้วใน `design/features/F06-hp-damage-onboarding.md` 3.8 แถว 0–1 เท่านั้น: ลำดับชี้ F10-R01 (เริ่มเกม → login bypass → age → consent → permission → จอสร้างตัวละครไม่ทับแผนที่ F10-R15 → เรื่อง 5 slide ข้ามได้ → แผนที่) · "สิ่งที่ไม่มี" เปลี่ยนเป็น lore ยาว U8, nav ล่าง (F10-R33), การยืนยันตัวตนจริงหรือ network ของ provider · แถว 1–3 ถึง 8–10 และ R36–R43 ไม่ต้องแก้ (R36, R42 ชี้ F10 อยู่แล้ว)

ค้างนอก writes ของงานนี้: F06-R44 (หัวข้อ 3.9) ยังมีวงเล็บ "ตาราง 3.8 แถว 0–1 อ่านตาม F10 จนกว่าจะแก้ข้อความ" ซึ่งตอนนี้แก้แล้ว และหัวข้อ 12 ยังไม่มีบรรทัดบันทึกการแก้ของ T23 · ทำในงาน game-director ครั้งถัดไปที่แตะ F06 (ไม่บล็อก)

## 7. Findings

finding บล็อก: **0**

ข้อสังเกตใหม่ของ gate นี้ (ไม่บล็อก ไม่นับใน verdict):

| id | ถึง | เรื่อง | ข้อเสนอ |
| --- | --- | --- | --- |
| O-1 | uiux-designer | ภาพ 16: "ลบข้อมูลในเครื่อง" (สีอันตราย) อยู่แถวบนสุดของตั้งค่า ใกล้นิ้วแตะแรกที่สุด · ขัดเจตนา low penalty แม้มี confirm | ย้ายไปแถวท้ายต่อจาก "ออกจากระบบ" ในรอบที่แตะหน้าตั้งค่าครั้งถัดไป |
| O-2 | narrative-designer | ภาพ 15: "ยังนัดเพื่อนไม่ลงตัว" ชวนให้เข้าใจว่า party คือการนัดเพื่อนล่วงหน้า แต่ GDD party คือคนที่อยู่ dungeon เดียวกันในเวลาเดียวกัน (P3) · ไม่ใช่การสอนกลไก จึงไม่บล็อก | พิจารณามุกที่ไม่ผูกกับการนัดเพื่อน เมื่อทำ copy ของ party จริงใน Phase 3 |
| O-3 | game-director (ตัวเอง) | F06-R44 และหัวข้อ 12 ตามหัวข้อ 6 ข้างบน | แก้ข้อความเมื่อแตะ F06 ครั้งถัดไป |

## 8. รายการยกไป (backlog ไม่บล็อก) รวมจากทุก gate

| ที่มา | id | เจ้าของ | เรื่อง |
| --- | --- | --- | --- |
| flow | N1 | uiux-designer | ลบบรรทัดค้าง `F4-note-continued` ใน flow |
| flow | N2 | uiux-designer | D2 ระบุ key `story.slide4.bodySystem` ตัวเดียว (D-156) |
| tech | N-01 | tech-lead | ผูก baseline เบราว์เซอร์เป็น `build.target` ของ Vite ใน ADR ถัดไป |
| tech | N-02 | qa-tester | `DOMException [AbortError]` ของ happy-dom ตอน teardown · ตรวจใน P2-F10-CI |
| tech | N-03 | narrative-designer | `STORY_SLIDE_COUNT = 5` ย้ายไปนับจาก copy key ถ้าจำนวน slide เปลี่ยน |
| tech | N-04 | tech-lead | ถอด `PROVIDER_DISPLAY_NAME` เมื่อมี SDK จริง Phase 3 |
| tech | N-05 | gameplay-programmer | เติม assertion `validateCharacterName` ใน `e2e-skip-seed.test.ts` เมื่อแตะไฟล์ |
| QA | 7 | qa-tester | e2e จริงให้ 37 รายการ PARTIAL/GAP (กลุ่ม B/C) · FLOW-03 permission ถูกปฏิเสธจริง · NAV-10, LOGOUT-05, STORY-09 telemetry assertion |
| QA | 7 | backend-programmer | ชื่อ test "row 3" ของ MIGRATE-06 (`onboarding-step.test.ts:402`) |
| copy | N-01 | narrative-designer | การ์ด Ranged คำกำพร้า "ขึ้น", Magic ตัด "มีโล่กัน / แรงตี" (เห็นในภาพ 06) · เช็ก S-05-role-info ที่ใช้ key ซ้ำ |
| copy | N-02, N-03 | uiux-designer | N-02 ส่วนที่ visual รอบ 3 ปิดแล้วไม่ต้องทำ · N-03 context label `account.loginHeader` บน S-00-login (ภาพ 02 แสดงหัวแล้ว ให้ยืนยันว่าปิด) |
| visual | N-01, N-02 | artist-2d | slide 4 ท่าขา · slide 1 รอยแยกเล็กกว่าเกณฑ์จุดเด่น (ภาพ 09 ยืนยัน) |
| visual | N-03 | uiux-designer | "ข้าม" เป็นปุ่มกรอบหรือลิงก์ + ระยะห่างจาก "ถัดไป" ~4 px + banner คำเตือนชื่อติดขอบช่อง |
| visual | N-04, N-05 | gameplay-programmer | สีชื่อ class + แถบซ้าย · การ์ดที่ล็อกในจอ migration ใช้ `.btn-disabled` |
| visual | N-06 | narrative-designer | ป้าย "party" ภาษาอังกฤษใน nav และหัวจอ |
| visual | N-07 | narrative-designer → gameplay-programmer | ป้ายชื่อเกมบนจอเริ่มเกม/login (ชื่อยังไม่ final ถาม HUMAN ผ่าน producer) |
| visual | N-08 | qa-tester | ภาพโหมดกลางคืน ถ้าเปิด S9 ใน Phase 2 · ภาพกลางแดดยกไป P2-RISK-01 |
| product | PM-01, PM-02 | qa-tester / gameplay-programmer | assertion `nav_tab_opened`/`coming_soon_viewed` และ e2e ของลิงก์ "ข้าม" (`story_skipped`) |
| product | PM-03 | narrative-designer | ติดตามจาก copy F-05 ซึ่งปิดแล้ว · ไม่ต้องทำต่อ |
| design | O-1..O-3 | ตามหัวข้อ 7 | ตามหัวข้อ 7 |

ข้อเสนอการจัดงาน: รายการทดสอบ (tech N-02, N-05, QA 7, PM-01, PM-02) รวมเข้า P2-F10-CI ได้ · ที่เหลือเป็น polish รอบ F10.1 หรือรอบถัดไปที่แตะไฟล์นั้น

## 9. Verdict

**PASS** — F10 รับใช้การออกเดิน (เรื่องจบที่การเดิน แผนที่+ปุ่มนำทางเป็นหน้าหลัก) · ไม่ละเมิด NN-1..NN-8 · จอเร็วๆ นี้ครบข้อยกเว้น pillars 6.2 · ตรงคำสั่งคน D-144..D-149 · ไม่มี finding บล็อก
