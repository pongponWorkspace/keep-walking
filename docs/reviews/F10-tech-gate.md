# Tech gate F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav

- Task: P2-F10-T18 · ผู้ตรวจ: tech-lead · วันที่: 2026-10-01 · attempt 1
- ขอบเขต: commit `eae3c85..cd7d2ba` (T12, T14, T15, T16, T17) เทียบกับ `docs/tech/F10-account-shell.md` (T07)
- **Summary: verdict NEEDS_CHANGES** · โค้ด F10 ผ่านทุกข้อด้าน server-authority, storage/PII, render rule, test (3517 ผ่าน) · ค้าง 5 finding: config-not-hardcode 1 จุดใน e2e seed (gameplay), z-index tier ไม่อยู่ใน token (uiux), และเอกสาร/allowlist ของ tech-lead เอง 3 ข้อ

## 1. ผลรันเอง (ข้อ 10)

รันจาก root ที่ `cd7d2ba` (working tree สะอาด)

| คำสั่ง | ผล | บรรทัดสรุป |
| --- | --- | --- |
| `pnpm lint` | exit 0 | `eslint . --max-warnings=0` ผ่าน · `All matched files use Prettier code style!` · `lint:copy` 0 FAIL (WARN S7/S4/S12 13 บรรทัด เป็นของ copy ไม่ใช่ gate นี้) |
| `pnpm typecheck` | exit 0 | `apps/client typecheck: Done` (ทุก workspace Done) |
| `pnpm test` | exit 0 | `Test Files  229 passed (229)` · `Tests  3517 passed \| 2 skipped (3519)` |
| `pnpm lint:config` | exit 0 | `config-lint: 22 files, 0 errors, 2 warnings, 0 allowed, 13 stale` |

- 2 skipped = `qa/tests/F02/hud-panel-blackbox.test.ts:67,119` (`it.skip` PENDING เดิมของ F02) ไม่ใช่ F10
- diff `packages/shared/src/{reward,hp,session,run}` ช่วง `9faa88c~1..cd7d2ba` = ว่าง (gate/reward/HP ไม่ถูกแตะ)

## 2. คำตอบรายข้อของ brief (1–9)

1. **A-P2-F10-T14-1 — ACCEPT.** `apps/client/src/ui/login-screen.ts:113` `input.autocomplete = 'new-password'` (`type = 'password'` บรรทัดก่อนหน้า) · อีเมล `autocomplete = 'off'` (:127) · grep `.value` ในไฟล์เจอเฉพาะการล้างค่า (:263–267 `clearAllFields`) ไม่มี handler ใดอ่าน · ปุ่มยืนยันเป็น `type="button"` และไม่มี `<form>` เลย (test :82, :91) · ต่างจาก tech note 6 ข้อ 4 ที่เขียนว่ามี `<form autocomplete="off">` → โค้ดเข้มกว่า (ไม่มี form = ไม่มี submit shape) ยอมรับ แก้ tech note ให้ตรง (F-03)
2. **A-P2-F10-T14-4 — ACCEPT.** `PROVIDER_DISPLAY_NAME` (`login-screen.ts:28–29`) เป็นชื่อเฉพาะของบริษัทภายนอกที่ยืนแทนค่า `{providerName}` ซึ่ง components.md 16.6 กำหนดว่ามาจาก SDK · ไม่ใช่ชื่อในเกม (zone/dungeon/monster/item/boss) ที่ NN-3 บังคับให้มาจาก back office และไม่ใช่ค่า balance · ประโยคที่ห่อชื่อยังมาจาก copy key `account.loginGoogleButton`/`loginAppleButton` · ไม่มี logo · เงื่อนไข: Phase 3 ที่มี SDK จริงให้แทนด้วยค่าจาก SDK และลบ const นี้ (ส่งต่อใน tech note Phase 3 ไม่ใช่ finding ตอนนี้)
3. **A-P2-F10-T12-3 — ACCEPT พร้อมช่องว่างที่บันทึก.** `randomCharacterName` throw เมื่อไม่มี `Intl.Segmenter` เพราะทุก fallback ไม่ผ่าน `validateCharacterName` ที่ fail-closed (`packages/shared/src/character/random.ts:54`, test `character.test.ts:247`) · จอจับไว้: `create-character-screen.ts:332–339` `try/catch` → `showUnsupportedBrowser()` (banner, ปิดปุ่มสุ่ม, ปุ่มสร้างไม่เปิด) และตรวจ `segmenterSupported` ตอน mount ก่อนกดอยู่แล้ว (:243, :331) · test `create-character-screen.test.ts:214` · ไม่ crash ไม่มีชื่อหลุด = fail-closed ตาม H69
   - browser ขั้นต่ำ: `Intl.Segmenter` มีใน Chrome/Chrome Android 87+ และ Safari/iOS Safari 14.1+ · baseline ของ tech note 1 (Chrome Android 87+, iOS Safari 14.5+) จึงรองรับครบ
   - **ช่องว่างที่ยอมรับ:** (ก) Firefox ก่อน 125 และ WebView/เบราว์เซอร์นอก baseline สร้างตัวละครไม่ได้ (เห็นข้อความ `character.unsupportedBrowser`) · (ข) repo ไม่มี `browserslist`/`build.target` ที่ผูก baseline นี้ไว้ จึงเป็นข้อตกลงในเอกสารเท่านั้น (ข้อสังเกต N-01) · (ค) ข้อความของ tech note 1 ที่ว่า `randomCharacterName` "คืนค่าจาก fallback" ไม่ตรงโค้ด (โค้ด throw) → แก้ tech note (F-03)
