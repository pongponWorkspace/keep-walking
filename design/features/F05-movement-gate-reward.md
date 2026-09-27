# F05 — Movement Gate, Reward Tick และ Drop

Task: P2-F04-T01 · เจ้าของ: game-director · สถานะ: ผ่าน design gate P2-F05-T18 (2026-09-28 · `design/reviews/F04-F05-design-gate.md`) · วันที่: 2026-09-26 · แก้ล่าสุด: 2026-09-28 (P2-H35 ดูหัวข้อ 11)
แหล่งอ้างอิง: GDD "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "Core loop ใน Dungeon" (Reward tick, Movement gate, ไม่มีเพดานเวลาและไม่มี diminishing return), "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู" (ระบบกันตาย, เมื่อตาย, ผลข้างเคียงที่ตั้งใจ), "Progression > ตัวเลขตั้งต้น" (Exp curve, Drop table), "Anti-cheat" ชั้น 3, "สัญญาณขาดและแอปถูกปิด", "หลักการที่ห้ามละเมิด" · `design/pillars.md` (P1, NN-1, NN-2, NN-8, หัวข้อ 6.2 "run ที่นับ") · `design/reviews/F03-design-gate-b.md` 4.2 (D-059) และ 4.6 (R-B1 = D-078) · plan review GD B-04, B-06, B-07, N-03 · TL N-14 · D-059, D-078, D-087, D-088, D-089
คู่กับ: `design/features/F04-dungeon-presence.md` (run state, check-in, speed lock, เวลาทำการ) · HP, damage, ยา, onboarding อยู่ใน spec F06 (P2-F06-T02)
ตัวเลขทุกตัวเป็น `config: <key>` · key ที่เคยเสนอให้ systems-designer ตั้งไว้แล้วใน P2-F05-T20 ด้วยชื่อตาม config และ ADR 0003 · นิยามเทคนิคของหน้าต่างและตัวกรองเป็นของ ADR 0003 (P2-F04-T05) เอกสารนี้กำหนดกฎเกม

## 1. ผู้เล่นทำอะไร เห็นอะไร รู้สึกอะไร

- เข้า run แล้วเก็บมือถือ เดินเล่นตามปกติ ทุก 5 นาทีมือถือสั่นหนึ่งครั้ง ถ้าเดินพอได้ของเป็นก้อน ถ้าไม่พอ เกมบอกเฉยๆ ว่ารอบนี้เดินไม่พอ ไม่ต่อว่า ไม่หักอะไร
- ออกไปซื้อน้ำนอกเขต นาฬิกาของรอบหยุดรอ กลับมาเดินต่อ รอบเดิมนับต่อจากที่ค้างไว้ ของที่เดินสะสมไว้ก่อนออกไม่หาย
- จอดับหรือแอปถูกปิดสักพัก ช่วงนั้นไม่มีระยะ เพราะเกมไม่เห็นว่าเดิน แต่ run ยังอยู่และของที่ได้แล้วยังอยู่
- จบ run เห็นสรุปว่าได้อะไร ได้กี่รอบ จบเพราะอะไร แล้วกลับไปเดินต่อได้ไม่จำกัด run ที่สองได้เต็มเหมือน run แรก
- ความรู้สึกที่ต้องการ: "ทุกของที่ได้ ได้เพราะเดินจริง" (P1) และ "เกมแฟร์ ไม่กลั่นแกล้ง" (GDD "สัญญาณขาดและแอปถูกปิด")

## 2. ขอบเขต Phase 2 และหลักที่ต้องถือ

1. gate, tick, drop, exp และสรุป run คำนวณด้วย pure reducer ใน `packages/shared` ที่ server จะรันใน Phase 3 · client เรียกผ่าน `session` · ผลใน Phase 2 เป็นต้นแบบใน namespace `kw.p2.*` ไม่ใช่รางวัลจริง ไม่ย้ายเข้า account (D-087, NN-1)
2. RNG ของ drop และ hit เป็น stream แยกที่แตกจาก seed ของ run แบบกำหนดแน่นอน ลำดับการดึงตาม ADR 0003 · Phase 3 seed อยู่ที่ server เท่านั้น
3. ไม่มีข้อมูลออกจากเครื่อง · engine ไม่ต้องเก็บ sample ย้อนหลังเกินที่หน้าต่างปัจจุบันใช้ เก็บเป็นระยะสะสมของหน้าต่างแทนรายการพิกัด (D-088)
4. **gate เดียวไม่มีข้อยกเว้น:** ทุกทางที่ให้ของใน F04/F05/F06 (tick ปกติ, tick บางส่วนของ D-059, ยา, รางวัลก้อนแรกของ onboarding) ผ่าน `config: dungeons.movementGate.*` ตัวเดียวกัน (NN-2, D-089, `movementGate.exceptions` ว่างเสมอ)

