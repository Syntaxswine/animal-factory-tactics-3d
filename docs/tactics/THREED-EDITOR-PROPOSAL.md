# Proposal: Animal Factory Tactics 3D map editor

Status: milestones 1 and 2 implemented at `tactics/editor-3d.html`: inspection, full-map brush editing, named saves, undo/redo and validated snapshot playtesting. See [THREED-EDITOR-EDITING.md](THREED-EDITOR-EDITING.md) for scope and verification. Block-library editing, capture/placement, connection planning, seeded/connected generation, and visible faction outfits are implemented. Named browser saves replace the older separate draft slot; JSON transfers existing designs without automatic database migration. The five-map story campaign and its dialogue/object-interaction systems are deferred separately.

## Purpose

Build a 3D counterpart to the existing [map editor](https://syntaxswine.github.io/animal-factory-tactics-pages/tactics/editor.html), so a designer can place and inspect the actual characters, scenery and building parts used by the 3D game. Keep one map definition usable by both presentations. Editing remains tile-based: camera rotation and detailed meshes do not change movement, cover, visibility or combat rules.

The first useful result should let us open the authored factory, edit a room and its guards, save it, and playtest those exact changes in the modeled encounter. It should also support building the proposed five-map opening region without requiring a separate map format.

## Preserve the existing editor

Retain the current 240×240 maps, 24×24 reusable blocks, sector navigation and three floors. Preserve these capabilities through the new interface:

- Ground, floor and roof painting; water, bridges and woodland.
- Edge-snapped walls, fences and doors; room stamps and supported prop footprints.
- Squad starts, guard placement/facing/species/outfit/equipment, travel markers, stairs, ladders and roof climbs.
- One undo operation per completed stroke or placement, redo, and cancel before committing a preview.
- Named saved designs, copies, drafts, JSON import/export, sector capture and block placement.
- Block connections, seeded generation, feature lines and the existing map validation rules.

The existing 2D editor remains available throughout development. New editor features must not silently remove or rewrite information that the other editor understands.

## What changes on screen

Use a large 3D workspace, a searchable asset/tool palette and a properties panel. Keep save, undo, redo, floor selection and playtest readily accessible. Show the selected object's logical properties alongside its preview.

Start with an orthographic camera and a one-click return to the gameplay view. Add top-down inspection and four quarter-turn views, with pan, zoom, overview and sector focus. Free orbit can follow after editing works reliably from these views. Camera controls must not compete with drawing gestures; keep keyboard shortcuts discoverable and provide buttons for every action.

Every placement gets a translucent preview, a tile footprint and a valid/invalid indication with a concrete explanation. Wall strokes highlight their intended edge and lock their direction as the existing editor does. Rotation must use orientations supported by the map format; do not promise arbitrary rotations for props that only support a rotated flag.

The active floor is the edit target. Lower floors are dimmed; upper floors can be ghosted or hidden. Hidden roofs and walls must not intercept clicks. Tool picking resolves to a logical cell, edge or object on the active floor, even when a mesh overhangs it. Empty upper-floor space must remain selectable so floors can be added. Selecting a large prop from any occupied tile should identify that one prop.

Provide separate design and gameplay-preview views. Design view shows all authored starts and guards. Gameplay preview uses actual detection and map-knowledge rules. Mark missing outfit/weapon visuals explicitly instead of making different logical units look deceptively identical.

## Shared data and code

Keep the canonical serialized map as the source of truth. Meshes are derived objects; never serialize the Three.js scene as the map.

Reuse the existing editor model, brush operations, block library and validation through a renderer-independent controller. Audit their imports first: the current 3D encounter uses a generated, pinned `core/` snapshot, while the older editor imports other local modules. Select and record a compatible canonical revision for editing and playtesting, and extend the dependency-import tooling as needed. Do not mix differently versioned map rules or hand-edit generated core files.

Separate scene construction from encounter state. Reuse environment models, painted cargo and character factories, but do not create a running battle just to draw a blueprint. Keep camera state, selection, validation highlights and roof visibility outside the saved map.

All input routes should call the same edit operations. Expose a small programmatic interface for opening a design, applying a stroke, undoing, validating and exporting it. Headless tests and future agents should invoke these operations directly; hotkeys are an additional interface.

## Asset placement rules

Offer only assets with a defined logical kind, supported footprint, floor requirements and orientation. Reuse shared rules for occupancy and obstruction. Show logical footprints and collision/cover guides independently of artistic mesh bounds.

The new truck and large cargo arrangements are currently gallery assets. They must not become placeable merely because a mesh exists. First define their shared map representation and behavior, add compatible 2D handling, and validate footprints in both editors. Until then, show them as preview-only assets. Cosmetic variants may use deterministic presentation mappings; saved appearance overrides require an explicit compatible schema decision.

Confirmed footprints: truck 2×3; cargo retains `CARGO_FORMS.tiles`, including the three-drum row at 1×2, six-drum pyramid at 2×1, and crate pallet / mixed drum pile / eighteen-drum block at 2×2. These dimensions are approved; shared placement and gameplay rules still need implementation.

## Save and playtest

Reuse the design-store implementation with an explicit database namespace and migration policy. The two GitHub Pages projects share a browser origin, so different URL paths alone do not isolate drafts or databases. Never overwrite the other editor's draft implicitly. Portable JSON remains the reliable exchange route.

Add a deliberate map-input path to `battle-3d.html`; it currently loads a fixed factory JSON. Playtest must launch a validated snapshot of the current blueprint, not that default map. Prefer an explicit same-origin message handoff with source, origin and schema checks. Do not put a full map in a URL or replace the deployed default file.

Returning from playtest preserves the blueprint, undo history and camera. Damage, opened doors, casualties and dropped items affect only the test session. Invalid designs can remain editable drafts, but cannot launch until required validation passes. Block designs must be placed in a full map before playtesting.

## Delivery sequence

1. **Read-only 3D inspection:** import the factory and representative saved maps/blocks; verify floors, boundaries, prop placement, character markers and camera picking.
2. **Useful editing slice:** terrain, walls/doors, rooms, supported props and unit starts; selection, previews, undo/redo, save/export and edited-map playtesting. Demonstrate building and testing one small tutorial room.
3. **Existing-editor feature parity:** remaining access/travel tools, reusable-block library, connection planning, generation and full validation workflow. Complete the capability checklist before presenting this as a replacement.
4. **Workflow and performance refinement:** asset thumbnails/search, multi-floor cutaways, measured large-map performance and additional compatible asset kinds.

Use an isolated worktree and branch. Integrate the latest published 3D main before delivery, preserving the encounter and all art galleries. Publish the new editor as `tactics/editor-3d.html`; keep the existing editor entry point intact.

## Acceptance criteria

- Existing factory, multi-floor, river/bridge and reusable-block fixtures open without lost fields or silently substituted assets.
- A shared-schema edit/export/reopen cycle produces equivalent map data in both editors, accounting only for documented migrations and serialization ordering.
- Identical edit-command sequences produce identical data headlessly and through the UI; undo/redo restores the expected design.
- Picking works on every floor and camera preset, including hidden roofs, empty upper-floor cells, shared wall edges and multi-tile props. Invalid previews do not mutate the map.
- Playtest loads the edited snapshot, uses the recorded shared-core revision and leaves the blueprint untouched on return.
- Full-map editing updates affected scene regions rather than rebuilding every character and asset on each pointer move. Measure load time, interaction latency, frame rate and memory on a recorded browser/device; repeated edits and playtests must not grow retained resources indefinitely.
- Existing repository checks, new editor behavior tests, and browser checks pass. Verify the built distribution and deployed editor, not only the development server.

Defer arbitrary sculpting, terrain deformation, new physics, vehicle simulation and campaign authoring. This proposal delivers a dependable map-building tool for the existing tactical game.
