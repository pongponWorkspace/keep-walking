# Tech note F10 — Account shell, สร้างตัวละคร, เล่าเรื่อง และ main nav

- Task: P2-F10-T07 · Owner: tech-lead · Status: READY (build เริ่มได้)
- Inputs: `design/features/F10-account-shell.md` (R01..R52), `config/balance/character.json`, `design/systems/test-vectors/character-name.json`, `product/telemetry-events.md` §2b, `docs/tech/F06-hp-damage-onboarding.md` หัวข้อ 8
- ขอบเขต: Phase 2 client-first · login ทุกแบบเป็น bypass (ไม่มี backend auth, ไม่มี SDK ผู้ให้บริการ) · reward/HP/gate/session ไม่ถูกแตะ

## 1. สรุปและข้อจำกัด

คำตัดสินของ tech note นี้

1. key ใหม่ 2 key: `kw.p2.account` และ `kw.p2.character` (หัวข้อ 2) · ชื่อตัวละครและธงเรื่องเล่าอยู่ใน `kw.p2.character` **ไม่ใช่ field ใน `player`** · ไม่แก้ `packages/shared/src/{session,run,reward,hp}`
2. step machine ใหม่แทน F06 8.2 (หัวข้อ 3 และ F06 8.2 ที่แก้แล้ว) · ยังเป็นฟังก์ชัน pure ใน `apps/client/src/onboarding/` · class ยังผ่าน `chooseClass` ของ engine · permission ยังผ่าน `LocationProvider`
3. route ใหม่ `#/login`, `#/login/email`, `#/register`, `#/forgot`, `#/create-character`, `#/story/<n>`, `#/upgrade`, `#/shop`, `#/party` (หัวข้อ 4) · URL เป็นผลของ state ไม่ใช่แหล่งความจริง
4. migration ไม่มีโค้ดแปลงข้อมูล: ผู้เล่นเดิมคือผู้ที่ไม่มี 2 key ใหม่ step machine พาไปขั้นแรกที่ยังไม่ผ่านเอง (หัวข้อ 5)
5. จอที่มี input สร้าง DOM ครั้งเดียวต่อการเข้าจอ render ซ้ำไม่ reset ค่า (หัวข้อ 6)
6. D-150 (ชื่อ field ความยาว): ใช้ `name.minGraphemes` / `name.maxGraphemes` ตาม T04 ไม่ใช่ `minLength` / `maxLength` ของ spec R18 ข้อ 1 · เหตุผล: ชื่อบอกหน่วยที่นับ (grapheme cluster) ตรงกับข้อความของ R18 เอง กันคนอ่านเป็น `string.length` (code unit) ซึ่งผิดกับภาษาไทย · config-lint ไม่มีหน่วย `_graphemes` จึงเป็น camelCase ธรรมดา (หัวข้อ 7) · spec R18 ข้อ 1 อ้างชื่อเดิม: ส่ง game-director แก้ถ้อยคำ (หัวข้อ 11)

ข้อจำกัดที่ถือ

- Phase 2 ไม่มี auth จริง ทุกปุ่มยืนยันของ login เป็น bypass (R10) · ไม่มี request ใหม่ ไม่ load SDK ใด (R12, C2-1) · `provider` เป็นแค่ป้ายของปุ่มที่กด ไม่ใช่ตัวตน
- ไม่มีค่าใดของ F10 มีผลต่อรางวัล/gate/HP · ชื่อตัวละครไม่เข้า engine เลย จึงไม่มีทางกระทบ NN-1, NN-2
- `Intl.Segmenter` จำเป็น (A-T04-4): นับ grapheme ใน `validateCharacterName` · baseline เบราว์เซอร์ของ Phase 2 (Chrome Android 87+, Safari iOS 14.5+) มีครบ · ไม่มี polyfill (งบ bundle) · ถ้าไม่มี (`typeof Intl.Segmenter !== 'function'`) `validateCharacterName` คืน `charset` เสมอ (fail-closed ไม่มีชื่อหลุดตัวกรอง) และ `randomCharacterName` คืนค่าจากรายการที่ `random.fallbackKey` ชี้ ซึ่งก็ไม่ผ่าน validate ในเครื่องนั้นเช่นกัน · ผลคือเบราว์เซอร์นอก baseline สร้างตัวละครไม่ได้ ซึ่งยอมรับ เพราะเกม (MapLibre, WebGL) ใช้บนเบราว์เซอร์นั้นไม่ได้อยู่แล้ว · test ครอบกรณีนี้ใน T12 (stub `Intl.Segmenter = undefined`)

## 2. Storage schema

ทุก key อยู่ใต้ `config/app/privacy.json#localData.storageKeyPrefix` (`kw.p2.`) จึงถูกล้างโดยปุ่มลบข้อมูล (`clearScope = allKeysWithPrefix`, F06 8.3) และถูกลบหรือย้ายใน Phase 3 ตาม ADR 0003 C1-5 · เขียนผ่าน envelope และ `writeWithQuotaFallback` ของ `apps/client/src/storage/local-store.ts` เหมือน key อื่น · อ่านไม่ได้ / schemaVersion ไม่ตรง = ถือว่าไม่มี key (ขั้นนั้นยังไม่ผ่าน) ไม่ crash

### 2.1 `kw.p2.account` (R13, R41, R43, R49)

```ts
// stored as the envelope { schemaVersion: 1, savedAt_ms, state } like kw.p2.consent
interface AccountStorageV1 {
  provider: 'google' | 'apple' | 'email'; // email_login, email_register, email_forgot all -> 'email'
  signedIn: boolean;
}
```

