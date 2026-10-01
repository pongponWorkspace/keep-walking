# P2-X67 — F10 QA follow-up (copy gate F-01b/N-04, art gate V-F10-04 condition 3, product gate F10-PM-01/F10-PM-02, TC-MAP-05 stabilization)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-X67 (fix) · เจ้าของ: qa-tester |
| วันที่ | 2026-10-01 |
| อินพุต | `design/reviews/F10-copy-gate.md` (F-01b, N-04), `art/reviews/F10-visual-gate.md` (V-F10-04, หัวข้อ 7), `product/reviews/F10-product-gate.md` (F10-PM-01, F10-PM-02), `qa/tests/e2e/visual/capture-f10-screens.ts`, `qa/tests/e2e/f02-map-network-resilience.spec.ts` (TC-MAP-05), `qa/reports/F10/e2e-coverage.md` |
| เขียนที่ | `qa/tests/e2e/`, `qa/reports/F10/` เท่านั้น — ไม่แตะ `apps/client` |

## 0. สรุปหนึ่งย่อหน้า

ปิดทั้ง 5 ข้อ acceptance: (1) e2e ใหม่เดินทุกจอ F10 ตรวจ key ดิบด้วย pattern ที่ brief กำหนด — ผ่าน 38/38
เคส (19 จอ × 2 project) (2) e2e ใหม่ยืนยัน `nav_tab_opened`/`coming_soon_viewed`/`story_skipped` ถูก
บันทึกจริงใน `kw.p2.telemetry` — ผ่าน 10/10 เคส (3) `capture-f10-screens.ts`: เพิ่มการรอ
`img.complete && naturalWidth > 0` ก่อนถ่ายทุกภาพที่มีรูปที่มองเห็น, เพิ่ม story slide 2/3,
`capture-results.json` ผ่าน prettier แล้ว — ถ่ายภาพชุดใหม่ 40/40 สำเร็จ, ตรวจภาพ 5 ภาพที่ขอด้วยตาจริง
ครบ ไม่มี key ดิบ ภาพขึ้นจริง (4) TC-MAP-05: เปลี่ยนจาก `page.waitForTimeout(1_000)` เป็น
`expect.poll` รอสถานะ (ตำแหน่งขยับจริง) แทนเวลา — รัน `--repeat-each=5 --retries=0` ทั้งสอง project
ผ่าน 20/20 (5) รัน regression เต็มชุดและ `pnpm lint` — ดูหัวข้อ 5

## 1. Acceptance 1 — e2e ใหม่: ไม่มี copy key ดิบบนจอ (F-01b)

ไฟล์ใหม่: `qa/tests/e2e/f10-no-raw-copy-key.spec.ts`

- Pattern ตรงตาม brief เป๊ะ: `^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$` ตรวจกับทุก token ที่แยกได้จาก
  `document.body.innerText` (รองรับ/มองเห็นจริงเท่านั้น — `innerText` ไม่รวม element ที่ `hidden`/
  `display:none`) ด้วย `/[A-Za-z0-9.]+/g` (ไม่ใช่แค่ whitespace split เพราะข้อความไทยไม่มีช่องว่าง
  ระหว่างคำ คำดิบอาจติดกับคำไทยโดยไม่มีช่องว่างได้ เหมือนที่เกิดจริงกับ `story.headerLabel`)
- ไม่ใช้ namespace list แบบ `f04-f05-no-raw-copy-key.spec.ts` (ซึ่งต้องมี key ในไฟล์ copy ก่อนถึงจะ
  รู้จัก namespace) — ใช้ pattern ตรงตัวจาก brief แทน เพื่อให้จับ key จาก namespace ที่ไม่เคยถูก
  ประกาศเลยได้ด้วย (ตรงจุดบกพร่องเดิมของ F-01: `story.headerLabel` ไม่เคยอยู่ใน `copy.th.json`)
