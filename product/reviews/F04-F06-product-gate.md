# Product Gate — F04–F06 (P2-F06-T25)

เจ้าของ: product-manager · วันที่ตรวจ: 2026-09-30
อ้างอิง: `product/prd/F04-dungeon-presence.md`, `product/prd/F05-movement-gate-reward.md`, `product/prd/F06-hp-damage-onboarding.md`, `product/metrics.md` (§1, §3.2, §9.1–§9.2), `product/telemetry-events.md`, `product/playtest/phase-2-plan.md`, `product/playtest/phase-2-questionnaire.md`, `studio/phases/phase-2/board.md` หัวข้อ 5 (E8, E9, E10, E17) และ detail block P2-F06-T25, `docs/reviews/F06-tech-gate.md` (รอบ 2 PASS), `design/reviews/F06-copy-gate.md` (รอบ 2 PASS), `qa/reports/F06-qa-gate.md` (PASS), `art/reviews/F04-F06-visual-gate.md` (รอบ 3 PASS), `design/reviews/F06-design-gate.md` (รอบ 2 PASS), `apps/client/src/telemetry/{known-events.ts,f04-events.ts,gps-status-events.ts,download.ts}`, `apps/client/e2e/telemetry-export.spec.ts`, `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts`

**verdict: PASS**

สรุปสั้น: ทุกคำถามของ playtest plan §5 มีแหล่งข้อมูลจริงในเครื่องรองรับแล้ว (event หรือแบบสอบถาม/บันทึกผู้สังเกต) build ตรงคำตัดสิน P2-H50 ทั้งสองข้อ (`run_gps_status_changed` emit จริงพร้อม mapping ที่ยืนยันแล้ว, `onboarding_nearest_dungeon_distance` เลื่อนตามที่ตกลงไว้) ปุ่ม export ทำงานจริงพร้อมหลักฐาน e2e สองชุด ไม่มีพิกัดหลุด E8/E17/PM-S2/PM-M2 ยืนยันครบ ไม่มี dark pattern ไม่มี IAP onboarding ยังสะอาด — ให้ผ่านไป P2-F06-T27 (playtest ภาคสนาม) ได้

---

## 1. ปัญหาผู้เล่นใน PRD F04–F06 ถูกแก้จริงตามที่ build หรือไม่

| PRD | ปัญหาผู้เล่น | สิ่งที่ build ส่งมอบจริง (อ้างอิงจากเกตอื่นที่ PASS แล้ว) | ตอบหรือไม่ |
| --- | --- | --- | --- |
| F04 | "ฉันเดินไป dungeon แล้วรู้ว่าเข้าได้จริงไหม โดยไม่ต้องเดาหรือถูกหลอก" | popup confirm + polygon ซ้อน, reason การปฏิเสธ check-in 9 ค่าตรง engine, นำทางลูกศร+ระยะเส้นตรง, เวลาทำการ/แจ้งเตือนใกล้ปิด — QA gate PASS ทุก case presence/transition | ตอบแล้ว |
| F05 | "ฉันเดินจริงแล้วได้รางวัลจริง ไม่ใช่การเดาหรือโดนโกงให้เสียเวลา" | movement gate เดียวกันตัดสินทั้ง tick และการตี, นิ่ง=0 tick, jitter ยังได้ tick, ไม่มีเพดานเวลา, tick บางส่วน (D-059) — golden vector ผ่านทุกตัว, ยืนยันซ้ำใน F06-QA gate | ตอบแล้ว |
| F06 | "ฉันเปิดแอปครั้งแรกต้องเข้าใจว่าต้องทำอะไรใน 10 นาที และเดินไกลมาแล้วต้องไม่ตายใน 5 นาทีโดยไม่ตั้งใจ" | onboarding 5 ช่วง (age gate ก่อน consent เสมอ), auto-retreat default เปิดที่ 25% HP, ยาอัตโนมัติ, แจ้งเตือน 30%, รางวัลก้อนแรกเป็น tick ปกติไม่มี code path แยก (D-089) — design gate F06 รอบ 2 PASS ยืนยัน "ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก" | ตอบแล้ว |

ทั้งสามข้อนี้ไม่ใช่การตัดสินใหม่ของ gate นี้ — เป็นการยืนยันซ้ำจากหลักฐานของ design/tech/QA gate ที่ PASS แล้วทั้งหมด (รายละเอียดเต็มอยู่ในเอกสารนั้น) product gate เพิ่มเติมแค่มุม "วัดได้จริงไหม" ในหัวข้อ 2–3 ด้านล่าง

