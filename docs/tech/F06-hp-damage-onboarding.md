# Tech note F06 — HP engine, class, onboarding state และสถานะที่บ้าน

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F06-T04 · เจ้าของ tech-lead · วันที่ 2026-09-26 · สถานะ: ฉบับแรก (สัญญาสำหรับ P2-F06-T06, P2-F06-T08, P2-F06-T09, P2-F06-T17, qa-tester) · แก้ P2-X16 2026-09-27: ถอน consent ระหว่าง run (8.4, B-06, D-116), เวลาที่เหลือถึง 50% (6.2), ยืนยัน J-P2-T30-4 (15) · แก้ P2-X31 2026-09-27: 9.1–9.2 รอยแยกที่แนะนำของ onboarding ตาม F06-R37 ฉบับ P2-X15 (K-11, D-116 · ไม่มีทางสำรองนอกช่วงเลเวล) |
| คู่กับ | `docs/tech/F04-dungeon-presence.md` (tech note F04: `sessionStep`, เวลา, `H`, ลำดับ 9.3, storage, telemetry) · `docs/tech/F05-movement-gate-reward.md` (tech note F05: `ActiveClock`, tick, drop, การจ่ายตอนจบ run) |
| อ้างอิง | ADR 0003 (3.1 โมดูล, 3.2 สัญญา reducer, 3.4 C1-1/C1-5, 6.4 stream `hit`, 7 `PresenceStrategy`) · `design/features/F06-hp-damage-onboarding.md` (spec F06, R01–R58, H-E1–H-E24) · `design/systems/balance-model.md` 3.1, 3.1.1 (R-B1), 17 · `design/systems/test-vectors/{damage,run-loop}.json` · `tools/sim/src/{hit,loop}.ts` (reference) · `product/telemetry-events.md` · D-020, D-038 B, D-078, D-089, D-094, D-096, D-110 (PROPOSED) |
| ผู้ใช้เอกสาร | backend-programmer (`src/hp`, `src/session`), gameplay-programmer (จอ run, ตั้งค่า, onboarding, จอที่บ้าน), systems-designer (key + vector), qa-tester (test plan), product-manager (telemetry) |

ชื่อ key ใช้รูปแบบเดียวกับ tech note F04 ย่อหน้าต้น (`balance.` = `config/balance/*.json`, `app.` = `config/app/*.json`) · ตัวเลขในวงเล็บเป็นค่าปัจจุบันเพื่ออธิบายเท่านั้น โค้ดอ่านจาก config เสมอ

## 0. สรุปคำตัดสินของ tech note นี้

| เรื่อง | คำตัดสิน | หัวข้อ |
| --- | --- | --- |
| ที่อยู่ของ HP engine | `packages/shared/src/hp` เป็นฟังก์ชัน pure ที่ `session` เรียก · client เห็นผลผ่าน `sessionStep` + selector เท่านั้น | 1, 3 |
| นาฬิกาการตี | ใช้ `ActiveClock` ตัวเดียวกับ rewardWindow (τ = เวลา Active ไม่ lock หลัง backdating) · ความพยายามครั้งที่ i อยู่ที่ `τ_i = Σ interval_j (j ≤ i)` จาก stream `hit` index i · หยุด/เดินต่อ ไม่รีเซ็ต | 3.2 |
| เวลาที่ตัดสินการตี | ความพยายามที่เวลาจริง `at < H` (เคร่ง) และอยู่ในช่วงที่นาฬิกาเดิน · ไม่เคยต้องย้อนผลของการตี | 3.3 |
| ลำดับกับ tick | เวลาเท่ากัน: tick ก่อน (F04 9.3 ข้อ 1–3) · ของของ tick อยู่ในถุงแล้ว hit ใช้ยานั้นได้ | 4 |
| damage | `damagePerHit` ของ `src/formulas` · Tanker ใช้ buff ตัวเอง, class อื่นใช้ `missingDebuffMult` · ห่างเลเวล ณ เวลาที่ทอย · สัปดาห์ล้มบอส = กลางเสมอใน Phase 2 | 3.4 |
| ผลต่อ hit | port `resolveHit` ของ `tools/sim/src/hit.ts` ตรงตัว (R-B1) · ยาเรียงตาม `sourceOrder` × `defaultPotionOrder` หนึ่งขวดต่อ hit | 3.5 |
| auto-retreat / ตาย | ผล `autoRetreat` → จบ run `auto_retreat` ที่เวลาของ hit · `died` → จบ `death` · ใช้ตาราง F05 หัวข้อ 6 | 5 |
| HP นอก run | เก็บเป็นจุดยึด `{ value, anchorAt_ms }` แล้วคำนวณการฟื้นเมื่ออ่าน (ไม่มี timer) · นาฬิกาถอยหลัง HP ไม่ลดและยึดจุดใหม่ | 6 |
| class, เลเวล, inventory | อยู่ใน `SessionState.player` ของ `kw.p2.session` · เลือก class ด้วย input `chooseClass` ครั้งเดียว · inventory ถูกเขียนได้สองทางเท่านั้น (จบ run, ใช้ยา) | 2, 7 |
| onboarding | ขั้นที่ engine รู้อยู่แล้ว (class, เข้า run ครั้งแรก, รางวัลก้อนแรก) อ่านจาก `player` · ขั้น UI (intro, อายุ, consent) อยู่ใน `kw.p2.onboarding` / `kw.p2.consent` | 8 |
| จอไกล / นอกพื้นที่ | client คำนวณด้วย `@keep-walking/geo` (`inPlayArea`, `pointInPolygon`, `boundaryDistance_m`) + `selectOpening` · แสดงผลเท่านั้น | 9 |
| telemetry ที่ถูกถาม | `run_tick_denied` มี `partial` (ยืนยัน) · `wake_lock_engaged_share_bucket` คิดจากเวลาที่ถืออยู่จริง | 10 |
| ถอน consent ตำแหน่งระหว่าง run | client ส่ง input `exit` เดิม → `exitReason = manual_exit` (ไม่เพิ่มค่าใหม่) · ไม่ผ่าน Grace/Suspended/`timeout` · หยุด LocationProvider หลัง step นั้น | 8.4 |
| เวลาที่เหลือถึง 50% (`home.recoveringDetail`) | `selectPlayerView(...).recoveryTimeLeft_ms` คิดแบบปิดจากจุดยึด HP | 6.2 |
| `PresenceStrategy.presence()` | ยืนยันการอ่านของ backend: ตัวจำแนกขณะเดียวไม่มีสถานะ ใช้แสดงผล · in/out ของ state machine มาจาก `presenceStep` / `runTimeline` | 11 |

## 1. ขอบเขต โมดูล และข้อยกเว้น

- ใน Phase 2 HP engine รันบน client ตามข้อยกเว้น C1-1 ของ ADR 0003 (หมดอายุเมื่อเริ่ม Phase 3) · ผลไม่ใช่รางวัลจริง · สัญญาในเอกสารนี้ออกแบบให้ CellDO เรียกฟังก์ชันชุดเดียวกันได้โดยไม่แก้
- โมดูล: `packages/shared/src/hp/` (การตี, damage ต่อ hit, R-B1, ยา, การฟื้น, class ที่มีผลต่อ HP) · `packages/shared/src/session/` ประกอบ `run` → `reward` → `hp` · เจ้าของโค้ด backend-programmer (P2-F06-T06)
- ทิศ import ตาม ADR 0003 3.1: `hp` import ได้เฉพาะ `formulas`, `config`, `@keep-walking/geo` (และ `import type` จาก `run` / `reward`) · ข้อมูลข้ามโมดูล (นาฬิกาเดินหรือไม่, ถุงของ run, เลเวล) ส่งผ่าน `session`
- `apps/client` เรียก `sessionStep` และ selector ของ `session` เท่านั้น (lint ADR 0003 8.2 กัน `@keep-walking/shared/hp`) · client ไม่คำนวณ damage, HP, ยา, การฟื้น หรือเลเวลเอง · แถบ HP อ่านจาก selector
- ไม่มีโค้ด Worker / DO / D1 ใน Phase 2 (D-085, D-090)
- สิ่งที่ไม่อยู่ในเอกสารนี้: สถานะล้มในดัน, Support ชุบเพื่อน, ยาชุบในดัน (Phase 3 F09) · ร้าน, ใช้ยาเองใน run, ปรับเกณฑ์ยา (Phase 4 F11) · หน้าลงแต้ม stat, อุปกรณ์ (F10) · push แจ้ง HP (Phase 8)

## 2. State ที่ F06 เพิ่มใน `SessionState` (ชื่อ field ภายในเลือกได้ใน P2-F06-T06 · ความหมายเป็นสัญญา)

### 2.1 `PlayerState` (`SessionState.player` · tech note F04 2.3 อ้างมาที่นี่)

```ts
type ClassId = 'tanker' | 'ranged' | 'support' | 'magic';   // key ของ balance.classes.roles

interface PlayerState {
  readonly classId: ClassId | null;          // null = ยังไม่เลือก (R29) · เปลี่ยนไม่ได้ใน Phase 2 (R30)
  readonly level: number;                    // integer, เริ่มที่ balance.progression.level.startLevel
  readonly exp: number;                      // exp ในเลเวลปัจจุบัน ไม่ปัด (balance-model 17.1, D-110)
  readonly allocated: { readonly atk: 0; readonly def: 0; readonly hp: 0; readonly vit: 0 }; // Phase 2 = 0 เสมอ (R34)
  readonly hp: {                             // HP นอก run (หัวข้อ 6) · ระหว่าง run ค่าจริงอยู่ที่ run.hp
    readonly value: number;                  // HP ณ anchorAt_ms (ไม่ปัด)
    readonly anchorAt_ms: number;            // จุดเริ่มนับการฟื้น (R03, R04)
    readonly recovering: boolean;            // หลังตายจนถึง deathRecoveryTo_pct (R25)
  };
  readonly autoRetreatEnabled: boolean;      // ค่าเริ่ม balance.dungeons.hpSafety.autoRetreatEnabledByDefault (R19)
  readonly inventory: Readonly<Record<string, number>>; // item id → จำนวนเต็ม > 0 (ไม่เก็บ key ที่เป็น 0)
  readonly firstRunEnteredAt_ms: number | null;  // dungeon_entered ครั้งแรกในชีวิต (R36)
  readonly lifetimeTicksGranted: number;     // tick ที่ผ่าน gate รวมทุก run (R39 · ธงรางวัลก้อนแรก = ค่านี้ > 0)
}
```

- ค่าที่ **ไม่เก็บ** เพราะคำนวณได้: `maxHp`, `def`, `vit` (2.3) · แต้ม stat ที่ค้าง = สูตร `balance.progression.statPoints` ที่เลเวลปัจจุบัน − ผลรวม `allocated` (selector เท่านั้น · ไม่มีจอใดแสดงใน Phase 2 ตาม R34)
- `allocated` ใช้ literal `0` ใน type เพื่อให้ typecheck กันโค้ดที่เผลอลงแต้มใน Phase 2 · F10 เปลี่ยน type เป็น `number` พร้อมเพิ่ม `schemaVersion`
- ไม่มีชื่อตัวละคร ไม่มีข้อมูลตัวตน ไม่มีพิกัด ไม่มีเวลาจริงอื่นนอกจาก `anchorAt_ms` และ `firstRunEnteredAt_ms` (อยู่ในเครื่องเท่านั้น ไม่ export · C2-4)

### 2.2 `RunHpState` (`SessionState.run.hp`)

```ts
interface RunHpState {
  readonly hp: number;                       // HP ปัจจุบันใน run (ไม่ปัด) ณ healedThroughTau_ms
  readonly shield: number;                   // โล่ Magic (หมดเมื่อ run จบ · R31 ข้อ 4)
  readonly healedThroughTau_ms: number;      // τ ที่คิด heal ของ Support ถึงแล้ว (3.6)
  readonly nextAttemptIndex: number;         // i ของความพยายามถัดไป = index ของ stream `hit`
  readonly nextAttemptTau_ms: number;        // τ_i ของความพยายามถัดไป (ไม่ปัด)
  readonly attempts: number;                 // จำนวนความพยายามที่ตัดสินแล้ว
  readonly hitsLanded: number;
  readonly potionsUsed: { readonly runBag: number; readonly inventory: number };
  readonly lowHpWarnings: number;
}
```

- ไม่มีสถานะของ PRNG (ADR 0003 6.2 · สร้างใหม่จาก `runSeed` + index ทุกครั้ง) · ไม่มี "ธงติดอาวุธ" ของการแจ้ง 30% เพราะกฎ R14 ตัดสินจาก HP ก่อน hit กับ HP สุดท้ายเท่านั้น การติดอาวุธใหม่เมื่อ HP ขึ้นเหนือเส้น (ยา, heal) จึงเกิดเองโดยไม่ต้องเก็บ state
- `nextAttemptTau_ms` ไม่ถูกเปิดเผยใน selector (เวลาถัดไปของการตีคือผลของ RNG · Phase 3 server ไม่ส่งค่านี้ให้ client เช่นเดียวกับ seed)

### 2.3 ค่าที่คำนวณจาก player + config (ฟังก์ชัน pure ใน `src/hp`)

```
maxHp  = balance.progression.baseStats.hp  + balance.progression.statPerPoint.hp  × allocated.hp     (R01 · Phase 2 = 300)
def    = balance.progression.baseStats.def + balance.progression.statPerPoint.def × allocated.def    (Phase 2 = 20 · ไม่มีอุปกรณ์)
vit    = balance.progression.baseStats.vit + allocated.vit                                           (Phase 2 = 0)
P      = memberP(level, balance.classes.buffStacking)                                                (D-039 · เล่นคนเดียว)
ownBuff(role) = roleBuffPct(balance.classes.roles.<role>, P)  เมื่อ classId = role · ไม่งั้น null
```

- ใช้ `memberP` / `roleBuffPct` ที่มีอยู่แล้วใน `src/formulas/party.ts` · ห้ามเขียนสูตรซ้ำใน `hp`
- ค่าทั้งหมดคำนวณ ณ เวลาที่ใช้ (เลเวลที่ขึ้นจาก tick มีผลกับ hit ถัดไปทันที · F05-R16, G13)

### 2.4 `RunSummary` ที่เพิ่ม (ไม่มีพิกัด · เสริม tech note F04 2.3)

`hpAtEnd` (ไม่ปัด), `maxHp`, `hitsLanded`, `potionsUsed` (`runBag`, `inventory`), `lowHpWarnings`, `lost` (รายการของที่หายเมื่อ `death` · ว่างในเหตุอื่น), `classId` · หน้าสรุปใช้ `lost` บอกว่าของหาย (R23) · kit ของ playtest ใช้ `hitsLanded` / `potionsUsed` แยกตาม class

### 2.5 การตรวจตอน `fromPersisted` (เสริม tech note F04 10.2)

ค่าต่อไปนี้ผิด = `corrupt` (ทิ้งแล้วเริ่มใหม่ ไม่ crash): `classId` ไม่อยู่ใน roles หรือไม่ใช่ `null` · `level` ไม่ใช่จำนวนเต็มในช่วง `[startLevel, maxLevel]` · `exp < 0` หรือ `exp ≥ expToNext(level)` (ยกเว้นเลเวลสูงสุดที่ต้องเป็น 0) · HP นอกช่วง `[0, maxHp]` · `shield < 0` · จำนวนใน inventory ไม่ใช่จำนวนเต็มบวก หรือ item id ไม่มีใน `balance.drops.items` · `lifetimeTicksGranted` ไม่ใช่จำนวนเต็ม ≥ 0 · `allocated` ไม่ใช่ 0 · เหตุผล: ค่าที่แก้มือใน localStorage ไม่ควรพา engine เข้าสถานะที่ไม่มีใน spec (ไม่ใช่มาตรการกันโกง เพราะ Phase 2 ไม่มีรางวัลจริง)

- ถ้ามี build ที่เขียน `kw.p2.session` ออกไปถึงผู้ร่วม playtest แล้วก่อน P2-F06-T06 ให้เพิ่ม `schemaVersion` เป็น 2 (state เก่าถูกทิ้งด้วย `schema_mismatch` ตาม F04 10.2) · ถ้ายังไม่เคยออก ใช้ 1 ต่อได้

