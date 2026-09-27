# Effect spec — Rift unfold (`ui.riftReveal`)

Task: P2-F05-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §8 · `studio/decisions/decision-log.md` D-076, D-077 · `art/direction/briefs/P2-assets.md` 2.11 · `art/direction/map-style.md` §7, §11 (ทำไมแผนที่จริงไม่มี motion นี้)
Source: `art/vfx/rift-reveal/rift-reveal.ts` (registers `ui.riftReveal`) · `art/vfx/rift-reveal/timing.json`
Demo: `art/vfx/demo/rift-reveal.html`

| | |
| --- | --- |
| trigger | mount ครั้งแรกของ `icon.ui.rift` — การ์ด dungeon ใน `S-01-map` แผงล่าง และหัว `S-02-dungeon-confirm` (P2-assets 2.11) |
| duration | 300 ms |
| easing | ease-out |
| frames | `transform: scaleY(0.6)` → `scaleY(1)` จากฐาน (`transform-origin: bottom`) |
| layers | ไอคอน `icon.ui.rift` เอง ไม่มี layer เสริม |
| sound cue id | ไม่มี (เงียบ, one-shot ล้วน — ไม่ผูกกับ tick/reward ใด ๆ) |
| reduced-motion | แสดงรูปทรงเต็ม (`scaleY(1)`) ทันที ไม่มี transform เลย |

## ทำไมถึงเงียบ (ไม่มี cue id)

รอยแยกบนแผนที่จริง (MapLibre canvas) เป็นภาพนิ่ง 100% ไม่มีข้อยกเว้น (map-style.md §7/§11, pillars P4) — "จังหวะ rift" ที่เคยเสนอเป็น idle breathing ถูกปฏิเสธในรอบ content gate P1-F03-T22 (finding V-01, คำตัดสิน R-1, บันทึก D-055/D-076) และย้ายมาเป็น motion นอกแผนที่ตัวนี้แทน เพราะเป็นการ "กางออก" ของไอคอนตอนการ์ด/หน้า UI ปรากฏ ไม่ใช่สัญญาณ gameplay ที่ต้องมีเสียง/สั่นประกอบ (ต่างจาก tick/drop ที่ผูกกับ reward จริง)

## กฎห้ามเด็ดขาด (ซ้ำจาก motion-direction §8 เพื่อกันหลุด)

- **ห้ามใช้กับ MapLibre canvas เด็ดขาด** ไม่มีข้อยกเว้น — โมดูลนี้ไม่แตะ canvas ใด ๆ เลย เรียกได้เฉพาะกับ DOM element ของ UI (การ์ด/popup)
- **ห้ามใช้กับ `icon.ui.in-run` หรือ `icon.ui.closed`** (P2-assets 2.11) — bound กับ `icon.ui.rift` เท่านั้น
- **ห้ามใช้ `opacity`** — ไอคอนมีขอบหมึก (ink outline) การลด opacity ทำให้ขอบจางลงชั่วขณะซึ่งขัด D-077/R-1 (กฎเดียวกับที่ห้าม `.map-park`/scrim ลด opacity ของสิ่งที่มีขอบสำคัญ)
- **ห้ามเล่นซ้ำ/loop** แม้การ์ดจะอยู่บนจอนานแค่ไหน — เล่นครั้งเดียวตอน mount แล้วนิ่งค้างสนิท (motion-direction §11 แถว 9)

## DOM contract

`play('ui.riftReveal', iconEl)` — `iconEl` คือ element ของ `icon.ui.rift` ที่ mount แล้ว โมดูลตั้ง `transform-origin: bottom` ให้อัตโนมัติครั้งแรก (ผ่าน attribute guard `data-vfx-origin-set` กันตั้งซ้ำ) ไม่ต้องตั้งเองใน CSS ของผู้เรียก แต่ถ้าผู้เรียกตั้ง `transform-origin` เองอยู่แล้วในที่อื่น ให้ตรวจว่าไม่ชนกัน
