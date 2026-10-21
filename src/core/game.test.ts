import { describe, expect, it } from 'vitest';
import { boardFromRows } from './board';
import { FRAME_MS } from './constants';
import { type ClearInfo, Game, type GameEvent, type GameOptions } from './game';
import { absoluteCells, type PieceType } from './pieces';

const ticks = (game: Game, n: number) => {
  for (let i = 0; i < n; i++) game.tick();
};

/** Soft drops the active piece until it rests on the stack (without locking it). */
const land = (game: Game) => {
  game.setSoftDrop(true);
  for (let i = 0; i < 5000 && !game.isGrounded(); i++) game.tick();
  game.setSoftDrop(false);
  expect(game.isGrounded()).toBe(true);
};

const clears = (events: GameEvent[]): ClearInfo[] =>
  events.flatMap((e) => (e.type === 'clear' ? [e.info] : []));

/** Fills the bottom 4 rows except the right column, then drops a vertical I there. */
const scoreQuad = (game: Game) => {
  const { board } = game;
  for (let y = 18; y < 22; y++) {
    for (let x = 0; x < 9; x++) board.cells[y * board.width + x] = 8;
  }
  expect(game.active?.type).toBe('I');
  expect(game.rotate('cw')).toBe(true);
  for (let i = 0; i < 4; i++) expect(game.moveRight()).toBe(true);
  game.hardDrop();
};

const allI = (n: number): PieceType[] => Array.from({ length: n }, () => 'I');
const make = (opts: GameOptions) => new Game({ seed: 1, ...opts });

describe('spawning and queue', () => {
  it('spawns pieces centered in rotation 0 and drops them one row into view', () => {
    const g = make({ presetPieces: ['T', 'I', 'O'] });
    expect(g.active).toEqual({ type: 'T', rotation: 0, x: 3, y: 1 });
    const cells = absoluteCells(g.active!);
    expect(Math.max(...cells.map((c) => c.y))).toBe(2); // lowest row is the first visible row
    g.hardDrop();
    expect(absoluteCells(g.active!).map((c) => c.x)).toEqual([3, 4, 5, 6]); // I
    g.hardDrop();
    expect(new Set(absoluteCells(g.active!).map((c) => c.x))).toEqual(new Set([4, 5])); // O
  });

  it('shows the next 5 pieces in order', () => {
    const g = make({ presetPieces: ['T', 'I', 'O', 'S', 'Z', 'J', 'L'] });
    expect(g.next).toEqual(['I', 'O', 'S', 'Z', 'J']);
    g.hardDrop();
    expect(g.active?.type).toBe('I');
    expect(g.next).toEqual(['O', 'S', 'Z', 'J', 'L']);
  });

  it('is deterministic for a given seed', () => {
    const play = (seed: number) => {
      const g = new Game({ seed });
      const seen: string[] = [];
      for (let i = 0; i < 15; i++) {
        seen.push(g.active?.type ?? '-');
        if (i % 2 === 0) g.moveLeft();
        g.hardDrop();
      }
      return { seen: seen.join(''), score: g.score, board: Array.from(g.board.cells).join('') };
    };
    expect(play(77)).toEqual(play(77));
    expect(play(77).seen).not.toBe(play(78).seen);
  });
});

describe('movement and drops', () => {
  it('moves left and right until the wall', () => {
    const g = make({ presetPieces: ['O'] });
    let moves = 0;
    while (g.moveLeft()) moves++;
    expect(moves).toBe(4); // O occupies columns 4-5 at spawn
    expect(g.moveLeft()).toBe(false);
  });

  it('falls one row per second at level 1', () => {
    const g = make({ presetPieces: ['T'] });
    ticks(g, 59);
    expect(g.active?.y).toBe(1);
    ticks(g, 2);
    expect(g.active?.y).toBe(2);
  });

  it('hard drop lands instantly, locks, and scores 2 per row', () => {
    const g = make({ presetPieces: ['O', 'T'] });
    expect(g.ghost?.y).toBe(20);
    g.hardDrop();
    expect(g.score).toBe(2 * 19);
    expect(g.stats.piecesPlaced).toBe(1);
    expect(g.active?.type).toBe('T');
  });

  it('soft drop falls faster and scores 1 per row', () => {
    const g = make({ presetPieces: ['O'] });
    g.setSoftDrop(true);
    ticks(g, 30); // 20x gravity = 1 row per 3 frames
    expect(g.active?.y).toBe(11);
    expect(g.score).toBe(10);
  });
});

