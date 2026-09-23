# Balance Model — GPS Dungeon Bangkok

- งาน: P1-F03-T06 · เจ้าของ: systems-designer · สถานะ: ฉบับแรก (Phase 1)
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

ไฟล์ทั้งหมด (ตรวจ JSON valid ครบ 11 ไฟล์ ดูหัวข้อ 14)

| ไฟล์ | เนื้อหา | หัวข้อ |
| --- | --- | --- |
| `classes.json` | party, buff stacking, base/cap ต่อ role, debuff, กฎ base/cap, ค่าเปลี่ยน class | 2 |
| `combat.json` | monsterATK, DEF softcap, รอบสุ่มโดนตี, ตัวคูณ damage ตามช่องว่างเลเวล | 3 |
| `progression.json` | เลเวลสูงสุด, exp curve, ตัวคูณ exp, stat point, stat พื้นฐาน, การฟื้น HP | 4 |
| `equipment.json` | gearStat, 4 ช่อง, ของบอส, tier ตามเลเวล | 5 |
| `enhance.json` | โอกาสสำเร็จ, ผลล้มเหลว (ไม่มีแตก), สะสมความล้มเหลว, ค่าวัตถุดิบและ gold | 6 |
| `drops.json` | โอกาสต่อ tick, จำนวน, ตัวคูณ, dungeon เล็ก | 7 |
| `economy.json` | ราคา NPC, ยา, ยาอัตโนมัติ, เป้าอัตราส่วน, ภาษีขั้นบันได, กฎตลาด | 8 |
| `dungeons.json` | พื้นที่ 3,000–150,000 ตร.ม., สถานะ run, reward tick, movement gate, auto-retreat, แจ้ง HP | 9 |
| `unlocks.json` | เงื่อนไขปลดต่อระบบ, ระยะ "ไกล" และ "นอกพื้นที่" | 10 |
| `raid.json` | POW, presence/survival/party mult, HP บอส, checkpoint, อันดับ contribution | 11 |
| `anticheat.json` | check-in, speed lock, trust score, offline evidence, audit ผลลัพธ์ | 12 |

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

- ทุก `45–75 วินาที` (สุ่มแบบ uniform) ระบบทอยว่าโดนตีไหม โอกาส `hitChancePerCheck_pct` = 50% (A-4 ค่าตั้งต้นที่ fit ให้ได้ราว 45 นาที T07 fit ใหม่)
- โล่ Magic ดูดซับ damage ก่อน HP (A-13) · heal ของ Support ทำงานเฉพาะเมื่อมี Support ในดัน (A-12)
- HP ≤ 30% → สั่น + push ครั้งเดียวต่อการลงผ่านเกณฑ์ · HP ≤ ยาอัตโนมัติ 40% → ใช้ยาเล็กก่อน (A-15b) · HP ≤ 25% และเปิด auto-retreat (default) → ถอนอัตโนมัติ เก็บของครบ run จบ · HP = 0 → ตาย ของใน run หายหมด
- ออกจาก dungeon แล้วฟื้น 1.6667% maxHP/นาที × (1 + 1.5% × VIT) (A-15a) · ตายแล้วฟื้นจาก 0 ถึง 50% ใน 30 นาที · ยาชุบชีวิตฟื้นเป็น 50% ทันที

### 3.2 สมมติฐาน "build สมดุล" สำหรับ simulator

- แต้ม 3 × L แบ่ง 4 ทางเท่ากัน (ATK / DEF / HP / VIT)
- อุปกรณ์ tier ตาม `equipment.json#tierByLevel` (A-5) +0 ทุกช่อง · DEF = 20 + 3 × แต้ม DEF + gearStat เกราะ + 0.5 × gearStat เครื่องราง (A-6)
- HP = 300 + 150 × แต้ม HP

### 3.3 ผลเบื้องต้น (โอกาสโดนตี 50%, รอบเฉลี่ย 60 วินาที, เลเวลตรงโซน, ไม่ใช้ยา, damage ×1.0)

| เลเวล = Z | DEF | HP | damage ต่อครั้ง | นาทีถึง auto-retreat 25% | นาทีถึง HP 0 |
| --- | --- | --- | --- | --- | --- |
| 10 | 88 | 1,425 | 46.3 | 46.1 | 61.5 |
| 25 | 286 | 3,112 | 100.9 | 46.3 | 61.7 |
| 40 | 423 | 4,800 | 150.5 | 47.8 | 63.8 |
| 60 | 583 | 7,050 | 208.8 | 50.6 | 67.5 |

