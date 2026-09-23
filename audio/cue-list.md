# Cue List — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T18 · เจ้าของ: sound-designer · สถานะ: ฉบับเสนอ รอ design gate A (P1-F03-T24) · วันที่: 2026-09-23
คู่กับ: `audio/direction.md` (หลักการ, ระดับความเร่งด่วน, กฎ mix/ducking, silent-mode philosophy — อ่านก่อนตารางนี้)
แหล่งอ้างอิง: `config/content/copy.th.json` (`run.*`, `dungeon.*`, `qc.*`), `config/balance/dungeons.json#hpSafety,movementGate,rewardTick`, `config/balance/raid.json#schedule,bossHp`, `config/balance/drops.json`, `config/balance/enhance.json`, `product/telemetry-events.md`, `design/ux/flows/F03-core-loop.md` §4.2–4.6

**อ่านตารางอย่างไร**
- `cue id` = ชื่อไฟล์/ชื่อ event ในโค้ด ตรงกับ copy key หรือชื่อ telemetry event ให้มากที่สุดเพื่อให้ gameplay-programmer wire ได้ 1:1 (ตามที่ระบุใน context ของ task) ถ้าไม่มี copy key จริงยัง (`ชั่วคราว`) จะบอกไว้ในคอลัมน์ `หมายเหตุ`
- `vibration_ms` = ค่าที่ส่งตรงให้ `navigator.vibrate([...])` (หน่วย ms, index คู่ = สั่น, index คี่ = หยุด) **ใช้ได้เฉพาะ Android/Chromium ตาม `audio/direction.md` หัวข้อ 2** iOS ไม่ได้รับ vibration แต่ได้ visual + sound ตามปกติ
- `ชั้นเร่งด่วน` อ้างตาราง `audio/direction.md` หัวข้อ 7 (นุ่ม/ปกติ/เตือน/วิกฤต)
- `priority` ใช้ตัดสิน hard-cut ตาม `audio/direction.md` หัวข้อ 6 ข้อ 3 — เลขน้อยกว่า = สำคัญกว่า ตัดเสียงเลขมากกว่าที่กำลังเล่นอยู่ได้ทันที
- `silent-mode fallback` = ทุก cue มี visual/copy อยู่แล้วเสมอตามหลักการหัวข้อ 10 ของ direction.md (ไม่ใช่ fallback แบบมีเงื่อนไข) คอลัมน์นี้จึงชี้ไปที่ copy key/หน้าจอที่ทำหน้าที่นั้นอยู่แล้ว

## 1. Cue หลักที่ต้องรู้ได้โดยไม่ดูจอและไม่มีเสียง (ตาม acceptance ของ P1-F03-T18)

