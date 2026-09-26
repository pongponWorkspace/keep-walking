# PRD F05 — Movement Gate, Reward Tick และ Drop

Task: P2-F04-T02 · เจ้าของ: product-manager · สถานะ: DRAFT รอ Tech gate (P2-F05-T15), QA gate (P2-F05-T16), Content copy gate (P2-F05-T17), Design gate (P2-F05-T18) และ Product gate F04–F06 (P2-F06-T25)
อ้างอิงหลัก: GDD หัวข้อ "Core loop ใน Dungeon" (Reward tick, Movement gate, ไม่มีเพดานเวลา, ความเสี่ยงที่ต้องเฝ้าดู), "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง" ข้อ 2 ("รางวัลผูกกับการเคลื่อนไหวจริงเสมอ"), "Progression > Drop table" · `studio/roadmap.md` Phase 2 F05 · `CLAUDE.md` ("Economy: gold in/out, potion price trend") · `product/metrics.md` §1 (North star), §5 (Economy), §9 (GR-11) · `product/telemetry-events.md` §3 (`run_tick_granted`/`run_tick_denied`)
คู่กัน: `product/prd/F04-dungeon-presence.md` (Active state เป็นเงื่อนไขก่อนของ gate นี้), `product/prd/F06-hp-damage-onboarding.md` (ยาที่ได้จาก drop ใช้แก้ HP)

---

## 1. ปัญหาผู้เล่น (Problem statement)

**"ฉันเดินจริง เกมต้องรู้ ฉันไม่เดิน (วางมือถือไว้บนโต๊ะ) เกมต้องไม่ให้อะไรเลย"**

นี่คือกลไกที่ทำให้เกมทั้งเกม "วัดสิ่งที่มันอยากวัด" ตามที่ GDD เขียนไว้ตรงๆ — ถ้า reward ไม่ผูกกับการเดิน north star ("นาทีเดินที่ validate แล้วต่อสัปดาห์ต่อผู้เล่น active") จะไม่มีความหมายอะไรเลย เพราะวัดแค่ "เวลาที่แอปเปิดค้าง" ไม่ใช่ "เวลาที่เดินจริง"

Movement gate ต้องแก้สองด้านพร้อมกันโดยไม่ทำร้ายอีกด้าน:

1. **กันโกงและกันฟาร์มด้วยมือถือวางนิ่ง** — สะสมระยะต้องเกิน 50 เมตรใน 5 นาที ถึงจะได้ tick
2. **ไม่ลงโทษการเดินจริงที่ GPS jitter ตามธรรมชาติ** — นั่งม้านั่งคุยโทรศัพท์ต้องยังได้ tick ถ้าระยะสะสมจริงเกินเกณฑ์จาก jitter เอง แต่ไม่ใช่ "แกล้งเขย่ามือถือ"

ถ้า gate เข้มไป คนเดินจริงจะไม่ได้ของและเลิกเล่น ถ้า gate หลวมไป คนวางมือถือฟาร์มจะทำลาย economy และทำให้ north star โกหก — เอกสารนี้กำหนดว่า Phase 2 ต้องพิสูจน์อะไรก่อนให้ผ่านทั้งสองด้าน

## 2. กลุ่มผู้เล่นเป้าหมายและผลกระทบต่อ F05 (ตาม CLAUDE.md)

| กลุ่ม | ผลกระทบเฉพาะของ F05 | ทางที่ F05 ตอบ |
| --- | --- | --- |
| ผู้เล่นเวลาน้อย (~40 นาที/วัน) เทียบผู้เล่นเวลามาก (3–6 ชม./วัน) | ผู้เล่นเวลาน้อยเดินได้ประมาณ 8 tick ต่อวัน (40 นาที ÷ 5 นาที) เทียบผู้เล่นเวลามากที่ได้ 36–72 tick — ช่องว่างราว 9 เท่าตามที่ GDD ยอมรับไว้แล้วในหัวข้อ "ความเสี่ยงที่ต้องเฝ้าดู" ไม่มีเพดานเวลาหรือ diminishing return ทั้งสองกลุ่ม เพื่อไม่ลงโทษคนขยัน แต่ต้องเฝ้าดูว่าราคายาไม่ขยับจนคนเวลาน้อยซื้อไม่ไหว (GR-4) | ไม่จำกัด tick ต่อ run/วัน ตาม GDD ตรงๆ · เฝ้าระวังผ่าน GR-4/GR-5 ใน `product/metrics.md` §9 |
| ผู้เล่นอยู่บ้านตอนฝนตก | ฝนตกแปลว่าเดินไม่ได้ = ไม่มี tick เกิดขึ้นเลยในวันนั้น (movement gate ไม่มีข้อยกเว้นให้กิจกรรมที่บ้าน ตามหลักการข้อ 2 ของ GDD) | ไม่มีทางออกจาก F05 โดยตรง — เป็นของ Seasonality/กิจกรรมที่บ้าน (ตีบวก/ตลาด) ที่ Phase 4 จะทำ F05 มีหน้าที่แค่ไม่แอบผ่อน gate เพื่อชดเชยวันฝนตก (NN-8 ข้อ 3 ห้ามผ่อน gate เพื่อชดเชยอย่างอื่น) |
| ผู้เล่นอยู่นอกพื้นที่เล่น/นอกย่านเปิดตัว | ไม่มี dungeon ให้เข้าเลยจึงไม่มี tick ให้พูดถึง — F05 ไม่เกี่ยวข้องโดยตรงกับกลุ่มนี้ | ไม่มี — อยู่ในขอบเขต F04/F06 |

