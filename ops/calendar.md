# Live Ops Calendar — กรอบทิศทาง + ตัวอย่างไตรมาสแรก

Task: P1-F03-T20 · เจ้าของ: liveops-operator · สถานะ: ฉบับตั้งต้น (spec)
ขอบเขต (ตาม PM-S04): เอกสารนี้เป็น**กรอบทิศทาง**และ**ตัวอย่างปฏิทินไตรมาสแรก**เพื่อยืนยันแนวคิดเท่านั้น ไม่ใช่ปฏิทินเต็มปี ปฏิทินจริง 12 เดือนเป็นงาน F24 ใน Phase 8 เมื่อรู้ผล Go/No-go ของ F01/F02 และวันเปิดตัวจริงแล้ว
แหล่งอ้างอิง: `design/pillars.md`, `design/narrative/world.md` (Raid boss, รอยแยก), `config/balance/raid.json`, `config/balance/economy.json`, `design/systems/sim-report.md` (F-16, F-17), `product/metrics.md` (guardrail หัวข้อ 9), `design/levels/dungeon-rules.md` (D-006, D-049), `docs/adr/0002-backend-stack.md` (เพดาน free tier กับ raid วันเสาร์), GDD หัวข้อ "ความเสี่ยงที่ต้องเฝ้าดู", "Economy", "ระบบหลังบ้าน"

## 1. หลักการที่ทุก event ต้องผ่าน

1. **ไม่มีการ deploy** — ทุกการเปลี่ยนแปลงทำผ่าน config และ back office เท่านั้น ถ้าต้อง deploy ให้เขียนเป็น handoff ถึง tech-lead แทนการฝืนทำ
2. **กฎสองคน (two-person rule)** — ทุกการเปลี่ยนแปลงระบุ owner 1 คนและ approver อีก 1 คนที่ไม่ใช่คนเดียวกันเสมอ พร้อมเวลาเริ่ม เวลาจบ และแผน rollback
3. **dungeon ชั่วคราวต้องมีวันหมดอายุเสมอ** — ใช้ field lifecycle `temporaryDungeon` (`config/balance/dungeons.json#temporaryDungeon.expiryRequired = true`) ไม่ใช่ preset ตาม D-049 ห้ามปล่อยค้างไม่มีวันหมดอายุ
4. **ห้ามงานวัดหรือกิจกรรมในเขตศาสนสถานทั้งหมด** ตาม D-006 — event และตลาดนัดชั่วคราวต้องอยู่นอกเขตศาสนสถานเต็มพื้นที่เท่านั้น (ตรวจด้วย validator เดียวกับ F01, `design/levels/dungeon-rules.md` หัวข้อ 10)
5. **ไม่มีผู้เล่นหรือกลุ่มแข่งกันเอง** — ทุก event เป็นความร่วมมือ (co-op) เท่านั้น อันดับ contribution ที่มีอยู่แล้วมีเฉพาะของ raid ตาม GDD (`raid.json#contributionRankMult`) ห้ามเพิ่มอันดับแข่งขันระหว่างผู้เล่นหรือกลุ่มใหม่ (N-4, pillar P3)
6. **เวลาและวันของ raid มาจาก config เท่านั้น** — `config/balance/raid.json#schedule` (`weekday`, `startLocalTime`, `endLocalTime`, `timezone`) ห้าม hardcode วันเวลาในเอกสารหรือ copy ตรงๆ (world.md หัวข้อ 6) ปฏิทินนี้อ้างค่าปัจจุบัน (เสาร์ 16:00–18:00 Asia/Bangkok) เป็นตัวอย่างเท่านั้น
7. **ห้ามผูกเงินจริงหรือ sponsor โดยไม่มีการตัดสินของ HUMAN** — sponsored dungeon ทุกกรณีต้องติดป้ายชัดเจนตาม art direction และผ่าน HUMAN ก่อนเสมอ (ดูหัวข้อ 6)

## 2. ประเภท event หลัก

