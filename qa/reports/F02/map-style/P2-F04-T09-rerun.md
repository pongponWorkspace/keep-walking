# P2-F04-T09 — QA carry-over re-verification (map style, e2e, bugs.md)

| หัวข้อ | ค่า |
| --- | --- |
| task | P2-F04-T09 · เจ้าของ: qa-tester · วันที่ 2026-09-27 |
| ผู้ตรวจ | qa-tester |
| อ้างอิง | `studio/phases/phase-2/board.md` #### P2-F04-T09 detail block, `qa/reports/F02/map-style/P1-H06-screenshot-tests.md` (baseline), `art/direction/map-style.md` §6.1/6.2/10.1, `qa/bugs.md` |
| verdict | ทุกข้อใน detail block มีหลักฐาน (ดูหัวข้อ 8) — พบ 1 ข้อที่ตรวจได้ไม่ครบเพราะข้อจำกัดของ fixture (หัวข้อ 5), ส่งต่อ location-engineer |

## 0. บริบทสำคัญ: build มาจาก HEAD สะอาด ไม่ใช่ working tree ตอนนี้

ระหว่างงานนี้ `apps/client/`, `packages/shared/src/session/`, และ `packages/shared/src/hp/` (ใหม่) มีการแก้ไขที่ยังไม่ commit อยู่พร้อมกัน (เห็นจาก `git status`) — เป็นงานของ P2-F04-T21 (gameplay-programmer, client) และงานฝั่ง backend ที่กำลังขยาย `SessionConfig` (F06 HP/damage) ที่ทำงานคู่ขนานในเวลาเดียวกับงานนี้ ไม่ใช่งานของ QA และไม่อยู่ใน `writes` ของงานนี้

ตามคำแนะนำในบริบทงาน ("ถ้า running app is mid-change ให้ capture จาก clean build ของ HEAD แล้วบอก"): ใช้ `git worktree add --detach /tmp/kw-snapshots/head-8649d7e 8649d7e` (commit HEAD ของ repo ตอนเริ่มงานนี้ "P2-C09: apply human-approved GDD wording (D-084)") แทนการแก้ working tree จริง — ไม่ใช้ `git stash` ตามที่สั่งไว้ในโจทย์ — ติดตั้ง dependency ด้วย `pnpm install --frozen-lockfile` (เร็ว เพราะใช้ content-addressable store เดียวกัน ไม่ดาวน์โหลดใหม่) แล้ว `pnpm --filter @keep-walking/client build && pnpm --filter @keep-walking/client preview --port 4174` บน snapshot นี้ทั้งหมด สคริปต์ถ่ายภาพ (`capture-screenshots.spec.ts`, อยู่ใน `writes` ของงานนี้) ถูกแก้ในต้นทาง repo หลักตามปกติแล้วคัดลอกเข้า snapshot เพื่อรันเท่านั้น — ไฟล์ที่ commit จริงคือไฟล์ในต้นทางหลัก

ผลคือภาพ S1/S3/S6 ในรายงานนี้มาจาก build ของโค้ดที่ commit แล้วจริง (`kw-light.style.json`, `dungeons-source.ts` หลัง P1-X32/X33) ไม่ปนกับงานที่ยังทำไม่เสร็จของ agent อื่น

## 1. e2e ถาวร TC-MAP-05, TC-MAP-08

ไฟล์ใหม่: `qa/tests/e2e/f02-map-network-resilience.spec.ts` (สร้างใน `writes: qa/tests/e2e/` — ก่อนหน้านี้มีแค่ `qa/tests/e2e/f02-map-fixture-tile.spec.ts` ซึ่งไม่ครอบ TC-MAP-05/08)