| cue id | trigger | ชั้นเร่งด่วน | priority | vibration_ms | แนวคิดเสียง | ระยะเสียง | silent-mode fallback (มีอยู่แล้วเสมอ) | telemetry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `run.tickGranted` | ผ่าน movement gate ทุก `config: dungeons.rewardTick.rewardTickInterval_s` (=300s) → toast `[run.tickGranted]` | ปกติ | 5 | `[45]` | โน้ตขึ้นสั้น 2 ท่อน (~1.2→1.8 kHz) แบบระฆังสังเคราะห์ ไม่ใช่ทำนอง BTS จริง attack เร็ว ไม่มีหางเกิน 250 ms | ~250 ms | toast `[run.tickGranted]` ("เดินพอแล้ว ได้ของรอบนี้") | `run_tick_granted` |
| `run.tickDenied` | ไม่ผ่าน movement gate → toast `[run.tickDenied]` | นุ่ม | 6 | `[20]` | คลิกสั้นทึบ เสียงต่ำกว่า tickGranted (~600 Hz) จงใจให้ "จาง" กว่า ไม่ใช้เสียง error/buzz (flow §4.6: ไม่ใช่การลงโทษ) | ~120 ms | toast `[run.tickDenied]` ("รอบนี้เดินไม่พอ ไม่ได้ของ เดินต่อ") | `run_tick_denied` |
| `run.hpLow` | HP ถึง `config: dungeons.hpSafety.lowHpWarningThreshold_pct` (=30) → toast `[run.hpLow]` + push ถ้า background (`config: dungeons.hpSafety.lowHpWarningChannels`) | เตือน | 2 | `[80,80,80,80,80]` (3 จังหวะเท่ากัน) | 3 บี๊บสั้นระดับเสียงเดียวกัน (~1.5 kHz) จังหวะเท่ากันทุกช่วง ให้ความรู้สึก "เตือนซ้ำ" ไม่ใช่ "จบแล้ว" | ~350 ms | toast `[run.hpLow]` ("HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ") — คงอยู่จนกว่าผู้เล่นตัดสินใจ | `run_hp_low` |
| `run.autoRetreat` | HP ถึง `config: dungeons.hpSafety.autoRetreatThreshold_pct` (=25), เกิดขึ้นอัตโนมัติ | วิกฤต | 1 | `[100,80,100,80,100,80,350]` (3 จังหวะสั้นถี่ขึ้น + จบยาว) | 3 จังหวะสั้นไล่ระดับ (รู้สึกเหมือน "ถูกดึงตัว") ตามด้วยเสียงต่ำยาวจบ (~400 Hz, 350 ms) บอกว่า "จบเหตุการณ์แล้ว" ไม่ใช่เสียงพังหรือเสียงเจ็บ | ~600 ms | toast `[run.autoRetreat]` ("HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ") | `run_auto_retreat` |
| `run.death` | HP ถึง 0 (เฉพาะปิด auto-retreat เองหรือ HP ตกเร็วกว่าระบบดึงทัน) | วิกฤต | 0 (สูงสุด) | `[150,120,600]` (สั้น 1 จังหวะ แล้วจบด้วยเสียงยาวเดียว) | จังหวะเดียวสั้นนำ แล้วจบด้วยโทนต่ำยาวเดียว (~300 Hz, 600 ms) แบบ "flatline" — แยกจาก autoRetreat ชัดด้วยรูปทรง (สั้น-ยาว vs ถี่ขึ้น-ยาว) และหนักกว่าเพราะเกิดไม่บ่อยและบทลงโทษหนักกว่า | ~750 ms | toast `[run.death]` + ทางเลือกฟื้น 3 ทาง (flow §4.5) | `run_death` |
| `dungeon.confirmEnter` | server ยืนยันเข้า run สำเร็จ (`S-02-dungeon-confirm` → `S-03-run`) | ปกติ | 5 | `[30,40,30]` | เสียง "ประตูเปิด" สองจังหวะสั้นซ้อนกัน (~1 kHz ขึ้น) สั้นกว่า tickGranted เพื่อไม่สับสน | ~180 ms | เปลี่ยนหน้าจอเข้า `S-03-run` ทันทีอยู่แล้ว (visual state change เป็น fallback โดยธรรมชาติ) | `dungeon_entered` |
| `raid.checkpointReached` [ชั่วคราว รอ copy key จาก F17] | boss HP ผ่านหลัก 25/50/75/100% ตาม GDD "Raid Boss > Checkpoint reward" (`config: raid.bossHp`) | เตือน (แบบบวก) | 3 | `[70,70,70,70]` (2 จังหวะ) | 2 จังหวะระดับกลาง (~1.3 kHz) สั้นกว่าและน้อยจังหวะกว่า hpLow (3 จังหวะ) เพื่อไม่ให้สับสนว่าเป็นเรื่องร้าย ทั้งที่เป็นเรื่องดี (บอสใกล้ล้มมากขึ้น) | ~280 ms | HP bar สาธารณะแบบ realtime ที่มีอยู่แล้วตาม GDD "ข้อควรระวังเชิงเทคนิค" + banner checkpoint (ให้ F17 กำหนด copy key) | ยังไม่มีใน `product/telemetry-events.md` (Phase 6/F17) — เสนอ `raid_checkpoint_reached` |
| `raid.thirtyMinWarning` [ชั่วคราว รอ copy key จาก F17] | เหลือเวลา 30 นาทีและ HP บอสยังไม่ถึง 75% (GDD "เมื่อล้มบอสไม่สำเร็จ" มาตรการที่ 3) — **มีเงื่อนไข ไม่ใช่ตัวนับถอยหลังทั่วไป** | เตือน (เร่งด่วนกว่า checkpoint) | 1 | `[60,40,60,40,60,40,60,40,200]` (4 จังหวะถี่ + จบยาว) | 4 จังหวะถี่ (~1.6 kHz คมกว่า checkpoint) ตามด้วยเสียงจบยาวกว่าเล็กน้อย ให้ความรู้สึก "รีบ" แบบนาฬิกาปลุก แต่ไม่ใช่เสียง alarm วนซ้ำ (one-shot) | ~600 ms | banner ชัดเจนบนหน้า raid บอกเวลาที่เหลือและ % HP บอส (ให้ F17 กำหนด copy key) | เสนอ `raid_boss_behind_pace_warning` |

