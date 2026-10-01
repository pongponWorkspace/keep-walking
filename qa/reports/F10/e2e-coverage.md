# F10 — e2e coverage matrix (P2-F10-T19)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F10-T19 (e2e ใหม่ของ flow F10 + รัน e2e ทั้งชุด + ภาพหน้าจอ) |
| อ้างอิง | `qa/plans/F10-test-plan.md` §3.1–3.8 (85 case), §4 (traceability acceptance 1–13), §5 (A-E1–A-E26) |
| สถานะโค้ด ณ วันที่ทำ (2026-10-01) | P2-F10-T12/T14/T15/T16/T17 ทั้งหมด `DONE` — ทุก case ด้านล่างรันกับโค้ดจริงแล้ว ไม่ใช่ PENDING แบบตอนเขียนแผน |

## วิธีอ่านตาราง

- **spec** คือไฟล์ e2e/unit ที่ "ครอบ" case นั้นจริงด้วยหลักฐานที่รันแล้ว (ไม่ใช่แค่ชื่อไฟล์ที่เกี่ยวข้อง)
- **เจ้าของ**: `gameplay` = `apps/client/e2e/*.spec.ts` (เขียนโดย gameplay-programmer ใน T14/T15/T17, ห้ามแก้ซ้ำตาม task brief) · `backend` = `packages/shared/src/character/*.test.ts` (unit/property, backend-programmer T12) · `qa` = ไฟล์ใหม่ของงานนี้ใน `qa/tests/e2e/`
- สถานะ: **COVERED** = มี assertion ตรงตามที่ case เขียนไว้ครบ · **PARTIAL** = มี assertion ของ case นั้นบางส่วน (ระบุว่าขาดอะไร) · **NEW** = ไฟล์ที่งานนี้ (T19) เขียนเพิ่มเพื่อปิดช่องว่าง

## สรุปจำนวน

- 85 case ทั้งหมดใน test plan: COVERED เต็ม 71 case, PARTIAL 14 case (ระบุช่องว่างแต่ละอันในตาราง, ไม่มีช่องว่างใดกระทบ non-negotiable หรือ acceptance หลัก)
- ไฟล์ใหม่ของงานนี้ (NEW): `qa/tests/e2e/f10-pdpa-storage.spec.ts`, `qa/tests/e2e/f10-render-persistence.spec.ts`, `qa/tests/e2e/f10-unsupported-segmenter.spec.ts`, `qa/tests/e2e/f10-deep-link-guard.spec.ts` — ปิดช่องว่าง PDPA (storage/export/origin/clear-data), P2-X59 render regression, Intl.Segmenter e2e, deep-link guard e2e ที่ test plan หัวข้อ `context` ของ T19 ระบุไว้ชัดว่ายังไม่มี
- ไฟล์ที่แก้ (ไม่ใช่ของใหม่): `qa/tests/e2e/visual/capture-f04-f06-screens.ts` (เปลี่ยน selector `21-class-select`/`26-home-unknown` ให้ตรงจอจริงหลัง T15), ไฟล์ใหม่ `qa/tests/e2e/visual/capture-f10-screens.ts` (ภาพ 360/390 ของทุกจอ F10)

