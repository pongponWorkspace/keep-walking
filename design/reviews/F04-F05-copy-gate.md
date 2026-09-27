# F04 / F05 copy gate (P2-F05-T17)

| หัวข้อ | ค่า |
| --- | --- |
| Task | P2-F05-T17 (review-gate) |
| ผู้ตรวจ | narrative-designer |
| วันที่ | 2026-09-27 |
| วิธีตรวจ | อ่านโค้ด UI แทน screenshot (session นี้ไม่มี shell) · เทียบทุก key ที่โค้ดเรียกกับ `config/content/copy.th.json` · ตรวจตัวแปรที่โค้ดเติมจริงตอน runtime · ตรวจกฎ copy 6 ข้อ · หลักฐานจาก orchestrator: copy lint + config lint ผ่าน (171), `qa/tests/F02/privacy-copy.test.ts` ผ่าน 200 test (ไม่มีข้อความไทยในโค้ด client) |
| ไฟล์ที่อ่าน | `apps/client/src/f04-app.ts`, `apps/client/src/ui/{dungeon-confirm,checkin-status,nav-panel,run-bar,run-state-view,speed-lock-overlay,tick-toast,run-summary}.ts`, `apps/client/src/dungeons/artifact.ts`, `apps/client/src/copy/{load,format,names}.ts`, `packages/shared/src/run/check-in.ts`, `data/dungeons/artifact/dungeons.client.v1.json` (name_key, search_name_key) |

## คำตัดสิน

| Feature | verdict | เหตุผลสั้น |
| --- | --- | --- |
| F04 dungeon presence (นำทาง, check-in, speed lock, run state, หัวข้อสรุป) | **NEEDS_CHANGES** | ข้อ C-01 ถึง C-06 ทำให้ผู้เล่นเห็น key ดิบ, `{ตัวแปร}` ดิบ, เลข epoch หรือหน่วย `m` ภาษาอังกฤษบนจอจริง |
| F05 movement gate + reward (toast รอบ, แถว EXP/รอบ, รายการของ, canon สามจังหวะบนหน้าสรุป) | **PASS** | key ครบ ตัวแปรเติมครบ ชื่อไอเทมอ่านจาก `names.th.json` ถูกทาง ไม่มีข้อที่ต้องแก้ก่อนผ่าน · มีข้อสังเกต F05-N1 ไม่ blocking |

## 1. key ที่โค้ดเรียก เทียบกับ copy.th.json

- ทุก key ตัวอักษรตรงที่โค้ดใน `apps/client/src` (ยกเว้น test) เรียกมีอยู่ใน `copy.th.json` ครบ: 63 key ในไฟล์ UI ที่ระบุ + `nav.direction*` 8 key (`dungeons/direction.ts`) + `dungeon.checkin*` 4 key (`checkin-status.ts`) และ `dungeon.checkinNoClass`, `dungeon.checkinNoHp` ที่เพิ่มใน P2-H04
- ปัญหาอยู่ที่ key ที่ **ไม่ใช่ตัวอักษรตรง** ซึ่งมาจาก artifact: `name_key` (`dungeon.<id>`) และ `search_name_key` (`dungeon.<id>.search`) อยู่ใน `names.th.json` แต่โค้ดอ่านผ่าน `getCopyText` ซึ่งอ่าน `copy.th.json` เท่านั้น จึงได้ fallback เป็น key ดิบ (C-01, C-02)

## 2. เพดานช่อง

- ค่า `cells` คงที่ของทุก key ที่ใช้ไม่เกินเพดานตาม `copy-rules.json` (lint ผ่าน)
- กรณีแย่สุดตอน runtime ที่ตรวจเพิ่ม: `nav.directionLabel` 17 ช่อง (label 20) · `dungeon.confirmTitle` 34 ช่อง (message) · toast รอบแรก `run.tickGrantedFirst` + ช่องว่าง + `run.continueCta` = 41 ช่อง บรรทัดเดียว (message 64, จอแคบตัดเป็น 2 บรรทัด ไม่เกินกฎข้อ 2) · `run.summaryExpGained` + `run.levelUp` = 23 ช่อง แสดงเป็นแถวเดียว ไม่ใช่ label เดียว
- ค่าที่เกินหรือผิดรูปตอน runtime มาจากตัวแปรที่เติมผิด ไม่ใช่ข้อความ: C-03 (`distanceText`), C-04 (`openTime` เป็นเลข 13 หลัก)