## 3. API ของ `hp` (เรียกจาก `session` เท่านั้น)

### 3.1 รายการฟังก์ชัน (ชื่อเลือกได้ · ความหมายและลำดับเป็นสัญญา)

```ts
// packages/shared/src/hp (backend-programmer, P2-F06-T06) · ทุกตัว pure ไม่อ่าน config / เวลา / I/O เอง
function hpParamsFromConfig(cfg: HpConfigSubtree): HpParams;                  // 3.7 · throw เมื่อค่าไม่รองรับ
function hitAttempt(runSeed: number, index: number, p: HpParams): { interval_s: number; hit: boolean }; // 3.2
function runHpInit(hpAtEntry: number, runSeed: number, p: HpParams): RunHpState;                        // 3.2
function nextAttemptDue(hp: RunHpState, clock: ActiveClock, H_ms: number): { at_ms: number; tau_ms: number } | null; // 3.3
function soloHitDamage(ctx: HitDamageContext, p: HpParams): number;         // 3.4
function resolveHit(i: HitInput): HitResult;                                 // 3.5 · port ตรงตัวของ tools/sim/src/hit.ts
function applyAttempt(hp: RunHpState, ctx: AttemptContext, p: HpParams): { hp: RunHpState; result: AttemptResult }; // 3.5
function supportHealThrough(hp: RunHpState, tau_ms: number, ctx: HealContext, p: HpParams): RunHpState;            // 3.6
function onGrantedTick(hp: RunHpState, levelBeforeTick: number, ctx: ShieldContext, p: HpParams): RunHpState;      // 3.6
function hpAt(player: PlayerState['hp'], at_ms: number, ctx: RegenContext, p: HpParams): PlayerState['hp'];        // 6
function usePotionOutsideRun(player: PlayerState, itemId: string, at_ms: number, p: HpParams):
  { ok: true; player: PlayerState; healed: number } | { ok: false; reason: PotionRejectReason };                 // 6.4
```

- `AttemptContext` = `{ runSeed, tau_ms, level, classId, def, vit, maxHp, levelRange, autoRetreatEnabled, bag, inventory }` · `session` ประกอบให้ (hp ไม่อ่าน `run.bag` / `player.inventory` เอง แต่รับเป็นข้อมูลแล้วคืนการหักยาเป็นผล)
- `AttemptResult` = `{ landed, damage, hit: HitResult | null, potion: { source: 'runBag' | 'inventory'; itemId } | null }` · `session` นำผลไปหักถุง/inventory และสร้าง event (หัวข้อ 4)

### 3.2 ตารางการตีจาก stream `hit` (ADR 0003 6.4, R07)

- ความพยายามครั้งที่ i (เริ่ม 0) ใช้ `rng = streamRng(runSeed, 'hit', i)` · ดึงครั้งที่ 1 = `interval_s = uniform(rng, intervalMin_s, intervalMax_s)` · ดึงครั้งที่ 2 = `hit = rng() < hitChancePerCheck_pct / 100` · ไม่มีการดึงครั้งที่ 3 (damage ไม่สุ่ม) · เหมือน `hitAttempt` ของ `tools/sim/src/loop.ts` ทุกตัวอักษร
- `τ_0 = interval_0 × 1000` · `τ_i = τ_{i−1} + interval_i × 1000` · τ นับจาก confirm (`startedAt_ms` = τ 0) · เก็บเป็น ms ไม่ปัด
- `runHpInit` ตอน confirm: `hp` = HP ของผู้เล่น ณ `startedAt_ms` (หัวข้อ 6 · ไม่เติมเต็ม R02) · `shield = 0` · `nextAttemptIndex = 0` · `nextAttemptTau_ms = τ_0`
- หลังตัดสินความพยายาม i (โดนหรือไม่ก็ตาม): `nextAttemptIndex = i + 1` · `nextAttemptTau_ms = τ_i + interval_{i+1} × 1000` (ดึงจาก index i + 1 ทันที)
- **นาฬิกาเดียวกับ rewardWindow:** τ ของการตีคือ `τ(t)` ของ `run.clockIntervals` (tech note F05 หัวข้อ 2) ซึ่งเดินเฉพาะเมื่อ presence ยืนยัน `in` และไม่ lock · ผล: ไม่มีการตีใน Grace, Suspended, speed lock, ก่อน confirm, นอก run (R06, H-E1, H-E3) · กลับ Active แล้วนับต่อจาก τ ที่ค้าง ไม่สุ่มใหม่ ไม่รีเซ็ต (R07, คำตัดสิน 7 ของ spec)
- เงื่อนไขที่ทำให้ใช้นาฬิการ่วมได้: `runState.rewardTickDuringGrace`, `rewardTickDuringSuspended`, `suspendedTimeCounts` เป็น `false` และ engine throw ถ้าเป็น `true` (tech note F04 5.4) · ถ้าวันหนึ่งค่าเหล่านี้เปิดได้ การตีต้องมีนาฬิกาของตัวเอง ซึ่งต้องแก้ ADR 0003 และเอกสารนี้ก่อน
- เวลาจริงของความพยายาม (ขณะนาฬิกาเดิน) = `runningSince_ms + (τ_i − closedSum_ms)` (สูตรเดียวกับปลายหน้าต่างใน tech note F05 2)

### 3.3 เวลาที่ตัดสินความพยายาม (`nextAttemptDue`)

ความพยายาม i ถูกตัดสินใน step นี้เมื่อครบทุกข้อ

1. นาฬิกาเดินอยู่ (`runningSince_ms !== null`)
2. เวลาจริงของความพยายาม `at_ms < H` (**น้อยกว่าแบบเคร่ง** · tech note F04 9.3 ช่วงเดินของ hit เป็น `[เริ่ม, หยุด)`) · เพราะ `H ≤ P` (sample แรกของชุดที่รอยืนยันทุกชุด) ความพยายามที่อาจถูกยกเลิกด้วยการออก / lock ที่ backdate จึงยังไม่ถูกตัดสินเสมอ · **การตีไม่เคยต้องย้อนผล** และ state ไม่ต้องเก็บประวัติการตี
3. run ยังไม่จบใน step นี้ (เหตุจบแรกที่ถึงตัดสินผล · F04 9.3)

- ชุดกลับเข้า / ปลด lock ที่ยืนยันแบบ backdate ทำให้นาฬิกาเดินย้อนตั้งแต่ `firstAt_ms` · ความพยายามที่เวลาจริงตกในช่วงนั้นถูกตัดสินเมื่อ `H` ขยับผ่าน ด้วย `at_ms` ในอดีต (ช้ากว่าเวลาจริงไม่เกินเวลายืนยัน hysteresis) · client แสดงผลเมื่อได้รับ event ไม่เล่นย้อน (FH-08)
- **ตัดสินตามลำดับเวลาเมื่อมี transition ใน step เดียวกัน:** ถ้า step หนึ่งยืนยัน transition ที่หยุดนาฬิกา (ออก, ไม่มีหลักฐาน, lock) `session` ต้องตัดสินหน้าต่างที่ปลาย `≤ at` และความพยายามที่ `< at` ด้วยนาฬิกาก่อน transition ก่อน แล้วค่อยหยุดนาฬิกา · เหตุผล: `ActiveClock` เก็บเฉพาะช่วงที่เดินอยู่ ช่วงที่ปิดไปแล้วแปลง τ กลับเป็นเวลาจริงไม่ได้ · กฎเดียวกันใช้กับหน้าต่างของ F05 · test "step invariance" ในหัวข้อ 13 ตรวจ
- `exit` (manual): ตัดสินอดีตถึง `H` ก่อน (F04 9.2) แล้วจบที่ `now_ms` · ความพยายามใน `[H, now_ms)` ไม่เกิด (ไม่มีหลักฐานที่นิ่งแล้ว · ผลเข้าข้างผู้เล่น)

### 3.4 damage ต่อ hit (`soloHitDamage` · R08, R09, R31)

```
damage = damagePerHit({
  zoneLevel:        zoneLevel(levelRange.min, levelRange.max)        (balance.combat.monsterAttack.zoneLevelFrom = levelRangeMidpointRounded)
  def:              def ของผู้เล่น (2.3)
  tankerBuff_pct:   ownBuff(tanker) ถ้า classId = tanker · ไม่งั้น null → balance.classes.roles.tanker.missingDebuffMult
  levelsBelowRange: max(0, levelRange.min − level)                   (level ณ เวลาที่ทอย · สูงกว่าช่วงไม่ลด)
  failedRaidWeek:   false                                            (Phase 2 ไม่มี raid · R08)
}, monsterParams)
```

- `levelRange` มาจาก `level_range` ของ artifact dungeon (tech note F04 13.2) · `monsterParams` จาก `balance.combat.{monsterAttack, defense, levelGapDamage}` + `balance.classes.roles.tanker.missingDebuffMult` + `balance.combat.raidFailPenalty.monsterAtkMultAfterFailedRaid` (อ่านเพื่อ type ครบ แต่ไม่มีผลเพราะ `failedRaidWeek = false`)
- ตรงกับ `soloDamage` ของ `tools/sim/src/loop.ts` และ vector `soloDamage` 6 ข้อ (เลเวล 1 ช่วง 1–5: Tanker 9.824619, class อื่น 18.770254 · PN-2 ช่วง 1–35: 192.782128 · ช่วง 20–30: 20,503.347492)
- **หมายเหตุต่อ acceptance ของ P2-F06-T06 ("tankerBuff = 0 ใน Phase 2"):** ข้อความนั้นหมายถึงไม่มี Tanker **คนอื่น** ใน party · ตาม spec R31 ข้อ 1–2 และ D-039 Tanker ที่เล่นคนเดียวได้ buff ของตัวเอง และ class อื่นใช้ตัวคูณขาด Tanker · spec อยู่เหนือ board ตามลำดับเอกสารของ CLAUDE.md · vector `soloDamage` ยืนยันค่านี้
- `levelGapDamage.mode` ต้องเป็น `compound` · `maxMult` เป็น `null` = ไม่มีเพดาน (ค่าปัจจุบัน) · ค่าตัวเลข = `min(maxMult, gapMult)` · `mode` อื่น → throw ตอนสร้าง params
- damage อาจใหญ่มาก (1.25^gap) · ไม่ต้องจำกัด เพราะ R-B1 ข้อ 2 ตัดที่พื้น HP 1 เมื่อเปิด auto-retreat (H-E6) · ค่าต้องเป็นจำนวนจำกัด (`Number.isFinite`) ไม่งั้น throw (บั๊กของ config)

### 3.5 ผลต่อ hit (`applyAttempt` + `resolveHit` · R-B1, D-078, R10–R17)

- ความพยายามที่ `hit = false`: นับ `attempts` อย่างเดียว ไม่มี event ของเกม ไม่แตะ HP
- ความพยายามที่ `hit = true`: `hitsLanded += 1` · heal ของ Support ถึง `τ_i` ก่อน (3.6) · damage จาก 3.4 · แล้วเรียก `resolveHit` ด้วย

```
HitInput = {
  hp, maxHp, shield, damage,
  autoRetreatEnabled:        player.autoRetreatEnabled  ณ เวลาที่ทอย (R20 · เปลี่ยนมีผลตั้งแต่ hit ถัดไป)
  autoRetreatThreshold_pct:  balance.dungeons.hpSafety.autoRetreatThreshold_pct
  lowHpWarningThreshold_pct: balance.dungeons.hpSafety.lowHpWarningThreshold_pct
  autoPotionEnabled:         balance.economy.autoPotion.enabledByDefault        (Phase 2 ไม่มีตัวเลือกปิด · R22)
  autoPotionThreshold_pct:   balance.economy.autoPotion.defaultThreshold_pct
  potionEfficiencyBonus_pct: balance.progression.statPerPoint.vitPotionEfficiency_pct × vit
  potions:                   รายการตาม sourceOrder × defaultPotionOrder (ด้านล่าง)
}
```

- **รายการยา:** สำหรับแต่ละ source ใน `balance.economy.autoPotion.sourceOrder` (`runBag` แล้ว `inventory`) และแต่ละ id ใน `defaultPotionOrder` (`hpSmall`, `hpMedium`, `hpLarge`) → `{ id: "<source>:<itemId>", heal_pctMaxHp: balance.economy.potions.<itemId>.heal_pctMaxHp, count }` · `resolveHit` เลือกตัวแรกที่ `count > 0` จึงได้กฎ "ถุงของ run ก่อน แล้วขวดแรกตามลำดับชนิด หนึ่งขวดต่อ hit" (R12, D-096) · `revive` ไม่อยู่ใน `defaultPotionOrder` จึงไม่ถูกดื่มอัตโนมัติ (R13 · params ตรวจซ้ำ 3.7)
- `resolveHit` port **ตรงตัว** จาก `tools/sim/src/hit.ts` (รวม `AUTO_RETREAT_HP_FLOOR = 1` ซึ่งเป็นกฎของ D-078 ไม่ใช่ค่า balance · ตั้งชื่อค่าคงที่พร้อมอ้าง D-078) · ต้องผ่าน vector `resolveHit` 26 ข้อของ `damage.json` · ห้ามปรับลำดับหรือตีความใหม่
- ผลที่ `session` นำไปใช้: `shield := shieldAfter` · `hp := hpAfter` · ถ้า `potionUsed` หักหนึ่งขวดจากแหล่งนั้น (`run.bag` หรือ `player.inventory` ทันที · ยาจาก inventory ที่ใช้ไปแล้วไม่คืนแม้ run จบด้วยเหตุใด) · `lowHpWarning` → `lowHpWarnings += 1` · `outcome` → หัวข้อ 5
- ตาย (`died`) คืน `potionUsed = null` และ `lowHpWarning = false` เสมอ (R-B1 ข้อ 2 · ตายไม่มีการแจ้ง R14)
- เลเวลที่ใช้: `player.level` ณ เวลาที่ทอย (หลัง tick ที่เวลาเดียวกันแล้ว · vector runLoop "tick ก่อน hit": tick 0 พาเลเวล 1 → 2 แล้ว hit ใช้เลเวล 2)

### 3.6 Support heal และโล่ Magic (R31 ข้อ 4–5)

- **Support heal** (เฉพาะ `classId = support`): ต่อเนื่องตาม τ · `rate_perMs = maxHp × inDungeonHealBase_pctMaxHpPerMin × (1 + ownBuff(support)/100) / 100 / 60 000` · `supportHealThrough(hp, τ)` ตั้ง `hp := min(maxHp, hp + rate × (τ − healedThroughTau_ms))` แล้ว `healedThroughTau_ms := τ` · เรียกก่อนทุกความพยายาม ทุก tick และตอนจบ run · buff ใช้เลเวล ณ ตอนคำนวณ (เหมือน `healTo` ของ `runLoop`) · class อื่นเลื่อน `healedThroughTau_ms` อย่างเดียว
- heal คิดจาก τ จึงไม่มี heal ใน Grace, Suspended, lock (R31 ข้อ 5 "เฉพาะเวลา Active ที่ไม่ lock")
- selector แสดง HP ที่รวม heal ถึง `τ(min(now_ms, H))` (ไม่แสดง heal ในช่วงที่ยังอาจถูกยกเลิก)
- **โล่ Magic** (เฉพาะ `classId = magic`): `onGrantedTick` ตั้ง `shield := maxHp × shieldPerRewardTick_pctMaxHpPerBuffPct × ownBuff(magic, levelBeforeTick) / 100` **แทนค่าเดิม** ไม่ซ้อน (D-110) · เรียกเฉพาะ tick ที่ผ่าน gate (รวม tick บางส่วน · ขนาดไม่ย่อด้วย f ตาม A-P2-F05-T01-4 · ไม่มีผลจริงเพราะ tick บางส่วนเกิดตอนจบ run เท่านั้น) · tick ที่ไม่ผ่านไม่แตะโล่ (H-E16) · โล่หมดเมื่อ run จบ ไม่ย้ายไป `player`
- ลำดับใน tick ที่ผ่าน (balance-model 17.1): loot เข้าถุง → โล่ Magic (เลเวลก่อน tick) → exp และเลเวล · `session` เรียก `onGrantedTick` ระหว่างขั้น loot กับ exp

