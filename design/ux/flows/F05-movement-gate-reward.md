# Flow F05 — Tick/ของ feedback และสรุปผล run

Task: P2-F06-T03 (ฉบับแก้โดย P2-X11) · เจ้าของ: uiux-designer · สถานะ: แก้ตาม `design/reviews/F05-F06-flow-approval.md` (NEEDS_CHANGES, blocking B-01) ส่งกลับ P2-F06-T30 รอบ 2 ก่อนเข้า design gate รวม F04+F05 (P2-F05-T18) และ design gate F06 (P2-F06-T24) · วันที่: 2026-09-27
แหล่งอ้างอิง: `design/features/F05-movement-gate-reward.md` (R01–R28, สเปกหลักที่ flow นี้แปลงเป็นจอ) · `design/ux/flows/F04-dungeon-presence.md` หัวข้อ 6–7 (Flow E/F — ที่มาของ run-state pill, tick timer, หัวข้อจอสรุปต่อ `exit_reason` ที่ flow นี้ **ไม่เขียนซ้ำ** เพียงเติมเนื้อหาในตัว) · `design/reviews/F04-flow-approval.md` N-14 (ปิดในเอกสารนี้) · `design/ux/components.md` หัวข้อ 7 (HP bar เดิม), 13.6 (เส้นแบ่งขอบ HP), 13.8 (chip ระยะเส้นตรง) · `art/direction/briefs/P2-assets.md` หัวข้อ 3.9 (ไอเทมที่ drop) · `config/content/copy.th.json` (`run.tickGranted*`, `run.summary.*`, `rarity.*`) · D-059, D-089, D-094
คู่กับ: `design/ux/flows/F06-hp-damage-onboarding.md` (HP/ตาย/auto-retreat ใช้จอเดียวกับที่นี่แต่กติกาเป็นของ F06)
ลำดับอำนาจ: GDD > pillars.md > `design/features/F05-movement-gate-reward.md` > flow F04 (หัวข้อจอสรุป) > เอกสารนี้ (เนื้อหาเต็มของ tick/ของ) · ตัวเลขทุกตัวอ้างเป็น `config: <key>` เท่านั้น

## หมายเหตุ ขอบเขตของเอกสารนี้ (ไม่ใช่ override — เป็นส่วนเติมของ F04)

flow F04 หัวข้อ 6–7 เป็นเจ้าของ **โครง** ของจอ run (run-state pill, tick timer หยุด/เดิน) และ **หัวข้อ** ของจอสรุปต่อ `exit_reason` แล้ว เอกสารนี้ไม่เขียนโครงนั้นซ้ำ แต่เติมสามเรื่องที่ F04 ยังไม่ครอบ:

1. **Feedback ตอน tick ผ่าน/ไม่ผ่าน** ระหว่างเล่น (toast บนจอ run และจอพกกระเป๋า)
2. **เนื้อหาเต็มของหน้าสรุป run** (รายการของแยก rarity, exp, จำนวน tick ที่ผ่าน/ประเมิน, ธง tick บางส่วน) ที่ปรากฏใต้หัวข้อของ F04 ทุก `exit_reason`
3. **ปิด N-14** ของ `design/reviews/F04-flow-approval.md`: หน้าสรุปตายต้องบอกว่า exp ยังอยู่ (F05-R26) — F04 ยังเขียนแค่หัวข้อ `run.summary.died` ไม่มีบรรทัดนี้

กลไก HP/damage/auto-retreat/ตาย/ฟื้น เป็นของ flow F06 (P2-F06-T03 เอกสารคู่กัน) เอกสารนี้แตะแค่จุดที่ tick กับ hit ชนกันในเวลาเดียว (F05-R19, R-B1 ข้อ 5) เพื่อบอกลำดับ feedback บนจอเท่านั้น ไม่อธิบายกลไก HP

## สารบัญ

1. หลักการอ่าน flow นี้
2. Flow A — Tick feedback ระหว่าง run
3. Flow B — เนื้อหาเต็มของหน้าสรุป run (ทุก `exit_reason`)
4. Flow C — คอมโพเนนต์ที่ใช้ซ้ำ (chip rarity, แถวของ, แถว exp)
5. ตารางสถานะที่ต้องมีทุกจอ
6. แอปถูกย่อ/ปิด และเน็ตหลุด
7. รายการ copy key
8. สมมติฐานและคำถามค้าง

