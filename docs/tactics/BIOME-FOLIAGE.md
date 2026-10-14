# Biome foliage and ground art

Five environment families are integrated into the editor and gameplay: jungle, temperate, snow, dry grassland and wetlands. The artist's assets and procedural terrain were imported from `work/biome-foliage` at `bdfb813` without merging its unrelated animation work.

The original art package supplies reusable Three.js factories, exported ground images and comparison viewers. The live integration selects those factories from a map's saved environment profile or explicit ground tiles. Collision and movement continue to use the saved foliage overlay.

## Editor and gameplay integration

- **Foliage** paints density and passability on outdoor levels 1–3. Passable areas are light woods: widely spaced trees above grass, reeds or ferns, with no continuous shrub fill. Only isolated trunk tiles block walking; the same deterministic positions drive rendering and pathfinding. Tree candidates need a clear 5×5 patch and stay away from roads, clearings, structures, starts and access points. Blocked areas receive continuous painted ground, broad low-poly masses and crown-safe trees. The artist's study mask is never substituted for authored foliage.
- **Tiles** includes Jungle floor, Temperate meadow, Snow and winter grass, Dry grassland and Wetland grass, with previews of the actual paint. These override automatic family selection locally. Ordinary grass follows the overmap environment profile; older maps without a profile keep a temperate default, with dry plants on dirt/gravel.
- Existing broadleaf/pine objects, including large forms and their rotation, select matching tree models. Their existing trunk collision rules remain unchanged.
- `biome-gameplay.js` adapts the saved map into per-floor/family plans. It protects water, roads, object footprints and missing upper surfaces, and uses the actual 2 m cliff cap height. `biome-map-paint.js` blends ground families, including a halo matching adjacent sector profiles. `biome-scene.js` is shared by the inspection and battle renderers.
- Plans and art placement are deterministic. Saves and blocks retain their existing ground/foliage metadata, so there is no extra generated art state to migrate. Density changes grass and the number of isolated trees, but even maximum-density passable woods keep wide walking gaps. Impassable areas block every painted cell regardless of visual density.
- Fog clips terrain and plant fragments; batches containing unexplored ground do not cast revealing shadows. Level visibility and editor dimming are preserved. At overview scale, small passable plants are omitted and dense forest uses simplified tree silhouettes.
- Detailed forest paint uses owned module workers and a shared budget of at most 16 resident pages across active plans. Replacing or closing a scene terminates its workers and releases its textures and geometry. Existing visuals remain available while the new atlases load or if loading fails.

Open `tactics/editor-3d.html?editing=1&study=biomes` for an editable five-family fixture with a narrow passage and foliage on all three playable levels. Its Playtest button uses the normal editor handoff. `tactics/battle-3d.html?study=biomes` opens the same fixture directly.

Strategic environment profiles and their base ground edges match across sectors. Connected forest debris is generated within the loaded local map and respects its mask; it does not yet join a log or shrub across two independently authored sector borders. Actual campaign sector-template assignment remains separate work.

## Additional blocker artwork for the architect

Passability describes whether a character can cross an area, not what it is made of. Rocks, ravines, brambles and bogs can all block movement. Their concealment, ballistic cover, height and climbability must remain separate gameplay properties; a bare ravine must not acquire foliage concealment simply because it blocks walking.

The current art already covers open woodland trees/understory, jungle root tangles, temperate bramble/deadfall, dry thorn thickets, snowy windthrow/drifts and wetland bogs. No replacement trees or shrubs are needed for the current integration.

Additional asset requests, in priority order:

1. **Rock and boulder fields.** Individual 1×1, 1×2 and 2×2 obstacles plus a connected scree/rock-fill surface. Supply a sparse rocky margin and a densely blocked interior, with 3–4 silhouette variants and paint variations for all five environments. Keep the actual blocked footprint explicit so visible gaps can remain walkable.
2. **Ravine / fissure kit.** A continuous open cut with straight sections, bends, inner/outer corners, ends and junctions; include stepped diagonal edges and an optional widened interior. It needs near and far banks, readable vertical depth, and adjoining ground that accepts the local biome paint. Author to the existing tile grid and level-height conventions. Expose the void footprint and edge profiles rather than baking in a walkable floor. Climbable faces and crossings are separate choices.
3. **Shared transitions.** For both sets, provide clear boundary/margin pieces that meet open grass, light woods and existing cliffs without a visible square rim. Snow, moss, dust and wet staining should mostly come from skins rather than added small meshes.

For every kit, record stable IDs, bounds, occupied cells, pivot/orientation and edge attachment profiles; identify which rotations/mirrors are supported. Include a joined-patch study, a narrow walkable-gap study and a raised-level example. Rendering may overhang a blocked footprint, but it must not visually close a declared walking route. Keep large-area fills low-poly and batchable, with simplified distant forms where needed. This is an art handoff; rock/ravine brush modes and their new gameplay rules are not part of the current foliage integration.