## 3. กฎ copy 6 ข้อ

ตรวจทุกข้อความที่จอ F04/F05 แสดงจริง ผ่านทุกข้อ ไม่มีข้อที่ต้องงอ

| กฎ | ผล |
| --- | --- |
| 1 คำต้องห้าม | ไม่พบ |
| 2 ไม่เกิน 2 บรรทัด | ผ่าน (ยาวสุด `run.autoRetreat` 63 ช่อง canon GDD) |
| 3 มุกจากสถานการณ์จริง | ผ่าน (นั่งรถ, ยามปิดประตู, ออกไปซื้อน้ำ) |
| 4 แซะไม่ด่า | ผ่าน · `run.tickDenied`, `anticheat.speedLockTitle` ไม่กล่าวหา |
| 5 ภาษาอังกฤษเฉพาะคำที่คนไทยใช้ | ผ่านใน copy · **แต่** โค้ดต่อ `m` ภาษาอังกฤษเองบนจอ (C-03) |
| 6 ไม่หยาบในข้อความระบบ | ผ่าน |

สามจังหวะ (HP ต่ำ/ถอย/ตาย) ที่หน้าสรุปใช้ canon ตรงตัว ไม่มีคำขอโทษ ปลอบ หรืออธิบายเพิ่ม · `run.summary.diedBody` เป็นข้อเท็จจริง

## 4. ข้อความไทยในโค้ด

- ไม่มี (qa privacy-copy test ผ่าน 200 test ตามที่ orchestrator แจ้ง)
- test นั้นจับเฉพาะอักษรไทย จึงไม่เห็น literal `'m'` ที่ `f04-app.ts:314` (C-03)

## 5. ข้อค้นพบ F04

ระดับ: **blocker** = ต้องแก้ก่อน F04 ผ่าน · **should** = แก้ใน Phase 2 ไม่ต้องรอ gate ใหม่ · **minor** = ไม่ blocking

