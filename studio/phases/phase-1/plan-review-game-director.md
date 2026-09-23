# Plan Review — Phase 1 Board (มุม design)

Task: P1-PLAN-REV-GD · ผู้ตรวจ: game-director · วันที่: 2026-09-23
ตรวจ: `studio/phases/phase-1/board.md` (DRAFT, 60 task) เทียบ `studio/roadmap.md` Phase 1, `CLAUDE.md`, `studio/protocol.md` และ GDD หัวข้อ "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู", "Movement gate", "Class และ Party", "ราคา NPC และยา", "Economy", "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม", "สถานที่ที่ไม่ควรเป็น dungeon", "ข้อมูลตำแหน่ง", "ที่ยังต้องตัดสินใจ", "สิ่งที่ตัดออกจาก v1 โดยตั้งใจ"

## 1. สรุป

**Verdict: NEEDS_CHANGES**

โครง board ดี: critical path ถูก, gate เลือกเหมาะกับชนิดงาน, config-not-hardcode ถูกเขียนลง acceptance เกือบทุกงาน, และ simulator ผูกกับตาราง GDD ตรงตาม exit criterion แต่มี 5 ข้อที่ต้องแก้ก่อนอนุมัติ board

1. flow core loop (P1-F03-T16) ไม่มีจังหวะ HP ต่ำ / auto-retreat / ตาย / tick ไม่ผ่าน gate ทั้งที่ copy bank (T05) บังคับให้ครอบ key พวกนี้
2. onboarding flow ไม่มี consent location แยกและจุดตรวจอายุ 15+ (non-negotiable 7)
3. ผลเดินทดสอบภาคสนามจะเอาพิกัดจริงของคนเข้า git (non-negotiable 7)
4. P1-F03-T20 ตัดสินเรื่อง "งานวัด" เองทั้งที่ GDD ขัดกันเองและแตะศาสนา ต้องเป็น HUMAN
5. E14 แคบกว่า exit criterion ใน roadmap ("ทุก role") โดยไม่มีคนอนุมัติ และ vfx-animator ไม่มีเอกสารทิศทาง

ความเห็นเรื่องความไม่สอดคล้องใน GDD สองข้อที่ producer ยกมา (Support 25/50, อัตราส่วน 2.45) อยู่ในหัวข้อ 8 สรุปสั้นๆ: ทั้งสองข้อ **ไม่แก้ค่าใน Phase 1** simulator ต้องได้ค่าตาม GDD ก่อน แล้วค่อยส่งเป็น decision authority HUMAN ทันทีที่ systems-designer รายงาน ไม่ต้องรอ design gate B

ระดับความรุนแรง
- must-fix: ขัด non-negotiable, ขัด GDD หรือ exit criterion หรือทำให้งานปลายทางทำไม่ได้ ต้องแก้ก่อนอนุมัติ board
- should-fix: เสี่ยงต้องแก้งานซ้ำหรือเสี่ยง gate ตก ควรแก้ก่อนเริ่ม wave ที่เกี่ยวข้อง
- nice-to-have: ช่วยให้ดีขึ้น producer ตัดสินเองได้

## 2. Findings — must-fix

### MF-1 · P1-F03-T16 (และ T17) — flow core loop ไม่ครอบจังหวะเสียเลือดและถอย
- ปัญหา: acceptance ของ T16 มีแค่ แผนที่ → confirm → run (Active/Grace/Suspended/Ended) → สรุป ไม่มี HP 30% แจ้งเตือน, auto-retreat 25%, ตาย, กดออกเองได้ทุกเมื่อ, ยาอัตโนมัติ, และ tick ที่ไม่ผ่าน movement gate แต่ T05 บังคับให้ copy bank ครบ "ทุก key ที่ flow กำหนด" รวม HP ต่ำ / auto-retreat / ตาย ผลคือ copy จะไม่มี key จาก flow รองรับ และ wireframe (T17) จะขาดหน้าที่ GDD บอกว่าเป็น "จุดที่ผู้เล่นอารมณ์เสียที่สุด" GDD "ผลข้างเคียงที่ตั้งใจ" กำหนดว่า auto-retreat กับ movement gate ต้องอยู่คู่กันเสมอ flow จึงต้องแสดงทั้งคู่
- เปลี่ยนเป็น: เพิ่ม acceptance ใน T16
  - [ ] สถานะ run ครอบ: HP 30% (สั่น + แจ้ง), ยาอัตโนมัติทำงาน, auto-retreat ที่ 25% (เก็บของครบ run จบ), ตาย (ของใน run หาย, ฟื้น 0→50% หรือใช้ยา), กดออกเองได้ทุกเมื่อโดยไม่ต้องเดินออก
  - [ ] tick ที่ไม่ผ่าน movement gate มีสถานะแสดงให้เห็น (เดินไม่พอ) โดยไม่ลงโทษ
  - [ ] หน้าตั้งค่ามี auto-retreat เปิดเป็น default การปิดต้องเข้าไปปิดเองและมีขั้นยืนยัน
  - [ ] ทุกตัวเลขใน flow (25%, 30%, 5 นาที, 50 ม.) อ้างเป็น `config: <key>` ไม่เขียนค่า
  - และเพิ่มหน้าเหล่านี้ในขอบเขต wireframe ของ T17

