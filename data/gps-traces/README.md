# GPS traces

| หัวข้อ | ค่า |
| --- | --- |
| เจ้าของ | location-engineer |
| task | P1-F02-T04 (synthetic) · QA trace อยู่ที่ `qa/` (P1-F02-T13) · recorded อยู่ที่ `recorded/` (P1-F02-T24) |
| รูปแบบไฟล์ | `docs/tech/gps-trace-format.md` · ตรวจด้วย `validateTrace()` จาก `@keep-walking/shared` เท่านั้น |
| generator | `tools/traces/` (TypeScript, workspace `@keep-walking/tools-traces`) · `GENERATOR_VERSION = 1.0.0` |
| config ที่อ้าง | `config/balance/dungeons.json#movementGate` (`minDistancePerWindow_m` 50, `window_s` 300, `comparison` greaterThan), `#runState.graceMax_s` 180 · `config/balance/anticheat.json#speedLock.speedLock_kmh` 25, `#checkIn.maxAccuracy_m` 30, `#checkIn.minContinuousApproach_s` 60 (ค่า ณ วันที่ 2026-09-23) |

## 1. โครงโฟลเดอร์

```
data/gps-traces/
  README.md                 ไฟล์นี้
  synthetic/                trace สังเคราะห์ 13 ไฟล์ (commit ได้ สร้างซ้ำได้ด้วย seed)
    *.trace.json
    polygons/test-rect-benchasiri.geojson   polygon ทดสอบที่ edge-walk / walk-in / teleport อ้างถึง
  qa/                       trace กรณีขอบของ qa-tester (P1-F02-T13) ใช้กฎตั้งชื่อและปัดพิกัดเดียวกับ synthetic
  recorded/                 trace จากการเดินจริงที่ผ่านการยินยอมและ sanitize แล้ว (P1-F02-T24)
  raw/                      ถูก .gitignore ห้าม commit
```

client โหลด `synthetic/`, `qa/`, `recorded/` ผ่าน `import.meta.glob` ตามชื่อไฟล์ `*.trace.json` (gps-trace-format หัวข้อ 5) ไฟล์ `.geojson` ใน `polygons/` จึงไม่ถูกโหลดเป็น trace

## 2. วิธีสร้างซ้ำ (offline ทั้งหมด ไม่ดาวน์โหลดอะไร)

รันจาก root ของ repo (Node 24, pnpm ตาม `package.json`; ไม่มี dependency เพิ่ม ใช้แค่ workspace `@keep-walking/shared` และ `tsx` ของ root)

| คำสั่ง | ผล |
| --- | --- |
| `pnpm exec tsx tools/traces/src/generate.ts` | สร้างทุกไฟล์ใน `synthetic/` ใหม่ · ทุก trace ต้องผ่าน `validateTrace` ก่อนเขียน ไม่ผ่าน = หยุดทันที |
| `pnpm exec tsx tools/traces/src/generate.ts --check` | ไม่เขียนไฟล์ · exit 1 ถ้าไฟล์ที่ commit ไม่ตรงกับผลของ generator (ใช้ใน CI ได้) |
| `pnpm exec tsx tools/traces/src/stats.ts` | พิมพ์ตัวเลขวัดของทุก trace (ตารางในหัวข้อ 6 มาจากคำสั่งนี้) |
| `pnpm test` (หรือ `pnpm exec vitest run tools/traces --reporter=verbose` เพื่อดูตาราง expected/actual) | test ของ generator และ scenario |

- **ทำซ้ำได้:** PRNG คือ mulberry32 (`tools/traces/src/rng.ts`) · seed ของแต่ละ trace อยู่ใน `meta.generator.seed` · seed + config เดียวกัน = ไฟล์ตรงกันทุก byte (test `are byte-identical to the generator output`)
- **config เปลี่ยน → trace เปลี่ยน:** generator อ่านค่าจาก config ตอนรัน (`tools/traces/src/config.ts`) ไม่มีค่าเกณฑ์ hardcode ถ้า systems-designer แก้ค่า test จะแดงจนกว่าจะรัน `generate.ts` ใหม่และ commit ไฟล์
- **แก้ scenario แล้ว output เปลี่ยน:** เพิ่ม `GENERATOR_VERSION` ใน `tools/traces/src/builder.ts`

