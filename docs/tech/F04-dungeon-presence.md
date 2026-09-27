# Tech note F04 — Dungeon Presence, Run State และสัญญา `session`

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F04-T14 · เจ้าของ tech-lead · วันที่ 2026-09-26 · สถานะ: ฉบับแรก (สัญญาสำหรับ P2-F04-T20, P2-F05-T08, P2-F04-T25, P2-F04-T26, P2-F04-T19) |
| คู่กับ | `docs/tech/F05-movement-gate-reward.md` (rewardWindow, ตัวกรอง, tick, drop, การจ่ายตอนจบ run) |
| อ้างอิง | `docs/adr/0003-client-first-game-core.md` (ADR 0003) · `design/features/F04-dungeon-presence.md` (spec F04, R01–R39, E1–E18) · `design/features/F05-movement-gate-reward.md` (spec F05) · `product/telemetry-events.md` · `config/app/privacy.json`, `config/app/telemetry.json`, `config/app/client.json` · `config/balance/{dungeons,anticheat,privacy}.json` · D-059, D-085, D-087, D-088, D-089, D-090, D-094 |
| ผู้ใช้เอกสาร | backend-programmer (`src/run`, `src/session`), gameplay-programmer (client plumbing, UI), location-engineer (`packages/geo`, `tools/dungeons`), qa-tester (test plan), product-manager (telemetry), systems-designer (key + vector) |

key ที่ขึ้นต้นด้วย `balance.` คือ `config/balance/*.json` · `app.` คือ `config/app/*.json` · key ใน `balance.dungeons.movementGate.*` ที่ยังไม่มีในไฟล์ (`sampleCadence_s`, `maxSampleAccuracy_m`, `maxSamplePairGap_s`, `outlierSpeed_kmh`, `outlierReanchorSamples`) ใช้ชื่อตาม ADR 0003 หัวข้อ 5.5 · key อื่นที่ spec เสนอ (`runState.edgeHysteresisSamples`, `runState.edgeHysteresis_m`, `runState.clockSkewTolerance_s`, `anticheat.speedLock.lockSustained_s`, `unlockSustained_s`, `openingHours.utcOffset_min`, `openingHours.closingSoonNotice_s`) ใช้ชื่อตาม spec F04 หัวข้อ 8 · systems-designer ถือค่าใน P2-F05-T20 · ระหว่างที่ยังไม่มี accessor ของ `src/config` throw `ConfigUnsetError`

## 0. สรุปคำตัดสินของ tech note นี้

| เรื่อง | คำตัดสิน | หัวข้อ |
| --- | --- | --- |
| ทางเข้าของ client | `sessionStep(state, input, now_ms, params) → { state, events }` ตัวเดียว + selector ที่ pure + `toPersisted` / `fromPersisted` | 2 |
| เวลา | `now_ms` = นาฬิกาจริงของ host (epoch) · เวลาของ sample = `timestamp` ของ fix · engine ตัดสินเฉพาะถึง **เส้นเวลาที่นิ่งแล้ว** `H` · `now_ms` ถอยหลังเกิน `clockSkewTolerance_s` = จบ `clock_invalid` | 4 |
| backdating | ทุก transition ที่ยืนยันด้วยชุด sample (ออก, กลับเข้า, lock, ปลด lock) มีผลย้อนไปที่ sample แรกของชุด · "ไม่มีหลักฐาน" นับจาก sample ที่ใช้ได้ตัวสุดท้าย · ไม่เก็บรายการ sample เพื่อทำย้อนหลัง ใช้ตัวสะสมสำรอง (scratch) | 5, 6 |
| check-in | เก็บเฉพาะ **เวลา** ของลำดับต่อเนื่องและ "เคยอยู่นอก polygon" ต่อ dungeon ไม่เก็บรายการพิกัด | 7 |
| เวลาทำการ | ตาราง normalized รายสัปดาห์ นาทีท้องถิ่น `[เปิด, ปิด)` + วันยกเว้น · ประเมินด้วย `now_ms + utcOffset_min` | 8 |
| แอปถูกปิด | state ใน `kw.p2.session` · เปิดใหม่ = `fromPersisted` แล้ว `tick` · Grace/Suspended/Ended ตามเวลาที่หาย · ระยะคร่อมช่องว่าง = 0 | 10 |
| เพดาน sample ในเครื่อง | `app.privacy.onDeviceSamples.maxAge_s` 300 และ `maxCount` 16 · ลบเมื่อ run จบ · ไม่ persist sample ก่อน run | 11 |
| telemetry | ring buffer ในเครื่อง `kw.p2.telemetry` · export JSONL เป็น Blob เวลา `t_rel_ms` ไม่มีพิกัด | 12 |
| artifact ของ dungeon | `data/dungeons/artifact/dungeons.client.v1.json` สร้างโดย `tools/dungeons` แบบ deterministic มีโหมด `--check` | 13 |
| ลิงก์นำทาง | Google Maps URL (`api=1`) บน Android · Apple Maps URL บน iOS · ปลายทางอย่างเดียว โหมดเดิน ไม่มี key · fallback คัดลอกชื่อ + พิกัดปลายทาง | 14 |
| config ที่ client import | whitelist ตาม subtree (หัวข้อ 15) · `coverageFilter`, `area`, `safety`, `offlineEvidence` ฯลฯ ห้ามเข้า bundle | 15 |

## 1. ขอบเขตและโมดูล

- ใน Phase 2 engine รันบน client เป็นข้อยกเว้นที่หมดอายุเมื่อเริ่ม Phase 3 (ADR 0003 3.4 C1-1) · ผลไม่ใช่รางวัลจริง · สัญญาในเอกสารนี้ออกแบบให้ CellDO เรียกฟังก์ชันเดียวกันได้โดยไม่แก้ (Phase 3 `now_ms` มาจาก server, sample มาจาก batch)
- โมดูลและเจ้าของตาม ADR 0003 3.1 · ลำดับการประกอบอยู่ใน `packages/shared/src/session` เท่านั้น
- `apps/client` import ได้เฉพาะ `@keep-walking/shared/session` และ `@keep-walking/geo` (การแสดงผลที่ไม่ใช่รางวัล) · ห้าม import `run` / `reward` / `hp` (lint ของ ADR 0003 8.2)
- สิ่งที่อยู่ใน client เท่านั้น: timer, game clock, storage adapter, telemetry sink, LocationProvider, การแปลง `LocationSample` → input, UI

## 2. สัญญา `session` (ทางเข้าเดียวของ client)

### 2.1 signature

```ts
// packages/shared/src/session/index.ts (backend-programmer, P2-F05-T08 + P2-F06-T06)
export function sessionStep(
  state: SessionState,
  input: SessionInput,
  now_ms: number,
  params: SessionParams,
): { state: SessionState; events: readonly SessionEvent[] };

export function createSession(now_ms: number, player: PlayerInit): SessionState;
export function toPersisted(state: SessionState, now_ms: number, params: SessionParams): PersistedSession;
export function fromPersisted(
  raw: unknown, now_ms: number, params: SessionParams,
): { ok: true; state: SessionState } | { ok: false; reason: 'schema_mismatch' | 'corrupt' | 'unknown_dungeon' };
```

- board เขียนว่า `sessionStep(state, input, now_ms, config, rng)` · ตาม ADR 0003 3.2 ข้อ 8 argument ที่สี่คือ `params` (config ที่อ่านแล้ว + ข้อมูล dungeon) และ `rng` คือ **ข้อมูล** `runSeed` ที่ส่งมากับ input `confirm` แล้วเก็บใน `state.run.runSeed` ไม่ใช่ function
- pure ตาม ADR 0003 3.2 ข้อ 1–7 · ห้ามแก้ object ที่รับเข้า · state และ event เป็น JSON ล้วน

### 2.2 `SessionParams`

```ts
interface SessionParams {
  readonly config: SessionConfig;      // typed subtree จาก src/config (หัวข้อ 15.1 กลุ่ม A)
  readonly dungeons: DungeonIndex;     // จาก artifact หัวข้อ 13 (id → record ที่ parse แล้ว + bbox)
}
```

- client สร้าง `params` ครั้งเดียวตอนบูต (config ผ่าน build step ตามหัวข้อ 15, dungeons จาก artifact) · Phase 3 server สร้างจากไฟล์เต็ม
- `params` ห้ามมีเวลาหรือค่าสุ่ม · `runSeed` อยู่ใน state

### 2.3 `SessionState` (รูประดับบน · ชื่อ field ภายในเลือกได้ใน P2-F04-T20 / P2-F05-T08 แต่ความหมายเป็นสัญญา)

```ts
interface SessionState {
  readonly schemaVersion: 1;               // เพิ่มเมื่อรูปเปลี่ยน · ไม่มี migration ใน Phase 2 (หัวข้อ 10.2)
  readonly clock: {
    readonly lastNow_ms: number | null;    // now_ms สูงสุดที่รับแล้ว
    readonly lastSample_ms: number | null; // timestamp ของ sample ล่าสุดที่รับ (ตรวจเพิ่มขึ้นแบบเคร่ง)
    readonly settled_ms: number | null;    // H ที่ประมวลผลไปแล้ว (หัวข้อ 4.3)
  };
  readonly pre: ApproachState;             // check-in ก่อนมี run (หัวข้อ 7.2) · ไม่ persist
  readonly lock: SpeedLockState;           // overlay speed lock (หัวข้อ 6) · มีทั้งก่อนและระหว่าง run
  readonly run: RunState | null;           // null = ไม่มี run (Browsing)
  readonly player: PlayerState;            // level, exp, class, auto-retreat, inventory ในเครื่อง (รายละเอียด tech note F06)
  readonly lastSummary: RunSummary | null; // สรุป run ล่าสุด ไม่มีพิกัด (F05 R25–R27) · ล้างด้วย input ackSummary
}

interface RunState {
  readonly runId: string;                  // `${startedAt_ms}-${runSeed}` · ไม่ผูกตัวตน
  readonly dungeonId: string;
  readonly runSeed: number;                // uint32 (ADR 0003 6)
  readonly startedAt_ms: number;
  readonly closesAt_ms: number | null;     // ปลายช่วงเปิดที่ครอบ startedAt (หัวข้อ 8.3) · null = ไม่ปิดภายในขอบฟ้า
  readonly presence: PresenceTracker;      // สถานะยืนยัน + ชุดที่รอยืนยัน (หัวข้อ 5)
  readonly status: 'active' | 'grace' | 'suspended';   // สถานะที่นิ่งแล้ว ณ H (Ended ไม่อยู่ที่นี่ · ย้ายไป lastSummary)
  readonly exitStartedAt_ms: number | null;           // จุดเริ่มของการออกครั้งนี้ (R14)
  readonly clockIntervals: ActiveClock;    // ตัวแปลงเวลาจริง ↔ τ (F05 หัวข้อ 2)
  readonly reward: RewardState;            // ตัวสะสมของ rewardWindow + scratch (F05 หัวข้อ 3)
  readonly bag: RunBag;                    // ของใน run (F05 R17, R20)
  readonly hp: RunHpState;                 // tech note F06
  readonly notices: { readonly closingSoonSent: boolean };
}
```

- field ที่มีพิกัดมีได้เฉพาะใน `pre` (ไม่ persist), `lock.anchor`, `run.presence` (ไม่มีพิกัด · มีแค่จำนวนและเวลา), `run.reward.*.anchor` / `reanchor` / `lastGrid` · ทั้งหมดอยู่ใต้เพดาน `app.privacy.onDeviceSamples` (หัวข้อ 11)
- `RunSummary` ไม่มีพิกัด: `dungeonId`, `exitReason`, `startedAt_ms`, `endedAt_ms`, `ticksEvaluated`, `ticksGranted`, `partialTick` (`null` หรือ `{ f, granted }`), `loot` (รายการ item id + จำนวน), `expGained`, `levelsGained`

### 2.4 `SessionInput`

