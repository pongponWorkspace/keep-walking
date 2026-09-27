# Flow F04 — Dungeon Presence: แผนที่ → นำทาง → confirm → check-in → run state

Task: P2-F04-T15 (ฉบับแก้รอบ 3 โดย P2-X11) · เจ้าของ: uiux-designer · สถานะ: รอบ 1 = NEEDS_CHANGES (แก้โดย P2-X02) → รอบ 2 (P2-F04-T27) = PASS พร้อมเงื่อนไขความสอดคล้อง C-1..C-5 → **รอบ 3 (เอกสารนี้) แก้ C-1..C-5 ให้ครบก่อนเข้า design gate รวม F04+F05 (P2-F05-T18)** · วันที่: 2026-09-27
แหล่งอ้างอิง: `design/features/F04-dungeon-presence.md` (P2-F04-T01, สเปกหลักที่ flow นี้แปลงเป็นจอ) · `design/ux/ia.md` (รหัสหน้าจอ, navigation shell, สถานะที่บ้าน) · `design/ux/flows/F03-core-loop.md` (ฐานเดิมของ layout header/popup/run screen — ดูหมายเหตุ override ด้านล่าง) · `design/ux/components.md` (หัวข้อ 13 คอมโพเนนต์ F04), `design/ux/tokens.json` · `art/direction/style-guide.md` (S1–S10) · `art/direction/briefs/P2-assets.md` (หัวข้อ 3.3–3.8) · `docs/tech/F04-dungeon-presence.md` (หัวข้อ 7 check-in/confirm, หัวข้อ 14 ลิงก์นำทาง+fallback) · `config/content/copy.th.json` (key ที่มีอยู่แล้ว) · `design/reviews/F04-flow-approval.md` (รอบ 1, คำตัดสิน J-1..J-7) · D-089, D-064, D-072, D-079, D-097, D-100, A-3 (ระยะเส้นตรง+นำทาง), GD B-02 (speed lock), GD B-03 (check-in), GD N-04 (ซ่อนจำนวนคน)
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

A2. แตะป้าย/การ์ดแนะนำ → แผงรายละเอียดสั้น (ไม่ใช่หน้าใหม่ เป็นส่วนหนึ่งของแผงล่างที่มีอยู่แล้ว: สถานะ "ใกล้" ใน `S-01-map`, หรือ `S-06-far-dungeon-panel` เมื่อไกล) — **การ์ดแนะนำเลือกเฉพาะแห่งที่เปิดอยู่เท่านั้น** ช่วงเลเวลที่ครอบผู้เล่นมาก่อน (N-08: onboarding นาที 1–3 ไม่แนะนำแห่งที่ปิดอยู่ ตาม R33/D-089 เงื่อนไข 4) มีองค์ประกอบนี้เสมอ:
   - ชื่อโซน `[dungeon.confirmTitle]`
   - **ระยะเส้นตรง ปัดขึ้นเป็นขั้นตาม `config: unlocks.home.distanceDisplaySteps_m` พร้อมคำกำกับทุกครั้ง** (R34): ตัวเลข `{distanceText}` ต่อท้ายด้วย tag คงที่ `[nav.straightLineTag]` ("เส้นตรง") วางเป็นชิปเล็กติดกับตัวเลขเสมอ ทุกจุดที่แสดงระยะในเอกสารนี้ (แผงนี้, ป้ายแผนที่ระยะละเอียด, popup confirm) ใช้ชิปเดียวกัน ไม่ใช่คนละคำในแต่ละที่ · accuracy ต่ำ: **ทั้งค่า** `{distanceText}` ถูกแทนด้วยเทมเพลต `[nav.distanceApprox]` ("ราว {distanceText}") **แก้ P2-X30 — ไม่ใช่ `nav.approximateDistancePrefix` ("ประมาณ") ที่เอกสารนี้เคยเขียนผิด**: `nav.distanceApprox` เป็นข้อความทั้งประโยคที่แทนค่า `{distanceText}` เปล่า ไม่ใช่คำนำหน้าที่ต่อกับตัวเลขเองในโค้ด (คีย์นี้ตรงกับที่ narrative-designer เพิ่มจริงใน `copy.th.json`, P2-F05-T09 — ดูหัวข้อ 14) แต่ **ยังปัดขึ้นตามกฎเดิม** ไม่แสดงน้อยกว่าระยะเส้นตรงจริง (N-09)
   - **ทิศ (แก้ B-04, J-5, D-097):** ลูกศร **snap เป็น 8 ทิศ** (ทีละ 45°) จากตำแหน่งผู้เล่นไปยัง **`nav_destination.point`** — จุดเดียวกับปลายทางที่ปุ่ม "นำทาง" เปิด (ทางเข้าที่ปักไว้ ไม่ใช่จุดขอบ polygon ที่ใกล้ที่สุดซึ่งอาจเป็นแนวรั้ว) · อิงทิศเหนือของแผนที่เท่านั้น (แผนที่หันเหนือขึ้นเสมอใน Phase 2 ไม่ใช้เข็มทิศของเครื่อง, A-P2-F05-T03-2) · **อัปเดตเฉพาะเมื่อมี sample ใหม่และทิศที่ปัดแล้วเปลี่ยนจริง** ไม่มี animation หมุนต่อเนื่อง (`transform: rotate()` แบบกระโดดหรือ one-shot ≤150ms, reduced-motion = กระโดดทันที) + ข้อความทิศกำกับ `[nav.directionLabel]` ("ทิศ{directionText}") ใช้คำ 8 ทิศเดียวกับที่ลูกศร snap ไป (J-3, A-P2-F04-T15-2, ยืนยันแล้วรอบ 1) · **ระยะตัวเลขยังวัดถึงขอบ polygon ตาม R34 ไม่เปลี่ยน** (จุดเป้าของทิศกับจุดที่ใช้วัดระยะเป็นคนละอย่างกันโดยเจตนา ตาม J-5) — **ไม่วาดเส้นใดๆ จากผู้เล่นถึง dungeon บนแผนที่** (R36, กันเข้าใจผิดว่าเดินตัดแม่น้ำ/ทางด่วน/ทางรถไฟได้) · ซ่อนลูกศรเมื่ออยู่ใน polygon แล้ว (โชว์สถานะ "อยู่ในเขต" แทน) หรือไม่รู้ตำแหน่ง (โชว์ `icon.ui.location-off` แทน)
   - ช่วงเลเวล `[dungeon.confirmLevel]`
   - สถานะเวลาทำการ: เปิดอยู่ (ไม่ต้องมีข้อความเพิ่ม) หรือปิดอยู่ `[dungeon.closedTitle]` + เวลาเปิดถัดไป `[dungeon.closedBody]` — **ต้องอยู่เหนือปุ่มนำทางเสมอเมื่อปิด** (อ่านก่อนกดปุ่ม ตามที่ acceptance ของ T15 ระบุ)
   - ปุ่มเด่นสุดครึ่งล่างจอ `[map.navigateButton]` ("นำทาง") — กดได้แม้ปิดอยู่ (R38, dungeon ที่ปิดยังนำทางได้)
   - **บรรทัดเสริมใต้ปุ่มนำทาง (แก้ B-06, J-6):** `[nav.returnBeforeArrive]` ("ใกล้ถึงแล้วสลับกลับมาเปิดเกมค้างไว้ก่อนเดินเข้าเขต") แสดงทั้งสถานะ "ใกล้" และ "ไกล" — ไม่อธิบายว่าเกมตรวจอะไร (U7) เจตนาเดียวคือกันกับดัก check-in หลังใช้แอปนำทาง (ดู B-06 ใน A3 ด้านล่าง)
   - **ทางเข้าแผง fallback ด้วยตัวเอง:** ลิงก์รองเล็กใต้บรรทัด `nav.returnBeforeArrive` (ไม่เด่นกว่าปุ่มนำทาง) เปิดแผง A3 ได้ทุกเมื่อแม้ deep link ยังไม่ถูกกด (tech note 14.2)

A3. กด "นำทาง" → เปิดแอปแผนที่ของเครื่อง (deep link) ด้วยปลายทาง = จุดสาธารณะของ dungeon เท่านั้น (ทางเข้าที่ปักไว้ ไม่มีก็ใช้จุดป้าย) โหมดเดินเท้า **ไม่มีตำแหน่งผู้เล่นใน URL ไม่มี API key หรือบริการคิดเงิน** (R37 — รูปแบบลิงก์จริงตาม tech note หัวข้อ 14.1: Google Maps URL บน Android, Apple Maps URL บน iOS, ลิงก์รอง Google Maps บน iOS ได้)
   ⤷ เงื่อนไข: เปิดแอปแผนที่สำเร็จ (หน้าเว็บเข้าสถานะ `hidden`/`pagehide` ภายใน `config: app.client.navigation.externalOpenTimeout_ms`) → ออกจากเว็บแอปไปแอปนำทางภายนอก **แต่ต้องกลับมาเปิดเกมก่อนเดินเข้าเขต** (แก้ B-06, J-6: ระหว่างแอปแผนที่อยู่หน้าจอ เกมไม่ได้ sample ตำแหน่ง ลำดับ check-in "เดินเข้ามาจากข้างนอก" จึงล้มถ้าเดินเข้าเขตไปแล้วค่อยสลับกลับมา — ไม่ใช่ปุ่มเดียว ไม่มีการผ่อนเงื่อนไข check-in ใดๆ ถ้าพลาด ข้อความ `no_approach_from_outside` เดิมพาเดินออกแล้วกลับเข้าใหม่ได้โดยไม่ลงโทษ)
   ⤷ เงื่อนไข: **fallback อัตโนมัติ** (แก้ B-05 ตาม tech note 14.2–14.3) เมื่อภายใน `externalOpenTimeout_ms` หน้ายังไม่เข้าสถานะ hidden (deep link ใช้ไม่ได้จริง) **หรือ** `navigator.onLine === false` (แสดงคู่ลิงก์ตั้งแต่แรก) **หรือ** ผู้เล่นกดลิงก์รองใน A2 → แผง `[nav.fallbackTitle]` ("เปิดแอปนำทางไม่ได้") แสดง **สองค่าพร้อมปุ่มคัดลอกแยกกัน**:
     1. ชื่อที่ค้นได้ (`search_name_key`) + ปุ่ม `[nav.fallbackCopyButton]` ("คัดลอกชื่อ")
     2. พิกัดปลายทาง `lat, lng` (ข้อมูลสาธารณะของสถานที่ ไม่ใช่ของผู้เล่น) ป้ายกำกับ `[nav.fallbackCoordinateLabel]` ("พิกัดปลายทาง") + ปุ่ม `[nav.fallbackCopyCoordinateButton]` ("คัดลอกพิกัด")
     คัดลอกด้วย `navigator.clipboard.writeText` ใน gesture → แสดง toast `[nav.fallbackCopied]` ("คัดลอกแล้ว") หายเองสั้นๆ ได้ (เฉพาะ toast ยืนยัน ไม่ใช่ตัวแผง) · ล้มหรือไม่มี API → ค่านั้นแสดงเป็น `<input readonly>` ที่เลือกข้อความไว้แล้วให้คัดลอกเอง (tech note 14.3) · **แผงเองปิดเฉพาะเมื่อผู้เล่นกดปิดเท่านั้น** (ไม่ปิดอัตโนมัติหลังคัดลอก — กันคัดลอกค่าที่สองไม่ทันและกันปิดก่อนอ่านชื่อครบ) · **แก้ C-2 (คำตัดสิน round 2 R2-3):** แผงนี้มีบรรทัด `[nav.returnBeforeArrive]` เดียวกับแผง A2 ด้วย วางใต้ปุ่มคัดลอกพิกัด เหนือปุ่มปิด — คนที่คัดลอกชื่อ/พิกัดไปเปิดแอปแผนที่เองผ่านแผงนี้เจอกับดัก check-in เดียวกับคนที่ใช้ deep link โดยตรง (J-6) จึงต้องเห็นบรรทัดเตือนนี้เช่นกัน ไม่ใช่แค่ในแผง A2

