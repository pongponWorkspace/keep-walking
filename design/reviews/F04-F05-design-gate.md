# Design gate F04 + F05 — Dungeon Presence และ Run State · Movement Gate, Reward Tick และ Drop

Task: P2-F05-T18 · ผู้ตรวจ: game-director · รอบ: 1 · วันที่: 2026-09-28
Spec ที่ตรวจ: `design/features/F04-dungeon-presence.md`, `design/features/F05-movement-gate-reward.md`
เงื่อนไขของ board (D-089, หัวข้อ 2 ของ plan review): verdict ย่อยต่อ feature · feature ใดไม่ผ่าน = รวมไม่ผ่าน · NEEDS_CHANGES ครั้งที่สองของ gate รวมนี้ escalate ถึงคนทั้งสอง feature

| รายการ | ผล |
| --- | --- |
| **verdict F04** | **PASS** |
| **verdict F05** | **PASS** |
| **verdict รวม** | **PASS** |
| finding blocking | ไม่มี |
| ข้อสังเกต non-blocking | 4 ข้อ (หัวข้อ 7) · ไม่มีข้อใดเปลี่ยนสิ่งที่ผู้เล่นได้หรือเสีย |

## 1. ขอบเขตและฐานหลักฐาน

- gate อื่นที่ PASS แล้วและใช้เป็นฐาน ไม่ตรวจซ้ำในส่วนที่เป็นอำนาจของเขา: tech gate รอบ 2 (`docs/reviews/F04-F05-tech-gate.md:173-175`, มีเงื่อนไขหลังผ่าน P2-H30 เรื่อง `it.fails`), QA gate (`qa/reports/F04-F05-qa-gate.md:9-11`), copy gate รอบ 2 (`design/reviews/F04-F05-copy-gate.md:97-100`)
- gate นี้ตรวจเจตนาเกม: pillars, non-negotiables, gate เดียวครอบทุกทางที่ให้ของ, speed lock ล็อกจริง, ไม่มีตำแหน่งหรือจำนวนคน, config, และประสบการณ์ที่ไม่ต้องอ่าน
- วิธี: อ่าน spec ทั้งสอง, ไล่โค้ดทุกจุดที่เขียน `bag`, `inventory`, `exp`, `level` หรือ `lifetimeTicksGranted` ใน `packages/` และ `apps/` (Grep `grantTick\(|bagAdd\(|inventory\[` ทั้ง repo), ไล่ทุก input ของ `sessionStep` และทุก `dispatch` ของ client, อ่าน e2e onboarding และ full-run
- หัวข้อ GDD ที่ใช้: "Core loop ใน Dungeon" (บรรทัด 276-286), "หลักการที่ห้ามละเมิด" (บรรทัด 1039-1043), "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง" (บรรทัด 22)
- ข้อจำกัดที่รู้แล้วและไม่ถือเป็น finding: full-run.spec.ts flake เรื่องเวลาในวัน (แก้ใน P2-F06-T14) · Phase 2 รัน engine บนเครื่องตาม D-087 ผลอยู่ใน `kw.p2.*` ไม่ย้ายเข้า account (NN-1 ข้อความ pillars บรรทัด 87 ยอมรับไว้แล้ว)

## 2. gate เดียวไม่มีข้อยกเว้น ครอบทุกทางที่ให้ของ

ข้อสรุป: **ผ่าน** · ใน Phase 2 มีฟังก์ชันเดียวที่เพิ่มของ exp หรือเลเวลให้ผู้เล่น คือ `grantTick` (`packages/shared/src/session/reducer.ts:193-264`) และมีผู้เรียกเพียงสองจุด ทั้งสองจุดอยู่หลังผลของ gate ตัวเดียวกัน

