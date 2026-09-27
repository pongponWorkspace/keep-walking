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