A4. **ไม่มีเส้นทางหรือเส้นตรงใดบนแผนที่ในแอปเลย** (R36, R39) — แผนที่หลักยังเป็น static tile เดิม ไม่มี polyline/animation ต่อเนื่องเพิ่ม (pillars P4, style-guide 9.3)

A5. เดินเข้าใกล้จนถึงขอบ polygon → ไป Flow B ขั้น B1 (แผงนี้ใช้ร่วมกับสถานะ "ไกล"/"ใกล้" ของ `ia.md` หัวข้อ 4 ทั้งหมด ไม่เขียน state "นอกพื้นที่"/"ไม่รู้ตำแหน่ง" ซ้ำในนี้ อยู่ใน `ia.md` และ `F03-core-loop.md` Flow D อยู่แล้วและไม่เปลี่ยนในเอกสารนี้)

## 3. Flow B — เดินเข้าเขต → popup confirm (F04-R01..R06)

ใช้ popup เดียวกันทุกครั้งไม่ว่าจะเป็นครั้งแรกในเกมหรือเล่นมานานแล้ว `config: dungeons.entry.confirmPopupRequired (=true)` — ไม่มีทางเข้า dungeon โดยไม่เจอ popup นี้และกด "เข้า" เอง ไม่มีการเข้าอัตโนมัติ (R02)

B1. เดินถึงขอบ polygon ของ dungeon ที่เปิดอยู่ → `S-02-dungeon-confirm` เปิดเป็น popup ทันที ไม่ต้องกดปุ่มเปิดเอง **เปิดพร้อมสถานะ check-in จริงตั้งแต่เฟรมแรก** (แก้ B-01: ไม่ใช่เปิดแบบว่างแล้วรอกด "เข้า" ก่อนจึงรู้ผล — client เรียก `selectCheckInPreview` ทันทีที่ตรวจพบผู้เล่นอยู่ใน polygon ด้วย geo แล้ว render ผลนั้นเป็นเฟรมแรกของ popup ตาม tech note 7.4/T1) เนื้อหา (**override หัวข้อบน — ไม่มีบรรทัดจำนวนคน/role เลย ไม่มี element ไม่มีช่องว่างที่จองไว้ — N-01**):
   - ชื่อโซน `[dungeon.confirmTitle]` ({zoneName})
   - ช่วงเลเวล `[dungeon.confirmLevel]` (ไม่บล็อกการเข้า ตาม R32)
   - **แถวสถานะ check-in** ตาม `selectCheckInPreview` ปัจจุบัน (components.md 13.3): ถ้ายังไม่ผ่านเฟรมแรกก็แสดงเหตุผลทันที ปุ่ม "เข้า" เป็น `.btn-disabled` ตั้งแต่ต้น เปิดใช้เองอัตโนมัติเมื่อ preview เปลี่ยนเป็นผ่าน (ไม่ต้องกดอะไรเพิ่ม ไม่ปิดเปิด popup ใหม่ — รายละเอียดเต็มอยู่ Flow C)
   - ปุ่ม `[dungeon.confirmEnter]` ("เข้า") เด่นสุดครึ่งล่างจอ และ `[dungeon.confirmCancel]` ("ยกเลิก") — **แก้ C-1 (คำตัดสิน round 2 R2-3):** ปุ่ม "ยกเลิก" แสดงและกดได้ **ทุกสถานะของ popup** (ยังไม่ผ่าน check-in, ผ่านแล้ว, รอผล `confirm`, บรรทัดนอกระยะ B5) ตำแหน่งเดียวกันเสมอ ไม่หายไปพร้อมปุ่ม "เข้า" ที่ถูก disable — สำคัญที่สุดในกรณี B5 (นอกระยะ) เพราะคนยืนขอบสวนต้องปิดเองได้ทันทีโดยไม่ต้องรอ hysteresis ปิดอัตโนมัติ (R06: ยกเลิกได้ทุกเมื่อโดยไม่มีผล)
   - **ตำแหน่งที่จะแสดงจำนวนคน/role เมื่อมี backend (Phase 3):** บรรทัดใต้ช่วงเลเวล ก่อนแถวสถานะ check-in — **Phase 2 ไม่มี element และไม่มีช่องว่างใดถูกจองไว้ในเลย์เอาต์เลย** (N-01, pillars 7.1: "ไม่แสดง = ไม่มี element") ตำแหน่งนี้เป็นแค่บันทึกอ้างอิงสำหรับตอนต่อ backend ใน Phase 3 ผ่าน flow F09 (`design/features/F04-dungeon-presence.md` ข้อ R05 เงื่อนไข)
   ⤷ เงื่อนไข: กด "ยกเลิก" → ปิด popup กลับ `S-01-map` ไม่มีผลใด (R06) เปิดใหม่ได้ตลอดที่ยังอยู่ในเขต ด้วยปุ่ม `[map.reopenConfirmButton]` ("เข้าโซนนี้") ที่ครึ่งล่างจอสถานะ "อยู่ในเขต" ของ `S-01-map` (N-10, ปุ่มเด่นสุดของสถานะนั้น)
   ⤷ เงื่อนไข: กด "เข้า" และ check-in ผ่านครบ (Flow C) → engine ตรวจเวลาทำการ + `maxActiveDungeonsPerPlayer` (R01) → ไป Flow E (Active) หรือ B4/B6 แล้วแต่ผล

B2. **Polygon ซ้อนกัน** (R03): `S-02-dungeon-confirm` แสดง **เฉพาะ 2+ การ์ดของแห่งที่เปิดอยู่เท่านั้น** ให้เลือกแทนการ์ดเดียว (N-05: ถ้าเหลือแห่งที่เปิดอยู่แห่งเดียวหลังกรองเวลาทำการ ใช้ B1 แบบปกติแทน ไม่ใช่การ์ดซ้อน) แต่ละการ์ดมี **ชื่อโซน + ช่วงเลเวลเท่านั้น** (ปิดข้อยกเว้น "0 คน" เดิมของ F03 ตาม override ข้อ 2 ด้านบน, ยืนยันแล้วโดย J-2) `[dungeon.overlapTitle]` ("เลือกโซนที่จะเข้า") + คำใบ้ `[dungeon.overlapHint]` ("เลือกโซนก่อนแล้วกดเข้า") **ไม่มีการ์ดใดถูกเลือกไว้ล่วงหน้า** (N-05) ผู้เล่นแตะการ์ดที่ต้องการก่อนปุ่ม "เข้า" จึงใช้งานได้ (`.btn-disabled` จนกว่าจะเลือก) — หลังเลือก ปุ่ม "เข้า" และแถวสถานะ check-in อ่าน `selectCheckInPreview` ของ **แห่งที่เลือกเท่านั้น** (sample นอก polygon นับแยกต่อ dungeon ตาม tech note 7.2) — เข้าแล้ว polygon ของ run = อันที่เลือกเท่านั้น เดินเข้า polygon อื่นที่ซ้อนกันระหว่าง run ไม่มีผล (R03, R04)

B3. **ใกล้ปิด** (R28): ถ้าเหลือเวลาถึงปิด ≤ `config: dungeons.openingHours.closingSoonNotice_s` popup แสดงบรรทัดเพิ่ม `[dungeon.closingSoonTag]` ("จะปิดในอีก {timeLeft}") ใต้ช่วงเลเวล **ยังกด "เข้า" ได้ ไม่บล็อก** (ไม่ใช่เหตุผลปฏิเสธ check-in)

B4. **dungeon ปิดอยู่** (นอกเวลาทำการ หรือปิดฉุกเฉิน, R27): แทนที่จะเปิด popup ปกติ ขึ้น `[dungeon.closedTitle]` ("ปิดอยู่ตอนนี้") + เวลาเปิดถัดไป `[dungeon.closedBody]` ("เปิดอีกที {openTime}") หรือถ้าปิดฉุกเฉินยังไม่มีเวลาเปิด `[dungeon.closedEmergencyBody]` — **ไม่มีปุ่ม "เข้า" ให้กด** มีแค่ `[dungeon.closedDismiss]` ("กลับแผนที่") — เกิดได้ทั้งตอนเดินเข้าเขตครั้งแรก (แทน B1) และตอนกด "เข้า" แล้ว engine ปฏิเสธ (แทนผลของ B1) · **`unsupported_mode`** (N-06, tech note 7.1: `verification_mode` ที่ engine ไม่รองรับ) แสดงเหมือนหน้านี้ทุกประการโดยใช้ `[dungeon.closedEmergencyBody]` (ไม่มีเวลาเปิด) — ไม่เกิดกับข้อมูลที่ผ่าน validator ของ `tools/dungeons` แต่ client ต้องมีจอรองรับไว้เผื่อ (fail closed)

