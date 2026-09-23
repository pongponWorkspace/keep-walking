# Roadmap — GPS Dungeon กรุงเทพฯ

อ้างอิง: `เกม GPS Dungeon กรุงเทพฯ — Design Document.md` หัวข้อ "แผนงาน" (M0–M8) · เรียงตามความเสี่ยง ไม่ใช่ความสมบูรณ์ของฟีเจอร์ — พิสูจน์สิ่งที่ล้มได้ก่อน

สถานะเอกสาร: Draft — รอผู้ใช้ยืนยัน · ปรับตาม D-010 เมื่อ 2026-09-23 (Phase 1 F02 ใช้ Cloudflare Free ไม่ผูกบัตรแทน R2 ตาม D-001/D-008 · เกณฑ์ปิด Phase 4 ตาม D-005)

## ภาพรวม

| Phase | ชื่อ | Milestone ใน GDD | Feature | Gate ปิด phase |
| --- | --- | --- | --- | --- |
| 1 | Pre-production และพิสูจน์ความเสี่ยง | M0 + M1 | F01 F02 F03 | Go / No-go ของ coverage และ map spike |
| 2 | Dungeon loop เล่นได้ (client-first) | M2 | F04 F05 F06 | playtest เดินจริง "สนุกไหมที่ต้องเดินไปหา" |
| 3 | Backend + Party | M3 | F07 F08 F09 | run ทั้งหมดตัดสินที่ server + party buff ถูกต้อง |
| 4 | Progression + Economy | M4 | F10 F11 F12 | economy sim ได้อัตราส่วนรายได้ต่อค่ายาอยู่ในช่วง config (ต่ำสุด 2.45, เป้า 2.5–3) ตาม D-005 |
| 5 | หลังบ้าน | M5 | F13 F14 F15 | สร้าง/ปิด dungeon ได้โดยไม่ deploy |
| 6 | Raid Boss | M6 | F16 F17 F18 | load test 5,000 ผู้เล่นผ่าน + raid จำลองจบครบวงจร |
| 7 | Anti-cheat + PDPA + Closed beta | M7 | F19 F20 F21 | closed beta 20–50 คนจบโดยไม่มี blocker |
| 8 | Native wrap และเปิดตัว | M8 | F22 F23 F24 | พร้อมเปิด 2–3 ย่านแรก |

แต่ละ phase จบเมื่อ **ทุก task บน board เป็น DONE/CUT, ทุก gate PASS และเกณฑ์ปิด phase ผ่าน** · งานที่ต้องใช้คนจริง (เดินทดสอบ, บัญชี cloud, กฎหมาย) ถูกแยกเป็น task `HUMAN` — phase ปิดได้ในสถานะ "ครบฝั่ง agent รอคนตรวจ" และต้องปิดงาน HUMAN ก่อนเริ่ม phase ถัดไป

---

## Phase 1 — Pre-production และพิสูจน์ความเสี่ยง

เป้าหมาย: ตอบให้ได้ก่อนเขียน gameplay ว่า (1) กรุงเทพมีพื้นที่พอทำ dungeon ไหม (2) แผนที่และ GPS บนเว็บมือถือใช้ได้จริงไหม (3) ทีมทุก role มีทิศทางเดียวกัน

### F01 — Coverage Survey (M0)
- **Lead:** location-engineer · **ร่วม:** level-designer, product-manager, qa-tester
- **ส่งมอบ:** script ดึง OSM extract กรุงเทพ+ปริมณฑล (`tools/coverage/`), คัด polygon ตาม tag ใน GDD (`leisure=park`, `amenity=marketplace`, `leisure=garden`, `historic=*`, `tourism=attraction`, `leisure=pitch`) และพื้นที่ 3,000–150,000 ตร.ม., ตัด blocklist (โรงพยาบาล ราชการ ทหาร โรงเรียน ศาสนสถาน สถานทูต), `data/coverage/candidates.geojson`, heatmap เทียบความหนาแน่นประชากร, `design/levels/coverage-report.md`
- **เกณฑ์ผ่าน:** จำนวน polygon ที่ใช้ได้แยกรายเขต · รายชื่อ 2–3 ย่านเปิดตัวที่ dungeon หนาแน่นที่สุด · คำแนะนำ Go / ต้องใช้ทางเสริม (ชั้นที่สอง / dungeon ชั่วคราว / ผู้เล่นเสนอ) พร้อมตัวเลขรองรับ
- **งานของคน:** ยืนยันผล Go / No-go

