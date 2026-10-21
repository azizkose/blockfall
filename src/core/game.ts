/**
 * The game state machine. Pure and deterministic: no DOM, no clocks, no Math.random.
 * The outside world calls the action methods (moveLeft, rotate, hold...) and tick() at a
 * fixed 60 Hz. Renderers and audio read state through GameView and drain events.
 */
import { SevenBag } from './bag';
import { type Board, clearFullRows, createBoard, fits, isBoardEmpty, placePiece } from './board';
import {
  DEFAULT_LOCK_DELAY_MS,
  DEFAULT_MAX_LOCK_RESETS,
  DEFAULT_SOFT_DROP_FACTOR,
  FRAME_MS,
  HIDDEN_ROWS,
  LINES_PER_LEVEL,
  PREVIEW_COUNT,
  SPAWN_X,
} from './constants';
import { gravityPerFrame, MAX_GRAVITY } from './gravity';
import { MODES, type ModeId, type ModeRules } from './modes';
import {
  type ActivePiece,
  absoluteCells,
  type PieceType,
  type Point,
  type RotateDir,
} from './pieces';
import { createRng } from './rng';
import { clearLabels, DROP_POINTS, isDifficult, scoreLock } from './scoring';
import { tryRotate } from './srs';
import { detectTSpin, type TSpinKind } from './tspin';

/** Tolerance for floating-point time and gravity sums. */
const EPSILON = 1e-6;

export type GameStatus = 'playing' | 'gameover' | 'complete';
/** blockOut: a new piece overlaps the stack. lockOut: a piece locked fully above the field. */
export type GameOverReason = 'blockOut' | 'lockOut';

export interface GameOptions {
  readonly mode?: ModeId;
  /** Seed for the piece randomizer. The same seed gives the same piece order. */
  readonly seed?: number;
  readonly startLevel?: number;
  readonly lockDelayMs?: number;
  readonly maxLockResets?: number;
  readonly softDropFactor?: number;
  readonly previewCount?: number;
  /** Pieces dealt before the randomizer takes over (for tests and puzzles). */
  readonly presetPieces?: readonly PieceType[];
  /** Starting board contents (for tests and puzzles). */
  readonly initialBoard?: Board;
}

export interface ClearInfo {
  readonly lines: number;
  /** Cleared row indices, top to bottom, as they were before clearing. */
  readonly rows: readonly number[];
  readonly tspin: TSpinKind;
  readonly backToBack: boolean;
  readonly combo: number;
  readonly perfectClear: boolean;
  readonly points: number;
  readonly labels: readonly string[];
}

export type GameEvent =
  | { readonly type: 'spawn'; readonly piece: PieceType }
  | { readonly type: 'move' }
  | { readonly type: 'rotate'; readonly kickIndex: number }
  | { readonly type: 'hold' }
  | { readonly type: 'hardDrop'; readonly distance: number }
  | { readonly type: 'lock'; readonly piece: PieceType; readonly cells: readonly Point[] }
  | { readonly type: 'clear'; readonly info: ClearInfo }
  | { readonly type: 'levelUp'; readonly level: number }
  | { readonly type: 'gameOver'; readonly reason: GameOverReason }
  | { readonly type: 'complete' };

export interface GameStats {
  piecesPlaced: number;
  tSpins: number;
  quads: number;
  perfectClears: number;
  maxCombo: number;
}

/** Read-only view of the game for renderers, HUD and audio. */
export interface GameView {
  readonly mode: ModeRules;
  readonly board: Board;
  readonly active: ActivePiece | null;
  readonly ghost: ActivePiece | null;
  readonly hold: PieceType | null;
  readonly holdUsed: boolean;
  readonly next: readonly PieceType[];
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly combo: number;
  readonly backToBack: number;
  readonly status: GameStatus;
  readonly paused: boolean;
  readonly elapsedMs: number;
  readonly gameOverReason: GameOverReason | null;
  readonly stats: Readonly<GameStats>;
  /** 0..1 progress of the lock delay timer while the piece rests on the stack. */
  readonly lockProgress: number;
  /** Pieces per second so far. */
  readonly pps: number;
}