| `type` | field | ใครส่ง เมื่อไร | หมายเหตุ |
| --- | --- | --- | --- |
| `sample` | `sample: { t_ms, lat, lng, accuracy_m }` | client ทุก fix จาก LocationProvider (Web / Mock) | client แปลงจาก `LocationSample` (`timestamp` → `t_ms`, `accuracy` → `accuracy_m`) · ไม่ส่ง `speed`/`heading` ของเครื่อง (engine ไม่เชื่อค่าที่เครื่องคำนวณ) |
| `tick` | — | client timer ทุก `app.client.engine.tickInterval_ms` (เสนอ 1000) และทันทีเมื่อกลับจาก page hidden และหลัง `fromPersisted` | ให้ engine เดินเวลาที่ไม่มี sample (ไม่มีหลักฐาน, Grace → Suspended, ปิดทำการ) |
| `confirm` | `dungeonId`, `runSeed` | ผู้เล่นกด "เข้า" ใน popup | `runSeed` จาก `crypto.getRandomValues` ใน client หรือค่าคงที่ของ test hook (หัวข้อ 17) |
| `exit` | — | ผู้เล่นกดออก | `manual_exit` (R17) |
| `setAutoRetreat` | `enabled` | หน้าตั้งค่า | ความหมายใน tech note F06 |
| `ackSummary` | — | ผู้เล่นปิดหน้าสรุป | ล้าง `lastSummary` |
| `emergencyClose` | — | **test เท่านั้น** (D-059 · ไม่มี UI ใน Phase 2) | client ไม่มี code path ส่ง input นี้ · tech gate ค้นโค้ด |

- input ที่ไม่รู้จักหรือ field ผิดชนิด → throw `InvalidSessionInputError` (บั๊กของ caller ไม่ใช่สถานการณ์เล่น)
- ไม่มี input `providerStatus`: engine ไม่รู้ว่า GPS ปิดหรือหน้าจอล็อก รู้แค่ว่าไม่มี sample ที่ใช้ได้ (R13) · สถานะ `gps.*` เป็นการแสดงผลของ client

### 2.5 `SessionEvent`

ทุก event มี `type` และ `at_ms` (เวลาที่มีผลหลัง backdating) · ไม่มีพิกัด ไม่มีค่า accuracy ไม่มีระยะดิบ (C2-3) · engine ไม่ยิง telemetry เอง client แปลงตามตารางหัวข้อ 12.3

| `type` | field | เกิดเมื่อ |
| --- | --- | --- |
| `checkin_rejected` | `dungeonId`, `reason` (`speed_lock` \| `poor_accuracy` \| `not_enough_trace` \| `no_approach_from_outside` \| `dungeon_closed` \| `run_active` \| `unsupported_mode`) | `confirm` ไม่ผ่าน (R08 + เงื่อนไขอื่นของ T3) |
| `dungeon_entered` | `dungeonId`, `runId` | `confirm` ผ่าน → Active (T3) |
| `run_state_changed` | `from`, `to` (`active` \| `grace` \| `suspended`), `cause` (`left_polygon` \| `no_evidence` \| `returned` \| `grace_expired`) | T6, T7, T8 (ยิงด้วย `at_ms` ที่ backdate แล้ว) |
| `anticheat_speed_lock_triggered` | `phase` (`enter` \| `exit`), `inRun` (bool), `dungeonId` \| null | T11, T12 |
| `run_tick_granted` | `dungeonId`, `tickIndex`, `loot`, `expGained`, `partial` (false) | หน้าต่างผ่าน gate (F05) |
| `run_tick_denied` | `dungeonId`, `tickIndex` | หน้าต่างไม่ผ่าน (F05) |
| `dungeon_closing_soon` | `dungeonId`, `closesIn_s` | R29 (ครั้งเดียวต่อ run) |
| `run_hp_low`, `run_auto_retreat`, `run_death`, `run_hit` | ตาม tech note F06 | F06 |
| `dungeon_exited` | `dungeonId`, `runId`, `exitReason`, `summary` (`RunSummary`) | ทุกทางที่จบ run (R17) · `exitReason` ∈ `manual_exit`, `timeout`, `auto_retreat`, `death`, `dungeon_closed`, `emergency_close`, `clock_invalid` |
| `sample_rejected` | `reason` (`future` \| `non_monotonic` \| `late` \| `invalid`) | sample ถูกทิ้งก่อนเข้า geo (หัวข้อ 4.2) · ใช้ใน HUD/test เท่านั้น ไม่ใช่ telemetry |

- ลำดับของ `events` ในผลหนึ่งครั้ง: เรียงตาม `at_ms` แล้วตามลำดับความสำคัญของหัวข้อ 9.3 · event ที่ `at_ms` เท่ากันลำดับคงที่ (vector ตรวจได้)

### 2.6 selector (pure, อ่านอย่างเดียว, ไม่มีพิกัดในผล)

| ฟังก์ชัน | คืน | ใช้กับ |
| --- | --- | --- |
| `selectRunView(state, now_ms, params)` | `status`, `locked`, `pendingTransition` (bool), `windowElapsed_s`, `nextTickIn_s` (หยุดเมื่อนาฬิกาหยุด · F05 R04b), `windowWalkedEnough` (bool จากระยะของ rewardWindow · ไม่ส่งตัวเลขระยะ), `outsideElapsed_s`, `graceRemaining_s`, `suspendedRemaining_s`, `closesIn_s`, `hp` (F06) | จอ run, จอพกกระเป๋า |
| `selectCheckInPreview(state, dungeonId, now_ms, params)` | `{ ok: true }` หรือ `{ ok: false, reason, readyIn_s? }` ตามลำดับ R08 (`readyIn_s` เฉพาะ `not_enough_trace`) | popup confirm (R09) · ประเมินด้วยกฎเดียวกับ `confirm` |
| `selectOpening(dungeonId, now_ms, params)` | `{ open, changesAt_ms \| null, closingSoon }` | แผนที่, popup, แผงปิด (R27, R28, R38) |
| `selectSummary(state)` | `lastSummary` | หน้าสรุป |

- selector ใช้ได้กับการแสดงผลเท่านั้น · การตัดสินเข้า run, tick, drop มาจาก `sessionStep` เท่านั้น · Phase 3 selector ฝั่ง client ถูกแทนด้วยข้อมูลจาก server (tech gate F08 ตรวจ)
- popup T1 ("อยู่ในเขต dungeon ที่เปิด") เป็นการแสดงผล: client ใช้ `pointInPolygon` ของ geo กับ sample ล่าสุด (R31, R39) แล้วเรียก `selectCheckInPreview` เพื่อรู้ว่าปุ่ม "เข้า" ใช้ได้หรือไม่

## 3. API ย่อยที่ `session` เรียก (client ห้ามเรียกตรง)

| โมดูล | ฟังก์ชัน (ชื่อเลือกได้ ความหมายเป็นสัญญา) | หัวข้อ |
| --- | --- | --- |
| `run` | `approachStep(pre, classified, params)` → ApproachState ใหม่ | 7.2 |
| `run` | `selectPresenceStrategy(mode)` → `PresenceStrategy` (ADR 0003 7) · `continuousGps.checkIn(ctx, p)` · `continuousGps.presence(ctx, p)` | 7 |
| `run` | `presenceStep(tracker, classified, p)` → `{ tracker, confirmed?: { to, at_ms } }` | 5 |
| `run` | `speedLockStep(lock, classified, p)` → `{ lock, confirmed?: { phase, at_ms } }` | 6 |
| `run` | `runTimers(run, H, p)` → รายการเหตุการณ์ตามเวลา (Grace → Suspended, timeout, ปิดทำการ, แจ้งใกล้ปิด) | 5.4, 8 |
| `run` | `isOpenAt(hours, t_ms, utcOffset_min)`, `openingChangeAfter(hours, t_ms, utcOffset_min, horizon_d)` | 8 |
| `reward` | `rewardFeed(reward, classified, clock, p)`, `rewardDue(reward, H)`, `evaluateWindow(...)`, `partialTick(...)`, `rollTickLoot(runSeed, tickIndex, table, mult, f)` | F05 |
| `hp` | ตาม tech note F06 (P2-F06-T04) | — |
| `@keep-walking/geo` | `filterGateSamples` (ทีละตัวแบบ incremental), `pairSpeed_kmh`, `pointInPolygon`, `boundaryDistance_m`, ตัวสะสม grid (ADR 0003 4.2) | 5–7, F05 |

- `classified` = sample ที่ `session` จัดชั้นแล้วหนึ่งครั้งต่อ sample (หัวข้อ 9.1 ขั้น 3) แล้วส่งให้ทุกโมดูล · โมดูลไม่จัดชั้นซ้ำเอง จึงไม่มีสองโมดูลที่ตีความ sample เดียวกันต่างกัน
- สาม engine ไม่ import ค่ากันเอง (ADR 0003 3.1) · ข้อมูลข้ามโมดูลส่งผ่าน `session`

## 4. เวลา

### 4.1 แหล่งเวลาสามแบบ

| เวลา | ที่มา | ใช้ทำอะไร |
| --- | --- | --- |
| `now_ms` | host: Web = `Date.now()` ใน `apps/client` · Mock = game clock `replayStart_ms + mock.position()` (P2-F04-T25) · Phase 3 = นาฬิกา server | เดินเวลาเมื่อไม่มี sample, ไม่มีหลักฐาน, timer ของ Grace/Suspended, เวลาทำการ, ตรวจนาฬิกาถอยหลัง |
| `t_ms` ของ sample | `GeolocationPosition.timestamp` (นาฬิกาจริงของเครื่องตอนได้ fix · gps-trace-format 1.3) · Mock = `replayStart_ms + t` | ทุกอย่างที่ขึ้นกับตำแหน่ง: ระยะ, ความเร็ว, presence, backdating, τ |
| monotonic (`performance.now()`) | browser | **ไม่ใช้ตัดสินเกม** · ใช้เฉพาะ animation, วัด latency ของ HUD |

- เหตุผลที่ไม่ใช้ monotonic ตัดสินเกม: `performance.now()` เริ่มใหม่ทุกครั้งที่โหลดหน้า จึงเชื่อมช่วงแอปถูกปิดไม่ได้ และพฤติกรรมตอนเครื่องหลับต่างกันระหว่าง Chrome และ Safari (หยุดหรือเดินต่อ) · ช่วงที่ต้องวัดข้ามการปิดแอป (เวลานอก 15 นาที, เวลาทำการ) ต้องใช้นาฬิกาจริงอยู่แล้ว
- ใน Phase 2 ทั้ง `now_ms` และ `t_ms` มาจากนาฬิกาเครื่องเดียวกัน · engine จึงตรวจความสอดคล้องระหว่างสองค่า (4.2) และตรวจการถอยหลังของ `now_ms` (4.4)

### 4.2 ด่านเวลาของ sample (ก่อนเข้า geo · ADR 0003 3.2 ข้อ 4)

sample ถูกทิ้งพร้อม `sample_rejected` เมื่อเข้าข้อใดข้อหนึ่ง ตามลำดับ

1. `invalid`: `t_ms`, `lat`, `lng`, `accuracy_m` ไม่ใช่ตัวเลขจำกัด, lat/lng นอกช่วง WGS84, `accuracy_m < 0`
2. `future`: `t_ms > now_ms + clockSkewTolerance_s × 1000`
3. `non_monotonic`: `t_ms ≤ clock.lastSample_ms`
4. `late`: `t_ms ≤ clock.settled_ms` (อดีตที่ตัดสินไปแล้วจะไม่ถูกเปิดใหม่)

sample ที่ผ่านด่านจึงเรียงตามเวลาแบบเคร่งเสมอ · `clock.lastSample_ms` อัปเดตเฉพาะเมื่อผ่าน

### 4.3 เส้นเวลาที่นิ่งแล้ว `H` (settled horizon)

engine ตัดสินผลที่ขึ้นกับเวลา (tick, hit, Grace → Suspended, timeout, ปิดทำการ, ใกล้ปิด) **เฉพาะเหตุการณ์ที่ `at_ms ≤ H`** · เหตุผล: transition ที่ backdate (R14, R15 ข้อ 2) อาจเปลี่ยนอดีตช่วงสั้นๆ ได้จนกว่าจะยืนยันหรือล้ม (R15 ข้อ 5)