## 3. กฎตั้งชื่อ

- ชื่อไฟล์ = `<meta.id>.trace.json` · `meta.id` ตรงกับ `^[a-z0-9][a-z0-9-]{2,63}$`
- รูปแบบ: `<kind>-<สถานการณ์>-<ลำดับ 2 หลัก>` เช่น `synthetic-park-loop-01`, `qa-gps-jump-01`, `recorded-park-01`
- `<kind>` ตรงกับ `meta.kind` เสมอ · สถานการณ์เป็นคำอังกฤษสั้น คั่นด้วย `-` ไม่มีชื่อสถานที่จริงที่ผูกกับบุคคล (ชื่อสวนสาธารณะใช้ได้แต่ไม่จำเป็น)
- ตัวเลขในชื่อ (เช่น `50m`, `40kmh`) เป็นป้ายอ่านง่ายเท่านั้น ค่าจริงมาจาก config ตอนสร้าง ถ้า config เปลี่ยน ชื่อไม่เปลี่ยน แต่ README ต้องอัปเดต
- trace ใหม่ของสถานการณ์เดิมใช้ลำดับถัดไป (`-02`) ห้ามเขียนทับความหมายของ id เดิม เพราะ test ของ QA อ้างชื่อตรง ๆ

## 4. กฎปัดค่าและพิกัด

| ฟิลด์ | กฎ | เหตุผล |
| --- | --- | --- |
| `lat`, `lng` | ปัดเป็น **5 ตำแหน่งทศนิยม** (ราว 1.11 ม. ตามแนวเหนือใต้, 1.08 ม. ตามแนวตะวันออกตะวันตกที่ละติจูดกรุงเทพฯ) ใช้กับ `synthetic` และ `qa` ด้วย แม้รูปแบบไฟล์ยอมได้ถึง 7 | เท่ากับเพดานของ `field`/`recorded` ทำให้ทุก trace มีลักษณะ quantization เหมือนกัน และไม่มีใครใส่ความแม่นระดับเซนติเมตรที่ไม่มีอยู่จริง |
| `accuracy` | 1 ตำแหน่งทศนิยม, ไม่ต่ำกว่า 1 ม. | platform ไม่รายงานรัศมี 0 |
| `speed` | 2 ตำแหน่งทศนิยม (m/s) · ใส่เฉพาะ trace ที่จำลอง platform ที่ให้ค่า (ขณะเดินหรือขับ) · ไม่ใส่ `null` | ทดสอบทั้งกรณีมีและไม่มีฟิลด์ optional |
| `heading` | 1 ตำแหน่งทศนิยม, 0 <= x < 360 | ตรง schema |
| `t` | integer ms นับจาก sample แรก (sample แรก = 0) | gps-trace-format กฎข้อ 2 |

**สถานที่:** ทุกพิกัดอยู่ในที่สาธารณะเท่านั้น (สวนสาธารณะและถนนสาธารณะ) ไม่มีจุดใดผูกกับบ้าน ที่ทำงาน หรือเส้นทางของบุคคลจริง จุดอ้างอิงอยู่ใน `tools/traces/src/places.ts`

