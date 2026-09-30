# Effect spec — Tick feedback

Task: P2-F05-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §3, §9 · `design/ux/flows/F05-movement-gate-reward.md` Flow A · `design/ux/wireframes/F05-01-tick-feedback.html` · `audio/cue-list.md` (cue id, vibration_ms)
Source: `art/vfx/tick-feedback/tick-feedback.ts` (registers `run.tickGranted`, `run.tickDenied`, `run.tickGrantedFirst`, `run.levelUp`) · `art/vfx/tick-feedback/timing.json`
Demo: `art/vfx/demo/tick-feedback.html`

## `run.tickGranted`

| | |
| --- | --- |
| trigger | ผ่าน movement gate ทุก `config: dungeons.rewardTick.rewardTickInterval_s` (flow F05 A1) |
| duration | 150 ms เข้า (motion-direction §3 "Toast เข้า/ออก") |
| easing | ease-out |
| frames | `translateY(8px)+opacity:0` → `translateY(0)+opacity:1` |
| layers | toast shell เท่านั้น — ไอคอนของที่ได้เล่น `drop.rarity.<tier>` แยกต่างหาก (ดู `rarity-reveal.md`) |
| sound cue id | `run.tickGranted` (`audio/cue-list.md` — ปกติ/priority 5, `vibration_ms [45]`) |
| reduced-motion | opacity fade 0→1, 100 ms, ไม่มี translate |

## `run.tickDenied`

| | |
| --- | --- |
| trigger | ไม่ผ่าน movement gate (flow F05 A3) |
| duration | 150 ms |
| easing | ease-out |
| frames | opacity เท่านั้น (0→1) ไม่มี translate — ตั้งใจให้ "เบา/เป็นกลาง" ไม่ใช่การลงโทษ (style-guide 2b) |
| layers | toast shell (`.toast.faded`) |
| sound cue id | `run.tickDenied` (นุ่ม/priority 6, `vibration_ms [20]`) — ไม่มีเสียงเตือน/สั่นแรง |
| reduced-motion | เหมือนกับ full-motion อยู่แล้ว (มี opacity อย่างเดียว) — ใช้ตัวเดียวกัน |

## `run.tickGrantedFirst`

| | |
| --- | --- |
| trigger | tick แรกที่ผ่าน gate ในชีวิตผู้เล่น (flow F05 A2) — ข้อมูล/ของ/exp เหมือน tick ปกติทุกประการ (D-089, F06-R39) ต่างแค่การแสดงผล |
| duration | 480 ms รวม (150 ms เข้า + 330 ms emphasis pulse) |
| easing | ease-out |
| frames | เข้าเหมือน `run.tickGranted` ทุกประการ แล้วตามด้วย 3-beat scale pulse (`1.02 → 1.03 → 1.04`) ที่จังหวะ `[45,70,45,70,90]` — คัดลอกสัดส่วนจาก `vibration_ms` ของ cue เดียวกันตรง ๆ (ไม่ scale เพราะ audio/visual ของ cue นี้ตั้งใจให้ยาวเท่ากันอยู่แล้ว ต่างจาก rarity reveal) |
| layers | toast shell เท่านั้น |
| sound cue id | `run.tickGrantedFirst` (ปกติ/priority 5, `vibration_ms [45,70,45,70,90]`, ~330 ms — cue เดียวที่ยาวเกิน 150 ms โดยตั้งใจเพราะเกิดครั้งเดียวต่อผู้เล่นตลอดชีวิต) |
| reduced-motion | opacity fade 0→1, 100 ms |

หมายเหตุ: D-089 ยืนยันว่านี่ยังเป็น "tick ปกติ" ไม่ใช่ rarity พิเศษ — ห้ามเพิ่ม corner/shard decoration ใด ๆ ที่ทำให้ดูเหมือนของหายาก (นั่นคือหน้าที่ของ `drop.rarity.*` แยกต่างหาก)

## `run.levelUp`

| | |
| --- | --- |
| trigger | exp พอเลเวลขึ้นระหว่าง tick ที่ผ่าน (flow F05 A4) — แสดงเป็นบรรทัดต่อท้าย toast เดิม ไม่ใช่ popup แยก (F06-R33: ไม่มีลิงก์ไปหน้าใด) |
| duration | 200 ms |
| easing | ease-out |
| frames | `translateY(4px)+opacity:0` → `translateY(0)+opacity:1` — เบากว่า toast entrance หลัก (4px vs 8px) เพราะเป็น element ย่อยต่อท้าย ไม่ใช่ toast ใหม่ |
| layers | inline label ที่ถูก mount เพิ่มในตัว toast เดิม (ไม่ใช่ toast เอง) |
| sound cue id | ไม่มี cue เฉพาะ (`cueId: null` ใน timing.json) — ขี่จังหวะเสียง/สั่นของ tick cue เดียวกัน |
| reduced-motion | opacity fade 0→1, 100 ms |

