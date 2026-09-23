สถานะ: COMPLETE — AGENT SIDE, WAITING FOR HUMAN

# Phase 1 Close Report — Pre-production และพิสูจน์ความเสี่ยง

เจ้าของ: producer (P1-CLOSE-PM) · วันที่: 2026-09-24 · อ้างอิง: `studio/phases/phase-1/board.md` (rev 6), `studio/phases/phase-1/ledger.md`, `qa/reports/phase-1-regression.md` (P1-CLOSE-QA รอบ 1), รายงาน gate ทุกฉบับ, `studio/decisions/decision-log.md` (D-001..D-080), `studio/questions/open-questions.md`

## 1. สรุป
- งาน agent ที่ไม่ขึ้นกับคนเสร็จหมด: lint, typecheck, test 927 ผ่าน (2 skip โดยเจตนา), build, e2e 30/30, trace/vector `--check`, tiles test 39/39, gitleaks ทั้ง history, forbidden-file guard เขียวทั้งหมด · bug ปิด 3/3 ไม่เคยมี severity ≥ high · ทุก gate PASS ในรอบล่าสุด
- คำถามหลักของ phase: (1) coverage **แนะนำ Go** (พระนคร + ปทุมวัน) รอคนยืนยัน (2) map/location spike **ยังไม่มีผล** รอเดินทดสอบจริง (3) ทุก role มีเอกสารทิศทางที่ผ่าน gate แล้ว
- เหลือ HUMAN 9 งาน และงาน agent 3 งานที่รอผลเดินทดสอบ (P1-F02-T21, P1-F02-T24, P1-CLOSE-QA รอบ 2)
- board: 111 task · DONE 97 · TODO 3 (รอ P1-F02-T20 ทั้งหมด) · HUMAN 9 · CUT 2 (P1-F02-T22 ตาม D-008, P1-F02-T25 ใน P1-CLOSE-PM)

## 2. เกิดอะไรขึ้นระหว่าง run
- วางแผน 2026-09-23 17:13 → board rev 4 เวลา 18:17 (plan review 3 ฉบับ NEEDS_CHANGES ทั้งหมด, คนตอบ D-001..D-010) · run 1 เริ่ม 18:12 · P1-CLOSE-QA รอบ 1 จบ 2026-09-24 03:03 · ledger ของ run 106 รายการ
- **ติด usage limit 20:30–22:40:** API session limit หยุด 6 agent ของ W7 กลางงาน (P1-X08, P1-F02-T13, P1-X07, P1-F03-T21, P1-F02-T11, P1-F03-T13) · orchestrator ส่งงานใหม่ทั้ง 6 พร้อม resume เวลา 22:42 · ทุกงานจบ DONE/PASS โดยไม่ต้องส่งซ้ำอีก
- **2 งานถูก mark IN_PROGRESS โดยไม่เคย dispatch:** P1-X04 (mark 19:38 → orchestrator แก้กลับเป็น TODO แล้ว dispatch 20:10) และ P1-F03-T14 (mark 23:01 → dispatch จริง 01:50) · orchestrator ตรวจพบเองและบันทึกใน ledger · บทเรียน Phase 2: mark IN_PROGRESS พร้อมการ dispatch เท่านั้น และทวนทุก IN_PROGRESS ตอนเริ่มแต่ละ wave
- งาน handoff/fix H01–H08 และ X01–X37 (ไม่มี X14) รวม 44 งาน DONE ครบ · gate ที่ต้องรอบ 2: F01 design, F03 copy, F03 visual, F03 design A
- ข้อค้นพบระหว่าง run: แผนที่จริงจอดำ (P1-X23 ตั้ง worker URL, D-068) · ป้าย dungeon ซ้ำเมื่อ polygon คร่อม tile (P1-X32/X33, D-075) · ช่องโหว่ pipeline 2 ข้อ: ศาสนสถานในรูของ attraction, way ไม่ปิดถูกทิ้งเงียบ (P1-X08, D-066)

