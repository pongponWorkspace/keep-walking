# Dungeon Preset (สวนใหญ่ / ตลาด / สวนหย่อม)

Task: P1-F03-T09 · เจ้าของ: level-designer · สถานะ: DRAFT พร้อมให้ P1-F03-T24 (design gate A) และงาน F14 (หลังบ้าน, ยังไม่ plan) ใช้
อ้างอิง: `design/levels/dungeon-rules.md` หัวข้อ 7, 12 (ยืนยันขอบเขต size band) · `design/levels/launch-criteria.md` หัวข้อ 4.4 (`presetDiversityScore`) · `config/balance/dungeons.json` (`area`, `coverageFilter.sizeBandUpper_m2`, `levelRange`, `verification`) · `config/balance/drops.json` (`smallDungeon`) · `design/systems/sim-report.md` F-15 · `design/narrative/world.md` หัวข้อ 5, 11 · D-049 (ยอมรับแล้ว) · `data/coverage/candidates.geojson` (741 candidates, ข้อมูลจริง 2026-09-01) · `tools/coverage/README.md` หัวข้อ 7

หลักการอ่านเอกสารนี้: เอกสารนี้ตอบคำถาม **"สถานที่ประเภทไหนได้ preset ไหน"** และให้เหตุผลว่าทำไม preset เล็กยังน่าไป เอกสารนี้ **ไม่ตั้งค่า balance ใหม่** — ทุกช่วงขนาด ตัวคูณ และ drop table อ้าง key ใน `config/balance/` ทั้งหมด (SF-8) ค่าที่เป็นของเอกสารนี้เองมีอย่างเดียวคือ **กฎจับคู่ preset** (class + size_band → preset) และ **ช่วงเลเวลตั้งต้นที่แนะนำ** ซึ่งเป็นแนวทางให้ F14 กรอก ไม่ใช่ค่าที่ระบบ runtime บังคับ

## 1. สามสิ่งที่ต้องแยกให้ชัด (D-049)

| สิ่ง | preset หลัก (เอกสารนี้) | ชั้นที่สอง | lifecycle field |
| --- | --- | --- | --- |
| สวนใหญ่ / ตลาด / สวนหย่อม | ใช่ — 3 preset ตาม GDD "การกำหนด dungeon" | — | — |
| ริมน้ำ / ริมคลอง | ไม่ใช่ preset หลัก | ใช่ — กฎรูปทรงเพิ่มเติม (`maxAspectRatio` ที่เสนอใน `dungeon-rules.md` หัวข้อ 12) ทับซ้อนกับ preset หลักได้ (เช่น ตลาดริมน้ำ) | — |
| "ชั่วคราว" | ไม่ใช่ preset | — | ใช่ — field `temporaryDungeon` ใน `data/dungeons/dungeons.json` แยกจาก preset โดยสิ้นเชิง (D-049) ตลาดนัดชั่วคราวได้ preset "ตลาด" + `temporaryDungeon` พร้อมกัน |
| ตลาดนัดจตุจักร | preset "ตลาด" | — | **ไม่ใช่** ชั่วคราว — ถาวรที่มี `opening_hours` จำกัดวัน (D-049) |

preset ตอบ "ธีมและมอนสเตอร์แบบไหน" (หัวข้อ 3–4) · lifecycle field ตอบ "อยู่นานแค่ไหน" · สองมิตินี้เลือกได้อิสระต่อกัน

## 2. กฎจับคู่ preset ← class + size_band (ของเอกสารนี้เอง ไม่ใช่ config runtime)

ใช้จับคู่ candidate ของจริงเป็น preset สำหรับตารางในหัวข้อ 4 และเป็นกฎเริ่มต้นที่เสนอให้ F14 (หลังบ้าน, ยังไม่ plan) ใช้ตอนสร้าง dungeon ใหม่จาก polygon:

1. `class == marketplace` → **ตลาด** ไม่ว่า `size_band` จะเป็นอะไร — ตลาดคือตลาดไม่ว่าจะเป็นแผงลอยแถวเดียวหรือทั้งลาน ธีมและมอนสเตอร์ไม่เปลี่ยนตามขนาด
2. `class != marketplace` และ `size_band == small` → **สวนหย่อม**
3. `class != marketplace` และ `size_band ∈ {medium, large}` → **สวนใหญ่**

