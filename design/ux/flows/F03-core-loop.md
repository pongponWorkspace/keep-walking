# Flow หลัก — Onboarding → แผนที่ → เข้า dungeon → run → สรุป

Task: P1-F03-T16 · เจ้าของ: uiux-designer · สถานะ: ฉบับเสนอ รอ design gate A (P1-F03-T24 — core-loop flow ต้องผ่าน game-director ตาม protocol ข้อ 5) · วันที่: 2026-09-23
แหล่งอ้างอิง: `design/ux/ia.md` (P1-F03-T15 — ทุกรหัสหน้า `S-xx` ในเอกสารนี้อ้างจากที่นั่น) · `design/pillars.md` หัวข้อ 6 (ห้ามสอน 10 นาทีแรก) และหัวข้อ 7 (สถานะที่บ้าน) · `design/narrative/style-guide.md` หัวข้อ 3 (สามจังหวะ HP/ตาย) และหัวข้อ 4 (รูปแบบ copy key ตัวแปร ความยาว) · `design/narrative/world.md` หัวข้อ 0, 11 · GDD "การเข้าและออก", "เวลาทำการ", "Core loop ใน Dungeon", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู", "การเลือกระหว่าง dungeon กับ boss", "สัญญาณขาดและแอปถูกปิด", "การเข้าสู่ระบบ", "ความปลอดภัยผู้เล่นและ PDPA" · `config/balance/dungeons.json`, `config/balance/economy.json#autoPotion`, `config/balance/progression.json#hpRecovery`, `config/balance/unlocks.json`
ลำดับอำนาจ: GDD > pillars.md > ia.md > เอกสารนี้ · ตัวเลขทุกตัวอ้างเป็น `config: <key>` เท่านั้น ค่าที่ใส่ในวงเล็บหลัง `config:` เป็นค่าปัจจุบันใน config เพื่ออ่านง่าย **ห้ามลอกเฉพาะตัวเลขไปเขียนโค้ดหรือ copy ตรง ๆ**

## สารบัญ
1. หลักการอ่าน flow นี้ (สัญลักษณ์ กติกา config กติกาสถานะ)
2. Flow A — Onboarding นาที 0–10
3. Flow B — แผนที่ → confirm เข้า dungeon (รวม polygon ซ้อนและเลือก dungeon กับ boss)
4. Flow C — อยู่ใน dungeon (run state) และ MF-1 (HP ต่ำ, ยาอัตโนมัติ, auto-retreat, ตาย, ออกเอง, tick ไม่ผ่าน gate) → สรุปผล
5. Flow D — dungeon ไกล / นอกพื้นที่ / ไม่รู้ตำแหน่ง
6. Flow E — ปิด auto-retreat ในตั้งค่า (ฝังลึกโดยตั้งใจ)
7. ตารางสถานะที่ต้องมีทุกหน้า (empty, loading, GPS ปิด, accuracy ต่ำ, offline, dungeon ปิด, นอกระยะ, error)
8. แอปถูกย่อ/ปิด และเน็ตหลุด ต่อ flow
9. รายการ copy key ทั้งหมด (ส่งต่อ P1-F03-T05) และประกาศ `gps.*` ให้ P1-F02-T10 ใช้ (N-7)
10. สมมติฐานและคำถามค้าง

## 1. หลักการอ่าน flow นี้

โจทย์ตั้งต้น: ผู้เล่นเดินกลางแดดหรือฝนด้วยมือเดียว มองจอ 3 วินาทีแล้วเก็บมือถือกลับกระเป๋า ทุกขั้นของ flow นี้ต้องอ่านจบและกดถูกได้ภายในการมองสั้น ๆ นั้น ไม่มีขั้นไหนบังคับให้อ่านย่อหน้ายาว

สัญลักษณ์ที่ใช้:
- `→` ผู้เล่นกดปุ่ม หรือระบบเปลี่ยนสถานะให้อัตโนมัติ ไปขั้นถัดไป
- `⤷ เงื่อนไข:` จุดแตกสาขา (branch) ตามเงื่อนไข
- `S-xx-slug` รหัสหน้าจอ อ้างจาก `design/ux/ia.md` เสมอ ถ้าไม่มีรหัสใหม่ในหัวข้อนั้น แปลว่ายังอยู่หน้าเดิม เปลี่ยนแค่เนื้อหา/overlay
- `[copy.key]` ชื่อ copy key ที่เสนอ ตามด้วยร่างไทยในวงเล็บ `(...)` — ของจริงเป็นหน้าที่ P1-F03-T05 เขียน เอกสารนี้เป็นแค่ผู้เสนอชื่อ key และบริบท
- `config: <key>` ตัวเลข/เงื่อนไขทั้งหมดอ้างชื่อ key เท่านั้น ค่าปัจจุบันใส่ต่อท้ายในวงเล็บเพื่ออ่านง่าย เช่น `config: dungeons.hpSafety.autoRetreatThreshold_pct (= 25)`
- ทุกหน้าที่มีการต่อเน็ตหรือ GPS ต้องอ่านหัวข้อ 7–8 ประกอบเสมอ ไม่ทวนสถานะทั้งหมดซ้ำในทุกขั้นของ flow A–E เพื่อไม่ให้เอกสารยาวเกินจำเป็น หัวข้อ 7 ชี้กลับมาที่แต่ละหน้าแทน
- กติกาที่ flow นี้ต้องเคารพเสมอ (ยกมาจาก IA และ pillars เพื่อกันหลุด): ไม่มีช่องพิมพ์อิสระที่ไหนเลย, ไม่แสดงตำแหน่งหรือชื่อผู้เล่นคนอื่นแบบรายบุคคล (แสดงได้แค่จำนวน+role), ปุ่ม primary ของทุกหน้าอยู่ครึ่งล่างของจอและมีขนาดขั้นต่ำ 48px, นาที 0–10 ห้ามมีทางกดไปหน้าของระบบ U1–U8 (ตลาด ตีบวก raid stat class party ละเอียด anti-cheat lore) ตาม pillars 6.2

## 2. Flow A — Onboarding นาที 0–10

ที่มา: GDD "10 นาทีแรกของคนใหม่" ตาราง 5 ช่วง + board T16 เพิ่มเงื่อนไข PDPA (consent location แยก, permission เบราว์เซอร์, อายุ 15+, login) เข้าไปในนาที 0–1 โดยยังต้องเลือกพลังและเห็นแผนที่ให้ทันภายในนาทีแรก (MF-2) — ดูหมายเหตุความเสี่ยงเรื่องเวลาใน [ASSUMPTION A-P1-F03-T16-1] หัวข้อ 10

### นาที 0–1: ปัญหา → consent → permission → อายุ → login → เลือกพลัง → เห็นแผนที่

แต่ละขั้นเป็นจอเดียว ปุ่มเดียวเด่นสุด ไม่มีย่อหน้ายาว เพื่อให้รวมกันยังอยู่ในงบ 1 นาที

1. `S-00-intro` — ข้อความเดียว `[onboarding.intro]` ("กรุงเทพฯ กำลังมีปัญหา") ไม่มีปุ่มข้าม กดที่ใดก็ได้ทั้งจอเพื่อไปต่อ (ปุ่มเดียวเต็มจอ ไม่ใช่ปุ่มเล็ก) → `S-00-consent-location`
2. `S-00-consent-location` — consent location **แยกจาก consent อื่นทั้งหมด** (NN-7): หัวข้อ `[consent.locationTitle]`, เหตุผลสั้น `[consent.locationBody]` (ใช้ทำอะไร + เก็บ `position_log` ไม่เกิน `config: privacy.positionLogTtl_s` แล้วลบ — key นี้ยังไม่มีใน config, รอ P1-H03), ปุ่ม `[consent.locationAccept]` / `[consent.locationDecline]`
   ⤷ เงื่อนไข: ปฏิเสธ → ข้าม permission เบราว์เซอร์และการอ่านตำแหน่งทั้งหมด ไปที่ `S-00-age-gate` ตรง ๆ (อายุและ login เป็นเรื่องอิสระจากตำแหน่ง) แล้วหลังจากนั้นเข้า `S-01-map` ที่สถานะ "ไม่รู้ตำแหน่ง" ทันที (ดู Flow D หัวข้อ 5) — **ยังดู avatar อ่าน role และลงทะเบียนความสนใจได้จากหน้านั้น เหมือนรูปแบบเดียวกับกรณี dungeon ไกล** (แผงล่างของ `S-01-map` เปลี่ยนเนื้อหาไม่ใช่คนละหน้า)
   ⤷ เงื่อนไข: ยอมรับ → `S-00-permission-browser`
3. `S-00-permission-browser` — จอเกริ่นสั้น `[consent.browserPrimingTitle]` / `[consent.browserPrimingBody]` ก่อน trigger native geolocation prompt ของเบราว์เซอร์ (ลดอัตราปฏิเสธ) → กด `[consent.browserPrimingContinue]` → native prompt ของ OS/เบราว์เซอร์ (ไม่ใช่ UI ของเกม)
   ⤷ เงื่อนไข: ผู้เล่นกด "Block" ที่ native prompt → เหมือนกรณีปฏิเสธ consent ในขั้น 2 (ไปที่สถานะ "ไม่รู้ตำแหน่ง")
   ⤷ เงื่อนไข: ผู้เล่นกด "Allow" → `S-00-age-gate`