- ไม่มีอีเมล password token ปีเกิด หรือข้อมูลใดจาก provider (รายการห้ามอยู่ที่ `config/app/privacy.json#localData.neverStored`) · `savedAt_ms` ของ envelope เป็นเวลาเขียนเหมือน key อื่น ไม่ export · ไม่มี field อื่นใน `state` (reader ปฏิเสธ object ที่มี key เกิน เพื่อกันโค้ดอนาคตแอบเติม · unit test)
- เขียนเมื่อ: (ก) ผ่าน age gate ขณะถือ `pendingProvider` ในหน่วยความจำ (A3) · (ข) กดยืนยันบนจอ login ขณะ `ageGatePassed = true` อยู่แล้ว (A10 และผู้เล่นเดิม) → เขียนทันที `signedIn: true`
- ไม่เขียนเมื่อ: ต่ำกว่าเกณฑ์ (A4) · reload ระหว่าง login กับ age (`pendingProvider` หาย ผู้เล่นกด login ใหม่หนึ่งแตะ · คำตัดสิน ง)
- logout (A9): เขียน `state = { ...current, signedIn: false }` เท่านั้น (`privacy.json#localData.onSignOut = clearSignedInFlagOnly`) · ไม่ลบ key อื่นใด (R41) · provider เดิมคงไว้ (ไม่มีจอใดใช้ แต่ไม่มีเหตุให้ลบ และ telemetry `account_login_shown.context` คำนวณจาก "มี key" ไม่ใช่ provider)
- `NoAccount` = ไม่มี key · `SignedIn` = `signedIn: true` · `SignedOut` = `signedIn: false` (สถานะ account ของ spec หัวข้อ 4)

### 2.2 `kw.p2.character` (R21, R22, R27, R30, R49)

```ts
// stored as the envelope { schemaVersion: 1, savedAt_ms, state }
interface CharacterStorageV1 {
  name: string;       // normalized per R22 (validateCharacterName's normalized output)
  storyDone: boolean; // step 7 passed (finished or skipped, R27)
}
```

**เหตุผลที่แยก key ไม่ใส่ใน `player`**

1. `player` อยู่ใน `SessionState` ของ engine (`packages/shared/src/session`) ซึ่งรันซ้ำบน server ใน Phase 3 · ชื่อไม่มีผลต่อเกม ใส่ใน engine = แก้ type, `toPersisted`, vector ของ session และ T18 ต้องตรวจ diff ของ `session` เพิ่มโดยไม่มีประโยชน์
2. ชื่อเป็นข้อความที่ผู้เล่นพิมพ์เอง (PII ที่เป็นไปได้ R50) · `SessionState` ถูกส่งเข้า debug overlay / selector หลายตัว · แยก key ทำให้มีทางอ่านชื่อทางเดียว (`storage/character.ts`) และ test "ชื่อไม่อยู่ใน telemetry/export" ตรวจได้ที่จุดเดียว
3. migration ง่าย: ผู้เล่นเดิมไม่มี key นี้ = ยังไม่ตั้งชื่อ ไม่ต้องมี `schemaVersion` ใหม่ของ session
4. `storyDone` อยู่ key เดียวกับชื่อ เพราะเกิดในช่วงเดียวกันและไม่มีเรื่องเล่าโดยไม่มีตัวละคร · ไม่เพิ่ม field ใน `kw.p2.onboarding` (จะต้อง bump schemaVersion ที่ reader F06 ปัจจุบันปฏิเสธ)

- เขียนเมื่อ: กดสร้างตัวละคร (A7) → `state = { name, storyDone: false }` · จบหรือข้ามเรื่อง (A8) → `storyDone: true`
- **ลำดับเขียนของ A7:** `dispatch(chooseClass)` + persist `kw.p2.session` ก่อน แล้วจึงเขียน `kw.p2.character` · ถ้าหลุดระหว่างสองขั้น เปิดใหม่จะเป็น "มี class ไม่มีชื่อ" = เส้นทางผู้เล่นเดิม (class ล็อก ตั้งชื่อ) ไม่มีข้อมูลเสีย · ลำดับกลับกันจะเหลือชื่อโดยไม่มี class ซึ่งไม่มีจอรองรับ · ผู้เล่นเดิมที่มี class แล้ว: ไม่เรียก `chooseClass` (engine ปฏิเสธการเลือกซ้ำอยู่แล้ว F06-R30)
- ชื่อเปลี่ยนไม่ได้ (R23) · ไม่มี writer อื่นนอกจากสองจุดนี้
- ห้ามอ่านชื่อจาก telemetry, debug overlay, export, error report · test ของ T15 สแกน ring buffer และ export หลังสร้างตัวละคร

### 2.3 key เดิมที่ F10 ไม่เปลี่ยน schema

`kw.p2.onboarding` (v1 เดิม: `introSeen`, `ageGatePassed`, `consentAnswered`, `firstOpenAt_ms`), `kw.p2.consent`, `kw.p2.session`, `kw.p2.interest`, `kw.p2.settings.*`, `kw.p2.telemetry` · ตารางรวมอยู่ใน F06 8.1 (แก้แล้วให้มี 2 key ใหม่) และ `config/app/privacy.json#localData.keys`
- ต่ำกว่าเกณฑ์: เครื่องไม่มี `kw.p2.account`, `kw.p2.character` (R14, A-E1) · `kw.p2.onboarding.introSeen` ของ F06 อาจมีอยู่แล้วตามพฤติกรรมเดิม (เขียนตอนกดเริ่มเกม) ซึ่งไม่ใช่ key ของ F10 และไม่มีข้อมูลอายุ

## 3. Step machine onboarding (D-149)

โมดูล: `apps/client/src/onboarding/onboarding-step.ts` (pure, ไม่มี DOM, ไม่ import engine · ขยายของเดิม) · owner build: backend-programmer (T12) · wiring: gameplay-programmer (T14/T15)

### 3.1 ตารางขั้น → ธง → แหล่งความจริงเดียว (แทน F06 8.2)