เหตุผลที่ไม่แยก "สวนกลาง" เป็น preset ที่ 4: GDD กำหนด preset ตั้งต้นไว้ 3 แบบเท่านั้น ("ควรมี preset ในหลังบ้าน ('สวนใหญ่' 'ตลาด' 'สวนหย่อม')") การเพิ่ม preset ที่ 4 ต้องขอ decision ใหม่ ไม่ใช่หน้าที่เอกสารนี้ตัดสินเอง ส่วน `size_band = medium` ที่ไม่ใช่ตลาด (สวนสาธารณะระดับกลาง เช่น สวนของเทศบาล) ยังคงเป็น "สวนใหญ่" preset แต่จะอยู่ครึ่งล่างของช่วงขนาด — preset ให้ธีม/มอนสเตอร์ ส่วนตัวคูณ dungeon เล็ก (หัวข้อ 5) เป็นคนละแกนที่ตัดที่ขนาดจริง ไม่ใช่ preset

`class` ที่พบจริงในข้อมูล 741 candidates: `park`, `garden`, `historic`, `attraction`, `pitch` (ไม่ใช่ตลาด) และ `marketplace` (ตลาด) — ตรงกับ tag 6 ชุดใน GDD "ปัญหา coverage ที่ต้องแก้ก่อนเริ่ม" (`leisure=park`, `amenity=marketplace`, `leisure=garden`, `historic=*`, `tourism=attraction`, `leisure=pitch`)

## 3. นิยาม 3 preset (ทุกช่วงขนาด/ตัวคูณ/drop table เป็น pointer เข้า `config/balance/`)

| preset | `class` | `size_band` | ช่วงพื้นที่ (pointer) | ธีม (world.md หัวข้อ 5) |
| --- | --- | --- | --- | --- |
| สวนใหญ่ (`largePark`) | park, garden, historic, attraction, pitch | medium, large | `dungeons.json#coverageFilter.sizeBandUpper_m2.small` (ขอบล่าง) ถึง `dungeons.json#area.maxArea_m2` (ขอบบน) | คนวิ่งตอนเย็น แดด ยุง สัตว์ในสวน |
| ตลาด (`market`) | marketplace | small, medium, large (ทุกขนาด) | `dungeons.json#area.minArea_m2` ถึง `dungeons.json#area.maxArea_m2` (เต็มช่วง เพราะ preset นี้กำหนดด้วย class ไม่ใช่ขนาด) | คิว ควันปิ้งย่าง ถุงพลาสติก ต่อราคา |
| สวนหย่อม (`pocketPark`) | park, garden, historic, attraction, pitch | small | `dungeons.json#area.minArea_m2` ถึง `dungeons.json#coverageFilter.sizeBandUpper_m2.small` | คนนั่งเล่นมือถือ ลานกีฬาชุมชน |

**ยืนยัน id (ตอบ orchestrator, ประเด็น A-1):** ใช้ id ที่ `config/content/names.th.json#_meta.presetIds` เสนอไว้ (ASSUMPTION A-P1-F03-T04-1) คือ `largePark` / `market` / `pocketPark` เป็น id ทางการของทั้ง 3 preset — `data/dungeons/presets.json` เป็นแหล่งยืนยัน (level-designer เป็นเจ้าของ `data/dungeons/*`) `waterside` **ไม่ใช่ preset ที่ 4** เป็นชั้นที่สองเท่านั้น (ยืนยันตาม D-049 อีกครั้ง — ดูหัวข้อ 1)

ค่าที่ pointer ชี้ไปจริง ณ วันที่เขียนเอกสารนี้ (ไม่ hardcode ในระบบ อ่านได้จากไฟล์เดียวกันเสมอ): `area.minArea_m2 = 3,000`, `coverageFilter.sizeBandUpper_m2.small = 10,000`, `coverageFilter.sizeBandUpper_m2.medium = 50,000`, `area.maxArea_m2 = 150,000` — ตัวเลขเหล่านี้เขียนในเอกสารนี้เพื่ออธิบายให้อ่านง่ายเท่านั้น `presets.json` **ไม่คัดลอกตัวเลข** เก็บเฉพาะ pointer

