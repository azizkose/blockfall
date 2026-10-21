/**
 * Fixed-timestep game loop. Logic always advances in exact 1/60 s steps, no matter the
 * screen's refresh rate; drawing happens once per animation frame.
 */
import { FRAME_MS } from './core/constants';

/** Never simulate more than this much catch-up time after a stall (e.g. a background tab). */
const MAX_CATCH_UP_MS = 250;

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

export function createLoop(step: () => void, draw: () => void): Loop {
  let running = false;
  let last = 0;
  let acc = 0;
  let handle = 0;

  const frame = (now: number) => {
    if (!running) return;
    // Clamp: never negative (first frame timestamps can predate start()), never a huge jump.
    acc += Math.max(0, Math.min(now - last, MAX_CATCH_UP_MS));
    last = now;
    while (acc >= FRAME_MS) {
      step();
      acc -= FRAME_MS;
    }
    draw();
    handle = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      handle = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(handle);
    },
    get running() {
      return running;
    },
  };
}
