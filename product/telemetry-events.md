# Telemetry Events — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T19 · เจ้าของ: product-manager · สถานะ: ฉบับเสนอ รอ Design gate B (P1-F03-T25) · วันที่: 2026-09-23
แหล่งอ้างอิง: `product/metrics.md` (คู่กัน — เอกสารนี้คือชื่อ event จริงที่ metrics.md อ้างถึง), `product/prd/F01-coverage-survey.md` หัวข้อ 6 (ชื่อ event ต้องคงตามที่เสนอไว้), `design/ux/flows/F03-core-loop.md`, `design/ux/ia.md`, `docs/adr/0002-backend-stack.md` หัวข้อ 4–5 (เพดาน free tier), CLAUDE.md non-negotiable ข้อ 4 (ไม่แสดงตำแหน่งรายบุคคล) และ PDPA (ข้อ 7)

**กติกาบังคับที่ทุก event ในเอกสารนี้ต้องผ่าน (protocol ข้อ 9 — programmer emit ต้องตรงชื่อนี้เป๊ะ ห้ามเปลี่ยนเงียบๆ):**
1. ชื่อ event เป็น `snake_case` ตาม regex `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`
2. **ห้ามมีพิกัด (lat/lng) หรือ raw GPS sample ใน property ของ event ใดเลย** — ระยะทางส่งเป็น bucket/band เท่านั้น ตำแหน่งอ้างเป็น `dungeon_id` (สถานที่ ไม่ใช่พิกัดผู้เล่น) เท่านั้นเมื่อจำเป็น
3. ห้ามมี property ที่เป็นชื่อจริง อีเมล หรือ identifier ที่ผูกกับตัวตนจริงของผู้เล่น (NN-7) — ใช้ `account_id` แบบ opaque ที่ระบบสร้างเท่านั้น
4. ห้ามมี property ที่เปิดเผยตำแหน่งหรือตัวตนของผู้เล่น**คนอื่น** (NN-4) — event ที่เกี่ยวกับ party ส่งได้แค่ `party_size`, `roles_present` (รายการ role ไม่ใช่รายชื่อ)
5. Event ที่เกิดถี่ (ผูกกับ reward tick) ต้องออกแบบให้สืบมาจาก record ที่ backend เขียนอยู่แล้ว ไม่ใช่เขียน row ใหม่แยกต่างหาก (ดูหัวข้อ 8 — ข้อจำกัดเพดาน free tier)

## สารบัญ
1. Envelope กลาง (field ที่มีทุก event)
2. หมวด Onboarding
3. หมวด Places / core loop (run state)
4. หมวด Social
5. หมวด Economy
6. หมวด Progression
7. หมวด Guardrail เฉพาะทาง (แบต)
8. ข้อกำหนดเรื่องปริมาณ event และเพดาน free tier
9. ตารางสรุปทุก event ตาม phase
10. สมมติฐานและคำถามค้าง

## 1. Envelope กลาง (field ที่มีทุก event)

ทุก event มี field เหล่านี้เสมอ นอกเหนือจาก `properties` เฉพาะของแต่ละ event (ระบุในหัวข้อ 2–7):

| Field | ประเภท | คำอธิบาย | Privacy |
| --- | --- | --- | --- |
| `event_name` | string | ชื่อ event ตามเอกสารนี้เป๊ะ | — |
| `client_ts` | ISO 8601 | เวลาที่ client สร้าง event | ไม่ใช่ PII |
| `server_ts` | ISO 8601 | เวลาที่ server รับ (server เป็นแหล่งความจริงเมื่อสองค่าต่างกันเกิน `config: telemetry.clockSkewTolerance_s`) | — |
| `account_id` | string (opaque) | id ภายในของบัญชี ไม่ใช่ email/provider id ตรง (NN-7) | pseudonymous |
| `session_id` | string (opaque) | ผูกกับ session การเล่นครั้งนั้น ใช้เชื่อม funnel ไม่ใช่ระบุตัวตน | pseudonymous |
| `platform` | enum `web_android` \| `web_ios` | ใช้แยกผลตาม A-P1-PLAN-01-6 (สองแพลตฟอร์มวัดแยกกัน) | ไม่ใช่ PII |
| `app_version` | string | เวอร์ชัน build ของ client | — |

**ไม่มี field `device_id`, advertising id, IP address ที่เก็บถาวรในตาราง telemetry** — ถ้า backend เก็บ IP ชั่วคราวเพื่อ rate limit เป็นเรื่องของ infra ไม่ใช่ scope ของ telemetry event ตามเอกสารนี้