B5. **นอกระยะ** (แก้ B-07, J-7 — ไม่ใช่ popup แยกอีกต่อไป): เมื่อเหตุผล check-in คือ `no_approach_from_outside` **และ** sample ล่าสุดที่ client ตรวจด้วย geo อยู่นอก polygon ที่เลือกจริง (ไม่ใช่แค่ "ยังไม่ครบเงื่อนไขเดินเข้ามาจากข้างนอก" ขณะยืนอยู่ข้างในแล้ว) → แถวสถานะใต้ปุ่ม "เข้า" (เดียวกับ Flow C) เปลี่ยนข้อความเป็น `[dungeon.outOfRangeTitle]` ("GPS ยังไม่เชื่อว่าคุณถึงแล้ว เดินลึกเข้าไปอีกหน่อย") แทน `[dungeon.checkinNoApproach]` — **ลำดับความสำคัญของเหตุผลตาม R08 ไม่เปลี่ยน** (เป็นแค่หมวดย่อยของข้อ 4 ตอนแสดงผล ไม่ใช่เหตุผลที่ 5 ใหม่) · popup **ไม่ต้องกดปิดเพื่อลองใหม่**: ปิดตัวเองกลับแผนที่โดยไม่ลงโทษเมื่อจอแสดงผลเห็นผู้เล่นอยู่นอก polygon ต่อเนื่องครบเกณฑ์เดียวกับ hysteresis ของ R15 (`config: dungeons.runState.edgeHysteresisSamples` / `edgeHysteresis_m` — ใช้เพื่อแสดงผลเท่านั้น ไม่ใช่ตัวตัดสินเกม) ไม่ปิดจาก sample เดียวที่ส่ายที่ขอบ (กันเปิด-ปิด-เปิดซ้ำตอนยืนขอบสวน) [handoff: ขอ narrative-designer แก้ context ของ `dungeon.outOfRangeTitle` จาก "server พบ ... ปิด popup" เป็น "เป็นบรรทัดสถานะใต้ปุ่ม อยู่ในเขตแล้วแต่ GPS ยังไม่นิ่งพอ ปิดเองถ้าเดินออกไปจริง"]

B6. **เกิน `maxActiveDungeonsPerPlayer`** (มี run อยู่แล้วที่อื่น, R01): `[dungeon.alreadyActive]` ("ยังอยู่ใน dungeon อื่น ออกจากที่นั่นก่อน") — ไม่ควรเกิดจริงเพราะ client บล็อกไม่ให้เห็น popup ใหม่ระหว่างมี run อยู่แล้ว (R04) แต่เผื่อกรณี race condition ต้องมีข้อความรองรับ

หมายเหตุ: **ไม่มี Flow B3-เดิม (คร่อมวง raid boss) ในเอกสารนี้** — raid และการเลือกระหว่าง dungeon กับ boss อยู่นอกขอบเขต Phase 2 ทั้งหมด (`design/features/F04-dungeon-presence.md` หัวข้อ 6, F16–F17)

## 4. Flow C — Check-in: รอสัญญาณนิ่ง / เดินเข้ามาจากข้างนอก (F04-R07..R11, GD B-03)

ที่มา: GDD "Anti-cheat > มาตรการเป็นชั้น" ชั้น 1 — **ห้ามเอ่ยคำว่า anti-cheat/โกง/วิธีตรวจที่ใดในถ้อยคำ** (R10) ทุกข้อความในหัวข้อนี้พูดถึงแค่ "สัญญาณ GPS" และ "การเดินเข้าเขต" เท่านั้น

**แก้ B-01:** popup เปิดพร้อมสถานะ check-in จากผล `selectCheckInPreview` ทันทีตั้งแต่เฟรมแรก (ดู B1) — ผู้เล่นไม่ต้องกด "เข้า" ก่อนจึงรู้ว่ายังเข้าไม่ได้ ปุ่ม "เข้า" เป็น `.btn-disabled` พร้อมสถานะหนึ่งบรรทัดใต้ปุ่มตั้งแต่ต้นตราบใดที่ preview ยังไม่ผ่าน (R09) ปุ่มเปิดใช้เองอัตโนมัติทันทีที่ preview เปลี่ยนเป็นผ่าน (เรียกซ้ำทุกครั้งที่ state เปลี่ยน ตาม tech note 7.4) **ไม่ต้องกดอะไรเพิ่มหรือปิดเปิด popup ใหม่** · การกด "เข้า" เรียก `confirm` จริง ซึ่งยังถูกปฏิเสธได้ในกรณี race (สถานะเปลี่ยนระหว่างที่นิ้วแตะพอดี) — ถ้าเกิด แสดงผลในบรรทัดสถานะเดียวกันโดย **ไม่ปิด popup** ปุ่มกลับเป็น `.btn-disabled` ตามเหตุผลใหม่ทันที · ระหว่างรอผลของ `confirm` (สั้นมาก ไม่มี network ใน Phase 2) ปุ่มแสดง spinner ทับตัวเองแทนข้อความ

ลำดับความสำคัญของเหตุผล (R08 — แสดงทีละหมวดเดียว หมวดที่มาก่อนบังมาที่หลังเสมอแม้จะเข้าเงื่อนไขพร้อมกัน):

| ลำดับ | เหตุผล | ข้อความใต้ปุ่ม | รายละเอียดจอ |
| --- | --- | --- | --- |
| 1 | `speed_lock` | `[dungeon.checkinSpeedLocked]` ("เพิ่งเร็วเกินเดินอยู่ช่วงที่ผ่านมา ลองเดินเข้าใหม่อีกครั้ง") | ไม่มี countdown เพราะเวลาที่ต้องรอขึ้นกับการเดินจริงต่อจากนี้ · **N-04:** ปกติผู้เล่นไม่เห็นบรรทัดนี้เลยเพราะ overlay speed lock (Flow D) บังอยู่ก่อนแล้ว เกิดเฉพาะกรณี race (แตะ "เข้า" ในจังหวะที่เพิ่ง lock) — หลังปลด lock ผู้เล่นจะเห็นการนับถอยหลังของ `not_enough_trace` ตามปกติ (ลำดับ approach ล้มระหว่าง lock) [handoff: ขอ narrative-designer เขียนคำเป็นสถานะปัจจุบัน ไม่เล่าอดีตแบบ "ถูกเฝ้าดูย้อนหลัง"] |
| 2 | `poor_accuracy` | `[dungeon.checkinPoorAccuracy]` ("สัญญาณ GPS ไม่แม่นพอ ลองออกที่โล่ง") | ใช้ icon เดียวกับ `gps.lowAccuracy` (คนละ key เพราะบริบทต่างหน้า) |
| 3 | `not_enough_trace` | `[dungeon.checkinNotEnoughTrace]` ("กำลังนับเวลาที่เดินต่อเนื่อง อีก {countdown}") | **มี countdown mm:ss เป็น widget ตัวเลขสดนับถอยหลังถึง `config: anticheat.checkIn.minContinuousApproach_s`** — ค่าตั้งต้นมาจาก `readyIn_s` ของ engine (อัปเดตเฉพาะเมื่อมี sample ใหม่ ตาม tech note 7.3) **N-03:** client เดินนับถอยหลังต่อเองระหว่างสอง sample ได้เพื่อความลื่นของการแสดงผล แล้ว sync ค่าจริงใหม่ทุกครั้งที่ selector เปลี่ยน · ปุ่ม "เข้า" เปิดใช้ได้ **จากผล preview ของ engine เท่านั้น** ห้ามเปิดเพราะตัวนับฝั่ง client ถึง 00:00 เอง · ถ้าตัวนับฝั่ง client ถึง 00:00 ก่อนแต่ engine ยังไม่ยืนยันผ่าน ให้ค้างแสดงที่ 00:00 (ไม่ติดลบ ไม่มี feedback ว่าพร้อมจนกว่า engine ยืนยัน) |
| 4 | `no_approach_from_outside` | `[dungeon.checkinNoApproach]` ("ต้องเดินเข้ามาจากนอกเขต ลองเดินออกแล้วกลับเข้ามา") | ไม่มี countdown (ขึ้นกับผู้เล่นเดินออกจริง) · กรณีย่อยที่ sample ล่าสุดอยู่นอก polygon จริง (ไม่ใช่แค่ยังไม่ครบลำดับ) ใช้ `[dungeon.outOfRangeTitle]` แทน — ดู B5 (แก้ B-07) |

เมื่อครบทุกเงื่อนไข (ไม่มีเหตุผลเหลือ) → ปุ่ม "เข้า" กลับเป็น `.btn-primary` ปกติทันที ไม่มีข้อความ "พร้อมแล้ว" คั่นกลาง (ลดจังหวะอ่านเพิ่ม)

**กรณีเปิดแอปครั้งแรกขณะยืนกลางสวน (E4 ของสเปก):** เจอ `no_approach_from_outside` เสมอ (ต้องมี sample นอก polygon มาก่อนในลำดับต่อเนื่อง) ไม่ใช่บั๊ก — ข้อความชวนเดินออกแล้วกลับเข้ามาโดยไม่ลงโทษ

## 5. Flow D — Speed lock (overlay เต็มจอ, F04-R20..R24, GD B-02)

ที่มา: GDD "ความปลอดภัยทางกายภาพ" ชั้น 1 — ล็อกการเล่นทันทีเมื่อความเร็วเกิน `config: anticheat.speedLock.speedLock_kmh` ต่อเนื่อง `config: anticheat.speedLock.lockSustained_s`

