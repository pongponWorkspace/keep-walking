# Tech note F05 — Movement Gate, Reward Tick และ Drop

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F04-T14 · เจ้าของ tech-lead · วันที่ 2026-09-26 · สถานะ: ฉบับแรก (สัญญาสำหรับ P2-F05-T08, P2-F04-T12, P2-F05-T20, P2-F04-T19) |
| คู่กับ | `docs/tech/F04-dungeon-presence.md` (tech note F04: `session`, เวลา, `H`, presence, speed lock, storage, telemetry) |
| อ้างอิง | ADR 0003 หัวข้อ 5 (หน้าต่าง, ตัวกรอง), 6 (RNG) · `design/features/F05-movement-gate-reward.md` (spec F05, R01–R28, G1–G16) · spec F04 R12–R15, R21 · D-059, D-078, D-094 · `config/balance/{dungeons,drops,progression}.json` |

ชื่อ key ตาม tech note F04 ย่อหน้าต้น · spec F05 เสนอ `resampleCadence_s` แต่ใช้ชื่อ ADR 0003 5.5 `sampleCadence_s`

## 0. สรุป

| เรื่อง | คำตัดสิน | หัวข้อ |
| --- | --- | --- |
| นาฬิกาของหน้าต่าง | τ = เวลาที่นาฬิกาเดิน (Active และไม่ lock) หลัง backdating · หยุด/เดินต่อ ไม่รีเซ็ต | 2 |
| คู่ที่นับระยะ | คู่ของ sample ที่ใช้ได้ติดกันที่ครบ 5 ข้อ (ข้อ 1–4 จาก F05 R05 + ข้อ 5 ความเร็วไม่เกิน speed lock) | 3.1 |
| resample ไม่ข้ามคู่ที่ไม่นับ | ทุกคู่ที่ไม่นับตัด **chain** · จุด grid เก็บ chain id · คู่ grid นับเฉพาะเมื่ออยู่ chain เดียวกัน | 3.3 |
| backdating โดยไม่เก็บรายการ sample | ตัวสะสม scratch ขณะรอยืนยันการกลับเข้า / ปลด lock | 3.5 |
| เวลาที่ตัดสินหน้าต่าง | เมื่อมี sample ที่ใช้ได้ที่ τ ≥ ปลายหน้าต่างและปลายหน้าต่าง ≤ `H` | 4 |
| drop | stream `drop` index = ลำดับ tick ที่ผ่าน gate (รวม tick บางส่วน) · ลำดับการดึงตาม ADR 0003 6.3 | 5 |
| จบ run | ตาราง R21 · tick บางส่วนเฉพาะ `dungeon_closed` / `emergency_close` | 6 |

## 1. API ของ `reward` (เรียกจาก `session` เท่านั้น)

```ts
// packages/shared/src/reward (backend-programmer, P2-F05-T08)
interface RewardState {
  readonly main: GateAccumulator;            // ตัวสะสมของ rewardWindow ปัจจุบัน
  readonly scratch: GateAccumulator | null;  // มีเฉพาะขณะรอยืนยันกลับเข้า / ปลด lock (3.5)
  readonly tickIndex: number;                // จำนวนหน้าต่างที่ประเมินแล้ว (k ของหน้าต่างปัจจุบัน)
  readonly grantedCount: number;             // จำนวน tick ที่ผ่าน = index ถัดไปของ stream drop
}
interface GateAccumulator {
  readonly tau_ms: number;                   // τ ของ sample ล่าสุดที่ป้อน
  readonly windowStartTau_ms: number;        // k × window_s × 1000
  readonly distance_m: number;               // ระยะที่นับในหน้าต่างปัจจุบัน
  readonly anchor: GeoSample | null;         // sample ที่ใช้ได้ล่าสุด (ขั้น 1 ของตัวกรอง)
  readonly reanchor: readonly GeoSample[];   // ≤ outlierReanchorSamples
  readonly lastPair: { readonly valid: boolean; readonly chain: number } | null;
  readonly lastGrid: { readonly i: number; readonly lat: number; readonly lng: number; readonly chain: number } | null;
  readonly chain: number;                    // เพิ่มทุกครั้งที่มีคู่ที่ไม่นับ
}

function rewardFeed(r: RewardState, s: ClassifiedSample, clock: ActiveClock, p: GateParams): RewardState;
function rewardDue(r: RewardState, clock: ActiveClock, H_ms: number, p: GateParams): WindowDue | null;
function evaluateWindow(r: RewardState, due: WindowDue, p: GateParams): { r: RewardState; granted: boolean };
function partialTick(r: RewardState, clock: ActiveClock, endAt_ms: number, p: GateParams): { f: number; granted: boolean };
function rollTickLoot(runSeed: number, dropIndex: number, table: DropTable, mult: DropMultipliers, f: number): Loot;
```