### MF-2 · P1-F03-T15, P1-F03-T16 — onboarding ไม่มี consent location และจุดตรวจอายุ
- ปัญหา: flow นาที 0–1 ตามตาราง GDD ไม่มี consent แต่ non-negotiable 7 และ GDD "ข้อมูลตำแหน่ง" บังคับ consent location แยกจาก consent อื่น, GDD "อายุขั้นต่ำ 15 ปี" บังคับให้วางโครง parental consent ไว้ตั้งแต่แรก ถ้าไม่ออกแบบตอนนี้ onboarding 10 นาทีที่อนุมัติใน Phase 1 จะต้องรื้อใน Phase 7 และเวลาที่ใช้กับ consent จะกินนาที 0–1
- เปลี่ยนเป็น: เพิ่มใน T16
  - [ ] ลำดับนาที 0–1 รวม: consent location (แยก ไม่รวมกับ consent อื่น), permission ของเบราว์เซอร์, จุดตรวจอายุ 15+ พร้อมช่องต่อ parental consent (scaffold ปิดไว้), โดยยังเห็นแผนที่และเลือกพลังได้ภายในนาทีแรก
  - [ ] กรณีปฏิเสธ consent location: ยังดู avatar อ่าน role และลงทะเบียนความสนใจได้ (ใช้หน้าเดียวกับกรณี dungeon ไกล)
  - เพิ่มใน T15: หน้าจอ consent, ตั้งค่าความเป็นส่วนตัว, ลบบัญชี, และ profile ที่ไม่มีข้อมูลตัวตนจริง อยู่ในรายการหน้าจอ v1

### MF-3 · P1-F02-T03, P1-F02-T11, P1-F02-T14, P1-F02-T20 — พิกัดจริงของคนเดินทดสอบจะเข้า git
- ปัญหา: T11 บอก "ไม่ส่งพิกัดออกนอกเครื่อง" แต่ T20 ให้คนบันทึก CSV ลง `qa/playtest/results/` ซึ่งอยู่ใน repo ที่ T18 push ขึ้น GitHub ถ้า CSV มี lat/lng รายวินาทีจะเป็นเส้นทางจริงของบุคคล (มักเริ่มและจบใกล้บ้านหรือที่ทำงาน) ขัด non-negotiable 7 และหลักการ TTL 24 ชม. ของ `position_log` ข้อมูลนี้มีค่ามากสำหรับ Phase 2 (trace จริงให้ Mock) จึงไม่ควรทิ้ง แต่ต้องเก็บแบบปลอดภัย
- เปลี่ยนเป็น:
  - T03: รูปแบบ CSV แยกสองไฟล์ (ก) metrics รวม ไม่มีพิกัด: FPS, แบต, MB, accuracy, ระยะสะสม, เวลา (ข) raw trace ที่มีพิกัด เป็น opt-in แยก
  - T11: export raw trace ต้องตัด 200 ม. แรกและสุดท้าย (ค่าเป็น config) และเลื่อนเวลาเป็น relative ก่อนออกจากเครื่อง
  - T14: kit บอกชัดว่าไฟล์ (ก) commit ได้ ไฟล์ (ข) เก็บใน `qa/playtest/results/raw/` ที่ถูก `.gitignore` เว้นแต่คนเดินยินยอมเป็นลายลักษณ์อักษรให้แปลงเป็น trace ใน `data/gps-traces/` หลังตัดหัวท้ายแล้ว
  - T20: ขั้นตอนของคนเพิ่มการยืนยันว่าเข้าใจและยินยอมก่อน export raw trace
  - handoff ถึง tech-lead ให้ ADR 0001 (T01) ใส่ `qa/playtest/results/raw/` ใน `.gitignore` ตั้งแต่แรก

### MF-4 · P1-F03-T20 — "งานวัด" ถูกตัดสินเองใน acceptance ของ live ops
- ปัญหา: GDD ขัดกันเอง: "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม" ทางเสริมข้อ 2 ยกตัวอย่าง "งานวัด" เป็น dungeon ชั่วคราว แต่ "สถานที่ที่ไม่ควรเป็น dungeon" ห้าม "วัดและศาสนสถาน" board เขียนใน T20 ว่า "งานวัดในฐานะงาน event ไม่ใช่ศาสนสถาน" ซึ่งเป็นการเลือกฝั่งโดย liveops-operator ทั้งที่ protocol ข้อ 5 กำหนดว่าเรื่องที่แตะศาสนาและพื้นที่อ่อนไหวต้อง escalate HUMAN
- เปลี่ยนเป็น: ลบวลีนั้นจาก T20 แทนด้วย "dungeon ชั่วคราวที่อยู่ในหรือทับเขตศาสนสถานติดธง `[HUMAN]` และไม่อยู่ในปฏิทินจนกว่าจะมี decision" และเพิ่ม decision ใน decision log
  - propose: ระหว่างรอ HUMAN ให้ใช้ blocklist เป็นหลัก คือห้ามทุก polygon ที่อยู่ในหรือทับเขตวัดและศาสนสถาน รวมงานวัด · อนุญาตเฉพาะงาน event หรือตลาดนัดที่อยู่นอกเขตศาสนสถานทั้งหมด
  - หลักที่ใช้: GDD ไม่มีหลักการตัดสินข้อไหนครอบเรื่องนี้โดยตรง จึงใช้ข้อความที่เจาะจงกว่าและมีเหตุผลด้านกฎหมาย ("สถานที่ที่ไม่ควรเป็น dungeon") เหนือตัวอย่างประกอบในรายการทางเสริม การตัดงานวัดทิ้งเสียแค่ coverage ชั่วคราวบางวัน ส่วนการใส่ผิดเสี่ยงต่อความไว้ใจของทั้งโปรเจกต์
  - authority: HUMAN
- ผลต่องานอื่น: P1-F01-T02 (หมวดกำกวม) และ P1-F01-T04 (case ทดสอบ) ต้องใช้กฎเดียวกันนี้ ดู SF-9

