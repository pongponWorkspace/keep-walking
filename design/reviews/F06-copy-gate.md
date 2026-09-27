# F06 copy gate (P2-F06-T22)

| หัวข้อ | ค่า |
| --- | --- |
| Task | P2-F06-T22 (review-gate, content gate copy) |
| ผู้ตรวจ | narrative-designer |
| วันที่ | 2026-09-28 |
| รอบ | 1 |
| วิธีตรวจ | อ่านโค้ด UI แทน screenshot (session นี้ไม่มี shell จึงรัน build, e2e, Playwright และ copy lint เองไม่ได้) · เทียบทุก key ที่แต่ละจอเรียกกับ `config/content/copy.th.json` · ตรวจตัวแปรที่โค้ดเติมจริง · ตรวจ CSS ที่มีผลต่อการตัดบรรทัด (`apps/client/src/app.css`) · ตรวจกฎ copy 6 ข้อ · ตรวจถ้อยคำ consent/privacy (PDPA) · grep อักษรไทยในโค้ดและ emoji ใน `config/content/` |
| ไฟล์ที่อ่าน | `apps/client/src/ui/{tick-toast,hp-bar,pocket-screen,age-gate-screen,consent-location-screen,privacy-screen,settings-menu,settings-walking-safety,intro-screen,class-select,run-tutorial-line,home-panel,run-summary}.ts`, `apps/client/src/copy/{position-log-ttl,names}.ts`, `apps/client/src/dungeons/open-time.ts`, `apps/client/src/privacy/withdraw-consent.ts`, `apps/client/src/home/home-state.ts`, `apps/client/src/f04-app.ts` (780-810, 1125-1275), `apps/client/src/app.css`, `packages/shared/src/session/persistence.ts`, `design/ux/flows/F06-hp-damage-onboarding.md` หัวข้อ 4, `docs/tech/F06-hp-damage-onboarding.md` (8.4, 622), e2e 4 ไฟล์ตาม brief (อ่าน assertion เท่านั้น) |

## คำตัดสิน

**verdict: NEEDS_CHANGES**

| ส่วน | ผล | เหตุผลสั้น |
| --- | --- | --- |
| ถ้อยคำ (copy) ทุก key ของ F06 | ผ่าน | สามจังหวะใช้ canon GDD ตรงตัว · กฎ 6 ข้อผ่านทุกข้อ ไม่มีข้อที่ต้องงอ · consent/privacy บอกวัตถุประสงค์ ระยะเก็บ การไม่เปิดเผย และการถอนครบ ไม่ชี้นำ |
| สิ่งที่ผู้เล่นเห็นบนจอจริง | ไม่ผ่าน | ข้อ C6-01 ถึง C6-05: ข้อความ legal หลายบรรทัดถูกรวบเป็นก้อนเดียว · toast `run.hpLow` น่าจะตัดเกิน 2 บรรทัดบนจอแคบ · `run.screenLockNotice` ค้างทับช่อง toast ตลอด · ประโยคค้าง `เปิดอีกที ` ตอนไม่รู้เวลาเปิด · ป้าย Recovering หลังตายไม่ขึ้นเลย |

ถ้อยคำในไฟล์ copy แทบไม่ต้องแก้ ข้อที่ blocking เกือบทั้งหมดอยู่ที่การแสดงผล · ส่วนของ narrative มีแค่ key ใหม่หนึ่งตัว (C6-04)

## 1. key ที่แต่ละจอเรียก เทียบกับ copy.th.json

ทุก key ที่เป็นตัวอักษรตรงในไฟล์ที่ระบุมีใน `copy.th.json` ครบ ไม่มีทางที่ key ดิบจะขึ้นจอจากการเรียกตรง

