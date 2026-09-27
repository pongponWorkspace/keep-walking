# Cue List — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T18 (ฉบับแรก) → P2-F05-T06 (เพิ่ม `run.tickGrantedFirst`, `anticheat.speedLock`, แก้ priority/โทนของ `raid.thirtyMinWarning` ตาม F-13, render ไฟล์จริงลง `audio/out/` ผ่าน `audio/src/generate.ts`) → P2-F06-T13 (แก้ typecheck ของ `audio/src/cues.ts`, จัด priority ของ cue ความปลอดภัยให้ไม่ผูกกับ cue อื่น + เขียนกฎ fallback เมื่อไม่มี `navigator.vibrate` และ priority queue ของ F05/F06 ให้ชัดใน หัวข้อ 4) · เจ้าของ: sound-designer · สถานะ: เรนเดอร์แล้ว รอ tech/QA gate F06 · วันที่: 2026-09-27
คู่กับ: `audio/direction.md` (หลักการ, ระดับความเร่งด่วน, กฎ mix/ducking, silent-mode philosophy — อ่านก่อนตารางนี้)
แหล่งอ้างอิง: `config/content/copy.th.json` (`run.*`, `dungeon.*`, `qc.*`), `config/balance/dungeons.json#hpSafety,movementGate,rewardTick`, `config/balance/raid.json#schedule,bossHp`, `config/balance/drops.json`, `config/balance/enhance.json`, `product/telemetry-events.md`, `design/ux/flows/F03-core-loop.md` §4.2–4.6

**อ่านตารางอย่างไร**
- `cue id` = ชื่อไฟล์/ชื่อ event ในโค้ด ตรงกับ copy key หรือชื่อ telemetry event ให้มากที่สุดเพื่อให้ gameplay-programmer wire ได้ 1:1 (ตามที่ระบุใน context ของ task) ถ้าไม่มี copy key จริงยัง (`ชั่วคราว`) จะบอกไว้ในคอลัมน์ `หมายเหตุ`
- `vibration_ms` = ค่าที่ส่งตรงให้ `navigator.vibrate([...])` (หน่วย ms, index คู่ = สั่น, index คี่ = หยุด) **ใช้ได้เฉพาะ Android/Chromium ตาม `audio/direction.md` หัวข้อ 2** iOS ไม่ได้รับ vibration แต่ได้ visual + sound ตามปกติ
- `ชั้นเร่งด่วน` อ้างตาราง `audio/direction.md` หัวข้อ 7 (นุ่ม/ปกติ/เตือน/วิกฤต)
- `priority` ใช้ตัดสิน hard-cut ตาม `audio/direction.md` หัวข้อ 6 ข้อ 3 — เลขน้อยกว่า = สำคัญกว่า ตัดเสียงเลขมากกว่าที่กำลังเล่นอยู่ได้ทันที — กติกาคิวเต็มรูปแบบ + รายชื่อ cue ความปลอดภัยที่ชนะเสมอ + กฎ fallback เมื่อไม่มี `navigator.vibrate` อยู่ที่หัวข้อ 4 (P2-F06-T13)
- `silent-mode fallback` = ทุก cue มี visual/copy อยู่แล้วเสมอตามหลักการหัวข้อ 10 ของ direction.md (ไม่ใช่ fallback แบบมีเงื่อนไข) คอลัมน์นี้จึงชี้ไปที่ copy key/หน้าจอที่ทำหน้าที่นั้นอยู่แล้ว

## 1. Cue หลักที่ต้องรู้ได้โดยไม่ดูจอและไม่มีเสียง (ตาม acceptance ของ P1-F03-T18)

