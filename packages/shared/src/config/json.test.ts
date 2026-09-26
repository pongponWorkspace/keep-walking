import { describe, expect, it } from 'vitest';
import {
  ConfigPathError,
  ConfigTypeError,
  ConfigUnsetError,
  bool,
  getPath,
  num,
  numArray,
  numOrNull,
  str,
  strArray,
  valueKeys,
  type JsonObject,
} from './json';

const fixture: JsonObject = {
  _meta: { owner: 'test' },
  a: { b: { c: 42, ratio: 0.5, name: 'x', flag: true, list: [1, 2, 3], strs: ['p', 'q'] } },
  nullable: null,
  _hidden: 1,
};

describe('getPath', () => {
  it('walks a dotted path', () => {
    expect(getPath(fixture, 'a.b.c')).toBe(42);
  });

  it('refuses a metadata key anywhere in the path', () => {
    expect(() => getPath(fixture, '_meta.owner')).toThrow(ConfigPathError);
    expect(() => getPath(fixture, '_hidden')).toThrow(ConfigPathError);
  });

  it('throws on a missing key', () => {
    expect(() => getPath(fixture, 'a.b.missing')).toThrow(ConfigPathError);
  });

  it('throws when walking through a non-object', () => {
    expect(() => getPath(fixture, 'a.b.c.d')).toThrow(ConfigPathError);
  });
});

describe('typed readers', () => {
  it('num/str/bool read the right type', () => {
    expect(num(fixture, 'a.b.c')).toBe(42);
    expect(str(fixture, 'a.b.name')).toBe('x');
    expect(bool(fixture, 'a.b.flag')).toBe(true);
    expect(numArray(fixture, 'a.b.list')).toEqual([1, 2, 3]);
    expect(strArray(fixture, 'a.b.strs')).toEqual(['p', 'q']);
  });

  it('num rejects a non-finite or wrong-typed value', () => {
    expect(() => num(fixture, 'a.b.name')).toThrow(ConfigTypeError);
  });

  it('a null value fails loudly with ConfigUnsetError, never a default', () => {
    expect(() => num(fixture, 'nullable')).toThrow(ConfigUnsetError);
    expect(() => str(fixture, 'nullable')).toThrow(ConfigUnsetError);
  });

  it('numOrNull treats null as a real answer', () => {
    expect(numOrNull(fixture, 'nullable')).toBeNull();
    expect(numOrNull(fixture, 'a.b.c')).toBe(42);
  });

  it('valueKeys skips metadata keys', () => {
    expect(valueKeys(fixture, 'a.b')).toEqual(['c', 'ratio', 'name', 'flag', 'list', 'strs']);
  });
});
