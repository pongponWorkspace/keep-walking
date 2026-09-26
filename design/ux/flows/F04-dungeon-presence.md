# Flow F04 — Dungeon Presence: แผนที่ → นำทาง → confirm → check-in → run state

Task: P2-F04-T15 · เจ้าของ: uiux-designer · สถานะ: ร่าง รอ P2-F04-T27 (game-director อนุมัติ flow core loop) และ design gate รวม F04+F05 (P2-F05-T18) · วันที่: 2026-09-26
แหล่งอ้างอิง: `design/features/F04-dungeon-presence.md` (P2-F04-T01, สเปกหลักที่ flow นี้แปลงเป็นจอ) · `design/ux/ia.md` (รหัสหน้าจอ, navigation shell, สถานะที่บ้าน) · `design/ux/flows/F03-core-loop.md` (ฐานเดิมของ layout header/popup/run screen — ดูหมายเหตุ override ด้านล่าง) · `design/ux/components.md`, `design/ux/tokens.json` · `art/direction/style-guide.md` (S1–S10) · `config/content/copy.th.json` (key ที่มีอยู่แล้ว) · D-089, D-064, D-072, D-079, A-3 (ระยะเส้นตรง+นำทาง), GD B-02 (speed lock), GD B-03 (check-in), GD N-04 (ซ่อนจำนวนคน)
ลำดับอำนาจ: GDD > pillars.md > `design/features/F04-dungeon-presence.md` > ia.md > เอกสารนี้ · ตัวเลขทุกตัวอ้างเป็น `config: <key>` เท่านั้น ค่าในวงเล็บหลัง `config:` เป็นค่าปัจจุบันเพื่ออ่านง่าย ห้ามลอกตัวเลขไปเขียนโค้ดตรงๆ

## หมายเหตุ override เหนือ F03-core-loop.md (สำคัญสำหรับ build ของ P2-F04-T21)

`F03-core-loop.md` เขียนก่อนคำตัดสิน D-089 / GD N-04 (Phase 2 ซ่อนจำนวนคนและ role ในทุกจุดที่เกี่ยวกับ dungeon ไม่มีข้อยกเว้น) เอกสารนี้เป็นตัวจริงสำหรับ build ของ Phase 2 ในส่วนที่ชนกัน:

1. **popup confirm (`S-02-dungeon-confirm`):** ไม่แสดง `dungeon.confirmCount` / `dungeon.confirmRoles` เลยไม่ว่าจำนวนคนจะเป็นเท่าไร (ต่างจาก F03 ที่ซ่อนเฉพาะตอน 0 คน) — ตำแหน่งที่จะแสดงเมื่อมี backend (Phase 3) อยู่หัวข้อ 3 ข้างล่าง (หมายเลขบรรทัดที่ต้องกลับมาเปิด)
2. **การ์ดซ้อน (B2, polygon ทับกัน):** เดิม `components.md` หัวข้อ 4 มีข้อยกเว้นให้โชว์ "0 คน" ตรงๆ เพื่อเทียบ 2 การ์ด (A-P1-F03-T16-3) — เอกสารนี้**ปิดข้อยกเว้นนั้นสำหรับ Phase 2** ตาม D-089 ที่ไม่มีข้อยกเว้น การ์ดซ้อนจึงโชว์แค่ชื่อโซน+ช่วงเลเวลเหมือนการ์ดเดี่ยว (ต้อง handoff ยืนยันกับ game-director/narrative-designer ก่อน design gate — ดูหัวข้อ 11)
3. **ป้ายรอยแยกบนแผนที่:** ไม่ใช้ `map.labelCount` / `map.labelCountOnly` / `map.labelRoleCount` ใน Phase 2 เลย ป้ายแสดงแค่ `{zoneName}` จาก content (ไม่ใช่ copy key เพราะเป็นข้อมูลต่อ dungeon)
4. **`S-03a-nearby-party`:** ไม่มีใน Phase 2 (out-of-scope ตาม `design/features/F04-dungeon-presence.md` หัวข้อ 6) เอกสารนี้จึงไม่กล่าวถึง — กลับมาใน F09/Phase 3
5. ส่วนที่ไม่ชนกัน (header bar, ปุ่ม, popup layout, drawer, จอพกกระเป๋า) ยังใช้ฐานจาก F03 + `components.md` ตามเดิม ไม่เขียนซ้ำในนี้ — HP bar และ reward-tick feedback แบบเต็มอยู่ใน flow F05 (P2-F06-T03) เอกสารนี้พูดถึงแค่ตำแหน่งที่ tick timer ต้องหยุด/เดินตาม run state

## สารบัญ
1. หลักการอ่าน flow นี้
2. Flow A — แผนที่: เห็นรอยแยก + นำทาง (A-3)
3. Flow B — เดินเข้าเขต → popup confirm
4. Flow C — Check-in: รอสัญญาณนิ่ง / เดินเข้ามาจากข้างนอก (GD B-03)
5. Flow D — Speed lock (overlay เต็มจอ, GD B-02)
6. Flow E — Run state: Active / Grace / Suspended / Ended + เตือนใกล้ปิด
7. Flow F — สรุปผล run ต่อ exit_reason
8. ตารางสถานะที่ต้องมีทุกจอ (empty, loading, GPS ปิด, accuracy ต่ำ, offline, dungeon ปิด, นอกระยะ, error)
9. แอปถูกย่อ/ปิด และเน็ตหลุด
10. รายการ copy key (ส่งต่อ P2-F04-T16)
11. สมมติฐานและคำถามค้าง

## 1. หลักการอ่าน flow นี้

โจทย์ตั้งต้น: ผู้เล่นเดินกลางแดดหรือฝนด้วยมือเดียว มองจอ 3 วินาทีแล้วเก็บมือถือกลับกระเป๋า ทุกขั้นในเอกสารนี้ต้องอ่านจบและกดถูกได้ในการมองสั้นๆ นั้น ไม่มีขั้นไหนบังคับอ่านย่อหน้ายาว

สัญลักษณ์ที่ใช้ (เหมือน F03 หัวข้อ 1): `→` กดปุ่ม/ระบบเปลี่ยนสถานะอัตโนมัติ · `⤷ เงื่อนไข:` จุดแตกสาขา · `S-xx-slug` รหัสหน้าจอจาก `ia.md` · `[copy.key]` ชื่อ copy key ตามด้วยร่างไทยในวงเล็บ (ของจริงเป็นหน้าที่ P2-F04-T16) · `config: <key>` ตัวเลข/เงื่อนไขอ้างชื่อ key เท่านั้น