- เดินผ่านจอจริงทั้งหมดที่ brief ระบุ โดย import ฟังก์ชัน `reach*` จาก `capture-f10-screens.ts`
  (export เพิ่มในงานนี้) แทนการเขียน navigation ซ้ำสอง copy: start, login, login-email, register,
  forgot, create-character (fresh + name-invalid), story slide 1-5, map+nav, coming-soon ×3,
  settings, popup logout (outside-run + in-run)
- ผลรัน: `CI=1 npx playwright test qa/tests/e2e/f10-no-raw-copy-key.spec.ts --project=android-chrome
  --project=ios-safari --retries=0` → **38 passed** (19 จอ × 2 project), 0 failed

## 2. Acceptance 2 — telemetry จริงใน storage (F10-PM-01, F10-PM-02)

ไฟล์ใหม่: `qa/tests/e2e/f10-telemetry-nav-story.spec.ts`

- อ่าน `kw.p2.telemetry` ตรงจาก `localStorage` แล้ว `JSON.parse` เป็น array ของ `TelemetryRecord`
  โดยตรง (ไม่ใช่ envelope `{schemaVersion, savedAt_ms, state}` แบบคีย์อื่นๆ ของแอพนี้ — ยืนยันจาก
  `telemetry/sink.ts#serialize` ที่ `return JSON.stringify(records)` ตรงๆ และจากการอ่านค่าจริงใน
  หน้าเว็บ ไม่ใช่สมมติจาก `readEnvelope` ที่ใช้ตอน restore)
- **F10-PM-01**: แตะ Inventory แล้วแตะ upgrade/shop/party ต่อกันทันที (ไม่มี return-to-map คั่น —
  ตรง "เร็วๆ นี้" ของ brief) ตรวจว่า `nav_tab_opened` บันทึกครบ 4 ครั้งตามลำดับ `[inventory, upgrade,
  shop, party]` และ `coming_soon_viewed` บันทึก 3 ครั้งตรง `[upgrade, shop, party]` พร้อมตรวจว่าคู่
  `nav_tab_opened`/`coming_soon_viewed` ของแต่ละแท็บมี `client_ts_ms` เดียวกัน (ยิงพร้อมกันจริง)
- **F10-PM-02**: สร้างตัวละครใหม่ เดินไปแต่ละ slide 1-4 แล้วกด "ข้าม" จาก slide นั้นโดยตรง (ไม่ผ่าน
  slide อื่นก่อน) ตรวจว่า `story_skipped` บันทึก 1 รายการ พร้อม `slide_index_at_skip` ตรงกับ slide
  ที่กดจริง ทำครบทั้ง 4 slide (4 เคสแยก)
- ผลรัน: **10 passed** (5 เคส × 2 project), 0 failed
- finding ระหว่างทำ (ไม่ blocking, ไม่ต้องแก้): `kw.p2.telemetry` เขียนเป็น plain JSON array
  (`telemetry/sink.ts#serialize` คืน `JSON.stringify(records)` ตรงๆ) ไม่ได้ห่อ envelope
  `{schemaVersion, savedAt_ms, state}` เหมือนคีย์ `kw.p2.*` ตัวอื่นของแอพนี้ทั้งหมด แม้ฝั่งอ่าน
  (`readEnvelope(deps.storage, TELEMETRY_STORAGE_KEY, 1, isTelemetryRecordArray)` ใน `f04-app.ts`)
  คาดหวัง envelope — ตรวจแล้วว่า**ไม่กระทบผู้เล่นจริง**: ภายในเซสชันเดียว (ไม่ reload) ทุกอย่างทำงาน
  ถูกต้อง (ยืนยันจากทั้งสองไฟล์ e2e ใหม่นี้) และการ reload ไม่ได้ลบข้อมูลเดิมบนดิสก์ (ยืนยันด้วยการ
  ทดลองจริง — localStorage ไม่ถูกเขียนทับจนกว่าจะมี event ใหม่) แต่ "restore" ในหน่วยความจำหลัง
  reload อาจไม่ทำงานจริง (เพราะ `readEnvelope` จะตีความ array ตรงๆ ว่า `corrupt` — ไม่ใช่
  `isPlainObject`) ซึ่งหากเป็นจริงจะทำให้ event เก่าก่อน reload หายไปจาก buffer ในหน่วยความจำ แล้วถูก
  เขียนทับหายจาก storage เมื่อมี event ใหม่เกิดหลัง reload ครั้งถัดไป — ไม่อยู่ใน scope ของงานนี้
  (ไม่แตะ `apps/client`) จึงส่งเป็น handoff ไม่ blocking ให้ gameplay-programmer ตรวจแยก (ดูหัวข้อ
  handoffs ท้ายรายงาน)

