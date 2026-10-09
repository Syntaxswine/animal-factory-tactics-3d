# Editor workbench

The left remote has two columns of tool buttons, with Settings at the top left and Save at the top right. All prior dropdown actions are represented: Land, Tiles, Objects, Structures, Roofs, Boundaries, Cliffs, Ramps, Characters, Locations, Access, Foliage, Erase and Blocks. Select / pan is the first button. Locations groups squad starts and travel markers; Erase groups every eraser. Objects is the former Prop tool.

The right panel contains the active tool's modes, variant choices, placement controls and instructions. Tiles offer selectable schematic style previews and single-tile / dragged-rectangle painting. Diagonal previews indicate the asphalt half and optional concrete border. Structures offers custom rooms plus furnished shed, workshop and checkpoint presets. Saved 24 × 24 blocks remain available under Blocks.

All levels are visible by default, including decorative roofs on level 4. The bottom bar selects the editing layer with buttons 1–4, alongside Undo, Redo, Rotate and Delete selected. Changing layers controls selection and placement; it does not hide or dim the other levels. Settings → Show all levels can be unchecked for the former cutaway view (higher floors hidden, lower floors dimmed). Number keys select altitude outside text fields. Rotate/R rotates the selection when supported and the active placement orientation; invalid rotations retain the design and report their reason. Object footprints update on rotation, cardinal ramp/bank tools change direction, cliff masks rotate, characters turn and diagonal road tiles select the next corner variant. Terrain with no directional form doesn't gain a fabricated rotation.

Settings contains imports/exports, named saves, new/factory maps, camera controls, block navigation, inspection modes, cargo reference, diagnostics, start time and lighting preview. Saving from the remote uses the existing browser save path.

## Fourth altitude

Altitude 4 is a nonwalkable roof layer, not a fourth gameplay floor. Only roof modules and their removal are permitted there. Decorations are stored as `canopies` (roof kind, x/y, z=3 and rotation), rendered using the same roof geometry, and survive map export, undo/redo, block capture/placement and encounter serialization. Core bounds remain three playable levels; characters, stairs, movement and auto-climb links cannot enter the fourth layer. Other tools at altitude 4 give an explanatory error. Decorative roofs are currently presentation geometry rather than a new tactical floor.

## Verification

Run `node --test tests/editor-workbench.test.mjs`, the editor browser check `tools/check-editor-workbench.mjs`, core sync check and the 3D build. Existing roof, ramp and block tests remain applicable. Browser screenshots are written under ignored `artifacts/editor-workbench/`.

## Ramp wall strokes

Ramps default to **Drag along cliff wall**. At the lower altitude, click the exposed face of a full, straight ledge and drag along the wall to choose the width. The wall determines the uphill direction; the stroke snaps along that straight face. Every selected cliff tile receives a parallel four-tile ramp lane, with missing upper landing floors added automatically. Grass, sand, asphalt and concrete surfaces are supported. Obstacles, discontinuous walls and out-of-bounds footprints reject the whole edit; undo/redo treats the complete width as one change. Adjacent lanes permit sideways movement at equal height. Individual ramp placement remains available, with its manual direction selector and R shortcut. Joining banks remain separately placed.

Checks: `tests/editor-ramp-stroke.test.mjs` and `tools/check-editor-ramp-stroke.mjs` (real visible-face mouse drag).

## Land brush and automatic cliffs

Choose **Land**, a round or square brush from 1–63 tiles wide, a surface, and a target height: ground, first plateau (altitude 2), or second plateau (altitude 3). Land height stays synchronized with the bottom level selector, and the brush projects onto that selected plane. Changing levels cancels an unfinished stroke. All levels remain visible when switching to other tools. Drag freely to paint; gaps between pointer samples are filled. The translucent footprint previews the stroke, releasing commits it as one undo step, and Escape cancels it. Overlapping strokes join, with interior cliff tiles removed and the new boundary closed. Painting Ground lowers previously painted land. Edges of maps and 24 × 24 blocks clip the brush. Strokes also respect the 4 MB save/import limit.

Generated ledges are blocked below and walkable on top. No ramps, ladders or climb links are generated. Use **Cliffs → Cliff climb** to designate an 8 AP access point, or **Ramps → Drag along cliff wall** at the wall's lower altitude. Raising or lowering land rejects edits that would bury characters or objects, remove supported construction, or invalidate these routes. Ordinary erasers direct builders back to Land when selecting its automatically generated walls or floors.

The brush reshapes land it created; it does not infer ownership of existing handmade plateaus or building floors. Existing maps keep their current geometry. Paint on clear ground to start a new plateau. The existing 1,024-cliff limit still applies: extremely long, fragmented or heavily tiered outlines can exceed it, in which case the whole stroke is rejected.

Saved `landPaint` columns record `[height, originalGround]`, and generated perimeter props carry `landAuto: true`. These are editing metadata; gameplay uses ordinary upper floors, solid cliff props and void interiors. JSON export/import, browser saves, undo/redo and block extraction/placement preserve the metadata. Copies of a block remap column coordinates and prop positions; replacing a block removes its old ownership. Adjacent hand-painted top textures and unrelated upper construction survive boundary regeneration. A manual replacement of an auto wall becomes a manually owned prop.