4. **whitelist `character.json` ทั้งไฟล์ — ACCEPT.** `apps/client/src/config/whitelist.ts` ยังเป็นรายการ key ชัดเจน `topLevelKeys: ['name','contact','banned','random']` ไม่ใช่ wildcard จึงไม่มี key ใหม่ที่เติมในอนาคตหลุดเข้า client เอง · ไฟล์ไม่มีค่า group C (ไม่มีผลต่อรางวัล/gate/anti-cheat) · ผล generate มี 4 key ตรง (`balance-subset.generated.json#character`) ไม่มี `_meta`/`_source` · ข้อแม้ที่บันทึก: รายการคำต้องห้ามอ่านได้จาก bundle (อยู่ใน `config/content/character-names.th.json` ซึ่งเป็น pass-through อยู่แล้ว) ยอมรับใน Phase 2 · Phase 3 server ตรวจชื่อซ้ำด้วยโมดูลเดียวกัน (NN-1)
5. **z-index 35/38 — finding F-04 ถึง uiux-designer.** `apps/client/src/app.css:1503–1505` (`.inventory-screen`, `.coming-soon-screen` = 35), :1514 (`.bottombar-f10` = 38), :1573 (Setting float = 38) ไม่มีใน `design/ux/tokens.json#zIndex` (มี 0,1,10,20,30,40,50,60,9999) · เหตุผลทางเทคนิคใน comment :1492–1502 ถูกต้อง (ต้องอยู่เหนือจอเต็มจอ 2 จอแต่ใต้ `popupModal` 40) tech-lead รับรองลำดับนี้ · ต้องเข้า scale เป็น token มีชื่อ ตามเงื่อนไข D-129
6. **`chooseLoginMethod` ภายใต้ `e2eSkipOnboarding` — ต้องแก้ tech note 9.1 (F-03).** `apps/client/src/onboarding-flow.ts:271` เขียน `kw.p2.account` ทันทีเมื่อ hook เปิด แม้ `ageGatePassed = false` · เหตุผลถูก (short-circuit 9.1 ข้อ 2 ไม่ดู `pendingProvider` ถ้าไม่เขียนทันที spec relogin จะติด `login`) และ hook ถูกจำกัด Mock-only (`env.ts:108` `if (!isMockProvider) return false`) จึงไม่เปิดทางข้าม age gate บนของจริง · โค้ด ACCEPT · แต่ 9.1 ระบุพฤติกรรมของ hook เป็นสัญญาให้ qa จึงต้องเติมข้อ 3 ว่า "ภายใต้ hook A2 เขียน account ทันทีเสมอ"