```
H = min( E, P )
E = t ของ sample ที่ใช้ได้ล่าสุด              ถ้า now_ms − t_last ≤ maxSamplePairGap_s × 1000  (หลักฐานยังสด)
  = now_ms                                   ถ้าเกินแล้ว (ไม่มีหลักฐาน · การออกถูกตัดสินที่ t_last แล้วตามหัวข้อ 5.3)
P = t ของ sample แรกของชุดที่รอยืนยันทุกชุด (ออก, กลับเข้า, lock, ปลด lock) · ไม่มีชุดรอ = +∞
```

- `H` ไม่ลดลง (`clock.settled_ms = max(เดิม, H)`) · ความหน่วงของ `H` จาก `now_ms` โดยปกติไม่เกิน `max(เวลายืนยัน hysteresis, lockSustained_s, unlockSustained_s, maxSamplePairGap_s)` · ข้อยกเว้นจาก D-103 (5.2): sample ฝั่งตรงข้ามที่อยู่ในแถบ `edgeHysteresis_m` ไม่นับและไม่ล้มชุด ผู้เล่นที่ยืนอยู่ในแถบนานจึงตรึง `P` ได้ไม่จำกัดเวลา (ผลไม่ผิด เพราะเมื่อชุดล้มหรือยืนยัน timer และหน้าต่างที่ค้างถูกตัดสินย้อนตามจริง แต่ UI เห็น tick / Suspended ช้าลง) [ASSUMPTION A-P2-X04-1: ยอมรับได้ใน Phase 2 · ถ้าต้องมีเพดานเป็นกฎใหม่ของ systems-designer / game-director] · ช่วงหน่วงนี้ UI แสดงสถานะที่นิ่งแล้ว (`pendingTransition` = true ได้)
- ก่อนมี run `H` ใช้กับ lock และ approach เท่านั้น
- ผลของหน้าต่างจึงขึ้นกับ sample เท่านั้น ไม่ขึ้นกับจังหวะที่ `sessionStep` ถูกเรียก (ตรงเจตนา ADR 0003 5.2 ข้อ 6 · รายละเอียดใน F05 หัวข้อ 4)

### 4.4 นาฬิกาถอยหลัง (E10, F05 G15, D-094)

- `now_ms < clock.lastNow_ms − clockSkewTolerance_s × 1000` = **นาฬิกาใช้ไม่ได้**
  - มี run: จบ run `clock_invalid` ที่ `at_ms = lastEventAt_ms` (ค่ามากสุดของ `clock.settled_ms` และ `clock.lastSample_ms`) · ของใน run เก็บครบ · หน้าต่างที่ค้างทิ้ง ไม่มี tick เพิ่ม (F05 R21) · ลบ sample ทั้งหมดใน state
  - ไม่มี run: ล้าง `pre` และ `lock` (ลำดับต่อเนื่องเริ่มใหม่) · ไม่มี event ของเกม
  - หลังจากนั้น `clock.lastNow_ms`, `lastSample_ms`, `settled_ms` ตั้งใหม่จาก `now_ms` ปัจจุบัน (เริ่มนับใหม่ ไม่ติดค้าง)
- ถอยหลังไม่เกินค่าเผื่อ: ถือว่าเวลาไม่เดิน (ใช้ `lastNow_ms` เดิม) · ไม่มี event
- **นาฬิกาเดินหน้ากระโดด** ตรวจไม่ได้ใน Phase 2 (ไม่มีแหล่งเวลาอิสระ) · ผลเสียต่อรางวัลไม่มี (ระยะคร่อมช่องว่าง = 0 และเวลานอกเพิ่ม) · ผลต่อเวลาทำการ: ผู้เล่นที่ตั้งนาฬิกาไปข้างหน้าอาจเห็น dungeon ที่ปิดเป็นเปิด · ยอมรับใน Phase 2 เพราะไม่มีรางวัลจริง (C1-1) และ Phase 3 ใช้เวลา server · บันทึกเป็นความเสี่ยงหัวข้อ 16

## 5. Presence และ run state (R12–R19, D-094)

### 5.1 sample ที่ใช้ได้และการสังเกต inside/outside

- **sample ที่ใช้ได้** (spec 3.3) = ผ่านด่านเวลา (4.2) และขั้น 1 ของตัวกรอง (ADR 0003 5.3: `accuracy_m ≤ maxSampleAccuracy_m` และไม่ใช่ outlier ความเร็ว) · sample ที่ไม่ใช้ได้ไม่เปลี่ยนสถานะและไม่ขยับ `E` (R16)
- การสังเกตต่อ sample ที่ใช้ได้: `inside` = `pointInPolygon(sample, polygon ของ run)` แบบดิบ (รองรับรูและ MultiPolygon) · polygon อื่นที่ซ้อนไม่มีผล (R03, E9)
- `presence()` ของ `PresenceStrategy` คืน `unknown` เมื่อยังไม่มี sample ที่ใช้ได้หลังเริ่ม run (ไม่เกิดในทางปกติเพราะ confirm ต้องมี sample ล่าสุดใน polygon)

### 5.2 ชุดยืนยันและ backdating (R14, R15)

- สถานะที่ยืนยันแล้วมีสองค่า: `in` (Active หรือ Active ที่ lock) และ `out` (Grace / Suspended)
- **ชุดที่รอยืนยัน** = sample ที่ใช้ได้ติดกันที่สังเกตได้ตรงข้ามกับสถานะที่ยืนยัน · เก็บเฉพาะ `count`, `firstAt_ms` (เวลาของ sample ฝั่งตรงข้ามตัวแรกในชุด ไม่ว่าจะอยู่ในแถบหรือไม่) · sample ที่ใช้ได้ที่ตรงกับสถานะเดิม (ลึกเท่าไรก็ได้) ล้มชุด · sample ที่ไม่ใช้ได้ไม่ล้มและไม่นับ
- **นับ** = sample ฝั่งตรงข้ามในชุดที่ `boundaryDistance_m > edgeHysteresis_m` · sample ฝั่งตรงข้ามที่อยู่ในแถบ (`boundaryDistance_m ≤ edgeHysteresis_m`) เป็นกลาง: ไม่นับและไม่ล้มชุด (แต่ถ้าเป็นตัวแรกของชุดก็ตั้ง `firstAt_ms`)
- **ยืนยัน** เมื่อ `count ≥ edgeHysteresisSamples` (ต้องครบทั้งจำนวนและระยะในเวลาเดียวกัน ไม่ใช่อย่างใดอย่างหนึ่ง) · ใช้กฎเดียวกันทั้งขาออก (`in → out`) และขากลับ (`out → in`) · กรณีขอบของ config: `edgeHysteresis_m = 0` → นับทุก sample ฝั่งตรงข้าม (จำนวนอย่างเดียว) · `edgeHysteresisSamples = 1` → sample เดียวที่เกินแถบพอ (ระยะอย่างเดียว) · อ้างอิง: `design/systems/balance-model.md` 16.3 และ vector `edgeHysteresis` 8 ข้อใน `design/systems/test-vectors/run-state.json` (D-103 · เสนอโดย systems-designer · game-director ยืนยันใน F04 flow gate รอบ 2 · tech note นี้ถือเป็นสัญญาปัจจุบันแล้ว ถ้า game-director ไม่ยืนยันจะแก้ทั้ง vector และหัวข้อนี้พร้อมกัน) · แทนที่ A-P2-F04-T14-1 ("อย่างใดอย่างหนึ่ง") ซึ่งถูก systems-designer ปฏิเสธด้วย edge-walk (ออกผิด 7 ครั้ง เทียบ 3 ครั้งที่ 1 Hz)
- **ช่องว่างล้มชุด** (D-104 · tech-lead ยอมรับ): ถ้าคู่ sample ที่ใช้ได้ติดกันห่าง `> maxSamplePairGap_s × 1000` ms (หรือ `now_ms − t_last` เกินค่านี้ที่ `tick`) ชุดที่รอยืนยันถูกล้างก่อนประมวล sample ถัดไป · sample หลังช่องว่างเริ่มชุดใหม่ (`firstAt_ms` = sample นั้น) · ถ้าสถานะเป็น `in` ช่องว่างเดียวกันทำให้ออกแบบ `no_evidence` ตาม 5.3 · เหตุผล: ชุดกลับเข้าที่ค้างครึ่งทางจะตรึง `P` (4.3) ข้ามช่วงแอปปิดยาวแล้วกลับ Active ย้อนหลังได้ ขัด R18 (vector `runTimeline` "half-built return run followed by a 20-minute gap")
- เมื่อยืนยัน transition มีผลที่ `firstAt_ms` ของชุด (ไม่ใช่เวลาที่ยืนยัน และไม่ใช่ sample แรกที่ "นับ") · event `run_state_changed.at_ms = firstAt_ms` · `packages/geo` ที่ย้อนไป sample แรกที่นับต้องแก้ตาม (handoff ของ P2-F05-T20 ถึง location-engineer)
- ชุดที่ล้มไม่ทิ้งร่องรอย: เวลาในช่วงนั้นเป็นของสถานะเดิม
- ผลต่อ rewardWindow: ออก = นาฬิกาหยุดย้อนที่ `firstAt_ms` · กลับเข้า = นาฬิกาเดินต่อตั้งแต่ `firstAt_ms` และคู่ sample ภายในชุดที่เข้าเงื่อนไข F05 R05 นับระยะย้อนหลัง · วิธีทำโดยไม่เก็บรายการ sample อยู่ใน F05 หัวข้อ 3.5 (ตัวสะสม scratch)

### 5.3 ไม่มีหลักฐาน (R13, R14, E3, E7)

- ขณะสถานะยืนยันเป็น `in`: ถ้า `now_ms − t_last > maxSamplePairGap_s × 1000` (`t_last` = sample ที่ใช้ได้ล่าสุด) → ออกโดย `cause: no_evidence` ที่ `at_ms = t_last` · ชุดออกที่ยังไม่ยืนยันถูกทิ้ง (ใช้ `t_last` ตามข้อความ R14 ไม่ใช่ `firstAt_ms` ของชุด)
- ขณะเป็น `out`: ไม่มีหลักฐานไม่ทำอะไรเพิ่ม เวลานอกเดินด้วย `now_ms` ตามปกติ (R13)
- การกลับมามีหลักฐาน: sample ที่ใช้ได้ตัวแรกหลังช่องว่างเริ่มชุดใหม่ตามปกติ · คู่ที่คร่อมช่องว่างห่างเกิน `maxSamplePairGap_s` จึงไม่นับระยะ (F05 R06)

### 5.4 เวลานอกและ timer ของสถานะ (R12, R13, R18)

- `exitStartedAt_ms` = `at_ms` ของการออก (5.2 หรือ 5.3) · เวลานอก ณ เวลา `t` = `t − exitStartedAt_ms` · กลับ Active = `exitStartedAt_ms := null`
- timer ที่ `runTimers` สร้าง (ประมวลผลเมื่อ `at_ms ≤ H` ตามหัวข้อ 4.3):
  - Grace → Suspended ตามขอบใน `_note` ของ `balance.dungeons.runState` (เวลานอก `≤ graceMax_s` = Grace · `> graceMax_s` = Suspended) · engine เทียบเป็น ms: Suspended เมื่อ `t − exitStartedAt_ms > graceMax_s × 1000` · `at_ms` ของ event = ms แรกที่เข้าเงื่อนไข
  - Ended `timeout` เมื่อ `t − exitStartedAt_ms > suspendedMax_s × 1000` · `endedAt_ms = exitStartedAt_ms + suspendedMax_s × 1000` (R18) · ผู้เล่นที่เปิดแอปหลังจากนั้นเห็นสรุปทันที
  - การกลับเข้าที่ backdate ไปก่อนขอบ (เช่น ชุดกลับเข้าเริ่ม 2:58 ยืนยัน 3:03) ทำให้ไม่เคยเป็น Suspended เพราะ timer รอ `H` · ตรง acceptance 4 ของ spec (2:59 / 3:01 / 14:59 / 15:01)