4. `S-00-age-gate` — ตรวจอายุ 15+ ด้วยตัวเลือกช่วงอายุ/ปีเกิดจากรายการ (ไม่พิมพ์) `[age.gateTitle]` `[age.gateOptions]` เทียบกับ `config: privacy.minAge_yr` (ยังไม่มีใน config ปัจจุบัน — เสนอ key ใหม่ ดูหัวข้อ 10)
   ⤷ เงื่อนไข: ต่ำกว่าเกณฑ์ → `[age.underMinTitle]` `[age.underMinBody]` เส้นทาง parental consent เป็น **scaffold ปิดไว้** ควบคุมด้วย `config: unlocks.parentalConsent` (ยังไม่มีใน config ปัจจุบัน รอ P1-H03) แสดงข้อความ "ยังเปิดใช้งานไม่ได้" เท่านั้น ไม่มีฟอร์มให้กรอกอะไร ไม่ปิดแอปทันที มีปุ่มเดียวกลับหน้าแรกของแอป (ไม่ไปต่อ flow onboarding ที่เหลือ)
   ⤷ เงื่อนไข: ผ่านเกณฑ์ → `S-00-login`
5. `S-00-login` — เข้าสู่ระบบด้วย Google/Apple เท่านั้น (GDD "การเข้าสู่ระบบ") `[account.loginTitle]` ปุ่ม `[account.loginGoogle]` `[account.loginApple]` — ตำแหน่งของขั้นนี้ใน flow เป็น `mandatory-first` ตาม [ASSUMPTION A-P1-F03-T15-2 ของ ia.md] จนกว่า F07 จะตัดสิน guest session
   ⤷ เงื่อนไข: login ล้มเหลว/ปฏิเสธสิทธิ์ provider → `[account.loginError]` พร้อมปุ่มลองใหม่ ค้างที่หน้านี้ ไปต่อไม่ได้ (ต้องมี account ก่อนผูก progress ตาม NN-1)
   ⤷ เงื่อนไข: login สำเร็จ → `S-00-class-select`
6. `S-00-class-select` — เลือกพลัง 4 แบบ `[onboarding.pickRoleTitle]` การ์ด 4 ใบ (Tanker/Ranged/Support/Magic) แต่ละใบมีคำอธิบายผลสั้นบรรทัดเดียว ไม่มีสูตร `[onboarding.pickRoleTanker/Ranged/Support/Magic]` → กดเลือก 1 ใบ → เข้าเกมทันที (ไม่มีหน้ายืนยันซ้อน) → `S-01-map`
7. `S-01-map` — เห็นแผนที่จริงครั้งแรก พร้อมรอยแยกใกล้ตัว (สถานะ "ใกล้" ตาม pillars 7.1) ปิดนาที 0–1

### นาที 1–3: เห็นรอยแยกใกล้สุด → เดินไปหา

8. บน `S-01-map` แผงล่างขึ้น `[map.nearestRiftFound]` ("พบรอยแยกใกล้คุณ — {distanceText} {levelRangeLabel}") ปุ่มเด่นสุด `[map.navigateButton]` ("นำทาง") เปิดแอปนำทางภายนอกหรือ pin ทิศทางบนแผนที่เดิม (ตัดสินใจ implementation ภายหลัง ไม่ใช่ของ flow นี้)
   ⤷ เงื่อนไข: ระยะรอยแยกที่เปิดอยู่ใกล้สุดเกิน `config: unlocks.home.farDungeonThreshold_m (= 2000)` → ไม่ใช่ onboarding ปกติอีกต่อไป ข้ามไป Flow D (หัวข้อ 5) ตั้งแต่ตอนนี้ — เกมยังคงสถานะ "ยังไม่จบ onboarding" ไว้ พอผู้เล่นเดินเข้าใกล้ในภายหลังแล้วกลับมาอยู่ในระยะ ให้กลับเข้า flow A ขั้นที่ 9 ต่อ ไม่ต้องเริ่มใหม่ตั้งแต่ขั้น 1 (เลือกพลัง/login ทำไปแล้ว)
   ⤷ เงื่อนไข: อยู่ในระยะ → ผู้เล่นเดินไปจริง (ไม่มีอะไรให้ทำในแอประหว่างเดิน มือถือเก็บกระเป๋าได้)
9. ผู้เล่นเดินถึงขอบ polygon → ไป Flow B ขั้น B1

### นาที 3–6: confirm เข้า → ประโยคเดียวของทั้งเกม

รายละเอียดเต็มของ popup confirm อยู่ใน Flow B (หัวข้อ 3) เพราะใช้ popup เดียวกันตลอดเกม ไม่ใช่แค่ตอน onboarding สรุปเฉพาะส่วนที่ต่างจาก flow ปกติ:
10. `S-02-dungeon-confirm` ครั้งแรกในชีวิตผู้เล่น: หลัง `[dungeon.confirmEnter]` เข้าไปแล้ว หน้าจอ `S-03-run` แสดง `[dungeon.confirmTutorialLine]` ("เดินต่อไปเพื่อรับรางวัล") ทับสั้น ๆ ครั้งเดียว **เป็น tutorial บรรทัดเดียวของทั้งเกม** ไม่มี tooltip อธิบาย HP bar หรือ tick timer เพิ่มเติม (pillars: บทเรียนเดียวคือ "เดินต่อไปเพื่อรับรางวัล")

### นาที 6–8: เจอคนอื่น (ถ้ามี) → เข้าร่วมได้ buff ทันที

11. ถ้ามีผู้เล่นอื่นอยู่ใน dungeon เดียวกัน แผง `S-03a-nearby-party` โผล่ขึ้นแบบไม่บล็อกจอ (ไม่ใช่ popup ต้องตอบ) `[party.foundTitle]` ("เจอผู้เล่นอีก {count} คน") + `[party.foundRoles]` ({roleList} เช่น "Tanker กับ Support") ปุ่ม `[party.joinButton]` ("เข้าร่วม")
    ⤷ เงื่อนไข: กดเข้าร่วม → ได้ buff ทันที ขึ้น `[party.buffApplied]` แบบ toast สั้น ไม่มีหน้าอธิบายสูตร (U6 ยังไม่ปลด — ห้ามสอนกลไกตาม pillars 6.2)
    ⤷ เงื่อนไข: ไม่มีใครในโซนนี้ → ไม่แสดงแผงนี้เลย (ไม่ใช่แสดงแผงว่าง `[party.empty]` แบบเด่น เพราะ "ไม่มีคน" ไม่ใช่ข้อมูลที่ต้องแจ้งเชิงรุกในนาทีแรก) ไปขั้น 12 ตรง ๆ

### นาที 8–10: reward tick แรก → ปิดด้วยคำเชิญเดินต่อ

12. เมื่อครบ `config: dungeons.rewardTick.rewardTickInterval_s (= 300, 5 นาที)` ระบบตรวจ movement gate
    ⤷ เงื่อนไข: ระยะสะสมในหน้าต่างนั้นมากกว่า `config: dungeons.movementGate.minDistancePerWindow_m (= 50 ม.)` → ได้ tick แรก `[run.tickGranted]` แสดงของที่ได้แบบสั้น ปิดท้ายด้วย `[run.continueCta]` ("เดินต่อเพื่อรับเพิ่ม") — ปิด onboarding ที่นี่ ผู้เล่นเข้าสู่ core loop ปกติแล้ว
    ⤷ เงื่อนไข: ระยะไม่ถึง `config: dungeons.movementGate.minDistancePerWindow_m` → `[run.tickDenied]` ("เดินไม่พอรอบนี้") **ไม่ลงโทษ ไม่มีคำต่อว่า** ผู้เล่นยังอยู่ใน run ต่อไปเหมือนเดิม รอ tick ถัดไป (รายละเอียดเต็มอยู่ Flow C หัวข้อ 4.6)

ตัวตรวจซ้ำของ flow A: ไม่มีขั้นใดใน 1–12 ลิงก์ไปหน้า `S-11` (ปุ่มขาย/ตีบวก), `S-12`, `S-13`, `S-16`, `S-18`, `S-19`, หัวข้อ anti-cheat ใน `S-25`, หรือ `S-26` ตรงตาม SF-11

## 3. Flow B — แผนที่ → confirm เข้า dungeon

ใช้ popup เดียวกันทุกครั้งไม่ว่าจะเป็น onboarding หรือเล่นมานานแล้ว ที่มา: GDD "การเข้าและออก" (อยู่ได้ทีละ 1 dungeon, popup confirm ก่อนเข้าเสมอ) และ "การเลือกระหว่าง dungeon กับ boss"

B1. ผู้เล่นเดินเข้าขอบ polygon ของ dungeon (client ตรวจจากพิกัดที่ได้รับอนุญาตแล้ว) → ระบบเปิด `S-02-dungeon-confirm` เป็น popup ทันที ไม่ต้องกดปุ่มเปิดเอง (ลดจังหวะกดตอนเดิน)
   - เนื้อหา: ชื่อโซน `[dungeon.confirmTitle]` ({zoneName}) · จำนวนคนตอนนี้ `[dungeon.confirmCount]` ({count}) · role ที่มี `[dungeon.confirmRoles]` ({roleList}) ถ้ามีคน · ช่วงเลเวลของโซน `{levelMin}`–`{levelMax}` (ไม่บล็อกการเข้าตาม GDD "ระดับเลเวลที่เหมาะสม") · ปุ่ม `[dungeon.confirmEnter]` ("เข้า") เด่นสุดครึ่งล่างจอ และ `[dungeon.confirmCancel]` ("ยกเลิก")
   - `config: dungeons.entry.confirmPopupRequired (= true)` — ไม่มีทางเข้า dungeon โดยไม่เจอ popup นี้ ไม่มีข้อยกเว้น แม้แต่ผู้เล่นที่เคยเข้ามาแล้วนับร้อยครั้ง
   ⤷ เงื่อนไข: กด "ยกเลิก" → ปิด popup กลับ `S-01-map` เฉย ๆ ไม่มีผลอะไร (ไม่ใช่การลงโทษ ผู้เล่นยังยืนอยู่ตรงนั้นได้ เปิด popup ใหม่ได้เมื่อไรก็ได้ที่ยังอยู่ในเขต)
   ⤷ เงื่อนไข: กด "เข้า" → ตรวจ `config: dungeons.entry.respectOpeningHours (= true)` และ `config: dungeons.entry.maxActiveDungeonsPerPlayer (= 1)` ที่ server ก่อนยืนยัน (client แค่ส่งคำขอ ไม่ตัดสินเอง) → ไป B5 (เข้า run สำเร็จ) หรือ B4 (ปิดอยู่/ชนกันเอง) แล้วแต่ผล

