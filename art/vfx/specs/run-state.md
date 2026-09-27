# Effect spec — เข้า dungeon / Grace / Suspended / Resumed

Task: P2-F06-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §3 (Banner/Toast เข้า/ออก), §9 · `design/ux/components.md` §6, §13.2 · `design/ux/flows/F04-dungeon-presence.md` Flow E (แก้ C-5, `.banner.info-full`) · `audio/cue-list.md` §3, §4
Source: `art/vfx/run-state/run-state.ts` (registers `run.stateGrace`, `run.stateSuspended`, `run.stateResumed`, `dungeon.confirmEnter`) · `art/vfx/run-state/timing.json`
Demo: `art/vfx/demo/run-state.html`

## `dungeon.confirmEnter`

| | |
| --- | --- |
| trigger | server ยืนยันเข้า run สำเร็จ (`S-02-dungeon-confirm` → `S-03-run`) |
| duration | 300 ms |
| easing | ease-out |
| frames | `screenTransitionIn` บน root ของ `S-03-run` ที่กำลังจะ mount (`translateY(16px)+opacity:0` → `translateY(0)+opacity:1`) — popup confirm ที่ออกไม่มี exit motion ที่กำหนดในสเปกใดที่อ่านสำหรับงานนี้ (ปิดด้วยกลไก popup เดิม) |
| layers | root ของ `S-03-run` เท่านั้น |
| sound cue id | `dungeon.confirmEnter` (ปกติ/priority 5→6 ตาม P2-F06-T13, `vibration_ms [30,40,30]`) |
| reduced-motion | `screenCrossFadeIn` (opacity ล้วน, 150 ms) |

## `run.stateGrace`

| | |
| --- | --- |
| trigger | GPS drift ออกนอก polygon ไม่เกิน `config: dungeons.runState.graceMax_s` (F04-R12..19) |
| duration | 200 ms |
| easing | ease-out |
| frames | `translateY(-4px)+opacity:0` → `translateY(0)+opacity:1` บน `.banner.info` |
| layers | banner shell เท่านั้น |
| sound cue id | **ไม่มี** (`cueId: null` — ไม่มี cue ใน `audio/cue-list.md` สำหรับเข้า Grace เอง มีแค่ Suspended/Resumed) |
| reduced-motion | opacity fade 100 ms |

## `run.stateSuspended`

| | |
| --- | --- |
| trigger | ออกนอก polygon เกิน `graceMax_s` (F04-R13) |
| duration | 200 ms (เหมือน `run.stateGrace` ทุกประการ — สัญญาณเสียง/สั่นต่างกัน ไม่ใช่ motion) |
| easing | ease-out |
| frames | เหมือน `run.stateGrace` แต่เล่นบน `.banner.info-full` (ชื่อ variant ตามที่แก้ C-5 ใน flow F04) |
| sound cue id | `run.stateSuspended` (เตือนเบา/priority 4, `vibration_ms [60,60,60]`) |
| reduced-motion | opacity fade 100 ms |

## `run.stateResumed`

| | |
| --- | --- |
| trigger | กลับเข้าเขตจากสถานะ Suspended (T8, flow F04 §6) |
| duration | 150 ms |
| easing | ease-out |
| frames | `translateY(8px)+opacity:0` → `translateY(0)+opacity:1` บน toast กลาง — รูปแบบเดียวกับ `run.tickGranted` ใน `tick-feedback.ts` แต่ registered แยก id (registry ห้าม id ซ้ำ) |
| sound cue id | `run.stateResumed` (ปกติ/priority 5, `vibration_ms [30]`) |
| reduced-motion | opacity fade 100 ms |

## `bannerExit` (shared helper, ไม่ใช่ registered effect)

`translateY(0)→-4px` + `opacity:1→0`, 150 ms, ease-in — ใช้ปิด `run.stateGrace`/`run.stateSuspended` เมื่อ state เปลี่ยน (caller เป็นคนตั้งเวลา ไม่ใช่โมดูลนี้ — ตรงกับ `exitToast` ของ `tick-feedback.ts`)

## กฎร่วม

Pill สถานะ run (`.run-state-pill`, components.md §13.2) เปลี่ยน glyph/สีตาม state โดยไม่มี motion กะพริบใดๆ (ตรงตามกฎ "ไม่มีการกะพริบระหว่างสถานะ") — โมดูลนี้ไม่แตะ pill โดยตรง มีแค่ banner/toast

## งบไฟล์

`dist/run-state/run-state.js` 2.54 KB + `timing.json` 1.85 KB = **4.39 KB** (เพดาน 20 KB ผ่าน)