## 4. หลักฐานจากข้อมูลจริง 741 candidates (2026-09-01, ยังไม่ใช่ผล Go/No-go — ดู `coverage-report.md` P1-F01-T07)

รันกฎหัวข้อ 2 กับ `data/coverage/candidates.geojson` ทั้ง 741 ชิ้น (สคริปต์ตรวจอยู่ในหัวข้อ 9 ของเอกสารนี้ ผลตรงกับ `tools/coverage/README.md` หัวข้อ 7 ที่แยกตาม `class`/`size_band` อยู่แล้ว):

| preset | รวม | small | medium | large |
| --- | --- | --- | --- | --- |
| สวนใหญ่ | 216 | — | 178 | 38 |
| ตลาด | 141 | 70 | 59 | 12 |
| สวนหย่อม | 384 | 384 | — | — |
| **รวม** | **741** | | | |

แยกตามจังหวัด (ยืนยันว่าทั้ง 3 preset มีตัวแทนในทุกจังหวัด → `presetDiversityScore` ตาม `launch-criteria.md` หัวข้อ 4.4 คำนวณได้จริงในทุกย่านที่มี candidate):

| จังหวัด | สวนใหญ่ | ตลาด | สวนหย่อม | รวม |
| --- | --- | --- | --- | --- |
| กรุงเทพมหานคร | 144 | 83 | 232 | 459 |
| ปทุมธานี | 18 | 15 | 43 | 76 |
| นนทบุรี | 13 | 14 | 48 | 75 |
| สมุทรปราการ | 21 | 21 | 25 | 67 |
| สมุทรสาคร | 11 | 2 | 22 | 35 |
| นครปฐม | 9 | 6 | 14 | 29 |
| **รวม** | **216** | **141** | **384** | **741** |

ข้อสังเกต: สวนหย่อมเป็นกลุ่มใหญ่ที่สุด (384/741 ≈ 52%) และกระจายทุกจังหวัดในสัดส่วนใกล้เคียงกัน ตรงกับเจตนา "spread low-level dungeons close to where new players live" — สวนหย่อมมีจำนวนมากพอที่จะเป็น dungeon เริ่มต้นใกล้บ้านในแทบทุกย่าน ส่วนสวนใหญ่กระจุกที่กรุงเทพฯ มากกว่าสัดส่วนเฉลี่ย (144/216 ≈ 67% เทียบกับกรุงเทพฯ ที่มี 459/741 ≈ 62% ของ candidate ทั้งหมด) เพราะสวนสาธารณะขนาดกลาง-ใหญ่ของทางการกระจุกตัวในเมืองชั้นในมากกว่าปริมณฑล

## 5. ทำไมสวนหย่อมยังน่าไป (rare สูงกว่า)

สองเหตุผลประกอบกัน ทั้งคู่มาจากค่าที่มีอยู่แล้วใน config ไม่ใช่ค่าใหม่ของเอกสารนี้:

1. **ตัวเลขจริงจาก simulator (F-15, `design/systems/sim-report.md` หัวข้อ 3, 7):** dungeon เล็กให้ gold/ชม. มากกว่า dungeon ปกติ **+8.9% (1,620 เทียบ 1,488)** เพราะ `drops.json#multipliers.smallDungeonRareAndAboveMult = 1.5` (หินรอยแยก มูลค่าสูง) มีน้ำหนักต่อรายได้มากกว่าที่ `smallDungeonCommonQuantityMult = 0.6` (ผงธาตุ มูลค่าต่ำ) จะฉุดลง — คนที่คิดว่า "ของน้อยกว่า = คุ้มน้อยกว่า" คำนวณผิด เพราะของที่มีค่าเป็นของหายาก ไม่ใช่ของธรรมดา
2. **ต้นทุนการเดินทาง:** ตาม non-negotiable ข้อ 6 ของ CLAUDE.md ("Low penalty, high travel cost") การเดินไปสวนใหญ่ที่ไกลกว่าเสียเวลาเดินมากกว่าโดยไม่ได้ reward ต่อชั่วโมงสูงกว่า (F-15 ชี้ว่าสวนเล็กสูงกว่าด้วยซ้ำ) — สวนหย่อมใกล้บ้านจึงเป็นตัวเลือกที่ **มีเหตุผลทางเศรษฐกิจ** ไม่ใช่แค่ "ทางเลือกสำรองตอนขี้เกียจเดินไกล" ตรงกับ GDD "dungeon เล็กต้องมีเหตุผลให้ไป"