## 2. หมวด Onboarding

ที่มา: `design/ux/flows/F03-core-loop.md` Flow A, `product/prd/F01-coverage-survey.md` §6 (สาม event แรกด้านล่างต้องคงชื่อนี้ตามที่ PRD เสนอไว้ ห้ามเปลี่ยน)

### `onboarding_funnel_step`
- **ยิงเมื่อ:** ผู้เล่นเห็นหรือผ่านแต่ละขั้นของ Flow A นาที 0–1 (`design/ux/flows/F03-core-loop.md` หัวข้อ 2 ขั้น 1–7)
- **properties:**
  | key | ประเภท | ค่าที่เป็นไปได้ |
  | --- | --- | --- |
  | `step` | enum | `intro`, `consent_location_shown`, `consent_location_accepted`, `consent_location_declined`, `permission_browser_shown`, `permission_browser_allowed`, `permission_browser_blocked`, `age_gate_shown`, `age_gate_passed`, `age_gate_under_min`, `login_shown`, `login_success`, `login_error`, `class_select_shown`, `class_selected`, `map_view_reached` |
  | `funnel_bucket` | enum | `0-1`, `1-3`, `3-6`, `6-8`, `8-10` (ตามช่วงที่ CLAUDE.md กำหนด) |
  | `class_selected` | enum \| null | `tanker`\|`ranged`\|`support`\|`magic` — มีค่าเฉพาะ `step=class_selected` |
- **privacy:** ไม่มีพิกัด ไม่มีอายุจริงหรือปีเกิด (แค่ผ่าน/ไม่ผ่านเกณฑ์)

### `onboarding_first_reward_granted`
- **ยิงเมื่อ:** ผู้เล่นได้ผ่าน movement gate ครั้งแรกในชีวิตบัญชี (tick แรกของ run แรก)
- **properties:** `dungeon_id` (ปลายทาง ไม่ใช่พิกัดผู้เล่น), `minutes_since_account_created_bucket` (enum: `0-10`, `10-30`, `30-60`, `60+`)
- **privacy:** ไม่มีพิกัด

### `onboarding_nearest_dungeon_distance` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** เปิดแอปครั้งแรก (หรือครั้งแรกหลังให้ consent location) และคำนวณระยะถึง dungeon ที่ใกล้ที่สุด
- **properties:** `distance_band` (enum `green`\|`yellow`\|`red` ตามนิยาม PRD F01 §3), `nearest_open_dungeon_id` (nullable — ปลายทางที่ระบบแนะนำ ไม่ใช่พิกัดผู้เล่น)
- **privacy:** ไม่มีพิกัด ไม่มี dungeon id เดี่ยวของ "ตำแหน่งผู้เล่น" มีแค่ปลายทางที่แนะนำ

### `onboarding_empty_screen_shown` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** แสดงหน้าจอ fallback เมื่อ dungeon ไกล/นอกพื้นที่ (`S-06-far-dungeon-panel`, `S-07-out-of-area-panel`)
- **properties:** `reason` (enum `far`\|`out_of_area`\|`far_temporarily_closed`)
- **privacy:** ไม่มีพิกัด

### `onboarding_empty_screen_abandoned` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** ปิดแอปหรือสลับออกจากหน้าจอ fallback ภายใน `config: telemetry.emptyScreenAbandonTimeout_s` โดยไม่กดปุ่มใด (นำทาง/ลงทะเบียนความสนใจ/ทางลัด role-info/profile)
- **properties:** `reason` (เหมือนด้านบน), `seconds_before_close_bucket` (enum `0-10`, `10-30`, `30-60`, `60+`)
- **privacy:** ไม่มีพิกัด

### `interest_registered_outside_area` *(ชื่อคงตาม PRD F01 §6)*
- **ยิงเมื่อ:** กดปุ่มลงทะเบียนความสนใจใน `S-09-interest-register`
- **properties:** `province` (จากรายการ ไม่พิมพ์เอง ตาม A-P1-F03-T01-5)
- **privacy:** เก็บระดับจังหวัดเท่านั้น ไม่เก็บพิกัดจุด

## 3. หมวด Places / core loop (run state)

ที่มา: `design/ux/flows/F03-core-loop.md` Flow B–C, `design/ux/ia.md` §3.1 — event กลุ่มนี้เป็นแกนของทั้ง north star (`product/metrics.md` §1) และ metric หมวด Places (§7)