B2. **กรณี polygon ซ้อนกัน** (สอง dungeon ทับพื้นที่กัน): `S-02-dungeon-confirm` แสดงเป็น 2 การ์ดให้เลือกแทนการ์ดเดียว แต่ละการ์ดมีชื่อโซน/จำนวนคน/role ของตัวเอง `[dungeon.overlapTitle]` ("เลือกโซนที่จะเข้า") ผู้เล่นแตะการ์ดที่ต้องการก่อนเห็นปุ่ม "เข้า" ใช้งานได้ (ปุ่มเข้าไม่ทำงานจนกว่าจะเลือกการ์ดใดการ์ดหนึ่ง) — GDD: "ต่อให้ polygon ซ้อน dungeon อื่นก็ถือว่าอยู่ dungeon ที่เลือกเท่านั้น"

B3. **กรณีคร่อมวง raid boss** (อยู่ในทั้ง polygon dungeon ปกติและวง raid พร้อมกัน): popup เดียวกันแสดง 2 ตัวเลือกคือชื่อโซน dungeon ปกติ กับการ์ด raid `[dungeon.vsBossTitle]` ("มี raid บอสอยู่ที่นี่ด้วย") — ใช้ได้แม้ผู้เล่นยังไม่ผ่าน `config: unlocks.raid` (U3) เพราะ GDD กำหนดให้การเข้าร่วมทางกายภาพไม่ถูกบล็อกด้วย unlock (ดู `design/ux/ia.md` A-P1-F03-T15-6) — เลือก raid → เข้า `S-20-raid-run` แทน `S-03-run` (รายละเอียดหน้า raid ไม่ใช่ขอบเขตของ T16 นี้ อยู่ใน F17)

B4. **dungeon ปิดอยู่** (นอกเวลาทำการ หรือปิดฉุกเฉินโดย moderator): แทนที่จะเปิด popup confirm ปกติ ขึ้น `[dungeon.closedTitle]` ("ปิดอยู่ตอนนี้") + `[dungeon.closedBody]` ("เปิดอีกครั้ง {openTime}") ไม่มีปุ่ม "เข้า" ให้กด มีแค่ปุ่มปิด popup กลับแผนที่ — สถานะนี้ต้องปรากฏได้ทั้งตอนเดินเข้าเขตครั้งแรก (แทน B1) และตอนกด "เข้า" แล้ว server ปฏิเสธ (แทน B5)

B5. server ยืนยัน → เข้า `S-03-run` สถานะเริ่มต้นเสมอคือ Active → ไป Flow C

## 4. Flow C — อยู่ใน dungeon (run state) และ MF-1

`S-03-run` เป็น idle screen: มือถือเก็บกระเป๋าได้ทั้งหมดของ flow นี้ไม่ต้องกดอะไรเพื่อ "เล่น" มีแค่ทางเลือกให้กดเมื่อ *ตัดสินใจ* บางอย่าง (ออกเอง, ใช้ยาเอง, เข้าร่วม party) — องค์ประกอบถาวรบนจอ: HP bar (ค่าจริงจาก server ไม่คำนวณที่ client), tick timer (นับถอยหลังสู่ tick ถัดไป), ปุ่มออกเองอยู่ครึ่งล่างจอเสมอ

### 4.1 Run state machine (Active / Grace / Suspended / Ended)

ที่มา: GDD "การเข้าและออก" ตาราง 4 สถานะ — ทำงานอัตโนมัติจากตำแหน่ง ไม่มีปุ่มให้ผู้เล่นกดเปลี่ยนสถานะเอง

| สถานะ | เงื่อนไข | ได้ reward tick | สิ่งที่จอแสดง |
| --- | --- | --- | --- |
| Active | อยู่ใน polygon | ได้ ถ้าผ่าน movement gate | จอปกติ ไม่มี banner พิเศษ |
| Grace | ออกนอก polygon ไม่เกิน `config: dungeons.runState.graceMax_s (= 180, 3 นาที)` | ไม่ได้ | banner เล็กไม่บล็อกจอ `[run.stateGrace]` ("กำลังเช็คตำแหน่ง") — ไม่ใช้ถ้อยคำที่ทำให้ตกใจ เพราะเป็นแค่ GPS drift ปกติ |
| Suspended | ออกนอกต่อเนื่อง `config: dungeons.runState.graceMax_s (= 180)` ถึง `config: dungeons.runState.suspendedMax_s (= 900, 15 นาที)` | ไม่ได้ (`dungeons.runState.suspendedTimeCounts = false` — เวลาที่หายไปไม่นับเข้า movement gate เมื่อกลับมา) | banner ชัดเจนกว่า Grace `[run.stateSuspended]` ("run หยุดชั่วคราว กลับเข้าเขตเพื่อเล่นต่อ") ยัง**ไม่จบ run** ออกไปเข้าห้องน้ำหรือซื้อน้ำได้ |
| Ended | ออกนอกเกิน `config: dungeons.runState.suspendedMax_s (= 900)` | ไม่ได้ (run จบ) | ไปหน้าสรุปผลอัตโนมัติ (หัวข้อ 4.8) |

`config: dungeons.movementGate.appliesTo` ครอบทั้ง `dungeon` และ `raid` โดยไม่มีข้อยกเว้น (`exceptions: []`) — flow นี้และ flow raid ในอนาคตต้องใช้กติกาเดียวกันเป๊ะ

### 4.2 HP ต่ำ (แจ้งเตือน)

ทำงานตั้งแต่นาทีแรกโดยไม่ต้องสอน (ไม่มีหน้าอธิบายระบบ HP มาก่อน) เมื่อ HP ลดถึง `config: dungeons.hpSafety.lowHpWarningThreshold_pct (= 30)`:
- สั่นตามรูปแบบที่ sound-designer กำหนด (`config: dungeons.hpSafety.lowHpWarningChannels = ["vibrate","push"]`) ตามด้วย push ถ้าแอปอยู่เบื้องหลัง (ดูหัวข้อ 8)
- ข้อความ canon จาก style guide ตรงตัวไม่มีตัวแปร `[run.hpLow]` ("HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ") แสดงเป็น toast ทับจอสั้น ๆ ไม่บล็อกการเห็น HP bar
- ไม่มีปุ่มบังคับให้ทำอะไร เป็นแค่การแจ้ง ผู้เล่นตัดสินใจเอง (เดินต่อ/ใช้ยา/ถอย)

### 4.3 ยาอัตโนมัติ

`config: economy.autoPotion.enabledByDefault (= true)` — ถ้ามียาในกระเป๋า ระบบใช้ให้เองเมื่อ HP ต่ำกว่า `config: economy.autoPotion.defaultThreshold_pct (= 40)` ตามลำดับ `config: economy.autoPotion.defaultPotionOrder` (ยาเล็กก่อน) ผู้เล่นเห็นแค่ toast สั้น `[run.autoPotionUsed]` ("ใช้ยาอัตโนมัติ") HP bar ขยับขึ้นให้เห็นเอง ไม่มี popup ถามยืนยันก่อนใช้ (ตั้งใจให้ automatic จริง ไม่ขวางจังหวะเดิน) — เกณฑ์เปอร์เซ็นต์นี้ปรับได้ในตั้งค่าความปลอดภัยหน้าเดียวกับ auto-retreat (Flow E)

### 4.4 Auto-retreat (ถอยอัตโนมัติ)

`config: dungeons.hpSafety.autoRetreatEnabledByDefault (= true)` — ทำงานเองที่ HP `config: dungeons.hpSafety.autoRetreatThreshold_pct (= 25)` **โดยไม่ต้องกดอะไร**:
1. ระบบดึงผู้เล่นออกจาก run ทันที (ทาง server เท่านั้น ไม่ใช่ client จำลอง)
2. ข้อความ canon จาก style guide (ห้ามแก้ถ้อยคำ ยกเว้นตัดบรรทัดถ้าจอแคบ ดู style guide 3.1) `[run.autoRetreat]` ("HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ") ความยาว 63 ช่อง ชิดเพดาน 64 — ถ้า uiux กำหนดความกว้างบรรทัดต่ำกว่า 32 ช่องในหน้าจอจริง (T17) ให้ตัดที่ `\n` หน้า "คุณรอด" ตามที่ style guide อนุญาตไว้แล้ว ไม่ต้องขอแก้คำใหม่
3. `config: dungeons.hpSafety.autoRetreatKeepsRunLoot (= true)` — ของที่เก็บได้ใน run นั้น**เก็บครบ ไม่หาย** ต่างจากตายชัดเจน หน้าสรุปผล (4.8) แสดงของที่ได้ตามปกติ
4. `config: dungeons.exit.regenStartsOnExit (= true)` — HP เริ่มฟื้นทันทีตามอัตรา `config: progression.hpRecovery.outsideDungeonRegen_pctMaxHpPerMin`
- Auto-retreat เปิดเป็นค่าเริ่มต้นเสมอ การปิดต้องเข้าไปปิดเองใน Flow E เท่านั้น ไม่มีทางปิดจากหน้า run โดยตรง (ป้องกันการปิดโดยไม่ตั้งใจตอนรีบกดระหว่างเดิน)