## 3. ขอบเขตสิ่งที่ F05 ส่งมอบ (ตาม roadmap Phase 2)

- tick ทุก 5 นาที นับเมื่อระยะสะสมเกิน 50 เมตร (movement gate เดียวกันทั้ง dungeon และ raid boส ไม่มีข้อยกเว้น)
- drop table (Common–Legendary) และ exp ต่อ tick จาก config (ไม่ hardcode)
- สรุปรางวัลหลังจบ run (`dungeon_exited` พร้อม `ticks_granted_count`)
- feedback ตอนได้ของ (icon / effect / เสียง) — ทำงานร่วมกับ artist-2d, vfx-animator, sound-designer
- ยาที่ผู้เล่นได้ทั้งหมดมาจาก drop ของ tick ที่ผ่าน gate เท่านั้น ไม่มีชุดยาตั้งต้นให้ผู้เล่นใหม่ (A-P2-PLAN-02-1 — คำตัดสินของ game-director) — เป็นเจตนาให้เห็นชัดว่ายาเป็น gold sink ที่ผูกกับการเดินจริงตั้งแต่ต้น ไม่ใช่ของแถม

## 4. ตัวชี้วัดและเป้าที่วัดได้ใน playtest

Movement gate คือส่วนที่ north star **คำนวณจากมันโดยตรง** (`product/metrics.md` §1: "ผลรวมเวลาที่ run อยู่ Active ในหน้าต่างที่ผ่าน movement gate อย่างน้อย 1 ครั้ง") ดังนั้นเอกสารนี้ต้องนิยาม **proxy metric ฝั่ง client สำหรับ Phase 2** เพราะยังไม่มี server คำนวณ north star จริง (แก้ข้อเสนอ PM-S3 จาก plan review):

**North star proxy (Phase 2 เท่านั้น, ไม่ใช่ north star จริงของ production):** ผลรวมนาทีที่ run อยู่ Active และมีอย่างน้อย 1 `run_tick_granted` ในหน้าต่าง `config: dungeons.movementGate.window_s` เดียวกัน ต่อผู้เล่นต่อ session — คำนวณจาก **event เดียวกับที่ตัดสินรางวัลจริง** (`run_tick_granted` จาก engine เดียวกันใน `packages/shared/src/reward`) ไม่ใช่เวลาที่แอปเปิดค้างหรือ timestamp ที่ client รายงานแยกต่างหาก จึงรักษาหลักการ "ผูกกับ movement gate เดียวกับที่ตัดสินรางวัลจริง" ไว้ครบแม้ยังไม่มี server — P2-F06-T19/T28 ใช้ค่านี้รายงานคู่กับผลแบบสอบถามเชิงคุณภาพ