7. **งานค้างของ tech-lead — finding F-01, F-02 (เจ้าของ tech-lead).**
   - `tools/config-lint/src/allowlist.ts:22–118`: 13 entry ขึ้น STALE ทุกตัว (`lint:config` พิมพ์ "13 stale" · 5 ของ `character.json` banned.modes/allow, 8 ของ `character-names.th.json`) หลัง H64 follow-up และ H70 เติม `_source` แล้ว · ลบทั้ง 13 entry, const `H64_SOURCE` (:26) และ `T03_SOURCE` (:32) และ comment :22–24 ให้ `ALLOWLIST = []` · ผลที่คาด: `0 allowed, 0 stale`
   - `docs/tech/asset-delivery.md` หลัง P2-H67 ไฟล์ทะเบียนไม่ใช่ 1 ไฟล์ต่อ root อีกแล้ว (`manifest.icon.ui.json`, `manifest.icon.item.json`, `manifest.icon.ui16.json`) · ต้องเปลี่ยน `manifest.<root>.json` → `manifest.<key>.json` ที่บรรทัด 24, 33, 75, 76, 245, 295 และเขียนหัวข้อ 10.1 (:253–) ใหม่ให้ part เป็น key (root หรือ root.กลุ่ม ตาม `manifestRoots`) รวม `paths.manifestPart` (:261) และกฎ V1 (:235) "root ตรงชื่อไฟล์" ให้ตรงกับ `tools/art/src/manifest-set.ts` ที่ H67 แก้แล้ว
8. **underage / logout — ACCEPT ทั้งสามข้อ.**
   - underage ไม่มี key ใหม่: `onboarding-flow.ts:314–317` สาขาไม่ผ่านตั้งแค่ `underageThisSession = true` + funnel ไม่เรียก `saveAccount`/`persist` · `pendingProvider` เก็บในหน่วยความจำและถูกล้างที่ `returnFromUnderage` (:325–329) · `saveAccount` มีแค่ 2 call site (:273, :311) ทั้งคู่ต้อง `ageGatePassed` หรือ e2e hook · test `onboarding-flow.test.ts:100` และ e2e `apps/client/e2e/onboarding.spec.ts:129` (`kw.p2.account` เป็น null)
   - logout = `signedIn: false` เท่านั้น (D-158): `storage/account.ts` `signOut` เขียน `{ provider, signedIn: false }` ไม่ลบ key ใด · `logout.ts` ไม่เรียก `purgeLocation`/consent writer · ตรง `privacy.json#localData.onSignOut = clearSignedInFlagOnly`
   - logout ระหว่าง run = `manual_exit` ทางเดียว: `account/logout.ts` drop sample → `exitRun` → stop provider → signOut → `account_logout {during_run}` · `f04-app.ts:811–812` `exitRun` = `engine.dispatch({ type: 'exit' })` เส้นเดียวกับปุ่มออก (:650, :660) ไม่มี exit_reason ใหม่ · test `logout.test.ts:26` ตรวจลำดับ
9. **render rule หัวข้อ 6 (P2-X59) — ACCEPT.** ทุกจอ F10 mount ครั้งเดียวตอน boot (`f04-app.ts:422` login, :503 create-character, :535 story, :901–920 coming soon/nav/Setting) แล้ว `render()` เรียก `show*()` เท่านั้น · ไม่มี `innerHTML` ในไฟล์ UI ของ F10 · `create-character-screen.ts` `show()` reset ค่าเฉพาะ `isFreshEntry` (`shown === false` หลัง `hide()`) · `login-screen.ts` `setActive` ไม่ทำอะไรเมื่อ view เดิม (`if (active === view) return`) และล้างช่องเมื่อเปลี่ยน view/hide เท่านั้น (R11) · test idempotent ด้วย MutationObserver ใน create-character, story, bottom-nav, coming-soon · login มี test "showMain ซ้ำไม่ reset DOM" (`login-screen.test.ts:115`) และ test ที่ 125

## 3. Checklist ของ detail block P2-F10-T18

