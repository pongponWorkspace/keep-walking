# Effect spec — HP bar value change (shared primitive, no cue id)

Task: P2-F06-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §3 (แถว "HP bar เปลี่ยนค่า"), §6.3 จุด 1 (death hard-cut) · `design/ux/components.md` §7, §13.6 · `design/ux/flows/F06-hp-damage-onboarding.md` C1, C7, C8 (R02–R04, R25, R26)
Source: `art/vfx/hp-bar/hp-bar.ts` (plain helper functions — ไม่ผ่าน `registerEffect()`, ดูเหตุผลด้านล่าง) · `art/vfx/hp-bar/timing.json`
Demo: `art/vfx/demo/hp-critical.html` (ส่วน "ฟื้น / HP bar tween")

## ทำไมไม่ใช่ registered effect

`play(effectId, target)` รับ `target` element เดียวไม่มีช่องส่งค่าตัวเลขรันไทม์ (`fromRatio`/`toRatio`) — ทุกครั้งที่ HP เปลี่ยนต้องรู้ค่าก่อน-หลังจาก engine เสมอ (server-authoritative, client ห้ามเดา) จึงเป็น plain helper แบบเดียวกับ `exitToast` ใน `tick-feedback.ts` ไม่ใช่ entry ใน registry

## `tweenHpFill(target, { fromRatio, toRatio })`

| | |
| --- | --- |
| trigger | ทุกครั้งที่ HP เปลี่ยนค่า **ยกเว้น** ตาย (ดู `hardCutHpFill`) — ครอบคลุมถูกตี, ยาอัตโนมัติ, ฟื้นแบบ passive ระหว่าง Recovering (R03/R04), ใช้ยาฟื้น (`inventory.useRevivePotionButton`, R26), ใช้ยา HP เอง |
| duration | 200 ms |
| easing | ease-out |
| frames | `transform: scaleX(fromRatio)` → `scaleX(toRatio)`, `transform-origin: left` (ผู้เรียกตั้งใน CSS) |
| layers | `.hp-fill` เท่านั้น |
| sound cue id | **ไม่มี** — ดูหัวข้อ "ช่องว่าง cue" ด้านล่าง |
| reduced-motion | `setHpFillReduced(target, toRatio)`: กระโดดตรงไปค่าใหม่ทันที (0 ms) |

## `hardCutHpFill(target, toRatio)`

| | |
| --- | --- |
| trigger | ตาย (`run.death`) เท่านั้น — ดู `art/vfx/specs/hp-critical.md` §6.3 |
| duration | 0 ms (ตัดตรง ไม่ไล่ลด) |
| frames | `transform: scaleX(toRatio)` ทันที |
| เหตุผล | ค่าจาก server เป็น 0 อยู่แล้วตอน client รู้ผล (§6.3 จุด 1) — "ไม่มีค่อยๆ ตายให้ดูดราม่า" |

## ช่องว่าง cue (handoff ถึง sound-designer)

ตรวจ `audio/cue-list.md` ทั้งฉบับแล้ว (หัวข้อ 1–3): **ไม่มี cue id สำหรับ "ใช้ยา HP เอง" (`inventory.usePotionButton`) หรือ "ใช้ยาฟื้น" (`inventory.useRevivePotionButton`)** ทั้งสองปุ่มนี้ (flow F06 C7/C8, override ข้อ 8) เกิดขึ้นนอก run ที่จอบ้านเท่านั้น และยิงเงียบสนิทในตอนนี้ (ไม่มีเสียง ไม่มีสั่น มีแค่ HP bar tween 200 ms) เอกสารนี้ **ไม่ขอ cue ใหม่เอง** (ตามกฎ §9 "เอกสารนี้ไม่ขอ cue ใหม่") แต่ flag เป็น handoff เปิดไว้ให้ sound-designer พิจารณา: ทั้งสองเป็น action ที่ผู้เล่นกดปุ่มเอง (ไม่ใช่เหตุการณ์ passive) จึงน่าจะได้ cue ปกติ/priority 5–6 อย่างน้อยหนึ่งเสียง "ป๊อก" แบบเดียวกับ `run.autoPotionUsed` เพื่อให้ fire-together ครบ 3 ชั้นเหมือนทุก action อื่นในเกม — ไม่ blocking (motion ที่มีอยู่ตอนนี้สื่อผลได้ครบด้วยภาพ/ตัวเลขอยู่แล้ว)

## กฎ visibility/reduced-motion

ฟังก์ชันในไฟล์นี้เรียก `Element.animate()` ตรงๆ ไม่ผ่าน `play()` — ผู้เรียก (gameplay-programmer) ต้อง `cancel()` เองเมื่อ `visibilitychange` เป็น hidden (เอกสาร `art/vfx/specs/core-api.md` หัวข้อ 1 ระบุ auto-cancel เฉพาะ effect ที่ผ่าน `play()`) และเช็ค `prefersReducedMotion()` (export จาก `core/vfx.js`) เองก่อนเลือกเรียก `tweenHpFill` หรือ `setHpFillReduced` — เอกสารนี้บันทึกไว้เป็น integration note ให้ P2-F06-T08

## งบไฟล์

`dist/hp-bar/hp-bar.js` 0.77 KB + `timing.json` 1.03 KB = **1.80 KB** (เพดาน 20 KB ผ่านสบาย)
