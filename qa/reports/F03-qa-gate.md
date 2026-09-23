# F03 QA Gate — Simulator ตรงตาราง GDD

- Task: P1-F03-T23 · Role: qa-tester · Date: 2026-09-23
- ขอบเขต: `tools/sim/` (P1-F03-T07, T08), `design/systems/test-vectors/*.json` (248 vectors, 8 ไฟล์), `design/systems/sim-report.md`, `config/balance/*.json` (11 ไฟล์ที่ simulator อ่าน)
- วิธี: (1) รัน test/tooling จริงผ่าน Bash แนบ output, (2) คำนวณมือ/สคริปต์อิสระ (python, ไม่ commit) เทียบตาราง GDD โดยอ่าน GDD เอง ไม่อ้างจาก sim-report.md อย่างเดียว, (3) พิสูจน์ว่า simulator อ่านค่าจาก config จริงด้วยการชี้ไปที่สำเนา config ที่แก้ค่าแล้วดูผลเปลี่ยน (ไม่แก้ config จริง), (4) grep หาเลข balance ที่ hardcode ใน `tools/sim/src/`
- ไม่ได้แก้ไฟล์ใน `tools/sim/` หรือ `config/` ตามข้อกำหนดของ task

## Verdict: PASS

สรุปสั้น: `pnpm test` ผ่านทั้งหมด (94/94), `gen-vectors.ts --check` ตรงกับ config ปัจจุบันทุกไฟล์ (exit 0), ค่าที่คำนวณมือ/สคริปต์อิสระจาก GDD ตรงกับสิ่งที่ simulator คำนวณภายใน tolerance ที่ระบุใน README (รวม Tanker L25 1–4 คน = 21.7/33.0/38.8/41.8% ตรงเป๊ะ), simulator อ่านค่าจาก config เท่านั้น (พิสูจน์ด้วยการชี้ไปสำเนา config ที่แก้ tanker base 16→30 แล้วผลลัพธ์เปลี่ยนจาก 21.72% เป็น 36.34% โดย config จริงในดิสก์ไม่ถูกแตะต้อง), grep ใน `tools/sim/src/*.ts` (นอก `vectors.ts` ที่มีข้อยกเว้นบันทึกไว้ใน README) ไม่พบเลข balance ที่ hardcode มีแต่ค่าคงที่เชิงโครงสร้าง (100 สำหรับ %, 3600 วินาที/ชม., percentile 10/50/90 ฯลฯ) ทุก vector (248 ตัว) มี `source` ครบ ไม่มีตัวไหนไม่มีที่มา

ไม่มี bug severity high ขึ้นไปที่พบใหม่จากงานนี้ ข้อค้นพบที่เปิดอยู่ (D-020 เวลาอยู่รอด solo non-Tanker, D-038 อัตราส่วนรายได้ต่อค่ายาของคนเล่นคนเดียวจริง, D-039 วิธีวัด party ratio) เป็นการตัดสินใจด้านดีไซน์ที่รอ HUMAN/game-director ตามที่ระบุใน context ของ task brief ไม่ใช่ข้อบกพร่องของ simulator จึงไม่ทำให้ gate นี้เป็น NEEDS_CHANGES (ตามเงื่อนไขที่ระบุไว้ในงาน)

รายละเอียดหลักฐานทั้งหมดอยู่ในหัวข้อถัดไป

## 1. รัน test ของ simulator เอง

```
$ pnpm test
$ vitest run
 RUN  v5.0.1 /Users/pongpon/Game
 Test Files  6 passed (6)
      Tests  94 passed (94)
   Start at  19:05:29
   Duration  183ms
```

```
$ pnpm exec tsx tools/sim/src/gen-vectors.ts --check
up-to-date buff-stacking.json (44 vectors)
up-to-date class-change.json (6 vectors)
up-to-date exp-curve.json (34 vectors)
up-to-date gear.json (48 vectors)
up-to-date damage.json (38 vectors)
up-to-date drops.json (23 vectors)
up-to-date economy.json (38 vectors)
up-to-date party.json (17 vectors)
exit code: 0
```

รวม 44+6+34+48+38+23+38+17 = 248 vectors ตรงกับที่ T08 รายงานไว้ ไม่มีไฟล์ไหน "ไม่ตรงกับ config"

```
$ pnpm exec tsx tools/sim/src/report.ts
```
(เอาต์พุตเต็มแนบในหัวข้อ 3 — ครบทั้ง 8 หัวข้อของ report: buff stacking, exp curve, gear, survival, drops, economy, party per-head, what-if)

