# Design gate F06 — HP, Damage และ 10 นาทีแรก + regression F04/F05 + ความพร้อมของ loop ก่อน playtest

Task: P2-F06-T24 · ผู้ตรวจ: game-director · รอบ: 1 · วันที่: 2026-09-30
Spec ที่ตรวจ: `design/features/F06-hp-damage-onboarding.md` · flow `design/ux/flows/F06-hp-damage-onboarding.md` (หัวข้อ 4, 6, 15–20) · build ที่ HEAD `9650ee3`
ฐาน: tech gate รอบ 2 PASS (`docs/reviews/F06-tech-gate.md` R2.6) · copy gate รอบ 2 PASS (`design/reviews/F06-copy-gate.md` 9) · QA gate PASS (`qa/reports/F06-qa-gate.md` 10) · visual gate รอบ 3 PASS (`art/reviews/F04-F06-visual-gate.md` 8)

| รายการ | ผล |
| --- | --- |
| **verdict** | **NEEDS_CHANGES** |
| finding blocking | 1 ข้อ (DG6-01: popup confirm ไม่แสดง HP ปัจจุบันและคำบอกว่า hit แรกจะพากลับ ตาม F06-R05 และ flow C9/C10) |
| ข้อสังเกต non-blocking | 4 ข้อ (DG6-02 ถึง DG6-05) |
| E8 (ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก) | ผ่าน (หัวข้อ 2) |
| กฎคู่ NN-8, บทลงโทษต่ำ, ยาจาก drop, ก้อนแรก = tick ปกติ | ผ่าน (หัวข้อ 3) · ช่องว่างเดียวคือ DG6-01 ซึ่งเป็นเงื่อนไขที่คำตัดสิน "เข้าได้ทุก HP > 0" พึ่งอยู่ |
| regression F04/F05 + O-3 + เงื่อนไขหัวข้อ 8 ของ gate F04+F05 | ผ่าน (หัวข้อ 6) |
| คำตัดสิน 4 ข้อจาก board row | หัวข้อ 5 |

## 0. สรุป

loop F04–F06 บน build จริงถือเจตนาของเกมครบเกือบทั้งหมด: ของทุกชิ้นมาจาก tick ที่ผ่าน gate ตัวเดียว, auto-retreat เปิดเป็นค่าเริ่มต้นและล็อกด้วย schema, ตายเสียเฉพาะของใน run, ก้อนแรกเป็น tick ปกติ, 10 นาทีแรกไม่มีทางไปหน้าระบบห้ามสอน, ไม่มีจำนวนคน ไม่มีช่องพิมพ์ ไม่มีตำแหน่งรายคน

ข้อที่ไม่ผ่านมีข้อเดียว และตรงกับหัวใจของ gate นี้ (บทลงโทษต่ำเมื่อต้นทุนการเดินทางสูง): popup confirm (`apps/client/src/ui/dungeon-confirm.ts`) ไม่ render `dungeon.confirmHp` และ `dungeon.confirmLowHpNote` เลย (Grep `confirmHp|confirmLowHpNote|hpPct` ใน `apps/client/src` พบเฉพาะ `pocket-screen.ts`) และภาพ `05-confirm-b1-ready.png` มีแค่ชื่อโซน ช่วงเลเวล และปุ่ม · คำตัดสินข้อ 6 ของ spec ("เข้า run ได้ทุก HP > 0 ... ผลตามธรรมชาติคือ hit แรกพากลับ **ซึ่ง popup บอกล่วงหน้า**") และ F06-R14 ("ไม่แจ้งตอนเข้า run ที่ HP ต่ำกว่าเส้นอยู่แล้ว" เพราะบอกไว้แล้วที่ popup) พึ่งข้อความนี้ทั้งคู่ · ใน playtest กรณีนี้เกิดง่าย: ผู้เล่นถูกพากลับที่ 25% ขณะยืนอยู่ใน dungeon แล้วกดเข้าใหม่ทันที HP ยังไม่ถึง 30% (ฟื้นราว 1.67% ต่อนาทีตาม `config: progression.hpRecovery.*`) hit แรกพากลับอีกครั้งโดยไม่มีอะไรบอกล่วงหน้า ซึ่งคือความรู้สึก "มาถึงแล้วเล่นไม่ได้" ที่หลักการข้อ 3 ห้าม

ขนาดงานแก้เล็ก (หนึ่ง element และ copy key ที่มีอยู่แล้วสองตัว) และไม่แตะกฎหรือค่าใดของเกม

## 1. ขอบเขตและวิธีตรวจ

