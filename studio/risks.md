# Risk Register — GPS Dungeon Bangkok

เจ้าของไฟล์: producer · สร้างใน P2-RISK-01 (Phase 2, 2026-09-27) · ทบทวนทุกครั้งที่ปิด phase และทุก plan-sync ที่มีความเสี่ยงเปลี่ยน

ที่มา: GDD หัวข้อ "ความเสี่ยงที่ต้องเฝ้าดู" (สองจุด: หัวข้อ Progression และตารางท้ายเอกสาร) · `studio/phases/phase-1/report.md` หัวข้อ 8 · decision D-083..D-118 · `studio/phases/phase-2/ledger.md` · `design/systems/balance-model.md` (F-16..F-21) · `design/levels/pilot-dungeons.md` · `data/dungeons/README.md`

## 0. วิธีอ่าน

สถานะ (คำเดียวต่อแถว)

| สถานะ | ความหมาย |
| --- | --- |
| OPEN | ยังไม่มีมาตรการที่ใช้ได้จริง หรือรอหลักฐาน |
| MITIGATING | มีมาตรการแล้วบางส่วน ยังมีงานบน board ค้าง |
| WATCHING | มาตรการครบสำหรับ phase นี้ เฝ้าสัญญาณเตือนอยู่ |
| ACCEPTED | ยอมรับความเสี่ยงโดย decision (ระบุเลข) มีกำหนดทบทวน |
| CLOSED | ความเสี่ยงไม่เหลือแล้ว พร้อมหลักฐาน |

ระดับ: สูง = กั้นเกณฑ์ปิด phase หรือแตะ non-negotiable · กลาง = กระทบตารางเวลาหรือคุณภาพ playtest · ต่ำ = กระทบภายหลังหรือแก้ได้ถูก

เจ้าของ = role ที่ต้องเฝ้าสัญญาณและเปิดงานแก้ (agent หรือ HUMAN) · task ที่เกี่ยว = id บน board ของ phase ที่ระบุ

## 1. สรุปความเสี่ยงที่ต้องดูก่อน (ณ 2026-09-27)

| ลำดับ | id | เรื่อง | ระดับ | สถานะ |
| --- | --- | --- | --- | --- |
| 1 | R-P2-01 | ยังไม่มีการเดินทดสอบจริง → spike Go/No-go และงานที่ต้องใช้ผลสนามค้างทั้งสาย | สูง | OPEN |
| 2 | R-P1-02 | Wake Lock / จอล็อกแล้ว GPS บนเว็บหยุด → movement gate หาย | สูง | OPEN |
| 3 | R-P2-03 | jitter ของเครื่องจริงผ่านหรือไม่ผ่าน gate (F-16, TL N-11) | สูง | OPEN |
| 4 | R-P1-08 / R-P1-09 | coverage พระนครพอดีขอบ G2, บางรักไม่ผ่าน G2 | สูง | MITIGATING |
| 5 | R-P2-13 | คอขวด gameplay-programmer และ qa-tester บนเส้นวิกฤต | กลาง | WATCHING |
| 6 | R-P2-16 | ผู้ร่วม playtest ไม่ครบ 3 คน หรือขั้นยินยอมผู้ปกครองไม่ครบ | กลาง | OPEN |

## 2. ความเสี่ยงจาก GDD "ความเสี่ยงที่ต้องเฝ้าดู"

GDD หัวข้อ Progression ระบุช่องว่างราว 9 เท่าต่อวันระหว่างผู้เล่น 40 นาทีกับ 6 ชั่วโมง และให้เฝ้าสองเรื่องตอน beta (ราคายาในตลาด, เพดานเนื้อหา) ซึ่งรวมไว้ใน R-G04 และ R-G05 · ส่วนแถวอื่นมาจากตารางท้าย GDD ตามลำดับเดิม

