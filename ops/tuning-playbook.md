# Tuning Playbook (ฉบับตั้งต้น)

Task: P1-F03-T20 · เจ้าของ: liveops-operator · สถานะ: ฉบับตั้งต้น (spec) เริ่มจาก 3 ค่าแรกของ GDD ที่ต้องจูนหลัง beta
แหล่งอ้างอิง: GDD "Progression > ค่าที่ต้องจูนก่อนอื่นหลัง beta" (`expPerTick`, ราคาขายวัตถุดิบให้ NPC, โอกาส Rare), `config/balance/progression.json`, `config/balance/economy.json`, `config/balance/drops.json`, `design/systems/sim-report.md` (F-16, F-17), `product/metrics.md` หัวข้อ 9 (guardrail GR-1..GR-12), `studio/protocol.md` หัวข้อ 5 (อำนาจตัดสินใจ)

## 1. หลักการ

1. **ทุกค่าปรับผ่าน config เท่านั้น** — ไม่มีการ deploy โค้ด ค่าที่ปรับต้องอยู่ในไฟล์ `config/balance/*.json` ที่มีอยู่แล้ว ถ้าค่าที่ต้องการยังไม่มี key ใน config ให้ส่ง handoff ถึง systems-designer ก่อน ห้าม hardcode ที่อื่น
2. **อำนาจตัดสินใจตามขนาดของการเปลี่ยนแปลง** (ตาม `studio/protocol.md` หัวข้อ 5):
   - การเปลี่ยนแปลง **ภายใน ±20% ของค่าตั้งต้นจาก GDD** — systems-designer เป็นผู้อนุมัติค่า (มีอำนาจปรับเองตามสัญญาณ dashboard)
   - การเปลี่ยนแปลง **เกิน ±20% ของค่าตั้งต้นจาก GDD** — ต้องผ่าน game-director เพิ่ม (สองคนเสมอ ไม่ใช่คนเดียวตัดสิน)
   - เปอร์เซ็นต์คำนวณเทียบกับ**ค่าตั้งต้นใน GDD/config เวอร์ชันแรก** ไม่ใช่เทียบกับค่าที่เพิ่งปรับไปล่าสุด (ป้องกันการค่อยๆ ขยับทีละ 19% หลายรอบจนหนีเกณฑ์)
3. **liveops-operator เป็นผู้เสนอและติดตามสัญญาณ ไม่ใช่ผู้อนุมัติค่าเอง** — liveops อ่าน dashboard, เปิด/ปิดข้อเสนอ, บันทึกผล และเป็น owner ของการดำเนินการ แต่ผู้อนุมัติค่าตัวเลขคือ systems-designer หรือ game-director ตามข้อ 2 เสมอ (กฎสองคน)
4. ทุกการเปลี่ยนแปลงต้องบันทึก: สัญญาณที่พบ (พร้อมตัวเลข/วันที่), ค่าก่อนแก้, ค่าหลังแก้, % ที่เปลี่ยนเทียบค่าตั้งต้น, ผู้อนุมัติ, วันที่มีผล, และแผน rollback ก่อนเริ่มใช้งานจริง
5. **ห้ามปรับค่าที่กระทบเงินจริงหรือ sponsor** ผ่าน playbook นี้ — เรื่องนั้นเป็น HUMAN เสมอ (ดู `ops/calendar.md` หัวข้อ 5)
6. **`dungeons.movementGate.*` และ `dungeons.hpSafety.*` ไม่อยู่ในขอบเขตของ playbook นี้เลย** (F-14, design gate A) — ดูรายการคีย์เต็มและเหตุผลในหัวข้อ 1.1

### 1.1 ค่าที่ไม่ใช่ของ live ops ไม่ว่ากรณีใด (non-tunable by live ops)

รายการนี้ไม่ใช่แค่ "อยู่นอกขอบเขตของ 3 ค่าแรก" (แบบ `epic`/`legendary`/`marketTax` ในหัวข้อ 6) แต่ห้าม liveops-operator เสนอ อนุมัติ หรือใส่ในตารางบันทึกของเอกสารนี้เลย ไม่ว่าจะอยู่ในกรอบ ±20% หรือไม่ก็ตาม และห้ามปรากฏใน `ops/calendar.md` แถวใดทั้งสิ้น (`ops/calendar.md` หัวข้อ 1 ข้อ 8):