| cue id | trigger | ชั้นเร่งด่วน | priority | vibration_ms | แนวคิดเสียง | ระยะเสียง | silent-mode fallback (มีอยู่แล้วเสมอ) | telemetry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `run.tickGranted` | ผ่าน movement gate ทุก `config: dungeons.rewardTick.rewardTickInterval_s` (=300s) → toast `[run.tickGranted]` | ปกติ | 5 | `[45]` | โน้ตขึ้นสั้น 2 ท่อน (~1.2→1.8 kHz) แบบระฆังสังเคราะห์ ไม่ใช่ทำนอง BTS จริง attack เร็ว ไม่มีหางเกิน 250 ms | ~250 ms | toast `[run.tickGranted]` ("เดินพอแล้ว ได้ของรอบนี้") | `run_tick_granted` |
| `run.tickGrantedFirst` [เพิ่มใน P2-F05-T06 ตาม flow F05 A2/F06 A11: "effect เด่นกว่า"] | tick แรกที่ผ่าน gate ในชีวิตผู้เล่น (ยังไม่มีธง `first_reward`) → toast `[run.tickGrantedFirst]` แทน `run.tickGranted` ครั้งนั้น ตามด้วย `[run.continueCta]` | ปกติ (ยกเว้นความยาวเล็กน้อย ดูหมายเหตุ) | 5 | `[45,70,45,70,90]` (3 จังหวะไล่ขึ้น จบยาวกว่าเดิม) — ต่างจาก `run.tickGranted` (`[45]`, 1 จังหวะ) ให้รู้สึก "มากกว่าปกติ" ทันทีแม้ปิดตา | 3 โน้ตไล่ระดับขึ้นจากฐานเดียวกับ `run.tickGranted` (~1.2→1.6→2.0 kHz) จบด้วยโน้ตยาวกว่าเดิมเล็กน้อย ให้ความรู้สึก "เด่นกว่าเดิม" โดยไม่ใช่ fanfare (คนละ texture จาก `drop.rarity.*` เพื่อไม่ให้สับสนว่าเป็น drop หายาก) | ~330 ms (เกินเพดานปกติ 150 ms โดยตั้งใจ เทียบกับข้อยกเว้นของ `drop.rarity.legendary`: เกิดครั้งเดียวต่อผู้เล่นตลอดชีวิต งบแบต/ข้อมูลไม่กระทบ) | toast `[run.tickGrantedFirst]` ("ได้ของก้อนแรกแล้ว เดินมาเองทั้งนั้น") ต่อด้วย `[run.continueCta]` | `run_tick_granted` (ธง first ส่งเป็น property ไม่ใช่ event แยก — ยืนยันกับ product-manager ถ้าต้องแยก) |
| `run.tickDenied` | ไม่ผ่าน movement gate → toast `[run.tickDenied]` | นุ่ม | 6 | `[20]` | คลิกสั้นทึบ เสียงต่ำกว่า tickGranted (~600 Hz) จงใจให้ "จาง" กว่า ไม่ใช้เสียง error/buzz (flow §4.6: ไม่ใช่การลงโทษ) | ~120 ms | toast `[run.tickDenied]` ("รอบนี้เดินไม่พอ ไม่ได้ของ เดินต่อ") | `run_tick_denied` |
| `run.hpLow` | HP ถึง `config: dungeons.hpSafety.lowHpWarningThreshold_pct` (=30) → toast `[run.hpLow]` + push ถ้า background (`config: dungeons.hpSafety.lowHpWarningChannels`) | เตือน | 2 | `[80,80,80,80,80]` (3 จังหวะเท่ากัน) | 3 บี๊บสั้นระดับเสียงเดียวกัน (~1.5 kHz) จังหวะเท่ากันทุกช่วง ให้ความรู้สึก "เตือนซ้ำ" ไม่ใช่ "จบแล้ว" | ~350 ms | toast `[run.hpLow]` ("HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ") — คงอยู่จนกว่าผู้เล่นตัดสินใจ | `run_hp_low` |
| `run.autoRetreat` | HP ถึง `config: dungeons.hpSafety.autoRetreatThreshold_pct` (=25), เกิดขึ้นอัตโนมัติ | วิกฤต | 1 | `[100,80,100,80,100,80,350]` (3 จังหวะสั้นถี่ขึ้น + จบยาว) | 3 จังหวะสั้นไล่ระดับ (รู้สึกเหมือน "ถูกดึงตัว") ตามด้วยเสียงต่ำยาวจบ (~400 Hz, 350 ms) บอกว่า "จบเหตุการณ์แล้ว" ไม่ใช่เสียงพังหรือเสียงเจ็บ | ~600 ms | toast `[run.autoRetreat]` ("HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ") | `run_auto_retreat` |
| `run.death` | HP ถึง 0 (เฉพาะปิด auto-retreat เองหรือ HP ตกเร็วกว่าระบบดึงทัน) | วิกฤต | 0 (สูงสุด) | `[150,120,600]` (สั้น 1 จังหวะ แล้วจบด้วยเสียงยาวเดียว) | จังหวะเดียวสั้นนำ แล้วจบด้วยโทนต่ำยาวเดียว (~300 Hz, 600 ms) แบบ "flatline" — แยกจาก autoRetreat ชัดด้วยรูปทรง (สั้น-ยาว vs ถี่ขึ้น-ยาว) และหนักกว่าเพราะเกิดไม่บ่อยและบทลงโทษหนักกว่า | ~750 ms | toast `[run.death]` + ทางเลือกฟื้น 3 ทาง (flow §4.5) | `run_death` |
| `dungeon.confirmEnter` | server ยืนยันเข้า run สำเร็จ (`S-02-dungeon-confirm` → `S-03-run`) | ปกติ | 5 | `[30,40,30]` | เสียง "ประตูเปิด" สองจังหวะสั้นซ้อนกัน (~1 kHz ขึ้น) สั้นกว่า tickGranted เพื่อไม่สับสน | ~180 ms | เปลี่ยนหน้าจอเข้า `S-03-run` ทันทีอยู่แล้ว (visual state change เป็น fallback โดยธรรมชาติ) | `dungeon_entered` |
| `raid.checkpointReached` [ชั่วคราว รอ copy key จาก F17 · priority เลื่อน 3→4 ใน P2-F06-T13 (หัวข้อ 4)] | boss HP ผ่านหลัก 25/50/75/100% ตาม GDD "Raid Boss > Checkpoint reward" (`config: raid.bossHp`) | เตือน (แบบบวก) | 4 | `[70,70,70,70]` (2 จังหวะ) | 2 จังหวะระดับกลาง (~1.3 kHz) สั้นกว่าและน้อยจังหวะกว่า hpLow (3 จังหวะ) เพื่อไม่ให้สับสนว่าเป็นเรื่องร้าย ทั้งที่เป็นเรื่องดี (บอสใกล้ล้มมากขึ้น) | ~280 ms | HP bar สาธารณะแบบ realtime ที่มีอยู่แล้วตาม GDD "ข้อควรระวังเชิงเทคนิค" + banner checkpoint (ให้ F17 กำหนด copy key) | ยังไม่มีใน `product/telemetry-events.md` (Phase 6/F17) — เสนอ `raid_checkpoint_reached` |
| `raid.thirtyMinWarning` [ชั่วคราว รอ copy key จาก F17 · แก้ทิศทางเสียง+priority ใน P2-F05-T06 ตาม board F-13 · เลื่อนอีกครั้ง 4→5 ใน P2-F06-T13 (หัวข้อ 4)] | เหลือเวลา 30 นาทีและ HP บอสยังไม่ถึง 75% (GDD "เมื่อล้มบอสไม่สำเร็จ" มาตรการที่ 3) — **มีเงื่อนไข ไม่ใช่ตัวนับถอยหลังทั่วไป** | เตือน (เบา, "ชวนเดินต่อ" — **ไม่ใช่นาฬิกาปลุก**) | 5 (แก้จาก 1 → 4 ตาม F-13 แล้ว 4 → 5 ใน P2-F06-T13 เพื่อไม่ให้ปนกับ tier ความปลอดภัย 0–3: ต่ำกว่า `run.hpLow` ชัดเจน ไม่ตัดเสียงเรื่องปลอดภัยอีกต่อไป) | `[70,90,70,90,140]` (3 จังหวะไล่ขึ้นเบา ๆ จบด้วยจังหวะกลาง ไม่มีจังหวะถี่แบบนาฬิกาปลุกเดิม) | **แก้จากเดิม**: ทำนอง 3 โน้ตไล่ระดับขึ้นแบบเดียวกับ `dungeon.confirmEnter`/`raid.checkpointReached` (~1.0→1.3 kHz) แต่ attack นุ่มกว่าเล็กน้อยและไม่มีจังหวะถี่ 4 ครั้งแบบเดิม — ให้ความรู้สึก "เตือนเบา ๆ ชวนเดินต่อ" (คำจาก board F-13) ไม่ใช่ความรีบแบบนาฬิกาปลุก ไม่มี alarm loop (one-shot เสมอ) | ~380 ms | banner ชัดเจนบนหน้า raid บอกเวลาที่เหลือและ % HP บอส (ให้ F17 กำหนด copy key) | เสนอ `raid_boss_behind_pace_warning` |

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
| `run.autoPotionUsed` [priority เลื่อน 4→5 ใน P2-F06-T13] | ใช้ยาอัตโนมัติเมื่อ HP ต่ำกว่า `config: economy.autoPotion.defaultThreshold_pct` | ปกติ | 5 | `[35]` | เสียง "ป๊อก" สั้นทุ้มกว่า tickGranted เล็กน้อย (ให้รู้สึกเป็นกลไกช่วยเหลือ ไม่ใช่รางวัล) | toast `[run.autoPotionUsed]` |
| `run.revived` | Support ชุบใน dungeon เดียวกันสำเร็จ | ปกติ | 4 | `[30,50,30,50,60]` | 3 จังหวะไล่ขึ้นแบบ "ฟื้นคืน" ตรงข้ามกับ death (ไล่ลง) | toast `[run.revived]` |
| `run.stateSuspended` [priority เลื่อน 3→4 ใน P2-F06-T13: ต้องไม่ผูกระดับเดียวกับ `anticheat.speedLock` อีกต่อไป (หัวข้อ 4)] | ออกนอก polygon เกิน `config: dungeons.runState.graceMax_s` (=180s) | เตือน (เบา) | 4 | `[60,60,60]` | เสียงกลางแบบเป็นกลาง ไม่ตกใจ (นี่ยังไม่ใช่จบ run) | banner `[run.stateSuspended]` |
| `run.stateResumed` [priority เลื่อน 4→5 ใน P2-F06-T13] | กลับเข้าเขตจากสถานะ Suspended | ปกติ | 5 | `[30]` | จังหวะเดียวเบา ให้ความรู้สึก "กลับมาแล้ว" | toast `[run.stateResumed]` |
| `anticheat.speedLock` [เพิ่มใน P2-F05-T06 ตาม context ของ task: narrative สั่ง "สั่นครั้งเดียว ไม่วน" — อ้าง `config/content/copy.th.json#anticheat.speedLockTitle` context "สั่นครั้งเดียว (beat สำหรับ sound/vfx)" · **P2-F06-T13: ยกเป็น cue ความปลอดภัยตัวที่ 4 (หัวข้อ 4) แยก priority ออกจาก `run.stateSuspended`/`raid.checkpointReached` แล้ว ไม่ผูกเลขเดียวกันอีกต่อไป**] | เข้าสถานะ speed lock (`config: anticheat.speedLock.*`, F04 flow D) → overlay เต็มจอ `[anticheat.speedLockTitle]` | ปกติ (แต่ **1 จังหวะเดียวเสมอ ไม่ใช่ 1–2 จังหวะตามเพดานปกติ** — ตามคำสั่งตรงของ narrative ห้ามมีจังหวะที่สอง เพื่อไม่ให้สับสนกับ `run.tickGranted`) | 3 (เดี่ยว ไม่ผูกกับ cue อื่นที่ priority นี้อีกต่อไป — ดูหัวข้อ 4) | `[70]` (จังหวะเดียว ไม่วน, D-076/D-077) | เสียง "ป๊อก" ทึบต่ำกว่า `run.tickDenied` เล็กน้อย (~700 Hz) โทนกลาง ไม่กล่าวหา ไม่ตกใจ (ตรงกับ style ของ copy: "ไม่กล่าวหา ไม่อธิบายวิธีวัด") — คนละ texture จาก `run.stateSuspended` (นุ่มกว่า, 1 จังหวะไม่ใช่ 3) เพื่อไม่ให้สับสนว่าเป็นเรื่องเดียวกัน (เดิมเคยผูก priority เท่ากัน ตั้งแต่ P2-F06-T13 ไม่ผูกแล้ว — `anticheat.speedLock` เป็น cue ความปลอดภัยที่ pre-empt cue นี้ได้เสมอ) | ~90 ms | overlay เต็มจอ `[anticheat.speedLockTitle]` + `[anticheat.speedLockBody]` (ค้างจนกว่าจะปลดล็อกเอง ไม่ต้องพึ่งเสียง/สั่นเพื่อรู้ — overlay บังทั้งจอตาม F04 flow D) | เสนอ `anticheat_speed_lock_triggered` (มีอยู่แล้วใน P1-X18 event list) |
| `party.buffApplied` [ชั่วคราว รอ F09] | กดเข้าร่วม Nearby Party สำเร็จ | ปกติ | 5 | `[25,30,25]` | จังหวะคู่เบาบาง แยกจาก tickGranted ด้วยความสั้นกว่า | toast `[party.buffApplied]` |
| `dungeon.closedOrOutOfRange` | พยายามเข้า dungeon ที่ปิด/นอกระยะ (`dungeon.closedTitle`, `dungeon.outOfRangeTitle`) | นุ่ม | 6 | `[20]` | เสียงเดียวกับ `run.tickDenied` (ทั้งคู่คือ "ยังไม่ได้ตามที่ตั้งใจ" ไม่ใช่ error) | popup `[dungeon.closedTitle]` / `[dungeon.outOfRangeTitle]` |
| `qc.sent` / `qc.received` | ผู้เล่นส่ง/ได้รับ quick command (`qc.*` ทั้ง 10 คำสั่ง) | นุ่ม | 6 | `[15]` | tap เบาสั้นมากแบบเดียวกันทุกคำสั่ง (เนื้อความอ่านจาก UI ไม่ใช่จากเสียง) | ข้อความ `qc.*` ปรากฏบนจอผู้รับ |