| ทางที่ให้ของ | จุดในโค้ด | ผ่าน gate อย่างไร | ผล |
| --- | --- | --- | --- |
| tick ปกติ | `reducer.ts:963-975` → `applyClosedWindows` `reducer.ts:284-295` | ให้ของเฉพาะหน้าต่างที่ `c.passed` · `passed` = `nd > minDistance_m` (`packages/shared/src/reward/gate.ts:148`) · comparison อื่นนอกจาก `greaterThan` fail closed (`gate.ts:72-75, 89-92`) | ผ่าน |
| tick ที่ย้อนผลหลังกลับเข้าเขต (hysteresis) และหลังปลด speed lock | `reducer.ts:745-763` (`feedScratch`) เรียกจาก `reducer.ts:831-847` และ `reducer.ts:941-961` | ป้อน `gateAccumulatorStep` ตัวเดียวกันแล้วเข้า `applyClosedWindows` เดียวกัน · นับระยะเฉพาะคู่ใน polygon (F05-R05, D-094) · คู่ที่เร็วเกิน `speedLock_kmh` ไม่ให้ระยะ (`gate.ts:5-7, 85-86`) | ผ่าน |
| tick บางส่วนของ D-059 (`dungeon_closed`, `emergency_close`) | `reducer.ts:344-387` → `partialTick` `gate.ts:239-251` | หน้าต่างที่จบก่อนปิดตัดสินด้วย `applyClosedWindows` ปกติ (`reducer.ts:347-352`) · หน้าต่างค้างต้อง e ≥ `partialTickMinElapsed_s` และระยะ > `minDistancePerWindow_m` × f ด้วย `passesGate` ตัวเดียวกัน · ใช้เฉพาะการปิดฝั่งเกม (`reducer.ts:323-326`) ตรง F05-R22 และ D-059 | ผ่าน |
| ยา | `bagAdd` มีผู้เรียกจุดเดียวใน `grantTick` (`reducer.ts:229`) · ผู้เล่นใหม่ `inventory: {}` (`packages/shared/src/session/types.ts:213-224`) | ไม่มีชุดยาตั้งต้น ของขวัญแรกเข้า หรือร้าน (F05-R14, D-089) · ทางลดยาคือ `usePotion` และยาอัตโนมัติเท่านั้น | ผ่าน |
| รางวัลก้อนแรกของ onboarding (P2-F06-T10, GD B-07) | `firstEver` = `player.lifetimeTicksGranted === 0` อ่านใน `grantTick` (`reducer.ts:240`) และส่งออกทาง event (`reducer.ts:307, 375`) | เป็นธงอ่านอย่างเดียว ไม่เปลี่ยนจำนวนของ ไม่ลดเกณฑ์ ไม่เร่ง tick · client ใช้เลือก copy/effect เท่านั้น (`apps/client/src/ui/tick-toast.ts:131-151`) · f04-app ไม่มีจอหรือ code path ของ `first_reward` (`apps/client/src/f04-app.ts:997-1004`) · e2e ได้ toast ก้อนแรกจาก trace เดินจริงผ่าน engine (`apps/client/e2e/onboarding.spec.ts:10-11, 105-108`) | ผ่าน |
| input อื่นของ engine | `reducer.ts:1199-1244`: `ackSummary`, `setAutoRetreat`, `chooseClass`, `usePotion`, `confirm`, `exit`, `emergencyClose`, `sample` · client dispatch เฉพาะ `chooseClass`, `exit`, `ackSummary`, `usePotion`, `setAutoRetreat`, `tick` (`f04-app.ts:271-414, 1118`) | ไม่มี input ที่ให้ของ · `emergencyClose` ไม่มีผู้เรียกฝั่ง client และวิ่งผ่าน `endRun` ที่มี gate | ผ่าน |
| test hook `loc=mock` | `apps/client/src/config/runtime.ts:37-50` (`start`, `seed`, `e2eClassId`, `e2eSkipF04App`, `e2eSkipOnboarding`) | ข้ามจอหรือกำหนด seed เท่านั้น ไม่มี hook ที่เติมของหรือลด gate | ผ่าน |

config ล็อกข้อยกเว้นไว้ระดับ schema: `movementGate.exceptions` = `[]`, `appliesTo` = dungeon + raid (`config/balance/dungeons.json:59-65`) · config-lint ปฏิเสธ `exceptions` ไม่ว่าง, `appliesTo` ขาด raid, comparison อื่น, และ `proRatedRewardPassesMovementGate` = false (`tools/config-lint/test/schema.test.ts:40-47`)