## 3. ผลต่อ feature

### F01 — Coverage Survey
- ส่งมอบ: `tools/coverage/{METHOD.md,pipeline/,analysis/,README.md}` · `data/coverage/{candidates.geojson (741),excluded.geojson (6,287 ชิ้น, 4.08 MB),district-counts.csv,heatmap/,points-unmatched.geojson,LICENSE-DATA.md}` · `design/levels/{dungeon-rules.md,launch-criteria.md,coverage-report.md}` · `product/prd/F01-coverage-survey.md` · `qa/plans/F01-test-plan.md`
- ตัวเลข (OSM 2026-09-01, WorldPop R2025A, ระยะเดินจาก routing จริง route factor ค่ากลาง 1.446): **730 dungeon ใช้ได้** (741 − 11 รอคนตัดสิน) · มี dungeon **76 จาก 79 เขต/อำเภอ** (ไม่มี: ป้อมปราบศัตรูพ่าย, บางบ่อ, ดอนตูม) · เขียว 10.6% เหลือง 55.3% แดง 34.1%
- **คำแนะนำ Go:** พระนคร (0.8886, เขียว 81.7%, 20 แห่ง) + ปทุมวัน (0.8258, 72.0%, 23 แห่ง) ผ่าน G1–G4 · **ดินแดงมีเงื่อนไข** (0.8143, เขียว 37.1% ตก G1 แต่ผ่าน S1–S3 = Go พร้อมทางเสริม) · ไม่เข้า No-go
- กรณีแย่สุดหลังตัดสถานที่อ่อนไหว: พระนคร 10–13 แห่ง (ตัดทุกรายการ G2 ผ่านพอดีที่ 10, G1 อาจราว 55%) · ปทุมวัน 19 · กติกาล่วงหน้าถ้าตกอยู่ใน D-074
- SHA-256 ข้อมูล 4 ไฟล์ตรงกันระหว่าง QA gate กับ regression
- Gate: QA `qa/reports/F01-qa-gate.md` PASS (นับซ้ำ 730 ตรง, bug 3 ข้อปิดใน P1-X29/X31) · Design `design/reviews/F01-design-gate.md` รอบ 1 NEEDS_CHANGES (สถานที่อ่อนไหวพระนครไม่ครบ, หัวลำโพง, การเข้าถึงไม่แน่นอน) → P1-X30 → รอบ 2 PASS พร้อมเงื่อนไขถ้อยคำ C-1 · Product `product/reviews/F01-product-gate.md` PASS · HUMAN P1-F01-T11 ยังไม่ทำ

### F02 — Tech Foundation และ Map/Location Spike
- ส่งมอบ: `docs/adr/0001-repo-layout.md` (แก้ 2 ครั้ง), `docs/adr/0002-backend-stack.md` (Accepted: Cloudflare Free Workers + DO SQLite + D1 + Pages ตาม D-008), `docs/tech/{F02-map-location-spike.md,gps-trace-format.md,copy-schema.md,environments.md}` · `packages/location/` (Web/Mock/Capacitor stub), `packages/shared/` (trace schema, content types) · `data/gps-traces/synthetic/` (13 trace) + `tools/traces/` · `tools/tiles/` + `tools/tiles/size-report.md` · `apps/client/` (Vite + MapLibre 6.10 + PMTiles, HUD วัด FPS/แบต/data/accuracy + export CSV, source ป้าย dungeon) · `.github/workflows/{ci.yml,deploy-preview.yml}`, `.gitleaks.toml`, `.env.example`, `infra/` + `infra/runbooks/preview-setup.md` · `qa/plans/F02-test-plan.md`, `qa/tests/F02/`, `qa/playtest/{field-walk-kit.md,field-walk-form.md,safety-briefing.md}` · `data/map/{playarea-mask.geojson (22.9 KB),provinces.geojson (259.8 KB)}`
- ตัวเลข: **spike build พร้อม HUD** ทำงานบน android-chrome และ ios-safari (e2e) · **tile budget ผ่าน:** XYZ 13,502 ไฟล์ (เป้า ≤ 15,000, 90%) · deploy รวม 14,283 ไฟล์ (เพดาน 20,000) · ไฟล์ใหญ่สุด 300,539 B (เพดาน 25 MiB) · deploy 114.75 MiB · PMTiles 68.28 MiB ไม่ขึ้น Pages · **tests 927 ผ่าน / e2e 30 ผ่าน** · bundle ตอนเปิด main + worker ≈ 1.70 MB decoded (S5 "Go พร้อมเงื่อนไข") หรือ ≈ 0.46 MB ถ้าบีบอัด (Go) → ตัดสินจากสนาม
- Gate: Tech `docs/reviews/F02-tech-gate.md` PASS (F-01 gitleaks false positive แก้ใน P1-X26 ไม่ต้องรันซ้ำ) · QA `qa/reports/F02-qa-gate.md` PASS · เกณฑ์ spike `product/reviews/F02-spike-criteria.md` PASS · ผล spike (T21) และ Go/No-go (HUMAN T23) รอเดินทดสอบ

