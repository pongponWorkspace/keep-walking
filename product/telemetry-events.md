# Telemetry Events — GPS Dungeon กรุงเทพฯ

Task: P2-F04-T17 (สืบทอดจาก P1-F03-T19) · แก้ล่าสุด P2-H24 (ก่อนหน้า P2-X23) · เจ้าของ: product-manager · สถานะ: ฉบับเสนอ รอ Tech/QA/Content/Design gate ร่วม F04+F05 (P2-F05-T15..T18) และ Product gate F04–F06 (P2-F06-T25) · วันที่: 2026-09-27
แหล่งอ้างอิง: `product/metrics.md` (คู่กัน), `product/prd/F04-dungeon-presence.md`, `product/prd/F05-movement-gate-reward.md`, `product/prd/F06-hp-damage-onboarding.md` (ที่มาของ metric/event ที่ต้องประกาศ), `design/features/F04-dungeon-presence.md` (F04-R07/R08/R17/R20–R24, สถานะ 3.3–3.4), `design/features/F05-movement-gate-reward.md` (F05-R18/R19 = R-B1/D-078, F05-R21/R22 = D-059), `docs/tech/F06-hp-damage-onboarding.md` §2.5/§6.3 (`checkin_rejected` reason เพิ่ม, D-114), §8.4 (ถอน consent ตำแหน่งระหว่าง run, D-116, A-P2-X16-1), `product/playtest/phase-2-plan.md` §11.1 (handoff ต้นทางของงานนี้), `audio/manifest.json` + `audio/cue-list.md` (cue `qc.sent`/`qc.received`/`dungeon.closedOrOutOfRange`, `telemetry: null`, A-P2-F05-T06-1), `config/app/telemetry.json`, `config/app/privacy.json`, `config/balance/anticheat.json`, `config/balance/dungeons.json`, `config/balance/unlocks.json` (`antiCheatHelp.unlockOnEvents` ใช้ชื่อ event ภายในตรงกับที่นี่), CLAUDE.md ข้อ 4 และ 7 (PDPA)
คำตัดสินที่ผูกเอกสารนี้: D-088 (telemetry เป็น ring buffer ในเครื่องล้วน), D-089 (ซ่อนจำนวนคน, ยาจาก drop เท่านั้น, รางวัลแรกเป็น tick ปกติ), D-073 (ลงทะเบียนความสนใจนอกย่านเปิดตัวระดับเขต), D-078 (ลำดับผลของการโดนตี R-B1), D-063 (Wake Lock + pocket screen), D-093 (ช่วงเวลาเดินทดสอบ — ไม่กระทบชื่อ event แต่กระทบการอ่านผล), D-114 (enum `checkin_rejected.reason` เพิ่ม `no_class`/`no_hp`), D-116 (ถอน consent ระหว่าง run จบ run แบบ `manual_exit` เดิม ไม่แตกสาขาใหม่ในกติกาเกม)

## การเปลี่ยนสถาปัตยกรรมจากฉบับ Phase 1 (สำคัญ — อ่านก่อนทุกหัวข้อ)

Phase 1 ฉบับเดิมเขียนโดยสมมติว่ามี server รับ telemetry (envelope มี `server_ts`, `account_id`, มีเพดาน backend rows written) ตาม A-P2-PLAN-01-2/D-088 ที่ tech-lead ตัดสินระหว่าง plan review Phase 2 **Phase 2 ไม่มี server เลย**:

- ข้อมูลไม่ออกจากเครื่องโดยอัตโนมัติ — event ทุกตัวเขียนลง **ring buffer ในเครื่อง** เท่านั้น
- ทางเดียวที่ข้อมูลออกจากเครื่องคือผู้เล่นกด **export เป็นไฟล์ดาวน์โหลด** (ไม่มี auto-upload, ไม่มี beacon เป็นระยะ)
- ไม่มีบัญชี/login ใน Phase 2 (F07 login อยู่ Phase 3) จึงไม่มี `account_id`
- Export ต้องไม่มี wall-clock timestamp ที่แม่นยำ (เหตุผล: `dungeon_id` + wall-clock บอกได้ว่าใครอยู่ที่ไหนเวลาไหน และไฟล์ export อาจถูกใช้เป็นหลักฐานทดสอบที่หลุดเข้า repo สาธารณะได้) — ใช้เวลาสัมพัทธ์จากบรรทัดแรกของไฟล์ export แทน (`t_rel_ms`, C2-2..C2-4, หัวข้อ 1.2)

เอกสารนี้แก้ทุกจุดที่เคยอิงสถาปัตยกรรมแบบมี server ให้ตรงกับด้านบน รายละเอียดทางเทคนิคเต็ม (โครง sink, การ evict, รูปแบบไฟล์ export) เป็นของ tech-lead ใน `docs/tech/F04-dungeon-presence.md`/`F05-movement-gate-reward.md` (P2-F04-T14) — เอกสารนี้กำหนดแค่ชื่อ event, property, และกติกาความเป็นส่วนตัวที่ผูกมัด

## กติกาบังคับที่ทุก event ในเอกสารนี้ต้องผ่าน (protocol ข้อ 9 — programmer emit ต้องตรงชื่อนี้เป๊ะ ห้ามเปลี่ยนเงียบๆ)

1. ชื่อ event เป็น `snake_case` ตาม regex `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`
2. **ห้ามมีพิกัด (lat/lng) หรือ raw GPS sample ใน property ของ event ใดเลย ทั้งในเครื่องและใน export** — ระยะทางส่งเป็น bucket/band เท่านั้น ตำแหน่งอ้างเป็น `dungeon_id` (สถานที่ ไม่ใช่พิกัดผู้เล่น) เท่านั้นเมื่อจำเป็น
3. ห้ามมี property ที่เป็นชื่อจริง อีเมล หรือ identifier ที่ผูกกับตัวตนจริงของผู้เล่น — Phase 2 ไม่มีบัญชี/login เลย จึงไม่มี field ผูกตัวตนใดๆ อยู่แล้วโดยธรรมชาติ (เมื่อ F07 login มาใน Phase 3 ค่อยพิจารณา `account_id` แบบ opaque ใหม่)
4. ห้ามมี property ที่เปิดเผยตำแหน่งหรือตัวตนของผู้เล่น**คนอื่น** (NN-4) — Phase 2 ไม่มี Nearby Party จริง (F09/Phase 3) property ที่เกี่ยวกับ party (`roles_present`, `party_size_bucket`, `full_role`) เป็น schema ที่ประกาศไว้ล่วงหน้า ค่าจริงใน Phase 2 คือค่า cold start เสมอ (party ขนาด 1, roles_present ว่าง)
5. Event ที่เกิดถี่ (ผูกกับ reward tick ทุก `config: dungeons.movementGate.window_s`) ต้องออกแบบให้สืบมาจาก record ที่ engine เขียนอยู่แล้ว ไม่ใช่เขียน row ใหม่แยกต่างหาก — เหตุผลเปลี่ยนจาก "เพดาน backend" (Phase 1) เป็น "เพดานความจุ ring buffer ในเครื่อง" (หัวข้อ 8) แต่หลักการเดียวกัน: อย่าให้ event ความถี่สูงเบียดพื้นที่ event ที่มีค่าต่อการวินิจฉัยมากกว่า
6. **(ใหม่ D-088) export ต้องไม่มี wall-clock timestamp ที่แม่นยำ** — เก็บเวลาแบบสัมบูรณ์ได้เฉพาะใน ring buffer ของเครื่องเพื่อคำนวณภายใน (เช่น timeout ของหน้าจอว่าง, ลำดับเหตุการณ์) แต่ตอน export ต้องแปลงเป็นเวลาสัมพัทธ์จากจุดเริ่มที่เกี่ยวข้องเสมอ (หัวข้อ 1.2)
7. **(ใหม่ D-088) property ทุกตัวอยู่ใน allowlist ที่ทดสอบอัตโนมัติได้ (C2-3)** — เอกสารนี้คือ allowlist ต้นทางที่ tech-lead ใช้สร้างชุดทดสอบสแกนหา key ชื่อ `lat`/`lng`/`lon`/`coords`/`accuracy` และคู่ทศนิยม ≥4 หลักในช่วงพิกัดไทย แล้วทำให้ CI แดงถ้าพบใน event หรือ export

## สารบัญ

1. Envelope กลาง (ในเครื่อง vs export)
2. หมวด Onboarding (รวมการควบคุมข้อมูลในเครื่อง)
3. หมวด Places / core loop (run state, check-in, speed lock, ยา, Wake Lock)
4. หมวด Social (Phase 3)
5. หมวด Economy (Phase 3–4)
6. หมวด Progression (Phase 4)
7. หมวด Guardrail เฉพาะทาง (แบตและจอ)
8. Ring buffer ในเครื่องและข้อกำหนดการ export (แทนที่หัวข้อเพดาน free tier เดิม)
9. ตารางสรุปทุก event ตาม phase
10. สมมติฐานและคำถามค้าง

## 1. Envelope กลาง

**ยึดตาม `docs/tech/F04-dungeon-presence.md` หัวข้อ 12 (P2-F04-T14, สัญญาที่ build จริงแล้ว)** — Phase 2 มีสองชั้น: ค่าที่เก็บ**ในเครื่อง** (ring buffer, ไม่ออกจากเครื่อง) กับค่าที่อยู่ใน**ไฟล์ export** (ผู้เล่นกดดาวน์โหลดเอง) สองชั้นนี้ไม่เหมือนกันทุกฟิลด์ตามกติกาข้อ 6

### 1.1 ในเครื่อง (ring buffer, `config/app/telemetry.json#localSink`)

| Field | ประเภท | คำอธิบาย | Privacy |
| --- | --- | --- | --- |
| `event_name` | string | ชื่อ event ตามเอกสารนี้เป๊ะ (ไม่รู้จัก = ไม่เก็บ + warning ใน dev) | — |
| `client_ts_ms` | int (epoch ms, นาฬิกาเครื่อง) | ใช้คำนวณภายในเท่านั้น (เช่น `emptyScreenAbandonTimeout_s`, ลำดับเหตุการณ์, ระยะเวลา page hidden) **ห้ามอยู่ในไฟล์ export** (กติกาข้อ 6) | ไม่ออกจากเครื่อง |
| `session_id` | string (opaque, 8 hex จาก `crypto.randomUUID`) | สุ่มใหม่ทุกครั้งที่โหลดหน้า ใช้เชื่อม event ภายใน session เดียวกัน ไม่ใช่ระบุตัวตน | pseudonymous, ไม่ผูกบัญชี (ไม่มีบัญชีใน Phase 2) |
| `platform` | enum `web_android` \| `web_ios` | ใช้แยกผลตาม A-P1-PLAN-01-6 | ไม่ใช่ PII |
| `app_version` | string | เวอร์ชัน build ของ client | — |
| `properties` | object | เฉพาะของแต่ละ event (หัวข้อ 2–7) | ตามแต่ละ event |