## 3. กฎ (ทดสอบได้)

### 3.1 rewardWindow และจังหวะ tick

- F05-R01 **rewardWindow** = ช่วงเวลา Active ยาว `config: dungeons.movementGate.window_s` ที่ต่อกันและไม่ทับกัน · เป็นหน้าต่างเดียวที่ตัดสินรางวัล · `gateDiagnosticWindows` (หน้าต่างเลื่อนของ ADR 0003) ใช้กับ HUD วัดผลเท่านั้น ห้ามใช้ตัดสินรางวัลหรือแสดงผล tick ให้ผู้เล่น
- F05-R02 rewardWindow แรกของ run เริ่มที่ transition Active จากการ confirm (F04 T3) · ไม่เริ่มตอนเปิดแอปหรือตอนเข้าเขต · sample ก่อน confirm (ที่ใช้ check-in) ไม่นับระยะ
- F05-R03 นาฬิกาของ rewardWindow เดินเฉพาะตอน Active ที่ไม่ lock · หยุดตอน Grace, Suspended และ speed lock (F04 R12, R21) · เมื่อกลับ Active นาฬิกาเดินต่อจากเวลาที่ค้าง และระยะสะสมที่นับไว้ในหน้าต่างนั้นยังอยู่ (ไม่รีเซ็ต)
- F05-R04 tick เกิดเมื่อเวลา Active ของหน้าต่างครบ `window_s` · `config: dungeons.rewardTick.rewardTickInterval_s` ต้องเท่ากับ `window_s` (config lint ล้มถ้าไม่เท่า) · tick ทุกครั้งตัดสินด้วยหน้าต่างของตัวเองเท่านั้น หน้าต่างถัดไปเริ่มทันที
- F05-R04b (ผู้เล่นเห็น) จอ run และจอพกกระเป๋าแสดงเวลาถึง tick ถัดไปจากนาฬิกาของ rewardWindow · ตอนนาฬิกาหยุด ตัวนับหยุดให้เห็น · ถ้า flow ต้องการแสดงว่า "รอบนี้เดินพอแล้ว" ต้องอ่านจากระยะสะสมของ rewardWindow ไม่ใช่ diagnostic

### 3.2 ระยะที่นับเข้า gate

- F05-R05 คู่ sample ที่ติดกันในชุดที่ผ่านตัวกรอง (ADR 0003: ทิ้งเฉพาะ outlier ตาม `config: dungeons.movementGate.outlierSpeed_kmh` และ `outlierReanchorSamples` ไม่ smoothing jitter เล็ก แล้ว resample เป็นจังหวะคงที่ `config: dungeons.movementGate.sampleCadence_s`) นับระยะเส้นทรงกลมระหว่างกัน ก็ต่อเมื่อครบทุกข้อ
  1. ทั้งสอง sample อยู่ใน polygon ของ run
  2. ทั้งสองเวลาอยู่ในช่วงที่นาฬิกา rewardWindow เดิน (Active และไม่ lock หลังการย้อนเวลา transition ของ F04 R14)
  3. เวลาห่างกันไม่เกิน `config: dungeons.movementGate.maxSamplePairGap_s` (GD B-04)
  4. accuracy ของทั้งคู่ไม่แย่กว่า `config: dungeons.movementGate.maxSampleAccuracy_m` (accuracy เท่าเกณฑ์นับได้ แย่กว่าไม่นับ)
