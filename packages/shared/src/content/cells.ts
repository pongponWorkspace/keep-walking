/**
 * Display-cell counting for Thai copy (docs/tech/copy-schema.md section 4.1,
 * design/narrative/style-guide.md section 4.3). Pure and server-safe: no DOM, no Node.
 *
 * A "cell" is one horizontal slot on screen. Combining marks (Thai tone marks and
 * vowels that stack on the base consonant) and zero-width/format characters do not
 * take a slot of their own, so they are not counted. Everything else counts as 1,
 * including the independent vowel SARA AM (U+0E33) which occupies its own cell.
 *
 * Verified against Node 24 (2026-09-23, docs/tech/copy-schema.md section 4.1):
 * countCells("คุณตาย") === 5, and the real run.death / run.autoRetreat entries in
 * config/content/copy.th.json match the `cells` this module computes.
 */

/** Unicode General Category Mn (nonspacing mark), Me (enclosing mark), Cf (format). */
const NON_CELL_CODE_POINT = /^[\p{Mn}\p{Me}\p{Cf}]$/u;

function countLineCells(line: string): number {
  let count = 0;
  for (const codePoint of line) {
    if (!NON_CELL_CODE_POINT.test(codePoint)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Total display cells of `text`, per copy-schema 4.1: normalize to NFC, split on
 * `\n` (newlines are not counted as a cell), then sum the cells of every line.
 */
export function countCells(text: string): number {
  const normalized = text.normalize('NFC');
  let total = 0;
  for (const line of normalized.split('\n')) {
    total += countLineCells(line);
  }
  return total;
}

/** Display cells of each line of `text` (NFC-normalized), in order, split on `\n`. */
export function countCellsPerLine(text: string): readonly number[] {
  return text
    .normalize('NFC')
    .split('\n')
    .map((line) => countLineCells(line));
}