## 2. ตรวจว่า test-vector ทุกตัวมี source (ไม่มี vector ที่ไม่มีที่มา)

สคริปต์อิสระ (python, ไม่ commit) นับ vector ที่ไม่มี key `source`:

```
buff-stacking.json: total=44 missing_source=0
class-change.json: total=6 missing_source=0
damage.json: total=38 missing_source=0
drops.json: total=23 missing_source=0
economy.json: total=38 missing_source=0
exp-curve.json: total=34 missing_source=0
gear.json: total=48 missing_source=0
party.json: total=17 missing_source=0
```

ทุกไฟล์ missing_source=0 → ผ่านเกณฑ์ "vector ต้องมี source" ตัวอย่าง source ที่ตรวจอ่านจริง: `gearStat` tier 1–5 อ้าง "GDD > Progression > ตัวเลขตั้งต้น > อุปกรณ์" พร้อมอ้าง D-022 (tolerance ±1), `incomeToPotionRatio` อ้าง "GDD > Progression > ตัวเลขตั้งต้น > ราคา NPC และยา", `partyPerHeadRatio` อ้าง "GDD > Class และ Party > เป้าหมายสมดุล"

## 3. เอาต์พุตเต็มของ `report.ts` (seed 20260923, MC 20,000 run)

หัวข้อ 1 (buff stacking, members level 25):

```
role     base/cap  rule        1       2       3       4     +2nd  +3rd  +4th
tanker       0.36  PASS         21.7    33.0    38.8    41.8   11.2   5.8   3.0
ranged       0.34  PASS         23.2    35.6    42.3    45.9   12.4   6.7   3.6
support      0.50  EXCEPTION    32.3    43.8    47.8    49.2   11.4   4.0   1.4
magic        0.34  PASS         23.2    35.6    42.3    45.9   12.4   6.7   3.6
GDD Tanker x1..4: 21.7 vs 21.72 match · 33 vs 32.96 match · 38.8 vs 38.77 match · 41.8 vs 41.78 match
GDD single member: tanker 21.7 vs 21.72 match · ranged 23.2 vs 23.19 match · support 32.3 vs 32.32 match · magic 23.2 vs 23.19 match
```

หัวข้อ 2 (exp curve, tick/เลเวล 5 จุดตาม GDD):

```
level  ticks(formula)  GDD  walk min  GDD   note
   10            10.0   10      50.1    50  match
   20            16.3   16      81.4    80  match
   30            21.6   22     108.1   110  match
   45            28.7   29     143.6   145  match
   60            35.1   35     175.7   175  match
```

หัวข้อ 3 (gear tier 1–5, ปัดครั้งเดียว D-022):

```
tier 1: +0  30/ 30   +10  54/ 54   +15  66/ 66
tier 2: +0  79/ 79   +10 143/142*   +15 174/174
tier 3: +0 140/140   +10 251/252*   +15 307/308*
tier 4: +0 209/209   +10 376/376   +15 460/460
tier 5: +0 286/285*   +10 514/513*   +15 628/627*
(* = differs from GDD by 1, tolerance ±1 ตาม D-022)
```

หัวข้อ 5–7 (drop/economy/party ratio) — เลขตรง GDD ในบรรทัดสรุป:

```
GDD at x1.0: 40m Epic 10.4 vs GDD 10 match · 40m Legendary 62.5 vs GDD 60 match · 180m Epic 2.3 vs GDD 2.5 match · 180m Legendary 13.9 vs GDD 14 match
GDD check: income x1.0 1488.0 vs 1470 (1.2%) match · ratio 2.83 / 2.13 (per-scenario, ดูหัวข้อ 4 สำหรับ 2.45 ของ GDD)
full party 8 (L25) class average: 1.97 / 1.97 (in/in) เทียบเป้า 1.8–2.2
```

## 4. คำนวณมือ/สคริปต์อิสระ เทียบตาราง GDD (อ่าน GDD เองจากไฟล์ต้นฉบับ ไม่อ้างจาก sim-report.md อย่างเดียว)

อ่าน GDD ตรง: `เกม GPS Dungeon กรุงเทพฯ — Design Document.md` หัวข้อ "สูตร buff stacking" (บรรทัด 177–198), "Exp curve" (605–623), "อุปกรณ์" (646–662), "ราคา NPC และยา" (702–714)

### 4.1 Tanker L25 1–4 คน (สูตร buff stacking, สคริปต์ python อิสระ)