- **TC-MAP-05** (เน็ตหลุดกลาง pan): jump กล้องไปสวนลุมพินีใน fixture จริงจน tile ถูกขอ (`served.length > 0`) → `context.setOffline(true)` → `panBy` → รอ 1 วิ → ยืนยัน canvas ยังอยู่ ไม่มี `pageerror`, ตำแหน่งจาก Mock ยังขยับต่อ (timestamp ใหม่กว่าเดิม) แม้ตอน offline → `context.setOffline(false)` → `panBy` อีกครั้ง → ยืนยัน basemap ยัง render features ได้ (`queryRenderedFeatures` > 0) — ไม่ยึดจำนวน HTTP request ใหม่เป็นเกณฑ์ (อธิบายเหตุผลในคอมเมนต์โค้ด: fixture มี tile เดียวที่ maplibre/pmtiles cache ไว้ในหน่วยความจำ pan เล็ก ๆ ในพื้นที่เดิมจึงไม่จำเป็นต้องขอใหม่จริง — พิสูจน์ "ไม่ค้าง/ใช้งานต่อได้" แทน)
- **TC-MAP-08** (tile นอกชุด): jump ไปพิกัดนอก bbox ของ fixture (ทุก tile request ตกไปที่ 404 branch ของ route handler) พร้อม listener `map.on('error', ...)` และ `pageerror`/`console error` → ยืนยันไม่มี `pageerror`, ไม่มี `Uncaught`/`TypeError`/`ReferenceError` ใน console, canvas ยังใช้งานได้หลังจากนั้น

ผลรัน (`E2E_BASE_URL=http://localhost:4173 npx playwright test qa/tests/e2e/f02-map-network-resilience.spec.ts`):

```
4 passed (4.7s)
  [android-chrome] TC-MAP-08 ... (4.1s)
  [android-chrome] TC-MAP-05 ... (4.1s)
  [ios-safari] TC-MAP-05 ... (2.2s)
  [ios-safari] TC-MAP-08 ... (2.9s)
```

ทั้งสอง project (android-chrome, ios-safari) ผ่านทั้งคู่ — 4/4 test, 2 project × 2 case

## 2. ios-safari flake ของ `apps/client/e2e/map-shell.spec.ts` (~40%, blob: URL host '')

บริบท (context ของงานนี้): fix อยู่ที่ P2-F04-T10 — `map-shell.spec.ts`'s "only local requests" assertion ข้าม `blob:` URL (worker script ของ maplibre-gl หลัง code-split) แล้ว เพราะ `new URL('blob:...').host` เป็น `''` เสมอ

รันซ้ำ 5 ครั้งอิสระ (`E2E_BASE_URL=http://localhost:4173 npx playwright test apps/client/e2e/map-shell.spec.ts --project=ios-safari`):

| ครั้งที่ | ผล |
| --- | --- |
| 1 | 4 passed (1.3s) |
| 2 | 4 passed (1.3s) |
| 3 | 4 passed (1.2s) |
| 4 | 4 passed (1.2s) |
| 5 | 4 passed (1.2s) |

5/5 เขียว — ปิดรายการนี้ (ดูหัวข้อ 9, `qa/bugs.md` ไม่ต้องเปิดบั๊กใหม่เพราะไม่พบ flake ซ้ำเลย)

## 3. `contrast.test.ts` regex ramp — นับ 22 ตาม brief หรือ 23 จริง

Brief ของงานนี้บอกว่า "regex ramp ใน contrast.test.ts นับ 22" แต่ context ของงานบอกให้ตรวจกับ `art/direction/style-guide.md` แทนเลข 22 เพราะ P2-X01 (งานก่อนหน้า) ขยาย regex ไปแล้ว

ตรวจ: `art/direction/style-guide.md` §3.4 มี 11 แถว `ramp.*` (asphalt, concrete, foliage, water, cone, plastic, rift, heat, wood, metal, **tonic**) และ §3.4.1 มี 12 แถว (skin-1..6, hair-1..6) รวม **23 แถว** — parse ด้วย regex เดียวกับใน `contrast.test.ts` ตรง ๆ (สคริปต์ Python คำนวณคู่ขนานอิสระ) ได้ 23 แถวเช่นกัน ตรงกับ assertion ปัจจุบันในไฟล์ (`expect(rampRows.length).toBe(23)`, บรรทัด comment ระบุ "10 -> 23 in P2-X01")

