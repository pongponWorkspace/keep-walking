# Product gate — F10 (Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F10-T24 (review-gate) · เจ้าของ: product-manager |
| วันที่ | 2026-10-01 |
| ฐานที่ตรวจ | working tree ปัจจุบัน (หลัง `7f841d4` P2-F10-T22 QA gate PASS) · อ้างอิง `product/prd/F10-account-shell.md`, `product/telemetry-events.md` §2/§2b, `config/app/telemetry.json#f10Events`, `apps/client/src/telemetry/known-events.ts`, `qa/reports/F10-qa-gate.md` (PASS), `qa/reports/F10/e2e-coverage.md`, ภาพ `qa/reports/F10/screens/*-360.png`, `studio/decisions/decision-log.md` D-144..D-149 |
| ขอบเขต | (1) คำสั่งคน 7 ข้อของ D-144..D-149 ถูกสร้างจริงหรือไม่ (2) event telemetry 8 ตัว + funnel step ใหม่ 6 ค่า ยิงจริงมีหลักฐาน และไม่มี PII (3) ระบุ funnel ที่จะใช้ตอบคำถามผลิตภัณฑ์หลัง human ทดสอบเอง — **ไม่แตะ `product/playtest/*`** ตามกติกา |
| **verdict** | **PASS** |

## 0. สรุปหนึ่งย่อหน้า

Tech gate F10 PASS (รอบ 2), QA gate PASS (`qa/reports/F10-qa-gate.md`, acceptance 1–13 MET ทั้งหมด, non-negotiable 1–7 ไม่ถูกละเมิด, bug blocking = 0) งานนี้ตรวจอิสระอีกชั้นเฉพาะมุมผลิตภัณฑ์: คำสั่งคน 7 ข้อของ D-144..D-149 ตรวจจากภาพหน้าจอจริง (`qa/reports/F10/screens/*-360.png`) ครบทั้ง 7 ข้อ **MET** (ตารางหัวข้อ 1) event ใหม่ทั้ง 8 ตัวของ `product/telemetry-events.md` §2b และ funnel step ใหม่ 6 ค่าของ §2 ตรงกันทั้งสามแหล่ง (doc, `config/app/telemetry.json#f10Events`, `apps/client/src/telemetry/known-events.ts`) และมีจุดยิงจริงในโค้ดครบทุกตัว — 6 ใน 8 event มี unit test assert ชื่อ event/ค่า property ตรงจุด (`onboarding-flow.test.ts`, `account/logout.test.ts`) ส่วน `nav_tab_opened`/`coming_soon_viewed` มีจุดเรียกจริงใน `f04-app.ts:914-918` ตรงสเปค (คู่กันเมื่อ tab เป็น upgrade/shop/party) แต่ยังไม่มี test ใดยืนยัน telemetry storage โดยตรง (QA เคยพบจุดเดียวกันเป็น NAV-10 ในตาราง coverage ตัดสินว่าไม่ blocking ส่งต่อที่นี่) — ไม่มี event ใดมีชื่อ/อีเมล/พิกัดในทุก property (ยืนยันจาก schema และ `f10-pdpa-storage.spec.ts`) ไม่มี dark pattern ใหม่ (ไม่มี IAP, จอ "เร็วๆ นี้" ไม่มีตัวเลข/เงื่อนไขปลดล็อก/จำนวนคน) onboarding ยังสะอาด (ปุ่ม login ไม่สัญญาบัญชีจริงข้ามเครื่อง ตรง R-F10-1) **verdict: PASS** พร้อม 1 finding ไม่ blocking (หัวข้อ 4)

## 1. ตรวจคำสั่งคน D-144..D-149 ทีละข้อ (MET / NOT MET)