```python
base=16; cap=45
for n in [1,2,3,4]:
    P = n*1.5   # P ต่อคน = 1 + level/50 = 1 + 25/50 = 1.5
    buff = cap*(1-(1-base/cap)**P)
    print(n, round(buff,1))
# ผล: 1 -> 21.7, 2 -> 33.0, 3 -> 38.8, 4 -> 41.8
```
ตรงกับตาราง GDD บรรทัด 193–196 (21.7% / 33.0% / 38.8% / 41.8%) ทุกตัว และตรงกับ simulator (21.72/32.96/38.77/41.78 ปัดเป็นทศนิยม 1 ตำแหน่ง) ภายใน tolerance 0.05 ตามกฎ tolerance ของ README

### 4.2 ค่าต่อ 1 คนต่อ role ที่เลเวล 25 (GDD บรรทัด 198)

```python
def buff(base,cap,P): return cap*(1-(1-base/cap)**P)
buff(17,50,1.5) -> 23.2   # Ranged/Magic (GDD: 23.2%)
buff(25,50,1.5) -> 32.3   # Support (GDD: 32.3%)
buff(16,45,1.5) -> 21.7   # Tanker (GDD: 21.7%)
```
ตรงกับ GDD ทั้ง 4 role

### 4.3 Tick ต่อเลเวล 5 จุด (สูตร `2 × L^0.7`, GDD บรรทัด 613–621)

```python
for L in [10,20,30,45,60]: print(L, round(2*L**0.7,1))
# 10 -> 10.0 (GDD 10) · 20 -> 16.3 (GDD 16) · 30 -> 21.6 (GDD 22) · 45 -> 28.7 (GDD 29) · 60 -> 35.1 (GDD 35)
```
ผลต่างสูงสุด 0.4 tick อยู่ในเกณฑ์ tolerance ตาราง tick ±0.5 ตามที่ README กำหนด ครบ 5 จุดที่ acceptance ต้องการ

### 4.4 Gear tier 1–5 (สูตร `30 × T^1.4 × (1 + 0.08 × enhance)`, GDD บรรทัด 654–661)

```python
def gearStat(T, enh): return 30*T**1.4*(1+0.08*enh)
# T1: 30.0/54.0/66.0 (GDD 30/54/66) ตรงเป๊ะ
# T2: 79.0/143.0/174.0 (GDD 79/142/174) ต่าง 1 ที่ +10
# T3: 140.0/251.0/307.0 (GDD 140/252/308) ต่าง 1 ที่ +10 และ +15
# T4: 209.0/376.0/460.0 (GDD 209/376/460) ตรงเป๊ะ
# T5: 286.0/514.0/628.0 (GDD 285/513/627) ต่าง 1 ทุกช่อง
```
ผลต่างสูงสุด 1 แต้ม ใน 6 ใน 15 ช่อง อยู่ในเกณฑ์ tolerance ±1 ที่ยอมรับแล้วใน D-022 (ตาราง GDD ปัดเลขทีละขั้น ส่วนสูตรปัดครั้งเดียวตอนจบ) — ตรงกับสิ่งที่ context ของ task ระบุไว้ล่วงหน้าว่าเป็นข้อค้นพบที่ยอมรับแล้ว ไม่ใช่ defect ใหม่

### 4.5 อัตราส่วนรายได้ต่อค่ายา (GDD บรรทัด 714)

```python
1470/600 = 2.45
```
ตรงกับตัวเลข GDD ที่เขียนว่า "ราว 1,470 gold ... เทียบกับค่ายาราว 600 gold ... อัตราส่วน 2.45 เท่า" และตรงกับค่าที่ simulator สร้างเป็น vector (`economy.json` → `incomeToPotionRatio` expected 2.45, tolerance 0.005) ทุกประการ

## 5. ยืนยันว่า simulator อ่านค่าจาก config เท่านั้น (ไม่แก้ config จริง)

`tools/sim/src/config.ts` มี `loadBalanceConfig(dir = BALANCE_DIR)` รับ path ได้ ใช้ช่องนี้พิสูจน์โดยไม่แตะ `config/balance/` จริง:

