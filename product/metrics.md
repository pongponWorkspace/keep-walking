# Metrics Framework — GPS Dungeon กรุงเทพฯ

Task: P1-F03-T19 · เจ้าของ: product-manager · สถานะ: ฉบับเสนอ รอ Design gate B (P1-F03-T25) · วันที่: 2026-09-23
แหล่งอ้างอิง: `CLAUDE.md` ("Metrics the GDD asks for"), `design/pillars.md`, `design/ux/flows/F03-core-loop.md`, `design/ux/ia.md`, `product/prd/F01-coverage-survey.md` หัวข้อ 6, `design/systems/sim-report.md` (F-16, F-17), `docs/adr/0002-backend-stack.md` หัวข้อ 4–5 (เพดาน free tier), `product/reviews/F02-spike-criteria.md` หัวข้อ 4 (S3, ข้อสังเกต battery/screen lock)
คู่กัน: `product/telemetry-events.md` (ชื่อ event จริงที่ programmer emit)

หลักการอ่านเอกสารนี้: ตัวเลขเป้า/guardrail ทุกตัวเป็นสมมติฐานเริ่มต้นของ product-manager (Phase 1 ยังไม่มีผู้เล่นจริง ไม่มีข้อมูล live ให้ตั้งเป้าจากของจริง) ปรับได้เมื่อมีผล playtest/live ตาม decision authority "feature priority, metrics" ของ product-manager (protocol ข้อ 5) — เปลี่ยน pillar หรือ non-negotiable ต้องผ่าน game-director/HUMAN เสมอ ตัวเลขที่เชื่อมกับ config balance (เช่น ราคายา, อัตราปลด) อ้างเป็น `config: <key>` เพื่อไม่ให้ hardcode ซ้ำ (NN-3)

## สารบัญ
1. North star
2. โครงสร้าง metric tree (6 หมวด)
3. หมวด Onboarding
4. หมวด Social
5. หมวด Economy
6. หมวด Progression
7. หมวด Places
8. หมวด Seasonality
9. Guardrails สรุปรวม
10. ความเสี่ยงต่อการวัดผล (confound)
11. สถานะ instrument ได้จริงตาม phase
12. สมมติฐานและคำถามค้าง

## 1. North star

**นาทีเดินที่ validate แล้ว ต่อสัปดาห์ ต่อผู้เล่น active** (validated walking minutes per active player per week)

- **คำนวณจาก:** ผลรวมเวลาที่ run อยู่ในสถานะ Active (`S-03-run`) ในหน้าต่างที่ผ่าน movement gate อย่างน้อย 1 ครั้ง (อ้างจาก `config: dungeons.movementGate.*`) หารด้วยจำนวนผู้เล่น active ที่ไม่ซ้ำในสัปดาห์เดียวกัน (active = เข้า dungeon ให้ผลเป็น run อย่างน้อย 1 ครั้งในสัปดาห์นั้น)
- **คำนวณที่ server เท่านั้น** ไม่ใช้เวลาที่ client รายงานเอง เพราะต้องผูกกับ movement gate เดียวกับที่ตัดสินรางวัลจริง (NN-1, NN-2, หลักการข้อ 2 ของ GDD "รางวัลผูกกับการเคลื่อนไหวจริงเสมอ") — ป้องกันไม่ให้ "เวลาที่แอปเปิดค้าง" ถูกนับเป็นการเดิน
- **เหตุผลที่เลือกตัวนี้:** ตรงกับเป้าหมายเดียวของเกมใน `design/pillars.md` หัวข้อ 1 ("เกมนี้มีขึ้นเพื่อให้คนออกไปเดิน") และแยกแยะ "คนเปิดแอปบ่อย" ออกจาก "คนเดินจริง" ได้ ต่างจาก DAU/session length ที่โกงได้ด้วยการเปิดแอปทิ้งไว้เฉยๆ
- **ไม่รวม** เวลาที่บ้าน (ตีบวก/ตลาด) เพราะไม่ใช่การเดิน (pillars 7.3 ข้อ 1: ห้ามให้รางวัลที่บ้านโดยไม่ผ่าน movement gate — ตรรกะเดียวกันใช้กับ metric นี้)
- **Confound สำคัญที่ต้องอ่านคู่กันเสมอ:** ดูหัวข้อ 10.1 — บนเว็บ v1 การล็อกหน้าจอหยุดนับ movement (ตาม GDD "สัญญาณขาดและแอปถูกปิด") ทั้งที่ pillar P4 ("มือถืออยู่ในกระเป๋า") ตั้งใจให้ผู้เล่นเก็บมือถือระหว่างเดิน ตัวเลขนี้จึงมีแนวโน้ม**ต่ำกว่า**การเดินจริงจนกว่าจะมี Wake Lock หรือ native wrap (F22) — ห้ามอ่านตัวเลขนี้เป็นค่าสัมบูรณ์ของพฤติกรรมจริงโดยไม่กางหมายเหตุนี้

หน่วยนับจริงมาจาก event `run_tick_granted` (ดู `product/telemetry-events.md`) คูณระยะเวลาที่ Active ต่อ tick — สูตรฝั่ง server เป็นของทีม backend (F05 movement gate) เอกสารนี้กำหนดแค่นิยามระดับ product

## 2. โครงสร้าง metric tree (6 หมวด)

