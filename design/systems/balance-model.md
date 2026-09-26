# Balance Model — GPS Dungeon Bangkok

- งาน: P1-F03-T06 · เจ้าของ: systems-designer · สถานะ: ฉบับแรก (Phase 1) · ปรับตามคำตัดสินหลัง T06 ใน P1-X22 (เป็นบันทึก ไม่เปลี่ยนค่า config) · P2-F06-T01 (Phase 2): D-038 B, farDungeonThreshold_m, R-B1, cap ของ partyMult (หัวข้อ 15) · P2-F05-T20: gate, run state, check-in, speed lock, เวลาทำการ (หัวข้อ 16) · P2-F05-T01: exp ต่อ tick, drop table ต่อ preset รวมยา, ไอเทมพร้อม `assets.icon`, ค่า F06, `dungeons.safety` ตาม D-061 ที่แก้, run loop ที่ใส่ seed (หัวข้อ 17)
- คำตัดสินที่สะท้อนแล้ว: D-020 ACCEPTED (นิยาม 45 นาที), D-038 B ACCEPTED (VIT ต่อยา +1%), D-078 (R-B1 ลำดับผลต่อ hit), D-079 (เพดานระยะไกลและ partyMult), D-029 (hit chance 54), D-041 (ลำดับปลด), D-059 ACCEPTED (รางวัลปิดฉุกเฉิน), D-061 ACCEPTED พร้อมแก้ (`dungeons.safety` หัวข้อ 17.6), D-089 (ยามาจาก drop เท่านั้น), D-094, D-096 (กฎ F05/F06), D-062 (`telemetry.json` อยู่ `config/app/`), D-064 ("นอกพื้นที่" = นอก mask), D-065 (ร้าน NPC) · ตัวเลขผลรันล่าสุดอยู่ที่ `design/systems/sim-report.md`
- แหล่งความจริง: GDD (`เกม GPS Dungeon กรุงเทพฯ — Design Document.md`) · decision D-004, D-005
- ค่าทุกตัวอยู่ใน `config/balance/*.json` เอกสารนี้อธิบายสูตรและเหตุผลเท่านั้น โค้ดห้ามถือเลขเอง
- ผู้ใช้ต่อ: P1-F03-T07 และ T08 (simulator + golden test vectors), P1-F03-T09 (preset), gameplay/backend-programmer, liveops-operator

## 0. ข้อตกลงของ config

| ข้อ | กติกา |
| --- | --- |
| ชื่อ key | camelCase (TL-N02 · รอ ADR 0001 รับรอง) |
| หน่วย | อยู่ท้ายชื่อ key: `_pct` (เปอร์เซ็นต์ เช่น 16 = 16%), `_s`, `_m`, `_m2`, `_h`, `_days`, `_gold`, `_kmh` · คำว่า `Mult` = ตัวคูณไม่มีหน่วย (1.6 = ×1.6) |
| ค่า | ตัวเลขตรง ไม่ห่อ object · `null` = ยังไม่มีค่า (โค้ดและ simulator ต้องล้มทันทีถ้าอ่านเจอ ไม่ใช่เดาค่า) |
| แหล่ง | ทุก object มี `_source` ชี้หัวข้อ GDD · ค่าที่ GDD ไม่ระบุมี `_assumption` พร้อมรหัส `A-P1-F03-T06-<n>` และเจ้าของที่ต้องยืนยัน |
| ที่เดียว | ค่าหนึ่งตัวอยู่ไฟล์เดียว ไฟล์อื่นอ้างด้วย `seeFile` เช่น movement gate อยู่ `dungeons.json#movementGate` เท่านั้น |
| ค่าอ้างอิง | object ชื่อ `gddReference*` เป็นเป้าให้ simulator เทียบ ห้าม runtime อ่าน |
| metadata | key ที่ขึ้นต้นด้วย `_` เป็นคำอธิบาย ไม่ใช่ค่า โค้ดที่วนอ่าน map (เช่น `roles`, `successRateByTargetLevel_pct`) ต้องข้าม key เหล่านี้ · หน่วยผสมเขียนต่อท้ายได้ เช่น `_pctMaxHpPerMin` |

ไฟล์ทั้งหมด (T06 ตรวจ JSON valid ครบ 11 ไฟล์ ดูหัวข้อ 14 · ไฟล์ที่เพิ่มภายหลังอยู่ท้ายตาราง)

| ไฟล์ | เนื้อหา | หัวข้อ |
| --- | --- | --- |
| `classes.json` | party, buff stacking, base/cap ต่อ role, debuff, กฎ base/cap, ค่าเปลี่ยน class | 2 |
| `combat.json` | monsterATK, DEF softcap, รอบสุ่มโดนตี, ตัวคูณ damage ตามช่องว่างเลเวล | 3 |
| `progression.json` | เลเวลสูงสุด, exp curve, ตัวคูณ exp, stat point, stat พื้นฐาน, การฟื้น HP | 4 |
| `equipment.json` | gearStat, 4 ช่อง, ของบอส, tier ตามเลเวล | 5 |
| `enhance.json` | โอกาสสำเร็จ, ผลล้มเหลว (ไม่มีแตก), สะสมความล้มเหลว, ค่าวัตถุดิบและ gold | 6 |
| `drops.json` | โอกาสต่อ tick, จำนวน, ตัวคูณ, dungeon เล็ก · `items` (ไอเทมที่ drop ได้ พร้อม `assets.icon`, `nameKey`) และ `dropTables` ต่อ preset รวมยา (P2-F05-T01) | 7, 17 |
| `economy.json` | ราคา NPC, ยา, ยาอัตโนมัติ, เป้าอัตราส่วน, ภาษีขั้นบันได, กฎตลาด | 8 |
| `dungeons.json` | พื้นที่ 3,000–150,000 ตร.ม., สถานะ run, reward tick, movement gate, auto-retreat, แจ้ง HP, ปิดฉุกเฉิน (`emergencyClose`), พัก dungeon จากรายงาน (`safety` ตาม D-061 ที่แก้) | 9, 16, 17 |
| `unlocks.json` | เงื่อนไขปลดต่อระบบ (U1–U8 และร้าน NPC), นิยาม run ที่นับ, ระยะ "ไกล", อ้าง mask "นอกพื้นที่" | 10 |
| `raid.json` | POW, presence/survival/party mult, HP บอส, checkpoint, อันดับ contribution | 11 |
| `anticheat.json` | check-in, speed lock, trust score, offline evidence, audit ผลลัพธ์ | 12 |
| `location.json` | เกณฑ์ accuracy ของสถานะหน้าจอ (ไม่ให้หรือกันรางวัล) · P1-H03 | 10 |
| `privacy.json` | ค่า PDPA ฝั่ง server (`positionLogTtl_s`, `minAge_yr`) · P1-H03 | — |

- `telemetry.json` ไม่ใช่ไฟล์ balance: อยู่ที่ `config/app/telemetry.json` (D-062 ไม่กระทบกฎหรือรางวัล key เดิม) · ค่า privacy ฝั่งเครื่องอยู่ `config/app/privacy.json` ของ tech-lead

## 1. สรุปข้อค้นพบ (findings)

ตัวเลขทุกข้อคำนวณจาก config ด้วย script ตรวจ (หัวข้อ 14) ไม่มีข้อไหนถูก "แก้เงียบ" ใน config ค่ายังเป็นตาม GDD ทุกตัว

| # | เรื่อง | GDD | คำนวณจากสูตร | ผล | ข้อเสนอ |
| --- | --- | --- | --- | --- | --- |
| F-1 | เวลาอยู่รอด 45 → 55 นาทีเมื่อมี Tanker เลเวล 25 | 45 / 55 | ถ้าฐาน 45 ไม่มี debuff ×1.6: มี Tanker = 45 / (1 − 0.217) = 57.5 นาที · ถ้าฐาน 45 รวม ×1.6 (คนเดียวที่ไม่ใช่ Tanker): มี Tanker = 45 × 1.6 / 0.783 = 92 นาที | ตาราง GDD สอดคล้องกับกรณีฐานไม่มี debuff เท่านั้น ผู้เล่นเดี่ยวที่ไม่ใช่ Tanker จะอยู่ได้ราว 28–29 นาที (สั้นกว่า 45 เกิน 20%) | ใช้นิยาม "45 นาที = กรณี damage ×1.0" เป็น vector · T07 ยืนยันด้วย simulator แล้วเสนอ decision authority HUMAN ตาม SF-4 |
| F-2 | ตาราง exp, ความถี่ drop, รายได้ 1,470 | ตามตาราง | ได้ตรงเมื่อตัวคูณรวม = 1.0 ซึ่งไม่มีองค์ประกอบ party ใดให้ค่านี้พอดี: คนเดียวที่ไม่ใช่ Magic ได้ exp ×0.6, ไม่ใช่ Ranged ได้ drop ×0.6 | คนเดียวถึงเลเวล 60 ราว 170 ชม. (ไม่ใช่ 103), Epic ราว 17 วันครั้งที่ 40 นาทีต่อวัน, รายได้ราว 893 gold/ชม. | ถือตาราง GDD เป็น "ค่าอ้างอิงที่ตัวคูณ 1.0" · T08 วัดรายได้และค่ายาของคนเดียวแยกตาม class แล้วเสนอ decision authority HUMAN ถ้าอัตราส่วนหลุดช่วง D-005 |
| F-3 | ตาราง gearStat | 15 ช่อง | ต่าง 1 แต้มใน 6 ช่อง (tier 2 +10 = 143 เทียบ 142, tier 3 +10/+15 = 251/307 เทียบ 252/308, tier 5 = 286/514/628 เทียบ 285/513/627) | GDD ปัดค่าพื้นฐานไม่สม่ำเสมอ (tier 3 ปัดขึ้นเป็น 140, tier 5 ปัดลงเป็น 285) ไม่มีกฎปัดเดียวที่ได้ครบ 15 ช่อง | เชื่อสูตร ปัดครั้งเดียวตอนท้าย (ต่าง ≤ 0.35%) · vector ใช้ tolerance 1 · เสนอหมายเหตุใน GDD (authority systems-designer ไม่เกิน ±20%) |
| F-4 | รวม tick เลเวล 1–60 | ราว 1,240 tick / 103 ชม. · เลเวล 30 ราว 32 ชม. | 1,222 tick / 101.9 ชม. · เลเวล 30 = 30.9 ชม. | ต่าง −1.5% และ −3.4% อยู่ในคำว่า "ราว" | เชื่อสูตร · vector ใช้ tolerance 3% |
| F-5 | Tanker เลเวล 50 หนึ่งคน = เลเวล 1 สองคน | เท่ากัน | P = 2.00 (26.3%) เทียบ P = 2.04 (26.6%) | ใกล้เคียง ต่าง 0.3 จุด | ถือว่าตรง · vector tolerance 0.5 จุด |
| F-6 | รายได้ต่อชั่วโมง | ราว 1,470 | 1,488 (Common เฉลี่ย 2 ชิ้น) · อัตราส่วนกับ 600 = 2.48 | ต่าง +1.2% อยู่ในช่วง D-005 (ต่ำสุด 2.45) | ถือว่าตรง · ค่ายาต้องมาจาก damage model (T08) |
| F-7 | ค่าที่ GDD ไม่มีตัวเลข | — | — | ต้องใช้ค่าสมมติ 32 รายการ (หัวข้อ 13) ที่หนักสุด: โอกาสโดนตีต่อรอบ, ขนาดโล่ Magic, อัตรา heal ของ Support, bossATK, สูตร partyMult | ติดธง `_assumption` ทุกข้อ ส่ง game-director ยืนยัน |
| F-8 | ตีบวก "ไปได้เรื่อยๆ" | ไม่มีเพดาน | ตารางวัตถุดิบและตาราง gear หยุดที่ +15 | ขัดกันเล็กน้อย | v1 เพดาน +15 (A-P1-F03-T06-7a) |
| F-9 | ความแรงของบอส | หัวข้อ Raid 15–25% · หัวข้อ Progression 20% | — | ไม่ขัดกัน 20% อยู่ในช่วง | ใช้ 20% |
| F-10 | กฎ base/cap | 1/3–2/5 | Support 25/50 = 0.50 | ยกเว้นโดยเจตนาตาม D-004 ไม่เสนอซ้ำ | — |
| F-16 | นั่งม้านั่งยังได้ tick (P2-F05-T20) | "นั่งพักบนม้านั่งยังได้อยู่" | trace `synthetic-bench-jitter-01` หลังกรอง + resample 5 วินาที = 53.4–56.5 ม. ต่อหน้าต่าง (เกณฑ์ > 50) · resample 10 วินาที = 32.8–43.0 ม. ไม่ผ่านเลย | ผ่านแต่ขอบบาง (7–13%) และขนาด jitter ของ trace เป็นค่าสมมติ (sigma 1.5 ม.) · มือถือจริงอาจตกทั้งสองทาง | ไม่แก้เกณฑ์ 50 ม. เงียบ (NN-2) · รอ P2-C03 วัดเครื่องจริง ถ้าม้านั่งไม่ผ่านหรือโต๊ะนิ่งผ่าน ส่ง game-director (board กฎข้อ 4) · `sampleCadence_s` เป็นคันโยกเดียวที่ควรขยับ (ห้ามต่ำกว่าช่วง sample ของเครื่อง 0.2 Hz = 5 วินาที เพราะผล 1 Hz กับ 0.2 Hz จะต่างกัน) |
| F-17 | เปิด GPS ใหม่แล้วเดินเข้าเขต (P2-F05-T20) | check-in ต่อเนื่อง 60 วินาที | trace `synthetic-warmup-accuracy-01` ที่ `outlierSpeed_kmh` 30 (ค่า fixture ของ geo) ทิ้ง fix 52 ตัว ลำดับไม่ถึง 60 วินาทีภายใน 5 นาที | jitter ของ fix 1 Hz ช่วง warm-up ถึง 134 กม./ชม. ตัวกรองความเร็วที่ต่ำเกินทำให้ check-in ไม่ผ่านเลย | ตั้ง 60 กม./ชม.: ครบที่ 118 วินาที (ideal ราว 106) · spike และ teleport ยังถูกทิ้งทั้งหมด · ระยะรางวัลไม่เพิ่มเพราะคู่ที่เร็วกว่า 25 กม./ชม. ไม่นับอยู่แล้ว |
| F-18 | dungeon ที่ช่วงเลเวลกว้างและครอบเลเวล 1 (P2-F05-T01) | เลเวลตรงโซนอยู่ราว 45 นาที · spec F06 R43: เลเวล 1 ไม่มียา มัธยฐานถึง auto-retreat ≥ 2 × `window_s` (10 นาที) | Z = กลางช่วงปัด (A-1) ดังนั้น PN-2 ช่วง 1–35 มี Z = 18 · เลเวล 1 base stat โดน 192.8 ต่อครั้ง (64% ของ HP 300) · มัธยฐานถึง auto-retreat 3.2 นาที (non-Tanker) / 5.1 นาที (Tanker) · ช่วง 1–5 ผ่าน (21.7–43.1 นาที) · 1–9 ผ่าน (12.6) · 1–10 ไม่ผ่าน (8.8) | R43 ไม่ผ่านใน PN-2 · onboarding แนะนำ PN-2 ได้ถ้าเป็นแห่งที่เปิดใกล้สุด (F06 R37) | ห้ามแก้ด้วยเกณฑ์ auto-retreat หรือ gate (NN-8) · ส่ง game-director: (ก) level-designer ตั้งช่วงที่ครอบเลเวล 1 ให้ max ≤ 9 (Z ≤ 5) หรือ (ข) เปลี่ยน A-1 เป็น Z = เลเวลผู้เล่นที่ถูกบีบเข้าในช่วง (ต้องทำ vector ใหม่ทั้งหมด) · หลักฐาน report-loop หัวข้อ 4 |
| F-19 | ยาจาก drop ของ Phase 2 เทียบเป้าเศรษฐกิจ (P2-F05-T01) | รายได้ราว 2.5–3 เท่าของค่ายา (D-005, HUMAN) | ยาเล็ก 17% + ยาชุบ 1% ต่อ tick มีมูลค่า 606 gold/ชม. ที่ราคาซื้อ NPC ≈ ค่ายาทั้งหมดของ GDD (600) | Phase 2 ไม่มี gold จึงไม่กระทบ · ถ้าคงไว้ถึง Phase 4 ค่ายาสุทธิเกือบเป็นศูนย์ อัตราส่วนหลุดเป้าด้านบน | roll ยาเป็นของ Phase 2 (A-P2-F05-T01-1) · ต้องทบทวนก่อนเปิดร้าน NPC (Phase 4) · ถ้าจะคงไว้ต้องเป็น decision HUMAN |

