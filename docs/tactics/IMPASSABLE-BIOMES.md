# Impassable biome regions — art and integration handoff

The dense regions in the user's tutorial reference are **fully impassable**. Clearings and corridors remain open. The art now supports large connected regions across all five environments, in addition to small pieces for inspecting materials and joins.

## Review views

- [Tutorial landscape](../../dist/tactics/biome-terrain-study.html): the saved 240 × 240 tutorial plateau, with whole-map, corridor, cliff-edge and clearing frames. The horse is at native scale in close views.
- [Local pieces](../../dist/tactics/biome-foliage-study.html?display=barriers): joined patches, bends, strips, single cells and a one-cell clear passage.
- [Paint/detail concept](../../dist/assets/environment/biome-obstacles/reference-v1.png) and [six-panel paint atlas](../../dist/assets/environment/biome-obstacles/paint-atlas-v1.png). Exact generation prompts are in [PROMPTS.json](../../dist/assets/environment/biome-obstacles/PROMPTS.json).
- [Refinement evidence](../../hybrid-review/biome-refinement/browser-checks.json), [performance measurements](../../hybrid-review/biome-refinement/performance.json), and [independent refinement review](../../hybrid-review/biome-refinement/independent/FINAL-REVIEW.md).
- The earlier a7a5aa4 evidence remains in `hybrid-review/biome-obstacles/`; it predates the architect’s repetition and rendering-cost findings.

The saved tutorial JSON contains the plateau elevations and 642 cliff props, but not the dense-region mask shown in the supplied screenshot. `biome-terrain-plan.js` therefore defines an explicitly **screenshot-inspired art fixture**, not an extraction of the user's exact foliage placements. It leaves the saved map untouched. All five environments use the same 31,460 blocked cells. Three accidental single-cell clear holes are sealed; the four saved start markers and exit have clear rooms and three-cell connections to open ground on their own elevation.

## Family contract

| Environment | Art identifier | Ground-level obstruction | Trees |
| --- | --- | --- | --- |
| Jungle | `jungle-root-tangle` | Dense vines, interlocking raised roots and broad leaves | Canopy trees and palms |
| Temperate | `temperate-bramble-deadfall` | Dense leafy brambles with fallen wood | Broadleaf and pine |
| Snow | `snow-windthrow` | Packed drifts, irregular fallen limbs and broken snags | Snowy spruce and alpine pine |
| Dry grassland | `dry-thorn-thicket` | Woody thorn scrub and tangled branches | Sparse acacia and scrub trees |
| Wetlands | `wetland-blackwater-bog` | Connected dark water and peat, with reeds at the outer shore | Sparse rooted cypress and willow |

These identifiers describe art. They are not registered gameplay terrain or prop types. Small ordinary grass/plant decorations from the previous foliage kit do not become impassable merely because they share a biome.

## Reusable pieces

`createBiomeObstacleMaterials(atlas)` supplies the new world-projected painterly materials. Combine them with `createBiomeMaterials(textures)` when constructing `createBiomeObstacleFactory(materials)`.

```js
const patch = obstacleFactory.create('wetlands', {
  cells: [[20, 30], [21, 30], [20, 31]],
  variant: 0,
  occupied: (x, z) => blockedAt(x, z) && heightAt(x, z) === floorY
});
patch.position.y = floorY;
scene.add(patch);
// When this patch is no longer needed:
obstacleFactory.release(patch);
```

