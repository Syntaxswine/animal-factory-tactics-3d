# Biome foliage and ground art

Five environment families are ready for review and integration: jungle, temperate, snow, dry grassland and wetlands. The user asked for distinct tree and low-plant shapes for each family and authorized missing grass sets. Automatic selection from the grass underneath a plant is assigned to another agent.

This branch supplies art, reusable Three.js factories, exported ground images and a comparison viewer. It does not add shared gameplay terrain/prop IDs or alter collision, movement, existing maps or the live selector.

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