## 2. ทุกคำถาม playtest plan §5 มีแหล่งข้อมูลจริงในเครื่องหรือไม่ (acceptance ข้อ 1)

ตรวจตารางจับคู่คำถามของ `product/playtest/phase-2-plan.md` §5 ทีละแถวกับจุดยิงจริงใน `apps/client/src`:

| คำถามของ PRD | event/แหล่งข้อมูล | มีจุดยิงจริงในเครื่องหรือไม่ |
| --- | --- | --- |
| onboarding เข้าใจไม่ต้องอธิบายเพิ่ม | `onboarding_funnel_step`, `onboarding_first_reward_granted` | มี — `known-events.ts` + mapper ใน `f04-events.ts`, ยืนยันซ้ำใน QA gate (`onboarding.spec.ts`) |
| เข้าใจ popup confirm/polygon ซ้อน | `dungeon_confirm_shown.overlap` | มี — `dungeonConfirmShownEvent()` ใน `f04-events.ts` |
| เดินเลียบขอบ state กะพริบรำคาญไหม | `run_state_changed` | มี — engine T6–T8, `known-events.ts` |
| ตัวนับ tick หยุด (Grace/Suspended) เข้าใจไหม | `run_state_changed` | มี (เดียวกับข้างบน) |
| tick ไม่ผ่าน gate แต่ตัวนับไม่หยุด เข้าใจว่าเกิดจากอะไร | `run_tick_denied` (มี `partial`) | มี |
| นำทางลูกศร+ระยะเส้นตรงพาไปถึงจริงไหม | `navigation_link_opened` | มี |
| `no_approach_from_outside` บล็อกกี่ครั้ง/เสียเวลาเท่าไร | `checkin_rejected.reason` (9 ค่า) เทียบ `dungeon_entered` | มี |
| เจอเวลาทำการปิดไหม ข้อความชัดไหม | `dungeon_closing_soon_notified`, `checkin_rejected.reason=dungeon_closed` | มี |
| ได้ tick สม่ำเสมอ / jitter tolerance | `run_tick_granted`/`run_tick_denied`, north star proxy | มี — ฐานเดียวกับ reward reducer |
| feedback ตอนได้ของคุ้มค่าไหม | `run_tick_granted` (ความถี่) | มี |
| ไม่มีเพดานเวลา รู้สึกแฟร์ไหม | ไม่มี event ตรง — เชิงคุณภาพล้วน | ตามแผน ไม่ใช่ช่องว่าง |
| เจอ damage/auto-retreat ครั้งแรกรู้สึกอย่างไร | `run_hp_low`, `run_auto_retreat`, `run_death` + บันทึกผู้สังเกต F06-C32 | มี ทั้ง event และฟอร์ม |
| DG6-04 ช่วงเลเวล dungeon ครอบผู้เล่นไหม | ไม่มี event ตรง (ยืนยันแล้วไม่มี `player_level`/`level_range` ใน telemetry ใด) — แหล่งหลักคือบันทึกผู้สังเกต §2b | มี (นอก telemetry) — ตรวจแล้ว `qa/playtest/phase-2-observer-form.md` มีหัวข้อ 2b จริง (P2-H58) |
| copy สามจังหวะตรงโทนไหม | ไม่มี event ตรง — ยืนยันคู่กับ content gate | ตามแผน, content gate F06 รอบ 2 PASS แล้ว |
| เจอหน้าจอไกล/นอกพื้นที่อยากลองใหม่ไหม | `onboarding_empty_screen_shown`/`abandoned`, `interest_registered_outside_area` | มี — ยืนยันจุดยิงจริงใน `apps/client/src/f04-app.ts:797-913` |
| pocket screen ทำงานตามที่คาดไหม | `page_hidden_total_s_bucket`, `wake_lock_engaged_share_bucket`, `run_gps_status_changed` | มี — ดูหัวข้อ 3 (P2-H50) |
| ภาพรวม north star เชิงความรู้สึก | north star proxy จาก `run_tick_granted` | มี |