### `dungeon_confirm_shown`
- **ยิงเมื่อ:** popup `S-02-dungeon-confirm` เปิด (รวมกรณี polygon ซ้อนและคร่อมวง raid)
- **properties:** `dungeon_id`, `roles_present` (list ของ role ที่มีคนอยู่ ไม่ใช่รายชื่อ, ว่างได้), `overlap` (bool), `vs_boss_choice_available` (bool)
- **privacy:** `dungeon_id` คือสถานที่ ไม่ใช่พิกัดผู้เล่น (ผู้เล่นยืนอยู่ขอบ polygon นี้อยู่แล้วซึ่งเป็นข้อมูลสาธารณะของสถานที่ ไม่ใช่ตำแหน่ง GPS ดิบ)

### `dungeon_entered`
- **ยิงเมื่อ:** server ยืนยันเข้า run สำเร็จ (Flow B5)
- **properties:** `dungeon_id`, `entry_type` (enum `normal`\|`overlap_choice`\|`raid_choice`), `party_size_at_entry_bucket` (enum `1`, `2`, `3`, `4+`)
- **privacy:** ไม่มีพิกัด

### `dungeon_exited`
- **ยิงเมื่อ:** run จบทุกเส้นทาง (`S-04-run-summary` แสดง)
- **properties:** `dungeon_id`, `exit_reason` (enum `completed`\|`auto_retreat`\|`died`\|`manual_exit`\|`closed_by_moderator`), `duration_s_bucket` (enum `0-5m`, `5-15m`, `15-30m`, `30-60m`, `60m+`), `ticks_granted_count`
- **privacy:** ไม่มีพิกัด

### `run_tick_granted`
- **ยิงเมื่อ:** ผ่าน movement gate ในหน้าต่าง `config: dungeons.movementGate.window_s` (multi-purpose event — ใช้เป็นฐานของ north star, GR-11, Social, Economy ตาม `product/metrics.md` §10.2 ข้อ 1 เพื่อไม่เพิ่มจำนวน event)
- **properties:** `dungeon_id`, `party_size_bucket` (enum `1`, `2`, `3`, `4+`), `full_role` (bool — ครบ 4 class ในหน้าต่างนั้นหรือไม่), `roles_present` (list)
- **privacy:** ไม่มีพิกัด ไม่มีระยะทางจริง (แค่ผ่าน/ไม่ผ่าน)

### `run_tick_denied`
- **ยิงเมื่อ:** ไม่ผ่าน movement gate ในหน้าต่างนั้น (`design/ux/flows/F03-core-loop.md` §4.6 — ไม่ใช่การลงโทษ)
- **properties:** `dungeon_id`
- **privacy:** ไม่มีพิกัด

### `run_hp_low`
- **ยิงเมื่อ:** HP ถึง `config: dungeons.hpSafety.lowHpWarningThreshold_pct`
- **properties:** `dungeon_id`
- **privacy:** ไม่มีพิกัด, ไม่มีค่า HP ที่แม่นยำเกินไป (ใช้ threshold event ไม่ใช่ HP ต่อเนื่อง)

### `run_auto_retreat`
- **ยิงเมื่อ:** auto-retreat ทำงาน (`config: dungeons.hpSafety.autoRetreatThreshold_pct`)
- **properties:** `dungeon_id`
- **privacy:** ไม่มีพิกัด

### `run_death`
- **ยิงเมื่อ:** HP ถึง 0 (เฉพาะคนปิด auto-retreat เองหรือ HP ลดเร็วกว่าระบบดึงทัน)
- **properties:** `dungeon_id`
- **privacy:** ไม่มีพิกัด

### `run_gps_status_changed`
- **ยิงเมื่อ:** state ของ `LocationProvider` เปลี่ยน ตรงกับ `gps.*` copy key ใน `design/ux/flows/F03-core-loop.md` §9.5 (N-7 — ชื่อ state ต้องตรงกับที่ gameplay-programmer ใช้จริง)
- **properties:** `status` (enum `searching`\|`off`\|`denied`\|`low_accuracy`\|`offline`\|`restored`), `context` (enum `onboarding`\|`map`\|`run` — ใช้แยกว่าหลุดตอนไหน)
- **privacy:** ไม่มีพิกัด ไม่มีค่า accuracy เป็นตัวเลข (พอรู้ว่า "แย่กว่าเกณฑ์" ก็พอ)

