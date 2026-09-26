# Plan review Phase 2 — game-director (P2-PLAN-REV-GD)

วันที่: 2026-09-26 · ตรวจ: `studio/phases/phase-2/board.md` DRAFT rev 1 (P2-PLAN-01)
เทียบกับ: `studio/roadmap.md` หัวข้อ Phase 2 · GDD (read-only) หัวข้อ "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "การเข้าและออก", "เวลาทำการ", "ระดับเลเวลที่เหมาะสม", "Core loop ใน Dungeon", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู", "Anti-cheat > มาตรการเป็นชั้น", "ความปลอดภัยผู้เล่นและ PDPA", "สัญญาณขาดและแอปถูกปิด", "หลักการที่ห้ามละเมิด", "M2" · config ที่มีอยู่ `config/balance/dungeons.json`, `anticheat.json`, `location.json` · decision D-020, D-059, D-063, D-064, D-072, D-073, D-079, D-083, D-084, D-086

## Verdict: NEEDS_CHANGES

ข้อค้นพบ blocking 9 ข้อ (B-01..B-09) และ non-blocking 8 ข้อ (N-01..N-08)
โครงของ board ถูกทาง: ขอบเขตตรง roadmap, ไม่มีสิ่งที่อยู่ในรายการตัดออกของ v1 (AR, dungeon ในอาคาร, แชทอิสระ, อวตาร 3D, PvP), auto-retreat 25% เปิดตั้งต้นและปิดได้เฉพาะหน้าตั้งค่า, ตาย = ของใน run หาย, auto-retreat = เก็บครบ, class 4 แบบในนาที 0–1, จอไกล/นอกพื้นที่/นอกย่านเปิดตัวครบตาม D-064/D-073, copy สามจังหวะมี content gate ของตัวเอง, logic อยู่ใน `packages/shared`/`packages/geo` แบบ pure
ปัญหาหลักอยู่ที่ **กฎของ GDD ที่ไม่มีเจ้าของใน board** (speed lock, check-in, ช่องว่างของ sample, แหล่งที่มาของยา), **การอนุมัติ flow ของ core loop ที่หายไป** และ **deps ที่ผิดลำดับ** ของ config และ copy

## 1. คำตัดสิน A-P2-PLAN-01-3 (การนำทาง)

**ACCEPTED พร้อมเงื่อนไข** · หลักตัดสิน: ข้อ 3 (ต้นทุนการเดินทางสูง ต้องช่วยให้ไปถึง) และข้อ 2 (ทุกอย่างผูกกับการเดินจริง) · กฎคุมค่าใช้จ่าย D-085
การนำทาง = ทิศ + ระยะเส้นตรงแบบประมาณ + ลิงก์เปิดแอปแผนที่ของเครื่อง ใช้ได้ใน Phase 2 และเป็นทิศทางของ v1 จนกว่าจะมีเหตุผลให้ใช้ routing จริง โดยมีเงื่อนไข:

1. **ระยะพูดความจริง** (pillars หัวข้อ 7 "ไกลต้องพูดความจริงเรื่องระยะ") · แสดงเป็นระยะเส้นตรงที่ปัดเป็นขั้นตาม N-02 และมีคำกำกับว่าเป็นระยะเส้นตรง ห้ามปัดลงจนดูใกล้กว่าจริง · ขั้นการปัดเป็น config (systems-designer) · เกณฑ์ "ไกล" ใช้ `config: unlocks.home.farDungeonThreshold_m` ที่ปรับด้วย route factor แล้ว (D-072, D-079)
2. **ไม่วาดเส้นทางในแอป** · ทิศแสดงเป็นลูกศร/ข้อความทิศจากจุดของผู้เล่นเท่านั้น ห้ามวาดเส้นตรงถึง dungeon เพราะจะดูเหมือนเดินตัดแม่น้ำ ทางด่วน หรือทางรถไฟได้ (GDD "ความปลอดภัยทางกายภาพ" blocklist cell) · ไม่มี turn-by-turn ในแอป เพื่อไม่ให้ต้องจ้องจอขณะเดิน
3. **ลิงก์ภายนอกส่งเฉพาะปลายทาง** · ปลายทาง = จุดสาธารณะของ dungeon (ทางเข้าที่ปักไว้ ถ้ามี ไม่งั้นจุด label ตาม D-075) ไม่ใช่ centroid ที่อาจอยู่หลังรั้ว · โหมดเดินเท้า · **ห้ามใส่ตำแหน่งของผู้เล่นใน URL** (แอปแผนที่หาตำแหน่งเอง) · ไม่ใช้ API key ไม่ใช้บริการคิดเงิน · การกดลิงก์เป็นการกระทำของผู้เล่นเอง ข้อมูลที่ออกจากเครื่องมีแค่พิกัดของสถานที่สาธารณะ จึงไม่ขัด A-P2-PLAN-01-2
4. **dungeon ที่ปิด** ยังนำทางได้แต่แสดงเวลาเปิดถัดไปก่อนปุ่ม (ia.md S-06) · onboarding นาที 1–3 เลือก dungeon ที่ **เปิดอยู่** ใกล้สุดเท่านั้น
5. tech-lead ยืนยันรูปแบบลิงก์บน Android Chrome และ iOS Safari ใน P2-F04-T14 (fallback เมื่อเปิดแอปแผนที่ไม่ได้ = แสดงชื่อสถานที่ให้คัดลอกไปค้นเอง) · game-director เขียนกฎข้อ 1–4 ลง spec F04 ใน P2-F04-T01