## 2. Class, party และ buff stacking

แหล่ง: GDD "Class และ Party" (Buff และ debuff ต่อ role, สูตร buff stacking, เป้าหมายสมดุล, การเปลี่ยน class) · config: `classes.json`

### 2.1 สูตร

```
P_role    = Σ over members of role inside the dungeon of  pPerMemberBase + level_i / pLevelDivisor      (1 + L/50)
buff_role = cap × (1 − (1 − base / cap) ^ P_role)                                                        (%)
P_role = 0  →  buff = 0 และใช้ debuff ของ role นั้น (missingDebuffMult)
```

- นับเฉพาะสมาชิกที่อยู่ใน polygon ของ dungeon ณ tick นั้น (`party.countOnlyMembersInsideDungeon`) คนที่ออกก่อนทำให้ buff หายทันที
- ตัวผู้เล่นเองนับรวมใน P ของ role ตัวเอง: Tanker เล่นคนเดียวได้ buff ของตัวเอง แต่ได้ debuff ของอีก 3 role
- สมาชิกที่เลเวลอยู่นอกช่วงของ dungeon: เทอม P ของคนนั้น × `0.92^gap` ต่ำสุด ×0.25 (A-P1-F03-T06-14, GDD "ระดับเลเวลที่เหมาะสม" บอกว่า support เพื่อนได้น้อยลงแต่ไม่ให้ตัวเลข)
- เพดานสมาชิก 8 คน role ซ้ำได้

### 2.2 ผลของ buff ต่อระบบอื่น

| Role | base / cap | ผลเมื่อมี | ผลเมื่อขาด (debuff) | ใช้ที่ |
| --- | --- | --- | --- | --- |
| Tanker | 16 / 45 | damage ที่รับ × (1 − buff) | damage × 1.6 | หัวข้อ 3 |
| Ranged | 17 / 50 | drop × (1 + buff) สูงสุด ×1.5 | drop × 0.6 | หัวข้อ 7 |
| Support | 25 / 50 | heal ในดัน = 0.5% maxHP/นาที × (1 + buff) และชุบเพื่อนเป็น 30% HP (A-12) | heal ในดันไม่ได้เลย | หัวข้อ 3 |
| Magic | 17 / 50 | exp × (1 + buff) สูงสุด ×1.5 · โล่ (0.1 × buff)% maxHP ต่อ reward tick (A-13) | exp × 0.6 | หัวข้อ 3, 4 |

ตัวคูณสูงสุด ×1.5 ของ Ranged และ Magic ใน GDD ตรงกับ cap 50% พอดี จึงไม่ต้องมี clamp แยก

### 2.3 ตรวจกฎ base/cap และส่วนเพิ่มคนที่ 1–4 (ทุกคนเลเวล 25, P = 1.5 ต่อคน)

กฎ: `minBaseToCapRatio 0.3333 ≤ base/cap ≤ maxBaseToCapRatio 0.40` ต้องรันทุกครั้งที่แก้ base หรือ cap

| Role | base/cap | กฎ | 1 คน | 2 คน | 3 คน | 4 คน | ส่วนเพิ่มคนที่ 2 / 3 / 4 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tanker | 0.356 | ผ่าน | 21.7% | 33.0% | 38.8% | 41.8% | +11.2 / +5.8 / +3.0 |
| Ranged | 0.340 | ผ่าน | 23.2% | 35.6% | 42.3% | 45.9% | +12.4 / +6.7 / +3.6 |
| Support | 0.500 | ยกเว้นโดยเจตนา (D-004) | 32.3% | 43.8% | 47.8% | 49.2% | +11.4 / +4.0 / +1.4 |
| Magic | 0.340 | ผ่าน | 23.2% | 35.6% | 42.3% | 45.9% | +12.4 / +6.7 / +3.6 |

- Tanker ตรงตาราง GDD ทุกช่อง (21.7 / 33.0 / 38.8 / 41.8) · GDD เขียนส่วนเพิ่มคนที่ 2 เป็น +11.3 เพราะลบจากค่าที่ปัดแล้ว ค่าจริง 11.25
- ค่าต่อ 1 คนตรง GDD: Tanker 21.7, Ranged และ Magic 23.2, Support 32.3
- Support 25/50: อัตราส่วน 0.50 อยู่เหนือกฎ ผลคือคนที่ 3 และ 4 แทบไม่เพิ่ม (+4.0, +1.4) ซึ่งเป็นทิศที่ปลอดภัย (ไม่มีเหตุให้ซ้อน Support) คงไว้ตาม D-004 และ config บันทึกไว้ที่ `baseCapRule.intentionalExceptions = ["support"]` ตัวตรวจกฎต้องรายงาน Support ว่า EXCEPTION ไม่ใช่ FAIL
- Tanker เลเวล 50 หนึ่งคน (P 2.00 → 26.3%) ใกล้กับ Tanker เลเวล 1 สองคน (P 2.04 → 26.6%) (F-5)

### 2.4 เป้าหมายสมดุล party ต่อหัว

เป้า GDD: party ครบ role ได้รางวัลต่อหัว 1.8–2.2 เท่าของคนเดียว (`economy.json#partyReward`)

ตรวจเบื้องต้น (ทุกคนเลเวล 25 ครบ 4 role คนละ 1 เทียบคนเดียวที่ไม่ใช่ Ranged): drop × 1.232 / 0.6 = **2.05 เท่า** · exp เช่นกัน 2.05 เท่า · อยู่ในเป้า และเป็นหลักฐานว่า GDD ตั้งใจให้ debuff ใช้กับคนเล่นคนเดียวด้วย (ไม่งั้นอัตราส่วนเหลือ 1.23) · T08 วัดเต็มรูปรวมค่ายาและเวลาอยู่รอด

### 2.5 ค่าเปลี่ยน class

```
classChangeCost = costCoef × (level / costLevelDivisor) ^ costExponent        = 500 × (L/10)^2
```

เลเวล 10 / 20 / 30 / 50 = 500 / 2,000 / 4,500 / 12,500 gold ตรง GDD · cooldown 24 ชม. ลดด้วยเงินไม่ได้ · กลับ class เดิมภายใน 168 ชม. (7 วัน) คืน allocation ฟรี · เลเวลคงเดิม stat point reset

## 3. Damage, HP และเวลาอยู่รอด

แหล่ง: GDD "HP การตาย และการฟื้นฟู" (damage มาจากไหน, ระบบกันตาย, เมื่อตาย, การออกจาก dungeon) · config: `combat.json`, `dungeons.json#hpSafety`, `progression.json#hpRecovery`

### 3.1 สูตร

```
Z            = round((levelRange.min + levelRange.max) / 2)                       (A-1)
monsterATK   = monsterAtkCoef × Z ^ monsterAtkExponent                             = 3 × Z^1.3
defRed       = DEF / (DEF + defSoftcap)                                            softcap 300
tankerTerm   = (1 − tankerBuff/100)        ถ้ามี Tanker ในดัน
             = missingDebuffMult (1.6)     ถ้าไม่มี
gapMult      = 1.25 ^ max(0, levelRange.min − playerLevel)                        (A-2, ไม่มีเพดาน)
failMult     = 2 ในสัปดาห์หลังล้มบอสไม่สำเร็จ ไม่งั้น 1                            (A-16)
damagePerHit = monsterATK × (1 − defRed) × tankerTerm × gapMult × failMult
```

- ทุก `45–75 วินาที` (สุ่มแบบ uniform) ระบบทอยว่าโดนตีไหม โอกาส `combat.attackCheck.hitChancePerCheck_pct` = 54% (A-4 · ค่าตั้งต้น T06 คือ 50% · T07 fit ใหม่เป็น 54 ด้วย least-squares ต่อแถว 45 และ 55 นาทีของ GDD · D-029 ACCEPTED)
- โล่ Magic ดูดซับ damage ก่อน HP (A-13) · heal ของ Support ทำงานเฉพาะเมื่อมี Support ในดัน (A-12)
- HP ≤ 30% → สั่น + push ครั้งเดียวต่อการลงผ่านเกณฑ์ · HP ต่ำกว่า (<) ยาอัตโนมัติ 40% → ใช้ยาเล็กก่อน (A-15b) · HP ≤ 25% และเปิด auto-retreat (default) → ถอนอัตโนมัติ เก็บของครบ run จบ · HP = 0 → ตาย ของใน run หายหมด (ตายได้เฉพาะเมื่อปิด auto-retreat) · ลำดับที่แน่นอนต่อ hit อยู่ในหัวข้อ 3.1.1 (R-B1)
- ออกจาก dungeon แล้วฟื้น 1.6667% maxHP/นาที × (1 + 1.5% × VIT) (A-15a) · ตายแล้วฟื้นจาก 0 ถึง 50% ใน 30 นาที · ยาชุบชีวิตฟื้นเป็น 50% ทันที

### 3.1.1 ลำดับผลต่อ hit หนึ่งครั้ง (R-B1, D-078 · P2-F06-T01)

ใช้ทุกครั้งที่การทอยตีโดน (ไม่ใช้ตอน speed lock, Grace หรือ Suspended เพราะไม่มีการตี) · reference implementation: `tools/sim/src/hit.ts` ฟังก์ชัน `resolveHit` · vector: `design/systems/test-vectors/damage.json` ที่ `input.fn = "resolveHit"` (26 ตัว)

```
1. โล่      : absorbed = min(shield, damage) · shield −= absorbed · toHp = damage − absorbed
2. HP       : auto-retreat เปิด → hpAfterHit = max(1, hp − toHp)        hit เดียวไม่พา HP ต่ำกว่า 1
              auto-retreat ปิด → hpAfterHit = max(0, hp − toHp)        ถ้า 0 → ตาย จบทันที (ไม่ใช้ยา ไม่เตือน ของใน run หาย)
3. ยาอัตโนมัติ: เปิดอยู่ AND hpAfterHit < maxHP × autoPotion.defaultThreshold_pct (40) AND มียาในกระเป๋า
              → ดื่ม 1 ขวด ขวดแรกที่ count > 0 ตาม defaultPotionOrder (เล็ก → กลาง → ใหญ่, A-15b)
              heal = maxHP × heal_pct × (1 + vitPotionEfficiency_pct × VIT / 100) / 100 · ไม่เกิน maxHP
4. ถอยอัตโนมัติ: เปิดอยู่ AND hpAfter ≤ maxHP × autoRetreatThreshold_pct (25) → autoRetreat (เก็บของครบ run จบ)
5. เตือน HP ต่ำ: hp ก่อนโดน > maxHP × lowHpWarningThreshold_pct (30) AND hpAfter ≤ เส้นนั้น → เตือน (สั่น · push เลื่อน Phase 8)
              อ่านจาก HP สุดท้ายหลังดื่มยา · ครั้งเดียวต่อการลงผ่านเส้น
ผลลัพธ์     : { shieldAbsorbed, shieldAfter, hpAfterHit, potionUsed, potionHealed, hpAfter, outcome: continue | autoRetreat | died, lowHpWarning }
```

| เงื่อนไขขอบ | ผล (maxHP 1,000 · vector) |
| --- | --- |
| hit ใหญ่กว่า maxHP, auto-retreat เปิด, ไม่มียา | HP 1 → autoRetreat + เตือน |
| เหมือนกัน แต่มียาเล็ก | HP 1 → ยาเล็ก → 301 → เล่นต่อ ไม่เตือน (301 > 300) |
| hit ใหญ่กว่า maxHP, auto-retreat ปิด | ตาย ไม่ดื่มยาแม้มียา |
| HP เหลือ 250 พอดี (25%) ไม่มียา | autoRetreat (≤) |
| HP เหลือ 400 พอดี (40%) | ไม่ดื่มยา (<) |
| HP เหลือ 300 พอดี จากเหนือเส้น | เตือน (≤) · ถ้าก่อนโดนอยู่ใต้เส้นแล้ว ไม่เตือนซ้ำ |
| ยาเล็กหมด | ใช้ยากลางแทน · ยาใหญ่ถูกตัดที่ maxHP |
| ดื่มยาแล้วยังต่ำกว่า 25% (ยาสมมติ 10%) | autoRetreat |

- ข้อสมมติ (A-P2-F06-T01-1, เจ้าของ game-director): ดื่มยา **1 ขวดต่อ hit** เหมือน simulator ของ Phase 1 · การเลือกขนาดแบบ "ยาเล็กสุดที่พา HP พ้นเกณฑ์" (D-079 ข้อ 3) เป็นงาน Phase 4 · ถ้าตายจะไม่มีการเตือน HP ต่ำ (event ตายแทน)
- ถ้าเปิด auto-retreat ผู้เล่นตายจาก hit ไม่ได้เลย (HP ต่ำสุด 1 แล้วถอยทันทีถ้ายาไม่พาพ้น 25%) · ตายได้ทางเดียวคือปิด auto-retreat ในหน้าตั้งค่า · telemetry `run_death` ต้องสะท้อนข้อนี้ (D-078)
- Monte Carlo ของ `survival.ts` ใช้พื้น HP 1 เดียวกันเมื่อจำลอง auto-retreat (`stopAt_pct > 0`) · ตัวเลขทุกแถวของ report ไม่เปลี่ยน เพราะ damage ต่อ hit ทุกแถวของ report (สูงสุด 5.2% maxHP ที่ solo ×1.6) ไม่เคยข้ามจากเหนือ 25% ถึง 0 ในครั้งเดียว · กรณีที่ข้ามได้จริงคือเลเวลต่ำกว่าช่วงมาก (×1.25^gap) หรือสัปดาห์ล้มบอส (×2) ซึ่ง vector ขอบครอบไว้

### 3.2 สมมติฐาน "build สมดุล" สำหรับ simulator

- แต้ม 3 × L แบ่ง 4 ทางเท่ากัน (ATK / DEF / HP / VIT)
- อุปกรณ์ tier ตาม `equipment.json#tierByLevel` (A-5) +0 ทุกช่อง · DEF = 20 + 3 × แต้ม DEF + gearStat เกราะ + 0.5 × gearStat เครื่องราง (A-6)
- HP = 300 + 150 × แต้ม HP

### 3.3 ผลเบื้องต้น (โอกาสโดนตี 50%, รอบเฉลี่ย 60 วินาที, เลเวลตรงโซน, ไม่ใช้ยา, damage ×1.0)