## 1. หลักการอ่าน flow นี้

โจทย์ตั้งต้นเดียวกับ flow F04: ผู้เล่นเดินกลางแดดหรือฝนด้วยมือเดียว มองจอ 3 วินาทีแล้วเก็บมือถือกลับกระเป๋า — **ทุก toast ของหัวข้อนี้ต้องอ่านจบได้ในแวบเดียวและไม่บล็อกจอ** (ไม่ใช่ popup ที่ต้องกดปิด)

กติกาเพิ่มเฉพาะของ tick/ของ: ไม่มีตัวเลขเปอร์เซ็นต์หรือสูตรใดบนจอผู้เล่น (exp/drop chance เป็นของ config ไม่ใช่ของ copy) · tick ที่ไม่ผ่านแสดงแบบเป็นกลาง ไม่ใช่สีแดง/ไอคอน error (F05-R10, style-guide 2b) · ไม่มีเพดานใดที่ต้องสื่อสารบนจอ (F05-R28 — เงียบเรื่องนี้ไปเลย ไม่ใช่บอกว่า "ไม่มีเพดาน" เพราะเป็นข้อมูลที่ผู้เล่นไม่ต้องรู้) · ห้ามแสดงพิกัดหรือเส้นทางในหน้าสรุปเด็ดขาด (F05-R25)

สัญลักษณ์เหมือน flow F04 หัวข้อ 1: `→` `⤷ เงื่อนไข:` `S-xx-slug` `[copy.key]` `config: <key>`

## 2. Flow A — Tick feedback ระหว่าง run (F05-R04b, R10, R15, R23, R-B1 ข้อ 5)

บริบท: ผู้เล่นอยู่ที่ `S-03-run` (จอปกติหรือจอพกกระเป๋าตาม `components.md` หัวข้อ 12) นาฬิกา `rewardWindow` เดินอยู่ (Active ไม่ lock) ครบ `config: dungeons.rewardTick.rewardTickInterval_s` → engine ประเมิน `TickDue` (F05 หัวข้อ 4)

A1. **Tick ผ่าน gate (ปกติ)**: toast สั้นทับจอ (ไม่บล็อก หายเองได้) `[run.tickGranted]` ("เดินพอแล้ว ได้ของรอบนี้") ต่อท้ายด้วยรายการของแบบย่อ (ไอคอนของ + จำนวน ไม่เกิน 3 ชิ้นที่เห็นพร้อมกัน ที่เหลือดูในสรุป run) — สั่นสั้นหนึ่งครั้ง (แยกจากรูปแบบสั่นของ HP ต่ำ/auto-retreat ตาม audio direction) เสียงสั้นเสียงเดียว ไม่วนซ้ำ (D-076/D-077) · จอพกกระเป๋า: ป้าย `[run.pocketNextTick]` รีเซ็ตเป็นรอบถัดไปทันที ไม่มีรายการของแสดงบนจอพกกระเป๋า (ไม่มีปุ่มใดบนจอนั้นตาม components.md 12.1 — รายการของดูได้ตอนออกจากจอพกกระเป๋าหรือในสรุป run เท่านั้น) มีแค่สั่น/เสียงเป็นสัญญาณ

A2. **Tick ผ่านครั้งแรกในชีวิตผู้เล่น (onboarding)**: ใช้ข้อมูลชุดเดียวกับ A1 ทุกประการ (ของ/exp เท่ากัน ไม่มี code path แยก ตาม F05-R15, F06-R39) ต่างแค่การแสดงผล: `[run.tickGrantedFirst]` ("ได้ของก้อนแรกแล้ว เดินมาเองทั้งนั้น") แทน `[run.tickGranted]` + effect เด่นกว่า (ของ vfx-animator, motion-direction) + ต่อท้ายด้วย `[run.continueCta]` ("เดินต่อเพื่อรับเพิ่ม") เป็นข้อความเสริมท้าย toast เดียวกัน ไม่ใช่ popup แยก — ปิด onboarding ที่จังหวะนี้ (ราย ละเอียดลำดับเต็มอยู่ flow F06 หัวข้อ 2) client อ่าน flag "เป็น tick ที่ผ่านครั้งแรก" จาก state เพื่อเลือก copy/effect นี้เท่านั้น