## 2. คำตัดสิน gate รวม F04 + F05

**ACCEPTED พร้อมเงื่อนไข** · เหตุผลของ producer ถูก (engine ร่วม, เสร็จช่วงเดียวกัน, ลดคิวของ tech-lead/qa/narrative) · เงื่อนไข:

1. รายงานของทุก gate รวม (P2-F05-T15..T18) มีหัวข้อแยก F04 และ F05 พร้อม verdict ย่อยต่อ feature · verdict รวม = NEEDS_CHANGES ถ้า feature ใดไม่ผ่าน
2. กฎ protocol ข้อ 6 นับต่อ gate รวม: NEEDS_CHANGES ครั้งที่สองของ gate รวม escalate ถึงคนสำหรับทั้งสอง feature ในรายงานเดียว
3. design gate F04 + F05 (P2-F05-T18) ตรวจ "gate เดียวไม่มีข้อยกเว้น" ครอบทุกทางที่ให้ของใน F04/F05 รวม D-059 และรางวัลก้อนแรกของ onboarding (B-07) · ส่วน "movement gate กับ auto-retreat ต้องอยู่ด้วยกันเสมอ" (GDD "ผลข้างเคียงที่ตั้งใจ") ตรวจใน P2-F06-T24 เพราะ auto-retreat มาพร้อม F06 · P2-F06-T24 ต้องทวน regression ของ F04/F05 ด้วย
4. เพราะ design gate F04 + F05 อยู่ W9 หลัง build ของ F06 เริ่มแล้ว การอนุมัติ flow ก่อน build (B-01) เป็นเงื่อนไขที่ทำให้ gate รวมยอมรับได้

## 3. ข้อค้นพบ blocking

### B-01 · P2-F04-T15, P2-F06-T03 · ไม่มีขั้นอนุมัติ flow ของ core loop
- ปัญหา: protocol ข้อ 5 กำหนด "UX flows: uiux-designer (game-director approves core-loop flows)" · flow F04 (เข้า dungeon, run state) และ flow F05/F06 (tick, HP, auto-retreat, ตาย, onboarding 0–10) คือ core loop ทั้งหมด แต่ board ส่งตรงจาก flow ไป build (T21, F05-T10, F06-T08/T09/T10) · design gate ครั้งแรกอยู่ W9 ซึ่งช้าเกินกว่าจะแก้ flow ได้ถูก
- แก้: เพิ่ม 2 งาน review-gate ของ game-director (ว่างใน W3 และ W4 ตามแผน wave)
  - `P2-F04-T24` อนุมัติ flow F04 · deps P2-F04-T15 · writes `design/reviews/F04-flow-approval.md` · W3 · เพิ่มเป็น deps ของ P2-F04-T21
  - `P2-F06-T30` อนุมัติ flow F05 + F06 · deps P2-F06-T03 · writes `design/reviews/F05-F06-flow-approval.md` · W4 · เพิ่มเป็น deps ของ P2-F05-T10, P2-F06-T08, P2-F06-T09, P2-F06-T10 (copy P2-F05-T09 ทำขนานได้ ข้อแก้จาก review เป็น fix)
  - acceptance: ทุก flow ตรง spec F04/F05/F06, ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก, ไม่มีตำแหน่งรายบุคคล, ไม่มีข้อความอิสระ · verdict PASS / NEEDS_CHANGES

