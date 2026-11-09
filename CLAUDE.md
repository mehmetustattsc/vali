# Notes for Claude

Owner: Mehmet (Germany). Talk to him in **Turkish**. References: City Life (main axis: districts, population groups, happiness) and
Transport Giant (resources, logistics, decade projects). He finds SimCity mobile boring because balance breaks, storage blocks
everything and fantasy elements creep in — so: realistic buildings only, no timers, no premium currency, no punishing storage,
numbers close to historical reality. Landscape only, phone first, stylised 3D. Design doc lives in Claude Docs ("Vali — Oyun Tasarım Belgesi").

## Architecture
- `src/engine.js`: all rules, map generation, simulation. Plain JSON state `G` (saved to localStorage as-is; keep it serialisable).
  Derived data (road network, water coverage, zone lists) lives in a WeakMap cache; call `touch(G)` after changing tiles.
  Balance numbers only in the `B` table. Jobs are counted in "people supported" (worker + family).
- `src/view.js`: Three.js scene. Reads `G`, never writes it. Instanced pools for trees, buildings, agents.
- `src/ui.js`: HUD, panels, touch input (`pointer*` on the canvas), game loop (1x = 2 s per game day, 30 days per month).
- `tools/build.py` inlines css/engine/view/ui into `web/index.html`; Three.js is loaded from `web/vendor/` via an import map.
- `self.__vali` exposes hooks for tests (`paint`, `step`, `setTool`, …).

## Workflow
- After rule changes run `node tests/sim.js 15` and read the table; `npm test` must pass.
- After UI changes run `python3 tools/build.py && python3 tests/smoke.py <shots-dir>` and look at the screenshots (844×390).
  Locally set `CHROME=/usr/bin/google-chrome` if Playwright's own Chromium is missing.
- Commit to `main` only when tests pass; CI deploys to GitHub Pages.