### 4.5 ตาย

เกิดได้เฉพาะกับคนที่ปิด auto-retreat เองหรือ HP ลดเร็วกว่าที่ระบบดึงตัวทัน (เช่นโดนตีหลายครั้งติดกันในช่วงเวลาสั้นกว่ารอบประมวลผล) — GDD ยอมรับว่าเป็นกรณีที่ตั้งใจเสี่ยงเอง บทลงโทษจึงหนักได้:
1. `config: dungeons.death.loseAllRunLoot (= true)` — ของที่เก็บได้ใน run นี้หายทั้งหมด (ต่างจาก auto-retreat ชัดเจน ต้องสื่อความต่างนี้ในจอสรุปด้วย)
2. ข้อความ canon `[run.death]` ("คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย") พร้อมทางเลือกสำรอง 2 ข้อความตาม style guide 3.4 (`[run.death.alt1]`, `[run.death.alt2]`) — narrative-designer เลือกและปรับคำจริงใน P1-F03-T05 เอกสารนี้เสนอแค่ตำแหน่งที่ต้องมี 3 ทางเลือก
3. ทางฟื้น 3 ทาง แสดงเป็นตัวเลือกบนจอเดียวกัน ไม่ใช่คนละหน้า: (ก) รอฟื้นเอง `config: progression.hpRecovery.deathRecoveryTo_pct (= 50%)` ภายใน `config: progression.hpRecovery.deathRecoveryDuration_s (= 1800, 30 นาที)`, (ข) ใช้ยาฟื้นทันที (ปุ่ม `[run.death.usePotion]`) เล่นต่อรับรางวัลต่อได้โดยไม่ต้องออก, (ค) ให้ Support ในทีมชุบ — `config: dungeons.death.supportReviveOnlyInsideSameDungeon (= true)` เกิดขึ้นอัตโนมัติเมื่อ Support กดชุบจากฝั่งเขา ไม่ใช่ปุ่มที่ผู้เล่นที่ตายกดเอง
4. ผู้เล่นยังอยู่ใน `S-03-run` ระหว่างรอฟื้น (ไม่ถูกเด้งออกเหมือน auto-retreat) เพราะ GDD ไม่มีปุ่มนอนพักแยก — ถ้าอยากออกจริงกดปุ่มออกเอง (4.7) ได้ตลอด

### 4.6 tick ที่ไม่ผ่าน movement gate

ไม่ใช่การลงโทษ เป็นแค่ผลลัพธ์ตรงไปตรงมาของกติกาเดียวที่ใช้ทั้งเกม (`config: dungeons.movementGate.minDistancePerWindow_m (= 50)` ต่อ `config: dungeons.movementGate.window_s (= 300)`):
- เมื่อครบรอบ tick ถ้าระยะสะสมไม่ถึงเกณฑ์ ขึ้น `[run.tickDenied]` เป็น toast สั้นจางกว่าโทนของ tick สำเร็จ ไม่ใช้สีแดงหรือไอคอนเตือนแบบ error (นี่ไม่ใช่ error) เนื้อหาบอกแค่ข้อเท็จจริง "เดินไม่พอ" ไม่มีคำต่อว่าหรือคำแนะนำเชิงสั่งสอน
- run ยังดำเนินต่อปกติ ไม่กระทบ HP ไม่กระทบสถานะ run state ไม่นับเป็นความผิดใด ๆ ใน trust score (เรื่อง trust score เป็นของ anti-cheat U7 ไม่ใช่ scope ของ tick ปกติที่เดินช้า)
- เกิดซ้ำได้หลายรอบติดกันโดยไม่มีเพดานการลงโทษเพิ่ม (เช่น นั่งพักยาว) จนกว่าจะออกนอก polygon จริงแล้วเข้า Grace/Suspended ตามปกติ

### 4.7 กดออกเอง

`config: dungeons.exit.manualExitAnytime (= true)` — ปุ่มออกอยู่ครึ่งล่างจอ `S-03-run` เสมอ ไม่ต้องเดินออกจาก polygon จริง:
1. กดปุ่ม → popup ยืนยันสั้นชั้นเดียว `[run.exitConfirmTitle]` / `[run.exitConfirmBody]` ปุ่ม `[run.exitConfirmButton]` / ยกเลิก (กันกดโดนตอนเดิน ไม่ใช่กันใจเปลี่ยน)
2. ยืนยัน → จบ run ทันที เก็บของที่ได้ครบ (เหมือน auto-retreat ไม่ใช่เหมือนตาย) `config: dungeons.exit.regenStartsOnExit (= true)` HP เริ่มฟื้นทันที → ไปหน้าสรุปผล (4.8)

### 4.8 สรุปผล run

`S-04-run-summary` เป็นทางออกเดียวของทุกเส้นทางใน Flow C (จบปกติที่ Ended, auto-retreat, ตายแล้วเลือกไม่ฟื้นแล้วออก, กดออกเอง, ปิดฉุกเฉินโดย moderator):
- หัวข้อบอกสาเหตุที่จบให้ชัด ไม่ใช้คำเดียวกันทุกกรณี: จบปกติ `[run.summary.completed]`, auto-retreat `[run.summary.autoRetreated]`, ตาย `[run.summary.died]`, ออกเอง `[run.summary.exited]`, ปิดฉุกเฉิน `[run.summary.closedByModerator]` (`config: dungeons.emergencyClose.proRatedRewardOnClose (= true)` — ได้รางวัลตามสัดส่วนเวลาที่อยู่จริง)
- รายการของที่ได้ทั้ง run `[run.summaryRewardList]` (ถ้าตาย = รายการว่างเสมอ เพื่อย้ำผลของ 4.5 ข้อ 1)
- ปุ่มเดียวเด่นสุดเต็มความกว้างครึ่งล่างจอ `[run.summaryContinue]` ("เดินต่อเพื่อรับเพิ่ม") → กลับ `S-01-map` เสมอ ไม่มีหน้าจอปลายทางอื่น (ตาม navigation shell ของ ia.md หัวข้อ 2)

## 5. Flow D — dungeon ไกล / นอกพื้นที่ / ไม่รู้ตำแหน่ง

ที่มา: pillars หัวข้อ 7 (สถานะที่บ้าน) และ ia.md หัวข้อ 4 เอกสารนี้เพิ่มลำดับขั้นเป็น flow ให้ชัดว่าเข้า-ออกจากสถานะเหล่านี้ตอนไหน `S-01-map` เป็นหน้าเดียวเสมอ เปลี่ยนแค่เนื้อหาแผงล่าง ประเมินสถานะใหม่ทุกครั้งที่เปิดแอปและทุกครั้งที่ตำแหน่งเปลี่ยนเกิน `config: unlocks.home.reevaluateDistance_m` (ยังไม่มีใน config ปัจจุบัน รอ P1-H03)

D1. ผู้เล่นอยู่ในพื้นที่เล่นแต่ dungeon ที่เปิดอยู่ใกล้สุดไกลกว่า `config: unlocks.home.farDungeonThreshold_m (= 2000 ม.)` → แผง `S-06-far-dungeon-panel` ทับแผนที่: ระยะจริง `[home.farBody]` ({distanceText}) ไม่หลอกว่าใกล้ ปุ่มเด่นสุด `[home.farNavigate]` ("นำทาง") ยังพาไปเดินจริงแม้ไกล ทางลัด `[home.farRoleInfoLink]` → `S-05-role-info` และ `[home.farProfileLink]` → `S-10-profile`
   ⤷ เงื่อนไข: dungeon ใกล้สุดจริง ๆ อยู่ในระยะ `farDungeonThreshold_m` แต่ปิดตามเวลาทำการทั้งหมด (ไกลชั่วคราว) → แผงเดียวกันแต่เพิ่ม `[home.farNextOpen]` ("เปิดอีกครั้ง {openTime}")
   ⤷ เงื่อนไข: ผู้เล่นเดินเข้าใกล้จนต่ำกว่า `farDungeonThreshold_m` → กลับสถานะ "ใกล้" แผงนี้หายไปเอง ไม่ต้องกดปิด

D2. ตำแหน่งอยู่นอกขอบเขตพื้นที่เล่น (เกิน `config: unlocks.home.outOfServiceAreaThreshold_m (= 20000 ม.)` จากพื้นที่เล่น หรือ back office กำหนดว่าอยู่นอกจังหวัดที่เปิด) → แผนที่ส่วนนั้นเป็นโซนดำมีเส้นแบ่งจังหวัด นำทางไม่ได้ แผง `S-07-out-of-area-panel`: กรอบ `[home.outOfAreaTitle]` ("ช่วยกันปลุกจังหวัดเรา") จำนวนคนลงทะเบียนต่อจังหวัด `[home.outOfAreaCount]` ปุ่มเด่นสุด `[home.outOfAreaCta]` ("ลงทะเบียนความสนใจ") → `S-09-interest-register` ทางลัดไป role-info และ profile เหมือน D1

