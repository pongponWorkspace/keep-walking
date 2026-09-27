# F04-F06 visual gate — screenshot index (V-36, P2-H41)

Task: P2-H41 · ผู้ถ่าย: qa-tester · วันที่: 2026-09-28 · Playwright, Android Chrome UA, 390×844 CSS
px, provider Mock (trace สังเคราะห์เท่านั้น ไม่มีตำแหน่งคนจริง) · build: HEAD `b1dee22` บวก working
tree ปัจจุบัน (X50 อยู่ระหว่างทำ ยังไม่ commit — ดูหัวข้อ 4) · rebuild + restart preview server ก่อน
ถ่ายจริงตามคำขอของ orchestrator (`pnpm --filter @keep-walking/client build && ... preview`)

สคริปต์: `qa/tests/e2e/visual/capture-f04-f06-screens.ts` (26 จอ + bonus 1 จอ) และ
`qa/tests/e2e/visual/capture-s5-reshoot.ts` (S5 ซ้ำ 8 ภาพ) · ตัวช่วยขาวดำ:
`qa/tests/e2e/visual/image-utils.ts` (canvas ในหน้าเปล่า ไม่เพิ่ม dependency) · ผลลัพธ์เชิงตัวเลข:
`capture-results.json` ในโฟลเดอร์นี้

รัน (ต้องมี build + preview server ที่ port 4173 อยู่ก่อน):
```
pnpm --filter @keep-walking/client build
pnpm --filter @keep-walking/client preview &
pnpm exec tsx qa/tests/e2e/visual/capture-f04-f06-screens.ts
pnpm exec tsx qa/tests/e2e/visual/capture-s5-reshoot.ts
```

## 1. จอที่ถ่ายได้ (24/26 ตามชื่อไฟล์ในหัวข้อ 5.1 + bonus 1)

ทุกแถวมีคู่ `<id>.png` (สี) และ `<id>-gray.png` (ขาวดำ) · คอลัมน์ "ทางไปจอ" คือวิธีเข้าถึงจริงผ่าน UI
สาธารณะเท่านั้น (query param / hash route / แตะจริง) ไม่มีการ poke DOM/engine ตรง