### F02 — Tech Foundation และ Map/Location Spike (M1)
- **Lead:** tech-lead · **ร่วม:** location-engineer, gameplay-programmer, devops-engineer, qa-tester
- **ส่งมอบ:** ADR เลือก stack (Cloudflare Workers + Durable Objects + D1 เทียบ Supabase + PostGIS), โครง monorepo + lint + test + CI, `LocationProvider` interface พร้อม Web / Mock (เล่น GPS trace ที่อัดไว้) — Capacitor เป็น stub, หน้า spike MapLibre GL JS + PMTiles กรุงเทพ, สคริปต์ build PMTiles และ publish บน Cloudflare Free ที่ไม่ผูกบัตร (R2 เมื่ออนุมัติงบ), เครื่องมือวัด FPS / แบต / data ที่โหลด / accuracy, ชุดคู่มือเดินทดสอบภาคสนาม
- **เกณฑ์ผ่าน:** test ผ่านใน CI · Mock trace เล่นซ้ำได้และจุดขยับบนแผนที่ · build ที่ deploy ได้ใน local/preview · คู่มือเดินทดสอบพร้อมใช้
- **งานของคน:** สร้างบัญชี Cloudflare แผน Free ที่ไม่ผูกบัตรและใส่ credential เอง (R2 เมื่ออนุมัติงบ) · เดินทดสอบจริงกลางแดด 30 นาทีในสวนและในซอย แล้วกรอกผลวัด

### F03 — Game Bible และทิศทางทุกสาย
- **Lead:** game-director · **ร่วม:** narrative-designer, systems-designer, level-designer, art-director, artist-2d, uiux-designer, sound-designer, product-manager, liveops-operator
- **ส่งมอบ:** design pillars + ดัชนี feature spec (`design/pillars.md`), world/lore ฉบับเสนอ + คู่มือ copy + copy bank ของ core loop, balance model และ simulator ที่คำนวณตาราง GDD ได้ตรง (buff stacking, damage, exp curve, gear, economy) พร้อม golden test vectors, dungeon preset (สวนใหญ่ / ตลาด / สวนหย่อม), art direction + spec avatar 2D layered isometric 3 มุม + style tile, IA และ wireframe flow หลัก, audio direction, metrics framework + ชื่อ telemetry event, ร่างปฏิทิน live ops
- **เกณฑ์ผ่าน:** simulator ให้ค่าตรงตาราง GDD (เช่น Tanker 1–4 คน = 21.7 / 33.0 / 38.8 / 41.8%) · copy ผ่านกฎ 6 ข้อ · ทุก role มีเอกสารทิศทางที่ผ่าน design gate
- **งานของคน:** ยืนยัน world building (GDD ระบุว่า "ยังไม่ตัดสินใจขั้นสุดท้าย")

**ปิด Phase 1:** มีผล Go / No-go จาก F01+F02 · ถ้า No-go ให้ producer เสนอการปรับ design ก่อนเข้า Phase 2

---

## Phase 2 — Dungeon loop เล่นได้ (client-first)

เป้าหมาย: เอาไปเดินจริงแล้วตอบว่า "สนุกไหมที่ต้องเดินไปหา" · backend ยังไม่เต็ม ใช้ logic ร่วม (`packages/shared`) ที่ต่อ server ได้ภายหลัง · **MockLocationProvider ต้องใช้ได้เต็มในเฟสนี้**

### F04 — Dungeon Presence และ Run State
- **Lead:** gameplay-programmer · **ร่วม:** location-engineer, level-designer, uiux-designer, narrative-designer, qa-tester
- **ส่งมอบ:** point-in-polygon + เลือกเข้าได้ทีละ 1 dungeon พร้อม popup confirm, state machine Active / Grace (≤3 นาที) / Suspended (3–15 นาที) / Ended (>15 นาที), เวลาทำการ (OSM `opening_hours` + กรอกเอง), ข้อมูล dungeon นำร่อง 10–20 แห่งในย่านเปิดตัวจาก F01, หน้าแผนที่ dungeon ใกล้ตัว + นำทาง
- **เกณฑ์ผ่าน:** GPS trace ทดสอบครบทุก transition รวมเดินเลียบขอบและ GPS drift · dungeon ที่ปิดเข้าไม่ได้

### F05 — Movement Gate, Reward Tick และ Drop
- **Lead:** gameplay-programmer · **ร่วม:** systems-designer, artist-2d, vfx-animator, sound-designer, qa-tester
- **ส่งมอบ:** tick ทุก 5 นาที นับเมื่อระยะสะสมเกิน 50 ม., drop table (Common–Legendary) และ exp ต่อ tick จาก config, สรุปรางวัลหลังจบ run, feedback ตอนได้ของ (icon / effect / เสียง)
- **เกณฑ์ผ่าน:** trace "มือถือวางนิ่ง" ได้ 0 tick · trace "นั่งม้านั่งมี jitter" ยังได้ tick · ผลตรง golden test vectors

