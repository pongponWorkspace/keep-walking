# Phase 1 Sign-off — ฝั่ง Product (P1-CLOSE-PRODUCT)

| หัวข้อ | ค่า |
| --- | --- |
| เจ้าของ | product-manager |
| วันที่ | 2026-09-24 |
| ขอบเขต | ตรวจฝั่ง agent เท่านั้น ไม่ใช่การยืนยัน Go/No-go แทน HUMAN — P1-F01-T11 และ P1-F02-T23 ยังเป็นสิทธิ์ของคนเสมอ |
| อ้างอิง | `studio/roadmap.md` Phase 1 (เป้าหมาย 3 ข้อ, เกณฑ์ปิด) · `qa/reports/phase-1-regression.md` (verdict PASS, E1–E20) · `product/reviews/F01-product-gate.md` (PASS) · `product/reviews/F02-spike-criteria.md` (PASS) · `design/levels/coverage-report.md` · `docs/reviews/F02-tech-gate.md` (PASS) · `qa/reports/F02-qa-gate.md` (PASS) · `qa/reports/F01-qa-gate.md` (PASS) · `qa/reports/F03-qa-gate.md` (PASS) · `product/metrics.md` · `product/telemetry-events.md` · `studio/decisions/decision-log.md` (D-005, D-009, D-069, D-070, D-072–D-074, D-038, D-039) |

## 0. สรุปบนสุด

**verdict: SIGN-OFF (agent side)** — งานฝั่ง agent ของ Phase 1 ครบตามเป้าหมายทั้ง 3 ข้อที่ roadmap ตั้งไว้ ทุก gate ที่เกี่ยวกับ product (F01 product gate, F02 spike-criteria review, F03 QA/design/copy/visual gate) เป็น **PASS** ไม่มีบั๊ก severity สูงค้าง ไม่มี dark pattern (ไม่มี IAP ในโค้ดหรือ config ใดๆ ตรวจแล้วในหัวข้อ 4) telemetry ครบตามชื่อที่ product กำหนด

**แต่ Phase 1 ปิดจริงไม่ได้จนกว่า HUMAN จะทำ 2 งานตัดสินใจหลัก** ที่ผูกกับเกณฑ์ปิด phase โดยตรง (`studio/roadmap.md` บรรทัด 46: "มีผล Go/No-go จาก F01+F02"):
- **P1-F01-T11** — ยืนยัน Go/No-go ของ coverage (คำแนะนำของ agent: **Go** — หัวข้อ 2)
- **P1-F02-T23** — ยืนยัน Go/No-go ของ map/location spike (ยังตอบไม่ได้เลยแม้แต่ agent เพราะ**ยังไม่มีการเดินทดสอบจริง** P1-F02-T20 — หัวข้อ 3)

เอกสารนี้ตอบให้ HUMAN ครบทั้งสองเรื่องเท่าที่ข้อมูล agent มีอยู่ พร้อมระบุว่าอะไรจะเปลี่ยนแผนถ้าเดินจริงแล้วได้ผลไม่ดี

## 1. เป้าหมาย Phase 1 ทั้ง 3 ข้อ — สถานะรายข้อ

roadmap ตั้งคำถามไว้ 3 ข้อก่อนเริ่มเขียน gameplay: (1) กรุงเทพมีพื้นที่พอทำ dungeon ไหม (2) แผนที่/GPS บนเว็บมือถือใช้ได้จริงไหม (3) ทุก role มีทิศทางเดียวกันไหม

| # | เป้าหมาย | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| 1 | กรุงเทพฯ+ปริมณฑลมีพื้นที่พอทำ dungeon | **met on agent side / pending human evidence** | `design/levels/coverage-report.md` หัวข้อ 0, 5.4 (คำแนะนำ Go, 2 ย่านผ่านครบ 4.1) · `product/reviews/F01-product-gate.md` verdict PASS · `qa/reports/F01-qa-gate.md` verdict PASS (นับอิสระ 730 dungeon ตรง 100%) · รอ **P1-F01-T11** (HUMAN) ยืนยันจริง |
| 2 | แผนที่และ GPS บนเว็บมือถือใช้ได้จริง | **not met yet — ต้องรอ field walk เท่านั้น** | โครงสร้างพร้อมครบ: `docs/reviews/F02-tech-gate.md` PASS, `qa/reports/F02-qa-gate.md` PASS (mock trace เล่นซ้ำได้, build local ได้), `product/reviews/F02-spike-criteria.md` PASS (เกณฑ์ S1–S17 ถูกต้องแล้ว) — แต่**ไม่มีตัวเลขวัดจริงแม้แต่ตัวเดียว** เพราะ P1-F02-T20 (HUMAN เดินทดสอบ) ยังไม่เกิด (`qa/reports/phase-1-regression.md` §7 E10: PENDING-HUMAN, `qa/playtest/results/` ว่างเปล่า) |
| 3 | ทุก role มีทิศทางเดียวกัน | **met** | `qa/reports/F03-qa-gate.md` PASS (simulator ตรงตาราง GDD) · `design/reviews/F03-design-gate-a.md` รอบ 2 PASS, `design/reviews/F03-design-gate-b.md` PASS · `art/reviews/F03-visual-gate.md` รอบ 2 PASS · copy gate PASS (`pnpm run lint:copy` exit 0) · เอกสารทิศทางครบทุก role (`qa/reports/phase-1-regression.md` E14 PASS) — เหลือเฉพาะ **P1-F03-T26** (HUMAN ยืนยัน world building) ซึ่งไม่กระทบว่า role ต่างๆ *เข้าใจตรงกัน* แล้วหรือยัง เป็นแค่การรับรองทิศทางเรื่องเล่าขั้นสุดท้าย |