| id | ความเสี่ยง | ระดับ | สัญญาณเตือน | มาตรการ | เจ้าของ | task ที่เกี่ยว | สถานะ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-G01 | Coverage ไม่พอ: ผู้เล่นเปิดแอปแล้วไม่มี dungeon ใกล้ | สูง | ผู้เล่นเปิดแอปแล้วไม่มี dungeon ใกล้ · ย่านเปิดตัวตก G2 (≥ 10 แห่ง) · การลงทะเบียนความสนใจนอกย่าน (`interest_registered_outside_area`) สูง | M0 ตอบก่อนเขียนโค้ดแล้ว (D-083 Go มีเงื่อนไข เปิด 3 ย่าน) · เปิดแบบจำกัดรายย่าน · จอ "นอกย่านเปิดตัว" + ลงทะเบียนรายเขต (D-096, D-101) · รายละเอียดรายย่านดู R-P1-08, R-P1-09, R-P2-09 | level-designer (ร่วม location-engineer) | P2-F04-T03, P2-F04-T04, P2-F04-T13, P2-F04-T18, P2-H01 | MITIGATING |
| R-G02 | Cold start ทางสังคม | กลาง | party เฉลี่ยขนาด 1 คน | เปิดเฉพาะพื้นที่ก่อน (D-083) · Phase 2 ไม่มี party และซ่อนจำนวนคน (D-089, D-100) จึงยังวัดไม่ได้ · ตั้ง metric ขนาด party ตอน F09 | product-manager | Phase 3 (F09) · PRD F04–F06 (P2-F04-T02) | WATCHING |
| R-G03 | ฤดูฝน | กลาง | DAU ตกช่วงฝน · นัด playtest เลื่อนเพราะฝน | กิจกรรมที่บ้าน (ตีบวก ตลาด) ตาม GDD ใน phase ที่มีระบบเหล่านั้น · ปฏิทิน live-ops กันช่วงฝน · Phase 2: นัด playtest เช้า/เย็น (D-093) ต้องมีวันสำรองกรณีฝนตก | liveops-operator (Phase 2: qa-tester สำหรับวันสำรองใน kit) | P2-F06-T18, P2-F06-T27 | OPEN |
| R-G04 | เงินเฟ้อ / คนเล่นน้อยซื้อยาไม่ไหว (GDD หัวข้อ Progression ข้อ 1) | กลาง | ราคายาในตลาดขยับขึ้นต่อเนื่อง · อัตราส่วนรายได้/ค่ายาของคนเล่น 40 นาทีต่ำกว่าเป้า D-005 | dashboard เศรษฐกิจ + ภาษีขั้นบันได (GDD) · D-038 B เป็นฐาน · ยาจาก drop ของ Phase 2 ต้องทบทวนก่อนร้าน NPC (ดู R-P2-07) | systems-designer (ร่วม liveops-operator) | Phase 4 (ตลาด, ร้าน NPC) · Q-P2-08 | OPEN |
| R-G05 | ผู้เล่นหนักถึงเพดานเนื้อหาเร็ว (GDD หัวข้อ Progression ข้อ 2) | กลาง | คนเลเวลสูงหายไปในสัปดาห์ที่ 3–4 | raid + ตีบวก (GDD) · หมายเหตุ: GDD เขียน "ตีบวกไม่มีเพดาน" แต่ D-080 (อนุมัติใน D-084) ตั้งเพดาน +15 → ต้องให้ game-director ยืนยันว่า raid คนเดียวรับปลายทางได้พอตอนวาง Phase 5–6 | game-director (ร่วม systems-designer) | P2-C09 (ถ้อยคำ D-080 ใน GDD) · Phase 5–6 | WATCHING |
| R-G06 | ทางเท้าเข้าไม่ถึงจริง | สูง | รายงานซ้ำที่ dungeon เดิม · ผู้ร่วม playtest หาทางเข้าไม่เจอ | คิวรายงาน + ปุ่มปิดฉุกเฉิน (GDD, รางวัลตาม D-059) · Phase 2: ทางเข้าทุกแห่ง `evidence: pending` (D-115) ต้องยืนยันภาคสนามก่อนใช้จริง ดู R-P2-09 | level-designer (ร่วม liveops-operator ตั้งแต่มีคิวรายงาน) | P2-F04-T13, P2-F04-T26, P2-F06-T27 | OPEN |
| R-G07 | กฎหมายเรื่องผู้เยาว์ | สูง | ผู้ร่วม/ผู้เล่นอายุ 15–19 เข้าโดยไม่มีขั้นยินยอมที่ถูกต้อง · ไม่มีความเห็นทนายก่อน launch | ปรึกษานักกฎหมายก่อน launch (GDD) · age gate มาก่อน consent ตำแหน่ง (D-096) · playtest Phase 2 รับ 15+ พร้อมฟอร์มยินยอมผู้ปกครองแบบกระดาษ เดินกับผู้ใหญ่ ต่ำกว่า 15 ไม่รับ (D-092) · ผู้ปกครองอายุ 15–19 (Q-P1-18) ต้องถามทนายก่อน Phase 7 | HUMAN (ร่วม product-manager) | P2-F06-T18 (`phase-2-parental-consent.md`), P2-F06-T27 · F20 | OPEN |

## 3. ความเสี่ยงที่ยกมาจาก Phase 1 (report หัวข้อ 8)