**ผลตรวจ: ครบทุกแถว** ไม่มีคำถามใดในตารางที่ขาดแหล่งข้อมูล (ทั้ง event หรือ observer form/questionnaire ที่ยืนยันแล้วว่ามีอยู่จริงในไฟล์ของ qa-tester) — acceptance ข้อ 1 **ผ่าน**

## 3. build ตรงคำตัดสิน P2-H50 หรือไม่ (acceptance ข้อ 2)

### 3.1 `run_gps_status_changed`

ตรวจโค้ดจริง `apps/client/src/telemetry/gps-status-events.ts`:

- `RUN_GPS_STATUSES` = `searching`\|`off`\|`denied`\|`low_accuracy`\|`offline`\|`restored` ตรง 6 ค่าที่สเปกกำหนดเป๊ะ ไม่มี bucket ตัวเลข
- `RUN_GPS_CONTEXTS` = `onboarding`\|`map`\|`run` ตรงสเปก
- `wireGpsStatusTelemetry()` ยิงทุกครั้งที่ state เปลี่ยน ไม่ debounce ไม่ sample (ตรวจ logic: catch-up ตอน wire ครั้งแรกด้วย ตามที่ comment อธิบาย)
- ไม่มี `lat`/`lng`/`accuracy` ในโมดูลนี้เลย (ยืนยันด้วยการอ่านทั้งไฟล์ ไม่มีการ import field เหล่านี้)
- ยิงจริงใน `main.ts:367` (ตามที่ orchestrator ตรวจแล้วใน P2-X50 — "run_gps_status_changed ยังไม่ wire" เป็นรายงานผิดของ X50 ที่ orchestrator แก้แล้ว)

**mapping สองจุดที่ต้องยืนยัน/ปฏิเสธตาม task brief:**

1. **`unsupported` → `denied`**: ยืนยัน — โค้ดจริง `DISPLAY_TO_STATUS` map `unsupported: 'denied'` ทั้งสองเป็น "บล็อกถาวรในเครื่องนี้ ขอ fix ไม่ได้เลยในเซสชันนี้" เหมือนกัน (`unsupported` = ไม่มี `navigator.geolocation` เลย, `denied` = ผู้เล่นปฏิเสธ permission) — สเปก §3 ของ telemetry-events.md ให้ enum 6 ค่าไม่มีค่าที่ 7 สำหรับ "ไม่รองรับ" แยกต่างหาก และ metric ที่ใช้ event นี้ (อัตรา GPS หลุด/แม่นยำต่ำระหว่างเดิน, `product/metrics.md` guardrail ที่เกี่ยวกับ pocket screen) ไม่ต้องแยกสองสาเหตุนี้เพื่อวัดผล playtest รอบนี้ — เหตุผลของ tech ตรงกับเจตนาการวัดของ product ยืนยัน mapping นี้ถูกต้อง ไม่ต้องแก้
2. **`suspended` toast → `restored`**: ยืนยัน — enum ไม่มีค่า "กลับจากสถานะ suspended" แยกต่างหาก และนิยาม `restored` ตามสเปกคือ "ออกจากสถานะแย่" ซึ่ง suspended (ล็อกจอ/สลับแท็บแล้วกลับมา) เข้าเงื่อนไขนี้พอดี ข้อมูลว่า suspended กินเวลาเท่าไรมีอยู่แล้วใน `dungeon_exited.page_hidden_total_s_bucket`/`wake_lock_engaged_share_bucket` (คนละ event แต่ตอบคำถามเดียวกันของ playtest plan แถว "pocket screen") จึงไม่จำเป็นต้องเพิ่ม enum ใหม่ก่อน playtest รอบนี้ — ยืนยัน mapping นี้ถูกต้อง

ทั้งสอง mapping **ยืนยัน (ไม่ใช่ปฏิเสธ)** ตามที่ P2-X48 เสนอ ไม่มีข้อเสนอแก้กลับไปที่ gameplay-programmer

**หลักฐาน e2e:** `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` บังคับ transition จริง (`context.setOffline(true/false)`) ระหว่าง run แล้วตรวจว่า `offline`/`restored` คู่กันอยู่ในไฟล์ export จริงด้วย `context=run` และไม่มีคีย์ `lat`/`lng`/`accuracy`/`accuracy_m` — ผ่านตามที่ QA gate F06 บันทึกไว้แล้ว (หัวข้อ "export ไฟล์จริง ... รวม `run_gps_status_changed`" = PASS)