North star อยู่บนสุด แตกเป็น 6 หมวดตาม `CLAUDE.md` "Metrics the GDD asks for": Onboarding, Social, Economy, Progression, Places, Seasonality แต่ละหมวดมี metric หลัก + guardrail ของตัวเอง + event ที่ผูก (ชื่อเต็มอยู่ `product/telemetry-events.md`)

| หมวด | คำถามที่หมวดนี้ตอบ | ผูกกับ north star อย่างไร |
| --- | --- | --- |
| Onboarding | คนใหม่ไปถึงนาทีที่ 10 (tick แรก) กี่% แล้วหลุดตรงไหน | คนที่ไม่ผ่าน onboarding ไม่มีทางสร้างนาทีเดินได้เลย เป็นคอขวดต้นทาง |
| Social | คนเล่นกับคนอื่นแค่ไหน (ขนาด party, สัดส่วนรางวัลจาก full-role party) | party ครบ role มี buff ที่ช่วยให้อยู่รอดนานขึ้นและกลับมาเล่นซ้ำเพราะสนุกกว่าเล่นคนเดียว |
| Economy | gold เข้า/ออกสมดุลไหม ค่ายาเงินเฟ้อแค่ไหน | เงินเฟ้อสูง = เดินเก็บของแล้วซื้อของไม่ไหว ความคุ้มค่าของการเดินลดลง |
| Progression | ถึงเลเวล 30/60 เร็วแค่ไหน คนเลเวลสูงหายไหมหลังสัปดาห์ 4 | คนเลเวลสูงคือคนที่สะสมนาทีเดินมากที่สุด ถ้าหายไป north star ตกทั้งฐาน |
| Places | dungeon แต่ละแห่งมีคนเข้าเท่าไร อยู่นานแค่ไหน ตายบ่อยไหม | บอกว่า node ไหนของแผนที่สร้างนาทีเดินได้จริง ใช้วางแผนขยาย coverage |
| Seasonality | ฝนตกแล้ว DAU ตกไหม คนย้ายไปกิจกรรมที่บ้านแค่ไหน | ฝน 6 เดือน/ปีตาม GDD คือช่วงที่ north star เสี่ยงตกเป็นวัฏจักร ต้องแยกสัญญาณจริงจากสัญญาณตามฤดู |

Legend สถานะ instrument (ดูตารางเต็มหัวข้อ 11): **Phase 1–2** = มีชื่อ event พร้อมให้ programmer emit ทันทีที่ F04–F06 build · **Phase 3+** = รอระบบที่ยังไม่มี (party F09, market F12, progression เต็มรูป F10/F11, raid F16–18) ก่อนจะมี event จริง แต่ metric/เป้าหมายกำหนดไว้แล้วในเอกสารนี้เพื่อไม่ต้องออกแบบใหม่ทีหลัง

## 3. หมวด Onboarding

ที่มา: `design/ux/flows/F03-core-loop.md` Flow A (นาที 0–10), `product/prd/F01-coverage-survey.md` หัวข้อ 6 (ชื่อ event ตรงนี้ต้องคงตามที่ PRD F01 เสนอไว้แล้ว)

### 3.1 Funnel นาที 0–10 (ตามช่วงที่ CLAUDE.md กำหนด: 0–1 / 1–3 / 3–6 / 6–8 / 8–10)

| ขั้น | ช่วง | Metric | เป้าเริ่มต้น (สมมติฐาน รอ playtest ปรับ) | Event |
| --- | --- | --- | --- | --- |
| เห็น intro → ให้ consent location | 0–1 | % ที่กด "อนุญาต" ต่อจาก intro | ≥ 70% | `onboarding_funnel_step` (step=consent_location) |
| ผ่าน permission เบราว์เซอร์ (native prompt) | 0–1 | % ที่กด Allow ต่อจากคนที่ให้ consent แล้ว | ≥ 60% | `onboarding_funnel_step` (step=permission_browser) |
| ผ่าน age gate + login | 0–1 | % ที่ login สำเร็จต่อจากคนที่ผ่าน permission | ≥ 90% (ตัดคนอายุต่ำกว่าเกณฑ์ออกจากฐานนับ) | `onboarding_funnel_step` (step=login) |
| เลือกพลัง | 0–1 | % ที่เลือก class ต่อจากคน login สำเร็จ | ≥ 98% | `onboarding_funnel_step` (step=class_select) |
| เห็นแผนที่ครั้งแรก | ปิดนาที 0–1 | % ที่ถึง `S-01-map` | = % ที่เลือกพลัง (ไม่มีขั้นคั่น) | `onboarding_funnel_step` (step=map_view) |
| เดินถึงขอบ dungeon (popup confirm เปิด) | 1–3 | % ที่เห็นแผนที่แล้วเดินถึงภายใน session แรก | ≥ 40% ในย่านที่ผ่านเกณฑ์ Go ของ F01 (ดูความเชื่อมโยงกับ `onboarding_nearest_dungeon_distance` หัวข้อ 3.2) | `dungeon_confirm_shown` |
| กด "เข้า" | 3–6 | % ที่กดเข้าเมื่อ popup เปิด | ≥ 85% | `dungeon_entered` |
| ได้ tick แรก | 8–10 | % ที่ผ่าน movement gate รอบแรก | ≥ 70% ของคนที่เข้า run (ที่เหลือคือ "เดินไม่พอรอบแรก" ไม่ใช่ drop-off เด็ดขาดเพราะ run ยังดำเนินต่อ) | `onboarding_first_reward_granted` |