- `suspendedTimeCounts`, `rewardTickDuringGrace`, `rewardTickDuringSuspended` ค่าปัจจุบันเป็น `false` ทั้งหมด · engine อ่านค่าและ throw `UnsupportedConfigError` ถ้าเป็น `true` ใน Phase 2 (fail closed · ไม่มี spec ของพฤติกรรมนั้น)

## 6. Speed lock (R20–R24, E13, E14)

- ความเร็วของ lock ใช้คู่ของ sample ที่ผ่านด่านเวลาและ `accuracy_m ≤ maxSampleAccuracy_m` (**ไม่ผ่านตัวกรอง outlier ความเร็ว** เพราะตัวกรองนั้นทิ้ง sample ของรถที่เร็วกว่า `outlierSpeed_kmh` และจะทำให้รถไม่ติด lock) · คู่ที่ห่างเกิน `maxSamplePairGap_s` ไม่ให้ความเร็ว (ล้มชุด)
- ความเร็วของคู่ = `pairSpeed_kmh(a, b)` ของ geo (v1 ดิบ · P2-F05-T13 เปลี่ยนภายในโดยคง signature)
- **เข้า lock:** ชุดคู่ติดกันที่ `> speedLock_kmh` ยาวรวม (เวลาของ sample สุดท้าย − sample แรกของคู่แรก) `≥ lockSustained_s` · มีผลที่ sample แรกของคู่แรก (backdate) · spike เดียวของ drift ให้คู่เร็วสองคู่ติดกันราว 2 วินาที จึงไม่ถึงเกณฑ์
- **ปลด lock:** ชุดคู่ติดกันที่ `≤ speedLock_kmh` ยาวรวม `≥ unlockSustained_s` · มีผลที่ sample แรกของชุด (backdate · D-094 ใช้กฎเดียวกับ presence) · ระหว่าง lock ที่ไม่มี sample ไม่ปลด (ไม่มีหลักฐานว่าช้าลง)
- ผลระหว่าง lock (R21): นาฬิกา rewardWindow หยุด · ไม่มี hit · `confirm` ถูกปฏิเสธ `speed_lock` · ลำดับ approach ของ check-in ล้ม (7.2) · run state ยังตัดสินจากตำแหน่งตาม 5 (lock ไม่ใช่เวลานอก)
- ผลต่อระยะ: คู่ที่ `pairSpeed_kmh > speedLock_kmh` ไม่นับระยะเสมอ (F05 R05 ข้อ 5 ที่ tech note นี้เพิ่มเป็นผลของ R21 + backdating) · การย้อน lock จึงไม่ต้องหักระยะที่นับไปแล้ว มีแต่การย้อนนาฬิกา
- lock ก่อนมี run ใช้ state เดียวกัน (`state.lock`) · event `anticheat_speed_lock_triggered` ทั้งเข้าและออก พร้อม `inRun`
- lock ไม่ทำให้ run จบเอง · ออกจาก polygon ระหว่าง lock เป็นเวลานอกตามปกติ

## 7. Check-in และ confirm (R01–R11, E4–E6, E15, E16 · ADR 0003 7)

### 7.1 `PresenceStrategy`

```ts
type CheckInRejectReason = 'speed_lock' | 'poor_accuracy' | 'not_enough_trace' | 'no_approach_from_outside';
interface CheckInContext {
  readonly approach: ApproachState;          // 7.2
  readonly latest: ClassifiedSample | null;  // sample ล่าสุดที่ผ่านด่านเวลา (ใช้ได้หรือไม่ก็ได้)
  readonly locked: boolean;                  // state.lock ณ H
  readonly dungeonId: string;
  readonly polygon: DungeonGeometry;
  readonly now_ms: number;
}
```

- `selectPresenceStrategy(record.verification_mode)`: `continuous_gps` → ตัวจริง · `entry_exit` → object ที่ทุก method throw `NotImplementedError` · ค่าอื่น → throw `UnknownVerificationModeError` · `floor_level !== null` → dungeon เล่นไม่ได้ (`unsupported_mode`) · validator ของ `tools/dungeons` กันไว้ก่อนแล้ว engine กันซ้ำ (fail closed)
- `session` จับ `NotImplementedError` / `UnknownVerificationModeError` แล้วคืน `checkin_rejected` reason `unsupported_mode` (ไม่ crash) และ `selectOpening` แสดง dungeon นั้นเป็น "ปิด"

### 7.2 approach state (R07, R11) · ไม่มีรายการพิกัด

```ts
interface ApproachState {
  readonly chainStartAt_ms: number | null;   // sample แรกของลำดับต่อเนื่องปัจจุบัน
  readonly lastAt_ms: number | null;         // sample ล่าสุดในลำดับ
  readonly anchor: GeoSample | null;         // ใช้กับตัวกรอง outlier เท่านั้น · memory เท่านั้น
  readonly reanchor: readonly GeoSample[];   // ≤ outlierReanchorSamples · memory เท่านั้น
  readonly outsideSeenAt_ms: Readonly<Record<string, number>>; // dungeonId → sample ที่ใช้ได้ล่าสุดที่อยู่นอก polygon นั้นในลำดับนี้
}
```

- sample ที่ผ่านด่านเวลาแต่ละตัว (ก่อนมี run และระหว่าง run เพื่อรองรับ E15):
  - ถูกตัวกรองขั้น 1 ทิ้ง (accuracy หรือ outlier) · คู่กับ `lastAt_ms` ห่างเกิน `maxSamplePairGap_s` · หรืออยู่ใน lock → **ลำดับล้ม**: `chainStartAt_ms := t` ของ sample นี้ถ้าใช้ได้และไม่ lock ไม่งั้น `null` · `outsideSeenAt_ms := {}`
  - ใช้ได้: `lastAt_ms := t` · สำหรับทุก dungeon ใน `params.dungeons` ที่ sample อยู่นอก polygon → `outsideSeenAt_ms[id] := t` (ทดสอบ bbox ก่อน · นอก bbox = นอก polygon)
- เพดานความยาวของลำดับไม่ต้องมี เพราะไม่มีรายการ sample · ผู้เล่นที่เดินเข้ามาพร้อมแอปแล้วเดินในสวนนานก่อนกด "เข้า" ยังผ่านตราบที่ลำดับไม่ล้ม (R11)
- `pre` ไม่ persist (`app.privacy.onDeviceSamples.persistPreRunApproach = false`) · เปิดแอปใหม่ = ลำดับเริ่มใหม่ (E4 ถ้ายืนกลางสวน)

### 7.3 กฎตัดสิน `checkIn` (ลำดับเหตุผลตาม R08)

ให้ `L` = sample ล่าสุดที่ผ่านด่านเวลา

1. `locked` → `speed_lock`
2. `L` ไม่มี หรือ `L.accuracy_m ≥ anticheat.checkIn.maxAccuracy_m` (น้อยกว่าแบบเคร่ง · E6: เท่าเกณฑ์ปฏิเสธ) → `poor_accuracy`
3. `chainStartAt_ms` เป็น `null` หรือ `L.t − chainStartAt_ms < minContinuousApproach_s × 1000` หรือ `L` ไม่ใช่ `lastAt_ms` (ตัวล่าสุดล้มลำดับ) → `not_enough_trace` พร้อม `readyIn_s = ceil(minContinuousApproach_s − (L.t − chainStartAt_ms)/1000)` เมื่อคำนวณได้
4. `L` ไม่อยู่ใน polygon ที่เลือก หรือ `outsideSeenAt_ms[dungeonId]` ไม่มี → `no_approach_from_outside` (เมื่อ `teleportIntoPolygonAllowed = false` · ค่า `true` ข้ามข้อนี้)
5. ผ่าน

- E5 teleport: คู่ที่กระโดดถูกตัวกรอง outlier ทิ้ง → ลำดับล้ม → `not_enough_trace` ก่อน แล้ว `no_approach_from_outside` เมื่อครบเวลา (ไม่มี sample นอก polygon ในลำดับใหม่)
- ข้อ 3 ตีความ "ลำดับยาวอย่างน้อย `minContinuousApproach_s` สิ้นสุดที่ sample ล่าสุด" ว่า `L.t − chainStartAt_ms ≥` ค่านั้น (ระยะเวลาระหว่าง sample แรกและสุดท้าย)

### 7.4 sequence ของ confirm (T1–T4)

```
client                        session.sessionStep(confirm)                  run / strategy
------                        ----------------------------                  --------------
เห็นผู้เล่นอยู่ใน polygon      
 (geo, แสดงผล) → เปิด popup   
selectCheckInPreview ทุกครั้ง  
 ที่ state เปลี่ยน → ปุ่มเข้า   
กด "เข้า" → crypto runSeed →   1 ด่านเวลาของ now_ms (4.4)
                              2 run !== null → reject run_active (R01, R04)
                              3 dungeonId ไม่มีใน params → throw (บั๊ก caller)
                              4 isOpenAt(hours, now_ms) false → reject dungeon_closed (R27)
                              5 strategy = selectPresenceStrategy(...) ──────► ไม่รองรับ → reject unsupported_mode
                              6 strategy.checkIn(ctx) ─────────────────────► reason ตาม 7.3
                              7 ผ่าน: สร้าง RunState
                                  startedAt_ms = now_ms · presence = in (ยืนยันแล้ว)
                                  clockIntervals เริ่มเดินที่ now_ms (F05 R02)
                                  reward accumulator เริ่มที่ τ = 0 · anchor ว่าง
                                  closesAt_ms = openingChangeAfter(...) (8.3)
                              8 event dungeon_entered (หรือ checkin_rejected)
แสดงจอ run / สถานะรอ          
```

- ปฏิเสธไม่มีผลข้างเคียงนอกจาก event (R08) · กดใหม่ได้ทันที
- sample ก่อน `startedAt_ms` ไม่นับระยะ (F05 R02): ตัวสะสมเริ่มว่าง · เฉพาะ sample ที่ `t_ms ≥ startedAt_ms` เข้าตัวสะสม (fix ที่ได้ก่อนกดแต่ส่งถึงหลังกดไม่เข้า) · คู่แรกที่นับได้คือ sample ที่ใช้ได้ตัวแรกและตัวที่สองหลัง confirm · vector ของ P2-F05-T20 ใช้กฎนี้

## 8. เวลาทำการ (R25–R31, E11, E12 · ADR 0003 9.2)

### 8.1 รูป normalized ใน artifact

```json
"opening_hours": {
  "source": "osm",
  "weekly": { "1": [[300, 1260]], "2": [[300, 1260]], "3": [], "4": [[0, 1440]], "5": [[300, 1260]], "6": [[1320, 1440]], "7": [[0, 120]] },
  "exceptions": [ { "date": "2026-10-13", "intervals": [] } ]
}
```

- `weekly` มี key `"1"`..`"7"` ครบ (ISO weekday, 1 = จันทร์) · ค่า = รายการช่วง `[start_min, end_min)` นาทีนับจากเที่ยงคืนเวลาท้องถิ่น · `0 ≤ start < end ≤ 1440` · เรียงและไม่ทับกันภายในวัน · `[]` = ปิดทั้งวัน · เปิด 24 ชม. = `[[0, 1440]]` ทุกวัน (ต้องระบุชัด R26)
- ช่วงข้ามเที่ยงคืน (`22:00-02:00`) ถูก `tools/dungeons` แยกเป็น `[1320, 1440)` ของวันนั้น + `[0, 120)` ของวันถัดไปตอน build · runtime ไม่ parse ข้อความ OSM
- `exceptions` (ไม่บังคับ) = วันที่ท้องถิ่น `YYYY-MM-DD` ที่ใช้ `intervals` แทน `weekly` ของวันนั้น · ใช้กับวันหยุดที่ level-designer กรอกเอง (`PH` ของ OSM → `manual_required` แล้วกรอก)
- `source`: `osm` (แปลงจากไวยากรณ์ย่อยของ ADR 0003 9.2) หรือ `manual` · record ต้นทางที่เป็น `manual_required` และยังไม่มีตารางกรอกเอง → build ล้ม (R26) · ไม่มีค่า `manual_required` ใน artifact
- `sunrise-sunset` (เช่น PN-3) อยู่นอกไวยากรณ์ย่อย → `manual_required` · level-designer กรอกเวลาคงที่ที่ปลอดภัย (เช่น ช่วงสว่างที่สั้นที่สุดของปี) พร้อมเหตุผลใน record