| id | ความเสี่ยง | ระดับ | สัญญาณเตือน | มาตรการ | เจ้าของ | task ที่เกี่ยว | สถานะ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-P1-01 | iOS web สั่นไม่ได้ (`navigator.vibrate` ไม่มีบน WebKit) → "สั่นก่อนเสียง" ใช้ได้แค่ Android | กลาง | probe บน iPhone รายงาน vibrate ไม่รองรับ · ผู้ร่วม playtest iPhone พลาดสัญญาณ HP/รางวัล | matrix ความสามารถเครื่อง + fallback ภาพ/เสียง (F-17) · ยืนยันด้วย probe ใน P2-F04-T11 และเดินทดสอบ P2-C02 · ห้ามให้สัญญาณสำคัญพึ่งการสั่นอย่างเดียว | tech-lead (ร่วม sound-designer, uiux-designer) | P2-F04-T10 (DONE), P2-F04-T11 (HUMAN), P2-F06-T12 | OPEN |
| R-P1-02 | Wake Lock และจอล็อก: D-063 พึ่ง Screen Wake Lock + pocket screen · ถ้าจอล็อกแล้ว GPS บนเว็บหยุด movement gate จะหาย | สูง | probe รายงาน wake lock หลุด/ไม่ได้รับ · ช่องว่างของ sample เกิน `maxSamplePairGap_s` ตอนจอดับ · สัดส่วนเวลาที่ถือ wake lock จริงต่อเวลา run (D-114) ต่ำ | probe พร้อมแล้ว (P2-F04-T10) · คนรันบน Android + iPhone (P2-F04-T11) · support matrix (P2-F06-T12) ก่อน deploy playtest · telemetry วัด wake lock share · ถ้าไม่รองรับ ต้องเป็น decision ของ game-director ว่าบอกผู้เล่นอย่างไร (ห้ามผ่อน gate) | tech-lead | P2-F04-T10 (DONE), P2-F04-T11 (HUMAN), P2-F06-T12, P2-F06-T26 | OPEN |
| R-P1-03 | เพดาน free tier ก่อน raid: rows written ของ D1/DO และ request | กลาง | usage แตะ 50/70% ของโควตาฟรี · tick เขียน row แยกต่อผู้เล่น | batch tick (ไม่เขียน row แยก) · alert 50/70% · runbook โควตาเต็ม · D-036 (Workers Paid) ต้องตัดสินก่อน Phase 6 · Phase 2 ไม่มี server (D-090) จึงยังไม่เกิด | devops-engineer (ร่วม tech-lead) | Phase 3 (server) · Phase 6 (D-036) | WATCHING |
| R-P1-04 | ค่าใช้จ่ายไม่คาดคิด: ผูกบัตรไว้แต่เลือก Free plan (D-085) | สูง | บริการหรือ plan ที่คิดเงินได้ถูกเปิด · มีรายการในหน้า Billing · workflow ใช้ GitHub Actions เกินฟรี | ห้าม agent/workflow เปิดบริการคิดเงิน (D-085) · token สิทธิ์แค่ Pages Edit · CI ตรวจ `_headers` และบริการคิดเงินแบบ static (P2-F04-T08 DONE) · runbook billing · HUMAN ตั้ง billing alert/spending limit | HUMAN (ร่วม devops-engineer) | P2-F04-T08 (DONE), P2-C07 (HUMAN) | MITIGATING |
| R-P1-05 | bundle S5 เกินงบ: 1.70 MB decoded · ถ้าวัดแบบ transfer เกิน 1.0 MB ต้อง code-split | ต่ำ | CI วัด brotli entry chunk เกินงบ · หน้าแรกโหลดช้าบนมือถือจริง | วัด bundle ด้วย brotli ของ entry chunk (D-095) · P2-F04-T10 รายงาน bundle ผ่านงบ · ตรวจเวลาโหลดจริงใน P2-C01/P2-C02 | gameplay-programmer (ร่วม tech-lead) | P2-F04-T10 (DONE), P2-C01, P2-C02 | WATCHING |
| R-P1-06 | speed lock จับคนเดินผิด: jitter ในซอยให้ 23.2–24.3 km/h ใกล้เพดาน | สูง | lock เกิดขณะคนเดินจริงใน trace จริงหรือใน playtest · ผู้ร่วมรายงานว่าโดนล็อกทั้งที่เดิน | ความเร็วแบบกรอง + กฎปลดเมื่อหยุดไฟแดง จาก trace จริง (P2-F05-T12, T13) · review P2-F05-T19 · ค่า lock 15 วิ / unlock 60 วิ มาจาก trace สังเคราะห์ ปรับได้หลัง P2-C03 (D-102) · safety briefing อธิบาย speed lock | systems-designer (ร่วม location-engineer) | P2-C03, P2-C04, P2-F05-T12, P2-F05-T13, P2-F05-T19, P2-F06-T18 | OPEN |
| R-P1-07 | คนเล่นคนเดียวอยู่รอดสั้น (D-020) กระทบ 10 นาทีแรก | กลาง | spec F06 R43 ไม่ผ่าน (เลเวล 1 ไม่มียา มัธยฐานถึง auto-retreat < 10 นาที) · ผู้ร่วม playtest ตายหรือถอยในรอบแรก | D-020 ยอมรับใน D-084 · F-18 ปิดด้วย D-112 (clamp เลเวลผู้เล่น): R43 ผ่านทุกช่วงนำร่องที่ครอบเลเวล 1 (มัธยฐานต่ำสุด 39.7 นาที) · ผลข้างเคียงดู R-P2-06 | systems-designer (ร่วม game-director) | P2-X09 (DONE), P2-X10 | WATCHING |
| R-P1-08 | coverage พระนคร: usable = 10 พอดีขอบ G2 แต่ publish ได้แค่ 7 | สูง | polygon ของ PN-6/PN-9/PN-10 วาดไม่ผ่าน · PN-9/PN-10 ยังค้าง review (ใกล้โรงเรียน/พิพิธภัณฑ์, PN-10 ชิดขอบ `minArea_m2`) · มีการตัด record ออกเงียบ | PN-1 publish ได้หลัง D-107 (รอ narrative ย้ายชื่อออกจาก `_held`) · ถ้าแห่งใดตก ต้องกลับไปที่ level-designer และตรวจ GR-1 ใหม่ ห้ามตัดเงียบ (D-099) · ไม่กระทบ playtest พระนคร (P2-F04-T13) · G2 ต้องครบก่อนเปิดตัวจริง ไม่ใช่เกณฑ์ปิด Phase 2 | level-designer (ร่วม narrative-designer, product-manager) | P2-F04-T13, P2-F04-T18, P2-F04-T26 | MITIGATING |
| R-P1-09 | coverage บางรัก: G2 = 6 ไม่ผ่าน · ปทุมวัน/บางรักยังไม่มี dungeon ครอบเลเวล 1 ที่เปิดทั้งสองช่วงเดิน | สูง | แผนทางเสริมหาเพิ่มไม่ถึง +2–4 · BR-3 (ทับที่เอกชน) / BR-4 (ธงสถานทูต) ไม่ผ่านตรวจ · นัด playtest ในสองย่านนี้ก่อนมี dungeon เลเวล 1 | แผนทางเสริม `design/levels/bangrak-plan.md` (+2–4) · ไปรษณีย์กลางตัดถาวร, สวนดุสิตอรุณรอตรวจสนาม, One Bangkok พักไว้, พัฒน์พงษ์ไม่ใช้ (D-109) · ห้ามนัด playtest ในปทุมวัน/บางรักจนมี dungeon เลเวล 1 ที่ opening_hours ยืนยันครอบช่วง D-093 (D-099) · GR-1 ยังผ่าน (R-P2-05) | level-designer (ร่วม location-engineer) | P2-F04-T04 (DONE), P2-F04-T13, P2-F06-T18 | MITIGATING |
| R-P1-10 | accuracy GPS ในซอยยังไม่รู้ | กลาง | สัดส่วน sample ที่ accuracy แย่กว่า `maxSampleAccuracy_m` (30 ม.) สูงใน trace จริง · check-in ไม่ผ่านในซอย | วัดใน P2-C02 (30 นาทีในซอย) · สรุปใน P2-C03 · ค่า gate ปรับได้หลังผลสนาม (D-102) | tech-lead (ร่วม location-engineer) | P2-C02, P2-C03, P2-C04 | OPEN |
| R-P1-11 | สัญญาอนุญาตข้อมูล OSM (ODbL, Q-P1-16) | กลาง | ถูกทักเรื่อง attribution · มีแผนใช้เชิงพาณิชย์ก่อนทนายตรวจ | เผยแพร่ polygon ใต้ ODbL 1.0 + attribution "© OpenStreetMap contributors" (D-091) · credits เป็นไฟล์ข้อมูลแยก (D-117) · ทวนกับนักกฎหมายใน F20 ก่อนเปิดตัวเชิงพาณิชย์ | HUMAN (ร่วม tech-lead สำหรับไฟล์ credits) | P2-F04-T13, P2-F05-T09 (DONE), P2-X18 (DONE) · F20 | ACCEPTED |
| R-P1-12 | economy (D-038): อัตราส่วนรายได้/ค่ายาของคนเล่นคนเดียว 1.3–4.5 ตาม build ต้องตัดสินก่อน F05/F11 | กลาง | อัตราส่วนของ build ใด build หนึ่งหลุดช่วง 2.5–3 เท่า (D-005) มาก · build ที่ต่ำสุดซื้อยาไม่พอเล่นต่อ | D-038 ทาง B อนุมัติใน D-084 · VIT ต่อยา +1% ใน `config/balance/progression.json` · P2-F06-T01: solo L25 = 2.69 · ถ้อยคำ GDD แก้ใน P2-C09 · ทบทวนอีกครั้งพร้อม R-G04/R-P2-07 เมื่อมี gold และตลาด | systems-designer | P2-F06-T01 (DONE), P2-C09 · Phase 4 | WATCHING |