Metric รวม **"onboarding completion rate"** = ผลคูณของทุกขั้นข้างต้น (intro → tick แรก) รายงานทุกสัปดาห์แยกตามย่านเปิดตัว

### 3.2 หน้าจอว่างและคนไกล/นอกพื้นที่ (ชื่อ event คงตาม PRD F01 §6 ตามที่ตกลงไว้ก่อนหน้า)

| Metric | คำนวณจาก | เป้า/guardrail | Event |
| --- | --- | --- | --- |
| ระยะถึง dungeon ใกล้สุดตอนเปิดแอปครั้งแรก แจกแจงเป็นโซนเขียว/เหลือง/แดง | client คำนวณระยะ ส่งเฉพาะ bucket ไม่ส่งพิกัด | ไม่มีเป้าเดี่ยว ใช้เป็น distribution เทียบกับ coverage report ของ F01 | `onboarding_nearest_dungeon_distance` |
| **Guardrail (ผูกกับเกณฑ์เปิดตัว G4/S3 ของ F01):** สัดส่วนผู้เล่นใหม่ที่เห็น `distance_band=red` ตอนเปิดแอปครั้งแรกในย่านที่เปิดตัวแล้ว | นับ `distance_band=red` จาก `onboarding_nearest_dungeon_distance` หารด้วยผู้เล่นใหม่ทั้งหมดในย่านนั้น | ≤ ค่าเดียวกับเกณฑ์ที่ HUMAN ใช้ตัดสิน Go จริงตอนปิด F01 (PRD F01 §4.1 G4 ≤5% ถ้า Go ล้วน หรือ §4.2 S3 ≤15% ถ้า Go พร้อมทางเสริม) — บันทึกค่าที่ใช้จริงไว้ในผลของ P1-F01-T11 แล้วอัปเดตเลขนี้ให้ตรงกันเสมอ (ไม่ปล่อยให้ตัวเลขเปิดตัวกับตัวเลขเฝ้าระวังหลังเปิดตัวต่างกัน) | `onboarding_nearest_dungeon_distance` |
| อัตราปิดแอปบนหน้าจอว่างเมื่อ dungeon ไกล/นอกพื้นที่ | `onboarding_empty_screen_abandoned` หารด้วย `onboarding_empty_screen_shown` แยกตาม `reason` | ≤ 50% (สูงกว่านี้แปลว่าหน้า fallback ไม่ชวนเดินพอ ต้องปรับ copy/design ตาม pillars 7.4 — ส่ง handoff ถึง uiux-designer/narrative-designer) | `onboarding_empty_screen_shown`, `onboarding_empty_screen_abandoned` |
| การลงทะเบียนความสนใจนอกพื้นที่ | นับจำนวนต่อจังหวัดต่อวัน | ไม่มีเป้าตัวเลขในเอกสารนี้ ใช้เป็น input ตรงของ F23 (เกณฑ์เปิดจังหวัดถัดไป) | `interest_registered_outside_area` |

Privacy ของทุก event ในหมวดนี้: ไม่มีพิกัด ไม่มี dungeon id เดี่ยวของผู้เล่น ยกเว้น dungeon ปลายทางที่ระบบแนะนำ (ไม่ใช่ตำแหน่งผู้เล่น) — ตรงตาม PRD F01 §6 ทุกประการ (ห้ามเปลี่ยนชื่อ event เหล่านี้)

## 4. หมวด Social

ที่มา: pillars P3, `design/ux/flows/F03-core-loop.md` Flow A นาที 6–8, `design/ux/ia.md` U6

| Metric | คำนวณจาก | เป้า/guardrail | Event | Phase พร้อมใช้ |
| --- | --- | --- | --- | --- |
| ขนาด party เฉลี่ย (cold start แสดงเป็น party ขนาด 1) | เฉลี่ย `party_size` จาก `run_tick_granted`/`party_formed` ต่อ run | **Guardrail:** ไม่มีเป้าตายตัว (ขึ้นกับความหนาแน่นจริงของย่าน) แต่ถ้าค่าเฉลี่ยทั้งระบบ ≤ 1.2 ติดต่อกัน 4 สัปดาห์หลังเปิดตัว = สัญญาณ cold start รุนแรง ส่ง handoff ถึง level-designer/game-director พิจารณาความหนาแน่น dungeon ในย่านเปิดตัว | `run_tick_granted`, `party_formed` | Phase 3 (F09) |
| สัดส่วนรางวัลที่ได้ในสถานะ full-role party (ครบ 4 class) เทียบรางวัลทั้งหมด | `run_tick_granted` ที่ `full_role=true` หารด้วยทั้งหมด | ไม่ตั้งเป้าตัวเลขใน Phase 1 เก็บ baseline เดือนแรกหลัง F09 เปิดใช้งานก่อนตั้งเป้า | `run_tick_granted` | Phase 3 (F09) |
| อัตราการเข้าร่วม Nearby Party เมื่อมีคนอยู่แล้ว | `party_formed` หารด้วยจำนวนครั้งที่ `dungeon_confirm_shown` มี `roles_present` ไม่ว่าง | ≥ 60% (โอกาสกดง่ายและได้ buff ฟรี ควรถูกใช้เกือบทุกครั้งที่เจอ) | `party_formed`, `dungeon_confirm_shown` | Phase 3 (F09) |

