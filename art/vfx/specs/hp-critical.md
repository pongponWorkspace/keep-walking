# Effect spec — HP-critical: HP ต่ำ, auto-retreat, ตาย

Task: P2-F06-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §6, §9 · `design/ux/flows/F06-hp-damage-onboarding.md` Flow C (C1–C6) · `design/ux/wireframes/F06-03-hp-warning-autoretreat-death-recovering.html` · `audio/cue-list.md` §1, §4 (priority: `run.death`=0, `run.autoRetreat`=1, `run.hpLow`=2 — cue ความปลอดภัยทั้งสามชนะเสมอ) · D-096, D-089, D-076, D-077
Source: `art/vfx/hp-critical/hp-critical.ts` (registers `run.hpLow`, `run.autoRetreat`, `run.death`) · `art/vfx/hp-critical/timing.json` · ใช้ `art/vfx/hp-bar/hp-bar.ts` และ shared screen-transition primitive จาก `art/vfx/core/beats.ts`
Demo: `art/vfx/demo/hp-critical.html`

## `run.hpLow`

| | |
| --- | --- |
| trigger | HP ข้ามลงต่ำกว่า `config: dungeons.hpSafety.lowHpWarningThreshold_pct` (F06-R14) — ครั้งเดียวต่อการลงผ่านเส้น |
| duration | 550 ms รวม (150 ms toast เข้า + 400 ms 3-beat pulse) |
| easing | ease-out |
| frames | เข้า: `translateY(8px)+opacity:0` → `translateY(0)+opacity:1` (150ms) แล้วตามด้วย pulse `scale(1)→1.06→1` × 3 ที่จังหวะตรงตาม `vibration_ms [80,80,80,80,80]` (literal ms ไม่ scale) จบแล้วนิ่งสนิทที่ scale(1) |
| layers | toast shell (`.toast.danger`) เท่านั้น |
| sound cue id | `run.hpLow` (เตือน/priority 2, `vibration_ms [80,80,80,80,80]`) |
| reduced-motion | opacity fade 0→1, 100 ms |
| ห้าม | สีแดงกะพริบแบบ loop, ไอคอน error/กากบาท (§6.1) |

**`.toast` transform ownership (P2-H53):** `runHpLow` targets `.toast.danger` และเป็นเจ้าของ `transform` ของ `.toast` ร่วมกับทุก effect ใน `art/vfx/tick-feedback/tick-feedback.ts` — สัญญาเต็ม (เหตุผล, กติกา, test) อยู่ที่ `art/vfx/specs/tick-feedback.md` หัวข้อ "`.toast` transform contract" อย่าซ้ำเนื้อหาที่นี่ ไฟล์นี้แค่ยืนยันว่า `runHpLow` ปฏิบัติตามกติกาเดียวกัน (เริ่ม/จบ transform ที่ identity, ไม่ bake ค่า absolute ใด ๆ — ดูคอมเมนต์หัว `hp-critical.ts`)

## `run.autoRetreat`

| | |
| --- | --- |
| trigger | เปิด auto-retreat อยู่และ HP ≤ `config: dungeons.hpSafety.autoRetreatThreshold_pct` (F06-R16) |
| duration | 700 ms รวม (350 ms nudge phase + 350 ms screen transition) |
| easing | ease-out |
| frames | nudge: `translateY(0)→-3px→0` × 3 (สัดส่วนจาก `vibration_ms [100,80,100,80,100]` ย่อสัดส่วนลงจาก 460ms ดิบให้พอดี 350ms — ดูเหตุผลใน source comment) บนกรอบสถานะ run (`.run-state-pill`/header frame) แล้วตามด้วย **จังหวะสุดท้าย (350ms) คือ screen transition จริง** จาก `S-03-run` ไป `S-04-run-summary` ผ่าน `runAutoRetreatScreenTransition(outgoing, incoming)` (slide-up + cross-fade, ไม่ใช่ effect ตกแต่ง) |
| layers | กรอบสถานะ run (nudge) + root ของทั้งสองจอ (transition) |
| sound cue id | `run.autoRetreat` (วิกฤต/priority 1, `vibration_ms [100,80,100,80,100,80,350]`) |
| reduced-motion | nudge ตัดทิ้งทั้งหมด · transition ใช้ `runAutoRetreatScreenTransitionReduced` (opacity cross-fade อย่างเดียว ไม่มี translateY) |
| ห้าม | screen shake, vignette แดง, slow-motion, camera zoom, ภาพ/เสียง "แพ้" (§6.2 จุด 4) — สัญญาณ HP ต่ำ 30% ที่อาจชนกันในจังหวะเดียวกันแสดงแค่ auto-retreat เท่านั้น (F06-R16, ผู้เล่นเห็น/ได้ยินสัญญาณเดียว) |