- gate นี้ตรวจเจตนาเกม ไม่รัน test ซ้ำ · ใช้ผลรันของ QA gate (`pnpm test` 3065 ผ่าน, e2e 92/92) และ tech gate รอบ 2 เป็นฐาน
- ตรวจเองในโค้ด: Grep ทางที่ให้ของ (`bagAdd(`, `inventory[`, `grantTick(`) ใน `packages/shared/src`, ทาง unlock และ copy ของระบบห้ามสอนใน `apps/client/src`, element ที่รับข้อความพิมพ์ (`createElement('input'|'textarea'|'select')`), คำค้นจำนวนคน, การจัดการ `run_auto_retreat`/`run_death`/`run_tick_granted` ใน `f04-app.ts:1244-1312`, `art/vfx/core/vfx.ts#play`, `config/balance/dungeons.json`, `config/balance/unlocks.json`
- ดูภาพเอง: `05-confirm-b1-ready`, `13-pocket`, `16-summary-death`, `17-summary-autoretreat` (ภาพ 16/17 ถ่ายก่อน X52 ปุ่มจึงยังไม่เหลือง ซึ่ง R2-3 ปิดแล้วในภาพ 15)
- หัวข้อ GDD ที่ใช้: "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง", "10 นาทีแรกของคนใหม่", "HP การตาย และการฟื้นฟู" (damage มาจากไหน, ระบบกันตาย, เมื่อตาย, ข้อความที่ผู้เล่นเห็น, ผลข้างเคียงที่ตั้งใจ), "หลักการที่ห้ามละเมิด", "สิ่งที่ตัดออกจาก v1 โดยตั้งใจ"

## 2. E8 — ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก (หลักฐานหลัก)

รายการห้ามสอนของ GDD: ตลาด, ตีบวก, raid, การลงแต้ม stat, เปลี่ยน class, กลไก party ละเอียด, anti-cheat, lore ยาว (pillars 6.2 U1–U8) · ร้าน NPC ไม่ใช่ระบบห้ามสอนแต่เลื่อนไปหลังจบ run แรก (D-065)

| ระบบ | เงื่อนไขปลดใน `config/balance/unlocks.json` | สิ่งที่ build มี | ผล |
| --- | --- | --- | --- |
| U1 ตลาด | `market` L8 + 1 run | ไม่มีจอ ไม่มี copy key `market.*` ถูกเรียก | ผ่าน |
| U2 ตีบวก | `enhance` L5 + 1 run | ไม่มีจอ · `inventory-screen.ts:6` ระบุว่าไม่มีปุ่มตีบวก | ผ่าน |
| U3 raid | `raid` L5 + 3 run | ไม่มีจอ ไม่มี push | ผ่าน |
| U4 ลงแต้ม stat | `statAllocation` L3 + 1 run | ไม่มีจอ · เลเวลขึ้นไม่ชี้ไปแต้ม (QA acceptance 11, R33–R34) | ผ่าน |
| U5 เปลี่ยน class | `classChange` L10 + 3 run | ไม่มีปุ่ม · Phase 2 เปลี่ยนได้ทางเดียวคือลบข้อมูล (R30) | ผ่าน |
| U6 party ละเอียด | `partyDetail` L3 + 1 run + 1 join | ไม่มี party ใน Phase 2 · การ์ด class หนึ่งบรรทัดไม่มี % (R32, copy gate) · `party.empty` ไม่ถูกเรียก | ผ่าน |
| U7 anti-cheat | `antiCheatHelp` L10 + 3 run หรือเหตุการณ์ | speed lock แสดงเมื่อเกิดจริง ถ้อยคำไม่อธิบายวิธีตรวจ (gate F04+F05 3.1) · ไม่มีหน้าช่วยเหลือ | ผ่าน |
| U8 lore | `lore` L1 + 1 run | intro ประโยคเดียว (`18-intro`) · ไม่มีจอ lore | ผ่าน |
| ร้าน NPC | `npcShop` L1 + 1 run | ไม่มีร้าน ไม่มี gold ใน Phase 2 | ผ่าน |