### 3.2 `onboarding_nearest_dungeon_distance` — เลื่อนตามคำตัดสิน P2-H50

ตรวจว่าไม่มีจุดยิงจริงใน `apps/client/src` (ยืนยันซ้ำ — grep ไม่พบ call site ใดนอกจาก schema ใน `known-events.ts`) ตรงกับคำตัดสินที่บันทึกไว้แล้วใน `product/telemetry-events.md` A-P2-H50-1: ไม่บังคับก่อน playtest เพราะ (1) ไม่ผูกกับคำถาม/เกณฑ์ใดในแผน playtest ตามตารางหัวข้อ 2 ด้านบน (2) GR-1 ปิดแล้วจาก coverage แบบ static ไม่ใช่ telemetry รันไทม์ (ดูหัวข้อ 5) (3) N≈3 ที่ถูกนัดไปยัง dungeon รู้ระยะแล้วไม่มีความหมายเชิงสถิติ — **สถานะของ build ตรงกับคำตัดสินที่ล็อกไว้แล้ว ไม่ใช่ของใหม่ที่ต้องเปิดงานเพิ่ม**

### 3.3 ปุ่ม export ทำงานจริง (P2-X50/X51)

- `apps/client/src/telemetry/download.ts`: `downloadTelemetryExport()` ใช้ `buildTelemetryExport` (ตัด forbidden property + ค่าคล้ายพิกัด) + `Blob`/anchor + ชื่อไฟล์ `kw-p2-telemetry-<8 hex>.jsonl` (ไม่มีวันที่/session id) ตรงสเปก §1.2/§8
- หลักฐาน e2e สองชุด: `apps/client/e2e/telemetry-export.spec.ts` (ดาวน์โหลดไฟล์จริง จากรันปกติ ตรวจ `dungeon_entered`/`run_tick_granted`/`onboarding_first_reward_granted` อยู่ในไฟล์ ไม่มีพิกัด) และ `qa/tests/e2e/f06-telemetry-export-gps-status.spec.ts` (สถานการณ์ GPS/network จริง) — ทั้งสองผ่าน (ยืนยันใน QA gate F06: "export ไฟล์จริง ... ไม่มีพิกัด/accuracy ในทุก property รวม `run_gps_status_changed`" = PASS)
- **ไม่มี wall-clock timestamp ในไฟล์ export**: ตรวจ schema `ExportedLine` (`t_rel_ms` แทน `client_ts_ms`) และ regex `COORDINATE_LIKE_NUMBER_PATTERN`/`FORBIDDEN_KEY_PATTERN` ในทั้งสอง spec ครอบคลุมชื่อ key ที่ห้ามตาม §1.2 ครบ

**acceptance ข้อ 2 ผ่านครบ** (mapping ยืนยันทั้งคู่, `onboarding_nearest_dungeon_distance` deferred ตามแผน, export ทำงานจริงไม่มีพิกัด)

## 4. E8 — ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก (acceptance ข้อ 3)

หลักฐานหลักคือ design gate: `design/reviews/F06-design-gate.md` verdict **PASS** (รอบ 2, บรรทัด 207) — "DG6-01 ปิด · gate F06 design PASS · ไม่มี finding ใหม่ที่แตะ non-negotiable (popup ไม่มีจำนวนคน ไม่มีช่องพิมพ์ ไม่มีของหรือรางวัลใหม่)" อ้างอิงฐานจาก tech gate รอบ 2 PASS, copy gate รอบ 2 PASS, QA gate PASS, visual gate รอบ 3 PASS (ทุกอันปิดก่อน design gate ตามลำดับที่หัวเอกสารนั้นระบุ)

หลักฐานรอง (ฝั่ง QA): `qa/reports/F06-qa-gate.md` ขอบเขตระบุชัด "E6, E8 (ฝั่ง QA) ... case ต่อจอใน qa/reports/F06-qa-gate.md" verdict รวม **PASS** ไม่มีบั๊ก severity high/critical เปิดค้าง

**product-manager ยืนยัน E8 = DONE** ทั้งสองฝั่ง (design gate เป็นหลักฐานหลักตามที่ task brief ระบุ, QA gate เป็นหลักฐานประกอบ) — ไม่มีข้อค้านจากมุม product เพิ่มเติม เพราะ E8 เป็นคำถามด้านกติกาเกม/การสื่อสาร ไม่ใช่คำถามด้าน metric ที่ product เป็นเจ้าของ