| # | ขั้น (`OnboardingStep`) | ผ่านเมื่อ | แหล่ง |
| --- | --- | --- | --- |
| 1 | `intro` | `kw.p2.onboarding.introSeen` และ `atStartThisSession = false` | client (F06) + หน่วยความจำ |
| 2 | `login` | `kw.p2.account` มีและ `signedIn = true` | client (F10) |
| 2a | `age` (ระหว่าง 2 กับ 3 ในหน่วยความจำ) | แสดงเมื่อ `pendingProvider ≠ null` และ `ageGatePassed = false` | หน่วยความจำ |
| 3 | `age` | `kw.p2.onboarding.ageGatePassed` | client (F06) |
| — | `underage` | `underageThisSession = true` (หน่วยความจำ) | หน่วยความจำ |
| 4 | `consent` | `kw.p2.onboarding.consentAnswered` | client (F06) |
| 5 | `permission` | ไม่มีธง: ถามสดเมื่อ `kw.p2.consent.location = granted` และผลยังไม่ resolve ในรอบนี้ (ผลบล็อกก็ผ่าน R04) | LocationProvider (สด) |
| 6 | `character` | `player.classId ≠ null` **และ** `kw.p2.character` มี | engine + client (F10) |
| 7 | `story` | `kw.p2.character.storyDone` | client (F10) |
| 8 | `map` → `first_run` → `first_reward` → `done` | ตาม F06 8.2 (`firstRunEnteredAt_ms`, `lifetimeTicksGranted > 0`) | engine |

- `mapAcknowledged` และขั้น `class` เดิมถูกลบ · `class` รวมเข้า `character` (spec หัวข้อ 4) · ขั้น `map` ไม่มีธงของตัวเอง: ผ่าน 1–7 = "shell พร้อม" (R06) แล้ว map คือหน้าหลัก
- ขั้น 1–7 ต้องผ่านครบก่อน nav, Setting และ route ของ shell (หัวข้อ 4) · `first_run`/`first_reward` ไม่ใช่เงื่อนไขของ shell (nav ขึ้นตั้งแต่ถึงแผนที่ครั้งแรก) แต่ยังคุม lock ของ `isSystemTeachLocked` ตามเดิม

### 3.2 input ใหม่ของ `currentOnboardingStep`

```ts
interface OnboardingStepInput {
  storage: OnboardingStorage | null;            // kw.p2.onboarding (unchanged v1)
  account: AccountStorageV1 | null;             // kw.p2.account
  character: CharacterStorageV1 | null;         // kw.p2.character
  pendingProvider: 'google' | 'apple' | 'email' | null; // memory only (R13)
  atStartThisSession: boolean;                  // memory only: set by the underage screen's button (R14)
  underageThisSession: boolean;                 // memory only (unchanged)
  locationConsent: 'granted' | 'declined' | 'withdrawn' | 'unanswered';
  permissionGranted: boolean | null;            // live, never stored
  classChosen: boolean;                         // selectPlayerView(...).classId !== null
  firstRunEntered: boolean;
  firstRewardDone: boolean;
}
type OnboardingStep = 'intro' | 'login' | 'age' | 'underage' | 'consent' | 'permission'
  | 'character' | 'story' | 'first_run' | 'first_reward' | 'done';
```

ลำดับตัดสิน (ข้อแรกที่จริงชนะ)

1. `storage === null || !introSeen || atStartThisSession` → `intro`
2. `account === null || !account.signedIn`:
   - `ageGatePassed` จริงแล้ว (ผู้เล่นเดิม หรือ logout) → `login` (กดยืนยันแล้ว caller เขียน account ทันที)
   - ไม่อย่างนั้น `pendingProvider === null` → `login` · มิฉะนั้น `underageThisSession ? 'underage' : 'age'`
3. `!ageGatePassed` → `age` (กรณี `kw.p2.onboarding` เสียแต่ account อยู่: ถามอายุซ้ำ fail-closed)
4. `!consentAnswered` → `consent`
5. `locationConsent === 'granted' && permissionGranted === null` → `permission`
6. `!classChosen || character === null` → `character` (caller ส่ง `classLocked = classChosen` ให้จอ R47)
7. `!character.storyDone` → `story`
8. `!firstRunEntered` → `first_run` · `!firstRewardDone` → `first_reward` · อื่น `done`

- selector เพิ่ม `isShellReady(input) = step ∉ {intro, login, age, underage, consent, permission, character, story}` (pure · unit test ทุกขั้น)
- **run มาก่อนเสมอ (R48, A12):** `render()` ของ `f04-app.ts` ตรวจ `state.run !== null` หรือสรุป run ที่ยังไม่ปิด **ก่อน** เรียก step machine · ถ้าจริง แสดงจอ run/สรุปตามเดิม ไม่ว่าขั้น onboarding คืออะไร · step machine ไม่รู้เรื่อง run (คงแยก engine)
- การเขียน storage เกิดใน caller ผ่าน event เดิมของ `applyOnboardingEvent` + writer ใหม่ `storage/account.ts` (`loadAccount`, `saveAccount`, `signOut`) และ `storage/character.ts` (`loadCharacter`, `saveCharacter`, `markStoryDone`) · ไม่มี writer ใดเรียกได้ขณะ `underageThisSession = true` (guard + unit test)

### 3.3 event ของ caller ต่อ transition (spec หัวข้อ 4)