**ไม่มี field `run_id`** — engine มี `run.runId` ภายใน (`docs/tech/F04-dungeon-presence.md` §2.3) แต่ mapper ของ client**ไม่ยกมาใส่ envelope ของ telemetry** ต้องเชื่อมโยง event ของ run เดียวกันด้วยลำดับ `dungeon_entered` → ... → `dungeon_exited` ภายใน `session_id` เดียวกันแทน (ปกติของการอ่าน log ที่เรียงตามเวลาอยู่แล้ว) **ไม่มี field `account_id`** ใน Phase 2 (ไม่มีบัญชี/login จน F07 มาใน Phase 3) **ไม่มี field `server_ts`** (ไม่มี server รับ) **ไม่มี `device_id`, advertising id, IP address**

### 1.2 ในไฟล์ export (`config/app/telemetry.json#export`, รูปแบบ JSONL, `.jsonl`)

| Field | ประเภท | คำอธิบาย |
| --- | --- | --- |
| `event_name` | string | เหมือนในเครื่อง |
| `t_rel_ms` | int (มิลลิวินาที) | **แทนที่ `client_ts_ms` ทั้งหมด** = `client_ts_ms − client_ts_ms ของบรรทัดแรกในไฟล์ export นั้น` ไฟล์จึงไม่มี wall-clock หรือวันที่ใดๆ เลย (ชื่อไฟล์เองก็ไม่มีวันที่ — `kw-p2-telemetry-<8 hex สุ่ม>.jsonl`) |
| `session_id`, `platform`, `app_version`, `properties` | เหมือนในเครื่อง | |

ไม่มี `client_ts_ms` ในไฟล์นี้เด็ดขาด (กติกาข้อ 6, C2-4) ก่อนสร้างไฟล์ ตัว export ตัด property ที่ชื่อผิด (`app.telemetry.export.forbiddenPropertyNames`: `lat`, `lng`, `lon`, `latitude`, `longitude`, `coords`, `coordinates`, `accuracy`, `accuracy_m`, `position`, `geometry`, `geohash`, `client_ts`, `server_ts`, `timestamp`) และตัดค่าตัวเลข/สตริงตัวเลขที่ทศนิยม ≥4 หลักและอยู่ในช่วงพิกัดไทย (`latRange_deg` 5.0–21.0, `lngRange_deg` 97.0–106.0) ทิ้งอัตโนมัติ (นับจำนวนที่ตัดใน HUD ไม่ export ค่านั้น) — allowlist ต้นทางของด่านนี้คือชื่อ property ทุกตัวในเอกสารนี้เอง (กติกาข้อ 7)

## 2. หมวด Onboarding

ที่มา: `design/ux/flows/F03-core-loop.md` Flow A, `product/prd/F01-coverage-survey.md` §6 (สาม event แรกด้านล่างต้องคงชื่อนี้ตามที่ PRD เสนอไว้), `product/prd/F06-hp-damage-onboarding.md` §4

### `onboarding_funnel_step`
- **ยิงเมื่อ:** ผู้เล่นเห็นหรือผ่านแต่ละขั้นของ Flow A นาที 0–1 ตามลำดับจริงของ `design/features/F06-hp-damage-onboarding.md` F06-R44 (**age gate มาก่อน consent ตำแหน่งเสมอ**, ไม่มีขั้น login ใน Phase 2, F06 หัวข้อ 2 ข้อ 2 / หัวข้อ 7)
- **properties:**
  | key | ประเภท | ค่าที่เป็นไปได้ |
  | --- | --- | --- |
  | `step` | enum | `intro`, `age_gate_shown`, `age_gate_passed`, `age_gate_under_min`, `consent_location_shown`, `consent_location_accepted`, `consent_location_declined`, `permission_browser_shown`, `permission_browser_allowed`, `permission_browser_blocked`, `map_view_reached`, `class_select_shown`, `class_selected` |
  | `funnel_bucket` | enum | `0-1`, `1-3`, `3-6`, `6-8`, `8-10` (ตามช่วงที่ CLAUDE.md กำหนด) |
  | `class_selected` | enum \| null | `tanker`\|`ranged`\|`support`\|`magic` — มีค่าเฉพาะ `step=class_selected` |
- **privacy:** ไม่มีพิกัด ไม่มีอายุจริงหรือปีเกิด (แค่ผ่าน/ไม่ผ่านเกณฑ์ ตาม F06-R45 — เก็บเฉพาะธงว่าผ่าน ไม่เก็บปีเกิด/ช่วงอายุ)
- **แก้จาก Phase 1:** ตัด `login_shown`/`login_success`/`login_error` ออกทั้งหมด (F06 หัวข้อ 2 ข้อ 2: "ไม่มี login ไม่มี account ใน Phase 2 · ขั้น login ของ Flow A ไม่มีใน Phase 2" — ไม่ใช่แค่ไม่ emit แต่ไม่มีขั้นนี้ในระบบเลยจน F07/Phase 3) และสลับลำดับ `age_gate_*` มาก่อน `consent_location_*` ให้ตรง F06-R44 (เหตุผล NN-7 — ไม่ขอ consent/สิทธิ์ตำแหน่งจากผู้เล่นที่ยังไม่ผ่าน age gate) [ASSUMPTION A-P2-F04-T17-3: เมื่อ F07 login เข้ามาใน Phase 3 ให้เพิ่ม `login_*` กลับเข้าตำแหน่งที่ flow จริงของตอนนั้นกำหนด ไม่ใช่ตำแหน่งเดิมของ Phase 1 อัตโนมัติ ยืนยัน: tech-lead, uiux-designer]

### `onboarding_first_reward_granted`
- **ยิงเมื่อ:** ผู้เล่นได้ผ่าน movement gate ครั้งแรกในเครื่องนี้ (tick แรกของ run แรกในชีวิตที่ผ่าน gate ตาม F05-R15/F06-R39 — เป็น tick ปกติ ไม่มี code path แยก, D-089) — **event นี้คือธงที่ metric "≥70% ถึงรางวัลก้อนแรกใน 10 นาที" (PRD F06 §4) วัดโดยตรง** ทุกครั้งที่ event นี้ยิง จะมี `run_tick_granted` ยิงคู่กันในเวลาเดียวกันเสมอ (event นี้เป็นแค่ธง "เป็นครั้งแรกในชีวิต" ไม่ใช่ tick แยกต่างหาก ไม่มี code path ของตัวเอง)
- **properties:** `dungeon_id` (ปลายทาง ไม่ใช่พิกัดผู้เล่น), `minutes_since_first_open_bucket` (enum: `0-10`, `10-30`, `30-60`, `60+`), `class` (enum `tanker`\|`ranged`\|`support`\|`magic` — ใช้แบ่งกลุ่มผลตาม class ตามที่ game-director ขอ)
- **privacy:** ไม่มีพิกัด
- **นิยามตัวหารของ metric (ยืนยัน A-P2-F06-T02-2 ของ PRD F06 ตามที่ game-director เสนอ ไม่มีจุดต้องแก้):** ตัวหารคือจำนวนเครื่อง/บัญชีที่**เริ่ม onboarding และอยู่ในสถานะ "ใกล้" ภายในย่านเปิดตัว**เมื่อถึงขั้นนำทาง (ไม่ใช่ `far`/`out_of_area`/`outside_launch_district` — คนกลุ่มนั้นนับใน GR-2 แยกต่างหาก ไม่ใช่ตัวหารนี้) tick แรกที่**ไม่ผ่าน gate** (`run_tick_denied`) นับเป็น "ยังไม่ถึง" ไม่ใช่ตัวหารที่ถูกตัดออก — สอดคล้องโดยธรรมชาติเพราะ event นี้ยิงเฉพาะตอนผ่านเท่านั้น
- **แก้จาก Phase 1:** เดิมใช้ `minutes_since_account_created_bucket` — Phase 2 ไม่มีบัญชี (ไม่มี login จน F07/Phase 3) เปลี่ยนเป็น `minutes_since_first_open_bucket` นับจากครั้งแรกที่เปิดแอปบนเครื่องนี้ (เก็บ timestamp การเปิดแอปครั้งแรกไว้ในเครื่องเพื่อคำนวณ bucket นี้เท่านั้น ไม่ export เป็น wall-clock) [ASSUMPTION A-P2-F04-T17-1: เมื่อ F07 login มาใน Phase 3 ให้เพิ่ม `minutes_since_account_created_bucket` กลับเป็น property คู่กัน ไม่ใช่แทนที่ ยืนยัน: tech-lead]

### `onboarding_nearest_dungeon_distance` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** เปิดแอปครั้งแรก (หรือครั้งแรกหลังให้ consent location) และคำนวณระยะถึง dungeon ที่ใกล้ที่สุด
- **properties:** `distance_band` (enum `green`\|`yellow`\|`red` ตามนิยาม PRD F01 §3), `nearest_open_dungeon_id` (nullable — ปลายทางที่ระบบแนะนำ ไม่ใช่พิกัดผู้เล่น)
- **privacy:** ไม่มีพิกัด ไม่มี dungeon id เดี่ยวของ "ตำแหน่งผู้เล่น" มีแค่ปลายทางที่แนะนำ
- **สถานะการ emit จริง (P2-H50, ปิดส่วนนี้ของ TG-12):** tech gate F06 รอบ 1 พบว่ายังไม่มีจุดยิงใน `apps/client/src` — **ตัดสินใจ: ไม่บังคับก่อน playtest ภาคสนาม P2-F06-T27** เหตุผล: (1) ไม่ผูกกับคำถามหรือเกณฑ์ PASS/FIX-FIRST ใดใน `product/playtest/phase-2-plan.md` §5/§6 (2) guardrail ที่ event นี้ควรป้อนข้อมูลระยะยาว (GR-1, `product/metrics.md` §3.2/§9.1–9.2) ปิดแล้ว PASS ทั้ง 3 ย่านจากชุดข้อมูล coverage แบบ static ไม่ใช่จาก telemetry รันไทม์ (3) ผู้ร่วม playtest ถูกนัดไปเดินที่ dungeon ที่รู้ระยะอยู่แล้วตาม `qa/playtest/phase-2-kit.md` (PN-2 พระนคร) การกระจาย `distance_band` จาก N≈3 คนที่คัดมาแล้วไม่มีความหมายเชิงสถิติสำหรับ metric ที่ออกแบบมาวัดประชากรทั้งย่านหลังเปิดตัวจริง — **คง Phase 2 ไว้ในเชิงความสามารถของระบบ** (ไม่ต้องรอฟีเจอร์ Phase 3 ใด ไม่มี dependency กับ login/party) **แต่เลื่อนงาน implement เป็น backlog ที่ต้องปิดก่อน regional launch จริง** (product gate ของ F23/live monitoring) **ไม่ใช่ก่อน P2-F06-T27** — ไม่เปิดงาน gameplay-programmer รอบนี้สำหรับ event นี้ (ยืนยัน: product-manager, P2-H50)