### B-02 · P2-F04-T01, T15, T16, T20, T21, P2-F06-T18 · speed lock ไม่มีเจ้าของฝั่งผู้เล่น
- ปัญหา: GDD "ความปลอดภัยทางกายภาพ" และ "Anti-cheat ชั้น 1" กำหนด speed lock 25 กม./ชม. "ล็อกการเล่น ไม่ใช่แค่เตือน" (`config: anticheat.speedLock`) · board มีแค่ความเร็วแบบกรองที่ตัดระยะออกจาก gate (P2-F05-T12/T13 รอ P2-C05) และ event `anticheat_speed_lock_triggered` ใน P2-F04-T17 แต่ไม่มี spec, flow, copy, run engine หรือ client ที่ล็อกการเล่นและบอกผู้เล่น · Phase 2 เอาไปให้คนนอกทีมเล่นกลางถนนจริง (P2-F06-T27) นี่คือเรื่องความปลอดภัย ไม่ใช่ anti-cheat
- แก้:
  - P2-F04-T01: เพิ่ม acceptance "สถานะ speed lock: ล็อกการเล่น ไม่มี tick ไม่มีการตี ข้อความบนจอ กฎปลดล็อก และผลต่อ run state"
  - P2-F04-T20: implement สถานะ lock ด้วย `anticheat.speedLock.speedLock_kmh` (มีอยู่แล้ว) เป็นค่าตั้งต้น · สลับไปใช้ความเร็วแบบกรองเมื่อ P2-F05-T13 เสร็จ (ไม่ต้องรอ P2-C05 เพื่อมีสถานะ lock)
  - P2-F04-T15 จอ speed lock · P2-F04-T16 copy key · P2-F04-T21 แสดงผล · P2-F04-T19 trace `driving-40kmh` เป็น case ของ F04
  - P2-F06-T18 safety briefing บอกว่าเกมล็อกเมื่อนั่งรถ

### B-03 · P2-F04-T01, T15, T16, T19, T20 · กฎ check-in ของ GDD ไม่อยู่ใน acceptance ใด
- ปัญหา: GDD "Anti-cheat ชั้น 1" กำหนดการเข้า dungeon ต้องมี sample ต่อเนื่องอย่างน้อย 60 วินาทีที่เดินเข้ามาจากข้างนอก และ accuracy < 30 ม. (`config: anticheat.checkIn`) · board วาง event `checkin_rejected` (P2-F04-T17) แต่ไม่มีงานใดที่สร้างการปฏิเสธนั้น · ถ้าไม่ใส่ Mock จะ teleport เข้ากลาง polygon แล้ว confirm ได้ และ playtest จะไม่เจอแรงเสียดทาน "มาถึงแล้วแต่ยัง confirm ไม่ได้" ซึ่งเป็นประสบการณ์จริงของ v1
- แก้: P2-F04-T01 ใส่กฎ check-in (อ้าง config key) และสิ่งที่ผู้เล่นเห็นระหว่างรอ · P2-F04-T20 ตรวจ check-in ตอน confirm · P2-F04-T15 สถานะ "รอสัญญาณ" / "เดินเข้ามาจากข้างนอก" · P2-F04-T16 copy · P2-F04-T19 trace teleport เข้า polygon และ accuracy 35 ม. ต้องถูกปฏิเสธ
- หมายเหตุ: ใน Phase 2 นี่คือ logic ใน `packages/shared` ที่ server จะรันใน Phase 3 ไม่ใช่การ detect ฝั่ง client (GDD "ตรวจที่ผลลัพธ์ฝั่ง server") จึงไม่ขัด non-negotiable ข้อ 1