- F05-R06 การ resample ห้ามสร้างจุดข้ามคู่ที่ข้อ R05 ไม่นับ (ข้ามช่องว่าง ข้ามขอบ polygon ข้ามช่วงนาฬิกาหยุด) · ระยะที่คร่อมช่องว่างจึงเป็นศูนย์เสมอ ไม่ประมาณ ไม่ย้อนเติม (GDD "ไม่มีหลักฐานว่าเดินจริง = ไม่มี reward เพิ่ม")
- F05-R07 คู่ที่คร่อมขอบระหว่างสองหน้าต่างใช้กฎเดียวที่ ADR 0003 เลือก และทุกที่ (dungeon, D-059, raid ในอนาคต) ใช้กฎเดียวกัน
- F05-R08 tick ผ่าน gate เมื่อระยะสะสมของหน้าต่าง **มากกว่า** `config: dungeons.movementGate.minDistancePerWindow_m` (`comparison` = `greaterThan` · เท่าเกณฑ์พอดีไม่ผ่าน)
- F05-R09 **ระยะที่เดินนอก polygon ไม่นับ ไม่ว่าจะอยู่ใน Grace, Suspended หรือช่วงรอยืนยัน hysteresis ที่ลงเอยเป็นการออก** และไม่ยกไปนับในหน้าต่างถัดไป (คำตัดสินหัวข้อ 9 ข้อ 1)

### 3.3 สิ่งที่ tick ให้

- F05-R10 tick ที่ผ่าน gate ให้ exp และ drop ในครั้งเดียว · tick ที่ไม่ผ่านไม่ให้อะไร ไม่มีผลต่อ HP, run state, trust หรือ tick ถัดไป และแสดงผลแบบไม่ลงโทษ (NN-8 ข้อ 4, Flow C 4.6)
- F05-R11 exp ต่อ tick ตาม `config: progression.expCurve` (`expPerTickCoef`, `expPerTickExponent`) ที่ระดับโซน Z ตาม `config: combat.zoneLevelFrom` คูณ `config: progression.expMultipliers` (ส่วนต่างเลเวลกับช่วงของโซน และตัวคูณ Magic) · สูตรและการปัดเป็นของ `design/systems/balance-model.md`
- F05-R12 drop ต่อ tick: ทอยแต่ละ rarity แยกกันตาม `config: drops.baseChancePerRewardTick_pct` (Common ถึง Legendary) จำนวนตาม `config: drops.quantityPerDrop` ชนิดตาม `config: drops.rewardTypeByRarity` แล้วเลือกของจากตาราง `drop_table_id` ของ dungeon (level-designer, P2-F04-T13) · ตัวคูณตาม `config: drops.multipliers` ที่ใช้ได้ใน Phase 2 คือ dungeon เล็ก (`config: drops.smallDungeon`) และตัวคูณ Ranged ตามสถานะคนเดียว · ตัวคูณสัปดาห์บอสและ trust ต่ำไม่มีใน Phase 2 (ค่าเป็นกลาง)
- F05-R13 Phase 2 ไม่มี party ตัวคูณที่ขึ้นกับ party ใช้กรณีคนเดียวตาม balance-model (class ของผู้เล่นเองยังได้ buff ของตัวเองตามนิยาม D-039) · ไม่มีการคูณชดเชยเพราะไม่มี party
- F05-R14 **ยาใน Phase 2 มาจาก drop ของ tick ที่ผ่าน gate เท่านั้น** (D-089) · ตาราง drop ของทุก preset มียา (P2-F05-T01) · ไม่มีชุดยาตั้งต้น ของขวัญแรกเข้า หรือร้าน NPC ใน Phase 2
- F05-R15 **รางวัลก้อนแรกของ onboarding = tick ปกติของ engine นี้** ผ่าน gate เดียวกัน ไม่มี code path แยก ไม่ลดเกณฑ์ ไม่เร่ง tick แรก ไม่มีของแถมเมื่อจบ tutorial (D-089) · ความเด่นของก้อนแรกทำที่การแสดงผล (effect, copy) เท่านั้น (F06)
- F05-R16 exp มีผลทันทีที่ tick · เลเวลที่ขึ้นใช้กับ tick และ damage ถัดไป · แต้ม stat สะสมเงียบตาม F06 (U4 ยังไม่ปลด)
- F05-R17 ของจาก tick เข้า **ถุงของ run** ทันที · ยาในถุงของ run ใช้ได้ใน run นั้น (ยาอัตโนมัติ ลำดับการเลือกยาเป็นของ F06) · ถุงของ run รวมเข้า inventory ในเครื่องเมื่อ run จบด้วยเหตุที่เก็บของ (3.5)

### 3.4 R-B1 ลำดับผลต่อการโดนตีหนึ่งครั้ง (D-078)