export class Game implements GameView {
  readonly mode: ModeRules;
  readonly board: Board;
  readonly startLevel: number;

  private readonly lockDelayMs: number;
  private readonly maxLockResets: number;
  private readonly softDropFactor: number;
  private readonly previewCount: number;
  private readonly bag: SevenBag;
  private readonly preset: PieceType[];
  private readonly queue: PieceType[] = [];

  private _active: ActivePiece | null = null;
  private _hold: PieceType | null = null;
  private _holdUsed = false;
  private _score = 0;
  private _lines = 0;
  private _level: number;
  private _combo = -1;
  private _b2b = -1;
  private _status: GameStatus = 'playing';
  private _paused = false;
  private _elapsedMs = 0;
  private _gameOverReason: GameOverReason | null = null;
  private readonly _stats: GameStats = {
    piecesPlaced: 0,
    tSpins: 0,
    quads: 0,
    perfectClears: 0,
    maxCombo: 0,
  };

  private gravityAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private lowestY = 0;
  private softDropping = false;
  private lastWasRotation = false;
  private lastKickIndex = -1;
  private lastWasHalfTurn = false;
  private events: GameEvent[] = [];

  constructor(options: GameOptions = {}) {
    this.mode = MODES[options.mode ?? 'marathon'];
    this.board = options.initialBoard ?? createBoard();
    this.startLevel = Math.max(1, Math.floor(options.startLevel ?? 1));
    this._level = this.startLevel;
    this.lockDelayMs = options.lockDelayMs ?? DEFAULT_LOCK_DELAY_MS;
    this.maxLockResets = options.maxLockResets ?? DEFAULT_MAX_LOCK_RESETS;
    this.softDropFactor = options.softDropFactor ?? DEFAULT_SOFT_DROP_FACTOR;
    this.previewCount = options.previewCount ?? PREVIEW_COUNT;
    this.bag = new SevenBag(createRng(options.seed ?? 1));
    this.preset = [...(options.presetPieces ?? [])];
    this.spawnNext();
  }

  // ---------------------------------------------------------------- read-only state

  get active(): ActivePiece | null {
    return this._active;
  }
  get hold(): PieceType | null {
    return this._hold;
  }
  get holdUsed(): boolean {
    return this._holdUsed;
  }
  get next(): readonly PieceType[] {
    return this.queue.slice(0, this.previewCount);
  }
  get score(): number {
    return this._score;
  }
  get lines(): number {
    return this._lines;
  }
  get level(): number {
    return this._level;
  }
  get combo(): number {
    return this._combo;
  }
  get backToBack(): number {
    return this._b2b;
  }
  get status(): GameStatus {
    return this._status;
  }
  get paused(): boolean {
    return this._paused;
  }
  get elapsedMs(): number {
    return this._elapsedMs;
  }
  get gameOverReason(): GameOverReason | null {
    return this._gameOverReason;
  }
  get stats(): Readonly<GameStats> {
    return this._stats;
  }
  get lockProgress(): number {
    return this.isGrounded() ? Math.min(1, this.lockTimer / this.lockDelayMs) : 0;
  }
  get pps(): number {
    return this._elapsedMs > 0 ? this._stats.piecesPlaced / (this._elapsedMs / 1000) : 0;
  }
  /** How many lock-delay resets the current piece has used (for tests and debugging). */
  get lockResetsUsed(): number {
    return this.lockResets;
  }

  /** Where the active piece would land if hard dropped. */
  get ghost(): ActivePiece | null {
    const p = this._active;
    if (!p) return null;
    return { ...p, y: this.dropTargetY(p) };
  }