> บันทึกประวัติของ T06 ที่ hit chance 50% · ค่าปัจจุบันคือ 54% (D-029) ผลที่ 54% จาก simulator: เลเวล 25 ถึง auto-retreat 44.4 นาที / ถึง HP 0 57.4 นาที · มี Tanker เลเวล 25 = 55.6 นาที · คนเดียวที่ไม่ใช่ Tanker (×1.6) 27.8 / 37.0 นาที (`design/systems/sim-report.md` หัวข้อ 3 แถว 12–14) · ทุกแถวของตารางด้านล่างสั้นลงราว 8% ที่ค่าปัจจุบัน

| เลเวล = Z | DEF | HP | damage ต่อครั้ง | นาทีถึง auto-retreat 25% | นาทีถึง HP 0 |
| --- | --- | --- | --- | --- | --- |
| 10 | 88 | 1,425 | 46.3 | 46.1 | 61.5 |
| 25 | 286 | 3,112 | 100.9 | 46.3 | 61.7 |
| 40 | 423 | 4,800 | 150.5 | 47.8 | 63.8 |
| 60 | 583 | 7,050 | 208.8 | 50.6 | 67.5 |

- เส้นแบนดีตลอดช่วงเลเวล (46–51 นาที) แปลว่า GDD ตั้ง exponent 1.3 ของ monsterATK ให้เข้ากับการโตของ HP + DEF + gear ได้แล้ว
- มี Tanker เลเวล 25 (21.7%): เลเวล 25 → 59.1 นาทีถึง 25% (GDD ราว 55, ต่าง +7%)
- **F-1:** ถ้าไม่มี Tanker เลยตาม GDD ตัวอักษร damage × 1.6 → เลเวล 25 เหลือ 28.9 นาทีถึง 25% และ 38.6 นาทีถึง HP 0 · Tanker เล่นคนเดียวได้ buff ตัวเองจึงอยู่ได้ 59 นาที ส่วน Ranged, Support, Magic เล่นคนเดียวอยู่ได้ราว 29 นาที ต่างกันสองเท่าตาม class
- ข้อเสนอเบื้องต้นให้ T07 (ต่อมาเป็น D-020 PROPOSED รอ HUMAN): ใช้นิยาม "45 นาที = เวลาถึง auto-retreat ที่ damage ×1.0" (ตรงกับความเห็นของ game-director ใน SF-4 ว่าให้นับถึงตอนถูกพากลับ) แล้วรายงานกรณีคนเดียวที่ไม่ใช่ Tanker เป็น decision authority HUMAN เพราะสั้นกว่า 45 เกิน 20%

### 3.4 ต้นทุนยาต่อชั่วโมง (ภาพตัวอย่างให้ T08 ขยาย ไม่รับ 600 เป็น input)

```
hpLossPerHour_pct = (3600 / meanCheckInterval_s) × hitChance × damagePerHit / maxHP × 100
potionCostPerHour = hpLossPerHour_pct / (heal_pct × (1 + vitPotionEfficiency_pct × VIT / 100)) × buyPrice      (1% ต่อแต้มตั้งแต่ D-038 B, เดิม 2%)
```

(ตัวเลขย่อหน้านี้เป็นของ T06 ที่ hit chance 50% · ที่ 54% ผลของ T08 คือยาเล็กล้วน 525 และยากลางล้วน 699 gold/ชม. ดู sim-report หัวข้อ 3 แถว 20–21)

เลเวล 25 build สมดุล damage ×1.0: เสีย HP 97% ต่อชั่วโมง (ไม่คิดโบนัส VIT) → ยาเล็กล้วน 487 gold/ชม., ยากลางล้วน 649 gold/ชม. · GDD 600 อยู่ระหว่างสองค่านี้ จึงสอดคล้องในกรณี damage ×1.0 · กรณีคนเดียวที่ไม่ใช่ Tanker (×1.6) = 779–1,038 gold/ชม. คู่กับรายได้ที่ drop ×0.6 → อัตราส่วนต่ำกว่า 2.45 มาก (F-2, ให้ T08 ยืนยัน)

## 4. Progression: exp และ stat

แหล่ง: GDD "Progression > ตัวเลขตั้งต้น" (Exp curve, ตัวคูณ exp, Stat) · config: `progression.json`

### 4.1 สูตร exp

```
expToNext(L)   = 60 × L ^ 2.2                        L = 1..59 (60 คือเลเวลสูงสุด ไม่มี expToNext)
expPerTick(Z)  = 30 × Z ^ 1.5                        ต่อ reward tick ที่ผ่าน movement gate
expMult        = magicTerm × gapTerm
  magicTerm    = 1 + magicBuff/100 (สูงสุด 1.5)  ถ้ามี Magic ในดัน  ·  0.6 ถ้าไม่มี
  gapTerm      = max(0.25, 0.92 ^ gap)            gap = ระยะห่างจากช่วงเลเวลของ dungeon ทั้งสองฝั่ง (A-3)
expGained      = expPerTick(Z) × expMult
ticksPerLevel  = expToNext(L) / expPerTick(L) = 2 × L^0.7      (เมื่อ Z = L และ expMult = 1)
```

| เลเวล | tick ต่อเลเวล (สูตร) | GDD | เวลาเดิน (5 นาทีต่อ tick) |
| --- | --- | --- | --- |
| 10 | 10.0 | 10 | 50 นาที |
| 20 | 16.3 | 16 | 81 นาที |
| 30 | 21.6 | 22 | 108 นาที |
| 45 | 28.7 | 29 | 144 นาที |
| 60 | 35.1 | 35 | 176 นาที |

- รวมเลเวล 1 → 60: 1,222 tick = 101.9 ชม. (GDD ราว 1,240 / 103) · เลเวล 1 → 30: 30.9 ชม. (GDD ราว 32) (F-4)
- 40 นาทีต่อวัน → 153 วัน (GDD ราว 5 เดือน) · 3 ชม. ต่อวัน → 34 วัน (GDD เดือนกว่า) · ทั้งหมดที่ expMult = 1.0 (F-2)
- ถ้าเล่นคนเดียวไม่ใช่ Magic (×0.6): 170 ชม. · party มี Magic เลเวล 25 หนึ่งคน (×1.232): 82.7 ชม.
- เลเวลไม่ลดเมื่อตาย exp ที่ได้ไปแล้วไม่หาย (GDD ไม่ได้กำหนดโทษ exp · ของใน run เท่านั้นที่หาย)

### 4.2 Stat

```
statPoints(L) = 3 × L                                   (เลเวล 60 = 180 แต้ม)
ATK = 20 + 4 × ptsATK + gearATK
DEF = 20 + 3 × ptsDEF + gearDEF
HP  = 300 + 150 × ptsHP
VIT = ptsVIT + gearVIT  →  ฟื้น HP เร็วขึ้น 1.5% ต่อแต้ม, ประสิทธิภาพยา +1% ต่อแต้ม (D-038 B, P2-F06-T01 · GDD เดิม +2% แก้ถ้อยคำตาม D-084)
```

ตรวจ build สุดขั้วเลเวล 60 กับ GDD: ATK 740, DEF 560 (ลด damage 65.1%), HP 27,300 ตรงทั้งสามค่า · ตัวเลขนี้ยืนยันว่า "3 แต้มต่อเลเวล" นับเลเวล 1 ด้วย (3 × 60 = 180) ไม่ใช่ 3 × 59

## 5. อุปกรณ์

แหล่ง: GDD "Progression > ตัวเลขตั้งต้น > อุปกรณ์", "Raid Boss > ของบอส", "Economy > ระบบแลกเปลี่ยน" · config: `equipment.json`

```
gearStat(T, e) = round( 30 × T^1.4 × (1 + 0.08 × e) )          T = 1..5, e = ระดับตีบวก 0..15
bossGearStat   = round( 30 × 5^1.4 × 1.2 × (1 + 0.08 × e) )
```

| Tier | +0 สูตร / GDD | +10 สูตร / GDD | +15 สูตร / GDD |
| --- | --- | --- | --- |
| 1 | 30 / 30 | 54 / 54 | 66 / 66 |
| 2 | 79 / 79 | 143 / 142 | 174 / 174 |
| 3 | 140 / 140 | 251 / 252 | 307 / 308 |
| 4 | 209 / 209 | 376 / 376 | 460 / 460 |
| 5 | 286 / 285 | 514 / 513 | 628 / 627 |

- ต่าง 1 แต้มใน 6 ช่อง เหตุผลใน F-3 · เชื่อสูตร vector ใช้ tolerance ±1
- ช่อง: อาวุธ → ATK เต็ม, เกราะ → DEF เต็ม, เครื่องราง → ATK 50% + DEF 50%, รองเท้า → VIT = gearStat × 0.25 แต้ม (A-6)
- ของบอส: tier 5 ค่าพื้นฐาน ×1.2 (+0 = 343), bind on pickup, ตีบวกได้ ขายและแลกไม่ได้ ขาย NPC ไม่ได้
- อุปกรณ์ที่ตีบวกแล้วผูกกับตัวถาวร (`binding.bindOnFirstEnhance`)
- tier ที่คาดหวังตามเลเวล: tier 1 เลเวล 1–12 … tier 5 เลเวล 49–60 (A-5) ใช้ใน simulator และเป็นแนวทาง drop table ของ level-designer

## 6. ตีบวก

แหล่ง: GDD "Progression > ระบบตีบวก", "วัตถุดิบและการตีบวก" · config: `enhance.json`

```
chance(target, fails) = min(100, successRate[target] + min(maxBonus 25, 5 × consecutiveFails))      (%)
attempt:  จ่าย cost[target] เสมอ (วัตถุดิบ + gold)
success → level = target, consecutiveFails = 0
fail    → target ≤ 3: เป็นไปไม่ได้ (100%)
          4..6: level คงเดิม (เสียวัตถุดิบอย่างเดียว)
          7..15: level = target − 2 (ลดลง 1 จากระดับปัจจุบัน)
          consecutiveFails += 1
```

| ระดับที่ตี (target) | โอกาส | ผลล้มเหลว | ผงธาตุ / แก่นธาตุ / หินรอยแยก | gold ต่อครั้ง |
| --- | --- | --- | --- | --- |
| +1 ถึง +3 | 100% | — | 5 / 0 / 0 | 200 |
| +4 / +5 / +6 | 80 / 70 / 60% | เสียวัตถุดิบ | 15 / 3 / 0 | 1,200 |
| +7 / +8 / +9 | 45 / 35 / 25% | ลด 1 ระดับ | 40 / 10 / 1 | 6,000 |
| +10 / +11 / +12 | 20 / 17 / 14% | ลด 1 ระดับ | 90 / 25 / 4 | 20,000 |
| +13 / +14 / +15 | 11 / 8 / 5% | ลด 1 ระดับ | 180 / 60 / 12 | 60,000 |

- **ไม่มีสถานะแตกหรือหาย** (`rules.itemCanBreak = false`, `itemCanBeDestroyed = false`) ผลล้มเหลวมีได้แค่ `materialsLost` กับ `dropOneLevel` ตาม GDD และ non-negotiable ข้อ 6 (N-5)
- โอกาสผูกกับระดับเป้าหมาย ยืนยันจากตัวอย่าง GDD "+7 → +8 โอกาสสำเร็จ 35%"
- ขั้นภายในช่วงเป็นเส้นตรง (A-7b) · ช่วง +10 ขึ้นไปกระจาย 20 → 5 บน +10..+15 · เพดาน +15 ใน v1 (A-7a, F-8)
- สะสมความล้มเหลว +5 จุดเปอร์เซ็นต์ต่อครั้งติดกัน เพดาน +25 จุด รีเซ็ตเมื่อสำเร็จ นับต่อชิ้น (A-7c) · T08 ใช้ Monte Carlo วัดความยาวของ streak ล้มเหลวและจำนวนครั้งเฉลี่ยจาก +10 ไป +15 ("หลายสัปดาห์" ตาม GDD)
- แกนบอสต่อครั้งสำหรับของบอส: ยังไม่มีค่า (`null`, A-7d, Phase 6)

## 7. Drop

แหล่ง: GDD "Progression > ตัวเลขตั้งต้น > Drop table", "การกำหนด dungeon", "Anti-cheat ชั้น 4", "Raid Boss > เมื่อล้มบอสไม่สำเร็จ" · config: `drops.json`

```
ต่อ reward tick ที่ผ่าน movement gate เท่านั้น ทอยแต่ละ rarity แยกกัน
rangedTerm   = 1 + rangedBuff/100 (สูงสุด 1.5) ถ้ามี Ranged ในดัน · 0.6 ถ้าไม่มี
smallTerm    = dungeon เล็ก: rare, epic, legendary × 1.5 · จำนวน common × 0.6 · ไม่เล็ก: 1
failTerm     = 1.6 + 0.4 × bossHpFractionLeft ในสัปดาห์หลังล้มบอสไม่สำเร็จ · ไม่งั้น 1      (A-16b)
trustTerm    = 0.5 และ epic, legendary = 0 ถ้า trust ต่ำ · ไม่งั้น 1
commonQty    = uniformInt(1, 3) × rangedTerm × smallCommonTerm × failTerm × trustTerm   (ปัดแบบสุ่มตามเศษ)
chance_r     = min(100, base_r × rangedTerm × smallTerm_r × failTerm × trustTerm)       r = uncommon..legendary
```

| Rarity | โอกาสฐานต่อ tick | ได้อะไร (A-8) | ขาย NPC |
| --- | --- | --- | --- |
| Common | 100% (1–3 ชิ้น) | ผงธาตุ | 20 |
| Uncommon | 25% | แก่นธาตุ 1 | 120 |
| Rare | 6% | หินรอยแยก 1 | 900 |
| Epic | 1.2% | อุปกรณ์ tier ของ dungeon | ขายไม่ได้ (A-8b) |
| Legendary | 0.2% | อุปกรณ์ tier ของ dungeon | ขายไม่ได้ (A-8b) |

- ตัวคูณทุกตัวคูณกัน (`multipliers.stacking = multiplicative`) · Ranged คูณทุก rarity รวมจำนวน common (A-9)
- dungeon เล็ก = พื้นที่ต่ำกว่า 20,000 ตร.ม. (A-10) ให้ของน้อยชิ้นแต่ rare สูง ตาม GDD
- ความถี่ที่ตัวคูณ 1.0 (12 tick ต่อชั่วโมง): 40 นาทีต่อวัน (8 tick) → Epic ทุก 10.4 วัน, Legendary ทุก 62.5 วัน · 3 ชม. ต่อวัน (36 tick) → Epic ทุก 2.3 วัน, Legendary ทุก 13.9 วัน · ตรงกับ GDD ทั้งสี่ค่า (F-2: คนเดียวที่ไม่ใช่ Ranged ช้าลง 1/0.6 เท่า)
- การปัดจำนวน common แบบสุ่มตามเศษ (เช่น 1.2 → 1 หรือ 2 ด้วยโอกาส 80/20) เป็นข้อเสนอเพื่อให้ค่าเฉลี่ยตรงสูตร ต้องใช้ RNG ฝั่ง server เท่านั้น

## 8. Economy

แหล่ง: GDD "Progression > ราคา NPC และยา", "Economy" (Gold source, Gold sink, ระบบแลกเปลี่ยน, มาตรการคุมเงินเฟ้อ) · D-005 · config: `economy.json`

### 8.1 ราคา

| รายการ | ค่า |
| --- | --- |
| ขาย NPC: ผงธาตุ / แก่นธาตุ / หินรอยแยก | 20 / 120 / 900 gold · ไม่จำกัดจำนวนต่อวัน (GDD ตั้งใจ · `economy.npcPricing.npcDailySellLimit = null` แปลว่าไม่มีเพดาน) |
| ยา HP เล็ก 30% / กลาง 60% / ใหญ่ 100% | 150 / 400 / 1,000 gold (gold ต่อ 1% HP = 5.0 / 6.7 / 10.0) |
| ยาชุบชีวิต 0 → 50% | 2,500 gold ใช้ในดันได้ |
| ราคา NPC เทียบมูลค่าตลาด | 40–50% (ใช้ตอนตรวจราคาตลาดจริงหลัง beta) |