| จุดอ้างอิง | พิกัด | ที่มา |
| --- | --- | --- |
| สวนลุมพินี | 13.7306, 100.54154 | representative point ใน `data/coverage/excluded.geojson` |
| สวนป่าเบญจกิติ | 13.72908, 100.55476 | representative point ใน `data/coverage/excluded.geojson` |
| polygon ทดสอบ `test-rect-benchasiri` | S 13.7293, N 13.7317, W 100.5662, E 100.5683 (ราว 267 x 227 ม. = 60,600 ตร.ม.) | สี่เหลี่ยมหดเข้าในกรอบของอุทยานเบญจสิริ (candidate ใน `data/coverage/candidates.geojson`) **ไม่ใช่ polygon จริงของสวน** ใช้เพื่อให้คำนวณด้วยมือได้ |
| เส้นซอยสังเคราะห์ย่านสีลม | เริ่ม 13.727, 100.5295 ทิศ 135 องศา 800 ม. | เส้นตรงสังเคราะห์ในย่านการค้า ไม่ได้ตามแนวซอยจริง |
| เส้นขับรถใกล้ถนนพระรามที่ 4 | เริ่ม 13.7265, 100.538 ทิศ 100 องศา ราว 3 กม. | เส้นตรงสังเคราะห์บนถนนสาธารณะ |

## 5. นิยามการวัดที่ใช้ในตารางและ test

ตัวเลขทั้งหมดในไฟล์นี้คำนวณโดย `tools/traces/src/metrics.ts` ตามนิยาม S12 / I1 ของ `docs/tech/F02-map-location-spike.md` หัวข้อ 10 เป็น **ค่าคาดหวังสำหรับ QA และสำหรับ gate ใน `packages/geo` รุ่นหลัง ไม่ใช่ตัว gate เอง**

- **ระยะ:** ผลรวม haversine ระหว่าง sample ต่อเนื่อง ไม่กรอง jitter · รัศมีโลก **R = 6,371,008.8 ม.** (IUGG mean radius, ค่าเดียวกับ turf.js) · ค่าที่ต้องเทียบถึงระดับมิลลิเมตร (trace `boundary`) ใช้ได้เฉพาะเมื่อผู้คำนวณใช้ R นี้ (ดู assumption ในหัวข้อ 8)
- **หน้าต่าง gate:** ยาว `window_s` เริ่มที่ t = 0 เลื่อนทีละ 30 วินาที ตราบที่ `start + window_s <= t สุดท้าย` · คู่ sample (i-1, i) ถูกนับเมื่อ **ทั้งสอง** sample อยู่ในช่วงปิด `[start, start + window_s]` · ผ่านเมื่อระยะเทียบ `minDistancePerWindow_m` ตาม `comparison` (ตอนนี้ `>` 50 ม.)
- **ความเร็วแฝง (implied speed):** ระยะ haversine / เวลา ระหว่าง sample ต่อเนื่อง ไม่กรอง · **ความเร็วที่รายงาน:** ฟิลด์ `speed`
- **gap:** ช่วงห่างระหว่าง sample ต่อเนื่องเกิน 10 วินาที (S13)
- **นอก polygon:** จุดอยู่นอกกรอบ `test-rect-benchasiri` (ขอบนับเป็นข้างใน) · ความยาวช่วง = t ของ fix นอกตัวสุดท้าย − t ของ fix นอกตัวแรกในช่วงนั้น

## 6. รายการ trace

ตัวเลขจาก `stats.ts` กับ config ปัจจุบัน · ทุกไฟล์ sample ทุก 1 วินาที ยกเว้นที่ระบุ · `speed/heading` = ไฟล์มีฟิลด์ optional นี้

