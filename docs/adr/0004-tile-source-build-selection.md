# ADR 0004 — เลือก build ของ Protomaps ให้ tile build ไม่พังเมื่อ daily build เก่าถูกลบ

| หัวข้อ | ค่า |
| --- | --- |
| สถานะ | ACCEPTED (tech-lead, P2-H63, 2026-10-01) · ดูหัวข้อ 6 |
| วันที่ | 2026-10-01 |
| task | P2-X58 (ต่อจาก P2-X57) |
| ผู้เขียน | location-engineer · ไม่มี vendor ใหม่และไม่มีค่าใช้จ่าย (D-001, D-085) จึงไม่ต้องให้ HUMAN อนุมัติ |
| อ้างอิง | D-001, D-008, D-031, D-085 · tech note `docs/tech/F02-map-location-spike.md` หัวข้อ 5.1 (schema pin), 7.3 (fallback), F13 · `tools/tiles/README.md` หัวข้อ 2 |
| โค้ดที่ตามมา | `tools/tiles/bin/resolve-build.sh` (ใหม่) · `tools/tiles/bin/lib.sh` · `tools/tiles/bin/build.sh` · `tools/tiles/bin/assemble-lib.sh` · `tools/tiles/config.json#schema` · `tools/tiles/test/run.sh` |

## 0. สรุป

| เรื่อง | คำตัดสิน |
| --- | --- |
| ทางที่เลือก | **ทาง A**: เลือก build อัตโนมัติจาก `builds.json` · ใช้ `schema.buildKey` ถ้ายังอยู่และ version ตรง ไม่งั้นใช้ build ใหม่ที่สุดที่ metadata version = `schema.expectedMetadataVersion` |
| สิ่งที่ยังล้มเหมือนเดิม | metadata version ไม่ตรง `expectedMetadataVersion` (ตรวจสองชั้น: ใน `builds.json` ก่อน extract และใน archive หลัง extract) |
| สิ่งที่บันทึก | `manifest.json` → `build_key` และ `source_url` = build ที่ใช้จริง · `source_build` = pin, policy, resolution, `uploaded`, `size`, `b3sum` จาก upstream |
| ทำซ้ำ build เก่า | `TILES_BUILD_KEY=<build_key จาก manifest>` บังคับ policy `pinned` |
| fixture ที่ commit | ไม่เปลี่ยน · test อ่าน tileset id ของ fixture จาก manifest ของ fixture (P2-X57) |
| workflow | ไม่ต้องแก้ `.github/workflows/deploy-preview.yml` |

## 1. บริบท

- `tools/tiles/bin/build.sh` extract พื้นที่กรุงเทพฯ + ปริมณฑลจาก planet PMTiles ของ Protomaps ผ่าน HTTP range request (`pmtiles extract`) · เดิม URL ถูก pin ตายตัวใน `schema.sourceUrl`
- นโยบายของ Protomaps (docs.protomaps.com/basemaps/downloads ตรวจ 2026-10-01): เก็บ "All builds for the past week" และ "The latest build for each patch version" · ไม่แนะนำ hotlink และแนะนำให้ copy ไปเก็บเอง
- ผลจริง: build `20260923` ตอบ 404 แล้ว ทำให้ dry run ของ deploy-preview ล้ม · P2-X57 เลื่อน pin ไป `20260930` ซึ่งจะหายราว 2026-10-07 · ถ้าไม่แก้ ต้องมีคนเลื่อน pin ทุกสัปดาห์
- `https://build-metadata.protomaps.dev/builds.json` (ตรวจ 2026-10-01) มี 62 รายการ: daily 7 วันล่าสุด (`20260924`–`20260930`, version 4.15.2) + build เดียวต่อ patch version ย้อนไปถึง 2023 (เช่น `20260811` = 4.15.1, `20260722` = 4.15.0) · แต่ละรายการมี `key`, `version`, `uploaded`, `size`, `b3sum`
- ข้อสังเกตสำคัญ: "build ใหม่ที่สุดที่ version = 4.15.2" มีอยู่เสมอ · ตอน 4.15.2 ยังเป็น version ปัจจุบันก็คือ daily ล่าสุด · เมื่อ upstream ออก 4.15.3 build สุดท้ายของ 4.15.2 จะถูกเก็บถาวร
- ข้อจำกัด: ห้ามบริการคิดเงิน (D-001, D-085) · host ฟรีที่ใช้อยู่คือ Cloudflare Pages Free (เพดานไฟล์ละ 25 MiB, 20,000 ไฟล์ต่อ deploy) และ GitHub Pages เป็นทางสำรองชั่วคราว (D-008)
- archive ของพื้นที่เล่น z0–15 = 71,674,475 B (68.35 MiB) · extract ใหม่ผ่านเครือข่ายใช้เวลา build รวม 122 วิในเครื่อง (2026-10-01)

