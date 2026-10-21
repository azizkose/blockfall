/**
 * Gravity curve: how fast pieces fall at each level.
 * Uses the common guideline formula: seconds per row = (0.8 - (level - 1) * 0.007) ^ (level - 1).
 * Level 1 falls one row per second; by level 20 pieces drop instantly ("20G").
 */
import { LOGIC_HZ } from './constants';

/** Maximum fall speed in rows per logic frame (instant drop on a 20-row field). */
export const MAX_GRAVITY = 20;

export function secondsPerRow(level: number): number {
  const l = Math.max(1, level);
  return Math.pow(Math.max(0.8 - (l - 1) * 0.007, 0), l - 1);
}

/** Rows fallen per 1/60 s logic frame at a given level. */
export function gravityPerFrame(level: number): number {
  const seconds = secondsPerRow(level);
  if (seconds <= 0) return MAX_GRAVITY;
  return Math.min(MAX_GRAVITY, 1 / (seconds * LOGIC_HZ));
}