| ประเภท | คำอธิบาย | ตารางเวลา/สัญญาณเปิด | เจ้าของ / ผู้อนุมัติ |
| --- | --- | --- | --- |
| A. Raid ประจำสัปดาห์ | Raid boss ที่ประตูรอยแยก ทุกสัปดาห์ตาม `raid.json#schedule` | คงที่ทุกสัปดาห์ (เปลี่ยนวัน/เวลาต้องขอ tech-lead ตรวจ endLocalTime invariant ก่อน) | liveops-operator / game-director (รายละเอียดการรัน raid อยู่ใน `ops/raid-playbook.md` — เอกสารนั้นเป็นงานคนละ task ของ liveops-operator ในสัปดาห์ถัดไป ยังไม่มีในไฟล์นี้) |
| B. เทศกาลไทย | Reskin ชื่อ/ธีมของ dungeon ที่มีอยู่แล้วชั่วคราว (ผ่านชื่อ/copy จาก back office) + อาจเพิ่มตัวคูณ drop หรือ exp ชั่วคราวในขอบเขต tuning playbook | ตามปฏิทินเทศกาลไทย (เช่น สงกรานต์, ลอยกระทง, ปีใหม่) — **ไม่แตะพื้นที่หรือกิจกรรมในเขตวัด** ใช้เฉพาะ dungeon ที่ผ่าน D-006 อยู่แล้ว | liveops-operator / game-director |
| C. ฤดูฝน | มาตรการรับมือ DAU ตกช่วงฝน (GDD "ความเสี่ยงที่ต้องเฝ้าดู") เน้นกิจกรรมที่ทำที่บ้านได้ (ตีบวก, ตลาดผู้เล่น) เช่น ลดต้นทุนตีบวกชั่วคราวหรือเพิ่มโบนัสตลาด | เปิดเมื่อ GR-10 (DAU ฝนเทียบวันแห้งตกเกิน 30%) หรือตามฤดูกาลที่คาดไว้ล่วงหน้า (พ.ค.–ต.ค.) | liveops-operator / systems-designer (ค่าที่เปลี่ยนต้องอยู่ในขอบเขต tuning playbook หัวข้อ 3) |
| D. Dungeon ชั่วคราวที่ตลาดนัด/งาน event ทางโลก | dungeon ที่มีอยู่แล้วหรือใหม่ ติด field `temporaryDungeon` พร้อมวันหมดอายุ ใช้กับงานที่จัดครั้งเดียวจบนอกเขตศาสนสถานทั้งหมด (D-006, D-049) | ตามวันจัดงานจริงของสถานที่ (level-designer ยืนยัน polygon ผ่าน validator เดิมของ F01) | liveops-operator / level-designer (ตำแหน่ง), game-director (อนุมัติเปิด) |
| E. Sponsored dungeon | dungeon ที่มีป้ายผู้สนับสนุนชัดเจนตาม art direction พร้อมรายงานตัวชี้วัดให้ผู้สนับสนุน | ตามสัญญา (วันเริ่ม–จบชัดเจน) | **ต้องผ่าน HUMAN ก่อนเสมอ** (ดูหัวข้อ 6) — runbook lifecycle เต็มรูปเป็นงานถัดไปของ liveops-operator ใน `ops/runbooks/` (ไม่อยู่ใน scope ของ task นี้) |

## 3. ตัวอย่างปฏิทินไตรมาสแรก (ยืนยันแนวคิด ไม่ใช่วันจริง)

วันที่จริงยังตั้งไม่ได้ (รอผล Go/No-go ของ F01/F02 และวันเปิดตัว) จึงใช้เลขสัปดาห์นับจากวันเปิดตัว (W1 = สัปดาห์แรกที่เปิดให้เล่น) แทนวันปฏิทินจริง เมื่อรู้วันเปิดตัวแล้ว F24 (Phase 8) แปลงเป็นวันที่จริงและขยายเป็นปฏิทินเต็ม 12 เดือน