| จอ | ไฟล์ | key ที่ render | ตัวแปรและที่มา | ผล |
| --- | --- | --- | --- | --- |
| S-00-intro | `ui/intro-screen.ts` | `onboarding.intro`, `onboarding.introTap` | ไม่มี | ผ่าน |
| S-00-age-gate | `ui/age-gate-screen.ts` | `age.gateTitle`, `age.gateBody`, `age.gateOptions`, `age.gateConfirm`, `age.underMinTitle`, `age.underMinBody`, `age.underMinBack` | `{minAge}` จาก `privacy.minAge_yr` (deps) | ผ่าน · ดู C6-09 เรื่องปี ค.ศ. |
| S-00-consent-location | `ui/consent-location-screen.ts` | `consent.headerLabel`, `consent.locationTitle`, `consent.locationBody`, `consent.locationAccept`, `consent.locationDecline` | `{ttlText}` = `unit.hours` 24 (A-P2-X38-3) | ถ้อยคำผ่าน · การตัดบรรทัดไม่ผ่าน (C6-01) |
| S-00-class-select | `ui/class-select.ts` | `onboarding.pickRoleTitle`, `onboarding.pickRoleHint`, `class.<id>` x4, `onboarding.pickRole<Class>` x4 | ไม่มี · alt ของ badge ใช้ `class.<id>` | ผ่าน |
| S-03-run tutorial | `ui/run-tutorial-line.ts` | `dungeon.confirmTutorialLine` | ไม่มี | ผ่าน |
| S-03-run toast | `ui/tick-toast.ts` | `run.tickGrantedFirst` + `run.continueCta` (สอง element), `run.tickGranted`, `run.levelUp`, `run.tickDenied`, `run.hpLow`, `run.autoPotionUsed`, `run.stateResumed` | ไม่มีตัวแปร | ถ้อยคำผ่าน · ความกว้าง toast ไม่ผ่าน (C6-02) |
| S-03-run HP bar | `ui/hp-bar.ts` | `run.autoRetreatOffBadge` · ตัวเลข `NN%` ประกอบในโค้ด (ตัวเลข+สัญลักษณ์ ไม่ใช่ข้อความไทย) | `hpRatio` จาก engine | ผ่าน |
| จอพกกระเป๋า | `ui/pocket-screen.ts` | `run.pocketHp`, `run.pocketNextTick` / `run.tickPausedLabel`, `run.pocketCounting`, `run.pocketWakeHint` (ครั้งแรกต่อเครื่อง), `run.pocketEnterButton`, `run.screenLockNotice` | `{hpPct}` ปัดจาก `hpRatio` · `{timeLeft}` mm:ss หรือ paused | ถ้อยคำผ่าน · `run.pocketWakeHint` ตรงกับ gesture จริง (ปัดขึ้นแล้วค้าง, `shouldTriggerPocketExit`) ปิด A-P1-X20-2 ได้ · `run.screenLockNotice` ไม่ผ่าน (C6-03) |
| S-04-run-summary | `ui/run-summary.ts` | `run.summary.died` → `run.death` → `run.summary.diedBody` · `run.summary.autoRetreated` → `run.autoRetreat` | `{autoRetreatPct}` จาก `dungeons.hpSafety.autoRetreatThreshold_pct` | ผ่าน (ลำดับตรง flow C6 R2-F1) |
| S-06/S-07/S-08 จอที่บ้าน | `ui/home-panel.ts` | `home.farTitle`, `home.farBody`, `home.farNextOpen`, `home.outsideLaunchTitle`, `home.outsideLaunchBody`, `home.outOfAreaTitle`, `home.outOfAreaBodyUnknown`, `home.outOfAreaCta`, `home.unknownTitle`, `home.unknownBody`, `home.unknownCta`, `home.unknownRegisterHint`, `home.farRoleInfoLink`, `inventory.homeShortcut`, `home.recentRunsShortcut`, `home.recentRunsEmpty` | `{distanceText}` ผ่าน `formatDistanceText` · `{openTime}` ผ่าน `formatOpenTime` | ไม่ผ่าน: C6-04 (`openTime` ว่าง), C6-05 (ไม่มีป้าย Recovering) · should: C6-06, C6-07 |
| S-22-settings | `ui/settings-menu.ts` | `settings.title`, `settings.clearLocalDataLink`, `settings.clearLocalDataBlockedNote`, `settings.clearLocalDataConfirmTitle`, `settings.clearLocalDataConfirmBody`, `settings.clearLocalDataConfirmButton`, `settings.clearLocalDataCancelButton`, `settings.walkingSafetyLink`, `settings.privacyLink`, `settings.creditsLink`, `common.close` | ไม่มี | ถ้อยคำผ่าน · body ตัดบรรทัดไม่ผ่าน (C6-01) |
| หน้าย่อยการเดินและความปลอดภัย | `ui/settings-walking-safety.ts` | `settings.autoRetreatToggleLabel`, `settings.autoRetreatToggleHint`, `settings.autoRetreatOffWarningTitle/Body/Confirm/Cancel`, `settings.pocketScreenLabel`, `settings.pocketScreenHint` | `{autoRetreatPct}` จาก config | ผ่าน · ดู C6-08 (toggle ไม่มีชื่อสำหรับ screen reader) |
| S-23-privacy | `ui/privacy-screen.ts` | `privacy.title`, `privacy.locationStatusLabel`, `privacy.locationStatusGranted/NotGranted`, `home.unknownCta`, `privacy.positionLogExplain`, `privacy.withdrawButton`, `privacy.withdrawConfirmTitle`, `privacy.withdrawConfirmBody`, `privacy.withdrawDuringRunNote` (เฉพาะมี run), `privacy.withdrawConfirmButton`, `common.cancel`, `privacy.clearLocalDataShortcut`, `common.close` | `{ttlText}` เหมือน consent | ถ้อยคำผ่าน · การตัดบรรทัดไม่ผ่าน (C6-01) |