| transition | caller ทำ |
| --- | --- |
| A1 กดเริ่มเกม | `introSeen` (เดิม) · `atStartThisSession = false` |
| A2 ยืนยันบนจอ login | `ageGatePassed` ? `saveAccount({provider, signedIn: true})` : `pendingProvider = provider` |
| A3 ผ่านอายุ | `ageGatePassed` (เดิม) แล้ว `saveAccount({provider: pendingProvider, signedIn: true})` · `pendingProvider = null` |
| A4 ต่ำกว่าเกณฑ์ | `underageThisSession = true` · `pendingProvider = null` · ไม่เขียน · ปุ่มกลับ: `underageThisSession = false`, `atStartThisSession = true` |
| A5/A6 | ตาม F06 เดิม (consent → permission ผ่าน `LocationProvider`) |
| A7 สร้างตัวละคร | `chooseClass` (ถ้ายังไม่มี class) → persist session → `saveCharacter({name, storyDone: false})` |
| A8 จบ/ข้ามเรื่อง | `markStoryDone()` → `#/` (แผนที่) |
| A9 logout | ดูหัวข้อ 4.3 |
| A10 login ใหม่ | `saveAccount({provider, signedIn: true})` → step คำนวณได้ `first_run`/`done` → แผนที่ (R43) |
| A11 ลบข้อมูล | `clearLocalData` เดิม (F06 8.3) · ล้าง 2 key ใหม่ไปด้วยตาม prefix |

- ปฏิเสธ consent (R03) และ permission บล็อก (R04): step 5 ถูกข้ามตามเงื่อนไขเดิม → `character` · ไม่มีโค้ดใหม่

## 4. Route และ guard

### 4.1 ตาราง route

| hash | จอ | ใช้ได้เมื่อ |
| --- | --- | --- |
| `#/` หรือว่าง | แผนที่ (หน้าหลัก) + nav | shell พร้อม |
| `#/login` | login หลัก | step = `login` |
| `#/login/email` | email login | step = `login` |
| `#/register` | สมัคร | step = `login` |
| `#/forgot` | ลืมรหัสผ่าน | step = `login` |
| `#/create-character` | สร้างตัวละคร | step = `character` |
| `#/story/<n>` (`n` = 1..5) | เรื่อง slide n | step = `story` และ `n ≤ storySlideReached` (หน่วยความจำ) |
| `#/inventory` | S-11 เดิม + nav | shell พร้อม |
| `#/upgrade`, `#/shop`, `#/party` | เร็วๆ นี้ + nav | shell พร้อม |
| `#/settings`, `#/settings/walking-safety`, `#/settings/privacy`, `#/settings/credits` | ตั้งค่าเดิม (+ แถว logout ในเมนู) | shell พร้อม (ข้อยกเว้นหัวข้อ 4.2 ข้อ 4) |

- ขั้น `intro`, `age`, `underage`, `consent`, `permission` ไม่มี route ของตัวเอง (เหมือน F06 ปัจจุบัน) · URL ขณะอยู่ขั้นเหล่านี้ถูกตั้งเป็น `#/` ด้วย `history.replaceState`
- ชื่อ route เป็น identifier ของโค้ด ไม่ใช่ copy (literal ได้) แต่รวมไว้ที่เดียว `apps/client/src/nav/routes.ts` (`ROUTES` const + `parseRoute(hash): Route` pure) แทน `routeFromHash` ใน `f04-app.ts` · unit test ทุกแถว + hash แปลก (`#/story/9`, `#/story/abc`, `#/shopx`) → ไม่รู้จัก = `#/`
- ไม่มีข้อมูลใดใน URL (ไม่มีชื่อ อีเมล provider · R11)

### 4.2 guard (ฟังก์ชัน pure `resolveRoute(requested, step, runActive): Route` ใน `nav/routes.ts`)

1. `runActive` (มี run หรือสรุปยังไม่ปิด) → คืน route ของ run เดิม ยกเว้น `#/settings*` และ `#/inventory` ซึ่งเปิดได้ระหว่าง run ตาม F06 เดิม (ia.md, NN-7) · nav ไม่แสดง (R33)
2. step ∈ ขั้น 1–7 → route ของขั้นนั้น (ตาราง 4.1) · deep link อื่นทั้งหมดถูก `replaceState` ไป route ของขั้น (R06, A-E16) · ในขั้น `login` จอย่อย email ทั้งสี่ใช้ได้ (ทางกลับ = `#/login`)
3. shell พร้อม → route ของ onboarding ที่ผ่านแล้ว (`#/login*` ขณะ `SignedIn`, `#/create-character`, `#/story/*`) → `#/` (A-E17)
4. ข้อยกเว้นของ R06: หน้า privacy policy / ความเป็นส่วนตัวที่ flow F06 เปิดจากจอ consent คงเดิม (เปิดจากปุ่มในจอ consent ไม่ใช่ deep link ทั่วไป) · `#/settings/privacy` ก่อน shell พร้อมเปิดได้เฉพาะเมื่อมาจากจอ consent (ธงในหน่วยความจำ) มิฉะนั้นข้อ 2
5. `#/story/<n>`: `n > storySlideReached` → `#/story/<storySlideReached>` (A-E18) · reload เริ่ม `storySlideReached = 1` (R30, A-E6) · back ของเบราว์เซอร์ใน story ลด slide (R28) · back จาก slide 1 ไม่ออกจาก story (replace ไม่ push ตอนเข้า slide 1)
6. back ในขั้นที่บันทึกแล้ว (A-E19): guard ข้อ 2/3 ดึงกลับจอปัจจุบัน · เข้าแต่ละขั้นด้วย `replaceState` ไม่ใช่ push ยกเว้น slide 2..5 และจอย่อย email (push เพื่อให้ back ทำงานตาม R28, R09)

### 4.3 logout (R40–R42, D-152)