**สรุป: ตัวเลขที่ถูกต้องคือ 23 (11 material ramp + 12 skin/hair) ไม่ใช่ 22 ตามที่ brief เขียนไว้ (brief คงเป็นเลขเก่าก่อน P2-X01) — โค้ดปัจจุบันถูกต้องแล้ว ไม่ต้องแก้อะไรเพิ่ม** ยืนยันด้วย `npx vitest run qa/tests/unit/contrast.test.ts` → ผ่านทั้งไฟล์ (ดูหัวข้อ 6 สำหรับผลรันเต็ม)

## 4. Static check ใน `map-style.test.ts`: ไม่มี symbol layer บน `kw-dungeons`

เพิ่ม 2 test ใหม่ใน `qa/tests/unit/map-style.test.ts` (P1-X32 เคย handoff รายการนี้มาไว้ที่งานนี้):

1. `every layer with source "kw-dungeons" is a fill or line layer, never a symbol layer` — วนทุก layer ใน `kw-light.style.json` ที่ `source === 'kw-dungeons'` แล้วยืนยัน `type !== 'symbol'`
2. `every dungeon symbol layer (name/count/sponsored/crack) reads kw-dungeon-labels instead` — ยืนยันว่า `kw-rift-crack`/`kw-rift-name`/`kw-rift-count`/`kw-rift-sponsored` ทั้ง 4 ตัวมีอยู่จริง เป็น `type: 'symbol'` ทุกตัว และ `source === 'kw-dungeon-labels'` ทุกตัว

ผลรัน: `npx vitest run qa/tests/unit/map-style.test.ts` → `Test Files 1 passed`, `Tests 4 passed` (2 เดิม + 2 ใหม่) — regression ถาวรกันบั๊ก P1-H06 กลับมาเกิดซ้ำ (ดูหัวข้อ 7)

นับ layer `kw-rift-sponsored` / `kw-rift-crack` ใน `kw-light.style.json` ตามที่ brief ขอ: parse JSON ตรง ๆ ด้วย `layers.filter(l => l.id === 'kw-rift-sponsored').length` และเช่นเดียวกันกับ `kw-rift-crack` → **1 layer ต่อ id** (ไม่ซ้ำ) — ตรงกับสไตล์หลัง P1-X32 ที่แยก symbol ออกจาก per-tile duplication แล้ว (นี่คือจำนวน *layer definition* ใน style JSON ซึ่งควรมี 1 เสมอไม่ว่าจะมี dungeon กี่แห่ง — จำนวน *feature ที่ render ซ้ำ* ต่อ dungeon ถูกตรวจแยกในหัวข้อ 5 ด้วยสคริปต์ที่เรียก `queryRenderedFeatures`)

## 5. ถ่าย S1/S3 ใหม่ + S6 (สมุทรปราการ, D-060)

แก้ `qa/reports/F02/map-style/capture-screenshots.spec.ts` (อยู่ใน `writes` ของงานนี้) สองจุด:

1. **เพิ่ม `S6-z10`/`S6-z13`** (center `[100.6, 13.5]`, zoom 10 และ 13 ตาม map-style.md 10.1 ตาราง) เข้า `SCREENS` + ตัวกรอง `SCREENS_FILTER` (env var) ให้เลือกถ่ายเฉพาะ S1/S3/S6 ได้โดยไม่กระทบ S2/S4/S5 ที่ยังไม่มีอะไรเปลี่ยน
2. **แก้บั๊กของสคริปต์เอง**: เดิม `loadDungeonSamples` ป้อนข้อมูลเข้า source `kw-dungeons` (polygon) เพียงแหล่งเดียว — ถูกต้องตอน P1-H06 (ก่อน P1-X32) แต่หลัง P1-X32/X33 แยก symbol layer ไปอ่าน `kw-dungeon-labels` แล้ว การป้อนแค่ `kw-dungeons` ทำให้ **ไม่มีป้าย/ไอคอนรอยแยกขึ้นเลย** (ตรวจพบตอนรันครั้งแรก: `thaiLabels` ของ S1 ไม่มีชื่อ dungeon ตัวอย่างปนอยู่เลย) แก้โดยป้อนทั้งสอง source (`kw-dungeons` จาก `dungeons.sample.geojson`, `kw-dungeon-labels` จาก `dungeon-labels.sample.geojson` ที่มีอยู่แล้วในโฟลเดอร์ `samples/` ตั้งแต่ P1-X32) — ไม่ใช่ bug ของสไตล์ JSON หรือ dungeon labels ฝั่งจริง เป็นแค่ script เก่าที่ยังไม่อัปเดตตามสัญญาใหม่