| Key | ไฟล์ | เหตุผลที่ห้าม |
| --- | --- | --- |
| `movementGate.minDistancePerWindow_m` | `config/balance/dungeons.json` | ตัวเลขของ movement gate เดียวที่ทุกรางวัลต้องผ่าน (NN-2) ผ่อนค่านี้ = สร้างรางวัลที่ไม่มีการเดินจริงรองรับ |
| `movementGate.window_s` | `config/balance/dungeons.json` | เช่นเดียวกับข้างต้น — ยืดหน้าต่างเวลาก็เท่ากับผ่อน gate |
| `movementGate.comparison` / `movementGate.appliesTo` / `movementGate.exceptions` | `config/balance/dungeons.json` | การเพิ่มข้อยกเว้น (เช่น "raid ไม่นับ" หรือ "event ฝนไม่บังคับ") ขัด NN-2 ("ไม่มีข้อยกเว้น") โดยตรง |
| `hpSafety.autoRetreatEnabledByDefault` / `autoRetreatThreshold_pct` / `autoRetreatKeepsRunLoot` | `config/balance/dungeons.json` | คู่กับ movement gate ตาม NN-8 — ทำให้ auto-retreat อ่อนลงโดยไม่ประเมิน gate พร้อมกันเป็นสิ่งต้องห้ามของ NN-8 ข้อ 2 |
| `hpSafety.lowHpWarningThreshold_pct` / `lowHpWarningChannels` | `config/balance/dungeons.json` | ส่วนหนึ่งของระบบกันตายเดียวกัน เปลี่ยนแล้วกระทบจังหวะแจ้งเตือนก่อนถอยที่ NN-8 ผูกไว้ |

ถ้าสัญญาณ dashboard ชี้ว่าต้องแก้ค่าชุดนี้จริง (เช่น auto-retreat ถอยช้า/เร็วเกินไปหลังข้อมูลภาคสนาม) ให้เขียนเป็น **handoff ถึง game-director** โดยตรง ไม่ใช่เสนอผ่านกระบวนการ ±20% ปกติของ playbook นี้ และต้องแนบการประเมินผลต่ออีกฝั่งของคู่ NN-8 มาด้วยเสมอ (เช่น จะลด `autoRetreatThreshold_pct` ต้องประเมินผลต่อ `movementGate` ในเอกสารเดียวกัน) — game-director เป็นผู้เดียวที่อนุมัติได้ ไม่ว่าเปอร์เซ็นต์การเปลี่ยนจะเท่าไร

## 2. สามค่าแรกที่ต้องจูน (จาก GDD)

### 2.1 `expPerTick`

- Config: `config/balance/progression.json#expPerTickCoef` (ตั้งต้น 30), `#expPerTickExponent` (ตั้งต้น 1.5) — สูตร `expPerTick(Z) = expPerTickCoef × Z^expPerTickExponent`
- สัญญาณที่ทำให้พิจารณาแก้: ผู้เล่นถึงเลเวล 60 **เร็วกว่า 2 เดือน** อย่างมีนัย (สัญญาณว่าค่าต่ำไปตาม GDD) หรือ time-to-level ช้ากว่าตารางอ้างอิงใน `design/systems/sim-report.md` มากจนกระทบ GR-6 (Level 50+ หายหลังสัปดาห์ 4 ≤ 25%) — ถ้า GR-6 ใกล้หรือเกิน 25% เพราะคนถึงเพดานเนื้อหาเร็วเกินไป ให้พิจารณาลด `expPerTickCoef` แทนการเร่ง
- ขอบเขต: ±20% ของ `expPerTickCoef` ตั้งต้น (30) คือช่วง 24–36 โดย systems-designer อนุมัติเอง · เกินช่วงนี้ (หรือแก้ `expPerTickExponent` ซึ่งเปลี่ยนรูปโค้งทั้งเส้น ไม่ใช่แค่สเกล) ต้องผ่าน game-director
- ผู้อนุมัติ: systems-designer (±20%) / game-director (เกิน ±20% หรือแก้ exponent)
- Rollback: บันทึกค่าก่อนแก้ไว้ในตารางประวัติ (หัวข้อ 4) คืนค่าเดิมทันทีในรอบ config ถัดไปถ้าเวลาไปเลเวล 60 คลาดจากเป้าไปทางตรงข้าม (เร็วเกินไปหลังลด หรือช้าเกินไปหลังเพิ่ม) เกิน 2 สัปดาห์ของข้อมูล