ผลต่อการออกแบบ: preset สวนหย่อมไม่ใช่ preset ที่ "ด้อยกว่า" preset อื่น เป็นแค่ "ธีมสถานที่เล็ก" ที่ได้ประโยชน์จากกลไก dungeon เล็กเหมือนกันทุกที่ที่พื้นที่เล็กพอ (ดูหัวข้อ 6 — เกณฑ์ dungeon เล็กตัดที่ขนาดจริง ไม่ใช่ preset)

## 6. ตัวคูณ dungeon เล็ก: คนละแกนกับ preset

`drops.json#smallDungeon.smallDungeonMaxArea_m2 = 20,000` ตร.ม. เป็นเกณฑ์ตัดที่ **ขนาดจริง** ไม่ใช่ preset ดังนั้น:

- สวนหย่อม (`area_m2 ≤ 10,000` เสมอ) **ได้ตัวคูณนี้ 100% ของกรณี** (384/384 ในข้อมูลจริง)
- สวนใหญ่ครึ่งล่างของช่วง (10,000–20,000 ตร.ม. ซึ่งยังอยู่ใน `size_band = medium`) **ก็ได้ตัวคูณเดียวกัน** แม้จะเป็น preset "สวนใหญ่" — ในข้อมูลจริง 105 จาก 216 ชิ้นของ preset สวนใหญ่ (≈49%) มีขนาดต่ำกว่า 20,000 ตร.ม. และได้ตัวคูณ rare สูงขึ้นเหมือนสวนหย่อม
- ตลาด: 101 จาก 141 ชิ้น (≈72%) มีขนาดต่ำกว่า 20,000 ตร.ม. เช่นกัน

**ข้อสรุปสำหรับ F14:** preset บอกธีม/มอนสเตอร์ ส่วนตัวคูณ dungeon เล็กคำนวณจากพื้นที่จริงของ polygon นั้นเองเสมอ ไม่ต้องผูกสวิตช์เพิ่มต่อ preset — ระบบหลังบ้านอ่าน `area_m2` ที่คำนวณจาก polygon แล้วเทียบกับ `smallDungeonMaxArea_m2` โดยตรง

## 7. เวลาทำการ (แหล่งข้อมูล ตาม `dungeon-rules.md` หัวข้อ 5)

สัดส่วน candidate ที่มี OSM `opening_hours` ติดมาแล้ว (ข้อมูลจริง 741 ชิ้น):

| preset | มี `opening_hours` จาก OSM | รวม | สัดส่วน |
| --- | --- | --- | --- |
| สวนใหญ่ | 27 | 216 | 12.5% |
| ตลาด | 12 | 141 | 8.5% |
| สวนหย่อม | 7 | 384 | 1.8% |

ทุก preset ใช้กฎเดียวกัน (`dungeon-rules.md` หัวข้อ 5): มี `opening_hours` ใน OSM ใช้ค่านั้น ไม่มีให้ `opening_hours_source = manual_required` — เอกสารนี้ไม่เสนอ default เวลาแทน OSM เพราะ CLAUDE.md ห้าม fallback เป็นค่าที่คิดเอง

- **สวนหย่อมต้องกรอกเองเกือบทุกครั้ง** (98.2% จะเป็น `manual_required`) เพราะลานเล็กระดับชุมชนแทบไม่มีป้ายเวลาทำการที่ OSM แม็บไว้ — F14 ควรเตรียม default เวลาเสนอ (เช่น "เปิดตลอดวัน" หรือ "ตามเวลาสวนสาธารณะทั่วไป") ให้คนกรอกเลือกแทนปล่อยว่าง แต่ **ค่า default นั้นเป็นงานของ F14 ไม่ใช่ของเอกสารนี้**
- **ตลาดต้องระวังเป็นพิเศษ** ตาม `dungeon-rules.md` หัวข้อ 5: ตลาดที่เปิดเฉพาะบางวัน (เสาร์-อาทิตย์) เป็น **dungeon ถาวรที่มี `opening_hours` จำกัดวัน ไม่ใช่ dungeon ชั่วคราว** (D-049, ตัวอย่างตลาดนัดจตุจักร) ต้องแยก field `temporaryDungeon` ออกจากกันตอนกรอกข้อมูลจริง (ดูหัวข้อ 1)