- Grep `'(market|enhance|raid|stat|statAlloc|classChange|party|lore|shop|npc|anticheat\.help)\.` ใน `apps/client/src` (ไม่รวม test) ไม่พบ
- `config/unlocks-teach-lock.ts` เป็น wiring ล่วงหน้าเท่านั้น ไม่มีจอใดเรียก และระบุว่าเงื่อนไขเลเวล/จำนวน run ของ `unlocks.json` ยังใช้ซ้อนอยู่เมื่อจอพวกนั้นมาจริง · ข้อความนี้ต้องคงไว้ใน Phase 4 (การปลดตาม `firstRewardDone` อย่างเดียวจะเร็วเกิน L3/L5/L8) · บันทึกให้ tech gate F10–F12 ตรวจ ไม่ใช่ finding ของ Phase 2
- ลำดับ onboarding จริง intro → age → consent → priming → map → class → รอยแยกที่ครอบเลเวล → confirm → บรรทัดเดียว "เดินต่อไปเพื่อรับรางวัล" → tick แรก ตรงตาราง 3.8 (`onboarding.spec.ts` ในหัวข้อ 5 ของ QA gate) · บทเรียนมีบรรทัดเดียวทั้งเกม ไม่มี tooltip HP bar (flow C1)
- สิ่งที่นาที 0–10 **สอนโดยไม่ตั้งใจ** ที่ตรวจเพิ่ม: HP bar, แจ้ง 30%, ยาอัตโนมัติ และ auto-retreat ทำงานตั้งแต่ run แรกด้วย copy สามจังหวะ ไม่มีจออธิบาย (R41) · ไม่อยู่ในรายการห้าม ผ่าน

**ผล E8: ผ่าน** · product gate (P2-F06-T25) ใช้หัวข้อนี้เป็นหลักฐานหลักคู่กับ QA gate หัวข้อ 2 ได้

## 3. กฎคู่ NN-8, บทลงโทษต่ำ, ยาจาก drop, รางวัลก้อนแรก

### 3.1 movement gate กับ auto-retreat อยู่ด้วยกัน (GDD "ผลข้างเคียงที่ตั้งใจ")

| ฝั่ง | หลักฐาน | ผล |
| --- | --- | --- |
| gate ไม่อ่อนลง | `dungeons.json:59-65` (`comparison` greaterThan, `appliesTo` dungeon + raid, `exceptions` []) · schema ปฏิเสธการผ่อน (`tools/config-lint/test/schema.test.ts:40-47`) · F06 ไม่เพิ่มทางให้ของใหม่ (หัวข้อ 3.3) | ผ่าน |
| auto-retreat เปิดเป็นค่าเริ่มต้น | `dungeons.json:81` true · schema ปฏิเสธ false (`schema.test.ts:45`) · ผู้เล่นใหม่ `autoRetreatEnabled` อ่านจาก config (`session/types.ts:220`) · ลบข้อมูลในเครื่องคืนเป็นเปิด (R22, QA acceptance 7) | ผ่าน |
| ปิดได้ทางเดียว | หน้าย่อย "การเดินและความปลอดภัย" + popup ยืนยัน · ไม่มีทางปิดจากจอ run/พกกระเป๋า/onboarding (`f06-hp.spec.ts`) · ป้ายค้างขณะปิดบนจอ run (`hp-bar.ts:93`) | ผ่าน (ป้ายบน S-02 ขาด → รวมใน DG6-01) |
| เปิด auto-retreat ตายไม่ได้ | QA acceptance 3 (26 vector + ไม่มี trace จบ `death`) | ผ่าน |
| การตีไม่ผ่าน gate | ตั้งใจ: gate คุม**รางวัล** ไม่ใช่ damage (QA 6) · การตีนับเฉพาะเวลา Active ไม่ lock ไม่มีการตีขณะเล่นไม่ได้ (R06–R07) | ผ่าน |

ไม่มีการเปลี่ยนใดใน F06 ที่ทำให้ auto-retreat อ่อนลง จึงไม่ต้องประเมินผลต่อ gate เพิ่ม (spec 2 ข้อ 5)

### 3.2 บทลงโทษต่ำ

- ทุก exit_reason เก็บของครบ ยกเว้น `death` (`reducer.ts:401-405` `KEEPS_LOOT`) · ตายเสียแค่ของใน run exp อยู่ เลเวลไม่ลด ยาใน inventory ที่ยังไม่ใช้อยู่ (`reducer.ts:407-426`, QA 8) ตรง GDD "เมื่อตาย" ข้อ 1
- ยาอัตโนมัติใช้ถุงของ run ก่อน (ของที่จะหายถ้าตาย) ตามคำตัดสินข้อ 4 ของ spec
- หน้าสรุปตายและถอยแสดง canon เต็มใต้หัวข้อ (`16`, `17`) ตรง B-01 · ตายไม่มีปุ่มชวนใช้ยาหรือจ่ายอะไร
- ออกได้ทุกเมื่อไม่ต้องเดินออก ของครบ (R28) · Recovering ไม่บล็อกการเข้า (R27)
- ช่องว่าง: ข้อมูลที่ผู้เล่นต้องใช้ตัดสินใจก่อนเข้าด้วย HP ต่ำไม่มีบนจอ → DG6-01

