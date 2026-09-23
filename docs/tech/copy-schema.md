# Copy schema — `copy.th.json`, registry ตัวแปร และ copy lint

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted (ตัดสิน D-024 · ปรับตามไฟล์จริงของ P1-F03-T05 ใน P1-H01 รอบ 2) |
| วันที่ | 2026-09-23 |
| task | P1-H01 · ผู้เขียน tech-lead (authority: architecture, code standards) |
| อ้างอิง | CLAUDE.md non-negotiable 3 · `studio/protocol.md` หัวข้อ 9 (copy) · `design/narrative/style-guide.md` หัวข้อ 1.1, 4.1–4.4, 7, 9 · ADR 0001 หัวข้อ 3.2, 3.10 · D-023 (legal, รอ HUMAN) · D-024 |
| ผู้ใช้สัญญานี้ | narrative-designer (copy และ registry), gameplay-programmer (lint P1-H02 และ formatter ของ client), uiux-designer (เพดานความยาว), qa-tester |

## 0. การตัดสิน D-024 และส่วนเพิ่มของไฟล์จริง

**D-024 ACCEPTED** · รูปแบบรายการตาม style guide 4.4 (`text` `voice` `kind` `context` `cells` `alts` `beat`) ใช้ตามเดิม · `config/content/copy.th.json` ที่ P1-F03-T05 ส่งมา (225 key) เป็นไฟล์อ้างอิงของสัญญานี้ ส่วนเพิ่มที่ไฟล์ใช้ ตัดสินดังนี้

| ส่วนเพิ่ม | คำตัดสิน | เงื่อนไข |
| --- | --- | --- |
| อ่านเป็น flat key map (`run.death` กับ `run.death.alt1` อยู่คู่กัน) | ACCEPTED | ห้ามแยก key ตามจุดเป็น object ซ้อน ทั้งใน lint, client และ library i18n ใดๆ (หัวข้อ 2.1) |
| field `altOf` | ACCEPTED | ชี้ key ต้นทางที่มีอยู่ ห้ามต่อเป็นทอด (หัวข้อ 2.3) |
| field `cellsFirstLine` | ACCEPTED | เฉพาะ `voice: legal` + `kind: message` · lint คำนวณเองเหมือน `cells` (หัวข้อ 4) |
| `_meta.dayNameExceptions` | ACCEPTED แทน field `exceptions` ต่อรายการที่ร่างไว้รอบแรก | ยกเว้นเฉพาะส่วน "ชื่อวัน" ของ S6 และ `text` ต้องเป็นชื่อวันล้วน (หัวข้อ 2.4) |
| `_meta.numericExceptions` | ACCEPTED รูปเดียวกับ `dayNameExceptions` | ยกเว้นเฉพาะส่วน "ตัวเลข" ของ S6 |
| `_meta.gpsStateMap` | ACCEPTED เป็นเอกสารเท่านั้น | โค้ดไม่ parse · mapping จริงอยู่ในโค้ด client เป็นตาราง typed (หัวข้อ 8) |
| `_variables` ใน `copy.th.json` (`maxCells` `source` `example`) | ACCEPTED เป็น registry ตัวแปร (แทนการแยก variables ไปไฟล์อื่นที่ร่างรอบแรก) | เพิ่ม `configKey` ได้ (ไม่บังคับ) · หัวข้อ 5 |
| `kind: push` เป็นหัวข้อ push ใน key แยก (`push.hpLowTitle`) · เนื้อหา push ใช้ key `message` เดิม | ACCEPTED (แทน field `title` ที่ร่างรอบแรก) | เพดาน `push.titleMaxCells` · หัวข้อ 3 |

สิ่งที่ tech-lead เพิ่มจาก style guide: `_meta` ตาม ADR 0001 3.10.2 (ขาด `version` และ `doc` = WARN) · field ที่ขึ้นต้นด้วย `_` ใช้จดโน้ตได้ field อื่นนอกตาราง = FAIL · เพดานความยาว รายการ area และกติกาจัดรูปที่เครื่องอ่านได้อยู่ใน `config/content/copy-rules.json` (หัวข้อ 6) เพราะ `_meta.limits` ในไฟล์ copy เป็นคำอธิบายภาษาไทย ไม่ใช่ตัวเลข

## 1. ไฟล์และเจ้าของ