| id (seed) | สภาพ | เวลา | sample | ระยะดิบ | accuracy (min/กลาง/max ม.) | speed/heading | จำลองอะไร |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `synthetic-park-loop-01` (101) | park | 30:00 | 1,801 | 2,747 ม. | 4 / 5.0 / 9.4 | มี | เดินวนรอบสวนลุมพินี (วงรีราว 460 x 400 ม.) 1.3 m/s |
| `synthetic-bench-jitter-01` (201) | bench | 15:00 | 901 | 380 ม. | 5 / 7.4 / 10 | ไม่มี | นั่งม้านั่ง มือถือในมือ jitter แบบ OU sigma 1.5 ม. tau 45 วินาที |
| `synthetic-table-still-01` (202) | table | 15:00 | 901 | 4.4 ม. | 3 / 4.0 / 5 | ไม่มี | มือถือวางนิ่งบนโต๊ะ jitter sigma 0.35 ม. และ platform ค้างค่าเดิมจนค่าประมาณขยับเกิน 0.9 ม. |
| `synthetic-edge-walk-01` (301) | park | 19:30 | 1,171 | 2,577 ม. | 6 / 9.1 / 12 | มี | เดินเลียบขอบใต้ของ polygon ทดสอบ ข้างใน 2.5 ม. jitter sigma 5 ม. แล้วออกนอกจริง 2 ครั้ง |
| `synthetic-drift-spike-01` (102) | park | 12:00 | 721 | 2,123 ม. | 4 / 5.0 / 35 | มี | เดินไปกลับในสวนลุมพินี มี spike 3 แบบ |
| `synthetic-soi-occluded-01` (401) | soi | 10:00 | 267 (ทุก 1-3 วินาที) | 1,271 ม. | 12 / 25.1 / 68 | ไม่มี | ซอยแคบตึกสูง: fix ถูกดันออกข้างถนน 8 ± 12 ม. สัญญาณหาย 3 ช่วง |
| `synthetic-boundary-50m-01` (203) | park | 19:24 | 1,165 | 100.0 ม. | 5 / 5 / 5 | ไม่มี | นิ่งสนิท (พิกัดเดิมทุก byte) สลับเดินสั้น 2 ครั้งบน grid 5 ทศนิยม |
| `synthetic-driving-40kmh-01` (402) | street | 7:25 | 446 | 3,310 ม. | 4 / 7.1 / 10 | มี | เดินไปรถ นั่งรอ ขับราว 40 กม./ชม. ติดไฟแดง จอดแล้วเดิน |
| `synthetic-walk-in-01` (302) | park | 6:13 | 374 | 644 ม. | 7.5 / 11.2 / 15 | มี | เดินจากนอก polygon ทดสอบ 156 ม. เข้ามาข้างใน แล้วเดินวน |
| `synthetic-teleport-spoof-01` (303) | mixed | 4:30 | 271 | 1,821 ม. | 7.5 / 11.3 / 15 | มี | ยืนในสวนป่าเบญจกิติ แล้วโผล่ใน polygon ทดสอบใน 1 วินาที |
| `synthetic-screen-lock-01` (501) | park | 12:00 | 721 | 1,096 ม. | 4 / 6.6 / 9 | มี | เดินวนสวน มี event ล็อกจอและ GPS error ชั่วคราว |
| `synthetic-permission-denied-01` (502) | park | 1:30 | 91 | 140 ม. | 4.1 / 6.5 / 9 | มี | ผู้ใช้ถอนสิทธิ์ตำแหน่งกลางทาง |
| `synthetic-warmup-accuracy-01` (503) | park | 5:00 | 301 | 4,745 ม. | 4 / 7.1 / 150 | ไม่มี | เปิด GPS ใหม่ accuracy ค่อย ๆ ดีขึ้นจาก 150 ม. |

ขนาดรวมของ `synthetic/` ราว 740 KB (ไฟล์ใหญ่สุด `park-loop` 167 KB)

การจับคู่กับ acceptance ของบอร์ด: เดินวนในสวน = `park-loop` · นั่งม้านั่งมี jitter = `bench-jitter` · มือถือวางนิ่งบนโต๊ะ = `table-still` · เดินเลียบขอบ polygon = `edge-walk` · drift spike = `drift-spike` · เดินในซอยตึกบัง = `soi-occluded` · QA test plan หัวข้อ 6 = `table-still`, `bench-jitter`, `boundary-50m` · ที่เหลือเป็นชุดเพิ่มที่ location-engineer ต้องมีตามหน้าที่ (ขับรถ, teleport, walk-in) และ event ของ provider สำหรับ TC-LOC-04/05/06 และ TC-HUD-08/09