สรุป: เป้าหมาย (1) และ (3) agent ทำครบและได้คำตอบเชิงเนื้อหาแล้ว เหลือ HUMAN แค่ "กดยืนยัน" เป้าหมาย (2) ยังไม่มีคำตอบเชิงเนื้อหาเลยเพราะเป็นคำถามที่ตอบได้เฉพาะจากการเดินจริงกลางแดดเท่านั้น — เครื่องมือวัดพร้อม แต่ยังไม่มีใครเดิน

## 2. Coverage (F01) — คำแนะนำต่อ HUMAN สำหรับ P1-F01-T11

### 2.1 คำแนะนำ: Go

เห็นด้วยกับคำแนะนำของ level-designer ใน `design/levels/coverage-report.md` หัวข้อ 5: **Go** — ตรวจซ้ำอิสระแล้วผ่าน (`product/reviews/F01-product-gate.md`, `qa/reports/F01-qa-gate.md`) ไม่มีการขยับเกณฑ์หลังเห็นผล (กติกา PRD หัวข้อ 8) ตัวเลข:

- **เขตพระนคร** (Launch Score 0.8886, อันดับ 1/79): เขียว 81.7% (≥60 ผ่าน), 20 dungeon (≥10 ผ่าน), preset 3/3 (≥2 ผ่าน), แดง 0.0% (≤5 ผ่าน) → **ผ่าน Go เต็ม G1–G4**
- **เขตปทุมวัน** (Launch Score 0.8258, อันดับ 2/79): เขียว 72.0%, 23 dungeon (นับรวม multi-district), preset 3/3, แดง 0.06% → **ผ่าน Go เต็ม G1–G4**
- PRD กำหนดขั้นต่ำ "2–3 ย่านผ่านครบ → Go" — มี 2 ย่านผ่านเต็มโดยไม่ต้องพึ่งทางเสริมใดเลย เข้าเงื่อนไข Go ตามลำดับความสำคัญ 4.1 ก่อน 4.2 เสมอ
- ตรวจเกณฑ์ No-go (N1–N3) แล้ว **ไม่เข้าเงื่อนไขข้อใดเลย** (มี 3 ย่านผ่านอย่างน้อยแบบ 4.2, แดงในย่านดีที่สุด ≤0.06%)

### 2.2 ย่านเปิดตัว 2 กับ 3 ย่าน — ผลต่อ GR-1

`product/metrics.md` GR-1 (บรรทัด 140) ผูกตัวเลขเป้ากับ G4/S3 ที่ HUMAN เลือกใช้ตัดสิน Go โดยตรง เอกสารเปิด backlog ค้างไว้แล้วที่ Q-T19-2 ว่าต้องแก้เลขทันทีที่ T11 ปิด:

| ทางเลือกของ HUMAN | ย่านเปิดตัว | เกณฑ์ที่ใช้ | เป้า GR-1 (สัดส่วนเห็น `distance_band=red` ตอนเปิดแอปครั้งแรก) |
| --- | --- | --- | --- |
| Go แบบ 2 ย่าน (ขั้นต่ำของ PRD) | เขตพระนคร + เขตปทุมวัน | G4 (แดง ≤5%) | **≤5%** |
| Go แบบ 3 ย่าน (ตามกลยุทธ์ GDD ที่อยากได้ 2–3 ย่าน) | เขตพระนคร + เขตปทุมวัน + เขตดินแดง | S3 ของเกณฑ์ 4.2 (แดง ≤15%) | **≤15%** |