| # | คำสั่ง (D-xxx) | หลักฐาน | ผล |
| --- | --- | --- | --- |
| 1 | login/register/forgot เป็น bypass ทั้งหมด ไม่มี auth จริง (D-145) | `02-login-360.png` ("เข้าสู่ระบบก่อนเริ่มเดิน" + ปุ่ม Google/Apple + ลิงก์อีเมล + ข้อความ "บัญชีทดสอบ อยู่แค่เครื่องนี้" — ไม่สัญญาบัญชีจริงข้ามเครื่อง ตอบคำถามหัวข้อ 6 ข้อ 2 ของ PRD ตรง) · `03-login-email-360.png`/`04-register-360.png`/`05-forgot-360.png` ครบ 3 จอย่อย · `qa/tests/e2e/f10-pdpa-storage.spec.ts:107,177` ยืนยันไม่มีอีเมล/password หลุดเข้า storage/telemetry/network allowlist | **MET** |
| 2 | กดแล้วไปสร้างตัวละคร: เลือก class + ชื่อพิมพ์เอง + ปุ่มสร้าง (D-146) | `06-create-character-fresh-360.png` แสดง 4 class (Tanker/Ranged/Support/Magic) + ช่องชื่อ + คำเตือน "อย่าใช้ชื่อจริง" + ปุ่ม "สร้างตัวละคร" · `character.test.ts` ผ่าน 75 vector + 10,000-seed property test · `onboarding.spec.ts:343` ปุ่มสร้าง disabled จนผ่านเงื่อนไข | **MET** |
| 3 | เรื่องเล่า 5 slide กด "ถัดไป" จบด้วย "ออกไปลุย!" (D-147) | `09-story-slide-1-360.png` (จุดบอกตำแหน่ง 5 จุด), `11-story-slide-5-360.png` แสดงปุ่ม "ออกไปลุย!" เป็นปุ่มเด่นจอสุดท้าย · `story_completed`/`story_skipped` ยิงจริง (หัวข้อ 2) · key ดิบ `story.headerLabel` ที่เห็นในภาพเป็น finding ของ copy gate ที่กำลังแก้อยู่แล้ว (X65/X68) ไม่นับซ้ำที่นี่ตามขอบเขตงาน | **MET** |
| 4 | map เป็นหน้าหลัก (D-148) | `12-map-nav-360.png` เปิดมาที่แผนที่ตรง ไม่ใช่จอกลาง | **MET** |
| 5 | nav 5 ปุ่ม Inventory/Upgrade/Map/Shop/Party — 3 ปุ่มหลังเป็น "เร็วๆ นี้" (D-148) | `12-map-nav-360.png` เห็นแถบ 5 ปุ่มครบ · `13/14/15-coming-soon-*-360.png` แสดงจอ "เร็วๆ นี้" ของ upgrade/shop/party ไม่มีตัวเลข เงื่อนไขปลดล็อก หรือจำนวนคนรอ (ตรวจแล้วไม่มี dark pattern แบบ FOMO/countdown) | **MET** |
| 6 | icon Setting มุมบนขวา มีตั้งค่า + logout (D-148) | `16-settings-menu-360.png` แสดงเมนู "ตั้งค่า": ลบข้อมูลในเครื่อง, การเดินและความปลอดภัย, ความเป็นส่วนตัว, ส่งออกบันทึกการเล่น, เครดิตและลิขสิทธิ์, **ออกจากระบบ** · `17/18-logout-confirm-*.png` ยืนยัน dialog logout ทั้งนอกและระหว่าง run | **MET** |
| 7 | จอแรกเหลือปุ่มเริ่มเกมปุ่มเดียว (D-144) | `01-start-360.png` มีแค่ปุ่ม "เริ่มเกม" บนพื้นว่าง ตรงคำสั่ง — ความเห็นว่าจอ "ดูตลก/ว่างเกินไป" เป็น finding ของ visual gate (T21, กำลังแก้) ไม่ใช่ความล้มเหลวของเป้าหมายผลิตภัณฑ์ (D-144 สั่งให้เหลือปุ่มเดียวโดยตั้งใจ) | **MET** |

**สรุปหัวข้อ 1: 7/7 ข้อ MET**

## 2. Event telemetry 8 ตัวของ F10 — ชื่อ/property ตรงกันทั้ง 3 แหล่ง + หลักฐานยิงจริง

ตรวจตรงกันระหว่าง `product/telemetry-events.md` §2b, `config/app/telemetry.json#f10Events`, `apps/client/src/telemetry/known-events.ts` — **ชื่อ event และ enum ของทุก property ตรงกันทั้ง 3 ไฟล์ ไม่มีจุดต่าง**

