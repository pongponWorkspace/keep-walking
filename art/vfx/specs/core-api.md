# VFX core API — `art/vfx/core/`

Task: P2-F05-T05 · เจ้าของ: vfx-animator · สถานะ: ฉบับแรก · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/vfx/specs/motion-direction.md` §2, §10 (budget, engine choice, visibility/reduced-motion rules) · `docs/tech/asset-delivery.md` (การโหลด asset ฝั่ง client)

## 1. สรุปสำหรับ gameplay-programmer (P2-F05-T10)

`art/vfx/core/vfx.ts` เป็น engine กลาง ไม่มี dependency ภายนอก (D-001) มี API เดียวที่ต้องรู้:

```ts
import { play, registerEffect, cancelAll, activeCount } from '../../../art/vfx/core/vfx';
import '../../../art/vfx/rarity-reveal/rarity-reveal'; // side-effect import: registers 5 effects
import '../../../art/vfx/tick-feedback/tick-feedback';
import '../../../art/vfx/rift-reveal/rift-reveal';

const handle = play('drop.rarity.rare', iconElement); // Promise<void> & { cancel(): void }
await handle; // resolves when every animation in the effect has finished or been cancelled
handle.cancel(); // optional: stop early (e.g. player navigated away)
```

- `play(effectId, target)` คืนค่า Promise ที่ resolve เมื่อ animation ทุกตัวของ effect นั้นเล่นจบ **หรือ** ถูก cancel — ไม่ reject ในกรณี cancel (การ cancel เป็นผลปกติ ไม่ใช่ error)
- ไม่ต้อง import/เรียก visibility guard เอง: การ import `core/vfx` ครั้งเดียวผูก `visibilitychange` ให้อัตโนมัติ (ทุก effect ที่กำลังเล่นอยู่ถูก cancel ทันทีที่จอถูกซ่อน — motion-direction §2, §11 แถว 1)
- reduced-motion ตรวจอัตโนมัติใน `play()` เอง (จุดเดียว ไม่ต้องเช็คที่ผู้เรียก) — ทุก effect ที่ registered ในแพ็กเกจนี้มี `reducedMotion` variant ครบ
- `activeCount()` มีไว้สำหรับ demo/QA เท่านั้น (ดู `art/vfx/demo/visibility-and-reduced-motion.html`) ไม่ใช่ API ที่ client ควรพึ่งในเกมจริง

## 2. Import path สองเส้นทาง (สำคัญ)

| ผู้ใช้ | Import path | เหตุผล |
| --- | --- | --- |
| bundled app (`apps/client`, P2-F05-T10) | `.ts` source ตรง ๆ (เช่น `art/vfx/core/vfx.ts`) | bundler ที่ apps/client ใช้อยู่แล้ว (esbuild/Vite-based ผ่าน Vitest tooling เดียวกัน) resolve `.ts` และ extension-less/`.js`-suffixed relative import ที่ชี้ไปยัง `.ts` ได้เป็นมาตรฐานของ TypeScript+ESM สมัยใหม่ — ไม่ต้อง build step เพิ่มนอกเหนือจากที่ apps/client มีอยู่แล้ว |
| หน้า demo แบบไม่ใช้ bundler (`art/vfx/demo/*.html`) | ไฟล์ที่ compile แล้วใน `art/vfx/dist/**/*.js` | เบราว์เซอร์รัน `<script type="module">` ตรง ๆ ไม่ผ่าน build เอง ต้องมี `.js` จริงให้โหลด |

`art/vfx/dist/` **ไม่ใช่ source of truth** — เป็นผลลัพธ์ที่ generate จาก `.ts` ผ่าน:

```
pnpm exec tsc -p art/vfx/tsconfig.json
```

รันคำสั่งนี้ใหม่ทุกครั้งที่แก้ `.ts` ก่อนเปิด demo (ไม่มี watch mode ผูกไว้ ตั้งใจให้ง่ายและไม่เพิ่มปมกับ root build pipeline) `art/vfx/tsconfig.json` เป็นไฟล์ตั้งค่าเดี่ยว ไม่ผูกกับ root `tsconfig.json`/`pnpm build`/`pnpm typecheck` — จะเชื่อมเข้ากับ root pipeline จริงเป็นหน้าที่ของ P2-F05-T10 (integration)

`art/vfx/dist/**` อยู่นอกการ lint ของ root (`eslint.config.js` ignore `**/dist/**` อยู่แล้ว) เพราะเป็นไฟล์ที่ generate ไม่ใช่ source — ห้ามแก้ไฟล์ใน `dist/` มือ แก้ที่ `.ts` แล้ว compile ใหม่เสมอ

## 3. วินัยเรื่อง lint (`@typescript-eslint/no-magic-numbers`)

`eslint.config.js` (root, นอก `writes` ของ task นี้) บังคับ `no-magic-numbers` ทั้ง repo รวม `art/vfx/**/*.ts` (`detectObjects: false`, `enforceConst: true`, allowlist แค่ `[-1, 0, 1, 2, 100]`) กฎนี้ทำให้ตัวเลข timing/scale ที่โมดูลนี้ต้องใช้เยอะ (ms, scale factor, มุมองศา ฯลฯ) ชนกฎถ้าเขียนแบบตรงไปตรงมา — ทุกไฟล์ในแพ็กเกจนี้ตามรูปแบบเดียวกันเพื่อให้ผ่าน lint โดยไม่ต้องขอ override ที่ root:

1. **ทุกตัวเลขลอย (literal) เป็นชื่อ `const` เดี่ยวเสมอ** เช่น `const RARE_BEAT_1 = 45;` ไม่ใช่ `45` วางตรง ๆ ในนิพจน์ — `const NAME = <number>;` เดี่ยว ๆ เข้าเงื่อนไข `enforceConst` จึงไม่ถูกฟ้อง
2. **object literal property values ไม่ถูกฟ้อง** (`detectObjects: false`) — WAAPI keyframe object เช่น `{ offset: 0.6, transform: ... }` เขียนตัวเลขตรง ๆ ในตำแหน่ง property ได้เสมอ ไม่ต้องแยกเป็น const
3. **array literal ที่มีตัวเลขลอยเป็น element ถูกฟ้องเสมอ** แม้ตัว array เองถูก assign ด้วย `const` — จึงต้องสร้าง array จาก identifier ที่เป็น const ที่ประกาศแยกไว้แล้ว (`const arr = [BEAT_1, GAP_1, BEAT_2];`) ไม่ใช่ `[45, 70, 45]` ตรง ๆ
4. **template literal interpolation ของตัวเลขลอยถูกฟ้อง** (`` `scale(${1.05})` ``) — ต้อง interpolate ตัวแปร/identifier เท่านั้น (`` `scale(${peak})` ``)
5. **default parameter value ที่เป็นตัวเลขลอยถูกฟ้อง** (`{ durationMs = 80 }: Opts = {}`) — ฟังก์ชันในแพ็กเกจนี้จึงไม่มี default numeric parameter เลย ผู้เรียกต้องส่ง object literal มาครบเสมอ (ซึ่งตัวเลขใน object literal ไม่ถูกฟ้องตามข้อ 2 อยู่แล้ว)

ตรวจได้ด้วย `pnpm exec eslint art/vfx --max-warnings=0` (ต้องว่าง 0 ปัญหาเสมอก่อนส่งงาน)

## 4. งบไฟล์ (motion-direction §2: ≤20 KB ต่อ effect module ก่อน gzip)

วัดจาก `art/vfx/dist/**` (สิ่งที่หน้า demo โหลดจริง ไม่รวม comment เพราะ `art/vfx/tsconfig.json` ตั้ง `removeComments: true`) รวม CSS/JSON ประกบของแต่ละกลุ่ม — ตัวเลขเต็มอยู่ในหัวข้อ REPORT ของ task นี้ สรุปสั้น:

| กลุ่ม | JS (`dist/`) | CSS | JSON (`timing.json`) | รวม | งบ |
| --- | --- | --- | --- | --- | --- |
| core (ใช้ร่วมทุกกลุ่ม โหลดครั้งเดียว) | ~3.9 KB | — | — | ~3.9 KB | ไม่นับเป็น "effect module" — เป็น engine กลาง |
| tick-feedback | ~3.6 KB | — | ~1.6 KB | ~5.2 KB | ≤20 KB ผ่าน |
| rarity-reveal (5 tier รวมกัน) | ~11.1 KB | ~1.6 KB | ~2.8 KB | ~15.6 KB | ≤20 KB ผ่าน |
| rift-reveal | ~1.0 KB | — | ~0.6 KB | ~1.6 KB | ≤20 KB ผ่าน |

ไม่มี asset ภาพ raster ในแพ็กเกจนี้ (motion-direction §2: "ไม่มี asset ภาพ raster สำหรับ motion") — decoration ทุกชิ้น (มุม, ดาว, shard) เป็น element ที่สร้างด้วย `document.createElement`/CSS `clip-path` ล้วน

