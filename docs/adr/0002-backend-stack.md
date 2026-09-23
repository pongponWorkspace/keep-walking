# ADR 0002 — Backend stack: Cloudflare แผน Free (Workers + Durable Objects SQLite + D1 + Pages)

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | Accepted (ยืนยัน D-008 · ไม่ใช่การเลือก stack ใหม่) |
| วันที่ | 2026-09-23 |
| task | P1-F02-T02 |
| ผู้เขียน / authority | tech-lead (architecture) · การผูก vendor ตัดสินแล้วโดย D-008 (HUMAN มอบให้ orchestrator) · **ทุกขั้นที่มีค่าใช้จ่ายเป็น decision ของ HUMAN แยก** |
| decision ที่อ้าง | D-001 (ต้นทุนศูนย์ ห้ามผูกบัตร), D-008 (stack Cloudflare Free), D-031 (tile บน Pages เป็น XYZ + TileJSON) |
| ADR ที่เกี่ยวข้อง | ADR 0001 (layout: ยืนยันชื่อ `apps/api` ในหัวข้อ 6.4) · tech note `docs/tech/F02-map-location-spike.md` หัวข้อ 7 (host ของ tile) |
| GDD ที่อ้าง | "สถาปัตยกรรมเทคนิค > โครงสร้างระบบ", "Data model หลัก", "สัญญาณขาดและแอปถูกปิด", "Raid Boss > ข้อควรระวังเชิงเทคนิค", "แผนงาน" M2, M3, M6 |

## 0. สรุป

- stack backend = **Cloudflare แผน Workers Free ไม่ผูกบัตร**: API Worker (REST) + Durable Objects แบบ SQLite-backed (DO ต่อ geohash-5 และ DO ของ raid) + D1 (ข้อมูลถาวร) + Pages (client และ tile แบบ XYZ static ตาม D-031) · ทุกชิ้นใช้ได้บนแผน Free ตามเอกสาร Cloudflare ที่ตรวจ 2026-09-23 ไม่มีชิ้นใดที่ stack ต้องใช้แล้วต้องผูกบัตร (R2 ต้องผูก แต่ไม่ใช่ชิ้นที่ต้องใช้ตอนนี้)
- เพดานที่ชนก่อนคือ **rows written 100,000/วัน** ของ DO storage (และ D1 แยกอีกก้อน) → ความจุราว **650 ผู้เล่น-ชั่วโมงต่อวัน** ตามโมเดลในหัวข้อ 5 · Phase 2 ใช้ 0% ของ Workers (static ล้วน) · Phase 3 (5–20 คน) ใช้ไม่เกินราว 12%
- ที่ 1,000 DAU อยู่ที่ขอบหรือเกิน free tier · ที่ 5,000 คน และ raid วันเสาร์ **ไม่อยู่ใน free tier แน่นอน** (เกิน 3–15 เท่า) → ต้องขออนุมัติ Workers Paid ก่อน closed beta หรือก่อนทดสอบ raid ขนาดจริง ค่าประมาณราว 5–10 USD/เดือน (ราคา ณ 2026-09-23 เป็นข้อมูลประกอบเท่านั้น)
- ทางขยาย = อัปเกรดเป็น Workers Paid ในบัญชีเดิม (และเปิด R2 เมื่อจำเป็น) ไม่ย้าย vendor ไม่แตะโค้ด client
- Supabase Free (Postgres + PostGIS) พิจารณาแล้ว **ไม่เลือก** (หัวข้อ 2.2)
- Phase 1–2 **ไม่ต้องรอ backend** (client-first) · ไม่มีงาน HUMAN ยืนยัน stack อีก (P1-F02-T22 CUT ตาม D-008) · งาน HUMAN ที่เหลือคือสมัครบัญชี Cloudflare Free ไม่ผูกบัตร (P1-F02-T17) ซึ่งมีบน board อยู่แล้ว

## 1. บริบท

- GDD ออกแบบ backend ไว้บน Cloudflare: API Worker สำหรับ auth, claim, inventory · Durable Object ต่อ geohash-5 (ราว 5 กม.) สำหรับ realtime และ party sync พร้อม WebSocket hibernation · DO ตัวเดียวถือ HP ของ raid · PMTiles บน R2 · GDD ระบุ Supabase + PostGIS เป็นทางเลือกที่ validate เร็วกว่าแต่ต้นทุนโตตาม connection
- D-001: ต้นทุนเป็นศูนย์ ห้ามผูกบัตรกับบริการใด (รวม R2)
- D-008: HUMAN มอบให้ตัดสินตามหลัก "ฟรีและ scale ง่ายที่สุด" → Cloudflare Free ทั้งชุด · ADR นี้ต้องยืนยันเพดานด้วยแหล่งจริง และถ้าพบว่าทำฟรีไม่ได้ให้ถามคน
- D-031: Cloudflare Pages ตอบ HTTP range request ด้วย `200` จึง publish tile เป็นไดเรกทอรี XYZ + TileJSON แทน PMTiles
- หลักห้ามละเมิด: server-authoritative (client ส่งแค่ตำแหน่ง + timestamp), batch tick ที่ client ส่งทุก 1 นาที, ค่า balance อยู่ใน config, `position_log` TTL 24 ชม.
- roadmap: Phase 2 เป็น client-first (logic ร่วมใน `packages/shared`) · backend จริงเริ่ม Phase 3 (F07 account, F08 run/inventory, F09 party) · raid อยู่ Phase 6 (M6) เป้า 5,000 คน

## 2. ทางเลือกที่พิจารณา

### 2.1 เทียบสองทาง (แผนฟรีที่ไม่ใช้บัตรเท่านั้น ตาม D-001)

