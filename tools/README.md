# tools/

เครื่องมือ offline (วิเคราะห์ข้อมูล, build tile, simulator, จัดการ trace) · ไม่อยู่ในเส้นทาง product และไม่ deploy · layout ตาม `docs/adr/0001-repo-layout.md`

| โฟลเดอร์ | เจ้าของ (agent) | ภาษา | หมายเหตุ |
| --- | --- | --- | --- |
| `tools/coverage/` | location-engineer | Python (pin ใน `tools/coverage/requirements.txt`, venv ใน `tools/coverage/.venv/`) | ดึง OSM, คัด polygon, heatmap · ไฟล์ดาวน์โหลดอยู่ใน `downloads/` `raw/` `cache/` ที่ถูก ignore |
| `tools/tiles/` | location-engineer | shell / CLI `pmtiles` (ถ้าต้องใช้ Node ให้ handoff ถึง tech-lead เพื่อเพิ่ม workspace) | build PMTiles · commit ได้เฉพาะ `tools/tiles/fixtures/` · `tools/tiles/out/` ถูก ignore |
| `tools/traces/` | location-engineer | TypeScript (workspace `@keep-walking/tools-traces`) | validate / sanitize / แปลง trace · raw trace อยู่ใน `data/gps-traces/raw/` ที่ถูก ignore เท่านั้น |
| `tools/sim/` | systems-designer | TypeScript (workspace `@keep-walking/tools-sim`) | simulator ใช้ pure function จาก `@keep-walking/shared` และอ่าน `config/balance/*.json` · สร้าง golden vectors |

กฎ
- `tools/*` import จาก `packages/*` ได้ แต่ `apps/*` และ `packages/*` ห้าม import จาก `tools/*`
- TypeScript วาง source ใน `src/` และ test ใน `src/**/*.test.ts` หรือ `test/` (root Vitest เก็บให้เอง) · รันสคริปต์ด้วย `pnpm exec tsx <file>`
- Python pin dependency ต่อโฟลเดอร์ ห้ามติดตั้งแบบ global · test ของ Python รันด้วยคำสั่งที่ README ของโฟลเดอร์นั้นระบุ
- CI ห้ามดาวน์โหลดข้อมูลใหญ่ test ใช้ fixture เล็กเท่านั้น (TL-S11)