### MF-5 · Exit checklist E14 และ vfx-animator — board ทำให้ exit criterion แคบลงเอง
- ปัญหา: roadmap F03 เกณฑ์ผ่านเขียนว่า "ทุก role มีเอกสารทิศทางที่ผ่าน design gate" แต่ E14 เขียนว่า "ทุก role ที่มีงานใน Phase 1" และสมมติฐาน A-P1-PLAN-01-7 ตัด vfx-animator ออก protocol ข้อ 5 กำหนดว่าการตัด exit criterion ต้องให้ HUMAN อนุมัติ นอกจากนี้ Phase 2 F05 และ F06 ใช้ vfx-animator ทำ feedback ตอนได้ของ, auto-retreat และตาย ซึ่งเป็นจังหวะที่โทน "แห้ง ไม่ดราม่า" สำคัญที่สุด ถ้าไม่มีทิศทาง motion ก่อน Phase 2 จะไม่มีอะไรให้ design gate ตรวจเทียบ
- เปลี่ยนเป็น (เลือกข้อ ก เป็นหลัก):
  - (ก) เพิ่มงาน P1-F03-T27 vfx-animator, spec, 1–2 วัน, deps: P1-F03-T10, P1-F03-T18 · writes: `art/vfx/specs/motion-direction.md` · acceptance: งบ motion (หยุดเมื่อ `visibilitychange`, ไม่มี animation ต่อเนื่องบนแผนที่, รองรับ `prefers-reduced-motion`), ช่วงเวลา feedback และ reveal, การไล่ระดับ rarity, หลักของจังหวะ auto-retreat และตาย (ไม่ดราม่า), ตีบวกล้มเหลวไม่มีภาพของแตก, จังหวะ rift บนแผนที่ · ใส่ในขอบเขต design gate B (T25) และ visual gate (T22)
  - (ข) ถ้า producer ไม่อยากเพิ่มงาน ต้องส่ง HUMAN ขออนุมัติให้ E14 ครอบเฉพาะ role ที่มีงาน และระบุว่า vfx-animator กับ backend-programmer ใช้ทิศทางจากเอกสารใด
  - ทั้งสองทางให้แก้ E14 ให้ระบุชัด: role ฝั่ง design และ art ผ่าน design gate · role ฝั่ง tech (tech-lead, gameplay, location, devops, backend) ใช้ ADR 0001/0002 และ tech gate เป็นเอกสารทิศทาง · qa-tester ใช้ test plan

## 3. Findings — should-fix

### SF-1 · P1-F03-T06, P1-F03-T08, P1-F03-T25 — decision เรื่อง GDD ขัดกันเองไปรอถึง wave 9
- ปัญหา: T25 acceptance เขียนว่า design gate B "ตัดสิน decision ที่ systems-designer เสนอ" แต่ทั้งสองข้อขัดข้อความใน GDD authority จึงเป็น HUMAN ไม่ใช่ game-director และการรอถึง gate B ทำให้คนเห็นคำถามช้าเกินไป
- เปลี่ยนเป็น: (1) เมื่อ T06 และ T08 รายงาน ให้ orchestrator ลง decision log และ `studio/questions/open-questions.md` ทันที (2) เพิ่มงาน HUMAN P1-F03-T28 "ยืนยันการจัดการความไม่สอดคล้องใน GDD" deps: T06, T08 · รวมข้อ Support base/cap, อัตราส่วน 2.45, งานวัด (MF-4) และรายการ "ที่ยังต้องตัดสินใจ" ที่ล้าสมัย (SF-5) · ไม่ขวาง exit ของ Phase 1 แต่ต้องปิดก่อนเริ่ม Phase 3 (ข้อ Support) และ Phase 4 (ข้อ 2.45) (3) แก้ T25 เป็น "ให้คำแนะนำของ game-director พร้อมหลักการตัดสินที่ใช้ แล้วยืนยันว่า config ยังเป็นค่าตาม GDD จนกว่า HUMAN ตัดสิน"

### SF-2 · roadmap Phase 4 (handoff ถึง producer) — exit criterion ที่เป็นไปไม่ได้ตามตัวอักษร
- ปัญหา: roadmap Phase 4 เขียนว่า "รายได้ราว 1,470 gold/ชม. เทียบค่ายา 600 และอัตราส่วน 2.5–3 เท่า" แต่ 1,470 / 600 = 2.45 ถ้าไม่แก้ Phase 4 จะปิดไม่ได้ ถึงจะทำตรง GDD ทุกค่า
- เปลี่ยนเป็น: producer ใส่ข้อนี้ใน P1-F03-T28 และแก้ roadmap หลัง HUMAN ตัดสิน (ดูหัวข้อ 8.2) ไม่ต้องแก้ใน board Phase 1

### SF-3 · P1-F03-T08 — ค่ายา 600 gold/ชม. ต้องคำนวณได้จาก damage model ไม่ใช่รับมาเป็นค่าคงที่
- ปัญหา: acceptance เขียนว่า "เทียบค่ายาราว 600" ถ้า simulator รับ 600 เป็น input การเทียบอัตราส่วนจะไม่ได้ตรวจอะไร ค่ายาต่อชั่วโมงควรออกมาจาก damage (T07) × ความถี่โดนตี × ขนาดยาที่ใช้ × ราคายา
- เปลี่ยนเป็น: "ค่ายาต่อชั่วโมงคำนวณจาก damage model ของ T07 และราคายาใน config · รายงานสมมติฐาน (เลเวลตรงโซน, มี/ไม่มี Tanker, ยาขนาดที่ใช้) และเทียบกับ 600 ของ GDD" ถ้าได้ต่างจาก 600 เกิน tolerance ให้รายงานเป็น decision ไม่ปรับค่าเอง

### SF-4 · P1-F03-T07 — "อยู่ได้ราว 45 นาที" ยังไม่ได้นิยามว่านับถึงไหน
- ปัญหา: GDD "damage มาจากไหน" ให้ 45 / 55 นาที แต่ไม่บอกว่านับถึง HP 0 หรือถึง auto-retreat 25% สิ่งที่ผู้เล่นรู้สึกจริงคือเวลาจนถูกพากลับ ส่วนต่างอาจถึงราว 1 ใน 4 ของเวลา
- เปลี่ยนเป็น: acceptance ของ T07 รายงานทั้งสองค่า (ถึง 25% และถึง 0) · ใช้ค่าที่ตรงตาราง GDD เป็น test vector · ถ้าเวลาจนถึง auto-retreat สั้นกว่าเป้า 45 นาทีเกินราว 20% ให้เสนอ decision authority HUMAN · ความเห็นเบื้องต้นของผม: ตามหลักการข้อ 3 เป้า 45 นาทีควรหมายถึงเวลาที่ผู้เล่นเล่นได้จริงก่อนถูกพากลับ

