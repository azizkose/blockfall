/**
 * The seven pieces and their four rotation states.
 * Coordinates use board orientation: x grows to the right, y grows downward.
 */

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** 0 = spawn, 1 = turned right (clockwise), 2 = upside down, 3 = turned left. */
export type Rotation = 0 | 1 | 2 | 3;
export type RotateDir = 'cw' | 'ccw' | '180';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A piece on the board: type, rotation, and the top-left corner of its bounding box. */
export interface ActivePiece {
  readonly type: PieceType;
  readonly rotation: Rotation;
  readonly x: number;
  readonly y: number;
}

type Shape = readonly Point[];
type ShapeSet = readonly [Shape, Shape, Shape, Shape];

/** Spawn orientation of each piece inside its bounding box (size x size). */
const SPAWN_SHAPES: Record<
  PieceType,
  { size: number; cells: readonly (readonly [number, number])[] }
> = {
  I: {
    size: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    size: 4,
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  T: {
    size: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    size: 3,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    size: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    size: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    size: 3,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

function rotateClockwise(cells: Shape, size: number): Shape {
  return cells.map(({ x, y }) => ({ x: size - 1 - y, y: x }));
}

function buildShapes(type: PieceType): ShapeSet {
  const { size, cells } = SPAWN_SHAPES[type];
  const r0: Shape = cells.map(([x, y]) => ({ x, y }));
  if (type === 'O') return [r0, r0, r0, r0];
  const r1 = rotateClockwise(r0, size);
  const r2 = rotateClockwise(r1, size);
  const r3 = rotateClockwise(r2, size);
  return [r0, r1, r2, r3];
}

const SHAPES: Record<PieceType, ShapeSet> = {
  I: buildShapes('I'),
  O: buildShapes('O'),
  T: buildShapes('T'),
  S: buildShapes('S'),
  Z: buildShapes('Z'),
  J: buildShapes('J'),
  L: buildShapes('L'),
};

/** Cells of a piece relative to its bounding box. */
export function pieceCells(type: PieceType, rotation: Rotation): Shape {
  return SHAPES[type][rotation];
}

/** Cells of a placed piece in board coordinates. */
export function absoluteCells(piece: ActivePiece): Point[] {
  return pieceCells(piece.type, piece.rotation).map((c) => ({
    x: piece.x + c.x,
    y: piece.y + c.y,
  }));
}

/** Rotation reached by turning in the given direction. */
export function rotationAfter(rotation: Rotation, dir: RotateDir): Rotation {
  const step = dir === 'cw' ? 1 : dir === 'ccw' ? 3 : 2;
  return ((rotation + step) % 4) as Rotation;
}

/** Board cell value for a piece type (1..7). 0 means empty. */
export function pieceId(type: PieceType): number {
  return PIECE_TYPES.indexOf(type) + 1;
}

export function pieceTypeFromId(id: number): PieceType | null {
  return PIECE_TYPES[id - 1] ?? null;
}