- F05-R18 ทุกครั้งที่ผลทอยว่าโดนตี (stream `hit`) engine คิดตามลำดับนี้ในจังหวะเดียว: (1) damage ตามสูตร โล่ดูดซับก่อน (2) ถ้าเปิด auto-retreat HP หลังหักต่ำสุดเป็น 1 · ถ้าปิด HP ถึง 0 ได้ และ 0 = ตายทันที ยาอัตโนมัติไม่ชุบ (3) ถ้า HP ต่ำกว่าเกณฑ์ยาอัตโนมัติและมียา ใช้ยา (4) ถ้าเปิด auto-retreat และ HP หลังใช้ยา ≤ `config: dungeons.hpSafety.autoRetreatThreshold_pct` ถอน run จบ `auto_retreat` (5) แจ้ง HP ต่ำจาก HP สุดท้ายของลำดับ ครั้งเดียวต่อการลงผ่านเกณฑ์ ถ้าข้อ 4 เกิดพร้อมกันใช้ auto-retreat เป็นสัญญาณเดียว
- F05-R19 ผล: เปิด auto-retreat (ค่าเริ่มต้น) ตายจากมอนสเตอร์ไม่ได้ · ค่า damage และเกณฑ์ยาเป็นของ F06 · การทอย hit เกิดเฉพาะตอน Active ที่ไม่ lock (F04 R12, R21) · tick และ hit ที่ตรงเวลาเดียวกัน: tick ก่อน (ของที่ได้ใน tick นั้นเข้าถุงก่อนผลของ hit)

### 3.5 จบ run และการจ่ายของ (รวม D-059 และนิยามของใน run · TL N-14)

- F05-R20 **ของใน run** = ทุกชิ้นที่เข้าถุงของ run ใน run นี้และยังไม่ถูกใช้ (วัตถุดิบ อุปกรณ์ ยา) · **exp ไม่ใช่ของใน run** · ยาที่พกเข้ามาก่อน run ไม่ใช่ของใน run (ที่ใช้ไปแล้วก็หมดไปตามปกติ)
- F05-R21 การจ่ายต่อ exit_reason (F04 R17)

| exit_reason | ของใน run | exp ที่ได้แล้ว | หน้าต่างที่ค้าง |
| --- | --- | --- | --- |
| `manual_exit`, `auto_retreat`, `timeout`, `clock_invalid` | เก็บครบ (`config: dungeons.hpSafety.autoRetreatKeepsRunLoot`) | เก็บ | ทิ้ง ไม่จ่าย |
| `dungeon_closed`, `emergency_close` | เก็บครบ | เก็บ | จ่ายบางส่วนตาม R22 |
| `death` | หายทั้งหมด (`config: dungeons.death.loseAllRunLoot`) | เก็บ | ทิ้ง ไม่จ่าย |

- F05-R22 tick บางส่วนตอนปิด (D-059 · `config: dungeons.emergencyClose.*`): ให้ e = เวลา Active ที่สะสมในหน้าต่างที่ค้าง · ถ้า e < `partialTickMinElapsed_s` ไม่จ่าย · ไม่งั้นจ่ายเมื่อระยะที่นับในหน้าต่างนั้น **มากกว่า** `minDistancePerWindow_m` × e / `window_s` · สิ่งที่จ่ายคือ tick หนึ่งครั้งที่ย่อด้วย f = e / `window_s`: exp × f, โอกาสของทุก rarity × f, จำนวน Common × f ปัดแบบ `config: drops.quantityPerDrop.fractionalQuantityRounding` · tick ที่จบก่อนปิดตัดสินตาม gate ปกติไปแล้ว
- F05-R23 run ที่มี tick ผ่าน gate อย่างน้อยหนึ่งครั้ง (รวม tick บางส่วนของ R22 ที่ผ่าน) เป็น "run ที่นับ" ตามนิยามใน `config/balance/unlocks.json` `_meta._note` (pillars 6.2)

### 3.6 สรุป run