หมายเหตุ `raid.*` ทั้งสอง: ยังไม่มี copy key และ telemetry event อย่างเป็นทางการเพราะ raid เป็นขอบเขตของ F17 (Phase 6) เอกสารนี้ให้ vibration pattern และแนวคิดเสียงไว้ล่วงหน้าเพื่อไม่ให้ทีม F17 ต้องออกแบบใหม่ตั้งแต่ศูนย์ — ดู `[ASSUMPTION A-P1-F03-T18-1]` ใน `audio/direction.md` หัวข้อ 11

## 2. Drop ตาม rarity (ต่อยอดจาก `run.tickGranted` เสมอ ไม่ใช่ cue แทนที่)

ตาม `audio/direction.md` หัวข้อ 8: rarity มี 4 ช่องทาง visual อยู่แล้ว (สี/pip/ขอบ/มุม) เสียงนี้เป็นช่องทางเสริมที่ 5 เท่านั้น ห้ามเป็นช่องทางเดียวที่บอก rarity ได้ — cue เหล่านี้เล่น **ต่อจาก** `run.tickGranted` ทันทีในรอบ tick เดียวกัน (รวมเป็น pattern เดียวให้ต่อเนื่อง ไม่ใช่ยิงซ้อนสองรอบ)

| cue id [ชั่วคราว รอยืนยัน `rarity.*` copy key] | base rate ต่อ tick (`config: drops.baseChancePerRewardTick_pct`) | vibration_ms (pattern เต็ม รวม tick) | แนวคิดเสียง | ระยะเสียงรวม | หมายเหตุ |
| --- | --- | --- | --- | --- | --- |
| `drop.rarity.common` | 100% | ใช้ `run.tickGranted` เดิม `[45]` ไม่มี layer เพิ่ม | ไม่มีเสียงเพิ่ม (เกิดเกือบทุก tick ถ้าเพิ่มเสียงทุกครั้งจะน่ารำคาญ) | — | เกิดบ่อยที่สุด ตั้งใจไม่ให้เด่น |
| `drop.rarity.uncommon` | 25% | `[45,70,45]` (2 จังหวะ) | เพิ่มโน้ตที่สองสูงกว่าโน้ตแรกเล็กน้อย (double-tap) | ~350 ms | ขั้นแรกของ "รู้สึกว่าได้ดีกว่าปกติ" |
| `drop.rarity.rare` | 6% | `[45,70,45,70,45]` (3 จังหวะ) | 3 โน้ตไล่ระดับขึ้น | ~450 ms | เข้าเงื่อนไข rare ใน icon-grammar (กรอบคู่ ขอบ 3 px) |
| `drop.rarity.epic` | 1.2% | `[45,60,45,60,45,60,90]` (3 จังหวะ + จบยาวขึ้นเล็กน้อย) | 3 โน้ตไล่ระดับ + โน้ตปิดยาวกว่าเดิม | ~550 ms | ยังไม่ใช้ fanfare ยาว เพื่อไม่ชนกับกฎห้าม celebratory เกินเหตุ |
| `drop.rarity.legendary` | 0.2% | `[45,60,45,60,45,60,45,60,180]` (4 จังหวะ + จบยาว) | 4 โน้ตไล่ระดับ + โน้ตปิดยาวสุด (ยกเว้นเพดานความยาวปกติเพราะเกิดน้อยมาก งบแบตไม่กระทบ) | ~600 ms | นี่คือ cue เดียวที่ยาวเกิน 400 ms โดยตั้งใจ เพราะโอกาสเกิดต่ำมากและควรรู้สึกพิเศษจริง — ยังไม่ใช้เสียง fanfare วงใหญ่หรือเสียงระฆังวัด |

**กฎการต่อยอด:** เมื่อ tick หนึ่งได้ของหลาย rarity พร้อมกัน (เช่น common + rare ในรอบเดียวกันได้ตาม `drops.json` ที่สุ่มแยกอิสระต่อ rarity) เล่นแค่ cue ของ rarity สูงสุดที่ได้ในรอบนั้นเท่านั้น (ไม่ซ้อนกันหลาย pattern) เพื่อไม่ให้สั่น/เสียงยาวเกินความจำเป็นและไม่ขัดกฎ hard-cut ในหัวข้อ 4