### `onboarding_empty_screen_shown` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** แสดงหน้าจอ fallback เมื่อ dungeon ไกล/นอกพื้นที่/นอกย่านเปิดตัว (P2-F06-T09: จอไกล / นอกพื้นที่ / นอกย่านเปิดตัว)
- **properties:** `reason` (enum `far`\|`out_of_area`\|`outside_launch_district`)
- **privacy:** ไม่มีพิกัด
- **แก้จาก Phase 1:** ตัด `far_temporarily_closed` ออก (dungeon ปิดเพราะเวลาทำการมีแผงของตัวเอง ไม่ใช่หน้าจอว่างแบบนี้ ตาม F04-R27/R38) เพิ่ม `outside_launch_district` ตาม D-073 (อยู่ในพื้นที่เล่นจริงแต่ย่านยังไม่เปิดตัว เช่น อยู่ในกรุงเทพฯ แต่ไม่ใช่พระนคร/ปทุมวัน/บางรัก)

### `onboarding_empty_screen_abandoned` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** ปิดแอปหรือสลับออกจากหน้าจอ fallback ภายใน `config: telemetry.sampling.emptyScreenAbandonTimeout_s` โดยไม่กดปุ่มใด (นำทาง/ลงทะเบียนความสนใจ/ทางลัด role-info/profile)
- **properties:** `reason` (เหมือนด้านบน), `seconds_before_close_bucket` (enum `0-10`, `10-30`, `30-60`, `60+`)
- **privacy:** ไม่มีพิกัด

### `interest_registered_outside_area` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** กดปุ่มลงทะเบียนความสนใจใน `S-09-interest-register` — Phase 2 เกิดได้จากสองบริบท (D-073 เพิ่มบริบทที่สองหลัง PRD F01 เขียนเสร็จ)
- **properties:**
  | key | ประเภท | ค่าที่เป็นไปได้ |
  | --- | --- | --- |
  | `scope` | enum | `province` (อยู่นอกพื้นที่เล่นทั้งหมด เช่น ต่างจังหวัด/นอกปริมณฑล) \| `district` (อยู่ในพื้นที่เล่นจริงแต่ย่านยังไม่เปิดตัว ตาม D-073 "ช่วยกันปลุกย่านเรา") |
  | `area_name` | string | เลือกจากรายการที่ระบบให้เท่านั้น **ไม่ใช่ข้อความอิสระ** (D-073) — `scope=province`: รายชื่อจังหวัด/"อื่นๆ" ตาม PRD F01 §6 เดิม · `scope=district`: รายชื่อเขต/อำเภอของพื้นที่เล่นที่ยังไม่เปิดตัว มาจากขอบเขตของ level-designer |
- **privacy:** เก็บระดับจังหวัดหรือระดับเขตเท่านั้น ไม่เก็บพิกัดจุด ไม่มีข้อความอิสระ (D-073)
- **แก้จาก Phase 1:** PRD F01 §6 เดิมกำหนด property เดียวชื่อ `province` (ใช้ได้เฉพาะกรณีนอกพื้นที่เล่นทั้งหมด) เอกสารนี้ขยายเป็น `scope` + `area_name` เพื่อรองรับกรณีที่สองของ D-073 (อยู่ในพื้นที่เล่นแต่ย่านไม่เปิด) โดย**ไม่เปลี่ยนชื่อ event** (โปรโตคอลข้อ 9 ล็อกแค่ชื่อ event ไม่ใช่ property) — เมื่อ `scope=province` ค่า `area_name` เทียบเท่า `province` เดิมทุกประการ จึงไม่กระทบ metric ที่มีอยู่แล้ว [ASSUMPTION A-P2-F04-T17-2: รายชื่อเขต/อำเภอของ `scope=district` มาจาก polygon ขอบเขตพื้นที่เล่นของ level-designer (P2-F04-T13/ชุดเดียวกับ playarea-mask) ไม่ใช่รายชื่อที่ product-manager กำหนดเอง ยืนยัน: level-designer, game-director (เจ้าของ D-073)]

### ควบคุมข้อมูลในเครื่อง (D-088, C2-6)

### `local_data_cleared`
- **ยิงเมื่อ:** ผู้เล่นกดยืนยันปุ่ม "ลบข้อมูลในเครื่อง" (P2-F06-T09/F06-R49) — ตามลำดับจริงของ `docs/tech/F04-dungeon-presence.md` §10.4: ลบทุก key ที่ขึ้นต้น `app.privacy.localData.storageKeyPrefix` ก่อน แล้วเขียน ring buffer ใหม่ที่มี event นี้เป็น**บรรทัดแรกบรรทัดเดียว** จากนั้นโหลดหน้าใหม่เข้า onboarding
- **properties:** ไม่มี (object ว่าง)
- **privacy:** ไม่มีพิกัด ไม่มี property ใดเลย
- **หมายเหตุพิเศษ (แก้จากฉบับก่อน):** event นี้**ไม่ได้ถูกล้างไปพร้อมกัน** — มันคือเมล็ดพันธุ์ของ ring buffer ใหม่ จึงเป็นบรรทัดแรกของไฟล์ export ครั้งถัดไปเสมอ (ต่างจากที่ร่างก่อนหน้านี้เข้าใจผิดว่าถูกลบตัวเองด้วย) ใช้ทั้งเป็นสัญญาณ e2e/QA และเป็นจุดอ้างอิงว่า session ไหนเริ่มหลังการลบข้อมูล (แต่ยังนับ "อัตราการลบ" แบบ aggregate ข้ามผู้เล่นไม่ได้ เพราะแต่ละไฟล์ export เห็นเฉพาะเครื่องตัวเอง)

### `location_consent_withdrawn` *(ใหม่ — P2-X23, D-116, ปิด A-P2-X16-1 · `docs/tech/F06-hp-damage-onboarding.md` §8.4)*
- **ยิงเมื่อ:** ผู้เล่นกดถอน consent ตำแหน่งจากตั้งค่า (R48 ข้อ 1–3) — ยิงในขั้นตอนที่ 4 ของลำดับถอน consent (§8.4) คือ**หลัง** `state` ถูก `purgeLocationData` และ**หลัง**เขียน `kw.p2.consent = { location: 'withdrawn' }` ถ้าอยู่ระหว่าง run ลำดับ ring buffer คือ `dungeon_exited` (จบ run แบบ `manual_exit` ในขั้นตอนที่ 2 ของ §8.4) ตามด้วย `location_consent_withdrawn` ที่ `at_ms`/`t_rel_ms` เดียวกัน — mapper จับคู่สองเหตุการณ์นี้ได้ด้วยเวลาที่เท่ากัน ไม่ต้องมี field เชื่อมโยงเพิ่ม
- **properties:** `during_run` (bool — จริงเมื่อมี `state.run !== null` ตอนกดถอน กล่าวคือมี `dungeon_exited { exit_reason: manual_exit }` คู่กันในเวลาเดียวกัน · เท็จเมื่อกดถอนตอนไม่มี run ใดทำงานอยู่ ไม่มี `dungeon_exited` คู่กัน)
- **privacy:** ไม่มีพิกัด ไม่มี timestamp ใดนอกเหนือ envelope กลาง (`t_rel_ms` ของหัวข้อ 1.2) — object นี้ไม่มี field เวลาของตัวเอง (ต่างจาก `client_ts_ms` ที่ envelope จัดการให้อยู่แล้ว), ไม่มีข้อมูลตัวตน
- **เหตุผลที่ประกาศแยกจาก `dungeon_exited.exit_reason = manual_exit`:** F06-tech §8.4 ยืนยันว่า `exit_reason` ของ `dungeon_exited` **ยังคงเป็น `manual_exit` เดิมสำหรับตัว run เอง** (ไม่แตกค่าใหม่ ไม่แตกสาขาโค้ดใน `reward`/`hp` — เหตุผลของ tech-lead: R48 ข้อ 3 บังคับให้จ่ายเท่ากับ `manual_exit` ทุกประการอยู่แล้ว) แต่การถอน consent เป็นสัญญาณ PDPA/ความปลอดภัยที่ต่างจาก "ผู้เล่นกดออกเพราะเดินจบแล้ว" โดยเฉพาะช่วง playtest ที่มีผู้ร่วมอายุ 15–17 ปี — ไม่แยก event นี้จะทำให้อัตรา `manual_exit` ปนสองเหตุผลที่ต่างกันจนตีความ funnel/churn ผิด (คาดว่าสัดส่วนน้อยมากใน playtest ตามที่ tech-lead ประเมินไว้)
- **ตัดสินใจแล้ว (ไม่ใช่คำถามค้าง):** ประกาศ event นี้ — ต้นทุนต่ำ (ความถี่ต่ำมาก ไม่กระทบเพดาน ring buffer หัวข้อ 8) เทียบกับประโยชน์ด้าน PDPA ที่ชัดเจน (ยืนยันร่วม: tech-lead ผู้เสนอ mapper, game-director ยืนยันไม่ต้องแยกเชิงกติกาเกม)

## 3. หมวด Places / core loop (run state)

ที่มา: `design/features/F04-dungeon-presence.md` (F04-R01–R39, สถานะ 3.3–3.4), `design/features/F05-movement-gate-reward.md` (F05-R01–R28), `design/ux/flows/F03-core-loop.md` Flow B–C — event กลุ่มนี้เป็นแกนของ north star proxy Phase 2 (`product/metrics.md` §1.1) และ metric หมวด Places (§7)

### `dungeon_confirm_shown`
- **ยิงเมื่อ:** popup `S-02-dungeon-confirm` เปิด (รวมกรณี polygon ซ้อนตาม F04-R03)
- **properties:** `dungeon_id`, `roles_present` (list ของ role ที่มีคนอยู่ — **Phase 2 เป็น `[]` เสมอ** เพราะไม่มี Nearby Party จริง (F09/Phase 3, D-089 ซ่อนจำนวนคนทุกจุด) เก็บ schema ไว้ล่วงหน้า), `overlap` (bool — จริงใน Phase 2, มาจาก F04-R03), `vs_boss_choice_available` (bool — **Phase 2 เป็น `false` เสมอ**, raid card choice เป็น F16–F18/Phase 6)
- **privacy:** `dungeon_id` คือสถานที่ ไม่ใช่พิกัดผู้เล่น