กติกาที่ flow นี้ต้องเคารพเสมอ: ไม่มีช่องพิมพ์อิสระที่ไหนเลย · ไม่แสดงตำแหน่งหรือชื่อผู้เล่นคนอื่นแบบรายบุคคล (Phase 2 ไม่แสดงแม้แต่จำนวน) · ปุ่ม primary อยู่ครึ่งล่างจอ ขั้นต่ำ 48px · run state เปลี่ยนอัตโนมัติจากตำแหน่งเท่านั้น ไม่มีปุ่มให้ผู้เล่นสั่งเปลี่ยนสถานะเอง (ยกเว้นออกเอง) · ทุกจุดที่แสดงระยะต้องมีคำกำกับว่าเป็นเส้นตรง (R34) · ห้ามเอ่ยคำว่า anti-cheat/โกง/วิธีตรวจที่ใดในเกม (pillars 6.2 U7, R10, R23)

## 2. Flow A — แผนที่: เห็นรอยแยก + นำทาง (A-3, F04-R34..R39)

A1. ป้ายรอยแยกบนแผนที่ (`S-01-map` สถานะ "ใกล้"/"ไกล" ของ `ia.md` หัวข้อ 4): แสดงแค่ `{zoneName}` ไม่มีจำนวนคน (override หัวข้อบน) · ปิดตามเวลาทำการ → ป้ายแสดงจางกว่าปกติ `[map.riftClosed]` ("ปิดอยู่") แต่ไม่ซ่อน (เห็นว่ามีแต่เข้าไม่ได้ — เหมือนเดิมจาก F03 ตารางหัวข้อ 7)

A2. แตะป้าย/การ์ดแนะนำ → แผงรายละเอียดสั้น (ไม่ใช่หน้าใหม่ เป็นส่วนหนึ่งของแผงล่างที่มีอยู่แล้ว: สถานะ "ใกล้" ใน `S-01-map`, หรือ `S-06-far-dungeon-panel` เมื่อไกล) มีองค์ประกอบนี้เสมอ:
   - ชื่อโซน `[dungeon.confirmTitle]`
   - **ระยะเส้นตรง ปัดขึ้นเป็นขั้นตาม `config: unlocks.home.distanceDisplaySteps_m` พร้อมคำกำกับทุกครั้ง** (R34): ตัวเลข `{distanceText}` ต่อท้ายด้วย tag คงที่ `[nav.straightLineTag]` ("เส้นตรง") วางเป็นชิปเล็กติดกับตัวเลขเสมอ ทุกจุดที่แสดงระยะในเอกสารนี้ (แผงนี้, ป้ายแผนที่ระยะละเอียด, popup confirm) ใช้ชิปเดียวกัน ไม่ใช่คนละคำในแต่ละที่
   - **ทิศ:** ลูกศรหมุนตามองศาจากตำแหน่งผู้เล่นไปยังจุดที่ใกล้ขอบ polygon ที่สุด + ข้อความทิศกำกับ `[nav.directionLabel]` ("ทิศ{directionText}") — **ไม่วาดเส้นใดๆ จากผู้เล่นถึง dungeon บนแผนที่** (R36, กันเข้าใจผิดว่าเดินตัดแม่น้ำ/ทางด่วน/ทางรถไฟได้)
   - ช่วงเลเวล `[dungeon.confirmLevel]`
   - สถานะเวลาทำการ: เปิดอยู่ (ไม่ต้องมีข้อความเพิ่ม) หรือปิดอยู่ `[dungeon.closedTitle]` + เวลาเปิดถัดไป `[dungeon.closedBody]` — **ต้องอยู่เหนือปุ่มนำทางเสมอเมื่อปิด** (อ่านก่อนกดปุ่ม ตามที่ acceptance ของ T15 ระบุ)
   - ปุ่มเด่นสุดครึ่งล่างจอ `[map.navigateButton]` ("นำทาง") — กดได้แม้ปิดอยู่ (R38, dungeon ที่ปิดยังนำทางได้)

A3. กด "นำทาง" → เปิดแอปแผนที่ของเครื่อง (deep link) ด้วยปลายทาง = จุดสาธารณะของ dungeon เท่านั้น (ทางเข้าที่ปักไว้ ไม่มีก็ใช้จุดป้าย) โหมดเดินเท้า **ไม่มีตำแหน่งผู้เล่นใน URL ไม่มี API key หรือบริการคิดเงิน** (R37 — รูปแบบลิงก์จริงต่อระบบเป็นของ tech-lead ใน P2-F04-T14)
   ⤷ เงื่อนไข: เปิดแอปแผนที่สำเร็จ → ออกจากเว็บแอปไปแอปนำทางภายนอก ไม่มีอะไรต้องทำต่อในเกม
   ⤷ เงื่อนไข: deep link ใช้ไม่ได้ (browser/OS ไม่รองรับ หรือไม่มีแอปแผนที่ติดตั้ง) → **fallback**: แผง `[nav.fallbackTitle]` ("เปิดแอปนำทางไม่ได้") แสดงชื่อสถานที่ปลายทางเต็ม + ปุ่ม `[nav.fallbackCopyButton]` ("คัดลอกชื่อ") → คัดลอกไปคลิปบอร์ด แสดง `[nav.fallbackCopied]` ("คัดลอกแล้ว") สั้นๆ แล้วปิดแผงเอง

A4. **ไม่มีเส้นทางหรือเส้นตรงใดบนแผนที่ในแอปเลย** (R36, R39) — แผนที่หลักยังเป็น static tile เดิม ไม่มี polyline/animation ต่อเนื่องเพิ่ม (pillars P4, style-guide 9.3)

A5. เดินเข้าใกล้จนถึงขอบ polygon → ไป Flow B ขั้น B1 (แผงนี้ใช้ร่วมกับสถานะ "ไกล"/"ใกล้" ของ `ia.md` หัวข้อ 4 ทั้งหมด ไม่เขียน state "นอกพื้นที่"/"ไม่รู้ตำแหน่ง" ซ้ำในนี้ อยู่ใน `ia.md` และ `F03-core-loop.md` Flow D อยู่แล้วและไม่เปลี่ยนในเอกสารนี้)

## 3. Flow B — เดินเข้าเขต → popup confirm (F04-R01..R06)

ใช้ popup เดียวกันทุกครั้งไม่ว่าจะเป็นครั้งแรกในเกมหรือเล่นมานานแล้ว `config: dungeons.entry.confirmPopupRequired (=true)` — ไม่มีทางเข้า dungeon โดยไม่เจอ popup นี้และกด "เข้า" เอง ไม่มีการเข้าอัตโนมัติ (R02)

