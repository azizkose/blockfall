import { describe, expect, it } from 'vitest';
import { boardFromRows, createBoard } from './board';
import type { ActivePiece } from './pieces';
import { detectTSpin } from './tspin';

describe('T-spin detection (3-corner rule)', () => {
  // Classic T-spin double slot. The T points down into the hole at x=4.
  const tsdBoard = () => boardFromRows(['XXXX......', 'XXX...XXXX', 'XXXX.XXXXX']);
  const tsdPiece: ActivePiece = { type: 'T', rotation: 2, x: 3, y: 19 };

  it('detects a full T-spin when both front corners are blocked', () => {
    expect(detectTSpin(tsdBoard(), tsdPiece, 0, false)).toBe('full');
  });

  it('detects a mini when only one front corner is blocked', () => {
    // T pointing up on the floor. Floor blocks both back corners; one front corner filled.
    const b = createBoard();
    b.cells[20 * b.width + 3] = 8;
    const piece: ActivePiece = { type: 'T', rotation: 0, x: 3, y: 20 };
    expect(detectTSpin(b, piece, 0, false)).toBe('mini');
  });

  it('upgrades a mini to full when the 5th kick was used', () => {
    const b = createBoard();
    b.cells[20 * b.width + 3] = 8;
    const piece: ActivePiece = { type: 'T', rotation: 0, x: 3, y: 20 };
    expect(detectTSpin(b, piece, 4, false)).toBe('full');
    // ...but not for 180-degree rotations, which use a different table.
    expect(detectTSpin(b, piece, 4, true)).toBe('mini');
  });

  it('is not a T-spin with fewer than 3 blocked corners', () => {
    const b = createBoard();
    const piece: ActivePiece = { type: 'T', rotation: 0, x: 3, y: 20 };
    // Only the 2 floor corners are blocked.
    expect(detectTSpin(b, piece, 0, false)).toBe('none');
    expect(detectTSpin(b, { ...piece, y: 10 }, 0, false)).toBe('none');
  });

  it('counts walls as blocked corners', () => {
    const b = createBoard();
    // T pointing right with its back against the left wall: box x = -1, so both back
    // corners are inside the wall. One filled front corner makes 3 corners: a mini.
    b.cells[10 * b.width + 1] = 8;
    const piece: ActivePiece = { type: 'T', rotation: 1, x: -1, y: 10 };
    expect(detectTSpin(b, piece, 0, false)).toBe('mini');
    // Filling the other front corner makes it a full T-spin.
    b.cells[12 * b.width + 1] = 8;
    expect(detectTSpin(b, piece, 0, false)).toBe('full');
  });

  it('only applies to T pieces', () => {
    expect(detectTSpin(tsdBoard(), { ...tsdPiece, type: 'L' }, 0, false)).toBe('none');
  });
});