Checks: `tests/editor-land-brush.test.mjs` covers closure, access, protections, persistence and blocks. `tools/check-editor-land-brush.mjs` exercises actual pointer strokes, cancellation, undo/redo, surface picking, two tiers, a manually dragged ramp, browser saving/loading and rendering; screenshots and its review map go to ignored `artifacts/land-brush/`. The core adapter is `tools/core-land-adapter.mjs`; generated core files must still be rebuilt through `tools/sync-tactics-core.mjs`.

## Gameplay level selection

The 3D encounter also draws all known scenery levels, including decorative roofs, plus every currently visible character, supply pile, light and fire. Fog, spotting and corpse visibility remain unchanged. The battlefield has level buttons 1–3 (also number keys), synchronized with the sidebar selector. The chosen level controls movement destinations, route previews and picking people, doors, barrels and supplies. Upper-floor scenery cannot redirect a ground-floor order; an explicit upper-floor order still needs a valid route. Level 4 remains decorative and is never a movement destination.

Run `node --test tests/battle-renderer-visibility.test.mjs tests/multilevel-presentation.test.mjs` and `node tools/check-level-interaction.mjs` for stacked-floor visibility, fog, picking, optional editor cutaway and real movement via stairs. `node tools/check-editor-land-brush.mjs` checks synchronized land height, sculpting, ramp placement, undo/redo and persistence.

## Rotation and placement preview handoff — October 9

**Requested work; not implemented by this review.** The user has another builder improving the tile-type workflow. Coordinate these changes with that work, especially in `editor-workbench.js` and `editor-3d-tools.js`. The priority is to make orientation visible before placement and make rotation predictable without repeated trial placements.

### Confirmed current behavior

The canonical editor at `61eb29c` represents ordinary prop orientation with a `rotated` boolean. Pressing R toggles between two states; it cannot express distinct 180° and 270° facings. Cardinal ramps/banks, cliff masks, characters and diagonal-road variants already have their own directional handling. The placement preview in `editor-3d-scene.js` draws flat footprint cells and an arrow, rather than the actual object model.

Q/E camera rotation already exists in `editor-3d.js` and works when the map has keyboard focus. In the packaged editor, Q changed camera preset 0 to 3 and E restored 0. After choosing an object, the object dropdown retained focus and Q/E was suppressed by the form-input guard. Check the deployed version as well as this focus behavior before treating the shortcut as absent.

### Required behavior

1. **Four placement orientations.** Directional objects must support 0°, 90°, 180° and 270°. Provide clockwise and counterclockwise controls; R and Shift+R are recommended placement shortcuts. Keep Q/E for the camera. Display the current orientation beside the chosen object. Symmetric geometry may look identical at some angles, but asymmetric models must retain all four facings. Preserve the existing directional semantics for ramps, cliff masks and road variants.
2. **Preview the model being placed.** Prefer a translucent live model at the cursor, using the same geometry, materials, scale, anchor and height as the committed object. Update it immediately when the variant, orientation, layer or cursor position changes, even if the mouse remains still while a control changes. Show the occupied footprint and a clear blocked-placement reason. The preview must not modify the map, consume an undo step or leave geometry/resources behind when cancelled or replaced.
3. **A useful panel preview is an acceptable first delivery.** If the cursor model needs another pass, put a model preview on the left panel showing its current orientation, direction/degrees and footprint. It must use the actual selected model and update immediately. This is the user's minimum useful improvement; record clearly whether a cursor preview is also delivered.
4. **Reliable Q/E navigation.** Match gameplay's camera rotation direction and retain the camera center and editing layer. Choosing a tool or committing a variant choice must leave map shortcuts usable without an extra placement click. Preserve normal typing, keyboard selection in an open dropdown, accessibility and modal behavior. Reproject the preview after camera rotation without changing the object's world orientation.
5. **Separate placement and selection edits.** Rotating a placement must not also rotate an unrelated selected object. Give an existing selection its own explicit, undoable rotation action. Keep selections and invalid edits stable and explain why a rotation is blocked.
6. **Preserve orientation throughout the game.** Choose a single quarter-turn representation and migrate legacy maps (`rotated: false` → 0; `true` → 1). Carry it through rendering, footprints, collision, support/access geometry and directional attachments such as lights. Save/load, export/import, encounter serialization, copy settings, undo/redo, block capture/placement and editor playtest must preserve it. Rebuild generated core modules through their adapters and synchronization tool.

### Acceptance checks

- A directional hospital bed, workbench or suitable wall fixture can face all four directions; 180°/270° do not collapse into 0°/90°. A non-square prop's footprint, collision and support remain aligned with its model, including near a boundary or obstacle.
- At every orientation and supported layer, the preview matches the object immediately after placement. Invalid placements are indicated before clicking. Switching models, layers or cameras leaves no stale preview or map edits.
- Existing objects can be rotated, copied, undone/redone and passed through saves, exported maps, reusable blocks and playtest without losing orientation. Legacy maps retain their original appearance and access routes.
- Q/E works after choosing tools and variants, in perspective and top view, with the same direction as gameplay. Text editing and open dropdown navigation continue to work without moving the camera. R/Shift+R rotates the intended placement or explicit selection only.

Implementation touchpoints include `editor-3d-tools.js`, `editor-3d-controller.js`, `editor-3d-scene.js`, `editor-workbench.js`, `editor-3d-camera.js`, `core/environment.js`, `environment-visuals.js` and `hybrid-world.js`, plus their source adapters and serialization paths. Changing only the model's drawn angle would leave the footprint and gameplay geometry inconsistent.