| สัปดาห์ | Event | ประเภท | Config ที่เปลี่ยน | Copy ที่ต้องใช้ | Owner / Approver | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| W1–W4 | Raid ทุกสัปดาห์ (α เปิดตัว) | A | `raid.json#bossHp.alphaLaunch` = 0.45 ตามค่าตั้งต้น 30 วันแรก | ประกาศ raid ก่อนวัน (ดู `ops/raid-playbook.md` เมื่อเขียนแล้ว) | liveops-operator / game-director | ไม่มีการเปลี่ยนค่าในช่วงนี้ (ใช้ค่า config ตั้งต้นตาม GDD) จึงไม่มี rollback ที่ต้องทำ |
| W5 | สิ้นสุดช่วง α เปิดตัว 30 วัน | A | `raid.json#bossHp.alphaLaunch` → `alphaTarget` (0.55) ตามกำหนดใน config เอง ไม่ต้องแก้มือ | แจ้งในสรุปหลัง raid ว่าบอสจะยากขึ้นจากสัปดาห์หน้า | systems-designer (ค่า) / game-director (ยืนยันจังหวะ) | หากบอส W5 ยากเกินคาด (median party ล้มทุก spawn point) เลื่อน `alphaLaunchPeriod_days` ออกไปอีก 1 สัปดาห์เป็นค่า config ชั่วคราว บันทึกเป็น decision |
| W6 | ตัวอย่างเทศกาลไทย (สมมติ: ปีใหม่/สงกรานต์ ขึ้นกับวันเปิดตัวจริง) | B | reskin ชื่อ dungeon/มอนสเตอร์ผ่าน `config/content/names.th.json` ชั่วคราว (คืนชื่อเดิมเมื่อจบ) + ตัวคูณ exp ชั่วคราวไม่เกิน ±20% ของ `progression.json#expPerTickCoef` (ในขอบเขต tuning playbook) | narrative-designer เตรียม copy ธีมเทศกาลล่วงหน้า ≥5 วันทำการ | liveops-operator / game-director | คืนค่า `names.th.json` และ `expPerTickCoef` เป็นค่าก่อนแก้ทันทีเมื่อครบกำหนด (เวลา end ที่ตั้งไว้ล่วงหน้า ไม่ต้องมีคนกดปิดเอง) |
| W7–W8 | Dungeon ชั่วคราวที่ตลาดนัดนอกเขตศาสนสถาน (ตัวอย่าง: งาน "ตลาดนัดกลางแจ้ง" ที่ level-designer ยืนยันแล้วว่าไม่ทับวัด) | D | เพิ่ม dungeon ใหม่ใน `data/dungeons/dungeons.json` พร้อม `temporaryDungeon.expiryAt` = วันสุดท้ายของงาน (บังคับ, D-049) | narrative-designer เตรียมชื่อ+คำขยายตาม style guide, ประกาศล่วงหน้าในแอป | liveops-operator (เปิด/ปิด) / level-designer (ยืนยันตำแหน่งและไม่ทับศาสนสถาน) | เมื่อถึง `expiryAt` dungeon ปิดอัตโนมัติ (บังคับโดย field lifecycle) หากต้องปิดก่อนกำหนด (เช่น สถานที่ยกเลิกงาน) ใช้ runbook "ปิด dungeon ฉุกเฉิน" (`ops/runbooks/` — งานถัดไป) |
| W9–W12 | ช่วงต้นฤดูฝน (ตัวอย่าง) | C | เปิดโบนัสกิจกรรมที่บ้านชั่วคราว: ลดต้นทุนตีบวก หรือเพิ่มอัตราแลกเปลี่ยนตลาดผู้เล่นชั่วคราว (ค่าที่แก้ต้องอยู่ในไฟล์ `enhance.json`/`economy.json` ที่ systems-designer เป็นเจ้าของ) | narrative-designer เตรียม copy "ฝนตก น้ำขังชั่วโมง กลับมาตีบวกที่บ้านก่อน" | liveops-operator / systems-designer (ค่าที่แก้), game-director (ถ้าเกิน ±20%) | เปิดเฉพาะช่วงเวลาที่ตั้งไว้ล่วงหน้า (start/end ชัดเจน) คืนค่าปกติอัตโนมัติเมื่อครบกำหนด · ถ้า GR-10 ยังตกต่อเนื่องหลังปรับ ส่ง handoff ถึง product-manager ทบทวนมาตรการ |
| W13 | สรุปไตรมาสแรก | — | ไม่มีการแก้ config ใหม่ | สรุปผลให้ game-director และ product-manager ก่อนวางแผนไตรมาสถัดไป | liveops-operator / producer | — |

