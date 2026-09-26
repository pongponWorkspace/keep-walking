# tools/sim — Balance simulator (แกนสูตร)

- เจ้าของ: systems-designer · งาน: P1-F03-T07 (แกนสูตร), P1-F03-T08 (drop, economy, party ต่อหัว), P2-F05-T20 (gate), P2-F05-T01 (dungeon loop) · ผลสรุป: `design/systems/sim-report.md`
- **สูตรและ PRNG มาจาก `@keep-walking/shared/formulas`** (TL B-05, P2-F05-T01): `tools/sim` ไม่มีสำเนาสูตรแล้ว · ที่อยู่ในนี้คือ Monte Carlo, report, สถิติ และ reference ที่ shared ยังไม่มี (`rollTickLoot`, `resolveHit`, `runLoop`)
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
| `pnpm exec tsx tools/sim/src/report-loop.ts [--runs N]` | หลักฐานของ P2-F05-T01: 1 exp ต่อ tick ตาม Z, 2 drop table ต่อ preset รวมยา, 3 เวลาถึง auto-retreat ของผู้เล่น Phase 2 ต่อ class มี/ไม่มียา, 4 R43, 5 D-020, 6 ตายเทียบ auto-retreat, 7 มูลค่ายาจาก drop (Phase 4) · run ละ runSeed ตาม ADR 0003 |
| `pnpm exec tsx tools/sim/src/report-gate.ts` | หลักฐานของค่า gate / run state / check-in / speed lock (P2-F05-T20): 0 กฎ config, 1 cadence, 2 outlier, 3 hysteresis บน edge-walk, 4 speed lock |

ค่า seed ตั้งต้น 20260923, Monte Carlo 20,000 run ต่อกรณี · ผลซ้ำได้ทุกครั้งที่ใช้ seed เดิม

## ไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/config.ts` | โหลด config, ตัวอ่านที่ปฏิเสธ key `_` และ `null` |
| `src/params.ts` | แปลง config เป็น parameter object ที่มี type (`SimParams`) |
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
| `src/stats.ts` | `mean`, `percentile` ของ Monte Carlo (PRNG มาจาก shared) |
| `src/hit.ts`, `src/vectors-hit.ts` | R-B1 ลำดับผลต่อ hit (D-078) `resolveHit` + vector ใน `damage.json` (P2-F06-T01) |
| `src/raid.ts`, `src/vectors-raid.ts` | partyMult ของ raid พร้อม cap 1.6 / 1.2 (D-079) + `raid.json` (P2-F06-T01) |
| `src/gate.ts` | reference ของ movement gate + rewardWindow (ADR 0003 5.2–5.3): ตัวกรอง outlier, grid `sampleCadence_s`, chain, หน้าต่าง, tick บางส่วน D-059 (P2-F05-T20) · เขียนแยกจาก `packages/geo` |
| `src/presence.ts` | hysteresis ที่ขอบ, run state + timer Grace/Suspended/timeout, speed lock, check-in, ด่านเวลาของ sample และ `now_ms` (P2-F05-T20) |
| `src/opening-hours.ts` | เวลาทำการ normalized + `utcOffset_min`, เวลาเปลี่ยนสถานะ, แจ้งใกล้ปิด, ระยะบนหน้าจอบ้าน (P2-F05-T20) |
| `src/rng-contract.ts` | `rollTickLoot` ตามลำดับ ADR 0003 6.3 พร้อมตัวย่อ f (P2-F05-T20) · `deriveSeed`/`streamRng` มาจาก shared |
| `src/loot.ts` | `drops.json#items` + `#dropTables` → `LootRarity[]` ต่อบริบท tick (ตัวคูณจากสูตร shared) + กฎความสอดคล้อง `dropTableProblems` (P2-F05-T01) |
| `src/loop.ts` | `runLoop`: run เดียวแบบ seed (tick, drop, exp, การตี, ยาอัตโนมัติ, โล่, heal, auto-retreat, ตาย) + `soloTickExp`, `soloDamage`, `addExp`, `hitAttempt` (P2-F05-T01) |
| `src/loop-scenarios.ts` | config → input ของ `runLoop`, `loopStats` (Monte Carlo ตาม runSeed) |
| `src/vectors-loop.ts`, `src/vector-eval-loop.ts`, `src/report-loop.ts` | สร้าง / ประเมิน `tick-reward.json`, `run-loop.json` · CLI หลักฐาน |
| `src/traces.ts`, `src/synth.ts` | โหลด trace ใน `data/gps-traces` + point-in-polygon / ระยะถึงขอบ · สร้าง sample สังเคราะห์ของ vector |
| `src/params-gate.ts` | `GateConfig` จาก config + `gateConfigProblems()` (กฎ config ที่ P2-F04-T24 จะ lint) |
| `src/vectors-gate.ts`, `src/vectors-presence.ts`, `src/vector-eval-gate.ts`, `src/vector-files-gate.ts` | สร้าง / ประเมิน `movement-gate`, `reward-window`, `partial-tick`, `run-state`, `check-in`, `speed-lock`, `opening-hours` |
| `src/report-gate.ts` | CLI หลักฐานของค่า P2-F05-T20: sweep cadence, outlier, hysteresis, speed lock บน trace |

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
| `damage.json` | `zoneLevel`, `monsterAtk`, `defReduction_pct`, `damagePerHit`, `hitsToThreshold`, `expectedSurvival_min`, `survivalMinutes`, `hpLossPerHour_pct`, `potionCostPerHour_gold`, `resolveHit` (R-B1, output มี boolean/string) |
| `drops.json` | `meanDaysBetween`, `dropRates` |
| `economy.json` | `incomePerHour_gold`, `incomeToPotionRatio`, `ratioStatus`, `netHpLossPerHour_pct`, `potionCostNet_gold` |
| `party.json` | `partyPerHeadRatio`, `partyEffects` |
| `raid.json` | `raidPartyMult` |
| `movement-gate.json` | `gateWindows`, `passesGate` |
| `reward-window.json` | `gateWindows`, `tauAt`, `windowIndexOf` |
| `partial-tick.json` | `partialTick`, `gateWindows` (มี `endAt_ms`), `deriveSeed`, `streamDraws`, `rollTickLoot` |
| `run-state.json` | `edgeHysteresis`, `runTimeline`, `sampleTimeGate`, `clockCheck` |
| `check-in.json` | `checkIn`, `checkInTimeline` |
| `speed-lock.json` | `speedLock` |
| `opening-hours.json` | `isOpenAt`, `openingChangeAfter`, `closingSoonAt`, `displayDistance` |
| `tick-reward.json` | `soloTickExp`, `addExp`, `lootTable`, `rollTickLoot` (ตารางจริงต่อ preset) |
| `run-loop.json` | `hitAttempt`, `soloDamage`, `runLoop`, `runLoopStats` |

ไฟล์ของ P2-F05-T20 มี output ซ้อน (รายการหน้าต่าง / event) และ sample ใน `input.samples` เขียนบรรทัดละตัว · vector ที่ใช้ trace อ้างไฟล์ที่ commit แล้ว (`input.trace`, `polygon`, `every`, `phase`) · กติกาเต็มอยู่ที่ `design/systems/balance-model.md` หัวข้อ 16.9

กฎ tolerance ของ vector ที่มาจาก GDD: ตารางทศนิยม 1 ตำแหน่ง 0.05 · ตาราง tick 0.5 · ยอดรวม "ราว" 3% · ชั่วโมงถึงเลเวล 30 4% (F-4) · gear 1 แต้ม (D-022) · เวลาอยู่รอด "ราว" 10% · Tanker เลเวล 50 × 1 = เลเวล 1 × 2 ที่ 0.5 จุด (F-5) · ความถี่ drop "ราว" 10% (Epic 3 ชม./วัน = 2.5 ± 0.5) · รายได้ 3% · party 1.8–2.2 = 2.0 ± 0.2