- เส้นแบนดีตลอดช่วงเลเวล (46–51 นาที) แปลว่า GDD ตั้ง exponent 1.3 ของ monsterATK ให้เข้ากับการโตของ HP + DEF + gear ได้แล้ว
- มี Tanker เลเวล 25 (21.7%): เลเวล 25 → 59.1 นาทีถึง 25% (GDD ราว 55, ต่าง +7%)
- **F-1:** ถ้าไม่มี Tanker เลยตาม GDD ตัวอักษร damage × 1.6 → เลเวล 25 เหลือ 28.9 นาทีถึง 25% และ 38.6 นาทีถึง HP 0 · Tanker เล่นคนเดียวได้ buff ตัวเองจึงอยู่ได้ 59 นาที ส่วน Ranged, Support, Magic เล่นคนเดียวอยู่ได้ราว 29 นาที ต่างกันสองเท่าตาม class
- ข้อเสนอเบื้องต้นให้ T07: ใช้นิยาม "45 นาที = เวลาถึง auto-retreat ที่ damage ×1.0" (ตรงกับความเห็นของ game-director ใน SF-4 ว่าให้นับถึงตอนถูกพากลับ) แล้วรายงานกรณีคนเดียวที่ไม่ใช่ Tanker เป็น decision authority HUMAN เพราะสั้นกว่า 45 เกิน 20%

### 3.4 ต้นทุนยาต่อชั่วโมง (ภาพตัวอย่างให้ T08 ขยาย ไม่รับ 600 เป็น input)

```
hpLossPerHour_pct = (3600 / meanCheckInterval_s) × hitChance × damagePerHit / maxHP × 100
potionCostPerHour = hpLossPerHour_pct / (heal_pct × (1 + 2% × VIT)) × buyPrice
```

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
VIT = ptsVIT + gearVIT  →  ฟื้น HP เร็วขึ้น 1.5% ต่อแต้ม, ประสิทธิภาพยา +2% ต่อแต้ม
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
| ขาย NPC: ผงธาตุ / แก่นธาตุ / หินรอยแยก | 20 / 120 / 900 gold · ไม่จำกัดจำนวนต่อวัน (GDD ตั้งใจ) |
| ยา HP เล็ก 30% / กลาง 60% / ใหญ่ 100% | 150 / 400 / 1,000 gold (gold ต่อ 1% HP = 5.0 / 6.7 / 10.0) |
| ยาชุบชีวิต 0 → 50% | 2,500 gold ใช้ในดันได้ |
| ราคา NPC เทียบมูลค่าตลาด | 40–50% (ใช้ตอนตรวจราคาตลาดจริงหลัง beta) |

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

```
distance(window)  = Σ ระยะระหว่าง sample ที่ผ่านการกรองใน 300 วินาทีล่าสุด (กรอง accuracy และ speed ตาม anticheat.json)
tickGranted       = state == Active  AND  distance(window) > 50
outsideTime ≤ 180 → Grace · 180 < outsideTime ≤ 900 → Suspended · > 900 → Ended
```

- ใช้ `>` ตาม GDD "เกิน 50 เมตร" (`movementGate.comparison = greaterThan`) · ระยะเท่ากับ 50.0 พอดีไม่ผ่าน
- กฎคู่: auto-retreat เปิด default + movement gate ต้องอยู่ด้วยกันเสมอ (GDD "ผลข้างเคียงที่ตั้งใจ")
- v1: `verification_mode = continuous_gps`, `floor_level = null`

## 10. เงื่อนไขปลดระบบ (unlocks)

แหล่ง: GDD "10 นาทีแรกของคนใหม่" (สิ่งที่ห้ามสอนใน 10 นาทีแรก), "Economy > ระบบแลกเปลี่ยน", "Raid Boss" · config: `unlocks.json` (SF-6) · เอกสารอื่นอ้างเป็น `config: unlocks.<system>`

| ระบบ | เงื่อนไข | เวลาเดินโดยประมาณ (ตัวคูณ exp 1.0) | ที่มา |
| --- | --- | --- | --- |
| ลงแต้ม stat (`statAllocation`) | เลเวล 3 | ราว 26 นาที | A-20 |
| กลไก party ละเอียด (`partyDetail`) | เลเวล 3 | ราว 26 นาที · ปุ่มเข้าร่วม Nearby Party ใช้ได้ตั้งแต่นาที 6–8 | A-20 |
| ตีบวก (`enhance`) | เลเวล 5 | ราว 74 นาที | A-20 |
| ตลาด (`market`) | เลเวล 8 และบัญชีอายุ 7 วัน | ราว 3 ชม. | อายุบัญชีจาก GDD · เลเวล A-20 |
| เปลี่ยน class (`classChange`) | เลเวล 10 | ราว 4.5 ชม. | ตารางค่าเปลี่ยนเริ่มที่เลเวล 10 · A-20 |
| Raid (`raid`) | เลเวล 1 และจบ run แรกแล้ว | — | GDD ให้คนเลเวลต่ำเข้าได้ทันที |
| ระยะ "ไกล" (`home.farDungeonThreshold_m`) | dungeon ที่เปิดอยู่ใกล้สุดเกิน 2,000 ม. | ราว 25 นาทีเดิน | A-20b (GDD: 650 ม. ใช้ได้, 3 กม. พัง) |
| "นอกพื้นที่" (`home.outOfServiceAreaThreshold_m`) | ใกล้สุดเกิน 20,000 ม. | — | A-20b |