- `GateParams` = `movementGate.*` + `rewardTick.rewardTickInterval_s` + `anticheat.speedLock.speedLock_kmh` + `emergencyClose.*` ที่อ่านจาก `src/config`
- `comparison` ที่ไม่ใช่ `greaterThan` → throw ตอนสร้าง params (fail closed · ADR 0003 5.2 ข้อ 4) · `rewardTickInterval_s ≠ window_s` → throw (F05 R04 · config lint ตรวจซ้ำ)
- `exp` และการใส่ของลงถุงทำใน `session` จากผลของ `evaluateWindow` + `rollTickLoot` + สูตร exp ของ `src/formulas` (balance-model) · reward ไม่แตะ HP

## 2. นาฬิกาของ rewardWindow (F05 R01–R04, D-094)

```ts
interface ActiveClock {
  readonly closedSum_ms: number;          // ผลรวมช่วงที่เดินแล้วปิดไปแล้ว
  readonly runningSince_ms: number | null;// เวลาจริงที่ช่วงปัจจุบันเริ่ม (null = หยุด)
}
τ(t) = closedSum_ms + (runningSince_ms !== null ? t − runningSince_ms : 0)     สำหรับ t ≥ runningSince_ms
```

- นาฬิกาเดินเมื่อ run ยืนยันเป็น `in` **และ** ไม่ lock · เริ่มที่ `startedAt_ms` ของ confirm (R02)
- หยุดที่ `at_ms` ของ transition (ออก / ไม่มีหลักฐาน / lock) ที่ backdate แล้ว: `closedSum += at − runningSince` · `runningSince := null` · τ ของตัวสะสมที่เกิน `τ(at)` ถูกย้อน (3.4)
- เดินต่อที่ `at_ms` ของการกลับเข้า / ปลด lock (backdate): `runningSince := at` · τ ต่อจากค่าที่ค้าง ระยะในหน้าต่างยังอยู่ (R03)
- Grace / Suspended / lock ทั้งหมดหยุดนาฬิกาเพราะ `rewardTickDuringGrace`, `rewardTickDuringSuspended`, `suspendedTimeCounts` เป็น `false` (ค่า `true` = throw ตาม tech note F04 5.4)
- เวลาปลายหน้าต่าง k ในเวลาจริง (ขณะเดิน) = `runningSince + ((k+1) × window_s × 1000 − closedSum)`

## 3. ระยะที่นับเข้า gate (F05 R05–R09, ADR 0003 5.3)

### 3.1 คู่ที่นับได้ (valid pair)

คู่ `(a, b)` = sample ที่ผ่านขั้น 1 ของตัวกรองสองตัวที่ติดกันใน `main` (ตัวที่ถูกทิ้งระหว่างกลางไม่นับเป็นตัวคั่น ตาม ADR 0003 5.3) · นับได้เมื่อครบทุกข้อ

1. `a` และ `b` อยู่ใน polygon ของ run (point-in-polygon ดิบ ไม่มี hysteresis · spec F04 R15 ข้อ 3)
2. `a.t` และ `b.t` อยู่ในช่วงที่นาฬิกาเดินช่วง **เดียวกัน** (หลัง backdating · ไม่คร่อมช่วงหยุด)
3. `b.t − a.t ≤ maxSamplePairGap_s × 1000`
4. `a.accuracy_m ≤ maxSampleAccuracy_m` และ `b` ด้วย (ขั้น 1 ตรวจแล้ว · เท่าเกณฑ์นับได้)
5. `pairSpeed_kmh(a, b) ≤ anticheat.speedLock.speedLock_kmh` (ผลของ R21 + backdating lock · tech note F04 หัวข้อ 6)
6. `b` ไม่ใช่ตัวที่ได้จาก re-anchor (คู่ที่ข้ามการกระโดดนับ 0 · ADR 0003 5.3)

