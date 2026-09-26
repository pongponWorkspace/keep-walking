# data/dungeons/ — pilot dungeon records (P2-F04-T13)

เจ้าของ: level-designer · อ้างอิง: `design/levels/pilot-dungeons.md`, `design/levels/bangrak-plan.md`, `design/levels/dungeon-rules.md`, `docs/tech/F04-dungeon-presence.md` หัวข้อ 13, `packages/shared/schemas/dungeon.schema.json`, `tools/dungeons/README.md` (validator ที่ location-engineer ดูแล) · แหล่งรูปทรง: `data/coverage/candidates.geojson` (OSM, ODbL 1.0 — ดู `LICENSE-DATA.md`)

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | เจ้าของ | คืออะไร |
| --- | --- | --- |
| `dungeons.json` | level-designer (งานนี้) | ทะเบียน record ต้นทาง (`format: kw-dungeons-source`) 20 แห่ง อ้าง geometry ผ่าน `geometry_files: ["pilot.geojson"]` |
| `pilot.geojson` | level-designer (งานนี้) | รูปทรง Polygon ของแต่ละแห่ง (`properties.id` ตรงกับ `dungeons.json#dungeons[].id`) |
| `presets.json` | level-designer (P1-F03-T09) | นิยาม preset 3 แบบ (ทำไว้ก่อนงานนี้) |
| `artifact/dungeons.client.v1.json` | สร้างอัตโนมัติโดย `pnpm --filter @keep-walking/tools-dungeons run dungeons:build` (P2-F04-T26) | ข้อมูลเฉพาะ record ที่ `status: published` และไม่มี error — ไฟล์นี้เท่านั้นที่ client import ได้ |
| `LICENSE-DATA.md` | level-designer (งานนี้) | สิทธิ์การใช้ข้อมูล (ODbL 1.0 + attribution OSM ตาม D-091) |

## จำนวนและสถานะ (20 record ตาม `pilot-dungeons.md` หัวข้อ 3, 10–20 ตาม acceptance)

| เขต | รวม | published | review | draft |
| --- | --- | --- | --- | --- |
| พระนคร (PN) | 10 | 7 | 2 | 1 (PN-1 ชื่อยังถูกพักที่ `_held.dungeon.rommaninatPark`, D-107) |
| ปทุมวัน (PW) | 6 | 4 | 2 | 0 |
| บางรัก (BR) | 4 | 2 | 2 | 0 |
| **รวม** | **20** | **13** | **6** | **1** |

`status: draft`/`review` = ยังไม่เข้า `artifact/` (client มองไม่เห็น) แต่ยังนับเป็น record ตาม acceptance — สาเหตุอยู่ในคอลัมน์ "หมายเหตุ" ของตารางด้านล่างและใน field `notes` ของแต่ละ record จริง เหตุผลหลัก: ต้องยืนยันภาคสนามเรื่องสิทธิ์เข้าถึง/เจ้าของที่ดิน (ทหารเรือ/สถานทูต/ที่เอกชน/ใกล้โรงเรียน) หรือ geometry ที่ยังทับเขตห้ามทับ (ดูหัวข้อ "ข้อค้นพบเพิ่มเติมจากรอบนี้")

## ตารางย่านเปิดตัว (dungeon, preset, พื้นที่, ช่วงเลเวล, ระยะถึงแห่งใกล้สุด, หมายเหตุ)

พื้นที่ของแถว published มาจาก `artifact/dungeons.client.v1.json` จริง (EPSG:32647) ส่วนแถว review/draft ใช้ `area_m2` ของ candidate ใน `data/coverage/candidates.geojson` (รูปทรงยังไม่แก้ไข) ระยะถึงแห่งใกล้สุด = haversine ระหว่าง `rep_point` ตาม `pilot-dungeons.md` หัวข้อ 3 (ยังไม่ใช่ระยะเดินตามทางเท้าจริง)

### เขตพระนคร