B1. เดินถึงขอบ polygon ของ dungeon ที่เปิดอยู่ → `S-02-dungeon-confirm` เปิดเป็น popup ทันที ไม่ต้องกดปุ่มเปิดเอง เนื้อหา (**override หัวข้อบน — ไม่มีบรรทัดจำนวนคน/role เลย**):
   - ชื่อโซน `[dungeon.confirmTitle]` ({zoneName})
   - ช่วงเลเวล `[dungeon.confirmLevel]` (ไม่บล็อกการเข้า ตาม R32)
   - สถานะ check-in (disable/enable ปุ่ม "เข้า" — รายละเอียดเต็มอยู่ Flow C)
   - ปุ่ม `[dungeon.confirmEnter]` ("เข้า") เด่นสุดครึ่งล่างจอ และ `[dungeon.confirmCancel]` ("ยกเลิก")
   - **ตำแหน่งที่จะแสดงจำนวนคน/role เมื่อมี backend (Phase 3):** บรรทัดใต้ช่วงเลเวล ก่อนสถานะ check-in — เตรียมพื้นที่ไว้ในเลย์เอาต์แต่ไม่ render ใน Phase 2 (`design/features/F04-dungeon-presence.md` ข้อ R05 เงื่อนไข)
   ⤷ เงื่อนไข: กด "ยกเลิก" → ปิด popup กลับ `S-01-map` ไม่มีผลใด (R06) เปิดใหม่ได้ตลอดที่ยังอยู่ในเขต (ปุ่มเปิดบนแผนที่)
   ⤷ เงื่อนไข: กด "เข้า" และ check-in ผ่านครบ (Flow C) → engine ตรวจเวลาทำการ + `maxActiveDungeonsPerPlayer` (R01) → ไป Flow E (Active) หรือ B4/B6 แล้วแต่ผล

B2. **Polygon ซ้อนกัน** (R03): `S-02-dungeon-confirm` แสดง 2+ การ์ดให้เลือกแทนการ์ดเดียว แต่ละการ์ดมี **ชื่อโซน + ช่วงเลเวลเท่านั้น** (ปิดข้อยกเว้น "0 คน" เดิมของ F03 ตาม override ข้อ 2 ด้านบน) `[dungeon.overlapTitle]` ("เลือกโซนที่จะเข้า") ผู้เล่นแตะการ์ดที่ต้องการก่อนปุ่ม "เข้า" จึงใช้งานได้ (`.btn-disabled` จนกว่าจะเลือก) — เข้าแล้ว polygon ของ run = อันที่เลือกเท่านั้น เดินเข้า polygon อื่นที่ซ้อนกันระหว่าง run ไม่มีผล (R03, R04)

B3. **ใกล้ปิด** (R28): ถ้าเหลือเวลาถึงปิด ≤ `config: dungeons.openingHours.closingSoonNotice_s` popup แสดงบรรทัดเพิ่ม `[dungeon.closingSoonTag]` ("จะปิดในอีก {timeLeft}") ใต้ช่วงเลเวล **ยังกด "เข้า" ได้ ไม่บล็อก** (ไม่ใช่เหตุผลปฏิเสธ check-in)

B4. **dungeon ปิดอยู่** (นอกเวลาทำการ หรือปิดฉุกเฉิน, R27): แทนที่จะเปิด popup ปกติ ขึ้น `[dungeon.closedTitle]` ("ปิดอยู่ตอนนี้") + เวลาเปิดถัดไป `[dungeon.closedBody]` ("เปิดอีกที {openTime}") หรือถ้าปิดฉุกเฉินยังไม่มีเวลาเปิด `[dungeon.closedEmergencyBody]` — **ไม่มีปุ่ม "เข้า" ให้กด** มีแค่ `[dungeon.closedDismiss]` ("กลับแผนที่") — เกิดได้ทั้งตอนเดินเข้าเขตครั้งแรก (แทน B1) และตอนกด "เข้า" แล้ว engine ปฏิเสธ (แทนผลของ B1)

B5. **นอกระยะ** (GPS drift ที่ขอบ, sample ล่าสุดไม่อยู่ใน polygon จริง): `[dungeon.outOfRangeTitle]` ("GPS ยังไม่เชื่อว่าคุณถึงแล้ว เดินลึกเข้าไปอีกหน่อย") ปุ่มเดียว `[common.close]` → ปิด popup กลับแผนที่ **ไม่ลงโทษ**

B6. **เกิน `maxActiveDungeonsPerPlayer`** (มี run อยู่แล้วที่อื่น, R01): `[dungeon.alreadyActive]` ("ยังอยู่ใน dungeon อื่น ออกจากที่นั่นก่อน") — ไม่ควรเกิดจริงเพราะ client บล็อกไม่ให้เห็น popup ใหม่ระหว่างมี run อยู่แล้ว (R04) แต่เผื่อกรณี race condition ต้องมีข้อความรองรับ

หมายเหตุ: **ไม่มี Flow B3-เดิม (คร่อมวง raid boss) ในเอกสารนี้** — raid และการเลือกระหว่าง dungeon กับ boss อยู่นอกขอบเขต Phase 2 ทั้งหมด (`design/features/F04-dungeon-presence.md` หัวข้อ 6, F16–F17)

## 4. Flow C — Check-in: รอสัญญาณนิ่ง / เดินเข้ามาจากข้างนอก (F04-R07..R11, GD B-03)

ที่มา: GDD "Anti-cheat > มาตรการเป็นชั้น" ชั้น 1 — **ห้ามเอ่ยคำว่า anti-cheat/โกง/วิธีตรวจที่ใดในถ้อยคำ** (R10) ทุกข้อความในหัวข้อนี้พูดถึงแค่ "สัญญาณ GPS" และ "การเดินเข้าเขต" เท่านั้น

ตอนกด "เข้า" ใน B1/B2 engine ประเมิน check-in จาก sample ก่อนหน้าทันที ปุ่ม "เข้า" **ยังคงเห็นอยู่ในจอเดิม** (ไม่ปิด popup ไม่เปิด popup ใหม่) แต่เปลี่ยนเป็น `.btn-disabled` พร้อมสถานะหนึ่งบรรทัดใต้ปุ่มตราบใดที่ยังไม่ผ่าน (R09) ปุ่มเปิดใช้เองอัตโนมัติทันทีที่เงื่อนไขครบ **ไม่ต้องกดอะไรเพิ่มหรือปิดเปิด popup ใหม่**

ลำดับความสำคัญของเหตุผล (R08 — แสดงทีละหมวดเดียว หมวดที่มาก่อนบังมาที่หลังเสมอแม้จะเข้าเงื่อนไขพร้อมกัน):

| ลำดับ | เหตุผล | ข้อความใต้ปุ่ม | รายละเอียดจอ |
| --- | --- | --- | --- |
| 1 | `speed_lock` | `[dungeon.checkinSpeedLocked]` ("เพิ่งเร็วเกินเดินอยู่ช่วงที่ผ่านมา ลองเดินเข้าใหม่อีกครั้ง") | ไม่มี countdown เพราะเวลาที่ต้องรอขึ้นกับการเดินจริงต่อจากนี้ |
| 2 | `poor_accuracy` | `[dungeon.checkinPoorAccuracy]` ("สัญญาณ GPS ไม่แม่นพอ ลองออกที่โล่ง") | ใช้ icon เดียวกับ `gps.lowAccuracy` (คนละ key เพราะบริบทต่างหน้า) |
| 3 | `not_enough_trace` | `[dungeon.checkinNotEnoughTrace]` ("กำลังนับเวลาที่เดินต่อเนื่อง อีก {countdown}") | **มี countdown mm:ss เป็น widget ตัวเลขสดนับถอยหลังถึง `config: anticheat.checkIn.minContinuousApproach_s`** — ตัวเลขจริงมาจาก engine ไม่ใช่ client ประมาณเอง |
| 4 | `no_approach_from_outside` | `[dungeon.checkinNoApproach]` ("ต้องเดินเข้ามาจากนอกเขต ลองเดินออกแล้วกลับเข้ามา") | ไม่มี countdown (ขึ้นกับผู้เล่นเดินออกจริง) |

