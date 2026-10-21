import { describe, expect, it } from 'vitest';
import { GAME_NAME, titleLine } from './version';

describe('version', () => {
  it('uses the Blockfall name', () => {
    expect(GAME_NAME).toBe('Blockfall');
  });

  it('builds a title line with the version', () => {
    expect(titleLine()).toMatch(/^Blockfall v\d+\.\d+\.\d+$/);
  });
});
