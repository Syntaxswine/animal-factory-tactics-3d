# Painted household and street furniture

Open `tactics/painted-furniture.html`, also linked from the 3D gallery. These are reusable design assets, following the cargo and truck study workflow. They are not new map-editor prop kinds: placement, collision, cover, inventory and interaction rules remain unchanged.

## Collection

| Model | Tile footprint | Construction |
| --- | --- | --- |
| Large timber / rust-red guardhouses | 5×5 house / 7×7 overall | Three-story expanded core with one-tile perimeter stairs |
| Timber / rust-red wraparound guardhouses | 3×3 house / 5×5 overall | Perimeter flights with quarter-turn corner landings and rear entry |
| Timber / iron stair guardhouses | 3×3 house / 6×5 overall | Three-story frame, six side stair flights, landings and a windowed guardhouse |
| Wooden guard tower | 5×5 deck / 3×3 supports | Three-story braced timber frame, railings and side ladder through an open hatch |
| Hanging cooking pot | 2×2 | Three-legged iron tripod, linked chain, bail handle and open pot over the stone-ring fire |
| Stone-ring campfire | 1×1 | Charred crossed logs, ash, irregular stones and painted flame tongues |
| Standing torch | 1×1 | Timber shaft, bound fuel head and iron tripod |
| Wall-mounted torch | Wall / 1×1 projection | Timber torch with a projecting iron bracket |
| Farmhouse table | 1×2 | Flat planked top, square tapered legs, apron and pegs |
| Low living-room table | 1×2 | Flat top and lower shelf |
| Single bed | 1×2 | Panelled frame, mattress, pillow and folded blue quilt |
| Bedside table | 1×1 | Drawer, brass pull and open lower shelf |
| Bedside table with lamp | 1×1 | Drawer table with a compact brass and linen lamp |
| Refrigerator | 1×1 | Cream enamel, freezer door, handles, vents and rear coils |
| Double-door cabinet | 1×2 | Panelled doors, two drawers, brass pulls and raised feet |
| Floor lamp | 1×1 | Weighted base, brass stem, pleated linen shade and pull chain |
| Exterior gooseneck sconce | Wall / 1×1 projection | Curved arm, green metal shade, ivory lining and mounting plate |
| Single-arm streetlight | 1×1 | Cast-iron post, fluted base and green shade |
| Double-arm streetlight | 2×1 | Shared post with two suspended green shades |

Six timber models have honey, aged cream and sage finishes. Appliances and fixtures retain their intended fixed materials. Existing approved painted atlases supply brushwork; timber contrast is subdued, while tiny bevels preserve squared furniture silhouettes. The cabinet's long axis is Z and its doors face +X; other fronts generally face +Z.

## Future lighting integration

`createFurnitureLibrary(atlas, cargo)` returns `build(id, finish)`, `stats()` and `dispose()`. Built roots borrow cached geometry/materials/textures; dispose the library only after removing every consumer. The input atlases remain caller-owned.

Fixture roots contain `mount` and `emitter-0` nodes; the double streetlight also has `emitter-1`. Positions use tile units with Y up. Emitter local **−Z** points down, and metadata identifies `role: 'future-light', enabled: false`. The sconce origin is the wall at floor level, with the mount at Y=1.72; its shade projects forward into the adjoining tile. The wall slab shown in the gallery is a separate display aid, not part of the asset.

There are no Light objects or emissive materials in these models. The gallery uses its own ordinary studio lights. A later day/night implementation can attach lights at the anchors and define illumination, shadows, switching and gameplay visibility together.

## Validation and review

- `npm run check`: **587 tests passed**, plus tactical asset validation.
- `npm run build:tactics-3d`: passed; all three furniture files are included in the Pages output.
- Six furniture tests check all finishes for finite geometry, ground contact, footprint bounds, passive anchors, no emission and stable resource ownership/disposal.
- `tools/painted-furniture-review.mjs`: all 22 forms at close/gameplay scale, an underside sconce view, mobile width, repeated finish changes and browser errors. Set `PLAYWRIGHT_PATH` when Playwright is outside the local module tree; optional `REVIEW_ORIGIN` defaults to port 4331.
- Repeated gallery changes stabilized at 301 library geometries, 31 materials and 27 texture clones; browser rendering reported 312 geometries and 8 textures. No browser errors or mobile horizontal overflow in the final run.
- Independent hostile review: **9/10**, no blockers for this design/gallery scope. Remaining optional art polish: repeated close-up texture crops and heavy refrigerator wear. Screenshots and machine results are local in `artifacts/furniture/` and `artifacts/furniture-review/`.