ข้อความไทยในโค้ด: grep อักษรไทยใน `apps/client/src` (ยกเว้น test) พบเฉพาะใน comment และ field `_source`/`_note` ของ `config/generated/balance-subset.generated.json` ซึ่งไม่ถูก render · ไม่มี literal ไทยที่ขึ้นจอ

emoji: ไม่พบใน `config/content/` (grep ช่วง U+1F300-1FAFF, U+2600-27BF = 0)

`{placeholder}` ดิบ: ไม่พบทางที่ `{...}` ค้างบนจอ ทุกตัวแปรถูกเติม · แต่พบกรณีเติมเป็นสตริงว่าง (C6-04) ซึ่งผลบนจอเท่ากับตัวแปรหาย

## 2. สามจังหวะ HP ต่ำ / ถอยอัตโนมัติ / ตาย บนจอจริง (E7)

| จังหวะ | ที่ผู้เล่นเห็น | ข้อความ (ช่อง) | ไม่ขอโทษ ไม่ปลอบ ไม่อธิบาย | ผล |
| --- | --- | --- | --- | --- |
| HP ต่ำ | toast `.toast.danger` บน S-03-run + เสียง + สั่น (`f04-app.ts:1218` → `tick-toast.ts:219`) · บนจอพกกระเป๋า ไม่มี toast ตาม P2-H39 เหลือเสียง สั่น และตัวเลข `run.pocketHp` | `run.hpLow` canon ตรงตัว (46) | ผ่าน | ถ้อยคำผ่าน · **ความกว้าง toast ทำให้เกิน 2 บรรทัด (C6-02)** · Path B ถูก `run.screenLockNotice` แย่งช่อง (C6-03) |
| ถอยอัตโนมัติ | effect สั้นบน run bar + เสียง แล้วสลับหน้าสรุป · หัวข้อ `run.summary.autoRetreated` (18) → บรรทัดแรก canon | `run.autoRetreat` เติม `{autoRetreatPct}` จาก config (63, กรณีแย่สุด `25` = 2 หลัก) | ผ่าน | ผ่าน · สัญญาณเดียว ไม่ซ้อน `run.hpLow` (engine ส่งแค่ event เดียวต่อ hit) |
| ตาย | HP fill ตัดเป็น 0 + grayscale + เสียง แล้วหน้าสรุป · `run.summary.died` (6) → canon → `run.summary.diedBody` (19) → EXP/รอบ → `run.summaryRewardLost` | `run.death` canon ตรงตัว (47) | ผ่าน · `diedBody` เป็นข้อเท็จจริง ไม่ใช่คำปลอบ | ผ่านบนหน้าสรุป · **หลังกลับบ้านไม่มีป้าย `home.recoveringLabel` (C6-05)** |

หน้าสรุปแสดงบนพื้นที่ `.run-summary` เต็มจอ ความยาว 63 ช่องของ `run.autoRetreat` ตัดได้ 2 บรรทัดที่จอกว้าง 32 ช่องขึ้นไป ตามข้อยกเว้นใน context ของ key

ข้อสังเกต (ไม่ blocking): canon `run.hpLow` พูดว่า "ซื้อยา" ขณะที่ Phase 2 ยังไม่มีร้าน · เป็นคำ GDD ห้ามแก้ และยาได้จาก drop อยู่แล้ว ผู้เล่นไม่ถูกหลอกให้ไปหาปุ่มที่ไม่มี จึงยอมรับ

## 3. กฎ copy 6 ข้อ

ตรวจทุกข้อความในตาราง 1 ผ่านทุกข้อ ไม่มีข้อที่ต้องงอ

