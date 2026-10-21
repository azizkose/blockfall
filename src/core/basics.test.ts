import { describe, expect, it } from 'vitest';
import { formatTime } from './format';
import { gravityPerFrame, MAX_GRAVITY, secondsPerRow } from './gravity';
import { absoluteCells, PIECE_TYPES, pieceCells, rotationAfter, type Rotation } from './pieces';
import { createRng } from './rng';

const sorted = (cells: readonly { x: number; y: number }[]) =>
  [...cells].sort((a, b) => a.y - b.y || a.x - b.x);

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const sa = Array.from({ length: 10 }, () => a.next());
    const sb = Array.from({ length: 10 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('stays within range', () => {
    const r = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(7);
      expect(Number.isInteger(n) && n >= 0 && n < 7).toBe(true);
    }
  });
});

describe('pieces', () => {
  it('every piece has 4 cells in every rotation', () => {
    for (const t of PIECE_TYPES) {
      for (const r of [0, 1, 2, 3] as Rotation[]) expect(pieceCells(t, r)).toHaveLength(4);
    }
  });

  it('T rotates clockwise through its four states', () => {
    expect(sorted(pieceCells('T', 0))).toEqual(
      sorted([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]),
    );
    // Pointing right
    expect(sorted(pieceCells('T', 1))).toEqual(
      sorted([
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
    // Pointing down
    expect(sorted(pieceCells('T', 2))).toEqual(
      sorted([
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
    // Pointing left
    expect(sorted(pieceCells('T', 3))).toEqual(
      sorted([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
  });

  it('I uses the SRS 4x4 box (state R is column 2, state 2 is row 2)', () => {
    expect(pieceCells('I', 1).every((c) => c.x === 2)).toBe(true);
    expect(pieceCells('I', 2).every((c) => c.y === 2)).toBe(true);
    expect(pieceCells('I', 3).every((c) => c.x === 1)).toBe(true);
  });

  it('O does not change shape when rotated', () => {
    for (const r of [1, 2, 3] as Rotation[]) {
      expect(sorted(pieceCells('O', r))).toEqual(sorted(pieceCells('O', 0)));
    }
  });

  it('rotationAfter wraps correctly', () => {
    expect(rotationAfter(0, 'cw')).toBe(1);
    expect(rotationAfter(3, 'cw')).toBe(0);
    expect(rotationAfter(0, 'ccw')).toBe(3);
    expect(rotationAfter(1, '180')).toBe(3);
  });

  it('absoluteCells offsets by position', () => {
    expect(sorted(absoluteCells({ type: 'O', rotation: 0, x: 3, y: 5 }))).toEqual(
      sorted([
        { x: 4, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
      ]),
    );
  });
});

describe('gravity', () => {
  it('level 1 falls one row per second', () => {
    expect(secondsPerRow(1)).toBe(1);
    expect(gravityPerFrame(1)).toBeCloseTo(1 / 60, 10);
  });

  it('gets faster every level and caps at 20G', () => {
    let prev = 0;
    for (let level = 1; level <= 30; level++) {
      const g = gravityPerFrame(level);
      expect(g).toBeGreaterThanOrEqual(prev);
      expect(g).toBeLessThanOrEqual(MAX_GRAVITY);
      prev = g;
    }
    expect(gravityPerFrame(20)).toBe(MAX_GRAVITY);
    expect(gravityPerFrame(500)).toBe(MAX_GRAVITY);
  });
});

describe('formatTime', () => {
  it('formats minutes, seconds and hundredths', () => {
    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(61234)).toBe('1:01.23');
    expect(formatTime(120000)).toBe('2:00.00');
    expect(formatTime(-5)).toBe('0:00.00');
  });
});