### 8.2 การประเมิน (pure ใน `src/run`)

```
local_ms  = t_ms + utcOffset_min × 60 000            (balance.dungeons.openingHours.utcOffset_min · กรุงเทพฯ ไม่มี DST)
day       = floor(local_ms / 86 400 000)             (วันที่ 0 = 1970-01-01 = พฤหัส)
weekday   = ((day + 3) mod 7) + 1                    (1 = จันทร์ … 7 = อาทิตย์)
msOfDay   = local_ms − day × 86 400 000
intervals = exceptions[date(day)] ?? weekly[weekday]
open      = ∃ [s, e) ∈ intervals : s × 60 000 ≤ msOfDay < e × 60 000
```

- ใช้ `mod` แบบผลไม่ติดลบ · ห้ามใช้ `Date`, `Intl`, `getTimezoneOffset` หรือ timezone ของเครื่อง (lint ADR 0003 8.2 กัน `new Date()` ไม่มี argument อยู่แล้ว · ใช้เลขล้วนทั้งหมด)
- `openingChangeAfter(hours, t_ms, utcOffset_min, horizon_d)` คืนเวลาถัดไปที่สถานะเปลี่ยน โดยรวมช่วงที่ติดกันข้ามเที่ยงคืน (`[1320,1440)` + `[0,120)` วันถัดไป = ปิด 02:00) · ค้นไม่เกิน `horizon_d` วัน (ค่า 8 เป็นค่าคงที่ของอัลกอริทึม: หนึ่งสัปดาห์ + หนึ่งวันพอสำหรับตารางรายสัปดาห์ · ไม่ใช่ค่า balance) · ไม่พบ = `null` (เปิดตลอดหรือปิดตลอดในขอบฟ้า)

### 8.3 ผลต่อ run

- `confirm`: ต้อง `open` ที่ `now_ms` (R27) · `closesAt_ms = openingChangeAfter(...)` ที่ `now_ms`
- แจ้งใกล้ปิด: timer `dungeon_closing_soon` ที่ `closesAt_ms − closingSoonNotice_s × 1000` ถ้าเวลานั้น `> startedAt_ms` (ถ้าเข้าหลังจุดนั้น popup แจ้งแล้วตาม R28 ไม่แจ้งซ้ำ) · ครั้งเดียวต่อ run
- ปิดระหว่าง run: timer `dungeon_closed` ที่ `closesAt_ms` ไม่ว่าสถานะใด (Active / Grace / Suspended, lock หรือไม่) · จ่ายตาม F05 R21–R22 · E11 Suspended จบทันทีที่เวลาปิด
- `exceptions` ที่ทำให้ปิดเร็วกว่าตารางถูกรวมใน `openingChangeAfter` แล้ว · artifact ไม่เปลี่ยนระหว่าง run ใน Phase 2
- การแสดงผลบนแผนที่ (เปิด/ปิด, เวลาเปิดถัดไป) ใช้ `selectOpening` ที่เรียกฟังก์ชันเดียวกัน (R31)

## 9. Sequence ต่อ step

### 9.1 input `sample`

1. **ด่าน `now_ms`** (4.4): ถอยหลังเกินค่าเผื่อ → `clock_invalid` แล้วจบ step
2. **ด่านเวลาของ sample** (4.2): ไม่ผ่าน → `sample_rejected` แล้วไปขั้น 8 (เวลายังเดินได้)
3. **จัดชั้นครั้งเดียว** (`classified`): `accuracyOk` (`≤ maxSampleAccuracy_m`) · ผลตัวกรองขั้น 1 (`kept` / `dropped_accuracy` / `dropped_outlier` / `reanchored`) · `lockSpeed_kmh` เทียบ sample ล่าสุดที่ `accuracyOk` · มี run: `inside` ของ polygon ของ run
4. **speed lock** (6): อัปเดตชุด · ยืนยันเข้า/ออก lock พร้อม `at_ms`
5. **approach** (7.2): อัปเดตลำดับ (ทำทั้งตอนไม่มีและมี run)
6. **presence** (5.2): มี run และ sample ใช้ได้ → อัปเดตชุด · ยืนยัน transition พร้อม `at_ms`
7. **ตัวสะสม rewardWindow** (F05 หัวข้อ 3): ป้อน sample ให้ตัวสะสมหลักและ scratch ตามสถานะนาฬิกา · ยืนยันกลับเข้า/ปลด lock = รับ scratch เป็นตัวหลัก · ยืนยันออก/lock = ย้อน τ
8. **คำนวณ `H`** (4.3) และเช็กไม่มีหลักฐาน (5.3)
9. **ประมวลเส้นเวลาถึง `H`** ตามลำดับเวลาและลำดับความสำคัญใน 9.3: หน้าต่างครบ → tick + drop (F05) · hit + ผล HP (F06) · timer ของสถานะ · ใกล้ปิด · ปิด
10. **จบ run** ถ้ามีเหตุ: จ่ายตาม F05 R21 · สร้าง `RunSummary` · **ลบทุก field ที่มีพิกัด** · `run := null` · `lastSummary := summary` · event `dungeon_exited`
11. **purge ตามเพดาน** (11.2): sample ใน state ที่ `t < now_ms − maxAge_s × 1000` ถูกลบ · เกิน `maxCount` ลบตัวเก่าสุด (ตัวสะสมถือว่าไม่มี anchor)
12. คืน `{ state, events }`

### 9.2 input `tick` / `exit` / `ackSummary`

- `tick`: ขั้น 1, 8, 9, 10, 11
- `exit`: ขั้น 1, 8, 9 (ตัดสินอดีตถึง `H` ก่อน · tick ที่ครบก่อนกดออกได้ตามปกติ) แล้วจบ `manual_exit` ที่ `now_ms` · ชุดที่รอยืนยันถูกทิ้ง
- `ackSummary`: ล้าง `lastSummary` เท่านั้น

### 9.3 ลำดับเมื่อ `at_ms` เท่ากัน

1. หน้าต่าง rewardWindow ครบ → tick (F05 R19, D-094: tick ก่อน hit)
2. hit และลำดับ R-B1 (F05 R18 · ของ tick ในข้อ 1 อยู่ในถุงแล้ว)
3. auto-retreat / death (ผลของข้อ 2)
4. transition ของสถานะ (ออก, กลับเข้า, lock, ปลด lock, Grace → Suspended)
5. `dungeon_closing_soon`
6. `dungeon_closed` (มาก่อน `timeout` ถ้าเท่ากัน · หลักการข้อ 3 ของ GDD: ปิดจ่าย tick บางส่วน timeout ไม่จ่าย)
7. `timeout`

- เหตุจบ run แรกที่ถึงตัดสินผล · เหตุหลังจากนั้นถูกทิ้ง
- ช่วงที่นาฬิกาเดินเป็นช่วงครึ่งเปิด `[เริ่ม, หยุด)` สำหรับ hit (hit ที่ `at_ms` = เวลาหยุดพอดีไม่เกิด) · หน้าต่าง rewardWindow ปิดขวาตาม ADR 0003 5.2 ข้อ 3 (หน้าต่างที่ τ ครบพอดี ณ เวลาหยุดถือว่าครบ)

## 10. แอปถูกปิดแล้วเปิดใหม่ และ storage adapter (E7, E8, acceptance 6)

### 10.1 การเขียน (client · P2-F04-T25)

- key เดียว `kw.p2.session` ใน `localStorage` · ค่า = `JSON.stringify(toPersisted(state, now_ms, params))`
- `PersistedSession = { schemaVersion, savedAt_ms, state }` · `toPersisted` ตัด `pre` ทิ้ง (7.2) และ purge ตามเพดาน (11.2) ก่อนคืน
- จังหวะเขียน: ทันทีเมื่อ step คืน event อย่างน้อยหนึ่งตัว (tick, transition, จบ run ไม่หายเมื่อแอปถูกปิด) · นอกนั้นไม่ถี่กว่า `app.client.storage.sessionPersistInterval_s` (เสนอ 5) · และทุกครั้งที่ `visibilitychange` เป็น hidden และ `pagehide`
- ความเสียหายสูงสุดเมื่อถูกฆ่าก่อนเขียน = ระยะและ anchor ของไม่กี่วินาทีสุดท้าย · ผลคือ `t_last` ที่กู้ได้เก่ากว่าจริงเล็กน้อย (เวลานอกนับเร็วขึ้นไม่กี่วินาที · ไม่มีทางได้รางวัลเกินจริง)
- Phase 2 ไม่ใช้ IndexedDB / Service Worker / Background Sync (ขนาด state ไม่กี่ KB · Web ไม่ได้ sample ตอน hidden อยู่แล้ว)

### 10.2 การอ่านตอนเปิดแอป

```
boot → อ่าน kw.p2.session
  ไม่มี                     → createSession(now_ms, player)
  JSON.parse ล้ม             → ทิ้ง · telemetry session_state_discarded{reason: corrupt} · createSession
  fromPersisted(raw, now_ms, params)
    schema_mismatch          → ทิ้ง (ไม่มี migration ใน Phase 2) · telemetry reason schema_mismatch · createSession
    unknown_dungeon          → run อ้าง dungeon ที่ไม่มีใน artifact ใหม่: ทิ้ง run เก็บ player · telemetry reason unknown_dungeon
    ok                       → state (sample เก่ากว่าเพดานถูก purge แล้ว)
  sessionStep(state, {type: 'tick'}, now_ms, params)      ← ตัดสินช่วงที่หายทันที ก่อนแสดงจอแรก
  แสดง: lastSummary ≠ null → หน้าสรุป (R18) · run ≠ null → จอ run ตามสถานะ · ไม่งั้นแผนที่
  เริ่ม LocationProvider (ถ้ามี consent) → sample ใหม่เข้า sessionStep ตามปกติ
```

- `fromPersisted` ตรวจโครงสร้างด้วยโค้ดธรรมดา (ไม่มี Ajv · C1-4) · ค่าผิดชนิด = `corrupt` · ไม่ throw ออกไปถึง UI · ผลคือ "ทิ้งแล้วเริ่มใหม่ไม่ crash" (acceptance ของ P2-F04-T25)
- เมื่อทิ้ง state ผู้เล่นเสีย progress ต้นแบบของ Phase 2 (ไม่ใช่รางวัลจริง · C1-5) · ยอมรับได้

### 10.3 ผลของเวลาที่หาย (ตัวอย่างใช้ค่าปัจจุบัน 180 / 900 วิ เพื่ออธิบายเท่านั้น)

| หายไป (นับจาก sample ที่ใช้ได้ตัวสุดท้าย `t_last`) | ผลหลัง `tick` แรก | เมื่อ sample กลับมา |
| --- | --- | --- |
| ≤ `maxSamplePairGap_s` | ยัง Active (หลักฐานยังสด) | คู่ต่อได้ตามปกติ |
| > `maxSamplePairGap_s` และ ≤ `graceMax_s` | Grace ตั้งแต่ `t_last` · นาฬิกา rewardWindow หยุดที่ `t_last` (F05 G8) | อยู่ในเขตครบชุดยืนยัน → Active ย้อนที่ sample แรกของชุด · คู่คร่อมช่องว่างไม่นับ |
| > `graceMax_s` และ ≤ `suspendedMax_s` | Suspended | เหมือนข้างบน |
| > `suspendedMax_s` | Ended `timeout` ที่ `t_last + suspendedMax_s` · หน้าสรุป · ของใน run เก็บครบ | — |
| เวลาปิดทำการอยู่ในช่วงที่หาย | Ended `dungeon_closed` ที่ `closesAt_ms` ถ้ามาก่อน timeout (9.3) · tick บางส่วนคิดจากเวลา Active ที่สะสมถึง `t_last` | — |
| นาฬิกาเครื่องถูกตั้งย้อนระหว่างปิด | `clock_invalid` (4.4) | — |