| Metric | คำนวณจาก | เป้าที่วัดได้ใน playtest Phase 2 | Event |
| --- | --- | --- | --- |
| **สัดส่วน tick ที่ผ่าน gate ขณะเดินจริง** (ตัวชี้วัดหลักของ F05) | `run_tick_granted` หารด้วยผลรวม `run_tick_granted` + `run_tick_denied` ระหว่างช่วงที่ผู้สังเกตยืนยันว่าผู้เล่นกำลังเดินจริง (ไม่ใช่หยุดนิ่งตั้งใจ) | ≥ 95% ของหน้าต่างที่เดินจริงต้องได้ tick (อ้างเกณฑ์ spike S12 เดิม ≥95% Go ใน `product/metrics.md` GR-11 — Phase 2 คือรอบแรกที่เทียบ production กับ spike) | `run_tick_granted`, `run_tick_denied` |
| trace "มือถือวางนิ่ง" (`table-still`) ต้องได้ 0 tick | golden test vector ของ P2-F05-T02 เทียบผล engine | 0 tick ทุกหน้าต่าง — ไม่มีเกณฑ์ผ่อน (เกณฑ์ปิด F05 ตาม roadmap Phase 2 ตรงๆ) | — (ผล unit test) |
| trace "นั่งม้านั่งมี jitter" (`bench-jitter`) ยังได้ tick | golden test vector เดียวกัน | ≥ 1 tick ต่อหน้าต่างที่มี jitter ธรรมชาติตามที่ location-engineer กำหนด fixture | — (ผล unit test) |
| อัตราปิดฉุกเฉิน/speed lock ระหว่างเดินจริง (ภาคสนาม) | `anticheat_speed_lock_triggered` (เข้า/ออก lock) | ไม่ควร trigger เลยระหว่างเดินปกติ — ถ้า trigger ให้บันทึกเป็นบั๊กที่ P2-F05-T13 (ตัวกรองความเร็ว) ต้องแก้ก่อนปิด F05 | `anticheat_speed_lock_triggered` |
| gold เข้า/ออกต่อวัน, ratio รายได้ต่อค่ายา | `economy_gold_earned` เทียบ `economy_gold_spent` | Phase 2 ยังไม่มีตลาด/ตีบวกจริง (`product/metrics.md` §11) — ใช้ log จาก client-side sim เป็น baseline เปรียบเทียบกับ `design/systems/sim-report.md` เท่านั้น ยังไม่ใช่ production metric | `economy_gold_earned`, `economy_gold_spent` (schema ประกาศไว้ล่วงหน้า) |
| แนวโน้มราคายา (inflation) — GR-4 | ราคาขาย NPC เทียบ baseline ใน config | เบี่ยงไม่เกิน ±20% โดยไม่มี decision อนุมัติ (`product/metrics.md` §9) — Phase 2 วัดได้เฉพาะราคาตั้งต้นใน config เพราะยังไม่มีตลาดผู้เล่นจริง | `economy_potion_price_observed` (schema ประกาศไว้ล่วงหน้า) |

หมายเหตุ: metric แถวแรก ("สัดส่วน tick ที่ผ่าน gate ขณะเดิน") เป็น **ตัวชี้วัดที่ CLAUDE.md ระบุชื่อไว้ตรงๆ** ("proportion of ticks that pass the gate while walking") และเป็นเกณฑ์ที่ต้องผ่านก่อน design gate F04+F05 อนุมัติ (P2-F05-T18 ตรวจ "gate เดียวไม่มีข้อยกเว้น")

## 5. Non-goals ของ F05

- **ไม่คำนวณ contribution/drop จริงฝั่ง server** — Phase 2 เป็น client-first ทั้งหมด (C1-1) engine เดียวกันจะย้ายไป server ใน Phase 3 โดยไม่เปลี่ยนสัญญา (`sessionStep`) แต่ผลที่ได้ใน Phase 2 ไม่ใช่รางวัลจริง
- **ไม่มี raid boss** — gate ตัวเดียวกันนี้ผูกกับ raid ด้วยตาม GDD แต่ raid boss เองเลื่อนไป Phase 6 (F16–F18) F05 ส่งมอบแค่ตัว gate ที่พร้อมให้ raid เรียกใช้ภายหลัง
- **ไม่มี bad-luck protection ของ drop table** — เป็นทางเลือกของเฟสหลังตาม sim-report F-17 (GR-7) Phase 2 เฝ้าดูอย่างเดียวไม่ action
- **ไม่มี market/ตีบวกจริง** — economy metric ในหัวข้อ 4 เป็น baseline เปรียบเทียบ ไม่ใช่ production metric เพราะ F08 (market), F11 (ตีบวกเต็มรูป) ยังไม่เริ่ม
- **ไม่ลด sampling ของ `run_tick_granted`/`run_tick_denied`** ไม่ว่ากรณีใด แม้ปริมาณ telemetry จะเกินโควตา (ขัด NN-2 ตาม `product/telemetry-events.md` §8 ข้อ 3) — เป็นเส้นตายที่ไม่ต่อรอง

## 6. คำถามที่ playtest ต้องตอบ

