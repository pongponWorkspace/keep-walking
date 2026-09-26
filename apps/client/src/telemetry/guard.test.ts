import { describe, expect, it } from 'vitest';
import { looksLikeCoordinate, sanitizeProperties } from './guard';

const GUARD = { minDecimals: 4, latRange_deg: [5, 21] as const, lngRange_deg: [97, 106] as const };
const FORBIDDEN = ['lat', 'lng', 'accuracy', 'timestamp'];

describe('looksLikeCoordinate', () => {
  it('flags a Bangkok latitude with enough decimals', () => {
    expect(looksLikeCoordinate('13.7563', GUARD)).toBe(true);
  });

  it('flags a Bangkok longitude with enough decimals', () => {
    expect(looksLikeCoordinate('100.4933', GUARD)).toBe(true);
  });

  it('does not flag a value with too few decimals', () => {
    expect(looksLikeCoordinate('13.75', GUARD)).toBe(false);
  });

  it('does not flag a number outside both ranges', () => {
    expect(looksLikeCoordinate('999.1234', GUARD)).toBe(false);
  });

  it('does not flag a non-numeric string', () => {
    expect(looksLikeCoordinate('not-a-number', GUARD)).toBe(false);
  });

  it('does not flag an integer (no decimal point at all)', () => {
    expect(looksLikeCoordinate('13', GUARD)).toBe(false);
  });
});

describe('sanitizeProperties', () => {
  it('drops a forbidden-named property and keeps the rest', () => {
    const result = sanitizeProperties({ lat: 13.7563, dungeon_id: 'pn-1' }, FORBIDDEN, GUARD);
    expect(result.properties).toEqual({ dungeon_id: 'pn-1' });
    expect(result.redactedKeys).toEqual(['lat']);
  });

  it('drops a property whose value merely looks like a coordinate, even under a harmless name', () => {
    const result = sanitizeProperties({ some_metric: 13.7563 }, FORBIDDEN, GUARD);
    expect(result.properties).toEqual({});
    expect(result.redactedKeys).toEqual(['some_metric']);
  });

  it('drops a coordinate-shaped value passed as a string', () => {
    const result = sanitizeProperties({ note: '100.49331' }, FORBIDDEN, GUARD);
    expect(result.properties).toEqual({});
  });

  it('keeps a harmless bucketed property untouched', () => {
    const result = sanitizeProperties(
      { duration_s_bucket: '60-120', exit_reason: 'manual_exit' },
      FORBIDDEN,
      GUARD,
    );
    expect(result.properties).toEqual({ duration_s_bucket: '60-120', exit_reason: 'manual_exit' });
    expect(result.redactedKeys).toEqual([]);
  });

  it('never mutates the input object', () => {
    const input = { lat: 13.7563, dungeon_id: 'pn-1' };
    sanitizeProperties(input, FORBIDDEN, GUARD);
    expect(input).toEqual({ lat: 13.7563, dungeon_id: 'pn-1' });
  });
});