### SF-5 · P1-F03-T01 — pillars ต้องครอบสามเรื่องที่ board ยังไม่เขียน
- ปัญหา (1) ไม่ได้บังคับให้เขียนกฎคู่ auto-retreat + movement gate ซึ่ง GDD บอกว่าเอาอันใดอันหนึ่งออกไม่ได้ (2) GDD "ที่ยังต้องตัดสินใจ" ยังมี 6 ข้อที่ไม่ได้ติ๊ก แต่ 5 ข้อมีหัวข้อตอบแล้วใน GDD เอง (damage, หา party, quick command, เข้าสู่ระบบ, สัญญาณขาด) ส่วนข้อ 10 นาทีแรกตอบไปบางส่วน รายการนี้จึงล้าสมัยและอาจทำให้ role อื่นเข้าใจว่ายังไม่มีสูตร damage (3) เจตนาของหน้าจอเมื่อ dungeon ไกลหรือผู้เล่นอยู่นอกพื้นที่ (GDD "ปัญหาที่ยังไม่มีคำตอบ") เป็นอำนาจของ game-director แต่ T15 ไม่มี deps กับ T01 uiux จึงต้องเดาเอง
- เปลี่ยนเป็น: เพิ่ม acceptance ใน T01
  - [ ] กฎคู่ auto-retreat + movement gate เป็น non-negotiable ที่ระบุชื่อ
  - [ ] ตารางรายการ "ที่ยังต้องตัดสินใจ" ต่อข้อ: ตอบแล้วในหัวข้อ GDD ใด / ยังเปิด / phase ที่ต้องตอบ พร้อมเสนอ decision authority HUMAN ให้ยืนยันว่ารายการนี้ล้าสมัย (GDD แก้ได้โดยคนเท่านั้น)
  - [ ] หัวข้อ "สถานะที่บ้าน": นิยามว่า "ไกล" และ "นอกพื้นที่" คืออะไร (อ้าง config key), สิ่งที่ผู้เล่นทำได้, และสิ่งที่ห้ามทำ (ห้ามให้รางวัลโดยไม่เดิน)
  - และเพิ่ม deps ของ P1-F03-T15 เป็น P1-F03-T01 (T15 ไม่ใช่งานที่ต้องเริ่ม wave 1 เพราะ T16 ก็รอ T01 อยู่แล้ว)

### SF-6 · P1-F03-T01, P1-F03-T06, P1-F03-T15 — เงื่อนไขปลดระบบยังไม่มีบ้านใน config
- ปัญหา: T01 ต้องระบุเงื่อนไขปลดตลาด ตีบวก raid stat เปลี่ยน class party ละเอียด และระยะ "ไกล" แต่ค่าเหล่านี้เป็นตัวเลข ต้องอยู่ใน config ของ systems-designer ตาม non-negotiable 3 ปัจจุบัน T06 ไม่มีไฟล์รองรับ
- เปลี่ยนเป็น: เพิ่มใน T06 `config/balance/unlocks.json` (เลเวลหรือเงื่อนไขปลดต่อระบบ, `home.far_dungeon_threshold_m`) ค่าที่ GDD ไม่ได้ระบุติดธง assumption · T01 และ T15 อ้างเป็น `config: unlocks.<system>` ไม่เขียนเลข

### SF-7 · P1-F03-T12 — map style ต้องไม่มีที่สำหรับตำแหน่งผู้เล่นคนอื่น
- ปัญหา: map style เป็นต้นแบบที่ทุก phase ใช้ต่อ ถ้าไม่เขียนกฎตั้งแต่ตอนนี้ จะมีคนเพิ่ม layer "ผู้เล่นใกล้ตัว" ในภายหลังได้ง่าย ขัด non-negotiable 4
- เปลี่ยนเป็น: เพิ่ม acceptance "style มี layer ตำแหน่งของตัวเองเท่านั้น · ข้อมูลผู้เล่นอื่นแสดงได้แค่จำนวนและ role ระดับ dungeon บน label ของรอยแยก ไม่มีจุด ไม่มี heatmap ผู้เล่น"

### SF-8 · P1-F03-T09 — preset ยังคัดลอกช่วงขนาดได้
- ปัญหา: acceptance ห้ามคัดลอกตัวเลข drop แต่ "ช่วงขนาด" ของ preset ยังไม่ได้บังคับให้อ้าง key ใน `dungeons.json` ค่าจะเพี้ยนระหว่างสองไฟล์ ตรงกับสิ่งที่ GDD "การกำหนด dungeon" เตือนไว้
- เปลี่ยนเป็น: "ช่วงขนาด ตัวคูณ และ drop table อ้าง key ใน `config/balance/` ทั้งหมด · `presets.json` เก็บเฉพาะ id, ชื่อ key, และค่าที่เป็นข้อมูลของ preset เอง (เช่น ช่วงเลเวลตั้งต้น) พร้อมเหตุผล"

### SF-9 · P1-F01-T01, P1-F01-T02, P1-F01-T04 — วัดที่ซ่อนอยู่ใน `historic=*` และ `tourism=attraction`
- ปัญหา: ในกรุงเทพ polygon `historic=*` และ `tourism=attraction` จำนวนมากคือวัดหรือเขตพระราชฐาน ถ้า blocklist ดูแค่ `amenity=place_of_worship` บน polygon เดียวกัน วัดที่ถูก tag เป็น historic จะหลุดเข้า candidates ขัด GDD "สถานที่ที่ไม่ควรเป็น dungeon" และเขตพระราชฐานหรือสถานที่ราชการเชิงสัญลักษณ์เป็นเรื่องอ่อนไหวที่ต้องให้คนตัดสิน
- เปลี่ยนเป็น: T01 กฎตัดครอบ polygon ที่มี node หรือ polygon ศาสนสถานอยู่ภายในหรือทับเกินสัดส่วนที่กำหนด (ค่าใน config) และ `building=temple|church|mosque` · T02 เพิ่มหมวดกำกวม "เขตพระราชฐาน อนุสาวรีย์ และสถานที่เชิงสัญลักษณ์ทางการเมือง" ส่ง HUMAN · T04 เพิ่ม case: วัดที่ tag เป็น `historic=*` หรือ `tourism=attraction`, สวนที่มีศาลเจ้าเล็กอยู่ข้างใน (ต้องตัดสินตามกฎ ไม่ใช่ตัดทั้งสวนโดยอัตโนมัติ), และงานวัดตาม MF-4

