import { describe, expect, it } from 'vitest';
import { createBoard, isBlocked } from './board';
import type { ActivePiece, Rotation } from './pieces';
import { getKicks, HALF_TURN_KICKS, I_KICKS, JLSTZ_KICKS, tryRotate } from './srs';

describe('SRS kick tables', () => {
  it('JLSTZ 0->R matches the published table (converted to y-down)', () => {
    expect(getKicks('T', 0, 1)).toEqual([
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 },
    ]);
  });

  it('I 0->R uses its own table', () => {
    expect(getKicks('I', 0, 1)).toEqual([
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 1 },
      { x: 1, y: -2 },
    ]);
    expect(getKicks('I', 0, 1)).not.toEqual(getKicks('J', 0, 1));
  });

  it('every reverse rotation uses the negated kicks (SRS symmetry)', () => {
    for (const table of [JLSTZ_KICKS, I_KICKS]) {
      for (const [key, kicks] of Object.entries(table)) {
        const reverse = table[`${key[1]}${key[0]}`];
        expect(reverse).toBeDefined();
        kicks.forEach(([x, y], i) => {
          const [rx, ry] = reverse?.[i] ?? [NaN, NaN];
          expect(rx + x).toBe(0);
          expect(ry + y).toBe(0);
        });
      }
    }
  });

  it('has 8 entries for quarter turns, 4 for half turns, 5 kicks each (6 for 180)', () => {
    expect(Object.keys(JLSTZ_KICKS)).toHaveLength(8);
    expect(Object.keys(I_KICKS)).toHaveLength(8);
    expect(Object.keys(HALF_TURN_KICKS)).toHaveLength(4);
    for (const k of Object.values(JLSTZ_KICKS)) expect(k).toHaveLength(5);
    for (const k of Object.values(I_KICKS)) expect(k).toHaveLength(5);
    for (const k of Object.values(HALF_TURN_KICKS)) expect(k).toHaveLength(6);
  });

  it('O never kicks', () => {
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as [Rotation, Rotation][]) {
      expect(getKicks('O', a, b)).toEqual([{ x: 0, y: 0 }]);
    }
  });
});

describe('tryRotate', () => {
  it('rotates in open space without kicking', () => {
    const board = createBoard();
    const r = tryRotate(board, { type: 'T', rotation: 0, x: 3, y: 5 }, 'cw');
    expect(r).toEqual({ piece: { type: 'T', rotation: 1, x: 3, y: 5 }, kickIndex: 0 });
  });

  it('supports counter-clockwise and 180 rotation', () => {
    const board = createBoard();
    expect(tryRotate(board, { type: 'L', rotation: 0, x: 3, y: 5 }, 'ccw')?.piece.rotation).toBe(3);
    expect(tryRotate(board, { type: 'S', rotation: 1, x: 3, y: 5 }, '180')?.piece.rotation).toBe(3);
  });

  it('kicks a vertical I away from the left wall', () => {
    const board = createBoard();
    // I in state R hugging the left wall: its column is x + 2 = 0.
    const piece: ActivePiece = { type: 'I', rotation: 1, x: -2, y: 5 };
    const r = tryRotate(board, piece, 'cw');
    // R->2 kicks: (0,0) (-1,0) (+2,0)... third one fits.
    expect(r).toEqual({ piece: { type: 'I', rotation: 2, x: 0, y: 5 }, kickIndex: 2 });
  });

  it('kicks a T off the right wall', () => {
    const board = createBoard();
    // T in state L at the right wall: occupied columns 8 and 9 (box x = 8).
    const piece: ActivePiece = { type: 'T', rotation: 3, x: 8, y: 5 };
    const r = tryRotate(board, piece, 'cw');
    // L->0 first kick is (-1, 0) once (0,0) pokes through the wall.
    expect(r?.piece).toEqual({ type: 'T', rotation: 0, x: 7, y: 5 });
    expect(r?.kickIndex).toBe(1);
  });

  it('uses the 5th kick when only it fits', () => {
    // Fill the board, then carve out only the current T and the 5th-kick target.
    const board = createBoard();
    board.cells.fill(8);
    const open = [
      // current T (state 0, box at 3,10)
      [4, 10],
      [3, 11],
      [4, 11],
      [5, 11],
      // target T (state R, box at 2,12) = kick (-1, +2)
      [3, 12],
      [3, 13],
      [4, 13],
      [3, 14],
    ];
    for (const [x, y] of open) board.cells[(y as number) * board.width + (x as number)] = 0;
    expect(isBlocked(board, 4, 12)).toBe(true);
    const r = tryRotate(board, { type: 'T', rotation: 0, x: 3, y: 10 }, 'cw');
    expect(r).toEqual({ piece: { type: 'T', rotation: 1, x: 2, y: 12 }, kickIndex: 4 });
  });

  it('returns null when every kick is blocked', () => {
    const board = createBoard();
    board.cells.fill(8);
    // Carve out only a horizontal I; no vertical position is free.
    for (let x = 3; x <= 6; x++) board.cells[10 * board.width + x] = 0;
    expect(tryRotate(board, { type: 'I', rotation: 0, x: 3, y: 9 }, 'cw')).toBeNull();
  });
});
