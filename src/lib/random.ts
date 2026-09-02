/**
 * Deterministic pseudo-random utilities.
 * Every tree, name, and synthetic prospect derives from a stable seed so a
 * reload reproduces the same recognizable territory.
 */

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface Rng {
  /** [0, 1) */
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
  chance(p: number): boolean;
  /** Roughly normal, centred at 0, clamped to [-1, 1]. */
  gauss(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    gauss: () => {
      const v = (next() + next() + next()) / 3;
      return Math.max(-1, Math.min(1, (v - 0.5) * 2 * 1.7));
    },
  };
}

export function seededRng(...parts: (string | number)[]): Rng {
  return createRng(hashString(parts.join("|")));
}