## 8. ช่วงเลเวลตั้งต้นที่แนะนำ (ข้อมูลของ preset เอง ไม่ใช่ค่า runtime บังคับ)

`dungeons.json#levelRange.rangeRequired = true` บังคับให้ทุก dungeon มีช่วง (ไม่ใช่ค่าเดียว) และ `#levelRange.exampleRangeWidth_levels = 10` เป็นความกว้างตัวอย่าง แต่ **ไม่มีคีย์ config ใดกำหนดว่า preset ไหนควรเริ่มที่เลเวลเท่าไร** — นี่คือ "ข้อมูลของ preset เอง" ตามที่ acceptance ของงานนี้ระบุ (เทียบเหตุผลกับ SF-8) ข้อเสนอต่อไปนี้เป็นแนวทางให้ F14 เลือกช่วงจริงต่อ dungeon แต่ละแห่ง ไม่ใช่ค่าที่ผูกมัด

หลักที่ใช้: **progression ระดับเลเวลอิงภูมิศาสตร์** — dungeon เลเวลต่ำต้องกระจายใกล้ที่คนใหม่อยู่ เพื่อให้โมเมนต์ "ใกล้แค่ 650 ม." เกิดได้บ่อย (จากข้อมูลหัวข้อ 4 สวนหย่อมมีจำนวนมากที่สุดและกระจายทุกจังหวัดสม่ำเสมอที่สุด — เหมาะเป็นชั้นเลเวลต่ำสุด) ส่วน preset ที่หายากกว่าและมักเป็นจุดหมายที่ต้องเดินไกลกว่า (สวนใหญ่ระดับแลนด์มาร์ก) เหมาะเป็นเป้าหมายที่ผู้เล่นเดินทางไปเมื่อเลเวลสูงขึ้น

| preset | ช่วงเลเวลแนะนำ (ขอบเขตกว้างสุดที่ F14 เลือกย่อยได้) | เหตุผล |
| --- | --- | --- |
| สวนหย่อม | 1–15 | จำนวนมากที่สุด (384) กระจายทุกจังหวัดสม่ำเสมอที่สุด (หัวข้อ 4) — ควรเป็นชั้น onboarding ที่คนใหม่เจอใกล้บ้านแทบทุกที่ ใช้ sub-range แคบภายในช่วงนี้ (เช่น 1–5 หรือ 5–15) ต่อ dungeon แต่ละแห่งตามที่ `levelRange.exampleRangeWidth_levels` แนะนำ |
| ตลาด | 10–30 | จำนวนปานกลาง (141) กระจายทุกจังหวัดแต่น้อยกว่าสวนหย่อม — จุดหมายขั้นถัดไปหลังพ้นช่วงเริ่มต้น เข้าถึงด้วยขนส่งสาธารณะได้ดี (ตรงกับน้ำหนัก `transitAccessScore` ใน `launch-criteria.md` หัวข้อ 4.3) |
| สวนใหญ่ | 20–50 | จำนวนรองสุดท้าย (216) แต่ landmark ระดับ `size_band = large` (38 ชิ้น) กระจุกที่กรุงเทพฯ ชั้นใน — เหมาะเป็นเป้าหมายเดินไกลของผู้เล่นที่เลเวลสูงขึ้นแล้ว ส่วนที่เป็น `size_band = medium` (178 ชิ้น) ใช้ครึ่งล่างของช่วงนี้ได้เพราะกระจายทั่วถึงกว่า |

ช่วงเหล่านี้ทับกันโดยตั้งใจ (progression เป็นสเปกตรัมต่อเนื่อง ไม่ใช่บันไดตัดชัด) F14 เลือกช่วงจริงแคบกว่านี้ต่อ dungeon โดยพิจารณาระยะจากศูนย์กลางย่านและ dungeon ข้างเคียงประกอบ (`launch-criteria.md` หัวข้อ 4.2) เพื่อไม่ให้เลเวลกระโดดข้ามย่านที่ติดกัน