| # | ระดับ | key | ไฟล์ | สิ่งที่ผู้เล่นเห็น | ต้องเป็น | owner |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | blocker | `dungeon.<id>` (artifact `name_key`) → `{zoneName}` ของ `dungeon.confirmTitle`, การ์ดซ้อน, ป้ายบนแผนที่ | `ui/dungeon-confirm.ts:88,104`, `dungeons/artifact.ts:85` | key ดิบ เช่น `dungeon.baanPhraAthit` เพราะ `getCopyText` อ่าน `copy.th.json` เท่านั้น | อ่านจาก `names.th.json` · `{zoneName}` = `{nameReal} — {nameSuffix}` ตาม `names.th.json#_meta.displayFormat` · ป้ายแผนที่และการ์ดที่ที่ไม่พอใช้ `nameReal` (`{zoneRealName}`) | gameplay-programmer |
| C-02 | blocker | `dungeon.<id>.search` (artifact `search_name_key`) | `ui/nav-panel.ts:214,218` | แผง fallback แสดง key ดิบ และปุ่ม "คัดลอกชื่อ" คัดลอก key ดิบไปวางในแอปแผนที่ | อ่าน field `name` ของ `dungeon.<id>.search` จาก `names.th.json` | gameplay-programmer |
| C-03 | blocker | `{distanceText}` (ชิประยะ) | `f04-app.ts:314` | `650 m` (หน่วยภาษาอังกฤษต่อในโค้ด, literal `'m'`) | จัดรูปด้วย `unit.m` / `unit.km` ตาม `copy-rules.json#formats` (กม. ตั้งแต่ 1,000 ม. ทศนิยม 1 ตำแหน่ง, locale th-TH) · ห้ามต่อหน่วยเอง | gameplay-programmer |
| C-04 | blocker | `{openTime}` ของ `dungeon.closedBody` (แผงนำทาง) | `f04-app.ts:321` | `ยามปิดประตูแล้ว เปิดอีกที 1759…` (epoch ms เป็นสตริง) | จัดรูปด้วย `unit.today` / `unit.tomorrow` / `unit.onWeekday` + `clockPattern` HH:mm (`_variables.openTime`) | gameplay-programmer |
| C-05 | blocker | `run.tickTimer`, `run.stateSuspended` | `f04-app.ts:290-291` (`setStatus(status, {})`, `setTick(status, undefined)`) | สถานะ Active: `รอบถัดไป {timeLeft}` · Suspended: `run หยุดชั่วคราว กลับเข้าเขตภายใน {timeLeft}` (วงเล็บปีกกาดิบ) | เติม `timeLeft` จาก selector ของ engine (T27 N-11, `suspendedMax_s`) จัดรูปด้วย `unit.*` | gameplay-programmer |
| C-06 | blocker | `dungeon.checkinNotEnoughTrace` | `ui/dungeon-confirm.ts:152-155`, `ui/checkin-status.ts:59-62`, ต้นทาง `packages/shared/src/run/check-in.ts:55-57` | ตอน chain ยังไม่เริ่ม `readyIn_s` เป็น `null` → `รอสัญญาณต่อเนื่องอีก {countdown}` | narrative เพิ่ม key ไม่มีตัวแปรสำหรับกรณีไม่มี countdown (เสนอ `dungeon.checkinNotEnoughTraceWaiting` "รอสัญญาณต่อเนื่องอีกสักพัก") · client ใช้ key นั้นเมื่อ `readyIn_s` เป็น `null` | narrative-designer (key) + gameplay-programmer (map) |
| C-07 | should | `nav.fallbackOtherApp` แทน `nav.copyPlaceLink` | `ui/nav-panel.ts:76` | ลิงก์รองเขียน "ใช้แอปแผนที่อื่น" แต่กดแล้วเปิดแผงคัดลอกชื่อ | ลิงก์ที่เปิดแผง fallback ใช้ `nav.copyPlaceLink` ("คัดลอกชื่อสถานที่") · `nav.fallbackOtherApp` สงวนไว้กับลิงก์ไปแอปแผนที่อีกเจ้าบน iOS ตาม context | gameplay-programmer |
| C-08 | should | `nav.fallbackBody`, `nav.fallbackManualCopy` | `ui/nav-panel.ts:96-152` | แผง fallback ไม่มีบรรทัดบอกวิธีใช้ · ตอน clipboard ใช้ไม่ได้ ปุ่มกลายเป็นช่อง input เงียบๆ | แสดง `nav.fallbackBody` ใต้หัวแผง · แสดง `nav.fallbackManualCopy` คู่ช่อง input | gameplay-programmer |
| C-09 | should | `nav.distanceApprox` | `f04-app.ts:314` (ส่ง `approximate` = `false` เสมอ) | GPS ไม่แม่นก็ยังแสดงระยะเหมือนแม่น | ส่ง `true` เมื่อ accuracy เกินเกณฑ์ของ `gps.lowAccuracy` (T27 N-09) | gameplay-programmer |
| C-10 | should | `run.summary.timeoutBody`, `run.summary.clockInvalidBody` | `ui/run-summary.ts:106-109` | timeout เห็นแค่ "ออกนอกเขตนานเกิน" ไม่รู้ว่าของอยู่ครบ · clock_invalid ไม่มีบรรทัดบอกให้ตั้งเวลาเครื่อง | แสดง body ใต้หัวข้อ (ไม่ใช่ canon จึงไม่ขัด flow F05 B6) · `dungeonClosedBody` ไม่จำเป็นเพราะหัวข้อบอกของครบแล้ว · `emergency_close` ใช้ `dungeon.emergencyClosedTitle` เป็น body เมื่อเปิดใช้ใน Phase 5 | gameplay-programmer · uiux-designer ยืนยันใน flow F04 หัวข้อ 7 |
| C-11 | minor | `dungeon.closingSoonTag` | `ui/dungeon-confirm.ts:70` (ซ่อนเสมอ) | ไม่เห็นป้ายปิดในอีกกี่นาทีบน popup (R28) | เติม `{timeLeft}` จาก `selectOpening` เมื่อถึง `closingSoonNotice_s` | gameplay-programmer |
| C-12 | minor | `run.stateResumed` | `f04-app.ts` (ไม่มีจุดเรียก) | กลับเข้าเขตแล้วไม่มี toast ยืนยัน | แสดง toast สั้นเมื่อ Grace/Suspended → Active | gameplay-programmer |