### F06 — HP, Damage และ 10 นาทีแรก
- **Lead:** gameplay-programmer · **ร่วม:** systems-designer, uiux-designer, narrative-designer, artist-2d, vfx-animator, sound-designer, product-manager
- **ส่งมอบ:** มอนสเตอร์ตีทุก 45–75 วินาทีตามสูตร GDD, auto-retreat 25% (default เปิด), ยาอัตโนมัติ, แจ้งเตือนที่ 30%, การตายและการฟื้น, เลือก class 4 แบบ, onboarding นาที 0–10 ตาม GDD, หน้าจอกรณี dungeon ไกลหรืออยู่นอกพื้นที่ (ดู avatar, อ่าน role, ลงทะเบียนความสนใจ)
- **เกณฑ์ผ่าน:** เลเวลตรงโซนไม่ใช้ยาอยู่ได้ราว 45 นาทีตาม simulator · copy สามจังหวะ (HP ต่ำ / auto-retreat / ตาย) ผ่าน content gate · ไม่สอนสิ่งต้องห้ามใน 10 นาทีแรก
- **งานของคน:** playtest เดินจริงอย่างน้อย 3 คน กรอกแบบสอบถามที่ product-manager เตรียม

**ปิด Phase 2:** playtest report สรุปว่า loop สนุกพอไปต่อ หรือระบุสิ่งที่ต้องแก้

---

## Phase 3 — Backend + Party

### F07 — Account และ Player Profile
- **Lead:** backend-programmer · **ร่วม:** tech-lead, uiux-designer, devops-engineer, qa-tester
- **ส่งมอบ:** Google / Apple login (เก็บ provider id อย่างเดียว), ตัวละครผูก account ไม่ผูกเครื่อง, profile ไม่มีข้อมูลตัวตนจริง, เปลี่ยน class (ค่า 500×(level/10)², cooldown 24 ชม., คืน stat ฟรีถ้ากลับภายใน 7 วัน)
- **งานของคน:** ตั้งค่า OAuth client ใน Google / Apple developer console

### F08 — Server-authoritative Run และ Inventory
- **Lead:** backend-programmer · **ร่วม:** tech-lead, gameplay-programmer, location-engineer, qa-tester
- **ส่งมอบ:** API claim / run / inventory, client batch ส่งทุก 1 นาที, server validate movement gate จาก GPS trace ย้อนหลัง, แยก run state กับ connection state, รับ offline evidence ไม่เกิน 30 นาที, `position_log` TTL 24 ชม.
- **เกณฑ์ผ่าน:** ตัวอย่าง GDD (เดิน 20 นาที หลุด 5 นาที เดินต่อ 5 นาที) ให้รางวัลถูกต้อง · client แก้ค่ารางวัลเองไม่ได้

### F09 — Nearby Party และ Co-op
- **Lead:** backend-programmer · **ร่วม:** gameplay-programmer, systems-designer, uiux-designer, narrative-designer, vfx-animator, qa-tester
- **ส่งมอบ:** party ≤8 คน, รายการ Nearby Party (แสดงแค่จำนวน + role), ลำดับจับคู่ 5 ขั้น + สร้างอัตโนมัติ, buff stacking แบบ diminishing return นับเฉพาะคนที่อยู่ใน dungeon, debuff เมื่อขาด role, quick command 10 อัน + icon + animation, บล็อกแล้วไม่จับคู่อีก
- **เกณฑ์ผ่าน:** party ครบ role ได้รางวัลต่อหัว 1.8–2.2 เท่าของคนเล่นคนเดียวใน simulator และใน integration test

---

## Phase 4 — Progression + Economy

### F10 — Level, Stat และอุปกรณ์
- **Lead:** systems-designer (spec) → gameplay-programmer + backend-programmer (build)
- **ส่งมอบ:** exp curve `60×L^2.2`, 3 แต้มต่อเลเวล, stat ATK / DEF / HP / VIT, อุปกรณ์ 4 ช่อง tier 1–5, avatar 2D layered 3 มุมพร้อมชุดประดับ, badge

### F11 — ตีบวก วัตถุดิบ NPC และยา
- **Lead:** systems-designer · **ร่วม:** backend-programmer, uiux-designer, narrative-designer, vfx-animator, sound-designer
- **ส่งมอบ:** ตารางโอกาสตีบวก, ระบบสะสมความล้มเหลว, ของไม่แตก, ต้นทุนวัตถุดิบ + gold, ราคาขาย NPC, ยา 4 ขนาด, copy ของระบบตีบวกแบบ "ซื่อสัตย์"