## 2. ทางเลือกที่พิจารณา

| ทาง | วิธี |
| --- | --- |
| A. เลือกอัตโนมัติจาก `builds.json` | อ่าน index ก่อน extract · ใช้ pin ถ้ายังอยู่และ version ตรง ไม่งั้นใช้ build ใหม่ที่สุดที่ version ตรง · probe ด้วย range request 127 B (ต้องได้ 206) |
| B. เก็บ archive สำเนาเองบน host ฟรีที่ใช้อยู่ | extract ครั้งเดียวแล้วเก็บ `pm4-<build>-z15.pmtiles` (68.35 MiB) ไว้เอง · build ต่อไปอ่านจากสำเนา |
| C. build เองด้วย planetiler | planetiler + profile ของ `protomaps/basemaps` ที่ `version()` = 4.15.2 จาก extract ประเทศไทยของ Geofabrik |

### 2.1 เทียบตามเกณฑ์

| เกณฑ์ | A. เลือกจาก `builds.json` | B. สำเนาเองบน host ฟรี | C. planetiler เอง |
| --- | --- | --- | --- |
| ไม่มีค่าใช้จ่าย (D-001, D-085) | ผ่าน · อ่าน endpoint สาธารณะ ไม่มีบัญชี ไม่มี credential | ผ่านแบบมีเงื่อนไข · Cloudflare Pages รับไฟล์ละไม่เกิน 25 MiB ใส่ archive 68.35 MiB ไม่ได้ ต้องแบ่งไฟล์ · GitHub Release asset (2 GiB) ต้องให้ workflow เขียน release ด้วย `GITHUB_TOKEN` และ GitHub Pages เป็นทางชั่วคราวตาม D-008 · R2 ห้ามใช้ (D-001) | ผ่าน · เครื่องมือเปิดและฟรี แต่ใช้เวลา runner ของ GitHub Actions มากขึ้น (repo private มีโควตานาทีฟรีจำกัด D-085) |
| reproducibility | ปานกลาง · ใช้ pin เดิมได้ภายใน 7 วัน หลังจากนั้นเลื่อนเป็น daily ล่าสุดที่ version เดียวกัน (ข้อมูล OSM เปลี่ยนรายวัน schema ไม่เปลี่ยน) · manifest บันทึก key, `b3sum`, `uploaded` ที่ใช้จริง · build ที่ทำซ้ำได้ถาวรคือ build ที่ Protomaps เก็บต่อ patch version | สูง · byte เดิมตลอดตราบที่สำเนายังอยู่ · แต่อัปเดต OSM ต้องทำเองเป็นรอบ | สูงถ้า pin วันที่ของ Geofabrik และ commit ของ profile · Geofabrik เก็บไฟล์ย้อนหลังแบบจำกัด จึงต้องเก็บ `.osm.pbf` เองด้วย (ปัญหาเดียวกับทาง B) |
| เวลา build ใน CI | เท่าเดิม + index ~20 KB และ probe 1–3 ครั้ง (ต่ำกว่า 2 วิ) · extract ใหม่ 122 วิ ในเครื่อง | เร็วกว่าเล็กน้อย (ดาวน์โหลดไฟล์เดียว) แต่ต้องมีขั้น upload สำเนาและขั้นแบ่งไฟล์เพิ่ม | ช้ากว่ามาก · ดาวน์โหลด Thailand extract ~327 MB + water polygons 906 MB + Natural Earth 434 MB (ตัวเลขจาก content-length 2026-10-01) · ต้องมี Java 21 และ RAM หลาย GB · ประเมินหลายสิบนาทีต่อรอบบน runner มาตรฐาน (ยังไม่ได้วัด) |
| ผลต่อ fixture ที่ commit | ไม่มี · fixture pin กับ build ของมันใน manifest ของตัวเอง (`20260923`) | ไม่มี | อาจมี · ถ้า rebuild fixture จาก planetiler byte จะต่างจาก build ของ Protomaps แม้ version ตรง (ต่าง OSM snapshot และค่า config) ต้อง re-baseline e2e และภาพหน้าจอ |
| งานดูแล | ต่ำ · เปลี่ยน `expectedMetadataVersion` เฉพาะตอนตั้งใจรับ schema ใหม่ | ปานกลาง · ต้องมีงานเลื่อนสำเนาและลบของเก่า และแก้ workflow (devops) | สูง · ดูแล toolchain, profile และ input หลายตัว |
| ความเสี่ยงที่เหลือ | build.protomaps.com หรือ index ใช้ไม่ได้ทั้งหมด (F13) · มีทางสำรองแบบ offline ในหัวข้อ 3.3 | ต้องมีคนดูแลสำเนา | ความต่างจาก style ที่ออกแบบไว้กับ build ของ Protomaps |