## 4. Priority queue, hard-cut, และ fallback เมื่อไม่มี vibrate (P2-F06-T13)

อ้างจาก `audio/direction.md` หัวข้อ 6 ข้อ 3 และหัวข้อ 10 (silent-mode/fallback philosophy) · งานนี้ (P2-F06-T13) ปิด 2 เรื่องที่ board สั่งตรง: (ก) คิว priority ของ cue F05/F06 ต้องทำให้ **cue ความปลอดภัยชนะเสมอ** ไม่ใช่แค่ "อยู่บนสุดของตาราง" และ (ข) fallback ที่ชัดเจนเมื่อเครื่องไม่มี `navigator.vibrate` (R-P1-01)

### 4.1 คิวเดียว (single channel) — กติกาให้ gameplay-programmer implement ตรงตัว

Cue ทั้งหมดแชร์ **คิวเดียว** (audio + vibration ผูกกันเป็นหน่วยเดียวต่อ cue ไม่ใช่ mixer หลายแทร็ก — cue-list เดิมพูดไว้แล้วที่ท้ายเอกสาร) เมื่อ event ใหม่มาถึง:

1. **ถ้า priority ของ cue ใหม่ < priority ของ cue ที่กำลังเล่นอยู่ (เลขน้อยกว่า = สำคัญกว่า):** ตัดเสียง/สั่นเดิมทันที (hard-cut ไม่ crossfade) แล้วเล่น cue ใหม่ทันที ไม่เข้าคิวรอ
2. **ถ้า priority เท่ากัน:** cue ใหม่เข้าคิวต่อท้าย เล่นเรียงตามลำดับเวลาเดิม (FIFO ภายใน tier เดียวกัน)
3. **ถ้า priority ของ cue ใหม่ > priority ของ cue ที่กำลังเล่น (เลขมากกว่า = สำคัญน้อยกว่า):** cue ใหม่เข้าคิวรอ ไม่ตัดของเดิม
4. **Staleness drop:** cue ที่รอคิวนานเกิน 2 วินาทีนับจาก event เดิม (ไม่ใช่จากตอนเข้าคิว) ให้ทิ้งไม่เล่น (ไม่มีประโยชน์แล้วเพราะสถานการณ์เปลี่ยนไปแล้ว) — **ข้อยกเว้น: cue ความปลอดภัยทั้ง 4 ตัว (หัวข้อ 4.2) ไม่ทิ้งเพราะ stale เด็ดขาด เล่นเสมอแม้ล่าช้าเกิน 2 วินาที** เพราะ HP ต่ำ/ถอยอัตโนมัติ/ตาย/ถูกล็อกความเร็ว ยังเป็นสถานะจริงที่ผู้เล่นต้องรู้แม้จะรู้ช้า

