# 3D editor milestone 1: inspection

Open `/tactics/editor-3d.html`. The authored factory loads initially, with 36 guards, four squad starts and 398 props. Import version 2 map JSON or version 1 reusable-block JSON; exports preserve the original parsed document, including unrecognized extension fields. Whitespace is reformatted. Legacy maps must first be converted with the existing editor. No storage database or local draft is opened or written.

The workspace provides the gameplay camera angle, three quarter turns, top-down inspection, pan, zoom, overview, sector navigation and three active floors. Higher floors are hidden; lower scenery and characters are dimmed. Roof objects and boundaries can be hidden separately. Selection casts onto the active floor plane, including empty upper-floor space. Near-edge selection uses canonical edges; props resolve from every occupied tile to one saved prop. Hidden objects are excluded from selection. Use the Pick selector to inspect a cell underneath a prop or unit.

Design view shows every authored guard and start with role-colored ground rings and facing arrows. Squad models indicate slots, with illustrative rifle equipment. Saved guard equipment is shown where supported. Normal painted outfits are explicitly distinguished from saved red-hat settings in selection details, and armed hens report their missing weapon pose. This is not a gameplay visibility preview.

## Dependency audit

The inspector imports map and block readers from the same generated `core/` snapshot as the encounter: upstream `Syntaxswine/animal-factory` revision `6e2782a4ab3dde0f8b84a8610769664335294fe0`. The sync tool now includes `editor-model.js` and `blocks.js` as dependency roots, producing 20 byte-identical modules. The renderer-independent editor model is available for milestone 2; this inspection milestone exposes no edit operations.

The local scenery `environment.js` catalog is byte-equivalent after newline normalization to the pinned core catalog; a regression check guards this compatibility. Scenery construction uses `buildWorld`, environment model geometry, painted cargo and character factories directly. It never creates or steps a battle. Camera state, selection and floor visibility remain outside the portable document.

Block import validates with the canonical block reader, then crops only its derived scene to 24×24. Synthetic off-block squad and exit placeholders are excluded. Export retains the original block with its connections and all other fields.

Truck 2×3 and the unchanged cargo catalog sizes are listed as a footprint reference. They are not new map kinds yet. Milestone 2 must add shared schema, occupancy and compatible 2D handling before making larger cargo or the truck placeable.

## Verification and performance

- `node --test tests/editor-3d.test.mjs`: factory/river/block round trips, retained extension fields, multi-tile selection, hidden objects, upper-floor empty cells, all five camera presets on all three floors, rejected imports and catalog agreement.
- `node tools/editor-3d-review.mjs`: real file import, all 40 factory models, actual clicks from each camera preset, missing-visual notes, river/block reopen cycles, retained WebGL resource counts and mobile layout. Set `PLAYWRIGHT_PATH` to Playwright and `REVIEW_URL` to the editor URL for packaged or deployed checks.
- `node tools/sync-tactics-core.mjs --check`, `npm run check`, `npm run build:tactics-3d` remain delivery checks.

Browser reports and reviewed screenshots are written under ignored `artifacts/battle-3d/editor/`. Scene diagnostics expose measured model-load and scenery-build times plus renderer resource counts. Camera motion and selection reuse the built scene; a floor or visibility change rebuilds scenery. Pointer movement does not rebuild assets. Asset loading uses four concurrent character preparations and releases skeleton textures when switching documents. View rendering is on demand, so an idle frame rate is not a useful animation benchmark.

Recorded packaged review: Edge 153.0.4234.48 headless, Windows, Ryzen 7 5800X / RTX 3080, 1440×1000 viewport. Preparing all 40 factory models took 9.84 s; scenery reconstruction took 99.7 ms. A 30-frame camera-motion sample measured 16.7 ms median and 16.8 ms p95 between frames (approximately 60 fps), with reported JS heap around 215 MB. Four river/block reopen cycles stabilized at 25 geometries and 16 textures. These are local measurements, not a low-end-device performance guarantee.

## Remaining work

This is inspection, not the proposed complete editor. Brush previews, editing/undo, storage namespaces, full validation UI, playtest snapshot handoff, block generation and incremental scene updates after edits remain future milestones. Inspection accepts disconnected maps but rejects other canonical validation errors. Invalid designs cannot yet be loaded as editable drafts. Pinch zoom, free orbit and large-map performance tuning remain follow-up work.