### F03 — Game Bible และทิศทางทุกสาย
- ส่งมอบ: `design/pillars.md` · `design/narrative/{world.md,style-guide.md}` · `config/content/{names.th.json,copy.th.json,copy-rules.json}` · `design/systems/{balance-model.md,sim-report.md,test-vectors/}` + `config/balance/*.json` + `config/app/` · `tools/sim/` · `tools/copy-lint/` · `design/levels/presets.md` + `data/dungeons/presets.json` · `art/direction/{style-guide.md,icon-grammar.md,avatar-spec.md,asset-pipeline.md,map-style.md,map-style/kw-light.style.json}` · `art/assets/avatar/` (12 SVG), `art/src/avatar/`, `art/ref/style-tile/`, `art/assets/manifest.json` · `design/ux/{ia.md,flows/F03-core-loop.md,wireframes/,tokens.json,components.md}` · `audio/{direction.md,cue-list.md}` · `art/vfx/specs/motion-direction.md` · `product/{metrics.md,telemetry-events.md}` · `ops/{calendar.md,tuning-playbook.md}`
- ตัวเลข: **simulator ตรงตาราง GDD** (Tanker 1–4 คน = 21.7/33.0/38.8/41.8% ตรงเป๊ะ, 248 vectors, `gen-vectors --check` ผ่าน) · copy 225+ key ผ่าน lint (0 FAIL, 10 WARN ตาม D-058) · contrast 295/295 · ตาบอดสี PASS · map style 40 screenshots
- Gate: copy `design/reviews/F03-copy-gate.md` รอบ 1 NEEDS_CHANGES → รอบ 2 PASS · visual `art/reviews/F03-visual-gate.md` รอบ 1 NEEDS_CHANGES (motion วน, สีนอก token, แสงอวตาร) → รอบ 2 PASS · QA simulator `qa/reports/F03-qa-gate.md` PASS · design A `design/reviews/F03-design-gate-a.md` รอบ 1 NEEDS_CHANGES (6 blocking) → รอบ 2 PASS · design B `design/reviews/F03-design-gate-b.md` PASS