- F05-R24 ทุก exit_reason จบที่หน้าสรุปเดียว (Flow C 4.8) หัวข้อบอกเหตุที่จบแยกตาม exit_reason (รวม `dungeon_closed` และ `clock_invalid` ที่ flow F03 ยังไม่มี)
- F05-R25 เนื้อหา: ของที่เก็บได้แยกตาม rarity, exp ที่ได้และเลเวลที่ขึ้น, จำนวน tick ที่ผ่าน gate เทียบจำนวน tick ที่ประเมิน, tick บางส่วนของ R22 (ถ้ามี) แสดงว่าเป็นบางส่วน · ระยะที่นับรวมของตัวเองแสดงได้ถ้า flow เลือก · ไม่มีพิกัด แผนที่เส้นทาง หรือข้อมูลผู้เล่นอื่น
- F05-R26 จบด้วย `death`: รายการของว่างเสมอ และบอกว่า exp ยังอยู่ (ถ้อยคำเป็นของ narrative-designer ตามสามจังหวะของ GDD)
- F05-R27 ปุ่มเด่นเดียวพากลับแผนที่เพื่อเดินต่อ · สรุป run เก็บในเครื่องได้โดยไม่มีพิกัด (D-088)

### 3.7 ไม่มีเพดาน (GDD "ไม่มีเพดานเวลาและไม่มี diminishing return")

- F05-R28 ไม่มีเพดานจำนวน tick ต่อ run หรือต่อวัน ไม่มีเพดานเวลา run และไม่มีตัวลดรางวัลตามเวลาหรือจำนวน run · run ที่สองและสามได้ตามสูตรเดียวกับ run แรก · Phase 2 ไม่มีเพดานช่องเก็บของ [ASSUMPTION A-P2-F04-T01-3]

## 4. สถานะของหน้าต่างและ tick

| สถานะ | เข้าเมื่อ | ออกเมื่อ |
| --- | --- | --- |
| `WindowRunning` | confirm (หน้าต่างแรก) · tick ก่อนหน้าเสร็จ · กลับ Active | ออกจาก Active หรือ lock → `WindowPaused` · เวลา Active ครบ `window_s` → `TickDue` |
| `WindowPaused` | Grace, Suspended, speed lock, รอยืนยัน hysteresis ที่ลงเอยเป็นการออก | กลับ Active → `WindowRunning` (เวลาและระยะเดิม) · run จบ → จ่ายตาม R21 |
| `TickDue` | เวลา Active ครบ | ประเมิน R08 → `TickGranted` (R10–R17) หรือ `TickDenied` แล้วเริ่มหน้าต่างใหม่ทันที |

## 5. Edge case

| # | กรณี | ผลที่ต้องเกิด |
| --- | --- | --- |
| G1 | ระยะในหน้าต่างเท่าเกณฑ์พอดี | ไม่ผ่าน (`greaterThan`) |
| G2 | ตัวอย่าง GDD แบบ client: เดิน 20 นาที ช่องว่าง 5 นาทีที่จุดห่างกัน 400 ม. เดินต่อ 5 นาที | 400 ม. ที่คร่อมช่องว่างไม่นับ · run อยู่ต่อ (Suspended แล้ว Active) · หน้าต่างที่ค้างก่อนช่องว่างเดินต่อหลังกลับ ได้ tick ก็ต่อเมื่อระยะจากคู่ที่นับได้เกินเกณฑ์เอง (GD B-04) |
| G3 | ออกนอกเขตกลางหน้าต่าง เดินนอกเขต 2 นาที แล้วกลับ | ระยะนอกเขตไม่นับ · หน้าต่างเดินต่อด้วยระยะที่นับไว้ก่อนออก |
| G4 | เดินเลียบขอบ sample สลับใน/นอก โดยไม่ยืนยันการออก | ยัง Active · คู่ที่มี sample นอก polygon ไม่นับ (R05 ข้อ 1) · 50 ม./5 นาที เผื่อพอสำหรับคนที่เดินจริงในเขต |
| G5 | นั่งม้านั่ง / ยืนคุยโทรศัพท์ | jitter จริงนับตามกฎ ไม่มีการกรองให้ผ่านหรือไม่ผ่าน (ADR 0003 ไม่ smoothing jitter เล็ก) · ผลจริงของเครื่องวัดในงานสนาม (P2-C03) ถ้ามือถือวางนิ่งผ่าน gate ได้ ส่งกลับ game-director (NN-8) ไม่แก้ gate เงียบ |
| G6 | accuracy แย่ทั้งหน้าต่าง | ไม่มีระยะ → tick ไม่ผ่าน แสดงแบบไม่ลงโทษ |
| G7 | speed lock ระหว่างหน้าต่าง | นาฬิกาหยุด ระยะระหว่าง lock ไม่นับ (F04 R21) · ปลดแล้วเดินต่อ |
| G8 | แอปถูกปิดที่ 4:59 ของหน้าต่าง แล้วกลับภายใน `graceMax_s` | หน้าต่างค้างที่เวลาของ sample ที่ใช้ได้ตัวสุดท้าย · เดินต่ออีกราวหนึ่งวินาทีของเวลา Active แล้วประเมิน tick |
| G9 | ถึงเวลาปิดตอนหน้าต่างค้าง 3 นาที | R22: f = 0.6 ของหนึ่ง tick เมื่อระยะ > 0.6 × เกณฑ์ (ตัวอย่างใช้ค่าปัจจุบันเพื่ออธิบายเท่านั้น) |
| G10 | ปิดตอนหน้าต่างค้าง 59 วินาที | ไม่จ่าย (`partialTickMinElapsed_s`) · vector 59/60 วิ ใน P2-F05-T01 |
| G11 | ตายขณะปิด auto-retreat หลังได้ 6 tick | ของใน run หายทั้งหมด exp ของ 6 tick อยู่ · เลเวลที่ขึ้นแล้วไม่ลด |
| G12 | auto-retreat ตรงกับวินาทีที่ tick ครบ | tick ก่อน แล้วถอน (R19) · ของ tick นั้นอยู่ในสรุป |
| G13 | เลเวลขึ้นกลาง run | exp tick ถัดไปใช้เลเวลใหม่กับตัวคูณส่วนต่างเลเวล (R16) |
| G14 | run ยาว 3 ชั่วโมง / run ที่สามของวัน | ทุก tick ใช้สูตรเดียวกัน ไม่มีตัวลด (R28) |
| G15 | นาฬิกาเครื่องถูกตั้งย้อน | จบ `clock_invalid` หน้าต่างค้างทิ้ง ของเก็บครบ (F04 E10) |
| G16 | เปิดแอปครั้งแรก ได้ tick แรกไม่ผ่าน | บอกแค่ว่าเดินไม่พอ รอ tick ถัดไป ไม่มีทางลัดของ onboarding (R15) |