## สมมติฐานของการจำลองเวลาอยู่รอด (ไม่ใช่ค่า balance)

- build สมดุล: แต้ม 3 × L แบ่ง ATK / DEF / HP / VIT เท่ากัน (แต้มเศษได้ เป็น build เฉลี่ย) · อุปกรณ์ทุกช่อง tier ตาม `equipment.json#tierByLevel` ที่ +0
- เลเวลตรงโซน (Z = L), damage ต่อครั้งคงที่, ทอยทุก U(45, 75) วินาที, ไม่ใช้ยา
- กรณี "damage ×1.0" = นิยามของแถว 45 นาทีใน GDD ตาม D-020 (ไม่มีโทษขาด Tanker) · "solo ×1.6" = Ranged, Support, Magic เล่นคนเดียว · Tanker เล่นคนเดียวได้ buff ของตัวเอง
- ค่าคาดหมาย = (จำนวนครั้งที่ต้องโดน / โอกาสโดน) × รอบเฉลี่ย (negative binomial) · Monte Carlo ยืนยันค่าเดียวกันภายใน 2%
- ยาอัตโนมัติ: ใช้เมื่อ HP ต่ำกว่าเกณฑ์ (`economy.json#autoPotion`) ก่อนตรวจ auto-retreat ในครั้งที่โดนตีเดียวกัน · ฟื้นไม่เกิน max HP

## ข้อตกลงด้าน lint

`src/vectors.ts` และ `src/vectors-economy.ts` ผ่าน `@typescript-eslint/no-magic-numbers` ชุดเต็ม ไม่มี `eslint-disable` และไม่มี override ใน `eslint.config.js` (ADR 0001 ข้อ 3.5, D-062) · กรณีขอบที่อ้างค่า config (เพดาน buff, `p.partyMaxMembers`, `p.maxEnhanceLevel`, เลเวลสูงสุด, เกณฑ์ถอยอัตโนมัติ, ขอบ tier) อ่านจาก `SimParams` จึงย้ายตาม config · เป้าจาก GDD (ความถี่ drop, รายได้, ช่วง party ต่อหัว) อ่านจาก `EconomyRefs` · เลขที่เหลือเป็นค่าตัวอย่างของ input ที่ตั้งชื่อไว้ใน `CASE` (เลเวล, จำนวนคน, ช่องว่างเลเวล) ไม่ใช่ค่า balance

## สมมติฐานของการจำลองเศรษฐกิจ (T08, ไม่ใช่ค่า balance)

- ทุก reward tick ผ่าน movement gate (12 tick/ชม.) และขายวัตถุดิบทั้งหมดให้ NPC (รายได้ = เพดานบนของ gold) · Epic/Legendary ขาย NPC ไม่ได้ (A-8b)
- ค่ายาใช้ hit chance จาก config และ damage model ของ T07 · ยาอัตโนมัติที่ `economy.json#autoPotion` ใช้ยาชนิดเดียวตลอด ฟื้นไม่เกิน max HP · MC 5,000 ชม. เป็นค่าที่ใช้ตัดสิน, analytic (ไม่มีเพดาน heal) ใช้ตรวจและเป็น vector
- สมาชิก party ถูกทอยตีแยกกันและได้ drop แยกกัน · ผู้เล่นนับใน buff ของ role ตัวเอง (Support คนเดียว heal ตัวเอง, Magic คนเดียวมีโล่)
- "รางวัลต่อหัว" = มูลค่า drop และอัตรา exp แยกกัน (หัวข้อ 7 ของ report)
- ตัวเลข what-if ในหัวข้อ 8 เป็นสมมติฐานสำหรับ decision (`WHAT_IF` ใน `report-economy.ts`) ไม่เขียนลง config