### SF-10 · P1-F02-T01 หรือ P1-F02-T02 — client-first ของ Phase 2 ต้องไม่กลายเป็น client-authoritative
- ปัญหา: Phase 2 เป็น client-first และใช้ `packages/shared` แต่ยังไม่มีเอกสารใดใน Phase 1 ประกาศว่าผลรางวัลจาก client เป็นแค่ต้นแบบ ถ้า ADR ไม่เขียนไว้ logic จะถูกเขียนแบบพึ่ง state ของ client และย้ายขึ้น server ยาก ขัด non-negotiable 1
- เปลี่ยนเป็น: เพิ่ม acceptance ใน T01 (หรือ T02) "logic ของ movement gate, damage, drop, exp เป็น pure function ใน `packages/shared` ที่รันฝั่ง server ได้และผ่าน golden test vectors ของ systems-designer · ผลที่คำนวณบน client ใน Phase 2 ไม่ถูกเก็บเป็นรางวัลจริงและไม่ย้ายเข้า account ใน Phase 3" · ถ้าภาษาของ `tools/sim/` ต่างจาก `packages/shared` ให้ vectors เป็นสัญญากลาง (protocol ข้อ 9)

### SF-11 · P1-F03-T05, P1-F03-T16 — กันการสอนสิ่งต้องห้ามและกันช่องพิมพ์อิสระ
- ปัญหา: T15 ตรวจลำดับปลดระบบแล้ว แต่ copy onboarding (T05) กับ flow (T16) ยังไม่มีข้อตรวจว่าไม่เอ่ยถึงตลาด ตีบวก raid การลงแต้ม stat เปลี่ยน class กลไก party ละเอียด anti-cheat หรือ lore ยาว ใน 10 นาทีแรก และไม่มีข้อห้ามช่องกรอกข้อความอิสระ
- เปลี่ยนเป็น: T05 เพิ่ม "key กลุ่ม `onboarding.*` ผ่าน script ตรวจคำของระบบต้องห้ามทั้ง 8 หมวด (รายการคำจาก style guide)" · T16 เพิ่ม "ไม่มีช่องกรอกข้อความอิสระในทุกหน้า (ชื่อตัวละครถ้ามี ให้เลือกจากชุดที่ระบบสร้าง หรือเสนอเป็น decision)" และ "flow นาที 0–10 ไม่มีทางไปหน้าของระบบต้องห้าม"

### SF-12 · P1-F03-T19 — metrics ยังไม่วัดหลักการข้อ 3 และหน้าจอที่บ้าน
- ปัญหา: north star และ guardrail ดีแล้ว แต่ไม่มีตัววัดว่าบทลงโทษต่ำจริงไหมและ 10 นาทีแรกพังที่ช่วงไหน
- เปลี่ยนเป็น: เพิ่ม guardrail อัตราส่วน auto-retreat ต่อการตาย และสัดส่วนคนที่ปิด auto-retreat · อัตรา tick ไม่ผ่าน gate ต่อ run · funnel ของครั้งแรกตามช่วง 0–1 / 1–3 / 3–6 / 6–8 / 8–10 · สัดส่วนการเปิดแอปครั้งแรกที่ dungeon ใกล้สุดเกิน `config: unlocks.home.far_dungeon_threshold_m` และสิ่งที่คนกลุ่มนั้นทำต่อ

### SF-13 · ลำดับ wave — map style อยู่บน critical path และ M0 ควรมาก่อน
- ปัญหา (1) T11 (critical path) รอ T12 map style ซึ่งวางไว้ W5 ขณะที่ T10 style guide อยู่ W1 ถ้า T12 ช้าหรือต้องแก้จาก visual gate การเดินทดสอบจะเลื่อน และการเดินทดสอบคือที่เดียวที่วัด "อ่านจอกลางแดดได้ไหม" ของ style จริง (2) GDD "M0" เขียนว่า coverage "ต้องทำก่อนอย่างอื่นทั้งหมด" เพราะผลอาจเปลี่ยน design แต่ board ให้ heatmap (P1-F01-T06) ตามหลัง tile ถ้าผลออกมาเป็น "Go พร้อมทางเสริม" preset (T09) และ flow หน้าจอที่บ้าน (T16) อาจต้องแก้
- เปลี่ยนเป็น: ย้าย P1-F03-T12 ไป W2 หรือ W3 · ให้ความสำคัญกับ P1-F01-T06 ก่อน P1-F02-T06 ตาม GDD เว้นแต่คนยืนยันวันเดินทดสอบไว้แล้วและการสลับจะทำให้เลื่อนวันจริง (producer ตัดสินตามความพร้อมของคน) · เพิ่ม P1-F01-T06 เป็น input แบบ optional ของ T09 และ T16 และถ้า F01 ออกมาไม่ใช่ Go ล้วน ให้ orchestrator ส่ง handoff ให้ game-director ประเมินผลต่อ pillars และ preset ก่อนปิด phase

## 4. Findings — nice-to-have

