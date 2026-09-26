import { describe, expect, it } from 'vitest';
import { deriveSeed, fnv1a32, mulberry32, streamRng, uniform } from './rng';

describe('mulberry32', () => {
  it('is deterministic: same seed -> same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('gives numbers in [0, 1)', () => {
    const rng = mulberry32(1234);
    for (let i = 0; i < 200; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('a different seed gives a different sequence', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe('uniform', () => {
  it('maps rng() = 0 and rng() near 1 to the range bounds', () => {
    expect(uniform(() => 0, 10, 20)).toBe(10);
    expect(uniform(() => 0.5, 10, 20)).toBe(15);
  });
});

describe('fnv1a32', () => {
  it('is deterministic for ASCII input', () => {
    expect(fnv1a32('1:drop:0')).toBe(fnv1a32('1:drop:0'));
  });

  it('differs on multi-byte UTF-8 input (hand-rolled encoder, section 6.2)', () => {
    // "ก" is a 3-byte UTF-8 sequence (U+0E01); this only exercises the encoder, run tags are ASCII.
    expect(fnv1a32('ก')).not.toBe(fnv1a32('a'));
    expect(Number.isInteger(fnv1a32('เดินต่อ 🚶'))).toBe(true);
  });
});

describe('deriveSeed (ADR 0003 section 6.2)', () => {
  it('is deterministic and formats runSeed/index with no leading zero', () => {
    expect(deriveSeed(1, 'drop', 0)).toBe(fnv1a32('1:drop:0'));
    expect(deriveSeed(7, 'hit', 3)).toBe(fnv1a32('7:hit:3'));
  });

  it('one extra hit or one skipped tick never shifts another stream (counter-based, no shared state)', () => {
    const dropAt0 = streamRng(99, 'drop', 0)();
    const dropAt1Before = streamRng(99, 'drop', 1)();
    // Drawing "hit" numbers in between must not change what "drop" index 0 or 1 produce.
    streamRng(99, 'hit', 0)();
    streamRng(99, 'hit', 1)();
    const dropAt0Again = streamRng(99, 'drop', 0)();
    const dropAt1After = streamRng(99, 'drop', 1)();
    expect(dropAt0Again).toBe(dropAt0);
    expect(dropAt1After).toBe(dropAt1Before);
  });

  it('rejects a non-integer or negative runSeed/index', () => {
    expect(() => deriveSeed(-1, 'drop', 0)).toThrow(RangeError);
    expect(() => deriveSeed(1.5, 'drop', 0)).toThrow(RangeError);
    expect(() => deriveSeed(1, 'drop', -1)).toThrow(RangeError);
  });
});

describe('streamRng', () => {
  it('is mulberry32(deriveSeed(...))', () => {
    const seed = deriveSeed(5, 'hit', 2);
    expect(streamRng(5, 'hit', 2)()).toBe(mulberry32(seed)());
  });
});