### 3.7 `HpParams` และการตรวจตอนสร้าง (fail closed)

| กลุ่ม | key ที่อ่าน | ตรวจตอนสร้าง params (throw = client ไม่เริ่ม engine · FM-13 ของ F04) |
| --- | --- | --- |
| การตี | `balance.combat.attackCheck.{intervalMin_s, intervalMax_s, intervalDistribution, hitChancePerCheck_pct}` | `intervalDistribution = uniform` · `0 < intervalMin_s ≤ intervalMax_s` · `0 ≤ hitChance ≤ 100` |
| damage | `balance.combat.{monsterAttack.*, defense.defSoftcap, levelGapDamage.*, raidFailPenalty.*}` | `zoneLevelFrom = levelRangeMidpointRounded` · `mode = compound` · `maxMult` เป็น `null` หรือ ≥ 1 |
| class | `balance.classes.{roles.*, buffStacking.*}` | มีครบสี่ role · `roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct`, `roles.support.inDungeonHealBase_pctMaxHpPerMin` เป็นตัวเลข |
| ความปลอดภัย | `balance.dungeons.hpSafety.*`, `balance.dungeons.death.loseAllRunLoot`, `balance.dungeons.exit.regenStartsOnExit` | `autoRetreatThreshold_pct < lowHpWarningThreshold_pct < autoPotion.defaultThreshold_pct` (R-B1 ตั้งอยู่บนลำดับนี้ · ค่าอื่น = throw จนกว่าจะมี spec) · `regenStartsOnExit = true` · `autoRetreatKeepsRunLoot = true` |
| ยา | `balance.economy.potions.*`, `balance.economy.autoPotion.*` | ทุก id ใน `defaultPotionOrder` มี `heal_pctMaxHp` · `revive` ไม่อยู่ในลำดับ · `sourceOrder` เป็น permutation ของ `["runBag", "inventory"]` |
| ผู้เล่น | `balance.progression.{baseStats, statPerPoint, hpRecovery, statPoints, level}` | `statPoints.pointsFormula` เป็นสูตรที่รู้จัก · `deathRecoveryTo_pct / outsideDungeonRegen_pctMaxHpPerMin × 60` ต่างจาก `deathRecoveryDuration_s` ไม่เกิน 1 วินาที (6.2) |

- ทุก subtree อยู่ในกลุ่ม A ของ tech note F04 15.1 แล้ว (`combat`, `classes`, `economy.potions`, `economy.autoPotion`, `progression`, `dungeons.hpSafety/death/exit`) · ไม่ต้องเพิ่ม whitelist
- key ที่ขึ้นต้น `_` ข้าม · `null` ที่ไม่มี `_nullMeans` = `ConfigUnsetError` (ADR 0003 3.1)

## 4. ลำดับภายใน `sessionStep` (ขยายขั้น 9–10 ของ tech note F04 9.1)

```
ขั้น 9  ประมวลเส้นเวลาถึง H (มี run เท่านั้น)
  วน:
    w = rewardDue(...)            → ปลายหน้าต่างถัดไป (เวลาจริง, ≤ H)                      [F05]
    a = nextAttemptDue(run.hp, run.clockIntervals, H)  → ความพยายามถัดไป (เวลาจริง, < H)    [3.3]
    r = runTimers / ใกล้ปิด / ปิด  → เหตุการณ์ของ run (≤ H)                                 [F04]
    ไม่มีทั้งสาม → ออกจากวง
    เลือกตัวที่ at_ms น้อยสุด · เท่ากัน: w (1) → a (2–3) → transition (4) → ใกล้ปิด (5) → ปิด (6) → timeout (7)
    w: supportHealThrough(τ ปลายหน้าต่าง) → evaluateWindow
         ผ่าน: loot → bag · onGrantedTick (โล่) · exp/เลเวล · player.lifetimeTicksGranted += 1 · event run_tick_granted
         ไม่ผ่าน: event run_tick_denied (partial: false)
    a: supportHealThrough(τ_i) → applyAttempt → หักยา → event ตาม 4.1
         outcome autoRetreat → จบ run auto_retreat ที่ at_ms (หัวข้อ 5) · died → จบ death ที่ at_ms · ออกจากวง
    r: ตาม F04 (Grace → Suspended ไม่แตะ HP · ปิด / timeout จบ run)
ขั้น 10 จบ run (ถ้ามีเหตุ): supportHealThrough(τ(endAt)) · จ่ายตามตาราง F05 6 · HP → player (หัวข้อ 6.1) · RunSummary · ลบพิกัด · dungeon_exited
```

- ผลของขั้นนี้ขึ้นกับ sample และ `now_ms` เท่านั้น ไม่ขึ้นกับความถี่ที่ client เรียก `tick` (F04 4.3) · client เรียก `tick` ทุก `app.client.engine.tickInterval_ms` เพื่อให้ event ของการตีออกมาทันเวลา แต่ผลเท่าเดิมถ้าเรียกห่างกว่า
- ความพยายามและ tick ใช้ τ ของนาฬิกาเดียวกัน · ถ้า τ เท่ากันพอดี เวลาจริงก็เท่ากัน จึงได้ลำดับ tick ก่อน hit (D-094, R10, H-E8, H-E9) · ยาที่ drop ใน tick นั้นอยู่ในถุงแล้วเมื่อ hit ตัดสิน
- ข้อต่างจาก `runLoop` (reference): `runLoop` ตัดสินเหตุการณ์ที่เวลา = `limit_s` ด้วย · engine ตัดสินความพยายามเฉพาะ `< H` · harness ของ vector ต้องป้อน sample ต่อเลย `limit_s` อย่างน้อยหนึ่งตัวก่อนส่ง `exit` (หัวข้อ 13.2)

### 4.1 event ของ F06 (ไม่มีพิกัด · เสริมตาราง tech note F04 2.5)

| `type` | field | เกิดเมื่อ |
| --- | --- | --- |
| `run_hit` | `dungeonId`, `attemptIndex`, `damage`, `shieldAbsorbed`, `hpAfterHit`, `hpAfter`, `maxHp`, `outcome` (`continue` \| `autoRetreat` \| `died`) | ความพยายามที่โดน (สำหรับแถบ HP และ VFX · ไม่ใช่ telemetry) |
| `run_potion_auto_used` | `dungeonId`, `itemId`, `source` (`runBag` \| `inventory`), `healed` | `potionUsed ≠ null` |
| `run_hp_low` | `dungeonId`, `classId` | `lowHpWarning = true` |
| `run_auto_retreat` | `dungeonId`, `classId`, `sinceStart_ms` (เวลาจริงนับจาก `startedAt_ms`), `activeTau_ms` | `outcome = autoRetreat` |
| `run_death` | `dungeonId`, `classId`, `lost` (รายการ item id + จำนวน) | `outcome = died` |
| `run_tick_granted` (เพิ่ม field) | `levelBefore`, `levelAfter`, `firstEver` (bool = `lifetimeTicksGranted` ก่อน tick นี้เป็น 0) | tick ที่ผ่าน (F05) |
| `run_tick_denied` (เพิ่ม field) | `partial` (bool · `false` ในหน้าต่างปกติ, `true` ในหน้าต่างที่ค้างตอนปิดของ F05 6) | tick ที่ไม่ผ่าน |
| `class_chosen` | `classId` | input `chooseClass` สำเร็จ (7.1) |
| `class_choice_rejected` | `reason` (`already_chosen` \| `run_active` \| `unknown_class`) | input `chooseClass` ไม่ผ่าน |
| `auto_retreat_setting_changed` | `enabled` | input `setAutoRetreat` ที่ค่าเปลี่ยนจริง (ค่าเท่าเดิม = ไม่มี event) |
| `potion_used` | `itemId`, `healed`, `revived` (bool) | input `usePotion` สำเร็จ (6.4) |
| `potion_use_rejected` | `itemId`, `reason` (6.4) | input `usePotion` ไม่ผ่าน |
| `player_recovered` | — | HP นอก run ข้ามเส้น `deathRecoveryTo_pct` ขึ้นไป (ออกจาก Recovering) · ตรวจเมื่อ step ใดก็ได้ที่อ่าน HP |

- ลำดับ event ที่ `at_ms` เท่ากันของความพยายามหนึ่งครั้ง: `run_hit` → `run_potion_auto_used` → `run_hp_low` → `run_auto_retreat` / `run_death` → `dungeon_exited` · ถ้ามี tick ที่เวลาเดียวกัน event ของ tick มาก่อนทั้งหมด
- **สัญญาณเดียวตอนถอย (R16, F05-R18 ข้อ 5):** engine ส่งทั้ง `run_hp_low` และ `run_auto_retreat` ได้ใน step เดียว · client (P2-F06-T08) เมื่อพบ `run_auto_retreat` ใน `events` ชุดเดียวกัน ไม่เล่นภาพ/เสียง/สั่นของ `run_hp_low` · telemetry ยังบันทึกทั้งสอง event (ข้อเท็จจริงของการลงผ่านเส้น ไม่ใช่สิ่งที่ผู้เล่นเห็น)
- `firstEver` เป็นข้อมูลให้ client เลือก effect / copy ที่เด่นกว่า (R39) เท่านั้น · `reward` และ `hp` ห้ามอ่าน `lifetimeTicksGranted` หรือ `firstEver` เพื่อเปลี่ยนผลใด (tech gate ค้นโค้ด · ไม่มีสาขา onboarding ใน engine)

## 5. auto-retreat, ตาย และการตั้งค่า auto-retreat

### 5.1 จบ run จากผลของ hit

| `outcome` | `exitReason` | `endedAt_ms` | ถุงของ run | exp / เลเวล | หน้าต่างที่ค้าง | HP ที่ย้ายไป `player` |
| --- | --- | --- | --- | --- | --- | --- |
| `autoRetreat` | `auto_retreat` | `at_ms` ของ hit | ย้ายเข้า inventory ครบ (`autoRetreatKeepsRunLoot`) | เก็บ | ทิ้ง (ไม่มี tick บางส่วน · F05 6) | `hpAfter` (≥ 1 เสมอ) |
| `died` | `death` | `at_ms` ของ hit | ทิ้งทั้งหมด (`death.loseAllRunLoot`) → `RunSummary.lost` | เก็บ เลเวลไม่ลด (F05-R20, R21) | ทิ้ง | 0 · `recovering = true` |

- จบทันทีในความพยายามเดียวกัน · ไม่มีความพยายามหรือ tick หลังจากนั้น (เหตุจบแรกชนะ · F04 9.3)
- ยาที่ดื่มจาก `player.inventory` ระหว่าง run ถูกหักไปแล้ว · ยาจาก inventory ที่ยังไม่ใช้อยู่ครบแม้ตาย (R23, H-E14) เพราะไม่เคยอยู่ในถุงของ run
- tick ที่เวลาเดียวกับ hit ที่ทำให้ตาย: tick มาก่อน · exp ของ tick อยู่ · ของของ tick อยู่ในถุงแล้วจึงหายพร้อมถุง (H-E9, F05 G11)
- ตาย = HP 0 **ได้ทางเดียว** คือ `autoRetreatEnabled = false` ณ เวลาที่ทอย (R17) · test ยืนยันว่าเปิด auto-retreat ไม่มี trace ใดจบ `death` (acceptance 3 ของ spec)
- Phase 2 ไม่มีสถานะล้มในดัน (R24): `death` จบ run ทันที · `supportReviveOnlyInsideSameDungeon` และ `revive.usableInsideDungeon` ไม่ถูกอ่านใน Phase 2

### 5.2 input `setAutoRetreat { enabled }` (R19–R22)

- รับได้ทุกเวลา รวมระหว่าง run · มีผลกับความพยายามที่ตัดสิน **หลัง** input นี้ (R20) · ไม่ตัดสินอะไรทันที: เปิดกลับขณะ HP ≤ 25% ไม่ถอนจนกว่าจะโดน hit ถัดไป (H-E13)
- ความพยายามที่เวลาจริงอยู่ก่อน input แต่ยังไม่ถูกตัดสินเพราะ `H` (3.3) ใช้ค่าใหม่ · ยอมรับ: ความหน่วงไม่เกินเวลายืนยัน hysteresis และเป็นไปตามข้อความ R20 "มีผลตั้งแต่ hit ถัดไป" จากมุมของผู้เล่น
- ค่าเปลี่ยน → event `auto_retreat_setting_changed` (ทำให้ client persist ทันทีตาม F04 10.1) · ค่าเท่าเดิม → ไม่มี event
- **ข้อบังคับของ client (NN-6):** input นี้ถูกส่งได้จากหน้าย่อย "การเดินและความปลอดภัย" ในตั้งค่าเท่านั้น · ปิดต้องผ่าน popup ยืนยันก่อนส่ง · เปิดส่งทันที · tech gate ค้นว่ามี call site เดียวใน `apps/client` · engine ไม่รู้จัก popup (ไม่มีทางตรวจ) จึงเป็นกฎของ client
- ลบข้อมูลในเครื่อง = `createSession` ใหม่ → ค่ากลับเป็น `autoRetreatEnabledByDefault` (R22)

## 6. HP นอก run: ฟื้น, Recovering, ยา (R02–R05, R25–R27)

### 6.1 จุดยึดและสูตรการฟื้น (`hpAt`)

```
regenRate_perMs = maxHp × outsideDungeonRegen_pctMaxHpPerMin × (1 + vitHpRegenSpeed_pct × vit / 100) / 100 / 60 000
hpAt(player.hp, t) = t ≤ anchorAt_ms ? value
                                      : min(maxHp, value + regenRate_perMs × (t − anchorAt_ms))
```

- **ไม่มี timer:** HP นอก run เป็นฟังก์ชันของเวลา · selector คำนวณเมื่ออ่าน · state เปลี่ยนเฉพาะเมื่อมีเหตุ (เข้า run, ใช้ยา, พ้น Recovering, นาฬิกาถอยหลัง) โดย "materialize" = `{ value: hpAt(t), anchorAt_ms: t }`
- เวลาที่แอปปิดนับรวม เพราะคิดจากนาฬิกาจริงของ host (R04) · เปิดแอปใหม่แล้วเห็น HP ที่ฟื้นแล้วทันทีจาก selector
- ตอนจบ run (ทุก `exitReason` · R03, H6, `regenStartsOnExit`): `player.hp = { value: HP ของ run ณ endedAt, anchorAt_ms: endedAt_ms, recovering: exitReason = death }` · `timeout` ใช้ `endedAt_ms = exitStartedAt + suspendedMax_s` (F04 5.4) จึงฟื้นตั้งแต่เวลานั้น ไม่ใช่ตั้งแต่เปิดแอปใหม่ (H-E2) · `clock_invalid` ใช้ `anchorAt_ms = min(endedAt_ms, now_ms)` เพราะ `endedAt_ms` อาจอยู่หลัง `now_ms` ที่ถอยไปแล้ว
- ระหว่าง run ไม่มีการฟื้นเอง (R03) · heal ของ Support อยู่ใน `run.hp` (3.6)
- ตอน confirm: `hpAtEntry = hpAt(player.hp, startedAt_ms)` แล้ว materialize

### 6.2 Recovering และการฟื้นหลังตาย (R25, H4)

