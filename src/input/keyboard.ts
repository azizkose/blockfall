/**
 * Keyboard input mapped to abstract game controls. Key presses are queued and applied by
 * the game loop at the start of the next logic step, which keeps the simulation deterministic.
 *
 * M1 note: left/right auto-repeat uses the operating system's key repeat. Proper DAS/ARR
 * timing arrives in M2.
 */

export type Control =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hold'
  | 'pause';

export interface ControlEvent {
  readonly control: Control;
  readonly pressed: boolean;
}

/** Default bindings, keyed by KeyboardEvent.code (layout-independent physical keys). */
export const DEFAULT_KEY_BINDINGS: Readonly<Record<string, Control>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  KeyA: 'rotate180',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
  Escape: 'pause',
  KeyP: 'pause',
};

/** Controls that may auto-repeat while the key is held. */
const REPEATABLE: ReadonlySet<Control> = new Set(['left', 'right']);

export class KeyboardInput {
  /** When false, keys are ignored and pass through to the page (menus, buttons). */
  enabled = false;
  private queue: ControlEvent[] = [];

  constructor(
    private readonly target: Window,
    private readonly bindings: Readonly<Record<string, Control>> = DEFAULT_KEY_BINDINGS,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  /** Returns and clears queued control events. */
  drain(): ControlEvent[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  clear(): void {
    this.queue = [];
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const control = this.bindings[e.code];
    if (!control) return;
    e.preventDefault();
    if (e.repeat && !REPEATABLE.has(control)) return;
    this.queue.push({ control, pressed: true });
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const control = this.bindings[e.code];
    if (!control) return;
    e.preventDefault();
    this.queue.push({ control, pressed: false });
  };
}