### 2.2 ผลที่เลือก: ทาง A

- แก้ต้นเหตุตรงจุด (pin ตายตัว) โดยไม่มีบริการใหม่ ไม่มี credential และไม่ต้องแก้ workflow · อยู่ใน `tools/tiles/` ทั้งหมด
- กฎความปลอดภัยของ schema ไม่อ่อนลง: build ที่ version ต่างจาก `expectedMetadataVersion` ไม่ถูกเลือก และ archive ที่ได้ยังถูกตรวจ version อีกชั้น (tech note 5.1)
- นโยบาย retention ของ Protomaps ทำให้ทาง A ไม่พังเมื่อ upstream ออก version ใหม่: build สุดท้ายของ version ที่ pin จะยังอยู่ถาวร
- B และ C เก็บไว้เป็นทางสำรองของ F13 (upstream ใช้ไม่ได้ทั้งหมด) · ไม่ทำตอนนี้เพราะ B ต้องแบ่งไฟล์และแก้ workflow ส่วน C ใช้เวลา CI มากและทำให้ fixture ต้อง re-baseline

## 3. การตัดสินใจ: รายละเอียด

### 3.1 config (`tools/tiles/config.json#schema`)

| key | ค่า | ความหมาย |
| --- | --- | --- |
| `buildKey` | `20260930` | build ที่อยากใช้ก่อน (เป็นค่าที่เลือกก่อน ไม่ใช่ pin ตายตัวแล้ว) |
| `expectedMetadataVersion` | `4.15.2` | pin ตัวจริงของ schema · เปลี่ยนเฉพาะหลังตรวจ style |
| `sourceUrlTemplate` | `https://build.protomaps.com/{build}.pmtiles` | แทน `sourceUrl` เดิม (ลบแล้ว เพื่อไม่ให้ pin อยู่สองที่) |
| `buildsIndexUrl` | `https://build-metadata.protomaps.dev/builds.json` | รายการ build ที่ยังอยู่ |
| `buildSelection` | `pinned-or-latest-matching` | หรือ `pinned` (แบบเดิม ล้มเมื่อ pin หาย) หรือ `latest-matching` |
| `probeCandidates` | `3` | จำนวน build สูงสุดที่ probe ก่อนยอมแพ้ |

### 3.2 ลำดับการเลือก (`bin/resolve-build.sh`)