## 3. Acceptance 3 — `capture-f10-screens.ts` (art gate V-F10-04 เงื่อนไข 3)

- เพิ่ม `waitForImagesLoaded(page)`: รอทุก `<img>` ที่ "มองเห็นจริง" (`getBoundingClientRect` กว้าง/
  สูง > 0) ให้ `img.complete && img.naturalWidth > 0` ก่อนถ่ายทุกภาพ (ไม่ใช่เฉพาะจอที่มี
  `.story-image` ตามที่ V-F10-04 ระบุ — ทุกจอเรียกเหมือนกัน จอที่ไม่มีรูปก็ผ่านทันทีเพราะไม่มีอะไร
  ต้องรอ) timeout 10s ต่อจอแล้วปล่อยผ่าน (ถ่ายภาพอยู่ดี ภาพที่ยังพังจริงคือหลักฐานให้ gate เห็น ไม่ใช่
  เหตุให้สคริปต์ค้าง)
- เพิ่มจอ **slide 2, 3**: `09b-story-slide-2`, `09c-story-slide-3` (คงเลข `10`/`11` ของ slide 4/5 ไว้
  เดิม ไม่ renumber เพราะ `F10-copy-gate.md`/`F10-visual-gate.md` อ้างเลขภาพเดิมอยู่แล้ว)
- `capture-results.json` เขียนผ่าน `prettier.format(..., {filepath: RESULTS_PATH})` โดยอ่าน
  `.prettierrc.json` ของ repo ก่อนเขียนไฟล์ — ยืนยันด้วย `npx prettier --check
  qa/reports/F10/screens/capture-results.json` → "All matched files use Prettier code style!"
- export ฟังก์ชัน `reach*`/`newCtxPage` ทั้งหมดเพื่อให้ `f10-no-raw-copy-key.spec.ts` (ข้อ 1) ใช้ซ้ำ
  แทนเขียน navigation สองชุดที่พลาดพร้อมกันได้ — เพิ่ม guard `isMainModule` (เทียบ
  `import.meta.url`/`process.argv[1]`) ป้องกัน `run()` ของสคริปต์ทำงานซ้ำตอนถูก `import` (ตรวจพบและ
  แก้ระหว่างทำงานนี้เอง — ไม่กระทบ acceptance ใด แต่ถ้าไม่ได้ guard สคริปต์ capture ทั้งชุดจะวิ่งซ้ำ
  ทุกครั้งที่ import ไปใช้ ชนกับ browser ของ test เอง)
- รัน `E2E_BASE_URL=http://localhost:4173 pnpm exec tsx qa/tests/e2e/visual/capture-f10-screens.ts`
  เต็มชุด → **40/40 screen x width captures ok** (18 จอเดิม + 2 จอใหม่ slide 2/3, × 2 ความกว้าง)
- ตรวจด้วยตา (Read) ภาพที่ brief ขอที่ 360px ครบ 5 ภาพ: `01-start`, `05-forgot`,
  `06-create-character-fresh`, `09-story-slide-1`, `12-map-nav` — ภาพขึ้นจริงทุกภาพ ไม่มี key ดิบ
  บนจอใดเลย (ตรงกับผล F-01/F-02/F-04/F-05/V-F10-03 ที่ gameplay-programmer แก้ใน X64/X65/X68 แล้ว)

