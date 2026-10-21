/**
 * Plain canvas renderer (M1). Reads game state, never changes it.
 * The neon look, animations and effects come in M3.
 */
import { BOARD_WIDTH, HIDDEN_ROWS, VISIBLE_ROWS } from '../core/constants';
import { formatTime } from '../core/format';
import type { GameView } from '../core/game';
import {
  type ActivePiece,
  absoluteCells,
  type PieceType,
  pieceCells,
  pieceTypeFromId,
} from '../core/pieces';

export const PIECE_COLORS: Readonly<Record<PieceType, string>> = {
  I: '#3fe0f0',
  O: '#f5c843',
  T: '#b46cf0',
  S: '#5fd98a',
  Z: '#f0607a',
  J: '#5a7cf0',
  L: '#f29a4a',
};
const FILLER_COLOR = '#6b7290';

const COLORS = {
  background: '#0b0d1a',
  board: '#11152b',
  grid: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.18)',
  text: '#e8ecff',
  muted: '#9aa3c7',
};

/** Board takes 10 units, each side panel 5 units, plus 1 unit gaps. */
const SIDE_UNITS = 5;
const GAP_UNITS = 1;
const UNITS_WIDE = BOARD_WIDTH + 2 * (SIDE_UNITS + GAP_UNITS);
const UNITS_TALL = VISIBLE_ROWS + 2;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private cell = 24;
  private boardX = 0;
  private boardY = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser.');
    this.ctx = ctx;
  }

  /** Call when the canvas's on-screen size changes. Handles high-DPI screens. */
  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.width = Math.max(1, Math.floor(cssWidth));
    this.height = Math.max(1, Math.floor(cssHeight));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cell = Math.max(
      8,
      Math.floor(Math.min(this.width / UNITS_WIDE, this.height / UNITS_TALL)),
    );
    this.boardX = Math.round((this.width - BOARD_WIDTH * this.cell) / 2);
    this.boardY = Math.round((this.height - VISIBLE_ROWS * this.cell) / 2);
  }

  draw(game: GameView): void {
    const { ctx, cell } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBoard(game);
    this.drawSidePanels(game);

    // Thin border around the playfield.
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.boardX - 1,
      this.boardY - 1,
      BOARD_WIDTH * cell + 2,
      VISIBLE_ROWS * cell + 2,
    );
  }

  private drawBoard(game: GameView): void {
    const { ctx, cell, boardX, boardY } = this;
    ctx.fillStyle = COLORS.board;
    ctx.fillRect(boardX, boardY, BOARD_WIDTH * cell, VISIBLE_ROWS * cell);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < BOARD_WIDTH; x++) {
      ctx.moveTo(boardX + x * cell + 0.5, boardY);
      ctx.lineTo(boardX + x * cell + 0.5, boardY + VISIBLE_ROWS * cell);
    }
    for (let y = 1; y < VISIBLE_ROWS; y++) {
      ctx.moveTo(boardX, boardY + y * cell + 0.5);
      ctx.lineTo(boardX + BOARD_WIDTH * cell, boardY + y * cell + 0.5);
    }
    ctx.stroke();

    const { board } = game;
    for (let y = HIDDEN_ROWS; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const id = board.cells[y * board.width + x] ?? 0;
        if (id === 0) continue;
        const type = pieceTypeFromId(id);
        this.drawBlock(
          boardX + x * cell,
          boardY + (y - HIDDEN_ROWS) * cell,
          cell,
          type ? PIECE_COLORS[type] : FILLER_COLOR,
        );
      }
    }

    const { ghost, active } = game;
    if (ghost && active && ghost.y !== active.y) this.drawPiece(ghost, true);
    if (active) this.drawPiece(active, false);
  }

  private drawPiece(piece: ActivePiece, ghost: boolean): void {
    const { ctx, cell, boardX, boardY } = this;
    const color = PIECE_COLORS[piece.type];
    for (const c of absoluteCells(piece)) {
      if (c.y < HIDDEN_ROWS) continue;
      const px = boardX + c.x * cell;
      const py = boardY + (c.y - HIDDEN_ROWS) * cell;
      if (ghost) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
        ctx.globalAlpha = 1;
      } else {
        this.drawBlock(px, py, cell, color);
      }
    }
  }

  private drawBlock(px: number, py: number, size: number, color: string): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    // Simple top highlight so blocks read as separate tiles.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(px + 1, py + 1, size - 2, Math.max(2, Math.floor(size * 0.15)));
  }

  private drawSidePanels(game: GameView): void {
    const { cell, boardX, boardY } = this;
    const leftX = boardX - (GAP_UNITS + SIDE_UNITS) * cell;
    const rightX = boardX + (BOARD_WIDTH + GAP_UNITS) * cell;

    this.label('HOLD', leftX, boardY);
    if (game.hold) this.drawMini(game.hold, leftX, boardY + cell, game.holdUsed ? 0.35 : 1);

    this.label('NEXT', rightX, boardY);
    game.next.forEach((type, i) => {
      this.drawMini(type, rightX, boardY + cell + i * 3 * cell, 1);
    });

    // HUD stats under the hold box.
    let y = boardY + 5 * cell;
    const stat = (name: string, value: string) => {
      this.label(name, leftX, y);
      this.value(value, leftX, y + cell * 0.8);
      y += cell * 2.4;
    };
    stat('SCORE', game.score.toLocaleString('en-US'));
    stat('LEVEL', String(game.level));
    const goal = game.mode.lineGoal;
    stat('LINES', goal !== null ? `${game.lines}/${goal}` : String(game.lines));
    const limit = game.mode.timeLimitMs;
    stat(
      limit !== null ? 'TIME LEFT' : 'TIME',
      formatTime(limit !== null ? limit - game.elapsedMs : game.elapsedMs),
    );
    this.label(game.mode.name.toUpperCase(), leftX, y + cell * 0.4);
  }

  /** Draws a small piece preview centered in a 4x2-cell box. */
  private drawMini(type: PieceType, x: number, y: number, alpha: number): void {
    const { ctx, cell } = this;
    const size = Math.floor(cell * 0.8);
    const cells = pieceCells(type, 0);
    const minX = Math.min(...cells.map((c) => c.x));
    const maxX = Math.max(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    const maxY = Math.max(...cells.map((c) => c.y));
    const w = (maxX - minX + 1) * size;
    const h = (maxY - minY + 1) * size;
    const ox = x + (SIDE_UNITS * cell - w) / 2;
    const oy = y + (2 * cell - h) / 2;
    ctx.globalAlpha = alpha;
    for (const c of cells) {
      this.drawBlock(ox + (c.x - minX) * size, oy + (c.y - minY) * size, size, PIECE_COLORS[type]);
    }
    ctx.globalAlpha = 1;
  }

  private label(text: string, x: number, y: number): void {
    const { ctx, cell } = this;
    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 ${Math.round(cell * 0.55)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }

  private value(text: string, x: number, y: number): void {
    const { ctx, cell } = this;
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 ${Math.round(cell * 0.85)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }
}
