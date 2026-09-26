# Brief asset ของ Phase 2 — GPS Dungeon กรุงเทพฯ

Task: P2-F05-T03 · เจ้าของ: art-director · สถานะ: พร้อมส่งต่อ · วันที่: 2026-09-26
ผู้ใช้เอกสารนี้: artist-2d (P2-F05-T07 ชุดไอคอน, P2-F05-T04 อวตาร), vfx-animator (P2-F05-T05), uiux-designer (P2-F04-T15, P2-F04-T06), gameplay-programmer (integration F04–F06), tech-lead (P2-F06-T07 validator และ asset delivery), qa-tester (contrast และตาบอดสี)
แหล่งอ้างอิง: `design/features/F04-dungeon-presence.md` (3.4, 3.5, 3.7, 4) · `design/features/F05-movement-gate-reward.md` (R10–R17, R25) · board detail P2-F06-T02 (F06) · `art/direction/style-guide.md` · `art/direction/icon-grammar.md` (7.1.1 glyph ใหม่) · `art/direction/asset-pipeline.md` (id, path, งบ, สถานะ) · `art/direction/map-style.md` · `art/vfx/specs/motion-direction.md` · `art/reviews/F03-visual-gate.md` (V-10..V-22) · D-076, D-077, D-089, D-093

ลำดับอำนาจ: GDD > roadmap > feature spec > style guide / icon grammar / asset pipeline > brief นี้ · ถ้า brief ขัดกับ icon-grammar หรือ asset-pipeline ให้ยึดเอกสารนั้นและแจ้ง art-director

## สารบัญ
1. ขอบเขตและกติกาที่ผูกทุกชิ้น
2. รายการ asset (id, ขนาด, layer, สถานะ)
3. Spec ต่อกลุ่มและ prompt
4. ข้อกำหนดกลางแดดและตาบอดสี (ตรวจบนจอได้ทุกเวลา)
5. ลำดับงานและการส่งต่อ
6. สมมติฐาน

## 1. ขอบเขตและกติกาที่ผูกทุกชิ้น

### 1.1 Phase 2 ต้องการภาพอะไร
loop ของ Phase 2 คือ เห็นรอยแยก → เดินไป → รอ check-in → เข้า → เดินจนได้ tick → HP ลด / ใช้ยา / ถอย → สรุป run · ภาพที่ต้องมีจึงเป็นไอคอนสถานะ ไอคอนไอเทมที่ drop กรอบ rarity และ badge class ที่เลือกในนาทีแรก · ไม่มี avatar ใหม่ ไม่มีมอนสเตอร์ (ไม่มีภาพศัตรูใน Phase 2) ไม่มีจอตีบวก ร้าน ตลาด หรือ party

### 1.2 กติกาจากการตัดสินใจที่ใช้กับทุกชิ้น
| # | กติกา | ที่มา | ผลต่อภาพ |
| --- | --- | --- | --- |
| K1 | ไม่มี motion วนใดในเกม · สถานะรอเป็นภาพนิ่ง + ข้อความ | D-076, style guide S7 | ไม่มี spinner, จุดวิ่ง, ขีดสัญญาณไล่ขั้น, ไอคอนหายใจ · ตัวนับถอยหลังเป็นข้อความที่เปลี่ยนค่า ไม่ใช่ motion |
| K2 | opacity ที่ค้างหรือวนห้าม · opacity ในช่วงเข้า/ออก ≤ 200 ms ได้ | D-077 | ไอคอน "จาง" ทำด้วยสีทึบ `ink.500` หรือ outline ไม่ใช่ alpha |
| K3 | นำทางด้วยลูกศรทิศและระยะเส้นตรงเท่านั้น ไม่วาดเส้นทางหรือเส้นตรงบนแผนที่ | D-089, F04-R36 | มีแค่ `icon.ui.direction` ในการ์ด · ห้ามภาพหรือ layer ที่ลากจากผู้เล่นไป dungeon |
| K4 | Phase 2 ซ่อนจำนวนคนและ role ทุกจุด | D-089, F04 2.4 | `icon.ui.party` และ badge class 20 px ไม่ขึ้นบนแผนที่หรือการ์ดใน Phase 2 · ห้ามภาพ placeholder ที่เป็น "0 คน" |
| K5 | ยามาจาก drop ของ tick ที่ผ่าน gate เท่านั้น | D-089, F05-R14 | ไอคอนยาใช้ในป้ายรางวัล tick, ถุงของ run, สรุป run · ไม่มีภาพชุดยาตั้งต้น ของขวัญ หรือร้าน |
| K6 | ไม่มีหลักฐานกลางแดดจัดจากสนามใน Phase 2 | D-093 | ทุกชิ้นต้องผ่านการตรวจแทนบนจอในหัวข้อ 4 ก่อนตั้ง `draft` · การทดสอบกลางแดดจริง (V-17) ยังค้างเป็นเงื่อนไขก่อน closed beta |
| K7 | ทุกชื่อและข้อความมาจาก config/copy key | NN-3, icon-grammar 3 | ไม่มีตัวอักษรหรือตัวเลขในไฟล์ภาพ · ไอคอนไอเทมผูกกับ config ด้วย `assets.icon` = manifest id |
| K8 | ไม่มีสัญลักษณ์ศาสนา สถาบัน การเมือง แบรนด์ | style guide 8.2 | รวมตัวอย่างผิดด้วย (กฎท้าย 8.2) |

### 1.3 คำศัพท์ในตาราง
**layer (ชั้นจอที่ asset ไปปรากฏ)**
| layer | คืออะไร | พื้นที่อยู่ข้างใต้ |
| --- | --- | --- |
| `L-map` | ภาพใน MapLibre sprite (วาดโดยแผนที่) | สีแผนที่ (`map.*`) |
| `L-card` | การ์ด dungeon บนจอแผนที่ (แตะรอยแยกแล้วขึ้น) | `bg.surface` |
| `L-popup` | popup confirm เข้า dungeon รวมสถานะรอ check-in | `bg.surface` |
| `L-header` | แถบบนของจอ run (สถานะ run, HP) | `bg.paper` / `bg.night` |
| `L-toast` | toast และ banner สั้น (ได้ tick, ใช้ยา, ใกล้ปิด) | `bg.surface` |
| `L-overlay` | overlay เต็มจอทับทุกอย่าง (speed lock, ตาย) | `bg.paper` หรือ `bg.night` ตามโหมด |
| `L-pocket` | จอพกกระเป๋า (พื้นมืดประหยัดแบต) | `bg.night` |
| `L-summary` | สรุป run และถุงของ run | `bg.paper` |
| `L-onboard` | จอเลือก class และ onboarding | `bg.paper` |

**สถานะเป้า** ใช้ค่าของ asset-pipeline 10 เท่านั้น (board เขียนว่า `placeholder`/`final` ให้ถือ `final` = `draft` ที่รอ content gate แล้วเป็น `approved`): `draft` = วาดจริงครบในงานนี้ · `placeholder` = ตำแหน่งและขนาดถูกแต่ภาพยังไม่จริง · `prompt-only` = มีแค่ prompt · ไม่ทำ = ไม่ต้องมีใน Phase 2
**ลำดับ** P0 = loop ใช้ไม่ได้ถ้าไม่มี · P1 = ควรมี มี fallback ข้อความได้ · P2 = ทำเมื่อมีเวลา

## 2. รายการ asset (id, ขนาด, layer, สถานะ)