เมื่อครบทุกเงื่อนไข (ไม่มีเหตุผลเหลือ) → ปุ่ม "เข้า" กลับเป็น `.btn-primary` ปกติทันที ไม่มีข้อความ "พร้อมแล้ว" คั่นกลาง (ลดจังหวะอ่านเพิ่ม)

**กรณีเปิดแอปครั้งแรกขณะยืนกลางสวน (E4 ของสเปก):** เจอ `no_approach_from_outside` เสมอ (ต้องมี sample นอก polygon มาก่อนในลำดับต่อเนื่อง) ไม่ใช่บั๊ก — ข้อความชวนเดินออกแล้วกลับเข้ามาโดยไม่ลงโทษ

## 5. Flow D — Speed lock (overlay เต็มจอ, F04-R20..R24, GD B-02)

ที่มา: GDD "ความปลอดภัยทางกายภาพ" ชั้น 1 — ล็อกการเล่นทันทีเมื่อความเร็วเกิน `config: anticheat.speedLock.speedLock_kmh` ต่อเนื่อง `config: anticheat.speedLock.lockSustained_s`

D1. เข้าสถานะ lock (ทุกสถานะยกเว้น Ended, T11 ของสเปก) → **overlay เต็มจอทับทุกอย่าง** (แผนที่, popup confirm, จอ run รวมจอพกกระเป๋า):
   - พื้นเกือบดำ (`ink.900`) ไม่มี animation ต่อเนื่อง (เหมือนจอพกกระเป๋า)
   - ข้อความบรรทัดเดียว `[anticheat.speedLockTitle]` ("เร็วเกินเดิน ระบบล็อกไว้ก่อน") + `[anticheat.speedLockBody]` ("จะปลดเองเมื่อกลับมาเดินความเร็วปกติ") — **ไม่อธิบายวิธีวัดหรือเอ่ยคำว่า anti-cheat** (R23, U7)
   - **ไม่มีปุ่มที่ชวนเล่นต่อ** มีแค่ 2 ปุ่มขนาดปกติ: `[settings.walkingSafetyLink]`-style ลิงก์ตั้งค่า (ไปที่ `S-22-settings`) และ `[run.exitButton]` ("ออก" — เข้า flow ยืนยันออกเดิมของ Flow F ถ้าอยู่ระหว่าง run, ถ้ายังไม่เข้า run ปุ่มนี้แค่ปิด overlay กลับแผนที่)
   - สั่นหนึ่งครั้งตอนเข้า lock ไม่มีเสียงวนซ้ำ (R23)
D2. ระหว่าง lock: reward tick clock หยุด ระยะไม่นับ ไม่มีการทอย damage (R21) · **ไม่เปิด popup confirm** และ check-in ไม่ผ่านถ้ากด "เข้า" ระหว่างนี้ (ครอบ Flow B/C ทั้งหมด — overlay นี้บังทุกอย่างไว้ก่อน)
D3. ปลด lock เอง เมื่อความเร็วต่ำกว่าเกณฑ์ต่อเนื่อง `config: anticheat.speedLock.unlockSustained_s` (R22) → overlay หายเอง กลับสู่จอเดิมตามสถานะตำแหน่งจริง (แผนที่/popup/run) **ไม่ต้องกดอะไร**
D4. event `anticheat_speed_lock_triggered` ยิงทั้งตอนเข้าและออก lock (P2-F04-T17 เป็นผู้กำหนด payload) — ไม่กระทบ UI ของหัวข้อนี้โดยตรง

## 6. Flow E — Run state: Active / Grace / Suspended / Ended + เตือนใกล้ปิด (F04-R12..R19, R28..R30)

`S-03-run` เป็น idle screen เหมือนเดิม (มือถือเก็บกระเป๋าได้, จอพกกระเป๋าตาม `components.md` หัวข้อ 12 ไม่เปลี่ยนในเอกสารนี้) องค์ประกอบใหม่ของ Phase 2 คือ **run-state pill** เล็กในแถบใต้ header (คงที่ทุกสถานะ ไม่ใช่แค่ตอนมีปัญหา) เพื่อให้ 4 สถานะต่างกันชัดโดยไม่ต้องอ่านตัวเลข (ตาม acceptance ของ T15): ไอคอน + คำ + สีขอบ (ไม่ใช้สีอย่างเดียว, style-guide S4)

| สถานะ | run-state pill (ไอคอน+คำ) | tick timer | banner เพิ่ม | ผู้เล่นเห็นอะไร |
| --- | --- | --- | --- | --- |
| **Active** | ● เขียว `[run.stateActiveLabel]` ("กำลังเล่น") | เดินนับถอยหลังปกติ `[run.tickTimer]` | ไม่มี | จอปกติ ไม่มีอะไรน่ากังวล |
| **Grace** | ◐ เหลืองอำพัน `[run.stateGrace]` ("กำลังยืนยันตำแหน่ง") | **หยุดนับ** เปลี่ยนเป็น `[run.tickPausedLabel]` ("หยุดนับชั่วคราว") แทนตัวเลข | `banner.info` เล็กไม่บล็อกจอ | ไม่ตกใจ (แค่ GPS drift ปกติ, ≤ `config: dungeons.runState.graceMax_s`) |
| **Suspended** | ■ แดง `[run.stateSuspendedLabel]` ("หยุดชั่วคราว") | ยังเป็น `[run.tickPausedLabel]` | `banner.warn` เต็มความกว้าง ค้างตลอดสถานะ `[run.stateSuspended]` ("run หยุดชั่วคราว กลับเข้าเขตภายใน {timeLeft}") | ยังไม่จบ run ออกไปซื้อน้ำ/เข้าห้องน้ำได้ (≤ `config: dungeons.runState.suspendedMax_s`) |
| **Ended** | — (ออกจากจอ run ทันที) | — | — | ไปหน้าสรุปผลอัตโนมัติ (Flow F) ไม่ใช่จอ run |

กลับจาก Grace/Suspended เป็น Active (T8): pill กลับเป็นเขียว + toast สั้น `[run.stateResumed]` ("กลับเข้าเขตแล้ว") นาฬิกา tick เดินต่อจากเดิม **ไม่รีเซ็ต** (R13)