## 4. Acceptance 4 — TC-MAP-05 เสถียร (ios-safari)

- สาเหตุ: `page.waitForTimeout(1_000)` ("ให้เวลา pan ที่ยังไม่เสร็จไปชนเครือข่ายที่ออฟไลน์แล้วพัง")
  เป็นเวลาคงที่ตามนาฬิกาจริง ไม่ใช่สถานะ — ภายใต้ CPU contention หนัก (หลาย worker, สอง browser
  engine พร้อมกัน, สภาพเดียวกับที่ `e2e-coverage.md` เคยบันทึกว่าทำให้
  `f10-render-persistence.spec.ts` ต้องขยับ timeout ไป 90s) เวลาจริง 1 วินาทีไม่รับประกันว่า mock
  location replay (`speed=60`) ขยับตำแหน่งไปจริงทันเวลา ทำให้ assertion ถัดไป
  (`positionWhileOffline?.timestamp > positionBeforeOffline?.timestamp`) หลุดเป็นครั้งคราว
- แก้: แทนที่ด้วย `expect.poll(() => position.timestamp, {timeout: 15_000}).toBeGreaterThan(...)`
  — รอสถานะที่ assertion ท้ายจริงๆ ต้องการ ไม่ใช่เวลาคงที่ ไม่ได้ลดสิ่งที่ตรวจ: canvas ยังต้อง visible,
  `pageErrors` ยังต้องว่าง, position ยังต้อง advance เหมือนเดิมทุกจุด เพียงแต่รอบนี้การรอ "นานพอให้
  pan ที่ offline ไปชนแล้วพัง" ผูกกับสถานะจริงแทนการเดาเวลา
- รัน `--project=ios-safari --project=android-chrome --repeat-each=5 --retries=0` เฉพาะไฟล์นี้ →
  **20 passed** (TC-MAP-05 + TC-MAP-08, 5 รอบ × 2 project), 0 failed
- รันซ้ำพร้อม regression เต็มชุด (ทั้งสอง project, `--repeat-each=3`, ~654 เคสพร้อมกัน — เครียดกว่า
  เงื่อนไข acceptance จริงมาก): TC-MAP-05/TC-MAP-08 ผ่านทุกครั้งไม่มีสักครั้งที่ตก แม้มี 10 เคส **อื่น**
  (ไม่ใช่ไฟล์ที่งานนี้แตะ — `location-mock.spec.ts`, `full-run.spec.ts`,
  `f10-render-persistence.spec.ts`, `f06-toast-two-lines-real-run.spec.ts`,
  `f04-origin-allowlist.spec.ts`, `f06-confirm-hp-notice.spec.ts`,
  `f04-f05-no-raw-copy-key.spec.ts`, `f04-checkin-confirm-flow.spec.ts`,
  `f04-closed-dungeon.spec.ts`) ตกภายใต้ความเครียดระดับนั้น — ยืนยันว่าเป็น CPU contention ของ
  sandbox นี้เอง ไม่ใช่ของจริง: รันแยกไฟล์เดิมอีกครั้ง (`full-run.spec.ts` +
  `location-mock.spec.ts` เดี่ยวๆ) ผ่านทั้ง 8/8 ทันที ไม่ใช่งานของ task นี้ (ไม่แตะไฟล์เหล่านั้น) จึง
  ไม่แก้ แต่บันทึกไว้เป็น finding ไม่ blocking

## 5. Acceptance 5 — regression เต็มชุด + lint