1. แถว "ออกจากระบบ" ใน `#/settings` → confirm sheet (copy มี run / ไม่มี run ตาม narrative T11)
2. ยืนยัน · ถ้า `state.run !== null`: ใช้ลำดับ F06 8.4 ข้อ 1–3 ทุกประการ (ธง `locationWithdrawn`-แบบเดียวกันเพื่อทิ้ง sample, `dispatch({ type: 'exit' })` ครั้งเดียว → `manual_exit`, `LocationProvider.stop()`, ปล่อย wake lock) · **ไม่** ทำข้อ 4 (ไม่ล้างพิกัด ไม่เปลี่ยน consent: logout ไม่ใช่การถอน consent R41) · ห้ามมี exit_reason ใหม่
3. `signOut()` → `kw.p2.account.signedIn = false` · emit `account_logout { during_run }`
4. มี run: แสดงสรุป run (`run.summary.exited`) · ปิดสรุป → step = `login` → `#/login` · ไม่มี run: ไป `#/login` ตรง
5. login ใหม่ = A10 · หลังจากนั้น `LocationProvider` เริ่มใหม่ตามสถานะที่บ้านเดิม (consent ยัง `granted` ถ้าเคยให้)
- ต่างจากลบข้อมูล: ลบข้อมูลยังถูกปิดระหว่าง run (`selectCanClearLocalData`) · logout ไม่ถูกปิด
- สองแท็บ (A-E25): ไม่มี `storage` event listener · แท็บอื่นเห็นผลเมื่อ reload (ตาม spec)

## 5. Migration ผู้เล่นเดิม

(R45–R48, D-152, คำตัดสิน ค) · **ไม่มีโค้ดแปลงข้อมูลและไม่มี schemaVersion ใหม่ของ key เดิม** · ผู้เล่นเดิม = ไม่มี `kw.p2.account` หรือไม่มี `kw.p2.character` แต่มี `kw.p2.onboarding` ที่ผ่านบางขั้นแล้ว · step machine หัวข้อ 3.2 พาไปขั้นแรกที่ยังไม่ผ่านเอง

| ข้อมูลเดิม | ขั้นที่ได้ | ผล |
| --- | --- | --- |
| intro + age + consent ผ่าน, มี class | `login` → `character` (class ล็อก) → `story` → map/`first_run`/`done` | A2 เขียน account ทันทีเพราะ `ageGatePassed` จริง (ไม่ถามอายุซ้ำ) · จอสร้างตัวละครได้ `classLocked = true` ไม่เรียก `chooseClass` |
| intro + age + consent ผ่าน, ยังไม่มี class | `login` → `character` (ปกติ) → `story` | เหมือนผู้เล่นใหม่หลังขั้น 5 |
| ผ่าน age แต่ยังไม่ตอบ consent (A-E22) | `login` → `consent` → ... | ข้อ 2 ของลำดับตัดสินมาก่อนข้อ 4 |
| มี run ค้าง (R48, A-E21) | จอ run ก่อน (กฎ "run มาก่อนเสมอ" หัวข้อ 3.2) | migration เริ่มหลังสรุป run ปิด · `firstRunEnteredAt_ms`, `lifetimeTicksGranted` ไม่ถูกแตะ |

- ไม่ลบหรือเขียนทับ `kw.p2.session`, inventory, HP, `lastSummary`, `kw.p2.settings.*`, `kw.p2.consent` (R45) · unit test ของ T12: seed ข้อมูลเดิม → เดิน migration จนจบ → key เดิมทุกตัวเท่าเดิม ยกเว้นที่ engine เขียนเองตามปกติ
- telemetry: `account_login_shown.context = first_time` สำหรับผู้เล่นเดิม (ยังไม่เคยมี account) · `relogin` เฉพาะเมื่อ `kw.p2.account` มีและ `signedIn = false` (ตอบ A-P2-F10-T05-2: client แยกได้จาก key นี้ตรงๆ)

## 6. กฎ render: จอที่มี input (P2-X59)

`render()` ของ `f04-app.ts` ถูกเรียกทุก state change (sample GPS, tick, timer) · จอ F10 ที่มี input (email login, register, forgot, ช่องชื่อ) และจอที่มีตัวเลือกค้าง (การ์ด class, slide ปัจจุบัน) ต้องทำตามกฎนี้ · tech gate T18 ตรวจ

1. **mount ครั้งเดียวต่อการเข้าจอ:** แต่ละจอเป็น controller `{ mount(root), update(view), unmount() }` · `mount` สร้าง DOM ครั้งเดียวเมื่อ route/ขั้นเปลี่ยนเข้าจอนี้ · `render()` ที่ขั้นเดิมเรียกแค่ `update(view)` · ห้าม `innerHTML =` หรือสร้าง element ใหม่ใน `update`
2. **ค่าที่ผู้เล่นพิมพ์/เลือกเป็นของ DOM หรือ controller ไม่ใช่ของ state ที่ render ส่งมา:** `update` ห้ามเขียน `input.value`, selection, focus หรือ class ที่เลือกคืนจาก state · ค่าหายเมื่อ `unmount` เท่านั้น (R11: ออกจากจอแล้วทิ้ง)
3. **ผลตัวกรองชื่อ** คำนวณใน handler `input` ของช่อง แล้วอัปเดตเฉพาะ node ข้อความเหตุผลและ `disabled` ของปุ่ม · ไม่ผ่าน `render()` ของแอป
4. **ช่อง email/password (R11):** password เป็น `type="password" autocomplete="new-password"`, อีเมล `autocomplete="off"`, `<form autocomplete="off">` ที่ไม่มี `action` และไม่มี submit จริง (ปุ่มเป็น `type="button"`) · เหตุผล: Chrome/Safari เสนอบันทึกรหัสเมื่อเห็น form submission หรือ navigation หลัง submit ซึ่งที่นี่ไม่มี · handler ปุ่มไม่อ่าน `.value` เลย · test T14: หลังกดยืนยัน `localStorage` ทุก key, ring buffer และ URL ไม่มีสตริงที่พิมพ์
5. **idempotent:** เรียก `update` ซ้ำด้วย view เดิมไม่เปลี่ยน DOM (unit test ต่อจอ นับ mutation ด้วย MutationObserver = 0)
6. class CSS ของจอใหม่ใช้แบบแผนเดิม `.xxx-screen`: `.login-screen`, `.login-email-screen`, `.register-screen`, `.forgot-screen`, `.create-character-screen`, `.story-screen`, `.coming-soon-screen`, `.bottom-nav`