คู่ที่ไม่ครบข้อใด = **คู่ที่ไม่นับ** → `chain += 1` · ระยะที่เดินนอก polygon ในทุกสถานะจึงไม่นับ และไม่ยกไปหน้าต่างถัดไป (R09, D-094)

### 3.2 จุด grid (ขั้น 2 ของ ADR)

- จุด grid ที่ `τ_i = i × sampleCadence_s × 1000` · `window_s % sampleCadence_s = 0` จึงมีจุด grid ที่ขอบหน้าต่างเสมอ
- จุด `g_i` มีค่าเมื่อมีคู่ที่นับได้ `(a, b)` ที่ `τ(a) ≤ τ_i ≤ τ(b)` · ค่า = interpolate เชิงเส้นใน lat/lng ตามสัดส่วนของ τ · `g_i.chain` = chain ของคู่นั้น
- คู่ที่ไม่นับไม่สร้างจุด grid · จุด grid ที่อยู่ในช่วงของคู่ที่ไม่นับจึงไม่มีค่า

### 3.3 สะสมระยะ (ขั้น 3) — กฎไม่ข้ามคู่ที่ไม่นับ (R06)

- ระยะของคู่ grid `(g_i, g_{i+1})` = `haversine_m` เมื่อ **ทั้งสองมีค่าและ `chain` เท่ากัน** · ไม่งั้น 0
- chain เท่ากัน = ไม่มีคู่ที่ไม่นับระหว่างสองจุด · การ resample จึงไม่สร้างระยะข้ามช่องว่าง ข้ามขอบ polygon ข้ามช่วงนาฬิกาหยุด หรือข้ามช่วงเร็วเกิน (R06)
- ระยะของคู่ grid เข้าหน้าต่างที่มี `g_{i+1}` (ADR 0003 5.3 · ขอบหน้าต่างเป็นจุด grid จึงไม่มีคู่คร่อมขอบจริง) · กฎเดียวกันใช้กับ tick บางส่วนของ D-059 และ raid ในอนาคต (R07)
- ผลต่อ G2 (ช่องว่าง 5 นาทีห่าง 400 ม.): คู่คร่อมช่องว่างผิดข้อ 2 และ 3 → chain ใหม่ → 400 ม. ไม่ถูกนับ · หน้าต่างที่ค้างเดินต่อด้วยระยะเดิม

### 3.4 การย้อน τ เมื่อยืนยันออก / lock

- ขณะชุดออก (หรือชุดเร็ว) รอยืนยัน นาฬิกายังเดินและ `main` รับ sample ต่อ · sample ในชุดเป็นคู่ที่ไม่นับอยู่แล้ว (ข้อ 1 หรือ 5) จึงไม่มีระยะที่ต้องหักคืน
- เมื่อยืนยันที่ `at_ms`: หยุดนาฬิกาที่ `at_ms` · ตัด `lastGrid` ที่ `τ_i > τ(at)` ทิ้ง (ไม่มีค่าอยู่แล้วเพราะอยู่หลังคู่ที่ไม่นับ) · `chain += 1` · anchor ถูกเก็บไว้แต่คู่ถัดไปคร่อมช่วงหยุดจึงไม่นับ
- เมื่อชุดล้ม: ไม่มีอะไรต้องย้อน

### 3.5 ตัวสะสม scratch (การกลับเข้า / ปลด lock ที่ backdate)

- ขณะนาฬิกาหยุดและมีชุดกลับเข้า (หรือชุดช้า) รอยืนยัน `session` สร้าง `scratch` จาก `main` ตอนเริ่มชุด: τ เริ่มที่ค่าที่ค้าง · anchor = sample แรกของชุด · `chain` ใหม่
- sample ถัดไปในชุดป้อนทั้ง `main` (ในฐานะนาฬิกาหยุด · ไม่มีระยะ) และ `scratch` (ในฐานะนาฬิกาเดินตั้งแต่ sample แรกของชุด)
- ยืนยัน: `main := scratch` · นาฬิกาเดินจาก `at_ms` ของชุด · ระยะของคู่ในชุดที่นับได้จึงถูกนับย้อนหลัง · ล้ม: ทิ้ง `scratch`
- ผลเท่ากับ "เก็บ sample ของชุดไว้แล้วเล่นซ้ำ" โดยไม่มีรายการ sample (tech note F04 11.2) · vector ของ P2-F05-T20 ตรวจความเท่ากันนี้