- `CI=1 E2E_BASE_URL=http://localhost:4173 npx playwright test --retries=0 --reporter=list`
  (ทั้งสอง project, `apps/*/e2e/` + `qa/tests/e2e/`, รวมไฟล์ใหม่ 2 ไฟล์ของงานนี้): **218 passed, 0
  failed, 0 flaky** (3.2 นาที) — log เต็มที่ `qa/reports/F10/e2e-full-run-x67.log`
  (เทียบกับ baseline ก่อนงานนี้ที่ `qa/reports/F10/e2e-full-run.log` ซึ่งมี 170 — ส่วนต่าง 48 คือ
  38 เคสของ `f10-no-raw-copy-key.spec.ts` + 10 เคสของ `f10-telemetry-nav-story.spec.ts`)
- `pnpm lint` (root, eslint --max-warnings=0 && prettier --check . && lint:copy): **exit 0** — log
  เต็มที่ `/tmp/lint-final.log` ไม่ได้ก็อปมาเก็บเพราะไม่มี warning/error ใหม่จากงานนี้ (WARN 11 รายการ
  ของ `lint:copy` เป็นของเดิมก่อนงานนี้ทั้งหมด ไม่ใช่ WARN ใหม่ — `S7` เป็นตัวแปรของฟีเจอร์ที่ยังไม่
  build, `S12`/`S4` เป็นของ copy ที่มีอยู่แล้ว ไม่เกี่ยวกับไฟล์ที่งานนี้แตะ)
- เพิ่มดิวตี้: รัน `pnpm exec tsx qa/tests/e2e/visual/capture-f10-screens.ts` เต็มชุดอีกครั้งหลังแก้
  ทุกไฟล์เสร็จ (ไม่ใช่แค่ตอน dev) เพื่อยืนยันภาพชุดสุดท้ายที่เก็บใน
  `qa/reports/F10/screens/` ตรงกับโค้ดที่ผ่านทุก gate ข้างต้นจริง — 40/40 ok (หัวข้อ 3)

## 6. Handoffs

| ถึง | เรื่อง | blocking |
| --- | --- | --- |
| gameplay-programmer | `kw.p2.telemetry` เขียนเป็น flat JSON array (`telemetry/sink.ts#serialize`) แต่จุด restore ตอนบูต (`f04-app.ts` เรียก `readEnvelope(..., TELEMETRY_STORAGE_KEY, 1, isTelemetryRecordArray)`) คาดหวัง envelope `{schemaVersion, savedAt_ms, state}` — รูปแบบไม่ตรงกัน ทำให้ `readEnvelope` น่าจะตีความว่า `corrupt` ทุกครั้งและไม่ restore อะไรเข้าหน่วยความจำหลัง reload จริง (ยืนยันแค่ว่า on-disk ไม่ถูกลบทันทีที่ reload — ยังไม่ได้ยืนยันว่า in-memory restore ทำงานหรือไม่ เพราะต้องอ่านโค้ด/debug ฝั่ง `apps/client` ซึ่งอยู่นอก scope งานนี้) ขอให้ตรวจว่า events ก่อน reload หายจาก export/`kw.p2.telemetry` จริงหรือไม่หลัง reload แล้วมี event ใหม่เกิดขึ้น | no |

## 7. ไฟล์ที่แก้/เพิ่มของงานนี้

- ใหม่: `qa/tests/e2e/f10-no-raw-copy-key.spec.ts`, `qa/tests/e2e/f10-telemetry-nav-story.spec.ts`
- แก้: `qa/tests/e2e/visual/capture-f10-screens.ts` (export `reach*`/`newCtxPage`, guard
  `isMainModule`, `waitForImagesLoaded`, slide 2/3, prettier บน `capture-results.json`),
  `qa/tests/e2e/f02-map-network-resilience.spec.ts` (TC-MAP-05: poll แทน fixed sleep)
- regenerate: `qa/reports/F10/screens/*.png` (40 ไฟล์ รวม slide 2/3 ใหม่), `capture-results.json`
- ใหม่: `qa/reports/F10/x67-qa-fixes.md` (ไฟล์นี้), `qa/reports/F10/e2e-full-run-x67.log`