| ไฟล์ | เนื้อหา | เจ้าของ | อ่านโดย |
| --- | --- | --- | --- |
| `config/content/copy.th.json` | ข้อความที่ผู้เล่นเห็น (ยกเว้นชื่อ) + `_meta` + `_variables` (registry ตัวแปร) | narrative-designer | client (build time), lint, copy gate |
| `config/content/copy-rules.json` | เพดานความยาวแบบตัวเลข, รายการ area, กติกาจัดรูป | narrative-designer · ค่าเพดานยืนยันโดย uiux-designer (A-P1-F03-T03-1) | lint, client formatter |
| `config/content/names.th.json` | ชื่อโซน มอนสเตอร์ ไอเทม บอส (P1-F03-T04) | narrative-designer | client, หลังบ้าน (Phase 5), lint S2 S13 |
| `packages/shared/schemas/copy.schema.json`, `copy-rules.schema.json` | JSON Schema draft 2020-12 | tech-lead (สร้างใน P1-H02 ตามสัญญานี้) | lint, test |
| `packages/shared/src/content/*.ts` | type และ pure function ร่วม (หัวข้อ 7) | tech-lead (สร้างใน P1-H02 ตามสัญญานี้) | lint, client, test |
| `tools/copy-lint/` | script lint + `words.json` + test | gameplay-programmer (โค้ด) · narrative-designer (เนื้อหา `words.json`) | CI, copy gate |

- ชื่อไฟล์ copy ตาม locale `copy.<locale>.json` · v1 มีแค่ `th` · ไม่มี fallback ข้ามภาษา
- `names.th.json` ใช้ field แบบ camelCase `nameReal` / `nameSuffix` (D-051): **tech-lead ยืนยันใน P1-X05** ว่าตรง ADR 0001 3.10.3 (key ใน `config/` เป็น camelCase) · `name_real` ใน `data/dungeons/` เป็นชื่อ OSM ดิบของ pipeline คนละความหมาย จึงไม่ต้องตรงกัน · หลังบ้าน (Phase 5) อ่าน camelCase
- `names.th.json`: lint ไม่บังคับโครงสร้าง ใช้ทุก string ที่เป็นใบ (leaf) โดยข้าม key ที่ขึ้นต้นด้วย `_` · schema ของชื่อทำเมื่อหลังบ้านรับช่วง (Phase 5)
- โค้ดไม่เขียนลงไฟล์เหล่านี้ (ADR 0001 หัวข้อ 3.2)

## 2. `copy.th.json`

### 2.1 โครงไฟล์: flat key map

```json
{
  "_meta": { "file": "config/content/copy.th.json", "owner": "narrative-designer", "task": "P1-F03-T05", "version": 1, "doc": "design/narrative/style-guide.md; docs/tech/copy-schema.md", "numericExceptions": [], "dayNameExceptions": { "keys": ["weekday.monday"], "reason": "..." }, "gpsStateMap": { "...": "..." } },
  "_variables": { "autoRetreatPct": { "maxCells": 2, "source": "...", "example": "25", "configKey": "config/balance/dungeons.json#hpSafety.autoRetreatThreshold_pct" } },
  "run.death": { "text": "...", "voice": "system", "kind": "message", "context": "...", "cells": 47, "beat": "death", "alts": ["...", "..."] },
  "run.death.alt1": { "text": "...", "voice": "system", "kind": "message", "context": "...", "cells": 44, "altOf": "run.death" },
  "push.deathTitle": { "text": "คุณตาย", "voice": "system", "kind": "push", "context": "...", "cells": 5 }
}
```

- **top-level เป็น map แบนระดับเดียว:** key ของ copy คือ string ทึบ (opaque) ทั้งเส้น · `run.death` และ `run.death.alt1` เป็นสองรายการอิสระ · ห้ามแปลงจุดเป็นการซ้อน object ห้ามใช้ `lodash.get`/`set` หรือ i18n library ที่แยกด้วยจุด (จะชนกันเพราะ `run.death` เป็นทั้งใบและกิ่ง) · ค้นหาด้วย `file[key]` ตรงตัว
- key ที่ขึ้นต้นด้วย `_` เป็น metadata: `_meta` (บังคับ), `_variables` (บังคับ) · client ข้าม key `_` ทั้งหมด · lint อ่าน `_meta` และ `_variables` ตามหัวข้อ 2.4 และ 5 · key `_` อื่น = WARN S1
- `_meta` บังคับ `file` `owner` `task` (ขาด = FAIL S1) · ADR 0001 3.10.2 ต้องการ `version` `doc` ด้วย (ขาด = WARN S1 จนกว่าจะเติม) · field อื่นของ `_meta` เป็นอิสระ (`fields`, `limits`, `cellCounting` ฯลฯ เป็นคำอธิบาย lint ไม่อ่าน)
- key ของ copy: regex `^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$` · ส่วนแรกคือ area ต้องอยู่ใน `copy-rules.json#areas` (ไม่อยู่ = WARN S1)
- key ซ้ำ: `JSON.parse` เก็บตัวหลังเงียบๆ · lint ต้องตรวจจาก text ดิบ (scan key ระดับบนสุด) แล้วรายงาน FAIL S1
- UTF-8 ไม่มี BOM · lint normalize เป็น NFC ก่อนตรวจ และ WARN ถ้าไฟล์ยังไม่เป็น NFC (ไม่เขียนทับ)