| ไฟล์ | จอ | ทางไปจอ |
| --- | --- | --- |
| `01-map-far` | Home panel, far | `?loc=mock&trace=qa-home-states-walk-01&speed=60&e2eSkipOnboarding=1`, รอจน title เป็น "รอยแยกใกล้สุดอยู่ไกล" |
| `02-map-near-nav` | Nav panel, กำลังเข้าใกล้ (state near, popup ยังไม่เปิด) | `trace=e2e-full-run-01&speed=1`, จับตอน `.nav-panel` มี chip ระยะก่อน confirm popup เปิด |
| `03-nav-fallback` | popup fallback ของปุ่มนำทาง | ต่อจาก 02 แล้วแตะ `.nav-fallback-open-link` |
| `04-confirm-b1-wait` | confirm popup, B1 รอ (GPS ไม่แม่นพอ) | `trace=qa-e2e-leelawadee-poor-accuracy-01&speed=5` |
| `05-confirm-b1-ready` | confirm popup, B1 พร้อม (ปุ่ม "เข้า" เปิด) | `trace=e2e-full-run-01&speed=60` ก่อนแตะเข้า |
| `06-confirm-b2-overlap-selected` | **ไม่สามารถถ่ายได้** | ดูหัวข้อ 2 |
| `07-confirm-closed` | confirm popup, ปิดทำการ | `trace=qa-e2e-khlong-ong-ang-closed-01`, `start=2026-09-28T12:00` (วันจันทร์ ปิด จ.-พฤ.) |
| `08-run-active` | Run HUD, Active | `trace=e2e-full-run-01&speed=60` แตะเข้าแล้ว |
| `09-run-grace` | Run HUD, Grace | `trace=qa-e2e-leelawadee-checkin-01&speed=10` แตะเข้าแล้วเดินออกนอกรอยแยก |
| `10-toast-tick-loot` | Toast tick ผ่าน (ของตก) | `trace=e2e-full-run-01&speed=60`, รอ toast ที่ไม่มี `.faded` |
| `11-toast-tick-denied` | **ไม่สามารถถ่ายได้** | ดูหัวข้อ 2 |
| `12-hp-low` | HP ต่ำ (แถบแดง + toast เตือน) ก่อน auto-retreat | `trace=e2e-f06-koa-run-01&e2eClassId=tanker&seed=5&speed=60`, จับ hp-percent ระหว่าง 1-30% |
| `13-pocket` | จอพกกระเป๋า | `trace=e2e-full-run-01`, บังคับ `navigator.wakeLock` ให้มีจริง (path A) |
| `14-speedlock` | Speed-lock overlay | `trace=synthetic-driving-40kmh-01&speed=10` (global anti-cheat ไม่ต้องมี dungeon) |
| `15-summary-normal` | Run summary, ออกเอง | `trace=e2e-full-run-01`, แตะออก + ยืนยัน |
| `16-summary-death` | Run summary, ตาย | `trace=e2e-f06-koa-run-01&e2eClassId=ranged&seed=7`, ปิด auto-retreat ผ่าน `#/settings/walking-safety` จริงก่อนเข้า |
| `17-summary-autoretreat` | Run summary, auto-retreat | เหมือน 16 แต่ auto-retreat ค่าเริ่มต้น (เปิด) |
| `18-intro` | Onboarding, intro | `trace=e2e-onboarding-01` ไม่มี `e2eSkipOnboarding` |
| `19-age-gate` | Onboarding, age gate | ต่อจาก 18 แตะจอ intro |
| `20-consent` | Onboarding, consent ตำแหน่ง | ต่อจาก 19 กรอกปีเกิด 1990 |
| `21-class-select` | Onboarding, เลือกพลัง | ต่อจาก 20 กด "ยอมรับ" + ผ่านจอ priming แล้ว |
| `22-settings-walking-safety` | Settings > การเดินและความปลอดภัย | hash `#/settings/walking-safety` ตรง |
| `23-privacy` | Settings > privacy | hash `#/settings/privacy`, consent ตั้ง `granted` ล่วงหน้า (เหมือนผู้เล่นที่เคยยอมรับแล้ว) |
| `24-inventory` | Inventory (มียาลุกจากพื้น) | hash `#/inventory`, seed session fixture ของ P2-F06-T08 (`e2e-f06-revive-precondition.session.json`) |
| `25-home-out-of-area` | Home panel, out_of_area | `trace=qa-home-states-walk-01&speed=1`, จับช่วง leg 1 (นอก playarea-mask จริง) |
| `26-home-unknown` | Home panel, unknown | onboarding จริง (ไม่ skip) แล้วกด "ปฏิเสธ" ที่จอ consent |
| `bonus-settings-menu` | Settings menu (จอกลาง ไม่อยู่ใน 26 จอเดิม) | hash `#/settings` — ดูหัวข้อ 4 |

## 2. จอที่ถ่ายไม่ได้ (2 จอ) และเหตุผล

**`06-confirm-b2-overlap-selected`** — ไม่มี dungeon ที่ publish แล้วสองแห่งใน
`data/dungeons/dungeons.json` ที่ polygon ซ้อนกันจริงในข้อมูลชุดปัจจุบัน ตรวจด้วย point-in-polygon
grid (201×201 จุดในกรอบ bbox ที่ซ้อนกัน ระยะห่างจุด ~0.3×0.8 ม.) บนคู่ที่ bbox ซ้อนกันที่สุด
(`pahurat-market` กับ `khlong-ong-ang`) ไม่พบจุดร่วมแม้แต่จุดเดียว (สคริปต์ตรวจอยู่ใน git history ของ
งานนี้ ไม่ใช่ไฟล์ที่ commit เพราะเป็นเครื่องมือครั้งเดียว) · งานนี้ (`writes`) ไม่รวม
`data/dungeons/` หรือ `data/gps-traces/` และ client ไม่มี test hook ที่ยัด candidate ที่สองปลอมเข้า
confirm popup จริงแบบที่สคริปต์ถ่ายภาพแผนที่ (`qa/reports/F02/map-style/capture-screenshots.spec.ts`)
ยัด sample GeoJSON ลง map layer ได้ — เพราะ candidates ของ confirm popup มาจากตำแหน่งจริงเทียบกับ
dungeon config ที่ build เข้า client ไม่ใช่ source ของแผนที่ที่ตั้งค่าได้จาก e2e · **สิ่งที่ต้องขอ:**
ถ้าต้องการภาพนี้จริง ต้องเป็น handoff ไปหา location-engineer/level-designer ขอ fixture คู่ dungeon ที่
polygon ซ้อนกันจริง (หรือ dev-only test hook ใหม่ในฝั่ง client ซึ่งต้องผ่าน gameplay-programmer/tech-lead)