**เตือนใกล้ปิด ระหว่าง run** (R29): เมื่อเหลือเวลาถึงปิดเท่ากับ `config: dungeons.openingHours.closingSoonNotice_s` แจ้งครั้งเดียว: สั่น 1 ครั้ง + `banner.warn` `[run.closingSoonWarning]` ("จะปิดในอีก {timeLeft} เดินเก็บของให้ครบก่อนได้") ค้างจนกว่าจะปิดจริงหรือผู้เล่นออกเอง — ใช้ร่วมกับ pill สถานะเดิมได้ (ไม่ทับกัน วางคนละตำแหน่ง)

**ปิดทำการระหว่าง run** (R30, E11, E12): ไม่ว่าอยู่สถานะใด (รวม Suspended) → run จบด้วย `dungeon_closed` ทันที ไม่รอ timeout ของเก็บครบ tick ที่ค้างจ่ายตามกฎ D-059 ไม่มีการเตะแบบลงโทษและไม่ต้องเดินออกเพื่อจบ → ไป Flow F

**ไม่มีปุ่มให้ผู้เล่นเปลี่ยน run state เอง** (R19) นอกจากปุ่มออกเอง (`[run.exitButton]`, ครึ่งล่างจอเสมอ → popup ยืนยัน `[run.exitConfirmTitle]`/`[run.exitConfirmBody]`/`[run.exitConfirmButton]`/`[run.exitConfirmCancel]` เหมือน F03 หัวข้อ 4.7 ไม่เปลี่ยน)

## 7. Flow F — สรุปผล run ต่อ exit_reason (F04-R17, R18, E10, E11)

`S-04-run-summary` เป็นทางออกเดียวของทุกเส้นทางใน Flow นี้ หัวข้อบอกสาเหตุที่จบให้ชัด ไม่ใช้คำเดียวกันทุกกรณี ของที่เก็บได้แสดงเสมอ (ไม่หายจากการจบ run เอง — หายเฉพาะกรณีตายซึ่งเป็นกลไกของ F06) รายละเอียดกลไก HP/auto-retreat/ตาย อยู่ใน spec F06 เอกสารนี้ระบุแค่ **หัวข้อจอสรุปที่ต้องมีให้ครบทุก `exit_reason`** ของ F04:

| `exit_reason` | หัวข้อจอสรุป (copy key) | ของที่เก็บได้ | หมายเหตุ |
| --- | --- | --- | --- |
| `manual_exit` (R17, กดออกเอง) | `[run.summary.exited]` ("ออกเอง ของอยู่ครบ") | ครบ | เหมือน F03 หัวข้อ 4.7 ไม่เปลี่ยน |
| `dungeon_closed` (R17, R30 — ถึงเวลาปิดระหว่าง run) | **ใหม่** `[run.summary.dungeonClosed]` ("โซนปิดแล้ว ของอยู่ครบ") | ครบ (tick ค้างจ่ายตาม D-059) | ต่างจาก `emergency_close` ของ moderator (คนละเหตุ คนละหัวข้อ) — ไม่ต้องเดินออกเพื่อจบ ไม่ใช่การลงโทษ |
| `timeout` (R17, R18 — เวลานอกเกิน `suspendedMax_s`) | เสนอใช้ซ้ำ `[run.summary.connectionLost]` ("หายไปนาน run จบแล้ว") + `[run.summary.connectionLostBody]` | ครบเท่าที่ยืนยันได้ (ระยะช่วงที่ไม่มีหลักฐานไม่นับ ตาม F05-R06) | เวลาจบ = จุดเริ่มของการออก + `suspendedMax_s` (R18) เปิดแอปกลับมาเจอหน้านี้ตรงๆ ไม่ใช่จอ run — **ชื่อ key เดิมอ้างอิง config ที่อาจเปลี่ยนชื่อ ดู handoff หัวข้อ 11** |
| `death` (F06) | `[run.summary.died]` ("คุณตาย ของหายหมด") | ว่างเสมอ | รายละเอียดเต็มเป็นของ spec/flow F06 |
| `auto_retreat` (F06) | `[run.summary.autoRetreated]` ("ถอยอัตโนมัติ ของอยู่ครบ") | ครบ | รายละเอียดเต็มเป็นของ spec/flow F06 |
| `clock_invalid` (E10 — นาฬิกาเครื่องเพี้ยน/ถูกตั้งย้อน) | **ใหม่** `[run.summary.clockInvalid]` ("เวลาที่เครื่องเพี้ยน run จบแล้ว ของอยู่ครบ") | ครบ (ไม่ริบของเดิม) | จบ ณ เวลาเหตุการณ์ล่าสุดที่ตรวจได้ ไม่มี tick เพิ่มจากเวลาที่ตรวจไม่ได้ |
| `emergency_close` (มีใน engine ตาม D-059 แต่ไม่มีทางเรียกนอก test ใน Phase 2) | `[run.summary.closedByModerator]` ("โซนปิดกะทันหัน") | ครบตามสัดส่วนเวลาที่อยู่จริง (D-059) | ไม่ปรากฏจากการเล่นจริงใน Phase 2 (หลังบ้านยังไม่มี) แต่ component ต้องรองรับไว้เพราะ engine มี state นี้ (ใช้ทดสอบผ่าน test hooks) |

ปุ่มเดียวเด่นสุดเต็มความกว้างครึ่งล่างจอทุกกรณี `[run.summaryContinue]` ("เดินต่อเพื่อรับเพิ่ม") → กลับ `S-01-map` เสมอ ไม่มีหน้าจอปลายทางอื่น (เหมือน F03 หัวข้อ 4.8 ไม่เปลี่ยน)

## 8. ตารางสถานะที่ต้องมีทุกจอ

นิยามสถานะเหมือน F03 หัวข้อ 7 ตารางนี้ครอบเฉพาะจอของ F04 (แผนที่/นำทาง, popup confirm, check-in, speed lock, run state) — จอ home 4 สถานะ (ใกล้/ไกล/นอกพื้นที่/ไม่รู้ตำแหน่ง) อยู่ใน `ia.md` หัวข้อ 4 และ `F03-core-loop.md` Flow D ไม่เขียนซ้ำ