ไม่มี event ใดในหมวดนี้เก็บชื่อ ตำแหน่ง หรือ id รายบุคคลของผู้เล่นอื่น (NN-4) — เก็บได้แค่จำนวนและ role ระดับ dungeon เท่านั้น

## 5. หมวด Economy

ที่มา: GDD "Economy", `design/systems/sim-report.md` (F-16), D-005 (อัตราส่วนรายได้ต่อค่ายา 2.45 เท่า ยอมรับใน tolerance)

| Metric | คำนวณจาก | เป้า/guardrail | Event | Phase พร้อมใช้ |
| --- | --- | --- | --- | --- |
| gold เข้า/ออกต่อวัน (ทั้งระบบ) | ผลรวม `economy_gold_earned.amount` เทียบ `economy_gold_spent.amount` ต่อวัน | ไม่มีเป้าเดี่ยว ใช้คู่กับ D-005 (อัตราส่วนรายได้ต่อค่ายา ~2.45 เท่า ในเป้า) เพื่อดูว่าเศรษฐกิจ drift จากที่ simulator ทำนายไหมหลังมีผู้เล่นจริง | `economy_gold_earned`, `economy_gold_spent` | Phase 3–4 (F08, F11) |
| ราคาเฉลี่ยต่อไอเทมในตลาดผู้เล่น | เฉลี่ย `price` ของ `market_trade_completed` ต่อ `item_rarity` ต่อวัน | ไม่มีเป้าเริ่มต้น ใช้ baseline สัปดาห์แรกหลัง `config: unlocks.market` ปลด | `market_trade_completed` | Phase 4 (F12) |
| แนวโน้มราคายา (inflation) | ราคาขาย NPC ปัจจุบัน + ราคาขายต่อในตลาดผู้เล่น เทียบ baseline ตั้งต้นใน config | **Guardrail:** ราคายาที่ผู้เล่นจ่ายจริง (NPC หรือตลาด) เบี่ยงจาก `config: economy.*` ตั้งต้นไม่เกิน ±20% โดยไม่มี decision ของ game-director — ผูกกับกติกา protocol ข้อ 5 ("systems-designer, game-director อนุมัติเมื่อเกิน ±20% ของค่า GDD") | `economy_potion_price_observed` | Phase 4 (F11) |
| **Guardrail F-16 — gold สุทธิของ party เทียบคนเดียว:** sim-report วัดได้ 1.8–9 เท่าของคนเดียว (Tanker 3.65×, Ranged 1.77×, Support 6.99×, Magic 9.14×) เพราะ party ครบ role แทบไม่ต้องซื้อยา แม้รางวัลต่อหัวยังอยู่ในเป้า | เทียบ `(economy_gold_earned − economy_gold_spent)` เฉลี่ยต่อหัวของ run ที่ `full_role=true` กับ run เดี่ยว (`party_size=1`) | ไม่ต้อง action ทันทีตาม sim-report แต่ **เฝ้าดูหลัง beta** — ถ้าสัดส่วนจริงเกิน 9 เท่าต่อเนื่องหลายสัปดาห์ ส่ง handoff ถึง systems-designer พิจารณาคุม gold ที่ไหลเข้าเศรษฐกิจส่วนกลาง (หลักการข้อ 1 ของ GDD "ไม่จำกัดสิ่งที่ผู้เล่นได้ จำกัดเฉพาะสิ่งที่ไหลเข้าเศรษฐกิจส่วนกลาง") | `run_tick_granted` + `economy_gold_earned`/`economy_gold_spent` | Phase 3–4 (F08–F09, F11) |

## 6. หมวด Progression

ที่มา: GDD "Progression", `design/systems/sim-report.md` (F-17), CLAUDE.md ("time to level 30 and 60", "share of Level-50+ players lost after week 4")

| Metric | คำนวณจาก | เป้า/guardrail | Event | Phase พร้อมใช้ |
| --- | --- | --- | --- | --- |
| เวลาเฉลี่ยถึงเลเวล 30 / 60 | timestamp diff ของ `player_level_up` (level=30, 60) จากวันสร้างบัญชี | เทียบกับตารางที่ simulator สร้าง (`design/systems/sim-report.md`, P1-F03-T07/T08) — ไม่ fix เป็นตัวเลขใหม่ในเอกสารนี้ ใช้ค่าที่ systems-designer ยืนยันแล้วเป็น baseline | `player_level_up` | Phase 4 (F10) |
| สัดส่วนผู้เล่น Level 50+ ที่หายไปหลังสัปดาห์ 4 (churn) | cohort ผู้เล่นถึง level 50 ในสัปดาห์ W เทียบจำนวนที่ยัง active (มี run อย่างน้อย 1 ครั้ง) ในสัปดาห์ W+4 | **Guardrail:** ≤ 25% หายไป (สมมติฐานเริ่มต้น ปรับตามผล beta) — กลุ่มนี้คือคนสะสมนาทีเดินมากที่สุด การหายไปกระทบ north star ตรงที่สุดในบรรดา guardrail ทั้งหมด | `player_level_up` (กำหนด cohort) + event การเล่นทั่วไป (`dungeon_entered`) สำหรับตรวจ active | Phase 4 (F10) |
| **Guardrail F-17 — "แล้งของ" (drought):** sim-report วัดได้ว่าคนเดิน 40 นาที/วันที่ไม่มี Ranged ในทีมมีโอกาสรอ Epic เกิน 30 วัน 17.7% ของกรณี (Legendary เฉลี่ย 104 วัน) | นับช่วงเวลาระหว่างการได้ item rarity เดียวกันครั้งก่อนกับครั้งถัดไปจาก `loot_rarity_received` แยกตามว่า party มี Ranged หรือไม่ | ไม่ตั้งเป้าลดทันทีใน v1 (bad-luck protection เป็นทางเลือกของเฟสหลังตาม sim-report) — **เฝ้าดูเป็น churn risk**: ถ้าสัดส่วนจริงหลัง beta สูงกว่า 17.7% อย่างมีนัยสำคัญ ส่ง handoff ถึง game-director และ systems-designer พิจารณา bad-luck protection | `loot_rarity_received` | Phase 4 (F10–F11) |

