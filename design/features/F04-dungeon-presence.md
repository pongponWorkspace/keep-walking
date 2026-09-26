# F04 — Dungeon Presence และ Run State

Task: P2-F04-T01 · เจ้าของ: game-director · สถานะ: ร่าง (รอ design gate รวม F04 + F05 ใน P2-F05-T18) · วันที่: 2026-09-26
แหล่งอ้างอิง: GDD "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "การเข้าและออก", "เวลาทำการ", "ระดับเลเวลที่เหมาะสม", "Core loop ใน Dungeon", "10 นาทีแรกของคนใหม่", "Anti-cheat > มาตรการเป็นชั้น" (ชั้น 1), "ความปลอดภัยทางกายภาพ", "สัญญาณขาดและแอปถูกปิด" · `design/pillars.md` (P2, P4, NN-1, NN-4, NN-5, หัวข้อ 6.2 U7, หัวข้อ 7) · `design/ux/flows/F03-core-loop.md` (Flow B, C 4.1, D) · plan review GD หัวข้อ 1, B-02, B-03, B-04, B-05, N-03 · D-063, D-064, D-072, D-075, D-079, D-083, D-087, D-088, D-089
คู่กับ: `design/features/F05-movement-gate-reward.md` (gate, rewardWindow, tick, drop, สรุป run) · ส่วน HP / auto-retreat / onboarding อยู่ใน spec F06 (P2-F06-T02)
ตัวเลขทุกตัวเป็น `config: <key>` ไม่เขียนค่า · key ที่ขึ้นต้นด้วย "เสนอ:" ยังไม่มีใน config เป็นข้อเสนอให้ systems-designer ตั้งชื่อและค่าใน P2-F05-T20

## 1. ผู้เล่นทำอะไร เห็นอะไร รู้สึกอะไร

- เปิดแอปที่บ้านหรือระหว่างทาง เห็นรอยแยกบนแผนที่ แตะดูได้ว่าไกลแค่ไหน (ระยะเส้นตรงที่ไม่หลอกว่าใกล้) ทิศไหน เปิดอยู่ไหม กดนำทางแล้วแอปแผนที่ของเครื่องพาเดินไป
- เดินเข้าเขตสวน popup ขึ้นเอง ถ้าเพิ่งเปิดแอปหรือสัญญาณยังไม่นิ่ง ปุ่ม "เข้า" ยังกดไม่ได้และบอกตรงๆ ว่ารออะไร พอพร้อม กดเข้า แล้วเก็บมือถือใส่กระเป๋า
- เดินเลียบขอบหรือ GPS ส่ายออกนอกเขตนิดหน่อย เกมไม่ตกใจ ออกไปซื้อน้ำ run ยังรอ กลับมาเล่นต่อได้ หายไปนานเกินก็จบ run แต่ของที่ได้แล้วไม่หาย
- ขึ้นรถ เกมล็อกทันทีและบอกสั้นๆ ว่าล็อกเพราะเร็วเกินเดิน ลงรถเดินต่อ เกมปลดเอง
- สวนใกล้ปิด เกมเตือนก่อน ถึงเวลาปิด run จบพร้อมรางวัลตามสัดส่วนที่เดินผ่านเกณฑ์ ไม่มีใครต้องปีนรั้วออก
- ความรู้สึกที่ต้องการ: "มาถึงแล้วได้เล่น" (P2) และ "ไม่ต้องจ้องจอ" (P4) · ไม่มีจังหวะใดที่ทำให้รู้สึกว่าถูกจับผิด (U7)

## 2. ขอบเขต Phase 2 และหลักที่ต้องถือ

1. Phase 2 ไม่มี server · logic ของ presence, check-in, run state และ speed lock เป็น pure reducer ใน `packages/shared` / `packages/geo` ที่ server จะรันใน Phase 3 (D-087, ADR 0003) · client เรียกผ่าน `session` เท่านั้น · ผลบน client ไม่ใช่รางวัลจริงและไม่ย้ายเข้า account (NN-1)
2. ตำแหน่งไม่ออกจากเครื่อง · sample เก็บไม่เกินที่หน้าต่าง gate ปัจจุบันและการกู้ run ต้องใช้ ลบเมื่อ run จบ (D-088, เพดานจาก `config/app/privacy.json` ของ tech-lead ใน P2-F04-T14)
3. การตรวจตำแหน่งใช้ `PresenceStrategy` ตาม `verification_mode` ของ dungeon · v1 มีแค่ `continuous_gps` (NN-5) · กฎในเอกสารนี้คือพฤติกรรมของ `continuous_gps`
4. Phase 2 ซ่อนจำนวนคนและ role ใน dungeon ทุกจุด ห้ามแสดง 0 ตายตัวหรือตัวเลขปลอม (D-089) · ตำแหน่งที่จะแสดงเมื่อมี backend ให้ flow ระบุไว้
5. ย่านที่มี dungeon นำร่อง: พระนคร ปทุมวัน บางรัก (D-083) · ข้อมูลจาก level-designer (P2-F04-T13)

## 3. กฎ (ทดสอบได้)

### 3.1 เลือก dungeon และ confirm