### 4.2 cue ความปลอดภัย: ชนะเสมอ ไม่ผูก priority ร่วมกับ cue อื่น

ตาม context ของ task นี้ **cue ความปลอดภัย 4 ตัวคือ `run.death`, `run.autoRetreat`, `run.hpLow`, `anticheat.speedLock`** ทั้งสี่ตัวนี้:
- ครองพิสัย priority 0–3 **แยกขาด ไม่ผูกร่วมกับ cue ที่ไม่ใช่ safety ตัวใดเลย** (แก้จากฉบับก่อนหน้าที่ `anticheat.speedLock` เคยผูก priority 3 ร่วมกับ `raid.checkpointReached`/`run.stateSuspended` — ทั้งสองเลื่อนไป priority 4 แล้วในรอบนี้ ดู 4.3)
- pre-empt (ตัดทันที) ได้ทุก cue ที่ priority ≥ 4 เสมอ ไม่มีเงื่อนไข
- ไม่ถูก cue อื่นตัดเสียง เว้นแต่ cue ความปลอดภัยตัวอื่นที่ priority ต่ำกว่า (เช่น `run.death` ตัด `run.autoRetreat` ได้ ถ้าเกิดถี่กันมากจน HP ตกถึง 0 ระหว่างเล่น cue ถอยอัตโนมัติอยู่)
- ไม่โดน staleness drop (4.1 ข้อ 4)