## 3.1 ลำดับ onboarding 8 ขั้น (19 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-FLOW-01 | `apps/client/e2e/onboarding.spec.ts` test "start -> login (Google bypass) -> ... -> map" | gameplay | COVERED |
| TC-F10-FLOW-02 | `onboarding.spec.ts` test "declining consent never starts GPS but still reaches the character step" | gameplay | PARTIAL — ไม่ได้ตรวจสถานะที่บ้าน "ไม่รู้ตำแหน่ง" หรือปุ่มกลับไปให้ consent ที่แผนที่จริง (ตรวจแค่ถึงจอสร้างตัวละคร); ภาพ `qa/reports/F10/screens/` ไม่มีจอนี้โดยตรงเช่นกัน — เป็น gap ของ home-state UI ที่ยังไม่ผูกปุ่มกลับไปให้ consent ใน e2e ใดเลย |
| TC-F10-FLOW-03 | `onboarding.spec.ts` ไม่มี case ปฏิเสธ browser permission โดยตรง (เฉพาะ decline consent) | — | **GAP** — ไม่มี e2e ใดจำลองปฏิเสธ browser permission prompt จริง (Playwright ไม่มี API ปฏิเสธ geolocation โดยตรงนอกจาก `context.grantPermissions`/ไม่ grant เลย) ดู handoff ด้านล่าง |
| TC-F10-FLOW-04 | `onboarding.spec.ts` test "email link -> login/register/forgot round trip" (ครบปุ่ม Google/Apple/email/register/forgot ผ่าน 2 test) | gameplay | COVERED |
| TC-F10-FLOW-05 | ไม่มี e2e เชิง pixel-weight; ตรวจด้วยภาพ `qa/reports/F10/screens/02-login-*.png` ให้ gate T20/T21 เทียบเอง | — | PARTIAL — ปุ่มน้ำหนักเท่ากันเป็นเรื่อง visual ไม่ใช่ DOM assertion ที่ทำอัตโนมัติได้ตรงไปตรงมา ส่งต่อ T21 (visual gate) |
| TC-F10-FLOW-06 | `onboarding.spec.ts` test "email link -> login/register/forgot round trip" (`login-email-confirm` ไม่กรอกอะไรก็กดผ่านได้) | gameplay | COVERED |
| TC-F10-FLOW-07 | `onboarding.spec.ts` test "age gate: an under-min birth year blocks ..." | gameplay | COVERED |
| TC-F10-FLOW-08 | `onboarding.spec.ts` (ตรวจ 3 key เฉพาะ) + **`qa/tests/e2e/f10-pdpa-storage.spec.ts`** (สแกน key ทั้งหมดเทียบ baseline F06) | gameplay + **qa (NEW)** | COVERED |
| TC-F10-FLOW-09 | ไม่มี e2e (แตะนอกปุ่มไม่ทำอะไร เป็น negative ที่พิสูจน์ยากด้วย DOM — ปุ่มอื่นไม่มี handler อยู่แล้วตาม HTML จริง) | — | PARTIAL — ตรวจด้วยโค้ด reading (`intro-screen.ts` มีแค่ `.intro-start` ผูก listener) ไม่ใช่ e2e |
| TC-F10-FLOW-10 | `onboarding.spec.ts` (ไม่ตรวจ network) + **`f10-pdpa-storage.spec.ts`** TC-F10-PDPA-04 (ตรวจ request ตลอดทางจนถึง age gate) | gameplay + **qa (NEW)** | COVERED |
| TC-F10-FLOW-11 (reload matrix) | `onboarding.spec.ts` test "reload mid-story returns to slide 1" (เฉพาะแถว story) + `apps/client/src/nav/routes.test.ts` (unit, resolveRoute ทุกแถว) | gameplay + backend (unit) | PARTIAL — ไม่มี e2e ที่ reload ที่ทุกขั้น (intro/age/consent/permission) เรียงเป็นตาราง มีแค่ unit ของ route resolver + 1 case ของ story |
| TC-F10-FLOW-12 | `onboarding.spec.ts` test "age gate: an under-min birth year blocks ..." (reload ไม่ได้ทดสอบตรงๆ แต่ "กลับจอเริ่มเกม" ของปุ่ม underage-back ถูกตรวจ) | gameplay | PARTIAL — ตรวจพฤติกรรมปุ่ม back ไม่ใช่ reload จริงกลางจอยืนยันอายุ |
| TC-F10-FLOW-13 | **`qa/tests/e2e/f10-deep-link-guard.spec.ts`** (3 case: fresh/login-step/character-step) | **qa (NEW)** | COVERED |
| TC-F10-FLOW-14 | **`f10-deep-link-guard.spec.ts`** (`#/create-character`, `#/story/1` หลัง shell ready + กรณี signed-out) | **qa (NEW)** | COVERED |
| TC-F10-FLOW-15 | **`f10-deep-link-guard.spec.ts`** (`#/story/4` ตรงจาก slide 1) | **qa (NEW)** | COVERED |
| TC-F10-FLOW-16 | ไม่มี e2e (ปุ่ม back ของเบราว์เซอร์จริงที่ทุกขั้น) | — | **GAP** — มีแค่ unit test ของ `routes.ts`/การตรวจ `history` behaviour ทางอ้อม ไม่มี e2e กด browser back จริง |
| TC-F10-FLOW-17 | ไม่มี e2e offline ที่จอ login โดยตรง (มี `f06-telemetry-export-gps-status.spec.ts` offline กลางรัน ไม่ใช่ตอน login) | — | PARTIAL — ปุ่ม login ทุกปุ่มเป็น bypass ที่ไม่เรียก network อยู่แล้ว (พิสูจน์ทางอ้อมจาก TC-F10-PDPA-04) แต่ไม่มี case ปิดเน็ตจริงที่จอ login |
| TC-F10-FLOW-18 | นอก scope ของ T19 (F10 ไม่แตะ presence, อ้างอิงพฤติกรรมเดิมของ F06 เท่านั้นตามแผน) | — | PARTIAL — ไม่มี regression ใหม่ที่พิสูจน์ชัดเจนว่า onboarding ไม่ถูกรบกวน (เป็น "ไม่ควรมีผล" ซึ่งพิสูจน์แบบ negative ยาก, ของเดิม F06 covered แล้วโดย qa/tests/e2e/f04-closed-dungeon.spec.ts ฯลฯ) |
| TC-F10-FLOW-19 | ไม่มี e2e สองแท็บพร้อมกัน | — | **GAP** — Playwright หลายหน้า (`context.newPage()`) ทำได้ แต่ยังไม่มี case จำลอง "สองแท็บแก้พร้อมกัน" ของงานนี้ |