1. `TILES_BUILD_KEY` ถูกตั้ง → policy `pinned` ด้วย key นั้น (ใช้ทำซ้ำ run เก่าจาก `manifest.json`)
2. อ่าน `builds.json` · กรองเฉพาะ key รูป `YYYYMMDD.pmtiles` · เรียงตาม `uploaded` ใหม่ไปเก่า
3. candidate = pin (ถ้าอยู่ใน index และ version ตรง) ตามด้วย build อื่นที่ version ตรง
4. ไม่มี candidate → exit 1 พร้อม version 5 ตัวล่าสุดที่มี · ถ้ามี version ใหม่กว่าใน upstream จะ log เป็น note เท่านั้น ไม่ล้ม
5. probe candidate ทีละตัว (range 0–126 ต้องได้ 206) · ตัวแรกที่ผ่านคือผลลัพธ์
6. เขียนผลลง `out/resolved-build.json` (git-ignored) และพิมพ์ JSON หนึ่งบรรทัด

### 3.3 offline

- index ใช้ไม่ได้ → ใช้ `out/resolved-build.json` ของ run ออนไลน์ครั้งล่าสุด (ถ้า version ตรง) · ไม่มีไฟล์นี้ก็ใช้ pin โดยไม่ตรวจ
- `build.sh` ยัง reuse archive ในเครื่องที่ชื่อตรงกับ tileset id และตรวจ version ของ archive ที่ reuse ด้วย (ใหม่ในงานนี้)

### 3.4 ผลต่อผู้ใช้ข้อมูล

- `tileset_id` = `pm4-<build ที่ใช้จริง>-z<maxzoom>` · client อ่าน id จาก `manifest.json` ของ run เดียวกัน (`infra/scripts/publish-client.sh`) จึงไม่ต้องแก้
- เมื่อ pin หาย ทุก run จะใช้ daily ล่าสุด ทำให้ tileset id เปลี่ยนรายวันได้ · URL ใหม่จึงไม่ชน cache เก่า แต่ preview จะ upload tile ชุดใหม่ทุกครั้งที่ build เปลี่ยน (ภายในงบ Pages Free เพราะทุก deploy เป็นชุดเต็มอยู่แล้ว) · ถ้าอยากให้คงที่ เลื่อน `buildKey` ตามรอบได้แต่ไม่บังคับ
- `build-fixture.sh`, `build-screen-fixtures.sh`, `estimate-area.sh` ใช้ตัวเลือก build เดียวกัน · fixture ที่ commit ไว้ไม่ได้ build ใหม่ในงานนี้

## 4. ผลที่ตามมา

- ข้อดี: deploy-preview ไม่ล้มเพราะ 404 ของ daily เก่า · ไม่มีงานเลื่อน pin รายสัปดาห์ · manifest บอก build ที่ใช้จริงพร้อม `b3sum` ของ upstream
- ข้อเสีย: build สอง run ห่างกันเกิน 7 วันอาจได้ OSM คนละวัน · ทำซ้ำ byte เดิมได้เฉพาะ build ที่ upstream ยังเก็บอยู่
- เปิดไว้: ถ้า build.protomaps.com ใช้ไม่ได้นานเกินรอบ deploy ให้เปิดงานใหม่สำหรับทาง B (devops) หรือ C · ไม่อยู่ในขอบเขตงานนี้

## 5. หลักฐาน (2026-10-01)

| กรณี | คาด | ผลจริง |
| --- | --- | --- |
| `build.sh` ด้วย config ของ repo | exit 0, resolution `pinned` | exit 0 · `build 20260930 (pinned, pin 20260930)` |
| `build.sh --force` ด้วย pin `20260923` ที่ถูกลบ | exit 0, ใช้ build ล่าสุดที่เป็น 4.15.2 | exit 0 · `pin 20260923 is missing` → `build 20260930 (latest-matching)` · extract ผ่านเครือข่าย 122 วิ |
| `build.sh` ด้วย `expectedMetadataVersion = 4.16.0` | ล้ม | exit 1 · `no build with metadata version 4.16.0` |
| `bash tools/tiles/test/run.sh` | ผ่านทั้งหมด | `89 passed, 0 failed, 0 skipped` (เดิม 71 + ใหม่ 18) |
| `git diff -- tools/tiles/fixtures` | ว่าง | ว่าง |