- `recovering = true` ตั้งแต่จบ run ด้วย `death` · ใช้อัตราเดียวกับ 6.1 (A-P1-F03-T06-15a ACCEPT ในคำตัดสิน 10 ของ spec) · ที่ VIT 0 จาก 0 ถึง `deathRecoveryTo_pct` ใช้ `deathRecoveryTo_pct / outsideDungeonRegen_pctMaxHpPerMin` นาที (50 / 1.6667 = 29.9994 นาที ≈ `deathRecoveryDuration_s` 1,800) · engine ไม่อ่าน `deathRecoveryDuration_s` ในการคำนวณ ใช้ตรวจความสอดคล้องตอนสร้าง params เท่านั้น (3.7 · ต่างกันเกิน 1 วินาที = throw) · เหตุผล: สองค่าบอกอัตราเดียวกัน ถ้าใช้ทั้งคู่จะมีสองอัตราที่ขัดกันเมื่อ systems ปรับค่าเดียว
- พ้น Recovering เมื่อ `hpAt(t) ≥ maxHp × deathRecoveryTo_pct / 100` หรือใช้ยาชุบ · engine ตรวจทุก step ที่ไม่มี run · เวลาที่ข้ามเส้นคำนวณได้แบบปิด (`anchorAt + (line − value) / rate`) จึง event `player_recovered.at_ms` = เวลาข้ามจริง ไม่ใช่เวลาที่ step ถูกเรียก · materialize ที่เวลานั้น
- **เวลาที่เหลือถึงเส้น (`home.recoveringDetail` `{timeLeft}`, A-P2-F05-T09-2 · P2-X16): ยืนยันว่าได้** · จุดยึดทำให้คิดแบบปิดได้ที่ `now_ms` ใดก็ได้โดยไม่มี timer และถูกต้องแม้เปิดแอปกลับมากลางทาง (R04):
  ```
  line_hp            = maxHp × deathRecoveryTo_pct / 100
  recoveredAt_ms     = anchorAt_ms + max(0, line_hp − value) / regenRate_perMs      // สูตรเดียวกับ player_recovered.at_ms
  recoveryTimeLeft_ms = recovering ? max(0, recoveredAt_ms − max(now_ms, anchorAt_ms)) : null
  ```
  selector: เพิ่ม field `recoveryTimeLeft_ms: number | null` และ `recoveryTo_pct` (= `deathRecoveryTo_pct` จาก params ให้ `{recoverPct}` ไม่ต้องอ่าน config แยก) ใน `selectPlayerView` (13.4) · ไม่มี selector แยก · `regenRate_perMs` ใช้ VIT ปัจจุบันของผู้เล่น (6.1) ซึ่งเปลี่ยนนอก run ไม่ได้ใน Phase 2 จึงไม่ต้อง materialize ใหม่ระหว่างนับ · ค่า `0` = ข้ามเส้นแล้วแต่ step ยังไม่ออก `player_recovered` → client ซ่อนบรรทัดนี้ (ไม่แสดง "0 นาที") · การแสดงผลปัดขึ้นเป็นนาทีด้วย `unit.minutes` (ผู้เล่นไม่เห็นเวลาน้อยกว่าจริง) · client นับถอยหลังด้วยการเรียก selector ใหม่ทุกครั้งที่ render ไม่ลบเวลาเอง · ค่านี้เป็นการแสดงผล ไม่มีผลต่อการเข้า run (R27) · ไม่ใช้ `run.death.waitRecoverDetail` ชั่วคราวตามทางสำรองของ A-P2-F05-T09-2
- Recovering ไม่บล็อกการเข้า run (R27) · เงื่อนไขเข้าคือ HP > 0 (6.3)

### 6.3 เงื่อนไขของ `confirm` ที่ F06 เพิ่ม (เสริมลำดับ tech note F04 7.4)

ตรวจหลังขั้น 2 (`run_active`) และก่อนขั้น 4 (`dungeon_closed`) ตามลำดับ

1. `player.classId = null` → `checkin_rejected` reason `no_class` (ทางปกติไม่เกิด เพราะ sheet เลือก class มาก่อนแผนที่ · fail closed)
2. `hpAt(player.hp, now_ms) ≤ 0` → reason `no_hp` (เกิดได้เฉพาะวินาทีที่ตายพอดี เพราะการฟื้นเริ่มทันที · R05 "HP > 0")

- ไม่มีเกณฑ์ HP ขั้นต่ำอื่น (R05, คำตัดสิน 6) · popup confirm แสดง HP จาก `selectPlayerView` และคำบอกเมื่อ HP ≤ `autoRetreatThreshold_pct` ขณะเปิด auto-retreat (ถ้อยคำของ narrative)
- `selectCheckInPreview` ใช้ลำดับเดียวกัน (F04 2.6) · reason ใหม่สองค่าต้องเพิ่มใน enum ของ telemetry `checkin_rejected` (handoff product-manager)

### 6.4 input `usePotion { itemId }` (R13, R26)

ตรวจตามลำดับ · ไม่ผ่าน = event `potion_use_rejected { itemId, reason }` ไม่มีผลข้างเคียง

1. `run ≠ null` → `run_active` (Phase 2 ไม่มีการใช้ยาเองระหว่าง run · R13, H-E17)
2. `itemId` ไม่ใช่ key ของ `balance.economy.potions` → `not_a_potion`
3. `player.inventory[itemId]` ไม่มีหรือ 0 → `none_in_inventory`
4. ยาชุบ (`reviveToHp_pct` มีค่า): ต้อง `recovering = true` ไม่งั้น `not_recovering` · ผล: materialize ที่ `now_ms` แล้ว `value := max(value, maxHp × reviveToHp_pct / 100)` · `recovering := false` · event `potion_used { revived: true }` (+ `player_recovered`)
5. ยา HP (`heal_pctMaxHp` มีค่า): `hpAt(now) ≥ maxHp` → `full_hp` · ไม่งั้น heal ตามสูตร R12 (`maxHp × heal_pctMaxHp × (1 + vitPotionEfficiency_pct × vit / 100) / 100` ไม่เกิน maxHp) · ถ้าข้ามเส้น Recovering ก็พ้น Recovering ด้วย
6. หักหนึ่งขวดจาก `player.inventory` (ลบ key เมื่อเหลือ 0)

- ยาที่ใช้ได้ทุกขวดมาจาก inventory ที่มาจากถุงของ run ที่จบแบบเก็บของ ซึ่งมาจาก tick ที่ผ่าน gate เท่านั้น (F05-R14, B-06) · ไม่มี input อื่นที่เพิ่มของใน inventory (หัวข้อ 7.3)

### 6.5 นาฬิกาถอยหลังและเดินหน้ากระโดด (R04, F04 4.4, D-094)

| กรณี | ผลต่อ HP |
| --- | --- |
| `clockCheck = held` (ถอยไม่เกิน `clockSkewTolerance_s`) | ใช้ `lastNow_ms` เดิม · HP ไม่เปลี่ยน |
| `clockCheck = invalid` และไม่มี run | materialize ที่ `lastNow_ms` (ค่าที่ผู้เล่นเห็นล่าสุด) แล้วตั้ง `anchorAt_ms := now_ms` · HP ไม่ลด เริ่มนับใหม่ที่เวลาปัจจุบัน (R04) |
| `clockCheck = invalid` และมี run | จบ `clock_invalid` ตาม F04 4.4 (ของเก็บครบ) · HP ของ run ณ `lastEventAt_ms` ย้ายไป `player` · `anchorAt_ms := now_ms` · ไม่มีการตีหลัง `lastEventAt_ms` |
| selector อ่านที่ `t < anchorAt_ms` (เช่น ก่อน step แรกหลังเปิดแอป) | คืน `value` (ไม่ลด · สูตร 6.1) |
| นาฬิกาเดินหน้ากระโดด | ตรวจไม่ได้ใน Phase 2 · HP ฟื้นเร็วขึ้นและ Recovering จบเร็วขึ้น · ยอมรับเพราะไม่ใช่รางวัล (spec R04, C1-1) · Phase 3 ใช้เวลา server |

## 7. Class, เลเวล, exp, แต้ม stat และ inventory

### 7.1 input `chooseClass { classId }` (R29, R30)

- ผ่านเมื่อ `player.classId = null` และ `run = null` และ `classId` เป็น key ของ `balance.classes.roles` · ผล: `classId` ถูกตั้ง · event `class_chosen`
- ไม่ผ่าน → `class_choice_rejected` (`already_chosen` \| `run_active` \| `unknown_class`) · Phase 2 ไม่มีทางเปลี่ยน class ใน engine · ทางเดียวคือลบข้อมูลในเครื่อง (R30)
- ไม่มีค่าตั้งต้นใน `createSession` (`classId: null`) · client ไม่เลือกให้ (R29)

### 7.2 เลเวลและ exp (F05-R11, R16, R33–R35, D-110)

- exp ต่อ tick และการขึ้นเลเวลเป็นของ `reward` / `session` (tech note F05 5 · `soloTickExp`, `addExp` ของ `tools/sim/src/loop.ts` · P2-F05-T08) · เอกสารนี้กำหนดเฉพาะผลต่อ HP: เลเวลใหม่มีผลกับ damage (ห่างเลเวล), P ของ buff ตัวเอง (Tanker ลด damage, Support heal, Magic โล่ tick ถัดไป) ตั้งแต่ความพยายามถัดไป
- exp เก็บไม่ปัด · ขึ้นหลายเลเวลในครั้งเดียวได้ · ถึง `maxLevel` แล้ว exp = 0 ไม่บวก (D-110 PROPOSED · ถ้า game-director ไม่ยืนยัน vector `addExp` และโค้ดเปลี่ยนพร้อมกัน ไม่กระทบสัญญา HP)
- `run_tick_granted.levelAfter > levelBefore` → client แสดงสัญญาณเลเวลขึ้นหนึ่งครั้ง ไม่มีปุ่มไปหน้า stat (R33, R42)
- แต้ม stat: `selectPlayerView.statPointsUnspent` มีไว้สำหรับ test และ F10 · Phase 2 ไม่มีจอใดอ่านค่านี้ (R34 · tech gate ค้นการใช้ใน `apps/client`)

### 7.3 inventory ในเครื่อง (B-06, F05-R14, R15)

`player.inventory` ถูกเขียนได้ **สามจุดเท่านั้น** ในโค้ดทั้งหมด · tech gate ค้นทุกการเขียน

1. จบ run ที่เก็บของ (`manual_exit`, `auto_retreat`, `timeout`, `clock_invalid`, `dungeon_closed`, `emergency_close`): บวกถุงของ run ทั้งถุง (F05 6)
2. ยาอัตโนมัติจากแหล่ง `inventory` ระหว่าง run: ลบหนึ่ง (3.5)
3. `usePotion` นอก run: ลบหนึ่ง (6.4)

- ไม่มีชุดยาตั้งต้น ของขวัญ onboarding หรือ input debug ที่เพิ่มของ (D-089) · `createSession` เริ่มด้วย `inventory: {}` · test ของ Mock ที่ต้องการยาในกระเป๋าได้ยาจากการเล่น trace ที่ผ่าน gate จริงเท่านั้น หรือสร้าง `SessionState` โดยตรงใน unit test ของ engine (ไม่ผ่าน client)
- อุปกรณ์ที่ drop (`equipWeapon` ฯลฯ) เข้า inventory เป็นจำนวนนับ ไม่มี tier และไม่มีการสวมใส่ใน Phase 2 (balance-model 17.2, R35)

## 8. Onboarding state และ key ใน `kw.p2.*` (R36, R44–R49, ADR 0003 C1-5)

### 8.1 key ทั้งหมดของ Phase 2 หลัง F06

| key | เจ้าของโค้ด | เนื้อหา | ไม่มี |
| --- | --- | --- | --- |
| `kw.p2.session` | engine (`toPersisted`) ผ่าน storage adapter | `SessionState` รวม `player` (class, เลเวล, exp, HP, auto-retreat, inventory, ธงขั้น onboarding ที่ engine รู้) | พิกัดของ run ที่จบแล้ว (F04 11) |
| `kw.p2.onboarding` | client (P2-F06-T09) | `{ schemaVersion: 1, introSeen: bool, ageGatePassed: bool, consentAnswered: bool, firstOpenAt_ms: number }` | ปีเกิด, ช่วงอายุ (R45) |
| `kw.p2.consent` | client | `{ schemaVersion: 1, location: 'granted' \| 'declined' \| 'withdrawn' }` | เวลาที่ให้ consent, ข้อความ |
| `kw.p2.interest` | client | `{ schemaVersion: 1, scope: 'district' \| 'province', areaId: string } \| null` (id จากรายการใน content) | พิกัด, ข้อความอิสระ (R53) |
| `kw.p2.account` | client (F10, P2-F10-T07) | `{ provider: 'google' \| 'apple' \| 'email', signedIn: bool }` ใน envelope v1 · เขียนหลังผ่าน age gate เท่านั้น · logout ปลด `signedIn` อย่างเดียว (tech note F10 2.1) | อีเมล, password, token, ข้อมูลจาก provider |
| `kw.p2.character` | client (F10, P2-F10-T07) | `{ name: string, storyDone: bool }` ใน envelope v1 (tech note F10 2.2) | class (อยู่ใน `player`), ข้อความอื่นที่พิมพ์ |
| `kw.p2.settings.<name>` | client | ค่าตั้งของ UI ที่ไม่มีผลต่อเกม **หนึ่ง key ต่อหนึ่งค่า** (ไม่ใช่ object รวม) · Phase 2: `kw.p2.settings.pocketScreenEnabled` (`ui/settings-walking-safety.ts`), `kw.p2.settings.pocketWakeHintShown`, `kw.p2.settings.screenLockNoticeShown` (`ui/pocket-screen.ts`) · ดู 8.5 | auto-retreat (อยู่ใน `player` เพราะมีผลต่อ hit) |
| `kw.p2.telemetry` | client (มีแล้ว) | ring buffer (F04 12.2) | พิกัด |

- **settings แยก key (P2-H45):** เก็บแยกทีละ key เพื่อให้แต่ละโมดูล UI อ่าน/เขียนค่าของตัวเองโดยไม่ต้อง merge object ร่วม และค่าที่อ่านไม่ได้เสียแค่ค่าเดียว · ชื่อ key เป็น identifier (literal ได้) แต่ต้องขึ้นต้นด้วย `config/app/privacy.json#localData.storageKeyPrefix` และมี unit test กัน drift (F06-TG-04) · key ใหม่ใต้ `kw.p2.settings.` ไม่ต้องแก้ตารางนี้ถ้าไม่มีผลต่อเกม แต่ต้องอยู่ใน test ของ prefix
- **`runClientStats` อยู่ในหน่วยความจำเท่านั้น (P2-H45):** ไม่มี key `kw.p2.runClientStats` · ตัวสะสม `{ pageHiddenMs, wakeLockHeldMs, wakeLockSupported }` อยู่ใน `WakeLockController` และถูกอ่านผ่าน `getRunClientStats()` ตอน engine ส่ง `dungeon_exited` เท่านั้น (`f04-app.ts`, `session/engine.ts`) · ผลที่ยอมรับ: reload ระหว่าง run ทำให้ยอดสะสมเริ่มนับใหม่จากตอนเปิดแอป จึงนับต่ำกว่าจริง (ทิศเดียวกับ "เวลาที่แอปปิดนับเป็นไม่ได้ถือ" ของ 10.2) · เป็น telemetry ของ UX ไม่มีผลต่อรางวัล จึงไม่คุ้มกับ key เพิ่มและการเขียน storage ทุกครั้งที่ wake lock เปลี่ยน · ถ้า product ต้องการค่าที่รอด reload ให้ส่ง handoff ถึง tech-lead ก่อนเพิ่ม key
- `firstOpenAt_ms` ใช้คำนวณ `minutes_since_first_open_bucket` ของ `onboarding_first_reward_granted` เท่านั้น ไม่ export เป็นเวลาจริง (C2-4)
- ผู้ที่อายุต่ำกว่าเกณฑ์: ไม่เขียน key ใดเลย (R46) · เปิดแอปครั้งถัดไปเจอ age gate อีก
- ทุก key อ่านผ่าน envelope ของ `apps/client/src/storage/local-store.ts` · อ่านไม่ได้ = ใช้ค่าเริ่ม (ขั้นนั้นยังไม่ผ่าน) ไม่ crash

### 8.2 ขั้นของ onboarding และแหล่งความจริงเดียว

**แทนที่โดย tech note F10 หัวข้อ 3 (P2-F10-T07, D-149).** ลำดับใหม่ `intro → login → age → consent → permission → character → story → map → first_run → first_reward → done` · ตารางขั้น → ธง → แหล่งความจริงเดียวอยู่ที่ `docs/tech/F10-account-shell.md` 3.1 · ขั้น `class` เดิมรวมเข้า `character` และ `mapAcknowledged` ถูกลบ · สิ่งที่ยังเป็นของหัวข้อนี้:

