// Seeded pseudo-random numbers for the synthetic trace generator (P1-F02-T04).
// mulberry32 is small, fast, and fully deterministic across Node versions and platforms,
// which is all a test-data generator needs. Not for cryptography.

const UINT32_RANGE = 4_294_967_296;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const MULBERRY_OR_A = 1;
const MULBERRY_OR_B = 61;

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  uniform(min: number, max: number): number;
  /** Normal with the given mean and standard deviation (Box-Muller). */
  gaussian(mean?: number, sd?: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  let spare: number | undefined;

  const next = (): number => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> SHIFT_A), x | MULBERRY_OR_A);
    x ^= x + Math.imul(x ^ (x >>> SHIFT_B), x | MULBERRY_OR_B);
    return ((x ^ (x >>> SHIFT_C)) >>> 0) / UINT32_RANGE;
  };

  const standardNormal = (): number => {
    if (spare !== undefined) {
      const value = spare;
      spare = undefined;
      return value;
    }
    // 1 - next() is in (0, 1], so the log is always finite.
    const radius = Math.sqrt(-(2 * Math.log(1 - next())));
    const angle = 2 * Math.PI * next();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };

  return {
    next,
    uniform: (min, max) => min + (max - min) * next(),
    gaussian: (mean = 0, sd = 1) => mean + sd * standardNormal(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  };
}

/**
 * Ornstein-Uhlenbeck process: mean-reverting noise that looks like GPS wander (correlated in time,
 * bounded in size). `sigma` is the stationary standard deviation, `tau_s` the correlation time.
 */
export class OuNoise {
  private value: number;

  constructor(
    private readonly rng: Rng,
    private readonly sigma: number,
    private readonly tau_s: number,
  ) {
    this.value = rng.gaussian(0, sigma);
  }

  step(dt_s: number): number {
    const decay = Math.exp(-dt_s / this.tau_s);
    const kick = this.sigma * Math.sqrt(1 - decay * decay);
    this.value = this.value * decay + this.rng.gaussian(0, kick);
    return this.value;
  }
}