## 6. หมายเหตุผู้ตัดสิน (tech-lead, P2-H63, 2026-10-01)

คำตัดสิน: **ACCEPTED** ทาง A ตามหัวข้อ 3 โดยไม่มีเงื่อนไขเพิ่ม

| เกณฑ์ | ผล | หลักฐานที่ผู้ตัดสินตรวจเอง |
| --- | --- | --- |
| ไม่มีค่าใช้จ่าย (D-001, D-085) | ผ่าน | อ่านเฉพาะ `builds.json` และ `build.protomaps.com` แบบสาธารณะ ไม่มีบัญชี ไม่มี credential ไม่มี vendor ใหม่ · ไม่อยู่ในกลุ่มที่ต้องให้ HUMAN อนุมัติ |
| reproducibility | ผ่าน | `TILES_BUILD_KEY` บังคับ policy `pinned` (`resolve-build.sh` บรรทัด 51) · `manifest.json` บันทึก `build_key`, `source_url`, `source_build` พร้อม `b3sum` ของ upstream (`assemble-lib.sh` บรรทัด 83–97) · ข้อจำกัดที่รับไว้: ทำซ้ำ byte เดิมได้เฉพาะ build ที่ upstream ยังเก็บ (หัวข้อ 4) |
| ยังล้มเมื่อ metadata version ไม่ตรง | ผ่าน | ชั้นที่ 1 กรอง candidate ด้วย `expectedMetadataVersion` และ exit 1 เมื่อไม่มี (`resolve-build.sh` บรรทัด 90–103) · ชั้นที่ 2 `check_archive_version` ใน `lib.sh` บรรทัด 72–73 · ทาง offline ที่ใช้ pin โดยไม่ตรวจ index ยังผ่านชั้นที่ 2 |
| ผลต่อ fixture | ไม่มี | `git status --short tools/tiles/fixtures .github` ว่าง · workflow ไม่ถูกแก้ |
| test | ผ่าน | `bash tools/tiles/test/run.sh` → `89 passed, 0 failed, 0 skipped` (รันเอง) รวม 15 กรณีของ resolver, 2 กรณีของ archive version และ 1 กรณีของ manifest (ครบ 18 กรณีใหม่) |

ข้อสมมติจาก P2-X58:

- **A-P2-X58-1 ยืนยัน:** เมื่อ `buildKey` หายจาก index ทุก run เลือก daily ล่าสุดที่ version ตรง `tileset_id` จึงเปลี่ยนได้วันละครั้ง · รับได้เพราะ client อ่าน id จาก `manifest.json` ของ run เดียวกัน และทุก deploy ของ preview เป็นชุดเต็มอยู่แล้ว · ถ้าต้องการ id คงที่ช่วงทดสอบภาคสนาม ให้เลื่อน `buildKey` ก่อนรอบนั้น ไม่ต้องเปิด ADR ใหม่
- **A-P2-X58-2 ยืนยัน:** `builds.json` ที่ผู้ตัดสินดึงเอง (2026-10-01, 62 รายการ) มีหลาย build ต่อ version เฉพาะ 4.15.2 (7 daily `20260924`–`20260930`) ส่วน version ก่อนหน้ามีหนึ่ง build ต่อ patch version (เช่น 4.15.1 = `20260811`, 4.15.0 = `20260722`) ตรงกับนโยบายในหน้า downloads · นโยบายนี้เป็นของ upstream ไม่มีสัญญา ถ้าเปลี่ยนจะเข้า F13 ของ tech note (ทาง B หรือ C)

ข้อสังเกตที่ไม่บล็อก: ถ้า index ใช้ไม่ได้และไม่มี `out/resolved-build.json` ทาง `offline-pin` จะ extract ล้มเมื่อ pin ถูกลบแล้ว · ผลคือ build ล้มแบบชัดเจน ไม่ได้ tile ผิด schema จึงรับได้ภายใต้ F13