### B-04 · P2-F04-T05, T12, T14, T19, P2-F05-T01 · ระยะข้ามช่องว่างของ sample ให้รางวัลโดยไม่มีหลักฐาน
- ปัญหา: GDD "สัญญาณขาดและแอปถูกปิด" ข้อ 2 "ไม่มีหลักฐานว่าเดินจริง = ไม่มี reward เพิ่ม" และ "ล็อกหน้าจอ: หยุดนับ movement" · นิยามหน้าต่าง gate ใน P2-F04-T05 ("นับเฉพาะคู่ sample ในหน้าต่าง") ยังนับคู่ sample ที่คร่อมช่วงแอปถูกปิด จอล็อก หรือ page hidden ได้ · ปิดแอป 4 นาทีระหว่างนั่งรถ แล้วเปิดใหม่ในสวน คู่ sample ก่อนและหลังห่างกันหลายร้อยเมตรจะผ่าน gate ทันที = รางวัลที่ไม่มีหลักฐานว่าเดิน (หลักตัดสินข้อ 2)
- แก้:
  - P2-F04-T05: นิยามหน้าต่าง gate เพิ่ม "คู่ sample ที่ห่างเกิน `config: movementGate.maxSamplePairGap_s` ไม่นับระยะ" และ "sample ที่ accuracy แย่กว่า `config: movementGate.maxSampleAccuracy_m` ไม่นับ" (ชื่อ key สุดท้ายให้ systems-designer ตั้ง)
  - P2-F04-T12 implement · P2-F04-T14 sequence ของแอปถูกปิดแล้วเปิดใหม่ (run ไม่ถูกลบ, เข้า Grace/Suspended ตามเวลาที่หาย, >15 นาที = Ended เก็บของที่ได้แล้ว)
  - P2-F05-T01 vector: ตัวอย่าง GDD แบบ client (เดิน 20 นาที, ช่องว่าง 5 นาทีที่จุดห่างกัน 400 ม., เดินต่อ 5 นาที) → ระยะ 400 ม. ที่คร่อมช่องว่างไม่ถูกนับ หน้าต่างที่คร่อมช่องว่างได้ tick ก็ต่อเมื่อระยะจากคู่ sample ที่นับได้เกินเกณฑ์เอง, run อยู่ต่อ · P2-F04-T19 trace เดียวกัน

### B-05 · P2-F04-T12, P2-F04-T20, P2-F06-T01, P2-F05-T01 · config ของ hysteresis / jitter / sample ยังไม่มี และ deps ผิดลำดับ
- ปัญหา: P2-F04-T12 (W2) ต้องใช้ "hysteresis ที่ขอบ (ค่าจาก config)" และ "กรอง jitter (ค่าจาก config)" แต่ไม่มี key เหล่านี้ใน `dungeons.json` (`runState`, `movementGate`) หรือ `location.json` (มีแค่ `homeState`) · P2-F05-T01 ที่เป็นงาน config ของ loop อยู่ W3 และไม่ได้ระบุ key เหล่านี้ · P2-F04-T20 (W3) ไม่มี deps ถึงงานของ systems-designer เลย ทั้งที่ต้องอ่าน key ใหม่ของ B-02..B-04
- แก้:
  - เพิ่มในขอบเขตของ P2-F06-T01 (systems, W2): key ของ hysteresis ที่ขอบ polygon (ระยะ และ/หรือจำนวน sample ติดกันก่อนเปลี่ยนสถานะ), พารามิเตอร์กรอง jitter, `maxSamplePairGap_s`, `maxSampleAccuracy_m` พร้อม `_source`/`_assumption` · ชื่อ key และกฎมาจาก spec F04/F05 (P2-F04-T01, W1)
  - P2-F04-T12 รับค่าเป็นพารามิเตอร์ของฟังก์ชัน ไม่มีค่าตั้งต้นในโค้ด (test ใช้ค่าจาก fixture) จึงไม่ต้องรอ systems ใน W2
  - เพิ่ม P2-F06-T01 ใน deps ของ P2-F04-T20
- กฎที่ game-director จะเขียนใน spec (ใช้เป็นกรอบค่า): hysteresis ใช้กับ **การเปลี่ยนสถานะเท่านั้น** ไม่ขยาย polygon สำหรับรางวัล · ระยะของ hysteresis ต้องเล็กเมื่อเทียบกับ dungeon เล็กสุด (`dungeons.area.minArea_m2`) และไม่ซ้อนหน้าที่กับ Grace ที่รองรับ drift อยู่แล้ว (GDD "การเข้าและออก")

