/** The playfield grid and operations on it. Cell value 0 = empty, 1..7 = piece id, 8 = filler. */
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import { type ActivePiece, absoluteCells, pieceId } from './pieces';

export interface Board {
  readonly width: number;
  readonly height: number;
  /** Row-major cells: index = y * width + x. Row 0 is the top. */
  readonly cells: Uint8Array;
}

export function createBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT): Board {
  return { width, height, cells: new Uint8Array(width * height) };
}

export function cloneBoard(board: Board): Board {
  return { width: board.width, height: board.height, cells: board.cells.slice() };
}

/** Value at (x, y), or 0 when outside the board. */
export function cellAt(board: Board, x: number, y: number): number {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return 0;
  return board.cells[y * board.width + x] ?? 0;
}

/** True when (x, y) is a wall, the floor, above the top, or a filled cell. */
export function isBlocked(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return true;
  return (board.cells[y * board.width + x] ?? 0) !== 0;
}

/** True when the piece does not overlap walls, floor or filled cells. */
export function fits(board: Board, piece: ActivePiece): boolean {
  return absoluteCells(piece).every((c) => !isBlocked(board, c.x, c.y));
}

export function placePiece(board: Board, piece: ActivePiece): void {
  const id = pieceId(piece.type);
  for (const c of absoluteCells(piece)) {
    if (c.x >= 0 && c.x < board.width && c.y >= 0 && c.y < board.height) {
      board.cells[c.y * board.width + c.x] = id;
    }
  }
}

function isRowFull(board: Board, y: number): boolean {
  for (let x = 0; x < board.width; x++) {
    if ((board.cells[y * board.width + x] ?? 0) === 0) return false;
  }
  return true;
}

/**
 * Removes every full row and shifts the rows above down.
 * Returns the indices of the cleared rows (as they were before clearing), top to bottom.
 */
export function clearFullRows(board: Board): number[] {
  const { width, height, cells } = board;
  const cleared: number[] = [];
  let write = height - 1;
  for (let read = height - 1; read >= 0; read--) {
    if (isRowFull(board, read)) {
      cleared.push(read);
      continue;
    }
    if (write !== read) {
      cells.copyWithin(write * width, read * width, read * width + width);
    }
    write--;
  }
  for (; write >= 0; write--) {
    cells.fill(0, write * width, write * width + width);
  }
  return cleared.reverse();
}

export function isBoardEmpty(board: Board): boolean {
  return board.cells.every((v) => v === 0);
}

/**
 * Builds a board from text rows, aligned to the bottom. '.' or ' ' = empty, any other
 * character = filled (piece letters keep their type). Handy for tests and puzzles.
 */
export function boardFromRows(
  rows: readonly string[],
  width = BOARD_WIDTH,
  height = BOARD_HEIGHT,
): Board {
  const board = createBoard(width, height);
  const top = height - rows.length;
  rows.forEach((row, i) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.' || ch === ' ') continue;
      const letterId = 'IOTSZJL'.indexOf(ch) + 1;
      board.cells[(top + i) * width + x] = letterId > 0 ? letterId : 8;
    }
  });
  return board;
}
