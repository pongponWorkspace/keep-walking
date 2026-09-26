# License ของข้อมูลใน `data/dungeons/`

เจ้าของ: level-designer (P2-F04-T13) · repo นี้เป็น public (D-002) ทุกไฟล์ในโฟลเดอร์นี้จึงถือว่าเผยแพร่ต่อสาธารณะ · เอกสารนี้สรุปตามที่ผู้ทำเข้าใจ ไม่ใช่ความเห็นทางกฎหมาย ตาม Q-H1 (Q-P1-16) และ D-091 (HUMAN, 2026-09-26): เผยแพร่ polygon นำร่องภายใต้ ODbL 1.0 พร้อม attribution "© OpenStreetMap contributors" แบบเดียวกับ `data/coverage/` ใน Phase 1 — ต้องทวนกับนักกฎหมายใน F20 (Phase 7) ก่อนเปิดตัวเชิงพาณิชย์ (product-manager 6.1)

## 1. แหล่งข้อมูลต้นทาง

| id | แหล่ง | license | ใช้ทำอะไร |
| --- | --- | --- | --- |
| D1 | OpenStreetMap ผ่าน `data/coverage/candidates.geojson` และ `data/coverage/excluded.geojson` (P1-F01-T05/T06, ข้อมูล ณ 2026-09-01T20:20:50Z, รีรัน P2-F04-T03) | Open Database License (ODbL) 1.0 · © OpenStreetMap contributors | polygon ของทุก dungeon นำร่อง (`pilot.geojson`), `osm_id`, `osm_tags` ใน `dungeons.json` |

`dungeons.json`/`pilot.geojson` ไม่ดาวน์โหลดจาก OSM ตรง — ทุกรูปทรงมาจาก `data/coverage/candidates.geojson` ที่ location-engineer ทำไว้แล้ว (สืบทอด license เดียวกัน) หนึ่งรูปทรง (`phet-ploy-market` / BR-1) ถูกแก้เพิ่มรู (hole) หนึ่งจุดเพื่อเลี่ยงศาลเจ้าเล็ก (`geometry_source: "osm_edited"`, dungeon-rules.md หัวข้อ 10) — ยังถือเป็นงานดัดแปลงจากฐานข้อมูล OSM (ODbL "derivative database") เช่นเดิม

## 2. License ของแต่ละไฟล์ในโฟลเดอร์นี้

| ไฟล์ | มาจาก | license ที่ใช้ | attribution ที่ต้องแสดง |
| --- | --- | --- | --- |
| `pilot.geojson` | D1 (แก้ไขบางส่วน — ดูหัวข้อ 1) | ODbL 1.0 (derivative database) | © OpenStreetMap contributors |
| `dungeons.json` | D1 (field ตำแหน่ง/รูปทรง) + งานออกแบบของ level-designer (`preset`, `level_range`, `drop_table_id`, `status`, `opening_hours` ที่กรอกเอง, `entrance`, `notes`) | ส่วนที่มาจาก OSM: ODbL 1.0 · ส่วนออกแบบเพิ่มเติม: ตาม license ของ repo | © OpenStreetMap contributors |
| `presets.json` | งานออกแบบของ level-designer (P1-F03-T09) ไม่มีข้อมูลจาก D1 | ตาม license ของ repo | — |
| `artifact/dungeons.client.v1.json` | สร้างจาก `dungeons.json`/`pilot.geojson` โดย `tools/dungeons` (P2-F04-T26, `pnpm dungeons:build`) | ODbL 1.0 (derivative database) สำหรับ field ที่มาจาก D1 (`geometry`, `area_m2`, `bbox`, `label_point`, `nav_destination`) | อยู่ใน field `attribution` ของไฟล์เองแล้ว (`tools/dungeons/build.config.json#attribution`, D-091) |
| `README.md`, `LICENSE-DATA.md` | เอกสารนี้ | ตาม license ของ repo | — |

## 3. ข้อควรรู้

- **share-alike ของ ODbL:** ใครนำ `pilot.geojson`, `dungeons.json` (ส่วน geometry/osm_id/osm_tags), หรือ `artifact/dungeons.client.v1.json` หรือฐานข้อมูลที่ดัดแปลงจากไฟล์เหล่านี้ไปเผยแพร่ ต้องเผยแพร่ภายใต้ ODbL ด้วย · repo เป็น public จึงเป็นไปตามเงื่อนไขนี้อยู่แล้ว
- **client ฝัง attribution ไว้ในไฟล์ artifact เองแล้ว** (`format": "kw-dungeons-client"` มี field `attribution: ["© OpenStreetMap contributors, ODbL 1.0"]`) — UI ที่แสดงแผนที่ dungeon ต้องแสดงข้อความนี้ให้ผู้เล่นเห็น (เช่นเดียวกับแผนที่ฐาน) ไม่ใช่แค่ฝังในไฟล์
- **ไม่มีข้อมูลส่วนบุคคล/ตำแหน่งผู้เล่น:** ทุกพิกัดในโฟลเดอร์นี้เป็นตำแหน่งสถานที่สาธารณะ (park/market/garden) ไม่มี GPS trace, ไม่มีตำแหน่งผู้เล่น
- **ชื่อที่แสดงผลจริงไม่อยู่ในไฟล์เหล่านี้:** `name_key`/`search_name_key` เป็น pointer ไป `config/content/names.th.json` (narrative-designer เป็นเจ้าของ, license แยกตามไฟล์นั้น) ตาม dungeon-rules.md หัวข้อ 14 — `name_real` ใน `dungeons.json` เป็นชื่อ OSM ดิบเพื่อใช้ตรวจกฎเท่านั้น ไม่ใช่ข้อความที่ client แสดง
- **osm-n10763239114 (จุดศาลเจ้าใน PW-1/centenary-park):** ไม่มีพิกัดของโหนดนี้อยู่ในไฟล์ใดของ repo (ไม่อยู่ใน `data/coverage/points-unmatched.geojson`) — อ้างถึงเฉพาะ `osm_id` string ใน `notes` ของ record `centenary-park` เพื่อให้ field ตรวจต่อได้ ไม่ใช่การเผยแพร่พิกัดที่ไม่มีอยู่จริงในข้อมูล

## 4. คำถามที่ส่งให้ HUMAN (ยังไม่ได้ตัดสิน)

ไม่มีคำถามใหม่ในรอบนี้ — Q-H1/D-091 ตอบคำถามหลักแล้ว (ข้อ (ข): เผยแพร่ใต้ ODbL 1.0 + attribution พร้อมทวนกับนักกฎหมายใน F20 ก่อนเปิดตัวเชิงพาณิชย์) คำถามเรื่องที่ดิน/สิทธิ์เข้าถึงของแต่ละแห่ง (ไม่ใช่เรื่อง license ข้อมูล) อยู่ใน `notes` ของแต่ละ record และใน REPORT ของงานนี้แทน