### B-06 · P2-F06-T02, P2-F05-T01, P2-F06-T06, P2-F06-T08 · Phase 2 ไม่มีแหล่งที่มาของยา
- ปัญหา: roadmap F06 ส่งมอบ "ยาอัตโนมัติ" และ GDD "เมื่อตาย" มี "ใช้ยาเพื่อฟื้นได้ทันที" · GDD บอกว่ายาซื้อด้วย gold จาก NPC แต่ร้าน NPC และ economy อยู่ Phase 4 และตลาดห้ามสอนใน 10 นาทีแรก · board ไม่ระบุว่าผู้เล่นใน Phase 2 ได้ยามาจากไหน ยาอัตโนมัติและยาฟื้นจึงทดสอบบนเครื่องจริงไม่ได้
- คำตัดสินที่จะใส่ใน spec F06 (หลักตัดสินข้อ 2): **ยาใน Phase 2 มาจาก drop ของ tick ที่ผ่าน gate เท่านั้น** · ไม่มีชุดยาตั้งต้นหรือของขวัญแรกเข้า เพราะเป็นการให้ของโดยไม่เดิน · ร้าน NPC เลื่อน Phase 4
- แก้: P2-F06-T02 acceptance เพิ่ม "แหล่งที่มาของยาใน Phase 2" · P2-F05-T01 ใส่ยาใน drop table ทุก preset พร้อม `assets.icon` และ vector ที่ยืนยันว่าผู้เล่นเลเวลตรงโซนมีโอกาสได้ยาก่อนถึง auto-retreat (ค่าให้ systems ตั้ง) · P2-F06-T06/T08 ยาอัตโนมัติอ่านจาก inventory ในเครื่องที่มาจาก drop

### B-07 · P2-F06-T02, P2-F06-T10, P2-F06-T17 · รางวัลก้อนแรกของ onboarding ต้องเป็น tick ปกติ
- ปัญหา: P2-F06-T10 เขียน "ครบ gate ได้รางวัลก้อนแรก" แต่ไม่ห้ามการทำรางวัลแบบ script (ให้ของเมื่อจบ tutorial, ลด gate สำหรับคนใหม่, นับ tick แรกเร็วกว่า 5 นาที) · หลักตัดสินข้อ 2 และ non-negotiable ข้อ 2 ไม่มีข้อยกเว้น
- แก้: acceptance ของ P2-F06-T02, P2-F06-T10 และ P2-F06-T17 เพิ่ม "รางวัลก้อนแรก = reward tick ปกติของ reward engine ที่ผ่าน `movementGate` เดียวกัน ไม่มี code path แยกของ onboarding" · ถ้าต้องการให้ก้อนแรกเด่น ทำที่การแสดงผล (effect, copy) ไม่ใช่ที่ปริมาณหรือเงื่อนไข

### B-08 · P2-F04-T14, P2-F04-T20, P2-F05-T16, P2-F06-T21 · sample ตำแหน่งที่เก็บในเครื่องไม่มีเพดานเวลา
- ปัญหา: A-P2-PLAN-01-2 เก็บ state ของ run ใน storage ของเบราว์เซอร์ และการกู้ run หลังปิดแอป (B-04) ต้องเก็บ sample ไว้ · ไม่มี acceptance ที่จำกัดว่าเก็บพิกัดดิบได้นานเท่าไรและลบเมื่อใด · non-negotiable ข้อ 7 (`position_log` TTL 24 ชม.) และ GDD "ข้อมูลตำแหน่ง" ตั้งหลักการเก็บน้อยและลบเร็ว เครื่องที่ใช้ร่วมกันหรือหายจะมีประวัติการเดินค้างอยู่
- แก้: P2-F04-T14 กำหนดว่าเก็บเฉพาะ sample ที่หน้าต่าง gate ปัจจุบันและการกู้ run ต้องใช้ · ลบเมื่อ run จบ และไม่เก็บนานกว่าเพดานใน config · `config/app/privacy.json` (เจ้าของ tech-lead) ยังไม่มี key นี้ ให้ tech-lead เพิ่ม key ของเพดานการเก็บ sample ในเครื่องใน P2-F04-T14 (เพิ่มไฟล์นี้ใน writes ของงาน) โดยไม่เกิน `balance.privacy.positionLogTtl_s` ของ server · export/telemetry ไม่มีพิกัด (มีแล้ว) · P2-F04-T20 implement · QA gate F04+F05 และ F06 ตรวจ storage หลังจบ run ว่าไม่มีพิกัดค้าง