D1. เข้าสถานะ lock (ทุกสถานะยกเว้น Ended, T11 ของสเปก) → **overlay เต็มจอทับทุกอย่างรวม header bar** (แผนที่, popup confirm, จอ run รวมจอพกกระเป๋า — แก้ N-12: header ของจอเดิม **ถูกบังด้วย** ไม่เห็นใต้ overlay กันไอคอนตั้งค่าใน header พาออกจาก lock ไปทางอื่นนอกปุ่มของ overlay เอง):
   - พื้นเกือบดำ (`ink.900`) ไม่มี animation ต่อเนื่อง (เหมือนจอพกกระเป๋า)
   - ไอคอนกึ่งกลาง (`icon.ui.speed-lock`, placeholder รอ SVG จริง A-P2-F04-T15-3) **โทนแห้ง ไม่ใช่สัญลักษณ์อันตราย** (N-12: ไม่ใช่รูปสามเหลี่ยมเตือนภัย/ไซเรน — ใช้รูปกุญแจ/นาฬิกาแทน ตาม art brief 3.6) + ข้อความบรรทัดเดียว `[anticheat.speedLockTitle]` ("เร็วเกินเดิน ระบบล็อกไว้ก่อน") + `[anticheat.speedLockBody]` ("จะปลดเองเมื่อกลับมาเดินความเร็วปกติ") — **ไม่อธิบายวิธีวัดหรือเอ่ยคำว่า anti-cheat** (R23, U7)
   - **แก้ B-03 — ปุ่มต่างกันตามว่ามี run อยู่หรือไม่:**
     - **ก่อนมี run:** มีปุ่มเดียว `[anticheat.speedLockSettings]` ("ไปตั้งค่า") ไปหน้าแรกของ `S-22-settings` (ไม่ใช่หน้าย่อย "การเดินและความปลอดภัย" ที่ฝังลึกโดยตั้งใจ) — **ไม่มีทางปิด overlay ได้นอกจากปลด lock จริง** (ไม่มีปุ่ม "ปิด"/"กลับแผนที่" อีกต่อไป เพราะปุ่มแบบนั้นเท่ากับปุ่มเล่นต่อในทางปฏิบัติ ขัด R21/R23)
     - **ระหว่าง run:** สองปุ่ม `[anticheat.speedLockSettings]` ("ไปตั้งค่า") และ `[run.exitButton]` ("ออก") — กด "ออก" เข้า popup ยืนยันออกเดิมของ Flow F ซ้อนบน overlay (popup ยืนยันใช้ได้ตามปกติ กด "ออกเลย" จบ run จริง กด "ยกเลิก" กลับมาเห็น overlay ล็อกเหมือนเดิม)
     - เข้าตั้งค่าจาก overlay ได้เสมอ เมื่อกลับจากตั้งค่าและยังล็อกอยู่ overlay กลับมาทันที ถ้าปลดล็อกระหว่างอยู่ในตั้งค่า กลับมาเจอจอตามสถานะตำแหน่งจริง ไม่ใช่ overlay
   - สั่นหนึ่งครั้งตอนเข้า lock ไม่มีเสียงวนซ้ำ (R23)
D2. ระหว่าง lock: reward tick clock หยุด ระยะไม่นับ ไม่มีการทอย damage (R21) · **ไม่เปิด popup confirm** และ check-in ไม่ผ่านถ้ากด "เข้า" ระหว่างนี้ (ครอบ Flow B/C ทั้งหมด — overlay นี้บังทุกอย่างไว้ก่อน)
D3. ปลด lock เอง เมื่อความเร็วต่ำกว่าเกณฑ์ต่อเนื่อง `config: anticheat.speedLock.unlockSustained_s` (R22) → overlay หายเอง กลับสู่จอเดิมตามสถานะตำแหน่งจริง (แผนที่/popup/run) **ไม่ต้องกดอะไร**
D4. event `anticheat_speed_lock_triggered` ยิงทั้งตอนเข้าและออก lock (P2-F04-T17 เป็นผู้กำหนด payload) — ไม่กระทบ UI ของหัวข้อนี้โดยตรง

## 6. Flow E — Run state: Active / Grace / Suspended / Ended + เตือนใกล้ปิด (F04-R12..R19, R28..R30)

`S-03-run` เป็น idle screen เหมือนเดิม (มือถือเก็บกระเป๋าได้, จอพกกระเป๋าตาม `components.md` หัวข้อ 12 ไม่เปลี่ยนในเอกสารนี้) องค์ประกอบใหม่ของ Phase 2 คือ **run-state pill** เล็กในแถบใต้ header (คงที่ทุกสถานะ ไม่ใช่แค่ตอนมีปัญหา) เพื่อให้ 4 สถานะต่างกันชัดโดยไม่ต้องอ่านตัวเลข (ตาม acceptance ของ T15): ไอคอน + คำ + สีขอบ (ไม่ใช้สีอย่างเดียว, style-guide S4) — **แก้ N-02: สีของ pill/แถบต้องตรงกับ `components.md` หัวข้อ 13.2 และ art brief 3.7 ทุกจุด** (ก่อนหน้านี้ flow กับ wireframe เขียนสีไม่ตรงกัน และ Suspended ใช้ `state.danger` ซึ่งสื่อความอันตรายทั้งที่ "ออกไปซื้อน้ำ run ยังรอ" ไม่ใช่ความผิด — ไม่มีสถานะใดใช้ `state.danger`):

| สถานะ | run-state pill (ไอคอน+คำ) | tick timer | banner เพิ่ม | ผู้เล่นเห็นอะไร |
| --- | --- | --- | --- | --- |
| **Active** | ● `state.success` `[run.stateActiveLabel]` ("กำลังเล่น") | เดินนับถอยหลังปกติ `[run.tickTimer]` | ไม่มี | จอปกติ ไม่มีอะไรน่ากังวล |
| **Grace** | ◐ `state.info` `[run.stateGraceLabel]` ("กำลังยืนยันตำแหน่ง" — key ใหม่แยกจาก `run.stateGrace` ที่เป็นข้อความ banner ยาวกว่า, N-02) | **หยุดนับ** เปลี่ยนเป็น `[run.tickPausedLabel]` ("หยุดนับชั่วคราว") แทนตัวเลข | `banner.info` เล็กไม่บล็อกจอ ข้อความ `[run.stateGrace]` | ไม่ตกใจ (แค่ GPS drift ปกติ, ≤ `config: dungeons.runState.graceMax_s`) |
| **Suspended** | ■ **`state.info` เต็มพื้น pill** (ไม่ใช่ `state.danger`) `[run.stateSuspendedLabel]` ("หยุดชั่วคราว") | ยังเป็น `[run.tickPausedLabel]` | **แก้ C-5 (ชื่อ variant):** เต็มความกว้าง **ขอบ/ข้อความ `state.info`** (ไม่ใช่ `state.danger` — แก้ N-02) ค้างตลอดสถานะ `[run.stateSuspended]` ("run หยุดชั่วคราว กลับเข้าเขตภายใน {timeLeft}") — **ไม่ใช้ชื่อ `banner.warn`** (ชนกับ `components.md` หัวข้อ 6 ที่นิยาม `.banner.warn` เป็นข้อความสี `state.danger` จริง เช่นป้ายเตือน auto-retreat ปิดอยู่ ซึ่งเป็นคำเตือนจริง ต่างจากที่นี่) ใช้ชื่อชั่วคราว **`banner.info-full`** (ส่วนขยายเต็มความกว้างของ `.banner.info` เดิมที่ Grace ใช้แบบขอบบาง) จนกว่า art-director/uiux จะยืนยันชื่อทางการใน `components.md` [handoff: เพิ่ม `.banner.info-full` เป็นแถวใหม่ในหัวข้อ 6 ของ `components.md` — นอก `writes` ของงานนี้] | ยังไม่จบ run ออกไปซื้อน้ำ/เข้าห้องน้ำได้ (≤ `config: dungeons.runState.suspendedMax_s`) |
| **Ended** | — (ออกจากจอ run ทันที) | — | — | ไปหน้าสรุปผลอัตโนมัติ (Flow F) ไม่ใช่จอ run |

[handoff art-director: pill/header ยังใช้ glyph placeholder ◐/■ รอ SVG จริงของ `icon.ui.grace`/`icon.ui.suspended` ตาม art brief 3.7 (A-P2-F04-T15-3 เดิม ยังไม่ปิด) — โทนสีด้านบนยึดตาม `components.md`/art brief ที่ยืนยันแล้ว ไม่ใช่ข้อเสนอใหม่ของรอบนี้]

กลับจาก Grace/Suspended เป็น Active (T8): pill กลับเป็น `state.success` + toast สั้น `[run.stateResumed]` ("กลับเข้าเขตแล้ว") นาฬิกา tick เดินต่อจากเดิม **ไม่รีเซ็ต** (R13)

**N-11 (tick timer, backdating D-094):** ตัวเลขนับถอยหลังของ `[run.tickTimer]` แสดงค่าจาก selector ของ engine (`selectRunView().nextTickIn_s`) เท่านั้น **ยอมให้กระโดดได้** เมื่อ backdating ยืนยันชุดออก/กลับเข้าย้อนหลัง — ถ้าตัวนับถึง 00:00 ระหว่างที่ยังรอ engine ยืนยัน (hysteresis ยังไม่ครบ) ให้แสดงสถานะรอกลางๆ ไม่มี feedback ว่าได้รางวัลจนกว่า engine จะส่ง `run_tick_granted`/`run_tick_denied` จริง (client ห้ามเปิดปุ่มหรือแสดง tick จากนาฬิกาตัวเอง) — รายละเอียดการแสดงผล tick เต็มรูปแบบอยู่ใน flow F05 (P2-F06-T03) เอกสารนี้ยืนยันแค่ว่าใช้กติกาเดียวกัน

**เตือนใกล้ปิด ระหว่าง run** (R29): เมื่อเหลือเวลาถึงปิดเท่ากับ `config: dungeons.openingHours.closingSoonNotice_s` แจ้งครั้งเดียว: สั่น 1 ครั้ง + `banner.warn` `[run.closingSoonWarning]` ("จะปิดในอีก {timeLeft} เดินเก็บของให้ครบก่อนได้") ค้างจนกว่าจะปิดจริงหรือผู้เล่นออกเอง — ใช้ร่วมกับ pill สถานะเดิมได้ (ไม่ทับกัน วางคนละตำแหน่ง) · **N-07:** ถ้าผู้เล่นเข้า run **หลัง** จุดแจ้งเตือนไปแล้ว (พึ่งเห็นแค่ครั้งเดียวใน popup confirm ตาม tech note 8.3 ไม่แจ้งซ้ำ) จอ `S-03-run` แสดง banner ใกล้ปิดนี้ตั้งแต่เริ่ม run เลย **โดยไม่สั่น** (ไม่ใช่การแจ้งครั้งที่สอง แค่ทำให้ข้อมูลไม่หายตอนเก็บมือถือกลับกระเป๋าไปแล้ว)