- ขายให้ NPC และซื้อยาอยู่ในร้าน NPC ที่ปลดเมื่อจบ run ที่นับครั้งแรก (`unlocks.npcShop`, D-065) ไม่ผูกกับตลาดผู้เล่น (`unlocks.market`, L8) ดูหัวข้อ 10

ยาเล็กคุ้มสุดต่อ HP ยาใหญ่จ่ายเพื่อความเร็ว (ฟื้นครั้งเดียว) · ยาอัตโนมัติ default ที่ 40% ใช้ยาเล็กก่อน (A-15b)

### 8.2 รายได้และเป้าอัตราส่วน

```
incomePerHour = ticksPerHour × [ E(commonQty) × 20 + P(uncommon) × 120 + P(rare) × 900 ]        (ตัวคูณ drop รวม)
              = 12 × [ 2 × 20 + 0.25 × 120 + 0.06 × 900 ] = 12 × 124 = 1,488 gold/ชม.        (ตัวคูณ 1.0)
ratio         = incomePerHour / potionCostPerHour      เป้า 2.5–3, ยอมต่ำสุด 2.45 (economy.incomeToPotionRatio)
```

- ส่วนประกอบรายได้: ผงธาตุ 480 + แก่นธาตุ 360 + หินรอยแยก 648 · หินรอยแยกเป็น 44% ของรายได้ ดังนั้นโอกาส Rare คือคันโยกเศรษฐกิจที่แรงที่สุด ตรงกับ GDD "ค่าที่ต้องจูนก่อนอื่นหลัง beta"
- 1,488 / 600 = 2.48 อยู่ในช่วงที่ยอมรับ (D-005) · ค่ายา 600 ต้องมาจาก damage model (หัวข้อ 3.4) T08 ห้ามรับเป็น input
- ถ้าขายวัตถุดิบทั้งหมดให้ NPC จะไม่มีวัตถุดิบเหลือไปตีบวก รายได้ 1,488 จึงเป็นเพดานบนของ gold ไม่ใช่รายได้ที่ผู้เล่นทั่วไปเห็น

### 8.3 ภาษีตลาดขั้นบันได

| มูลค่าขายสะสมในวัน (gold) | ภาษี |
| --- | --- |
| 0–20,000 | 10% |
| 20,001–60,000 | 18% |
| 60,001–150,000 | 26% |
| เกิน 150,000 | 35% |

```
tax(sale) = Σ over brackets of  (ส่วนของ sale ที่ตกในช่วงนั้น เมื่อนับต่อจากยอดสะสมของวัน) × tax_pct      (A-19a แบบขั้นบันไดส่วนเพิ่ม)
รีเซ็ตยอดสะสม 00:00 เวลา Asia/Bangkok
```

ตัวอย่าง: ยอดสะสม 15,000 แล้วขายอีก 10,000 → 5,000 × 10% + 5,000 × 18% = 1,400 gold

### 8.4 กฎตลาด

listing เท่านั้น, ไม่ระบุตัวตน, ห้ามโอน gold ตรง, แลกได้เฉพาะวัตถุดิบดิบและของสิ้นเปลือง, กรอบราคา ±40% จากค่าเฉลี่ย 7 วัน, บัญชีอายุต่ำกว่า 7 วัน trade ไม่ได้, เพดานมูลค่าโอนต่อวัน = 1,000 gold × เลเวล (A-19b)

### 8.5 Gold sink ที่มีสูตร

ยา (หัวข้อ 3.4), ตีบวก (หัวข้อ 6), เปลี่ยน class (หัวข้อ 2.5), ภาษีตลาด (8.3), ของบอสที่ขายไม่ได้ (หัวข้อ 5)

## 9. Dungeon, run state และ movement gate

แหล่ง: GDD "พื้นที่เล่นและ Dungeon", "Core loop ใน Dungeon > Movement gate", "ระบบกันตาย", "ระบบหลังบ้าน > Validation", "สัญญาณขาดและแอปถูกปิด" · config: `dungeons.json`

| ค่า | config key | ค่า |
| --- | --- | --- |
| พื้นที่ต่ำสุด / สูงสุด | `area.minArea_m2` / `maxArea_m2` | 3,000 / 150,000 ตร.ม. (นอกช่วง = เตือนตอนวาด · script coverage อ่านค่านี้ A-P1-PLAN-01-5) |
| Grace | `runState.graceMax_s` | 180 วินาที |
| Suspended | `runState.suspendedMax_s` | 900 วินาที (เกิน = Ended สรุปรางวัล) |
| Reward tick | `rewardTick.rewardTickInterval_s` | 300 วินาที |
| Movement gate | `movementGate.minDistancePerWindow_m` / `window_s` | เกิน 50 ม. ต่อ 300 วินาที · ใช้ทั้ง dungeon และ raid ไม่มีข้อยกเว้น |
| Auto-retreat | `hpSafety.autoRetreatThreshold_pct` | 25% เปิดเป็น default |
| แจ้งเตือน HP | `hpSafety.lowHpWarningThreshold_pct` | 30% สั่น + push |
| offline evidence | `offlineEvidence.maxOfflineEvidenceAge_s` | 1,800 วินาที |
| ปิดฉุกเฉิน: tick ค้างขั้นต่ำ | `emergencyClose.partialTickMinElapsed_s` | 60 วินาที (ต่ำกว่านี้ tick ค้างไม่จ่าย) · D-059 PROPOSED |
| พัก dungeon จากรายงาน | `safety.*` | หมวด "ที่นี่อันตราย" จากผู้เล่นต่างกัน 5 คนที่อยู่ที่นั่นจริง trust ไม่ต่ำ จากอย่างน้อย 2 กลุ่มอิสระ ภายใน 24 ชม. → `suspendPendingModerator` · D-061 ที่แก้ (หัวข้อ 17.6) |

```
distance(rewardWindow k) = Σ haversine ของคู่จุด grid (ทุก 5 วินาทีของเวลา Active) ที่อยู่ใน chain เดียวกัน   (รายละเอียดหัวข้อ 16.2)
tickGranted              = distance(rewardWindow k) > 50        หน้าต่าง k ครอบ τ ∈ (300k, 300(k+1)] วินาทีของเวลา Active
outsideTime ≤ 180 → Grace · 180 < outsideTime ≤ 900 → Suspended · > 900 → Ended               (ขอบเป็น ms หัวข้อ 16.4)
```

- ค่าของตัวกรอง, resample, hysteresis, speed lock, เวลาทำการ และ vector อยู่ในหัวข้อ 16 (P2-F05-T20) · ฉบับก่อนหน้าเขียน "300 วินาทีล่าสุด" (หน้าต่างเลื่อน) ซึ่งเป็นแบบของ HUD (`gateDiagnosticWindows`) เท่านั้น ไม่ใช่หน้าต่างตัดสินรางวัล (ADR 0003 5.1–5.2)

```
ปิดฉุกเฉิน (dungeons.emergencyClose, D-059 PROPOSED · A-P1-X04-1)
  tick ที่จบก่อนปิด    : จ่ายเฉพาะ tick ที่ผ่าน movement gate ปกติแล้ว
  tick ที่ค้างตอนปิด   : elapsed < 60 วิ → 0
                        ไม่งั้น จ่าย elapsed / 300 ของหนึ่ง tick ถ้า distance(ช่วงที่ค้าง) > 50 × elapsed / 300 (greaterThan)
  คำนวณฝั่ง server · ไม่มีทางลัดข้าม gate (NN-2)
พัก dungeon จากรายงาน (dungeons.safety, D-061 ที่แก้ หัวข้อ 17.6): ผู้เล่นในดันได้รางวัลตามกฎปิดฉุกเฉินข้างบน
```

- ใช้ `>` ตาม GDD "เกิน 50 เมตร" (`movementGate.comparison = greaterThan`) · ระยะเท่ากับ 50.0 พอดีไม่ผ่าน
- กฎคู่: auto-retreat เปิด default + movement gate ต้องอยู่ด้วยกันเสมอ (GDD "ผลข้างเคียงที่ตั้งใจ")
- v1: `verification_mode = continuous_gps`, `floor_level = null`

## 10. เงื่อนไขปลดระบบ (unlocks)

แหล่ง: GDD "10 นาทีแรกของคนใหม่" (สิ่งที่ห้ามสอนใน 10 นาทีแรก), "Economy > ระบบแลกเปลี่ยน", "Raid Boss" · `design/pillars.md` 6.2 (U1–U8 และแถว NPC), 7.1 · D-040, D-041, D-064, D-065 · config: `unlocks.json` v3 · เอกสารอื่นอ้างเป็น `config: unlocks.<system>`

- ทุก object ใช้ `minLevel` และ `minCompletedRuns` (ต้องผ่านทุกข้อ, AND) บวก key เสริมเฉพาะระบบ · server ประเมิน · ปลดแล้วถาวร
- **run ที่นับ:** run ที่จบแล้วด้วยสาเหตุใดก็ได้ (รวมปิดฉุกเฉิน) และมี reward tick ผ่าน movement gate อย่างน้อย 1 ครั้ง · นิยามเดียวอยู่ที่ `unlocks.json` → `_meta._note` (design gate A F-15)
- ตารางเรียงตามลำดับปลดของ D-041 (ACCEPTED) · เวลาเดินคิดที่ตัวคูณ exp 1.0 · เลเวลทุกตัวยังเป็นค่าสมมติ A-20 ของ game-director

| ขั้น | ระบบ (key) | id | เงื่อนไข | เวลาเดินโดยประมาณ | ที่มา |
| --- | --- | --- | --- | --- | --- |
| 1 | ร้าน NPC ขายวัตถุดิบ + ซื้อยา (`npcShop`) | NPC | เลเวล 1 + run ที่นับ 1 | จบ run แรก | D-065 · ไม่จำกัดการขายต่อวัน (`economy.npcPricing.npcDailySellLimit = null`) |
| 1 | lore ยาว (`lore`) | U8 | เลเวล 1 + run ที่นับ 1 | จบ run แรก | D-041 · อ่านเสริม ไม่ push |
| 2 | ลงแต้ม stat (`statAllocation`) | U4 | เลเวล 3 + run 1 | ราว 26 นาที | A-20, A-P1-H03-1 |
| 2 | กลไก party ละเอียด (`partyDetail`) | U6 | เลเวล 3 + run 1 + ได้ buff จาก Nearby Party 1 ครั้ง | ราว 26 นาที · ปุ่มเข้าร่วม Nearby Party ใช้ได้ตั้งแต่นาที 6–8 | A-20, A-P1-H03-3 |
| 3 | ตีบวก (`enhance`) | U2 | เลเวล 5 + run 1 | ราว 74 นาที | A-20 |
| 3 | หน้าประกาศ raid + push (`raid`) | U3 | เลเวล 5 + run 3 · `gatesPhysicalParticipation = false` | ราว 75 นาที | D-040, A-P1-H03-2 · การเข้าร่วมทางกายภาพไม่ล็อก (GDD ให้คนเลเวลต่ำเข้าได้ทันที) |
| 4 | ตลาดผู้เล่น (`market`) | U1 | เลเวล 8 + run 1 | ราว 3 ชม. | D-041 · กฎบัญชีอายุ 7 วันเป็นกฎ trade ของ F12 อยู่ที่ `economy.market.minAccountAgeToTrade_days` ไม่ใช่เงื่อนไขปลด UI |
| 5 | เปลี่ยน class (`classChange`) | U5 | เลเวล 10 + run 3 | ราว 4.5 ชม. | ตารางค่าเปลี่ยนเริ่มที่เลเวล 10 · มาหลัง U4 เพราะ reset stat |
| — | หัวข้อ anti-cheat ในหน้าช่วยเหลือ (`antiCheatHelp`) | U7 | เลเวล 10 + run 3 หรือเกิด event ใน `unlockOnEvents` (OR) | ราว 4.5 ชม. หรือทันทีที่เจอเหตุ | A-P1-H03-4 · id event ยังรอ product-manager |
| — | parental consent (`parentalConsent`) | — | `enabled = false` (scaffold) | — | NN-7 · เปิดต้อง HUMAN |

สถานะหน้าที่บ้าน (display เท่านั้น ไม่กระทบรางวัล)

| สถานะ | นิยาม | config | ที่มา |
| --- | --- | --- | --- |
| "ไกล" | อยู่ใน play area และ dungeon ที่เปิดอยู่ใกล้สุดเกิน 1,900 ม. (ระยะเส้นตรง) | `unlocks.home.farDungeonThreshold_m` | D-079 เพดาน 3,000 / route factor 1.52 = 1,974 → ≤ 1,970 เลือก 1,900 (P2-F06-T01, เดิม 2,000 ตาม A-20b) · D-072 · GDD: 650 ม. ใช้ได้, 3 กม. พัง · ประเมินใหม่เมื่อขยับเกิน `reevaluateDistance_m` 200 ม. (A-P1-H03-5) |
| "นอกพื้นที่" | ตำแหน่งอยู่นอก play area ตาม mask ไม่ใช่ระยะถึง dungeon | `unlocks.home.seeOutOfAreaMask` → `data/map/playarea-mask.geojson` | D-064 · key เดิม `outOfServiceAreaThreshold_m` (20,000 ม.) ถูกตัดใน P1-X18 ห้ามนำกลับ |

- ร้าน NPC ใช้ id `NPC` ถาวร ไม่มีเลข U (pillars 6.2 คำตัดสินเรื่องรหัส P1-X21): ไม่อยู่ในรายการห้ามสอนของ GDD และต้องซื้อยาได้เร็ว (หลักการข้อ 3)
- หมายเหตุชื่อ key: board เขียน `unlocks.home.far_dungeon_threshold_m` ตามรูปแบบ camelCase (ADR 0001 3.10) key จริงคือ `unlocks.home.farDungeonThreshold_m`

## 11. Raid (ร่างแรกสำหรับ Phase 6)

แหล่ง: GDD "Raid Boss" ทั้งหัวข้อ · config: `raid.json`

```
POW_i          = (baseATK_i + gearATK_i) × (1 + level_i / 60) × roleMult_role
                 baseATK = ATK จาก stat (20 + 4 × ptsATK) · roleMult: Ranged 1.3, Magic 1.25, Tanker 0.8, Support 0.75
presenceMult   = 1.0 ถ้าผ่าน movement gate (dungeons.json) · 0.3 ถ้าอยู่ในวงแต่ไม่ขยับ
survivalMult   = 1.0 (HP > 70%) · 0.7 (30% < HP ≤ 70%) · 0.4 (HP ≤ 30%) · 0 (ล้ม)       (A-17c ขอบเขต)
partyMult      = min(cap, 1 + 0.8 × (Σ_role buff_role / cap_role) / 4 × (ครบ 4 role ? 1 : 0.6))   ไม่มี party = 1.0   (A-17)
                 cap = fullPartyCap 1.6 ถ้าครบ 4 role · incompletePartyCap 1.2 ถ้าไม่ครบ   (D-079, P2-F06-T01)
contribution_i = POW_i × presenceMult_i × survivalMult_i × partyMult_i                         ต่อ raid tick 10 วินาที
bossDamage_i   = bossATK × (1 − DEF_i / (DEF_i + 300)) × tankerTerm                            bossATK = null (A-18)
bossHP         = medianPOW_lastWeek × activePlayers_lastWeek × α × 720
                 α = 0.45 ใน 30 วันแรก แล้ว 0.55 · หลังล้มไม่สำเร็จ bossHP สัปดาห์ถัดไป × 0.85
```