| เกณฑ์ | Cloudflare Free (Workers + DO SQLite + D1 + Pages) | Supabase Free (Postgres + PostGIS + Realtime + Edge Functions) |
| --- | --- | --- |
| ต้นทุนตอนนี้ | 0 · ไม่ผูกบัตร | 0 · ไม่ผูกบัตร |
| หยุดเมื่อไม่มีคนใช้ | ไม่หยุด · scale-to-zero ไม่มีการ pause | **project ถูก pause หลังไม่มีการใช้งาน 1 สัปดาห์** · มีได้ 2 active project |
| โมเดล realtime | DO = วัตถุ stateful ที่รันโค้ดของเราเอง ถือ state ต่อ dungeon/cell และ HP ของ raid ได้ตรงกับ GDD · WebSocket hibernation ไม่คิด duration ระหว่างเงียบ | Realtime = pub/sub ต่อ channel (Broadcast, Presence, Postgres Changes) ไม่มีที่รัน logic แบบ authoritative ต่อ channel ต้องวนผ่าน Edge Function + DB ทุก tick |
| realtime บนแผนฟรี | DO 100,000 request/วัน (WebSocket ขาออกไม่คิด) | 200 concurrent peak connections · 2 ล้านข้อความ/เดือน |
| geo query | ไม่มี PostGIS · ใช้ bbox + geohash index ใน SQL และ geometry แบบ pure TS (หัวข้อ 6.3) | PostGIS เต็ม (ข้อได้เปรียบจริง) |
| ขนาด DB ฟรี | D1 500 MB/DB, 10 DB, รวม 5 GB · DO storage รวม 5 GB | 500 MB |
| ทางขยาย | Workers Paid ในบัญชีเดิม (ขั้นต่ำ 5 USD/เดือน) · R2 บัญชีเดิม | Pro 25 USD/เดือนต่อ project · แต่ DO/R2 ตาม GDD ยังต้องไป Cloudflare อยู่ดี |
| tile และ client | Pages บัญชีเดียวกัน (D-031) | ต้องใช้ host อื่นอยู่ดี → สอง vendor |
| ความเร็วในการ validate | เขียนเองมากกว่า (auth, schema, migration) | มี auth, RLS, dashboard ในกล่อง |

### 2.2 เหตุผลที่ไม่เลือก Supabase Free

1. **ถูก pause เมื่อไม่มีการใช้งาน 1 สัปดาห์** (แหล่ง: `https://supabase.com/pricing` ตรวจ 2026-09-23 "Free projects are paused after 1 week of inactivity. Limit of 2 active projects.") · ผลต่อเรา: Phase 2 เป็น client-first หลายสัปดาห์ที่ backend ไม่มี traffic และช่วงระหว่าง playtest ก็เงียบ → ต้องมีคนกด restore ก่อนทุก playtest หรือทำ keep-alive ปลอมซึ่งขัดเจตนาของแผนฟรี · Cloudflare ไม่มีการ pause
2. **realtime เป็นคนละโมเดลกับ DO ต่อ geohash-5 ที่ GDD ออกแบบไว้** · GDD ต้องการที่ที่ "รันโค้ด server-authoritative และถือ state" ต่อ cell (party sync, presence count, validate movement จาก trace) และ DO ตัวเดียวถือ HP กลางของ raid ที่รับ batch แล้ว broadcast ค่ารวม · Supabase Realtime ส่งต่อข้อความได้แต่ไม่ถือ state และไม่รัน logic ต่อ channel → ต้องใช้ Edge Function + row ใน Postgres เป็นตัวถือ HP ซึ่งเป็น hot row ตอน raid · เพดานฟรี 200 connection พร้อมกันรองรับแค่ playtest ไม่ใกล้ 5,000 คน
3. **ต้องย้าย vendor เมื่อขยาย** · แผนระยะยาวของ GDD (DO, R2, Pages/tile) อยู่บน Cloudflare · เริ่มที่ Supabase แปลว่าวันขยายต้องเขียน realtime ใหม่บน DO หรืออยู่สอง vendor ถาวร (สองบิล สอง auth model สองชุด secret) · Cloudflare ขยายด้วยการเปลี่ยนแผนในบัญชีเดิม
4. ต้นทุนของ Supabase โตตาม connection และ project (GDD "โครงสร้างระบบ") ซึ่งคุมยากตอน raid

ข้อได้เปรียบของ Supabase ที่ยอมเสีย: PostGIS และ auth สำเร็จรูป · ชดเชยด้วยหัวข้อ 6.3 (geo แบบ pure TS บนข้อมูลที่เล็ก) และ F07 (Google/Apple login เก็บแค่ provider id ซึ่งเขียนบน Worker ได้ด้วย WebCrypto)

## 3. การตัดสินใจ

ยืนยัน D-008 ดังนี้:

| ชิ้น | บริการ (แผน Workers Free) | หน้าที่ | ที่อยู่ในโค้ด |
| --- | --- | --- | --- |
| client และ preview | Cloudflare Pages (static ล้วน ไม่ใช้ Pages Functions) | เว็บมือถือ Vite + MapLibre | `apps/client` |
| tile, glyph, sprite | Cloudflare Pages project แยก (`keep-walking-map`) เป็น XYZ + TileJSON ตาม D-031 | แผนที่ | publish โดย `tools/tiles/` + `infra/` |
| API Worker | Workers | REST: auth, claim, inventory, รายการ dungeon ใกล้ตัว, ลบบัญชี | `apps/api` |
| CellDO | Durable Object แบบ SQLite-backed ต่อ geohash-5 | WebSocket (hibernation), รับ batch ตำแหน่งทุก 1 นาที, validate movement gate จาก trace, run state สด, party sync, presence count, `position_log` 24 ชม. | `apps/api` (class ใน Worker เดียวกัน) |
| RaidDO | Durable Object แบบ SQLite-backed ตัวเดียวต่อ raid event | HP กลาง, รับยอดรวมจาก CellDO, broadcast ค่ารวม | `apps/api` |
| ข้อมูลถาวร | D1 (1 DB ต่อ environment) | players, stats, dungeons, runs, run_ticks, equipment, materials, market, raid, audit | `apps/api/migrations/` |
| งานตามเวลา | DO alarms (TTL ต่อ cell) + Cron Triggers (งานรวมรายวัน) | TTL `position_log`, housekeeping | `apps/api` |

กติกาที่ตามมาจากการตัดสินใจ:

- **ทุกค่าที่มีผลต่อรางวัลคำนวณใน CellDO / RaidDO / API Worker เท่านั้น** · client ส่ง `LocationSample[]` (ตำแหน่ง, accuracy, timestamp ของ fix) เป็น batch ทุก 1 นาที · formula ทั้งหมดมาจาก `packages/shared` (pure, ไม่มี DOM, รันบน Worker ได้ตาม ADR 0001 หัวข้อ 3.4) และค่ามาจาก `config/`
- **batch ตำแหน่งวิ่งบน WebSocket ไปที่ CellDO** ไม่ใช่ REST · เหตุผล: ไม่กินโควตา Workers 100,000 request/วัน และ CellDO ถือ state ของ run อยู่แล้ว · REST `POST` เป็นทางสำรองเมื่อ WebSocket ใช้ไม่ได้ (นับเป็น Worker request) · รายละเอียดสัญญาอยู่ใน tech note F08
- client เชื่อม CellDO ของ **dungeon ที่กำลังเล่น** (cell ของ centroid ของ polygon) ไม่ใช่ cell ที่ตัวเองยืนอยู่ · dungeon ที่คร่อมขอบ cell จึงมีเจ้าของเดียว
- ไม่ใช้ Pages Functions ใน client เพราะ request ของ Functions นับรวมโควตา Workers
- ค่า binding, ชื่อ DB, ชื่อ DO class และ route อยู่ใน `apps/api/wrangler.jsonc` · secret (เช่น OAuth client secret) อยู่ใน Worker secret และ `.dev.vars` ในเครื่อง (ignore แล้วตาม ADR 0001) · ชื่อ env ของ deploy (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) ตาม board หัวข้อ 1

