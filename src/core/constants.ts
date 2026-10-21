/** Board and timing constants shared by all game logic. */

export const BOARD_WIDTH = 10;
export const VISIBLE_ROWS = 20;
/** Rows above the visible field where pieces spawn. */
export const HIDDEN_ROWS = 2;
export const BOARD_HEIGHT = VISIBLE_ROWS + HIDDEN_ROWS;

/** Logic runs at a fixed 60 updates per second. */
export const LOGIC_HZ = 60;
export const FRAME_MS = 1000 / LOGIC_HZ;

export const DEFAULT_LOCK_DELAY_MS = 500;
export const DEFAULT_MAX_LOCK_RESETS = 15;
/** Soft drop moves this many times faster than normal gravity. */
export const DEFAULT_SOFT_DROP_FACTOR = 20;
export const PREVIEW_COUNT = 5;
export const LINES_PER_LEVEL = 10;

/** Left edge of a new piece's bounding box. */
export const SPAWN_X = 3;
