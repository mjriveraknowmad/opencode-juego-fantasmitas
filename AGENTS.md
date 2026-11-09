# AGENTS.md

## Project

Pac-Man-like MVP in vanilla JS, HTML and CSS. No dependencies, bundler, build, lint or test setup. The repo is an exercise in spec-driven development. Code comments and UI strings are in Spanish — keep new ones in Spanish.

## Run and verify

- No install step. Open `src/index.html` in a browser (works over `file://`).
- There is no automated test suite; verify by playing: arrow keys move, dots score 10, all dots eaten wins, 0 lives loses, overlay restarts.

## Architecture

- Four classic scripts loaded in a fixed order in `src/index.html`: `maze.js` → `game.js` → `render.js` → `main.js`. No ES modules or imports; each file publishes to `window` and reads the other files' globals. Adding a file means adding a `<script>` before `main.js` and exporting via `window`.
- `src/js/maze.js`: the level is 31 strings of exactly 28 chars, parsed to numbers. Tile values: `0` empty, `1` wall, `2` dot, `3` pen door, `4` power pellet. `MAZE` is pristine; each game copies it.
- `src/js/game.js`: state and rules only, no DOM. Exports `createGame`, `update`, `DIRS`. Actors use fractional cell coordinates; speeds are `0.125` and `0.1` cell/frame so they land exactly on cell centers every 8/10 frames. Changing them without aligning movement logic breaks turns and collisions.
- `src/js/render.js`: canvas drawing, `TILE = 20`, canvas 560×620 (= 28×31 cells). Always draw from `game.grid`, never `MAZE`, or eaten dots reappear.
- `src/js/main.js`: `requestAnimationFrame` loop, keyboard, and overlay transitions between `start`, `playing`, `won`, `lost`.

## Gotchas

- Maze rows must stay 28 chars and there must be 31 rows. Nothing validates this, so one wrong character shifts the level.
- Pac-Man is blocked by walls (`1`) and the pen door (`3`); ghosts are blocked only by walls (`1`). Row `14` (`TUNNEL_ROW`) wraps horizontally at both edges.
- `createGame()` clears the dot under Pac-Man's start cell and derives `itemsRemaining` (dots + power pellets) from `game.grid`; don't hardcode item counts.
- Game logic never touches the DOM and rendering never mutates state — keep that split.

## Spec-driven workflow

- Skills live in `.agents/skills/`: `spec/SKILL.md` (design a spec, never write code) and `spec-impl/SKILL.md` (implement an approved spec), with `spec/template.md`. Installed versions are tracked in `skills-lock.json`; don't edit those skill files by hand.
- Specs go in `specs/NN-slug.md` (the folder does not exist yet; create it with the first spec). Only `/spec-impl` specs whose status means Approved — a human flips that state. Never commit unless explicitly asked.
- `specs/.spec-config.yml` controls `AutoCreateBranch` (default `true`). This checkout is not a git repository yet, so `/spec-impl` branch creation will fail until `git init` has been run.