| ข้อ | ผล | หลักฐาน |
| --- | --- | --- |
| ตรง tech note T07 | ผ่าน (มีจุดเอกสารต้องตาม F-03) | step machine `onboarding-step.ts:170–193` ตรงลำดับตัดสิน 3.2 ทุกข้อ · `isShellReady` ครบ 8 ขั้น · storage 2 key ตาม 2.1/2.2 ลำดับ A7 (chooseClass ก่อน `saveCharacter`) · `resolveRoute(requested, input)` ต่างลายเซ็นจาก 4.2 (รับ object) ยอมรับ |
| config-not-hardcode | ไม่ผ่าน 1 จุด (F-05) | ตัวกรอง/คลังชื่อ/bucket อ่านจาก config (`onboarding-flow.ts:70` bucket จาก `f10Events.filterRejectCountBuckets`) · route เป็น identifier รวมที่ `nav/routes.ts` ตาม 4.1 · จุดเสีย: `e2e-skip-seed.ts` |
| ไม่มี password/อีเมล/ชื่อในที่ไม่ควร | ผ่าน | reader ปฏิเสธ key เกิน (`account.test.ts:24`, `character.test.ts:24`) · ไม่มี `console.*` ในไฟล์ F10 · telemetry `forbiddenPropertyNames` ใน `telemetry.json#f10Events` · ไม่มีข้อมูลใน URL |
| origin allowlist | ผ่าน | ไม่มี SDK/request ใหม่ · ปุ่ม Google/Apple เรียก callback ตรง (`login-screen.test.ts:31`) · e2e ของ gameplay 68/68 |
| lint boundary `packages/shared/src/character` | ผ่าน | import นอก test เป็น relative ภายในโฟลเดอร์เท่านั้น ไม่มี DOM/fetch/engine · subpath `./character` ไม่อยู่ใน `CLIENT_ENGINE_BAN` ตาม 7.1 |
| migration ไม่ทำข้อมูลหาย | ผ่าน | ไม่มีโค้ดแปลง · `onboarding-step.test.ts:381–` ครบ 4 แถวของหัวข้อ 5 · seed `apps/client/e2e/fixtures/f10-seed.ts` |
| test ครบและเขียว | ผ่าน | หัวข้อ 1 · vectors ของ character-name อ่าน dynamic ใน `character.test.ts` |
| gate/reward/HP ไม่ถูกแตะ | ผ่าน | diff `packages/shared/src/{reward,hp,session,run}` = ว่าง · ชื่อไม่เข้า engine |
| server-authority | ผ่าน | ไม่มีค่าใดของ F10 กระทบรางวัล/gate/HP · RNG สุ่มชื่อใช้ `crypto.getRandomValues` · ตัวกรองชื่อรันใน client ใน Phase 2 ตามข้อตกลง client-first และเป็น pure module ที่ Phase 3 รันซ้ำบน server |
| telemetry ตรง `product/telemetry-events.md` | ผ่าน | 8 ชื่อใน `known-events.ts` ตรง 2b · ถ้อยคำ `account_logout` แก้แล้ว (telemetry-events.md:424) |

## 4. Findings

ทุกข้อ blocking: yes · หลังแก้ครบ orchestrator รัน gate นี้ซ้ำหนึ่งครั้ง (protocol ข้อ 6)