### `checkin_rejected` *(F04-R07/R08, GD B-03 — reason ยึดตาม `docs/tech/F04-dungeon-presence.md` §2.5 และ `docs/tech/F06-hp-damage-onboarding.md` §6.3)*
- **ยิงเมื่อ:** ผู้เล่นกด "เข้า" แต่ engine ปฏิเสธ check-in ที่ `confirm` (popup ยังเปิดอยู่ ปุ่มยัง disable)
- **properties:** `dungeon_id`, `reason` (enum `speed_lock`\|`poor_accuracy`\|`not_enough_trace`\|`no_approach_from_outside`\|`dungeon_closed`\|`run_active`\|`unsupported_mode`\|`no_class`\|`no_hp`)
- **privacy:** ไม่มีพิกัด ไม่เอ่ยคำว่า anti-cheat/โกงใน copy ที่ผู้เล่นเห็น (F04-R10) แต่ telemetry เก็บ reason ตรงๆ ได้เพราะเป็น internal event ไม่ใช่ copy
- **แก้จากร่างก่อน:** ขยาย `reason` จาก 4 เป็น 7 ค่าให้ตรงกับ engine จริง — เพิ่ม `dungeon_closed` (dungeon ปิดพอดีตอนกด), `run_active` (มี run อื่นอยู่แล้ว, F04-R01), `unsupported_mode` (`verification_mode` อื่นนอก `continuous_gps`, ADR 0003 §7 — ไม่ควรเกิดใน Phase 2 เพราะ dungeon นำร่องทั้งหมดเป็น `continuous_gps` แต่ใส่ไว้กันโค้ดพัง)
- **(P2-X23, D-114) ขยายอีกครั้งจาก 7 เป็น 9 ค่า** — เพิ่ม `no_class` (กด "เข้า" ก่อนเลือกพลัง, engine ปฏิเสธที่ `player.classId = null`, F06-tech §6.3 ข้อ 1 — ทางปกติไม่เกิดเพราะ sheet บังคับเลือก class มาก่อนถึงแผนที่แล้ว, fail closed) และ `no_hp` (HP ≤ 0 พอดีตอนกด "เข้า", F06-tech §6.3 ข้อ 2 — เกิดได้เฉพาะวินาทีที่ตายพอดี เพราะการฟื้นเริ่มทันทีตามเงื่อนไข "HP > 0" ของ R27) ปิด A-P2-F06-T04-5 (ยืนยันร่วม: game-director กติกาปฏิเสธ, tech-lead mapper) — enum นี้ตอนนี้คือ 9 ค่าเป๊ะตามที่ `docs/tech/F06-hp-damage-onboarding.md` บรรทัด 321–325, 591, 608 ระบุ
- **ใช้ตอบคำถามค้าง:** PRD F04 §6 ข้อ "สัดส่วนคนที่เจอ `no_approach_from_outside` ครั้งแรกและเวลาที่เสียไป" (คำนวณจากคู่ `checkin_rejected` ก่อนหน้ากับ `dungeon_entered` ที่สำเร็จของ `dungeon_id` เดียวกัน)
- **(P2-X23) หมายเหตุ cue เสียง `dungeon.closedOrOutOfRange` (`audio/cue-list.md`, A-P2-F05-T06-1):** cue นี้**ไม่ได้ผูกกับ event ใหม่** — เส้นทางที่ผ่าน `confirm` แล้วถูกปฏิเสธเพราะปิดพอดี ถูกนับใน `checkin_rejected` (`reason=dungeon_closed`) อยู่แล้วโดยไม่ต้องประกาศเพิ่ม แต่เส้นทางที่พบบ่อยกว่าของ cue นี้ (แสดง `[dungeon.closedTitle]`/`[dungeon.outOfRangeTitle]` ตอนเดินเข้าเขตหรือแตะหมุดโดยยังไม่มีปุ่ม "เข้า" ให้กดเลย ตาม F04 B4) **ไม่มี event ยิงเลยในเครื่องมือ engine ของ Phase 2** เพราะไม่มีการเรียก `sessionStep(confirm)` ในเส้นทางนั้น — คงค่า `telemetry: null` ของ manifest ไว้ตามที่ sound-designer ตั้งไว้แล้ว ไม่ต้องสร้าง event ใหม่ (ต้นทุน/ประโยชน์ไม่คุ้มกับ event ที่เกิดถี่จากการเลื่อนแผนที่ผ่านหมุดปิด)

### `dungeon_entered`
- **ยิงเมื่อ:** engine ยืนยันเข้า run สำเร็จ (Flow B5, F04 T3) — event นี้คือจุดเริ่มของ run ใหม่ (engine มี `run.runId` ภายใน แต่ envelope ของ telemetry ไม่มี field แยก ดูหัวข้อ 1.1)
- **properties:** `dungeon_id`, `entry_type` (enum `normal`\|`overlap_choice`\|`raid_choice` — `raid_choice` เป็น schema ล่วงหน้า Phase 6 เข้าไม่ถึงใน Phase 2), `party_size_at_entry_bucket` (enum `1`, `2`, `3`, `4+` — **Phase 2 เป็น `1` เสมอ**)
- **privacy:** ไม่มีพิกัด

### `dungeon_exited`
- **ยิงเมื่อ:** run จบทุกเส้นทาง (`S-04-run-summary` แสดง, F05-R24)
- **properties:**
  | key | ประเภท | ค่าที่เป็นไปได้ |
  | --- | --- | --- |
  | `dungeon_id` | string | — |
  | `exit_reason` | enum | `manual_exit`, `auto_retreat`, `death`, `timeout`, `dungeon_closed`, `emergency_close`, `clock_invalid`, `suspended_by_reports` |
  | `duration_s_bucket` | enum | `0-5m`, `5-15m`, `15-30m`, `30-60m`, `60m+` |
  | `ticks_granted_count` | int | จำนวน tick ที่ผ่าน gate ตลอด run (รวม tick บางส่วนที่ผ่านตาม F05-R22) |
  | `partial_tick_applied` | bool | จริงเมื่อ tick สุดท้ายเป็น tick บางส่วนของ D-059 (F05-R22/R23) — ช่วยแยก "run ที่นับ" จาก tick บางส่วนออกจาก tick เต็ม |
  | `page_hidden_total_s_bucket` | enum | `0`, `0-30`, `30-120`, `120-600`, `600+` — เวลารวมที่หน้าเว็บ hidden ระหว่าง run นี้ (P2-F06-T14) |
  | `wake_lock_engaged_share_bucket` | enum | `0`, `0-25`, `25-75`, `75-100` (% ของเวลา run ที่ Wake Lock ถืออยู่จริง) — `null` ถ้า Wake Lock ไม่รองรับบนอุปกรณ์นี้ |
  | `class` | enum | `tanker`\|`ranged`\|`support`\|`magic` — ใช้แบ่งกลุ่มเวลาอยู่รอด/exit_reason ตาม class (D-020: solo non-Tanker ถึง auto-retreat ~27.8 นาที เป็นค่าที่คาดไว้ ไม่ใช่บั๊ก ต้องแยกกลุ่มก่อนอ่านผล) |
- **แก้จาก Phase 1:** `exit_reason` เปลี่ยนจาก `completed`\|`auto_retreat`\|`died`\|`manual_exit`\|`closed_by_moderator` เป็นชุดที่ตรงกับ F04-R17 ทุกตัว (ไม่มี "completed" เพราะ run ไม่มีเพดานเวลา F05-R28 — จบได้แค่ตามเหตุในตาราง) `suspended_by_reports` เป็น schema ล่วงหน้า (F13–F15/Phase 5, engine รองรับ D-059 แล้วแต่ไม่มีทางเรียกนอก test ใน Phase 2 ตาม F04 §6) เพิ่ม `partial_tick_applied`, `page_hidden_total_s_bucket`, `wake_lock_engaged_share_bucket` แทนการเปิด event แยกต่อการ toggle (ประหยัดความจุ ring buffer ตามหัวข้อ 8 ข้อ 1) เพิ่ม `class` ตามคำขอ segment ผลตาม class
- **privacy:** ไม่มีพิกัด

### `run_state_changed` *(ใหม่ — ยึดตาม `docs/tech/F04-dungeon-presence.md` §2.5, ครอบเฉพาะวงจร Active/Grace/Suspended)*
- **ยิงเมื่อ:** run เปลี่ยนสถานะระหว่าง `active`/`grace`/`suspended` (F04 transition T6, T7, T8 — **ไม่ครอบ** T1–T5 ก่อนมี run และ T9–T10 ที่จบเป็น `dungeon_exited` และ T11–T12 ที่เป็น `anticheat_speed_lock_triggered`) — ยิงด้วยเวลาที่ backdate แล้วตาม F04-R14
- **properties:** `dungeon_id`, `from` (enum `active`\|`grace`\|`suspended`), `to` (enum เดียวกัน), `cause` (enum `left_polygon`\|`no_evidence`\|`returned`\|`grace_expired`)
- **privacy:** ไม่มีพิกัด
- **ใช้ทำอะไร:** ตอบคำถาม PRD F04 §4 "อัตราการสลับ state ถี่ผิดปกติระหว่างเดินเลียบขอบจริง" ด้วย event อัตโนมัติแทนการพึ่งบันทึกผู้สังเกตอย่างเดียว (นับจำนวน `run_state_changed` ต่อ run ต่อนาที เทียบเกณฑ์ "ไม่เกิน 1 ครั้งต่อ 5 นาทีต่อการเดินเลียบขอบต่อเนื่อง")

### `dungeon_closing_soon_notified` *(ใหม่ — F04-R29)*
- **ยิงเมื่อ:** แจ้งเตือนใกล้ปิด (ครั้งเดียวต่อ run ตามที่ engine ส่ง `dungeon_closing_soon`)
- **properties:** `dungeon_id`
- **privacy:** ไม่มีพิกัด — ไม่เก็บ `closes_in_s` เพราะเป็นค่าคงที่เดียวกับ `config: dungeons.openingHours.closingSoonNotice_s` เสมอ (ไม่มีข้อมูลใหม่)

### `navigation_link_opened` *(ใหม่ — F04-R37, D-089 เงื่อนไข A-3/D-089)*
- **ยิงเมื่อ:** ผู้เล่นกดปุ่มนำทางเปิดแอปแผนที่ภายนอก
- **properties:** `dungeon_id`, `target` (enum `google_maps`\|`apple_maps`\|`copy_fallback`), `fallback_auto` (bool — จริงเมื่อ client เลือก fallback ให้เองเพราะเปิด deep link ไม่สำเร็จ)
- **privacy:** ไม่มีพิกัด ไม่มีตำแหน่งผู้เล่นใน URL (F04-R37 — ลิงก์มีแค่ปลายทางสาธารณะ)

