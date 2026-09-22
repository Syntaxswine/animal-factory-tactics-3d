# Painted environment catalog — 22 September 2026

The isolated environment-painted-study branch now presents all 76 original
catalog entries with authored painterly material surfaces: 47 props, 16
boundaries, 11 terrain types and two access structures. Open
[tactics/environment-gallery.html](../../dist/tactics/environment-gallery.html)
at http://127.0.0.1:4329/tactics/environment-gallery.html.

The gallery uses warm neutral lighting calibrated to the approved cargo study,
with the approved painted horse as an optional scale reference. Family filters
cover cargo/workshop, clinic/laboratory, woodland, architecture, loose equipment,
boundaries and terrain/access. Fit, 58 CSS px/unit gameplay scale and 110 px/unit
close inspection are available alongside orbit, wireframe and scene views.
Previous/next navigation respects the selected family. Cargo variations and the
canvas truck remain linked standalone studies.

## Scope

This pass finishes the shared modular scenery catalog with authored paint and
refined component silhouettes. It does not claim that each prop went through
the truck's individual 30k authoring mesh / 10k reduction workflow. Geometry and
paint remain instanced and reusable. Collision, occupancy, cover and map records
remain governed by the existing descriptors. The default sprite renderer and
main branch are not switched by this worktree change.

Paint is shared across related surfaces; deliberate repeat and reuse remain
visible under magnification. The intended acceptance scales are 58 and 110
CSS px/unit, with the approved horse available for direct style comparison.

The shared shape library now includes square-edged rigid blocks, shaped foliage
fans, pillow-like sandbags, shouldered drums and thin hoops. Trees have branch
structure and asymmetric crowns; crates have separate boards, braces and
hardware. Beds, benches, medical cabinets and workshop equipment have more
deliberate framing, feet and functional details. Corrugated boundaries have
raised folds, masonry has worn caps, and doors have hinges. Ground, water and
walkable roof slabs keep square tile edges to avoid artificial seams.

## Painted surfaces and provenance

The new 16-cell material sheet was generated with the **built-in ImageGen tool**,
using the approved painted environment atlas and horse paint as style references.
The delivered 1254×1254 RGB asset is
`dist/assets/environment/painted-study/catalog-materials-v1.png`.
The exact prompt is saved in `ENVIRONMENT-FINISH-PROMPT.txt`. Wood reuses the
approved `material-atlas-v2.png` source. Source PNGs are preserved unchanged.

`environment-painted-materials.js` samples inset atlas cells using world-space
projection blended across surface directions. Material-specific colour ranges
quiet the grounds and foliage. Equipment wear increases near component edges,
so large enamel/steel faces remain broad readable planes. Terrain distinguishes
dirt, gravel, grass, asphalt, concrete and grouted tiles. Water retains subtle
animated surface normals. This replaces the live hybrid renderer's procedural
noise swatches; legacy swatch helpers remain for historical experiments/tests.

The painterly surfaces and models are shared by this branch's hybrid game and
editor, not just the gallery. Default sprite rendering is unchanged.

## Reproducible browser acceptance

Run tools/environment-finished-review.mjs with PLAYWRIGHT_PATH pointing to an
installed Playwright module and the study server on port 4329. REVIEW_URL may
override the local gallery URL. The driver checks all 76 entries at both scales
for three cycles (456 renders), records browser errors and unsupported content,
and compares retained resource counts after warm-up. It also captures woodland,
clinic equipment, walls/windows/fences, terrain/water, roofs/access, loose items,
the two assembled scenes from opposite sides, family navigation and mobile.
Evidence is saved to environment-finished-review/ alongside this document.

The approved horse and its projection resources are disposed when leaving the
gallery. Its geometry and scale are unchanged; the reference stands beside the
selected model and is included in camera fitting.

Current validation: **471/471 tests**, asset validation and the 3D distribution
build pass. The final catalog sweep performs **456 renders**, with no browser
errors or unsupported content and stable warmed resource counts (23 materials,
23 GPU geometries, eight textures including the horse reference resources).

`tools/environment-finished-integration.mjs` checks the Factory-test map in
legacy/hybrid game and editor, real camera panning, game movement, wall editing,
and 12 undo/redo cycles in each editor. All pass without browser errors.
Observed hybrid loads: 1.51s game / 2.73s editor; active-pan p95 approximately
16.7ms for both on this local Windows/Edge run. These are local observations,
not cross-device performance guarantees. Evidence is in the `integration/`
subdirectory of `environment-finished-review/`.

## Final hostile review

User-directed form correction: rigid construction now uses actual flat-faced,
square-cornered boxes. Tabletops, workbench shelves, crate boards, cabinet panels
and architectural blocks no longer inherit the rounded primitive. Rounded
details are selected explicitly for cloth/sand components; cushions, sandbags,
foliage, drums and other curved forms retain their intended shapes. All six
focused environment tests, the 456-render browser sweep and distribution build
pass after this correction; screenshots and resource counts are refreshed.
The independent reviewer rated this bounded correction **9/10**, after another
152-view sweep and four independently passing model tests.