## 6. Out-of-scope

- server validate ย้อนหลัง, offline evidence, batch ส่ง tick ทุกนาที (F08, Phase 3)
- party และตัวคูณของ party จริง, Nearby Party (F09) · trust score และตัวคูณ (F19) · สัปดาห์ล้มบอสไม่สำเร็จ (F18)
- raid และ checkpoint reward (F16–F18) แม้ใช้ gate เดียวกัน · ปิดฉุกเฉินและพัก dungeon จากหลังบ้าน (Phase 5, engine รองรับ R22 แล้ว)
- gold, ร้าน NPC, ตลาด, ตีบวก, การเลือกขนาดยาอัตโนมัติ (Phase 4) · การลงแต้ม stat (F10, U4)

## 7. Acceptance criteria (สิ่งที่สังเกตได้)

1. trace ที่ระยะนับได้ในหน้าต่างมากกว่าเกณฑ์ได้ tick · เท่าเกณฑ์พอดีไม่ได้ · ค่าอ่านจาก `dungeons.movementGate` (เปลี่ยน config แล้วผลเปลี่ยนตาม ไม่มีค่าในโค้ด)
2. tick แรกเกิดเมื่อเวลา Active นับจาก confirm ครบ `window_s` · trace ที่มี Grace 2 นาทีระหว่างหน้าต่าง: tick เลื่อนออกไป 2 นาที และระยะช่วง Grace ไม่ถูกนับ
3. vector G2 (ช่องว่าง 400 ม.) ให้ผลตาม G2 ทั้งใน engine และ trace ของ QA
4. คู่ sample ที่ห่างเกิน `maxSamplePairGap_s` หรือ accuracy แย่กว่า `maxSampleAccuracy_m` ไม่เพิ่มระยะ · ผล gate ไม่ขึ้นกับความถี่ sample ดิบ (vector ของ TL B-03)
5. HUD diagnostic กับผล tick ที่ผู้เล่นเห็นมาจากคนละหน้าต่าง และการเปลี่ยน `gateDiagnosticWindows` ไม่เปลี่ยนผล tick
6. tick ที่ผ่านให้ exp และ drop ตาม config · tick ที่ไม่ผ่านไม่ให้อะไรและไม่เปลี่ยน HP/run state · vector drop กับ seed เดียวกันให้ผลเดียวกันทุกครั้ง
7. ยามีได้จาก drop ของ tick ที่ผ่าน gate เท่านั้น · ไม่มี code path ของ onboarding ที่ให้ของ (ค้นโค้ดแล้วไม่พบทางให้ของนอก reward engine)
8. ตารางจ่ายของ R21 ตรงทุก exit_reason · ตายแล้วของใน run หาย exp อยู่ · auto-retreat เก็บครบ
9. D-059: vector 59/60 วินาที และตัวอย่าง G9 ตรง R22 · tick บางส่วนที่ผ่านทำให้ run เป็น run ที่นับ
10. R-B1: vector ขอบ (โดนตีครั้งเดียวจาก HP สูงถึงติดลบขณะเปิด auto-retreat → HP 1 แล้วถอน · มียา → ใช้ยาก่อนแล้วตรวจถอน · ปิด auto-retreat → ตาย) ผ่านใน engine
11. หน้าสรุปแสดงเหตุที่จบถูกทุกเหตุ และไม่มีพิกัดใน storage หลัง run จบ
12. run ยาว 3 ชั่วโมงจาก trace สังเคราะห์ได้ tick เท่ากับจำนวนหน้าต่างที่ผ่าน ไม่มีตัวลด