- One cell is one world unit. Integer X/Z coordinates refer to tile centers; cell boundaries are at ±0.5. The returned root starts at `[0,0,0]`; place the group at the actual floor height. A region spanning floors must be split by elevation.
- Supply **full-region adjacency**, including a neighbor halo, through `occupied(x,z)` when producing chunks. Otherwise the default only knows the supplied local cells and will produce banks around that isolated patch. Chunk boundaries must not become artificial shorelines.
- A close patch accepts 1–256 unique integer cells. Its `userData.cells` and `userData.traversal.blockedCells` carry the same footprint. `bounds` are measured from rendered vertices. `gameplayIntegrated` stays false.
- The local-piece API offers `detailOnly:true` to omit base surfaces/crowns and `density(x,z)` to taper extra detail. A zero-density patch is valid, empty and finite. These pieces are not overlaid on the revised terrain surface: doing so requires explicit support fitting. The landscape now supplies its own grounded detail. No ground or traversal state changes with detail level.
- `release(root)` releases its instance buffers. `factory.dispose()` releases remaining roots and shared geometry once. Factories do not own caller-supplied materials or textures.

## Landscape rendering

`createBiomeTerrain(plan,family,materials)` reads `width`, `depth`, `cells`, `heightAt(x,z)` and `blockedAt(x,z)`. The plateau fixture is only one provider of that contract.

The renderer divides ground, cliffs, fill and tree instances into **24 × 24 spatial blocks**. Each mesh has local spatial bounds that include crown overhang; no vegetation batch spans the sector. Every frame, after updating the camera, call:

```js
terrain.update(camera, {
  focus: worldFocus, // THREE.Vector3, in scene/world coordinates
  ppu: pixelsPerWorldTile,
  trees: true
});
renderer.render(scene, camera);
```

Orthographic detail selection uses projected scale. Close views retain full tree geometry in every visible block, even at a low camera angle; offscreen blocks have a focus-distance halo and hysteresis. The whole-map view uses inexpensive tree silhouettes. Detailed shadows are confined to blocks within 28 tiles of the inspected area and disabled at overview scale. The renderer also sets the battle daylight rig’s existing `userData.noShadow` flag, so that rig does not re-enable distant shadows. This flag does not make the art gameplay-integrated.

`terrain.chunks`, `denseMeshes`, `groundMeshes`, `trees`, `fill`, and `stats` expose the visual data. Geometry remains map-local; a translated root is supported and the update converts the world focus correctly. Tile size remains one world unit. Dispose the terrain before disposing its caller-owned plant factory, materials and textures.

The continuous fill uses global fields for heights, normals, color and placement, so neither tiles nor render blocks introduce seams:

- Temperate/jungle/dry: broad overlapping patches with uneven heights, painted litter and thorn cover, leafy clusters, grass or leaf fans, and scattered fallen wood.
- Snow: one continuous drift surface, with hundreds of irregular partially embedded logs across the sector. There is no snow crown per tile.
- Wetlands: varied dark-water and shallow-bank color, sparse reed beds and marsh leaves. Shared shoreline vertices and broad convex-corner cuts replace the repeated scallops; short/narrow shapes cap the cuts to avoid self-crossing.

The old close-piece layer is no longer added on top of this landscape: its omitted support crowns left several twigs floating. The local-piece gallery remains available separately. All trees and added clusters conservatively fit within blocked cells at one elevation. No foliage triangle bridges a clear one-cell corridor in the regression fixtures.

Large views retain safe atlas filtering through `biome-atlas-lod.js`: close views use the painted panel; footprints above the safe mip range fade toward that panel’s linear-light average. The approved painted atlases and original plant sources are unchanged in this refinement.

## Rendering measurements

Measurements count **the complete render including shadows**. The study disables Three’s automatic information reset, which previously discarded the shadow contribution. `stats.visibleTriangles` is a main-view estimate, not a substitute for the complete renderer counter. Stored triangles include both LOD representations and likewise are not a frame workload.

Final measurements are in [performance.json](../../hybrid-review/biome-refinement/performance.json). The tool warms shaders first, completes GPU work, then samples 70 study redraws per case and 120 frames per battle case. The battle check uses the real `BattleRenderer` loop, four live actors, day lighting and shadows; it temporarily adds the full sector’s foliage around the camera. It does **not** register terrain, replace the authored map, or test the movement/visibility/collision rules. Ground meshes from the injected fixture are hidden to avoid duplicating the battle ground.