path ของทุก id ตาม asset-pipeline 3.2 (`icon.ui.rift` → `art/assets/icon/ui/rift.svg`) · ขนาด = canvas (viewBox) / ขนาดที่แสดงบนจอเป็น CSS px · งบไฟล์ตาม asset-pipeline 7.1 · ชิ้นที่มีอยู่แล้วใน icon-grammar 7.1 แต่ยังไม่มีไฟล์ ถือเป็นงานวาดของ Phase 2 เท่ากับชิ้นใหม่

### 2.1 Class badge 4 class (12 ไฟล์)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `badge.class.tanker-48`, `badge.class.ranged-48`, `badge.class.support-48`, `badge.class.magic-48` | `badge-class` | 48 × 48 / 48 | `L-onboard` | จอเลือก class นาที 0–1 (F06) · หน้า profile | `draft` | P0 |
| `badge.class.tanker-32`, `badge.class.ranged-32`, `badge.class.support-32`, `badge.class.magic-32` | `badge-class` | 32 × 32 / 32 | `L-header`, `L-summary` | class ของตัวเองบนจอ run และสรุป run | `draft` | P1 |
| `badge.class.tanker-20`, `badge.class.ranged-20`, `badge.class.support-20`, `badge.class.magic-20` | `badge-class` | 20 × 20 / 20 | `L-map` (Phase 3) | ป้ายจำนวนต่อ role · **ไม่ขึ้นจอใน Phase 2** (K4) | `draft` | P1 · วาดตอนนี้เพราะการทดสอบตาบอดสีของ icon-grammar 6.3 วัดที่ 20 px |

### 2.2 กรอบ rarity 5 ระดับ (10 ไฟล์)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `frame.rarity.common-72`, `frame.rarity.uncommon-72`, `frame.rarity.rare-72`, `frame.rarity.epic-72`, `frame.rarity.legendary-72` | `frame-rarity` | 72 × 72 / 72 (ครอบ item 64) | `L-summary` | รายละเอียดไอเทมในสรุป run และถุงของ run | `draft` | P0 |
| `frame.rarity.common-52`, `frame.rarity.uncommon-52`, `frame.rarity.rare-52`, `frame.rarity.epic-52`, `frame.rarity.legendary-52` | `frame-rarity` | 52 × 52 / 52 (ครอบ item 48) | `L-toast`, `L-summary`, `L-pocket` | ป้ายรางวัลของ tick · รายการในสรุป run · จอพกกระเป๋า | `draft` | P0 |

chip ชื่อ rarity (icon-grammar 4.4) เป็น component CSS ของ uiux-designer ไม่ใช่ไฟล์ภาพ (หัวข้อ 2.10)

### 2.3 สถานะ dungeon 4 แบบ (เปิด, ใกล้ปิด, ปิดทำการ, กำลังเล่นอยู่)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `map.icon.rift-crack` | `map-icon` | 48 × 72 (2x) / 24 × 36 | `L-map` | รอยแยกที่เปิดบนแผนที่ · ไฟล์มีแล้ว แก้เป็น miter ในงานนี้ | ลงทะเบียน `draft` (ยังไม่อยู่ใน manifest) | P0 |
| `icon.ui.rift` · `icon.ui16.rift` | `icon-ui` | 24 / 24 และ 32 · 16 / 16 | `L-card`, `L-popup` | สถานะ "เปิด" หัวการ์ดและ popup | `draft` | P0 |
| `icon.ui.closing-soon` · `icon.ui16.closing-soon` | `icon-ui` | 24 / 24 · 16 / 16 | `L-card`, `L-popup`, `L-toast` | chip "ปิดในอีก N นาที" (F04-R28) และแจ้งระหว่าง run (F04-R29) | `draft` | P0 |
| `icon.ui.closed` · `icon.ui16.closed` | `icon-ui` | 24 / 24 และ 48 · 16 / 16 | `L-card`, `L-popup` | "ปิดทำการ" + เวลาเปิดถัดไปก่อนปุ่มนำทาง (F04-R27, R38) · แผงปิดเมื่อเดินเข้าเขต (48) | `draft` | P0 |
| `icon.ui.in-run` · `icon.ui16.in-run` | `icon-ui` | 24 / 24 · 16 / 16 | `L-header`, `L-card` | สถานะ Active ของ run และการ์ดของ dungeon ที่ run อยู่ | `draft` | P0 |
| `icon.ui.hours` | `icon-ui` | 24 / 24 | `L-card`, `L-popup` | นำหน้าบรรทัดเวลาทำการและเวลาเปิดถัดไป | `draft` | P1 |

### 2.4 ตัวนำทาง (ลูกศรทิศ ไม่ใช่เส้นทาง · A-3, D-089)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.direction` | `icon-ui` | 24 / 48 (การ์ด), 32 (onboarding) | `L-card`, `L-onboard` | ลูกศรทิศจากผู้เล่นไป dungeon คู่กับระยะเส้นตรงแบบปัดขึ้น (F04-R34, R36) | `draft` | P0 |
| `icon.ui.navigate` | `icon-ui` | 24 / 24 ในปุ่ม 48 | `L-card` | ปุ่มเปิดแอปแผนที่ของเครื่อง (F04-R37) | `draft` | P0 |
| `icon.ui.copy` | `icon-ui` | 24 / 24 ในปุ่ม 48 | `L-card` | fallback คัดลอกชื่อสถานที่ | `draft` | P1 |

### 2.5 รอ check-in
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.signal-wait` | `icon-ui` | 24 / 48 | `L-popup` | เหตุ `poor_accuracy` และ `not_enough_trace` (คู่กับข้อความนับถอยหลัง F04-R09) | `draft` | P0 |
| `icon.ui.walk-in` | `icon-ui` | 24 / 48 | `L-popup` | เหตุ `no_approach_from_outside` "เดินออกนอกเขตแล้วกลับเข้ามา" | `draft` | P0 |
| `icon.ui.speed-lock` | `icon-ui` | 24 / 48 | `L-popup` | เหตุ `speed_lock` ตอนกดเข้า (ใช้ไฟล์เดียวกับ 2.6) | `draft` | P0 |

### 2.6 Speed lock
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.speed-lock` | `icon-ui` | 24 / 48 (overlay), 24 (header) | `L-overlay`, `L-pocket`, `L-header` | overlay ล็อกเต็มจอ (F04-R23) บนพื้นกลางวันและพื้นกลางคืน | `draft` | P0 |
| `illus.state.speed-lock` | `illus` | 240 × 160 SVG / กว้าง 240 | `L-overlay` | ภาพประกอบเหนือข้อความ lock: avatar นั่งเบาะรถเมล์ทั่วไปมองออกหน้าต่าง รถเป็นกล่องก้อนกลมสีกลาง | `prompt-only` | P2 · ไม่มีก็ได้ overlay ใช้ไอคอน 48 |