## 4. เพดาน free tier ที่ตรวจแล้ว

ตรวจทุกแถวเมื่อ **2026-09-23** จากหน้าเอกสาร Cloudflare แบบ markdown (`<URL>index.md`) · วันที่ในวงเล็บคือ "Last updated" ของหน้านั้น · ตัวเลขทั้งหมดต้องตรวจซ้ำก่อนทุก decision เรื่องค่าใช้จ่าย

### 4.1 ใช้ได้โดยไม่ผูกบัตรหรือไม่

| ชิ้น | ผล | หลักฐาน |
| --- | --- | --- |
| Workers Free | ได้ · เป็นแผนตั้งต้นของทุกบัญชี | W2: "By default, users have access to the Workers Free plan." |
| Durable Objects | ได้ **เฉพาะแบบ SQLite-backed** | DO2: "Durable Objects are available both on Workers Free and Workers Paid plans. Workers Free plan: Only Durable Objects with SQLite storage backend are available." |
| D1 | ได้ | D2 FAQ: "the Workers Free plan will always include the ability to prototype and experiment with D1 for free." |
| Pages / static assets | ได้ · request ของ static ฟรีไม่จำกัด | P1, SA1 |
| R2 | **ต้องผ่าน checkout เพื่อเปิด subscription** → ขัด D-001 · ไม่ใช่ชิ้นที่ stack ต้องใช้ตอนนี้ (tile ใช้ Pages ตาม D-031) | R2G: "You need a Cloudflare account with an R2 subscription ... Complete the checkout flow to add an R2 subscription" |

ข้อสรุป: ทุกชิ้นที่ stack ต้องใช้ในตอนนี้ฟรีโดยไม่ผูกบัตร · การยืนยันขั้นสุดท้ายคือ HUMAN สมัครบัญชีจริงใน P1-F02-T17 (ถ้าหน้าสมัครขอบัตร ให้หยุดและแจ้ง ตามกฎ D-001)

### 4.2 ตารางเพดาน

| บริการ | รายการ | เพดาน Free | เมื่อชนเพดาน | แหล่ง |
| --- | --- | --- | --- | --- |
| Workers | request ต่อวัน | 100,000 (รวมทุก Worker และ Pages Functions ในบัญชี) · รีเซ็ต 00:00 UTC = 07:00 เวลาไทย | **ปฏิเสธ** ด้วย Error 1027 (route แบบ fail closed) หรือข้าม Worker (fail open) · ไม่คิดเงิน | W1 "Daily requests", W2 |
| Workers | CPU ต่อ request | 10 ms (ไม่นับเวลารอ I/O เช่น D1, DO, fetch) | ปฏิเสธ request นั้นด้วย Error 1102 | W1 "CPU time" |
| Workers | memory | 128 MB ต่อ isolate | Error 1102 | W1 |
| Workers | subrequest ต่อ request | 50 (รวม query D1) · บริการภายใน 1,000 | error | W1 |
| Workers | จำนวน Worker / env var | 100 Worker · 64 var ต่อ Worker | deploy ไม่ผ่าน | W1 |
| Cron Triggers | จำนวน และ CPU | **5 ต่อบัญชี** · CPU 10 ms ต่อครั้ง · wall 15 นาที | deploy ไม่ผ่าน / Error 1102 | W1, CR1 |
| DO (SQLite) | request ต่อวัน | 100,000 (HTTP, RPC, WebSocket ขาเข้า, alarm) · WebSocket ขาออกไม่นับ · อัตรา 20:1 ของข้อความขาเข้าระบุว่าใช้กับ "billing" (ดูสมมติฐาน A-2) | **operation ล้มพร้อม error** · ไม่คิดเงิน · รีเซ็ต 00:00 UTC | DO2 |
| DO (SQLite) | duration | 13,000 GB-s ต่อวัน (คิดที่ 128 MB ต่อ object ระหว่าง active และไม่เข้าเกณฑ์ hibernate) = DO ที่ตื่นตลอดได้ราว 1.18 ตัว | operation ล้มพร้อม error | DO2 |
| DO (SQLite) | rows read / written ต่อวัน | 5,000,000 / **100,000** · delete และ `setAlarm()` นับเป็น row written | operation ล้มพร้อม error | DO2 "SQLite storage backend" |
| DO (SQLite) | storage | รวม 5 GB ต่อบัญชี · ต่อ object: ตารางระบุ 10 GB แต่ FAQ ระบุ **1 GB บน Free** (ใช้ 1 GB) | write ล้มด้วย `SQLITE_FULL` · read และ delete ยังทำได้ | DO1 |
| DO (SQLite) | อื่นๆ | 100 class ต่อบัญชี · object ไม่จำกัด · soft limit 1,000 req/s ต่อ object · row สูงสุด 2 MB · 100 bound parameter | overloaded error | DO1 |
| DO (SQLite) | CPU ต่อ request | หน้า DO ระบุ 30 วินาทีแต่ก็ระบุว่า "Workers limits apply according to your Workers plan" → **ถือ 10 ms** จนกว่าจะวัดได้ (A-3) | Error 1102 / object ถูก reset | DO1 |
| D1 | ขนาดและจำนวน | 500 MB ต่อ DB · 10 DB · รวม 5 GB ต่อบัญชี · Time Travel 7 วัน | เขียน/สร้างตาราง/index ไม่ได้จนกว่าจะลบข้อมูล | D1 |
| D1 | rows read / written ต่อวัน | 5,000,000 / **100,000** (index ที่ถูกแก้นับเพิ่ม 1 row ต่อ index) · รีเซ็ต 00:00 UTC | **query ล้มพร้อม error** จนรีเซ็ต · ไม่คิดเงิน | D2 |
| D1 | ต่อ invocation | 50 query ต่อ Worker invocation · query ≤ 30 วินาที · statement ≤ 100 KB | error | D1 |
| Pages | ไฟล์ | 20,000 ไฟล์ต่อ site · 25 MiB ต่อไฟล์ | deploy ไม่ผ่าน | P1 |
| Pages | build และ deploy | 500 build/เดือน (Git integration) · build ครั้งละ 1 · timeout 20 นาที · preview ไม่จำกัด · deploy ผ่าน `wrangler` จาก GitHub Actions ไม่ใช้ Git integration | build ถัดไปรอหรือถูกปฏิเสธ | P1 |
| Pages | bandwidth / request | static ฟรีไม่จำกัด · ไม่ตอบ `206` (D-031) | — | P1, SA1, tech note F02 หัวข้อ 7 |
| Workers static assets | ไฟล์ | 20,000 ต่อ version (Paid: 100,000) · 25 MiB ต่อไฟล์ · ถ้าใช้ `run_worker_first` แล้วเกินโควตาจะได้ `429` | deploy ไม่ผ่าน / 429 | W1, SA1 |