A3. **Tick ไม่ผ่าน gate**: toast จาง (`.toast.faded` ตาม style.css — ไม่ใช้กรอบแดงหรือไอคอน error) `[run.tickDenied]` ("รอบนี้เดินไม่พอ ไม่ได้ของ เดินต่อ") ไม่สั่น ไม่มีเสียงเตือน (ไม่ลงโทษ, style-guide 2b) หน้าต่างถัดไปเริ่มทันทีอัตโนมัติ (ไม่มีอะไรให้กด) — onboarding ที่ยังไม่เคยได้ tick แรก (H-E20/G16 ของสเปก): ใช้ `run.tickDenied` เดิม **ไม่มีทางลัดหรือคำพิเศษ** เพื่อไม่ให้เข้าใจผิดว่ามีเกณฑ์ต่างกันสำหรับคนใหม่

A4. **Level up**: เกิดพร้อม tick ที่ผ่าน (exp มีผลทันที ตาม F05-R16) แสดงเป็นสัญญาณสั้นต่อท้าย toast เดียวกันของ A1/A2 (ไม่ใช่ popup แยก, F06-R33): `[run.levelUp]` ("เลเวลขึ้น") **ไม่มีลิงก์หรือปุ่มไปหน้าใด** (ไม่มีหน้าลงแต้ม stat ใน Phase 2 ตาม F06-R34)

A5. **tick กับ hit ตรงเวลาเดียวกัน** (F05-R19, F06-R10): toast ของ tick (A1/A2) แสดงก่อนสัญญาณของ hit (HP ต่ำ/auto-retreat — เป็นของ flow F06) เสมอ ถ้าทั้งสองต้องแสดงพร้อมกันบนจอเดียว ให้ queue สัญญาณของ hit ต่อจาก toast ของ tick แบบไม่ทับซ้อน (ใช้ priority queue เดียวกับ cue-list ของ sound-designer, P2-F06-T13) — ผู้เล่นเห็นของที่ได้ก่อนเห็นผลของการโดนตี ตรงกับลำดับที่ผู้เล่นได้ของจริง (ของเข้าถุงก่อน แล้วยาอัตโนมัติที่ tick นั้น drop มาถึงจะใช้ได้ทันใน hit เดียวกัน)

## 3. Flow B — เนื้อหาเต็มของหน้าสรุป run (F05-R24..R27, ทุก `exit_reason` ของ F04 หัวข้อ 7)

`S-04-run-summary` — F04 กำหนดหัวข้อจอ (บรรทัดแรกสุด) ต่อ `exit_reason` ไว้แล้ว เอกสารนี้กำหนดสิ่งที่อยู่ **ใต้หัวข้อนั้น** ให้ครบทุกกรณี:

B1. **แถวรายการของ** (`[run.summaryRewardList]` "ของที่ได้ใน run นี้"): จัดกลุ่มตาม rarity (`rarity.common`..`rarity.legendary`) แต่ละแถวมี ไอคอนของ 64px (ตาม art brief 3.9) + ชื่อชนิด + จำนวน — **ไม่มีตัวเลข % โอกาส drop หรือสูตรใดบนจอนี้** (เป็นข้อมูลของ config ไม่ใช่ copy) เรียงจาก Legendary → Common (ของหายากอยู่บนสุด ให้เห็นก่อนถ้ามี) ไม่มีเพดานจำนวนแถวที่แสดง (เลื่อนจอได้ถ้าของเยอะ)

B2. **แถว exp**: `[run.summaryExpGained]` ("EXP ที่ได้ {expAmount}") ต่อด้วย `[run.levelUp]` ถ้ามีเลเวลขึ้นระหว่าง run (แสดงครั้งเดียวสรุปรวม ไม่แยกต่อ tick) — ไม่มีลิงก์ไปหน้าใด (F06-R33)