เขตดินแดง (อันดับ 3, Launch Score 0.8143) ผ่านเกณฑ์ 4.2 "Go พร้อมทางเสริม" ครบ (S1 เขียว+เหลือง 100%, S2 = 15 ถ่วงน้ำหนักผ่านสบาย, S3 แดง 0.0%) แต่ไม่ผ่าน G1 เต็ม (เขียว 37.1% < 60%) และระยะเดินเฉลี่ยทั้งย่าน 939 ม. อยู่ใกล้ขอบกลางของช่วง 800–3,000 ม. มากกว่า 2 อันดับแรก — ถ้า HUMAN เลือกย่านที่ 3 เพื่อให้ครบ 3 ย่านตามกลยุทธ์ GDD ต้องยอมรับเป้า guardrail onboarding ที่หลวมกว่าเดิม 3 เท่า (5% → 15%) เป็นการแลกเปลี่ยนที่ควรบันทึกเป็นการตัดสินใจของ HUMAN ไม่ใช่ default โดยปริยาย

**คำแนะนำของ product-manager:** เริ่มเปิดตัวที่ 2 ย่าน (พระนคร + ปทุมวัน) ก่อน เพราะทั้งคู่ผ่าน Go เต็มโดยไม่มีเงื่อนไข ให้ guardrail onboarding เข้มที่สุด (≤5%) ซึ่งตรงกับกลุ่มผู้เล่นเป้าหมาย "40 นาที/วัน" ที่ทนความไกลได้น้อยที่สุด ส่วนเขตดินแดงเก็บไว้เป็นย่านที่ 2 ของการขยาย (ไม่ใช่ย่านเปิดตัวรอบแรก) จนกว่าจะมีข้อมูลระยะเดินเฉพาะ pocketPark จริง (handoff ที่ level-designer เปิดค้างไว้ใน launch-criteria หัวข้อ 4.6)

**ทันทีที่ T11 ปิด:** product-manager ต้องกลับมาแก้ตัวเลข GR-1 ใน `product/metrics.md` ให้ตรงกับผลจริง (backlog ของตัวเองที่เปิดไว้แล้ว ไม่ใช่งานใหม่)

### 2.3 เงื่อนไขที่ HUMAN ควรรู้ก่อนตัดสิน (ไม่กระทบคำแนะนำ Go แต่กระทบตัวเลขที่ใช้)

- **25 รายการสถานที่กำกวม/อ่อนไหว** ใน 2 ย่านที่แนะนำ (`design/levels/coverage-report.md` หัวข้อ 6) เช่น วังเทเวศร์, สนามหลวง, สถานีหัวลำโพง, พิพิธภัณฑ์เอกชนที่เก็บค่าเข้า — ยังไม่ถูกตัดออกจากตัวเลข 20/23 แห่งดิบที่ใช้อ้างในหัวข้อ 3–4 ของรายงาน (รอ HUMAN ตัดสินใจรายชิ้น) แต่ **ตัดออกแล้วในหัวข้อ 0/5 ที่ใช้สรุปคำแนะนำ Go** จึงไม่กระทบคำแนะนำนี้ ต้องปิดก่อน F14 (สร้าง dungeon จริง) ไม่ใช่ก่อนปิด Phase 1
- **D-074 (PROPOSED, รอ HUMAN ที่ P1-F01-T11):** ถ้ามีการรัน analysis ซ้ำหลังแก้บั๊ก `transitAccessScore` (D-069 ปิดแล้ว ไม่กระทบอันดับ 1–3) แล้วเขตพระนครตกจาก G1/G2 แต่ยังผ่าน S1–S3 — ให้เปลี่ยนป้ายเป็น "Go พร้อมทางเสริม" โดย **ย่านเปิดตัวยังคงเป็นพระนคร + ปทุมวันเหมือนเดิม** ไม่ต้องถามคนใหม่ ยกเว้นกรณีตกลงไปแตะเกณฑ์ No-go จริง — เสนอให้ HUMAN ตัดสินเงื่อนไขนี้พร้อมกับ Go/No-go หลักในคราวเดียว (T11 ปิดได้รอบเดียว)
- **F-11 (ทางเข้าระดับเริ่มต้น):** ทั้งสองย่านผ่านแบบมีเงื่อนไข (ยังไม่มีระยะเดินเฉพาะ pocketPark แยกต่างหาก) ระยะเฉลี่ยทั้งย่าน 550 ม. (พระนคร) และ 655 ม. (ปทุมวัน) ต่ำกว่า `farDungeonThreshold_m` มาก จึงเป็นความเสี่ยงต่ำ แต่ยังเป็น hedge ที่ level-designer เปิดค้างไว้

## 3. Map/Location Spike (F02) — สถานะเกณฑ์ S1–S17