## 4. ความเสี่ยงใหม่ของ Phase 2

### 4.1 สนาม อุปกรณ์ และ movement gate

| id | ความเสี่ยง | ระดับ | สัญญาณเตือน | มาตรการ | เจ้าของ | task ที่เกี่ยว | สถานะ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-P2-01 | ผลเดินทดสอบช้าหรือ No-go: ยังไม่มีการเปิด preview บนมือถือจริงและยังไม่เดิน · Phase 1 ยังไม่ปิด (D-086) | สูง | P2-C01/P2-C02 ยังเป็น HUMAN ค้างเมื่องาน build ของ F04–F06 ใกล้ gate · P2-C05 ตอบ No-go หรือ Go พร้อมเงื่อนไขที่แตะ map/run | งานที่ไม่ใช้ผลสนามเดินต่อได้ทั้งหมด สายสนามกั้นเฉพาะ F05-T12/T13, F06-T12, F06-T26 (TL plan review) · กฎสลับ 1 ให้ดึงงานสนามขึ้นเร็วได้ · ถ้า No-go: producer เปิด plan-sync ทันที ระบุงานที่ต้องแก้ ห้ามปิด gate หรือ exit item โดยไม่มี decision ของ HUMAN | HUMAN (ร่วม producer) | P2-C01, P2-C02, P2-C03, P2-C05, P2-C06, P2-C08 | OPEN |
| R-P2-02 | ไม่มีหลักฐานสนามกลางแดดจัด (V-17 ภาพจอกลางแดด, แบตในสภาพโหดสุด) เพราะทุกการเดินเป็นช่วงเช้า/เย็น (D-093) | กลาง | ผู้ร่วม closed beta รายงานอ่านจอไม่ออกกลางวัน · แบตหมดก่อนจบ run 45 นาที | ยอมรับสำหรับ Phase 2 (D-093) · ตรวจจอกลางแดดตาม V-17 และวัดแบตกลางวันก่อน closed beta (ต้องเป็นงาน HUMAN ใน phase ที่วาง closed beta) · ระหว่างนี้ใช้การตรวจขาวดำ/จำลองแดดแบบ render | art-director (ร่วม uiux-designer, HUMAN ถ่ายภาพ) | P2-F05-T07 (ตรวจแบบ render), P2-F06-T23 · phase ที่มี closed beta | ACCEPTED |
| R-P2-03 | jitter ของเครื่องจริงกับ gate (F-16, TL N-11): trace ม้านั่งผ่านด้วยขอบแค่ 7–13% ที่ cadence 5 วิ (53.4–56.5 ม. ต่อหน้าต่าง) และขนาด jitter เป็นค่าสมมติ | สูง | trace จริงของโต๊ะนิ่งได้ tick (รางวัลโดยไม่เดิน) · หรือนั่งม้านั่งไม่ได้ tick ทั้งที่ GDD บอกว่าได้ | ห้ามแตะเกณฑ์ 50 ม. และ cadence ไม่ต่ำกว่า 5 วิ (D-113) · ถ้าต้องเลือก "โต๊ะนิ่งไม่ผ่าน" ชนะ "ม้านั่งผ่าน" (game-director) · P2-C03 วัดเทียบ gate แล้วส่ง game-director ตามกฎ board ข้อ 4 · `sampleCadence_s` เป็นคันโยกเดียวที่ขยับได้ | tech-lead (ร่วม systems-designer, game-director ตัดสิน) | P2-C02, P2-C03, P2-C04, P2-F05-T20 (DONE) | OPEN |
| R-P2-04 | drift ช้าราว 15 กม./ชม. (แบบ S3) ยังนับระยะ (NN-8) | กลาง | trace จริงที่วางเครื่องนิ่งมีช่วง drift ช้าที่สะสมระยะเกิน 50 ม. ต่อหน้าต่าง | เฝ้าใน trace จริง (P2-C03, P2-C04) · ถ้าพบ ส่ง systems-designer + game-director พร้อม trace ห้ามแก้ด้วยเกณฑ์ gate หรือ auto-retreat (NN-8) · ตัวกรองความเร็ว (F05-T12/T13) ต้องไม่ทำให้ drift นับเพิ่ม | location-engineer (ร่วม systems-designer) | P2-F04-T12 (DONE), P2-C03, P2-C04, P2-F05-T12, P2-F05-T13 | WATCHING |
| R-P2-05 | GR-1 ไม่ผ่าน guardrail หรือข้อมูลนำร่องเปลี่ยน (PM-M3) | สูง | record นำร่องถูกพัก/ตัด (PN-9, PN-10, BR-3, BR-4) · แผนทางเสริมบางรักเพิ่ม/ลด dungeon · เลเวลช่วงเปลี่ยน | P2-F04-T18 ย้ายขึ้น W2 แล้ว: GR-1 ผ่านทั้ง 3 ย่าน · กฎสลับ 2: เกิน guardrail = blocking + plan-sync · กฎสลับ 3: ข้อมูลนำร่องเปลี่ยน = คำนวณ GR-1 ซ้ำ · D-099 ห้ามตัดเงียบ | product-manager (ร่วม level-designer) | P2-F04-T18 (DONE), P2-F04-T13, P2-F04-T04 | WATCHING |
| R-P2-06 | ผลข้างเคียงของ D-112 ต่อ playtest (F-20): เลเวล 1 แทบไม่เห็น auto-retreat ใน 30–60 นาที (มียา 50.7–116.2 นาที) · เลเวลอัปแรกที่ tick 4 | กลาง | playtest ไม่มีใครเห็น HP ต่ำหรือ auto-retreat จึงไม่มีข้อมูลความเข้าใจ loop HP · ผู้ร่วมรู้สึกว่าไม่มีความเสี่ยง | ไม่แก้ gate/auto-retreat/damage/config ของ playtest และห้าม build พิเศษ (D-116 P-3) · ปรับ kit ผู้สังเกตใช้ตาราง 18.4 และแบบสอบถาม · ทีมเดินตรวจสัญญาณ HP บนเครื่องจริง (F06-C32) ที่ dungeon ช่วง `level_range.min > 1` ซึ่ง level-designer ต้องเลือก | qa-tester (ร่วม product-manager, level-designer) | P2-F06-T11 (DONE), P2-F06-T18, P2-F06-T19, P2-F06-T27 | WATCHING |
| R-P2-07 | ยาจาก drop ของ Phase 2 มีมูลค่าราว 606 gold/ชม. ≈ ค่ายาทั้งหมดของ GDD (F-19) → ถ้าคงไว้ถึงร้าน NPC ค่ายาสุทธิเกือบศูนย์ | กลาง | วาง Phase 4 โดยไม่ตัดสิน Q-P2-08 · อัตราส่วนรายได้/ค่ายาหลุดเป้า D-005 ด้านบน | ใช้เฉพาะ Phase 2 (D-110) · Q-P2-08 ต้องตัดสินตอนวาง Phase 4: (ก) ตัดยาออกจาก drop เมื่อร้านเปิด หรือ (ข) คงไว้แล้วตั้งเป้าใหม่ · ถ้าคงไว้ต้องเป็น decision HUMAN | HUMAN (ร่วม systems-designer) | P2-F05-T01 (DONE) · Q-P2-08 · Phase 4 | ACCEPTED |
| R-P2-08 | exp ของคนที่เลเวลต่ำกว่าช่วงเกินอัตราเลเวลตรงโซน (F-21): สูงสุด 41× · กรณีอยู่รอดได้จริง 8.0× | ต่ำ | party ต่างเลเวลใน Phase 3 ใช้พาเลเวลต่ำไปฟาร์ม · เวลาขึ้นเลเวลช่วงต้นสั้นผิดปกติใน telemetry | ไม่แก้ใน Phase 2 · ทบทวนพร้อม F08 (party ต่างเลเวล) ใน Phase 3 ว่าควรมีเพดาน exp = อัตราเลเวลตรงโซนหรือไม่ · authority systems-designer | systems-designer | P2-X09 (DONE) · Phase 3 F08 | ACCEPTED |
| R-P2-09 | ทางเข้าทุกแห่งยังไม่ยืนยันภาคสนาม และ 6 แห่งค้าง review (PN-9, PN-10, PW-1, PW-6, BR-3, BR-4) | สูง | validator เตือน `entrance_unverified` 31 รายการ · หมุดทางเข้าอยู่หลังรั้ว/ประตูปิดตอนเดินจริง · BR-1 (ศาลเจ้า), BR-2/PW-4 (คร่อมถนนใหญ่) วาดไม่ผ่าน | ปักหมุด `evidence: pending` จนตรวจสนาม (D-115) · review ไม่ publish · ตรวจทางเข้าของ dungeon ที่ใช้ playtest ก่อนนัด (ใน kit หรือเดินของทีม) · วาดใหม่ด้วยเครื่องมือ GIS สำหรับแห่งที่ทับเขตห้าม | level-designer (ร่วม HUMAN ผู้เดินตรวจ) | P2-F04-T13, P2-F04-T26, P2-F06-T18, P2-F06-T27 | OPEN |