**`11-toast-tick-denied`** — trace จริงที่เข้า dungeon ที่ publish แล้วมีอยู่ 3 ไฟล์
(`e2e-full-run-01`, `e2e-onboarding-01`, `e2e-f06-koa-run-01`) ลองรันทั้งสามผ่าน client จริงแล้ว: สอง
ไฟล์แรกได้ tick ผ่านพอดี 1 ครั้งแล้ว run จบก่อนหน้าต่างที่สองจะครบ (`rewardTick.rewardTickInterval_s`
= 300 วิ) ส่วนไฟล์ที่สาม (koa-run) จบด้วยตายหรือ auto-retreat ภายใน ~200 วิ ก่อนหน้าต่างแรกจะครบด้วยซ้ำ
จึงไม่มี tick ใดถูกประเมินเลยไม่ว่าจะผ่านหรือไม่ผ่าน · trace อื่นที่ออกแบบมาให้ล้มเกณฑ์การเดิน
(`qa-gate-still-01`, `qa-gate-boundary-01`, `qa-gate-normalwalk-gap-01` ฯลฯ) ล้วนเดินอยู่ในสี่เหลี่ยม
ทดสอบระดับ engine (`TEST_RECT`, พิกัดแถว 100.567, 13.73) ที่ไม่ตรงกับ dungeon จริงที่ publish แล้วแห่ง
ใดเลย จึงไม่มีทางเข้าถึง confirm popup/run screen จริงได้เลย (ใช้ได้เฉพาะการ replay ระดับ engine ใน
`qa/tests/F05/*.test.ts`) · **สิ่งที่ต้องขอ:** trace request ไปหา location-engineer — ต้องการ run ที่
active อยู่ใน dungeon จริงที่เปิดอยู่ และเดินไม่ถึง 50 ม./5 นาที (หรือหยุดนิ่ง) ตลอดหน้าต่าง reward
เต็มหนึ่งหน้าต่าง เพื่อให้เห็น toast `.faded` (deny) จริงในบริบทของ run

## 3. ข้อสังเกต (ไม่ใช่ finding ของ gate นี้ แต่ควรตรวจต่อ)

- **`12-hp-low`:** toast เตือน HP ต่ำ (`run.hpLow`, `.toast.danger`) ในภาพที่ถ่ายได้ปรากฏชิดขอบขวา
  ของจอและถูกตัดข้อความ ทั้งที่ CSS ของ `.toast` (`app.css` บรรทัด ~456-465) กำหนด
  `left: 50%; transform: translateX(-50%); max-width: calc(100vw - 32px)` ซึ่งควรกึ่งกลางและไม่ล้น
  จอ · เป็นไปได้ว่าภาพที่จับได้คือเฟรมที่ถูกแช่ระหว่างเปลี่ยนหน้าจอ (`f04-app.ts`'s
  `exitAnimationInFlight` แช่ HUD ไว้ระหว่าง HP hard-cut/grayscale ก่อน summary ขึ้น) ไม่ใช่ชั้น
  layout สุดท้ายจริง เพราะ`12-hp-low` จับตอน hp-percent เพิ่งลดฮวบจาก 100% เหลือ 7% ในเฟรมเดียว
  (damage model แบบตีทีเดียวหนัก ไม่มีเฟรมกลาง) พอดีกับตอนที่ run กำลังจะจบ · ไม่ฟันธงว่าเป็นบั๊ก ใน
  รอบนี้ แต่ส่งต่อให้ gameplay-programmer/qa ดูอีกรอบด้วยการจับภาพตอน HP ต่ำแต่ run ยังไม่จบ (ไม่ใช่
  เฟรมสุดท้ายก่อน auto-retreat) ก่อนสรุปว่าเป็น finding จริง