### 2.2 field ของรายการ

| field | type | บังคับ | กติกา |
| --- | --- | --- | --- |
| `text` | string ไม่ว่าง | ใช่ | ข้อความที่ UI แสดง · ขึ้นบรรทัดด้วย `\n` เท่านั้น (ไม่มี `\r`, tab) · ตัวแปร `{name}` (หัวข้อ 5) · ห้าม `{` `}` ที่ไม่ใช่ตัวแปร |
| `voice` | `system` · `research` · `character` · `command` · `legal` | ใช่ | style guide 1.1 |
| `kind` | `message` · `button` · `label` · `push` · `dialogue` · `command` | ใช่ | เลือกเพดาน (หัวข้อ 3) · `push` = หัวข้อของ push notification |
| `context` | string ไม่ว่าง | ใช่ | จอ (รหัส S-xx) และสถานการณ์ · UI ไม่อ่าน |
| `cells` | integer ≥ 0 | ไม่ | ค่าที่ผู้เขียนนับ (หัวข้อ 4) · lint คำนวณเองเสมอ · ไม่ตรงหรือไม่มี = WARN S4 พร้อมค่าที่ถูก |
| `cellsFirstLine` | integer ≥ 0 | ไม่ · ใช้ได้เฉพาะ `voice: legal` + `kind: message` | ช่องของบรรทัดสรุปบนสุด (D-023) · มีใน voice/kind อื่น = FAIL S1 · ไม่ตรงกับที่นับ = WARN S4 |
| `alts` | array ของ string ไม่ว่าง | ไม่ | ทางเลือกให้คนรีวิว UI ไม่อ่าน · ตัวแปรชุดเดียวกับ `text` (S7) · key ที่มี `beat` เป็น `death` `raidFail` `enhanceFail` ต้องมีพอดี 2 (S14) |
| `altOf` | string (key ของ copy) | ไม่ | หัวข้อ 2.3 |
| `beat` | `hpLow` · `autoRetreat` · `death` · `raidFail` · `enhanceFail` | ไม่ | S9 และ S14 · ห้ามมีคู่กับ `altOf` (รับ beat จากต้นทาง) |
| `_<อะไรก็ได้>` | อะไรก็ได้ | ไม่ | โน้ต · lint และ client ข้าม |

- field อื่นนอกตาราง = FAIL S1
- UI อ่านเฉพาะ `text` · ห้ามสุ่มเลือกจาก `alts` หรือจาก key ที่มี `altOf`

### 2.3 `altOf` (key แยกที่เป็นทางเลือกของอีก key)

ใช้เมื่อ flow ต้องการทางเลือกเป็น key ของตัวเอง (เช่น `run.death.alt1`, `run.death.alt2` ตาม flow F03)

- ค่าต้องเป็น key ของ copy ที่มีอยู่ และต้นทางต้องไม่มี `altOf` เอง (ไม่ต่อเป็นทอด) · ผิด = FAIL S1
- `voice` และ `kind` ต้องเท่ากับต้นทาง · ชุดตัวแปรต้องเท่ากับ `text` ของต้นทาง (S7) · ผิด = FAIL
- รับ `beat` ของต้นทางเพื่อตรวจคำชุด W3 (S9) · **ไม่** ตรวจ canon exact-match ของ S9 (เป็นถ้อยคำทางเลือกโดยเจตนา) · ตรวจ S2–S13 ตามปกติ
- ไม่นับใน S14 (S14 นับเฉพาะ `alts` ของต้นทาง)
- UI อ้าง key ที่มี `altOf` ได้เฉพาะเมื่อคนเลือกให้ใช้แทนถาวร (บันทึกใน copy gate) · ห้ามใช้สุ่มหรือหมุนเวียน

### 2.4 ข้อยกเว้น S6 ใน `_meta`

```json
"numericExceptions": [ { "keys": ["..."], "reason": "..." } ],
"dayNameExceptions": { "keys": ["weekday.monday", "..."], "reason": "..." }
```

