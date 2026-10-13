# Impassable biome regions — art and integration handoff

The dense regions in the user's tutorial reference are **fully impassable**. Clearings and corridors remain open. The art now supports large connected regions across all five environments, in addition to small pieces for inspecting materials and joins.

## Review views

- [Tutorial landscape](../../dist/tactics/biome-terrain-study.html): the saved 240 × 240 tutorial plateau, with whole-map, corridor, cliff-edge and clearing frames. The horse is at native scale in close views.
- [Local pieces](../../dist/tactics/biome-foliage-study.html?display=barriers): joined patches, bends, strips, single cells and a one-cell clear passage.
- [Paint/detail concept](../../dist/assets/environment/biome-obstacles/reference-v1.png) and [six-panel paint atlas](../../dist/assets/environment/biome-obstacles/paint-atlas-v1.png). Exact generation prompts are in [PROMPTS.json](../../dist/assets/environment/biome-obstacles/PROMPTS.json).
- [Builder browser evidence](../../hybrid-review/biome-obstacles/browser-checks.json) and [independent review folder](../../hybrid-review/biome-obstacles/independent/).

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
- The terrain study keeps expensive roots, twigs and logs local. `detailOnly:true` omits duplicate base surfaces/crowns; `density(x,z)` tapers extra detail over a radius. A zero-density patch is valid, empty and finite. No ground or traversal state changes with detail level.
- `release(root)` releases its instance buffers. `factory.dispose()` releases remaining roots and shared geometry once. Factories do not own caller-supplied materials or textures.

## Landscape rendering

`createBiomeTerrain(plan,family,materials)` reads `width`, `depth`, `cells`, `heightAt(x,z)` and `blockedAt(x,z)`. The plateau fixture is only one provider of that contract.

The renderer batches connected ground and undergrowth, with inexpensive instanced crowns and banks. Trees reuse the approved biome geometry. Their entire conservative crown footprint must fit inside blocked cells at one elevation; trees cannot bridge cliffs or project over a clear tile. Outer corners are inset, and bog interiors have no repeated banks or solid stepping-stone islands.

Large views retain safe atlas filtering through `biome-atlas-lod.js`: close views use the painted panel; footprints above the safe mip range fade toward that panel's linear-light average. This avoids both fine moiré and color contamination from neighboring panels. The original foliage manifest was refreshed for this shared paint change.

The 240 × 240 studies stay below four million base triangles per family and below twelve instanced batches. These are art-viewer budgets, **not a gameplay performance approval**. Integrating camera/chunk streaming and matching collision/visibility behavior remains the gameplay agent's work.

## Verification and remaining work

The independent final review scored **9/10 for art-study readiness**, with no remaining blockers. It checked 3.7 million actual temperate instance vertices with zero spills into clear cells, reran 44 foliage/obstacle tests, and verified 119 resource releases. [Final review](../../hybrid-review/biome-obstacles/independent/FINAL-REVIEW.md). User art approval and gameplay integration are still separate.

- [x] Five family materials and continuous region appearances.
- [x] Same blocked mask and preserved routes in every environment.
- [x] Native horse, both plateau elevations and clear marker connections.
- [x] Full-mask chunk adjacency; no invented interior bog banks.
- [x] Close geometry stays within the declared cell union.
- [x] Distant filtering; varied windthrow; softened detail transition.
- [x] Fifty related automated tests, including distribution import closure and asset copying.
- [x] Seventeen landscape/piece browser captures; zero runtime/request errors; stable repeated resource counts; 118 watched resources released exactly once; failed-load cleanup.
- [x] Original foliage gallery regression: ten captures, zero errors and stable resource counts.
- [ ] Integrating agent maps actual ground families to the selected visual family.
- [ ] Integrating agent supplies the authored blocked mask and elevation/neighbor information.
- [ ] Integrating agent registers movement and visibility rules, preserves mission routes and checks editor save → load → playtest.
- [ ] Gameplay performance and collision review after that integration.

Commands:

```text
node --test tests/biome-obstacles.test.mjs tests/biome-foliage.test.mjs tests/foliage.test.mjs tests/painted-grass.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-biome-obstacles.mjs
node tools/check-biome-foliage.mjs
```

The browser scripts reuse the review server and close their own browser helpers. `BIOME_TERRAIN_URL`, `BIOME_REVIEW_URL`, `BIOME_REVIEW_OUTPUT` and `PLAYWRIGHT_PATH` allow local overrides.

The retained preview on port 4476 keeps its existing fixed shutdown: **13 October 2026, 13:37 EDT / 17:37 UTC**. Its restart record remains in `artifacts/biome-foliage/preview-restart.json`; the current work does not extend that lifetime. Checked-in sources and screenshots remain available after it stops.