### `dungeon_report_submitted`
- **ยิงเมื่อ:** ผู้เล่นกดรายงานจาก `S-17-report-block`
- **properties:** `dungeon_id`, `reason_category` (enum ที่ narrative-designer/game-director กำหนดใน F13 — ไม่ใช่ free text ตาม NN-4)
- **privacy:** ไม่มีชื่อผู้ถูกรายงาน ไม่มีพิกัด

## 4. หมวด Social

ที่มา: `design/ux/flows/F03-core-loop.md` Flow A นาที 6–8, `design/ux/ia.md` U6 · **Phase 3 (F09)** — ประกาศชื่อไว้ล่วงหน้าตาม `product/metrics.md` §11

### `party_formed`
- **ยิงเมื่อ:** ผู้เล่นกดเข้าร่วม Nearby Party (`S-03a-nearby-party`) สำเร็จ
- **properties:** `dungeon_id`, `party_size` (int, นับรวมตัวเอง), `roles_present` (list ของ role ไม่ใช่รายชื่อ)
- **privacy:** ไม่มีชื่อ ไม่มี id ของสมาชิกคนอื่น ไม่มีพิกัด (NN-4)

## 5. หมวด Economy

ที่มา: GDD "Economy", `design/systems/sim-report.md` F-16 · **Phase 3–4 (F08, F11, F12)**

### `economy_gold_earned`
- **ยิงเมื่อ:** server เครดิต gold เข้าบัญชี (drop, ขาย NPC, raid)
- **properties:** `source` (enum `drop`\|`sell_npc`\|`raid`), `amount_bucket` (enum ตามช่วงที่ systems-designer กำหนดใน `config: telemetry.goldAmountBuckets` — ไม่ส่งจำนวนที่แม่นยำเกินไปเพื่อลด cardinality และไม่จำเป็นต้องแม่นยำระดับหน่วยสำหรับ metric เชิง aggregate), `dungeon_id` (nullable ถ้าเป็นรายได้ที่บ้านเช่นขาย NPC จากกระเป๋า)
- **privacy:** ไม่มีพิกัด

### `economy_gold_spent`
- **ยิงเมื่อ:** server หัก gold ออกจากบัญชี (ซื้อยา, ตีบวก, ซื้อในตลาด, ภาษีขาย)
- **properties:** `sink` (enum `potion`\|`enhance`\|`market_buy`\|`market_sell_tax`), `amount_bucket`
- **privacy:** ไม่มีพิกัด

### `economy_potion_price_observed`
- **ยิงเมื่อ:** ราคายาที่ผู้เล่นจ่ายจริงถูกกำหนด (ซื้อจาก NPC หรือขายต่อในตลาด) — ใช้ตัวเลขราคาจริงได้ (ไม่ใช่ bucket) เพราะเป็นราคาสาธารณะของไอเทมในเกม ไม่ใช่ข้อมูลส่วนบุคคล
- **properties:** `channel` (enum `npc`\|`market`), `item_id`, `price`
- **privacy:** ไม่มีพิกัด ไม่มี account_id ผูกกับราคา (aggregate เท่านั้น ไม่ใช้สืบว่าใครซื้อ)

### `market_trade_completed`
- **ยิงเมื่อ:** การซื้อขายในตลาดผู้เล่นสำเร็จ
- **properties:** `item_id`, `item_rarity` (enum), `price`, `tax_amount`
- **privacy:** ไม่มีชื่อผู้ซื้อ/ผู้ขาย (ตลาดไม่ระบุตัวตนตาม GDD "ตลาดไม่ระบุตัวตนและภาษี")

## 6. หมวด Progression

ที่มา: `design/systems/sim-report.md` F-17, CLAUDE.md · **Phase 4 (F10, F11)**

### `player_level_up`
- **ยิงเมื่อ:** เลเวลอัพ
- **properties:** `level` (int), `class` (enum), `minutes_since_account_created_bucket`
- **privacy:** ไม่มีพิกัด

### `loot_rarity_received`
- **ยิงเมื่อ:** ได้ไอเทม rarity ระดับ Rare ขึ้นไป (ใช้คำนวณ guardrail F-17 "แล้งของ")
- **properties:** `rarity` (enum `rare`\|`epic`\|`legendary`), `dungeon_id`, `party_had_ranged` (bool), `days_since_previous_same_rarity_bucket` (enum `0-7`, `7-30`, `30+`, `first_time`)
- **privacy:** ไม่มีพิกัด

## 7. หมวด Guardrail เฉพาะทาง (แบต)