- ตรวจ partyMult (vector `design/systems/test-vectors/raid.json` 15 ตัว): ครบ role คนละ 1 เลเวล 25 = 1.411, คนละ 2 = 1.61 → cap 1.60, คนละ 1 เลเวล 60 = 1.520, buff ถึง cap ทุก role = 1.8 → cap 1.60, 3 role เลเวล 25 = 1.169, 3 role คนละ 2 = 1.26 → cap 1.20, role เดียว (Tanker เลเวล 25) = 1.058 · cap ทำให้ผลอยู่ในแถบ GDD 1.4–1.6 / 1.0–1.2 เสมอ (เดิมขอบบนหลุด) · weight และ factor ยังเป็น A-17 ให้ Phase 6 จูน
- ชั้นรางวัล: checkpoint 25 / 50 / 75 / 100% × อันดับ contribution (ต่ำกว่ามัธยฐาน ×0.6, มัธยฐาน–p75 ×1.0, p75–p95 ×1.5, p95 ขึ้นไป ×2.2)
- ล้มไม่สำเร็จ: monsterATK ×2 ทั้งสัปดาห์ (A-16), drop ×1.6–2.0 (A-16b), เตือนเมื่อเหลือ 1,800 วินาทีและลด HP ยังไม่ถึง 75%

## 12. Anti-cheat (ค่าที่เป็นตัวเลข)

แหล่ง: GDD "Anti-cheat > มาตรการเป็นชั้น", "ความปลอดภัยทางกายภาพ", "สัญญาณขาดและแอปถูกปิด" · config: `anticheat.json`

| มาตรการ | ค่า |
| --- | --- |
| เดินเข้ามาต่อเนื่องก่อน check-in | ≥ 60 วินาที ห้าม teleport เข้ากลาง polygon |
| accuracy ตอน check-in | < 30 ม. |
| speed lock | 25 กม./ชม. ล็อกการเล่น · เข้าเมื่อเร็วต่อเนื่อง 15 วินาที ปลดเมื่อช้าต่อเนื่อง 60 วินาที ย้อนผลทั้งสองขอบ (หัวข้อ 16.5, P2-F05-T20) |
| น้ำหนัก sample ที่ upload ทีหลัง | 0.5 ของ sample สด (A-21) |
| trust score | 0–100 เริ่ม 70 ต่ำกว่า 40 = ต่ำ → drop ×0.5, ไม่มี Epic ขึ้นไป, trade ไม่ได้ (A-11) |
| audit ผลลัพธ์ | เกิน p99 ของ cohort 3 วันติด → ตั้งธง (A-21b) |

## 13. ทะเบียนค่าสมมติ (ค่าที่ GDD ไม่ระบุ)

รหัสเต็มคือ `A-P1-F03-T06-<n>` · ทุกข้ออยู่ใน config ข้าง key ที่เกี่ยวข้อง

| n | เรื่อง | ค่าที่ใช้ | ไฟล์ | ผู้ยืนยัน |
| --- | --- | --- | --- | --- |
| 1 | Z จากช่วงเลเวล dungeon | ปัดค่ากลางช่วง | combat | game-director, level-designer |
| 2 | damage ×1.25 ต่อระดับที่ต่ำกว่าช่วง | ทบต้น 1.25^gap ไม่มีเพดาน | combat | game-director |
| 3 | exp ×0.92 ต่อระดับที่ห่าง | ทบต้น ต่ำสุด 0.25 ทั้งสองฝั่ง | progression | game-director |
| 4 | โอกาสโดนตีต่อรอบ | 54% (T07 fit จาก 50, D-029 ACCEPTED) | combat | systems-designer |
| 5 | tier ที่คาดหวังตามเลเวล | ทุก 12 เลเวล | equipment | game-director, level-designer |
| 6 | เครื่องราง "ผสม" และรองเท้า VIT | 50/50 ATK/DEF · VIT = gearStat × 0.25 | equipment | game-director |
| 7a | เพดานตีบวก | +15 | enhance | game-director |
| 7b | ขั้นโอกาสภายในช่วง | เส้นตรง, +10..+15 = 20..5 | enhance | game-director |
| 7c | สะสมความล้มเหลว | +5 จุด%, เพดาน +25, รีเซ็ตเมื่อสำเร็จ, ต่อชิ้น | enhance | game-director |
| 7d | แกนบอสต่อครั้ง | null (Phase 6) | enhance | systems-designer |
| 8 | สิ่งที่ได้ต่อ rarity | วัตถุดิบ 1 ชิ้น (Uncommon, Rare), อุปกรณ์ (Epic, Legendary) | drops | game-director |
| 8b | ขายอุปกรณ์ให้ NPC | ไม่ได้ (null) | economy | game-director |
| 9 | Ranged คูณอะไร | ทุก rarity รวมจำนวน Common | drops | game-director |
| 10 | "dungeon เล็ก" | < 20,000 ตร.ม. | drops | level-designer |
| 11 | trust score | 0–100, เริ่ม 70, ต่ำ < 40 | anticheat | game-director, backend-programmer |
| 12 | heal ของ Support และการชุบ | 0.5% maxHP/นาที × (1 + buff), ชุบเป็น 30% | classes | game-director |
| 13 | โล่ของ Magic | (0.1 × buff)% maxHP ต่อ reward tick ไม่ซ้อน | classes | game-director |
| 14 | P ของสมาชิกนอกช่วงเลเวล | × 0.92^gap ต่ำสุด 0.25 | classes | game-director |
| 15a | ฟื้น HP หลังออกปกติ | 1.6667%/นาที เท่ากับหลังตาย | progression | game-director |
| 15b | ยาอัตโนมัติ default | 40%, ยาเล็กก่อน | economy | game-director, uiux-designer |
| 16 | "แข็งแกร่งขึ้น 2 เท่า" | monsterATK × 2 เท่านั้น | combat | game-director |
| 16b | drop หลังล้มบอสไม่สำเร็จ | 1.6 + 0.4 × HP บอสที่เหลือ | drops | game-director |
| 17 | สูตร partyMult ของ raid | หัวข้อ 11 · cap 1.6 / 1.2 ยืนยันแล้ว (D-079) สูตรภายในยังเป็นค่าสมมติ | raid | game-director |
| 17c | ขอบ survivalMult ที่ 30% | 30% พอดี = 0.4 | raid | game-director |
| 18 | bossATK | null (Phase 6) | raid | systems-designer |
| 19a | วิธีคิดภาษีขั้นบันได | ส่วนเพิ่ม (marginal) | economy | game-director |
| 19b | เพดานมูลค่าโอนต่อวัน | 1,000 gold × เลเวล | economy | game-director |
| 20 | เลเวลปลดระบบ | หัวข้อ 10 (ลำดับรับแล้วใน D-041 · เลเวลยังเป็นค่าสมมติ) | unlocks | game-director |
| 20b | ระยะ "ไกล" | 1,900 ม. เส้นตรง (D-079 ยืนยันเพดาน ≤ 1,970 · P2-F06-T01) · "นอกพื้นที่" ไม่ใช่ระยะแล้ว (D-064 ใช้ mask พื้นที่เล่น) | unlocks | game-director (ยืนยันแล้ว D-079) |
| 21 | น้ำหนัก offline sample | 0.5 | anticheat | tech-lead, backend-programmer |
| 21b | "ติดต่อกัน" ของ audit p99 | 3 วัน | anticheat | liveops-operator |
| 22 | ปัดจำนวน Common ที่เป็นเศษ | สุ่มตามเศษ ด้วย RNG ฝั่ง server | drops | systems-designer, backend-programmer |

## 14. หลักฐานการตรวจ และสิ่งที่ T07 / T08 ต้องทำต่อ

> บันทึกประวัติของ T06 (hit chance 50%, ก่อนมี `location.json` และ `privacy.json`) · ผลรันปัจจุบันและคำสั่งอยู่ที่ `design/systems/sim-report.md` หัวข้อ 10 และ `tools/sim/` (T07, T08 เสร็จแล้ว)

ตัวเลขในเอกสารนี้มาจาก script ตรวจชั่วคราวที่อ่าน `config/balance/*.json` โดยตรง (ยังไม่ใช่ simulator ใน `tools/sim/` ซึ่งเป็นงาน T07) ผลที่ได้:

```
valid JSON: anticheat, classes, combat, drops, dungeons, economy, enhance, equipment, progression, raid, unlocks (11/11)
tanker  0.356 PASS             [21.7, 33.0, 38.8, 41.8]  +11.2 +5.8 +3.0
ranged  0.34  PASS             [23.2, 35.6, 42.3, 45.9]  +12.4 +6.7 +3.6
support 0.5   EXCEPTION(D-004) [32.3, 43.8, 47.8, 49.2]  +11.4 +4.0 +1.4
magic   0.34  PASS             [23.2, 35.6, 42.3, 45.9]  +12.4 +6.7 +3.6
tanker L50x1 26.31  L1x2 26.64
ticks/level [(10, 10.0), (20, 16.3), (30, 21.6), (45, 28.7), (60, 35.1)]
L1->60 ticks 1222 h 101.9 | L1->30 h 30.9
tier 1..5 [30,54,66] [79,143,174] [140,251,307] [209,376,460] [286,514,628]
L60 extremes ATK 740 DEF 560 red% 65.1 HP 27300
class change [500, 2000, 4500, 12500]
income/h at mult 1.0: 1488.0  ratio vs 600: 2.48
40 min/day epic every 10.4 d, legendary 62.5 d · 180 min/day epic every 2.3 d, legendary 13.9 d
```

งานต่อ (ไม่ใช่ขอบเขต T06):

- T07: สร้าง `tools/sim/` อ่าน config อย่างเดียว · vector `buff-stacking`, `exp-curve`, `gear`, `damage` รวมขอบ (สมาชิก 0 คน, ถึง cap, เลเวล 1 และ 60, DEF 0) · fit `hitChancePerCheck_pct` และตัดสิน F-1 ตาม SF-4
- T08: drop Monte Carlo, ค่ายาจาก damage model (หัวข้อ 3.4) แยกตาม class และมี/ไม่มี Tanker, อัตราส่วนเทียบ `economy.incomeToPotionRatio`, party ต่อหัว 1.8–2.2, streak ตีบวก · ตัดสิน F-2
- ทุกครั้งที่แก้ base หรือ cap ต้องรันตัวตรวจกฎ base/cap ใหม่ (หัวข้อ 2.3)

## 15. การเปลี่ยนแปลงใน Phase 2 (P2-F06-T01)

| key | เดิม | ใหม่ | ต่าง | อำนาจ | หลักฐาน |
| --- | --- | --- | --- | --- | --- |
| `progression.json#statPerPoint.vitPotionEfficiency_pct` | 2 | 1 | −50% | HUMAN (D-038 ทาง B, 2026-09-25) · ถ้อยคำ GDD แก้ตาม D-084 | คนเล่นคนเดียวเฉลี่ย 4 class VIT on ยาเล็ก เลเวล 25 = 2.69 (MC, report หัวข้อ 8) / 2.70 (report หัวข้อ 6) · IN TARGET · sim-report หัวข้อ 11 |
| `unlocks.json#home.farDungeonThreshold_m` | 2,000 | 1,900 | −5% | game-director (D-079 เพดาน ≤ 1,970 · D-072) · ค่าแน่นอน systems-designer | 3,000 ม. เดินจริง / route factor ถ่วงประชากร 1.52 = 1,974 ม. เส้นตรง · 1,900 × 1.52 = 2,888 ม. เดินจริง |
| `raid.json#partyMult.fullPartyCap` | ไม่มี | 1.6 | ใหม่ | game-director (D-079) | vector `raid.json`: คนละ 2 role ครบ 1.61 → 1.60 · buff ถึง cap 1.80 → 1.60 |
| `raid.json#partyMult.incompletePartyCap` | ไม่มี | 1.2 | ใหม่ | game-director (D-079) | vector `raid.json`: 3 role คนละ 2 1.26 → 1.20 |

- ไม่แตะ: `dungeons.json` (location-engineer แก้ `coverageFilter` ในรอบเดียวกัน) · key ของ gate / run state / check-in ไปทำใน P2-F05-T20
- ผลต่อเวลาอยู่รอด: ไม่เปลี่ยน (VIT ต่อยาไม่กระทบการเสีย HP) · เลเวลตรงโซนไม่ใช้ยา 44.4 นาทีถึง auto-retreat (D-020) · มี Tanker เลเวล 25 55.6 นาที · คนเดียวที่ไม่ใช่ Tanker 27.8 นาที
- R-B1 (หัวข้อ 3.1.1) เป็นกติกาใหม่ ไม่มีค่า config ใหม่ ใช้ `dungeons.hpSafety` และ `economy.autoPotion` เดิม

## 16. Movement gate, run state, check-in, speed lock และเวลาทำการ (P2-F05-T20)

แหล่ง: GDD "Core loop ใน Dungeon > Movement gate", "การเข้าและออก", "สัญญาณขาดและแอปถูกปิด", "Anti-cheat > ชั้น 1", "ความปลอดภัยทางกายภาพ", "เวลาทำการ" · ADR 0003 หัวข้อ 5–7, 9.2 · tech note F04 หัวข้อ 4–8 และ F05 หัวข้อ 2–6 · spec F04 R07–R31, F05 R01–R22 · reference: `tools/sim/src/gate.ts`, `presence.ts`, `opening-hours.ts`, `rng-contract.ts` (เขียนแยกจาก `packages/geo` เพื่อให้ vector ตรวจ geo ได้จริง) · หลักฐาน: `pnpm exec tsx tools/sim/src/report-gate.ts`

### 16.1 ค่าใหม่ใน config

