# Painted ground scorch decals

October 5, 2026. Four transparent, brush-painted soot marks remain over the original ground once fire dies out. These are flat decals, independent of the character's separate ash pile. They do not replace terrain textures or change traversal.

The tank explosion study now fades them in under the dying fire and keeps them through the aftermath. Choose **Scorched ground**, select meadow grass, sand or concrete, and toggle **Burn marks** to compare. Restarting or scrubbing backward clears the study's marks along with the event; normal persistence belongs to the reusable decal owner.

## Reusable presentation API

`dist/tactics/ground-scorch.js` exports `createGroundScorch(scene, loader)` and `SCORCH_ATLAS`.

```js
const scorch = await createGroundScorch(scene, textureLoader);
scorch.setCells(actualBurnedTiles); // [{x, z, y: renderedGroundHeight}]
scorch.setAmount(1);              // visible indefinitely, no internal expiry
// Update the owner's complete burned footprint when new tiles burn.
scorch.setCells(allBurnedTiles);
// Clear explicitly, or release every owned GPU resource when the owner ends.
scorch.setCells([]);
scorch.dispose();
```

X/Z are integer tile centers in render-world coordinates; Y is a finite horizontal ground height, defaulting to zero. Callers supply actual burned dry tiles and translate logical floors into render heights. This code does not choose damage, burnability, visibility, fog or lifetime. It does not conform to slopes. Keep separate owners for distant regions: a patch may span at most 2,048 tiles on each axis. Invalid input preserves the existing marks.

Tiles deduplicate and sort before allocation. Stable coordinates choose one of four atlas cells, rotation, size and density. Repeated or reordered footprints keep their existing batches. One instanced draw batch per height overlaps neighboring marks, while a same-height cell mask keeps every fragment inside supplied tiles. Different floors have separate masks. Ragged texture alpha and an inward fade soften the boundary, and partial opacity retains the local ground colour.

The plane is offset 0.003 tile above its supplied ground and drawn before other transparent effects. It does not write depth. The texture, masks, instance buffers, materials and geometries are owned and disposed by the decal. Mark intensity is a uniform; fading does not regenerate geometry.

## Current demonstration and integration scope

The explosion preview uses the existing recorded **81-cell open** and **66-cell water-exclusion** fixtures. Empty footprints are also safe. The amount reaches full intensity as the fire fades and remains at full strength afterward. Reversing the timeline restores clean ground deterministically.

The existing skunk/pig export composition also translates the decal cells with its pig and explosion. Previously saved GIFs remain captures of their documented earlier revisions. A real game presenter still needs to supply persistent burned tiles, height, visibility and lifetime; no gameplay or terrain state was changed here.

The [atlas prompt](PROMPT.md) records the generated asset and tool. Selected captures and validation are in [REVIEW.md](REVIEW.md).