### 4.2 engine, client และเครื่องมือ

| id | ความเสี่ยง | ระดับ | สัญญาณเตือน | มาตรการ | เจ้าของ | task ที่เกี่ยว | สถานะ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-P2-10 | Grace ค้างในแถบ 5 ม. ได้ไม่มีเพดาน เพราะ Phase 2 ยังไม่มี `pendingSetMax_s` (J-P2-T30-2, A-P2-X04-1) | ต่ำ | trace/playtest มี run ค้าง Grace นานผิดปกติ · timeout เก็บของได้แค่ทางช่องว่างของ sample (D-104) | ยอมรับเฉพาะ Phase 2 (D-113, D-118) · Phase 3 ตั้ง `pendingSetMax_s` = 90 วิ (D-116 P-4) ก่อน server เป็นผู้ตัดสิน · D-104 ยัง PROPOSED ต้องให้ tech-lead ปิด | game-director (ร่วม systems-designer, tech-lead) | P2-X10, P2-X13 (DONE) · Phase 3 | ACCEPTED |
| R-P2-11 | Phase 2 ไม่ตรวจนาฬิกาเครื่องที่ถูกตั้งเดินหน้า (D-098) → dungeon ที่ปิดอาจแสดงว่าเปิด | ต่ำ | ผู้ร่วมรายงานว่าเข้า dungeon ได้นอกเวลาทำการ | ยอมรับเพราะ Phase 2 ไม่มีรางวัลจริง · นาฬิกาถอยหลังเกิน `clockSkewTolerance_s` จบ run เป็น `clock_invalid` · Phase 3 ใช้เวลา server | tech-lead | P2-F04-T14 (DONE) · Phase 3 | ACCEPTED |
| R-P2-12 | engine บน client ต่างจาก server (C1-1): Phase 2 client รัน reducer ใน `packages/shared` · Phase 3 ย้ายไป server | สูง | โค้ด client เรียก logic นอก `packages/shared` · vector ของ shared กับผลบน client ไม่ตรงกัน · server Phase 3 เขียน logic ใหม่แทนการใช้ reducer เดิม | ผลบน client ไม่ใช่รางวัลจริง (D-087) · pure reducer, ห้าม Date.now/Math.random/DOM ใน shared/geo (ESLint) · test vector ร่วมเป็นสัญญา (D-095) · ข้อยกเว้น C1-1..C1-5 หมดอายุ Phase 3 · state `kw.p2.*` ล้างใน Phase 3 · tech gate ตรวจว่า client ไม่มี logic รางวัลของตัวเอง | tech-lead (ร่วม backend-programmer, gameplay-programmer) | P2-F04-T05 (DONE), P2-F05-T15, P2-F04-T21 · Phase 3 | WATCHING |
| R-P2-13 | คอขวด gameplay-programmer (client F04–F06 ทั้งหมด) และ qa-tester (trace-replay, gate, regression, bug) บนเส้นวิกฤต | กลาง | งาน client เดียว (P2-F04-T21) ค้าง IN_PROGRESS ข้ามหลาย wave · งาน qa ต่อคิวเกิน 2 wave · fix จาก gate NEEDS_CHANGES ต่อคิว | backend ถือ engine ทั้งหมด (D-090, gameplay 10 → 8 งาน) · กฎสลับของ board และช่องว่าง W12–W16 รับ fix ก่อน · แยกงานที่ PARTIAL สองครั้ง · งานเตรียม qa (test plan, kit) ทำก่อน client เสร็จ | producer | P2-F04-T21, P2-F04-T22, P2-F05-T16, P2-CLOSE-QA | WATCHING |
| R-P2-14 | asset manifest เกินงบขนาด (V13 warn) | ต่ำ | V13 ของ `tools/art` เตือนต่อเนื่องหรือกลายเป็น error · เวลาโหลดหน้าแรกเพิ่ม | tech-lead ตัดสินงบหรือแยก manifest (handoff จาก P2-F05-T07) · artist ทำ slot-empty ที่เหลือโดยไม่เพิ่มขนาดเกินงบ | tech-lead (ร่วม artist-2d) | P2-F05-T07 (DONE), P2-F05-T04, P2-F06-T23 | OPEN |
| R-P2-15 | resvg ให้ pixel ต่างกันระหว่าง macOS กับ Linux (V12) → golden image ไม่ตรงใน CI | ต่ำ | V12 ผ่านบนเครื่อง dev แต่ตกใน CI หรือกลับกัน | ใช้ผลบน Linux (CI) เป็นอ้างอิง · ตั้ง tolerance หรือ render เฉพาะใน CI | tech-lead (ร่วม devops-engineer) | P2-F06-T07 (DONE), P2-F04-T08 (DONE) | OPEN |