## 4. Phase Exit Checklist (จาก `qa/reports/phase-1-regression.md` §7)
| # | เกณฑ์ | สถานะ | หลักฐาน |
| --- | --- | --- | --- |
| E1 | polygon ใช้ได้รายเขต | PASS | `data/coverage/district-counts.csv`, F01 QA gate (730, 0 mismatch) |
| E2 | 2–3 ย่านเปิดตัว | PASS | `design/levels/coverage-report.md`, product gate F01 |
| E3 | คำแนะนำ Go พร้อมตัวเลข | PASS | coverage-report เทียบ PRD F01 |
| E4 | HUMAN ยืนยัน Go/No-go coverage | PENDING-HUMAN | P1-F01-T11 |
| E5 | test ผ่านใน CI | PASS (local) / PENDING-HUMAN | regression §1 · run บน GitHub รอ P1-F02-T26 |
| E6 | mock trace เล่นซ้ำ จุดขยับ | PASS | `qa/tests/F02/`, e2e `location-mock.spec.ts` |
| E7 | build deploy ได้ local/preview | PASS (local) / PENDING-HUMAN | `pnpm build` · preview รอ P1-F02-T19 |
| E8 | คู่มือเดินทดสอบ | PASS | `qa/playtest/` 3 ไฟล์ |
| E9 | HUMAN Cloudflare Free + publish | PENDING-HUMAN | P1-F02-T17, T19 |
| E10 | HUMAN เดินทดสอบ 30+30 นาที | PENDING-HUMAN | P1-F02-T20 |
| E11 | ถอดออกตาม D-009 | ไม่ใช่เกณฑ์ปิด | — |
| E12 | simulator ตรงตาราง GDD | PASS | `qa/reports/F03-qa-gate.md` |
| E13 | copy ผ่านกฎ 6 ข้อ | PASS | copy gate รอบ 2 + `lint:copy` exit 0 |
| E14 | ทุก role มีเอกสารทิศทางที่ผ่าน gate | PASS | ตาราง role ใน board §4 F03 + gate ทั้งหมด |
| E15 | HUMAN ยืนยัน world building | PENDING-HUMAN | P1-F03-T26 |
| E16 | ผล Go/No-go F01 + F02 | PENDING-HUMAN | P1-F01-T11, P1-F02-T23 (รอ T21 ← T20) |
| E17 | ถ้า No-go มีข้อเสนอปรับ design | PENDING-HUMAN | ขึ้นกับ E16 |
| E18 | ทุก task DONE/CUT + gate PASS | PASS (agent) / PENDING-HUMAN | regression §5–6 |
| E19 | พิกัดคนเดินไม่อยู่ใน git | PASS | regression §3 · ตรวจซ้ำหลัง T20/T24 ก่อน T26 |
| E20 | ไม่มี secret/ไฟล์ต้องห้าม, ไม่ผูกบัตร | PASS (agent) / PENDING-HUMAN | gitleaks + guard สะอาด · Billing + CI บน GitHub รอ P1-F02-T26 |

