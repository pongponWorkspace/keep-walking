# License ของข้อมูลใน `data/map/`

เจ้าของ: location-engineer (P2-F04-T23) · repo นี้เป็น public (D-002) ทุกไฟล์ในโฟลเดอร์นี้จึงถือว่าเผยแพร่ต่อสาธารณะ · เอกสารนี้สรุปตามที่ผู้ทำเข้าใจ ไม่ใช่ความเห็นทางกฎหมาย · หลักเดียวกับ `data/coverage/LICENSE-DATA.md` และ D-091

## 1. แหล่งข้อมูลต้นทาง

| id | แหล่ง | license |
| --- | --- | --- |
| D1 | OpenStreetMap ผ่าน Geofabrik `thailand-260901.osm.pbf` (ข้อมูล ณ 2026-09-01T20:20:50Z · SHA-256 ใน `tools/coverage/params.json#pipeline.sources`) | Open Database License (ODbL) 1.0 · © OpenStreetMap contributors |

ไฟล์ต้นทางไม่อยู่ใน git (`tools/coverage/downloads/` ถูก ignore) · ทุกไฟล์ในตารางข้างล่างสร้างจาก D1 ด้วยเครื่องมือใน `tools/coverage/boundaries/` แบบ offline และรันซ้ำได้ byte เดิม

## 2. License ของแต่ละไฟล์

| ไฟล์ | สร้างโดย | license | attribution ที่ต้องแสดง |
| --- | --- | --- | --- |
| `data/map/provinces.geojson` (เส้นและจุดชื่อ 77 จังหวัด) | `python -m boundaries` (P1-H07) | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` ของไฟล์แล้ว) |
| `data/map/playarea-mask.geojson` (โซนดำ รูตัดด้วย bbox ของ tile ตั้งแต่ P2-F04-T23) | `python -m boundaries` | ODbL 1.0 (derivative database) | © OpenStreetMap contributors |
| `data/map/launch-area.geojson` (เขตเปิดตัว D-083) | `python -m boundaries.launch build` (P2-H01) | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` และ `license`) |
| `tools/coverage/boundaries/launch-area.source.geojson` (ต้นทางความละเอียดเต็มของไฟล์บน) | `python -m boundaries.launch extract` | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` และ `license`) |
| `data/map/playable-provinces.geojson` (polygon เล็กของ 6 จังหวัดที่เล่นได้ สำหรับตรวจ bbox ใน CI) | `python -m boundaries.playable` (P2-F04-T23) จากเขต/อำเภอใน `tools/coverage/out/boundaries.geojson` | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` และ `license`) |
| `data/map/study-districts.json` (79 เขต/อำเภอของพื้นที่ศึกษา: `id`, `osmRelationId`, `provinceIso` ไม่มี geometry · D-126) | `python -m boundaries.districts build` (P2-H26) | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` และ `license`) |
| `tools/coverage/boundaries/study-districts.source.json` (ต้นทางของไฟล์บน: relation id, `name:en`, จังหวัด) | `python -m boundaries.districts extract` จาก `tools/coverage/out/boundaries.geojson` | ODbL 1.0 (derivative database) | © OpenStreetMap contributors (อยู่ใน `attribution` และ `license`) |
| `data/map/LICENSE-DATA.md` | เอกสารนี้ | ตาม license ของ repo | |

## 3. ข้อควรรู้

- ทุกไฟล์เป็น geometry สาธารณะของเขตปกครอง ไม่มีตำแหน่งของผู้เล่นหรือบุคคล
- ODbL ข้อ 4.6: ถ้าเผยแพร่ derivative database ต้องเปิดให้ได้ภายใต้ ODbL · ไฟล์ทั้งหมดอยู่ใน repo public แล้ว และวิธีสร้างซ้ำอยู่ใน `tools/coverage/boundaries/README.md`
- client ที่วาดไฟล์เหล่านี้บนแผนที่ต้องแสดง "© OpenStreetMap contributors" ใน attribution ของ source (tech note F02 หัวข้อ 15.1)
- tile fixture ใน `tools/tiles/fixtures/` (รวม `screens/`) มาจาก Protomaps basemap (ข้อมูล OSM, ODbL) · license ของ tile, glyph และ sprite อยู่ใน `tools/tiles/licenses/` และ `tools/tiles/README.md`