- F04-R01 ผู้เล่นมี run ได้ครั้งละ 1 run ใน 1 dungeon (`config: dungeons.entry.maxActiveDungeonsPerPlayer`)
- F04-R02 เมื่อผู้เล่นที่ไม่มี run เข้าเขต polygon ของ dungeon ที่เปิดอยู่ ระบบเปิด popup confirm เอง (Flow B1) · การเข้า run ทุกครั้งต้องผ่าน popup และการกด "เข้า" ของผู้เล่น ไม่มีการเข้าอัตโนมัติ (`config: dungeons.entry.confirmPopupRequired`)
- F04-R03 จุดที่อยู่ใน polygon มากกว่า 1 แห่ง: popup แสดงทุกแห่งที่เปิดอยู่เป็นการ์ด ปุ่ม "เข้า" ใช้ได้เมื่อเลือกการ์ดแล้ว · เมื่อเข้าแล้ว polygon ของ run = polygon ที่เลือกเท่านั้น การอยู่ใน polygon อื่นที่ซ้อนกันไม่มีผลต่อ run state
- F04-R04 ระหว่างมี run การเดินเข้า polygon อื่นไม่เปิด popup · เปลี่ยน dungeon ได้ทางเดียวคือจบ run ปัจจุบัน (ออกเอง) แล้ว confirm แห่งใหม่ ซึ่งต้องผ่าน check-in ของแห่งใหม่ (3.2) · ไม่มี cooldown
- F04-R05 popup แสดง: ชื่อโซน (จาก content), ช่วงเลเวล, สถานะเวลาทำการ (3.5) และสถานะ check-in (3.2) · ไม่แสดงจำนวนคนหรือ role (ข้อ 2.4)
- F04-R06 กด "ยกเลิก" ไม่มีผลใด เปิด popup ใหม่ได้ตลอดที่ยังอยู่ในเขต (ปุ่มเปิดบนแผนที่)

### 3.2 Check-in (GDD "Anti-cheat" ชั้น 1 · GD B-03)

- F04-R07 ตอนกด "เข้า" engine ประเมิน check-in จาก sample ก่อนหน้า · ผ่านเมื่อครบทุกข้อ
  1. มีลำดับ sample ต่อเนื่อง ยาวอย่างน้อย `config: anticheat.checkIn.minContinuousApproach_s` สิ้นสุดที่ sample ล่าสุด · "ต่อเนื่อง" = ไม่มีคู่ sample ติดกันที่ห่างเกิน `config: dungeons.movementGate.maxSamplePairGap_s` (เสนอ ดู F05) และไม่มี sample ที่ตัวกรอง outlier ทิ้ง (ADR 0003)
  2. ในลำดับนั้นมี sample ที่อยู่นอก polygon ที่เลือก และ sample ล่าสุดอยู่ใน polygon ที่เลือก (เดินเข้ามาจากข้างนอก ไม่ใช่โผล่กลาง polygon · `config: anticheat.checkIn.teleportIntoPolygonAllowed`)
  3. sample ล่าสุด accuracy น้อยกว่า `config: anticheat.checkIn.maxAccuracy_m` (เปรียบเทียบแบบน้อยกว่า ไม่ใช่น้อยกว่าหรือเท่ากับ)
  4. ไม่อยู่ในสถานะ speed lock (3.4) ณ ตอนกด และลำดับ sample ข้อ 1 ไม่มีช่วงที่ lock
- F04-R08 ผลไม่ผ่านบอกเหตุผลเป็นหมวดเดียวต่อครั้ง ตามลำดับ: `speed_lock` → `poor_accuracy` → `not_enough_trace` (ลำดับยังไม่ครบเวลา) → `no_approach_from_outside` · ไม่มีบทลงโทษ กดใหม่ได้ทันทีเมื่อเงื่อนไขครบ · event `checkin_rejected` พร้อม reason (P2-F04-T17)
- F04-R09 สิ่งที่ผู้เล่นเห็นระหว่างรอ: popup เปิดได้ แต่ปุ่ม "เข้า" disable พร้อมสถานะหนึ่งบรรทัดตามเหตุผลใน R08 · `not_enough_trace` แสดงการนับถอยหลังถึงเวลาที่ครบ · `no_approach_from_outside` บอกให้เดินออกนอกเขตแล้วเดินกลับเข้ามา · ปุ่มเปิดใช้เองเมื่อพร้อม ไม่ต้องปิดเปิด popup ใหม่
- F04-R10 ถ้อยคำเป็นเรื่องสัญญาณ GPS และการเดินเข้าเขต ห้ามเอ่ย anti-cheat การโกง หรือวิธีตรวจ (pillars 6.2 U7) · ถ้อยคำเป็นของ narrative-designer (P2-F04-T16)
- F04-R11 sample ที่ใช้ check-in เก็บได้ตั้งแต่เปิดแอปบนหน้าแผนที่ (ไม่ต้องเริ่มนับเมื่อเข้าเขต) ภายในเพดานเก็บ sample ของข้อ 2.2 · ผู้เล่นที่เดินมาพร้อมแอปเปิดอยู่จึงผ่านทันทีที่เข้าเขต

### 3.3 Run state (GDD "การเข้าและออก", "สัญญาณขาดและแอปถูกปิด")