## 5. งาน HUMAN ที่ค้าง (ทำตามลำดับนี้)
ก่อนเริ่ม: ตอบ Q-P1-12 (git identity ใน repo public, ค่าปัจจุบัน `keep-walking studio <pongponWorkspace@users.noreply.github.com>`) เพราะ push แรกจะเผยแพร่ history ทั้งหมด
1. **P1-F02-T18 push ครั้งแรก** — อ่านทวนว่าเปิดเผย GDD/`studio/`/`design/` ได้, เปิด Secret scanning + Push protection, `git push -u origin main` ไป `pongponWorkspace/keep-walking`, ส่ง URL ของ CI run → ปลด T19
2. **P1-F02-T17 Cloudflare Free** — สมัครโดยไม่ใส่บัตร, สร้าง Pages project `keep-walking-preview`, API token สิทธิ์ Pages Edit, เก็บเป็น GitHub secret `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` (ขั้นตอนใน board และ `infra/runbooks/preview-setup.md`) → ปลด T19
3. **P1-F02-T19 deploy preview** — push commit ล่าสุด, รัน workflow `deploy-preview` แบบ dry-run แล้วรันจริง, curl ตรวจ tile ได้ `200` + CORS, เปิดบนมือถือ, ส่ง URL → ปลด T20, E7, E9
4. **P1-F02-T20 เดินทดสอบ** — กลางแดด 30 นาทีในสวน + 30 นาทีในซอย บน **Android (Chrome) และ iPhone (Safari)**, กรอกฟอร์ม + summary (ไม่มีพิกัด), raw trace เป็น opt-in ใน `raw/` เท่านั้น · **ถ่ายภาพจอกลางแดดตาม visual gate V-17** (S1, S3, S4 ช่วง 12:00–15:00 ความสว่าง 100% แปลงขาวดำ) · บน iPhone จดว่าสั่นได้หรือไม่ และจอล็อก/Wake Lock เป็นอย่างไร → ปลด E10, T21, T24
5. agent ทำต่อทันที: **P1-F02-T21** (tech-lead สรุปผล spike + คำแนะนำ Go/No-go) · **P1-F02-T24** (location-engineer แปลง recorded trace เฉพาะเมื่อยินยอม ไม่ยินยอม = CUT) · **P1-CLOSE-QA รอบ 2**
6. **P1-F02-T23 Go/No-go ของ map spike** — อ่าน `docs/tech/F02-spike-results.md` แล้วตอบ Go / Go พร้อมเงื่อนไข / No-go → ปลด E16
7. **P1-F01-T11 Go/No-go ของ coverage (ทำได้ตอนนี้ ไม่ต้องรอข้อ 1–6)** — อ่านหัวข้อ 0 ของ `design/levels/coverage-report.md`, ตอบ Go/ทางเสริม/No-go, ยืนยันย่านเปิดตัว, **ตัดสินสถานที่อ่อนไหว 25 รายการ** (หัวข้อ 6 และ 9) รวม D-048, D-070, D-073, D-074 (Q-P1-20, Q-P1-27, Q-P1-28) → ปลด E4, E16
8. **P1-F02-T26 push รอบสุดท้าย + CI** — หลัง T24 และ CLOSE-QA รอบ 2, `git push`, ส่ง URL ของ run สีเขียว (รวม secret scan), ยืนยันว่าหน้า Billing ของ GitHub และ Cloudflare ไม่มีบัตร → ปลด E5, E20
9. **P1-F03-T26 ยืนยัน world และ pillars (ทำได้ตอนนี้)** — ตอบธง H-01..H-13 ใน `design/narrative/world.md` (รวม D-011..D-014, Q-P1-11, Q-P1-21, Q-P1-22) และยืนยัน `design/pillars.md` (D-016) พร้อมทิศทางภาพ (D-025, Q-P1-15) → ปลด E15
10. **P1-F03-T28 อนุมัติแก้ถ้อยคำ GDD** — D-004/D-005/D-006, D-015, D-020, D-021, D-022, D-030, D-038, D-080 · **ยกไป board Phase 2 ได้ตาม A-P1-PLAN-02-4** แต่ต้องปิดก่อน Phase 3

## 6. Decisions
PROPOSED ที่รอคน (authority = HUMAN)
- world/narrative: D-011 ("หน่วยงานที่เกี่ยวข้อง"), D-012 (มอนสเตอร์ดีไซน์ใหม่), D-013 (ชื่อพระราชทาน), D-014 (คำหยาบ), D-023 (ข้อความ legal ยาวได้) → P1-F03-T26
- pillars และภาพ: D-016, D-025 → P1-F03-T26
- GDD/balance: D-015, D-020 (45 นาที = ถึง auto-retreat, solo non-Tanker 27.8 นาที · game-director แนะนำรับ), D-021, D-022 (ถ้อยคำ), D-030, D-038 (อัตราส่วนรายได้/ยา · game-director แนะนำทาง B), D-080 (เพดานตีบวก +15) → P1-F03-T28
- coverage: D-048, D-070, D-073, D-074 → P1-F01-T11
- ค่าใช้จ่าย: D-036 (Workers Paid ก่อน Phase 6/7) ไม่ต้องตัดสินตอนนี้
- PROPOSED ที่ tech-lead ตัดสินได้ (เสนอให้ปิดตอนวาง Phase 2): D-054, D-057, D-075