- run ไม่ถูกลบเพราะแอปถูกปิด (E7) · `balance.dungeons.offlineEvidence.connectionLostEndsRunAfter_s` (900) ของ Phase 3 มีค่าเท่า `suspendedMax_s` · Phase 2 ใช้ `suspendedMax_s` ตัวเดียวตาม R12 (config lint ของ P2-F04-T24 รายงานเป็น ERROR ถ้าสองค่าไม่เท่ากัน ทำให้ `pnpm test` ล้ม · D-105)
- เน็ตหลุด (E8) ไม่มีผลต่อ engine · banner offline เป็นของ client

### 10.4 storage เต็มและการลบข้อมูลในเครื่อง

- `setItem` throw (`QuotaExceededError`, Safari private mode ที่ quota 0) ตอนเขียน session → ตัด ring buffer ของ telemetry ครึ่งหนึ่งแล้วลองใหม่ → ล้าง telemetry ทั้งหมดแล้วลองใหม่ → ยังล้ม: เก็บ session ในหน่วยความจำ ตั้งธง `storageDegraded` ให้ HUD/ตั้งค่าแสดง และเล่นต่อ (`app.privacy.localData.onQuotaExceeded`) · telemetry เขียนไม่ได้ → ทิ้ง event เก่าสุด **ไม่แตะ session**
- ปุ่ม "ลบข้อมูลในเครื่อง" (P2-F06-T09, C2-6): ลบทุก key ที่ขึ้นต้น `app.privacy.localData.storageKeyPrefix` แล้วเขียน ring buffer ใหม่ที่มี event `local_data_cleared` ตัวเดียว (ไม่มี property) จากนั้นโหลดหน้าใหม่เข้า onboarding · event นี้จึงเป็นบรรทัดแรกของ export ถัดไป (ชื่อ event รอ product-manager ประกาศ · หัวข้อ 12.4)

## 11. เพดานการเก็บ sample ในเครื่อง (D-088, C2-5, GD B-08)

### 11.1 key (`config/app/privacy.json#onDeviceSamples`)

| key | ค่า | ความหมาย |
| --- | --- | --- |
| `maxAge_s` | 300 | sample ใน state (หน่วยความจำและ `kw.p2.session`) เก่ากว่า `now_ms − maxAge_s` ถูกลบทุก step และตอนโหลด |
| `maxCount` | 16 | จำนวน sample ที่มีพร้อมกันได้สูงสุด |
| `persistPreRunApproach` | false | `pre` (anchor ของ check-in) ไม่ลง storage |
| `deleteOnRunEnd` | true | จบ run = ลบทุก field ที่มีพิกัดก่อน persist ครั้งถัดไป |
| `hudSamplesMemoryOnly` | true | sample ย้อนหลังของ `gateDiagnosticWindows` อยู่ในหน่วยความจำของ HUD เท่านั้น |

- ข้อจำกัดที่ config lint (P2-F04-T24) ตรวจ: `maxAge_s ≤ balance.privacy.positionLogTtl_s` (86,400) · `maxAge_s ≤ balance.dungeons.movementGate.window_s` (D-088 "ไม่เกินหนึ่งหน้าต่าง") · `maxAge_s ≥ maxSamplePairGap_s` · `maxCount ≥ 2 × (1 + outlierReanchorSamples) + 2`
- **แก้ไข P2-H29 (TG-12 ของ tech gate F04 + F05):** ไม่มีโค้ด runtime ตัวใดอ่าน `maxAge_s`, `maxCount` หรือ `deleteOnRunEnd` · คำว่า "ถูกลบทุก step และตอนโหลด" ในตารางข้างบนหมายถึงผลที่ได้ ไม่ใช่ขั้นตรวจที่อ่านค่า · เพดานเป็นจริงเพราะรูปของ state:
  1. state ไม่มีรายการ sample ใดเลย (ADR 0003 5.4) · field ที่มีพิกัดมีจำนวนคงที่ตาม 11.2
  2. buffer `pending` ของตัวกรอง outlier ถูกตัดทิ้งเมื่อยาวถึง `outlierReanchorSamples` (`packages/geo/src/filter.ts` `gateFilterStep`) จึงไม่โตเกินค่านี้
  3. จบ run = `run` เป็น `null` ตัวสะสมของ reward ทั้งสองชุดจึงหายไปพร้อมกัน
  4. anchor ทุกตัวถูกแทนด้วย sample ใหม่ทุกครั้งที่รับ sample ที่ใช้ได้ จึงไม่มีพิกัดเก่าค้าง ยกเว้นช่วงที่ไม่มี sample เข้าเลย ซึ่งค้างอยู่ในหน่วยความจำเท่านั้น (ข้อ 5)
  5. **persist ตัดพิกัดทุกตัวทิ้ง** (`packages/shared/src/session/persistence.ts` `stripCoordinates` ใช้ทั้งใน `toPersisted` และ `fromPersisted`): `latestSample` → `null` · `lock.lastAccurate` → `null` (พร้อม `runStart_ms`, คงไว้แค่ `locked`) · `run.reward` และ `run.rewardScratch`: `filter.anchor` / `filter.pending` → ค่าเริ่มต้น และ `grid.last` / `grid.lastPoint` → `null` (P2-H02) · `SessionState.checkInFilter` → ค่าเริ่มต้นของตัวกรอง (P2-X34, BUG-P2-002) · `pre` → `APPROACH_INIT` · blob เก่าที่ยังมีพิกัดถูกตัดตอนโหลดด้วย
  6. ผลคือ `kw.p2.session` ไม่มีพิกัดเลย ซึ่งเข้มกว่า `maxAge_s` / `maxCount` / `deleteOnRunEnd` · ค่าทั้งสามจึงเป็นเพดานที่ config lint ยืนยันว่าโครงสร้างอยู่ใต้ ไม่ใช่ค่าที่โค้ดต้องอ่าน · field ใหม่ที่มีพิกัดต้องเพิ่มใน `stripCoordinates` พร้อม test (tech gate ตรวจ)

### 11.2 sample ที่ state มีได้ (ทั้งหมด)

| ที่อยู่ | จำนวนสูงสุด | persist |
| --- | --- | --- |
| `pre.anchor` + `pre.reanchor` | 1 + `outlierReanchorSamples` | ไม่ (`APPROACH_INIT`) |
| `checkInFilter.anchor` + `pending` (P2-X34) | 1 + `outlierReanchorSamples` | ไม่ (ตัดพิกัด) |
| `lock.lastAccurate` (sample ล่าสุดที่ `accuracyOk`) | 1 | ไม่ (ตัดพิกัด · P2-H02) |
| `latestSample` | 1 | ไม่ (ตัดพิกัด) |
| `run.reward` `filter.anchor` + `pending` + `grid.last` / `lastPoint` | 3 + `outlierReanchorSamples` | ไม่ (ตัดพิกัด · P2-H02) · ตัวนับระยะและ `k` คงไว้ |
| `run.rewardScratch` (เมื่อมีชุดกลับเข้า/ปลด lock ที่รอยืนยัน) | 3 + `outlierReanchorSamples` | ไม่ (ตัดพิกัด · P2-H02) |

- ไม่มีรายการ sample ของหน้าต่าง ของ approach หรือของชุดที่รอยืนยัน (ADR 0003 5.4 · ชุดรอยืนยันเก็บแค่จำนวนและเวลา)
- `lastGrid` เป็นจุด interpolate ไม่ใช่ fix จริง แต่ถือเป็นพิกัดและอยู่ใต้เพดานเดียวกัน
- test ของ P2-F04-T20 / T25: หลัง `dungeon_exited` `JSON.stringify(toPersisted(...))` ไม่มี key `lat` / `lng` และไม่มีเลขในช่วงพิกัดไทยตาม `app.telemetry.export.coordinateLikeNumberGuard`

## 12. Telemetry sink ในเครื่อง (D-088, C2-2..C2-4)

### 12.1 ทางไหล

```
sessionStep → events (ไม่มีพิกัด) ─┐
client UI (onboarding, nav, gps)  ─┼→ mapper (ตาราง 12.3, allowlist ชื่อ + property) → ring buffer (memory + kw.p2.telemetry) → export Blob
```

- engine ไม่รู้จัก telemetry · mapper อยู่ใน `apps/client/src/telemetry/` (P2-F04-T25) · ชื่อและ property ต้องตรง `product/telemetry-events.md` ทุกตัว · ชื่อที่ไม่รู้จัก = ไม่เก็บ + warning ใน dev
- ไม่มี request ออกนอกเครื่อง (`app.telemetry.localSink.networkUploadAllowed = false`, ไม่มี analytics SDK · C2-1)

### 12.2 ring buffer (`config/app/telemetry.json#localSink`)

- record ภายใน = `{ event_name, client_ts_ms, session_id, platform, app_version, properties }` · `session_id` สุ่มใหม่ทุกครั้งที่โหลดหน้า (`crypto.randomUUID` ตัดเหลือ 8 hex) · ไม่มี `account_id` ใน Phase 2
- เพดาน `ringBufferMaxEvents` 3000 และ `ringBufferMaxChars` 600,000 (ความยาว JSON) · เกิน = ทิ้งเก่าสุด (`evictionOrder`)
- เขียนลง storage ไม่ถี่กว่า `persistInterval_s` (10) และเมื่อ `pagehide` / hidden · เขียนไม่ได้ = ทิ้งเก่าสุด (10.4)

### 12.3 export (`config/app/telemetry.json#export`)

- ปุ่ม export ใน HUD / ตั้งค่าของ profile playtest → `new Blob([jsonl], { type: mimeType })` → `URL.createObjectURL` → `<a download>` · ชื่อไฟล์ `kw-p2-telemetry-<8 hex สุ่ม>.jsonl` ไม่มีวันที่
- แต่ละบรรทัด `{ event_name, t_rel_ms, session_id, platform, app_version, properties }` · `t_rel_ms = client_ts_ms − client_ts_ms ของบรรทัดแรก` · ไม่มีเวลาจริง (C2-4)
- ด่านก่อนสร้าง Blob (และ test ของ P2-F04-T25): ไม่มี property ชื่อใน `forbiddenPropertyNames` · ไม่มีเลขหรือสตริงตัวเลขที่ทศนิยม ≥ 4 หลักและอยู่ใน `latRange_deg` หรือ `lngRange_deg` · พบ = ตัด property นั้นทิ้งและนับใน HUD (ไม่ export ค่านั้น)

| engine event / เหตุใน client | telemetry event | สถานะในเอกสาร PM |
| --- | --- | --- |
| `dungeon_entered` | `dungeon_entered` (`entry_type` = `normal` \| `overlap_choice`, `party_size_at_entry_bucket` = `1`) | มีแล้ว |
| `dungeon_exited` | `dungeon_exited` (`exit_reason`, `duration_s_bucket`, `ticks_granted_count`) | มีแล้ว · **enum ไม่ตรง** (12.4) |
| `run_tick_granted` / `run_tick_denied` | ชื่อเดียวกัน (`party_size_bucket` = `1`, `full_role` = false, `roles_present` = class ตัวเอง) | มีแล้ว |
| `run_hp_low`, `run_auto_retreat`, `run_death` | ชื่อเดียวกัน | มีแล้ว |
| popup เปิด | `dungeon_confirm_shown` (`roles_present` = [] · Phase 2 ซ่อน, D-089) | มีแล้ว |
| สถานะ LocationProvider | `run_gps_status_changed` | มีแล้ว |
| `checkin_rejected` | `checkin_rejected` (`dungeon_id`, `reason`) | รอ P2-F04-T17 |
| `run_state_changed` | `run_state_changed` (`dungeon_id`, `from`, `to`, `cause`) | รอ P2-F04-T17 |
| `anticheat_speed_lock_triggered` | ชื่อเดียวกัน (`phase`, `in_run`) | รอ P2-F04-T17 |
| `dungeon_closing_soon` | `dungeon_closing_soon_notified` (`dungeon_id`) | รอ P2-F04-T17 |
| ปุ่มนำทาง | `navigation_link_opened` (`dungeon_id`, `target` = `google_maps` \| `apple_maps` \| `copy_fallback`, `fallback_auto` bool) | รอ P2-F04-T17 |
| ทิ้ง state (10.2) | `session_state_discarded` (`reason`) | รอ P2-F04-T17 |
| storage เต็ม (10.4) | `storage_quota_exceeded` (`evicted` = `telemetry_half` \| `telemetry_all` \| `none`) | รอ P2-F04-T17 |
| ลบข้อมูลในเครื่อง | `local_data_cleared` | รอ P2-F04-T17 |

