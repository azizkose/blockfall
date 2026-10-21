import { describe, expect, it } from 'vitest';
import {
  boardFromRows,
  cellAt,
  clearFullRows,
  createBoard,
  fits,
  isBlocked,
  isBoardEmpty,
  placePiece,
} from './board';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';

const rowText = (board: ReturnType<typeof createBoard>, y: number) =>
  Array.from({ length: board.width }, (_, x) => (cellAt(board, x, y) ? 'X' : '.')).join('');

describe('board', () => {
  it('is 10 wide and 22 tall (20 visible + 2 hidden)', () => {
    const b = createBoard();
    expect(b.width).toBe(BOARD_WIDTH);
    expect(b.height).toBe(BOARD_HEIGHT);
    expect(BOARD_WIDTH).toBe(10);
    expect(BOARD_HEIGHT).toBe(22);
    expect(isBoardEmpty(b)).toBe(true);
  });

  it('treats walls, floor and ceiling as blocked', () => {
    const b = createBoard();
    expect(isBlocked(b, -1, 5)).toBe(true);
    expect(isBlocked(b, 10, 5)).toBe(true);
    expect(isBlocked(b, 5, 22)).toBe(true);
    expect(isBlocked(b, 5, -1)).toBe(true);
    expect(isBlocked(b, 5, 5)).toBe(false);
  });

  it('detects collisions with placed pieces', () => {
    const b = createBoard();
    placePiece(b, { type: 'O', rotation: 0, x: 3, y: 20 });
    expect(fits(b, { type: 'O', rotation: 0, x: 3, y: 19 })).toBe(false);
    expect(fits(b, { type: 'O', rotation: 0, x: 3, y: 18 })).toBe(true);
    expect(fits(b, { type: 'O', rotation: 0, x: 5, y: 20 })).toBe(true);
  });

  it('clears a single full row and shifts the rows above down', () => {
    const b = boardFromRows(['X.........', 'XXXXXXXXXX']);
    const cleared = clearFullRows(b);
    expect(cleared).toEqual([21]);
    expect(rowText(b, 21)).toBe('X.........');
    expect(rowText(b, 20)).toBe('..........');
  });

  it('clears non-adjacent rows and keeps the gaps in order', () => {
    const b = boardFromRows([
      'XXXXXXXXXX', // 17 - full
      '.X........', // 18
      'XXXXXXXXXX', // 19 - full
      '..X.......', // 20
      'XXXXXXXXXX', // 21 - full
    ]);
    expect(clearFullRows(b)).toEqual([17, 19, 21]);
    expect(rowText(b, 21)).toBe('..X.......');
    expect(rowText(b, 20)).toBe('.X........');
    expect(rowText(b, 19)).toBe('..........');
  });

  it('clears four rows at once', () => {
    const full = 'XXXXXXXXXX';
    const b = boardFromRows(['....X.....', full, full, full, full]);
    expect(clearFullRows(b)).toHaveLength(4);
    expect(rowText(b, 21)).toBe('....X.....');
  });

  it('does nothing when no rows are full', () => {
    const b = boardFromRows(['XXXXXXXXX.']);
    expect(clearFullRows(b)).toEqual([]);
    expect(rowText(b, 21)).toBe('XXXXXXXXX.');
  });

  it('reports an empty board after a perfect clear', () => {
    const b = boardFromRows(['XXXXXXXXXX', 'XXXXXXXXXX']);
    clearFullRows(b);
    expect(isBoardEmpty(b)).toBe(true);
  });
});