## 7. หมวด Places

ที่มา: CLAUDE.md ("entries per day per dungeon, average time, death rate, party size, repeated reports"), `design/ux/ia.md` `S-17-report-block`

| Metric | คำนวณจาก | เป้า/guardrail | Event |
| --- | --- | --- | --- |
| entries ต่อวันต่อ dungeon | นับ `dungeon_entered` แยกตาม `dungeon_id` | ไม่มีเป้าเดี่ยว ใช้เทียบระหว่าง dungeon เพื่อวางแผนขยาย coverage (input ของ F01/F23) | `dungeon_entered` |
| เวลาเฉลี่ยต่อ run ต่อ dungeon | ค่าเฉลี่ย duration bucket ของ `dungeon_exited` ต่อ `dungeon_id` | ไม่มีเป้าเดี่ยว ใช้เทียบ preset (สวนใหญ่/ตลาด/สวนหย่อม ตาม `design/levels/presets.md`) | `dungeon_exited` |
| death rate ต่อ dungeon | จำนวน `run_death` หารด้วย `dungeon_entered` ต่อ `dungeon_id` | **Guardrail:** dungeon ใดมี death rate เกิน 2 เท่าของค่าเฉลี่ยทุก dungeon ที่ level range เดียวกัน ติดต่อกัน 2 สัปดาห์ → handoff ถึง level-designer/systems-designer ตรวจ balance หรือความปลอดภัยจริงของพื้นที่ | `run_death`, `dungeon_entered` |
| ขนาด party เฉลี่ยต่อ dungeon | เฉลี่ย `party_size_bucket` จาก `run_tick_granted` แยกตาม `dungeon_id` | ไม่มีเป้าเดี่ยว ใช้หา dungeon ที่ "เหงา" เกินไปเพื่อวางแผนความหนาแน่น | `run_tick_granted` |
| จำนวนรายงานซ้ำต่อ dungeon (ความปลอดภัยของสถานที่) | นับ `dungeon_report_submitted` แยกตาม `dungeon_id`/`reason_category` | **Guardrail:** dungeon ใดได้รับรายงานเกิน threshold ที่ตั้งไว้ใน `config: dungeons.safety.reportThreshold` (ให้ systems-designer เติมค่า) ภายในหน้าต่างเวลาเดียวกัน → ปิดชั่วคราวอัตโนมัติรอ moderator ตรวจ (เชื่อมกับ F13/F15 หลังบ้าน) | `dungeon_report_submitted` |

## 8. หมวด Seasonality

ที่มา: CLAUDE.md ("DAU during rain, at-home activity"), GDD "ข้อจำกัดที่กำหนดรูปร่างของ design" (ฝนตก 6 เดือน/ปี)

| Metric | คำนวณจาก | เป้า/guardrail |
| --- | --- | --- |
| DAU ช่วงฝนเทียบ DAU ช่วงแห้ง | join ข้อมูล DAU รายวัน (จาก `dungeon_entered`/login) กับข้อมูลฝนสาธารณะตามวันที่ + เขต — **ไม่ใช่ event จาก client** เพราะเกมไม่มี sensor ตรวจฝนและการให้ client รายงานสภาพอากาศเสี่ยงเปิดช่องบอกใบ้ตำแหน่งทางอ้อม (ขัด NN-4/NN-7) | **Guardrail:** DAU ไม่ตกเกิน 30% เทียบค่าเฉลี่ยวันแห้งในสัปดาห์เดียวกัน (สมมติฐานเริ่มต้น) — ถ้าตกมากกว่านี้ ส่งเป็น input ให้ liveops-operator พิจารณากิจกรรมชดเชยที่บ้าน (ไม่ใช่การผ่อน movement gate ตาม NN-8 ข้อ 3) |
| กิจกรรมที่บ้าน (ตีบวก/ตลาด) ต่อวันเทียบ DAU รวม | `economy_gold_spent` (`sink=enhance` หรือ `market_buy`) หารด้วย DAU รายวัน | ไม่มีเป้าเดี่ยว แต่สัดส่วนที่สูงขึ้นในวันฝนคือสัญญาณดี (ผู้เล่นยัง engage แม้เดินไม่ได้) — ใช้เป็นหลักฐานว่ากิจกรรมที่บ้านทำหน้าที่ตามเจตนา pillars 7 ("ทำให้อยากออกไปเดิน ไม่ใช่ทดแทนการเดิน") ไม่ใช่ทางลัดให้เลิกเดินถาวร |

## 9. Guardrails สรุปรวม

รวม guardrail ทุกตัวจากหัวข้อ 3–8 ไว้จุดเดียวให้ liveops-operator และ game-director เฝ้าดูได้ในหน้าเดียว (SF-12 ตามที่ board กำหนด)