นิยามที่ใช้ทั้งหัวข้อ
- **sample ที่ใช้ได้** = sample ที่ตัวกรอง outlier ไม่ทิ้ง (ADR 0003) และ accuracy ไม่แย่กว่า `config: dungeons.movementGate.maxSampleAccuracy_m` (เสนอ)
- **หลักฐานว่าอยู่ใน** = sample ที่ใช้ได้ล่าสุดอยู่ใน polygon ของ run · **หลักฐานว่าอยู่นอก** = sample ที่ใช้ได้ล่าสุดอยู่นอก polygon · **ไม่มีหลักฐาน** = ไม่มี sample ที่ใช้ได้นานกว่า `config: dungeons.movementGate.maxSamplePairGap_s` (เสนอ) เช่น จอล็อก หน้าเว็บ hidden แอปถูกปิด GPS หาย หรือ accuracy แย่ต่อเนื่อง
- **เวลานอก** = เวลาต่อเนื่องนับจากจุดเริ่มของการออกครั้งนี้ (R14) ถึงปัจจุบัน · รีเซ็ตเป็นศูนย์เมื่อกลับ Active

- F04-R12 สถานะและเงื่อนไข (ขอบตาม `_note` ของ `dungeons.runState`)

| สถานะ | เงื่อนไข | tick | นาฬิกา rewardWindow (F05) | damage (F06) |
| --- | --- | --- | --- | --- |
| Active | หลักฐานว่าอยู่ใน และไม่ lock | ได้ถ้าผ่าน gate | เดิน | มี |
| Grace | เวลานอก ≤ `config: dungeons.runState.graceMax_s` | ไม่ (`rewardTickDuringGrace`) | หยุด | ไม่มี |
| Suspended | `graceMax_s` < เวลานอก ≤ `config: dungeons.runState.suspendedMax_s` | ไม่ (`rewardTickDuringSuspended`) | หยุด เวลาไม่นับ (`suspendedTimeCounts`) | ไม่มี |
| Ended | เวลานอก > `suspendedMax_s` หรือเหตุจบอื่น (R17) | run จบ | — | — |

- F04-R13 เวลานอกเพิ่มขึ้นทั้งตอนมีหลักฐานว่าอยู่นอกและตอนไม่มีหลักฐาน ด้วยนาฬิกาเดียวกัน (run state กับ connection state แยกกัน แต่ "ไม่มีหลักฐาน" ไม่ได้ต่อเวลาให้) · การกลับมามีหลักฐานว่าอยู่ใน ก่อนเวลานอกเกิน `suspendedMax_s` = กลับ Active ต่อ run เดิม ไม่ต้อง check-in ใหม่
- F04-R14 จุดเริ่มของการออก: กรณีอยู่นอก = เวลาของ sample แรกในชุดที่ยืนยันการออก (R15) · กรณีไม่มีหลักฐาน = เวลาของ sample ที่ใช้ได้ตัวสุดท้าย · การตัดสินย้อนหลังนี้ทำให้ hysteresis และเกณฑ์ช่องว่างไม่ต่อเวลานอกให้เกินที่ GDD กำหนด
- F04-R15 Hysteresis ที่ขอบ (GD B-05) ใช้กับ **การเปลี่ยนสถานะเท่านั้น**
  1. Active → ออก ต้องมี sample ที่ใช้ได้อยู่นอก polygon ติดกัน `config: dungeons.runState.edgeHysteresisSamples` (เสนอ) ตัว และ/หรือห่างขอบเกิน `config: dungeons.runState.edgeHysteresis_m` (เสนอ) · ออก → Active ใช้เกณฑ์เดียวกันฝั่งใน
  2. hysteresis ตัดสิน "เปลี่ยนหรือไม่" ไม่ตัดสิน "เปลี่ยนเมื่อไร" · เมื่อยืนยันแล้ว การเปลี่ยนมีผลย้อนไปที่ sample แรกของชุด (R14)
  3. hysteresis ไม่ขยาย polygon สำหรับรางวัล: ระยะนับเฉพาะคู่ sample ที่อยู่ใน polygon ทั้งคู่ (F05-R05)
  4. กรอบค่า: ระยะ hysteresis เล็กเมื่อเทียบกับ dungeon เล็กสุด (`config: dungeons.area.minArea_m2` เทียบเท่าวงกลมรัศมีราว 31 ม. และแถบริมน้ำกว้างราว 20 ม.) ข้อเสนอของ game-director คือไม่เกินราวหนึ่งในสามของรัศมีนั้น · เวลาที่ใช้ยืนยัน (จำนวน sample × cadence) ไม่เกินราวหนึ่งในหกของ `graceMax_s` เพื่อไม่ซ้อนหน้าที่กับ Grace ที่รองรับ drift อยู่แล้ว · systems-designer ตั้งค่าจริงพร้อม vector เลียบขอบ/drift ใน P2-F05-T20
  5. ระหว่างรอยืนยัน สถานะยังเป็นสถานะเดิม · tick ที่ครบระหว่างรอยืนยันถูกประเมินเมื่อได้ผลยืนยันแล้ว (ช้าไม่เกินเวลายืนยัน)