`docs/tech/F02-map-location-spike.md` หัวข้อ 10 กำหนดเกณฑ์ไว้ **ก่อน** มีหน้าวัดและก่อนเดินจริง (ห้ามปรับหลังเห็นผล) `product/reviews/F02-spike-criteria.md` ตรวจแล้วว่าเกณฑ์ทุกตัวสะท้อนกลุ่มผู้เล่นเป้าหมายถูกต้อง (verdict PASS) — ประเด็นของหัวข้อนี้จึงไม่ใช่ "เกณฑ์ถูกไหม" (ตอบแล้ว) แต่คือ "ผลจริงเป็นอย่างไร" ซึ่ง **ยังไม่มีเลยสักตัว**

### 3.1 สิ่งที่ agent ยืนยันได้แล้ว (ไม่ใช่ผลวัด แต่เป็นความพร้อมของเครื่องมือวัด)

- โครงสร้างและ tech gate ผ่าน PASS เต็ม (`docs/reviews/F02-tech-gate.md`) — `LocationProvider` interface, Web/Mock provider, หน้า spike MapLibre GL JS + PMTiles ทำงานถูกต้องตาม contract
- HUD วัดผล (T11) มีสูตรคำนวณครบทั้ง 17 ตัวชี้วัด + I1/I2 ตามนิยามในหัวข้อ 10.5 ของ tech note — ยืนยันด้วย test อัตโนมัติว่า "รันได้และให้ output ตามรูปแบบ" แต่ไม่ใช่การยืนยันว่า "ค่าที่วัดได้จริงกลางแจ้งอยู่ในเกณฑ์ Go"
- Mock trace เล่นซ้ำได้จริงและจุดขยับบนแผนที่ (E6 PASS, e2e 30/30) — พิสูจน์ pipeline ข้อมูลถูกต้อง แต่ mock trace ไม่ใช่ GPS จริงกลางแจ้ง จึงตอบ S9–S15 (accuracy, TTFF, gate, sample gap, latency) ไม่ได้
- `pnpm build` ได้ dist ที่ deploy ได้ใน local (E7 PASS ส่วน local) — ตอบ "โค้ด build ผ่าน" ไม่ใช่ "โหลดเร็วพอบนเน็ตมือถือจริง" (S4–S8 ยังต้องรอ)
- คู่มือเดินทดสอบครบ 3 ไฟล์ (E8 PASS: `qa/playtest/field-walk-kit.md`, `field-walk-form.md`, `safety-briefing.md`) พร้อมให้ HUMAN ใช้ได้ทันที
- ความถูกต้องเชิงโครงสร้างของป้ายภาษาไทยบนแผนที่ (คนละชุดทดสอบกับ S16 ของ spike แต่เป็นหลักฐานสนับสนุน): screenshot test 40 ภาพของ content/visual gate (`qa/reports/F02/map-style/P1-H06-screenshot-tests.md`) พบบั๊ก severity high (ป้าย/ไอคอน dungeon ซ้ำกันหลายชุดต่อ 1 dungeon จาก symbol layer อ่าน geometry polygon ที่ถูกตัดข้าม tile) และแก้จริงแล้วผ่าน P1-X32/P1-X33 (ยืนยันใน `art/reviews/F03-visual-gate.md` รอบ 2 PASS) — **ข้อสังเกตกระบวนการ:** บั๊กนี้ไม่เคยถูกบันทึกเป็นรายการใน `qa/bugs.md` (ไฟล์นั้นระบุว่า "ไม่เคยมี severity high ตลอด Phase 1" ซึ่งไม่ตรงกับรายงาน P1-H06) แม้จะแก้จบแล้วจริงและ verify ซ้ำแล้ว ก็ควร handoff ให้ qa-tester ปรับ hygiene ของ bugs.md ใน Phase 2 (ไม่กระทบ verdict ใดเพราะบั๊กปิดสนิทแล้ว)
- งานย่อยที่ยังเปิดแบบไม่บังคับ: V-10 ของ `art/reviews/F03-visual-gate.md` (เพิ่ม e2e นับ `kw-rift-sponsored`/`kw-rift-crack` และถ่ายภาพ S1/S3 ใหม่หลัง P1-X33) ยังไม่ปิด แต่ visual gate ผ่าน PASS โดยไม่รอข้อนี้แล้ว — ยกไป Phase 2 ได้

### 3.2 สิ่งที่ต้องรอผลเดินจริงเท่านั้น (ครอบคลุมเกณฑ์ทั้งหมด)

ตามกฎรวมผล 10.2 ข้อ 4 ของ tech note: "ตัวชี้วัด 'เด็ดขาด' ที่วัดไม่ได้หรือข้อมูลไม่พอ = ยังตัดสินไม่ได้ ต้องเดินซ้ำ ไม่นับเป็น Go" — เนื่องจากยังไม่มี segment เดินจริงกลางแดดแม้แต่ครั้งเดียว (`qa/playtest/results/` ว่างเปล่า) **เกณฑ์ทั้ง 17 ตัว (S1–S17) และ I1/I2 อยู่ในสถานะ "ยังตัดสินไม่ได้" ทั้งหมด ไม่มีข้อยกเว้น** โดยเฉพาะกลุ่มที่กระทบผู้เล่นโดยตรงที่สุดตามหลักการ GDD (รางวัลผูกกับการเคลื่อนไหวจริง, ต้นทุนเดินทางสูงบทลงโทษต้องต่ำ):

