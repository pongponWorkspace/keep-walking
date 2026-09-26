import { describe, expect, it } from 'vitest';
import { SchemaValidator } from '../src/json-schema';

describe('minimal JSON Schema validator', () => {
  const v = new SchemaValidator({
    type: 'object',
    required: ['a'],
    additionalProperties: false,
    properties: {
      a: { type: 'integer', minimum: 1 },
      b: { oneOf: [{ type: 'null' }, { type: 'string', pattern: '^x' }] },
      c: { type: 'array', items: { enum: [1, 2] }, uniqueItems: true },
    },
    allOf: [{ if: { properties: { a: { const: 2 } } }, then: { required: ['b'] } }],
  });

  it('accepts valid and rejects invalid documents', () => {
    expect(v.validate({ a: 1 })).toEqual([]);
    expect(v.validate({ a: 2, b: 'xy', c: [1, 2] })).toEqual([]);
    expect(v.validate({ a: 0 })).toHaveLength(1);
    expect(v.validate({ a: 2 })).toHaveLength(1);
    expect(v.validate({ a: 1, b: 'y' })).toHaveLength(1);
    expect(v.validate({ a: 1, c: [1, 1] })).toHaveLength(1);
    expect(v.validate({ a: 1, z: true })).toHaveLength(1);
  });

  it('throws on a keyword it does not implement', () => {
    expect(() => new SchemaValidator({ format: 'email' }).validate('x')).toThrow(/unsupported keyword/);
  });
});