describe('lock delay', () => {
  it('locks 500 ms after landing', () => {
    const g = make({ presetPieces: ['O', 'T'] });
    land(g);
    const framesUntilLock = Math.round(500 / FRAME_MS); // 30, counting the landing frame
    ticks(g, framesUntilLock - 2);
    expect(g.stats.piecesPlaced).toBe(0);
    ticks(g, 1);
    expect(g.stats.piecesPlaced).toBe(1);
  });

  it('restarts the timer on each move while grounded', () => {
    const g = make({ presetPieces: ['O', 'T'] });
    land(g);
    ticks(g, 20);
    expect(g.moveLeft()).toBe(true);
    ticks(g, 20); // 40 frames since landing, but only 20 since the reset
    expect(g.stats.piecesPlaced).toBe(0);
    expect(g.lockResetsUsed).toBe(1);
  });

  it('allows at most 15 resets, then locks immediately', () => {
    const g = make({ presetPieces: ['O', 'T'] });
    land(g);
    for (let i = 0; i < 14; i++) {
      expect(i % 2 === 0 ? g.moveLeft() : g.moveRight()).toBe(true);
      ticks(g, 20);
    }
    expect(g.stats.piecesPlaced).toBe(0);
    expect(g.lockResetsUsed).toBe(14);
    g.moveLeft(); // 15th reset
    expect(g.lockResetsUsed).toBe(15);
    ticks(g, 1);
    expect(g.stats.piecesPlaced).toBe(1);
  });

  it('does not use resets while the piece is in the air', () => {
    const g = make({ presetPieces: ['O'] });
    g.moveLeft();
    g.rotate('cw');
    expect(g.lockResetsUsed).toBe(0);
  });

  it('gives fresh resets when the piece reaches a new lowest row', () => {
    // A ledge under columns 0-5; the right side is one row lower.
    const g = make({ presetPieces: ['O', 'T'], initialBoard: boardFromRows(['XXXXXX....']) });
    land(g);
    expect(g.active?.y).toBe(19);
    for (const dir of ['L', 'R', 'L', 'R', 'R', 'R']) {
      expect(dir === 'L' ? g.moveLeft() : g.moveRight()).toBe(true);
    }
    // Now off the ledge (columns 6-7) and falling.
    expect(g.isGrounded()).toBe(false);
    expect(g.lockResetsUsed).toBe(6);
    land(g);
    expect(g.active?.y).toBe(20);
    expect(g.lockResetsUsed).toBe(0);
  });
});

describe('hold', () => {
  it('first hold stores the piece and takes the next one', () => {
    const g = make({ presetPieces: ['T', 'O', 'I', 'S'] });
    expect(g.holdPiece()).toBe(true);
    expect(g.hold).toBe('T');
    expect(g.active?.type).toBe('O');
    expect(g.holdUsed).toBe(true);
  });

  it('only allows one hold per piece', () => {
    const g = make({ presetPieces: ['T', 'O', 'I', 'S'] });
    g.holdPiece();
    expect(g.holdPiece()).toBe(false);
    expect(g.hold).toBe('T');
    expect(g.active?.type).toBe('O');
  });

  it('can hold again after the next piece locks, swapping pieces', () => {
    const g = make({ presetPieces: ['T', 'O', 'I', 'S'] });
    g.holdPiece();
    g.hardDrop(); // locks O
    expect(g.holdUsed).toBe(false);
    expect(g.active?.type).toBe('I');
    expect(g.holdPiece()).toBe(true);
    expect(g.active?.type).toBe('T');
    expect(g.hold).toBe('I');
  });

  it('a swapped-in piece starts fresh at the spawn position', () => {
    const g = make({ presetPieces: ['T', 'O', 'I', 'S'] });
    g.rotate('cw');
    g.moveLeft();
    g.holdPiece();
    g.hardDrop();
    g.holdPiece();
    expect(g.active).toEqual({ type: 'T', rotation: 0, x: 3, y: 1 });
  });

  it('is not allowed while paused', () => {
    const g = make({ presetPieces: ['T', 'O'] });
    g.pause();
    expect(g.holdPiece()).toBe(false);
    g.resume();
    expect(g.holdPiece()).toBe(true);
  });
});

