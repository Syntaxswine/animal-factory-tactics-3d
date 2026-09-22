# First 3D encounter

Open `/tactics/battle-3d.html` after `npm run serve`, or use the landing-page encounter card. Select a worker, click ground to move, select a visible opponent and use Fire. Reload, End turn, Stop, floor selection, camera centering, drag pan and wheel zoom are supported. Difficulty changes apply on Restart. Easy is the initial choice.

## Core boundary

`dist/tactics/core/` is a generated, byte-identical dependency snapshot of the transitive simulation modules rooted at `engine.js` and `world.js` from `Syntaxswine/animal-factory`, `tactics-prototype`, revision `6e2782a4ab3dde0f8b84a8610769664335294fe0`. `manifest.json` records upstream identity and SHA-256 hashes. Do not edit these modules locally. Update the pinned revision in `tools/sync-tactics-core.mjs` and regenerate from an available upstream Git object when deliberately upgrading.

The source sprite target at that revision and this page therefore execute identical simulation modules. This is a pinned dependency, not live synchronization with subsequent upstream changes. The current source game UI and the old 3D hybrid lab remain separate. The new encounter does not enable `geometryMode: hybrid` or use mesh raycasts to resolve combat. Raycasts select a rendered character; the shared engine validates actions and decides outcomes.

`battle-renderer.js` reuses the old renderer's environment instancing and camera, replacing its sprite actors with painted skinned models. Simulation `(x,y,z)` maps to visual `(X,Y,Z)` with the existing authored floor spacing. This visual scale does not change the core's projectile height, cover or visibility calculations. Detailed visual/collision alignment, including windows, remains a parity-review task before full release.

`battle-visibility.js` separates terrain knowledge from people visibility. Easy's terrain reveal is entirely presentational. It never mutates simulation perception or enemy knowledge. The renderer receives a shallow presentation view with filtered actors and retains the original unit identities.

## Verification

- `node tools/sync-tactics-core.mjs --check`: local byte comparison with the pinned source Git revision (requires that upstream object).
- `node --test tests/battle-3d.test.mjs`: portable dependency hash validation, Easy visibility isolation and a deterministic movement replay with/without presentation queries.
- `npm run check` and `npm run build:tactics-3d`: full existing checks and packaging.
- `PLAYWRIGHT_PATH` pointing to Playwright, then `node tools/battle-3d-review.mjs`: Edge browser movement, visibility, a controlled nearby target selected and fired on through the UI, enemy-turn completion, restart and responsive checks. `REVIEW_URL` can target the built distribution. Screenshots/results go into ignored `artifacts/battle-3d/`.

This milestone does not establish comprehensive command-replay parity for the complete UI, full-battle balance, or performance at 50 visible models. The missing visuals and UI coverage are itemized in [MISSING-3D-VISUALS.md](MISSING-3D-VISUALS.md).