## 9. มอนสเตอร์: มีชื่อ/ธีมแล้ว ยังไม่มี id เชิงกลไก

ระหว่างทำงานนี้ narrative-designer ส่ง `config/content/names.th.json` (P1-F03-T04) เข้ามาแล้ว (ชุดเริ่มต้น ไม่ใช่ชุดสุดท้าย) มี key กลุ่ม `monster.*` พร้อม field `_family` ที่ผูกกับ preset ตรงกับ id ที่หัวข้อ 3 ใช้พอดี — `presets.json` จึงอ้าง content key จริงต่อ preset ได้แล้ว (แทนที่จะชี้ไปที่ `world.md#5` แบบกว้างๆ เหมือนฉบับร่างแรก):

| preset | monster key (`_family` ตรงกัน) |
| --- | --- |
| สวนใหญ่ (`largePark`) | `monster.pigeonRegular`, `monster.sixPmMosquitoBall`, `monster.monitorLizardRoadblock` |
| ตลาด (`market`) | `monster.floatingCarrierBag`, `monster.wanderingStallUmbrella`, `monster.grillSmokeBlob`, `monster.chasingSaleSign`, `monster.milkTeaQueueTail` |
| สวนหย่อม (`pocketPark`) | `monster.noReturnBall`, `monster.noSittingBench`, `monster.wrigglingHose` |
| ทุก preset (`_family: anyPreset`, ตามอากาศ) | `monster.stubbornPuddle`, `monster.threePmHeatBlob`, `monster.wanderingTrafficCone`, `monster.tangledWireBall` |
| ชั้นที่สอง ริมน้ำ (`_family: waterside`) | `monster.walkingWaterHyacinth`, `monster.boatWakeSplash` |

ตรวจแล้ว (สคริปต์ในหัวข้อ 12): ทุก key ที่ `presets.json` อ้างมีอยู่จริงใน `names.th.json` และ `_family` ตรงกับ preset ที่อ้างทุกตัว (23 การอ้างอิง ไม่มีตกหล่น ไม่มี mismatch)

สิ่งที่ **ยังไม่มี** และเอกสารนี้ไม่สร้างขึ้นเอง: ยังไม่มีไฟล์ monster roster config เชิงกลไก (HP, ATK, น้ำหนัก drop ต่อมอนสเตอร์) ใน `config/balance/` (ตรวจแล้ว ไม่มีไฟล์ `*monster*`) — `names.th.json` มีแค่ชื่อและไอเดีย ไม่มีตัวเลข ดังนั้น field `monster_roster_ids` ของ dungeon record จริง (ตาม "You own" ของบทบาทนี้) ยังต้องเป็น `null` จนกว่างาน monster-roster config เชิงกลไก (ยังไม่ plan) จะเสร็จ — ตรงกับ convention `null` = ยังไม่ตั้ง ของ ADR 0001 หัวข้อ 3.10.5 ระหว่างนี้ `presets.json` ใช้ field `monsterKeys`/`sharedWeatherMonsterKeys` เป็น "กลุ่มธีมที่ใช้ได้" ไม่ใช่ roster ที่ผูกกับ dungeon จริงยังไม่ได้

### 9.1 ตรวจ ตัวอย่าง "คลองโอ่งอ่าง" กับ polygon จริง (ตอบ orchestrator ประเด็น A-2)

`names.th.json#dungeon.khlongOngAng` ตั้ง `_preset: "pocketPark"`, `_layer: "waterside"` ไว้เป็น **ASSUMPTION A-P1-F03-T04-2** และรอ level-designer ยืนยันจาก polygon จริงตามที่ตัวไฟล์เขียนไว้เอง — ตรวจแล้วกับ `data/coverage/candidates.geojson` พบ candidate จริงของสถานที่นี้:

```
id: osm-w950315091 · name: "ถนนคนเดินคลองโอ่งอ่าง" (Khlong Ong Ang Walking Street)
class: marketplace · size_band: medium · area_m2: 12,505.3
opening_hours: "Fr-Su 16:00-22:00" · flags: crosses_major_way, multi_district
```