## 3. F04 — Dungeon Presence และ Run State: verdict **PASS**

### 3.1 speed lock ล็อกการเล่นจริง (F04-R20..R24, GDD "ความปลอดภัยทางกายภาพ")

| สิ่งที่ต้องล็อก | หลักฐาน | ผล |
| --- | --- | --- |
| นาฬิกา rewardWindow หยุด | `reducer.ts:814-828` หยุดนาฬิกาที่จุดเริ่มของชุดที่ยืนยัน (`packages/shared/src/run/speed-lock.ts:65-72`) | ผ่าน |
| ไม่มีระยะและไม่มี tick ขณะล็อก | ทาง tick หลักมีเงื่อนไข `!lock.locked` (`reducer.ts:963`) · คู่ที่เร็วเกิน `speedLock_kmh` ไม่ให้ระยะแม้ในช่วงก่อนยืนยัน (`gate.ts:5-7`) | ผ่าน |
| ไม่มี damage | การโดนตีตั้งตามเวลา Active ของนาฬิกา run (`reducer.ts:501-503`) ซึ่งหยุดแล้ว · ครั้งที่ถึงก่อน lock ตัดสินก่อนหยุด (`reducer.ts:816-821`) ตาม F04 คำตัดสินข้อ 5b | ผ่าน |
| เข้า run ไม่ได้ | check-in ปฏิเสธ `speed_lock` ก่อนเหตุอื่น (`packages/shared/src/run/check-in.ts:46`) · sample ขณะล็อกไม่นับเป็นลำดับเข้าใกล้ (`reducer.ts:855`) · จอ confirm ไม่ render ขณะล็อก (`f04-app.ts:971-976`) | ผ่าน |
| จอ | overlay เต็มจอทับทุกจอ มีแต่ปุ่ม secondary (ตั้งค่า, ออก) ไม่มีปุ่มชวนเล่นต่อ (`apps/client/src/ui/speed-lock-overlay.ts:1-5, 52-63`) · ถ้อยคำไม่เอ่ยการโกงหรือวิธีวัด (`config/content/copy.th.json:211-212`) | ผ่าน |
| ปลดเอง ไม่จบ run เอง | ปลดเมื่อช้าต่อเนื่อง `unlockSustained_s` (`speed-lock.ts:66-72`) · lock ไม่เรียก `endRun` · ย้อนผลปลดไปที่ sample แรกของชุดช้าเหมือน transition อื่น (D-094) และระยะช่วงนั้นยังต้องผ่าน gate (หัวข้อ 2) | ผ่าน |
| config ไม่ hardcode | `speedLock_kmh`, `lockSustained_s`, `unlockSustained_s` อ่านจาก config (`reducer.ts:797-803`) | ผ่าน (ข้อสังเกต O-1 เรื่อง `action`) |

### 3.2 ตำแหน่งและจำนวนคน (NN-4, D-089 ข้อ Phase 2 ซ่อนจำนวนคน)

- popup confirm ส่งแค่ชื่อ, ช่วงเลเวล, สถานะเปิดและ check-in (`f04-app.ts:679-686`) ไม่มีจำนวนคนหรือ role · Grep `playerCount|playersIn|occupan|partySize|roleCount|nearbyPlayers|otherPlayers` ใน `apps/client/src` ไม่พบ
- ลิงก์นำทางมีแค่ปลายทางและโหมดเดิน ไม่มี origin/`saddr` (`apps/client/src/nav/links.ts:15-28, 51-54`) ตรง F04-R37
- สรุป run ไม่มีพิกัดหรือเส้นทาง (F05-R25) · QA ยืนยัน storage ไม่มีพิกัดหลัง run จบ (QA gate PASS)
- ผล: **ผ่าน**

### 3.3 เจตนาของ run state