### 2.2 ราคาขายวัตถุดิบให้ NPC

- Config: `config/balance/economy.json#npcSellPrice_gold` (ผงธาตุ 20, แก่นธาตุ 120, หินรอยแยก 900) ภายใต้กรอบ `#npcPricing` (40–50% ของมูลค่าตลาด)
- สัญญาณที่ทำให้พิจารณาแก้: **GR-4 (แนวโน้มราคายาในตลาด)** เบี่ยงเกิน ±20% จาก config ตั้งต้นต่อเนื่อง (สัญญาณเงินเฟ้อ, GDD "ความเสี่ยงที่ต้องเฝ้าดู > เงินเฟ้อ") — ราคา NPC เป็นพื้นราคาของตลาดผู้เล่นทั้งหมดตาม GDD "Economy > Gold source" ตั้งสูงไปตลาดผู้เล่นตาย ตั้งต่ำไป gold ไม่พอซื้อยา
- ขอบเขต: ราคาต่อไอเทมปรับได้ภายใน ±20% ของค่าตั้งต้น **และ**ต้องยังอยู่ในกรอบ `npcPriceToMarketValueMin_pct`–`Max_pct` (40–50%) เสมอ — ถ้าต้องขยับกรอบ 40–50% นั้นเอง (ไม่ใช่แค่ราคาต่อไอเทม) ถือเป็นการแก้กติกาเศรษฐกิจ ต้องเป็น game-director เท่านั้นไม่ว่า % เท่าไร
- ผู้อนุมัติ: systems-designer (ราคาต่อไอเทม ±20% ภายในกรอบ 40–50%) / game-director (เกิน ±20% หรือแก้กรอบ 40–50%)
- เฝ้าดูคู่กับ: **GR-5 (F-16 gold สุทธิของ party ครบ role เทียบคนเดียว)** — sim-report ชี้ว่า gold ที่ไหลเข้าเศรษฐกิจจาก party สูงกว่าคนเดียว 1.8–9 เท่า แม้รางวัลต่อหัวอยู่ในเป้า การลดราคา NPC เพื่อคุมเงินเฟ้อกระทบ party มากกว่าคนเดียวตามสัดส่วนนี้ ต้องดู GR-5 ประกอบก่อนตัดสินใจเสมอ ไม่ปรับ GR-4 โดยไม่ดู GR-5
- Rollback: คืนราคาก่อนแก้ทันทีถ้าตลาดผู้เล่น (จำนวน listing ที่ขายจริง) หดตัวผิดปกติหลังปรับขึ้น หรือ GR-4 ยังไม่ดีขึ้นภายใน 2 สัปดาห์หลังปรับลง

### 2.3 โอกาส Rare