- `numericExceptions`: array ของ `{ keys, reason }` (ว่างได้) · ปิดเฉพาะส่วน "ตัวเลข `[0-9๐-๙]` นอก `{}`" ของ S6 สำหรับ key ในรายการ (เช่น "Lv.50" ในบทพูด)
- `dayNameExceptions`: object `{ keys, reason }` · ปิดเฉพาะส่วน "ชื่อวัน" ของ S6 · และ `text` ของ key เหล่านี้ต้องเป็นชื่อวันล้วน: ตัด `วัน` นำหน้า (ถ้ามี) แล้วต้องเท่ากับชื่อหนึ่งใน `words.json#dayNames` ทั้งคำ (ไม่ตรง = FAIL S6) · `dayNames` จึงต้องมีทั้งรูปเต็มและรูปสั้น (`พฤหัสบดี` และ `พฤหัส`) เพราะไฟล์ใช้ "วันพฤหัสบดี"
- ทุก key ในรายการต้องมีอยู่จริง (ไม่มี = FAIL S1) · `reason` string ไม่ว่าง · copy gate อ่าน reason ทุกอัน
- ข้อยกเว้นไม่ปิดส่วนอื่นของ S6 (รูปเวลา `\d{1,2}[:.]\d{2}`) และไม่ปิด check อื่น
- key ชื่อวันเป็น `weekday.<ค่า enum>` ตรงกับค่า `config/balance/raid.json#schedule.weekday` (`weekday.saturday`) · formatter ของ `{raidDay}` จึงหา key ด้วย `"weekday." + weekday` โดยไม่ต้องมีตารางแปลในโค้ด

## 3. `voice` × `kind` และการเลือกเพดาน

### 3.1 คู่ที่อนุญาต (FAIL S1 ถ้านอกตาราง)

| `kind` | `voice` ที่ใช้ได้ |
| --- | --- |
| `message` | `system` · `research` · `legal` |
| `button` | `system` · `legal` |
| `label` | `system` · `research` · `legal` |
| `push` | `system` |
| `dialogue` | `character` เท่านั้น |
| `command` | `command` เท่านั้น |

- `character` ⟺ `dialogue` และ `command` ⟺ `command` เป็นคู่บังคับสองทาง · ไฟล์ปัจจุบันใช้ 6 คู่ (system/label 117, system/message 53, system/button 36, command/command 10, legal/message 5, system/push 4) ผ่านตารางนี้ทั้งหมด

### 3.2 เพดาน (ตัวเลขอยู่ใน `copy-rules.json#limits` ไม่อยู่ในโค้ด lint)

| เงื่อนไข (ตัวแรกที่ตรงชนะ) | limit | กติกา |
| --- | --- | --- |
| `voice: legal` และ `kind: message` | `legal` | บรรทัดแรกไม่เกิน `summaryMaxCells` · บรรทัดอื่นไม่จำกัด (D-023 รอ HUMAN · ถ้า HUMAN ไม่อนุมัติ ลบ `limits.legal` แล้ว legal ใช้ `message` โดยไม่แก้โค้ด) |
| `kind: message` | `message` | รวมไม่เกิน `maxCells` · `\n` ไม่เกิน `maxNewlines` · ถ้ามี `\n` แต่ละบรรทัดไม่เกิน `maxCellsPerLine` · ข้อความนี้ใช้เป็นเนื้อหา push ได้เพราะเพดานเนื้อหา push เท่ากัน |
| `kind: button` และ key อยู่ใน `limits.buttonFullWidth.keys` | `buttonFullWidth` | ไม่เกิน `maxCells` · `maxNewlines` = 0 · ใช้ได้เฉพาะปุ่มหลักเต็มความกว้างแบบเดี่ยวที่ไม่มีปุ่มคู่ (D-050, uiux-designer ยืนยันใน `design/ux/components.md` หัวข้อ 10) · ไม่มี `limits.buttonFullWidth` = ทุกปุ่มใช้ `button` โดยไม่แก้โค้ด (P1-X05) |
| `kind: button` | `button` | ไม่เกิน `maxCells` · `maxNewlines` = 0 |
| `kind: label` | `label` | ไม่เกิน `maxCells` · `maxNewlines` = 0 |
| `kind: push` | `push` | หัวข้อ push ไม่เกิน `titleMaxCells` · `maxNewlines` = 0 |
| `kind: dialogue` | `dialogue` | ไม่เกิน `maxLines` บรรทัด · ทุกบรรทัดขึ้นต้นด้วย `<ผู้พูด>: ` ผู้พูดยาว 1 ถึง `speakerMaxChars` อักขระไม่มี `:` (S3) · นับแต่ละบรรทัดหลังตัดผู้พูด ไม่เกิน `maxCellsPerLine` |
| `kind: command` | `command` | ไม่เกิน `maxCells` · `maxNewlines` = 0 |

ทุกกติกาคิดหลังแทนตัวแปรด้วยตัวเติมยาว `maxCells` (หัวข้อ 4.2) · `alts` และ key ที่มี `altOf` ใช้ limit ของ `kind` ตัวเอง

## 4. ช่องแสดงผล (`cells`, `cellsFirstLine`)

### 4.1 นิยามที่ implement (ตรงกับ style guide 4.3)

