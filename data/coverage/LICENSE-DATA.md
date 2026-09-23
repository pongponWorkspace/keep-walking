# License ของข้อมูลใน `data/coverage/`

เจ้าของ: location-engineer (P1-F01-T06) · repo นี้เป็น public (D-002) ทุกไฟล์ในโฟลเดอร์นี้จึงถือว่าเผยแพร่ต่อสาธารณะ · เอกสารนี้สรุปตามที่ผู้ทำเข้าใจ ไม่ใช่ความเห็นทางกฎหมาย ข้อที่ยังไม่แน่ใจอยู่ในหัวข้อ 4 และส่งให้ HUMAN ตัดสินแล้ว

## 1. แหล่งข้อมูลต้นทาง

| id | แหล่ง | license | ใช้ทำอะไร |
| --- | --- | --- | --- |
| D1 | OpenStreetMap ผ่าน Geofabrik `thailand-260901.osm.pbf` (ข้อมูล ณ 2026-09-01T20:20:50Z) | Open Database License (ODbL) 1.0 · © OpenStreetMap contributors | polygon candidate, ขอบเขตเขต/อำเภอ, กราฟทางเดิน, สถานีรถไฟฟ้า/ป้ายรถเมล์ |
| D2 | WorldPop R2025A `tha_pop_2025_CN_100m_R2025A_v1.tif` (constrained, 100 ม., ปี 2025) | Creative Commons Attribution 4.0 (CC BY 4.0) · ค่าใน TIFF tag ของไฟล์ระบุ `CC-BY-4.0` | ประชากรต่อเขต, โซนระยะเดินถ่วงประชากร, ชั้นความหนาแน่นใน heatmap |
| D3 | geoBoundaries gbOpen THA ADM2 (commit 9469f09) | ตามที่ geoBoundaries ระบุต่อชุดข้อมูล | ใช้ตรวจไขว้พื้นที่เขตในเครื่องเท่านั้น **ไม่มีข้อมูลจาก D3 อยู่ในไฟล์ใดที่นี่** |
| D4 | geoBoundaries gbOpen THA ADM1 | ตามที่ geoBoundaries ระบุ | ไม่ได้ใช้ใน output |

ไฟล์ต้นทางทั้งหมดไม่อยู่ใน git (`tools/coverage/downloads/` ถูก ignore) · URL ขนาด และ SHA-256 อยู่ใน `tools/coverage/params.json#pipeline.sources`

## 2. License ของแต่ละไฟล์ในโฟลเดอร์นี้

| ไฟล์ | มาจาก | license ที่ใช้ | attribution ที่ต้องแสดง |
| --- | --- | --- | --- |
| `candidates.geojson` | D1 | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `coverage_meta.attribution` แล้ว) |
| `excluded.geojson` | D1 | ODbL 1.0 (derivative database) | © OpenStreetMap contributors |
| `points-unmatched.geojson` | D1 | ODbL 1.0 (derivative database) | © OpenStreetMap contributors |
| `district-counts.csv` | D1 + D2 | ส่วนที่มาจาก OSM (จำนวน polygon, ระยะเดิน, ขนส่ง): ODbL 1.0 · ส่วนประชากร: CC BY 4.0 จาก WorldPop | © OpenStreetMap contributors · WorldPop (www.worldpop.org) CC BY 4.0 |
| `heatmap/index.html`, `heatmap/*.png` | D1 + D2 | ภาพเป็น produced work จาก OSM + ข้อมูล WorldPop ที่รวมช่องแล้ว | ข้อความ attribution ทั้งสองแหล่งอยู่ท้ายหน้า HTML แล้ว |
| `run-meta.json` | metadata ของการรัน (checksum, config, จำนวน) | ตาม license ของ repo | ไม่มีข้อมูลตำแหน่งรายบุคคล |
| `LICENSE-DATA.md` | เอกสารนี้ | ตาม license ของ repo | |

## 3. ข้อควรรู้

- **share-alike ของ ODbL:** ใครนำ `candidates.geojson` / `excluded.geojson` / `points-unmatched.geojson` หรือฐานข้อมูลที่ดัดแปลงจากไฟล์เหล่านี้ไปเผยแพร่ ต้องเผยแพร่ภายใต้ ODbL ด้วย · repo เป็น public จึงเป็นไปตามเงื่อนไขนี้อยู่แล้ว
- **ก่อนนำ polygon เข้าฐานข้อมูล dungeon ของเกม (Phase 2, F14)** ต้องถาม HUMAN ก่อน เพราะฐานข้อมูลเกมจะกลายเป็น derivative database ที่อาจต้องเปิดตามเงื่อนไขเดียวกัน (METHOD หัวข้อ 3)
- **ไม่มีข้อมูลส่วนบุคคล:** WorldPop เป็นแบบจำลองประชากรระดับช่อง ไม่ใช่ข้อมูลรายบุคคล · heatmap รวมช่องเป็น ≈300 ม. ก่อนแสดง · จุดใน heatmap เป็นสถานที่สาธารณะเท่านั้น · ไม่มี GPS trace ในโฟลเดอร์นี้
- **ตัวเลขประชากรใช้เปรียบเทียบระหว่างเขตเท่านั้น** (PRD F01 หัวข้อ 3) ไม่ใช่ตัวเลขทะเบียนราษฎร์

## 4. คำถามที่ส่งให้ HUMAN (ยังไม่ได้ตัดสิน)

1. การรวมข้อมูล OSM (ODbL) กับ WorldPop (CC BY 4.0) ไว้ในตาราง `district-counts.csv` ไฟล์เดียว ถือว่าเข้ากันได้ภายใต้ ODbL ไหม หรือควรแยกคอลัมน์ประชากรเป็นไฟล์ต่างหาก · ผู้ทำเข้าใจว่า CC BY 4.0 ต้องการเพียง attribution จึงรวมได้ แต่ยังไม่มีการยืนยัน
2. ข้อความอ้างอิง WorldPop แบบเต็ม (ชื่อผู้จัดทำและ DOI ของชุด R2025A) ควรใช้แบบใด · ตอนนี้ใช้ "WorldPop (www.worldpop.org), CC BY 4.0" ตาม tag ในไฟล์