B3. **แถวจำนวน tick**: `[run.summaryTickCount]` ("ผ่าน {passedCount} จาก {evaluatedCount} รอบ") — ใช้ตัวเลขจาก engine เท่านั้น (ห้าม client นับเอง) ถ้ามี tick บางส่วนที่ผ่านตอนปิด (D-059, F05-R22) แถวนี้เติมป้ายเล็ก `[run.summaryTickPartialNote]` ("รอบสุดท้ายนับตามเวลาที่เดินจริง") ต่อท้าย ไม่ใช่แถวแยก (ผู้เล่นไม่ต้องรู้สูตรย่อ f)

B4. **กรณี `death` (ปิด N-14, แก้ B-01)**: หัวข้อ `[run.summary.died]` (label สั้น) **ตามด้วยบรรทัดแรกใต้หัวข้อเป็นข้อความ canon เต็มของ GDD `[run.death]`** ("คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย" — ห้ามแก้คำ) **แล้วตามด้วย** `[run.summary.diedBody]` ("EXP ที่ได้ใน run นี้ยังอยู่") — ทั้งสอง key มีอยู่แล้วใน `copy.th.json` แต่ก่อนรอบนี้ไม่มีจอใดวางไว้ครบ (`F04-04-run-state-summary.html` เฟรม F3 ไม่มีทั้งสองบรรทัด, `F05-02-run-summary-detail.html` มีแค่ `diedBody`) — **แก้ทั้งสามไฟล์ในรอบนี้** (`F04-04-run-state-summary.html`, `F05-02-run-summary-detail.html`, `F06-03-hp-warning-autoretreat-death-recovering.html`) ให้ใช้ลำดับเดียวกัน: หัวข้อ → `run.death` → `diedBody` → รายการของว่าง **แถว exp (B2) และแถวจำนวน tick (B3) ยังแสดงตามปกติแม้เป็นกรณี `death` เสมอ** (F05-R25 ใช้กับทุก `exit_reason` — `diedBody`/`run.death` เป็นประโยคบอกข้อเท็จจริงเพิ่ม ไม่ใช่สิ่งที่มาแทนแถว exp/tick, แก้ N-06) รายการของว่างเสมอ (F05-R26) แสดงป้าย `[run.summaryRewardLost]` ("ไม่เหลืออะไร") แทนรายการ

B5. **กรณี `auto_retreat` (แก้ B-01)**: หัวข้อ `[run.summary.autoRetreated]` ("ถอยอัตโนมัติ ของอยู่ครบ") **ตามด้วยบรรทัดแรกใต้หัวข้อเป็นข้อความ canon เต็มของ GDD `[run.autoRetreat]`** ("HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ" — ห้ามแก้คำ) เหตุผลเดียวกับ B4: canon ต้องอยู่บนจอที่ดูได้ทุกเมื่อ ไม่ใช่แค่สัญญาณชั่วคราวตอนเกิดเหตุ (ดู flow F06 Flow C ข้อ C4) แล้วตามด้วยรายการของครบตาม B1 (F05-R21) แถว exp/tick ตาม B2/B3 ปกติ — **แก้ wireframe `F05-02-run-summary-detail.html` เพิ่มเฟรมใหม่สำหรับกรณีนี้** (เดิมไม่มีเฟรม auto_retreat เต็มรูปแบบ มีแค่ตัวอย่างหนึ่งบรรทัดในเฟรม B4)

B6. **กรณี `manual_exit`, `dungeon_closed`, `timeout`, `clock_invalid`, `emergency_close`**: รายการของครบตาม B1 (F05-R21) แถว exp/tick ตาม B2/B3 ปกติ ไม่มีความต่างอื่นจากที่ F04 กำหนดไว้แล้ว ไม่มีบรรทัด canon เพิ่ม (canon สามจังหวะของ GDD มีแค่ HP ต่ำ/auto-retreat/ตาย เท่านั้น)

B6. ปุ่มเด่นเดียว `[run.summaryContinue]` ("เดินต่อเพื่อรับเพิ่ม") อยู่ตำแหน่งเดิมของ F04 (ครึ่งล่างจอ) — ไม่เปลี่ยน