**E17 — GR-1 ของ 3 ย่านเปิดตัว:** `product/metrics.md` §9.1/§9.2 คำนวณ GR-1 ซ้ำสองรอบ (ก่อนและหลัง P2-H11 ที่ตัด candidate ออกหลายแห่ง) **PASS ทั้ง 3 ย่านทั้งสองรอบ** — พระนคร ≤5% (G4 เต็ม), ปทุมวัน ≤15% (S3, เปลี่ยนเกณฑ์จาก G4 หลัง P2-H11 ตามที่ HUMAN ตัดสินไว้แล้ว D-083), บางรัก ≤15% (S3) ค่า `g4_pop_share_red` ไม่ขยับแม้แต่ตำแหน่งทศนิยมเดียวตลอด 3 ชุดข้อมูล — **สถานะ: ปิดแล้ว ไม่ blocking ไม่ต้อง handoff เพิ่ม** (ช่องว่าง G2 ของบางรักเป็นคนละเกณฑ์ ไม่กระทบ GR-1)

**A-P2-H45-1 (lower-bound handling):** `page_hidden_total_s_bucket`/`wake_lock_engaged_share_bucket` มาจาก `runClientStats` ที่อยู่ในหน่วยความจำเท่านั้น (ไม่ persist) — reload กลาง run ทำให้สอง bucket นี้นับขาด รับทราบและบันทึกไว้แล้วเป็นข้อจำกัดของ Phase 2 (ไม่ใช่บั๊กที่ต้องแก้ก่อน playtest, ยืนยันร่วมแล้วโดย tech-lead ใน A-P2-H50-2) **ยืนยันซ้ำในงานนี้ว่าไม่กระทบ north star proxy** (คำนวณจาก `run_tick_granted` คนละแหล่งข้อมูล) และวิธีอ่านผล (เป็นค่าต่ำสุดที่เป็นไปได้เมื่อสงสัยว่ามี reload) บันทึกไว้ถูกต้องแล้วใน `phase-2-plan.md` §2/§4.1 — ไม่มีอะไรต้องแก้เพิ่มในรอบนี้

## 5. PM-S2 / PM-M2 (acceptance ข้อ 4)

**PM-S2 (checklist เต็ม 4 ข้อของ product gate):**

1. ปัญหาของผู้เล่นใน PRD F04–F06 ถูกแก้จริงตามที่ build — ผ่าน (หัวข้อ 1)
2. ไม่มี dark pattern ไม่มี IAP — ตรวจ `config/app/client.json`, deploy runbook (P2-F06-T26 ระบุ "ห้ามเปิดบริการหรือแผนที่คิดเงิน D-085") และ build ทั้งหมดของ F04–F06 ไม่มี UI การเงิน/ซื้อของจริงใดๆ (Phase 2 ไม่มีตลาด/ร้าน NPC จริง ตาม `product/telemetry-events.md` หัวข้อ 5) — **ผ่าน ไม่มีการเปลี่ยนแปลงจากที่ CLAUDE.md กำหนด**
3. onboarding ยังสะอาด — ตรวจ `onboarding_funnel_step` enum: age gate มาก่อน consent เสมอ, ไม่มี `login_*` (Phase 2 ไม่มีบัญชี), ไม่มีการสอนระบบที่ยังไม่ต้องรู้ (ยืนยันซ้ำจาก design gate E8) — **ผ่าน**
4. event ครบตาม P2-F04-T17 รวม empty screen และ export ได้สำหรับ playtest โดยไม่มีพิกัด — ผ่าน (หัวข้อ 2–3)

**PM-M2 (empty screen + interest events):** ตรวจโค้ดจริง `apps/client/src/f04-app.ts`:
- บรรทัด 913: `telemetry.record('onboarding_empty_screen_shown', { reason })`
- บรรทัด 892: `telemetry.record('onboarding_empty_screen_abandoned', ...)` พร้อม `seconds_before_close_bucket`
- บรรทัด 810: `telemetry.record('interest_registered_outside_area', ...)`

