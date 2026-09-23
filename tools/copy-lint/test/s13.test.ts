import { describe, expect, it } from 'vitest';
import { checkS13 } from '../src/checks/s13';
import { contextFor } from './helpers';

describe('S13 — names never appear literally in copy.th.json', () => {
  it('WARNs and skips when names.th.json does not exist', () => {
    const ctx = contextFor(
      { 'run.x': { text: 'x', voice: 'system', kind: 'label', context: 'x' } },
      undefined,
      undefined,
    );
    const issues = checkS13(ctx);
    expect(issues).toEqual([
      { key: 'names.th.json', check: 'S13', level: 'WARN', message: expect.any(String) },
    ]);
  });

  it('FAILs when a name appears literally instead of through a variable', () => {
    const ctx = contextFor(
      { 'map.x': { text: 'เข้าไปที่ลุมพินีเลย', voice: 'system', kind: 'label', context: 'x' } },
      undefined,
      { 'dungeon.lumpini': { nameReal: 'ลุมพินี', nameSuffix: 'ป่าในเมือง' } },
    );
    expect(checkS13(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes when the name is referenced through a variable', () => {
    const ctx = contextFor(
      {
        'map.x': { text: 'เข้าไปที่ {zoneName} เลย', voice: 'system', kind: 'label', context: 'x' },
      },
      undefined,
      { 'dungeon.lumpini': { nameReal: 'ลุมพินี', nameSuffix: 'ป่าในเมือง' } },
    );
    expect(checkS13(ctx)).toEqual([]);
  });

  it('skips `_`-prefixed metadata fields inside names.th.json', () => {
    const ctx = contextFor(
      {
        'map.x': {
          text: 'largePark คือพื้นที่สวนใหญ่',
          voice: 'system',
          kind: 'label',
          context: 'x',
        },
      },
      undefined,
      { 'dungeon.lumpini': { nameReal: 'ลุมพินี', _preset: 'largePark' } },
    );
    expect(checkS13(ctx)).toEqual([]);
  });
});