Decisions ระหว่าง run (ACCEPTED): cost/infra D-001, D-002, D-007, D-008 (Cloudflare Free), D-031 (tile XYZ บน Pages), D-034/D-035 (position_log, WebSocket), D-036 เงื่อนไข · repo/process D-017, D-018, D-019, D-071 · balance D-004, D-005, D-029 (hitChance 54), D-039, D-059 (รางวัลปิดฉุกเฉิน), D-061 (แก้แล้ว), D-078 (ลำดับผลต่อ hit), D-079 (farDungeonThreshold ≤ 1,970) · coverage D-006, D-026..D-028, D-047, D-049, D-053, D-066, D-069, D-072 · UX/loop D-040, D-041, D-063 (Wake Lock + pocket screen), D-064 (นอกพื้นที่ = mask), D-065/D-067 (ร้านปากซอย) · art/audio D-052 (ไม่มี BGM), D-055, D-056, D-076/D-077 (ไม่มี motion วน) · tech D-032, D-033, D-037/D-043, D-044, D-046, D-060, D-062, D-068 · copy D-042, D-045, D-050, D-051, D-058

## 7. Assumptions ที่ยังไม่ยืนยัน
- คำถามคนที่ยังใช้ assumption อยู่: Q-P1-12 git identity (คงไว้) · Q-P1-13 solo survival (รอ D-020) · Q-P1-14 legal (ยกเว้น + บรรทัดสรุป) · Q-P1-16 ODbL (OSM เป็นข้อมูลอ้างอิง ต้องตัดสินก่อนนำ polygon เข้าเกม) · Q-P1-17 (ทาง A) · Q-P1-18 ผู้ปกครองอายุ 15–19 (ต้องถามทนายก่อน Phase 7) · Q-P1-19 ลบ log เมื่อถอน consent (รอบ 24 ชม.) · Q-P1-23 license งานศิลป์ (สงวนสิทธิ์ชั่วคราว) · Q-P1-24 (SVG อย่างเดียว) · Q-P1-25/26 attribution WorldPop · Q-P1-29 (+15)
- A-P1-F01-T06-2/-4/-7: รอ product-manager ยืนยัน
- A-P1-CLOSE-QA-1 (ใช้ SHA ยืนยันแทนการรัน pipeline เต็มเมื่อ tree สะอาด): producer ยอมรับ · A-P1-CLOSE-QA-2: ยอมรับแล้วโดยการ CUT P1-F02-T25

## 8. ความเสี่ยงที่ยกไป Phase 2
(ยังไม่มี `studio/risks.md` ต้องสร้างตอนวาง Phase 2 จาก GDD "ความเสี่ยงที่ต้องเฝ้าดู" รวมรายการนี้)
- **iOS web สั่นไม่ได้** (`navigator.vibrate` ไม่มีบน WebKit) → "สั่นก่อนเสียง" ใช้ได้แค่ Android · tech-lead ทำ matrix + fallback, ยืนยันด้วย T20
- **Wake Lock และจอล็อก:** D-063 พึ่ง Screen Wake Lock + pocket screen · ยังไม่พิสูจน์บน iOS/Android จริง · ถ้าจอล็อกแล้ว GPS บนเว็บหยุด movement gate จะหาย · F-17 ต้องทดสอบก่อนสเปก F05
- **เพดาน free tier ก่อน raid:** rows written ของ D1/DO, request · ต้อง batch tick (ไม่เขียน row แยก), alert 50/70%, runbook โควตาเต็ม · D-036 ก่อน Phase 6
- **bundle S5:** 1.70 MB decoded · ถ้า T20 วัดแบบ transfer เกิน 1.0 MB ต้อง code-split maplibre และตั้งงบใน CI (F-06)
- **speed lock จับคนเดินผิด:** jitter ในซอยให้ 23.2–24.3 km/h ใกล้เพดาน 25 → ต้องใช้ความเร็วแบบกรอง + กฎปลดเมื่อรถติดไฟแดง
- **คนเล่นคนเดียวอยู่รอดสั้น (D-020):** non-Tanker ราว 28 นาทีแทน 45 และได้ของ ×0.6 · กระทบ 10 นาทีแรก
- **economy (D-038):** อัตราส่วนรายได้/ยาของคนเล่นคนเดียว 1.3–4.5 ตาม build · ต้องตัดสินก่อน F05/F11
- coverage: พระนครอาจเหลือ G2 = 10 พอดีหลังตัดสถานที่อ่อนไหว · accuracy GPS ในซอยยังไม่รู้จนกว่า T20
- กฎหมาย: ODbL (Q-P1-16), ผู้ปกครอง 15–19 (Q-P1-18)