## 7. Config และ schema ใหม่

### 7.1 ไฟล์และ schema

| config | schema | owner ค่า |
| --- | --- | --- |
| `config/balance/character.json` (v2 หลัง P2-H64) | `packages/shared/schemas/config/balance/character.schema.json` | systems-designer |
| `config/content/character-names.th.json` | `packages/shared/schemas/config/content/character-names.th.schema.json` | narrative-designer |
| `config/app/privacy.json` (`localData.keys`, `neverStored`, `onSignOut`) | `.../app/privacy.schema.json` | tech-lead |
| `config/app/telemetry.json` (`f10Events`) | `.../app/telemetry.schema.json` | tech-lead |

- `packages/shared/package.json` เพิ่ม subpath `./character` → `./src/character/index.ts` (T12 สร้างโฟลเดอร์) · `packages/shared/src/**` อยู่ใต้กฎ pure ของ ESLint อยู่แล้ว · client import `@keep-walking/shared/character` ได้ (ไม่อยู่ใน `CLIENT_ENGINE_BAN` เพราะไม่ใช่ engine ของรางวัล)
- ค่าตัวกรองทั้งหมดอ่านจาก config · `validateCharacterName(name, params, lexicon)` รับ `params` = ส่วน `name`/`contact`/`banned` ของ character.json และ `lexicon` ที่ caller resolve path แล้ว · ฟังก์ชันไม่ `fetch`/`import` JSON เอง · normalize ของชื่อเป็น NFC (`name.normalize.form`) ส่วน NFKC ใช้เฉพาะ `contact.detectionForm`

### 7.2 สัญญา lexicon path

character.json ชี้เข้าไฟล์ `lexiconRef` ด้วย dot path เท่านั้น ไม่ผูกชื่อ key ของ content ไว้ในโค้ด lint · field ที่เป็น path: ชื่อ `key` หรือลงท้าย `Key` (หนึ่ง path เช่น `termsKey`, `fallbackKey`, `patternKey`) และ `template` หรือลงท้าย `Keys` (list ของ path) · path ต้อง resolve เป็น string, string list หรือ object ที่ค่าทุกตัว (ยกเว้น `_*`) เป็น string list (terms แยกหมวด) · ค่าปัจจุบัน (v2): `banned.modes.*.termsKey`, `banned.allow.*.key`, `random.template[]`, `random.patternKey`, `random.fallbackKey = randomName.fallback.names`

### 7.3 กฎที่ config-lint ตรวจ (`tools/config-lint/src/character.ts`, rule `character`)

1. ทุก `{from, to}` ที่เป็น code point: `from ≤ to`
2. `name.maxGraphemes ≥ name.minGraphemes` · `contact.phone.maxDigitRun ≤ maxTotalDigits` (ช่วงค่าเดี่ยว เช่น `maxCodePointsPerGrapheme ≥ 2`, `maxAttempts ≥ 1`, `checkOrder` 11 ค่าครบไม่ซ้ำ อยู่ใน schema)
3. `lexiconRef` เป็นไฟล์ config ที่โหลดได้ · ทุก lexicon path resolve ได้
4. `random.pattern` = ค่าที่ `random.patternKey` ในคลัง
5. `banned.modes.*.pass` และ `banned.passes.*.base` ชี้ pass ที่มีอยู่
6. ทุก term และ allow entry เป็น NFC, อยู่ในชุดอักขระที่ `banned.termCharset` ชี้ และไม่ว่างหลัง pass ของตัวเอง (คำนวณจาก step ที่ลบอักขระ: `removeCodePoints`, `removeChars`, `stripCodePoints` ของ `nameNormalize` รวม base · step ที่แปลงไม่ลบ)
7. รายการ fallback ไม่ว่าง แต่ละชื่อ NFC ไม่มีช่องว่างหัวท้าย จำนวน grapheme อยู่ใน `[minGraphemes, maxGraphemes]` และอักขระอยู่ใน `name.allowed` · **การผ่าน `validateCharacterName` เต็มรูป** ตรวจใน unit test ของ T12 (lint ไม่ import โค้ดที่ยังไม่มี)
- allowlist in-flight (ไม่ fail `pnpm test`): `source-missing` 8 จุดใน `character-names.th.json` (narrative-designer) และ 5 จุดใน `banned.modes.*` / `banned.allow.*` ของ `character.json` (systems-designer) · เจ้าของเติม `_source` แล้ว entry ขึ้น STALE ให้ลบ

## 8. Telemetry

allowlist อยู่ที่ `config/app/telemetry.json#f10Events` ชื่อตรง `product/telemetry-events.md` 2b ทุกตัว · ชื่อ event ต้องเพิ่มใน `apps/client/src/telemetry/known-events.ts` ด้วย (gameplay T14 · test drift ของไฟล์นั้นจับได้อยู่แล้ว)

| event | property | ยิงที่ |
| --- | --- | --- |
| `account_login_shown` | `context`: `first_time` \| `relogin` (หัวข้อ 5) | mount จอ login หลัก (ไม่ยิงซ้ำเมื่อกลับจากจอย่อย email) |
| `account_login_method_chosen` | `method`: `google`, `apple`, `email_login`, `email_register`, `email_forgot` | ปุ่มยืนยัน (A2/A10) ก่อนเขียน account |
| `character_created` | `class_id`, `name_source` (`random` เมื่อค่าในช่องเท่ากับผลสุ่มล่าสุดทุกตัวอักษร), `filter_reject_count` bucket `0`, `1-2`, `3-5`, `6+` | A7 หลังเขียน `kw.p2.character` |
| `story_completed` | `slides_viewed_count` = จำนวน slide ต่างกันที่เห็นในรอบนี้ (reload เริ่มนับใหม่) | ปุ่ม slide 5 |
| `story_skipped` | `slide_index_at_skip` 1–4 | ลิงก์ข้าม (R27 ให้มีจริง จึง emit ใน Phase 2 · ปิด A-P2-F10-T05-3) |
| `nav_tab_opened` / `coming_soon_viewed` | `tab` | กดปุ่ม nav · สามแท็บเร็วๆ นี้ยิงคู่ที่ `at_ms` เดียวกัน |
| `account_logout` | `during_run` | หัวข้อ 4.3 ข้อ 3 หลัง `signOut()` ก่อนเปลี่ยนจอ |