| จอ | empty | loading | GPS ปิด | accuracy ต่ำ | offline | dungeon ปิด | นอกระยะ | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| แผงระยะ+นำทาง (A2) | — (ไม่มีจำนวนคนให้ว่าง) | skeleton ตัวเลขระยะ + spinner สั้นรอ GPS fix | ไม่แสดงระยะ/ทิศ กลับสู่สถานะ "ไม่รู้ตำแหน่ง" ของ `ia.md` | ระยะ/ทิศแสดงแบบ "ประมาณ" (ดูหมายเหตุ N-02 ใน board) แทนตัวเลขนิ่ง | ใช้ค่า cache ล่าสุด + `[common.lastUpdated]` ({timeAgo}) | เวลาเปิดถัดไปแสดงก่อนปุ่มนำทาง (A2) ปุ่มนำทางยังกดได้ | ปุ่มนำทางยังกดได้เสมอ (ไม่ใช่ concept ของแผงนี้) | `[common.error]` + `[common.retry]` |
| `S-02-dungeon-confirm` (Flow B) | ไม่มีบรรทัดจำนวนคนอยู่แล้ว (override) | ปุ่ม "เข้า" กลายเป็น spinner สั้นรอ engine ตอบ ปุ่ม disable กันกดซ้ำ | ป้องกันไม่ให้ popup เปิดถ้ายังไม่รู้ตำแหน่ง (ย้อนไป `ia.md` D3) | เข้าเงื่อนไข check-in `poor_accuracy` (Flow C) ไม่ใช่ state แยก | ปุ่ม "เข้า" ส่งคำขอไม่ได้ `[common.offlineNotice]` + `[common.offlineRetry]` **ไม่ auto-confirm** | ดู B4 | ดู B5 | `[common.error]` ทั่วไป |
| Check-in (Flow C) | — | ปุ่ม "เข้า" disable ระหว่างรอผลประเมินแรก (สั้นมาก ไม่มี copy แยก) | ไม่ควรเกิด (popup ไม่เปิดถ้าไม่รู้ตำแหน่ง) | → `poor_accuracy` (ลำดับ 2) | request check-in ไม่สำเร็จ → ปุ่ม "เข้า" ค้าง disable พร้อม `[common.offlineNotice]` | — | → `no_approach_from_outside` (ลำดับ 4) | `[common.error]` + log ให้ QA |
| Speed lock overlay (Flow D) | — | — | ไม่เกี่ยวข้อง (ล็อกจากความเร็วไม่ใช่ตำแหน่ง) | ไม่เกี่ยวข้อง | คำนวณความเร็วจาก sample ในเครื่องได้โดยไม่ต้องมีเน็ต (Phase 2 ไม่มี server) | ไม่เกี่ยวข้อง | ไม่เกี่ยวข้อง | ไม่เกี่ยวข้อง |
| `S-03-run` run state (Flow E) | ไม่มีคนอื่นอยู่แล้ว (Nearby Party ไม่มีใน Phase 2) | spinner สั้นทับ tick timer ตอน resume หลังเปิดแอปกลับมา | เข้า Grace/Suspended ตาม Flow E ไม่ใช่ error แยก (เหมือน accuracy ต่ำ) | เข้า Grace/Suspended เช่นกัน (ไม่มีหลักฐานว่าอยู่ใน ตามนิยามสเปกหัวข้อ 3.3) | `[gps.offlineInRun]` banner (ไม่กระทบ run state, Phase 2 ไม่มี server ให้หลุด) | จบด้วย `dungeon_closed` ทันที (R30) → Flow F | คือ Grace/Suspended เอง | `[common.error]` + log ให้ QA run ไม่ถูกล้าง |

## 9. แอปถูกย่อ/ปิด และเน็ตหลุด

- **หน้าเว็บถูกซ่อน (visibility hidden) / จอล็อกเอง / แอปถูกปิด แล้วเปิดใหม่** (E7 ของสเปก): sample หยุดเก็บ → นับเป็น "ไม่มีหลักฐาน" ตามนิยามหัวข้อ 3.3 ของสเปก ตั้งแต่ sample ที่ใช้ได้ตัวสุดท้าย เปิดแอปกลับมาภายใน `suspendedMax_s` และอยู่ในเขต = กลับ Active ทันที ไม่ต้อง check-in ใหม่ (R13) · เกิน = เห็นหน้าสรุปผล `timeout` ทันทีที่เปิดแอป ไม่ใช่จอ run (R18, หัวข้อ 7)
- **Wake Lock ถูก OS ปล่อยเอง** เมื่อ tab ถูกซ่อน: client ขอใหม่ทันทีที่ visibility กลับมา visible โดยไม่ต้องแจ้งผู้เล่น (เหมือน `components.md` หัวข้อ 12.2 ไม่เปลี่ยน)
- **เน็ตหลุด** (E8): Phase 2 ไม่มี server จึงไม่มีผลใดต่อ run state หรือ movement gate เลย — มีแค่ banner `[gps.offline]` (นอก run) หรือ `[gps.offlineInRun]` (ใน run) ตามข้อเท็จจริง **ห้ามใช้คำว่า "หยุด"/"เสีย"** เพราะ run ยังไม่ขาด — ปุ่มที่ต้องยิง request (เช่น "เข้า", "ออกเอง") disable + `[common.offlineRetry]` จนกว่าเน็ตกลับมา
- **ออกนอกพื้นที่เล่น (โซนดำ) ระหว่าง run** (E18): run state ตัดสินจาก polygon ตามปกติ ไม่มีกฎพิเศษ (สเปกยืนยันชัด) — ไม่ต้องเพิ่ม UI แยก

## 10. รายการ copy key (ส่งต่อ P2-F04-T16)

### 10.1 Key ใหม่ที่ยังไม่มีใน `copy.th.json` (uiux เสนอชื่อ+ร่างไทย narrative เป็นผู้ตัดสินคำสุดท้าย+ตรวจเพดาน)