| กฎ | ผล |
| --- | --- |
| 1 คำต้องห้าม | ไม่พบใน `copy.th.json` ทั้งไฟล์ (grep 4 คำ) |
| 2 ไม่เกิน 2 บรรทัด | ถ้อยคำผ่าน (message ยาวสุดของ F06 นอก legal คือ `run.autoRetreat` 63) · legal ใช้ข้อยกเว้นบรรทัดสรุป ≤ 64 ช่อง (`copy-rules.json#limits.legal`, D-023) บรรทัดแรกของ `consent.locationBody` 34, `privacy.positionLogExplain` 34, `privacy.withdrawConfirmBody` 46, `settings.clearLocalDataConfirmBody` 25 · **ข้อยกเว้นนี้ใช้ได้ก็ต่อเมื่อบรรทัดสรุปแยกให้เห็นจริง ซึ่งตอนนี้ไม่แยก (C6-01)** · toast `run.hpLow` ผิดกฎนี้บนจอเพราะ CSS (C6-02) |
| 3 มุกจากสถานการณ์จริง | ผ่าน: "ขามีไว้เดิน", "ไม่ต้องรับบัตรคิว" (ยื่นเรื่องที่สำนักงาน), "แค่อย่ากดล็อกจอ", "เลิกดื้อ" |
| 4 แซะไม่ด่า | ผ่าน · จออายุต่ำกว่าเกณฑ์ไม่แซะ (ผู้เยาว์) · popup ปิดถอยอัตโนมัติบอกผลตรง ไม่ขู่ · `home.unknownBody` ไม่ตื๊อ |
| 5 ภาษาอังกฤษเฉพาะคำที่คนไทยใช้ | ผ่าน: HP, EXP, run, dungeon, Support, Tanker, Ranged, Magic อยู่ใน allowlist · ตัวเลข `NN%` ใน HP bar เป็นสัญลักษณ์ ไม่ใช่คำ |
| 6 ไม่หยาบในข้อความระบบ | ผ่าน |

โลก: ไม่มีข้อความใดวางผู้เล่นเป็นผู้ปกป้องเมือง · `onboarding.intro` "กรุงเทพฯ กำลังมีปัญหา" คือเรื่องเล่าย้อนหลังทั้งหมดตาม GDD ไม่มีเพิ่ม

## 4. consent / privacy / ลบข้อมูล (PDPA)

ส่วนนี้ตรวจความชัดของถ้อยคำเท่านั้น การรับรองทางกฎหมาย (PDPA sign-off) เป็นของ HUMAN ตาม protocol หัวข้อ 5

| เรื่อง | ที่ตรวจ | ผล |
| --- | --- | --- |
| แยก consent ตำแหน่ง | จอเดียวของตัวเอง ก่อนขอ GPS · ปุ่มอนุญาต/ไม่อนุญาตเป็น `.btn` น้ำหนักเท่ากัน (`consent-location-screen.ts:51-59`) | ผ่าน |
| วัตถุประสงค์ ระยะเก็บ การไม่เปิดเผย การถอน | `consent.locationBody` บอกครบสี่เรื่อง บรรทัดแรกเป็นสรุป | ถ้อยคำผ่าน · แสดงผลไม่ผ่าน (C6-01) |
| ระยะเก็บที่อ้าง | `{ttlText}` = "24 ชม." ค่าคงที่ใน `copy/position-log-ttl.ts` ตรง CLAUDE.md ข้อ 7 · Phase 2 ไม่เก็บพิกัดดิบใน `kw.p2.session` เลย (`persistence.ts` audit) และถอนแล้ว purge ทันที · คำว่า "ไม่เกิน 24 ชม." และ "ลบเองภายใน 24 ชม." จึงเป็นจริง (ระมัดระวังเกินจริง ไม่ใช่สัญญาเกินจริง) | ผ่าน · A-P2-X38-3 (ที่มาของเลข) เป็นของ tech-lead · A-P1-F03-T05-5 ยังรอ tech-lead + HUMAN สำหรับ Phase ที่มี server |
| ปฏิเสธแล้วยังเล่นต่อได้ | ไม่อนุญาต → age gate → แผนที่สถานะไม่รู้ตำแหน่ง · `home.unknownBody` บอกผลตรง ไม่ตื๊อ · ไม่เด้งถามซ้ำเอง | ผ่าน |
| ถอนความยินยอม | ปุ่มไม่ถูกบล็อกระหว่าง run · popup บอกผลทันทีและการเข้า dungeon · `privacy.withdrawDuringRunNote` ขึ้นเฉพาะมี run และบอกว่าของอยู่ครบ (ตรงกับผล `manual_exit`) | ถ้อยคำผ่าน · body แสดงผลไม่ผ่าน (C6-01) |
| หลังถอนแล้ว | สถานะเป็น "ยังไม่ให้" + ปุ่ม "ให้ใช้ตำแหน่ง" | ผ่าน (คำว่า "ยังไม่ให้" หลังถอนอ่านได้ ไม่ทำให้เข้าใจผิดว่ายังให้อยู่) |
| ลบข้อมูลในเครื่อง | popup ชั้นเดียว บอก "กู้คืนไม่ได้" และรายการที่หายครบ · ระหว่าง run ปุ่ม disabled พร้อมบรรทัดเหตุผล ไม่ซ่อน | ถ้อยคำผ่าน · body แสดงผลไม่ผ่าน (C6-01) |
| อายุ | เลือกจากรายการ ไม่พิมพ์ · ต่ำกว่าเกณฑ์ไม่มีฟอร์ม ไม่เก็บข้อมูล บอกตรงว่าช่องผู้ปกครองยังไม่เปิด | ผ่าน |