### `run_tick_granted`
- **ยิงเมื่อ:** ผ่าน movement gate ในหน้าต่าง `config: dungeons.movementGate.window_s` (multi-purpose event — ฐานของ north star proxy Phase 2 ตาม `product/metrics.md` §1.1, GR-11, และของ Places/Social/Economy ในอนาคตเพื่อไม่เพิ่มจำนวน event ตามหัวข้อ 8)
- **properties:** `dungeon_id`, `party_size_bucket` (enum `1`, `2`, `3`, `4+` — **Phase 2 เป็น `1` เสมอ**), `full_role` (bool — **Phase 2 เป็น `false` เสมอ** ไม่มี party จริง), `roles_present` (list — **Phase 2 เป็น `[class ตัวเอง]` เสมอ** เช่น `["tanker"]` ไม่ใช่ `[]` เพราะ "role ที่อยู่ในดันตอนนี้" นับตัวเองด้วย — ต่างจาก `dungeon_confirm_shown.roles_present` ที่เป็น `[]` เพราะยังไม่เข้า), `partial` (bool — จริงเมื่อเป็น tick บางส่วนของ D-059 ที่ผ่านเกณฑ์ย่อ F05-R22, ชื่อ property ตรงกับ field ภายในของ engine เป๊ะ), `class` (enum เหมือนด้านบน — ซ้ำกับสมาชิกเดียวใน `roles_present` โดยตั้งใจ เพื่อ segment ง่ายโดยไม่ต้อง parse list)
- **privacy:** ไม่มีพิกัด ไม่มีระยะทางจริง (แค่ผ่าน/ไม่ผ่าน)
- **นี่คือ event ที่ north star proxy ของ Phase 2 คำนวณจากโดยตรง** (`product/metrics.md` §1.1, PRD F05 §4) — ต้องมาจาก reducer เดียวกับที่ตัดสินรางวัลจริงเท่านั้น (`packages/shared/src/reward`) ห้ามมี write path แยก
- **แก้จากร่างก่อน:** เปลี่ยนชื่อ `partial_tick` → `partial` และแก้ `roles_present` จาก `[]` เป็น `[class ตัวเอง]` ให้ตรงกับ `docs/tech/F04-dungeon-presence.md` §12.3 (mapper ที่ tech-lead ระบุไว้แล้ว)

### `run_tick_denied`
- **ยิงเมื่อ:** ไม่ผ่าน movement gate ในหน้าต่างนั้น (`design/features/F05-movement-gate-reward.md` F05-R08 — ไม่ใช่การลงโทษ)
- **properties:** `dungeon_id`, `class`, `partial` (bool — จริงเมื่อเป็นหน้าต่างที่ถูกประเมินแบบย่อของ D-059 และยังไม่ผ่านเกณฑ์ย่อ F05-R22 เช่นกรณี E10 ปิดตอนหน้าต่างค้าง 59 วินาที)
- **privacy:** ไม่มีพิกัด
- **แก้จากร่างก่อน:** เพิ่ม `partial` ตามคำขอของ tech-lead ให้สมมาตรกับ `run_tick_granted` (ตารางเหตุการณ์ของ engine ในเอกสารเทคนิคระบุแค่ `dungeonId`, `tickIndex` สำหรับ event นี้ แต่ tech-lead ยืนยันเพิ่มเติมโดยตรงว่าต้องมี `partial` ด้วยทั้งสอง event)

### `run_hp_low`
- **ยิงเมื่อ:** HP ถึง `config: dungeons.hpSafety.lowHpWarningThreshold_pct` (F06-R14 — ครั้งเดียวต่อการลงผ่านเส้น, ติดอาวุธใหม่เมื่อขึ้นเหนือเส้น)
- **properties:** `dungeon_id`, `class`
- **privacy:** ไม่มีพิกัด, ไม่มีค่า HP ที่แม่นยำเกินไป (ใช้ threshold event ไม่ใช่ HP ต่อเนื่อง)

### `run_auto_retreat`
- **ยิงเมื่อ:** auto-retreat ทำงาน (`config: dungeons.hpSafety.autoRetreatThreshold_pct`, F06-R16 — เปิด auto-retreat และ HP สุดท้ายหลังยา ≤ เกณฑ์)
- **properties:** `dungeon_id`, `class`, `minutes_since_run_start_bucket` (enum `0-15`, `15-30`, `30-45`, `45-60`, `60+` — ใช้วัด "เวลาถึง auto-retreat ต่อ class" ตรงตาม CLAUDE.md โดยไม่ต้อง join กับเวลา wall-clock ใดๆ เพราะเป็นเวลาสัมพัทธ์จาก run start อยู่แล้ว)
- **privacy:** ไม่มีพิกัด

### `run_death`
- **ยิงเมื่อ:** HP ถึง 0 — **เกิดได้เฉพาะตอนปิด auto-retreat เท่านั้น** (F06-R17/R23, D-078 R-B1: เปิด auto-retreat = พื้นตัดที่ HP 1 เสมอ ตายจากการโดนตีไม่ได้ ไม่มีทาง "HP ลดเร็วกว่าระบบดึงทัน" เพราะลำดับผลต่อ hit ตัดสินทีละจังหวะเดียวเสมอ)
- **properties:** `dungeon_id`, `class`
- **privacy:** ไม่มีพิกัด
- **แก้จาก Phase 1:** เดิมเอกสารเผื่อเหตุ "HP ลดเร็วกว่าระบบดึงทัน" ไว้ด้วย — ตัดออกเพราะขัดกับ D-078/F06-R17 ที่ยืนยันแล้วว่าเปิด auto-retreat ตายจาก hit ไม่ได้เด็ดขาด ทางเดียวที่ตายคือผู้เล่นปิด auto-retreat เองในหน้าตั้งค่าก่อนหน้านั้น

### `auto_retreat_setting_changed` *(ใหม่ — F06-R19/R20, NN-6)*
- **ยิงเมื่อ:** ผู้เล่นเปิด/ปิด auto-retreat จากหน้าย่อย "การเดินและความปลอดภัย" ในตั้งค่า (ไม่ใช่ตอนถูก trigger กลาง run — นั่นคือ `run_auto_retreat`)
- **properties:** `enabled` (bool)
- **privacy:** ไม่มีพิกัด

### `run_potion_auto_used` *(ใหม่ — F06-R12)*
- **ยิงเมื่อ:** engine ใช้ยาอัตโนมัติหนึ่งขวดหลัง hit ตาม F06-R12 (HP < เกณฑ์และมียา)
- **properties:** `dungeon_id`, `item_id` (enum `hpSmall`\|`hpMedium`\|`hpLarge` ตาม `config: economy.autoPotion.defaultPotionOrder` — ของจาก content ไม่ใช่ตำแหน่ง)
- **privacy:** ไม่มีพิกัด

### `inventory_potion_used` *(ใหม่ — P2-H24, ปิดช่องว่างที่ P2-H18/sound-designer พบ: `inventory.potionUsed`/`inventory.reviveUsed` มี cue เสียงแล้วแต่ไม่เคยมี telemetry)*
- **ยิงเมื่อ:** ผู้เล่นกดปุ่ม "ใช้ยา" (`inventory.usePotionButton`) หรือ "ใช้ยาฟื้น" (`inventory.useRevivePotionButton`) **นอก run** (ที่บ้าน/การ์ด Recovering) สำเร็จ — คือ event `potion_used` ของ session reducer (`packages/shared/src/session/reducer.ts`, `type: 'potion_used'`) ตัวเดียวกับที่ audio player เรียกอยู่แล้ว (`audio/cue-list.md` P2-H18) ไม่ใช่ event ใหม่ของ engine ฝั่งนั้น เอกสารนี้แค่ประกาศ mapper ของ telemetry
- **properties:** `item_id` (enum `hpSmall`\|`hpMedium`\|`hpLarge`, enum เดียวกับ `run_potion_auto_used`), `revived` (bool — จาก `potion_used.revived` ของ reducer ตรงๆ: `false` = ใช้ยา HP ธรรมดา, `true` = ใช้ยาฟื้นออกจากสถานะ Recovering)
- **privacy:** ไม่มีพิกัด · **ไม่มี `dungeon_id`** (ต่างจาก `run_potion_auto_used`) เพราะเกิดนอก run ไม่มีบริบทสถานที่ให้ผูก
- **ต่างจาก `run_potion_auto_used` อย่างไร:** ตัวนั้นเกิดอัตโนมัติระหว่าง run (มี `dungeon_id`, ไม่มี `revived` เพราะใช้ยาฟื้นระหว่าง run ไม่ได้), ตัวนี้เกิดจากผู้เล่นกดเองนอก run เท่านั้น (ไม่มี `dungeon_id`, มี `revived` แยกสองกรณี) — ห้ามรวมสอง event นี้เป็นตัวเดียวกันตอนวิเคราะห์ Economy/Progression (สองบริบทต่างกัน)
- **ใช้ตอบอะไร:** (1) Economy — `economy_gold_spent{sink:potion}` (Phase 4) จับได้แค่ตอน**ซื้อ** ไม่ใช่ตอน**ใช้** event นี้จึงเป็นสัญญาณเดียวที่บอกว่าผู้เล่นใช้ยาที่มีอยู่จริงหรือแค่สะสมไว้เฉยๆ (2) Progression/NN-6 — สัดส่วน `revived:true` เทียบ `run_auto_retreat`/`run_death` บอกว่าผู้เล่นเลือกร่นเวลา Recovering เองบ่อยแค่ไหน เป็นสัญญาณเสริมของ "low penalty, high travel cost" นอกเหนือจาก guardrail ที่มีอยู่แล้ว

### `anticheat_speed_lock_triggered` *(F04-R20/R22/R24, GD B-02 — property ยึดตาม `docs/tech/F04-dungeon-presence.md` §2.5)*
- **ยิงเมื่อ:** เข้าหรือออกสถานะ speed lock (overlay ซ้อนได้ทุกสถานะที่ไม่ใช่ Ended รวมตอน Browsing/ConfirmOpen ก่อนมี run — F04 หัวข้อ 4, engine T11/T12)
- **properties:** `phase` (enum `enter`\|`exit`), `in_run` (bool — มี run อยู่ตอน trigger หรือไม่), `dungeon_id` (string \| null — มีค่าเมื่ออยู่ในเขต dungeon ใดๆ ตอน trigger, null เมื่ออยู่นอกทุก polygon)
- **privacy:** ไม่มีพิกัด `dungeon_id` เป็นสถานที่ไม่ใช่ตำแหน่งผู้เล่น
- **แก้จากร่างก่อน:** เปลี่ยนจาก `transition`/`location_context`/`run_state_at_trigger` (3 property ที่ผมออกแบบเอง) เป็น `phase`/`in_run`/`dungeon_id` ให้ตรงกับ field ภายในของ engine เป๊ะ (ลด translation table ตามที่ tech-lead ขอ) — **`dungeon_id != null` ตอบคำถามค้างของ game-director ได้ตรงอยู่แล้ว** ("จักรยานในสวนถูก lock เป็นความตั้งใจ · เฝ้าจำนวน lock ภายใน polygon") โดยไม่ต้องมี property แยกต่างหาก
- **ใช้ปลด unlock:** `config: unlocks.antiCheatHelp.unlockOnEvents` มี `speedLockTriggered` อ้างถึง event นี้ (ชื่อ internal ของ engine)

### `session_state_discarded` *(ใหม่ — `docs/tech/F04-dungeon-presence.md` §10.2)*
- **ยิงเมื่อ:** เปิดแอปแล้วอ่าน state ที่เก็บในเครื่องไม่ได้ ต้องทิ้งแล้วเริ่มใหม่
- **properties:** `reason` (enum `corrupt`\|`schema_mismatch`\|`unknown_dungeon`)
- **privacy:** ไม่มีพิกัด
- **หมายเหตุ:** ผู้เล่นเสีย progress ต้นแบบของ Phase 2 เท่านั้น (ไม่ใช่รางวัลจริง, C1-5) event นี้ช่วย QA แยกว่า "หายเพราะบั๊ก storage" กับ "หายเพราะลบข้อมูลเอง" (`local_data_cleared`)