### 12.4 ข้อที่ต้องให้ product-manager แก้ (handoff)

- `dungeon_exited.exit_reason` ปัจจุบัน `completed | auto_retreat | died | manual_exit | closed_by_moderator` · engine ใช้ `manual_exit | timeout | auto_retreat | death | dungeon_closed | emergency_close | clock_invalid` (spec F04 R17) · ขอให้ใช้ชุดของ engine (และ `suspended_by_reports` สำหรับ Phase 5) เพื่อไม่ต้องมีตารางแปลง
- event ที่ต้องประกาศเพิ่ม: 8 แถวที่ "รอ P2-F04-T17" ในตารางข้างบน · ถ้า PM เลือกชื่ออื่น mapper ตามชื่อของ PM (เอกสาร PM ชนะ protocol ข้อ 9)

## 13. Artifact ของ dungeon (TL B-12, ADR 0003 9.1, D-075)

### 13.1 ที่อยู่และการสร้าง

- `tools/dungeons` (P2-F04-T26) อ่าน `data/dungeons/` (P2-F04-T13) → validate ตาม `design/levels/dungeon-rules.md` + `packages/shared/schemas/dungeon.schema.json` → เขียน `data/dungeons/artifact/dungeons.client.v1.json` (commit) · คำสั่ง `pnpm dungeons:build` และ `pnpm dungeons:build --check` (อยู่ใน `pnpm test`: ไฟล์ที่ commit ต้องเท่ากับผล build · แบบเดียวกับ `tools/traces` `--check`)
- deterministic: เรียง dungeon ตาม `id` · key ของ object เรียงคงที่ · ไม่มีเวลาที่ build ในไฟล์ · ไม่มี network · path `data/dungeons/artifact/` ต้องเพิ่มใน Writes ของ P2-F04-T26 (handoff ถึง producer)
- ค่าของ build อยู่ใน `tools/dungeons/build.config.json` (location-engineer): `coordinateDecimals` (เสนอ 6 ≈ 0.11 ม.), `labelPoint.precision_m` (เสนอ 1), `labelPoint.projection` = `equirectangular` (ADR 0003 11.3) · ไม่ใช่ค่า balance จึงไม่อยู่ใน `config/balance/`
- client import ไฟล์นี้ทั้งไฟล์ได้ เพราะมีเฉพาะ field ตาม whitelist 13.2 · Phase 3 หลังบ้านรัน build เดียวกันตอน publish

### 13.2 รูปไฟล์ (`format_version` 1)

```json
{
  "format": "kw-dungeons-client",
  "format_version": 1,
  "source_sha256": "<sha256 ของ record ต้นทางที่ normalize แล้ว>",
  "attribution": ["© OpenStreetMap contributors, ODbL 1.0"],
  "dungeons": [
    {
      "id": "chatuchakPark",
      "name_key": "dungeon.chatuchakPark",
      "preset": "largePark",
      "level_range": { "min": 20, "max": 35 },
      "drop_table_id": "largeParkDefault",
      "verification_mode": "continuous_gps",
      "floor_level": null,
      "area_m2": 37689.0,
      "bbox": [100.50001, 13.75001, 100.50301, 13.75301],
      "geometry": { "type": "Polygon", "coordinates": [[[100.5, 13.75], "..."]] },
      "label_point": [100.5015, 13.7515],
      "nav_destination": { "point": [100.5009, 13.7501], "source": "entrance" },
      "search_name_key": "dungeon.chatuchakPark.search",
      "opening_hours": { "source": "osm", "weekly": { "1": [[300, 1260]], "...": [] }, "exceptions": [] }
    }
  ]
}
```

| field | กฎ |
| --- | --- |
| `id` | `^[a-z0-9-]+$` ไม่ซ้ำ · ค่าเดียวที่ telemetry อ้าง (`dungeon_id`) |
| `name_key`, `search_name_key` | pointer ไป `config/content/names.th.json` (narrative) · รูป key ที่ narrative-designer เลือก: `dungeon.<id>` และ `dungeon.<id>.search` (ไม่ใช่ `zone.*`) · ค่าในตัวอย่างเป็นตัวอย่างรูปแบบเท่านั้น (geometry สมมติ) · ไม่มีชื่อไทยใน artifact · `search_name_key` = ชื่อจริงที่ค้นในแอปแผนที่ได้ (ไม่มีคำขยาย) ใช้กับ fallback 14.3 · handoff ถึง narrative-designer |
| `preset`, `level_range`, `drop_table_id` | ต้องมีใน config (validator ตรวจ `drop_table_id`) |
| `verification_mode`, `floor_level` | v1 = `continuous_gps`, `null` เท่านั้น (ADR 0003 7) |
| `area_m2` | คำนวณตอน build · engine ใช้กับ `balance.drops.smallDungeon.smallDungeonMaxArea_m2` |
| `bbox` | `[minLng, minLat, maxLng, maxLat]` ใช้ตัดเร็วก่อน point-in-polygon |
| `geometry` | GeoJSON `Polygon` / `MultiPolygon` (RFC 7946 · rewind แล้ว: วงนอกทวนเข็ม) · ปัด `coordinateDecimals` |
| `label_point` | polylabel ของ polygon ที่ใหญ่สุด (D-075) · runtime ไม่คำนวณเอง |
| `nav_destination` | ทางเข้าที่ปักไว้ใน record (`source: entrance`) ไม่งั้น `label_point` (`source: label_point`) · ไม่ใช่ centroid (R37) |
| `opening_hours` | หัวข้อ 8.1 · บังคับทุก record |

- field ที่ **ไม่อยู่** ใน artifact: `name_real`, tag ของ OSM, `osm_id`, `opening_hours` ข้อความดิบ, `coverageFilter` ใดๆ, ข้อมูลผู้สร้าง, สถานะ draft · record ที่ `status` ไม่ใช่ `published` ไม่ถูกเขียน
- view model ของแผนที่ (6 property ของ D-075 / tech note F02 15.2) สร้างใน client จาก artifact: `name` = ข้อความที่ resolve จาก `name_key` · `status` จาก `selectOpening` · `label_count` ไม่ใส่ใน Phase 2 (D-089)

## 14. ลิงก์นำทาง (A-3 เงื่อนไข 3 และ 5, R34–R39, D-085)

### 14.1 รูปแบบลิงก์ (ปลายทางเท่านั้น โหมดเดิน ไม่มี API key)

| ระบบ | ลิงก์หลัก | หมายเหตุ |
| --- | --- | --- |
| Android Chrome | `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking` | Google Maps URLs (ไม่ต้องใช้ key) · ไม่ใส่ `origin` → แอปใช้ตำแหน่งปัจจุบันของเครื่องเอง · เปิดแอป Google Maps ถ้ามี ไม่งั้นเว็บ |
| iOS Safari | `https://maps.apple.com/?daddr=<lat>,<lng>&dirflg=w` | Apple Maps URL scheme (`dirflg=w` = เดิน) · ไม่ใส่ `saddr` |
| iOS ทางเลือกรอง | ลิงก์ Google Maps แบบเดียวกับ Android | universal link เปิดแอป Google Maps ถ้าติดตั้ง |

- `<lat>,<lng>` = `nav_destination.point` ปัดทศนิยม 5 ตำแหน่ง (`app.client.navigation.coordinateDecimals` เสนอ 5 · ≈ 1.1 ม.) · ลำดับ lat ก่อน lng · ไม่มีชื่อ ไม่มี parameter อื่น
- เลือกลิงก์หลัก: iOS = UA มี `iPhone|iPad|iPod` หรือ (`Macintosh` และ `navigator.maxTouchPoints > 1`) · อื่นๆ = Google · UX แสดงลิงก์รองได้ตาม flow (P2-F04-T15)
- สร้างเป็น `<a href target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">` ที่ผู้เล่นแตะเอง · ห้าม `window.open` นอก gesture · referrer ไม่ส่ง (URL ของเกมอาจมี query ของ test hook)
- ห้ามมีตำแหน่งผู้เล่นใน URL (`app.privacy.externalNavigation.includesPlayerPosition = false`) · test ของ P2-F04-T21 ตรวจว่า URL มีเฉพาะ key `api`, `destination`, `travelmode` หรือ `daddr`, `dirflg` และค่าพิกัดเท่ากับ `nav_destination`
- การเปิดลิงก์เป็น navigation ระดับบนที่ผู้เล่นเลือก ไม่ใช่ request ของแอป · e2e ตรวจ origin (C2-1, P2-F04-T22) ต้องยกเว้น navigation นี้ (handoff ถึง qa-tester)

### 14.2 fallback อัตโนมัติ

- หลังแตะลิงก์ ถ้าภายใน `app.client.navigation.externalOpenTimeout_ms` (เสนอ 2500) หน้าไม่เข้าสถานะ hidden (`visibilitychange` / `pagehide`) → แสดงแผง fallback · ออฟไลน์ (`navigator.onLine === false`) แสดงแผง fallback คู่กับลิงก์ตั้งแต่แรก
- แผงนี้เปิดเองได้เสมอจากปุ่ม "คัดลอกชื่อสถานที่"

### 14.3 แผง fallback

- แสดงชื่อที่ค้นได้ (`search_name_key`) และพิกัดปลายทาง `lat, lng` (ข้อมูลสาธารณะของสถานที่ ไม่ใช่ของผู้เล่น) พร้อมปุ่มคัดลอกแต่ละค่า
- คัดลอกด้วย `navigator.clipboard.writeText` ใน gesture · ล้มหรือไม่มี API → แสดงเป็น `<input readonly>` ที่เลือกข้อความไว้แล้วให้ผู้เล่นคัดลอกเอง
- ถ้อยคำเป็น copy key ของ narrative (P2-F04-T16) · dungeon ปิดแสดงเวลาเปิดถัดไปก่อนปุ่มนำทาง (R38)

## 15. Config ที่ client import ได้ (F-04 · feeds P2-F04-T24, T25)

client ห้าม import ไฟล์ `config/balance/*.json` ทั้งไฟล์ · build step ของ `apps/client` (virtual module หรือไฟล์ generate · P2-F04-T25) ส่งเฉพาะ subtree ในตารางนี้ · test ของ T25 ตรวจ bundle ว่าไม่มี key ของกลุ่ม C (เช่น ค้นสตริง `coverageFilter`, `trustScore` ใน `dist/`)

### 15.1 กลุ่ม A — params ของ engine (ข้อยกเว้น C1-1 · หายจาก client เมื่อเริ่ม Phase 3)

| ไฟล์ | subtree |
| --- | --- |
| `balance/dungeons.json` | `entry`, `runState`, `rewardTick`, `movementGate`, `hpSafety`, `death`, `exit`, `emergencyClose`, `verification`, `openingHours` (เมื่อ P2-F05-T20 เพิ่ม), `levelRange` |
| `balance/anticheat.json` | `checkIn`, `speedLock` |
| `balance/drops.json` | `baseChancePerRewardTick_pct`, `quantityPerDrop`, `rewardTypeByRarity`, `multipliers`, `smallDungeon`, `dropTables`, `items` (P2-X22) |
| `balance/progression.json` | `level`, `expCurve`, `expMultipliers`, `baseStats`, `statPerPoint`, `hpRecovery`, `rewardTick`, `statPoints` |
| `balance/combat.json` | `monsterAttack`, `defense`, `attackCheck`, `levelGapDamage`, `deathProtection` |
| `balance/classes.json` | `roles`, `buffStacking`, `baseCapRule`, `party` (กรณีคนเดียว · F05 R13) |
| `balance/economy.json` | `potions`, `autoPotion` (F06), `npcSellPrice_gold` (P2-X22) |