**ปิดทำการระหว่าง run** (R30, E11, E12): ไม่ว่าอยู่สถานะใด (รวม Suspended) → run จบด้วย `dungeon_closed` ทันที ไม่รอ timeout ของเก็บครบ tick ที่ค้างจ่ายตามกฎ D-059 ไม่มีการเตะแบบลงโทษและไม่ต้องเดินออกเพื่อจบ → ไป Flow F

**ไม่มีปุ่มให้ผู้เล่นเปลี่ยน run state เอง** (R19) นอกจากปุ่มออกเอง (`[run.exitButton]`, ครึ่งล่างจอเสมอ → popup ยืนยัน `[run.exitConfirmTitle]`/`[run.exitConfirmBody]`/`[run.exitConfirmButton]`/`[run.exitConfirmCancel]` เหมือน F03 หัวข้อ 4.7 ไม่เปลี่ยน)

## 7. Flow F — สรุปผล run ต่อ exit_reason (F04-R17, R18, E10, E11)

`S-04-run-summary` เป็นทางออกเดียวของทุกเส้นทางใน Flow นี้ หัวข้อบอกสาเหตุที่จบให้ชัด ไม่ใช้คำเดียวกันทุกกรณี ของที่เก็บได้แสดงเสมอ (ไม่หายจากการจบ run เอง — หายเฉพาะกรณีตายซึ่งเป็นกลไกของ F06) รายละเอียดกลไก HP/auto-retreat/ตาย อยู่ใน spec F06 เอกสารนี้ระบุแค่ **หัวข้อจอสรุปที่ต้องมีให้ครบทุก `exit_reason`** ของ F04:

| `exit_reason` | หัวข้อจอสรุป (copy key) | ของที่เก็บได้ | หมายเหตุ |
| --- | --- | --- | --- |
| `manual_exit` (R17, กดออกเอง) | `[run.summary.exited]` ("ออกเอง ของอยู่ครบ") | ครบ | เหมือน F03 หัวข้อ 4.7 ไม่เปลี่ยน |
| `dungeon_closed` (R17, R30 — ถึงเวลาปิดระหว่าง run) | **ใหม่** `[run.summary.dungeonClosed]` ("โซนปิดแล้ว ของอยู่ครบ") | ครบ (tick ค้างจ่ายตาม D-059) | ต่างจาก `emergency_close` ของ moderator (คนละเหตุ คนละหัวข้อ) — ไม่ต้องเดินออกเพื่อจบ ไม่ใช่การลงโทษ |
| `timeout` (R17, R18 — เวลานอกเกิน `suspendedMax_s`) | **แก้ B-08, J-4:** `[run.summary.timeout]` ("อยู่นอกเขตนานเกินไป run จบแล้ว ของอยู่ครบ") — key ใหม่ ไม่ใช้ `run.summary.connectionLost` ซ้ำอีกต่อไป (คำนั้นเก็บไว้ให้ `exit_reason: connection_lost` ของ F08/Phase 3 เท่านั้น) | **ครบ** (หน้าต่างที่ค้างไม่จ่ายตาม F05-R21 — ของใน run ที่เก็บไปแล้วไม่หาย ไม่ใช่ "เท่าที่ระบบยืนยัน" ซึ่งสื่อว่าของบางส่วนหาย) | เวลาจบ = จุดเริ่มของการออก + `suspendedMax_s` (R18) เปิดแอปกลับมาเจอหน้านี้ตรงๆ ไม่ใช่จอ run · เจตนาของ key ใหม่: "อยู่นอกเขตนานเกินไป run จบ ของอยู่ครบ" ไม่แตะเรื่องการตรวจ (U7) |
| `death` (F06) | `[run.summary.died]` ("คุณตาย ของหายหมด") | ว่างเสมอ | รายละเอียดเต็มเป็นของ spec/flow F06 |
| `auto_retreat` (F06) | `[run.summary.autoRetreated]` ("ถอยอัตโนมัติ ของอยู่ครบ") | ครบ | รายละเอียดเต็มเป็นของ spec/flow F06 |
| `clock_invalid` (E10 — นาฬิกาเครื่องเพี้ยน/ถูกตั้งย้อน) | **ใหม่** `[run.summary.clockInvalid]` ("เวลาที่เครื่องเพี้ยน run จบแล้ว ของอยู่ครบ") | ครบ (ไม่ริบของเดิม) | จบ ณ เวลาเหตุการณ์ล่าสุดที่ตรวจได้ ไม่มี tick เพิ่มจากเวลาที่ตรวจไม่ได้ |
| `emergency_close` (มีใน engine ตาม D-059 แต่ไม่มีทางเรียกนอก test ใน Phase 2) | `[run.summary.closedByModerator]` ("โซนปิดกะทันหัน") | ครบตามสัดส่วนเวลาที่อยู่จริง (D-059) | ไม่ปรากฏจากการเล่นจริงใน Phase 2 (หลังบ้านยังไม่มี) แต่ component ต้องรองรับไว้เพราะ engine มี state นี้ (ใช้ทดสอบผ่าน test hooks) |

ปุ่มเดียวเด่นสุดเต็มความกว้างครึ่งล่างจอทุกกรณี `[run.summaryContinue]` ("เดินต่อเพื่อรับเพิ่ม") → กลับ `S-01-map` เสมอ ไม่มีหน้าจอปลายทางอื่น (เหมือน F03 หัวข้อ 4.8 ไม่เปลี่ยน)

## 8. ตารางสถานะที่ต้องมีทุกจอ

นิยามสถานะเหมือน F03 หัวข้อ 7 ตารางนี้ครอบเฉพาะจอของ F04 (แผนที่/นำทาง, popup confirm, check-in, speed lock, run state) — จอ home 4 สถานะ (ใกล้/ไกล/นอกพื้นที่/ไม่รู้ตำแหน่ง) อยู่ใน `ia.md` หัวข้อ 4 และ `F03-core-loop.md` Flow D ไม่เขียนซ้ำ

| จอ | empty | loading | GPS ปิด | accuracy ต่ำ | offline | dungeon ปิด | นอกระยะ | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| แผงระยะ+นำทาง (A2) | — (ไม่มีจำนวนคนให้ว่าง) | skeleton ตัวเลขระยะ + spinner สั้นรอ GPS fix | ไม่แสดงระยะ/ทิศ กลับสู่สถานะ "ไม่รู้ตำแหน่ง" ของ `ia.md` | ระยะ/ทิศแสดงแบบ `[nav.distanceApprox]` ("ราว {distanceText}", **แก้ P2-X30** จาก `nav.approximateDistancePrefix` เดิม) แทนตัวเลขนิ่ง ยังปัดขึ้นตามกฎเดิม (N-09) | ใช้ค่า cache ล่าสุด + `[common.lastUpdated]` ({timeAgo}) — ปุ่มนำทางและลิงก์รอง fallback ยังกดได้ปกติ (แก้ B-02: offline ไม่ปิดการใช้งานปุ่มใดในแผงนี้) | เวลาเปิดถัดไปแสดงก่อนปุ่มนำทาง (A2) ปุ่มนำทางยังกดได้ | ปุ่มนำทางยังกดได้เสมอ (ไม่ใช่ concept ของแผงนี้) | `[common.error]` + `[common.retry]` |
| `S-02-dungeon-confirm` (Flow B) | ไม่มีบรรทัดจำนวนคนอยู่แล้ว (override) | **แก้ B-01:** ไม่มี loading รอตัดสินหลังกดอีกต่อไป — สถานะ check-in แสดงจาก preview ทันทีที่ popup เปิด · spinner สั้นทับปุ่มเฉพาะระหว่างรอผลจริงของ `confirm` หลังกด "เข้า" | ป้องกันไม่ให้ popup เปิดถ้ายังไม่รู้ตำแหน่ง (ย้อนไป `ia.md` D3) | เข้าเงื่อนไข check-in `poor_accuracy` (Flow C) ไม่ใช่ state แยก | **แก้ B-02:** ไม่มีผลใดต่อปุ่ม "เข้า"/"ยกเลิก" — Phase 2 ไม่มี server, `confirm` เป็น `sessionStep` ในเครื่องล้วน ไม่ใช่ request ไม่มี `common.offlineNotice` ในจอนี้ | ดู B4 | ดู B5 (บรรทัดสถานะใต้ปุ่ม ไม่ใช่ popup แยก) | `[common.error]` ทั่วไป |
| Check-in (Flow C) | — | **แก้ B-01:** ไม่มีช่วง loading รอผลประเมินแรกอีกต่อไป (preview พร้อมตั้งแต่เปิด popup) | ไม่ควรเกิด (popup ไม่เปิดถ้าไม่รู้ตำแหน่ง) | → `poor_accuracy` (ลำดับ 2) | **แก้ B-02:** ไม่มีผลใด — `confirm` ไม่ใช่ request ผ่านเน็ต ปุ่ม "เข้า" ทำงานตามผล `selectCheckInPreview` ตามปกติไม่ว่าออนไลน์หรือไม่ | → `dungeon.outOfRangeTitle` เมื่อ sample ล่าสุดอยู่นอก polygon จริง (แก้ B-07, ดู B5) มิฉะนั้น → `no_approach_from_outside` (ลำดับ 4) ตามปกติ | `[common.error]` + log ให้ QA |
| Speed lock overlay (Flow D) | — | — | ไม่เกี่ยวข้อง (ล็อกจากความเร็วไม่ใช่ตำแหน่ง) | ไม่เกี่ยวข้อง | คำนวณความเร็วจาก sample ในเครื่องได้โดยไม่ต้องมีเน็ต (Phase 2 ไม่มี server) | ไม่เกี่ยวข้อง | ไม่เกี่ยวข้อง | ไม่เกี่ยวข้อง |
| `S-03-run` run state (Flow E) | ไม่มีคนอื่นอยู่แล้ว (Nearby Party ไม่มีใน Phase 2) | spinner สั้นทับ tick timer ตอน resume หลังเปิดแอปกลับมา | เข้า Grace/Suspended ตาม Flow E ไม่ใช่ error แยก (เหมือน accuracy ต่ำ) | เข้า Grace/Suspended เช่นกัน (ไม่มีหลักฐานว่าอยู่ใน ตามนิยามสเปกหัวข้อ 3.3) | **แก้ B-02: ไม่แสดง banner ออฟไลน์ใดในจอ run ของ Phase 2** (ไม่มีอะไรที่ผู้เล่นต้องทำ ตาม pillars P4 — Phase 2 ไม่มี server ให้หลุดจริง) `gps.offlineInRun` เก็บไว้ให้ Phase 3 | จบด้วย `dungeon_closed` ทันที (R30) → Flow F | คือ Grace/Suspended เอง | `[common.error]` + log ให้ QA run ไม่ถูกล้าง |