### F12 — ตลาดไม่ระบุตัวตนและภาษี
- **Lead:** backend-programmer · **ร่วม:** systems-designer, uiux-designer, qa-tester, liveops-operator
- **ส่งมอบ:** listing แบบ pool รวม, ภาษีขั้นบันได 10 / 18 / 26 / 35% รีเซ็ตเที่ยงคืน, กรอบราคา ±40% จากค่าเฉลี่ย 7 วัน, บัญชีอายุต่ำกว่า 7 วัน trade ไม่ได้, เพดานมูลค่าโอนต่อวันตามเลเวล, ห้าม trade gold ตรง
- **เกณฑ์ปิด Phase 4:** economy simulation 30 วันจำลองได้รายได้ราว 1,470 gold/ชม. เทียบค่ายา 600 และอัตราส่วนรายได้ต่อค่ายาอยู่ในช่วง config (ต่ำสุด 2.45, เป้า 2.5–3) ตาม D-005

---

## Phase 5 — หลังบ้าน (ต้องเสร็จก่อน closed beta)

### F13 — สิทธิ์และธรรมาภิบาล
- **Lead:** backend-programmer · **ร่วม:** tech-lead, uiux-designer, devops-engineer, qa-tester
- **ส่งมอบ:** role Viewer / Moderator / Curator / Admin, บังคับ 2FA, กฎสองคน (เสนอกับอนุมัติคนละคน), audit log ทุก action พร้อมย้อนกลับ, ห้ามค้นผู้เล่นจากตำแหน่ง, ดูข้อมูลรายบุคคลต้องกรอกเหตุผล

### F14 — สร้าง Dungeon และระบบความปลอดภัย
- **Lead:** location-engineer · **ร่วม:** level-designer, uiux-designer, backend-programmer, qa-tester
- **ส่งมอบ:** editor วาด polygon พร้อม validation ตอนวาด (ไม่ทับถนนใหญ่ ทางรถไฟ แหล่งน้ำ ทางด่วน / ไม่ทับกัน / พื้นที่ 3,000–150,000 ตร.ม. / มีทางเข้าจากทางเท้า / blocklist), preset, dungeon ชั่วคราวมีวันหมดอายุบังคับ, ปุ่มปิดฉุกเฉินกดได้คนเดียว มีผลภายในไม่กี่วินาที, ชื่อทุกอย่างมาจากหลังบ้าน

### F15 — Live Config, Dashboard และคิวรายงาน
- **Lead:** backend-programmer · **ร่วม:** product-manager, liveops-operator, systems-designer, uiux-designer
- **ส่งมอบ:** แก้ค่า balance ได้โดยไม่ deploy, dashboard เศรษฐกิจ, ตัวชี้วัดต่อ dungeon, heatmap ผู้เล่นระดับรวม, คิวรายงานจากผู้เล่นพร้อมสถิติรายงานซ้ำ

---

## Phase 6 — Raid Boss

### F16 — Raid Core Engine
- **Lead:** backend-programmer · **ร่วม:** tech-lead, systems-designer, devops-engineer, qa-tester
- **ส่งมอบ:** Durable Object ตัวเดียวถือ HP กลาง, สูตร contribution (POW × presence × survival × party), tick 10 วินาที batch ทุกนาที, จุดเกิด 5–8 จุด HP bar เดียว, bossHP จากข้อมูลสัปดาห์ก่อน (α จาก config), popup เลือก dungeon หรือ boss
- **เกณฑ์ผ่าน:** load test 5,000 ผู้เล่นจำลองผ่านโดยไม่พุ่งเกินงบ infra ที่ devops กำหนด

### F17 — ประสบการณ์ระหว่าง Raid
- **Lead:** gameplay-programmer · **ร่วม:** uiux-designer, vfx-animator, sound-designer, narrative-designer
- **ส่งมอบ:** HP bar realtime, อันดับ contribution สด, สั่นเตือนทุก checkpoint, แจ้งเตือนล่วงหน้าหลายวัน, เตือนเมื่อเหลือ 30 นาทีและ HP ยังไม่ถึง 75%

