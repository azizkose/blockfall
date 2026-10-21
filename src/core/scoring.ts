/**
 * Scoring rules (modern guideline style). All values are multiplied by the current level.
 *
 * - Line clears: single 100, double 300, triple 500, quad 800
 * - T-spin: 400 / 800 / 1200 / 1600 for 0 / 1 / 2 / 3 lines
 * - T-spin mini: 100 / 200 / 400 for 0 / 1 / 2 lines
 * - Back-to-back: a quad or T-spin line clear right after another one earns +50%
 * - Combo: each consecutive clearing piece adds 50 x combo count
 * - Perfect clear (board empty afterwards): bonus 800 / 1200 / 1800 / 2000, or 3200 for a
 *   back-to-back quad
 * - Soft drop: 1 point per row, hard drop: 2 points per row (not multiplied by level)
 */
import type { TSpinKind } from './tspin';

export const DROP_POINTS = { soft: 1, hard: 2 } as const;

const LINE_POINTS = [0, 100, 300, 500, 800] as const;
const TSPIN_POINTS = [400, 800, 1200, 1600] as const;
const TSPIN_MINI_POINTS = [100, 200, 400] as const;
const PERFECT_CLEAR_POINTS = [0, 800, 1200, 1800, 2000] as const;
const PERFECT_CLEAR_B2B_QUAD = 3200;
const COMBO_POINTS = 50;

/** Points for the clear itself, before level, back-to-back, combo and perfect clear. */
export function basePoints(lines: number, tspin: TSpinKind): number {
  if (tspin === 'mini') return TSPIN_MINI_POINTS[lines] ?? TSPIN_POINTS[lines] ?? 0;
  if (tspin === 'full') return TSPIN_POINTS[lines] ?? 0;
  return LINE_POINTS[lines] ?? 0;
}

/** Quads and T-spin line clears are "difficult" and build back-to-back chains. */
export function isDifficult(lines: number, tspin: TSpinKind): boolean {
  return lines > 0 && (lines >= 4 || tspin !== 'none');
}

export interface LockScoreInput {
  readonly lines: number;
  readonly tspin: TSpinKind;
  readonly level: number;
  /** Combo count after this lock: 0 for the first clear in a chain, 1 for the second... */
  readonly combo: number;
  /** True when this clear continues a back-to-back chain. */
  readonly backToBack: boolean;
  readonly perfectClear: boolean;
}

export interface LockScore {
  readonly action: number;
  readonly backToBackBonus: number;
  readonly comboBonus: number;
  readonly perfectClearBonus: number;
  readonly total: number;
}

export function scoreLock(input: LockScoreInput): LockScore {
  const { lines, tspin, level, combo, backToBack, perfectClear } = input;
  const action = basePoints(lines, tspin) * level;
  const b2b = backToBack && isDifficult(lines, tspin);
  const backToBackBonus = b2b ? Math.floor(action / 2) : 0;
  const comboBonus = lines > 0 && combo > 0 ? COMBO_POINTS * combo * level : 0;
  let perfectClearBonus = 0;
  if (perfectClear && lines > 0) {
    const pc = b2b && lines >= 4 ? PERFECT_CLEAR_B2B_QUAD : (PERFECT_CLEAR_POINTS[lines] ?? 0);
    perfectClearBonus = pc * level;
  }
  return {
    action,
    backToBackBonus,
    comboBonus,
    perfectClearBonus,
    total: action + backToBackBonus + comboBonus + perfectClearBonus,
  };
}

const LINE_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'] as const;

/** Short name of a clear, e.g. "T-SPIN DOUBLE", "QUAD", "T-SPIN MINI". */
export function clearName(lines: number, tspin: TSpinKind): string {
  const name = LINE_NAMES[lines] ?? '';
  if (tspin === 'full') return name ? `T-SPIN ${name}` : 'T-SPIN';
  if (tspin === 'mini') return name ? `T-SPIN MINI ${name}` : 'T-SPIN MINI';
  return name;
}

/** All labels to show for a lock, e.g. ["T-SPIN DOUBLE", "B2B", "COMBO x4"]. */
export function clearLabels(
  lines: number,
  tspin: TSpinKind,
  backToBack: boolean,
  combo: number,
  perfectClear: boolean,
): string[] {
  const labels: string[] = [];
  const name = clearName(lines, tspin);
  if (name) labels.push(name);
  if (backToBack && isDifficult(lines, tspin)) labels.push('B2B');
  if (lines > 0 && combo > 0) labels.push(`COMBO x${combo}`);
  if (perfectClear && lines > 0) labels.push('PERFECT CLEAR');
  return labels;
}
