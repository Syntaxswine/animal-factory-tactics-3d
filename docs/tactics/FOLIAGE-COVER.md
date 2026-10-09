# Painted foliage cover

Choose **Foliage** in the 3D editor, select level **1, 2 or 3**, then choose a single tile or drag rectangle. The brush paints supported yard, grass, dirt and gravel, including plateau tops and their cliff-cap tiles. It never creates a floor over empty space. Level 4 remains the decorative roof layer.

The **Foliage type** dropdown offers:

- **Dense thicket · impassable** (the new UI default): saves as `woodland-dense`; blocks walking and provides foliage concealment.
- **Undergrowth · walkable concealment**: saves as the existing `woodland`; retains the traversal and detection behavior of older maps. Existing foliage is not automatically converted to an obstacle.

Changing the type and painting over foliage converts the selected cells. Water, buildings, paving, complete prop footprints, stairs and climb endpoints are skipped. Dense fill also skips character starts, travel markers and ramp approaches. A stroke is one undoable edit; Escape cancels the preview. Clear foliage restores ordinary grass on the selected level. Undo restores the exact previous surface, including dirt or gravel.

Both types survive editor saves, JSON export/import, reusable block extraction and placement, playtest, and encounter save/load. The generated-core adapter records the terrain validation, protected painting, block and concealment changes. The exact length of a sightline through either foliage type reduces identification range and detection chance. Vegetation does not stop bullets or provide ballistic cover.

## Rendering

Bulk foliage uses two instanced masses per tile, selected deterministically from three silhouettes and three leaf tints, with varied size, position and rotation. The painterly atlas supplies leaf detail. This costs at most **72 foliage triangles per tile**, down from **296** for the previous three crowns plus concealed grass tufts: at least **75% fewer**. These are geometry counts, not a frame-rate guarantee. Individual tree objects retain their own models and rules.

Foliage on a cliff cap uses its physical height even when the ledge replaces the ordinary floor slab. Instances retain their source cells and levels for fog and layer filtering. Cargo footprints remain excluded.

In-map cliff caps now use the same grass atlas, tint, scale and world coordinates as ordinary grass in both the editor and game. Sand blends and a narrow soil rim remain supported. Full ledge faces have shallow, irregular strata with softer surface shading. Caps, sector cut planes and closed geometry are preserved; the rendered and tactical rock faces share the weathering geometry. No climb links are added and no authored tutorial or user variant files are rewritten.

## Validation

`tests/foliage-cover.test.mjs` covers upper-layer painting, protected cells, conversion and clearing, undo/redo, map and block round trips, dense path blocking, concealment, encounter saves, cliff-cap vegetation and the geometry budget. Cliff tests check sealed terrain, matching render/collision rays and unchanged landing caps and sector joins.

`tools/check-editor-foliage.mjs` uses a disposable browser with the existing preview server. It paints real rectangle strokes on levels 2 and 3, checks undo/redo and import/export, reviews the authored tutorial rim, and opens Quick Fight to verify rendering and blocked movement. Screenshots and results are written under `artifacts/editor-foliage/`; the helper browser closes in `finally`. It does not write to the map library or alter user browser sessions.

Run the focused foliage, cliff, land-brush, environment and encounter-save tests, `node tools/sync-tactics-core.mjs --check`, and `node tools/build-tactics-3d.mjs` before delivery. The base build and 3D build retain their missing-module checks.