ทั้งสามจุดมีจริง ไม่ใช่แค่ schema — ยืนยันซ้ำจาก QA gate F06 (`s09-interest-register.test.ts`, `home-states-trace-replay.test.ts` = PASS: "จอไกล/นอกพื้นที่/นอกย่านเปิดตัว/ไม่รู้ตำแหน่ง มีสิ่งให้ทำ · ลงทะเบียนไม่มีช่องพิมพ์ ไม่มีพิกัด ไม่มีรางวัล") **PM-M2 ผ่าน**

## 6. เรื่องที่ตรวจแล้วไม่ใช่ปัญหา (บันทึกเพื่อไม่ให้ถามซ้ำ)

- **P2-X47 (polish คู่ขนาน):** อ่าน scope ของงานแล้ว — เป็นงาน UI/copy เล็ก (chip ระยะ, formatter เวลา, canClear, comment, toggle follow) ไม่มีจุดใดแตะชื่อ event หรือ property ของ `product/telemetry-events.md` ไม่มีสัญญาของ telemetry contract เปลี่ยนจากงานนี้ ไม่ต้องเปิดข้อกังวลเพิ่ม
- **P2-X54 (engine fix):** แก้บั๊ก `run_tick_denied` ซ้ำตอนกลับจาก Grace/Suspended — เป็นการแก้ reducer ให้ตรง tech note ที่มีอยู่แล้ว ไม่เปลี่ยนชื่อ/property ของ event ใดใน telemetry-events.md ไม่กระทบ acceptance ของ gate นี้
- **DG6-04/D-143:** ปิดแล้วตาม design gate — ไม่มีการเพิ่ม event telemetry ใหม่ (ตัดสินใจไว้แล้วว่าเกินขอบเขต ไม่ blocking) บันทึกผู้สังเกต §2b มีอยู่จริงในไฟล์ของ qa-tester — ตรวจแล้ว **ไม่ต้องเปิดงานใหม่**

## 7. Verdict

**PASS** — ทุก acceptance ข้อผ่านครบ ไม่มี finding ที่ต้อง blocking กลับไปหาโปรแกรมเมอร์ก่อน P2-F06-T27 build พร้อม deploy สำหรับ playtest ภาคสนามได้

---

## REPORT
task: P2-F06-T25
status: DONE
summary: Product gate F04–F06 verdict PASS — ทุกคำถาม playtest ผูก event/แหล่งข้อมูลจริงครบ, build ตรงคำตัดสิน P2-H50 (mapping unsupported→denied และ suspended→restored ยืนยันทั้งคู่, onboarding_nearest_dungeon_distance deferred ตามแผน), E8/E17/PM-S2/PM-M2 ยืนยันครบ ไม่มี dark pattern/IAP
outputs:
  - product/reviews/F04-F06-product-gate.md — product gate report ฉบับเต็ม verdict PASS
acceptance:
  - [x] ทุกคำถาม playtest plan §5 มีแหล่งข้อมูลที่มีอยู่จริงในเครื่อง — evidence: หัวข้อ 2 ของรายงานนี้ ตรวจทุกแถวกับ `known-events.ts`/`f04-events.ts`/`gps-status-events.ts` และไฟล์ของ qa-tester (`qa/playtest/phase-2-observer-form.md` §2b)
  - [x] build ตรง P2-H50 (run_gps_status_changed mapping ยืนยัน, onboarding_nearest_dungeon_distance deferred, export ทำงานไม่มีพิกัด) — evidence: หัวข้อ 3, e2e สองชุดผ่านตามที่ QA gate บันทึก
  - [x] E8 ยืนยัน (design gate เป็นหลักฐานหลัก), E17 PASS ทั้ง 3 ย่าน, A-P2-H45-1 บันทึกวิธีอ่านถูกต้องแล้ว — evidence: หัวข้อ 4, `design/reviews/F06-design-gate.md` บรรทัด 207, `product/metrics.md` §9.1–§9.2
  - [x] PM-S2 (checklist 4 ข้อ) และ PM-M2 (empty screen + interest events) ยืนยันด้วยโค้ดจริง — evidence: หัวข้อ 5, `apps/client/src/f04-app.ts:797-913`
assumptions:
  - none
handoffs:
  - to: HUMAN | need: ดำเนิน P2-F06-T26 (deploy+smoke) แล้วต่อด้วย P2-F06-T27 (playtest ภาคสนาม ≥3 คน) ตาม board | why: gate นี้ปลดล็อก build สำหรับ playtest | blocking: no
decisions:
  - none
questions_for_human:
  - none