- **S9 accuracy ในสวน**, **S12 % หน้าต่างที่ผ่าน movement gate** — ตัดสินได้เฉพาะจากข้อมูลสวนจริง ไม่มีทางประมาณจาก mock trace ได้เลยเพราะ mock ไม่มี noise ของเสาสัญญาณ/ตึกสูง/ต้นไม้จริง
- **S3 แบตต่อ 30 นาที**, **S17 อ่านจอกลางแดด** — ต้องมีแดดจริงและเครื่องจริง ไม่มีทางจำลองในเครื่องมือ CI ได้
- **S1/S2 FPS ระหว่างเดิน** — วัดได้บนเดสก์ท็อป/emulator แต่เกณฑ์นี้ผูกกับอุปกรณ์เป้าหมายจริง (เครื่องราคาระดับกลางที่กลุ่มผู้เล่นเป้าหมายใช้) ซึ่ง kit ของ T14 ยังไม่ได้รันบนเครื่องเป้าหมายจริงกลางแจ้ง

### 3.3 เกณฑ์ No-go ที่จะเปลี่ยนแผน (ตัวชี้วัด "เด็ดขาด" — S1, S2, S3, S8, S9, S12)

ตามกฎ 10.2 ข้อ 2–3: ผลต่อเครื่อง = **No-go ทันทีถ้ามีตัวเด็ดขาดตัวใดตัวหนึ่งเป็น No-go** และผลรวมของ spike = ผลที่แย่กว่าระหว่าง Android Chrome กับ iOS Safari (D-003) ผลเหล่านี้จะทำให้ P1-F02-T23 ต้องตอบ No-go และ roadmap บังคับให้ producer เสนอปรับ design ก่อนเข้า Phase 2:

| ถ้าเดินจริงแล้วพบ | หมายความว่าอะไรต่อผู้เล่น | ผลต่อแผน |
| --- | --- | --- |
| S1/S2 FPS เฉลี่ย < 30 หรือ p5 < 20 ระหว่าง pan/zoom หรือโหมดตามตัว | แผนที่กระตุกจนใช้นำทางจริงไม่ได้ | No-go — ต้องทบทวน render pipeline/สไตล์แผนที่ก่อนเข้า F04 |
| S3 แบต > 15% ต่อ 30 นาที (จอเปิดตลอด) | กลุ่มผู้เล่นเวลามาก (3–6 ชม./วัน) เล่นได้ไม่ถึงครึ่งวันตามที่ตั้งใจ ขัด CLAUDE.md โดยตรง | No-go — กระทบ GR-12 และ pillar "ต้นทุนเดินทางสูง บทลงโทษต้องต่ำ" ต้องลดการวาดจอ/ปรับความถี่ location sample |
| S8 data รวม > 30 MB ต่อ 30 นาที | ผู้เล่นแพ็กเกจเน็ตราคาถูก (กลุ่มเป้าหมายหลักของเกม) เล่นได้ไม่ถึงเดือน | No-go — ต้องลด byte budget ของ tile/style ก่อน publish จริง |
| S9 accuracy ในสวน median > 15 ม. หรือ p90 > 30 ม. | ผู้เล่นเข้า dungeon ไม่ได้เพราะ check-in ต้องการ accuracy < 30 ม. — ประมาณ 1 ใน 10 คนเข้าไม่ได้ตอนที่ p90 หลุดเกณฑ์ | No-go — กระทบ "รางวัลผูกกับการเคลื่อนไหวจริง" ทั้งระบบ ต้องทบทวน location sampling strategy |
| S12 < 85% ของหน้าต่าง 5 นาทีผ่าน movement gate ขณะเดินต่อเนื่องในสวน | คนที่เดินจริงแต่เกม "ไม่นับ" เกิน 15% ของเวลา — ขัด "รางวัลผูกกับการเคลื่อนไหวจริง" ตรงที่สุดในบรรดาเกณฑ์ทั้งหมด | No-go — เป็นสัญญาณอันตรายที่สุดสำหรับ north star (validated walking minutes) เพราะแปลว่าคนเดินจริงแต่ไม่ได้รางวัลจริง |

### 3.4 กรณี Go พร้อมเงื่อนไข (ตัวชี้วัด "มีทางเลือก") — ไม่ต้องเปลี่ยนแผนใหญ่

