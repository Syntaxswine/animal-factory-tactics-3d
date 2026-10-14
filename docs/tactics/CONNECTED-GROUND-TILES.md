# Connected ground tiles

The prior ground pass shuffled 32 stamps over a repeating base texture. That still looked repetitive. The replacement generates a complete, seeded ground composition first, then paints neighboring tiles from their positions in that composition. Both the base fill and the debris vary across the map.

The useful precedent is `overmap-generator.js`: its settlements grow through connected frontiers, and its rivers/roads carry common connections across sector edges. The ground generator uses connected frontier growth for material beds and one shared coordinate system for continuous features. It does not import the strategic generator's map dimensions or gameplay rules.

## Inspect the result

Open `tactics/biome-terrain-study.html?biome=temperate&frame=ground&view=top&grid=1`.

- **Ground paint** hides trees and raised plants to expose the painted surface.
- **Tile grid** outlines eight by eight neighboring tiles in Ground paint, or 24 by 24 in route views. Logs, branches and material patches continue across them.
- **Landscape A/B/C** regenerates the whole composition from seeds 173, 829 and 1409.
- **Generated ground** compares against the prior repeating fill without changing geometry or the camera.
- **Corridor** restores the trees, raised foliage and native horse for blocked-region readability.

All five environments are covered: temperate leaf beds and low tangled stems, jungle broad litter and dark roots, snow with drift colors and partially buried deadfall, dry straw and bleached wood, and wetland peat/water colors with reed litter. Recognizable wood features must fit entirely on blocked ground at one elevation. Sparse flat flecks and a restrained colour wash soften the margin; bushes, banks and timber do not extend into open cells.

## Assets and generation

`dist/assets/environment/connected-ground/` contains five 512 by 512 PNG sheets and a manifest. Each sheet is an example of **64 adjacent tiles**, at 64 pixels per tile. The manifest records each tile's source rectangle and map coordinates. These are joined samples, not 64 interchangeable variants: do not shuffle them or repeat the sheet across a map.

Generate other coordinates with `createGroundComposition(plan, family, seed)` from `biome-ground-composition.js`, then `paintGroundRegion(composition, {x, z, width, depth, pixelsPerTile}, canvas)` from `biome-connected-ground.js`. Coordinates use the map's existing convention: tile `(0,0)` covers `[-0.5,0.5]` on each horizontal axis. Generate once per biome/seed and retain that composition across render chunks. `releaseGroundPaint(composition)` releases the painter's cached base Canvas when exporting outside a terrain lifetime.

Material regions grow through randomized neighboring frontiers. Their blended colors, density fields, brush beds and individual debris recipes use the saved seed. Every feature has its own shape seed, continuous position, size and angle. There is no finite feature-index table or `fract()`-repeated base texture in the generated layer. Shared world coordinates supply both sides of every tile/chunk border.

## Renderer and ownership

`createBiomeTerrain` keeps the existing arguments and accepts `paintSeed`, `groundSprites`, `edgeBlend` (default true) and an optional `onPaintReady` callback. The renderer calls `terrain.update(camera, {focus, ppu, trees})` as before. An event-driven viewer supplies `onPaintReady` to redraw when paint arrives; a continuous battle loop can simply redraw normally. `terrain.groundSkin.whenReady()` waits for the overview and the currently requested nearby pages. Check it before capturing final artwork.

The terrain owns one module Worker and a cache of at most 16 detail pages. Painting runs in the worker; camera updates request work without drawing Canvas strokes. One request is in flight at a time, so rapid camera changes cannot build an unbounded queue. A small unique overview appears immediately, then receives painted detail. Nearby cached pages survive camera revisits and zoom changes. Least recently used pages outside the requested set are evicted when the cache is full.

Each 24 by 24 render block uses a 32-pixel-per-tile page with a one-tile gutter on every side (832 by 832 pixels). All gutters come from the same world composition. The shader blends from detail to the full-map overview between 18 and 24 tiles from the focus. It uses map-local positions, including when the whole terrain root is translated. No extra debris geometry, shadow casters or draw calls are added.