1. normalize เป็น NFC
2. แยกบรรทัดด้วย `\n` · `\n` ไม่นับเป็นช่อง
3. นับทีละ code point: **ไม่นับ** code point ที่ General Category เป็น `Mn`, `Me` หรือ `Cf` (regex `/[\p{Mn}\p{Me}\p{Cf}]/u`) · ที่เหลือนับ 1
   - ครอบคลุมเครื่องหมายไทยที่ซ้อน (U+0E31, U+0E34–U+0E3A, U+0E47–U+0E4E) และ zero-width (ZWSP, ZWJ) ด้วยกติกาเดียว · สระอำ U+0E33 และ ฯ เป็น `Lo` นับ 1 · สระอำแบบแยก (U+0E4D + U+0E32) ก็ได้ 1
   - ตรวจแล้วด้วย Node 24 (2026-09-23): "คุณตาย" = 5 · `run.death` ต้นแบบ GDD = 47 · `run.autoRetreat` รูปตัวแปรหลังเติม `{autoRetreatPct}` 2 ช่อง = 63 · ตรงกับ test case ของ style guide หัวข้อ 7
4. `cells` = ผลรวมทุกบรรทัดของ `text` หลังแทนตัวแปรด้วยตัวเติม · `cellsFirstLine` = ช่องของบรรทัดแรกเท่านั้น

### 4.2 การแทนตัวแปร

| ใช้เพื่อ | แทน `{name}` ด้วย |
| --- | --- |
| ตรวจความยาว S4, `cells`, `cellsFirstLine` | `ก` ซ้ำ `maxCells` ตัวของตัวแปรนั้น |
| ตรวจคำ S2 S3 S5 S6 S8–S13 | สตริงว่าง (style guide หัวข้อ 7) |
| แสดงผลจริงใน client | ค่าที่ formatter เตรียมแล้ว (หัวข้อ 8) |

## 5. ตัวแปรและ `_variables`

### 5.1 ไวยากรณ์

- `{name}` โดย `name` ตรง `^[a-z][a-zA-Z0-9]*$` · ไม่มี format spec ไม่มี ICU plural/select · จัดรูปใน formatter ก่อนแทน · ไม่มี escape (ห้าม `{` `}` ที่ไม่ใช่ตัวแปร)
- ทุกตัวแปรใน `text` และ `alts` ต้องมีใน `_variables` (FAIL S7) · ตัวแปรใน `_variables` ที่ไม่มี key ใดใช้ = WARN S7

### 5.2 field ของ `_variables.<name>`

| field | type | บังคับ | กติกา |
| --- | --- | --- | --- |
| `maxCells` | integer ≥ 1 | ใช่ | ช่องสูงสุดของค่าที่แทน กรณีแย่สุด |
| `example` | string | ใช่ | ค่าตัวอย่างที่จัดรูปแล้ว · `countCells(example) > maxCells` = FAIL S7 |
| `source` | string ไม่ว่าง | ใช่ | ที่มาของค่า (ข้อความอิสระ ภาษาใดก็ได้) · tech gate อ่านเพื่อตรวจ non-negotiable 1 และ 3 |
| `configKey` | pointer ตาม ADR 0001 3.10.6 (มี `/` = จากราก repo) | ไม่ (แนะนำเมื่อค่ามาจาก config) | lint ตรวจว่าไฟล์และ path มีจริง · ไม่พบ = WARN S7 |
| `_<อะไรก็ได้>` | | ไม่ | โน้ต |

- field อื่น = FAIL S1 · lint ไม่ตีความ `source` (ข้อความอิสระ) ใช้ `configKey` เท่านั้นในการตรวจเครื่อง
- ตัวแปรที่แสดงค่าที่มีผลต่อรางวัล (`successPct`, `gold`, จำนวนของ) ต้องมาจาก server · client ห้ามคำนวณเพื่อแสดง (tech gate)

### 5.3 `configKey` ที่ควรเติม (ตรวจแล้วว่า path มีจริง 2026-09-23)

| ตัวแปร | `configKey` | ค่าปัจจุบัน |
| --- | --- | --- |
| `autoRetreatPct` | `config/balance/dungeons.json#hpSafety.autoRetreatThreshold_pct` | 25 |
| `hpWarnPct` | `config/balance/dungeons.json#hpSafety.lowHpWarningThreshold_pct` | 30 |
| `minAge` | `config/balance/privacy.json#minAge_yr` | 15 |
| `ttlText` | `config/balance/privacy.json#positionLogTtl_s` (ปิด A-P1-F03-T05-4: key อยู่ top-level ของ `balance/privacy.json` ไม่ใช่ `app/privacy.json`) | 86400 |
| `raidDay` | `config/balance/raid.json#schedule.weekday` | saturday |
| `raidStartTime` | `config/balance/raid.json#schedule.startLocalTime` | 16:00 |
| `raidEndTime` | `config/balance/raid.json#schedule.endLocalTime` (P1-H03) | 18:00 |
| `recoverPct` | `config/balance/progression.json#hpRecovery.deathRecoveryTo_pct` | 50 |
| `recoverTime` | `config/balance/progression.json#hpRecovery.deathRecoveryDuration_s` | 1800 |
| `autoPotionPct` | `config/balance/economy.json#autoPotion.defaultThreshold_pct` (ค่าเริ่มต้น · ค่าที่ผู้เล่นตั้งมาจาก server) | 40 |