### `storage_quota_exceeded` *(ใหม่ — `docs/tech/F04-dungeon-presence.md` §10.4)*
- **ยิงเมื่อ:** เขียน `localStorage` ล้มเหลว (`QuotaExceededError` เช่น Safari private mode ที่ quota 0)
- **properties:** `evicted` (enum `telemetry_half`\|`telemetry_all`\|`none` — ระดับการลดที่ engine พยายามก่อนจะยอมเก็บ session ไว้ในหน่วยความจำอย่างเดียวและตั้งธง `storageDegraded`)
- **privacy:** ไม่มีพิกัด
- **หมายเหตุ:** event นี้เองก็เสี่ยงเขียนไม่สำเร็จถ้า storage เต็มจริง — เป็นความพยายามที่ดีที่สุด (best-effort) ไม่ใช่การรับประกันว่าจะเห็นทุกครั้งที่ storage เต็ม

### `run_gps_status_changed`
- **ยิงเมื่อ:** state ของ `LocationProvider` เปลี่ยน ตรงกับ `gps.*` copy key ใน `design/ux/flows/F03-core-loop.md` §9.5
- **properties:** `status` (enum `searching`\|`off`\|`denied`\|`low_accuracy`\|`offline`\|`restored`), `context` (enum `onboarding`\|`map`\|`run` — ใช้แยกว่าหลุดตอนไหน)
- **privacy:** ไม่มีพิกัด ไม่มีค่า accuracy เป็นตัวเลข (พอรู้ว่า "แย่กว่าเกณฑ์" ก็พอ)
- **สถานะการ emit จริง (P2-H50, ปิดส่วนนี้ของ TG-12):** tech gate F06 รอบ 1 พบว่ายังไม่มีจุดยิงใน `apps/client/src` — **ตัดสินใจ: ต้อง emit ก่อน playtest ภาคสนาม P2-F06-T27** เหตุผล: event นี้เป็นหลักฐานเดียวที่ตอบแถว "pocket screen ทำงานตามที่คาดไหม" ของ `product/playtest/phase-2-plan.md` §5 (คู่กับ `page_hidden_total_s_bucket`, `wake_lock_engaged_share_bucket`) — GPS หลุด/แม่นยำต่ำระหว่างเดินจริงโดยเก็บมือถือในกระเป๋า (pillar P4, D-063, Wake Lock F06-T14) เป็นความเสี่ยงที่**สนามภาคสนามเท่านั้นที่ตรวจพบได้จริง** ไม่มีทางจำลองครบด้วย GPS trace สังเคราะห์ ถ้าไม่มี event นี้ การอ่านผล FIX-FIRST ของ `phase-2-plan.md` §6.2 ข้อ 1/6/7 (tick ไม่สม่ำเสมอ, ผู้เล่นตอบว่าเกม "ค้าง"/"ลงโทษ") จะแยกไม่ออกว่าสาเหตุมาจาก movement gate ทำงานตามออกแบบหรือ GPS หลุดจริงจากอุปกรณ์/สภาพแวดล้อม — **handoff ถึง gameplay-programmer ทันที (→ P2-X48)** สเปกที่ต้อง emit ตรงตามตารางด้านบนเป๊ะ ไม่มีการเปลี่ยนแก้: ชื่อ event `run_gps_status_changed`, property สองตัว (`status` string enum 6 ค่า, `context` string enum 3 ค่า) ไม่มี bucket ตัวเลขใดๆ ในสอง property นี้ (เป็น enum ล้วน ไม่ใช่ bucket ช่วง) ยิงทุกครั้งที่ state ของ `LocationProvider` เปลี่ยนค่า (ไม่ debounce, ไม่ sample) ไม่มี `lat`/`lng`/`accuracy` ตัวเลขใดๆ ใน payload (ยืนยัน privacy ตามกติกาข้อ 2 ของเอกสารนี้) — ใช้ envelope กลางหัวข้อ 1.1 เหมือน event อื่นทุกประการ (ยืนยัน: product-manager, P2-H50)

### `dungeon_report_submitted`
- **ยิงเมื่อ:** ผู้เล่นกดรายงานจาก `S-17-report-block`
- **properties:** `dungeon_id`, `reason_category` (enum ที่ narrative-designer/game-director กำหนดใน F13 — ไม่ใช่ free text)
- **privacy:** ไม่มีชื่อผู้ถูกรายงาน ไม่มีพิกัด
- **สถานะ Phase 2:** ปุ่มรายงานเข้าไม่ถึงจริง (moderation queue เต็มรูปเป็น F13–F15/Phase 5) — schema ประกาศไว้ล่วงหน้า `config: dungeons.safety.reportThreshold` (=5), `reportWindow_h` (=24) มีอยู่แล้วใน `config/balance/dungeons.json` แต่ engine ยังไม่มีทางเรียกใช้นอก test

## 4. หมวด Social

ที่มา: `design/ux/flows/F03-core-loop.md` Flow A นาที 6–8, `design/ux/ia.md` U6 · **Phase 3 (F09)** — ประกาศชื่อไว้ล่วงหน้าตาม `product/metrics.md` §4 · **Phase 2 ไม่มีขั้นตอนนี้เลยในแอปจริง** (F06 หัวข้อ 3.8 ตาราง: ช่วง 6–8 ถูกข้ามทั้งช่วง ไม่มีแผงว่าง)

**(P2-X23) คำสั่งด่วน (`qc.*`, 10 คำสั่ง, CLAUDE.md ข้อ 4) — ไม่มี event ใน Phase 2:** cue เสียง `qc.sent`/`qc.received` ใน `audio/cue-list.md` (A-P2-F05-T06-1) มี `telemetry: null` ถูกต้องแล้ว และ**ไม่ประกาศ event ใหม่ในเอกสารนี้** เพราะคำสั่งด่วนเป็นฟีเจอร์ของ Nearby Party (F09, Phase 3) ล้วนๆ — Phase 2 ไม่มีทางเรียก UI ของคำสั่งด่วนได้เลย (ไม่มีคู่สนทนาให้ส่งหา) จึงไม่มีอะไรให้ instrument จนกว่า F09 จะ build ชื่อ event ที่เสนอไว้ล่วงหน้าสำหรับตอนนั้น (`quick_command_sent`/`quick_command_received` หรือชื่อเทียบเท่า) จะประกาศพร้อมกับ `party_formed` เมื่อ P2-F04-T17 รุ่นของ Phase 3 เริ่มงาน ไม่ใช่ตอนนี้

### `party_formed`
- **ยิงเมื่อ:** ผู้เล่นกดเข้าร่วม Nearby Party (`S-03a-nearby-party`) สำเร็จ
- **properties:** `dungeon_id`, `party_size` (int, นับรวมตัวเอง), `roles_present` (list ของ role ไม่ใช่รายชื่อ)
- **privacy:** ไม่มีชื่อ ไม่มี id ของสมาชิกคนอื่น ไม่มีพิกัด (NN-4)

## 5. หมวด Economy

ที่มา: GDD "Economy", `design/systems/sim-report.md` F-16 · **Phase 3–4 (F08, F11, F12)** — Phase 2 ไม่มีตลาด/ตีบวก/ร้าน NPC จริง (F06 หัวข้อ 7)

### `economy_gold_earned`
- **ยิงเมื่อ:** server เครดิต gold เข้าบัญชี (drop, ขาย NPC, raid)
- **properties:** `source` (enum `drop`\|`sell_npc`\|`raid`), `amount_bucket` (enum ตามช่วงที่ systems-designer กำหนดใน `config: telemetry.goldAmountBuckets`), `dungeon_id` (nullable ถ้าเป็นรายได้ที่บ้านเช่นขาย NPC จากกระเป๋า)
- **privacy:** ไม่มีพิกัด

### `economy_gold_spent`
- **ยิงเมื่อ:** server หัก gold ออกจากบัญชี (ซื้อยา, ตีบวก, ซื้อในตลาด, ภาษีขาย)
- **properties:** `sink` (enum `potion`\|`enhance`\|`market_buy`\|`market_sell_tax`), `amount_bucket`
- **privacy:** ไม่มีพิกัด

### `economy_potion_price_observed`
- **ยิงเมื่อ:** ราคายาที่ผู้เล่นจ่ายจริงถูกกำหนด (ซื้อจาก NPC หรือขายต่อในตลาด) — ใช้ตัวเลขราคาจริงได้ (ไม่ใช่ bucket) เพราะเป็นราคาสาธารณะของไอเทมในเกม ไม่ใช่ข้อมูลส่วนบุคคล
- **properties:** `channel` (enum `npc`\|`market`), `item_id`, `price`
- **privacy:** ไม่มีพิกัด ไม่มี id ผู้เล่นผูกกับราคา (aggregate เท่านั้น)

### `market_trade_completed`
- **ยิงเมื่อ:** การซื้อขายในตลาดผู้เล่นสำเร็จ
- **properties:** `item_id`, `item_rarity` (enum), `price`, `tax_amount`
- **privacy:** ไม่มีชื่อผู้ซื้อ/ผู้ขาย (ตลาดไม่ระบุตัวตนตาม GDD "ตลาดไม่ระบุตัวตนและภาษี")

## 6. หมวด Progression

ที่มา: `design/systems/sim-report.md` F-17, CLAUDE.md · **Phase 4 (F10, F11)** — Phase 2 ไม่มีระบบเลเวลเต็มรูป (ไม่มีอุปกรณ์ ไม่มีหน้าลงแต้ม, F06-R34)

### `player_level_up`
- **ยิงเมื่อ:** เลเวลอัพ
- **properties:** `level` (int), `class` (enum), `minutes_since_account_created_bucket`
- **privacy:** ไม่มีพิกัด
- **หมายเหตุ:** property นี้ใช้ `minutes_since_account_created_bucket` (ไม่ใช่ `minutes_since_first_open_bucket`) เพราะ event นี้พร้อม emit จริงตอน Phase 4 ซึ่ง F07 login (Phase 3) มีบัญชีแล้ว — ต่างจาก `onboarding_first_reward_granted` ที่ต้อง emit ได้ตั้งแต่ Phase 2 ที่ยังไม่มีบัญชี

### `loot_rarity_received`
- **ยิงเมื่อ:** ได้ไอเทม rarity ระดับ Rare ขึ้นไป (ใช้คำนวณ guardrail F-17 "แล้งของ")
- **properties:** `rarity` (enum `rare`\|`epic`\|`legendary`), `dungeon_id`, `party_had_ranged` (bool), `days_since_previous_same_rarity_bucket` (enum `0-7`, `7-30`, `30+`, `first_time`)
- **privacy:** ไม่มีพิกัด

## 7. หมวด Guardrail เฉพาะทาง (แบตและจอ)