Integration verification (2026-10-13): the focused art/foliage/environment/packaging suite passes, including 13 new gameplay integration cases. Browser checks covered the overmap's Snow preview, the five-family editor fixture, its normal Playtest handoff, and painting/undo/redo on the raised third level. Core regeneration and the 3D Pages build pass. These results do not replace slower-hardware performance testing.

## Contents

| Art family | Trees | Low plants | Ground |
| --- | --- | --- | --- |
| Jungle | Buttressed canopy, arching palm | Broad leaves, fern | Dark jungle floor |
| Temperate | Approved broadleaf and pine forms | Shrub, meadow tuft | Temperate meadow |
| Snow | Narrow spruce, open alpine pine | Snowy scrub, winter grass | Snow with exposed grass |
| Dry grassland | Flat acacia crown, angular scrub tree | Straw tussock, dry shrub | Dry ochre grass |
| Wetlands | Flared cypress, hanging willow | Reeds, broad marsh leaves | Wet grass plus damp mud |

There are **10 tree designs**, each in normal and 1.8× mature sizes, with **three arrangements**; **10 low plants**, each with three arrangements; and **24 ground PNGs** (six sets with four patterns). That gives 90 plant appearances. Temperate tree arrangements reuse the approved geometry with rotation; the other forms also vary their branch or leaf layout. These are deterministic arrangements, not three separate hand-painted skins.

The original approved foliage atlas supplies temperate foliage, bark and selected reusable materials. New generated artwork supplies the biome paint atlas, ground atlas and concept sheet. Exact prompts are preserved in [PROMPTS.json](../../dist/assets/environment/biome-foliage/PROMPTS.json). The generated source PNGs remain unchanged.

## Review