- ขั้นที่ engine รู้อยู่แล้ว (`player.classId`, `firstRunEnteredAt_ms`, `lifetimeTicksGranted`) ไม่ถูกเก็บซ้ำใน `kw.p2.onboarding` · ถ้ามีสองแหล่งจะขัดกันได้เมื่อ storage เขียนสำเร็จไม่พร้อมกัน
- `permission` ไม่มีธง: ถามเบราว์เซอร์ตรงผ่าน LocationProvider (`navigator.permissions` ถ้ามี) เมื่อ `consent.location = granted` · ปฏิเสธ consent ข้าม `permission` ไป `character` ที่สถานะไม่รู้ตำแหน่ง (F10-R03)
- `O-nearest` / `O-home` / `O-first-run` / `O-done` คำนวณจากสถานะที่บ้าน (หัวข้อ 9) + ธงของ engine ไม่มี state ของตัวเอง
- บรรทัด tutorial ของ run แสดงเมื่อ `lifetimeTicksGranted = 0` (R38) · onboarding จบเมื่อ `lifetimeTicksGranted > 0` แม้ run นั้นจบด้วย `death` ภายหลัง (R40)

### 8.3 ลบข้อมูลในเครื่อง (R49, H-E23, C2-6)

- ขอบเขต: ทุก key ที่ขึ้นต้น `app.privacy.localData.storageKeyPrefix` (`kw.p2.`) ตาม `clearScope = allKeysWithPrefix` · ผลคือ class, HP, inventory, onboarding, สรุป run, ความสนใจ, consent, telemetry, account และชื่อตัวละคร (F10-R44) หายทั้งหมด แล้วเขียน `local_data_cleared` เป็นบรรทัดแรกของ ring buffer ใหม่ และโหลดหน้าใหม่เข้า onboarding (F04 10.4 · มีแล้วใน `clear-local-data.ts`)
- **ปิดระหว่าง run:** session เพิ่ม selector `selectCanClearLocalData(state) = state.run === null` · ปุ่มในตั้งค่า disabled เมื่อ `false` · ฟังก์ชัน `clearLocalData` ของ client ต้องรับผลของ selector นี้และปฏิเสธเมื่อมี run (กันการเรียกจากที่อื่น) · `lastSummary` ที่ยังไม่ปิดไม่บล็อก
- หลังลบ: `createSession` ใหม่ → `classId: null`, HP เต็ม, auto-retreat ตามค่าเริ่ม (R22), inventory ว่าง
- การถอน consent ตำแหน่ง (R48) ไม่ใช่การลบข้อมูล และ **ไม่รอ run จบ** ต่างจากปุ่มลบข้อมูล · ลำดับและผลอยู่ใน 8.4 (แทนข้อความเดิมของฉบับแรกที่ให้ run ไหลเป็น Grace → Suspended → `timeout` ซึ่ง B-06 / D-116 ยกเลิกแล้ว)

### 8.4 ถอน consent ตำแหน่ง (R48 ข้อ 1–3, H-E25, B-06, J-P2-T30-1, D-116 · P2-X16)

**คำตัดสิน exit_reason: ใช้ `manual_exit` เดิม ไม่เพิ่มค่าใหม่** · เหตุผล: (1) spec R48 ข้อ 3 บังคับว่าถ้าแยกค่าต้องจ่ายเท่า `manual_exit` ทุกประการ ทางที่พิสูจน์ได้ง่ายที่สุดคือใช้ input และเส้นทางโค้ดเดียวกัน (`sessionStep({ type: 'exit' })` → `endRun(..., 'manual_exit', now_ms)`) จึงไม่มีสาขาใหม่ใน `reward` / `hp` ให้ tech gate ตรวจ · (2) ไม่ต้องแก้ enum ใน `RunSummary.exitReason`, F04-R17, ตาราง F05 6 และ `product/telemetry-events.md` ซึ่ง F04-R17 ฉบับปัจจุบันเขียนไว้แล้วว่า `manual_exit` รวมการถอน consent · (3) engine ไม่ต้องรู้เรื่อง consent (consent เป็นสถานะของ client ตาม 8.1)

ไม่มี input ใหม่ชื่อ `withdrawConsent` ใน `SessionInput` · client เป็นผู้ประกอบลำดับด้านล่างใน call site เดียว (`apps/client/src/privacy/withdraw-consent.ts` ที่เสนอ · ชื่อไฟล์เลือกได้ใน build ของ F06 client)

ลำดับเมื่อผู้เล่นกดยืนยันการถอน (ทำใน task เดียวของ event loop ไม่มี `await` คั่นก่อนข้อ 3)

1. ตั้งธงในหน่วยความจำ `locationWithdrawn = true` ก่อนทุกอย่าง · ตัวรับ sample ของ LocationProvider ตรวจธงนี้แล้ว **ทิ้ง** sample ที่มาหลังจากนี้ (ไม่ส่งเข้า `sessionStep`, ไม่เก็บ, ไม่ส่ง HUD) · กันกรณี callback ของ `watchPosition` ที่ค้างในคิวมาถึงระหว่างข้อ 2–4
2. ถ้า `state.run !== null`: `dispatch({ type: 'exit' }, now_ms)` ครั้งเดียว · ผลคือ run จบ `manual_exit` ที่ `now_ms` ไม่ว่าสถานะเป็น Active, Grace หรือ Suspended · ของใน run เก็บครบตาม F05-R21 · หน้าต่างที่ค้างไม่จ่ายตามกติกาเดียวกับกดออกเอง · HP ย้ายไป `player` ตาม 6.1 · `RunSummary` ถูกสร้าง · ไม่เรียก `tick` ก่อน exit (ไม่มีเหตุให้เดินเส้นเวลาเพิ่ม · ผลเท่ากับกดปุ่มออก ณ วินาทีนั้น)
3. `LocationProvider.stop()` (ยกเลิก `watchPosition` / Mock) · ปล่อย wake lock ของ run (D-063) · ล้าง sample ย้อนหลังของ HUD ในหน่วยความจำ (`hudSamplesMemoryOnly`)
4. ล้างพิกัดที่เหลือใน state: `state = purgeLocationData(state)` (ฟังก์ชัน pure ใหม่ของ `session` · คืน state ที่ `latestSample = null`, `pre` = ค่าเริ่ม, และไม่มี sample ใดตามเพดาน tech note F04 11 · ไม่แตะ `player`, `lastSummary`, `clock.lastNow_ms`) แล้ว persist `kw.p2.session` · จากนั้นเขียน `kw.p2.consent = { schemaVersion: 1, location: 'withdrawn' }` · เหตุผล: `deleteOnRunEnd` ของ F04 11.1 ล้างเฉพาะ field ของ run ส่วน `latestSample` ระดับ session ยังค้างได้ถึง `maxAge_s` · การถอนต้องไม่เหลือพิกัดในเครื่อง (NN-7)
5. ไปหน้าสรุป run (`run.summary.exited` ตาม flow F06 G1) ถ้ามี run · ปิดสรุปแล้วจอที่บ้านเป็น `unknown` (9.2 ข้อ 1) · ไม่มี run = ไปจอที่บ้าน `unknown` ตรง (R48 ข้อ 1)
6. หลังจากนี้แอปไม่เรียก `getCurrentPosition` / `watchPosition` / `navigator.permissions.query` เอง · ทางเดียวที่กลับมาขอคือผู้เล่นกดปุ่มให้ consent ใหม่ในตั้งค่า (R48 "ไม่ถามซ้ำเอง") · `confirm` ถูกปฏิเสธที่ UI ก่อนถึง engine เพราะไม่มีตำแหน่ง (engine เองก็ปฏิเสธด้วย approach ที่ไม่ครบ)

- popup ยืนยันตอนมี run ใช้ `privacy.withdrawDuringRunNote` · ตอนไม่มี run ไม่แสดงบรรทัดนี้ · ปุ่มถอน **ไม่ disabled ระหว่าง run** (ต่างจาก `selectCanClearLocalData` ใน 8.3)
- ไม่มีทางใดที่การถอนไหลเป็น Grace / Suspended / `timeout`: ข้อ 1 ตัด sample ทิ้งก่อน และข้อ 2 จบ run ใน step เดียวกันก่อนที่ `processTimeline` จะมีโอกาสตัดสินช่องว่าง · กรณีเดียวที่ผลไม่ใช่ `manual_exit` คือ run จบไปแล้วก่อนกดถอน (เช่น `timeout` ที่ catch-up `tick` ตัดสินไปแล้ว) ซึ่งเป็นข้อเท็จจริงก่อนการถอน ไม่ใช่ผลของการถอน
- reload ระหว่างข้อ 2–4 (แทบเป็นไปไม่ได้เพราะไม่มี `await`): ถ้า `session` ถูกเขียนแล้วแต่ `consent` ยังไม่เป็น `withdrawn` ตอนเปิดใหม่ run จบแล้ว ผู้เล่นเห็นสรุป แล้ว consent ยัง `granted` · ผู้เล่นถอนใหม่ได้ · ไม่มีรางวัลเกินเพราะ run จบแล้ว · ลำดับเขียนจึงเป็น session ก่อน consent โดยตั้งใจ (ถ้ากลับกัน reload จะเหลือ run ที่ไม่มีตำแหน่งแล้วไหลเป็น `timeout` ซึ่ง R48 ห้าม)

**ผลต่อ telemetry (ถึง product-manager):** `dungeon_exited.exit_reason = manual_exit` สำหรับทั้งการกดออกเองและการถอน consent · แยกสองกรณีจาก `dungeon_exited` อย่างเดียวไม่ได้ · ถ้า PM ต้องการแยก ข้อเสนอของ tech-lead คือ event ของ client `location_consent_withdrawn { during_run: bool }` ยิงในข้อ 4 (ก่อน `dungeon_exited` ใน ring buffer ไม่ได้ เพราะ exit เกิดในข้อ 2 · ลำดับที่ได้คือ `dungeon_exited` → `location_consent_withdrawn` ที่ `at_ms` เดียวกัน · mapper จับคู่ได้ด้วยเวลา) · ไม่มีพิกัด ไม่มีข้อมูลตัวตน · PM ประกาศชื่อใน `product/telemetry-events.md` ก่อน client จึงจะยิง (ตามกติกา 10.1) · ถ้าไม่ประกาศ อัตรา `manual_exit` ของ Phase 2 รวมการถอนไว้ ซึ่งคาดว่าน้อยมากใน playtest

### 8.5 จอพกกระเป๋า: key และท่าปัดขึ้นค้างเพื่อออก (P2-F06-T14 · D-134 · P2-H45)

- โมดูล: `apps/client/src/ui/pocket-screen.ts` (DOM glue + ฟังก์ชัน pure `shouldTriggerPocketExit`) · ไม่มีผลต่อรางวัล ไม่แตะ engine นอกจากอ่าน selector ที่มีอยู่
- key: `kw.p2.settings.pocketScreenEnabled`, `kw.p2.settings.pocketWakeHintShown`, `kw.p2.settings.screenLockNoticeShown` (แยก key ตาม 8.1) · ลบพร้อม `clearLocalData`
- ท่าออก (design gate A 4.4 กฎข้อ 2, components.md 12.1): ต้องครบทั้งสองเงื่อนไข ข้อใดข้อเดียวไม่ออก
  1. ยังกดค้างอยู่เมื่อครบ `config/app/client.json#pocketScreen.swipeUpHoldMinDuration_ms` นับจาก `pointerdown`
  2. นิ้วเลื่อนขึ้นอย่างน้อย `threshold_px = window.innerHeight × pocketScreen.swipeUpMinDistance_ratio`
- **D-134 (ACCEPTED, P2-F06-T20 6.1):** ระยะปัดเก็บเป็น **สัดส่วนของความสูง viewport** (`_ratio`, config-lint ตรวจช่วง 0–1) ไม่ใช่ px คงที่ · ไม่เพิ่มหน่วย `_px` ใน config-lint
- **เงื่อนไขของ D-134:** แปลงเป็น px **ที่ `pointerdown` ทุกครั้ง** ไม่ใช่ครั้งเดียวตอน mount · เหตุผล: mount ตอนแนวนอนแล้วหมุนจอ (หรือแถบเบราว์เซอร์ยุบ/ขยาย) เกณฑ์ที่แคชไว้จะผิดสัดส่วน · ค่าที่ได้ตอน `pointerdown` ใช้ตลอดท่านั้น (ไม่คำนวณใหม่ระหว่างปัด) · โค้ด ณ `3b7e78c` ยังแปลงตอน mount (`ui/pocket-screen.ts:151-154`) → gameplay-programmer แก้ใน P2-X41 หรือครั้งถัดไปที่แตะไฟล์ (ไม่ blocking)
- test: unit ของ `shouldTriggerPocketExit` (ค้างไม่ปัด / ปัดแล้วปล่อยก่อนเวลา / ครบทั้งคู่) · unit ที่เปลี่ยน `innerHeight` ระหว่างสอง gesture แล้วเกณฑ์ของ gesture ที่สองเปลี่ยนตาม

## 9. สถานะที่บ้าน: ไกล / นอกพื้นที่ / นอกย่านเปิดตัว / ไม่รู้ตำแหน่ง (R50–R55, D-064, D-073)

แสดงผลเท่านั้น ไม่ตัดสินรางวัล · คำนวณใน client ได้ (ADR 0003 3.3 ข้อ 2, `unlocks.home._note`) · โมดูลเสนอ `apps/client/src/home/home-state.ts` เป็นฟังก์ชัน pure ที่ test ได้โดยไม่มี DOM

### 9.1 input

| input | ที่มา |
| --- | --- |
| ตำแหน่งล่าสุด + accuracy | `LocationSample` ล่าสุดของ LocationProvider (หน่วยความจำเท่านั้น ไม่ลง storage) |
| consent / permission | `kw.p2.consent`, สถานะ provider |
| mask พื้นที่เล่น | `balance.unlocks.home.outOfAreaMaskPath` (`data/map/playarea-mask.geojson`) · client โหลดเป็น asset ของ build ตาม path นี้ (ข้อมูลสาธารณะ ไม่ใช่ของผู้เล่น) |
| mask ย่านเปิดตัว | key ใหม่ที่เสนอ `balance.unlocks.home.launchAreaMaskPath` (สตริง path แบบเดียวกับ `outOfAreaMaskPath` ตาม P2-X06 · แทนชื่อ `seeLaunchAreaMask` ใน spec) · `null` = ยังไม่มี geometry → ใช้ R55 |
| dungeon | artifact (tech note F04 13) + `selectOpening(dungeonId, now_ms, params)` |
| เลเวลผู้เล่น | `selectPlayerView` |
| อยู่ใน onboarding หรือไม่ | `!selectPlayerView(...).firstRewardDone` (= `player.lifetimeTicksGranted = 0` · 8.2 · แหล่งเดียวกับขั้น `first_reward`) |

นิยาม **ครอบเลเวล**: `level_range.min ≤ level ≤ level_range.max` (ปลายทั้งสองรวม · `level_range` จาก artifact dungeon, `level` ณ ขณะประเมิน)

### 9.2 ลำดับการตัดสิน (ข้อแรกที่เข้าเงื่อนไขชนะ)