- แผนที่พื้นหลังของทุกจอในเซ็ตนี้เป็น fallback "ไม่มี tile" (พื้นดำจาก layer `background`/
  `kw-zone-black`) โดยตั้งใจ — ทุกจอใช้ `e2eTilesUrl`/`e2eGlyphsUrl`/`e2eSpriteUrl` ชี้ไปพาธที่ไม่มี
  จริงบนเครื่องเดียวกัน (ธรรมเนียมเดียวกับ `apps/client/e2e/f06-hp.spec.ts`/`map-shell.spec.ts`) เพื่อ
  ไม่ให้มีการดึง tile จริงออกนอกเครื่องเลย (TL-S11) เพราะ gate นี้ตรวจ UI chrome (V-30 ถึง V-34) ไม่ใช่
  ความถูกต้องของ basemap (นั่นคือชุด S1-S6/S5 ในหัวข้อ 5 ของไฟล์นี้) · ชั้นของเกมเอง (รอยแยก จุดตัวเอง
  ป้ายชื่อ) ยังวาดขึ้นตามปกติเพราะมาจาก GeoJSON ของฝั่งเกม ไม่ใช่ tile

## 4. หมายเหตุกลางงาน (จาก orchestrator, P2-H41)

ระหว่างงานนี้ orchestrator แจ้งว่า X50 (agent อื่น กำลังทำ ยังไม่ commit ตอนถ่ายภาพชุดนี้) เพิ่มแถวใหม่
ใน settings menu: `.settings-menu-export` (`apps/client/src/ui/settings-menu.ts`) และเตือนว่า copy
key ของมันอาจยังรอจาก narrative-designer (comment ในโค้ด ณ ตอนเขียนบอกว่า `settings.exportLink` "does
not exist in copy.th.json yet") · **ตรวจจริงแล้วพบว่าคำมีอยู่แล้วในตอนถ่าย:**
`config/content/copy.th.json` (ใน working tree เดียวกัน ยังไม่ commit) มี key
`settings.exportLink` = "ส่งออกบันทึกการเล่น" ครบแล้ว และภาพ `bonus-settings-menu.png` ก็แสดงข้อความ
นี้จริง ไม่ใช่ key ดิบหรือ placeholder — comment ในโค้ดตอนนี้เก่ากว่าไฟล์ copy ที่มันอ้างถึง ส่งต่อให้
gameplay-programmer แก้ comment ให้ตรง (ไม่ใช่ finding ของ gate นี้ เพราะข้อความที่ผู้เล่นเห็นถูกต้องอยู่
แล้ว) · จอนี้ไม่ใช่ 1 ใน 26 ไฟล์ที่ระบุใน 5.1 ของ visual gate เดิม แต่ถ่ายเพิ่มตามคำขอกลางงาน · ถ่ายจาก
build ที่ rebuild ใหม่ (`pnpm --filter @keep-walking/client build`) และ restart preview server ที่
port 4173 ก่อนเริ่มถ่ายจริงทั้งชุด (ของเดิมที่ตายไปเพราะ session ก่อนหน้าถูกฆ่า) — ภาพทั้งหมดในโฟลเดอร์
นี้จึงมาจาก build เดียวกัน สดใหม่ ไม่ใช่ของค้างจาก session ก่อน

## 5. S5 ถ่ายซ้ำที่ตำแหน่งใหม่ (F-AD-5)

fixture ใหม่ของ location-engineer (`tools/tiles/fixtures/screens/s5-chaophraya/`, bbox
`[100.5035, 13.696, 100.5245, 13.74]`, minzoom 13, maxzoom 14 — ตรงกับ `manifest.json` ที่ commit
แล้ว ไม่ต้องขอ build ใหม่) · ถ่ายที่ **z14 ตำแหน่งใหม่ 100.514, 13.718** ครบ 2 engine (android-chrome
= Chromium/Pixel 7 UA, ios-safari = WebKit/iPhone 14 UA) × 2 format (pmtiles, tilejson) × 2 viewport
(390×844, 360×800) = 8 ภาพ · glyph/sprite จาก `tools/tiles/fixtures/lumpini` ตาม
`manifest.json#glyphs_and_sprites_from` · ทุก request ไปที่ origin ปลอม (`qa-h41-s5-fixture.invalid`)
แล้ว intercept ด้วย Playwright route ให้ตอบจากไฟล์ในเครื่องเท่านั้น (ไม่มี network จริงออกนอกเครื่อง,
TL-S11) — ไม่ได้รัน `serve.py` ที่ 127.0.0.1:8765 ตามที่ระบุใน task brief จริง เพราะวิธี intercept นี้
เชื่อถือได้กว่า (ไม่ต้องพึ่ง process แยก, แบบเดียวกับ `map-real-fixture.spec.ts`) และให้ผลเดียวกัน

**ผล: พบป้าย "แม่น้ำเจ้าพระยา" (`queryRenderedFeatures` บน `water_label_point`/`water_label_line`)
ที่ z14 ครบทั้ง 8 ภาพ ไม่ต้องถอยไป z13 เลย** — ดูรายละเอียดที่ `capture-s5-results.json`

| ไฟล์ | engine | format | viewport | zoom ที่ใช้จริง | พบป้ายแม่น้ำ | ไบต์ |
| --- | --- | --- | --- | --- | --- | --- |
| `S5-android-chrome--pmtiles--390x844--z14.jpg` | android-chrome | pmtiles | 390×844 | 14 | ใช่ | 142,002 |
| `S5-android-chrome--pmtiles--360x800--z14.jpg` | android-chrome | pmtiles | 360×800 | 14 | ใช่ | 134,218 |
| `S5-android-chrome--tilejson--390x844--z14.jpg` | android-chrome | tilejson | 390×844 | 14 | ใช่ | 142,002 |
| `S5-android-chrome--tilejson--360x800--z14.jpg` | android-chrome | tilejson | 360×800 | 14 | ใช่ | 134,218 |
| `S5-ios-safari--pmtiles--390x844--z14.jpg` | ios-safari | pmtiles | 390×844 | 14 | ใช่ | 241,837 |
| `S5-ios-safari--pmtiles--360x800--z14.jpg` | ios-safari | pmtiles | 360×800 | 14 | ใช่ | 263,743 |
| `S5-ios-safari--tilejson--390x844--z14.jpg` | ios-safari | tilejson | 390×844 | 14 | ใช่ | 241,837 |
| `S5-ios-safari--tilejson--360x800--z14.jpg` | ios-safari | tilejson | 360×800 | 14 | ใช่ | 263,743 |

ตัวอักษรไทย "แม่น้ำเจ้าพระยา" อ่านออก ไม่ลอย ไม่ซ้อน มี halo ขาว วางแนวตั้งตามทางน้ำ (ตรวจด้วยตาบน
`S5-android-chrome--pmtiles--390x844--z14.jpg` ประกอบ queryRenderedFeatures) · ป้าย pmtiles กับ
tilejson มีขนาดไบต์เท่ากันเป๊ะในแต่ละ engine/viewport เพราะ fixture เดียวกัน render ผลภาพเหมือนกัน
(ต่างกันแค่ path โหลด tile) ไม่ใช่บั๊กของสคริปต์ · จอ `.home-panel` (ไกล/next-open) ถูกซ่อนด้วย CSS ใน
สคริปต์ (ไม่ได้ลบ) เพราะ gate นี้ตรวจเฉพาะ basemap ไม่ใช่ home state

## 6. ขนาดรวมและจำนวนไฟล์

ทั้งโฟลเดอร์ (26 จอ × 2 (สี+ขาวดำ) ที่ถ่ายได้ 24 จอ + bonus 1 จอ × 2 + S5 ซ้ำ 8 ไฟล์ JPEG +
`capture-results.json` + `capture-s5-results.json` = 61 ไฟล์): **6.9 MB รวม** (`du -sh`) · ไฟล์เดี่ยว
ใหญ่สุดคือ S5 ฝั่ง ios-safari ที่ ~264 KB ทุกไฟล์ผ่านเกณฑ์ ≤ 300 KB ของ V-36 · PNG ใช้กับ 26 จอ UI
(ภาพเรียบ สีน้อย บีบอัดได้ดีอยู่แล้วโดย PNG เอง ไม่ต้องแปลงเป็น JPEG) ส่วน S5 (ภาพแผนที่จริงมีรายละเอียด
เยอะ) ใช้ JPEG คุณภาพปรับลดอัตโนมัติจนต่ำกว่า ~150 KB (ธรรมเนียมเดียวกับ
`qa/reports/F02/map-style/capture-screenshots.spec.ts`) · ไม่มี trace ของตำแหน่งคนจริงในภาพใดเลย
(Mock provider, synthetic ทั้งหมด)