## 7. รายละเอียดและสิ่งที่คาดว่าจะเกิด

เวลาเป็น วินาที นับจาก sample แรก (mm:ss ในวงเล็บ)

**`synthetic-park-loop-01`** · เดินต่อเนื่องไม่มีหยุด · คาด: ทุกหน้าต่าง 5 นาทีผ่าน gate (51/51, ต่ำสุด 442.8 ม.) · ความเร็วแฝงสูงสุด 14.3 กม./ชม. จาก jitter (ต่ำกว่า speed lock) · ใช้เป็น trace ค่าเริ่มต้นของ Mock และ baseline ของ S12

**`synthetic-bench-jitter-01`** · ยืนที่จุดเดียว ตำแหน่งที่รายงานลอยรอบ ๆ แบบ OU · คาด: jitter อย่างเดียวผ่าน gate ทุกหน้าต่าง (21/21, 111.7-131.5 ม. ต่อหน้าต่าง) ตาม GDD "นั่งพักบนม้านั่งยังได้อยู่" · ขนาด jitter เป็นสมมติฐานจนกว่าจะมีค่าจริงจาก FIELD-I1 / P1-F02-T24

**`synthetic-table-still-01`** · platform ค้าง fix เดิมจนค่าประมาณขยับเกิน 0.9 ม. ผลคือพิกัดเปลี่ยนแค่ 4 ครั้งใน 15 นาที ห่างจุดแรกไม่เกิน 1 ช่อง grid (1.11 ม.) · คาด: 0/21 หน้าต่างผ่าน ระยะสูงสุดต่อหน้าต่าง 3.34 ม. (ต่ำกว่า 20% ของเกณฑ์) = 0 tick

**`synthetic-edge-walk-01`** · ช่วงเวลา: 0 เดินเลียบขอบ 3 รอบ · 519 (8:39) เดินออก 1 · 535 ยืนนอก 125 วินาที · 660 เดินกลับ · 675 เลียบขอบอีกรอบ · 848 (14:08) เดินออก 2 · 863 ยืนนอก 215 วินาที · 1078 เดินกลับ · ราว 1093 เดินเข้าไปยืนห่างขอบ 20 ม. จนจบ
- ช่วงเลียบขอบ ตัวจริงอยู่ข้างในตลอด แต่ fix หลุดออกนอก 27 ช่วง ยาวสุด 72 วินาที → run ต้องอยู่ Active/Grace **ไม่เข้า Suspended**
- ออกครั้งที่ 1: อยู่นอกจริงราว `graceMax_s − 30` = 150 วินาที, fix นอกต่อเนื่อง 139 วินาที → Grace แล้วกลับ Active
- ออกครั้งที่ 2: อยู่นอกจริงราว `graceMax_s + 60` = 240 วินาที, fix นอกต่อเนื่อง 241 วินาที → เข้า Suspended ที่ราว 180 วินาทีหลังออก
- ความเร็วแฝงสูงสุด 23.2 กม./ชม. จาก jitter ล้วน ใกล้ speed lock 25 (ดูหัวข้อ 9)

**`synthetic-drift-spike-01`** · spike S1 ที่ 150 (2:30): 1 fix กระโดดไปตะวันออก 150 ม. accuracy 35 · S2 ที่ 330-332 (5:30): 3 fix กระโดดไปเหนือ 300 ม. **แต่ accuracy 12 ม.** (กรณีที่ตัวกรองจาก accuracy อย่างเดียวจับไม่ได้) · S3 ที่ 510-534 (8:30): ลอยไปตะวันตกจนถึง 60 ม. ใน 20 วินาที ค้าง 5 วินาที แล้วดีดกลับ accuracy ไล่ถึง 25 · คาด: ระยะเดินจริงราว 940 ม. แต่ระยะดิบ 2,123 ม. ความเร็วแฝงสูงสุด 1,085 กม./ชม. ขณะที่ `speed` ที่รายงานไม่เกิน 5.9 กม./ชม. → ตัวกรองต้องตัด spike ไม่ใช่ล็อกการเล่น และระยะที่นับ gate ไม่ควรรวมระยะจาก spike

