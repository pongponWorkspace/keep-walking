# tools/sim — Balance simulator (แกนสูตร)

- เจ้าของ: systems-designer · งาน: P1-F03-T07 (แกนสูตร) และ P1-F03-T08 (drop, economy, party ต่อหัว) · ผลสรุป: `design/systems/sim-report.md`
- อ่านค่าจาก `config/balance/*.json` เท่านั้น (key ที่ขึ้นต้นด้วย `_` เป็น metadata ตัวโหลดไม่ยอมอ่าน · ค่า `null` = ล้มทันที ไม่เดาค่า)
- เป้าจาก GDD อยู่ใน `tools/sim/gdd-reference.json` (ใช้เทียบเท่านั้น ไม่ใช่ค่า balance และ runtime ห้ามอ่าน)
- ผลลัพธ์: `design/systems/test-vectors/*.json` (golden vectors ตาม ADR 0001 ข้อ 3.9)

## คำสั่ง (รันจาก root ของ repo)

| คำสั่ง | ทำอะไร |
| --- | --- |
| `pnpm exec tsx tools/sim/src/report.ts [--seed N] [--runs N]` | พิมพ์ตาราง GDD เทียบค่าจากสูตร: 1 buff stacking, 2 exp, 3 gear/stat/ค่าเปลี่ยน class, 4 เวลาอยู่รอด (analytic + Monte Carlo), 5 drop และความถี่ Epic/Legendary (+ MC), 6 รายได้เทียบค่ายาแยก class/party/เลเวล, 7 party ต่อหัว, 8 what-if ของคันโยกเศรษฐกิจ (config ไม่เปลี่ยน) |
| `pnpm exec tsx tools/sim/src/gen-vectors.ts` | สร้าง golden vectors ใหม่จาก config · ถ้า vector ที่มาจาก GDD ไม่ผ่าน จะหยุดและพิมพ์ `FINDING` แทนการเขียนไฟล์ (ไม่แก้เงียบ) |
| `pnpm exec tsx tools/sim/src/gen-vectors.ts --check` | ตรวจว่าไฟล์ vectors บนดิสก์ตรงกับ config ปัจจุบัน (exit 1 ถ้าไม่ตรง) |
| `pnpm test` | รัน `tools/sim/src/sim.test.ts` รวมกับ test อื่นของ repo |

ค่า seed ตั้งต้น 20260923, Monte Carlo 20,000 run ต่อกรณี · ผลซ้ำได้ทุกครั้งที่ใช้ seed เดิม

## ไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/config.ts` | โหลด config, ตัวอ่านที่ปฏิเสธ key `_` และ `null` |
| `src/params.ts` | แปลง config เป็น parameter object ที่มี type (`SimParams`) |
| `src/formulas.ts` | reference implementation ของสูตร (pure function รับค่าเป็น parameter) · `packages/shared` port จากไฟล์นี้ |
| `src/build.ts` | stat ตัวละคร, build สมดุล, build สุดขั้ว |
| `src/survival.ts` | เวลาอยู่รอดแบบ analytic, Monte Carlo (heal Support, โล่ Magic, ยาอัตโนมัติ), ค่ายาต่อชั่วโมง |
| `src/scenarios.ts` | ผูก config กับกรณีจำลอง, fit โอกาสโดนตี, รายได้ต่อชั่วโมง |
| `src/drops.ts` | drop model: ตัวคูณ Ranged / dungeon เล็ก / trust ต่ำ / สัปดาห์ล้มบอส, รายได้ NPC, วันต่อ 1 ชิ้น, MC ช่วงห่างและรายได้ (T08) |
| `src/economy.ts` | party spec, ผลของ buff ต่อผู้เล่น, ค่ายาสุทธิหลัง heal/โล่ (analytic + MC), อัตราส่วนเทียบ `economy.incomeToPotionRatio`, party ต่อหัว (T08) |
| `src/report-economy.ts` | report หัวข้อ 5–8 |
| `src/vectors-economy.ts`, `src/vector-eval-economy.ts` | สร้างและประเมิน `drops.json`, `economy.json`, `party.json` |
| `src/vector-eval.ts` | คำนวณ vector จาก input ของ vector เอง (ไม่อ่าน config) · dispatch ด้วย `input.fn` |
| `src/vectors.ts`, `src/vector-files.ts`, `src/gen-vectors.ts` | สร้างและตรวจ golden vectors |
| `src/report.ts` | CLI รายงาน |
| `src/rng.ts` | PRNG แบบใส่ seed (mulberry32) |

## รูปแบบ golden vectors

`{ "formula": "<name>", "vectors": [ { "input": {...}, "expected": ..., "tolerance": n, "source": "..." } ] }`

- `input.fn` บอกชื่อฟังก์ชัน และ input มี **parameter ครบทุกตัว** (ค่าจาก config ณ ตอนสร้าง) จึงทดสอบสูตรได้โดยไม่ต้องอ่าน config · เปรียบเทียบด้วย `isWithinTolerance` จาก `@keep-walking/shared`
- `expected: null` = ฟังก์ชันไม่นิยามที่ input นั้น (เช่น `expToNext` ที่เลเวล 60) implementation ต้องคืน null หรือปฏิเสธ
- vector สองชนิด: `source` ขึ้นต้นด้วย `GDD >` = ค่าตาม GDD พร้อม tolerance ของ GDD · ขึ้นต้นด้วย `sim run` = ค่าจาก reference implementation (tolerance 1e-6) รวมกรณีขอบ