หมายเหตุชื่อ key: board เขียน `unlocks.home.far_dungeon_threshold_m` ตามรูปแบบ camelCase (TL-N02) key จริงคือ `unlocks.home.farDungeonThreshold_m`

## 11. Raid (ร่างแรกสำหรับ Phase 6)

แหล่ง: GDD "Raid Boss" ทั้งหัวข้อ · config: `raid.json`

```
POW_i          = (baseATK_i + gearATK_i) × (1 + level_i / 60) × roleMult_role
                 baseATK = ATK จาก stat (20 + 4 × ptsATK) · roleMult: Ranged 1.3, Magic 1.25, Tanker 0.8, Support 0.75
presenceMult   = 1.0 ถ้าผ่าน movement gate (dungeons.json) · 0.3 ถ้าอยู่ในวงแต่ไม่ขยับ
survivalMult   = 1.0 (HP > 70%) · 0.7 (30% < HP ≤ 70%) · 0.4 (HP ≤ 30%) · 0 (ล้ม)       (A-17c ขอบเขต)
partyMult      = 1 + 0.8 × (Σ_role buff_role / cap_role) / 4 × (ครบ 4 role ? 1 : 0.6)      ไม่มี party = 1.0   (A-17)
contribution_i = POW_i × presenceMult_i × survivalMult_i × partyMult_i                         ต่อ raid tick 10 วินาที
bossDamage_i   = bossATK × (1 − DEF_i / (DEF_i + 300)) × tankerTerm                            bossATK = null (A-18)
bossHP         = medianPOW_lastWeek × activePlayers_lastWeek × α × 720
                 α = 0.45 ใน 30 วันแรก แล้ว 0.55 · หลังล้มไม่สำเร็จ bossHP สัปดาห์ถัดไป × 0.85
```

- ตรวจ partyMult ที่เสนอ: ครบ role คนละ 1 เลเวล 25 = 1.41, คนละ 2 = 1.61, คนละ 1 เลเวล 60 = 1.52, 3 role เลเวล 25 = 1.17 · อยู่ในเป้า GDD 1.4–1.6 และ 1.0–1.2 ยกเว้นขอบบน (1.61 และ 3 role คนละ 2 = 1.26) ให้ Phase 6 จูน
- ชั้นรางวัล: checkpoint 25 / 50 / 75 / 100% × อันดับ contribution (ต่ำกว่ามัธยฐาน ×0.6, มัธยฐาน–p75 ×1.0, p75–p95 ×1.5, p95 ขึ้นไป ×2.2)
- ล้มไม่สำเร็จ: monsterATK ×2 ทั้งสัปดาห์ (A-16), drop ×1.6–2.0 (A-16b), เตือนเมื่อเหลือ 1,800 วินาทีและลด HP ยังไม่ถึง 75%

## 12. Anti-cheat (ค่าที่เป็นตัวเลข)

แหล่ง: GDD "Anti-cheat > มาตรการเป็นชั้น", "ความปลอดภัยทางกายภาพ", "สัญญาณขาดและแอปถูกปิด" · config: `anticheat.json`

| มาตรการ | ค่า |
| --- | --- |
| เดินเข้ามาต่อเนื่องก่อน check-in | ≥ 60 วินาที ห้าม teleport เข้ากลาง polygon |
| accuracy ตอน check-in | < 30 ม. |
| speed lock | 25 กม./ชม. ล็อกการเล่น |
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
| 4 | โอกาสโดนตีต่อรอบ | 50% (T07 fit) | combat | systems-designer |
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
| 17 | สูตร partyMult ของ raid | หัวข้อ 11 | raid | game-director |
| 17c | ขอบ survivalMult ที่ 30% | 30% พอดี = 0.4 | raid | game-director |
| 18 | bossATK | null (Phase 6) | raid | systems-designer |
| 19a | วิธีคิดภาษีขั้นบันได | ส่วนเพิ่ม (marginal) | economy | game-director |
| 19b | เพดานมูลค่าโอนต่อวัน | 1,000 gold × เลเวล | economy | game-director |
| 20 | เลเวลปลดระบบ | หัวข้อ 10 | unlocks | game-director |
| 20b | ระยะ "ไกล" / "นอกพื้นที่" | 2,000 ม. / 20,000 ม. | unlocks | game-director |
| 21 | น้ำหนัก offline sample | 0.5 | anticheat | tech-lead, backend-programmer |
| 21b | "ติดต่อกัน" ของ audit p99 | 3 วัน | anticheat | liveops-operator |
| 22 | ปัดจำนวน Common ที่เป็นเศษ | สุ่มตามเศษ ด้วย RNG ฝั่ง server | drops | systems-designer, backend-programmer |

## 14. หลักฐานการตรวจ และสิ่งที่ T07 / T08 ต้องทำต่อ

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