### B-09 · P2-F04-T16, P2-F04-T07 · copy และชื่อโซนเขียนก่อน world.md รับธง D-084
- ปัญหา: P2-F04-T16 (W3) ต้องตั้งชื่อโซน "ตามรูปแบบใน world.md" แต่ P2-F04-T07 ที่เปลี่ยนธง H-01..H-13 ใน world.md ให้เป็นทางที่ยืนยันแล้วอยู่ W6 และไม่ได้เป็น deps ของ T16 · ชื่อโซนและ copy F04 อาจเขียนตามทางเลือกที่ไม่ได้รับ แล้วต้องแก้ซ้ำหลัง copy gate
- แก้ (เลือกหนึ่ง): (ก) รวมส่วน world.md ของ P2-F04-T07 เข้า P2-F04-T16 (เจ้าของเดียวกัน, W3) และคง `copy-rules.json` area `client` ไว้ใน T07 ที่ย้ายไปช่องว่างได้ · หรือ (ข) เพิ่ม P2-F04-T07 ใน deps ของ P2-F04-T16 และย้าย T07 ขึ้นมาก่อน W3 · game-director แนะนำ (ก) เพราะไม่ต้องหาช่องใน W1–W2 ที่เต็มแล้ว (writes ของ T16 เพิ่ม `design/narrative/world.md`)

## 4. ข้อค้นพบ non-blocking

### N-01 · P2-C09 · ย้ายขึ้น W3 และเพิ่ม deps
- ปัญหา: P2-C09 อยู่ W8 แต่ spec F04–F06, copy และ test plan (W1–W5) อ้าง GDD ที่ถ้อยคำกำลังจะเปลี่ยน (D-020 นิยาม 45 นาที, D-038 B VIT ต่อยา) · acceptance ข้อ 3 ตรวจกับ `progression.json` ที่ P2-F06-T01 เป็นคนแก้ แต่ deps เป็น "—"
- แก้: ย้าย P2-C09 ไป W3 (game-director ว่างตามแผน · ถ้ารับ B-01 ให้ W3 = P2-F04-T24 แล้ว C09 ไป W5 ซึ่งก็ยังว่าง) · เพิ่ม deps P2-F06-T01 · ระหว่างนี้ spec อ้างเลข decision แทนถ้อยคำ GDD ใหม่
- ขอบเขตที่ game-director จะถือใน C09: แก้เฉพาะถ้อยคำของ 10 decision ที่ D-084 อนุมัติ ห้ามแก้คำพิมพ์ผิดหรือถ้อยคำอื่นแม้จะเห็น (เช่น "dungeoun" ในหัวข้อ "การเข้าและออก" ไม่อยู่ในรายการ) · writes ของ GDD เป็นของ C09 ผู้เดียวใน wave นั้น · ต้องมี handoff ถึง orchestrator ให้บันทึกใน decision log ว่าถ้อยคำถูกนำไปใช้แล้ว (agent ไม่แก้ decision log)

### N-02 · หัวข้อ 5 ของ board แถว E8 · ผู้ตรวจผิด
- ปัญหา: E8 "ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก" ระบุผู้ตรวจเป็น product-manager แต่หลักฐานคือ design gate ของ game-director
- แก้: ผู้ตรวจ = game-director (หลักฐาน `design/reviews/F06-design-gate.md`) + qa-tester (case ต่อจอใน `qa/reports/F06-qa-gate.md`)

### N-03 · P2-F04-T01, P2-F06-T02 · สิ่งที่ game-director จะใส่ใน spec เพิ่มจาก acceptance ปัจจุบัน
ให้ orchestrator เพิ่มลง acceptance ของสอง task นี้ เพื่อให้ gate ตรวจย้อนได้
1. จุดตั้งต้นของ tick (นับจาก confirm) และการหยุดนาฬิกา tick ระหว่าง Suspended ("เวลาที่หายไปไม่นับ")
2. ระยะที่เดินขณะอยู่นอก polygon (Grace/Suspended) นับเข้าหน้าต่างของ tick ถัดไปหรือไม่ (GDD เงียบ · จะตัดสินด้วยหลักข้อ 2 และบันทึกเป็น decision ของ game-director)
3. การขึ้นเลเวลใน Phase 2: แต้ม stat ห้ามสอนใน 10 นาทีแรก จึงต้องระบุว่าแต้มสะสมเงียบหรือกระจายอัตโนมัติ และปลดหน้าลงแต้มตาม `unlocks.json`
4. แถบ HP ปรากฏในนาที 3–10 ได้โดยไม่มีคำอธิบาย บทเรียนเดียวยังเป็น "เดินต่อไปเพื่อรับรางวัล"
5. ลำดับ age gate 15+ และ consent ตำแหน่งก่อนนาที 0–1 ให้สั้นที่สุด โดย consent ตำแหน่งยังแยกจาก consent อื่น
6. D-020: ผู้เล่นคนเดียวที่ไม่ใช่ Tanker ถึง auto-retreat ราว 27.8 นาที ขณะที่ script playtest (P2-F06-T18) ให้เล่น 30–45 นาที · ผู้ร่วมส่วนใหญ่จะเจอ auto-retreat ซึ่งดีต่อการทดสอบจังหวะ copy แต่ kit, แบบฟอร์มผู้สังเกต และแบบสอบถาม (P2-F06-T18, T19) ต้องรู้ล่วงหน้าและบันทึกเวลาถึง auto-retreat ต่อ class