The viewer uses a stable neutral-character framing envelope because skinned mesh bounds can retain stale positions when switching collection/single views. Model geometry bounds remain exact; this envelope affects camera framing only.

The bedside lamp variant reuses the floor lamp at 48% scale, seated exactly on the tabletop at Y=0.605. Its passive emitter and mount remain inside the transformed lamp group; use world transforms when attaching future lights.

Fire assets support `build(id, finish, {burning: false})` for the extinguished visual. The Flames gallery checkbox controls this option. Flames are closed painted 3D volumes with a gentle four-second repeating flicker. There is no light emission, smoke, fuel simulation or damage behavior. Fire emitter anchors have `distribution: "omnidirectional"`; their orientation is incidental for a future point light. The flame group is separate from the logs, stones and torch body.

`animateFurnitureFire(root, seconds)` samples flame scale, sway and a subtle material brightness variation from absolute time. Pass `null` to restore the authored transforms and colors. Shared flame materials use a common brightness phase. The viewer offers a Flicker animation checkbox, honors reduced-motion preferences, stops scheduling frames for hidden pages or non-burning selections, and retains a fixed camera framing envelope while flickering. Loop periodicity, pose restoration, and absence of accumulated drift are unit-tested; browser checks cover movement, pause and reduced-motion changes.

The `cooking-fire` arrangement reuses the complete campfire beneath a hollow, thick-rimmed pot. The pot bottom is at Y=0.769, with clearance above the animated flames. Three planted feet form a triangular pyramid, with the legs joining at a collar above the pot; nine alternating chain links connect the apex to the pot bail. Flames, animation controls and the passive emitter are inherited from the nested campfire. This is a visual asset; cooking and food interactions are not implemented.

## Wooden guard tower

The tower uses the renderer story spacing of 2.12 units: its deck is at Y=6.36, three stories above ground. Four posts fit 3×3 tiles; the overhanging platform and perimeter rails fit 5×5. The +Z side ladder passes through a real 1×1 deck opening, x=[−0.5,0.5], z=[1.25,2.25]. Joists and header beams stop around this opening. Three-sided hatch guards leave an exit toward the platform center. Ladder stiles extend above deck level as handholds. Ground grids show both support and platform footprints.

Three painted timber finishes are available. Tests verify post bounds, raised iron bands and raycast the ladder aperture to catch hidden framing obstruction. The tower remains a gallery asset: ladder traversal, elevated unit placement, collision, cover, destruction and editor placement need gameplay integration.

## Stair guardhouses

Timber and iron variants retain the three-story deck height (6.36 units), with a 3×3 windowed guardhouse above. The six half-story switchback flights each have nine treads and connect through turning landings along the +X side. An inner-lane entry bridge connects the final turning landing to the side doorway, leaving the last flight open. Braced supports, stair columns, handrails and a shallow pitched roof complete the structure. Timber offers the three wood finishes; iron uses the fixed oxide-red barrel atlas finish with visible panel rivets.

The full arrangement needs 6×5 tiles, including stairs, landings and roof overhang; the 3×3 core is offset X=−0.95 from the asset origin. Metadata records both sizes and the stair layout. Tests check all 54 tread elevations, raycast 1.65 units of headroom above every tread center, and raycast the doorway. As with the first tower, stair traversal and elevated gameplay placement are deferred.

## Wraparound stairs and rusty iron

The wraparound variants retain the 3×3 trellis and guardhouse but distribute six flights around all four faces, with quarter-turn landings at the corners. Four flights make one full revolution; the final two arrive at the rear corner, where a balcony connects to the rear doorway. The complete model fits 5×5 tiles. Corner posts and diagonal knee braces support the landings. Door metadata switches to the −Z face. Original 6×5 switchback variants remain available.

Both iron tower layouts use the cargo atlas oxide-red barrel panel, with exposed dark iron for framing and rails. The floor/roof panels, steps and landings share that painterly red-and-rust treatment. Browser checks cover 20 forms; geometry/headroom/doorway checks cover all four stair tower variants.

## Large 5×5 guardhouses

The large wraparound timber and rusty iron forms expand the core and guardhouse to 5×5 tiles, retaining the three-story deck elevation. Perimeter stairs keep their existing 0.88-unit tread width rather than widening with the core. The full footprint is 7×7. Longer flights have the same nine rises per half-story; roof pitch is reduced to retain the existing ridge height. Original 3×3 versions remain available. Tests explicitly check the expanded floor bounds, unchanged stair width, tread elevations, headroom and rear entry.