ไม่มีถ้อยคำที่ชี้นำให้กดอนุญาต ไม่มีคำที่บอกว่าไม่อนุญาตแล้วจะเสียอะไรเกินจริง

## 5. ข้อค้นพบ

ระดับ: **blocker** = ต้องแก้ก่อน gate นี้ผ่าน · **should** = แก้ใน Phase 2 ไม่ต้องรอ gate ใหม่ · **minor** = ไม่ blocking

| # | ระดับ | key | ไฟล์ | สิ่งที่ผู้เล่นเห็น | ต้องเป็น | owner |
| --- | --- | --- | --- | --- | --- | --- |
| C6-01 | blocker | `consent.locationBody`, `privacy.positionLogExplain`, `privacy.withdrawConfirmBody`, `settings.clearLocalDataConfirmBody` (และ `run.screenLockNotice`) | `ui/consent-location-screen.ts:44-46`, `ui/privacy-screen.ts:63-67,79-82`, `ui/settings-menu.ts:95-96`, `ui/pocket-screen.ts:140-142` · `app.css` ไม่มี `white-space: pre-line` ให้ class เหล่านี้ (มีแค่ `.run-summary-body` และข้อความจอพกกระเป๋า) | `\n` ถูกยุบเป็นช่องว่าง ข้อความ legal 3-5 บรรทัดกลายเป็นก้อนเดียวยาว 80-138 ช่อง บรรทัดสรุปไม่แยกออกมา ผู้เล่นอ่านวัตถุประสงค์/ระยะเก็บ/การถอนยากขึ้น และข้อยกเว้น legal (บรรทัดสรุป ≤ 64 ช่อง) ไม่มีผล | ใส่ `white-space: pre-line` ให้ `.consent-location-body`, `.privacy-position-log-explain`, body ของ popup ถอน consent และ popup ลบข้อมูลในเครื่อง (เพิ่ม class ให้สอง div นั้น), `.pocket-screen-lock-notice` · ไม่แยก key และไม่ต่อสตริงเอง | gameplay-programmer |
| C6-02 | blocker | `run.hpLow` (และ toast ทุกตัวใน `.toast`) | `app.css:129-141` `.toast { position: absolute; left: 50%; transform: translateX(-50%) }` ไม่มี `width`/`max-width` | กล่องที่วางแบบ absolute ด้วย `left: 50%` ได้ความกว้างแบบ shrink-to-fit สูงสุดราวครึ่งจอ บนจอ 360-390 px หักขอบในแล้วเหลือราว 150 px · canon 46 ช่องน่าจะตัดเป็น 3-4 บรรทัด ผิดกฎข้อ 2 ในจังหวะที่สำคัญที่สุดของ F06 (ข้อนี้อนุมานจาก CSS ยังไม่ได้ยืนยันด้วย screenshot) | toast กว้างได้เกือบเต็มจอ เช่น `width: max-content; max-width: calc(100vw - 32px)` (แบบเดียวกับ `.gps-pill` ที่ `app.css:171`) หรือ `left: 16px; right: 16px; margin: auto` · ยืนยันด้วย screenshot 360 px ว่า `run.hpLow` ไม่เกิน 2 บรรทัด | gameplay-programmer |
| C6-03 | blocker | `run.screenLockNotice` | `ui/pocket-screen.ts:140-143,227-231` | Path B (ไม่มี Wake Lock): `fallbackToast.hidden = false` แล้วไม่มีทางซ่อนอีก ค้างที่ช่อง `.toast` (`bottom: 24px`, z 30) ตลอด run และหลัง run · toast `run.hpLow`, รอบ, ของ วางตำแหน่งเดียวกันจึงทับกัน ผู้เล่นใน Path B อาจอ่าน `run.hpLow` ไม่ออก | notice จางหายเองหลังเวลาค้างจาก config (เสนอใช้ `client.json#toast.hpLowHoldDurationMs` หรือค่าใหม่ของ uiux) และซ่อนเมื่อ `dungeon_exited` · หรือย้ายเป็น banner ที่ไม่ใช้ช่อง toast (uiux เลือก) · ห้าม toast สองตัวซ้อนกัน (กฎทับเดียวของ flow) | gameplay-programmer · uiux-designer เลือกรูปแบบ |
| C6-04 | blocker | `home.farNextOpen` | `ui/home-panel.ts:159-169` · ต้นทาง `home/home-state.ts:203,238` (`nextOpenAt_ms: null`) | สถานะ `temporarilyClosed` ที่ไม่รู้เวลาเปิด → `ที่ใกล้กว่าปิดอยู่ เปิดอีกที ` ประโยคค้าง (ตัวแปรเติมเป็นสตริงว่าง) | narrative เพิ่ม key ไม่มีตัวแปร `home.farNextOpenUnknown` = "ที่ใกล้กว่าปิดอยู่ ยังไม่รู้ว่าเปิดเมื่อไร" (27 ช่อง, message) · client ใช้ key นี้เมื่อ `nextOpenAt_ms === null` ห้ามส่ง `openTime` ว่าง | narrative-designer (key) + gameplay-programmer (map) |
| C6-05 | blocker | `home.recoveringLabel`, `home.recoveringDetail` | ไม่มีจุดเรียกใน `apps/client/src` เลย · งานนี้ระบุไว้ที่ `docs/tech/F06-hp-damage-onboarding.md:622` และ flow F06 C7 | หลังตาย กลับมาจอที่บ้านไม่มีอะไรบอกว่า HP กำลังฟื้นและอีกนานเท่าไร · กด "เข้า" แล้วเจอ `dungeon.checkinNoHp` "รอฟื้นก่อน" โดยไม่มีที่ดูเวลา จังหวะตายจึงจบไม่ครบตาม flow | แสดง `home.recoveringLabel` + `home.recoveringDetail` บนจอที่บ้านทุกสถานะ (รวมสถานะใกล้บน S-01-map) เมื่อ `PlayerView.recovering` · `{recoverPct}` จาก `progression.hpRecovery.deathRecoveryTo_pct` · `{timeLeft}` จาก `selectPlayerView().recoveryTimeLeft_ms` จัดรูปด้วย `unit.*` (ข้อความเห็นครั้งเดียว ไม่ใช่ตัวนับวินาที ตาม R2-N1 ของ F04-F05 gate) · พ้นเป้าแล้วหายเงียบ ไม่ใช้ไอคอนนาฬิกาทราย | gameplay-programmer |
| C6-06 | should | `home.farBody` + `nav.straightLineTag` | `ui/home-panel.ts:173-176` | ระยะใน body แสดงเป็นตัวเลขเปล่า ไม่มีชิป "เส้นตรง" ติด ขณะที่ context ของ key และ R34 บอกให้ติดชิปทุกจุดที่แสดงระยะ | วางชิป `nav.straightLineTag` (และ `nav.distanceApprox` เมื่อ GPS ไม่แม่น) ต่อท้าย body หรือใต้ body ใน panel เดียวกัน | gameplay-programmer |
| C6-07 | should | `home.recentRunsShortcut` (รายละเอียด) | `f04-app.ts:790-803` | ใช้ `formatOpenTime` กับเวลาในอดีต: run ที่จบเมื่อวานหรือหลายวันก่อนก็ขึ้นว่า "วันนี้ HH:mm" (ผิดข้อเท็จจริง) · ไม่มีหัวข้อ `run.summary.*` ตามที่ context ของ key ระบุ · ถ้าหาชื่อ dungeon ไม่เจอ ขึ้น ` — วันนี้ …` | narrative เพิ่ม `unit.yesterday` ("เมื่อวาน {clockText}") และ client เขียน formatter เวลาในอดีต (วันนี้ / เมื่อวาน / ชื่อวันภายใน 7 วัน) · รายละเอียดเป็น `{หัวข้อ run.summary.*} · {ชื่อสั้น} · {เวลา}` · ซ่อนชื่อเมื่อ `isResolvedDungeonName` เป็น false | narrative-designer (key) + gameplay-programmer |
| C6-08 | should | `settings.autoRetreatToggleLabel`, `settings.pocketScreenLabel` | `ui/settings-walking-safety.ts:82-84,133-135` | ปุ่ม `.toggle` ไม่มีข้อความและไม่มี `aria-label` screen reader อ่านได้แค่ "ปุ่ม กดอยู่" | ผูก `aria-labelledby` กับ element ป้ายของแถว (ไม่ต้องมี key ใหม่) | gameplay-programmer |
| C6-09 | minor | รายการปีเกิดของ `age.gateOptions` | `ui/age-gate-screen.ts:95-100` | ปีแสดงเป็น ค.ศ. (`getFullYear`) คนไทยส่วนใหญ่คุ้นปีเกิด พ.ศ. | uiux ตัดสินรูปแบบ (context ของ key ให้ uiux เป็นเจ้าของ) ถ้าเลือก พ.ศ. ค่าที่ส่งเข้า `onConfirm` ยังเป็น ค.ศ. เหมือนเดิม | uiux-designer |
| C6-10 | minor | `run.tickGrantedFirst`, `run.continueCta` | `ui/tick-toast.ts:150-153` | ทางหลักของ run แรก (มี Wake Lock + เปิดจอพกกระเป๋าเป็นค่าเริ่มต้น) ผู้เล่นได้ยินเสียงรางวัลก้อนแรกแต่ไม่เคยเห็นบรรทัดปิด onboarding "เดินต่อเพื่อรับเพิ่ม" เพราะ P2-H39 ซ่อน toast ใต้จอพกกระเป๋า · ตรงตามคำตัดสิน ไม่ใช่บั๊ก | uiux พิจารณาว่าบรรทัดนี้ควรขึ้นตอนออกจากจอพกกระเป๋าครั้งแรกหลังได้ก้อนแรก หรือบนหน้าสรุป run แรก · ไม่บังคับใน Phase 2 | uiux-designer |
| C6-11 | minor | `home.farTitle` ในสถานะ `temporarilyClosed` | `ui/home-panel.ts:159-160` | หัวแผง "รอยแยกใกล้สุดอยู่ไกล" ขึ้นแม้ที่ใกล้สุดอยู่ใกล้แต่ปิด | uiux ยืนยันกับ flow 7.1 (Q-T16-1) ว่าหัวนี้ตั้งใจ หรือขอ key หัวแผงสำหรับ "ปิดทั้งหมดตอนนี้" จาก narrative | uiux-designer |