### N-04 · P2-F04-T15, P2-F06-T03, P2-F06-T09 · ตัวเลขคนที่ Phase 2 ไม่มีจริง
- ปัญหา: GDD นาที 3–6 ให้เห็น "จำนวนคนในนั้น" และ ia.md S-07 แสดง "จำนวนคนลงทะเบียนต่อจังหวัด" · Phase 2 ไม่มี backend จึงไม่มีตัวเลขจริง
- คำตัดสิน: Phase 2 **ซ่อน** ตัวเลขทั้งสองจุด ห้ามแสดง 0 ตายตัวหรือตัวเลขปลอม (0 ทำให้ดูว่าไม่มีใครเล่น ตัวเลขปลอมหลอกผู้ร่วม playtest) · flow ระบุตำแหน่งที่จะแสดงเมื่อมี backend ใน Phase 3 · product-manager บันทึกเป็นข้อจำกัดของ playtest ใน PRD

### N-05 · P2-F04-T17, P2-F04-T21, P2-F04-T02 · ลำดับ PRD → telemetry → client
- ปัญหา: P2-F04-T21 (W4) ต้อง "ยิง telemetry ตาม telemetry-events ฉบับล่าสุด" แต่ P2-F04-T17 อยู่ W4 เดียวกันและไม่เป็น deps · PRD (P2-F04-T02) อยู่ W5 หลัง telemetry และหลัง build เริ่ม ทั้งที่ตัวชี้วัดของ PRD ควรกำหนด event
- แก้: เพิ่ม P2-F04-T02 ใน deps ของ P2-F04-T17 และย้าย T02 ให้ก่อน T17 · T21 ยิงเฉพาะ event ที่มีในไฟล์ ณ ตอนเริ่ม ที่เหลือย้ายไป P2-F05-T10 ที่ deps T17 อยู่แล้ว (ให้ producer กับ product-manager ตัดสินลำดับ)

### N-06 · หัวข้อ 1.9 · ปุ่มรายงานสถานที่เข้าไม่ถึงไม่มีปลายทาง
- ปัญหา: GDD "ความปลอดภัยทางกายภาพ" (Radius ใจกว้าง ต้องมีปุ่มรายงาน) ไม่อยู่ในตาราง 1.9 และไม่มีงาน · ปุ่มนี้ต้องใช้ backend
- แก้: เพิ่มแถว "เลื่อน Phase 5 (F13/F14)" · ใน Phase 2 ให้แบบฟอร์มผู้สังเกต (P2-F06-T18) มีช่องบันทึกจุดที่เดินเข้าไม่ถึงจริงแบบไม่มีพิกัดของผู้ร่วม (ชื่อ dungeon + ด้าน)

### N-07 · A-P2-PLAN-01-6 · มุมมองฝั่ง design
- game-director สนับสนุนให้ backend-programmer เขียน reward engine และ HP engine เพราะรูปร่างของ server-authoritative ชัดตั้งแต่แรก (คนที่จะรันโค้ดบน server เป็นคนเขียน) · การตัดสินเป็นของ tech-lead

### N-08 · P2-F06-T19, P2-F06-T28 · design ควรมีส่วนในเกณฑ์ "ไปต่อ / แก้ก่อน"
- แก้: P2-F06-T19 ส่งร่างคำถามเรื่องความเข้าใจ gate/tick และความรู้สึกต่อ auto-retreat ให้ game-director อ่านก่อนล็อกเกณฑ์ (handoff, blocking: no) · P2-F06-T28 มี handoff ถึง game-director สำหรับข้อค้นพบที่กระทบกฎของเกม เพื่อเสนอ decision ก่อน P2-F06-T29

