# F03 Content Gate (copy) — P1-F03-T21

- ผู้ตรวจ: narrative-designer (เจ้าของ copy ตาม protocol ข้อ 6) · design gate A (P1-F03-T24) ตรวจซ้ำอีกชั้น
- วันที่: 2026-09-23
- ขอบเขต: `config/content/copy.th.json` (229 key บรรทัด 96–324), `config/content/copy-rules.json`, `config/content/names.th.json`, ข้อความไทยใน `design/ux/wireframes/*.html`, `design/ux/components.md`
- เกณฑ์: GDD "โทนและภาษาในเกม" กฎ 6 ข้อ · `design/narrative/style-guide.md` หัวข้อ 4.3, 5, 6, 7 (S1–S14), 8 (H1–H15) · เกณฑ์ผ่าน copy gate ท้ายหัวข้อ 8
- **verdict: NEEDS_CHANGES** (blocking 3 ข้อ: F-01 ถ้อยคำ 1 key, F-02 key ที่ขาด, F-03 wireframe ไม่ตรง copy bank · ตัว copy bank ไม่มี FAIL และผ่านกฎ 3 4 5 6)

## 0. สรุป

| ส่วน | ผล |
| --- | --- |
| lint (S1–S14) | ผ่าน · exit 0, FAIL 0, WARN 14 ทุกข้อมีคำตัดสินในหัวข้อ 2.2 |
| เพดานความยาว 3 ที่ (style-guide 4.3, copy-rules#limits, _meta.limits) | ตรงกันทุกแถว รวม `buttonFullWidth` (D-050) |
| กฎ 3, 4, 5, 6 รายกลุ่ม key | ผ่านทุกกลุ่ม |
| H1–H15 | ผ่าน ยกเว้น H12 ที่ `dungeon.emergencyClosedTitle` (F-01) |
| names.th.json | ผ่าน |
| wireframe ใช้ key ที่มีจริง | **ไม่ผ่าน**: มี pseudo-key `hp`, ข้อความไม่มี key 20+ จุด, ร่างไทยไม่ตรง copy bank เกือบทุกจุด (F-02, F-03) |
| qc.* 10 key ↔ asset-pipeline 3.4 | ตรงกันครบ 10 |

## 1. วิธีตรวจ

1. อ่าน lint result ของ P1-H02 และตรวจความยาวซ้ำด้วยมือแบบสุ่ม (หัวข้อ 2.3)
2. เทียบตารางเพดานทั้งสามที่ทีละแถว (หัวข้อ 3)
3. อ่านทุก key ในบริบทจอ (wireframe และ context ของ key) ตาม H1–H15 แยกกลุ่มตาม area (หัวข้อ 4)
4. อ่านทุกชื่อใน names.th.json ตาม W1 W5 W7 และกฎชื่อใน `_meta.rules` (หัวข้อ 5)
5. ดึง `class="copykey"` ทุกจุดจาก wireframe 7 ไฟล์ เทียบกับ key ใน copy.th.json แล้วหาข้อความไทยใน UI ที่ไม่มี key (หัวข้อ 6)
6. เทียบ qc.* กับ `art/direction/asset-pipeline.md` หัวข้อ 3.4 และ `art/vfx/specs/motion-direction.md` หัวข้อ 5 (หัวข้อ 7)

**ข้อจำกัด:** session นี้ไม่มีเครื่องมือรันคำสั่ง จึงรัน `pnpm lint:copy` เองไม่ได้ gate นี้ใช้ผล lint ที่ gameplay-programmer รันบนไฟล์จริงใน P1-H02 (ตามที่ brief ระบุ) ร่วมกับการตรวจด้วยมือ · ไฟล์ copy ไม่มีการแก้หลัง P1-H02 (`_meta.date` 2026-09-23 เท่ากัน) · orchestrator ควรรัน `pnpm lint:copy` อีกครั้งหลัง fix task ของ F-01/F-02

## 2. ผล script

### 2.1 ผลที่แนบ (ถอดจากผลของ P1-H02 ไม่ใช่ output ดิบ)

```
$ pnpm lint:copy        # รันโดย gameplay-programmer (P1-H02) บนไฟล์จริง
inputs: config/content/copy.th.json, config/content/copy-rules.json, config/content/names.th.json,
        tools/copy-lint/words.json
exit code: 0
FAIL: 0
WARN: 14
  WARN  ตัวแปรลงทะเบียนใน _variables แต่ไม่มี key ใดใช้ (12):
        zoneRealName, raidDay, raidStartTime, raidEndTime, fromLevel, toLevel,
        newLevel, successPct, gold, itemName, bossName, monsterName
  WARN  S4 cells ไม่ตรงกับที่นับ: dungeon.vsBossTitle  ประกาศ 12  นับได้ 11
  WARN  S4 cells ไม่ตรงกับที่นับ: label.sponsored      ประกาศ 6   นับได้ 7
```

ผลรายหมวด S10 (W8 U1–U8 ใน `onboarding.*`): ไม่มี FAIL ทุกหมวด (รวมอยู่ใน FAIL 0)

### 2.2 คำตัดสิน WARN ทั้ง 14 รายการ

| WARN | คำตัดสิน | เหตุผล |
| --- | --- | --- |
| ตัวแปรไม่ถูกใช้ 12 ตัว | ยอมรับ ไม่ต้องแก้ | เป็นตัวแปรที่จองไว้ให้ key ของระบบที่ปลดทีหลัง: `raid*` และ `bossName` (U3), `fromLevel` `toLevel` `newLevel` `successPct` (U2 ตีบวก, canon style-guide 3.1), `gold` `itemName` (ร้าน/ตลาด), `monsterName` (lore), `zoneRealName` (ป้ายสั้นเมื่อพื้นที่ไม่พอ และข้อเสนอ header ใน F-02) · ลบแล้วต้องเพิ่มกลับใน Phase ถัดไปพร้อม configKey เดิม เสี่ยง drift มากกว่าเก็บไว้ |
| `dungeon.vsBossTitle` cells 12 → 11 | ต้องแก้ค่า metadata | นับด้วยมือ "ตรงนี้มีบอสด้วย" = ต ร ง น ม บ อ ส ด ว ย = 11 · lint ถูก ไฟล์ผิด · ข้อความไม่เกินเพดาน label 20 ไม่กระทบผู้เล่น |
| `label.sponsored` cells 6 → 7 | ต้องแก้ค่า metadata | "ผู้สนับสนุน" = ผ ส น บ ส น น = 7 · lint ถูก · ไม่เกินเพดาน |

การแก้ 2 ค่านี้รวมอยู่ใน F-04 (blocking: no เพราะ S4 กำหนดเป็น WARN และข้อความจริงอยู่ในเพดาน แต่ให้แก้ใน fix task เดียวกับ F-01 เพราะแตะไฟล์เดียวกัน)

### 2.3 ตรวจความยาวซ้ำด้วยมือ (สุ่ม 5 key)

| key | นับเอง | ไฟล์ | ผล |
| --- | --- | --- | --- |
| `run.hpLow` | 46 | 46 | ตรง (canon style-guide 3.1) |
| `run.autoRetreat` | 63 เมื่อ `{autoRetreatPct}` = 2 ช่อง | 63 | ตรง ชิดเพดาน 64 |
| `run.death` | 47 | 47 | ตรง |
| `dungeon.lumpini` (names) | 4 + 3 + 8 = 15 | 15 | ตรง |
| `consent.locationBody` บรรทัดแรก | 34 | cellsFirstLine 34 | ตรง ไม่เกิน 64 (legal) |

## 3. ความสอดคล้องของเพดานความยาว

| ประเภท | style-guide 4.3 | copy-rules.json#limits | copy.th.json#_meta.limits | ผล |
| --- | --- | --- | --- | --- |
| message | 64 · `\n` ≤ 1 · บรรทัดละ ≤ 32 | maxCells 64, maxNewlines 1, maxCellsPerLine 32 | เหมือนกัน | ตรง |
| button | 12 · 1 บรรทัด | maxCells 12, maxNewlines 0 | เหมือนกัน | ตรง |
| buttonFullWidth (D-050) | 16 · ห้าม `\n` · เฉพาะ key ในรายชื่อ (ตอนนี้ `run.summaryContinue`) | maxCells 16, maxNewlines 0, keys [`run.summaryContinue`] | 16 · 1 บรรทัด · เฉพาะ key ใน copy-rules#limits.buttonFullWidth.keys | ตรง · `run.summaryContinue` เป็น kind button จริง 13 ช่อง และ components.md 10.1 ยืนยันว่า S-04 ทุก state มีปุ่มหลักเต็มความกว้างปุ่มเดียว |
| label | 20 · 1 บรรทัด | maxCells 20, maxNewlines 0 | เหมือนกัน | ตรง |
| push | หัวข้อ 24 · เนื้อหา 64 | titleMaxCells 24 | หัวข้อ 24 · เนื้อหา 64 | ตรง · เนื้อหา push ใช้ key message เดิม (style-guide 4.4) จึงอยู่ใต้เพดาน message 64 โดยไม่ต้องมี field แยก |
| dialogue | 5 บรรทัด · บรรทัดละ 32 | maxLines 5, maxCellsPerLine 32, speakerMaxChars 24 | ไม่มีแถว (ยังไม่มี key character) | ตรง · speakerMaxChars 24 ตรงกับ regex S3 `{1,24}` |
| command | 16 | maxCells 16 | 16 | ตรง |
| legal | บรรทัดสรุปบนสุด ≤ 64 (D-023 PROPOSED) | summaryMaxCells 64 | เหมือนกัน | ตรง |

ข้อสังเกต (ไม่ใช่เพดาน): ตาราง 4.1 ของ style-guide ยังเขียน `{zoneRealName}` maxCells 18 ขณะที่ `_variables` และ names.th.json ใช้ 17 แล้ว (P1-X11) · ตารางนั้นระบุว่าเป็น "(เสนอ) ค่าจริงถืออยู่ที่ `_variables`" จึงไม่กระทบ lint แต่ต้องแก้ให้ตรง (F-05) · components.md หัวข้อ 8 ข้อ 3 ยังบอกว่า copy.th.json เป็น 18 ซึ่งแก้ไปแล้ว (F-06)

## 4. ตรวจด้วยคนตามกฎ 3, 4, 5, 6 รายกลุ่ม key

อ่านในบริบทจอจาก context ของ key และ wireframe · "ผ่าน" = ไม่มี key ใดในกลุ่มขัดกฎ · กฎ 1 และ 2 ตรวจโดย script (S2, S4) แล้ว ทวนด้วย H3 ในคอลัมน์หมายเหตุ

| กลุ่ม key | กฎ 3 ตลกจากของจริง | กฎ 4 แซะไม่ด่า | กฎ 5 อังกฤษเฉพาะคำที่ใช้จริง | กฎ 6 ไม่หยาบในระบบ | หมายเหตุ (H อื่น) |
| --- | --- | --- | --- | --- | --- |
| `onboarding.*` `roleInfo.*` | ผ่าน · แห้งตรงตาม GDD ไม่มีมุกยัด | ผ่าน | ผ่าน · มีแค่ EXP, HP, Support ใน allowlist | ผ่าน | H10 ผ่าน: ไม่สอน U1–U8 แม้โดยนัย · "เลือกเสร็จเข้าเกมเลย" ไม่พูดถึงการเปลี่ยนภายหลัง (U5) · "เดินต่อไปเพื่อรับรางวัล" คงถ้อยคำ GDD |
| `consent.*` `legal.*` `age.*` `privacy.*` | ผ่าน · "เดี๋ยวเครื่องจะเด้งถามซ้ำอีกรอบ กดอนุญาตอีกทีก็จบ" คือประสบการณ์ prompt ซ้อนที่ทุกคนเจอ | ผ่าน · กรณีต่ำกว่าอายุไม่แซะ | ผ่าน | ผ่าน | legal 4 key ใช้ข้อยกเว้น D-023 (ดูหัวข้อ 9) · H8 ผ่าน: ทุกข้อความบอกว่าผู้เล่นอื่นไม่เห็นตำแหน่ง · H12 ผ่าน: `privacy.withdrawConfirmBody` ตรงกับ A-P1-F03-T05-5 ที่รอ tech-lead + HUMAN |
| `account.*` `profile.*` | ผ่าน · "ระบบตั้งให้ ไม่ต้องคิดเอง" | ผ่าน · ลบบัญชีไม่แซะ ไม่ตื๊อ | ผ่าน · ชื่อผู้ให้บริการมาทาง `{providerName}` จาก SDK | ผ่าน | H6: ชื่อ Google/Apple เป็นชื่อบริการ login ตาม brand guideline ไม่ใช่แบรนด์ในโลกเกม ยอมรับ ไม่ใช่การละเมิด W7 |
| `nav.*` `map.*` `label.*` | ผ่าน | ผ่าน | ผ่าน · Lv., T R S M (ชั่วคราวตาม D-045) | ผ่าน | H8 ผ่าน: `map.labelCount` เป็นจำนวนระดับ dungeon · cells ของ `label.sponsored` ดู F-04 |
| `dungeon.*` | ผ่าน · "ยามปิดประตูแล้ว" คือสวนจริงที่ยามไล่ตอนปิด · "GPS ยังไม่เชื่อว่าคุณถึงแล้ว" | ผ่าน | ผ่าน · dungeon, GPS | ผ่าน | **H12 ไม่ผ่านที่ `dungeon.emergencyClosedTitle` (F-01)** · H7 ผ่าน: "เดินลึกเข้าไปอีกหน่อย" หมายถึงใน polygon สาธารณะ · cells ของ `dungeon.vsBossTitle` ดู F-04 |
| `party.*` | ผ่าน · "เดินคนเดียวก็ได้ของ แค่ช้ากว่า" | ผ่าน · ตัวอย่าง 4c ของ style-guide | ผ่าน · buff | ผ่าน | H8 ผ่าน ไม่มีชื่อ ไม่มีตำแหน่ง · U6 ไม่อธิบายสูตร |
| `qc.*` | ผ่าน · ภาษาคุยจริงในกลุ่มเพื่อน | ผ่าน | ผ่าน · ไทยล้วน | ผ่าน | voice command ใช้คำลงท้าย "จ้า" "นะ" ได้ตาม style-guide 1.1 · S12 จำกัดเฉพาะ voice system จึงไม่ติด · ทั้ง 10 ≤ 12 ช่อง |
| `weekday.*` | ไม่มีมุก | ผ่าน | ผ่าน | ผ่าน | ข้อยกเว้น S6 ลงทะเบียนใน `_meta.dayNameExceptions` · text เป็นชื่อวันล้วน |
| `run.*` (รวมสามจังหวะ) | ผ่าน · "เลิกดื้อ" เสียงแม่ · "จอดับ ระยะก็หยุดนับ" ข้อจำกัดจริงของเว็บ | ผ่าน · `run.death` แซะการตัดสินใจ ไม่แซะตัวตน · ทั้ง alt1 alt2 อ่านแล้วยังอยากกดต่อ | ผ่าน · run, HP, Support, dungeon | ผ่าน | H4 ผ่าน: canon ทั้งสามตรงตัวอักษร ไม่มีขอโทษ ปลอบ อธิบาย · H9 ผ่าน: ไม่มีเสียงรู้ตัวว่าเป็นเกมในสามจังหวะ · H15 ผ่าน: alt1 มุมโลก (ของเป็นของมอนสเตอร์) alt2 มุมแห้ง (ทางไปต่อ) ต่างมุมจริง · H12: `run.exitConfirmBody` ตรงกับ flow (ของอยู่ครบ HP ฟื้นทันที) |
| `push.*` | ไม่มีมุก | ผ่าน | ผ่าน | ผ่าน | หัวข้อ ≤ 24 ทุกตัว · เนื้อหาชี้ key message ที่ผ่านแล้ว |
| `home.*` `interest.*` | ผ่าน · มุกยื่นเรื่อง (H-11 A) คือราชการไทยที่ทุกคนเจอ · "ไกลก็จริง แต่ขามีไว้เดิน" | ผ่าน · แซะระยะ ไม่แซะคนในจังหวัด | ผ่าน | ผ่าน | H11 ผ่าน: ไกลบอกระยะจริง นอกพื้นที่ใช้กรอบ "ปลุกจังหวัด" ไม่รู้ตำแหน่งไม่ตื๊อ · H3 ผ่าน: "ช่วยกันปลุกจังหวัดเรา" เป็นการเปิดพื้นที่ร่วมกัน ไม่ใช่ผู้เล่นกอบกู้เมือง (style-guide 6.1 อนุญาตไว้) · ข้อพิจารณา: "ขามีไว้เดิน" ไม่ชี้ร่างกายเชิงดูถูก เป็นสำนวนที่ใช้กับทุกคน ยอมรับ |
| `settings.*` | ไม่มีมุก ตั้งใจแห้ง | ผ่าน · คำเตือนปิดถอยอัตโนมัติบอกผลตรงๆ ไม่ขู่ ไม่ตื๊อ | ผ่าน | ผ่าน | ชื่อระบบ "ถอยอัตโนมัติ" ตรงศัพท์กลาง 1.3 |
| `gps.*` | ผ่าน · "ลองออกไปที่โล่ง" | ผ่าน | ผ่าน · GPS | ผ่าน | H7 ผ่าน ไม่ชวนข้ามถนนหรือเข้าที่ปิด · `gps.offlineInRun` เลี่ยงคำ หยุด/เสีย ตาม context |
| `common.*` `unit.*` | ไม่มีมุก | ผ่าน | ผ่าน | ผ่าน | หน่วยสะกดตาม 4.2 · จุดใน "ม." "กม." "ชม." ได้รับยกเว้น S11 |
| `rarity.*` `class.*` | ไม่มีมุก | ผ่าน | ผ่าน · D-045 ACCEPTED · คำเดี่ยว ไม่ต่อเป็นวลี | ผ่าน | `class.*Short` ลบเมื่อมี glyph role |

**กฎที่ผ่อน:** ไม่มี key ใดผ่อนกฎ 6 ข้อ · ข้อยกเว้นที่ใช้อยู่ทั้งหมดเป็นข้อยกเว้นที่ลงทะเบียนแล้ว: legal (D-023 PROPOSED), `buttonFullWidth` (D-050 ACCEPTED), `weekday.*` (S6 dayNameExceptions)

## 5. names.th.json

| กลุ่ม | ผล | หมายเหตุ |
| --- | --- | --- |
| `zoneSuffix.*` 24 คำ | ผ่าน | ทุกคำ ≤ 14 ช่อง (ยาวสุด 14: grillSmokeWalk, afterWorkBallYard, weekendMeetup ตรงกับที่ uiux ยืนยัน) · ไม่มีชื่อวัน ("เปิดเฉพาะวันหยุด" มีคำว่า วัน แต่ไม่ใช่ชื่อวัน) · `seaBreezeMarket` มีหมายเหตุห้ามดัดเป็นคำว่าเหม็นและห้ามมุกแรงงานข้ามชาติ ครบ |
| `dungeon.*` 10 รายการ | ผ่าน | ชื่อจริง ≤ 17 · รวม ≤ 34 (ยาวสุด 27 `dungeon.chatuchakMarket`) · `rotFaiPark` ใช้ชื่อเรียกทั่วไป ไม่ใช้นามพระราชทาน รอ D-013/H-05 · `santiphapPark` มีข้อห้ามเล่นคำกับ สันติภาพ · ไม่มีชื่อศาสนสถาน |
| `monster.*` 17 ตัว | ผ่าน | ทุกตัวมาจากความวุ่นวายของเมือง (ยุงหกโมงเย็น คิวชานม น้ำขังไม่ยอมลด กรวยส้ม) ตรงกฎ 3 · ไม่มีผีไทย สัตว์ในตำนาน คน อาชีพ หมาแมว · "ตัวเงินตัวทอง" เป็นคำสุภาพที่คนใช้แทนคำหยาบอยู่แล้ว ใช้ได้ · "ชานม" คำนามทั่วไป ไม่มีแบรนด์ |
| `material.*` `potion.*` | ผ่าน | ชื่อวัตถุดิบ 4 ชนิดตาม GDD · `potion.revive` "ยาลุกจากพื้น" ตั้งใจไม่ชนข้อความปุ่ม `run.death.usePotion` (S13) |
| `boss.*` 3 ตัว | ผ่าน | ไม่มีชื่อสถานที่จริง ไม่มีคำ ราชา ราชินี จักรพรรดิ เจ้า- พระ- · สถานการณ์จริง (แทรกคิว มาผิดเวลา) · ชื่อรายสัปดาห์จริงรอ H-13 |

## 6. wireframe ↔ copy.th.json

### 6.1 key ที่ wireframe อ้าง

ดึง `class="copykey"` ทุกจุดใน 7 ไฟล์ (00–06) ได้ 79 key ไม่ซ้ำ ไม่นับ `key.name` ที่เป็นคำอธิบายสัญลักษณ์ใน 00 บรรทัด 11

| ผล | รายการ |
| --- | --- |
| มีจริงใน copy.th.json | 78 key |
| **ไม่มีจริง** | `hp` (`03-run-active.html` บรรทัด 20 ป้าย HP bar) · ไม่ตรง regex key และไม่มี area → F-02 |

### 6.2 ข้อความที่ผู้เล่นจะเห็นแต่ wireframe ไม่ผูก key (UI ต้องอ่าน key เท่านั้น)

| ไฟล์:บรรทัด | ข้อความใน wireframe | key ที่มีอยู่แล้ว | หมายเหตุ |
| --- | --- | --- | --- |
| 03:24–25 | "tick ถัดไปใน" + 03:12 | `run.tickTimer` "รอบถัดไป {timeLeft}" | "tick" เป็นคำต้องห้ามสำหรับผู้เล่น (style-guide 5.3) |
| 03:29 | "ออกจาก dungeon" | `run.exitButton` "ออก" | |
| 03:65–71 | ปุ่ม quick command 5 ปุ่ม ("กำลังไป" "ขอเลือด" "ช่วยบัง" ตัดคำ) | `qc.*` ครบ 10 + `qc.panelTitle` | ข้อความถูกตัดจาก copy จริง (`qc.onMyWay` "กำลังไป รอแป๊บ" 12 ช่อง) และ font 10px ต่ำกว่า `type.caption` 14px · ต้องแสดงครบ 10 คำสั่งด้วยข้อความเต็ม ถ้าไม่พอดีให้แจ้ง key ที่ต้องย่อ (H14) |
| 02:72 | "เข้า" | `dungeon.confirmEnter` | |
| 02:90, 02:107 | "ปิด (กลับแผนที่)" | `dungeon.closedDismiss` "กลับแผนที่" (สถานะปิด) · `common.close` (outOfRange) | |
| 04:65, 04:67 | "(ก) รอฟื้นเอง ถึง 50% …" · "(ค) รอ Support ในทีมชุบ" | `run.death.waitRecover` `run.death.waitRecoverDetail` `run.death.reviveHint` | 50% ต้องมาจาก `{recoverPct}` |
| 04:87 | "ยกเลิก" | `run.exitConfirmCancel` "อยู่ต่อ" | |
| 01:56–57, 01:79–80 | "role ทำอะไรบ้าง" · "ดูตัวละครของฉัน" | `home.farRoleInfoLink` "แต่ละพลังทำอะไร" · `home.farProfileLink` "ดูตัวละครของคุณ" | ระบบเรียกผู้เล่นว่า "คุณ" (1.2) |
| 01:82 | "ลงทะเบียนความสนใจ" | `home.interestLink` "ยื่นเรื่องเปิดจังหวัด" | |
| 01:76 | `gps.denied` / `gps.off` ใต้ร่าง "ไม่รู้ตำแหน่งของคุณ" | `home.unknownTitle` + `home.unknownBody` (+ `gps.*` เป็นบรรทัดสาเหตุ) | ผูก key ผิด: ร่างนั้นคือ `home.unknownTitle` |
| 05:34 | `run.summaryRewardList` ในสถานะตาย | `run.summaryRewardLost` "ไม่เหลืออะไร" | สถานะตายใช้ key รายการว่างแยก |
| 05:47 | รายการของในสถานะออกเอง ไม่มีหัวรายการ | `run.summaryRewardList` | |
| 05:59 | "ได้รางวัลตามสัดส่วนเวลาที่อยู่จริง" | `dungeon.emergencyClosedTitle` (หลังแก้ F-01) | |
| 06:75 | "ถอยอัตโนมัติ: ปิดอยู่ — HP ถึง 0 จะตายจริง" | `run.autoRetreatOffBadge` "ถอยอัตโนมัติ: ปิด" | เลข 0 hardcode และข้อความเกินป้าย |
| 00:82 | ปุ่ม "กลับหน้าแรก" | `age.underMinBack` | |
| header ทุกไฟล์ | context label และ GPS pill | บางจอมี key (ดู F-02) บางจอไม่มี | F-02 |

### 6.3 ร่างไทย (`thaidraft`) ที่ไม่ตรง copy.th.json

wireframe เขียนก่อน copy bank (P1-F03-T05) ร่างเกือบทุกจุดจึงต่างจาก text จริง · ตรงกันแล้วเฉพาะ: `onboarding.intro`, `consent.locationAccept` `consent.locationDecline` `consent.browserPrimingTitle` `consent.browserPrimingContinue`, `account.loginError`, `map.navigateButton`, `home.farNavigate`, `dungeon.confirmCancel` `dungeon.confirmEnter` `dungeon.overlapTitle` `dungeon.closedTitle`, `dungeon.confirmTutorialLine`, `party.joinButton`, `run.hpLow`, `run.autoPotionUsed`, `run.autoRetreat`, `run.death`, `run.death.usePotion`, `run.exitConfirmButton`, `run.summary.completed`, `run.summaryContinue`, `interest.selectProvince`, `settings.*` 4 key (walkingSafetyLink, autoRetreatToggleLabel, OffCancel, OffConfirm)

ร่างที่ไม่ตรงและ**ขัดกฎ copy** ถ้ามีคนหยิบไปใช้ (ต้องแก้ก่อน):

| key | ร่างใน wireframe | ขัดอะไร | text จริง |
| --- | --- | --- | --- |
| `onboarding.pickRoleSupport` | ฮีลเพื่อน ชุบคนที่ล้ม | "ฮีล" ไม่อยู่ใน 5.2 | ฟื้น HP เร็วขึ้น ชุบเพื่อนได้ |
| `onboarding.pickRoleMagic` | เก่ง exp มีโล่กันดาเมจ | "exp" ตัวเล็ก (S5 case-sensitive) · "ดาเมจ" ไม่อยู่ใน 5.2 | EXP มากขึ้น มีโล่กันแรงตี |
| `onboarding.pickRoleTanker` | ยืนหน้า รับดาเมจแทนเพื่อน | "ดาเมจ" | ทั้งทีมโดนตีเบาลง |
| `account.loginGoogle` `account.loginApple` | เข้าสู่ระบบด้วย Google / Apple | ชื่อแบรนด์พิมพ์ตรง (S5) · เกิน 12 ช่อง | ใช้ {providerName} |
| `consent.browserPrimingBody` | เบราว์เซอร์จะถามสิทธิ์ตำแหน่ง กด "อนุญาต" ที่ป๊อปอัปถัดไป | อ่านเป็นคำแปล (H5) | เดี๋ยวเครื่องจะเด้งถามซ้ำอีกรอบ กดอนุญาตอีกทีก็จบ |
| `settings.autoRetreatOffWarningTitle` `run.exitConfirmTitle` | ปิดถอยอัตโนมัติ? · ออกจาก dungeon ตอนนี้? | เครื่องหมาย ? ไม่ใช่รูปแบบของระบบ (1.2) | ปิดถอยอัตโนมัติไหม · ออกตอนนี้เลยไหม |
| `settings.autoRetreatOffWarningBody` `run.exitConfirmBody` | …คุณจะตายและ… · คุณจะได้ของ… HP จะเริ่มฟื้น | โครงสร้าง "จะ…" ซ้ำแบบคำแปล (H5) | ดู copy.th.json |
| `home.outOfAreaTitle` | ช่วยกันปลุก{provinceName} | ไม่ตรงการตัดสินใจ: ชื่อจังหวัดอยู่ใน body | ช่วยกันปลุกจังหวัดเรา |
| `home.outOfAreaCta` | ลงทะเบียนความสนใจ | 16 ช่อง เกินปุ่ม 12 | ยื่นเรื่อง |
| `party.buffApplied` | ได้รับพลังจากเพื่อนทันที | สลับศัพท์ "พลัง" ซึ่งสงวนให้ role (H13) | เข้าร่วมแล้ว ได้ buff ทันที |
| `run.stateGrace` | กำลังเช็คตำแหน่ง | "เช็ค" ไม่อยู่ใน 5.2 | กำลังยืนยันตำแหน่ง |
| `dungeon.vsBossTitle` | มี raid บอสอยู่ที่นี่ด้วย | ถ้อยคำเก่า | ตรงนี้มีบอสด้วย |
| `map.nearestRiftFound` | พบรอยแยกใกล้คุณ — 650 ม. Lv.1–5 | ตัวเลข hardcode (S6) | รอยแยกใกล้สุด {distanceText} · Lv.{levelMin}–{levelMax} |
| `dungeon.confirmCount` `party.foundTitle` | มี 3 คนอยู่ในนี้ · เจอผู้เล่นอีก 2 คน | ตัวเลข hardcode | ตอนนี้มี {count} คน · เจออีก {count} คนในนี้ |

ร่างที่เหลือ (consent.locationTitle/Body, age.*, account.loginTitle, pickRoleTitle, home.farBody/farNextOpen/outOfAreaCount/unknownCta, interest.confirm/confirmed, dungeon.closedBody/outOfRangeTitle, party.foundRoles, run.stateSuspended, run.tickGranted/tickDenied, run.summary.died/exited/closedByModerator/autoRetreated, run.summaryRewardList) ไม่ขัดกฎแต่ถ้อยคำไม่ตรง text จริง

**คำตัดสิน:** wireframe ต้องแสดง text จาก copy.th.json ตรงตัว (หรือแสดงแค่ key โดยไม่มีร่าง) เพราะ design gate A, QA และ gameplay-programmer ใช้ wireframe เป็นภาพอ้างอิง ร่างที่ต่างทำให้ต้องเลือกว่าเชื่ออันไหน → F-03

## 7. qc.* ↔ asset-pipeline หัวข้อ 3.4

| copy key | text | cells | icon id (asset-pipeline 3.4) | motion-direction 5 |
| --- | --- | --- | --- | --- |
| `qc.arrived` | มาแล้วจ้า | 7 | `icon.qc.arrived` | ตรง |
| `qc.onMyWay` | กำลังไป รอแป๊บ | 12 | `icon.qc.on-my-way` | ตรง |
| `qc.goOn` | ไปต่อ | 4 | `icon.qc.go-on` | ตรง |
| `qc.needHeal` | ขอเลือดหน่อย | 10 | `icon.qc.need-heal` | ตรง |
| `qc.hpCritical` | เลือดจะหมดแล้ว | 12 | `icon.qc.hp-critical` | ตรง |
| `qc.needCover` | ช่วยบังหน่อย | 9 | `icon.qc.need-cover` | ตรง |
| `qc.needBreak` | ขอพักแป๊บ | 7 | `icon.qc.need-break` | ตรง |
| `qc.retreating` | ขอถอยก่อนนะ | 10 | `icon.qc.retreating` | ตรง |
| `qc.goodDrop` | ของออกแล้ว | 9 | `icon.qc.good-drop` | ตรง |
| `qc.thanks` | ขอบคุณ | 5 | `icon.qc.thanks` | ตรง |

ผล: 10/10 ตรง (kebab ของ camelCase) · ข้อความใน motion-direction ตรงกับ text ทุกตัว · icon ไม่มีข้อความในตัว (icon-grammar A-P1-F03-T10-7) ข้อความมาจาก key ยืนยันในฐานะเจ้าของ copy

## 8. Findings

### F-01 `dungeon.emergencyClosedTitle` สัญญารางวัลตามเวลา ไม่ใช่ตามการเดิน (H12, NN-2) · blocking: yes · เจ้าของ: narrative-designer

- ปัจจุบัน: "โซนนี้ปิดกะทันหัน ได้ของตามเวลาที่อยู่จริง" (31) · ใช้ซ้ำเป็นเนื้อหาของ `run.summary.closedByModerator`
- ปัญหา: อ่านได้ว่าอยู่เฉยๆ ก็ได้ของ ขัด non-negotiable 2 (ทุกรางวัลผ่าน movement gate) และ H12 "ไม่สัญญารางวัลที่ไม่ผ่าน movement gate" · ไม่สอดคล้องกับ `run.summary.connectionLostBody` "ได้ของเท่าที่ระบบยืนยันว่าเดินจริง"
- แก้เป็น: **"โซนนี้ปิดกะทันหัน ได้ของเท่าที่เดินจริง"** (28 ช่อง, message, ไม่มีตัวเลข ไม่มีคำต้องห้าม) · แก้ context ให้ระบุว่ารอบที่ถูกตัดยังผ่าน movement gate ตามสัดส่วน (ดู F-07)

### F-02 key ที่ขาดสำหรับข้อความถาวรบนจอ · blocking: yes · เจ้าของ: narrative-designer (เพิ่ม key) + uiux-designer (ผูก key ใน components.md 2.1 และ wireframe)

wireframe มี pseudo-key `hp` และ header ที่ไม่มี key · UI ห้ามฝังข้อความ (protocol 9) จึงต้องมี key ทุกตัว

| ข้อความ | ข้อเสนอ | kind · cells | หมายเหตุ |
| --- | --- | --- | --- |
| ป้าย HP bar (03:20) | เพิ่ม `run.hpBarLabel` = "HP" | label · 2 | แทน `hp` |
| GPS pill ใน header ทุกจอ | เพิ่ม `gps.pillLabel` = "GPS" | label · 3 | components 2.1 บังคับให้มีคำกำกับ |
| header S-00-intro | เพิ่ม `onboarding.headerLabel` = "เริ่มต้น" หรือ uiux ตัด label ออกจากจอนี้ | label · 5 | |
| header S-00-consent-location และ S-00-permission-browser | เพิ่ม `consent.headerLabel` = "สิทธิ์ตำแหน่ง" ใช้ทั้งสองจอ | label · 9 | แทน "ขอสิทธิ์เบราว์เซอร์" |
| header S-00-login | เพิ่ม `account.loginHeader` = "เข้าสู่ระบบ" | label · 8 | |
| header S-04-run-summary | เพิ่ม `run.summary.headerLabel` = "สรุป run" | label · 7 | แทน "สรุปผล run" |
| header ระหว่าง run (ชื่อโซน) | เพิ่ม `run.headerZoneLabel` = "{zoneRealName}" | label · 17 | `{zoneName}` เต็ม 34 ช่องเกินเพดาน label 20 และไม่พอดี header ที่มีไอคอนสองข้าง + GPS pill · ถ้า uiux ยืนยันว่า header รับ 34 ได้ ให้ใช้ `{zoneName}` และ kind message แทน |
| header จออื่น | ใช้ key เดิม: S-00-age-gate → `age.gateTitle` · S-00-class-select → `onboarding.pickRoleTitle` · S-01 → `nav.map` · S-09 → `interest.title` · S-22 → `settings.title` · หน้าย่อยการเดิน → `settings.walkingSafetyLink` | — | uiux บันทึกตารางนี้ใน components.md 2.1 |

### F-03 wireframe ไม่ผูก key และร่างไทยไม่ตรง copy bank · blocking: yes · เจ้าของ: uiux-designer

- แก้ทุกจุดในหัวข้อ 6.2 (ผูก key ที่มีอยู่) และ 6.3 (เปลี่ยนร่างเป็น text จริงจาก copy.th.json หรือเอาร่างออกเหลือแค่ key)
- แผง quick command ใน 03 ต้องแสดงครบ 10 คำสั่งด้วยข้อความเต็มที่ font ไม่ต่ำกว่า `type.caption` · ถ้าไม่พอดี ให้ส่งรายชื่อ key และจำนวนช่องที่พอดีกลับมาที่ narrative-designer (H14) ห้ามตัดคำเอง
- บันทึกข้อตัดสินใจ header ของ F-02 ใน components.md 2.1

### F-04 ค่า cells ไม่ตรง 2 key · blocking: no · เจ้าของ: narrative-designer

- `dungeon.vsBossTitle` cells 12 → **11** · `label.sponsored` cells 6 → **7** · ข้อความไม่เปลี่ยน · ทำใน fix task เดียวกับ F-01/F-02 แล้ว lint ต้องเหลือ WARN 12 (ตัวแปรที่จองไว้) เท่านั้น

### F-05 style-guide 4.1 `{zoneRealName}` ยังเป็น 18 · blocking: no · เจ้าของ: narrative-designer

- แก้เป็น 17 ให้ตรง `_variables` และ names.th.json (P1-X11)

### F-06 components.md หัวข้อ 8 ข้อ 3 ล้าสมัย · blocking: no · เจ้าของ: uiux-designer

- บรรทัดที่บอกว่า `copy.th.json#_variables.zoneRealName.maxCells` ยังเป็น 18 ไม่จริงแล้ว (เป็น 17) · เปลี่ยนเป็น "แก้แล้วใน P1-X11" และปิด handoff ในหัวข้อ 13

### F-07 ยืนยันว่ารางวัลแบบ pro-rated ตอนปิดฉุกเฉินผ่าน movement gate · blocking: no · เจ้าของ: systems-designer (game-director รับทราบ)

- config `dungeons.emergencyClose.proRatedRewardOnClose` และ caption ใน 05:59 เขียน "ตามสัดส่วนเวลาที่อยู่จริง" · copy หลังแก้ F-01 ถือว่ารอบที่ถูกตัดใช้เกณฑ์ระยะตามสัดส่วนเวลา · ถ้าระบบให้รางวัลโดยไม่ตรวจการเดิน นั่นขัด NN-2 และต้องแก้ที่ระบบ ไม่ใช่ที่ copy

## 9. ข้อสังเกต (ไม่ใช่ข้อบกพร่องของ copy)

- **words.json W2d (คำเหยียด) ว่าง และ W7 (แบรนด์) เป็นชุดเริ่มต้น 11+1 คำ:** เป็นช่องว่างที่รู้อยู่แล้ว (placeholder ตาม `_meta._note` ของ words.json) ไม่ใช่ข้อบกพร่องของ copy · ตอนนี้ปิดความเสี่ยงด้วยการอ่านของคน (H6) และ S5 จับชื่อแบรนด์อักษรละตินได้อยู่แล้ว · เจ้าของ (narrative-designer) ต้องเติมก่อนเปิดให้หลังบ้านเพิ่มชื่อเอง (Phase 5)
- **D-023 (legal ยกเว้นเพดาน 2 บรรทัด) รอ HUMAN:** 4 key ใช้ข้อยกเว้นนี้ `consent.locationBody` (138 ช่อง 5 บรรทัด), `privacy.positionLogExplain` (88, 3 บรรทัด), `privacy.withdrawConfirmBody` (79, 2 บรรทัด), `account.deleteBody` (61, 3 บรรทัด) · ถ้า HUMAN ไม่อนุมัติ ทั้ง 4 จะ FAIL S4 ทันทีเมื่อลบ `limits.legal` (copy-schema 3.2) ทางสำรอง: เหลือบรรทัดสรุปใน key และย้ายรายละเอียดไปหน้าอ่าน `S-23-privacy` / นโยบายเต็ม · ตัวเนื้อหาทางกฎหมายต้องให้ HUMAN ตรวจอยู่ดี (protocol 5)
- **HUMAN-pending ที่ copy ใช้คำแนะนำไปก่อน:** world.md H-01..H-13 (ใช้ H-02 B, H-03 B, H-09 A, H-10 A, H-11 A ตาม `_meta.humanFlags`), D-011..D-014 (โดยเฉพาะ D-012 pool มอนสเตอร์, D-013 สวนรถไฟ), D-023 · ไม่มีข้อใดทำให้ copy ปัจจุบันผิดกฎ ถ้า HUMAN เลือกต่างจากคำแนะนำ ต้องแก้ key ที่เกี่ยวข้องและรัน gate นี้ซ้ำ
- **ข้อสมมติเปิด:** A-P1-F03-T05-3 (เกณฑ์ "GPS ปิดต่อเนื่อง" ของ gameplay-programmer), A-P1-F03-T05-5 (ถอน consent แล้ว log ลบตาม TTL, รอ tech-lead + HUMAN) · ข้อความตรงกับข้อสมมติ ถ้าข้อสมมติเปลี่ยน ต้องแก้ `privacy.withdrawConfirmBody`
- **ประเด็นเปิดใน 03-run-active (ล็อกจอ):** copy bank รองรับทางเลือก B ของ uiux แล้วด้วย `run.screenLockNotice` และ `gps.suspended` · ถ้า game-director/tech-lead เลือก Wake Lock (A) ข้อความทั้งสองยังถูกต้อง (บอกผลของจอดับ ไม่ได้สั่งให้ถือจอ)
- **H7:** `run.screenLockNotice` "เปิดจอไว้ระหว่างเดิน" บอกให้เปิดจอ ไม่ได้บอกให้มองจอ ยอมรับ · ถ้า field walk (P1-F02-T20) พบว่าคนมองจอขณะเดินข้ามถนน ให้ทบทวนถ้อยคำ

## 10. เงื่อนไขรัน gate ซ้ำ

1. `pnpm lint:copy` exit 0 · FAIL 0 · WARN เหลือเฉพาะตัวแปรที่จองไว้ (ไม่เกิน 12 · `zoneRealName` จะหายไปจากรายการถ้าใช้ใน `run.headerZoneLabel`)
2. `dungeon.emergencyClosedTitle` เป็นถ้อยคำตาม F-01 หรือถ้อยคำอื่นที่ไม่สัญญารางวัลตามเวลา
3. ทุก `copykey` ใน wireframe มีจริง ไม่มีข้อความผู้เล่นเห็นที่ไม่ผูก key และร่างไทยตรง text จริง
4. components.md 2.1 มีตาราง header → key