## 6. `config/content/copy-rules.json`

ค่าที่ lint และ formatter ต้องอ่านเป็นตัวเลขหรือรายการ · ทำตาม convention config (ADR 0001 3.10: `_meta`, `_source`)

```json
{
  "_meta": { "file": "copy-rules.json", "version": 1, "owner": "narrative-designer", "task": "<task>", "doc": "docs/tech/copy-schema.md section 6" },
  "areas": ["account", "age", "class", "common", "consent", "dungeon", "enhance", "gps", "home", "interest", "label", "legal", "lore", "map", "market", "nav", "onboarding", "party", "privacy", "profile", "push", "qc", "raid", "rarity", "roleInfo", "run", "settings", "shop", "unit", "weekday"],
  "limits": {
    "_source": "design/narrative/style-guide.md 4.3; A-P1-F03-T03-1 (uiux-designer confirms); D-023 (legal, HUMAN)",
    "message": { "maxCells": 64, "maxNewlines": 1, "maxCellsPerLine": 32 },
    "button": { "maxCells": 12, "maxNewlines": 0 },
    "buttonFullWidth": { "_source": "D-050", "maxCells": 16, "maxNewlines": 0, "keys": ["run.summaryContinue"] },
    "label": { "maxCells": 20, "maxNewlines": 0 },
    "push": { "titleMaxCells": 24, "maxNewlines": 0 },
    "dialogue": { "maxLines": 5, "maxCellsPerLine": 32, "speakerMaxChars": 24 },
    "command": { "maxCells": 16, "maxNewlines": 0 },
    "legal": { "summaryMaxCells": 64 }
  },
  "formats": {
    "_source": "design/narrative/style-guide.md 4.2",
    "numberLocale": "th-TH",
    "distanceKmFrom_m": 1000,
    "distanceKmDecimals": 1,
    "clockPattern": "HH:mm"
  }
}
```

- `areas` ตั้งต้น = area ทั้ง 25 ที่ไฟล์ copy ใช้อยู่ + `enhance` `market` `shop` `raid` `lore` จาก style guide 4.4 (`quick` ของ style guide ถูกแทนด้วย `qc` ในไฟล์จริง)
- `limits.buttonFullWidth` (D-050, เพิ่มใน P1-X05) ไม่บังคับ · `keys` ต้องเป็น key ที่มีอยู่จริงใน `copy.th.json` และเป็น `kind: button` ทุกตัว มิฉะนั้น FAIL S1 · การเลือกเพดานตามแถวของหัวข้อ 3.2 · เพิ่ม key ในรายการได้เมื่อ uiux-designer ยืนยันว่าหน้าจอนั้นแสดงเป็นปุ่มหลักเต็มความกว้างเดี่ยว
- เปลี่ยนเพดาน = แก้ `limits` จุดเดียว แล้ว narrative-designer แก้ตาราง 4.3 ของ style guide ให้ตรง · `_meta.limits` ในไฟล์ copy เป็นคำอธิบาย ต้องตรงกับไฟล์นี้ (copy gate ตรวจด้วยตา)
- ไฟล์ไม่มี = lint exit 2 (ไม่ถือว่าผ่าน) · P1-H02 ทดสอบด้วย fixture ของตัวเองได้โดยไม่รอไฟล์จริง

## 7. schema และ type ที่ lint กับ client ใช้ร่วมกัน

ตาม ADR 0001 3.2 (`packages/shared` = type, JSON Schema, pure function ที่รันบน server ได้) · แบบเดียวกับ trace