**`synthetic-soi-occluded-01`** · sample ทุก 1-3 วินาที (สุ่ม) · สัญญาณหาย 120-140 (event `timeout` ที่ 120), 300-322 (event `position-unavailable` ที่ 300), 450-465 (ไม่มี event) · คาด: accuracy กลาง 25.1 ม. (S10 ใช้ข้อมูลซอย), gap > 10 วินาที 3 ช่วง ยาวสุด 25 วินาที, provider ไม่เข้า error (event ทั้งสองเป็น non-fatal) · ความเร็วแฝงสูงสุด 24.3 กม./ชม. จาก canyon bias ใกล้ speed lock เช่นกัน

**`synthetic-boundary-50m-01`** · 0-359 นิ่ง · 360-404 (6:00) burst A 45 ก้าวบน grid ยาวรวม **49.9994 ม.** · 405-764 นิ่ง · 765-804 (12:45) burst B 40 ก้าว ยาวรวม **50.0101 ม.** · 805-1164 นิ่ง · ช่วงนิ่งใช้พิกัดเดิมทุก byte จึงมีระยะ 0 พอดี ช่วงนิ่งยาว `window_s + 60` วินาที จึงไม่มีหน้าต่างใดครอบสอง burst · คาด (comparison `greaterThan`): หน้าต่างที่ครอบ burst A ทั้งหมดได้ 49.9994 ม. → **ไม่ผ่าน** · หน้าต่างที่ครอบ burst B ทั้งหมด (9 หน้าต่าง) ได้ 50.0101 ม. → **ผ่าน** · ไม่มีหน้าต่างใดอยู่ระหว่าง 50 ถึง 50.01 ม. · ระยะที่ "เท่ากับ 50.0 ม. พอดี" สร้างบน grid 5 ทศนิยมไม่ได้ burst A จึงเป็นค่าที่ใกล้ที่สุดที่ไม่เกินเกณฑ์ (ต่ำกว่า 0.6 มม.) การทดสอบ `===` 50.0 แบบ exact ควรทำใน unit test ของฟังก์ชัน gate ด้วยระยะสังเคราะห์

**`synthetic-driving-40kmh-01`** · 0 เดินไปรถ · 46 นั่งในรถ · 76 ออกรถ (5 m/s) · 84 ความเร็วเดินทางราว 40 กม./ชม. · 220 (3:40) ติดไฟแดง 45 วินาที · 265 ขับต่อ · 400 จอดแล้วเดิน · generator หยุดทำงานถ้า 40 กม./ชม. ไม่เกิน `speedLock_kmh` · คาด: `speed` ที่รายงานเกิน lock 271 fix สูงสุด 44 กม./ชม. → ล็อกการเล่นช่วงขับ · ช่วงไฟแดง (ความเร็ว 0 ในรถ) ต้องยังล็อกอยู่หรือไม่ เป็นเรื่องของกติกาปลดล็อกที่ systems-designer กำหนด

**`synthetic-walk-in-01`** · เริ่มนอกขอบเหนือ 156 ม. (= 1.3 m/s x 2 x `minContinuousApproach_s`) เดินตรงเข้ามา fix แรกในพื้นที่ที่ 123 (2:03) · 194 เริ่มเดินวนข้างในรัศมี 40 ม. · accuracy 7.5-15 ม. (25-50% ของ `maxAccuracy_m`) ก้าวยาวสุด 4.7 ม. · คาด: check-in **ผ่าน** (เดินเข้าต่อเนื่อง 123 วินาที มากกว่า 60)