## 8. Config key

มีแล้ว: `dungeons.movementGate.minDistancePerWindow_m`, `window_s`, `comparison`, `appliesTo`, `exceptions` · `dungeons.rewardTick.rewardTickInterval_s` · `dungeons.runState.*` · `dungeons.emergencyClose.partialTickMinElapsed_s`, `partialTickGateScaling`, `proRatedRewardPassesMovementGate` · `dungeons.hpSafety.*` · `dungeons.death.loseAllRunLoot` · `progression.expCurve`, `expMultipliers` · `combat.zoneLevelFrom` · `drops.*` · `dungeons.movementGate.sampleCadence_s`, `maxSamplePairGap_s`, `maxSampleAccuracy_m`, `outlierSpeed_kmh`, `outlierReanchorSamples` (ตั้งใน P2-F05-T20)

กรอบจาก design ที่ใช้ตรวจค่าเมื่อมีการปรับ (เดิมเป็นตารางข้อเสนอให้ systems-designer ใน P2-F05-T20):

| key | กรอบจาก design |
| --- | --- |
| `dungeons.movementGate.maxSamplePairGap_s` | ยาวพอไม่ตัดคู่ปกติของเครื่องที่ส่ง sample ห่าง · สั้นพอที่ระยะคร่อมจอล็อก/ปิดแอปไม่ถูกนับ · สั้นกว่า `graceMax_s` มาก |
| `dungeons.movementGate.maxSampleAccuracy_m` | ไม่เข้มกว่า `anticheat.checkIn.maxAccuracy_m` เพื่อไม่ให้คนเดินกลางแจ้งเสีย tick · ใช้ทั้ง gate และ run state |
| `dungeons.movementGate.sampleCadence_s` และค่าตัวกรอง outlier (`outlierSpeed_kmh`, `outlierReanchorSamples`) | ตาม ADR 0003 · vector ยืนยันว่าผลไม่ขึ้นกับความถี่ sample |
| lint: `rewardTick.rewardTickInterval_s` = `movementGate.window_s` | R04 |

vector ที่ต้องมี (P2-F05-T01 / T20): G1, G2, G3, G4, G9, G10, G11, G12 และ R-B1 สามกรณี

## 9. คำตัดสินในเอกสารนี้ (ส่ง orchestrator ลง decision log)