## 4. เวลาที่ตัดสินหน้าต่าง

- หน้าต่าง k ครบเมื่อ τ ถึง `(k+1) × window_s × 1000` · **ตัดสิน** เมื่อทั้งสองข้อจริง
  1. `main` ได้รับ sample ที่ใช้ได้ที่ `τ ≥` ปลายหน้าต่าง (ในช่วงที่นาฬิกาเดิน) · จุด grid ที่ปลายหน้าต่างจึงคำนวณได้ (หรือรู้แน่ว่าไม่มีค่า)
  2. เวลาจริงของปลายหน้าต่าง `≤ H` (tech note F04 4.3) · ไม่มีชุดรอยืนยันที่เริ่มก่อนปลายหน้าต่าง
- ถ้าชุดออกที่เริ่มก่อนปลายหน้าต่างถูกยืนยัน τ ย้อนกลับไปก่อนปลาย หน้าต่างยังไม่ครบ (spec F04 R15 ข้อ 5)
- ไม่มีหลักฐาน: นาฬิกาหยุดที่ `t_last` (F04 R14) หน้าต่างไม่ครบ · **ข้อ (ข) ของ ADR 0003 5.2 ข้อ 6** ("`now_ms` เลยปลาย + `maxSamplePairGap_s`") จึงไม่ทำให้หน้าต่างครบ · ผลยังขึ้นกับ sample เท่านั้น และ server Phase 3 ที่ได้ batch ได้ผลเท่ากัน (ADR จะถูกแก้ถ้อยคำให้ตรง)
- G8: แอปถูกปิดที่ 4:59 → นาฬิกาหยุดที่ `t_last` · กลับเข้าแล้วเดินต่ออีกราว 1 วินาทีของ τ → ตัดสิน
- ผล: ระยะของหน้าต่าง `> minDistancePerWindow_m` → `granted` (R08 · G1 เท่าเกณฑ์ไม่ผ่าน) · จากนั้น `tickIndex += 1`, `distance_m := 0`, `windowStartTau += window_s × 1000` · ระยะส่วนเกินไม่ยก (ADR 0003 5.2 ข้อ 5)
- หน้าต่างหลายหน้าต่างครบใน step เดียวได้ (เช่น หลัง `H` ขยับไกล) · ประเมินตามลำดับ k

## 5. สิ่งที่ tick ให้ (F05 R10–R17)

1. `evaluateWindow` คืน `granted`
2. ไม่ผ่าน: event `run_tick_denied { tickIndex }` · ไม่ดึงเลขสุ่ม · ไม่แตะ HP, run state, หน้าต่างถัดไป (R10)
3. ผ่าน:
   - exp = สูตรของ `src/formulas` จาก `progression.expCurve`, `progression.expMultipliers`, `combat.zoneLevelFrom` ที่เลเวลของผู้เล่น **ณ ตอนนั้น** (R11, R16 · เลเวลขึ้นมีผลกับ tick ถัดไป G13) · การปัดตาม balance-model
   - loot = `rollTickLoot(runSeed, grantedCount, table(drop_table_id), mult, f = 1)` ลำดับการดึงตาม ADR 0003 6.3 · `mult` ของ Phase 2 = `drops.smallDungeon` ตาม `area_m2` ของ artifact + ตัวคูณ Ranged คนเดียว · ตัวคูณสัปดาห์บอส / trust = ค่ากลาง (R12, R13)
   - `grantedCount += 1` · ของเข้า `run.bag` ทันที (R17) · exp เข้า `player` ทันที
   - event `run_tick_granted { tickIndex, loot, expGained, partial: false }`
4. ยามาจาก loot เท่านั้น (R14) · onboarding ไม่มี input หรือ code path ให้ของ (R15 · tech gate ค้น `bag` ถูกเขียนจากที่ใดบ้าง)
5. ไม่มีเพดาน tick / เวลา / ตัวลด (R28)