D3. ปฏิเสธ consent location / ปฏิเสธ permission เบราว์เซอร์ / GPS ปิด / accuracy แย่กว่า `config: location.minAccuracy_m` ต่อเนื่อง (ยังไม่มีใน config ปัจจุบัน รอ P1-H03) → แผนที่กรุงเทพแบบไม่มีจุดตัวเอง ไม่มีระยะ แผง `S-08-unknown-location-panel`: ปุ่มเดียวเด่นสุด `[home.unknownCta]` ("ให้สิทธิ์ตำแหน่งอีกครั้ง") พากลับไปเริ่ม `S-00-consent-location` ใหม่ (ไม่ตื๊อ popup ซ้ำอัตโนมัติเอง) ทางลัดไป role-info, profile, และ **ลงทะเบียนความสนใจ** (`S-09-interest-register`) เหมือน D2 — นี่คือหน้าที่ผู้เล่นที่ปฏิเสธ consent ตั้งแต่ Flow A ขั้น 2 มาเจอ

D4. `S-09-interest-register`: เลือกจังหวัดจากรายการเท่านั้น (ไม่มีช่องพิมพ์) `[interest.selectProvince]` ปุ่ม `[interest.confirm]` → `[interest.confirmed]` ("จะแจ้งเตือนเมื่อ{provinceName}เปิด") ไม่มีของหรือรางวัลใดตอบแทนการลงทะเบียน (pillars 7.3 ข้อ 1) → กลับ `S-01-map` สถานะเดิม

กติกาข้ามสถานะ D1–D3 ที่ต้องคงไว้เสมอ: ดู avatar (`S-10-profile`), อ่าน role (`S-05-role-info`) เข้าถึงได้ทุกสถานะรวมถึงก่อนให้ consent เลย ไม่มีสถานะไหนใน Flow D ให้รางวัล ของ หรือ exp ใด ๆ โดยไม่ผ่าน movement gate (pillars 7.3)

## 6. Flow E — ปิด auto-retreat ในตั้งค่า (ฝังลึกโดยตั้งใจ)

ที่มา: GDD "auto-retreat 25% เปิดเป็น default และต้องเข้าไปปิดเองในหน้าตั้งค่าถึงจะปิดได้" + ia.md หัวข้อ 5 ข้อ 6 — เจตนาคือทำให้ปิดยากกว่าเปิด ไม่ใช่ทำให้หาไม่เจอเลย

E1. `S-22-settings` (หน้าแรกของตั้งค่า) — auto-retreat **ไม่ใช่ toggle เดี่ยวในหน้านี้** มีแค่รายการเมนู `[settings.walkingSafetyLink]` ("การเดินและความปลอดภัย") พาไปหน้าย่อย
E2. หน้าย่อย "การเดินและความปลอดภัย" แสดง toggle จริงพร้อมสถานะปัจจุบัน `[settings.autoRetreatToggleLabel]` ("ถอยอัตโนมัติ") ค่าเริ่มต้น = เปิดเสมอสำหรับบัญชีใหม่ (`config: dungeons.hpSafety.autoRetreatEnabledByDefault = true`)
   ⤷ เงื่อนไข: เปิด → ปิด (กดสวิตช์) → **popup ยืนยันบังคับ** `[settings.autoRetreatOffWarningTitle]` / `[settings.autoRetreatOffWarningBody]` (อธิบายผลตรงไปตรงมา: ถ้า HP ถึง 0 จะตายและของหายทั้งหมดตาม 4.5 ไม่ใช่แค่ "แน่ใจไหม") ปุ่ม `[settings.autoRetreatOffConfirm]` / `[settings.autoRetreatOffCancel]`
     ⤷ ยืนยัน → toggle เปลี่ยนเป็นปิดจริง มีป้ายเตือนค้างบนหน้า run (`S-03-run`) เล็ก ๆ ตลอดเวลาที่ปิดอยู่ (ไม่ใช่แค่ตอนตั้งค่า) เพื่อไม่ให้ผู้เล่นลืมว่าเปลี่ยนไว้
     ⤷ ยกเลิก → กลับสถานะเปิดเหมือนเดิม ไม่มีอะไรเปลี่ยน
   ⤷ เงื่อนไข: ปิด → เปิด → เปลี่ยนทันทีไม่ต้องยืนยัน (เปิดกลับคืนความปลอดภัย ไม่ต้องมีด่าน)
- เกณฑ์เดียวกันนี้ใช้กับตัวเลือกปรับ `config: economy.autoPotion.defaultThreshold_pct` ถ้า T17 ออกแบบให้ปรับได้ในหน้าเดียวกัน — แต่ **ไม่ต้องมี popup ยืนยัน** เพราะไม่ใช่การปิดระบบกันตายทั้งระบบเหมือน auto-retreat

## 7. ตารางสถานะที่ต้องมีทุกหน้า

นิยามสถานะทั้ง 8 ก่อนเข้าเนื้อหา: **empty** = ไม่มีข้อมูลให้แสดง (ไม่ใช่ error) · **loading** = กำลังรอข้อมูล · **GPS ปิด** = OS ปิด location service หรือปฏิเสธ permission ถาวร · **accuracy ต่ำ** = ได้พิกัดแต่แย่กว่า `config: location.minAccuracy_m` ต่อเนื่อง (รอ P1-H03) · **offline** = ไม่มีเน็ตแต่แอปเปิดอยู่หน้าจอ (ต่างจากหัวข้อ 8 ที่เป็นแอปถูกย่อ/ปิด) · **dungeon ปิด** = ปิดตามเวลาทำการหรือปิดฉุกเฉิน · **นอกระยะ** = ตำแหน่งจริงไม่ตรงกับที่คาดไว้สำหรับหน้านั้น (ความหมายต่างกันไปตามบริบทหน้า ดูหมายเหตุ) · **error** = ระบบขัดข้องทั่วไปที่ไม่เข้าเงื่อนไข 7 ข้อก่อนหน้า

| หน้า/กลุ่มหน้า | empty | loading | GPS ปิด | accuracy ต่ำ | offline | dungeon ปิด | นอกระยะ | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `S-00-*` onboarding | — (เนื้อหาคงที่) | spinner สั้นรอ native prompt/login callback | ไม่บล็อก ไปต่อ age/login ได้ก่อน แจ้งเตือนเบา ๆ ให้เปิด GPS ทีหลัง | ไม่กระทบ (ยังไม่ใช้ระยะจริง) | ทุกขั้นก่อน login ทำงาน offline ได้ (local only) · ขั้น login ต้องมีเน็ต `[account.loginOffline]` | — (ยังไม่เจอ dungeon) | — | `[account.loginError]` retry |
| `S-01-map` (บ้าน) | skeleton แผนที่เปล่า ไม่ใช้จอขาวว่าง | `[map.loading]` spinner ที่จุดตัวเองระหว่างรอ GPS fix แรก | → สถานะ "ไม่รู้ตำแหน่ง" (D3) ไอคอน GPS หัวจอกลางเปลี่ยนสี | → สถานะ "ไม่รู้ตำแหน่ง" เช่นกัน แต่ label ต่าง `[gps.lowAccuracy]` | tile ที่ cache ไว้แสดงได้ แต่จำนวนคน/สถานะ dungeon ไม่อัพเดต `[gps.offline]` banner เล็กมุมบน | รอยแยกที่ปิดแสดงจางกว่า ไม่ซ่อน (เห็นว่ามีแต่เข้าไม่ได้) | Flow D1 (ไกล) / D2 (นอกพื้นที่) | โหลดรายการ dungeon ไม่สำเร็จ `[common.error]` + ลองใหม่ |
| `S-02-dungeon-confirm` | ไม่มีคนใน dungeon → ไม่แสดงส่วนจำนวนคน/role เลย (ไม่ใช่เลข 0 ตัวโต) | ปุ่ม "เข้า" กลายเป็น spinner สั้นระหว่างรอ server ตอบ ปุ่ม disable กันกดซ้ำ | ป้องกันไม่ให้ popup เปิดถ้ายังไม่รู้ตำแหน่ง | เข้าเงื่อนไข "นอกระยะ" ด้านขวา | ปุ่ม "เข้า" ส่งคำขอไม่ได้ `[common.offlineRetry]` ไม่ auto-confirm | ดู B4 (หัวข้อ 3) | server ตรวจพบว่าตำแหน่งจริงไม่อยู่ใน polygon (GPS drift) `[dungeon.outOfRangeTitle]` ปิด popup กลับแผนที่ ไม่ลงโทษ | `[common.error]` ทั่วไป |
| `S-03-run` | ไม่มีคนอื่น → ไม่โชว์ `S-03a-nearby-party` เลย | spinner สั้นทับ HP bar ตอน resume หลังเปิดแอปกลับมา | เข้า Grace/Suspended ตาม 4.1 ไม่ใช่ error แยก | เช่นเดียวกับ GPS ปิด | ดูหัวข้อ 8 (เก็บ sample ในเครื่อง ไม่ตัด run) | moderator ปิดฉุกเฉิน → จบ run ทันทีแบบ pro-rated (4.8) | คือสถานะ Grace/Suspended/Ended เอง (4.1) | reward tick คำนวณผิดพลาดฝั่ง server `[common.error]` + log ให้ QA, run ไม่ถูกล้าง |
| `S-04-run-summary` | run จบโดยไม่มี tick เลย → รายการของว่าง ไม่มีคำตำหนิ | `[common.loading]` กำลังรวมผลจาก server | ไม่ apply | ไม่ apply | แสดงค่า cache ล่าสุดพร้อม label "กำลังรอยืนยันจาก server" ปุ่มเดินต่อยังกดได้ | ไม่ apply | ไม่ apply | โหลดผลไม่สำเร็จ → ลองใหม่ แต่ปุ่มกลับแผนที่ยังกดได้เสมอ |
| `S-06/07/08` (Flow D) | จำนวนคนลงทะเบียนจังหวัด = 0 → `[home.outOfAreaCount]` เป็น "ยังไม่มีใครลงทะเบียน" | กำลังคำนวณระยะหลัง GPS fix ใหม่ | คือสถานะ D3 เอง | คือสถานะ D3 เอง | ระยะที่แสดงเป็นค่าล่าสุดก่อนหลุด พร้อม timestamp | ปนอยู่ใน "ไกลชั่วคราว" ของ D1 | คือสถานะ D1/D2 เอง | โหลดรายชื่อ dungeon/จังหวัดไม่ได้ → ลองใหม่ |
| `S-09-interest-register` | รายชื่อจังหวัดว่าง (ไม่ควรเกิด แต่ถ้าเกิด) → ปุ่มยืนยัน disable พร้อมข้อความสั้น | โหลดรายชื่อจังหวัด | ไม่ apply | ไม่ apply | ส่งการลงทะเบียนไม่ได้ → คิวไว้ ส่งเมื่อกลับมาออนไลน์ label "รอส่ง" | ไม่ apply | ไม่ apply | ส่งไม่สำเร็จหลังมีเน็ต → ลองใหม่ |
| `S-22`–`S-24` ตั้งค่า/privacy/ลบบัญชี | ไม่ apply | โหลดสถานะ consent ปัจจุบัน | ไม่ apply (ปิด/เปิด toggle auto-retreat ไม่ต้องพึ่ง GPS) | ไม่ apply | เปลี่ยน toggle offline → คิวส่ง label "รอซิงค์" · **ลบบัญชีต้องมีเน็ตเสมอ** ปุ่มลบ disable พร้อมข้อความ ไม่ queue การลบแบบเงียบ | ไม่ apply | ไม่ apply | บันทึกไม่สำเร็จ → ลองใหม่ |

