/**
 * 7-bag randomizer: deals all seven pieces in a shuffled order, then reshuffles.
 * This guarantees no long droughts: the same piece can never be more than 12 apart.
 */
import { PIECE_TYPES, type PieceType } from './pieces';
import type { Rng } from './rng';

export class SevenBag {
  private bag: PieceType[] = [];

  constructor(private readonly rng: Rng) {}

  next(): PieceType {
    if (this.bag.length === 0) this.refill();
    const piece = this.bag.pop();
    if (!piece) throw new Error('bag unexpectedly empty');
    return piece;
  }

  private refill(): void {
    const bag = [...PIECE_TYPES];
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      const tmp = bag[i] as PieceType;
      bag[i] = bag[j] as PieceType;
      bag[j] = tmp;
    }
    this.bag = bag;
  }
}