## 4. Flow C — คอมโพเนนต์ที่ใช้ซ้ำ

C1. **Chip rarity** (`.rarity-chip` เดิมใน style.css): สีขอบต่างกันตาม `rarity.*` แต่ **ไม่ใช้สีอย่างเดียวแยกความหมาย** — ใช้ร่วมกับความหนาของขอบ/scale ตามที่ P1-F03-T22 V-21 ตัดสิน (ความหนาขอบมากขึ้นตาม rarity ที่สูงขึ้น) ไอคอนของแต่ละชิ้นมาจาก manifest เดียวกับ art brief 3.9 · **(N-07)** ตัวอย่างในเอกสารนี้และใน wireframe (`mat-dust`, `potion-hp-small`) เป็น **id ภายในเพื่อสาธิต UI เท่านั้น** — ชื่อไทยจริงและไอคอนที่แสดงบนจอมาจาก content ของหลังบ้าน (NN-3, `names.th.json`) ผ่าน manifest ของ art brief 3.9 ไม่ใช่ id ดิบ ห้าม build แสดง id ตรงๆ บนจอจริง

C2. **แถวของ (`.card` ซ้อนแถว)**: ไอคอน 64px ซ้าย ชื่อ+จำนวนขวา แถวสูง ≥48px (touch target แม้ไม่ต้องแตะ เพื่อความสม่ำเสมอของ layout)

C3. **แถว exp/tick**: ใช้ `.caption`/`.numeric` เดิม ไม่มีองค์ประกอบใหม่

## 5. ตารางสถานะที่ต้องมีทุกจอ

นิยามสถานะเหมือน F04 หัวข้อ 8 — ตารางนี้ครอบเฉพาะจอของ F05 (tick feedback, หน้าสรุป)

| จอ | empty | loading | GPS ปิด | accuracy ต่ำ | offline | dungeon ปิด | นอกระยะ | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tick feedback (Flow A) | tick ไม่ผ่าน = `run.tickDenied` ไม่ใช่ empty state แยก (ดู A3) | ไม่มี — engine ตัดสินทันทีที่ครบ `window_s` ไม่มี network รอ | ไม่ตัด tick ที่ค้างอยู่ระหว่างมี run — GPS ปิดระหว่าง Active ทำให้ไม่มี sample ใหม่ ระยะไม่นับต่อ (เข้า Grace/Suspended ของ F04 ไม่ใช่เข้าเงื่อนไขนี้แยก) | ระยะยังนับตามกฎกรองปกติ (F05-R05) ไม่มีผลต่อ UI ของ tick feedback | ไม่มีผลใด (Phase 2 ไม่มี server, engine ในเครื่องล้วน) | ไม่เกี่ยวข้อง (tick เกิดเฉพาะตอนมี run ที่ยังเปิดอยู่) | ไม่เกี่ยวข้อง | `[common.error]` + log ให้ QA (ไม่ล้าง run) |
| หน้าสรุป run (Flow B) | กรณี `death`: รายการของว่าง = `run.summaryRewardLost` (ตั้งใจ ไม่ใช่บั๊ก) | สรุปคำนวณจาก state ที่มีอยู่แล้วในเครื่อง ไม่มี spinner รอ | ไม่เกี่ยวข้อง (แสดงผลจาก state ที่บันทึกไว้ตอนจบ run) | ไม่เกี่ยวข้อง | ใช้งานได้ปกติ (ไม่มี request) | ไม่เกี่ยวข้อง (ถ้าปิดกลาง run → `dungeon_closed` ของ F04 มีหน้าสรุปของตัวเองอยู่แล้ว) | ไม่เกี่ยวข้อง | `[common.error]` + log ให้ QA run ไม่ถูกล้าง (เหมือน F04) |

## 6. แอปถูกย่อ/ปิด และเน็ตหลุด