## 9. แอปถูกย่อ/ปิด และเน็ตหลุด

- **หน้าเว็บถูกซ่อน (visibility hidden) / จอล็อกเอง / แอปถูกปิด แล้วเปิดใหม่** (E7 ของสเปก): sample หยุดเก็บ → นับเป็น "ไม่มีหลักฐาน" ตามนิยามหัวข้อ 3.3 ของสเปก ตั้งแต่ sample ที่ใช้ได้ตัวสุดท้าย เปิดแอปกลับมาภายใน `suspendedMax_s` และอยู่ในเขต = กลับ Active ทันที ไม่ต้อง check-in ใหม่ (R13) · เกิน = เห็นหน้าสรุปผล `timeout` ทันทีที่เปิดแอป ไม่ใช่จอ run (R18, หัวข้อ 7)
- **Wake Lock ถูก OS ปล่อยเอง** เมื่อ tab ถูกซ่อน: client ขอใหม่ทันทีที่ visibility กลับมา visible โดยไม่ต้องแจ้งผู้เล่น (เหมือน `components.md` หัวข้อ 12.2 ไม่เปลี่ยน)
- **เน็ตหลุด** (E8, แก้ B-02): Phase 2 ไม่มี server จึงไม่มีผลใดต่อ run state หรือ movement gate เลย — และ**ไม่มีผลใดต่อปุ่ม "เข้า"/"ออกเอง" เลย** เพราะทั้งคู่เป็น `sessionStep` ในเครื่องล้วน ไม่ใช่ request ที่ต้องยิงออกนอกเครื่อง (ต่างจาก Phase 3 ที่จะมี server) — มีแค่ banner `[gps.offline]` บนแผนที่ (นอก run) ตามข้อเท็จจริง **ห้ามใช้คำว่า "หยุด"/"เสีย"** เพราะ run ยังไม่ขาด · **จอ run ไม่แสดง banner ออฟไลน์ใดใน Phase 2** (ไม่มีอะไรที่ผู้เล่นต้องทำ ตาม pillars P4) · แผงนำทาง fallback (A3) ใช้ `navigator.onLine === false` เพื่อโชว์คู่ลิงก์ทันทีเท่านั้น ไม่ใช่เพื่อ disable ปุ่มใด · พฤติกรรมออฟไลน์ที่ต้อง disable ปุ่มจริง (เพราะมี server) เป็นของ flow F08 ใน Phase 3
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
| `run.summary.timeout` | "อยู่นอกเขตนานเกินไป run จบแล้ว ของอยู่ครบ" | label | **ใหม่ (แก้ B-08, J-4)** หัวจอสรุป `exit_reason: timeout` — ไม่ใช้ `run.summary.connectionLost` ซ้ำอีกต่อไป คีย์นั้นสงวนให้ `exit_reason: connection_lost` ของ F08/Phase 3 |
| `run.stateGraceLabel` | "กำลังยืนยันตำแหน่ง" | label | **ใหม่ (แก้ N-02)** ข้อความสั้นบน run-state pill สถานะ Grace — แยกจาก `run.stateGrace` ที่เป็นข้อความ banner ยาวกว่า (เหมือนคู่ `run.stateSuspendedLabel`/`run.stateSuspended` ที่มีอยู่แล้ว) |
| `nav.returnBeforeArrive` | "ใกล้ถึงแล้วสลับกลับมาเปิดเกมค้างไว้ก่อนเดินเข้าเขต" | message | **ใหม่ (แก้ B-06, J-6)** บรรทัดใต้ปุ่มนำทางในแผง A2 (ทั้งสถานะใกล้และไกล) และแผง fallback — ห้ามอธิบายว่าเกมตรวจอะไร (U7) |
| `nav.fallbackCoordinateLabel` | "พิกัดปลายทาง" | label | **ใหม่ (แก้ B-05)** ป้ายกำกับก่อนพิกัด lat,lng ในแผง fallback A3 (tech note 14.3) |
| `nav.fallbackCopyCoordinateButton` | "คัดลอกพิกัด" | button | **ใหม่ (แก้ B-05)** ปุ่มคัดลอกพิกัดแยกจากปุ่มคัดลอกชื่อ (`nav.fallbackCopyButton`) ในแผง fallback A3 |
| `anticheat.speedLockSettings` | "ไปตั้งค่า" | button | **ใหม่ (แก้ B-03)** ปุ่มเดียวของ overlay speed lock ก่อนมี run และปุ่มแรกของสองปุ่มระหว่าง run — ไปหน้าแรกของ `S-22-settings` ไม่ใช่หน้าย่อยที่ฝังลึก |
| `map.reopenConfirmButton` | "เข้าโซนนี้" | button | **ใหม่ (แก้ N-10)** ปุ่มเปิด popup confirm ใหม่ด้วยตัวเองหลังกด "ยกเลิก" ใน B1 — ปุ่มเด่นสุดครึ่งล่างจอของสถานะ "อยู่ในเขต" ใน `S-01-map` |
| `dungeon.overlapHint` | "เลือกโซนก่อนแล้วกดเข้า" | label | ใช้ใน B2 ใต้การ์ดซ้อน (มีอยู่แล้วใน wireframe แต่ตกหล่นจากรายการนี้ในรอบ 1 — เติมให้ครบ) |

### 10.2 Key ที่มีอยู่แล้วและใช้ซ้ำตรงๆ (ไม่แก้)

`nav.map`, `dungeon.confirmTitle`, `dungeon.confirmLevel`, `dungeon.confirmEnter`, `dungeon.confirmCancel`, `dungeon.overlapTitle`, `dungeon.closedTitle`, `dungeon.closedBody`, `dungeon.closedEmergencyBody`, `dungeon.closedDismiss`, `dungeon.outOfRangeTitle`, `dungeon.alreadyActive`, `common.close`, `common.error`, `common.retry`, `common.lastUpdated`, `map.riftClosed`, `map.navigateButton`, `gps.pillLabel`, `gps.offline`, `gps.lowAccuracy`, `gps.lowAccuracyBody`, `run.exitButton`, `run.exitConfirmTitle`, `run.exitConfirmBody`, `run.exitConfirmButton`, `run.exitConfirmCancel`, `run.stateGrace`, `run.stateSuspended`, `run.stateResumed`, `run.tickTimer`, `run.summary.headerLabel`, `run.summary.exited`, `run.summary.died`, `run.summary.autoRetreated`, `run.summary.closedByModerator`, `run.summaryRewardList`, `run.summaryRewardEmpty`, `run.summaryRewardLost`, `run.summaryContinue`, `nav.distanceApprox` (**แก้ P2-X30** — ย้ายมาจากหัวข้อ 10.1 เดิมที่เขียนชื่อผิดเป็น `nav.approximateDistancePrefix` ("ประมาณ") คีย์จริงใน `copy.th.json` คือ `nav.distanceApprox` = "ราว {distanceText}" (`kind: label`) เป็นเทมเพลตแทนค่า `{distanceText}` ทั้งค่า ไม่ใช่คำนำหน้าที่โค้ดต่อเอง จึงไม่ใช่ "key ใหม่ที่ยังไม่มี" ตามที่ 10.1 เคยจัดไว้ — มีอยู่แล้วจริง ใช้ซ้ำได้ตรงๆ)

**แก้ C-5 — สงวนไว้ Phase 3 (F08), ไม่ใช้ใน Phase 2:** `common.offlineNotice`, `common.offlineRetry`, `gps.offlineInRun`, `run.summary.connectionLost`, `run.summary.connectionLostBody` — ทั้งหมดผูกกับพฤติกรรม disable ปุ่มตอนออฟไลน์ที่ต้องมี server (B-02 ลบพฤติกรรมนี้ออกจาก Phase 2 แล้ว) ห้าม build ใส่กลับเป็น "ใช้ซ้ำได้" เพราะเคยอยู่ในรายการเดียวกับ key ที่ยังใช้จริงด้านบน

### 10.3 Key เดิมที่ context ต้องแก้ตามกฎใหม่ (handoff เป็น decision ให้ narrative-designer ยืนยัน)

`map.nearestRiftFound` และ `home.farBody` เขียน context ไว้ว่า "ระยะจริง ไม่ปัด" (ก่อนคำตัดสิน A-3/R34) — R34 ของสเปกปัจจุบันสั่งให้ **ปัดขึ้นเป็นขั้นเสมอ** (ห้ามปัดลง) เอกสารนี้เสนอแก้ context ทั้งสอง key เป็น "ระยะเส้นตรง ปัดขึ้นเป็นขั้น ไม่หลอกว่าใกล้กว่าจริง" และให้ทั้งสอง message ต่อท้ายด้วย `nav.straightLineTag` เสมอ (ไม่ใช่ปัญหาเชิงความหมายเพราะปัดขึ้นยังคง "ไม่หลอกว่าใกล้" ตามเจตนาเดิม)

**แก้ B-07:** `dungeon.outOfRangeTitle` มี context เดิมเขียนว่า "server พบ ... ปิด popup" ซึ่งไม่ตรงกับ Phase 2 (ไม่มี server) และไม่ตรงกับพฤติกรรมใหม่ (เป็นบรรทัดสถานะใต้ปุ่ม ไม่ใช่ popup ที่ปิดตัวเองทันที) — ขอให้ narrative-designer แก้ context เป็น "บรรทัดสถานะใต้ปุ่ม 'เข้า' เมื่อ GPS ยังไม่นิ่งพอที่ขอบเขต ปิดเองเมื่อเดินออกจริงต่อเนื่องครบเกณฑ์" ข้อความเดิมยังใช้ได้ ไม่ต้องเปลี่ยนคำ

## 11. สมมติฐานและคำถามค้าง