1. **ไม่รู้ตำแหน่ง** (`unknown`): `consent.location ≠ granted` หรือ permission ถูกปฏิเสธ หรือไม่มี fix หรือ accuracy แย่ตาม `balance.location.homeState.{maxAccuracy_m, sustainedPoorAccuracy_s}`
2. **นอกพื้นที่** (`out_of_area`): `!inPlayArea(pt, playAreaMask)` (geo · อยู่นอกรูของ mask · ไม่ใช่ระยะ D-064)
3. หา dungeon ที่ **เปิดอยู่** ณ `now_ms`: ระยะ `d = pointInPolygon(pt, g) ? 0 : boundaryDistance_m(pt, g)` (ระยะเส้นตรงถึงขอบ polygon ก่อนปัด · F04-R34, R35) · **ชุดที่ใช้ตัดสินข้อ 4–5**: ระหว่าง onboarding (`lifetimeTicksGranted = 0`) = เฉพาะ dungeon ที่ครอบเลเวล (R37) · หลังจบ onboarding = dungeon ทั้งหมด (R50 ตามเดิม)
4. **ไกล** (`far`): ไม่มี dungeon เปิดในชุดของข้อ 3 ที่ `d ≤ farDungeonThreshold_m`
   - หลังจบ onboarding: ย่อย `temporarilyClosed` เมื่อมี dungeon ในเกณฑ์แต่ปิดทั้งหมด (แสดงเวลาเปิดถัดไป · H-E21) · ระยะ ทิศ และปุ่มนำทางชี้ dungeon เปิดที่ใกล้สุด (R52 ข้อ 1)
   - หลังจบ onboarding และ **ไม่มี dungeon ใดเปิดเลย** (ทุกระยะ · A-P2-X27-1 · D-136 ACCEPTED): `temporarilyClosed` ที่ dungeon ใกล้สุด (ตาม `d` ของข้อ 3 โดยไม่กรองสถานะเปิด) · เวลาเปิดถัดไปที่แสดง เป้าของทิศ และปุ่มนำทางเป็นแห่งเดียวกันนี้ · ไม่ใช่ `far` เพราะ `far` ต้องชี้ dungeon ที่เปิดอยู่ (F04-R33) · สมมาตรกับกรณีเดียวกันระหว่าง onboarding ด้านล่าง (A-P2-X31-1) · สรุป: ไม่มีกรณีใดที่ `far` ชี้ไป dungeon ที่ปิด
   - caller ของ `home-state.ts` resolve `selectOpening` (จาก `@keep-walking/shared/session` ทางเดียว · ADR 0003 3.3) และ geometry ของ dungeon ก่อนเรียก · `home-state.ts` ไม่รู้รูปของ `SessionParams` และไม่โหลด asset (P2-F06-T20 6.3)
   - ระหว่าง onboarding (R37 ข้อ 1–2): ไม่มี dungeon ที่ครอบเลเวลเปิดอยู่เลย (ทุกระยะ) → `temporarilyClosed` แสดงเวลาเปิดถัดไปของแห่งที่ครอบเลเวล ไม่มีการ์ดแนะนำ (R37 ข้อ 2) · เวลาที่แสดง = เวลาเปิดถัดไปของแห่งที่ครอบเลเวลที่ใกล้สุด (ทางเดียวกับทิศและปุ่มนำทาง · A-P2-X31-1) · ไม่มี dungeon ใดครอบเลเวลเลยใน artifact = `temporarilyClosed` ที่ไม่มีเวลาและไม่มีเป้า (บั๊กของข้อมูล ไม่ใช่สถานะของเกม · build dungeon ควรตรวจว่าเลเวล 1 ถูกครอบ) · มีแห่งที่ครอบเลเวลเปิดอยู่แต่นอกเกณฑ์ → `far` ที่ระยะ ทิศ และปุ่มนำทางชี้ dungeon **ที่ครอบเลเวลและเปิดอยู่** ใกล้สุด ไม่ใช่ dungeon ใกล้สุดทั่วไป (R37 ข้อ 1, H-E26) · dungeon เปิดที่ไม่ครอบเลเวลภายในเกณฑ์ไม่ทำให้เป็น `near`
   - **นอกย่านเปิดตัว** (`outside_launch_district`): เป็น `far` และ `launchAreaMaskPath ≠ null` และ `!pointInPolygon(pt, launchMask)` · ถ้า `launchAreaMaskPath = null` ทุกคนที่เป็น `far` (ไม่ใช่ `temporarilyClosed`) เห็นการลงทะเบียนรายเขต (R55, A-P2-F06-T02-1)
5. **ใกล้** (`near`): มี dungeon เปิดในชุดของข้อ 3 ภายในเกณฑ์ · รอยแยกที่แนะนำ:
   - ระหว่าง onboarding: dungeon ใกล้สุดที่ **เปิดอยู่ และ** ครอบเลเวล ภายในเกณฑ์ · ต้องครบทั้งสองเงื่อนไข **ไม่มีทางสำรอง** ไป dungeon ที่ไม่ครอบเลเวล (F06-R37, K-11, D-116, F04-R33)
   - หลังจบ onboarding: dungeon เปิดที่ใกล้สุดภายในเกณฑ์ที่ครอบเลเวลก่อน · ไม่มีก็ใช้ dungeon เปิดที่ใกล้สุดภายในเกณฑ์ (F04-R33 "ก่อน" · ไม่ใช่ R37)
   - ทั้งสองช่วงห้ามแนะนำ dungeon ที่ปิด (F04-R33, D-089) · dungeon ที่ไม่ถูกแนะนำยังแสดงบนแผนที่พร้อมช่วงเลเวลจริง และเข้าได้ตาม R05, F04-R32 (ไม่ซ่อน แค่ไม่แนะนำ · R37 ข้อ 3) · `home-state.ts` คืนแค่ id ของแห่งที่แนะนำ ไม่กรองรายการบนแผนที่
   - onboarding ค้างที่ `O-home` จนกว่าข้อ 5 จะเป็นจริงด้วยชุดของ onboarding (R37 ข้อ 3) · การเปลี่ยนชุดเกิดเองเมื่อ `lifetimeTicksGranted > 0` ไม่มีธงแยก

- ประเมินเมื่อเปิดแอป และเมื่อตำแหน่งขยับเกิน `reevaluateDistance_m` จากจุดที่ประเมินครั้งก่อน (`haversine_m`) และเมื่อ `selectOpening` ของ dungeon ในเกณฑ์เปลี่ยน · จุดที่ประเมินครั้งก่อนอยู่ในหน่วยความจำเท่านั้น
- ระยะที่แสดง = `ceil(d / step_m) × step_m` ตาม `distanceDisplaySteps_m` (F04-R34 · ฟังก์ชัน `displayDistance` ของ P2-F04-T25) · ทิศเป็นลูกศรเท่านั้น ไม่วาดเส้น (F04-R36)
- dungeon เยอะ: ตัดด้วย `bbox` ก่อน `boundaryDistance_m` · จำนวน dungeon Phase 2 น้อย ไม่ต้องมี spatial index
- telemetry: `onboarding_empty_screen_shown` / `_abandoned` ด้วย `reason` = `far` \| `out_of_area` \| `outside_launch_district` (ไม่มี `unknown` และไม่มี `temporarilyClosed` ตามเอกสาร PM) · `interest_registered_outside_area` ด้วย `scope` + `area_name` จากรายการ · ไม่มีพิกัดใน property ใด
- การลงทะเบียนความสนใจเก็บ `kw.p2.interest` เท่านั้น (8.1) · ไม่มีจำนวนลงทะเบียนบนจอ (R56, R57)

## 10. Telemetry ของ F06 และคำตอบถึง product-manager

### 10.1 ตารางแปลง (mapper ของ `apps/client/src/telemetry/` · ชื่อตาม `product/telemetry-events.md`)

| engine event / เหตุใน client | telemetry | property ที่ mapper ใส่ |
| --- | --- | --- |
| `run_hp_low` | `run_hp_low` | `dungeon_id`, `class` |
| `run_auto_retreat` | `run_auto_retreat` | `dungeon_id`, `class`, `minutes_since_run_start_bucket` จาก `sinceStart_ms` (เวลาจริงนับจาก confirm ตามถ้อยคำของเอกสาร PM · รวม Grace) |
| `run_death` | `run_death` | `dungeon_id`, `class` · ไม่ส่งรายการของที่หาย |
| `run_potion_auto_used` | `run_potion_auto_used` | `dungeon_id`, `item_id` (ไม่ส่ง `source`) |
| `auto_retreat_setting_changed` | `auto_retreat_setting_changed` | `enabled` |
| `run_tick_granted` ที่ `firstEver = true` | `onboarding_first_reward_granted` (คู่กับ `run_tick_granted` ตัวเดิม) | `dungeon_id`, `minutes_since_first_open_bucket` (จาก `firstOpenAt_ms`), `class` |
| `run_tick_denied` | `run_tick_denied` | `dungeon_id`, `class`, `partial` |
| `class_chosen` | `onboarding_funnel_step` `step = class_selected` | `class_selected` |
| จอ onboarding ของ client | `onboarding_funnel_step` ขั้นอื่น | ตามเอกสาร PM (client ยิงเอง ไม่ผ่าน engine) |
| `run_hit`, `potion_used`, `potion_use_rejected`, `class_choice_rejected`, `player_recovered` | ไม่มี | สำหรับ UI เท่านั้น · ถ้า PM ต้องการวัดการใช้ยานอก run ให้ประกาศชื่อก่อน mapper จะเพิ่ม |

- `class` ทุก event อ่านจาก `classId` ใน event ของ engine (หรือ `selectPlayerView` สำหรับ event ของ client) · ไม่มีพิกัด ไม่มีค่า HP ต่อเนื่อง
- `dungeon_exited` เพิ่ม `class` จาก `RunSummary.classId` · `partial_tick_applied` จาก `RunSummary.partialTick?.granted`

### 10.2 คำตอบ

- **A-P2-F04-T17-9 — ยืนยัน:** engine event `run_tick_denied` มี field `partial` (bool) ทุกครั้ง · `false` สำหรับหน้าต่างปกติ (tech note F05 5 ข้อ 2) · `true` สำหรับหน้าต่างที่ค้างตอน `dungeon_closed` / `emergency_close` ที่ไม่ผ่านเกณฑ์ย่อ หรือ `e < partialTickMinElapsed_s` (tech note F05 6) · ตาราง 2.5 ของ tech note F04 จะแก้ให้ตรงในงานถัดไปของ tech-lead (เอกสารนี้เป็นสัญญาปัจจุบัน) · หมายเหตุ: หน้าต่างที่ค้างแต่ `e < partialTickMinElapsed_s` ตาม F05 "ไม่จ่าย" จะส่ง `run_tick_denied { partial: true }` หนึ่งครั้งเพื่อให้ mapper นับได้ครบ (หน้าต่างที่ค้างของเหตุจบอื่นไม่มี event)
- **Q-T17-3 — ใช้เวลาที่ถืออยู่จริง:** `wake_lock_engaged_share_bucket` = `wakeLockHeld_ms / (endedAt_ms − startedAt_ms)` ของ run · `wakeLockHeld_ms` นับจาก promise ของ `navigator.wakeLock.request('screen')` resolve จนถึง event `release` ของ `WakeLockSentinel` (รวมกรณีเบราว์เซอร์ปล่อยเองตอน tab hidden) · ขอใหม่ตอนกลับ visible ตาม D-063 แล้วนับต่อ · เวลาที่แอปปิดอยู่นับเป็นไม่ได้ถือ (ตัวหารคือเวลาจริงทั้ง run) · ใช้เวลา host เดียวกับ `now_ms` (Mock ใช้ game clock ให้ผลเร่งได้) · bucket: `0` = 0 พอดี, `0-25` = (0, 25], `25-75` = (25, 75], `75-100` = (75, 100] · `null` เมื่อไม่มี `navigator.wakeLock` · สะสมในหน่วยความจำของ `WakeLockController` เท่านั้น ไม่รอดการ reload ระหว่าง run (8.1 · P2-H45) · `page_hidden_total_s_bucket` ใช้ตัวสะสมเดียวกัน (hidden → visible ตาม `visibilitychange`) · เหตุผล: เวลาที่ "ขอสำเร็จ" บอกไม่ได้ว่าจอดับจริงหรือไม่ ซึ่งเป็นคำถามของ D-063

## 11. คำตอบถึง backend-programmer: `PresenceStrategy.presence()` (A-P2-F04-T20-1)

- **ยืนยันการอ่าน:** `presence()` เป็นตัวจำแนกขณะเดียว (instantaneous) ไม่มีสถานะ คืน `inside` / `outside` / `unknown` จาก sample ล่าสุด ใช้กับการแสดงผลเท่านั้น (เช่น popup T1) · สถานะ in/out ที่ยืนยันแล้วของ run state machine มาจาก `presenceStep` (hysteresis + backdating, tech note F04 5.2) และ `runTimeline` / `runTimers` เท่านั้น · โค้ดปัจจุบันใน `packages/shared/src/run/check-in.ts` ตรงกับคำอ่านนี้แล้ว
- ข้อความ ADR 0003 หัวข้อ 7 ("inside / outside สำหรับ run state machine (มี hysteresis ที่ขอบ)") ล้าสมัยตั้งแต่ D-103 / D-104 · tech-lead จะแก้ถ้อยคำ ADR ในงานถัดไป (ไม่อยู่ใน Writes ของงานนี้) · ระหว่างนั้นเอกสารนี้และ tech note F04 5.2 เป็นสัญญา
- ผลต่อ HP engine: นาฬิกาการตีอ่าน `ActiveClock` ที่มาจาก `presenceStep` + speed lock ไม่เรียก `presence()` เลย · เมื่อ `entry_exit` ถูกทำจริง (หลัง v1) strategy ต้องมี step ของตัวเองสำหรับ state machine ซึ่งเป็นการแก้ ADR ครั้งนั้น

## 12. Failure modes

| # | สถานการณ์ | ตรวจพบอย่างไร | ผล | อ้าง |
| --- | --- | --- | --- | --- |
| FH-01 | แอปถูกปิด / จอล็อก / tab hidden ขณะ HP ต่ำ (auto-retreat เปิดหรือปิด) | ไม่มี sample ที่ใช้ได้ > `maxSamplePairGap_s` | ออกแบบไม่มีหลักฐานที่ `t_last` · นาฬิกาหยุด → ไม่มีการตี ไม่ตายระหว่างปิด · กลับภายใน `suspendedMax_s` เล่นต่อด้วย HP เดิม · เกินนั้น `timeout` ของครบ ฟื้นตั้งแต่ `endedAt_ms` | H-E2, F04 FM-01, 6.1 |
| FH-02 | นาฬิกาถอยหลังระหว่าง run | `clockCheck = invalid` | `clock_invalid` ของครบ · HP ของ run ณ `lastEventAt_ms` ย้ายไป player · ฟื้นนับจาก `now_ms` | 6.5, H-E4 |
| FH-03 | นาฬิกาถอยหลังนอก run (รวมตั้งนาฬิกาย้อนตอนแอปปิด) | `clockCheck = invalid` ที่ step แรกหลัง `fromPersisted` | HP ไม่ลด · จุดยึดใหม่ที่ `now_ms` | 6.5, R04 |
| FH-04 | นาฬิกาเดินหน้ากระโดด | ตรวจไม่ได้ | ฟื้นเร็ว / Recovering จบเร็ว · ไม่มีรางวัลเพิ่ม · ความเสี่ยงที่ยอมรับใน Phase 2 | 6.5 |
| FH-05 | client สุ่ม `runSeed` ใหม่เพื่อเลือกผลการตี | ตรวจไม่ได้ใน Phase 2 | ยอมรับตาม C1-1 (ไม่ใช่รางวัลจริง) · Phase 3 seed อยู่ที่ server เท่านั้น | ADR 0003 6.1 |
| FH-06 | แก้ `kw.p2.session` เอง (HP, inventory, class) | `fromPersisted` ตรวจช่วงค่า (2.5) | ค่านอกช่วง = `corrupt` ทิ้งแล้วเริ่มใหม่ · ค่าในช่วงยอมรับ (ไม่ใช่รางวัลจริง) | 2.5 |
| FH-07 | config ผิด (distribution, mode, ลำดับเกณฑ์, ยาในลำดับไม่มี heal, revive ในลำดับ) | `hpParamsFromConfig` throw | client ไม่เริ่ม engine แสดงจอ error ของ dev (ไม่เดาค่า) | 3.7 |
| FH-08 | การตีถูกตัดสินช้า (รอ hysteresis ยืนยันกลับเข้า / ชุดออกที่ล้ม) | `at_ms` ของ event อยู่ในอดีต | client แสดง/สั่นเมื่อได้รับ ไม่เล่นย้อน · ช้าไม่เกินเวลายืนยัน · ผลเกมถูกต้อง | 3.3 |
| FH-09 | แจ้ง 30% ตอนมือถืออยู่ในกระเป๋า / iOS ไม่มี vibrate | `navigator.vibrate` ไม่มี / คืน false | เสียง + ภาพแทน (R15) · ห้ามแก้ด้วยการลดเกณฑ์หรือปิด auto-retreat · หน้า hidden ไม่มี sample จึงไม่มี hit ให้แจ้งอยู่แล้ว | R15, FH-01 |
| FH-10 | เรียก `usePotion` ซ้ำเร็ว / ระหว่าง run / HP เต็ม | ลำดับตรวจ 6.4 | `potion_use_rejected` ไม่หักยา | 6.4 |
| FH-11 | เปิด auto-retreat กลับขณะ HP ≤ 25% | — | ไม่ถอนจนกว่าจะโดนครั้งถัดไป | 5.2, H-E13 |
| FH-12 | กดลบข้อมูลในเครื่องระหว่าง run | `selectCanClearLocalData = false` | ปุ่ม disabled · ฟังก์ชันปฏิเสธ | 8.3, H-E23 |
| FH-13 | damage มหาศาลจากห่างเลเวล (1.25^gap) | — | พื้น HP 1 เมื่อเปิด auto-retreat → ถอยทันที (H-E6) · ปิด auto-retreat = ตายในครั้งเดียว | 3.4 |
| FH-14 | `level_range` ของ dungeon ขาด / ผิด | validator ของ `tools/dungeons` · engine throw ตอนสร้าง params | dungeon ไม่เข้า artifact / client ไม่เริ่ม | F04 13 |
| FH-15 | storage เต็ม | `setItem` throw | ตาม F04 10.4 (session อยู่ในหน่วยความจำ + ธง) · ตัวสะสมของ `dungeon_exited` (10.2) อยู่ในหน่วยความจำจึงไม่ถูกกระทบ (8.1 · P2-H45) | F04 10.4 |
| FH-16 | Mock ×10 / ×60 | — | τ มาจาก timestamp ของ sample จึงได้การตีชุดเดียวกับ ×1 | F04 17 |
| FH-17 | ถอน consent ระหว่าง run แล้ว callback ของ `watchPosition` ที่ค้างในคิวมาถึง | ธง `locationWithdrawn` (8.4 ข้อ 1) | sample ถูกทิ้งก่อนถึง `sessionStep` · ไม่มี approach / HUD / storage จาก sample นั้น | 8.4, R48 |
| FH-18 | เบราว์เซอร์ถอน permission เอง (ผู้เล่นปิดในตั้งค่าเบราว์เซอร์ ไม่ได้กดถอนในแอป) | `watchPosition` error `PERMISSION_DENIED` | ไม่ใช่การถอน consent ในแอป: run ไม่มีหลักฐานแล้วเดินตาม F04 (Grace → Suspended → `timeout` ของครบ, F04-R13) · จอที่บ้านเป็น `unknown` · `kw.p2.consent` ไม่เปลี่ยน · เหตุผล: R48 ข้อ 2 สงวนทางนั้นไว้ให้สัญญาณหายโดยไม่ได้ถอนในแอป · owner ยืนยันการอ่านนี้: game-director (A-P2-X16-2) | 8.4, F04-R13 |