### 2.7 สถานะ run และ gate (F04 3.3, F05)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.in-run` | (ดู 2.3) | | `L-header` | Active | | |
| `icon.ui.grace` · `icon.ui16.grace` | `icon-ui` | 24 · 16 | `L-header`, `L-pocket`, `L-toast` | Grace (ออกนอกเขตชั่วคราว) | `draft` | P0 |
| `icon.ui.suspended` · `icon.ui16.suspended` | `icon-ui` | 24 · 16 | `L-header`, `L-pocket`, `L-toast` | Suspended | `draft` | P0 |
| `icon.ui.exit` | `icon-ui` | 24 / 24 ในปุ่ม 48 | `L-header`, `L-overlay` | ปุ่มออกจาก run เอง (มีในจอ speed lock ด้วย F04-R23) | `draft` | P0 |
| `icon.ui.gate-pass` · `icon.ui16.gate-pass` | `icon-ui` | 24 / 24 และ 48 · 16 | `L-toast`, `L-pocket`, `L-summary` | tick ผ่าน gate · 48 บนจอพกกระเป๋า | `draft` | P0 |
| `icon.ui.gate-miss` · `icon.ui16.gate-miss` | `icon-ui` | 24 · 16 | `L-toast`, `L-pocket`, `L-summary` | tick ยังเดินไม่พอ (ไม่ลงโทษ outline ไม่แดง) | `draft` | P0 |
| `icon.ui.location-off` · `icon.ui16.location-off` | `icon-ui` | 24 · 16 | `L-header`, `L-card` | ไม่รู้ตำแหน่ง / GPS แย่ · 16 ใช้ใน GPS pill (V-22 ข้อความ ≥ 14 px คู่กัน) | `draft` | P0 |

### 2.8 HP, ยา, ถอย, ตาย (F06)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.hp` · `icon.ui16.hp` | `icon-ui` | 24 · 16 | `L-header`, `L-pocket` | นำหน้าแถบ HP | `draft` | P0 |
| `icon.ui.hp-low` | `icon-ui` | 24 / 24 และ 48 | `L-toast`, `L-pocket` | แจ้ง HP ถึงเกณฑ์ 30% (สั่นคู่) | `draft` | P0 |
| `icon.ui.potion-used` | `icon-ui` | 24 | `L-toast` | ใช้ยาอัตโนมัติแล้ว | `draft` | P1 |
| `icon.ui.retreat` | `icon-ui` | 24 / 48 | `L-overlay` | auto-retreat ที่ 25% | `draft` | P0 |
| `icon.ui.knocked-out` | `icon-ui` | 24 / 48 | `L-overlay` | จอตาย (ของใน run หาย) | `draft` | P0 |
| `icon.ui.recovering` | `icon-ui` | 24 | `L-header`, `L-card` | HP ฟื้นช้า 0→50% ใน 30 นาที | `draft` | P1 |

