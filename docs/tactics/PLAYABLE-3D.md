# First 3D encounter

Open `/tactics/battle-3d.html` after `npm run serve`, or use the landing-page encounter card. Select a worker, click ground to move, select a visible opponent and use Fire. Reload, End turn, Stop, floor selection, camera centering, drag pan and wheel zoom are supported. Difficulty changes apply on Restart. Easy is the initial choice.

The default is now the authored `default-factory.json` from the pinned sprite revision: 36 guards, 398 props and 1,576 boundary edges across the 240×240 map. It matches the existing `Factory-test.json`. Loading errors stop startup visibly; the page never falls back to the small training template. Use **Overview**, then click an area to inspect it; **Center** returns to the squad. `?view=overview` opens the full map for review.

The latest published painted cargo and donkey repair are integrated from 3D main `1dfdc0e`. All 261 authored crate/drum placements use the painted cargo library, including crates saved as terrain cells. Geometry/material instancing preserves the library's models and textures. One-tile crate stacks use the two-crate model; one-tile drum placements use a single painted drum. The larger gallery piles and pallets are not forced into these one-tile collision footprints. Other environment types continue to use the current environment workshop models; this is not a claim that every surface has a new painted replacement.

## Core boundary

`dist/tactics/core/` is a generated, byte-identical dependency snapshot of the transitive simulation modules rooted at `engine.js` and `world.js` from `Syntaxswine/animal-factory`, `tactics-prototype`, revision `6e2782a4ab3dde0f8b84a8610769664335294fe0`. `manifest.json` records upstream identity and SHA-256 hashes. Do not edit these modules locally. Update the pinned revision in `tools/sync-tactics-core.mjs` and regenerate from an available upstream Git object when deliberately upgrading.

The source sprite target at that revision and this page therefore execute identical simulation modules. This is a pinned dependency, not live synchronization with subsequent upstream changes. The current source game UI and the old 3D hybrid lab remain separate. The new encounter does not enable `geometryMode: hybrid` or use mesh raycasts to resolve combat. Raycasts select a rendered character; the shared engine validates actions and decides outcomes.

`battle-renderer.js` reuses the old renderer's environment instancing and camera, replacing its sprite actors with painted skinned models. Simulation `(x,y,z)` maps to visual `(X,Y,Z)` with the existing authored floor spacing. This visual scale does not change the core's projectile height, cover or visibility calculations. Detailed visual/collision alignment, including windows, remains a parity-review task before full release.

`battle-visibility.js` separates terrain knowledge from people visibility. Easy's terrain reveal is entirely presentational. It never mutates simulation perception or enemy knowledge. The renderer receives a shallow presentation view with filtered actors and retains the original unit identities.

## Verification

### Gameplay movement milestone

`battle-motion.js` observes accepted integer tile positions and interpolates presentation only. The UI plays simulation steps at a 500 ms cadence, with distance-driven leg poses, blended start/stop and shortest-angle turning. AP, pathfinding, detection and combat still execute in the unchanged pinned core. Selection rings follow the presented position. Stop or contact finishes the already accepted step and settles; it cannot refund or undo that step.

`worker-locomotion.js` adapts the motion studies' alternating planted/swinging feet and two-bone leg solving while preserving existing weapon carry grips. The hen uses its repaired avian rig, without adding firearm grips. Reduced-motion preference disables both translation interpolation and walking. Hidden enemy tracks are discarded so reappearance cannot expose an unseen route. Floor changes and teleports currently snap; ladder/roof/stair animations remain future work.

Numeric coverage includes all twelve models and rifle, pistol, knife and assault carry poses for mammals; browser checks additionally instantiate every character/equipment combination actually present in the authored factory. Arbitrary combinations are not all approved: the existing pig-director/HMG carry pose still exceeds arm reach and is not introduced by this milestone. Firing, reload, prone and kneeling action animations remain separate work.

`node tools/battle-motion-review.mjs` records actual click-to-move interpolation, changing knee poses, equipment preservation, final settling and reduced-motion behavior. It uses the same `PLAYWRIGHT_PATH`/`REVIEW_URL` settings as the encounter review.

- `node tools/sync-tactics-core.mjs --check`: local byte comparison with the pinned source Git revision (requires that upstream object).
- `node --test tests/battle-3d.test.mjs`: portable dependency hash validation, Easy visibility isolation and a deterministic movement replay with/without presentation queries.
- `npm run check` and `npm run build:tactics-3d`: full existing checks and packaging.
- `PLAYWRIGHT_PATH` pointing to Playwright, then `node tools/battle-3d-review.mjs`: Edge browser movement, visibility, a controlled nearby target selected and fired on through the UI, enemy-turn completion, restart and responsive checks. `REVIEW_URL` can target the built distribution. Screenshots/results go into ignored `artifacts/battle-3d/`.

This milestone does not establish comprehensive command-replay parity for the complete UI, full-battle balance, or performance at 50 visible models. The missing visuals and UI coverage are itemized in [MISSING-3D-VISUALS.md](MISSING-3D-VISUALS.md).