รันด้วย `E2E_BASE_URL=http://localhost:4174 SCREENS_FILTER=S1,S3,S6-z10,S6-z13 pnpm exec tsx qa/reports/F02/map-style/capture-screenshots.spec.ts` บน clean snapshot (หัวข้อ 0) → **32 ภาพใหม่** (S1, S3, S6-z10, S6-z13 × 2 viewport × 2 format × 2 engine), `externalRequests=0`

### 5.1 S1 (สวนลุมพินี) — ยืนยันบั๊ก P1-H06 หายจริง

สคริปต์ยืนยันอิสระ (`queryRenderedFeatures` ต่อ layer ที่ z16 หลังป้อน sample ทั้งสอง source): `kw-rift-name` → feature เดียว (`sample-open-01`), `kw-rift-count` → 1, `kw-rift-crack` → 1, `kw-rift-sponsored` → 0 (ถูกต้อง เพราะ `sample-open-01` ไม่ใช่ sponsored) — **ไม่มีป้าย/ไอคอนซ้ำ** ตรวจด้วยตาจากภาพ `screenshots/android-chrome--pmtiles--S1--390x844.jpg` เห็นไอคอนรอยแยก 1 ชุด ชื่อ 1 ป้าย จำนวนคน 1 ป้าย ตรงข้อมูล sample เป๊ะ (เทียบกับ baseline เดิมที่เห็น 4 ชุดกระจาย 4 มุม — ดู `qa/bugs.md` BUG-P1-H06)

### 5.2 S3 (สวนจตุจักร) — ป้าย sponsored ไม่ซ้ำ

`screenshots/android-chrome--pmtiles--S3--390x844.jpg`: เห็นชื่อ "ตัวอย่าง: สวนที่มีผู้สนับสนุน" 1 ชุด, จำนวนคน "3 คน · T1 R1 S1 M0" 1 ชุด, ป้าย sponsored "ได้รับการสนับสนุน" (ตัวครีมบนแถบดำ `ink.900`/`bg.paper` ตามกฎ 9.2 ไม่ใช้สี rift/rarity) 1 ชุด — ไม่ซ้ำ พื้นหลังนอก polygon เป็นสีดำเพราะ fixture ลุมพินีไม่ครอบพิกัดจตุจักร (ข้อจำกัดเดิมที่ระบุไว้แล้วใน `P1-H06-screenshot-tests.md` หัวข้อ 0 สำหรับ S2/S5 — ไม่ใช่ปัญหาใหม่ ไม่กระทบเกณฑ์ผ่านของ S3 เพราะ overlay GeoJSON ไม่ผูกกับ bbox ของ tile)

### 5.3 S6 (ชายฝั่งสมุทรปราการ) — ตรวจได้บางส่วน, handoff ถึง location-engineer

`screenshots/android-chrome--pmtiles--S6-z10--390x844.jpg`: มุมซ้ายบนเป็นแผ่นดิน (จากไทล์ fixture ลุมพินีที่บังเอิญอยู่ในกรอบเดียวกันตอน z10) เห็นเส้นประจังหวัด (ฐาน `ink.900` + ประ `map.province-border`) **ทับขอบโซนดำพอดี ไม่มีร่องสว่าง/ร่องดำคั่น** และป้ายชื่อ "สมุทรปราการ" อ่านออก — ผ่านเกณฑ์ย่อยนี้