## 8. แอปถูกย่อ/ปิด และเน็ตหลุด ต่อ flow

ที่มา: GDD "สัญญาณขาดและแอปถูกปิด" — กฎใหญ่สองข้อที่ใช้ทุก flow: (1) เน็ตหลุดไม่เท่ากับเกมโอเวอร์ (2) ไม่มีหลักฐานว่าเดินจริง = ไม่มี reward เพิ่ม (ไม่ใช่ว่าโดนลงโทษ) v1 เป็นเว็บ จึงมีข้อจำกัดเพิ่มจาก browser ที่ native app (M8) จะไม่มี

- **Flow A (onboarding):** ถ้าแอปถูกย่อระหว่างรอ native permission prompt แล้วกลับมา ให้ประเมินผลจริงจาก permission state ของเบราว์เซอร์ ไม่ใช่ค้างจอ spinner ทับตลอดไป ถ้าถูกปิดแอป (ไม่ใช่แค่ย่อ) ก่อนถึงขั้น login ให้เริ่ม onboarding ใหม่ตั้งแต่ `S-00-intro` แต่ **ข้ามขั้นที่เคยให้ consent ไปแล้วจริง** (ไม่ถามซ้ำถ้า permission ยัง allowed อยู่จริงที่ระดับ OS) หลัง login สำเร็จ ความคืบหน้าผูกกับ account แล้ว ปิดแอปแล้วเปิดใหม่กลับเข้า `S-01-map` ตรง ๆ ไม่ต้องเลือกพลังซ้ำ
- **Flow B (confirm):** ถ้าย่อแอประหว่าง popup confirm ยังไม่กด "เข้า" กลับมาแล้ว popup ยังอยู่ (state เก็บที่ client เพราะยังไม่ส่งคำขอ) ถ้ากดเข้าไปแล้วเน็ตหลุดก่อนได้รับผลยืนยัน ให้ retry อัตโนมัติเมื่อเน็ตกลับมาโดยไม่ต้องกด "เข้า" ซ้ำ (กันเข้าซ้อนสอง dungeon)
- **Flow C (run) — จุดที่ต้องระวังที่สุด:**
  - **เน็ตหลุดขณะเดิน:** client เก็บ location sample ไว้ในเครื่องต่อ (ตาม GDD) ไม่หยุดนับ movement ทันที พอเน็ตกลับมา upload ให้ server validate ย้อนหลังได้ไม่เกิน `config: dungeons.offlineEvidence.maxOfflineEvidenceAge_s (= 1800, 30 นาที)` — จอแสดง `[gps.offline]` banner ที่ **ไม่ใช้คำว่า "หยุด" หรือ "เสีย"** เพราะ run ยังไม่ขาด เช่น "ออฟไลน์ — ระบบเก็บระยะไว้ให้"
  - **ล็อกหน้าจอ (v1 เว็บ):** browser ไม่ให้ background location → **หยุดนับ movement** ทันทีที่ล็อกจอ (ไม่ใช่ bug เป็นข้อจำกัดที่ตั้งใจของ v1 บนเว็บ) จอแสดงคำเตือนก่อนล็อกจอโดยผู้เล่นเองว่า "ปลดล็อกหน้าจอไว้ระหว่างเดินเพื่อให้นับระยะต่อ" ครั้งเดียวตอนเข้า run ครั้งแรก ไม่ใช่ทุกครั้ง (ไม่ใช่ tutorial ซ้ำซาก) — เมื่อขึ้น native (M8) ข้อจำกัดนี้หมดไป เอกสารนี้บันทึกไว้เป็น `[ASSUMPTION A-P1-F03-T16-2]`
  - **ปิดแอป (ไม่ใช่แค่ล็อกจอ):** หยุดเก็บ movement แต่ run ไม่ถูกลบ เข้า connection-lost ตามด้วย Grace/Suspended ปกติ (4.1) ถ้าเปิดแอปกลับมาทันใน `config: dungeons.runState.suspendedMax_s (= 900)` resume `S-03-run` ที่ HP/สถานะล่าสุดจาก server ทันที ไม่ต้องกด "เข้า" ใหม่
  - **หายไปเกิน `config: dungeons.offlineEvidence.connectionLostEndsRunAfter_s (= 900)`:** run จบอัตโนมัติ (Ended) สรุปรางวัลเท่าที่ validate ผ่านแล้วเท่านั้น **ไม่ริบของที่ได้ไปก่อนหน้า** เปิดแอปกลับมาเจอ `S-04-run-summary` ตรง ๆ ไม่ใช่ค้างที่แผนที่เฉย ๆ ให้งง
  - HP ต่ำ/auto-retreat/ตาย ที่เกิดขณะแอปอยู่เบื้องหลัง: ใช้ push notification เป็นช่องหลักแทนสั่น (สั่นทำงานไม่ได้ถ้าแอปไม่ foreground) เนื้อหา push ใช้ copy key เดียวกับ toast บนจอ ความยาวตัดตามเพดาน push (24 ช่องหัวข้อ, 64 ช่องเนื้อหา ตาม style guide 4.3)
- **Flow D (บ้าน):** เน็ตหลุดขณะอยู่หน้าใดหน้าหนึ่งใน D1–D4 ไม่กระทบอะไรมาก เพราะไม่มีการนับ movement ที่บ้าน แค่ค้างค่าระยะล่าสุดไว้พร้อม timestamp (ดูตารางหัวข้อ 7)
- **Flow E (ตั้งค่า):** เปลี่ยนค่าออฟไลน์ต้อง queue และแจ้งสถานะ "รอซิงค์" ชัดเจน ไม่ถือว่าบันทึกสำเร็จจนกว่า server ยืนยัน — สำคัญเพราะ auto-retreat toggle มีผลต่อความปลอดภัยจริง ห้ามให้ผู้เล่นคิดว่าปิดสำเร็จแล้วทั้งที่ยังไม่ซิงค์

## 9. รายการ copy key ทั้งหมด

ส่งต่อ `design/narrative/style-guide.md` และ P1-F03-T05 เป็นผู้เขียนถ้อยคำจริง ร่างไทยที่นี่เป็นแค่ข้อเสนอให้เข้าใจบริบท ไม่ใช่ final copy · `kind` และเพดานความยาวอ้างตาม style guide หัวข้อ 4.3 · ทุก key ผ่าน regex `^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$` ตามหัวข้อ 4.4

### 9.1 `onboarding.*`, `consent.*`, `age.*`, `account.*` (Flow A นาที 0–1)