- **Tick ที่เกิดระหว่างแอปถูกปิด/ย่อ**: ไม่มี toast ให้เห็นตอนนั้น (ไม่มีจอให้แสดง) — เปิดแอปกลับมาเห็นผลลัพธ์สะสมในจอ run ตามปกติ (HP/inventory ปัจจุบัน) ไม่มีการ "เล่า" ย้อนหลังว่าพลาด tick อะไรไปบ้างระหว่างปิดแอป (ตรงกับ F04 หัวข้อ 9 — ไม่มีหลักฐาน = ไม่มี tick ในช่วงนั้นอยู่แล้วเพราะนาฬิกาหยุดตาม Grace/Suspended)
- **เน็ตหลุด**: ไม่มีผลใดต่อ tick feedback หรือหน้าสรุป (Phase 2 ไม่มี server, engine ในเครื่องล้วน) — เหมือน F04 หัวข้อ 9 ทุกประการ ไม่ต้องเขียนซ้ำ

## 7. รายการ copy key

### 7.1 Key ใหม่ที่ยังไม่มีใน `copy.th.json` (uiux เสนอชื่อ+ร่างไทย narrative เป็นผู้ตัดสินคำสุดท้าย+ตรวจเพดาน)

| key | ร่างไทย | `kind` | บริบท |
| --- | --- | --- | --- |
| `run.levelUp` | "เลเวลขึ้น" | label | ต่อท้าย toast tick (A4) และแถว exp ในหน้าสรุป (B2) — ไม่มีลิงก์ไปหน้าใด |
| `run.summaryExpGained` | "EXP ที่ได้ {expAmount}" | message | หน้าสรุป B2 |
| `run.summaryTickCount` | "ผ่าน {passedCount} จาก {evaluatedCount} รอบ" | message | หน้าสรุป B3 |
| `run.summaryTickPartialNote` | "รอบสุดท้ายนับตามเวลาที่เดินจริง" | label | หน้าสรุป B3 เฉพาะเมื่อมี tick บางส่วนของ D-059 |

### 7.2 Key ที่มีอยู่แล้วและใช้ซ้ำตรงๆ (ไม่แก้)

`run.tickGranted`, `run.tickGrantedFirst`, `run.tickDenied`, `run.continueCta`, `run.summaryRewardList`, `run.summaryRewardEmpty`, `run.summaryRewardLost`, `run.summary.diedBody`, `run.summaryContinue`, `run.pocketNextTick`, `rarity.common`, `rarity.uncommon`, `rarity.rare`, `rarity.epic`, `rarity.legendary`, `common.error`

## 8. สมมติฐานและคำถามค้าง

- [ปิด N-14 ของ `design/reviews/F04-flow-approval.md`: หน้าสรุปตาย (`S-04-run-summary`, `exit_reason: death`) ต้องแสดง `run.summary.diedBody` ใต้หัวข้อ `run.summary.died` เสมอ ตามหัวข้อ 3 ข้อ B4 ของเอกสารนี้]
- [handoff wireframe: `design/ux/wireframes/F04-04-run-state-summary.html` เฟรม F3 ยังไม่มีบรรทัด `run.summary.diedBody` — ต้องแก้ในรอบถัดไปที่แตะไฟล์นั้น (นอก `writes` ของงานนี้) ผู้ทำ: uiux-designer เมื่อได้งานถัดไปที่แตะ F04 wireframe]
- [ASSUMPTION A-P2-F05-T03-5 (แก้ N-09, เดิมชื่อ A-P2-F06-T03-1 ซ้ำกับรหัสในเอกสาร F06): จำนวนแถวของสูงสุดที่แสดงพร้อมกันในหน้าสรุปโดยไม่ต้องเลื่อนจอ ยังไม่ได้ทดสอบกับของจริงจำนวนมาก (Phase 2 ยาใน drop table ทุก preset ไม่เยอะ) ต้องทดสอบซ้ำเมื่อ QA เล่น run ยาว 3 ชั่วโมงจริง (P2-F06-T17) · owner: qa-tester]
- [ASSUMPTION A-P2-F05-T03-6 (แก้ N-09, เดิมชื่อ A-P2-F06-T03-2 ซ้ำกับรหัสในเอกสาร F06): `run.levelUp` เป็น key ใหม่ที่ uiux เสนอ (ไม่ได้อยู่ในรายชื่อบังคับของ brief) รอ narrative-designer ยืนยันหรือเปลี่ยนชื่อใน P2-F05-T09 · owner: narrative-designer]
- คำถาม (playtest P2-F06-T19): ผู้เล่นเข้าใจไหมว่าตัวนับ tick หยุดตอนออกนอกเขต (สืบเนื่องจากคำถามเดียวกันใน spec F05 หัวข้อ 10) — เชื่อมกับคำถามว่าเห็น toast tick ได้ชัดพอไหมตอนมือถืออยู่ในกระเป๋า (จอพกกระเป๋าไม่มีรายการของ มีแค่สั่น/เสียง)