At a saturated cache, estimated additional texture storage is about 58.5 MiB including mipmaps and the two R8 margin maps (0.93 MiB together). Both ground layers share their chunk page; the margin does not duplicate the paint cache. Retained Canvas/ImageBitmap storage is about 43.1 MiB, plus roughly 3.6 MiB for the worker's broad base paint, about 0.93 MiB for the margin maps' CPU arrays, and generator metadata. Typical narrow inspection views request fewer pages. These are allocation estimates, not measured total process memory. Grey forms retain layout metadata without starting a worker or allocating paint textures.

`terrain.dispose()` terminates its worker, closes transferred bitmaps, disposes owned textures/material clones and clears painter caches. Pending `whenReady()` calls resolve `false` on disposal, and worker failures reject them. Borrowed plant materials and their atlases remain owned by their caller.

## Validation and handoff

```text
node tools/check-connected-ground.mjs
node tools/check-forest-edge.mjs
node --test tests/biome-ground-edge.test.mjs tests/biome-connected-ground.test.mjs tests/biome-ground-sprites.test.mjs tests/biome-terrain.test.mjs tests/biome-obstacles.test.mjs tests/biome-foliage.test.mjs tests/foliage.test.mjs tests/painted-grass.test.mjs tests/tactics-3d-deployment.test.mjs
```

The first command exports the joined example sheets and captures all five environments. It compares 64 independently painted tiles against one complete painting, exercises full-cache eviction and nearby revisits, checks cancellation during worker painting, verifies texture/bitmap disposal, and checks mobile controls and browser errors. Tiny differences from Canvas edge rasterization are recorded rather than claimed to be exact pixel identity. The forest-edge checker captures before/after, gameplay grid on/off, top and close views for all five environments. Re-export the historical atlas with `tools/export-biome-ground-sprites.mjs` only when its shared drawing routine changes.

Unit checks cover connected regions, deterministic seeds, unique feature recipes, nonperiodic base fields, multi-tile/multi-chunk wood, footprint safety, spatial queries, exported coordinates and deployment packaging. Review evidence and completed performance measurements belong in `hybrid-review/connected-ground/`.

This remains an art and rendering study. The screenshot-inspired tutorial mask and saved map are unchanged. The integrating agent still needs to select the biome from authored ground, supply authoritative blocked masks, retain the seed with the map, and validate movement and mixed-biome boundaries in gameplay. The example sheets are not a gameplay terrain registry.

The retained localhost preview on port 4476 keeps its existing fixed expiry: **14 October 2026 at 17:19 EDT / 21:19 UTC**. This work does not restart it or extend that deadline; its restart record remains in `artifacts/biome-refinement/preview-spec.json`.

## Baseline review: 87bb88e

All **75 focused tests pass**, including the actual 3D distribution and worker-module closure. The [independent review](../../hybrid-review/connected-ground/independent/FINAL-REVIEW.md) rates this **9.0/10 for study readiness**, subsequently approved by the architect as a working ground baseline. Gameplay integration remains pending. The builder and independent evidence includes pixel joins, native-scale route readability, seed changes, grey/mobile views, cache saturation, responsive cold page requests, cancellation and complete worker/bitmap/material teardown.

The [completed performance fixture](../../hybrid-review/connected-ground/performance/performance.json) used the real battle render loop with four actors and shadows, at 1500 by 1080 on the review desktop (RTX 3080, Edge/ANGLE). It injected terrain visuals; it did not wire gameplay or test other hardware. Baseline median draw time was 2.5 ms.

| Biome | Corridor completed redraw, median | Battle draw, median | Battle draw, p95 |
| --- | ---: | ---: | ---: |
| Temperate | 2.7 ms | 4.2 ms | 5.3 ms |
| Jungle | 2.0 ms | 4.8 ms | 6.5 ms |
| Snow | 1.5 ms | 3.7 ms | 4.4 ms |
| Dry | 2.3 ms | 4.7 ms | 6.6 ms |
| Wetlands | 1.8 ms | 4.9 ms | 6.2 ms |

All measured battle median frame intervals were about 16.6-16.7 ms. Cold biome/seed changes still rebuild terrain and await worker detail: independent ready times were about 1.6-3.4 seconds, with the coarse composition visible meanwhile. Cold page requests themselves measured 0-0.1 ms on the main thread; a responsiveness timer remained within 11.6 ms.