ข้อมูลประกอบ (ไม่นับในคำตัดสิน F04):
- `f04-app.ts:189-195` ไม่อ่าน `checkin_rejected` จาก `confirm` จึงยังไม่มีทางแสดง `dungeon.checkinNoClass` / `dungeon.checkinNoHp` · เป็นงาน P2-F06-T09/T10 ตาม P2-H20 ตาราง 1.3
- แผงใกล้ (A2) แสดงชิประยะ ทิศ และปุ่มนำทาง แต่ไม่มีชื่อ dungeon ปลายทางหรือ `map.nearestRiftFound` · ส่ง uiux-designer ตรวจกับ flow F04 A2 ว่าตั้งใจหรือไม่

## 6. ข้อสังเกต F05 (ไม่ blocking)

| # | ระดับ | key | ไฟล์ | ข้อสังเกต | owner |
| --- | --- | --- | --- | --- | --- |
| F05-N1 | minor | `run.tickGrantedFirst` + `run.continueCta` | `ui/tick-toast.ts:106-108` | ต่อสอง key ด้วยช่องว่างในบรรทัดเดียว ตรงตาม context ของทั้งสอง key · 41 ช่อง บนจอแคบตัดเป็น 2 บรรทัด ยังอยู่ในกฎข้อ 2 · ถ้า uiux อยากคุมจุดตัดบรรทัด ให้แยกเป็นสอง element | uiux-designer |

สิ่งที่ตรวจแล้วผ่าน: `run.tickGranted`, `run.tickDenied` (toast จาง ไม่ใช่ error), `run.levelUp` ทั้งใน toast และหน้าสรุป, `run.summaryExpGained`, `run.summaryTickCount` (ตัวเลขจาก engine), `run.summaryTickPartialNote` เฉพาะเมื่อมี partial tick, `run.summaryRewardLost` เฉพาะ death, `run.summaryRewardEmpty`, `run.death` + `run.summary.diedBody`, `run.autoRetreat` เติม `{autoRetreatPct}` จาก config, ชื่อไอเทมผ่าน `copy/names.ts#getItemName`, `run.summaryContinue` เพดาน buttonFullWidth 16

## 7. ส่งต่อ

| to | need | blocking |
| --- | --- | --- |
| gameplay-programmer | แก้ C-01 ถึง C-05, C-06 (ส่วน map), C-07 ถึง C-12 · แล้วขอ gate รอบ 2 เฉพาะ F04 | yes (F04) |
| narrative-designer | เพิ่ม key ของ C-06 ใน `copy.th.json` (ต้องมี writes) | yes (F04) |
| uiux-designer | ยืนยัน C-10 ใน flow F04 หัวข้อ 7 · ตรวจแผง A2 ที่ไม่มีชื่อปลายทาง · F05-N1 | no |
| qa-tester | e2e ตรวจว่าไม่มีข้อความรูป `dungeon.` หรือ `{` บนจอ S-02, S-03, แผงนำทาง (จับ C-01, C-02, C-05, C-06 ได้ในทีเดียว) | no |

---

## รอบ 2 (หลัง P2-X36 copy + P2-X37 client) · 2026-09-27

ขอบเขต: ตรวจเฉพาะ C-01 ถึง C-12, F05-N1 และแผง A2 เทียบกับการแก้ของ gameplay-programmer ใน P2-X37 · อ่านโค้ดตาม file:line ที่ orchestrator ส่งมา (ทุก path อยู่ใต้ `apps/client/src/`) · lint ยังไม่ได้รันในรอบนี้ (orchestrator รันเมื่อขอ)

### คำตัดสินรอบ 2

| Feature | verdict | เหตุผลสั้น |
| --- | --- | --- |
| F04 | **PASS** | C-01 ถึง C-12 แก้ครบตามที่ขอ ไม่เหลือทางที่ key ดิบ, `{ตัวแปร}` ดิบ, เลข epoch หรือหน่วย `m` จะขึ้นจอ · เหลือข้อสังเกต minor 2 ข้อ ไม่ blocking |
| F05 | **PASS** | F05-N1 แก้แล้ว ไม่มีอะไรเปลี่ยนจากรอบ 1 ที่ทำให้ผลกลับ |