- F04-R16 sample ที่ไม่ใช่ sample ที่ใช้ได้ ไม่ทำให้เปลี่ยนสถานะทั้งฝั่งเข้าและออก
- F04-R17 เหตุที่ทำให้ run จบ (exit_reason): `timeout` (เวลานอกเกิน `suspendedMax_s`), `manual_exit` (`config: dungeons.exit.manualExitAnytime`), `auto_retreat` และ `death` (F06), `dungeon_closed` (3.5), `emergency_close` (มีใน engine ตาม D-059 · Phase 2 ไม่มีหลังบ้านจึงไม่มีทางเกิดนอก test), `clock_invalid` (หัวข้อ 5 ข้อ E10) · การจ่ายรางวัลต่อเหตุอยู่ใน F05 หัวข้อ 3.5
- F04-R18 Ended จาก `timeout` มีเวลาจบ = จุดเริ่มของการออก + `suspendedMax_s` · ผู้เล่นที่เปิดแอปกลับมาหลังนั้นเห็นสรุป run ทันที ไม่ใช่จอ run
- F04-R19 ไม่มีปุ่มให้ผู้เล่นเปลี่ยน run state เอง นอกจากออกเอง

### 3.4 Speed lock (GDD "ความปลอดภัยทางกายภาพ", ชั้น 1 · GD B-02)

- F04-R20 เมื่อความเร็วเกิน `config: anticheat.speedLock.speedLock_kmh` เกมเข้าสถานะ lock (`config: anticheat.speedLock.action` = ล็อกการเล่น ไม่ใช่เตือน) · ความเร็ววัดตามวิธีใน ADR 0003 ต่อเนื่องอย่างน้อย `config: anticheat.speedLock.lockSustained_s` (เสนอ ต้องสั้นพอให้ lock ก่อนรถออกตัวเต็มที่ และยาวพอไม่ให้ spike เดียวของ GPS ล็อกคนเดิน) · Phase 2 ใช้ความเร็วจาก sample ที่ใช้ได้ด้วย `speedLock_kmh` ดิบ แล้วสลับเป็นความเร็วแบบกรองเมื่อ P2-F05-T13 เสร็จ โดยกฎนี้ไม่เปลี่ยน
- F04-R21 ระหว่าง lock: ไม่มี tick นาฬิกา rewardWindow หยุด ระยะไม่นับ ไม่มีการทอย damage · ไม่เปิด popup confirm และ check-in ไม่ผ่าน · run state ยังตัดสินจากตำแหน่งตาม 3.3 (lock ไม่ทำให้ run จบเอง และไม่นับเป็นเวลานอก ถ้าตำแหน่งยังอยู่ใน polygon)
- F04-R22 ปลด lock เมื่อความเร็วต่ำกว่าหรือเท่ากับ `speedLock_kmh` ต่อเนื่อง `config: anticheat.speedLock.unlockSustained_s` (เสนอ ยาวกว่าไฟแดงหนึ่งจังหวะ เพื่อไม่ให้ปลดสลับล็อกตอนรถติด) · ปลดเอง ไม่ต้องกดอะไร
- F04-R23 จอ: overlay เต็มจอทับแผนที่และจอ run (รวมจอพกกระเป๋า) ข้อความสั้นหนึ่งบรรทัดว่าเร็วเกินเดินจึงล็อก และจะปลดเองเมื่อกลับมาเดิน · ไม่อธิบายวิธีวัด (U7) · ไม่มีปุ่มที่ชวนเล่นต่อ มีแค่ปุ่มตั้งค่าและปุ่มออกจาก run ขนาดปกติ (ออกได้ทุกเมื่อตาม P2) · สั่นหนึ่งครั้งตอนเข้า lock ไม่มีเสียงวนซ้ำ
- F04-R24 event `anticheat_speed_lock_triggered` ตอนเข้าและออก lock (P2-F04-T17) · lock ครั้งแรกเป็นเงื่อนไขปลดหัวข้อช่วยเหลือ anti-cheat ตาม `config: unlocks.antiCheatHelp` (pillars 6.2 ข้อ 6)

### 3.5 เวลาทำการ (GDD "เวลาทำการ", "ความปลอดภัยทางกายภาพ")

- F04-R25 runtime อ่านเฉพาะเวลาทำการแบบ normalized ที่สร้างตอน build (P2-F04-T26) · ประเมินด้วย offset คงที่ `config: dungeons.openingHours.utcOffset_min` (เสนอ ชื่อสุดท้ายตาม P2-F05-T20) ไม่ใช้ timezone ของเครื่อง · ช่วงเปิดเป็นแบบ [เปิด, ปิด) คือวินาทีที่ถึงเวลาปิดถือว่าปิดแล้ว
- F04-R26 dungeon นำร่องทุกแห่งต้องมีเวลาทำการแบบ normalized (เปิด 24 ชม. ต้องระบุชัด) · ค่าที่ build แปลงไม่ได้ (เช่น `PH`) เป็นงานของ level-designer ก่อน publish ไม่ใช่การเดาตอน runtime (`manual_required`, TL B-12)
- F04-R27 dungeon ที่ปิดอยู่เข้าไม่ได้ (`config: dungeons.entry.respectOpeningHours`) · เข้าเขตแล้วเห็นแผงปิด (Flow B4) พร้อมเวลาเปิดถัดไป ไม่มีปุ่ม "เข้า"
- F04-R28 ถ้าเหลือเวลาถึงปิดไม่เกิน `config: dungeons.openingHours.closingSoonNotice_s` (เสนอ) popup confirm แสดงว่าจะปิดในอีกกี่นาที · ยังเข้าได้ ไม่บล็อก
- F04-R29 ระหว่าง run เมื่อเหลือเวลาถึงปิดเท่ากับ `closingSoonNotice_s` แจ้งหนึ่งครั้ง (สั่น + ข้อความสั้น)
- F04-R30 ถึงเวลาปิดระหว่าง run ไม่ว่าอยู่สถานะใด: run จบด้วย `dungeon_closed` · ของใน run เก็บครบ · tick ที่ค้างจ่ายตามกฎ D-059 (F05 หัวข้อ 3.5) · ไม่มีการเตะแบบลงโทษและไม่ต้องเดินออกเพื่อจบ
- F04-R31 การประเมินเวลาทำการบนแผนที่ (เปิด/ปิด, เวลาเปิดถัดไป) เป็นการแสดงผลที่ client ทำได้ · การตัดสินตอน confirm และตอนปิดระหว่าง run เป็นของ engine (Phase 3 ย้ายไป server)

