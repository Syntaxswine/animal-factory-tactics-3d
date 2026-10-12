# Helicopter and furnishing integration

The reviewed models from `work/utility-helicopter` at `98adf13` are now placeable in the 3D editor and rendered by the same scene owner in gameplay. The import deliberately excludes that branch's older gameplay and HUD files.

## Editor

Objects now includes:

- Utility helicopter; survivable helicopter crash with residual smoke; destroyed wreck.
- Wingback chairs (russet/teal), wooden chairs (honey/walnut), metal chairs (sage/iron), desk chairs (teal/russet).
- Green or amber computer terminal; telephone/radio console.

All support the existing placement, rotation, selection, deletion, undo/redo, map export/import, reusable block and sector-variant workflows. Chairs and consoles occupy one tile and use low-cover rules. Sitting, operating computers and making telephone calls are explicitly labelled as awaiting gameplay integration.

Select a placed **Helicopter crash · survivors / smoke**, then choose **Set squad start beside crash**. This moves the existing four start slots outside the positive-Z cabin exit. Every merc faces southwest (135 degrees: negative map X, positive map Y), independently of camera rotation. Their character IDs, appearance, stats and equipment are preserved. The operation rejects blocked or separated survivor positions and is one undoable edit. Squad-start headings are now also respected when loading gameplay; older starts retain their original default facing.

## Collision and presentation

Helicopters reserve 12 by 10 tiles, including their rotor/debris extents, at their native asset scale. They can be placed on supported outdoor levels 1, 2 and 3. The reservation does not become a solid wall: baked standing-body clearance and continuous movement links leave unobstructed space under the rotor available for walking. Bullet/line-of-sight and grenade collision geometry comes from the model's physical triangles. Ground scars and smoke are cosmetic. The residual plume is not burning fuel and does not ignite characters or impose tactical smoke penalties.

`tools/export-helicopter-gameplay.mjs` regenerates the collider and clearance data; `--check` verifies it. Core changes live in `tools/core-scenery-adapter.mjs`, followed by regeneration with `tools/sync-tactics-core.mjs`. Smoke updates use presentation time, honor reduced motion, and are disposed with the removed map objects. The owner loads textures only for families present in the map.

## Tutorial placement still needs the authored map

The supplied screenshot shows extensive painted foliage and a clearing that are absent from both the organized `sectors/tutorial/tutorial-step-1/rough-plateau.json` and its runtime export. The editor's browser saved-design list was also empty at the inspected origin. Those original terrain-only tutorial maps were left intact. The exact crash placement must be applied to the user's saved clearing variant once its location is supplied; it has **not** been guessed into the original map or substituted into the two-sector campaign foundation.

The independent integration fixture is available at:

- `tactics/editor-3d.html?editing=1&study=scenery`
- `tactics/battle-3d.html?study=scenery`

It contains a raised crash area with four southwest-facing mercs, all furnishing variants, and the other two helicopter forms nearby. It is a test fixture, not the authored tutorial clearing.

## Verification

- 95 focused checks across scenery integration, imported models, strategic sites, encounter saves, patrols, grenades, sector authoring and packaging.
- Generated core and helicopter geometry freshness checks.
- 3D Pages build and module-closure checks, preserving the missing-module safeguards in both build lists.
- Live editor review: select the level-3 crash, set the squad starts, undo, redo, place a console using Objects, and launch the actual editor playtest. Crash, smoke and all four surviving mercs render in gameplay; no gameplay module errors were observed.

The integration review also caught an existing patrol-overlay startup race when no document had loaded yet; the overlay now waits for a document before looking up its character.