| key | ร่างไทย | `kind` | บริบท |
| --- | --- | --- | --- |
| `nav.straightLineTag` | "เส้นตรง" | label | ชิปเล็กติดกับตัวเลขระยะทุกจุดที่แสดงระยะ (R34) — คำกำกับเดียวใช้ซ้ำทุกที่แทนการฝังในแต่ละ message |
| `nav.directionLabel` | "ทิศ{directionText}" | label | คำกำกับทิศคู่กับลูกศร (R36) — `{directionText}` เป็นคำทิศ 8 ทิศจากรายการคงที่ (ไม่ใช่องศาดิบ) |
| `nav.fallbackTitle` | "เปิดแอปนำทางไม่ได้" | label | A3 เมื่อ deep link ใช้ไม่ได้ |
| `nav.fallbackDestinationLabel` | "ปลายทาง" | label | หัวข้อก่อนชื่อสถานที่เต็มในแผง fallback |
| `nav.fallbackCopyButton` | "คัดลอกชื่อ" | button | A3 ปุ่มคัดลอกไปคลิปบอร์ด |
| `nav.fallbackCopied` | "คัดลอกแล้ว" | label | A3 ยืนยันสั้นหลังคัดลอก |
| `dungeon.closingSoonTag` | "จะปิดในอีก {timeLeft}" | message | B3 บรรทัดเสริมใน popup confirm (R28) ไม่บล็อกการเข้า |
| `dungeon.checkinNotEnoughTrace` | "กำลังนับเวลาที่เดินต่อเนื่อง อีก {countdown}" | message | Flow C ลำดับ 3 มี countdown สด |
| `dungeon.checkinPoorAccuracy` | "สัญญาณ GPS ไม่แม่นพอ ลองออกที่โล่ง" | message | Flow C ลำดับ 2 |
| `dungeon.checkinNoApproach` | "ต้องเดินเข้ามาจากนอกเขต ลองเดินออกแล้วกลับเข้ามา" | message | Flow C ลำดับ 4 |
| `dungeon.checkinSpeedLocked` | "เพิ่งเร็วเกินเดินอยู่ช่วงที่ผ่านมา ลองเดินเข้าใหม่อีกครั้ง" | message | Flow C ลำดับ 1 — ห้ามเอ่ย anti-cheat (R10) |
| `anticheat.speedLockTitle` | "เร็วเกินเดิน ระบบล็อกไว้ก่อน" | message | Flow D overlay บรรทัดแรก |
| `anticheat.speedLockBody` | "จะปลดเองเมื่อกลับมาเดินความเร็วปกติ" | message | Flow D overlay บรรทัดสอง |
| `run.stateActiveLabel` | "กำลังเล่น" | label | run-state pill สถานะ Active |
| `run.stateSuspendedLabel` | "หยุดชั่วคราว" | label | run-state pill สถานะ Suspended (คนละ key จาก `run.stateSuspended` ที่เป็น banner ข้อความยาว) |
| `run.tickPausedLabel` | "หยุดนับชั่วคราว" | label | แทนตัวเลข tick timer ระหว่าง Grace/Suspended |
| `run.closingSoonWarning` | "จะปิดในอีก {timeLeft} เดินเก็บของให้ครบก่อนได้" | message | เตือนหนึ่งครั้งระหว่าง run (R29) |
| `run.summary.dungeonClosed` | "โซนปิดแล้ว ของอยู่ครบ" | label | หัวจอสรุป `exit_reason: dungeon_closed` |
| `run.summary.clockInvalid` | "เวลาที่เครื่องเพี้ยน run จบแล้ว ของอยู่ครบ" | label | หัวจอสรุป `exit_reason: clock_invalid` |

### 10.2 Key ที่มีอยู่แล้วและใช้ซ้ำตรงๆ (ไม่แก้)

`nav.map`, `dungeon.confirmTitle`, `dungeon.confirmLevel`, `dungeon.confirmEnter`, `dungeon.confirmCancel`, `dungeon.overlapTitle`, `dungeon.closedTitle`, `dungeon.closedBody`, `dungeon.closedEmergencyBody`, `dungeon.closedDismiss`, `dungeon.outOfRangeTitle`, `dungeon.alreadyActive`, `common.close`, `common.error`, `common.retry`, `common.offlineNotice`, `common.offlineRetry`, `common.lastUpdated`, `map.riftClosed`, `map.navigateButton`, `gps.pillLabel`, `gps.offline`, `gps.offlineInRun`, `gps.lowAccuracy`, `gps.lowAccuracyBody`, `run.exitButton`, `run.exitConfirmTitle`, `run.exitConfirmBody`, `run.exitConfirmButton`, `run.exitConfirmCancel`, `run.stateGrace`, `run.stateSuspended`, `run.stateResumed`, `run.tickTimer`, `run.summary.headerLabel`, `run.summary.exited`, `run.summary.died`, `run.summary.autoRetreated`, `run.summary.closedByModerator`, `run.summary.connectionLost`, `run.summary.connectionLostBody`, `run.summaryRewardList`, `run.summaryRewardEmpty`, `run.summaryRewardLost`, `run.summaryContinue`

### 10.3 Key เดิมที่ context ต้องแก้ตามกฎใหม่ (handoff เป็น decision ให้ narrative-designer ยืนยัน)

`map.nearestRiftFound` และ `home.farBody` เขียน context ไว้ว่า "ระยะจริง ไม่ปัด" (ก่อนคำตัดสิน A-3/R34) — R34 ของสเปกปัจจุบันสั่งให้ **ปัดขึ้นเป็นขั้นเสมอ** (ห้ามปัดลง) เอกสารนี้เสนอแก้ context ทั้งสอง key เป็น "ระยะเส้นตรง ปัดขึ้นเป็นขั้น ไม่หลอกว่าใกล้กว่าจริง" และให้ทั้งสอง message ต่อท้ายด้วย `nav.straightLineTag` เสมอ (ไม่ใช่ปัญหาเชิงความหมายเพราะปัดขึ้นยังคง "ไม่หลอกว่าใกล้" ตามเจตนาเดิม)

## 11. สมมติฐานและคำถามค้าง

- [ASSUMPTION A-P2-F04-T15-1: การ์ดซ้อน (B2) ใน Phase 2 ไม่มีข้อยกเว้นโชว์ "0 คน" อีกต่อไป (ปิด A-P1-F03-T16-3 สำหรับ Phase 2) เพราะ D-089/GD N-04 ไม่มีข้อยกเว้น ต้องยืนยันกับ game-director และ narrative-designer ก่อน design gate รวม F04+F05 (P2-F05-T18) · owner: game-director]
- [ASSUMPTION A-P2-F04-T15-2: `{directionText}` ใช้คำทิศ 8 ทิศจากรายการคงที่ (เหนือ/ตะวันออกเฉียงเหนือ/ตะวันออก/.../ตะวันตกเฉียงเหนือ) แปลงจากองศาที่ engine คำนวณ ไม่ใช่ตัวเลของศาดิบ (อ่านออกเร็วกว่าในสามวินาที) · owner: narrative-designer ยืนยันคำ, gameplay-programmer ยืนยัน mapping องศา→คำ]
- [ASSUMPTION A-P2-F04-T15-3: ไอคอนลูกศรทิศทาง (หมุนตามองศา) และไอคอนสถานะของ run-state pill (● Active, ◐ Grace, ■ Suspended) ยังไม่มี SVG จริงจาก icon-grammar — wireframe ใช้ glyph พื้นฐานแทนชั่วคราว ต้องเพิ่มเป็นรายการใหม่ใน `art/direction/icon-grammar.md` ก่อน build จริง · owner: art-director, artist-2d]
- [ASSUMPTION A-P2-F04-T15-4: `run.summary.connectionLost`/`connectionLostBody` ใช้ซ้ำสำหรับ `exit_reason: timeout` ของสเปกปัจจุบัน แม้ context เดิมอ้าง config `offlineEvidence.connectionLostEndsRunAfter_s` ซึ่งสเปก F04 ปัจจุบันใช้ชื่อ `dungeons.runState.suspendedMax_s` แทน — เสนอให้ narrative-designer แก้ context ของสอง key นี้ให้ตรงชื่อ config ปัจจุบัน (ไม่ต้องเปลี่ยนคำ) หรือถ้าต้องการแยกความหมายชัดกว่านี้ให้เพิ่ม key `run.summary.timeout` ใหม่แทน · owner: narrative-designer, systems-designer]
- คำถาม (ส่งต่อ design gate P2-F05-T18): pill สถานะ run-state ใหม่ (หัวข้อ 6) เป็นองค์ประกอบที่ไม่มีใน `components.md` เดิม — ต้องเพิ่มสเปกลง `components.md` เป็นคอมโพเนนต์ทางการหรือไม่ (เสนอ: เพิ่มในรอบถัดไปที่ uiux แก้ `components.md`, ไม่ blocking งานนี้เพราะ wireframe มีสเปกครบในตัวแล้ว)
- คำถาม (playtest P2-F06-T27, สืบเนื่องจากสเปกหัวข้อ 10): สัดส่วนคนที่เจอ `no_approach_from_outside` ครั้งแรกและเวลาที่เสียไป — ถ้าสูงมาก อาจต้องออกแบบ empty-state ของแผงระยะ+นำทางให้ชี้ชัดขึ้นว่า "ต้องเดินผ่านขอบเขต" ก่อนถึง dungeon

