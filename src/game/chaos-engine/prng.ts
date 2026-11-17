/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator (PRNG)
 * 32-bit state generator offering excellent statistical randomness and reproducibility.
 */

export class SeededPRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = (seed >>> 0) || 1337;
  }

  /**
   * Returns a pseudo-random floating point number in [0, 1).
   */
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    if (min > max) {
      [min, max] = [max, min];
    }
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /**
   * Picks a single random element from an array.
   */
  pickOne<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = Math.floor(this.nextFloat() * items.length);
    return items[index];
  }

  /**
   * Shuffles an array deterministically using Fisher-Yates algorithm.
   */
  shuffle<T>(array: readonly T[] | T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFloat() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Resets the seed.
   */
  setSeed(seed: number): void {
    this.state = (seed >>> 0) || 1337;
  }

  /**
   * Gets the current internal state.
   */
  getState(): number {
    return this.state;
  }
}

/**
 * Global default PRNG instance initialized with fixed seed for determinism.
 */
export const defaultPRNG = new SeededPRNG(424242);

/**
 * Factory function to create a new seedable PRNG instance.
 */
export function createPRNG(seed?: number): SeededPRNG {
  return new SeededPRNG(seed);
}

/**
 * Deterministic helper to shuffle an array using a provided or default PRNG.
 */
export function shuffleArray<T>(array: readonly T[] | T[], prng?: SeededPRNG): T[] {
  const rng = prng || defaultPRNG;
  return rng.shuffle(array);
}

/**
 * Deterministic helper to pick one item using a provided or default PRNG.
 */
export function pickRandom<T>(items: readonly T[], prng?: SeededPRNG): T {
  const rng = prng || defaultPRNG;
  return rng.pickOne(items);
}

/**
 * Deterministic helper to generate an integer in range [min, max] using PRNG.
 */
export function randomInt(min: number, max: number, prng?: SeededPRNG): number {
  const rng = prng || defaultPRNG;
  return rng.nextInt(min, max);
}