## 3. Cue เสริม (ไม่ได้อยู่ใน acceptance บังคับของ T18 แต่ครอบคลุมไว้เพื่อความสอดคล้อง อ้างจาก flow §4.3–4.7 และ Flow A)

| cue id | trigger | ชั้นเร่งด่วน | priority | vibration_ms | แนวคิดเสียง | silent-mode fallback |
| --- | --- | --- | --- | --- | --- | --- |
| `run.autoPotionUsed` | ใช้ยาอัตโนมัติเมื่อ HP ต่ำกว่า `config: economy.autoPotion.defaultThreshold_pct` | ปกติ | 4 | `[35]` | เสียง "ป๊อก" สั้นทุ้มกว่า tickGranted เล็กน้อย (ให้รู้สึกเป็นกลไกช่วยเหลือ ไม่ใช่รางวัล) | toast `[run.autoPotionUsed]` |
| `run.revived` | Support ชุบใน dungeon เดียวกันสำเร็จ | ปกติ | 4 | `[30,50,30,50,60]` | 3 จังหวะไล่ขึ้นแบบ "ฟื้นคืน" ตรงข้ามกับ death (ไล่ลง) | toast `[run.revived]` |
| `run.stateSuspended` | ออกนอก polygon เกิน `config: dungeons.runState.graceMax_s` (=180s) | เตือน (เบา) | 3 | `[60,60,60]` | เสียงกลางแบบเป็นกลาง ไม่ตกใจ (นี่ยังไม่ใช่จบ run) | banner `[run.stateSuspended]` |
| `run.stateResumed` | กลับเข้าเขตจากสถานะ Suspended | ปกติ | 4 | `[30]` | จังหวะเดียวเบา ให้ความรู้สึก "กลับมาแล้ว" | toast `[run.stateResumed]` |
| `party.buffApplied` [ชั่วคราว รอ F09] | กดเข้าร่วม Nearby Party สำเร็จ | ปกติ | 5 | `[25,30,25]` | จังหวะคู่เบาบาง แยกจาก tickGranted ด้วยความสั้นกว่า | toast `[party.buffApplied]` |
| `dungeon.closedOrOutOfRange` | พยายามเข้า dungeon ที่ปิด/นอกระยะ (`dungeon.closedTitle`, `dungeon.outOfRangeTitle`) | นุ่ม | 6 | `[20]` | เสียงเดียวกับ `run.tickDenied` (ทั้งคู่คือ "ยังไม่ได้ตามที่ตั้งใจ" ไม่ใช่ error) | popup `[dungeon.closedTitle]` / `[dungeon.outOfRangeTitle]` |
| `qc.sent` / `qc.received` | ผู้เล่นส่ง/ได้รับ quick command (`qc.*` ทั้ง 10 คำสั่ง) | นุ่ม | 6 | `[15]` | tap เบาสั้นมากแบบเดียวกันทุกคำสั่ง (เนื้อความอ่านจาก UI ไม่ใช่จากเสียง) | ข้อความ `qc.*` ปรากฏบนจอผู้รับ |

## 4. Priority และกฎ hard-cut (อ้างจาก `audio/direction.md` หัวข้อ 6 ข้อ 3)

ลำดับ priority ต่ำ (เลขน้อย) ตัดเสียง/สั่นที่กำลังเล่นของ priority สูง (เลขมาก) ได้ทันที ถ้า priority เท่ากันให้เข้าคิว ถ้าห่างจาก event เกิน 2 วินาทีให้ทิ้งไม่เล่น:

`0 run.death` > `1 run.autoRetreat = raid.thirtyMinWarning` > `2 run.hpLow` > `3 raid.checkpointReached = run.stateSuspended` > `4 run.autoPotionUsed = run.revived = run.stateResumed` > `5 run.tickGranted = drop.rarity.* = dungeon.confirmEnter = party.buffApplied` > `6 run.tickDenied = dungeon.closedOrOutOfRange = qc.*`

เหตุผลของลำดับ: เหตุการณ์ที่กระทบความปลอดภัย/ผลลัพธ์ถาวร (ตาย, ถอยอัตโนมัติ) ต้องรู้ก่อนเสมอแม้เกิดพร้อมเหตุการณ์อื่น เช่น ถ้า auto-retreat ทำงานพร้อม tick ที่กำลังจะประกาศผล ให้เล่น `run.autoRetreat` เท่านั้น (ของที่ได้ยังแสดงผลถูกต้องบนจอสรุปตามปกติ แค่ไม่มีเสียง tick ซ้อน)

