# Effect spec — Quick-command emotes (pose kit, avatar-spec §10)

Task: P2-F06-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §5 · `art/direction/avatar-spec.md` §10 (ตารางท่า, ที่มาของทุกตัวเลขในไฟล์นี้) · `audio/cue-list.md` §3 (`qc.sent`/`qc.received`)
Source: `art/vfx/quick-command/quick-command.ts` (registers `qc.arrived` … `qc.thanks`, 10 ตัว) · `art/vfx/quick-command/timing.json`
Demo: `art/vfx/demo/quick-command.html`

## ขอบเขตของงานนี้ (สำคัญ — อ่านก่อนใช้)

การต่อเข้าการ์ด Nearby Party จริงเป็นของ Phase 3 F09 (board 1.9: "artist ยืนยันท่า quick-command 10 ตัว → เลื่อน Phase 3") เพราะ Phase 2 ไม่มี Nearby Party UI ให้ mount (`design/features/F04-dungeon-presence.md` §6) และยังไม่มี sprite ท่ามือ/prop เป็นชิ้นสุดท้าย งานนี้จึงสร้างเฉพาะ **choreography** (transform ของ root + แขน/มือประกอบ) ที่ข้อมูลตัวเลขทั้งหมดมาจาก avatar-spec §10 ตารางเดียว (นิ่งแล้ว ไม่รอการยืนยันเพิ่ม) — ตรงกับที่ `rarity-reveal`/`tick-feedback` ถูกสร้างล่วงหน้าก่อนงาน integration (P2-F05-T10) เช่นกัน

## DOM contract

`target` = `.avatar-root` (จุดหมุน transform ตาม avatar-spec §10 "ท่า = transform ของทั้งตัว ... รอบ root") แต่ละฟังก์ชันมองหา child เสริมที่ระบุในตาราง (`.pose-hand` หรือ `.arm-p`) แล้ว animate เพิ่มถ้ามีอยู่จริง (ไม่บังคับต้องมี, แบบเดียวกับ `createCorners` ใน `rarity-reveal.ts`) **`.face`/`.pose-prop` เป็นการสลับ class/attribute แบบ discrete โดยผู้เรียก ไม่ใช่ tween** ("จบ emote กลับเป็น neutral ... ทันที ไม่ loop", avatar-spec §10) — โมดูลนี้ไม่แตะ opacity/transform ของ `.face`/`.pose-prop` เลย

## ตาราง 10 ท่า

| คำสั่ง | duration | easing | root transform | child เสริม | face (discrete) | prop (discrete) |
| --- | --- | --- | --- | --- | --- | --- |
| `qc.arrived` | 700 ms | ease-out | `rotate(4deg)` แล้วคืน (peak @30%) | `.pose-hand` `rotate(±15deg)` 2 รอบ | smile | — |
| `qc.onMyWay` | 900 ms | ease-out | เอน `rotate(6deg)` + `translateY(-3px)` 2 จังหวะ | `.arm-p` `rotate(±20deg)` | wince | — |
| `qc.goOn` | 400 ms | ease-out | `translateX(4px)` หยุดกะทันหัน ไม่มี overshoot | — | smile | — |
| `qc.needHeal` | 800 ms | ease-out | `rotate(3deg)` ค้าง | — | wince | — |
| `qc.hpCritical` | 600 ms | ease-out | เซ `rotate(±5deg)` 3 ครั้งแล้วหยุดที่ 0 | — | dizzy | — |
| `qc.needCover` | 500 ms | ease-out | `scaleY(0.92)` ค้าง | — | wince | shield |
| `qc.needBreak` | 900 ms | **ease-in-out** | `rotate(-6deg) scaleY(0.96)` ค้าง | — | content | cup |
| `qc.retreating` | 700 ms | ease-out | `translateX(-6px)` แล้วคืน | `.arm-p` `rotate(±12deg)` 1 รอบ | content | — |
| `qc.goodDrop` | 500 ms | ease-out | `translateY(-6px)` เด้ง 1 ครั้งแล้วคืน | — | smile | — |
| `qc.thanks` | 350 ms | ease-out | `scale(1.04)` แล้วคืน | — | smile | — |

ทุกตัวเล่นเฉพาะ view `front` (avatar-spec §10) จบแล้วนิ่งค้างหรือคืนสู่ neutral ทันที ไม่มี loop — ทุกตัว property เป็น `transform` ล้วน ไม่มี `opacity`/`filter`

## Sound cue

ทั้ง 10 คำสั่งใช้ cue เดียวกัน `qc.sent`/`qc.received` (`vibration_ms [15]`, นุ่ม/priority 6→7 ตาม P2-F06-T13) — เจตนา: "เนื้อความอ่านจาก UI ไม่ใช่จากเสียง" (motion-direction §5) glyph + copy key + ท่าที่ไม่ซ้ำกันคือช่องทางแยกคำสั่ง ไม่ใช่เสียง

## reduced-motion

ทุกตัวใช้ `reducedFade()` เดียวกัน: `opacity:0→1`, 100 ms, ตัด transform ทั้งหมด — ข้อมูลอ่านได้ครบจาก glyph + copy text อยู่แล้ว (motion-direction §1 ข้อ 2, §5)

## งบไฟล์

`dist/quick-command/quick-command.js` 8.11 KB + `timing.json` 2.11 KB = **10.22 KB** (เพดาน 20 KB ผ่าน แม้รวม 10 ท่าในไฟล์เดียว)
