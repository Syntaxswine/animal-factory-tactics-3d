# Painted trees and grass

The hybrid renderer, editor preview, and environment workshop share the updated trees and grass. `tactics/foliage-study.html` places them beside the approved horse at 58 CSS px/unit (gameplay) and 125 CSS px/unit (close inspection). Drag to inspect other sides. The standard tile dimensions and character scale are unchanged.

## Presentation

- Broadleaf: one connected, asymmetric lobed canopy, branching trunk, painted leaves and bark, and flared roots tapering below the ground.
- Pine: three overlapping tapered foliage masses with subtly uneven hems. Per user feedback, the individual branch fans and twigs were simplified; needle detail stays in the painted surface. Pine paint follows the cone UVs from hem to tip, repeating only around its circumference, so branches hang downward on every side.
- Grass: quieter painted ground with sparse folded 3D blades. Placement is deterministic by tile/floor; prop footprints, water, concrete, floors, gravel and void receive no tufts. Yard receives less grass than meadow/woodland.
- The foliage atlas also updates the existing shared leaf materials on shrubs and other plant props. Their geometry remains unchanged.

`foliage-models.js` owns the tree descriptors and grass placement. `environment-geometry.js` provides shared instanced geometries. `foliage-materials.js` projects the painted atlas, using local cylindrical coordinates for bark, native tier UVs for pine, and blended world planes for other foliage. Pine mirrors only horizontally and clamps vertically; other material mappings mirror both coordinates. Each mapping uses an inset inside its atlas panel, so repetition boundaries meet without sampling unrelated panels. This is mirrored texture repetition, not a claim that the generated raw image has numerically identical opposing edges.

The atlas is shared across materials and disposed once. The renderer retains its existing material/shape/chunk instancing and unchanged-chunk reuse. No new collision, movement, shot, visibility or cover rules are introduced; presentation instances retain their source tile/floor for fog filtering.

## Validation and scope

The browser review script is `tools/foliage-review.mjs`; evidence and exact measurements are in `hybrid-review/foliage/`. It checks six native/close orbits, mobile framing, the 76-entry environment catalog, fog and upper-floor exclusion, identical chunk reuse, twelve changed rebuilds, unchanged collision data and a 32×32 grass scene with 64 trees. The stress scene rendered 103,048 triangles in 29 calls, retained 17 geometries and 9 textures, and recorded approximately 16.9 ms p95 frame time on local Windows/Edge. These are local observations, not universal hardware guarantees.

Original 2D sprites and the default 2D renderer remain available. This branch carries a visual revision for architect review; it does not publish the separate 3D project. The scenery still uses the prototype collision volumes, so painted canopy outlines are not precise shot silhouettes. Source paint repeats over large areas; small twig/leaf animation and seasonal variants are outside this pass.

The full `npm run check` passes all 506 tests and asset validation; `npm run build:tactics-3d` succeeds. Game and editor hybrid pages also load and draw without page errors, failed page requests or renderer diagnostics. The independent [hostile review](hybrid-review/foliage/HOSTILE-REVIEW.md) scores this bounded update **9/10**.

## Asset and prompt record

Built-in imagegen tool, imagegen skill, September 22, 2026. Generated output was inspected and copied unchanged into the repository:

`dist/assets/environment/painted/foliage-atlas-v1.png` — returned 1254×1254 RGB atlas, grass/broadleaf/needles/bark quadrants.

Prompt:

Use case: stylized-concept. Create a production texture atlas for a hand-painted isometric tactical game with bright illustrated animal workers. Single square 2048x2048 opaque image divided into exactly FOUR EQUAL square quadrants, touching, with absolutely NO gutters, borders, labels, text, objects, ground shadows or perspective. TOP LEFT: top-down low meadow grass ground, subdued olive/sage green base, sparse small individual straw strokes, broad subtle irregular painterly color patches, quieter than a character, no tall tufts, no repeating checker, no flowers or stones. This quadrant must tile seamlessly on all four edges. TOP RIGHT: densely overlapping small broadleaf leaf clusters, spring/olive green, angular brushy highlight marks, rich but not black shadow pockets, flat canopy surface filling entire square, no isolated tree, no holes or sky; seamless. BOTTOM LEFT: dark cool pine needle foliage filling entire square, purposeful needle fans and tiny yellow-green highlights, hand-painted clusters with broad dark shapes and crisp details, seamless. BOTTOM RIGHT: medium warm brown deciduous bark, upright branching narrow grooves and broken chunky brush facets, weathered matte ridges, no boards or knots shaped like circles, seamless left/right and top/bottom. Every quadrant is a full square material swatch without margins. Strong painterly form readability but restrained high-frequency detail. No photorealistic noise, shiny plastic or render lighting. Quadrant grass should be lighter and quieter than dark canopy, the foliage should feel lush and healthy, not autumnal or yellow.

Pine direction correction: the original painted atlas is reused unchanged. No new image generation was needed; removing vertical mirroring and world projection restores its authored downward branch direction.

## Separate 3D project integration

The foliage revision is integrated into the playable 3D project and its map editor. The editor shares the foliage atlas and shader mapping with the battle renderer, including dimmed lower floors and shared-texture disposal. `tools/foliage-editor-review.mjs` checks painted tree/ground materials and lower-floor variants without browser errors. Integration validation passed 559 tests, the Pages build, and verification of all 20 unchanged pinned gameplay modules. Foliage browser checks also passed fog/floor filtering, collision preservation, and stable geometry/texture counts across rebuilds.