ที่มา: `product/reviews/F02-spike-criteria.md` §4.2 (handoff จาก S3 ที่ No-go edge 15%/30 นาที กระทบผู้เล่น heavy-session 3–6 ชม./วัน), `A-P1-PLAN-01-6` (Battery Status API เฉพาะ Chrome/Android) · **Phase 2 (F02/F04), เฉพาะ `platform=web_android`**

### `battery_sample`
- **ยิงเมื่อ:** ทุก `config: telemetry.batterySampleInterval_s` (เสนอ 1800 = 30 นาที ให้ตรงหน่วยของเกณฑ์ spike S3) ระหว่างอยู่ใน run ที่ active และ Battery Status API พร้อมใช้งาน (`navigator.getBattery()` สำเร็จ) — ไม่ยิงบน iOS Safari (ไม่มี API นี้ ใช้แบบฟอร์มเดินทดสอบแทนตาม `product/metrics.md` §10.4)
- **properties:** `battery_pct_delta_bucket` (enum `0-5`, `5-10`, `10-15`, `15+` — % ที่ลดลงในช่วง interval นั้น ตรงหน่วยกับเกณฑ์ S3), `session_elapsed_minutes_bucket` (enum `0-30`, `30-90`, `90-180`, `180+` — ใช้แยกกลุ่มเวลาน้อย/มากตาม CLAUDE.md), `screen_wake_lock_active` (bool nullable — เผื่อ Phase 2 เพิ่ม Wake Lock ตามที่ `product/metrics.md` §10.1 เสนอ)
- **privacy:** ไม่มีพิกัด ไม่มี % แบตที่แม่นยำระดับหน่วย (ใช้ delta bucket ต่อช่วงเวลา ไม่ใช่ % สัมบูรณ์ ณ เวลาใดเวลาหนึ่งที่อาจสื่อถึงรุ่นเครื่อง/พฤติกรรมเฉพาะบุคคลได้ง่ายเกินไป)

## 8. ข้อกำหนดเรื่องปริมาณ event และเพดาน free tier

อ้างจาก `docs/adr/0002-backend-stack.md` หัวข้อ 4–5 และ `product/metrics.md` หัวข้อ 10.2 — เพดานที่ชนก่อนคือ rows written 100,000/วันของ Durable Object storage (ความจุราว 650–666 ผู้เล่น-ชั่วโมง/วัน) โควตารีเซ็ต 07:00 เวลาไทย เอกสารนี้กำหนดเงื่อนไขที่ tech-lead/backend-programmer ต้องออกแบบ pipeline ตาม ไม่ใช่ตัดสินสถาปัตยกรรมเอง:

1. **`run_tick_granted`/`run_tick_denied` ห้ามเป็น row เขียนแยกจาก reward tick ของเกม** — ต้อง derive จาก record เดียวกัน (batch export หรือ log stream แยกออกจาก write path หลัก) เพราะ event สองตัวนี้เกิดถี่ที่สุดในระบบ (ทุก `config: dungeons.movementGate.window_s` ต่อผู้เล่นที่กำลังเล่น)
2. Event ที่ไม่ผูกกับ tick (onboarding, party, report) ส่งรวมไปกับ batch ที่ client อัปโหลดอยู่แล้ว (`docs/tech/gps-trace-format.md`) ไม่เปิด connection ใหม่เฉพาะ telemetry
3. ถ้า telemetry กิน rows written เกิน 5% ของโควตาในวันใด ให้ลด sampling ของ event ที่ไม่ใช่ guardrail เด็ดขาดก่อน (`run_hp_low`, `run_gps_status_changed` สุ่มเก็บ 1 ใน N ได้) — **ห้ามลด sampling ของ event ที่ผูกกับการคำนวณรางวัลจริง** (`run_tick_granted`, `run_tick_denied`) เพราะขัด NN-2
4. Alert ที่ 50%/70% ของเพดาน (devops-engineer ตั้งตาม ADR 0002 ก่อน playtest Phase 3) ต้องแยกให้เห็นว่าสัดส่วนใดมาจาก telemetry เทียบ gameplay write โดยตรง

## 9. ตารางสรุปทุก event ตาม phase

