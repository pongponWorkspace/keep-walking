# F03 — ตรวจ contrast อัตโนมัติ (P1-H04, re-run ใน P1-X15)

| หัวข้อ | ค่า |
| --- | --- |
| task | P1-H04 (handoff จาก P1-F03-T10) · re-run ยืนยันใน **P1-X15** หลัง art-director แก้เอกสารใน P1-X06 |
| ผู้ทำ | qa-tester |
| วันที่ | 2026-09-23 (สร้างครั้งแรก) · อัปเดต 2026-09-23 (P1-X15) |
| ทดสอบ | `qa/tests/unit/contrast.test.ts` (295 tests) ผ่าน `pnpm exec vitest run qa/tests/unit/contrast.test.ts` |
| อินพุต | `art/direction/style-guide.md` §3, §4.1–4.5 · `art/direction/map-style.md` §5, §9 (แก้แล้วใน P1-X06) · `design/ux/tokens.json` |
| ผล | **295/295 ผ่าน — defect ของรอบแรก (§4 ด้านล่าง) ปิดแล้ว** |

## 1. วิธีตรวจ

WCAG 2.x relative luminance และ contrast ratio คำนวณสดในไฟล์ทดสอบเอง (ไม่เพิ่ม dependency ใหม่ ตามข้อกำหนดของ P1-H04):

- `srgbChannelToLinear`, `relativeLuminance`, `contrastRatio` implement สูตรจาก W3C WCAG 2.1 §1.4.3/1.4.11 ตรงตัว
- Self-check กับค่าที่ style-guide เอกสารไว้เอง: L ของ `#1A1A22` = 0.0107, L ของ `#FFF8EE` = 0.9457 (ตรงกับ §3.1) และ black-on-white = 21.00:1 (ค่าตำราของ WCAG) — ทั้งสามผ่าน ยืนยันว่าสูตรถูกต้องก่อนใช้ตรวจคู่สีจริง
- คู่สีทุกคู่เข้ารหัสเป็น data table ในไฟล์ทดสอบ (`CASES_4_1` … `CASES_MAP_STYLE_9`) แต่ละรายการมี comment อ้างอิงหัวข้อต้นทาง (`style-guide §4.x` หรือ `map-style §9`) ตามที่ context ของ task อนุญาตให้ทำแทนการ parse ตารางด้วย regex สำหรับส่วนนี้
- เกณฑ์ตรวจต่อคู่: (ก) `|computed − documented| ≤ 0.05` (ข) ถ้าเป็นข้อความ (`kind: 'text'`) ต้อง ≥ 4.5:1 (ค) ถ้าไม่ใช่ข้อความ (`kind: 'nonText'`, §4.5) ต้อง ≥ 3.0:1 (ง) คู่ที่เอกสารระบุว่า "ห้าม" (`kind: 'illustrativeFail'`) ตรวจแค่ว่าค่าที่คำนวณได้ต่ำกว่า 4.5:1 จริง (ไม่ตรวจ diff เป็นตัวบล็อก เพราะเอกสารตั้งใจให้เป็นตัวอย่างที่ตก)
- ทุก object มี `it('has no duplicate case ids...')` กันไม่ให้เผลอเขียนคู่ซ้ำจนดูเหมือนครบ

## 2. ความครอบคลุม (นับจริงจากไฟล์ทดสอบ, ตรวจด้วย `expect(...).toBe(...)` ในเทสต์ "contrast test data")

| หัวข้อ | จำนวนคู่ | คำนวณจาก |
| --- | --- | --- |
| style-guide §4.1 (ข้อความบนพื้นสว่าง) | 22 | 11 สี × 2 พื้น (paper, surface) |
| style-guide §4.2 (ข้อความบนพื้นสี) | 16 | ทุกแถวในตาราง |
| style-guide §4.3 (ข้อความบนพื้นกลางคืน) | 9 | ทุกแถวในตาราง |
| style-guide §4.4 (ข้อความบนแผนที่) | 6 | ทุกแถวในตาราง |
| style-guide §4.5 (ไม่ใช่ข้อความ ≥3.0) | 31 | ทุกแถว รวมค่าที่เป็น list คั่น "/" แตกเป็นรายคู่ |
| map-style.md §9 (ตาราง contrast บนแผนที่) | 35 | ทุกแถวของตาราง รวมแถวที่ซ้ำคู่สีกับ §4.4/§4.5 (นับแยกเพราะเอกสารระบุ label ต่างบริบท) และแถว "ห้าม" 1 แถว |
| **รวม** | **119** | |