### 3.6 ช่วงเลเวล (GDD "ระดับเลเวลที่เหมาะสม")

- F04-R32 ช่วงเลเวลไม่บล็อกการเข้า (`config: dungeons.levelRange.blockEntryOutsideRange` = false) · popup แสดงช่วงเลเวลเสมอ · ผลของการอยู่นอกช่วงคือ damage และ exp ตามตัวคูณใน config (F06, F05) ไม่มีผลต่อ check-in หรือ run state
- F04-R33 การแนะนำรอยแยกบนแผนที่เลือกแห่งที่ **เปิดอยู่** และช่วงเลเวลครอบเลเวลผู้เล่นก่อน (Flow A ขั้น 8) · onboarding นาที 1–3 เลือกเฉพาะแห่งที่เปิดอยู่ (D-089)

### 3.7 การนำทาง (A-3 ACCEPTED · D-089 เงื่อนไข 1–4)

- F04-R34 ระยะที่แสดง = ระยะเส้นตรงจากตำแหน่งผู้เล่นถึงขอบ polygon (pillars 7.1) **ปัดขึ้น** เป็นขั้นตาม `config: unlocks.home.distanceDisplaySteps_m` (เสนอ) ห้ามปัดลงจนดูใกล้กว่าจริง · มีคำกำกับว่าเป็นระยะเส้นตรงทุกครั้งที่แสดงระยะ
- F04-R35 เกณฑ์ "ไกล" ใช้ `config: unlocks.home.farDungeonThreshold_m` ที่ปรับด้วย route factor แล้ว (D-072, D-079) · เทียบกับระยะก่อนปัด
- F04-R36 ทิศแสดงเป็นลูกศรหรือข้อความทิศจากจุดของผู้เล่นเท่านั้น · **ไม่วาดเส้น** ใดๆ จากผู้เล่นถึง dungeon (เส้นตรงดูเหมือนเดินข้ามแม่น้ำ ทางด่วน ทางรถไฟได้) · ไม่มี turn-by-turn ในแอป
- F04-R37 ปุ่มนำทางเปิดแอปแผนที่ของเครื่องด้วยลิงก์ที่มี **เฉพาะปลายทาง** = จุดสาธารณะของ dungeon (ทางเข้าที่ปักไว้ ไม่มีก็ใช้จุดป้ายตาม D-075 ไม่ใช่ centroid) ในโหมดเดินเท้า · **ห้ามมีตำแหน่งผู้เล่นใน URL** · ไม่ใช้ API key หรือบริการคิดเงิน · รูปแบบลิงก์ต่อระบบและ fallback (แสดงชื่อสถานที่ให้คัดลอก) เป็นของ tech-lead ใน P2-F04-T14 (เงื่อนไข 5)
- F04-R38 dungeon ที่ปิดยังนำทางได้ แต่แสดงเวลาเปิดถัดไปก่อนปุ่มนำทาง
- F04-R39 ระยะและทิศคำนวณบน client ได้เพราะเป็นการแสดงผลที่ไม่มีผลต่อรางวัล (pillars 7.1)

## 4. สถานะและ transition

สถานะก่อน run: `Browsing` (ไม่มี run) → `ConfirmOpen` (อยู่ในเขต popup เปิด) → `CheckInPending` (popup เปิด ปุ่มเข้า disable) · overlay `SpeedLocked` ซ้อนได้ทุกสถานะที่ไม่ใช่ Ended

| # | จาก | ไป | เงื่อนไข | ผล |
| --- | --- | --- | --- | --- |
| T1 | Browsing | ConfirmOpen / CheckInPending | หลักฐานว่าอยู่ใน polygon ของ dungeon ที่เปิด | popup ขึ้นเอง · pending ถ้า R07 ยังไม่ครบ |
| T2 | CheckInPending | ConfirmOpen | R07 ครบ | ปุ่มเข้าใช้ได้ |
| T3 | ConfirmOpen | Active | กด "เข้า" และ engine ยืนยัน R07 + เปิดอยู่ + ไม่มี run | rewardWindow แรกเริ่ม (F05-R02) |
| T4 | ConfirmOpen | CheckInPending / Browsing | engine ปฏิเสธ / กดยกเลิก / ออกนอกเขต | ไม่มีบทลงโทษ |
| T5 | Browsing/ConfirmOpen | แผงปิด | dungeon ปิด (R27) | แสดงเวลาเปิดถัดไป |
| T6 | Active | Grace | ยืนยันการออก (R15) หรือไม่มีหลักฐาน | นาฬิกา rewardWindow หยุด ย้อนไปที่จุดเริ่มของการออก |
| T7 | Grace | Suspended | เวลานอก > `graceMax_s` | banner Suspended |
| T8 | Grace/Suspended | Active | ยืนยันการกลับเข้า | นาฬิกาเดินต่อจากเดิม (ไม่รีเซ็ต) |
| T9 | Suspended | Ended | เวลานอก > `suspendedMax_s` | `timeout` สรุป run |
| T10 | ทุกสถานะ run | Ended | ออกเอง / auto-retreat / ตาย / ถึงเวลาปิด / ปิดฉุกเฉิน / นาฬิกาใช้ไม่ได้ | ตาม exit_reason |
| T11 | ใดๆ | +SpeedLocked | R20 | R21 |
| T12 | +SpeedLocked | −SpeedLocked | R22 | กลับสถานะตามตำแหน่ง |