## REPORT
task: P2-F04-T15
status: DONE
summary: เขียน flow F04 ครบ (แผนที่+นำทาง A-3, popup confirm ไม่มีจำนวนคนตาม D-089, check-in 4 เหตุผลตามลำดับ GD B-03, speed lock overlay เต็มจอ GD B-02, run state Active/Grace/Suspended/Ended แยกด้วย pill+banner ไม่ต้องอ่านตัวเลข, สรุป run ครบทุก exit_reason, ตารางสถานะ empty/loading/GPS ปิด/accuracy ต่ำ/offline/dungeon ปิด/นอกระยะ/error, แอปย่อ/ปิด+เน็ตหลุด) พร้อม wireframe HTML 4 ไฟล์
outputs:
  - design/ux/flows/F04-dungeon-presence.md — flow เต็ม 11 หัวข้อ พร้อมหมายเหตุ override เหนือ F03-core-loop.md (Phase 2 ซ่อนจำนวนคนไม่มีข้อยกเว้น), รายการ copy key ใหม่ 19 key + reuse key เดิม
  - design/ux/wireframes/F04-01-map-navigate.html
  - design/ux/wireframes/F04-02-dungeon-confirm.html
  - design/ux/wireframes/F04-03-checkin-speedlock.html
  - design/ux/wireframes/F04-04-run-state-summary.html
acceptance:
  - [ ] ทุกสถานะ (ว่าง, กำลังโหลด, GPS ปิด, accuracy ต่ำ, ออฟไลน์, dungeon ปิด+เวลาเปิดถัดไปก่อนปุ่มนำทาง, ไกล, นอกพื้นที่, error) — evidence: หัวข้อ 8 ตาราง + wireframe ทั้ง 4 ไฟล์
  - [ ] Active/Grace/Suspended/Ended ต่างกันชัดไม่ต้องอ่านตัวเลข — evidence: หัวข้อ 6 ตาราง run-state pill + banner, F04-04-run-state-summary.html
  - [ ] (A-3) นำทาง: ลูกศร/ข้อความทิศ + ระยะเส้นตรงปัดขั้น+คำกำกับ, ไม่มีเส้นทาง/เส้นตรงบนแผนที่, ปุ่มเปิดแอปแผนที่ภายนอก+fallback คัดลอกชื่อ, เลือก dungeon เมื่อ polygon ซ้อน, popup confirm ไม่แสดงจำนวนคน — evidence: หัวข้อ 2–3, F04-01/02
  - [ ] (GD B-03) สถานะรอสัญญาณ/เดินเข้ามาจากข้างนอกขณะ check-in ยังไม่ผ่าน · (GD B-02) จอ speed lock ล็อก+บอกเหตุ+บอกวิธีปลด ไม่ต้องจ้องจอ — evidence: หัวข้อ 4–5, F04-03
  - [ ] ใช้ copy key พร้อมร่างไทย, ไม่แสดงตำแหน่งผู้เล่นอื่น, ไม่มีข้อความอิสระ, touch target/token ตาม components.md — evidence: ทุก wireframe ใช้ `<span class="copykey">`/`<span class="thaidraft">`, ปุ่ม/การ์ดใช้ class `.btn`/`.card`/`.popup`/`.banner`/`.toast` เดิมจาก shared/style.css ไม่มี hardcode สี
assumptions:
  - A-P2-F04-T15-1: การ์ดซ้อนไม่มีข้อยกเว้นโชว์ 0 คนอีกต่อไปใน Phase 2 (owner: game-director)
  - A-P2-F04-T15-2: ทิศทางแสดงเป็นคำ 8 ทิศ ไม่ใช่องศาดิบ (owner: narrative-designer, gameplay-programmer)
  - A-P2-F04-T15-3: ไอคอนลูกศรทิศ + ไอคอน run-state pill ยังเป็น placeholder รอ SVG จริง (owner: art-director, artist-2d)
  - A-P2-F04-T15-4: คำสรุป exit_reason timeout ใช้ซ้ำ key connectionLost ชั่วคราว รอ narrative แก้ context หรือแยก key ใหม่ (owner: narrative-designer, systems-designer)
handoffs:
  - to: narrative-designer (P2-F04-T16) | need: ยืนยัน/แก้คำของ key ใหม่ 19 รายการในหัวข้อ 10.1, แก้ context ของ map.nearestRiftFound/home.farBody ตามหัวข้อ 10.3, ตัดสิน A-P2-F04-T15-1 และ A-P2-F04-T15-4 ร่วมกับ game-director | why: T16 ต้องใช้ key จริงเขียนลง copy.th.json | blocking: no (flow นี้ระบุ context ครบพอให้เริ่มงานได้)
  - to: game-director (P2-F04-T27) | need: อนุมัติ flow นี้ก่อน build รวมถึงยืนยัน A-P2-F04-T15-1 (ปิดข้อยกเว้น 0 คนในการ์ดซ้อน) | why: protocol ข้อ 5 (game-director approves core-loop flows) | blocking: yes สำหรับ P2-F04-T21
  - to: art-director, artist-2d | need: เพิ่ม icon-grammar สำหรับลูกศรทิศทาง (หมุนตามองศา) และไอคอนสถานะ run-state pill (Active/Grace/Suspended) | why: A-P2-F04-T15-3 | blocking: no (wireframe ใช้ placeholder ไปก่อน)
  - to: gameplay-programmer (P2-F04-T21) | need: ใช้ flow นี้ (ไม่ใช่ F03-core-loop.md) เป็นตัวจริงสำหรับ popup confirm/การ์ดซ้อน/ป้ายแผนที่/run state banner ของ Phase 2 | why: override หัวข้อบนสุดของเอกสาร | blocking: no
  - to: tech-lead (P2-F04-T14) | need: ยืนยันรูปแบบลิงก์นำทางจริงและพฤติกรรม fallback ตรงกับ Flow A ขั้น A3 | why: (A-3 เงื่อนไข 5) | blocking: no
decisions:
  - none (เสนอไว้ในหัวข้อ 11 เป็น assumption ที่ต้อง handoff ไม่ใช่การตัดสินเอง)
questions_for_human:
  - none