### 4.3 แหล่งอ้างอิง (เปิดอ่าน 2026-09-23 ทุกรายการ)

| รหัส | URL | Last updated ของหน้า |
| --- | --- | --- |
| W1 | `https://developers.cloudflare.com/workers/platform/limits/` | 2026-09-05 |
| W2 | `https://developers.cloudflare.com/workers/platform/pricing/` | 2026-08-28 |
| CR1 | `https://developers.cloudflare.com/workers/configuration/cron-triggers/` | 2026-09-04 |
| DO1 | `https://developers.cloudflare.com/durable-objects/platform/limits/` | 2026-06-01 |
| DO2 | `https://developers.cloudflare.com/durable-objects/platform/pricing/` | 2026-08-25 |
| DO3 | `https://developers.cloudflare.com/durable-objects/api/alarms/` | 2026-04-21 |
| DO4 | `https://developers.cloudflare.com/durable-objects/best-practices/websockets/` | 2026-06-19 |
| D1 | `https://developers.cloudflare.com/d1/platform/limits/` | 2026-04-21 |
| D2 | `https://developers.cloudflare.com/d1/platform/pricing/` | 2026-04-21 |
| P1 | `https://developers.cloudflare.com/pages/platform/limits/` | 2026-09-05 |
| SA1 | `https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/` | 2026-04-23 |
| R2P | `https://developers.cloudflare.com/r2/pricing/` (และตาราง R2 ใน W2) | ตรวจ 2026-09-23 |
| R2G | `https://developers.cloudflare.com/r2/get-started/` | ตรวจ 2026-09-23 |
| SB1 | `https://supabase.com/pricing` | ตรวจ 2026-09-23 |

## 5. ประมาณการโหลดเทียบเพดาน

### 5.1 สมมติฐานของโมเดล (ให้ backend-programmer และ systems-designer ยืนยันใน tech note F08)

- หน่วยนับ = **ผู้เล่น-ชั่วโมง (ph)** คือผู้เล่น 1 คนอยู่ใน run 1 ชั่วโมง · client เก็บ sample ทุก 5 วินาที (กรณีแย่กว่า 10 วินาที) แล้วส่ง batch ทุก 1 นาทีตาม GDD · tick รางวัลทุก 5 นาที = 12 tick/ชม.
- **`position_log` เก็บ 1 row ต่อ batch ต่อผู้เล่น** (sample 6–12 จุดแพ็กในคอลัมน์เดียว) ไม่ใช่ 1 row ต่อ sample · ตารางใช้ primary key แบบ `WITHOUT ROWID` จึงไม่มี index เพิ่ม · TTL ลบทิ้งภายหลังนับเป็น write อีก 1 → 2 row written ต่อนาที (ถ้าเก็บ 1 row ต่อ sample ที่ 5 วินาทีพร้อม index จะเป็น 12 × 2 insert + 12 × 2 delete = 48 ต่อนาที หรือ 24 เท่า ซึ่งทำให้ free tier รับได้แค่ราว 34 ph/วัน)
- WebSocket เชื่อมใหม่ราว 5 ครั้งต่อชั่วโมง (เน็ตมือถือหลุด, สลับแอป) · quick command + ข้อความ party ขาเข้าราว 10 ต่อชั่วโมง · broadcast ขาออกไม่นับ
- duration ของ DO: handler ละ 50 ms (เผื่อ I/O) แล้ว hibernate

| ต่อ 1 ph | จำนวน | ที่มา |
| --- | --- | --- |
| Workers request | ~30 | เข้าเกม + profile + dungeon ใกล้ตัว ~5, เริ่ม/จบ run 2, inventory หลัง tick 12, WebSocket upgrade 5, อื่นๆ 6 |
| DO request (นับ 1:1) | ~80 | batch 60 + command 10 + upgrade 5 + RPC จาก Worker 5 |
| DO request (ถ้าอัตรา 20:1 ใช้กับ Free) | ~13.5 | 10 + 70/20 |
| DO rows written | ~150 | `position_log` 60 insert + 60 delete, run state 12 + tick 12, party ~6 |
| D1 rows written | ~60 | materials/drop 24, xp/level 12, `run_ticks` 12, สรุป run 2, อื่นๆ รวม index ~10 |
| D1 rows read | ~1,000 (เผื่อสูง) | รายการ dungeon, inventory, profile |
| DO duration | ~0.51 GB-s | 80 × 50 ms × 0.128 GB |
| DO storage ของ `position_log` | ~60 KB ต่อ ph ค้างไม่เกิน 24 ชม. | ~1 KB ต่อ row |

### 5.2 ความจุของ free tier ต่อวัน (ph ต่อวัน = เพดาน ÷ การใช้ต่อ ph)

| เพดาน | ความจุ (ph/วัน) | ลำดับที่ชน |
| --- | --- | --- |
| DO rows written 100,000 | **~666** | 1 (ชนก่อน) |
| DO request 100,000 นับ 1:1 | ~1,250 (ถ้าอัตรา 20:1 ใช้ได้ ~7,400) | 2 |
| D1 rows written 100,000 | ~1,666 | 3 |
| Workers request 100,000 | ~3,333 | 4 |
| D1 rows read 5,000,000 | ~5,000 | 5 |
| DO duration 13,000 GB-s | ~25,000 ถ้า hibernate ได้ · แต่ DO ที่ตื่นตลอด 24 ชม. 1 ตัวกิน 11,059 GB-s | ขึ้นกับ raid |
| storage (DO 5 GB, D1 500 MB/DB) | ไม่ชนในช่วง Phase 2–6 | — |
| Workers CPU 10 ms | ไม่ใช่โควตารายวัน แต่เป็นเพดานต่อ request: validate batch 12 sample (haversine + gate) และ point-in-polygon กับ polygon ไม่กี่สิบรูปใช้ต่ำกว่า 1 ms · verify JWT ของ Google/Apple ด้วย WebCrypto ใช้ต่ำกว่า 1 ms | วัดจริงใน Phase 3 (A-3) |

ถ้า DO และ D1 ใช้โควตา rows written ก้อนเดียวกัน (A-1 กรณีแย่) ความจุจะเหลือ 100,000 ÷ 210 ≈ **476 ph/วัน** · ข้อสรุปทุกข้อด้านล่างยังเหมือนเดิม