- Config: `config/balance/drops.json#baseChancePerRewardTick_pct.rare` (ตั้งต้น 6%) — สุ่มอิสระต่อ reward tick ที่ผ่าน movement gate เท่านั้น
- สัญญาณที่ทำให้พิจารณาแก้: ความรู้สึกคุ้มค่าของผู้เล่นตกลง (feedback/report-queue, ยังไม่มี metric อัตโนมัติเฉพาะใน Phase 1) หรือปริมาณ "หินรอยแยก" (riftStone ซึ่งเป็นวัตถุดิบระดับ Rare) ที่ไหลเข้าระบบเศรษฐกิจสูง/ต่ำผิดคาดจน GR-4 หรือราคาตลาดของวัตถุดิบตีบวกเพี้ยนไปจากที่ sim-report คาด
- หมายเหตุสำคัญ: `baseChancePerRewardTick_pct` แต่ละระดับ (common, uncommon, rare, epic, legendary) สุ่ม**อิสระจากกัน**ต่อ tick (`drops.json` note) การขยับ `rare` **ไม่ทำให้** GR-7 (F-17 คนไม่มี Ranged รอ Epic เกิน 30 วัน 17.7%) เปลี่ยนโดยตรง เพราะ Epic เป็นคนละคีย์ (`baseChancePerRewardTick_pct.epic`) — ถ้าสัญญาณที่แท้จริงคือ GR-7 (การรอ Epic) ให้ส่ง handoff ถึง systems-designer พิจารณาคีย์ `epic` แยกต่างหาก ไม่ใช่แก้ `rare` แทน · playbook รุ่นนี้ยังไม่รวมคีย์ `epic`/`legendary` เป็นหนึ่งใน "สามค่าแรก" ตาม GDD จึงต้องเปิดเป็น decision ใหม่ถ้าจะขยายขอบเขต
- ขอบเขต: ±20% ของ 6% คือช่วง 4.8–7.2 percentage-equivalent (คูณ 0.8–1.2 เท่าของค่าตั้งต้น) โดย systems-designer อนุมัติเอง · เกินช่วงนี้ต้องผ่าน game-director
- ผู้อนุมัติ: systems-designer (±20%) / game-director (เกิน ±20%)
- Rollback: คืนค่าตั้งต้น (6%) ทันทีถ้าการปรับทำให้ GR-4 หรือราคาตลาดของ riftStone เคลื่อนไหวผิดคาดเกิน 2 สัปดาห์ของข้อมูล

## 3. ตาราง guardrail → สัญญาณ → การตอบสนอง (จาก `product/metrics.md` หัวข้อ 9)

| Guardrail | ความหมาย | เกณฑ์ | การตอบสนองของ live ops |
| --- | --- | --- | --- |
| GR-4 | แนวโน้มราคายา (inflation) | เบี่ยง ≤ ±20% จาก config ตั้งต้นโดยไม่มี decision อนุมัติ | ปรับราคาขายวัตถุดิบให้ NPC (หัวข้อ 2.2) ก่อน ถ้าไม่พอส่ง handoff ถึง systems-designer พิจารณาภาษีขั้นบันได (`economy.json#marketTax`) ซึ่งอยู่นอกขอบเขตของ 3 ค่านี้ |
| GR-5 (F-16) | gold สุทธิของ party ครบ role เทียบคนเดียว | เฝ้าดู ไม่ควรเกิน 9× ต่อเนื่องหลายสัปดาห์ | เป็น guardrail แบบ **เฝ้าดู ไม่บล็อก** — ใช้ประกอบการตัดสินใจก่อนแก้ราคา NPC (หัวข้อ 2.2) เท่านั้น ไม่มี config ให้ live ops แก้ตรงนี้เอง (ตัวคูณ party เป็นของ game-director ตาม `raid.json#partyMult` และ dungeon ปกติ) |
| GR-6 | Level 50+ หายหลังสัปดาห์ 4 | ≤ 25% | เฝ้าดูคู่กับ `expPerTick` (หัวข้อ 2.1) แต่สาเหตุหลักอาจไม่ใช่ exp curve (อาจเป็นคอนเทนต์ปลายเกม) — ถ้าปรับ `expPerTick` แล้วยังไม่ดีขึ้น ส่ง handoff ถึง game-director/product-manager พิจารณานอกเหนือ config (ดู `ops/calendar.md` หัวข้อ 4) |
| GR-7 (F-17) | คนไม่มี Ranged รอ Epic เกิน 30 วัน | เฝ้าดู ไม่ควรสูงกว่า 17.7% อย่างมีนัย | เป็น guardrail แบบ **เฝ้าดู ไม่บล็อก** เช่นกัน — คีย์ที่เกี่ยวข้องจริง (`drops.json#baseChancePerRewardTick_pct.epic`) ยังไม่อยู่ใน 3 ค่าแรกของ playbook นี้ ถ้าสัญญาณสูงกว่าเกณฑ์อย่างมีนัย ให้เปิด handoff ถึง systems-designer และ product-manager พิจารณาระบบกันแล้ง (bad-luck protection) ตามที่ sim-report เสนอไว้ ไม่ใช่แก้ `rare` แทน |
| GR-12 | แบตต่อวันของผู้เล่น heavy-session (3–6 ชม./วัน) | ไม่มีเป้าตัวเลข automate เต็มรูปใน v1 เว็บ — ใช้ผลเดินทดสอบภาคสนามเป็นหลักฐานประกอบ | live ops ไม่มี config ตัวเลขให้ปรับโดยตรงในรอบนี้ (ไม่ใช่หนึ่งใน 3 ค่าแรก) — ติดตามผ่าน `qa/playtest/field-walk-form.md` และ telemetry ฝั่ง Android เท่านั้น (iOS ไม่มี Battery Status API) ถ้าเป็นปัญหาให้ handoff ถึง tech-lead/gameplay-programmer (เช่น ลด tick การอัปเดตแผนที่) ไม่ใช่ปัญหาที่แก้ด้วย config balance |

