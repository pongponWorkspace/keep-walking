import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { afterAll, describe, expect, it } from 'vitest';
import { scaffold, valueSchema } from '../src/scaffold';
import { checkNumericKeyName, checkSuffixKnown } from '../src/units';

const COMMON_PATH = fileURLToPath(
  new URL('../../../packages/shared/schemas/config/common.schema.json', import.meta.url),
);
const ref = (def: string): { $ref: string } => ({ $ref: `../common.schema.json#/$defs/${def}` });

describe('scaffold unit suffixes (ADR 0001 3.10.3)', () => {
  it('maps _bytes, _min and _deg to $ref of common $defs', () => {
    expect(valueSchema('initialJsBudget_bytes', 1000000)).toEqual(ref('bytes'));
    expect(valueSchema('utcOffset_min', 420)).toEqual(ref('minutes'));
    expect(valueSchema('latRange_deg', 5)).toEqual(ref('degrees'));
  });

  it('keeps $ref for the other suffixes (_m2 before _m, _ms before _s)', () => {
    expect(valueSchema('window_s', 300)).toEqual(ref('seconds'));
    expect(valueSchema('minArea_m2', 5)).toEqual(ref('squareMeters'));
    expect(valueSchema('hitInterval_ms', 5)).toEqual(ref('milliseconds'));
  });

  it('applies the unit $ref to array items', () => {
    expect(valueSchema('chunkBudgets_bytes', [100, 200])).toEqual({
      type: 'array',
      items: ref('bytes'),
    });
    expect(valueSchema('lngRange_deg', [97, 106])).toEqual({
      type: 'array',
      items: ref('degrees'),
    });
  });
});

describe('scaffolded schema value range (resolved against common.schema.json)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'config-lint-scaffold-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'config', 'app', 'sample.json');
  const data = {
    initialJsBudget_bytes: 1000000,
    utcOffset_min: 420,
    latRange_deg: [5, 21],
  };

  function validator(): (value: unknown) => boolean {
    mkdirSync(join(dir, 'config', 'app'), { recursive: true });
    writeFileSync(path, JSON.stringify(data));
    const ajv = new Ajv2020({ strict: true, allowMatchingProperties: true });
    ajv.addSchema(JSON.parse(readFileSync(COMMON_PATH, 'utf8')) as object);
    return ajv.compile(scaffold(path)) as (value: unknown) => boolean;
  }
  const valid = validator();
  const withValue = (patch: Record<string, unknown>): boolean => valid({ ...data, ...patch });

  it('accepts the current values and the range ends', () => {
    expect(valid(data)).toBe(true);
    expect(withValue({ initialJsBudget_bytes: 0 })).toBe(true);
    expect(withValue({ utcOffset_min: -300 })).toBe(true);
    expect(withValue({ latRange_deg: [-90, 360] })).toBe(true);
  });

  it('rejects negative or fractional bytes, and non-numbers', () => {
    expect(withValue({ initialJsBudget_bytes: -1 })).toBe(false);
    expect(withValue({ initialJsBudget_bytes: 0.5 })).toBe(false);
    expect(withValue({ initialJsBudget_bytes: '1000000' })).toBe(false);
    expect(withValue({ utcOffset_min: '420' })).toBe(false);
  });

  it('rejects degrees outside -360..360', () => {
    expect(withValue({ latRange_deg: [5, 361] })).toBe(false);
    expect(withValue({ latRange_deg: [-361, 21] })).toBe(false);
  });
});

describe('units lint _bytes value range (P2-X12)', () => {
  it('accepts integers >= 0 and a known suffix', () => {
    expect(checkNumericKeyName('initialJsBudget_bytes', 0)).toEqual([]);
    expect(checkNumericKeyName('initialJsBudget_bytes', 1000000)).toEqual([]);
    expect(checkNumericKeyName('chunkBudgets_bytes', [0, 1, 2])).toEqual([]);
    expect(checkNumericKeyName('initialJsBudget_bytes', null)).toEqual([]);
    expect(checkSuffixKnown('initialJsBudget_bytes', 1)).toEqual([]);
  });

  it('rejects negative or fractional byte counts, including inside arrays and maps', () => {
    const msg = ['initialJsBudget_bytes must be an integer >= 0 (3.10.3 _bytes)'];
    expect(checkNumericKeyName('initialJsBudget_bytes', -1)).toEqual(msg);
    expect(checkNumericKeyName('initialJsBudget_bytes', 0.5)).toEqual(msg);
    expect(checkNumericKeyName('chunkBudgets_bytes', [1, -2])).toHaveLength(1);
    expect(checkNumericKeyName('chunkBudgets_bytes', [1, 2.5], true)).toHaveLength(1);
  });
});