## 13. Test hooks และ vector ที่ต้องผ่าน

### 13.1 vector ที่ P2-F06-T06 ต้องผ่าน (รันใน `pnpm test` · tolerance ตามไฟล์ 1e-6)

| ไฟล์ · `input.fn` | จำนวน | ผ่านที่ระดับ |
| --- | --- | --- |
| `damage.json` · `resolveHit` | 26 | `hp.resolveHit` (ถอดจาก `SKIP_FNS` ของ `vectors.test.ts`) |
| `damage.json` · `damagePerHit`, `survivalMinutes` และตัวอื่น | ครบตามเดิม | `formulas` (ผ่านอยู่แล้ว · ต้องไม่แดง) |
| `run-loop.json` · `hitAttempt` | 5 | `hp.hitAttempt` (ลำดับการดึงของ stream `hit`) |
| `run-loop.json` · `soloDamage` | 6 | `hp.soloHitDamage` ด้วยบริบทของผู้เล่นคนเดียว |
| `run-loop.json` · `runLoop` | 8 | (ก) ตัวประกอบระดับ `hp` ใน test (13.2 ก) ทั้ง 8 ข้อ ทุก field รวม `events` · (ข) ผ่าน `sessionStep` ด้วย harness Active (13.2 ข) อย่างน้อย seed 3 ทั้งเปิดและปิด auto-retreat, seed 11 (Magic + tick ไม่ผ่าน), seed 5 (Support), seed 20260926 ที่ HP 100 และ 70 (tick ก่อน hit), seed 9 (PN-2 ช่วง 1–35) |
| `run-loop.json` · `runLoopStats` | 10 | ตัวประกอบระดับ `hp` (Monte Carlo 200 seed · ผ่าน `sessionStep` ช้าเกินสำหรับ unit test) |
| survival D-020 (engine) | 2 test | ตัวประกอบระดับ `hp` ที่ build สมดุลเลเวล 25 (maxHp 3,112.5, DEF 286.25, Z 25, `tankerBuff_pct` 0, ไม่มียา, auto-retreat เปิด) seed 1–2,000: ทุก run ถอยที่ hit โดนครั้งที่ 24 พอดี (`hitsToThreshold`) และค่าเฉลี่ยเวลาถึง auto-retreat อยู่ใน ±2% ของ 44.444444 นาที · กรณีไม่มี Tanker (`null`) ค่าเฉลี่ยใน ±2% ของ 27.777778 นาที |

- vector `tick-reward.json` (`soloTickExp`, `addExp`, `lootTable`, `rollTickLoot`) เป็นของ P2-F05-T08 แต่ harness (ข) ต้องใช้จึงต้องผ่านก่อน
- ความคลาดของ survival Monte Carlo: ส่วนเบี่ยงเบนของค่าเฉลี่ย 2,000 run ราว 0.3% ของค่าเฉลี่ย · ±2% จึงไม่แดงเพราะสุ่ม · seed คงที่ ผลซ้ำได้ทุกเครื่อง

### 13.2 harness

- **(ก) ตัวประกอบระดับ `hp`** (`packages/shared/src/hp/*.test.ts`): ลูปเดียวกับ `runLoop` ที่เรียก `hitAttempt`, `soloHitDamage`, `resolveHit`, `supportHealThrough`, `onGrantedTick` ของ `src/hp` และ `rollTickLoot` / `addExp` / `soloTickExp` ของ `reward` / `formulas` · τ = เวลา run (Active ตลอด) · tick ผ่านยกเว้น `failedTicks` · อยู่ในไฟล์ test เท่านั้น ไม่ export เป็น API
- **(ข) harness Active ผ่าน `sessionStep`**: dungeon สังเคราะห์ใน `params.dungeons` เป็นสี่เหลี่ยม 140 × 140 ม. (`area_m2` < `drops.smallDungeon.smallDungeonMaxArea_m2` ให้ตัวคูณตรงกับตารางของ vector) `level_range` ตาม vector · ป้อน `confirm` หลัง approach ที่ผ่าน check-in · ป้อน sample ทุก `sampleCadence_s` วิ accuracy 5 ม. เดินเป็นวงกลมรัศมี 40 ม. รอบจุดกลางที่ 1.4 ม./วิ (ห่างขอบเกิน `edgeHysteresis_m` จึงไม่มีชุดออก) · หน้าต่างใน `failedTicks` ยืนนิ่ง · `params.config` แทนค่าได้ตาม `input.params` ของ vector (เช่น `intervalMin_s = intervalMax_s = 300`, `hitChance_pct = 100`) · เปรียบ `end_s` ด้วย `(endedAt_ms − startedAt_ms) / 1000` ที่ tolerance 1e-3 · ป้อน sample ต่อเลย `limit_s` หนึ่งตัวก่อน `exit` (หัวข้อ 4)

### 13.3 engine test ที่ต้องมี (ไม่ใช่ vector ของ systems · P2-F06-T06)

1. Grace 120 วิกลาง run: ไม่มีความพยายามในช่วงนั้น และเวลาจริงของความพยายามหลังจากนั้นเลื่อนไป 120 วิพอดี (R07, spec acceptance 1)
2. speed lock กลาง run: ไม่มีความพยายาม · ปลด lock แล้วนับต่อ (H-E3)
3. ชุดออกที่ล้ม (เลียบขอบ): ความพยายามในช่วงนั้นเกิดตามปกติ · ชุดออกที่ยืนยัน: ไม่เกิด (3.3)
4. **step invariance:** trace เดียวกัน ป้อน `tick` ทุก 1 วิ เทียบกับป้อนเฉพาะ sample แล้วปิดท้ายด้วย `tick` ที่ `now_ms` สุดท้ายเดียวกัน → `events` (ไม่นับ `sample_rejected`) เท่ากันทุกตัวทั้งชนิด ลำดับ และ `at_ms` · และเทียบกับการ `toPersisted` / `fromPersisted` กลางทาง · ต้องมีกรณีชุด lock ที่รอยืนยันซ้อนกับชุดออกที่ยืนยันก่อน แล้วชุด lock ล้ม (กรณีที่ต้องใช้กฎ "ตัดสินตามลำดับเวลา" ของ 3.3)
5. ปิดแอปขณะ HP ต่ำ (`toPersisted` → ข้าม 10 นาที → `fromPersisted` → `tick`): ไม่มีการตี · ข้าม 16 นาที: `timeout` ของครบ และ `hpAt` ที่ `now_ms` = HP ตอนจบ + การฟื้นนับจาก `endedAt_ms` (FH-01)
6. เปิด auto-retreat ตลอด: fuzz 500 seed ทุก class รวม PN-2 ไม่มี run ใดจบ `death` (R17)
7. `setAutoRetreat(false)` กลาง run แล้วตาย · `setAutoRetreat(true)` ขณะ HP ≤ 25% ไม่ถอนจนกว่าจะโดน (H-E12, H-E13)
8. ตาย: ถุงของ run หาย, exp อยู่, ยาใน inventory ที่ไม่ได้ใช้อยู่ครบ, `recovering = true`, `RunSummary.lost` ตรงกับถุง (R23, H-E14)
9. การฟื้น: จาก 0 ถึง `deathRecoveryTo_pct` ใช้ `deathRecoveryDuration_s` ± 1 วิ · `player_recovered.at_ms` ตรงเวลาข้าม · ฟื้นต่อจนเต็ม · ระหว่าง run ไม่ฟื้น (R25, R03)
10. นาฬิกาถอยหลังนอก run: HP ไม่ลด แล้วฟื้นต่อจาก `now_ms` ใหม่ (R04) · ระหว่าง run: `clock_invalid` ของครบ
11. `usePotion`: ทุก reason ของ 6.4 · ยาชุบนอก Recovering ถูกปฏิเสธ · ยาชุบพา HP ถึง `reviveToHp_pct` ทันที
12. Support heal ดัน HP ขึ้นเหนือ 30% แล้วโดนลงอีก → แจ้งซ้ำ (H-E15) · Magic tick ไม่ผ่านไม่ได้โล่ (H-E16)
13. `chooseClass` ครั้งที่สอง / ระหว่าง run ถูกปฏิเสธ · `confirm` ก่อนเลือก class = `no_class`
14. tick แรกในชีวิตกับ tick ที่สอง seed เดียวกัน: loot / exp คำนวณด้วยสูตรเดียวกัน ต่างเฉพาะ `firstEver` (R39, spec acceptance 13) · ค้นโค้ดไม่พบการอ่าน `lifetimeTicksGranted` ใน `reward` / `hp`
15. หลัง `dungeon_exited`: `JSON.stringify(toPersisted(...))` ไม่มี `lat` / `lng` (F04 11.2) · `player` ไม่มีพิกัด
16. เปลี่ยนค่าใน `combat.json` (เช่น `hitChancePerCheck_pct`) แล้วผลเปลี่ยนตาม (spec acceptance 2 · ไม่มีเลขฝัง)

### 13.4 hook ของ client และ e2e (P2-F06-T08, P2-F06-T09, P2-F06-T17)

| hook | วิธี | ใช้กับ |
| --- | --- | --- |
| trace ยาวถึง auto-retreat | Mock `loc=mock&trace=<trace เดินวน 60 นาที>&speed=60&seed=<n>` (F04 17) · เลือก `seed` ที่ถอยใน 30 นาทีสำหรับ non-Tanker (หาได้จาก harness 13.2 ข) | e2e auto-retreat |
| ตาย | ตั้งค่า → ปิด auto-retreat (ผ่าน popup) → trace เดิม · seed เดียวกันให้ `death` | e2e ตาย, จอตาย/ฟื้น |
| ฟื้น | query `start` เลื่อนเวลาเริ่ม Mock ไป 30 นาทีหลังตาย (reload) · HP ≥ 50% และไม่ Recovering | e2e ฟื้น |
| สถานะที่บ้าน | Mock trace ที่จุดคงที่: ใกล้, ไกล (> 1,900 ม. จาก dungeon เปิด), นอก mask, นอกย่านเปิดตัว · ไม่ consent = ไม่รู้ตำแหน่ง | e2e จอไกล/นอกพื้นที่ |
| ดูค่า | `window.__kwSession` (เฉพาะ `hud=1`) เพิ่ม `selectPlayerView` และ `selectRunView.hp` (ไม่มีพิกัด ไม่มี `nextAttemptTau_ms`) | e2e assertion |
| ไม่มีทางเพิ่มยา | e2e / tech gate: ไม่มี query, input หรือปุ่ม debug ที่เพิ่ม inventory | B-06 |
| ถอน consent ระหว่าง run | Mock trace เดินใน dungeon → ตั้งค่า → ถอน consent ตอน Active, ตอน Grace และตอน Suspended (อย่างละครั้ง) · assert: `lastSummary.exitReason = manual_exit`, ของครบ, ไม่มี `run_state_changed` หลังกด, Mock provider หยุด (ไม่มี sample ถูกส่งเข้า `sessionStep` หลังกด), `selectPlayerView` ใช้ได้, `kw.p2.session` ไม่มี `lat`/`lng`, `kw.p2.consent.location = withdrawn` | 8.4, spec F06 หัวข้อ 8 ข้อ 18 |
| รอยแยกที่แนะนำ (R37) | unit test ของ `home-state.ts` (pure · ไม่ต้องใช้ Mock) · กรณีบังคับ: (ก) onboarding + แห่งไม่ครอบเลเวลใกล้กว่าในเกณฑ์ + แห่งครอบเลเวลในเกณฑ์ → แนะนำแห่งที่ครอบ (ข) onboarding + มีแค่แห่งไม่ครอบในเกณฑ์ + แห่งครอบเปิดอยู่นอกเกณฑ์ → `far` ชี้แห่งที่ครอบ ไม่มี id แนะนำ (H-E26) (ค) onboarding + แห่งที่ครอบปิดทั้งหมด → `temporarilyClosed` เวลาของแห่งที่ครอบใกล้สุด (ง) หลัง onboarding + กรณี (ข) → `near` แนะนำแห่งไม่ครอบ (F04-R33 ทางสำรอง) (จ) แห่งที่ปิดไม่ถูกแนะนำทุกกรณี · assert ว่าไม่มีกรณี onboarding ใดคืน id ที่ไม่ครอบเลเวล | 9.2 ข้อ 3–5, spec F06 หัวข้อ 8 ข้อ 12 |
| เวลาที่เหลือถึง 50% | ตาย → reload ที่ `start` +10 นาที → `recoveryTimeLeft_ms` ≈ 20 นาที (± 1 วิ ที่ VIT 0) · +30 นาที → `null` และไม่ Recovering | 6.2 |

- selector ใหม่ของ `session`: `selectPlayerView(state, now_ms, params)` → `{ classId, level, exp, expToNext, statPointsUnspent, hp, maxHp, hpRatio, recovering, recoveryTimeLeft_ms, recoveryTo_pct, autoRetreatEnabled, inventory, firstRunEntered, firstRewardDone }` (`recoveryTimeLeft_ms` ตาม 6.2 · P2-X16) · `selectRunView(...).hp` → `{ hp, maxHp, hpRatio, shield, belowWarningLine, autoRetreatEnabled }` · `selectCanClearLocalData(state)` · ตัวเลข HP ที่แสดงใช้ `Math.ceil` (ผู้เล่นที่ยังมี HP ไม่เห็น 0 · แถบใช้ `hpRatio` ตรง)