| # | Task | ปัญหา | ข้อเสนอ |
| --- | --- | --- | --- |
| N-1 | P1-F03-T24, P1-F03-T26 | design gate A ให้ game-director ตรวจ `design/pillars.md` ของตัวเอง | เพิ่ม pillars ในงาน HUMAN T26 (ยืนยัน world + pillars ในรอบเดียว) หรือให้ product-manager ตรวจไขว้ใน T19 · gate A ตรวจแค่ความสอดคล้องของเอกสารอื่นกับ pillars |
| N-2 | P1-F03-T18 | audio direction ไม่มี deps กับ pillars | เพิ่ม T01 เป็น input แบบ optional (ไม่ต้องเป็น deps แข็ง) |
| N-3 | P1-F01-T03 | เกณฑ์ "อยู่ภายใน X ม." เป็นเรื่องเจตนาของเกม (ระยะที่คนยอมเดิน) | เพิ่ม input: GDD "10 นาทีแรกของคนใหม่" (ตัวอย่าง 650 ม. และปัญหา 3 กม.) และ `design/pillars.md` ถ้ามี |
| N-4 | P1-F03-T20 | ปฏิทิน live ops อาจสร้าง event แข่งกันระหว่างผู้เล่นหรือทีม | เพิ่ม acceptance "ไม่มี event ที่ผู้เล่นหรือกลุ่มแข่งกันเอง · อันดับ contribution ของ raid เป็นไปตาม GDD เท่านั้น" |
| N-5 | P1-F03-T06 | `enhance.json` ไม่ได้บังคับว่าไม่มีผล "ของแตก" | เพิ่ม "ผลล้มเหลวมีแค่ลดระดับตาม GDD และสะสมความล้มเหลว ไม่มีสถานะแตก" |
| N-6 | P1-F01-T02 | เกณฑ์ย่านเปิดตัวยังไม่ให้น้ำหนักการเดินเข้าถึง | ให้น้ำหนักทางเท้าและระยะเดินจากสถานีรถไฟฟ้า/ป้ายรถเมล์ มากกว่าที่จอดรถ |
| N-7 | P1-F02-T10 | T10 ใช้ copy key ของสถานะ GPS แต่ T05 ส่งมอบใน W8 | ให้ T16 ประกาศชื่อ key กลุ่ม `gps.*` ก่อน และ T10 ใช้ชื่อนั้น (ข้อความไทยตามมาทีหลัง) |
| N-8 | ภาพรวม | game-director มี 4 งานและว่างช่วง W2–W8 | ถ้า producer ต้องการ ให้ game-director ร่าง spec F04 (Dungeon Presence) หลัง T01 เพื่อให้ Phase 2 เริ่มเร็ว · ไม่นับเป็น exit ของ Phase 1 |

## 5. ความครบของ F03 และการครอบของ design gate

| สาย | งานบน board | ครบตาม roadmap | gate ที่ครอบ | ความเห็น |
| --- | --- | --- | --- | --- |
| Pillars + ดัชนี spec | T01 | ครบ | A (ตรวจตัวเอง ดู N-1) | ต้องเพิ่มตาม SF-5, SF-6 |
| World / lore | T02, T26 | ครบ | A + HUMAN | ดี · ธง `[HUMAN]` ต้นไฟล์ช่วยคนได้มาก |
| คู่มือ copy + ชื่อ | T03, T04 | ครบ | copy gate + A | ดี |
| Copy bank core loop | T05 | ครบแต่ขาด key ต้นทาง | copy gate + A | ขึ้นกับ MF-1, SF-11 |
| Balance model + config | T06 | ครบ | B | เพิ่ม `unlocks.json` (SF-6) |
| Simulator + vectors | T07, T08 | ครบ | QA + B | แก้ SF-3, SF-4 |
| Dungeon preset | T09 | ครบ | A | แก้ SF-8 |
| Art direction + avatar + style tile | T10, T11, T13, T14 | ครบ | visual gate + B | avatar 2D layered ตรง v1 cut list |
| Map style | T12 | ครบ | visual gate + B | แก้ SF-7, SF-13 |
| IA + flow + wireframe | T15, T16, T17 | ขาดจังหวะ HP และ consent | copy + visual + A (อนุมัติ core-loop flow) | MF-1, MF-2 |
| Audio | T18 | ครบ | A | vibration ก่อนเสียงตรงเจตนา "มือถืออยู่ในกระเป๋า" |
| Motion / VFX | ไม่มี | ขาด | ไม่มี | MF-5 |
| Metrics + telemetry | T19 | ครบ | B | แก้ SF-12 |
| Live ops | T20 | ครบ | A | แก้ MF-4, N-4 |

ข้อสังเกตเรื่อง gate: การแยก design gate เป็น A และ B เหมาะสม ลำดับ gate (copy/visual/QA ก่อน design) ถูกต้อง เพราะผมตรวจเจตนาหลังเจ้าของตรวจความถูกต้องของสายตัวเองแล้ว ขอให้ acceptance ของ T24 และ T25 เพิ่มหนึ่งข้อ: "ผลรายเอกสารระบุ role, verdict และ finding ที่ต้องแก้ เพื่อให้ E14 ตรวจรายการได้ตรง"

## 6. เอกสารทิศทางราย role

| Role | เอกสารทิศทางใน Phase 1 | ผ่าน gate ใด | สถานะในแผน |
| --- | --- | --- | --- |
| game-director | `design/pillars.md` | A (ดู N-1) | มี |
| narrative-designer | `world.md`, `style-guide.md` | A + HUMAN | มี |
| systems-designer | `balance-model.md`, `sim-report.md` | QA + B | มี |
| level-designer | `dungeon-rules.md`, `launch-criteria.md`, `presets.md` | design gate F01 + A | มี |
| art-director | style guide, icon grammar, avatar spec, map style | visual + B | มี |
| artist-2d | style tile, avatar placeholder (งานตามทิศทางของ art-director) | visual | มี (ไม่ต้องมีเอกสารแยก) |
| vfx-animator | ไม่มี | ไม่มี | **ขาด (MF-5)** |
| uiux-designer | IA, flow, tokens, components | copy + visual + A | มี |
| sound-designer | `audio/direction.md`, cue list | A | มี |
| product-manager | metrics, telemetry, PRD F01 | B + product gate F01 | มี |
| liveops-operator | calendar, tuning playbook | A | มี |
| tech-lead, gameplay, location, devops | ADR 0001/0002, tech note F02 | tech gate | มี (นอกขอบเขต design gate ต้องเขียนใน E14) |
| backend-programmer | ADR 0002 (ผู้ใช้เอกสาร ไม่ใช่ผู้เขียน) | tech gate + HUMAN T22 | ยอมรับได้ ถ้า E14 ระบุตาม MF-5 |
| qa-tester | test plan F01/F02, field-walk kit | QA gate | มี |
| producer | board, risk register | — | ไม่อยู่ในขอบเขต E14 |