### 5.3 Phase 2 (client-first)

- ใช้แค่ Pages: project client (ไม่เกินราว 100 ไฟล์) และ project แผนที่ (tile XYZ z15 13,502 ไฟล์ + glyph/sprite ≤ 1,000 → ต่ำกว่าเป้า 16,000 และเพดาน 20,000 ตาม tech note F02 หัวข้อ 7.4)
- Workers / DO / D1: **0 request** · request ของ static ฟรีไม่จำกัด · tile ใหญ่สุดที่คาด < 1 MB ต่ำกว่า 25 MiB มาก
- deploy ผ่าน `wrangler pages deploy` จาก GitHub Actions ไม่ใช้ Git integration จึงไม่แตะ 500 build/เดือน · ถึงจะใช้ก็ deploy ได้ราว 16 ครั้งต่อวัน
- ข้อสรุป: Phase 2 ไม่ชนเพดานใด และ **ไม่ต้องรอ backend** · logic ของ run และ movement gate อยู่ใน `packages/shared` ที่ย้ายไปรันใน CellDO ได้โดยไม่แก้

### 5.4 Phase 3 (backend + party, playtest 5–20 คน)

| สถานการณ์ | ph/วัน | สัดส่วนของเพดานที่ชนก่อน (666) |
| --- | --- | --- |
| playtest ปกติ 10 คน × 1 ชม. + dev/QA บน preview 10 ph | 20 | 3% |
| playtest หนัก 20 คน × 1.5 ชม. + dev/QA 20 ph | 50 | 7.5% |
| วันทดสอบหนักสุด 20 คน × 3 ชม. + dev/QA 20 ph | 80 | 12% |

- contract test และ integration test ใน CI รันบน `workerd` / `wrangler dev` ในเครื่อง ไม่แตะโควตาจริง (ADR 0001 และ `docs/tech/environments.md` หัวข้อ 2)
- ข้อสรุป: Phase 3 อยู่ใน free tier สบาย เหลือที่ราว 8 เท่า · สิ่งที่ต้องระวังจริงคือบั๊กที่วน request หรือเขียน row รัวๆ → ต้องมี rate limit ต่อ connection และ alert (handoff devops)

### 5.5 ที่ 1,000 และ 5,000 ผู้เล่น

สมมติ 1 ph ต่อ DAU ต่อวัน (session ราว 45–60 นาทีตาม GDD)

| ขนาด | ph/วัน | เทียบความจุ 666 | อยู่ใน free tier หรือไม่ |
| --- | --- | --- | --- |
| 300 DAU | 300 | 45% | อยู่ |
| 1,000 DAU | 1,000 | 150% · DO request 1:1 ที่ 80% | **ไม่อยู่** (อยู่ได้ถ้าลด write ตามข้อ 5.7 แต่เหลือที่น้อยเกินไปสำหรับ closed beta) |
| 5,000 DAU | 5,000 | 750% · Workers request 150% | ไม่อยู่ |
| raid วันเสาร์ 5,000 คน × 2 ชม. | 10,000 ในวันเดียว | 1,500% · Workers 300% | ไม่อยู่ |

### 5.6 Raid วันเสาร์ (เป้า 5,000 คนใน Phase 6)

- โควตารีเซ็ต 00:00 UTC = **07:00 เวลาไทย** · raid วันเสาร์และช่วงเย็นทั้งหมดตกในวันโควตาเดียวกัน จึงเกลี่ยข้ามวันไม่ได้
- ไม่ batch: 5,000 คน × tick 10 วินาที = 500 req/s (GDD) · batch 1 นาที: ~83 ข้อความ/วินาที
- โครงที่ใช้: client → CellDO ของจุดเกิด (5–8 จุด แต่ละ cell ราว 625–1,000 คน = 10–17 ข้อความ/วินาที ต่ำกว่า soft limit 1,000 req/s ต่อ object มาก) → CellDO รวม contribution แล้วส่งยอดรวมให้ RaidDO ทุก 10 วินาที (8 × 6 = 48 request/นาที) → RaidDO broadcast HP ค่ารวมกลับผ่าน CellDO (ขาออกไม่นับ) · ไม่ sync รายคนตาม GDD และไม่มีตำแหน่งรายคนออกไปหาผู้เล่นอื่น
- ต่อ raid 2 ชม.: DO request ขาเข้า ~800,000 (1:1) · rows written ~1.5 ล้าน · Workers request ~300,000 · duration ของ DO ที่ตื่นตลอด 9 ตัว ≈ 9 × 7,200 × 0.128 = 8,294 GB-s (duration อย่างเดียวยังอยู่ใน 13,000 แต่ request เกิน 8 เท่าและ write เกิน 15 เท่า)
- ข้อสรุป: **raid ขนาดเป้าหมายทำบน Free ไม่ได้** · raid ขนาดทดสอบ (ไม่เกินราว 200 คน × 2 ชม. = 400 ph) ยังอยู่ใน Free ถ้าวันนั้นไม่มี traffic อื่นมาก

### 5.7 คันโยกลดโหลดก่อนต้องจ่าย (ไม่เปลี่ยนกฎเกม)

1. persist `position_log` ตามรอบ tick 5 นาทีแทนทุกนาที (buffer ใน memory ของ CellDO) → DO rows written ต่อ ph จาก ~150 เหลือ ~54 · ความเสี่ยง: object ถูก evict แล้ว sample ใน buffer หาย → ต้องให้ client ส่ง batch ซ้ำได้ (idempotent ด้วย `seq`) ก่อนใช้คันโยกนี้
2. เขียนทับ slot แบบ ring (`slot = นาทีของวัน`) แทน insert + delete → ตัด delete ครึ่งหนึ่ง · ยังต้องมี alarm ลบ slot ของผู้เล่นที่หยุดเล่น
3. รวม inventory update หลายรายการเป็น row เดียวต่อ tick
- ทุกคันโยกต้องผ่าน tech note F08 และ QA ด้วย trace-replay · ห้ามลดความถี่ sample หรือผ่อน movement gate เพื่อประหยัดโควตา (non-negotiable ข้อ 2)

### 5.8 เมื่อชนเพดานจริง ระบบต้องทำอะไร