### 3.3 ยามาจาก drop ที่ผ่าน gate เท่านั้น

- `bagAdd` มีผู้เรียกจุดเดียวใน `grantTick` (`reducer.ts:229`) · `grantTick` ถูกเรียกเฉพาะหน้าต่างที่ผ่าน (`reducer.ts:295`) และ tick บางส่วนของ D-059 (`reducer.ts:363`) ซึ่งผ่าน `passesGate` ตัวเดียวกัน
- inventory เพิ่มได้ทางเดียวคือโอนถุงตอนจบ run (`reducer.ts:404`) · ลดได้ทางยาอัตโนมัติและใช้เองนอก run (`reducer.ts:531`, `hp/regen.ts:78`)
- ผู้เล่นใหม่ `inventory: {}` (`session/types.ts:221`) ไม่มีชุดยาตั้งต้น ไม่มีร้าน

### 3.4 รางวัลก้อนแรก = tick ปกติ

- `firstEver` เป็นธงอ่านอย่างเดียว เลือกได้แค่ copy/effect/เสียง (`tick-toast.ts:143-158`) · telemetry ก้อนแรกยิงเป็น record ที่สอง ไม่แทนของเดิม (tech gate F06-TG-02)
- QA acceptance 13 เทียบของ tick แรกกับ tick ที่สองด้วย seed เดียวกัน · ไม่มีของแถม ไม่เร่ง tick ไม่ลดเกณฑ์
- จังหวะที่จอพกกระเป๋าบัง toast ก้อนแรก (C6-10) ยอมรับตามคำตัดสิน H39 (หัวข้อ 5 ข้อ 3) · `O-done` ไม่ขึ้นกับการเห็น toast

## 4. จำนวนคน, ตำแหน่ง, แชท, PvP, v1 cut list

- Grep `playerCount|playersIn|occupan|partySize|roleCount|nearbyPlayers|otherPlayers` ใน `apps/client/src` ไม่พบ · QA acceptance 16 (รวม 0 และ placeholder) · popup confirm, จอ run, จอพกกระเป๋า, หน้าที่บ้านไม่มีตัวเลขคน (ภาพ `05`, `13`, `17`)
- `home.outOfAreaCountZero` และ `party.empty` ไม่ถูกเรียก · body ของการ์ดนอกย่านเปิดตัวไม่บอกว่ามีหรือไม่มีคน (D-126)
- element รับข้อความมีแค่ `select` ของ age gate (เลือก ไม่พิมพ์), `input` read-only ของทางสำรองคัดลอกลิงก์นำทาง (`nav-panel.ts:181-186`) และแผง debug · ไม่มีช่องพิมพ์อิสระ
- ไม่มี AR, ในอาคาร, แชท, avatar 3D, PvP

## 5. คำตัดสิน 4 ข้อจาก board row

### 5.1 auto_retreat/death ใช้ "ค้างจอ run จน effect จบแล้วเปิดสรุป" แทน crossfade — **ยอมรับ**

- สิ่งที่ build ทำ (`f04-app.ts:1270-1312`, `1361-1366`): ปรับ HP bar เป็นค่าจริงของ hit สุดท้าย เล่น cue เสียง แล้วค้างจอ run ระหว่าง effect (`run.autoRetreat` 700 ms, `run.death` 720 ms ตาม `art/vfx/hp-critical/timing.json`) จากนั้นเปิดหน้าสรุปซึ่งมี canon เต็มใต้หัวข้อ
- เจตนาของ flow C4/C6 คือ "สัญญาณสั้นครั้งเดียว แล้วไปหน้าสรุปทันที และ canon ต้องอยู่บนจอที่ดูได้ทุกเมื่อ" · ทั้งสามอย่างครบ · crossfade 350 ms เป็นเรื่องผิวของภาพ ไม่เปลี่ยนสิ่งที่ผู้เล่นรู้ ได้ หรือเสีย และ visual gate PASS แล้วกับพฤติกรรมนี้
- จอถูกซ่อน effect ถูก cancel และ promise ยัง resolve (`vfx.ts:147-152`, `174-177`) จึงไม่ค้าง · เหลือจุดเปราะหนึ่งจุด: effect id ที่ไม่ได้ลงทะเบียนคืน promise ที่ reject (`vfx.ts:121-127`) และ `.then` จะไม่เปิดหน้าสรุปเลย ทั้งที่ run จบแล้ว → DG6-03 (ไม่ blocking เพราะ id ทั้งสองลงทะเบียนแล้วและ e2e ผ่าน)
- crossfade จริงเป็นทางเลือกของ art-director ใน content gate ถัดไป ไม่ใช่เงื่อนไขของ design