| id | pilotCode | preset | พื้นที่ (ตร.ม.) | ช่วงเลเวล | ระยะถึงแห่งใกล้สุด | สถานะ | หมายเหตุ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rommaninat-park` | PN-1 | largePark | 37,689.0 | 20–35 | 491 ม. | draft | ชื่อถูกพักที่ `_held.dungeon.rommaninatPark` (D-107) รอ narrative-designer ย้ายคีย์ |
| `phra-sumen-fort` | PN-2 | largePark | 13,776.4 | **1–35** | 169 ม. | published | F-18: ช่วง 1–35 อาจไม่ผ่าน R43 สำหรับผู้เล่นเลเวล 1 — รอ game-director ตัดสิน wave นี้ |
| `mahakan-fort` | PN-3 | largePark | 10,531.8 | 20–30 | 694 ม. | published | เวลาทำการ manual (OSM `sunrise-sunset` นอก grammar) |
| `pak-khlong-talat` | PN-4 | market | 27,734.8 | 10–25 | 311 ม. | published | ทางเข้ายังไม่ยืนยันภาคสนาม (`entrance.evidence: pending`) |
| `pahurat-market` | PN-5 | market | 23,444.5 | 15–30 | 324 ม. | published | เวลาทำการ manual (ประมาณจากรูปแบบตลาดสิ่งทอ) |
| `khlong-ong-ang` | PN-6 | market (waterside) | 12,500.9 | 10–20 | 324 ม. | published | เวลาทำการจริงจาก OSM (`Fr-Su 16:00-22:00`) — ใช้เป็นเคสทดสอบช่วงปิดของ QA · `aspect_ratio`/`crosses_major_way` acknowledged |
| `baan-phra-athit` | PN-7 | pocketPark | 3,773.6 | 1–5 | 169 ม. | published | ธง "private venue?" ประเมินความเสี่ยงต่ำแล้ว (ดู `notes`) รอยืนยันภาคสนามอีกครั้ง |
| `santi-phon-park` | PN-8 | pocketPark | 3,861.9 | 1–5 | 481 ม. | published | เวลาทำการ manual (สวนหย่อมทั่วไป) |
| `pn9` | PN-9 | pocketPark | 3,852.2 | 5–15 | 91 ม. | review | ใกล้โรงเรียน/พิพิธภัณฑ์ถนนสนามไชย ยังไม่ยืนยันสิทธิ์เข้าถึง |
| `pn10` | PN-10 | pocketPark | 3,013.5 | 1–5 | 91 ม. | review | พื้นที่ชิดขอบล่าง `area.minArea_m2` มาก + ความเสี่ยงเดียวกับ PN-9 |

### เขตปทุมวัน

| id | pilotCode | preset | พื้นที่ (ตร.ม.) | ช่วงเลเวล | ระยะถึงแห่งใกล้สุด | สถานะ | หมายเหตุ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `centenary-park` | PW-1 | largePark | 42,212.9 | 30–50 | 382 ม. | review | มีศาลเจ้า (จุด, `osm-n10763239114`) อยู่ในผืน — ไม่มีพิกัดในไฟล์ใดของ repo ให้วาดหลบตอนนี้ |
| `pathumwananurak-park` | PW-2 | largePark | 44,587.0 | 25–45 | 1,238 ม. | published | ที่มาของชื่อยังรอ narrative-designer ตรวจ |
| `banthat-thong-market` | PW-3 | market | 15,905.8 | 15–30 | 382 ม. | published | ที่ดินของสำนักงานทรัพย์สินจุฬาฯ ดำเนินเป็นตลาดสาธารณะ — รอยืนยันภาคสนาม |
| `navanukroh-garden` | PW-4 | pocketPark | 4,356.8 | 1–5 | 220 ม. | published | ธง "navy land?" ประเมินแล้วว่าเป็นไปได้ต่ำ (นามสกุลคน ไม่ใช่ที่ดินทหาร) — รอยืนยัน HUMAN/ภาคสนาม |
| `leelawadee-lawn` | PW-5 | pocketPark | 3,075.2 | 1–5 | 220 ม. | published | อาจอยู่ในขอบสวนลุมพินี ต้องตรวจก่อนเปลี่ยนชื่อค้นหา |
| `pw6` | PW-6 | pocketPark | 9,182.2 | 5–15 | 1,238 ม. | review | ธง "embassy/private?" ยังไม่คลี่คลาย |

### เขตบางรัก

| id | pilotCode | preset | พื้นที่ (ตร.ม.) | ช่วงเลเวล | ระยะถึงแห่งใกล้สุด | สถานะ | หมายเหตุ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `phet-ploy-market` | BR-1 | market | 10,611.7 | 10–25 | 937 ม. | published | วาดหลบศาลเจ้า `osm-w1189209084` แล้ว (เพิ่ม hole) — `contains_religious_feature` acknowledged |
| `chong-nonsi-canal-park` | BR-2 | pocketPark (waterside รูปทรง) | 4,217.0 | 1–5 | 937 ม. | published | `aspect_ratio` 9.6 และ `crosses_major_way` acknowledged (dungeon-rules.md 12, D-049) |
| `br3` | BR-3 | pocketPark | 4,261.2 | 1–5 | 1,302 ม. | review | ทับที่เอกชนจริง 50.6 ตร.ม. (`osm-w1231343551`, `access_private`) ตามที่ validator ยืนยัน — ต้องวาดใหม่ด้วยเครื่องมือ GIS |
| `br4` | BR-4 | pocketPark | 4,303.4 | 5–15 | 1,101 ม. | review | ธง "embassy/private?" ยังไม่คลี่คลาย |

## วิธีตรวจสอบ

```
pnpm --filter @keep-walking/tools-dungeons run dungeons:validate --json   # validate เท่านั้น ไม่เขียนไฟล์
pnpm --filter @keep-walking/tools-dungeons run dungeons:build             # validate + เขียน artifact/
pnpm --filter @keep-walking/tools-dungeons run dungeons:check             # exit 1 ถ้า artifact ที่ commit ไม่ตรงผล build
pnpm test                                                                  # รวม tools/dungeons/test/committed.test.ts
```

ผลจริงของรอบนี้: `records 20 · published 13 · in artifact 13 · errors 0 · warnings 31` (`ok: true`) — คำเตือนทั้งหมดเป็น `entrance_unverified` (ทุกแห่งปักหมุดทางเข้าด้วย `evidence: "pending"` รอยืนยันภาคสนามจริงตาม dungeon-rules.md หัวข้อ 4) และ flag ที่รับทราบแล้ว (`review_acknowledged`) ไม่มี error ค้าง

## ข้อค้นพบเพิ่มเติมจากรอบนี้ (นอกเหนือจาก `pilot-dungeons.md`)

- **BR-3 ทับที่เอกชนจริง 50.6 ตร.ม.** กับ `osm-w1231343551` (`access_private`, `data/coverage/excluded.geojson`) — ยืนยันตัวเลขที่ validator smoke test ของ location-engineer พบ พอดี ยังมีอีก 6 ชิ้นที่ดินเอกชน/สวนส่วนตัวเล็กๆ ซ้อนกันในบริเวณเดียวกัน ต้องใช้เครื่องมือ GIS วาดใหม่ ไม่ใช่แก้ด้วยมือในรอบนี้
- **BR-1 แก้ไขจริงแล้ว:** เพิ่มรู (hole) ขนาด ~12×11 ม. ล้อมศาลเจ้า `osm-w1189209084` (พื้นที่จริง 4.6 ตร.ม., ศูนย์กลางห่างขอบผืนเดิม ~17 ม.) พื้นที่ผลลัพธ์หลังหักรู = 10,611.7 ตร.ม. (จากเดิม 10,745.6) — `overlap_excluded_zone` กับศาลเจ้านี้ = 0 ตาม validator จริง
- **PW-1 มีศาลเจ้าเป็นจุด ไม่ใช่ polygon:** `osm-n10763239114` ไม่มีพิกัดอยู่ในไฟล์ใดของ repo (ไม่อยู่ใน `points-unmatched.geojson`) ต่างจาก BR-1 ที่มี polygon ให้คำนวณ — ต้องรอ location-engineer สำรวจภาคสนามหาตำแหน่งจริงก่อนวาดหลบได้
- **PW-4 (นาวานุเคราะห์):** ตรวจสอบเบื้องต้นด้วย WebSearch พบว่า "นาวานุเคราะห์" น่าจะเป็นนามสกุลคน (มีนายทหารเรือนามสกุลนี้จริง) ไม่ใช่หลักฐานว่าที่ดินเป็นของกองทัพเรือ ประกอบกับ tag OSM `access=yes, fee=no` เป็นสัญญาณบวก จึงประเมินความเสี่ยงต่ำพอที่จะ publish พร้อมหมายเหตุ (ไม่ใช่การยืนยันขั้นสุดท้าย)
- **PN-6/BR-2 (waterside):** ทั้งคู่มี `aspect_ratio` เกิน `coverageFilter.maxAspectRatio` (8) จริง (8.9 และ 9.6) — acknowledge ตาม dungeon-rules.md หัวข้อ 12/D-049 ไม่ใช่ข้อบกพร่อง เพราะเป็นรูปทรงริมน้ำ/ริมคลองที่ยอมรับแล้ว