**ผลตรวจ:** `class = marketplace` ดังนั้นตามกฎหัวข้อ 2 ข้อ 1 ของเอกสารนี้ preset ที่ถูกต้องคือ **`market`** ไม่ใช่ `pocketPark` — ชั้นที่สอง `waterside` ยังถูกต้อง (เดินเลียบคลองจริง) นี่ยังเป็นตัวอย่างจริงที่ตรงกับกฎ `dungeon-rules.md` หัวข้อ 5/11 พอดี: ตลาดเดินเปิดเฉพาะศุกร์-อาทิตย์ 16:00–22:00 คือ **dungeon ถาวรที่มี `opening_hours` จำกัดวัน ไม่ใช่ dungeon ชั่วคราว** (แบบเดียวกับตลาดนัดจตุจักร ตาม D-049) **Handoff ถึง narrative-designer:** แก้ `names.th.json#dungeon.khlongOngAng._preset` จาก `"pocketPark"` เป็น `"market"` (ไม่ต้องแก้ `nameReal`/`nameSuffix`/`_layer`) — บันทึกไว้ใน `presets.json#workedExample_khlongOngAng` แล้ว

## 10. `verification_mode` และ `floor_level`

ทุก preset ใช้ค่าเดียวกันเสมอใน v1 (non-negotiable ข้อ 5 ของ CLAUDE.md, `dungeon-rules.md` หัวข้อ 13): `verification_mode = "continuous_gps"`, `floor_level = null` (หมายถึง "ไม่มีชั้น" ไม่ใช่ "ยังไม่ตั้ง" — ประกาศ `_nullMeans` ไว้ใน `presets.json`) เอกสารนี้ไม่ใส่ตัวเลือกอื่นให้ preset ไหนเป็นพิเศษ

## 11. สรุปการตัดสินใจของเอกสารนี้ (สำหรับ REPORT และให้ game-director/systems-designer ยืนยัน)

| # | เรื่อง | ตัดสิน | เปลี่ยน config หรือไม่ |
| --- | --- | --- | --- |
| (ใหม่) | id ของ 3 preset | ยืนยัน `largePark` / `market` / `pocketPark` ตามที่ `names.th.json` เสนอ (ASSUMPTION A-P1-F03-T04-1) — ปิด assumption นั้น | ไม่มีคีย์ config ใหม่ (เป็น id ภายใน `data/dungeons/presets.json`) |
| (ใหม่) | กฎจับคู่ preset ← class + size_band | `marketplace` → ตลาดเสมอไม่ว่าไซซ์ไหน · ไม่ใช่ตลาด + small → สวนหย่อม · ไม่ใช่ตลาด + medium/large → สวนใหญ่ | ไม่มีคีย์ใหม่ (เป็นกฎของเอกสารนี้ ใช้ตอนคัดข้อมูลจริงและเสนอให้ F14 ใช้ต่อ ไม่ใช่ pipeline ของ F01) |
| (ใหม่) | ช่วงเลเวลตั้งต้นที่แนะนำต่อ preset (สวนหย่อม 1–15, ตลาด 10–30, สวนใหญ่ 20–50) | เสนอเป็นแนวทางให้ F14 ไม่ใช่ค่าบังคับ | ไม่มีคีย์ใหม่ |
| (ใหม่) | คลองโอ่งอ่าง (`names.th.json#dungeon.khlongOngAng`) | ตรวจ polygon จริงแล้ว (osm-w950315091) → preset ที่ถูกต้องคือ `market` ไม่ใช่ `pocketPark` ที่ narrative-designer ตั้งไว้ชั่วคราว (A-P1-F03-T04-2) ชั้นที่สอง `waterside` ถูกต้องแล้ว | ไม่แก้ config ของเอกสารนี้ — **handoff ถึง narrative-designer** ให้แก้ `_preset` ในไฟล์ของตัวเอง |
| (ยืนยันซ้ำ) | D-049 (ริมน้ำ/ริมคลอง = ชั้นที่สอง, "ชั่วคราว" = field lifecycle ไม่ใช่ preset) | คงตามเดิม ไม่มีการเปลี่ยนแปลง | ไม่มี |

