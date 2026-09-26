# Cursor wall X-ray

Hovering the 3D battlefield replaces wall surfaces inside a cursor-centred circle with faint edge outlines. The circle is **five tiles in diameter**, measured in the orthographic camera's world-unit scale and scaled with zoom. Door panels and handles use warm gold outlines. Moving outside the canvas, cancelling the pointer, losing focus or hiding the page restores solid walls.

Try `tactics/battle-3d.html?study=wall-xray` for a playable room with workers, starter supplies, two closed doors and a window. The feature is also active in normal 3D encounters. The original hybrid viewer/editor is unaffected.

## Interaction and visibility

- Original wall/door geometry remains intact for picking. Click an exposed closed door beside the selected worker to queue existing movement through it. Existing AP, stamina, collision and lock rules apply. Locked doors direct the player to the existing Pick lock / Force door actions.
- Actor and loot picking takes priority over door picking, so a door outline does not prevent selecting a revealed worker or pile.
- The effect does not change map knowledge, detection, visibility, wall collision, projectiles or line of sight. Undetected people and non-visible loot remain absent; unknown wall batches remain absent in Standard difficulty.
- Scope is authored wall and door surfaces (`kind: wall`), including window sills/lintels and door handles. Roofs, floors, scenery props and tower structures are not cut away.

## Implementation

`wall-xray.js` owns shared cursor uniforms, cloned wall materials and instanced edge-line overlays. `HybridRenderer` separates wall batches from any floors/props sharing their material, and uses the effect only when its caller provides `wallXray`. `BattleRenderer` owns and disposes that effect.

The shader discards opaque wall fragments inside the screen-space circle; outline fragments are drawn only inside it, with 34% opacity and depth testing. Outside pixels keep their existing materials. Instance geometry, map data and shared source textures are unchanged. Wire batches use the parent instance bounds for frustum culling, are hidden when inactive, and are disposed when their source chunks are replaced.

The dedicated study map is opt-in; ordinary encounter loading still reads the shipped factory. Existing editor-playtest and saved-game loading take precedence.

## Validation

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
