/** Game modes and their win/end conditions. */

export type ModeId = 'marathon' | 'sprint' | 'ultra';

export interface ModeRules {
  readonly id: ModeId;
  readonly name: string;
  readonly description: string;
  /** The game ends successfully when this many lines are cleared. */
  readonly lineGoal: number | null;
  /** The game ends successfully when this much time has passed. */
  readonly timeLimitMs: number | null;
  /** Whether the level (and speed) rises every 10 lines. */
  readonly levelProgression: boolean;
}

export const MODES: Readonly<Record<ModeId, ModeRules>> = {
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    description: 'Endless play. Speed rises every 10 lines.',
    lineGoal: null,
    timeLimitMs: null,
    levelProgression: true,
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint',
    description: 'Clear 40 lines as fast as you can.',
    lineGoal: 40,
    timeLimitMs: null,
    levelProgression: false,
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    description: 'Score as much as you can in 2 minutes.',
    lineGoal: null,
    timeLimitMs: 2 * 60 * 1000,
    levelProgression: true,
  },
};

export const MODE_IDS: readonly ModeId[] = ['marathon', 'sprint', 'ultra'];