**`synthetic-teleport-spoof-01`** · 0-89 ยืนในสวนป่าเบญจกิติ · 90 (1:30) fix แรกอยู่ใน polygon ทดสอบ ห่างจากจุดก่อนหน้า 1,362 ม. ใน 1 วินาที (4,904 กม./ชม.) accuracy ยังดี (9.3 ม.) · คาด: check-in **ถูกปฏิเสธ** (ไม่มีการเดินเข้าจากข้างนอกต่อเนื่อง, ความเร็วเป็นไปไม่ได้) · เป็นการตรวจฝั่ง server จากผลลัพธ์เท่านั้น ไม่ใช่การตรวจ mock provider บนเครื่อง

**`synthetic-screen-lock-01`** · event: `visibility-hidden` 240 (4:00), `visibility-visible` 360 (6:00), `position-unavailable` 500 (8:20), `timeout` 520 (8:40) · ไฟล์มี sample ตลอด (รวม 120 sample ในช่วงซ่อนจอ) · คาด (TC-LOC-01/04/06): Mock เข้า `suspended` ที่ 240 ไม่ส่งและไม่เก็บ 120 sample นั้นไว้ส่งทีหลัง ส่งออก 601/721 sample กลับ `running` ที่ 360 · error สองตัวหลังเป็น non-fatal

**`synthetic-permission-denied-01`** · event `permission-denied` ที่ 60 · มี sample ต่อถึง 90 (30 sample) · คาด (TC-LOC-05): provider เข้า `error` ทันทีที่ 60 ไม่ส่ง sample หลังจากนั้น ไม่ retry เอง

**`synthetic-warmup-accuracy-01`** · accuracy ลดลงแบบเคร่งจาก 150 ม. ที่ 0 · 44 วินาที = 30.1 · **45 วินาที = 30.0 พอดี** (= `checkIn.maxAccuracy_m`) · 46 = 27.0 ลดเป็นเส้นตรงถึง 6.0 ที่ 60 · หลัง 60 อยู่ที่ 4-9 ม. · ตำแหน่งคลาดตามขนาด accuracy (ครึ่งหนึ่งของ accuracy ต่อแกน) · คาด (TC-HUD-08/09): TTFF ถึง 30 ม. = 45 วินาที (นิยาม `<=`) และค่า median/p90 หลังตัด 60 วินาทีแรกอยู่ที่ 4-9 ม. · ระยะดิบ 4,745 ม. เกือบทั้งหมดมาจาก 60 วินาทีแรก ถ้าไม่ตัด warm-up ระยะ gate จะพองมาก

## 8. ตาราง trace → expected → actual (จาก test)

ผลของ `tools/traces/src/scenarios.test.ts` (พิมพ์ด้วย `pnpm exec vitest run tools/traces --reporter=verbose`) · ทุกแถวคำนวณจากค่า config ตอนรัน