หมายเหตุตัวอย่าง: แถวทั้งหมดในหัวข้อนี้เป็น**ตัวอย่างเพื่อยืนยันแนวคิด**เท่านั้น ทุกรายการต้องผ่านกฎสองคนและมี start/end จริงก่อนใช้งานจริง ไม่ใช่ค่าที่อนุมัติแล้ว

## 4. ความเสี่ยงจาก GDD และมาตรการที่ live ops รับผิดชอบ

ตาราง "ความเสี่ยงที่ต้องเฝ้าดู" ของ GDD 4 ข้อที่ตกเป็นงานเฝ้าระวังของ live ops (นอกเหนือจาก coverage และทางเท้าซึ่งเป็นงาน level-designer/M0):

| ความเสี่ยง | สัญญาณ (dashboard/guardrail) | มาตรการของ live ops | ผู้อนุมัติค่าที่เปลี่ยน |
| --- | --- | --- | --- |
| เงินเฟ้อ (แนวโน้มราคายา) | GR-4: ราคายาเบี่ยง > ±20% จาก config ตั้งต้นโดยไม่มี decision อนุมัติ | ปรับราคาขายวัตถุดิบให้ NPC ผ่าน tuning playbook (หัวข้อ NPC material prices) และเฝ้าดู GR-5 (F-16 gold สุทธิของ party) ควบคู่กัน ก่อนแตะภาษีขั้นบันได (`economy.json#marketTax`) ซึ่งเป็นงาน systems-designer โดยตรง | systems-designer (ค่า) / game-director (เกิน ±20%) |
| ผู้เล่นหนักถึงเพดานเนื้อหา (Level 50+ หายหลังสัปดาห์ 4) | GR-6 ≤ 25% | raid และตีบวกไม่มีเพดานอยู่แล้วตาม design · live ops เฝ้าดู GR-6 รายสัปดาห์ ถ้าใกล้ 25% ส่ง handoff ถึง game-director/product-manager พิจารณาคอนเทนต์ปลายเกมเพิ่ม (ไม่ใช่ของที่ live ops เปิดเองผ่าน config) | game-director (ตัดสินฟีเจอร์ใหม่ ไม่ใช่แค่ config) |
| Cold start ทางสังคม (party ขนาด 1) | GR-3: party เฉลี่ยทั้งระบบ ≤ 1.2 ติดต่อกัน 4 สัปดาห์ | เปิดพื้นที่จำกัดก่อนตาม launch criteria (level-designer) · ระหว่างดำเนินการ live ops หลีกเลี่ยงจัดหลาย event พร้อมกันที่แยกผู้เล่นออกจากกัน และพิจารณา dungeon ชั่วคราวแบบ D ที่จุดรวมคนเดิม (ตลาดนัด) เพื่อเพิ่มโอกาสเจอ party โดยไม่บังคับเจอกันจริง | liveops-operator (เลือกจังหวะ event) / product-manager (ยืนยันสัญญาณ) |
| DAU ฤดูฝนตก | GR-10: DAU ช่วงฝนตกไม่เกิน 30% เทียบวันแห้ง | เปิด event ประเภท C (หัวข้อ 2, 3) ล่วงหน้าก่อนฤดูฝน (พ.ค.) ไม่ใช่ตอบสนองทีหลัง · ถ้า GR-10 ยังตกเกินหลังมาตรการ ส่ง handoff ถึง product-manager และ systems-designer ทบทวนมาตรการที่บ้านเพิ่ม | systems-designer (ค่าที่แก้) / game-director (เกิน ±20%) |

## 5. เงินจริงและ sponsor — ต้อง HUMAN เสมอ

