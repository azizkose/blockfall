import { describe, expect, it } from 'vitest';
import { basePoints, clearLabels, clearName, DROP_POINTS, isDifficult, scoreLock } from './scoring';

const plain = { combo: 0, backToBack: false, perfectClear: false } as const;

describe('scoring table', () => {
  it('scores line clears', () => {
    expect([1, 2, 3, 4].map((n) => basePoints(n, 'none'))).toEqual([100, 300, 500, 800]);
  });

  it('scores T-spins', () => {
    expect([0, 1, 2, 3].map((n) => basePoints(n, 'full'))).toEqual([400, 800, 1200, 1600]);
  });

  it('scores T-spin minis', () => {
    expect([0, 1, 2].map((n) => basePoints(n, 'mini'))).toEqual([100, 200, 400]);
  });

  it('multiplies by level', () => {
    expect(scoreLock({ ...plain, lines: 4, tspin: 'none', level: 3 }).total).toBe(2400);
    expect(scoreLock({ ...plain, lines: 2, tspin: 'full', level: 2 }).total).toBe(2400);
  });

  it('gives +50% for back-to-back difficult clears only', () => {
    expect(scoreLock({ ...plain, lines: 4, tspin: 'none', level: 1, backToBack: true }).total).toBe(
      1200,
    );
    expect(scoreLock({ ...plain, lines: 2, tspin: 'full', level: 1, backToBack: true }).total).toBe(
      1800,
    );
    // A plain double can never be back-to-back.
    expect(scoreLock({ ...plain, lines: 2, tspin: 'none', level: 1, backToBack: true }).total).toBe(
      300,
    );
  });

  it('adds 50 x combo x level', () => {
    const s = scoreLock({ ...plain, lines: 1, tspin: 'none', level: 2, combo: 3 });
    expect(s.comboBonus).toBe(300);
    expect(s.total).toBe(200 + 300);
    // No combo bonus for the first clear of a chain.
    expect(scoreLock({ ...plain, lines: 1, tspin: 'none', level: 1, combo: 0 }).comboBonus).toBe(0);
  });

  it('adds perfect clear bonuses', () => {
    expect(
      scoreLock({ ...plain, lines: 1, tspin: 'none', level: 1, perfectClear: true }).total,
    ).toBe(900);
    expect(
      scoreLock({ ...plain, lines: 4, tspin: 'none', level: 1, perfectClear: true }).total,
    ).toBe(2800);
    // Back-to-back quad perfect clear: 800 + 400 (B2B) + 3200
    expect(
      scoreLock({
        ...plain,
        lines: 4,
        tspin: 'none',
        level: 1,
        perfectClear: true,
        backToBack: true,
      }).total,
    ).toBe(4400);
  });

  it('awards T-spins with no lines', () => {
    expect(scoreLock({ ...plain, lines: 0, tspin: 'full', level: 1 }).total).toBe(400);
    expect(scoreLock({ ...plain, lines: 0, tspin: 'mini', level: 1 }).total).toBe(100);
  });

  it('marks quads and T-spin clears as difficult', () => {
    expect(isDifficult(4, 'none')).toBe(true);
    expect(isDifficult(1, 'mini')).toBe(true);
    expect(isDifficult(3, 'none')).toBe(false);
    expect(isDifficult(0, 'full')).toBe(false);
  });

  it('gives drop points', () => {
    expect(DROP_POINTS).toEqual({ soft: 1, hard: 2 });
  });
});

describe('clear labels', () => {
  it('names clears', () => {
    expect(clearName(4, 'none')).toBe('QUAD');
    expect(clearName(2, 'full')).toBe('T-SPIN DOUBLE');
    expect(clearName(1, 'mini')).toBe('T-SPIN MINI SINGLE');
    expect(clearName(0, 'full')).toBe('T-SPIN');
  });

  it('lists all applicable labels', () => {
    expect(clearLabels(2, 'full', true, 4, false)).toEqual(['T-SPIN DOUBLE', 'B2B', 'COMBO x4']);
    expect(clearLabels(4, 'none', false, 0, true)).toEqual(['QUAD', 'PERFECT CLEAR']);
  });
});