## 7. ตรวจ non-negotiables บน board

| # | Non-negotiable | สถานะในแผน | หมายเหตุ |
| --- | --- | --- | --- |
| 1 | Server-authoritative | ผ่านสำหรับ Phase 1 (ยังไม่มีรางวัล) แต่ยังไม่มีข้อผูกมัดสำหรับ Phase 2 | SF-10 |
| 2 | Movement gate เดียวกันทุกรางวัล | ผ่าน · อยู่ใน `dungeons.json` (T06), trace "วางนิ่ง" และ "ม้านั่ง jitter" (F02-T04) | ให้ pillars เขียนกฎคู่กับ auto-retreat (SF-5) |
| 3 | ค่าและชื่ออยู่ใน config | ผ่านเกือบทั้งหมด | ขาดบ้านของเงื่อนไขปลด (SF-6), preset ยังคัดลอกขนาดได้ (SF-8) |
| 4 | ไม่มี PvP, ไม่มีแชทอิสระ, ไม่แสดงตำแหน่งรายบุคคล | ผ่านใน T16, T19 | เพิ่มใน map style (SF-7), ห้ามช่องพิมพ์อิสระ (SF-11), ไม่มี event แข่งกัน (N-4) |
| 5 | Outdoor only + `verification_mode`, `floor_level` | ผ่าน · อยู่ใน F01-T02 และ T09 | — |
| 6 | บทลงโทษต่ำ | ยังไม่ผ่าน · flow ไม่มี auto-retreat default | MF-1, N-5 |
| 7 | PDPA | ยังไม่ผ่าน · ไม่มี consent ใน onboarding และพิกัดจริงเสี่ยงเข้า git | MF-2, MF-3 |

v1 cut list: ไม่พบงานใดแอบนำ AR, dungeon ในอาคาร, แชทอิสระ, avatar 3D หรือ PvP เข้ามา · รายการห้ามสอนใน 10 นาทีแรกครอบใน T01 และ T15 แล้ว เหลือ copy และ flow (SF-11)

## 8. ความไม่สอดคล้องใน GDD และวิธีจัดการที่ต้องการ

หลักร่วมของทุกข้อ: game-director แก้ GDD ไม่ได้ · Phase 1 ต้องให้ simulator ได้ค่าตามตาราง GDD (exit criterion) ดังนั้น **config ใช้ค่าตาม GDD ไปก่อนทุกข้อ** แล้วเสนอ decision authority HUMAN พร้อมคำแนะนำ ไม่ให้ข้อใดขวางงานใน Phase 1

### 8.1 Support base 25 / cap 50 (= 0.50) เกินกฎ "base ราว 1/3 ถึง 2/5 ของ cap"
ข้อเท็จจริง (GDD "Buff และ debuff ต่อ role", "สูตร buff stacking"): ค่า 32.3% ต่อ Support 1 คนเลเวล 25 ที่ GDD พิมพ์ไว้ คำนวณจาก 25/50 จริง ตัวเลขกับตารางจึงสอดคล้องกัน ที่ขัดคือกฎที่เขียนไว้ข้างบน

การอ่านของผม: กฎนี้กันปัญหาฝั่ง base **ต่ำ** เกินไป (เส้นโค้งแบน ซ้อน role เดิมยังคุ้ม) Support ที่ 0.50 ผิดกฎฝั่ง **สูง** ซึ่งทำให้ซ้อน Support ไม่คุ้มเร็วกว่าเดิม (ส่วนเพิ่มคนที่ 2 / 3 / 4 ที่เลเวล 25 ราว +11.4 / +4.0 / +1.4 เทียบ Tanker +11.3 / +5.8 / +3.0) เจตนาของกฎ "ให้ party เติม role ที่ขาด" จึงยังได้อยู่ ผลเสียที่มีจริงคือ Support คนที่ 2 ขึ้นไปแทบไม่เพิ่มอะไร ซึ่งแตะหลักการข้อ 4 เล็กน้อย

ตัวเลือกที่ส่ง HUMAN
- (ก) คง 25/50 และให้ GDD ระบุว่า Support เป็นข้อยกเว้นของกฎโดยเจตนา เพราะการขาด Support มี debuff หนักสุด (heal ไม่ได้เลย) Support คนแรกจึงควรคุ้มมาก
- (ข) ลด base เป็น 20 (0.40) ให้เข้ากฎ · ค่าต่อ 1 คนเลเวล 25 เหลือราว 26.8% และเส้นโค้งใกล้ Tanker · ต้องแก้ตัวเลข 32.3% ใน GDD · เป็นการเปลี่ยน −20% พอดี ซึ่งอยู่ที่ขอบอำนาจของผม แต่ขัดข้อความ GDD จึงต้องเป็น HUMAN

คำแนะนำ: **(ก)** · หลักการที่ใช้ตามลำดับ: ข้อ 1 และ 2 ไม่เกี่ยว · ข้อ 3 (บทลงโทษต่ำ) ชี้ไปที่ (ก) เพราะ Support คนแรกที่แรงลดโอกาสตายของทั้ง party ในดันที่คนเดินทางมาไกล · ข้อ 4 มีน้ำหนักน้อยกว่าและผลกระทบแค่ Support ซ้ำ
งานที่ต้องทำ: T06 รายงานตารางส่วนเพิ่มของทุก role · T08 รันอัตรารางวัล party ต่อหัว (เป้า 1.8–2.2) ภายใต้ทั้ง (ก) และ (ข) · HUMAN ตัดสินใน P1-F03-T28 (SF-1) ก่อนเริ่ม Phase 3 (F09 ใช้ค่านี้)