  /** True when the active piece is resting on the stack or floor. */
  isGrounded(): boolean {
    const p = this._active;
    return p !== null && !fits(this.board, { ...p, y: p.y + 1 });
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---------------------------------------------------------------- player actions

  moveLeft(): boolean {
    return this.shift(-1);
  }

  moveRight(): boolean {
    return this.shift(1);
  }

  rotate(dir: RotateDir): boolean {
    const p = this._active;
    if (!p || !this.canAct()) return false;
    const result = tryRotate(this.board, p, dir);
    if (!result) return false;
    this.applyManipulation(result.piece, true);
    this.lastKickIndex = result.kickIndex;
    this.lastWasHalfTurn = dir === '180';
    this.emit({ type: 'rotate', kickIndex: result.kickIndex });
    return true;
  }

  hardDrop(): boolean {
    const p = this._active;
    if (!p || !this.canAct()) return false;
    const y = this.dropTargetY(p);
    const distance = y - p.y;
    if (distance > 0) {
      this._active = { ...p, y };
      this.lastWasRotation = false;
      this._score += distance * DROP_POINTS.hard;
    }
    this.emit({ type: 'hardDrop', distance });
    this.lockPiece();
    return true;
  }

  /** Swap the active piece with the hold slot. Allowed once per piece. */
  holdPiece(): boolean {
    const p = this._active;
    if (!p || !this.canAct() || this._holdUsed) return false;
    const held = this._hold;
    this._hold = p.type;
    this._holdUsed = true;
    this.emit({ type: 'hold' });
    if (held === null) this.spawnNext();
    else this.spawn(held);
    return true;
  }

  setSoftDrop(active: boolean): void {
    this.softDropping = active;
  }

  pause(): void {
    if (this._status === 'playing') this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  // ---------------------------------------------------------------- simulation

  /** Advances the game by one fixed logic step. */
  tick(dtMs: number = FRAME_MS): void {
    if (this._status !== 'playing' || this._paused || !this._active) return;

    this._elapsedMs += dtMs;
    const limit = this.mode.timeLimitMs;
    if (limit !== null && this._elapsedMs >= limit - EPSILON) {
      this._elapsedMs = limit;
      this.finish();
      return;
    }

    const base = gravityPerFrame(this._level) * (dtMs / FRAME_MS);
    const speed = this.softDropping ? Math.min(MAX_GRAVITY, base * this.softDropFactor) : base;
    this.gravityAcc += speed;

    let p: ActivePiece = this._active;
    while (this.gravityAcc >= 1 - EPSILON) {
      const down = { ...p, y: p.y + 1 };
      if (!fits(this.board, down)) {
        this.gravityAcc = 0;
        break;
      }
      p = down;
      this._active = p;
      this.gravityAcc = Math.max(0, this.gravityAcc - 1);
      this.lastWasRotation = false;
      if (this.softDropping) this._score += DROP_POINTS.soft;
      this.updateLowest();
    }

    if (this.isGrounded()) {
      this.gravityAcc = 0;
      this.lockTimer += dtMs;
      if (this.lockTimer >= this.lockDelayMs - EPSILON || this.lockResets >= this.maxLockResets) {
        this.lockPiece();
      }
    } else {
      this.lockTimer = 0;
    }
  }

  // ---------------------------------------------------------------- internals

  private canAct(): boolean {
    return this._status === 'playing' && !this._paused && this._active !== null;
  }

  private emit(event: GameEvent): void {
    this.events.push(event);
  }

  private dropTargetY(p: ActivePiece): number {
    let y = p.y;
    while (fits(this.board, { ...p, y: y + 1 })) y++;
    return y;
  }

  private shift(dx: number): boolean {
    const p = this._active;
    if (!p || !this.canAct()) return false;
    const moved = { ...p, x: p.x + dx };
    if (!fits(this.board, moved)) return false;
    this.applyManipulation(moved, false);
    this.emit({ type: 'move' });
    return true;
  }

  /**
   * Shared bookkeeping for a successful move or rotation. While the piece rests on the
   * stack, each manipulation restarts the lock timer, up to maxLockResets times.
   */
  private applyManipulation(next: ActivePiece, isRotation: boolean): void {
    const wasGrounded = this.isGrounded();
    this._active = next;
    this.lastWasRotation = isRotation;
    if (wasGrounded && this.lockResets < this.maxLockResets) {
      this.lockTimer = 0;
      this.lockResets++;
    }
    this.updateLowest();
  }

  /** Reaching a new lowest row gives the piece a fresh set of lock resets. */
  private updateLowest(): void {
    const p = this._active;
    if (p && p.y > this.lowestY) {
      this.lowestY = p.y;
      this.lockResets = 0;
    }
  }

  private fillQueue(): void {
    while (this.queue.length < this.previewCount + 1) {
      this.queue.push(this.preset.shift() ?? this.bag.next());
    }
  }

  private spawnNext(): void {
    this.fillQueue();
    const type = this.queue.shift();
    this.fillQueue();
    if (type) this.spawn(type);
  }

  private spawn(type: PieceType): void {
    const piece: ActivePiece = { type, rotation: 0, x: SPAWN_X, y: 0 };
    this._active = piece;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastWasRotation = false;
    this.lastKickIndex = -1;
    this.lastWasHalfTurn = false;
    if (!fits(this.board, piece)) {
      this.endGame('blockOut');
      return;
    }
    // Pieces spawn just above the field, then immediately drop one row if there is room.
    const lower = { ...piece, y: piece.y + 1 };
    if (fits(this.board, lower)) this._active = lower;
    this.lowestY = this._active.y;
    this.emit({ type: 'spawn', piece: type });
  }

  private lockPiece(): void {
    const p = this._active;
    if (!p) return;

    const tspin: TSpinKind =
      p.type === 'T' && this.lastWasRotation
        ? detectTSpin(this.board, p, this.lastKickIndex, this.lastWasHalfTurn)
        : 'none';
    const cells = absoluteCells(p);
    placePiece(this.board, p);
    const lockOut = cells.every((c) => c.y < HIDDEN_ROWS);
    const rows = clearFullRows(this.board);
    const lines = rows.length;
    const perfectClear = lines > 0 && isBoardEmpty(this.board);

    this._active = null;
    this._holdUsed = false;
    this._stats.piecesPlaced++;
    this.emit({ type: 'lock', piece: p.type, cells });

    this._combo = lines > 0 ? this._combo + 1 : -1;
    let backToBack = false;
    if (lines > 0) {
      if (isDifficult(lines, tspin)) {
        this._b2b++;
        backToBack = this._b2b >= 1;
      } else {
        this._b2b = -1;
      }
    }

    if (lines > 0 || tspin !== 'none') {
      const s = scoreLock({
        lines,
        tspin,
        level: this._level,
        combo: this._combo,
        backToBack,
        perfectClear,
      });
      this._score += s.total;
      if (tspin !== 'none') this._stats.tSpins++;
      if (lines >= 4) this._stats.quads++;
      if (perfectClear) this._stats.perfectClears++;
      this._stats.maxCombo = Math.max(this._stats.maxCombo, this._combo);
      this.emit({
        type: 'clear',
        info: {
          lines,
          rows,
          tspin,
          backToBack: backToBack && isDifficult(lines, tspin),
          combo: Math.max(0, this._combo),
          perfectClear,
          points: s.total,
          labels: clearLabels(lines, tspin, backToBack, this._combo, perfectClear),
        },
      });
    }

    this._lines += lines;
    if (this.mode.levelProgression) {
      const newLevel = this.startLevel + Math.floor(this._lines / LINES_PER_LEVEL);
      if (newLevel > this._level) {
        this._level = newLevel;
        this.emit({ type: 'levelUp', level: newLevel });
      }
    }

    if (lockOut && lines === 0) {
      this.endGame('lockOut');
      return;
    }
    if (this.mode.lineGoal !== null && this._lines >= this.mode.lineGoal) {
      this.finish();
      return;
    }
    this.spawnNext();
  }

  private endGame(reason: GameOverReason): void {
    this._status = 'gameover';
    this._gameOverReason = reason;
    this.emit({ type: 'gameOver', reason });
  }

  private finish(): void {
    this._status = 'complete';
    this._active = null;
    this.emit({ type: 'complete' });
  }
}