- ตารางนี้ตรงกับ `BALANCE_WHITELIST` ใน `apps/client/src/config/whitelist.ts` ทุกแถว (กลุ่ม B ที่เป็น subtree ของ `config/balance/*.json` อยู่ในรายการเดียวกันในโค้ด) · แก้ที่หนึ่งต้องแก้อีกที่ใน task เดียวกัน · `generated.test.ts` ตรวจว่า output ตรงกับ whitelist และไม่มีชื่อกลุ่ม C (`FORBIDDEN_ANYWHERE`)
- P2-X22 ยืนยัน A-P2-F04-T21-1 (gameplay, P2-F04-T21): `drops.dropTables` และ `drops.items` จำเป็นเพื่อให้ `parseDropTable` / `rollTickLoot` (`@keep-walking/shared/reward`) ได้ตารางดิบและ rarity ของ item ต่อ dungeon · `economy.npcSellPrice_gold` จำเป็นเพราะ `dropParamsFromConfig` (`@keep-walking/shared/formulas`) อ่าน `npcSellPrice_gold.<item>` · ทางเลือกอื่นคือ fork ตัว parse ใน client ซึ่งผิดหลัก "สูตรมีที่เดียว" (ADR 0003) · ทั้งสาม key ไม่มีชื่อกลุ่ม C ไม่มีค่าลับ และอยู่ภายใต้ข้อยกเว้น C1-1 เหมือนกลุ่ม A ที่เหลือ: หายจาก client เมื่อ Phase 3 ย้าย drop ไป server (tech gate F08) · ส่วนอื่นของ `drops` (`gddReferenceFrequency`, `_meta`) และ `economy` (`npcPricing`, `market`, `marketTax`, `partyReward`, ...) ยังเป็นกลุ่ม C

### 15.2 กลุ่ม B — การแสดงผลเท่านั้น

| ไฟล์ | subtree |
| --- | --- |
| `balance/location.json` | `homeState` |
| `balance/unlocks.json` | `home`, `antiCheatHelp`, `parentalConsent` |
| `balance/privacy.json` | `minAge_yr`, `minAgeComparison` (age gate) |
| `app/client.json`, `app/privacy.json`, `app/telemetry.json` | ทั้งไฟล์ (ไม่มีค่าลับ ไม่มีผลต่อรางวัล) |
| `content/*.json` | ตาม copy loader เดิม |

### 15.3 กลุ่ม C — ห้ามเข้า bundle

`dungeons.area`, `dungeons.coverageFilter`, `dungeons.safety`, `dungeons.temporaryDungeon`, `dungeons.offlineEvidence`, `dungeons.smallDungeon` (ของ tools; engine ใช้ `drops.smallDungeon`), `anticheat.offlineEvidence`, `anticheat.trustScore`, `anticheat.outputAudit`, `raid.*`, `enhance.*`, `equipment.*`, `economy` ส่วนที่ไม่อยู่ในกลุ่ม A, `combat.raidFailPenalty`, `classes.classChange`, `classes.levelGapContribution`, `unlocks` ส่วนที่ไม่อยู่ในกลุ่ม B, `balance.privacy.positionLogTtl_s` (ใช้โดย config lint ไม่ใช่ runtime)

- subtree ใหม่ที่ client ต้องการ = handoff ถึง tech-lead เพื่อเพิ่มในตารางนี้ก่อน · Phase 3 กลุ่ม A ย้ายออกจาก client ทั้งหมด (tech gate F08)

## 16. Failure modes

| # | สถานการณ์ | ตรวจพบอย่างไร | ผล | หัวข้อ / spec |
| --- | --- | --- | --- | --- |
| FM-01 | แอปถูกปิด / หน้าจอล็อก / tab ถูกทิ้ง | ไม่มี sample ที่ใช้ได้ > `maxSamplePairGap_s` | ออกที่ `t_last` → Grace / Suspended / `timeout` ตามเวลา · run ไม่ถูกลบ · ระยะคร่อมช่องว่าง 0 | 5.3, 10.3 · E7 |
| FM-02 | state กู้ไม่ได้ (JSON เสีย, `schemaVersion` ต่าง, dungeon หาย) | `fromPersisted` | ทิ้งแล้วเริ่มใหม่ ไม่ crash · telemetry `session_state_discarded` | 10.2 |
| FM-03 | storage เต็ม / private mode | `setItem` throw | ตัด telemetry ก่อน · session อยู่ในหน่วยความจำ + ธง | 10.4 |
| FM-04 | นาฬิกาเครื่องถอยหลัง | `now_ms < lastNow_ms − skew` | `clock_invalid` ของเก็บครบ | 4.4 · E10 |
| FM-05 | นาฬิกาเดินหน้ากระโดด | ตรวจไม่ได้ใน Phase 2 | รางวัลไม่เพิ่ม · เวลาทำการอาจผิด (ความเสี่ยงที่ยอมรับ · Phase 3 ใช้เวลา server) | 4.4 |
| FM-06 | sample จากอนาคต / ซ้ำ / ย้อน | ด่านเวลา | ทิ้ง `sample_rejected` | 4.2 |
| FM-07 | GPS หาย / permission ถูกถอน | ไม่มี sample | เหมือน FM-01 · UI `gps.*` | 5.3 |
| FM-08 | accuracy แย่ต่อเนื่อง | sample ไม่ใช้ได้ | ไม่เปลี่ยนสถานะ · เกินช่องว่าง = ไม่มีหลักฐาน · ไม่มีระยะ | 5.1 · E3 |
| FM-09 | drift spike / teleport | ตัวกรอง outlier | ไม่มีระยะจาก spike · check-in ล้มลำดับ | 7.3 · E2, E5 |
| FM-10 | นั่งรถ | speed lock | หยุดนาฬิกา ไม่มี hit ไม่มี check-in | 6 · E13 |
| FM-11 | ปิดทำการระหว่าง run (รวมตอนแอปปิด) | timer `closesAt_ms` | `dungeon_closed` จ่ายตาม D-059 | 8.3 · E11 |
| FM-12 | `verification_mode` ไม่รู้จัก / `entry_exit` / `floor_level` ไม่ null | strategy | dungeon เล่นไม่ได้ แสดงปิด (fail closed) | 7.1 |
| FM-13 | key config ขาด | `ConfigUnsetError` ตอนสร้าง params | client แสดงจอ error ของ dev ไม่เริ่ม engine (ไม่เดาค่า) | ADR 0003 5.5 |
| FM-14 | เปิดแอปแผนที่ไม่ได้ | timeout ของ visibility | แผง fallback | 14.2 |
| FM-15 | เน็ตหลุด | `navigator.onLine` | ไม่มีผลต่อ engine · banner + fallback นำทาง | 10.3 · E8 |
| FM-16 | artifact ไม่ตรงกับ record | `--check` ใน `pnpm test` | CI แดง | 13.1 |

## 17. Test hooks

| hook | วิธี | ใช้กับ |
| --- | --- | --- |
| เล่น trace แบบเร่ง | query เดิม `loc=mock&trace=<id>&speed=1\|10\|60` (`app.client.providerQuery`) · game clock `now_ms = replayStart_ms + mock.position()` (P2-F04-T25) ทำให้ ×10/×60 ได้ tick/hit ตรงกับ ×1 | QA trace, playtest |
| เวลาเริ่ม | query `start` (ชื่อใน `app.client.providerQuery.paramNames.start`, handoff ถึง gameplay): `YYYY-MM-DDTHH:mm` ตีความด้วย `utcOffset_min` หรือเลข epoch ms · ใช้ได้เฉพาะ `loc=mock` · Web ใช้ `Date.now()` เสมอ | เข้าตอนปิด, ใกล้ปิด, ข้ามเที่ยงคืน |
| seed ของ RNG | query `seed=<uint32>` เฉพาะ `loc=mock` → `runSeed` ของทุก run ใน page นั้น · ไม่ใส่ = `crypto.getRandomValues` | vector drop/hit ผ่าน UI |
| แอปถูกปิด (engine) | test เรียก `toPersisted` → ข้าม sample ช่วงหนึ่ง → `fromPersisted(raw, now_ms + gap)` → `tick` → ป้อนต่อ | acceptance 6, E7, Grace 2:59/3:01, 14:59/15:01 |
| แอปถูกปิด (e2e) | Playwright reload ระหว่าง Mock · ตรวจว่า run ยังอยู่และไม่ crash (ผลเวลาตรวจที่ระดับ engine) | P2-F04-T22 |
| นาฬิกาถอยหลัง | vector: `now_ms` ลดเกิน `clockSkewTolerance_s` | E10, G15 |
| สถานะ debug | `window.__kwSession` เฉพาะ `hud=1`: คืนผลของ selector (ไม่มีพิกัด) · ไม่ expose `state` ดิบ | e2e, playtest |
| build profile | env `VITE_KW_PROFILE` (`dev` \| `playtest`) และ `VITE_KW_COMMIT` (short SHA) อ่านตอน build (TL B-10) · `playtest`: HUD ปิด, Mock ผ่าน query เท่านั้น, แสดง version + SHA | P2-F04-T25 |

- engine test (P2-F04-T20, P2-F05-T08) ป้อน input ตรง ไม่ผ่าน Mock · trace-replay test ใช้ `tools/traces` builder (N-08) และแปลง `TraceSample` → input `sample`
- vector ที่ต้องมี (P2-F05-T20): check-in ทุก reason + ลำดับ R08, teleport, accuracy เท่าเกณฑ์, hysteresis เลียบขอบ/drift + backdating, ไม่มีหลักฐาน, 180/900 วิ ทั้งสองฝั่งขอบ, lock/unlock + backdate, ปิดทำการ (รวมข้ามเที่ยงคืนและ exceptions), ลำดับ 9.3 ที่เวลาเท่ากัน, นาฬิกาถอยหลัง

## 18. สมมติฐาน การแก้ ADR และงานต่อ

- A-P2-F04-T14-1: ปิดแล้ว (P2-X04) · แทนด้วย D-103 (ครบทั้งจำนวนและระยะ แถบเป็นกลาง ย้อนไป sample ฝั่งตรงข้ามตัวแรก) และ D-104 (ช่องว่างล้มชุด) ใน 5.2 · D-103 รอ game-director ยืนยันใน F04 flow gate รอบ 2
- A-P2-F04-T14-2: ปลด lock backdate ไปที่ sample แรกของชุดช้า (6) ตาม D-094 "transition ย้อนผล" · owner game-director
- A-P2-F04-T14-3: คู่ที่เร็วกว่า `speedLock_kmh` ไม่นับระยะ (6, F05 R05 ข้อ 5) เป็นผลทางเทคนิคของ R21 + backdating ไม่ใช่กฎใหม่ · owner game-director
- A-P2-F04-T14-4: ชื่อ event ที่ "รอ P2-F04-T17" ในหัวข้อ 12.3 · owner product-manager
- A-P2-F04-T14-5: `sunrise-sunset` กรอกเป็นเวลาคงที่ (8.1) · owner level-designer
- การละเอียดของ ADR 0003 5.2 ข้อ 6 (ข): tech note นี้กำหนดว่าหน้าต่างครบได้เฉพาะเมื่อมี sample ที่ใช้ได้ที่ `τ ≥` ปลายหน้าต่าง (ไม่มีหลักฐาน = นาฬิกาหยุดที่ `t_last` ตาม R14) · ข้อ (ข) ของ ADR จึงไม่ทำให้หน้าต่างครบ · tech-lead แก้ข้อความ ADR ในงานถัดไป (ไม่อยู่ใน Writes ของงานนี้) · ดู F05 หัวข้อ 4
- key ที่เสนอให้ `config/app/client.json` (gameplay, P2-F04-T25): `engine.tickInterval_ms` 1000, `storage.sessionPersistInterval_s` 5, `navigation.coordinateDecimals` 5, `navigation.externalOpenTimeout_ms` 2500, `providerQuery.paramNames.start`, `providerQuery.paramNames.seed`