ที่มา: `product/reviews/F02-spike-criteria.md` §4.2 (handoff จาก S3), D-063 (Wake Lock + pocket screen), P2-F06-T14 (fire-together + priority queue)

### `battery_sample`
- **ยิงเมื่อ:** ทุก `config: telemetry.sampling.batterySampleInterval_s` (1800 = 30 นาที) ระหว่างอยู่ใน run ที่ active และ Battery Status API พร้อมใช้งาน (`navigator.getBattery()` สำเร็จ) — ไม่ยิงบน iOS Safari (ไม่มี API นี้ ใช้แบบฟอร์มเดินทดสอบแทนตาม `product/metrics.md` §10.4)
- **properties:** `battery_pct_delta_bucket` (enum `0-5`, `5-10`, `10-15`, `15+`), `session_elapsed_minutes_bucket` (enum `0-30`, `30-90`, `90-180`, `180+`), `screen_wake_lock_active` (bool nullable)
- **privacy:** ไม่มีพิกัด ไม่มี % แบตที่แม่นยำระดับหน่วย

### `wake_lock_state_changed` *(ใหม่ — P2-F06-T14, D-063)*
- **ยิงเมื่อ:** สถานะ Wake Lock เปลี่ยน (ขอตอนเข้า run, ปล่อยตอนออก run/พับแอป, หรือถูกระบบดึงคืนเอง)
- **properties:** `state` (enum `granted`\|`request_denied`\|`released`\|`unsupported`), `dungeon_id` (nullable — dungeon ของ run ที่กำลังขอ/ปล่อย ถ้ามี ใช้เชื่อมกับ `dungeon_entered`/`dungeon_exited` แทนที่จะมี `run_id` แยก เพราะ envelope ไม่มี field นั้น หัวข้อ 1.1)
- **privacy:** ไม่มีพิกัด
- **หมายเหตุ:** ความถี่ต่ำ (ไม่กี่ครั้งต่อ run) จึงไม่ต้องรวมกับ `dungeon_exited` แบบ `page_hidden_total_s_bucket` — เก็บเป็น event แยกเพื่อรู้สัดส่วนอุปกรณ์ที่ขอไม่ผ่าน (`request_denied`/`unsupported`) ซึ่งเป็นข้อมูลระดับอุปกรณ์ ไม่ใช่ระดับ run

## 8. Ring buffer ในเครื่องและข้อกำหนดการ export (แทนที่หัวข้อเพดาน free tier ของ Phase 1)

Phase 1 เขียนหัวข้อนี้โดยสมมติว่ามี backend รับ telemetry (เพดาน rows written 100,000/วันของ Durable Object) **Phase 2 ไม่มี server รับ telemetry เลย** (D-088) เพดานที่แทนที่คือ**ความจุ ring buffer ในเครื่อง** ซึ่ง tech-lead ได้ตัดสินและ implement ไว้แล้วใน `docs/tech/F04-dungeon-presence.md` §12 และ `config/app/telemetry.json#localSink`/`#export`:

1. **`run_tick_granted`/`run_tick_denied` ห้ามเป็น record เขียนแยกจาก reward tick ของเกม** — derive จาก record เดียวกันของ reducer (`packages/shared/src/reward`) เหตุผล: ไม่ให้ event ความถี่สูงที่สุดในระบบ (ทุก `window_s` ต่อผู้เล่นที่กำลังเล่น) เบียดพื้นที่ ring buffer จน evict event ที่มีค่าต่อการวินิจฉัยมากกว่า (`checkin_rejected`, `anticheat_speed_lock_triggered`, event หมวด Onboarding) ก่อนที่ผู้เล่นจะกด export
2. **ค่าจริงที่ใช้แล้ว** (`config/app/telemetry.json#localSink`): `ringBufferMaxEvents` = 3000, `ringBufferMaxChars` = 600,000 (ความยาว JSON), `evictionOrder` = `oldestFirst` (ทิ้งเก่าสุดก่อนเมื่อเกินเพดานใดเพดานหนึ่ง), `persistInterval_s` = 10 (เขียนลง `localStorage` ไม่ถี่กว่านี้ บวกทุกครั้งที่ `pagehide`/hidden), `networkUploadAllowed` = `false` — เป็น buffer เดียว (ไม่แยกความถี่สูง/วินิจฉัยตามที่ผมเคยเสนอ) tech-lead เลือกความเรียบง่ายของ implementation แทน ข้อ 1 ยังคุมความเสี่ยงได้เพราะ `run_tick_granted`/`run_tick_denied` ไม่ได้เขียนถี่ผิดปกติอยู่แล้ว (คนหนึ่งคนได้มากสุด 1 event ต่อ `window_s` ต่อ run)
3. **Export** (`config/app/telemetry.json#export`): รูปแบบ JSONL, `mimeType: application/x-ndjson`, ชื่อไฟล์ `kw-p2-telemetry-<8 hex สุ่ม>.jsonl` (ไม่มีวันที่) แต่ละบรรทัดมีแค่ `event_name`, `t_rel_ms`, `session_id`, `platform`, `app_version`, `properties` (หัวข้อ 1.2) — ด่านก่อนสร้างไฟล์ตัด `forbiddenPropertyNames` และค่าคล้ายพิกัดทิ้งอัตโนมัติ (นับจำนวนที่ตัดใน HUD)
4. **ไม่มี auto-upload หรือ beacon เป็นระยะใดๆ** — export เป็นไฟล์ดาวน์โหลดคือทางเดียวที่ข้อมูลออกจากเครื่อง (D-088, C2-1: ไม่มี origin ของ telemetry ingest ใน `config/app/client.json`)
5. **เมื่อ Phase 3 นำ server telemetry กลับมา (F08):** ข้อกำหนดเดิมของ Phase 1 เรื่องเพดาน backend rows written (`docs/adr/0002-backend-stack.md` หัวข้อ 4–5, ~650–666 ผู้เล่น-ชั่วโมง/วัน) และ pipeline batch export ยังใช้ได้ทั้งหมด — เอกสารนี้ไม่ได้ลบทิ้ง แค่ระงับจนกว่าจะมี server ให้ apply จริง (`config/app/telemetry.json#localSink._note`: "Phase 3 replaces the transport ... and removes these keys") [ASSUMPTION A-P2-F04-T17-4: รายละเอียด pipeline ของ Phase 3 กลับมาทบทวนตอน F08 เริ่ม ไม่ใช่ตอนนี้ ยืนยัน: tech-lead]

## 9. ตารางสรุปทุก event ตาม phase

| Event | หมวด | Phase พร้อม emit | สถานะสำคัญ |
| --- | --- | --- | --- |
| `onboarding_funnel_step` | Onboarding | 2 (แก้ลำดับ+ตัด login) | — |
| `onboarding_first_reward_granted` | Onboarding | 2 | วัด metric หลักของ F06 |
| `onboarding_nearest_dungeon_distance` | Onboarding | 2 | ยังไม่มี emit จริง (TG-12) — P2-H50: **ไม่บังคับก่อน playtest**, implement ก่อน regional launch แทน |
| `onboarding_empty_screen_shown` | Onboarding | 2 (reason ใหม่) | — |
| `onboarding_empty_screen_abandoned` | Onboarding | 2 (reason ใหม่) | — |
| `interest_registered_outside_area` | Onboarding | 2 (ขยาย scope/area_name) | — |
| `local_data_cleared` | Onboarding (ควบคุมข้อมูล) | 2 | ไม่มี property — เป็นบรรทัดแรกของ export ครั้งถัดไป |
| `location_consent_withdrawn` | Onboarding (ควบคุมข้อมูล/privacy) | 2 | ใหม่ (P2-X23, D-116) — คู่กับ `dungeon_exited { exit_reason: manual_exit }` ที่ `at_ms` เดียวกันเมื่อ `during_run=true` |
| `dungeon_confirm_shown` | Places | 2 | — |
| `checkin_rejected` | Places | 2 | reason 9 ค่า ตรง engine (P2-X23 เพิ่ม `no_class`, `no_hp`, D-114) |
| `dungeon_entered` | Places | 2 | — |
| `dungeon_exited` | Places | 2 (exit_reason ใหม่ + property เพิ่ม) | — |
| `run_state_changed` | Places | 2 | ใหม่ — เฉพาะวงจร active/grace/suspended |
| `dungeon_closing_soon_notified` | Places | 2 | ใหม่ |
| `navigation_link_opened` | Places | 2 | ใหม่ |
| `run_tick_granted` | Places/north star proxy | 2 | ฐาน north star proxy, `partial` |
| `run_tick_denied` | Places/north star proxy | 2 | `partial` |
| `run_hp_low` | Places | 2 (+class) | — |
| `run_auto_retreat` | Places | 2 (+class, +minutes_since_run_start_bucket) | — |
| `run_death` | Places | 2 (นิยามแก้ตาม D-078) | เกิดเฉพาะปิด auto-retreat |
| `auto_retreat_setting_changed` | Places | 2 | ใหม่ |
| `run_potion_auto_used` | Places | 2 | ใหม่ |
| `inventory_potion_used` | Places | 2 | ใหม่ (P2-H24) — ไม่มี `dungeon_id`, มี `revived` |
| `anticheat_speed_lock_triggered` | Places | 2 | `phase`/`in_run`/`dungeon_id` ตรง engine |
| `run_gps_status_changed` | Places | 2 | ยังไม่มี emit จริง (TG-12) — P2-H50: **ต้อง emit ก่อน P2-F06-T27** → handoff P2-X48 |
| `dungeon_report_submitted` | Places | 2 (queue เต็มรูปรอ F13/F15) | — |
| `session_state_discarded` | Places (ความน่าเชื่อถือ) | 2 | ใหม่ |
| `storage_quota_exceeded` | Places (ความน่าเชื่อถือ) | 2 | ใหม่ |
| `battery_sample` | Guardrail (แบต) | 2 (`web_android` เท่านั้น) | — |
| `wake_lock_state_changed` | Guardrail (จอ) | 2 | ใหม่ |
| `party_formed` | Social | 3 (F09) | — |
| `economy_gold_earned` | Economy | 3–4 (F08, F11) | — |
| `economy_gold_spent` | Economy | 3–4 (F08, F11) | — |
| `economy_potion_price_observed` | Economy | 4 (F11) | — |
| `market_trade_completed` | Economy | 4 (F12) | — |
| `player_level_up` | Progression | 4 (F10) | — |
| `loot_rarity_received` | Progression | 4 (F10–F11) | — |

## 10. สมมติฐานและคำถามค้าง