- `filter_reject_count`: นับการเปลี่ยนจาก "ผ่าน" หรือ "ว่าง" เป็น "ไม่ผ่าน" ในช่องชื่อ (ไม่ใช่ทุก keystroke) · ขอบ bucket จาก `f10Events.filterRejectCountBuckets`
- funnel `onboarding_funnel_step` 6 ค่าใหม่ (`f10Events.funnelSteps`): `login_shown` คู่ `account_login_shown`, `login_method_chosen` คู่ `account_login_method_chosen`, `character_create_shown` ที่ mount จอสร้างตัวละคร, `character_create_done` คู่ `character_created`, `story_shown` ที่ mount slide 1, `story_done` คู่ `story_completed` **และ** `story_skipped` · **ยืนยัน A-P2-F10-T05-1:** คู่ยิงใน call เดียวกันที่ `at_ms` เดียวกันเสมอ · `class_select_shown`/`class_selected` ยิงเมื่อ mount จอสร้างตัวละคร / แตะการ์ด class
- ห้ามมี property ชื่อใน `f10Events.forbiddenPropertyNames` (`name`, `character_name`, `email`, `password`, ...) บน event ใด · exporter รวมรายการนี้เข้ากับ `export.forbiddenPropertyNames` · ไม่มี provider ใน funnel (R50)
- **ขัดกับเอกสาร PM:** `account_logout` ใน telemetry-events.md เขียนว่ายิง "หลังลบ `kw.p2.account`" · spec R41 และสถานะ `SignedOut` ของ spec หัวข้อ 4 ให้ key อยู่แต่ `signedIn = false` · tech note นี้ตาม spec (spec > เอกสารอื่น) → PM แก้ถ้อยคำ (หัวข้อ 11) · board แถว T17 ("logout ลบเฉพาะ `kw.p2.account`") ก็ขัดแบบเดียวกัน → build ตาม tech note นี้

## 9. Test hook และ seed e2e

### 9.1 `e2eSkipOnboarding=1` (D-130, Mock-only ตามเดิม)

พฤติกรรมเดิมคงไว้ (`currentStep()` คืน `done` · consent ตำแหน่งถือว่า granted ในหน่วยความจำ) และเพิ่มสองข้อเพื่อให้ e2e เดิม 16 ไฟล์ + `qa/tests/e2e/visual/capture-f04-f06-screens.ts` ทำงานโดยไม่ต้องแก้

1. ตอน boot ก่อน render แรก ถ้า key ยังไม่มี เขียน (ผ่าน writer ปกติของ `storage/account.ts` / `storage/character.ts`)
   - `kw.p2.account` = `{"schemaVersion":1,"savedAt_ms":<now>,"state":{"provider":"google","signedIn":true}}`
   - `kw.p2.character` = `{"schemaVersion":1,"savedAt_ms":<now>,"state":{"name":<ชื่อแรกของรายการที่ character.json#random.fallbackKey ชี้>,"storyDone":true}}`
   - ถ้ามี key อยู่แล้วไม่เขียนทับ (spec ที่ seed เองชนะ)
2. short-circuit `done` มีข้อยกเว้นเดียว: `kw.p2.account.signedIn = false` → `login` (ให้ e2e ของ logout/relogin ใช้ hook ได้) · login แล้วกลับเป็น `done`
- **class ไม่ถูก stamp:** class เป็น state ของ engine ที่เปลี่ยนได้ทาง `chooseClass` เท่านั้น · spec ที่ต้องมี class ใช้ `?e2eClassId=<id>` ตามเดิม · `qa/tests/e2e/f04-web-hooks-no-effect.spec.ts` ที่ยืนยันว่า `classId` ยัง `null` จึงยังผ่าน · ไม่มี hook ใดเขียนชื่อหรือ class ลงนอก Mock provider (unit test ของ `resolveE2e*` ขยายให้ครอบ)
- ผล: shell พร้อม → nav ล่างแสดงบนแผนที่ใน spec ที่ใช้ hook · spec ที่วัดตำแหน่งจากขอบล่างหรือภาพหน้าจออาจเลื่อน → รายการอยู่ใน T08/T16

### 9.2 seed "ผู้เล่นเดิมก่อน F10" (A-P2-F10-T08-2)

helper `apps/client/e2e/fixtures/f10-seed.ts` (gameplay-programmer สร้างใน T14 · qa import ใช้) · `seedLegacyPlayer(page, { withClass: boolean, pendingRun?: boolean })`

1. `withClass`: เปิด `?loc=mock&e2eSkipOnboarding=1&e2eClassId=tanker` หนึ่งครั้ง (ได้ `kw.p2.session` ที่มี class จาก engine จริง ไม่ต้องปลอม envelope ของ session) · `pendingRun`: เดิน trace เข้า dungeon ให้มี run ค้างก่อนข้อ 2
2. `page.evaluate`: ลบ `kw.p2.account`, `kw.p2.character` แล้วเขียน
   - `kw.p2.onboarding` = `{"schemaVersion":1,"savedAt_ms":0,"state":{"schemaVersion":1,"introSeen":true,"ageGatePassed":true,"consentAnswered":true,"firstOpenAt_ms":0}}`
   - `kw.p2.consent` = `{"schemaVersion":1,"savedAt_ms":0,"state":{"location":"granted"}}`
