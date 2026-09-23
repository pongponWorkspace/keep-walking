/**
 * Reads config/content/names.th.json for S2 and S13 (docs/tech/copy-schema.md section 1:
 * "lint ไม่บังคับโครงสร้าง ใช้ทุก string ที่เป็นใบ (leaf) โดยข้าม key ที่ขึ้นต้นด้วย _").
 */

/** Every leaf string value in `file`, skipping any key (at any depth) that starts with `_`. */
export function nameLeafStrings(file: unknown): readonly string[] {
  const values: string[] = [];
  collect(file, values);
  return values;
}

function collect(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collect(item, out);
    }
    return;
  }
  if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_')) {
        continue;
      }
      collect(value, out);
    }
  }
}
