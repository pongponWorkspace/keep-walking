# packages/

library ภายในที่ `apps/*` และ `tools/*` ใช้ร่วม · ส่งเป็น TypeScript source (ไม่มี build step) ให้ Vite, Wrangler และ Vitest bundle เอง · layout ตาม `docs/adr/0001-repo-layout.md`

| โฟลเดอร์ | เจ้าของ (agent) | สถานะ | หมายเหตุ |
| --- | --- | --- | --- |
| `packages/shared/` | tech-lead (type, schema, โครง) · สูตรทำตาม golden vectors ของ systems-designer | สร้างแล้ว (P1-F02-T01) | type ร่วม, JSON Schema, pure function ของ movement gate / damage / drop / exp · ต้องรันบน Worker ได้ (ไม่มี DOM, ไม่มี Node API) |
| `packages/location/` | interface: tech-lead (P1-F02-T03) · implementation Web และ Mock: location-engineer · Capacitor: stub จนถึง M8 | stub `package.json` (P1-F02-T01) | `LocationProvider` |
| `packages/geo/` | location-engineer | ยังไม่สร้าง · การสร้าง `package.json` ต้องผ่านงาน tech-lead (lockfile) | geometry แบบ pure: point-in-polygon พร้อม hysteresis, ระยะสะสมพร้อมกรอง jitter · server-safe เหมือน `packages/shared` |

กฎ
- ห้าม import จาก `tools/*` (lint `@typescript-eslint/no-restricted-imports`)
- ไม่มีตัวเลข balance ในโค้ด รับค่าจาก config เป็น parameter ของ pure function
- ทุกสูตรที่มีผลต่อรางวัลต้องมี test ที่รัน golden vectors ใน `design/systems/test-vectors/*.json`