### 4.3 คน ข้อมูลส่วนบุคคล และตารางเวลา

| id | ความเสี่ยง | ระดับ | สัญญาณเตือน | มาตรการ | เจ้าของ | task ที่เกี่ยว | สถานะ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-P2-16 | ผู้ร่วม playtest ไม่ครบอย่างน้อย 3 คน หรือกลุ่ม 15–17 ไม่มีฟอร์มยินยอมผู้ปกครองครบก่อนเดิน · ความปลอดภัยระหว่างเดิน | กลาง | ใกล้วันนัดแต่ยืนยันได้ไม่ถึง 3 คน · ผู้ร่วม 15–17 มาโดยไม่มีฟอร์มเซ็นหรือไม่มีผู้ใหญ่เดินด้วย · ผู้ร่วมมองจอขณะข้ามถนน | kit มีฟอร์มผู้ปกครองแบบกระดาษ + ขั้นรับฟอร์ม (D-092) · 15–17 เดินกับทีมหรือผู้ใหญ่ตลอด · ต่ำกว่า 15 ไม่รับ · safety briefing (รวม speed lock) · นัดเฉพาะพระนครจนกว่าปทุมวัน/บางรักมี dungeon เลเวล 1 (D-099) · มีวันสำรอง (ฝน, R-G03) | HUMAN (ร่วม qa-tester สำหรับ kit, product-manager สำหรับแบบสอบถาม) | P2-F06-T18, P2-F06-T19, P2-F06-T27 | OPEN |
| R-P2-17 | repo public: ข้อมูลตำแหน่งดิบหรือข้อมูลส่วนบุคคลหลุดเข้า git · ฟอร์มยินยอมที่เซ็นแล้วถูก commit หรือสแกน | สูง | ไฟล์ใน `qa/playtest/results/raw/` ถูก track · gitleaks หรือ test "ไม่มีพิกัดใน event/export" ตก · มีภาพสแกนฟอร์มหรือชื่อจริงใน `product/playtest/results/` | raw trace เป็น opt-in อยู่ใน `raw/` ที่ ignore · แปลงเป็น recorded trace เฉพาะเมื่อยินยอม (P2-C04 ไม่ยินยอม = CUT) · telemetry ไม่มีพิกัด มี test (D-088) · ฟอร์มผู้ปกครองเก็บนอก git ห้าม commit/สแกน (D-092) · qa ตรวจ E19 ซ้ำก่อน regression ปิด phase | devops-engineer (ร่วม qa-tester) | P2-C02, P2-C04, P2-F06-T27, P2-F06-T28, P2-CLOSE-QA | MITIGATING |
| R-P2-18 | usage limit ของ session AI หยุด agent กลางงาน (เกิดแล้ว 1 ครั้ง: 6 agent ใน W4 ต้อง resume, ledger แถว 40–41) | กลาง | agent หยุดพร้อมกันหลายตัว · งานต้อง resume มากกว่า 1 ครั้ง · ไฟล์ที่เขียนค้างครึ่งทาง | failure handling ของ protocol: กลับเป็น TODO พร้อม context resume (ครั้งแรก resume สำเร็จทั้ง 6) · chunked writes ≤ 120 บรรทัดลดงานที่หาย · ไม่เปิด wave เต็ม 6 ช่องใกล้เวลารีเซ็ตโควตา · ตรวจ board/ledger/decision log หลัง resume | producer (ร่วม orchestrator) | ทุก wave · ledger แถว 40–41 | WATCHING |
| R-P2-19 | กฎหมายก่อนเปิดตัวเชิงพาณิชย์ค้างรวมกันที่ F20: ODbL (D-091), ผู้ปกครอง 15–19 (Q-P1-18), ข้อความ legal/PDPA | สูง | ถึงการวาง phase ที่มี closed beta หรือ launch โดยยังไม่มีงาน HUMAN ปรึกษาทนาย | ติดตามร่วมกับ R-G07 และ R-P1-11 · HUMAN ทวนข้อความ legal/PDPA ก่อน closed beta (Phase 1 report หัวข้อ 9) · producer ใส่งาน HUMAN ปรึกษาทนายเป็นงานแรกของ phase ที่มี F20 | HUMAN (ร่วม producer) | F20 · Q-P1-18 · D-091 | OPEN |

