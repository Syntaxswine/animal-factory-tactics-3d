# Connecting painterly conveyors

One-tile conveyor models with fence-like automatic cardinal connectivity. The interactive study is at dist/tactics/painted-conveyor.html, linked from the factory machines and 3D gallery.

All 16 masks are supported: isolated, four ends, two straights, four quarter-circle corners, four T transfer tables and a four-way transfer table. Connections use same-level north/east/south/west conveyor occupancy only; diagonal neighbors do not connect. Open ports terminate at the tile boundary with a common belt height. Corner feet follow the curved deck. Junctions use ball-transfer tables so they read differently from a continuous belt.

The ochre frame reuses the approved cargo painted atlas; steel and dark belts reuse the milling-machine paint. No new bitmap artwork was generated. Softened square frame members, bearings, bolts, belt seams and curved guards provide modeled detail. Geometry/materials are cached per mask and shared by cloned roots; the library owns disposal.

## Usage

- conveyorKey(x,y,level): integer tile address.
- conveyorMask(occupiedSet,x,y,level): 0–15 mask, or null when tile absent.
- conveyorVariant(mask): kind and port names.
- changedConveyorCells(x,y,level): changed tile plus four neighbors to rebuild.
- createConveyorLibrary(cargoTexture,millPaintTexture).build(mask): reusable model root, centered on its tile; world Y is up, map Y is world Z.

The preview supports grid and 3D-floor painting/erasing, fast strokes, cardinal staircase diagonal strokes, undo, layouts, all-variant inspection, wireframe and gameplay scale. No direction is inferred from occupancy: item transport, routing, animation, production behavior, collision and main map-editor integration remain separate work.

## Verification

Hostile subagent review: **9/10 overall**, after fixing empty-floor wireframe state and ensuring diagonal paint strokes remain connected. Tests cover all masks, level/diagonal exclusion, add/remove updates, tile bounds, grounding, port heights and resource sharing. Browser review covers layouts at fit and native 58 px/tile from two headings, click/erase/undo, fast grid and 3D-floor strokes, wireframe on newly placed tiles, browser errors and mobile overflow.

Run node --test tests/conveyor.test.mjs and tools/conveyor-review.mjs (with PLAYWRIGHT_PATH when Playwright is outside node resolution). Browser review uses the local preview at port 4331 and saves screenshots in artifacts/conveyor.

Corner alignment refinement: straight and curved belt, bed and rail meshes now share one swept cross-section and consistent paint coordinates. Belt width, rail spacing, frame depth and centerline rib spacing match at joins; no end bevel creates a dip. A geometry regression check compares exact port cross-sections in all four corner orientations.