1. คัดลอก `config/balance/*.json` ไปที่ scratchpad ชั่วคราว (`.../scratchpad/cfgcopy/`)
2. แก้เฉพาะสำเนา: `classes.json` → `roles.tanker.base_pct` จาก 16 เป็น 30 (cap คงที่ 45)
3. เขียนสคริปต์ tsx ชั่วคราว (ไม่ commit) เรียก `loadBalanceConfig()` (default = config จริง) กับ `loadBalanceConfig(pathสำเนา)` แล้วคำนวณ `roleBuffPct` ของ Tanker 1 คน level 25 ทั้งสองชุด

ผลลัพธ์:
```
real tanker base/cap: 16 45
mod  tanker base/cap: 30 45
real tanker buff% (1 member L25): 21.72
mod  tanker buff% (1 member L25): 36.34
```

ค่าจาก config จริงยังคงเป็น 21.72% (ตรงกับหัวข้อ 3–4 ทุกที่) ส่วนสำเนาที่แก้ `base_pct` เปลี่ยนผลลัพธ์ทันทีเป็น 36.34% → พิสูจน์ว่าสูตรไม่มีค่า Tanker 16/45 hardcode อยู่ในโค้ด อ่านจาก config ที่ส่งเข้ามาจริง ตรวจสอบเพิ่มด้วย `git status` ว่า `config/balance/classes.json` ไม่ถูกแก้ (ไม่อยู่ในรายการ modified/untracked ที่เกิดจากงานนี้)

## 6. Grep หาเลข balance ที่ hardcode ใน `tools/sim/src/`

ตรวจไฟล์ที่มีการคำนวณจริง (`formulas.ts`, `build.ts`, `scenarios.ts`, `drops.ts`, `economy.ts`, `survival.ts`) — เลขที่พบทั้งหมดเป็นค่าคงที่เชิงโครงสร้าง ไม่ใช่ค่า balance:

- `formulas.ts`: มีแต่ 0, 1, −1, 2 (index/edge-case) ค่าทั้งหมดที่ใช้จริง (base_pct, cap_pct, defSoftcap, gearStatCoef ฯลฯ) มาจาก parameter object (`RoleParams`, `MonsterParams`, `GearParams` ...) ที่ build จาก config ผ่าน `params.ts`
- `build.ts`, `scenarios.ts`, `drops.ts`, `economy.ts`, `survival.ts`: เลขที่พบคือค่าคงที่หน่วย (`100` = แปลงเปอร์เซ็นต์, `3600`/`60` = วินาที/ชม., `10`/`50`/`90` = percentile) ไม่มีเลข balance เช่น 16, 45, 25, 1470, 600, 2.45 อยู่ในโค้ดโดยตรง
- ข้อยกเว้นที่มีอยู่แล้วและมีเหตุผลบันทึกไว้: `src/vectors.ts` ปิด `no-magic-numbers` ทั้งไฟล์เพราะเลขในไฟล์นั้นเป็น **input ของกรณีทดสอบ** (level, จำนวนคน) ไม่ใช่ค่า balance ตามที่ README ระบุไว้แล้ว ไม่นับเป็นข้อบกพร่อง
- หัวข้อ 8 ของ `report.ts` (`WHAT_IF` ใน `report-economy.ts`) มีเลขคันโยกสมมติ (เช่น 1%, 0.5%, ×1.25, ×1.5) แต่ README ระบุชัดว่า "เป็นสมมติฐานสำหรับ decision ไม่เขียนลง config" และไม่ใช้ในการคำนวณรางวัลจริง จึงไม่ใช่ hardcoded balance

สรุป: ไม่พบเลข balance ที่ hardcode นอกเหนือจากที่มีเอกสารรับรองไว้แล้ว

## 7. ข้อค้นพบที่เปิดอยู่ — เป็นการตัดสินใจด้านดีไซน์ ไม่ใช่ defect ของ simulator (ไม่ทำให้ gate นี้เป็น NEEDS_CHANGES)