## 5. Edge case

| # | กรณี | ผลที่ต้องเกิด |
| --- | --- | --- |
| E1 | เดินเลียบขอบ sample สลับใน/นอก | ไม่เปลี่ยนสถานะจนครบ hysteresis (R15) · ถ้ายืนยันการออก เป็น Grace ตามปกติ ไม่ต่อเวลา · ระยะช่วงที่อยู่นอกไม่นับ (F05-R05) |
| E2 | GPS drift กระโดดออกนอกเขตหนึ่ง sample | ตัวกรอง outlier ทิ้ง หรือไม่ครบ hysteresis → ยัง Active |
| E3 | accuracy แย่ต่อเนื่องใต้ต้นไม้/ตึก | ไม่เปลี่ยนสถานะเพราะ sample เหล่านั้น (R16) · ถ้านานเกิน `maxSamplePairGap_s` = ไม่มีหลักฐาน → Grace ตามเวลา (R13) · ไม่มีระยะนับ |
| E4 | เปิดแอปครั้งแรกขณะยืนกลางสวน | check-in `no_approach_from_outside` บอกให้เดินออกนอกเขตแล้วกลับเข้ามา (R07 ข้อ 2) · ไม่ลงโทษ |
| E5 | teleport เข้ากลาง polygon (Mock) | ปฏิเสธ (ตัวกรองทิ้งคู่ที่ความเร็วเป็นไปไม่ได้ ลำดับจึงไม่ต่อเนื่อง) · trace QA ใน P2-F04-T19 |
| E6 | accuracy ตอน check-in 35 ม. เทียบเกณฑ์ | ปฏิเสธ `poor_accuracy` · accuracy เท่าเกณฑ์พอดีก็ปฏิเสธ (R07 ข้อ 3) |
| E7 | จอล็อก / หน้าเว็บ hidden / แอปถูกปิด แล้วเปิดใหม่ | run ไม่ถูกลบ · เวลาที่หายเป็นเวลานอกย้อนจาก sample ที่ใช้ได้ตัวสุดท้าย (R14) · กลับมาภายใน `suspendedMax_s` และอยู่ในเขต = Active ต่อ · เกิน = สรุป run `timeout` (R18) · ระยะที่คร่อมช่องว่างไม่นับ (F05-R06) |
| E8 | เน็ตหลุด | Phase 2 ไม่มีผลใดต่อ run (ไม่มี server) · banner offline บนแผนที่ตาม flow เท่านั้น |
| E9 | เปลี่ยน dungeon กลางทาง | ต้องออกเองก่อน (R04) · เดินเข้า polygon ที่ซ้อนกันระหว่าง run ไม่มีผล (R03) · ออกจาก polygon ที่เลือกแต่ยังอยู่ในอีกแห่ง = นอก |
| E10 | นาฬิกาเครื่องเพี้ยน / ถูกตั้งย้อน | engine ใช้เวลาที่ host ส่งเข้า (now_ms, D-087) · sample ที่ timestamp ย้อนหลังหรือเกินอนาคตเกิน `config: dungeons.runState.clockSkewTolerance_s` (เสนอ) ถูกทิ้ง · ถ้าเวลาปัจจุบันย้อนกลับก่อนเหตุการณ์ล่าสุดของ run จบ run ด้วย `clock_invalid` ณ เวลาเหตุการณ์ล่าสุด เก็บของครบ ไม่มี tick เพิ่ม · Phase 3 เวลาของ server เป็นตัวจริง |
| E11 | ปิดทำการระหว่างอยู่ใน Suspended | จบ `dungeon_closed` ทันที ไม่รอ timeout · D-059 คิดจากเวลา Active ในหน้าต่างที่ค้าง |
| E12 | เข้า 1 นาทีก่อนปิด | เข้าได้ พร้อมคำเตือน R28 · ถึงเวลาปิด tick ค้างต่ำกว่าเกณฑ์ขั้นต่ำของ D-059 ไม่ได้อะไร ของอื่นไม่มีให้เสีย |
| E13 | นั่งรถผ่าน polygon (ถนนใน/ติดสวน) | lock ก่อน popup เปิด · ไม่มี check-in ระหว่าง lock (R21) |
| E14 | ปั่นจักรยานในสวนเร็วเกินเกณฑ์ | lock ตาม GDD ปลดเมื่อช้าลง (R22) · run ไม่จบ |
| E15 | ออกเองแล้ว confirm แห่งเดิมทันที | ได้ ต้องผ่าน check-in ใหม่ · run ใหม่ rewardWindow เริ่มใหม่ |
| E16 | ไม่มี sample ก่อน confirm เพราะเพิ่งให้ permission | `not_enough_trace` นับถอยหลังจนครบ (R09) |
| E17 | เลเวลต่ำกว่าช่วงมาก | เข้าได้ (R32) · ผลต่อ damage อยู่ใน F06 |
| E18 | ผู้เล่นออกนอกพื้นที่เล่น (โซนดำ) ระหว่าง run | run state ตัดสินจาก polygon ตามปกติ ไม่มีกฎพิเศษ |