key ใหม่ที่ narrative จะเพิ่ม (เมื่อได้ writes `config/content/copy.th.json`):

| key | ข้อความ | kind | ช่อง | context |
| --- | --- | --- | --- | --- |
| `home.farNextOpenUnknown` | ที่ใกล้กว่าปิดอยู่ ยังไม่รู้ว่าเปิดเมื่อไร | message | 27 | S-06 สถานะ `temporarilyClosed` เมื่อ `nextOpenAt_ms` เป็น `null` · แทน `home.farNextOpen` · ถ้อยคำชุดเดียวกับ `dungeon.closedEmergencyBody` |
| `unit.yesterday` | เมื่อวาน {clockText} | label | 12 | เวลาในอดีตของรายการ run ที่ผ่านมา (C6-07) · คู่กับ `unit.today` |

ตรวจสองข้อความนี้กับกฎ 6 ข้อแล้ว ผ่านทุกข้อ ไม่มีคำอังกฤษ ไม่มีมุก (เป็นข้อความสถานะ)

## 6. key ที่ไม่ถูกใช้ (บันทึกไว้ ไม่นับในคำตัดสิน)

| key | เหตุ | การดำเนินการ |
| --- | --- | --- |
| `consent.browserPrimingTitle`, `consent.browserPrimingBody`, `consent.browserPrimingContinue` | X38 ขอ geolocation ทันทีหลังกดอนุญาต ไม่มีจอ priming (A-P2-X38-2) | รอ uiux ตัดสินใน P2-H40 · ไม่ fail gate ตาม brief |
| `home.recoveringLabel`, `home.recoveringDetail` | ยังไม่ได้ต่อสาย | **ต้องใช้** = C6-05 |
| `onboarding.headerLabel` | S-00-intro ไม่มี header | context อนุญาตให้ไม่ใช้ |
| `run.hpBarLabel` | HP bar แสดงแค่แถบและตัวเลข % ไม่มีป้าย "HP" | uiux ยืนยันว่าตั้งใจ ถ้าใช่ narrative จะย้ายไปกลุ่มสงวน |
| `home.farProfileLink` | การ์ด avatar บนจอที่บ้านไม่มีป้ายหรือทางไป S-10 (S-10 ยังไม่มีใน Phase 2) | ไม่ blocking · uiux ยืนยัน |
| `home.farNavigate` | ปุ่มนำทางอยู่ใน `nav-panel` ซึ่งใช้ key ของ `nav.*` | ไม่ blocking |
| `home.interestLink` | Phase 2 ใช้ `home.unknownRegisterHint` + `home.outOfAreaCta` แทนตาม context | ถูกต้อง |
| `home.outOfAreaBody`, `home.outOfAreaCount`, `home.outOfAreaCountZero` | สงวนไว้ตาม P2-H32 และ GD K-3 | ถูกต้อง |
| `settings.soundLabel`, `settings.vibrationLabel`, `settings.reportBlockLink`, `settings.helpLink`, `settings.accountDeleteLink`, `settings.autoPotionLabel`, `settings.autoPotionThreshold`, `settings.pendingSync` | นอกขอบเขต Phase 2 (ไม่มีจอ S-17/S-25/S-24, ไม่มี server, ยาอัตโนมัติปรับไม่ได้ D1) | ถูกต้อง · `settings.soundLabel`/`vibrationLabel` ควรกลับมาเมื่อมี toggle เสียง/สั่น |
| `run.death.alt1`, `run.death.alt2` | ทางเลือกของ canon รอ HUMAN/director เลือก | ถูกต้อง |