ตัวชี้วัดที่เหลือ (S4–S7, S10, S11, S13–S17) มีป้ายกำกับ "มีทางเลือก" ใน tech note หัวข้อ 10.1 หมายความว่าถ้าตกไปโซน No-go จะกลายเป็น **"Go พร้อมเงื่อนไข"** ไม่ใช่ No-go ทันที — tech note หัวข้อ 12 มีทางแก้เตรียมไว้ล่วงหน้าแล้วสำหรับแต่ละตัว (เช่น S10 accuracy ในซอยแย่ → เพิ่มระยะ buffer ของ polygon ทางเข้า, S16 ป้ายไทยผิดตำแหน่ง → ปรับ font stack) — HUMAN ที่ P1-F02-T23 ไม่จำเป็นต้องหยุดทั้ง phase เพื่อรอแก้กลุ่มนี้ สามารถรับเป็นเงื่อนไขแล้วเข้า Phase 2 พร้อม fix task คู่ขนานได้

## 4. ความพร้อม Metrics/Telemetry สำหรับ Phase 2

- `product/metrics.md` มี metric tree ครบ 6 หมวดตาม CLAUDE.md (Onboarding, Social, Economy, Progression, Places, Seasonality) พร้อม north star (validated walking minutes per week per active player) และ guardrail 12 ตัว (GR-1 ถึง GR-12) — ทุกตัวผูก event ที่มีชื่อจริงแล้วใน `product/telemetry-events.md`
- `product/telemetry-events.md` มี event ครบสำหรับ F04–F06 (Phase 2): `dungeon_confirm_shown`, `dungeon_entered`, `dungeon_exited`, `run_tick_granted`, `run_tick_denied`, `run_hp_low`, `run_auto_retreat`, `run_death`, `run_gps_status_changed`, `dungeon_report_submitted`, `onboarding_funnel_step`, `onboarding_first_reward_granted`, `onboarding_nearest_dungeon_distance`, `onboarding_empty_screen_shown`, `onboarding_empty_screen_abandoned`, `interest_registered_outside_area` — ชื่อ property และเงื่อนไขยิงระบุครบ ไม่มีพิกัดในทุก event (ตรวจแล้วใน `product/reviews/F01-product-gate.md` หัวข้อ 8) โปรแกรมเมอร์ต้อง emit ชื่อเหล่านี้ตรงตัวตาม protocol
- event ที่ยังรอระบบ (Phase 3–4: `party_formed`, `economy_gold_earned/spent`, `market_trade_completed`, `player_level_up`, `loot_rarity_received`) มีชื่อและ property กำหนดไว้ล่วงหน้าแล้ว ไม่ต้องออกแบบใหม่ตอนถึง F09–F12
- guardrail แบต (`battery_sample`) ระบุข้อจำกัดจริงไว้แล้ว: ใช้ได้เฉพาะ `platform=web_android` (iOS Safari ไม่มี Battery API) — ส่วน iOS ต้องพึ่งแบบฟอร์มเดินทดสอบแทนจนกว่าจะมี native wrap (F22)
- **สิ่งที่ต้องรอก่อนถือว่า "พร้อมสมบูรณ์":** GR-1 (บรรทัด 140) ยังไม่มีเลขเป้าสุดท้ายเพราะรอผล P1-F01-T11 (หัวข้อ 2.2) — เป็นงานเดียวที่ค้างอยู่ในเอกสาร metrics ก่อนเข้า Phase 2

## 5. ความเสี่ยงด้าน product ที่ยกยอดไป Phase 2 (เรียงตามผลกระทบต่อ north star)