- **D-020** (HUMAN): นิยาม "อยู่รอดราว 45 นาที" ของ GDD ตรงกับกรณี damage ×1.0 (44.4 นาทีถึง auto-retreat, ตรงตามเป้า) แต่คนเล่นคนเดียวที่ไม่ใช่ Tanker อยู่รอดจริงเพียง 27.8 นาที (ขาดจากเป้า 45 นาที ~38%) — simulator คำนวณถูกต้องตามสูตรและ hit chance ที่ fit แล้ว (D-029) ข้อค้นพบนี้เป็นเรื่องที่ GDD ใช้เคสอ้างอิงซึ่งไม่ครอบคลุมผู้เล่นเดี่ยวที่ไม่ใช่ Tanker รอ HUMAN ตัดสินใน P1-F03-T28
- **D-038** (HUMAN, P-1): เป้ารายได้ต่อค่ายา 2.5–3 (ต่ำสุดยอมรับ 2.45) ตรงกับเคสอ้างอิง GDD (×1.0 ไม่มี VIT = 2.83) แต่ผู้เล่นคนเดียวจริงที่ใช้ VIT ได้ค่าตั้งแต่ 1.3 ถึง 4.5 เท่า กว้างกว่าเป้าที่ตั้งไว้มาก — เป็นเรื่องนิยามว่า "ผู้เล่นทั่วไป" คือกรณีไหน ไม่ใช่สูตรผิด
- **D-039** (game-director, P1-F03-T25): เป้า party ต่อหัว 1.8–2.2 เท่า วัดได้สองวิธีที่ให้ผลต่างกัน (เทียบ role ที่ขาดจริง = 2.05 ทั้งคู่ อยู่ในเป้า vs ค่าเฉลี่ย 4 class = 1.79 ต่ำกว่าเป้าเล็กน้อย) รอ game-director เลือกวิธีวัด

ทั้งสามข้อนี้ตรงกับที่ context ของ task brief ระบุไว้ล่วงหน้าว่าเป็น known open findings ที่เป็น design decision ไม่ใช่ simulator defect จึงบันทึกเป็นหมายเหตุ ไม่เปิด bug ใหม่ใน `qa/bugs.md`

## 8. ตารางสอบทาน acceptance (P1-F03-T23)

| Acceptance | ผล | หลักฐาน |
| --- | --- | --- |
| รัน test ของ simulator เองและแนบ output | ผ่าน | หัวข้อ 1: `pnpm test` 94/94, `gen-vectors.ts --check` exit 0, `report.ts` เอาต์พุตเต็มหัวข้อ 3 |
| เทียบ vectors กับตาราง GDD อิสระจากผู้เขียน — Tanker 1–4 คน | ผ่าน | หัวข้อ 4.1: 21.7/33.0/38.8/41.8% ตรง GDD บรรทัด 193–196 ทุกตัว |
| ... ค่าต่อ 1 คนต่อ role | ผ่าน | หัวข้อ 4.2: Tanker 21.7%, Ranged/Magic 23.2%, Support 32.3% ตรง GDD บรรทัด 198 |
| ... tick ต่อเลเวล 5 จุด | ผ่าน | หัวข้อ 4.3: L10/20/30/45/60 ตรง GDD ภายใน tolerance 0.5 |
| ... gear tier 1–5 | ผ่าน | หัวข้อ 4.4: 15 ช่อง ตรง 9 ช่อง ต่าง 1 แต้ม 6 ช่อง ภายใน tolerance ±1 (D-022 accepted) |
| ... อัตราส่วนรายได้ต่อค่ายา | ผ่าน | หัวข้อ 4.5: 1470/600 = 2.45 ตรง GDD บรรทัด 714 เป๊ะ |
| ยืนยันว่า simulator อ่านค่าจาก config (แก้ค่าใน config สำเนาแล้วผลเปลี่ยน) | ผ่าน | หัวข้อ 5: แก้ tanker base_pct 16→30 ในสำเนา ผลเปลี่ยนจาก 21.72% เป็น 36.34% ค่าจริงในดิสก์ไม่ถูกแตะ |
| verdict PASS / NEEDS_CHANGES | PASS | สรุปต้นเอกสาร |

## 9. Verdict

**PASS** — simulator ให้ค่าตรงตาราง GDD ภายใน tolerance ที่ระบุไว้ใน `tools/sim/README.md` ทุกจุดที่ตรวจ (buff stacking Tanker 1–4 คนและค่าต่อคน, tick ต่อเลเวล 5 จุด, gear tier 1–5, อัตราส่วนรายได้ต่อค่ายา) ยืนยันด้วยการคำนวณอิสระนอกโค้ด ไม่ใช่แค่เชื่อ sim-report.md ยืนยันว่าอ่านค่าจาก config เท่านั้น ไม่มีเลข balance hardcode ที่ไม่มีเอกสารรับรอง test ทั้งหมดผ่าน และ vector ทุกตัวมี source ไม่มี bug severity high ขึ้นไปที่พบใหม่ ข้อค้นพบที่เปิดอยู่ (D-020, D-038, D-039) เป็นการตัดสินใจดีไซน์ที่รอ HUMAN/game-director ตามที่ระบุไว้แล้ว ไม่ใช่ defect ของ simulator