- Workers ตอบ 1027, DO/D1 ตอบ error จนถึง 07:00 เวลาไทย · **ไม่มีการคิดเงินอัตโนมัติ** เพราะไม่มีบัตร
- API Worker ใช้ `workers.dev` หรือ route แบบ **fail closed** (ห้าม fail open เพราะจะข้าม logic ฝั่ง server)
- client ถือว่าเป็นกรณี "เซิร์ฟเวอร์ไม่พร้อม" ตามกฎ "เน็ตหลุดไม่เท่ากับเกมโอเวอร์": เก็บ sample ในเครื่องต่อ, run ไม่ถูกลบ, offline evidence ส่งย้อนหลังได้ไม่เกิน 30 นาทีตาม GDD · copy ภาษาไทยของสถานะนี้เป็นงาน narrative-designer
- CellDO จับ `SQLITE_FULL` และ error ของโควตา แล้วตอบ client ด้วยรหัสสถานะที่ตกลงใน API contract ไม่ใช่ throw ทิ้ง

## 6. ผลต่อ data model และ geo query

### 6.1 ตารางอยู่ที่ไหน (ชื่อ logical ตาม GDD "Data model หลัก" ไม่เปลี่ยน)

| ตาราง GDD | ที่เก็บ | หมายเหตุ |
| --- | --- | --- |
| `players`, `player_stats` | D1 | เก็บ provider id อย่างเดียว ไม่มีชื่อจริงหรืออีเมล (PDPA) |
| `zones`, `dungeons` | D1 · CellDO โหลด polygon ของ cell ตัวเองมาไว้ใน memory ตอนตื่น | ชื่อทุกอย่างมาจากหลังบ้าน ไม่ hardcode |
| `runs` | run สดอยู่ใน CellDO · สรุปเมื่อจบเขียน D1 | แยก run state กับ connection state ตาม GDD |
| `run_ticks` | D1 (เขียนโดย CellDO ทุก tick ที่ตัดสินแล้ว) | เป็นหลักฐานรางวัลถาวร |
| `equipment`, `materials`, `market_listings` | D1 | |
| `raid_events`, `raid_contrib` | ระหว่าง event: RaidDO + CellDO · checkpoint และจบ: D1 | HP กลางอยู่ใน RaidDO ตัวเดียวตาม GDD |
| `position_log` | **SQLite ของ CellDO** ที่เป็นเจ้าของ run · 1 row ต่อ batch | TTL 24 ชม. หัวข้อ 6.2 |
| `audit_log` | D1 | |
| (ใหม่ ภายใน) `position_log_cells` | D1: `(player_id, cell, expires_at)` เขียน 1 ครั้งต่อผู้เล่นต่อ cell ต่อวัน | ใช้ตามลบ `position_log` ข้าม cell เมื่อผู้ใช้ลบบัญชี |

- **`verification_mode`** เป็นคอลัมน์ `TEXT NOT NULL` ใน `dungeons` ของ D1 พร้อม `CHECK (verification_mode IN ('continuous_gps', 'entry_exit'))` · v1 ทุกแถวเป็น `continuous_gps` · CellDO เลือก strategy check-in/check-out จากค่านี้ (`entry_exit` มีแค่ interface ตาม GDD)
- **`floor_level`** เป็น `INTEGER NULL` · v1 เป็น `NULL` ทุกแถว · ไม่มี logic อ่าน
- `dungeons` เพิ่มคอลัมน์ช่วย query: `geohash5` (มี index), `min_lat`, `max_lat`, `min_lng`, `max_lng` และ `polygon` เป็น GeoJSON text · คอลัมน์ช่วยคำนวณโดยหลังบ้านตอนบันทึก ไม่ใช่ข้อมูลที่ผู้ใช้กรอก
- `position_log` ยังมีฟิลด์ logical ครบ (`player_id, lat, lng, ts, accuracy`) แต่ physical เป็น `(minute_ts, player_id, run_id, samples_blob)` primary key `(minute_ts, player_id)` แบบ `WITHOUT ROWID` · อ่านผ่านฟังก์ชัน unpack ใน `packages/shared` เท่านั้น

### 6.2 TTL 24 ชม. และการลบจริง

- **DO alarm** ของ CellDO: เมื่อมี `position_log` ค้าง ตั้ง alarm ทุก 1 ชม. (ค่าอยู่ใน config) ลบ row ที่ `minute_ts < now - 24 ชม.` (ค่าอยู่ใน config) · ไม่มี row เหลือ = ไม่ตั้ง alarm · alarm 1 ครั้ง = 1 DO request + 1 row written (DO2, DO3) · alarm ไม่จำกัดจำนวนต่างจาก Cron ที่มีแค่ 5 ต่อบัญชี
- **Cron Trigger** 1 ตัว (จาก 5) รายวัน: ลบ `position_log_cells` ที่หมดอายุ และงาน housekeeping ของ D1 · งานต้องแบ่งเป็นชุดละไม่เกิน 1,000 row และอยู่ใน 50 query ต่อ invocation (D1) · CPU 10 ms ไม่นับเวลารอ D1
- ลบบัญชี: API Worker อ่าน `position_log_cells` แล้วสั่งทุก CellDO ที่เกี่ยวข้องลบ row ของผู้เล่นทันที จากนั้นลบข้อมูลใน D1 · ไม่รอ TTL
- log ของ Worker ห้ามมีพิกัดหรือ provider id (no PII in logs)

### 6.3 geo query บน stack ที่ไม่มี PostGIS

- ขนาดข้อมูลเล็ก: dungeon หลักร้อยถึงหลักพันแห่งทั้งกรุงเทพฯ และปริมณฑล · polygon หนึ่งมีจุดไม่กี่สิบถึงไม่กี่ร้อยจุด
- **dungeon ใกล้ตัว** (API Worker): `SELECT ... FROM dungeons WHERE geohash5 IN (?, 9 cell รอบตัว) AND status = ?` ใช้ index → กรองระยะด้วย haversine ใน TS
- **point-in-polygon** (CellDO): ray casting บนพิกัดที่ project เฉพาะที่ ใน memory พร้อม bbox prefilter และ buffer ตาม accuracy จาก config · ต่ำกว่า 1 ms ต่อ batch
- ทั้งหมดเป็นฟังก์ชัน pure ใน `packages/geo` (ADR 0001) ที่ client ใช้ **แสดงผล** และ server ใช้ **ตัดสิน** ด้วยโค้ดชุดเดียวกัน · client ไม่ตัดสินอะไรที่มีผลต่อรางวัล
- ตรวจ polygon (พื้นที่ 3,000–150,000 ตร.ม., ห้ามวัดและศาสนสถาน) ทำตอนสร้าง dungeon ในหลังบ้านและ `tools/coverage/` ไม่ใช่ตอน runtime
- ไม่พึ่ง SQLite R*Tree หรือ extension ใดที่ D1/DO อาจไม่รองรับ · ทบทวนเมื่อ dungeon เกินราว 50,000 แห่งหรือเมื่อต้อง spatial join ขนาดใหญ่

### 6.4 ยืนยัน layout