| trace | expected | actual |
| --- | --- | --- |
| synthetic-park-loop-01 | ผ่านทุกหน้าต่าง | 51/51, ต่ำสุด 442.8 ม. |
| synthetic-bench-jitter-01 | pass > 0% | 21/21, 111.7-131.5 ม. |
| synthetic-table-still-01 | pass 0%, สูงสุด < 20% ของเกณฑ์ | 0/21 ผ่าน, สูงสุด 3.34 ม., ห่างจุดแรกไม่เกิน 1.11 ม. |
| synthetic-boundary-50m-01 | หน้าต่าง = 50 ม. ไม่ผ่าน, 50.01+ ม. ผ่าน | สูงสุดที่ไม่เกิน 49.9994 ม. (ไม่ผ่าน), เกิน 9 หน้าต่าง = 50.0101 ม. (ผ่าน) |
| synthetic-edge-walk-01 | drift นอกขอบ < 180 วิ, ออก 1 < 180 วิ, ออก 2 > 180 วิ | drift 27 ช่วง ยาวสุด 72 วิ, ออก 1 = 139 วิ, ออก 2 = 241 วิ |
| synthetic-walk-in-01 | เดินเข้าต่อเนื่อง >= 60 วิ, accuracy < 30 ม. | เดินจากนอก 123 วิ (123 fix), accuracy สูงสุด 15 ม., ก้าวยาวสุด 4.7 ม. |
| synthetic-teleport-spoof-01 | fix แรกในพื้นที่มาจากการกระโดด | กระโดด 1362 ม. ใน 1 วิ = 4904 กม./ชม., accuracy 9.3 ม. |
| synthetic-driving-40kmh-01 | speed > 25 กม./ชม. เป็นช่วงยาว | 271 fix เกิน lock, speed สูงสุด 44.0 กม./ชม. |
| synthetic-drift-spike-01 | ความเร็วแฝงเกิน lock แต่ speed ที่รายงาน < lock | ความเร็วแฝงสูงสุด 1085 กม./ชม., speed ที่รายงานสูงสุด 5.9 กม./ชม., ระยะดิบ 2123 ม. |
| synthetic-soi-occluded-01 | accuracy กลาง > 20 ม., gap 3 ช่วง, มี timeout/position-unavailable | accuracy กลาง 25.1 ม. (12-68), gap 3 ช่วง ยาวสุด 25 วิ, event timeout, position-unavailable |
| synthetic-screen-lock-01 | มี sample ในช่วงซ่อนจอ, event 4 รายการ | ซ่อน 240-360 วิ มี 120 sample, ส่งได้ 601/721 |
| synthetic-permission-denied-01 | permission-denied แล้วยังมี sample ต่อ | event ที่ 60 วิ, sample หลัง event 30 |
| synthetic-warmup-accuracy-01 | fix แรกที่ accuracy <= 30 ม. ที่ 45 วิ | ที่ 45 วิ accuracy 30 (ก่อนหน้า 30.1), เริ่มที่ 150 ม. |

## 9. ข้อจำกัดและข้อสังเกตสำหรับทีม

- **trace สังเคราะห์ไม่ใช่ความจริง:** ขนาด jitter (bench, table, edge, soi) เป็นสมมติฐานของ location-engineer ต้องเทียบกับค่าจริงจาก FIELD-I1 และ P1-F02-T24 ก่อนใช้ปรับตัวกรองหรือเกณฑ์ gate
- **ระยะดิบไม่กรองแยก bench กับเดินได้ไม่ชัด:** bench ได้ 112-132 ม. ต่อหน้าต่าง เดินจริงได้ 440+ ม. เกณฑ์ 50 ม. แยก "โต๊ะ" ออกได้ชัด แต่ไม่ได้แยก "ม้านั่ง" ซึ่ง GDD ตั้งใจให้ผ่านอยู่แล้ว
- **ความเร็วแฝงจาก jitter ใกล้ speed lock:** edge-walk 23.2 กม./ชม., soi 24.3 กม./ชม. จากการเดินล้วน และ spike ให้ถึง 1,085 กม./ชม. ถ้า speed lock ใช้ความเร็วแฝงระหว่าง fix ดิบ คนเดินในซอยจะโดนล็อกผิด ต้องใช้ความเร็วแบบต่อเนื่องหรือกรองแล้ว (ส่งต่อ systems-designer / backend-programmer ใน Phase 3)
- **ยังไม่มี:** trace สองเครื่องที่ noise สัมพันธ์กัน (anti-cheat ชั้น 4, Phase 7) และ trace network loss ที่ส่ง offline evidence ย้อนหลัง (ต้องมี server, Phase 3) · gap สั้นมีใน `soi-occluded` แล้ว gap 2 นาทีเป็นของ QA (`qa-gps-gap-2min`)
- **polygon ทดสอบเป็นสี่เหลี่ยม:** ผลของ edge-walk / walk-in / teleport ใช้กับ `polygons/test-rect-benchasiri.geojson` เท่านั้น ถ้าใช้กับ polygon จริงของสวน ตัวเลขจะเปลี่ยน