## 5. สรุปการตรวจสัญญาณสำคัญโดยไม่ดูจอและไม่มีเสียง (self-check ของ acceptance ข้อ 3)

ทดสอบ (บนกระดาษ ก่อนมีไฟล์จริง): ให้คนช่วยตรวจปิดตา ปิดเสียง เปิดแค่การสั่น (จำลองบน Android) แล้วบอกคู่ cue สำคัญด้านล่างนี้แยกจากกันได้หรือไม่ — เกณฑ์ผ่านคือแยกได้ 100% จากรูปทรง/ความยาว ไม่ใช่จากการนับจังหวะแม่นยำ:

| คู่ที่ต้องแยกกันชัด | สิ่งที่ต่างกัน |
| --- | --- |
| `run.hpLow` (3 จังหวะเท่ากัน สั้น) vs `raid.checkpointReached` (2 จังหวะ) | จำนวนจังหวะ |
| `run.autoRetreat` (ถี่ขึ้น 3 จังหวะ + จบยาว) vs `run.death` (สั้น 1 จังหวะ + จบยาวทันที) | รูปทรงจังหวะ (ไล่ระดับ vs กระโดดตรง) และความยาวรวม (600 ms vs 750 ms) |
| `run.tickGranted` (จังหวะเดียว 45 ms) vs `run.tickDenied` (จังหวะเดียว 20 ms) | ความยาว (นุ่มกว่าเห็นชัด) — จับคู่กับ visual toast สีต่างกันเสมอ ไม่พึ่งความยาวอย่างเดียวสำหรับกรณีนี้เพราะใกล้เคียงกันที่สุดในตาราง (เป็น "คู่เดียว" ที่ยอมให้ visual ช่วยแยกมากกว่าเสียง เพราะทั้งสองไม่ใช่สัญญาณวิกฤต) |
| `run.death` vs `run.autoRetreat` vs ทุก cue อื่น | ทั้งสองใช้ priority 0–1 (สูงสุด) และยาวกว่า cue อื่นทั้งหมด (600–750 ms) จึง "รู้สึกหนัก" ชัดเจนแม้จำจังหวะไม่ได้ |

หมายเหตุ: การทดสอบจริงกับผู้เล่นบนอุปกรณ์จริง (ไม่ใช่บนกระดาษ) เป็นงานของ qa-tester หลังมีไฟล์เสียงและ integration แล้ว (ยังไม่อยู่ใน scope ของ T18)

## 6. สมมติฐาน และส่งต่อ (สรุปจาก `audio/direction.md` หัวข้อ 11 เฉพาะที่กระทบตารางนี้)

- `[ASSUMPTION A-P1-F03-T18-1..4]` ดูรายละเอียดเต็มใน `audio/direction.md` หัวข้อ 11 — สรุปที่กระทบไฟล์นี้: cue `raid.*` และ `drop.rarity.*`/`party.buffApplied` ใช้ชื่อ cue ชั่วคราวรอ copy key จริงจาก narrative-designer ใน F17/F09 ตามลำดับ
- ถึง **gameplay-programmer**: ตาราง priority (หัวข้อ 4) ต้อง implement เป็นคิวเดียว (single audio/vibration channel) ไม่ใช่ mixer หลายแทร็ก เพราะ cue ทั้งหมดเป็น UI stinger สั้น ไม่ใช่เสียงที่ควรซ้อนกันฟังพร้อมกัน
- ถึง **qa-tester**: หลังมีไฟล์เสียงจริง (`audio/out/`) และ integration แล้ว ให้ทดสอบซ้ำหัวข้อ 5 บนอุปกรณ์จริงทั้ง Android และ iOS (iOS ไม่มี vibration ตาม assumption 4 — ต้องยืนยันว่า visual+sound เพียงพอสำหรับ iOS)
- ถึง **producer**: ต้องมี build task ใหม่ (ยังไม่มีบนบอร์ด) สำหรับสร้าง `audio/src/` (Web Audio generator ตาม concept เสียงในตารางนี้), เรนเดอร์ `audio/out/*.ogg`, `audio/manifest.json`, และ `audio/demo.html` เพื่อให้ทดสอบบนมือถือจริงได้ตามที่ role brief ของ sound-designer กำหนด