**ส่วนที่ตรวจไม่ได้ครบ**: เกณฑ์หลักของ S6 คือ "ทะเลในเขตจังหวัดเป็น `map.water` ... ไม่มีขอบหรือแถบดำกลางทะเล" — ที่พิกัด `[100.6, 13.5]` (z10 และ z13) พื้นที่ส่วนใหญ่ในภาพเป็นสีดำล้วนไม่มี `map.water` ให้เห็นเลย ตรวจสาเหตุด้วยการรัน point-in-polygon กับ hole จริงของ `data/map/playarea-mask.geojson` (ring ที่สองของ polygon, 1,106 จุด) แบบ ray-casting อิสระ:

```
point-in-hole (100.6, 13.5): True
```

→ **ข้อมูล mask ถูกต้อง**: จุดนี้อยู่ในรู (เขตเล่นได้) จริง ไม่ใช่ถูกโซนดำปิดทับ สีดำที่เห็นเป็นผลจาก **`background` ของสไตล์เอง** (map-style.md §8: "background เป็น `map.zone-black` ส่วนนอก bbox ของ tile จึงดำเองโดยไม่ต้องมีข้อมูล") ที่แสดงตรงทุกพื้นที่นอก bbox ของ fixture ลุมพินี ไม่ว่าจะอยู่ในรูของ mask หรือไม่ — เพราะไม่มี vector tile จริงที่ครอบชายฝั่งสมุทรปราการให้วาด `map.water` ทับ เป็น**ข้อจำกัดของ fixture อย่างเดียวกับที่เคยพบใน S2/S5** (`P1-H06-screenshot-tests.md` หัวข้อ 0, ถูก handoff ไปแล้วเป็น P2-F04-T23) ไม่ใช่บั๊กใหม่ของ mask/style

**handoff (ไม่ใช่บั๊กใหม่ ไม่ blocking)**: ส่งต่อ location-engineer ให้พิจารณาเพิ่ม fixture tile ที่ครอบชายฝั่งสมุทรปราการ (หรือยืนยันด้วยวิธีอื่น) เพื่อให้ตรวจเกณฑ์ "ทะเล = `map.water`, ไม่มีขอบดำกลางทะเล" ของ S6 ได้ครบจริงด้วยภาพ ไม่ใช่แค่ด้วยการคำนวณ point-in-polygon แยกต่างหาก — ผูกกับ handoff เดิมของ S2/S5 ใน P2-F04-T23 (เพิ่มขอบเขตให้ครอบ S6 ด้วย)

### 5.4 ผลรวม `results.json`

`qa/reports/F02/map-style/results.json` ตอนนี้มี 56 รายการ = S2/S4/S5 เดิม (24, ไม่แตะ) + S1/S3/S6-z10/S6-z13 ใหม่ (32) รวม `screenshots/` 56 ไฟล์ (`du -sh` ≈ 4.6 MB) — ไฟล์เดิมของ S2/S4/S5 ไม่ถูกลบหรือเขียนทับ

## 6. D-112 (`zoneLevel`/`soloTickExp`) — ปิด BUG-P2-001 พร้อมหลักฐาน

รายละเอียดเต็มอยู่ใน `qa/bugs.md` BUG-P2-001 สรุปที่นี่:

