# Editor workbench

The left remote has two columns of tool buttons, with Settings at the top left and Save at the top right. All prior dropdown actions are represented: Land, Tiles, Objects, Structures, Roofs, Boundaries, Cliffs, Ramps, Characters, Locations, Access, Foliage, Erase and Blocks. Select / pan is the first button. Locations groups squad starts and travel markers; Erase groups every eraser. Objects is the former Prop tool.

The right panel contains the active tool's modes, variant choices, placement controls and instructions. Tiles offer selectable schematic style previews and single-tile / dragged-rectangle painting. Diagonal previews indicate the asphalt half and optional concrete border. Structures offers custom rooms plus furnished shed, workshop and checkpoint presets. Saved 24 × 24 blocks remain available under Blocks.

The bottom bar provides altitudes 1–4, Undo, Redo, Rotate and Delete selected. Number keys select altitude outside text fields. Rotate/R rotates the selection when supported and the active placement orientation; invalid rotations retain the design and report their reason. Object footprints update on rotation, cardinal ramp/bank tools change direction, cliff masks rotate, characters turn and diagonal road tiles select the next corner variant. Terrain with no directional form doesn't gain a fabricated rotation.

Settings contains imports/exports, named saves, new/factory maps, camera controls, block navigation, inspection modes, cargo reference, diagnostics, start time and lighting preview. Saving from the remote uses the existing browser save path.

## Fourth altitude

Altitude 4 is a nonwalkable roof layer, not a fourth gameplay floor. Only roof modules and their removal are permitted there. Decorations are stored as `canopies` (roof kind, x/y, z=3 and rotation), rendered using the same roof geometry, and survive map export, undo/redo, block capture/placement and encounter serialization. Core bounds remain three playable levels; characters, stairs, movement and auto-climb links cannot enter the fourth layer. Other tools at altitude 4 give an explanatory error. Decorative roofs are currently presentation geometry rather than a new tactical floor.

## Verification

Run `node --test tests/editor-workbench.test.mjs`, the editor browser check `tools/check-editor-workbench.mjs`, core sync check and the 3D build. Existing roof, ramp and block tests remain applicable. Browser screenshots are written under ignored `artifacts/editor-workbench/`.

## Ramp wall strokes

Ramps default to **Drag along cliff wall**. At the lower altitude, click the exposed face of a full, straight ledge and drag along the wall to choose the width. The wall determines the uphill direction; the stroke snaps along that straight face. Every selected cliff tile receives a parallel four-tile ramp lane, with missing upper landing floors added automatically. Grass, sand, asphalt and concrete surfaces are supported. Obstacles, discontinuous walls and out-of-bounds footprints reject the whole edit; undo/redo treats the complete width as one change. Adjacent lanes permit sideways movement at equal height. Individual ramp placement remains available, with its manual direction selector and R shortcut. Joining banks remain separately placed.

Checks: `tests/editor-ramp-stroke.test.mjs` and `tools/check-editor-ramp-stroke.mjs` (real visible-face mouse drag).

## Land brush and automatic cliffs

Choose **Land**, a round or square brush from 1–63 tiles wide, a surface, and a target height: ground, first plateau (altitude 2), or second plateau (altitude 3). All three playable tiers are shown while Land is active; other tools retain the usual altitude filtering. Drag freely to paint; gaps between pointer samples are filled. The translucent footprint previews the stroke, releasing commits it as one undo step, and Escape cancels it. Overlapping strokes join, with interior cliff tiles removed and the new boundary closed. Painting Ground lowers previously painted land. Edges of maps and 24 × 24 blocks clip the brush. Strokes also respect the 4 MB save/import limit.

Generated ledges are blocked below and walkable on top. No ramps, ladders or climb links are generated. Use **Cliffs → Cliff climb** to designate an 8 AP access point, or **Ramps → Drag along cliff wall** at the wall's lower altitude. Raising or lowering land rejects edits that would bury characters or objects, remove supported construction, or invalidate these routes. Ordinary erasers direct builders back to Land when selecting its automatically generated walls or floors.

The brush reshapes land it created; it does not infer ownership of existing handmade plateaus or building floors. Existing maps keep their current geometry. Paint on clear ground to start a new plateau. The existing 1,024-cliff limit still applies: extremely long, fragmented or heavily tiered outlines can exceed it, in which case the whole stroke is rejected.

Saved `landPaint` columns record `[height, originalGround]`, and generated perimeter props carry `landAuto: true`. These are editing metadata; gameplay uses ordinary upper floors, solid cliff props and void interiors. JSON export/import, browser saves, undo/redo and block extraction/placement preserve the metadata. Copies of a block remap column coordinates and prop positions; replacing a block removes its old ownership. Adjacent hand-painted top textures and unrelated upper construction survive boundary regeneration. A manual replacement of an auto wall becomes a manually owned prop.

Checks: `tests/editor-land-brush.test.mjs` covers closure, access, protections, persistence and blocks. `tools/check-editor-land-brush.mjs` exercises actual pointer strokes, cancellation, undo/redo, surface picking, two tiers, a manually dragged ramp, browser saving/loading and rendering; screenshots and its review map go to ignored `artifacts/land-brush/`. The core adapter is `tools/core-land-adapter.mjs`; generated core files must still be rebuilt through `tools/sync-tactics-core.mjs`.