**canon บนหน้าสรุป (แก้ B-01, ไม่ใช่ของ effect นี้แต่เป็น integration note):** ข้อความ canon เต็ม `[run.autoRetreat]` ต้องอยู่ถาวรบน `S-04-run-summary` ไม่ใช่แค่ overlay ชั่วคราว (flow F06 C4) — เอกสารนี้ไม่แตะ copy แต่ note ไว้ให้ P2-F06-T08 อย่าลบ canon line ทิ้งหลัง transition จบ

## `run.death`

| | |
| --- | --- |
| trigger | ปิด auto-retreat อยู่และ HP ถึง 0 (F06-R23) — **จบ run ทันที ไม่มีสถานะล้มในดัน** (D-096, override ข้อ 2 ของ flow F06) |
| duration | 720 ms รวม (0 ms hard-cut + 120 ms เงียบ + 600 ms grayscale) |
| easing | linear (grayscale tween) |
| frames | (1) `hardCutHpFill(target, 0)` ตัด HP bar ลง 0 ทันที ไม่ไล่ลด (2) เงียบ 120 ms ไม่มี motion (3) `filter: grayscale(0)→grayscale(1)` ตลอด 600 ms บน `.hp-fill` เดียวกัน |
| layers | `.hp-fill` เท่านั้น (ทั้ง hard-cut และ grayscale ทำงานบน element เดียวกัน คนละ CSS property ไม่ชนกัน) |
| sound cue id | `run.death` (วิกฤต/priority 0 สูงสุด, `vibration_ms [150,120,600]`) |
| reduced-motion | จบที่ค่าเดียวกัน (HP=0, `grayscale(1)`) แบบไม่มี tween ระหว่างทาง |
| filter exception | `grayscale()` เท่านั้น (motion-direction §2 ตาราง, D-076/D-077) — ไม่ใช้ `filter` อื่นใดในโมดูลนี้ |
| ห้าม | screen shake, แสงแดงเต็มจอ, slow-motion, ตรา "GAME OVER", เสียง/ภาพร้องเจ็บ (§6.3 จุด 5) |

**Phase 2 override ที่กระทบขอบเขต effect นี้ (D-096):** §6.3 จุดที่ 4 เดิม (ตัวเลือกฟื้น 3 ทาง fade เข้าบนจอเดียวกันหลัง grayscale) **ไม่ใช้ใน Phase 2** — เมื่อ grayscale จบ ผู้เรียกส่งต่อไปหน้าสรุป run ทันทีผ่าน `screenTransitionOut`/`screenTransitionIn` เดียวกับที่ `run.autoRetreat` ใช้ (ตรงกับ wireframe `F06-03-*.html` เฟรม C6 ที่ไม่มีจอกลาง) ทางฟื้นทั้งหมด (ยาฟื้น, ฟื้น passive) อยู่นอก run ที่จอบ้าน (ดู `art/vfx/specs/hp-bar.md`)

## Screen-transition contract (ใช้ร่วม `run.autoRetreat`/`dungeon.confirmEnter`)

`screenTransitionOut(el, opts)`/`screenTransitionIn(el, opts)` ใน `art/vfx/core/beats.ts`: `translateY` + `opacity`, ease-out, ระยะเวลาตาม `opts.durationMs` (350 ms ทั้งสองจุดที่ใช้ตอนนี้) — เป็น primitive เดียวที่ทุกจุด hand-off หน้าจอในแพ็กเกจนี้ใช้ร่วมกัน ไม่ใช่ effect ตกแต่งแยกต่อจุด (§6.2 จุด 2) คู่ reduced-motion คือ `screenCrossFadeOut`/`screenCrossFadeIn` (opacity ล้วน ≤150ms)

## รางวัลก้อนแรก ("first reward" — ไม่มีไฟล์ใหม่ในโมดูลนี้)

D-089/F06-R39/R40: รางวัลก้อนแรกของ onboarding เป็น **tick ปกติ ไม่มี code path แยก** — effect ที่ใช้คือ `run.tickGrantedFirst` ซึ่ง **มีอยู่แล้ว** ใน `art/vfx/tick-feedback/tick-feedback.ts` (สร้างใน P2-F05-T05) ไม่ต้องสร้างใหม่หรือแก้ (การ registerEffect ซ้ำ id เดิมจะ throw) งานนี้ยืนยันแค่ว่าไม่มี effect เฉพาะของ "รางวัลก้อนแรก" แยกออกมา ตรงกับ D-089 ที่ห้าม emphasis เกินจริง — ดู `art/vfx/specs/tick-feedback.md` สำหรับตารางเต็ม

## งบไฟล์

`dist/hp-critical/hp-critical.js` 6.37 KB + `timing.json` 2.32 KB = **8.69 KB** (เพดาน 20 KB ผ่าน) — พึ่ง `hp-bar.js` (0.77 KB) และ `core/beats.js` (2.54 KB, ใช้ร่วมทุกกลุ่ม ไม่นับเป็น "effect module" ตาม `specs/core-api.md`)