- P2-F04-T19 (งานก่อนหน้า) พบ root `pnpm test` แดง 20 case ใน `packages/shared/src/formulas/vectors.test.ts` (`damage.json` fn=zoneLevel 10, `tick-reward.json` fn=soloTickExp 10) จาก D-112 (`combat.zoneLevelFrom` ยังไม่ clamp เลเวลผู้เล่นเข้าช่วงโซน) — บันทึกไว้ใน `qa/plans/F04-test-plan.md`/`F05-test-plan.md` เป็น "F04-F1" แต่ไม่ได้ลงใน `qa/bugs.md` เพราะไฟล์นั้นไม่อยู่ใน `writes` ของงานนั้น
- P2-X09 (systems-designer) + P2-X10 (backend-programmer) แก้แล้วตาม D-112: `combat.zoneLevelFrom = "playerLevelClampedToRange"`, `packages/shared/src/formulas/` คำนวณ `zoneLevel(playerLevel, min, max)` เป็น clamp จริง พร้อม fail-closed guard
- ตรวจซ้ำอิสระวันนี้: `npx vitest run packages/shared/src/formulas/vectors.test.ts` → **`Test Files 1 passed`, `Tests 380 passed`** (รวมทุก case ของ `zoneLevel`/`soloTickExp`) — เขียวทุกครั้งที่รันตลอดงานนี้ (รันซ้ำ ≥3 ครั้งในเวลาต่างกัน ผลเหมือนเดิมทุกครั้ง)
- ยืนยันรอบสุดท้าย (ช่วงท้ายงานนี้): งานคู่ขนานอื่น (นอก `writes` ของงานนี้) เริ่มแก้ `packages/shared/src/formulas/vectors.test.ts` เองเพื่อเพิ่ม vector ของ HP/damage ทำให้รันทั้งไฟล์เจอ error ใหม่ "does not know how to evaluate fn=..." ที่ไม่เกี่ยวกับ zoneLevel/soloTickExp — กรองด้วยชื่อเทสต์ตรง ๆ เพื่อตัดผลกระทบจากไฟล์ที่ยังแก้ไม่เสร็จ: `npx vitest run packages/shared/src/formulas/vectors.test.ts -t "zoneLevel"` → **10 passed**, `-t "soloTickExp"` → **13 passed** — ทั้งสองยังเขียว 100% ไม่ถูกกระทบ
- ต้นงาน (ก่อน apps/client และ packages/shared/src/session ถูกแก้พร้อมกันโดยงานคู่ขนานอื่น): `pnpm test` เต็ม → **`Test Files 140 passed (140)`, `Tests 2217 passed | 2 skipped (2219)`** — เขียวสนิททั้ง repo ครั้งเดียวในงานนี้ที่จับภาพได้ก่อนมีการแก้ไขคู่ขนาน

**บันทึกสำคัญ (ไม่ใช่ของบั๊กนี้)**: ระหว่างงานนี้ `apps/client/`, `packages/shared/src/session/*`, และ `packages/shared/src/hp/` (ใหม่) ถูกแก้ไขสด ๆ อยู่พร้อมกันโดย task อื่น (ดูหัวข้อ 0) ทำให้ `pnpm test` เต็มกลับมาแดงเป็นช่วง ๆ ที่ `packages/shared/src/session/reducer.test.ts` ด้วยสาเหตุไม่เกี่ยวกับ zoneLevel/soloTickExp เลย (fixture `SessionConfig` ในเทสต์ยังตามโครงสร้าง `SessionConfig` ใหม่ไม่ทัน ระหว่างการรีแฟกเตอร์ยังไม่เสร็จ) — รันซ้ำหลายรอบเห็นจำนวนที่แดงขึ้น ๆ ลง ๆ (29 → 31 → 3 → 63) ตามจังหวะที่อีก task แก้ไฟล์ ยืนยันว่าไม่ใช่ regression ที่เกี่ยวกับ D-112 หรือกับงานของ QA เอง — ไม่อยู่ใน `writes` ของ P2-F04-T09 จึงไม่แตะ ให้ backend-programmer/tech-lead ปิดงานของตัวเองแล้วรัน `pnpm test` ยืนยันเขียวอีกครั้งตอน merge (ระบุใน handoff หัวข้อ 9)

## 7. `qa/bugs.md` — สรุปการแก้ไข

1. **BUG-P1-H06** (severity high, ใหม่ในไฟล์นี้แต่ย้อนหลังไปตอนพบจริง 2026-09-24): ป้าย/ไอคอนรอยแยกซ้ำหลายชุดต่อ 1 dungeon — ปิดแล้วด้วย P1-X32 (แยก source `kw-dungeon-labels`) + P1-X33 (client ป้อน source ใหม่) ตรวจซ้ำอิสระวันนี้ทั้งด้วย static check (หัวข้อ 4) และภาพจริง (หัวข้อ 5.1)
2. **BUG-P2-001** (severity medium, ใหม่): D-112 zoneLevel/soloTickExp vector — ปิดแล้วด้วย P2-X09 + P2-X10 ตรวจซ้ำอิสระวันนี้ (หัวข้อ 6)
3. **BUG-F01-001, BUG-F01-002**: ตรวจแล้วว่า**ปิดอยู่ก่อนแล้ว** พร้อมหลักฐาน P1-X29 (ปิดจริงตั้งแต่ P1-CLOSE-QA, 2026-09-24) — ไม่มีอะไรต้องแก้เพิ่ม สอดคล้องกับที่ acceptance ของงานนี้ขอให้ "ปิดพร้อมหลักฐาน P1-X29" (มีอยู่แล้ว ไม่ใช่ปิดใหม่)
4. อัปเดตบรรทัดสถานะรวมด้านบนไฟล์ให้สะท้อนการเพิ่ม 2 รายการย้อนหลัง — **ไม่มี bug OPEN เหลือในไฟล์**