| # | Guardrail | หมวด | เป้า/เกณฑ์ | ที่มา |
| --- | --- | --- | --- | --- |
| GR-1 | สัดส่วน `distance_band=red` ตอนเปิดแอปครั้งแรกในย่านที่เปิดตัวแล้ว | Onboarding | ≤ ค่าเดียวกับ G4/S3 ที่ HUMAN เลือกใช้ตัดสิน Go (PRD F01) | PRD F01 §6 |
| GR-2 | อัตราปิดแอปบนหน้าจอว่าง (dungeon ไกล/นอกพื้นที่) | Onboarding | ≤ 50% | หัวข้อ 3.2 |
| GR-3 | ขนาด party เฉลี่ยทั้งระบบ | Social | เตือนถ้า ≤ 1.2 ติดต่อกัน 4 สัปดาห์ | หัวข้อ 4 |
| GR-4 | แนวโน้มราคายา (inflation) เทียบ config ตั้งต้น | Economy | เบี่ยง ≤ ±20% โดยไม่มี decision อนุมัติ | หัวข้อ 5 |
| GR-5 | gold สุทธิของ party ครบ role เทียบคนเดียว (F-16) | Economy | เฝ้าดู ไม่ควรเกิน 9× ต่อเนื่องหลาย สัปดาห์ | sim-report F-16 |
| GR-6 | สัดส่วนผู้เล่น Level 50+ ที่หายหลังสัปดาห์ 4 | Progression | ≤ 25% | หัวข้อ 6 |
| GR-7 | สัดส่วนคนไม่มี Ranged รอ Epic เกิน 30 วัน (F-17) | Progression | เฝ้าดู ไม่ควรสูงกว่า 17.7% อย่างมีนัย | sim-report F-17 |
| GR-8 | death rate ต่อ dungeon เทียบค่าเฉลี่ยกลุ่มเลเวลเดียวกัน | Places | ≤ 2 เท่า ติดต่อกัน 2 สัปดาห์ | หัวข้อ 7 |
| GR-9 | จำนวนรายงานซ้ำต่อ dungeon | Places | ≤ `config: dungeons.safety.reportThreshold` | หัวข้อ 7 |
| GR-10 | DAU ช่วงฝนเทียบวันแห้ง | Seasonality | ตกไม่เกิน 30% | หัวข้อ 8 |
| GR-11 | สัดส่วน tick ที่ไม่ผ่าน movement gate ต่อ run (แยกจาก S12 ของ spike ซึ่งวัดตอน dev เท่านั้น) | ข้ามหมวด (ผูก north star โดยตรง) | ไม่มีเป้าตายตัวใน Phase 1 เก็บ baseline หลัง F04–F06 live แล้วเทียบกับผล spike S12 (≥95% Go) เพื่อดูว่าตัวเลข production ตรงกับ spike ไหม | `product/reviews/F02-spike-criteria.md` S12 |
| GR-12 | **แบตต่อวันของผู้เล่น heavy-session (3–6 ชม./วัน)** | Onboarding/ความปลอดภัยผู้เล่น | ไม่มีเป้าเชิงตัวเลขที่ automate ได้เต็มรูปใน v1 เว็บ (ดูข้อจำกัดหัวข้อ 10.4) — ใช้ผลเดินทดสอบภาคสนาม (`qa/playtest/field-walk-form.md`) เป็นหลักฐานประกอบ target เชิงคุณภาพ: ผู้เล่นเวลามากต้องเล่นได้ทั้ง session (2–6 ชม.) โดยไม่ต้องพกพาวเวอร์แบงค์เพิ่มจากที่พกอยู่แล้วปกติ | `product/reviews/F02-spike-criteria.md` §4.2 (handoff จาก S3 ที่ No-go edge 15%/30 นาที) |

## 10. ความเสี่ยงต่อการวัดผล (confound)

### 10.1 Screen lock หยุดนับ movement (เว็บ v1) เทียบ pillar "มือถืออยู่ในกระเป๋า"

ตาม GDD "สัญญาณขาดและแอปถูกปิด" — v1 บนเว็บ **หยุดนับ movement ทันทีที่ล็อกหน้าจอ** เพราะ browser ไม่ให้ background location (ยืนยันซ้ำใน `design/ux/flows/F03-core-loop.md` หัวข้อ 8 และ `[ASSUMPTION A-P1-F03-T16-2]`) แต่ pillar P4 และ Flow C ของ core-loop ("มือถือเก็บกระเป๋าได้ทั้งหมด") ตั้งใจให้ผู้เล่นไม่ต้องจ้องจอ — `product/reviews/F02-spike-criteria.md` หัวข้อ 4.1 ชี้ความขัดแย้งนี้ไว้แล้วว่าถ้าจอล็อกอัตโนมัติระหว่างเดิน ผู้เล่นจะไม่ได้ tick ทั้งที่เดินอยู่จริง