## 6. จบ run และการจ่าย (F05 R20–R23, D-059, D-094)

| `exitReason` | ถุงของ run → inventory | exp ที่ได้ | หน้าต่างที่ค้าง |
| --- | --- | --- | --- |
| `manual_exit`, `auto_retreat`, `timeout`, `clock_invalid` | ย้ายครบ (`hpSafety.autoRetreatKeepsRunLoot`) | เก็บ | ทิ้ง |
| `dungeon_closed`, `emergency_close` | ย้ายครบ | เก็บ | `partialTick` |
| `death` | ทิ้งทั้งหมด (`death.loseAllRunLoot`) | เก็บ | ทิ้ง |

- **ถุงของ run** = ของที่ได้ใน run นี้และยังไม่ใช้ · ยาที่พกเข้ามาก่อน run ไม่อยู่ในถุง (R20) · `session` แยก `run.bag` กับ `player.inventory` ตั้งแต่เริ่ม
- **ลำดับตอนปิด** (`dungeon_closed` / `emergency_close` ที่ `endAt_ms` = `closesAt_ms` หรือเวลาของ `emergencyClose` · systems-designer ยืนยัน A-P2-F04-T14-6 / -7 ใน `design/systems/balance-model.md` 16.8):
  1. `endAt_ms` เป็น **นาฬิกาหยุด** ของระยะ: τ หยุดที่ `τ(endAt)` · sample ที่ `t > endAt_ms` ไม่ใช้กับระยะใดเลย (แม้ engine จะได้รับ sample นั้นก่อนประมวล `dungeon_closed` เพราะ `H`) · ไม่ interpolate ถึงหรือเลย `endAt_ms`
  2. หน้าต่างที่ปลาย `(k+1) × window_s × 1000 ≤ τ(endAt)` ตัดสิน **ตามปกติ** ก่อน (หัวข้อ 4 · ระยะเต็มเกณฑ์ · ไม่ย่อด้วย f) ตามลำดับ k · จุด grid ที่ปลายหน้าต่างใช้ได้เมื่อมีค่าจากคู่ sample ที่ `b.t ≤ endAt_ms`
  3. ส่วนที่เหลือเป็นหน้าต่างที่ค้าง → tick บางส่วนด้านล่าง
- **tick บางส่วน** (R22):
  - `e_ms = τ(endAt) − windowStartTau` (เวลา Active ที่สะสมในหน้าต่างที่ค้าง · ถ้านาฬิกาหยุดอยู่ใช้ τ ที่ค้าง · E11)
  - `e < partialTickMinElapsed_s × 1000` → ไม่จ่าย (G10: 59 วิ ไม่จ่าย 60 วิ ประเมิน)
  - `f = e / (window_s × 1000)` · ผ่านเมื่อ `distance_m > minDistancePerWindow_m × f` (`greaterThan`, `partialTickGateScaling: proportional`)
  - ระยะนับถึงจุด grid สุดท้ายที่ `τ_i ≤ τ(endAt)` และจุดนั้นต้องมีค่าจากคู่ sample ที่นับได้ซึ่ง **จบก่อนหรือตรง** `endAt_ms` (`b.t ≤ endAt_ms`) · จุด grid ที่ต้องใช้คู่ที่คร่อม `endAt_ms` ไม่มีค่า · ผลจึงไม่ขึ้นกับจังหวะเรียก `sessionStep` (vector `partial-tick` "ระยะถึงจุด grid ก่อนปิด")
  - ผ่าน: exp × f · `rollTickLoot(runSeed, grantedCount, table, mult, f)` โดย `grantedCount` = index ถัดไปของ stream `drop` (จำนวน tick ที่ผ่านแล้วรวมหน้าต่างจากข้อ 2 · ไม่เปิด stream ใหม่ · vector: ผ่านมา 3 ครั้ง → index 3, f = 0.2): โอกาสทุก rarity × f และจำนวน Common × f ปัดแบบ `quantityPerDrop.fractionalQuantityRounding` (A-P2-F04-T01-4 ของ systems) · `grantedCount += 1` · event `run_tick_granted { partial: true, f }`
  - ไม่ผ่าน: `run_tick_denied { partial: true }` · ไม่ดึงเลขสุ่ม