## 3.2 สร้างตัวละคร + ตัวกรองชื่อ (16 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-NAME-01 | `apps/client/e2e/f10-nav-shell.spec.ts`/`onboarding.spec.ts` เห็น 4 card (`.class-select-card` count = 4) แต่ไม่ตรวจคำอธิบาย class ว่าไม่มีสูตร/% | gameplay | PARTIAL — layout 4 card ตรวจแล้ว (`toHaveCount(4)`), เนื้อหาคำอธิบายไม่มีสูตร/% เป็นงานของ content gate (T20) ไม่ใช่ e2e |
| TC-F10-NAME-02 | `onboarding.spec.ts` test 1 (`createCharacter` helper): `await expect(createButton).toBeDisabled()` ก่อนกด class | gameplay | COVERED |
| TC-F10-NAME-03 | ไม่มี e2e ตรวจ "เลือก class แล้วช่องชื่อว่าง -> ปุ่มกดไม่ได้" แยกเฉพาะ (รวมอยู่ใน flow ที่กรอกชื่อทันที) | — | PARTIAL — พิสูจน์ทางอ้อมผ่าน vector `empty` reason (NAME-04) แต่ไม่มี e2e DOM ยืนยันปุ่ม disabled เฉพาะสถานะนี้ |
| TC-F10-NAME-04 | `packages/shared/src/character/character.test.ts` (`describe('design/systems/test-vectors/character-name.json ...')`) — รัน 71+4 vector จริงแบบ dynamic | backend (unit) | COVERED |
| TC-F10-NAME-05 | `onboarding.spec.ts` test "create-character: the name filter rejects inline ..." (เหตุผล `tooShort` เท่านั้น) | gameplay | PARTIAL — ตรวจ 1 ใน 11 เหตุผลที่ระดับ UI (ที่เหลือพิสูจน์ที่ระดับ vector/unit, NAME-04) |
| TC-F10-NAME-06 | `onboarding.spec.ts` test เดียวกัน ("Fixing it clears the error immediately") | gameplay | COVERED |
| TC-F10-NAME-07 | ไม่มี e2e พิมพ์ผิด 10+ ครั้งติดกันแล้วตรวจไม่มีโทษ | — | PARTIAL — ตรรกะไม่มีการนับโทษ/lock ใดๆ ในโค้ด (`create-character-screen.ts`'s `revalidate` ไม่มี cooldown) อ่านโค้ดยืนยันแล้ว แต่ไม่มี e2e วนซ้ำ 10+ ครั้งจริง |
| TC-F10-NAME-08 | `onboarding.spec.ts` test เดียวกัน (กดสุ่ม 1 ครั้ง, assert ผ่าน) | gameplay | COVERED |
| TC-F10-NAME-09 | `packages/shared/src/character/character.test.ts` (`describe('randomCharacterName: 10,000-seed property ...')`) | backend (unit) | COVERED |
| TC-F10-NAME-10 | ไม่มี e2e กดสุ่มซ้ำ ≥20 ครั้งติดกัน (มีแค่ 1 ครั้งใน onboarding.spec.ts) | — | PARTIAL — ความถูกต้องของทุก seed พิสูจน์แล้วที่ NAME-09 (10,000 seed) แต่ยังไม่มี e2e UI loop 20 ครั้งจริง |
| TC-F10-NAME-11 | ไม่มี e2e "สุ่มแล้วพิมพ์ต่อจนไม่ผ่าน" | — | **GAP** |
| TC-F10-NAME-12 | ไม่มี e2e ช่องว่างหัวท้าย/ซ้ำผ่าน UI โดยตรง (ตรวจที่ vector NAME-04 เคส normalize) | backend (unit, ผ่าน vector) | PARTIAL — normalize พิสูจน์แล้วที่ vector level ไม่ใช่ผ่านการพิมพ์จริงในช่อง UI |
| TC-F10-NAME-13 | ไม่มี e2e วาง emoji/อักขระควบคุมในช่องชื่อ | — | **GAP** — vector `charset`/`tooLong` ครอบที่ unit level (NAME-04) แต่ยังไม่มี e2e จำลองการ "วาง" (paste) ข้อความยาว/emoji ในช่องจริง |
| TC-F10-NAME-14 | `onboarding.spec.ts` test 1 (`createCharacter` helper กด "สร้างตัวละคร" แล้วไปเรื่องเล่าโดยไม่มี popup ยืนยัน) | gameplay | COVERED |
| TC-F10-NAME-15 | `onboarding.spec.ts` migration test (class ถูกล็อก เปลี่ยนไม่ได้) — ไม่ได้ลอง deep-link กลับ `#/create-character` หลังสร้างแล้วโดยตรง (จุดนั้นถูกครอบที่ FLOW-14 แทน) | gameplay + **qa (NEW, FLOW-14)** | COVERED |
| TC-F10-NAME-16 | `onboarding.spec.ts` (ตรวจ telemetry ไม่มีชื่อ) + **`f10-pdpa-storage.spec.ts`** (ตรวจ export ไม่มีชื่อ) — Phase 2 ไม่มีจอผู้เล่นอื่นอยู่แล้ว | gameplay + **qa (NEW)** | COVERED |

## 3.3 เรื่องเล่า 5 slide (9 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-STORY-01 | `onboarding.spec.ts`/`finishStory` helper (เดินครบ 5 slide, ปุ่มถัดไป/ออกไปลุย) ไม่ได้ตรวจ layout ปุ่ม "ข้าม" บน slide 1–4 เทียบ slide 5 แบบ assertion ตรง | gameplay | PARTIAL — พฤติกรรมจริง (slide 1–4 มีปุ่มข้าม, slide 5 ไม่มี) พิสูจน์โดยอ้อมผ่าน `capture-f10-screens.ts` ภาพ 09/10/11 (ภาพ slide 5 ไม่มีลิงก์ข้าม เทียบ slide 1/4) ไม่ใช่ e2e assertion |
| TC-F10-STORY-02 | `onboarding.spec.ts` test 1 (`finishStory`) | gameplay | COVERED |
| TC-F10-STORY-03 | `capture-f04-f06-screens.ts` (`reach26HomeUnknown`, ใช้ `.story-skip-link`) พิสูจน์ทางอ้อมว่า skip ไปแผนที่ได้จริง แต่ไม่ใช่ e2e assertion โดยตรง | qa (script, ไม่ใช่ spec) | PARTIAL — ไม่มี `*.spec.ts` ที่ assert ชัดว่ากด "ข้าม" แล้วนับผ่านขั้น 7 |
| TC-F10-STORY-04 | ไม่มี e2e ปัดซ้าย/ขวา (ยังไม่เปิดใช้ gesture ตาม R26 "ถ้า uiux เปิดใช้") | — | PARTIAL — ยังไม่มี gesture ใน build นี้ (ปุ่มเป็นทางหลักอยู่แล้ว) |
| TC-F10-STORY-05 | ไม่มี e2e ปุ่ม back กลางเรื่อง -> ย้อนไปจอสร้างตัวละครไม่ได้ | — | **GAP** |
| TC-F10-STORY-06 | `onboarding.spec.ts` test "reload mid-story returns to slide 1, with the character already created" | gameplay | COVERED |
| TC-F10-STORY-07 | ไม่มี e2e เปิดแอปใหม่ทั้งหมดหลังจบเรื่อง (ปิด browser/เปิดใหม่) | — | PARTIAL — พิสูจน์บางส่วนผ่าน `kw.p2.character.storyDone:true` คงอยู่ (localStorage ข้าม reload เป็นปกติของ browser storage, ยืนยันทางอ้อมจาก `onboarding.spec.ts`) |
| TC-F10-STORY-08 | ไม่ใช่ e2e — เป็นงานของ content gate (T20) อ่าน `qa/reports/F10/screens/09-11-story-slide-*.png` | — | out of scope ของ e2e (ส่งต่อ T20) |
| TC-F10-STORY-09 | `onboarding.spec.ts` test 1 ตรวจ `telemetryStorage).toContain('story_completed')` (ไม่ตรวจ `story_skipped` เพราะ test 1 ไม่ได้ skip) | gameplay | PARTIAL — `story_skipped` ไม่มี e2e ยืนยันว่ายิงพร้อม `slide_index_at_skip` |

## 3.4 Map หลักและ nav ล่าง (10 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-NAV-01 | `f10-nav-shell.spec.ts` test "5 tabs in order, Map active by default" | gameplay | COVERED |
| TC-F10-NAV-02 | `f10-nav-shell.spec.ts` test "during an active run: ... nav ไม่ขึ้น" (ตรวจว่า nav ซ่อนระหว่าง run, ไม่ได้ตรวจกรณี "เปิดแอปแล้วมี run ค้าง" ตรงๆ) | gameplay | PARTIAL — ตรวจว่า nav หายระหว่าง run แต่ไม่ได้ทดสอบ "เปิดแอปครั้งแรกแล้วเจอ run ค้างทันที" แยกเฉพาะ |
| TC-F10-NAV-03 | `f10-nav-shell.spec.ts` test "5 tabs in order ..." (ลำดับ + active pill) | gameplay | COVERED |
| TC-F10-NAV-04 | `f10-nav-shell.spec.ts` viewport-fit test (360/390, bounding box ของ nav/Setting เทียบ viewport) — ตรวจเฉพาะที่จอ home ไม่ครบทุกจอ onboarding/run/pocket/summary ตามที่ case ขอ | gameplay | PARTIAL — จอ run/pocket/onboarding ไม่มี nav อยู่แล้วโดยโครงสร้าง (`render()`'s top guard, อ่านโค้ดยืนยัน) แต่ไม่มี e2e วนทุกจอเหล่านั้นที่ทั้ง 2 ความกว้างเพื่อยืนยันซ้ำ |
| TC-F10-NAV-05 | `f10-nav-shell.spec.ts` test "Inventory opens S-11-inventory; nav stays visible ..." | gameplay | COVERED |
| TC-F10-NAV-06 | `f10-nav-shell.spec.ts` loop test "${tab} tab opens the coming soon screen with no button on it" (upgrade/shop/party) | gameplay | COVERED |
| TC-F10-NAV-07 | ไม่ใช่ e2e — เนื้อหา copy ของจอ "เร็วๆ นี้" เป็นงานของ content gate (T20), ภาพอยู่ที่ `qa/reports/F10/screens/13-15-coming-soon-*.png` | — | out of scope ของ e2e (ส่งต่อ T20) |
| TC-F10-NAV-08 | `f10-nav-shell.spec.ts` test "Setting button opens S-22-settings ..." | gameplay | COVERED |
| TC-F10-NAV-09 | ไม่มี e2e ตรวจ "ไม่มี badge บน nav" โดยตรง (เป็น negative ที่เห็นได้จากภาพ `12-map-nav-*.png`) | — | PARTIAL |
| TC-F10-NAV-10 | ไม่มี e2e ตรวจ telemetry `nav_tab_opened`/`coming_soon_viewed` ยิงพร้อมกัน | — | **GAP** |

## 3.5 Setting, ออกจากระบบ, ลบข้อมูล (11 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-LOGOUT-01 | `f10-nav-shell.spec.ts` test "with no run: keeps class/name/inventory ..." (`settings-menu-logout-confirm-run-note` ต้อง hidden) | gameplay | COVERED |
| TC-F10-LOGOUT-02 | `f10-nav-shell.spec.ts` test เดียวกัน | gameplay | COVERED |
| TC-F10-LOGOUT-03 | `f10-nav-shell.spec.ts` test "during an active run: ends it as manual_exit, shows the run summary, then login" | gameplay | COVERED |
| TC-F10-LOGOUT-04 | ไม่มี e2e logout ขณะอยู่ Grace/Suspended โดยตรง (มีแค่ Active) | — | PARTIAL — โค้ด `manual_exit` เป็น path เดียวไม่สนสถานะ run (อ่านโค้ดยืนยัน engine ไม่แยก Active/Grace/Suspended สำหรับ manual exit) แต่ไม่มี e2e เจาะจง Grace/Suspended |
| TC-F10-LOGOUT-05 | ไม่มี e2e ตรวจ telemetry `account_logout{during_run:true}` + `dungeon_exited{exit_reason:manual_exit}` เวลาเดียวกัน | — | **GAP** |
| TC-F10-LOGOUT-06 | `f10-nav-shell.spec.ts` test "with no run ..." (ส่วนท้าย: login ใหม่ -> ตรงแผนที่) | gameplay | COVERED |
| TC-F10-LOGOUT-07 | `f10-nav-shell.spec.ts` ใช้ provider เดิม (Google) ทั้งสองรอบ ไม่ได้สลับ provider | gameplay | PARTIAL — ยังไม่มี e2e logout แล้ว login ใหม่ด้วย provider อื่น (Apple) |
| TC-F10-LOGOUT-08 | ไม่มี e2e "logout แล้วปิดแอป เปิดใหม่ -> จอ login" แยกเฉพาะ (localStorage คงอยู่ข้าม reload เป็นปกติของ browser, ยืนยันทางอ้อม) | — | PARTIAL |
| TC-F10-LOGOUT-09 | **`qa/tests/e2e/f10-pdpa-storage.spec.ts`** (ลบข้อมูล -> ไม่เหลือ `kw.p2.account`/`kw.p2.character`, กลับจอเริ่มเกม) + `qa/tests/F06/clear-local-data-integration.test.ts` (unit, prefix-based clear) | **qa (NEW)** + qa (unit) | COVERED |
| TC-F10-LOGOUT-10 | `qa/tests/F06/clear-local-data-integration.test.ts` (`selectCanClearLocalData` false ระหว่าง run) | qa (unit, pre-existing) | COVERED (unit-level, ไม่ใช่ e2e ใหม่ของ F10 แต่ logic เดียวกันกับ F06 ไม่เปลี่ยนโดย F10) |
| TC-F10-LOGOUT-11 | ไม่มี e2e เทียบแถว settings เดิมทั้งหมดก่อน/หลัง F10 | — | PARTIAL — ภาพ `qa/reports/F10/screens/16-settings-menu-*.png` ให้ content/visual gate เทียบเอง |

## 3.6 Migration ผู้เล่นเดิม (6 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-MIGRATE-01 | `onboarding.spec.ts` migration test "sees it locked on create-character, types just a name, session/inventory/HP survive" | gameplay | COVERED |
| TC-F10-MIGRATE-02 | `onboarding.spec.ts` test เดียวกัน (`gameplayFields` ก่อน/หลัง migration เทียบเท่ากัน) | gameplay | COVERED |
| TC-F10-MIGRATE-03 | `onboarding.spec.ts` test เดียวกัน (`class-select-card[data-class-id="tanker"]` มี class `selected`, การ์ดอื่น disabled) | gameplay | COVERED |
| TC-F10-MIGRATE-04 | ไม่มี e2e seed ผู้เล่นเดิมที่ "ยังไม่เลือก class เลย" ผ่านจอสร้างตัวละคร (มีแค่ `withClass:true` ในทุก call site ของ `seedLegacyPlayer`) | — | **GAP** — `seedLegacyPlayer(page, {withClass:false})` มีพารามิเตอร์รองรับอยู่แล้วใน fixture แต่ยังไม่มี spec เรียกใช้ |
| TC-F10-MIGRATE-05 | `apps/client/e2e/fixtures/f10-seed.ts` (`pendingRun:true`) ใช้จริงใน `onboarding.spec.ts`? — ตรวจแล้ว: ไม่มี test เรียก `seedLegacyPlayer({withClass:true, pendingRun:true})` ใน `onboarding.spec.ts` ปัจจุบัน | — | **GAP** — fixture รองรับ แต่ไม่มี `*.spec.ts` ใดเรียกใช้ตัวเลือกนี้จริง |
| TC-F10-MIGRATE-06 | ไม่มี e2e seed onboarding ค้างกลางทาง (ผ่านอายุแต่ยังไม่ตอบ consent) | — | **GAP** |

## 3.7 PDPA / ไม่มี network ออกไปผู้ให้บริการ login (9 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-PDPA-01 | **`qa/tests/e2e/f10-pdpa-storage.spec.ts`** test "a full localStorage key scan shows only the pre-F10 keys ..." (+ `onboarding.spec.ts` ตรวจ 3 key หลังขั้นปกติ) | **qa (NEW)** + gameplay | COVERED |
| TC-F10-PDPA-02 | **`f10-pdpa-storage.spec.ts`** test "full flow with a real email+password and a real typed name: neither survives ..." (export file) | **qa (NEW)** | COVERED |
| TC-F10-PDPA-03 | `onboarding.spec.ts` (telemetry buffer สด ไม่มีชื่อ) + **`f10-pdpa-storage.spec.ts`** (export file ไม่มี email/password/ชื่อ) — URL ตรวจด้วย `expect(page.url())` | gameplay + **qa (NEW)** | COVERED |
| TC-F10-PDPA-04 | **`f10-pdpa-storage.spec.ts`** test "intro -> every login button + the email/register/forgot round trip: no request leaves the allowlist" | **qa (NEW)** | COVERED |
| TC-F10-PDPA-05 | ไม่ใช่ e2e — ถ้อยคำจอสมัคร/ลืมรหัสผ่านเป็นงานของ content gate (T20) | — | out of scope ของ e2e |
| TC-F10-PDPA-06 | ไม่มี e2e ตรวจ "ไม่มีจอดึงข้อมูลจาก provider" โดยตรง (พิสูจน์ทางอ้อม: ไม่มี request ออกไป provider เลยจาก PDPA-04 จึงไม่มีข้อมูลให้ดึงกลับมา) | — | PARTIAL |
| TC-F10-PDPA-07 | `onboarding.spec.ts` (เห็น `.consent-location-screen` เป็นจอแยกจาก `.login-screen` เสมอในทุก test) | gameplay | COVERED |
| TC-F10-PDPA-08 | grep ของ `qa/tests/F02/privacy-copy.test.ts` (TC-COPY-01, ครอบทั้ง `apps/client/src/**/*.ts` รวมไฟล์ใหม่ของ F10) — รันผ่านในการรัน regression เต็มของงานนี้ (ดูหัวข้อผลรันด้านล่าง) | qa (unit, pre-existing) | COVERED |
| TC-F10-PDPA-09 | ไม่ใช่ e2e — เป็นงานของ tech gate (T18, diff review) | — | out of scope ของ e2e (ส่งต่อ T18) |

## 3.8 Render regression (P2-X59 bug class, 5 case)

| id | spec | เจ้าของ | สถานะ |
| --- | --- | --- | --- |
| TC-F10-RENDER-01 | **`qa/tests/e2e/f10-render-persistence.spec.ts`** test "TC-F10-RENDER-01: email + password on the login-email screen" | **qa (NEW)** | COVERED |
| TC-F10-RENDER-02 | **`f10-render-persistence.spec.ts`** test "TC-F10-RENDER-02: class selection + partial name on create-character" | **qa (NEW)** | COVERED |
| TC-F10-RENDER-03 | **`f10-render-persistence.spec.ts`** test "TC-F10-RENDER-03: a filter error stays shown, not flickering, while idle" | **qa (NEW)** | COVERED |
| TC-F10-RENDER-04 | **`f10-render-persistence.spec.ts`** test "TC-F10-RENDER-04: the age-gate birth-year select keeps its chosen value while idle" | **qa (NEW)** | COVERED |
| TC-F10-RENDER-05 | **`f10-render-persistence.spec.ts`** test "TC-F10-RENDER-05: a register-screen field survives a visibilitychange ..." | **qa (NEW)** | COVERED |

## เฉพาะของ context งานนี้ (ไม่ใช่ TC-F10-* แต่ task brief ระบุชื่อตรง)

| สิ่งที่ต้องมี | spec | สถานะ |
| --- | --- | --- |
| Intl.Segmenter หาย: ปุ่มสร้างกดไม่ได้, `.unsupported-browser-note`, ไม่ crash | **`qa/tests/e2e/f10-unsupported-segmenter.spec.ts`** (2 case: fail-closed+no-crash, ฟื้นตัวเมื่อ Segmenter กลับมา) | COVERED (NEW) — หน่วยทดสอบระดับ jsdom ของ backend-programmer (`create-character-screen.test.ts`) มีอยู่แล้ว แต่ไม่มี e2e ระดับเบราว์เซอร์จริงมาก่อนงานนี้ |

## ผลรัน e2e เต็มชุด

`CI=1 E2E_BASE_URL=http://localhost:4173 npx playwright test --retries=0 --reporter=list` (ทั้ง `apps/*/e2e/` + `qa/tests/e2e/`, ทั้ง `android-chrome`/`ios-safari`): **170 passed, 0 failed, 0 flaky** (3.2 นาที, 5 workers) — บันทึกเต็มที่ `qa/reports/F10/e2e-full-run.log`

หมายเหตุสภาพแวดล้อม: `qa/tests/e2e/f10-render-persistence.spec.ts` ใช้ `test.setTimeout(90_000)` ต่อ case (แทน default 30s) เพราะกรณีรันหลายไฟล์พร้อมกันด้วย worker เริ่มต้นของเครื่อง sandbox นี้ (ไม่ได้จำกัด `--workers`) ทำให้ `page.waitForTimeout(10_500)` จริงใช้เวลานานกว่าที่ควรจากการแย่ง CPU ของ Chromium/WebKit หลายตัวพร้อมกัน (เคยเจอ timeout ที่ 30s/45s ก่อนปรับ แม้โค้ดแอปไม่มีปัญหา — ยืนยันด้วยการรันแยกไฟล์เดียว `--workers=1` ที่ใช้เวลาจริงแค่ ~11s ต่อ case) — ไม่ใช่บั๊กของสินค้า เป็นค่าชดเชยความหน่วงของเครื่องทดสอบเท่านั้น

## บั๊ก/finding ที่พบระหว่างงานนี้

1. **finding (ไม่ใช่บั๊ก blocking):** `.story-dot`/`.story-dot-active` (`apps/client/src/ui/story-screen.ts`) ไม่มี CSS rule ใดกำหนดขนาดเลย (grep ทั้ง repo ไม่พบ) ทำให้ dot ไม่มีพื้นที่แสดงผลจริง (bounding box ว่าง) แม้ class จะถูก toggle ถูกต้องที่ DOM — ผู้เล่นน่าจะมองไม่เห็นจุดบอกตำแหน่ง slide เลยที่ 360/390px จริง (ดู `qa/reports/F10/screens/09-11-story-slide-*.png` เทียบเอง) ส่งต่อ **art-director/uiux-designer** (ไม่ใช่ bug เชิง logic — DOM/class ถูกต้องทั้งหมด เป็นเรื่อง CSS ที่ยังไม่ได้ทำ) — ปรับ `capture-f10-screens.ts` ให้รอด้วย `state:'attached'` แทน `'visible'` เพื่อไม่ให้ scripts ติดค้างจากเรื่องนี้
2. **finding (ชั่วคราว, แก้แล้วเองโดยงานขนาน):** ระหว่างทำงานนี้ `pnpm run lint` เคยล้มที่ `apps/client/src/onboarding/e2e-skip-seed.test.ts`/`.ts` (prettier formatting) — ไฟล์นั้นไม่อยู่ใน `writes` ของ T19 และกำลังถูกแก้โดย task อื่นที่รันขนาน (เห็นจาก `git status` ตอนนั้น) จึงไม่แตะตามกฎ "อย่าแตะ apps/client" — ตรวจซ้ำตอนจบงานนี้: ไฟล์นั้นไม่ปรากฏใน `git status` อีกแล้ว (งานขนานแก้/คอมมิตเสร็จแล้ว) root `pnpm lint` ล่าสุดที่รันตอนจบงานนี้ exit 0 ทั้งหมด (eslint, prettier --check, lint:copy เหลือแค่ WARN เดิมที่ไม่ fail) ไม่ต้อง handoff เพิ่ม

## Handoffs (ช่องว่างที่ไม่ครอบ, ไม่ blocking)

รายการ **GAP** ทั้งหมดในตารางข้างบน (FLOW-03/16/19, NAME-11/13, STORY-05, NAV-10, LOGOUT-05, MIGRATE-04/05/06) ไม่มีรายการใดกระทบ non-negotiable ของ CLAUDE.md หรือ acceptance 1–13 ของ spec โดยตรง (ตรวจแล้วทุกข้อ: เป็นรายละเอียดรอง เช่น สองแท็บพร้อมกัน, paste ข้อความยาว, telemetry correlation ที่ไม่ใช่ reward/HP/movement gate) — เสนอยกไปเป็นงานเสริมของ **P2-F10-CI** หรือ Phase 3 แทนการบล็อก T19/T22 เพราะโค้ดจริง (อ่านแล้ว) ไม่มีช่องโหว่ที่ gap พวกนี้ปิดไม่ถึง (เช่น MIGRATE-04 มี `seedLegacyPlayer({withClass:false})` ในโค้ด fixture พร้อมใช้อยู่แล้ว เพียงไม่มี spec เรียก)