## 9. รอบ 2: สิ่งที่แก้ (P2-X11 ตอบ `design/reviews/F05-F06-flow-approval.md`)

ตารางนี้ให้ game-director ตรวจเฉพาะข้อ blocking และจุดที่แก้ตามเงื่อนไขการตรวจซ้ำของ gate (หัวข้อ 7 ของรีวิว) — คอลัมน์ตำแหน่งอ้างเอกสารนี้ (F05) เท่านั้น ส่วนของ flow F06 ดูตารางเดียวกันใน `F06-hp-damage-onboarding.md` หัวข้อ 13

| ข้อ | สิ่งที่แก้ | ตำแหน่งในเอกสารนี้ |
| --- | --- | --- |
| B-01 | เพิ่มบรรทัด canon `run.death` (B4) และ `run.autoRetreat` (B5, เฟรมใหม่) เป็นบรรทัดแรกใต้หัวข้อบนหน้าสรุป | Flow B ข้อ B4, B5 |
| N-06 | ระบุชัดว่าแถว exp/tick (B2/B3) ยังแสดงตอน `death` เสมอ ไม่ใช่ถูกแทนที่ด้วย `diedBody` | Flow B ข้อ B4 |
| N-07 | หมายเหตุว่า `mat-dust`/`potion-hp-small` เป็น id สาธิต UI เท่านั้น ชื่อ/ไอคอนจริงมาจาก content หลังบ้าน | Flow C ข้อ C1 |
| N-09 | เปลี่ยนรหัสสมมติฐานซ้ำ `A-P2-F06-T03-1/-2` เป็น `A-P2-F05-T03-5/-6` | หัวข้อ 8 |

## REPORT
task: P2-X11 (ส่วน F05)
status: DONE
summary: แก้ F05 ตาม B-01 (canon text บนหน้าสรุปทั้ง death และ auto_retreat) และปิด N-06, N-07, N-09 ตาม `design/reviews/F05-F06-flow-approval.md`
outputs:
  - design/ux/flows/F05-movement-gate-reward.md — แก้ Flow B (B4 เพิ่ม `run.death`, เพิ่ม B5 ใหม่สำหรับ auto_retreat พร้อม `run.autoRetreat`, เดิม B5 เลื่อนเป็น B6) แก้ N-06/N-07/N-09 · เพิ่มหัวข้อ 9 ตารางสรุปการแก้
acceptance:
  - [x] B-01 (ส่วนของ F05) แก้แล้วพร้อมหลักฐานตำแหน่ง — evidence: หัวข้อ 9 ตาราง แถว B-01
  - [x] non-blocking ที่เกี่ยวกับ F05 แก้ครบ — evidence: หัวข้อ 9 ตาราง แถว N-06, N-07, N-09
  - [x] ภาษาไทย ไม่มี emoji — evidence: ตรวจด้วยสายตาทั้งไฟล์ที่แก้
assumptions:
  - none เพิ่มเติมนอกจาก A-P2-F05-T03-5/-6 ที่มีอยู่แล้ว (เปลี่ยนแค่ชื่อรหัส)
handoffs:
  - to: game-director (P2-F06-T30 รอบ 2) | need: ตรวจซ้ำเฉพาะ B-01 และจุดที่แก้ตามหัวข้อ 9 | why: protocol ข้อ 6 | blocking: yes
  - to: narrative-designer (P2-F05-T09) | need: ยืนยันว่าลำดับ heading → run.death/run.autoRetreat → body ใหม่ไม่ทำให้ข้อความซ้ำความหมายกันเอง | why: ร่างคำสุดท้ายเป็นของ narrative | blocking: no
decisions:
  - none
questions_for_human:
  - none