## 9. งานที่ยกไป Phase 2 (สรุป · รายการเต็มใน board หัวข้อ 1 "งานที่ยกไปให้การวางแผน Phase 2")
- systems: farDungeonThreshold_m ≤ 1,970 (เสนอ 1,900), dungeons.safety ตาม D-061, R-B1 ใน balance model, partyMult cap, คำราชาศัพท์ใน reviewNamePatterns · ขยาย tuning playbook
- tech-lead/gameplay: port `tools/sim/src/formulas.ts` เข้า `packages/shared` ผ่านทุก vector · `packages/geo` (R ของ haversine 6,371,008.8 ม., นิยามหน้าต่าง gate, speed lock แบบกรอง) · เลิก bundle config ทั้งไฟล์ (F-04), ย้าย gate ไป shared (F-05b), code-split (F-06), ค่าคงที่ UI เข้า config (F-08) · ต่อ `setDungeonsSourceData` ใน F04 · tools/art + validator ใน CI, vendor font · config loader ตรวจ raid schedule · Wake Lock/vibrate matrix (F-17)
- location: รัน analysis ซ้ำหลัง T11 (D-069, reviewOsmIds), fixture S2/S5, ลบ LegacyWebLocationTiming (F-05a), excluded ≤ 4.5 MB
- uiux: N-3 บทเรียน pocket screen ใน run แรก, ia.md S-22, V-15/V-16/V-20/V-22 ก่อน F04 · art V-18/V-19, F-AD-1..4 · vfx V-21 และ module motion · sound build `audio/src/` · qa e2e TC-MAP-05/08, TC-HUD-03..12, ถ่าย S1/S3/S6 ใหม่
- PM: telemetry/metrics B-06/B-07, F-16, key จริงใน telemetry-events.md · PRD F04–F06 ครอบผู้เล่น 3 กลุ่ม · game-director B-08 pillars 7.1
- liveops: raid playbook และ runbooks · HUMAN: ทวนข้อความ legal/PDPA ก่อน closed beta · P1-F03-T28 ถ้ายังเปิด

## 10. Phase 2 ควรวางอะไรก่อน
1. ถ้า Phase 1 ยังไม่ปิด ห้ามเริ่ม Phase 2 เต็ม แต่วาง spec ขนานได้ · ย้าย P1-F03-T28 เป็นงาน HUMAN บน board Phase 2 ถ้ายังเปิด
2. ผล P1-F01-T11 → ย่านนำร่องของ F04 + รัน analysis ซ้ำเป็นงานแรกของ location-engineer
3. `packages/shared` (port simulator) + `packages/geo` (gate window, haversine, speed lock แบบกรอง) เป็นฐานของ F05 ก่อนโค้ด gameplay
4. ตัดสิน D-020 และ D-038 ก่อนสเปก F05/F06 (ถ้าคนยังไม่ตอบ ใช้คำแนะนำ game-director เป็น assumption)
5. ผล T20 → งาน Wake Lock/pocket screen/vibrate (F-17) และงบ bundle (F-06) ก่อน flow run ของ F04–F06
6. แก้ UX/visual ที่ระบุว่า "ก่อน F04" (N-3, V-20, V-22, V-15, V-16) ใน wave แรก
7. สร้าง `studio/risks.md`

## 11. Product sign-off
ดู `product/reviews/phase-1-signoff.md` (P1-CLOSE-PRODUCT)
