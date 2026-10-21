/**
 * App shell: main menu, game screen, pause and end-of-game overlays.
 * Plain DOM; buttons are native so menus work with Tab, Enter and Space.
 */
import { formatTime } from '../core/format';
import { Game } from '../core/game';
import { MODE_IDS, MODES, type ModeId } from '../core/modes';
import { titleLine } from '../core/version';
import { type ControlEvent, KeyboardInput } from '../input/keyboard';
import { createLoop } from '../loop';
import { Renderer } from '../render/renderer';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

interface OverlayAction {
  readonly label: string;
  readonly run: () => void;
}

export function startApp(): void {
  const menu = byId<HTMLElement>('menu');
  const modeList = byId<HTMLElement>('mode-list');
  const gameScreen = byId<HTMLElement>('game');
  const canvas = byId<HTMLCanvasElement>('board');
  const overlay = byId<HTMLElement>('overlay');
  const overlayTitle = byId<HTMLElement>('overlay-title');
  const overlayBody = byId<HTMLElement>('overlay-body');
  const overlayActions = byId<HTMLElement>('overlay-actions');
  byId<HTMLElement>('version').textContent = titleLine();

  const renderer = new Renderer(canvas);
  const input = new KeyboardInput(window);
  let game: Game | null = null;
  let mode: ModeId = 'marathon';

  const loop = createLoop(step, draw);

  // ------------------------------------------------------------- menu

  for (const id of MODE_IDS) {
    const rules = MODES[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn mode-btn';
    const name = document.createElement('span');
    name.className = 'mode-name';
    name.textContent = rules.name;
    const desc = document.createElement('span');
    desc.className = 'mode-desc';
    desc.textContent = rules.description;
    button.append(name, desc);
    button.addEventListener('click', () => startGame(id));
    modeList.append(button);
  }

  function showMenu(): void {
    loop.stop();
    input.enabled = false;
    game = null;
    hideOverlay();
    gameScreen.hidden = true;
    menu.hidden = false;
    modeList.querySelector<HTMLButtonElement>('button')?.focus();
  }

  // ------------------------------------------------------------- game

  function startGame(id: ModeId): void {
    mode = id;
    game = new Game({ mode: id, seed: randomSeed() });
    menu.hidden = true;
    gameScreen.hidden = false;
    hideOverlay();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    resize();
    input.clear();
    input.enabled = true;
    loop.start();
  }

  function step(): void {
    if (!game) return;
    for (const event of input.drain()) applyControl(game, event);
    game.tick();
    game.drainEvents();
    if (game.status !== 'playing') endGame(game);
  }

  function draw(): void {
    if (game) renderer.draw(game);
  }

  function applyControl(g: Game, { control, pressed }: ControlEvent): void {
    if (control === 'softDrop') {
      g.setSoftDrop(pressed);
      return;
    }
    if (!pressed) return;
    switch (control) {
      case 'left':
        g.moveLeft();
        break;
      case 'right':
        g.moveRight();
        break;
      case 'hardDrop':
        g.hardDrop();
        break;
      case 'rotateCW':
        g.rotate('cw');
        break;
      case 'rotateCCW':
        g.rotate('ccw');
        break;
      case 'rotate180':
        g.rotate('180');
        break;
      case 'hold':
        g.holdPiece();
        break;
      case 'pause':
        pauseGame();
        break;
    }
  }

  function pauseGame(): void {
    if (!game || game.status !== 'playing' || game.paused) return;
    game.pause();
    game.setSoftDrop(false);
    input.enabled = false;
    showOverlay('Paused', null, [
      { label: 'Resume', run: resumeGame },
      { label: 'Restart', run: () => startGame(mode) },
      { label: 'Main menu', run: showMenu },
    ]);
  }

  function resumeGame(): void {
    if (!game) return;
    hideOverlay();
    input.clear();
    game.resume();
    input.enabled = true;
  }

  function endGame(g: Game): void {
    loop.stop();
    draw();
    input.enabled = false;
    let title: string;
    if (g.status === 'gameover') title = 'Game over';
    else if (g.mode.id === 'sprint') title = 'Sprint complete!';
    else title = "Time's up!";

    const stats: [string, string][] = [
      ['Score', g.score.toLocaleString('en-US')],
      ['Lines', String(g.lines)],
      ['Level', String(g.level)],
      ['Time', formatTime(g.elapsedMs)],
      ['Pieces per second', g.pps.toFixed(2)],
      ['Max combo', String(Math.max(0, g.stats.maxCombo))],
      ['T-spins', String(g.stats.tSpins)],
    ];
    const list = document.createElement('dl');
    list.className = 'stats';
    for (const [name, value] of stats) {
      const dt = document.createElement('dt');
      dt.textContent = name;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }
    showOverlay(title, list, [
      { label: 'Play again', run: () => startGame(mode) },
      { label: 'Main menu', run: showMenu },
    ]);
  }

  // ------------------------------------------------------------- overlay

  function showOverlay(title: string, body: HTMLElement | null, actions: OverlayAction[]): void {
    overlayTitle.textContent = title;
    overlayBody.replaceChildren(...(body ? [body] : []));
    overlayActions.replaceChildren(
      ...actions.map(({ label, run }) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = label;
        b.addEventListener('click', run);
        return b;
      }),
    );
    overlay.hidden = false;
    overlayActions.querySelector<HTMLButtonElement>('button')?.focus();
  }

  function hideOverlay(): void {
    overlay.hidden = true;
  }

  // Esc or P resumes from the pause menu.
  window.addEventListener('keydown', (e) => {
    if (!game?.paused || overlay.hidden) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      resumeGame();
    }
  });

  // ------------------------------------------------------------- window events

  function resize(): void {
    const rect = gameScreen.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
    draw();
  }

  new ResizeObserver(() => {
    if (!gameScreen.hidden) resize();
  }).observe(gameScreen);

  window.addEventListener('blur', pauseGame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });

  showMenu();
}

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] ?? Date.now();
}