### 5.2 ช่องว่างเลเวล 9–19: แจ้ง 30% กับถอย 25% เกิดใน hit เดียว — **ยอมรับใน Phase 2 · ไม่ใช่ finding ของ systems หรือ gameplay · เป็นหมายเหตุ playtest และต้องแก้เอกสารสนามหนึ่งจุด (DG6-02)**

เหตุผลตามหลักการ GDD ตามลำดับ
1. หลักการข้อ 1, 2 ไม่เกี่ยว (ไม่มีของเข้า ไม่แตะ gate)
2. หลักการข้อ 3: hit นั้นจบด้วยการถอยที่เก็บของครบ ผู้เล่นไม่เสียอะไร · คำเตือน 30% มีไว้ "ให้โอกาสตัดสินใจเอง" (GDD "ระบบกันตาย") ก่อนระบบตัดสินแทน ถ้า hit เดียวข้ามทั้งสองเส้น ระบบตัดสินทางปลอดภัยที่สุดไปแล้ว ไม่มีการตัดสินใจเหลือให้ผู้เล่น · การแสดงสัญญาณเดียว (auto-retreat) คือ F06-R16 และ F05-R18 ข้อ 5 ที่ตั้งใจไว้ ไม่ใช่บั๊ก และ engine ส่งแค่ event เดียวต่อ hit (`f04-app.ts:1262-1267`)
3. GDD "damage มาจากไหน": "เดินเข้าโซนเลเวล 40 ตอนตัวเองเลเวล 12 ก็เจ็บตามระเบียบ ไม่มีใครมาปรับให้" · ช่วงเลเวลไม่บล็อกการเข้า (F04-R32) และ onboarding ไม่แนะนำแห่งที่ไม่ครอบเลเวลในทุกกรณี (R37, D-116) · ผู้เล่นจะเจอกรณีนี้เฉพาะเมื่อเลือกเดินเข้าเอง
4. ห้ามแก้ด้วยการลดเกณฑ์, ขยายช่อง 30/25, หรือเพิ่มเพดานตัวคูณห่างเลเวล (NN-8, pillars Q5, R43) · ไม่เปิดงาน systems-designer

สิ่งที่ต้องทำ
- `design/levels/F06-C32-team-walk-dungeon.md` หัวข้อ 0 (บันทึกสำคัญ) สั่งให้บันทึกเป็นบั๊ก "ถ้าจอไม่แสดงคำเตือน 30% เลยและกระโดดตรงไป auto-retreat" ซึ่ง**ขัด F06-R16** ทีมเดินจะบันทึกบั๊กปลอม ต้องแก้ก่อนนัดเดิน C32 (DG6-02)
- ผลต่อ C32: ที่ `mahakan-fort`/`pak-khlong-talat` ทีมจะยืนยันได้แค่สัญญาณ auto-retreat บนเครื่องจริง ไม่ได้ยืนยันสัญญาณ 30% · ทางที่ใช้ config จริงและไม่ทำ build พิเศษ (P-3 ข้อ 5): หลังถูกพากลับ รอฟื้นนอก run จน HP ขึ้นเหนือ 30% ราว 5–10 จุด (อ่านจากจอ Recovering/HP) แล้วเข้า dungeon ที่**ช่วงเลเวลครอบเลเวลผู้เล่น** · damage ต่อ hit ในช่วงที่ครอบเล็กพอให้ hit ถัดไปลงผ่าน 30% โดยยังไม่ถึง 25% จึงเห็นคำเตือนแยก (DG6-02)
- playtest: คำถามเดิมใน spec 11 ("ผู้เล่นสังเกตแจ้ง 30% ได้ไหมตอนมือถืออยู่ในกระเป๋า") ให้ kit ผู้สังเกตบันทึกด้วยว่า run นั้นอยู่ในช่วงเลเวลที่ครอบหรือไม่ เพื่อไม่อ่าน "ไม่เคยได้ยินคำเตือน" ของคนที่เดินเข้าดันเลเวลสูงเป็นปัญหาของสัญญาณ (DG6-04)

### 5.3 H39 cue บนจอพกกระเป๋า = เสียง + สั่น + ตัวเลขบนจอ ไม่มี toast — **รับทราบและยืนยัน**

