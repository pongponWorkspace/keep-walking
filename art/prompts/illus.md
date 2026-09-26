# Illustration Prompts — GPS Dungeon กรุงเทพฯ

Task: P2-F05-T07 · เจ้าของ: artist-2d · สถานะ: ร่างสำหรับ HUMAN รันภายหลัง (ต้นทุนศูนย์) · วันที่: 2026-09-27
แหล่งอ้างอิง: `art/direction/briefs/P2-assets.md` §2.6, §3.6 · `art/direction/style-guide.md` §3.4, §6, §8, §10, §11 · `art/direction/asset-pipeline.md` §4.6, §9.2

## วิธีใช้เอกสารนี้

- ภาพที่ได้จาก prompt นี้เป็นภาพอ้างอิงที่จะ remap สีให้ตรง token แล้วส่งเป็น `illus.*` (PNG/WebP) ตาม asset-pipeline §4.6 · จนกว่าจะรัน entry ใน manifest อยู่ที่ `status: "prompt-only"` (`files: []`)
- Loop ของ Phase 2 **ใช้งานได้ครบโดยไม่มีไฟล์นี้**: overlay speed lock ใช้ `icon.ui.speed-lock` ที่ 48 px แทนได้ (P2-assets.md §2.6, ลำดับ P2) จึงไม่บล็อกงานอื่น
- การรันเครื่องมือสร้างภาพเป็นงานของ **HUMAN** เท่านั้น (ต้องใช้บัญชี ตาม asset-pipeline §4.6) · ก่อนรัน ให้ยืนยันว่าเงื่อนไขการใช้ของเครื่องมือ (แผนฟรี) อนุญาตให้เผยแพร่ภาพใน repo public และใช้ในเกมที่มีรายได้ (D-001, asset-pipeline §9.1–9.2) · ถ้าไม่แน่ใจ เก็บภาพไว้ใน `art/ref/` เท่านั้น (`shipped: false`)
- ห้ามใช้รูปคนจริงเป็น input ห้าม prompt ที่อ้างชื่อศิลปิน ชื่อคนจริง หรือชื่อแบรนด์ · ห้ามป้ายทะเบียน ไซเรน ตำรวจ ยูนิฟอร์มขนส่งจริง (K1/K8 ของ brief, style guide §8.2)
- บันทึกทุกครั้งที่รัน: เครื่องมือ + เวอร์ชัน, วันที่, prompt ฉบับที่ใช้จริง (ถ้าแก้ไข ให้เพิ่มฉบับใหม่ต่อท้ายไฟล์นี้ ห้ามแก้ย้อนหลัง) ลงใน `source.tool` และ `source.date` ของ manifest entry `illus.state.speed-lock`

## #speed-lock — `illus.state.speed-lock` (240 × 160, overlay speed lock, P2 ไม่บังคับ)

```
Cute 2D isometric illustration, dimetric 2:1, a chibi city walker sitting on a
generic bus seat looking out of the window, calm and a bit bored, the bus is a
plain rounded box in neutral grey #9999AA #555566 #333344 with a white window,
thick uniform outline #1A1A22, flat cel shading 3 tones, light from top-left,
no text, no numbers, no route signs, no logos, no operator colours, not scary.
Palette: #1A1A22 #333344 #555566 #9999AA #DDDDEE #FFF8EE #FFFFFF #FFCC00.
Negative: police, siren, traffic sign, brand, bus company livery, readable text,
temple, crown, flag, uniform, gradient, 3D render, voxel, realistic person,
celebrity likeness, license plate text, real transit operator colours.
```

- Canvas: generate ที่ความละเอียดสูงกว่าแล้วย่อลงมาที่ 240 × 160 px (`illus` SVG/raster ตาม asset-pipeline §3.3/§4.6) พื้นหลังโปร่งใส
- ใช้แทนที่: วางกึ่งกลาง `L-overlay` เหนือข้อความ speed lock ตาม brief §2.6 · ถ้าไม่ได้รัน โค้ดแสดง `icon.ui.speed-lock` 48 px แทนได้ครบ ไม่เสีย loop