Independent art review progressed from **7/10** (overly busy grounds, wear and
foliage) to **8.5/10** (material hierarchy corrected; overlapping cap surfaces)
and finally **9/10 for the modular painterly catalog presentation**. The final
review independently swept all 76 entries at both scales (152 renders), checked
yard/clinic compositions and passed the four existing environment model tests.
No browser errors or retained-resource growth were found. The cap correction
recesses only the cloned visual wall top; query boxes and window apertures remain
unchanged. Six focused tests and the build pass after that final geometry fix.

Remaining nonblocking limits are repeated shared textures at close zoom,
simplified pickup/foliage construction and the existing flat walkable roof-top
datum. This review does not approve shared-core gameplay parity, a default
renderer cutover or bespoke truck-level sculpting for every catalog prop.

## Historical prototype milestone

The following describes the earlier prototype validation, not the final painted
pass's current review score or test count.

### Modeled environment milestone — 21 September 2026

The environment workshop at `tactics/environment-gallery.html` exposes 47 props,
16 boundary types, 11 terrain types and two access structures. The hybrid game
and editor now use the same presentation models for props and boundary details.
The standalone older `hybrid-viewer` remains a historical geometry/material lab.

The new catalog includes branching broadleaf trees, layered pine crowns, roots,
shrubs, cattail reeds, round drums and hoops, rounded sandbags, braced wooden
containers, open chests, front-opening medicine cabinets and shelves, workbench
vises, beds and castors, sinks and taps, IV stands, lab equipment and loose tools.
Equipment uses painted steel independently of architectural corrugated metal.
Chain-link fences have clipped diagonal wire geometry. Water has continuous
animated normal highlights rather than a static blue material. The gallery
includes courtyard and clinic compositions, orbit, zoom, wireframe, automatic
rotation, and portrait controls/camera fitting.

## Scope and remaining limits

These are stylized low-poly models, not individually sculpted/painted final art.
Sloped roof undersides now use a continuous wedge rather than eight box steps;
roof tops deliberately retain the saved flat walkable datum. Corrugated roof
ribs and parapets remain geometric details. The main sprite game and default
renderer are unchanged. Character studies are still separate from gameplay.

Presentation descriptors are separate from collision boxes. `environmentVisuals`
does not mutate map data or the world's query volumes. New trees, curved props,
fence wires and cabinet doors therefore do not redefine hits, movement or sight.
The old hybrid prototype's collision rules are still experimental; this is not
the shared-core parity release described in THREED-PROJECT.md.

Rendering retains material/shape/chunk instancing, unchanged-chunk reuse, fog
and floor filtering. Ten shared primitive geometries are disposed with their
renderer. Gallery shadows are enabled only for inspection scenes. Gameplay and
editor retain their existing lighting budget.

## Independent review and validation

An independent reviewer rated the first pass 8/10 and requested front-opening
cabinet doors, smooth equipment metal, and mobile framing fixes. After those
changes, the reviewer rated the environment milestone **9/10**, conditional on
final required checks and game/editor integration checks; all subsequently passed.
The score does not cover gameplay parity or a default renderer switch.

- `npm run check`: **460/460 tests passed**, including four new catalog,
  geometry, rotation, and collision-preservation checks; asset validation passed.
- `npm run build:tactics-3d`: passed, with all five new browser modules/pages.
- `tools/environment-review.mjs`: all 76 gallery entries, zero browser errors;
  screenshots and results in `environment-review/`.
- Independent browser review: 228 rendered views over three catalog cycles,
  stable chunk identities on identical rebuild, 10 geometries and 19 textures
  after the sweep, rotated rectangular props and desktop/mobile screenshots.
- Editor workflow: pointer placement/erasing, undo/redo, upper roof placement,
  ladder, exact JSON export/import and hybrid playtest passed.
- Full Factory-test map: legacy/hybrid game and editor loading, camera movement,
  game movement and 12 editor undo/redo cycles passed with no unsupported content
  or application errors. Measured hybrid load: 3.17 s game / 2.34 s editor;
  active-pan p95: 33.3 ms / 16.8 ms; retained JS heap: 32.5 / 55.3 MiB.
  These are local Windows/Edge observations, not hardware-independent budgets;
  the check suite ran concurrently during this measurement.

For browser checks set `PLAYWRIGHT_PATH` to an installed Playwright module and
serve `dist` at localhost:4318. `REVIEW_URL` can point the gallery review at the
published site. The full-map and editor workflows derive from the existing
`hybrid-full-browser.mjs` and `hybrid-editor-check.mjs` drivers with their server
port changed from 4389 to 4318; saved results include browser version and timings.