- **ห้าม agent ตัดสินใจเปิด sponsored dungeon, ทำสัญญา, หรือกำหนดราคาใดๆ ที่เกี่ยวกับเงินจริงเอง** ทุกกรณีเป็น handoff ถึง HUMAN ตาม CLAUDE.md ("ไม่มีการผูกมัดด้านการเงินหรือผู้สนับสนุนโดยไม่มีการตัดสินใจของมนุษย์")
- Sponsored dungeon ทุกแห่งต้องมี**ป้ายที่ผู้เล่นเห็นชัดเจนว่าได้รับการสนับสนุน** ตามแนวทางของ art-director (`art/direction/`) ห้ามกลืนไปกับ dungeon ปกติ
- รายละเอียด lifecycle เต็มรูป (วันเริ่ม–จบสัญญา, ตัวชี้วัดที่ส่งให้ผู้สนับสนุน) เป็น runbook แยกต่างหากใน `ops/runbooks/sponsored-dungeon-lifecycle.md` — **ยังไม่ได้เขียนในรอบนี้** (นอก scope ของ `writes` ของ task นี้) ส่งเป็น handoff ในรายงาน

## 6. Dependency: เพดาน free tier กับ raid วันเสาร์ (ไม่ตัดสินใจในเอกสารนี้)

- `docs/adr/0002-backend-stack.md` หัวข้อ 5.6 ยืนยันว่า raid วันเสาร์ที่เป้าหมาย 5,000 คนใน Phase 6 **เกิน Cloudflare Workers free tier แน่นอน** (เกิน request/write หลายเท่า) ส่วน raid ขนาดทดสอบ (≤ ราว 200 คน × 2 ชม.) ยังอยู่ใน free tier ได้
- D-036 (PROPOSED, HUMAN): ต้องขออนุมัติ Workers Paid **ก่อนเริ่ม Phase 6** (ก่อนทดสอบ raid ขนาดจริง) — เอกสารนี้บันทึกไว้เป็น**ข้อพึ่งพาของฝ่ายปฏิบัติการ (ops dependency)** เท่านั้น ไม่ใช่การตัดสินใจของ live ops · live ops มีหน้าที่เตือนล่วงหน้าในปฏิทินจริง (Phase 8, F24) ว่า raid ขนาดใหญ่กว่าทดสอบต้องรอ D-036 ผ่านก่อน ห้ามเปิด raid ขนาดที่เกิน free tier ก่อนได้รับอนุมัติ
- วันเวลา raid (`weekday`, `startLocalTime`, `endLocalTime`) มาจาก `config/balance/raid.json#schedule` เท่านั้น การเปลี่ยนวันเวลาต้องผ่าน tech-lead ตรวจ invariant `endLocalTime = startLocalTime + durationTicks × raidTick_s` ก่อนเสมอ (P1-H03)

## 7. สมมติฐานและช่องว่างที่เหลือ

- [ASSUMPTION A-P1-F03-T20-1]: วันจริงของไตรมาสแรกยังไม่ทราบ (รอ Go/No-go F01/F02) จึงใช้เลขสัปดาห์แทนวันปฏิทิน — ยืนยัน: producer เมื่อรู้วันเปิดตัว
- [ASSUMPTION A-P1-F03-T20-2]: `ops/raid-playbook.md` (pre-raid, ระหว่าง raid, after-raid, ปุ่มปิดฉุกเฉิน, report-queue triage, sponsored-dungeon lifecycle) เป็นงาน liveops-operator อีก task ที่ยังไม่ได้รับมอบหมายในรอบนี้ — ไฟล์นี้อ้างถึงไว้แต่ไม่เขียนแทน
- [ASSUMPTION A-P1-F03-T20-3]: ตัวคูณ exp/drop ชั่วคราวของ event ประเภท B/C ต้องอยู่ในขอบเขต ±20% ของ `ops/tuning-playbook.md` เสมอ ถ้าต้องการมากกว่านั้นต้องเป็น decision ของ game-director แยกต่างหาก ไม่ใช่ event ปกติ
- ปฏิทินเต็มปีจริง (12 เดือน) รอ F24 ใน Phase 8 ตาม PM-S04 — ไฟล์นี้เป็นกรอบทิศทางที่ F24 ขยายต่อ ไม่ใช่ของทดแทน