1. **ระยะที่เดินนอก polygon ไม่นับเข้า gate และไม่ยกไปหน้าต่างถัดไป** (GDD เงียบ · N-03 ข้อ 2) · หลักการ: ข้อ 1 ไม่เกี่ยว · ข้อ 2 ชี้ว่า "gate ตัวเดียวกัน" ต้องวัดอัตราเดียวกันทุกที่ ถ้านับระยะนอกเขตขณะที่เวลานอกเขตไม่นับ (`suspendedTimeCounts` = false) ระยะของ 8 นาทีจะถูกอัดลงหน้าต่าง 5 นาที gate จะอ่อนกว่า 50 ม./5 นาทีโดยไม่มีใครตั้งใจ และระยะนอกเขตไม่ใช่การอยู่ใน dungeon ที่ GDD ให้ reward (Grace/Suspended "ไม่ได้ reward tick") → ไม่นับ · ข้อ 3 ตรวจแล้วบทลงโทษต่ำ: เสียแค่ระยะช่วงที่ออก ระยะที่สะสมก่อนออกยังอยู่ (ข้อ 2 ของรายการนี้) · ข้อ 4, 5 ไม่เกี่ยว
2. **rewardWindow หยุดและเดินต่อ ไม่รีเซ็ตเมื่อออกแล้วกลับ** · ข้อ 2 ยังครบเพราะนับเฉพาะเวลาและระยะตอน Active · ข้อ 3 ไม่ให้ผู้เล่นเสียความคืบหน้าจากการออกไปซื้อน้ำ
3. **ของใน run ไม่รวม exp · ยาที่ได้ใน run และยังไม่ใช้เป็นของใน run** (TL N-14) · ข้อความ GDD "ของที่เก็บได้ใน run" หมายถึงของ ไม่ใช่ exp · ข้อ 3 การลดเลเวลย้อนหลังเป็นบทลงโทษที่หนักเกินและอธิบายยาก · ข้อ 2 exp ทุกหน่วยมาจาก tick ที่ผ่าน gate แล้ว
4. **tick บางส่วนของ D-059 ใช้กับการปิดจากฝั่งเกมเท่านั้น (ปิดทำการ ปิดฉุกเฉิน พักจากรายงาน) และย่อทุกผลของ tick ด้วย f** · ข้อ 2 gate ย่อตามสัดส่วนเดียวกัน · ข้อ 3 ชดเชยเฉพาะเหตุที่ผู้เล่นไม่ได้ก่อ · ออกเอง/auto-retreat/timeout ทิ้งหน้าต่างค้างตามจังหวะ "ให้ของเป็นขั้นทุก 5 นาที" ของ GDD
5. **tick บางส่วนที่ผ่าน gate นับให้ run เป็น "run ที่นับ"** ตามข้อความ D-059 ("tick ผ่าน gate อย่างน้อย 1 ครั้ง") · ข้อ 2 มีการเดินจริงผ่านเกณฑ์อัตราเดียวกัน
6. **tick ก่อน hit เมื่อตรงเวลาเดียวกัน** · ข้อ 3 ของที่เดินได้แล้วไม่หายเพราะลำดับประมวลผล

## 10. สมมติฐานและคำถามค้าง

- [ASSUMPTION A-P2-F04-T01-1: ADR 0003 เป็นเจ้าของนิยามตัวกรอง outlier, cadence ของ resample และกฎคู่ที่คร่อมขอบหน้าต่าง (R05–R07) · ถ้าใช้ชื่อต่างจากนี้ให้ยึด ADR · owner: tech-lead · ปิดแล้ว: ชื่อ key sync ตาม ADR 0003 และ config ใน P2-H35]
- [ASSUMPTION A-P2-F04-T01-3: Phase 2 ไม่มีเพดานช่องเก็บของ · ถ้า F10/F11 ตั้งเพดานใน Phase 4 ต้องไม่ทิ้งของจาก tick เงียบๆ · owner: systems-designer]
- [ASSUMPTION A-P2-F04-T01-4: การย่อผลของ tick บางส่วน (R22) ตีความ "จ่าย elapsed/window ของ tick" ใน D-059 ว่าย่อ exp, โอกาส rarity และจำนวน Common ด้วย f เดียวกัน · owner: systems-designer ยืนยันด้วย vector]
- คำถาม (playtest): ผู้เล่นเข้าใจไหมว่าตัวนับ tick หยุดตอนออกนอกเขต · ส่งเป็นคำถามให้ product-manager ใน P2-F06-T19

## 11. บันทึกการแก้

| วันที่ | task | ส่วนที่แก้ | สาระ | อ้างอิง |
| --- | --- | --- | --- | --- |
| 2026-09-28 | P2-H35 | หัวบรรทัดสถานะ, บรรทัด 6, F05-R05, หัวข้อ 8, หัวข้อ 10 | สถานะเป็น "ผ่าน design gate P2-F05-T18" · `resampleCadence_s` → `sampleCadence_s` · ระบุชื่อ key ของตัวกรอง outlier (`outlierSpeed_kmh`, `outlierReanchorSamples`) · ถอดคำ "เสนอ" ออกจาก key ที่มีใน config แล้ว · ไม่เปลี่ยนกฎหรือตัวเลข | O-4 (`design/reviews/F04-F05-design-gate.md`), ADR 0003 5.3, A-P2-F04-T01-1 |