- ตรง P4 "มือถืออยู่ในกระเป๋า": มือถือในกระเป๋ามองจอไม่เห็นอยู่แล้ว ช่องทางที่ถึงตัวผู้เล่นจริงคือเสียงและสั่น และตัวเลข HP/รอบถัดไปของจอพกกระเป๋า (`13-pocket`) บอกผลทันทีที่หยิบขึ้นมาดู
- cue ความปลอดภัยสี่ตัว (`run.death`, `run.autoRetreat`, `run.hpLow`, `anticheat.speedLock`) ไม่ถูกทิ้งเพราะค้างนาน (`assets/audio.ts:17-22, 51-54`) จึงไม่มีทางที่คำเตือนหายเงียบบนจอพกกระเป๋า
- iOS บนเว็บไม่มีสั่น เหลือเสียงอย่างเดียวในกระเป๋า · ห้ามชดเชยด้วยการลดเกณฑ์หรือปิด auto-retreat (R15) · เป็นคำถาม playtest เดิมแยก Android/iOS
- ผลเดียวกันกับ toast ก้อนแรก (C6-10) ยอมรับตามเหตุผลเดิมของ uiux (flow E1)

### 5.4 รายการไม่บล็อกใน P2-X47 — **ไม่มีข้อใดต้องบล็อก playtest**

| รายการ | กระทบ loop ไหม | ผล |
| --- | --- | --- |
| C6-06 ชิประยะใต้ `home.farBody` | ระยะยังอยู่ในประโยค body และปุ่มนำทางเด่นสุดอยู่แล้ว | ไม่บล็อก |
| C6-07 บรรทัด run ล่าสุด (หัวข้อ/เวลา/ชื่อ) | ข้อมูลย้อนหลังที่บ้าน ไม่อยู่ใน loop เดิน | ไม่บล็อก |
| TG-11 `DEFAULT_STALE_AFTER_MS`/`SAFETY_CUE_IDS` เข้า config | สุขอนามัย config · พฤติกรรมถูกแล้ว cue ความปลอดภัยไม่ถูกทิ้ง | ไม่บล็อก |
| V-40 (รวมวงกลมเปล่าใน `01`), V-41 ไอคอน `icon.ui.hp-low`, V-42 toggle | ภาพ · ข้อความ canon และสั่น/เสียงของ hpLow ทำงานครบ | ไม่บล็อก |
| N2-02 toast อื่นทับ `run.screenLockNotice` ใน 4 วินาทีแรก | ช่วงนั้นไม่มี hit ที่ทำ HP ต่ำได้จริง | ไม่บล็อก |
| R2-N2/N3/N4, comment `settings-menu.ts`, copy follow toggle | test และ comment | ไม่บล็อก |
| loop=1 ของ Mock จบ run ด้วย `clock_invalid` | trace วนกลับจุดเริ่ม = เวลาของ sample ถอยหลังใน Mock · playtest ใช้ GPS จริงซึ่งเวลาเดินหน้าเสมอ · ขอให้ X47 ยืนยันว่าเป็นผลของ timestamp ใน Mock ไม่ใช่การกระโดดตำแหน่ง ถ้าเป็นการกระโดดตำแหน่งให้ส่งกลับ game-director ก่อน playtest (DG6-05) | ไม่บล็อก |

## 6. Regression F04/F05 และเงื่อนไขหัวข้อ 8 ของ gate F04+F05

| เงื่อนไข | หลักฐาน | ผล |
| --- | --- | --- |
| 8.1 P2-H30 พลิก `it.fails` | `qa/tests/F04/session-checkin-lifecycle.test.ts:42` เป็น `it` แล้ว (P2-F06-T17) | ปิด |
| 8.2 F-16 (J-10) ม้านั่ง/โต๊ะนิ่ง | ยังรอ jitter เครื่องจริง P2-C03 · ไม่มีการแตะ 50 ม./5 นาที (`dungeons.json:61-62`) | ยังยืน ไม่ใช่ finding |
| 8.3 `pendingSetMax_s` ใน spec F08 | เงื่อนไขของ Phase 3 | ยังยืน |
| 8.4 regression F04/F05 | QA gate: `qa/tests/F04`, `qa/tests/F05` และ e2e ที่เกี่ยวข้องเขียวในรอบเต็ม · gate เดียวครอบทุกทางที่ให้ของยังจริง (หัวข้อ 3.3) · speed lock ยังล็อก ไม่มี damage (`f04-app.ts:1568-1572`) | ปิด |
| O-1 `speedLock.action` | schema เป็น `const: "lockPlay"` (`anticheat.schema.json:36-38`) | ปิด |
| O-2 สั่นสองครั้งตอนเข้า lock | เหลือแหล่งเดียวใน `speed-lock-overlay.ts:47` (`f04-app.ts:1568`) | ปิด |
| **O-3** ก้อนแรกจาก tick บางส่วนของ D-059 | flow F05 A2b/หัวข้อ 12 และ flow F06 หัวข้อ 17 ระบุแล้ว · build: `run_tick_granted` ที่มาพร้อม `dungeon_exited` ใน batch เดียวกันไม่เรียก `showGranted` (`f04-app.ts:1244-1257`, H34 `exitsInSameBatch`) · หน้าสรุปแสดงของและป้าย tick บางส่วน (`run-summary.ts:135`) · `O-done` ตั้งจาก `firstEver` ตามปกติ ของเท่า tick ปกติ | ปิด |
| O-4 สถานะ spec F04/F05 และชื่อ key | งานเอกสารของ game-director เอง นอก writes ของงานนี้ · ไม่กระทบ build | ค้าง ไม่ blocking |
| จอพกกระเป๋า (8.4) | หัวข้อ 5.3 | ผ่าน |