- check-in ต้องเห็นการเดินเข้ามาจากข้างนอก และ teleport ถูกปฏิเสธด้วยตัวกรองตัวเดียวกับ gate (`reducer.ts:849-855`) ตรง F04 คำตัดสินข้อ 2 (หลักการข้อ 2 มาก่อนข้อ 3)
- Grace/Suspended ไม่มี tick ไม่มี damage ของไม่หาย กลับมาเล่นต่อได้ภายใน `suspendedMax_s` (P2, หลักการข้อ 3) · QA vector 179/180/181 และ 899/900/901 วินาทีผ่าน
- ปิดทำการระหว่าง run จบ `dungeon_closed` เก็บของครบ จ่ายตาม D-059 ไม่มีการเตะแบบลงโทษ (F04-R30)
- พฤติกรรมที่รู้แล้ว E19 (ค้าง Grace ในแถบฝั่งใน) ยังเป็นไปตาม D-118: ไม่มีรางวัลรั่ว ไม่ลงโทษ แผน `pendingSetMax_s` อยู่ Phase 3
- ไม่มีสิ่งใดใน v1 cut list (AR, ในอาคาร, แชท, avatar 3D, PvP) · `verification_mode` ผ่าน `selectPresenceStrategy` และแบบอื่น fail closed (`reducer.ts:615-617`)

## 4. F05 — Movement Gate, Reward Tick และ Drop: verdict **PASS**

- gate เดียว: หัวข้อ 2 ทุกแถวผ่าน
- ค่าทั้งหมดจาก config: เกณฑ์ หน้าต่าง cadence ช่องว่าง accuracy ตัวกรอง (`config/balance/dungeons.json:59-77`) และ D-059 (`dungeons.json:107-116`, client map จาก `emergencyClose` ที่ `apps/client/src/session/config.ts:171`) · Grep ตัวเลขตายตัว (`= 50|300|180|900|25`, `_m = n`, `_s = n`) ใน `session/`, `reward/`, `run/` ไม่พบ
- tick ที่ไม่ผ่านไม่ให้อะไร ไม่ทอยสุ่ม ไม่มีผลต่อ HP หรือ run state (`reducer.ts:285-293`) · toast จาง ไม่ลงโทษ "รอบนี้เดินไม่พอ ไม่ได้ของ เดินต่อ" (`copy.th.json:270`, `tick-toast.ts:187-196`)
- บทลงโทษต่ำ: ออกเอง, auto-retreat, timeout, clock_invalid, ปิดทำการ เก็บของครบ · ตายเท่านั้นที่เสียของใน run และ exp ไม่ถูกหัก (`reducer.ts:314-321, 401-426`) ตรง F05-R21 และคำตัดสินข้อ 3 · auto-retreat เปิดเป็นค่าเริ่มต้นและล็อกด้วย schema (`dungeons.json:81`, `schema.test.ts:45`) · กฎคู่ NN-8 ครบทั้งสองฝั่ง
- ไม่มีเพดานและไม่มี diminishing return (F05-R28) · ไม่พบตัวลดตามเวลา/จำนวน run ใน `grantTick`
- tick ก่อน hit เมื่อเวลาชนกัน (`reducer.ts:976-978`) ตาม D-094
- ข้อค้างจากสนาม F-16 (ม้านั่ง/โต๊ะนิ่ง) ยังรอ P2-C03 ตามคำตัดสิน J-10 ของ `design/reviews/F04-flow-approval.md:223` · ไม่ใช่ finding ของ gate นี้ เงื่อนไขเดิมยังยืน (หัวข้อ 8)

## 5. Pillars และ non-negotiables (`design/pillars.md`)

