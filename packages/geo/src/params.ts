// Parameter checks. geo has no defaults: a missing or nonsensical value is a caller bug and
// throws instead of silently falling back (ADR 0003 4.1, fail closed).

export function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number > 0, got ${String(value)}`);
  }
}

export function requireNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number >= 0, got ${String(value)}`);
  }
}

export function requirePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be an integer >= 1, got ${String(value)}`);
  }
}

/** Seconds → whole milliseconds; a value that is not a whole number of ms is rejected. */
export function secondsToWholeMs(name: string, value_s: number, msPerS: number): number {
  requirePositive(name, value_s);
  const ms = value_s * msPerS;
  if (!Number.isInteger(ms)) {
    throw new RangeError(
      `${name} must be a whole number of milliseconds, got ${String(value_s)} s`,
    );
  }
  return ms;
}