| ไฟล์ | export | ใช้โดย |
| --- | --- | --- |
| `packages/shared/schemas/copy.schema.json` | JSON Schema ของ `copy.<locale>.json`: `_meta`, `_variables`, `patternProperties` ตาม regex ของ key, field หัวข้อ 2.2 | lint (Ajv ใน Node), test |
| `packages/shared/schemas/copy-rules.schema.json` | JSON Schema ของหัวข้อ 6 | lint, test |
| `packages/shared/src/content/copy.ts` | `COPY_VOICES`, `COPY_KINDS`, `COPY_BEATS`, `COPY_KEY_PATTERN`, `ALLOWED_VOICES_BY_KIND` · type `CopyVoice`, `CopyKind`, `CopyBeat`, `CopyEntry`, `CopyMeta`, `CopyExceptionList`, `CopyVariable` · `copyEntries(file: unknown): ReadonlyMap<string, CopyEntry>` (flat, ข้าม key `_`, ไม่แยกจุด, ไม่ validate) · `copyVariables(file: unknown): ReadonlyMap<string, CopyVariable>` | lint, client |
| `packages/shared/src/content/rules.ts` | type `CopyRules`, `CopyLimits`, `CopyFormats` | lint, client formatter |
| `packages/shared/src/content/cells.ts` | `countCells(text: string): number`, `countCellsPerLine(text: string): readonly number[]` | lint, client |
| `packages/shared/src/content/template.ts` | `extractVariables(text): readonly string[]` · `fillTemplate(text, values: Readonly<Record<string, string>>): string` (ขาด → throw `MissingCopyVariableError`) · `fillWithMaxCells(text, variables: ReadonlyMap<string, CopyVariable>): string` · `hasUnbalancedBraces(text): boolean` | lint, client |
| `packages/shared/src/index.ts` | re-export ทั้งหมด | |

- pure ไม่มี DOM ไม่มี Node API · ไม่มีตัวเลขเพดานใน `packages/shared`
- Ajv ใช้ได้เฉพาะใน `tools/` และ test (Worker ห้าม `new Function`) · client ไม่ validate ตอน runtime เพราะ copy ถูกตรวจใน CI ก่อน build
- test ใน `packages/shared/src/content/*.test.ts`: ตัวอย่าง 4.1, fixture ถูก/ผิดผ่านทั้ง JSON Schema และ type (`satisfies CopyEntry`), และ `config/content/copy.th.json` จริงผ่าน `copy.schema.json`

## 8. copy lint (`tools/copy-lint/`, P1-H02) และการใช้ใน client

### 8.1 lint

- workspace `@keep-walking/tools-copy-lint` · dependency `@keep-walking/shared` (workspace), `ajv` 8.20.0, `ajv-formats` 3.0.1 · ไม่มี dependency ใหม่นอกนี้
- การสร้าง `tools/copy-lint/package.json` ถือว่าเขียน lockfile (ADR 0001 3.3) · P1-H02 ต้องได้ Writes `pnpm-lock.yaml`, root `package.json` (เฉพาะ `scripts`), `packages/shared/src/content/`, `packages/shared/schemas/copy*.schema.json`, `packages/shared/src/index.ts` และเป็นงานเดียวใน wave ที่เขียน lockfile
- โครง: `src/cli.ts`, `src/checks/` (1 ไฟล์ต่อ S1–S14), `words.json`, `test/`
- คำสั่ง: root `pnpm lint:copy` → `tsx src/cli.ts` · อ่าน `config/content/copy.th.json`, `copy-rules.json`, `names.th.json` · `--json` สำหรับแนบ copy gate · ไฟล์ copy หรือ rules ไม่มี = exit 2 · `names.th.json` ไม่มี = WARN แล้วข้ามส่วนชื่อของ S2 และ S13
- ผล: 1 บรรทัดต่อข้อ `key · check · FAIL|WARN · ข้อความที่จับได้` · มี FAIL = exit 1 · มีแต่ WARN = exit 0
- เมื่อผ่านแล้ว `pnpm lint:copy` เข้า `pnpm check` และ CI (tech-lead + devops-engineer)
- `words.json`: เนื้อหาเป็นของ narrative-designer · ไม่อยู่ใน `config/` เพราะเกมและหลังบ้านไม่อ่าน · repo public (D-002) ไฟล์จึงเปิดเผยเมื่อ push ซึ่งยอมรับได้ · โครงขั้นต่ำ: `_meta` + key ตาม ID หัวข้อ 6 ของ style guide (`W1` … `W8`, `W8` แยกหมวด `U1`–`U8`) + `latinAllowlist` + `dayNames` (รูปเต็มและรูปสั้น) + `politeEndings` + `jokeSignals` · ทุกคำเป็น source ของ regex flag `u` · ระดับและขอบเขตของแต่ละชุดอยู่ในโค้ดตาม S1–S14

### 8.2 client