| ข้อ | สิ่งที่ตรวจ | หลักฐาน | F04 | F05 |
| --- | --- | --- | --- | --- |
| P1 เดินจริงเท่านั้นที่นับ | ของทุกชิ้นมาจากหน้าต่างที่ระยะเกินเกณฑ์ · ระยะคร่อมช่องว่างและนอก polygon เป็นศูนย์ | หัวข้อ 2 · F05-R05/R06/R09 · QA vector G2 | ผ่าน | ผ่าน |
| P2 มาถึงแล้วต้องได้เล่น | ช่วงเลเวลไม่บล็อก · Grace/Suspended รองรับ drift · ปิดทำการได้ของตามสัดส่วน | F04-R32, R12, R30 · หัวข้อ 3.3 | ผ่าน | — |
| P4 มือถืออยู่ในกระเป๋า | tick ทุก 5 นาทีมีสั่นและเสียงแยกผ่าน/ไม่ผ่าน · lock ปลดเองไม่ต้องกด | `audio/manifest.json` cue `run.tickGranted`/`run.tickDenied`/`run.tickGrantedFirst` · `copy.th.json:212` | ผ่าน | ผ่าน |
| NN-1 server-authoritative (pillars บรรทัด 87) | ตรรกะรางวัลอยู่ใน pure reducer ของ `packages/shared` ที่ server จะรัน · client อ่านผลจาก event อย่างเดียว | `tick-toast.ts:13-16` · `f04-app.ts:748-757` (countdown จาก `selectRunView`) · D-087 | ผ่าน | ผ่าน |
| NN-2 gate เดียวรวม raid (บรรทัด 88) | หัวข้อ 2 | `dungeons.json:59-65` · `schema.test.ts:40-47` | ผ่าน | ผ่าน |
| NN-3 config (บรรทัด 89) | ไม่มีค่าหรือชื่อฝังในโค้ด · ชื่อ dungeon มาจาก `name_key` | `reducer.ts:797-803` · `f04-app.ts:682` · Grep ตัวเลขตายตัวไม่พบ | ผ่าน (O-1) | ผ่าน |
| NN-4 ไม่มี PvP/แชท/ตำแหน่งรายคน (บรรทัด 90) | หัวข้อ 3.2 · ไม่มีช่องพิมพ์ในจอ F04/F05 | `links.ts:15-28` | ผ่าน | ผ่าน |
| NN-5 กลางแจ้ง (บรรทัด 91) | `continuous_gps` เท่านั้น แบบอื่น fail closed | `reducer.ts:615-617` | ผ่าน | — |
| NN-6 บทลงโทษต่ำ (บรรทัด 92) | auto-retreat default · ออกได้ทุกเมื่อของครบ · tick ไม่ผ่านไม่หักอะไร | หัวข้อ 4 | ผ่าน | ผ่าน |
| NN-8 กฎคู่ (บรรทัด 94) | gate ไม่อ่อนลง และ auto-retreat ไม่ถูกแตะใน F04/F05 | `schema.test.ts:40-47` | ผ่าน | ผ่าน |
| 10 นาทีแรก / ห้ามสอน (pillars 6.2) | ก้อนแรกเป็น tick ปกติ · ไม่มีจอของระบบห้ามสอน | `onboarding.spec.ts:61, 116` · `copy.th.json:268` ("ไม่มีคำของ U1–U8") | ผ่าน | ผ่าน |

## 6. เข้า dungeon และได้ tick เข้าใจได้โดยไม่ต้องอ่าน

ตรวจจากลำดับที่ผู้เล่นเจอจริงในโค้ดและ e2e ว่าแต่ละจังหวะสื่อด้วยสิ่งที่ไม่ใช่ตัวหนังสือได้ไหม

