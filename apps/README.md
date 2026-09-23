# apps/

แอปที่ deploy ได้ · layout และกฎตาม `docs/adr/0001-repo-layout.md`

| โฟลเดอร์ | เจ้าของ (agent) | สถานะ | หมายเหตุ |
| --- | --- | --- | --- |
| `apps/client/` | gameplay-programmer | stub `package.json` (P1-F02-T01) · scaffold ใน P1-F02-T09 | เว็บมือถือ Vite + MapLibre GL JS + PMTiles · ห้ามมี logic รางวัล (ดู ADR 0001 หัวข้อ server authority) |
| `apps/api/` | backend-programmer | ชื่อจองแบบมีเงื่อนไข ยืนยันใน ADR 0002 | API Worker + Durable Objects + migrations บน Cloudflare Workers (D-008) · ยังไม่สร้างใน Phase 1 |
| `apps/admin-api/` | backend-programmer | ยังไม่ตัดสิน | back office · อาจเป็น route ใน `apps/api/` แทน ตัดสินใน ADR ภายหลัง |

กฎ
- `apps/*` import ได้จาก `packages/*` เท่านั้น ห้าม import จาก `tools/*` (lint บังคับ)
- ค่า balance และชื่อทุกอย่างมาจาก `config/` ห้าม hardcode (lint `no-magic-numbers` + tech gate)
- เพิ่ม dependency หรือสร้าง workspace ใหม่ = แก้ lockfile ต้อง handoff ถึง tech-lead (กฎ path ร่วม TL-M01)