| id | เจ้าของ | ไฟล์:บรรทัด | ปัญหา | ต้องทำ |
| --- | --- | --- | --- | --- |
| F-01 | tech-lead | `tools/config-lint/src/allowlist.ts:22–118` | 13 entry STALE + const `H64_SOURCE`, `T03_SOURCE` ค้าง | ลบทั้งหมด ให้ `ALLOWLIST = []` · `pnpm lint:config` ต้องได้ `0 allowed, 0 stale` และ `pnpm test` ยังเขียว |
| F-02 | tech-lead | `docs/tech/asset-delivery.md:24, 33, 75, 76, 235, 245, 253–261, 295` | ยังเขียน `manifest.<root>.json` และ "1 ไฟล์ต่อ root" ขัดกับผล P2-H67 (`manifest.icon.{ui,item,ui16}.json`) | เปลี่ยนเป็น `manifest.<key>.json` และเขียน 10.1 ใหม่ให้ key = root หรือกลุ่มย่อยตาม `manifestRoots` ใน `tools/art/pipeline.config.json` |
| F-03 | tech-lead | `docs/tech/F10-account-shell.md:22, 208, 262–272` | tech note ไม่ตรงโค้ดที่ยอมรับแล้ว 3 จุด | :22 `randomCharacterName` **throw** เมื่อไม่มี `Intl.Segmenter` และจอจับเป็น `character.unsupportedBrowser` (A-P2-F10-T12-3, H69) · :208 ไม่มี `<form>` (ปุ่ม `type="button"` นอก form) · 9.1 เติมข้อ 3: ภายใต้ hook `chooseLoginMethod` เขียน `kw.p2.account` ทันทีเสมอ (ไม่ผ่าน `pendingProvider`) |
| F-04 | uiux-designer | `design/ux/tokens.json#zIndex` · ใช้ที่ `apps/client/src/app.css:1505, 1514, 1573` | tier 35 (จอเต็มจอที่มี nav: inventory, coming soon) และ 38 (bottom nav, Setting float) ไม่มีใน scale (D-129 บังคับว่าทุกระดับต้องเป็น token) | เพิ่ม token มีชื่อ เช่น `navScreen: 35`, `nav: 38` พร้อมเหตุผลใน `rule` และ components.md 15 · tech-lead รับรองลำดับ `toast 30 < navScreen 35 < nav 38 < popupModal 40` แล้ว · จากนั้น gameplay เปลี่ยน comment ใน app.css ให้อ้างชื่อ token (แก้ comment เท่านั้น) |
| F-05 | gameplay-programmer | `apps/client/src/onboarding/e2e-skip-seed.ts:17–28` | ชื่อ seed อ่าน path `randomName.fallback.names` ที่เขียนตายในโค้ด แทนการ resolve `config/balance/character.json#random.fallbackKey` ตาม tech note 9.1 ข้อ 1 · มี literal `'player'` เป็นค่าสำรองที่กลบ config เสียแบบเงียบ (path ผิดหรือรายการว่างก็ยัง seed ได้ ไม่มีใครรู้) และเป็นชื่อที่ไม่ได้มาจากคลังชื่อ | ใช้ `resolveStringList(lexicon, params.random.fallbackKey)[0]` จาก `@keep-walking/shared/character` กับ `balanceCharacterNameParamsConfig` · รายการว่าง = throw (fail loudly ตาม `_meta._note`) ไม่มี literal สำรอง · เพิ่ม unit test ใน `e2e-skip-seed.test.ts` ว่าชื่อ seed = รายการที่ `fallbackKey` ชี้ และผ่าน `validateCharacterName` |

## 5. ข้อสังเกตที่ไม่ blocking

- N-01 (tech-lead, Phase 3 หรือ CI): baseline เบราว์เซอร์ (Chrome Android 87+, iOS Safari 14.5+) อยู่ในเอกสารเท่านั้น ไม่มี `browserslist`/`build.target` ใน `apps/client` · เสนอผูกเป็น `build.target` ของ Vite ใน ADR ถัดไป
- N-02 (qa-tester): `pnpm test` พิมพ์ `DOMException [AbortError]` จาก happy-dom ตอน teardown 18 ครั้ง (fetch ที่ค้างตอนปิด window) · test ผ่านทั้งหมด แต่ log รกจนบังข้อผิดพลาดจริง · ตรวจใน P2-F10-CI ว่าเป็นของเดิมหรือ F10 แล้ว stub/await fetch ใน test ที่ต้นเหตุ
- N-03 (narrative-designer, ไม่ต้องแก้ตอนนี้): `STORY_SLIDE_COUNT = 5` (`apps/client/src/ui/story-screen.ts:18`) เป็นโครงสร้างตาม spec/route `#/story/1..5` ไม่ใช่ค่า balance · ถ้าจำนวน slide จะเปลี่ยนในอนาคต ให้ย้ายไปนับจาก copy key `story.slide*`
- N-04: `PROVIDER_DISPLAY_NAME` (`login-screen.ts:28`) ให้ถอดเมื่อมี SDK จริงใน Phase 3 (ข้อ 2)