| key | ค่า | เหตุผลย่อ (ข้อความเต็มอยู่ข้าง key ใน config) |
| --- | --- | --- |
| `dungeons.movementGate.sampleCadence_s` | 5 | 300 หารลงตัว · โต๊ะนิ่ง 0/3 หน้าต่าง ม้านั่ง 3/3 (ขอบบาง F-16) · 10 วินาทีม้านั่งตกหมด · เท่าช่วง sample ของเครื่อง 0.2 Hz จึงได้ grid เดียวกับ 1 Hz |
| `dungeons.movementGate.maxSamplePairGap_s` | 30 | ยาวพอสำหรับ 0.2 Hz และสัญญาณหายใต้ต้นไม้ (soi trace ช่องว่างยาวสุด 25 วินาที) · = `graceMax_s` / 6 · ช่องว่าง 5 นาทีห่าง 400 ม. ได้ 0 ม. · เป็นเกณฑ์ "ไม่มีหลักฐาน" ด้วย |
| `dungeons.movementGate.maxSampleAccuracy_m` | 30 | ไม่เข้มกว่า check-in (`< 30`) เพราะ gate ใช้ `≤ 30` · แยก key ตาม ADR 0003 5.5 แต่ตั้งใจให้เท่ากัน |
| `dungeons.movementGate.outlierSpeed_kmh` | 60 | เป็นไปไม่ได้สำหรับคนเดิน แต่สูงกว่า jitter 1 Hz ช่วง warm-up (F-17) · ใช้ชื่อตาม ADR 0003 5.5 (ไม่ใช้ `maxPlausibleSpeed_kmh` ที่ spec เสนอ) |
| `dungeons.movementGate.outlierReanchorSamples` | 5 | ยาวกว่า spike 3 fix ของ drift-spike S2 · 5 วินาทีที่ 1 Hz, 25 วินาทีที่ 0.2 Hz |
| `dungeons.runState.edgeHysteresisSamples` | 6 | 6 × 5 วินาที = 30 วินาที = `graceMax_s` / 6 (กรอบ F04 R15 ข้อ 4) |
| `dungeons.runState.edgeHysteresis_m` | 5 | ≤ 1/3 ของรัศมี 31 ม. และต่ำกว่าครึ่งของแถบริมน้ำกว้าง 20 ม. (ถ้า 10 ม. แถบ 20 ม. จะกลับ Active ไม่ได้เลย) |
| `dungeons.runState.clockSkewTolerance_s` | 5 | sample จากอนาคตเกิน 5 วินาทีถูกทิ้ง · `now_ms` ถอยเกิน 5 วินาที = `clock_invalid` |
| `dungeons.openingHours.utcOffset_min` | 420 | กรุงเทพฯ UTC+7 ไม่มี DST · ห้ามใช้ timezone ของเครื่อง |
| `dungeons.openingHours.closingSoonNotice_s` | 600 | ≥ หนึ่งหน้าต่าง (300) + เดินออกจาก dungeon ใหญ่สุดราว 3 นาที · หน้าต่างที่ค้างตอนปิดจ่ายตาม D-059 จึงไม่เสีย tick |
| `anticheat.speedLock.lockSustained_s` | 15 | spike เดียวให้คู่เร็ว 2 คู่ (2 วินาทีที่ 1 Hz, 10 วินาทีที่ 0.2 Hz) ไม่ถึง · 10 วินาทีจะล็อกคนเดินที่ 0.2 Hz บน drift-spike (report หัวข้อ 4) · รถใน trace ล็อกที่ 84 วินาที |
| `anticheat.speedLock.unlockSustained_s` | 60 | ไฟแดง 45 วินาทีใน trace ยังล็อก · 40 วินาทีจะปลดสลับล็อกที่ไฟแดง · ย้อนผลจึงไม่เสียเวลานาฬิกา |
| `unlocks.home.distanceDisplaySteps_m` | ≤ 1,000 ม. ทีละ 50 · ≤ 10,000 ม. ทีละ 100 · เกินนั้นทีละ 1,000 | ปัดขึ้นเสมอ (R34, acceptance 10) |

- ค่าเดิมที่ตรวจแล้วไม่เปลี่ยน: `anticheat.checkIn.*` (60 วินาที, `< 30` ม., ห้าม teleport), `runState.graceMax_s` 180 / `suspendedMax_s` 900, สวิตช์ `rewardTickDuring*` / `suspendedTimeCounts` = false
- กฎ config ที่ tech-lead จะ lint ใน P2-F04-T24 ผ่านแล้ว: `rewardTickInterval_s` (300) = `window_s` (300) · `connectionLostEndsRunAfter_s` (900) = `suspendedMax_s` (900) · `gateConfigProblems()` ใน `tools/sim/src/params-gate.ts` ตรวจเพิ่ม: `window_s % sampleCadence_s = 0`, `outlierSpeed_kmh > speedLock_kmh`, `maxSamplePairGap_s < graceMax_s`, กรอบ R15 ข้อ 4 ทั้งสองข้อ

### 16.2 สูตรของ rewardWindow (ADR 0003 5.2–5.3, tech note F05 2–4)

```
τ(t)          = เวลาที่นาฬิกาเดินสะสมจาก confirm ถึง t      นาฬิกาเดินเมื่อ run ยืนยันเป็น in และไม่ lock (หลัง backdate)
หน้าต่าง k    = τ ∈ (k·300, (k+1)·300] วินาที · ไม่ทับกัน · หยุด/เดินต่อ ไม่รีเซ็ต · ตัดสินเมื่อมี sample ที่ใช้ได้ที่ τ ≥ ปลายหน้าต่าง
ขั้น 1 ตัวกรอง  : ทิ้ง accuracy > 30 · ทิ้งถ้าความเร็วจาก anchor > 60 กม./ชม. · ทิ้งเร็วติดกันที่สอดคล้องกันครบ 5 ตัว → ตัวที่ 5 เป็น anchor ใหม่ (คู่ข้ามการกระโดด = 0)
คู่ที่นับได้ (a,b): ทั้งคู่อยู่ใน polygon · อยู่ในช่วงนาฬิกาเดินช่วงเดียวกัน · b.t − a.t ≤ 30 วินาที · ความเร็วคู่ ≤ 25 กม./ชม. · b ไม่ใช่ re-anchor
                คู่ที่ไม่นับเพิ่ม chain · จุด grid ที่อยู่คนละ chain ไม่นับระยะระหว่างกัน
ขั้น 2 grid    : จุด g_i ที่ τ = 5i วินาที · มีค่าเมื่อมีคู่ที่นับได้คร่อม · interpolate เชิงเส้นใน lat/lng ตาม τ
ขั้น 3 สะสม    : ระยะ(k) = Σ haversine(g_i, g_{i+1}) ที่ทั้งคู่มีค่าและ chain เดียวกัน โดย g_{i+1} อยู่ในหน้าต่าง k (หน้าต่างของจุดปลาย)
ผ่าน           : ระยะ(k) > 50 (greaterThan · 50.0 พอดีไม่ผ่าน · comparison อื่น = fail closed)
```

- sample ก่อน confirm ไม่นับ (`t < startedAt_ms` ไม่เข้าตัวสะสม) · ขอบหน้าต่างเป็นจุด grid เสมอ คู่ sample ที่คร่อมขอบจึงถูกจุด grid ที่ขอบแบ่ง (vector `reward-window` ข้อ 4: 20 ม. แบ่ง 10 / 10)
- ผลไม่ขึ้นกับความถี่ sample: เมื่อ sample ตรงจุด grid (confirm ที่ sample, 0.2 Hz) ผลเท่ากันทุกบิตกับ 1 Hz · sample ไม่ตรง grid ต่างไม่เกิน 3% บน park-loop (interpolation ตัดโค้ง)
- ตรวจไขว้กับ `packages/geo` (P2-F04-T12, 85 test): ผลตรงกันทุกบิตบน table-still, bench-jitter, park-loop, boundary-50m, screen-lock ทั้ง 1 Hz และ 0.2 Hz · ต่างเฉพาะ drift-spike (หน้าต่าง 1: geo 495.2 ม. เทียบ 443.7 ม.) เพราะ geo ยังไม่มีเงื่อนไข "ความเร็วคู่ ≤ `speedLock_kmh`" (tech note F05 3.1 ข้อ 5) · ส่ง handoff แล้ว

### 16.3 Hysteresis ที่ขอบ polygon (ตอบ A-P2-F04-T14-1 และ A-P2-F04-T12-2)

```
ชุดที่รอยืนยัน = sample ที่ใช้ได้ติดกันที่อยู่ฝั่งตรงข้ามสถานะที่ยืนยัน · sample ฝั่งเดิม (ลึกเท่าไรก็ได้) ล้มชุด · ช่องว่าง > 30 วินาทีล้มชุด
นับ            = sample ในชุดที่ห่างขอบ > 5 ม. · sample ในแถบ ≤ 5 ม. ไม่นับและไม่ล้มชุด
ยืนยัน         = นับครบ 6 (ต้องครบทั้งจำนวนและระยะ ไม่ใช่อย่างใดอย่างหนึ่ง) · มีผลย้อนไปที่ sample แรกของชุด (รวม sample ในแถบ)
ใช้กฎเดียวกันทั้งขาออกและขากลับ · edgeHysteresis_m = 0 → นับอย่างเดียว · edgeHysteresisSamples = 1 → ระยะอย่างเดียว
```

- **แก้สมมติฐานของ tech-lead (A-P2-F04-T14-1):** ไม่ใช่ "ครบจำนวนหรือเกินระยะอย่างใดอย่างหนึ่ง" · แบบ "อย่างใดอย่างหนึ่ง" ทำให้ edge-walk ออกผิด 7 ครั้ง (ทุก drift ที่ยาวเกิน 6 วินาที) ขณะที่กฎนี้เหลือ drift 3 ครั้งที่ 1 Hz และ 1 ครั้งที่ 0.2 Hz ทุกครั้งสั้นกว่า 180 วินาที
- **ยืนยันการอ่านของ location-engineer (A-P2-F04-T12-2) พร้อมแก้หนึ่งข้อ:** geo ย้อนผลไปที่ sample แรกที่ "นับ" แต่ spec F04 R14 ให้ย้อนไปที่ sample แรกของชุด (sample ในแถบรวมด้วย) · บน edge-walk ต่างกัน 1–7 วินาทีของเวลานอก (เช่น ออกครั้งที่ 2: 853 เทียบ 860 วินาที)
- ผลบน edge-walk (report หัวข้อ 3): ออกจริง 2 ครั้ง → Grace 140 วินาที และ Suspended ที่ 180.001 วินาที ตามที่ trace คาด · ค่าอื่นที่ลอง: N 10 หรือ d 10 ม. ที่ 0.2 Hz การกลับเข้าหลังออกครั้งแรกไม่ถูกยืนยันจนจบ trace (ผู้เล่นค้าง Suspended ทั้งที่เดินอยู่ในเขต) จึงไม่ใช้
- ช่องว่างล้มชุด (ข้อเสนอแก้ tech note F04 5.2): ถ้าไม่ล้ม ชุดกลับเข้าที่ค้างครึ่งทางจะตรึง `H` ข้ามช่วงแอปปิด 20 นาทีแล้วกลับ Active ย้อนหลังได้ (vector `run-state` "half-built return run")

### 16.4 Run state และขอบเวลา (spec F04 R12–R18, tech note F04 4.3, 5.3–5.4)

```
เวลานอก       = t − exitStartedAt · exitStartedAt = sample แรกของชุดที่ยืนยันการออก หรือ sample ที่ใช้ได้ตัวสุดท้าย (ไม่มีหลักฐาน: ช่องว่าง > 30 วินาที)
Suspended     เมื่อ เวลานอก > 180 000 ms  → event ที่ exitStartedAt + 180 001 ms
Ended timeout เมื่อ เวลานอก > 900 000 ms  → endedAt = exitStartedAt + 900 000 ms (R18)
timer ทำงานเมื่อ ms แรกที่เข้าเงื่อนไข ≤ H = min(E, P) · P = sample แรกของชุดที่รอยืนยัน → การกลับเข้าที่ย้อนไปก่อนขอบยกเลิก timer
```

| เวลานอก (sample แรกนอก → sample แรกของชุดกลับเข้า) | ผล (vector `run-state`) |
| --- | --- |
| 179 วินาที (2:59) · ชุดกลับเข้ายืนยันหลังขอบ 180 แต่ย้อนผล | Grace → Active · ไม่มี Suspended |
| 180 วินาทีพอดี | Grace → Active (`≤`) |
| 181 วินาที (3:01) | Suspended ที่ +180.001 → Active |
| 899 / 900 วินาที (14:59 / 15:00) | Suspended → Active |
| 901 วินาที (15:01) | Ended `timeout` ที่ +900 วินาที · sample หลังจากนั้นไม่มีผล |
| ปิดแอป 5 นาทีแล้วเปิดในเขต | `no_evidence` ที่ sample สุดท้าย → Suspended → Active (run อยู่) |
| ปิดแอป 16 นาที | Ended `timeout` ที่ sample สุดท้าย + 900 วินาที |
| ช่องว่าง 25 วินาที | ไม่ออก |

- นาฬิกา: sample ที่ `t_ms > now_ms + 5 000` = `future` · `t ≤ lastSample` = `non_monotonic` · `t ≤ settled` = `late` · `now_ms < lastNow − 5 000` = `invalid` (จบ `clock_invalid`) · ถอยไม่เกิน 5 วินาที = `held`

### 16.5 Speed lock (spec F04 R20–R22, tech note F04 6)

```
ความเร็วคู่ = haversine / Δt ของ sample ติดกันที่ accuracy ≤ 30 (ไม่ผ่านตัวกรอง outlier) · คู่ห่าง > 30 วินาทีไม่ให้ความเร็วและล้มชุด
เข้า lock  : คู่ติดกัน > 25 กม./ชม. ยาวรวม (sample สุดท้าย − sample แรกของคู่แรก) ≥ 15 วินาที → มีผลที่ sample แรกของคู่แรก
ปลด lock   : คู่ติดกัน ≤ 25 กม./ชม. ยาวรวม ≥ 60 วินาที → มีผลที่ sample แรกของชุดช้า
```

- trace: driving-40kmh ล็อกที่ 84 วินาที (0.2 Hz: 85) ไฟแดง 45 วินาทียังล็อก · drift-spike, edge-walk ไม่ล็อก · trace ขับรถจบ 45 วินาทีหลังจอด สั้นกว่า 60 วินาที จึงแสดงการปลดไม่ได้ (handoff ถึง location-engineer ให้ต่อ trace อีก ≥ 90 วินาที) · vector สังเคราะห์ครอบ 59 / 60 วินาทีแล้ว

### 16.6 Check-in (spec F04 R07–R08, tech note F04 7.2–7.3)

- ลำดับเหตุผล: `speed_lock` → `poor_accuracy` (`accuracy ≥ 30`, 30 พอดีปฏิเสธ) → `not_enough_trace` (`L.t − chainStart < 60 000`, `readyIn_s = ceil(60 − Δ/1000)`) → `no_approach_from_outside`
- ลำดับล้มเมื่อ: ตัวกรองขั้น 1 ทิ้ง (accuracy หรือความเร็ว) · ช่องว่าง > 30 วินาที · sample ระหว่าง lock
- trace: walk-in ผ่านที่ 124 วินาที (fix แรกในเขต) · teleport-spoof ไม่ผ่านตลอด · warmup-accuracy `poor_accuracy` ถึง 46 วินาที ลำดับครบ 60 วินาทีที่ 118 วินาที (F-17)

### 16.7 เวลาทำการ (spec F04 R25–R30, tech note F04 8.2–8.3)

```
local = t_ms + 420 × 60 000 · วัน = floor(local / 86 400 000) · ISO weekday = ((วัน + 3) mod 7) + 1 · เปิดเมื่อ start×60 000 ≤ msOfDay < end×60 000
closesAt  = เวลาถัดไปที่สถานะเปลี่ยน (ช่วงที่ต่อกันข้ามเที่ยงคืนรวมกัน) · ค้นไม่เกิน 8 วัน
แจ้งใกล้ปิด = closesAt − 600 000 ถ้ามากกว่า startedAt (เข้าหลังจุดนั้นไม่แจ้งซ้ำ)
```

- vector `opening-hours` ครอบ: ขอบ 05:00 / 21:00 ทั้งสองฝั่ง, วันยกเว้น, วันปิดทั้งวัน, 24 ชม., 22:00–02:00 ข้ามคืน (ปิดจริง 02:00 วันถัดไป), เปิดตลอด / ปิดตลอด = `null`, Fri 00:30 กรุงเทพฯ (ถ้าประเมินด้วย UTC จะอ่านเป็นพฤหัสแล้วเปิดผิด) และระยะบนหน้าจอบ้านที่ปัดขึ้น

### 16.8 D-059 tick บางส่วน และสัญญา RNG

```
e = τ(endAt) − k·300 (เวลา Active ในหน้าต่างที่ค้าง) · e < 60 วินาที → ไม่จ่าย ไม่ดึงเลขสุ่ม
f = e / 300 · ผ่านเมื่อ ระยะ > 50 × f (greaterThan)
ระยะ = คู่จุด grid ที่ τ ≤ τ(endAt) ซึ่งมีค่าจากคู่ sample ที่ t ≤ endAt ทั้งคู่ (endAt ทำหน้าที่เหมือนนาฬิกาหยุด · sample หลังปิดไม่ใช้ · ไม่ interpolate ถึงหรือเลย endAt)
หน้าต่างที่ปลาย ≤ τ(endAt) ตัดสินตามปกติก่อน แล้วส่วนที่เหลือเป็นหน้าต่างค้าง
ผ่าน: exp × f · loot = rollTickLoot(runSeed, dropIndex = จำนวน tick ที่ผ่านแล้ว, table, f) · โอกาสทุก rarity × f · จำนวน Common × f แล้วปัดแบบ stochastic
```