## Forest-to-path refinement

Open `tactics/biome-terrain-study.html?biome=temperate&frame=boundary&scale=game&grid=0`. **Forest margin**, **Gameplay (32 px/tile)** and **Tile grid** provide the requested comparison. **Soften margins** switches between the revised surface transition and the hard-edged baseline. The horse stays at native scale.

The margin borrows the ordinary ground's actual atlas, sampling coordinates and distant colour. It blends this surface into the generated forest paint over 0.85 tile on the blocked side and roughly 0.28 tile on the open side. A full one-tile route retains an untouched centre. A global distance texture keeps the blend continuous across render blocks. Eight-neighbour elevation barriers prevent interpolation from bringing paint across a different cliff level, including diagonal corners.

Only the shallow foot of the existing cover changes height: its toe settles to 0.003 tile and shares the top's smooth lighting. The old square trim disappears without adding polygons. Interior drift heights, horizontal footprints, trees, obstacle bounds and the saved movement mask stay unchanged. Temperate brush marks are capped in world units: leaves are at most 0.22 tile long and fine stems at most 0.78 tile, independent of the size of the surrounding paint bed.

The tiny margin flecks are colour on the existing ground mesh. They have no collision, height, geometry or shadows. Raised obstacles and recognizable multi-tile wood remain confined to blocked cells at one elevation. This is surface dressing, not an extension of the walkable or blocked area. Pass an ordinary-ground material from `createBiomeGround` when constructing the terrain to supply the matching atlas. Both material layers share their page, and entirely open chunks adjoining blocked chunks can request their fringe page.

The eight new boundary tests cover continuous straight seams, one-cell routes, diagonal passages, isolated blocked tiles, chunk borders, untouched route centres, concave toe heights, and cardinal/diagonal cliff isolation. Mesh containment now runs for all five biomes. Final comparison and review evidence belongs in `hybrid-review/forest-edge/`.

All **85 focused tests pass**, including asset fingerprints and the complete 3D distribution/module closure. The [independent review](../../hybrid-review/forest-edge/independent/FINAL-REVIEW.md) scores this pass **9.0/10**, with sixteen fresh views covering all five biomes at gameplay size with the grid both on and off. The reviewer found and verified the repair of a diagonal cliff-filtering defect: changing occupancy only on the upper level now changes zero lower-level pixels in the rendered test. All 209 observed owned textures/materials were disposed exactly once; borrowed ground resources remained live until their owner disposed them.

The [cache/export check](../../hybrid-review/forest-edge/builder/connected-ground.json) confirms that the path and forest layers share detail pages, the cache remains bounded at sixteen pages, warm revisits do not repaint, and cancellation closes bitmaps and terminates the worker. Its saturated texture estimate is 61,277,782 bytes (58.44 MiB), including both edge maps. The accompanying source manifests and temperate sample sheet have been regenerated.

The [updated performance fixture](../../hybrid-review/forest-edge/performance/performance.json) includes the blended ordinary-ground meshes in the actual battle render loop, with four actors and shadows. It used the same 1500 by 1080 viewport and RTX 3080/Edge/ANGLE desktop as the baseline. It is a visual stress fixture, not gameplay integration. Because the earlier fixture hid those ordinary-ground meshes, these measurements are not a direct before/after rendering-cost comparison. The empty-fixture battle median draw time was 3.0 ms.

| Biome | Corridor completed redraw, median | Battle draw, median | Battle draw, p95 |
| --- | ---: | ---: | ---: |
| Temperate | 3.5 ms | 5.4 ms | 6.7 ms |
| Jungle | 2.7 ms | 6.1 ms | 7.1 ms |
| Snow | 1.7 ms | 4.6 ms | 5.8 ms |
| Dry | 1.9 ms | 4.7 ms | 6.2 ms |
| Wetlands | 2.5 ms | 4.8 ms | 6.1 ms |

Median battle frame intervals were 16.6–16.8 ms. There were no browser or shader errors. Temporary comparison and performance browsers closed through their owning cleanup paths; the retained preview keeps the fixed expiry above. Gameplay wiring, mixed-biome map validation and final user art approval remain separate.