| key | kind | บริบท | ร่างไทย (ตัวแปร) |
| --- | --- | --- | --- |
| `onboarding.intro` | message | `S-00-intro` จอแรกสุด | (กรุงเทพฯ กำลังมีปัญหา) |
| `onboarding.pickRoleTitle` | label | `S-00-class-select` หัวจอ | (เลือกพลังของคุณ) |
| `onboarding.pickRoleTanker` | label | การ์ด Tanker ผลสั้น 1 บรรทัด | (ยืนหน้า รับดาเมจแทนเพื่อน) |
| `onboarding.pickRoleRanged` | label | การ์ด Ranged | (โจมตีจากระยะ ได้ของเยอะขึ้น) |
| `onboarding.pickRoleSupport` | label | การ์ด Support | (ฮีลเพื่อน ชุบคนที่ล้ม) |
| `onboarding.pickRoleMagic` | label | การ์ด Magic | (เก่ง exp มีโล่กันดาเมจ) |
| `consent.locationTitle` | label | `S-00-consent-location` หัวจอ (แยกจาก consent อื่นเสมอ) | (ขอสิทธิ์เข้าถึงตำแหน่ง) |
| `consent.locationBody` | message | เหตุผลสั้น + อ้าง TTL เก็บ log | (ใช้หาตำแหน่งรอยแยกใกล้คุณ เก็บไว้ไม่เกิน {ttlText} เพื่อตรวจการเดินจริง) |
| `consent.locationAccept` | button | ปุ่มยอมรับ | (อนุญาต) |
| `consent.locationDecline` | button | ปุ่มปฏิเสธ | (ไม่อนุญาต) |
| `consent.browserPrimingTitle` | label | จอเกริ่นก่อน native prompt | (อีกขั้นเดียว) |
| `consent.browserPrimingBody` | message | อธิบายว่าเบราว์เซอร์จะถามจริง | (เบราว์เซอร์จะถามสิทธิ์ตำแหน่ง กด "อนุญาต" ที่ป๊อปอัปถัดไป) |
| `consent.browserPrimingContinue` | button | ปุ่มไปต่อ | (ไปต่อ) |
| `age.gateTitle` | label | `S-00-age-gate` หัวจอ | (ยืนยันอายุของคุณ) |
| `age.gateBody` | message | คำอธิบายสั้นก่อนตัวเลือกปีเกิด | (เกมนี้สำหรับอายุ {minAge} ปีขึ้นไป) |
| `age.underMinTitle` | label | กรณีต่ำกว่าเกณฑ์ | (ยังเข้าเล่นไม่ได้ตอนนี้) |
| `age.underMinBody` | message | อธิบายสั้น ไม่มีฟอร์มกรอก | (เกมนี้เปิดให้อายุ {minAge} ปีขึ้นไปก่อน) |
| `account.loginTitle` | label | `S-00-login` หัวจอ | (เข้าสู่ระบบเพื่อเริ่มเดิน) |
| `account.loginGoogle` | button | ปุ่ม Google | (เข้าสู่ระบบด้วย Google) |
| `account.loginApple` | button | ปุ่ม Apple | (เข้าสู่ระบบด้วย Apple) |
| `account.loginError` | message | login ล้มเหลว | (เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง) |
| `account.loginOffline` | message | ไม่มีเน็ตตอน login | (ต้องต่อเน็ตก่อนเข้าสู่ระบบ) |

### 9.2 `map.*`, `dungeon.*` (Flow A นาที 1–6, Flow B)

| key | kind | บริบท | ร่างไทย (ตัวแปร) |
| --- | --- | --- | --- |
| `map.nearestRiftFound` | message | `S-01-map` แผงล่าง สถานะ "ใกล้" | (พบรอยแยกใกล้คุณ — {distanceText} Lv.{levelMin}–{levelMax}) |
| `map.navigateButton` | button | ปุ่มเด่นสุดของแผง | (นำทาง) |
| `map.loading` | label | รอ GPS fix ครั้งแรก | (กำลังหาตำแหน่งของคุณ) |
| `dungeon.confirmTitle` | label | `S-02-dungeon-confirm` หัว popup | ({zoneName}) |
| `dungeon.confirmCount` | label | จำนวนคนตอนนี้ (ซ่อนถ้า 0) | (มี {count} คนอยู่ในนี้) |
| `dungeon.confirmRoles` | label | role ที่มี | ({roleList}) |
| `dungeon.confirmEnter` | button | ปุ่มหลัก | (เข้า) |
| `dungeon.confirmCancel` | button | ปุ่มรอง | (ยกเลิก) |
| `dungeon.confirmTutorialLine` | message | ทับจอ `S-03-run` ครั้งแรกในเกม | (เดินต่อไปเพื่อรับรางวัล) |
| `dungeon.overlapTitle` | label | กรณี polygon ซ้อน | (เลือกโซนที่จะเข้า) |
| `dungeon.vsBossTitle` | label | กรณีคร่อมวง raid | (มี raid บอสอยู่ที่นี่ด้วย) |
| `dungeon.closedTitle` | label | ปิดตามเวลา/ฉุกเฉิน | (ปิดอยู่ตอนนี้) |
| `dungeon.closedBody` | message | บอกเวลาเปิดถัดไป | (เปิดอีกครั้ง {openTime}) |
| `dungeon.outOfRangeTitle` | message | server พบว่ายังไม่ถึงจริง | (ยังไม่ถึงจริง เดินเข้าไปอีกนิด) |
| `dungeon.emergencyClosedTitle` | message | moderator ปิดฉุกเฉินระหว่างอยู่ข้างใน | (โซนนี้ปิดกะทันหัน ได้รางวัลตามเวลาที่อยู่จริง) |

### 9.3 `party.*`, `run.*` (Flow A นาที 6–10, Flow C — MF-1)

| key | kind | บริบท | ร่างไทย (ตัวแปร) |
| --- | --- | --- | --- |
| `party.foundTitle` | message | `S-03a-nearby-party` โผล่แบบไม่บล็อกจอ | (เจอผู้เล่นอีก {count} คน) |
| `party.foundRoles` | label | role ที่เจอ | ({roleList}) |
| `party.joinButton` | button | ปุ่มเข้าร่วม | (เข้าร่วม) |
| `party.buffApplied` | message | toast หลังเข้าร่วม | (ได้รับพลังจากเพื่อนทันที) |
| `run.stateGrace` | label | banner สถานะ Grace | (กำลังเช็คตำแหน่ง) |
| `run.stateSuspended` | label | banner สถานะ Suspended | (run หยุดชั่วคราว กลับเข้าเขตเพื่อเล่นต่อ) |
| `run.hpLow` | message (`beat: hpLow`) | HP ถึง `hpWarnPct` — **canon ห้ามแก้คำ** | (HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ) |
| `run.autoPotionUsed` | message | toast หลังใช้ยาอัตโนมัติ | (ใช้ยาอัตโนมัติ) |
| `run.autoRetreat` | message (`beat: autoRetreat`) | HP ถึง `autoRetreatPct` — **canon ห้ามแก้คำ ยกเว้นตัดบรรทัด** | (HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ) |
| `run.death` | message (`beat: death`) | HP ถึง 0 — **canon** | (คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย) |
| `run.death.alt1` | message | ทางเลือกที่ 2 ตาม style guide 3.4 | (ให้ narrative-designer เขียนตามหลักการ 3.2) |
| `run.death.alt2` | message | ทางเลือกที่ 3 | (ให้ narrative-designer เขียนตามหลักการ 3.2) |
| `run.death.usePotion` | button | ทางฟื้นทันที | (ใช้ยาฟื้น) |
| `run.tickGranted` | message | ได้ tick | (ได้ของจากการเดิน) |
| `run.tickDenied` | message | ไม่ผ่าน movement gate — โทนเป็นกลาง ไม่ใช่ error | (เดินไม่พอรอบนี้) |
| `run.continueCta` | button | ปิดท้าย tick แรก/สรุปผล | (เดินต่อเพื่อรับเพิ่ม) |
| `run.exitConfirmTitle` | label | popup ก่อนออกเอง | (ออกจาก dungeon ตอนนี้?) |
| `run.exitConfirmBody` | message | อธิบายผล (เก็บของครบ ต่างจากตาย) | (คุณจะได้ของที่เก็บมาครบ HP จะเริ่มฟื้นทันที) |
| `run.exitConfirmButton` | button | ปุ่มยืนยันออก | (ออกเลย) |
| `run.summary.completed` | label | หัวข้อสรุปผล — จบปกติ | (จบ run แล้ว) |
| `run.summary.autoRetreated` | label | หัวข้อสรุปผล — auto-retreat | (ถอยอัตโนมัติ) |
| `run.summary.died` | label | หัวข้อสรุปผล — ตาย | (คุณตาย) |
| `run.summary.exited` | label | หัวข้อสรุปผล — ออกเอง | (ออกจาก dungeon แล้ว) |
| `run.summary.closedByModerator` | label | หัวข้อสรุปผล — ปิดฉุกเฉิน | (โซนนี้ถูกปิดกะทันหัน) |
| `run.summaryRewardList` | label | หัวรายการของที่ได้ (รายการจริงเป็นข้อมูล ไม่ใช่ copy) | (ของที่ได้รับรอบนี้) |
| `run.summaryContinue` | button | ปุ่มเดียวเด่นสุด กลับแผนที่เสมอ | (เดินต่อเพื่อรับเพิ่ม) |

### 9.4 `home.*`, `interest.*`, `settings.*` (Flow D, Flow E)