## 7. ภาพรวม loop ก่อน playtest

| จังหวะของผู้เล่น | สิ่งที่ได้จาก build | ผล |
| --- | --- | --- |
| เปิดแอปที่บ้าน | intro, age, consent, priming, class ไม่ถึงนาที · สถานะไกล/นอกพื้นที่/นอกย่าน/ไม่รู้ตำแหน่งมีสิ่งให้ทำ ไม่มีจอว่าง | พร้อม |
| เดินไปถึง | ระยะเส้นตรงปัดขึ้น + ปุ่มนำทาง · แนะนำเฉพาะแห่งที่เปิดและครอบเลเวล | พร้อม |
| ตัดสินใจเข้า | popup มีชื่อ ช่วงเลเวล สถานะ check-in **แต่ไม่มี HP และคำบอกเมื่อ HP ต่ำ** | **ไม่พร้อม (DG6-01)** |
| เดินใน run | บรรทัดเดียว, จอพกกระเป๋า, tick ทุก 5 นาทีแยกผ่าน/ไม่ผ่านด้วยสั่นและเสียง | พร้อม |
| โดนตี / HP ต่ำ / ถอย / ตาย | สัญญาณครั้งเดียวต่อเหตุ, canon บนหน้าสรุป, ของครบยกเว้นตาย | พร้อม |
| กลับบ้าน | Recovering พร้อมเวลา, ใช้ยานอก run, สรุป run, export telemetry ไม่มีพิกัด | พร้อม |

หลังแก้ DG6-01 loop พร้อมสำหรับ playtest ในมุม design

## 8. Findings และ handoffs

### DG6-01 (blocking: yes) — popup confirm ไม่แสดง HP ปัจจุบัน คำบอกเมื่อ HP ต่ำ และป้ายถอยอัตโนมัติปิด

- ที่มา: F06-R05 ("popup confirm แสดง HP ปัจจุบัน และถ้า HP ≤ `config: dungeons.hpSafety.autoRetreatThreshold_pct` ขณะเปิด auto-retreat บอกว่าโดนตีครั้งแรกจะถูกพากลับ"), flow F06 C9 (A8) และ C10 (ป้าย `run.autoRetreatOffBadge` บน S-02 แทน `confirmLowHpNote` เมื่อปิด auto-retreat), คำตัดสินข้อ 6 ของ spec, F06-R14
- ที่พบ: `dungeon-confirm.ts` ไม่เรียก `dungeon.confirmHp`, `dungeon.confirmLowHpNote` หรือ `run.autoRetreatOffBadge` · ภาพ `05-confirm-b1-ready.png` ไม่มีแถว HP · copy key ทั้งสามมีอยู่แล้วใน `copy.th.json:187-188` และผ่าน copy gate แล้ว
- สิ่งที่ต้องได้: (1) แถว `dungeon.confirmHp` ทุกครั้งที่ popup เปิด ค่าจาก `selectPlayerView` ไม่คำนวณเอง (2) `dungeon.confirmLowHpNote` ใต้แถว HP เมื่อ HP ≤ `autoRetreatThreshold_pct` และ auto-retreat เปิด (3) เมื่อ auto-retreat ปิด แสดงป้าย `run.autoRetreatOffBadge` ทรง `.banner.warn` แทนข้อ 2 (4) ไม่บล็อกปุ่ม "เข้า" ในทุกกรณี (R05) ไม่เพิ่มปุ่มหรือ popup ใหม่
- owner: gameplay-programmer (build) · qa-tester (e2e ครอบสามกรณี: HP เต็ม, HP ≤ 25% เปิด auto-retreat, ปิด auto-retreat) · art-director ตรวจตำแหน่งจากภาพใหม่ของ popup ในรอบ gate ซ้ำได้ แต่ไม่ใช่เงื่อนไขของ design