## 5. การดูแล register

- producer ทบทวนทุกแถวตอนปิด phase (ใส่ในหัวข้อความเสี่ยงของ report) และตอน plan-sync ที่มีงานเกี่ยวข้องเปลี่ยนสถานะ
- agent ที่พบความเสี่ยงใหม่ใส่ไว้ในหัวข้อ risk ของ REPORT block พร้อมสัญญาณเตือน · producer เป็นคนเพิ่มแถว (agent อื่นไม่แก้ไฟล์นี้)
- เปลี่ยนสถานะเป็น CLOSED ได้เมื่อมีหลักฐาน (path, task id, หรือ decision) เท่านั้น · ACCEPTED ต้องมีเลข decision และกำหนดทบทวน
- งานที่ต้องทำจาก register ต้องเป็น task บน board เสมอ ไม่ทำจาก register ตรงๆ
- ห้ามใช้ register เป็นเหตุผลในการแตะ non-negotiable (เกณฑ์ 50 ม. ต่อ 5 นาที, server-authoritative, ไม่แสดงตำแหน่งรายบุคคล) ถ้ามาตรการใดขัด ต้องเป็น decision ของ HUMAN

จุดทบทวนถัดไป

| เมื่อ | แถวที่ต้องทบทวน |
| --- | --- |
| หลัง P2-C02 / P2-C03 | R-P1-01, R-P1-02, R-P1-05, R-P1-06, R-P1-10, R-P2-01, R-P2-03, R-P2-04 |
| หลัง P2-C05 (Go/No-go) | R-P2-01 และทุกแถวที่ task ที่เกี่ยวขึ้นกับ map spike |
| หลัง P2-F06-T27 / T28 | R-P2-06, R-P2-09, R-P2-16, R-P2-17, R-G03 |
| ปิด Phase 2 | ทุกแถว · ย้ายแถว Phase 3 (R-P2-08, R-P2-10, R-P2-11, R-P2-12, R-G02) เข้า plan ของ Phase 3 |
| วาง Phase 4 | R-G04, R-P2-07 (Q-P2-08) |
| ก่อน closed beta | R-P2-02, R-G07, R-P1-11, R-P2-19 |

## 6. Change log

| วันที่ | task | การเปลี่ยน |
| --- | --- | --- |
| 2026-09-27 | P2-RISK-01 | สร้างไฟล์: 7 แถวจาก GDD, 12 แถวจาก Phase 1 report หัวข้อ 8, 19 แถวใหม่ของ Phase 2 |