1. **ผลสไปค์ยังไม่รู้เลย** (หัวข้อ 3) — ถ้า S3/S9/S12 ออกมา No-go จะกระทบ north star ตรงที่สุด (คนเดินจริงแต่ไม่ได้รางวัล หรือแบตหมดก่อนเล่นจบ) ต้องเผื่อเวลา buffer ก่อนเริ่ม F04 ถ้าผลออกมาไม่ดี
2. **GR-1 ยังไม่มีเลขเป้าสุดท้าย** จนกว่า T11 จะปิด — ผูกกับ backlog ของ product-manager เอง ต้องรีบแก้ทันทีที่ทราบผลย่าน มิฉะนั้น dashboard onboarding ของ Phase 2 จะเทียบกับเป้าที่ผิด
3. **Screen-lock หยุดนับ movement บนเว็บ v1** (`product/metrics.md` หัวข้อ 10.1) ขัดกับ pillar "มือถืออยู่ในกระเป๋าได้" โดยตรง — north star ของ Phase 1–2 (ก่อน F22 native wrap) **ห้ามใช้เทียบตรงๆ** กับตัวเลขหลังมี Wake Lock/Capacitor เพราะเงื่อนไขเทคนิคเปลี่ยน ไม่ใช่พฤติกรรมผู้เล่นเปลี่ยน — ต้อง annotate ทุกครั้งที่ทำ dashboard
4. **25 รายการสถานที่อ่อนไหวในย่านเปิดตัว** (หัวข้อ 2.3) ยังไม่ปิดกับ HUMAN — ต้องปิดก่อน F14 (สร้าง dungeon จริง) ไม่กระทบ Phase 1 close แต่กระทบจำนวน dungeon จริงที่ผู้เล่นจะเจอในย่านเปิดตัว
5. **อัตราส่วนรายได้ต่อค่ายา 2.45 (ต่ำกว่าเป้า 2.5 เล็กน้อย)** (D-005 ACCEPTED, D-038 PROPOSED รอ HUMAN) เป็นความเสี่ยงของ Phase 4 แต่ต้องเฝ้าไว้ตั้งแต่ตอนนี้เพราะเป็นเลขที่ผูกกับ balance ที่ F10/F11 จะสร้างทับ
6. **ส่วนต่างรางวัล full-role party ระหว่าง class กว้างมาก** (1.77×–9.14× ตาม sim-report ใน `product/metrics.md` GR-5/GR-7) โดยเฉพาะกลุ่มไม่มี Ranged มีโอกาสรอ Epic เกิน 30 วันถึง 17.7% — ตั้งไว้เป็น "เฝ้าดูหลัง beta" แล้ว ไม่บล็อก Phase 2 แต่เป็นความเสี่ยง churn ของ Progression ที่ต้องติดตามตั้งแต่ Phase 3

## 6. งาน HUMAN ที่ต้องปิดก่อน Phase 1 จบจริง (สรุปซ้ำจาก QA เพื่อความครบถ้วนของ product sign-off)

อ้างอิงเต็มจาก `qa/reports/phase-1-regression.md` §0/§11 — งานที่กระทบเกณฑ์ปิด phase ที่ product เกี่ยวข้องโดยตรง:

| งาน | บล็อกอะไรที่ product ต้องรู้ |
| --- | --- |
| P1-F01-T11 | Go/No-go coverage — คำแนะนำพร้อมแล้วในหัวข้อ 2 |
| P1-F02-T17–T20 | ต้องมี Cloudflare account + publish + **เดินทดสอบจริง** ก่อนถึงหัวข้อ 3 จะมีคำตอบ |
| P1-F02-T23 | Go/No-go spike — รอผล T20 ก่อน ไม่มีทางลัด |
| P1-F03-T26 | ยืนยัน world building — ไม่กระทบความพร้อมด้าน product/metrics |
| P1-F03-T28 | ยกยอดไป Phase 2 ได้ตาม A-P1-PLAN-02-4 — ไม่บล็อก sign-off นี้ |

## 7. Verdict

**verdict: SIGN-OFF (agent side)**

เหตุผล: เป้าหมาย Phase 1 ทั้ง 3 ข้อมีคำตอบเชิงเนื้อหาจาก agent ครบเท่าที่ทำได้ (เป้า 1 และ 3 ตอบจบแล้ว, เป้า 2 มีเครื่องมือและเกณฑ์พร้อม 100% รอเพียงข้อมูลสนาม) gate ที่ product เป็นเจ้าของหรือร่วมตรวจทั้งหมด (F01 product gate, F02 spike-criteria, F03 QA/design/copy/visual) เป็น PASS ไม่มี dark pattern ไม่มี IAP telemetry ครบชื่อสำหรับ Phase 2 คำแนะนำ Go ของ coverage มีตัวเลขรองรับครบและตรวจซ้ำอิสระแล้ว 2 รอบ (product gate + QA gate)

**ข้อจำกัดของ sign-off นี้:** ไม่ใช่การอนุมัติเข้าเงื่อนไข "ปิด Phase 1" ตาม roadmap เพราะเกณฑ์ปิด phase ("มีผล Go/No-go จาก F01+F02") เป็นสิทธิ์ตัดสินใจของ HUMAN เท่านั้น (P1-F01-T11, P1-F02-T23) เอกสารนี้เตรียมทุกอย่างให้ HUMAN ตัดสินได้ในรอบเดียวโดยไม่ต้องถามข้อมูลเพิ่ม ยกเว้นผลการเดินทดสอบจริงซึ่งไม่มีทางทดแทนได้

## REPORT
task: P1-CLOSE-PRODUCT
status: DONE
summary: เขียน product sign-off ของ Phase 1 ครบ 3 เป้าหมาย + คำแนะนำ Go สำหรับ coverage (2 ย่าน พระนคร/ปทุมวัน, ผลต่อ GR-1) + สถานะเกณฑ์ spike S1–S17 ทั้งหมดยังรอ field walk พร้อมตาราง No-go trigger + ความเสี่ยง product 6 ข้อยกไป Phase 2 verdict SIGN-OFF (agent side)
outputs:
  - product/reviews/phase-1-signoff.md — เอกสาร sign-off เต็ม (เป้าหมาย 3 ข้อ, คำแนะนำ coverage, สถานะ spike, ความพร้อม metrics/telemetry, ความเสี่ยง, verdict)