- run ที่มี tick ผ่านอย่างน้อยหนึ่งครั้ง (รวมบางส่วน) = run ที่นับ (R23) · `RunSummary.ticksGranted > 0`
- หลังจ่าย: ลบทุก field ที่มีพิกัด (`main`, `scratch`, anchor) แล้วสร้าง `RunSummary` (tech note F04 9.1 ขั้น 10)

## 7. Event และ telemetry ของ F05

| engine event | telemetry | หมายเหตุ |
| --- | --- | --- |
| `run_tick_granted` | `run_tick_granted` (`dungeon_id`, `party_size_bucket` `1`, `full_role` false, `roles_present` [class ตัวเอง]) | loot / exp อยู่ใน event ของ engine สำหรับ UI · telemetry ไม่ส่งรายการของ (Phase 4 `loot_rarity_received`) |
| `run_tick_denied` | `run_tick_denied` (`dungeon_id`) | |
| `dungeon_exited.summary` | `dungeon_exited` (`ticks_granted_count`, `exit_reason`) | enum ตาม tech note F04 12.4 |

- proxy ของ north star ใน Phase 2 (PM-S3) นับจาก `run_tick_granted` ตัวเดียวกับที่ให้ของ · HUD `gateDiagnosticWindows` ไม่ส่ง telemetry เป็น tick (R01, acceptance 5)
- ขอให้ product-manager ยืนยันว่า `run_tick_granted` / `run_tick_denied` ของ tick บางส่วนแยกได้ (เสนอ property `partial` bool) · handoff

## 8. Sequence ต่อ tick (รายละเอียดของขั้น 7–10 ใน tech note F04 9.1)

```
sample เข้า ─► ด่านเวลา ─► จัดชั้น (usable, inside, lockSpeed) ─► lock ─► approach ─► presence
                                                                                   │
            ┌──────────────────────────────────────────────────────────────────────┘
            ▼
   rewardFeed(main)  [+ rewardFeed(scratch) ถ้ามีชุดกลับเข้า/ช้าที่รอ]
     ├ ขั้น 1 ตัวกรอง: เก็บ / ทิ้ง / re-anchor
     ├ คู่ (anchor, s): valid ตาม 3.1 หรือ chain += 1
     ├ จุด grid ใหม่ใน (τ(anchor), τ(s)] ที่ valid → ระยะของคู่ grid chain เดียวกัน → distance_m ของหน้าต่างที่มี g_{i+1}
     └ anchor := s
   ยืนยัน transition? ─► ออก/lock: หยุดนาฬิกาที่ at, ย้อน τ (3.4) · กลับเข้า/ปลด: main := scratch (3.5)
            ▼
   H = min(E, P)  (F04 4.3)
            ▼
   loop เหตุการณ์ตามเวลา ≤ H (ลำดับ F04 9.3):
     rewardDue? ─► evaluateWindow ─► granted: exp + rollTickLoot(drop, grantedCount) → bag · event
                                  └► denied: event
     hit (F06) ─► R-B1 ─► auto-retreat / death
     Grace→Suspended · closing soon · dungeon_closed (partialTick) · timeout
            ▼
   จบ run? ─► ตาราง 6 ─► summary ─► ลบพิกัด ─► dungeon_exited
```

## 9. Failure modes เฉพาะ gate / reward