## Toast exit (shared helper, ไม่ใช่ registered effect)

`exitToast(target)` — ไม่มี cue id ของตัวเอง เพราะจังหวะ "ออก" ถูกกำหนดโดยเวลาที่ toast ค้างอยู่ (เนื้อหา-dependent, caller เป็นคนตั้ง timer) ไม่ใช่ event จาก server แบบ tick อื่น: `translateY(0)→translateY(8px)` + `opacity:1→0`, 200 ms, ease-in (motion-direction §3 "ออก 200 ms")

## กฎ visibility/reduced-motion ที่ใช้ร่วมทุก effect ข้างบน

ทุก effect เรียกผ่าน `play()` ของ `art/vfx/core/vfx.ts` จึงได้ guarantee เดียวกันฟรี: cancel ทันทีที่ `visibilitychange` เป็น hidden, reduced-motion ตรวจจุดเดียวใน `play()` ไม่ต้องเช็คซ้ำในไฟล์นี้ (ดู `specs/core-api.md`)

## `.toast` transform contract (P2-H53 — root cause ของ visual gate รอบ 2 R2-1)

ที่มา: `art/reviews/F04-F06-visual-gate.md` §7.3 (R2-1)/§7.4 · หลักการเดียวกับ D-137 (`.hp-fill-edge-marker`, ดู `art/vfx/specs/hp-bar.md`) · decision เสนอ: D-142 (REPORT ของงานนี้)

**ต้นเหตุที่ยืนยันแล้ว:** `.toast` เดิมจัดกึ่งกลางด้วย CSS `left: 50%; transform: translateX(-50%)` ขณะที่ `runTickGranted`/`runTickDenied`/`runTickGrantedFirst`/`exitToast` (ไฟล์นี้) และ `runHpLow` (`../hp-critical/hp-critical.ts`) เรียก `target.animate({ transform: 'translateY(...)' }, { fill: 'forwards' })` — WAAPI แทนที่ค่า `transform` ทั้งก้อนของ CSS (ไม่ใช่ผสาน) และ `fill: 'forwards'` ทำให้ค่านั้นค้างถาวรหลังเล่นจบ `translateX(-50%)` จึงหายไปทุกครั้งที่ effect ใดก็ตามเล่นบน `.toast` ไม่ใช่แค่ระหว่างเล่นเท่านั้น

**กติกา (บังคับ ไม่มีข้อยกเว้น):**
1. `art/vfx/tick-feedback/tick-feedback.ts` และ `art/vfx/hp-critical/hp-critical.ts` (เฉพาะ `runHpLow`) เป็นเจ้าของ `transform` ของ `.toast` ทั้งหมด 100% — ไม่มีไฟล์ CSS ใดตั้ง `transform`/`transition: transform` ให้ `.toast` อีกต่อไป
2. การจัดกึ่งกลางแนวนอนของ `.toast` ทำด้วย `left: 0; right: 0; margin-inline: auto; width: max-content` (ตามที่ visual gate เสนอไว้ใน §7.3) ไม่ใช้ `transform`/`translateX(-50%)` เด็ดขาด — วิธีนี้ให้ผลกึ่งกลางเหมือนเดิมทุกประการโดยไม่ชนกับ `transform` ที่ฝั่ง vfx เป็นเจ้าของ
3. ทุก keyframe list ของทั้งสองไฟล์เริ่มและจบที่ตำแหน่ง identity (`translateY(0)` หรือเทียบเท่า) ยืนยันแล้วว่าไม่มีการ bake `-50%` หรือค่า absolute อื่นใดไว้ในโค้ด — ดูคอมเมนต์หัวไฟล์ทั้งสองสำหรับรายละเอียดต่อ effect (รวมข้อยกเว้นเดียวที่ตั้งใจ: `exitToast` จบที่ `translateY(8px)` ค้างไว้ตอนกำลังจะถูกลบออกจาก DOM ไม่ใช่ตำแหน่งค้างที่ผู้เล่นเห็นระยะยาว)
4. ถ้ามี effect ใหม่ในอนาคตที่ target `.toast` (นอกเหนือ 2 ไฟล์นี้) ต้องเดินตามกฎเดียวกัน หรือเพิ่มชื่อไฟล์นั้นเข้าในหัวข้อนี้

**Test ที่ยืนยันสัญญานี้ (ของ gameplay-programmer, P2-X52):** e2e ตรวจ `boundingBox()` ของ `.toast` อยู่ในช่วง 0–390 px และจุดกึ่งกลางต่างจาก 195 px ไม่เกิน 1 px **หลัง** effect เล่นจบ ทั้งกรณี `run.tickGranted`, `run.tickGrantedFirst`, `run.hpLow` และ reduced-motion (ตาม §7.9 ของ visual gate)
