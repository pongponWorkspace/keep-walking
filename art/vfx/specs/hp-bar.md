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

## เส้นแบ่งปลายแถบ (V-39, P2-H42) — `.hp-fill-edge-marker`

`design/ux/components.md` §13.6 (จาก content gate V-30 ข้อ 7): แถบ HP ต้องมีเส้น 2 px `ink.900` ที่ปลายส่วนที่เติม เพื่อให้อ่านระดับ HP ได้แม้คู่สี `state.danger` บน `ink.100` (ราง) ตกขอบ contrast floor เล็กน้อย · ต้องเป็น element แยกจาก `.hp-fill` เอง ไม่ใช่ `::after` ของมัน เพราะ `.hp-fill` เคลื่อนที่ด้วย `scaleX()` ซึ่งจะบีบความกว้างของ pseudo-element ไปด้วย

**รอบแรก (P2-X42, A-P2-X42-2):** client ทำ `.hp-fill-edge-marker` เป็น sibling ถูกต้อง แต่เลื่อนด้วย CSS `transition: left 200ms ease-out` (เปอร์เซ็นต์ของความกว้าง `.hp-track`) เพื่อเลี่ยงต้องรู้ความกว้างจริงเป็นพิกเซล

**คำตัดสิน (V-39, vfx-animator):** ปฏิเสธการใช้ `left` — หัวข้อ 2 ของ `motion-direction.md` ห้ามแก้ `width/height/top/left/margin` แบบต่อเนื่องไม่มีข้อยกเว้น (เหตุผลเดียวกับที่ `.hp-fill` เองต้องใช้ `scaleX()` แทน `width`: `left` เป็น layout property, การ transition มันทำให้เกิด layout reflow ทุกเฟรมของ 200 ms นั้น ที่ความถี่เดียวกับทุกครั้งที่ HP เปลี่ยนค่า) ไม่มีข้อยกเว้นสำหรับ element เล็กแค่ 2 px

**ทางแก้ที่ยอมรับ:** `tweenHpEdgeMarker`/`hardCutHpEdgeMarker`/`setHpEdgeMarkerReduced` (เพิ่มใน `art/vfx/hp-bar/hp-bar.ts` โดยงานนี้) — คู่แฝดของ `tweenHpFill`/`hardCutHpFill`/`setHpFillReduced` ทุกอย่าง (duration/easing เดียวกัน, trigger เดียวกัน) ต่างแค่ property เป็น `transform: translateX(px)` แทน `left: %` ผู้เรียกวัดความกว้างจริงของ `.hp-track` ด้วย `getBoundingClientRect().width` **ครั้งเดียวต่อการอัปเดตหนึ่งครั้ง** (อ่านค่า ไม่ใช่ query ทุกเฟรม) แล้วส่งเป็น `trackWidthPx` เข้าไปเป็นเลขพิกเซล — โมดูลนี้คำนวณ `ratio * trackWidthPx - 1` (ครึ่งความกว้างของเส้น 2 px) ให้เอง แทนที่ static rule `transform: translateX(-1px)` เดิมใน CSS

**Handoff ถึง gameplay-programmer (blocking: yes — ทำลายกฎ property budget ของ motion-direction §2):**
1. `apps/client/src/ui/hp-bar.ts#update()`: แทนการตั้ง `edgeMarker.style.left` ด้วยการเรียก `tweenHpEdgeMarker`/`setHpEdgeMarkerReduced` (ตาม branch เดียวกับที่เลือกระหว่าง `tweenHpFill`/`setHpFillReduced` อยู่แล้ว) พร้อม `trackWidthPx: track.getBoundingClientRect().width` ที่วัดตอนนั้น (ระวัง: ต้องวัด **หลัง** mount เข้า DOM จริงแล้วเท่านั้น ความกว้าง 0 ตอนยังไม่ mount จะทำให้ marker กระโดดไปที่ 0 ทุกครั้ง — ถ้า mount กับ measure คนละจังหวะกัน ให้ fallback เป็น `setHpEdgeMarkerReduced` ตอน `trackWidthPx <= 0`)
2. death (`run.death`, ดู `art/vfx/specs/hp-critical.md` §6.3): เรียก `hardCutHpEdgeMarker` คู่กับ `hardCutHpFill` เสมอ (ทั้งคู่ตัดไป 0 พร้อมกัน)
3. `apps/client/src/app.css`: ลบ `.hp-fill-edge-marker` ทั้ง `transition: left 200ms ease-out` และ `transform: translateX(-1px)` แบบ static — element นี้ให้ JS (`hp-bar.ts` ในไฟล์นี้) เป็นเจ้าของ `transform` ทั้งหมด 100% ไม่มี CSS rule ใดแก้ `transform`/`left` ของมันอีก (คง `position: absolute; top: 0; bottom: 0; width: 2px; background: #1a1a22;` ไว้ตามเดิม — ค่าที่เปลี่ยนแค่ property การเคลื่อนที่)
4. ทดสอบ: `hp-bar.test.ts` (happy-dom) ควรเพิ่มเคสยืนยันว่า `.hp-fill-edge-marker` ไม่มี inline `left` อีกต่อไป และ `getComputedStyle` มี `transform` ที่ไม่ใช่ `none` หลัง `update()` (happy-dom ไม่รัน `Element.animate()` จริง แต่ยืนยัน property ที่ถูกเรียกได้ผ่าน mock/spy บน `Element.prototype.animate` เหมือน pattern เดิมของ suite นี้ถ้ามี)

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

`dist/hp-bar/hp-bar.js` 1.82 KB + `timing.json` 2.04 KB = **3.86 KB** (เพดาน 20 KB ผ่านสบาย, เพิ่มจาก 1.80 KB เดิมจาก `tweenHpEdgeMarker`/`hardCutHpEdgeMarker`/`setHpEdgeMarkerReduced` ที่เพิ่มในรอบ V-39 นี้)