**ผลต่อ metrics:**
- North star (หัวข้อ 1), GR-11 (tick fail rate), และ time-to-level (หัวข้อ 6) ทุกตัวมีความเสี่ยงถูกประเมิน**ต่ำกว่าจริง**ในกลุ่มที่ทำตามที่เกมสื่อสาร (เก็บมือถือในกระเป๋า) มากกว่ากลุ่มที่ถือจอค้างไว้ฝ่าฝืนสัญชาตญาณ
- ห้ามใช้ตัวเลข north star ของ Phase 1–2 (ก่อนมี Wake Lock/native wrap) เป็น baseline เปรียบเทียบตรงๆ กับตัวเลขหลัง F22 (Capacitor native wrap) เพราะเงื่อนไขทางเทคนิคเปลี่ยนไป ไม่ใช่พฤติกรรมผู้เล่นเปลี่ยน — ต้อง annotate ช่วงเวลาที่ metric dashboard ทุกครั้ง
- **ไม่เสนอแก้ด้วยการผ่อน movement gate หรือ auto-retreat** (NN-8 ข้อ 3 ห้ามผ่อน gate เพื่อชดเชยอย่างอื่น) — ทางแก้ที่ถูกต้องคือ UX (คำเตือนก่อนเข้า run ครั้งแรกให้ปลดล็อกจอ ตามที่ core-loop เสนอไว้แล้ว) หรือ Wake Lock API (ของ tech-lead พิจารณาใน Phase 2)
- ส่ง handoff ให้ tech-lead/game-director ตัดสินใจเรื่อง Wake Lock ก่อน M2 ตามที่ P1-F02-T27 ระบุไว้แล้ว (ไม่ block T19 นี้ แต่ metrics.md บันทึกไว้เป็นความเสี่ยงถาวรจนกว่าจะแก้)

### 10.2 ปริมาณ telemetry event ชนเพดาน free tier ของ backend

`docs/adr/0002-backend-stack.md` หัวข้อ 4–5 ระบุเพดานที่ชนก่อนคือ **rows written 100,000/วัน** ของ Durable Object storage (และ D1 แยกอีกก้อน) คิดเป็นความจุราว 650–666 ผู้เล่น-ชั่วโมง/วัน โควตารีเซ็ต 00:00 UTC (07:00 เวลาไทย) — telemetry event ทุกตัวที่เขียนเป็น row แยกจากข้อมูล gameplay หลักจะแย่งโควตาเดียวกันนี้

**ข้อกำหนดที่เอกสารนี้ตั้งไว้ก่อนส่งต่อ tech note (ไม่ใช่การตัดสินใจสถาปัตยกรรม แต่เป็นเงื่อนไขที่ tech-lead/backend-programmer ต้องออกแบบตาม):**
1. Event ที่เกิดถี่ที่สุด (`run_tick_granted`, `run_tick_denied` ทุก `config: dungeons.movementGate.window_s` = 300 วินาที) ต้อง**สืบมาจาก row ของ reward tick ที่มีอยู่แล้ว** ไม่ใช่เขียน row telemetry แยกอีกชุด — วิธีที่แนะนำ: ต่อ pipeline วิเคราะห์แยกออกจาก write path ของเกม (batch export รายชั่วโมง/วัน) ไม่ใช่ event stream แบบ real-time ต่อ tick
2. Event ที่ไม่ผูกกับ tick (onboarding funnel, party formed, dungeon report) เขียนเป็น batch เดียวกับที่ client อัปโหลด GPS sample อยู่แล้ว (ตาม `docs/tech/gps-trace-format.md`) ไม่เปิด connection ใหม่เฉพาะ telemetry
3. ถ้าปริมาณ telemetry จริงเกิน 5% ของโควตา rows written ในวันใด ให้ปิด sampling บาง event ที่ไม่ใช่ guardrail เด็ดขาด (เช่น `run_hp_low` สุ่มเก็บ 1 ใน N) ก่อนจะกระทบ event ที่ผูกรางวัลจริง — ห้ามลด sampling ของ event ที่คำนวณรางวัล (ขัด NN-2)
4. Alert 50%/70% ที่ ADR 0002 กำหนดให้ devops-engineer ตั้งไว้ (ก่อน playtest Phase 3) ต้องแยกแสดงสัดส่วนที่มาจาก telemetry เทียบ gameplay write เพื่อ debug ได้ว่าใครกินโควตา

ส่ง handoff รายละเอียดทางเทคนิคนี้ต่อ tech-lead ในรายงานท้ายเอกสาร — ไม่ block การประกาศชื่อ event ใน `product/telemetry-events.md`

### 10.3 ความละเอียดข้อมูลประชากรไม่เท่ากันระหว่างย่าน

ตาม PRD F01 §8 ข้อมูล WorldPop/HRSL อาจมี resolution ต่างกันระหว่างกรุงเทพฯ ชั้นในกับปริมณฑล — ตัวเลข onboarding funnel (หัวข้อ 3) ที่ตัดตามย่านจึงเปรียบเทียบข้าม tier ความละเอียดได้ไม่สมบูรณ์ ให้ระบุ resolution ของแต่ละย่านกำกับไว้ในรายงานเสมอเมื่อเทียบข้ามย่าน

### 10.4 Guardrail แบตบน iOS วัดผ่าน telemetry อัตโนมัติไม่ได้เต็มรูป

Battery Status API ใช้ได้เฉพาะ Chrome/Android (`A-P1-PLAN-01-6`) iOS Safari ไม่มี API นี้ — GR-12 (แบตของผู้เล่น heavy-session) จึงวัดอัตโนมัติทาง telemetry ได้เฉพาะฝั่ง Android เท่านั้น ฝั่ง iOS ต้องพึ่งแบบฟอร์มเดินทดสอบภาคสนาม (`qa/playtest/field-walk-form.md`, P1-F02-T14/T20) เป็นหลักฐานแทนจนกว่าจะมีทางเลือกทางเทคนิคอื่น — บันทึกไว้เป็นช่องว่างที่ยอมรับได้ของ v1 ไม่ใช่ bug ที่ต้องแก้ใน Phase 1