## 7. copy lint

**ยังไม่ได้รัน** · session นี้ไม่มี shell จึงรัน `pnpm lint:copy` (`tsx tools/copy-lint/src/cli.ts`) เองไม่ได้ และไม่พบผล lint รอบล่าสุดบน board · orchestrator ต้องรันและแปะสรุปไว้ใต้หัวข้อนี้ก่อนปิด gate (รวม `pnpm lint:config` ถ้าแตะ `client.json` ใน C6-03)

## 8. ส่งต่อ

| to | need | blocking |
| --- | --- | --- |
| gameplay-programmer | แก้ C6-01, C6-02, C6-03, C6-05 และส่วน map ของ C6-04 · แนบ screenshot 360 px ของ toast `run.hpLow`, จอ consent, popup ถอน consent, popup ลบข้อมูลในเครื่อง, จอที่บ้านสถานะ Recovering | yes |
| narrative-designer | เพิ่ม `home.farNextOpenUnknown` (C6-04) ใน `copy.th.json` · ต้องมี writes | yes |
| gameplay-programmer | C6-06, C6-07 (ส่วน client), C6-08 | no |
| narrative-designer | เพิ่ม `unit.yesterday` (C6-07) พร้อมรอบเดียวกับ C6-04 | no |
| uiux-designer | รูปแบบของ C6-03 (toast จางหายหรือ banner) · C6-09, C6-10, C6-11 · ยืนยัน `run.hpBarLabel`, `home.farProfileLink` · P2-H40 | no (C6-03 ต้องได้คำตอบก่อน gameplay แก้ ถ้าเลือกทาง banner) |
| orchestrator | รัน `pnpm lint:copy` แปะผลในหัวข้อ 7 · เปิดงาน X สำหรับ blocker แล้วขอ gate รอบ 2 (รอบ 2 ที่ยัง NEEDS_CHANGES ส่ง HUMAN ตาม protocol 6) | yes |
| qa-tester | e2e ตรวจว่า `.toast` สูงไม่เกิน 2 บรรทัดที่ viewport 360 px และไม่มีข้อความลงท้ายด้วย `อีกที ` หรือมี `{` บนจอที่บ้าน | no |
| HUMAN | PDPA sign-off ของถ้อยคำ consent/privacy (gate นี้ตรวจความชัดของภาษาเท่านั้น) | no (ไม่ใช่เงื่อนไขของ gate นี้) |