### 2.9 ไอเทมที่ drop (ต้องตรงกับ `assets.icon` ใน config ของ P2-F05-T01)
| id | kind | ขนาด | layer | ใช้ที่ / config | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.item.mat-dust` | `icon-item` | 64 / 48, 64 | `L-toast`, `L-summary`, `L-pocket` | Common · `material.elementDust` | `draft` | P0 |
| `icon.item.mat-essence` | `icon-item` | 64 / 48, 64 | 〃 | Uncommon · `material.elementCore` | `draft` | P0 |
| `icon.item.mat-rift-stone` | `icon-item` | 64 / 48, 64 | 〃 | Rare · `material.riftStone` | `draft` | P0 |
| `icon.item.potion-hp-small` | `icon-item` | 64 / 48, 64 | 〃 | `potion.hpSmall` | `draft` | P0 |
| `icon.item.potion-hp-medium` | `icon-item` | 64 / 48, 64 | 〃 | `potion.hpMedium` | `draft` | P0 |
| `icon.item.potion-hp-large` | `icon-item` | 64 / 48, 64 | 〃 | `potion.hpLarge` | `draft` | P0 |
| `icon.item.potion-revive` | `icon-item` | 64 / 48, 64 | 〃 + `L-overlay` (จอตาย ถ้ามียา) | `potion.revive` | `draft` | P0 |
| `icon.item.weapon-folding-umbrella` | `icon-item` | 64 / 48, 64, 96 | 〃 | อุปกรณ์ Epic/Legendary ช่องอาวุธ | `draft` | P0 |
| `icon.item.armor-raincoat` | `icon-item` | 〃 | 〃 | ช่องเกราะ | `draft` | P0 |
| `icon.item.charm-keychain` | `icon-item` | 〃 | 〃 | ช่องเครื่องราง | `draft` | P0 |
| `icon.item.boots-rain-boots` | `icon-item` | 〃 | 〃 | ช่องรองเท้า | `draft` | P0 |
| `icon.item.slot-empty-weapon`, `-armor`, `-charm`, `-boots` | `icon-item` | 64 / 64 | `L-summary` | ช่องว่างในหน้าอุปกรณ์ (ถ้า flow มี) | `placeholder` | P2 |
| `icon.item.currency-gold`, `icon.item.mat-boss-core` | — | — | — | Phase 2 ไม่มี gold และบอส | ไม่ทำ | — |

### 2.10 glyph พื้นฐานที่ Phase 2 ต้องใช้ (มีใน icon-grammar 7.1 แต่ยังไม่มีไฟล์)
| id | kind | ขนาด | layer | ใช้ที่ | สถานะเป้า | ลำดับ |
| --- | --- | --- | --- | --- | --- | --- |
| `icon.ui.help` · `icon.ui16.help` | `icon-ui` | 24 · 16 | ทุก layer | **fallback ของทุก icon ที่ใช้ไม่ได้** (asset-pipeline 10) · ต้องเสร็จก่อนชิ้นอื่น | `draft` | P0 |
| `icon.ui.map` | `icon-ui` | 24 | แถบนำทางล่าง | กลับหน้าแผนที่ | `draft` | P0 |
| `icon.ui.bag` | `icon-ui` | 24 | `L-header`, `L-summary` | ถุงของ run | `draft` | P0 |
| `icon.ui.settings` | `icon-ui` | 24 / 24 ในปุ่ม 48 | `L-overlay`, แถบนำทาง | ปุ่มตั้งค่า (มีในจอ speed lock F04-R23 และ auto-retreat) | `draft` | P0 |
| `icon.ui.consent` | `icon-ui` | 24 | `L-onboard` | consent ตำแหน่ง | `draft` | P1 |

### 2.11 สิ่งที่ไม่ใช่ไฟล์ภาพ แต่ต้องมีเพื่อให้ asset ข้างบนถูกใช้ถูก
| รายการ | เจ้าของ (task) | ข้อกำหนด |
| --- | --- | --- |
| effect ได้ tick และได้ของ 5 rarity | vfx-animator (P2-F05-T05) | one-shot ตาม motion-direction 4 · Rare สลับความหนาขอบ 2→3→4 px หรือ `scale` ของกรอบ ห้าม `filter`/`opacity` (V-21) · จำนวนจังหวะเท่ากับ `vibration_ms` · ไม่ใช่ช่องทางเดียวที่บอกระดับ |
| "รอยแตกกางออก" 300 ms | vfx-animator | ใช้กับ `icon.ui.rift` ตอนการ์ดและ popup เปิดครั้งแรก · `scaleY` 0.6→1 จากฐาน (R-1) · ไม่ใช้กับ `in-run` หรือ `closed` |
| การหมุน `icon.ui.direction` | gameplay-programmer, uiux-designer | หัวข้อ 3.4 |
| chip ชื่อ rarity, chip สถานะ dungeon, chip sponsored | uiux-designer (P2-F04-T15, P2-F04-T06) | chip rarity ตาม icon-grammar 4.4 · chip สถานะตามหัวข้อ 3.3 · `.chip-sponsored` ตาม style guide 9.2 (V-15) |
| `.toast.faded` ขอบ `ink.500`, `.gps-pill` ≥ 14 px | uiux-designer | V-20, V-22 ก่อน build toast และ header |
| token ใหม่ | uiux-designer | `color.ramp.tonic` {top #FF8877, left #DD4433, right #AA2222} · `color.map.water-edge` #3377AA · ramp ผิว/ผม 12 ชุด, `_meta.nameMapping`, `font.map.weights` [400, 500], type ตัวเลขใหญ่ ≥ 64 px (V-16) |

### 2.12 สรุปจำนวน
| กลุ่ม | ไฟล์ `draft` | P0 | P1 | อื่น |
| --- | --- | --- | --- | --- |
| class badge | 12 | 4 | 8 | — |
| rarity frame | 10 | 10 | — | — |
| สถานะ dungeon | 9 | 8 | 1 | `map.icon.rift-crack` ลงทะเบียน 1 |
| นำทาง | 3 | 2 | 1 | — |
| check-in + speed lock | 3 | 3 | — | `illus.state.speed-lock` `prompt-only` 1 |
| run state + gate | 11 | 11 | — | — |
| HP / F06 | 7 | 5 | 2 | — |
| ไอเทม | 11 | 11 | — | slot-empty `placeholder` 4 |
| glyph พื้นฐาน | 6 | 5 | 1 | — |
| **รวม** | **72** | **59** | **13** | 6 |

ถ้าเวลาของ P2-F05-T07 ไม่พอ ให้ส่ง P0 ทั้ง 59 ไฟล์ก่อน · P1 ใช้ `icon.ui.help` + ข้อความเป็น fallback ได้โดยไม่เสีย loop

## 3. Spec ต่อกลุ่มและ prompt

ทุกชิ้นวาดเป็น SVG ด้วยมือ (agent-svg) ตาม icon-grammar 3 และ 8 และ asset-pipeline 4.1 · prompt ในหัวข้อนี้ใช้สร้างภาพอ้างอิงเท่านั้น (HUMAN รัน, ผลเข้า `art/ref/`) ไม่ใช่ไฟล์ส่ง

### 3.1 Class badge
- โครงตาม icon-grammar 5.2 · glyph ตาม 5.1 · **V-13:** glyph Ranged มีขนนก 2 แฉกเป็นรูป V ที่หาง และ stroke ของ glyph ทุกตัว 2 px (ห้าม 1.6)
- 20 px วาดแยก: วงกลม 18 px ขอบหมึก 2 px glyph ขาวไม่มีขอบ (icon-grammar 5.2 ขนาดเล็ก)
- บนจอเลือก class (`L-onboard`) badge 48 วางคู่ชื่อ class สี `class.*-text` บน `bg.paper` เสมอ ห้ามข้อความขาวบนพื้น class
- ตรวจ: ระบาย silhouette ของ glyph เป็นดำที่ 16 px แล้วยังบอกได้ว่าเป็นโล่ ลูกศร หัวใจ ประกาย

### 3.2 กรอบ rarity
- พิกัดตาม icon-grammar 4.2 ตาราง "พิกัดเส้นแบบวัดได้" (V-12) และ 4.3 สำหรับ 52 · ลำดับวาด: พื้น → แถบสี → เส้นในขอบคู่ → ขอบหมึก → มุมตกแต่ง → pip
- มุมตกแต่งและดาว stroke 2 px · ดาว 4 แฉกเท่านั้น (ห้ามมงกุฎ รัศมี ฉัตร ตามข้อห้าม 8.2)
- กรอบวางบน `bg.night` ได้ (จอพกกระเป๋า) เพราะพื้นในของกรอบเป็น `bg.surface` ทึบเสมอ · contrast กรอบบน night อยู่ใน style guide 4.5 (ต่ำสุด Epic 3.19)

### 3.3 สถานะ dungeon 4 แบบ
| สถานะ | บนแผนที่ (map-style 7) | glyph | chip บนการ์ดและ popup (พื้นกลางวัน) | chip บนพื้นกลางคืน | อ่านออกในภาพขาวดำเพราะ |
| --- | --- | --- | --- | --- | --- |
| เปิด | ขอบ `rift.500` ทึบ + `rift-crack` | `icon.ui.rift` | ไม่มี chip (ค่าตั้งต้น) | — | มีรอยแตกทึบ ไม่มี chip |
| ใกล้ปิด | เหมือนเปิด | `icon.ui.closing-soon` | พื้น `accent.signal` ขอบ `ink.900` 2 px ทึบ ข้อความ `ink.900` ตัวหนา (11.43) | เหมือนกลางวัน (เหลืองบน night 11.43) | ลิ่มทึบในหน้าปัด + chip ทึบสว่าง |
| ปิดทำการ | ขอบประ `ink.500` ไม่มี icon | `icon.ui.closed` | พื้น `bg.surface` **ขอบประ** `ink.500` 2 px (4/4) ข้อความ `ink.700` (12.37) · บรรทัดเวลาเปิดถัดไปนำด้วย `icon.ui.hours` ก่อนปุ่มนำทาง | พื้น `bg.night` ขอบประ `ink.300` (6.17) ข้อความ `ink.100` (12.88) | ขอบประ (ภาษาเดียวกับแผนที่) + ประตูม้วน |
| กำลังเล่นอยู่ | เหมือนเปิด | `icon.ui.in-run` | พื้น `bg.surface` ขอบ `ink.900` **4 px** ทึบ ข้อความ `ink.900` (17.29) | พื้น `bg.night` ขอบ `bg.paper` 4 px ข้อความ `bg.paper` (16.39) | ขอบหนา (กฎ selected ของ components) + รอยแตกเติมดำ |

- ห้ามใช้ chip พื้น `ink.900` + ข้อความ `bg.paper` กับสถานะใด เพราะเป็นรูปของป้าย sponsored (style guide 9.2) · ห้ามใช้สี rarity หรือ `rift.*` เป็นพื้น chip สถานะ
- dungeon ที่ปิดยังนำทางได้ (F04-R38): ปุ่มนำทางคงเป็นปุ่มรอง ไม่ย้ายไปเป็น CTA เหลือง
- ข้อความทุก chip มาจาก copy key ของ narrative-designer · chip สูง ≥ 32 px ตัวอักษร ≥ 14 px ตัวหนา (S8) และทั้งแถวของการ์ดที่แตะได้สูง ≥ 48 px

### 3.4 ตัวนำทาง `icon.ui.direction`
- ภาพ: หัวลูกศรทรงว่าว ปลายแหลมบน ฐานเว้ารูป V · เติม `accent.signal` ขอบ `ink.900` 2 px (48 px บนจอ = 3 px ผ่าน CSS ตาม icon-grammar 7.1.1) · วาดชี้ขึ้นที่ 0° จุดหมุน (12, 12) · ไม่มีก้าน ไม่มีหาง ไม่มีตัวอักษร
- วางในการ์ด: ซ้ายของบรรทัดระยะ · บรรทัดระยะเป็นตัวเลขปัดขึ้น (F04-R34) ตัวหนา tabular ≥ 24 px `ink.900` + คำกำกับ "ระยะเส้นตรง" ≥ 14 px `ink.700` + คำบอกทิศจาก copy key · ลูกศรไม่แสดงลำพังโดยไม่มีคำบอกทิศ
- การหมุน (gameplay-programmer): มุม = bearing จากตำแหน่งผู้เล่นถึงจุดปลายทางเดียวกับลิงก์นำทาง (ทางเข้าที่ปักไว้หรือจุดป้าย ตาม F04-R37) ลบด้วย bearing ของแผนที่ (แผนที่ปัจจุบันหันเหนือขึ้น จึงลบ 0) · **ปัดเป็น 8 ทิศ (ทีละ 45°)** ให้ตรงกับคำบอกทิศและไม่ให้ความแม่นยำหลอก เหมือนหลักปัดระยะขึ้น · เปลี่ยนมุมเฉพาะเมื่อได้ sample ใหม่และทิศที่ปัดแล้วเปลี่ยน · เปลี่ยนด้วย `transform: rotate()` แบบกระโดด หรือ one-shot ≤ 150 ms · reduced-motion = กระโดด · ไม่มีการหมุนต่อเนื่องตามเข็มทิศของเครื่อง (Phase 2 ไม่ใช้ heading ของอุปกรณ์ · A-P2-F05-T03-2)
- ซ่อนลูกศรเมื่อ: ผู้เล่นอยู่ใน polygon แล้ว (แสดงสถานะในเขตแทน) · ไม่รู้ตำแหน่ง (แสดง `icon.ui.location-off`) · ไม่มีเส้นใดบนแผนที่ในทุกกรณี (map-style 12)

### 3.5 รอ check-in (ใน popup)
- แถวสถานะหนึ่งแถวเหนือปุ่ม "เข้า": ไอคอน 48 (`signal-wait` / `walk-in` / `speed-lock` ตามเหตุเดียวของ F04-R08) + ข้อความหนึ่งบรรทัด `ink.900` ≥ 16 px + ตัวนับถอยหลังตัวหนา tabular สำหรับ `not_enough_trace`
- ปุ่ม "เข้า" ที่ยังกดไม่ได้: พื้น `ink.100` ข้อความ `ink.500` (5.44) ไม่มีเงา (ยังอ่านออกกลางแดด) · เมื่อพร้อมเปลี่ยนเป็นปุ่มหลักเหลืองทันที ไม่มี animation ดึงความสนใจ
- `signal-wait` เป็นภาพนิ่งเสมอ ขีดสัญญาณไม่ไล่ขั้น (K1) · ห้ามคำหรือภาพที่สื่อการจับผิด (F04-R10, U7): ไม่มีแว่นขยาย ตา กล้อง ไฟไซเรน

### 3.6 Speed lock
- overlay เต็มจอ: พื้น `bg.paper` (กลางวัน) หรือ `bg.night` (จอพกกระเป๋า) ทึบ 100% · `icon.ui.speed-lock` 48 กึ่งกลาง · ข้อความหนึ่งบรรทัด ≥ 20 px ตัวหนา · ปุ่มตั้งค่าและปุ่มออกจาก run เป็นปุ่มรองขนาดปกติ **ไม่มีปุ่มเหลือง** บนจอนี้ (F04-R23 ไม่มีปุ่มชวนเล่นต่อ)
- บนพื้น night: glyph outline ใช้ `currentColor` = `bg.paper` · แม่กุญแจไม่เติมสีแดง (ไม่ใช่การลงโทษ)
- ห้าม: ตำรวจ ไซเรน ป้ายจราจรจริง ตรารถเมล์หรือสีผู้ให้บริการขนส่งจริง (8.2)
- prompt อ้างอิงของ `illus.state.speed-lock` (P2, HUMAN รันถ้าต้องการ):
```
Cute 2D isometric illustration, dimetric 2:1, a chibi city walker sitting on a
generic bus seat looking out of the window, calm and a bit bored, the bus is a
plain rounded box in neutral grey #9999AA #555566 #333344 with a white window,
thick uniform outline #1A1A22, flat cel shading 3 tones, light from top-left,
no text, no numbers, no route signs, no logos, no operator colours, not scary.
Palette: #1A1A22 #333344 #555566 #9999AA #DDDDEE #FFF8EE #FFFFFF #FFCC00.
Negative: police, siren, traffic sign, brand, bus company livery, readable text,
temple, crown, flag, uniform, gradient, 3D render, voxel.
```

### 3.7 สถานะ run และ gate (header, จอพกกระเป๋า)
Active / Grace / Suspended / Ended ต้องต่างกันโดยไม่ต้องอ่านตัวเลข (board P2-F04-T15) · แยกด้วย 3 ช่องทาง: glyph, รูปของ header, ข้อความ
| สถานะ | glyph | header กลางวัน | header / จอพกกระเป๋า กลางคืน | ภาพขาวดำ |
| --- | --- | --- | --- | --- |
| Active | `icon.ui.in-run` | พื้น `bg.paper` ขอบล่าง `ink.900` 2 px | พื้น `bg.night` ข้อความ `bg.paper` | header เรียบ |
| Grace | `icon.ui.grace` เติม `state.info` | พื้น `bg.paper` + แถบล่าง `state.info` 6 px + ข้อความ `state.info` (5.93) | แถบ `state.info-on-night` 6 px ข้อความ `state.info-on-night` (9.59) | มีแถบหนาใต้ header |
| Suspended | `icon.ui.suspended` เติม `bg.surface` ขอบ `ink.900` | พื้นทั้ง header `state.info` ข้อความ `bg.surface` (6.25) | พื้น `state.info` ข้อความ `bg.surface` | header ทั้งแถบเข้ม |
| Ended | — (ไปจอสรุป run) | จอ `L-summary` | จอ `L-summary` | เปลี่ยนจอ |

- ไม่มี state ใดใช้สีแดง (ออกนอกเขตไม่ใช่ความผิด) · ไม่มีการกะพริบระหว่างสถานะ
- tick: ผ่าน = `gate-pass` เติม `state.success` + ป้ายของที่ได้ในกรอบ 52 · ไม่ผ่าน = `gate-miss` outline `ink.700` บน toast จาง (ขอบ `ink.500` ตาม V-20) · บนจอพกกระเป๋าใช้ขนาด 48 และสั่นตาม cue ของ sound-designer
- `location-off` ใน GPS pill: ไอคอน 16 คู่ข้อความ ≥ 14 px (V-22)

### 3.8 HP, ยา, ถอย, ตาย (F06)
- แถบ HP: ราง `ink.100` แถบ `state.danger` (4.10 ตาม style guide 4.5) ขอบ `ink.900` 2 px · **เส้นแบ่ง `ink.900` 2 px ที่ปลายส่วนที่เติม** (เหตุผลในหัวข้อ 4.3) · สูง ≥ 8 px · ตัวเลข HP ถ้ามีเป็น `ink.900` · การลดใช้ `transform: scaleX()` (motion-direction 3) โดยเส้นแบ่งเลื่อนตาม
- `hp-low`: หยดครึ่งล่างเติม `state.danger` ครึ่งบน outline · ใช้กับ toast และจอพกกระเป๋าตอนถึงเกณฑ์แจ้ง · ไม่มี vignette แดงรอบจอ ไม่มีการสั่นของภาพ
- auto-retreat: overlay `icon.ui.retreat` 48 ข้อความ `ink.900` · ไม่มีภาพความพ่ายแพ้
- ตาย: `icon.ui.knocked-out` 48 · ตาเป็นเส้นโค้งปิด ห้ามกากบาท น้ำตา กะโหลก หลุมศพ (style guide 8.2 หมวดศาสนาและความรุนแรง) · ถ้ามี `potion-revive` ในถุงแสดง item icon 64 ในกรอบ rarity ข้างปุ่มใช้ · `grayscale()` ตอนตายใช้ได้ตาม motion-direction 2 เฉพาะภาพพื้นหลัง ไม่ใช่ไอคอนหรือข้อความ
- `recovering`: แสดงบนการ์ดและ header ช่วงที่ HP ยังฟื้นไม่ถึงเกณฑ์ · ไม่ใช้นาฬิกาทราย (สงวนให้ Grace/Suspended)

### 3.9 ไอเทมที่ drop
หลักรวม: item icon 64 isometric 2:1 ก้อนกลม ขอบหมึก 2 px ramp 3 ค่า + ไฮไลต์ 1 จุด ฐานที่ y = 56 เงาตกกระทบ `ink.900` 0.2 (icon-grammar 2.2, 3) · ต้องอ่านออกที่ 48 px ในกรอบ 52 · ไม่มีตัวอักษร

| id | ภาพ | ramp | จุดที่แยกจากชิ้นอื่นโดยไม่ใช้สี |
| --- | --- | --- | --- |
| `mat-dust` | ถุงซิปพลาสติกใสมีผงอยู่ครึ่งล่าง | ถุง `ramp.plastic` ผง `ramp.rift` top/left | ทรงถุงแบนมีแถบซิปด้านบน |
| `mat-essence` | ก้อนผลึกกลมเหลี่ยมมน 6 หน้า | `ramp.metal` | ทรงผลึกหน้าตัด (ชิ้นเดียวที่มีหน้าแบนหลายหน้า) |
| `mat-rift-stone` | เศษหินหักซิกแซก ขอบในมีแกน `bg.paper` | `ramp.rift` · มุมแหลม miter | ทรงซิกแซกแนวตั้ง |
| `potion-hp-small/medium/large` | ขวดเครื่องดื่มเกลือแร่ทั่วไป ไม่มีฉลาก | ขวด `ramp.plastic` น้ำ `ramp.tonic` ฝา `ink.700` | ความสูง 28 / 38 / 48 px และแหวนฝา 1 / 2 / 3 วง (icon-grammar 7.3) |
| `potion-revive` | ขวดกลางวางเอียง 20° บั้งชี้ขึ้น 2 ชั้นบนตัวขวด | เหมือนยา HP · บั้ง `bg.surface` ขอบ `ink.700` | ขวดเอียง + บั้งขึ้น |
| `weapon-folding-umbrella` | ร่มพับหุบ ด้ามโค้ง | สีเดียวกับ `avatar.weapon.folding-umbrella` | ทรงยาวแนวทแยง |
| `armor-raincoat` | เสื้อกันฝนมีฮู้ดวางกางออก | สีเดียวกับ `avatar.outfit-body.raincoat` | ทรงเสื้อมีฮู้ด |
| `charm-keychain` | พวงกุญแจห่วงกลม + ตุ๊กตาก้อนกลมห้อย | สีเดียวกับ `avatar.accessory-charm.keychain` | ห่วงวงกลมด้านบน |
| `boots-rain-boots` | บูทกันฝนคู่ วางเฉียง | สีเดียวกับ `avatar.outfit-feet.rain-boots` | ของคู่ 2 ชิ้น |

- อุปกรณ์ใช้ภาพเดียวทุก tier จนกว่า content จะมีรายการอุปกรณ์จริง ระดับบอกด้วยกรอบ rarity (A-P2-F05-T03-3) · ห้ามทำสีต่างตาม rarity ในตัว icon
- ห้าม: ขวดคล้ายแบรนด์ เหรียญมีหน้าคน พระเครื่อง ตะกรุด ยันต์ (icon-grammar 7.3)
- prompt อ้างอิงของไอเทม (ใช้กับ `<SUBJECT>` และ `<RAMP HEX x3>` ตาม style guide 11) ตัวอย่างยา: `<SUBJECT>` = "a generic unlabeled sports drink bottle, short and chubby, red-orange liquid, one ring on the cap" · `<RAMP HEX x3>` = `#FF8877 #DD4433 #AA2222` (`ramp.tonic`) + `#FFFFFF #DDDDEE #9999AA` (`ramp.plastic`) · เพิ่มใน negative: "label, logo, medical cross, hospital bottle"

