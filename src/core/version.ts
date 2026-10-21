/** Game name and version. Pure module: no DOM access allowed in /src/core. */
export const GAME_NAME = 'Blockfall';
export const GAME_VERSION = '0.1.0';

export function titleLine(): string {
  return `${GAME_NAME} v${GAME_VERSION}`;
}
