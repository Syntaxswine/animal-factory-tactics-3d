# Cursor wall X-ray

Hovering the 3D battlefield opens a cursor-centred cutaway down to the selected level. Walls on that level and above become faint edge outlines; higher floors and roofs open too. Lower levels and the selected level's supporting floor remain solid. Selecting level 3 therefore leaves levels 1 and 2 intact. The circle is **five tiles in diameter**, measured in the orthographic camera's world-unit scale and scaled with zoom. Door panels and handles use warm gold outlines. Moving outside the canvas, cancelling the pointer, losing focus or hiding the page restores solid surfaces.

Try `tactics/battle-3d.html?study=wall-xray` for a playable room with workers, starter supplies, two closed doors and a window. The feature is also active in normal 3D encounters. The original hybrid viewer/editor is unaffected.

## Interaction and visibility

- Original wall/door geometry remains intact for picking. Click an exposed closed door beside the selected worker to queue existing movement through it. Existing AP, stamina, collision and lock rules apply. Locked doors direct the player to the existing Pick lock / Force door actions.
- Actor and loot picking takes priority over door picking, so a door outline does not prevent selecting a revealed worker or pile.
- The effect does not change map knowledge, detection, visibility, wall collision, projectiles or line of sight. Undetected people and non-visible loot remain absent; unknown wall batches remain absent in Standard difficulty.
- Scope includes authored walls and doors, window sills/lintels, door handles and roof parapets on the selected level or above, plus floor/roof slabs strictly above it. Scenery props and tower structures keep their existing presentation.
- Undiscovered interiors on the selected level remain black. Overhead black masks open along with the upper floors, allowing a discovered lower room to be seen without exploring any upper room or revealing its hidden contents.

## Implementation

`wall-xray.js` owns shared cursor/selected-level uniforms, cloned materials cached by their cutaway limit, and instanced edge-line overlays with per-wall floor indices. `HybridRenderer` separates wall and slab batches by their cutaway limit even when they share paint, and uses the effect only when its caller provides `wallXray`. Level selection updates a uniform without rebuilding the map. `InteriorFogScene` keeps separate masks per floor, cutting only those strictly above the selection. `BattleRenderer` owns and disposes the effect.

The shader discards eligible fragments inside the screen-space circle; wall outlines are drawn only inside it and never below the selected level, with 34% opacity and depth testing. Outside pixels keep their existing materials. Instance geometry, map data and shared source textures are unchanged. Wire batches use the parent instance bounds for frustum culling, are hidden when inactive, and are disposed when their source chunks are replaced.

The dedicated study map is opt-in; ordinary encounter loading still reads the shipped factory. Existing editor-playtest and saved-game loading take precedence.

## Validation

October 6 multilevel correction: `node tools/check-xray-levels.mjs` exercises the real level buttons on a three-story building. Pixel comparisons require zero changes on lower walls, verify upper floors/roofs/fog open, retain the selected supporting floor, and keep undiscovered selected rooms black. It also checks unchanged exploration/hidden objects and stable GPU resources across repeated level changes. Set `REVIEW_URL` to the preview origin (default port 4364); evidence goes to `artifacts/xray-levels/`. Focused rules coverage is in `wall-xray.test.mjs`, `interior-fog.test.mjs` and `multilevel-presentation.test.mjs`.

- **9/10 independent hostile review**, including real mouse door use, hidden people/loot, live wireframe rendering and repeated rebuild resource checks.
- **36 focused tests pass** across X-ray, encounter visibility, map loading, inventory, field actions, shared wall geometry and packaging.
- Browser regression: 20,037 changed wall pixels inside the circle and **zero outside**, real door traversal, fog filtering, hidden actors/loot, zoom, pointer exit, floor switching, high-DPI and mobile layout. No console errors; hover changes keep GPU counts stable.
- 3D build and module closure pass.

```sh
node --test tests/wall-xray.test.mjs tests/battle-3d.test.mjs tests/battle-map.test.mjs tests/field-actions.test.mjs tests/battle-inventory.test.mjs tests/hybrid-world.test.mjs tests/tactics-pages-files.test.mjs
node tools/build-tactics-3d.mjs
node tools/wall-xray-review.mjs
```

The browser check accepts `PLAYWRIGHT_PATH` and `REVIEW_URL` (server root; defaults to `http://127.0.0.1:4438`). Evidence is written under `artifacts/wall-xray/`.

Two stale regression assumptions were corrected: packaging must include the 3D copy list, and the shipped factory now has 434 props rather than the historical backup's 398. The map test compares complete shipped arrays instead. The mobile check also found and fixed horizontal overflow from the old four-column action grid.

## Editor integration

Integrated with deployment repair 9878af2. Runtime help retains both X-ray/door use and WASD/arrow camera controls. The factory test retains exact fixture agreement and explicit authored roof positions, plus complete loaded-array comparisons. Packaging now checks the base manifest independently and the combined 3D manifest separately; wall-xray.js is present in the base manifest for HybridRenderer. The missing-module closure validator remains enabled.

Integration validation: full npm run check passed with 967 tests and the asset audit; 3D build and core sync passed. Browser review verified 20,037 changed pixels inside the X-ray circle and zero outside, door use, hidden actors/loot, fog, zoom, pointer exit, high-DPI and mobile behavior. Packaged camera/help and exact-variant-copy checks passed.