- `apps/client/src/copy/` เป็นที่เดียวที่ import `copy.th.json` และ `copy-rules.json` (JSON import ตอน build) · อ่านแบบ flat `file[key]` เท่านั้น
- `t(key, vars?)`: ``CopyKey = Exclude<keyof typeof copyTh, `_${string}`>`` จาก `resolveJsonModule` จับ key ผิดตอน typecheck โดยไม่ต้อง generate code
- formatter (`apps/client/src/copy/format.ts`) จัดรูปตาม `formats` · ค่าจาก config อ่านผ่าน loader ตาม `configKey` · `{raidDay}` = `t("weekday." + weekday)` · ไม่มีชื่อวัน หน่วย หรือเลขเพดานในโค้ด
- **`gpsStateMap` เป็นเอกสาร:** ค่าในนั้นเป็นข้อความผสมคำอธิบายและ assumption โค้ดจึงไม่ parse · mapping จริงอยู่ที่ `apps/client/src/copy/gps-state.ts` เป็นตาราง typed จาก `LocationProviderState` / `LocationErrorCode` (`packages/location/src/types.ts`) → `CopyKey` (TypeScript บังคับว่า key มีจริง) · เกณฑ์ "ต่อเนื่อง" ของ position-unavailable และ accuracy แย่มาจาก config ไม่ใช่ literal (A-P1-F03-T05-3 เป็นของ gameplay-programmer) · test ยืนยันว่าทุก key `gps.*` ที่ปรากฏใน `gpsStateMap` ถูกใช้ในตารางนี้ · lint WARN S1 ถ้า token `gps.<name>` ใน `gpsStateMap` ไม่มีในไฟล์
- ขาดตัวแปรตอน runtime: dev/test → throw · production → `console.error` บอกเฉพาะ key และชื่อตัวแปร แล้วแทนด้วย `—`
- **ห้ามอักษรไทยใน `apps/client/src/**` นอก test** · tech gate: `grep -rnP '[\x{0E00}-\x{0E7F}]' apps/client/src --include='*.ts' --exclude='*.test.ts'` ต้องไม่พบ
- Phase 5 copy อาจมาทางเครือข่าย · `t()` อ่านผ่าน interface `CopySource`

## 9. handoff ถึง narrative-designer (ไม่ขวาง P1-H02)

| # | ทำอะไร |
| --- | --- |
| 1 | เติม `version` และ `doc` ใน `_meta` ของ `copy.th.json` |
| 2 | เติม `configKey` ของ 10 ตัวแปรในหัวข้อ 5.3 และปิด A-P1-F03-T05-4 (`ttlText` อ่าน `config/balance/privacy.json#positionLogTtl_s`) |
| 3 | สร้าง `config/content/copy-rules.json` ตามหัวข้อ 6 (ให้ uiux-designer ยืนยันเพดาน) |
| 4 | ใส่ `dayNames` รูปเต็ม (`พฤหัสบดี`) ใน `tools/copy-lint/words.json` เมื่อ P1-H02 สร้างไฟล์ · แก้ style guide หัวข้อ 7 และ 9 ให้ชี้ `tools/copy-lint/words.json` และ `copy-rules.json` |

## 10. Test hooks (P1-H02, qa-tester)

ครบ 10 แถวท้ายหัวข้อ 7 ของ style guide และเพิ่ม

| อินพุต | ผลที่ต้องได้ |
| --- | --- |
| `run.death` และ `run.death.alt1` อยู่ในไฟล์เดียวกัน | อ่านได้ทั้งสอง key ไม่ชนกัน |
| key ที่มี `altOf` ชี้ key ที่ไม่มี หรือชี้ key ที่มี `altOf` | FAIL S1 |
| `run.death.alt1` (altOf `run.death`) มีคำชุด W3 | FAIL S9 · ข้อความไม่ตรง canon ไม่ FAIL |
| `cellsFirstLine` ใน `voice: system` | FAIL S1 |
| legal บรรทัดแรก 65 ช่อง | FAIL S4 |
| `weekday.saturday` = "วันเสาร์" อยู่ใน `dayNameExceptions` | ผ่าน S6 |
| `weekday.saturday` = "วันเสาร์ 16:00" | FAIL S6 (รูปเวลา และไม่ใช่ชื่อวันล้วน) |
| key ใน `dayNameExceptions` ที่ไม่มีในไฟล์ | FAIL S1 |
| key `run.x` มี field `contex` | FAIL S1 |
| `voice: character` + `kind: message` | FAIL S1 |
| key ซ้ำสองครั้งในไฟล์ดิบ | FAIL S1 |
| ตัวแปร `{fooBar}` ไม่อยู่ใน `_variables` | FAIL S7 |
| `_variables.x.example` ยาวเกิน `maxCells` | FAIL S7 |
| `configKey` ชี้ path ที่ไม่มี | WARN S7 |
| `cells` ต่างจากที่นับ | WARN S4 พร้อมค่าที่ถูก |
| `push.deathTitle` 25 ช่อง | FAIL S4 |
| `countCells("คุณตาย")` / สระอำแบบแยก | 5 / นับเท่ากับ U+0E33 |
| ไฟล์จริง `config/content/copy.th.json` | ไม่มี FAIL S1 จากโครงสร้าง (field, คู่ voice×kind, altOf, ข้อยกเว้น) |