### สมมติฐาน
- A-P2-F04-T17-1: เมื่อ F07 login มาใน Phase 3 ให้เพิ่ม `minutes_since_account_created_bucket` กลับเป็น property คู่กับ `minutes_since_first_open_bucket` ใน `onboarding_first_reward_granted` ไม่ใช่แทนที่ (คนละความหมาย: เปิดแอปครั้งแรก ≠ สร้างบัญชี เพราะ Phase 2 ไม่มีบัญชี) (ยืนยัน: tech-lead)
- A-P2-F04-T17-2: รายชื่อเขต/อำเภอของ `interest_registered_outside_area.scope=district` มาจาก polygon ขอบเขตย่านเปิดตัวของ level-designer (ชุดเดียวกับ `unlocks.home.seeLaunchAreaMask` ที่ F06 spec เสนอ) ไม่ใช่รายชื่อที่ product-manager กำหนดเอง (ยืนยัน: level-designer, game-director)
- A-P2-F04-T17-3: เมื่อ F07 login เข้ามาใน Phase 3 ตำแหน่งของ step `login_*` ใน `onboarding_funnel_step` ให้ยึดตาม flow จริงตอนนั้น ไม่ใช่ตำแหน่งเดิมของ Phase 1 (ยืนยัน: tech-lead, uiux-designer)
- A-P2-F04-T17-4: pipeline server telemetry ของ Phase 3 (F08) กลับมาทบทวนรายละเอียดตอน F08 เริ่ม ไม่ใช่ตอนนี้ (ยืนยัน: tech-lead)
- A-P2-F04-T17-5: `amount_bucket` ของ event หมวด Economy ใช้ bucket แทนตัวเลขจริงเพื่อลด cardinality ยกเว้น `economy_potion_price_observed`/`market_trade_completed` ที่ใช้ราคาจริง (ราคาสาธารณะของไอเทม ไม่ใช่ transaction ต่อบัญชี) — สืบทอดจาก A-P1-F03-T19-5 ไม่เปลี่ยน (ยืนยัน: tech-lead, systems-designer)
- A-P2-F04-T17-6: `dungeon_report_submitted.reason_category` เป็น enum ที่ยังไม่ถูกกำหนดค่าจริง (รอ F13) — สืบทอดจาก A-P1-F03-T19-6 ไม่เปลี่ยน (ยืนยัน: narrative-designer, game-director)
- A-P2-F04-T17-7 (**ปิดแล้ว**): `docs/tech/F04-dungeon-presence.md` §2.5/§12.3 (P2-F04-T14) ยืนยัน field ภายในของ engine สำหรับ `anticheat_speed_lock_triggered` = `phase`/`inRun`/`dungeonId` แล้ว — เอกสารนี้ปรับตามในหัวข้อ 3 (เดิมออกแบบ `transition`/`location_context`/`run_state_at_trigger` เอง ตอนที่ยังไม่มี tech note)
- A-P2-F04-T17-8: `run_state_changed` ครอบเฉพาะวงจร active/grace/suspended (T6–T8 ของ F04) ไม่ครอบ T1–T5/T11–T12 ตามที่ engine ออกแบบไว้จริง — ถ้า QA/game-director ต้องการเห็น T1–T5 (Browsing→ConfirmOpen→CheckInPending) ด้วย ต้องเป็น event เพิ่มคนละตัว ไม่ใช่ขยาย enum นี้ (ยืนยัน: tech-lead, qa-tester)
- A-P2-F04-T17-9: `run_tick_denied.partial` ไม่อยู่ในตาราง `SessionEvent` ของ tech note (§2.5 ระบุแค่ `dungeonId`, `tickIndex`) แต่ tech-lead ขอเพิ่มโดยตรงในข้อความ handoff — ยึดตามคำขอโดยตรงนั้น (ใหม่กว่าตาราง) ถ้า mapper จริงพบว่า engine ไม่ส่ง `partial` มาด้วยสำหรับ tick ที่ไม่ผ่าน ให้ tech-lead handoff กลับมาแก้ (ยืนยัน: tech-lead, backend-programmer)
- A-P2-F06-T04-5 (**ปิดแล้ว, P2-X23**): เหตุ `no_class`/`no_hp` ของ `checkin_rejected` (`docs/tech/F06-hp-damage-onboarding.md` §6.3, D-114) เพิ่มเข้า enum ของหัวข้อ 3 แล้ว (owner: game-director กติกาปฏิเสธ, product-manager enum telemetry — ยืนยันร่วมแล้ว)
- A-P2-X16-1 (**ปิดแล้ว, P2-X23**): ตัดสินใจประกาศ `location_consent_withdrawn { during_run: bool }` ตามข้อเสนอของ tech-lead ใน `docs/tech/F06-hp-damage-onboarding.md` §8.4 — ประกาศไว้ในหัวข้อ 2 แล้ว `dungeon_exited.exit_reason` ของตัว run เองยังเป็น `manual_exit` เดิมไม่แตกค่าใหม่ตามที่ tech-lead ยืนยัน (owner: tech-lead mapper, game-director ยืนยันไม่ต้องแยกเชิงกติกาเกม)
- A-P2-F05-T06-1 (**ปิดแล้ว, P2-X23**): cue เสียง `qc.sent`/`qc.received`/`dungeon.closedOrOutOfRange` ใน `audio/cue-list.md` คง `telemetry: null` ตามที่ sound-designer ตั้งไว้ถูกต้องแล้ว — `qc.*` ไม่มี event เพราะเป็นฟีเจอร์ Nearby Party (F09/Phase 3) ที่เข้าไม่ถึงใน Phase 2 (หัวข้อ 4) `dungeon.closedOrOutOfRange` ก็ไม่มี event ใหม่เช่นกัน เพราะเส้นทาง UI ที่พบบ่อยของ cue นี้ไม่เรียก `sessionStep(confirm)` เลย (หัวข้อ 3, หมายเหตุท้าย `checkin_rejected`) ส่วนกรณีที่ผ่าน `confirm` แล้วถูกปฏิเสธเพราะปิดพอดี ถูกนับใน `checkin_rejected { reason: dungeon_closed }` อยู่แล้วโดยไม่ต้องประกาศเพิ่ม (owner: product-manager, ยืนยันร่วม: sound-designer)
- A-P2-F06-T04-5 **ตรวจซ้ำแล้ว (P2-H24):** ยืนยันว่า `checkin_rejected.reason` enum (หัวข้อ 3) มี `no_class`/`no_hp` ครบ 9 ค่าจริงตามที่ P2-X23 ปิดไว้แล้ว ไม่มีอะไรต้องแก้เพิ่ม
- A-P2-H24-1 (**ปิดแล้ว**): ประกาศ `inventory_potion_used { item_id, revived }` (หัวข้อ 3) ตามข้อเสนอของ product-manager เอง (P2-X33) ตอบ gap ที่ sound-designer พบใน P2-H18 (cue เสียงมีแล้ว telemetry ไม่มี) — ไม่มี `dungeon_id`/พิกัด เพราะเกิดนอก run (ยืนยัน: sound-designer เจ้าของ P2-H18)
- A-P2-H50-1 (**ปิดแล้ว, P2-H50**): tech gate F06 รอบ 1 (TG-12) พบว่า `onboarding_nearest_dungeon_distance` และ `run_gps_status_changed` มีสเปกในเอกสารนี้แล้วแต่ไม่มีจุดยิงจริงใน `apps/client/src` — ตัดสินใจแยกกัน: **`run_gps_status_changed` ต้อง emit ก่อน playtest ภาคสนาม P2-F06-T27** (เป็นหลักฐานเดียวที่ตอบคำถาม pocket screen/GPS ของ `product/playtest/phase-2-plan.md` §5) → handoff P2-X48 ถึง gameplay-programmer พร้อมสเปกเต็ม (ดูหัวข้อ 3 ของเอกสารนี้ ไม่มีการเปลี่ยนชื่อ/property ใดจากที่ประกาศไว้แล้ว) · **`onboarding_nearest_dungeon_distance` ไม่บังคับก่อน playtest** เพราะไม่ผูกกับคำถาม/เกณฑ์ใดใน `phase-2-plan.md` §5/§6 และ guardrail ที่เกี่ยวข้อง (GR-1) ปิดแล้วจากข้อมูล coverage แบบ static — เลื่อนงาน implement เป็น backlog ก่อน regional launch แทน ไม่เปิดงาน gameplay-programmer รอบนี้ (ยืนยัน: product-manager)
- A-P2-H50-2 (**รับทราบแล้ว, P2-H50**): F06-TG-13 ของ tech gate ยืนยันว่า `kw.p2.runClientStats` (ตัวนับที่ใช้คำนวณ `dungeon_exited.page_hidden_total_s_bucket` และ `wake_lock_engaged_share_bucket`) อยู่ในหน่วยความจำของ `WakeLockController` เท่านั้น ไม่ persist ลง storage — ถ้าเบราว์เซอร์ reload กลาง run ตัวนับเริ่มใหม่จากศูนย์ ทำให้สอง bucket นี้ต่ำกว่าค่าจริงเฉพาะ run ที่มี reload เกิดขึ้น (A-P2-H45-1) — ยอมรับเป็นข้อจำกัดของ Phase 2 ไม่ใช่บั๊กที่ต้องแก้ก่อน playtest (ต้นทุนแก้สูงกว่าประโยชน์สำหรับรอบสนามขนาดเล็กนี้) — ผลต่อแผนวิเคราะห์บันทึกไว้ที่ `product/playtest/phase-2-plan.md` §2 และ §4.1 (อ่านสอง bucket นี้เป็นค่าต่ำสุดที่เป็นไปได้ ไม่ใช่ค่าจริง เมื่อสงสัยว่า run มี reload) (ยืนยัน: product-manager, tech-lead เจ้าของ F06-TG-13)

**ข้อแตกต่างจากชื่อที่ tech-lead เสนอในข้อความ handoff (ตามที่อนุญาตให้ "keep your choice and list the difference"):** ไม่มี — ทุกชื่อ event และ property ที่ tech-lead ระบุ (`checkin_rejected`, `run_state_changed`, `anticheat_speed_lock_triggered`, `dungeon_closing_soon_notified`, `navigation_link_opened`, `session_state_discarded`, `storage_quota_exceeded`, `local_data_cleared`, `partial`) ถูกนำมาใช้ตรงตัวในเอกสารฉบับนี้แล้ว ส่วนที่ต่างจากร่างเดิมของผมเอง (ก่อนเห็น tech note) คือ property ของ `anticheat_speed_lock_triggered` (ดู A-P2-F04-T17-7) และ `roles_present`/`partial` ของ `run_tick_granted` ซึ่งแก้ตามตารางแล้วเช่นกัน · `inventory_potion_used` (P2-H24) ก็ใช้ field name `item_id`/`revived` ตรงกับ property ภายในของ session reducer (`potion_used.revived`) เป๊ะ ไม่มีการแปลชื่อ

### คำถามค้าง (ไม่ขวาง Phase 2)
- Q-T17-3: `wake_lock_engaged_share_bucket` ควรคำนวณจากเวลาที่ "ขอสำเร็จ" หรือเวลาที่ "ถืออยู่จริงไม่ถูกระบบดึงคืน" (สองค่าต่างกันถ้าเบราว์เซอร์ปล่อย wake lock เองตอน tab ไม่ active) — ส่งต่อ gameplay-programmer/tech-lead ยืนยันตอน build P2-F06-T14