3. เปิดใหม่ **โดยไม่มี** `e2eSkipOnboarding` (ยังใช้ `loc=mock`) → ต้องเห็น `.login-screen` (หรือจอ run ถ้า `pendingRun`)
- `withClass: false`: ข้ามข้อ 1 (ไม่มี `kw.p2.session` เลย เท่ากับผู้เล่นเดิมที่ยังไม่เลือก class)
- assertion ของ migration: key `kw.p2.session` ก่อนและหลัง migration เทียบ `state.player.classId`, inventory, HP เท่าเดิม (R45)

### 9.3 hook อื่น

- ไม่มี hook ข้าม age gate แยก และไม่มี hook เขียนชื่อที่กำหนดเอง · spec ที่ทดสอบตัวกรองชื่อพิมพ์ผ่าน UI จริง
- seed ของ "ต่ำกว่าเกณฑ์": ไม่ต้อง seed · เดิน UI แล้วตรวจว่า `Object.keys(localStorage)` ไม่มี `kw.p2.account` / `kw.p2.character`

## 10. Failure modes

| กรณี | ผล |
| --- | --- |
| `kw.p2.account` / `kw.p2.character` corrupt หรือ schemaVersion ไม่ตรง | ถือว่าไม่มี key → `login` / `character` · ไม่ crash · ไม่ลบ key อื่น · ชื่อเดิมหายได้ (ตั้งใหม่ได้ ไม่มีผลต่อเกม) |
| storage เต็มตอนเขียน account/character | `writeWithQuotaFallback` เดิม (ตัด telemetry ก่อน) · ยังเต็ม: ถือค่าในหน่วยความจำรอบนี้ ไปขั้นถัดไปได้ · reload แล้วถามขั้นนั้นใหม่ (ไม่เสียของ) |
| หลุดระหว่าง `chooseClass` กับ `saveCharacter` (A7) | เปิดใหม่ = class ล็อก ตั้งชื่อ (หัวข้อ 2.2) |
| หลุดระหว่าง `ageGatePassed` กับ `saveAccount` (A3) | เปิดใหม่ = `login` แล้ว A2 เขียน account ทันที (ไม่ถามอายุซ้ำ) |
| ไม่มี `Intl.Segmenter` | หัวข้อ 1 · สร้างตัวละครไม่ได้ นอก baseline |
| ออฟไลน์ทุกขั้น (A-E23, A-E24) | ไม่มี network ในขั้น F10 · ไม่มีผล |
| logout ระหว่าง Grace/Suspended | หัวข้อ 4.3 · `manual_exit` ทางเดียว ไม่ไหลเป็น `timeout` |
| สองแท็บ (A-E25) | ไม่ sync สด · แท็บที่เขียนทีหลังชนะ · reload แล้วตาม step machine |
| deep link แปลก / `#/story/99` | guard 4.2 · `replaceState` ไป route ของขั้น |
| ชื่อ/อีเมลรั่วไป log | ไม่มี `console.*` ของค่าที่พิมพ์ · error report ไม่แนบ DOM value · test T15 สแกน ring buffer และ export |

## 11. Test plan hooks และงานที่ส่งต่อ

**test ที่ต้องมี (อ้างใน T08/T18)**

- unit (T12): `currentOnboardingStep` ทุกแถวของตาราง 3.1 + ทุกแถวของหัวข้อ 5 + reload ทุกขั้น (A-E2..A-E7) + ต่ำกว่าเกณฑ์ไม่เรียก writer · `isShellReady` · `parseRoute`/`resolveRoute` ทุกแถว 4.1/4.2 · storage reader ปฏิเสธ field เกินและ schema ผิด · `validateCharacterName` ผ่าน vector ทั้งหมดของ `design/systems/test-vectors/character-name.json` (อ่าน dynamic) · สุ่ม 10,000 seed ผ่านเสมอ · ทุกชื่อ fallback ผ่าน validate
- unit (T14/T15/T17): กฎ render หัวข้อ 6 ข้อ 5 · telemetry mapper ยิงคู่ funnel ที่ `at_ms` เดียวกัน · ค่า property อยู่ใน `f10Events` · ไม่มี property ต้องห้าม
- e2e: ตาม T08 · hook/seed หัวข้อ 9 · origin allowlist เดิมผ่านตอนกด Google/Apple
- config-lint: `tools/config-lint/test/character.test.ts` (มีแล้ว)

**ส่งต่อ**

- backend-programmer (T12): step machine 3.2, `nav/routes.ts` (pure) ถ้าตกลงกับ gameplay ว่าอยู่ใน T12 · `packages/shared/src/character/` ตาม 7.1
- gameplay-programmer (T14/T15/T17): wiring หัวข้อ 3.3, 4, 6, 8, 9 · `known-events.ts` เพิ่ม 8 ชื่อ · `f10-seed.ts`
- qa-tester (T08/T16/T19): hook และ seed หัวข้อ 9 · class CSS หัวข้อ 6 ข้อ 6
- narrative-designer: เติม `_source` ใน `character-names.th.json` 8 จุด (allowlist 7.3)
- systems-designer: เติม `_source` ใน `banned.modes.*`, `banned.allow.*` 5 จุด
- product-manager: แก้ถ้อยคำ `account_logout` ("หลังปลดธง signed in" ไม่ใช่ "หลังลบ key") · ปิด A-P2-F10-T05-1, -2, -3 (หัวข้อ 5, 8)
- game-director: spec R18 ข้อ 1 อ้าง `name.minLength`/`maxLength` → เป็น `minGraphemes`/`maxGraphemes` (D-150 หัวข้อ 1 ข้อ 6)
- orchestrator: board แถว T17 "logout ลบเฉพาะ `kw.p2.account`" ขัด spec R41 → ใช้ "ปลดธง signed in"
