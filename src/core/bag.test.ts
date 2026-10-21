import { describe, expect, it } from 'vitest';
import { SevenBag } from './bag';
import { PIECE_TYPES, type PieceType } from './pieces';
import { createRng } from './rng';

const deal = (seed: number, count: number): PieceType[] => {
  const bag = new SevenBag(createRng(seed));
  return Array.from({ length: count }, () => bag.next());
};

describe('7-bag randomizer', () => {
  it('deals every piece exactly once in each group of 7', () => {
    const pieces = deal(42, 7 * 1000);
    for (let i = 0; i < pieces.length; i += 7) {
      expect([...pieces.slice(i, i + 7)].sort()).toEqual([...PIECE_TYPES].sort());
    }
  });

  it('deals each piece equally often', () => {
    const pieces = deal(7, 7 * 500);
    for (const t of PIECE_TYPES) expect(pieces.filter((p) => p === t)).toHaveLength(500);
  });

  it('never leaves more than 12 pieces between two of the same kind', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const pieces = deal(seed, 7 * 300);
      const last = new Map<PieceType, number>();
      pieces.forEach((p, i) => {
        const prev = last.get(p);
        if (prev !== undefined) expect(i - prev - 1).toBeLessThanOrEqual(12);
        last.set(p, i);
      });
    }
  });

  it('is reproducible with the same seed', () => {
    expect(deal(2024, 70)).toEqual(deal(2024, 70));
  });

  it('varies with the seed', () => {
    const sequences = new Set([1, 2, 3, 4, 5].map((s) => deal(s, 14).join('')));
    expect(sequences.size).toBeGreaterThan(1);
  });

  it('shuffles: bag orders are not all the same', () => {
    const pieces = deal(11, 7 * 50);
    const orders = new Set<string>();
    for (let i = 0; i < pieces.length; i += 7) orders.add(pieces.slice(i, i + 7).join(''));
    expect(orders.size).toBeGreaterThan(40);
  });
});