| # | สถานการณ์ | ผล | spec |
| --- | --- | --- | --- |
| FR-01 | ช่องว่าง sample (จอล็อก, แอปปิด, GPS หาย) | คู่คร่อมช่องว่างไม่นับ · chain ใหม่ · หน้าต่างหยุดที่ `t_last` | R06, G2, G8 |
| FR-02 | accuracy แย่ทั้งหน้าต่าง | ไม่มีคู่ที่นับ → ไม่มีหลักฐาน → นาฬิกาหยุด · ถ้ามี sample ดีปนพอให้เดิน หน้าต่างครบแต่ระยะน้อย → denied แบบไม่ลงโทษ | G6 |
| FR-03 | เลียบขอบ sample สลับใน/นอกโดยไม่ยืนยันออก | ยัง Active · คู่ที่มี sample นอกไม่นับ | G4 |
| FR-04 | drift spike | ตัวกรองทิ้ง spike · คู่ข้าม re-anchor = 0 | ADR 5.3 |
| FR-05 | speed lock กลางหน้าต่าง | นาฬิกาหยุดย้อนที่ sample แรกของชุดเร็ว · คู่เร็วไม่นับ | G7 |
| FR-06 | ปิดทำการ / ปิดฉุกเฉินตอนหน้าต่างค้าง | `partialTick` | G9, G10 |
| FR-07 | auto-retreat ตรงวินาทีที่หน้าต่างครบ | tick ก่อน แล้วถอน · ของ tick นั้นอยู่ในสรุป | G12 |
| FR-08 | ตายตอนปิด auto-retreat | ถุงของ run ทิ้ง exp อยู่ เลเวลไม่ลด | G11 |
| FR-09 | นาฬิกาถอยหลัง | `clock_invalid` · หน้าต่างค้างทิ้ง · ถุงย้ายครบ | G15 |
| FR-10 | `comparison` ไม่รู้จัก / `rewardTickInterval_s ≠ window_s` / key gate ขาด | throw ตอนสร้าง params (client ไม่เริ่ม engine) | ADR 5.2 |
| FR-11 | `drop_table_id` ไม่มีใน config | validator ของ `tools/dungeons` ล้มตอน build · runtime throw ตอนสร้าง params | — |
| FR-12 | เครื่องส่ง sample ถี่ / ห่าง ต่างกัน | resample ทำให้ระยะใกล้กัน (ADR 5.3 ขั้น 2) · ผลจริงวัดในสนาม P2-C03 | acceptance 4 |

## 10. Vector และ test hooks

- vector ของ systems-designer (P2-F05-T01 / T20) ที่ engine ต้องผ่าน: G1 (เท่าเกณฑ์), G2 (ช่องว่าง 400 ม.), G3 (นอกเขต 2 นาที), G4 (เลียบขอบ), G9 / G10 (59 / 60 วิ), G11, G12, R-B1 สามกรณี, table-still = 0 หน้าต่างผ่าน, bench-jitter ≥ 1, drift-spike ไม่ได้ระยะ, ความถี่ 1 Hz เทียบ 0.2 Hz, Grace 2 นาทีเลื่อน tick 2 นาที, scratch เท่ากับการเล่นซ้ำ (3.5), คู่เร็วกว่า speed lock ไม่นับ, drop ด้วย `runSeed` + index คงที่
- vector ระบุ input เป็นลำดับ `{ now_ms, input }` และผลเป็น events ที่คาด (ไม่ผูกกับรูปภายในของ state) · รันผ่าน `sessionStep` เพื่อให้ Phase 3 ใช้ชุดเดียวกัน
- QA trace (P2-F04-T19) รันผ่าน Mock แบบเร่ง + `seed` + `start` ตาม tech note F04 หัวข้อ 17 · run ยาว 3 ชั่วโมงจาก trace สังเคราะห์ที่ ×60 (acceptance 12)
- acceptance 5 (HUD แยกจาก tick): test เปลี่ยน `app.client.hudMeasurement.gateWindowStep_s` แล้วยืนยันว่า events ของ `sessionStep` เท่าเดิม

## 11. สมมติฐานและงานต่อ

- A-P2-F04-T14-3 (ซ้ำจาก tech note F04): คู่ที่เร็วกว่า `speedLock_kmh` ไม่นับ (3.1 ข้อ 5) · owner game-director
- A-P2-F04-T14-6: ปิดแล้ว · systems-designer ยืนยันใน P2-F05-T20 (balance-model 16.8, vector `partial-tick`) · เขียนเป็นสัญญาในหัวข้อ 6 (P2-X04)
- A-P2-F04-T14-7: ปิดแล้ว · ยืนยันพร้อมขยาย (จุด grid ต้องมีค่าจากคู่ที่จบก่อนหรือตรงเวลาปิด · `endAt` เป็นนาฬิกาหยุด) · หัวข้อ 6 (P2-X04)
- ADR 0003 5.2 ข้อ 6 (ข) ต้องแก้ถ้อยคำตามหัวข้อ 4 · tech-lead (งานถัดไป)
- `run_tick_granted.partial` เป็นข้อเสนอถึง product-manager (P2-F04-T17)