- **ยืนยันชื่อ `apps/api`** ตาม ADR 0001 หัวข้อ 3.2 · เป็น Worker เดียว (Wrangler) ที่มี API Worker + DO class `CellDO`, `RaidDO` + migration ของ D1 ใน `apps/api/migrations/` · tsconfig ใช้ `@cloudflare/workers-types`
- ยังไม่สร้างใน Phase 1–2 · backend-programmer สร้างใน Phase 3 ตาม tech note F07/F08
- `packages/geo` สร้างเมื่อ location-engineer เริ่มงาน point-in-polygon (Phase 2)

## 7. ทางขยาย (บัญชีเดิม ไม่ย้าย vendor)

### 7.1 ขั้นตอน (แต่ละขั้นที่มีค่าใช้จ่าย = decision อนุมัติงบแยกโดย HUMAN)

| ขั้น | อะไรเปลี่ยน | ค่าใช้จ่าย (ราคา ณ 2026-09-23, USD) | ต้องอนุมัติ |
| --- | --- | --- | --- |
| 0. Free (ตอนนี้) | — | 0 | ไม่ต้อง |
| 1. Workers Paid | โควตา request/row/duration เปลี่ยนจากรายวันเป็นรายเดือนและคิดเงินส่วนเกิน · CPU สูงสุด 5 นาที (ตั้งต้น 30 วินาที) · subrequest 10,000 · Cron 250 · static assets 100,000 ไฟล์ต่อ Worker version · DO storage ไม่จำกัดต่อบัญชี, 10 GB ต่อ object | ขั้นต่ำ 5/เดือน · รวม Workers 10 ล้าน req + 30 ล้าน CPU ms, DO 1 ล้าน req + 400,000 GB-s, rows read 25 พันล้าน / written 50 ล้าน ต่อเดือน (DO และ D1 แต่ละตัว), storage 5 GB (W2, DO2, D2) | HUMAN (ผูกบัตร = ข้อยกเว้นของ D-001) |
| 2. R2 (ถ้าจำเป็น) | เปิด subscription R2 · publish PMTiles ไฟล์เดียวที่ตอบ `206` (ตาม GDD) | ฟรี 10 GB-เดือน, Class A 1 ล้าน, Class B 10 ล้านต่อเดือน, egress ฟรี · เกิน: 0.015/GB-เดือน, 4.50 / 0.36 ต่อล้าน op (R2P) | HUMAN แยกจากขั้น 1 |

### 7.2 สิ่งที่เปลี่ยนและไม่เปลี่ยน

- **เปลี่ยน:** แผนของบัญชี (HUMAN กดเอง) · `limits` ใน `apps/api/wrangler.jsonc` (เช่น `cpu_ms`) ถ้าต้องการ · ค่าใน config ของคันโยก (ถ้าเคยเปิดไว้ ข้อ 5.7) · ค่า alert ของ devops · ถ้าใช้ R2: ค่า `TILES_PUBLIC_BASE_URL` / `VITE_TILES_URL` เป็น `pmtiles://https://<r2-domain>/<tileset_id>.pmtiles` และ target ของ publish script ใน `infra/` · env ใหม่ของ R2 (ถ้ามี) เพิ่มใน `.env.example` ผ่านงานของ devops
- **ไม่เปลี่ยน:** โค้ด client · interface `LocationProvider` · API contract และ WebSocket protocol · schema ของ D1 และ DO · `packages/shared`, `packages/geo` · ชื่อ binding
- ไม่มีขั้นใดต้อง migrate ข้อมูลข้าม vendor · downgrade กลับ Free ได้ (DO แบบ SQLite ไม่ติดเงื่อนไข downgrade ของ DO แบบ key-value ใน DO1) แต่ข้อมูลที่เกินเพดาน Free ต้องลดก่อน

### 7.3 ผลของ D-031 ต่อ R2

- Pages ตอบ range ด้วย `200` จึงใช้ XYZ static ซึ่ง **request ฟรีไม่จำกัด** · ส่วน R2 คิด Class B ทุก read ที่ไม่ถูก cache · ดังนั้น R2 ไม่ได้ถูกกว่าเสมอไปสำหรับ tile
- เมื่อขยายพื้นที่จนไฟล์ XYZ เกิน 20,000 มีสองทางในบัญชีเดิม: (ก) ย้าย project แผนที่ไป **Workers static assets บน Workers Paid** (100,000 ไฟล์, ยังเป็น XYZ, ไม่ต้องใช้ R2) (ข) PMTiles บน R2 ตาม GDD (ตอบ `206`, ไม่มีเพดานจำนวนไฟล์, เหมาะกับ extract ทั้งประเทศ 1–3 GB) · เลือกตอนนั้นด้วย ADR ใหม่ เพราะ (ก) เบี่ยงจาก baseline ของ GDD ที่ระบุ R2
- ทุกกรณี client รับทั้งสองรูปแบบผ่าน `VITE_TILES_URL` อยู่แล้ว (tech note F02 หัวข้อ 7.6)
- ระวัง: Pages แบบเสียเงินที่ให้ 100,000 ไฟล์คือแผน Pro/Business ของ zone ไม่ใช่ Workers Paid (P1) · ถ้าต้องการเพดานไฟล์สูงขึ้นโดยจ่ายแค่ Workers Paid ต้องใช้ Workers static assets

### 7.4 ประมาณค่าใช้จ่ายเมื่อเกิน Free (ข้อมูลประกอบการขออนุมัติในอนาคตเท่านั้น)

สถานการณ์ Phase 6: 1,000 DAU × 1 ph × 30 วัน + raid 4 ครั้ง × 10,000 ph = **70,000 ph/เดือน**

| มิติ | ใช้ต่อเดือน | รวมในแผน Paid | ส่วนเกิน |
| --- | --- | --- | --- |
| Workers request | 2.1 ล้าน | 10 ล้าน | 0 |
| Workers CPU (~3 ms/req) | ~6.3 ล้าน ms | 30 ล้าน ms | 0 |
| DO request (billing 20:1) | ~0.95 ล้าน | 1 ล้าน | 0 (ถ้าเกินเล็กน้อย 0.15 ต่อล้าน) |
| DO duration | ~36,000 (hibernate) + ~33,000 (raid) GB-s | 400,000 GB-s | 0 |
| DO rows written | 10.5 ล้าน | 50 ล้าน | 0 |
| D1 rows written / read | 4.2 ล้าน / 70 ล้าน | 50 ล้าน / 25 พันล้าน | 0 |
| storage | < 1 GB | 5 GB | 0 |

- ประมาณ **5 USD/เดือน** (ขั้นต่ำของ Workers Paid) · เผื่อความคลาดเคลื่อนของโมเดล 2 เท่า = ราว **5–10 USD/เดือน** · R2 ถ้าเปิด: extract ประเทศไทย 1–3 GB อยู่ในส่วนฟรี 10 GB
- ราคาเป็นของวันที่ 2026-09-23 ต้องตรวจใหม่ก่อนยื่นขออนุมัติ

