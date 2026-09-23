import { describe, expect, it } from 'vitest';
import { buildCopyIndex, getCopyEntry, getCopyText } from './load';

describe('buildCopyIndex', () => {
  it('skips `_`-prefixed metadata keys and keeps entries as opaque flat keys', () => {
    const index = buildCopyIndex({
      _meta: { file: 'copy.th.json' },
      'gps.searching': { text: 'x', voice: 'system', kind: 'label', context: 'c' },
    });
    expect(index.has('_meta')).toBe(false);
    expect(index.get('gps.searching')?.text).toBe('x');
  });
});

describe('the real committed copy.th.json', () => {
  it('has every gps.* key the client depends on', () => {
    for (const key of [
      'gps.searching',
      'gps.off',
      'gps.offBody',
      'gps.denied',
      'gps.deniedBody',
      'gps.unsupported',
      'gps.lowAccuracy',
      'gps.lowAccuracyBody',
      'gps.offline',
      'gps.restored',
    ]) {
      expect(getCopyEntry(key), `missing copy key: ${key}`).toBeDefined();
    }
  });

  it('returns the real Thai text for a known key', () => {
    expect(getCopyText('gps.searching')).toBe('กำลังหาตำแหน่ง');
  });

  it('falls back to the key itself for a key that does not exist yet (TL-N06)', () => {
    expect(getCopyText('client.mapSpike.doesNotExistYet')).toBe('client.mapSpike.doesNotExistYet');
  });
});