- **ยืนยัน A-P2-F04-T14-6:** tick บางส่วนใช้ index ถัดไปของ stream `drop` (ไม่เปิด stream ใหม่) · vector: tick ผ่านมาแล้ว 3 ครั้ง → index 3, f = 0.2
- **ยืนยันพร้อมขยาย A-P2-F04-T14-7:** นับถึงจุด grid สุดท้ายก่อนปิด และจุดนั้นต้องมีค่าจากคู่ที่จบก่อนหรือตรงเวลาปิด · กันผลต่างตามจังหวะเรียก step (engine อาจได้ sample หลังปิดแล้วก่อนประมวล `dungeon_closed` เพราะ `H`)
- **ยืนยัน A-P2-F04-T01-4:** ย่อ exp, โอกาสทุก rarity และจำนวน Common ด้วย f เดียวกัน · Monte Carlo 100,000 stream (runSeed 7): Uncommon 30% × 0.2 ได้ 6.05% (คาด 6%), Common เฉลี่ย 2 × 0.2 ได้ 0.399 ชิ้น (คาด 0.4) (`gate.test.ts`)
- **ยืนยัน A-P2-F04-T01-3:** Phase 2 ไม่มีเพดานช่องเก็บของ (`config/balance` ไม่มี key เพดาน inventory) · ถ้า F10/F11 ตั้งเพดานใน Phase 4 ต้องเป็น key ใหม่ และ tick ที่ของเกินเพดานต้องไม่ทิ้งของเงียบ (ถือของไว้ในถุงของ run หรือแจ้งผู้เล่น) · ข้อนี้เป็นเงื่อนไขของ spec F10/F11
- ลำดับการดึงต่อ reward tick ตาม ADR 0003 6.3: (1) หนึ่งครั้งต่อ rarity แบบโอกาสตามลำดับตาราง `u < min(100, chance × chanceMult × f)/100` (2) หนึ่งครั้งต่อ rarity ที่ได้ (Common ก่อน) เลือก item ตาม weight (3) ต่อ item: หนึ่งครั้งเลือกจำนวนฐานถ้ามีช่วง แล้วหนึ่งครั้ง stochasticRound · item ที่ปัดเป็น 0 ไม่อยู่ในผล · vector ใช้ตารางตัวอย่าง (id `example.*`) · ตาราง drop จริงต่อ preset เป็นงาน P2-F05-T01 ใช้ fn เดียวกัน
- `deriveSeed` = FNV-1a 32 บิตของ `"${runSeed}:${streamTag}:${index}"` · ตรวจกับค่ามาตรฐาน FNV (`""` = 0x811c9dc5, `"a"` = 0xe40c292c, `"foobar"` = 0xbf9cf968) · first draw สม่ำเสมอ (200,000 stream ต่อ seed: สัดส่วน < 0.06 = 0.0602–0.0607)

### 16.9 Vector ที่เพิ่ม (รวม 142 ข้อ · `gen-vectors --check` เขียว)

| ไฟล์ | ข้อ | `input.fn` | ครอบ |
| --- | --- | --- | --- |
| `movement-gate.json` | 20 | `gateWindows`, `passesGate` | table-still 0, bench-jitter ≥ 1, park-loop, 1 Hz เทียบ 0.2 Hz (ตรง grid / ไม่ตรง grid), drift-spike, boundary-50m หลังกรอง, edge-walk, spike บนเครื่องนิ่ง, ช่องว่าง 5 นาที 400 ม., คู่เร็วกว่า lock, accuracy 30 / 30.1, 50 ม. พอดี |
| `reward-window.json` | 14 | `gateWindows`, `tauAt`, `windowIndexOf` | ไม่ทับกัน, เริ่มที่ confirm, หยุดใน Grace และเลื่อน tick 2 นาที, คู่คร่อมขอบ, G8 แอปปิดที่ 4:59, ขอบ τ |
| `partial-tick.json` | 20 | `partialTick`, `gateWindows` (`endAt_ms`), `deriveSeed`, `streamDraws`, `rollTickLoot` | 59 / 60 วินาที, 10 ม. พอดีที่ f 0.2, G9, ระยะถึงจุด grid ก่อนปิด, index ถัดไป, ย่อด้วย f |
| `run-state.json` | 32 | `edgeHysteresis`, `runTimeline`, `sampleTimeGate`, `clockCheck` | กฎ hysteresis 8 ข้อ, 179/180/181, 899/900/901, ชุดกลับเข้าที่ล้ม, แอปปิด 5 / 16 นาที, ไม่มีหลักฐาน, ชุดค้างข้ามช่องว่าง, edge-walk 1 Hz / 0.2 Hz, ด่านเวลา |
| `check-in.json` | 14 | `checkIn`, `checkInTimeline` | ผ่านที่ 60 วินาทีพอดี, นับถอยหลัง, 35 / 30 / 29.9 ม., ช่องว่าง, E4, teleport 3 จังหวะ, speed lock ก่อน, trace walk-in / teleport / warm-up |
| `speed-lock.json` | 11 | `speedLock` | 14 / 15 วินาที, 59 / 60 วินาที, ช่องว่าง, accuracy แย่, trace ขับรถ / drift / edge-walk |
| `opening-hours.json` | 31 | `isOpenAt`, `openingChangeAfter`, `closingSoonAt`, `displayDistance` | หัวข้อ 16.7 |

- รูปแบบ: เหมือนไฟล์เดิม (`input` มี parameter ครบ · `tolerance` 1e-6 · ตัวเลขปัด 6 ตำแหน่ง) · sample อยู่ใน `input.samples` หรืออ้าง trace ที่ commit แล้ว (`input.trace`, `polygon`, `every`, `phase`: เก็บทุก sample ลำดับที่ `phase + n × every`, `t_ms` = `t` ของ trace, `inside` = point-in-polygon ของ `polygon` หรือ `true` เมื่อ `polygon` เป็น `null`) · `boundaryDistance_m` ที่ไม่ระบุ = ไกลไม่จำกัด
- `gateWindows` คืน `windows[{k, distance_m, passed, endAt_ms}]`, `open{k, elapsed_ms, distance_m}`, `droppedAccuracy`, `droppedSpeed` · `clock` = ช่วงนาฬิกาเดินเวลาจริง (ปลายรวม) ที่ backdate แล้ว · `runTimeline` คืน events ที่นิ่งแล้ว ณ `now_ms` (ไม่ผูกกับรูปภายในของ state) เพื่อให้ engine ที่ทำแบบทีละ step ตรวจได้ด้วยการป้อน sample ทีละตัวแล้วเทียบ events

### 16.10 สมมติฐานของงานนี้

- A-P2-F05-T20-1: ค่าตัวกรองทั้ง 5 ตัวมาจาก trace สังเคราะห์ · เครื่องจริง (P2-C03) อาจทำให้ต้องขยับ `sampleCadence_s` · owner systems-designer, game-director
- A-P2-F05-T20-2: lock 15 วินาที / ปลด 60 วินาที · ไฟแดงกรุงเทพฯ ยาวกว่า 60 วินาทีได้ lock อาจปลดแล้วกลับมา ไม่มีผลต่อรางวัลเพราะย้อนผลทั้งสองขอบ · owner game-director
- A-P2-F05-T20-3: vector ของ run state / check-in / speed lock เป็นแบบ batch (sample ทั้งชุด → ผลที่นิ่งแล้ว) ไม่ใช่ลำดับ `{now_ms, input}` ผ่าน `sessionStep` ตามที่ tech note F05 หัวข้อ 10 อยากได้ เพราะ `sessionStep` ยังไม่มี · backend แปลงเป็นลำดับ step ได้โดยป้อน sample ทีละตัวที่ `now_ms = t` แล้วเรียก `tick` ที่ `now_ms` ของ vector · owner tech-lead, backend-programmer

## 17. Dungeon loop: exp ต่อ tick, drop table ต่อ preset, ยา, ค่า F06 และ run loop ที่ใส่ seed (P2-F05-T01)

แหล่ง: spec F05 R10–R23 (`design/features/F05-movement-gate-reward.md`), spec F06 R06–R43 (`design/features/F06-hp-damage-onboarding.md`), ADR 0003 หัวข้อ 6 (สัญญา RNG), tech note F05 หัวข้อ 5–6, D-059, D-061 ที่แก้, D-089, D-094, D-096 · reference: `tools/sim/src/loot.ts`, `loop.ts`, `loop-scenarios.ts` · หลักฐาน: `pnpm exec tsx tools/sim/src/report-loop.ts` (ผลอยู่ที่ `sim-report.md` หัวข้อ 12)

### 17.1 exp ต่อ tick ที่ผ่าน gate (F05 R11, R16, R22)

```
Z          = round((levelRange.min + levelRange.max) / 2)                 combat.monsterAttack.zoneLevelFrom (A-1)
gap        = max(0, levelRange.min − L, L − levelRange.max)                ทั้งสองฝั่ง (A-3)
magicTerm  = 1 + magicBuff/100 (สูงสุด 1.5) ถ้าผู้เล่นเป็น Magic           magicBuff = roleBuffPct(magic, P = 1 + L/50) · D-039
           = noMagicMult (0.6) ถ้าไม่ใช่
exp        = expPerTick(Z) × magicTerm × max(0.25, 0.92^gap) × f         f = 1 · tick บางส่วน D-059: f = e / window_s
```

- ไม่ปัด: exp เก็บเป็นค่าจริง client แสดงค่าปัดลง · ไม่มี key การปัดใหม่ (ไม่มีค่าให้ปรับ)
- ขึ้นเลเวลทันทีและต่อกันได้ในครั้งเดียว: `while exp ≥ expToNext(L): exp −= expToNext(L); L += 1` · ถึงเลเวล 60 exp = 0 และไม่บวกเพิ่ม
- ลำดับใน tick ที่ผ่าน: loot → โล่ Magic (ใช้เลเวลก่อน tick นี้) → exp และเลเวล · เลเวลใหม่ใช้กับ hit และ tick ถัดไป (F05 R16, G13)
- exp ไม่ใช่ของใน run ตายแล้วไม่หาย (D-094) · config: `dungeons.json#rewardTick._grants_note` + pointer `seeExpCurve`
- ตัวอย่าง (vector `soloTickExp`): ช่วง 1–5 (Z = 3) เลเวล 1: non-Magic 93.5, Magic 182.8 (buff ตัวเอง 17.3%) · Z = 25 non-Magic 2,250 · ตาราง Z 1–60 อยู่ใน report-loop หัวข้อ 1

### 17.2 ไอเทมที่ drop และ `assets.icon` (`drops.json#items`)

| id | kind | rarity (กรอบ) | nameKey | assets.icon |
| --- | --- | --- | --- | --- |
| `elementDust` | material | common | `material.elementDust` | `icon.item.mat-dust` |
| `elementCore` | material | uncommon | `material.elementCore` | `icon.item.mat-essence` (ยืนยัน A-P2-F05-T03-5) |
| `riftStone` | material | rare | `material.riftStone` | `icon.item.mat-rift-stone` |
| `hpSmall` | potion | uncommon | `potion.hpSmall` | `icon.item.potion-hp-small` |
| `hpMedium`, `hpLarge` | potion | rare, epic | `potion.hpMedium`, `potion.hpLarge` | `icon.item.potion-hp-medium`, `-large` (ไม่อยู่ใน drop table ของ Phase 2) |
| `revive` | potion | epic | `potion.revive` | `icon.item.potion-revive` |
| `equipWeapon`, `equipArmor`, `equipCharm`, `equipBoots` | equipment | ตาม roll (epic/legendary) | `equipment.weapon` ฯลฯ (ยังไม่มีใน names.th.json · handoff narrative) | ไอคอนเดียวต่อช่องทุก tier (ยืนยัน A-P2-F05-T03-3) |

- id ของไอเทมเป็น key ของตารางตัวเองด้วย: material → `economy.npcSellPrice_gold.<id>`, potion → `economy.potions.<id>`, equipment → `equipment.slots.<slot>` · ชื่อไทยอยู่ใน content เท่านั้น (NN-3)
- อุปกรณ์ Epic/Legendary เป็นของ tier ของ dungeon (A-8) · Phase 2 ไม่มีการสวมใส่ (F06 R35) tier จึงยังไม่ถูกเก็บในถุง
- กรอบของยา (A-P2-F05-T01-2): ตามแถบโอกาส ยาเล็ก 17% ใกล้ Uncommon (25%) · ยาชุบ 1% ใกล้ Epic (1.2%) · art-director/game-director ยืนยันเพราะ effect ของ Epic เป็นจังหวะฉลองใหญ่

### 17.3 drop table ต่อ preset (`drops.json#dropTables`)

- key = `drop_table_id`: `largeParkDefault`, `marketDefault`, `pocketParkDefault` (หนึ่งตารางต่อ preset ใน `data/dungeons/presets.json`) · ใช้ camelCase ตาม config-lint (`largePark.default` ใน fixture ของ tools/dungeons ใช้ไม่ได้ เพราะ key มีจุด)
- `rolls` ประเมินตามลำดับ array · 5 แถวแรกเป็น `roll: "rarity"` common → legendary · ตามด้วย `roll: "bonus"` ของยา

```
roll rarity  : chance = baseChancePerRewardTick_pct.<rarity> (common = ได้เสมอ) · จำนวน = quantityPerDrop.<rarity>
               ตัวคูณตามหัวข้อ 7: shared = rangedTerm × failTerm × trustTerm บนทุกแถว rarity และจำนวน Common
               dungeon เล็ก (area_m2 < 20,000): rare/epic/legendary × 1.5 · จำนวน Common × 0.6 · trust ต่ำ: epic+ = 0
roll bonus   : chance_pct และ qty ของแถวเอง · applyDropMultipliers = false → ไม่มีตัวคูณ
ทุกแถว       : chance × f และจำนวน Common × f ในtick บางส่วน (D-059, D-094)
เลือกไอเทม   : ตาม weight ใน pool (ADR 0003 6.3 ข้อ 2) · กรอบ = items.<id>.rarity หรือ rarity ของ roll ถ้าเป็น byRoll
```

- "dungeon เล็กของน้อยแต่ rare สูงกว่า" มาจากกฎพื้นที่ ไม่ใช่ preset (presets.md 6): pocketPark เล็กเสมอ (size band ≤ 10,000 ตร.ม.) · largePark และ market เล็กเมื่อต่ำกว่า 20,000 ตร.ม. · สามตารางมีเนื้อหาเท่ากันใน Phase 2 (GDD มี drop table เดียว) แยกเป็นตารางเพื่อให้ปรับต่อ preset ได้โดยไม่แก้โค้ด
- ผลต่อ tick (report-loop หัวข้อ 2): คนเดียวไม่ใช่ Ranged ไม่เล็ก dust 1.20, core 0.150, rift 0.036, อุปกรณ์ 0.008 · เล็ก dust 0.72, rift 0.054 · Ranged เลเวล 1 เล็ก dust 1.41, core 0.293, rift 0.106 · ตรง `dropRates` ทุกตัว (test `loop.test.ts`)
- กฎความสอดคล้องที่ gen-vectors ตรวจก่อนเขียน (`dropTableProblems`): ทุก preset มีตาราง, แถว rarity ครบ 5 ตามลำดับ, แถว bonus อยู่หลังทั้งหมด, ไอเทมมีจริงและ rarity ตรงแถว, weight เป็นจำนวนเต็มบวก, bonus มีแต่ยา, ทุกตารางมียาในลำดับยาอัตโนมัติ (B-06), icon ขึ้นต้น `icon.item.`