ลำดับเต็มของ priority queue (`0` สำคัญสุด):

| priority | cue | เป็น cue ความปลอดภัยหรือไม่ |
| --- | --- | --- |
| 0 | `run.death` | ใช่ |
| 1 | `run.autoRetreat` | ใช่ |
| 2 | `run.hpLow` | ใช่ |
| 3 | `anticheat.speedLock` | ใช่ (เดี่ยว ไม่ผูกกับตัวอื่น) |
| 4 | `raid.checkpointReached` = `run.stateSuspended` | ไม่ใช่ |
| 5 | `raid.thirtyMinWarning` = `run.autoPotionUsed` = `run.revived` = `run.stateResumed` | ไม่ใช่ |
| 6 | `run.tickGranted` = `run.tickGrantedFirst` = `drop.rarity.*` = `dungeon.confirmEnter` = `party.buffApplied` | ไม่ใช่ |
| 7 | `run.tickDenied` = `dungeon.closedOrOutOfRange` = `qc.*` | ไม่ใช่ |

เหตุผลของลำดับ: เหตุการณ์ที่กระทบความปลอดภัย/ผลลัพธ์ถาวร (ตาย, ถอยอัตโนมัติ, HP ต่ำ, ถูกล็อกความเร็ว) ต้องรู้ก่อนเสมอแม้เกิดพร้อมเหตุการณ์อื่น เช่น ถ้า auto-retreat ทำงานพร้อม tick ที่กำลังจะประกาศผล ให้เล่น `run.autoRetreat` เท่านั้น (ของที่ได้ยังแสดงผลถูกต้องบนจอสรุปตามปกติ แค่ไม่มีเสียง tick ซ้อน)

### 4.3 ประวัติการแก้ priority

- **P2-F05-T06 (board F-13):** `raid.thirtyMinWarning` ย้ายจาก priority 1 → 4 เพื่อให้ "ต่ำกว่า `run.hpLow`" ตรงตัวตามที่ board สั่ง (เดิมผูก priority เดียวกับ `run.autoRetreat` ซึ่งขัดกับ F-13 และขัดกับโทนใหม่ "ชวนเดินต่อ" ที่ไม่ควรตัดเสียงเรื่องความปลอดภัย) `anticheat.speedLock` เพิ่มที่ priority 3 ในตอนนั้น (ระดับเดียวกับ `run.stateSuspended`)
- **P2-F06-T13 (งานนี้):** จัดใหม่ทั้งชุดให้ cue ความปลอดภัย (4.2) ไม่ผูก priority ร่วมกับ cue อื่นเลย — `anticheat.speedLock` แยกออกมาอยู่ priority 3 คนเดียว, `raid.checkpointReached`/`run.stateSuspended` เลื่อน 3→4, `raid.thirtyMinWarning`/`run.autoPotionUsed`/`run.stateResumed` เลื่อน 4→5, `run.tickGranted`/`run.tickGrantedFirst`/`drop.rarity.*`/`dungeon.confirmEnter` เลื่อน 5→6, `run.tickDenied`/`dungeon.closedOrOutOfRange`/`qc.*` เลื่อน 6→7 · เหตุผล: ก่อนหน้านี้ถ้า `anticheat.speedLock` กับ `run.stateSuspended` เกิดพร้อมกัน ทั้งคู่ priority เท่ากันจะแค่ "เข้าคิว" กัน ไม่มีตัวไหน pre-empt อีกตัว ซึ่งขัดกับกฎ "cue ความปลอดภัยชนะเสมอ" อัปเดต `audio/src/cues.json` → `audio/manifest.json` → เรนเดอร์ `audio/out/*.wav` ใหม่ให้ตรงกัน (เนื้อเสียง/ความยาวไม่เปลี่ยน มีแค่ metadata priority)