### 3.10 `map.icon.rift-crack`
- แก้เป็น miter join แล้วในงานนี้ (`art/direction/map-style/icons/rift-crack.svg`) · artist-2d **ไม่แก้ไฟล์นี้** (อยู่นอก writes ของ P2-F05-T07) ให้ลงทะเบียนใน manifest เท่านั้น: `kind: "map-icon"`, `files[].path` = `art/direction/map-style/icons/rift-crack.svg`, `size` 48 × 72, `status: "draft"`
- ถ้าต้องการปรับรูปทรง ส่ง handoff มา art-director พร้อมพิกัดใหม่ · ปลายแหลมของ miter ต้องอยู่ใน canvas (สูตรในความเห็นของไฟล์)

## 4. ข้อกำหนดกลางแดดและตาบอดสี (ตรวจบนจอได้ทุกเวลา)

เหตุผล: D-093 ทำให้ Phase 2 ไม่มีภาพจอกลางแดดจัดจากสนาม · ข้อกำหนดทั้งหมดของ style guide S1–S10 ยังบังคับเท่าเดิม · หัวข้อนี้เขียนเป็นเกณฑ์ที่ตรวจบนจอหรือจากภาพหน้าจอได้ เพื่อให้ตรวจได้ตอนนี้และตรวจซ้ำด้วยของจริงก่อน closed beta · ชิ้นใดตก 4.1–4.4 ข้อใดข้อหนึ่ง ห้ามตั้ง `draft`

