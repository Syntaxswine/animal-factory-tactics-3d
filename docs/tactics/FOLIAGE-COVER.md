# Painted foliage cover

Choose **Foliage** in the 3D editor and select level **1, 2 or 3**. Round and square brushes paint continuously as you drag, with widths from **1–63 tiles**; the default is a 17-tile round brush. **Drag rectangle** fills a rectangular area. A stroke is one undoable edit; Escape cancels its preview.

The controls are independent:

- **Density** sets the amount of growth, from 1–100% (default 65%). It also scales foliage concealment.
- **Movement** chooses **Passable** or **Impassable** (default). Impassable blocks every painted cell, including the gaps in sparse growth. This setting does not change the plant models or density.

Plants match the current ground automatically: leafy shrubs and pointed growth on grass; lower, spreading olive, sage and tawny scrub on dirt, gravel and sandy cliff caps. Repainting grass as dirt changes the plant mixture without repainting foliage. Plant variation is deterministic. Painting over foliage replaces its density and movement settings.

Foliage sits on top of supported natural ground, including plateau tops and cliff-cap tiles. Water, buildings, paving, complete prop footprints, stairs and climb endpoints are skipped. Impassable fill also protects character starts, travel markers and ramp approaches. The brush never creates a floor over empty space. Level 4 remains the decorative roof layer.

**Erase → Clear foliage** uses the same brush and preserves the ground beneath it. The overlay is stored in `foliage`, keyed by `x,y,z`, with `[densityPercent, blocksWalking]` values. It survives map and block saving, export/import, block relocation and replacement, playtest, and encounter save/load. Painting non-natural terrain or removing a supporting floor clears its overlay. Validation rejects malformed coordinates, values and unsupported cells. Undoing or clearing the last foliage in a block also removes its exported metadata.

Older `woodland` and `woodland-dense` terrain continues to load with its original passability and concealment. Painting over it converts it to the new overlay. Because the old format replaced the ground, clearing old foliage restores grass. New foliage retains the original ground exactly.

The exact length of a sightline through foliage, weighted by density, reduces identification range and detection chance. Vegetation does not stop bullets or provide ballistic cover. Both the visibility cache and renderer include the overlay in their change detection.

## Rendering

Bulk foliage uses at most two instanced masses per tile, selected from three low-poly silhouettes and habitat-specific leaf tints, with varied size, position and rotation. Lower density omits some masses; increasing density adds plants without moving existing ones. The painterly atlas supplies leaf detail. This costs at most **72 foliage triangles per tile**, down from **296** for the earlier three crowns plus concealed grass tufts. These are geometry counts, not a frame-rate guarantee. Individual tree objects retain their own models and rules.

Foliage on a cliff cap uses its physical height even when the ledge replaces the ordinary floor slab. Instances retain their source cells and levels for fog and layer filtering. Cargo footprints remain excluded.

In-map cliff caps now use the same grass atlas, tint, scale and world coordinates as ordinary grass in both the editor and game. Sand blends and a narrow soil rim remain supported. Full ledge faces have shallow, irregular strata with softer surface shading. Caps, sector cut planes and closed geometry are preserved; the rendered and tactical rock faces share the weathering geometry. No climb links are added and no authored tutorial or user variant files are rewritten.

## Validation

`tests/foliage-brush.test.mjs` covers large curved strokes, edge clipping, independent density and passability, habitat changes, ground preservation, block undo, metadata relocation and replacement, invalid imports, encounter saves and visibility cache updates. `tests/foliage-cover.test.mjs` retains upper-layer, protected-cell, legacy behavior, cliff-cap and geometry budget checks.

`tools/check-editor-foliage.mjs` uses a disposable browser with the existing preview server. It paints real rectangle strokes on levels 2 and 3, drags a brush across mixed ground, checks cancellation, undo/redo and import/export, reviews the authored tutorial rim, and opens Quick Fight to verify rendering and movement restrictions. Screenshots and results are written under `artifacts/editor-foliage/`; the helper browser closes in `finally`. It does not write to the map library or alter user browser sessions.

Run the focused foliage, cliff, land-brush, environment and encounter-save tests, `node tools/sync-tactics-core.mjs --check`, and `node tools/build-tactics-3d.mjs` before delivery. The base build and 3D build retain their missing-module checks.