### 4.4 Fallback เมื่อเครื่องไม่มี `navigator.vibrate` (R-P1-01, iOS Safari/WebKit)

หลักการเดิมของ `audio/direction.md` หัวข้อ 10 คือ "ยิงทุกชั้นพร้อมกันเสมอ" (visual/vibration/sound/push) ไม่ใช่ตรวจสถานะก่อนแล้วสลับ — งานนี้ยืนยันผลของหลักการนั้นตรงตัวสำหรับ cue-list ฉบับนี้:

- **ไม่มี branch พิเศษสำหรับ "ไม่มี vibrate"**: client ยิง visual + sound เหมือนเดิมทุกประการ (ไม่ต้อง feature-detect ก่อนยิงเสียง/ภาพ) มีแค่การเรียก `navigator.vibrate()` ที่จะ no-op เงียบๆ บน WebKit (ไม่ throw)
- **เสียง + ภาพเป็นผู้นำเสมอเมื่อไม่มีการสั่น** ไม่ใช่ "ผู้ช่วย" — สำหรับ cue ความปลอดภัยทั้ง 4 ตัว (4.2) นี่คือเงื่อนไขที่ต้องผ่านการตรวจจริง (ไม่ใช่แค่มีอยู่): รูปทรง/ความยาวของเสียงแต่ละ cue (หัวข้อ 5) ต้องแยกออกจากกันได้แม้ **ปิดตา ฟังแต่เสียง ไม่มีการสั่นเลย** ไม่ใช่แค่แยกได้ตอนมีสั่นช่วย
- **visual เป็น baseline ที่การันตีเสมอไม่ว่ากรณีใด**: toast/banner/overlay ของทุก cue (คอลัมน์ silent-mode fallback ในตารางข้างต้น) ต้องอ่านได้ครบโดยไม่ต้องได้ยินเสียงหรือรู้สึกสั่นเลย นี่คือ fallback จริง ไม่ใช่ fallback ที่มีเงื่อนไข
- **ไม่มี cue ใดที่ปรับเกณฑ์หรือปิด auto-retreat เพราะเครื่องไม่มี vibrate** (F06-R15, pillars Q5/NN-8 — อ้างจาก flow F06 หัวข้อ C2): เครื่องที่ไม่มี `navigator.vibrate` ยังต้องผ่านเกณฑ์ HP/auto-retreat เดียวกันทุกประการ ต่างกันแค่ช่องทางที่ผู้เล่นรับรู้
- ยืนยันกับ qa-tester (หัวข้อ 6): ต้องทดสอบคู่ safety cue ทั้งหมดในหัวข้อ 5 แบบ "ปิดเสียง เปิดจอ" (visual-only) และ "เปิดเสียง ปิดจอ ไม่มีสั่น" (sound-only, จำลอง iOS) แยกกันสองรอบ ไม่ใช่รอบเดียว

## 5. สรุปการตรวจสัญญาณสำคัญโดยไม่ดูจอและไม่มีเสียง (self-check ของ acceptance ข้อ 3)

ทดสอบ (บนกระดาษ ก่อนมีไฟล์จริง): ให้คนช่วยตรวจปิดตา ปิดเสียง เปิดแค่การสั่น (จำลองบน Android) แล้วบอกคู่ cue สำคัญด้านล่างนี้แยกจากกันได้หรือไม่ — เกณฑ์ผ่านคือแยกได้ 100% จากรูปทรง/ความยาว ไม่ใช่จากการนับจังหวะแม่นยำ **บวกรอบที่สอง sound-only (ไม่มีสั่นเลย จำลอง iOS Safari ตามหัวข้อ 4.4) สำหรับคู่ที่มี cue ความปลอดภัยทุกคู่**:

