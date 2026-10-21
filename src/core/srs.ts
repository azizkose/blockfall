/**
 * Super Rotation System (SRS): when a rotation is blocked, the game tries a short list of
 * offsets ("wall kicks") and uses the first one that fits.
 */
import { type Board, fits } from './board';
import {
  type ActivePiece,
  type PieceType,
  type Point,
  type RotateDir,
  type Rotation,
  rotationAfter,
} from './pieces';

type KickList = readonly (readonly [number, number])[];

// Tables use the standard published notation where +y is UP. They are converted to board
// coordinates (+y is DOWN) by toBoard() below. Keys are "<from><to>" rotation states.
export const JLSTZ_KICKS: Readonly<Record<string, KickList>> = {
  '01': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '10': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '12': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '21': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '23': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '32': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '30': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '03': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};

export const I_KICKS: Readonly<Record<string, KickList>> = {
  '01': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '10': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '12': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  '21': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '23': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '32': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '30': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '03': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

// SRS has no official 180-degree table. This is a widely used community extension.
export const HALF_TURN_KICKS: Readonly<Record<string, KickList>> = {
  '02': [
    [0, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
    [1, 0],
    [-1, 0],
  ],
  '13': [
    [0, 0],
    [1, 0],
    [1, 2],
    [1, 1],
    [0, 2],
    [0, 1],
  ],
  '20': [
    [0, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
  ],
  '31': [
    [0, 0],
    [-1, 0],
    [-1, 2],
    [-1, 1],
    [0, 2],
    [0, 1],
  ],
};

const NO_KICKS: readonly Point[] = [{ x: 0, y: 0 }];

function toBoard(list: KickList | undefined): readonly Point[] {
  if (!list) return NO_KICKS;
  return list.map(([x, y]) => ({ x, y: y === 0 ? 0 : -y }));
}

/** Kick offsets (board coordinates, +y down) to try, in order, for a rotation. */
export function getKicks(type: PieceType, from: Rotation, to: Rotation): readonly Point[] {
  if (type === 'O' || from === to) return NO_KICKS;
  const key = `${from}${to}`;
  if ((from + 2) % 4 === to) return toBoard(HALF_TURN_KICKS[key]);
  return toBoard(type === 'I' ? I_KICKS[key] : JLSTZ_KICKS[key]);
}

export interface RotationResult {
  readonly piece: ActivePiece;
  /** Which kick in the list succeeded (0 = no kick needed). */
  readonly kickIndex: number;
}

/** Tries to rotate; returns the new piece position or null if every kick is blocked. */
export function tryRotate(board: Board, piece: ActivePiece, dir: RotateDir): RotationResult | null {
  const to = rotationAfter(piece.rotation, dir);
  const kicks = getKicks(piece.type, piece.rotation, to);
  for (let i = 0; i < kicks.length; i++) {
    const k = kicks[i];
    if (!k) continue;
    const candidate: ActivePiece = { ...piece, rotation: to, x: piece.x + k.x, y: piece.y + k.y };
    if (fits(board, candidate)) return { piece: candidate, kickIndex: i };
  }
  return null;
}