| Event | หมวด | Phase พร้อม emit |
| --- | --- | --- |
| `onboarding_funnel_step` | Onboarding | 1–2 |
| `onboarding_first_reward_granted` | Onboarding | 1–2 |
| `onboarding_nearest_dungeon_distance` | Onboarding | 1–2 |
| `onboarding_empty_screen_shown` | Onboarding | 1–2 |
| `onboarding_empty_screen_abandoned` | Onboarding | 1–2 |
| `interest_registered_outside_area` | Onboarding | 1–2 |
| `dungeon_confirm_shown` | Places | 1–2 |
| `dungeon_entered` | Places | 1–2 |
| `dungeon_exited` | Places | 1–2 |
| `run_tick_granted` | Places/north star | 1–2 |
| `run_tick_denied` | Places/north star | 1–2 |
| `run_hp_low` | Places | 1–2 |
| `run_auto_retreat` | Places | 1–2 |
| `run_death` | Places | 1–2 |
| `run_gps_status_changed` | Places | 1–2 |
| `dungeon_report_submitted` | Places | 1–2 (queue เต็มรูปรอ F13/F15) |
| `battery_sample` | Guardrail (แบต) | 2 (`web_android` เท่านั้น) |
| `party_formed` | Social | 3 (F09) |
| `economy_gold_earned` | Economy | 3–4 (F08, F11) |
| `economy_gold_spent` | Economy | 3–4 (F08, F11) |
| `economy_potion_price_observed` | Economy | 4 (F11) |
| `market_trade_completed` | Economy | 4 (F12) |
| `player_level_up` | Progression | 4 (F10) |
| `loot_rarity_received` | Progression | 4 (F10–F11) |

## 10. สมมติฐานและคำถามค้าง

### สมมติฐาน
- A-P1-F03-T19-5: `amount_bucket` ของ event ฝั่ง economy ใช้ bucket แทนตัวเลขจริงเพื่อลด cardinality และลด row สำหรับ aggregation (สอดคล้องหัวข้อ 8) ยกเว้น `economy_potion_price_observed`/`market_trade_completed` ที่ใช้ราคาจริงเพราะเป็นราคาสาธารณะของไอเทม ไม่ใช่ transaction ต่อบัญชี (ยืนยัน: tech-lead, systems-designer)
- A-P1-F03-T19-6: `dungeon_report_submitted.reason_category` เป็น enum ที่ยังไม่ถูกกำหนดค่าจริง (รอ F13 หลังบ้าน) เอกสารนี้เว้นรายการไว้ให้ narrative-designer/game-director เติมภายหลัง ไม่ใช่ free text เด็ดขาด (ยืนยัน: narrative-designer, game-director)
- A-P1-F03-T19-7: `context` ของ `run_gps_status_changed` (onboarding/map/run) ต้องตรงกับ state machine จริงของ `LocationProvider` (`packages/location`) — ถ้าโครงสร้าง state ต่างจากนี้ ให้ tech-lead handoff กลับมาแก้ชื่อ property แทนที่จะเปลี่ยนฝั่ง telemetry เงียบๆ (ยืนยัน: tech-lead, gameplay-programmer)
- A-P1-F03-T19-8: `config: telemetry.batterySampleInterval_s`, `config: telemetry.emptyScreenAbandonTimeout_s`, `config: telemetry.clockSkewTolerance_s`, `config: telemetry.goldAmountBuckets` เป็น key ใหม่ที่เอกสารนี้เสนอ ยังไม่มีใน `config/balance/*.json` หรือไฟล์ config อื่น (ยืนยัน: systems-designer, tech-lead — อาจอยู่ไฟล์ใหม่ `config/app/telemetry.json` ตามรูปแบบเดียวกับ `config/app/privacy.json` ที่ P1-H05 สร้างไว้)

### คำถามค้าง (ไม่ขวาง Phase 1)
- Q-T19-3: `run_tick_granted`/`run_tick_denied` ที่ derive จาก reward tick record (หัวข้อ 8 ข้อ 1) ควรเป็น pipeline batch แบบไหน (export รายชั่วโมงจาก DO ไป D1/analytics เทียบกับ log stream ผ่าน Workers Analytics Engine ที่ Cloudflare Free ให้) — ส่งต่อ tech-lead ตัดสินใจในเชิงสถาปัตยกรรม (ไม่ใช่ของ product-manager) ก่อนเขียน tech note F07/F08
- Q-T19-4: `battery_sample` ควรยิงจาก client ตรงๆ (เพิ่ม row) หรือรวมกับ batch ตำแหน่งที่ส่งอยู่แล้วทุก tick — เสนอแบบหลังตามหลักการหัวข้อ 8 ข้อ 2 ให้ tech-lead ยืนยันตอน build `packages/location`