party ออก/เข้า, dungeon ถูกรายงานจนพัก และ offline evidence ย้อนหลังไม่อยู่ใน Phase 2 (หัวข้อ 6)

## 6. Out-of-scope

- party, Nearby Party, จำนวนคน/role ใน dungeon (F09, Phase 3) · Phase 2 ซ่อนทั้งหมด
- server, account, offline evidence upload และ trust weight ย้อนหลัง (F08, Phase 3) · noise fingerprint, trust score (F19)
- raid และการเลือก dungeon กับวงบอส (F16–F17) · Flow B3 ไม่ทำใน Phase 2
- หลังบ้าน: ปิดฉุกเฉิน พัก dungeon จากรายงาน ปุ่มรายงานสถานที่เข้าไม่ถึง (F13–F15, Phase 5) · engine รองรับ D-059 แล้วแต่ไม่มีทางเรียกนอก test
- ตลาด ร้าน NPC ตีบวก (Phase 4) · dungeon ชั่วคราว, dungeon ในอาคาร, `entry_exit` strategy (โยน NotImplemented ตาม ADR 0003)
- routing จริง เส้นทาง turn-by-turn ในแอป

## 7. Acceptance criteria (สิ่งที่สังเกตได้)

1. มี run ได้ครั้งละหนึ่ง · จุดที่ polygon ซ้อน popup ให้เลือกหนึ่งแห่ง และ run state ของแห่งที่เลือกไม่เปลี่ยนเมื่อเดินอยู่ในอีกแห่ง
2. ไม่มีทางเข้า run โดยไม่กด "เข้า" ใน popup · popup ไม่มีจำนวนคนหรือ role
3. trace teleport เข้ากลาง polygon และ trace accuracy 35 ม. ถูกปฏิเสธพร้อม reason ที่ถูก · trace เดินเข้าจากข้างนอกครบ `minContinuousApproach_s` ที่ accuracy ดีผ่าน · ปุ่มเข้าแสดงสถานะรอตาม R09
4. trace ออกนอกเขต 2:59 นาทีแล้วกลับ = Grace แล้ว Active · 3:01 = Suspended · 14:59 = กลับ Active ได้ · 15:01 = Ended `timeout` (ขอบตาม config ไม่ใช่ค่าตายตัวในโค้ด)
5. trace เลียบขอบและ drift ไม่ทำให้สถานะสลับถี่กว่าเกณฑ์ hysteresis และเวลานอกนับย้อนจาก sample แรกที่อยู่นอก
6. ปิดแอป 5 นาทีแล้วเปิดในเขต: run เดิมยังอยู่ ช่วงที่หายไม่มีระยะ · ปิด 16 นาที: เห็นสรุป run ที่จบตามเวลา R18 ของไม่หาย
7. trace `driving-40kmh`: lock ภายใน `lockSustained_s` ไม่มี tick ไม่มี damage ขณะ lock · ปลดเองหลังเดินช้าต่อเนื่อง `unlockSustained_s` · จอ lock ไม่มีคำว่าโกงหรือ anti-cheat
8. dungeon ที่ปิดไม่มีปุ่มเข้าและแสดงเวลาเปิดถัดไป · run ที่คร่อมเวลาปิดจบด้วย `dungeon_closed` ที่วินาทีปิด ของเก็บครบ tick ค้างตาม D-059
9. เลเวลนอกช่วงเข้าได้ · onboarding แนะนำเฉพาะแห่งที่เปิดอยู่
10. ระยะบนจอไม่เคยน้อยกว่าระยะเส้นตรงจริง มีคำกำกับ · ไม่มีเส้นจากผู้เล่นถึง dungeon · ลิงก์นำทางมีแค่พิกัดปลายทางของจุดสาธารณะและโหมดเดิน (ตรวจ URL ได้)
11. หลัง run จบ storage ในเครื่องไม่มีพิกัดของ run นั้น (D-088) · telemetry ไม่มีพิกัด
12. ทุกตัวเลขที่ใช้อ่านจาก config key ในหัวข้อ 8 (config lint ของ P2-F04-T24)

## 8. Config key

มีแล้ว: `dungeons.entry.*`, `dungeons.runState.graceMax_s`, `suspendedMax_s`, `rewardTickDuringGrace`, `rewardTickDuringSuspended`, `suspendedTimeCounts`, `dungeons.levelRange.blockEntryOutsideRange`, `dungeons.area.minArea_m2`, `dungeons.exit.manualExitAnytime`, `anticheat.checkIn.minContinuousApproach_s`, `maxAccuracy_m`, `teleportIntoPolygonAllowed`, `anticheat.speedLock.speedLock_kmh`, `action`, `unlocks.home.farDungeonThreshold_m`, `unlocks.antiCheatHelp`