| คู่ที่ต้องแยกกันชัด | สิ่งที่ต่างกัน |
| --- | --- |
| `run.hpLow` (3 จังหวะเท่ากัน สั้น) vs `raid.checkpointReached` (2 จังหวะ) | จำนวนจังหวะ |
| `run.autoRetreat` (ถี่ขึ้น 3 จังหวะ + จบยาว) vs `run.death` (สั้น 1 จังหวะ + จบยาวทันที) | รูปทรงจังหวะ (ไล่ระดับ vs กระโดดตรง) และความยาวรวม (600 ms vs 750 ms) |
| `run.tickGranted` (จังหวะเดียว 45 ms) vs `run.tickDenied` (จังหวะเดียว 20 ms) | ความยาว (นุ่มกว่าเห็นชัด) — จับคู่กับ visual toast สีต่างกันเสมอ ไม่พึ่งความยาวอย่างเดียวสำหรับกรณีนี้เพราะใกล้เคียงกันที่สุดในตาราง (เป็น "คู่เดียว" ที่ยอมให้ visual ช่วยแยกมากกว่าเสียง เพราะทั้งสองไม่ใช่สัญญาณวิกฤต) |
| `run.death` vs `run.autoRetreat` vs ทุก cue อื่น | ทั้งสองใช้ priority 0–1 (สูงสุด) และยาวกว่า cue อื่นทั้งหมด (600–750 ms) จึง "รู้สึกหนัก" ชัดเจนแม้จำจังหวะไม่ได้ — **sound-only:** โน้ตต่ำยาว (lowTone) ที่ปิดท้ายทั้งคู่ไม่มี cue อื่นใช้เสียงประเภทนี้เลย จึงแยกจาก cue ที่ไม่ใช่ safety ได้ทันทีแม้ไม่มีสั่น |
| `anticheat.speedLock` (1 จังหวะเดียว 70 ms, priority 3 เดี่ยว) vs `run.stateSuspended` (3 จังหวะเท่ากัน 60 ms, priority 4) | จำนวนจังหวะ (1 vs 3) — ตั้งแต่ P2-F06-T13 ทั้งสอง cue นี้อยู่คนละ priority แล้ว (ไม่ผูกร่วมกันอีกต่อไป ดูหัวข้อ 4.3) ดังนั้นถ้าเกิดพร้อมกัน `anticheat.speedLock` (cue ความปลอดภัย) จะตัด `run.stateSuspended` ทันที ไม่ใช่เข้าคิวรอ |
| `run.tickGrantedFirst` (3 จังหวะไล่ขึ้น จบยาว ~330 ms) vs `run.tickGranted` (1 จังหวะ 45 ms) | ความยาวรวมต่างกันชัด (330 ms vs 45 ms) — ตั้งใจให้ "เด่นกว่า" ทันทีแม้ปิดตา ตามที่ flow F05/F06 ขอ |

หมายเหตุ: การทดสอบจริงกับผู้เล่นบนอุปกรณ์จริง (ไม่ใช่บนกระดาษ) เป็นงานของ qa-tester หลังมีไฟล์เสียงและ integration แล้ว (ยังไม่อยู่ใน scope ของ T18/T13 — ดู handoff หัวข้อ 6)

## 6. สมมติฐาน และส่งต่อ (สรุปจาก `audio/direction.md` หัวข้อ 11 เฉพาะที่กระทบตารางนี้)