### 8.2 รายได้ 1,470 gold/ชม. เทียบค่ายา 600 = 2.45 แต่ GDD เขียนว่า "ตรงกับเป้าหมาย 2.5–3"
ข้อเท็จจริง: GDD "ราคา NPC และยา" คำนวณได้ 2.45 และ GDD "Gold source" ตั้งเป้า "ราว 2.5–3 เท่า" · roadmap Phase 4 ใช้ทั้งสองตัวเลขเป็น exit criterion พร้อมกัน ซึ่งเป็นไปไม่ได้ตามตัวอักษร (SF-2) · protocol ข้อ 5 กำหนดว่าเป้าเศรษฐกิจใน GDD ที่พลาดต้อง escalate HUMAN

ตัวเลือกที่ส่ง HUMAN
- (ก) คงค่า GDD และยืนยันว่า 2.45 อยู่ในเป้า "ราว 2.5" · systems-designer กำหนด tolerance เป็น config key · roadmap Phase 4 แก้เป็น "อัตราส่วนอยู่ในช่วงเป้าที่ยืนยันใน decision log"
- (ข) ปรับค่าเล็กน้อย (ราว 2%) ให้ถึง 2.5 เช่น เพิ่มราคาขายวัตถุดิบ NPC หรือลดราคายา · อยู่ในอำนาจของ systems-designer (น้อยกว่า ±20%) แต่เปลี่ยนตัวเลขที่ GDD พิมพ์ไว้จึงต้องเป็น HUMAN

คำแนะนำ: **(ก)** · หลักการข้อ 1 (จำกัดสิ่งที่ไหลเข้าเศรษฐกิจส่วนกลาง) ชี้ไปที่อัตราส่วนที่ต่ำกว่า เพราะทั้งสองวิธีใน (ข) เพิ่ม gold ส่วนเกินต่อชั่วโมง · ข้อ 3 ไม่ถูกกระทบเพราะส่วนต่าง 2% อยู่ในความคลาดเคลื่อนของค่าประมาณ และ GDD "ค่าที่ต้องจูนก่อนอื่นหลัง beta" จะจูนจากข้อมูลจริงอยู่แล้ว · ผู้เขียน GDD ก็เขียนว่า "ตรงกับเป้าหมาย" แสดงเจตนาว่า 2.45 ยอมรับได้
เงื่อนไข: ตัวเลข 600 ต้องคำนวณได้จาก damage model ก่อน (SF-3) ถ้า simulator ได้ค่ายาต่างจาก 600 มาก คำแนะนำนี้ต้องประเมินใหม่

### 8.3 ความไม่สอดคล้องเพิ่มเติมที่ producer ยังไม่ได้ยก
| ข้อ | หัวข้อ GDD ที่ขัดกัน | วิธีจัดการ |
| --- | --- | --- |
| งานวัดเป็น dungeon ชั่วคราว vs ห้ามวัดและศาสนสถาน | "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม" vs "สถานที่ที่ไม่ควรเป็น dungeon" | MF-4 · ระหว่างรอ HUMAN ใช้ blocklist เป็นหลัก |
| รายการ "ที่ยังต้องตัดสินใจ" ยังไม่ติ๊ก แต่ 5 ข้อมีคำตอบใน GDD แล้ว | "ที่ยังต้องตัดสินใจ" vs "damage มาจากไหน", "วิธีหา party", "Quick command", "การเข้าสู่ระบบ", "สัญญาณขาดและแอปถูกปิด" | SF-5 · pillars ทำตารางสถานะ และเสนอ HUMAN ยืนยัน |
| เวลาอยู่รอด 45 นาทีไม่บอกว่านับถึงไหน | "damage มาจากไหน" vs "ระบบกันตาย" | SF-4 · รายงานทั้งสองค่า |
| exit criterion Phase 4 เป็นไปไม่ได้ตามตัวอักษร | roadmap Phase 4 vs GDD "ราคา NPC และยา" | SF-2 · ยกใน P1-F03-T28 |

## 9. สิ่งที่เห็นด้วยและไม่ต้องแก้

- critical path ผ่าน spike และการเดินทดสอบของคน · การให้คนเริ่ม P1-F02-T17 ตั้งแต่ W1 ถูกต้อง
- F01 มี design gate และ PRD ที่ตั้งเกณฑ์ Go ก่อนเห็นข้อมูล ป้องกันการเลือกผลภายหลัง
- simulator แยกเป็นแกนสูตรกับ economy และมี QA ตรวจอิสระก่อน design gate B
- trace สังเคราะห์ครอบ "วางนิ่ง" และ "ม้านั่ง jitter" ซึ่งเป็นสองกรณีที่พิสูจน์เจตนาของ movement gate
- vibration pattern มาก่อนเสียงใน T18 ตรงกับเจตนา idle ที่มือถืออยู่ในกระเป๋า
- ไม่มีงานใดแตะ AR, dungeon ในอาคาร, แชทอิสระ, avatar 3D หรือ PvP
- backend-programmer ไม่มีงานใน Phase 1 ยอมรับได้ เพราะ ADR 0002 ไม่ต้องใช้ผู้ implement และ Phase 1–2 เป็น client-first

## 10. สรุป handoff ถึงเจ้าของ

| ถึง | เรื่อง | Finding | blocking |
| --- | --- | --- | --- |
| producer | แก้ acceptance T15, T16, T17 ตาม MF-1 และ MF-2 | MF-1, MF-2 | yes |
| producer | แก้ T03, T11, T14, T20 (F02) เรื่องพิกัดจริง | MF-3 | yes |
| producer | ลบวลีงานวัดจาก P1-F03-T20 และเพิ่ม decision | MF-4 | yes |
| producer | เพิ่ม P1-F03-T27 (vfx-animator) หรือขอ HUMAN อนุมัติ E14 และแก้ข้อความ E14 | MF-5 | yes |
| producer | เพิ่ม HUMAN P1-F03-T28 และแก้ T25 | SF-1, SF-2 | no |
| producer | แก้ acceptance ตาม SF-3 ถึง SF-12 และลำดับ wave ตาม SF-13 | SF-3 ถึง SF-13 | no |