### 13.5 vector ที่ขอเพิ่มจาก systems-designer (ไม่บล็อก P2-F06-T06 · engine test 13.3 ครอบระหว่างรอ)

- `hp-recovery.json` (ใหม่) · `input.fn = "hpAfterRegen"`: `{ value, maxHp, vit, elapsed_ms, rate params }` → HP · ครอบ: ฟื้นปกติ, ถึงเพดาน maxHp, VIT > 0, 0 → 50% ที่ 1,800 วิ (ค่าจริง 1,799.964 วิ), `elapsed_ms ≤ 0` คืนค่าเดิม
- `run-loop.json` เพิ่ม `runLoop` ที่มีช่วงหยุด (input เสนอ `pauses: [{ atTau_s, duration_s }]` ที่ reference ใส่เป็นช่วงเวลาจริงที่ τ ไม่เดิน) เพื่อยืนยัน "นับต่อ ไม่รีเซ็ต" ในระดับ vector · ถ้า systems เห็นว่าเป็นกฎของ engine ไม่ใช่สูตร ให้ปิดด้วย engine test 13.3 ข้อ 1 แทน

## 14. สมมติฐาน การแก้เอกสารอื่น และงานต่อ

### 14.1 สมมติฐาน

- A-P2-F06-T04-1: ความพยายามตีตัดสินเมื่อ `at < H` แบบเคร่ง (3.3) · ผลคือความพยายามที่เวลาเท่ากับ `limit` / เวลาจบของ reference ถูกตัดสินใน reference แต่ไม่ใน engine เมื่อ run จบที่เวลานั้นพอดี · ความน่าจะเป็นในการเล่นจริงเป็นศูนย์ (เวลาเป็นทศนิยม) · owner ยืนยัน: systems-designer (ความหมายของ vector), game-director
- A-P2-F06-T04-2: `run_auto_retreat.minutes_since_run_start_bucket` ใช้เวลาจริงนับจาก confirm (รวม Grace/Suspended) ตามถ้อยคำของเอกสาร PM · engine ส่ง `activeTau_ms` คู่กันเผื่อ PM ต้องการเวลา Active เพื่อเทียบ D-020 · owner: product-manager
- A-P2-F06-T04-3: ความพยายามที่เวลาจริงอยู่ก่อน `setAutoRetreat` แต่ถูกตัดสินหลัง (เพราะ `H`) ใช้ค่าใหม่ (5.2) · owner: game-director
- A-P2-F06-T04-4: การฟื้นหลังตายใช้อัตรา `outsideDungeonRegen_pctMaxHpPerMin` ตัวเดียว · `deathRecoveryDuration_s` เป็นค่าตรวจความสอดคล้อง ±1 วิ (6.2) · owner: systems-designer
- A-P2-F06-T04-5: เหตุ `no_class`, `no_hp` ของ `checkin_rejected` (6.3) · owner: game-director (กฎ), product-manager (enum telemetry)
- A-P2-F06-T04-6: หน้าต่างที่ค้างตอนปิดแต่ `e < partialTickMinElapsed_s` ส่ง `run_tick_denied { partial: true }` หนึ่งครั้ง (10.2) · owner: product-manager, backend-programmer
- A-P2-X31-1: `temporarilyClosed` ระหว่าง onboarding (9.2 ข้อ 4) แสดงเวลาเปิดถัดไปของ dungeon ที่ครอบเลเวลที่ **ใกล้สุด** ไม่ใช่แห่งที่เปิดเร็วสุด · เหตุผล: เป้าเดียวกับทิศและปุ่มนำทาง · spec R37 ข้อ 2 ไม่ระบุว่าแห่งใด · owner: game-director (กฎ), uiux-designer (จอ)
- A-P2-F06-T04-7: key `unlocks.home.launchAreaMaskPath` (สตริง path, `null` = ยังไม่มี) แทน `seeLaunchAreaMask` ที่ spec เสนอ (9.1) · owner: systems-designer (key), location-engineer (ข้อมูล)
- A-P2-X16-1: การถอน consent ในแอประหว่าง run ใช้ `exitReason = manual_exit` และ input `exit` เดิม (8.4) · telemetry แยกไม่ได้จนกว่า PM จะประกาศ `location_consent_withdrawn` · owner: product-manager (telemetry), game-director (ยืนยันว่าไม่ต้องแยกเชิงกติกา)
- A-P2-X16-2: permission ที่เบราว์เซอร์ถอนเอง (ไม่ได้กดในแอป) ไม่ใช่การถอน consent ตาม R48 ข้อ 2 จึงเดินตาม F04-R13 (FH-18) · owner: game-director
- A-P2-F06-T04-8: ข้อความ "tankerBuff = 0 ใน Phase 2" ใน acceptance ของ P2-F06-T06 อ่านว่าไม่มี Tanker คนอื่น · Tanker คนเดียวได้ buff ตัวเอง (3.4 · spec R31, vector `soloDamage`) · owner: producer (ถ้อยคำ board), game-director

### 14.2 เอกสารที่ tech-lead จะแก้ในงานถัดไป (ไม่อยู่ใน Writes ของงานนี้)

- tech note F04 2.3 (`player` อ้างหัวข้อ 2 ของเอกสารนี้), 2.4 (input `chooseClass`, `usePotion`), 2.5 (event ของหัวข้อ 4.1, `run_tick_denied.partial`, reason `no_class` / `no_hp`), 2.6 (selector ใหม่), 7.4 (ลำดับ 6.3), 12.3 (แถวของ F06 ในตาราง mapper ตามหัวข้อ 10.1)
- ADR 0003 หัวข้อ 7 (`presence()` เป็นตัวจำแนกเพื่อแสดงผล · หัวข้อ 11) และ 5.2 ข้อ 6 (ข) (ค้างจาก F04/F05)

### 14.3 ส่งต่อ

- backend-programmer (P2-F06-T06): สร้าง `src/hp` ตามหัวข้อ 2–6 · ต่อเข้า `src/session` ตามหัวข้อ 4 โดยไม่เปลี่ยนสัญญาของ run/reward (TL B-07) นอกจาก field ที่เพิ่มใน 4.1 · ผ่าน 13.1–13.3
- gameplay-programmer (P2-F06-T08, T09): แถบ HP / แจ้ง 30% / สัญญาณเดียวตอนถอย (4.1) · `setAutoRetreat` call site เดียว (5.2) · `usePotion` นอก run · `kw.p2.*` ตาม 8.1 · `clearLocalData` รับ `selectCanClearLocalData` (8.3) · `home-state.ts` ตาม 9 · ตัวสะสม wake lock / page hidden ตาม 10.2
- systems-designer: key `launchAreaMaskPath` · config lint: ลำดับเกณฑ์ 25 < 30 < 40, ความสอดคล้องของอัตราฟื้นหลังตาย, `revive` ไม่อยู่ใน `defaultPotionOrder`, `sourceOrder` · vector 13.5
- product-manager: enum `checkin_rejected.reason` เพิ่ม `no_class`, `no_hp` · ยืนยัน A-P2-F06-T04-2, -6
- qa-tester: test plan F06 ใช้ 13.3–13.4 และ failure modes 12
- (P2-X16) backend-programmer (P2-X10): `purgeLocationData(state)` ใน `session` (8.4 ข้อ 4) · `recoveryTimeLeft_ms`, `recoveryTo_pct` ใน `selectPlayerView` (6.2) · ข้อบกพร่อง S-1, S-2 ของหัวข้อ 15.2 · engine test 15.3
- (P2-X16) gameplay-programmer (F06 client): ลำดับถอน consent 8.4 ข้อ 1–6 ใน call site เดียว · ปุ่มถอนไม่ disabled ระหว่าง run · `home.recoveringDetail` อ่าน `recoveryTimeLeft_ms` · หน้า credits อ่าน `config/content/credits.json`
- (P2-X16) product-manager: ตัดสินว่าจะประกาศ `location_consent_withdrawn { during_run }` หรือไม่ (8.4) · qa-tester: hook 13.4 แถวถอน consent และเวลาที่เหลือ, vector/engine test 15.3

## 15. ยืนยัน J-P2-T30-4 กับสัญญา engine (F04-R15 ข้อ 7, D-118 · P2-X16)

### 15.1 สัญญา (ตรงตัวกับ spec F04-R15 ข้อ 7 · เป็นสัญญาของ `session` ไม่ใช่ของ `hp`)

หลังช่วงไม่มีหลักฐาน (Active → Grace ด้วย `cause = no_evidence` ที่เวลา `t_last` = sample ที่ใช้ได้ตัวสุดท้าย) ให้ `s₁` = sample ที่ใช้ได้ตัวแรกหลังช่องว่าง

1. `s₁` อยู่ใน polygon ทางเรขาคณิต (รวมแถบฝั่งในที่ห่างขอบไม่เกิน `edgeHysteresis_m`) และ `s₁.t_ms − t_last ≤ suspendedMax_s` นับจาก `t_last` (ยังไม่ Ended) → Active ที่ `s₁.t_ms` ทันที ไม่ผ่านชุด hysteresis · `ActiveClock` เดินต่อจาก `s₁.t_ms` · tracker ของ presence ยังอยู่ฝั่ง `inside`
2. `s₁` อยู่นอก polygon → เป็นการออกจริง: สถานะคง Grace/Suspended ตามเวลา · `exitStartedAt_ms` **คงเป็น `t_last`** (R14 · ไม่ย้ายไปเวลาของ `s₁` หรือเวลาที่ชุดออกยืนยัน) · `exitCause` เปลี่ยนเป็น `left_polygon` · tracker ตั้งใหม่เป็นฝั่ง `outside` ที่ `s₁` · การกลับเข้าหลังจากนี้ต้องครบชุด hysteresis ตาม R15 ข้อ 1 (ทางลัดของข้อ 1 ใช้ได้กับ `s₁` ตัวเดียวเท่านั้น)
3. เวลานอกเกิน `suspendedMax_s` ก่อน `s₁` → Ended `timeout` ที่ `t_last + suspendedMax_s` ของครบ (R18) ไม่ว่า `s₁` อยู่ฝั่งไหน · `s₁` ไม่ถูกป้อนเข้า run ที่จบแล้ว (ป้อนเข้า approach ได้ตามปกติ)
4. ทั้งสามกรณี: คู่ที่คร่อมช่องว่างไม่นับระยะ (F05-R06) · tick หลังกลับต้องผ่าน gate · **ผลต้องเท่ากันไม่ว่า input แรกหลังช่องว่างเป็น `tick` หรือ `sample`** (tech note F04 4.3 · หัวข้อ 4 ของเอกสารนี้)

### 15.2 ผลตรวจกับโค้ด ณ commit `7fdb54c` (`packages/shared/src/session/reducer.ts` · ตรวจด้วย script นอก repo บนสำเนา HEAD และซ้ำบน working copy ที่ P2-X10 กำลังแก้ ณ 2026-09-27 ได้ผลเท่ากัน · config ของ `reducer.test.ts`: `edgeHysteresisSamples` 2, `edgeHysteresis_m` 5, `maxSamplePairGap_s` 30, ช่องว่าง 120 วิ)

| ข้อ | ลำดับ input หลังช่องว่าง | ผล | สถานะ |
| --- | --- | --- | --- |
| 1 | `tick` แล้ว sample ในแถบ (≈ 2 ม. จากขอบ) หรือ sample ลึก | Active ที่เวลาของ sample ไม่ผ่าน hysteresis (สาขา `exitCause === 'no_evidence' && insideRun` ใน `handleSample`) | ตรงสัญญา |
| 2 | `tick` แล้ว sample นอก (≈ 33 ม.) แล้ว sample ลึกหนึ่งตัว | Active ที่ sample ลึกตัวแรก (ชุด hysteresis ของ config test = 2 ตัว ไม่ครบ) | **ไม่ตรง (S-1)** |
| 1–3 | sample มาก่อน `tick` | ไม่มี `no_evidence` เลย · run คง Active ข้ามช่องว่าง · ช่องว่าง 20 นาทีแล้ว sample ใน = ยัง Active ไม่มี `timeout` | **ไม่ตรง (S-2)** |
| 3 | `tick` หลังช่องว่าง 20 นาที | `no_evidence` ที่ `t_last` → Suspended → `timeout` ที่ `t_last + 900 วิ` | ตรงสัญญา |

- **S-1** สาเหตุ: หลัง `no_evidence` tracker ยังอยู่ฝั่ง `inside` และสาขาทางลัดดูแค่ `exitCause` จึงใช้ได้กับ sample ในทุกตัวหลังจากนั้น ไม่ใช่เฉพาะ `s₁` · sample นอกเพียงเริ่มชุดรอยืนยันการออก แล้ว sample ในตัวถัดไปล้มชุดและเข้าทางลัด · ต้องแก้: ตัดสิน `s₁` ครั้งเดียว ถ้านอก ทำตาม 15.1 ข้อ 2 (`exitCause := left_polygon`, `presenceTrackerInit('outside', s₁.t_ms)`, ไม่แตะ `exitStartedAt_ms`)
- **S-2** สาเหตุ: การตรวจช่องว่างอยู่ใน `processTimeline` ซึ่ง `sessionStep` เรียก **หลัง** `handleSample` และ `handleSample` อัปเดต `lastSample_ms` ก่อน · client เรียก catch-up `tick` ตอน boot แล้ว (`apps/client/src/session/engine.ts`) จึงรอดกรณีแอปถูกปิด แต่กรณีจอล็อก / tab hidden ที่ JS หยุดแล้วกลับมา callback ของ `watchPosition` อาจมาก่อน timer ของ `tick` · ผล: นาฬิกาเดินข้ามช่องว่าง ความพยายามตีของ HP engine ถูกตัดสินในเวลาที่ไม่มีหลักฐาน (ขัด FH-01) และ `timeout` ไม่เกิด · ต้องแก้: ก่อนป้อน sample ให้ `sessionStep` ตัดสินเส้นเวลาถึง `sample.t_ms` ด้วยกติกาเดียวกับ `processTimeline` (ช่องว่างเทียบ `lastSample_ms` แล้ว `runTimers`) แล้วจึงเรียก `handleSample`
- `runTimeline` (batch reference ของ vector `run-state.json`) ไม่มีทางลัดของข้อ 1: หลังช่องว่างตั้ง tracker เป็นฝั่ง `outside` จึงต้องครบชุด hysteresis เสมอ (ตรวจ: sample ในแถบ 2 ตัวหลังช่องว่างไม่กลับ Active) · vector [15] ผ่านเพราะ sample ขากลับอยู่ลึกและการย้อนเวลาทำให้ `at_ms` ตรงกัน · ต้องให้ `runTimeline` และ `session` ทำตาม 15.1 ชุดเดียวกัน ไม่งั้น vector กับ engine จะแยกกันเมื่อ systems-designer เพิ่ม vector สามกรณี (handoff ของ flow approval R2 ถึง systems)

### 15.3 test ที่ต้องมี (backend-programmer P2-X10 · ไม่บล็อกด้วย vector ใหม่)

1. ข้อ 1 ทั้งสองลำดับ (`tick` ก่อน / sample ก่อน) × (sample ในแถบ / sample ลึก) → Active ที่ `s₁.t_ms` · `run_state_changed { cause: 'returned' }` · ระยะคู่ `(t_last, s₁)` = 0
2. ข้อ 2 ทั้งสองลำดับ: sample นอก → คง Grace, `exitStartedAt_ms = t_last` · sample ในหนึ่งตัวถัดไป **ไม่** กลับ · ครบชุดแล้วกลับที่ sample แรกของชุด
3. ข้อ 3 ทั้งสองลำดับ: ช่องว่าง > `suspendedMax_s` → `dungeon_exited { exitReason: 'timeout' }` ที่ `t_last + suspendedMax_s` · ของครบ · HP ย้ายไป player ที่เวลานั้น (6.1)
4. ข้อ 4: ลำดับ `tick` ก่อนกับ sample ก่อนให้ state (ยกเว้น `clock.lastNow_ms`) และ event (ยกเว้นลำดับใน step) เท่ากัน
5. ความพยายามตี: ไม่มี `run_hit` ที่ `at_ms` อยู่ในช่วง `(t_last, s₁.t_ms)` ทุกกรณี