## 8. Acceptance checklist (จาก board detail block)

- [x] `qa/bugs.md`: บั๊ก high ของ P1-H06 บันทึกย้อนหลัง — หัวข้อ 7.1 (ดู `qa/bugs.md` BUG-P1-H06)
- [x] BUG-F01-001/002 ปิดพร้อมหลักฐาน P1-X29 — ตรวจแล้วว่าปิดอยู่ก่อนหน้านี้แล้ว หัวข้อ 7.3
- [x] e2e ถาวร TC-MAP-05 (เน็ตหลุดกลาง pan) — หัวข้อ 1, `qa/tests/e2e/f02-map-network-resilience.spec.ts`
- [x] e2e ถาวร TC-MAP-08 (tile นอกชุด) — หัวข้อ 1, ไฟล์เดียวกัน
- [x] นับ layer `kw-rift-sponsored`/`kw-rift-crack` — หัวข้อ 4 (1 layer ต่อ id ใน style JSON) + หัวข้อ 5.1 (1 feature ต่อ dungeon ตอน render)
- [x] `contrast.test.ts` regex ramp นับ 23 (ไม่ใช่ 22 ตาม brief เก่า) — หัวข้อ 3, ยืนยันกับ style-guide.md ตรง ๆ
- [x] `map-style.test.ts` static check ไม่มี symbol layer บน `kw-dungeons` — หัวข้อ 4, เพิ่ม 2 test ใหม่
- [x] ถ่าย S1/S3 ใหม่ — หัวข้อ 5.1, 5.2
- [x] ถ่าย S6 (ชายฝั่งสมุทรปราการ, z10/z13) — หัวข้อ 5.3 (ตรวจได้บางส่วน + handoff location-engineer สำหรับส่วนที่ fixture ไม่ครอบ)
- [x] handoff location-engineer ถ้าพบขอบดำกลางทะเล — หัวข้อ 5.3

## 9. Verdict และ handoffs

**Verdict: PASS** — ทุกข้อใน detail block มีหลักฐาน ไม่มีบั๊ก severity high ใหม่ที่ยังเปิดอยู่ (บั๊ก high ที่พบคือของเก่าที่ปิดไปแล้วตั้งแต่ Phase 1 และยืนยันซ้ำวันนี้) ส่วนข้อจำกัดของ fixture ที่ S6 เป็น handoff ไม่ใช่ blocker (มีทางตรวจแทนด้วย point-in-polygon จนกว่าจะมี fixture ใหม่)

handoffs:
- ถึง location-engineer: ขยาย fixture ให้ครอบชายฝั่งสมุทรปราการ (ผูกกับ P2-F04-T23 ที่มี S2/S5 อยู่แล้ว) เพื่อให้ตรวจ "ทะเล = map.water ไม่มีขอบดำ" ของ S6 ได้ด้วยภาพจริง — ไม่ blocking (mask data ยืนยันถูกต้องแล้วด้วย point-in-polygon)
- ถึง backend-programmer/tech-lead: `pnpm test` เต็มกำลังแดงเป็นช่วง ๆ จากงานคู่ขนานที่ยังทำ `packages/shared/src/session/*` ไม่เสร็จ (ไม่เกี่ยวกับ D-112) — ให้รัน `pnpm test` ยืนยันเขียวอีกครั้งก่อน merge/commit จริง — ไม่ blocking งานนี้ (ไม่ใช่ regression ของ QA หรือของ D-112)
