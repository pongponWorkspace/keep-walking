/**
 * Golden test vector format shared by every formula (ADR 0001).
 * The systems-designer publishes vectors in design/systems/test-vectors/*.json;
 * code in packages/shared must reproduce `expected` within `tolerance`.
 */
export interface GoldenVector<TInput, TExpected> {
  /** Arguments passed to the formula under test. */
  readonly input: TInput;
  /** Reference result from the systems-designer's reference implementation. */
  readonly expected: TExpected;
  /** Maximum absolute difference allowed per numeric value. 0 means exact. */
  readonly tolerance: number;
  /** Where the expected value comes from (GDD section, config key, or sim run). */
  readonly source: string;
}

/** A named file of vectors for one formula. */
export interface GoldenVectorFile<TInput, TExpected> {
  readonly formula: string;
  readonly vectors: readonly GoldenVector<TInput, TExpected>[];
}

/**
 * True when `actual` matches `expected` within an absolute tolerance.
 * Works on numbers, and recursively on arrays and plain objects of numbers.
 * Non-numeric leaves must be strictly equal.
 */
export function isWithinTolerance(actual: unknown, expected: unknown, tolerance: number): boolean {
  if (tolerance < 0 || Number.isNaN(tolerance)) {
    throw new RangeError('tolerance must be a non-negative number');
  }
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) <= tolerance;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return (
      actual.length === expected.length &&
      actual.every((value, index) => isWithinTolerance(value, expected[index], tolerance))
    );
  }
  if (isPlainObject(actual) && isPlainObject(expected)) {
    const keys = Object.keys(expected);
    return (
      keys.length === Object.keys(actual).length &&
      keys.every((key) => isWithinTolerance(actual[key], expected[key], tolerance))
    );
  }
  return actual === expected;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