ข้อเสนอให้ systems-designer (P2-F05-T20 · ชื่อสุดท้ายเป็นของ systems):

| key ที่เสนอ | ใช้ใน | กรอบจาก design |
| --- | --- | --- |
| `dungeons.movementGate.maxSamplePairGap_s` | R07, R13, F05 | ร่วมกับ F05 · สั้นกว่า `graceMax_s` มาก |
| `dungeons.movementGate.maxSampleAccuracy_m` | 3.3, F05 | ไม่เข้มกว่า `anticheat.checkIn.maxAccuracy_m` |
| `dungeons.runState.edgeHysteresisSamples`, `edgeHysteresis_m` | R15 | R15 ข้อ 4 |
| `dungeons.runState.clockSkewTolerance_s` | E10 | ไม่ยาวจนกลายเป็นเวลาเล่นเพิ่ม |
| `anticheat.speedLock.lockSustained_s`, `unlockSustained_s` | R20, R22 | R20, R22 |
| `dungeons.openingHours.utcOffset_min`, `closingSoonNotice_s` | 3.5 | offset ตามกรุงเทพ · แจ้งก่อนพอให้เดินจบ tick ได้ |
| `unlocks.home.distanceDisplaySteps_m` | R34 | ปัดขึ้นเสมอ |

## 9. คำตัดสินในเอกสารนี้ (ส่ง orchestrator ลง decision log)

รูปแบบ: หลักการที่ใช้ตามลำดับ GDD
1. **ปิดทำการระหว่าง run = จบ run แบบ `dungeon_closed` ใช้กฎจ่ายของ D-059** (GDD เงียบ) · ข้อ 1 ไม่เกี่ยว · ข้อ 2 D-059 ผ่าน gate ทุกเศษ · ข้อ 3 ของไม่หาย ไม่ต้องเดินออก ได้คำเตือนล่วงหน้า · เจตนา GDD "ไม่ให้มีคนไปปีนรั้วตอนดึก" ใช้กับการอยู่ต่อหลังปิดด้วย
2. **check-in ต้องมี sample นอก polygon ในลำดับต่อเนื่องเสมอ แม้ผู้เล่นเปิดแอปครั้งแรกกลางสวน** · ข้อ 2 (เดินจริงก่อนได้เข้า) มาก่อนข้อ 3 และตรงข้อความ GDD ชั้น 1 · บรรเทาข้อ 3 ด้วย R11 (เก็บ trace ตั้งแต่หน้าแผนที่)
3. **transition มีผลย้อนไปที่ sample แรกของชุดที่ยืนยัน และ "ไม่มีหลักฐาน" นับเป็นเวลานอกจาก sample ที่ใช้ได้ตัวสุดท้าย** · ข้อ 2 (ไม่มีหลักฐาน = ไม่มีรางวัล) · ข้อ 3 run ไม่ถูกลบภายใน 15 นาที
4. **speed lock เป็น overlay ที่หยุดนาฬิกา tick และ damage ไม่ทำให้ run จบเอง และปลดด้วยเกณฑ์ต่อเนื่อง** · ข้อ 2 (ไม่มีรางวัลจากการนั่งรถ) · ข้อ 3 (ไม่เสีย run เพราะผ่านถนนหนึ่งช่วง ไม่โดนตีขณะเล่นไม่ได้)
5. **นาฬิกาย้อน = จบ run `clock_invalid` เก็บของครบ** · ข้อ 2 ไม่มี tick จากเวลาที่ตรวจไม่ได้ · ข้อ 3 ไม่ริบของเดิม
5b. **damage ทอยเฉพาะตอน Active ที่ไม่ lock (ไม่มีใน Grace/Suspended)** (GDD เงียบ) · ข้อ 3 ช่วงที่ไม่ได้ tick ต้องไม่เสีย HP · มอนสเตอร์อยู่ "ในบ้านมัน" คือใน polygon · F06 ยึดตามนี้
6. ข้อที่เกี่ยวกับระยะนอก polygon, การเดินต่อของ rewardWindow และนิยามของใน run อยู่ใน F05 หัวข้อ 9

## 10. สมมติฐานและคำถามค้าง

- [ASSUMPTION A-P2-F04-T01-1: ADR 0003 นิยามตัวกรอง outlier, การ resample และวิธีวัดความเร็วที่ R07, R16, R20 อ้าง · ถ้า ADR ใช้คำหรือ key ต่างจากนี้ ให้ยึด ADR แล้วแก้ spec เป็น fix · owner: tech-lead]
- [ASSUMPTION A-P2-F04-T01-2: R14 ย้อนเวลา transition ต้องให้ engine ถือ sample ที่รอยืนยันไว้ไม่เกินจำนวนของ hysteresis ซึ่งอยู่ในเพดาน D-088 · owner: tech-lead, backend-programmer]
- คำถาม (playtest P2-F06-T27): สัดส่วนคนที่เจอ `no_approach_from_outside` ครั้งแรก และเวลาที่เสียไป · ถ้าสูงมาก game-director พิจารณาจุดเริ่ม trace ใหม่ แต่ไม่ลดเงื่อนไข "มาจากข้างนอก"
- คำถาม: จักรยานในสวนถูก lock ตาม GDD เป็นความตั้งใจ · product-manager เฝ้าจำนวน lock ภายใน polygon ใน playtest