### F18 — รางวัล Raid และผลรายสัปดาห์
- **Lead:** systems-designer · **ร่วม:** backend-programmer, artist-2d, liveops-operator
- **ส่งมอบ:** checkpoint 25 / 50 / 75 / 100% × ตัวคูณ percentile, ของบอส tier 5 bind on pickup + effect เฉพาะ, ล้มไม่สำเร็จ → dungeon ×2 + drop ×1.6–2.0 + บอสสัปดาห์หน้าอ่อนลง 15%

---

## Phase 7 — Anti-cheat + PDPA + Closed Beta

### F19 — Anti-cheat 5 ชั้น
- **Lead:** location-engineer · **ร่วม:** backend-programmer, systems-designer, qa-tester
- **ส่งมอบ:** ความเป็นไปได้ทางกายภาพ (sample ต่อเนื่อง 60 วินาทีก่อนเข้า, accuracy < 30 ม., speed lock 25 กม./ชม.), GPS noise fingerprint, trust score แทนการแบน, ธงบัญชีที่ผลิตเกิน p99 ของ cohort
- **เกณฑ์ผ่าน:** ชุด trace โกง (teleport, spoof นิ่ง, หลายบัญชีเครื่องเดียว, ขับรถ) ถูกจับได้ทั้งหมด · trace เดินจริงไม่โดน false positive

### F20 — PDPA และความปลอดภัยผู้เล่น
- **Lead:** backend-programmer · **ร่วม:** uiux-designer, narrative-designer, product-manager, qa-tester
- **ส่งมอบ:** consent location แยก, TTL `position_log` 24 ชม., ปุ่มลบบัญชีที่ลบจริง, โครง parental consent flow (อายุ 15+), รายงานและบล็อก, ร่าง privacy policy
- **งานของคน:** ปรึกษานักกฎหมายเรื่องผู้เยาว์และข้อมูลตำแหน่งก่อนเปิดจริง

### F21 — Closed Beta
- **Lead:** producer · **ร่วม:** ทุก role
- **ส่งมอบ:** beta runbook, คัดย่านจาก F01, telemetry ครบ, รอบจูน balance, triage bug
- **งานของคน:** หาผู้ทดสอบ 20–50 คนในย่านเดียวกันและรัน beta จริง

---

## Phase 8 — Native wrap และเปิดตัว

### F22 — Capacitor Native Wrap
- **Lead:** tech-lead · **ร่วม:** location-engineer, gameplay-programmer, devops-engineer, qa-tester
- **ส่งมอบ:** Capacitor LocationProvider, นับ movement ตอนล็อกจอได้, push notification, วัดแบต
- **งานของคน:** บัญชี Apple / Google developer และการ submit store

### F23 — เปิดตัวรายย่านและโซนดำ
- **Lead:** product-manager · **ร่วม:** level-designer, narrative-designer, liveops-operator, uiux-designer
- **ส่งมอบ:** แผนเปิด 2–3 ย่าน, ลงทะเบียนความสนใจนอกพื้นที่ + เกณฑ์เปิดจังหวัด, copy store listing

### F24 — Live Ops Program
- **Lead:** liveops-operator · **ร่วม:** level-designer, systems-designer, narrative-designer, product-manager
- **ส่งมอบ:** ปฏิทิน event, dungeon rotation, pipeline เนื้อหาบอสรายสัปดาห์, จัดการ sponsored dungeon พร้อมป้ายบอกผู้เล่น, เฝ้าดูอัตราหายของผู้เล่นเลเวล 50+ หลังสัปดาห์ที่ 4

---

## การมีส่วนร่วมของแต่ละ role ต่อ phase

L = lead อย่างน้อย 1 feature · S = support · R = reviewer (gate)

| Role | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| game-director | L R | R | R | R | R | R | R | R |
| narrative-designer | S | S | S | S | — | S | S | S |
| level-designer | S | S | — | — | S | — | S | S |
| systems-designer | S | S | S | L | S | L | S | S |
| tech-lead | L R | R | R | R | R | R | R | L |
| gameplay-programmer | S | L | S | S | — | L | S | S |
| backend-programmer | — | — | L | L | L | L | L | S |
| location-engineer | L | S | S | — | L | — | L | S |
| devops-engineer | S | S | S | — | S | S | S | S |
| art-director | S R | R | R | R | — | R | — | R |
| artist-2d | S | S | S | S | — | S | — | S |
| vfx-animator | — | S | S | S | — | S | — | — |
| uiux-designer | S | S | S | S | S | S | S | S |
| sound-designer | S | S | S | S | — | S | — | — |
| producer | S | S | S | S | S | S | L | S |
| qa-tester | S | R | R | R | R | R | R | R |
| product-manager | S R | S R | R | R | S R | R | S R | L |
| liveops-operator | S | — | — | S | S | S | S | L |