| ไฟล์ | ฟังก์ชัน (`input.fn`) |
| --- | --- |
| `buff-stacking.json` | `roleBuff`, `memberP`, `baseCapRule` |
| `class-change.json` | `classChangeCost` |
| `exp-curve.json` | `expToNext`, `expPerTick`, `ticksPerLevel`, `ticksPerLevelCurve`, `walkMinutesPerLevel`, `walkMinutesPerLevelCurve`, `ticksBetween`, `walkHoursBetween`, `expMultiplier` |
| `gear.json` | `gearStat`, `bossGearStat`, `tierForLevel`, `characterStats`, `defReduction_pct` |
| `damage.json` | `zoneLevel`, `monsterAtk`, `defReduction_pct`, `damagePerHit`, `hitsToThreshold`, `expectedSurvival_min`, `survivalMinutes`, `hpLossPerHour_pct`, `potionCostPerHour_gold` |
| `drops.json` | `meanDaysBetween`, `dropRates` |
| `economy.json` | `incomePerHour_gold`, `incomeToPotionRatio`, `ratioStatus`, `netHpLossPerHour_pct`, `potionCostNet_gold` |
| `party.json` | `partyPerHeadRatio`, `partyEffects` |

กฎ tolerance ของ vector ที่มาจาก GDD: ตารางทศนิยม 1 ตำแหน่ง 0.05 · ตาราง tick 0.5 · ยอดรวม "ราว" 3% · ชั่วโมงถึงเลเวล 30 4% (F-4) · gear 1 แต้ม (D-022) · เวลาอยู่รอด "ราว" 10% · Tanker เลเวล 50 × 1 = เลเวล 1 × 2 ที่ 0.5 จุด (F-5) · ความถี่ drop "ราว" 10% (Epic 3 ชม./วัน = 2.5 ± 0.5) · รายได้ 3% · party 1.8–2.2 = 2.0 ± 0.2

## สมมติฐานของการจำลองเวลาอยู่รอด (ไม่ใช่ค่า balance)

- build สมดุล: แต้ม 3 × L แบ่ง ATK / DEF / HP / VIT เท่ากัน (แต้มเศษได้ เป็น build เฉลี่ย) · อุปกรณ์ทุกช่อง tier ตาม `equipment.json#tierByLevel` ที่ +0
- เลเวลตรงโซน (Z = L), damage ต่อครั้งคงที่, ทอยทุก U(45, 75) วินาที, ไม่ใช้ยา
- กรณี "damage ×1.0" = นิยามของแถว 45 นาทีใน GDD ตาม D-020 (ไม่มีโทษขาด Tanker) · "solo ×1.6" = Ranged, Support, Magic เล่นคนเดียว · Tanker เล่นคนเดียวได้ buff ของตัวเอง
- ค่าคาดหมาย = (จำนวนครั้งที่ต้องโดน / โอกาสโดน) × รอบเฉลี่ย (negative binomial) · Monte Carlo ยืนยันค่าเดียวกันภายใน 2%
- ยาอัตโนมัติ: ใช้เมื่อ HP ต่ำกว่าเกณฑ์ (`economy.json#autoPotion`) ก่อนตรวจ auto-retreat ในครั้งที่โดนตีเดียวกัน · ฟื้นไม่เกิน max HP

## ข้อตกลงด้าน lint

`src/vectors.ts` ปิด `no-magic-numbers` ทั้งไฟล์พร้อมเหตุผล เพราะเลขในไฟล์เป็น input ของกรณีทดสอบ (เลเวล, จำนวนคน, ช่องว่างเลเวล) ไม่ใช่ค่า balance · ค่า balance ทุกตัวมาจาก `SimParams`

## สมมติฐานของการจำลองเศรษฐกิจ (T08, ไม่ใช่ค่า balance)

- ทุก reward tick ผ่าน movement gate (12 tick/ชม.) และขายวัตถุดิบทั้งหมดให้ NPC (รายได้ = เพดานบนของ gold) · Epic/Legendary ขาย NPC ไม่ได้ (A-8b)
- ค่ายาใช้ hit chance จาก config และ damage model ของ T07 · ยาอัตโนมัติที่ `economy.json#autoPotion` ใช้ยาชนิดเดียวตลอด ฟื้นไม่เกิน max HP · MC 5,000 ชม. เป็นค่าที่ใช้ตัดสิน, analytic (ไม่มีเพดาน heal) ใช้ตรวจและเป็น vector
- สมาชิก party ถูกทอยตีแยกกันและได้ drop แยกกัน · ผู้เล่นนับใน buff ของ role ตัวเอง (Support คนเดียว heal ตัวเอง, Magic คนเดียวมีโล่)
- "รางวัลต่อหัว" = มูลค่า drop และอัตรา exp แยกกัน (หัวข้อ 7 ของ report)
- ตัวเลข what-if ในหัวข้อ 8 เป็นสมมติฐานสำหรับ decision (`WHAT_IF` ใน `report-economy.ts`) ไม่เขียนลง config
