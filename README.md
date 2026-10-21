# Blockfall

A modern falling-block puzzle game for the browser, with a neon look, smooth effects and synthesized sound.

**Play it:** https://azizkose.github.io/blockfall/

> Status: early development. The core game is playable with plain graphics. Effects, sound,
> settings and mobile controls are on the way.

## How to play

Pieces fall into a 10-wide well. Fill a whole row to clear it. Clear several rows at once, or
spin a T piece into a tight slot (a "T-spin"), for bigger scores. The game ends when the stack
reaches the top.

**Modes**

- **Marathon**: endless. The game speeds up every 10 lines.
- **Sprint**: clear 40 lines as fast as you can.
- **Ultra**: score as much as you can in 2 minutes.

**Keyboard**

| Action       | Keys       |
| ------------ | ---------- |
| Move         | Left/Right |
| Soft drop    | Down       |
| Hard drop    | Space      |
| Rotate right | Up or X    |
| Rotate left  | Z          |
| Rotate 180   | A          |
| Hold         | C or Shift |
| Pause        | Esc or P   |

## Run locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## Useful commands

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Start a local dev server with live reload    |
| `npm test`       | Run the unit tests                           |
| `npm run lint`   | Check code quality                           |
| `npm run format` | Auto-format all files                        |
| `npm run build`  | Type-check and build the production site     |
| `npm run check`  | Run type-check, lint, format check and tests |

## Project layout

- `src/core`: pure game logic, no browser access, fully unit-tested
- `src/render`: canvas drawing and visual effects
- `src/input`: keyboard, touch and gamepad handling
- `src/audio`: synthesized sound effects
- `src/ui`: menus, settings and overlays

Every push to `main` is tested, built and deployed to GitHub Pages automatically.

## License

[MIT](LICENSE)