### DG6-02 (blocking: no · ต้องแก้ก่อนนัดเดิน C32) — เอกสารสนามขัด F06-R16

- `design/levels/F06-C32-team-walk-dungeon.md` หัวข้อ 0 ให้บันทึกเป็นบั๊กเมื่อไม่เห็นคำเตือน 30% ก่อนถอย · ตาม R16 เมื่อ hit เดียวข้ามทั้งสองเส้น ผู้เล่นได้สัญญาณเดียวคือ auto-retreat · owner: level-designer (แก้ข้อความ) และ qa-tester (`qa/plans/F06-test-plan.md` 8.2–8.4: เพิ่มขั้นยืนยันคำเตือน 30% แยกด้วยการฟื้นนอก run จนเหนือ 30% แล้วเข้าแห่งที่ครอบเลเวล ตามหัวข้อ 5.2 · เกณฑ์ใหม่: hit เดียวข้ามทั้งสองเส้นแล้วเห็นแต่ auto-retreat = ถูกต้อง)

### DG6-03 (blocking: no · P2-X47) — หน้าสรุปพึ่ง `.then` ของ effect

- `f04-app.ts:1285-1288, 1309-1312` เปิดหน้าสรุปใน `.then` ของ `play()` · ถ้า effect id ไม่ถูกลงทะเบียน promise reject และผู้เล่นค้างบนจอ run ที่จบแล้ว · ขอให้ใช้ `.finally` (หรือ `.then(f, f)`) ให้หน้าสรุปเปิดเสมอ · owner: gameplay-programmer

### DG6-04 (blocking: no) — kit ผู้สังเกตและแบบสอบถามแยก run ในช่วงเลเวลที่ครอบ

- บันทึกต่อ run ว่าช่วงเลเวลครอบเลเวลผู้เล่นหรือไม่ และผู้เล่นเข้าแห่งนอกช่วงเองกี่ครั้ง · ใช้อ่านคำตอบเรื่องคำเตือน 30% และความรู้สึก "ถูกพากลับเร็วเกิน" · owner: product-manager (แบบสอบถาม P2-F06-T19), qa-tester (kit P2-F06-T18)
- ถ้า playtest พบว่าผู้เล่นเดินเข้าดันเลเวลสูงโดยไม่รู้ตัวบ่อย ให้ส่งกลับ game-director พิจารณาแสดงเลเวลของผู้เล่นคู่กับ `dungeon.confirmLevel` ใน Phase 3 (ข้อมูล ไม่ใช่การบล็อก) · ไม่ใช่งานก่อน playtest

### DG6-05 (blocking: no · P2-X47) — ยืนยันที่มาของ `clock_invalid` จาก Mock loop=1

- ถ้าเป็นเวลาของ sample ถอยหลังจากการวน trace ไม่มีงานเพิ่ม · ถ้าเป็นการกระโดดตำแหน่งที่ไหลเป็น `clock_invalid` ให้ส่งกลับ game-director ก่อน playtest · owner: gameplay-programmer

## 9. คำตัดสินในเอกสารนี้

- ยอมรับ "ค้างจอ run จน effect จบแล้วเปิดสรุป" แทน crossfade (หัวข้อ 5.1) · หลักการข้อ 3 ไม่กระทบ (canon และของครบบนหน้าสรุป)
- ยอมรับพฤติกรรมสัญญาณเดียวเมื่อ hit เดียวข้ามเส้น 30% และ 25% ที่ช่องว่างเลเวล 9–19 เป็นพฤติกรรมตั้งใจของ R16 ไม่เปลี่ยนค่าใด (หัวข้อ 5.2) · ไม่มีข้อใดแก้ GDD หรือ config

## 10. เกณฑ์ปิด gate ในรอบซ้ำ

รอบซ้ำตรวจเฉพาะ DG6-01: (1) โค้ด `dungeon-confirm.ts` แสดงสามสถานะตามข้อ "สิ่งที่ต้องได้" ค่าจาก engine (2) e2e ของ qa เขียวทั้งสองโปรเจกต์ครอบสามกรณี (3) ภาพ popup ใหม่อย่างน้อยกรณี HP ≤ 25% (4) ไม่มีการเปลี่ยนกฎ, config หรือ copy key อื่น · DG6-02 ถึง DG6-05 ไม่ใช่เงื่อนไขของรอบซ้ำ