### 4.1 Contrast คำนวณ (อัตโนมัติ)
ทุกคู่ใหม่ของ brief นี้ใช้ token เดิม ค่าอยู่ใน style guide 4 แล้ว · qa-tester เพิ่มเป็น case ใน test contrast
| คู่ | ratio | เกณฑ์ | ใช้ที่ |
| --- | --- | --- | --- |
| `ink.900` บน `accent.signal` | 11.43 | S1 AAA | chip ใกล้ปิด |
| `ink.700` บน `bg.surface` · ขอบประ `ink.500` บน `bg.surface` | 12.37 · 7.30 | S1 · S3 | chip ปิดทำการ |
| `ink.100` บน `bg.night` · ขอบ `ink.300` บน `bg.night` | 12.88 · 6.17 | S1 · S3 | chip ปิดทำการกลางคืน |
| ขอบ `ink.900` บน `bg.surface` · `bg.paper` บน `bg.night` | 17.29 · 16.39 | S3 · S1 | chip กำลังเล่นอยู่ |
| `state.info` บน `bg.paper` · `state.info-on-night` บน `bg.night` · `bg.surface` บน `state.info` | 5.93 · 9.59 · 6.25 | S1 AA | header Grace / Suspended |
| `ink.500` บน `ink.100` | 5.44 | S1 AA | ปุ่ม "เข้า" ที่ยังกดไม่ได้ |
| แถบ `state.danger` บนราง `ink.100` | 4.10 | S3 | แถบ HP |
| ขอบ `ink.900` ของลูกศรทิศบน `bg.surface` · พื้น `accent.signal` กับขอบ `ink.900` | 17.29 · 11.43 | S3 | `icon.ui.direction` |