## 5. จุดที่ตรวจแล้วผ่าน (ไม่ต้องแก้)

| หัวข้อที่ brief ให้ตรวจ | ผล | หลักฐานใน board |
| --- | --- | --- |
| F04 run state + ขอบเวลา | ผ่าน (เพิ่ม B-03, B-04, B-05) | T01, T19 (2:59/3:01, 14:59/15:01), T20 (180/900 วิ, `suspendedTimeCounts`) |
| F04 hysteresis ที่ขอบ | ผ่านในหลักการ (config ขาด → B-05) | T12, T19 เลียบขอบ + drift |
| F04 ปิดทำการ / ช่วงเลเวลไม่บล็อก / ทีละ 1 dungeon | ผ่าน | T01, T13 (อย่างน้อย 1 แห่งมีช่วงปิด), T20, E2 |
| F05 gate + tick + drop | ผ่าน (เพิ่ม B-04, B-07) | T01, F05-T01 (ระยะเท่าเกณฑ์ไม่ผ่าน = `greaterThan`), F05-T08 (Grace/Suspended ไม่ได้ tick), E3–E5 |
| D-059 ปิดฉุกเฉินผ่าน gate | ผ่าน | T01, F05-T01 vector 59/60 วิ |
| F06 HP / auto-retreat 25% default / ปิดได้เฉพาะหน้าตั้งค่า | ผ่าน | F06-T02, T06, T08 (มี confirm ตอนปิด), T24 |
| ยาอัตโนมัติ / ยาฟื้น | ไม่ผ่าน → B-06 | — |
| ตาย / ฟื้น 0→50% ใน 30 นาที / Support ชุบเลื่อน Phase 3 | ผ่าน | F06-T02, T06 |
| class 4 แบบในนาที 0–1 | ผ่าน | F06-T02, T10 (sheet บนแผนที่) |
| onboarding 0–10 + รายการห้ามสอน | ผ่าน (เพิ่ม B-07, N-03) | F06-T10 (ครบ 8 หมวด ปลดตาม `unlocks.json`), T11, T17, T24, E8 |
| จอไกล / นอกพื้นที่ / นอกย่านเปิดตัว | ผ่าน (เพิ่ม N-04) | F06-T03, T09 (ไม่เก็บพิกัด ไม่มีข้อความอิสระ), D-064, D-073 |
| copy สามจังหวะ | ผ่าน | F05-T09, F06-T22 (E7), T08 ใช้ key ตาม flow |
| design gate | ผ่าน (เพิ่ม B-01, หัวข้อ 2) | F05-T18, F06-T24 ก่อน playtest P2-F06-T27 |
| P2-C09 (D-084) | ผ่านในหลักการ (N-01) | ข้อยกเว้น read-only จำกัดที่ C09 ในกฎ path ร่วม |
| non-negotiable 1 server-authoritative | ผ่าน | A-P2-PLAN-01-1 ผลบน client ไม่ใช่รางวัลจริง, E14, pure ใน shared/geo |
| non-negotiable 2 gate ทุกรางวัล | ผ่านเมื่อแก้ B-04, B-06, B-07 | — |
| non-negotiable 3 config / ชื่อจาก content | ผ่าน (key ขาด → B-05) | T13 ไม่มีชื่อฝังโค้ด, T16 `names.th.json`, T15 tech gate |
| non-negotiable 4 ไม่มี PvP / แชท / ตำแหน่งคนอื่น | ผ่าน | T15, B-01 acceptance · party และ quick command อยู่ Phase 3 |
| non-negotiable 5 outdoor + `verification_mode`, `floor_level` | ผ่าน | T13 |
| non-negotiable 6 low penalty | ผ่าน | auto-retreat default, auto-retreat เก็บของครบ · ไม่มีการตีบวกใน Phase 2 |
| non-negotiable 7 PDPA | ผ่าน (เพิ่ม B-08) | consent แยก + age gate 15+ scaffold (T09), telemetry ไม่มีพิกัด, playtest ไม่ระบุตัวคน |
| รายการตัดออกจาก v1 | ผ่าน | ไม่มี AR, ในอาคาร, แชทอิสระ, อวตาร 3D, PvP ในงานใด |