| Environment | Overview triangles | Corridor triangles | Corridor median completed redraw | Battle median draw |
| --- | ---: | ---: | ---: | ---: |
| temperate | 625,059 | 538,863 | 3.6 ms | 5.7 ms |
| jungle | 493,579 | 372,739 | 3.7 ms | 5.4 ms |
| snow | 306,291 | 614,635 | 2.9 ms | 4.7 ms |
| dry | 568,771 | 239,899 | 2.7 ms | 4.6 ms |
| wetlands | 336,239 | 96,987 | 2.6 ms | 4.5 ms |

The battle baseline without the injected foliage was 3.1 ms median draw time. All five visual-load cases retained four live actors and reported no renderer diagnostics. Full-sector stored geometry is approximately 0.53–2.50 million triangles including both LODs; overview submits only 0.31–0.63 million, and close views intersect only 7–8 block bounds. Actual submitted block IDs, including shadow passes, were also checked independently.

The tested desktop uses an NVIDIA RTX 3080 through Edge/ANGLE at 1500 × 1080. Timing results describe this controlled desktop check, not a portable FPS guarantee or a gameplay integration approval. The finished integration still needs an authored-sector playtest, moving cameras, combat effects, and representative slower hardware.

## Verification and remaining work

The initial review of a7a5aa4 is historical; the architect correctly identified repetition and full-sector submission as further work. The focused refinement now scores **9/10 for art-study readiness** in its independent review, with both follow-up blockers (floating details and tiled shores) resolved. Gameplay integration remains a separate gate.

- [x] Five family materials and continuous region appearances.
- [x] Same blocked mask and preserved routes in every environment.
- [x] Native horse, both plateau elevations and clear marker connections.
- [x] Full-mask chunk adjacency; no invented interior bog banks.
- [x] Close geometry stays within the declared cell union; triangle centroids and edge midpoints cannot bridge narrow routes.
- [x] Matching heights, normals and paint across 24-tile block joins.
- [x] Frustum culling, exclusive orthographic LOD, translated placement, and nearby shadow bounds.
- [x] Distant filtering; varied windthrow; softened detail transition.
- [x] Fifty-six related automated tests, including distribution import closure and asset copying.
- [x] Seventeen landscape/piece browser captures; zero runtime/request errors; stable repeated resource counts; resource ownership/double-disposal and failed-load cleanup.
- [x] Warmed redraw measurements and disposable live-battle rendering stress test for all five environments.
- [x] Original foliage gallery remains unchanged; its existing atlas/geometry/manifest tests pass, and its controls and local-piece view are exercised by the landscape browser check.
- [ ] Integrating agent maps actual ground families to the selected visual family.
- [ ] Integrating agent supplies the authored blocked mask and elevation/neighbor information.
- [ ] Integrating agent registers movement and visibility rules, preserves mission routes and checks editor save → load → playtest.
- [ ] Gameplay performance and collision review after that integration.

Commands:

```text
node --test tests/biome-obstacles.test.mjs tests/biome-terrain.test.mjs tests/biome-foliage.test.mjs tests/foliage.test.mjs tests/painted-grass.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-biome-obstacles.mjs
node tools/benchmark-biome-terrain.mjs
```

The browser scripts reuse the review server and close their own browser helpers. `BIOME_TERRAIN_URL`, `BIOME_REVIEW_URL`, `BIOME_REVIEW_OUTPUT` and `PLAYWRIGHT_PATH` allow local overrides.

The prior preview exited on its scheduled deadline and released port 4476. A new read-only preview was deliberately started and registered for this revision, with an actual shutdown timer at **14 October 2026, 17:19 EDT / 21:19 UTC**. Its local restart/ownership specification is `artifacts/biome-refinement/preview-spec.json`; the registration is `80a05bd8c35e4cfdb1bb807d91fb1bd6`. The private stop marker is `artifacts/intro-animation/server/STOP`. Temporary review browsers close in their scripts’ `finally` blocks. Checked-in source and screenshots remain after preview expiry.