1. เดินจริงแล้วรู้สึกว่า "ได้ tick สม่ำเสมอตามที่เดิน" หรือรู้สึกว่าบางครั้งเดินแล้วไม่ได้ทั้งที่มั่นใจว่าเดินเกิน 50 เมตรแล้ว
2. นั่งพักคุยโทรศัพท์/รอสัญญาณไฟระหว่างเดิน ยังรู้สึกว่าเกม "ไม่ตัดสิทธิ์" ไหม (ทดสอบว่า jitter tolerance ตรงกับความรู้สึกจริง ไม่ใช่แค่ตัวเลขในเอกสาร)
3. feedback ตอนได้ของ (icon/effect/เสียง) รู้สึกคุ้มค่ากับความพยายามเดินไหม หรือรู้สึกจางเกินไปจนไม่อยากเดินต่อ
4. ผู้เล่นเข้าใจไหมว่าทำไมเดิน 3 ชั่วโมงถึงได้เยอะกว่าเดิน 40 นาที และรู้สึกแฟร์ไหม (ทดสอบทัศนคติต่อ "ไม่มีเพดานเวลา" ของ GDD)

## 7. ข้อจำกัดของ playtest

- **ผลบน client ใน Phase 2 ไม่ใช่รางวัลจริง** (C1-1/C1-5) — tick, gold, drop ที่เห็นในหน้าจอเป็นผลจาก engine ฝั่ง client ล้วนๆ ยังไม่ผ่านการยืนยันซ้ำจาก server ห้ามใช้ตัวเลขเหล่านี้เป็นฐานคำนวณ production economy
- **ไม่แสดงจำนวนคนในสถานที่** — `party_size_bucket`/`full_role` ใน `run_tick_granted` เก็บ schema ไว้แต่ Phase 2 ยังไม่มี Nearby Party จริง (Phase 3 F09) ดังนั้นค่าที่เก็บได้ตอนนี้จะเป็น `party_size=1` (cold start) เกือบทั้งหมด
- **ผู้ร่วม playtest ภาคสนามอายุ 15–17 เข้าร่วมได้** ตาม D-092 โดยมีแบบฟอร์มยินยอมผู้ปกครองแบบกระดาษที่เซ็นก่อนเดิน เดินกับทีมหรือผู้ใหญ่ตลอดเวลา อายุต่ำกว่า 15 ปีไม่รับเข้าร่วม แบบฟอร์มเก็บนอก git เสมอ
- **การเดินทดสอบกับผู้เล่นจริงทั้งหมดอยู่ช่วงเช้า ~07:00–09:30 หรือเย็น ~16:30–18:30** (D-093) — ไม่มีข้อมูล jitter/GPS ในสภาพแดดจัดกลางวันซึ่งอาจมีพฤติกรรมถือมือถือต่างออกไป (เช่น กางร่มบังแดดกระทบการแกว่งมือ) ความเสี่ยงนี้ยกไป `P2-RISK-01`
- ตัวเลข "≥95%" ของ metric หลักอ้างอิงเกณฑ์ spike S12 เดิมซึ่งวัดตอน dev ไม่ใช่ภาคสนามจริง — ถ้าตัวเลขจริงจาก playtest ต่างจากนี้มาก ให้รายงานเป็น "ต้องแก้" ไม่ใช่ปรับเกณฑ์ย้อนหลังให้ผ่าน

## 8. สมมติฐานและ handoff

- [ASSUMPTION A-P2-F05-T02-1]: north star proxy ฝั่ง client (หัวข้อ 4) นับเป็น "นาทีเดินโดยประมาณ" ไม่ปรับ scale ใดๆ เทียบกับนิยาม server จริงใน Phase 3 — ถ้าพบว่าต่างกันมากหลังมี server ให้ประกาศช่วงเวลาที่ metric เปลี่ยนนิยามชัดเจนในรายงาน (สอดคล้อง `product/metrics.md` §10.1 เรื่องห้ามเทียบตรงข้ามช่วงเทคนิคต่างกัน) (ยืนยัน: tech-lead)
- [ASSUMPTION A-P2-F05-T02-2]: "ช่วงที่ผู้สังเกตยืนยันว่าผู้เล่นกำลังเดินจริง" ในตารางหัวข้อ 4 มาจากแบบฟอร์มผู้สังเกต ไม่ใช่ label อัตโนมัติ เพราะ Phase 2 ไม่ส่งพิกัดออกจากเครื่อง (ยืนยัน: qa-tester)
- handoff → P2-F04-T17: ใช้ตารางหัวข้อ 4 เป็นที่มาของ event/property รวมทั้ง north star proxy formula
- handoff → tech-lead: ยืนยันว่า north star proxy ใช้ record เดียวกับ reward tick จริง (ไม่เปิด write path แยก) ตามเงื่อนไข `product/telemetry-events.md` §8