acceptance:
  - [x] แต่ละเป้าหมาย Phase 1 ระบุ met/pending/not met พร้อมหลักฐาน — หัวข้อ 1
  - [x] คำแนะนำ coverage สำหรับ P1-F01-T11 (Go, ย่านเปิดตัว, ผลต่อ GR-1 เมื่อ 2 vs 3 ย่าน) — หัวข้อ 2
  - [x] ระบุ S1–S17 ที่ agent ยืนยันได้กับที่ต้องรอ field walk และ No-go trigger — หัวข้อ 3
  - [x] ความพร้อม metrics/telemetry สำหรับ Phase 2 และความเสี่ยง product ที่ยกยอด — หัวข้อ 4, 5
  - [x] verdict SIGN-OFF (agent side) พร้อมเหตุผลและข้อจำกัด — หัวข้อ 7
assumptions:
  - A-P1-CLOSE-PRODUCT-1: "SIGN-OFF (agent side)" หมายถึงยืนยันว่างานฝั่ง product/agent ครบและ gate ที่เกี่ยวข้องผ่านหมดแล้ว ไม่ใช่การแทนที่การตัดสินใจ Go/No-go ของ HUMAN ที่ P1-F01-T11/P1-F02-T23 (ยึดตามขอบเขตเดียวกับที่ qa-tester ใช้ใน `qa/reports/phase-1-regression.md` — owner ที่ควรยืนยัน: producer)
  - A-P1-CLOSE-PRODUCT-2: คำแนะนำเลือกย่านเปิดตัว 2 ย่าน (ไม่ใช่ 3) เป็นความเห็นของ product-manager ที่ให้เหตุผลไว้ในหัวข้อ 2.2 ไม่ใช่การตัดสินใจสุดท้าย HUMAN ที่ P1-F01-T11 ยังเลือกเป็นอย่างอื่นได้ (owner ที่ควรยืนยัน: HUMAN)
handoffs:
  - to: qa-tester | need: เพิ่มบั๊กที่พบใน P1-H06 (ป้าย/ไอคอน dungeon ซ้ำกัน, severity high, ปิดแล้วโดย P1-X32/X33) เข้า `qa/bugs.md` ย้อนหลังเพื่อ hygiene ของบันทึก | why: `qa/bugs.md` ปัจจุบันระบุว่า "ไม่เคยมี severity high" ซึ่งไม่ตรงกับ `qa/reports/F02/map-style/P1-H06-screenshot-tests.md` | blocking: no
  - to: producer | need: นำหัวข้อ 2 และ 3 ของเอกสารนี้ไปแนบกับรายงานปิด Phase 1 ให้ HUMAN อ่านคู่กับ `qa/reports/phase-1-regression.md` | why: HUMAN ต้องตัดสิน P1-F01-T11/T23 โดยมีทั้งข้อมูลด้าน QA/tech และด้าน product ครบ | blocking: yes
  - to: HUMAN (ผ่าน producer) | need: ตัดสิน P1-F01-T11 (Go coverage, เลือก 2 หรือ 3 ย่าน) และทำ P1-F02-T17–T20 แล้วให้ tech-lead/product-manager ประเมินผลสไปค์ต่อที่ T21/T23 | why: เป็นเงื่อนไขเดียวที่เหลือให้ Phase 1 ปิดได้จริง | blocking: yes
decisions:
  - propose: เลือกย่านเปิดตัวรอบแรก 2 ย่าน (เขตพระนคร + เขตปทุมวัน) แทน 3 ย่าน เพื่อคง guardrail GR-1 ที่เข้มกว่า (≤5% แทน ≤15%) | authority: HUMAN (ที่ P1-F01-T11) | impact: ถ้ารับ เขตดินแดงเลื่อนเป็นย่านขยายรอบถัดไปแทนย่านเปิดตัว และ GR-1 ใน `product/metrics.md` ตั้งที่ ≤5%
questions_for_human:
  - ต้องการเปิดตัว 2 ย่าน (พระนคร+ปทุมวัน, guardrail เข้มกว่า) หรือ 3 ย่าน (รวมดินแดง, guardrail หลวมกว่าตามหัวข้อ 2.2) — ทั้งสองทางเข้าเงื่อนไข Go ของ PRD แล้ว ต่างกันที่ระดับความเสี่ยง onboarding ที่ยอมรับ | blocking: no (ไม่บล็อกการปิด Phase 1 เพราะ T11 ต้องการแค่ Go/No-go หลัก แต่บล็อกการ finalize เลข GR-1)