### 4.2 ภาพขาวดำ (S10 ส่วนที่ทำบนจอได้)
ถ่ายภาพหน้าจอ 390 × 844 (dpr 3) และ 360 × 800 (dpr 2) แล้วแปลงเป็นขาวดำ (เช่นเปิดภาพในหน้า HTML ที่ใส่ `filter: grayscale(1)` · ใช้ตรวจเท่านั้น ห้ามใช้ในเกม) · ผ่านเมื่อผู้ตรวจที่ไม่เห็นภาพสีระบุได้ถูก 100%:
1. สถานะ dungeon 4 แบบบนการ์ด (3.3 คอลัมน์ขาวดำ)
2. สถานะ run 4 แบบบน header (3.7)
3. tick ผ่านกับไม่ผ่าน · HP ปกติกับ HP ต่ำ
4. rarity 5 ระดับจาก pip ที่กรอบ 52 · class 4 แบบจาก glyph ที่ 20 และ 32 px
5. ทิศของลูกศรนำทาง (8 ทิศ) · ยา 4 ชนิดจากรูปทรง

### 4.3 จำลองแสงสะท้อนกลางแดด (proxy ของ S10)
แสงแดดที่สะท้อนบนจอเพิ่มความสว่างเท่ากันให้ทุกจุด คู่สีที่ต่างกันแค่ค่ากลางจะกลืนกันก่อน · แบบจำลองที่ใช้: ratio เมื่อมีแสงสะท้อน = (L สว่าง + 0.05 + G) / (L มืด + 0.05 + G) โดย G = 1.0 (แสงสะท้อนเท่ากับความสว่างของขาวบนจอ ซึ่งเป็นกรณีแดดบ่ายที่ความสว่างจอ 100%) [ASSUMPTION A-P2-F05-T03-4]
- **เกณฑ์:** ความหมายของทุกองค์ประกอบในหัวข้อ 2 ต้องถูกบอกด้วยคู่สีอย่างน้อยหนึ่งคู่ที่ได้ ≥ 1.50 ภายใต้ G = 1.0 · คู่ที่ < 1.30 ถือว่าหายไปแล้ว ห้ามเป็นช่องทางเดียว
| คู่ (G = 1.0) | ratio | ผล | ความหมาย |
| --- | --- | --- | --- |
| `ink.900` บน `bg.surface` / `bg.paper` | 1.93 / 1.88 | ดีที่สุดที่เป็นไปได้ | เหตุผลที่ทุกชิ้นมีขอบหมึก |
| `ink.700` บน `bg.surface` · `ink.500` บน `bg.surface` | 1.89 · 1.79 | ผ่าน | ข้อความและขอบประของ chip ปิดทำการ |
| `state.info` บน `bg.paper` · `bg.surface` บน `state.info` | 1.71 · 1.76 | ผ่าน | Grace / Suspended |
| `state.success` บน `bg.surface` | 1.73 | ผ่าน | `gate-pass` |
| ขอบกรอบ rarity บน `bg.paper` (common → epic) | 1.53–1.67 | ผ่านขอบล่าง | ยังมีขอบหมึกและ pip รองรับ |
| `state.danger` บนราง `ink.100` | 1.497 | **ต่ำกว่าเกณฑ์เล็กน้อย** | แถบ HP ต้องมีเส้นแบ่ง `ink.900` 2 px ที่ปลายส่วนที่เติม (ระดับ HP อ่านจากเส้นดำบนราง 1.68 ไม่ใช่จากสีแดง) · แถบสูง ≥ 8 px · uiux-designer ใส่ใน component แถบ HP |
| `ink.500` บน `ink.100` | 1.56 | ผ่าน | ปุ่มที่ยังกดไม่ได้ |
| `accent.signal` บน `bg.surface` (ไม่มีขอบ) | 1.21 | **หาย** | chip ใกล้ปิดและลูกศรทิศอ่านออกเพราะขอบ `ink.900` เท่านั้น · ลูกศร 48 px ต้องมีเส้น 3 px |
| พื้น badge class กับขอบหมึก (tanker → magic) | 1.13–1.27 | **หาย** | class อ่านจาก glyph ขาวบนพื้น class (1.53–1.70) และขอบหมึกบนกระดาษ |
| `map.road` บน `map.land` ไม่มีขอบ | 1.10 | **หาย** | เหตุผลของขอบถนน (map-style 9) |
- ตรวจด้วยภาพ: วางชั้นสีขาวทึบ 50% ทับภาพหน้าจอ แล้วแปลงขาวดำ · ต้องยังผ่าน 5 ข้อของ 4.2 · จุดที่ต้องดูเป็นพิเศษ: chip ใกล้ปิดกับ chip กำลังเล่นอยู่จะเหลือเป็นกรอบขาวทั้งคู่ แยกได้จากความหนาขอบ 2 กับ 4 px และ glyph

### 4.4 ตาบอดสี
- จำลอง protanopia, deuteranopia, tritanopia, achromatopsia ด้วย matrix Machado 2009 (Chrome DevTools > Rendering > Emulate vision deficiencies) ตาม icon-grammar 6.3 ที่ขนาดแสดงเล็กสุดของแต่ละชิ้น (glyph 16/24, badge 20, frame 52, item 48)
- คู่เสี่ยงใหม่ใน Phase 2 และช่องทางที่รองรับ
| คู่ที่อาจกลืนกัน | แบบที่เสี่ยง | แยกด้วย |
| --- | --- | --- |
| `gate-pass` (เขียว) กับ `hp-low` (แดง) | deutan, protan | รอยเท้า + ถูก vs หยด · ตำแหน่งบนจอต่างกัน |
| ยา `ramp.tonic` กับ `mat-dust` ผง `ramp.rift` | deutan, protan | ขวด vs ถุงแบนมีซิป |
| chip ใกล้ปิด (เหลือง) กับ chip กำลังเล่นอยู่ (ขาว) | tritan | ขอบ 2 vs 4 px + glyph |
| Grace (`state.info`) กับ tick ผ่าน (`state.success`) | tritan | นาฬิกาทราย vs รอยเท้า + ตำแหน่ง (header vs toast) |
- เกณฑ์ผ่าน: ทั้ง 4 แบบ ผู้ตรวจระบุทุกข้อของ 4.2 ได้ถูก 100% โดยไม่อ่านข้อความ

### 4.5 ใช้การเดินช่วงเช้าและเย็นให้เป็นหลักฐานบางส่วน
- ช่วง 16:30–18:30 แดดต่ำส่องเข้าจอตรงได้ (แสงสะท้อนแรงแม้ไม่ใช่เที่ยง) และช่วงพลบค่ำเป็นกรณีของโหมดกลางคืนและจอพกกระเป๋า (S9) · ขอให้ผู้เดินทดสอบ (P2-F04-T11, P2-F06-T27) ถ่ายรูปจอตามวิธีของ map-style 10.2 (ระยะ 35–40 ซม. มุม 30° ความสว่าง 100%) อย่างน้อยจอการ์ด dungeon, popup รอ check-in, header run และจอพกกระเป๋า แล้วแนบในรายงาน
- ภาพเหล่านี้ **ไม่แทน** การทดสอบกลางแดด 12:00–15:00 (V-17, style guide S10) ซึ่งยังเป็นเงื่อนไขก่อน closed beta ตาม D-093