## 11. สถานะ instrument ได้จริงตาม phase

| หมวด | Phase 1–2 (F04–F06, มี event ให้ emit ได้ทันที) | Phase 3+ (รอระบบที่ยังไม่ build) |
| --- | --- | --- |
| Onboarding | ครบทั้งหมด: `onboarding_funnel_step`, `onboarding_first_reward_granted`, `onboarding_nearest_dungeon_distance`, `onboarding_empty_screen_shown`, `onboarding_empty_screen_abandoned`, `interest_registered_outside_area` | — |
| Places (บางส่วน) | `dungeon_entered`, `dungeon_exited`, `run_tick_granted`, `run_tick_denied`, `run_death`, `run_auto_retreat`, `run_hp_low`, `run_gps_status_changed` | `dungeon_report_submitted` เต็มรูป (ต้องมี moderation queue ของ F13/F15) |
| Social | — (ต้องรอ Nearby Party จริง) | `party_formed`, `run_tick_granted.full_role/roles_present`, `party_size_bucket` |
| Economy | — (ยังไม่มีตลาด/ตีบวกจริง) | `economy_gold_earned`, `economy_gold_spent`, `economy_potion_price_observed`, `market_trade_completed` |
| Progression | `player_level_up` (โครงพร้อมตั้งแต่ F10 เริ่ม Phase 4 แต่ schema event ประกาศไว้ตั้งแต่ตอนนี้) | `loot_rarity_received` (ผูกกับ drop table เต็มรูปของ F10/F11) |
| Seasonality | ไม่มี event ใหม่ (คำนวณจาก join ข้อมูลภายนอก + event ที่มีอยู่แล้วในหมวดอื่น) | — |

หลักการ: ประกาศชื่อ event ของ Phase 3–4 ไว้ล่วงหน้าใน `product/telemetry-events.md` แม้ยังไม่ emit จริง เพื่อไม่ให้ backend/gameplay ของ Phase 3–4 ต้องเสียเวลาออกแบบชื่อใหม่ หรือชนกับชื่อที่ product ตั้งใจใช้อยู่แล้ว (ตรงกับ protocol ข้อ 9 "Telemetry events: product-manager publishes ก่อน programmer emit")

## 12. สมมติฐานและคำถามค้าง

### สมมติฐาน
- A-P1-F03-T19-1: เป้าตัวเลขทั้งหมดในหัวข้อ 3–8 (เช่น ≥70% consent, ≤25% churn) เป็นสมมติฐานเริ่มต้นของ product-manager ไม่ได้อิงข้อมูลอุตสาหกรรมเฉพาะเกม location-based ของไทย ต้องทบทวนหลัง closed beta (F21, Phase 7) เป็นอย่างช้า (ยืนยัน: product-manager เอง, game-director ร่วมพิจารณาใน design gate B)
- A-P1-F03-T19-2: `run_tick_granted`/`run_tick_denied` ใช้เป็นทั้งฐานของ north star, GR-11 และ input ของ Social/Places/Economy พร้อมกัน (multi-purpose event) เพื่อลดจำนวน event รวมตามข้อกำหนดหัวข้อ 10.2 — ถ้า backend พบว่า schema เดียวรองรับ property ทั้งหมดที่ต้องการไม่ได้จริง ให้ tech-lead แยก event แล้ว handoff กลับมาที่ product-manager แก้ชื่อ (ยืนยัน: tech-lead, backend-programmer)
- A-P1-F03-T19-3: `config: dungeons.safety.reportThreshold` ที่ GR-9 อ้างถึงยังไม่มีอยู่จริงใน `config/balance/dungeons.json` ปัจจุบัน เป็นข้อเสนอ key ใหม่จากเอกสารนี้ ให้ systems-designer ยืนยัน/ตั้งชื่อจริง (ยืนยัน: systems-designer)
- A-P1-F03-T19-4: GR-5 (F-16) และ GR-7 (F-17) เป็น guardrail แบบ "เฝ้าดู" ไม่ใช่ "บล็อกการเปิดตัว" ตามที่ sim-report เสนอไว้แล้ว (ไม่ใช่การตัดสินใจใหม่ของเอกสารนี้ แค่ยืนยันสถานะ) (ยืนยัน: systems-designer, game-director)

### คำถามค้าง (ไม่ขวาง Phase 1)
- Q-T19-1: North star ควรแยกรายงานเป็นสองเส้น (ก่อน/หลัง Wake Lock หรือ native wrap) ในรายงานสาธารณะหรือเก็บเป็น annotation เดียวในรายงานภายใน — เสนอ: annotation ภายในพอสำหรับ Phase 1–2 ทบทวนอีกครั้งก่อนมี dashboard ให้ HUMAN ดูจริงใน Phase 3 (ส่งต่อ liveops-operator)
- Q-T19-2: เกณฑ์ตัวเลขของ GR-1 (ผูกกับ G4/S3 ของ F01) ยังไม่ fix เพราะ P1-F01-T11 (HUMAN) ยังไม่ปิด — เมื่อปิดแล้ว ต้องมีคน (product-manager เอง) กลับมาแก้ตัวเลขในเอกสารนี้ให้ตรงทันที ไม่ปล่อยให้เป็นเลขคนละชุด (ติดตามใน backlog ของ product-manager)