- [ปิดแล้ว — A-P2-F04-T15-1: การ์ดซ้อน (B2) ใน Phase 2 ไม่มีข้อยกเว้นโชว์ "0 คน" อีกต่อไป **ยืนยันโดย game-director ใน `design/reviews/F04-flow-approval.md` J-2** (ปิด A-P1-F03-T16-3 สำหรับ Phase 2 ไม่มีข้อยกเว้น การกลับมาของข้อยกเว้นใน Phase 3 เป็นคำถามของ flow F09 ไม่ใช่ค่าเริ่มต้น)]
- [ปิดแล้ว — A-P2-F04-T15-2: `{directionText}` ใช้คำทิศ 8 ทิศจากรายการคงที่ แปลงจากองศาที่ engine คำนวณ ไม่ใช่ตัวเลของศาดิบ **ยืนยันโดย game-director ใน J-3** ตรงกับ D-097 (ลูกศร snap 8 ทิศ) · คำเป็นของ narrative-designer, mapping องศา→คำเป็นของ gameplay-programmer]
- [ยังเปิดอยู่ — A-P2-F04-T15-3: ไอคอนลูกศรทิศทาง (snap 8 ทิศ ไม่ใช่หมุนตามองศาจริงอีกต่อไป, แก้ B-04) และไอคอนสถานะของ run-state pill (● Active, ◐ Grace, ■ Suspended) ยังไม่มี SVG จริงจาก icon-grammar — wireframe ใช้ glyph พื้นฐานแทนชั่วคราว ต้องเพิ่มเป็นรายการใหม่ใน `art/direction/icon-grammar.md` ก่อน build จริง · owner: art-director, artist-2d]
- [ปิดแล้ว — A-P2-F04-T15-4: **แก้ B-08 ตามคำตัดสิน J-4 ของ game-director** — ไม่ใช้ `run.summary.connectionLost` ซ้ำสำหรับ `exit_reason: timeout` อีกต่อไป เพิ่ม key ใหม่ `run.summary.timeout` แทน (หัวข้อ 7, 10.1) เพราะ timeout ของ Phase 2 เกิดจากอยู่นอกเขตนานเกิน `suspendedMax_s` (มีสัญญาณก็เกิดได้) ไม่ใช่ "การเชื่อมต่อหลุด" และ body เดิม "ได้ของเท่าที่ระบบยืนยัน" ขัดกับ F05-R21 (ของใน run เก็บครบ)]
- คำถาม (ส่งต่อ design gate P2-F05-T18): pill สถานะ run-state ใหม่ (หัวข้อ 6) เป็นองค์ประกอบที่ไม่มีใน `components.md` เดิม — **ตอบแล้ว:** เพิ่มแล้วเป็นคอมโพเนนต์ทางการใน `design/ux/components.md` หัวข้อ 13.2 (chip สถานะ dungeon), 13.3 (แถว check-in), 13.4 (speed-lock overlay), 13.5 (ลูกศรทิศ), 13.6 (เส้นแบ่งขอบ HP), 13.8 (chip ระยะเส้นตรง) — เอกสารนี้แก้ให้ตรงกับสเปกนั้นในรอบนี้ (N-02, N-12)
- คำถาม (playtest P2-F06-T27, สืบเนื่องจากสเปกหัวข้อ 10): สัดส่วนคนที่เจอ `no_approach_from_outside` ครั้งแรกและเวลาที่เสียไป — ถ้าสูงมาก อาจต้องออกแบบ empty-state ของแผงระยะ+นำทางให้ชี้ชัดขึ้นว่า "ต้องเดินผ่านขอบเขต" ก่อนถึง dungeon
- **คำถาม playtest ใหม่ (แก้ B-06 ข้อ 4):** สัดส่วนผู้เล่นที่ใช้แอปนำทางภายนอกแล้วสลับกลับมาเจอ `no_approach_from_outside` ตอนมาถึงเขต (ทั้งที่มีบรรทัด `nav.returnBeforeArrive` เตือนไว้แล้ว) และเวลาเฉลี่ยที่เสียไปจากการเดินออกแล้วกลับเข้าใหม่ — ถ้าสูง ต้องกลับมาคุยกับ game-director ว่าจะผ่อนอะไรได้อีกโดยไม่ลดเงื่อนไข check-in (ข้อ 2 ของ J-6 ยังยืน)

## 12. รอบ 2: สิ่งที่แก้ (P2-X02 ตอบ `design/reviews/F04-flow-approval.md`)

ตารางนี้ให้ game-director ตรวจเฉพาะข้อ blocking และจุดที่แก้ตามเงื่อนไขการตรวจซ้ำของ gate (หัวข้อ 7 ของรีวิว)

| ข้อ | สิ่งที่แก้ | ตำแหน่งในเอกสารนี้ |
| --- | --- | --- |
| B-01 | popup เปิดพร้อมสถานะ check-in จาก `selectCheckInPreview` ตั้งแต่เฟรมแรก ไม่ใช่หลังกด "เข้า" · กด "เข้า" ที่ถูกปฏิเสธ (race) แสดงผลในบรรทัดเดิมไม่ปิด popup | หัวข้อ 3 B1, หัวข้อ 4 ย่อหน้าแรก, หัวข้อ 8 แถว `S-02-dungeon-confirm`/Check-in คอลัมน์ loading |
| B-02 | ออฟไลน์ไม่มีผลใดต่อปุ่ม "เข้า"/"ออกเอง"/ปุ่มในแผงนำทาง (Phase 2 ไม่มี server) · จอ run ไม่แสดง banner ออฟไลน์ | หัวข้อ 8 แถว `S-02-dungeon-confirm`, Check-in, `S-03-run` คอลัมน์ offline · หัวข้อ 9 ย่อหน้า "เน็ตหลุด" |
| B-03 | overlay speed lock: ก่อนมี run มีปุ่มเดียว (ตั้งค่า) ปิดเองไม่ได้นอกจากปลด lock จริง · ระหว่าง run เพิ่มปุ่ม "ออก" เข้า popup ยืนยันเดิม · เพิ่ม copy key `anticheat.speedLockSettings` | หัวข้อ 5 D1, หัวข้อ 10.1 |
| B-04 | ลูกศร snap 8 ทิศ อัปเดตเฉพาะ sample ใหม่ ไม่หมุนตามองศาต่อเนื่อง ชี้ `nav_destination.point` (ไม่ใช่ขอบ polygon ที่ใกล้สุด) ระยะยังวัดถึงขอบตาม R34 | หัวข้อ 2 A2 ย่อหน้าทิศ |
| B-05 | A3 ตรงกับ tech note 14.2–14.3: fallback เกิดจาก `externalOpenTimeout_ms`/offline/ลิงก์รอง ไม่ใช่ "deep link ใช้ไม่ได้" ลอยๆ · แผงแสดงชื่อ+พิกัดพร้อมปุ่มคัดลอกแยกกัน · ปิดเมื่อผู้เล่นกดปิดเท่านั้น | หัวข้อ 2 A3, หัวข้อ 10.1 (`nav.fallbackCoordinateLabel`, `nav.fallbackCopyCoordinateButton`) |
| B-06 | เพิ่มบรรทัด `nav.returnBeforeArrive` ใต้ปุ่มนำทางทั้งสถานะใกล้/ไกล และแก้ `⤷` ของ A3 ให้ตรงความจริง (ต้องกลับมาเปิดเกมก่อนเดินเข้าเขต) ไม่ผ่อนเงื่อนไข check-in | หัวข้อ 2 A2/A3, หัวข้อ 11 คำถาม playtest ใหม่ |
| B-07 | ลบ B5 แบบ popup แยก เปลี่ยนเป็นบรรทัดสถานะใต้ปุ่ม "เข้า" (`dungeon.outOfRangeTitle`) เมื่อ sample ล่าสุดอยู่นอก polygon จริง popup ปิดเองตาม hysteresis ไม่ใช่ปิดจาก sample เดียว | หัวข้อ 3 B5, หัวข้อ 4 แถวลำดับ 4, หัวข้อ 8 แถว Check-in/นอกระยะ, หัวข้อ 10.3 |
| B-08 | หน้าสรุป `timeout` ใช้ key ใหม่ `run.summary.timeout` ไม่ใช้ `connectionLost` ซ้ำ · ของที่เก็บได้ = ครบ (หน้าต่างค้างไม่จ่าย) | หัวข้อ 7 แถว `timeout`, หัวข้อ 10.1, หัวข้อ 11 (ปิด A-P2-F04-T15-4) |
| N-01 | ไม่มี element/ช่องว่างสำหรับจำนวนคนใน B1 เลย (ไม่ใช่แค่ไม่ render) | หัวข้อ 3 B1 |
| N-02 | สี pill/banner ของ Grace/Suspended ตรงกับ `components.md` 13.2 (state.info ไม่ใช่ state.danger) เพิ่ม key `run.stateGraceLabel` | หัวข้อ 6 ตาราง, หัวข้อ 10.1 |
| N-03 | ตัวนับ `not_enough_trace` เดินต่อฝั่ง client ได้แต่ sync จาก engine เสมอ ปุ่มเปิดจาก preview เท่านั้น ค้างที่ 00:00 ถ้า engine ยังไม่ยืนยัน | หัวข้อ 4 แถวลำดับ 3 |
| N-04 | ระบุว่า `speed_lock` ในแถว check-in เป็นกรณี race เพราะปกติ overlay บังอยู่ก่อนแล้ว | หัวข้อ 4 แถวลำดับ 1 |
| N-05 | B2 แสดงเฉพาะแห่งที่เปิดอยู่ ถ้าเหลือแห่งเดียวใช้ B1 ไม่พรีเซเล็กการ์ด หลังเลือกอ่าน preview ของแห่งที่เลือก | หัวข้อ 3 B2 |
| N-06 | เพิ่มกรณี `unsupported_mode` แสดงเหมือน B4 | หัวข้อ 3 B4 |
| N-07 | จอ run แสดง banner ใกล้ปิดตั้งแต่เริ่มถ้าเข้าหลังจุดแจ้งเตือน ไม่สั่นซ้ำ | หัวข้อ 6 ย่อหน้าเตือนใกล้ปิด |
| N-08 | ย้ำว่าการ์ดแนะนำเลือกเฉพาะแห่งเปิดอยู่ ช่วงเลเวลครอบก่อน | หัวข้อ 2 A2 ย่อหน้าแรก |
| N-09 | เพิ่ม key `nav.approximateDistancePrefix` ("ประมาณ") ยืนยันยังปัดขึ้น — **ชื่อ key แก้เป็น `nav.distanceApprox` ใน P2-X30 (หัวข้อ 14) ให้ตรงกับ `copy.th.json` จริง ผลของ N-09 (ยังปัดขึ้นเสมอ) ไม่เปลี่ยน** | หัวข้อ 2 A2, หัวข้อ 8, หัวข้อ 10.2 (ย้ายจาก 10.1 เดิม) |
| N-10 | เพิ่ม key `map.reopenConfirmButton` และตำแหน่ง (ครึ่งล่างจอสถานะ "อยู่ในเขต") | หัวข้อ 3 B1, หัวข้อ 10.1 |
| N-11 | tick timer ใช้ค่าจาก selector เท่านั้น ยอมกระโดดได้ ไม่มี feedback รางวัลก่อน engine ยืนยัน | หัวข้อ 6 ย่อหน้า N-11 ใหม่ |
| N-12 | header ถูก overlay speed lock บังด้วย (ตัดสินแล้ว) ไอคอนโทนแห้งไม่ใช่สัญลักษณ์อันตราย | หัวข้อ 5 D1 |
| N-13 | เพิ่มหมายเหตุที่หัว `F03-core-loop.md` ชี้มาที่ flow นี้ | ไฟล์ `design/ux/flows/F03-core-loop.md` (แก้แยกในรอบนี้ด้วย) |
| N-14 | ชี้ไปที่ flow F06 ให้ครอบประเด็น exp คงอยู่ตอนตาย — **ไม่แก้ในเอกสารนี้** (เหตุผล: เป็นขอบเขตของ spec/flow F06 ตามที่ระบุไว้แล้วในหัวข้อ 7 แถว `death`, แก้ในเอกสารนี้จะซ้ำซ้อนกับเจ้าของจริง) | หัวข้อ 7 แถว `death` (คงเดิม อ้าง F06) |
| N-15 | เปลี่ยนชื่อตัวอย่างที่อยู่นอกย่านนำร่องและคู่ overlap ที่เป็นไปไม่ได้ทางภูมิศาสตร์ในทั้งสอง wireframe | `design/ux/wireframes/F04-01-map-navigate.html` เฟรม A1, `design/ux/wireframes/F04-02-dungeon-confirm.html` เฟรม B2 |