describe('line clears and scoring in play', () => {
  it('scores a T-spin double', () => {
    const g = make({
      presetPieces: ['T', 'O'],
      initialBoard: boardFromRows(['XXXX......', 'XXX...XXXX', 'XXXX.XXXXX']),
    });
    expect(g.rotate('cw')).toBe(true); // point right while in the air
    land(g);
    expect(g.active).toMatchObject({ rotation: 1, x: 3, y: 19 });
    expect(g.rotate('cw')).toBe(true); // spin into the slot
    g.drainEvents();
    g.hardDrop();
    const [info] = clears(g.drainEvents());
    expect(info).toMatchObject({ lines: 2, tspin: 'full', points: 1200 });
    expect(info?.labels).toContain('T-SPIN DOUBLE');
    expect(g.stats.tSpins).toBe(1);
  });

  it('a T dropped into the same slot without spinning is not a T-spin', () => {
    const g = make({
      presetPieces: ['T', 'O'],
      initialBoard: boardFromRows(['XXX.......', 'XXX...XXXX', 'XXXX.XXXXX']),
    });
    g.rotate('180');
    g.drainEvents();
    g.hardDrop(); // falls straight in: last action was a drop, not a rotation
    const [info] = clears(g.drainEvents());
    expect(info).toMatchObject({ lines: 2, tspin: 'none', points: 300 });
  });

  it('rewards back-to-back quads, combos and perfect clears', () => {
    const g = make({ presetPieces: allI(3) });
    scoreQuad(g);
    const [first] = clears(g.drainEvents());
    // 800 quad + 2000 perfect clear
    expect(first).toMatchObject({ lines: 4, backToBack: false, perfectClear: true, points: 2800 });
    scoreQuad(g);
    const [second] = clears(g.drainEvents());
    // 800 + 400 B2B + 50 combo + 3200 B2B quad perfect clear
    expect(second).toMatchObject({ backToBack: true, combo: 1, points: 4450 });
    expect(second?.labels).toEqual(['QUAD', 'B2B', 'COMBO x1', 'PERFECT CLEAR']);
    expect(g.stats.quads).toBe(2);
    expect(g.stats.maxCombo).toBe(1);
  });

  it('a non-clearing piece resets the combo', () => {
    const g = make({ presetPieces: ['I', 'O', 'I'] });
    scoreQuad(g);
    expect(g.combo).toBe(0);
    g.hardDrop(); // O, no clear
    expect(g.combo).toBe(-1);
  });
});

describe('levels and modes', () => {
  it('marathon levels up every 10 lines', () => {
    const g = make({ mode: 'marathon', presetPieces: allI(4) });
    scoreQuad(g);
    scoreQuad(g);
    expect(g.level).toBe(1);
    g.drainEvents();
    scoreQuad(g);
    expect(g.lines).toBe(12);
    expect(g.level).toBe(2);
    expect(g.drainEvents()).toContainEqual({ type: 'levelUp', level: 2 });
  });

  it('sprint ends successfully at 40 lines and keeps level 1', () => {
    const g = make({ mode: 'sprint', presetPieces: allI(11) });
    for (let i = 0; i < 10; i++) {
      expect(g.status).toBe('playing');
      scoreQuad(g);
    }
    expect(g.lines).toBe(40);
    expect(g.level).toBe(1);
    expect(g.status).toBe('complete');
  });

  it('ultra ends after exactly 2 minutes', () => {
    const g = make({ mode: 'ultra' });
    // Let pieces fall naturally, alternating sides so the stack does not top out.
    let placed = -1;
    const step = () => {
      if (g.stats.piecesPlaced !== placed) {
        placed = g.stats.piecesPlaced;
        for (let i = 0; i < 5; i++) {
          if (placed % 2 === 0) g.moveLeft();
          else g.moveRight();
        }
      }
      g.tick();
    };
    for (let i = 0; i < 60 * 60 * 2 - 1; i++) step();
    expect(g.status).toBe('playing');
    for (let i = 0; i < 5; i++) step();
    expect(g.status).toBe('complete');
    expect(g.elapsedMs).toBe(120000);
  });

  it('time does not advance while paused', () => {
    const g = make({});
    g.pause();
    ticks(g, 100);
    expect(g.elapsedMs).toBe(0);
    g.resume();
    ticks(g, 60);
    expect(g.elapsedMs).toBeCloseTo(1000, 6);
  });
});

describe('game over', () => {
  it('blocks out when a new piece spawns overlapping the stack', () => {
    const column = '....XX....';
    const g = make({
      presetPieces: ['O', 'O'],
      initialBoard: boardFromRows(Array.from({ length: 19 }, () => column)),
    });
    g.hardDrop();
    expect(g.status).toBe('gameover');
    expect(g.gameOverReason).toBe('blockOut');
  });

  it('locks out when a piece locks entirely above the visible field', () => {
    const column = '....XX....';
    const g = make({
      presetPieces: ['O', 'O'],
      initialBoard: boardFromRows(Array.from({ length: 20 }, () => column)),
    });
    expect(g.active?.y).toBe(0); // no room to drop into view
    g.hardDrop();
    expect(g.status).toBe('gameover');
    expect(g.gameOverReason).toBe('lockOut');
  });

  it('ignores input after game over', () => {
    const column = '....XX....';
    const g = make({
      presetPieces: ['O', 'O'],
      initialBoard: boardFromRows(Array.from({ length: 20 }, () => column)),
    });
    g.hardDrop();
    const score = g.score;
    expect(g.moveLeft()).toBe(false);
    expect(g.hardDrop()).toBe(false);
    expect(g.holdPiece()).toBe(false);
    ticks(g, 10);
    expect(g.score).toBe(score);
  });

  it('a game played to the top eventually ends', () => {
    const g = make({ seed: 5 });
    for (let i = 0; i < 500 && g.status === 'playing'; i++) g.hardDrop();
    expect(g.status).toBe('gameover');
  });
});
