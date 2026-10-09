# Destroyed upper-floor edges

Missing structural floor tiles now leave a continuous jagged perimeter on the surviving slab. Adjacent missing tiles join into one open hole. Chipped concrete, splintered wood and asphalt examples use the original floor height, thickness and surface paint.

Base: `7734034`, the approved destroyed-wall edges. Delivery branch: `work/destroyed-floor-edges`.

## Completed

- [x] Track removed upper-floor tiles using original `definition.upper` versus current `upper`.
- [x] Generate only the perimeter on surviving tiles, including rows, blocks, L shapes, diagonal/separate holes, islands and cuts reaching the outer edge.
- [x] Keep every rim inside its surviving tile footprint. Shared intact joins meet exactly.
- [x] Close the top, fractured side and underside with correct outward normals.
- [x] Preserve native 0.12-tile slab thickness and 2.12-tile floor spacing.
- [x] Keep original authored voids and stairwells clean. Exclude original/current roof-module and cliff-support footprints, ground terrain, and decorative canopy level 3.
- [x] Preserve the floor's material and world texture coordinates, including wooden planks, grass, woodland and diagonal road paint.
- [x] Reuse gameplay/editor rendering, visibility, selected-level X-ray cutaway, and owned geometry/material disposal.
- [x] Detect replacement original floor definitions even when current surviving geometry is unchanged.
- [x] Preserve the visible damage across encounter save/load and restore intact slabs during a pending grenade's scenery rewind.
- [x] Supply a comparison with both upper floors and above, below, top and side views.
- [x] Independent hostile review: **9.1/10, no blockers**.

## Integration boundary

This delivery supplies damaged-floor presentation. The existing blast code in this branch removes walls and cover but does **not** remove ordinary structural slabs. It still needs structural damage rules, collapse timing, and falling-character/unsupported-object handling before explosions can remove occupied floors safely.

The renderer already responds when an upper tile is removed with the existing `setTerrain(state,x,y,z,'void')` transaction. The comparison makes these removals explicitly. The live browser check similarly injects removed upper tiles into a paused encounter to verify the real renderer; it is not evidence of explosion-driven floor collapse.

Existing navigation and projectile queries already understand absent upper tiles. Rendering adds no support or collider inside a hole. Roof modules retain their own models and are deliberately excluded from this ordinary-floor treatment.

Integration follow-up:

- [ ] Decide which floor materials can fail, and at what damage thresholds.
- [ ] Remove structural tiles in an authoritative transaction that also resolves occupants, supported objects and access links.
- [ ] Include the old tile identities/materials in the destruction presentation receipt, so damage can remain synchronized with blast timing.
- [ ] Reconcile visibility, support, saves and queued actions after a collapse.
- [ ] Review an actual explosive collapse above an occupied lower floor.

## Files and review

`floor-breaches.js` resolves the perimeter masks and preserves material identity. `floor-breach-geometry.js` creates shared closed meshes. The ordinary environment pipeline selects those shapes automatically, and both battle and editor material paths retain painted grass/road shaders under the damage prefix.

Open `tactics/floor-breach-study.html`. Size widens the selected layout; Restore Floor returns to its original state. The small clean opening is an authored stairwell. The underside cutaway hides lower floor surfaces and adds inspection lighting. The horse stays on a supported tile, including the one-tile island.

Validation:

- **61 focused tests passed**, including floor/wall geometry, shared rendering, saves, existing grenade presentation, X-ray, wood floor paint and distribution packaging.
- All **135** possible rim mesh variants are closed, bounded and outward-facing. Rays hit surviving slab tops and undersides at the exact prototype heights; removed tile centers remain clear.
- The hostile reviewer independently completed **1,156 visual, collision and grenade-volume clearance probes** across 48 cases, plus 14 fresh images.
- **72 browser configurations passed** with no errors. Repeating the warmed cases keeps GPU resources unchanged at 54 geometries and 13 textures.
- A paused live encounter renders all eight damaged tiles around a 2×2 hole, preserves X-ray level materials, hides unseen scenery, and rebuilds correctly after replacing the original floor definition.
- Special grass, woodland and diagonal-road materials retain their painted atlas and shader path.
- Pages distribution build and dependency-closure checks passed.

Reproduce:

```text
node --test tests/floor-breaches.test.mjs tests/wall-breaches.test.mjs tests/hybrid-materials.test.mjs tests/environment-models.test.mjs tests/hybrid-world.test.mjs tests/hybrid-geometry.test.mjs tests/editor-3d.test.mjs tests/wall-xray.test.mjs tests/encounter-save.test.mjs tests/painted-environment.test.mjs tests/wood-plank-floor.test.mjs tests/grenade-blast.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-floor-breaches.mjs
```

Set `PLAYWRIGHT_PATH` to an installed Playwright package. `FLOOR_BREACH_REVIEW_URL` optionally overrides the default origin, `http://127.0.0.1:4476`. Local reports and screenshots are in `artifacts/floor-breaches/`.

All temporary review browsers closed in `finally`; their exact process identities and successful exit receipts were verified. The existing registered port 4476 preview remains available until its unchanged automatic shutdown, October 9, 2026 at 22:30 UTC (6:30 p.m. Eastern). The graceful stop marker is `artifacts/grenade-blast/server/STOP`; restart sources are registered with the shared helper lifecycle utility.

Canonical merge and publication remain separate. The Pages workflow deploys only `main`.
