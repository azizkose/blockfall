/**
 * T-spin detection using the 3-corner rule.
 *
 * A T piece that locked right after a rotation is a T-spin when at least 3 of the 4 corners
 * of its 3x3 box are blocked (walls and floor count). It is a full T-spin when both corners
 * on the pointing side are blocked, otherwise a "mini". A mini is upgraded to full when the
 * rotation needed the last SRS kick (the big 1-across, 2-down kick).
 */
import { type Board, isBlocked } from './board';
import type { ActivePiece, Rotation } from './pieces';

export type TSpinKind = 'none' | 'mini' | 'full';

/** The two corners on the side the T points to, relative to its box, per rotation. */
const FRONT_CORNERS: Record<
  Rotation,
  readonly [readonly [number, number], readonly [number, number]]
> = {
  0: [
    [0, 0],
    [2, 0],
  ],
  1: [
    [2, 0],
    [2, 2],
  ],
  2: [
    [0, 2],
    [2, 2],
  ],
  3: [
    [0, 0],
    [0, 2],
  ],
};

const ALL_CORNERS: readonly (readonly [number, number])[] = [
  [0, 0],
  [2, 0],
  [0, 2],
  [2, 2],
];

/** The SRS kick index that upgrades a mini to a full T-spin. */
export const UPGRADE_KICK_INDEX = 4;

/**
 * Classifies a T piece that is about to lock. The caller must only call this when the last
 * successful action on the piece was a rotation.
 */
export function detectTSpin(
  board: Board,
  piece: ActivePiece,
  kickIndex: number,
  wasHalfTurn: boolean,
): TSpinKind {
  if (piece.type !== 'T') return 'none';
  const blocked = ([cx, cy]: readonly [number, number]) =>
    isBlocked(board, piece.x + cx, piece.y + cy);

  const corners = ALL_CORNERS.filter(blocked).length;
  if (corners < 3) return 'none';

  const [a, b] = FRONT_CORNERS[piece.rotation];
  if (blocked(a) && blocked(b)) return 'full';
  if (!wasHalfTurn && kickIndex === UPGRADE_KICK_INDEX) return 'full';
  return 'mini';
}