### 7.5 เงื่อนไขที่ทำให้ต้องยื่นขออนุมัติอัปเกรด (ข้อเสนอ · HUMAN อนุมัติ)

- U1: เมตริกรายวันใดใน 4.2 เกิน **70% ของเพดาน** 3 วันในรอบ 7 วัน (ดูจาก dashboard / GraphQL Analytics ที่ devops ตั้ง alert)
- U2: มี event ที่วางแผนไว้ซึ่งประมาณการตามหัวข้อ 5 เกิน **50%** ของเพดานใด (closed beta Phase 7, ทดสอบ raid เกินราว 200 คน, raid Phase 6)
- U3: เกิด Error 1027 หรือ error โควตาของ DO/D1 แม้ครั้งเดียวใน environment ที่มีผู้เล่นจริง
- U4: ต้องการ CPU เกิน 10 ms ต่อ request ที่พิสูจน์ด้วยการวัด หรือไฟล์ static เกิน 20,000
- เมื่อเข้าเงื่อนไข: producer เปิด decision ใหม่พร้อมตัวเลขจริงและราคาล่าสุด → HUMAN อนุมัติ → HUMAN อัปเกรดในบัญชีเอง · **agent ไม่อัปเกรดและไม่ผูกบัตรเอง**
- ข้อเสนอ: ให้ยื่นขออนุมัติ Workers Paid **ก่อนเริ่ม closed beta (Phase 7) และก่อนทดสอบ raid ขนาดจริง (Phase 6)** เป็นอย่างช้า เพราะหัวข้อ 5.5–5.6 ชี้ว่าเกิน Free แน่นอน

## 8. ผลที่ตามมา

### 8.1 ข้อดี

- ต้นทุน 0 และไม่ผูกบัตรตลอด Phase 1–3 (และน่าจะถึงต้น Phase 5) · ไม่มีการ pause เมื่อไม่มีคนใช้
- ตรงกับสถาปัตยกรรมใน GDD เกือบทุกจุด (API Worker, DO ต่อ geohash-5, DO ตัวเดียวถือ HP, WebSocket hibernation) · ทางขยายอยู่ในบัญชีเดิม
- ชนเพดานแล้ว "ปฏิเสธ" ไม่ "คิดเงิน" → ไม่มีบิลช็อก · เวลารีเซ็ต 07:00 เวลาไทยทำให้กรณีแย่สุดคือเกมหยุดช่วงกลางคืน

### 8.2 ข้อเสียและต้นทุน

- เขียนเองมากกว่า Supabase: auth (verify ID token ของ Google/Apple), migration, rate limit, admin query · ประเมินเพิ่มราว 3–5 วันใน Phase 3
- ไม่มี PostGIS · ถ้าวันหนึ่งต้องการ spatial join หนักต้องเขียน ADR ใหม่
- free tier เป็นรายวัน: บั๊กที่เขียน row รัวๆ ทำให้เกมหยุดทั้งวัน → rate limit ต่อ connection และ alert เป็นงานบังคับก่อนมีผู้เล่นภายนอก
- D1 ต่อ DB เป็น single-thread (ราว 1,000 query/วินาทีที่ 1 ms ต่อ query) · พอสำหรับ Phase 3–6 · ทบทวนเมื่อ DAU หลักหมื่น
- lock-in กับ Cloudflare (DO เป็น API เฉพาะ) · ยอมรับแล้วใน D-008 · ลดผลด้วยการให้ logic ทั้งหมดอยู่ใน `packages/shared` / `packages/geo` ที่ไม่ผูก runtime และให้ DO เป็นแค่ชั้น transport + storage

### 8.3 สมมติฐานที่ต้องตรวจ

- A-1: โควตา rows written ของ DO storage และของ D1 เป็นคนละก้อน (หน้า DO2 แยกตารางและบอกว่า "match D1 pricing") · ถ้าเป็นก้อนเดียวกัน ความจุ ~476 ph/วัน ข้อสรุปไม่เปลี่ยน · ตรวจจาก dashboard เมื่อมี traffic จริงใน Phase 3 (devops)
- A-2: อัตรา 20:1 ของข้อความ WebSocket ขาเข้าใช้กับการนับโควตาของ Free ด้วยหรือไม่ เอกสารระบุแค่ "for compute requests billing-only" → ADR นี้ใช้ 1:1 ในการประเมินความจุ Free
- A-3: CPU ต่อ invocation ของ DO บน Workers Free (10 ms ตาม Workers หรือ 30 วินาทีตามหน้า DO) · ออกแบบ handler ให้อยู่ใน 10 ms และวัดใน Phase 3
- A-4: storage ต่อ DO บน Free = 1 GB (FAQ) แม้ตารางจะเขียน 10 GB · `position_log` 24 ชม. ของ cell หนึ่งห่างจาก 1 GB มาก
- A-5: 1 ph ต่อ DAU ต่อวัน และค่าต่อ ph ในหัวข้อ 5.1 · ตัวเลขจริงมาจาก telemetry Phase 3 · product-manager และ systems-designer ยืนยันพฤติกรรมเล่น

## 9. งานต่อ

| งาน | เจ้าของ | เมื่อไร |
| --- | --- | --- |
| สมัคร Cloudflare Free ไม่ผูกบัตร (มีบน board แล้ว P1-F02-T17) · ถ้าหน้าสมัครขอบัตร ให้หยุดและแจ้ง | HUMAN | Phase 1 |
| tech note F07/F08: API contract, WebSocket protocol ของ batch (`seq` idempotent), รหัสสถานะเมื่อโควตาเต็ม, schema D1/DO ตามหัวข้อ 6 | tech-lead | ต้น Phase 3 |
| สร้าง `apps/api` (Worker + CellDO + RaidDO + migrations) และ rate limit ต่อ connection | backend-programmer | Phase 3 |
| alert ที่ 50% และ 70% ของทุกเพดานในหัวข้อ 4.2 + runbook "โควตาเต็ม" | devops-engineer | ก่อน playtest Phase 3 |
| copy สถานะ "เซิร์ฟเวอร์ไม่พร้อม เก็บการเดินไว้ให้แล้ว" | narrative-designer | Phase 3 |
| trace-replay test ของ batch ซ้ำ/ขาด และ TTL ของ `position_log` | qa-tester | Phase 3 |
| decision ขออนุมัติ Workers Paid ตามเงื่อนไข U1–U4 | producer → HUMAN | ก่อน Phase 6/7 หรือเมื่อเข้าเงื่อนไข |