- `[ASSUMPTION A-P1-F03-T18-1..4]` ดูรายละเอียดเต็มใน `audio/direction.md` หัวข้อ 11 — สรุปที่กระทบไฟล์นี้: cue `raid.*` และ `drop.rarity.*`/`party.buffApplied`/`run.revived` ใช้ชื่อ cue ชั่วคราวรอ copy key จริงจาก narrative-designer ใน F17/F09 ตามลำดับ — **ยังไม่ render ไฟล์เสียงของ 3 คู่นี้ใน P2-F05-T06** (ไม่มี copy key จริง ไม่อยู่ใน flow F05/F06 ปัจจุบัน) `audio/manifest.json` จึงไม่มี entry ของ `raid.checkpointReached`, `raid.thirtyMinWarning`, `party.buffApplied`, `run.revived` รอ build task ของ F17/F09
- ตรวจกับ `product/telemetry-events.md` แล้ว (ไม่ใช่ assumption อีกต่อไป): `run.tickGrantedFirst` คู่กับ `run_tick_granted` เสมอ บวก `onboarding_first_reward_granted` ยิงคู่กันเวลาเดียวกัน (นิยามตรงตัวในเอกสารนั้น) · `anticheat.speedLock` ใช้ `anticheat_speed_lock_triggered` (มีอยู่แล้ว) · `run.stateSuspended`/`run.stateResumed` ใช้ event เดียวกัน `run_state_changed` (แยกด้วย property `to`) · `run.autoPotionUsed` ใช้ `run_potion_auto_used` (แก้ชื่อให้ตรง ไม่ใช่ `run_auto_potion_used` ที่เดาไว้ตอนแรก) · `drop.rarity.uncommon` ไม่มี event เฉพาะ (มีแค่ `loot_rarity_received` ตั้งแต่ rare ขึ้นไป) — ทุกชื่อนี้ยืนยันแล้วใน `audio/manifest.json`
- `[ASSUMPTION A-P2-F05-T06-1]`: `qc.sent`/`qc.received` และ `dungeon.closedOrOutOfRange` ไม่มี telemetry event ที่ตรงตัวใน `product/telemetry-events.md` ปัจจุบัน (`checkin_rejected` ใกล้เคียงที่สุดแต่ยิงหลัง popup confirm เปิดแล้ว คนละจังหวะกับ cue นี้ที่เกิดตอนแตะหมุดที่ปิด/นอกระยะ) — manifest ใส่ `telemetry: null` ไว้ก่อน ไม่ตั้งชื่อ event เอง (เจ้าของยืนยัน: product-manager)
- ถึง **gameplay-programmer** (P2-F06-T14): ตารางและกฎ priority queue เต็มอยู่ที่หัวข้อ 4 (4.1 กติกาคิวเดียว, 4.2 รายชื่อ+พิสัย priority ของ cue ความปลอดภัย, 4.4 กฎ fallback เมื่อไม่มี vibrate) implement เป็นคิวเดียว (single audio/vibration channel) ไม่ใช่ mixer หลายแทร็ก · ต้องยิง visual/vibration/sound พร้อมกันเสมอ ไม่มี conditional branch ตรวจ `navigator.vibrate` ก่อนยิงชั้นอื่น (4.4) · cue ความปลอดภัยทั้ง 4 ไม่โดน staleness drop (4.1 ข้อ 4) · โหลดไฟล์ตาม `docs/tech/asset-delivery.md` หัวข้อ 8 (`asset-manifest.json` → `audio[cueId].url`) ไม่ประกอบ path เอง
- ถึง **qa-tester**: หลังมีไฟล์เสียงจริง (`audio/out/`, เรนเดอร์แล้วในงานนี้) และ integration แล้ว ให้ทดสอบซ้ำหัวข้อ 5 บนอุปกรณ์จริงทั้ง Android และ iOS **สองรอบแยกกัน**: (1) visual-only (ปิดเสียง+ปิดสั่น) (2) sound-only (เปิดเสียง ปิดสั่น จำลอง iOS ตาม assumption 4/R-P1-01) — ต้องยืนยันว่า cue ความปลอดภัยทั้ง 4 (หัวข้อ 4.2) แยกออกจากกันได้ 100% ในทั้งสองรอบ ไม่ใช่แค่รอบที่มีสั่นช่วย รวมคู่ใหม่ในหัวข้อ 5 (`anticheat.speedLock` vs `run.stateSuspended` — คนละ priority แล้ว, `run.tickGrantedFirst` vs `run.tickGranted`)
- ถึง **producer**: build task นี้ปิดแล้ว (`audio/src/generate.ts`, `audio/out/*.wav`, `audio/manifest.json`, `audio/demo.html` ตามหัวข้อ 7) — P2-F06-T13 ปิดแล้วเช่นกัน (typecheck fix + priority queue/fallback ของหัวข้อ 4) งานถัดไปที่ยังไม่มีบนบอร์ด: render เสียงของ `raid.*`/`party.buffApplied`/`run.revived` เมื่อ F17/F09 ยืนยัน copy key

## 7. ไฟล์ที่ render แล้ว (P2-F05-T06, priority metadata อัปเดตใน P2-F06-T13)

เรนเดอร์ผ่าน `audio/src/generate.ts` (deterministic, ไม่มี network) ลง `audio/out/*.wav` (gitignored, เกิดใหม่ทุกครั้งที่ build) ทะเบียนอยู่ใน `audio/manifest.json` (commit) — ดูรายละเอียดสัญญาที่ `docs/tech/asset-delivery.md` หัวข้อ 8 และวิธีรันที่คอมเมนต์บนสุดของ `audio/src/generate.ts` ทดสอบฟังจริงพร้อมสั่นที่ `audio/demo.html` · P2-F06-T13 แก้เฉพาะค่า `priority` ใน `audio/src/cues.json` (หัวข้อ 4.3) แล้วรัน `pnpm exec tsx audio/src/write-manifest.ts` + `pnpm exec tsx audio/src/generate.ts --out audio/out` ใหม่ — bytes/durationMs/loudness ของทุกไฟล์เท่าเดิม (เนื้อเสียงไม่เปลี่ยน มีแค่ metadata คิวที่เปลี่ยน)

รูปแบบไฟล์: WAV PCM 16-bit mono 11,025 Hz (ไม่ใช่ OGG ตามร่างเดิม — เปลี่ยนเพราะ Safari/iOS ไม่รองรับ Ogg Vorbis แต่รองรับ WAV PCM ทุกเบราว์เซอร์รวม iOS Safari ตามที่ task brief สั่งตรง ๆ "a format the client plays everywhere incl. iOS Safari") sample rate 11,025 Hz เลือกเพราะเนื้อหาเสียงทั้งหมดอยู่ใต้ 3.5 kHz (Nyquist 5,512 Hz พอเหลือเฟือ) และลดขนาดไฟล์ลง ~75% เทียบ 44.1 kHz มาตรฐาน เพื่อคุมงบข้อมูลตามหัวข้อ 2 ของ `audio/direction.md`

Loudness: ใช้สูตรประมาณการ (ไม่ใช่ ITU-R BS.1770 เต็มรูปแบบ — ดูหมายเหตุความแม่นยำใน `audio/src/loudness.ts`) ปรับ gain ต่อไฟล์ให้เข้าใกล้ -16 LUFS ตามลำดับความดังสัมพัทธ์ในหัวข้อ 5 ของ `audio/direction.md` และจำกัด true peak ไม่เกิน -1 dBTP (≈0.891 linear) เสมอ