| จังหวะ | สิ่งที่ผู้เล่นได้โดยไม่ต้องอ่าน | ผล |
| --- | --- | --- |
| เดินถึงเขต | popup ขึ้นเอง (F04-R02) · ปุ่มหลักปุ่มเดียว "เข้า" ที่ disable จนพร้อมแล้วเปิดเอง ไม่ต้องปิดเปิดใหม่ (F04-R09) · มีปุ่มยกเลิกทุกสถานะ (`apps/client/src/ui/dungeon-confirm.ts:85, 202`, เงื่อนไข C-1) | ผ่าน |
| เข้า run | จอ run เปลี่ยนชัด · บรรทัดเดียว "เดินต่อไปเพื่อรับรางวัล" เฉพาะก่อนได้ก้อนแรก (`apps/client/src/ui/run-tutorial-line.ts:3, 23`) · ตัวนับถึง tick ถัดไปเดินให้เห็น และหยุดเมื่อนาฬิกาหยุด (`f04-app.ts:748-757`) | ผ่าน |
| tick ผ่าน | สั่น + เสียงขึ้น + ไอคอนของเรียงตาม rarity ไม่เกิน `tickMaxIconsShown` + effect ต่อ rarity (`tick-toast.ts:153-185`) | ผ่าน |
| tick ไม่ผ่าน | สั่นสั้นกว่า + เสียงคลิก + toast จาง (`tick-toast.ts:187-196`) · ต่างจากผ่านทั้งสามช่องทาง จึงแยกได้โดยไม่ดูจอ | ผ่าน |
| ก้อนแรก | จังหวะสั่นยาวกว่าและ effect 480 ms (`audio/manifest.json` `run.tickGrantedFirst`, `art/vfx/tick-feedback/timing.json:22-25`) · ของเท่า tick ปกติ | ผ่าน |
| ขึ้นรถ | overlay เต็มจอ สั่นครั้งเดียว ไม่มีปุ่มเล่นต่อ | ผ่าน |

ข้อที่ยังต้องพิสูจน์ในสนาม (ไม่ใช่ finding): ผู้เล่นเข้าใจไหมว่าตัวนับหยุดตอนออกนอกเขต และรู้สึกถึงสั่นในกระเป๋าไหม · อยู่ในคำถาม playtest P2-F06-T19/T27 แล้ว (F05 spec หัวข้อ 10, flow F05 บรรทัด 116) · จอพกกระเป๋าเป็นงานของ P2-F06-T14 และตรวจใน design gate F06 (P2-F06-T24)

## 7. ข้อสังเกต non-blocking

ไม่มีข้อใดทำให้ผู้เล่นได้ของโดยไม่เดิน หรือเสียของเกินที่ spec กำหนด จึงไม่ blocking verdict · orchestrator เปิดเป็นงานได้ตามจังหวะ

- **O-1 `anticheat.speedLock.action` ไม่มีผลต่อ engine** · config มีค่า `lockPlay` (`config/balance/anticheat.json:20`) แต่ schema รับ string ใดก็ได้ (`packages/shared/schemas/config/balance/anticheat.schema.json:36`) และ engine ล็อกเสมอโดยไม่อ่านค่านี้ (`apps/client/src/session/config.ts` ไม่ map key นี้) · พฤติกรรมปัจจุบันถูกตาม GDD (ล็อก ไม่ใช่เตือน) และเป็นทาง fail closed · ความเสี่ยงคือคนแก้ config ใน Phase 5 เข้าใจว่าเปลี่ยนเป็น "เตือน" ได้ · ขอให้ schema ล็อกเป็น `const: "lockPlay"` พร้อมกรณีใน `schema.test.ts` เหมือน key non-negotiable อื่น
- **O-2 สั่นสองครั้งตอนเข้า lock** · `f04-app.ts:1103-1104` สั่นเอง แล้ว `render` เรียก `speedLockOverlay.show` ที่สั่นอีกครั้งเมื่อ overlay เพิ่งเปิด (`speed-lock-overlay.ts:46-48`) · `navigator.vibrate` ครั้งที่สองแทนครั้งแรก ผู้เล่นจึงน่าจะรู้สึกครั้งเดียว แต่ F04-R23 ต้องการสั่นครั้งเดียวจากแหล่งเดียว · ให้เหลือแหล่งเดียว (ถ้าเก็บของ f04-app ไว้ จะครอบกรณีที่เปิดหน้าตั้งค่าอยู่และ overlay ถูกซ่อนด้วย)
- **O-3 ก้อนแรกที่มาจาก tick บางส่วนของ D-059** · ถ้าผู้เล่นใหม่ได้ของก้อนแรกจาก tick บางส่วนตอนสวนปิด event `firstEver` ออกพร้อม `dungeon_exited` และจอสรุปจะทับ toast ก้อนแรก · เจตนายังครบเพราะจอสรุปมีปุ่ม `run.summaryContinue` ถ้อยคำเดียวกับ `run.continueCta` (D-050) และของยังผ่าน gate · ให้ uiux ระบุพฤติกรรมนี้ใน flow F05/F06 ให้ชัด และตรวจใน design gate F06
- **O-4 spec F04/F05 ยังเขียนสถานะ "ร่าง (รอ design gate)" และชื่อ key บางตัวเป็นชื่อที่เสนอ** · F05-R05 และหัวข้อ 8 ใช้ `resampleCadence_s` ขณะที่ config และ ADR ใช้ `sampleCadence_s`, `outlierSpeed_kmh`, `outlierReanchorSamples` (`dungeons.json:66-70`) · ตาม A-P2-F04-T01-1 ADR เป็นตัวจริงอยู่แล้ว ไม่กระทบ build · game-director แก้สถานะเป็น "ผ่าน design gate P2-F05-T18" และ sync ชื่อ key ในรอบแก้ spec ถัดไป (นอก writes ของงานนี้)

