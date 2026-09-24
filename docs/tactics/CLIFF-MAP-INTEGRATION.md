# Cliff map integration and climbing handoff

This records the original terrain integration. Current automatic full-ledge walking surfaces and climb routes are documented in [Cross-floor navigation](CROSS-FLOOR-NAVIGATION.md). Traversal core changes now live in `tools/core-cliff-adapter.mjs`.

The 3D editor now paints ledges and crags into saved maps and reusable blocks. The battle renderer displays the same joined geometry. This supersedes the study-only status in the September 23 cliff review.

## Authoring

Choose **Cliffs**, then form, contour and surface. Drag a rectangle; **Erase cliffs** clears only cliff props. Copy selected settings, save/load, export/import, block placement and undo/redo preserve cliff metadata. A stroke is rejected atomically if it conflicts with another object or a required start/exit.

Cliffs are one-cell props, `cliff-ledge` or `cliff-crag`, with optional `cliffMask` (1–15; default 15), `cliffVariant` (0–2; default 0) and `cliffSand` (0–1; ledge default 0, crag default 1). Mask bits match the river kit: NW=1, NE=2, SE=4, SW=8. Adjacent occupied corners must agree. Start with full rectangles; shaped edge tiles must match their neighbors. Rotation is expressed through the corner mask rather than prop rotation. Maximum 512 tiles per map.

Cliff tiles may occupy supported ground or water. Ordinary props still require floor support. Upper-level cliffs require supported upper terrain. No changes are made to the default factory or the 2D game's prop catalog.

## Current behavior

- Ground navigation blocks the entire authored tile, including the empty part of a partial contour. There is no automatic climbing, swimming, elevated standing, or landing route.
- Core projectile traces use the welded triangles, including partial contours and crag heights. The 3D awareness system uses those same traces for sight and light occlusion. Generic low-cover boxes are disabled for these props.
- Rendering welds the whole floor's cliff patch before hiding unknown triangles. Discovering a neighboring tile cannot reshape an already visible ledge/crag join.
- Grass/sand blends affect paint only. Water-adjacent cliff material is enabled when a floor's patch contains a water tile; the study's separate shoreline-contact water surface is not added here.
- Legacy hybrid sandbox `traceWorld` does not trace these triangles. Gameplay uses the adapted core `traceProjectile`, not that sandbox collision path.

## Climbing agent connection points

`cliff-map.js` owns saved metadata and `cliffTiles(props, level)`. `cliff-map-geometry.js` exports `cliffSurfaceAt(props, x, y, level)` and `cliffRayHit(props, origin, direction, reach)`. Heights use core coordinates: base = `level * 3`, ledge top = base + 2. Rendering uses base = `level * 2.12`; do not convert height by assigning an integer floor to a cliff top.

`cliffSurfaceAt` returns the actual surface height, family, and a **family-level** `climbable` hint. It is not a body-sized landing clearance test or route authorization. Crag faces must not make otherwise usable upper ground inaccessible: evaluate the approach face, upper support, slope, body footprint, occupancy, access direction, and headroom separately. Rough sloping rock itself need not be a valid landing. Do not infer upper support merely from the prop's solid ground footprint.

The approved terrain kit also exposes `cliffTileGeometry(...).userData.rim` and traversal descriptors. Create explicit safe routes from those surfaces; connect movement cost, cancellation, AI/pathing, save/load and climbing animation in the separate task. A climb from water remains a separate rule.

Core changes must be made in `tools/core-clock-adapter.mjs`, then regenerated with `node tools/sync-tactics-core.mjs`. Do not directly edit generated core files.

## Verification

Full regression run: 834 passing tests and asset validation. Six focused cliff tests pass, including the additional body/light occlusion case. Core synchronization and the Pages build pass. An Edge browser check painted a mixed water-supported patch, verified the controls, opened it through the editor's Playtest action, and confirmed matching saved props and rendered cliffs with no browser errors.
