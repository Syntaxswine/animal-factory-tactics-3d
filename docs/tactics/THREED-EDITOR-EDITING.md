# 3D editor: useful editing slice

`tactics/editor-3d.html` now edits full version 2 maps through the original renderer-independent `core/editor-model.js` at the encounter's pinned upstream revision `e529f4b`. Map/editor rules remain unchanged; generated engine/world modules now use the recorded shared-clock adapters (see GAME-CLOCK.md). Reusable version 1 blocks now use the same editable controller, with a full canonical backing map and a cropped 24 by 24 design view.

## Workflow

Open the factory, import JSON, or choose New map. Select a Build tool. Terrain/floor tools drag rectangles, boundaries drag direction-locked lines, and rooms/props/starts use individual placements. Translucent footprints and edge guides show green/gold for valid placement or red with a reason for rejection. Release to commit; Escape cancels. Each gesture is one undo operation. Right-drag, WASD and arrow keys pan. Select / pan retains the previous drag-camera behavior. R rotates supported placement footprints; the checkbox provides the same action.

Tools include terrain, water, bridges, woodland, floors, walls/fences, doors, rooms, supported props/roofs, guards, squad starts, travel markers, stairs, ladders and roof climbs, with corresponding erase tools. Selected props can rotate or delete. Copy selected settings prepares a matching prop or guard placement; placing a guard on an existing guard updates it using the canonical editor behavior. Squad and travel positions are replaced through their placement tools, not deleted. New large-cargo/truck map kinds remain future shared-schema work.

Previews operate on a temporary blueprint using the same brush operation as commit. Invalid strokes do not partly apply. Structural validation runs before commit; connectivity can be temporarily broken while constructing a room. Full validation, including reachability, is required for Playtest. Undo/redo uses the original 50-entry history. Unknown top-level map fields are retained. Imports must pass canonical structural validation; importing malformed drafts is not supported.

## Save and playtest

Save updates the current named record; Save copy creates another record. Names can be changed independently. IndexedDB uses `animal-factory-tactics-3d-designs-v1`, with the existing editor's record/transaction pattern and no automatic import or migration from `red-shift-designs`. The 3D namespace starts empty. JSON export remains the portable backup. Saves happen only on explicit request; leaving or replacing unsaved edits warns the user. Browser storage errors are shown without claiming success.

Playtest opens a separate battle window and transmits a frozen JSON snapshot after a ready-message handshake. Both sides check the exact window, origin and per-launch random token. The battle revalidates the snapshot with the pinned canonical parser. A failed handoff stops with an error and never falls back to the default factory. Returning closes the test window and focuses the original editor; damage, movement, doors and casualties never write back to the blueprint, camera or undo history. Ordinary Quick Fight still loads the large default factory.

## Rendering and verification

Pointer movement updates the placement overlay only, at most once per animation frame and only when its command changes. Committed edits rebuild derived world data, retain unchanged 16-tile scenery chunks, and reload only changed character entries. Camera and selection updates retain scene assets. The existing model/resource disposal checks continue to apply.

`tests/editor-3d-editing.test.mjs` compares edit results directly with the sprite editor, checks atomic previews/rejection, single-stroke undo, and rejects wrong-window/origin/token playtest messages. `tools/editor-3d-editing-review.mjs` builds a room through the UI, places a guard and a prop, checks invalid placement, rotation and undo/redo, saves/reloads it, and launches that exact snapshot. It also mutates a test combatant and verifies the editor's blueprint, camera and history are unchanged. Use `PLAYWRIGHT_PATH` and `REVIEW_URL` as with the inspector review; artifacts go under ignored `artifacts/battle-3d/editing/`.

This tranche does not implement game-progress Save/Load, arbitrary object dragging, or the story campaign. The campaign requires five maps plus dialogue and object-interaction systems; the user explicitly deferred that work.


## Blocks, generation, and faction outfits

The Blocks & generation panel switches between full-map and block workspaces, retaining each document and its undo history. New block opens an empty 24 by 24 design. Block editing rejects footprints that cross its boundary and disables squad/travel placement. Save and Save copy use the same named library as maps, labelled by design type. JSON remains compatible with the existing editor; existing browser libraries require explicit JSON transfer, not automatic migration. Named records provide draft storage rather than adding another separate localStorage draft slot.

Save sector as block captures the current sector coordinates on all three floors. Place selected block replaces that sector with the selected library block in one undo step, using the canonical seam and structure validation. Connection controls assign north/east/south/west types after validating actual geometry. They do not paint connections. Save a block after assigning them to include it in connected generation.

Generation supports the existing factory and two river orientations, numeric seeds, and 100-sector assembly from connected library blocks. Feature planning specifies each of ten rows and columns, with seeded road/fence and clear actions. Apply feature plan commits the controls before generation. Missing compatible blocks, invalid seeds and failed layouts leave the map untouched. The generator algorithm is copied from the existing editor with imports redirected to the pinned core rules; a test compares its output with the original. Successful generation is one undo operation.

Editor and battle rendering pass each guard's outfit to the existing species paint layers and attach fitted Red Hats caps to the head. The pig foreman retains its authored uniform/cap. Accessories inherit actor visibility and head motion, are dimmed on lower editor floors, and are disposed with replaced models. Faction rendering does not change detection rules. Armed hen poses remain unavailable.

`tools/editor-3d-library-review.mjs` exercises block saves/reload, workspace retention, capture/place/undo, connections, successful and rejected generation, visible faction paint/caps in an ordinary LOS playtest, and stable graphics resource counts after repeated outfit changes. Artifacts are under `artifacts/battle-3d/library/`.

Map designs can set their start time under Design. This is stored as `time.startMinutes` (0 through 1439), participates in undo and named saves, and initializes playtest time. The running clock never writes back into the blueprint.