รวมกับ token-equality tests (41 `color.*` rows + 10 `ramp.*` rows ของ §3) และ 3 self-check + 1 dedup-check = **295 tests** ตรงกับผลจริงของ `pnpm vitest run qa/tests/unit/contrast.test.ts`

## 3. ผลรัน (คำสั่งจริง, คัดลอกจาก terminal)

### 3.1 รอบแรก (P1-H04, ก่อนแก้เอกสาร)

```
$ pnpm vitest run qa/tests/unit/contrast.test.ts
 ❯ qa/tests/unit/contrast.test.ts (295 tests | 1 failed) 10-11ms
Test Files  1 failed (1)
     Tests  1 failed | 294 passed (295)
```

### 3.2 Re-run (P1-X15, หลัง art-director แก้ `map-style.md` §9 บรรทัด 223 เป็น 1.22 ใน P1-X06)

ค่าที่เอกสารระบุ (1.16) ยังถูกเขียน hard-code ไว้ในตารางข้อมูลของไฟล์ทดสอบเอง (ไม่ได้ parse จากเอกสารด้วย regex เหมือนส่วน tokens.json) — แก้ค่า `expected` ของเคส `map.road on map.land, no border (map-style §9, documented as forbidden)` จาก `1.16` เป็น `1.22` ใน `qa/tests/unit/contrast.test.ts` ให้ตรงกับ §9 (บรรทัด 223 ปัจจุบัน) และ §5 แถว `roads_minor_casing` ฯลฯ ที่อ้างค่าเดียวกัน ("ถนนขาวบนดินได้แค่ 1.22:1 จึงต้องมีขอบ")

```
$ pnpm exec vitest run qa/tests/unit/contrast.test.ts

 RUN  v5.0.1 /Users/pongpon/Game

 Test Files  1 passed (1)
      Tests  295 passed (295)
   Start at  20:20:06
   Duration  99ms (transform 45%, import 29%, tests 21%, worker 5%)
```

`pnpm exec tsc -p tsconfig.json --noEmit` → exit 0 (ผ่าน)
`pnpm exec eslint qa/tests/unit/contrast.test.ts --max-warnings=0` → exit 0 (ผ่าน)
`pnpm exec prettier --check qa/tests/unit/contrast.test.ts` → "All matched files use Prettier code style!"

หมายเหตุขอบเขต: `tools/copy-lint/test/cli.test.ts` (นอกขอบเขตของ P1-X15 และ P1-H04) ไม่ได้ตรวจซ้ำในรอบนี้เพราะ P1-X15 จำกัดเฉพาะ `qa/tests/unit/contrast.test.ts`; สถานะเดิมของไฟล์นั้นดูหัวข้อ 6 ข้อ 2 (คนละ handoff)

## 4. ข้อผิดพลาดที่พบในรอบแรก — สถานะ: **แก้แล้ว (RESOLVED ใน P1-X15)**