## 8. เงื่อนไขที่ยังยืนหลัง PASS

1. P2-H30 ต้องพลิก `it.fails` เป็น `it` ที่ `qa/tests/F04/session-checkin-lifecycle.test.ts:44` ตามเงื่อนไขของ tech gate รอบ 2 · gate นี้ไม่รัน test เอง และ PASS นี้ไม่ลบเงื่อนไขนั้น
2. F-16 (J-10): เมื่อ P2-C03 ได้ jitter ของเครื่องจริง ถ้าโต๊ะนิ่งผ่าน gate หรือม้านั่งไม่ผ่าน ส่งกลับ game-director พร้อมข้อมูล · ห้ามแตะ 50 ม. ต่อ 5 นาที · คันโยกคือ `sampleCadence_s` (ไม่ต่ำกว่า 5 วินาที) และตัวกรองเท่านั้น · ถ้าต้องเลือก โต๊ะนิ่งตกมาก่อน
3. ก่อน engine ย้ายไป server (F08, Phase 3): `pendingSetMax_s` แบบ fail closed ต้องอยู่ใน spec F08 (F04-R15 ข้อ 6)
4. regression ของ F04/F05 ตรวจอีกครั้งใน design gate F06 (P2-F06-T24) รวม O-3 และจอพกกระเป๋า

## 9. คำตัดสินในเอกสารนี้

- ไม่มีคำตัดสินใหม่ · ไม่มีข้อใดแก้ GDD หรือเปลี่ยนค่าใน config
- ยืนยันตีความเดิมหนึ่งข้อเพื่อให้ gate ถัดไปใช้เกณฑ์เดียวกัน: การย้อนผลของการปลด speed lock ไปที่ sample แรกของชุดที่ช้า เป็นกรณีเดียวกับ "transition ย้อนผลไปที่ sample แรกของชุดยืนยัน" ใน D-094 · ยอมรับได้เพราะระยะช่วงนั้นผ่าน gate ตัวเดียวกันและคู่ที่เร็วเกิน `speedLock_kmh` ไม่ให้ระยะ (หลักการข้อ 2 ครบ แล้วข้อ 3 ไม่ทำให้คนที่ลงรถแล้วเดินเสียระยะช่วงที่รอปลด)

## 10. Handoffs

| ถึง | ต้องการ | blocking |
| --- | --- | --- |
| systems-designer + tech-lead | O-1: schema `anticheat.speedLock.action` เป็น `const: "lockPlay"` + กรณีใน `tools/config-lint/test/schema.test.ts` | no |
| gameplay-programmer | O-2: สั่นตอนเข้า lock จากแหล่งเดียว | no |
| uiux-designer | O-3: ระบุใน flow F05/F06 ว่าก้อนแรกจาก tick บางส่วนของ D-059 แสดงบนจอสรุป | no |
| game-director | O-4: สถานะ spec F04/F05 และชื่อ key ตาม config/ADR | no |