### ผลรายข้อ

| # | ผล | หลักฐาน |
| --- | --- | --- |
| C-01 | แก้แล้ว | `copy/names.ts:49` `getDungeonFullName` = `{nameReal} — {nameSuffix}` ตาม `names.th.json#_meta.displayFormat` · `:59` `getDungeonShortName` = `nameReal` · `ui/dungeon-confirm.ts:100` หัว popup ใช้ชื่อเต็ม (ไม่เกิน 34 ช่อง `zoneName`) · `:117` การ์ดซ้อนและ `dungeons/artifact.ts:86` ป้ายแผนที่ใช้ชื่อสั้น (ไม่เกิน 17 ช่อง `zoneRealName`) |
| C-02 | แก้แล้ว | `ui/nav-panel.ts:242` อ่าน `dungeon.<id>.search` ผ่าน `getItemName` (field `name` ของ `names.th.json`) ทั้งค่าที่แสดงและค่าที่คัดลอก · artifact มี `search_name_key` 13 แห่ง ทุก key มีใน `names.th.json` |
| C-03 | แก้แล้ว | `dungeons/distance.ts:43` `formatDistanceText`: ต่ำกว่า 1,000 ม. ใช้ `unit.m` ตั้งแต่ 1,000 ม. ใช้ `unit.km` ทศนิยม 1 ตำแหน่ง ตาม `copy-rules.json#formats` · ยังปัดขึ้นผ่าน `displayDistance` (R34) · `f04-app.ts:531` ไม่มี literal `'m'` แล้ว |
| C-04 | แก้แล้ว | `dungeons/open-time.ts:55` `formatOpenTime` ใช้ `unit.today` / `unit.tomorrow` / `unit.onWeekday` + HH:mm ที่ offset กรุงเทพฯ จาก config · ตรวจวันในสัปดาห์: 1970-01-01 เป็นวันพฤหัส = index 4 ของตาราง อาทิตย์ก่อน ถูก · ยาวสุด `วันพฤหัสบดี 05:00` 14 ช่อง = `openTime.maxCells` · `f04-app.ts:411,541` ส่ง `undefined` เมื่อไม่มีเวลาเปิด → `dungeon.closedEmergencyBody` |
| C-05 | แก้แล้ว (ดู R2-N1) | `f04-app.ts:476-483` เติม `{timeLeft}` ของ `run.stateSuspended` จาก `selectRunView().suspendedRemaining_s` · `:488-493` `run.tickTimer` ได้ค่าเฉพาะ Active, Grace/Suspended ใช้ `run.tickPausedLabel` |
| C-06 | แก้แล้ว | `ui/checkin-status.ts:59-67` `readyIn_s === null` → `dungeon.checkinNotEnoughTraceWaiting` (P2-X36 ไม่มีตัวแปร 19 ช่อง) · มีตัวเลขแล้วกลับไปใช้ `dungeon.checkinNotEnoughTrace` พร้อม mm:ss |
| C-07 | แก้แล้ว | `ui/nav-panel.ts:89` ใช้ `nav.copyPlaceLink` · `nav.fallbackOtherApp` ไม่ถูกใช้ ตรงกับ context ที่สงวนไว้ให้ลิงก์ iOS |
| C-08 | แก้แล้ว | `ui/nav-panel.ts:113-114` `nav.fallbackBody` ใต้หัวแผงทุกสถานะ · `:166-170` clipboard ใช้ไม่ได้ แสดง `nav.fallbackManualCopy` คู่ช่อง input |
| C-09 | แก้แล้ว | `f04-app.ts:527-529` `approximate` = accuracy ล่าสุดเกิน `homeState.maxAccuracy_m` (เกณฑ์เดียวกับ `gps.lowAccuracy`) → `nav.distanceApprox` |
| C-10 | แก้แล้ว | `ui/run-state-view.ts:56` body เฉพาะ `timeout` → `run.summary.timeoutBody`, `clock_invalid` → `run.summary.clockInvalidBody` (uiux P2-H27) · `ui/run-summary.ts:111` แสดงใต้หัวข้อ ไม่ใช่ canon · `dungeon_closed` ไม่มี body เพราะหัวข้อบอกของครบแล้ว · `emergency_close` ไม่มี body จนถึง Phase 5 ยอมรับ |
| C-11 | แก้แล้ว | `f04-app.ts:450-463` `{timeLeft}` จาก `selectOpening().closingSoon` + `changesAt_ms` จัดรูปด้วย `unit.minutes` ขั้นต่ำ 1 นาที · `ui/dungeon-confirm.ts:148-156` แสดง `dungeon.closingSoonTag` โดยไม่ขึ้นกับผล check-in ไม่บล็อกการเข้า |
| C-12 | แก้แล้ว | `f04-app.ts:585-590` เรียกเมื่อ `run_state_changed` cause `returned` → `active` เท่านั้น · `ui/tick-toast.ts:218` toast จาง `run.stateResumed` ไม่มีเสียง |
| F05-N1 | แก้แล้ว | `ui/tick-toast.ts:126-149` (บรรทัดจริง 137-145) `run.tickGrantedFirst` และ `run.continueCta` เป็นสอง element แยกบรรทัด ไม่ต่อด้วยช่องว่างแล้ว |
| A2 | แก้แล้ว | `ui/nav-panel.ts:54-56` บรรทัดชื่อปลายทาง ซ่อนเป็นค่าเริ่ม · `:251-252` ใช้ชื่อสั้น และซ่อนทั้งบรรทัดเมื่อหาชื่อไม่เจอ (`copy/names.ts:66` `isResolvedDungeonName`) ไม่แสดง key ดิบ |