### 4.6 ใครตรวจเมื่อไร
| ขั้น | ใคร | อะไร |
| --- | --- | --- |
| ก่อนตั้ง `draft` | artist-2d | 4.2–4.4 บน contact sheet ของชุดไอคอน (ภาพเดียวรวมทุกชิ้นที่ขนาดแสดงจริง บน `bg.paper`, `bg.surface`, `bg.night`) แนบใน report |
| content gate ของ F04–F06 | art-director, qa-tester | 4.1 อัตโนมัติ · 4.2–4.4 บนภาพหน้าจอของ build จริง |
| ก่อน closed beta | HUMAN ผ่าน qa-tester | S10 และ map-style 10.2 กลางแดดจริง (V-17) · ปรับค่า G ใน 4.3 ถ้าผลจริงต่างจากแบบจำลอง |

## 5. ลำดับงานและการส่งต่อ

### 5.1 ลำดับวาดใน P2-F05-T07
1. `icon.ui.help` + `icon.ui16.help` (fallback ของทุกชิ้น)
2. ไอเทม 11 ชิ้น + กรอบ rarity 10 ไฟล์ (ต้องตรงกับ `assets.icon` ของ P2-F05-T01 ก่อน engine ทดสอบ drop)
3. สถานะ dungeon, นำทาง, รอ check-in, speed lock
4. สถานะ run, gate, HP/F06, glyph พื้นฐาน
5. class badge 48 → 32 → 20
6. contact sheet ตาม 4.6 แล้วตั้ง `draft` · ลงทะเบียน `map.icon.rift-crack` · ตั้ง `ref.style-tile.v1` เป็น `approved` (งานค้างจาก F03 gate R2-6)

### 5.2 ส่งต่อ
| ถึง | งาน | ต้องทำ |
| --- | --- | --- |
| artist-2d | P2-F05-T07 | วาดตามหัวข้อ 2–3 · manifest: id, path, `size`, `status` ตามหัวข้อ 1.3 · id ของไอเทมตรงกับ `assets.icon` ใน config · ผ่าน 4.2–4.4 |
| producer | board P2-F05-T07 | writes ของงานเขียน `art/assets/icons/`, `art/assets/items/`, `art/assets/ui/` แต่ asset-pipeline 3.2 (และ validator V2) ใช้ `art/assets/icon/ui/`, `icon/ui16/`, `icon/item/`, `badge/class/`, `frame/rarity/`, `illus/state/` · ต้องแก้ writes ให้ตรงก่อน dispatch ไม่อย่างนั้น artist เขียน badge และ frame ไม่ได้ หรือเขียนผิด path แล้ว V2 ตก |
| vfx-animator | P2-F05-T05 | effect ตามหัวข้อ 2.11 · อ้าง id ในหัวข้อ 2 (ไม่สร้างไฟล์ภาพใหม่) |
| uiux-designer | P2-F04-T15, P2-F04-T06 | chip สถานะ 3.3, header run 3.7, แถว check-in 3.5, overlay speed lock 3.6, การ์ดนำทาง 3.4, แถบ HP พร้อมเส้นแบ่ง 3.8 · token ใหม่ในหัวข้อ 2.11 · V-15, V-16, V-20, V-22 |
| gameplay-programmer | integration F04–F06 | หมุนลูกศร 8 ทิศตาม 3.4 · `label_count` = "" เสมอใน Phase 2 · ห้าม layer เส้นนำทาง · ไม่ส่ง "ใกล้ปิด" เข้า source แผนที่ · ห้ามลด opacity ของแผนที่ (map-style 6.1, 7, 12 · D-077) |
| tech-lead | P2-F06-T07 | รายการสีของ validator V7 เพิ่ม `ramp.tonic` 3 ค่า · config ของ SVGO ต้องไม่ลบ `stroke-linejoin="miter"` และ `stroke-miterlimit` · `map-icon` ชี้ path ใน `art/direction/map-style/icons/` |
| qa-tester | test contrast, V-10 | เพิ่ม case ของ 4.1 · จำนวน ramp ที่ test นับจาก style guide เพิ่ม 1 (`ramp.tonic` ชื่อเป็นตัวอักษรล้วนจึงถูกนับทันที: 10 → 11, และ 22 → 23 หลังขยาย regex) · hex ใหม่ 3 ค่าจะไม่อยู่ใน `tokens.json` จนกว่า uiux เพิ่ม · ถ่าย S6 ตาม map-style 10.1 · เตรียมหน้า HTML สำหรับ 4.2/4.3 (grayscale + ชั้นขาว 50%) ถ้าต้องการใช้ซ้ำ |
| location-engineer | ข้อมูลแผนที่ | ยืนยันว่า `data/map/playarea-mask.geojson` และ `provinces.geojson` ตรง map-style 6.2/6.3 (D-060) · ถ้า S6 เห็นขอบดำตามแนว bbox ของ tile ให้ตัดรูด้วย bbox |

## 6. สมมติฐาน
- A-P2-F05-T03-1: "สถานะ dungeon 4 แบบ" ใน board = เปิด, ใกล้ปิด, ปิดทำการ, กำลังเล่นอยู่ · ถ้า flow ของ uiux ต้องการสถานะอื่น (เช่น ไกล หรือ นอกย่านเปิดตัว) สถานะเหล่านั้นเป็นสถานะของจอ ไม่ใช่ของ dungeon ใช้ glyph และ illus ของ onboarding/หน้าว่างแยก (ยืนยัน: uiux-designer, game-director)
- A-P2-F05-T03-2: Phase 2 ไม่ใช้ทิศที่อุปกรณ์หันอยู่ (compass heading) · ลูกศรทิศอิงแผนที่ที่หันเหนือขึ้นและมีคำบอกทิศกำกับเสมอ · การใช้ heading ต้องขอ permission บน iOS และทำให้ลูกศรขยับต่อเนื่อง จึงเป็น decision ใหม่ถ้าต้องการ (ยืนยัน: game-director, gameplay-programmer)
- A-P2-F05-T03-3: อุปกรณ์ที่ drop ใช้ภาพเดียวต่อช่องทุก tier จนกว่า content จะมีรายการอุปกรณ์และชื่อจริง · `assets.icon` ของอุปกรณ์ทุกชิ้นในช่องเดียวกันชี้ id เดียวกันได้ (ยืนยัน: systems-designer ใน P2-F05-T01)
- A-P2-F05-T03-4: แบบจำลองแสงสะท้อน G = 1.0 และเกณฑ์ 1.50 / 1.30 ในหัวข้อ 4.3 เป็นค่าของโปรเจกต์ ไม่ใช่มาตรฐานภายนอก · ใช้จัดลำดับความเสี่ยงจนกว่าจะมีผลทดสอบกลางแดดจริง แล้วปรับ (ยืนยัน: qa-tester, art-director หลัง V-17)
- A-P2-F05-T03-5: `icon.item.mat-essence` คือ `material.elementCore` (แก่นธาตุ) ตามชื่อใน icon-grammar 7.3 · ไม่เปลี่ยน id เป็น `mat-core` เพื่อไม่ชนกับ `mat-boss-core` (ยืนยัน: systems-designer)
- A-P2-F05-T03-6: แผนที่ของ client หันเหนือขึ้นเสมอใน Phase 2 (bearing 0) · ถ้าเปิดให้หมุนแผนที่ มุมของลูกศรต้องลบ bearing ของแผนที่ (ยืนยัน: gameplay-programmer)
