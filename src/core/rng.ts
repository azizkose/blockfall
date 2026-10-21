/**
 * Small, fast, seedable pseudo-random generator (mulberry32).
 * The same seed always produces the same sequence, which keeps games and tests reproducible.
 */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
  };
}