(REPORT ของรอบก่อนหน้า P2-X02 เก็บไว้ในประวัติ git — ดู REPORT ล่าสุดของ P2-X11 ท้ายหัวข้อ 13 ด้านล่าง)

## 13. รอบ 3: สิ่งที่แก้ (P2-X11 ตอบ `design/reviews/F04-flow-approval.md` รอบ 2 เงื่อนไข C-1..C-5)

ตารางนี้ให้ game-director ตรวจเฉพาะ C-1..C-5 ตามเงื่อนไขความสอดคล้องของ R2-3 (ไม่ขวาง build แต่ uiux ต้องแก้ก่อน design gate รวม P2-F05-T18)

| ข้อ | สิ่งที่แก้ | ตำแหน่งในเอกสารนี้ / wireframe |
| --- | --- | --- |
| C-1 | ปุ่ม "ยกเลิก" แสดงและกดได้ทุกสถานะ popup (ไม่หายไปพร้อมปุ่ม "เข้า" ที่ disable) สำคัญสุดใน B5 | หัวข้อ 3 B1 · wireframe F04-02 B1/B5, F04-03 C1/C2 |
| C-2 | เพิ่ม `nav.returnBeforeArrive` ในแผง fallback A3 ด้วย ไม่ใช่แค่ A2 | หัวข้อ 2 A3 · wireframe F04-01 A3 |
| C-3 | caption ของ F04-03 C1 แก้ให้ตรงกับ N-03 (client นับต่อได้ระหว่าง sample แต่ sync จาก engine เสมอ ไม่ใช่ "engine ล้วน ไม่ใช่ client ประมาณ") | wireframe F04-03 C1 |
| C-4 | เปลี่ยน glyph กุญแจ emoji (`&#128274;`) เป็น placeholder ข้อความ/กล่องชื่อ ไม่ใช้ emoji เป็นไอคอน | wireframe F04-03 D1a/D1b |
| C-5 | ย้าย key ออฟไลน์ (`common.offlineNotice`, `common.offlineRetry`, `gps.offlineInRun`, `run.summary.connectionLost*`) ไปบรรทัด "สงวนไว้ Phase 3" แยกจากรายการที่ใช้จริง · ตั้งชื่อ banner variant ของ Suspended ใหม่ (`banner.info-full`) ไม่ใช้ `banner.warn` ที่ชนกับนิยามเดิมของ `components.md` | หัวข้อ 10.2 · หัวข้อ 6 ตาราง Flow E แถว Suspended |

## 14. รอบ 4: แก้ carry-over ของ P2-X14 (P2-X30)

P2-X14 แก้ copy alignment ตัวนี้ให้ flow F06 แล้ว (`nav.distanceApprox` แทน `nav.approximateDistancePrefix`) แต่ไม่ได้แตะไฟล์ของ flow นี้ (นอก `writes` ของงานนั้น) เอกสารนี้ปิดส่วนที่เหลือ

1. **เปลี่ยนชื่อ `nav.approximateDistancePrefix` → `nav.distanceApprox` ทุกจุดในเอกสารนี้** — ยืนยันกับ `config/content/copy.th.json` แล้วว่า `nav.distanceApprox` เป็น key จริง (`"text": "ราว {distanceText}"`, `kind: label`) เป็นเทมเพลตแทนค่า `{distanceText}` ทั้งค่า ไม่ใช่คำนำหน้า ("ประมาณ") ที่โค้ดต่อเข้ากับตัวเลขเอง — ตำแหน่งที่แก้: หัวข้อ 2 A2 (ย่อหน้าระยะ), หัวข้อ 8 (ตารางสถานะ แถวแผงระยะ+นำทาง คอลัมน์ accuracy ต่ำ), หัวข้อ 10.1 (ลบแถวนี้ออก ไม่ใช่ "key ใหม่" อีกต่อไป), หัวข้อ 10.2 (เพิ่มเข้ารายการ key ที่มีอยู่แล้วใช้ซ้ำได้ พร้อมหมายเหตุที่มา) · แถว N-09 ของตารางหัวข้อ 12 (รอบ 2) คงข้อความประวัติเดิมไว้ (ตอนนั้นชื่อ key ยังไม่ถูกแก้จริง) พร้อมเพิ่มหมายเหตุอ้างกลับมาที่นี่ — ไม่แก้ประวัติ
2. **`design/ux/wireframes/04-run-critical.html` และ `05-run-summary.html`**: ทั้งสองไฟล์เป็นของ Phase 1 (F03) ที่ถูกแทนที่แล้วโดยไฟล์ตระกูล `F04-*`/`F05-*`/`F06-*` (F04-04-run-state-summary, F05-02-run-summary-detail, F06-03-hp-warning-autoretreat-death-recovering) และเนื้อหาไม่ตรงกับพฤติกรรม Phase 2 อีกต่อไป (ตายมีสถานะล้มในดันแบบ Phase 1 เดิม, thaidraft/key บางตัวไม่ตรง `copy.th.json`) — เลือก **เพิ่มหมายเหตุชี้ไปไฟล์ที่แทนที่** แทนการไล่แก้ copy key ทีละจุด เพราะสองไฟล์นี้จะกลายเป็นสำเนาซ้ำของ F04-04/F05-02/F06-03 ถ้าแก้ให้ตรงทุกจุด (ไม่มีเนื้อหาใหม่ที่ไฟล์ปลายทางยังไม่มี) ไม่ลบไฟล์เพราะยังมีค่าอ้างอิงเชิงประวัติบางจุด (เช่น บันทึก D-050 ท้าย `05-run-summary.html`)

## REPORT
task: P2-X11 (ส่วน F04)
status: DONE
summary: แก้เงื่อนไขความสอดคล้อง C-1..C-5 จากรีวิว F04 รอบ 2 ครบทุกข้อ พร้อมแก้ wireframe F04-01..04 ให้ตรง
outputs:
  - design/ux/flows/F04-dungeon-presence.md — แก้ C-1..C-5 เพิ่มหัวข้อ 13 ตารางสรุปการแก้รอบ 3
  - design/ux/wireframes/F04-01-map-navigate.html — เพิ่ม `nav.returnBeforeArrive` ในเฟรม A3 (C-2)
  - design/ux/wireframes/F04-02-dungeon-confirm.html — เพิ่มปุ่มยกเลิกในเฟรม B1, B5 (C-1)
  - design/ux/wireframes/F04-03-checkin-speedlock.html — เพิ่มปุ่มยกเลิกในเฟรม C1, C2 (C-1) แก้ caption C1 (C-3) เปลี่ยน glyph emoji เป็น placeholder ข้อความในเฟรม D1a/D1b (C-4)
  - design/ux/wireframes/F04-04-run-state-summary.html — เพิ่มบรรทัด `run.death`/`run.autoRetreat` canon และ `run.summary.diedBody` ในเฟรม F3 (B-01 ของรีวิว F05/F06 ที่ระบุให้แก้ไฟล์นี้ร่วมด้วย)
acceptance:
  - [x] C-1..C-5 แก้ครบพร้อมหลักฐานตำแหน่ง — evidence: หัวข้อ 13 ตาราง
  - [x] ภาษาไทย ไม่มี emoji ในไฟล์ที่แก้ (รวมการลบ glyph emoji ออกจาก wireframe) — evidence: ตรวจด้วยสายตา C-4
assumptions:
  - A-P2-X11-2: ชื่อ variant banner ใหม่ `banner.info-full` เป็นชื่อชั่วคราวที่ uiux เสนอ รอ art-director ยืนยันหรือเปลี่ยนชื่อพร้อมเพิ่มแถวใน `components.md` หัวข้อ 6 (owner: art-director)
handoffs:
  - to: game-director (P2-F05-T18 design gate รวม) | need: ตรวจ C-1..C-5 ตามหัวข้อ 13 | why: R2-3 ของรีวิวรอบ 2 | blocking: no สำหรับ P2-F04-T21 (ตาม R2-6 เดิม) แต่ blocking สำหรับ design gate รวม
  - to: art-director | need: ยืนยันชื่อ `banner.info-full` และเพิ่มแถวใน `components.md` หัวข้อ 6 | why: C-5 | blocking: no
decisions:
  - none
questions_for_human:
  - none