### 17.4 ยาใน Phase 2 (D-089, GD B-06, spec F06 หัวข้อ 9)

| แถว bonus | chance_pct ต่อ tick ที่ผ่าน | ความถี่ (12 tick/ชม.) | เหตุผล |
| --- | --- | --- | --- |
| `potionHpSmall` → `hpSmall` × 1 | 17 | 1 ขวดต่อ 29.4 นาทีเดิน (2.0/ชม.) | game-director ขอ "ราวหนึ่งขวดต่อ 30 นาทีของ tick ที่ผ่าน" |
| `potionRevive` → `revive` × 1 | 1 | 1 ขวดต่อ 8.3 ชม.เดิน | "หายากกว่ามาก" · ใช้ได้เฉพาะคนที่ปิด auto-retreat แล้วตาย (F06 R26) |

- ไม่มีชุดยาตั้งต้น ไม่มีของขวัญ ไม่มีทางอื่นนอก tick ที่ผ่าน gate (D-089) · เหมือนกันทุก preset
- ไม่มีตัวคูณ Ranged หรือ dungeon เล็ก (A-P2-F05-T01-1) เพื่อให้ทุก class ได้ยาเท่ากัน · roll ยาเป็นของ Phase 2 ต้องทบทวนก่อนร้าน NPC (F-19)
- ลำดับยาอัตโนมัติ: `economy.autoPotion.sourceOrder` = `["runBag", "inventory"]` แล้วตาม `defaultPotionOrder` ในแต่ละแหล่ง · 1 ขวดต่อ hit · ยาชุบไม่อยู่ในลำดับ (F06 R12–R13, D-096)
- vector "มีโอกาสได้ยาก่อนถึง auto-retreat": `runLoopStats` เลเวล 1 ช่วง 1–5 ที่มียา: สัดส่วน run ที่ได้ยาก่อนจบ Ranged 0.555, Support 0.62, Magic 0.595, Tanker 0.795 (200 seed) · และ `runLoop` seed 3 ที่ยาจาก tick แรกถูกดื่มก่อนถอย

### 17.5 ค่า F06 ที่ engine ใช้ (ครบและอ้าง GDD)

| กฎ | config key | ค่า | แหล่ง |
| --- | --- | --- | --- |
| ช่วงสุ่มการตี | `combat.attackCheck.intervalMin_s` / `intervalMax_s`, `intervalDistribution` | 45 / 75 วินาที, uniform | GDD "damage มาจากไหน" |
| โอกาสโดนต่อครั้ง | `combat.attackCheck.hitChancePerCheck_pct` | 54 | A-4, D-029 (fit ของ D-020) |
| นาฬิกาการตี + ลำดับการดึง | `combat.attackCheck._note` | เฉพาะเวลา Active ไม่ lock หยุดแล้วนับต่อ · attempt i = stream `hit` index i: interval แล้วผลโดน | F06 R06–R07, D-094, D-096, ADR 0003 6.4 |
| ตัวคูณห่างเลเวล | `combat.levelGapDamage.damageMultPerLevelBelowRange`, `mode`, `maxMult` | ×1.25 ต่อระดับ compound ไม่มีเพดาน · สูงกว่าช่วงไม่ลด | GDD · A-2 · F06 R09 |
| เกณฑ์ยาอัตโนมัติ | `economy.autoPotion.defaultThreshold_pct`, `defaultPotionOrder`, `sourceOrder` | < 40% · เล็ก → กลาง → ใหญ่ · ถุงของ run ก่อน | GDD "ระบบกันตาย" · A-15b · D-096 |
| แจ้ง HP ต่ำ | `dungeons.hpSafety.lowHpWarningThreshold_pct` | ≤ 30% ครั้งเดียวต่อการลงผ่าน | GDD · A-P2-F06-T01-2 (D-096) |
| auto-retreat | `dungeons.hpSafety.autoRetreatThreshold_pct`, `autoRetreatEnabledByDefault`, `autoRetreatKeepsRunLoot` | ≤ 25%, เปิด, เก็บครบ | GDD |
| ตาย | `dungeons.death.loseAllRunLoot` | ของใน run หายทั้งหมด · exp อยู่ | GDD "เมื่อตาย" · D-094 |
| ฟื้นหลังตาย | `progression.hpRecovery.deathRecoveryTo_pct`, `deathRecoveryDuration_s` | 0 → 50% ใน 1,800 วินาที | GDD "เมื่อตาย" |
| ยาชุบ | `economy.potions.revive.reviveToHp_pct`, `usableInsideDungeon` (+ `_usableInsideDungeon_note`) | 50% · Phase 2 ใช้นอก run เท่านั้น key ไม่มีผล | GDD · F06 R24, R26 |
| โล่ Magic | `classes.roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct` (+ `_note`) | 0.1 × buff% ของ maxHP เฉพาะ tick ที่ผ่าน gate แทนค่าเดิม ไม่ซ้อน | A-13 · F06 R31.4 · D-096 |
| heal Support | `classes.roles.support.inDungeonHealBase_pctMaxHpPerMin` (+ `_note`) | 0.5% × (1 + buff) ต่อนาทีของเวลา Active | A-12 · F06 R31.5 |

ไม่มีค่าใดเปลี่ยนจาก GDD ในงานนี้ (ไม่มีรายการเกิน ±20%) · ค่าใหม่ทั้งหมดเป็นค่าที่ GDD ไม่มี (ยาใน drop, `sourceOrder`, กฎ `safety`)

### 17.6 `dungeons.safety` ตาม D-061 ที่แก้ (B-02, design/reviews/F03-design-gate-b.md 4.3)

```
นับรายงาน  : หมวดใน autoSuspendCategories (["dangerous"] = "ที่นี่อันตราย") เท่านั้น
             ผู้รายงานอยู่ที่ dungeon นั้นจริงในหน้าต่าง (check-in ผ่านหรือมี run ที่นั่น) · reporterMustBePresent
             trust ≥ anticheat.trustScore.lowThreshold (40) · seeReporterMinTrustScore
พักอัตโนมัติ: ผู้เล่นต่างกัน ≥ reportThreshold (5) ภายใน reportWindow_h (24) AND จำนวนกลุ่ม ≥ minIndependentGroups (2)
             กลุ่ม = party ณ ตอนรายงาน (คนเดียว = 1 กลุ่ม) · independentGroupDefinition = partyAtReportTime
ผล         : suspendPendingModerator · แจ้ง moderator ทันที · เปิดกลับได้โดย moderator เท่านั้น
             ผู้เล่นข้างในได้รางวัลตาม emergencyClose (D-059, gate ยังใช้)
หมวดอื่น   : "เข้าไม่ได้" (inaccessible), "ปิดถาวร" (permanentlyClosed) → moderatorQueue พร้อมสถิติรายงานซ้ำ
ช่องทาง    : เลือกหมวดเท่านั้น ไม่มีข้อความอิสระ (NN-4) · คำนวณที่ server (Phase 5 F13/F15)
```

- แก้ `_assumption` เดิมที่อ้างว่า party เล็กปิด dungeon ไม่ได้ (ผิด เพราะ party มีได้ 8 คน) · ตอนนี้ party เดียวพักไม่ได้เลยเพราะนับเป็น 1 กลุ่ม

### 17.7 run loop ที่ใส่ seed (reference `runLoop`)

ลำดับต่อ run (Active ตลอด ไม่มี Grace/Suspended/lock ใน reference นี้ · τ = เวลา run):

```
attempt i  : rng = mulberry32(deriveSeed(runSeed, "hit", i)) · τ_i = τ_{i−1} + uniform(45, 75) · landed = rng() < 0.54
tick k     : ที่ τ = window_s × (k + 1) · ผ่าน gate (ยกเว้น k ใน failedTicks) → rollTickLoot(runSeed, grantedCount, table, 1)
             → ถุงของ run · โล่ Magic · exp · grantedCount += 1 · ไม่ผ่าน: ไม่ให้อะไร ไม่ดึงเลขสุ่ม
เวลาชนกัน  : tick ก่อน attempt (F05 R19) · ยาที่ drop ใน tick นั้นใช้กับ hit นั้นได้ (H-E8)
hit        : damage ที่เลเวล ณ ตอนนั้น · resolveHit (หัวข้อ 3.1.1) · ยาเรียงตาม sourceOrder × defaultPotionOrder
heal       : Support ฟื้นต่อเนื่องตามเวลา Active ถึง maxHP
จบ         : autoRetreat → auto_retreat (ของครบ) · died → death (ถุงของ run หาย, exp อยู่, ยาใน inventory ที่ไม่ได้ใช้อยู่)
             limit_s → manual_exit (ของครบ)
```

- output: `exitReason`, `end_s`, จำนวน tick/attempt/hit, ยาที่ใช้แยกแหล่ง, `firstPotionDrop_s`, `lowHpWarnings`, HP/เลเวล/exp ตอนจบ, `runBag`, `kept`, `lost`, `inventoryEnd`, `events` (tick: `k, granted, exp, level, shield, loot` · attempt: `i, landed, damage, hpAfter, shieldAfter, potion` เป็น `"<source>:<id>"`, `warning, outcome`)
- `runLoopStats` = `runLoop` ของ runSeed `firstSeed … firstSeed + runs − 1` แล้วเอา p10/มัธยฐาน/p90 แบบ nearest-rank · ผลซ้ำได้ทุกเครื่อง

### 17.8 เวลาถึง auto-retreat ของผู้เล่น Phase 2 (N-03 ข้อ 6, F06 R43)

base stat (HP 300, DEF 20, VIT 0) ไม่มีอุปกรณ์ ไม่ลงแต้ม · ช่วง 1–5 (Z = 3) · dungeon เล็ก · 2,000 seed · เลเวล 1–5 ได้ผลเท่ากันภายใน 1 นาที (damage เท่ากันในช่วง, buff ต่างกันเล็กน้อย) ตารางเต็มใน sim-report หัวข้อ 12.3

| class | damage/hit | ไม่มียา มัธยฐาน (p10–p90) | มียาจาก drop มัธยฐาน (p10–p90) | ได้ยาก่อนจบ |
| --- | --- | --- | --- | --- |
| Tanker | 9.8 | 43.1 (34.9–52.3) | 78.5 (41.0–192.1) · 1.5% ไม่ถอยใน 6 ชม. | 0.787 |
| Ranged | 18.8 | 21.7 (16.8–28.0) | 27.2 (17.8–48.8) | 0.518 |
| Support | 18.8 | 27.5 (19.9–36.0) | 36.8 (22.1–70.9) | 0.601 |
| Magic | 18.8 | 25.5 (18.4–32.0) | 32.4 (19.7–59.3) | 0.567 |

- R43 (มัธยฐาน ≥ 10 นาที) ผ่านทุก class ในช่วง 1–5 · ไม่ผ่านใน PN-2 (1–35) และช่วง 1–10 (F-18)
- D-020 ยังผ่านหลัง D-038 B: build สมดุลเลเวล 25 damage ×1.0 ไม่ใช้ยา 44.4 นาที (vector GDD ใน `damage.json`) · มี Tanker 55.6 · คนเดียวไม่ใช่ Tanker 27.8
- Tanker ที่ได้ยาจาก drop มัธยฐาน 78.5 นาที: ใน playtest 30–60 นาที Tanker ส่วนใหญ่จะไม่เห็น auto-retreat · non-Tanker ยังเห็น (มัธยฐาน 27–37 นาที) · kit ผู้สังเกตต้องแยกตาม class

### 17.9 Vector ที่เพิ่ม (`gen-vectors --check` เขียว)

| ไฟล์ | ข้อ | `input.fn` | ครอบ |
| --- | --- | --- | --- |
| `tick-reward.json` | 30 | `soloTickExp`, `addExp`, `lootTable`, `rollTickLoot` | exp ต่อ tick 4 class ช่วง 1–5, gap, PN-2, Magic, f = 0.4, พื้น 0.25, เลเวล 60 · ขึ้นเลเวลต่อกัน · ตารางจริงต่อ preset ที่ resolve แล้ว 5 บริบท · loot บนตารางจริง index 0–5 และ f = 0.4 (index 0 = รางวัลก้อนแรก เหมือน tick อื่นทุกประการ F06 R39) |
| `run-loop.json` | 29 | `hitAttempt`, `soloDamage`, `runLoop`, `runLoopStats` | ลำดับการดึงของ stream hit · damage ของ Phase 2 · ตายเทียบ auto-retreat seed เดียวกัน · ลำดับแหล่งยา · โล่ Magic กับ tick ที่ไม่ผ่าน · Support heal · tick ก่อน hit ที่เวลาเดียวกัน · เข้า run ที่ HP 23% · PN-2 · R43 ต่อ class มี/ไม่มียา |

- รูปแบบเหมือนไฟล์ของ P2-F05-T20 (`input` มี parameter ครบ, tolerance 1e-6, ปัด 6 ตำแหน่ง) · `lootTable` รับ entry ดิบของ `drops.json#dropTables` จึง port parse รูปเดียวกับ config
- ชื่อ fn คงที่ (backend เพิ่มใน dispatcher ของ `packages/shared`)

### 17.10 `tools/sim` ใช้สูตรจาก `packages/shared` (TL B-05)

- ลบ `tools/sim/src/formulas.ts` และ `rng.ts` · สูตร, `mulberry32`, `uniform`, `deriveSeed`, `fnv1a32`, `streamRng`, `dropRates`, `rangedTerm`, `failedRaidTerm`, `stochasticRound`, `dropParamsFromConfig`, `hitsToThreshold`, `expectedSurvival_min`, `hitChanceForTarget_pct`, `hpLossPerHour_pct`, `potionCostPerHour_gold` import จาก `@keep-walking/shared/formulas`
- คงไว้ใน tools: Monte Carlo (`simulateRun`, `survivalMonteCarlo`, `potionCostMonteCarlo`, `simulateDropGaps`, `simulateIncome`), สถิติ (`stats.ts`), report, และ reference ที่ shared ยังไม่มี (`rollTickLoot`, `resolveHit`, `runLoop`) ซึ่ง backend port ใน P2-F05-T08 / P2-F06-T06
- vector เดิมทุกไฟล์ค่าไม่เปลี่ยน (เปลี่ยนเฉพาะข้อความ `source` ที่ชี้ reference)

### 17.11 สมมติฐานของงานนี้

- A-P2-F05-T01-1: roll ยาไม่มีตัวคูณ Ranged/dungeon เล็ก และเป็นของ Phase 2 (ทบทวนก่อน Phase 4) · owner game-director
- A-P2-F05-T01-2: กรอบของยาตามแถบโอกาส (ยาเล็ก uncommon, ยาชุบ epic, ยากลาง rare, ยาใหญ่ epic) · owner art-director, game-director
- A-P2-F05-T01-3: exp ไม่ปัด (ค่าจริง, client แสดงค่าปัดลง) · ถึงเลเวลสูงสุดไม่สะสม exp · owner systems-designer, backend-programmer
- A-P2-F05-T01-4: โล่ Magic ของ tick คำนวณจากเลเวลก่อน exp ของ tick นั้น และขนาดไม่ย่อด้วย f ใน tick บางส่วน · owner game-director
- A-P2-F05-T01-5: id ของ drop table เป็น camelCase (`largeParkDefault` …) ไม่ใช่ `largePark.default` · owner location-engineer, level-designer
