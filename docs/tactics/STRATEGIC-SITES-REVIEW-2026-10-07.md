# Strategic site tile revision review

Approved the five site commits from `8e86cd4` through `5d77ec0` for integration with canonical `1687c7b` on October 7, 2026. The revised radio and radar huts fit the tile grid more clearly, retain believable door height beside the original-size horse, and leave usable space beside the buildings.

## Approved changes

- Both huts occupy columns 1–2, rows 6–7 of their 8 by 8 site. Roof and door geometry stay within that four-tile footprint in intact and destroyed states. The radio cabinet is centered on its tile.
- Foundations remain fixed between damage states. The viewer also retains camera framing and scale during an in-place damage comparison, making the comparison useful.
- Rounded body envelopes at different heights replace overly restrictive square clearance bounds. Clear tile centers, swept connections, boundary entrances and enclosed pockets are checked separately. The whole-roster profile includes the neutral models' wider parts.
- The viewer distinguishes turning clearance from occupied building tiles. Inspecting a restricted tile shows a contact point while leaving the horse on its last clear tile.

## Independent validation

All 29 focused tests passed: 25 site geometry and clearance tests plus four deployment/module-closure tests. These cover exact hut footprints, fixed concrete geometry, native character envelopes, barriers between clear endpoints, isolated pockets, transformed placement, contact points on actual geometry, resource disposal and manifest agreement. The Pages build, asset audit and Git whitespace check passed. This review did not repeat the full 1,843-test run from the previous canonical release.

Browser checks used the freshly built Pages output. Radio and radar huts were inspected beside the unchanged 1.65-tile horse at 58 CSS pixels per tile. Overhead views confirmed the four-tile huts and adjacent routes. The radio damage toggle preserved framing and foundations; clicking a blocked mast tile reported the collision without placing the horse inside it. Radar clearance was compared in both states with the whole-roster profile. Intact and destroyed SAM sites rendered correctly. No browser errors or warnings were reported.

The build-script conflict was reconciled by retaining canonical's current module list and missing-module validation, and adding `strategic-site-clearance.js` to the study distribution. No campaign implementation was brought in through branch ancestry. Temporary review tabs and the preview server were closed, and the server port was confirmed released.

## Remaining integration

Approval covers the static assets, viewer and proposed standing/turning clearance data. It does not establish gameplay navigation or collision support. Editor placement, cover and shot geometry, destruction state, persistence and strategic effects still need wiring. Gameplay integration must account for animation poses, carried weapons and stepping onto the raised slab; the neutral-body study is not a complete movement guarantee.

The campaign arrival-state hold in [the campaign integration review](INTEGRATION-REVIEW-2026-10-06.md) remains unchanged and is separate from this tile approval.