key ใหม่ที่โค้ดเรียกในรอบนี้มีใน `copy.th.json` ครบ: `nav.copyPlaceLink`, `nav.fallbackBody`, `nav.fallbackManualCopy`, `dungeon.closingSoonTag`, `dungeon.checkinNotEnoughTraceWaiting`, `unit.m`, `unit.km`, `unit.today`, `unit.tomorrow`, `unit.onWeekday`, `weekday.*`, `run.summary.timeoutBody`, `run.summary.clockInvalidBody`, `run.stateResumed` · กฎ copy 6 ข้อไม่เปลี่ยนจากรอบ 1 เพราะไม่มีข้อความใหม่นอกจาก P2-X36 ซึ่งผ่านแล้ว

### ข้อสังเกตรอบ 2 (minor ไม่ blocking)

| # | key | ไฟล์ | ข้อสังเกต | owner |
| --- | --- | --- | --- | --- |
| R2-N1 | `_variables.timeLeft` (`run.tickTimer`, `run.stateSuspended`) | `f04-app.ts:481,491` (`formatCountdown` mm:ss) · `config/content/copy.th.json#_variables.timeLeft` | client แสดงเป็น mm:ss (5 ช่อง ไม่เกิน `maxCells` 8) ขณะที่ registry เขียนว่า format ด้วย `unit.*` ตัวอย่าง `12 นาที` · สำหรับตัวนับถอยหลังที่เดินทุกวินาที mm:ss อ่านง่ายกว่า จึงยอมรับฝั่ง client และแก้ note ของ registry ให้ตรง (countdown สด = mm:ss · ข้อความเตือนครั้งเดียว เช่น `run.closingSoonWarning` = `unit.minutes`) | narrative-designer (ต้องมี writes `copy.th.json`) |
| R2-N2 | ไม่มี | `copy/names.ts:1-9` | comment หัวไฟล์ยังบอกว่า `dungeon.*` อ่านผ่าน `copy/load.ts` ซึ่งไม่จริงแล้วหลัง C-01 · เป็น comment เท่านั้น ไม่กระทบจอ | gameplay-programmer |

### ส่งต่อรอบ 2

| to | need | blocking |
| --- | --- | --- |
| orchestrator | รัน copy lint + config lint ยืนยันรอบ 2 · ให้ writes `copy.th.json` กับ narrative-designer ถ้าจะปิด R2-N1 | no |
| gameplay-programmer | R2-N2 แก้ comment เมื่อแตะไฟล์ครั้งถัดไป | no |
| qa-tester | e2e เดิมจากรอบ 1 (ไม่มี `dungeon.` หรือ `{` บนจอ) ยังควรทำ เพื่อจับการถอยหลังในอนาคต | no |