| คู่ | Ratio ที่เอกสารระบุ (รอบแรก) | Ratio ที่คำนวณได้จริง | ส่วนต่าง (รอบแรก) | ที่มา |
| --- | --- | --- | --- | --- |
| `map.road` (#FFFFFF) บน `map.land` (#EEE8DD) ไม่มีขอบ | 1.16 | 1.22 (1.2194) | 0.059 (> 0.05) | `art/direction/map-style.md` §9 (ก่อนแก้): `\| \`map.road\` บน \`map.land\` (ไม่มีขอบ) \| 1.16 \| ห้าม \| เหตุผลที่ถนนทุกระดับมีขอบ \|` |

รายละเอียด: `map.land` มี L = 0.8111 ตามที่ style-guide §3.5 ระบุไว้เอง (คำนวณซ้ำจาก hex `#EEE8DD` ได้ 0.8113 ตรงกันในทางปฏิบัติ) และ `map.road` = `#FFFFFF` มี L = 1.0000 พอดี ดังนั้น contrast ratio ที่ถูกต้องคือ `(1.0000 + 0.05) / (0.8111 + 0.05) = 1.05 / 0.8611 ≈ 1.2194` ไม่ใช่ 1.16 ตามที่บันทึกไว้เดิม — เป็นความคลาดเคลื่อนจากการคำนวณด้วยมือ (สาเหตุที่ P1-H04 ถูกเปิดขึ้นมาตั้งแต่ต้น)

**สถานะปัจจุบัน (P1-X15):** art-director แก้ `art/direction/map-style.md` §9 (บรรทัด 223 ปัจจุบัน) เป็น `1.22` แล้วใน P1-X06 และเพิ่มหมายเหตุอ้างสูตรเดียวกันไว้เหนือหัวตาราง §9 กับใน §5 (แถว `roads_minor_casing`/`roads_major_casing`/`roads_highway_casing`: "ถนนขาวบนดินได้แค่ 1.22:1 จึงต้องมีขอบ") ตรงกับตัวเลขที่ QA คำนวณได้ · แต่ค่าที่เขียนไว้ในตาราง**ข้อมูลทดสอบ** (`qa/tests/unit/contrast.test.ts`, เคส `map.road on map.land, no border (map-style §9, documented as forbidden)`) ยังเป็น `1.16` แบบ hard-code เพราะเคสนี้ transcribe มือจากเอกสาร ไม่ได้ parse ด้วย regex เหมือนส่วน tokens.json §3 — ทำให้ orchestrator รันซ้ำแล้วยังเห็น FAIL ทั้งที่เอกสารถูกแล้ว
แก้ใน P1-X15: เปลี่ยน `expected: 1.16` เป็น `expected: 1.22` ในไฟล์ทดสอบ (คอมเมนต์อ้าง P1-X06 กำกับไว้) แล้ว re-run — ผ่านครบ 295/295 (หัวข้อ 3.2)

**ผลต่อการออกแบบ: ไม่มี** แถวนี้เป็นแถวอธิบายเหตุผล ("เหตุผลที่ถนนทุกระดับมีขอบ") ไม่ใช่ค่าที่ใช้จริงบนแผนที่ (ถนนทุกเส้นมีเส้นขอบ `map.road-casing` เสมออยู่แล้วตาม §3.5 และ §9) ทั้ง 1.16 และ 1.22 ต่างก็ต่ำกว่า 4.5:1 มาก จึงไม่เคยเปลี่ยนข้อสรุปการออกแบบ ที่ต้องแก้คือตัวเลขในเอกสาร (แก้แล้ว) และตัวเลขในตารางข้อมูลทดสอบ (แก้แล้วในงานนี้) เท่านั้น

## 5. tokens.json เทียบ style-guide §3 (hex ต้องตรงตัวทุกไบต์)

Test อ่าน `art/direction/style-guide.md` §3 ด้วย regex (`\|\s*`color\.([a-zA-Z0-9_.-]+)`\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|`) แทนการเข้ารหัสมือ เพื่อกันการพลาดถ้ามีคนเพิ่มโทเค็นใหม่แล้วลืมอัปเดตเทสต์ — ถ้า regex หาแถวไม่เจอครบ เทสต์ `parsed exactly 41 color.* rows` / `parsed exactly 10 ramp.* rows` จะ FAIL ก่อน

ผล: parse ได้ 41 แถว `color.*` (ink, bg, accent, rift, state, rarity, class, map) และ 10 แถว `ramp.*` (asphalt, concrete, foliage, water, cone, plastic, rift, heat, wood, metal) — **ทุกแถวตรงกับ `design/ux/tokens.json` แบบ byte-for-byte ทั้งหมด (51/51 ผ่าน)** รวมถึงกรณีชื่อ key ที่ style-guide ใช้ kebab-case (`state.danger-on-night`, `class.tanker-text`) แล้ว tokens.json ใช้ camelCase (`stateDangerOnNight`… ที่จริงคือ `state.dangerOnNight`, `class.tankerText`) — แปลงชื่อถูกต้องและค่ายังตรงกัน

**หมายเหตุ (นอกขอบเขต P1-X15, Phase 2 carry-over):** style-guide §3.4 ตอนนี้มีแถว `ramp.*` เพิ่มอีก 12 แถวที่ regex ของเทสต์นี้ยังไม่จับ คือ `ramp.skin-1`…`ramp.skin-6` และ `ramp.hair-1`…`ramp.hair-6` (ชื่อ avatar skin/hair) — regex ปัจจุบันคือ `` /\|\s*`ramp\.([a-z]+)`\s*\|.../ `` ใช้ `[a-z]+` ล้วน ไม่มีตัวเลขหรือขีดกลาง จึงข้ามแถวที่ชื่อมีขีดกลางกับตัวเลข (`skin-1`, `hair-1`, ...) ไปเฉย ๆ แทนที่จะ error — ตรวจแล้วว่า `design/ux/tokens.json` **ยังไม่มี** `color.ramp.skin-*` หรือ `color.ramp.hair-*` เลยสักคีย์ (parse ตรงด้วย `python3 -c "import json; ..."` เห็นแค่ 10 คีย์เดิม) ดังนั้นการไม่จับ 12 แถวนี้ตอนนี้**บังเอิญไม่บดบัง drift ที่มีอยู่จริง** (เพราะฝั่ง token ก็ยังไม่มีเช่นกัน) แต่เป็นช่องโหว่ที่ต้องปิดเมื่อ token เหล่านี้ถูกเพิ่มจริง มิฉะนั้นเทสต์นี้จะไม่จับความต่างของ hex ให้ · ตามขอบเขตของ P1-X15 (ห้ามขยาย ramp regex ในงานนี้) จึงบันทึกไว้เป็นงานส่งต่อ ไม่แก้ในรอบนี้

## 6. Traceability: ทุกข้อใน checklist ของ board P1-H04

| ข้อใน board.md `#### P1-H04` | หลักฐาน |
| --- | --- |
| test ใน `qa/tests/unit/contrast.test.ts` คำนวณ WCAG 2.x contrast ของทุกคู่ใน style-guide §4.1–4.5 จาก hex (ไม่เพิ่ม dependency ใหม่) รันผ่าน `pnpm test` | ไฟล์มี 119 คู่ (§4.1–4.5 = 84 คู่ + map-style §9 = 35 คู่) คำนวณสดจาก hex ด้วยฟังก์ชันที่เขียนเอง ไม่มี import ใหม่ (ตรวจ `pnpm-lock.yaml` ไม่เปลี่ยน) · `pnpm exec vitest run qa/tests/unit/contrast.test.ts` → **295/295 ผ่านทั้งหมด** (P1-X15, หัวข้อ 3.2) |
| รายงาน `qa/reports/F03-contrast-check.md`: ทุกค่าที่ต่างจากตารางเกิน 0.05 และทุกคู่ที่ตกเกณฑ์ 4.5:1 · ถ้าพบ ส่ง handoff ถึง art-director | เอกสารนี้ หัวข้อ 4 ระบุ defect รอบแรก (`map.road`/`map.land` 1.16 vs 1.22) และสถานะ **แก้แล้ว**: art-director แก้เอกสารใน P1-X06, qa-tester แก้ค่า hard-code ในตารางข้อมูลทดสอบใน P1-X15 · ไม่มีคู่ข้อความ (`kind: text`) คู่ใดตกเกณฑ์ 4.5:1 — ทุกคู่ข้อความ 84 คู่ผ่าน (ดูหัวข้อ 2) |

## 7. Handoffs

1. **ถึง art-director — ปิดแล้ว (เดิม blocking: yes ตาม acceptance ของ P1-H04)** — แก้ `art/direction/map-style.md` §9 (ตอนนี้บรรทัด 223): เปลี่ยนค่า ratio ของแถว `map.road บน map.land (ไม่มีขอบ)` จาก `1.16` เป็น `1.22` — **ดำเนินการแล้วใน P1-X06** ยืนยันซ้ำในงานนี้ว่าเอกสารปัจจุบันมี `1.22` และมีหมายเหตุอ้างสูตรเดียวกันทั้งใน §5 และเหนือตาราง §9
2. **ถึง gameplay-programmer หรือ tech-lead (blocking: no, นอกขอบเขต P1-H04/P1-X15)** — `tools/copy-lint/test/cli.test.ts` มี 1 ข้อ FAIL อยู่ก่อนงานนี้แล้ว (`exits 0 with only expected WARNs against the real config files`, key ที่คาดไม่เจอใน `expectedUnusedVariableWarnings`) ไม่เกี่ยวกับ contrast แต่ทำให้ `pnpm test` ทั้ง repo ไม่เขียวสนิท ไม่ตรวจซ้ำในงานนี้ (P1-X15 จำกัดเฉพาะ `qa/tests/unit/contrast.test.ts`) ยังคงเป็น handoff เปิดค้างจากรายงานเดิม
3. **ถึง art-director/tech-lead หรือใครก็ตามที่เพิ่ม `design/ux/tokens.json` ramp token ใน Phase 2 (blocking: no, carry-over)** — เมื่อเพิ่ม `color.ramp.skin-*` / `color.ramp.hair-*` ให้ตรงกับ style-guide §3.4 แล้ว ให้ขอ qa-tester ขยาย regex `rampRowPattern` ใน `qa/tests/unit/contrast.test.ts` จาก `` `ramp\.([a-z]+)` `` เป็นรูปแบบที่รับตัวเลขและขีดกลางด้วย (เช่น `[a-z0-9-]+`) มิฉะนั้นเทสต์นี้จะไม่ตรวจ 12 แถวใหม่นั้นเงียบ ๆ (ดูหัวข้อ 5)

## 8. สรุป

- ครอบคลุมครบทุกคู่ใน style-guide §4.1–4.5 (84 คู่) และตาราง contrast ของ map-style §9 (35 คู่) = 119 คู่ ตามข้อกำหนด "every pair … must be covered"
- คำนวณ WCAG 2.x จาก hex ในโค้ดเอง ไม่เพิ่ม dependency (ตรวจแล้วว่า `pnpm-lock.yaml` ไม่ถูกแก้)
- เกณฑ์ 4.5:1 สำหรับข้อความ: **ผ่านทุกคู่ (84/84)**
- เกณฑ์ 3.0:1 สำหรับองค์ประกอบที่ไม่ใช่ข้อความ (§4.5 + ส่วนที่เกี่ยวข้องใน §9): **ผ่านทุกคู่ (35/35)**
- ค่าที่เคยต่างจากตารางเกิน 0.05: **พบ 1 คู่ในรอบแรก (หัวข้อ 4) — แก้แล้วทั้งเอกสาร (P1-X06) และตารางข้อมูลทดสอบ (P1-X15)**
- `design/ux/tokens.json` ตรงกับ hex ใน style-guide §3 ทุกไบต์ (51/51 โทเค็น รวม ramp เดิม 10 ตัว) — 12 แถว ramp skin/hair ใหม่ยังไม่อยู่ในทั้งสองไฟล์ ไม่ตรวจในรอบนี้ตามขอบเขต (หัวข้อ 5, handoff ข้อ 3)
- **ผลรวม: `pnpm exec vitest run qa/tests/unit/contrast.test.ts` → 295/295 ผ่าน** ไม่มีข้อ FAIL ค้างในไฟล์นี้อีกต่อไป
- ผลลัพธ์นี้เป็นอินพุตของ visual content gate P1-F03-T22 (art-director) ตามที่ context ของ task ระบุ
