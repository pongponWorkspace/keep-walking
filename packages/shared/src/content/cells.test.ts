import { describe, expect, it } from 'vitest';
import { countCells, countCellsPerLine } from '../index';

describe('countCells', () => {
  it('matches the reference count from copy-schema 4.1', () => {
    expect(countCells('คุณตาย')).toBe(5);
  });

  it('does not count combining vowels and tone marks', () => {
    // ก + สระอิ (U+0E34, Mn) + ไม้เอก (U+0E48, Mn) -> 1 cell, not 3
    expect(countCells('กิ่')).toBe(1);
  });

  it('counts the independent vowel SARA AM as 1 cell, same as its decomposed form', () => {
    // U+0E33 (precomposed SARA AM) vs. U+0E4D + U+0E32 (NIKHAHIT + SARA AA, decomposed)
    const precomposed = 'ทำ';
    const decomposed = 'ทํา';
    expect(countCells(precomposed)).toBe(countCells(decomposed));
    expect(countCells(precomposed)).toBe(2);
  });

  it('does not count `\\n` as a cell and sums every line', () => {
    expect(countCells('ab\ncd')).toBe(4);
  });

  it('matches the two canon strings verified in copy-schema 4.1', () => {
    const death = 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย';
    const autoRetreatFilled =
      'HP เหลือต่ำกว่า กก% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ';
    expect(countCells(death)).toBe(47);
    expect(countCells(autoRetreatFilled)).toBe(63);
  });

  it('normalizes to NFC before counting', () => {
    // "e" + combining acute accent (NFD) should count as 1 cell after NFC normalization.
    const nfd = 'é';
    expect(countCells(nfd)).toBe(1);
  });
});

describe('countCellsPerLine', () => {
  it('returns the cell count of each line in order', () => {
    expect(countCellsPerLine('ab\nคุณตาย\nc')).toEqual([2, 5, 1]);
  });

  it('returns a single-element array when there is no newline', () => {
    expect(countCellsPerLine('คุณตาย')).toEqual([5]);
  });
});