Open [the local foliage viewer](http://127.0.0.1:4476/tactics/biome-foliage-study.html) or serve `dist` and visit `tactics/biome-foliage-study.html`.

- All-five comparison, individual families and a horse at native scale.
- Normal/mature trees, arrangements A–C, grey geometry and tile grid.
- Front, three-quarter and top views; fit or gameplay-scale framing; drag to orbit.
- Ground view compares four patterns; wetlands also displays the mud strip.
- [Actual browser gallery](../../hybrid-review/biome-foliage/all-families.png), [ground comparison](../../hybrid-review/biome-foliage/ground-patterns.png), and [painted reference](../../dist/assets/environment/biome-foliage/reference-v1.png).

The reference is an art direction sheet. The browser captures show the actual low-poly assets.

The existing preview on port 4476 is retained for user review until **October 13, 2026, 1:37 p.m. Eastern**. Its existing automatic shutdown remains in effect. Its helper/restart record lives under `artifacts/intro-animation/server`; the server serves this checkout's `dist` directory.

## Plant contract

[manifest.json](../../dist/assets/environment/biome-foliage/manifest.json) contains stable art IDs, family membership, precise bounds, triangle counts and materials for all 90 appearances. Source hashes help detect stale metadata. These semantic art IDs need an explicit mapping to the integration agent's gameplay terrain/prop IDs.

One game cell is **one world unit**. Every returned plant root starts at local `[0, 0, 0]`, and its lowest actual vertex touches local Y=0. Grounding is applied inside the root, so ordinary placement on an elevated floor is safe:

```js
import * as THREE from './vendor/three.module.js';
import { BIOME_TEXTURES } from './biome-foliage-data.js';
import { configureBiomeTexture, createBiomeMaterials } from './biome-foliage-paint.js';
import { createBiomePlantFactory } from './biome-foliage-models.js';

const loader = new THREE.TextureLoader();
const textures = Object.fromEntries(await Promise.all(
  Object.entries(BIOME_TEXTURES).map(async ([key, url]) =>
    [key, configureBiomeTexture(await loader.loadAsync(url))]
  )
));
const materials = createBiomeMaterials(textures);
const factory = createBiomePlantFactory(materials);
const plant = factory.create('jungle-palm', { variant: 1, mature: true });
plant.position.set(tileX, groundY, tileZ);
scene.add(plant);

// Once every instance using these resources has left the scene:
factory.dispose(); // geometry only; safe to call twice
Object.values(materials).forEach(material => material.dispose());
Object.values(textures).forEach(texture => texture.dispose());
```

Imports and texture URLs above assume a page in `dist/tactics`. Each plant instance shares factory geometry and caller-owned materials. Removing one plant should not dispose those shared resources.

Bounds in the manifest describe visible art at the recorded arrangement and size. They are **not collision footprints**; broad canopies can overhang walkable space. Recalculate world bounds after arbitrary placement/rotation if needed. Gameplay should set trunk collision, foliage cover, density and culling deliberately.

Trees range from **448 to 1,904 triangles**; low plants from **60 to 708**. The 20-design gallery totals **12,444 plant triangles**. The study uses separate parts to make art inspection easy. A populated map should merge compatible parts or instance them by geometry/material; the gallery's draw-call count is not a forest performance budget. The paint shader supports instance transforms.

## Ground contract

Ordinary PNGs are in [ground-tiles](../../dist/assets/environment/biome-foliage/ground-tiles/tiles.json). They are 512×512 sRGB albedo, with no baked lighting. North is the image's top edge (-Z).

**One complete image repeats over 2×2 game cells (two world units per side).** This is a texture repeat size, not a new terrain-cell size. The integration agent can map a full repeat over four existing cells or deliberately rescale it. If splitting into 1×1-cell quadrants, preserve the correct quadrant placement and repeat origin.

Any of the four patterns within one family can neighbor any other without rotation. Decoded exported PNGs are checked against every opposite-edge pairing: maximum 8-bit channel difference is 0–1. The four patterns share a border treatment and vary the interior. Cross-family edges still need the game's terrain blending/masks.

Two options are available:

1. Load the baked PNGs into the game's existing ground materials. No custom shader is required.
2. Use `createBiomeGround(texture, family, { variant: -1 })` with the ground atlas. This uses a deterministic world-cell mix of the four patterns. Variants 0–3 force one pattern. Use `configureBiomeTexture` and keep world coordinates stable when batching tiles.

The custom shader computes mip LOD before wrapping coordinates at tile boundaries. This avoids the bright tile-edge artifacts caused by derivative jumps while retaining minification filtering. The atlas sampling inset keeps adjacent panels out of the mip footprint. Use the exported PNGs if the integration renderer does not share this WebGL2 material pipeline.

The new grass sets add options; they do not replace the approved meadow, sand or other current ground artwork. The wetland mud is a visual accent, with no implied movement penalty.

## Integration checklist

- [x] Five distinct tree/low-plant families with painterly skins.
- [x] Normal/mature tree sizes and deterministic arrangements.
- [x] Precise ground anchors and visual bounds.
- [x] Matching grass sets and wetland mud.
- [x] Plain PNG ground exports and machine-readable metadata.
- [x] Comparison viewer, asset packaging and focused checks.
- [ ] Map actual game grass/terrain IDs to these art families.
- [ ] Select family, arrangement and size deterministically from the placed location.
- [ ] Define density, trunk collision, cover and paths through undergrowth.
- [ ] Blend borders between ground families and preserve existing material choices.
- [ ] Batch/instance vegetation and test populated maps, editor saves and playtests.

Only the first six items are part of this art pass. The remaining work belongs to the integration agent.

## Validation and regeneration

Run from the repository root with Node 22 or newer:

```text
node --test tests/biome-foliage.test.mjs tests/foliage.test.mjs tests/painted-grass.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-biome-foliage.mjs
node tools/export-biome-ground.mjs
node tools/export-biome-manifest.mjs
```

Browser tools use the retained preview by default. Set `BIOME_REVIEW_URL` to use another server and `PLAYWRIGHT_PATH` to use a different Playwright installation. Browser helpers close in `finally` and leave lifecycle receipts under `artifacts/biome-foliage/helpers`.

The first command checks all plant arrangements/growth, elevated placement, real PNG borders, shared-resource ownership, existing foliage/grass behavior and the complete 3D distribution package. The browser check covers controls, desktop/mobile views, resource stability, exact-once disposal and failed texture loads. It also captures the actual gallery.

Initial foliage-set result: **32 focused/related tests pass**; browser captures have **zero errors or failed requests**, steady **19 geometries / 9 textures** after repeated controls, and **76 owned resources disposed exactly once**. The independent review scored **9/10 for study and handoff readiness**, with 17 further renders, 120 grounding/placement cases and 102 watched resource releases. This is review readiness, not user art approval or gameplay integration approval. See [the review](../../hybrid-review/biome-foliage/REVIEW.md).

Nonblocking future polish: mirrored motifs remain visible in repeated top-down ground, particularly jungle and snow. More asymmetric interior patterns could soften the repetition over large open fields; the exported edge matches already pass.

## Continuous impassable regions

The follow-up art pass adds five connected obstruction families and a 240 × 240 tutorial landscape study. See [IMPASSABLE-BIOMES.md](IMPASSABLE-BIOMES.md) for footprint, adjacency, elevation, rendering and integration contracts. The shared atlas renderer now filters distant views using each panel’s own linear-light average. Close paint and the 24 exported ground images are retained.
