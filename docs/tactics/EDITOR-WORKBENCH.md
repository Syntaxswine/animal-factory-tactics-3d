# Editor workbench

The left remote has two columns of tool buttons, with Settings at the top left and Save at the top right. All prior dropdown actions are represented: Tiles, Objects, Structures, Roofs, Boundaries, Cliffs, Ramps, Characters, Locations, Access, Foliage, Erase and Blocks. Select / pan is the first button. Locations groups squad starts and travel markers; Erase groups every eraser. Objects is the former Prop tool.

The right panel contains the active tool's modes, variant choices, placement controls and instructions. Tiles offer selectable schematic style previews and single-tile / dragged-rectangle painting. Diagonal previews indicate the asphalt half and optional concrete border. Structures offers custom rooms plus furnished shed, workshop and checkpoint presets. Saved 24 × 24 blocks remain available under Blocks.

The bottom bar provides altitudes 1–4, Undo, Redo, Rotate and Delete selected. Number keys select altitude outside text fields. Rotate/R rotates the selection when supported and the active placement orientation; invalid rotations retain the design and report their reason. Object footprints update on rotation, cardinal ramp/bank tools change direction, cliff masks rotate, characters turn and diagonal road tiles select the next corner variant. Terrain with no directional form doesn't gain a fabricated rotation.

Settings contains imports/exports, named saves, new/factory maps, camera controls, block navigation, inspection modes, cargo reference, diagnostics, start time and lighting preview. Saving from the remote uses the existing browser save path.

## Fourth altitude

Altitude 4 is a nonwalkable roof layer, not a fourth gameplay floor. Only roof modules and their removal are permitted there. Decorations are stored as `canopies` (roof kind, x/y, z=3 and rotation), rendered using the same roof geometry, and survive map export, undo/redo, block capture/placement and encounter serialization. Core bounds remain three playable levels; characters, stairs, movement and auto-climb links cannot enter the fourth layer. Other tools at altitude 4 give an explanatory error. Decorative roofs are currently presentation geometry rather than a new tactical floor.

## Verification

Run `node --test tests/editor-workbench.test.mjs`, the editor browser check `tools/check-editor-workbench.mjs`, core sync check and the 3D build. Existing roof, ramp and block tests remain applicable. Browser screenshots are written under ignored `artifacts/editor-workbench/`.