## 12. การตรวจสอบ (validation) และหลักฐาน

สคริปต์ตรวจ (Python, รันนอก repo ใน scratchpad ของ agent เพราะเป็นเครื่องมือใช้ครั้งเดียวสำหรับ report นี้ ไม่ใช่โค้ดที่ต้องอยู่ใน `tools/`) ตรวจ 9 เรื่อง:

1. `presets.json` เป็น JSON ที่ valid
2. มี `verification_mode = "continuous_gps"` และ `floor_level = null` พร้อม `_nullMeans` ที่ถูกต้อง
3. มี preset ตรง 3 ตัวคือ `largePark`, `market`, `pocketPark` เท่านั้น
4. ทุก preset มี field ที่ต้องมีครบ (`matches`, `areaRange_m2`, `suggestedLevelRange`, `smallDungeonMultiplier`, `dropTable`, `monsterTheme`, `openingHoursSource`, `realWorldEvidence`)
5. `areaRange_m2` ใช้ pointer (`*SeeFile`) เท่านั้น ไม่มีตัวเลขซ้ำ
6. pointer (`seeFile`/`*SeeFile`) ทุกจุด (22 จุด) resolve ไปยัง key จริงใน `config/balance/dungeons.json`, `config/balance/drops.json` หรือ `config/content/names.th.json` ได้ครบ ไม่มีจุดใดชี้ไปที่ที่ไม่มีอยู่จริง
7. ตัวเลข `realWorldEvidence` (candidateCount, bySizeBand, byProvince) ของทั้ง 3 preset คำนวณซ้ำจาก `data/coverage/candidates.geojson` ด้วยกฎในหัวข้อ 2 แล้วตรงกันทุกตัว และรวมกันได้ 741 พอดี
8. ตัวเลข `openingHoursSource.realWorldCoverage` คำนวณซ้ำแล้วตรงกันทุก preset
9. ขอบเขตพื้นที่ของ `pocketPark` (ขอบบน) และ `largePark` (ขอบล่าง) ชี้ pointer เดียวกัน (`sizeBandUpper_m2.small`) ต่อกันสนิทไม่มีช่องว่างหรือทับซ้อน

ตรวจเพิ่มอีก 2 เรื่องหลังได้รับ `names.th.json`:

10. ทุก `monster.*` key ที่ `presets.json` อ้าง (23 การอ้างอิง) มีอยู่จริงใน `names.th.json` และ `_family` ตรงกับ preset ที่อ้างทุกตัว (ไม่มี mismatch)
11. ข้อมูล candidate จริงของคลองโอ่งอ่าง (`osm-w950315091`) ที่บันทึกใน `presets.json#workedExample_khlongOngAng.realCandidateFound` ตรงกับ `data/coverage/candidates.geojson` ทุก field เป๊ะ (class, size_band, area_m2, opening_hours)

**ผลรัน (2026-09-23):**

```
1. presets.json is valid JSON: OK
2. verification_mode / floor_level fields: OK
3. exactly 3 presets found: ['largePark', 'market', 'pocketPark']
4. required fields present on every preset: OK
5. areaRange_m2 uses pointers only (no duplicated numbers): OK
6. found 22 pointer fields, resolving each against config/balance/*.json:
   resolved OK: 22, skipped: 0, failed: 0
7. realWorldEvidence counts match recomputation from candidates.geojson: OK
8. openingHoursSource real-world coverage counts match: OK
9. pocketPark / largePark area ranges share the same boundary pointer (contiguous, no gap/overlap): OK

TOTAL ERRORS: 0
TOTAL WARNINGS: 0

--- extra checks after names.th.json arrived ---
checked 23 monster key references
missing keys: []
family mismatches: []
khlongOngAng candidate found: True
workedExample fields match candidates.geojson exactly: True
```

exit code `0` ทั้งสองสคริปต์ · ตัวเลขในหัวข้อ 4, 6, 7 ของเอกสารนี้และในทุกฟิลด์ `realWorldEvidence`/`openingHoursSource` ของ `presets.json` เป็นตัวเลขที่ผ่านการตรวจซ้ำนี้แล้วทั้งหมด ไม่ใช่ตัวเลขที่ประมาณด้วยตา