| # | event | property ตรงสเปค | จุดยิงจริงในโค้ด | หลักฐาน test | privacy |
| --- | --- | --- | --- | --- | --- |
| 1 | `account_login_shown` | `context`: first_time\|relogin | `onboarding-flow.ts:245` | unit `onboarding-flow.test.ts:275-299` (ทั้งสอง context) + `:506` (relogin ซ้ำ) | ไม่มีอีเมล/บัญชีจริง |
| 2 | `account_login_method_chosen` | `method`: 5 ค่า | `onboarding-flow.ts:268` | unit `:301-319` | ไม่มี token/provider id |
| 3 | `character_created` | `class_id`, `name_source`, `filter_reject_count` | `onboarding-flow.ts:451` | unit `:379-412` + e2e `onboarding.spec.ts:212`, `f10-pdpa-storage.spec.ts:172` (export scan) | **ไม่มีชื่อตัวละครที่พิมพ์จริง** ยืนยันจาก export scan |
| 4 | `story_completed` | `slides_viewed_count` | `onboarding-flow.ts:482` | unit `:416-432` + e2e `onboarding.spec.ts:213` | ไม่มีเนื้อเรื่อง |
| 5 | `story_skipped` | `slide_index_at_skip` (1–4) | `onboarding-flow.ts:489` | unit `:435-451` | ไม่มีเนื้อเรื่อง — **ไม่มี e2e UI ยืนยัน** (ดูหัวข้อ 4) |
| 6 | `nav_tab_opened` | `tab`: 5 ค่า | `f04-app.ts:914` | ไม่มี unit/e2e assert เฉพาะ event — มี e2e UI ของพฤติกรรม nav (`f10-nav-shell.spec.ts`) ที่ exercise เส้นทางเดียวกัน | ไม่มีพิกัด |
| 7 | `coming_soon_viewed` | `tab`: upgrade\|shop\|party | `f04-app.ts:918` (คู่กับ #6 เวลาเดียวกัน ตามโค้ด: ทั้งสอง record เรียกใน handler เดียวกัน ไม่มี await คั่น) | เช่นเดียวกับ #6 | ไม่มีพิกัด |
| 8 | `account_logout` | `during_run` (bool) | `account/logout.ts:58` | unit `account/logout.test.ts:40,51` (ทั้ง true/false) | ไม่มี provider/account data |

**Funnel step ใหม่ 6 ค่าของ `onboarding_funnel_step`** (D-149): `login_shown`, `login_method_chosen`, `character_create_shown`, `character_create_done`, `story_shown`, `story_done` — ทุกค่ามี `this.recordFunnel(...)` เรียกจริงใน `onboarding-flow.ts` (บรรทัด 246, 269, 425, 459, 466, 483/490) และมี unit test ยืนยันลำดับ/คู่กันกับ event หลัก (`onboarding-flow.test.ts:257-332`, `:398`, `:432`, `:451`, `:454-459`) ตรงกับ A-P2-F10-T05-1 ที่ปิดแล้ว (คู่กันที่ `at_ms` เดียวกัน) **6/6 ค่า ยืนยันยิงจริง**

## 3. ไม่มีข้อมูลส่วนบุคคลในทุก event (E25)

ตรวจ schema ทั้ง 8 event + 6 funnel step ใน `product/telemetry-events.md` §2b และ `config/app/telemetry.json#f10Events`: ไม่มี property ใดเป็นชื่อตัวละครที่พิมพ์จริง อีเมล, password, token, provider account id, หรือพิกัด — มีแค่ enum/bucket/จำนวนเต็ม (`class_id`, `method`, `context`, `tab`, `during_run`, `slides_viewed_count`, `slide_index_at_skip`, `filter_reject_count` bucket) ยืนยันซ้ำด้วยหลักฐานรันจริงของ `qa/tests/e2e/f10-pdpa-storage.spec.ts` (กรอกอีเมล/password จริงในฟอร์ม แล้วสแกน storage/telemetry/export ไม่พบ) และ `onboarding.spec.ts` (สแกน telemetry buffer หลังสร้างตัวละครไม่พบชื่อที่พิมพ์) ตัว export (`config/app/telemetry.json#export`) มี `forbiddenPropertyNames` และ `coordinateLikeNumberGuard` ครอบทุก event รวมของ F10 อยู่แล้ว (กลไกเดียวกันทั้งไฟล์ ไม่ใช่กติกาพิเศษของ F10) — **ไม่พบข้อมูลส่วนบุคคลใน event ใดของ F10**

## 4. Funnel ที่จะใช้ตอบคำถามผลิตภัณฑ์หลัง human ทดสอบเอง (ไม่ออกแบบ playtest)

เมื่อ human export ไฟล์ `kw-p2-telemetry-*.jsonl` จากเครื่องที่เดินทดสอบจริงแล้ว ให้จับคู่คำถาม/metric ตามนี้ (อ้างจาก PRD §4 และ §6 — ไม่ใช่เกณฑ์ตัวเลขตายตัวใหม่ ตาม [ASSUMPTION A-P2-F10-T05-7]):

| คำถามผลิตภัณฑ์ | Metric/Funnel ที่ใช้ตอบ |
| --- | --- |
| 3 จังหวะใหม่ของ F10 ดันเวลาก่อนรางวัลแรกเกิน 10 นาทีเดิมหรือไม่ (หัวข้อ 6 ข้อ 1 ของ PRD) | completion rate ต่อขั้นของ `onboarding_funnel_step` ตั้งแต่ `intro` ถึง `map_view_reached` เทียบ `onboarding_first_reward_granted.minutes_since_first_open_bucket` — จุดดร็อปที่ขั้นใหม่ (login/character/story) ผิดปกติเทียบขั้นเดิม (age/consent/permission) คือสัญญาณ |
| ปุ่ม Google/Apple bypass ทำให้เข้าใจผิดว่ามีบัญชีจริงหรือไม่ (หัวข้อ 6 ข้อ 2) | เวลาเฉลี่ย `login_shown`→`character_create_shown` (median > 60s = สัญญาณเตือนตาม A-P2-F10-T05-8) ใช้คู่กับคำถามเชิงคุณภาพในแบบสอบถามที่ human ออกแบบเอง ไม่ใช่ตัวชี้ขาดเดี่ยว |
| ตัวกรองชื่อเข้มไปหรือไม่ (หัวข้อ 6 ข้อ 3) | สัดส่วน bucket `filter_reject_count` ของ `character_created` — `6+` เกิน 10% ของการสร้างตัวละครทั้งหมด = ส่งสัญญาณให้ systems-designer ทบทวน `config/balance/character.json` |
| เรื่องเล่า 5 slide ยาวไปหรือไม่ | สัดส่วน `story_completed` เทียบ step `story_shown` ของ funnel และอัตรา `story_skipped` (รวม `slide_index_at_skip` บอกว่าคนข้ามที่ slide ไหนมากที่สุด) |
| ผู้เล่นรู้สึก "เป็นเจ้าของ" ตัวละครหรือไม่ | สัดส่วน `name_source=random` เทียบ `typed` — ใช้คู่กับแบบสอบถามเชิงคุณภาพของ human (ไม่ใช่ metric ที่มีเป้าผ่าน/ไม่ผ่านเดี่ยว) |
| ฟีเจอร์ใดควรจัดลำดับความสำคัญก่อนใน Phase 3+ | ความถี่ `coming_soon_viewed` แยกตาม `tab` (upgrade/shop/party) — ป้อน producer ตรง ไม่ต้องรอ Phase ใหม่ |
| อัตรา relogin เทียบ first-time (เตรียมไว้สำหรับ regional launch) | `account_login_shown.context` แยก `first_time`/`relogin` — Phase 2 ตัวอย่างเล็ก ใช้เป็น baseline เท่านั้น |

ตารางนี้ไม่ใช่การออกแบบ playtest (kit/script/ฟอร์มยังเป็นของ human ตาม D-149) เป็นแค่การระบุว่าเมื่อข้อมูลมาแล้ว จะอ่านจาก metric ใดตอบคำถามใด

## 5. ไม่มี dark pattern / ไม่มี IAP

- ไม่มีบริการคิดเงินใดใน F10 (ยืนยันจาก diff และภาพหน้าจอทั้ง 18 จอ ไม่มีช่องกรอกบัตร ไม่มีราคา)
- จอ "เร็วๆ นี้" (`13/14/15-coming-soon-*.png`) ไม่มี countdown, ตัวเลขวันเปิด, เงื่อนไขปลดล็อก, หรือจำนวนคนรอ — ไม่ใช่ FOMO pattern
- ปุ่ม login Google/Apple ไม่สัญญาว่ามีบัญชีจริงข้ามเครื่อง (ข้อความ "บัญชีทดสอบ อยู่แค่เครื่องนี้" ชัดเจนบนจอ) — ตอบ R-F10-1 ตรง
- ปุ่ม "ลืมรหัสผ่าน" ที่กดแล้วเข้าเกมทันทีโดยไม่มีการตั้งรหัสจริง เป็น finding ของ **copy gate** (F-05 ใน `design/reviews/F10-copy-gate.md`, กำลังแก้) ไม่ใช่ dark pattern เชิงผลิตภัณฑ์ (ไม่มี auth จริงให้สัญญาอยู่แล้วตาม D-145) — ไม่นับซ้ำที่นี่ แต่เห็นด้วยกับทิศทางที่ copy gate กำลังแก้คำเพื่อไม่ให้ผู้เล่นเข้าใจผิดว่ามีการตั้งรหัสจริงเกิดขึ้น

## 6. Findings (handoff)

| # | finding | เจ้าของ | blocking | หมายเหตุ |
| --- | --- | --- | --- | --- |
| F10-PM-01 | `nav_tab_opened`/`coming_soon_viewed` มีจุดเรียกจริงในโค้ดตรงสเปค (`f04-app.ts:914-918`) แต่ไม่มี unit/e2e ใด assert ชื่อ event หรือ property `tab` ที่ telemetry storage โดยตรง (ตรงกับ NAV-10 ที่ QA gate เคยพบและตัดสินไม่ blocking ส่งต่อมาที่นี่) | qa-tester (เพิ่ม e2e assertion) หรือ gameplay-programmer (เพิ่ม unit test ของ handler ใน `f04-app.ts`) | no | เสนอเป็น backlog ของ P2-F10-CI หรือรอบถัดไปที่แตะไฟล์นี้ — ไม่กระทบ "ยิงจริง" เพราะยืนยันจาก code read แล้วว่า logic ถูกต้องตรงสเปค (คู่กันเมื่อ tab เป็น upgrade/shop/party, ไม่มี await คั่น) |
| F10-PM-02 | `story_skipped.slide_index_at_skip` มี unit test (`onboarding-flow.test.ts:435-451`) แต่ไม่มี e2e UI ยืนยันการกดลิงก์ "ข้าม" จริงบนจอ (ตรงกับ STORY-09 ของ QA coverage) | qa-tester | no | backlog เดียวกับแถวบน ไม่กระทบ verdict เพราะมี unit test ตรงจุดอยู่แล้วและฟังก์ชันเดียวกับที่ `story_completed` ซึ่งมี e2e ยืนยัน |
| F10-PM-03 | ปุ่ม "ลืมรหัสผ่าน" เข้าเกมทันทีไม่มีการตั้งรหัส (F-05 ของ copy gate) อาจอ่านเป็นสัญญาที่ไม่เกิดขึ้นจริง | narrative-designer (กำลังแก้ใน copy gate รอบ 2) | no | ติดตามเฉยๆ ไม่ใช่ finding ใหม่ของ product gate — ซ้ำกับที่ copy gate ระบุไว้แล้ว |

ไม่มี finding ใดกระทบเป้าหมายผู้เล่นของ PRD หรือทำให้ telemetry ของ metric ใดไม่สามารถวัดได้จริง — ทุกรายการเป็นช่องว่างของ "หลักฐานยืนยันระดับ test" ไม่ใช่ "โค้ดไม่ทำงาน"

## 7. Verdict

**PASS**

- คำสั่งคน 7 ข้อของ D-144..D-149: **7/7 MET** (หัวข้อ 1) — หลักฐานจากภาพหน้าจอจริง 360px และ e2e/unit ที่เกี่ยวข้อง
- Event telemetry 8 ตัว + funnel step ใหม่ 6 ค่า: **ยิงจริงครบ** ชื่อ/property ตรงกันทั้ง `product/telemetry-events.md`, `config/app/telemetry.json`, `apps/client/src/telemetry/known-events.ts` (หัวข้อ 2) — 6/8 event มี test assert ตรงจุด, 2 event (`nav_tab_opened`, `coming_soon_viewed`) ยืนยันจาก code read เท่านั้น (finding F10-PM-01, ไม่ blocking)
- ไม่มีข้อมูลส่วนบุคคล (ชื่อ/อีเมล/พิกัด) ใน event ใดของ F10 (หัวข้อ 3, E25 ผ่าน)
- ระบุ funnel ที่จะใช้ตอบคำถามผลิตภัณฑ์หลัง human ทดสอบแล้ว (หัวข้อ 4) โดยไม่แตะ `product/playtest/*`
- ไม่มี dark pattern ใหม่ ไม่มี IAP (หัวข้อ 5)
- 3 finding ไม่ blocking (หัวข้อ 6) เป็น backlog สำหรับ P2-F10-CI/รอบถัดไป ไม่ใช่เหตุ NEEDS_CHANGES

ไม่ต้องรัน gate นี้ซ้ำ