| key | kind | บริบท | ร่างไทย (ตัวแปร) |
| --- | --- | --- | --- |
| `home.farBody` | message | `S-06-far-dungeon-panel` | (ใกล้สุดตอนนี้ {distanceText}) |
| `home.farNavigate` | button | ปุ่มเด่นสุด | (นำทาง) |
| `home.farNextOpen` | message | กรณีไกลชั่วคราว (ปิดตามเวลา) | (เปิดอีกครั้ง {openTime}) |
| `home.farRoleInfoLink` | label | ทางลัด | (role ทำอะไรบ้าง) |
| `home.farProfileLink` | label | ทางลัด | (ดูตัวละครของฉัน) |
| `home.outOfAreaTitle` | label | `S-07-out-of-area-panel` | (ช่วยกันปลุก{provinceName}) |
| `home.outOfAreaCount` | label | จำนวนคนลงทะเบียน | ({count} คนลงทะเบียนแล้ว) |
| `home.outOfAreaCta` | button | ปุ่มเด่นสุด | (ลงทะเบียนความสนใจ) |
| `home.unknownCta` | button | `S-08-unknown-location-panel` ปุ่มเดียว | (ให้สิทธิ์ตำแหน่งอีกครั้ง) |
| `interest.selectProvince` | label | `S-09-interest-register` | (เลือกจังหวัดของคุณ) |
| `interest.confirm` | button | ปุ่มยืนยัน | (ยืนยัน) |
| `interest.confirmed` | message | หลังยืนยัน | (จะแจ้งเตือนเมื่อ{provinceName}เปิด) |
| `settings.walkingSafetyLink` | label | เมนูใน `S-22-settings` | (การเดินและความปลอดภัย) |
| `settings.autoRetreatToggleLabel` | label | toggle จริง (ชื่อผู้เล่นเห็น) | (ถอยอัตโนมัติ) |
| `settings.autoRetreatOffWarningTitle` | label | popup ก่อนปิด | (ปิดถอยอัตโนมัติ?) |
| `settings.autoRetreatOffWarningBody` | message | อธิบายผลตรงไปตรงมา | (ถ้า HP ถึง 0 คุณจะตายและของใน run หายทั้งหมด ระบบจะไม่ดึงคุณกลับให้) |
| `settings.autoRetreatOffConfirm` | button | ปุ่มยืนยันปิด | (ปิดเลย) |
| `settings.autoRetreatOffCancel` | button | ปุ่มยกเลิก | (ไม่ปิด) |

### 9.5 `gps.*` — ประกาศให้ P1-F02-T10 ใช้ตรงกับ UI (N-7)

ชื่อ key กลุ่มนี้ใช้ตรงกับ state ของ `LocationProvider` (`packages/location`) เพื่อไม่ให้ gameplay-programmer ต้องเดาชื่อเอง — ผูก 1:1 กับ state enum ที่ P1-F02-T03/T05 นิยาม ถ้าชื่อ state ฝั่งโค้ดต่างจากนี้ ให้ tech-lead handoff กลับมาที่ uiux-designer แทนที่จะเปลี่ยนฝั่ง UI เงียบ ๆ

| key | kind | ใช้เมื่อไหร่ |
| --- | --- | --- |
| `gps.searching` | label | กำลังรอ GPS fix ครั้งแรกหรือ fix ใหม่หลัง resume |
| `gps.off` | label | OS ปิด location service ทั้งระบบ |
| `gps.denied` | label | ผู้เล่นปฏิเสธ permission ถาวร (ต้องไปตั้งค่า OS เอง) |
| `gps.lowAccuracy` | label | ได้พิกัดแต่แย่กว่า `config: location.minAccuracy_m` ต่อเนื่อง |
| `gps.offline` | label | ไม่มีเน็ตขณะแอปยัง foreground |
| `gps.restored` | label | กลับมาปกติหลังเคยเป็นสถานะข้างต้น (toast สั้นแล้วหาย) |

### 9.6 `common.*` — ใช้ร่วมหลายหน้า

| key | kind | บริบท | ร่างไทย |
| --- | --- | --- | --- |
| `common.loading` | label | รอข้อมูลทั่วไปที่ไม่มี key เฉพาะ | (กำลังโหลด) |
| `common.error` | message | error ทั่วไปที่ไม่เข้าเงื่อนไขเฉพาะ | (ขัดข้องชั่วคราว ลองใหม่อีกครั้ง) |
| `common.offlineRetry` | button | ปุ่มลองใหม่เมื่อเน็ตกลับมา | (ลองอีกครั้ง) |

`unit.m`, `unit.km` อ้างตาม style guide หัวข้อ 4.2 ไม่สร้างซ้ำในเอกสารนี้

## 10. สมมติฐานและคำถามค้าง

### สมมติฐาน
- A-P1-F03-T16-1: การใส่ consent location + permission เบราว์เซอร์ + อายุ 15+ + login เข้าไปในนาที 0–1 (ตามที่ board กำหนด) ทำให้ขั้นตอนก่อนเห็นแผนที่มี 6 จอย่อย (intro, consent, priming, age, login, class-select) แม้แต่ละจอสั้นมาก ความเสี่ยงคือรวมกันอาจเกินความรู้สึก "นาทีเดียว" ของผู้เล่นจริงโดยเฉพาะถ้า native permission prompt ของ OS ช้าหรือผู้เล่นลังเลตอน login — เอกสารนี้ออกแบบให้แต่ละจอมีจุดโฟกัสเดียวและปุ่มเดียวเพื่อลดเวลาให้สุด แต่ตัวเลขเวลาจริงต้องวัดจาก field walk (P1-F02-T20/T14) ไม่ใช่คาดเดา (ยืนยัน: game-director, product-manager ในการอ่านผล field walk)
- A-P1-F03-T16-2: v1 บนเว็บหยุดนับ movement ทันทีที่ล็อกหน้าจอ (ตาม GDD) เอกสารนี้เสนอให้มี "คำเตือนครั้งเดียว" ก่อนเข้า run ครั้งแรกของบัญชี ไม่ใช่ทุกครั้งที่เข้า run เพื่อไม่ให้เป็นการสอนซ้ำ (ขัดกับ pillars 6.2 ที่ห้ามมี tutorial ซ้ำซาก) — ยืนยัน: game-director, gameplay-programmer (ตรวจว่า implement ได้จริงว่า "ครั้งแรกของบัญชี" ไม่ใช่ "ครั้งแรกของ session")
- A-P1-F03-T16-3: `dungeon.confirmCount`/`party.foundTitle` ไม่แสดงเมื่อจำนวนคน = 0 (ซ่อนทั้ง element ไม่ใช่แสดงเลข 0) เพื่อไม่ให้ความรู้สึก "dungeon ร้าง" มาก่อนเดินถึงจริง — ยืนยัน: game-director, art-director (ผลต่อ layout ว่าง)
- A-P1-F03-T16-4: `run.death.alt1`/`run.death.alt2` และทางเลือกสำรองของ raid ล้มบอส/ตีบวกล้มเหลว (ตาม style guide 3.4) เป็นหน้าที่ของ narrative-designer เขียนคำจริงใน P1-F03-T05 เอกสารนี้กำหนดแค่ตำแหน่งที่ต้องมี 3 ทางเลือกต่อจังหวะอารมณ์สูง ไม่ได้เสนอถ้อยคำ (ยืนยัน: narrative-designer)
- A-P1-F03-T16-5: คีย์ config ที่ flow นี้อ้างถึงแต่ยังไม่มีในไฟล์ config ปัจจุบัน (รอ P1-H03 ซึ่ง status TODO ในบอร์ด ณ วันที่เขียนเอกสารนี้): `unlocks.parentalConsent`, `unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s`, `location.minAccuracy_m` — เอกสารนี้ใช้ชื่อ key ตามที่ pillars.md และ ia.md อ้างไว้แล้วเพื่อความสอดคล้อง ถ้า P1-H03 ตั้งชื่อจริงต่างจากนี้ ให้แก้เฉพาะชื่อ key ในเอกสารนี้และ copy bank ไม่ต้องออกแบบ flow ใหม่ (ยืนยัน: systems-designer)
- A-P1-F03-T16-6: เกณฑ์อายุขั้นต่ำ 15 ปียังไม่มี config key ใดเป็นเจ้าของ (ตรวจแล้วไม่มีใน `unlocks.json`, `dungeons.json`, หรือไฟล์อื่นใน `config/balance/`) เอกสารนี้เสนอชื่อ `privacy.minAge_yr` ให้อยู่ไฟล์เดียวกับ `privacy.positionLogTtl_s` ที่ P1-H03 กำลังสร้าง เพราะเป็นเรื่อง PDPA เดียวกัน (handoff ด้านล่าง)

### คำถามค้าง (ไม่ขวางงานถัดไป)
- Q-T16-1: `home.farBody`/`home.farNextOpen` ควรรวมเป็นข้อความเดียวหรือแยกบรรทัดเมื่อ dungeon ใกล้สุดทั้งไกลและปิดพร้อมกัน (ไกลถาวร + ปิดชั่วคราว) — เสนอแยก 2 บรรทัดให้ผู้เล่นแยกแยะสองเหตุผลได้ ส่งให้ T17 (wireframe) ทดสอบพื้นที่จอจริง
- Q-T16-2: `run.summaryRewardList` เมื่อ auto-retreat/exit-early ทำงานระหว่าง tick แรกยังไม่ครบ 5 นาที ควรแสดงข้อความ empty แบบไหน (เช่น "เดินไม่พอ ไม่ได้ของรอบนี้") หรือปล่อยว่างเฉย ๆ — ส่งให้ narrative-designer ตัดสินใน P1-F03-T05 เพื่อไม่ให้ซ้ำโทนกับ `run.tickDenied`

### Handoff สรุป (รายละเอียดเต็มอยู่ท้าย REPORT)
รายการ copy key ทั้งหมดในหัวข้อ 9 ส่งต่อ narrative-designer (P1-F03-T05) · ชื่อ key กลุ่ม `gps.*` (หัวข้อ 9.5) ประกาศให้ gameplay-programmer (P1-F02-T10) ใช้ตรงกัน · คีย์ config ที่ขาด (`unlocks.parentalConsent`, `unlocks.home.reevaluateDistance_m`, `privacy.positionLogTtl_s`, `location.minAccuracy_m`, และคีย์ใหม่ที่เสนอ `privacy.minAge_yr`) ส่งต่อ systems-designer (P1-H03)