## 4. รูปแบบบันทึกทุกครั้งที่ปรับค่า (ตัวอย่างแถวว่าง ให้ liveops-operator คัดลอกไปกรอกจริง)

| วันที่มีผล | ค่าที่แก้ (key) | ค่าก่อนแก้ | ค่าหลังแก้ | % เทียบค่าตั้งต้น GDD | สัญญาณที่ใช้ตัดสินใจ | Owner | Approver | Rollback ที่วางแผนไว้ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (ตัวอย่าง) | `economy.json#npcSellPrice_gold.elementDust` | 20 | 18 | -10% | GR-4 ราคายาเบี่ยง +12% ต่อเนื่อง 3 สัปดาห์ | liveops-operator | systems-designer | คืน 20 ถ้า GR-4 ไม่ดีขึ้นภายใน 2 สัปดาห์ |

ไม่มีแถวจริงในรอบนี้ (Phase 1 ยังไม่มีข้อมูล dashboard จากผู้เล่นจริง) — ตารางนี้เป็นแม่แบบให้ใช้งานตั้งแต่สัปดาห์แรกหลังเปิดตัวตาม GDD ("ควรดูจาก dashboard ตั้งแต่สัปดาห์แรก")

## 5. เงินจริงและ sponsor

ไม่มีค่าใดใน playbook นี้เกี่ยวกับเงินจริงหรือ sponsor โดยตรง (เป็นค่าเศรษฐกิจในเกมทั้งหมด) แต่ถ้าการปรับค่าใดถูกเสนอโดยมีแรงจูงใจเชิงพาณิชย์ (เช่น ผู้สนับสนุนขอให้เพิ่มโอกาส drop ในช่วงที่ตนสนับสนุน) **ต้องหยุดและส่งเป็น handoff ถึง HUMAN ทันที** ไม่ใช่ประมวลผลผ่านกฎ ±20% ปกติ ตาม CLAUDE.md ("ไม่มีการผูกมัดด้านการเงินหรือผู้สนับสนุนโดยไม่มีการตัดสินใจของมนุษย์")

## 6. สมมติฐานและช่องว่าง

- [ASSUMPTION A-P1-F03-T20-4]: เกณฑ์ "2 สัปดาห์ของข้อมูล" ที่ใช้ตัดสิน rollback ในหัวข้อ 2 เป็นค่าเสนอของ liveops-operator เอง (GDD ไม่ได้กำหนดหน้าต่างเวลา) — ยืนยัน: systems-designer, product-manager
- [ASSUMPTION A-P1-F03-T20-5]: dashboard จริงที่ liveops-operator อ่านค่า GR-4..GR-12 ยังไม่มีอยู่จนกว่า telemetry (`product/telemetry-events.md`) ขึ้นระบบจริงใน Phase 3+ — playbook นี้เขียนล่วงหน้าตามที่ metrics framework นิยามไว้ ต้องทบทวนอีกครั้งเมื่อ dashboard ใช้งานได้จริง
- คีย์ `epic`/`legendary` chance และ `marketTax` bracket ไม่อยู่ใน scope ของ "3 ค่าแรก" ตาม GDD — เมื่อ live ops ต้องการขยาย playbook ให้ครอบคลุมค่าเหล่านี้ ต้องเปิดเป็นรุ่นถัดไปของเอกสารนี้ ไม่ใช่แก้ทับเงียบๆ

