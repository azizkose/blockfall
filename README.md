# Blockfall

A modern falling-block puzzle game for the browser, with a neon look, smooth effects and synthesized sound.

**Play it:** https://azizkose.github.io/blockfall/

> Status: early development. The live page is a placeholder until gameplay lands.

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
